/**
 * deep-recovery@0 on ONE learning goal (learning/deep-goal.ts; research switch, default off), driven as the flagged app drives it
 * (deep-goal-driver.ts): the goal's next step, the goal's own module decision, deep recovery where that decision is "recover",
 * back to a fresh problem of the goal's step, the goal carries on. Synthetic learners only: not evidence that anyone learned.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { problemKeyOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { withDecisions } from "../../../packages/learning/src/records";
import { DEEP_GOAL_POLICY, DEEP_GOAL_TARGETS, deepGoalModule } from "../learning/deep-goal";
import { goalDecision, goalSession, goalState, IND, OWN, runGoal, withBugs, type GoalStep } from "./deep-goal-driver";
import { structuredLearner } from "./deep-recovery-journey";
import { misconception } from "./learners";
import { SliceSession } from "./session";
import { usePrerequisiteAfterOwn, useUnteachableFixture } from "../../../packages/learning/src/intervention";
// The deep-recovery research prototype is defined over the earlier stop ("#115's stop": every explanation tried, then a person),
// so these tests run with prereq-after-own@1 off, and with integers as the skill that has no teachable lesson (a fixture now
// that the real integers lesson is repaired).
usePrerequisiteAfterOwn(false);
useUnteachableFixture(["MATH.number.integers"]);

const T0 = Date.parse("2026-11-05T09:00:00Z");
const EXP = "MATH.number.exponents", MT = "MATH.number.multiplication-tables";
const single = () => withBugs(structuredLearner({ "fam:subst": [EXP] }, [EXP]));
const multi = () => withBugs(structuredLearner({ "fam:subst": [EXP], [EXP]: [MT] }, [EXP, MT]));
const tr = (xs: GoalStep[]) => xs.map((x) => `${x.where[0]}:${x.step.split(".").pop()}:${x.phase}${x.lesson ? "=" + x.lesson.split(".").pop() : ""}${x.correct === undefined ? "" : x.correct ? "+" : "-"}`).join(" ");

function checkReturn(steps: GoalStep[], taughtExpected: string[]) {
  const t = tr(steps);
  const deep = steps.filter((x) => x.where === "deep");
  assert.ok(deep.length > 0, `deep recovery ran on the goal's step: ${t}`);
  const orig = deep[0].original!;
  assert.equal(question(orig).competency, OWN, "it started from the goal step's own wrong answer");
  assert.deepEqual(deep.filter((x) => x.phase === "lesson").map((x) => x.lesson), taughtExpected, t);
  const route = goalState(goalSession("route", OWN, T0)).selectionRecords.readinessRoute!;
  for (const l of taughtExpected) assert.ok(!route.includes(l), `${l} is below the goal's route`);
  const returns = deep.filter((x) => x.phase === "return");
  assert.ok(returns.length >= 2 && returns.slice(-2).every((x) => x.correct), `two fresh unaided answers on the goal's step: ${t}`);
  for (const r of returns) { assert.equal(question(r.qid!.replace(/:(mc|w)$/, "")).competency, OWN); assert.notEqual(problemKeyOf(r.qid!), problemKeyOf(orig)); }
  for (const x of deep) if (x.context) assert.ok(x.context.startsWith(`deep:${orig}|`) && x.context.length <= 600);
}

test("goal (integration-methods): the route never contains the algebra/number skills its problems rest on", () => {
  const s = goalSession("route", OWN, T0);
  assert.deepEqual(goalState(s).selectionRecords.readinessRoute, [IND, OWN]);
  assert.ok(DEEP_GOAL_TARGETS.has(OWN) && DEEP_GOAL_TARGETS.size === 2, "two explicitly configured goals only");
});

test("goal, single gap: the goal's step goes down to exponents, teaches it, returns to fresh problems of the goal's step; the goal carries on", () => {
  const s = goalSession("single", OWN, T0);
  const { steps, s: end } = runGoal(s, single());
  assert.deepEqual([...new Set(steps.filter((x) => x.where === "goal").map((x) => x.step))], [IND, OWN], "the goal's own order");
  checkReturn(steps, [EXP]);
  const d = goalDecision(end, true, OWN);
  assert.notEqual(d.ms!.phase, "recover", "the episode is over: the goal's own decision again");
  assert.notEqual(d.ms!.why, DEEP_GOAL_POLICY);
  assert.equal(d.st.next?.kind, "none", "the goal's route is complete by its own rule");
  assert.match(d.st.next!.reason, /requirements on this route are shown/);
});

test("goal, two gaps: exponents rests on multiplication tables; both taught bottom-up, back to the goal's step", () => {
  const { steps } = runGoal(goalSession("multi", OWN, T0), multi());
  checkReturn(steps, [MT, EXP]);
});

test("goal: a reload (or sign-out) after every action resumes the same goal step and recovery from saved records only", () => {
  const a = runGoal(goalSession("reload", OWN, T0), single());
  const b = runGoal(goalSession("reload", OWN, T0), single(), { reloadEvery: true });
  assert.equal(tr(b.steps), tr(a.steps));
  // mid-recovery: the goal step stays on the same deep screen
  const mid = runGoal(goalSession("mid", OWN, T0), single(), { until: (x) => x.where === "deep" && x.phase === "lesson" });
  const before = goalDecision(mid.s, true);
  const after = goalDecision(SliceSession.fromEvents(mid.s.learnerId, OWN, withDecisions(mid.s.events, mid.s.decisions), mid.s.now + 600_000, "s9"), true);
  assert.equal(after.comp, OWN);
  assert.equal(after.ms!.why, DEEP_GOAL_POLICY);
  assert.deepEqual([after.deep?.kind, after.deep?.kind === "ask" && after.deep.qid], [before.deep?.kind, before.deep?.kind === "ask" && before.deep.qid]);
});

test("goal, switch off: the goal's shipped decision, unchanged (the shipped two-level recovery)", () => {
  const { steps, s } = runGoal(goalSession("off", OWN, T0), single(), { on: false });
  assert.equal(steps.at(-1)!.phase, "recover");
  assert.ok(!steps.some((x) => x.where === "deep"));
  const st = goalState(s);
  const shipped = st.module(OWN), wrapped = deepGoalModule(false, st.module, st.selectionRecords, st.selectionEvidence, s.now)(OWN);
  assert.deepEqual(wrapped, shipped);
});

test("untouched goal (place-value-tens), switch ON: every decision equals the switch-off decision", () => {
  const PV = "MATH.number.place-value-tens", CMP = "MATH.number.compare-numbers";
  const learner = withBugs(structuredLearner({ [PV]: [CMP] }, [CMP]));
  const on = runGoal(goalSession("pv", PV, T0), learner, { on: true, max: 40 });
  const off = runGoal(goalSession("pv", PV, T0), learner, { on: false, max: 40 });
  assert.equal(tr(on.steps), tr(off.steps));
  assert.ok(!on.steps.some((x) => x.where === "deep"));
  // and decision by decision, for every step of that route
  const st = goalState(on.s);
  for (const c of st.selectionRecords.readinessRoute!) assert.deepEqual(deepGoalModule(true, st.module, st.selectionRecords, st.selectionEvidence, on.s.now)(c), st.module(c), c);
  void misconception; void graph;
});

test("goal: no year plan without a goal is touched (no pathway record: the wrapper returns the plain decision)", () => {
  const s = new SliceSession("synthetic-nogoal", OWN, T0);
  const st = goalState(s);
  assert.deepEqual(deepGoalModule(true, st.module, st.selectionRecords, st.selectionEvidence, s.now)(OWN), st.module(OWN));
});
