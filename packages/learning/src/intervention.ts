import { alignmentActive, followupCompatible, qualifiedFollowup } from "./method-alignment";
import { taughtExposureKeys } from "./teaching-exposure";
/**
 * The unified learning module (Explore → Strategy → Chapter → Practise → Verify) and prerequisite recovery.
 *
 *   Explore    1 to 3 diagnostic questions (diagnostic.ts)
 *   Strategy   chosen from the diagnosis AND from what the learner already shows: a strategy's "needs" are quick probe
 *              questions (for 7 × 8: is 7 × 7 known? 7 × 5 and 7 × 3? 7 × 2?). A strategy built on something the
 *              learner showed comes first; one built on something they missed comes last.
 *   Chapter    the module's mini-chapter and the strategy's own screens (one small step)
 *   Practise   one guided question (hints; assisted), then one fresh check alone: english-core's planRule decides
 *              (teach → guided → reassess; a failed block changes strategy; strategies used up → a person)
 *   Verify     practice and transfer questions alone; a delayed check RETENTION_DAYS after independent success
 *
 * Recovery from an original problem walks the "supports" graph (cycle-safe, at most RECOVERY_DEPTH levels in one
 * session), assesses the supporting skills that are not already shown, teaches the one that is missing, and goes back to
 * the original problem. A success after help is recorded as help, never as independent work.
 */
import { PLANNER_POLICY_DRAFT, planRule, type PlannerDecision, type PlannerPolicy } from "../../english-core/src/planner";
import { rateOf, type InterventionSummary, type MisconceptionRecord, type RuleState } from "../../english-core/src/rule-evidence";
import { poolFamilies, moduleFor, question, type Module, type Strategy } from "./content";
import { diagnose, type Diagnosis } from "./diagnostic";
import { DAY, evidenceFor, independentAttempt, rightAnswer, type SkillEvidence } from "./evidence";
import { exposureKey, gradeOfQuestion, parseProblem, phaseOf as phaseOfQ, phasePool, problemKeyOf, problemOf, type Phase } from "./families";
import { graph, walkSupports } from "./graph";
import { quarantined } from "./question-status";
import { modulePhasePool } from "./library";
import { discriminatingProbe, familyOf, hypothesesFor, investigateContext, investigation, investigationTrigger, openHypothesis, teachingMatchesMisconception } from "./hypotheses";
import { claimWording, nextFromReasoning, probeReading, reason, withTail, type Reasoning } from "./reasoning";
import { alignedPractice, teachingEligibility, type TeachingEligibility } from "./teaching-contract";
import { contentEligibility, isMisconceptionSpecific, teachingMode, type ContentEligibility } from "./explanation-review";
import { evidenceBasis, type EvidenceBasis } from "./misconception-evidence";
import type { Attempt, LearnerRecords } from "./records";
import { connectedSkill, connectionConfig } from "./skill-connections";
import { classifyQuestionWith } from "./subskill-projection";
import { keyboardOffered, writtenTask } from "./written";
import { blocksTransfer, heldByTeaching, presentedProblems, unitOfQuestion, unitOfStrategy, unitStates, type SkillUnit, type UnitState } from "./skill-units";

/** The shared planner's draft policy with this engine's block size (one guided question, one fresh check, no contrast). */
export const MODULE_POLICY: PlannerPolicy = { ...PLANNER_POLICY_DRAFT, guidedItems: 1, reassessItems: 1, reassessPassMin: 1, reassessContrastItems: 0, version: `${PLANNER_POLICY_DRAFT.version}+learning-module@1` };
export const RECOVERY_DEPTH = 2;

const of = (m: Module) => (a: Attempt) => question(a.questionId).competency === m.competency;
/** level@1: the learner's grade (their current enrolment), and whether a question is within it: a problem from a
 * later grade is never asked (it is reached in that grade); one from an earlier grade may be (recovery, review). */
const gradeOf = (records: LearnerRecords) => records.enrolments.at(-1)?.grade ?? null;
export const withinGrade = (records: LearnerRecords, qid: string) => {
  const g = gradeOf(records);
  const q = g === null ? null : gradeOfQuestion(qid);
  return records.readinessRoute?.includes(question(qid).competency) || g === null || q === null || q <= g;
};
/** grade-order@1: a learner meets questions of their own grade before those of an earlier grade. 0: on the learner's grade (or a
 *  question with no grade); 1: below it. Below-grade questions stay available (recovery, review), only later; on a readiness
 *  route (prerequisites on purpose) nothing is reordered. */
