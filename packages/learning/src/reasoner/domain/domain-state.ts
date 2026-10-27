// K05.2 stage D1: the domain-aware mathematical state, its invariants, and exact solution-set reasoning.
// Everything here is exact (Poly / RatFun over the kernel's Rational). Nothing samples, nothing approximates.
import { Rational, Expr, type MathExpr, type MathState, type MathConstraint } from "../../math-kernel.ts";
import { Poly, RatFun, OutsideBoundary } from "./poly.ts";
import { parseExpr, printExpr } from "../expr-text.ts";

const X = (): MathExpr => Expr.var("x");
export type Effect = "equivalence" | "implication";
export interface Restriction { expr: MathExpr; value: Rational; origin: string; step: number }   // expr is the primitive linear form that must be non-zero
export interface Candidate { value: Rational; fromStep: number; status: "pending" | "accepted" | "rejected"; proof?: { excludedByDomain: boolean; residual: string } }
export interface Evidence {
  step: number; rule: string; effect: Effect;
  preconditions: { name: string; held: boolean; detail: string }[];
  obligations: { id: string; kind: string; discharged: boolean; how: string }[];
}
/** The domain-aware state. `math` is the kernel's MathState: statements[0] is the current equation, constraints are the restrictions
 *  (kind "nonzero"), and expressions holds the frozen original equation. Restrictions only ever grow (I1). */
export interface DomainState {
  math: MathState;
  originalText: string;
  originalRestrictions: Rational[];   // derived from the input text alone, never modified (I3)
  restrictions: Restriction[];
  candidates: Candidate[];
  evidence: Evidence[];
}

// ---------- reading denominators ----------
export function denominatorsOf(e: MathExpr, out: MathExpr[] = []): MathExpr[] {
  switch (e.kind) {
    case "div": if (hasX(e.right)) out.push(e.right); denominatorsOf(e.left, out); denominatorsOf(e.right, out); break;
    case "add": case "sub": case "mul": denominatorsOf(e.left, out); denominatorsOf(e.right, out); break;
    case "neg": denominatorsOf(e.operand, out); break;
    case "pow": denominatorsOf(e.base, out); if (e.exp.kind === "num" && e.exp.value.lt(Rational.zero)) out.push(e.base); break;
    default: break;
  }
  return out;
}
export const hasX = (e: MathExpr): boolean => {
  switch (e.kind) {
    case "var": return true; case "num": return false;
    case "neg": return hasX(e.operand); case "quantity": return hasX(e.value);
    case "pow": return hasX(e.base) || hasX(e.exp); case "frac": return hasX(e.num) || hasX(e.den);
    default: return hasX(e.left) || hasX(e.right);
  }
};
const uniqSorted = (xs: Rational[]) => { const m = new Map<string, Rational>(); for (const v of xs) m.set(v.toString(), v); return [...m.values()].sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0)); };
/** Real zeros (all rational by the stated boundary) of every x-containing denominator in the expression. Throws OutsideBoundary otherwise. */
export function zerosOfDenominators(e: MathExpr): Rational[] {
  const out: Rational[] = [];
  for (const d of denominatorsOf(e)) {
    const p = Poly.fromExpr(d);
    if (!p) throw new OutsideBoundary("denominator is not a polynomial");
    if (p.degree < 1) continue;
    const s = p.splitLinear();
    if (!s) throw new OutsideBoundary("denominator does not split into linear factors over Q");
    out.push(...s.roots);
  }
  return uniqSorted(out);
}
/** x - r written with primitive integer coefficients as a MathExpr, e.g. 2*x-1 for r = 1/2. */
export function linearFactorExpr(r: Rational): MathExpr {
  const p = r.numBig, q = r.denBig;
  const xt: MathExpr = q === 1n ? X() : Expr.mul(Expr.num(new Rational(q)), X());
  return p === 0n ? xt : p > 0n ? Expr.sub(xt, Expr.num(new Rational(p))) : Expr.add(xt, Expr.num(new Rational(-p)));
}
export const constraintOf = (r: Rational): MathConstraint => ({ kind: "nonzero", expr: linearFactorExpr(r) });

// ---------- exact solution sets ----------
/** The solution set of L = R over the real line minus `excluded`, in exact form:
 *  - all: every real number except the excluded values (an identity on the domain);
 *  - set: the real roots, represented by the monic squarefree polynomial whose roots they are (constant 1 = no solution). */
export type SolSet = { kind: "all"; excluded: Rational[] } | { kind: "set"; poly: Poly };
export function solSet(left: MathExpr, right: MathExpr, excluded: Rational[]): SolSet {
  const l = RatFun.fromExpr(left), r = RatFun.fromExpr(right);
  if (!l || !r) throw new OutsideBoundary("not a rational function of x");
  const f = l.sub(r).reduce();
  const ex = uniqSorted(excluded);
  if (f.n.isZero()) return { kind: "all", excluded: ex };
  let n = f.n;
  for (const v of ex) { const lin = Poly.linear(Rational.one, v.neg()); for (;;) { const q = n.divExact(lin); if (!q) break; n = q; } }
  return { kind: "set", poly: n.degree < 1 ? Poly.one : n.squarefree() };
}
export const solEquals = (a: SolSet, b: SolSet): boolean =>
  a.kind === "all" ? b.kind === "all" && a.excluded.length === b.excluded.length && a.excluded.every((v, i) => v.eq(b.excluded[i])) : b.kind === "set" && a.poly.equals(b.poly);
