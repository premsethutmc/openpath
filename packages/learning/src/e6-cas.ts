/**
 * E6 exact line checker. A small, bounded, SEPARATELY IMPLEMENTED computer-algebra kernel used only to judge individual student lines:
 *  - differentiation (`d6`, independent of calculus-core and of the E5 `d5`);
 *  - exact equality of two one-variable expressions over rational functions in x and a fixed set of formal generators
 *    (exp(x^j/N), sin/cos of a common base angle with S^2+C^2=1, ln|p| for prime factors p, radicals R^2=P, pi, e, ln of primes);
 *  - the restrictions an equality silently depends on (denominators that vanish, log laws that need a positive argument);
 *  - exact Laurent-series limits at finite points.
 * ACCEPTANCE is only ever a formal identity (cross-multiplied numerator reduces to the zero polynomial), which is sound because every generator is a
 * genuine function and the relations used (S^2+C^2=1, R^2=P, exp(a+b)=exp(a)exp(b), ln|ab|=ln|a|+ln|b|) are true identities.
 * REJECTION requires a failed identity AND a clear floating-point disagreement at a point where both sides are defined. Anything else is `unproven`.
 */
import { Overflow, q, qadd, qcmp, qdiv, qeq, qiszero, qmul, qneg, qsign, qsub, qtext, ONE, Z, type Q } from "./exact-e5.ts";
import { N, NotationError, add, div, fn, mul, neg, pw, S, type A } from "./e6-parse.ts";

export class Unsupported extends Error {}
export class Budget extends Error {}
export class Ambiguity extends Error {}

const TERM_LIMIT = 2500, WORK_LIMIT = 6_000_000;
let work = 0;
export const resetWork = () => { work = 0; };
const tick = (n: number) => { work += n; if (work > WORK_LIMIT) throw new Budget("work budget exceeded"); };

// ================================================================================================ sparse polynomials
type Mono = [string, number][];
interface Term { mono: Mono; c: Q }
export interface Poly { m: Map<string, Term> }
const mkey = (m: Mono) => m.map(([v, e]) => `${v}^${e}`).join("*");
const pZero = (): Poly => ({ m: new Map() });
const pc = (c: Q): Poly => { const p = pZero(); if (!qiszero(c)) p.m.set("", { mono: [], c }); return p; };
const pv = (v: string, e = 1): Poly => { const p = pZero(); p.m.set(mkey([[v, e]]), { mono: [[v, e]], c: ONE }); return p; };
const pIsZero = (p: Poly) => p.m.size === 0;
const pIsConst = (p: Poly) => p.m.size === 0 || (p.m.size === 1 && p.m.has(""));
const pConst = (p: Poly): Q => (p.m.get("")?.c ?? Z);
function pAdd(a: Poly, b: Poly): Poly {
  const r: Poly = { m: new Map(a.m) };
  for (const [k, t] of b.m) { const o = r.m.get(k); if (o) { const c = qadd(o.c, t.c); if (qiszero(c)) r.m.delete(k); else r.m.set(k, { mono: t.mono, c }); } else r.m.set(k, t); }
  if (r.m.size > TERM_LIMIT) throw new Budget("polynomial too large");
  return r;
}
const pNeg = (a: Poly): Poly => { const r = pZero(); for (const [k, t] of a.m) r.m.set(k, { mono: t.mono, c: qneg(t.c) }); return r; };
const pSub = (a: Poly, b: Poly) => pAdd(a, pNeg(b));
function mmul(a: Mono, b: Mono): Mono {
  const out: Mono = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (j >= b.length || (i < a.length && a[i][0] < b[j][0])) out.push(a[i++]);
    else if (i >= a.length || b[j][0] < a[i][0]) out.push(b[j++]);
    else { const e = a[i][1] + b[j][1]; if (e !== 0) out.push([a[i][0], e]); i++; j++; }
  }
  return out;
}
function pMul(a: Poly, b: Poly): Poly {
  tick(a.m.size * b.m.size);
  const r = pZero();
  for (const x of a.m.values()) for (const y of b.m.values()) {
    const mono = mmul(x.mono, y.mono), k = mkey(mono), c = qmul(x.c, y.c), o = r.m.get(k);
    if (o) { const s = qadd(o.c, c); if (qiszero(s)) r.m.delete(k); else r.m.set(k, { mono, c: s }); } else r.m.set(k, { mono, c });
  }
  if (r.m.size > TERM_LIMIT) throw new Budget("polynomial too large");
  return r;
}
const pScale = (a: Poly, c: Q): Poly => { if (qiszero(c)) return pZero(); const r = pZero(); for (const [k, t] of a.m) r.m.set(k, { mono: t.mono, c: qmul(t.c, c) }); return r; };
function pPow(a: Poly, n: number): Poly { if (n < 0 || n > 2048) throw new Budget("exponent too large"); let r = pc(ONE), b = a; let e = n; while (e) { if (e & 1) r = pMul(r, b); e >>= 1; if (e) b = pMul(b, b); } return r; }
const pVars = (p: Poly): Set<string> => { const s = new Set<string>(); for (const t of p.m.values()) for (const [v] of t.mono) s.add(v); return s; };
const pKey = (p: Poly): string => [...p.m.keys()].sort().map((k) => `${k}:${qtext(p.m.get(k)!.c)}`).join("+");
const degIn = (p: Poly, v: string): number => { let d = 0; for (const t of p.m.values()) for (const [x, e] of t.mono) if (x === v && e > d) d = e; return d; };
/** coefficients (by exponent of v) when p is a polynomial in v alone with rational coefficients */
function coeffsIn(p: Poly, v: string): Q[] | null {
  const out: Q[] = [];
  for (const t of p.m.values()) {
    if (t.mono.length > 1 || (t.mono.length === 1 && t.mono[0][0] !== v)) return null;
    const e = t.mono.length ? t.mono[0][1] : 0; if (e < 0) return null;
    while (out.length <= e) out.push(Z); out[e] = t.c;
  }
  return out.length ? out : [Z];
}