export const gradeRank = (records: LearnerRecords) => (qid: string): number => {
  const g = gradeOf(records);
  if (g === null) return 0;
  const q = gradeOfQuestion(qid);
  return q !== null && q < g && !records.readinessRoute?.includes(question(qid).competency) ? 1 : 0;
};
/** The ids in grade order for this learner (stable: the given order within each rank). */
export const gradeFirst = (records: LearnerRecords, ids: readonly string[]): string[] => {
  const r = gradeRank(records);
  return ids.map((id, i) => [r(id), i, id] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
};
/** The diagnosis of a module for this learner: on-grade exploratory questions are asked first (grade-order@1). */
export const learnerDiagnosis = (m: Module, records: LearnerRecords) => diagnose(m, records.attempts, gradeRank(records));
/** The learner's first attempt at this problem, in either answer format (one exposure). */
const answered = (records: LearnerRecords, qid: string) => records.attempts.find((a) => exposureKey(a.questionId) === exposureKey(qid)) ?? (records.pending?.some((p) => p.questionId === qid) ? ({ questionId: qid } as unknown as Attempt) : null);
/**
 * depth@1: the next question of a phase from the module's family pool that this learner has never seen (in either
 * format). null when the pool has no unseen question left: the module then says so; nothing is repeated as evidence.
 */
export function fromPool(m: Module, phase: Phase, records: LearnerRecords): string | null {
  if (!m.pool) return null;
  const seen = new Set(records.attempts.map((a) => exposureKey(a.questionId)));
  // pools@1: from every family of the competency in turn
  const id = gradeFirst(records, modulePhasePool(m, phase)).find((id) => !seen.has(exposureKey(id)) && withinGrade(records, id)) ?? null;
  return id && phase === "check" ? situationFirst(m, id, records) : id;
}

/**
 * contexts@1 (grade7-split@1): the shared record demonstrates a skill only from answers in at least two kinds of question
 * (a typed question and a situation, say), and answers given in the session that taught it do not count. A module whose
 * pool is a single family offers mostly one kind, so a learner taught it could answer fresh checks right for ever and never
 * demonstrate it. Here, when this learner was taught the skill and has not answered a situation question on it since, a
 * fresh check is offered in its situation (word) form. Modules drawing on several families are unchanged.
 */
function situationFirst(m: Module, id: string, records: LearnerRecords): string {
  if (poolFamilies(m).length !== 1) return id;
  const last = records.teaching.filter((t) => t.competency === m.competency).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  if (!last) return id;
  // answers in the teaching session itself do not count towards demonstrating: look at later sessions only
  const since = records.attempts.filter((a) => of(m)(a) && a.at > last.at && a.session !== last.session);
  if (since.some((a) => a.questionId.endsWith(":w"))) return id;
  const w = `${id.replace(/:mc$/, "")}:w`;
  try {
    return question(w) && !quarantined(w) ? w : id;
  } catch {
    return id;
  }
}

/** A constrained request for a fresh evidence opportunity. The existing selector owns
 * all safety, grade and exposure checks; callers only narrow the required skill. */
export function questionForRequirement(m: Module, phase: "check" | "retention", records: LearnerRecords, accepts: (id: string) => boolean, placement: "enrolment" | "readiness" = "enrolment"): string | null {
  const seen = new Set([...records.attempts, ...records.unresolved, ...records.pending].map((a) => exposureKey(a.questionId)));
  for (const key of taughtExposureKeys(records)) seen.add(key);
  const candidates = [...modulePhasePool(m, phase), ...(phase === "retention" ? m.retention : [...m.diagnostics, ...m.practice, ...m.strategies.map((s) => s.check)])];
  return (placement === "readiness" ? candidates : gradeFirst(records, candidates)).find((id) => !quarantined(id) && !seen.has(exposureKey(id)) && (placement === "readiness" || withinGrade(records, id))
    && question(id).competency === m.competency && accepts(id)) ?? null;
}

/**
 * skill-scope@1: a skill-scoped explanation is for the learner's CURRENT skill only. The current skill is read from trusted
 * provenance, never from question family or wording: the competency's versioned skill mapping classifies the question of the
 * learner's latest wrong answer in this module (a recorded attempt). null when the competency has no mapping, there is no
 * such answer, or its question is unmapped (ambiguous): then no skill is assumed.
 */
export function currentSkill(m: Module, records: LearnerRecords): string | null {
  const config = connectionConfig(m.competency);
  if (!config) return null;
  const last = records.attempts.filter((a) => of(m)(a) && !rightAnswer(a)).at(-1);
  return last ? connectedSkill(config, last.questionId) : null;
}
/**
 * Whether a strategy may be offered for this learner's current skill (skill-scope@1). Explanations without a skill scope
 * (generic and hand-written lessons) are unchanged. A skill-scoped general explanation is offered on its own skill, or, when
 * no current skill is known, as safe general teaching. A skill-scoped misconception fix is offered only when the current
 * skill is its skill AND the misconception was recorded on that skill: an investigated finding whose original question the
 * mapping classifies as that skill. With missing or ambiguous provenance the fix abstains (general teaching remains).
 */
export function scopeAllows(m: Module, s: Strategy, records: LearnerRecords, skill: string | null = currentSkill(m, records)): boolean {
  const target = s.scope?.subSkill;
  const config = target ? connectionConfig(m.competency) : null;
  if (!target || !config) return true;
  if (!isMisconceptionSpecific(s)) return skill === null || skill === target;
  if (skill !== target) return false;
  return hypothesesFor(m.competency, records).some((h) => (h.status === "established" || h.status === "resolved" || h.status === "contested")
    && h.claim?.explanation === s.addresses && connectedSkill(config, h.scope.question) === target);
}

/**
 * review-scope@1: the lesson behind "Review a supported lesson". It follows skill-scope@1: the skill is that of the question the
 * learner is looking at (the one just answered, or the one on screen) when the competency's mapping classifies it, else the
 * current skill. Only eligible explanations that skill allows; one written for that very skill first, then general ones, then
 * the rest in module order; a misconception fix only after the general explanations. A question the mapping places outside
 * every skill gets general explanations only (none: no review is offered). Without a mapping: module order, as before.
 */
export function reviewStrategy(m: Module, records: LearnerRecords, qid?: string | null): Strategy | null {
  const config = connectionConfig(m.competency);
  const eligible = (s: Strategy) => teachingEligibility(m, s).eligible && contentEligibility(m, s, { competency: m.competency, usage: "lesson" }).eligible;
  if (!config) return m.strategies.find(eligible) ?? null;
  const skill = (qid ? connectedSkill(config, qid) : null) ?? currentSkill(m, records);
  // a question of this competency that the mapping places outside every skill (a family it leaves unmapped, e.g. digit-card
  // place value in missing numbers) gets no lesson written for another skill: general explanations only
  const outside = !!qid && qid.startsWith("gen:") && question(qid).competency === m.competency && classifyQuestionWith(config, qid).kind !== "mapped";
  const own = (s: Strategy) => (skill && s.scope?.subSkill === skill ? 0 : s.scope?.subSkill ? 2 : 1);
  return m.strategies
    .filter((s) => eligible(s) && scopeAllows(m, s, records, skill) && !(outside && s.scope?.subSkill))
    .sort((a, b) => own(a) - own(b) || Number(isMisconceptionSpecific(a)) - Number(isMisconceptionSpecific(b)) || m.strategies.indexOf(a) - m.strategies.indexOf(b))[0] ?? null;
}

/** Strategies in the order to try: the diagnosis's kind first, then by what the probes show the learner can build on. */
export function orderStrategies(m: Module, d: Diagnosis, records: LearnerRecords, misconceptionEvidence: Evidence = establishedIds(m.competency, records)): Strategy[] {
  const kind = d.result === "conceptual" || d.result === "insufficient_evidence" ? "conceptual" : d.result === "procedural" || d.result === "transfer" ? "procedural" : d.result === "recall" ? "recall" : d.result === "prerequisite" ? "prerequisite" : null;
  const needState = (s: Strategy) => {
    const res = s.needs.map((id) => answered(records, id));
    if (res.some((a) => a && !rightAnswer(a))) return 2; // builds on something the learner missed
    if (res.every((a) => a && rightAnswer(a))) return 0; // builds on what the learner showed
    return 1;
  };
  // misconception-evidence@1: an eligible misconception-specific explanation is about a misconception established for this learner (the
  // gate refuses it otherwise), so it comes first: the evidence justifies it more than the diagnosis kind does
  const specific = (s: Strategy) => Number(!isMisconceptionSpecific(s));
  // in a module whose explanations are about different kinds of question (its families), one about the kind the learner last got wrong
  // comes first: its worked example and recheck are that kind (Workstream A3: linear equations, two steps / both sides / bracket)
  const lastWrong = records.attempts.filter((a) => of(m)(a) && !rightAnswer(a)).at(-1);
  const wrongFamily = lastWrong ? problemOf(lastWrong.questionId.replace(/:(mc|w)$/, ""))?.family ?? null : null;
  const relevant = (s: Strategy) => Number(!!wrongFamily && problemOf(s.check.replace(/:(mc|w)$/, ""))?.family !== wrongFamily);
  // a general explanation of another kind is not offered while there is one of the kind the learner got wrong (all tried: a person)
  // (only among explanations this learner's current skill allows: one scoped to another skill does not hide a general one)
  const skill = currentSkill(m, records);
  const allowed = m.strategies.filter((x) => scopeAllows(m, x, records, skill));
  // grade-order@1: an explanation whose own check is above the learner's grade (a later grade's kind of question) is not offered
  // while one within the grade is; with none within the grade, nothing is removed
  const onTopic = (s: Strategy) => !wrongFamily || isMisconceptionSpecific(s) || !relevant(s) || !allowed.some((x) => !isMisconceptionSpecific(x) && !relevant(x));
  const usable = allowed.filter((s) => teachable(m, s, misconceptionEvidence) && onTopic(s));
  const inGrade = usable.filter((s) => withinGrade(records, s.check));
  return (inGrade.length ? inGrade : usable).sort((a, b) => specific(a) - specific(b) || relevant(a) - relevant(b) || Number(a.kind !== kind) - Number(b.kind !== kind) || needState(a) - needState(b) || m.strategies.indexOf(a) - m.strategies.indexOf(b));
}
/** teaching gate (adaptive-loop repair): an explanation whose sections fail the teaching contract is never chosen as an
 *  intervention. One that was not machine-checked (hand-written modules) may be used, and says so; none is "verified". */
export const failsChecks = (m: Module, s: Strategy) => { const e = teachingEligibility(m, s); return s.scope !== undefined ? !e.eligible : e.checked && !e.eligible; };
export const teachingStatus = (m: Module, s: Strategy): TeachingEligibility["review"] => teachingEligibility(m, s).review;
/** content-safety gate (explanation-review@1, misconception-evidence@1): an explanation is used as an intervention only
 *  when it also passes the content review for the current teaching mode, is for this skill, and, when it is about a
 *  particular misconception, that misconception is established for this learner. A refusal is never replaced by other
 *  content: the engine chooses another eligible explanation or pauses. */
type Evidence = boolean | readonly string[];
/** The misconceptions established for this learner in this skill (learner-hypothesis@1), by diagnosis id. */
export const establishedIds = (competency: string, records: LearnerRecords) => hypothesesFor(competency, records).filter((h) => h.status === "established").map((h) => h.claim?.explanation).filter((x): x is string => !!x);
export const contentReviewOf = (m: Module, s: Strategy, misconceptionEvidence: Evidence): ContentEligibility => contentEligibility(m, s, { competency: m.competency, misconceptionEvidence, usage: "intervention" });
export const teachable = (m: Module, s: Strategy, misconceptionEvidence: Evidence) => !failsChecks(m, s) && contentReviewOf(m, s, misconceptionEvidence).eligible;
const NO_EXPLANATION = () => teachingMode() === "supervised-evaluation"
  ? "OpenPath has no educator-approved explanation for this yet, so it will not teach this one for now. Carry on, and go through it with a teacher or parent."
  : "OpenPath has no checked explanation for this yet, so it will not teach this one for now. Carry on, and go through it with a teacher or parent.";
/** The next probe to ask before choosing: the first unknown need of the best strategy that could still be chosen. */
export function nextProbe(m: Module, d: Diagnosis, records: LearnerRecords): string | null {
  for (const s of orderStrategies(m, d, records)) {
    const res = s.needs.map((id) => ({ id, a: answered(records, id) }));
    if (res.some((x) => x.a && !rightAnswer(x.a))) continue;
    const unknown = res.find((x) => !x.a);
    if (unknown) return unknown.id;
    return null; // this strategy's needs are all shown: choose it
  }
  return null;
}

function ruleStateFor(m: Module, d: Diagnosis, records: LearnerRecords): RuleState {
  const mine = records.attempts.filter(of(m));
  const taught = records.teaching.filter((t) => t.competency === m.competency);
  const ivs: InterventionSummary[] = taught.map((t, i) => {
    const st = m.strategies.find((s) => s.id === t.strategy)!;
    const until = taught[i + 1]?.at ?? "9999";
    const within = (id: string) => mine.find((a) => a.questionId === id && a.at >= t.at && a.at < until) ?? null;
    // guided-fresh@1: the block's guided practice is its own guided question, or the fresh one asked in its place
    const g = within(st.guided) ?? mine.find((a) => a.at >= t.at && a.at < until && a.activity === "guided") ?? null;
    // teaching-history@1: the block's check alone is its own check question, or (when that question had already been
    // seen elsewhere) the fresh question asked in its place: the first answer alone labelled "check" in the block
    const c = within(st.check) ?? mine.find((a) => a.at >= t.at && a.at < until && a.activity === "check" && a.n === 1 && a.questionId !== st.guided && !a.context) ?? null;
    const clean = c && independentAttempt(c) && qualifiedFollowup(c, records) ? c : null;
    return {
      id: `${m.competency}:${t.strategy}:${t.at}`,
      at: t.at,
      strategy: t.strategy,
      content: m.competency,
      during: { right: g && rightAnswer(g) ? 1 : 0, total: g ? 1 : 0, hints: g?.hints ?? 0, items: 1, rightFirstTry: g && rightAnswer(g) && !g.hints ? 1 : 0, rightWithHelp: g && rightAnswer(g) && g.hints ? 1 : 0 },
      independentAfter: { right: clean && rightAnswer(clean) ? 1 : 0, total: clean ? 1 : 0, newWordRight: clean && rightAnswer(clean) ? 1 : 0, newWordTotal: clean ? 1 : 0, contrastRight: 0, contrastTotal: 0, lastAt: clean?.at ?? null },
    };
  });
  const passedAt = ivs.filter((b) => b.independentAfter.newWordRight).at(-1)?.independentAfter.lastAt ?? "";
  const blockItems = new Set(m.strategies.flatMap((s) => [s.guided, s.check]));
  const obs = mine.filter((a) => independentAttempt(a) && !blockItems.has(a.questionId));
  const errors = obs.filter((a) => !rightAnswer(a) && a.at > passedAt);
  // a confident, non-secure diagnosis is treated like an active misconception: teach now (one wrong answer alone is not)
  const active = d.result && d.result !== "secure" && d.result !== "insufficient_evidence" && !passedAt;
  const misconceptions: MisconceptionRecord[] = active ? [{ rule: m.competency, tag: d.result!, state: "active", errors: d.asked.filter((x) => !x.right).map((x) => x.questionId), practiceErrors: [], recurrences: 0, sinceLastError: { correctNewWords: 0, sessions: 0, contrastsCorrect: 0 }, history: [] }] : [];
  const right = obs.filter(rightAnswer).length;
  return {
    rule: m.competency, capability: graph.evidenceTarget(m.competency), name: m.title, requiredFromBand: 1,
    status: errors.length >= 2 ? "weak" : errors.length === 1 ? "emerging" : "insufficient_evidence",
    reasons: [], current: rateOf(right, obs.length), allTime: rateOf(right, obs.length), contrast: { right: 0, total: 0, lastCorrect: null }, practice: { right: 0, total: 0 },
    assisted: { right: 0, total: 0, hints: 0 }, unknown: { right: 0, total: 0 }, succeedsWithHelp: false, interventions: ivs,
    lastEvidenceAt: mine.at(-1)?.at ?? null, evidenceBasis: { validated: 0, candidate: 0, provisional: obs.length }, repeats: 0, slips: 0, inconsistent: false, transferGap: false,
    retention: { state: "not_checked", checks: [] }, history: { firstEmergingAt: null, firstDemonstratedAt: null, firstVerifiedAt: null, lastVerifiedAt: null, statusChanges: [] }, misconceptions,
  };
}

export type ModulePhase = "recover" | "explore" | "strategy" | "chapter" | "guided" | "check" | "verify" | "retention" | "done" | "pause" | "unavailable" | "waiting" | "reentry";
export interface ModuleState {
  /** Present only for the explicitly selected foundation policy. */
  requirementsMet?: boolean;
  competency: string;
  phase: ModulePhase;
  question: string | null;
  strategy: Strategy | null;
  diagnosis: Diagnosis | null;
  decision: PlannerDecision | null;
  /** What the learner is told about this step. */
  reason: string;
  /** How the answer is recorded (from the list the question came from: a check alone is an assessment). */
  activity?: import("./records").LearningActivity;
  /** Recorded with the answer: investigate:<question> for an investigation question (investigation-trigger@1). */
  context?: string;
  /** Why this question is asked, when it is an investigation or a resolution probe (for reports; not learner-facing). */
  why?: string;
  /** phase "recover": the wrong answer whose investigation (diagnostic@2, the same as from Practice) runs first. */
  original?: string;
  /** phase "chapter": what the explanation's quality is known to be (machine check). */
  teachingReview?: TeachingEligibility["review"];
  /** phase "chapter": the content-safety decision for the explanation shown (explanation-review@1), with its label. */
  contentReview?: ContentEligibility;
  /** phase "chapter": what the learner's evidence shows (misconception-evidence@1). */
  basis?: EvidenceBasis;
  /** handover@1: phase "pause" or "reentry": when and how this competency opens again after a hand-over to a person */
  handover?: HandoverState;
  /** retention-display@1: the delayed check's exact opening instant when it is scheduled (shown with date, time and time zone) */
  retentionOpensAt?: string;
}

// ---------------------------------------------------------------- handover@1 (Workstream H1): a bounded way back after a pause
/**
 * A pause (pause@1: "go through it with a teacher or parent") is derived from the records, so it used to last until the records changed —
 * and a paused module asks nothing, so they never did (S2: 191/300 journeys stalled). handover@1 gives every pause an explicit, bounded way
 * back, decided from the records alone (deterministic, replayable, nothing new is written by the engine):
 *   since      the pause began at the learner's last record for this competency (attempt or teaching); nothing changes while paused
 *   reentry    one fresh question ALONE (activity "diagnostic", context "reentry:<competency>"), graded by the trusted grader like any
 *              other answer: no credit, mastery or status is given by re-entry itself, and nothing earlier is erased
 *   opens      (a) an educator's acknowledgement recorded by the server after the pause began (records.acknowledgements; never a learner
 *              record), or (b) self-service: REENTRY_DAYS after the pause began, at most SELF_REENTRY_LIMIT times per competency
 *   bounded    each re-entry answer either moves the module on (the ordinary rules decide) or starts a new pause; after the self-service
 *              re-entries are used, only an educator acknowledgement opens one more ("needs-teacher"): no infinite loop
 *   elsewhere  the competencies the learner can carry on with meanwhile (graph neighbours with a module), for the planner and the message
 */
export const HANDOVER_POLICY = "handover@1" as const;
export const REENTRY_DAYS = 2;
export const SELF_REENTRY_LIMIT = 2;
/** the configured policy (one switch, kept on globalThis like the teaching mode; recorded in every HandoverState for replay) */
const HG = globalThis as { __openpathHandoverPolicy?: { reentryDays: number; selfLimit: number } };
export const handoverPolicy = () => HG.__openpathHandoverPolicy ?? { reentryDays: REENTRY_DAYS, selfLimit: SELF_REENTRY_LIMIT };
/** set the re-entry interval (days, > 0) and the self-service limit (>= 0); returns the previous policy */
export function setHandoverPolicy(p: { reentryDays: number; selfLimit: number }) {
  const prev = handoverPolicy();
  if (!(p.reentryDays > 0) || !Number.isInteger(p.selfLimit) || p.selfLimit < 0) throw new Error("handover@1: reentryDays > 0 and an integer selfLimit >= 0");
  HG.__openpathHandoverPolicy = { reentryDays: p.reentryDays, selfLimit: p.selfLimit };
  return prev;
}
export interface HandoverState {
  policy: typeof HANDOVER_POLICY;
  /** the interval and limit this state was computed with */
  config: { reentryDays: number; selfLimit: number };
  since: string | null;
  /** re-entry questions answered so far for this competency, and how each was opened */
  reentries: { at: string; openedBy: "self" | "educator" }[];
  selfReentriesLeft: number;
  /** when self-service re-entry opens (exact instant; shown with date, time and time zone) */
  eligibleAt: string | null;
  /** an educator acknowledgement recorded after the pause began and not yet used by a re-entry */
  acknowledgement: { id: string; at: string } | null;
  route: "wait" | "reentry-self" | "reentry-acknowledged" | "needs-teacher" | "no-fresh-question";
  continueWith: string[];
}
export const reentryContext = (competency: string) => `reentry:${competency}`;
let leadsToMemo: Map<string, string[]> | null = null;
const leadsTo = () => { if (!leadsToMemo) { leadsToMemo = new Map(); for (const c of graph.competencies) for (const s of graph.supportsOf(c.id)) leadsToMemo.set(s, [...(leadsToMemo.get(s) ?? []), c.id]); } return leadsToMemo; };
const own = (competency: string) => (x: { competency: string }) => x.competency === competency || graph.evidenceTarget(x.competency) === competency;
export const ACK_VALID_DAYS = 14;
/** whether the competency was paused (or waiting for re-entry) at instant `at`, from the records before it only (no acknowledgements) */
function pausedAt(competency: string, records: LearnerRecords, at: number): boolean {
  const before = <T extends { at: string }>(xs: T[]) => xs.filter((x) => Date.parse(x.at) < at);
  const r: LearnerRecords = { ...records, attempts: before(records.attempts), teaching: before(records.teaching), unresolved: before(records.unresolved), pending: before(records.pending), skips: before(records.skips), acknowledgements: [] };
  const ev = evidenceFor("handover-replay", r, at);
  const ms = moduleState(competency, r, ev.get(competency), at, "", null, ev.get);
  return ms.phase === "pause" || ms.phase === "reentry";
}
export function handoverState(competency: string, records: LearnerRecords, now: number, o: { reentryDays?: number; selfLimit?: number } = {}): HandoverState {
  const days = o.reentryDays ?? handoverPolicy().reentryDays, limit = o.selfLimit ?? handoverPolicy().selfLimit;
  const t = (x: { at: string }) => Date.parse(x.at);
  const ctx = reentryContext(competency);
  const inComp = (qid: string) => { try { return own(competency)({ competency: question(qid).competency }); } catch { return false; } };
  const mine = [...records.attempts.filter(own(competency)), ...records.unresolved.filter((u) => inComp(u.questionId)), ...records.teaching.filter(own(competency))];
  const sinceMs = mine.length ? Math.max(...mine.map(t)) : null;
  // an acknowledgement counts only if the competency WAS paused when the server recorded it (replayed from the records before it: an
  // acknowledgement from before a pause, or for a pause long resolved, opens nothing), and for ACK_VALID_DAYS after it.
  // A server-linked recovery resolution already certifies the research stop, which ordinary module replay cannot see.
  const acks = (records.acknowledgements ?? []).filter((a) => a.competency === competency && a.by === "educator" && t(a) <= now && (!!a.recoveryEpisode || pausedAt(competency, records, t(a))));
  // re-entry uses: every answer to a re-entry question, readable (an attempt) or not (an unresolved submission): both use the re-entry
  const uses = [...records.attempts.filter((x) => x.context === ctx), ...records.unresolved.filter((u) => u.context === ctx)].sort((x, y) => t(x) - t(y) || (x.id < y.id ? -1 : 1));
  // each use was opened by an acknowledgement only if one was in effect then: recorded after the previous use (or ever, for the first),
  // before this use, within its validity, and not used already; otherwise it used a self-service re-entry
  const used = new Set<string>(); const reentries: HandoverState["reentries"] = [];
  let prev = -Infinity;
  for (const u of uses) {
    const ack = acks.find((k) => !used.has(k.id) && t(k) > prev && t(k) < t(u) && t(u) - t(k) <= ACK_VALID_DAYS * DAY);
    if (ack) used.add(ack.id);
    reentries.push({ at: u.at, openedBy: ack ? "educator" : "self" });
    prev = t(u);
  }
  const selfLeft = Math.max(0, limit - reentries.filter((r) => r.openedBy === "self").length);
  // an acknowledgement opens the module now if recorded after the last re-entry use, not used, and still valid; later answers elsewhere in
  // the competency do not cancel it
  const open = acks.find((k) => !used.has(k.id) && t(k) > prev && now - t(k) <= ACK_VALID_DAYS * DAY) ?? null;
  const eligibleMs = sinceMs === null ? null : sinceMs + days * DAY;
  const route: HandoverState["route"] = open ? "reentry-acknowledged" : selfLeft <= 0 ? "needs-teacher" : eligibleMs !== null && now >= eligibleMs ? "reentry-self" : "wait";
  // what the learner can carry on with meanwhile: the skills this one builds on (direct supports) and the ones it leads to (direct)
  const near = [...(graph.byId.get(competency) ? graph.supportsOf(competency) : []), ...leadsTo().get(competency) ?? []];
  const continueWith = [...new Set(near)].filter((c) => c !== competency && !!moduleFor(c)).sort();
  return { policy: HANDOVER_POLICY, config: { reentryDays: days, selfLimit: limit }, since: sinceMs === null ? null : new Date(sinceMs).toISOString(), reentries, selfReentriesLeft: selfLeft, eligibleAt: eligibleMs === null ? null : new Date(eligibleMs).toISOString(), acknowledgement: open ? { id: open.id, at: open.at } : null, route, continueWith };
}
/** a fresh check question from the pool that was never answered, readable or not (fromPool already skips answered ones) */
function freshFromPool(m: Module, records: LearnerRecords, tried: (id: string) => boolean): string | null {
  const q = fromPool(m, "check", records);
  if (!q || !tried(q)) return q;
  const seen = new Set([...records.attempts.map((a) => exposureKey(a.questionId)), ...records.unresolved.map((u) => exposureKey(u.questionId))]);
  return phasePool(familyOfPool(q), "check").find((id) => !seen.has(exposureKey(id)) && withinGrade(records, id)) ?? null;
}
const moduleHasFamily = (m: Module, fam: string) => [...m.diagnostics, ...m.practice, ...m.transfer, ...m.retention, ...m.strategies.flatMap((x) => [x.guided, x.check])].some((id) => problemOf(id.replace(/:(mc|w)$/, ""))?.family === fam);
const familyOfPool = (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))!.family;
function withHandover(ms: ModuleState, m: Module, records: LearnerRecords, now: number): ModuleState {
  const h = handoverState(ms.competency, records, now);
  if (h.route === "reentry-self" || h.route === "reentry-acknowledged") {
    // a fresh question alone, never one seen before: the module's own diagnostic questions not yet answered, else a fresh check question
    const tried = (id: string) => !!answered(records, id) || records.unresolved.some((u) => exposureKey(u.questionId) === exposureKey(id));
    // the recheck is of the kind that went wrong: the family of the learner's latest wrong answer alone in this competency, when the
    // module has fresh questions of it; else the module's own unanswered diagnostic questions, else a fresh check question
    const lastWrong = records.attempts.filter((a) => own(ms.competency)(a) && independentAttempt(a) && !rightAnswer(a)).sort((x, y) => Date.parse(y.at) - Date.parse(x.at))[0];
    const fam = lastWrong ? problemOf(lastWrong.questionId.replace(/:(mc|w)$/, ""))?.family : undefined;
    // same-skill@1 (#112): where the competency has a skill mapping, the recheck is of the latest wrong answer's own skill, not another skill
    // of the same family (10 × □ wrong was rechecked on 18 − □), and never a problem already met in another form (problemKeyOf)
    const config = connectionConfig(ms.competency);
    const skill = config && lastWrong ? connectedSkill(config, lastWrong.questionId) : null;
    const met = presentedProblems(records, moduleFor);
    const ofSkill = fam && skill ? phasePool(fam, "check").find((id) => !tried(id) && !met.has(problemKeyOf(id)) && withinGrade(records, id) && keyboardOffered(id) && connectedSkill(config!, id) === skill && moduleHasFamily(m, fam)) ?? null : null;
    const strictFresh = !!records.acknowledgements?.some(a => a.id === h.acknowledgement?.id && a.recoveryEpisode);
    const ofKind = ofSkill ?? (fam ? phasePool(fam, "check").find((id) => !tried(id) && (!strictFresh || !met.has(problemKeyOf(id))) && withinGrade(records, id) && moduleHasFamily(m, fam)) ?? null : null);
    const candidate = ofKind ?? m.diagnostics.find((id) => !tried(id) && (!strictFresh || !met.has(problemKeyOf(id))) && withinGrade(records, id)) ?? freshFromPool(m, records, tried);
    const q = strictFresh && candidate && met.has(problemKeyOf(candidate)) ? questionForRequirement(m, "check", records, id => !met.has(problemKeyOf(id)) && keyboardOffered(id) && withinGrade(records, id)) : candidate;
    if (q) return { ...ms, phase: "reentry", question: q, activity: "diagnostic", context: reentryContext(ms.competency), handover: h,
      reason: h.route === "reentry-acknowledged"
        ? "Your teacher has looked at this with you. One question on your own now, to see where you are. Your earlier answers stay in your record."
        : "Welcome back. One question on your own first, to see where you are now. Your earlier answers stay in your record, and this one counts only as what it is." };
    return { ...ms, handover: { ...h, route: "no-fresh-question" }, reason: `${ms.reason} There is no fresh question left here to try this again on your own, so it cannot reopen here, even after a teacher has helped: go through it with a teacher, and carry on with other skills.` };
  }
  const tail = h.route === "needs-teacher"
    ? " You have tried it again on your own already. It opens again once a teacher has gone through it with you; other skills carry on meanwhile."
    : " It opens again for a fresh question on your own after a short break (the time is shown with this skill); other skills carry on meanwhile.";
  return { ...ms, handover: h, reason: ms.reason + tail };
}

