/**
 * Essay-to-mastery shared API contract (essay-contract@1).
 *
 * The workflow: essay → competency observations → diagnostic verification → finite learning journey →
 * final 50-word rewrite → updated persistent learner profile. This file defines only the shapes that the
 * intelligence layer (this package) and any app (the Codex tutor UI, a server) exchange. It holds no logic.
 *
 * Five evidence states are kept apart everywhere (CompetencyState):
 *
 *   unknown       nothing recorded about the competency
 *   observed      an essay showed it (an error or a strength), but not enough to suspect a gap: tentative
 *   suspected     essay observations point to a gap (for example the same kind of error in several sentences):
 *                 a hypothesis to check, never a result
 *   demonstrated  the existing engine says it was shown independently (Verification "demonstrated") at a level
 *                 that reaches the grade profile's target band
 *   verified      the existing engine says it is verified (Verification "verified": retained after a delay) at a
 *                 level that reaches the grade profile's target band
 *
 * "observed" and "suspected" come only from essays and never change an ability estimate. "demonstrated" and
 * "verified" come only from the existing engine (ledger → composite → leafView().verification), under the
 * existing evidence rules (provenance, content validation, retention). Nothing in this contract can set them.
 *
 * Versioning: every exchanged object carries `contract: "essay-contract@1"`. A breaking change gets a new
 * version string; readers reject versions they do not know.
 */
import type { CapabilityId } from "../types.ts";
import type { Stage, VerificationStatus } from "../composite.ts";
import type { ContentStatus } from "../content.ts";

export const ESSAY_CONTRACT = "essay-contract@1" as const;
export type EssayContractVersion = typeof ESSAY_CONTRACT;

// ---------------------------------------------------------------- competencies and curriculum

/** The six writing areas the Grade 8 analysis covers. */
export type WritingArea = "grammar" | "prepositions" | "sentence_structure" | "vocabulary" | "coherence" | "concision";

/**
 * The established rubric each competency is reported under: the six traits of the 6+1 Trait Writing model
 * (Education Northwest). Used for grouping and reporting only; scoring stays per competency.
 */
export type RubricTrait = "ideas" | "organization" | "voice" | "word_choice" | "sentence_fluency" | "conventions";

/** A curriculum or reference mapping. Every mapping is indicative until an educator validates it. */
export interface CurriculumRef {
  scheme: "openpath" | "ncert_lo" | "cbse" | "cefr";
  grade?: number;
  /** The scheme's own code or name, when it has one. */
  code?: string;
  note: string;
  validated: false;
}

/** One competency in a grade profile. `capability` is always a leaf id of the OpenPath English framework. */
export interface CompetencyRef {
  capability: CapabilityId;
  name: string;
  area: WritingArea;
  trait: RubricTrait;
  grade: number;
  /** Draft expected band (1–8 scale) for the grade; null when the framework does not specify the capability yet. */
  expectedBand: number | null;
  /** The framework specifies it (descriptors exist). Unspecified competencies can be observed but not assessed. */
  specified: boolean;
  curriculum: CurriculumRef[];
}

/** A versioned set of competencies for one grade and subject (content/english/essay/*.json). */
export interface CompetencyProfile {
  id: string;
  version: number;
  grade: number;
  subject: "english_writing";
  status: "candidate";
  rubric: { name: string; source: string };
  note?: string;
  competencies: CompetencyRef[];
}

// ---------------------------------------------------------------- essay submission

export interface EssaySource {
  /** How the text arrived. OCR text must be confirmed by the learner before submission. */
  kind: "typed" | "pasted" | "photo_ocr" | "synthetic";
  /** The task or prompt the essay answers, if any. */
  prompt?: string;
  genre?: "narrative" | "descriptive" | "informative" | "persuasive" | "functional" | "other";
  grade: number;
  /** Competency profile id and version used for analysis, e.g. "openpath.g8-writing@1". */
  profile: string;
  /**
   * Whose writing this is. "real_learner" is refused until consent, retention and deletion policies are
   * approved (REAL_LEARNER_ESSAYS_ENABLED).
   */
  dataUse: "synthetic_test" | "real_learner";
}

export interface EssaySubmission {
  contract: EssayContractVersion;
  /** Essay id, unique per learner. */
  id: string;
  /** Pseudonymous learner id (never a name). */
  learner: string;
  session: string;
  at: string;
  text: string;
  words: number;
  /** Deterministic fingerprint of the normalised text: detects repeated submissions. Not a security hash. */
  fingerprint: string;
  source: EssaySource;
}

