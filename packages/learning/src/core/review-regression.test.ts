// Regression tests for the defects found by the independent review pass (reproducers kept verbatim). Expectations are from mathematics.
import test from "node:test";
import assert from "node:assert/strict";
import { assessWorking } from "./working-assessment.ts";
import { assessForEducator } from "./educator-evidence.ts";
const A = (p: string, l: string[], o = {}) => assessWorking(p, l, o);
test("D1: a verifier refusal never escapes; it is unsupported", () => {
  for (const [p, l] of [["Simplify 1/(x-1000000000000000000)", ["1/(x-1000000000000000000)"]], ["Simplify (x+1)^60/(x+2)^60", ["x"]]] as [string, string[]][]) { const a = A(p, l); assert.equal(a.outcome, "unsupported"); assert.equal(a.correct, null); }
  assert.equal(assessForEducator({ problem: "Simplify (x+1)^60/(x+2)^60", lines: ["x"] }).category, "unsupported-or-undecidable");
});
test("D2: a short high-power input cannot hold the thread (bounded time, never a different verdict)", () => {
  for (const k of [16, 24, 34, 44]) { const t = performance.now(); const a = A(`Simplify (x+1)^${k}/(x+2)^${k}`, ["x"]); assert.ok(["unsupported", "invalid"].includes(a.outcome), `${k}: ${a.outcome}`); assert.ok(performance.now() - t < 6000, `K=${k} took ${performance.now() - t} ms`); }
});
test("D4: shorthand restriction lists are not read as an expression line, so correct working is never invalid", () => {
  for (const [p, l] of [["Simplify (x^2-1)/(x-1)", ["x+1", "x ≠ 1, 2"]], ["Simplify (x^2-1)/(x-1)", ["x+1", "x ≠ 1, -1"]], ["Simplify (x^2-y^2)/(x-y)", ["x+y", "x, y ≠ 0"]], ["Simplify a*b/(a*c)", ["b/c", "a, c ≠ 0"]], ["Simplify (x^2-y^2)/(x-y)", ["x+y", "x ≠ y, 0"]]] as [string, string[]][]) assert.notEqual(A(p, l).outcome, "invalid", `${p} ${l}`);
  assert.equal(A("Simplify (x^2-1)/(x-1)", ["x+1", "x ≠ 1"]).outcome, "verified");       // the normal form still works
  assert.equal(A("Simplify (x^2-1)/(x-1)", ["1, x ≠ 1"]).outcome, "invalid");           // 1 is not x+1: still a real error
});
test("D5: a trailing word is text, not the product of two letters", () => {
  for (const w of ["ok", "so", "is", "QED", "ans x^2+2x+1"]) assert.notEqual(A("Expand (x+1)^2", [w.startsWith("ans") ? w : `x^2+2x+1 ${w}`]).outcome, "invalid", w);
  assert.equal(A("Simplify x*y", ["xy"]).outcome, "verified");   // a product written as xy is still read
});
test("D6: in a chain A = B = C an earlier link's unstated restriction is not forgotten", () => {
  const a = A("Simplify x+1", ["x+1 = (x+1)(x-2)/(x-2) = (x+1)(x-2)(x-3)/((x-2)(x-3)), x ≠ 3"]); assert.equal(a.outcome, "invalid"); assert.equal(a.firstInvalidStep, 1);
  assert.notEqual(A("Simplify x+1", ["x+1 = (x+1)(x-2)/(x-2) = (x+1)(x-2)(x-3)/((x-2)(x-3)), x ≠ 3, x ≠ 2"]).outcome, "invalid");   // both stated: conditional, not invalid
});
test("D7: a restriction lost at irrational values stays visible in the derivation and the educator evidence", () => {
  const e = assessForEducator({ problem: "Simplify (x^2-2)/(x^2-2)", lines: ["1"] });
  assert.equal(e.category, "valid-with-outstanding-obligations"); assert.ok(e.outstandingObligations.length > 0);
});
test("D9: lowest terms includes a common numeric factor", () => {
  for (const [p, l] of [["Simplify (3x+6)/(3x+9)", ["(3x+6)/(3x+9)"]], ["Simplify (2x+2)/(4x)", ["(2x+2)/(4x)"]], ["Simplify (3a+6b)/(3a+9b)", ["(3a+6b)/(3a+9b)"]]] as [string, string[]][]) assert.notEqual(A(p, l).outcome, "verified", p);
  assert.equal(A("Simplify (3x+6)/(3x+9)", ["(x+2)/(x+3)"]).outcome, "verified");
  assert.equal(A("Simplify (x+1)/(2x)", ["(x+1)/(2x)"]).outcome, "verified");
});
test("D10: ambiguous problem or line text never gets a definite verdict", () => {
  for (const [p, l] of [["Simplify 1/2x", ["x/2"]], ["Simplify 1/2x", ["1/(2x)"]], ["Simplify 6/2(1+2)", ["9"]], ["Simplify 1/(x(x+1))", ["1/x(x+1)"]], ["Simplify 1/((x+1)(x+2))", ["1/(x+1)(x+2)"]]] as [string, string[]][]) { const a = A(p, l); assert.equal(a.outcome, "ambiguous", `${p} ${l}`); assert.equal(a.correct, null); }
  assert.equal(A("Simplify 1/(2x)", ["1/(2*x)"]).outcome, "verified");     // bracketed: unambiguous
});
import { assessDerivation } from "./derivation.ts";
test("D15: coefficient blow-up in a two-letter gcd refuses quickly instead of running for minutes / gigabytes", () => {
  const t = performance.now();
  const a = A("((2x^2 - xy - y^2)(x^2 + y^2 + 1))/((2x^2 - xy - y^2)(x^2 - x*y - 2y^2))", ["((x^2 + y^2 + 1))/((x^8 - x*y - 2y^2))"]);
  assert.ok(["unsupported", "invalid"].includes(a.outcome), a.outcome); assert.ok(performance.now() - t < 5000);
});
test("D3: a derivation shares one budget, so cost cannot multiply by the number of lines", () => {
  const poly = "-2x^4 - 2x^3y - 3x^2y + x^2 + 2xy^3 - 4xy^2 + 4xy + 2y^4 - 5y^3 + 9y^2 - 8y + 6"; const t = performance.now();
  const r = assessDerivation({ problem: `Factorise ${poly}`, lines: Array(40).fill(poly) });
  assert.equal(r.resourceLimit, true); assert.equal(r.mathematics, "undetermined"); assert.ok(performance.now() - t < 8000);
});
test("D10 residual / D12 residual: x2 is ambiguous; ill-typed input is unsupported, never an exception", () => {
  for (const [p, l] of [["Simplify x+x", ["x2"]], ["Simplify x*x", ["x2"]]] as [string, string[]][]) assert.equal(A(p, l).outcome, "ambiguous", `${p} ${l}`);
  assert.equal(assessWorking(undefined as unknown as string, ["x"]).outcome, "unsupported");
  assert.equal(assessWorking("Expand (x+1)^2", [null as unknown as string]).outcome, "unsupported");
  assert.equal(assessDerivation({ problem: undefined as unknown as string, lines: [] }).mathematics, "undetermined");
  assert.equal(assessDerivation({ problem: "Expand (x+1)^2", lines: [null as unknown as string] }).mathematics, "undetermined");
  assert.equal(assessDerivation({ problem: "Expand (x+1)^2", lines: ["x^2+2x+1"], config: { maxLines: NaN } }).mathematics, "correct");
});
import { verifyWorkingStep } from "./working-assessment.ts";
test("D11: a single-step check honours the original problem's domain (a restored restriction is not new)", () => {
  assert.equal(verifyWorkingStep("Simplify (x^2-1)/(x-1)", "x+1", "(x+1)(x-1)/(x-1)").outcome, "verified");
  assert.equal(verifyWorkingStep("Simplify (a^2-b^2)/(a-b)", "a+b", "(a+b)(a-b)/(a-b)").outcome, "verified");
  assert.equal(verifyWorkingStep("Simplify x+1", "x+1", "(x+1)(x-2)/(x-2)").outcome, "invalid");     // x != 2 is NOT in the original: still new
  assert.equal(verifyWorkingStep("Simplify a+b", "a+b", "(a+b)(a-2)/(a-2)").outcome, "invalid");
});

