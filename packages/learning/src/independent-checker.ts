/**
 * E3 independent exact algebra checker (contract openpath-independent-algebra-checker@1).
 *
 * Purpose: judge a student's natural-language algebra working WITHOUT calling math-core, the adapters or M3, so that an
 * acceptance never rests on the reasoner that proposed it. Two independent exact mechanisms are combined:
 *   1. U4 (proof-kernel.ts) verifies the algebraic identity behind each equation step: to-line = multiplier x from-line,
 *      with the multiplier derived by exact polynomial division here and the identity re-derived by the kernel.
 *   2. An exact solution-set engine compares the solution set of every line with the previous line and with the problem.
 *      Solution sets are computed on a partition of the real line at the rational critical points of every expression
 *      (roots and poles); each cell and each critical point is decided by exact bigint-rational arithmetic with a
 *      one-radical extension (x + y*sqrt(r)). If a critical point is irrational or of degree > 2 the checker abstains.
 *
 * Supported scope (recorded in every result): ONE variable; rational-coefficient polynomial / rational-function
 * equations and inequalities; |.| and a single square-root radicand per statement (at most two such nodes); solution-set,
 * interval and "holds for all x" claims; closed numeric statements; expression-equivalence via U4. Everything else is
 * "unsupported" and can never be certified here.
 */
import { createHash } from "node:crypto";
import type { Expr } from "./calculus-core";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { parseNaturalWorking, type NaturalParseResult, type NaturalRelation } from "./natural-working.ts";

export const INDEPENDENT_CHECKER_CONTRACT = "openpath-independent-algebra-checker@1" as const;
export const CHECKER_SCOPE = "single-variable rational-coefficient polynomial/rational equations and inequalities, |.|, one sqrt radicand, finite/interval solution sets, closed numeric statements, expression identity via U4; all critical points rational" as const;
export const CHECKER_LIMITS = { maxDegree: 12, maxCriticalPoints: 64, maxNodes: 600, maxDigits: 80, maxDivisorTrial: 2_000_000 } as const;

let degreeCap: number = CHECKER_LIMITS.maxDegree;
class Unsupported extends Error {}
class Exhausted extends Error {}

/* ------------------------------------------------------------------ exact rationals */
const babs = (x: bigint) => (x < 0n ? -x : x);
const bgcd = (a: bigint, b: bigint): bigint => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a || 1n; };
class Q {
  readonly n: bigint; readonly d: bigint;
  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new Unsupported("division by zero");
    const g = bgcd(n, d), s = d < 0n ? -1n : 1n; this.n = (n / g) * s; this.d = (d / g) * s;
    if (this.n.toString().length > CHECKER_LIMITS.maxDigits || this.d.toString().length > CHECKER_LIMITS.maxDigits) throw new Exhausted("number too large");
  }
  add(o: Q) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Q) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Q) { return new Q(this.n * o.n, this.d * o.d); }
  div(o: Q) { return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  isZero() { return this.n === 0n; }
  sign() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }
  cmp(o: Q) { const x = this.n * o.d - o.n * this.d; return x < 0n ? -1 : x > 0n ? 1 : 0; }
  eq(o: Q) { return this.n === o.n && this.d === o.d; }
  text() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
}
const ZERO = new Q(0n), ONE = new Q(1n);
const q = (n: number | bigint) => new Q(BigInt(n));
function isqrt(n: bigint): bigint { if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))) || 1n; while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }
function sqrtExact(v: Q): Q | null { if (v.n < 0n) return null; const a = isqrt(v.n), b = isqrt(v.d); return a * a === v.n && b * b === v.d ? new Q(a, b) : null; }
function readRat(s: string): Q {
  const m = /^(-?\d+)(?:\/(\d+))?$/.exec(s.trim()); if (m) return new Q(BigInt(m[1]), BigInt(m[2] ?? "1"));
  const dec = /^(-?)(\d+)\.(\d+)$/.exec(s.trim()); if (dec) return new Q(BigInt(dec[1] + dec[2] + dec[3]), 10n ** BigInt(dec[3].length));
  throw new Unsupported(`constant ${s} is not an exact rational`);
}

/* ------------------------------------------------------------------ radical extension  x + y*sqrt(r) */
interface Ext { x: Q; y: Q; r: Q }
const rat = (x: Q): Ext => ({ x, y: ZERO, r: ZERO });
const commonR = (a: Ext, b: Ext): Q => { if (a.y.isZero()) return b.r; if (b.y.isZero() || a.r.eq(b.r)) return a.r; throw new Unsupported("two different radicands"); };
const eAdd = (a: Ext, b: Ext): Ext => ({ x: a.x.add(b.x), y: a.y.add(b.y), r: commonR(a, b) });
const eNeg = (a: Ext): Ext => ({ x: a.x.neg(), y: a.y.neg(), r: a.r });
const eMul = (a: Ext, b: Ext): Ext => { const r = commonR(a, b); return { x: a.x.mul(b.x).add(a.y.mul(b.y).mul(r)), y: a.x.mul(b.y).add(a.y.mul(b.x)), r }; };
function eInv(a: Ext): Ext | null {
  if (a.y.isZero()) return a.x.isZero() ? null : rat(ONE.div(a.x));
  const den = a.x.mul(a.x).sub(a.y.mul(a.y).mul(a.r)); if (den.isZero()) return null;
  return { x: a.x.div(den), y: a.y.neg().div(den), r: a.r };
}
function signExt(a: Ext): number {
  if (a.y.isZero()) return a.x.sign();
  const sx = a.x.sign(), sy = a.y.sign(); if (sx === 0) return sy; if (sx === sy) return sx;
  return a.x.mul(a.x).cmp(a.y.mul(a.y).mul(a.r)) > 0 ? sx : sy;
}
const eZero = (a: Ext) => a.x.isZero() && a.y.isZero();

