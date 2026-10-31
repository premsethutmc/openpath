// Semantic domain conditions and assumption entailment for the symbolic route (E7 safety repair F4/F5).
// Sound in one direction only: `entails` / `nonzeroEntailed` return true only when the condition provably follows; false means
// "not shown", never "false". Opaque subterms (sin, log, root, …) are treated as independent polynomial generators, which is sound for
// divisibility: if Q divides a product of P_i as polynomials in the generators, every real zero of Q is a zero of some P_i.
import type { Expr } from "./calculus-core.ts";
import { normalizeCalculusExpression } from "./calculus-core.ts";
import { Poly, extra, noRealZero, radical } from "./core/multivariate/poly.ts";
import { Rational } from "./math-kernel.ts";

export type Assumption = { kind: "real" | "positive" | "nonnegative" | "nonzero" | "integer"; expression: Expr };
const key = (x: Expr) => JSON.stringify(normalizeCalculusExpression(x));
const MAX_EXP = 16, MAX_TERMS = 256;

function rat(v: string): Rational { const [a, b] = v.split("/"); return new Rational(BigInt(a), BigInt(b ?? "1")); }
/** Expr as a quotient of polynomials over Q in its variables and opaque generators, or null when out of bounds */
export function exprRational(x: Expr): { n: Poly; d: Poly } | null {
  const one = Poly.one();
  if (x.kind === "constant") return { n: Poly.const(rat(x.value)), d: one };
  if (x.kind === "variable") return { n: Poly.v(x.name), d: one };
  if (x.kind === "add") { let n = Poly.zero(), d = one; for (const t of x.terms) { const z = exprRational(t); if (!z) return null; n = n.mul(z.d).add(z.n.mul(d)); d = d.mul(z.d); if (n.t.size > MAX_TERMS || d.t.size > MAX_TERMS) return null; } return { n, d }; }
  if (x.kind === "multiply") { let n = one, d = one; for (const f of x.factors) { const z = exprRational(f); if (!z) return null; n = n.mul(z.n); d = d.mul(z.d); if (n.t.size > MAX_TERMS || d.t.size > MAX_TERMS) return null; } return { n, d }; }
  if (x.kind === "power") { if (!Number.isInteger(x.exponent) || Math.abs(x.exponent) > MAX_EXP) return null; const z = exprRational(x.base); if (!z) return null; const k = Math.abs(x.exponent); return x.exponent >= 0 ? { n: z.n.pow(k), d: z.d.pow(k) } : { n: z.d.pow(k), d: z.n.pow(k) }; }
  return { n: Poly.v(`@${key(x)}`), d: one };
}

/** exact rational value of a closed expression, or null */
function closedValue(x: Expr): Rational | null { try { const z = exprRational(x); if (!z || !z.n.isConst() || !z.d.isConst() || z.d.isZero()) return null; return z.n.constVal().div(z.d.constVal()); } catch { return null; } }

/** every real zero of the numerator of `x` is a zero of some expression in `by` (so `by ≠ 0` gives `x ≠ 0` wherever x is defined) */
export function nonzeroEntailed(x: Expr, by: Expr[]): boolean {
  try {
    const z = exprRational(x); if (!z) return false;
    if (z.n.isConst()) return !z.n.isZero();
    let prod = Poly.one(); for (const b of by) { const w = exprRational(b); if (w && !w.n.isZero()) prod = prod.mul(radical(w.n)); if (prod.t.size > MAX_TERMS) return false; }
    const rest = extra(z.n, prod);
    return rest.isConst() || noRealZero(rest);
  } catch { return false; }
}