/** What an earlier diagnosis (diagnostic@2, in recovery) established about this skill, so it is not asked again. */
export interface Established {
  kind: "conceptual" | "procedural" | "recall" | "prerequisite";
  says: string;
  /** The diagnosis id (misconception-evidence@1: a misconception-specific explanation must be about this one). */
  id?: string;
}
/** bounded-input@1 (Milestone 2): an answer that cannot be read is never marked and never an attempt (approved policy P1), so on its own it never
 *  moves the module on. After UNREADABLE_LIMIT unreadable answers to the question the module would ask next, the module does not ask it again:
 *  it stops for a person (pause@1). No credit either way, no misconception, no mastery; it lifts only when the records change what is asked. */
export const UNREADABLE_LIMIT = 2;
/** bounded-retry@1 (Milestone 2): a wrong answer may be retried on the same question at most RETRY_LIMIT times (the first retry plain, the
 *  next with a hint, in the app); then the learner moves to another question. A retry is never independent evidence (attempt n > 1). */
export const RETRY_LIMIT = 2;
export const retriesLeft = (records: LearnerRecords, qid: string) =>
  Math.max(0, 1 + RETRY_LIMIT - records.attempts.filter((a) => exposureKey(a.questionId) === exposureKey(qid)).length);
export const unreadableCount = (records: LearnerRecords, qid: string) => records.unresolved.filter((u) => exposureKey(u.questionId) === exposureKey(qid)).length;
export function moduleState(competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null, evidence?: (id: string) => SkillEvidence): ModuleState {
  const ms0 = withSchedule(moduleStep(competency, records, ev, now, session, established, evidence), ev);
  const m = moduleFor(competency);
  // handover@1: every pause gets its bounded way back
  const ms = m && (ms0.phase === "pause" || ((records.acknowledgements ?? []).some(a => a.competency === competency && a.recoveryEpisode) && handoverState(competency, records, now).route === "reentry-acknowledged")) ? withHandover(ms0, m, records, now) : ms0;
  if (!m || !ms.question || ms.phase === "reentry") return ms;
  const q = ms.question;
  const unread = unreadableCount(records, q);
  if (unread >= UNREADABLE_LIMIT)
    return withHandover({ ...ms, phase: "pause", question: null, why: `bounded-input@1: ${unread} unreadable answers to ${q}`,
      reason: "Your answers to this question could not be read, so they were not marked: nothing was counted for or against you. This needs a person: go through it with a teacher or parent." }, m, records, now);
  const fromCheckPool = !!m.pool && q.startsWith("gen:") && ![...m.practice, ...m.transfer].includes(q) && phaseOfQ(q) === "check";
  const activity = ms.phase === "explore" ? "diagnostic" : ms.phase === "strategy" ? "probe" : ms.phase === "guided" ? "guided" : ms.phase === "check" ? "check" : ms.phase === "retention" ? "retention" : m.transfer.includes(q) ? "transfer" : m.strategies.some((s) => s.check === q) || fromCheckPool ? "check" : "practice";
  const latest = records.teaching.filter(t=>t.competency===competency).at(-1);
  const taught = latest && m.strategies.find(s=>s.id===latest.strategy);
  if (taught && alignmentActive(m,taught,records) && !["diagnostic","probe"].includes(activity) && !followupCompatible(m,taught,q,records)) {
    const replacement=blockCheck(m,taught,records);
    if(replacement)return {...ms,phase:"check",activity:"check",question:replacement,strategy:taught,reason:"One fresh question using the method explained. Other methods still need their own teaching or established evidence."};
    return withHandover({...ms,phase:"pause",question:null,reason:"No fresh question is supported by this explanation and your established methods. This teaching gap is not mastery; ask a teacher for the missing method."},m,records,now);
  }
  return { ...ms, activity };
}
/** retention-display@1: a scheduled delayed check carries its exact opening instant (the same instant the evidence uses to open it) */
const withSchedule = (ms: ModuleState, ev: SkillEvidence): ModuleState => (ev.retention === "scheduled" && ev.retentionDueAt ? { ...ms, retentionOpensAt: ev.retentionDueAt } : ms);
function moduleStep(competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null, evidence?: (id: string) => SkillEvidence): ModuleState {
  const m = moduleFor(competency);
  const base = { competency, question: null, strategy: null, diagnosis: null, decision: null } as const;
  if (!m) return { ...base, phase: "unavailable", reason: "No questions for this skill yet." };
  // written@1: a written answer is with an educator; nothing here moves on until it is marked (other skills can)
  // an educator-marked module waits for its mark; a module answered automatically carries on (written@2)
  // (#112 evidence-1) a delayed check that is due is not held back by a written answer waiting for its mark: it is auto-marked
  if (!m?.pool && ev.retention !== "due" && records.pending?.some((p) => graph.evidenceTarget(p.competency) === competency)) return { ...base, phase: "waiting", reason: "Your written answer is with an educator. You will see the mark and their feedback under “Written work”; carry on with other skills meanwhile." };
  // a misunderstanding already established elsewhere (diagnostic@2, on a problem the learner was stuck on) replaces the
  // exploratory questions here: it is not asked again; strategy probes and teaching follow as usual
  const asked = learnerDiagnosis(m, records);
  // findings@1: a misunderstanding diagnostic@2 established on this module's own questions (from the learner's records:
  // the first answer and the investigation answers) is taught here until a fresh answer alone after teaching is right.
  // It needs two matching answers (reason()); one slip, or an uncertain investigation, establishes nothing. It replaces
  // an inconclusive own diagnosis only, and it does not change the evidence or the status: it decides what to teach.
  // learner-hypothesis@1 (hypotheses.ts): the same hypotheses every entry path reads; one seen in this skill keeps its
  // kind, one about this skill (seen in a skill that builds on it) is mapped as an established finding passed in is
  const own = established ? null : openHypothesis(competency, records);
  const open = !!own;
  const inconclusive = !asked.result || asked.result === "insufficient_evidence" || asked.result === "secure";
  const asEstablished = (k: Established["kind"]): Diagnosis["result"] => (k === "conceptual" ? "conceptual" : k === "procedural" ? "procedural" : "recall");
  const d: Diagnosis = established && !asked.result ? { ...asked, next: null, result: asEstablished(established.kind), confidence: asked.confidence }
    : open && inconclusive ? { ...asked, next: null, result: own!.scope.observedIn === competency ? own!.claim!.kind : asEstablished(own!.claim!.kind), confidence: asked.confidence }
    : asked;
  // resolution-probe@1: once taught (and not shown again since), an open hypothesis seen in this skill is resolved only
  // by a question that discriminates it; when none is left, it stays open and the module carries on as usual
  const here = !!own && own.scope.observedIn === competency;
  // claim-teaching@1: the open claim is named in a lesson's introduction only when that lesson addresses it
  const claimTaughtBy = (s: Strategy) => !!own?.claim && teachingMatchesMisconception(s, own.scope.question, own.claim.explanation, competency, own.scope.about);
  const resProbe = here && own!.probeDue ? discriminatingProbe(own!, records) : null;
  const hold = !!own && (own.teachingDue || !!resProbe);
  const shown = (ev.status === "independent" || ev.status === "transfer" || ev.status === "verified") && !hold;
  // grade8-fix-platform: a question the learner was taught (solved on a lesson they were shown) is served only as a last resort,
  // when no fresh question of the list is left
  const taught = taughtExposureKeys(records);
  const unanswered = (ids: string[]) => {
    const open = gradeFirst(records, ids.filter((id) => keyboardOffered(id) && !answered(records, id) && withinGrade(records, id)));
    return open.find((id) => !taught.has(exposureKey(id))) ?? open[0] ?? null;
  };
  // skill-units@1: skills taught here with a scoped explanation (exterior angle, vertically opposite angles, two dice, ...)
  const units = unitsOf(m, records);
  // no transfer question while a taught skill is not rechecked, or a skill's latest answer alone is wrong
  // transfer-hold@1 (#110): also while an open misunderstanding is still to be taught or resolved, or a mapped skill's latest answer
  // alone is wrong and not yet rechecked right (answers on the competency's other skills never clear it)
  const tr = units.some(blocksTransfer) || hold || weakSkill(m, records) ? [] : m.transfer;
  if (ev.retention === "due") {
    // a skill taught here is part of the delayed check: one of its own delayed questions first (a pass on other skills is not
    // evidence that it lasted)
    const since = ev.retentionDueAt ?? "";
    for (const u of units.filter((x) => x.taughtAt)) {
      if (records.attempts.some((a) => a.activity === "retention" && a.at >= since && independentAttempt(a) && u.unit.accepts(a.questionId))) continue;
      const presented = presentedProblems(records, moduleFor);
      const fresh = (id: string) => u.unit.accepts(id) && keyboardOffered(id) && !presented.has(problemKeyOf(id));
      const q = unanswered(m.retention.filter(fresh)) ?? questionForRequirement(m, "retention", records, fresh);
      if (q) return { ...base, phase: "retention", question: q, diagnosis: d, reason: "A delayed check, a week after you first showed this: does it last?" };
    }
    // the delayed check: the module's own questions, then fresh ones from the pool's delayed-check part
    const r = unanswered(m.retention) ?? fromPool(m, "retention", records);
    if (r) return { ...base, phase: "retention", question: r, diagnosis: d, reason: "A delayed check, a week after you first showed this: does it last?" };
  }
  // skill-units@1 (#109): after a failed delayed check on a taught skill, recovery is on that skill: a fresh question on it alone
  // first. If that one is wrong too, relapse@1 (#110, below) gives the skill's general explanation once, then a fresh recheck.
  if (ev.retention === "failed") {
    const failedAt = ev.retentionHistory.at(-1)?.failedAt;
    const failed = failedAt ? records.attempts.find((a) => a.at === failedAt && a.activity === "retention") : undefined;
    const u = failed ? units.find((x) => x.taughtAt && x.unit.accepts(failed.questionId)) : undefined;
    if (u && !records.attempts.some((a) => a.at > failed!.at && a.activity !== "retention" && independentAttempt(a) && u.unit.accepts(a.questionId))) {
      const q = unitCheck(m, u.unit, records);
      if (q) return { ...base, phase: "verify", question: q, diagnosis: d, reason: "The delayed check on this skill did not come out. First, a fresh question on it on your own." };
      return { ...base, phase: "pause", diagnosis: d, reason: NO_UNIT_CHECK };
    }
  }
  // investigation-trigger@1: a significant or repeated error in practice or verification is investigated (bounded)
  const inv = pendingInvestigation(m, records, session);
  if (inv) return { ...base, phase: "explore", question: inv.question, diagnosis: d, context: investigateContext(inv.original), why: inv.why, reason: "One more question to understand your last answer." };
  // relapse@1: a delayed-check answer on a taught skill was wrong and nothing on that skill has been right alone since. One wrong
  // answer is not a misconception: the skill's GENERAL explanation (no misconception claimed) is given once, then a fresh question
  // of that skill alone; with none left, or still wrong after it, the module pauses here and the learner carries on elsewhere
  // (a learning-goal pathway has its own scoped recovery for this, foundation-runtime / withFoundation: it is left to it)
  const lapse = records.pathway?.active && records.readinessRoute?.includes(competency) ? null : relapse(m, records);
  if (lapse) {
    // a general explanation of the skill not given before comes first (a different way in), then one already given
    const before = (x: Strategy) => records.teaching.some((t) => t.competency === competency && t.strategy === x.id && t.at <= lapse.at);
    const lapseQ = problemOf((records.attempts.find((a) => a.at === lapse.at && a.activity === "retention")?.questionId ?? "").replace(/:(mc|w)$/, ""));
    const covers = (x: Strategy) => x.scope?.subSkill === lapse.skill || (!x.scope?.subSkill && !!x.scope && !!lapseQ && unitOfStrategy(m, x)?.accepts(lapseQ.id) === true);
    const general = m.strategies.filter((x) => covers(x) && !isMisconceptionSpecific(x) && teachable(m, x, [])).sort((a, b) => Number(before(a)) - Number(before(b)));
    const given = records.teaching.filter((t) => t.competency === competency && t.at > lapse.at && general.some((x) => x.id === t.strategy)).at(-1);
    if (!given) {
      const st = general[0];
      if (st) return { ...base, phase: "chapter", strategy: st, teachingReview: teachingStatus(m, st), contentReview: contentReviewOf(m, st, []), basis: evidenceBasis(competency, records, { evidence: ev, diagnosis: d }), diagnosis: d, reason: "The delayed check on this kind of question went wrong, so here is the method again, then one on your own." };
    } else {
      const st = general.find((x) => x.id === given.strategy)!;
      const after = records.attempts.some((a) => a.at > given.at && independentAttempt(a) && connectedSkill(connectionConfig(competency)!, a.questionId) === lapse.skill);
      const q = after ? null : blockCheck(m, st, records);
      if (q) return { ...base, phase: "check", question: q, strategy: st, diagnosis: d, reason: "Now one of this kind on your own, with no hints." };
      return { ...base, phase: "pause", diagnosis: d, why: after ? `relapse@1: ${lapse.skill} still wrong after its explanation` : `relapse@1: no fresh ${lapse.skill} question left`, reason: after ? "This kind of question has not clicked yet, even after the explanation. Carry on with other skills, and go through it with a teacher or parent." : "There is no new question of this kind left to check on your own yet. Carry on with other skills meanwhile." };
    }
  }
  // the misunderstanding showed again after this skill's teaching: a different explanation (all tried: a person)
  // claim-teaching@1: "showed again after teaching" means after teaching that ADDRESSED this misunderstanding (the
  // hypothesis's own relevant-teaching record), not after any lesson in the skill: a lesson for another form of the skill
  // (e.g. "The box was multiplied" while the open claim is added-both on n − □) leaves the claim untaught, not exhausted
  if (here && own!.teachingDue && own!.teaching.lastAt) {
    const delivered = (x: Strategy) => records.teaching.some((t) => t.competency === competency && t.strategy === x.id);
    const s = orderStrategies(m, d, records, [own!.claim!.explanation]).find((x) => !delivered(x));
    if (!s) return { ...base, phase: "pause", diagnosis: d, reason: "Every explanation here has been tried. Carry on, and go through this with a teacher or parent; it will come back." };
    return { ...base, phase: "chapter", strategy: s, teachingReview: teachingStatus(m, s), contentReview: contentReviewOf(m, s, [own!.claim!.explanation]), basis: evidenceBasis(competency, records, { evidence: ev, diagnosis: d }), diagnosis: d, reason: `${claimWording(own!.scope.question, own!.claim!.explanation, own!.claim!.says)} It showed again after the last explanation, so here is a different one.` };
  }
  // explore-once@1: an exploratory question already answered (in either format) is never served again. The diagnosis counts
  // only independent answers, so one answered with help (e.g. after reviewing this lesson in the same session) stays
  // "unasked" there; asking it again would repeat it for ever. The next unanswered one is asked instead, or none.
  const exploreNext = d.next && !answered(records, d.next) ? d.next : d.next ? gradeFirst(records, m.diagnostics).find((id) => !answered(records, id) && withinGrade(records, id)) ?? null : null;
  if (exploreNext && !shown) return { ...base, phase: "explore", question: exploreNext, diagnosis: d, reason: "A short check to find the right starting point." };
  // adaptive-loop repair: a gap the exploratory questions show is investigated exactly as from Practice (diagnostic@2 on the
  // wrong answer, then the supporting skill it points to), before this module's own explanations. Only with the learner's
  // whole evidence (not inside a recovery that is already running), and only for a wrong answer OpenPath can reason about.
  if (evidence && !established && !shown && d.result && d.result !== "secure" && d.result !== "insufficient_evidence") {
    const wrong = d.asked.filter((x) => !x.right).map((x) => x.questionId).find((id) => { const f = familyOf(id); return !!f && !!reason(f, [{ questionId: f, response: records.attempts.find((a) => a.questionId === id)!.response }])?.explanations.some((e) => e.id !== "secure" && e.id !== "unexplained"); });
    if (wrong) {
      const r = recovery(wrong, records, evidence, now, session);
      const again = records.attempts.filter((a) => a.questionId === wrong).length;
      // scoped-teaching-priority@1: when recovery would send the learner to a prerequisite module, but this module
      // has a scoped skill unit that covers the wrong answer (its own teaching for that question kind), prefer the
      // module's own teaching path. The prerequisite bugs are correct (a carrying error rests on place value), but the
      // module's carrying-specific explanations should be tried before routing away. §16.5
      const ownUnit = (r.phase === "support" || (r.phase === "teach" && r.active !== competency)) ? unitOfQuestion(m, wrong) : null;
      if (r.phase === "investigate" || ((r.phase === "support" || r.phase === "teach" || (r.phase === "return" && again < 2)) && !ownUnit))
        return { ...base, phase: "recover", original: wrong, diagnosis: d, reason: r.reason };
      if (r.phase === "escalate") return { ...base, phase: "pause", diagnosis: d, reason: r.reason };
      if (r.phase === "solved_after_help" || r.phase === "solved_on_retry") {
        // what was missing has been worked on: the skill itself is now checked on a new question alone, not taught again
        const more = unanswered([...m.practice, ...tr, ...m.strategies.map((s) => s.check)]) ?? fromPool(m, "check", records);
        if (more) return { ...base, phase: "verify", question: more, diagnosis: d, reason: "What was missing has been worked on. Now a new question on your own." };
      }
    }
  }
  // sub-skill difficulty (Workstream A3; misconception-evidence@1 "repeated-difficulty" within one kind of question): in a module whose
  // explanations are about different kinds of question, two or more answers alone wrong on one kind, none right alone since, is taught
  // with that kind's general explanation once (through the gate), then rechecked alone on a fresh question of that kind; still wrong
  // after it: a person. The learner's evidence is not changed (a competency is shown or not by the shared engine); only what is taught.
  // (#112 evidence-2) also when the status is held below "shown" only by that kind's own answers (evidence familyHeld)
  const gap = (shown || (!!ev.familyHeld && !hold)) && !established ? subSkillGap(m, records) : null;
  if (gap) {
    const basis0 = evidenceBasis(competency, records, { evidence: ev, diagnosis: d });
    const kindOf = (st: Strategy) => problemOf(st.check.replace(/:(mc|w)$/, ""))?.family;
    // same-skill@1 (#112): a family can hold several mapped skills (adfcmp: same bottom AND same top). The gap's lesson is for the skills its
    // wrong answers are on: a lesson scoped to another skill of the family is not offered (was: wrong on same-bottom comparisons, taught
    // "Same top number: more parts are smaller parts", because the latest wrong answer was an unmapped hand-written question)
    const gapConfig = connectionConfig(competency);
    const gapSkills = new Set(gapConfig ? records.attempts.filter((a) => of(m)(a) && independentAttempt(a) && !rightAnswer(a) && a.at >= gap.since && problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family === gap.family).map((a) => connectedSkill(gapConfig, a.questionId)).filter((x): x is string => !!x) : []);
    const forGap = m.strategies.filter((st) => !isMisconceptionSpecific(st) && kindOf(st) === gap.family && (!gapSkills.size || !st.scope?.subSkill || gapSkills.has(st.scope.subSkill)));
    const taught = records.teaching.filter((t) => t.competency === competency && t.at > gap.since && forGap.some((st) => st.id === t.strategy));
    if (!taught.length) {
      const st = forGap.find((x) => teachable(m, x, basis0.established) && scopeAllows(m, x, records));
      if (st) return { ...base, phase: "chapter", strategy: st, teachingReview: teachingStatus(m, st), contentReview: contentReviewOf(m, st, basis0.established), basis: basis0, diagnosis: d, reason: "Questions of this kind have gone wrong a few times on your own, so here is how to solve them, then one on your own." };
    } else {
      const st = forGap.find((x) => x.id === taught.at(-1)!.strategy)!;
      // the recheck is of the same kind: the explanation's own check if not yet seen, else a fresh check question of that kind
      const seen = new Set(records.attempts.map((x) => exposureKey(x.questionId)));
      // (and never close to the worked example just shown: not the same answer, not two of its numbers the same)
      const shownEx = st.screens.flatMap((sc) => (sc.instance ? [problemOf(sc.instance)] : [])).filter((p): p is NonNullable<typeof p> => !!p && p.family === gap.family);
      const close = (id: string) => { const p = problemOf(id.replace(/:(mc|w)$/, "")); return !p || shownEx.some((e) => e.answer === p.answer || e.params.filter((v, i) => v === p.params[i]).length >= 2); };
      // same-skill@1 + freshness@2: an explanation scoped to one skill of the family (two dice: "the total is exactly k") is rechecked
      // inside that scope, never on another skill of the same family ("k or more"), and never on a problem already met relabelled
      const unit = unitOfStrategy(m, st);
      const q = unit ? unitCheck(m, unit, records, st) : (keyboardOffered(st.check) && !answered(records, st.check) && withinGrade(records, st.check) ? st.check : null) ?? phasePool(gap.family, "check").find((id) => !seen.has(exposureKey(id)) && withinGrade(records, id) && !close(id)) ?? null;
      const sameKind = (id: string) => (unit ? unit.accepts(id) : kindOf(st) === problemOf(id.replace(/:(mc|w)$/, ""))?.family);
      if (q && !records.attempts.some((a) => a.at > taught.at(-1)!.at && sameKind(a.questionId) && independentAttempt(a))) return { ...base, phase: "check", question: q, strategy: st, diagnosis: d, reason: "Now one of this kind on your own, with no hints." };
      return { ...base, phase: "pause", diagnosis: d, reason: "This kind of question has not clicked yet, even after the explanation. Carry on, and go through it with a teacher or parent." };
    }
  }
  // same-skill@1: a skill just taught is rechecked on a fresh question of that skill before anything else counts it as shown
  const unchecked = shown ? units.find((x) => x.taughtAt && !x.rechecked) : undefined;
  if (unchecked) {
    const lastSt = m.strategies.find((x) => x.id === records.teaching.filter((t) => t.competency === competency && unchecked.unit.strategies.some((y) => y.id === t.strategy)).at(-1)?.strategy) ?? null;
    const q = unitCheck(m, unchecked.unit, records, lastSt);
    if (q) return { ...base, phase: "check", question: q, strategy: lastSt, diagnosis: d, reason: "Now one new question on your own on what was just taught, with no hints." };
    return { ...base, phase: "pause", diagnosis: d, reason: NO_UNIT_CHECK };
  }
  if (shown) {
    // more questions alone: practice, the transfer question, then the checks of strategies not taught (independent
    // assessments, so the shared engine has the direct evidence it needs to demonstrate the skill)
    // while the shared record has not yet demonstrated the skill, fresh checks alone from the pool (independent
    // assessments); once it has, only the module's own practice remains (optional)
    const needsEvidence = ev.engine !== "unavailable" && ev.engineRetention === "not_demonstrated";
    // the shared engine never lets answers given straight after teaching (same visit) demonstrate a skill: more
    // questions now would add nothing, so they wait for the next visit
    const taughtThisVisit = records.teaching.some((t) => t.competency === competency && t.session === session);
    // written@2: the part an educator marks comes after the questions marked here, never before the fresh checks the
    // shared record needs (a written answer not yet written must not hold up the evidence for the skill)
    const listed = unanswered([...m.practice, ...tr, ...m.strategies.map((s) => s.check)]);
    // grade-order@1: the skill's extra written tasks (a module answered automatically) are offered only up to the learner's grade: a
    // later grade's proof (the BPT by areas, for a Grade 8 learner) is reached in that grade. A module of written tasks alone is unchanged.
    const g = gradeOf(records);
    const written = unanswered((m.written ?? []).filter((id) => g === null || (writtenTask(id)?.grade ?? 0) <= g || records.readinessRoute?.includes(competency)));
    if (!listed && needsEvidence && taughtThisVisit && m.pool)
      return { ...base, phase: "done", question: null, diagnosis: d, reason: "Shown on your own, straight after the lesson. Come back on another day: a few fresh questions then show it is yours (answers right after teaching are progress, not yet evidence)." };
    const more = listed ?? (needsEvidence ? fromPool(m, "check", records) : null) ?? written;
    // shown here, but the shared record (the engine) has not yet demonstrated it and nothing is left: say so
    const engineShort = !more && needsEvidence;
    return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, reason: more && m.written?.includes(more) ? "Shown on your own. Now the part a computer cannot mark: write or draw it, and an educator will mark it (other skills carry on meanwhile)." : ev.status === "verified" ? "Verified: shown on your own, and again in a delayed check." : more ? "Shown on your own. More practice is optional." : engineShort ? "Shown on your own here. Your shared record needs more answers on your own before a delayed check can verify it, and this skill has no more questions yet." : ev.retentionDueAt && ev.retention === "scheduled" ? "Shown on your own. A delayed check is planned (its exact opening time is shown with this skill)." : "Shown on your own." };
  }
  if (d.result === "secure" || d.result === "insufficient_evidence") {
    // no clear gap: verify on fresh questions alone; a gap that shows there is then taught
    const rs = ruleStateFor(m, d, records);
    if (rs.status !== "weak") {
      const more = unanswered([...m.practice, ...tr, ...m.strategies.map((s) => s.check)]) ?? fromPool(m, "check", records);
      if (more) return { ...base, phase: "verify", question: more, diagnosis: d, reason: d.result === "secure" ? "You seem to know this. Now on your own, on a new question." : "Not enough to tell yet. One more question on your own." };
    }
  }
  const probe = nextProbe(m, d, records);
  if (probe && !records.teaching.some((t) => t.competency === competency)) return { ...base, phase: "strategy", question: probe, diagnosis: d, reason: "A quick question about what you already know, to choose the best way to explain." };
  const basis = evidenceBasis(competency, records, { evidence: ev, diagnosis: d, established });
  // a finding passed in by recovery (diagnostic@2) carries its diagnosis id; one without an id licenses any misconception-specific explanation
  const misEv: Evidence = established ? (established.id ? [established.id] : true) : basis.established;
  const order = orderStrategies(m, d, records, misEv);
  const rs = ruleStateFor(m, d, records);
  const sessionStart = records.sessions[session] ?? new Date(now).toISOString();
  const last = records.teaching.filter((t) => t.competency === competency).at(-1);
  const st = last && m.strategies.find((s) => s.id === last.strategy);
  const guided = st ? guidedItem(m, st, records) : null;
  const decision = planRule({
    rule: rs,
    strategies: order.map((s) => s.id),
    now: new Date(now).toISOString(),
    sessionStartedAt: sessionStart,
    session,
    available: { apply: m.strategies.filter((s) => teachable(m, s, misEv) && scopeAllows(m, s, records) && !answered(records, s.check)).length + (fromPool(m, "check", records) ? 1 : 0), contrast: 0, guided: guided ? 1 : 0 },
    answeredThisSession: records.attempts.filter((a) => of(m)(a) && a.at >= sessionStart && independentAttempt(a)).length,
    // guided-fresh@1: the block's guided practice is its own guided question or the fresh one asked in its place
    guidedThisBlock: st && records.attempts.some((a) => a.at >= last!.at && (a.questionId === st.guided || (a.activity === "guided" && of(m)(a)))) ? 1 : 0,
    policy: MODULE_POLICY,
  });
  const byId = (id?: string) => m.strategies.find((s) => s.id === id) ?? null;
  if (decision.action === "teach") {
    let s = byId(decision.strategy);
    // a strategy is taught once: availability is instruction DELIVERED (a teach record), not its questions having been
    // seen as practice; a strategy whose check was already answered is still taught, with a fresh check (blockCheck)
    const delivered = (x: Strategy) => records.teaching.some((t) => t.competency === competency && t.strategy === x.id);
    if (s && delivered(s)) s = order.find((x) => !delivered(x)) ?? null;
    if (!s) return { ...base, phase: "pause", diagnosis: d, decision, reason: order.length ? "Every explanation here has been tried. Carry on, and go through this with a teacher or parent; it will come back." : NO_EXPLANATION() };
    const before = records.teaching.some((t) => t.competency === competency);
    return { ...base, phase: "chapter", strategy: s, teachingReview: teachingStatus(m, s), contentReview: contentReviewOf(m, s, misEv), basis, diagnosis: d, decision, reason: before && ev.retention === "failed" ? "The delayed check did not come out, so here is the topic again, explained another way, then one on your own." : before ? "That way did not lead to a right answer on your own, so here is a different explanation." : established ? withTail(established.says, "Here is a way to rebuild it.") : open && claimTaughtBy(s) ? withTail(claimWording(own!.scope.question, own!.claim!.explanation, own!.claim!.says), "Here is a way to rebuild it.") : diagnosisReason(d, s) };
  }
  if (st && alignmentActive(m, st, records) && ["guided_practice", "reassess"].includes(decision.action) && !(decision.action === "guided_practice" ? guided : blockCheck(m, st, records))) return { ...base, phase: "pause", diagnosis: d, decision, reason: "There is no fresh question supported by this explanation and your established methods. This is a teaching gap, not mastery. Ask a teacher to help with the missing method." };
  if (decision.action === "guided_practice" && st && guided) return { ...base, phase: "guided", question: guided, strategy: st, diagnosis: d, decision, reason: "Practise it once, with a hint if you want one. This counts as practice with help." };
  if (decision.action === "reassess" && st) {
    const q = blockCheck(m, st, records);
    if (q) return { ...base, phase: "check", question: q, strategy: st, diagnosis: d, decision, reason: "Now one new question on your own, with no hints." };
    if (unitOfStrategy(m, st)) return { ...base, phase: "pause", diagnosis: d, decision, reason: NO_UNIT_CHECK };
    if (!keyboardOffered(st.check)) return { ...base, phase: "pause", diagnosis: d, decision, reason: "The check for this is a drawing, which cannot be handed in with keyboard input yet. Other topics are open; go through the drawing with a teacher or parent." };
    return { ...base, phase: "pause", diagnosis: d, decision, reason: "There is no new question left to check this on your own yet. Carry on, and go through it with a teacher or parent." };
  }
  if ((decision.action === "recommend_human" || decision.action === "content_gap") && !order.length) return { ...base, phase: "pause", diagnosis: d, decision, reason: NO_EXPLANATION() };
  if (decision.action === "content_gap") return { ...base, phase: "pause", diagnosis: d, decision, reason: "There is no new question left to check this on your own yet. Carry on, and go through it with a teacher or parent." };
  if (decision.action === "recommend_human") return { ...base, phase: "pause", diagnosis: d, decision, reason: "Different explanations have not clicked yet. That is not a failure: carry on, and ask a teacher or parent to go through it with you." };
  if (resProbe) return { ...base, phase: "verify", question: resProbe, diagnosis: d, decision, why: `resolution probe for ${own!.id}`, reason: "One question on your own that shows whether that misunderstanding has gone." };
  if (decision.action === "done") {
    // after-pass@1 (#112): the planner ends the visit once the block's check alone was right ("progress, not yet mastery"). When the
    // learner's answers alone on what was taught have gone wrong since that check, that message is not true and the learner was left
    // with no question and no help. One wrong since: one more fresh question of the taught kind alone. Two or more wrong since and none
    // right: a pause for a person (handover@1 gives the way back; policy C: one teaching cycle, not a loop).
    const passAt = rs.interventions.at(-1)?.independentAfter.lastAt ?? null;
    const unit = st ? unitOfStrategy(m, st) : null;
    // (coordinator) the learner's own practice and checks only: a recovery's investigation questions and original-problem retries
    // have their own bounded path (policy C: the problem is tried once more, then a person)
    const since = passAt ? records.attempts.filter((a) => of(m)(a) && independentAttempt(a) && ["practice", "check", "transfer", "retention"].includes(a.activity) && !String(a.context ?? "").startsWith("investigate:") && a.at > passAt && (!unit || unit.accepts(a.questionId))) : [];
    if (st && since.length && !rightAnswer(since.at(-1)!)) {
      const wrongSince = since.length - since.map(rightAnswer).lastIndexOf(true) - 1;
      if (wrongSince < 2) {
        const q = blockCheck(m, st, records);
        if (q) return { ...base, phase: "check", question: q, strategy: st, diagnosis: d, decision, reason: "Now one more of this kind on your own, with no hints." };
      }
      // (coordinator) no second teaching cycle here: policy C, one own-skill teaching cycle, then a person
      return { ...base, phase: "pause", diagnosis: d, decision, why: `after-pass@1: ${wrongSince} wrong alone since the check after ${st.id}`, reason: "Right once on your own after the explanation, but not since. That is not a failure: carry on with other skills, and go through this one with a teacher or parent." };
    }
    const more = unanswered([...m.practice, ...tr]);
    return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, decision, reason: "Right on your own after help: progress, not yet mastery. More practice on your own shows it is yours." };
  }
  // no-dead-end@1 (#112): the planner asks for more answers alone ("assess"), e.g. after a failed delayed check on a question no skill
  // mapping covers (fc-r1, "Which is larger: 2/5 or 4/5?"). The module's listed questions may all be answered: a fresh check from the
  // pool is asked then. With none left this is not "done" (was: phase "done", no question, "One more question on your own."): it pauses
  // honestly, and handover@1 gives the way back.
  const more = unanswered([...m.practice, ...tr, ...m.strategies.map((s) => s.check)]) ?? fromPool(m, "check", records);
  if (more) return { ...base, phase: "verify", question: more, diagnosis: d, decision, reason: "One more question on your own." };
  return { ...base, phase: "pause", diagnosis: d, decision, why: `no-dead-end@1: ${decision.action} with no fresh question`, reason: "There is no new question left to check this on your own yet. Carry on with other skills, and go through it with a teacher or parent." };
}

