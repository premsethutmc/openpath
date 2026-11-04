// Soundness probes. Each case carries a hand-established truth (see findings.json); the checker is only run to see what it says.
import { checkStepText, checkClaim } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-checker.ts";
import { solve } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-engine.ts";
import { solSet, solEquals, solSubset, zerosOfDenominators, parseEq } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-state.ts";
import { Poly, RatFun } from "/home/claude/k052/packages/learning/src/reasoner/domain/poly.ts";
import { DEFS } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-rules.ts";
import { parseExpr } from "/home/claude/k052/packages/learning/src/reasoner/expr-text.ts";
import { Rational, Expr } from "/home/claude/k052/packages/learning/src/math-kernel.ts";

const out: Record<string, unknown> = {};
const run = (id: string, f: () => unknown) => { try { out[id] = f(); } catch (e) { out[id] = { THROWS: `${(e as Error).constructor.name}: ${(e as Error).message}` }; } };
const step = (eq1: string, ex1: string[], eq2: string, ex2: string[], effect: "equivalence" | "implication" = "equivalence") => checkStepText({ eq: eq1, excluded: ex1 }, { eq: eq2, excluded: ex2 }, effect);

// ---- complex vs real roots
run("C1 x^2+1=0 <=> x^2+4=0", () => step("x^2+1=0", [], "x^2+4=0", []));
run("C2 x^2+1=0 <=> 1=0 (no solution)", () => step("x^2+1=0", [], "1=0", []));
run("C3 x^2+1=0 => x=5 (implication, vacuous)", () => step("x^2+1=0", [], "x=5", [], "implication"));
run("C4 x^4=4 <=> x^2=2", () => step("x^4=4", [], "x^2=2", []));
run("C5 (x^2+1)(x-1)=0 <=> x-1=0", () => step("(x^2+1)*(x-1)=0", [], "x-1=0", []));
run("C6 claim x^2+1=0 -> []", () => checkClaim("x^2+1=0", []));
run("C7 claim (x-1)(x^2+1)=0 -> [1]", () => checkClaim("(x-1)*(x^2+1)=0", ["1"]));
run("C8 claim (x-1)(x^2-2)=0 -> [1] (false claim)", () => checkClaim("(x-1)*(x^2-2)=0", ["1"]));
run("C9 claim x^2-2=0 -> [] (false claim)", () => checkClaim("x^2-2=0", []));
run("C10 x^2=2 <=> x^2=3 (truly different)", () => step("x^2=2", [], "x^2=3", []));
run("C11 x^2=2 => x^4=4 (true implication)", () => step("x^2=2", [], "x^4=4", [], "implication"));
run("C12 x^4=4 => x^2=2 (true over R)", () => step("x^4=4", [], "x^2=2", [], "implication"));

// ---- repeated roots and exclusions
run("R1 (x-1)^2=0 <=> x-1=0", () => step("(x-1)^2=0", [], "x-1=0", []));
run("R2 (x-1)^2(x-2)=0 [1] <=> x-2=0 [1]", () => step("(x-1)^2*(x-2)=0", ["1"], "x-2=0", ["1"]));
run("R3 (x-1)^2/(x-1)=0 claim []", () => checkClaim("(x-1)^2/(x-1)=0", []));
run("R4 (x-1)/(x-1)^2=0 claim []", () => checkClaim("(x-1)/(x-1)^2=0", []));
run("R5 x*(x-1)=0 [1] <=> x=0 [1]", () => step("x*(x-1)=0", ["1"], "x=0", ["1"]));
run("R6 x*(x-1)=0 [] <=> x=0 [1] (must be rejected: 1 is a solution of from)", () => step("x*(x-1)=0", [], "x=0", ["1"]));

// ---- irrational / complex denominators
run("I1 1/(x^2-2)=0 closure", () => step("1/(x^2-2)=0", [], "1=0", []));
run("I2 1/(x^2+1)=1 (denominator without real zeros)", () => step("1/(x^2+1)=1", [], "x^2=0", []));
run("I3 x*(x^2-2)=0 [0] <=> x^2-2=0 [0]", () => step("x*(x^2-2)=0", ["0"], "x^2-2=0", ["0"]));
run("I4 claim for equation with irrational denominator", () => checkClaim("1/(x^2-2)=1", ["1"]));

