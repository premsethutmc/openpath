// Complexity limits: they may turn an answer into "unsupported" and never into a different decided verdict.
import test from "node:test";
import assert from "node:assert/strict";
import { assessWorking } from "./working-assessment.ts";
import { setDefaultOps, LIMITS } from "./budget.ts";
const CASES: [string, string[]][] = [
  ["Expand (x+1)(x+2)", ["x^2+3x+2"]], ["Expand (x+1)(x+2)", ["x^2+3x+3"]], ["Simplify (x^2-1)/(x-1)", ["x+1"]], ["Simplify (a^2-b^2)/(a-b)", ["a+b", "a ≠ b"]],
  ["Expand (a+b+c)^3", ["a^3+b^3+c^3"]], ["Simplify x^n*x^m", ["x^(n+m)"]], ["Expand (x+y)^2", ["x^2+2xy+y^2"]], ["Factorise x^2-9", ["(x-3)(x+3)"]], ["Simplify x*y/x", ["y"]],
  ["Expand (a+b+c)^4", ["a^4+b^4+c^4"]], ["Simplify (x-a)/(x-a)", ["1", "x ≠ a"]],
];
const sig = (a: ReturnType<typeof assessWorking>) => ({ o: a.outcome, s: a.steps.map((x) => x.status) });
test("a tiny budget only ever turns a result into unsupported, never into a different decision", () => {
  const base = CASES.map(([p, l]) => sig(assessWorking(p, l)));
  try {
    for (const ops of [1, 20, 200, 2000]) { setDefaultOps(ops); CASES.forEach(([p, l], i) => { const a = assessWorking(p, l); if (a.resourceLimit) { assert.equal(a.outcome, "unsupported"); assert.equal(a.correct, null); } else assert.deepEqual(sig(a), base[i], `${p} @${ops}`); }); }
  } finally { setDefaultOps(LIMITS.ops); }
});
test("oversize and explosive inputs fail safe", () => {
  for (const [p, l] of [[`Simplify ${"(".repeat(100)}x${")".repeat(100)}`, ["x"]], [`Simplify ${"x+".repeat(500)}1`, ["x"]], ["Expand (a+b+c+d+e+1)^20", ["a"]], ["Expand (x+1)^100000", ["x"]]] as [string, string[]][]) {
    const a = assessWorking(p, l); assert.equal(a.outcome, "unsupported"); assert.equal(a.correct, null);
  }
});
test("a later call is not affected by an earlier exhausted budget", () => {
  assessWorking("Expand (a+b+c+d+e+1)^20", ["a"]);
  assert.equal(assessWorking("Expand (x+1)(x+2)", ["x^2+3x+2"]).outcome, "verified");
});

// ---- state isolation audit
import { bounded, budgetTripped } from "./budget.ts";
import { assessMultivariateWorking, isMvProblem } from "./multivariate/index.ts";
import { assessDerivation } from "./derivation.ts";
const BOOM = "Expand (a+b+c+d+e+1)^20", OK = "Expand (x+1)(x+2)";
test("sequential assessments with different budgets do not leak", () => {
  const seq: string[] = [];
  try {
    for (const ops of [1, LIMITS.ops, 5, LIMITS.ops, 1, LIMITS.ops]) { setDefaultOps(ops); seq.push(assessWorking(OK, ["x^2+3x+2"]).outcome); }
  } finally { setDefaultOps(LIMITS.ops); }
  assert.deepEqual(seq, ["unsupported", "verified", "unsupported", "verified", "unsupported", "verified"]);
});
test("direct engine calls after exhaustion run normally (the budget only exists inside an assessment scope)", () => {
  assert.equal(assessWorking(BOOM, ["a"]).resourceLimit, true);
  assert.equal(budgetTripped(), true);                       // readable until the next scope starts
  assert.equal(isMvProblem("Expand (x+y)(x+2y)"), true);
  assert.equal(assessMultivariateWorking("Expand (x+y)(x+2y)", ["x^2+3xy+2y^2"]).outcome, "verified");
  assert.equal(assessWorking(OK, ["x^2+3x+2"]).resourceLimit, undefined);   // a new outermost scope starts clean
  assert.equal(budgetTripped(), false);
});
test("repeated assessment of the same input is deterministic, including the limit outcome", () => {
  const a = Array.from({ length: 4 }, () => JSON.stringify(assessWorking(BOOM, ["a"]))); assert.equal(new Set(a).size, 1);
  const b = Array.from({ length: 4 }, () => JSON.stringify(assessWorking("Simplify (x^2-1)/(x-1)", ["x+1"]))); assert.equal(new Set(b).size, 1);
});
test("an unsupported result is followed by correct ordinary results; interleaving with derivations", () => {
  const out: string[] = [];
  for (let i = 0; i < 3; i++) { out.push(assessWorking(BOOM, ["a"]).outcome); out.push(assessDerivation({ problem: "Simplify (x^2-1)/(x-1)", lines: ["x+1", "x ≠ 1"] }).mathematics); out.push(assessWorking("Expand (x+1)^2", ["x^2+1"]).outcome); }
  assert.deepEqual(out, ["unsupported", "correct", "invalid", "unsupported", "correct", "invalid", "unsupported", "correct", "invalid"]);
});
test("exceptional exits restore the scope; nested scopes share one budget and the next outer scope starts clean", () => {
  assert.throws(() => bounded(() => { throw new Error("boom"); }), /boom/);
  assert.equal(assessWorking(OK, ["x^2+3x+2"]).outcome, "verified");
  const r = bounded(() => [assessWorking(BOOM, ["a"]).resourceLimit, assessWorking(OK, ["x^2+3x+2"]).outcome]);   // nested: the second call inherits the exhausted shared budget (not an independent assessment)
  assert.equal(r[0], true); assert.equal(r[1], "unsupported");
  assert.equal(assessWorking(OK, ["x^2+3x+2"]).outcome, "verified");
});