// ---------------------------------------------------------------- evaluator boundary

/** Who produced an analysis: any LLM provider, a person, or a fixture. Required on every observation. */
export interface EvaluatorRef {
  id: string;
  /** The evaluator's own version (model build, rubric revision, fixture set). */
  version: string;
  /** The request protocol it answered (ESSAY_OBSERVE_PROTOCOL or ESSAY_REWRITE_PROTOCOL). */
  protocol: string;
  model?: string;
}

export const ESSAY_OBSERVE_PROTOCOL = "essay-observe.v1" as const;
export const ESSAY_REWRITE_PROTOCOL = "essay-rewrite.v1" as const;

/** What an evaluator receives for analysis. The text is scrubbed of contact details first. */
export interface ObservationRequest {
  protocol: typeof ESSAY_OBSERVE_PROTOCOL;
  request_id: string;
  essay: { id: string; text: string; words: number };
  grade: number;
  competencies: { id: CapabilityId; name: string; area: WritingArea; bands: Record<string, string>; misconceptions: { id: string; description: string }[] }[];
  /** At most this many observations are accepted. */
  max_observations: number;
}

/**
 * What an evaluator must return (raw JSON, validated strictly; unknown fields are rejected).
 * Offsets are computed by code from the quote; the evaluator never supplies them.
 */
export interface ObservationOutput {
  essay_id: string;
  observations: {
    competency: CapabilityId;
    kind: "error" | "strength";
    /** Verbatim text from the essay. A paraphrase is rejected. */
    quote: string;
    /** For an error: the corrected text (optional). */
    correction?: string;
    /** A misconception tag the framework lists for this competency (optional; unknown tags are dropped). */
    misconception?: string;
    confidence: "high" | "medium" | "low";
    note: string;
  }[];
  /** Competencies the essay gives no chance to show. */
  not_observable: CapabilityId[];
}

/** What an evaluator receives for the final rewrite. */
export interface RewriteRequest {
  protocol: typeof ESSAY_REWRITE_PROTOCOL;
  request_id: string;
  original: { id: string; text: string };
  rewrite: { id: string; text: string; words: number; limit: number };
  dimensions: RewriteDimension[];
}

/** What an evaluator must return for a rewrite (raw JSON, validated strictly). */
export interface RewriteOutput {
  rewrite_id: string;
  dimensions: { dimension: RewriteDimension; rating: RewriteRating; quotes: string[]; note: string }[];
  /** The original's main ideas, each with where the rewrite keeps it (null when it is lost). */
  key_ideas: { original_quote: string; rewrite_quote: string | null }[];
}

/** Any provider, person or fixture. Returns raw JSON; validation happens in OpenPath. */
export interface EssayEvaluator {
  id: string;
  version: string;
  model?: string;
  observe(request: ObservationRequest): Promise<unknown>;
  rewrite(request: RewriteRequest): Promise<unknown>;
}

// ---------------------------------------------------------------- observations

/** A quoted span of the essay. start/end are UTF-16 offsets into EssaySubmission.text; sentence is 0-based. */
export interface EvidenceSpan {
  quote: string;
  start: number;
  end: number;
  sentence: number;
}

/** One accepted essay observation. Tentative: it never changes an ability estimate. */
export interface EssayObservation {
  id: string;
  essay: string;
  competency: CapabilityId;
  area: WritingArea;
  kind: "error" | "strength";
  span: EvidenceSpan;
  correction?: string;
  misconception?: string;
  confidence: "high" | "medium" | "low";
  note: string;
  evaluator: EvaluatorRef;
}

/** The validated result of one analysis run. */
export interface EssayAnalysis {
  contract: EssayContractVersion;
  id: string;
  essay: string;
  evaluator: EvaluatorRef;
  /** accepted: observations kept; held: nothing kept, needs a person (e.g. text addressed to the evaluator); rejected: unusable output. */
  status: "accepted" | "held" | "rejected";
  reasons: string[];
  observations: EssayObservation[];
  rejected: { index: number; competency?: string; reason: string }[];
  notObservable: CapabilityId[];
  /** This essay repeats an earlier submission (same fingerprint): its observations are not counted again. */
  repeatOf?: string;
}

// ---------------------------------------------------------------- gap hypotheses and diagnostics

export type HypothesisStatus = "suspected" | "confirmed" | "weakened" | "unresolved";