// ================================================================================================ rational functions
export interface RF { n: Poly; d: Poly }
const rfc = (c: Q): RF => ({ n: pc(c), d: pc(ONE) });
const rfOfPoly = (p: Poly): RF => ({ n: p, d: pc(ONE) });
function rfNorm(r: RF): RF {
  if (pIsConst(r.d) && !pIsZero(r.d)) { const c = pConst(r.d); if (!qeq(c, ONE)) return { n: pScale(r.n, qdiv(ONE, c)), d: pc(ONE) }; }
  return r;
}
const rfAdd = (a: RF, b: RF): RF => rfNorm(pEq(a.d, b.d) ? { n: pAdd(a.n, b.n), d: a.d } : { n: pAdd(pMul(a.n, b.d), pMul(b.n, a.d)), d: pMul(a.d, b.d) });
const rfMul = (a: RF, b: RF): RF => rfNorm({ n: pMul(a.n, b.n), d: pMul(a.d, b.d) });
const rfNeg = (a: RF): RF => ({ n: pNeg(a.n), d: a.d });
function rfInv(a: RF): RF { if (pIsZero(a.n)) throw new Unsupported("division by zero"); return rfNorm({ n: a.d, d: a.n }); }
function pEq(a: Poly, b: Poly): boolean { if (a.m.size !== b.m.size) return false; for (const [k, t] of a.m) { const o = b.m.get(k); if (!o || !qeq(o.c, t.c)) return false; } return true; }

// ================================================================================================ context
interface TrigBase { key: string; s: string; c: string; coeffs: Q[] }
export class Ctx {
  v: string;
  expDen = new Map<number, bigint>();      // degree j>=1 -> lcm denominator; 0 -> constant exponent
  trigDen = new Map<string, bigint>();
  rel = new Map<string, Poly>();           // var -> polynomial equal to var^2
  trigBases = new Map<string, TrigBase>();
  atoms: { kind: string; arg: RF; vars: string[] }[] = [];
  nvar = 0;
  frozen = false;
  denoms: Poly[] = [];
  logs: { arg: Poly; factors: { p: Poly; e: number }[] }[] = [];
  constructor(v: string) { this.v = v; }
  fresh(prefix: string) { return `${prefix}${++this.nvar}`; }
  need(map: Map<number | string, bigint> | Map<string, bigint>, key: any, den: bigint) { const o = (map as any).get(key) ?? 1n; (map as any).set(key, lcm(o, den)); }
}
const bgcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const lcm = (a: bigint, b: bigint) => (a / bgcd(a, b)) * b;

/** reduce modulo S^2=1-C^2, R^2=P, A^2=u^2 */
export function reduce(p: Poly, ctx: Ctx): Poly {
  let cur = p;
  for (let pass = 0; pass < 60; pass++) {
    let changed = false; const next = pZero();
    for (const t of cur.m.values()) {
      let hit: [string, number] | null = null;
      for (const [v, e] of t.mono) if (e >= 2 && ctx.rel.has(v)) { hit = [v, e]; break; }
      if (!hit) { const k = mkey(t.mono); const o = next.m.get(k); if (o) { const c = qadd(o.c, t.c); if (qiszero(c)) next.m.delete(k); else next.m.set(k, { mono: t.mono, c }); } else next.m.set(k, t); continue; }
      changed = true; const [v, e] = hit;
      const rest: Mono = t.mono.map(([x, k]) => (x === v ? [x, e % 2] as [string, number] : [x, k] as [string, number])).filter(([, k]) => k !== 0);
      let term: Poly = { m: new Map([[mkey(rest), { mono: rest, c: t.c }]]) };
      if (rest.length === 0) term = pc(t.c);
      const sq = pPow(ctx.rel.get(v)!, Math.floor(e / 2));
      const prod = pMul(term, sq);
      for (const [k2, t2] of prod.m) { const o = next.m.get(k2); if (o) { const c = qadd(o.c, t2.c); if (qiszero(c)) next.m.delete(k2); else next.m.set(k2, { mono: t2.mono, c }); } else next.m.set(k2, t2); }
    }
    cur = next; if (!changed) return cur;
    if (cur.m.size > TERM_LIMIT) throw new Budget("polynomial too large");
  }
  throw new Budget("relation reduction did not terminate");
}

// ================================================================================================ expression -> normal form
const isPrimeSmall = (n: bigint) => { if (n < 2n) return false; for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false; return true; };
function primeFactors(n: bigint): Map<bigint, number> | null {
  const out = new Map<bigint, number>(); let m = n; if (m < 1n || m > 10n ** 12n) return null;
  for (let d = 2n; d * d <= m; d++) { while (m % d === 0n) { out.set(d, (out.get(d) ?? 0) + 1); m /= d; } }
  if (m > 1n) out.set(m, (out.get(m) ?? 0) + 1);
  return out;
}
const isqrtBig = (n: bigint): bigint => { if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; };
function squareParts(n: bigint): { s: bigint; t: bigint } { // n = s^2 t, t squarefree
  let s = 1n, t = n; for (let d = 2n; d * d <= t; d++) { while (t % (d * d) === 0n) { t /= d * d; s *= d; } }
  return { s, t };
}

/** polynomial in ctx.v: coefficients with an optional pi part for the constant term */
function argLin(p: RF, v: string): { coeffs: Q[]; c0: Q; c0pi: Q } | null {
  if (!pIsConst(p.d)) return null; const dc = pConst(p.d);
  const n = pScale(p.n, qdiv(ONE, dc));
  const coeffs: Q[] = []; let c0 = Z, c0pi = Z;
  for (const t of n.m.values()) {
    if (t.mono.length === 0) { c0 = t.c; continue; }
    if (t.mono.length === 1 && t.mono[0][0] === "PI" && t.mono[0][1] === 1) { c0pi = t.c; continue; }
    if (t.mono.length === 1 && t.mono[0][0] === v && t.mono[0][1] > 0) { const e = t.mono[0][1]; while (coeffs.length <= e) coeffs.push(Z); coeffs[e] = t.c; continue; }
    return null;
  }
  while (coeffs.length < 1) coeffs.push(Z);
  return { coeffs, c0, c0pi };
}

