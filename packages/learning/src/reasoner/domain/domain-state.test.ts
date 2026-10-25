import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStepText } from "./domain-checker.ts";
import { checkClaim, initialState, excludedOf, solSet, solEquals, parseEq, valuesOf, checkTransition } from "./domain-state.ts";
import { Rational } from "../../math-kernel.ts";

const S = (eq: string, excluded: string[] = []) => ({ eq, excluded });
test("hand-built domain cases (same 12 as the Python domain test)", () => {
  const cases: [string, string[], string, string[], boolean][] = [
    ["(9*x)/x=10", ["0"], "9=10", [], false],
    ["(9*x)/x=9", ["0"], "9=9", [], false],
    ["(x*x)/x=5", ["0"], "x=5", [], false],
    ["x/x=1", ["0"], "1=1", [], false],
    ["2*x=6", [], "(2*x)/x=6/x", [], false],
    ["2*x=6", [], "x*(2*x)=x*6", [], false],
    ["2*x=6", [], "0*(2*x)=0*6", [], false],
    ["(9*x)/x=10", ["0"], "(9*x)/x+1=10+1", ["0"], true],
    ["(9*x)/x=10", ["0"], "2*((9*x)/x)=2*10", ["0"], true],
    ["2*x=6", [], "2*x/2=6/2", [], true],
    ["3/x=6", ["0"], "3=6*x", [], false],
    ["3/x=6", ["0"], "3/x+1=6+1", ["0"], true],
  ];
  for (const [a, xa, b, xb, want] of cases) assert.equal(checkStepText(S(a, xa), S(b, xb)).valid, want, `${a} -> ${b}`);
});
test("cancelling keeps the restriction: (x^2-4)/(x-2)=4 -> x+2=4 with x!=2 has no solution on either side", () => {
  assert.equal(checkStepText(S("(x^2-4)/(x-2)=4", ["2"]), S("x+2=4", ["2"])).valid, true);
  assert.deepEqual(checkStepText(S("(x^2-4)/(x-2)=4", ["2"]), S("x+2=4", [])).reasons, ["restriction-dropped", "solution-set-changed"]);
});
test("a restricted identity is true on R minus the exclusions, not on R", () => {
  assert.equal(checkClaim("(x^2-4)/(x-2)=x+2", "all-except-excluded").valid, true);
  assert.equal(checkClaim("(x^2-4)/(x-2)=x+2", "all-real").valid, false);
});
test("an extraneous candidate is not a solution", () => {
  assert.equal(checkClaim("x/(x-2)=2/(x-2)", ["2"]).valid, false);
  assert.equal(checkClaim("x/(x-2)=2/(x-2)", []).valid, true);
});
test("initial state records the original restrictions explicitly", () => {
  const s = initialState("1/(x-1)+1/(x+1)=2*x/(x^2-1)");
  assert.deepEqual(excludedOf(s.math).map(String), ["-1", "1"]);
  assert.deepEqual(s.originalRestrictions.map(String), ["-1", "1"]);
  assert.ok(s.math.constraints.every((c) => c.kind === "nonzero"));
});
test("implication steps may add solutions but never lose them", () => {
  const a = parseEq("x=3"), b = parseEq("x*(x-5)=3*(x-5)");
  assert.deepEqual(checkTransition({ ...a, excluded: [] }, { ...b, excluded: [] }, "implication"), []);
  assert.deepEqual(checkTransition({ ...a, excluded: [] }, { ...b, excluded: [] }, "equivalence"), ["solution-set-changed"]);
  assert.deepEqual(checkTransition({ ...b, excluded: [] }, { ...a, excluded: [] }, "implication"), ["solution-set-lost"]);
});
test("equivalence is exact, not sampled: a difference outside any small grid is still caught", () => {
  // roots 1/1000003 vs 2/1000003 never appear on a rational grid of small denominators
  const v = checkStepText(S("1000003*x=1"), S("1000003*x=2"));
  assert.equal(v.valid, false);
});
