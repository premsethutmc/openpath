/**
 * Shared shapes for the OpenPath English core.
 *
 * Everything in src/ is plain TypeScript with no platform imports, so the same
 * code runs on a learner's device, in the simulator and on the server.
 */

import type { EssayRecord } from "./essay/contract.ts";

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
  /**
   * Optional, per capability: question formats (contexts) that may demonstrate on their own, without a second
   * format. Absent in every framework file; an app sets it for direct spelling (dictation), where the app's own
   * evidence gate asks for diversity of words and patterns instead. Leaving it out changes nothing.
   */
  single_format_demonstration?: Record<CapabilityId, string[]>;
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
  /**
   * Content-validation gate (MVP correctness pass).
   *   "provisional": unreviewed content used for demonstration and practice. Answers are recorded and shown
   *                  at rule level, marked provisional, but never change the capability estimate.
   *   "validated":   approved by an educator under the review process.
   *   absent:        the existing candidate bank, which has updated estimates since E1; unchanged here
   *                  (changing it would alter historical estimates and needs a separate decision).
   */
  evidence_status?: "provisional" | "validated";
  /** The step of the capability's difficulty ladder this item sits on (content/english/items/progressions.json). */
  step?: string;
  /** Why the item sits at this difficulty: what makes it harder or easier than its neighbours. */
  rationale?: string;
  /**
   * Where the difficulty comes from. "expert_estimate" for hand-written items; "feature_estimate" for
   * items generated by rule (from word features such as the ladder step and length). Neither is
   * calibrated from real responses yet.
   */
  difficulty_source?: "expert_estimate" | "feature_estimate";
  /** Present only on items generated by rule from licensed lexical data (the spelling module). */
  generated?: GeneratedFrom;
  /** A short explanation of the right answer, shown as feedback (generated items carry their own). */
  explain?: string;
  /** Text read aloud by on-device speech (dictation items); the item is offered only where speech works. */
  speak?: string;
}

/**
 * Provenance of a generated item (decision 3 of 12 October 2026). Until `checked` is recorded, answers
 * to the item are kept in the ledger as practice but do not change any estimate: generated items are
 * not treated as calibrated assessment evidence until their difficulty and quality have been checked.
 */
export interface GeneratedFrom {
  generator: string;
  template: string;
  word: string;
  base?: string;
  join?: string;
  /** Ids of the lexical sources each part came from (see the word bank's `sources`). */
  sources: string[];
  /** Set only after a person has checked the item's correctness, suitability and difficulty. */
  checked?: { by: string; date: string; note?: string };
}

/**
 * Which job an anchor does (E3). Prompt anchors are shown to evaluators as examples; qualification and
 * drift anchors are used to check evaluators and are never shown to them. An anchor without a set is a
 * legacy (E1–E2) candidate and is treated as before.
 */
export type AnchorSet = "prompt" | "qualification" | "drift";

/** The record that makes an anchor trusted: independent scoring by at least two educators (E3, D-4). */
export interface AnchorReview {
  /** Internal scorer ids (never names in content files). */
  scorers: string[];
  /** Each scorer's independent scores, before agreement. */
  independent: Record<string, Record<string, number | boolean>>;
  /** How disagreements were settled, if any. */
  adjudication?: string;
  rubric_version: string;
  date: string;
}

export interface Anchor {
  id: string;
  /** Agreed scores per capability. In E1 these are candidates written by OpenPath, not yet educator-scored. */
  scores: Record<CapabilityId, number>;
  trusted: boolean;
  text: string;
  set?: AnchorSet;
  review?: AnchorReview;
}

/** One thing a short written answer must contain to count as right. */
export interface KeyPoint {
  id: string;
  text: string;
  /** All required key points must be present for the answer to count as right. */
  required: boolean;
}

/**
 * A deterministic check on a short answer. If the response matches `forbids` (or fails to match
 * `requires`), the named key point cannot be present, whatever an evaluator says.
 */
export interface Guard {
  id: string;
  key_point: string;
  requires?: string;
  forbids?: string;
  note: string;
}

