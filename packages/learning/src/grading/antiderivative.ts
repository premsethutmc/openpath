/**
 * antiderivative@1: an antiderivative of a school integrand, found by the standard rules (powers and polynomials, sums and
 * constant multiples, functions of a linear argument — sin, cos, sec², eᵘ, 1/u, uⁿ, √u —, 1/(x² + a²), and integration
 * by parts for a polynomial times sin, cos or eᵘ). Whatever is found is only a CANDIDATE: it is accepted when the exact
 * kernel proves F′ = f. For a definite integral the integrand must also be finite across the interval (no hidden
 * singularity) and the exact value must agree with Simpson's rule — never the other way round.
 */
import { N, add, div, fn, mul, neg, pw, type A } from "../e6-parse.ts";
import { compareExpr, d6, evalNum, hasVar } from "../e6-cas.ts";
import { polyCoeffs } from "../e6-calc.ts";
import { q, qadd, qdiv, qiszero, qmul, qneg, qsub, type Q } from "../exact-e5.ts";
import { constantValue } from "../e6-series.ts";

const NQ = (c: Q): A => ({ t: "n", v: c });
const sq = (a: A) => pw(a, N(2));
/** u = p·x + q with p ≠ 0: returns p */
function linearSlope(u: A, v: string): A | null {
  const c = polyCoeffs(u, v);
  return c && c.length === 2 && !qiszero(c[1]) ? NQ(c[1]) : null;
}

// ---------------------------------------------------------------------------------------------- rational functions
const X = (v: string): A => ({ t: "s", name: v });
const polyA = (c: Q[], v: string): A => add(...c.map((k, i) => mul(NQ(k), pw(X(v), N(i)))));
const trimQ = (c: Q[]) => { const o = c.slice(); while (o.length > 1 && qiszero(o[o.length - 1])) o.pop(); return o; };
function divQ(a: Q[], b: Q[]): { quo: Q[]; rem: Q[] } {
  let r = trimQ(a); const d = trimQ(b); const out: Q[] = new Array(Math.max(1, r.length - d.length + 1)).fill(q(0n));
  while (r.length >= d.length && !(r.length === 1 && qiszero(r[0]))) {
    const k = r.length - d.length, c = qdiv(r[r.length - 1], d[d.length - 1]); out[k] = c;
    r = trimQ(r.map((x, i) => (i >= k && i - k < d.length ? qsub(x, qmul(c, d[i - k])) : x)));
    if (r.length < d.length) break;
  }
  return { quo: trimQ(out), rem: r };
}
const evalQ = (c: Q[], x: Q) => c.reduceRight((acc, k) => qadd(qmul(acc, x), k), q(0n));
/** the rational roots of c with multiplicity, when they account for its whole degree; else null */
function rationalRoots(c0: Q[]): { r: Q; m: number }[] | null {
  let c = trimQ(c0); if (c.length < 2 || c.length > 5) return null;
  // integer coefficients
  let l = 1n; for (const k of c) l = (l * k.d) / gcd(l, k.d);
  const ints = c.map((k) => (k.n * l) / k.d);
  const divisors = (n: bigint) => { n = n < 0n ? -n : n; const out: bigint[] = []; for (let i = 1n; i <= n && i <= 400n; i++) if (n % i === 0n) out.push(i); return out; };
  const lead = ints[ints.length - 1];
  let k0 = 0; while (k0 < ints.length && ints[k0] === 0n) k0++;
  const cands: Q[] = [q(0n)];
  for (const p of divisors(ints[k0] ?? 1n)) for (const d of divisors(lead)) { cands.push(q(p, d)); cands.push(q(-p, d)); }
  const roots: { r: Q; m: number }[] = [];
  for (const r of cands) {
    if (roots.some((x) => x.r.n === r.n && x.r.d === r.d)) continue;
    let m = 0; while (c.length > 1 && qiszero(evalQ(c, r))) { c = divQ(c, [qneg(r), q(1n)]).quo; m++; }
    if (m) roots.push({ r, m });
  }
  return c.length === 1 ? roots : null;
}
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
/** ∫ P/Q by polynomial division and partial fractions over linear factors (repeated ones too) */
function rationalAnti(f: A, v: string): A | null {
  if (f.t !== "div") return null;
  const P = polyCoeffs(f.a, v), Qc = polyCoeffs(f.b, v);
  if (!P || !Qc || trimQ(Qc).length < 2) return null;
  const roots = rationalRoots(Qc); if (!roots) return null;
  const { quo, rem } = divQ(P, Qc);
  const lead = trimQ(Qc)[trimQ(Qc).length - 1];
  const terms: A[] = [];
  if (!(quo.length === 1 && qiszero(quo[0]))) terms.push(add(...quo.map((k, i) => mul(NQ(qdiv(k, q(BigInt(i + 1)))), pw(X(v), N(i + 1))))));
  for (const { r, m } of roots) {
    // G(x) = rem / (lead · Π_{other roots} (x − s)^k); A_{m−j} = G^{(j)}(r)/j!
    let G: A = div(polyA(rem, v), NQ(lead));
    for (const o of roots) if (o !== r as unknown) if (o.r !== r) G = div(G, pw(add(X(v), NQ(qneg(o.r))), N(o.m)));
    let g = G, fact = 1n;
    for (let j = 0; j < m; j++) {
      if (j) { g = d6(g, v); fact *= BigInt(j); }
      const c = constantValue(substX(g, v, NQ(r))); if (!c) return null;
      const A0 = qdiv(c, q(fact)), k = m - j, L = add(X(v), NQ(qneg(r)));
      if (qiszero(A0)) continue;
      terms.push(k === 1 ? mul(NQ(A0), fn("ln", fn("abs", L))) : mul(NQ(qdiv(A0, q(BigInt(1 - k)))), pw(L, N(1 - k))));
    }
  }
  return terms.length ? add(...terms) : N(0);
}
const substX = (a: A, v: string, val: A): A => JSON.parse(JSON.stringify(a, (_k, x) => (typeof x === "bigint" ? `${x}n` : x)), (_k, x) => (typeof x === "string" && /^-?\d+n$/.test(x) ? BigInt(x.slice(0, -1)) : x && typeof x === "object" && x.t === "s" && x.name === v ? val : x));

