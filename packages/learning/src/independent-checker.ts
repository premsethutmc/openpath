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
import { parseFidelityLoss } from "./parse-fidelity.ts";
import { createHash } from "node:crypto";
import type { Expr } from "./calculus-core";
import { checkSymbolicCertificate, type KernelCertificate } from "./proof-kernel.ts";
import { parseNaturalWorking, type NaturalParseResult, type NaturalRelation } from "./natural-working.ts";

export const INDEPENDENT_CHECKER_CONTRACT = "openpath-independent-algebra-checker@1" as const;
export const CHECKER_SCOPE = "single-variable rational-coefficient polynomial/rational equations and inequalities, |.|, one sqrt radicand, finite/interval solution sets, closed numeric statements, expression identity via U4; all critical points rational" as const;
export const CHECKER_LIMITS = { maxDegree: 12, maxCriticalPoints: 64, maxNodes: 600, maxDigits: 80, maxDivisorTrial: 2_000_000 } as const;

/**
 * E4 policy. "implicit" (default): when a working lists a short finite candidate set (after squaring, clearing denominators, ...) and then
 * keeps only the candidates that satisfy the ORIGINAL problem, the elimination is accepted because the exact partition has just proven every
 * dropped candidate fails the original problem and the final set equals the problem's solution set. "shown" reproduces the stricter E3 rule that
 * requires the student to write the check. The policy never affects soundness: final == problem solution set is required in both.
 */
export type CandidateEliminationPolicy = "implicit" | "shown";
let candidatePolicy: CandidateEliminationPolicy = "implicit";
export function withCandidateEliminationPolicy<T>(policy: CandidateEliminationPolicy, fn: () => T): T { const old = candidatePolicy; candidatePolicy = policy; try { return fn(); } finally { candidatePolicy = old; } }
let degreeCap: number = CHECKER_LIMITS.maxDegree;
export class Unsupported extends Error {}
export class Exhausted extends Error {}
class TwoRadicands extends Unsupported { constructor() { super("two different radicands"); } }

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
const commonR = (a: Ext, b: Ext): Q => { if (a.y.isZero()) return b.r; if (b.y.isZero() || a.r.eq(b.r)) return a.r; throw new TwoRadicands(); };
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
/** E4: points of the real line are elements x + y*sqrt(f) of ONE quadratic field (f squarefree as far as trial division can tell). */
type Pt = Ext;
const ptSub = (a: Pt, b: Pt): Pt => eAdd(a, eNeg(b));
const ptCmp = (a: Pt, b: Pt): number => signExt(ptSub(a, b));
const ptEq = (a: Pt, b: Pt): boolean => eZero(ptSub(a, b));
function extText(a: Ext): string {
  if (a.y.isZero()) return a.x.text();
  const yAbs = a.y.sign() < 0 ? a.y.neg() : a.y, rad = `${yAbs.text()}*sqrt(${a.r.text()})`;
  return a.x.isZero() ? `${a.y.sign() < 0 ? "-" : ""}${rad}` : `${a.x.text()} ${a.y.sign() < 0 ? "-" : "+"} ${rad}`;
}
function squarefreeSplit(n: bigint): { s: bigint; f: bigint } {
  let s = 1n, f = n; if (f < 1n) throw new Unsupported("square root of a non-positive integer");
  for (let p = 2n; p <= 100000n && p * p <= f; p += p === 2n ? 1n : 2n) { const pp = p * p; while (f % pp === 0n) { f /= pp; s *= p; } }
  const t = isqrt(f); if (t * t === f) { s *= t; f = 1n; }
  return { s, f };
}
/** principal square root of a rational v >= 0 as a (normalised) element of its own quadratic field */
function sqrtQ(v: Q): Ext {
  const t = sqrtExact(v); if (t) return rat(t);
  const { s, f } = squarefreeSplit(v.n * v.d);
  return { x: ZERO, y: new Q(s, v.d), r: new Q(f) };
}
/** principal square root of z (z >= 0) when it lies in z's own field Q(sqrt r); null otherwise (a nested radical) */
function sqrtExt(z: Ext): Ext | null {
  if (z.y.isZero()) return sqrtQ(z.x);
  const N = z.x.mul(z.x).sub(z.y.mul(z.y).mul(z.r)), t = sqrtExact(N); if (!t) return null;
  for (const sgn of [1, -1]) {
    const c2 = z.x.add(t.mul(q(sgn))).div(q(2)), c = sqrtExact(c2); if (!c || c.isZero()) continue;
    const w: Ext = { x: c, y: z.y.div(q(2).mul(c)), r: z.r };
    if (eZero(eAdd(eMul(w, w), eNeg(z)))) return signExt(w) < 0 ? eNeg(w) : w;
  }
  return null;
}
function floorExt(a: Ext, k: bigint): bigint {
  let lo = -(1n << 60n), hi = 1n << 60n; // largest m with m / 2^k <= a
  while (lo < hi) { const mid = (lo + hi + 1n) >> 1n; if (signExt(eAdd(a, eNeg(rat(new Q(mid, 1n << k))))) >= 0) lo = mid; else hi = mid - 1n; }
  return lo;
}
/** a rational strictly below (offset < 0) or above (offset > 0) the point, verified exactly */
function outside(p: Pt, offset: bigint): Q {
  const c = new Q(floorExt(p, 0n) + offset); if (offset < 0n ? ptCmp(rat(c), p) >= 0 : ptCmp(rat(c), p) <= 0) throw new Exhausted("critical point out of range");
  return c;
}
function rationalBetween(a: Ext, b: Ext): Q {
  for (let k = 0n; k <= 40n; k++) { const cand = new Q(floorExt(a, k) + 1n, 1n << k); if (ptCmp(rat(cand), a) > 0 && ptCmp(b, rat(cand)) > 0) return cand; }
  throw new Exhausted("two critical points are too close to separate");
}


/* ------------------------------------------------------------------ E4: Q(sqrt f1, sqrt f2) at rational points
 * Two different irrational radicals (for example sqrt(x+4) + sqrt(x) at x = 1) cannot live in the single-radical Ext. At a RATIONAL point
 * both radicals are square roots of rationals, so the value is an exact element of a biquadratic field. Its sign is decided exactly by
 * the tower rule  sign(P + Q*sqrt f2): equal signs win, otherwise compare P^2 with Q^2 f2 in Q(sqrt f1). No approximation anywhere.
 */
interface QF { c: [Q, Q, Q, Q]; f: [Q, Q] } // basis 1, sqrt f1, sqrt f2, sqrt f1 sqrt f2 ; f = 0 means absent (present radicals are packed first)
const qfRat = (x: Q): QF => ({ c: [x, ZERO, ZERO, ZERO], f: [ZERO, ZERO] });
function qfUnify(a: QF, b: QF): [QF, QF] {
  const radicals: Q[] = []; for (const f of [...a.f, ...b.f]) if (!f.isZero() && !radicals.some((x) => x.eq(f))) radicals.push(f);
  if (radicals.length > 2) throw new Unsupported("three or more distinct radicals");
  const embed = (z: QF): QF => {
    const pos = z.f.map((f) => (f.isZero() ? -1 : radicals.findIndex((x) => x.eq(f)))), c: [Q, Q, Q, Q] = [ZERO, ZERO, ZERO, ZERO];
    for (let m = 0; m < 4; m++) { if (z.c[m].isZero()) continue; let nm = 0; if (m & 1) nm |= 1 << pos[0]; if (m & 2) nm |= 1 << pos[1]; c[nm] = c[nm].add(z.c[m]); }
    return { c, f: [radicals[0] ?? ZERO, radicals[1] ?? ZERO] };
  };
  return [embed(a), embed(b)];
}
const qfAdd = (a0: QF, b0: QF): QF => { const [a, b] = qfUnify(a0, b0); return { c: a.c.map((x, i) => x.add(b.c[i])) as [Q, Q, Q, Q], f: a.f }; };
const qfNeg = (a: QF): QF => ({ c: a.c.map((x) => x.neg()) as [Q, Q, Q, Q], f: a.f });
function qfMul(a0: QF, b0: QF): QF {
  const [a, b] = qfUnify(a0, b0), c: [Q, Q, Q, Q] = [ZERO, ZERO, ZERO, ZERO];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if (a.c[i].isZero() || b.c[j].isZero()) continue; let coef = a.c[i].mul(b.c[j]); const both = i & j;
    if (both & 1) coef = coef.mul(a.f[0]); if (both & 2) coef = coef.mul(a.f[1]); c[i ^ j] = c[i ^ j].add(coef);
  }
  return { c, f: a.f };
}
const qfParts = (a: QF): { P: Ext; Q2: Ext; f2: Q } => ({ P: { x: a.c[0], y: a.c[1], r: a.f[0] }, Q2: { x: a.c[2], y: a.c[3], r: a.f[0] }, f2: a.f[1] });
function qfSign(a: QF): number {
  const { P, Q2, f2 } = qfParts(a), sP = signExt(P);
  if (f2.isZero()) return sP;
  const sQ = signExt(Q2); if (sP === 0) return sQ; if (sQ === 0) return sP; if (sP === sQ) return sP;
  const w = eAdd(eMul(P, P), eNeg(eMul(eMul(Q2, Q2), rat(f2)))), sw = signExt(w);
  return sw > 0 ? sP : sw < 0 ? sQ : 0;
}
function qfInv(a: QF): QF | null {
  const { P, Q2, f2 } = qfParts(a);
  if (f2.isZero()) { const i = eInv(P); return i ? { c: [i.x, i.y, ZERO, ZERO], f: a.f } : null; }
  const w = eAdd(eMul(P, P), eNeg(eMul(eMul(Q2, Q2), rat(f2)))), wi = eInv(w); if (!wi) return null;
  const p = eMul(P, wi), qq = eMul(eNeg(Q2), wi);
  return { c: [p.x, p.y, qq.x, qq.y], f: a.f };
}
function qfSqrt(a: QF): QF {
  const rationalOnly = a.c[1].isZero() && a.c[2].isZero() && a.c[3].isZero();
  if (rationalOnly) { const t = sqrtQ(a.c[0]); return t.y.isZero() ? qfRat(t.x) : { c: [ZERO, t.y, ZERO, ZERO], f: [t.r, ZERO] }; }
  if (a.f[1].isZero()) { const t = sqrtExt({ x: a.c[0], y: a.c[1], r: a.f[0] }); if (!t) throw new Unsupported("a nested radical outside the field"); return { c: [t.x, t.y, ZERO, ZERO], f: [t.y.isZero() ? ZERO : t.r, ZERO] }; }
  throw new Unsupported("the square root of an element with two radicals");
}
function qfEval(e: Expr, v: Q, name: string): QF | null {
  switch (e.kind) {
    case "constant": return qfRat(readRat(e.value));
    case "variable": if (e.name !== name) throw new Unsupported("second variable"); return qfRat(v);
    case "add": { let acc = qfRat(ZERO); for (const t of e.terms) { const z = qfEval(t, v, name); if (!z) return null; acc = qfAdd(acc, z); } return acc; }
    case "multiply": { let acc = qfRat(ONE); for (const t of e.factors) { const z = qfEval(t, v, name); if (!z) return null; acc = qfMul(acc, z); } return acc; }
    case "power": {
      if (!Number.isInteger(e.exponent) || Math.abs(e.exponent) > 12) throw new Unsupported("non-integer or large exponent");
      let b = qfEval(e.base, v, name); if (!b) return null; if (e.exponent < 0) { b = qfInv(b); if (!b) return null; }
      let acc = qfRat(ONE); for (let i = 0; i < Math.abs(e.exponent); i++) acc = qfMul(acc, b); return acc;
    }
    case "abs": { const z = qfEval(e.argument, v, name); if (!z) return null; return qfSign(z) < 0 ? qfNeg(z) : z; }
    case "root": { const z = qfEval(e.radicand, v, name); if (!z) return null; if (qfSign(z) < 0) return null; return qfSqrt(z); }
    default: throw new Unsupported(`${e.kind} is outside the checker scope`);
  }
}

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

/** Exact evaluation at a point of the real-closed field Q(sqrt f); null = undefined there (pole, negative radicand). */
function evalAt(e: Expr, v: Ext, name: string): Ext | null {
  switch (e.kind) {
    case "constant": return rat(readRat(e.value));
    case "variable": if (e.name !== name) throw new Unsupported("second variable"); return v;
    case "add": { let acc = rat(ZERO); for (const t of e.terms) { const z = evalAt(t, v, name); if (!z) return null; acc = eAdd(acc, z); } return acc; }
    case "multiply": { let acc = rat(ONE); for (const t of e.factors) { const z = evalAt(t, v, name); if (!z) return null; acc = eMul(acc, z); } return acc; }
    case "power": {
      if (!Number.isInteger(e.exponent) || Math.abs(e.exponent) > 12) throw new Unsupported("non-integer or large exponent");
      let b = evalAt(e.base, v, name); if (!b) return null; if (e.exponent < 0) { b = eInv(b); if (!b) return null; }
      let acc = rat(ONE); for (let i = 0; i < Math.abs(e.exponent); i++) acc = eMul(acc, b); return acc;
    }
    case "abs": { const z = evalAt(e.argument, v, name); if (!z) return null; return signExt(z) < 0 ? eNeg(z) : z; }
    case "root": {
      const z = evalAt(e.radicand, v, name); if (!z) return null;
      if (signExt(z) < 0) return null;
      const r = sqrtExt(z); if (!r) throw new Unsupported("a nested radical outside the single quadratic field");
      return r;
    }
    default: throw new Unsupported(`${e.kind} is outside the checker scope`);
  }
}

