import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";

const E6 = "tools/mathematics/generalization-e6/";
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const run = (problem: unknown, lines: string[]): Promise<AssessmentEnvelope> => assessMathematicalWorking(problem as never, { format: "natural" as const, text: lines.join("\n") });
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e });
const mul = (...f: unknown[]) => ({ kind: "multiply", factors: f }), add = (...t: unknown[]) => ({ kind: "add", terms: t });
const der = { domain: "calculus", task: "derivative", expression: pw(add(mul(K("3"), X), K("1")), 5), variable: "x" };
const ind = { domain: "calculus", task: "indefinite-integral", integrand: add(mul(K("5"), pw(X, 4)), K("1")), variable: "x" };
const lim = { domain: "calculus", task: "limit", expression: mul({ kind: "sin", argument: X }, pw(X, -1)), variable: "x", approach: "0" };
const prob = (task: string, data: unknown, assumptions: string[] = [], area = "probability") => ({ domain: "probability-statistics", area, task, data, assumptions });
const conj = { domain: "complex-polynomial", area: "polynomial", task: "conjugate-root", assumptions: ["real-coefficients"], coefficientDomain: "real", data: { coefficients: ["1", "-6", "13"], root: { re: "3", im: "2" } } };
const accepted = (a: AssessmentEnvelope) => { expect(a.classification).toBe("verified"); expect(a.acceptanceGate?.independentlyVerified).toBe(true); expect(a.complete).toBe(true); };
const never = (a: AssessmentEnvelope) => { expect(a.classification).not.toBe("verified"); expect(a.complete).not.toBe(true); };

describe("E6 frozen inputs are untouched", () => {
  test("development, validation and sealed corpora match their recorded hashes", () => {
    for (const [s, f] of [["dev", "dev-cases.v1.json"], ["validation", "validation-cases.v1.json"], ["sealed", "sealed-cases.v1.json"]]) expect(sha(E6 + f)).toBe(readFileSync(E6 + "FROZEN_SHA256." + s, "utf8").trim().split(/\s+/)[0]);
  });
});

describe("E6 calculus: correct working is accepted only with independently checked lines", () => {
  test("chain-rule derivative, both with a continuation line", async () => {
    accepted(await run(der, ["d/dx (3x+1)^5 = 5(3x+1)^4 * 3", "= 15(3x+1)^4"]));
  });
  test("indefinite integral with its constant", async () => { accepted(await run(ind, ["∫ 5x^4 + 1 dx = x^5 + x + C"])); });
  test("a classical limit", async () => { accepted(await run(lim, ["lim_(x→0) sin(x)/x = 1"])); });
});

describe("E6 adversarial: invalid work is never rescued by a correct-looking answer", () => {
  test("correct final answer after an invalid intermediate line", async () => {
    const a = await run(ind, ["∫ 5x^4 + 1 dx = x^4 + x + C", "= x^5 + x + C"]); never(a); expect(a.classification).toBe("invalid"); expect(a.firstInvalidStep).toBe(0);
  });
  test("incorrect chain rule (inner derivative dropped)", async () => { const a = await run(der, ["d/dx (3x+1)^5 = 5(3x+1)^4", "= 15(3x+1)^4"]); never(a); expect(a.classification).toBe("invalid"); });
  test("incorrect integration rule", async () => { const a = await run(ind, ["∫ 5x^4 + 1 dx = 5x^5 + x + C"]); never(a); expect(a.classification).toBe("invalid"); });
  test("a wrong limit value", async () => { const a = await run(lim, ["lim_(x→0) sin(x)/x = 0"]); never(a); expect(a.classification).toBe("invalid"); });
  test("an invalid substitution (u defined, differential wrong)", async () => {
    const p = { domain: "calculus", task: "indefinite-integral", integrand: mul(K("2"), X, pw(add(pw(X, 2), K("1")), 3)), variable: "x" };
    never(await run(p, ["u = x^2 + 1", "du = x dx", "∫ 2x (x^2+1)^3 dx = ∫ 2 u^3 du = u^4/2 + C"]));
  });
  test("the missing constant of integration is a missing assumption, never a complete integral", async () => {
    const a = await run(ind, ["∫ 5x^4 + 1 dx = x^5 + x"]); never(a); expect(a.classification).toBe("missing-assumption");
  });
  test("ambiguous notation (bare log) fails closed", async () => { never(await run({ domain: "calculus", task: "derivative", expression: { kind: "log", argument: X }, variable: "x" }, ["d/dx log(x) = 1/x"])); });
  test("wrong symbol binding: differentiating with respect to a different symbol", async () => { never(await run(der, ["d/dy (3x+1)^5 = 15(3x+1)^4"])); });
  test("a trailing sentence without the final answer leaves the working incomplete", async () => { never(await run(der, ["d/dx (3x+1)^5 = 5(3x+1)^4 * 3", "so the derivative is found"])); });
});

