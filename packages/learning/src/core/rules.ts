// The rule library: every mathematical operation the core knows, on ONE contract (rule.ts).
// The K05.1 linear moves and the K05.2 domain-aware rules live side by side here; the planner (planner.ts) discovers and composes them.
// Vocabulary operations (used by strategies and tasks as `allowed`): restrict, move-to-left, combine-terms, cancel-common-factor,
// clear-denominators, expand, collect-terms, add-sub-both-sides, mul-div-const, divide-restricted-factor, accept-candidate, swap-sides.
import { Rational, Expr, evaluate, type MathExpr, type MathState } from "../math-kernel.ts";
import { Poly, RatFun, polyToExpr, ratFunToExpr } from "../reasoner/domain/poly.ts";
import { printExpr, parseExpr } from "../reasoner/expr-text.ts";
import { hasX, denominatorsOf, zerosOfDenominators, excludedOf, constraintOf, linearFactorExpr } from "../reasoner/domain/domain-state.ts";
import * as T from "./tactics.ts";
import { RuleLibrary, type CoreRule, type Params, type Check } from "./rule.ts";
import { eqOf, origRestr } from "./verify.ts";

// ---------- shared helpers (one copy) ----------
const withEq = (s: MathState, left: MathExpr, right: MathExpr): MathState => ({ ...s, statements: [{ left, relation: "=", right }, ...s.statements.slice(1)] });
const isZeroLit = (e: MathExpr) => e.kind === "num" && e.value.isZero();
const inSet = (v: Rational, xs: Rational[]) => xs.some((u) => u.eq(v));
const eq2 = (s: MathState): T.Eq => ({ left: eqOf(s).left, right: eqOf(s).right });
const eqKey = (q: T.Eq) => T.eqText(q);
function collectDivs(e: MathExpr, out: MathExpr[] = []): MathExpr[] {
  switch (e.kind) {
    case "div": if (hasX(e.right)) out.push(e); collectDivs(e.left, out); collectDivs(e.right, out); break;
    case "add": case "sub": case "mul": collectDivs(e.left, out); collectDivs(e.right, out); break;
    case "neg": collectDivs(e.operand, out); break;
    case "pow": collectDivs(e.base, out); break;
    default: break;
  }
  return out;
}
function replaceNode(e: MathExpr, target: MathExpr, repl: MathExpr): MathExpr {
  if (e === target) return repl;
  switch (e.kind) {
    case "add": case "sub": case "mul": case "div": return { ...e, left: replaceNode(e.left, target, repl), right: replaceNode(e.right, target, repl) } as MathExpr;
    case "neg": return { ...e, operand: replaceNode(e.operand, target, repl) };
    case "pow": return { ...e, base: replaceNode(e.base, target, repl), exp: replaceNode(e.exp, target, repl) };
    default: return e;
  }
}
const allDivs = (s: MathState) => [...collectDivs(eqOf(s).left), ...collectDivs(eqOf(s).right)];
const noDen = (s: MathState) => { try { return denominatorsOf(eqOf(s).left).length === 0 && denominatorsOf(eqOf(s).right).length === 0; } catch { return false; } };
const polys = (s: MathState) => ({ l: Poly.fromExpr(eqOf(s).left), r: Poly.fromExpr(eqOf(s).right) });
/** The fragment K05.1 reasons in: no x in a denominator, both sides polynomials of degree <= 1. */
export const isLinear = (s: MathState) => { if (!noDen(s)) return false; const { l, r } = polys(s); return !!l && !!r && l.degree <= 1 && r.degree <= 1; };
const zerosIn = (p: Poly, restricted: Rational[]): { ok: boolean; detail: string } => {
  if (p.degree < 1) return { ok: !p.isZero(), detail: p.isZero() ? "the factor is the zero polynomial" : "a non-zero constant" };
  const sp = p.splitLinear();
  if (!sp) return { ok: false, detail: "zeros not all rational: cannot show they are restricted" };
  const missing = sp.roots.filter((r) => !inSet(r, restricted));
  return { ok: missing.length === 0, detail: missing.length ? `x = ${missing.map(String).join(", ")} is not restricted, so the factor may be zero` : `its zeros (${sp.roots.map(String).join(", ")}) are all restricted` };
};
const parseVal = (v: unknown): Rational => { const [a, b] = String(v).split("/"); return new Rational(BigInt(a), BigInt(b ?? "1")); };
const evalAt = (e: MathExpr, c: Rational) => evaluate(e, new Map([["x", c]]));
const closureHolds = (s: MathState) => [...zerosOfDenominators(eqOf(s).left), ...zerosOfDenominators(eqOf(s).right)].every((v) => inSet(v, excludedOf(s)));
const text2 = (s: MathState) => `${printExpr(eqOf(s).left)}=${printExpr(eqOf(s).right)}`;