// ── second independent review (commits a8fcd27, b2c035b): confirmed defects and tests that did not exercise their fix ──
import { setDefaultOps, bounded, budgetUsed, LIMITS } from "./budget.ts";
import * as V from "../reasoner/verifier/verifier.ts";
test("R1: ill-typed input never throws from the step API or from options (unsupported)", () => {
  const bad: unknown[] = [null, undefined, 5, {}, [], true, NaN, () => 1];
  for (const p of bad) for (const f of bad) for (const t of bad) assert.doesNotThrow(() => { const v = verifyWorkingStep(p as string, f as string, t as string); if (typeof p !== "string" || typeof f !== "string" || typeof t !== "string") assert.equal(v.outcome, "unsupported"); });
  for (const o of [null, 5, "x", [], { requiredSkills: 5 }, { requiredSkills: "factorise" }, { form: 7 }]) assert.doesNotThrow(() => assessWorking("Expand (x+1)^2", ["x^2+2x+1"], o as never));
  assert.equal(assessWorking("Expand (x+1)^2", ["x^2+2x+1"], { requiredSkills: 5 } as never).outcome, "verified");      // a bad option is ignored; the working is still decided
  const hostile = { get eq(): string { throw new Error("boom"); } };
  assert.equal(assessWorking("Expand (x+1)^2", [hostile as never]).outcome, "unsupported");
});
test("R2: declarations: null means no declarations (as undefined), not an unreadable input", () => {
  const a = assessDerivation({ problem: "Simplify (x^2-1)/(x-1)", lines: ["x+1", "x ≠ 1"], declarations: null as never }), b = assessDerivation({ problem: "Simplify (x^2-1)/(x-1)", lines: ["x+1", "x ≠ 1"] });
  assert.equal(a.mathematics, "correct"); assert.deepEqual([a.mathematics, a.outstandingObligations], [b.mathematics, b.outstandingObligations]);
});
test("R3: the single-step API also refuses to read ambiguous notation (x2) instead of guessing x*2", () => {
  const v = verifyWorkingStep("Simplify x+x", "x+x", "x2");
  assert.equal(v.outcome, "unsupported"); assert.match(v.detail, /more than one way/);
  assert.equal(verifyWorkingStep("Simplify x+x", "x+x", "2x").outcome, "verified");      // the unambiguous spelling is unaffected
  assert.equal(verifyWorkingStep("Simplify x+x", "x+x", "x^2").outcome, "invalid");
});
test("R4 (test strength): one derivation shares ONE budget; a budget that fits a single assessment cannot be spent again per prefix", () => {
  const P = "Simplify (x^2-1)/(x-1)", L = "(x-1)(x+1)/(x-1)", many = [L, "x+1", "(x+1)", "1+x", "x+1", "x+1", "x+1", "1x+1"];
  try {
    setDefaultOps(100_000);
    const one = assessWorking(P, [L]); assert.equal(one.resourceLimit ?? false, false);
    const d = assessDerivation({ problem: P, lines: many }); assert.equal(d.resourceLimit, true); assert.equal(d.mathematics, "undetermined");      // fresh budgets per prefix would have decided it
    setDefaultOps(LIMITS.ops);
    assert.equal(assessDerivation({ problem: P, lines: many }).mathematics, "correct");      // with the real budget the same working is decided
  } finally { setDefaultOps(LIMITS.ops); }
});
test("R5: NaN/negative size configuration cannot disable the line limit (the derivation guard is defence in depth: assessWorking enforces the same limit independently, so this test does not isolate the guard)", () => {
  const lines = Array.from({ length: 45 }, () => "x+1");
  for (const config of [{ maxLines: NaN }, { maxLines: Infinity, maxChars: NaN }, { maxLines: -1 }]) { const d = assessDerivation({ problem: "Simplify x+1", lines, config } as never); assert.equal(d.resourceLimit, true, JSON.stringify(config)); assert.equal(d.mathematics, "undetermined"); }
});
test("R6 (test strength): verifier arithmetic is metered by operand SIZE, not only by count (bigger coefficients cost more before the limit trips)", () => {
  const cost = (c: string) => { try { bounded(() => V.relateLines(`(x+${c})^4*(x+2)=0`, `(x+${c})^4*(x+2)=0`, `(x+${c})^4*(x+2)=0`)); } catch { /* the limit tripping is the point */ } return budgetUsed(); };
  const small = cost("3"), mid = cost("1000003"), big = cost("99999999999");
  assert.ok(big > mid && mid > 0 && small > 0, `${small} ${mid} ${big}`);
});
test("R7: restoring an irrational restriction the original also has is not 'invalid' (valid in mathematics; the context-free API makes no claim); a genuinely new one is still invalid", () => {
  const v = verifyWorkingStep("Simplify (x^2-2)/(x^2-2)", "1", "(x^2-2)/(x^2-2)");
  assert.notEqual(v.outcome, "invalid"); assert.notEqual(v.correct, false);
  assert.equal(verifyWorkingStep("Simplify x", "x", "x*(x^2-2)/(x^2-2)").outcome, "invalid");      // the original has no such restriction
});
