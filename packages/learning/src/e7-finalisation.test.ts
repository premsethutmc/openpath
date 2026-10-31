// E7 finalisation: lost-solution distinction, assessment-specific grading policy, log-base resolution, sec/cbrt notation and stated limit values.
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { assessAnswerFirst } from "./answer-first.ts";
import { parseNaturalWorking } from "./natural-working.ts";
import { assessWithPolicy, gradeEnvelope, type GradingRubric } from "./assessment-policy.ts";
import type { Expr } from "./calculus-core.ts";

const v = (n: string): Expr => ({ kind: "variable", name: n }), c = (s: string): Expr => ({ kind: "constant", value: s }), x = v("x");
const mul = (...factors: Expr[]): Expr => ({ kind: "multiply", factors }), add = (...terms: Expr[]): Expr => ({ kind: "add", terms }), pw = (base: Expr, exponent: number): Expr => ({ kind: "power", base, exponent });
const nat = (text: string) => ({ format: "natural" as const, text });
const alg = async (statement: string, text: string, conventions?: object) => (await assessMathematicalWorking({ domain: "algebra", statement } as never, nat(text), conventions ? { conventions } : {})).classification;
const af = (statement: string, text: string, conventions?: object) => { const a: any = assessAnswerFirst({ domain: "algebra", statement }, nat(text), { diagnose: "always", ...(conventions ? { conventions } : {}) }); return { status: a.answer.status as string, transitions: (a.diagnosis?.transitions ?? []).map((t: any) => t.status) as string[] }; };
const parse = (t: string, conventions?: object) => parseNaturalWorking({ format: "natural", text: t, ...(conventions ? { conventions } : {}) } as never);
const sym = async (start: Expr, text: string, conventions?: object) => (await assessMathematicalWorking({ domain: "symbolic", start } as never, nat(text), conventions ? { conventions } : {})).classification;
const credit = async (statement: string, text: string, rubric: GradingRubric) => (await assessWithPolicy({ domain: "algebra", statement }, nat(text), rubric)).grade.credit;
const limit = async (expression: Expr, approach: string, side: "both" | "left" | "right", text: string) => (await assessMathematicalWorking({ domain: "calculus", task: "limit", expression, variable: "x", approach, side } as never, nat(text), {})).classification;

describe("lost solutions: claimed equivalence vs incomplete answer", () => {
  test("answer-first: the incomplete answer is incomplete; the claimed equivalence is an invalid transition", () => {
    expect(af("x^2 = 9", "x = 3").status).toBe("incomplete");
    const a = af("x^2 = 9", "x^2 = 9 ⇔ x = 3"); expect(a.status).toBe("incomplete"); expect(a.transitions).toContain("invalid");
    expect(af("x^2 = 9", "x^2 = 9 ⇔ x = 3 or x = -3").transitions).not.toContain("invalid");
  });
  test("unified: equations, inequalities, extraneous roots and excluded values", async () => {
    expect(await alg("x^2 - 4x = 0", "x(x - 4) = 0 ⇔ x = 4")).toBe("invalid");
    expect(await alg("x^2 - 4x = 0", "x(x - 4) = 0\nx = 4")).toBe("incomplete");
    expect(await alg("x^2 <= 9", "x^2 <= 9 ⇔ -3 <= x <= 3")).not.toBe("invalid");
    expect(await alg("x^2 >= 1", "x >= 1")).toBe("incomplete");
    expect(await alg("x^2 >= 1", "x^2 >= 1 ⇔ x >= 1")).toBe("invalid");
    expect(await alg("sqrt(x+2) = x", "x + 2 = x^2\nx = 2 or x = -1")).toBe("invalid"); // the extraneous root kept is a wrong answer, not incomplete
    expect(await alg("x/(x-1) = 1/(x-1)", "x = 1")).toBe("invalid"); // the excluded value stated as a solution
  });
});

