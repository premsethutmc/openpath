/**
 * expected-time@1: about how long a question should take a learner who knows how to do it.
 *
 * An ESTIMATE made by rule from the question itself, not a measured norm: time to read it, time for each step of its
 * working (by the kind of step and the size of the numbers), time to decide what to do at each step, and time to write
 * the answer. It exists so that a right answer can also be called quick or slow against the same yardstick for everyone.
 * The numbers below are OpenPath's own first settings; they are meant to be corrected from real timings once enough
 * children have answered (see docs/product/FAMILY_PILOT.md).
 *
 *   873 ÷ 4  → read ≈ 5 s, one long division with a three-digit answer ≈ 28 s, write "218 r 1" ≈ 7 s → about 40 s
 *   7 × 8    → read ≈ 5 s, one times-table fact ≈ 7 s, write "56" ≈ 3 s → about 15 s
 */
export interface TimedQuestion { prompt: string; answer: string; steps?: readonly { op: string; inputs: readonly (number | string)[] }[]; difficulty?: number }

const digits = (v: number | string): number => { const s = String(typeof v === "number" ? Math.abs(v) : v).replace(/[^0-9.]/g, ""); if (!s) return 1; const [w, f = ""] = s.split("."); return Math.max(1, w.replace(/^0+(?=\d)/, "").length + f.length); };
const nums = (inputs: readonly (number | string)[]) => inputs.filter((v) => typeof v === "number" || /^-?\d+(\.\d+)?$/.test(String(v))).map((v) => Number(v));

/** seconds to decide what a step needs, before doing it */
const DECIDE = 4;
const QUICK = /^(compare|count|count on|count back|read|classify|choose|choose the option|identify|recall|note|write|place|order|round|pick|list|state|locate|name|sign|equal|copy|half|double|third)/;
const MEDIUM = /^(evaluate|substitute|convert|simplify|rewrite|check|model|combine|split|sort|find|estimate|translate|scale|adjust|interpret|square|power|sum|difference|share|carry|regroup)/;
const HEAVY = /^(solve|factorise|expand|root|square-root|cube-root|hcf|lcm|rearrange|eliminate|complete|long-division|pythagoras|reduce|invert|distribute)/;

/** seconds for one step of working, by the kind of step and the size of its numbers */
export function stepSeconds(op: string, inputs: readonly (number | string)[]): number {
  const n = nums(inputs);
  const [a, b] = [n[0] ?? 0, n[1] ?? 0];
  const big = Math.max(1, ...n.map(digits));
  const kind = op.toLowerCase();
  if (/^(multiply|multiply-add|times)/.test(kind)) return n.length >= 2 && Math.abs(a) <= 10 && Math.abs(b) <= 10 ? 3 : Math.max(3, 4 * digits(a) * digits(b || 1));
  if (/^(divide|remainder)/.test(kind)) {
    if (n.length < 2 || b === 0) return 6;
    const quotient = Math.floor(Math.abs(a) / Math.abs(b));
    // a table fact, or long division: bring down, divide, multiply back and take away for each digit of the answer
    return Math.abs(a) <= 100 && Math.abs(b) <= 10 ? 4 : 8 * digits(quotient) * digits(b);
  }
  if (/^(add|subtract|take away|add the|subtract the)/.test(kind)) return Math.max(3, 2 * big);
  if (QUICK.test(kind)) return 4;
  if (HEAVY.test(kind)) return 10;
  if (MEDIUM.test(kind)) return 6;
  // calculus, matrices and other long steps
  return /^(differentiate|integrate|by parts|partial|row-reduce|limit|telescope|take logarithms|conjugate)/.test(kind) ? 15 : 6;
}

/**
 * About how many seconds the question should take: reading (2 words a second, and 3 s to settle), each step (deciding,
 * then doing), writing the answer (2 s and 0.7 s a character). Younger classes are given more time for the same question (up to half as long again).
 * Rounded to 5 s; never less than 10 s. With no steps recorded, the question's difficulty (1 to 5) stands in for them.
 */
export function expectedSeconds(q: TimedQuestion, grade?: number): number {
  const words = q.prompt.trim().split(/\s+/).filter(Boolean).length;
  const read = 3 + words / 2;
  const work = q.steps?.length ? q.steps.reduce((t, s) => t + DECIDE + stepSeconds(s.op, s.inputs), 0) : 10 * Math.max(1, Math.min(5, q.difficulty ?? 2));
  const write = 2 + 0.7 * Math.min(20, q.answer.length);
  // a smooth allowance by age (one rule for every class): Class 1 half as long again, easing to none from Class 6
  const age = grade === undefined ? 1 : Math.min(1.5, Math.max(1, 1 + (6 - grade) / 8));
  return Math.max(10, Math.round(((read + work + write) * age) / 5) * 5);
}

/** How a RIGHT answer's time compares with the expected time. Under 1.5 s is not judged: too quick to have been worked. */
export type Speed = "lightning" | "quick" | "steady" | "slow";
export function speedOf(ms: number, expected: number): Speed | null {
  if (!(ms >= 1500) || !(expected > 0)) return null;
  const r = ms / 1000 / expected;
  return r <= 0.5 ? "lightning" : r <= 1 ? "quick" : r <= 1.75 ? "steady" : "slow";
}
