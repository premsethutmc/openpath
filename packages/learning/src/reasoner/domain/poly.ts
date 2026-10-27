// Minimal exact univariate polynomials and rational functions over the kernel's Rational (K05.2, stage D0).
// Deliberately small: arithmetic, division with remainder, gcd, rational roots, splitting into linear factors.
// This is the only new mathematical machinery in K05.2. Every operation is exact; there is no sampling and no floating point.
import { Rational, Expr, type MathExpr } from "../../math-kernel.ts";

export class OutsideBoundary extends Error {}
const Z = Rational.zero, ONE = Rational.one;
const absBig = (a: bigint) => (a < 0n ? -a : a);
const gcdBig = (a: bigint, b: bigint): bigint => { a = absBig(a); b = absBig(b); while (b) [a, b] = [b, a % b]; return a; };
const lcmBig = (a: bigint, b: bigint) => (a === 0n || b === 0n ? 0n : absBig(a * b) / gcdBig(a, b));
const COEFF_LIMIT = 10n ** 12n;

export class Poly {
  readonly c: Rational[]; // c[i] is the coefficient of x^i; no trailing zeros; [] is the zero polynomial
  constructor(coeffs: Rational[]) {
    let n = coeffs.length;
    while (n > 0 && coeffs[n - 1].isZero()) n--;
    this.c = coeffs.slice(0, n);
  }
  static zero = new Poly([]);
  static one = new Poly([ONE]);
  static x = new Poly([Z, ONE]);
  static const(r: Rational) { return new Poly([r]); }
  static linear(a: Rational, b: Rational) { return new Poly([b, a]); } // a*x + b

  get degree(): number { return this.c.length - 1; } // -1 for the zero polynomial
  isZero() { return this.c.length === 0; }
  isConst() { return this.c.length <= 1; }
  lead(): Rational { return this.c[this.c.length - 1] ?? Z; }
  equals(o: Poly) { return this.c.length === o.c.length && this.c.every((v, i) => v.eq(o.c[i])); }

  add(o: Poly): Poly { const n = Math.max(this.c.length, o.c.length); const r: Rational[] = []; for (let i = 0; i < n; i++) r.push((this.c[i] ?? Z).add(o.c[i] ?? Z)); return new Poly(r); }
  neg(): Poly { return new Poly(this.c.map((v) => v.neg())); }
  sub(o: Poly): Poly { return this.add(o.neg()); }
  scale(k: Rational): Poly { return new Poly(this.c.map((v) => v.mul(k))); }
  mul(o: Poly): Poly {
    if (this.isZero() || o.isZero()) return Poly.zero;
    const r: Rational[] = new Array(this.c.length + o.c.length - 1).fill(Z);
    this.c.forEach((a, i) => o.c.forEach((b, j) => { r[i + j] = r[i + j].add(a.mul(b)); }));
    return new Poly(r);
  }
  pow(n: number): Poly { let r = Poly.one; for (let i = 0; i < n; i++) r = r.mul(this); return r; }
  eval(x: Rational): Rational { let r = Z; for (let i = this.c.length - 1; i >= 0; i--) r = r.mul(x).add(this.c[i]); return r; }
  deriv(): Poly { return new Poly(this.c.slice(1).map((v, i) => v.mul(new Rational(i + 1)))); }
  monic(): Poly { return this.isZero() ? this : this.scale(this.lead().inv()); }

  /** Division with remainder: this = q*b + r, deg r < deg b. */
  divmod(b: Poly): { q: Poly; r: Poly } {
    if (b.isZero()) throw new Error("polynomial division by zero");
    let r: Poly = this; const qc: Rational[] = new Array(Math.max(0, this.degree - b.degree + 1)).fill(Z);
    while (!r.isZero() && r.degree >= b.degree) {
      const k = r.lead().div(b.lead()), d = r.degree - b.degree;
      qc[d] = k;
      r = r.sub(b.mul(new Poly([...new Array(d).fill(Z), k])));
    }
    return { q: new Poly(qc), r };
  }
  /** Exact division; null if the remainder is not zero. */
  divExact(b: Poly): Poly | null { const { q, r } = this.divmod(b); return r.isZero() ? q : null; }
  /** Monic gcd (zero if both are zero). */
  gcd(o: Poly): Poly { let a: Poly = this, b: Poly = o; while (!b.isZero()) { const r = a.divmod(b).r; a = b; b = r; } return a.monic(); }
  /** lcm up to a constant factor, monic. */
  lcm(o: Poly): Poly { if (this.isZero() || o.isZero()) return Poly.zero; return this.mul(o).divExact(this.gcd(o))!.monic(); }
  /** Product of the distinct irreducible factors' radical: p / gcd(p, p'), monic. */
  squarefree(): Poly { if (this.degree <= 0) return this.monic(); return this.divExact(this.gcd(this.deriv()))!.monic(); }

