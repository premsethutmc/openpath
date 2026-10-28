import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";

const R = "tools/mathematics/generalization-e6r/";
const run = (problem: unknown, lines: string[]): Promise<AssessmentEnvelope> => assessMathematicalWorking(problem as never, { format: "natural" as const, text: lines.join("\n") });
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e }), mul = (...f: unknown[]) => ({ kind: "multiply", factors: f }), add = (...t: unknown[]) => ({ kind: "add", terms: t });
const never = (a: AssessmentEnvelope) => { expect(a.classification).not.toBe("verified"); expect(a.complete).not.toBe(true); };
const lim = (f: unknown, ap: string, side = "both") => ({ domain: "calculus", task: "limit", expression: f, variable: "x", approach: ap, side });
const recip = (c: string) => mul(K("1"), pw(add(X, mul(K("-1"), K(c))), -1));
const prob = (task: string, data: unknown, assumptions: string[] = [], area = "probability") => ({ domain: "probability-statistics", area, task, data, assumptions });

describe("E6-R domain-restriction semantics follow the blind adjudication (restriction implied by the task, carried forward, genuinely missing, restricted-domain equality)", () => {
  const fx = JSON.parse(readFileSync(R + "adjudication/domain-restriction-fixtures.v1.json", "utf8")).cases as { caseId: string; problem: unknown; text: string; blindVerdict: string }[];
  test("all designed fixtures receive the independently adjudicated verdict", async () => {
    for (const c of fx) { const a = await assessMathematicalWorking(c.problem as never, { format: "natural", text: c.text }); expect([c.caseId, a.classification]).toEqual([c.caseId, c.blindVerdict]); }
  });
  test("no fixture that the adjudicator did not call verified is ever accepted", async () => {
    for (const c of fx.filter((x) => x.blindVerdict !== "verified")) never(await assessMathematicalWorking(c.problem as never, { format: "natural", text: c.text }));
  });
});

describe("E6-R one-sided limits keep their direction", () => {
  test("right-hand infinite limit is accepted, the wrong side is not", async () => {
    const p = lim(recip("2"), "2", "right");
    expect((await run(p, ["lim x->2+ (1/(x - 2)) = ∞"])).classification).toBe("verified");
    never(await run(p, ["lim x->2- (1/(x - 2)) = ∞"]));
    never(await run(p, ["lim_(x→2) (1/(x - 2)) = ∞"]));
  });
  test("a two-sided DNE is justified by two one-sided limits and not by one", async () => {
    const p = lim(recip("1"), "1");
    expect((await run(p, ["lim_(x→1+) (1/(x - 1)) = ∞", "lim_(x→1-) (1/(x - 1)) = -∞", "lim_(x→1) (1/(x - 1)) = does not exist"])).classification).toBe("verified");
    never(await run(p, ["lim_(x→1+) (1/(x - 1)) = ∞"]));
    never(await run(p, ["lim_(x→1+) (1/(x - 1)) = ∞", "lim_(x→1-) (1/(x - 1)) = ∞", "lim_(x→1) (1/(x - 1)) = does not exist"]));
  });
  test("a spaced sign is arithmetic, not a one-sided marker", async () => { never(await run(lim(recip("2"), "2", "right"), ["lim x->2 + 1/(x - 2) = ∞"])); });
});

describe("E6-R ambiguous notation is not read as a joint probability without contextual authorisation", () => {
  const ind = prob("independent-intersection", { pa: "1/2", pb: "1/3" }, ["independent"]);
  test("the comma list is licensed only by a typed joint task", async () => {
    expect((await run(ind, ["P(A, B) = 1/6"])).classification).toBe("verified");
    expect((await run(ind, ["P(A∩B) = P(A)P(B) = 1/6"])).classification).toBe("verified");
    const a = await run(prob("conditional", { pab: "1/8", pb: "1/2" }), ["P(A, B) = 1/8"]); never(a); expect(a.classification).toBe("ambiguous");
    const b = await run(prob("complement", { pa: "2/5" }), ["P(A, B) = 3/5"]); never(b); expect(b.classification).toBe("ambiguous");
  });
  test("a comma with a conditioning bar or non-event content is never joint", async () => { never(await run(ind, ["P(A | B, C) = 1/6"])); });
  test("permutation notation P(n, r) is unaffected", async () => {
    expect((await run(prob("permutation", { n: 7, r: 3 }, ["ordered"], "combinatorics"), ["P(7,3) = 7*6*5 = 210"])).classification).toBe("verified");
  });
});

