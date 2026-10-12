/**
 * Research only (E2a review): a slip-aware response model, compared with the production model.
 * Nothing here is used in production. Production right/wrong updates are `binaryUpdate` in
 * packages/english-core/src/model.ts.
 *
 * Production (3PL):    P(right) = c + (1 − c) · L,          L = logistic(a · (θ − b))
 * Slip-aware (4PL):    P(right) = c + (1 − s − c) · L       s = chance a learner who knows it still slips
 *
 * Both are updated the same way: one Laplace step from the current estimate (the gradient of the
 * log-likelihood moves the mean; the Fisher information shrinks the variance). With s = 0 the
 * slip-aware update is exactly the production update.
 */
import { type Estimate, type ItemParams, logistic } from "../../../packages/english-core/src/index.ts";

export function pSlip(theta: number, p: ItemParams, s: number): number {
  return p.c + (1 - s - p.c) * logistic(p.a * (theta - p.b));
}

export function infoSlip(theta: number, p: ItemParams, s: number): number {
  const L = logistic(p.a * (theta - p.b));
  const P = pSlip(theta, p, s);
  const d = 1 - s;
  return (p.a * p.a * (d - p.c) ** 2 * L * L * (1 - L) ** 2) / (P * (1 - P));
}

/** The gradient of the log-likelihood at θ, for a right or wrong answer. */
export function gradientSlip(theta: number, p: ItemParams, s: number, correct: boolean): number {
  const L = logistic(p.a * (theta - p.b));
  const P = pSlip(theta, p, s);
  const slope = p.a * (1 - s - p.c) * L * (1 - L);
  return correct ? slope / P : -slope / (1 - P);
}

/** One-step Bayesian (Laplace) update, the same form as production `binaryUpdate`. */
export function slipUpdate(est: Estimate, p: ItemParams, correct: boolean, s: number): Estimate {
  const variance = 1 / (1 / est.variance + infoSlip(est.mean, p, s));
  return { mean: est.mean + variance * gradientSlip(est.mean, p, s, correct), variance };
}

export const slipModel = (s: number) => (est: Estimate, p: ItemParams, correct: boolean) => slipUpdate(est, p, correct, s);

/**
 * Research only: the exact posterior for the same model (computed on a grid, then summarised by its
 * mean and variance), instead of one Laplace step. Used to separate the response model's assumptions
 * from the approximation in the update. With s = 0 the model is production's 3PL.
 */
export function exactUpdate(est: Estimate, p: ItemParams, correct: boolean, s = 0): Estimate {
  const sd = Math.sqrt(est.variance);
  const n = 801;
  let w0 = 0;
  let w1 = 0;
  let w2 = 0;
  for (let k = 0; k < n; k++) {
    const theta = est.mean + sd * (-8 + (16 * k) / (n - 1));
    const prior = Math.exp(-0.5 * ((theta - est.mean) / sd) ** 2);
    const P = pSlip(theta, p, s);
    const w = prior * (correct ? P : 1 - P);
    w0 += w;
    w1 += w * theta;
    w2 += w * theta * theta;
  }
  const mean = w1 / w0;
  return { mean, variance: w2 / w0 - mean * mean };
}
export const exactModel = (s = 0) => (est: Estimate, p: ItemParams, correct: boolean) => exactUpdate(est, p, correct, s);
