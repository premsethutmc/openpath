/** read-problem@1: a typed problem is read only as exactly the problem it is; anything else is refused in plain words. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../../packages/learning/src/families";
import { canon, pure, readProblem, skeleton } from "../../../packages/learning/src/read-problem";
import TEMPLATES from "../../../content/learning/problem-templates.v1.json" with { type: "json" };

const read = (t: string) => { const r = readProblem(t); return r.supported ? [r.problem.id, String(r.problem.answer)] : null; };

test("the same problem is read however it is typed", () => {
  assert.equal(canon("What is 23 x 14?"), canon("23 × 14 = ?"));
  assert.equal(canon("36 ÷ 4"), canon("36/4"));
  assert.equal(canon("x^2 − 10x − 24 = 0"), canon("x² - 10x - 24 = 0"));
  assert.equal(canon("7 times 8"), canon("7 × 8"));
  assert.equal(skeleton("Solve 2x + 1 = 7. What is x?"), "2x+1=7");
  assert.equal(skeleton("3/4 + 1/8 = ? (A fraction is fine.)"), "3/4+1/8");
  assert.equal(skeleton("A train travels 60 km in 2 hours. What is its speed?"), null);
});

test("bare calculations and equations are read as the problem they are", () => {
  assert.deepEqual(read("2x+1=7"), ["gen:lin:2,1,3", "3"]);
  assert.deepEqual(read("x + 3 = 9"), ["gen:ahone:0,3,6", "6"]);
  assert.deepEqual(read("what is 7 times 8"), ["gen:mul:7,8", "56"]);
  assert.deepEqual(read("347 + 285"), ["gen:adcol3:347,285,0", "632"]);
  assert.deepEqual(read("3/4 + 1/8"), ["gen:faddu:3,4,1,8", "7/8"]);
  assert.deepEqual(read("0.6 × 0.3"), ["gen:aidmul:6,1,3,1", "0.18"]);
  assert.deepEqual(read("12.5 - 3.75"), ["gen:agdec:125,375,1", "8.75"]);
  assert.deepEqual(read("√49"), ["gen:root:7", "7"]);
  assert.deepEqual(read("x^2 - 10x - 24 = 0"), ["gen:quad:-10,-24", "-2,12"]);
});

test("a family's own parser is believed only when its problem prints the numbers that were typed", () => {
  // the percentage parser alone would read this as 15% of 20
  assert.deepEqual(read("What is 15% of 200?"), ["gen:pct:15,200", "30"]);
  assert.deepEqual(read("15% of 200"), ["gen:pct:15,200", "30"]);
});

test("what is not exactly one of OpenPath's problems is refused, never guessed", () => {
  for (const t of ["A train travels 60 km in 2 hours. What is its speed?", "Write 49 in Roman numerals", "1000 - 386", "23 × 14", "Estimate 23 × 14", "simplify 24/30", "24/30 as a decimal rounded to 1 place", "", "x".repeat(201)]) {
    const r = readProblem(t);
    assert.equal(r.supported, false, t);
    if (!r.supported) assert.ok(r.reason.length > 0, t);
  }
  // an instruction that changes the question makes a printed problem unmatchable from its bare expression
  assert.equal(pure("Estimate 23 × 14 by rounding each number to the nearest ten."), false);
  assert.equal(pure("Write 24/30 in its lowest terms."), false);
  assert.equal(pure("3/4 + 1/8 = ? (A fraction is fine.)"), true);
});

test("round trip: the bare expression of every indexed family's problems is read back as a problem with the same answer, or refused", () => {
  const families = (TEMPLATES as unknown as { families: string[] }).families;
  assert.ok(families.length >= 30, `${families.length} families can be read from a bare expression`);
  let right = 0, refused = 0;
  for (const id of families) {
    const items = pool(id).items.filter((x) => !/:(mc|w)$/.test(x.id) && pure(x.prompt));
    const step = Math.max(1, Math.floor(items.length / 8));
    for (const it of items.filter((_, i) => i % step === 0).slice(0, 8)) {
      const r = readProblem(skeleton(it.prompt)!);
      if (!r.supported) { refused++; continue; }
      assert.equal(String(r.problem.answer), String(it.answer), `${it.id}: «${skeleton(it.prompt)}» was read as ${r.problem.id}`);
      right++;
    }
  }
  // a refusal is safe (the learner is told it is not read); a different question never is, and the assert above forbids it
  assert.ok(right >= 200 && right > 4 * refused, `${right} read, ${refused} refused`);
});