/**
 * investigation-trigger@1 in a module: the learner's latest answer alone (practice, transfer or a check) was wrong in a
 * way worth understanding (investigationTrigger: a modelled misunderstanding predicts it, or two of the last three were
 * wrong), it comes from a family diagnostic@2 can read, nothing open already explains errors here, and the reading
 * still needs a question nobody has asked. At most two investigations are begun per skill in a session.
 */
/** relapse@1: the latest delayed-check answer on a mapped skill was wrong, with no right answer alone on that skill since */
export function relapse(m: Module, records: LearnerRecords): { skill: string; at: string } | null {
  const config = connectionConfig(m.competency);
  if (!config) return null;
  const ret = records.attempts.filter((a) => of(m)(a) && a.activity === "retention" && !rightAnswer(a)).at(-1);
  const skill = ret ? connectedSkill(config, ret.questionId) : null;
  if (!ret || !skill) return null;
  const since = records.attempts.some((a) => a.at > ret.at && independentAttempt(a) && rightAnswer(a) && connectedSkill(config, a.questionId) === skill);
  return since ? null : { skill, at: ret.at };
}
/** transfer-hold@1: a mapped skill of this module whose latest independent answer (not a probe) is wrong: it has not been rechecked
 * right since. Without a skill mapping no skill is assumed (null). Answers of other skills never clear it. */