/* ------- symbolic elements of Q(x)[sqrt A0, sqrt A1] (used only to find critical points; truth is always decided by evalAt) */
interface SymCtx { name: string; rads: RF[]; sigma: Map<string, 1 | -1> }
type XQ = Map<number, RF>; // bitmask of radicals -> coefficient
const xPure = (r: RF): XQ => new Map([[0, r]]); // zero-valued entries are kept: their denominators still mark poles
function xAdd(a: XQ, b: XQ): XQ { const r = new Map(a); for (const [m, c] of b) { const o = r.get(m); r.set(m, o ? rfAdd(o, c) : c); } return r; }
function xMul(a: XQ, b: XQ, c: SymCtx): XQ {
  let r: XQ = new Map();
  for (const [m1, c1] of a) for (const [m2, c2] of b) { let coef = rfMul(c1, c2); const both = m1 & m2; for (let i = 0; i < c.rads.length; i++) if ((both >> i) & 1) coef = rfMul(coef, c.rads[i]); r = xAdd(r, new Map([[m1 ^ m2, coef]])); }
  return r;
}
const xNeg = (a: XQ): XQ => new Map([...a].map(([m, c]) => [m, rfNeg(c)] as [number, RF]));
const xIsPure = (a: XQ) => [...a].every(([m, c]) => m === 0 || rfIsZero(c));
const xConj = (a: XQ, i: number): XQ => new Map([...a].map(([m, c]) => [m, (m >> i) & 1 ? rfNeg(c) : c] as [number, RF]));
/** product of all sign-conjugates: a rational function whose zeros contain every real zero of the element */
function xNorm(a: XQ, c: SymCtx): RF { let n = a; for (let i = 0; i < c.rads.length; i++) n = xMul(n, xConj(n, i), c); if (!xIsPure(n)) throw new Unsupported("norm is not rational"); return n.get(0) ?? rfConst(ZERO); }
function toXQ(e: Expr, c: SymCtx): XQ {
  switch (e.kind) {
    case "constant": return xPure(rfConst(readRat(e.value)));
    case "variable": if (e.name !== c.name) throw new Unsupported("second variable"); return xPure({ n: [ZERO, ONE], d: [ONE] });
    case "add": return e.terms.map((t) => toXQ(t, c)).reduce(xAdd, new Map() as XQ);
    case "multiply": return e.factors.map((t) => toXQ(t, c)).reduce((a, b) => xMul(a, b, c), xPure(rfConst(ONE)));
    case "power": {
      if (!Number.isInteger(e.exponent) || Math.abs(e.exponent) > degreeCap) throw new Unsupported("non-integer or large exponent");
      let b = toXQ(e.base, c);
      if (e.exponent < 0) { if (!xIsPure(b)) throw new Unsupported("division by a radical"); b = xPure(rfInv(b.get(0) ?? rfConst(ZERO))); }
      let acc = xPure(rfConst(ONE)); for (let i = 0; i < Math.abs(e.exponent); i++) acc = xMul(acc, b, c); return acc;
    }
    case "abs": { const a = toXQ(e.argument, c); if (!xIsPure(a)) throw new Unsupported("absolute value of a radical"); const sg = c.sigma.get(JSON.stringify(e.argument)) ?? 1; return sg === 1 ? a : xNeg(a); }
    case "root": {
      const a = toXQ(e.radicand, c); if (!xIsPure(a)) throw new Unsupported("nested radicals");
      const r0 = a.get(0) ?? rfConst(ZERO); let i = c.rads.findIndex((x) => rfEq(x, r0));
      if (i < 0) { if (c.rads.length >= 2) throw new Unsupported("more than two distinct radicands"); c.rads.push(r0); i = c.rads.length - 1; }
      return new Map([[1 << i, rfConst(ONE)]]);
    }
    default: throw new Unsupported(`${e.kind} is outside the checker scope`);
  }
}
/** Real critical points of an atom L ? R: zeros and poles of every symbolic piece (via sign-conjugate norms), over every sign pattern of the absolute values. */
function criticalPoints(exprs: Expr[], name: string): Pt[] {
  const absKeys = new Map<string, Expr>(), rootKeys = new Map<string, Expr>();
  exprs.forEach((e) => specials(e, absKeys, rootKeys));
  if (absKeys.size + rootKeys.size > 3 || rootKeys.size > 2) throw new Unsupported("too many absolute-value/root nodes");
  const keys = [...absKeys.keys()], polys: Poly[] = [];
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const sigma = new Map<string, 1 | -1>(keys.map((k, i) => [k, (mask >> i) & 1 ? -1 : 1] as [string, 1 | -1]));
    const ctx: SymCtx = { name, rads: [], sigma };
    const parts = exprs.map((e) => toXQ(e, ctx));
    const push = (r: RF) => { polys.push(r.n, r.d); };
    if (exprs.length === 2) {
      const diff = xAdd(parts[0], xNeg(parts[1]));
      push(xNorm(diff, ctx)); for (const c of ctx.rads) push(c);
      for (const comp of diff.values()) polys.push(comp.d);
    }
  }
  for (const a of absKeys.values()) { const ctx: SymCtx = { name, rads: [], sigma: new Map() }; try { const r = toXQ(a, ctx); if (xIsPure(r) && r.get(0)) { polys.push(r.get(0)!.n, r.get(0)!.d); } } catch (e) { if (!(e instanceof Unsupported)) throw e; } }
  const pts: Pt[] = [];
  for (const p of polys) {
    const tp = trim(p); if (!tp.length || deg(tp) > CHECKER_LIMITS.maxDegree) { if (tp.length) throw new Exhausted("polynomial degree limit"); continue; }
    const { roots, complete } = realRootsExt(tp); if (!complete) throw new Unsupported("an irrational critical point of degree > 2 or in a second quadratic field");
    for (const r of roots) if (!pts.some((x) => ptEq(x, r))) pts.push(r);
  }
  if (pts.length > CHECKER_LIMITS.maxCriticalPoints) throw new Exhausted("too many critical points");
  return pts;
}
function realRootsExt(p0: Poly): { roots: Ext[]; complete: boolean } {
  const { roots, complete } = rationalRoots(p0), out: Ext[] = roots.map(rat);
  if (complete) return { roots: out, complete: true };
  let p = trim(p0); for (const r of roots) while (deg(p) > 0 && pEval(p, r).isZero()) p = pDivmod(p, [r.neg(), ONE]).quo;
  if (deg(p) === 2) {
    const disc = p[1].mul(p[1]).sub(q(4).mul(p[2]).mul(p[0]));
    if (disc.sign() > 0 && !sqrtExact(disc)) {
      const { s: sq, f } = squarefreeSplit(disc.n * disc.d), two = q(2).mul(p[2]), centre = p[1].neg().div(two), half = new Q(sq, disc.d).div(two);
      return { roots: [...out, { x: centre, y: half, r: new Q(f) }, { x: centre, y: half.neg(), r: new Q(f) }], complete: true };
    }
  }
  return { roots: out, complete: false };
}

