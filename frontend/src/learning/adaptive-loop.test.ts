/**
 * Stage A1: the adaptive loop through the real engine (synthetic learners; see adaptive-loop.ts). These check the
 * safeguards and the connections, from what the engine decided; the learners' behaviour, not the outcome, is scripted.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAS } from "./adaptive-loop";

const runs = Object.fromEntries(PERSONAS().map((p) => { const r = p.run(); return [r.learner, r]; }));
const taught = (r: (typeof runs)[string]) => r.steps.filter((s) => s.teaching).map((s) => s.teaching!.competency);

test("every persona: draft content never verifies mastery (the shared engine holds provisional evidence)", () => {
  for (const r of Object.values(runs)) {
    assert.notEqual(r.final.status, "verified", r.learner);
    assert.ok(r.steps.every((s) => !s.evidence || s.evidence.engine === "unavailable"), r.learner);
  }
});

test("A: one isolated slip is investigated, not taught; the skill is shown on later independent answers", () => {
  const r = runs["A-strong-one-slip"];
  const slip = r.steps.find((s) => s.grading?.credit === false)!;
  assert.equal(slip.path, "practice");
  assert.ok(r.steps.some((s) => s.path === "recovery" && s.phase === "investigate"), "the wrong answer is investigated");
  assert.deepEqual(taught(r), [], "no lesson for a slip");
  assert.ok(["independent", "transfer"].includes(r.final.status));
  assert.equal(r.final.retention, "passed");
});

test("B: a wrong practice answer → diagnosis → the supporting skill's module teaches → independent check → back to the problem", () => {
  const r = runs["B-prerequisite-gap"];
  const plan = r.steps.find((s) => s.reasoning?.status === "established")!.reasoning!;
  const support = plan.plan!.replace(/^support:/, "");
  assert.notEqual(support, r.competency, "the diagnosis points to another skill");
  assert.equal(taught(r)[0], support, "that skill is taught first");
  const teachAt = r.steps.findIndex((s) => s.teaching);
  assert.ok(r.steps.slice(teachAt).some((s) => s.activity === "check" && s.grading?.credit === true && !s.hints), "an independent check after teaching");
  assert.ok(r.steps.some((s) => s.phase === "solved_after_help"), "the original problem, solved again, counts as help");
});

test("B2 (known gap A1-G2): from the Assessment stage the same learner is never routed to the supporting skill", () => {
  const r = runs["B2-prerequisite-gap-assessment-entry"];
  assert.ok(taught(r).length > 0 && taught(r).every((c) => c === r.competency), `taught: ${taught(r)}`);
  assert.ok(!["independent", "transfer", "verified"].includes(r.final.status));
});

test("C: success only with hints is never independent evidence, and the engine stops for a person", () => {
  const r = runs["C-assisted-only"];
  assert.ok(r.steps.filter((s) => s.grading?.credit === true).every((s) => (s.hints ?? 0) > 0), "every right answer was helped");
  assert.equal(r.final.independent.split("/")[0], "0");
  assert.equal(r.final.status, "guided");
  assert.ok(r.steps.some((s) => s.phase.startsWith("pause")), "recommend a teacher");
});