export const library = new RuleLibrary();
const reg = (r: Omit<CoreRule, "opsOf"> & { ops: string[] | ((p: Params) => string[]) }) => library.register({ ...r, opsOf: typeof r.ops === "function" ? r.ops : () => r.ops as string[] } as CoreRule);

// ---------- restrict ----------
reg({
  id: "core.restrict", ops: ["restrict"], effect: "equivalence", eager: 0,
  description: "Record x != r for every real zero r of every denominator containing x.",
  principle: "Division by zero is undefined, so every value that makes a denominator zero is excluded from the problem for ever.",
  match: (s) => { try { return closureHolds(s) ? [] : [{}]; } catch { return []; } },
  checks(s) { let z: Rational[] = []; let ok = true, detail = ""; try { z = [...zerosOfDenominators(eqOf(s).left), ...zerosOfDenominators(eqOf(s).right)]; } catch (e) { ok = false; detail = String(e); }
    return [{ name: "every denominator splits into linear factors over Q", held: ok, detail: ok ? `zeros: ${z.map(String).join(", ") || "none"}` : detail }]; },
  apply(s) {
    const z = [...zerosOfDenominators(eqOf(s).left), ...zerosOfDenominators(eqOf(s).right)];
    const have = excludedOf(s); const add = z.filter((v, i) => !inSet(v, have) && z.findIndex((u) => u.eq(v)) === i);
    return { ...s, constraints: [...s.constraints, ...add.map(constraintOf)] };
  },
  action: (s, a) => `record the restrictions ${a.constraints.map((c) => `${printExpr(c.expr)} != 0`).join(", ") || "(none needed)"}`,
  verify: (before, after) => text2(before) === text2(after) && closureHolds(after) && origRestr(after).every((v) => inSet(v, excludedOf(after))),
});

// ---------- K05.1 tactics as rules: collect-terms (tidy), expand (brackets) ----------
reg({
  id: "core.collect-terms", ops: ["collect-terms"], effect: "equivalence", eager: 1, name: () => "simplify",
  description: "Fold constants, write k*x terms canonically and combine like terms on both sides (linear fragment).",
  principle: "Evaluating numbers and combining like terms is an identity between the two written expressions.",
  match(s) { if (!isLinear(s)) return []; const notes = new Set<string>(); const q = eq2(s); const simp = { left: T.simplify(q.left, notes), right: T.simplify(q.right, notes) }; return eqKey(simp) !== eqKey(q) ? [{}] : []; },
  checks: (s) => [{ name: "linear fragment (no x in a denominator, degree <= 1)", held: isLinear(s), detail: "" }],
  apply(s) { const n = new Set<string>(); return withEq(s, T.simplify(eqOf(s).left, n), T.simplify(eqOf(s).right, n)); },
  action(s) { const n = new Set<string>(); T.simplify(eqOf(s).left, n); T.simplify(eqOf(s).right, n); return `simplify both sides (${[...n].join(", ") || "tidy"})`; },
});
const expansions = (q: T.Eq) => (["left", "right"] as const).flatMap((side) => T.rewriteAt(q[side], T.distributeAt).map((r, i) => ({ side, i, r })));
reg({
  id: "core.expand-brackets", ops: ["expand"], effect: "equivalence", eager: 2, name: () => "expand",
  description: "Remove one bracket by distributing a factor, a division by a number, or a sign.",
  principle: "The distributive law and sign rules are identities between the two written expressions.",
  match(s) { if (!isLinear(s)) return []; const q = eq2(s); const seen = new Set<string>(); const out: Params[] = [];
    for (const e of expansions(q)) { const to = e.side === "left" ? { left: e.r.to, right: q.right } : { left: q.left, right: e.r.to }; const k = eqKey(to); if (!seen.has(k)) { seen.add(k); out.push({ side: e.side, i: e.i }); } }
    return out; },
  checks: (s, p) => [{ name: "linear fragment", held: isLinear(s), detail: "" }, { name: "the bracket exists", held: !!expansions(eq2(s)).find((e) => e.side === p.side && e.i === p.i), detail: `${p.side}#${p.i}` }],
  apply(s, p) { const q = eq2(s); const e = expansions(q).find((x) => x.side === p.side && x.i === p.i)!; return e.side === "left" ? withEq(s, e.r.to, q.right) : withEq(s, q.left, e.r.to); },
  action(s, _a, p) { return expansions(eq2(s)).find((x) => x.side === p.side && x.i === p.i)!.r.what; },
});