/* ------------------------------------------------------------------ statements and solution sets */
type Op = "=" | "<" | "<=" | ">" | ">=" | "!=";
interface Stmt {
  kind: "atom" | "set" | "interval" | "all" | "closed";
  text: string; critical: Pt[]; holds: (v: Ext) => boolean; defined: (v: Ext) => boolean;
  atom?: { left: Expr; right: Expr; op: Op };
  /** E4: this statement is the explicit claim "no solution" */
  emptyClaim?: boolean;
}
const cmpHolds = (s: number, op: Op) => op === "=" ? s === 0 : op === "!=" ? s !== 0 : op === "<" ? s < 0 : op === "<=" ? s <= 0 : op === ">" ? s > 0 : s >= 0;
function constantValue(e: Expr): Q { const z = evalAt(e, rat(ZERO), "\u0000"); if (!z || !z.y.isZero()) throw new Unsupported("solution value is not an exact rational"); return z.x; }
function constantPoint(e: Expr): Pt { const z = evalAt(e, rat(ZERO), "\u0000"); if (!z) throw new Unsupported("solution value is undefined"); return z; }
function atomStmt(op: Op, left: Expr, right: Expr, name: string | null, text: string): Stmt {
  nodeCount(left); nodeCount(right);
  const vn = name ?? "\u0000";
  const critical = name ? criticalPoints([left, right], name) : [];
  // the sign of (left - right) at a point; at a RATIONAL point with two different irrational radicals the exact biquadratic tower is used
  const signAt = (v: Ext): number | null => {
    try { const l = evalAt(left, v, vn), r = evalAt(right, v, vn); return l && r ? signExt(eAdd(l, eNeg(r))) : null; }
    catch (e) {
      if (!(e instanceof TwoRadicands) || !v.y.isZero()) throw e;
      const l = qfEval(left, v.x, vn), r = qfEval(right, v.x, vn); return l && r ? qfSign(qfAdd(l, qfNeg(r))) : null;
    }
  };
  return { kind: name ? "atom" : "closed", text, critical, atom: { left, right, op },
    holds: (v) => { const sg = signAt(v); return sg === null ? false : cmpHolds(sg, op); }, defined: (v) => signAt(v) !== null };
}
function stmtFromRelation(rel: NaturalRelation, name: string | null, text: string): Stmt {
  if (rel.kind === "equation") return atomStmt("=", rel.left, rel.right, name, text);
  if (rel.kind === "inequality") return atomStmt(rel.operator, rel.left, rel.right, name, text);
  if (rel.kind === "solution-set") {
    if (name !== null && rel.variable !== name) throw new Unsupported("solution set for a different variable");
    const vals = rel.values.map(constantPoint);
    return { kind: "set", text, critical: vals, holds: (v) => vals.some((x) => ptEq(x, v)), defined: () => true };
  }
  if (rel.kind === "interval") {
    const lo = rel.lower ? constantPoint(rel.lower) : null, hi = rel.upper ? constantPoint(rel.upper) : null;
    return { kind: "interval", text, critical: [lo, hi].filter((x): x is Pt => !!x),
      holds: (v) => (lo === null || (rel.includeLower ? ptCmp(v, lo) >= 0 : ptCmp(v, lo) > 0)) && (hi === null || (rel.includeUpper ? ptCmp(v, hi) <= 0 : ptCmp(v, hi) < 0)), defined: () => true };
  }
  throw new Unsupported(`${rel.kind} lines are outside the checker scope`);
}
interface Profile { points: Pt[]; gaps: Q[]; membership: Map<Stmt, { gap: boolean[]; pt: boolean[] }>; undefinedAt: (s: Stmt) => boolean[] }
function profile(stmts: Stmt[]): Profile {
  const points: Pt[] = []; for (const s of stmts) for (const c of s.critical) if (!points.some((x) => ptEq(x, c))) points.push(c);
  points.sort(ptCmp); if (points.length > CHECKER_LIMITS.maxCriticalPoints) throw new Exhausted("too many critical points");
  const two = q(2), allRational = points.every((p) => p.y.isZero());
  const gaps: Q[] = !points.length ? [ZERO]
    : allRational ? [points[0].x.sub(ONE), ...points.slice(1).map((p, i) => points[i].x.add(p.x).div(two)), points[points.length - 1].x.add(ONE)]
    : [outside(points[0], -1n), ...points.slice(1).map((p, i) => (points[i].y.isZero() && p.y.isZero() ? points[i].x.add(p.x).div(two) : rationalBetween(points[i], p))), outside(points[points.length - 1], 2n)];
  const membership = new Map<Stmt, { gap: boolean[]; pt: boolean[] }>();
  for (const s of stmts) membership.set(s, { gap: gaps.map((g) => s.holds(rat(g))), pt: points.map((p) => s.holds(p)) });
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
  if (m.gap.every((x) => !x)) { const pts = P.filter((_, i) => m.pt[i]).map((x) => extText(x)); return pts.length ? `{${pts.join(", ")}}` : "no real solutions"; }
  if (m.gap.every((x) => x)) { const out = P.filter((_, i) => !m.pt[i]).map((x) => extText(x)); return out.length ? `all real numbers except {${out.join(", ")}}` : "all real numbers"; }
  // cells alternate gap0, pt0, gap1, pt1, ..., gapN; merge maximal runs of included cells
  const cells: { gap: boolean; idx: number; on: boolean }[] = [];
  for (let i = 0; i <= n; i++) { cells.push({ gap: true, idx: i, on: m.gap[i] }); if (i < n) cells.push({ gap: false, idx: i, on: m.pt[i] }); }
  const parts: string[] = []; let k = 0;
  while (k < cells.length) {
    if (!cells[k].on) { k++; continue; }
    let e = k; while (e + 1 < cells.length && cells[e + 1].on) e++;
    const first = cells[k], last = cells[e];
    if (k === e && !first.gap) parts.push(`{${extText(P[first.idx])}}`);
    else {
      const lo = first.gap ? (first.idx === 0 ? null : P[first.idx - 1]) : P[first.idx], loClosed = !first.gap;
      const hi = last.gap ? (last.idx === n ? null : P[last.idx]) : P[last.idx], hiClosed = !last.gap;
      parts.push(`${lo && loClosed ? "[" : "("}${lo ? extText(lo) : "-inf"}, ${hi ? extText(hi) : "inf"}${hi && hiClosed ? "]" : ")"}`);
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
function rfOfPure(e: Expr, name: string): RF | null { try { const x = toXQ(e, { name, rads: [], sigma: new Map() }); return xIsPure(x) ? (x.get(0) ?? rfConst(ZERO)) : null; } catch (err) { if (err instanceof Unsupported) return null; throw err; } }
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
    if (to.critical.some((r) => !r.y.isZero())) return none;
    const roots = to.critical.map((r) => r.x); let prod: Poly = [ONE]; for (const r of roots) prod = pmul(prod, [r.neg(), ONE]);
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
/** E4: an explicit claim that the equation has no real solution. It is judged as the exact empty solution set, never trusted. */
const NO_SOLUTION_CLAIM = /^\s*(?:so\s+|hence\s+|therefore\s+|thus\s+)?(?:there\s+(?:is|are)\s+)?no\s+(?:real\s+)?solutions?\.?\s*$|^\s*(?:the\s+)?solution\s+set\s+is\s+(?:empty|\u2205)\.?\s*$|^\s*(?:x\s*\u2208\s*)?\u2205\s*$/i;
/** E4: a stated method with no assertion ("Take square roots on both sides"). It carries no mathematical claim, so it can never be verified, and it is not a conclusion. */
const PROCEDURAL_PROSE = /^\s*(?:now[,\s]+|then[,\s]+|next[,\s]+|first[,\s]+)?(?:we\s+(?:can|will|should|need\s+to|must)\s+)?(?:take|taking|divide|multiply|add|subtract|expand|factori[sz]e|factor|simplify|square|cancel|isolate|substitute|solve|apply|use|move|combine|cross[- ]multiply|rearrange|collect|clear|eliminate|complete\s+the\s+square)\b(?!.*(?:\bis\b|\bare\b|\bso\b|\btherefore\b|\bhence\b|\bthus\b|\bgives?\b|\bmeans?\b|\bequals?\b|\bbecause\b|\bsince\b|[=<>\d]))[^.]*\.?\s*$/i;
/** E4: a function-value remark such as "f(x)=x^2 gives f(2)=f(-2)=4": each application is evaluated exactly; null when the line is not of this shape. */
const FUNCTION_REMARK = /^\s*([A-Za-z])\s*\(\s*([A-Za-z])\s*\)\s*=\s*(.+?)\s+gives\s+(.+?)\s*$/i;
function functionRemarkTruth(text: string): boolean | null {
  const m = FUNCTION_REMARK.exec(text); if (!m) return null;
  const body = parseNaturalWorking({ format: "natural", text: m[3] }), segments = m[4].split("=").map((x) => x.trim());
  if (body.classification !== "parsed" || body.lines.length !== 1 || body.lines[0].relation.kind !== "expression" || segments.length < 2) return null;
  const expr = body.lines[0].relation.expression, app = new RegExp(`^${m[1]}\\s*\\(\\s*(.+)\\s*\\)$`);
  const value = (t: string): Ext | null => { const r = parseNaturalWorking({ format: "natural", text: t }); if (r.classification !== "parsed" || r.lines.length !== 1 || r.lines[0].relation.kind !== "expression") throw new Unsupported("unparseable value in a function remark"); return evalAt(r.lines[0].relation.expression, rat(ZERO), "\u0000"); };
  const target = value(segments[segments.length - 1]); if (!target) throw new Unsupported("undefined value in a function remark");
  let all = true;
  for (const seg of segments.slice(0, -1)) {
    const a = app.exec(seg); if (!a) return null;
    const at = value(a[1]); if (!at) throw new Unsupported("undefined argument in a function remark");
    const out = evalAt(expr, at, m[2]); if (!out) throw new Unsupported("the function is undefined at the argument");
    if (!eZero(eAdd(out, eNeg(target)))) all = false;
  }
  return all;
}
const emptyClaimStmt = (text: string): Stmt => ({ kind: "set", text, critical: [], holds: () => false, defined: () => true, emptyClaim: true });
const COMPLETENESS_CLAIM = /\b(?:the\s+)?(?:complete|full|entire|whole)\s+(?:solution|answer|set)\b|\bthis is (?:the )?(?:only|whole|entire|complete)\b|\ball (?:the )?solutions\b|\bthe only solution\b/i;
const UNIVERSAL_CLAIM = /\b(?:holds|true|valid)\s+for\s+(?:all|every|any)\b|\bfor\s+(?:all|every|any)\s+(?:real\s+)?(?:x|values?|numbers?)\b|\bis an identity\b|\bidentity\b/i;
export type CheckerStatus = "verified-valid" | "verified-invalid" | "incomplete" | "unsupported" | "inconclusive" | "resource-exhausted";
export interface CheckedLine {
  index: number; status: CheckerStatus; relation: "equivalent" | "consequence" | "narrowing" | "widening" | "incomparable" | "independent-true" | "independent-false" | "completeness-claim" | "universal-claim" | "unsupported" | "inconclusive" | "numeric-equal" | "numeric-different";
  detail: string; solutionSet: string | null; evidence: { checker: "u4+exact-solution-set" | "exact-solution-set" | "exact-arithmetic" | "u4-identity" | "exact-polynomial-identity" | "u4+exact-linear-system"; u4: U4Evidence | null } | null;
}
export interface AlgebraCheck {
  contract: typeof INDEPENDENT_CHECKER_CONTRACT; scope: string; mode: "solution-set" | "numeric-value" | "expression-identity" | "linear-system" | "evaluation" | "none";
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
  else if (r.kind === "conjunction") r.parts.forEach((p) => { variablesOf(p.left, set); variablesOf(p.right, set); });
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


/* ================================================================== E4: exact multivariable engine
 * Independent of math-core, the adapters and M3. Exact bigint-rational arithmetic only: no floating point anywhere.
 *   - identifier splitting ("6uv" is 6*u*v) when every letter is a single-letter variable of the problem;
 *   - sparse multivariate polynomials over Q (bounded terms / degree / variables);
 *   - linear systems: every working line is checked to be an exact consequence of the ORIGINAL equations by exhibiting the
 *     rational combination  line = sum c_j * E_j  and having the U4 kernel re-derive that identity; a line that is not a
 *     consequence is refuted by an exact point of the solution space where it is false;
 *   - expression identities and "evaluate when ..." by exact polynomial equality.
 */
type MPoly = Map<string, { c: Q; mono: [string, number][] }>;
const MP_LIMITS = { maxTerms: 400, maxDegree: 12, maxVars: 6, maxEquations: 8, maxCombinationSize: 12 } as const;
const mpKeyOf = (mono: [string, number][]) => mono.map(([n, e]) => `${n}^${e}`).join("*");
const mpTerm = (c: Q, mono: [string, number][]): MPoly => { const m: MPoly = new Map(); if (!c.isZero()) m.set(mpKeyOf(mono), { c, mono }); return m; };
function mpAdd(a: MPoly, b: MPoly): MPoly {
  const r: MPoly = new Map(a);
  for (const [k, t] of b) { const o = r.get(k); if (o) { const c = o.c.add(t.c); if (c.isZero()) r.delete(k); else r.set(k, { c, mono: t.mono }); } else r.set(k, t); }
  if (r.size > MP_LIMITS.maxTerms) throw new Exhausted("too many polynomial terms"); return r;
}
function mpMul(a: MPoly, b: MPoly): MPoly {
  const r: MPoly = new Map();
  for (const x of a.values()) for (const y of b.values()) {
    const e = new Map<string, number>(); for (const [n, k] of x.mono) e.set(n, k); for (const [n, k] of y.mono) e.set(n, (e.get(n) ?? 0) + k);
    const mono = [...e.entries()].sort((p0, p1) => (p0[0] < p1[0] ? -1 : 1)) as [string, number][];
    if (mono.reduce((acc, [, k]) => acc + k, 0) > MP_LIMITS.maxDegree) throw new Exhausted("polynomial degree limit");
    const key = mpKeyOf(mono), o = r.get(key), c = x.c.mul(y.c).add(o ? o.c : ZERO);
    if (c.isZero()) r.delete(key); else r.set(key, { c, mono });
    if (r.size > MP_LIMITS.maxTerms) throw new Exhausted("too many polynomial terms");
  }
  return r;
}
const mpScale = (a: MPoly, k: Q): MPoly => { const r: MPoly = new Map(); if (k.isZero()) return r; for (const [key, t] of a) r.set(key, { c: t.c.mul(k), mono: t.mono }); return r; };
const mpOne = (): MPoly => mpTerm(ONE, []);
function mpPow(b: MPoly, n: number): MPoly { let acc = mpOne(); for (let i = 0; i < n; i++) acc = mpMul(acc, b); return acc; }
function mpConstantOf(p: MPoly): Q | null { if (p.size === 0) return ZERO; if (p.size === 1) { const t = [...p.values()][0]; if (t.mono.length === 0) return t.c; } return null; }
function mpFromExpr(e: Expr): MPoly {
  switch (e.kind) {
    case "constant": return mpTerm(readRat(e.value), []);
    case "variable": return mpTerm(ONE, [[e.name, 1]]);
    case "add": return e.terms.map(mpFromExpr).reduce(mpAdd, new Map() as MPoly);
    case "multiply": return e.factors.map(mpFromExpr).reduce((a, b) => mpMul(a, b), mpOne());
    case "power": {
      if (!Number.isInteger(e.exponent) || Math.abs(e.exponent) > MP_LIMITS.maxDegree) throw new Unsupported("non-integer or large exponent");
      const b = mpFromExpr(e.base);
      if (e.exponent < 0) { const c = mpConstantOf(b); if (!c || c.isZero()) throw new Unsupported("division by a non-constant or by zero is outside the multivariable polynomial scope"); return mpPow(mpTerm(ONE.div(c), []), -e.exponent); }
      return mpPow(b, e.exponent);
    }
    default: throw new Unsupported(`${e.kind} is outside the multivariable polynomial scope`);
  }
}
const mpVars = (p: MPoly): string[] => [...new Set([...p.values()].flatMap((t) => t.mono.map(([n]) => n)))].sort();
function mpEval(p: MPoly, env: Map<string, Q>): Q {
  let acc = ZERO;
  for (const t of p.values()) { let v = t.c; for (const [n, k] of t.mono) { const x = env.get(n); if (!x) throw new Unsupported(`no value for ${n}`); for (let i = 0; i < k; i++) v = v.mul(x); } acc = acc.add(v); }
  return acc;
}
const mpEqual = (a: MPoly, b: MPoly) => mpAdd(a, mpScale(b, q(-1))).size === 0;

/** "uv" -> u*v when every letter is a single-letter variable that appears in the working or the problem and "uv" is not itself a declared name. */
function mapVariables(e: Expr, f: (name: string) => Expr): Expr {
  switch (e.kind) {
    case "variable": return f(e.name);
    case "add": return { ...e, terms: e.terms.map((t) => mapVariables(t, f)) };
    case "multiply": return { ...e, factors: e.factors.map((t) => mapVariables(t, f)) };
    case "power": return { ...e, base: mapVariables(e.base, f) };
    case "abs": return { ...e, argument: mapVariables(e.argument, f) };
    case "root": return { ...e, radicand: mapVariables(e.radicand, f) };
    default: return e;
  }
}
function relationExprs(r: NaturalRelation): Expr[] {
  if (r.kind === "equation" || r.kind === "inequality") return [r.left, r.right];
  if (r.kind === "expression") return [r.expression];
  if (r.kind === "conjunction") return r.parts.flatMap((p) => [p.left, p.right]);
  if (r.kind === "solution-set") return r.values;
  return [];
}
function mapRelation(r: NaturalRelation, f: (e: Expr) => Expr): NaturalRelation {
  if (r.kind === "equation") return { ...r, left: f(r.left), right: f(r.right) };
  if (r.kind === "inequality") return { ...r, left: f(r.left), right: f(r.right) };
  if (r.kind === "expression") return { ...r, expression: f(r.expression) };
  if (r.kind === "conjunction") return { ...r, parts: r.parts.map((p) => ({ ...p, left: f(p.left), right: f(p.right) })) };
  if (r.kind === "solution-set") return { ...r, values: r.values.map(f) };
  return r;
}
function splitIdentifiers(statementRel: NaturalRelation, rels: NaturalRelation[]): { statement: NaturalRelation; rels: NaturalRelation[] } {
  const all = [statementRel, ...rels], single = new Set<string>();
  const collect = (e: Expr) => { try { for (const n of variablesOf(e)) { if (n.length === 1) single.add(n); } } catch (err) { if (!(err instanceof Unsupported)) throw err; } };
  for (const r of all) relationExprs(r).forEach(collect);
  const f = (e: Expr): Expr => mapVariables(e, (n) => (n.length > 1 && /^[A-Za-z]+$/.test(n) && [...n].every((ch) => single.has(ch)) ? { kind: "multiply", factors: [...n].map((ch) => ({ kind: "variable", name: ch }) as Expr) } as Expr : { kind: "variable", name: n }));
  return { statement: mapRelation(statementRel, f), rels: rels.map((r) => mapRelation(r, f)) };
}

/* ---- exact linear algebra over Q */
/** A particular solution of A x = b (free variables 0), or null when inconsistent. */
function solveLinear(A: Q[][], b: Q[]): Q[] | null {
  const m = A.length, n = m ? A[0].length : 0, M = A.map((r, i) => [...r, b[i]]); const pivots: number[] = []; let row = 0;
  for (let col = 0; col < n && row < m; col++) {
    let pr = -1; for (let r = row; r < m; r++) if (!M[r][col].isZero()) { pr = r; break; }
    if (pr < 0) continue; [M[row], M[pr]] = [M[pr], M[row]]; const inv = ONE.div(M[row][col]); M[row] = M[row].map((v) => v.mul(inv));
    for (let r = 0; r < m; r++) if (r !== row && !M[r][col].isZero()) { const f = M[r][col]; M[r] = M[r].map((v, k) => v.sub(f.mul(M[row][k]))); }
    pivots.push(col); row++;
  }
  for (let r = row; r < m; r++) if (!M[r][n].isZero()) return null;
  const x = Array.from({ length: n }, () => ZERO); pivots.forEach((c, i) => { x[c] = M[i][n]; }); return x;
}
/** coefficients c with sum_j c_j rows_j = target (rows are [a_1..a_n, const]), or null */
function combinationOf(rows: Q[][], target: Q[]): Q[] | null {
  if (!rows.length) return target.every((v) => v.isZero()) ? [] : null;
  const width = target.length, A = Array.from({ length: width }, (_, col) => rows.map((r) => r[col]));
  return solveLinear(A, target);
}
const pointOf = (rows: Q[][], nvars: number): Q[] | null => rows.length ? solveLinear(rows.map((r) => r.slice(0, nvars)), rows.map((r) => r[nvars].neg())) : Array.from({ length: nvars }, () => ZERO);
const rowExpr = (row: Q[], V: string[]): Expr => {
  const terms: Expr[] = []; V.forEach((v, i) => { if (!row[i].isZero()) terms.push({ kind: "multiply", factors: [{ kind: "constant", value: row[i].text() }, { kind: "variable", name: v }] } as Expr); });
  if (!row[V.length].isZero() || !terms.length) terms.push({ kind: "constant", value: row[V.length].text() }); return terms.length === 1 ? terms[0] : { kind: "add", terms };
};
const diffExpr = (l: Expr, r: Expr): Expr => sumExpr(l, r);
function u4Replay(before: Expr, after: Expr): U4Evidence {
  const c = certify(before, after);
  return { outcome: c.outcome, multiplier: "linear-combination", direction: "equal", restrictions: c.restrictions, rules: c.rules, digest: c.digest };
}
const NO_SOLUTION_SYSTEM = NO_SOLUTION_CLAIM;
const isBareVariable = (e: Expr) => e.kind === "variable";
function isSolvedAtom(l: Expr, r: Expr): boolean {
  const mentions = (e: Expr, n: string) => { try { return variablesOf(e).has(n); } catch { return true; } };
  return (isBareVariable(l) && !mentions(r, (l as { name: string }).name)) || (isBareVariable(r) && !mentions(l, (r as { name: string }).name));
}
const MV_SCOPE = "E4 multivariable: rational-coefficient polynomial expressions, linear systems (consequence by exact combination of the original equations), evaluation at exact rational bindings" as const;
const mvBase = (mode: AlgebraCheck["mode"], authority: AlgebraCheck["completenessAuthority"], lines: CheckedLine[], u4Steps: number, exactSteps: number, problemSet: string | null, finalSet: string | null) =>
  ({ contract: INDEPENDENT_CHECKER_CONTRACT, scope: `${CHECKER_SCOPE}; ${MV_SCOPE}`, mode, completenessAuthority: authority, lines, problemSolutionSet: problemSet, finalSolutionSet: finalSet, restrictions: [] as string[], u4Steps, exactSteps });

function describeAffine(rows: Q[][], V: string[]): string {
  const pt = pointOf(rows, V.length); if (!pt) return "no solution";
  const full = rows.length && solveLinear(rows.map((r) => r.slice(0, V.length)), rows.map((r) => r[V.length].neg())) !== null;
  void full; const rank = affineRank(rows, V.length);
  return rank === V.length ? `(${V.join(", ")}) = (${pt.map((x) => x.text()).join(", ")})` : `a solution set of dimension ${V.length - rank}`;
}
function affineRank(rows: Q[][], nvars: number): number {
  const M = rows.map((r) => r.slice(0, nvars)); let rank = 0;
  for (let col = 0; col < nvars && rank < M.length; col++) {
    let pr = -1; for (let r = rank; r < M.length; r++) if (!M[r][col].isZero()) { pr = r; break; }
    if (pr < 0) continue; [M[rank], M[pr]] = [M[pr], M[rank]]; for (let r = rank + 1; r < M.length; r++) if (!M[r][col].isZero()) { const f = M[r][col].div(M[rank][col]); M[r] = M[r].map((v, k) => v.sub(f.mul(M[rank][k]))); } rank++;
  }
  return rank;
}

function linearSystemMode(stmtRel: NaturalRelation & { kind: "conjunction" }, rels: NaturalRelation[], texts: string[], classOf: string[]): AlgebraCheck {
  const eqPolys = stmtRel.parts.map((p) => mpFromExpr(diffExpr(p.left, p.right)));
  const V = [...new Set(eqPolys.flatMap(mpVars))].sort();
  if (V.length < 2 || V.length > MP_LIMITS.maxVars) throw new Unsupported("a linear system needs between two and six unknowns");
  if (eqPolys.length > MP_LIMITS.maxEquations) throw new Exhausted("too many equations");
  const rowsOf = (p: MPoly): Q[] | null => { const r = V.map(() => ZERO).concat([ZERO]); for (const t of p.values()) { if (!t.mono.length) { r[V.length] = t.c; continue; } if (t.mono.length > 1 || t.mono[0][1] !== 1) return null; const i = V.indexOf(t.mono[0][0]); if (i < 0) throw new Unsupported(`the variable ${t.mono[0][0]} is not an unknown of the problem`); r[i] = t.c; } return r; };
  const S0 = eqPolys.map((p) => { const r = rowsOf(p); if (!r) throw new Unsupported("the system is not linear"); return r; });
  const E: Expr[] = stmtRel.parts.map((p) => diffExpr(p.left, p.right));
  const point0 = pointOf(S0, V.length), consistent = point0 !== null, problemDesc = describeAffine(S0, V);
  const out: CheckedLine[] = []; let firstInvalid: number | null = null, unresolved: number | null = null, narrowingAt: number | null = null, u4Steps = 0, exactSteps = 0;
  const lineRows: (Q[][] | "claim-none" | null)[] = []; const solvedLine: boolean[] = [];
  const claimRefutation = (rows: Q[]): string => `the line ${rows.map((x) => x.text()).join(" ")} is not implied by the system`;
  void claimRefutation;
  rels.forEach((rel, i) => {
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (firstInvalid !== null || unresolved !== null) { lineRows.push(null); solvedLine.push(false); push({ status: "inconclusive", relation: "inconclusive", detail: firstInvalid !== null ? `depends on the invalid line ${firstInvalid + 1}` : `depends on the unverified line ${unresolved! + 1}`, solutionSet: null, evidence: null }); return; }
    try {
      if (NO_SOLUTION_SYSTEM.test(texts[i]) && (classOf[i] === "prose" || rel.kind === "expression")) {
        lineRows.push("claim-none"); solvedLine.push(true); exactSteps++;
        if (!consistent) {
          const k = combinationOf(S0, [...V.map(() => ZERO), ONE]);
          const ev = k ? u4Replay({ kind: "constant", value: "1" }, k.map((c, j) => ({ kind: "multiply", factors: [{ kind: "constant", value: c.text() }, E[j]] }) as Expr).reduce((a, b) => ({ kind: "add", terms: [a, b] }) as Expr)) : null;
          if (ev && ev.outcome === "verified") u4Steps++;
          push({ status: "verified-valid", relation: "completeness-claim", detail: "the system is inconsistent: the equations combine exactly to the contradiction 0 = 1", solutionSet: "no solution", evidence: { checker: "u4+exact-linear-system", u4: ev } });
        } else { firstInvalid = i; push({ status: "verified-invalid", relation: "completeness-claim", detail: `the claim of no solution is false: the system has the solution ${problemDesc}`, solutionSet: "no solution", evidence: { checker: "exact-solution-set", u4: null } }); }
        return;
      }
      if (classOf[i] === "prose") throw new Unsupported("prose that is not a recognised mathematical claim");
      const atoms = rel.kind === "equation" ? [rel] : rel.kind === "conjunction" ? rel.parts : null;
      if (!atoms) throw new Unsupported(`${rel.kind} lines are outside the linear-system scope`);
      const rowsHere: Q[][] = []; let worst: "valid" | "partial" | "invalid" = "valid", detail = "", evidenceU4: U4Evidence | null = null, allU4 = true, equalToProblem = true;
      for (const a of atoms) {
        const d = diffExpr(a.left, a.right), p = mpFromExpr(d), r = rowsOf(p);
        if (!r) throw new Unsupported("a nonlinear line is outside the linear-system scope");
        rowsHere.push(r);
        const k = combinationOf(S0, r);
        if (k) {
          const comb = k.map((c, j) => ({ kind: "multiply", factors: [{ kind: "constant", value: c.text() }, E[j]] }) as Expr);
          const after: Expr = comb.length ? comb.reduce((x, y) => ({ kind: "add", terms: [x, y] }) as Expr) : { kind: "constant", value: "0" };
          if (k.filter((c) => !c.isZero()).length > MP_LIMITS.maxCombinationSize) throw new Exhausted("combination too large");
          const ev = u4Replay(d, after); evidenceU4 = ev;
          if (ev.outcome === "verified") u4Steps++; else { allU4 = false; throw new Unsupported("the independent kernel could not re-derive the line as a combination of the equations"); }
        } else if (!consistent) { worst = "invalid"; detail = "the system has no solution, and this line is not derived from the equations"; }
        else {
          const meets = solveLinear([...S0, r].map((x) => x.slice(0, V.length)), [...S0, r].map((x) => x[V.length].neg())) !== null;
          if (meets) { if (worst === "valid") { worst = "partial"; detail = `this line holds for only some solutions of the system (it narrows the solution set ${problemDesc})`; } }
          else { worst = "invalid"; const w = point0!; detail = `false for the solution ${V.map((v, j) => `${v} = ${w[j].text()}`).join(", ")} of the system (the line evaluates to ${r.slice(0, V.length).reduce((acc, c, j) => acc.add(c.mul(w[j])), r[V.length]).text()} instead of 0)`; }
        }
      }
      if (worst === "valid") { equalToProblem = S0.every((r0) => combinationOf(rowsHere, r0) !== null); }
      lineRows.push(rowsHere); solvedLine.push(atoms.every((a) => isSolvedAtom(a.left, a.right))); exactSteps += worst === "valid" ? 0 : 1;
      if (worst === "invalid") { firstInvalid = i; push({ status: "verified-invalid", relation: "incomparable", detail, solutionSet: null, evidence: { checker: "exact-solution-set", u4: null } }); }
      else if (worst === "partial") { narrowingAt = narrowingAt ?? i; push({ status: "incomplete", relation: "narrowing", detail, solutionSet: null, evidence: { checker: "exact-solution-set", u4: null } }); }
      else push({ status: "verified-valid", relation: equalToProblem ? "equivalent" : "consequence", detail: equalToProblem ? "equivalent to the system" : "an exact combination of the original equations", solutionSet: null, evidence: { checker: allU4 && evidenceU4 ? "u4+exact-linear-system" : "exact-solution-set", u4: evidenceU4 } });
    } catch (e) {
      if (!(e instanceof Unsupported)) throw e;
      lineRows.push(null); solvedLine.push(false); unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: e.message, solutionSet: null, evidence: null });
    }
  });
  const base = mvBase("linear-system", "checker", out, u4Steps, exactSteps, problemDesc, null);
  const fin = (outcome: AlgebraCheck["outcome"], firstInv: number | null, why: string, extra: string[] = [], finalSet: string | null = null): AlgebraCheck => ({ ...base, outcome, firstInvalidStep: firstInv, finalSolutionSet: finalSet, obligations: extra, justification: why });
  if (firstInvalid !== null) return fin("invalid", firstInvalid, `line ${firstInvalid + 1}: ${out[firstInvalid].detail}`);
  if (unresolved !== null) return fin("unsupported", null, `line ${unresolved + 1} cannot be verified independently: ${out[unresolved].detail}`, [`verify line ${unresolved + 1}`]);
  if (narrowingAt !== null) return fin("incomplete", null, `line ${narrowingAt + 1}: ${out[narrowingAt].detail}`, ["a conclusion must describe the whole solution set"]);
  if (!rels.length) return fin("incomplete", null, "no working was supplied", ["state the solution"]);
  if (!consistent) {
    const last = lineRows[rels.length - 1];
    return last === "claim-none" ? fin("verified", null, "every line is an exact consequence of the system and the conclusion of no solution is exact", [], "no solution") : fin("incomplete", null, "the working does not conclude that the system has no solution", ["state that the system has no solution"]);
  }
  // conclusion = the trailing run of solved-form lines
  let start = rels.length; while (start > 0 && solvedLine[start - 1] && Array.isArray(lineRows[start - 1])) start--;
  if (start === rels.length) return fin("incomplete", null, "the working does not reach a stated solution", ["state the solution of the system"]);
  const C = (lineRows.slice(start) as Q[][][]).flat();
  const determines = S0.every((r0) => combinationOf(C, r0) !== null);
  const finalSet = describeAffine(C, V);
  if (!determines) return fin("incomplete", null, `the stated conclusion (${finalSet}) does not determine the full solution set (${problemDesc})`, ["state the complete solution of the system"], finalSet);
  return fin("verified", null, `every line is an exact consequence of the system and the stated conclusion equals its solution set ${problemDesc}`, [], finalSet);
}


function isExpandedForm(e: Expr, monomials: number): boolean {
  const term = (t: Expr): boolean => {
    if (t.kind === "constant" || t.kind === "variable") return true;
    if (t.kind === "multiply") return t.factors.every(term);
    if (t.kind === "power") return Number.isInteger(t.exponent) && t.exponent >= 0 && (t.base.kind === "variable" || t.base.kind === "constant");
    return false;
  };
  const flat = (x: Expr): Expr[] => (x.kind === "add" ? x.terms.flatMap(flat) : [x]);
  const terms = flat(e);
  return terms.every(term) && terms.length === Math.max(1, monomials);
}
function isPlainNumber(e: Expr): boolean {
  let denominators = 0;
  const ok = (t: Expr): boolean => {
    if (t.kind === "constant") return true;
    if (t.kind === "multiply") return t.factors.every(ok);
    if (t.kind === "power" && t.exponent === -1 && t.base.kind === "constant") { denominators++; return true; }
    return false;
  };
  return ok(e) && denominators <= 1;
}
function polynomialExpressionMode(expr0: Expr, verb: string | null, rels: NaturalRelation[], texts: string[], classOf: string[]): AlgebraCheck {
  const P0 = mpFromExpr(expr0); nodeCount(expr0);
  if (mpVars(P0).length > MP_LIMITS.maxVars) throw new Unsupported("too many variables");
  const out: CheckedLine[] = []; let prev = expr0, bad: number | null = null, unresolved: number | null = null, u4Steps = 0, exactSteps = 0, last: Expr | null = null;
  rels.forEach((rel, i) => {
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (bad !== null || unresolved !== null) { push({ status: "inconclusive", relation: "inconclusive", detail: "depends on an earlier unresolved line", solutionSet: null, evidence: null }); return; }
    try {
      if (classOf[i] === "prose" || rel.kind !== "expression") throw new Unsupported("not an expression line");
      const next = rel.expression; nodeCount(next);
      const P = mpFromExpr(next);
      if (mpEqual(P, P0)) {
        const c = certify(prev, next), viaU4 = c.outcome === "verified";
        if (viaU4) u4Steps++; else exactSteps++;
        push({ status: "verified-valid", relation: "equivalent", detail: "has exactly the same expanded polynomial as the problem", solutionSet: null, evidence: { checker: viaU4 ? "u4-identity" : "exact-polynomial-identity", u4: viaU4 ? { outcome: "verified", multiplier: "1", direction: "equal", restrictions: c.restrictions, rules: c.rules, digest: c.digest } : null } });
        prev = next; last = next; return;
      }
      exactSteps++; bad = i;
      const diff = mpAdd(P, mpScale(P0, q(-1)));
      push({ status: "verified-invalid", relation: "incomparable", detail: `its expanded polynomial differs from the problem's (the difference has ${diff.size} nonzero term${diff.size === 1 ? "" : "s"})`, solutionSet: null, evidence: { checker: "exact-polynomial-identity", u4: null } });
    } catch (e) { if (!(e instanceof Unsupported)) throw e; unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: e.message, solutionSet: null, evidence: null }); }
  });
  const authority = verb === "expand" ? "checker" as const : "native" as const;
  const base = mvBase("expression-identity", authority, out, u4Steps, exactSteps, null, null);
  if (bad !== null) return { ...base, outcome: "invalid", firstInvalidStep: bad, obligations: [], justification: `line ${bad + 1}: ${out[bad].detail}` };
  if (unresolved !== null) return { ...base, outcome: "unsupported", firstInvalidStep: null, obligations: [`verify line ${unresolved + 1}`], justification: `line ${unresolved + 1} cannot be verified independently` };
  if (authority === "checker") {
    if (!last || !isExpandedForm(last, P0.size)) return { ...base, outcome: "incomplete", firstInvalidStep: null, obligations: ["write the result as a fully expanded polynomial with like terms combined"], justification: "every line is exact, but the final line is not a fully expanded polynomial" };
    return { ...base, outcome: "verified", firstInvalidStep: null, obligations: [], justification: "every line has exactly the problem's polynomial and the final line is fully expanded" };
  }
  return { ...base, outcome: "verified", firstInvalidStep: null, obligations: [], justification: "every line has exactly the problem's polynomial (form completeness is judged natively)" };
}