/* ------------------------------------------------------------------ polynomials and rational functions */
type Poly = Q[];
const trim = (p: Poly): Poly => { const r = [...p]; while (r.length && r[r.length - 1].isZero()) r.pop(); return r; };
const deg = (p: Poly) => trim(p).length - 1;
const padd = (a: Poly, b: Poly): Poly => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? ZERO).add(b[i] ?? ZERO)));
const pscale = (a: Poly, k: Q): Poly => trim(a.map((c) => c.mul(k)));
const pmul = (a: Poly, b: Poly): Poly => {
  if (!a.length || !b.length) return [];
  if (a.length + b.length - 1 > degreeCap + 1) throw new Exhausted("polynomial degree limit");
  const r: Q[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] = r[i + j].add(a[i].mul(b[j]));
  return trim(r);
};
const pEval = (p: Poly, v: Q): Q => p.reduceRight((acc, c) => acc.mul(v).add(c), ZERO);
function pDivmod(a: Poly, b: Poly): { quo: Poly; rem: Poly } {
  b = trim(b); if (!b.length) throw new Unsupported("division by the zero polynomial");
  let r = trim(a); const quo: Q[] = Array.from({ length: Math.max(0, r.length - b.length + 1) }, () => ZERO);
  while (r.length >= b.length && r.length) {
    const k = r[r.length - 1].div(b[b.length - 1]), s = r.length - b.length; quo[s] = k;
    r = trim(r.map((c, i) => (i >= s ? c.sub(k.mul(b[i - s])) : c)));
  }
  return { quo: trim(quo), rem: r };
}
interface RF { n: Poly; d: Poly }
const rfConst = (c: Q): RF => ({ n: c.isZero() ? [] : [c], d: [ONE] });
const rfAdd = (a: RF, b: RF): RF => ({ n: padd(pmul(a.n, b.d), pmul(b.n, a.d)), d: pmul(a.d, b.d) });
const rfMul = (a: RF, b: RF): RF => ({ n: pmul(a.n, b.n), d: pmul(a.d, b.d) });
const rfNeg = (a: RF): RF => ({ n: pscale(a.n, q(-1)), d: a.d });
const rfIsZero = (a: RF) => trim(a.n).length === 0;
const rfInv = (a: RF): RF => { if (rfIsZero(a)) throw new Unsupported("reciprocal of zero"); return { n: a.d, d: a.n }; };
const rfEq = (a: RF, b: RF) => trim(padd(pmul(a.n, b.d), pscale(pmul(b.n, a.d), q(-1)))).length === 0;

/* ------------------------------------------------------------------ rational roots (rational-root theorem, exact division) */
function divisors(n: bigint): bigint[] {
  n = babs(n); if (n === 0n) return [1n];
  const out: bigint[] = []; let trials = 0;
  for (let i = 1n; i * i <= n; i++) { if (++trials > CHECKER_LIMITS.maxDivisorTrial) throw new Exhausted("divisor search limit"); if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); } }
  return out;
}
function rationalRoots(p0: Poly): { roots: Q[]; complete: boolean } {
  let p = trim(p0); const roots: Q[] = []; const add = (r: Q) => { if (!roots.some((x) => x.eq(r))) roots.push(r); };
  if (!p.length) return { roots, complete: true };
  while (p.length > 1 && p[0].isZero()) { add(ZERO); p = p.slice(1); }
  for (;;) {
    if (deg(p) <= 0) return { roots, complete: true };
    if (deg(p) === 1) { add(p[0].neg().div(p[1])); return { roots, complete: true }; }
    let lcm = 1n; for (const c of p) lcm = (lcm / bgcd(lcm, c.d)) * c.d;
    const ints = p.map((c) => c.n * (lcm / c.d));
    let found: Q | null = null;
    outer: for (const a of divisors(ints[0])) for (const b of divisors(ints[ints.length - 1])) for (const s of [1n, -1n]) { const r = new Q(s * a, b); if (pEval(p, r).isZero()) { found = r; break outer; } }
    if (!found) break;
    add(found); p = pDivmod(p, [found.neg(), ONE]).quo;
  }
  if (deg(p) === 2) {
    const disc = p[1].mul(p[1]).sub(q(4).mul(p[2]).mul(p[0]));
    if (disc.sign() < 0) return { roots, complete: true };
    const s = sqrtExact(disc); if (s) { const two = q(2).mul(p[2]); add(p[1].neg().add(s).div(two)); add(p[1].neg().sub(s).div(two)); return { roots, complete: true }; }
  }
  return { roots, complete: false };
}

/* ------------------------------------------------------------------ expression tooling */
function nodeCount(e: Expr, budget = { n: 0 }): number {
  if (++budget.n > CHECKER_LIMITS.maxNodes) throw new Exhausted("expression too large");
  if (e.kind === "add") e.terms.forEach((t) => nodeCount(t, budget)); else if (e.kind === "multiply") e.factors.forEach((t) => nodeCount(t, budget));
  else if (e.kind === "power") nodeCount(e.base, budget); else if (e.kind === "abs") nodeCount(e.argument, budget); else if (e.kind === "root") nodeCount(e.radicand, budget);
  return budget.n;
}
function variablesOf(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.kind) {
    case "variable": out.add(e.name); break;
    case "add": e.terms.forEach((t) => variablesOf(t, out)); break;
    case "multiply": e.factors.forEach((t) => variablesOf(t, out)); break;
    case "power": variablesOf(e.base, out); break;
    case "abs": variablesOf(e.argument, out); break;
    case "root": variablesOf(e.radicand, out); break;
    case "constant": break;
    default: throw new Unsupported(`${e.kind} is outside the checker scope`);
  }
  return out;
}
function specials(e: Expr, abs = new Map<string, Expr>(), roots = new Map<string, Expr>()) {
  switch (e.kind) {
    case "abs": abs.set(JSON.stringify(e.argument), e.argument); specials(e.argument, abs, roots); break;
    case "root": if (e.index !== 2) throw new Unsupported("only square roots are supported"); roots.set(JSON.stringify(e.radicand), e.radicand); specials(e.radicand, abs, roots); break;
    case "add": e.terms.forEach((t) => specials(t, abs, roots)); break;
    case "multiply": e.factors.forEach((t) => specials(t, abs, roots)); break;
    case "power": specials(e.base, abs, roots); break;
    default: break;
  }
  return { abs, roots };
}
const sumExpr = (l: Expr, r: Expr): Expr => ({ kind: "add", terms: [l, { kind: "multiply", factors: [{ kind: "constant", value: "-1" }, r] }] });

/** Exact evaluation at a rational point; null = undefined there (pole, negative radicand). */
function evalAt(e: Expr, v: Q, name: string): Ext | null {
  switch (e.kind) {
    case "constant": return rat(readRat(e.value));
    case "variable": if (e.name !== name) throw new Unsupported("second variable"); return rat(v);
    case "add": { let acc = rat(ZERO); for (const t of e.terms) { const z = evalAt(t, v, name); if (!z) return null; acc = eAdd(acc, z); } return acc; }
    case "multiply": { let acc = rat(ONE); for (const t of e.factors) { const z = evalAt(t, v, name); if (!z) return null; acc = eMul(acc, z); } return acc; }
    case "power": {
      if (!Number.isInteger(e.exponent) || Math.abs(e.exponent) > 12) throw new Unsupported("non-integer or large exponent");
      let b = evalAt(e.base, v, name); if (!b) return null; if (e.exponent < 0) { b = eInv(b); if (!b) return null; }
      let acc = rat(ONE); for (let i = 0; i < Math.abs(e.exponent); i++) acc = eMul(acc, b); return acc;
    }
    case "abs": { const z = evalAt(e.argument, v, name); if (!z) return null; return signExt(z) < 0 ? eNeg(z) : z; }
    case "root": {
      const z = evalAt(e.radicand, v, name); if (!z) return null; if (!z.y.isZero()) throw new Unsupported("nested radicals");
      if (z.x.sign() < 0) return null; const s = sqrtExact(z.x); return s ? rat(s) : { x: ZERO, y: ONE, r: z.x };
    }
    default: throw new Unsupported(`${e.kind} is outside the checker scope`);
  }
}

