// Text-level checker for transitions and claims. R1: the AUTHORITY is the independent verifier (../verifier/verifier.ts: its own parser,
// polynomial code, restriction extraction and real-solution-set algebra). The earlier Poly-based check (domain-state.ts) is kept only as a
// differential cross-check: when the two disagree the result is reported, never hidden.
// Equivalence is decided by exact polynomial/rational-function reasoning, never by sampling.
import { checkTransition, parseEq, valuesOf, checkClaim as legacyClaim, type StateText, type Effect } from "./domain-state.ts";
import * as V from "../verifier/verifier.ts";

export function checkStepLegacy(from: StateText, to: StateText, effect: Effect = "equivalence", original?: string): string[] | null {
  try { const a = parseEq(from.eq), b = parseEq(to.eq);
    return checkTransition({ ...a, excluded: valuesOf(from.excluded) }, { ...b, excluded: valuesOf(to.excluded) }, effect, original ? V.analyse(original).required : undefined);
  } catch { return null; }
}
export function checkStepText(from: StateText, to: StateText, effect: Effect = "equivalence", original?: string) {
  const v = V.checkStep(from, to, effect, original);
  const legacy = checkStepLegacy(from, to, effect, original);
  return { valid: v.valid, reasons: v.reasons as string[], refusal: v.refusal ?? null, legacyAgrees: legacy === null ? null : (legacy.length === 0) === v.valid };
}
export function checkClaim(eq: string, claimed: string[] | "all-except-excluded" | "all-real") { return V.checkClaim(eq, claimed); }
export { legacyClaim };
export const checkTrace = V.checkTrace;
