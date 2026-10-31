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
import { moduleFor, question, type Module, type Strategy } from "./content";
import { diagnose, type Diagnosis } from "./diagnostic";
import { DAY, independentAttempt, rightAnswer, type SkillEvidence } from "./evidence";
import { exposureKey, gradeOfQuestion, parseProblem, phaseOf as phaseOfQ, phasePool, problemOf, type Phase } from "./families";
import { graph, walkSupports } from "./graph";
import { modulePhasePool } from "./library";
import { discriminatingProbe, familyOf, hypothesesFor, investigateContext, investigation, investigationTrigger, openHypothesis } from "./hypotheses";
import { nextFromReasoning, reason, type Reasoning } from "./reasoning";
import { teachingEligibility, type TeachingEligibility } from "./teaching-contract";
import { contentEligibility, isMisconceptionSpecific, teachingMode, type ContentEligibility } from "./explanation-review";
import { evidenceBasis, type EvidenceBasis } from "./misconception-evidence";
import type { Attempt, LearnerRecords } from "./records";

/** The shared planner's draft policy with this engine's block size (one guided question, one fresh check, no contrast). */
export const MODULE_POLICY: PlannerPolicy = { ...PLANNER_POLICY_DRAFT, guidedItems: 1, reassessItems: 1, reassessPassMin: 1, reassessContrastItems: 0, version: `${PLANNER_POLICY_DRAFT.version}+learning-module@1` };
export const RECOVERY_DEPTH = 2;

const of = (m: Module) => (a: Attempt) => question(a.questionId).competency === m.competency;
/** level@1: the learner's grade (their current enrolment), and whether a question is within it: a problem from a
 * later grade is never asked (it is reached in that grade); one from an earlier grade may be (recovery, review). */
const gradeOf = (records: LearnerRecords) => records.enrolments.at(-1)?.grade ?? null;
const withinGrade = (records: LearnerRecords, qid: string) => {
  const g = gradeOf(records);
  const q = g === null ? null : gradeOfQuestion(qid);
  return g === null || q === null || q <= g;
};
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
  return modulePhasePool(m, phase).find((id) => !seen.has(exposureKey(id)) && withinGrade(records, id)) ?? null;
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
  const onTopic = (s: Strategy) => !wrongFamily || isMisconceptionSpecific(s) || !relevant(s) || !m.strategies.some((x) => !isMisconceptionSpecific(x) && !relevant(x));
  return m.strategies.filter((s) => teachable(m, s, misconceptionEvidence) && onTopic(s)).sort((a, b) => specific(a) - specific(b) || relevant(a) - relevant(b) || Number(a.kind !== kind) - Number(b.kind !== kind) || needState(a) - needState(b) || m.strategies.indexOf(a) - m.strategies.indexOf(b));
}
/** teaching gate (adaptive-loop repair): an explanation whose sections fail the teaching contract is never chosen as an
 *  intervention. One that was not machine-checked (hand-written modules) may be used, and says so; none is "verified". */
export const failsChecks = (m: Module, s: Strategy) => { const e = teachingEligibility(m, s); return e.checked && !e.eligible; };
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
    const g = within(st.guided);
    // teaching-history@1: the block's check alone is its own check question, or (when that question had already been
    // seen elsewhere) the fresh question asked in its place: the first answer alone labelled "check" in the block
    const c = within(st.check) ?? mine.find((a) => a.at >= t.at && a.at < until && a.activity === "check" && a.n === 1 && a.questionId !== st.guided && !a.context) ?? null;
    const clean = c && independentAttempt(c) ? c : null;
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

