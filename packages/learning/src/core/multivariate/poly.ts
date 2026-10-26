// Sparse multivariate polynomials over Q (kernel Rational, BigInt inside) with exact division, GCD, squarefree part and irreducibility
// certificates. Variables are strings. Nothing here samples or uses floats.
import { Rational } from "../../math-kernel.ts";
import { irreducible as uniIrreducible } from "../../reasoner/verifier/verifier.ts";

const ZERO = Rational.zero, ONE = Rational.one;
export type Mon = Record<string, number>;
interface Term { c: Rational; m: Mon }
const mkey = (m: Mon): string => Object.keys(m).filter((v) => m[v] > 0).sort().map((v) => `${v}^${m[v]}`).join("*");
const clean = (m: Mon): Mon => { const o: Mon = {}; for (const v of Object.keys(m)) if (m[v] > 0) o[v] = m[v]; return o; };

export class Poly {
  readonly t: Map<string, Term>;
  constructor(t: Map<string, Term> = new Map()) { this.t = t; }
  static zero = () => new Poly();
  static const(c: Rational) { const p = new Poly(); if (!c.isZero()) p.t.set("", { c, m: {} }); return p; }
  static one = () => Poly.const(ONE);
  static v(name: string, k = 1) { const p = new Poly(); p.t.set(mkey({ [name]: k }), { c: ONE, m: { [name]: k } }); return p; }
  isZero() { return this.t.size === 0; }
  isConst() { return this.t.size === 0 || (this.t.size === 1 && this.t.has("")); }
  constVal(): Rational { return this.t.get("")?.c ?? ZERO; }
  vars(): string[] { const s = new Set<string>(); for (const { m } of this.t.values()) for (const v of Object.keys(m)) s.add(v); return [...s].sort(); }
  deg(v: string): number { let d = 0; for (const { m } of this.t.values()) d = Math.max(d, m[v] ?? 0); return d; }
  totalDeg(): number { let d = 0; for (const { m } of this.t.values()) d = Math.max(d, Object.values(m).reduce((a, b) => a + b, 0)); return d; }
  private add1(c: Rational, m: Mon) { const k = mkey(m); const e = this.t.get(k); if (!e) { if (!c.isZero()) this.t.set(k, { c, m: clean(m) }); } else { const n = e.c.add(c); if (n.isZero()) this.t.delete(k); else e.c = n; } }
  add(o: Poly): Poly { const r = new Poly(new Map([...this.t].map(([k, e]) => [k, { c: e.c, m: e.m }]))); for (const e of o.t.values()) r.add1(e.c, e.m); return r; }
  neg(): Poly { return new Poly(new Map([...this.t].map(([k, e]) => [k, { c: e.c.neg(), m: e.m }]))); }
  sub(o: Poly) { return this.add(o.neg()); }
  scale(c: Rational): Poly { if (c.isZero()) return Poly.zero(); return new Poly(new Map([...this.t].map(([k, e]) => [k, { c: e.c.mul(c), m: e.m }]))); }
  mul(o: Poly): Poly { const r = new Poly(); for (const a of this.t.values()) for (const b of o.t.values()) { const m: Mon = { ...a.m }; for (const v of Object.keys(b.m)) m[v] = (m[v] ?? 0) + b.m[v]; r.add1(a.c.mul(b.c), m); } return r; }
  pow(n: number): Poly { let r = Poly.one(), b: Poly = this; let k = n; while (k > 0) { if (k & 1) r = r.mul(b); k >>= 1; if (k) b = b.mul(b); } return r; }
  eq(o: Poly): boolean { return this.sub(o).isZero(); }
  /** leading term in lex order over sorted variables */
  lead(): Term | null { let best: Term | null = null; let bk: number[] | null = null; const vs = this.vars(); for (const e of this.t.values()) { const k = vs.map((v) => e.m[v] ?? 0); if (!bk || cmp(k, bk) > 0) { best = e; bk = k; } } return best; }
  /** coefficients as a polynomial in v: index = degree */
  coeffs(v: string): Poly[] { const d = this.deg(v); const out: Poly[] = Array.from({ length: d + 1 }, () => new Poly()); for (const e of this.t.values()) { const k = e.m[v] ?? 0; const m = { ...e.m }; delete m[v]; out[k].add1(e.c, m); } return out; }
  static fromCoeffs(v: string, cs: Poly[]): Poly { let r = Poly.zero(); cs.forEach((c, k) => { r = r.add(c.mul(Poly.v(v, k).isZero() ? Poly.one() : k === 0 ? Poly.one() : Poly.v(v, k))); }); return r; }
  deriv(v: string): Poly { const r = new Poly(); for (const e of this.t.values()) { const k = e.m[v] ?? 0; if (!k) continue; const m = { ...e.m }; m[v] = k - 1; r.add1(e.c.mul(new Rational(k)), m); } return r; }
  /** exact value at a point (variables not in `pt` make this return null) */
  at(pt: Record<string, Rational>): Rational | null { let s = ZERO; for (const e of this.t.values()) { let c = e.c; for (const v of Object.keys(e.m)) { const x = pt[v]; if (!x) return null; for (let i = 0; i < e.m[v]; i++) c = c.mul(x); } s = s.add(c); } return s; }
  /** substitute numbers for some variables */
  sub_(pt: Record<string, Rational>): Poly { let r = Poly.zero(); for (const e of this.t.values()) { let c = e.c; const m: Mon = {}; for (const v of Object.keys(e.m)) { const x = pt[v]; if (x) for (let i = 0; i < e.m[v]; i++) c = c.mul(x); else m[v] = e.m[v]; } r.add1(c, m); } return r; }
  toString(): string {
    if (!this.t.size) return "0"; const vs = this.vars(); const terms = [...this.t.values()].sort((a, b) => cmp(vs.map((v) => b.m[v] ?? 0), vs.map((v) => a.m[v] ?? 0)));
    return terms.map((e, i) => { const neg = e.c.lt(ZERO); const a = neg ? e.c.neg() : e.c; const mon = Object.keys(e.m).sort().map((v) => (e.m[v] === 1 ? v : `${v}^${e.m[v]}`)).join("*"); const body = !mon ? a.toString() : a.isOne() ? mon : `${a}*${mon}`; return (neg ? (i ? "-" : "-") : i ? "+" : "") + body; }).join("");
  }
}
const cmp = (a: number[], b: number[]): number => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