export interface ShortAnchor {
  id: string;
  /** Agreed marks per key point. */
  marks: Record<string, boolean>;
  trusted: boolean;
  text: string;
  set?: AnchorSet;
  review?: AnchorReview;
}

/**
 * A short written response (one to three sentences), marked by an evaluator against key points (E3).
 * Code turns the marks into right or wrong, which enters the composite through the same update as a
 * code-scored item of the same difficulty, with no guessing floor.
 */
export interface ShortItem {
  id: string;
  version: number;
  family?: string;
  target: CapabilityId;
  format: string; // "short:rewrite", "short:explain", "short:combine", "short:complete"
  prompt: string;
  passage?: string;
  a: number;
  b: number;
  max_words: number;
  key_points: KeyPoint[];
  model_answers: string[];
  guards?: Guard[];
  anchors: ShortAnchor[];
  addresses?: string[];
  review?: string;
  step?: string;
  rationale?: string;
  difficulty_source?: "expert_estimate";
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

export type Item = ({ kind: "code" } & CodeItem) | ({ kind: "writing" } & WritingTask) | ({ kind: "short" } & ShortItem);

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
  sessions?: { session: string; at: string; level: number | null; obs?: SessionObservation[]; teaching?: true }[];
  /**
   * Qualifying evidence (teaching-setting provenance, PR #23): answers given after teaching on this capability in
   * the same session still update the estimate exactly as before, but they never count towards demonstrating,
   * mastery or a retention check. These counts are of qualifying answers only; for records with no teaching in a
   * session they equal directN and contexts, so older records read exactly as before.
   */
  qualifyingN?: number;
  qualifyingContexts?: string[];
  /** The demonstrated level as of the latest qualifying answer (what the view reports between them). */
  qualifiedLevel?: number | null;
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

/**
 * Why an answer was collected (recorded with the evidence; it never changes the mathematics):
 *   assessment  an independent check: placement, an assessment probe or a transfer check on unseen words
 *   practice    a first, unaided attempt during practice (hints and second attempts are never evidence)
 *   retention   a later check of something learned earlier
 */
export type EvidenceUse = "assessment" | "practice" | "retention";

export interface EvidenceEvent {
  kind: "evidence";
  id: string;
  at: string;
  session: string;
  item: { id: string; version: number };
  response: Response;
  use?: EvidenceUse;
  /**
   * How the answer was given (provenance@1). Absent on evidence recorded before the schema: its assistance
   * status is then unknown, and rule-level statuses never treat it as confirmed independent performance.
   */
  provenance?: Provenance;
}

// ---------------------------------------------------------------- evidence provenance (docs/english/EVIDENCE_PROVENANCE.md)

export interface Provenance {
  schema: "provenance@1";
  /** Id of the `presented` event for this question. */
  presented?: string;
  /** 1 for a first answer. */
  attempt: number;
  /** Ids of `hint` events shown for this item before this answer. */
  hints: string[];
  /** The learner had already seen feedback on this item. */
  afterFeedback: boolean;
  /** The intervention this answer follows, if any. */
  intervention?: string;
  /**
   * Evidence policies in force when the answer was recorded (a version boundary, set by the app that recorded it).
   * "passage@1": a second answer on a reading passage already counted for this capability is held (updater.ts,
   * docs/english/READING_EVIDENCE_DEPENDENCE.md). Absent on every answer recorded before the policy: those replay
   * exactly as they were scored, so no historical result changes.
   */
  policies?: EvidencePolicy[];
}

/** Evidence policies an answer can be recorded under. */
export type EvidencePolicy = "passage@1" | "assisted@1";
export const PASSAGE_POLICY: EvidencePolicy = "passage@1";
/**
 * "assisted@1": an item the learner already met with help (an assisted response, or shown in teaching) is never
 * fresh evidence again: a later first answer to it is recorded as a repeat (retention only, no estimate change).
 * Answers recorded before the policy replay exactly as they were scored.
 */
export const ASSISTED_POLICY: EvidencePolicy = "assisted@1";

/** What a question was shown for (the client's intent; the engine decides what the evidence shows). */
export type PresentedPurpose = "assessment" | "practice" | "retention" | "transfer" | "teaching";

export interface PresentedEvent {
  kind: "presented";
  id: string;
  at: string;
  session: string;
  item: { id: string; version: number };
  purpose?: PresentedPurpose;
  intervention?: string;
}

export interface HintEvent {
  kind: "hint";
  id: string;
  at: string;
  session: string;
  item: { id: string; version: number };
  presented?: string;
  /** 1 for the first, lightest hint. */
  level: number;
  /** Subject-defined hint type (for example "rule_reminder", "similar_example"). */
  hintType: string;
  /** The hint showed the answer (a worked example). Any later response to the item is assisted, never independent. */
  revealsAnswer?: true;
}

/** A second or later attempt, or any answer given with help. Recorded; never changes an estimate. */
export interface AssistedResponseEvent {
  kind: "assisted_response";
  id: string;
  at: string;
  session: string;
  item: { id: string; version: number };
  presented?: string;
  response: Response;
  attempt: number;
  hints: string[];
  afterFeedback: boolean;
  intervention?: string;
}

/** Teaching delivered. Strategy ids are defined by the subject module. */
export interface InterventionEvent {
  kind: "intervention";
  id: string;
  at: string;
  session: string;
  capability: CapabilityId;
  rule?: string;
  strategy: string;
  /** Content shown (for example a lesson id). */
  content?: string;
  /** Items displayed as part of the teaching: a first answer to one of these is not independent. */
  items?: string[];
  /** The planner decision that chose it, when there is one. */
  decision?: string;
  reason?: string;
}

export type ProvenanceEvent = PresentedEvent | HintEvent | AssistedResponseEvent | InterventionEvent;

/** Confirmed independent: provenance present, a first attempt, no hints, no feedback first. (Teaching that displayed the item is checked by the reader, which can see the intervention.) */
export const isIndependentProvenance = (p: Provenance | undefined): boolean => !!p && p.schema === "provenance@1" && p.attempt === 1 && p.hints.length === 0 && !p.afterFeedback;

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
  /** Short written responses (E3): agreement with the agreed key-point marks. Absent if none were scored. */
  short?: { n: number; agreement: number; qualified: boolean };
  /** Anchoring-bias test (E3): may the learner's current estimates be shown to this evaluator? */
  estimates_allowed?: boolean;
}

