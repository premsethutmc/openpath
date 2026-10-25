/** Shared types and exact helpers for claim modules (claims/*.ts). */
import { Rational, parseRational } from "./math-kernel";
import type { Problem, Step } from "./family-kit";
export { Rational, parseRational };
export type { Problem, Step };

/** A claim computes, exactly and independently of the family, the value a step must state; null = cannot read the step. */
export type Claim = (step: Step, problem: Problem) => Rational | null;
/** A claim may instead decide for itself whether the stated value (any type) is right: true, false, or null (cannot read). */
export type Check = (step: Step, problem: Problem) => boolean | null;
export type ClaimTable = Record<string, Claim | { check: Check }>;

export const rat = (n: bigint) => new Rational(n);
export const gcdB = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcdB(b, a % b));
/** Round half up to the nearest multiple of `unit` (positive values). */
export function roundHalfUp(n: Rational, unit: Rational): Rational | null {
  if (unit.isZero() || n.numBig < 0n) return null;
  const q = n.div(unit).add(new Rational(1, 2));
  return rat(q.numBig / q.denBig).mul(unit);
}