function evaluationMode(expr0: Expr, bindings: Map<string, Q>, rels: NaturalRelation[], classOf: string[]): AlgebraCheck {
  const P0 = mpFromExpr(expr0); nodeCount(expr0);
  for (const v of mpVars(P0)) if (!bindings.has(v)) throw new Unsupported(`the problem does not give a value for ${v}`);
  const V0 = mpEval(P0, bindings);
  const out: CheckedLine[] = []; let bad: number | null = null, unresolved: number | null = null, u4Steps = 0, exactSteps = 0, last: Expr | null = null, prev = expr0;
  rels.forEach((rel, i) => {
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (bad !== null || unresolved !== null) { push({ status: "inconclusive", relation: "inconclusive", detail: "depends on an earlier unresolved line", solutionSet: null, evidence: null }); return; }
    try {
      if (classOf[i] === "prose" || rel.kind !== "expression") throw new Unsupported("not an expression line");
      const next = rel.expression; nodeCount(next); const P = mpFromExpr(next), vars = mpVars(P);
      if (!vars.length) {
        exactSteps++; last = next;
        if (mpConstantOf(P)!.eq(V0)) push({ status: "verified-valid", relation: "numeric-equal", detail: `evaluates exactly to ${V0.text()}, the value of the problem`, solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } });
        else { bad = i; push({ status: "verified-invalid", relation: "numeric-different", detail: `evaluates exactly to ${mpConstantOf(P)!.text()}, but the problem's value is ${V0.text()}`, solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } }); }
        return;
      }
      if (mpEqual(P, P0)) {
        const c = certify(prev, next), viaU4 = c.outcome === "verified"; if (viaU4) u4Steps++; else exactSteps++; last = next; prev = next;
        push({ status: "verified-valid", relation: "equivalent", detail: "the same polynomial as the problem's expression", solutionSet: null, evidence: { checker: viaU4 ? "u4-identity" : "exact-polynomial-identity", u4: viaU4 ? { outcome: "verified", multiplier: "1", direction: "equal", restrictions: c.restrictions, rules: c.rules, digest: c.digest } : null } });
        return;
      }
      for (const v of vars) if (!bindings.has(v)) throw new Unsupported(`the variable ${v} has no value in the problem`);
      const val = mpEval(P, bindings); exactSteps++; last = null;
      if (!val.eq(V0)) { bad = i; push({ status: "verified-invalid", relation: "numeric-different", detail: `with the given values this line is ${val.text()}, but the problem's value is ${V0.text()}`, solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } }); return; }
      throw new Unsupported("a different expression with the same value; the rewriting is not justified by an exact identity");
    } catch (e) { if (!(e instanceof Unsupported)) throw e; unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: e.message, solutionSet: null, evidence: null }); }
  });
  const base = mvBase("evaluation", "checker", out, u4Steps, exactSteps, V0.text(), null);
  if (bad !== null) return { ...base, outcome: "invalid", firstInvalidStep: bad, obligations: [], justification: `line ${bad + 1}: ${out[bad].detail}` };
  if (unresolved !== null) return { ...base, outcome: "unsupported", firstInvalidStep: null, obligations: [`verify line ${unresolved + 1}`], justification: `line ${unresolved + 1} cannot be verified independently` };
  if (!rels.length) return { ...base, outcome: "incomplete", firstInvalidStep: null, obligations: ["evaluate the expression"], justification: "no working was supplied" };
  const lastRel = rels[rels.length - 1];
  if (lastRel.kind !== "expression" || !isPlainNumber(lastRel.expression)) return { ...base, outcome: "incomplete", firstInvalidStep: null, finalSolutionSet: null, obligations: ["finish the evaluation to a single number"], justification: "every line is exact, but the evaluation is not carried through to a single number" };
  void last;
  return { ...base, outcome: "verified", firstInvalidStep: null, finalSolutionSet: V0.text(), obligations: [], justification: `every line has the problem's exact value and the result ${V0.text()} is stated` };
}
function stripVerb(statement: string): { verb: string | null; body: string } {
  const m = /^\s*(expand|factori[sz]e|factor|simplify|evaluate|compute|calculate|find the value of)\b[:\s]*(.*)$/i.exec(statement);
  if (!m) return { verb: null, body: statement };
  const v = m[1].toLowerCase(); return { verb: v.startsWith("factor") ? "factor" : v, body: m[2] };
}

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
  const { verb, body: body0 } = stripVerb(statement);
  // E7 repair C: where a condition is written must not change what it means: leading inequality-only conditions ("x>2, x^2=16") are moved behind the equation they restrict
  const lead = /^((?:[^,=<>≤≥]*[<>≤≥][^,=<>≤≥]*,\s*)+)([^<>≤≥]*=[^<>≤≥]*)$/.exec(body0);
  const body = lead ? `${lead[2].trim()}, ${lead[1].trim().replace(/,$/, "")}` : body0;
  const whenM = /^(.*?)\s+(?:when|for|if|where|given(?:\s+that)?)\s+(.+)$/i.exec(body);
  const ps = parseNaturalWorking({ format: "natural", text: whenM ? whenM[1] : body });
  if (ps.classification !== "parsed" || ps.lines.length !== 1) return empty("unsupported", "the problem statement is not a single parseable mathematical statement");
  // E7 repair E: a numeral the parser dropped means the verdict would concern a different expression: that is unsupported, never invalid
  for (const [src, rel] of [[whenM ? whenM[1] : body, ps.lines[0]] as const, ...parsed.lines.map((l) => [l.source.text, l] as const)]) { const loss = parseFidelityLoss(src, rel); if (loss) throw new Unsupported(`parse fidelity: ${loss}`); }
  const split = splitIdentifiers(ps.lines[0].relation, parsed.lines.map((l) => l.relation));
  const rel0 = split.statement, lines = parsed.lines.map((l, i) => ({ ...l, relation: split.rels[i] }));
  const parsed2: NaturalParseResult = { ...parsed, lines };
  const names = new Set<string>(); relationVars(rel0, names); const classOf: string[] = lines.map((l) => (isProseExpression(l.relation) ? "prose" : "math"));
  const texts = lines.map((l) => l.source.text);
  // E7 repair C: premises are part of the problem wherever they are written (", x<0" after the equation, "where/for/given x<0" after it, or none). They are collected once, here, for every mode.
  const premises: NaturalRelation[] = [...(ps.lines[0].restrictions ?? [])];
  const solveProblem = rel0.kind === "equation" || rel0.kind === "inequality";
  if (whenM && solveProblem) {
    const pp = parseNaturalWorking({ format: "natural", text: whenM[2] });
    if (pp.classification !== "parsed" || pp.lines.length !== 1) throw new Unsupported("the condition attached to the problem is not parseable");
    const pr = pp.lines[0].relation, atoms = pr.kind === "conjunction" ? pr.parts : [pr];
    if (!atoms.every((a) => a.kind === "equation" || a.kind === "inequality")) throw new Unsupported("the condition attached to the problem must be equations or inequalities");
    premises.push(...atoms, ...(pp.lines[0].restrictions ?? []));
  }
  if (premises.length && !(solveProblem && rel0.kind !== "conjunction")) throw new Unsupported("a condition attached to this kind of problem is not supported (it is not silently ignored)");
  if (whenM && !solveProblem) {
    if (rel0.kind !== "expression") throw new Unsupported("an evaluation problem needs an expression");
    const bp = parseNaturalWorking({ format: "natural", text: whenM[2] });
    if (bp.classification !== "parsed" || bp.lines.length !== 1) throw new Unsupported("the given values are not parseable");
    const br = bp.lines[0].relation, atoms = br.kind === "equation" ? [br] : br.kind === "conjunction" ? br.parts : null;
    if (!atoms) throw new Unsupported("the given values must be equations such as a = 2");
    const bindings = new Map<string, Q>();
    for (const a of atoms) { if (a.left.kind !== "variable") throw new Unsupported("a given value must be of the form variable = number"); const v = constantValue(a.right); if (bindings.has(a.left.name)) throw new Unsupported("a variable is given two values"); bindings.set(a.left.name, v); }
    return evaluationMode(rel0.expression, bindings, lines.map((l) => l.relation), classOf);
  }
  if (rel0.kind === "conjunction") return linearSystemMode(rel0, lines.map((l) => l.relation), texts, classOf);
  lines.forEach((l, i) => { if (classOf[i] === "math") { try { relationVars(l.relation, names); } catch (e) { if (!(e instanceof Unsupported)) throw e; classOf[i] = "bad"; } } });
  if (rel0.kind === "expression" && (names.size >= 2 || verb === "expand")) return polynomialExpressionMode(rel0.expression, verb, lines.map((l) => l.relation), texts, classOf);
  if (names.size > 1) throw new Unsupported("more than one variable");
  const name = names.size ? [...names][0] : null;
  if (rel0.kind === "expression") return name === null ? numericMode(rel0.expression, parsed2, classOf) : identityMode(rel0.expression, parsed2, name, classOf);
  if (rel0.kind === "equation" || rel0.kind === "inequality") return solutionMode(rel0, parsed2, name, classOf, premises);
  throw new Unsupported(`${rel0.kind} problems are outside the checker scope`);
}

