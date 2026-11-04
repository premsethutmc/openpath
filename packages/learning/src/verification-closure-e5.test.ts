import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking, type AssessmentEnvelope } from "./unified-math-engine.ts";
import { limitRF, q, rfOf, Overflow } from "./exact-e5.ts";

const E5 = "tools/mathematics/geocalc-e5/";
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const nat = (text: string) => ({ format: "natural" as const, text });
const run = (problem: unknown, lines: string[]): Promise<AssessmentEnvelope> => assessMathematicalWorking(problem as never, nat(lines.join("\n")));

const tri = (a: number, b: number, c: number, cond = ["nondegenerate:ABC"]) => ({ domain: "geometry", problem: { id: "tri", objects: [{ id: "ABC", kind: "triangle" }], facts: [{ predicate: "angle_measure", args: ["A"], value: a }, { predicate: "angle_measure", args: ["B"], value: b }], conditions: cond, goal: { predicate: "angle_measure", args: ["C"], value: c } } });
const slope = (v: string) => ({ domain: "geometry", problem: { id: "s", objects: [{ id: "A", kind: "point", data: { x: 1, y: 2 } }, { id: "B", kind: "point", data: { x: 5, y: 8 } }, { id: "AB", kind: "segment", data: { points: ["A", "B"] } }], facts: [], conditions: [], goal: { predicate: "slope", args: ["AB"], value: v } } });
const K = (v: string) => ({ kind: "constant", value: v }), X = { kind: "variable", name: "x" };
const pw = (b: unknown, e: number) => ({ kind: "power", base: b, exponent: e });
const chain = { domain: "calculus", task: "derivative", expression: pw({ kind: "add", terms: [{ kind: "multiply", factors: [K("3"), X] }, K("1")] }, 5), variable: "x" };
const indef = { domain: "calculus", task: "indefinite-integral", integrand: { kind: "add", terms: [{ kind: "multiply", factors: [K("5"), pw(X, 4)] }, K("1")] }, variable: "x" };

const accepted = (a: AssessmentEnvelope) => { expect(a.classification).toBe("verified"); expect(a.acceptanceGate?.independentlyVerified).toBe(true); };
const never = (a: AssessmentEnvelope) => { expect(a.classification).not.toBe("verified"); expect(a.complete).not.toBe(true); };

describe("E5 frozen inputs are untouched", () => {
  test("the E5 development and sealed corpora match their recorded hashes", () => {
    for (const line of readFileSync(E5 + "FROZEN_SHA256", "utf8").trim().split("\n")) { const [h, f] = line.trim().split(/\s+/); expect(sha(E5 + f)).toBe(h); }
  });
});

describe("E5 geometry: angle reasoning is judged by exact linear algebra over the stated facts", () => {
  test("a correct triangle-sum solution is accepted with independent evidence", async () => {
    accepted(await run(tri(30, 60, 90), ["A + B + C = 180°", "30° + 60° + C = 180°", "C = 90°"]));
    accepted(await run(tri(30, 60, 90), ["∠A + ∠B + ∠C = 180°", "∠C = 90°"]));
    accepted(await run(tri(30, 60, 90), ["$m\\angle A + m\\angle B + m\\angle C = 180^\\circ$", "$m\\angle C = 90^\\circ$"]));
  });
  test("an arithmetic slip is invalid at the slipped line", async () => {
    const a = await run(tri(30, 60, 90), ["A + B + C = 180°", "30° + 60° + C = 180°", "C = 80°"]); never(a); expect(a.classification).toBe("invalid"); expect(a.firstInvalidStep).toBe(2);
  });
  test("the triangle-sum theorem without a non-degenerate triangle is a missing assumption, never accepted", async () => {
    const a = await run(tri(30, 60, 90, []), ["A + B + C = 180°", "C = 90°"]); never(a); expect(a.classification).toBe("missing-assumption");
  });
  test("an unevaluated final expression does not answer the problem", async () => {
    never(await run(tri(15, 85, 80), ["∠A + ∠B = 100 degrees", "∠C = 180 degrees - 100 degrees"]));
  });
  test("a wrong cited reason is not accepted", async () => {
    never(await run(tri(30, 60, 90), ["A + B + C = 180° (vertical angles)", "C = 90°"]));
  });
  test("an unrelated quantity is never accepted", async () => { never(await run(tri(30, 60, 90), ["Z = 90°", "C = 90°"])); });
});

