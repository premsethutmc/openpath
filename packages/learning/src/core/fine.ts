// Fine-grained operations: one small, local, tree-level rewrite per rule - the vocabulary a solver composes (restrict, move-to-left, combine-terms,
// cancel-common-factor, clear-denominators, expand, collect-terms, add-sub-both-sides, mul-div-const, divide-restricted-factor, accept-candidate).
// They work on the WRITTEN expression (brackets are real nodes, nothing is simplified unless the rule says so), so the order in which they are
// applied matters, which is exactly what the planner has to discover. The coarse rules in rules.ts (K05.1 tidy-ups, K05.2 clear/combine/cancel
// in one step) are macros over the same ideas and are kept because they make the supported-scope solves short.
// Every application is still verified by the independent verifier; nothing here decides what is correct.
import { Rational, Expr, type MathExpr, type MathState } from "../math-kernel.ts";
import { Poly, RatFun, ratFunToExpr } from "../reasoner/domain/poly.ts";
import { printExpr, parseExpr } from "../reasoner/expr-text.ts";
import { hasX, excludedOf, linearFactorExpr } from "../reasoner/domain/domain-state.ts";
import { library } from "./rules.ts";
import type { CoreRule, Params } from "./rule.ts";
import { eqOf } from "./verify.ts";
import * as T from "./tactics.ts";

// ---------- written-expression helpers ----------
export interface Term { sign: 1 | -1; t: MathExpr }
const norm = (sign: 1 | -1, t: MathExpr): Term => {
  for (;;) {
    if (t.kind === "neg") { sign = (sign * -1) as 1 | -1; t = t.operand; continue; }
    if (t.kind === "num" && t.value.lt(Rational.zero)) { sign = (sign * -1) as 1 | -1; t = Expr.num(t.value.neg()); continue; }
    if (t.kind === "div" && t.left.kind === "neg") { sign = (sign * -1) as 1 | -1; t = Expr.div(t.left.operand, t.right); continue; }
    if (t.kind === "div" && t.left.kind === "num" && t.left.value.lt(Rational.zero)) { sign = (sign * -1) as 1 | -1; t = Expr.div(Expr.num(t.left.value.neg()), t.right); continue; }
    if (t.kind === "mul" && t.left.kind === "num" && t.left.value.lt(Rational.zero)) { sign = (sign * -1) as 1 | -1; t = Expr.mul(Expr.num(t.left.value.neg()), t.right); continue; }
    return { sign, t };
  }
};
/** A monomial as a signed term (the sign of the coefficient moves to the term sign). */
const monoT = (sign: 1 | -1, m: Mono): Term => { const r = monoTerm(m); return { sign: (sign * r.sign) as 1 | -1, t: r.t }; };
/** Additive terms of a side. A right operand that is itself a sum is ONE term (a bracket group). */
export function flat(e: MathExpr): Term[] {
  if (e.kind === "add") return [...flat(e.left), norm(1, e.right)];
  if (e.kind === "sub") return [...flat(e.left), norm(-1, e.right)];
  return [norm(1, e)];
}
export function build(ts: Term[]): MathExpr {
  if (!ts.length) return Expr.num(0);
  let acc: MathExpr = ts[0].sign > 0 ? ts[0].t : Expr.neg(ts[0].t);
  for (let i = 1; i < ts.length; i++) acc = ts[i].sign > 0 ? Expr.add(acc, ts[i].t) : Expr.sub(acc, ts[i].t);
  return acc;
}
const isSumNode = (e: MathExpr) => e.kind === "add" || e.kind === "sub";
interface Mono { c: Rational; k: number }
export function mono(e: MathExpr): Mono | null {
  switch (e.kind) {
    case "num": return { c: e.value, k: 0 };
    case "var": return { c: Rational.one, k: 1 };
    case "neg": { const m = mono(e.operand); return m && { c: m.c.neg(), k: m.k }; }
    case "mul": { const a = mono(e.left), b = mono(e.right); return a && b ? { c: a.c.mul(b.c), k: a.k + b.k } : null; }
    case "div": { const a = mono(e.left), b = e.right.kind === "num" && !e.right.value.isZero() ? e.right.value : null; return a && b ? { c: a.c.div(b), k: a.k } : null; }
    case "pow": { if (e.base.kind === "var" && e.exp.kind === "num" && e.exp.value.isInteger() && e.exp.value.numBig >= 0n && e.exp.value.numBig <= 12n) return { c: Rational.one, k: Number(e.exp.value.numBig) }; return null; }
    default: return null;
  }
}
const monoExpr = (m: Mono): MathExpr => { const x: MathExpr | null = m.k === 0 ? null : m.k === 1 ? Expr.var("x") : Expr.pow(Expr.var("x"), Expr.num(m.k)); return x === null ? Expr.num(m.c) : m.c.isOne() ? x : Expr.mul(Expr.num(m.c), x); };
const monoTerm = (m: Mono): Term => (m.c.lt(Rational.zero) ? { sign: -1, t: monoExpr({ c: m.c.neg(), k: m.k }) } : { sign: 1, t: monoExpr(m) });
const withEq = (s: MathState, left: MathExpr, right: MathExpr): MathState => ({ ...s, statements: [{ left, relation: "=", right }, ...s.statements.slice(1)] });
const txt = (e: MathExpr) => printExpr(e);

