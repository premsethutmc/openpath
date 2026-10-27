import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateWorking } from "./student.ts";
const ev = (p: string, l: string[]) => evaluateWorking(p, l, { route: false, engine: false });
const st = (r: ReturnType<typeof ev>) => r.steps.map((s) => s.status);

test("division by a variable: dividing by x loses x=0, so the step is invalid and nothing is certified", () => {
  const r = ev("x*(x-3)=5*x", ["x-3=5", "x=8"]);
  assert.equal(r.status, "invalid"); assert.equal(r.firstInvalid, 1); assert.match(r.steps[0].explanation, /lost x = 0/);
});
test("explicit case split: both cases checked, claim complete -> valid-complete", () => {
  const r = ev("x*(x-3)=5*x", ["case x = 0: 0 = 0", "case x != 0: x - 3 = 5", "x = 8", "x = 0 or x = 8"]);
  assert.equal(r.status, "valid-complete", JSON.stringify(st(r)));
});
test("explicit case split: dropping the x=0 case is caught against the original problem", () => {
  const r = ev("x*(x-3)=5*x", ["case x = 0: 0 = 0", "case x != 0: x - 3 = 5", "x = 8"]);
  assert.equal(r.status, "invalid"); assert.equal(r.invalidAt, "final-claim");
});
test("explicit case split: a false case value or a wrong branch is invalid at the step", () => {
  assert.equal(ev("x*(x-3)=5*x", ["case x = 0: 1 = 0", "case x != 0: x - 3 = 5", "x = 8", "x = 0 or x = 8"]).firstInvalid, 1);
  assert.equal(ev("x*(x-3)=5*x", ["case x = 0: 0 = 0", "case x != 0: x - 3 = 6"]).firstInvalid, 2);
});
test("multiplying by an expression that may be zero gains a candidate: obligation, then discharge against the original", () => {
  const r = ev("2*x=6", ["2*x*(x-1)=6*(x-1)", "x=3 or x=1", "x=3"]);
  assert.deepEqual(st(r), ["valid-with-obligation", "valid", "valid-discharge"]); assert.equal(r.status, "valid-complete");
  const r2 = ev("2*x=6", ["2*x*(x-1)=6*(x-1)", "x=3 or x=1"]);
  assert.equal(r2.status, "invalid"); assert.equal(r2.invalidAt, "final-claim");
});
test("cancelling a common factor that can be zero loses its root", () => {
  const r = ev("(x-1)*(x-3)=(x-1)*5", ["x-3=5"]);
  assert.equal(r.status, "invalid"); assert.match(r.steps[0].explanation, /lost x = 1/);
});
test("a denominator the student introduces is an assumption of that line, not a permanent restriction", () => {
  const r = ev("x=3", ["x/(x+1)=3/(x+1)", "x=3"]);
  assert.deepEqual(st(r), ["valid", "valid"]); assert.deepEqual(r.steps[0].domain!.assumptions, ["-1"]); assert.equal(r.steps[0].domain!.original.length, 0);
  assert.equal(r.status, "valid-complete");
  // the introduced denominator is dropped again by multiplying back: that GAINS its zero as a candidate (obligation), discharged later against the original
  const g = ev("-0.25+1/2*x = -9+5/8*x", ["(x+6)*(-(1/8)*x+35/4)/(x+6)=0", "(x+6)*(-(1/8)*x+35/4)=0", "x=-6 or x=70", "x=70"]);
  assert.deepEqual(st(g), ["valid", "valid-with-obligation", "valid", "valid-discharge"]); assert.equal(g.status, "valid-complete");
  const g2 = ev("-0.25+1/2*x = -9+5/8*x", ["(x+6)*(-(1/8)*x+35/4)/(x+6)=0", "(x+6)*(-(1/8)*x+35/4)=0", "x=-6 or x=70"]);
  assert.equal(g2.status, "invalid"); assert.equal(g2.invalidAt, "final-claim");
});
test("introduced denominator whose zero is a solution of the original: the step loses it and is invalid", () => {
  const r = ev("x*(x-1)=0", ["x*(x-1)/x=0"]);
  assert.equal(r.status, "invalid"); assert.match(r.steps[0].explanation, /lost x = 0/);
});
test("rational equation: the original exclusion stays in force, so x=2 is never certified", () => {
  const r = ev("1/(x-2)=3/(x-2)", ["1=3", "no solution"]); assert.equal(r.status, "valid-complete");
  const r2 = ev("1/(x-2)=3/(x-2)", ["1=3", "x=2"]); assert.equal(r2.status, "invalid");
});
test("removable singularity: the simplified line keeps the original exclusion", () => {
  assert.equal(ev("(x^2-4)/(x-2)=0", ["x+2=0", "x=-2"]).status, "valid-complete");
  const r = ev("(x^2-4)/(x-2)=4", ["x+2=4", "x=2"]); assert.equal(r.status, "invalid"); assert.equal(r.invalidAt, "final-claim");
});
test("a lossy transformation can never be fully certified, even when the final answer looks right", () => {
  const r = ev("x^2=4*x", ["x=4"]); assert.notEqual(r.status, "valid-complete"); assert.equal(r.status, "invalid");
});
test("multiplying by zero collapses the equation and is invalid", () => {
  assert.equal(ev("2*x=6", ["0*(2*x)=0*6"]).status, "invalid");
});
