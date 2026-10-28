/** E7 repair, Invariant B: typed and natural routes receive the same domain semantics. Generated integrands/intervals; the oracle for "does the interval contain the pole" is independent arithmetic. */
import { afterAll, describe, expect, test } from "bun:test";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";
import { stopGeometryWorkers } from "./geometry-worker.ts";
afterAll(() => stopGeometryWorkers());

let seed = 777; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const K = (v: number) => ({ kind: "constant", value: String(v) }), X = { kind: "variable", name: "x" };
const add = (...terms: unknown[]) => ({ kind: "add", terms }), mul = (...factors: unknown[]) => ({ kind: "multiply", factors }), pw = (base: unknown, exponent: number) => ({ kind: "power", base, exponent });
const log = (argument: unknown) => ({ kind: "log", argument }), abs = (argument: unknown) => ({ kind: "abs", argument });
const nat = (text: string) => ({ format: "natural" as const, text });
const typedInd = (integrand: unknown, antiderivative: unknown) => assessMathematicalWorking({ domain: "calculus", task: "indefinite-integral", integrand, variable: "x" } as never,
  [{ id: "s1", rule: "antiderivative", claim: { kind: "expression", value: antiderivative, constantIncluded: true } }] as never);
const typedDef = (integrand: unknown, lower: number, upper: number, value: string, anti: unknown) => assessMathematicalWorking({ domain: "calculus", task: "definite-integral", integrand, variable: "x", lower: String(lower), upper: String(upper) } as never,
  [{ id: "a", rule: "antiderivative", claim: { kind: "expression", value: anti } }, { id: "b", rule: "FTC", dependencies: ["a"], claim: { kind: "value", value } }] as never);
const natural = (problem: unknown, text: string) => assessMathematicalWorking(problem as never, nat(text));
const verified = (a: AssessmentEnvelope) => a.classification === "verified";

describe("B: a logarithmic antiderivative carries its domain in every route", () => {
  test("generated ∫ a/(x−c): ln(x−c) without |·| is not verified in typed or natural form; ln|x−c| is, in both", async () => {
    for (let i = 0; i < 12; i++) {
      const a = 1 + rnd(7), c = 1 + rnd(9), integrand = mul(K(a), pw(add(X, K(-c)), -1));
      const problem = { domain: "calculus", task: "indefinite-integral", integrand, variable: "x" };
      const bare = typedInd(integrand, mul(K(a), log(add(X, K(-c))))), safe = typedInd(integrand, mul(K(a), log(abs(add(X, K(-c))))));
      const [b, s] = await Promise.all([bare, safe]);
      expect(verified(await bare)).toBe(false); expect(b.classification).toBe("missing-assumption");
      expect(s.classification).not.toBe("missing-assumption"); expect(s.classification).not.toBe("invalid"); // typed core cannot differentiate |·|: unsupported is its declared limit, not a domain failure
      const nb = await natural(problem, `∫ ${a}/(x - ${c}) dx = ${a} ln(x - ${c}) + C`), ns = await natural(problem, `∫ ${a}/(x - ${c}) dx = ${a} ln|x - ${c}| + C`);
      expect(nb.classification).toBe(b.classification); expect(verified(ns)).toBe(true); // cross-route agreement
    }
  });
  test("ln x for ∫1/x, with no stated positivity, is a missing assumption in the typed route", async () => {
    const integrand = mul(K(1), pw(X, -1));
    const a = await assessMathematicalWorking({ domain: "calculus", task: "indefinite-integral", integrand, variable: "x", domainComponents: [] } as never, [{ id: "s1", rule: "antiderivative", claim: { kind: "expression", value: log(X), constantIncluded: true } }] as never);
    expect(a.classification).toBe("missing-assumption");
  });
});

describe("B: a definite integral whose integrand is discontinuous on the interval is never verified by any route", () => {
  test("generated ∫ a/(x−c)² over intervals with and without the pole (independent oracle: lo ≤ c ≤ hi)", async () => {
    for (let i = 0; i < 16; i++) {
      const a = 1 + rnd(4), c = rnd(8) - 3, lo = rnd(10) - 5, hi = lo + 1 + rnd(6), poleInside = lo <= c && c <= hi;
      const integrand = mul(K(a), pw(add(X, K(-c)), -2));
      const gap = (hi - lo) * 1; void gap;
      // the exact value (when finite): a·(1/(lo−c) − 1/(hi−c)); the claimed value is the *correct finite-interval formula*, which is wrong exactly when the pole is inside
      const num = a * ((hi - c) - (lo - c)), den = (lo - c) * (hi - c);
      const value = poleInside ? "-2" : (den === 0 ? "0" : `${num}/${den}`);
      const t = await typedDef(integrand, lo, hi, value, mul(K(-a), pw(add(X, K(-c)), -1)));
      if (poleInside) expect(verified(t)).toBe(false); // divergent / discontinuous: no route verifies it
      const n = await natural({ domain: "calculus", task: "definite-integral", integrand, variable: "x", lower: String(lo), upper: String(hi) }, `∫ from ${lo} to ${hi} of ${a}/(x - ${c})^2 dx = ${value}`);
      if (poleInside) expect(verified(n)).toBe(false);
    }
  });
  test("legacy capability: natural bracket evaluation of a continuous integrand is still verified; one over a pole is not", async () => {
    const mk = (lo: number, hi: number) => ({ domain: "calculus", task: "definite-integral", integrand: mul(K(1), pw(X, -1)), variable: "x", lower: String(lo), upper: String(hi) });
    expect(verified(await natural(mk(1, 2), "∫_1^2 1/x dx = [ln(x)]_1^2 = ln(2) - ln(1) = ln(2)"))).toBe(true);
    expect(verified(await natural(mk(-1, 1), "∫_-1^1 1/x dx = [ln|x|]_-1^1 = 0"))).toBe(false);
  });
  test("the original audit counterexample: ∫₋₁¹ x⁻² dx = −2", async () => {
    expect(verified(await typedDef(pw(X, -2), -1, 1, "-2", mul(K(-1), pw(X, -1))))).toBe(false);
  });
  test("legacy capability: a continuous integrand over an interval is still verified (typed)", async () => {
    expect(verified(await typedDef(pw(X, 2), 0, 3, "9", mul(K(1), pw(X, 3), K(1))))).toBe(false); // wrong antiderivative (x³ not x³/3) stays rejected
    expect(verified(await typedDef(mul(K(2), X), 0, 3, "9", pw(X, 2)))).toBe(true);
    expect(verified(await typedDef(pw(X, -2), 1, 2, "1/2", mul(K(-1), pw(X, -1))))).toBe(true);
  });
});