// ---------- expand ----------
/** Distribute brackets, groups and integer powers of sums into signed terms; products of monomials are evaluated, like terms are NOT merged. */
function expandTerms(sign: 1 | -1, t: MathExpr): Term[] {
  ({ sign, t } = norm(sign, t));
  if (isSumNode(t)) return flat(t).flatMap((x) => expandTerms((sign * x.sign) as 1 | -1, x.t));
  if (t.kind === "mul") {
    const a = expandTerms(1, t.left), b = expandTerms(1, t.right); const out: Term[] = [];
    for (const p of a) for (const q of b) { const m = mono(p.t), n = mono(q.t); const sg = (sign * p.sign * q.sign) as 1 | -1;
      out.push(m && n ? monoT(sg, { c: m.c.mul(n.c), k: m.k + n.k }) : { sign: sg, t: Expr.mul(p.t, q.t) }); }
    return out;
  }
  if (t.kind === "pow" && t.exp.kind === "num" && t.exp.value.isInteger() && t.exp.value.numBig >= 2n && t.exp.value.numBig <= 6n && isSumNode(t.base)) {
    let acc = expandTerms(1, t.base); const base = acc;
    for (let i = 1; i < Number(t.exp.value.numBig); i++) { const nx: Term[] = []; for (const p of acc) for (const q of base) { const m = mono(p.t), n = mono(q.t); nx.push(m && n ? monoT((p.sign * q.sign) as 1 | -1, { c: m.c.mul(n.c), k: m.k + n.k }) : { sign: (p.sign * q.sign) as 1 | -1, t: Expr.mul(p.t, q.t) }); } acc = nx; }
    return acc.map((x) => ({ sign: (sign * x.sign) as 1 | -1, t: x.t }));
  }
  if (t.kind === "div") {
    if (hasX(t.right)) { const num = expandTerms(1, t.left); const n = num.length === 1 && num[0].sign > 0 ? num[0].t : build(num); return [{ sign, t: Expr.div(n, t.right) }]; }
    return expandTerms(1, t.left).map((x) => { const m = mono(x.t); const d = t.right.kind === "num" ? t.right.value : null; return m && d && !d.isZero() ? monoT((sign * x.sign) as 1 | -1, { c: m.c.div(d), k: m.k }) : { sign: (sign * x.sign) as 1 | -1, t: Expr.div(x.t, t.right) }; });
  }
  const m = mono(t); return [m ? monoT(sign, m) : { sign, t }];
}
const expandSide = (e: MathExpr): MathExpr => build(flat(e).flatMap((x) => expandTerms(x.sign, x.t)));

// ---------- collect ----------
function collectSide(e: MathExpr): MathExpr {
  const ts = flat(e); const byK = new Map<number, Rational>(); const others: Term[] = [];
  for (const x of ts) { const m = mono(x.t); if (m) byK.set(m.k, (byK.get(m.k) ?? Rational.zero).add(x.sign > 0 ? m.c : m.c.neg())); else others.push(collectInQuotient(x)); }
  const mon = [...byK.entries()].filter(([, c]) => !c.isZero()).sort((a, b) => b[0] - a[0]).map(([k, c]) => monoTerm({ c, k }));
  const all = [...mon, ...others]; return all.length ? build(all) : Expr.num(0);
}
function collectInQuotient(x: Term): Term {
  if (x.t.kind !== "div" || !hasX(x.t.right)) return x;
  const nts = flat(x.t.left); if (nts.length < 2 || !nts.every((q) => mono(q.t))) return x;
  return { sign: x.sign, t: Expr.div(collectSide(x.t.left), x.t.right) };
}

