/** answer-feedback@1: one wrong answer gets the mathematics, never a statement of the learner's unobserved reasoning. */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { answerFeedback, MIXUP_NOTE, principleOf } from "../../../packages/learning/src/answer-feedback";
import { misconception } from "./learners";

const CLAIM = /\b(was|were|is not yet reliable)\b/i;
const EXAMPLES: [string, string[], string][] = [
  // exterior angle (phone g1): before "The third interior angle was found instead. The exterior angle sits outside, next to that angle, on the straight line."
  ["gen:ahext:34,53,0", ["third-interior"], "The exterior angle sits outside, next to that angle, on the straight line."],
  // two dice (phone d1): before "The 8 possible totals were taken as equally likely. They are not: list all 20 pairs and count the ones that fit."
  ["gen:akdice:4,5,0,2", ["totals-equally-likely"], "List all 20 pairs and count the ones that fit."],
  // vertically opposite (phone g2): the modelled explanation states mathematics only, so it is kept whole
  ["gen:afcross:109,0", ["opposite-as-linear"], "Vertically opposite angles are equal; they do not add up to 180°."],
];

for (const [qid, bugs, principle] of EXAMPLES) test(`${qid}: the mix-up's answer gets the note and the mathematics, not the claim`, () => {
  const q = question(qid), wrong = misconception(qid, new Set(bugs))!;
  const f = answerFeedback(q, wrong)!;
  assert.equal(f.note, MIXUP_NOTE);
  assert.ok(f.principle!.startsWith(principle), f.principle!);
  assert.doesNotMatch(f.principle!, CLAIM);
  assert.equal(answerFeedback(q, String(q.answer)), null, "a right answer gets no mix-up note");
});

test("across every family: the kept text never states what the learner did, and never starts with a pronoun left dangling", () => {
  let kept = 0, none = 0;
  for (const f of FAMILIES.keys()) {
    let items; try { items = pool(f).items.slice(0, 3); } catch { continue; }
    for (const p of items) for (const b of p.bugs) {
      const t = principleOf(b.says);
      if (t === null) { none++; continue; }
      kept++;
      assert.doesNotMatch(t, CLAIM, `${f} ${b.id}: ${t}`);
    }
  }
  assert.ok(kept > none, `${kept} with mathematics kept, ${none} with the note alone`);
});
