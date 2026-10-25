import { test } from "node:test";
import assert from "node:assert/strict";
import { plan } from "./planner.ts";

test("solves 3*(x+2)=21 by search, every step names a rule", () => {
  const r = plan("3*(x+2)=21");
  assert.equal(r.outcome, "solved"); assert.equal(r.answer, "5");
  assert.ok(r.steps.length > 0 && r.steps.every((s) => s.rule && s.explain));
});
test("fractions and decimals are exact", () => {
  assert.equal(plan("x/2+x/3=10").answer, "12");
  assert.equal(plan("0.5*x+1=4").answer, "6");
});
test("contradiction and identity are detected, not guessed", () => {
  assert.equal(plan("x+5=x+12").outcome, "no-solution");
  assert.equal(plan("2*(x+1)=2*x+2").outcome, "identity");
});
test("out-of-scope equations are refused with a reason", () => {
  assert.equal(plan("x^2=4").outcome, "unsupported");
  assert.equal(plan("3/x=6").outcome, "unsupported");
});
test("deterministic", () => {
  assert.equal(JSON.stringify(plan("(x-9)/3=(x+3)/2")), JSON.stringify(plan("(x-9)/3=(x+3)/2")));
});
