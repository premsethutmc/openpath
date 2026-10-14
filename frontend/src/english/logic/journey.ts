/**
 * The adaptive consonant-doubling journey (MVP vertical slice).
 *
 * Every decision comes from the core: the rule-level evidence projection (what the learner has shown, with
 * provenance) and the planner (what to do next). This file only turns the planner's action into a screen
 * step, picks unseen content for it, and writes the parent summary. Nothing here scores answers or keeps a
 * learner model of its own: the state is rebuilt from the event log, so replaying it gives the same journey.
 */
import {
  INFLECTION_STRATEGIES,
  type HintEvent,
  type InterventionEvent,
  type PlannerDecision,
  type PlannerPolicy,
  PLANNER_POLICY_DRAFT,
  type RuleState,
  englishInflections,
  leafView,
  planRule,
  projectRuleEvidence,
} from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code, StrategyContent } from "./content.ts";
import type { AttemptEvent } from "./events.ts";
import type { AppState, SessionState } from "./state.ts";

export type JourneyStep =
  | { kind: "question"; purpose: "assessment" | "reassess" | "retention"; item: Code }
  | { kind: "teach"; strategy: StrategyContent; refresher: boolean }
  | { kind: "guided"; item: Code; strategy: StrategyContent; intervention: string; attempts: AttemptEvent[]; hints: HintEvent[] }
  | { kind: "summary" };

export interface JourneyView {
  session: SessionState;
  rule: RuleState;
  decision: PlannerDecision;
  step: JourneyStep;
}

export function doublingRule(s: AppState, c: AppContent, now: string): RuleState {
  const l = s.ledger;
  const projection = projectRuleEvidence(l, c.ctx.content, englishInflections, (cap) => {
    const v = leafView(l.composite, c.index, cap, now);
    return { mean: v.mean, sd: v.sd, demonstrated: v.demonstrated, mastered: v.mastered, verification: v.verification.status };
  });
  return projection.capabilities[c.journey.capability].rules.find((r) => r.rule === c.journey.rule)!;
}

const code = (c: AppContent, id: string) => c.ctx.content.items.get(id) as Code;
const isContrast = (i: Code) => englishInflections.roleOf(i) === "contrast";

/** Interventions recorded in a session, oldest first. */
function interventionsIn(s: AppState, session: string): InterventionEvent[] {
  return s.events.filter((e): e is InterventionEvent => e.kind === "intervention" && e.session === session);
}

/** Guided-practice attempts on an item after an intervention. */
function guidedAttempts(session: SessionState, item: string): AttemptEvent[] {
  return session.attempts.filter((a) => a.item.id === item && a.assisted);
}

/** A guided item is finished when answered right, or answered after the last hint level. */
function guidedFinished(attempts: AttemptEvent[], hints: number, policy: PlannerPolicy): boolean {
  return attempts.some((a) => a.correct) || (attempts.length > 0 && hints >= policy.hintLevels && attempts.length > hints);
}

export function journeyView(s: AppState, c: AppContent, session: SessionState, now: string, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): JourneyView {
  const rule = doublingRule(s, c, now);
  const seen = (id: string) => s.ledger.exposures.has(id);
  const unseen = c.journey.assessOrder.filter((id) => !seen(id)).map((id) => code(c, id));
  const ivs = interventionsIn(s, session.event.session);
  const block = ivs.at(-1);
  const hintsFor = (item: string) => s.events.filter((e): e is HintEvent => e.kind === "hint" && e.session === session.event.session && e.item.id === item);
  // guided items of the current block: those attempted after its intervention
  const blockGuided = block ? [...new Set(session.attempts.filter((a) => a.assisted && a.at >= block.at && c.journey.guided.includes(a.item.id)).map((a) => a.item.id))] : [];
  const unfinished = blockGuided.find((id) => !guidedFinished(guidedAttempts(session, id), hintsFor(id).length, policy));
  const finishedCount = blockGuided.length - (unfinished ? 1 : 0);
  const guidedLeft = c.journey.guided.filter((id) => !s.attempted.has(id));

  const decision = planRule({
    rule,
    strategies: INFLECTION_STRATEGIES[c.journey.rule] ?? [],
    now,
    sessionStartedAt: session.event.at,
    session: session.event.session,
    available: { apply: unseen.filter((i) => !isContrast(i)).length, contrast: unseen.filter(isContrast).length, guided: guidedLeft.length + (unfinished ? 1 : 0) },
    answeredThisSession: session.answered.length,
    guidedThisBlock: finishedCount,
    policy,
  });

  const strategy = (id?: string) => c.journey.strategies.find((x) => x.id === id) ?? c.journey.strategies[0];
  let step: JourneyStep = { kind: "summary" };
  switch (decision.action) {
    case "assess":
      step = { kind: "question", purpose: "assessment", item: unseen[0] };
      break;
    case "reassess":
    case "retention_check": {
      const item = unseen.find((i) => !isContrast(i))!;
      step = { kind: "question", purpose: decision.action === "reassess" ? "reassess" : "retention", item };
      break;
    }
    case "teach":
      step = { kind: "teach", strategy: strategy(decision.strategy), refresher: decision.diagnosis.kind === "retrieval_difficulty" };
      break;
    case "guided_practice": {
      const id = unfinished ?? guidedLeft[0];
      step = { kind: "guided", item: code(c, id), strategy: strategy(decision.strategy), intervention: block!.id, attempts: guidedAttempts(session, id), hints: hintsFor(id) };
      break;
    }
    default:
      step = { kind: "summary" };
  }
  return { session, rule, decision, step };
}