/** a is contained in b (as sets of real numbers). */
export function solSubset(a: SolSet, b: SolSet): boolean {
  if (a.kind === "set" && a.poly.degree < 1) return true;                                   // empty set
  if (a.kind === "set" && b.kind === "set") return b.poly.divExact(a.poly) !== null;       // squarefree: roots(a) inside roots(b) iff a divides b
  if (a.kind === "set" && b.kind === "all") return b.excluded.every((v) => !a.poly.eval(v).isZero());
  if (a.kind === "all" && b.kind === "all") return b.excluded.every((v) => a.excluded.some((u) => u.eq(v)));
  return false;                                                                             // all-but-finitely-many is never inside a finite set
}

// ---------- invariants ----------
export type Violation = "restriction-closure-violated" | "restriction-dropped" | "original-restriction-lost" | "solution-set-changed" | "solution-set-lost";
export interface StateText { eq: string; excluded: string[] }
export function parseEq(text: string): { left: MathExpr; right: MathExpr } {
  const i = text.indexOf("="); if (i < 0 || text.indexOf("=", i + 1) >= 0) throw new Error(`not an equation: ${text}`);
  return { left: parseExpr(text.slice(0, i)), right: parseExpr(text.slice(i + 1)) };
}
export function valuesOf(strs: string[]): Rational[] { return uniqSorted(strs.map((s) => { const [a, b] = s.split("/"); return new Rational(BigInt(a), BigInt(b ?? "1")); })); }
const subsetVals = (a: Rational[], b: Rational[]) => a.every((v) => b.some((u) => u.eq(v)));
/** Check one step between two explicit states (equation + restriction values). Returns the violated invariants; empty = valid. */
export function checkTransition(from: { left: MathExpr; right: MathExpr; excluded: Rational[] }, to: { left: MathExpr; right: MathExpr; excluded: Rational[] },
                                effect: Effect = "equivalence", original?: Rational[]): Violation[] {
  const why: Violation[] = [];
  const closureTo = uniqSorted([...zerosOfDenominators(to.left), ...zerosOfDenominators(to.right)]);
  if (!subsetVals(closureTo, to.excluded)) why.push("restriction-closure-violated");            // I2
  if (!subsetVals(from.excluded, to.excluded)) why.push("restriction-dropped");                // I1
  if (original && !subsetVals(original, to.excluded)) why.push("original-restriction-lost");   // I3
  const a = solSet(from.left, from.right, from.excluded), b = solSet(to.left, to.right, to.excluded);
  if (effect === "equivalence") { if (!solEquals(a, b)) why.push("solution-set-changed"); }
  else if (!solSubset(a, b)) why.push("solution-set-lost");
  return why;
}
/** I4 for a final claim: is `claimed` exactly the solution set of the equation over its natural domain? */
export function checkClaim(eq: string, claimed: string[] | "all-except-excluded" | "all-real"): { valid: boolean; truth: string[] | "all-except-excluded" | "undecidable" } {
  const { left, right } = parseEq(eq);
  const ex = uniqSorted([...zerosOfDenominators(left), ...zerosOfDenominators(right)]);
  const s = solSet(left, right, ex);
  if (s.kind === "all") return { valid: claimed === "all-except-excluded", truth: "all-except-excluded" };
  if (claimed === "all-except-excluded" || claimed === "all-real") return { valid: false, truth: rootsOf(s.poly) ?? "undecidable" };
  const roots = rootsOf(s.poly);
  if (!roots) return { valid: false, truth: "undecidable" };
  const c = uniqSorted(valuesOf(claimed));
  return { valid: c.length === roots.length && c.every((v, i) => v.toString() === roots[i]), truth: roots };
}
function rootsOf(p: Poly): string[] | null { const r = p.degree < 1 ? [] : p.rationalRoots(); return r.length === p.degree || p.degree < 1 ? r.map(String) : null; }

// ---------- building the initial state ----------
export function initialState(text: string): DomainState {
  const { left, right } = parseEq(text);
  const zeros = uniqSorted([...zerosOfDenominators(left), ...zerosOfDenominators(right)]);
  const math: MathState = {
    expressions: new Map([["original.left", left], ["original.right", right]]),
    statements: [{ left, relation: "=", right }],
    constraints: zeros.map(constraintOf),
    bindings: new Map(),
  };
  return { math, originalText: text, originalRestrictions: zeros, restrictions: zeros.map((v) => ({ expr: linearFactorExpr(v), value: v, origin: "input", step: 0 })), candidates: [], evidence: [] };
}
export const excludedOf = (s: MathState): Rational[] =>
  uniqSorted(s.constraints.filter((c) => c.kind === "nonzero").map((c) => { const p = Poly.fromExpr(c.expr)!; return p.rationalRoots()[0]; }));
export const eqText = (s: MathState) => `${printExpr(s.statements[0].left)}=${printExpr(s.statements[0].right)}`;
