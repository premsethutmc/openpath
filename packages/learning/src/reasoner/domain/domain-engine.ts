// K05.2's public interface, now a thin view over the core planner (core/planner.ts) with the "rational" strategy: the same state, the same
// rule library, the same search loop and the same independent verification as every other capability. Nothing here searches or decides.
import { solve as coreSolve, type CoreResult, type ProofStep } from "../../core/solve.ts";
import { rationalScope } from "../../core/scope.ts";

export type Result = CoreResult;
export type TraceStep = ProofStep;
export const gate = rationalScope;
export function solve(text: string, opts: { maxDepth?: number; maxNodes?: number } = {}): Result {
  return coreSolve(text, { strategy: "rational", ...opts });
}