export function nf(a: A, ctx: Ctx, depth = 0): RF {
  if (depth > 60) throw new Budget("expression too deep");
  tick(1);
  switch (a.t) {
    case "n": return rfc(a.v);
    case "pi": return rfOfPoly(pv("PI"));
    case "e": return nfExp(N(1), ctx, depth);
    case "C": throw new Unsupported("arbitrary constant inside an expression");
    case "s": return rfOfPoly(pv(a.name));
    case "neg": return rfNeg(nf(a.a, ctx, depth + 1));
    case "add": return a.xs.map((x) => nf(x, ctx, depth + 1)).reduce(rfAdd);
    case "mul": return a.xs.map((x) => nf(x, ctx, depth + 1)).reduce(rfMul);
    case "div": {
      const num = nf(a.a, ctx, depth + 1), den = nf(a.b, ctx, depth + 1);
      if (pIsZero(den.n)) throw new Unsupported("division by zero");
      if (!pIsConst(den.n)) ctx.denoms.push(den.n);
      return rfMul(num, rfInv(den));
    }
    case "pow": return nfPow(a, ctx, depth);
    case "fn": return nfFn(a, ctx, depth);
    case "call": case "Dcall": case "D": case "I": case "EV": case "LIM": case "V":
      throw new Unsupported("operator inside an algebraic comparison");
  }
}
export function foldQ(b: A): Q | null {
  switch (b.t) {
    case "n": return b.v;
    case "neg": { const k = foldQ(b.a); return k === null ? null : qneg(k); }
    case "add": { let s = Z; for (const x of b.xs) { const k = foldQ(x); if (k === null) return null; s = qadd(s, k); } return s; }
    case "mul": { let s = ONE; for (const x of b.xs) { const k = foldQ(x); if (k === null) return null; s = qmul(s, k); } return s; }
    case "div": { const x = foldQ(b.a), y = foldQ(b.b); return x === null || y === null || qiszero(y) ? null : qdiv(x, y); }
    default: return null;
  }
}
function intExp(b: A): number | null { const k = foldQ(b); if (k === null || k.d !== 1n) return null; const n = Number(k.n); return Number.isSafeInteger(n) ? n : null; }
function ratExp(b: A): Q | null { return foldQ(b); }
function nfPow(a: Extract<A, { t: "pow" }>, ctx: Ctx, depth: number): RF {
  const k = intExp(a.b);
  if (k !== null) {
    if (Math.abs(k) > 2048) throw new Budget("exponent exceeds the verifier's budget");
    const base = nf(a.a, ctx, depth + 1);
    if (k >= 0) return { n: pPow(base.n, k), d: pPow(base.d, k) };
    if (!pIsConst(base.n)) ctx.denoms.push(base.n);
    const inv = rfInv(base); return { n: pPow(inv.n, -k), d: pPow(inv.d, -k) };
  }
  const r = ratExp(a.b);
  if (r) {
    if (r.d === 2n) { const root = nfFn({ t: "fn", f: "sqrt", a: a.a }, ctx, depth + 1); const m = Number(r.n); const base = { t: "pow", a: { t: "fn", f: "sqrt", a: a.a }, b: N(m) } as A; void root; return nf(base, ctx, depth + 1); }
    // x^(p/q) for q != 2 only when the base is a positive rational constant with an exact rational power
    const b = nf(a.a, ctx, depth + 1);
    if (pIsConst(b.n) && pIsConst(b.d)) { const c = qdiv(pConst(b.n), pConst(b.d)); const root = exactRoot(c, Number(r.d)); if (root) return rfc(powQ(root, Number(r.n))); }
    throw new Unsupported(`fractional exponent ${qtext(r)} is outside the exact kernel`);
  }
  // variable exponent: only e-like constant bases a^x are not handled here
  throw new Unsupported("non-constant exponent");
}
function powQ(x: Q, n: number): Q { let r = ONE; const k = Math.abs(n); if (k > 200) throw new Budget("power too large"); for (let i = 0; i < k; i++) r = qmul(r, x); return n < 0 ? qdiv(ONE, r) : r; }
function exactRoot(c: Q, k: number): Q | null {
  if (qsign(c) < 0 || k < 2 || k > 8) return null;
  const rt = (n: bigint): bigint | null => { let lo = 0n, hi = n < 2n ? n : BigInt(Math.ceil(Math.pow(Number(n), 1 / k))) + 2n; for (; lo <= hi;) { const mid = (lo + hi) / 2n; const v = mid ** BigInt(k); if (v === n) return mid; if (v < n) lo = mid + 1n; else hi = mid - 1n; } return null; };
  const nn = rt(c.n), dd = rt(c.d); return nn !== null && dd !== null ? q(nn, dd) : null;
}
function atomIndex(ctx: Ctx, kind: string, arg: RF): number {
  for (let i = 0; i < ctx.atoms.length; i++) { const t = ctx.atoms[i]; if (t.kind === kind && rfEqualRaw(t.arg, arg, ctx)) return i; }
  ctx.atoms.push({ kind, arg, vars: [] }); return ctx.atoms.length - 1;
}
function atomIndexAbs(ctx: Ctx, arg: RF): number {
  for (let i = 0; i < ctx.atoms.length; i++) { const t = ctx.atoms[i]; if (t.kind === "abs" && (rfEqualRaw(t.arg, arg, ctx) || rfEqualRaw(t.arg, rfNeg(arg), ctx))) return i; }
  ctx.atoms.push({ kind: "abs", arg, vars: [] }); return ctx.atoms.length - 1;
}
function rfEqualRaw(a: RF, b: RF, ctx: Ctx): boolean { return pIsZero(reduce(pSub(pMul(a.n, b.d), pMul(b.n, a.d)), ctx)); }