describe("E6-R true-but-different chains are incomplete, not invalid or verified", () => {
  test("conjugate-product detour and an irrelevant modulus", async () => {
    const mulc = { domain: "complex-polynomial", area: "arithmetic", task: "multiply", data: { a: { re: "1", im: "2" }, b: { re: "3", im: "-1" } } };
    const a = await run(mulc, ["conj((1 + 2*i)*(3 - i)) = conj(1 + 2*i)*conj(3 - i) = (1 - 2*i)*(3 + i) = 5 - 5*i"]); never(a); expect(a.classification).toBe("incomplete");
    expect((await run(mulc, ["(1 + 2*i)*(3 - i) = 3 - i + 6*i - 2*i^2 = 5 + 5*i"])).classification).toBe("verified");
    const root = { domain: "complex-polynomial", area: "polynomial", task: "verify-root", assumptions: ["real-coefficients"], coefficientDomain: "complex", data: { coefficients: ["1", "-6", "25"], root: { re: "3", im: "4" } } };
    const b = await run(root, ["|3 + 4i| = √(9 + 16) = 5"]); never(b); expect(b.classification).toBe("incomplete");
  });
});

describe("E6-R complex roots follow the problem's number domain", () => {
  const q = (dom: string) => ({ domain: "complex-polynomial", area: "polynomial", task: "quadratic-roots", coefficientDomain: dom, data: { coefficients: ["1", "4", "13"] } });
  test("over the complex numbers every root is required", async () => {
    expect((await run(q("complex"), ["D = 4^2 - 4*1*13 = -36", "x = (-4 + 6i)/2 = -2 + 3i", "x = (-4 - 6i)/2 = -2 - 3i"])).classification).toBe("verified");
    const a = await run(q("complex"), ["D = 16 - 52 = -36", "x = (-4 + 6i)/2 = -2 + 3i"]); never(a); expect(a.classification).toBe("incomplete");
    never(await run(q("complex"), ["D = 16 - 52 = -36", "x = (-4 + 6)/2 = 1"]));
  });
  test("over the real numbers the correct conclusion is that there are none", async () => {
    expect((await run(q("real"), ["D = 16 - 52 = -36 < 0", "no real roots"])).classification).toBe("verified");
    never(await run(q("real"), ["D = 16 - 52 = -36", "x = -2 + 3i", "x = -2 - 3i"]));
    never(await run(q("real"), ["D = 16 - 52 = -36 > 0", "no real roots"]));
  });
  test("claiming no real roots when real roots exist is invalid", async () => {
    const a = await run({ domain: "complex-polynomial", area: "polynomial", task: "quadratic-roots", coefficientDomain: "real", data: { coefficients: ["1", "-5", "6"] } }, ["no real roots"]); never(a);
  });
});

describe("E6-R verdict contract: a missing integration constant is classified consistently", () => {
  const ind = { domain: "calculus", task: "indefinite-integral", integrand: add(mul(K("5"), pw(X, 4)), K("1")), variable: "x" };
  test("single-line, multi-line and substitution forms without +C are all missing-assumption", async () => {
    for (const lines of [["∫ 5x^4 + 1 dx = x^5 + x"], ["∫ 5x^4 + 1 dx = ∫ 5x^4 dx + ∫ 1 dx", "= x^5 + x"]]) { const a = await run(ind, lines); never(a); expect(a.classification).toBe("missing-assumption"); }
    const sub = { domain: "calculus", task: "indefinite-integral", integrand: mul(K("2"), X, pw(add(pw(X, 2), K("1")), 3)), variable: "x" };
    const b = await run(sub, ["u = x^2 + 1", "du = 2x dx", "∫ 2x (x^2+1)^3 dx = ∫ u^3 du = u^4/4"]); never(b); expect(b.classification).toBe("missing-assumption");
  });
  test("an invalid transformation without +C is invalid, not missing-assumption (invalid dominates)", async () => { expect((await run(ind, ["∫ 5x^4 + 1 dx = x^4 + x"])).classification).toBe("invalid"); });
  test("with the constant the same working is verified", async () => { expect((await run(ind, ["∫ 5x^4 + 1 dx = ∫ 5x^4 dx + ∫ 1 dx", "= x^5 + x + C"])).classification).toBe("verified"); });
  test("a constant dropped after being written is never accepted", async () => { never(await run(ind, ["∫ 5x^4 + 1 dx = x^5 + x + C", "= x^5 + x"])); });
});