/** A suspected gap from essay evidence, and what diagnosis has found since. Derived; never an estimate. */
export interface GapHypothesis {
  id: string;
  competency: CapabilityId;
  status: HypothesisStatus;
  /** How sure the essay evidence alone is (more distinct errors, less uncertainty). */
  uncertainty: "high" | "medium" | "low";
  essays: string[];
  observations: string[];
  misconceptions: string[];
  /** Plain reasons, including any disagreement with the engine. */
  basis: string[];
  /** The engine's verification when the hypothesis was formed (a gap on a verified skill is flagged). */
  engine: VerificationStatus;
  diagnostic?: DiagnosticOutcome;
  policy: string;
}

/** Questions chosen to check one hypothesis. Answers are ordinary ledger evidence with provenance. */
export interface DiagnosticRequest {
  contract: EssayContractVersion;
  id: string;
  essay: string;
  hypothesis: string;
  competency: CapabilityId;
  items: { id: string; version: number; contentStatus: ContentStatus }[];
  /** Independent answers needed before an outcome other than "unresolved". */
  minIndependent: number;
  /** Set when too few suitable unseen questions exist: reported, never filled with invented questions. */
  contentGap?: string;
  policy: string;
}

export interface DiagnosticOutcome {
  request: string;
  competency: CapabilityId;
  /** pending: not enough answers yet. */
  status: "pending" | "confirmed" | "weakened" | "unresolved";
  independent: { right: number; total: number };
  /** Answers given with help: shown, never used to decide. */
  assisted: { right: number; total: number };
  /** Wrong answers whose misconception tag matches the essay's. */
  misconceptionMatches: number;
  answers: { evidence: string; item: string; correct: boolean; independent: boolean; verdict: string }[];
  reason: string;
}

// ---------------------------------------------------------------- finite learning journey

export type JourneyStepKind = "diagnose" | "teach" | "guided_practice" | "independent_check";

/**
 * pending: not started; done: completed (a lesson read, practice finished); green: the evidence policy now
 * permits the claim (engine verification demonstrated or verified); blocked: missing content.
 * Only the engine can make a step or node green; completing a lesson never does.
 */
export type StepStatus = "pending" | "done" | "green" | "blocked";

export interface JourneyStep {
  id: string;
  competency: CapabilityId;
  kind: JourneyStepKind;
  order: number;
  content: { available: boolean; refs: string[]; note: string };
  status: StepStatus;
  /** Ledger ids that moved the step on. */
  evidence: string[];
  reason: string;
}

export interface JourneyNode {
  competency: CapabilityId;
  role: "target" | "prerequisite";
  /** Prerequisites (framework edges) shown as child nodes. */
  requires: CapabilityId[];
  reason: string;
  steps: JourneyStep[];
  /** Green only when the engine supports demonstrated or verified at the grade target band. */
  green: boolean;
  level: "none" | "demonstrated" | "verified";
}

/** One target competency with the prerequisites it needs: a small tree. */
export interface CompetencyTree {
  root: CapabilityId;
  nodes: JourneyNode[];
}

export interface LearningJourney {
  contract: EssayContractVersion;
  id: string;
  essay: string;
  learner: string;
  at: string;
  policy: string;
  trees: CompetencyTree[];
  /** Competencies left out, with why (already shown, hypothesis weakened, beyond the journey's size). */
  skipped: { competency: CapabilityId; reason: string }[];
  contentGaps: { competency: CapabilityId; what: string }[];
  /** The journey is finite: these limits are fixed when it is created. */
  limits: { maxTrees: number; maxStepsPerNode: number; totalSteps: number };
  finalRewrite: { available: boolean; reason: string };
  /** All target nodes green. Not a verified goal unless every target is "verified". */
  complete: boolean;
}

// ---------------------------------------------------------------- final rewrite

export type RewriteDimension = "meaning_preservation" | "clarity" | "coherence" | "grammar" | "concision";
export type RewriteRating = "not_yet" | "partly" | "mostly" | "fully";

export interface RewriteSubmission {
  contract: EssayContractVersion;
  id: string;
  /** The original essay's id. */
  essay: string;
  at: string;
  session: string;
  text: string;
  words: number;
  limit: number;
}

export interface RewriteDimensionResult {
  dimension: RewriteDimension;
  rating: RewriteRating | null;
  quotes: string[];
  note: string;
  status: "accepted" | "rejected" | "not_assessed";
  reason?: string;
}

