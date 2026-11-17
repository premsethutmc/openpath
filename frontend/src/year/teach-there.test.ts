/** teach-there@1: a slip in a line of working gets a smaller question about the same numbers, never the answer. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLine, simplerFor } from "../../../packages/learning/src/working";

test("a wrong times fact is asked again as adding up, or split at five; the owner's example", () => {
  assert.deepEqual(simplerFor("3 × 2 = 5"), { lead: "2 lots of 3. Add them up:", ask: "3 + 3 = ?", answer: 6 });
  assert.deepEqual(simplerFor("4 x 7 = 27"), { lead: "4 lots of 7. Add them up:", ask: "7 + 7 + 7 + 7 = ?", answer: 28 });
  assert.deepEqual(simplerFor("7 × 8 = 54"), { lead: "7 lots of 8 is 5 lots of 8 and 2 more lots of 8:", ask: "40 + 16 = ?", answer: 56 });
  assert.deepEqual(simplerFor("90 × 7 = 640"), { lead: "90 is 9 tens. Start with the fact underneath:", ask: "9 × 7 = ?", answer: 63 });
});

test("division is turned round; adding and taking away go by the tens or through the ten", () => {
  assert.deepEqual(simplerFor("56 ÷ 7 = 9"), { lead: "Turn it round into a times fact:", ask: "7 × ? = 56", answer: 8 });
  assert.deepEqual(simplerFor("47 + 38 = 75"), { lead: "Add the tens of 38 first:", ask: "47 + 30 = ?", answer: 77 });
  assert.deepEqual(simplerFor("58 + 7 = 64"), { lead: "Go up to the next ten first:", ask: "58 + 2 = ?", answer: 60 });
  assert.deepEqual(simplerFor("83 − 27 = 66"), { lead: "Take away the tens of 27 first:", ask: "83 − 20 = ?", answer: 63 });
  assert.deepEqual(simplerFor("52 − 7 = 44"), { lead: "Go down to the ten first:", ask: "52 − 2 = ?", answer: 50 });
});

test("the smaller question is always true, never the slip's own answer, and only a wrong whole-number line gets one", () => {
  for (const a of [2, 3, 6, 7, 9, 12, 30, 47, 58, 90, 400]) for (const b of [2, 3, 5, 7, 8, 12, 27, 38]) for (const op of ["×", "÷", "+", "−"]) {
    const truth = op === "×" ? a * b : op === "+" ? a + b : op === "−" ? a - b : a / b;
    assert.equal(simplerFor(`${a} ${op} ${b} = ${truth}`), null, "a right line gets nothing");
    const s = simplerFor(`${a} ${op} ${b} = ${Math.round(truth) + 1}`);
    if (!s) continue;
    // the smaller question is itself a true calculation with the answer it says
    assert.equal(checkLine(s.ask.includes("× ?") ? s.ask.replace("?", String(s.answer)) : s.ask.replace("= ?", `= ${s.answer}`)).state, "right", s.ask);
    assert.ok(!s.ask.includes(String(Math.round(truth) + 1)) || truth < 20, s.ask);
    assert.ok(s.lead.length <= 80 && s.ask.length <= 40);
  }
  for (const no of ["", "x + 3 = 5", "3/4 + 1/8 = 1", "2.5 × 2 = 6", "1 × 9 = 8", "13 × 17 = 200", "9 ÷ 2 = 4", "5 − 9 = 4", "20 + 30 = 60", "3 × 2", "seven"]) assert.equal(simplerFor(no), null, no);
});