/* ------- symbolic rational functions (used only to find critical points; truth is always decided by evalAt) */
interface XRF { u: RF; v: RF }
interface SymCtx { name: string; A: RF | null; sigma: Map<string, 1 | -1> }
function toRF(e: Expr, c: SymCtx): XRF {
  switch (e.kind) {
    case "constant": return { u: rfConst(readRat(e.value)), v: rfConst(ZERO) };
    case "variable": if (e.name !== c.name) throw new Unsupported("second variable"); return { u: { n: [ZERO, ONE], d: [ONE] }, v: rfConst(ZERO) };
    case "add": return e.terms.map((t) => toRF(t, c)).reduce((a, b) => ({ u: rfAdd(a.u, b.u), v: rfAdd(a.v, b.v) }), { u: rfConst(ZERO), v: rfConst(ZERO) });
    case "multiply": return e.factors.map((t) => toRF(t, c)).reduce((a, b) => {
      if (!rfIsZero(a.v) && !rfIsZero(b.v) && !c.A) throw new Unsupported("radical without radicand");
      const vv = !rfIsZero(a.v) && !rfIsZero(b.v) ? rfMul(rfMul(a.v, b.v), c.A!) : rfConst(ZERO);
      return { u: rfAdd(rfMul(a.u, b.u), vv), v: rfAdd(rfMul(a.u, b.v), rfMul(a.v, b.u)) };
    }, { u: rfConst(ONE), v: rfConst(ZERO) });
    case "power": {
      if (!Number.isInteger(e.exponent) || Math.abs(e.exponent) > degreeCap) throw new Unsupported("non-integer or large exponent");
      let b = toRF(e.base, c);
      if (e.exponent < 0) { if (!rfIsZero(b.v)) throw new Unsupported("division by a radical"); b = { u: rfInv(b.u), v: rfConst(ZERO) }; }
      let acc: XRF = { u: rfConst(ONE), v: rfConst(ZERO) };
      for (let i = 0; i < Math.abs(e.exponent); i++) acc = { u: rfAdd(rfMul(acc.u, b.u), !rfIsZero(acc.v) && !rfIsZero(b.v) ? rfMul(rfMul(acc.v, b.v), c.A!) : rfConst(ZERO)), v: rfAdd(rfMul(acc.u, b.v), rfMul(acc.v, b.u)) };
      return acc;
    }
    case "abs": { const a = toRF(e.argument, c); if (!rfIsZero(a.v)) throw new Unsupported("absolute value of a radical"); const s = c.sigma.get(JSON.stringify(e.argument)) ?? 1; return { u: s === 1 ? a.u : rfNeg(a.u), v: rfConst(ZERO) }; }
    case "root": {
      const a = toRF(e.radicand, c); if (!rfIsZero(a.v)) throw new Unsupported("nested radicals");
      if (c.A && !rfEq(c.A, a.u)) throw new Unsupported("two different radicands"); c.A = a.u; return { u: rfConst(ZERO), v: rfConst(ONE) };
    }
    default: throw new Unsupported(`${e.kind} is outside the checker scope`);
  }
}
/** Rational critical points of an atom L ? R: roots and poles of every symbolic piece, over every sign pattern of the absolute values. */
function criticalPoints(exprs: Expr[], name: string): Q[] {
  const absKeys = new Map<string, Expr>(), rootKeys = new Map<string, Expr>();
  exprs.forEach((e) => specials(e, absKeys, rootKeys));
  if (absKeys.size + rootKeys.size > 2 || rootKeys.size > 1) throw new Unsupported("more than two absolute-value/root nodes");
  const keys = [...absKeys.keys()], polys: Poly[] = [];
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const sigma = new Map<string, 1 | -1>(keys.map((k, i) => [k, (mask >> i) & 1 ? -1 : 1] as [string, 1 | -1]));
    const ctx: SymCtx = { name, A: null, sigma };
    const parts = exprs.map((e) => toRF(e, ctx));
    const push = (r: RF) => { polys.push(r.n, r.d); };
    if (exprs.length === 2) {
      const diff = { u: rfAdd(parts[0].u, rfNeg(parts[1].u)), v: rfAdd(parts[0].v, rfNeg(parts[1].v)) };
      push(diff.u); push(diff.v);
      if (ctx.A) { push(ctx.A); const z = rfAdd(rfMul(diff.u, diff.u), rfNeg(rfMul(rfMul(diff.v, diff.v), ctx.A))); push(z); }
    }
  }
  for (const a of absKeys.values()) { const ctx: SymCtx = { name, A: null, sigma: new Map() }; try { const r = toRF(a, ctx); polys.push(r.u.n, r.u.d); } catch (e) { if (!(e instanceof Unsupported)) throw e; } }
  const pts: Q[] = [];
  for (const p of polys) {
    const tp = trim(p); if (!tp.length || deg(tp) > CHECKER_LIMITS.maxDegree) { if (tp.length) throw new Exhausted("polynomial degree limit"); continue; }
    const { roots, complete } = rationalRoots(tp); if (!complete) throw new Unsupported("an irrational or high-degree critical point");
    for (const r of roots) if (!pts.some((x) => x.eq(r))) pts.push(r);
  }
  if (pts.length > CHECKER_LIMITS.maxCriticalPoints) throw new Exhausted("too many critical points");
  return pts;
}

