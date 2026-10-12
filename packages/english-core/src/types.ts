/**
 * Shared shapes for the OpenPath English core.
 *
 * Everything in src/ is plain TypeScript with no platform imports, so the same
 * code runs on a learner's device, in the simulator and on the server.
 */

export type CapabilityId = string;
export type Tier = "skeleton" | "core" | "planned";

// ---------------------------------------------------------------- framework

export interface Misconception {
  id: string;
  description: string;
}

export interface Capability {
  id: CapabilityId;
  name: string;
  tier: Tier;
  weight: number;
  description?: string;
  /** Band → what success looks like at that band (OpenPath's own wording). */
  bands?: Record<string, string>;
  /** The only misconception tags any scorer or evaluator may attach. */
  misconceptions?: Misconception[];
  observable_through?: string[];
  needs?: string[];
  /** Reference frameworks the capability relates to (indicative only; OpenPath's descriptors are the definitions). */
  references?: { cefr?: string[]; cbse?: string };
}

export interface SubStrand {
  id: string;
  name: string;
  weight: number;
  capabilities: Capability[];
}

export interface Strand {
  id: string;
  name: string;
  weight: number;
  substrands: SubStrand[];
}

export interface Policy {
  time_variance_per_day: number;
  demonstrated_probability: number;
  demonstrated_min_direct: number;
  demonstrated_min_contexts: number;
  mastery_gap_days: number;
  struggling_window_sessions: number;
  struggling_min_observations: number;
  struggling_max_success: number;
  evaluator_max_shift: number;
  inferred_max_shift: number;
  misconception_active: number;
  misconception_gain: number;
  misconception_fade_on_success: number;
  misconception_half_life_days: number;
}

export interface Framework {
  id: string;
  version: string;
  title: string;
  status: string;
  review: Record<string, string>;
  scale: { min: number; max: number };
  prior: { mean: number; sd: number };
  policy: Policy;
  strands: Strand[];
  couplings: { a: CapabilityId; b: CapabilityId; strength: number; status?: string }[];
  prerequisites: { capability: CapabilityId; requires: CapabilityId; source?: string }[];
  /** Reference frameworks (from 0.2.0): sources and how they are used. */
  references?: Record<string, unknown>;
}

// ---------------------------------------------------------------- content

/**
 * How a learner has met an item before:
 *   fresh   – never seen this item or any variant of it
 *   variant – a different item from a family the learner has seen (e.g. a future generated variant)
 *   repeat  – this very item again (allowed only for retention checks, after a minimum gap)
 */
export type Exposure = "fresh" | "variant" | "repeat";

export interface CodeItem {
  id: string;
  version: number;
  /** Items that are variants of one another share a family id (optional; default: the item's own id). */
  family?: string;
  target: CapabilityId;
  /**
   * How it is answered and scored (always right or wrong, plus misconception tags):
   *   "choice:…" one option, by index        "typed:…" a short typed answer, against accepted answers
   *   "order:…"  put all options in order      "match:…" match each `left` entry to one option
   *   "multi:…"  choose exactly the right set of options (the prompt says how many)
   */
  format: string;
  /** Difficulty on the band scale: an expert estimate, not empirically calibrated. */
  b: number;
  /** Discrimination per band. */
  a: number;
  prompt: string;
  passage?: string;
  options?: string[];
  answer?: number;
  answers?: string[];
  /** Wrong option index (as a string) → misconception it suggests. */
  distractor_tags?: Record<string, string>;
  /** order: the option indices in the correct order. */
  answer_order?: number[];
  /** match: the entries to match (each to one option). */
  left?: string[];
  /** match: for each `left` entry, the index of its option. */
  answer_pairs?: number[];
  /** multi: the indices of every correct option (the learner must choose exactly these). */
  answer_set?: number[];
  /** Wrong answer → misconception it suggests. Typed: the normalised answer; order, match, multi: the indices joined by commas (multi sorted). */
  wrong?: Record<string, string>;
  /** Misconceptions this item is designed to practise. */
  addresses?: string[];
  review?: string;
  /** The step of the capability's difficulty ladder this item sits on (content/english/items/progressions.json). */
  step?: string;
  /** Why the item sits at this difficulty: what makes it harder or easier than its neighbours. */
  rationale?: string;
  /** Where the difficulty comes from. Always "expert_estimate" until calibrated from real responses. */
  difficulty_source?: "expert_estimate";
}

export interface Anchor {
  id: string;
  /** Agreed scores per capability. In E1 these are candidates written by OpenPath, not yet educator-scored. */
  scores: Record<CapabilityId, number>;
  trusted: boolean;
  text: string;
}

