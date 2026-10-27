import { checkStepText, checkClaim } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-checker.ts";
import { solve } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-engine.ts";
import { Poly } from "/home/claude/k052/packages/learning/src/reasoner/domain/poly.ts";
import { parseExpr, printExpr } from "/home/claude/k052/packages/learning/src/reasoner/expr-text.ts";
import { Rational } from "/home/claude/k052/packages/learning/src/math-kernel.ts";
const out: Record<string, unknown> = {};
const run = (id: string, f: () => unknown) => { try { out[id] = f(); } catch (e) { out[id] = { THROWS: `${(e as Error).constructor.name}: ${(e as Error).message}` }; } };
const step = (a: string, ea: string[], b: string, eb: string[], effect: "equivalence" | "implication" = "equivalence") => checkStepText({ eq: a, excluded: ea }, { eq: b, excluded: eb }, effect);
const eng = (t: string) => { const r = solve(t); return { class: r.class, solution: r.solution, restrictions: r.restrictions, reasons: r.reasons, note: r.note }; };

run("G1 (x^2-2)/(x^2-2)=1 [] <=> x=x [] (irrational poles in from, unchecked)", () => step("(x^2-2)/(x^2-2)=1", [], "x=x", []));
run("G2 (x^2+1)/(x^2+1)=1 [] <=> x=x [] (true: x^2+1 never zero)", () => step("(x^2+1)/(x^2+1)=1", [], "x=x", []));
run("G3 1/(x^2-2)=0 [] <=> 1=0 []", () => step("1/(x^2-2)=0", [], "1=0", []));
run("G4 x*x/x=x [] <=> x=x [] (from lacks 0)", () => step("x*x/x=x", [], "x=x", []));
run("G5 x*x/x=x [0] <=> x=x [0]", () => step("x*x/x=x", ["0"], "x=x", ["0"]));
run("G6 to-state with irrational denominators", () => step("x=x", [], "(x^2-2)/(x^2-2)=1", []));
run("G7 claim (x^2-2)/(x^2-2)=1", () => checkClaim("(x^2-2)/(x^2-2)=1", "all-except-excluded"));
run("G8 claim x/(x-1)=1/(x-1) -> [1]", () => checkClaim("x/(x-1)=1/(x-1)", ["1"]));
run("G9 claim 1/x=1/x all-real", () => checkClaim("1/x=1/x", "all-real"));
run("G10 duplicated claim [1,1] for x=1", () => checkClaim("x=1", ["1", "1"]));
run("G11 claim [2/2] for x=1", () => checkClaim("x=1", ["2/2"]));
run("G12 claim [1/0]", () => checkClaim("x=1", ["1/0"]));
run("G13 claim 0.5", () => checkClaim("2*x=1", ["0.5"]));

run("W1 parse '1 0' (whitespace stripped inside number)", () => printExpr(parseExpr("1 0")));
run("W2 parse 'x^-1'", () => JSON.stringify(parseExpr("x^-1"), (k, v) => typeof v === "bigint" ? v.toString() : v));
run("W3 parse '-x^2'", () => printExpr(parseExpr("-x^2")));
run("W4 parse '2^3^2'", () => printExpr(parseExpr("2^3^2")));

// engine: identity with a hidden x^-1 pole
run("EP1 solve 1/(x-1)-1/(x-1)=x^-1*x-1  (truth: identity on R\\{0,1})", () => eng("1/(x-1)-1/(x-1)=x^-1*x-1"));
run("EP2 solve 1/(x-1)=x^-1*x-1+1/(x-1)", () => eng("1/(x-1)=x^-1*x-1+1/(x-1)"));
run("EP3 solve 1/(x-1)+x^-1*x=2/(x-1)+1-1/(x-1)", () => eng("1/(x-1)+x^-1*x=2/(x-1)+1-1/(x-1)"));
run("EP4 solve (x^2-x)/x=x^-1*(x^2-x)", () => eng("(x^2-x)/x=x^-1*(x^2-x)"));
run("EP5 solve 1/(x-1)=1/(x-1)+0*x^(1-2)", () => eng("1/(x-1)=1/(x-1)+0*x^(1-2)"));
run("EP6 solve 1/(x-1)=x^(x/x)/x  (exponent pole)", () => eng("1/(x-1)=x^(x/x)/x"));

console.log(JSON.stringify(out, null, 1));