/* ------------------------------------------------------------------ statements and solution sets */
type Op = "=" | "<" | "<=" | ">" | ">=" | "!=";
interface Stmt {
  kind: "atom" | "set" | "interval" | "all" | "closed";
  text: string; critical: Q[]; holds: (v: Q) => boolean; defined: (v: Q) => boolean;
  atom?: { left: Expr; right: Expr; op: Op };
}
const cmpHolds = (s: number, op: Op) => op === "=" ? s === 0 : op === "!=" ? s !== 0 : op === "<" ? s < 0 : op === "<=" ? s <= 0 : op === ">" ? s > 0 : s >= 0;
function constantValue(e: Expr): Q { const z = evalAt(e, ZERO, "\u0000"); if (!z || !z.y.isZero()) throw new Unsupported("solution value is not an exact rational"); return z.x; }
function atomStmt(op: Op, left: Expr, right: Expr, name: string | null, text: string): Stmt {
  nodeCount(left); nodeCount(right);
  const vn = name ?? "\u0000";
  const critical = name ? criticalPoints([left, right], name) : [];
  const diff = (v: Q) => { const l = evalAt(left, v, vn), r = evalAt(right, v, vn); return l && r ? eAdd(l, eNeg(r)) : null; };
  return { kind: name ? "atom" : "closed", text, critical, atom: { left, right, op },
    holds: (v) => { const d = diff(v); return d ? cmpHolds(signExt(d), op) : false; }, defined: (v) => diff(v) !== null };
}
function stmtFromRelation(rel: NaturalRelation, name: string | null, text: string): Stmt {
  if (rel.kind === "equation") return atomStmt("=", rel.left, rel.right, name, text);
  if (rel.kind === "inequality") return atomStmt(rel.operator, rel.left, rel.right, name, text);
  if (rel.kind === "solution-set") {
    if (name !== null && rel.variable !== name) throw new Unsupported("solution set for a different variable");
    const vals = rel.values.map(constantValue);
    return { kind: "set", text, critical: vals, holds: (v) => vals.some((x) => x.eq(v)), defined: () => true };
  }
  if (rel.kind === "interval") {
    const lo = rel.lower ? constantValue(rel.lower) : null, hi = rel.upper ? constantValue(rel.upper) : null;
    return { kind: "interval", text, critical: [lo, hi].filter((x): x is Q => !!x),
      holds: (v) => (lo === null || (rel.includeLower ? v.cmp(lo) >= 0 : v.cmp(lo) > 0)) && (hi === null || (rel.includeUpper ? v.cmp(hi) <= 0 : v.cmp(hi) < 0)), defined: () => true };
  }
  throw new Unsupported(`${rel.kind} lines are outside the checker scope`);
}
interface Profile { points: Q[]; gaps: Q[]; membership: Map<Stmt, { gap: boolean[]; pt: boolean[] }>; undefinedAt: (s: Stmt) => boolean[] }
function profile(stmts: Stmt[]): Profile {
  const points: Q[] = []; for (const s of stmts) for (const c of s.critical) if (!points.some((x) => x.eq(c))) points.push(c);
  points.sort((a, b) => a.cmp(b)); if (points.length > CHECKER_LIMITS.maxCriticalPoints) throw new Exhausted("too many critical points");
  const two = q(2), gaps: Q[] = points.length ? [points[0].sub(ONE), ...points.slice(1).map((p, i) => points[i].add(p).div(two)), points[points.length - 1].add(ONE)] : [ZERO];
  const membership = new Map<Stmt, { gap: boolean[]; pt: boolean[] }>();
  for (const s of stmts) membership.set(s, { gap: gaps.map((g) => s.holds(g)), pt: points.map((p) => s.holds(p)) });
  return { points, gaps, membership, undefinedAt: (s) => points.map((p) => !s.defined(p)) };
}
type SetRelation = "equal" | "subset" | "superset" | "incomparable";
function relate(p: Profile, a: Stmt, b: Stmt): SetRelation {
  const A = p.membership.get(a)!, B = p.membership.get(b)!; let sub = true, sup = true;
  for (const [x, y] of [...A.gap.map((v, i) => [v, B.gap[i]]), ...A.pt.map((v, i) => [v, B.pt[i]])] as [boolean, boolean][]) { if (x && !y) sub = false; if (y && !x) sup = false; }
  return sub && sup ? "equal" : sub ? "subset" : sup ? "superset" : "incomparable";
}
function describe(p: Profile, s: Stmt): string {
  const m = p.membership.get(s)!, P = p.points, n = P.length;
  if (!n) return m.gap[0] ? "all real numbers" : "no real solutions";
  if (m.gap.every((x) => !x)) { const pts = P.filter((_, i) => m.pt[i]).map((x) => x.text()); return pts.length ? `{${pts.join(", ")}}` : "no real solutions"; }
  if (m.gap.every((x) => x)) { const out = P.filter((_, i) => !m.pt[i]).map((x) => x.text()); return out.length ? `all real numbers except {${out.join(", ")}}` : "all real numbers"; }
  // cells alternate gap0, pt0, gap1, pt1, ..., gapN; merge maximal runs of included cells
  const cells: { gap: boolean; idx: number; on: boolean }[] = [];
  for (let i = 0; i <= n; i++) { cells.push({ gap: true, idx: i, on: m.gap[i] }); if (i < n) cells.push({ gap: false, idx: i, on: m.pt[i] }); }
  const parts: string[] = []; let k = 0;
  while (k < cells.length) {
    if (!cells[k].on) { k++; continue; }
    let e = k; while (e + 1 < cells.length && cells[e + 1].on) e++;
    const first = cells[k], last = cells[e];
    if (k === e && !first.gap) parts.push(`{${P[first.idx].text()}}`);
    else {
      const lo = first.gap ? (first.idx === 0 ? null : P[first.idx - 1]) : P[first.idx], loClosed = !first.gap;
      const hi = last.gap ? (last.idx === n ? null : P[last.idx]) : P[last.idx], hiClosed = !last.gap;
      parts.push(`${lo && loClosed ? "[" : "("}${lo ? lo.text() : "-inf"}, ${hi ? hi.text() : "inf"}${hi && hiClosed ? "]" : ")"}`);
    }
    k = e + 1;
  }
  return parts.join(" U ") || "no real solutions";
}

