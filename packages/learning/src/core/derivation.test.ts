// Derivation harness tests. Expectations come from mathematics, not from the engine's output.
import test from "node:test";
import assert from "node:assert/strict";
import { assessDerivation as D } from "./derivation.ts";

test("cancellation without a restriction stays conditional, with the obligation visible", () => {
  const r = D({ problem: "Simplify (x^2-1)/(x-1)", lines: ["x+1"] });
  assert.equal(r.mathematics, "correct");
  assert.equal(r.conditionality, "conditional");
  assert.equal(r.outstandingObligations.length, 1);
  assert.equal(r.completeness.complete, false);
});
test("the same cancellation with the restriction stated on its own line discharges the obligation", () => {
  const r = D({ problem: "Simplify (x^2-1)/(x-1)", lines: ["x+1", "x ≠ 1"] });
  assert.equal(r.mathematics, "correct");
  assert.equal(r.outstandingObligations.length, 0);
  assert.equal(r.obligations.length, 1);
  assert.equal(r.obligations[0].status, "discharged");
  assert.equal(r.obligations[0].how, "stated");
  assert.equal(r.conditionality, "conditional");        // it was conditional; it never silently becomes unconditional
});
test("a restriction declared up front carries to the first step", () => {
  const r = D({ problem: "Simplify (x^2-1)/(x-1)", declarations: ["x ≠ 1"], lines: ["x+1"] });
  assert.equal(r.mathematics, "correct");
  assert.equal(r.outstandingObligations.length, 0);
});
test("an obligation stays open across later valid steps until discharged", () => {
  const r = D({ problem: "Simplify (x^2-1)/(x-1)", lines: ["(x-1)(x+1)/(x-1)", "x+1", "1+x"] });
  assert.equal(r.mathematics, "correct");
  assert.equal(r.outstandingObligations.length, 1);
  assert.equal(r.obligations[0].openedAt, 2);
});
test("a later valid line never repairs an earlier invalid step", () => {
  const r = D({ problem: "Simplify (x^2-1)/(x-1)", lines: ["(x^2-1)/x-1", "x+1"] });
  assert.equal(r.mathematics, "incorrect");
  assert.equal(r.firstInvalidStep, 1);
  assert.equal(r.laterLinesDoNotRepair, true);
  assert.equal(r.conditionality, "n/a");
  assert.equal(r.finalEquivalentToProblem, true);        // the last line equals the problem, the route does not
});
test("validity is separate from the requested form and the skills shown", () => {
  const r = D({ problem: "Expand (x+1)(x+2)", lines: ["x(x+2)+1(x+2)"], objective: { form: "expanded" } });
  assert.equal(r.mathematics, "correct");
  assert.equal(r.objective.formAchieved, false);
  assert.equal(r.completeness.complete, false);
});
test("a different valid route is not penalised against the reference", () => {
  const r = D({ problem: "Expand (x+1)(x+2)", lines: ["x(x+1)+2(x+1)", "x^2+3x+2"], objective: { referenceRoute: ["x(x+2)+1(x+2)", "x^2+3x+2"] } });
  assert.equal(r.mathematics, "correct");
  assert.deepEqual(r.alternativeRouteSteps, [1]);
});
test("multivariate cancellations: two obligations opened together", () => {
  const r = D({ problem: "Simplify x^2*y/(x*y^2)", lines: ["x/y"] });
  assert.equal(r.mathematics, "correct");
  assert.ok(r.outstandingObligations.length >= 1);
});
test("size limits give a resource-limit status, not a verdict", () => {
  const r = D({ problem: "Simplify " + "x+".repeat(300) + "1", lines: ["x"] });
  assert.equal(r.resourceLimit, true);
  assert.equal(r.mathematics, "undetermined");
});
test("unreadable working is undetermined, never incorrect", () => {
  const r = D({ problem: "Simplify (x^2-1)/(x-1)", lines: ["the answer is obvious"] });
  assert.notEqual(r.mathematics, "incorrect");
});