export type ModulePhase = "recover" | "explore" | "strategy" | "chapter" | "guided" | "check" | "verify" | "retention" | "done" | "pause" | "unavailable" | "waiting";
export interface ModuleState {
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
  const ms = moduleStep(competency, records, ev, now, session, established, evidence);
  const m = moduleFor(competency);
  if (!m || !ms.question) return ms;
  const q = ms.question;
  const unread = unreadableCount(records, q);
  if (unread >= UNREADABLE_LIMIT)
    return { ...ms, phase: "pause", question: null, why: `bounded-input@1: ${unread} unreadable answers to ${q}`,
      reason: "Your answers to this question could not be read, so they were not marked: nothing was counted for or against you. This needs a person: go through it with a teacher or parent." };
  const fromCheckPool = !!m.pool && q.startsWith("gen:") && ![...m.practice, ...m.transfer].includes(q) && phaseOfQ(q) === "check";
  const activity = ms.phase === "explore" ? "diagnostic" : ms.phase === "strategy" ? "probe" : ms.phase === "guided" ? "guided" : ms.phase === "check" ? "check" : ms.phase === "retention" ? "retention" : m.transfer.includes(q) ? "transfer" : m.strategies.some((s) => s.check === q) || fromCheckPool ? "check" : "practice";
  return { ...ms, activity };
}
function moduleStep(competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null, evidence?: (id: string) => SkillEvidence): ModuleState {
  const m = moduleFor(competency);
  const base = { competency, question: null, strategy: null, diagnosis: null, decision: null } as const;
  if (!m) return { ...base, phase: "unavailable", reason: "No questions for this skill yet." };
  // written@1: a written answer is with an educator; nothing here moves on until it is marked (other skills can)
  // an educator-marked module waits for its mark; a module answered automatically carries on (written@2)
  if (!m?.pool && records.pending?.some((p) => graph.evidenceTarget(p.competency) === competency)) return { ...base, phase: "waiting", reason: "Your written answer is with an educator. You will see the mark and their feedback under “Written work”; carry on with other skills meanwhile." };
  // a misunderstanding already established elsewhere (diagnostic@2, on a problem the learner was stuck on) replaces the
  // exploratory questions here: it is not asked again; strategy probes and teaching follow as usual
  const asked = diagnose(m, records.attempts);
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
  const resProbe = here && own!.probeDue ? discriminatingProbe(own!, records) : null;
  const hold = !!own && (own.teachingDue || !!resProbe);
  const shown = (ev.status === "independent" || ev.status === "transfer" || ev.status === "verified") && !hold;
  const unanswered = (ids: string[]) => ids.find((id) => !answered(records, id) && withinGrade(records, id)) ?? null;
  if (ev.retention === "due") {
    // the delayed check: the module's own questions, then fresh ones from the pool's delayed-check part
    const r = unanswered(m.retention) ?? fromPool(m, "retention", records);
    if (r) return { ...base, phase: "retention", question: r, diagnosis: d, reason: "A delayed check, a week after you first showed this: does it last?" };
  }
  // investigation-trigger@1: a significant or repeated error in practice or verification is investigated (bounded)
  const inv = pendingInvestigation(m, records, session);
  if (inv) return { ...base, phase: "explore", question: inv.question, diagnosis: d, context: investigateContext(inv.original), why: inv.why, reason: "One more question to understand your last answer." };
  // the misunderstanding showed again after this skill's teaching: a different explanation (all tried: a person)
  if (here && own!.teachingDue && records.teaching.some((t) => t.competency === competency && t.at > (own!.provenance.established ?? ""))) {
    const delivered = (x: Strategy) => records.teaching.some((t) => t.competency === competency && t.strategy === x.id);
    const s = orderStrategies(m, d, records, [own!.claim!.explanation]).find((x) => !delivered(x));
    if (!s) return { ...base, phase: "pause", diagnosis: d, reason: "Every explanation here has been tried. Carry on, and go through this with a teacher or parent; it will come back." };
    return { ...base, phase: "chapter", strategy: s, teachingReview: teachingStatus(m, s), contentReview: contentReviewOf(m, s, [own!.claim!.explanation]), basis: evidenceBasis(competency, records, { evidence: ev, diagnosis: d }), diagnosis: d, reason: `${own!.claim!.says} It showed again after the last explanation, so here is a different one.` };
  }
  if (d.next && !shown) return { ...base, phase: "explore", question: d.next, diagnosis: d, reason: "A short check to find the right starting point." };
  // adaptive-loop repair: a gap the exploratory questions show is investigated exactly as from Practice (diagnostic@2 on the
  // wrong answer, then the supporting skill it points to), before this module's own explanations. Only with the learner's
  // whole evidence (not inside a recovery that is already running), and only for a wrong answer OpenPath can reason about.
  if (evidence && !established && !shown && d.result && d.result !== "secure" && d.result !== "insufficient_evidence") {
    const wrong = d.asked.filter((x) => !x.right).map((x) => x.questionId).find((id) => { const f = familyOf(id); return !!f && !!reason(f, [{ questionId: f, response: records.attempts.find((a) => a.questionId === id)!.response }])?.explanations.some((e) => e.id !== "secure" && e.id !== "unexplained"); });
    if (wrong) {
      const r = recovery(wrong, records, evidence, now, session);
      const again = records.attempts.filter((a) => a.questionId === wrong).length;
      if (r.phase === "investigate" || r.phase === "support" || r.phase === "teach" || (r.phase === "return" && again < 2))
        return { ...base, phase: "recover", original: wrong, diagnosis: d, reason: r.reason };
      if (r.phase === "escalate") return { ...base, phase: "pause", diagnosis: d, reason: r.reason };
      if (r.phase === "solved_after_help" || r.phase === "solved_on_retry") {
        // what was missing has been worked on: the skill itself is now checked on a new question alone, not taught again
        const more = unanswered([...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)]) ?? fromPool(m, "check", records);
        if (more) return { ...base, phase: "verify", question: more, diagnosis: d, reason: "What was missing has been worked on. Now a new question on your own." };
      }
    }
  }
  // sub-skill difficulty (Workstream A3; misconception-evidence@1 "repeated-difficulty" within one kind of question): in a module whose
  // explanations are about different kinds of question, two or more answers alone wrong on one kind, none right alone since, is taught
  // with that kind's general explanation once (through the gate), then rechecked alone on a fresh question of that kind; still wrong
  // after it: a person. The learner's evidence is not changed (a competency is shown or not by the shared engine); only what is taught.
  const gap = shown && !established ? subSkillGap(m, records) : null;
  if (gap) {
    const basis0 = evidenceBasis(competency, records, { evidence: ev, diagnosis: d });
    const kindOf = (st: Strategy) => problemOf(st.check.replace(/:(mc|w)$/, ""))?.family;
    const forGap = m.strategies.filter((st) => !isMisconceptionSpecific(st) && kindOf(st) === gap.family);
    const taught = records.teaching.filter((t) => t.competency === competency && t.at > gap.since && forGap.some((st) => st.id === t.strategy));
    if (!taught.length) {
      const st = forGap.find((x) => teachable(m, x, basis0.established));
      if (st) return { ...base, phase: "chapter", strategy: st, teachingReview: teachingStatus(m, st), contentReview: contentReviewOf(m, st, basis0.established), basis: basis0, diagnosis: d, reason: "Questions of this kind have gone wrong a few times on your own, so here is how to solve them, then one on your own." };
    } else {
      const st = forGap.find((x) => x.id === taught.at(-1)!.strategy)!;
      // the recheck is of the same kind: the explanation's own check if not yet seen, else a fresh check question of that kind
      const seen = new Set(records.attempts.map((x) => exposureKey(x.questionId)));
      // (and never close to the worked example just shown: not the same answer, not two of its numbers the same)
      const shownEx = st.screens.flatMap((sc) => (sc.instance ? [problemOf(sc.instance)] : [])).filter((p): p is NonNullable<typeof p> => !!p && p.family === gap.family);
      const close = (id: string) => { const p = problemOf(id.replace(/:(mc|w)$/, "")); return !p || shownEx.some((e) => e.answer === p.answer || e.params.filter((v, i) => v === p.params[i]).length >= 2); };
      const q = (!answered(records, st.check) && withinGrade(records, st.check) ? st.check : null) ?? phasePool(gap.family, "check").find((id) => !seen.has(exposureKey(id)) && withinGrade(records, id) && !close(id)) ?? null;
      if (q && !records.attempts.some((a) => a.at > taught.at(-1)!.at && kindOf(st) === problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family && independentAttempt(a))) return { ...base, phase: "check", question: q, strategy: st, diagnosis: d, reason: "Now one of this kind on your own, with no hints." };
      return { ...base, phase: "pause", diagnosis: d, reason: "This kind of question has not clicked yet, even after the explanation. Carry on, and go through it with a teacher or parent." };
    }
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
    const listed = unanswered([...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)]);
    const written = unanswered(m.written ?? []);
    if (!listed && needsEvidence && taughtThisVisit && m.pool)
      return { ...base, phase: "done", question: null, diagnosis: d, reason: "Shown on your own, straight after the lesson. Come back on another day: a few fresh questions then show it is yours (answers right after teaching are progress, not yet evidence)." };
    const more = listed ?? (needsEvidence ? fromPool(m, "check", records) : null) ?? written;
    // shown here, but the shared record (the engine) has not yet demonstrated it and nothing is left: say so
    const engineShort = !more && needsEvidence;
    return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, reason: more && m.written?.includes(more) ? "Shown on your own. Now the part a computer cannot mark: write or draw it, and an educator will mark it (other skills carry on meanwhile)." : ev.status === "verified" ? "Verified: shown on your own, and again in a delayed check." : more ? "Shown on your own. More practice is optional." : engineShort ? "Shown on your own here. Your shared record needs more answers on your own before a delayed check can verify it, and this skill has no more questions yet." : ev.retentionDueAt && ev.retention === "scheduled" ? `Shown on your own. A delayed check is planned for ${new Date(ev.retentionDueAt).toDateString()}.` : "Shown on your own." };
  }
  if (d.result === "secure" || d.result === "insufficient_evidence") {
    // no clear gap: verify on fresh questions alone; a gap that shows there is then taught
    const rs = ruleStateFor(m, d, records);
    if (rs.status !== "weak") {
      const more = unanswered([...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)]) ?? fromPool(m, "check", records);
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
  const decision = planRule({
    rule: rs,
    strategies: order.map((s) => s.id),
    now: new Date(now).toISOString(),
    sessionStartedAt: sessionStart,
    session,
    available: { apply: m.strategies.filter((s) => teachable(m, s, misEv) && !answered(records, s.check)).length + (fromPool(m, "check", records) ? 1 : 0), contrast: 0, guided: st && !answered(records, st.guided) ? 1 : 0 },
    answeredThisSession: records.attempts.filter((a) => of(m)(a) && a.at >= sessionStart && independentAttempt(a)).length,
    guidedThisBlock: st && records.attempts.some((a) => a.questionId === st.guided && a.at >= last!.at) ? 1 : 0,
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
    return { ...base, phase: "chapter", strategy: s, teachingReview: teachingStatus(m, s), contentReview: contentReviewOf(m, s, misEv), basis, diagnosis: d, decision, reason: before ? "That way did not lead to a right answer on your own, so here is a different explanation." : established ? `${established.says} Here is a way to rebuild it.` : open ? `${own!.claim!.says} Here is a way to rebuild it.` : diagnosisReason(d) };
  }
  if (decision.action === "guided_practice" && st) return { ...base, phase: "guided", question: st.guided, strategy: st, diagnosis: d, decision, reason: "Practise it once, with a hint if you want one. This counts as practice with help." };
  if (decision.action === "reassess" && st) {
    const q = blockCheck(m, st, records);
    if (q) return { ...base, phase: "check", question: q, strategy: st, diagnosis: d, decision, reason: "Now one new question on your own, with no hints." };
    return { ...base, phase: "pause", diagnosis: d, decision, reason: "There is no new question left to check this on your own yet. Carry on, and go through it with a teacher or parent." };
  }
  if ((decision.action === "recommend_human" || decision.action === "content_gap") && !order.length) return { ...base, phase: "pause", diagnosis: d, decision, reason: NO_EXPLANATION() };
  if (decision.action === "content_gap") return { ...base, phase: "pause", diagnosis: d, decision, reason: "There is no new question left to check this on your own yet. Carry on, and go through it with a teacher or parent." };
  if (decision.action === "recommend_human") return { ...base, phase: "pause", diagnosis: d, decision, reason: "Different explanations have not clicked yet. That is not a failure: carry on, and ask a teacher or parent to go through it with you." };
  if (resProbe) return { ...base, phase: "verify", question: resProbe, diagnosis: d, decision, why: `resolution probe for ${own!.id}`, reason: "One question on your own that shows whether that misunderstanding has gone." };
  if (decision.action === "done") {
    const more = unanswered([...m.practice, ...m.transfer]);
    return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, decision, reason: "Right on your own after help: progress, not yet mastery. More practice on your own shows it is yours." };
  }
  const more = unanswered([...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)]);
  return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, decision, reason: "One more question on your own." };
}