describe("assessment-specific grading policy", () => {
  const sq = "x+2 = x^2\nx^2 - x - 2 = 0\n(x-2)(x+1) = 0\nx = 2";
  test("answer-only: a correct complete answer gets full credit without working or shown checks", async () => {
    expect(await credit("sqrt(x+2) = x", "x = 2", { mode: "answer-only" })).toBe("full");
    expect(await credit("x^2 = 9", "x = 3", { mode: "answer-only" })).toBe("partial");
    expect(await credit("x^2 = 9", "x = 4", { mode: "answer-only" })).toBe("none");
  });
  test("method-required: valid steps earn full credit unless the rubric requires the omitted evidence; omissions never make work invalid", async () => {
    expect(await credit("sqrt(x+2) = x", sq, { mode: "method-required" })).toBe("unresolved"); // P2-INTEGRATION: was "full" under E7 (shadow); the derivation is outside the P2 surface, so it is unresolved (never costs credit, never earns method credit)
    expect(await credit("sqrt(x+2) = x", sq, { mode: "method-required", requireShownCandidateChecks: true })).toBe("unresolved"); // P2-INTEGRATION: was "partial" under E7 (shadow); outside the P2 surface, so unresolved
    expect(await credit("x/(x-2) = 3/(x-2)", "x = 3", { mode: "method-required" })).toBe("full"); // P2 generalization @3: multiplying both sides by the task's own denominator (nonzero in the natural domain) is certified, so E7's original "full" is reached again
    expect(await credit("x/(x-2) = 3/(x-2)", "x = 3", { mode: "method-required", requireStatedRestrictions: true })).toBe("partial"); // P2 generalization @3: inside the surface again; E7's original "partial" (restriction not stated)
    expect(await credit("x/(x-2) = 3/(x-2)", "x != 2\nx = 3", { mode: "method-required", requireStatedRestrictions: true })).toBe("unresolved"); // P2-INTEGRATION: was "full" under E7 (shadow); outside the P2 surface, so unresolved
    expect(await credit("x^2 = 9", "x^2 = 9 ⇔ x = 3", { mode: "method-required" })).toBe("none");
  });
  test("proof-required: the engine proving the result is not the student demonstrating it", async () => {
    expect(await credit("x^2 = 9", "x = 3 or x = -3", { mode: "proof-required" })).toBe("partial");
    expect(await credit("x^2 = 9", "x^2 - 9 = 0\n(x-3)(x+3) = 0\nx = 3 or x = -3", { mode: "proof-required" })).toBe("full"); // P2 generalization @3: balance by the whole side, factorisation and zero-product reading are certified (E7's original "full") // P2-INTEGRATION: was "full" under E7 (shadow); the derivation is outside the P2 surface, so it is unresolved (never costs credit, never earns method credit)
    expect(await credit("sqrt(x+2) = x", sq, { mode: "proof-required" })).toBe("unresolved"); // P2-INTEGRATION: was "partial" under E7 (shadow); outside the P2 surface, so unresolved
  });
  test("domain validity is always enforced; a wrong cited rule is a separate finding the rubric decides", async () => {
    expect(await credit("x/(x-1) = 1/(x-1)", "x = 1", { mode: "answer-only" })).toBe("none");
    const f = { kind: "multiply", factors: [c("3"), pw(x, 4)] }, d = mul(c("12"), pw(x, 3));
    const env = await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: f, variable: "x" } as never, [{ id: "s0", rule: "chain rule", claim: { kind: "expression", value: d } }] as never);
    expect(env.classification).toBe("verified");
    expect(gradeEnvelope(env, { mode: "method-required" }).credit).toBe("full");
    expect(gradeEnvelope(env, { mode: "method-required", deductForWrongCitation: true }).credit).toBe("partial");
    expect(gradeEnvelope(env, { mode: "method-required", deductForWrongCitation: true }).mathematicalValidity).toBe("valid");
  });
  test("simplification with an unstated restriction: a finding, not an invalid result", async () => {
    const r = await assessWithPolicy({ domain: "algebra", statement: "Simplify (x^2-4)/(x^2-2x)" }, nat("(x+2)/x"), { mode: "method-required", requireStatedRestrictions: true });
    expect(r.envelope?.classification).toBe("unsupported"); expect(r.grade.deductions).toEqual([]); expect(r.grade.credit).toBe("unresolved"); // P2-INTEGRATION: E7 (shadow) found the finding "restriction-not-stated" and gave partial credit; P2 cannot authorize the unconditioned cancellation, so the work is unresolved (no deduction, no credit decision)
    expect((await assessWithPolicy({ domain: "algebra", statement: "Simplify (x^2-4)/(x^2-2x)" }, nat("(x+2)/x"), { mode: "method-required" })).grade.credit).toBe("unresolved"); // P2-INTEGRATION: was "full"
  });
});

