// E7 post-audit safety invariants (research/e7-safety/DIAGNOSIS.md). Per invariant: a minimal case, a valid/invalid contrast pair,
// an equivalent-notation variant and a composition case.
import { describe, expect, test } from "bun:test";
import { assessMathematicalWorking } from "./unified-math-engine.ts";
import { assessAnswerFirst } from "./answer-first.ts";
import { parseNaturalWorking } from "./natural-working.ts";
import { withCandidateEliminationPolicy, checkAlgebraSubmission } from "./independent-checker.ts";
import type { Expr } from "./calculus-core.ts";

const v = (n: string): Expr => ({ kind: "variable", name: n }), c = (s: string): Expr => ({ kind: "constant", value: s });
const add = (...terms: Expr[]): Expr => ({ kind: "add", terms }), mul = (...factors: Expr[]): Expr => ({ kind: "multiply", factors }), pw = (base: Expr, exponent: number): Expr => ({ kind: "power", base, exponent });
const fn = (kind: "sin" | "cos" | "log" | "abs" | "exp", argument: Expr): Expr => ({ kind, argument } as Expr), neg = (a: Expr) => mul(c("-1"), a);
const x = v("x"), y = v("y");
const parse = (t: string) => parseNaturalWorking({ format: "natural", text: t });
const sym = async (start: Expr, next: Expr, assumptions?: { kind: string; expression: Expr }[]) => (await assessMathematicalWorking({ domain: "symbolic", start, ...(assumptions ? { assumptions } : {}) } as never, [{ id: "s0", expression: next }] as never, {})).classification;
const alg = async (statement: string, text: string) => (await assessMathematicalWorking({ domain: "algebra", statement } as never, { format: "natural", text } as never, {})).classification;
const integral = async (integrand: Expr, text: string) => (await assessMathematicalWorking({ domain: "calculus", task: "indefinite-integral", integrand, variable: "x" } as never, { format: "natural", text } as never, {})).classification;
const af = (statement: string, text: string) => { const a: any = assessAnswerFirst({ domain: "algebra", statement } as never, { format: "natural", text } as never, { diagnose: "always" } as never); return { status: a.answer?.status as string, transitions: (a.diagnosis?.transitions ?? []).map((t: any) => t.status) as string[] }; };
const P = (e: Expr) => ({ kind: "positive", expression: e }), NZ = (e: Expr) => ({ kind: "nonzero", expression: e });

describe("I1 no silent repair of invalid syntax; unknown notation gets no invented meaning", () => {
  test("minimal: an unclosed function call is malformed, not closed at end of input", () => {
    expect(parse("sqrt(x+1 = 2").classification).toBe("malformed");
  });
  test("contrast: the closed call parses; the unclosed one is never accepted on any route", async () => {
    expect(parse("sqrt(x+1) = 2").classification).toBe("parsed");
    expect(await alg("sqrt(x+1)=2", "sqrt(x+1 = 2\nx+1=4\nx=3")).toBe("malformed");
    expect(await alg("sqrt(x+1)=2", "sqrt(x+1) = 2\nx+1=4\nx=3")).toBe("verified");
    expect(af("sqrt(x+1)=2", "sqrt(x+1 = 2").status).not.toBe("correct");
  });
  test("notation variants: sin(x and ln(x+1 = 0 are malformed; a stray closing bracket is not swallowed", () => {
    expect(parse("sin(x = 1").classification).toBe("malformed");
    expect(parse("ln(x+1 = 0").classification).toBe("malformed");
    expect(parse("sin x) = 1").classification).not.toBe("parsed");
  });
  test("unknown function names are unsupported, not variables; atan/arctan keep their meaning", () => {
    for (const t of ["csc(x)^2", "arcsin(x) + 1", "2sinh(2x)", "foo(x) + 1", "arcsin(x/3)", "2cot(x)"]) expect([t, parse(t).classification]).toEqual([t, "unsupported"]);
    for (const t of ["atan(x) + 1", "arctan(x) + 1"]) { const r = parse(t); expect(r.classification).toBe("parsed"); expect(JSON.stringify(r.lines[0].relation)).toContain('"kind":"atan"'); }
    expect(parse("csc + x").classification).toBe("unsupported");
  });
  test("ambiguous: sin x^2 is refused with both readings; sin(x)^2 and sin(x^2) are read as written", () => {
    const r = parse("sin x^2"); expect(r.classification).toBe("ambiguous"); expect((r as any).alternatives).toHaveLength(2);
    expect((parse("sin(x)^2").lines[0].relation as any).expression.kind).toBe("power");
    expect((parse("sin(x^2)").lines[0].relation as any).expression.kind).toBe("sin");
    expect(parse("sin x + 1").classification).toBe("parsed");
  });
  test("composition: a derivative answer written with sec is never called invalid", async () => {
    const r = await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: { kind: "tan", argument: mul(c("3"), x) }, variable: "x" } as never, { format: "natural", text: "3sec(3x)^2" } as never, {});
    expect(r.classification).not.toBe("invalid");
  });
});

