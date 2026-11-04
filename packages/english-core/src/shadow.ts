/**
 * Shadow learner-state candidate — E003.1 Condition B variance intervention.
 *
 * Runs a second Composite alongside the production one, applying elevated
 * time-based and session-transition variance inflation. The shadow composite
 * never controls student-facing decisions; it records differences for later
 * evaluation.
 *
 * The candidate's uncertainty evolves through the actual state-update
 * mechanism (inflate / touch), not by post-hoc adjustment of a displayed
 * confidence interval. The trick: shadowTouch() applies the elevated
 * variance and sets asOf = now *before* applyDirect() is called. When
 * applyDirect()'s internal touch() runs, days = 0 so it's a no-op — the
 * shadow variance is the only one applied, and it genuinely lives in the
 * NodeState.
 */
import type { CapabilityId, Composite, Estimate, NodeState } from "./types.ts";
import type { FrameworkIndex } from "./framework.ts";
import { inflate, daysBetween } from "./model.ts";
import { type DirectObservation, applyDirect, createComposite, demonstratedLevel, MODEL_VERSION } from "./composite.ts";

// ---------------------------------------------------------------- Configuration

export const SHADOW_MODEL_VERSION = "shadow-candidate@1";

/** Research-candidate configuration parameters (not universal constants). */
export interface ShadowConfig {
  /** Variance added per day of elapsed time (production: 0.0047). */
  timeVariancePerDay: number;
  /** Additional variance added at each session transition (production: 0). */
  sessionVariance: number;
  /** Maximum variance cap (same as production prior variance). */
  maxVariance: number;
}

/** E003.1 Condition B: validated session-transition variance inflation. */
export const CONDITION_B: Readonly<ShadowConfig> = Object.freeze({
  timeVariancePerDay: 0.02,
  sessionVariance: 0.5,
  maxVariance: 2.25,
});

/** Zero-intervention control: reproduces the production estimator exactly. */
export const ZERO_INTERVENTION: Readonly<ShadowConfig> = Object.freeze({
  timeVariancePerDay: 0.0047,
  sessionVariance: 0,
  maxVariance: 2.25,
});

// ---------------------------------------------------------------- Shadow touch

/**
 * Apply elevated variance inflation to a shadow composite node.
 *
 * Must be called *before* applyDirect() on the shadow composite for each
 * event. After this call, node.asOf = `at`, so applyDirect()'s internal
 * touch() sees days = 0 and does nothing — the elevated variance is the
 * only one applied.
 *
 * @param node       The shadow composite's NodeState for this capability
 * @param at         ISO timestamp of the current event
 * @param config     Shadow variance parameters
 * @param maxVar     Maximum variance (from config.maxVariance)
 * @param isSessionTransition  Whether this event is in a different session
 *                             than the previous event on this node
 */
export function shadowTouch(
  node: NodeState,
  at: string,
  config: ShadowConfig,
  isSessionTransition: boolean,
): void {
  const days = daysBetween(node.asOf, at);

  // Time-based variance inflation at elevated rate
  if (node.asOf && days > 0) {
    node.combined = inflate(node.combined, days, config.timeVariancePerDay, config.maxVariance);
    node.direct = inflate(node.direct, days, config.timeVariancePerDay, config.maxVariance);
  }

  // Session-transition variance — the core E003.1 intervention
  if (isSessionTransition && config.sessionVariance > 0) {
    node.combined = addSessionVariance(node.combined, config.sessionVariance, config.maxVariance);
    node.direct = addSessionVariance(node.direct, config.sessionVariance, config.maxVariance);
  }

  // Set asOf so applyDirect()'s internal touch() sees days = 0
  if (!node.asOf || days > 0) node.asOf = at;
}

function addSessionVariance(est: Estimate, sessionVariance: number, maxVariance: number): Estimate {
  return {
    mean: est.mean,
    variance: Math.min(maxVariance, est.variance + sessionVariance),
  };
}

// ---------------------------------------------------------------- Session tracker

/**
 * Tracks the last session seen per capability, so we can detect session
 * transitions for the shadow model. Production already tracks sessions
 * inside NodeState.sessions, but the shadow needs its own tracker because:
 * (a) it operates before applyDirect updates sessions, and
 * (b) the shadow composite is a separate object.
 */
export class SessionTracker {
  private lastSession: Map<CapabilityId, string> = new Map();

  /**
   * Returns true if this event represents a session transition for the
   * given capability. The first event for a capability is not a transition.
   */
  transition(capability: CapabilityId, session: string): boolean {
    const prev = this.lastSession.get(capability);
    this.lastSession.set(capability, session);
    return prev !== undefined && prev !== session;
  }

  /** Reset tracker state (e.g. for replay from scratch). */
  clear(): void {
    this.lastSession.clear();
  }
}

// ---------------------------------------------------------------- Comparison record

/** Structured comparison between production and shadow candidate outputs. */
export interface ShadowComparison {
  /** Event identifier. */
  eventId: string;
  /** Competency identifier. */
  capability: CapabilityId;
  /** ISO timestamp of the event. */
  at: string;
  /** Session identifier. */
  session: string;
  /** Whether a session transition occurred. */
  sessionTransition: boolean;
  /** Authoritative model version. */
  productionModel: string;
  /** Candidate model version. */
  candidateModel: string;
  /** Candidate configuration snapshot. */
  candidateConfig: ShadowConfig;
  /** Production direct estimate after update. */
  productionDirect: Estimate;
  /** Production combined estimate after update. */
  productionCombined: Estimate;
  /** Candidate direct estimate after update. */
  candidateDirect: Estimate;
  /** Candidate combined estimate after update. */
  candidateCombined: Estimate;
  /** Production demonstrated level. */
  productionDemonstrated: number | null;
  /** Candidate demonstrated level. */
  candidateDemonstrated: number | null;
  /** Differences. */
  deltas: {
    directMean: number;
    directVariance: number;
    combinedMean: number;
    combinedVariance: number;
    demonstratedLevel: number | null;
  };
}

