/** expected-time@1: about how long a question should take, by rule. */
import assert from "node:assert/strict";
import test from "node:test";
import { expectedSeconds, speedOf, stepSeconds } from "../../../packages/learning/src/expected-time";
import { FAMILIES, problemOf } from "../../../packages/learning/src/families";

test("T-1 the estimate grows with the work: a table fact, a long multiplication, a long division", () => {
  assert.equal(stepSeconds("multiply", [7, 8]), 3);
  assert.equal(stepSeconds("multiply", [23, 14]), 16);
  assert.equal(stepSeconds("divide", [36, 4]), 4);
  assert.equal(stepSeconds("divide", [873, 4]), 24, "three digits in the answer");
  assert.equal(stepSeconds("add", [458, 367]), 6);
  assert.equal(expectedSeconds({ prompt: "7 × 8 = ?", answer: "56", steps: [{ op: "multiply", inputs: [7, 8] }] }, 5), 15);
  assert.equal(expectedSeconds({ prompt: "873 ÷ 4 = ?", answer: "218 r 1", steps: [{ op: "divide", inputs: [873, 4] }] }, 5), 40);
});

test("T-2 a younger class is given more time for the same question; no steps falls back on difficulty", () => {
  const q = { prompt: "7 × 8 = ?", answer: "56", steps: [{ op: "multiply", inputs: [7, 8] }] };
  assert.ok(expectedSeconds(q, 2) > expectedSeconds(q, 4) && expectedSeconds(q, 4) > expectedSeconds(q, 6));
  assert.ok(expectedSeconds({ prompt: "Explain why.", answer: "x", difficulty: 4 }) > expectedSeconds({ prompt: "Explain why.", answer: "x", difficulty: 1 }));
});

test("T-3 every problem kind gets a sensible time (10 s to 5 minutes)", () => {
  let n = 0;
  for (const [id, def] of FAMILIES as Map<string, { domain?: [number, number][] }>) {
    if (!def.domain) continue;
    const p = problemOf(`gen:${id}:${def.domain.map(([lo, hi]) => lo + Math.floor((hi - lo) / 3)).join(",")}`);
    if (!p) continue;
    const s = expectedSeconds(p, 5);
    assert.ok(s >= 10 && s <= 300 && s % 5 === 0, `${id}: ${s}`);
    n++;
  }
  assert.ok(n > 500);
});

test("T-4 a right answer against its expected time", () => {
  assert.deepEqual([speedOf(8_000, 20), speedOf(18_000, 20), speedOf(30_000, 20), speedOf(50_000, 20)], ["lightning", "quick", "steady", "slow"]);
  assert.equal(speedOf(1_000, 20), null, "too quick to have been worked");
});