describe("I2 a failed proof is not a disproof", () => {
  test("minimal: cos(-x) -> cos x is not called invalid", async () => {
    expect(await sym(fn("cos", neg(x)), fn("cos", x))).not.toBe("invalid");
  });
  test("contrast: a genuine algebraic non-identity is still refuted; a trig one with related arguments abstains", async () => {
    expect(await sym(pw(add(x, c("1")), 2), add(pw(x, 2), c("1")))).toBe("invalid");
    expect(await sym(fn("sin", neg(x)), fn("sin", x))).toBe("unsupported");
    expect(await sym(fn("sin", x), fn("cos", x))).toBe("invalid"); // independent generators: a sound refutation
  });
  test("notation variants: double angle, special value and π arguments are never refuted by normal-form mismatch", async () => {
    expect(await sym(pw(fn("cos", x), 2), mul(add(c("1"), fn("cos", mul(c("2"), x))), c("1/2")))).not.toBe("invalid");
    expect(await sym(fn("cos", mul(c("2/3"), { kind: "pi" })), c("-1/2"))).not.toBe("invalid");
    expect(await sym(add(fn("cos", x), fn("cos", y)), mul(c("2"), fn("cos", mul(c("1/2"), add(x, y))), fn("cos", mul(c("1/2"), add(x, neg(y))))))).not.toBe("invalid");
  });
  test("composition: a derived contradiction (5 = 6 from an equation with no solutions) is a valid step", async () => {
    expect(await alg("2x+5=2(x+3)", "2x+5=2x+6\n5=6\nno solution")).toBe("verified");
    expect(await alg("2x+5=2(x+3)", "2x+5=2x+6\n5=6")).not.toBe("invalid");
    expect(await alg("2x+5=2(x+4)", "2x+5=2x+8\n5=8")).not.toBe("verified");
    expect(await alg("2x+5=3", "2x+5=3\n5=3")).toBe("invalid"); // a false line from an equation that HAS a solution is still an error
    expect(af("2x+5=2(x+3)", "2x+5=2x+6\n5=6\nno solution").transitions).not.toContain("closed-false");
  });
});

describe("I3 domain equivalence is semantic", () => {
  test("minimal: a numeric reciprocal adds no restriction", async () => {
    expect(await sym(mul(c("6"), x, pw(c("6"), -1)), x)).toBe("verified");
  });
  test("contrast: identical domains verify; a genuinely widened domain still needs its restriction", async () => {
    expect(await sym(mul(pw(x, 2), pw(pw(x, 3), -1)), pw(x, -1))).toBe("verified");
    expect(await sym(mul(pw(x, 2), pw(x, -1)), x)).toBe("missing-assumption");
    expect(await sym(mul(add(pw(x, 2), c("-1")), pw(add(x, c("-1")), -1)), add(x, c("1")))).toBe("missing-assumption");
  });
  test("notation variants: x^-2 vs (x^2)^-1 vs 1/(x·x); factored vs expanded denominators", async () => {
    expect(await sym(pw(x, -2), pw(pw(x, 2), -1))).toBe("verified");
    expect(await sym(pw(x, -2), pw(mul(x, x), -1))).toBe("verified");
    expect(await sym(pw(add(pw(x, 2), c("-1")), -1), pw(mul(add(x, c("-1")), add(x, c("1"))), -1))).toBe("verified");
  });
  test("composition: a two-variable product identity with a constant reciprocal", async () => {
    expect(await sym(mul(x, y), mul(add(pw(add(x, y), 2), neg(pw(add(x, neg(y)), 2))), pw(c("4"), -1)))).toBe("verified");
  });
});