// ---------- denominators as products of primitive linear factors ----------
interface QView { n: MathExpr; k: Rational; roots: Rational[] }   // term = n / (k * prod (x - r)) with n the written numerator
function quotientView(t: MathExpr): QView | null {
  switch (t.kind) {
    case "div": {
      const a = quotientView(t.left); if (!a) return null;
      if (!hasX(t.right)) return t.right.kind === "num" && !t.right.value.isZero() ? { n: a.n, k: a.k.mul(t.right.value), roots: a.roots } : null;
      if (hasXFraction(t.right)) return null; const p = Poly.fromExpr(t.right); const sp = p?.splitLinear(); if (!p || !sp) return null;
      return { n: a.n, k: a.k.mul(sp.content), roots: [...a.roots, ...sp.roots] };
    }
    case "neg": { const a = quotientView(t.operand); return a && { ...a, n: Expr.neg(a.n) }; }
    case "mul": { const a = quotientView(t.left), b = quotientView(t.right); if (!a || !b) return null; return { n: Expr.mul(a.n, b.n), k: a.k.mul(b.k), roots: [...a.roots, ...b.roots] }; }
    default: return hasXFraction(t) ? null : { n: t, k: Rational.one, roots: [] };
  }
}
const hasXFraction = (e: MathExpr): boolean => { switch (e.kind) { case "div": return hasX(e.right) || hasXFraction(e.left) || hasXFraction(e.right); case "add": case "sub": case "mul": return hasXFraction(e.left) || hasXFraction(e.right); case "neg": return hasXFraction(e.operand); case "pow": return hasXFraction(e.base); default: return false; } };
const key = (r: Rational) => r.toString();
function lcdRoots(views: QView[]): Map<string, { r: Rational; m: number }> {
  const out = new Map<string, { r: Rational; m: number }>();
  for (const v of views) { const cnt = new Map<string, { r: Rational; m: number }>(); for (const r of v.roots) cnt.set(key(r), { r, m: (cnt.get(key(r))?.m ?? 0) + 1 }); for (const [k, c] of cnt) if ((out.get(k)?.m ?? 0) < c.m) out.set(k, c); }
  return out;
}
const prodOf = (fs: MathExpr[]): MathExpr | null => (fs.length ? fs.reduce((a, b) => Expr.mul(a, b)) : null);
function cofactor(lcd: Map<string, { r: Rational; m: number }>, v: QView): MathExpr | null {
  const have = new Map<string, number>(); for (const r of v.roots) have.set(key(r), (have.get(key(r)) ?? 0) + 1);
  const fs: MathExpr[] = []; for (const [k, c] of lcd) for (let i = have.get(k) ?? 0; i < c.m; i++) fs.push(linearFactorExpr(c.r));
  return prodOf(fs);
}
const scaled = (v: QView): MathExpr => (v.k.isOne() ? v.n : Expr.div(v.n, Expr.num(v.k)));
const times = (a: MathExpr, f: MathExpr | null): MathExpr => (f ? Expr.mul(a, f) : a);
const SD = (v: unknown): "left" | "right" => (v === "R" ? "right" : "left");
const sideTerms = (s: MathState, side: "left" | "right") => flat(eqOf(s)[side]);
const xDenTerm = (t: Term) => hasXFraction(t.t);

const R = (r: Omit<CoreRule, "opsOf"> & { ops: string[] | ((p: Params) => string[]) }) => library.register({ ...r, level: "fine" as const, opsOf: typeof r.ops === "function" ? r.ops : () => r.ops as string[] } as CoreRule);
const same = (a: MathExpr, b: MathExpr) => txt(a) === txt(b);

