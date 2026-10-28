/**
 * E6 entry point: generalised natural-working coverage for calculus, probability/combinatorics, complex/polynomial and mixed working.
 * The proposer reads notation into typed claims; independent exact binders judge every claim; nothing is accepted on a float comparison.
 */
import { buildProofContext, type ProofContext } from "./proof-context.ts";
import type { NaturalWorkingInput } from "./natural-working.ts";
import { prepareRows, planUnsupported, GENERALIZATION_E6_CONTRACT, type E6Plan } from "./e6-common.ts";
import { planCalculusE6, supportsCalc } from "./e6-calc.ts";
import type { CalculusProblem } from "./calculus-core.ts";
import { Budget, Unsupported } from "./e6-cas.ts";
import { planNumbersE6, type NumProblem } from "./e6-numbers.ts";
import { Overflow } from "./exact-e5.ts";

export { GENERALIZATION_E6_CONTRACT };
export type { E6Plan };

/** Returns null when the problem is not one this route owns (the established routes then decide). */
export function planGeneralizationE6(problem: unknown, input: NaturalWorkingInput, ctx: ProofContext = buildProofContext(problem)): E6Plan | { refused: string; resource?: boolean } | null {
  const p = problem as { domain?: string; task?: string };
  if (!p || typeof p !== "object") return null;
  if (p.domain !== "calculus" && p.domain !== "probability-statistics" && p.domain !== "complex-polynomial") return null;
  let rows: ReturnType<typeof prepareRows>;
  try { rows = prepareRows(input.text); } catch (err) { return { refused: err instanceof Error ? err.message : "the working could not be translated safely" }; }
  if ("error" in rows) return { refused: rows.error, resource: rows.resource };
  if (p.domain !== "calculus") { try { return planNumbersE6(problem as NumProblem, rows); } catch (err) { if (err instanceof Budget || err instanceof Overflow) return { refused: "resource bound exceeded", resource: true }; if (process.env.E6_DEBUG) console.error(err); return { refused: "the working could not be translated safely" }; } }
  if (!supportsCalc(problem as CalculusProblem)) return planUnsupported(rows, "calculus", String(p.task ?? "calculus"), "this kind of problem is outside the exact E6 binders; nothing is accepted on its behalf");
  try { return planCalculusE6(problem as CalculusProblem, rows, ctx); }
  catch (err) {
    if (err instanceof Budget || err instanceof Overflow) return { refused: "resource bound exceeded", resource: true };
    if (err instanceof Unsupported) return { refused: err.message };
    if (process.env.E6_DEBUG) console.error(err);
    return { refused: "the working could not be translated safely" };
  }
}