// ---------- add/subtract the same term on both sides ----------
const shiftable = (q: T.Eq) => (["left", "right"] as const).flatMap((side) => T.terms(q[side]).map((x, i) => ({ side, i, ...x }))).filter((x) => {
  if (T.isNum(x.t) && x.t.value.isZero()) return false;
  const other = x.side === "left" ? q.right : q.left;
  return !(T.terms(q[x.side]).length === 1 && !(T.hasVar(x.t) && T.hasVar(other)));
});
reg({
  id: "core.add-sub-both-sides", ops: ["add-sub-both-sides"], effect: "equivalence",
  name: (p) => (p.sign as number) > 0 ? "subtract-both-sides" : "add-both-sides",
  description: "Subtract (or add) one term of the equation from (to) both sides.",
  principle: "Adding the same quantity to both sides of an equation keeps its solution set.",
  match(s) { if (!isLinear(s)) return []; const q = eq2(s); const seen = new Set<string>(); const out: Params[] = [];
    for (const x of shiftable(q)) { const p = { side: x.side, i: x.i, sign: x.sign }; const to = shiftTo(q, x.sign, x.t); const k = (x.sign > 0 ? "subtract" : "add") + "|" + eqKey(to); if (!seen.has(k)) { seen.add(k); out.push(p); } }
    return out; },
  checks: (s, p) => [{ name: "linear fragment", held: isLinear(s), detail: "" }, { name: "the term exists", held: !!shiftable(eq2(s)).find((x) => x.side === p.side && x.i === p.i), detail: `${p.side}#${p.i}` }],
  apply(s, p) { const x = shiftable(eq2(s)).find((y) => y.side === p.side && y.i === p.i)!; const to = shiftTo(eq2(s), x.sign, x.t); return withEq(s, to.left, to.right); },
  action(s, _a, p) { const x = shiftable(eq2(s)).find((y) => y.side === p.side && y.i === p.i)!; return `${x.sign > 0 ? "subtract" : "add"} ${printExpr(x.t)} ${x.sign > 0 ? "from" : "to"} both sides`; },
});
const shiftTo = (q: T.Eq, sign: number, t: MathExpr): T.Eq => { const mk = (e: MathExpr) => (sign > 0 ? Expr.sub(e, t) : Expr.add(e, t)); return { left: mk(q.left), right: mk(q.right) }; };