// ---------------------------------------------------------------------------------------------- the textbook's standard forms
/** k/√(x² + bx + c) = k·ln|x + b/2 + √(…)|; k/√(c + bx − x²) = k·sin⁻¹((x − b/2)/√D); √(x² + c), √(c − x²) */
function standardForm(f: A, v: string): A | null {
  const rootOf = (g: A): A | null => (g.t === "fn" && g.f === "sqrt" ? g.a : g.t === "pow" && constantValue(g.b)?.n === 1n && constantValue(g.b)?.d === 2n ? g.a : null);
  const inv = f.t === "div" && !hasVar(f.a, v) ? { k: f.a, R: rootOf(f.b) } : f.t === "pow" && constantValue(f.b)?.n === -1n && constantValue(f.b)?.d === 2n ? { k: N(1), R: f.a } : null;
  if (inv?.R) {
    const c = polyCoeffs(inv.R, v); if (!c || c.length !== 3) return null;
    const [c0, b, a] = c;
    if (a.n === a.d) return mul(inv.k, fn("ln", fn("abs", add(X(v), NQ(qdiv(b, q(2n))), fn("sqrt", inv.R)))));
    if (a.n === -a.d) { const h = qdiv(b, q(2n)), D = qadd(c0, qmul(h, h)); return mul(inv.k, fn("asin", div(add(X(v), NQ(qneg(h))), fn("sqrt", NQ(D))))); }
    return null;
  }
  const R = rootOf(f);
  if (R) {
    const c = polyCoeffs(R, v); if (!c || c.length !== 3 || !qiszero(c[1])) return null;
    const [c0, , a] = c, half = div(N(1), N(2));
    if (a.n === a.d) return add(mul(half, X(v), f), mul(half, NQ(c0), fn("ln", fn("abs", add(X(v), f)))));
    if (a.n === -a.d) return add(mul(half, X(v), f), mul(half, NQ(c0), fn("asin", div(X(v), fn("sqrt", NQ(c0))))));
  }
  return null;
}