/** E7 repair C: the problem's solution set is the relation's solutions that also satisfy every premise (task-imposed conditions, wherever they were written) */
function withPremises(base: Stmt, premises: Stmt[], text: string): Stmt {
  if (!premises.length) return base;
  const all = [base, ...premises];
  return { kind: "set", text, critical: all.flatMap((x) => x.critical), holds: (v) => all.every((x) => x.holds(v)), defined: (v) => all.every((x) => x.defined(v)) };
}
type BuiltLine = Stmt | { claim: "completeness" | "universal" } | { error: string } | { closed: boolean | null };
/** each written line as a statement the profile can compare (shared by the full checker and the answer-first workflow) */
function builtLines(lines: NaturalParseResult["lines"], classOf: string[], name: string | null): BuiltLine[] {
  const text = (i: number) => lines[i].source.text;
  return lines.map((l, i) => {
    if (COMPLETENESS_CLAIM.test(text(i)) && (classOf[i] === "prose" || l.relation.kind === "expression")) return { claim: "completeness" as const };
    if (UNIVERSAL_CLAIM.test(text(i)) && (classOf[i] === "prose" || l.relation.kind === "expression")) return { claim: "universal" as const };
    if (NO_SOLUTION_CLAIM.test(text(i)) && (classOf[i] === "prose" || l.relation.kind === "expression")) return { ...emptyClaimStmt(text(i)) };
    { let remark: boolean | null = null; try { remark = functionRemarkTruth(text(i)); } catch (e) { if (!(e instanceof Unsupported)) throw e; return { error: e.message }; } if (remark !== null) return { closed: remark }; }
    if (classOf[i] === "prose") return { error: "prose that is not a recognised mathematical claim" };
    try {
      const rel = l.relation; const vs = new Set<string>(); relationVars(rel, vs);
      if (vs.size === 0 && (rel.kind === "equation" || rel.kind === "inequality")) { const s = stmtFromRelation(rel, null, text(i)); return { closed: s.defined(rat(ZERO)) ? s.holds(rat(ZERO)) : null }; }
      return stmtFromRelation(rel, name, text(i));
    } catch (e) { if (e instanceof Unsupported) return { error: e.message }; throw e; }
  });
}
function solutionMode(rel0: NaturalRelation, parsed: NaturalParseResult, name: string | null, classOf: string[], premiseRels: NaturalRelation[] = []): AlgebraCheck {
  if (name === null) throw new Unsupported("the problem statement has no variable");
  const premiseStmts = premiseRels.map((pr) => { const vs = new Set<string>(); relationVars(pr, vs); if ([...vs].some((n) => n !== name)) throw new Unsupported("a condition mentions a variable other than the one being solved"); return stmtFromRelation(pr, name, "premise"); });
  if (premiseStmts.length) { // contradictory premises: no value satisfies them, so there is nothing to solve under them
    const pf = profile(premiseStmts), only = pf.membership; if (premiseStmts.every((x) => x) && ![...pf.gaps.keys(), ...pf.points.keys()].some((k) => premiseStmts.every((x) => (k < pf.gaps.length ? x.holds(rat(pf.gaps[k])) : x.holds(pf.points[k - pf.gaps.length]))))) throw new Unsupported("the stated conditions contradict each other");
    void only;
  }
  const stmt0 = withPremises(stmtFromRelation(rel0, name, "problem"), premiseStmts, "problem with its conditions"), lines = parsed.lines;
  const out: CheckedLine[] = []; const chain: { stmt: Stmt; index: number; rel: NaturalRelation; solved: boolean }[] = [];
  let prev = stmt0, prevRel: SetRelation | null = null; void prevRel;
  let unresolved: number | null = null, firstInvalid: number | null = null, narrowing = -1, widening = -1, falseCompleteness: number | null = null, missingAssumptionAt: number | null = null;
  const obligations: string[] = []; let u4Steps = 0, exactSteps = 0;
  const stmts: Stmt[] = [stmt0]; const pending: { index: number; stmt: Stmt; from: Stmt; kind: "chain" }[] = [];
  const text = (i: number) => lines[i].source.text;
  // build statements first (profile needs all critical points)
  const built = builtLines(lines, classOf, name);
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
    else if (r === "superset") {
      // E4: a reduction is classified exactly. Dropping a true solution is a loss (or an outright error when no solution survives);
      // dropping only non-solutions is a justified candidate elimination when the previous set is a short finite list of candidates
      // (the exact partition has just proven every dropped candidate fails the ORIGINAL problem) or when the dropped points are undefined in the original.
      const Mp = prof.membership.get(prev)!, Ms = prof.membership.get(s)!, M0 = prof.membership.get(stmt0)!;
      const cells = (m: { gap: boolean[]; pt: boolean[] }) => [...m.gap, ...m.pt];
      const cp = cells(Mp), cs = cells(Ms), c0 = cells(M0);
      const dropsSolution = cp.some((v, k) => v && !cs[k] && c0[k]), anySolution = c0.some(Boolean), keepsSolution = cs.some((v, k) => v && c0[k]);
      const prevFinite = Mp.gap.every((v) => !v) && Mp.pt.filter(Boolean).length <= 8;
      const droppedUndefined = cp.every((v, k) => !(v && !cs[k]) || (k >= Mp.gap.length && undefined0[k - Mp.gap.length]));
      if (dropsSolution && anySolution && !keepsSolution) { firstInvalid = i; push({ status: "verified-invalid", relation: "narrowing", detail: `the step discards every solution of the original problem: ${desc(prev)} became ${desc(s)} but the problem's solution set is ${S0desc}`, solutionSet: desc(s), evidence: ev }); }
      else if (dropsSolution) { narrowing = narrowing < 0 ? i : narrowing; push({ status: "incomplete", relation: "narrowing", detail: `a valid reduction that loses solutions: ${desc(prev)} became ${desc(s)}`, solutionSet: desc(s), evidence: ev }); }
      else if ((prevFinite || droppedUndefined) && candidatePolicy === "shown") { narrowing = narrowing < 0 ? i : narrowing; push({ status: "incomplete", relation: "narrowing", detail: `a valid reduction that discards candidates (${desc(prev)} became ${desc(s)}) without showing the check against the original problem`, solutionSet: desc(s), evidence: ev }); }
      else if (prevFinite || droppedUndefined) push({ status: "verified-valid", relation: "narrowing", detail: `eliminates candidates that the exact check shows are not solutions of the original problem (${desc(prev)} became ${desc(s)})`, solutionSet: desc(s), evidence: ev });
      else { narrowing = narrowing < 0 ? i : narrowing; push({ status: "incomplete", relation: "narrowing", detail: `an unjustified jump from ${desc(prev)} to ${desc(s)}: the removed values are not shown to be non-solutions`, solutionSet: desc(s), evidence: ev }); }
    }
    else { firstInvalid = i; push({ status: "verified-invalid", relation: "incomparable", detail: `neither follows from nor is equivalent to the previous statement (${desc(prev)} versus ${desc(s)})`, solutionSet: desc(s), evidence: ev }); }
    if (firstInvalid === null) { chain.push({ stmt: s, index: i, rel: lines[i].relation, solved: !!s.emptyClaim || isSolvedForm(lines[i].relation, name ?? "x") }); prev = s; finalStmt = s; finalIndex = i; }
  }
  void pending; void stmts;
  const restrictions = prof.points.filter((_, k) => undefined0[k]).map((p) => `${name ?? "x"} != ${extText(p)}`);
  const base = { contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode: "solution-set" as const, completenessAuthority: "checker" as const, lines: out, problemSolutionSet: S0desc, restrictions, u4Steps, exactSteps };
  const result = (outcome: AlgebraCheck["outcome"], firstInv: number | null, why: string, extra: string[] = []): AlgebraCheck => ({ ...base, outcome, firstInvalidStep: firstInv, finalSolutionSet: finalStmt ? desc(finalStmt) : null, obligations: [...obligations, ...extra], justification: why });
  if (firstInvalid !== null) return result("invalid", firstInvalid, `line ${firstInvalid + 1}: ${out[firstInvalid].detail}`);
  if (unresolved !== null && narrowing < 0 && lines.slice(unresolved).every((_, k) => PROCEDURAL_PROSE.test(text(unresolved! + k)) && (classOf[unresolved! + k] === "prose" || lines[unresolved! + k].relation.kind === "expression")) && (!chain.length || !chain[chain.length - 1].solved))
    return result("incomplete", null, "the working describes a method but never states a result", ["state the result"]);
  if (unresolved !== null) return result("unsupported", null, `line ${unresolved + 1} cannot be verified independently: ${out[unresolved].detail}`, [`verify line ${unresolved + 1}`]);
  if (missingAssumptionAt !== null && falseCompleteness === null) return result("missing-assumption", null, `the conclusion ignores the domain restriction: ${restrictions.join(", ")}`, restrictions.map((r) => `state the restriction ${r}`));
  if (!finalStmt) return result("incomplete", null, "no mathematical conclusion about the variable was reached", ["state the solution"]);
  if (falseCompleteness !== null) return result("invalid", narrowing >= 0 ? narrowing : falseCompleteness, out[falseCompleteness].detail);
  if (narrowing >= 0 || (candidatePolicy === "shown" && widening >= 0)) return result("incomplete", null, candidatePolicy === "shown" && widening >= 0 ? "the working widened the solution set (for example by squaring) and later removed candidates without showing the check against the original problem" : "a step lost solutions or jumped to a smaller set without justification", [candidatePolicy === "shown" && widening >= 0 ? "verify each candidate in the original problem" : "justify every solution-changing step"]);
  if (!chain[chain.length - 1].solved) return result("incomplete", null, "the working is correct but the solution is not stated in solved form", ["state the solution explicitly"]);
  const rel = relate(prof, finalStmt, stmt0);
  if (rel === "incomparable") return result("invalid", finalIndex, `the final statement (${desc(finalStmt)}) is not related to the problem's solution set (${S0desc})`);
  if (rel === "superset") return result("invalid", finalIndex, `the final statement (${desc(finalStmt)}) includes values that are not solutions; the problem's solution set is ${S0desc}`);
  if (rel === "subset") return result("incomplete", null, `the conclusion (${desc(finalStmt)}) omits solutions: the problem's solution set is ${S0desc}`, [`include the remaining solutions: ${S0desc}`]);
  return result("verified", null, `every line is exact-equivalent to the problem or a proven candidate elimination, and the solution set ${S0desc} is stated`);
}