export function weakSkill(m: Module, records: LearnerRecords): string | null {
  const config = connectionConfig(m.competency);
  if (!config) return null;
  const last = new Map<string, Attempt>();
  for (const a of records.attempts) {
    if (!of(m)(a) || !independentAttempt(a) || a.activity === "probe") continue;
    const k = connectedSkill(config, a.questionId);
    if (k) last.set(k, a);
  }
  for (const [k, a] of last) if (!rightAnswer(a)) return k;
  return null;
}
function pendingInvestigation(m: Module, records: LearnerRecords, session: string): { question: string; original: string; why: string } | null {
  const alone = records.attempts.filter((a) => of(m)(a) && a.n === 1 && independentAttempt(a) && !a.context);
  const latest = alone.at(-1);
  const started = alone.filter((a) => records.attempts.some((x) => x.context === investigateContext(a.questionId)));
  const candidates = [...(latest && !rightAnswer(latest) && ["practice", "transfer", "check"].includes(latest.activity) ? [latest] : []), ...started.reverse()];
  if (!candidates.length) return null;
  if (hypothesesFor(m.competency, records).some((h) => h.status === "established" || h.status === "contested")) return null;
  const begun = new Set(records.attempts.filter((a) => a.session === session && a.context?.startsWith("investigate:") && of(m)({ questionId: a.context.slice("investigate:".length) } as Attempt)).map((a) => a.context));
  for (const c of candidates) {
    if (!familyOf(c.questionId)) continue;
    const ctx = investigateContext(c.questionId);
    const trig = investigationTrigger(c, records);
    if (!trig && !records.attempts.some((x) => x.context === ctx)) continue; // an isolated, unexplained slip
    if (!begun.has(ctx) && begun.size >= 2) continue;
    const { reasoning } = investigation(c.questionId, records);
    const next = reasoning?.status === "need_more" ? reasoning.next : null;
    if (!next || records.attempts.some((a) => exposureKey(a.questionId) === exposureKey(next))) continue;
    return { question: next, original: c.questionId, why: trig?.detail ?? "continuing an investigation" };
  }
  return null;
}

