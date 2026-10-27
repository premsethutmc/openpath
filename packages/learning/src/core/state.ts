// The unified mathematical state of the core.
// One representation serves every reasoner: the kernel MathState carries the relation (statements), the expressions (the frozen original claim
// under "original.*"), the variable's restrictions (constraints, kind "nonzero") and bindings; CoreState adds what a proof needs on top of it:
// candidates, history (evidence per applied rule), and open/closed proof obligations.
// Domain semantics are explicit: the variable ranges over the reals minus `restrictions`, which only ever grow (I1), always contain the
// restrictions of the ORIGINAL text (I3), and cover every denominator of the current expression (I2). A solution is only ever accepted after
// exact substitution into the original equation (I4).
import { initialState, type DomainState } from "../reasoner/domain/domain-state.ts";

export interface Obligation { id: string; kind: "candidate-check" | "restriction-closure"; opened: number; closed?: number; by?: string }
export interface CoreState extends DomainState {
  variable: "x";
  domain: "real numbers minus restrictions";
  obligations: Obligation[];   // opened by implication steps (new candidates may appear), closed by accept-candidate
}
export type Claim = { kind: "solution"; value: string } | { kind: "none" } | { kind: "identity" } | { kind: "state" };

/** The start state of a problem written as an equation. Throws a structured Refusal for anything the exact parser cannot read. */
export function startState(text: string): CoreState {
  return { ...initialState(text), variable: "x", domain: "real numbers minus restrictions", obligations: [] };
}
export const openObligations = (s: CoreState): Obligation[] => s.obligations.filter((o) => o.closed === undefined);
