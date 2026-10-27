import { rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 1 claims: c-arithmetic-division. Every value is recomputed from the problem text (prompt) and the step inputs,
 *  never from the family's solver. */

const nums = (t: string): bigint[] => (t.match(/\d+/g) ?? []).map((x) => BigInt(x));
const big = (x: unknown): bigint | null => (typeof x === "number" && Number.isInteger(x) ? BigInt(x) : null);
const norm = (x: unknown) => String(x).replace(/−/g, "-").replace(/\s+/g, "");

/** Smallest prime factor by plain trial division of 2, 3, 4, ... (no square-root shortcut). */
const spf = (n: bigint): bigint => { for (let k = 2n; k < n; k++) if (n % k === 0n) return k; return n; };

/** avrsub: prompt "Start at S and take away D again and again ..." (inputs [S, D, takes, ...]). */
const takeAway = (p: Problem): { s: bigint; d: bigint } | null => {
  const m = p.prompt.match(/^Start at (\d+) and (?:keep taking|take) away (\d+)/);
  return m ? { s: BigInt(m[1]), d: BigInt(m[2]) } : null;
};
/** inputs [S, D, takes]: the number left after taking D away as many times as possible = S mod D. */
const rsubLeft = (s: Step, p: Problem) => {
  const t = takeAway(p);
  if (!t || t.d === 0n || big(s.inputs[0]) !== t.s || big(s.inputs[1]) !== t.d) return null;
  return rat(t.s % t.d);
};
/** inputs [S, D, takes, flag]: the prompt asks for either the number of takes (S div D) or what is left (S mod D). */
const rsubDivide = (s: Step, p: Problem) => {
  const t = takeAway(p);
  if (!t || t.d === 0n || big(s.inputs[0]) !== t.s || big(s.inputs[1]) !== t.d) return null;
  if (/How many times/.test(p.prompt)) return rat(t.s / t.d);
  if (/What number is left/.test(p.prompt)) return rat(t.s % t.d);
  return null;
};

/** "Use long division to work out N ÷ D": inputs [N, D]; the step states the whole-number quotient. */
const avdivDivide = (s: Step, p: Problem) => {
  const m = p.prompt.match(/work out (\d+) ÷ (\d+)/);
  if (!m || BigInt(m[2]) === 0n || big(s.inputs[0]) !== BigInt(m[1]) || big(s.inputs[1]) !== BigInt(m[2])) return null;
  return rat(BigInt(m[1]) / BigInt(m[2]));
};

/** "Write N/D as a mixed number": inputs [N, D]; the step states the whole-number part. */
const agmixDivide = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^Write (\d+)\/(\d+) as a mixed number/);
  if (!m || BigInt(m[2]) === 0n || big(s.inputs[0]) !== BigInt(m[1]) || big(s.inputs[1]) !== BigInt(m[2])) return null;
  return rat(BigInt(m[1]) / BigInt(m[2]));
};

/** "smallest prime factor of N": inputs [N, floor(sqrt N)]; text is either "no prime up to the square root divides it"
 *  (N prime) or "p divides it: N = p × q" for the smallest prime factor p. */
const agptestDivide = (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^What is the smallest prime factor of (\d+)\?/);
  if (!m || big(s.inputs[0]) !== BigInt(m[1])) return null;
  const n = BigInt(m[1]);
  if (n < 2n) return null;
  const f = spf(n);
  const v = String(s.value);
  if (f === n) return v === "no prime up to the square root divides it";
  return v === `${f} divides it: ${n} = ${f} × ${n / f}`;
};

/** "A + B = ?" (commas allowed); inputs [A, B, carries]. */
const aecol4Add = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^([\d,]+) \+ ([\d,]+) = \?$/);
  if (!m) return null;
  const a = BigInt(m[1].replace(/,/g, "")), b = BigInt(m[2].replace(/,/g, ""));
  if (big(s.inputs[0]) !== a || big(s.inputs[1]) !== b) return null;
  return rat(a + b);
};

/** "... is L long and W wide ... once round": inputs [W, L]; the perimeter is twice the two sides added. */
const aeperarAdd = (s: Step, p: Problem) => {
  const m = p.prompt.match(/is (\d+) (?:m|cm) long and (\d+) (?:m|cm) wide/);
  if (!m || !/once round/.test(p.prompt)) return null;
  const l = BigInt(m[1]), w = BigInt(m[2]);
  if (big(s.inputs[0]) !== w || big(s.inputs[1]) !== l) return null;
  return rat(2n * (l + w));
};

/** "sum of the K consecutive numbers starting at A": the step "pairs" (inputs [K, 2A+K-1]) states the sum A + (A+1) + ... . */
const aeconsMultiply = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^What is the sum of the (\d+) consecutive numbers starting at (\d+)/);
  if (!m) return null;
  const k = BigInt(m[1]), a = BigInt(m[2]);
  if (big(s.inputs[0]) !== k || big(s.inputs[1]) !== 2n * a + k - 1n) return null;
  let t = 0n;
  for (let i = 0n; i < k; i++) t += a + i;
  return rat(t);
};

