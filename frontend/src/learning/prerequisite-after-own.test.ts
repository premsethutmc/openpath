/**
 * prereq-after-own@1 (on by default; the switch restores the earlier order). A learner who cannot learn a skill until a skill it builds on has been taught:
 * the shipped order teaches the skill itself first, and when every explanation has been tried it paused for a person without
 * ever checking what the skill builds on. With the switch on, the module then checks the skills below, teaches the missing one,
 * gives this skill's explanation again and carries on to a delayed check.
 * Synthetic learner: this shows what the program decides, never that anyone learned.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { runLearner } from "./adaptive-loop";
import { prerequisiteAfterOwn, usePrerequisiteAfterOwn } from "../../../packages/learning/src/intervention";

const T0 = Date.parse("2026-11-12T09:00:00Z");
/** Teaching `skill` does nothing while `needs` is still missing (needs = null: the skill is never learned from teaching). */
function journey(skill: string, needs: string | null) {
  class Lacks extends Set<string> {
    delete(x: string) { return x === skill && (needs === null || this.has(needs)) ? false : super.delete(x); }
  }
  const run = runLearner({ name: "gap-below", lacks: new Lacks(needs ? [skill, needs] : [skill]), learnsFromTeaching: true }, { competency: skill, grade: 5, t0: T0, entry: "module", maxSteps: 120 });
  const taught = run.steps.filter((s) => s.teaching).map((s) => s.teaching!.competency);
  return { taught, final: run.final.status, last: run.steps.at(-1)!.phase, paused: run.next?.paused?.length ?? 0 };
}
const S = "MATH.number.decimal-tenths", P = "MATH.number.fraction-add-like";

test("switched off (the earlier order): every explanation of the skill is tried, then the module pauses; the skill below is never taught", () => {
  usePrerequisiteAfterOwn(false);
  const r = journey(S, P);
  usePrerequisiteAfterOwn(true);
  assert.ok(r.taught.includes(S));
  assert.ok(!r.taught.includes(P), "the missing skill below was not looked at");
  assert.match(r.last, /^pause/);
  assert.notEqual(r.final, "verified");
});

test("on: the missing skill below is found and taught, this skill is explained again, and the learner reaches a verified delayed check", () => {
  usePrerequisiteAfterOwn(true);
  try {
    const r = journey(S, P);
    const firstP = r.taught.indexOf(P);
    assert.ok(firstP > 0, "the skill itself was taught first, then the skill below");
    assert.ok(r.taught.slice(0, firstP).every((c) => c === S));
    assert.ok(r.taught.slice(firstP + 1).includes(S), "this skill's explanation was given again after the skill below was taught");
    assert.equal(r.final, "verified");
  } finally {
    usePrerequisiteAfterOwn(true);
  }
});

test("on: when nothing below is missing, the module still pauses for a person (no loop)", () => {
  usePrerequisiteAfterOwn(true);
  try {
    const r = journey(S, null);
    assert.match(r.last, /^pause/);
    assert.notEqual(r.final, "verified");
    assert.ok(r.taught.filter((c) => c === S).length <= 6, "the skill's explanations are not repeated without a lesson below");
  } finally {
    usePrerequisiteAfterOwn(true);
  }
});

test("it is on by default", () => {
  assert.equal(prerequisiteAfterOwn(), true);
});
