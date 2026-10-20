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
import { nextFromReasoning, reason, type Reasoning } from "./reasoning";
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
export function orderStrategies(m: Module, d: Diagnosis, records: LearnerRecords): Strategy[] {
  const kind = d.result === "conceptual" || d.result === "insufficient_evidence" ? "conceptual" : d.result === "procedural" || d.result === "transfer" ? "procedural" : d.result === "recall" ? "recall" : d.result === "prerequisite" ? "prerequisite" : null;
  const needState = (s: Strategy) => {
    const res = s.needs.map((id) => answered(records, id));
    if (res.some((a) => a && !rightAnswer(a))) return 2; // builds on something the learner missed
    if (res.every((a) => a && rightAnswer(a))) return 0; // builds on what the learner showed
    return 1;
  };
  return [...m.strategies].sort((a, b) => Number(a.kind !== kind) - Number(b.kind !== kind) || needState(a) - needState(b) || m.strategies.indexOf(a) - m.strategies.indexOf(b));
}
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
    const c = within(st.check);
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

export type ModulePhase = "explore" | "strategy" | "chapter" | "guided" | "check" | "verify" | "retention" | "done" | "pause" | "unavailable" | "waiting";
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
}

/** What an earlier diagnosis (diagnostic@2, in recovery) established about this skill, so it is not asked again. */
export interface Established {
  kind: "conceptual" | "procedural" | "recall" | "prerequisite";
  says: string;
}
export function moduleState(competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null): ModuleState {
  const ms = moduleStep(competency, records, ev, now, session, established);
  const m = moduleFor(competency);
  if (!m || !ms.question) return ms;
  const q = ms.question;
  const fromCheckPool = !!m.pool && q.startsWith("gen:") && ![...m.practice, ...m.transfer].includes(q) && phaseOfQ(q) === "check";
  const activity = ms.phase === "explore" ? "diagnostic" : ms.phase === "strategy" ? "probe" : ms.phase === "guided" ? "guided" : ms.phase === "check" ? "check" : ms.phase === "retention" ? "retention" : m.transfer.includes(q) ? "transfer" : m.strategies.some((s) => s.check === q) || fromCheckPool ? "check" : "practice";
  return { ...ms, activity };
}
function moduleStep(competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null): ModuleState {
  const m = moduleFor(competency);
  const base = { competency, question: null, strategy: null, diagnosis: null, decision: null } as const;
  if (!m) return { ...base, phase: "unavailable", reason: "No questions for this skill yet." };
  // written@1: a written answer is with an educator; nothing here moves on until it is marked (other skills can)
  // an educator-marked module waits for its mark; a module answered automatically carries on (written@2)
  if (!m?.pool && records.pending?.some((p) => graph.evidenceTarget(p.competency) === competency)) return { ...base, phase: "waiting", reason: "Your written answer is with an educator. You will see the mark and their feedback under “Written work”; carry on with other skills meanwhile." };
  // a misunderstanding already established elsewhere (diagnostic@2, on a problem the learner was stuck on) replaces the
  // exploratory questions here: it is not asked again; strategy probes and teaching follow as usual
  const asked = diagnose(m, records.attempts);
  const d: Diagnosis = established && !asked.result ? { ...asked, next: null, result: established.kind === "conceptual" ? "conceptual" : established.kind === "procedural" ? "procedural" : "recall", confidence: asked.confidence } : asked;
  const shown = ev.status === "independent" || ev.status === "transfer" || ev.status === "verified";
  const unanswered = (ids: string[]) => ids.find((id) => !answered(records, id) && withinGrade(records, id)) ?? null;
  if (ev.retention === "due") {
    // the delayed check: the module's own questions, then fresh ones from the pool's delayed-check part
    const r = unanswered(m.retention) ?? fromPool(m, "retention", records);
    if (r) return { ...base, phase: "retention", question: r, diagnosis: d, reason: "A delayed check, a week after you first showed this: does it last?" };
  }
  if (d.next && !shown) return { ...base, phase: "explore", question: d.next, diagnosis: d, reason: "A short check to find the right starting point." };
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
  const order = orderStrategies(m, d, records);
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
    available: { apply: m.strategies.filter((s) => !answered(records, s.check)).length, contrast: 0, guided: st && !answered(records, st.guided) ? 1 : 0 },
    answeredThisSession: records.attempts.filter((a) => of(m)(a) && a.at >= sessionStart && independentAttempt(a)).length,
    guidedThisBlock: st && records.attempts.some((a) => a.questionId === st.guided && a.at >= last!.at) ? 1 : 0,
    policy: MODULE_POLICY,
  });
  const byId = (id?: string) => m.strategies.find((s) => s.id === id) ?? null;
  if (decision.action === "teach") {
    let s = byId(decision.strategy);
    // a strategy is taught once: if its questions are used, take the next unused one
    if (s && answered(records, s.check)) s = order.find((x) => !answered(records, x.check) && !records.teaching.some((t) => t.competency === competency && t.strategy === x.id)) ?? null;
    if (!s) return { ...base, phase: "pause", diagnosis: d, decision, reason: "Every explanation here has been tried. Carry on, and go through this with a teacher or parent; it will come back." };
    const before = records.teaching.some((t) => t.competency === competency);
    return { ...base, phase: "chapter", strategy: s, diagnosis: d, decision, reason: before ? "That way did not lead to a right answer on your own, so here is a different explanation." : established ? `${established.says} Here is a way to rebuild it.` : diagnosisReason(d) };
  }
  if (decision.action === "guided_practice" && st) return { ...base, phase: "guided", question: st.guided, strategy: st, diagnosis: d, decision, reason: "Practise it once, with a hint if you want one. This counts as practice with help." };
  if (decision.action === "reassess" && st) return { ...base, phase: "check", question: st.check, strategy: st, diagnosis: d, decision, reason: "Now one new question on your own, with no hints." };
  if (decision.action === "recommend_human" || decision.action === "content_gap") return { ...base, phase: "pause", diagnosis: d, decision, reason: "Different explanations have not clicked yet. That is not a failure: carry on, and ask a teacher or parent to go through it with you." };
  if (decision.action === "done") {
    const more = unanswered([...m.practice, ...m.transfer]);
    return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, decision, reason: "Right on your own after help: progress, not yet mastery. More practice on your own shows it is yours." };
  }
  const more = unanswered([...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)]);
  return { ...base, phase: more ? "verify" : "done", question: more, diagnosis: d, decision, reason: "One more question on your own." };
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
  phase: "attempt" | "investigate" | "trace" | "support" | "teach" | "return" | "solved" | "solved_after_help" | "escalate";
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

