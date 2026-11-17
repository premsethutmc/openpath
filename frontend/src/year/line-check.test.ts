import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWorkingLines } from "../../../packages/learning/src/line-check";

const states = (...lines: string[]) => checkWorkingLines(lines).map((l) => l.state[0]).join("");
test("numbers: arithmetic as before, and powers, roots, π, trig, percentages", () => {
  assert.equal(states("90 × 7 = 630", "3 × 2 = 5", "seven birds", "12"), "rwuu");
  assert.equal(states("94 × 7 = 90 × 7 + 4 × 7", "= 630 + 28", "= 648"), "rrw");
  assert.equal(states("2³ + √16 = 12", "2^3 + √16 = 13", "25% × 80 = 20", "sin 30° = 1/2", "cos(π) = −1", "2π × 7 = 44"), "rwrrrw");
});
test("the area under 2x + y = 6: every line after the set-up is worth 9", () => {
  assert.equal(states("2x + y = 6", "y = 6 − 2x", "∫ 0 to 3 (6 − 2x) dx", "= [6x − x²] 0 to 3", "= 18 − 9", "= 9"), "uruuuu".replace(/u{4}$/, "urrr"));
  assert.equal(states("∫ 0 to 3 (6 − 2x) dx = [6x − x²] 0 to 3", "= 18 − 9 = 9"), "rr");
  assert.equal(states("∫₀³ (6 − 2x) dx = [6x − x²]₀³", "∫_0^3 (6 − 2x) dx = 9"), "rr");
  // the slips: a wrong antiderivative, a wrong limit, a wrong line
  assert.equal(states("∫ 0 to 3 (6 − 2x) dx = [6x − 2x²] 0 to 3"), "w");
  assert.equal(states("∫ 0 to 6 (6 − 2x) dx = 9"), "w");
  assert.equal(states("2x + y = 6", "y = 6 + 2x"), "uw");
});
test("identities and equations in one unknown", () => {
  assert.equal(states("(x + 1)² = x² + 2x + 1", "2(x + 3) = 2x + 3"), "ru"); // the second is an equation with nothing before it
  assert.equal(states("2x + 3 = 11", "2x = 8", "x = 4"), "urr");
  assert.equal(states("2x + 3 = 11", "2x = 14", "x = 4"), "uwr"); // a wrong line does not become the line to match
  assert.equal(states("x² − 5x + 6 = 0", "(x − 2)(x − 3) = 0", "x = 2 or x = 3"), "urr");
  assert.equal(states("x² − 5x + 6 = 0", "x = 2"), "uw"); // one solution lost
  assert.equal(states("x² = 9", "x = ±3"), "ur");
  assert.equal(states("x² − 6x + 9 = 0", "(x − 3)² = 0", "x = 3"), "urr"); // a root that only touches zero
});
test("integrals without limits and derivatives", () => {
  assert.equal(states("∫ (6 − 2x) dx = 6x − x² + C", "∫ (6 − 2x) dx = 6x − 2x² + C", "∫ cos x dx = sin x + c"), "rwr");
  assert.equal(states("d/dx (x³ + 2x) = 3x² + 2", "d/dx (x³) = 3x", "d/dx (sin x) = cos x"), "rwr");
});
test("what cannot be read is never called wrong", () => {
  assert.equal(states("area = base × height", "∫ (6 − 2x)", "the line meets the axes at 3 and 6", "y = mx + c"), "uuuu");
  // units and words are not unknowns: nothing is ticked or crossed on their account
  assert.equal(states("5 m = 500 cm", "2 m = 300 cm", "7 birds = 7", "3 kg = 3000 g"), "uuuu");
});
