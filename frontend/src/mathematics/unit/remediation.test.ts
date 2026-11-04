/**
 * The unit's adaptive help, end to end: six synthetic learner journeys (see journeys.ts) and the rules behind them.
 * These check what the program does for each kind of learner. They are not evidence of learning gains.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { activeBranch, decide, graphLinks, rule, ruleState, transferFindings, UNIT_PLANNER_POLICY } from "../../../../packages/mathematics/src/remediation";
import { PLANNER_POLICY_DRAFT } from "../../../../packages/english-core/src/planner";
import { replay, standing, unit, type UnitActivity } from "../../../../packages/mathematics/src/unit";
import { JOURNEYS, run } from "./journeys";

const J = Object.fromEntries(JOURNEYS.map((j) => [j.id, run(j)]));
const help = (id: string) => J[id].trace.filter((t) => t.event !== "answer");
const taught = (id: string) => J[id].trace.filter((t) => t.event === "teach").map((t) => `${t.rule}/${t.strategy}`);

test("weak foundations: prerequisite teaching first, inside step 1, then back to the lesson", () => {
  const r = J["weak-foundations"];
  assert.deepEqual(taught("weak-foundations"), ["expand/area_model", "roots/two_numbers", "roots/undo_and_check"]);
  assert.ok(help("weak-foundations").every((t) => t.stage === "prereq"), "taught before completing the square itself starts");
  // one wrong answer is not yet a gap: the first prerequisite lesson opens only after the second observation
  const first = r.trace.findIndex((t) => t.event === "teach");
  assert.deepEqual(r.trace.slice(0, first).filter((t) => t.event === "answer" && !t.correct).map((t) => t.question), ["p1", "d1", "ds1"]);
  assert.equal(r.outcomes.expand, "improved-after-help");
  assert.equal(r.outcomes.roots, "improved-after-help", "the second, different explanation worked after the first did not");
  assert.equal(r.state.completed.length, 9, "the whole unit is still finished");
});

test("the same mistake twice: a different explanation each time, ending in the prerequisite; not the same one repeated", () => {
  const t = help("same-mistake");
  assert.equal(t[0].event, "first-difficulty");
  assert.match(t[0].reason!, /similar worked example/, "first difficulty: the error explained and a similar worked example");
  assert.deepEqual(taught("same-mistake"), ["term/match_the_identity", "term/prerequisite_review"], "two different strategies, never the same twice");
  assert.ok(t.find((x) => x.event === "teach" && x.strategy === "prerequisite_review")!.reason!.includes("squaring a bracket"), "the third level goes back to the prerequisite");
  assert.equal(J["same-mistake"].outcomes.term, "improved-after-help");
  assert.equal(J["same-mistake"].trace.filter((x) => x.event === "check").length, 2, "each strategy ends with one fresh question done alone");
});

test("procedure right but transfer wrong: diagnosed first, then application-specific teaching (not the formula again)", () => {
  const r = J.transfer;
  const findings = transferFindings(r.state);
  const byQ = Object.fromEntries(findings.map((f) => [f.question, f]));
  assert.deepEqual([byQ.t1, byQ.t3, byQ.t5, byQ.t6].map((f) => f.status === "classified" && `${f.rule}/${f.basis}`), ["extreme/parts-right", "recognise/parts-right", "solve/probe", "context/signal"]);
  assert.deepEqual(taught("transfer"), ["extreme/minimum_explorer", "recognise/spot_the_structure", "solve/four_moves", "context/check_against_the_story"]);
  // the minimum question is answered with teaching about the minimum, not about the method
  const afterT1 = r.trace.slice(r.trace.findIndex((t) => t.question === "t1"));
  assert.equal(afterT1.find((t) => t.event === "teach")!.rule, "extreme");
  assert.equal(r.trace.filter((t) => t.event === "diagnose").length, 3, "a quick question only when the answer itself is ambiguous (not for t6's −10)");
});

test("an ambiguous answer is never read as a specific misconception", () => {
  // t1 answered 13: no signal; until the quick question is answered, nothing is taught
  const ev = (action: UnitActivity["action"], extra: Partial<UnitActivity> = {}): UnitActivity => ({ kind: "math_activity", program: unit.id, id: `a${Math.random()}`, at: "2026-10-19T10:00:00.000Z", learnerId: "L", journey: "jee-main", lessonVersion: unit.version, action, stage: "transfer", elapsedMs: 1, sessionId: "math:L:v", ...extra });
  const { state } = replay("L", [ev("answer", { questionId: "t1", response: "13" })], "2026-10-19T10:01:00.000Z");
  const b = activeBranch(state, "2026-10-19T10:01:00.000Z", "math:L:v");
  assert.equal(b?.kind, "diagnose");
  assert.equal(rule("extreme") && decide(state, rule("extreme"), "2026-10-19T10:01:00.000Z", "math:L:v").action, "assess", "the planner keeps assessing: no teaching yet");
});

test("a strong student advances without any help branch", () => {
  assert.deepEqual(help("strong"), []);
  assert.ok(Object.values(J.strong.outcomes).every((o) => o === "none"));
  assert.notEqual(J.strong.profileStatus, "verified");
});

test("a returning learner resumes the unfinished help, then the lesson, at the same place", () => {
  const r = J.returning;
  assert.deepEqual(r.resumedWith, { branch: "check", stage: "prereq", part: 2 }, "back in the middle of the help (its check), and the lesson position unchanged");
  const v2 = r.trace.filter((t) => t.visit === 2);
  assert.equal(v2[0].question, "prc1", "the first thing on return is the help's own check");
  assert.equal(r.outcomes.roots, "improved-after-help");
  assert.ok(r.state.visits >= 2);
});

test("still struggling after support: a calm pause after two strategies, said once, and the unit goes on", () => {
  const r = J["still-struggling"];
  assert.deepEqual(taught("still-struggling"), ["expand/area_model", "expand/multiply_it_out"]);
  const pauses = r.trace.filter((t) => t.event === "pause");
  assert.equal(pauses.length, 1, "said once, not repeated");
  assert.match(pauses[0].reason!, /not a failure/);
  assert.match(pauses[0].planner!, /^recommend_human/);
  assert.equal(r.outcomes.expand, "paused-ask-a-person");
  assert.equal(r.state.completed.length, 9, "nothing is blocked: the unit is completed");
  assert.ok(r.trace.length < 120, "bounded");
});

test("the help is a temporary branch: completion, resume point and the nine steps are untouched", () => {
  for (const r of Object.values(J)) {
    assert.equal(r.state.completed.length, 9, r.journey.id);
    assert.deepEqual(r.state.completed, unit.stages.map((s) => s.id));
  }
  // help questions never count towards finishing a step
  for (const s of unit.stages) assert.ok(s.questions.every((q) => !unit.questions.find((x) => x.id === q)!.role));
});

test("evidence: guided help is assisted, checks are independent; the shared gate holds everything; nothing verifies", () => {
  const r = J["weak-foundations"];
  const { ledger, profile } = replay("learner:journey", r.events, "2026-11-30T00:00:00.000Z");
  const kinds = ledger.events.reduce<Record<string, number>>((t, e) => ({ ...t, [e.kind]: (t[e.kind] ?? 0) + 1 }), {});
  assert.equal(kinds.intervention, 3, "each teaching block is recorded in the shared ledger as an intervention");
  assert.ok(ledger.decisions.every((d) => d.verdict !== "accepted"), "provisional content: the gate holds every answer");
  assert.notEqual(profile.status, "verified");
  assert.equal(r.state.answers.px1.assisted, true, "the guided answer is help");
  assert.equal(r.state.answers.pxc1.assisted, false, "the check is the learner's own");
  assert.ok(r.state.attempts.length >= Object.keys(r.state.answers).length, "every attempt is kept");
});

test("progress after a failed revision is kept, and independent work is reported apart from helped work", () => {
  const j = { ...JOURNEYS.find((x) => x.id === "strong")!, id: "failed-revision", answers: { r1: "-8,-4", r2: "3,2,1", r3: "B" } };
  const r = run(j);
  assert.equal(r.state.completed.length, 9, "the revision step is finished even with wrong answers: nothing is erased");
  const st = standing(r.state, { status: r.profileStatus });
  assert.equal(st.byPhase.retention.correct, 0);
  assert.equal(st.byPhase.independent.correct, 6, "earlier independent work is still shown");
});

test("skipping help is recorded and shown as unsupported progress, not understanding", () => {
  const base = run(JOURNEYS.find((x) => x.id === "weak-foundations")!);
  const firstTeach = base.events.findIndex((e) => e.action === "teach");
  const events = base.events.slice(0, firstTeach);
  const at = new Date(Date.parse(events.at(-1)!.at) + 1000).toISOString();
  events.push({ ...events.at(-1)!, id: "skip-1", at, action: "skip", response: "expand", questionId: undefined });
  const { state } = replay("learner:journey", events, at);
  assert.equal(activeBranch(state, at, events.at(-1)!.sessionId!), null, "the learner can set the help aside");
  assert.equal(ruleState(state, rule("expand")).status, "weak", "the gap is still recorded");
});

test("prerequisites point to the curriculum graph; the planner policy only sets this unit's block size", () => {
  const links = Object.fromEntries(graphLinks().map((l) => [l.rule, l]));
  assert.equal(links.expand.competency, "MATH.algebra.identities");
  assert.equal(links.expand.upstreamOfUnit, true);
  assert.equal(links.balance.upstreamOfUnit, true);
  assert.equal(links.roots.competency, "MATH.number.square-roots");
  assert.equal(links.roots.upstreamOfUnit, false, "a finding to review: the graph does not list square roots before quadratics");
  for (const k of ["diagnosticMax", "hintLevels", "maxStrategiesBeforeHuman", "retentionGapDays", "retentionItems"] as const) assert.equal(UNIT_PLANNER_POLICY[k], PLANNER_POLICY_DRAFT[k], k);
});
