// Verification of one transformation: exact, and independent of the code that produced it.
// The verifier (reasoner/verifier) parses the PRINTED texts of the two states with its own parser and its own polynomial and solution-set
// algebra. The older Poly-based invariant check must agree with it; a disagreement is a defect in one of them and raises PROOF_FAILED rather
// than being resolved silently. An unresolved proof is never read as "correct" (R1).
import type { MathState } from "../math-kernel.ts";
import { printExpr } from "../reasoner/expr-text.ts";
import { Refusal } from "../reasoner/outcomes.ts";
import * as V from "../reasoner/verifier/verifier.ts";
import { checkTransition, excludedOf, zerosOfDenominators, type Effect, type Violation } from "../reasoner/domain/domain-state.ts";
import type { Rational } from "../math-kernel.ts";

export const eqOf = (s: MathState) => s.statements[0];
export const eqText = (s: MathState) => `${printExpr(eqOf(s).left)}=${printExpr(eqOf(s).right)}`;
export const origRestr = (s: MathState): Rational[] => {
  const l = s.expressions.get("original.left"), r = s.expressions.get("original.right");
  return l && r ? [...zerosOfDenominators(l), ...zerosOfDenominators(r)] : [];
};
export const originalText = (s: MathState) => { const l = s.expressions.get("original.left"), r = s.expressions.get("original.right"); return l && r ? `${printExpr(l)}=${printExpr(r)}` : undefined; };
export const stateText = (s: MathState) => ({ eq: eqText(s), excluded: excludedOf(s).map(String) });
export const DISAGREEMENTS: string[] = [];

export function violations(effect: Effect, before: MathState, after: MathState): Violation[] {
  const q = (s: MathState) => ({ left: eqOf(s).left, right: eqOf(s).right, excluded: excludedOf(s) });
  return checkTransition(q(before), q(after), effect, origRestr(after));
}
/** One step, verified once: the independent verifier decides; the internal invariant check must agree (else PROOF_FAILED). */
export function verifyStep(effect: Effect, before: MathState, after: MathState): { ok: boolean; violations: Violation[] } {
  const v = V.checkStep(stateText(before), stateText(after), effect, originalText(after));
  // a state the independent verifier cannot analyse (size/shape limits) is UNRESOLVED: the step is rejected, never accepted on the legacy check alone
  if (!v.valid && v.reasons.some((r) => String(r) === "state-unanalysable")) return { ok: false, violations: [] };
  const viol = violations(effect, before, after);
  if (v.valid !== (viol.length === 0)) { DISAGREEMENTS.push(`${eqText(before)} -> ${eqText(after)} (${effect}): verifier ${v.valid ? "accepts" : "rejects"} [${v.reasons}], legacy ${viol.length === 0 ? "accepts" : "rejects"}`); throw new Refusal("PROOF_FAILED", "independent verifier and internal check disagree"); }
  return { ok: v.valid, violations: viol };
}
export const verifyEffect = (effect: Effect, before: MathState, after: MathState): boolean => verifyStep(effect, before, after).ok;
