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

// ---- finite disjunctions, discharge of obligations, juxtaposed-denominator grouping
test("disjunction line: union semantics and the discharge of an extraneous candidate", () => {
  const r = evaluateWorking("4*x+8=6*x-4", ["(x + 2)(4x + 8) = (x + 2)(6x − 4)", "x + 2 = 0 or (4x + 8) − (6x − 4) = 0", "x = −2 or x = 6", "x = 6"], { route: false, engine: false });
  assert.deepEqual(r.steps.map((s) => s.status), ["valid-with-obligation", "valid", "valid", "valid-discharge"]);
  assert.equal(r.status, "valid-complete");
});
test("accepting the extraneous candidate in the final claim is invalid", () => {
  const r = evaluateWorking("4*x+8=6*x-4", ["(x + 2)(4x + 8) = (x + 2)(6x − 4)", "x + 2 = 0 or (4x + 8) − (6x − 4) = 0", "x = −2 or x = 6"], { route: false, engine: false });
  assert.equal(r.status, "invalid"); assert.equal(r.invalidAt, "final-claim");
});
test("a shrinking step with NO open obligation is invalid, not a discharge", () => {
  const r = evaluateWorking("x*(x-1)/(x-1)=3", ["x=3 or x=1"], { route: false, engine: false });
  assert.notEqual(r.steps[0].status, "valid-discharge");
});
test("tight vs left-to-right reading of 1÷5(x-6) is reported as ambiguous", () => {
  const r = evaluateWorking("(x-6)/5=-4", ["1÷5(x − 6) = −4", "x − 6 = −20", "x = −14"], { route: false, engine: false });
  assert.equal(r.status, "ambiguous");
});
test("tight reading binds the whole juxtaposed run after a slash", () => {
  assert.equal(normalizeLine("3/2(x+1)(x+2)", true), "3/(2*(x+1)*(x+2))");
  assert.equal(normalizeLine("3/2(x+1)(x+2)", false), "3/2*(x+1)*(x+2)");
});

// ---- found by the held-out adversarial corpus (first pass): collapse to an identity, claims written with parentheses/spaces
test("multiplying both sides by 0 collapses the equation to an identity: invalid, not an obligation", () => {
  const r = evaluateWorking("8*x-6=10", ["0*(8*x-6)=0*10", "0=0", "x=2"], { route: false, engine: false });
  assert.equal(r.status, "invalid"); assert.equal(r.firstInvalid, 1); assert.equal(r.steps[0].status, "invalid");
});
test("a final claim written as x = (25/36) or x = (-31/36) is recognised and checked (extraneous root accepted -> invalid)", () => {
  const r = evaluateWorking("9*x+(3/4)=7", ["(9x+(3/4))^2=7^2", "9x+(3/4)=7 or 9x+(3/4)=-7", "x=(25/36) or x=(-31/36)"], { route: false, engine: false });
  assert.equal(r.status, "invalid"); assert.equal(r.invalidAt, "final-claim");
});
test("a single claim with parentheses and a unicode minus is a final claim", () => {
  const r = evaluateWorking("19*x-30=14", ["19x = 44", "x = (44 ÷ 19)"], { route: false, engine: false });
  assert.equal(r.status, "valid-complete"); assert.equal(r.final?.verdict, "correct");
});