/* ------------------------------------------------------------------ U4 evidence for equation steps */
export interface U4Evidence { outcome: "verified" | "rejected" | "unsupported" | "not-applicable"; multiplier: string | null; direction: "equal" | "to-is-multiple-of-from" | "from-is-multiple-of-to" | null; restrictions: string[]; rules: string[]; digest: string | null }
function polyExpr(p: Poly, name: string): Expr {
  const terms: Expr[] = trim(p).map((c, i) => {
    const k: Expr = { kind: "constant", value: c.text() };
    return i === 0 ? k : { kind: "multiply", factors: [k, i === 1 ? { kind: "variable", name } : { kind: "power", base: { kind: "variable", name }, exponent: i }] } as Expr;
  });
  return terms.length ? (terms.length === 1 ? terms[0] : { kind: "add", terms }) : { kind: "constant", value: "0" };
}
/** Independent exact identity of two POLYNOMIAL expressions of any degree up to 200 (fallback when the U4 kernel's exponent budget is exceeded). */
function polynomialIdentity(before: Expr, after: Expr): boolean | null {
  const old = degreeCap; degreeCap = 200;
  try {
    const names = new Set<string>(); variablesOf(before, names); variablesOf(after, names); if (names.size > 1) return null;
    const name = [...names][0] ?? "x", a = rfOfPure(before, name), b = rfOfPure(after, name);
    if (!a || !b || deg(a.d) > 0 || deg(b.d) > 0) return null;
    return rfEq(a, b);
  } catch (e) { if (e instanceof Exhausted || e instanceof Unsupported) return null; throw e; } finally { degreeCap = old; }
}
export function certify(before: Expr, after: Expr): { outcome: "verified" | "rejected" | "unsupported"; restrictions: string[]; rules: string[]; digest: string; via?: "independent-polynomial-identity" } {
  const make = (restrictions: string[]): KernelCertificate => {
    const body = { strategy: "rational-normal-form", sourceCanonical: JSON.stringify(before), targetCanonical: JSON.stringify(after), rules: [] as string[], assumptions: [], restrictions, obligations: [] as string[] };
    return { ...body, replayDigest: createHash("sha256").update(JSON.stringify(body)).digest("hex") } as KernelCertificate;
  };
  let cert = make([]), res = checkSymbolicCertificate(cert, before, after, [], []);
  if (res.outcome === "unsupported" && res.obligations.length) { cert = make(res.obligations); res = checkSymbolicCertificate(cert, before, after, [], res.obligations); }
  if (res.outcome === "unsupported") {
    const id = polynomialIdentity(before, after);
    if (id !== null) return { outcome: id ? "verified" : "rejected", restrictions: [], rules: ["independent-polynomial-identity"], digest: createHash("sha256").update(JSON.stringify([before, after])).digest("hex"), via: "independent-polynomial-identity" };
  }
  return { outcome: res.outcome, restrictions: cert.restrictions, rules: res.checkedRules, digest: cert.replayDigest };
}
function rfOfPure(e: Expr, name: string): RF | null { try { const x = toRF(e, { name, A: null, sigma: new Map() }); return rfIsZero(x.v) ? x.u : null; } catch (err) { if (err instanceof Unsupported) return null; throw err; } }
const ORDER_OPS = ["<", "<=", ">", ">="];
const REVERSED: Record<string, string> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };
/** U4 evidence for one step: an exact identity between the difference polynomials (equation / inequality steps) or a zero-product identity (equation -> solution list). */
export function u4StepEvidence(from: Stmt, to: Stmt, name: string): U4Evidence {
  const none: U4Evidence = { outcome: "not-applicable", multiplier: null, direction: null, restrictions: [], rules: [], digest: null };
  if (!from.atom) return none;
  const pf = sumExpr(from.atom.left, from.atom.right);
  for (const e of [pf]) { const sp = specials(e); if (sp.abs.size || sp.roots.size) return none; }
  const a = rfOfPure(pf, name); if (!a || rfIsZero(a)) return none;
  const tryDir = (num: Poly, den: Poly): Poly | null => { try { const { quo, rem } = pDivmod(num, den); return rem.length ? null : quo; } catch { return null; } };
  const run = (before: Expr, after: Expr, multiplier: Poly, direction: U4Evidence["direction"]): U4Evidence => {
    const c = certify(before, after); return { outcome: c.outcome, multiplier: trim(multiplier).map((k) => k.text()).join(","), direction, restrictions: c.restrictions, rules: c.rules, digest: c.digest };
  };
  // equation -> "x = r1 or x = r2 ...": the product of the roots' factors is a constant multiple of the equation's polynomial
  if (to.kind === "set" && from.atom.op === "=" && deg(a.d) === 0) {
    const roots = to.critical; let prod: Poly = [ONE]; for (const r of roots) prod = pmul(prod, [r.neg(), ONE]);
    const h0 = tryDir(a.n, prod), h = h0 && deg(h0) === 0 ? [h0[0].div(a.d[0])] : null; // pf = (a.n / a.d), a.d is a nonzero constant here
    if (h && roots.length > 0) return run(pf, { kind: "multiply", factors: [polyExpr(h, name), polyExpr(prod, name)] } as Expr, h, "equal");
    return none;
  }
  if (!to.atom) return none;
  const pt = sumExpr(to.atom.left, to.atom.right); { const sp = specials(pt); if (sp.abs.size || sp.roots.size) return none; }
  const b = rfOfPure(pt, name); if (!b || rfIsZero(b)) return none;
  const eq = from.atom.op === "=" && to.atom.op === "=";
  const ord = ORDER_OPS.includes(from.atom.op) && ORDER_OPS.includes(to.atom.op);
  if (!eq && !ord) return none;
  // to = h * from  (h = (n_to d_from) / (d_to n_from))  and  from = h' * to
  const h1 = tryDir(pmul(b.n, a.d), pmul(b.d, a.n)), h2 = eq ? tryDir(pmul(a.n, b.d), pmul(a.d, b.n)) : null;
  if (ord) {
    // an inequality step is order-consistent only for a CONSTANT multiplier: positive keeps the operator, negative must reverse it
    if (!h1 || deg(h1) !== 0 || !(deg(a.d) === 0 && deg(b.d) === 0)) return { ...none, outcome: "unsupported" };
    const positive = h1[0].sign() > 0, consistent = positive ? from.atom.op === to.atom.op : REVERSED[from.atom.op] === to.atom.op;
    if (!consistent) return { ...none, outcome: "unsupported" };
    return run(pt, { kind: "multiply", factors: [polyExpr(h1, name), pf] } as Expr, h1, "equal");
  }
  const pick = h1 && h2 && deg(h1) === 0 ? { dir: "equal" as const, h: h1, before: pt, after: { kind: "multiply", factors: [polyExpr(h1, name), pf] } as Expr }
    : h1 ? { dir: "to-is-multiple-of-from" as const, h: h1, before: pt, after: { kind: "multiply", factors: [polyExpr(h1, name), pf] } as Expr }
      : h2 ? { dir: "from-is-multiple-of-to" as const, h: h2, before: pf, after: { kind: "multiply", factors: [polyExpr(h2, name), pt] } as Expr } : null;
  if (!pick) return { ...none, outcome: "unsupported" };
  return run(pick.before, pick.after, pick.h, pick.dir);
}