function nfFn(a: Extract<A, { t: "fn" }>, ctx: Ctx, depth: number): RF {
  const f = a.f;
  if (f === "log") throw new Ambiguity("log without a stated base");
  if (f === "sqrt") return nfSqrt(a.a, ctx, depth);
  if (f === "abs") {
    const arg = nf(a.a, ctx, depth + 1);
    if (pIsConst(arg.n) && pIsConst(arg.d)) { const c = qdiv(pConst(arg.n), pConst(arg.d)); return rfc(qsign(c) < 0 ? qneg(c) : c); }
    const idx = atomIndexAbs(ctx, arg); const name = `A${idx}`; ctx.atoms[idx].vars = [name];
    ctx.rel.set(name, pMul(arg.n, arg.n)); // A^2 = n^2 (denominator handled by division)
    if (!pIsConst(arg.d)) return rfMul(rfOfPoly(pv(name)), rfInv(arg));
    return rfOfPoly(pv(name));
  }
  if (f === "exp") return nfExp(a.a, ctx, depth);
  if (f === "ln") return nfLn(a.a, ctx, depth);
  if (f === "sin" || f === "cos" || f === "tan" || f === "sec" || f === "csc" || f === "cot") return nfTrig(f, a.a, ctx, depth);
  if (f === "atan" || f === "arctan") { const arg = nf(a.a, ctx, depth + 1); const idx = atomIndex(ctx, "atan", arg); return rfOfPoly(pv(`T${idx}`)); }
  throw new Unsupported(`function ${f} is outside the exact kernel`);
}
function nfSqrt(arg: A, ctx: Ctx, depth: number): RF {
  const r = nf(arg, ctx, depth + 1);
  if (pIsConst(r.n) && pIsConst(r.d)) {
    const c = qdiv(pConst(r.n), pConst(r.d)); if (qsign(c) < 0) throw new Unsupported("square root of a negative constant");
    const rt = exactRoot(c, 2); if (rt) return rfc(rt);
    // c = a/b -> sqrt(ab)/b ; squarefree radical generator
    const ab = c.n * c.d; const { s, t } = squareParts(ab);
    const name = `R${t}`; ctx.rel.set(name, pc(q(t)));
    return rfMul(rfc(q(s, c.d)), rfOfPoly(pv(name)));
  }
  if (!pIsConst(r.d)) {
    // sqrt(N/D) is only read when D is a perfect square of a polynomial times a positive constant (so no sign ambiguity)
    throw new Unsupported("square root of a non-polynomial radicand");
  }
  const idx = atomIndex(ctx, "sqrt", r); const name = `Q${idx}`; ctx.atoms[idx].vars = [name];
  ctx.rel.set(name, pScale(r.n, qdiv(ONE, pConst(r.d))));
  // the radical of a square is |.|, never the base itself: no collapse is attempted
  return rfOfPoly(pv(name));
}
function nfExp(arg: A, ctx: Ctx, depth: number): RF {
  // exp(ln u) = u (u > 0 on the domain of the left side)
  if (arg.t === "fn" && arg.f === "ln") return nf(arg.a, ctx, depth + 1);
  const r = nf(arg, ctx, depth + 1);
  const lin = argLin(r, ctx.v);
  if (lin && qiszero(lin.c0pi)) {
    let out = rfc(ONE);
    const mul1 = (name: string, e: bigint) => { if (e === 0n) return; if (e > 4000n || e < -4000n) throw new Budget("exponent too large"); out = rfMul(out, e > 0n ? rfOfPoly(pv(name, Number(e))) : rfInv(rfOfPoly(pv(name, Number(-e))))); };
    for (let j = 1; j < lin.coeffs.length; j++) {
      const cj = lin.coeffs[j]; if (qiszero(cj)) continue;
      if (!ctx.frozen) ctx.need(ctx.expDen as any, j, cj.d);
      const N = ctx.expDen.get(j) ?? 1n; const e = cj.n * (N / cj.d);
      mul1(`Y${j}`, e);
    }
    if (!qiszero(lin.c0)) {
      if (!ctx.frozen) ctx.need(ctx.expDen as any, 0, lin.c0.d);
      const N = ctx.expDen.get(0) ?? 1n; const e = lin.c0.n * (N / lin.c0.d);
      mul1("E0", e);
    }
    return out;
  }
  // exp of a non-polynomial argument: an atom keyed by the argument
  const idx = atomIndex(ctx, "exp", r); return rfOfPoly(pv(`X${idx}`));
}
const E0_NOTE = "E0 stands for exp(1/N0); E1 for e; they are linked: E1 = E0^N0 handled by rewriting";
void E0_NOTE;

// ln -----------------------------------------------------------------------------------------------
function factorPolyX(p: Poly, v: string): { c: Q; factors: { p: Poly; e: number }[] } | null {
  const co = coeffsIn(p, v); if (!co) return null;
  let cs = co.slice(); while (cs.length > 1 && qiszero(cs[cs.length - 1])) cs.pop();
  if (cs.length === 1) return { c: cs[0], factors: [] };
  // clear denominators and extract content
  let L = 1n; for (const c of cs) L = lcm(L, c.d);
  let ints = cs.map((c) => c.n * (L / c.d)); let g = 0n; for (const c of ints) g = bgcd(g, c); if (g === 0n) g = 1n; ints = ints.map((c) => c / g);
  let content = q(g, L);
  // monic-by-sign: make the leading coefficient positive
  if (ints[ints.length - 1] < 0n) { ints = ints.map((c) => -c); content = qneg(content); }
  const factors: { p: Poly; e: number }[] = [];
  // pull out x^k
  let k = 0; while (ints.length > 1 && ints[0] === 0n) { ints = ints.slice(1); k++; }
  if (k) factors.push({ p: pv(v), e: k });
  // rational roots by the rational-root theorem (bounded)
  const evalI = (c: bigint[], num: bigint, den: bigint): bigint => { let r = 0n; for (let i = c.length - 1; i >= 0; i--) r = r * num + c[i] * den ** BigInt(c.length - 1 - i); return r; };
  let guard = 0;
  while (ints.length > 2 && guard++ < 12) {
    const lead = ints[ints.length - 1] < 0n ? -ints[ints.length - 1] : ints[ints.length - 1], tail = ints[0] < 0n ? -ints[0] : ints[0];
    if (tail === 0n || tail > 10n ** 9n || lead > 10n ** 9n) break;
    const divs = (n: bigint) => { const out: bigint[] = []; for (let d = 1n; d * d <= n && d < 40000n; d++) if (n % d === 0n) { out.push(d); if (d !== n / d) out.push(n / d); } return out; };
    let found: [bigint, bigint] | null = null;
    outer: for (const pn of divs(tail)) for (const qd of divs(lead)) for (const sg of [1n, -1n]) { if (bgcd(pn, qd) !== 1n) continue; if (evalI(ints, sg * pn, qd) === 0n) { found = [sg * pn, qd]; break outer; } }
    if (!found) break;
    // divide by (qd x - pn)
    const [pn, qd] = found; const n = ints.length - 1; const quo: bigint[] = new Array(n).fill(0n); let rem = ints[n];
    for (let i = n - 1; i >= 0; i--) { quo[i] = rem / qd; rem = ints[i] + quo[i] * pn; }
    const lin: Poly = pAdd(pScale(pv(v), q(qd)), pc(q(-pn)));
    const ex = factors.find((f) => pEq(f.p, lin)); if (ex) ex.e++; else factors.push({ p: lin, e: 1 });
    ints = quo; if (ints[ints.length - 1] < 0n) { ints = ints.map((c) => -c); content = qneg(content); }
    let g2 = 0n; for (const c of ints) g2 = bgcd(g2, c); if (g2 > 1n) { ints = ints.map((c) => c / g2); content = qmul(content, q(g2)); }
  }
  if (ints.length > 1) {
    const rest = ints.reduce((acc, c, i) => pAdd(acc, pScale(pv(v, i), q(c))), pZero());
    const restFixed = ints.length ? rest : pc(ONE);
    const ex = factors.find((f) => pEq(f.p, restFixed)); if (ex) ex.e++; else factors.push({ p: restFixed, e: 1 });
  } else if (ints.length === 1) content = qmul(content, q(ints[0]));
  return { c: content, factors };
}
export function visiblyPositive(a: A): boolean {
  switch (a.t) {
    case "n": return qsign(a.v) > 0;
    case "pi": case "e": return true;
    case "fn": return a.f === "exp" || (a.f === "sqrt" && visiblyPositive(a.a));
    case "mul": return a.xs.every(visiblyPositive);
    case "div": return visiblyPositive(a.a) && visiblyPositive(a.b);
    case "pow": return visiblyPositive(a.a) || (intExp(a.b) !== null && intExp(a.b)! % 2 === 0 && false);
    case "add": return a.xs.every((x) => visiblyPositive(x) || isEvenSquare(x)) && a.xs.some(visiblyPositive);
    default: return false;
  }
}
function isEvenSquare(a: A): boolean { return (a.t === "pow" && intExp(a.b) !== null && intExp(a.b)! % 2 === 0 && intExp(a.b)! > 0) || (a.t === "mul" && a.xs.length > 0 && a.xs.every((x) => isEvenSquare(x) || (x.t === "n" && qsign(x.v) > 0))); }