describe("E6-R log-domain tracking rules are structural, not string-specific", () => {
  const D = (e: unknown) => ({ domain: "calculus", task: "derivative", expression: e, variable: "x" });
  const ln = (a: unknown) => ({ kind: "log", argument: a });
  test("renamed variables and constants keep the same verdicts", async () => {
    // implied by the task: ln(t) + ln(5t) = ln(5t^2) for the real function ln t + ln 5t
    const T = { kind: "variable", name: "t" };
    expect((await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: add(ln(T), ln(mul(K("5"), T))), variable: "t" } as never, { format: "natural", text: "ln(t) + ln(5t) = ln(5t^2)\nd/dt[ln(t) + ln(5t)] = 2/t" })).classification).toBe("verified");
    // narrowing of ln(t^2) to 2 ln t needs t > 0, which the task does not give
    const a = await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: ln(pw(T, 2)), variable: "t" } as never, { format: "natural", text: "ln(t^2) = 2 ln(t)\nd/dt[ln(t^2)] = 2/t" }); never(a); expect(a.classification).toBe("missing-assumption");
  });
  test("an even power inside ln needs non-zero, a product of two factors needs the factors positive only when split", async () => {
    expect((await run(D(ln(add(pw(X, 2), K("-4")))), ["For x > 2: ln(x^2 - 4) = ln(x - 2) + ln(x + 2)", "d/dx[ln(x^2 - 4)] = 1/(x - 2) + 1/(x + 2)"])).classification).toBe("verified");
    const bad = await run(D(ln(add(pw(X, 2), K("-4")))), ["ln(x^2 - 4) = ln(x - 2) + ln(x + 2)", "d/dx[ln(x^2 - 4)] = 1/(x - 2) + 1/(x + 2)"]); never(bad); expect(bad.classification).toBe("missing-assumption");
  });
  test("sqrt(x^2) = x expands the domain wrongly and is invalid", async () => { const a = await run(D({ kind: "root", index: 2, radicand: pw(X, 2) }), ["sqrt(x^2) = x", "d/dx[sqrt(x^2)] = 1"]); never(a); expect(a.classification).toBe("invalid"); });
});