/** Each dimension is judged separately. A rewrite never verifies a competency or changes an estimate. */
export interface RewriteEvaluation {
  contract: EssayContractVersion;
  rewrite: string;
  essay: string;
  evaluator: EvaluatorRef | null;
  /** Checked by code, not by the evaluator. */
  words: { count: number; limit: number; min: number; within: boolean };
  dimensions: RewriteDimensionResult[];
  keyIdeas: { original: string; rewrite: string | null }[];
  status: "evaluated" | "held" | "rejected";
  reasons: string[];
  affectsEstimates: false;
  verifiesCompetencies: false;
  /** Ledger ids of the original essay and the rewrite, for side-by-side comparison. */
  artifacts: { original: string; revised: string };
}

// ---------------------------------------------------------------- learner profile

export type CompetencyState = "unknown" | "observed" | "suspected" | "demonstrated" | "verified";

/** Where each piece of evidence came from, by permission to change estimates. */
export interface ProvenanceSummary {
  /** Essay observations: tentative, never estimate-changing. */
  tentative: string[];
  /** Ledger evidence accepted by the engine as independent. */
  independent: string[];
  /** Answers with help (hints, retries, guided practice). */
  assisted: string[];
  /** Recorded but held by the engine (provisional content, repeats, unqualified evaluators). */
  held: string[];
}

export interface CompetencyStatus {
  competency: CapabilityId;
  name: string;
  area: WritingArea | null;
  /**
   * The strongest claim the evidence supports, in the order verified > demonstrated > suspected > observed >
   * unknown. A gap hypothesis is reported alongside in `gap`, so a verified skill with new essay errors shows
   * both (the engine claim and the disagreement); neither overrides the other.
   */
  state: CompetencyState;
  gap: GapHypothesis | null;
  /**
   * The engine's view. `state` counts demonstrated or verified only when `currentLevel` (the level the evidence
   * currently supports) reaches `target` (the profile's draft grade band).
   */
  engine: { stage: Stage; verification: VerificationStatus; currentLevel: number | null; target: number | null; demonstrated: number | null; mastered: number | null; directN: number };
  essays: { errors: number; strengths: number; essays: number };
  provenance: ProvenanceSummary;
  notes: string[];
}

/** One change between two profiles. `estimateChanged` is true only when the engine's composite moved. */
export interface ProfileUpdate {
  competency: CapabilityId;
  from: CompetencyState;
  to: CompetencyState;
  gapFrom: HypothesisStatus | null;
  gapTo: HypothesisStatus | null;
  estimateChanged: boolean;
  reason: string;
  evidence: string[];
}

export interface EssayLearnerProfile {
  contract: EssayContractVersion;
  learner: string;
  asOf: string;
  profile: string;
  competencies: CompetencyStatus[];
  essays: { id: string; at: string; words: number; fingerprint: string; repeatOf?: string }[];
  journeys: string[];
  rewrites: { id: string; essay: string; at: string }[];
}

// ---------------------------------------------------------------- ledger records

/**
 * Essay records live in the existing learner ledger as `{ kind: "essay" }` events (types.ts EssayEvent).
 * The engine records them and changes no estimate; essay projections read them back.
 */
export type EssayRecord =
  | { type: "submission"; submission: EssaySubmission }
  | { type: "analysis"; analysis: EssayAnalysis }
  | { type: "diagnostic"; request: DiagnosticRequest }
  | { type: "journey"; journey: LearningJourney }
  | { type: "rewrite"; rewrite: RewriteSubmission; evaluation: RewriteEvaluation };

// ---------------------------------------------------------------- policy

/** Draft policy values. Versioned; none is a claim about what works for children. */
export interface EssayPolicy {
  version: string;
  /** Distinct sentences with an error on one competency before a gap is suspected (fewer: observed only). */
  suspectMinSentences: number;
  maxObservations: number;
  /** Unseen questions per diagnostic request. */
  diagnosticItems: number;
  /** Independent answers needed for confirmed or weakened. */
  diagnosticMinIndependent: number;
  /** Independent wrong answers that confirm a gap. */
  confirmMinWrong: number;
  /** Independent answers that must all be right to weaken a gap. */
  weakenAllRight: boolean;
  maxTrees: number;
  /** Prerequisite levels followed below each target. */
  prerequisiteDepth: number;
  guidedItems: number;
  checkItems: number;
  rewriteLimit: number;
  rewriteMin: number;
}

/** Real learners' essays are refused until consent, retention and deletion policies are approved. */
export const REAL_LEARNER_ESSAYS_ENABLED = false as const;