/** The supported-family form of a question: itself if generated, or its prompt read as a problem. */
export function familyOf(qid: string): string | null {
  if (problemOf(qid)) return qid;
  const p = parseProblem(question(qid).prompt);
  return p.supported ? p.problem.id : null;
}
export const investigateContext = (original: string) => `investigate:${original}`;

export function recovery(originalQid: string, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number, session: string): RecoveryState {
  const q = question(originalQid);
  const tries = records.attempts.filter((a) => a.questionId === originalQid);
  const supports = walkSupports(q.competency, RECOVERY_DEPTH).map((s) => ({ ...s, assessable: !!moduleFor(s.id) }));
  const base = { original: originalQid, competency: q.competency, supports, question: null, reasoning: null, plan: null, established: null };
  if (!tries.length) return { ...base, phase: "attempt", active: null, reason: "Try the problem." };
  if (rightAnswer(tries[0])) return { ...base, phase: "solved", active: null, reason: "Solved on your own." };
  if (tries.slice(1).some(rightAnswer)) return { ...base, phase: "solved_after_help", active: null, reason: "Solved after help. That counts as help, not as work on your own." };
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
    const follow = records.attempts.filter((a) => a.context === investigateContext(originalQid) && a.n === 1);
    reasoning = reason(fam, [{ questionId: fam, response: tries[0].response }, ...follow.map((a) => ({ questionId: a.questionId, response: a.response }))]);
    if (reasoning?.status === "need_more" && reasoning.next) return { ...base, reasoning, phase: "investigate", active: null, question: reasoning.next, reason: "One more question to understand what happened (it does not count against you)." };
    if (reasoning) plan = nextFromReasoning(reasoning, q.competency);
    if (plan && plan.kind !== "unsure" && plan.competency) {
      const best = reasoning!.best!;
      const est: Established | null = best.kind === "secure" || best.kind === "unexplained" ? null : { kind: best.kind, says: best.says };
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
    return { ...base, reasoning, plan, phase: "support", active: s.id, reason: `${plan?.kind === "unsure" ? `${plan.why} ` : ""}This problem rests on a skill that is not shown yet: ${graph.get(s.id).name}. We check it first, then come back to the problem.` };
  }
  return { ...base, reasoning, plan, phase: "return", active: null, reason: plan?.kind === "unsure" ? `${plan.why} Try the problem again, or ask a teacher to look at your working.` : "Back to the original problem." };
}

export const daysUntil = (iso: string | null, now: number) => (iso ? Math.ceil((Date.parse(iso) - now) / DAY) : null);