function cand(f: A, v: string, depth = 0): A | null {
  if (depth > 12) return null;
  const r = (g: A) => cand(g, v, depth + 1);
  const special = rationalAnti(f, v) ?? standardForm(f, v);
  if (special) return special;
  if (!hasVar(f, v)) return mul(f, { t: "s", name: v });
  const poly = polyCoeffs(f, v);
  if (poly) return add(...poly.map((c, k) => mul(NQ(qdiv(c, q(BigInt(k + 1)))), pw({ t: "s", name: v }, N(k + 1)))));
  switch (f.t) {
    case "add": { const parts = f.xs.map(r); return parts.every(Boolean) ? add(...(parts as A[])) : null; }
    case "neg": { const g = r(f.a); return g && neg(g); }
    case "mul": {
      const k = f.xs.filter((x) => !hasVar(x, v)), g = f.xs.filter((x) => hasVar(x, v));
      if (k.length) { const G = r(g.length === 1 ? g[0] : mul(...g)); return G && mul(...k, G); }
      const e = g.findIndex((x) => x.t === "fn" && x.f === "exp" && x.a.t === "s" && x.a.name === v);
      if (e >= 0 && g.length === 2) { // eˣ(h + h′) = (eˣ h)′: try each part of the other factor as h
        const other = g[1 - e], parts = other.t === "add" ? other.xs : [other];
        for (const h of parts) { try { if (compareExpr(add(h, d6(h, v)), other, v).status === "equal") return mul(g[e], h); } catch { /* next */ } }
      }
      const polys = g.filter((x) => polyCoeffs(x, v)), others = g.filter((x) => !polyCoeffs(x, v));
      if (others.length === 1 && polys.length) { // by parts: polynomial × (something with a known antiderivative)
        for (const [P, h] of [[polys.length === 1 ? polys[0] : mul(...polys), others[0]]]) {
          const H = r(h); if (!H) continue;
          const Pc = polyCoeffs(P, v)!, dPc = Pc.slice(1).map((k, i) => qmul(k, q(BigInt(i + 1)))); // P′ as a plain polynomial
          const rest = !dPc.length || dPc.every(qiszero) ? N(0) : r(mul(polyA(dPc, v), H));
          if (rest) return add(mul(P, H), neg(rest));
        }
      }
      return null;
    }
    case "div": {
      if (!hasVar(f.b, v)) { const G = r(f.a); return G && div(G, f.b); }
      if (hasVar(f.a, v)) return null;
      const p = linearSlope(f.b, v);
      if (p) return mul(f.a, div(fn("ln", fn("abs", f.b)), p)); // k/(px + q)
      if (f.b.t === "pow") { const p2 = linearSlope(f.b.a, v), n = polyCoeffs(f.b.b, v); if (p2 && n && n.length === 1) return r(mul(f.a, pw(f.b.a, neg(f.b.b)))); }
      const c = polyCoeffs(f.b, v); // k/(x² + a²) (a² > 0): (k/a)·tan⁻¹(x/a) — a is checked by the kernel afterwards
      if (c && c.length === 3 && c[2].n === c[2].d) { // k/((x + h)² + D), D > 0: (k/√D)·tan⁻¹((x + h)/√D)
        const h = qdiv(c[1], q(2n)), D = qsub(c[0], qmul(h, h));
        if (D.n > 0n) { const a = fn("sqrt", NQ(D)); return mul(div(f.a, a), fn("atan", div(add(X(v), NQ(h)), a))); }
      }
      if (f.b.t === "fn" && f.b.f === "sqrt") { const p3 = linearSlope(f.b.a, v); if (p3) return mul(f.a, div(mul(N(2), f.b), p3)); }
      return null;
    }
    case "pow": {
      const n = polyCoeffs(f.b, v); const p = linearSlope(f.a, v);
      if (n && n.length === 1 && p) { // (px + q)ⁿ
        const e = n[0];
        if (Number(e.n) === -Number(e.d)) return div(fn("ln", fn("abs", f.a)), p);
        return div(pw(f.a, add(f.b, N(1))), mul(add(f.b, N(1)), p));
      }
      if (f.a.t === "fn" && (f.a.f === "sin" || f.a.f === "cos") && n && n.length === 1 && n[0].n === 2n && n[0].d === 1n) { // half-angle
        const q2 = linearSlope(f.a.a, v); if (!q2) return null;
        const s2 = div(fn("sin", mul(N(2), f.a.a)), mul(N(4), q2));
        return f.a.f === "sin" ? add(div(X(v), N(2)), neg(s2)) : add(div(X(v), N(2)), s2);
      }
      if (f.a.t === "fn" && f.a.f === "sec" && n && n.length === 1 && Number(n[0].n) === 2 && Number(n[0].d) === 1) { const q = linearSlope(f.a.a, v); if (q) return div(fn("tan", f.a.a), q); }
      return null;
    }
    case "fn": {
      const p = linearSlope(f.a, v); if (!p) return null;
      switch (f.f) {
        case "sin": return neg(div(fn("cos", f.a), p));
        case "cos": return div(fn("sin", f.a), p);
        case "exp": return div(fn("exp", f.a), p);
        case "sqrt": return div(mul(N(2), pw(f.a, div(N(3), N(2)))), mul(N(3), p));
        default: return null;
      }
    }
    default: return null;
  }
}