/* ------------------------------------------------------------------ line classification helpers */
const COMPLETENESS_CLAIM = /\b(?:the\s+)?(?:complete|full|entire|whole)\s+(?:solution|answer|set)\b|\bthis is (?:the )?(?:only|whole|entire|complete)\b|\ball (?:the )?solutions\b|\bthe only solution\b/i;
const UNIVERSAL_CLAIM = /\b(?:holds|true|valid)\s+for\s+(?:all|every|any)\b|\bfor\s+(?:all|every|any)\s+(?:real\s+)?(?:x|values?|numbers?)\b|\bis an identity\b|\bidentity\b/i;
export type CheckerStatus = "verified-valid" | "verified-invalid" | "incomplete" | "unsupported" | "inconclusive" | "resource-exhausted";
export interface CheckedLine {
  index: number; status: CheckerStatus; relation: "equivalent" | "narrowing" | "widening" | "incomparable" | "independent-true" | "independent-false" | "completeness-claim" | "universal-claim" | "unsupported" | "inconclusive" | "numeric-equal" | "numeric-different";
  detail: string; solutionSet: string | null; evidence: { checker: "u4+exact-solution-set" | "exact-solution-set" | "exact-arithmetic" | "u4-identity"; u4: U4Evidence | null } | null;
}
export interface AlgebraCheck {
  contract: typeof INDEPENDENT_CHECKER_CONTRACT; scope: string; mode: "solution-set" | "numeric-value" | "expression-identity" | "none";
  outcome: "verified" | "invalid" | "incomplete" | "missing-assumption" | "unsupported" | "resource-exhausted";
  /** "checker": the checker decides completeness; "native": it only vouches for step equivalence (expression problems) */
  completenessAuthority: "checker" | "native"; firstInvalidStep: number | null; lines: CheckedLine[];
  problemSolutionSet: string | null; finalSolutionSet: string | null; restrictions: string[]; obligations: string[]; justification: string;
  u4Steps: number; exactSteps: number;
}
const empty = (outcome: AlgebraCheck["outcome"], why: string, mode: AlgebraCheck["mode"] = "none"): AlgebraCheck => ({ contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode, outcome, completenessAuthority: "checker", firstInvalidStep: null, lines: [], problemSolutionSet: null, finalSolutionSet: null, restrictions: [], obligations: [why], justification: why, u4Steps: 0, exactSteps: 0 });
function relationVars(r: NaturalRelation, set: Set<string>) {
  if (r.kind === "equation" || r.kind === "inequality") { variablesOf(r.left, set); variablesOf(r.right, set); }
  else if (r.kind === "expression") variablesOf(r.expression, set);
  else if (r.kind === "solution-set") set.add(r.variable); else if (r.kind === "interval" && r.variable) set.add(r.variable);
}
const isIsolatedConstant = (e: Expr) => { try { variablesOf(e); return variablesOf(e).size === 0; } catch { return false; } };
function isSolvedForm(rel: NaturalRelation, name: string): boolean {
  if (rel.kind === "solution-set" || rel.kind === "interval") return true;
  if (rel.kind === "equation" || rel.kind === "inequality") {
    const bare = (e: Expr) => e.kind === "variable" && e.name === name;
    return (bare(rel.left) && isIsolatedConstant(rel.right)) || (bare(rel.right) && isIsolatedConstant(rel.left));
  }
  return false;
}
const isProseExpression = (rel: NaturalRelation): boolean => {
  if (rel.kind !== "expression") return false;
  const names = new Set<string>(); try { variablesOf(rel.expression, names); } catch { return false; }
  return [...names].some((n) => n.length > 1);
};

/* ------------------------------------------------------------------ the checker */
export function checkAlgebraSubmission(statement: string, parsed: NaturalParseResult): AlgebraCheck {
  try { return run(statement, parsed); }
  catch (e) {
    if (e instanceof Exhausted) return { ...empty("resource-exhausted", `independent checker resource limit: ${e.message}`) };
    if (e instanceof Unsupported) return empty("unsupported", `outside the independent checker scope: ${e.message}`);
    throw e;
  }
}
function run(statement: string, parsed: NaturalParseResult): AlgebraCheck {
  if (parsed.classification !== "parsed" || !parsed.lines.length) return empty("unsupported", "the working could not be parsed");
  const ps = parseNaturalWorking({ format: "natural", text: statement });
  if (ps.classification !== "parsed" || ps.lines.length !== 1) return empty("unsupported", "the problem statement is not a single parseable mathematical statement");
  const rel0 = ps.lines[0].relation, lines = parsed.lines;
  const names = new Set<string>(); relationVars(rel0, names); const classOf: string[] = lines.map((l) => (isProseExpression(l.relation) ? "prose" : "math"));
  lines.forEach((l, i) => { if (classOf[i] === "math") { try { relationVars(l.relation, names); } catch (e) { if (!(e instanceof Unsupported)) throw e; classOf[i] = "bad"; } } });
  if (names.size > 1) throw new Unsupported("more than one variable");
  const name = names.size ? [...names][0] : null;
  if (rel0.kind === "expression") return name === null ? numericMode(rel0.expression, parsed, classOf) : identityMode(rel0.expression, parsed, name, classOf);
  if (rel0.kind === "equation" || rel0.kind === "inequality") return solutionMode(rel0, parsed, name, classOf);
  throw new Unsupported(`${rel0.kind} problems are outside the checker scope`);
}