/** A kind of question (a family of a module whose explanations cover several kinds) with two or more answers alone wrong and none right alone
 *  since the first of them: { family, since } (Workstream A3). Null for a module whose explanations are all about one kind. */
export function subSkillGap(m: Module, records: LearnerRecords): { family: string; since: string } | null {
  const kinds = new Set(m.strategies.map((st) => problemOf(st.check.replace(/:(mc|w)$/, ""))?.family).filter(Boolean));
  if (kinds.size < 2) return null;
  const alone = records.attempts.filter((a) => of(m)(a) && independentAttempt(a));
  for (const f of kinds) {
    const mine = alone.filter((a) => problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family === f);
    const firstRightLast = mine.map((a) => rightAnswer(a)).lastIndexOf(true);
    const wrongSince = mine.slice(firstRightLast + 1);
    if (wrongSince.length >= 2) return { family: f!, since: wrongSince[0].at };
  }
  return null;
}
/**
 * guided-fresh@1 (#112): the guided practice question of a block. The strategy's own guided question when the learner has not met that
 * problem (in either format, or relabelled: problemKeyOf); else a fresh one of the same kind from the practice part of its family's pool:
 * inside the strategy's taught scope (skill-units@1) when it has one, else the same family and, where the competency has a skill mapping,
 * the same mapped skill. Never the strategy's own check or worked example. null when none is left (the block then goes straight to its
 * check, as before). Before this, a learner who had met the guided problem (e.g. 2x = 26 as the practice question that started the
 * recovery, then 2x = 26 "choose one" as the guided item) got no guided practice at all.
 */
