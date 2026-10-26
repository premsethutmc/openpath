import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessWorking, verifyWorkingStep, correctnessOf, type Outcome } from "./working-assessment.ts";

const T = JSON.parse(readFileSync(new URL("../../../../tools/mathematics/core/teacher/examples.json", import.meta.url), "utf8")).examples as any[];
test("teacher examples (independently checked by check_teacher.py): adapter outcome equals the stated outcome", () => {
  for (const ex of T) {
    const r = assessWorking(ex.problem, ex.lines);
    assert.equal(r.outcome, ex.expected.outcome, `${ex.id}: ${r.summary}`);
    if (ex.expected.outcome === "invalid") { assert.equal(r.firstInvalidStep, ex.expected.first_invalid ?? null, ex.id); assert.equal(r.invalidAt, ex.expected.invalid_at, ex.id); }
  }
});
test("refusal is never correctness: ambiguous, unsupported and incomplete have correct = null; only verified is true, only invalid is false", () => {
  const seen = new Map<Outcome, unknown>();
  for (const ex of T) { const r = assessWorking(ex.problem, ex.lines); seen.set(r.outcome, r.correct); assert.equal(r.correct, correctnessOf(r.outcome)); assert.equal(r.advisory, true); }
  assert.deepEqual([...seen.entries()].sort(), [["ambiguous", null], ["incomplete", null], ["invalid", false], ["unsupported", null], ["verified", true]]);
});
test("valid alternative methods reach the same verified outcome", () => {
  assert.equal(assessWorking("2(x - 3) = 10", ["2x - 6 = 10", "2x = 16", "x = 8"]).outcome, "verified");
  assert.equal(assessWorking("2(x - 3) = 10", ["x - 3 = 5", "x = 8"]).outcome, "verified");
  assert.equal(assessWorking("2(x - 3) = 10", ["2x = 16", "x = 8"]).outcome, "verified");
});
test("first incorrect step is located and later lines do not hide it", () => {
  const r = assessWorking("3x + 5 = 20", ["3x = 15", "x = 6", "x = 6"]);
  assert.equal(r.outcome, "invalid"); assert.equal(r.firstInvalidStep, 2); assert.equal(r.invalidAt, "step");
});
test("case split: complete is verified; dropping the x = 0 case, or a false case, is invalid", () => {
  const p = "x(x - 3) = 5x";
  assert.equal(assessWorking(p, ["case x = 0: 0 = 0", "case x != 0: x - 3 = 5", "x = 8", "x = 0 or x = 8"]).outcome, "verified");
  assert.equal(assessWorking(p, ["case x = 0: 0 = 0", "case x != 0: x - 3 = 5", "x = 8"]).outcome, "invalid");
  assert.equal(assessWorking(p, ["case x = 0: 1 = 0", "case x != 0: x - 3 = 5", "x = 8", "x = 0 or x = 8"]).firstInvalidStep, 1);
});
test("unsupported notation or an unreadable problem is reported as unsupported, never as right or wrong", () => {
  for (const [p, l] of [["2x + 1 = 7", ["|x| + 1 = 4", "x = 3"]], ["2x + 1 = 7", ["√9x + 1 = 7"]], ["sin(x) = 1", ["x = 1"]], ["not an equation", ["x = 1"]]] as [string, string[]][]) {
    const r = assessWorking(p, l); assert.equal(r.outcome, "unsupported", p + " " + l); assert.equal(r.correct, null);
  }
});
test("an earlier unsupported line never lets a later step be certified as a complete correct working", () => {
  const r = assessWorking("2x + 1 = 7", ["√9x + 1 = 7", "3x = 6", "x = 2"]);
  assert.notEqual(r.outcome, "verified"); assert.equal(r.correct, null);
});
test("single-step verification keeps equivalence, implication and loss apart and refuses what it cannot analyse", () => {
  assert.deepEqual(verifyWorkingStep("2x = 6", "2x = 6", "x = 3").effect, "equivalence");
  assert.equal(verifyWorkingStep("2x = 6", "2x = 6", "2x(x - 1) = 6(x - 1)").effect, "implication");
  const lost = verifyWorkingStep("x(x - 3) = 5x", "x(x - 3) = 5x", "x - 3 = 5"); assert.equal(lost.outcome, "invalid"); assert.equal(lost.correct, false);
  const u = verifyWorkingStep("x = 1", "x = 1", "sqrt(x) = 1"); assert.equal(u.outcome, "unsupported"); assert.equal(u.correct, null);
});
test("the documented unsupported restriction suffix is refused, not guessed", () => {
  const r = assessWorking("(x^2 - 4)/(x - 2) = 4", ["x + 2 = 4, x ≠ 2"]);
  assert.equal(r.outcome, "unsupported"); assert.equal(r.correct, null);
});
