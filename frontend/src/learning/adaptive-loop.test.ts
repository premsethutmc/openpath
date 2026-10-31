/**
 * Stage A1: the adaptive loop through the real engine (synthetic learners; see adaptive-loop.ts). These check the
 * safeguards and the connections, from what the engine decided; the learners' behaviour, not the outcome, is scripted.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAS, runLearner, T0 } from "./adaptive-loop";

const runs = Object.fromEntries(PERSONAS().map((p) => { const r = p.run(); return [r.learner, r]; }));
const taught = (r: (typeof runs)[string]) => r.steps.filter((s) => s.teaching).map((s) => s.teaching!.competency);

test("every persona: draft content never verifies mastery (the shared engine holds provisional evidence)", () => {
  for (const r of Object.values(runs)) {
    assert.notEqual(r.final.status, "verified", r.learner);
    assert.ok(r.steps.every((s) => !s.evidence || s.evidence.engine === "unavailable"), r.learner);
  }
});

test("A: one isolated slip leads to no remediation and no false help label; earlier evidence is kept", () => {
  const r = runs["A-strong-one-slip"];
  const slip = r.steps.find((s) => s.grading?.credit === false)!;
  assert.equal(slip.path, "practice");
  assert.deepEqual(taught(r), [], "no lesson for a slip");
  // no written misunderstanding is in play after an unexplained wrong answer, so no follow-up questions are asked
  assert.equal(r.steps.filter((s) => s.phase === "investigate").length, 0);
  assert.ok(r.steps.some((s) => s.phase === "solved_on_retry"), "a plain second try is not called help");
  assert.ok(!r.steps.some((s) => s.phase === "solved_after_help"));
  // the retry is still not a first, unaided answer (assisted@1 unchanged)
  const retry = r.steps.find((s) => s.phase === "return")!;
  assert.equal(retry.evidence!.assisted, "1/1");
  assert.ok(["independent", "transfer"].includes(r.final.status));
});

test("B: Practice entry → diagnosis → a machine-checked lesson for the supporting skill → independent check → back to the problem", () => {
  const r = runs["B-prerequisite-gap"];
  const plan = r.steps.find((s) => s.reasoning?.status === "established")!.reasoning!;
  const support = plan.plan!.replace(/^support:/, "");
  assert.notEqual(support, r.competency, "the diagnosis points to another skill");
  const lesson = r.steps.find((s) => s.teaching)!.teaching!;
  assert.equal(lesson.competency, support, "that skill is taught first");
  assert.equal(lesson.review, "machine-checked");
  assert.ok(lesson.sections.every((x) => x.violations.length === 0), "no lesson that fails the teaching checks");
  const teachAt = r.steps.findIndex((s) => s.teaching);
  assert.ok(r.steps.slice(teachAt).some((s) => s.activity === "check" && s.grading?.credit === true && !s.hints), "an independent check after teaching");
  assert.ok(r.steps.some((s) => s.phase === "solved_after_help"), "solved after teaching counts as help");
});

test("B2: Assessment entry reaches the same investigation and the same supporting skill as Practice", () => {
  const p = runs["B-prerequisite-gap"], a = runs["B2-prerequisite-gap-assessment-entry"];
  const est = (r: typeof a) => r.steps.find((s) => s.reasoning?.status === "established")!.reasoning!;
  assert.equal(est(a).best, est(p).best);
  assert.equal(est(a).plan, est(p).plan);
  assert.equal(taught(a)[0], taught(p)[0]);
  assert.ok(a.steps.some((s) => s.path === "module" && s.phase === "recover"));
  // after it, the skill itself is checked on new questions alone, not taught again
  const back = a.steps.findIndex((s) => s.phase === "return");
  assert.ok(!a.steps.slice(back).some((s) => s.teaching && s.teaching.competency === a.competency));
});

test("C: success only with hints is never independent evidence; the pause is respected by the next action", () => {
  const r = runs["C-assisted-only"];
  assert.ok(r.steps.filter((s) => s.grading?.credit === true).every((s) => (s.hints ?? 0) > 0), "every right answer was helped");
  assert.equal(r.final.independent.split("/")[0], "0");
  assert.equal(r.final.status, "guided");
  assert.ok(r.steps.some((s) => s.phase.startsWith("pause")), "the engine stops for a person");
  assert.ok(r.next!.paused.includes(r.competency), "listed as paused");
  assert.notEqual(r.next!.competency, r.competency, "and never offered as \"carry on\"");
});

test("every lesson the personas were given passed the teaching checks (none presented as educator-approved)", () => {
  for (const r of Object.values(runs)) for (const s of r.steps) if (s.teaching) {
    assert.ok(s.teaching.sections.every((x) => x.violations.length === 0), `${r.learner}: ${s.teaching.strategy}`);
    assert.notEqual(s.teaching.review, "educator-approved");
  }
});

test("a single slip after the skill was shown does not erase it", () => {
  const r = runLearner({ name: "A-shown-then-slip", lacks: new Set(), slipAt: 4 }, { competency: "MATH.algebra.arithmetic-sequences", grade: 10, t0: T0, entry: "practice" });
  const slip = r.steps.find((s) => s.grading?.credit === false)!;
  const before = r.steps[slip.n - 2];
  assert.ok(["independent", "transfer"].includes(before.evidence!.status), `shown before the slip: ${before.evidence!.status}`);
  assert.ok(["independent", "transfer"].includes(slip.evidence!.status), `still shown after it: ${slip.evidence!.status}`);
  assert.deepEqual(taught(r), []);
});