function numericMode(expr: Expr, parsed: NaturalParseResult, classOf: string[]): AlgebraCheck {
  const v0 = evalAt(expr, rat(ZERO), "\u0000"); if (!v0) throw new Unsupported("the problem expression is undefined");
  const out: CheckedLine[] = []; let bad: number | null = null, unresolved: number | null = null; let last: Ext | null = null; let lastKind: string = ""; let exact = 0;
  parsed.lines.forEach((l, i) => {
    const push = (c: Omit<CheckedLine, "index">) => out.push({ index: i, ...c });
    if (bad !== null || unresolved !== null) { push({ status: "inconclusive", relation: "inconclusive", detail: "depends on an earlier unresolved line", solutionSet: null, evidence: null }); return; }
    try {
      if (classOf[i] === "prose") throw new Unsupported("prose that is not a recognised mathematical claim");
      const rel = l.relation, ev = { checker: "exact-arithmetic" as const, u4: null };
      if (rel.kind === "expression") { const z = evalAt(rel.expression, rat(ZERO), "\u0000"); if (!z) throw new Unsupported("undefined value"); exact++; last = z; lastKind = rel.expression.kind;
        if (eZero(eAdd(z, eNeg(v0)))) push({ status: "verified-valid", relation: "numeric-equal", detail: "has exactly the same value as the problem", solutionSet: null, evidence: ev }); else { bad = i; push({ status: "verified-invalid", relation: "numeric-different", detail: "its exact value differs from the problem's value", solutionSet: null, evidence: ev }); } return; }
      if (rel.kind === "equation") { const a = evalAt(rel.left, rat(ZERO), "\u0000"), b = evalAt(rel.right, rat(ZERO), "\u0000"); if (!a || !b) throw new Unsupported("undefined value"); exact++;
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
      for (const t of [0, 1, -1, 2, 3, -2, 5].map((n) => rat(q(n)))) { const a = evalAt(prev, t, name), b = evalAt(next, t, name); if (a && b && !eZero(eAdd(a, eNeg(b)))) { bad = i; push({ status: "verified-invalid", relation: "incomparable", detail: `the expressions differ at ${name} = ${t.x.text()}`, solutionSet: null, evidence: { checker: "exact-arithmetic", u4: null } }); return; } }
      throw new Unsupported("the independent kernel cannot decide this expression equivalence");
    } catch (e) { if (!(e instanceof Unsupported)) throw e; unresolved = i; push({ status: "unsupported", relation: "unsupported", detail: e.message, solutionSet: null, evidence: null }); }
  });
  const base = { contract: INDEPENDENT_CHECKER_CONTRACT, scope: CHECKER_SCOPE, mode: "expression-identity" as const, completenessAuthority: "native" as const, lines: out, problemSolutionSet: null, finalSolutionSet: null, restrictions: [], u4Steps, exactSteps: 0 };
  if (bad !== null) return { ...base, outcome: "invalid", firstInvalidStep: bad, obligations: [], justification: `line ${bad + 1}: ${out[bad].detail}` };
  if (unresolved !== null) return { ...base, outcome: "unsupported", firstInvalidStep: null, obligations: [`verify line ${unresolved + 1}`], justification: `line ${unresolved + 1} cannot be verified independently` };
  return { ...base, outcome: "verified", firstInvalidStep: null, obligations: [], justification: "U4 verifies every expression step (form completeness is judged natively)" };
}

/* ================================================================================================ ANSWER-FIRST (E7 follow-on)
 * The same kernels, used in a different order: (1) is the FINAL STATED ANSWER the problem's exact solution set? (2) only if it is not, which written transition is the
 * earliest one that is demonstrably invalid, judged against the line the student actually wrote before it (so a correct step after a mistake stays locally valid)?
 * (3) what is the smallest exact difference at that transition? Nothing here certifies a derivation; answer correctness, local validity and diagnosis stay separate.
 */
export interface AfTransition {
  index: number; from: string; to: string;
  status: "equivalent" | "implied" | "narrowing" | "invalid" | "closed-true" | "closed-false" | "unsupported" | "inconclusive";
  /** "implied": follows from the previous line but admits more values (a one-way step such as squaring); "narrowing": valid reduction that discards values */
  detail: string; keepsOriginalSolutions: boolean | null; diagnosis: AfDiagnosis | null;
}
export interface AfDiagnosis { kind: "arithmetic-evaluation" | "unbalanced-operation" | "solution-set-change"; location: string; evidence: string[]; explanation: string; confidence: "exact" | "set-level" }
export interface AfAnswer { status: "correct" | "incorrect" | "incomplete" | "unresolved"; reason: string; finalText: string | null; finalSet: string | null; expectedSet: string | null; extraneous: string[]; missing: string[]; restrictions: string[] }
export interface AfResult { family: "solution-set"; answer: AfAnswer; transitions: AfTransition[] | null; firstInvalid: number | null; checks: number; /** index of the line read as the final answer */ finalIndex: number | null }

function show(e: Expr): string {
  const par = (x: Expr) => (x.kind === "add" || x.kind === "multiply" ? `(${show(x)})` : show(x));
  switch (e.kind) {
    case "constant": return e.value; case "pi": return "pi"; case "variable": return e.name;
    case "add": return e.terms.map((t, i) => { if (t.kind === "multiply" && t.factors.length >= 2 && t.factors[0].kind === "constant" && Number(t.factors[0].value) < 0) { const rest = t.factors.slice(1), neg = t.factors[0].value === "-1" ? "" : `${-Number(t.factors[0].value)}*`; return `${i ? " - " : "-"}${neg}${rest.map(par).join("*")}`; } if (t.kind === "constant" && Number(t.value) < 0 && i) return ` - ${-Number(t.value)}`; return (i ? " + " : "") + show(t); }).join("");
    case "multiply": { if (e.factors.length >= 2 && e.factors[0].kind === "constant" && e.factors[0].value === "-1") return `-${e.factors.slice(1).map(par).join("*")}`; return e.factors.map(par).join("*"); }
    case "power": return `${par(e.base)}^${e.exponent}`;
    case "root": return e.index === 2 ? `sqrt(${show(e.radicand)})` : `root(${show(e.radicand)}, ${e.index})`;
    case "abs": return `|${show(e.argument)}|`;
    default: return `${e.kind}(${show((e as { argument: Expr }).argument)})`;
  }
}
const same = (a: Expr, b: Expr) => JSON.stringify(a) === JSON.stringify(b);
const isClosed = (e: Expr) => { try { return variablesOf(e).size === 0; } catch { return false; } };
function closedValue(e: Expr): Q | null { try { if (!isClosed(e)) return null; const z = evalAt(e, rat(ZERO), "\u0000"); return z && z.y.isZero() ? z.x : null; } catch { return null; } }
/** the smallest pair of corresponding subexpressions that differ (descends while exactly one child differs) */
function smallestDiff(a: Expr, b: Expr): [Expr, Expr] | null {
  if (same(a, b)) return null;
  if (a.kind === b.kind) {
    const kids = (x: Expr): Expr[] | null => (x.kind === "add" ? x.terms : x.kind === "multiply" ? x.factors : x.kind === "power" ? [x.base] : x.kind === "root" ? [x.radicand] : "argument" in x ? [(x as { argument: Expr }).argument] : null);
    const ka = kids(a), kb = kids(b);
    if (ka && kb && ka.length === kb.length && (a.kind !== "power" || (a as { exponent: number }).exponent === (b as { exponent: number }).exponent)) { const d = ka.map((x, i) => (same(x, kb[i]) ? -1 : i)).filter((i) => i >= 0); if (d.length === 1) return smallestDiff(ka[d[0]], kb[d[0]]); }
  }
  return [a, b];
}
/** coefficients c0..c3 of an expression that is a polynomial of degree <= 3 in `name` (exact, from point values), else null */
function polyCoeffs(e: Expr, name: string): Q[] | null {
  try {
    const v = [0, 1, 2, 3, 4, 5].map((k) => { const z = evalAt(e, rat(q(k)), name); return z && z.y.isZero() ? z.x : null; }); if (v.some((x) => x === null)) return null;
    const y = v as Q[]; const c: Q[] = []; // Newton forward differences on 0..3, verified at 4 and 5
    const d0 = y[0], d1 = y[1].sub(y[0]), d2 = y[2].sub(y[1].mul(q(2))).add(y[0]), d3 = y[3].sub(y[2].mul(q(3))).add(y[1].mul(q(3))).sub(y[0]);
    c[3] = d3.div(q(6)); c[2] = d2.div(q(2)).sub(c[3].mul(q(3))); c[1] = d1.sub(c[2]).sub(c[3]); c[0] = d0;
    for (const k of [4, 5]) { let acc = ZERO; for (let i = 3; i >= 0; i--) acc = acc.mul(q(k)).add(c[i]); if (!acc.eq(y[k])) return null; }
    return c;
  } catch { return null; }
}
const isConstPoly = (c: Q[]) => c.slice(1).every((x) => x.isZero());
const displayedOp = (side: Expr, base: Expr): { op: "+" | "*"; operand: Expr } | null => {
  if (side.kind === "add" && side.terms.length === 2) for (const [i, j] of [[0, 1], [1, 0]]) if (same(side.terms[i], base)) return { op: "+", operand: side.terms[j] };
  if (side.kind === "multiply" && side.factors.length === 2) for (const [i, j] of [[0, 1], [1, 0]]) if (same(side.factors[i], base)) return { op: "*", operand: side.factors[j] };
  return null;
};

/** The smallest exact mathematical difference between two adjacent written equations, or null when none can be established (nothing is invented). */
export function diagnoseTransition(prev: NaturalRelation, next: NaturalRelation, name: string | null, solution: Pt | null): AfDiagnosis | null {
  if (prev.kind !== "equation" || next.kind !== "equation") return null;
  const evid: string[] = [];
  if (solution && name) { try { const L = evalAt(next.left, solution, name), R = evalAt(next.right, solution, name); if (L && R) evid.push(`at the original solution ${name} = ${extText(solution)} this line gives ${extText(L)} on the left and ${extText(R)} on the right`); } catch { /* evidence only */ } }
  const dl = smallestDiff(prev.left, next.left), dr = smallestDiff(prev.right, next.right);
  // 1. one side unchanged, the other differs only inside a closed arithmetic subexpression: the written value is not the value of the expression it replaced
  if ((dl === null) !== (dr === null)) {
    const [a, b] = (dl ?? dr)!, va = closedValue(a), vb = closedValue(b), side = dl ? "left" : "right";
    if (va && vb && !va.eq(vb)) return { kind: "arithmetic-evaluation", location: `${side} side: ${show(a)} → ${show(b)}`, evidence: [`${show(a)} = ${va.text()}`, `${show(b)} = ${vb.text()}`, ...evid], explanation: `${show(a)} evaluates to ${va.text()}, not ${vb.text()}`, confidence: "exact" };
  }
  if (dl === null && dr === null) return null;
  // 2. both sides changed: the same operation must act on both sides
  if (!name) return null;
  const L1 = polyCoeffs(prev.left, name), R1 = polyCoeffs(prev.right, name), L2 = polyCoeffs(next.left, name), R2 = polyCoeffs(next.right, name);
  if (!L1 || !R1 || !L2 || !R2) return null;
  const sub = (a: Q[], b: Q[]) => a.map((x, i) => x.sub(b[i]));
  const dL = sub(L2, L1), dR = sub(R2, R1);
  if (isConstPoly(dL) && isConstPoly(dR) && !dL[0].eq(dR[0])) {
    // an add/subtract of a constant: the left shows c_L, the right c_R. The side that DISPLAYS the operation (19 - 5) carries the claim; the other side shows what was done.
    const disp = displayedOp(next.right, prev.right) ?? displayedOp(next.left, prev.left), onRight = !!displayedOp(next.right, prev.right);
    const claimed = onRight ? dR[0] : dL[0], implied = onRight ? dL[0] : dR[0], otherName = onRight ? "left" : "right", dispName = onRight ? "right" : "left";
    const prevDisp = onRight ? prev.right : prev.left, expected = closedValue(prevDisp) ? closedValue(prevDisp)!.add(implied) : null;
    const opText = (c: Q) => (c.sign() < 0 ? `subtracting ${c.neg().text()}` : `adding ${c.text()}`);
    void disp;
    return { kind: "unbalanced-operation", location: `${dispName} side: ${show(prevDisp)} → ${show(onRight ? next.right : next.left)}`, evidence: [`the ${otherName} side changes by ${implied.text()} (${show(onRight ? prev.left : prev.right)} → ${show(onRight ? next.left : next.right)})`, `the ${dispName} side changes by ${claimed.text()}`, ...(expected ? [`the ${dispName} side should be ${show(prevDisp)} ${implied.sign() < 0 ? "-" : "+"} ${(implied.sign() < 0 ? implied.neg() : implied).text()} = ${expected.text()}`] : []), ...evid], explanation: `the ${otherName} side shows ${opText(implied)}, but the ${dispName} side shows ${opText(claimed)}; the same constant must be applied to both sides`, confidence: "exact" };
  }
  const nz = (c: Q[]) => c.findIndex((x) => !x.isZero());
  const kL = nz(L1) >= 0 && nz(L1) === nz(L2) ? L2[nz(L1)].div(L1[nz(L1)]) : null, kR = nz(R1) >= 0 && nz(R1) === nz(R2) ? R2[nz(R1)].div(R1[nz(R1)]) : null;
  if (kL && kR && L1.every((x, i) => L2[i].eq(x.mul(kL))) && R1.every((x, i) => R2[i].eq(x.mul(kR))) && !kL.eq(kR)) return { kind: "unbalanced-operation", location: `both sides: ${show(prev.left)} = ${show(prev.right)} → ${show(next.left)} = ${show(next.right)}`, evidence: [`the left side is multiplied by ${kL.text()}`, `the right side is multiplied by ${kR.text()}`, ...evid], explanation: `the left side is multiplied by ${kL.text()} but the right side by ${kR.text()}; both sides must be multiplied by the same number`, confidence: "exact" };
  return null;
}

/** question-level reference parse, reused across the many submissions of one question */
const parseCache = new Map<string, NaturalParseResult>();
function cachedParse(text: string): NaturalParseResult { let r = parseCache.get(text); if (!r) { r = parseNaturalWorking({ format: "natural", text }); if (parseCache.size > 512) parseCache.clear(); parseCache.set(text, r); } return r; }
/** A: the final stated answer against the exact solution set of the problem. T (optional): written transitions, judged locally against the previous written line. */
export function answerFirstSolutionSet(statement: string, parsed: NaturalParseResult, withTransitions: boolean): AfResult {
  let checks = 0;
  const { body: body0 } = stripVerb(statement);
  const lead = /^((?:[^,=<>≤≥]*[<>≤≥][^,=<>≤≥]*,\s*)+)([^<>≤≥]*=[^<>≤≥]*)$/.exec(body0), body = lead ? `${lead[2].trim()}, ${lead[1].trim().replace(/,$/, "")}` : body0;
  const whenM = /^(.*?)\s+(?:when|for|if|where|given(?:\s+that)?)\s+(.+)$/i.exec(body);
  const ps = cachedParse(whenM ? whenM[1] : body);
  if (ps.classification !== "parsed" || ps.lines.length !== 1) throw new Unsupported("the problem statement is not a single parseable mathematical statement");
  const rel0 = ps.lines[0].relation;
  if (rel0.kind !== "equation" && rel0.kind !== "inequality") throw new Unsupported(`${rel0.kind} problems have no solution-set answer`);
  const premises: NaturalRelation[] = [...(ps.lines[0].restrictions ?? [])];
  if (whenM) { const pp = cachedParse(whenM[2]); if (pp.classification !== "parsed" || pp.lines.length !== 1) throw new Unsupported("the condition attached to the problem is not parseable"); const pr = pp.lines[0].relation; if (pr.kind !== "equation" && pr.kind !== "inequality") throw new Unsupported("the condition must be an equation or inequality"); premises.push(pr, ...(pp.lines[0].restrictions ?? [])); }
  const names = new Set<string>(); relationVars(rel0, names); if (names.size !== 1) throw new Unsupported("the problem must have exactly one variable"); const name = [...names][0];
  const lines = parsed.lines, text = (i: number) => lines[i].source.text;
  for (const [src, l] of [[whenM ? whenM[1] : body, ps.lines[0]] as const, ...lines.map((l) => [l.source.text, l] as const)]) { const loss = parseFidelityLoss(src, l); if (loss) throw new Unsupported(`parse fidelity: ${loss}`); }
  const premiseStmts = premises.map((pr) => stmtFromRelation(pr, name, "premise"));
  const stmt0 = withPremises(stmtFromRelation(rel0, name, "problem"), premiseStmts, "problem with its conditions");
  const classOf = lines.map((l) => (isProseExpression(l.relation) ? "prose" : "math"));
  // the final stated answer: the last line that is a statement about the variable
  let fin = -1; for (let i = lines.length - 1; i >= 0; i--) { const k = lines[i].relation.kind; if (classOf[i] !== "math") continue; if (k === "equation" || k === "inequality" || k === "solution-set" || k === "interval") { const vs = new Set<string>(); relationVars(lines[i].relation, vs); if (vs.size === 1 && vs.has(name)) { fin = i; break; } } }
  const ALL: Stmt = { kind: "all", text: "all real numbers", critical: [], holds: () => true, defined: () => true };
  const answer = (a: Partial<AfAnswer> & Pick<AfAnswer, "status" | "reason">): AfAnswer => ({ finalText: fin >= 0 ? text(fin) : null, finalSet: null, expectedSet: null, extraneous: [], missing: [], restrictions: [], ...a });
  // a concluding statement of "no solution" / "true for all real numbers" is itself the answer (it may follow rejected candidates)
  let claimStmt: Stmt | null = null;
  { let lastNb = lines.length - 1; for (let i = lines.length - 1; i >= 0; i--) { if (!text(i).trim()) continue; lastNb = i; break; }
    const t = lines[lastNb] ? text(lastNb) : "", asClaim = lines[lastNb] && (classOf[lastNb] === "prose" || lines[lastNb].relation.kind === "expression");
    if (asClaim && NO_SOLUTION_CLAIM.test(t)) { claimStmt = emptyClaimStmt(t); fin = lastNb; } else if (asClaim && UNIVERSAL_CLAIM.test(t)) { claimStmt = ALL; fin = lastNb; } }
  const finalStmt = claimStmt ?? (fin >= 0 ? stmtFromRelation(lines[fin].relation, name, text(fin)) : null);
  const built = withTransitions ? builtLines(lines, classOf, name) : null;
  const stmts: Stmt[] = [stmt0, ALL, ...(finalStmt ? [finalStmt] : []), ...(built ?? []).filter((b): b is Stmt => "kind" in b && b !== finalStmt)];
  const prof = profile(stmts); checks++;
  const desc = (s: Stmt) => describe(prof, s), S0 = desc(stmt0), M0 = prof.membership.get(stmt0)!, undef = prof.undefinedAt(stmt0);
  const restrictions = prof.points.filter((_, k) => undef[k]).map((p) => `${name} != ${extText(p)}`);
  let ans: AfAnswer;
  if (!finalStmt) ans = answer({ status: "unresolved", reason: "no statement about the variable was found to read as the final answer", expectedSet: S0, restrictions });
  else if (!claimStmt && !isSolvedForm(lines[fin].relation, name)) ans = answer({ status: "incomplete", reason: "the last statement is not a solution in solved form", finalSet: desc(finalStmt), expectedSet: S0, restrictions });
  else {
    const r = relate(prof, finalStmt, stmt0), Mf = prof.membership.get(finalStmt)!; checks++;
    const cells = (m: { gap: boolean[]; pt: boolean[] }) => [...m.gap, ...m.pt], cf = cells(Mf), c0 = cells(M0);
    const ptName = (k: number) => extText(prof.points[k]);
    const extraneous = prof.points.map((_, k) => k).filter((k) => Mf.pt[k] && !M0.pt[k]).map(ptName), missing = prof.points.map((_, k) => k).filter((k) => !Mf.pt[k] && M0.pt[k]).map(ptName);
    const onlyExcluded = r === "superset" && cf.some((v, k) => v && !c0[k]) && prof.points.every((_, k) => !(Mf.pt[k] && !M0.pt[k]) || undef[k]);
    if (r === "equal") ans = answer({ status: "correct", reason: `the stated solution ${desc(finalStmt)} is exactly the problem's solution set`, finalSet: desc(finalStmt), expectedSet: S0, restrictions });
    else if (r === "subset") ans = answer({ status: "incomplete", reason: `the stated solution ${desc(finalStmt)} omits solutions: the problem's solution set is ${S0}`, finalSet: desc(finalStmt), expectedSet: S0, missing, restrictions });
    else ans = answer({ status: "incorrect", reason: r === "superset" ? `the stated solution ${desc(finalStmt)} includes values that are not solutions${onlyExcluded ? " (excluded by the domain)" : ""}; the problem's solution set is ${S0}` : `the stated solution ${desc(finalStmt)} is not the problem's solution set ${S0}`, finalSet: desc(finalStmt), expectedSet: S0, extraneous, missing, restrictions });
  }
  if (!withTransitions) return { family: "solution-set", answer: ans, transitions: null, firstInvalid: null, checks, finalIndex: fin >= 0 ? fin : null };
  // T: local validity of every written transition against the previous written line (the original problem for the first)
  const sol = prof.points.find((_, k) => M0.pt[k]) ?? null; // one exact solution, for the evidence line
  const transitions: AfTransition[] = []; let prevStmt: Stmt = stmt0, prevRel: NaturalRelation = rel0, prevText = statement, firstInvalid: number | null = null;
  const pushT = (t: AfTransition) => { transitions.push(t); if (t.status === "invalid" && firstInvalid === null) firstInvalid = t.index; };
  lines.forEach((l, i) => {
    const b = built![i], from = prevText, to = text(i);
    if ("error" in b) { pushT({ index: i, from, to, status: "unsupported", detail: b.error, keepsOriginalSolutions: null, diagnosis: null }); return; }
    if ("claim" in b) { pushT({ index: i, from, to, status: "unsupported", detail: "a completeness or universality claim is not a transition", keepsOriginalSolutions: null, diagnosis: null }); return; }
    if ("closed" in b) { checks++; pushT({ index: i, from, to, status: b.closed === false ? "closed-false" : b.closed === true ? "closed-true" : "unsupported", detail: b.closed === false ? "a closed numeric statement that is exactly false" : b.closed === true ? "a closed numeric statement that is exactly true" : "a closed statement that is undefined", keepsOriginalSolutions: null, diagnosis: null }); if (b.closed === false && firstInvalid === null) firstInvalid = i; return; }
    const s = b as Stmt, r = relate(prof, prevStmt, s); checks++;
    const Ms = prof.membership.get(s)!, keeps = [...Ms.gap.map((v, k) => !M0.gap[k] || v), ...Ms.pt.map((v, k) => !M0.pt[k] || v)].every(Boolean);
    const Mp = prof.membership.get(prevStmt)!;
    const dropsSolution = [...Mp.gap.map((v, k) => v && M0.gap[k] && !Ms.gap[k]), ...Mp.pt.map((v, k) => v && M0.pt[k] && !Ms.pt[k])].some(Boolean);
    let status: AfTransition["status"], detail: string;
    if (r === "equal") { status = "equivalent"; detail = "equivalent to the previous line (same solution set)"; }
    else if (r === "subset") { status = "implied"; detail = `follows from the previous line but admits more values (${desc(s)}): a one-way step, so candidates must later be checked against the original`; }
    else if (r === "superset" && !dropsSolution) { status = "narrowing"; detail = `a reduction of the previous line that discards only non-solutions of the original (${desc(prevStmt)} → ${desc(s)})`; }
    else if (r === "superset") { status = "invalid"; detail = `the step discards a solution of the original: ${desc(prevStmt)} became ${desc(s)}`; }
    else { status = "invalid"; detail = `neither equivalent to nor implied by the previous line (${desc(prevStmt)} versus ${desc(s)})`; }
    const diagnosis = status === "invalid" ? (diagnoseTransition(prevRel, l.relation, name, sol) ?? { kind: "solution-set-change" as const, location: `${from} → ${to}`, evidence: [`previous line: ${desc(prevStmt)}`, `this line: ${desc(s)}`], explanation: "the solution set changed, but the exact difference between the two lines could not be pinned to a single operation", confidence: "set-level" as const }) : null;
    pushT({ index: i, from, to, status, detail, keepsOriginalSolutions: keeps, diagnosis });
    prevStmt = s; prevRel = l.relation; prevText = to;
  });
  return { family: "solution-set", answer: ans, transitions, firstInvalid, checks, finalIndex: fin >= 0 ? fin : null };
}

/** Numeric-evaluation problems (`2 + 3*4`): the answer is the exact value; a transition is valid when the line's value equals the previous line's value. */
export interface AfNumericResult { family: "arithmetic"; answer: AfAnswer; transitions: AfTransition[] | null; firstInvalid: number | null; checks: number; finalIndex: number | null }
export function answerFirstNumeric(statement: string, parsed: NaturalParseResult, withTransitions: boolean): AfNumericResult {
  const { body } = stripVerb(statement), ps = parseNaturalWorking({ format: "natural", text: body });
  if (ps.classification !== "parsed" || ps.lines.length !== 1 || ps.lines[0].relation.kind !== "expression") throw new Unsupported("not a numeric expression problem");
  const e0 = ps.lines[0].relation.expression, v0 = closedValue(e0); if (!v0) throw new Unsupported("the problem is not a closed exact numeric expression");
  const lines = parsed.lines; let checks = 1;
  for (const [src, l] of lines.map((l) => [l.source.text, l] as const)) { const loss = parseFidelityLoss(src, l); if (loss) throw new Unsupported(`parse fidelity: ${loss}`); }
  // the value a line states: an expression is its own value; `a = b` states the value of b (its own truth is a separate transition check)
  const stated = (r: NaturalRelation): { value: Q | null; exprs: Expr[] } => r.kind === "expression" ? { value: closedValue(r.expression), exprs: [r.expression] } : r.kind === "equation" && isClosed(r.left) && isClosed(r.right) ? { value: closedValue(r.right), exprs: [r.left, r.right] } : { value: null, exprs: [] };
  let fin = -1; for (let i = lines.length - 1; i >= 0; i--) if (stated(lines[i].relation).value) { fin = i; break; }
  const fv = fin >= 0 ? stated(lines[fin].relation).value : null;
  const answer: AfAnswer = fv ? (fv.eq(v0) ? { status: "correct", reason: `the stated value ${fv.text()} equals the exact value of the expression`, finalText: lines[fin].source.text, finalSet: fv.text(), expectedSet: v0.text(), extraneous: [], missing: [], restrictions: [] } : { status: "incorrect", reason: `the stated value ${fv.text()} is not the exact value ${v0.text()}`, finalText: lines[fin].source.text, finalSet: fv.text(), expectedSet: v0.text(), extraneous: [], missing: [], restrictions: [] }) : { status: "unresolved", reason: "no closed numeric value was stated", finalText: null, finalSet: null, expectedSet: v0.text(), extraneous: [], missing: [], restrictions: [] };
  if (!withTransitions) return { family: "arithmetic", answer, transitions: null, firstInvalid: null, checks, finalIndex: fin >= 0 ? fin : null };
  const transitions: AfTransition[] = []; let firstInvalid: number | null = null, prevE: Expr = e0, prevV: Q = v0, prevText = statement;
  lines.forEach((l, i) => {
    const to = l.source.text, st = stated(l.relation); checks++;
    if (!st.exprs.length || !st.value) { transitions.push({ index: i, from: prevText, to, status: "unsupported", detail: "not a closed numeric statement", keepsOriginalSolutions: null, diagnosis: null }); return; }
    let diag: AfDiagnosis | null = null, status: AfTransition["status"] = "equivalent", detail = "has the same exact value as the previous line";
    if (l.relation.kind === "equation") { const a = closedValue(l.relation.left)!, b = closedValue(l.relation.right)!; if (!a.eq(b)) { status = "invalid"; detail = "the two sides of this equality are not equal"; const d = smallestDiff(l.relation.left, l.relation.right); diag = { kind: "arithmetic-evaluation", location: `${show(l.relation.left)} = ${show(l.relation.right)}`, evidence: [`${show(l.relation.left)} = ${a.text()}`, `${show(l.relation.right)} = ${b.text()}`], explanation: `${show(l.relation.left)} evaluates to ${a.text()}, not ${b.text()}`, confidence: "exact" }; void d; } }
    if (status !== "invalid" && !st.value.eq(prevV)) { status = "invalid"; detail = `the value changed from ${prevV.text()} to ${st.value.text()}`; const dd = smallestDiff(prevE, st.exprs[0]); const da = dd ? closedValue(dd[0]) : null, db = dd ? closedValue(dd[1]) : null; diag = dd && da && db && !da.eq(db) ? { kind: "arithmetic-evaluation", location: `${show(dd[0])} → ${show(dd[1])}`, evidence: [`${show(dd[0])} = ${da.text()}`, `${show(dd[1])} = ${db.text()}`], explanation: `${show(dd[0])} evaluates to ${da.text()}, not ${db.text()}`, confidence: "exact" } : { kind: "solution-set-change", location: `${prevText} → ${to}`, evidence: [`previous value ${prevV.text()}`, `this line's value ${st.value.text()}`], explanation: "the value changed, but the difference could not be localised to one subexpression", confidence: "set-level" }; }
    transitions.push({ index: i, from: prevText, to, status, detail, keepsOriginalSolutions: null, diagnosis: diag });
    if (status === "invalid" && firstInvalid === null) firstInvalid = i;
    prevE = st.exprs[0]; prevV = st.value; prevText = to;
  });
  return { family: "arithmetic", answer, transitions, firstInvalid, checks, finalIndex: fin >= 0 ? fin : null };
}
