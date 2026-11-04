/**
 * E5 independent calculus binder. Judges typed calculus claims with machinery that is separate from the destination reasoner (calculus-core):
 *  - exact identities through the U4 kernel (`certify`) against an independently differentiated source;
 *  - exact rational-function limit analysis and exact polynomial definite integrals over BigInt rationals;
 * A kernel rejection is reported as INVALID only when a bounded floating-point comparison also exhibits a clear disagreement;
 * otherwise the claim is UNSUPPORTED. Floating point is never used to accept.
 */
import { certify } from "./independent-checker.ts";
import type { Expr } from "./calculus-core.ts";
import { digestOf, type Judge } from "./geometry-binder-e5.ts";
import { Overflow, Z, ONE, floatCompare, limitRF, pconst, pdeg, peval, q, qadd, qdiv, qeq, qiszero, qmul, qsub, qtext, rfEqual, rfOf, type LimitResult, type Poly, type Q, type RF, evalRat } from "./exact-e5.ts";

const K = (v: string): Expr => ({ kind: "constant", value: v });
const mulE = (...f: Expr[]): Expr => ({ kind: "multiply", factors: f });
const addE = (...t: Expr[]): Expr => ({ kind: "add", terms: t });

/** Independent symbolic derivative used only as the `before` side of a U4 identity. null outside its scope. */
export function d5(e: Expr, v: string, depth = 0): Expr | null {
  if (depth > 40) return null;
  const r = (x: Expr) => d5(x, v, depth + 1);
  switch (e.kind) {
    case "constant": case "pi": return K("0");
    case "variable": return K(e.name === v ? "1" : "0");
    case "add": { const t = e.terms.map(r); return t.every(Boolean) ? addE(...(t as Expr[])) : null; }
    case "multiply": {
      const parts: Expr[] = [];
      for (let i = 0; i < e.factors.length; i++) { const d = r(e.factors[i]); if (!d) return null; parts.push(mulE(...e.factors.map((f, j) => (j === i ? d : f)))); }
      return addE(...parts);
    }
    case "power": {
      if (!Number.isInteger(e.exponent)) return null; const d = r(e.base); if (!d) return null; if (e.exponent === 0) return K("0");
      const fs: Expr[] = [K(String(e.exponent))]; if (e.exponent - 1 !== 0) fs.push({ kind: "power", base: e.base, exponent: e.exponent - 1 }); fs.push(d); return mulE(...fs);
    }
    case "sin": { const d = r(e.argument); return d ? mulE({ kind: "cos", argument: e.argument }, d) : null; }
    case "cos": { const d = r(e.argument); return d ? mulE(K("-1"), { kind: "sin", argument: e.argument }, d) : null; }
    case "tan": { const d = r(e.argument); return d ? mulE({ kind: "power", base: { kind: "cos", argument: e.argument }, exponent: -2 }, d) : null; }
    case "exp": { const d = r(e.argument); return d ? mulE({ kind: "exp", argument: e.argument }, d) : null; }
    case "log": { const d = r(e.argument); return d ? mulE({ kind: "power", base: e.argument, exponent: -1 }, d) : null; }
    case "root": { if (e.index !== 2) return null; const d = r(e.radicand); return d ? mulE(K("1/2"), { kind: "power", base: e, exponent: -1 }, d) : null; }
    default: return null;
  }
}
export function dk(e: Expr, v: string, k: number): Expr | null { let x: Expr | null = e; for (let i = 0; i < k && x; i++) x = d5(x, v); return x; }