/** does the condition `kind(x)` follow from the assumptions? (positivity, sign and nonzero facts composed through products, powers and sums) */
export function entails(kind: string, x: Expr, a: Assumption[], depth = 0): boolean {
  if (depth > 12) return false;
  const k = key(x), r = (kd: string, y: Expr) => entails(kd, y, a, depth + 1);
  if (a.some((z) => key(z.expression) === k && (z.kind === kind || (kind === "nonnegative" || kind === "nonzero") && z.kind === "positive"))) return true;
  if (kind !== "real" && kind !== "integer" && linearlyEntailed(kind, x, a)) return true;
  const v = closedValue(x);
  if (v) return kind === "positive" ? v.gt(Rational.zero) : kind === "nonnegative" ? !v.lt(Rational.zero) : kind === "nonzero" ? !v.isZero() : false;
  if (kind === "positive") {
    if (x.kind === "exp") return true;
    if (x.kind === "multiply") return x.factors.every((f) => r("positive", f));
    if (x.kind === "power") return r("positive", x.base) || x.exponent % 2 === 0 && r("nonzero", x.base);
    if (x.kind === "add") return x.terms.every((t) => r("nonnegative", t)) && x.terms.some((t) => r("positive", t));
    if (x.kind === "abs") return r("nonzero", x.argument);
    if (x.kind === "root") return x.index % 2 === 0 ? r("positive", x.radicand) : r("positive", x.radicand);
    return false;
  }
  if (kind === "nonnegative") {
    if (r("positive", x)) return true;
    if (x.kind === "abs") return true;
    if (x.kind === "power") return x.exponent % 2 === 0 && x.exponent > 0 || r("nonnegative", x.base) && x.exponent > 0;
    if (x.kind === "multiply") return x.factors.every((f) => r("nonnegative", f));
    if (x.kind === "add") return x.terms.every((t) => r("nonnegative", t));
    if (x.kind === "root") return x.index % 2 === 0 || r("nonnegative", x.radicand);
    return false;
  }
  if (kind === "nonzero") {
    if (r("positive", x)) return true;
    if (x.kind === "exp") return true;
    if (x.kind === "multiply") return x.factors.every((f) => r("nonzero", f));
    if (x.kind === "power") return r("nonzero", x.base);
    if (x.kind === "abs") return r("nonzero", x.argument);
    const by = a.filter((z) => z.kind === "nonzero" || z.kind === "positive").map((z) => z.expression);
    return by.length > 0 && nonzeroEntailed(x, by);
  }
  return false;
}

/** linear order facts: L > 0 (≥ 0, ≠ 0) follows from one linear assumption A > 0 or A ≥ 0 when L = c·A + d with c > 0 and d ≥ 0 (d > 0 when A is only ≥ 0) */
function linearlyEntailed(kind: string, x: Expr, a: Assumption[]): boolean {
  const lin = (e: Expr): Poly | null => { try { const z = exprRational(e); if (!z || !z.d.isConst() || z.d.isZero() || z.n.totalDeg() > 1 || z.n.vars().some((n) => n.startsWith("@"))) return null; return z.n.scale(Rational.one.div(z.d.constVal())); } catch { return null; } };
  const L = lin(x); if (!L || L.isConst()) return false;
  for (const z of a) {
    if (z.kind !== "positive" && z.kind !== "nonnegative") continue;
    const A = lin(z.expression); if (!A || A.isConst()) continue;
    const vs = A.vars(), lead = vs[0], ca = A.coeffs(lead)[1]?.constVal(), cl = L.coeffs(lead)[1]?.constVal();
    if (!ca || !cl || ca.isZero()) continue;
    const c = cl.div(ca); if (!c.gt(Rational.zero)) continue;
    const d = L.sub(A.scale(c)); if (!d.isConst()) continue;
    const dv = d.constVal(), strict = z.kind === "positive";
    if (kind === "nonnegative" ? !dv.lt(Rational.zero) : strict ? !dv.lt(Rational.zero) : dv.gt(Rational.zero)) return true;
  }
  return false;
}

/** a domain condition string ("kind:<canonical json>") as kind + expression, or null */
export function readCondition(c: string): { kind: string; expression: Expr } | null { const i = c.indexOf(":"); if (i < 0) return null; try { return { kind: c.slice(0, i), expression: JSON.parse(c.slice(i + 1)) as Expr }; } catch { return null; } }

/** is condition `c` implied by the condition set `from` together with the assumptions? */
export function conditionEntailed(c: string, from: string[], a: Assumption[]): boolean {
  if (from.includes(c)) return true;
  const cond = readCondition(c); if (!cond) return false;
  if (entails(cond.kind, cond.expression, a)) return true;
  if (cond.kind !== "nonzero") return false;
  const by: Expr[] = [...a.filter((z) => z.kind === "nonzero" || z.kind === "positive").map((z) => z.expression)];
  for (const f of from) { const g = readCondition(f); if (g && (g.kind === "nonzero" || g.kind === "positive")) by.push(g.expression); }
  return nonzeroEntailed(cond.expression, by);
}

/** domain changes between two condition sets, judged semantically: "new:<c>" for a condition the target adds, "carry:<c>" for one it drops */
export function domainChanges(original: string[], resulting: string[], carried: string[], a: Assumption[]): string[] {
  const out: string[] = [];
  for (const c of resulting) if (!carried.includes(c) && !conditionEntailed(c, [...original, ...carried], a)) out.push(`new:${c}`);
  for (const c of original) if (!carried.includes(c) && !conditionEntailed(c, [...resulting, ...carried], a)) out.push(`carry:${c}`);
  return out;
}