// ---------- multiply / divide both sides ----------
const factorPoly = (p: Params): Poly | null => { try { return Poly.fromExpr(parseExpr(String(p.factor))); } catch { return null; } };
const constFactor = (p: Params): Rational | null => { const f = factorPoly(p); return f && f.degree < 1 && !f.isZero() ? f.c[0] : null; };
reg({
  id: "core.multiply-both-sides", ops: () => ["mul-div-const"], effect: "equivalence", name: () => "multiply-both-sides",
  description: "Multiply both sides by a factor that is non-zero on the whole tracked domain. Discovery proposes the numeric denominators of a linear equation.",
  principle: "Multiplying by e keeps the solution set when e is non-zero everywhere on the tracked domain.",
  match(s) { if (!isLinear(s)) return []; const q = eq2(s); const a = T.denominators(q.left), b = T.denominators(q.right);
    if (!a || !b) return []; const dens = [...a, ...b]; if (!dens.length) return [];
    const distinct = [...new Map(dens.map((d) => [d.toString(), d])).values()];
    let l = 1n; for (const d of dens) { const n = BigInt(d.num); l = (l * n) / T.gcd(l, n); }
    const cands = [...distinct]; if (distinct.length > 1) cands.push(new Rational(l));
    return cands.map((d) => ({ factor: d.toString(), why: "clear a denominator" })); },
  checks(s, p) { const f = factorPoly(p); if (!f) return [{ name: "the factor is a polynomial", held: false, detail: String(p.factor) }]; const z = zerosIn(f, excludedOf(s)); return [{ name: "the factor is non-zero on the domain", held: z.ok, detail: z.detail }]; },
  apply(s, p) { const k = constFactor(p); const e = k ? T.num(k) : parseExpr(String(p.factor)); return withEq(s, Expr.mul(e, eqOf(s).left), Expr.mul(e, eqOf(s).right)); },
  action: (_s, _a, p) => p.why ? `multiply both sides by ${p.factor} to ${p.why}` : `multiply both sides by ${p.factor}`,
});
reg({
  id: "core.multiply-both-sides-expanding", ops: () => ["multiply-expanding"], effect: "implication", introduces: "candidate-check", name: () => "multiply-both-sides-expanding",
  description: "Multiply both sides by e without showing e is non-zero: candidate-expanding. Parametric (a student's or caller's proposal); discovery proposes nothing.",
  principle: "Multiplying by an expression that may be zero keeps every old solution but may add new ones (its zeros). The result is a set of CANDIDATES that must be checked against the original equation.",
  match: () => [],
  checks(s, p) { const f = factorPoly(p); return [{ name: "the factor is a non-zero polynomial", held: !!f && !f.isZero(), detail: String(p.factor) }]; },
  apply: (s, p) => { const e = parseExpr(String(p.factor)); return withEq(s, Expr.mul(e, eqOf(s).left), Expr.mul(e, eqOf(s).right)); },
  action: (_s, _a, p) => `multiply both sides by ${p.factor} (candidate-expanding)`,
});
const restrictedFactors = (s: MathState): string[] => {
  const e = eqOf(s); if (!isZeroLit(e.right)) return []; const P = Poly.fromExpr(e.left); if (!P || P.degree < 1) return [];
  return excludedOf(s).filter((a) => P.eval(a).isZero()).map((a) => printExpr(linearFactorExpr(a)));
};
const coefDivisors = (q: T.Eq): string[] => { const out: string[] = []; for (const side of ["left", "right"] as const) { const k = T.linCoef(q[side]); if (k && !k.isZero() && !k.isOne() && q[side].kind !== "var" && printExpr(q[side]) === printExpr(T.canonLin(k))) out.push(k.toString()); } return out; };
reg({
  id: "core.divide-both-sides", ops: (p) => (p.kind === "restricted-factor" ? ["divide-restricted-factor"] : ["mul-div-const"]), effect: "equivalence", name: () => "divide-both-sides",
  description: "Divide both sides by a factor, provided every zero of the factor is restricted (a non-zero constant has none). Otherwise not applicable: dividing could discard a solution.",
  principle: "Dividing by e is valid only where e != 0. When every zero of e is already restricted, e is non-zero on the whole domain, so nothing is lost.",
  match(s) {
    const out: Params[] = []; const seen = new Set<string>();
    if (isLinear(s)) for (const k of coefDivisors(eq2(s))) { const to = `${k}`; if (!seen.has(to)) { seen.add(to); out.push({ factor: k, kind: "coefficient" }); } }
    for (const f of restrictedFactors(s)) out.push({ factor: f, kind: "restricted-factor" });
    return out; },
  checks(s, p) { const f = factorPoly(p); if (!f) return [{ name: "the divisor is a polynomial", held: false, detail: String(p.factor) }]; const z = zerosIn(f, excludedOf(s)); return [{ name: "the divisor is non-zero on the domain", held: z.ok, detail: z.detail }]; },
  apply(s, p) {
    const k = constFactor(p);
    if (k) return withEq(s, Expr.div(eqOf(s).left, T.num(k)), Expr.div(eqOf(s).right, T.num(k)));
    const e = parseExpr(String(p.factor)); const d = (x: MathExpr) => (isZeroLit(x) ? x : Expr.div(x, e)); return withEq(s, d(eqOf(s).left), d(eqOf(s).right));   // 0 / e = 0 because e is non-zero on the domain
  },
  action: (_s, _a, p) => `divide both sides by ${p.factor}`,
});
reg({
  id: "core.swap-sides", ops: ["swap-sides"], effect: "equivalence", name: () => "swap-sides",
  description: "Write the unknown on the left.", principle: "Equality is symmetric.",
  match: (s) => (eqOf(s).right.kind === "var" && !T.hasVar(eqOf(s).left) ? [{}] : []),
  checks: (s) => [{ name: "the right side is the unknown alone", held: eqOf(s).right.kind === "var" && !T.hasVar(eqOf(s).left), detail: "" }],
  apply: (s) => withEq(s, eqOf(s).right, eqOf(s).left), action: () => "write the unknown on the left",
});