export function guidedItem(m: Module, st: Strategy, records: LearnerRecords): string | null {
  const met = new Set([...records.attempts, ...records.unresolved, ...(records.pending ?? [])].map((a) => problemKeyOf(a.questionId)));
  if (followupCompatible(m, st, st.guided, records) && keyboardOffered(st.guided) && !answered(records, st.guided) && !met.has(problemKeyOf(st.guided))) return st.guided;
  const p = problemOf(st.guided.replace(/:(mc|w)$/, ""));
  if (!p) return null;
  const unit = unitOfStrategy(m, st);
  const config = connectionConfig(m.competency);
  const skill = config ? connectedSkill(config, st.guided) : null;
  const avoid = new Set([st.check, ...st.screens.map((x) => x.instance ?? ""), ...m.chapter.map((x) => x.instance ?? "")].filter(Boolean).map(problemKeyOf));
  const inScope = (id: string) => (unit ? unit.accepts(id) : !skill || connectedSkill(config!, id) === skill);
  const candidates = phasePool(p.family, "practice");
  const ordered = alignmentActive(m, st, records) ? alignedPractice({ ...m, strategies: [st] }, candidates) : candidates;
  return ordered.find((id) => !met.has(problemKeyOf(id)) && !avoid.has(problemKeyOf(id)) && !answered(records, id) && keyboardOffered(id)
    && withinGrade(records, id) && !quarantined(id) && question(id).competency === m.competency && inScope(id) && followupCompatible(m, st, id, records)) ?? null;
}
/** The question for a block's check alone: the strategy's own check if the learner has never seen it, else a fresh one. */
export const blockCheck = (m: Module, st: Strategy, records: LearnerRecords): string | null => {
  const unit = unitOfStrategy(m, st);
  if (alignmentActive(m, st, records) && !unit) return questionForRequirement(m, "check", records, id => followupCompatible(m, st, id, records));
  if (unit) return unitCheck(m, unit, records, st);
  return keyboardOffered(st.check) && !answered(records, st.check) && withinGrade(records, st.check) ? st.check : fromPool(m, "check", records);
};
/**
 * same-skill@1 + freshness@2: the check alone after a scoped explanation is a question inside the taught scope that is not the same
 * problem (relabelled or in another format) as anything shown or answered: the explanation's own check first, else a fresh one of the
 * scope from the module's check questions. null when none is left: the skill then waits for a person; it is never taken as shown.
 */
export function unitCheck(m: Module, unit: SkillUnit, records: LearnerRecords, st?: Strategy | null): string | null {
  const presented = presentedProblems(records, moduleFor);
  const fresh = (id: string) => (!st || followupCompatible(m, st, id, records)) && unit.accepts(id) && keyboardOffered(id) && !presented.has(problemKeyOf(id));
  // the recheck is where the error behind the teaching would still show (a discriminating question), when there is one: the
  // misconception a fix addresses, else the open (suspected) one in this competency; a question it cannot show on proves nothing
  // (#110 recheck@2) for general teaching with no established claim: an error the learner's latest wrong answer alone on this skill
  // matched (a suspicion: it chooses the question, it claims nothing)
  const target = st?.addresses ?? hypothesesFor(m.competency, records).filter((h) => h.status === "established" && h.claim).at(-1)?.claim?.explanation ?? null;
  const suspects = target ? [target] : suspectedErrors(records, unit.accepts);
  const shows = (id: string) => !suspects.length || suspects.some((b) => probeReading(id.replace(/:(mc|w)$/, ""), b).discriminates);
  if (st && fresh(st.check) && shows(st.check) && !answered(records, st.check) && withinGrade(records, st.check) && !quarantined(st.check)) return st.check;
  return questionForRequirement(m, "check", records, (id) => fresh(id) && shows(id)) ?? questionForRequirement(m, "check", records, fresh);
}
/** the modelled errors the learner's latest wrong answer alone (within `accepts`) matches (#110 recheck@2) */
export function suspectedErrors(records: LearnerRecords, accepts: (id: string) => boolean): string[] {
  const last = records.attempts.filter((a) => accepts(a.questionId) && !rightAnswer(a) && independentAttempt(a)).at(-1);
  const p = last && problemOf(last.questionId.replace(/:(mc|w)$/, ""));
  if (!last || !p) return [];
  const response = last.questionId.endsWith(":mc") ? null : last.response;
  return p.bugs.filter((b) => response !== null && probeReading(p.id, b.id).predicted.includes(response)).map((b) => b.id);
}
const unitsOf = (m: Module, records: LearnerRecords): UnitState[] => unitStates(m, records, { independent: independentAttempt, right: rightAnswer });
const NO_UNIT_CHECK = "There is no fresh question on this skill left to check it on your own, so it is not counted as shown. The other chapters stay open: carry on with them, and go through this one with a teacher or parent.";

/**
 * teaching-history@1: for each strategy, instruction DELIVERED (teach records) kept apart from its questions merely
 * ATTEMPTED (in any activity, e.g. as verification practice), and what the instruction achieved (the block's check
 * alone after it). Read-only; the module chooses strategies by delivery, never by exposure.
 */
export interface StrategyHistory {
  strategy: string;
  kind: Strategy["kind"];
  delivered: string[];
  guidedSeen: { at: string; activity: string } | null;
  checkSeen: { at: string; activity: string; inBlock: boolean } | null;
  effective: boolean | null;
}
export function teachingHistory(m: Module, records: LearnerRecords): StrategyHistory[] {
  const taught = records.teaching.filter((t) => t.competency === m.competency);
  const blocks = ruleStateFor(m, learnerDiagnosis(m, records), records).interventions;
  return m.strategies.map((s) => {
    const mine = taught.filter((t) => t.strategy === s.id);
    const g = answered(records, s.guided), c = answered(records, s.check);
    const blk = blocks.filter((b) => b.strategy === s.id);
    return {
      strategy: s.id, kind: s.kind, delivered: mine.map((t) => t.at),
      guidedSeen: g && g.at ? { at: g.at, activity: g.activity } : null,
      checkSeen: c && c.at ? { at: c.at, activity: c.activity, inBlock: mine.some((t) => c.at >= t.at) } : null,
      effective: blk.length ? blk.some((b) => b.independentAfter.right > 0) : null,
    };
  });
}

// (#112) a "prerequisite" diagnosis says the lesson goes to what the skill builds on: only when the chosen lesson does (kind "prerequisite");
// a lesson on the skill itself (10 × □ = 30: "The box was multiplied") gets the general line instead
const diagnosisReason = (d: Diagnosis, s?: Strategy) =>
  d.result === "prerequisite" && s && s.kind !== "prerequisite" ? "Here is a short explanation, then practice."
  // diagnosis-wording@1 (Diagnosis worker): the introduction says what comes next, never a kind of difficulty the answers have not
  // established; a lesson on the skill itself after a "prerequisite" reading is introduced plainly (Teaching worker's guard, above)
  : d.result === "conceptual" ? "We start with a picture of the idea, then practice."
  : d.result === "procedural" ? "Here is the method, one step at a time, then practice."
  : d.result === "recall" ? "Here is a way to rebuild a fact this uses from facts you know."
  : d.result === "prerequisite" ? "We check a skill this builds on first, then come back."
  : "Here is a short explanation, then practice.";

// ---------------------------------------------------------------- recovery from an original problem

export interface RecoveryState {
  /** handover@1: phase "escalate" because a supporting skill is paused: that skill's way back (shown with this recovery) */
  handover?: HandoverState;
  original: string;
  competency: string;
  phase: "attempt" | "investigate" | "trace" | "support" | "teach" | "return" | "solved" | "solved_on_retry" | "solved_after_help" | "escalate";
  /** Every relation recovery may follow (advisory). Only confirmed (mandatory) ones are explained to the learner. */
  supports: { id: string; depth: number; via: string | null; assessable: boolean; type: string }[];
  /** The supporting skill (or the problem's own skill, to teach) being worked on now. */
  active: string | null;
  /** In "investigate": the next question that best tells the explanations apart. */
  question: string | null;
  /** The diagnosis of the wrong answers (diagnostic@2), when the problem is from a supported family. */
  reasoning: Reasoning | null;
  /** What the diagnosis leads to, and why (learner-facing). */
  plan: ReturnType<typeof nextFromReasoning> | null;
  /** What was established, to pass to the module that teaches it. */
  established: Established | null;
  reason: string;
}

export { familyOf, investigateContext, investigation } from "./hypotheses";

/**
 * question-supports@1: the supporting skills recovery may check for ONE problem. A competency-level relation says what a skill
 * usually builds on; the problem's own solution steps say what THIS problem uses (10 × □ = 30 uses multiplication facts, not
 * number patterns). A used skill counts when it is eligible here (a module to assess it; within the learner's grade or
 * readiness route) and is not the problem's own skill.
 *   - Used skills close to the problem's level (BACKGROUND_GRADES) are checked first (type "uses", depth 1), closest to the
 *     problem's topic first, then what they build on; competency-level relations the problem does not use are not followed.
 *   - A used skill learned BACKGROUND_GRADES or more grades earlier is background arithmetic (addition for a probability): when
 *     there is no closer one, the competency-level relations come first and such skills after them.
 *   - No eligible used skill: the competency-level walk, unchanged.
 * Whether a skill is already shown is decided where it is checked (recovery).
 */
