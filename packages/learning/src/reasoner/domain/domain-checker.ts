// Text-level checker for transitions and claims, used on the frozen adversarial and claims files and by the engine's own traces.
// Soundness strategy: equivalence is decided by exact polynomial/rational-function reasoning (reduced numerator, domain restrictions
// as explicit values, squarefree comparison) — never by sampling. The fraction-grid verifier in Python is a secondary check only.
import { checkTransition, checkClaim, parseEq, valuesOf, type StateText, type Effect } from "./domain-state.ts";

export function checkStepText(from: StateText, to: StateText, effect: Effect = "equivalence") {
  const a = parseEq(from.eq), b = parseEq(to.eq);
  const why = checkTransition({ ...a, excluded: valuesOf(from.excluded) }, { ...b, excluded: valuesOf(to.excluded) }, effect);
  return { valid: why.length === 0, reasons: why };
}
export { checkClaim };