const SCOPE_ID = "exact U4 kernel identity against an independently differentiated/derived source";
/** truth ≡ claim as functions of v. */
export function judgeIdentity(truth: Expr | null, claim: Expr, v: string, what: string): Judge {
  if (!truth) return { status: "unsupported", reason: `${what}: the source expression is outside the exact differentiation rules`, scope: SCOPE_ID };
  let r: ReturnType<typeof certify>;
  try { r = certify(truth, claim); } catch (e) { return { status: "unsupported", reason: `${what}: the exact kernel could not process this expression`, scope: SCOPE_ID }; }
  const dig = r.digest ?? digestOf([truth, claim]);
  if (r.outcome === "verified") return { status: "valid", reason: `${what}: verified by the exact kernel${r.restrictions.length ? ` (restrictions ${r.restrictions.join(", ")})` : ""}`, scope: SCOPE_ID, digest: dig };
  const f = floatCompare(truth, claim, v);
  if (f === "differ") return { status: "invalid", reason: `${what}: the expression differs from the exact value (kernel ${r.outcome}; sampled disagreement confirms it)`, scope: SCOPE_ID, digest: dig };
  return { status: "unsupported", reason: `${what}: the exact kernel could not certify equality and no disagreement was exhibited`, scope: SCOPE_ID, digest: dig };
}

// ------------------------------------------------------------------------------------------------ polynomials
export function polyOf(e: Expr, v: string): Poly | null {
  const f = rfOf(e, v); if (!f || pdeg(f.den) !== 0) return null;
  const c = f.den[0]; return f.num.map((x) => qdiv(x, c));
}
export function polyToExpr(p: Poly, v: string): Expr {
  const terms: Expr[] = p.map((c, i) => ({ c, i })).filter((x) => !qiszero(x.c)).map(({ c, i }) => {
    const k: Expr = { kind: "constant", value: qtext(c) };
    return i === 0 ? k : { kind: "multiply", factors: [k, i === 1 ? { kind: "variable", name: v } : { kind: "power", base: { kind: "variable", name: v }, exponent: i }] } as Expr;
  });
  return terms.length === 0 ? { kind: "constant", value: "0" } : terms.length === 1 ? terms[0] : { kind: "add", terms };
}
export function polyAntiderivative(p: Poly): Poly { return [Z, ...p.map((c, i) => qdiv(c, q(i + 1)))]; }
export function polyDefinite(e: Expr, v: string, lo: Q, hi: Q): Q | null {
  const p = polyOf(e, v); if (!p) return null; try { const F = polyAntiderivative(p); return qsub(peval(F, hi), peval(F, lo)); } catch (err) { if (err instanceof Overflow) return null; throw err; }
}

// ------------------------------------------------------------------------------------------------ limits
export type LimitTarget = { at: Q | "inf" | "-inf"; side: "both" | "left" | "right" };
/** Exact limit of an expression of v. Rational functions exactly; sin(a·v)·R(v) at 0 by the standard limit. */
export function limitTruth(e: Expr, v: string, t: LimitTarget): LimitResult | null {
  const f = rfOf(e, v); if (f) return limitRF(f, t.at, t.side);
  if (t.at === "inf" || t.at === "-inf" || !qiszero(t.at as Q)) return null;
  if (e.kind !== "multiply") return null;
  const sins = e.factors.filter((x) => x.kind === "sin"); const rest = e.factors.filter((x) => x.kind !== "sin");
  if (sins.length !== 1 || sins[0].kind !== "sin") return null;
  const arg = rfOf(sins[0].argument, v); if (!arg || pdeg(arg.den) !== 0) return null;
  const ap = arg.num.map((x) => qdiv(x, arg.den[0])); if (ap.length !== 2 || !qiszero(ap[0]) || qiszero(ap[1])) return null;
  const R = rfOf({ kind: "multiply", factors: rest.length ? rest : [K("1")] }, v); if (!R) return null;
  // sin(a v) R(v) = [a v R(v)] * [sin(a v)/(a v)] and the bracket tends to 1
  const comb: RF = { num: polyMul([Z, ap[1]], R.num), den: R.den };
  return limitRF(comb, Z, t.side);
}
const polyMul = (a: Poly, b: Poly): Poly => { const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => Z); a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qadd(out[i + j], qmul(x, y)); })); return out; };
export const sameRational = (a: Expr, b: Expr, v: string): boolean | null => { const x = rfOf(a, v), y = rfOf(b, v); return x && y ? rfEqual(x, y) : null; };
export { evalRat, qeq, qtext, ONE, pconst };