// ---- all / set mixes
run("A1 x/x=1 [0] <=> 1=1 [0]", () => step("x/x=1", ["0"], "1=1", ["0"]));
run("A2 x/x=1 [0] <=> x=x [] (excluded dropped)", () => step("x/x=1", ["0"], "x=x", []));
run("A3 x=1 => x^2=x (forward)", () => step("x=1", [], "x^2=x", [], "implication"));
run("A4 x^2=x => x=1 (backward must fail)", () => step("x^2=x", [], "x=1", [], "implication"));
run("A5 x=x [] => x=1 (all into finite set must fail)", () => step("x=x", [], "x=1", [], "implication"));
run("A6 x=1 [] => x=x [] (set into all)", () => step("x=1", [], "x=x", [], "implication"));
run("A7 x=0 [] => x/x=1 [0] (0 not in target domain: must fail)", () => step("x=0", [], "x/x=1", ["0"], "implication"));
run("A8 x/x=1 [0] => x=x [] (subset ok, but restriction dropped)", () => step("x/x=1", ["0"], "x=x", [], "implication"));
run("A9 x=x [] => x=x [0] (R not inside R\\{0}: must fail)", () => step("x=x", [], "x=x", ["0"], "implication"));
run("A10 0=0 <=> x-x=0", () => step("0=0", [], "x-x=0", []));
run("A11 1=0 <=> 2=0", () => step("1=0", [], "2=0", []));
run("A12 0*x=0 <=> 0=0", () => step("0*x=0", [], "0=0", []));
run("A13 claim identity all-real for x=x", () => checkClaim("x=x", "all-real"));
run("A14 claim identity all-except-excluded for x=x", () => checkClaim("x=x", "all-except-excluded"));
run("A15 claim identity all-except-excluded for x/x=1", () => checkClaim("x/x=1", "all-except-excluded"));
run("A16 claim []-for-contradiction 1=0", () => checkClaim("1=0", []));

// ---- 'from' state closure / original restrictions
run("F1 (x^2-1)/(x-1)=2 [] <=> x+1=2 []  (from not closed)", () => step("(x^2-1)/(x-1)=2", [], "x+1=2", []));
run("F2 0/x=0 [] <=> 0=0 []", () => step("0/x=0", [], "0=0", []));
run("F3 (x^2-1)/(x-1)=2 [1] <=> x+1=2 [1]", () => step("(x^2-1)/(x-1)=2", ["1"], "x+1=2", ["1"]));
run("F4 (x^2-1)/(x-1)=2 [1] <=> x+1=2 []  (restriction dropped)", () => step("(x^2-1)/(x-1)=2", ["1"], "x+1=2", []));
run("F5 (x^2-x)/x=-1 claim", () => checkClaim("(x^2-x)/x=-1", []));
run("F6 (x^2-x)/x=x-1 claim", () => checkClaim("(x^2-x)/x=x-1", "all-except-excluded"));

// ---- division by zero / zero numerators
run("Z1 x/0=1", () => step("x/0=1", [], "1=1", []));
run("Z2 0/x=0 [0] <=> 0=0 [0]", () => step("0/x=0", ["0"], "0=0", ["0"]));
run("Z3 x/(x-x)=1", () => step("x/(x-x)=1", [], "1=1", []));
run("Z4 x/(1-1)=1 claim", () => checkClaim("x/(1-1)=1", ["1"]));
run("Z5 0/0=1", () => step("0/0=1", [], "1=1", []));
run("Z6 x*0/x=0 [0]", () => step("x*0/x=0", ["0"], "0=0", ["0"]));
run("Z7 zerosOfDenominators(1/(x-x))", () => zerosOfDenominators(parseExpr("1/(x-x)")).map(String));