/** an antiderivative of f in v, proved (F′ = f exactly), or null */
export function antiderivative(f: A, v: string): A | null {
  let F: A | null = null;
  try { F = cand(f, v); } catch { return null; }
  if (!F) return null;
  try { return compareExpr(d6(F, v), f, v).status === "equal" ? F : null; } catch { return null; }
}

/** ∫ₐᵇ f exactly as F(b) − F(a), or null; a, b finite and the integrand finite across [a, b] */
/** Wallis: ∫₀^{π/2} sinⁿx dx = ∫₀^{π/2} cosⁿx dx = (n−1)/n · (n−3)/(n−2) ⋯ (· π/2 when n is even) */
function wallis(f: A, v: string, a: A, b: A): A | null {
  if (f.t !== "pow" || f.a.t !== "fn" || (f.a.f !== "sin" && f.a.f !== "cos") || !(f.a.a.t === "s" && f.a.a.name === v)) return null;
  const n = polyCoeffs(f.b, v); if (!n || n.length !== 1 || n[0].d !== 1n || n[0].n < 2n || n[0].n > 40n) return null;
  try { if (Math.abs(evalNum(a, {})) > 1e-12 || Math.abs(evalNum(b, {}) - Math.PI / 2) > 1e-12) return null; } catch { return null; }
  let k = Number(n[0].n), out: A = k % 2 ? N(1) : div({ t: "pi" } as A, N(2));
  for (; k >= 2; k -= 2) out = mul(div(N(k - 1), N(k)), out);
  return out;
}
export function definiteValue(f: A, v: string, a: A, b: A, at: (F: A, x: A) => A): A | null {
  const w = wallis(f, v, a, b); if (w) return w;
  const F = antiderivative(f, v); if (!F) return null;
  let lo: number, hi: number;
  try { lo = evalNum(a, {}); hi = evalNum(b, {}); } catch { return null; }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const n = 400, h = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    let y: number; try { y = evalNum(f, { [v]: lo + i * h }); } catch { return null; }
    if (!Number.isFinite(y) || Math.abs(y) > 1e9) return null; // a singularity inside: the formula does not apply
    s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * y;
  }
  const value = add(at(F, b), neg(at(F, a)));
  try { const exact = evalNum(value, {}); if (Math.abs(exact - (s * h) / 3) > 1e-3 * Math.max(1, Math.abs(exact))) return null; } catch { return null; } // a sanity check only
  return value;
}
