// Compositional-challenge support: replay of operation traces, goal predicates (README section 3 of the frozen datasets), and the planner / baseline contenders.
// The planner and every baseline use the SAME fine-grained rule library and the SAME independent per-step verification; they differ only in how they choose moves.
import { Rational, type MathExpr } from "../math-kernel.ts";
import { Poly, RatFun } from "../reasoner/domain/poly.ts";
import { excludedOf, denominatorsOf, hasX } from "../reasoner/domain/domain-state.ts";
import { startState, type CoreState } from "./state.ts";
import { library } from "./rules.ts";
import "./fine.ts";
import { applyMove, RuleFailure, movesFor, stateKey, search, type Goal, type Strategy, type SearchStats } from "./planner.ts";
import type { Move } from "./rule.ts";
import { eqOf, eqText } from "./verify.ts";
import { flat, mono } from "./fine.ts";

export const OPS = ["restrict", "move-to-left", "combine-terms", "cancel-common-factor", "clear-denominators", "expand", "collect-terms", "add-sub-both-sides", "mul-div-const", "divide-restricted-factor", "accept-candidate"];
export interface RefStep { op: string; params: Record<string, unknown> }
const pkey = (p: Record<string, unknown>) => JSON.stringify(Object.keys(p).sort().map((k) => [k, typeof p[k] === "string" ? (p[k] as string).replace(/\s+/g, "") : p[k]]));
export const moveOf = (s: CoreState, op: string, params: Record<string, unknown>): Move | null => {
  const m = library.discover(s.math, new Set([op]), "fine").find((x) => pkey(x.params) === pkey(params)); return m ?? null;
};
export const fineStrategy = (allowed: string[], maxDepth = 8, maxNodes = 20000): Strategy => ({ id: "fine", allowed: new Set(allowed), level: "fine", prune: false, maxDepth, maxNodes });

// ---------- goals ----------
const nodeCount = (e: MathExpr): boolean => denominatorsOf(e).some((d) => hasX(d));
const hasXDen = (s: CoreState) => nodeCount(eqOf(s.math).left) || nodeCount(eqOf(s.math).right);
const isLit0 = (e: MathExpr) => e.kind === "num" && e.value.isZero();
const anyDiv = (e: MathExpr): boolean => { switch (e.kind) { case "div": return true; case "add": case "sub": case "mul": return anyDiv(e.left) || anyDiv(e.right); case "neg": return anyDiv(e.operand); case "pow": return anyDiv(e.base); default: return false; } };
/** A quotient with x in its denominator whose numerator or denominator itself contains a quotient (numeric fractions included) is a nested fraction. */
const nested = (e: MathExpr): boolean => { switch (e.kind) { case "div": return (hasX(e.right) && (anyDiv(e.left) || anyDiv(e.right))) || nested(e.left); case "neg": return nested(e.operand); case "mul": return nested(e.left) || nested(e.right); default: return false; } };
const hasXFrac = (e: MathExpr): boolean => { switch (e.kind) { case "div": return hasX(e.right) || hasXFrac(e.left); case "add": case "sub": case "mul": return hasXFrac(e.left) || hasXFrac(e.right); case "neg": return hasXFrac(e.operand); case "pow": return hasXFrac(e.base); default: return false; } };
const xTerms = (e: MathExpr) => flat(e).filter((t) => hasXFrac(t.t));
const reducedTerm = (t: MathExpr): boolean => { if (nested(t)) return false; const f = RatFun.fromExpr(t); if (!f) return false; return f.n.gcd(f.d).degree <= 0; };
const startFracCount = (text: string): number => { const [l, r] = text.split("="); const c = startState(text); return [...xTermsOf(eqOf(c.math))].filter((t) => { const f = RatFun.fromExpr(t.t); return !!f && f.reduce().d.degree > 0; }).length; };
const xTermsOf = (e: { left: MathExpr; right: MathExpr }) => [...flat(e.left), ...flat(e.right)].filter((t) => hasXFrac(t.t));
const isMonoSum = (e: MathExpr): boolean => {
  if (isLit0(e)) return true; const ts = flat(e); const ks = new Set<number>();
  for (const t of ts) { if (t.t.kind === "add" || t.t.kind === "sub") return false; const m = mono(t.t); if (!m || m.c.isZero() || ks.has(m.k)) return false; ks.add(m.k); } return true;
};
const noBrackets = (e: MathExpr): boolean => { switch (e.kind) { case "add": case "sub": return noBrackets(e.left) && (e.right.kind !== "add" && e.right.kind !== "sub") && noBrackets(e.right); case "neg": return noBrackets(e.operand); case "mul": case "div": return noSum(e.left) && noSum(e.right); default: return true; } };
const noSum = (e: MathExpr): boolean => { switch (e.kind) { case "add": case "sub": return false; case "neg": return noSum(e.operand); case "mul": case "div": return noSum(e.left) && noSum(e.right); case "pow": return noSum(e.base); default: return true; } };
const constOf = (e: MathExpr): Rational | null => (e.kind === "num" ? e.value : e.kind === "neg" ? constOf(e.operand)?.neg() ?? null : null);
const xfree = (e: MathExpr) => !hasX(e);
export function goalFor(name: string, startText: string): Goal {
  const n0 = startFracCount(startText);
  return {
    id: name,
    test(s) {
      const { left, right } = eqOf(s.math);
      switch (name) {
        case "SOLVE": {
          if (left.kind === "var" && xfree(right)) { const c = constOf(right); if (c && !excludedOf(s.math).some((u) => u.eq(c))) return { kind: "state" }; return null; }
          if (xfree(left) && xfree(right)) { const a = constOf(left), b = constOf(right); if (a && b) return a.eq(b) ? { kind: "identity" } : { kind: "none" }; }
          return null;
        }
        case "CLEARED": return hasXDen(s) ? null : { kind: "state" };
        case "REDUCED": { const ts = xTermsOf({ left, right }); if (!ts.length) return null; return ts.every((t) => reducedTerm(t.t)) && ts.length === n0 ? { kind: "state" } : null; }
        case "ONE_FRACTION_ZERO": { if (!isLit0(right)) return null; if (!hasXFrac(left)) return { kind: "state" }; const ts = flat(left); return ts.length === 1 && reducedTerm(ts[0].t) ? { kind: "state" } : null; }
        case "EXPANDED_POLY": return !hasXDen(s) && isLit0(right) && isMonoSum(left) && noBrackets(left) ? { kind: "state" } : null;
      }
      throw new Error(`unknown goal ${name}`);
    },
  };
}