// ---- powers
run("P1 x^-1*x=1 [] <=> 1=1 []  (x^-1 undefined at 0)", () => step("x^-1*x=1", [], "1=1", []));
run("P2 same with x^(-1)", () => step("x^(-1)*x=1", [], "1=1", []));
run("P3 x^(1-2)*x=1", () => step("x^(1-2)*x=1", [], "1=1", []));
run("P4 claim 1/(x-1)+0*x^-1=-1 -> [0]", () => checkClaim("1/(x-1)+0*x^-1=-1", ["0"]));
run("P5 solve 1/(x-1)+0*x^-1=-1", () => { const r = solve("1/(x-1)+0*x^-1=-1"); return { class: r.class, solution: r.solution, restrictions: r.restrictions, note: r.note }; });
run("P6 zerosOfDenominators(x^-1)", () => zerosOfDenominators(parseExpr("x^-1")).map(String));
run("P7 zerosOfDenominators(1/x)", () => zerosOfDenominators(parseExpr("1/x")).map(String));
run("P8 zerosOfDenominators(x^(-2))", () => zerosOfDenominators(parseExpr("x^(-2)")).map(String));
run("P9 x^0=1 [] <=> 1=1 [] (0^0 convention)", () => step("x^0=1", [], "1=1", []));
run("P10 (x-1)^0=1", () => step("(x-1)^0=1", [], "1=1", []));
run("P11 x^13=0", () => step("x^13=0", [], "x=0", []));
run("P12 x^(1/2)=1", () => step("x^(1/2)=1", [], "x=1", []));
run("P13 x^(2/2)=1 <=> x=1", () => step("x^(2/2)=1", [], "x=1", []));
run("P14 x^(x/x)=x [] <=> x=x [] (exponent undefined at 0)", () => step("x^(x/x)=x", [], "x=x", []));
run("P15 x^99999999999999999999=0", () => step("x^99999999999999999999=0", [], "x=0", []));
run("P16 0^0 = 1", () => step("0^0=1", [], "1=1", []));
run("P17 0^-1 = 1", () => step("0^-1=1", [], "1=1", []));
run("P18 x^12 = x^12 ok", () => step("x^12=0", [], "x=0", []));
run("P19 (1/x)^0=1 [0]", () => step("(1/x)^0=1", ["0"], "1=1", ["0"]));
run("P20 (1/x)^0=1 [] (closure)", () => step("1=1", [], "(1/x)^0=1", []));
run("P21 Poly.fromExpr((1/x)^0) is polynomial?", () => String(Poly.fromExpr(parseExpr("(1/x)^0"))));
run("P22 eval x^-1 at 0 in kernel", () => { try { return String(require("x")); } catch { return "n/a"; } });

// ---- rationalRoots limit
const big = 10n ** 13n;
run("L1 rationalRoots 1e13*x - 1e13", () => new Poly([new Rational(-big), new Rational(big)]).rationalRoots().map(String));
run("L2 rationalRoots x - 1e13", () => new Poly([new Rational(-big), Rational.one]).rationalRoots().map(String));
run("L3 rationalRoots x - 1e12", () => new Poly([new Rational(-(10n ** 12n)), Rational.one]).rationalRoots().map(String));
run("L4 solEquals with huge coeffs (no limit)", () => step("x-10000000000000=0", [], "2*x-20000000000000=0", []));
run("L5 solve with huge coefficient denominator", () => { const r = solve("1/(10000000000000*x-1)=1"); return { class: r.class, reasons: r.reasons }; });
run("L6 solve huge numerator quadratic", () => { const r = solve("(x^2-100000000000000000000000000)/x=1"); return { class: r.class, reasons: r.reasons }; });
run("L7 claim huge root", () => checkClaim("x-10000000000000=0", ["10000000000000"]));
run("L8 claim huge root 2x^2 quad", () => checkClaim("(x-10000000000000)*(x-1)=0", ["1", "10000000000000"]));
run("L9 splitLinear content 1e13", () => { const s = new Poly([new Rational(-big), new Rational(big)]).splitLinear(); return s && { content: String(s.content), roots: s.roots.map(String) }; });
run("L10 zerosOfDenominators 1/(x-1e13)", () => zerosOfDenominators(parseExpr("1/(x-10000000000000)")).map(String));
run("L11 claim x-1e13 with step(1/(x-1e13)=0)", () => step("1/(x-10000000000000)=0", ["10000000000000"], "1=0", ["10000000000000"]));

