/**
 * deep-recovery@0 on a learning goal (learning/deep-goal.ts), driven as the flagged app drives it: the year plan's next step for the
 * goal (learnerState().next), the goal's module decision through the deep-goal wrapper (Main.tsx ctx.module), the deep screen when
 * that decision is "recover" (DeepRecovery.tsx), the learner's answer or the lesson saved; again. Only the learner's answer is
 * scripted. Synthetic learners only: a synthetic success is not evidence that anyone learned.
 */
import { latestReleases } from "../../../packages/learning/src/curricula";
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import type { ModuleState } from "../../../packages/learning/src/intervention";
import { withDecisions } from "../../../packages/learning/src/records";
import { learnerState, make } from "../../../packages/learning/src/session";
import { DEEP_GOAL_POLICY, deepGoalModule } from "../learning/deep-goal";
import { deepScreen } from "../learning/deep-recovery-app";
import { activityFor } from "../learning/driver";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { misconception } from "./learners";
import { SliceSession } from "./session";

export const OWN = "MATH.calculus.integration-methods", IND = "MATH.calculus.indefinite-integrals";
const P = "MATH.algebra.";
export const PF = P + "partial-fractions", LS = P + "linear-systems", L2V = P + "linear-two-variables";
/** a wrong answer is the problem's first modelled bug when it has one (so the module can reason about it), else a readable wrong one */
export const withBugs = (a: Answerer): Answerer => (q, c) => {
  const r = a(q, c);
  if (r === question(q).answer) return r;
  const b = problemOf(q.replace(/:(mc|w)$/, ""))?.bugs?.[0]?.id;
  return (b && misconception(q, new Set([b]))) || r;
};
export const goalLearner = (gap: string[] = [PF]) => withBugs(structuredLearner({ "fam:aupfr": [PF], [PF]: [LS], [LS]: [L2V] }, gap));

export interface GoalStep { where: "goal" | "deep"; step: string; phase: string; qid: string | null; lesson: string | null; correct?: boolean; original?: string; context?: string }
export function goalSession(id: string, target: string, now: number) {
  const s = new SliceSession(`synthetic-goal-${id}`, target, now);
  const c = () => ({ learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now += 60_000).toISOString() });
  s.events.push(make.enrol(c(), 12, "2026-27", latestReleases.find((r) => r.grade === 12)!), make.pathway(c(), target));
  return s;
}
export const goalState = (s: SliceSession) => learnerState(s.learnerId, withDecisions(s.events, s.decisions), s.now, { currentSession: s.session });
/** the screen the flagged app shows for the goal's current step */
export function goalDecision(s: SliceSession, on: boolean, step?: string) {
  const st = goalState(s);
  const comp = step ?? st.next?.competency ?? null;
  if (!comp) return { st, comp, ms: null as ModuleState | null, deep: null };
  const ms = deepGoalModule(on, st.module, st.selectionRecords, st.selectionEvidence, s.now)(comp);
  // as the flagged Module view (Learn.tsx): the deep screen only for the wrapper's own "recover"; the goal's shipped recovery otherwise
  return { st, comp, ms, deep: on && ms.phase === "recover" && ms.original && ms.why === DEEP_GOAL_POLICY ? deepScreen(ms.original, st.selectionRecords, st.selectionEvidence, s.now) : null };
}
/** drive the goal; `until` stops early; `reloadEvery` rebuilds the session from saved records after each action */
export function runGoal(s0: SliceSession, answer: Answerer, o: { on?: boolean; max?: number; until?: (x: GoalStep) => boolean; reloadEvery?: boolean; stopAt?: string } = {}) {
  let s = s0;
  const steps: GoalStep[] = [];
  const taught = () => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
  for (let i = 0; i < (o.max ?? 120); i++) {
    if (o.reloadEvery) s = SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + 60_000, `s${Number(s.session.slice(1)) + 1}`);
    const { comp, ms, deep } = goalDecision(s, o.on ?? true);
    if (!comp || !ms || (o.stopAt && comp !== o.stopAt && steps.some((x) => x.step === o.stopAt))) break;
    let x: GoalStep;
    if (deep) {
      if (deep.kind === "end") { steps.push({ where: "deep", step: comp, phase: deep.phase, qid: null, lesson: null, original: ms.original }); if (deep.phase !== "solved" && deep.phase !== "solved_after_help") break; continue; }
      if (deep.kind === "lesson") { s.taught(deep.module, deep.episode ?? undefined); x = { where: "deep", step: comp, phase: "lesson", qid: null, lesson: deep.competency, original: ms.original }; }
      else { const r = s.submit(deep.qid, answer(deep.qid, { taughtSkills: taught(), answered: s.replies.length, activity: deep.activity }), deep.activity, { context: deep.context }); x = { where: "deep", step: comp, phase: deep.state.phase, qid: deep.qid, lesson: null, correct: r.credit === true, original: ms.original, context: deep.context }; }
    } else if (ms.phase === "chapter" && ms.strategy) { s.taught(ms); x = { where: "goal", step: comp, phase: "lesson", qid: null, lesson: comp }; }
    else if (ms.question) { const act = activityFor(ms); const r = s.submit(ms.question, answer(ms.question, { taughtSkills: taught(), answered: s.replies.length, activity: act }), act, ms.context ? { context: ms.context } : {}); x = { where: "goal", step: comp, phase: ms.phase, qid: ms.question, lesson: null, correct: r.credit === true, ...(ms.context ? { context: ms.context } : {}) }; }
    else if (ms.phase === "recover") { x = { where: "goal", step: comp, phase: "recover", qid: null, lesson: null, original: ms.original }; steps.push(x); break; }
    else { steps.push({ where: "goal", step: comp, phase: ms.phase, qid: null, lesson: null }); break; }
    steps.push(x);
    if (o.until?.(x)) break;
  }
  return { s, steps };
}