describe("bare log: explicit base, question convention, assessment convention, or ambiguous", () => {
  test("parser: ln is natural; explicit bases; bare log needs a convention", () => {
    expect(JSON.stringify(parse("ln(x)").lines[0].relation)).toBe('{"kind":"expression","expression":{"kind":"log","argument":{"kind":"variable","name":"x"}}}');
    for (const t of ["log_10(x)", "log_{10}(x)", "log10(x)", "log_2(8)"]) expect(parse(t).classification).toBe("parsed");
    expect(parse("log(x)").classification).toBe("ambiguous");
    expect(JSON.stringify(parse("log(x)", { log: "base10" }).lines[0].relation)).toContain('"value":"10"');
    expect(JSON.stringify(parse("log(x)", { log: "natural" }).lines[0].relation)).not.toContain('"value":"10"');
    expect(parse("log_1(x)").classification).toBe("malformed");
  });
  test("engine: a base-dependent verdict without a convention is ambiguous; a base-independent one stands", async () => {
    const lnx2 = { kind: "log", argument: pw(x, 2) } as Expr;
    expect(await sym(lnx2, "2log(x)")).toBe("ambiguous"); // the problem is in ln; the student's base is unknown
    expect(await sym(lnx2, "2log(x)", { log: "natural" })).toBe("missing-assumption");
    expect(await sym(lnx2, "2ln(x)")).toBe("missing-assumption");
    expect(await sym(lnx2, "2log_10(x)")).not.toBe("verified");
  });
  test("question convention takes precedence over the assessment convention", async () => {
    const lnx2 = { kind: "log", argument: pw(x, 2) } as Expr;
    const r = await assessMathematicalWorking({ domain: "symbolic", start: lnx2, conventions: { log: "natural" } } as never, nat("2log(x)"), { conventions: { log: "base10" } });
    expect(r.classification).toBe("missing-assumption");
  });
});

describe("sec and cbrt notation", () => {
  test("positive: sec is the reciprocal cosine, cbrt the real cube root", async () => {
    expect(JSON.stringify(parse("sec(x)").lines[0].relation)).toBe(JSON.stringify({ kind: "expression", expression: pw({ kind: "cos", argument: x } as Expr, -1) }));
    expect((parse("cbrt(x)").lines[0].relation as any).expression).toEqual({ kind: "root", radicand: x, index: 3 });
    expect(await sym(pw({ kind: "cos", argument: x } as Expr, -2), "sec(x)^2")).toBe("verified");
    expect(await alg("cbrt(-8) + 2", "0")).not.toBe("invalid");
    expect((await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: pw({ kind: "cos", argument: x } as Expr, -1), variable: "x" } as never, nat("f'(x) = sec(x)tan(x)"), {})).classification).toBe("verified");
  });
  test("negative: wrong values and wrong derivatives are not accepted; negative radicands keep the real cube root", async () => {
    expect(await alg("cbrt(-8) + 2", "4")).toBe("invalid");
    expect((await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: pw({ kind: "cos", argument: x } as Expr, -1), variable: "x" } as never, nat("f'(x) = sec(x)^2"), {})).classification).not.toBe("verified");
    expect(await alg("cbrt(-27)", "-3")).not.toBe("invalid");
    expect(await alg("cbrt(-27)", "3")).toBe("invalid");
  });
  test("domain: sec has poles where cos x = 0", async () => {
    const r = await assessMathematicalWorking({ domain: "symbolic", start: mul({ kind: "sin", argument: x } as Expr, pw({ kind: "cos", argument: x } as Expr, -1)) } as never, nat("tan(x)"), {});
    expect(r.classification).not.toBe("invalid");
    expect(await sym(c("1"), "sec(x)*cos(x)")).not.toBe("verified"); // 1 is defined where sec is not
  });
  test("malformed and unknown names", () => {
    expect(parse("sec(x").classification).toBe("malformed");
    expect(parse("cbrt(x + 1").classification).toBe("malformed");
    for (const t of ["csc(x)", "2sech(x)", "blah(x) + 1"]) expect([t, parse(t).classification]).toEqual([t, "unsupported"]);
  });
});