// ---- rule preconditions
const chk = (rule: string, eq: string, ex: string[], p: Record<string, unknown>) => {
  const { left, right } = parseEq(eq);
  const cons = ex.map((v) => ({ kind: "nonzero" as const, expr: v === "0" ? Expr.var("x") : Expr.sub(Expr.var("x"), Expr.num(new Rational(BigInt(v)))) }));
  const s: any = { expressions: new Map(), statements: [{ left, relation: "=", right }], constraints: cons, bindings: new Map() };
  return DEFS.get(rule)!.checks(s, p).map((c) => `${c.held ? "ok" : "FAIL"}: ${c.name} (${c.detail})`);
};
run("D1 divide by x^2-2 with restricted []", () => chk("domain.divide-both-sides", "x=0", [], { factor: "x^2-2" }));
run("D2 divide by x^2+1 (no real zeros) restricted []", () => chk("domain.divide-both-sides", "x=0", [], { factor: "x^2+1" }));
run("D3 divide by (x-1)^2 restricted [1]", () => chk("domain.divide-both-sides", "x=0", ["1"], { factor: "(x-1)^2" }));
run("D4 divide by (x-1)*(x^2+1) restricted [1]", () => chk("domain.divide-both-sides", "x=0", ["1"], { factor: "(x-1)*(x^2+1)" }));
run("D5 divide by 0", () => chk("domain.divide-both-sides", "x=0", [], { factor: "0" }));
run("D6 divide by x-x", () => chk("domain.divide-both-sides", "x=0", [], { factor: "x-x" }));
run("D7 divide by 1e13*x-1e13 restricted [1]", () => chk("domain.divide-both-sides", "x=0", ["1"], { factor: "10000000000000*x-10000000000000" }));
run("D8 multiply by x restricted [0]", () => chk("domain.multiply-both-sides", "x=1", ["0"], { factor: "x" }));
run("D9 multiply by x restricted []", () => chk("domain.multiply-both-sides", "x=1", [], { factor: "x" }));
run("D10 cancel-common-factor 0/x restricted [0]", () => chk("domain.cancel-common-factor", "0/x=0", ["0"], { index: 0 }));
run("D11 cancel (x^2-1)/(x-1) restricted [1]", () => chk("domain.cancel-common-factor", "(x^2-1)/(x-1)=2", ["1"], { index: 0 }));
run("D12 cancel (x^2-1)/(x-1) restricted []", () => chk("domain.cancel-common-factor", "(x^2-1)/(x-1)=2", [], { index: 0 }));
run("D13 clear-denominators with x^-1 hidden denominator", () => chk("domain.clear-denominators", "1/(x-1)+0*x^-1=-1", ["1"], {}));
run("D14 clear-denominators 1/x+1/(x-1)=1 restricted [0,1]", () => chk("domain.clear-denominators", "1/x+1/(x-1)=1", ["0", "1"], {}));
run("D15 clear-denominators 1/(x^2-2)=1 ", () => chk("domain.clear-denominators", "1/(x^2-2)=1", [], {}));
run("D16 clear-denominators 1/(x^2+1)=1", () => chk("domain.clear-denominators", "1/(x^2+1)=1", [], {}));

// ---- engine end-to-end on tricky shapes
const eng = (t: string) => { const r = solve(t); return { class: r.class, solution: r.solution, restrictions: r.restrictions, reasons: r.reasons, note: r.note }; };
run("E1 (x^2-x)/x=-1", () => eng("(x^2-x)/x=-1"));
run("E2 (x^2-1)/(x-1)=2", () => eng("(x^2-1)/(x-1)=2"));
run("E3 x/(x-1)=1/(x-1)", () => eng("x/(x-1)=1/(x-1)"));
run("E4 1/x+1/(x-1)=1/(x*(x-1))", () => eng("1/x+1/(x-1)=1/(x*(x-1))"));
run("E5 (x-1)^2/(x-1)=0", () => eng("(x-1)^2/(x-1)=0"));
run("E6 1/x^2=1/x", () => eng("1/x^2=1/x"));
run("E7 0/x=0", () => eng("0/x=0"));
run("E8 x/0=1", () => eng("x/0=1"));
run("E9 1/(x-x)=1", () => eng("1/(x-x)=1"));
run("E10 1/(x-1)+x^-1*0=-1", () => eng("1/(x-1)+x^-1*0=-1"));
run("E11 x/(x-1)+x^-1*(x-1)=... mixes", () => eng("1/(x-1)=x^-1*x-1"));

console.log(JSON.stringify(out, null, 1));
