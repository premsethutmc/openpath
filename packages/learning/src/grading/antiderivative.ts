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
import { q, qdiv, qiszero, type Q } from "../exact-e5.ts";

const NQ = (c: Q): A => ({ t: "n", v: c });
const sq = (a: A) => pw(a, N(2));
/** u = p·x + q with p ≠ 0: returns p */
function linearSlope(u: A, v: string): A | null {
  const c = polyCoeffs(u, v);
  return c && c.length === 2 && !qiszero(c[1]) ? NQ(c[1]) : null;
}

function cand(f: A, v: string, depth = 0): A | null {
  if (depth > 12) return null;
  const r = (g: A) => cand(g, v, depth + 1);
  if (!hasVar(f, v)) return mul(f, { t: "s", name: v });
  const poly = polyCoeffs(f, v);
  if (poly) return add(...poly.map((c, k) => mul(NQ(qdiv(c, q(BigInt(k + 1)))), pw({ t: "s", name: v }, N(k + 1)))));
  switch (f.t) {
    case "add": { const parts = f.xs.map(r); return parts.every(Boolean) ? add(...(parts as A[])) : null; }
    case "neg": { const g = r(f.a); return g && neg(g); }
    case "mul": {
      const k = f.xs.filter((x) => !hasVar(x, v)), g = f.xs.filter((x) => hasVar(x, v));
      if (k.length) { const G = r(g.length === 1 ? g[0] : mul(...g)); return G && mul(...k, G); }
      const polys = g.filter((x) => polyCoeffs(x, v)), others = g.filter((x) => !polyCoeffs(x, v));
      if (others.length === 1 && polys.length) { // by parts: polynomial × (something with a known antiderivative)
        for (const [P, h] of [[polys.length === 1 ? polys[0] : mul(...polys), others[0]]]) {
          const H = r(h); if (!H) continue;
          const dP = d6(P, v);
          const rest = polyCoeffs(dP, v)?.every(qiszero) ? N(0) : r(mul(dP, H));
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
      if (c && c.length === 3 && qiszero(c[1]) && Number(c[0].n) / Number(c[0].d) > 0 && Number(c[2].n) === Number(c[2].d)) { const a = fn("sqrt", NQ(c[0])); return mul(div(f.a, a), fn("atan", div({ t: "s", name: v }, a))); }
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