R({
  id: "fine.expand", ops: ["expand"], effect: "equivalence", name: () => "expand",
  description: "Distribute brackets, groups and powers of sums on both sides; evaluate products of monomials; do not merge like terms.",
  principle: "The distributive law is an identity between the two written expressions.",
  match: (s) => { const l = expandSide(eqOf(s).left), r = expandSide(eqOf(s).right); return same(l, eqOf(s).left) && same(r, eqOf(s).right) ? [] : [{}]; },
  checks: (s) => [{ name: "the expansion changes the written form", held: !(same(expandSide(eqOf(s).left), eqOf(s).left) && same(expandSide(eqOf(s).right), eqOf(s).right)), detail: "" }],
  apply: (s) => withEq(s, expandSide(eqOf(s).left), expandSide(eqOf(s).right)), action: () => "distribute all brackets",
});
R({
  id: "fine.collect-terms", ops: ["collect-terms"], effect: "equivalence", name: () => "collect-terms",
  description: "Merge like monomials on each side (also inside quotient numerators that are sums of monomials), highest power first; brackets stay opaque.",
  principle: "Adding like terms is an identity between the two written expressions.",
  match: (s) => (same(collectSide(eqOf(s).left), eqOf(s).left) && same(collectSide(eqOf(s).right), eqOf(s).right) ? [] : [{}]),
  checks: (s) => [{ name: "collecting changes the written form", held: !(same(collectSide(eqOf(s).left), eqOf(s).left) && same(collectSide(eqOf(s).right), eqOf(s).right)), detail: "" }],
  apply: (s) => withEq(s, collectSide(eqOf(s).left), collectSide(eqOf(s).right)), action: () => "collect like terms",
});
/** Candidates for cancelling: additive terms with x in a denominator that are products/quotients - NOT a bracket group (a sum), which would be combine + cancel in one step. */
const divTerms = (s: MathState, side: "left" | "right") => sideTerms(s, side).map((t, i) => ({ t, i })).filter((x) => xDenTerm(x.t) && !isSumNode(x.t.t));
R({
  id: "fine.cancel-common-factor", ops: ["cancel-common-factor"], effect: "equivalence", name: () => "cancel-common-factor",
  description: "Cancel every common polynomial factor between numerator and denominator of one additive term; its restriction stays.",
  principle: "A common factor f of numerator and denominator can be cancelled everywhere f != 0. Because f divides the denominator, f != 0 is already a restriction, so nothing is lost or gained.",
  match: (s) => (["left", "right"] as const).flatMap((side) => divTerms(s, side).map((x) => ({ side: side === "left" ? "L" : "R", idx: x.i }))),
  checks(s, p) {
    const x = sideTerms(s, SD(p.side))[Number(p.idx)]; if (!x) return [{ name: "the term exists", held: false, detail: String(p.index) }];
    if (isSumNode(x.t)) return [{ name: "the term is a product or quotient, not a bracketed sum", held: false, detail: "sum group" }];
    const f = RatFun.fromExpr(x.t); if (!f) return [{ name: "the term is a rational function", held: false, detail: "no" }];
    const g = f.n.gcd(f.d); return [{ name: "numerator and denominator have a common factor of degree >= 1", held: g.degree >= 1, detail: `gcd degree ${g.degree}` }];
  },
  apply(s, p) { const side = SD(p.side); const ts = sideTerms(s, side); const x = ts[Number(p.idx)]; const red = ratFunToExpr(RatFun.fromExpr(x.t)!.reduce());
    const nt = norm(x.sign, red); const out = ts.map((q, i) => (i === Number(p.idx) ? nt : q)); return side === "left" ? withEq(s, build(out), eqOf(s).right) : withEq(s, eqOf(s).left, build(out)); },
  action: (s, _a, p) => `cancel the common factor in ${txt(sideTerms(s, SD(p.side))[Number(p.idx)].t)}`,
});
R({
  id: "fine.combine-terms", ops: ["combine-terms"], effect: "equivalence", name: () => "combine-terms",
  description: "Write one side (at least two terms, one with x in a denominator) as a single quotient over the product of the denominator factors; the numerator is the unexpanded sum of term * cofactor; nothing is cancelled.",
  principle: "a/b + c/d = (a*(l/b) + c*(l/d))/l for a common denominator l whose zeros are the old denominators' zeros.",
  match: (s) => (["left", "right"] as const).filter((side) => { const ts = sideTerms(s, side); return ts.length >= 2 && ts.some(xDenTerm); }).map((side) => ({ side: side === "left" ? "L" : "R" })),
  checks(s, p) { const ts = sideTerms(s, SD(p.side)); const vs = ts.map((t) => quotientView(t.t));
    return [{ name: "the side has at least two terms, one with x in a denominator", held: ts.length >= 2 && ts.some(xDenTerm), detail: `${ts.length} terms` }, { name: "every term is a product or quotient without nested fractions over linear factors", held: vs.every((v) => !!v), detail: "" }]; },
  apply(s, p) {
    const side = SD(p.side); const ts = sideTerms(s, side); const vs = ts.map((t) => quotientView(t.t)!); const lcd = lcdRoots(vs);
    const nums = ts.map((t, i) => ({ sign: t.sign, t: times(scaled(vs[i]), cofactor(lcd, vs[i])) } as Term));
    const den = prodOf([...lcd.values()].map((c) => { const f = linearFactorExpr(c.r); return Array.from({ length: c.m }, () => f); }).flat());
    const q = den ? Expr.div(build(nums), den) : build(nums); return side === "left" ? withEq(s, q, eqOf(s).right) : withEq(s, eqOf(s).left, q);
  },
  action: (_s, _a, p) => `combine the ${p.side === "R" ? "right" : "left"} side into one quotient (numerator not expanded)`,
});
R({
  id: "fine.clear-denominators", ops: ["clear-denominators"], effect: "equivalence", name: () => "clear-denominators",
  description: "Multiply both sides by the product of the denominator factors, term by term; no x is left in a denominator. Brackets and the numerators stay as written.",
  principle: "Multiplying both sides by an expression that is non-zero on the whole tracked domain keeps the solution set; the denominator factors are non-zero exactly because their zeros are restricted.",
  match: (s) => (["left", "right"] as const).some((side) => sideTerms(s, side).some(xDenTerm)) ? [{}] : [],
  checks(s) {
    const all = [...sideTerms(s, "left"), ...sideTerms(s, "right")]; const vs = all.map((t) => quotientView(t.t));
    if (!vs.every((v) => !!v)) return [{ name: "every term is a product or quotient without nested fractions over linear factors", held: false, detail: "no" }];
    const lcd = lcdRoots(vs as QView[]); const ex = excludedOf(s); const missing = [...lcd.values()].filter((c) => !ex.some((u) => u.eq(c.r)));
    return [{ name: "the denominator factors are non-zero on the domain (their zeros are restricted)", held: missing.length === 0, detail: missing.length ? `x = ${missing.map((c) => c.r).join(", ")} not restricted` : "all restricted" }];
  },
  apply(s) {
    const L = flat(eqOf(s).left), Rr = flat(eqOf(s).right); const all = [...L, ...Rr].map((t) => quotientView(t.t)!); const lcd = lcdRoots(all);
    const side = (ts: Term[]) => build(ts.map((t) => { const v = quotientView(t.t)!; return { sign: t.sign, t: times(scaled(v), cofactor(lcd, v)) } as Term; }));
    return withEq(s, side(L), side(Rr));
  },
  action: () => "multiply both sides by the product of the denominator factors",
});
const termLabel = (t: Term) => (t.sign > 0 ? txt(t.t) : `-${isSumNode(t.t) ? `(${txt(t.t)})` : txt(t.t)}`);
const parseTerm = (src: string): Term | null => { try { const e = parseExpr(src); return norm(1, e); } catch { return null; } };
const addTermBoth = (e: MathExpr, add: Term): MathExpr => {
  const ts = flat(e); const j = ts.findIndex((q) => q.sign === -add.sign && same(q.t, add.t));
  if (j >= 0) { const rest = ts.filter((_, i) => i !== j); return rest.length ? build(rest) : Expr.num(0); }
  return build([...ts, add]);
};
R({
  id: "fine.add-sub-both-sides", ops: ["add-sub-both-sides"], effect: "equivalence", name: () => "add-sub-both-sides",
  description: "Add a signed term to both sides; a syntactically equal opposite term on a side is cancelled instead of appended. Discovery proposes the negation of every additive term.",
  principle: "Adding the same quantity to both sides of an equation keeps its solution set (the term is defined wherever the equation is).",
  match(s) { const seen = new Set<string>(); const out: Params[] = [];
    for (const side of ["left", "right"] as const) for (const t of sideTerms(s, side)) { if (T.isNum(t.t) && t.t.value.isZero()) continue; const neg = { sign: (-t.sign) as 1 | -1, t: t.t }; const k = termLabel(neg); if (!seen.has(k)) { seen.add(k); out.push({ term: k }); } }
    return out; },
  checks(s, p) { const t = parseTerm(String(p.term).replace(/^-/, "")); return [{ name: "the term is readable", held: !!t, detail: String(p.term) }]; },
  apply(s, p) { const raw = String(p.term); const sg = raw.startsWith("-") ? -1 : 1; const t0 = parseTerm(raw.replace(/^-/, ""))!; const add = norm(sg as 1 | -1, t0.t);
    return withEq(s, addTermBoth(eqOf(s).left, add), addTermBoth(eqOf(s).right, add)); },
  action: (_s, _a, p) => `${String(p.term).startsWith("-") ? "subtract" : "add"} ${String(p.term).replace(/^-/, "")} ${String(p.term).startsWith("-") ? "from" : "to"} both sides`,
});
const scaleTerm = (t: Term, c: Rational): Term => {
  const m = mono(t.t); const sg = (t.sign * (c.lt(Rational.zero) ? -1 : 1)) as 1 | -1; const ac = c.lt(Rational.zero) ? c.neg() : c;
  if (m) return monoT(t.sign, { c: m.c.mul(c), k: m.k });
  if (t.t.kind === "mul" && t.t.left.kind === "num") return norm(sg, Expr.mul(Expr.num(t.t.left.value.mul(ac)), t.t.right));
  if (t.t.kind === "div" && hasX(t.t.right)) { const n = scaleTerm({ sign: 1, t: t.t.left }, ac); return { sign: sg, t: Expr.div(n.sign > 0 ? n.t : Expr.neg(n.t), t.t.right) }; }
  return { sign: sg, t: ac.isOne() ? t.t : Expr.mul(Expr.num(ac), t.t) };
};
const scaleSide = (e: MathExpr, c: Rational) => { const ts = flat(e); return ts.length === 1 && T.isNum(ts[0].t) && ts[0].t.value.isZero() ? e : build(ts.map((t) => scaleTerm(t, c))); };
const coefOf = (t: Term): Rational | null => { const m = mono(t.t); if (m) return m.c; if (t.t.kind === "mul" && t.t.left.kind === "num") return t.t.left.value; return null; };
R({
  id: "fine.mul-div-const", ops: ["mul-div-const"], effect: "equivalence", name: () => "mul-div-const",
  description: "Multiply both sides by a non-zero constant c (every term's coefficient is multiplied; a bracket group gets a factor). Discovery proposes the reciprocals of the term coefficients, the lcm of their denominators, 1/gcd of the integer coefficients and -1.",
  principle: "Multiplying both sides by a non-zero constant keeps the solution set.",
  match(s) {
    const cs: Rational[] = []; const all = [...sideTerms(s, "left"), ...sideTerms(s, "right")].map(coefOf).filter((c): c is Rational => !!c && !c.isZero());
    for (const c of all) { if (!c.isOne() && !c.neg().isOne()) cs.push(c.inv()); if (c.neg().isOne()) cs.push(new Rational(-1)); }
    let l = 1n; for (const c of all) { const d = c.denBig; l = (l * d) / T.gcd(l, d); } if (l !== 1n) cs.push(new Rational(l));
    const ints = all.filter((c) => c.isInteger()).map((c) => (c.numBig < 0n ? -c.numBig : c.numBig)); if (ints.length > 1) { const g = ints.reduce((a, b) => T.gcd(a, b)); if (g > 1n) cs.push(new Rational(1n, g)); }
    cs.push(new Rational(-1)); const seen = new Set<string>(); return cs.filter((c) => !c.isOne() && !c.isZero() && !seen.has(key(c)) && seen.add(key(c))).map((c) => ({ c: c.toString() }));
  },
  checks: (_s, p) => { const c = Number(String(p.c).split("/")[0]); return [{ name: "the constant is non-zero", held: c !== 0 && !Number.isNaN(c), detail: String(p.c) }]; },
  apply(s, p) { const [a, b] = String(p.c).split("/"); const c = new Rational(BigInt(a), BigInt(b ?? "1")); return withEq(s, scaleSide(eqOf(s).left, c), scaleSide(eqOf(s).right, c)); },
  action: (_s, _a, p) => `multiply both sides by ${p.c}`,
});
const factorsOfProduct = (e: MathExpr): MathExpr[] => (e.kind === "mul" ? [...factorsOfProduct(e.left), ...factorsOfProduct(e.right)] : [e]);
const dropFactor = (e: MathExpr, a: Rational): MathExpr | null => {
  if (e.kind === "num" && e.value.isZero()) return e;
  const num = e.kind === "div" ? e.left : e; const fs = factorsOfProduct(num);
  const i = fs.findIndex((f) => { const p = Poly.fromExpr(f); return !!p && p.degree === 1 && p.eval(a).isZero(); }); if (i < 0) return null;
  const p = Poly.fromExpr(fs[i])!; const rest = fs.filter((_, j) => j !== i); const lead = p.lead();
  let body: MathExpr | null = rest.length ? rest.reduce((x, y) => Expr.mul(x, y)) : null;
  if (!lead.isOne()) body = body ? Expr.mul(Expr.num(lead), body) : Expr.num(lead);
  const nb = body ?? Expr.num(1); return e.kind === "div" ? Expr.div(nb, e.right) : nb;
};
R({
  id: "fine.divide-restricted-factor", ops: ["divide-restricted-factor"], effect: "equivalence", name: () => "divide-restricted-factor",
  description: "Divide both sides by (x - a) where a is a restriction: each side must be 0 or a product with a bracket proportional to (x - a), which is removed.",
  principle: "Dividing by (x - a) is valid where it is not 0; a is restricted, so (x - a) is non-zero on the whole domain.",
  match: (s) => excludedOf(s).filter((a) => dropFactor(eqOf(s).left, a) && dropFactor(eqOf(s).right, a) && !(T.isNum(eqOf(s).left) && T.isNum(eqOf(s).right))).map((a) => ({ a: a.toString() })),
  checks(s, p) { const [n, d] = String(p.a).split("/"); const a = new Rational(BigInt(n), BigInt(d ?? "1")); const known = excludedOf(s).some((u) => u.eq(a));
    return [{ name: "a is a known restriction", held: known, detail: String(p.a) }, { name: "each side is 0 or a product containing a bracket proportional to (x - a)", held: !!dropFactor(eqOf(s).left, a) && !!dropFactor(eqOf(s).right, a), detail: "" }]; },
  apply(s, p) { const [n, d] = String(p.a).split("/"); const a = new Rational(BigInt(n), BigInt(d ?? "1")); return withEq(s, dropFactor(eqOf(s).left, a)!, dropFactor(eqOf(s).right, a)!); },
  action: (_s, _a, p) => `divide both sides by (x - ${p.a})`,
});
export const FINE_OPS = ["restrict", "move-to-left", "combine-terms", "cancel-common-factor", "clear-denominators", "expand", "collect-terms", "add-sub-both-sides", "mul-div-const", "divide-restricted-factor", "accept-candidate"];

R({
  id: "fine.reject-candidate", ops: ["accept-candidate"], effect: "equivalence", name: () => "accept-candidate",
  description: "The state is x = c with c restricted: the candidate is rejected, giving the no-solution state 0 = 1.",
  principle: "A restricted value is not in the domain, so x = c has no solution there; so does 0 = 1.",
  match: (s) => { const e = eqOf(s); const c = e.left.kind === "var" && e.right.kind === "num" ? e.right.value : e.right.kind === "var" && e.left.kind === "num" ? e.left.value : null; return c && excludedOf(s).some((u) => u.eq(c)) ? [{}] : []; },
  checks: (s) => { const e = eqOf(s); const c = e.left.kind === "var" && e.right.kind === "num" ? e.right.value : e.right.kind === "var" && e.left.kind === "num" ? e.left.value : null; return [{ name: "the state is x = c with c a restricted value", held: !!c && excludedOf(s).some((u) => u.eq(c)), detail: c ? String(c) : "" }]; },
  apply: (s) => withEq(s, Expr.num(0), Expr.num(1)), action: () => "reject the restricted candidate",
});