/** "Take N, reverse its digits to get R, and add the two numbers": inputs [N]; reverse the digit string of N. */
const aerevAdd = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^Take (\d+), reverse its digits to get (\d+), and add/);
  if (!m || big(s.inputs[0]) !== BigInt(m[1])) return null;
  const r = BigInt(m[1].split("").reverse().join(""));
  if (r !== BigInt(m[2])) return null;
  return rat(BigInt(m[1]) + r);
};

/** One-step "left" story: the prompt holds exactly the total and the part taken; inputs [total, part, "take away"]. */
const acstoryTakeAway = (s: Step, p: Problem) => {
  const n = nums(p.prompt);
  if (s.inputs[2] !== "take away" || n.length !== 2 || n[0] <= n[1]) return null;
  if (big(s.inputs[0]) !== n[0] || big(s.inputs[1]) !== n[1]) return null;
  return rat(n[0] - n[1]);
};

/** Two ticket conditions read from the prompt: A1 child + B1 adult cost C1, A2 child + B2 adult cost C2. */
const pairPrompt = (p: Problem): bigint[] | null => {
  const m = p.prompt.match(/^For a school play, (\d+) [^,]*? and (\d+) adult tickets? cost ₹(\d+), and (\d+) [^,]*? and (\d+) adult tickets? cost ₹(\d+)\./);
  return m ? m.slice(1).map((x) => BigInt(x)) : null;
};
/** Eliminating x: "A2 × first − A1 × second" gives (A2·B1 − A1·B2) y = A2·C1 − A1·C2 (coefficient and constant checked exactly). */
const anpairSubtract = (s: Step, p: Problem): boolean | null => {
  const q = pairPrompt(p);
  if (!q) return null;
  const [a1, b1, c1, a2, b2, c2] = q;
  if (norm(s.inputs[0]) !== norm(`${a2} × first − ${a1} × second`)) return null;
  const m = norm(s.value).match(/^(-?\d+)y=(-?\d+)$/);
  if (!m) return false;
  return BigInt(m[1]) === a2 * b1 - a1 * b2 && BigInt(m[2]) === a2 * c1 - a1 * c2;
};

/** Number machine: letter L is the first input; the amount(s) are read from the prompt text, not from the inputs. */
const machine = (s: Step, p: Problem, re: RegExp, build: (a: bigint, b: bigint | null, L: string) => string): boolean | null => {
  const L = s.inputs[0];
  if (typeof L !== "string" || !/^[a-z]$/.test(L)) return null;
  const m = p.prompt.match(re);
  if (!m || !p.prompt.includes(`The number put in is ${L}.`)) return null;
  return norm(s.value) === norm(build(BigInt(m[1]), m[2] ? BigInt(m[2]) : null, L));
};
const afAdd = (s: Step, p: Problem) => machine(s, p, /^A number machine adds (\d+) to any number/, (a, _b, L) => `${L} + ${a}`);
const afSub = (s: Step, p: Problem) => machine(s, p, /^A number machine takes (\d+) away from any number/, (a, _b, L) => `${L} - ${a}`);
const afMul = (s: Step, p: Problem) =>
  machine(s, p, /^A number machine multiplies any number put in by (\d+)(?:, then adds (\d+))?\./, (a, b, L) => (b === null ? `${a}${L}` : `${a}${L} + ${b}`));

/** "Look at the sequence t1, t2, ... ": the gaps step lists the differences between neighbouring terms. */
const affruleSubtract = (s: Step, p: Problem): boolean | null => {
  const m = p.prompt.match(/^Look at the sequence ([\d, ]+), …/);
  if (!m) return null;
  const t = nums(m[1]);
  if (t.length < 2 || s.inputs.length !== t.length || s.inputs.some((x, i) => big(x) !== t[i])) return null;
  const gaps = t.slice(1).map((x, i) => String(x - t[i]));
  return norm(s.value) === norm(gaps.join(", "));
};

export const CLAIMS: ClaimTable = {
  "avrsub/subtract": rsubLeft,
  "avrsub/divide": rsubDivide,
  "avdiv/divide": avdivDivide,
  "agmix/divide": agmixDivide,
  "agptest/divide": { check: agptestDivide },
  "aecol4/add": aecol4Add,
  "aeperar/add": aeperarAdd,
  "aecons/multiply": aeconsMultiply,
  "aerev/add": aerevAdd,
  "acstory/take away": acstoryTakeAway,
  "anpair/subtract": { check: anpairSubtract },
  "afletter/multiply": { check: afMul },
  "afletter/add": { check: afAdd },
  "afletter/subtract": { check: afSub },
  "affrule/subtract": { check: affruleSubtract },
};
