import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateWorking, normalizeLine } from "./student.ts";

test("a different but valid route is accepted (not forced onto the engine's path)", () => {
  const a = evaluateWorking("3*(x+2)=21", ["3*x+6=21", "3*x=15", "x=5"]);
  const b = evaluateWorking("3*(x+2)=21", ["x+2=7", "x=5"]);              // divides first
  for (const r of [a, b]) { assert.equal(r.status, "valid-complete"); assert.equal(r.firstInvalid, null); }
  assert.notDeepEqual(b.steps.map((s) => s.to), a.steps.map((s) => s.to));
});
test("the first invalid step is located, explained with exact solution sets, and a candidate misconception is named", () => {
  const r = evaluateWorking("3*(x+2)=21", ["3*x+2=21", "3*x=19", "x=19/3"]);
  assert.equal(r.status, "invalid"); assert.equal(r.firstInvalid, 1); assert.equal(r.invalidAt, "step");
  assert.match(r.steps[0].explanation, /previous line has x = 5; this line has x = 19\/3/);
  assert.equal(r.steps[0].misconceptions[0].id, "partial-distribution");
  assert.equal(r.steps[1].status, "valid"); assert.equal(r.steps[1].followsFromEarlierError, true);   // valid from the wrong line: the error is carried forward
  assert.equal(r.final!.verdict, "incorrect");
});
test("a domain-changing step is rejected: dividing by x loses x = 0", () => {
  const r = evaluateWorking("x^2=3*x", ["x=3"]);
  assert.equal(r.status, "invalid"); assert.match(r.steps[0].explanation, /lost x = 0/);
  assert.equal(r.steps[0].misconceptions[0].id, "divided-by-unknown-factor");
});
test("a dropped restriction is a domain-changing error when the student states restrictions", () => {
  const r = evaluateWorking("(x^2-4)/(x-2)=4", [{ eq: "x+2=4", excluded: [] }]);
  assert.equal(r.status, "invalid"); assert.match(r.steps[0].explanation, /restriction/);
});
test("accepting an excluded value is caught at the final claim, although every step is valid", () => {
  const r = evaluateWorking("(x^2-4)/(x-2)=4", ["x+2=4", "x=2"]);
  assert.equal(r.status, "invalid"); assert.equal(r.firstInvalid, null); assert.equal(r.invalidAt, "final-claim"); assert.match(r.final!.explanation, /denominator/);
});
test("multiplying by an unrestricted expression is valid only as an implication with an obligation", () => {
  const r = evaluateWorking("2*x=6", ["2*x*(x-1)=6*(x-1)"]);
  assert.equal(r.steps[0].status, "valid-with-obligation"); assert.match(r.steps[0].explanation, /candidates/);
});
test("ambiguous writing is reported as ambiguous, not guessed", () => {
  const r = evaluateWorking("1/2x=3", ["x=6"]); assert.equal(r.status, "ambiguous");
  assert.equal(normalizeLine("3(x+2)=2x"), "3*(x+2)=2*x");
});
test("what cannot be analysed is never certified", () => {
  const r = evaluateWorking("2*x+1=7", ["2*x=6", "x=sqrt(9)"]); assert.equal(r.status, "unsupported");
  const g = evaluateWorking("2*x+1=7", ["2*x=6", "2x +* 3"]); assert.ok(g.status === "unsupported");
});
test("an unfinished but valid working is incomplete, and engine comparison is available", () => {
  const r = evaluateWorking("2*x+1=7", ["2*x=6"]); assert.equal(r.status, "valid-incomplete"); assert.deepEqual(r.engine!.solution, ["3"]);
});