/**
 * investigation-trigger@1 in a module: the learner's latest answer alone (practice, transfer or a check) was wrong in a
 * way worth understanding (investigationTrigger: a modelled misunderstanding predicts it, or two of the last three were
 * wrong), it comes from a family diagnostic@2 can read, nothing open already explains errors here, and the reading
 * still needs a question nobody has asked. At most two investigations are begun per skill in a session.
 */
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
/** The question for a block's check alone: the strategy's own check if the learner has never seen it, else a fresh one. */
export const blockCheck = (m: Module, st: Strategy, records: LearnerRecords): string | null => (!answered(records, st.check) && withinGrade(records, st.check) ? st.check : fromPool(m, "check", records));

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
  const blocks = ruleStateFor(m, diagnose(m, records.attempts), records).interventions;
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

const diagnosisReason = (d: Diagnosis) =>
  d.result === "conceptual" ? "Your answers suggest the idea itself needs building, so we start with a picture."
  : d.result === "procedural" ? "You have the idea; a step in the method slips. Here is the method, one step."
  : d.result === "recall" ? "The method is fine; a fact you need is shaky. Here is a way to rebuild it from facts you know."
  : d.result === "prerequisite" ? "Something this builds on looks shaky, so we go there first."
  : "Here is a short explanation, then practice.";

