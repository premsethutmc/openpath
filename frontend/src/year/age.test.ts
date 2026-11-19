import assert from "node:assert/strict";
import { test } from "node:test";
import { ageFindings, limitsFor } from "../../../packages/learning/src/age";

const classOf = (skill: string) => (({ "MATH.number.lcm": 4 } as Record<string, number>)[skill] ?? null);
const kinds = (cls: number, prompt: string, steps: [string, string][]) => ageFindings(cls, prompt, steps.map(([next, shown]) => ({ next, shown })), classOf).map((f) => f.kind);

test("age@1: a help is held to what its class reads and has been taught, and never blamed for what the question itself uses", () => {
  assert.deepEqual(kinds(3, "23 + 45 = ?", [["First: add the ones.", "3 + 5 = 8"], ["Last: add the tens.", "2 + 4 = 6"]]), []);
  assert.deepEqual(kinds(3, "What comes next: 5700, 5690, 5680?", [["First: find the step.", "5680 − 5690 = −10: the step"]]), ["maths-not-yet-taught"]);
  assert.deepEqual(kinds(6, "What comes next: 5700, 5690, 5680?", [["First: find the step.", "5680 − 5690 = −10: the step"]]), [], "Class 6 has met negative numbers");
  assert.deepEqual(kinds(5, "(−3) + 5 = ?", [["First: start at −3.", "Move 5 to the right: 2"]]), [], "the question itself uses a negative number");
  assert.deepEqual(kinds(2, "12 + 9 = ?", [["First: add.", "12 + 9 = 21.5"]]), ["maths-not-yet-taught"], "a decimal before Class 4");
  assert.deepEqual(kinds(5, "A machine adds 4. What comes out?", [["First: add.", "Start with y and do what the machine does: y + 4"]]), ["maths-not-yet-taught"], "a letter for a number before Class 6");
  assert.deepEqual(kinds(4, "Share 348 among 6.", [["First: how many 6s fit in 34?", "5, because 6 × 5 = 30"]]), [], "'6s' is not algebra");
  assert.deepEqual(kinds(1, "5 − 2 = ?", [["First: write the subtraction.", "5 − 2 = 3"]]), [], "a school word of that class is not a long word");
  assert.deepEqual(kinds(5, "Is the claim true?", [["Last: decide.", "52 fits the first part but not the second, so it is a counterexample"]]), ["long-word"]);
  assert.deepEqual(kinds(1, "3 + 4 = ?", [["Last: add.", "2952 + 4005 = 6957"]]), ["number-too-big"]);
  assert.deepEqual(kinds(1, "2952 + 4005 = ?", [["Last: add.", "2952 + 4005 = 6957"]]), [], "a question about big numbers sets its own scale");
  assert.deepEqual(kinds(2, "Add.", [["First: read it.", "Make a grid of people and things and put a cross for every clue that rules a pair out and a tick for every one that fixes it"]]), ["long-sentence"]);
  assert.deepEqual(kinds(2, "3 + 4 = ?", Array.from({ length: 6 }, (_, i) => [`Next: step ${i}.`, "1 + 1 = 2"] as [string, string])), ["too-many-steps"]);
  assert.ok(limitsFor(1).words < limitsFor(5).words && limitsFor(5).words < limitsFor(9).words && !limitsFor(5).negatives && limitsFor(6).negatives);
});
