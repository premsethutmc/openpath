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