function nfLn(arg: A, ctx: Ctx, depth: number, absMode = false): RF {
  if (arg.t === "fn" && arg.f === "abs") return nfLn(arg.a, ctx, depth + 1, true);
  if (arg.t === "fn" && arg.f === "sqrt") return rfMul(rfc(q(1, 2)), nfLn(arg.a, ctx, depth + 1, absMode));
  // ln(exp(u)) = u
  if (arg.t === "fn" && arg.f === "exp") return nf(arg.a, ctx, depth + 1);
  if (arg.t === "pow" && arg.a.t === "e") return nf(arg.b, ctx, depth + 1);
  if (arg.t === "e") return rfc(ONE);
  const r = nf(arg, ctx, depth + 1);
  const parts: { poly: Poly; sign: 1 | -1 }[] = [{ poly: r.n, sign: 1 }, { poly: r.d, sign: -1 }];
  let out = rfc(Z);
  const logRec: { p: Poly; e: number }[] = [];
  for (const { poly, sign } of parts) {
    if (pIsConst(poly) && !pIsZero(poly)) {
      const c = pConst(poly); if (qsign(c) < 0) { out = rfAdd(out, rfc(Z)); }
      const a = c.n < 0n ? -c.n : c.n, b = c.d;
      for (const [num, s2] of [[a, 1], [b, -1]] as [bigint, number][]) { const pf = primeFactors(num); if (!pf) throw new Unsupported("constant too large for ln"); for (const [pr, e] of pf) out = rfAdd(out, rfMul(rfc(q(sign * s2 * e)), rfOfPoly(pv(`P${pr}`)))); }
      continue;
    }
    const fx = factorPolyX(poly, ctx.v);
    if (fx) {
      const c = fx.c; const a = c.n < 0n ? -c.n : c.n;
      if (a !== 1n || c.d !== 1n) { for (const [num, s2] of [[a, 1], [c.d, -1]] as [bigint, number][]) { const pf = primeFactors(num); if (!pf) throw new Unsupported("constant too large for ln"); for (const [pr, e] of pf) out = rfAdd(out, rfMul(rfc(q(sign * s2 * e)), rfOfPoly(pv(`P${pr}`)))); } }
      for (const f of fx.factors) { const key = pKey(f.p); out = rfAdd(out, rfMul(rfc(q(sign * f.e)), rfOfPoly(pv(`L[${key}]`)))); logRec.push({ p: f.p, e: sign * f.e }); }
      continue;
    }
    // polynomial involving generators: one atom keyed by its normal form
    const idx = atomIndex(ctx, "ln", { n: poly, d: pc(ONE) }); out = rfAdd(out, rfMul(rfc(q(sign)), rfOfPoly(pv(`G${idx}`)))); logRec.push({ p: poly, e: sign });
  }
  if (!absMode) ctx.logs.push({ arg: r.n, factors: logRec });
  return out;
}
const PI_HALVES: Record<number, [number, number]> = {}; void PI_HALVES;
// trig ---------------------------------------------------------------------------------------------
function chebT(k: number, c: Poly): Poly { // cos(k psi) as polynomial in c
  let a = pc(ONE), b = c; if (k === 0) return a; for (let i = 2; i <= k; i++) { const t = pSub(pScale(pMul(c, b), q(2)), a); a = b; b = t; } return b;
}
function chebU(k: number, c: Poly): Poly { // sin(k psi)/sin(psi) as polynomial in c, k>=1
  let a = pc(ONE); if (k === 1) return a; let b = pScale(c, q(2)); for (let i = 3; i <= k; i++) { const t = pSub(pScale(pMul(c, b), q(2)), a); a = b; b = t; } return b;
}
function nfTrig(f: string, argA: A, ctx: Ctx, depth: number): RF {
  if (f === "tan") return rfMul(nfTrig("sin", argA, ctx, depth), rfInv(nfTrig("cos", argA, ctx, depth)));
  if (f === "sec") return rfInv(nfTrig("cos", argA, ctx, depth));
  if (f === "csc") return rfInv(nfTrig("sin", argA, ctx, depth));
  if (f === "cot") return rfMul(nfTrig("cos", argA, ctx, depth), rfInv(nfTrig("sin", argA, ctx, depth)));
  const arg = nf(argA, ctx, depth + 1);
  const lin = argLin(arg, ctx.v);
  if (!lin) { // non-linear argument: atom pair keyed by the argument, no multiple-angle structure
    const idx = atomIndex(ctx, "trig", arg); const s = `Sa${idx}`, c = `Ca${idx}`; ctx.rel.set(s, pSub(pc(ONE), pMul(pv(c), pv(c))));
    return rfOfPoly(f === "sin" ? pv(s) : pv(c));
  }
  // split argument = m*R + c0 (c0 rational + pi part)
  const nonconst = lin.coeffs.slice(1);
  let m = Z, R: Q[] | null = null;
  if (nonconst.some((c) => !qiszero(c))) {
    let L = 1n; for (const c of nonconst) L = lcm(L, c.d);
    let ints = nonconst.map((c) => c.n * (L / c.d)); let g = 0n; for (const c of ints) g = bgcd(g, c); if (g === 0n) g = 1n; ints = ints.map((c) => c / g);
    let mm = q(g, L); if (ints[ints.length - 1] < 0n) { ints = ints.map((c) => -c); mm = qneg(mm); }
    m = mm; R = ints.map((c) => q(c));
  }
  // constant offset c0 = r*pi + rational
  let sinC0: RF = rfc(Z), cosC0: RF = rfc(ONE);
  if (!qiszero(lin.c0pi) || !qiszero(lin.c0)) {
    if (!qiszero(lin.c0)) {
      const key = qtext(lin.c0); const sN = `Sc${key}`, cN = `Cc${key}`; ctx.rel.set(sN, pSub(pc(ONE), pMul(pv(cN), pv(cN))));
      const sc = rfOfPoly(pv(sN)), cc = rfOfPoly(pv(cN));
      if (qiszero(lin.c0pi)) { sinC0 = sc; cosC0 = cc; }
      else { const [s2, c2] = piMultiple(lin.c0pi, ctx); sinC0 = rfAdd(rfMul(sc, c2), rfMul(cc, s2)); cosC0 = rfAdd(rfMul(cc, c2), rfNeg(rfMul(sc, s2))); }
    } else { const [s2, c2] = piMultiple(lin.c0pi, ctx); sinC0 = s2; cosC0 = c2; }
  }
  let sinM: RF = rfc(Z), cosM: RF = rfc(ONE);
  if (R) {
    const key = R.map(qtext).join(","); if (!ctx.frozen) ctx.need(ctx.trigDen as any, key, m.d);
    const N0 = ctx.trigDen.get(key) ?? 1n; const kq = qmul(m, q(N0)); if (kq.d !== 1n) throw new Unsupported("angle multiple is not an integer multiple of the base angle");
    let k = Number(kq.n); const sg = k < 0 ? -1 : 1; k = Math.abs(k); if (k > 40) throw new Budget("multiple angle too large");
    let tb = ctx.trigBases.get(key);
    if (!tb) { tb = { key, s: ctx.fresh("S"), c: ctx.fresh("C"), coeffs: R }; ctx.trigBases.set(key, tb); ctx.rel.set(tb.s, pSub(pc(ONE), pMul(pv(tb.c), pv(tb.c)))); }
    const cv = pv(tb.c), sv = pv(tb.s);
    cosM = rfOfPoly(chebT(k, cv)); sinM = rfOfPoly(k === 0 ? pZero() : pMul(sv, chebU(k, cv)));
    if (sg < 0) sinM = rfNeg(sinM);
  }
  // angle addition
  const sinT = rfAdd(rfMul(sinM, cosC0), rfMul(cosM, sinC0)), cosT = rfAdd(rfMul(cosM, cosC0), rfNeg(rfMul(sinM, sinC0)));
  return f === "sin" ? sinT : cosT;
}
/** (sin(r*pi), cos(r*pi)) exactly for r with denominator dividing 12 via small radicals */
function piMultiple(r: Q, ctx: Ctx): [RF, RF] {
  const twelfths = qmul(r, q(12)); if (twelfths.d !== 1n) throw new Unsupported("angle is not a multiple of pi/12");
  let k = Number(((twelfths.n % 24n) + 24n) % 24n); // angle = k*pi/12 mod 2pi
  const R2 = rfOfPoly(pv("R2")), R3 = rfOfPoly(pv("R3")); ctx.rel.set("R2", pc(q(2))); ctx.rel.set("R3", pc(q(3)));
  const half = rfc(q(1, 2)), s2h = rfMul(rfc(q(1, 2)), R2), s3h = rfMul(rfc(q(1, 2)), R3);
  const base: Record<number, [RF, RF]> = { 0: [rfc(Z), rfc(ONE)], 2: [half, s3h], 3: [s2h, s2h], 4: [s3h, half], 6: [rfc(ONE), rfc(Z)] };
  const quad = Math.floor(k / 6), rem = k % 6; void quad; void rem;
  // reduce to first quadrant
  const q4 = Math.floor(k / 6); const kk = k - q4 * 6; // angle = q4*pi/2 + kk*pi/12, kk in 0..5
  let sc: [RF, RF];
  if (kk === 1 || kk === 5) throw new Unsupported("pi/12 multiples are outside the exact kernel");
  sc = base[kk];
  let [s, c] = sc;
  for (let i = 0; i < q4; i++) { [s, c] = [c, rfNeg(s)]; }
  return [s, c];
}