describe("E5 coordinate geometry", () => {
  test("a correct slope is accepted and a wrong one rejected", async () => {
    accepted(await run(slope("3/2"), ["m = (8 - 2)/(5 - 1)", "m = 6/4", "m = 3/2"]));
    const a = await run(slope("3/2"), ["m = (8 - 2)/(5 - 1)", "m = 6/4", "m = 2/3"]); never(a); expect(a.classification).toBe("invalid");
  });
  test("an unreduced final fraction does not answer the problem", async () => { never(await run(slope("3/2"), ["m = (8 - 2)/(5 - 1)", "m = 6/4"])); });
});

describe("E5 calculus", () => {
  test("a correct chain-rule derivative is accepted; a wrong coefficient is invalid", async () => {
    accepted(await run(chain, ["f(x) = (3x + 1)^5", "f'(x) = 15(3x + 1)^4"]));
    accepted(await run(chain, ["\\frac{d}{dx}(3x+1)^5 = 15(3x+1)^4"]));
    const a = await run(chain, ["f(x) = (3x + 1)^5", "f'(x) = 5(3x + 1)^4"]); never(a); expect(a.classification).toBe("invalid");
  });
  test("an indefinite integral requires +C", async () => {
    accepted(await run(indef, ["∫ (5x^4 + 1) dx = x^5 + x + C"]));
    never(await run(indef, ["∫ (5x^4 + 1) dx = x^5 + x"]));
    never(await run(indef, ["∫ (5x^4 + 1) dx = x^5 + 2x + C"]));
  });
  test("a removable-discontinuity limit is accepted and a wrong value rejected", async () => {
    const lim = { domain: "calculus", task: "limit", expression: { kind: "multiply", factors: [{ kind: "add", terms: [pw(X, 2), K("-25")] }, pw({ kind: "add", terms: [X, K("-5")] }, -1)] }, variable: "x", point: "5" };
    const good = await run(lim, ["(x^2 - 25)/(x - 5) = (x - 5)(x + 5)/(x - 5)", "(x - 5)(x + 5)/(x - 5) = x + 5", "lim_(x→5) (x + 5) = 10"]);
    if (good.classification === "verified") accepted(good);
    const bad = await run(lim, ["(x^2 - 25)/(x - 5) = (x - 5)(x + 5)/(x - 5)", "(x - 5)(x + 5)/(x - 5) = x + 5", "lim_(x→5) (x + 5) = 5"]); never(bad);
  });
  test("a prose-only method line is never certified", async () => { never(await run(chain, ["use the chain rule"])); });
});

describe("E5 exact arithmetic and resource bounds", () => {
  test("rational limits are exact", () => {
    const f = rfOf({ kind: "multiply", factors: [{ kind: "add", terms: [pw(X, 2), K("-25")] }, pw({ kind: "add", terms: [X, K("-5")] }, -1)] } as never, "x")!;
    const r = limitRF(f, q(5), "both") as { kind: string; value?: { n: bigint; d: bigint } }; expect(r.kind).toBe("finite"); expect(String(r.value?.n)).toBe("10");
  });
  test("an enormous exponent is bounded rather than computed", async () => {
    const big = { domain: "calculus", task: "derivative", expression: pw(X, 100000), variable: "x" };
    const a = await run(big, ["f'(x) = 100000x^99999"]); expect(["verified", "unsupported", "incomplete", "malformed", "inconclusive", "resource-exhausted"]).toContain(a.classification);
    expect(Overflow).toBeDefined();
  });
});

describe("E5 corpus soundness", () => {
  test("no development case is falsely accepted", async () => {
    const cases = JSON.parse(readFileSync(E5 + "dev-cases.v1.json", "utf8")).cases;
    let falseAccepts = 0;
    for (const c of cases) { const a = await assessMathematicalWorking(c.problem, c.studentWorking); if (a.classification === "verified" && c.reference.classification !== "verified") falseAccepts++; if (a.classification === "verified") expect(a.acceptanceGate?.independentlyVerified).toBe(true); }
    expect(falseAccepts).toBe(0);
  });
});