describe("E6 probability, statistics and complex work", () => {
  test("a complement with the right arithmetic is accepted; a wrong denominator is invalid", async () => {
    accepted(await run(prob("complement", { pa: "2/5" }), ["P(not A) = 1 - 2/5", "P(not A) = 3/5"]));
    const a = await run(prob("complement", { pa: "2/5" }), ["P(not A) = 1 - 2/5", "P(not A) = 3/4"]); never(a); expect(a.classification).toBe("invalid");
  });
  test("an unsupported independence assumption is a missing assumption; stating it fixes it", async () => {
    const d = { pa: "1/2", pb: "1/3" };
    const a = await run(prob("independent-intersection", d), ["P(A∩B)=P(A)P(B)=1/6"]); never(a); expect(a.classification).toBe("missing-assumption");
    accepted(await run(prob("independent-intersection", d, ["independent"]), ["P(A∩B)=P(A)P(B)=1/6"]));
  });
  test("a negated assumption in the working invalidates the independence step", async () => {
    never(await run(prob("independent-intersection", { pa: "1/2", pb: "1/3" }), ["The events are not independent.", "P(A∩B)=P(A)P(B)=1/6"]));
  });
  test("a mean computed with the wrong divisor is invalid; the right one is accepted", async () => {
    const p = prob("mean", { values: ["4", "8", "3"] }, [], "statistics");
    accepted(await run(p, ["mean = (4+8+3)/3", "mean = 5"]));
    const a = await run(p, ["mean = (4+8+3)/3", "mean = 6"]); never(a); expect(a.classification).toBe("invalid");
  });
  test("an unrelated true fact does not invalidate otherwise correct working", async () => {
    accepted(await run(prob("mean", { values: ["4", "8", "3"] }, [], "statistics"), ["mean = (4+8+3)/3", "2^10 = 1024", "mean = 5"]));
  });
  test("a plus-or-minus answer is ambiguous", async () => { const a = await run(prob("mean", { values: ["4", "8", "3"] }, [], "statistics"), ["mean = ±5"]); never(a); expect(a.classification).toBe("ambiguous"); });
  test("incorrect conjugation is never accepted", async () => {
    never(await run(conj, ["The coefficients of p are real.", "conj(3 + 2i) = 3 + 2i"]));
    accepted(await run(conj, ["The coefficients of p are real.", "conj(3 + 2i) = 3 - 2i"]));
  });
  test("a missing root of a polynomial is never accepted as the complete root set", async () => {
    never(await run({ domain: "complex-polynomial", area: "polynomial", task: "quadratic-roots", coefficientDomain: "complex", data: { coefficients: ["1", "-5", "6"] } }, ["x^2 - 5x + 6 = (x-2)(x-3)", "x = 2"]));
  });
  test("a cross-domain label cannot be bound to a calculus problem (wrong symbol binding)", async () => { never(await run(der, ["P(A) = 1/2", "P(A) = 15(3x+1)^4"])); });
});

describe("E6 resource limits fail closed", () => {
  test("oversize input, deep nesting and huge powers are refused, never accepted", async () => {
    const big = await run(der, ["x^" + "9".repeat(5000)]); never(big); expect(big.classification).toBe("resource-exhausted");
    never(await run(der, ["d/dx " + "(".repeat(300) + "x" + ")".repeat(300) + " = 1"]));
    never(await run(prob("power-i", { exponent: 27 }, [], "arithmetic"), ["i^9999999999999999999999 = i"]));
  });
});

describe("E6 verdict-contract revision is documented and the historical label is preserved", () => {
  test("the D5 missing +C label is revised from invalid to missing-assumption by contract", async () => {
    const a = await run(ind, ["∫ 5x^4 + 1 dx = x^5 + x"]); expect(a.classification).toBe("missing-assumption");
    expect(readFileSync("packages/learning/src/unified-math-engine.ts", "utf8")).toContain("D5");
  });
});