export const BACKGROUND_GRADES = 3;
export function questionSupports(originalQid: string, records: LearnerRecords): RecoveryState["supports"] {
  const q = question(originalQid);
  const own = graph.evidenceTarget(q.competency);
  const walk: RecoveryState["supports"] = walkSupports(q.competency, RECOVERY_DEPTH).map((s) => ({ ...s, assessable: !!moduleFor(s.id) }));
  const grade = gradeOf(records);
  const eligible = (id: string) => !!moduleFor(id) && (grade === null || !!records.readinessRoute?.includes(id) || graph.get(id).gradeRange[0] <= grade);
  const steps = problemOf(originalQid)?.steps ?? [];
  const used = [...new Set(steps.map((s) => String(s.competency ?? "")).filter((id) => graph.byId.has(id)).map((id) => graph.evidenceTarget(id)))].filter((id) => id !== own && eligible(id));
  if (!used.length) return walk;
  // closest to the problem's own topic first: a used skill the competency-level relations also name, then one of the same
  // strand, then the rest in solution order (a stable sort keeps step order within each rank)
  const rank = (id: string) => (walk.some((s) => s.id === id) ? 0 : graph.get(id).strand === graph.get(own).strand ? 1 : 2);
  const background = (id: string) => graph.get(own).gradeRange[0] - graph.get(id).gradeRange[1] >= BACKGROUND_GRADES;
  const near = used.filter((id) => !background(id)).sort((a, b) => rank(a) - rank(b));
  const far = used.filter(background).sort((a, b) => rank(a) - rank(b));
  const out: RecoveryState["supports"] = [];
  const seen = new Set([own, q.competency]);
  const put = (s: RecoveryState["supports"][number]) => { if (!seen.has(s.id)) { seen.add(s.id); out.push(s); } };
  const withSupports = (ids: string[]) => {
    for (const id of ids) put({ id, depth: 1, via: q.competency, type: "uses", assessable: true });
    for (const u of ids) for (const s of walkSupports(u, RECOVERY_DEPTH - 1)) put({ ...s, depth: s.depth + 1, assessable: !!moduleFor(s.id) });
  };
  if (near.length) withSupports([...near, ...far]);
  else { for (const s of walk) put(s); withSupports(far); }
  return out;
}

export function recovery(originalQid: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string): RecoveryState {
  const q = question(originalQid);
  const tries = records.attempts.filter((a) => a.questionId === originalQid);
  const supports = questionSupports(originalQid, records);
  const base = { original: originalQid, competency: q.competency, supports, question: null, reasoning: null, plan: null, established: null };
  if (!tries.length) return { ...base, phase: "attempt", active: null, reason: "Try the problem." };
  if (rightAnswer(tries[0])) return { ...base, phase: "solved", active: null, reason: "Solved on your own." };
  const solvedAt = tries.slice(1).find(rightAnswer);
  if (solvedAt) {
    // help = a hint or a shown solution on the retry, or teaching (any skill) between the first try and the retry; a plain second
    // try is not help. Either way a second try is not a first, unaided answer (evidence.ts: assisted), so neither shows the skill.
    const helped = solvedAt.hints > 0 || solvedAt.solution || records.teaching.some((t) => t.at > tries[0].at && t.at <= solvedAt.at) || records.attempts.some((a) => a.activity === "guided" && a.at > tries[0].at && a.at <= solvedAt.at);
    return helped
      ? { ...base, phase: "solved_after_help", active: null, reason: "Solved after help. That counts as help, not as work on your own." }
      : { ...base, phase: "solved_on_retry", active: null, reason: "Solved on a second try, without help. A second try is practice: it does not count as solving it on your own the first time." };
  }
  // bounded-retry@1 (Milestone 2): the original problem is not sent back again and again. After the first try and RETRY_LIMIT returns, all wrong,
  // recovery stops for a person (escalate -> pause@1); the wrong answers stay recorded, nothing is counted as solved.
  if (tries.length >= 1 + RETRY_LIMIT) return { ...base, phase: "escalate", active: null, reason: "This problem has been tried several times after the extra work, and it is still not coming out. That is not a failure: go through it with a teacher or parent." };
  // skill-units@1: a wrong delayed-check answer on a skill taught here goes back to that skill, not to what it builds on: its module
  // asks a fresh question on it alone (moduleStep, failed delayed check) until one is right
  // recovery-scope@1: when the initial teaching used an unscoped (prerequisite) strategy, the unit's own taughtAt is null even though
  // the module was taught. If a unit accepts the failed question and the module has any teaching record, the unit was implicitly
  // covered — route to same-skill recovery, not prerequisite support.
  if (tries[0].activity === "retention") {
    const m = moduleFor(q.competency);
    const u = m ? unitsOf(m, records).find((x) => x.taughtAt && x.unit.accepts(originalQid)) : undefined;
    // recovery-scope@1: fall back to a unit that accepts the question when the module was taught (any strategy) but the unit's own
    // taughtAt is null because the teaching used an unscoped prerequisite strategy (e.g. check_what_it_uses)
    const uFallback = !u && m ? (() => {
      const accepting = unitOfQuestion(m, originalQid);
      if (!accepting) return undefined;
      const moduleTaught = records.teaching.some((t) => t.competency === q.competency);
      return moduleTaught ? { unit: accepting, taughtAt: records.teaching.filter((t) => t.competency === q.competency).at(-1)!.at } : undefined;
    })() : undefined;
    const matched = u ?? uFallback;
    if (matched && !records.attempts.some((a) => a.at > tries[0].at && a.activity !== "retention" && independentAttempt(a) && rightAnswer(a) && matched.unit.accepts(a.questionId)))
      return { ...base, phase: "teach", active: q.competency, reason: "The delayed check on this skill did not come out. Back to this skill first: a fresh question on it on your own." };
  }
  // own-skill teaching (Milestone 2 closure, decision C): when the skills this problem builds on show no gap and the problem is still wrong after a
  // return, the problem's OWN skill is taught once (its module chooses the explanation through the teaching-eligibility gate and ends with an
  // independent check), then the problem is tried once more. Taught already since the first try, or nothing eligible to teach: escalate.
  const ownTarget = graph.evidenceTarget(q.competency);
  const ownTaught = records.teaching.some((t) => graph.evidenceTarget(t.competency) === ownTarget && t.at > tries[0].at);
  const shown = (id: string) => ["independent", "transfer", "verified"].includes(evidence(id).status);
  const resolved = (id: string, est?: Established | null) => {
    const ms0 = moduleState(id, records, evidence(id), now, session, est);
    // handover@1: a skill waiting for re-entry is handled in its own module, never inside another problem's recovery
    const ms = ms0.phase === "reentry" ? { ...ms0, phase: "pause" as const, question: null } : ms0;
    return { ms, done: shown(id) || ms.phase === "done" };
  };

  // 1. a supported problem: investigate the wrong answer, then act on what was established
  const fam = familyOf(originalQid);
  let reasoning: Reasoning | null = null;
  let plan: RecoveryState["plan"] = null;
  if (fam) {
    reasoning = investigation(originalQid, records).reasoning;
    // a follow-up the learner has already answered (anywhere) is not new evidence: a repeat is a second try (n > 1), which
    // the reading leaves out, so asking it again would never move the investigation on. Then the reading stays unsure.
    const fresh = reasoning?.next && !records.attempts.some((a) => exposureKey(a.questionId) === exposureKey(reasoning!.next!)) ? reasoning.next : null;
    if (reasoning?.status === "need_more" && fresh) return { ...base, reasoning, phase: "investigate", active: null, question: fresh, reason: "One more question to help work out what happened. Like every answer you give on your own, it is part of your record and helps OpenPath choose what comes next." };
    if (reasoning) plan = nextFromReasoning(reasoning, q.competency);
    if (plan && plan.kind !== "unsure" && plan.competency) {
      const best = reasoning!.best!;
      const est: Established | null = best.kind === "secure" || best.kind === "unexplained" ? null : { kind: best.kind, says: claimWording(originalQid, best.id, best.says), id: best.id };
      if (plan.kind === "practise") return { ...base, reasoning, plan, phase: "return", active: null, reason: `${plan.why} Try the problem again.` };
      if (moduleFor(plan.competency)) {
        const r = resolved(plan.competency, est);
        if (!r.done) {
          if (r.ms.phase === "pause") return { ...base, reasoning, plan, established: est, phase: "escalate", active: plan.competency, ...(r.ms.handover ? { handover: r.ms.handover } : {}), reason: `${graph.get(plan.competency).name}: different explanations have not clicked yet. Ask a teacher or parent.` };
          return { ...base, reasoning, plan, established: est, phase: plan.kind === "teach" ? "teach" : "support", active: plan.competency, reason: plan.why };
        }
        // Once prerequisite support is resolved, a failed return still owes the original skill's
        // teaching cycle below. A newly readable answer format must not bypass that recovery.
        if (tries.length < 2 || graph.evidenceTarget(plan.competency) === ownTarget)
          return { ...base, reasoning, plan, phase: "return", active: null, reason: "Back to the original problem." };
      } else {
        // no module for it: the worked steps are the teaching, then back to the problem
        return { ...base, reasoning, plan, phase: "return", active: null, reason: `${plan.why} Look at the worked steps, then try again.` };
      }
    }
  }
  // 2. not a supported problem, or the diagnosis is unsure: check supporting skills along the relations
  for (const s of supports) {
    if (!s.assessable || shown(s.id)) continue;
    const r = resolved(s.id);
    if (r.done) continue;
    if (r.ms.phase === "pause") return { ...base, reasoning, plan, phase: "escalate", active: s.id, ...(r.ms.handover ? { handover: r.ms.handover } : {}), reason: `${graph.get(s.id).name}: different explanations have not clicked yet. Ask a teacher or parent; you can still try the problem again.` };
    return { ...base, reasoning, plan, phase: "support", active: s.id, reason: `${plan?.kind === "unsure" ? `${plan.why} ` : ""}${s.type === "uses" ? `This problem uses a skill that is not shown yet: ${graph.get(s.id).name}.` : s.type === "mandatory" ? `This problem rests on a skill that is not shown yet: ${graph.get(s.id).name}.` : `A related skill that is not shown yet may help: ${graph.get(s.id).name}.`} We check it first, then come back to the problem.` };
  }
  // no gap found in the skills this builds on
  if (tries.length >= 2) {
    if (ownTaught) {
      // after the explanation: the module's own guided practice and independent check, then the problem once more (the RETRY_LIMIT rule above
      // escalates if that try is wrong)
      const r = resolved(ownTarget);
      if (r.ms.phase === "chapter" || ((r.ms.phase === "guided" || r.ms.phase === "check") && r.ms.question)) return { ...base, reasoning, plan, phase: "teach", active: ownTarget, reason: r.ms.reason };
      return { ...base, reasoning, plan, phase: "return", active: null, reason: "Back to the original problem, after the explanation and a question on your own." };
    }
    const m = moduleFor(ownTarget);
    const eligible = !!m && m.strategies.some((st) => teachable(m, st, establishedIds(ownTarget, records)));
    if (!eligible) return { ...base, reasoning, plan, phase: "escalate", active: null, reason: "No gap was found in the skills this problem builds on, and there is no checked explanation of this skill to offer here. Go through it with a teacher or parent." };
    const r = resolved(ownTarget);
    if (r.ms.phase === "chapter" || r.ms.question) return { ...base, reasoning, plan, phase: "teach", active: ownTarget, reason: "No gap was found in the skills this problem builds on. Here is this skill itself: an explanation, then a question on your own." };
    return { ...base, reasoning, plan, phase: "escalate", active: null, reason: "No gap was found in the skills this problem builds on, and this skill's own module has nothing more to teach here. Go through it with a teacher or parent." };
  }
  return { ...base, reasoning, plan, phase: "return", active: null, reason: plan?.kind === "unsure" ? `${plan.why} Try the problem again, or ask a teacher to look at your working.` : "Back to the original problem." };
}

export const daysUntil = (iso: string | null, now: number) => (iso ? Math.ceil((Date.parse(iso) - now) / DAY) : null);