describe("E6-R second-round structural repairs (found by the first fresh holdout, now an exposed regression set)", () => {
  const D = (e: unknown, restrictions?: string[]) => ({ domain: "calculus", task: "derivative", expression: e, variable: "x", ...(restrictions ? { restrictions } : {}) });
  const ln = (a: unknown) => ({ kind: "log", argument: a });
  test("the sign of a logarithm's argument is part of its domain: ln(-x) needs x < 0, never x > 0", async () => {
    expect((await run(D(ln(pw(X, 2)), ["x<0"]), ["ln(x^2) = 2ln(-x)", "f'(x) = d/dx[2ln(-x)] = 2(-1)/(-x) = 2/x"])).classification).toBe("verified");
    never(await run(D(ln(pw(X, 2)), ["x>0"]), ["ln(x^2) = 2ln(-x)", "f'(x) = d/dx[2ln(-x)] = 2/x"]));
    never(await run(D(ln(pw(X, 2))), ["ln(x^2) = 2ln(-x)", "f'(x) = d/dx[2ln(-x)] = 2/x"]));
  });
  test("ln(x) = ln(-x) holds on no common domain and is never accepted, even with both restrictions stated", async () => {
    never(await run(D(ln(X), ["x>0"]), ["ln(x) = ln(-x)", "f'(x) = 1/x"]));
    never(await run(D(ln(X), ["x>0", "x<0"]), ["ln(x) = ln(-x)", "f'(x) = 1/x"]));
  });
  test("exp(ln u) keeps the domain of the logarithm it removes", async () => {
    const f = { kind: "exp", argument: ln(pw(X, 2)) };
    expect((await run(D(f), ["e^(ln(x^2)) = x^2", "f'(x) = d/dx(x^2) = 2x"])).classification).toBe("verified");
  });
  test("sqrt(ab) = sqrt(a)sqrt(b) is accepted exactly where each factor is non-negative", async () => {
    const f = { kind: "root", index: 2, radicand: add(pw(X, 2), K("-4")) };
    expect((await run(D(f, ["x>2"]), ["√(x^2 - 4) = √(x - 2)√(x + 2)", "f'(x) = d/dx(√(x - 2)√(x + 2)) = x/√(x^2 - 4)"])).classification).toBe("verified");
    never(await run(D(f), ["√(x^2 - 4) = √(x - 2)√(x + 2)", "f'(x) = x/√(x^2 - 4)"]));
    never(await run(D(f, ["x<-2"]), ["√(x^2 - 4) = √(x - 2)√(x + 2)", "f'(x) = x/√(x^2 - 4)"]));
  });
  test("a finite-probability product of one draw with itself needs replacement or independence", async () => {
    const p = (as: string[]) => prob("finite", { favourable: 9, total: 25 }, as);
    const w = ["P(two red), 6 red of 10", "6/10·6/10 = 36/100 = 9/25"];
    never(await run(p(["equiprobable"]), w));
    expect((await run(p(["equiprobable", "with-replacement"]), w)).classification).toBe("verified");
    never(await run(p(["equiprobable", "without-replacement"]), w));
  });
  test("C(n,r) states the unordered convention and P(n,r) the ordered one; the opposite notation is not accepted", async () => {
    expect((await run(prob("combination", { n: 12, r: 9 }, [], "combinatorics"), ["C(12,9) = C(12,3) = 12·11·10/(3·2·1) = 220"])).classification).toBe("verified");
    expect((await run(prob("permutation", { n: 8, r: 3 }, [], "combinatorics"), ["P(8,3) = 8·7·6 = 336"])).classification).toBe("verified");
    never(await run(prob("permutation", { n: 8, r: 3 }, [], "combinatorics"), ["C(8,3) = 56"]));
    never(await run(prob("combination", { n: 8, r: 3 }, [], "combinatorics"), ["P(8,3) = 336"]));
  });
  test("an exact closed form with e^1 and e^(-1) is a final form, and (a + bi)/c with no common factor is a reduced complex quotient", async () => {
    const dv = { domain: "complex-polynomial", area: "arithmetic", task: "divide", data: { a: { re: "7", im: "1" }, b: { re: "2", im: "-1" } } };
    expect((await run(dv, ["(7 + i)/(2 - i) = (7 + i)(2 + i)/((2 - i)(2 + i)) = (14 + 7i + 2i + i^2)/(4 - i^2) = (13 + 9i)/5"])).classification).toBe("verified");
    never(await run(dv, ["(7 + i)/(2 - i) = (13 + 9i)/4"]));
  });
  test("an integration constant written once at the end of a chain covers the chain; its absence at the end is still missing-assumption", async () => {
    const ibp = { domain: "calculus", task: "indefinite-integral", integrand: mul(pw(X, 2), { kind: "exp", argument: mul(K("-1"), X) }), variable: "x" };
    const w = ["∫ x^2 e^(-x) dx = -x^2 e^(-x) + 2 ∫ x e^(-x) dx = -x^2 e^(-x) + 2(-x e^(-x) - e^(-x))"];
    expect((await run(ibp, [w[0] + " = -(x^2 + 2x + 2) e^(-x) + C"])).classification).toBe("verified");
    expect((await run(ibp, [w[0] + " = -(x^2 + 2x + 2) e^(-x)"])).classification).toBe("missing-assumption");
  });
});