  /** Distinct rational roots (rational-root theorem on the integer-scaled polynomial). */
  rationalRoots(): Rational[] {
    if (this.degree < 1) return [];
    let l = 1n; for (const v of this.c) l = lcmBig(l, v.denBig);
    const a = this.c.map((v) => (v.numBig * l) / v.denBig);
    const out: Rational[] = [];
    let lo = 0; while (a[lo] === 0n) lo++;
    if (lo > 0) out.push(Z);
    const a0 = absBig(a[lo]), an = absBig(a[a.length - 1]);
    if (a0 > COEFF_LIMIT || an > COEFF_LIMIT) throw new OutsideBoundary("coefficients beyond the stated boundary");
    for (const p of divisors(a0)) for (const q of divisors(an)) {
      if (gcdBig(p, q) !== 1n) continue;
      for (const s of [1n, -1n]) { const r = new Rational(s * p, q); if (this.eval(r).isZero()) out.push(r); }
    }
    return out.sort((x, y) => (x.lt(y) ? -1 : x.gt(y) ? 1 : 0));
  }
  /** content * prod (root_i)-linear factors, with multiplicity, if the polynomial splits over Q; otherwise null. */
  splitLinear(): { content: Rational; roots: Rational[] } | null {
    if (this.isZero()) return null;
    let p: Poly = this; const roots: Rational[] = [];
    while (p.degree >= 1) {
      const rs = p.rationalRoots();
      if (rs.length === 0) return null;
      const r = rs[0]; roots.push(r);
      p = p.divExact(Poly.linear(ONE, r.neg()))!;
    }
    return { content: p.c[0] ?? ONE, roots };
  }
  toString(): string { return this.c.map((v, i) => `${v}x^${i}`).join("+") || "0"; }

  /** Polynomial from a syntactically polynomial expression, else null. */
  static fromExpr(e: MathExpr): Poly | null { const f = RatFun.fromExpr(e); if (!f || f.d.degree > 0) return null; return f.n.scale(f.d.c[0].inv()); }
}
function divisors(n: bigint): bigint[] {
  const out: bigint[] = [];
  for (let i = 1n; i * i <= n; i++) if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); }
  return out;
}

/** n/d with d != 0. Operations do NOT cancel: call reduce() explicitly, so a removable factor stays visible until a rule removes it. */
export class RatFun {
  readonly n: Poly;
  readonly d: Poly;
  constructor(n: Poly, d: Poly) { if (d.isZero()) throw new Error("zero denominator"); this.n = n; this.d = d; }
  static fromPoly(p: Poly) { return new RatFun(p, Poly.one); }
  add(o: RatFun): RatFun {
    const g = this.d.gcd(o.d), l = this.d.mul(o.d).divExact(g)!;
    return new RatFun(this.n.mul(l.divExact(this.d)!).add(o.n.mul(l.divExact(o.d)!)), l);
  }
  neg() { return new RatFun(this.n.neg(), this.d); }
  sub(o: RatFun) { return this.add(o.neg()); }
  mul(o: RatFun) { return new RatFun(this.n.mul(o.n), this.d.mul(o.d)); }
  div(o: RatFun): RatFun | null { return o.n.isZero() ? null : new RatFun(this.n.mul(o.d), this.d.mul(o.n)); }
  /** Cancel the gcd and normalise so that the denominator is monic. */
  reduce(): RatFun {
    if (this.n.isZero()) return new RatFun(Poly.zero, Poly.one);
    const g = this.n.gcd(this.d); const n = this.n.divExact(g)!, d = this.d.divExact(g)!; const k = d.lead().inv();
    return new RatFun(n.scale(k), d.scale(k));
  }
  isPolynomial() { return this.reduce().d.degree === 0; }
  /** Exact value at a rational point, or null where the (unreduced) denominator vanishes. */
  evalAt(x: Rational): Rational | null { const dv = this.d.eval(x); return dv.isZero() ? null : this.n.eval(x).div(dv); }

