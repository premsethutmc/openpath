/** A justification counts only if the step's STATED value matches an independent computation.
 *  For every kind: the true value passes, a corrupted value fails. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { justificationValueHolds } from "./kernel-adapter";
import type { Justification, Step } from "./family-kit";

const mk = (inputs: (number | string)[], value: number | string, justification: Justification): Step =>
  ({ id: "s", op: "x", competency: "c", inputs, value, justification }) as unknown as Step;

const cases: [string, (string | number)[], number | string, Justification, number | string][] = [
  ["positional-value", [], 300, { rule: "positional-value", digit: 3, placeValue: 100, placeName: "hundreds" } as Justification, 30],
  ["positional-value+plus", [], 345, { rule: "positional-value", digit: 3, placeValue: 100, placeName: "hundreds", plus: 45 } as Justification, 300],
  ["unit-coverage", [], 12, { rule: "unit-coverage", rows: 3, columns: 4 } as Justification, 13],
  ["additive-combination", [], 9, { rule: "additive-combination", parts: [4, 5] } as Justification, 10],
  ["product-counting", [], 24, { rule: "product-counting", factors: [2, 3, 4] } as Justification, 23],
  ["scaling (1 input)", [15], 30, { rule: "scaling", factor: 2 } as Justification, 31],
  ["scaling (2 inputs)", [2, 15], 30, { rule: "scaling", factor: 2 } as Justification, 45],
  ["quotient", [], 4, { rule: "quotient", dividend: 12, divisor: 3 } as Justification, 5],
  ["fraction-equivalence", [3, 4, 5], "15/20", { rule: "fraction-equivalence", scalingFactor: 5, numeratorBefore: 3, denominatorBefore: 4 } as Justification, "15/21"],
  ["arithmetic-fact", [7, 4], 28, { rule: "arithmetic-fact", operation: "7 × 4" } as Justification, 27],
];

for (const [name, inputs, good, j, bad] of cases) {
  test(`value check: ${name} accepts the true value`, () => assert.equal(justificationValueHolds(mk(inputs, good, j), j), true));
  test(`value check: ${name} rejects a corrupted value`, () => assert.equal(justificationValueHolds(mk(inputs, bad, j), j), false));
}
test("value check: unparseable arithmetic-fact text is not claimed as verified", () => {
  const j = { rule: "arithmetic-fact", operation: "the product of seven and four" } as Justification;
  assert.equal(justificationValueHolds(mk([7, 4], 28, j), j), false);
});