export interface RevokeEvent {
  kind: "revoke";
  id: string;
  at: string;
  decision: string;
  reason: string;
}

/**
 * Essay-to-mastery records (essay-contract@1, essay/contract.ts): submissions, validated essay observations,
 * diagnostic requests, journeys and rewrites. Recorded in this ledger so one learner profile serves every
 * essay; the updater never changes an estimate for them (essay observations are tentative by definition).
 */
export interface EssayEvent {
  kind: "essay";
  id: string;
  at: string;
  session: string;
  record: EssayRecord;
}

export type LedgerEvent = EvidenceEvent | ProposalEvent | QualificationEvent | RevokeEvent | ProvenanceEvent | EssayEvent;

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
    /** Why the answer was collected, as recorded with the evidence. */
    use?: EvidenceUse;
    /**
     * after_teaching: answered, without help, in the same session after teaching on this capability (an
     * intervention event). It updates the estimate as before but cannot demonstrate, master or count as a
     * retention check. Absent: no teaching on this capability earlier in the session.
     */
    setting?: "after_teaching";
    /**
     * Passage dependence (passage@1): the reading passage this answer shares with an answer already counted on
     * this capability, and that answer's decision. The answer is held: kept for diagnosis and reporting, changing no
     * estimate. Absent on every answer the rule does not hold.
     */
    samePassage?: { passage: string; counted: string };
  };
  before?: { mean: number; sd: number };
  after?: { mean: number; sd: number };
  inferred?: { capability: CapabilityId; shift: number }[];
}