// ================================================================================================ public helpers
export interface Req { kind: "nonzero" | "positive"; key: string; at?: Q; lin?: { a: Q; b: Q }; stateable: boolean; text: string }
export type EqStatus = "equal" | "different" | "unproven";
export interface EqResult { status: EqStatus; reqs: Req[]; note: string; lawLogs: boolean }

function freshCtx(v: string, asts: A[]): Ctx {
  const ctx = new Ctx(v);
  for (const a of asts) { try { nf(a, ctx); } catch (e) { if (e instanceof Unsupported || e instanceof Ambiguity) throw e; if (e instanceof Budget) throw e; throw e; } }
  ctx.frozen = true; ctx.denoms = []; ctx.logs = []; ctx.atoms = []; ctx.trigBases.clear(); ctx.nvar = 0; ctx.rel.clear();
  return ctx;
}
export function build(a: A, ctx: Ctx): RF { ctx.denoms = []; ctx.logs = []; return nf(a, ctx); }

function monic(p: Poly): Poly { const keys = [...p.m.keys()].sort(); if (!keys.length) return p; const lead = p.m.get(keys[0])!.c; return pScale(p, qdiv(ONE, lead)); }
function reqFromDenoms(ds0: Poly[], ctx: Ctx): Req[] {
  const out: Req[] = [];
  const ds = ds0.map(monic);
  for (const d of ds) {
    // a denominator that is only a monomial in generators (exp(...), radicals, ln atoms ...) adds no statable restriction
    if ([...d.m.values()].length === 1 && !pVars(d).has(ctx.v)) continue;
    const fx = factorPolyX(d, ctx.v);
    if (fx) {
      for (const f of fx.factors) {
        const co = coeffsIn(f.p, ctx.v)!;
        if (co.length === 2) { const root = qneg(qdiv(co[0], co[1])); out.push({ kind: "nonzero", key: `lin:${qtext(root)}`, at: root, stateable: true, text: `${ctx.v} ≠ ${qtext(root)}` }); }
        else if (co.length === 3) { const disc = qsub(qmul(co[1], co[1]), qmul(q(4), qmul(co[2], co[0]))); if (qsign(disc) < 0) continue; out.push({ kind: "nonzero", key: `poly:${pKey(f.p)}`, stateable: false, text: `${pKey(f.p)} ≠ 0` }); }
        else out.push({ kind: "nonzero", key: `poly:${pKey(f.p)}`, stateable: false, text: `${pKey(f.p)} ≠ 0` });
      }
    } else out.push({ kind: "nonzero", key: `poly:${pKey(d)}`, stateable: false, text: "denominator ≠ 0" });
  }
  const seen = new Set<string>(); return out.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
}
function logKeys(logs: Ctx["logs"], ctx: Ctx): Map<string, Req> {
  const m = new Map<string, Req>();
  for (const l of logs) for (const f of l.factors) {
    const co = coeffsIn(f.p, ctx.v); const key = `pos:${pKey(f.p)}`;
    if (co && co.length === 3 && qsign(co[2]) > 0 && qsign(qsub(qmul(co[1], co[1]), qmul(q(4), qmul(co[2], co[0])))) < 0) continue; // positive-definite quadratic
    if (co && co.length === 2) m.set(key, { kind: "positive", key, lin: { a: co[1], b: co[0] }, stateable: true, text: `${linText(co)} > 0` });
    else m.set(key, { kind: "positive", key, stateable: false, text: `${pKey(f.p)} > 0` });
  }
  return m;
}
const linText = (co: Q[]) => (qeq(co[1], ONE) ? "x" : `${qtext(co[1])}x`) + (qiszero(co[0]) ? "" : (qsign(co[0]) < 0 ? ` - ${qtext(qneg(co[0]))}` : ` + ${qtext(co[0])}`));

