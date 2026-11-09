/** lesson-checks@1: the review findings as checks. Detectors on hand-made sections, then the ratchet on Grades 7–8. */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { BASELINE_FILE, SCOPE, findingsFor } from "../../../packages/learning/scripts/lesson-checks";
import { CHECKS, countByCheck, detect, type CheckId } from "../../../packages/learning/src/lesson-checks";
import type { LessonBlock } from "../../../packages/learning/src/teaching-contract";

const block = (b: Partial<LessonBlock>): LessonBlock => ({ role: "concept", label: "", title: "t", text: [], instance: null, worked: null, representation: null, visual: null, widget: null, claims: { verified: [], review: [] }, violations: [], ...b }) as LessonBlock;

describe("lesson-checks@1 detectors (the review's own examples)", () => {
  test("exponent read as a factor (M4), not a true product", () => {
    assert.equal(detect.exponentAsFactor("0 × 4³ = 0", "0 × 4 × 3 = 0."), true);
    assert.equal(detect.exponentAsFactor("0 × 4^1 = 0", "0 × 4 × 1 = 0"), true);
    assert.equal(detect.exponentAsFactor("2 × 4³ = 128", "4³ = 4 × 4 × 4 = 64, then 2 × 64 = 128"), false);
    assert.equal(detect.exponentAsFactor("3³ = 27", "3 × 3 × 3 = 27"), false);
  });
  test("a misconception section with only the wrong answer (m2), not one that gives a reason", () => {
    assert.equal(detect.misconceptionNoReason(block({ role: "misconception", text: ["A question: “…” A common wrong answer is 4."] })), true);
    assert.equal(detect.misconceptionNoReason(block({ role: "misconception", text: ["A question: “…” A common wrong answer is 18.", "The sides were subtracted."] })), false);
    assert.equal(detect.misconceptionNoReason(block({ role: "concept", text: ["A common wrong answer is 4."] })), false);
  });
  test("a picture named but not drawn (m5); option letters with no options (m10); n! early (m9); 1 with a plural (m14)", () => {
    assert.equal(detect.pictureMissing(block({}), ["c² = a² + b², as in the picture."]), true);
    assert.equal(detect.pictureMissing(block({ figure: { type: "table" } }), ["as in the picture"]), false);
    assert.equal(detect.optionNotShown(block({}), ["So the answer is option C"]), true);
    assert.equal(detect.optionNotShown(block({ worked: { question: "q", options: ["a", "b", "c"], steps: [], verified: true, source: "contract" } }), ["option C"]), false);
    assert.equal(detect.factorial(["the other 2 can be arranged in 2! ways"]), true);
    assert.equal(detect.factorial(["Well done!", "x != 3"]), false);
    assert.equal(detect.singularPlural(["The values in the class: 9; there are 1"]), true);
    assert.equal(detect.singularPlural(["1 parts: 1 × ₹180 = ₹180"]), true);
    assert.equal(detect.singularPlural(["the top is 1, 3, 3, 1 times the bottom", "So n squares need 3n + 1 sticks", "1 part"]), false);
  });
});

describe("lesson-checks@1 on Grades 7 and 8 (both boards), as a learner of the grade sees each lesson", () => {
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")).counts as Record<string, Record<CheckId, number>>;
  for (const { grade, board } of SCOPE) {
    test(`${board} Grade ${grade}: no count rises above the baseline; no later-grade section is shown`, () => {
      const counts = countByCheck(findingsFor(board, grade));
      assert.equal(counts["above-grade-section"], 0);
      const was = baseline[`${board}-g${grade}`];
      assert.ok(was, `${board}-g${grade} is in the baseline`);
      const rose = (Object.keys(CHECKS) as CheckId[]).filter((c) => counts[c] > (was[c] ?? 0)).map((c) => `${c}: ${was[c] ?? 0} → ${counts[c]}`);
      // a rise means new content brought a defect the reviews found by hand; see `bun packages/learning/scripts/lesson-checks.ts --check <id> --all`
      assert.deepEqual(rose, []);
    });
  }
});
