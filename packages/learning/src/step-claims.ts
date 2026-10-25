/**
 * Typed claims for steps that no kernel rule covers yet.
 *
 * A claim says, for one (family, step) pair, what the step's stated value must equal and how to compute that from the
 * step's own inputs. The computation is exact (bigint rationals) and independent of the family that produced the
 * value. A step counts as checked only if the stated value equals the claim's result. A pair that is not listed here
 * is not checked by this module, and a claim that cannot read a step's inputs returns null (not checked).
 *
 * Keep each claim small and general; the table below is the reviewable list of what is being asserted.
 */
import { Rational, parseRational } from "./math-kernel";
import type { Problem, Step } from "./family-kit";

type Claim = (step: Step, problem: Problem) => Rational | null;

const ints = (xs: readonly unknown[]): bigint[] | null => {
  const out: bigint[] = [];
  for (const x of xs) {
    if (typeof x !== "number" && typeof x !== "string") return null;
    const r = parseRational(x);
    if (!r || !r.isInteger() || r.numBig <= 0n) return null;
    out.push(r.numBig);
  }
  return out.length >= 2 ? out : null;
};
const gcdB = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcdB(b, a % b));
const rat = (n: bigint) => new Rational(n);

/** Highest common factor of all the inputs. */
const hcf: Claim = (s) => { const v = ints(s.inputs); return v ? rat(v.reduce(gcdB)) : null; };
/** Lowest common multiple of all the inputs. */
const lcm: Claim = (s) => { const v = ints(s.inputs); return v ? rat(v.reduce((a, b) => (a / gcdB(a, b)) * b)) : null; };

/** Round half up to the nearest multiple of `unit` (positive values). */
function roundHalfUp(n: Rational, unit: Rational): Rational | null {
  if (unit.isZero() || n.numBig < 0n) return null;
  const q = n.div(unit).add(new Rational(1, 2)); // floor(q) below
  const fl = q.numBig / q.denBig; // bigint floor for a positive rational
  return rat(fl).mul(unit);
}
/** inputs [n, k]: round n to k decimal places. */
const roundToDecimalPlaces: Claim = (s) => {
  if (s.inputs.length !== 2) return null;
  const n = parseRational(s.inputs[0] as number | string), k = parseRational(s.inputs[1] as number | string);
  if (!n || !k || !k.isInteger() || k.numBig < 0n || k.numBig > 6n) return null;
  return roundHalfUp(n, new Rational(1n, 10n ** k.numBig));
};
/** inputs [n]: round n to the nearest ten. */
const roundToTen: Claim = (s) => {
  if (s.inputs.length !== 1) return null;
  const n = parseRational(s.inputs[0] as number | string);
  return n ? roundHalfUp(n, rat(10n)) : null;
};
/** inputs [n]: round n to its greatest place (one significant figure). */
const roundToGreatestPlace: Claim = (s) => {
  if (s.inputs.length !== 1) return null;
  const n = parseRational(s.inputs[0] as number | string);
  if (!n || !n.isInteger() || n.numBig <= 0n) return null;
  return roundHalfUp(n, rat(10n ** BigInt(n.numBig.toString().length - 1)));
};

export const STEP_CLAIMS: Record<string, Claim> = {
  "aghcf3/hcf": hcf, "agcop/hcf": hcf, "aglcm/hcf": hcf, "aghlw/hcf": hcf,
  "aglcm3/lcm": lcm, "adfordu/lcm": lcm, "agjump/lcm": lcm, "adfcmpu/lcm": lcm, "aghlw/lcm": lcm,
  "adest/round": roundToTen,
  "avpest/round": roundToGreatestPlace,
  "aerdec/round": roundToDecimalPlaces,
};

/** Whether a listed claim holds for this step: null if the pair has no claim or the claim cannot read the step. */
export function stepClaimHolds(step: Step, problem: Problem): boolean | null {
  const claim = STEP_CLAIMS[`${problem.family}/${step.op}`];
  if (!claim) return null;
  let expected: Rational | null;
  try { expected = claim(step, problem); } catch { return null; }
  if (!expected) return null;
  if (typeof step.value !== "number" && typeof step.value !== "string") return false;
  const stated = parseRational(step.value);
  return !!stated && stated.eq(expected);
}

/** Whether a claim is listed for this (family, step type). */
export const hasStepClaim = (family: string, op: string) => `${family}/${op}` in STEP_CLAIMS;