describe("stated limit values", () => {
  const sinxx = mul({ kind: "sin", argument: x } as Expr, pw(x, -1)), inv = pw(x, -1), q = mul(add(pw(x, 2), c("-4")), pw(add(x, c("-2")), -1));
  test("correct: lim notation, arrow notation, one-sided infinite limits", async () => {
    expect(await limit(sinxx, "0", "both", "lim(x→0) sin(x)/x = 1")).toBe("verified");
    expect(await limit(q, "2", "both", "(x^2-4)/(x-2) = x+2 → 4")).toBe("verified");
    expect(await limit(inv, "0", "right", "lim(x→0+) 1/x = ∞")).toBe("verified");
    expect(await limit(inv, "0", "left", "lim(x→0-) 1/x = -∞")).toBe("verified");
    expect(await limit(inv, "0", "right", "1/x → ∞ as x → 0+")).toBe("verified");
  });
  test("incorrect: wrong value, wrong sign of infinity, wrong side", async () => {
    expect(await limit(sinxx, "0", "both", "lim(x→0) sin(x)/x = 0")).toBe("invalid");
    expect(await limit(q, "2", "both", "(x^2-4)/(x-2) = x+2 → 2")).toBe("invalid");
    expect(await limit(inv, "0", "right", "lim(x→0+) 1/x = -∞")).toBe("invalid");
    expect(await limit(inv, "0", "left", "1/x → ∞ as x → 0-")).toBe("invalid");
  });
  test("undefined: a two-sided limit that does not exist", async () => {
    expect(await limit(inv, "0", "both", "lim(x→0) 1/x does not exist")).toBe("verified");
    expect(await limit(inv, "0", "both", "lim(x→0) 1/x = ∞")).toBe("invalid");
  });
  test("outside the exact machinery: unsupported, never a guess", async () => {
    const e = { kind: "exp", argument: pw(x, -1) } as Expr;
    expect(await limit(e, "0", "right", "lim(x→0+) e^(1/x) = ∞")).not.toBe("invalid");
    expect(["unsupported", "malformed"]).toContain(await limit(inv, "0", "right", "1/y → ∞ as y → 0+")); // a different variable is not read as the posed limit
  });
});

describe("review corrections: assessment-local conventions and original source spans", () => {
  const lnx2 = { kind: "log", argument: { kind: "power", base: { kind: "variable", name: "x" }, exponent: 2 } } as Expr;
  test("concurrent, interleaved assessments with different log conventions do not affect each other", async () => {
    const one = (log?: "natural" | "base10") => assessMathematicalWorking({ domain: "symbolic", start: lnx2 } as never, nat("2log(x)"), log ? { conventions: { log } } : {}).then((r) => r.classification);
    const solo = { natural: await one("natural"), base10: await one("base10"), none: await one() };
    expect(solo.natural).toBe("missing-assumption"); expect(solo.base10).not.toBe(solo.natural); expect(solo.none).toBe("ambiguous");
    const order = Array.from({ length: 36 }, (_, i) => (["natural", "base10", undefined] as const)[i % 3]);
    const got = await Promise.all(order.map((log) => one(log)));
    order.forEach((log, i) => expect([i, got[i]]).toEqual([i, solo[log ?? "none"]]));
    // answer-first and the policy layer interleaved with them
    const mixed = await Promise.all(order.map(async (log, i) => i % 2 ? one(log) : (await assessWithPolicy({ domain: "algebra", statement: "x^2 = 9" }, nat("x = 3 or x = -3"), { mode: "answer-only", ...(log ? { conventions: { log } } : {}) })).grade.credit));
    order.forEach((log, i) => expect(mixed[i]).toBe(i % 2 ? solo[log ?? "none"] : "full"));
  });
  test("the parser keeps no convention between calls; the convention never leaks into a later parse", () => {
    expect(parse("log(x)", { log: "base10" }).classification).toBe("parsed");
    expect(parse("log(x)").classification).toBe("ambiguous");
    const r = parse("x = 1\nlog(100) = 2", { log: "base10" }); expect(r.lines[1].source).toEqual({ line: 2, start: 0, end: 12, text: "log(100) = 2" }); // the student's spelling is kept
  });
  test("inline equivalences keep the student's line number and columns", async () => {
    const row = "x^2 = 9 <=> x = 3 or x = -3", r = parse(row);
    expect(r.lines.map((l) => l.source.line)).toEqual([1, 1]);
    for (const l of r.lines) expect(row.slice(l.source.start, l.source.end)).toBe(l.source.text);
    expect(r.lines[1].connective).toBe("equivalent"); expect(r.lines[1].source.start).toBe(row.indexOf("x = 3"));
    const env = await assessMathematicalWorking({ domain: "algebra", statement: "x^2 = 9" } as never, nat(row), {});
    expect(env.classification).toBe("verified"); expect(env.steps.map((s) => s.source?.line)).toEqual([1, 1]);
    const bad = await assessMathematicalWorking({ domain: "algebra", statement: "x^2 = 9" } as never, nat("x^2 = 9\nx^2 = 9 ⇔ x = 3"), {});
    expect(bad.classification).toBe("invalid"); expect(bad.steps[bad.firstInvalidStep!].source).toMatchObject({ line: 2, start: 10 });
    const a: any = assessAnswerFirst({ domain: "algebra", statement: "x^2 = 9" }, nat("x^2 = 9 ⇔ x = 3"), { diagnose: "always" });
    expect(a.diagnosis.transitions.map((t: any) => [t.status, t.to])).toEqual([["equivalent", "x^2 = 9"], ["invalid", "x = 3"]]);
  });
});