/** compare two expressions; `visibleLogArgs` lets the caller know whether a log argument was visibly positive */
export function compareExpr(x: A, y: A, v: string, ctxOverride?: Ctx): EqResult {
  resetWork();
  let ctx: Ctx;
  try { ctx = ctxOverride ?? freshCtx(v, [x, y]); } catch (e) { if (e instanceof Unsupported || e instanceof Ambiguity || e instanceof Budget) throw e; throw e; }
  const a = build(x, ctx); const da = ctx.denoms.slice(); const la = ctx.logs.slice();
  const b = build(y, ctx); const db = ctx.denoms.slice(); const lb = ctx.logs.slice();
  const zero = reduce(pSub(pMul(a.n, b.d), pMul(b.n, a.d)), ctx);
  const ra = reqFromDenoms(da, ctx), rb = reqFromDenoms(db, ctx);
  const keysA = new Set(ra.map((r) => r.key)), keysB = new Set(rb.map((r) => r.key));
  const reqs: Req[] = [...ra.filter((r) => !keysB.has(r.key)), ...rb.filter((r) => !keysA.has(r.key))];
  // log laws: positivity is needed for factors whose log structure differs between the two sides
  const pa = logKeys(la, ctx), pb = logKeys(lb, ctx);
  const sigA = JSON.stringify([...pa.keys()].sort()), sigB = JSON.stringify([...pb.keys()].sort());
  let lawLogs = false;
  if (pIsZero(zero) && (la.length || lb.length) && (sigA !== sigB || logStructureDiffers(la, lb))) {
    lawLogs = true;
    for (const [k, r] of [...pa, ...pb]) if (!reqs.some((q2) => q2.key === k) && !allVisiblyPositive(x, y, r, ctx)) reqs.push(r);
  }
  if (pIsZero(zero)) return { status: "equal", reqs, note: "formal identity in the exact kernel", lawLogs };
  const num = numericDisagree(x, y, v);
  if (num === "differ") return { status: "different", reqs: [], note: "the sides differ (exact identity fails and sampling confirms)", lawLogs };
  return { status: "unproven", reqs: [], note: "the exact kernel could not prove equality and no disagreement was exhibited", lawLogs };
}
function logStructureDiffers(la: Ctx["logs"], lb: Ctx["logs"]): boolean {
  const sig = (ls: Ctx["logs"]) => JSON.stringify(ls.map((l) => l.factors.map((f) => [pKey(f.p), f.e]).sort()).map((x) => JSON.stringify(x)).sort());
  return sig(la) !== sig(lb);
}
function allVisiblyPositive(x: A, y: A, r: Req, ctx: Ctx): boolean {
  // a requirement on a factor that is visibly positive (like x^2+1) never needs to be stated
  void x; void y;
  if (!r.lin) { // non-linear factor: positive when it has no real root and a positive leading/constant behaviour
    return /^\+?$/.test("") && false;
  }
  void ctx; return false;
}
export function visiblyPositiveFactor(k: string): boolean { void k; return false; }

// ================================================================================================ numeric evaluation (disagreement only)
export type Env = Record<string, number>;
export function evalNum(a: A, env: Env, depth = 0): number {
  if (depth > 80) throw new Budget("deep");
  switch (a.t) {
    case "n": return Number(a.v.n) / Number(a.v.d);
    case "pi": return Math.PI; case "e": return Math.E;
    case "s": { if (!(a.name in env)) throw new Unsupported(`free symbol ${a.name}`); return env[a.name]; }
    case "neg": return -evalNum(a.a, env, depth + 1);
    case "add": return a.xs.reduce((s, x) => s + evalNum(x, env, depth + 1), 0);
    case "mul": return a.xs.reduce((s, x) => s * evalNum(x, env, depth + 1), 1);
    case "div": { const d = evalNum(a.b, env, depth + 1); if (d === 0) throw new RangeError("div0"); return evalNum(a.a, env, depth + 1) / d; }
    case "pow": { const b = evalNum(a.a, env, depth + 1), e = evalNum(a.b, env, depth + 1); if (b < 0 && !Number.isInteger(e)) throw new RangeError("neg base"); if (b === 0 && e < 0) throw new RangeError("0^neg"); const r = Math.pow(b, e); if (!Number.isFinite(r)) throw new RangeError("overflow"); return r; }
    case "fn": {
      const x = evalNum(a.a, env, depth + 1);
      switch (a.f) {
        case "sin": return Math.sin(x); case "cos": return Math.cos(x); case "tan": { if (Math.abs(Math.cos(x)) < 1e-9) throw new RangeError("tan"); return Math.tan(x); }
        case "sec": return 1 / Math.cos(x); case "csc": return 1 / Math.sin(x); case "cot": return Math.cos(x) / Math.sin(x);
        case "exp": { const r = Math.exp(x); if (!Number.isFinite(r)) throw new RangeError("exp"); return r; }
        case "ln": if (x <= 0) throw new RangeError("ln"); return Math.log(x);
        case "sqrt": if (x < 0) throw new RangeError("sqrt"); return Math.sqrt(x);
        case "abs": return Math.abs(x); case "atan": case "arctan": return Math.atan(x);
        default: throw new Unsupported(a.f);
      }
    }
    default: throw new Unsupported("operator in numeric comparison");
  }
}
const SAMPLE_X = [0.37, 1.3, 2.1, 0.9, 1.7, 3.4, 0.53, 2.9, -0.6, -1.4, -2.3, 4.2, 0.11, 5.5, -3.1, 1.05];
export function numericDisagree(x: A, y: A, v: string, extra: Env = {}): "differ" | "agree" | "few" {
  let good = 0;
  for (const s of SAMPLE_X) {
    let a: number, b: number;
    try { a = evalNum(x, { ...extra, [v]: s }); b = evalNum(y, { ...extra, [v]: s }); } catch (e) { if (e instanceof RangeError) continue; if (e instanceof Unsupported) return "few"; throw e; }
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    good++;
    if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) return "differ";
  }
  return good >= 3 ? "agree" : "few";
}

