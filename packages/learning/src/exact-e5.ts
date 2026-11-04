/**
 * E5 exact arithmetic used ONLY by the independent geometry/calculus binder: BigInt rationals, single-radical surds,
 * rational polynomials and rational functions, and a bounded floating-point disagreement test (used to CONFIRM a rejection, never to accept).
 * It does not import any assessment code.
 */
import type { Expr } from "./calculus-core.ts";

export interface Q { n: bigint; d: bigint }
const babs = (a: bigint): bigint => (a < 0n ? -a : a);
const bgcd = (a: bigint, b: bigint): bigint => { a = babs(a); b = babs(b); while (b) { [a, b] = [b, a % b]; } return a; };
export const BOUND = 10n ** 60n;
export class Overflow extends Error {}
export const q = (n: bigint | number, d: bigint | number = 1n): Q => {
  let nn = BigInt(n), dd = BigInt(d); if (dd === 0n) throw new Overflow("zero denominator");
  if (dd < 0n) { nn = -nn; dd = -dd; } const g = bgcd(nn, dd) || 1n; nn /= g; dd /= g;
  if (babs(nn) > BOUND || dd > BOUND) throw new Overflow("number too large");
  return { n: nn, d: dd };
};
export const Z = q(0), ONE = q(1);
export const qadd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const qsub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const qmul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
export const qdiv = (a: Q, b: Q) => { if (b.n === 0n) throw new Overflow("division by zero"); return q(a.n * b.d, a.d * b.n); };
export const qneg = (a: Q) => q(-a.n, a.d);
export const qeq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
export const qcmp = (a: Q, b: Q) => { const x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : x > y ? 1 : 0; };
export const qsign = (a: Q) => (a.n < 0n ? -1 : a.n > 0n ? 1 : 0);
export const qiszero = (a: Q) => a.n === 0n;
export const qpow = (a: Q, e: number): Q => {
  if (!Number.isInteger(e) || Math.abs(e) > 64) throw new Overflow("exponent");
  if (e < 0) return qpow(qdiv(ONE, a), -e);
  let r = ONE; for (let i = 0; i < e; i++) r = qmul(r, a); return r;
};
export const qtext = (a: Q) => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`);
export const qread = (s: string): Q | null => {
  const m = /^\s*([-+]?\d+)(?:\s*\/\s*(\d+))?\s*$/.exec(s); if (!m) return null; if (m[2] === "0") return null;
  return q(BigInt(m[1]), BigInt(m[2] ?? "1"));
};

// ---------------------------------------------------------------------------------------------------- surds a*sqrt(m), m squarefree
export interface Surd { a: Q; m: bigint }
const isqrt = (n: bigint): bigint => { if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; };
/** n = s^2 * t with t squarefree; bounded trial division. */
export function squarefree(n: bigint): { s: bigint; t: bigint } {
  if (n <= 0n) throw new Overflow("non-positive radicand");
  if (n > 10n ** 14n) throw new Overflow("radicand too large to factor");
  return recompute(n);
}
function recompute(n: bigint): { s: bigint; t: bigint } {
  let u = n, s = 1n, t = 1n;
  for (let p = 2n; p * p <= u; p++) { if (u % p === 0n) { let c = 0; while (u % p === 0n) { u /= p; c++; } for (let i = 0; i < Math.floor(c / 2); i++) s *= p; if (c % 2 === 1) t *= p; } }
  t *= u; return { s, t };
}
export const surd = (a: Q, m: bigint = 1n): Surd => (qiszero(a) ? { a: Z, m: 1n } : { a, m });
export const sRat = (a: Q): Surd => surd(a, 1n);
export const sEq = (x: Surd, y: Surd) => qeq(x.a, y.a) && x.m === y.m;
export const sText = (x: Surd) => (x.m === 1n ? qtext(x.a) : `${qtext(x.a)}*sqrt(${x.m})`);
function sMul(x: Surd, y: Surd): Surd {
  if (qiszero(x.a) || qiszero(y.a)) return sRat(Z);
  const g = bgcd(x.m, y.m); const m = (x.m / g) * (y.m / g); return surd(qmul(qmul(x.a, y.a), q(g)), m);
}
function sAdd(x: Surd, y: Surd): Surd | null {
  if (qiszero(x.a)) return y; if (qiszero(y.a)) return x; if (x.m !== y.m) return null; return surd(qadd(x.a, y.a), x.m);
}
function sInv(x: Surd): Surd { if (qiszero(x.a)) throw new Overflow("division by zero"); return surd(qdiv(ONE, qmul(x.a, q(x.m))), x.m); }
function sSqrt(x: Surd): Surd | null {
  if (x.m !== 1n) return null; if (qsign(x.a) < 0) return null;
  const p = x.a.n, d = x.a.d; if (p === 0n) return sRat(Z);
  const { s, t } = squarefree(p * d); return surd(q(s, d), t);
}
export function sSign(x: Surd): number { return qsign(x.a); }
/** Exact evaluation of an arithmetic Expr (constants, + * integer powers, sqrt) with variables from env. null when outside the exact surd field. */
export function evalSurd(e: Expr, env: Map<string, Surd> = new Map(), depth = 0): Surd | null {
  if (depth > 60) return null;
  try {
    switch (e.kind) {
      case "constant": { const v = qread(e.value); return v ? sRat(v) : null; }
      case "variable": return env.get(e.name) ?? null;
      case "add": { let acc = sRat(Z); for (const t of e.terms) { const v = evalSurd(t, env, depth + 1); if (!v) return null; const s = sAdd(acc, v); if (!s) return null; acc = s; } return acc; }
      case "multiply": { let acc = sRat(ONE); for (const f of e.factors) { const v = evalSurd(f, env, depth + 1); if (!v) return null; acc = sMul(acc, v); } return acc; }
      case "power": {
        const b = evalSurd(e.base, env, depth + 1); if (!b || !Number.isInteger(e.exponent) || Math.abs(e.exponent) > 64) return null;
        let r = sRat(ONE); const n = Math.abs(e.exponent); for (let i = 0; i < n; i++) r = sMul(r, b);
        return e.exponent < 0 ? sInv(r) : r;
      }
      case "root": { if (e.index !== 2) return null; const r = evalSurd(e.radicand, env, depth + 1); return r ? sSqrt(r) : null; }
      default: return null;
    }
  } catch (err) { if (err instanceof Overflow) return null; throw err; }
}
/** Exact rational evaluation (no radicals). */
export function evalRat(e: Expr, env: Map<string, Q> = new Map()): Q | null {
  const m = new Map<string, Surd>(); for (const [k, v] of env) m.set(k, sRat(v));
  const s = evalSurd(e, m); return s && s.m === 1n ? s.a : null;
}

// ---------------------------------------------------------------------------------------------------- polynomials / rational functions over Q
export type Poly = Q[];
const ptrim = (a: Poly): Poly => { const r = a.slice(); while (r.length > 1 && qiszero(r[r.length - 1])) r.pop(); return r.length ? r : [Z]; };
export const pconst = (c: Q): Poly => [c];
export function padd(a: Poly, b: Poly): Poly { const n = Math.max(a.length, b.length); return ptrim(Array.from({ length: n }, (_, i) => qadd(a[i] ?? Z, b[i] ?? Z))); }
export function pmul(a: Poly, b: Poly): Poly {
  if (a.length + b.length > 260) throw new Overflow("polynomial degree");
  const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => Z);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qadd(out[i + j], qmul(x, y)); })); return ptrim(out);
}
export const pdeg = (a: Poly) => { const t = ptrim(a); return qiszero(t[t.length - 1]) ? -1 : t.length - 1; };
export const peval = (a: Poly, x: Q): Q => { let r = Z; for (let i = a.length - 1; i >= 0; i--) r = qadd(qmul(r, x), a[i]); return r; };
export function pdivmod(a: Poly, b: Poly): { q: Poly; r: Poly } {
  a = ptrim(a); b = ptrim(b); if (pdeg(b) < 0) throw new Overflow("division by zero polynomial");
  const quo: Poly = Array.from({ length: Math.max(1, a.length - b.length + 1) }, () => Z); let r = a.slice();
  while (pdeg(r) >= pdeg(b) && pdeg(r) >= 0) {
    const sh = pdeg(r) - pdeg(b), c = qdiv(r[pdeg(r)], b[pdeg(b)]); quo[sh] = c;
    for (let i = 0; i <= pdeg(b); i++) r[sh + i] = qsub(r[sh + i], qmul(c, b[i])); r = ptrim(r);
    if (pdeg(r) === -1) break;
  }
  return { q: ptrim(quo), r: ptrim(r) };
}
export interface RF { num: Poly; den: Poly }
export function rfOf(e: Expr, v: string, depth = 0): RF | null {
  if (depth > 60) return null;
  try {
    switch (e.kind) {
      case "constant": { const c = qread(e.value); return c ? { num: pconst(c), den: pconst(ONE) } : null; }
      case "variable": return e.name === v ? { num: [Z, ONE], den: pconst(ONE) } : null;
      case "add": { let acc: RF = { num: pconst(Z), den: pconst(ONE) }; for (const t of e.terms) { const r = rfOf(t, v, depth + 1); if (!r) return null; acc = { num: padd(pmul(acc.num, r.den), pmul(r.num, acc.den)), den: pmul(acc.den, r.den) }; } return acc; }
      case "multiply": { let acc: RF = { num: pconst(ONE), den: pconst(ONE) }; for (const f of e.factors) { const r = rfOf(f, v, depth + 1); if (!r) return null; acc = { num: pmul(acc.num, r.num), den: pmul(acc.den, r.den) }; } return acc; }
      case "power": {
        const b = rfOf(e.base, v, depth + 1); if (!b || !Number.isInteger(e.exponent) || Math.abs(e.exponent) > 40) return null;
        let n: Poly = pconst(ONE), d: Poly = pconst(ONE); for (let i = 0; i < Math.abs(e.exponent); i++) { n = pmul(n, b.num); d = pmul(d, b.den); }
        return e.exponent < 0 ? { num: d, den: n } : { num: n, den: d };
      }
      default: return null;
    }
  } catch (err) { if (err instanceof Overflow) return null; throw err; }
}
/** Exact equality of two rational functions as functions (cross-multiplication). */
export function rfEqual(a: RF, b: RF): boolean {
  const l = pmul(a.num, b.den), r = pmul(b.num, a.den); const n = Math.max(l.length, r.length);
  for (let i = 0; i < n; i++) if (!qeq(l[i] ?? Z, r[i] ?? Z)) return false; return true;
}
export type LimitResult = { kind: "finite"; value: Q } | { kind: "inf"; sign: 1 | -1 } | { kind: "dne" };
function linearFactorMultiplicity(p: Poly, a: Q): number { let c = 0, cur = ptrim(p); while (pdeg(cur) >= 0 && qiszero(peval(cur, a)) && c < 80) { cur = pdivmod(cur, [qneg(a), ONE]).q; c++; if (pdeg(cur) < 0) break; } return c; }
/** Exact limit of a rational function at a finite point from the given side, or at ±infinity ("inf" / "-inf"). */
export function limitRF(f: RF, at: Q | "inf" | "-inf", side: "both" | "left" | "right" = "both"): LimitResult | null {
  try {
    let num = ptrim(f.num), den = ptrim(f.den);
    if (pdeg(den) < 0) return null;
    if (at === "inf" || at === "-inf") {
      if (pdeg(num) < 0) return { kind: "finite", value: Z };
      const dn = pdeg(num), dd = pdeg(den); const ln = num[dn], ld = den[dd];
      if (dn < dd) return { kind: "finite", value: Z };
      if (dn === dd) return { kind: "finite", value: qdiv(ln, ld) };
      let s = qsign(ln) * qsign(ld); if (at === "-inf" && (dn - dd) % 2 === 1) s = -s; return { kind: "inf", sign: s as 1 | -1 };
    }
    if (pdeg(num) < 0) return { kind: "finite", value: Z };
    const a = at;
    const mn = linearFactorMultiplicity(num, a), md = linearFactorMultiplicity(den, a);
    const lin = (k: number, p: Poly) => { let cur = p; for (let i = 0; i < k; i++) cur = pdivmod(cur, [qneg(a), ONE]).q; return cur; };
    const nn = lin(mn, num), dd = lin(md, den);
    const nv = peval(nn, a), dv = peval(dd, a);
    if (md === mn || md < mn) { // finite (zero when md < mn)
      if (md < mn) return { kind: "finite", value: Z };
      return { kind: "finite", value: qdiv(nv, dv) };
    }
    const k = md - mn; // pole of order k
    const base = qsign(nv) * qsign(dv); // sign of the remaining factor at a
    const right = base, left = k % 2 === 0 ? base : -base;
    if (side === "right") return { kind: "inf", sign: right as 1 | -1 };
    if (side === "left") return { kind: "inf", sign: left as 1 | -1 };
    if (right === left) return { kind: "inf", sign: right as 1 | -1 };
    return { kind: "dne" };
  } catch (err) { if (err instanceof Overflow) return null; throw err; }
}

// ---------------------------------------------------------------------------------------------------- floating point (rejection confirmation only)
export function fEval(e: Expr, v: string, x: number, aux?: Map<string, number>): number {
  const go = (t: Expr): number => {
    switch (t.kind) {
      case "constant": { const m = /^([-+]?\d+)(?:\/(\d+))?$/.exec(t.value); return m ? Number(m[1]) / Number(m[2] ?? "1") : NaN; }
      case "pi": return Math.PI;
      case "variable": return t.name === v ? x : aux?.get(t.name) ?? NaN;
      case "add": return t.terms.reduce((s, u) => s + go(u), 0);
      case "multiply": return t.factors.reduce((s, u) => s * go(u), 1);
      case "power": return Math.pow(go(t.base), t.exponent);
      case "sin": return Math.sin(go(t.argument)); case "cos": return Math.cos(go(t.argument)); case "tan": return Math.tan(go(t.argument));
      case "exp": return Math.exp(go(t.argument)); case "log": return Math.log(go(t.argument)); case "atan": return Math.atan(go(t.argument));
      case "abs": return Math.abs(go(t.argument));
      case "root": { const r = go(t.radicand); return t.index === 2 ? Math.sqrt(r) : t.index % 2 === 1 ? Math.sign(r) * Math.pow(Math.abs(r), 1 / t.index) : Math.pow(r, 1 / t.index); }
      default: return NaN;
    }
  };
  return go(e);
}
const FPOINTS = [0.37, 0.91, 1.43, 2.17, -0.63, 3.11, 0.58, 1.77, -1.31, 2.63, 0.23, 4.09];
/** "differ" when the two functions disagree clearly at >= 3 sample points where both are finite; "agree" when they agree everywhere defined (>=4 points); else "unknown". */
export function floatCompare(a: Expr, b: Expr, v: string): "differ" | "agree" | "unknown" {
  let diff = 0, same = 0;
  for (const x of FPOINTS) {
    const p = fEval(a, v, x), r = fEval(b, v, x); if (!Number.isFinite(p) || !Number.isFinite(r)) continue;
    const tol = 1e-8 * (1 + Math.abs(p) + Math.abs(r)); if (Math.abs(p - r) > tol) diff++; else same++;
  }
  if (diff >= 3) return "differ"; if (diff === 0 && same >= 4) return "agree"; return "unknown";
}