  /** Unreduced conversion of an expression tree; null if it is not a rational function (or divides by the zero polynomial). */
  static fromExpr(e: MathExpr): RatFun | null {
    switch (e.kind) {
      case "num": return RatFun.fromPoly(Poly.const(e.value));
      case "var": return e.name === "x" ? RatFun.fromPoly(Poly.x) : null;
      case "neg": { const a = RatFun.fromExpr(e.operand); return a && a.neg(); }
      case "quantity": return RatFun.fromExpr(e.value);
      case "add": case "sub": case "mul": case "div": {
        const a = RatFun.fromExpr(e.left), b = RatFun.fromExpr(e.right);
        if (!a || !b) return null;
        return e.kind === "add" ? a.add(b) : e.kind === "sub" ? a.sub(b) : e.kind === "mul" ? a.mul(b) : a.div(b);
      }
      case "pow": {
        const b = RatFun.fromExpr(e.base), ex = RatFun.fromExpr(e.exp);
        if (!b || !ex || !ex.isPolynomial()) return null;
        const k = ex.reduce(); if (k.n.degree > 0 || !k.n.c[0]?.isInteger()) return null;
        const m = k.n.c[0].num; if (Math.abs(m) > 12) return null;
        let r = new RatFun(Poly.one, Poly.one); for (let i = 0; i < Math.abs(m); i++) r = r.mul(b);
        return m >= 0 ? r : new RatFun(Poly.one, Poly.one).div(r);
      }
      default: return null;
    }
  }
}

// ---- rendering back to expressions ----
const lin = (r: Rational, content?: Rational): MathExpr => {
  // (x - r) written with primitive integer coefficients: (q*x - p) for r = p/q, q > 0
  const p = r.numBig, q = r.denBig;
  const xt: MathExpr = q === 1n ? Expr.var("x") : Expr.mul(Expr.num(new Rational(q)), Expr.var("x"));
  return p === 0n ? xt : p > 0n ? Expr.sub(xt, Expr.num(new Rational(p))) : Expr.add(xt, Expr.num(new Rational(-p)));
};
/** Expanded form, highest power first. */
export function polyToExpr(p: Poly): MathExpr {
  if (p.isZero()) return Expr.num(0);
  let acc: MathExpr | null = null;
  for (let i = p.c.length - 1; i >= 0; i--) {
    const v = p.c[i]; if (v.isZero()) continue;
    const xp: MathExpr | null = i === 0 ? null : i === 1 ? Expr.var("x") : Expr.pow(Expr.var("x"), Expr.num(i));
    const mag = v.lt(Z) ? v.neg() : v;
    const term: MathExpr = xp === null ? Expr.num(mag) : mag.isOne() ? xp : Expr.mul(Expr.num(mag), xp);
    if (acc === null) acc = v.lt(Z) ? (xp === null ? Expr.num(v) : mag.isOne() ? Expr.neg(xp) : Expr.mul(Expr.num(v), xp)) : term;
    else acc = v.lt(Z) ? Expr.sub(acc, term) : Expr.add(acc, term);
  }
  return acc!;
}
/** Factored form content*(a*x-b)*... when the polynomial splits over Q; otherwise the expanded form. */
export function polyToFactoredExpr(p: Poly): MathExpr {
  if (p.degree < 1) return polyToExpr(p);
  const s = p.splitLinear(); if (!s) return polyToExpr(p);
  // collect multiplicities, keep brackets for every factor
  const factors: MathExpr[] = s.roots.map((r) => lin(r));
  // content: recompute so that content * prod(q_i x - p_i) == p
  let prod = Poly.one; for (const r of s.roots) prod = prod.mul(Poly.linear(new Rational(r.denBig), new Rational(-r.numBig)));
  const k = p.lead().div(prod.lead());
  let acc: MathExpr = factors[0];
  for (let i = 1; i < factors.length; i++) acc = Expr.mul(acc, factors[i]);
  return k.isOne() ? acc : Expr.mul(Expr.num(k), acc);
}
export function ratFunToExpr(f: RatFun, factoredNumerator = false): MathExpr {
  const num = factoredNumerator ? polyToFactoredExpr(f.n) : polyToExpr(f.n);
  if (f.d.degree === 0) { const k = f.d.c[0]; return k.isOne() ? num : Expr.div(num, Expr.num(k)); }
  return Expr.div(num, polyToFactoredExpr(f.d));
}