// ================================================================================================ differentiation (independent of calculus-core and d5)
export function hasVar(a: A, v: string): boolean {
  switch (a.t) {
    case "s": return a.name === v;
    case "n": case "pi": case "e": case "C": case "V": return false;
    case "neg": return hasVar(a.a, v);
    case "add": case "mul": return a.xs.some((x) => hasVar(x, v));
    case "div": case "pow": return hasVar(a.a, v) || hasVar(a.b, v);
    case "fn": return hasVar(a.a, v);
    case "call": return a.args.some((x) => hasVar(x, v));
    case "Dcall": return hasVar(a.arg, v);
    case "D": return hasVar(a.of, v);
    case "I": return hasVar(a.f, v) || (a.lo ? hasVar(a.lo, v) : false) || (a.hi ? hasVar(a.hi, v) : false);
    case "EV": return hasVar(a.f, v);
    case "LIM": return hasVar(a.f, v);
  }
}
const Z0 = N(0), O1 = N(1);
export function d6(a: A, v: string, depth = 0, ov?: Record<string, A>): A {
  if (depth > 60) throw new Budget("expression too deep to differentiate");
  tick(1);
  const r = (x: A) => d6(x, v, depth + 1, ov);
  const dep = (x: A) => hasVar(x, v) || (ov ? Object.keys(ov).some((k) => hasVar(x, k)) : false);
  switch (a.t) {
    case "n": case "pi": case "e": case "C": return Z0;
    case "s": if (ov && a.name in ov) return ov[a.name]; return a.name === v ? O1 : Z0;
    case "neg": return neg(r(a.a));
    case "add": return add(...a.xs.map(r));
    case "mul": return add(...a.xs.map((_, i) => mul(...a.xs.map((f, j) => (i === j ? r(f) : f)))));
    case "div": return div(add(mul(r(a.a), a.b), neg(mul(a.a, r(a.b)))), pw(a.b, N(2)));
    case "pow": {
      const hb = dep(a.a), he = dep(a.b);
      if (!he) { const ne = add(a.b, N(-1)); return mul(a.b, pw(a.a, ne), r(a.a)); }
      if (!hb) { return mul(a, fn("ln", a.a), r(a.b)); }
      throw new Unsupported("variable base and variable exponent (logarithmic differentiation)");
    }
    case "fn": {
      const u = a.a, du = r(u);
      switch (a.f) {
        case "sin": return mul(fn("cos", u), du);
        case "cos": return neg(mul(fn("sin", u), du));
        case "tan": return mul(pw(fn("cos", u), N(-2)), du);
        case "sec": return mul(fn("sec", u), fn("tan", u), du);
        case "csc": return neg(mul(fn("csc", u), fn("cot", u), du));
        case "cot": return neg(mul(pw(fn("sin", u), N(-2)), du));
        case "exp": return mul(a, du);
        case "ln": return div(du, u);
        case "sqrt": return div(du, mul(N(2), a));
        case "abs": return mul(div(u, a), du);
        case "atan": case "arctan": return div(du, add(N(1), pw(u, N(2))));
        case "log": throw new Ambiguity("log without a stated base");
        default: throw new Unsupported(`derivative of ${a.f}`);
      }
    }
    default: throw new Unsupported("derivative of an operator expression");
  }
}

// ================================================================================================ substitution helpers
export function substitute(a: A, name: string, by: A): A {
  switch (a.t) {
    case "s": return a.name === name ? by : a;
    case "n": case "pi": case "e": case "C": case "V": return a;
    case "neg": return { t: "neg", a: substitute(a.a, name, by) };
    case "add": case "mul": return { t: a.t, xs: a.xs.map((x) => substitute(x, name, by)) };
    case "div": case "pow": return { t: a.t, a: substitute(a.a, name, by), b: substitute(a.b, name, by) } as A;
    case "fn": return { t: "fn", f: a.f, a: substitute(a.a, name, by) };
    case "call": return { ...a, args: a.args.map((x) => substitute(x, name, by)) };
    case "Dcall": return { ...a, arg: substitute(a.arg, name, by) };
    case "D": return { ...a, of: substitute(a.of, name, by) };
    case "I": return a.v === name ? a : { ...a, f: substitute(a.f, name, by), lo: a.lo ? substitute(a.lo, name, by) : undefined, hi: a.hi ? substitute(a.hi, name, by) : undefined };
    case "EV": return a.v === name ? a : { ...a, f: substitute(a.f, name, by), lo: substitute(a.lo, name, by), hi: substitute(a.hi, name, by) };
    case "LIM": return a.v === name ? a : { ...a, f: substitute(a.f, name, by) };
  }
}
export const isConstant = (a: A, v: string) => !hasVar(a, v);
export { N, S, add, mul, div, neg, pw, fn, NotationError };
export { Overflow, qcmp, qeq, qsign };

// ================================================================================================ domain helpers for the planners
/** restrictions that are already implied by the domain of `a` itself (so a student need not restate them when simplifying it) */
export function domainReqs(a: A, v: string): Req[] {
  resetWork();
  const ctx = freshCtx(v, [a]);
  build(a, ctx);
  return [...reqFromDenoms(ctx.denoms.slice(), ctx), ...logKeys(ctx.logs.slice(), ctx).values()];
}
/** natural-log arguments (not under |.|) that appear in `a`, so an antiderivative can be checked for the domain it silently assumes */
export function plainLogArgs(a: A, out: A[] = []): A[] {
  switch (a.t) {
    case "neg": plainLogArgs(a.a, out); break;
    case "add": case "mul": a.xs.forEach((x) => plainLogArgs(x, out)); break;
    case "div": plainLogArgs(a.a, out); plainLogArgs(a.b, out); break;
    case "pow": plainLogArgs(a.a, out); plainLogArgs(a.b, out); break;
    case "fn": if (a.f === "ln" && !(a.a.t === "fn" && a.a.f === "abs")) out.push(a.a); plainLogArgs(a.a, out); break;
    default: break;
  }
  return out;
}