describe("I4 assumptions and restrictions are propagated", () => {
  test("minimal: x > 0 licenses ln(x^2) = 2 ln x", async () => {
    expect(await sym(fn("log", pw(x, 2)), mul(c("2"), fn("log", x)), [P(x)])).toBe("verified");
  });
  test("contrast: without the assumption the same step still needs it", async () => {
    expect(await sym(fn("log", pw(x, 2)), mul(c("2"), fn("log", x)))).toBe("missing-assumption");
    expect(await sym(fn("abs", x), x)).toBe("missing-assumption");
  });
  test("notation variants: positivity of a product, power and nonzero base", async () => {
    expect(await sym(fn("abs", mul(x, y)), mul(x, y), [P(x), P(y)])).toBe("verified");
    expect(await sym(fn("abs", pw(x, 3)), pw(x, 3), [P(x)])).toBe("verified");
    expect(await sym(mul(pw(x, 2), pw(pw(x, 2), -1)), c("1"), [NZ(x)])).toBe("verified");
  });
  test("composition: a > 0 and b > 0 give |a + b| = a + b; one assumption alone does not", async () => {
    expect(await sym(fn("abs", add(x, y)), add(x, y), [P(x), P(y)])).toBe("verified");
    expect(await sym(fn("abs", add(x, y)), add(x, y), [P(x)])).not.toBe("verified");
  });
  test("composition: a linear order assumption (x > 1) licenses the log laws that need x > 0 and x - 1 > 0; x > -1 does not", async () => {
    const lnProd = fn("log", mul(x, add(x, c("-1")))), split = add(fn("log", x), fn("log", add(x, c("-1"))));
    expect(await sym(lnProd, split, [P(add(x, c("-1")))])).toBe("verified");
    expect(await sym(lnProd, split, [P(add(x, c("1")))])).not.toBe("verified");
    expect(await sym(fn("abs", add(mul(c("2"), x), c("-1"))), add(mul(c("2"), x), c("-1")), [P(add(x, c("-1")))])).toBe("verified");
  });
  test("an antiderivative must be defined on the integrand's domain (natural E5 route)", async () => {
    const g = mul(c("2"), x, pw(add(pw(x, 2), c("-1")), -1));
    expect(await integral(g, "∫2x/(x^2-1) dx = ln(x^2-1) + C")).not.toBe("verified");
    expect(await integral(g, "∫2x/(x^2-1) dx = ln|x^2-1| + C")).toBe("verified");
    expect(await integral(pw(x, -1), "∫1/x dx = ln(x) + C")).not.toBe("verified");
    expect(await integral(pw(x, -1), "∫1/x dx = ln|x| + C")).toBe("verified");
    expect(await integral(mul(c("2"), x, pw(add(pw(x, 2), c("1")), -1)), "∫2x/(x^2+1) dx = ln(x^2+1) + C")).toBe("verified");
  });
});