/**
 * Build a comparison record from production and shadow state after an update.
 */
export function buildComparison(
  eventId: string,
  capability: CapabilityId,
  at: string,
  session: string,
  sessionTransition: boolean,
  production: Composite,
  candidate: Composite,
  config: ShadowConfig,
  policy: { demonstrated_probability: number },
  capId?: CapabilityId,
): ShadowComparison {
  const pNode = production.nodes[capability];
  const cNode = candidate.nodes[capability];

  const pDemo = demonstratedLevel(pNode, policy as any, capId);
  const cDemo = demonstratedLevel(cNode, policy as any, capId);

  return {
    eventId,
    capability,
    at,
    session,
    sessionTransition,
    productionModel: MODEL_VERSION,
    candidateModel: SHADOW_MODEL_VERSION,
    candidateConfig: { ...config },
    productionDirect: { ...pNode.direct },
    productionCombined: { ...pNode.combined },
    candidateDirect: { ...cNode.direct },
    candidateCombined: { ...cNode.combined },
    productionDemonstrated: pDemo,
    candidateDemonstrated: cDemo,
    deltas: {
      directMean: cNode.direct.mean - pNode.direct.mean,
      directVariance: cNode.direct.variance - pNode.direct.variance,
      combinedMean: cNode.combined.mean - pNode.combined.mean,
      combinedVariance: cNode.combined.variance - pNode.combined.variance,
      demonstratedLevel: pDemo !== null && cDemo !== null ? cDemo - pDemo : null,
    },
  };
}

// ---------------------------------------------------------------- Shadow diagnostic

/** Bounded failure record — when shadow processing fails, this is what gets recorded. */
export interface ShadowFailure {
  eventId: string;
  capability: CapabilityId | null;
  at: string;
  error: string;
}

// ---------------------------------------------------------------- Shadow runner

/**
 * The shadow execution engine.
 *
 * Maintains a second Composite alongside the production one and processes
 * the same events with elevated variance parameters. All student-facing
 * decisions continue to use only the production composite.
 *
 * Usage:
 *   const runner = new ShadowRunner(index, learnerId, CONDITION_B);
 *   // For each event that calls applyDirect on production:
 *   runner.processObservation(observation, productionComposite);
 *   // Read comparisons:
 *   runner.comparisons  // ShadowComparison[]
 *   runner.failures     // ShadowFailure[]
 */
export class ShadowRunner {
  readonly config: ShadowConfig;
  readonly shadowComposite: Composite;
  readonly comparisons: ShadowComparison[] = [];
  readonly failures: ShadowFailure[] = [];
  private readonly index: FrameworkIndex;
  private readonly sessionTracker = new SessionTracker();

  constructor(index: FrameworkIndex, learnerId: string, config: ShadowConfig) {
    this.index = index;
    this.config = config;
    // Start from the same initial state as production
    this.shadowComposite = createComposite(index, learnerId);
  }

  /**
   * Process the same observation that production's applyDirect received.
   *
   * Call this *after* the production applyDirect has succeeded, so that
   * a shadow failure can never block the authoritative flow.
   *
   * @param observation  The DirectObservation passed to production's applyDirect
   * @param productionComposite  The production composite (read-only, for comparison)
   */
  processObservation(observation: DirectObservation, productionComposite: Composite): void {
    try {
      const cap = observation.capability;
      const node = this.shadowComposite.nodes[cap];
      if (!node) {
        this.failures.push({
          eventId: observation.decisionId,
          capability: cap,
          at: observation.at,
          error: `unknown capability ${cap}`,
        });
        return;
      }

      // Detect session transition for this capability
      const isTransition = this.sessionTracker.transition(cap, observation.session);

      // Apply elevated variance BEFORE applyDirect
      // This sets asOf = now, so applyDirect's internal touch() is a no-op
      shadowTouch(node, observation.at, this.config, isTransition);

      // Run the same applyDirect on the shadow composite
      applyDirect(this.shadowComposite, this.index, observation);

      // Record comparison
      const comparison = buildComparison(
        observation.decisionId,
        cap,
        observation.at,
        observation.session,
        isTransition,
        productionComposite,
        this.shadowComposite,
        this.config,
        this.index.framework.policy,
        cap,
      );
      this.comparisons.push(comparison);
    } catch (err) {
      // Bounded failure: record and continue
      this.failures.push({
        eventId: observation.decisionId,
        capability: observation.capability,
        at: observation.at,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Reset the shadow runner for replay from scratch.
   */
  reset(learnerId: string): void {
    const fresh = createComposite(this.index, learnerId);
    Object.assign(this.shadowComposite, fresh);
    this.comparisons.length = 0;
    this.failures.length = 0;
    this.sessionTracker.clear();
  }

  /** Whether shadow execution has been entirely clean (no failures). */
  get healthy(): boolean {
    return this.failures.length === 0;
  }
}