// ---------------------------------------------------------------- recovery from an original problem

export interface RecoveryState {
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

export function recovery(originalQid: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string): RecoveryState {
  const q = question(originalQid);
  const tries = records.attempts.filter((a) => a.questionId === originalQid);
  const supports = walkSupports(q.competency, RECOVERY_DEPTH).map((s) => ({ ...s, assessable: !!moduleFor(s.id) }));
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
  // own-skill teaching (Milestone 2 closure, decision C): when the skills this problem builds on show no gap and the problem is still wrong after a
  // return, the problem's OWN skill is taught once (its module chooses the explanation through the teaching-eligibility gate and ends with an
  // independent check), then the problem is tried once more. Taught already since the first try, or nothing eligible to teach: escalate.
  const ownTarget = graph.evidenceTarget(q.competency);
  const ownTaught = records.teaching.some((t) => graph.evidenceTarget(t.competency) === ownTarget && t.at > tries[0].at);
  const shown = (id: string) => ["independent", "transfer", "verified"].includes(evidence(id).status);
  const resolved = (id: string, est?: Established | null) => {
    const ms = moduleState(id, records, evidence(id), now, session, est);
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
      const est: Established | null = best.kind === "secure" || best.kind === "unexplained" ? null : { kind: best.kind, says: best.says, id: best.id };
      if (plan.kind === "practise") return { ...base, reasoning, plan, phase: "return", active: null, reason: `${plan.why} Try the problem again.` };
      if (moduleFor(plan.competency)) {
        const r = resolved(plan.competency, est);
        if (!r.done) {
          if (r.ms.phase === "pause") return { ...base, reasoning, plan, established: est, phase: "escalate", active: plan.competency, reason: `${graph.get(plan.competency).name}: different explanations have not clicked yet. Ask a teacher or parent.` };
          return { ...base, reasoning, plan, established: est, phase: plan.kind === "teach" ? "teach" : "support", active: plan.competency, reason: plan.why };
        }
        return { ...base, reasoning, plan, phase: "return", active: null, reason: "Back to the original problem." };
      }
      // no module for it: the worked steps are the teaching, then back to the problem
      return { ...base, reasoning, plan, phase: "return", active: null, reason: `${plan.why} Look at the worked steps, then try again.` };
    }
  }
  // 2. not a supported problem, or the diagnosis is unsure: check supporting skills along the relations
  for (const s of supports) {
    if (!s.assessable || shown(s.id)) continue;
    const r = resolved(s.id);
    if (r.done) continue;
    if (r.ms.phase === "pause") return { ...base, reasoning, plan, phase: "escalate", active: s.id, reason: `${graph.get(s.id).name}: different explanations have not clicked yet. Ask a teacher or parent; you can still try the problem again.` };
    return { ...base, reasoning, plan, phase: "support", active: s.id, reason: `${plan?.kind === "unsure" ? `${plan.why} ` : ""}${s.type === "mandatory" ? `This problem rests on a skill that is not shown yet: ${graph.get(s.id).name}.` : `A related skill that is not shown yet may help: ${graph.get(s.id).name}.`} We check it first, then come back to the problem.` };
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