/** exact division: q with a = q·b, or null when b does not divide a */
export function divExact(a: Poly, b: Poly): Poly | null {
  if (b.isZero()) return null; if (a.isZero()) return Poly.zero();
  const lb = b.lead()!; let r = a; let q = Poly.zero(); let guard = 0;
  while (!r.isZero()) {
    if (++guard > 5000) return null; const lr = r.lead()!; const m: Mon = { ...lr.m };
    for (const v of Object.keys(lb.m)) { const d = (m[v] ?? 0) - lb.m[v]; if (d < 0) return null; m[v] = d; }
    const c = lr.c.div(lb.c); const t = new Poly(); t.t.set(mkey(m), { c, m: clean(m) }); q = q.add(t); r = r.sub(t.mul(b));
  }
  return q;
}
const intContent = (p: Poly): Rational => { let g = 0n, l = 1n; for (const e of p.t.values()) { l = (l * e.c.denBig) / gcdB(l, e.c.denBig); } for (const e of p.t.values()) { g = gcdB(g, (e.c.numBig * l) / e.c.denBig); } return g === 0n ? ONE : new Rational(g, l); };
function gcdB(a: bigint, b: bigint): bigint { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
/** scale so the coefficients are coprime integers and the lex-leading one is positive */
export function normalise(p: Poly): Poly { if (p.isZero()) return p; if (p.isConst()) return Poly.one(); let q = p.scale(ONE.div(intContent(p))); if (q.lead()!.c.lt(ZERO)) q = q.neg(); return q; }
/** gcd up to a unit (normalised); gcd(0,p)=p */
export function gcd(a: Poly, b: Poly, depth = 0): Poly {
  if (a.isZero()) return normalise(b); if (b.isZero()) return normalise(a);
  if (a.isConst() || b.isConst()) return Poly.one();
  const vs = [...new Set([...a.vars(), ...b.vars()])].sort(); const v = vs.find((x) => a.deg(x) > 0 && b.deg(x) > 0) ?? null;
  if (!v) { // no common variable: gcd of the coefficients seen as polys in a variable one has and the other lacks
    const w = vs.find((x) => a.deg(x) > 0 || b.deg(x) > 0)!; const ca = a.deg(w) > 0 ? a.coeffs(w) : [a], cb = b.deg(w) > 0 ? b.coeffs(w) : [b];
    return ca.concat(cb).reduce((g, c) => gcd(g, c, depth + 1), Poly.zero());
  }
  const cont = (p: Poly) => p.coeffs(v).reduce((g, c) => gcd(g, c, depth + 1), Poly.zero());
  const ca = cont(a), cb = cont(b); const g0 = gcd(ca, cb, depth + 1);
  let x = divExact(a, ca)!, y = divExact(b, cb)!;
  if (x.deg(v) < y.deg(v)) [x, y] = [y, x];
  while (!y.isZero() && y.deg(v) > 0) {
    const dx = x.deg(v), dy = y.deg(v); const ly = y.coeffs(v)[dy]; let r = x;
    for (let k = dx - dy + 1; k > 0 && !r.isZero() && r.deg(v) >= dy; k--) { // pseudo-remainder: lc(y)·r − lc(r)·v^(dr−dy)·y
      const dr = r.deg(v), lr = r.coeffs(v)[dr]; r = r.mul(ly).sub(lr.mul(Poly.v(v, dr - dy)).mul(y)); }
    x = y; y = r.isZero() ? r : divExact(r, cont(r))!;
  }
  const core = y.isZero() ? x : Poly.one();           // y a nonzero v-free remainder ⇒ coprime in v
  const pp = core.isZero() ? Poly.one() : divExact(core, cont(core))!;
  return normalise(pp.mul(g0));
}
/** squarefree part (radical): p / gcd(p, all partials) */
export function radical(p: Poly): Poly { if (p.isConst()) return Poly.one(); let g = Poly.zero(); for (const v of p.vars()) g = gcd(g, p.deriv(v)); g = gcd(p, g); return normalise(divExact(p, g) ?? p); }
/** the part of `a` (radical) not already in `b` (radical): a / gcd(a, b) */
export function extra(a: Poly, b: Poly): Poly { const ra = radical(a), rb = radical(b); const g = gcd(ra, rb); return normalise(divExact(ra, g) ?? ra); }
/** no real point can make it zero: positive constant plus positive-coefficient terms that are all even powers */
export function noRealZero(p: Poly): boolean { if (p.isConst()) return !p.isZero(); const c0 = p.constVal(); if (!c0.gt(ZERO)) return false; for (const e of p.t.values()) { if (e.c.lt(ZERO)) return false; if (Object.values(e.m).some((k) => k % 2)) return false; } return true; }

function polySqrt(d: Poly): Poly | null {
  if (d.isZero()) return d; const l = d.lead()!; if (l.c.lt(ZERO)) return null; const rc = ratSqrt(l.c); if (!rc) return null; const m: Mon = {}; for (const v of Object.keys(l.m)) { if (l.m[v] % 2) return null; m[v] = l.m[v] / 2; }
  let s = new Poly(); s.t.set(mkey(m), { c: rc, m: clean(m) }); for (let i = 0; i < 400; i++) { const r = d.sub(s.mul(s)); if (r.isZero()) return s; const lr = r.lead()!, ls = s.lead()!; const mm: Mon = { ...lr.m }; for (const v of Object.keys(ls.m)) { const e = (mm[v] ?? 0) - ls.m[v]; if (e < 0) return null; mm[v] = e; } const t = new Poly(); t.t.set(mkey(mm), { c: lr.c.div(ls.c.mul(new Rational(2))), m: clean(mm) }); s = s.add(t); }
  return null;
}
function ratSqrt(c: Rational): Rational | null { const f = (n: bigint): bigint | null => { if (n < 0n) return null; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); for (let k = -2n; k <= 2n; k++) { const y = x + k; if (y >= 0n && y * y === n) return y; } return null; }; const a = f(c.numBig), b = f(c.denBig); return a !== null && b !== null ? new Rational(a, b) : null; }
const toUni = (p: Poly, v: string): Rational[] => p.coeffs(v).map((c) => c.constVal());
/** true = certified irreducible over Q; false = certified reducible (or a unit/monomial of degree > 1); null = not decided */
export function irreducibleCert(p: Poly): boolean | null {
  if (p.isConst()) return false; const vs = p.vars();
  if (p.t.size === 1) return p.totalDeg() === 1;
  const g = [...p.t.values()].reduce<Poly | null>((acc, e) => { const m = new Poly(); m.t.set(mkey(e.m), { c: ONE, m: e.m }); return acc ? gcd(acc, m) : m; }, null); if (g && !g.isConst()) return false;   // a common monomial factor
  if (!radical(p).eq(normalise(p))) return false;                                                   // a repeated factor
  for (const v of vs) { const cs = p.coeffs(v); if (cs.length === 2 && cs.every((c) => !c.isZero() || true)) { const gg = gcd(cs[0], cs[1]); return gg.isConst() ? true : false; } }  // linear in v: irreducible iff primitive in v
  for (const v of vs) { const cs = p.coeffs(v); if (cs.length === 3) { const disc = cs[1].mul(cs[1]).sub(cs[0].mul(cs[2]).scale(new Rational(4))); const cont = cs.reduce((g2, c) => gcd(g2, c), Poly.zero()); if (!cont.isConst()) return false; if (polySqrt(disc)) return false; } }
  if (vs.length === 2) { // homogeneous: dehomogenise and look for a rational root
    const tot = p.totalDeg(); if ([...p.t.values()].every((e) => Object.values(e.m).reduce((a, b) => a + b, 0) === tot)) { const [x, y] = vs; const u = toUni(p.sub_({ [y]: ONE }), x); if (u.length > 1 && !uniIrreducible(u)) return false; if (u.length > 1 && uniIrreducible(u) && p.deg(x) === tot && p.deg(y) === tot) return true; } }
  // specialisation certificate: fix all but one variable at integers; if the univariate image is irreducible, the degree is kept and p is primitive in that variable, p is irreducible
  for (const v of vs) { const cs = p.coeffs(v); if (cs.length < 3 || !cs.reduce((g2, c) => gcd(g2, c), Poly.zero()).isConst()) continue; const others = vs.filter((o) => o !== v);
    for (const seed of [1, 2, -1, 3, 5, 7]) { const pt: Record<string, Rational> = {}; others.forEach((o, i) => { pt[o] = new Rational(seed + i); }); const u = toUni(p.sub_(pt), v); if (u.length === cs.length && u.every((c) => c !== undefined) && uniIrreducible(u)) return true; } }
  return null;
}