function solutionMode(rel0: NaturalRelation, parsed: NaturalParseResult, name: string | null, classOf: string[]): AlgebraCheck {
  if (name === null) throw new Unsupported("the problem statement has no variable");
  const stmt0 = stmtFromRelation(rel0, name, "problem"), lines = parsed.lines;
  const out: CheckedLine[] = []; const chain: { stmt: Stmt; index: number; rel: NaturalRelation }[] = [];
  let prev = stmt0, prevRel: SetRelation | null = null; void prevRel;
  let unresolved: number | null = null, firstInvalid: number | null = null, narrowing = -1, widening = -1, falseCompleteness: number | null = null, missingAssumptionAt: number | null = null;
  const obligations: string[] = []; let u4Steps = 0, exactSteps = 0;
  const stmts: Stmt[] = [stmt0]; const pending: { index: number; stmt: Stmt; from: Stmt; kind: "chain" }[] = [];
  const text = (i: number) => lines[i].source.text;
  // build statements first (profile needs all critical points)
  const built: (Stmt | { claim: "completeness" | "universal" } | { error: string } | { closed: boolean | null })[] = lines.map((l, i) => {
    if (COMPLETENESS_CLAIM.test(text(i)) && (classOf[i] === "prose" || l.relation.kind === "expression")) return { claim: "completeness" as const };
    if (UNIVERSAL_CLAIM.test(text(i)) && (classOf[i] === "prose" || l.relation.kind === "expression")) return { claim: "universal" as const };
    if (classOf[i] === "prose") return { error: "prose that is not a recognised mathematical claim" };
    try {
      const rel = l.relation; const vs = new Set<string>(); relationVars(rel, vs);
      if (vs.size === 0 && (rel.kind === "equation" || rel.kind === "inequality")) { const s = stmtFromRelation(rel, null, text(i)); return { closed: s.defined(ZERO) ? s.holds(ZERO) : null }; }
      return stmtFromRelation(rel, name, text(i));
    } catch (e) { if (e instanceof Unsupported) return { error: e.message }; throw e; }
  });
  const ALL: Stmt = { kind: "all", text: "all real numbers", critical: [], holds: () => true, defined: () => true };
  stmts.push(ALL);
  for (const b of built) if ("kind" in b) stmts.push(b);
  const prof = profile(stmts); const desc = (s: Stmt) => describe(prof, s);
  const S0desc = desc(stmt0); let finalStmt: Stmt | null = null, finalIndex = -1;
  const undefined0 = prof.undefinedAt(stmt0);
  for (let i = 0; i < lines.length; i++) {
    const b = built[i];
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (firstInvalid !== null || unresolved !== null) { push({ status: "inconclusive", relation: "inconclusive", detail: firstInvalid !== null ? `depends on the invalid line ${firstInvalid + 1}` : `depends on the unverified line ${unresolved! + 1}`, solutionSet: null, evidence: null }); continue; }
    if ("error" in b) { unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: b.error, solutionSet: null, evidence: null }); continue; }
    if ("closed" in b) {
      if (b.closed === true) push({ status: "verified-valid", relation: "independent-true", detail: "an independent closed numeric statement that is exactly true", solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } });
      else if (b.closed === false) { firstInvalid = i; push({ status: "verified-invalid", relation: "independent-false", detail: "a closed numeric statement that is exactly false", solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } }); }
      else { unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: "a closed statement that is undefined", solutionSet: null, evidence: null }); }
      continue;
    }
    if ("claim" in b) {
      if (b.claim === "completeness") {
        const r = relate(prof, prev, stmt0);
        if (r === "equal") push({ status: "verified-valid", relation: "completeness-claim", detail: "the solution set stated before this claim is exactly the problem's solution set", solutionSet: null, evidence: { checker: "exact-solution-set", u4: null } });
        else { falseCompleteness = i; push({ status: "verified-invalid", relation: "completeness-claim", detail: `the claim of completeness is false: the stated set is ${desc(prev)} but the problem's solution set is ${S0desc}`, solutionSet: null, evidence: { checker: "exact-solution-set", u4: null } }); }
      } else {
        const r = relate(prof, ALL, stmt0), M = prof.membership;
        if (r === "equal") push({ status: "verified-valid", relation: "universal-claim", detail: "the claim that the statement holds for all real numbers is exactly right", solutionSet: "all real numbers", evidence: { checker: "exact-solution-set", u4: null } });
        else {
          const diffGap = prof.gaps.some((_, k) => M.get(ALL)!.gap[k] && !M.get(stmt0)!.gap[k]);
          const diffPts = prof.points.map((_, k) => k).filter((k) => !M.get(stmt0)!.pt[k]);
          const onlyExcluded = !diffGap && diffPts.length > 0 && diffPts.every((k) => undefined0[k]);
          if (onlyExcluded) { missingAssumptionAt = i; push({ status: "incomplete", relation: "universal-claim", detail: `the claim ignores the domain restriction; the statement holds only for ${S0desc}`, solutionSet: "all real numbers", evidence: { checker: "exact-solution-set", u4: null } }); }
          else { firstInvalid = i; push({ status: "verified-invalid", relation: "universal-claim", detail: `the statement does not hold for all real numbers: its solution set is ${S0desc}`, solutionSet: "all real numbers", evidence: { checker: "exact-solution-set", u4: null } }); }
        }
      }
      continue;
    }
    const s = b as Stmt, r = relate(prof, prev, s);
    let u4: U4Evidence | null = null;
    if (name && prev.kind === "atom" && (s.kind === "atom" || s.kind === "set")) { u4 = u4StepEvidence(prev, s, name); if (u4.outcome === "verified") u4Steps++; else exactSteps++; } else exactSteps++;
    const ev = { checker: (u4 && u4.outcome === "verified" ? "u4+exact-solution-set" : "exact-solution-set") as "u4+exact-solution-set" | "exact-solution-set", u4 };
    if (u4 && u4.outcome === "rejected") { unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: "the independent U4 identity check rejected the derived algebraic relation; abstaining", solutionSet: desc(s), evidence: ev }); continue; }
    if (r === "equal") push({ status: "verified-valid", relation: "equivalent", detail: `equivalent to the previous statement: ${desc(s)}`, solutionSet: desc(s), evidence: ev });
    else if (r === "subset") { widening = widening < 0 ? i : widening; push({ status: "verified-valid", relation: "widening", detail: `follows from the previous statement but admits more values (${desc(s)}); candidates must be checked against the original problem`, solutionSet: desc(s), evidence: ev }); }
    else if (r === "superset") { narrowing = narrowing < 0 ? i : narrowing; push({ status: "incomplete", relation: "narrowing", detail: `a valid reduction that loses solutions: ${desc(prev)} became ${desc(s)}`, solutionSet: desc(s), evidence: ev }); }
    else { firstInvalid = i; push({ status: "verified-invalid", relation: "incomparable", detail: `neither follows from nor is equivalent to the previous statement (${desc(prev)} versus ${desc(s)})`, solutionSet: desc(s), evidence: ev }); }
    if (firstInvalid === null) { chain.push({ stmt: s, index: i, rel: lines[i].relation }); prev = s; finalStmt = s; finalIndex = i; }
  }
  void pending; void stmts;
  const restrictions = prof.points.filter((_, k) => undefined0[k]).map((p) => `${name ?? "x"} != ${p.text()}`);
  const base = { contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode: "solution-set" as const, completenessAuthority: "checker" as const, lines: out, problemSolutionSet: S0desc, restrictions, u4Steps, exactSteps };
  const result = (outcome: AlgebraCheck["outcome"], firstInv: number | null, why: string, extra: string[] = []): AlgebraCheck => ({ ...base, outcome, firstInvalidStep: firstInv, finalSolutionSet: finalStmt ? desc(finalStmt) : null, obligations: [...obligations, ...extra], justification: why });
  if (firstInvalid !== null) return result("invalid", firstInvalid, `line ${firstInvalid + 1}: ${out[firstInvalid].detail}`);
  if (unresolved !== null) return result("unsupported", null, `line ${unresolved + 1} cannot be verified independently: ${out[unresolved].detail}`, [`verify line ${unresolved + 1}`]);
  if (missingAssumptionAt !== null && falseCompleteness === null) return result("missing-assumption", null, `the conclusion ignores the domain restriction: ${restrictions.join(", ")}`, restrictions.map((r) => `state the restriction ${r}`));
  if (!finalStmt) return result("incomplete", null, "no mathematical conclusion about the variable was reached", ["state the solution"]);
  if (falseCompleteness !== null) return result("invalid", narrowing >= 0 ? narrowing : falseCompleteness, out[falseCompleteness].detail);
  const rel = relate(prof, finalStmt, stmt0);
  if (rel === "incomparable") return result("invalid", finalIndex, `the final statement (${desc(finalStmt)}) is not related to the problem's solution set (${S0desc})`);
  if (rel === "superset") return result("invalid", finalIndex, `the final statement (${desc(finalStmt)}) includes values that are not solutions; the problem's solution set is ${S0desc}`);
  if (rel === "subset") return result("incomplete", null, `the conclusion (${desc(finalStmt)}) omits solutions: the problem's solution set is ${S0desc}`, [`include the remaining solutions: ${S0desc}`]);
  if (narrowing >= 0 || widening >= 0) return result("incomplete", null, widening >= 0 ? "the working widened the solution set (for example by squaring) and later removed candidates without showing the check against the original problem" : "a step lost solutions that were later recovered without justification", [widening >= 0 ? "verify each candidate in the original problem" : "justify every solution-changing step"]);
  if (!isSolvedForm(chain[chain.length - 1].rel, name ?? "x")) return result("incomplete", null, "the working is correct but the solution is not stated in solved form", ["state the solution explicitly"]);
  return result("verified", null, `every line is exact-equivalent to the problem and the solution set ${S0desc} is stated`);
}