describe("I5 restrictions are premises, not solution statements", () => {
  test("minimal: a restriction line before the solution", async () => {
    expect(await alg("x/(x-2)=3/(x-2)", "x != 2\nx=3")).toBe("verified");
  });
  test("contrast: a restriction the problem does not impose is still a claim (and wrong here)", async () => {
    expect(await alg("x^2=9", "x != 3\nx=-3")).not.toBe("verified");
    expect(await alg("x/(x-2)=3/(x-2)", "x != 2\nx=2")).toBe("invalid");
  });
  test("notation variants: restriction after the answer; restriction that is itself the whole solution set", async () => {
    expect(await alg("x/(x-2)=3/(x-2)", "x=3\nx != 2")).toBe("verified");
    expect(await alg("(x^2 - 9)/(x - 3) = x + 3", "x != 3")).toBe("verified");
    const a = af("x/(x-2)=3/(x-2)", "x != 2\nx=3"); expect(a.status).toBe("correct"); expect(a.transitions).toEqual(["restriction", "equivalent"]);
  });
  test("composition: stated conditions carry through every transition", async () => {
    const a = af("(x^2-1)/(x-1)=2 for x != 1", "x+1=2\nx=1"); expect(a.status).toBe("incorrect"); expect(a.transitions).toEqual(["equivalent", "equivalent"]);
    const b = af("x^2=4 for x > 0", "x^2=4\nx=2"); expect(b.status).toBe("correct"); expect(b.transitions).not.toContain("invalid");
    expect(await alg("x^2=4 for x > 0", "x=2")).toBe("verified");
  });
});

describe("I6 lost solutions: an explicitly claimed equivalence that loses solutions is invalid; an incomplete answer is incomplete", () => {
  test("minimal: x^2 = 9 ⇔ x = 3 is invalid; x = 3 alone is incomplete", async () => {
    expect(await alg("x^2 = 9", "x^2 = 9 ⇔ x = 3")).toBe("invalid");
    expect(await alg("x^2 = 9", "x^2 = 9\nx = 3")).toBe("incomplete");
    expect(af("x^2=9", "x=3").status).toBe("incomplete");
  });
  test("contrast: a correct equivalence chain verifies", async () => {
    expect(await alg("x^2 = 9", "x^2 = 9 ⇔ x = 3 or x = -3")).toBe("verified");
    expect(await alg("x^2-5x+6=0", "(x-2)(x-3)=0 ⇔ x = 2 or x = 3")).toBe("verified");
  });
  test("notation variants: <=>, iff and a row that opens with ⇔", async () => {
    expect(await alg("x^2 = 9", "x^2 = 9 <=> x = 3")).toBe("invalid");
    expect(await alg("x^2 = 9", "x^2 = 9\n⇔ x = 3")).toBe("invalid");
    expect(await alg("x^2 = 9", "x^2 = 9 iff x = 3 or x = -3")).toBe("verified");
  });
  test("composition: inequalities, extraneous roots and excluded values under an explicit equivalence claim", async () => {
    expect(await alg("x^2>4", "x^2>4 ⇔ x>2")).toBe("invalid");
    expect(await alg("x^2>4", "x>2")).toBe("incomplete");
    expect(await alg("x^2>4", "x^2>4 ⇔ x<-2 or x>2")).not.toBe("invalid");
    expect(await alg("sqrt(x+2)=x", "sqrt(x+2)=x ⇔ x+2=x^2")).toBe("invalid"); // squaring gains x = -1: not an equivalence
    expect(await alg("x/(x-2)=2/(x-2)", "x/(x-2)=2/(x-2) ⇔ x=2")).toBe("invalid"); // clearing denominators gains the excluded value
    expect(await alg("x^3=4x", "x^3=4x ⇔ x^2=4")).toBe("invalid");
    expect(await alg("x^3=4x", "x^2=4\nx=2 or x=-2")).toBe("incomplete");
    expect(af("x^3=4x", "x^3=4x ⇔ x^2=4\nx=2 or x=-2").transitions).toContain("invalid");
  });
});

describe("I7 candidates and restrictions: the existing candidate policy is unchanged and applies on both settings", () => {
  test("implicit (default) credits the exact elimination; shown requires the check", () => {
    const p = parse("x^2/(x-3)=9/(x-3)\nx^2=9\nx=-3");
    expect(checkAlgebraSubmission("x^2/(x-3)=9/(x-3)", p).outcome).toBe("verified");
    expect(withCandidateEliminationPolicy("shown", () => checkAlgebraSubmission("x^2/(x-3)=9/(x-3)", p).outcome)).toBe("incomplete");
  });
});