// ---------- K05.2 rules for rational equations ----------
reg({
  id: "core.move-to-left", ops: ["move-to-left"], effect: "equivalence",
  description: "L = R becomes L - R = 0.", principle: "Subtracting the same expression from both sides keeps the solution set (the expression is defined wherever the equation is).",
  match: (s) => (isZeroLit(eqOf(s).right) ? [] : [{}]),
  checks: (s) => [{ name: "the right side is not already 0", held: !isZeroLit(eqOf(s).right), detail: printExpr(eqOf(s).right) }],
  apply: (s) => withEq(s, Expr.sub(eqOf(s).left, eqOf(s).right), Expr.num(0)),
  action: (s) => `subtract ${printExpr(eqOf(s).right)} from both sides`,
});
reg({
  id: "core.combine-terms", ops: ["combine-terms"], effect: "equivalence",
  description: "Combine the terms of one side into a single fraction over their least common denominator (no cancelling).",
  principle: "a/b + c/d = (a*l/b + c*l/d)/l for the least common denominator l; the new denominator's zeros are already zeros of the old ones.",
  match: (s) => (["left", "right"] as const).filter((side) => T.terms(eqOf(s)[side]).length >= 2 && collectDivs(eqOf(s)[side]).length > 0).map((side) => ({ side })),
  checks(s, p) {
    const side = p.side === "right" ? eqOf(s).right : eqOf(s).left; const f = RatFun.fromExpr(side); const tms = T.terms(side).length;
    return [{ name: "the side has at least two terms", held: tms >= 2, detail: `${tms} terms` },
            { name: "a term has x in a denominator", held: collectDivs(side).length > 0, detail: `${collectDivs(side).length} such fractions` },
            { name: "the side is a rational function of x", held: !!f, detail: f ? "yes" : "no" },
            { name: "the combined form differs from the written form", held: !!f && printExpr(ratFunToExpr(f)) !== printExpr(side), detail: "" }];
  },
  apply(s, p) { const side = p.side === "right" ? "right" : "left"; const e = ratFunToExpr(RatFun.fromExpr(eqOf(s)[side])!); return side === "left" ? withEq(s, e, eqOf(s).right) : withEq(s, eqOf(s).left, e); },
  action: (_s, _a, p) => `combine the ${p.side === "right" ? "right" : "left"} side into one fraction`,
});
reg({
  id: "core.cancel-common-factor", ops: ["cancel-common-factor"], effect: "equivalence",
  description: "Cancel the polynomial gcd of numerator and denominator in one fraction.",
  principle: "A common factor f of numerator and denominator can be cancelled everywhere f != 0. Because f divides the denominator, f != 0 is already a restriction, so the restriction stays and nothing is lost or gained.",
  match: (s) => allDivs(s).map((_, index) => ({ index })),
  checks(s, p) {
    const n = allDivs(s)[Number(p.index)]; if (!n || n.kind !== "div") return [{ name: "the fraction exists", held: false, detail: `index ${p.index}` }];
    const pn = Poly.fromExpr(n.left), pd = Poly.fromExpr(n.right);
    if (!pn || !pd) return [{ name: "numerator and denominator are polynomials", held: false, detail: "no" }];
    const g = pn.gcd(pd); const z = zerosIn(g, excludedOf(s));
    return [{ name: "numerator and denominator have a common factor of degree >= 1", held: g.degree >= 1, detail: `gcd degree ${g.degree}` },
            { name: "the common factor's zeros are restricted", held: z.ok, detail: z.detail }];
  },
  apply(s, p) { const n = allDivs(s)[Number(p.index)] as { left: MathExpr; right: MathExpr } & MathExpr; const e = ratFunToExpr(new RatFun(Poly.fromExpr(n.left)!, Poly.fromExpr(n.right)!).reduce()); return withEq(s, replaceNode(eqOf(s).left, n, e), replaceNode(eqOf(s).right, n, e)); },
  action: (s, _a, p) => `cancel the common factor in ${printExpr(allDivs(s)[Number(p.index)])}, keeping its restriction`,
});
const lcdOf = (s: MathState): Poly | null => { const dens = [...denominatorsOf(eqOf(s).left), ...denominatorsOf(eqOf(s).right)].map((d) => Poly.fromExpr(d)); if (!dens.length || dens.some((d) => !d)) return null; let l = Poly.one; for (const d of dens) l = l.lcm(d!); return l; };
reg({
  id: "core.clear-denominators", ops: ["clear-denominators"], effect: "equivalence",
  description: "Multiply both sides by the least common denominator and cancel, leaving a polynomial equation.",
  principle: "Multiplying both sides by an expression that is non-zero on the whole tracked domain keeps the solution set. The least common denominator is non-zero exactly because its zeros are restricted.",
  match: (s) => (noDen(s) ? [] : [{}]),
  checks(s) {
    const lcd = lcdOf(s); if (!lcd) return [{ name: "there is a denominator containing x, and every denominator is a polynomial", held: false, detail: "no" }];
    const z = zerosIn(lcd, excludedOf(s)); const l = RatFun.fromExpr(eqOf(s).left), r = RatFun.fromExpr(eqOf(s).right);
    const mul = (f: RatFun | null) => f && f.mul(RatFun.fromPoly(lcd)).reduce();
    const ml = mul(l), mr = mul(r);
    return [{ name: "the LCD's zeros are restricted (it is non-zero on the domain)", held: z.ok, detail: z.detail },
            { name: "both sides become polynomials after multiplying", held: !!ml && !!mr && ml.d.degree === 0 && mr.d.degree === 0, detail: "" }];
  },
  apply(s) { const lcd = lcdOf(s)!; const f = (e: MathExpr) => polyToExpr(RatFun.fromExpr(e)!.mul(RatFun.fromPoly(lcd)).reduce().n); return withEq(s, f(eqOf(s).left), f(eqOf(s).right)); },
  action: () => "multiply both sides by the least common denominator and cancel",
});
reg({
  id: "core.expand-collect-polynomial", ops: ["expand", "collect-terms"], effect: "equivalence", name: () => "expand-collect-polynomial",
  description: "Write each side of a denominator-free equation of degree >= 2 as an expanded, collected polynomial.",
  principle: "Expanding and collecting terms of a denominator-free expression is an identity between polynomial functions.",
  match(s) { if (!noDen(s)) return []; const { l, r } = polys(s); if (!l || !r || Math.max(l.degree, r.degree) < 2) return []; return printExpr(polyToExpr(l)) !== printExpr(eqOf(s).left) || printExpr(polyToExpr(r)) !== printExpr(eqOf(s).right) ? [{}] : []; },
  checks(s) { const { l, r } = polys(s); return [{ name: "both sides are polynomials (no x in a denominator)", held: !!l && !!r, detail: "" }, { name: "the written form changes", held: !!l && !!r && (printExpr(polyToExpr(l)) !== printExpr(eqOf(s).left) || printExpr(polyToExpr(r)) !== printExpr(eqOf(s).right)), detail: "" }]; },
  apply: (s) => withEq(s, polyToExpr(Poly.fromExpr(eqOf(s).left)!), polyToExpr(Poly.fromExpr(eqOf(s).right)!)),
  action: () => "expand and collect terms on both sides",
});