function numericMode(expr: Expr, parsed: NaturalParseResult, classOf: string[]): AlgebraCheck {
  const v0 = evalAt(expr, ZERO, "\u0000"); if (!v0) throw new Unsupported("the problem expression is undefined");
  const out: CheckedLine[] = []; let bad: number | null = null, unresolved: number | null = null; let last: Ext | null = null; let lastKind: string = ""; let exact = 0;
  parsed.lines.forEach((l, i) => {
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (bad !== null || unresolved !== null) { push({ status: "inconclusive", relation: "inconclusive", detail: "depends on an earlier unresolved line", solutionSet: null, evidence: null }); return; }
    try {
      if (classOf[i] === "prose") throw new Unsupported("prose that is not a recognised mathematical claim");
      const rel = l.relation, ev = { checker: "exact-arithmetic" as const, u4: null };
      if (rel.kind === "expression") { const z = evalAt(rel.expression, ZERO, "\u0000"); if (!z) throw new Unsupported("undefined value"); exact++; last = z; lastKind = rel.expression.kind;
        if (eZero(eAdd(z, eNeg(v0)))) push({ status: "verified-valid", relation: "numeric-equal", detail: "has exactly the same value as the problem", solutionSet: null, evidence: ev }); else { bad = i; push({ status: "verified-invalid", relation: "numeric-different", detail: "its exact value differs from the problem's value", solutionSet: null, evidence: ev }); } return; }
      if (rel.kind === "equation") { const a = evalAt(rel.left, ZERO, "\u0000"), b = evalAt(rel.right, ZERO, "\u0000"); if (!a || !b) throw new Unsupported("undefined value"); exact++;
        const ok = eZero(eAdd(a, eNeg(b))), same = eZero(eAdd(a, eNeg(v0))); last = b; lastKind = rel.right.kind;
        if (ok && same) push({ status: "verified-valid", relation: "numeric-equal", detail: "a true equality that preserves the problem's value", solutionSet: null, evidence: ev }); else { bad = i; push({ status: "verified-invalid", relation: "numeric-different", detail: ok ? "a true equality, but not about the problem's value" : "the two sides are not exactly equal", solutionSet: null, evidence: ev }); } return; }
      throw new Unsupported(`${rel.kind} lines are outside the checker scope`);
    } catch (e) { if (!(e instanceof Unsupported)) throw e; unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: e.message, solutionSet: null, evidence: null }); }
  });
  void last; void lastKind;
  const base = { contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode: "numeric-value" as const, completenessAuthority: "native" as const, lines: out, problemSolutionSet: null, finalSolutionSet: null, restrictions: [], u4Steps: 0, exactSteps: exact };
  if (bad !== null) return { ...base, outcome: "invalid", firstInvalidStep: bad, obligations: [], justification: `line ${bad + 1}: ${out[bad].detail}` };
  if (unresolved !== null) return { ...base, outcome: "unsupported", firstInvalidStep: null, obligations: [`verify line ${unresolved + 1}`], justification: `line ${unresolved + 1} cannot be verified independently` };
  return { ...base, outcome: "verified", firstInvalidStep: null, obligations: [], justification: "every line has exactly the problem's value (final-form completeness is judged natively)" };
}

function identityMode(expr: Expr, parsed: NaturalParseResult, name: string, classOf: string[]): AlgebraCheck {
  const out: CheckedLine[] = []; let prev = expr, bad: number | null = null, unresolved: number | null = null, u4Steps = 0;
  parsed.lines.forEach((l, i) => {
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (bad !== null || unresolved !== null) { push({ status: "inconclusive", relation: "inconclusive", detail: "depends on an earlier unresolved line", solutionSet: null, evidence: null }); return; }
    try {
      if (classOf[i] === "prose" || l.relation.kind !== "expression") throw new Unsupported("not an expression line");
      const next = l.relation.expression; nodeCount(next); variablesOf(next);
      const c = certify(prev, next);
      if (c.outcome === "verified") { u4Steps++; push({ status: "verified-valid", relation: "equivalent", detail: "U4 verifies the exact rational identity with the previous expression", solutionSet: null, evidence: { checker: "u4-identity", u4: { outcome: "verified", multiplier: "1", direction: "equal", restrictions: c.restrictions, rules: c.rules, digest: c.digest } } }); prev = next; return; }
      // a concrete exact counterexample at a defined rational point is an independent refutation
      for (const t of [0, 1, -1, 2, 3, -2, 5].map(q)) { const a = evalAt(prev, t, name), b = evalAt(next, t, name); if (a && b && !eZero(eAdd(a, eNeg(b)))) { bad = i; push({ status: "verified-invalid", relation: "incomparable", detail: `the expressions differ at ${name} = ${t.text()}`, solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } }); return; } }
      throw new Unsupported("the independent kernel cannot decide this expression equivalence");
    } catch (e) { if (!(e instanceof Unsupported)) throw e; unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: e.message, solutionSet: null, evidence: null }); }
  });
  const base = { contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode: "expression-identity" as const, completenessAuthority: "native" as const, lines: out, problemSolutionSet: null, finalSolutionSet: null, restrictions: [], u4Steps, exactSteps: 0 };
  if (bad !== null) return { ...base, outcome: "invalid", firstInvalidStep: bad, obligations: [], justification: `line ${bad + 1}: ${out[bad].detail}` };
  if (unresolved !== null) return { ...base, outcome: "unsupported", firstInvalidStep: null, obligations: [`verify line ${unresolved + 1}`], justification: `line ${unresolved + 1} cannot be verified independently` };
  return { ...base, outcome: "verified", firstInvalidStep: null, obligations: [], justification: "U4 verifies every expression step (form completeness is judged natively)" };
}
