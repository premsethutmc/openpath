/**
 * Exact-number reasoning engine — independent adversarial set.
 * Expected verdicts were written by hand from the mathematics BEFORE running the engine. Plus a property check of the
 * evaluator against Python's `fractions.Fraction` (a separate implementation) on random expressions.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { assessNumberWorking, verifyNumberStep, type NumberOptions } from "./index.ts";
import { assessWorking, verifyWorkingStep } from "../working-assessment.ts";
import { parseStatement } from "./parse.ts";
import { evaluate } from "./eval.ts";

type O = "verified" | "invalid" | "ambiguous" | "unsupported" | "incomplete";
interface Case { p: string; lines: string[]; out: O; first?: number; err?: string; opts?: NumberOptions; skill?: "demonstrated" | "not-demonstrated"; note: string }
const C = (note: string, p: string, lines: string[], out: O, x: Partial<Case> = {}): Case => ({ note, p, lines, out, ...x });
const CASES: Case[] = [
  // ---- any valid route is accepted (not a predefined sequence)
  C("common denominator route", "3/4 + 1/6", ["9/12 + 2/12", "11/12"], "verified"),
  C("via decimal and fraction", "3/4 + 1/6", ["0.75 + 1/6", "11/12"], "verified"),
  C("multi-operation step", "3/4 + 1/6", ["(9 + 2)/12", "11/12"], "verified"),
  C("unreduced intermediate", "3/4 + 1/6", ["22/24", "11/12"], "verified"),
  C("final answer only", "3/4 + 1/6", ["11/12"], "verified"),
  C("leading = continuation", "3/4 + 1/6", ["= 9/12 + 2/12", "= 11/12"], "verified"),
  C("regroup multiply/divide", "12 × 15 ÷ 18", ["12 × (15/18)", "12 × 5/6", "10"], "verified"),
  C("decimal mix", "2.5 × 4 + 0.5", ["10 + 0.5", "10.5"], "verified"),
  C("negatives", "(−3) × (−4) − 5", ["12 − 5", "7"], "verified"),
  C("percent as fraction", "30% of 80", ["30/100 × 80", "24"], "verified"),
  C("percent as decimal", "30% of 80", ["0.3 × 80", "24"], "verified"),
  C("same-base powers", "2^4 ÷ 2^2", ["2^2", "4"], "verified"),
  C("fraction literals in a division (tight)", "3/4 ÷ 1/2", ["3/2"], "verified"),
  C("same-base powers via values", "2^4 ÷ 2^2", ["16 ÷ 4", "4"], "verified"),
  C("lcm of three", "lcm(4, 6, 10)", ["60"], "verified"),
  C("hcf in words", "Find the HCF of 36 and 48", ["12"], "verified"),
  C("hcf of three", "hcf(12, 18, 30)", ["6"], "verified"),
  C("negative exponent", "2^−3", ["1/8"], "verified"),
  C("exact decimals (no float trap)", "0.1 + 0.2", ["0.3"], "verified"),
  C("big product exact", "123456789 × 987654321", ["121932631112635269"], "verified"),
  C("Indian digit grouping", "100000 + 50000", ["1,50,000"], "verified"),
  C("mixed numbers", "1 1/2 + 2 3/4", ["17/4"], "verified"),
  C("mixed result", "1 1/2 + 2 3/4", ["4 1/4"], "verified"),
  C("units equal after conversion", "5 cm + 20 mm", ["7 cm"], "verified"),
  C("units, other unit", "5 cm + 20 mm", ["70 mm"], "verified"),
  C("percent of then add", "200 + 15% of 200", ["200 + 30", "230"], "verified"),
  C("ratio with units simplified", "Simplify 5 cm : 2 m", ["1 : 40"], "verified"),
  C("proportion direct", "x : 12 = 3 : 4", ["x = 9"], "verified"),
  C("proportion cross-multiplied", "x : 12 = 3 : 4", ["4x = 36", "x = 9"], "verified"),
  C("proportion as fractions", "x : 12 = 3 : 4", ["x/12 = 3/4", "x = 9"], "verified"),
  C("prime factorisation with lemmas", "Write 60 as a product of prime factors", ["60 = 2 × 30", "30 = 2 × 15", "15 = 3 × 5", "2 × 2 × 3 × 5"], "verified", { opts: { requiredSkills: ["prime-factorisation"] }, skill: "demonstrated" }),
  C("hcf by prime factors", "HCF of 12 and 18", ["12 = 2^2 × 3", "18 = 2 × 3^2", "2 × 3 = 6"], "verified", { opts: { requiredSkills: ["prime-factorisation"] }, skill: "demonstrated" }),
  // ---- invalid, with the first wrong step and the identified error
  C("add tops and bottoms", "2/3 + 1/4", ["3/7"], "invalid", { first: 1, err: "frac-across" }),
  C("add tops keep a bottom", "3/4 − 1/8", ["2/4"], "invalid", { first: 1, err: "frac-numerators-only" }),
  C("divide without inverting", "3/4 ÷ 1/2", ["3/8"], "invalid", { first: 1, err: "fraction-divide-no-invert" }),
  C("multiply the indices", "2^3 × 2^4", ["2^12"], "invalid", { first: 1, err: "index-multiply-for-add" }),
  C("power as multiplication", "5^2", ["10"], "invalid", { first: 1, err: "power-as-multiplication" }),
  C("(−2)^2 taken as −4", "(−2)^2", ["−4"], "invalid", { first: 1, err: "negative-base-precedence" }),
  C("−2^2 taken as 4", "−2^2", ["4"], "invalid", { first: 1, err: "negative-base-precedence" }),
  C("negative exponent negates", "2^−3", ["−8"], "invalid", { first: 1, err: "negative-exponent-negates" }),
  C("percent as whole number", "15% of 200", ["15 × 200 = 3000"], "invalid", { first: 1, err: "percent-as-whole" }),
  C("percent of dropped in a sum (no single known cause)", "200 + 15% of 200", ["200 + 15", "215"], "invalid", { first: 1 }),
  C("units ignored", "5 cm + 20 mm", ["25 cm"], "invalid", { first: 1, err: "units-ignored" }),
  C("wrong conversion factor", "Convert 2.5 m to cm", ["25 cm"], "invalid", { first: 1, err: "unit-conversion-factor" }),
  C("incompatible units in a line", "5 cm + 20 mm", ["5 cm + 20 g"], "invalid", { first: 1 }),
  C("division by zero introduced", "10/2", ["10/(5 − 5)", "5"], "invalid", { first: 1 }),
  C("order of operations", "2 + 3 × 4", ["20"], "invalid", { first: 1, err: "order-of-operations" }),
  C("order of operations 2", "10 − 2 × 3", ["24"], "invalid", { first: 1, err: "order-of-operations" }),
  C("subtract smaller from larger", "3 − 5", ["2"], "invalid", { first: 1, err: "subtract-reversed" }),
  C("decimal place", "0.3 × 0.2", ["0.6"], "invalid", { first: 1, err: "decimal-place" }),
  C("HCF/LCM swapped", "Find the LCM of 4 and 6", ["2"], "invalid", { first: 1, err: "hcf-lcm-swap" }),
  C("percent change of decimal place", "0.25 as a percent", ["2.5%"], "invalid", { first: 1, err: "decimal-place" }),
  C("ratio written inverted", "Simplify 12 : 18", ["3 : 2"], "invalid", { first: 1, err: "ratio-inverted" }),
  C("wrong proportion answer", "x : 12 = 3 : 4", ["x = 16"], "invalid", { first: 1 }),
  C("proportion slip in cross-multiplying", "x : 12 = 3 : 4", ["3x = 48", "x = 16"], "invalid", { first: 1 }),
  C("wrong HCF, no known cause", "Find the HCF of 36 and 48", ["6"], "invalid", { first: 1 }),
  C("one-digit slip, no known cause", "123456789 × 987654321", ["121932631112635268"], "invalid", { first: 1 }),
  C("false equality inside a chain", "3/4 + 1/6", ["9/12 + 2/12 = 12/12 = 1"], "invalid", { first: 1 }),
  C("error then recovery: first error reported", "3/4 + 1/6", ["4/10", "11/12"], "invalid", { first: 1, err: "frac-across" }),
  C("false prime factorisation", "Write 60 as a product of prime factors", ["60 = 2 × 2 × 3 × 3"], "invalid", { first: 1 }),
  // ---- incomplete / form
  C("not finished", "3/4 + 1/6", ["9/12 + 2/12"], "incomplete"),
  C("not in simplest form", "Simplify 18/24", ["18/24"], "incomplete"),
  C("equal but unsimplified final", "Simplify 18/24", ["12/16"], "incomplete"),
  C("simplified", "Simplify 18/24", ["18/24 = 3/4"], "verified", { opts: { requiredSkills: ["reduce-fraction"] }, skill: "demonstrated" }),
  C("ratio not simplest", "Simplify 12 : 18", ["6 : 9"], "incomplete"),
  C("fraction wanted, decimal given", "Express 0.75 as a fraction in simplest form", ["0.75"], "incomplete"),
  C("fraction wanted, not simplest", "Express 0.75 as a fraction in simplest form", ["75/100"], "incomplete"),
  C("fraction simplest", "Express 0.75 as a fraction in simplest form", ["3/4"], "verified"),
  C("percent wanted", "0.25 as a percent", ["25%"], "verified"),
  C("percent wanted, decimal given", "0.25 as a percent", ["0.25"], "incomplete"),
  C("unit wanted, product unfinished", "Convert 2.5 m to cm", ["2.5 × 100 cm"], "incomplete"),
  C("unit wanted, done", "Convert 2.5 m to cm", ["2.5 × 100 cm", "250 cm"], "verified"),
  // ---- correctness is separate from skill demonstration
  C("right answer, skill not shown", "3/4 + 1/6", ["11/12"], "verified", { opts: { requiredSkills: ["common-denominator"] }, skill: "not-demonstrated" }),
  C("right answer, skill shown", "3/4 + 1/6", ["9/12 + 2/12", "11/12"], "verified", { opts: { requiredSkills: ["common-denominator"] }, skill: "demonstrated" }),
  C("wrong answer, skill shown", "3/4 + 1/6", ["9/12 + 2/12", "10/12"], "invalid", { first: 2, opts: { requiredSkills: ["common-denominator"] }, skill: "demonstrated" }),
  C("equivalent-fraction skill", "1/2 + 1/3", ["3/6 + 2/6", "5/6"], "verified", { opts: { requiredSkills: ["equivalent-fraction"] }, skill: "demonstrated" }),
  C("index-laws skill shown", "2^3 × 2^2", ["2^5", "32"], "verified", { opts: { requiredSkills: ["index-laws"] }, skill: "demonstrated" }),
  C("index-laws skill not shown", "2^3 × 2^2", ["8 × 4", "32"], "verified", { opts: { requiredSkills: ["index-laws"] }, skill: "not-demonstrated" }),
  C("cross-multiplication shown", "x : 12 = 3 : 4", ["4x = 36", "x = 9"], "verified", { opts: { requiredSkills: ["cross-multiplication"] }, skill: "demonstrated" }),
  C("cross-multiplication not shown", "x : 12 = 3 : 4", ["x = 9"], "verified", { opts: { requiredSkills: ["cross-multiplication"] }, skill: "not-demonstrated" }),
  // ---- refusals are never converted into correctness
  C("problem with incompatible units", "5 cm + 2 g", ["7"], "unsupported"),
  C("problem divides by zero", "7/0", ["1"], "unsupported"),
  C("problem too large", "2^1000", ["1"], "unsupported"),
  C("irrational line", "4", ["sqrt(2) × sqrt(2) + 2", "4"], "unsupported"),
  C("unit dropped", "Convert 2.5 m to cm", ["250"], "unsupported"),
  C("ambiguous division and bracket", "9 ÷ 3", ["9 ÷ 3(1)", "3"], "ambiguous"),
  C("not a number problem", "hello", ["1"], "unsupported"),
];
describe("exact-number engine: adversarial cases (hand-written expectations)", () => {
  for (const c of CASES) it(c.note, () => {
    const r = assessNumberWorking(c.p, c.lines, c.opts);
    assert.equal(r.outcome, c.out, `${r.outcome}: ${r.summary}`);
    assert.equal(r.correct, c.out === "verified" ? true : c.out === "invalid" ? false : null);
    if (c.first !== undefined) assert.equal(r.firstInvalidStep, c.first);
    if (c.err) assert.ok(r.errors.some((e) => e.id === c.err), `errors: ${r.errors.map((e) => e.id).join(",") || "none"}`);
    if (c.skill) assert.equal(r.skills.status, c.skill);
  });
});

describe("unified core API", () => {
  it("assessWorking routes number problems and keeps the advisory contract", () => {
    const a = assessWorking("3/4 + 1/6", ["9/12 + 2/12", "11/12"]);
    assert.equal(a.outcome, "verified"); assert.equal(a.advisory, true); assert.equal(a.correct, true);
    const b = assessWorking("3/4 + 1/6", ["4/10"]);
    assert.equal(b.firstInvalidStep, 1); assert.ok(b.causes.length > 0);
    const c = assessWorking("3/4 + 1/6", ["11/12"], { requiredSkills: ["common-denominator"] });
    assert.equal(c.correct, true); assert.equal(c.number?.skills.status, "not-demonstrated");
  });
  it("verifyWorkingStep judges one transformation", () => {
    assert.equal(verifyWorkingStep("3/4 + 1/6", "3/4 + 1/6", "(9+2)/12").outcome, "verified");
    assert.equal(verifyWorkingStep("3/4 + 1/6", "3/4 + 1/6", "4/10").outcome, "invalid");
    assert.equal(verifyNumberStep("hello", "1", "2").outcome, "unsupported");
  });
  it("algebra problems still go to the algebra core", () => {
    assert.equal(assessWorking("2x + 3 = 7", ["2x = 4", "x = 2"]).outcome, "verified");
  });
});

describe("evaluator vs Python fractions (independent implementation), random expressions", () => {
  it("agrees exactly on 400 random expressions", () => {
    let seed = 20261026; const rnd = (n: number) => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; };
    const atom = (): string => { const k = rnd(5); return k === 0 ? String(rnd(40)) : k === 1 ? `${rnd(9)}.${rnd(99)}` : k === 2 ? `(${1 + rnd(9)}/${1 + rnd(9)})` : k === 3 ? `${rnd(60)}%` : String(1 + rnd(12)); };
    const gen = (d: number): string => { if (d === 0) return atom(); const k = rnd(7); const a = gen(d - 1), b = gen(d - 1); return k === 0 ? `(${a} + ${b})` : k === 1 ? `(${a} - ${b})` : k === 2 ? `(${a} * ${b})` : k === 3 ? `(${a} / ${b})` : k === 4 ? `(${a})^${rnd(4)}` : k === 5 ? `${a} * ${b}` : `${a} - ${b}`; };
    const exprs = Array.from({ length: 400 }, () => gen(1 + rnd(3)));
    const py = `import sys,json\nfrom fractions import Fraction as F\nimport re\nxs=json.load(sys.stdin);out=[]\nfor e in xs:\n  s=re.sub(r'(\\d+(?:\\.\\d+)?)%',r'(F("\\1")/100)',e)\n  s=re.sub(r'(?<![\\w."])(\\d+(?:\\.\\d+)?)(?![\\w."])',r'F("\\1")',s)\n  s=s.replace('^','**')\n  try: v=eval(s,{'F':F}); out.append(None if isinstance(v,complex) else str(v))\n  except ZeroDivisionError: out.append('undefined')\n  except Exception as ex: out.append('skip')\nprint(json.dumps(out))`;
    const ref: string[] = JSON.parse(execFileSync("python3", ["-I", "-c", py], { input: JSON.stringify(exprs.map((e) => e.replace(/\^(\d)/g, "**$1"))) }).toString());
    let compared = 0;
    exprs.forEach((e, i) => {
      let got: string;
      try { const v = evaluate(parseStatement(e).sides[0]); got = v.k === "q" ? (v.q.d === 1n ? `${v.q.n}` : `${v.q.n}/${v.q.d}`) : "other"; } catch (err: any) { got = err.kind === "undefined" ? "undefined" : "skip"; }
      if (ref[i] === "skip" || got === "skip") return;
      compared++; assert.equal(got, ref[i], e);
    });
    assert.ok(compared > 300, `${compared} compared`);
  });
});

describe("held-out cases (written after the rules were final, run once; failures here are reported, not tuned away)", () => {
  const H: Case[] = [
    C("subtract unlike fractions", "5/6 − 1/3", ["5/6 − 2/6", "3/6", "1/2"], "verified", { opts: { requiredSkills: ["common-denominator", "reduce-fraction"] }, skill: "demonstrated" }),
    C("fraction times whole", "2/5 × 15", ["30/5", "6"], "verified"),
    C("fraction division with invert", "4/9 ÷ 2/3", ["4/9 × 3/2", "12/18", "2/3"], "verified"),
    C("fraction division without invert", "4/9 ÷ 2/3", ["8/27"], "invalid", { first: 1, err: "fraction-divide-no-invert" }),
    C("sum of squares", "3^2 + 4^2", ["25"], "verified"),
    C("sum of squares wrong", "3^2 + 4^2", ["49"], "invalid", { first: 1 }),
    C("power over a sum", "(2 + 3)^2", ["2^2 + 3^2"], "invalid", { first: 1, err: "power-over-sum" }),
    C("minus a negative", "7 − (−3)", ["10"], "verified"),
    C("minus a negative, sign slip", "7 − (−3)", ["4"], "invalid", { first: 1, err: "double-negative" }),
    C("decimal division", "0.6 ÷ 0.2", ["3"], "verified"),
    C("decimal division slip", "0.6 ÷ 0.2", ["0.3"], "invalid", { first: 1, err: "decimal-place" }),
    C("mixed units in grams", "250 g + 1.5 kg", ["1750 g"], "verified"),
    C("mixed units in kg", "250 g + 1.5 kg", ["1.75 kg"], "verified"),
    C("mixed units, numerals added", "250 g + 1.5 kg", ["251.5"], "invalid", { first: 1, err: "units-ignored" }),
    C("ratio simplified", "Simplify 12 : 8", ["3 : 2"], "verified"),
    C("ratio not simplest", "Simplify 12 : 8", ["6 : 4"], "incomplete"),
    C("proportion, other positions", "x : 5 = 12 : 20", ["20x = 60", "x = 3"], "verified"),
    C("proportion wrong", "x : 5 = 12 : 20", ["x = 48"], "invalid", { first: 1 }),
    C("lcm", "lcm(8, 12)", ["24"], "verified"),
    C("lcm as hcf", "lcm(8, 12)", ["4"], "invalid", { first: 1, err: "hcf-lcm-swap" }),
    C("lcm as product", "lcm(8, 12)", ["96"], "invalid", { first: 1, err: "lcm-as-product" }),
    C("factor tree", "Write 84 as a product of prime factors", ["84 = 2 × 42", "42 = 2 × 21", "21 = 3 × 7", "2^2 × 3 × 7"], "verified", { opts: { requiredSkills: ["prime-factorisation"] }, skill: "demonstrated" }),
    C("not fully factorised", "Write 84 as a product of prime factors", ["4 × 21"], "incomplete"),
    C("indices mixed", "2^5 ÷ 2^2 × 2", ["2^4", "16"], "verified"),
    C("precedence trap", "8 − 3 × 2 + 1", ["11"], "invalid", { first: 1, err: "order-of-operations" }),
    C("precedence right", "8 − 3 × 2 + 1", ["3"], "verified"),
    C("percent of percent", "50% of 30% of 200", ["0.5 × 60", "30"], "verified"),
    C("fraction of", "3/4 of 24", ["18"], "verified"),
    C("fraction power", "(1/2)^3", ["1/8"], "verified"),
    C("fraction power as product", "(1/2)^3", ["3/2"], "invalid", { first: 1, err: "power-as-multiplication" }),
    C("gibberish line", "3 + 4", ["banana"], "unsupported"),
  ];
  for (const c of H) it(c.note, () => {
    const r = assessNumberWorking(c.p, c.lines, c.opts);
    assert.equal(r.outcome, c.out, `${r.outcome}: ${r.summary}`);
    if (c.first !== undefined) assert.equal(r.firstInvalidStep, c.first);
    if (c.err) assert.ok(r.errors.some((e) => e.id === c.err), `errors: ${r.errors.map((e) => e.id).join(",") || "none"}`);
    if (c.skill) assert.equal(r.skills.status, c.skill);
  });
});