/** The hint text for a guided item at a level, from the strategy's template. */
export function hintText(strategy: StrategyContent, item: Code, level: number): string {
  const g = item.generated;
  const base = g?.base ?? "";
  const ending = (g?.join ?? "").replace(/^-/, "");
  const t = strategy.hints[Math.min(level, strategy.hints.length) - 1] ?? "";
  return t.replaceAll("{base}", base).replaceAll("{last}", base.at(-1) ?? "").replaceAll("{ending}", ending);
}

// ------------------------------------------------------------------ the parent summary

export interface ParentReport {
  skill: string;
  started: boolean;
  /** What the learner found hard, from their own independent answers (no probabilities). */
  difficulty: string[];
  assistance: { hints: number; guidedAnswers: number; rightFirstTry: number; rightWithHelp: number; strategies: string[] };
  /** For each teaching approach: independent answers on new words after it. */
  afterTeaching: { strategy: string; right: number; total: number }[];
  differentStrategyNeeded: boolean;
  /** not_shown: nothing to retain yet; pending: shown, delayed check not yet taken (due from `retentionDue`). */
  retention: "not_shown" | "pending" | "confirmed" | "failed";
  retentionDue: string | null;
  /** One line on where things stand, in plain words. */
  status: string;
  support: string | null;
  provisional: string;
}

const STATUS: Record<RuleState["status"], string> = {
  insufficient_evidence: "Not enough answers yet to say.",
  inconsistent: "Mixed results so far: right and wrong in different ways.",
  weak: "Not yet doing this without help.",
  emerging: "Getting there: some right on new words without help, not yet consistently.",
  demonstrated: "Shown without help on new words today. Not yet checked after a delay.",
  verified: "Shown without help, and still right after at least a week.",
  needs_reconfirmation: "Was shown earlier, but not remembered after a week. Needs refreshing.",
};

export function parentReport(s: AppState, c: AppContent, now: string, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): ParentReport {
  const rule = doublingRule(s, c, now);
  const journeySessions = [...s.sessions.values()].filter((x) => x.event.type === "doubling_journey");
  const name = (id: string) => c.journey.strategies.find((x) => x.id === id)?.name ?? id.replace(/_/g, " ");
  const wrong = journeySessions.flatMap((x) => x.answered.filter((a) => !a.correct));
  const difficulty = wrong.map((a) => {
    const item = c.ctx.content.items.get(a.item.id) as Code | undefined;
    const typed = a.response.kind === "typed" ? a.response.text : "";
    return `Wrote "${typed}" for "${item?.answers?.[0] ?? ""}" without help.`;
  });
  const misc = rule.misconceptions.filter((m) => m.state === "active" || m.state === "improving").map((m) => `Pattern seen: ${m.tag === "no_doubling" ? "not doubling the last letter" : m.tag === "over_doubling" ? "doubling where it should not" : m.tag.replace(/_/g, " ")} (${m.errors.length} times on different words).`);
  const ivs = rule.interventions;
  const retention: ParentReport["retention"] = rule.retention.state === "confirmed" ? "confirmed" : rule.retention.state === "failed" ? "failed" : rule.history.firstDemonstratedAt ? "pending" : "not_shown";
  const retentionDue = retention === "pending" && rule.lastEvidenceAt ? new Date(Date.parse(rule.lastEvidenceAt) + policy.retentionGapDays * 86_400_000).toISOString() : null;
  const failed = ivs.filter((iv) => iv.independentAfter.newWordTotal >= policy.reassessItems && iv.independentAfter.newWordRight < policy.reassessPassMin).length;
  const helpOnly = ivs.some((iv) => iv.during.rightWithHelp > 0 && iv.during.rightFirstTry === 0) && !ivs.some((iv) => iv.independentAfter.newWordRight > 0);
  let status = STATUS[rule.status];
  if (rule.status === "weak" && helpOnly) status = "Right with help in practice, not yet without help.";
  if (rule.status !== "demonstrated" && rule.status !== "verified" && ivs.at(-1) && ivs.at(-1)!.independentAfter.newWordTotal >= policy.reassessItems && ivs.at(-1)!.independentAfter.newWordRight >= policy.reassessPassMin)
    status = "Right on new words without help after teaching. Progress, not yet mastery: more answers and a check after a week are needed.";
  const firstShown = rule.history.firstDemonstratedAt;
  if (rule.status === "needs_reconfirmation" && firstShown) status = `First shown on ${firstShown.slice(0, 10)}; not remembered at the check after a week. Needs refreshing.`;
  return {
    skill: "Doubling the last consonant before an ending (hop → hopping, stop → stopped, big → bigger)",
    started: journeySessions.length > 0,
    difficulty: [...misc, ...difficulty],
    assistance: {
      hints: rule.assisted.hints,
      guidedAnswers: ivs.reduce((t, iv) => t + iv.during.items, 0),
      rightFirstTry: ivs.reduce((t, iv) => t + iv.during.rightFirstTry, 0),
      rightWithHelp: ivs.reduce((t, iv) => t + iv.during.rightWithHelp, 0),
      strategies: ivs.map((iv) => name(iv.strategy)),
    },
    afterTeaching: ivs.map((iv) => ({ strategy: name(iv.strategy), right: iv.independentAfter.newWordRight, total: iv.independentAfter.newWordTotal })),
    differentStrategyNeeded: ivs.length > 1,
    retention,
    retentionDue,
    status,
    support: failed >= policy.maxStrategiesBeforeHuman ? `${failed} different approaches have not yet worked. We recommend a teacher or parent works on this with them; the app has paused this rule rather than repeating it.` : null,
    provisional: "The questions, lessons and hints in this journey are provisional: not yet reviewed by an educator. This is a record of what happened, not a mastery certificate.",
  };
}
