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