export interface WritingTask {
  id: string;
  version: number;
  family?: string;
  format: string; // "writing:email" etc.
  genre: string;
  prompt: string;
  min_words: number;
  max_words: number;
  /** Centre of the band range the task was written for. */
  b: number;
  band_window: [number, number];
  targets: CapabilityId[];
  secondary: CapabilityId[];
  rubric: Record<CapabilityId, string[]>;
  anchors: Anchor[];
  review?: string;
}

export type Item = ({ kind: "code" } & CodeItem) | ({ kind: "writing" } & WritingTask);

export interface Passage {
  id: string;
  title: string;
  band: number;
  text: string;
}

export interface Goal {
  id: string;
  name: string;
  /** Weights by capability, sub-strand or strand id. More specific ids override broader ones. */
  weights: Record<string, number>;
  /**
   * Target bands set by the learner (or guardian), by capability, sub-strand or
   * strand id; most specific wins. Never changed by the engine. Where none is
   * set, selection uses the plan's documented default ("the next band up") and
   * says so in every recommendation.
   */
  targets?: Record<string, number>;
}

// ---------------------------------------------------------------- learner state

export interface Estimate {
  mean: number;
  variance: number;
}

export interface BinaryTrace {
  session: string;
  at: string;
  b: number;
  correct: boolean;
  /** Was the item at or below the direct estimate when it was answered? */
  atOrBelow: boolean;
}

/** What was observed in a session, kept so a retention check can be judged on fresh evidence alone. */
export type SessionObservation = ({ kind: "binary"; b: number; a: number; c: number; correct: boolean } | { kind: "band"; value: number; noise: number }) & { exposure?: Exposure };

export interface NodeState {
  /** Best estimate: direct evidence plus small, capped effects from coupled capabilities. */
  combined: Estimate;
  /** Direct evidence only. Stages (demonstrated, mastered) are computed from this. */
  direct: Estimate;
  /** Time up to which uncertainty growth has been applied. */
  asOf: string | null;
  directN: number;
  contexts: string[];
  lastDirectAt: string | null;
  misconceptions: Record<string, { strength: number; at: string }>;
  binary: BinaryTrace[];
  /** Highest demonstrated level per session, in order (used for mastery over time). */
  demonstrations: { session: string; at: string; level: number }[];
  /**
   * Every session with direct evidence on this capability, with the demonstrated
   * level at the end of it (null if not demonstrated). Bookkeeping only: used to
   * derive the retention schedule (retention.ts); estimates do not depend on it.
   */
  sessions?: { session: string; at: string; level: number | null; obs?: SessionObservation[] }[];
  /** Ids of the decisions that touched this capability (newest last, at most 50). */
  evidence: string[];
}

export interface Composite {
  learnerId: string;
  framework: string; // "en@0.1.0"
  model: string; // "composite@1"
  nodes: Record<CapabilityId, NodeState>;
  appliedThrough: string | null;
  updatedAt: string | null;
}

// ---------------------------------------------------------------- ledger

export type Response =
  | { kind: "choice"; choice: number }
  | { kind: "typed"; text: string }
  | { kind: "order"; order: number[] }
  | { kind: "match"; pairs: number[] }
  | { kind: "multi"; choices: number[] }
  | { kind: "writing"; text: string };

export interface EvidenceEvent {
  kind: "evidence";
  id: string;
  at: string;
  session: string;
  item: { id: string; version: number };
  response: Response;
}

export interface ProposalEvent {
  kind: "proposal";
  id: string;
  at: string;
  evidence: string;
  evaluator: { id: string; model?: string; prompt?: string };
  /** Exactly what the evaluator returned. Untrusted until the updater has checked it. */
  body: unknown;
}

export interface QualificationEvent {
  kind: "qualification";
  id: string;
  at: string;
  evaluator: string;
  noise: number;
  bias: number;
  qualified: boolean;
  drifting: boolean;
  /** Which anchors it was measured against: educator-scored (trusted) or OpenPath's unreviewed candidates. */
  anchor_set: "trusted" | "candidates";
  detail: Record<string, { n: number; noise: number; bias: number }>;
}

export interface RevokeEvent {
  kind: "revoke";
  id: string;
  at: string;
  decision: string;
  reason: string;
}

export type LedgerEvent = EvidenceEvent | ProposalEvent | QualificationEvent | RevokeEvent;

export type Verdict = "accepted" | "held" | "rejected" | "revoked" | "ignored";

export interface Decision {
  id: string;
  at: string;
  source: string; // evidence id or proposal id
  capability: CapabilityId | null;
  verdict: Verdict;
  reasons: string[];
  observation?: {
    kind: "binary" | "band";
    value: number;
    noise?: number;
    item: string;
    context: string;
    misconceptions: string[];
    /** fresh, variant or repeat (decided by the ledger from the learner's own history, not by the client). */
    exposure?: Exposure;
  };
  before?: { mean: number; sd: number };
  after?: { mean: number; sd: number };
  inferred?: { capability: CapabilityId; shift: number }[];
}
