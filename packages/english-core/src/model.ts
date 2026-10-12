/**
 * The measurement model, kept small so every number can be explained.
 *
 * Each capability estimate is a normal distribution (mean, variance) on the
 * 1–8 band scale.
 *  - Right/wrong items use a one-step Bayesian update for the logistic
 *    (3-parameter) response model.
 *  - Judged evidence (a band from an evaluator) uses a precision-weighted
 *    (Kalman) update with the evaluator's measured noise.
 *  - Time adds variance; it never moves the mean.
 */
import type { Estimate } from "./types.ts";

export const logistic = (x: number): number => 1 / (1 + Math.exp(-x));

export interface ItemParams {
  a: number; // discrimination
  b: number; // difficulty (band)
  c: number; // guessing rate (0 for typed answers, 1/options for choice)
}

/** Probability of a right answer for a learner at `theta`. */
export function pCorrect(theta: number, p: ItemParams): number {
  return p.c + (1 - p.c) * logistic(p.a * (theta - p.b));
}

/** Fisher information of an item at `theta` (how much an answer can tell us). */
export function itemInformation(theta: number, p: ItemParams): number {
  const P = pCorrect(theta, p);
  const ratio = (P - p.c) / (1 - p.c);
  return (p.a * p.a * ratio * ratio * (1 - P)) / P;
}

/** One-step Bayesian (Laplace) update after a right or wrong answer. */
export function binaryUpdate(est: Estimate, p: ItemParams, correct: boolean): Estimate {
  const mu = est.mean;
  const L = logistic(p.a * (mu - p.b));
  const P = p.c + (1 - p.c) * L;
  const gradient = correct ? (p.a * (1 - p.c) * L * (1 - L)) / P : -p.a * L;
  const variance = 1 / (1 / est.variance + itemInformation(mu, p));
  return { mean: mu + variance * gradient, variance };
}

/** Precision-weighted update from a judged band with known measurement noise (sd). */
export function bandUpdate(est: Estimate, band: number, noiseSd: number): Estimate {
  const gain = est.variance / (est.variance + noiseSd * noiseSd);
  return { mean: est.mean + gain * (band - est.mean), variance: est.variance * (1 - gain) };
}

/** Uncertainty grows with time since the last update, up to the prior variance. */
export function inflate(est: Estimate, days: number, perDay: number, maxVariance: number): Estimate {
  if (days <= 0 || perDay <= 0 || est.variance >= maxVariance) return est;
  return { mean: est.mean, variance: Math.min(maxVariance, est.variance + perDay * days) };
}

/** z such that P(Z ≤ z) = p, for the standard normal (Acklam's rational approximation). */
export function normalQuantile(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
export const round = (x: number, places = 2): number => Math.round(x * 10 ** places) / 10 ** places;
export const sd = (e: Estimate): number => Math.sqrt(e.variance);

const DAY = 86_400_000;
export function daysBetween(fromIso: string | null, toIso: string): number {
  if (!fromIso) return 0;
  return (Date.parse(toIso) - Date.parse(fromIso)) / DAY;
}

/** Small deterministic random generator (mulberry32), so simulations and selection are reproducible. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw from a uniform generator (Box–Muller). */
export function gaussian(next: () => number): number {
  const u = Math.max(next(), 1e-12);
  const v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** FNV-1a 32-bit hash as hex: a stable, platform-free fingerprint (not for security). */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