// ---------- start state and replay ----------
/** The core's start state already carries the restrictions of the written text (invariant I3, validated by the independent verifier). The reference's
 *  `restrict` operation, which fills an empty list, is therefore a recorded no-op as the FIRST step; it is only offered when the task allows it. */
export function begin(text: string): CoreState { return startState(text); }
export const stateOut = (s: CoreState) => ({ eq: eqText(s.math), restr: excludedOf(s.math).map(String) });
export function replay(text: string, steps: RefStep[]): { ok: boolean; states: { eq: string; restr: string[] }[]; error?: string } {
  let s = begin(text); const states = [stateOut(s)];
  for (const [i, st] of steps.entries()) {
    if (st.op === "restrict") { if (i === 0) { states.push(stateOut(s)); continue; } return { ok: false, states, error: `step ${i}: restrict is only meaningful as the first step` }; }
    const m = moveOf(s, st.op, st.params); if (!m) return { ok: false, states, error: `step ${i}: ${st.op} ${JSON.stringify(st.params)} not applicable` };
    try { s = applyMove(s, m); } catch (e) { return { ok: false, states, error: `step ${i}: ${st.op}: ${e instanceof RuleFailure ? e.message : String(e)}` }; }
    states.push(stateOut(s));
  }
  return { ok: true, states };
}

// ---------- size measure for guidance (terms + degree + fractions, computed on the written tree) ----------
import { Expr } from "../math-kernel.ts";
const monos = (e: MathExpr): number => { try { return flat(e).reduce((n, t) => n + (t.t.kind === "add" || t.t.kind === "sub" || t.t.kind === "mul" || t.t.kind === "div" || t.t.kind === "pow" ? Math.max(1, countTerms(t.t)) : 1), 0); } catch { return 1; } };
const countTerms = (e: MathExpr): number => { switch (e.kind) { case "add": case "sub": return countTerms(e.left) + countTerms(e.right); case "mul": return countTerms(e.left) * countTerms(e.right); case "div": return countTerms(e.left) + countTerms(e.right) - 0; case "neg": return countTerms(e.operand); case "pow": return e.base.kind === "add" || e.base.kind === "sub" ? Math.pow(countTerms(e.base), Number(e.exp.kind === "num" ? e.exp.value.numBig : 1n)) : 1; default: return 1; } };
const degOf = (e: MathExpr): number => { switch (e.kind) { case "var": return 1; case "add": case "sub": return Math.max(degOf(e.left), degOf(e.right)); case "mul": return degOf(e.left) + degOf(e.right); case "div": return Math.max(degOf(e.left), degOf(e.right)); case "neg": return degOf(e.operand); case "pow": return e.exp.kind === "num" ? degOf(e.base) * Number(e.exp.value.numBig) : degOf(e.base); default: return 0; } };
const fracs = (e: MathExpr): number => { switch (e.kind) { case "div": return 1 + fracs(e.left) + fracs(e.right); case "add": case "sub": case "mul": return fracs(e.left) + fracs(e.right); case "neg": return fracs(e.operand); case "pow": return fracs(e.base); default: return 0; } };
export const sizeOf = (s: CoreState): number => { const { left, right } = eqOf(s.math); return monos(left) + monos(right) + Math.max(degOf(left), degOf(right)) + fracs(left) + fracs(right); };
export type { SearchStats };