// ---------- accept a candidate: the precondition IS invariant I4 ----------
reg({
  id: "core.accept-candidate", ops: ["accept-candidate"], effect: "equivalence", name: () => "accept-candidate",
  description: "Bind x = c when c is outside every restriction and satisfies the original equation exactly.",
  principle: "A value is a solution of the problem only if it is allowed by the original domain and makes the ORIGINAL equation true with both sides defined.",
  match: () => [],   // proposed by the goal, never by pattern: a candidate is a claim about the final state
  checks(s, p) {
    const c = parseVal(p.value); const ol = s.expressions.get("original.left"), or = s.expressions.get("original.right");
    const excluded = inSet(c, excludedOf(s)) || inSet(c, origRestr(s)); let detail = "", holds = false;
    if (ol && or) { try { const a = evalAt(ol, c), z = evalAt(or, c); holds = a.eq(z); detail = `original: ${a} vs ${z}`; } catch { detail = `undefined at x = ${c}`; } }
    return [{ name: "the value is not excluded by the original domain", held: !excluded, detail: excluded ? `x = ${c} is a restricted value` : "allowed" },
            { name: "exact substitution into the original equation gives equal, defined sides", held: holds, detail }];
  },
  apply: (s, p) => ({ ...s, bindings: new Map([...s.bindings, ["x", parseVal(p.value)]]) }),
  action: (_s, _a, p) => `accept x = ${p.value} after checking it against the original equation and domain`,
  verify: () => true,
  bookkeeping: (st, p) => ({ candidates: [...st.candidates, { value: parseVal(p.value), fromStep: st.evidence.length + 1, status: "accepted" as const }], obligations: st.obligations.map((o) => (o.closed === undefined ? { ...o, closed: st.evidence.length + 1, by: "core.accept-candidate" } : o)) }),
});
export type { Check };
