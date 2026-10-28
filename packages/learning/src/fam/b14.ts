/**
 * Batch b14 (families@2), Grades 9–10 number, probability, reasoning, statistics and trigonometry: congruence modulo
 * n, classical probability (bags, numbered cards, two dice), two-stage experiments, complementary events and the
 * addition rule, coordinate and number arguments, linear and quadratic models, frequency distributions, clustered and
 * 100% stacked bar charts, weighted and combined means, grouped mean, median and mode, heights and distances,
 * trigonometric identities, and the ratios of standard and complementary angles. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";
import { b1Object } from "../typed-contract.ts";
import { fmt, gcd } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const MOD = "MATH.number.modular-arithmetic";
const DIVR = "MATH.number.division-remainders";
const INT = "MATH.number.integers";
const EUC = "MATH.number.euclid-algorithm";
const PROB = "MATH.probability.classical";
const SS = "MATH.probability.sample-space";
const TREE = "MATH.probability.tree-diagrams";
const FPROD = "MATH.number.fraction-product";
const COMP = "MATH.probability.complements";
const ARG = "MATH.reasoning.mathematical-argument";
const PROOF = "MATH.reasoning.proof-intro";
const PF = "MATH.number.prime-factorisation";
const PYTH = "MATH.geometry.pythagoras";
const MODEL = "MATH.reasoning.model-selection";
const LIN = "MATH.algebra.linear-equations";
const QUAD = "MATH.algebra.quadratics";
const GD = "MATH.statistics.grouped-data";
const HIST = "MATH.statistics.histograms";
const AVG = "MATH.statistics.averages-intro";
const STACK = "MATH.statistics.stacked-bar-charts";
const PCT = "MATH.number.percentage";
const RATIO = "MATH.number.ratio";
const BARS = "MATH.statistics.scaled-bars";
const WM = "MATH.statistics.weighted-mean";
const GM = "MATH.statistics.grouped-mean";
const HD = "MATH.trigonometry.heights-distances";
const IDN = "MATH.trigonometry.identities";
const TR = "MATH.trigonometry.ratios";
const SIM = "MATH.geometry.similarity";
const SURD = "MATH.number.radicals";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi", "Vikram", "Fatima"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
/** A typed number (fraction or decimal answers) as a number; NaN if unreadable. */
const nv = (v: Value): number => {
  if (typeof v === "number") return v;
  if (Array.isArray(v)) return NaN;
  const t = v.replace(/−/g, "-").replace(/\s/g, "");
  const m = t.match(/^(-?\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};
/** The value of an exact or expression answer (NaN if unreadable). */
const ev = (v: Value, env: Record<string, number> = {}): number => {
  if (typeof v === "number") return v;
  if (Array.isArray(v)) return NaN;
  try {
    return evaluate(parse(v), env);
  } catch {
    return NaN;
  }
};
/** A decimal string with up to 2 places when x has at most 2 decimal places, else the number itself. */
const dv = (x: number): Value => {
  const c = Math.round(x * 100);
  if (Math.abs(c - x * 100) > 1e-6) return x;
  const s = (Math.abs(c) / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return (c < 0 ? "-" : "") + s;
};
const has2dp = (num: number, den: number) => (num * 100) % den === 0;
/** A fixed hash (FNV-1a) of some numbers, for reproducible choices inside a problem. */
const hash = (...xs: number[]) => {
  let h = 2166136261;
  for (const c of xs.join(",")) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};
/** A small deterministic random generator: next integer in [lo, hi]. */
const gen = (seed: number) => {
  let s = (seed * 2654435761 + 12345) >>> 0;
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + ((s >>> 16) % (hi - lo + 1));
  };
};
/** Square-free split: n = k² m. */
const sqf = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
};
/** n√r / d written in lowest terms (r square-free; r = 1 gives a fraction). */
const surdStr = (n: number, d: number, r: number): string => {
  if (n === 0) return "0";
  const sign = n * d < 0 ? "−" : "";
  let a = Math.abs(n);
  let b = Math.abs(d);
  const g = gcd(a, b);
  a /= g;
  b /= g;
  const top = r === 1 ? String(a) : `${a === 1 ? "" : a}√${r}`;
  return `${sign}${top}${b === 1 ? "" : `/${b}`}`;
};
const step = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
/** Keep only the predictions that differ from the right answer (by value). */
const differs = (answer: number, xs: (number | null)[]) => [...new Set(xs.filter((x): x is number => x !== null && Number.isFinite(x) && !close(x, answer)))];

// ---------------------------------------------------------------- modular arithmetic

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekWrong = ([s, d]: number[]) => ({ today: (s + d + 6) % 7, weeks: (s + Math.floor(d / 7)) % 7, back: (((s - d) % 7) + 7) % 7 });
const weekOpts = ([s, d]: number[]) => {
  const c = (s + d) % 7;
  const w = weekWrong([s, d]);
  const out: number[] = [];
  for (const x of [c, w.today, w.weeks, w.back]) if (!out.includes(x)) out.push(x);
  for (let k = 1; out.length < 4; k++) if (!out.includes((c + k) % 7)) out.push((c + k) % 7);
  return out.sort((x, y) => ((x - s + 7) % 7) - ((y - s + 7) % 7));
};

// ---------------------------------------------------------------- probability helpers

const COLOURS = ["red", "blue", "green"];
const DICE: { say: (s: number) => string; test: (a: number, b: number, s: number) => boolean; ok: (s: number) => boolean }[] = [
  { say: (s) => `the sum of the two numbers is ${s}`, test: (a, b, s) => a + b === s, ok: (s) => s >= 2 && s <= 12 },
  { say: (s) => `the sum of the two numbers is greater than ${s}`, test: (a, b, s) => a + b > s, ok: (s) => s >= 2 && s <= 11 },
  { say: (s) => `the sum of the two numbers is less than ${s}`, test: (a, b, s) => a + b < s, ok: (s) => s >= 3 && s <= 12 },
  { say: (s) => `the product of the two numbers is ${s}`, test: (a, b, s) => a * b === s, ok: (s) => s >= 1 && s <= 36 },
  { say: (s) => (s === 0 ? "both dice show the same number" : `the two numbers differ by ${s}`), test: (a, b, s) => Math.abs(a - b) === s, ok: (s) => s >= 0 && s <= 5 },
  { say: (s) => `the sum of the two numbers is a multiple of ${s}`, test: (a, b, s) => (a + b) % s === 0, ok: (s) => s >= 2 && s <= 6 },
  { say: (s) => `at least one of the dice shows ${s}`, test: (a, b, s) => a === s || b === s, ok: (s) => s >= 1 && s <= 6 },
  { say: (s) => `both dice show a number greater than ${s}`, test: (a, b, s) => a > s && b > s, ok: (s) => s >= 1 && s <= 5 },
  { say: (s) => `the product of the two numbers is greater than ${s}`, test: (a, b, s) => a * b > s, ok: (s) => s >= 4 && s <= 30 },
];
/** Favourable outcomes counted die by die: for each number on the first die, how many numbers on the second work. */
const diceCount = (k: number, s: number) => {
  let c = 0;
  for (let a = 1; a <= 6; a++) {
    let w = 0;
    for (let b = 1; b <= 6; b++) if (DICE[k].test(a, b, s)) w++;
    c += w;
  }
  return c;
};
const diceUnordered = (k: number, s: number) => {
  let c = 0;
  for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) if (DICE[k].test(a, b, s)) c++;
  return c;
};
const CARDEV = ["a multiple of", "a prime number", "a perfect square", "not a multiple of"];
const cardCount = (N: number, e: number, k: number) => {
  if (e === 0) return Math.floor(N / k);
  if (e === 3) return N - Math.floor(N / k);
  if (e === 2) return Math.floor(Math.sqrt(N + 0.5));
  let c = 0;
  const sieve = new Array(N + 1).fill(true);
  for (let i = 2; i <= N; i++) if (sieve[i]) {
    c++;
    for (let j = i * i; j <= N; j += i) sieve[j] = false;
  }
  return c;
};
const TREEEV = ["both counters are red", "both counters are the same colour", "one counter is red and the other is blue", "at least one counter is red"];
const treeP = (r: number, b: number, w: number, e: number) => {
  const T = r + b;
  const rr = (r / T) * ((w ? r : r - 1) / (w ? T : T - 1));
  const bb = (b / T) * ((w ? b : b - 1) / (w ? T : T - 1));
  const rb = (r / T) * (b / (w ? T : T - 1));
  const br = (b / T) * (r / (w ? T : T - 1));
  return [rr, rr + bb, rb + br, 1 - bb][e];
};
/** anunion: x, y, z, d is k times a smaller allowed choice (denominator still at least 6): the same question as that one. */
const unionDup = ([x, y, z, d]: number[]) => {
  const g = gcd(gcd(x, y), gcd(z, d));
  return (g - 1) * (d / g) >= 6;
};
const probText = (a: number, d: number) => {
  const g = gcd(a, d);
  return d / g === 1 ? String(a / g) : `${a / g}/${d / g}`;
};
const validOpts = ([a, b, dd, t]: number[]) => {
  const dec = `0.${String(dd).padStart(2, "0")}`.replace(/0+$/, "");
  const kind = Math.floor(t / 2);
  const invalid = kind === 0 ? (a === 1 ? String(b) : `${b}/${a}`) : kind === 1 ? `−${dec}` : `1${dec.slice(1)}`;
  const items = [`${a}/${b}`, dec, t % 2 === 0 ? "0" : "1", invalid];
  const h = hash(a, b, dd, t);
  // a fixed shuffle
  const order = [0, 1, 2, 3].sort((x, y) => ((h >> (x * 3)) & 7) - ((h >> (y * 3)) & 7) || x - y);
  return order.map((i) => items[i]);
};
const optVal = (s: string) => {
  const t = s.replace(/−/g, "-");
  const m = t.match(/^(-?\d+)\/(\d+)$/);
  return m ? Number(m[1]) / Number(m[2]) : Number(t);
};

// ---------------------------------------------------------------- reasoning helpers

const PTS = ["The three points lie on one straight line", "They form a right-angled triangle", "They form an isosceles triangle", "They form a triangle that is neither right-angled nor isosceles"];
type Pt = [number, number];
/** [t, x0, y0, a, b] → the points P, Q, R (t: 0 on a line, 1 right-angled, 2 isosceles, 3 neither). */
const ptsOf = ([t, x0, y0, a, b]: number[]): Pt[] => {
  const A: Pt = [x0, y0];
  const B: Pt = [x0 + a, y0 + b];
  const C: Pt = t === 0 ? [x0 + 3 * a, y0 + 3 * b] : t === 1 ? [x0 - 2 * b, y0 + 2 * a] : t === 2 ? [x0 + b, y0 + a] : [x0 - b + 1, y0 + a + 2];
  return [B, C, A];
};
const d2 = (P: Pt, Q: Pt) => (P[0] - Q[0]) ** 2 + (P[1] - Q[1]) ** 2;
/** By distances (the method taught): AB + BC = AC on a line, Pythagoras' converse, equal sides. */
const ptsByDistance = (pts: Pt[]) => {
  const s = [d2(pts[0], pts[1]), d2(pts[1], pts[2]), d2(pts[0], pts[2])].sort((x, y) => x - y);
  if (close(Math.sqrt(s[0]) + Math.sqrt(s[1]), Math.sqrt(s[2]), 1e-12)) return 0;
  if (s[0] + s[1] === s[2]) return 1;
  return s[0] === s[1] || s[1] === s[2] ? 2 : 3;
};
/** By vectors (an independent method): cross product for a line, dot products for a right angle. */
const ptsByVectors = (pts: Pt[]) => {
  const [P, Q, R] = pts;
  const v = (X: Pt, Y: Pt): Pt => [Y[0] - X[0], Y[1] - X[1]];
  const [u, w] = [v(P, Q), v(P, R)];
  if (u[0] * w[1] - u[1] * w[0] === 0) return 0;
  const dot = (X: Pt, Y: Pt, Z: Pt) => v(X, Y)[0] * v(X, Z)[0] + v(X, Y)[1] * v(X, Z)[1];
  if (dot(P, Q, R) === 0 || dot(Q, P, R) === 0 || dot(R, P, Q) === 0) return 1;
  const [x, y, z] = [d2(P, Q), d2(Q, R), d2(P, R)];
  return x === y || y === z || x === z ? 2 : 3;
};
const pt = ([x, y]: Pt) => `(${n_(x)}, ${n_(y)})`;
const POW0 = (a: number) => [`Yes: ${a}ⁿ ends in 0 for some n`, `No: ${a}ⁿ has the prime factor 2 but never the prime factor 5`, `No: ${a}ⁿ has the prime factor 5 but never the prime factor 2`, `No: ${a}ⁿ has neither 2 nor 5 as a prime factor`];
const pow0Answer = (a: number) => (a % 10 === 0 ? 0 : a % 2 === 0 ? 1 : a % 5 === 0 ? 2 : 3);
const PAIRK = [[2, 3, 3, 1], [1, 2, 3, 1], [3, 2, 1, 4], [2, 5, 3, 2], [4, 1, 1, 3], [5, 2, 3, 4]];
const tupleNums = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/−/g, "-").replace(/[()\s]/g, "");
  const xs = t.split(",").map(Number);
  return xs.length && xs.every((x) => Number.isFinite(x)) ? xs : null;
};

// ---------------------------------------------------------------- statistics helpers

const FREQ = [
  { s: 0, w: 10, what: "The marks (out of 50) scored by 20 students in a test are", other: "A batsman's scores in 20 matches were" },
  { s: 30, w: 5, what: "The weights (in kg) of 20 students are", other: "The numbers of passengers on 20 trips of a bus were" },
];
const freqData = ([seed, j, wi]: number[]) => {
  const { s, w } = FREQ[wi];
  const R = gen(hash(seed, wi, 7));
  const data = Array.from({ length: 20 }, () => s + R(0, 5 * w - 1));
  data[3] = s + j * w;
  if (j < 4) data[11] = s + (j + 1) * w;
  if (j > 0) data[16] = s + j * w;
  return data;
};
const freqCount = (data: number[], lo: number, hi: number, upper: boolean, lower: boolean) => data.filter((v) => (lower ? v >= lo : v > lo) && (upper ? v <= hi : v < hi)).length;
const umean = ([x0, st, seed]: number[]) => {
  const R = gen(hash(x0, st, seed));
  const xs = [0, 1, 2, 3, 4].map((i) => x0 + i * st);
  const fs = xs.map(() => R(1, 12));
  const sf = fs.reduce((a, b) => a + b, 0);
  const sfx = xs.reduce((a, x, i) => a + x * fs[i], 0);
  return { xs, fs, sf, sfx };
};
const STK = ["9A", "9B"];
const stackAnswer = ([a1, b1, a2, b2]: number[]) => {
  const l = a1 * (a2 + b2);
  const r = a2 * (a1 + b1);
  return l > r ? 0 : l < r ? 1 : 2;
};
const SEG = ["walk", "come by bus", "cycle"];

// ---------------------------------------------------------------- grouped data helpers

const grouped = ([si, hi, seed]: number[]) => {
  const s = si * 10;
  const h = [5, 10, 20][hi];
  const R = gen(hash(si, hi, seed, 3));
  const fs = [0, 1, 2, 3, 4].map(() => R(2, 20));
  const lows = fs.map((_, i) => s + i * h);
  const n = fs.reduce((a, b) => a + b, 0);
  // twice the class marks are whole numbers
  const m2 = lows.map((l) => 2 * l + h);
  const sfm2 = fs.reduce((a, f, i) => a + f * m2[i], 0);
  return { s, h, fs, lows, n, sfm2, mean: sfm2 / (2 * n) };
};
const gtable = (g: ReturnType<typeof grouped>): Visual => ({ type: "table", head: ["Class interval", "Frequency"], rows: g.lows.map((l, i) => [`${l}–${l + g.h}`, g.fs[i]]) });
const medianOf = (g: ReturnType<typeof grouped>) => {
  let cf = 0;
  for (let k = 0; k < 5; k++) {
    if (2 * (cf + g.fs[k]) >= g.n) return { k, cf, l: g.lows[k], f: g.fs[k], value: g.lows[k] + ((g.n / 2 - cf) / g.fs[k]) * g.h };
    cf += g.fs[k];
  }
  throw new Error("no median class");
};
const modeOf = (g: ReturnType<typeof grouped>) => {
  const top = Math.max(...g.fs);
  const k = g.fs.indexOf(top);
  const [f0, f1, f2] = [g.fs[k - 1] ?? 0, top, g.fs[k + 1] ?? 0];
  return { k, f0, f1, f2, unique: g.fs.filter((f) => f === top).length === 1, l: g.lows[k], value: g.lows[k] + ((f1 - f0) / (2 * f1 - f0 - f2)) * g.h };
};

// ---------------------------------------------------------------- exact numbers a + b√2 + c√3 + d√6 over a denominator

type Q4 = { c: number[]; d: number };
const RAD = [1, 2, 3, 6];
const q4 = (c: number[], d = 1): Q4 => {
  if (d < 0) return q4(c.map((x) => -x), -d);
  const g = c.reduce((a, x) => gcd(a, x), d) || 1;
  return { c: c.map((x) => x / g), d: d / g };
};
const Qn = (a: number, d = 1) => q4([a, 0, 0, 0], d);
const Qr = (k: number, r: number, d = 1) => q4(RAD.map((x) => (x === r ? k : 0)), d);
const qadd = (x: Q4, y: Q4) => q4(x.c.map((v, i) => v * y.d + y.c[i] * x.d), x.d * y.d);
const qsub = (x: Q4, y: Q4) => qadd(x, q4(y.c.map((v) => -v), y.d));
const qmul = (x: Q4, y: Q4) => {
  const out = [0, 0, 0, 0];
  x.c.forEach((a, i) => y.c.forEach((b, j) => {
    if (!a || !b) return;
    const [k, m] = sqf(RAD[i] * RAD[j]);
    out[RAD.indexOf(m)] += a * b * k;
  }));
  return q4(out, x.d * y.d);
};
const qscale = (x: Q4, k: number, d = 1) => qmul(x, Qn(k, d));
const qval = (x: Q4) => x.c.reduce((a, v, i) => a + v * Math.sqrt(RAD[i]), 0) / x.d;
const qeq = (x: Q4, y: Q4) => qsub(x, y).c.every((v) => v === 0);
/** Written in the usual exact form: 3√2/4, (1 + √3)/2, 5(√3 + 1), 2 − √3. */
const qstr = (x: Q4): string => {
  const nz = x.c.map((v, i) => [v, i]).filter(([v]) => v !== 0);
  if (!nz.length) return "0";
  if (nz.length === 1) return surdStr(nz[0][0], x.d, RAD[nz[0][1]]);
  let g = nz.reduce((a, [v]) => gcd(a, v), 0);
  if (nz.every(([v]) => v < 0)) g = -g;
  const terms = nz.map(([v, i]) => [v / g, i]).sort((p, q) => (q[0] > 0 ? 1 : 0) - (p[0] > 0 ? 1 : 0) || p[1] - q[1]);
  const inner = terms
    .map(([v, i], k) => {
      const mag = Math.abs(v);
      const body = RAD[i] === 1 ? String(mag) : `${mag === 1 ? "" : mag}√${RAD[i]}`;
      return k === 0 ? (v < 0 ? `−${body}` : body) : `${v < 0 ? "−" : "+"} ${body}`;
    })
    .join(" ");
  const gg = gcd(Math.abs(g), x.d);
  const [n, e] = [Math.abs(g) / gg, x.d / gg];
  const sign = g < 0 ? "−" : "";
  if (n === 1 && e === 1) return `${sign}${inner}`;
  if (e === 1) return `${sign}${n}(${inner})`;
  if (n === 1) return `${sign}(${inner})/${e}`;
  return `${sign}${n}(${inner})/${e}`;
};
const ANG = [0, 30, 45, 60, 90];
const FN = ["sin", "cos", "tan"];
/** sin, cos, tan of 0°, 30°, 45°, 60°, 90° (null: undefined). */
const TRIG: (Q4 | null)[][] = [
  [Qn(0), Qn(1, 2), Qr(1, 2, 2), Qr(1, 3, 2), Qn(1)],
  [Qn(1), Qr(1, 3, 2), Qr(1, 2, 2), Qn(1, 2), Qn(0)],
  [Qn(0), Qr(1, 3, 3), Qn(1), Qr(1, 3), null],
];
const COT: (Q4 | null)[] = [null, Qr(1, 3), Qn(1), Qr(1, 3, 3), Qn(0)];
const rad = (deg: number) => (deg * Math.PI) / 180;
const trigNum = (f: number, deg: number) => [Math.sin, Math.cos, Math.tan][f](rad(deg));
const STDOP = ["+", "−", "×", "²+", "²−"];
const stdTerm = (f: number, t: number, sq: boolean) => `${FN[f]}${sq ? "²" : " "}${ANG[t]}°`;
const stdCombine = (a: Q4, b: Q4, op: number) => (op === 0 ? qadd(a, b) : op === 1 ? qsub(a, b) : op === 2 ? qmul(a, b) : op === 3 ? qadd(qmul(a, a), qmul(b, b)) : qsub(qmul(a, a), qmul(b, b)));
const stdValue = ([f1, t1, f2, t2, op]: number[]) => stdCombine(TRIG[f1][t1]!, TRIG[f2][t2]!, op);

// ---------------------------------------------------------------- heights and distances helpers

const HA = [30, 45, 60];
/** [n, den, r]: the value n√r/den of sin, cos, tan, cot, sec, cosec at 30°, 45°, 60°. */
const HV: Record<string, [number, number, number][]> = {
  sin: [[1, 2, 1], [1, 2, 2], [1, 2, 3]],
  cos: [[1, 2, 3], [1, 2, 2], [1, 2, 1]],
  tan: [[1, 3, 3], [1, 1, 1], [1, 1, 3]],
  cot: [[1, 1, 3], [1, 1, 1], [1, 3, 3]],
  sec: [[2, 3, 3], [1, 1, 2], [2, 1, 1]],
  cosec: [[2, 1, 1], [1, 1, 2], [2, 3, 3]],
};
const hv = (fn: string, i: number, d: number) => {
  const [n, den, r] = HV[fn][i];
  return surdStr(n * d, den, r);
};
const hnum = (fn: string, i: number) => {
  const x = rad(HA[i]);
  return ({ sin: Math.sin(x), cos: Math.cos(x), tan: Math.tan(x), cot: 1 / Math.tan(x), sec: 1 / Math.cos(x), cosec: 1 / Math.sin(x) } as Record<string, number>)[fn];
};
const HMODE = [
  { ans: "tan", bugs: [["sin", "sine-for-tan", "The sine was used. Sine is opposite ÷ hypotenuse, but here the height (opposite) and the distance on the ground (adjacent) are involved: that is tan."], ["cot", "ratio-upside-down", "The ratio was turned upside down: tan θ = height ÷ distance, so height = distance × tan θ."]] },
  { ans: "cot", bugs: [["tan", "multiplied-by-tan", "The height was multiplied by tan θ; since tan θ = height ÷ distance, the distance is height ÷ tan θ."], ["cosec", "line-of-sight", "The length of the line of sight (the hypotenuse) was found; the question asks for the distance along the ground."]] },
  { ans: "cosec", bugs: [["sec", "cos-for-sin", "The cosine was used. The height is opposite the angle and the string is the hypotenuse: that is sin θ."], ["sin", "multiplied-by-sin", "The height was multiplied by sin θ; since sin θ = height ÷ length, the length is height ÷ sin θ."], ["cot", "ground-distance", "The distance along the ground was found; the string is the hypotenuse."]] },
];
const TWO = [[0, 2], [0, 1], [1, 2]];
const T3 = (k: number) => [Qr(1, 3, 3), Qn(1), Qr(1, 3)][k];
const twoH = (pi: number, d: number) => [q4([0, 0, d, 0], 2), q4([d, 0, d, 0], 2), q4([3 * d, 0, d, 0], 2)][pi];
const twoX = (pi: number, d: number) => [Qn(d, 2), q4([d, 0, d, 0], 2), q4([d, 0, d, 0], 2)][pi];

// ---------------------------------------------------------------- ratio helpers

const RN = ["sin", "cos", "tan", "cosec", "sec", "cot"];
type Side = [number, number];
const ratioSides = (g: number, p: number, q: number): { opp: Side; adj: Side; hyp: Side } => {
  if (g === 2) return { opp: [p, 1], adj: [q, 1], hyp: sqf(p * p + q * q) };
  const third = sqf(q * q - p * p);
  return g === 0 ? { opp: [p, 1], adj: third, hyp: [q, 1] } : { opp: third, adj: [p, 1], hyp: [q, 1] };
};
const sideStr = ([k, m]: Side) => (m === 1 ? String(k) : `${k === 1 ? "" : k}√${m}`);
/** X ÷ Y for sides k√m (at most one of them a surd), rationalised. */
const sdiv = ([k1, m1]: Side, [k2, m2]: Side) => (m2 === 1 ? surdStr(k1, k2, m1) : m1 === 1 ? surdStr(k1, k2 * m2, m2) : surdStr(k1, k2 * m2, sqf(m1 * m2)[1]) /* not used */);
const ratioOf = (a: number, s: { opp: Side; adj: Side; hyp: Side }) => [sdiv(s.opp, s.hyp), sdiv(s.adj, s.hyp), sdiv(s.opp, s.adj), sdiv(s.hyp, s.opp), sdiv(s.hyp, s.adj), sdiv(s.adj, s.opp)][a];
const lead = (k: number, c: number) => `${k === 1 ? "" : k}A${c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}°`}`;

// ---------------------------------------------------------------- identity helpers

const tr = {
  s: Math.sin,
  c: Math.cos,
  t: Math.tan,
};
/** [shown, wrap with a coefficient in brackets, answer, the function, a wrong answer, why] */
const IDS: [string, boolean, string, (x: number) => number, string, string][] = [
  ["(1 − cos²θ) sec²θ", false, "tan²θ", (x) => (1 - tr.c(x) ** 2) / tr.c(x) ** 2, "cot²θ", "sec θ was taken as 1/sin θ; sec θ = 1/cos θ."],
  ["(1 + tan²θ) cos²θ", false, "1", (x) => (1 + tr.t(x) ** 2) * tr.c(x) ** 2, "cot²θ", "1 + tan²θ was taken as cosec²θ; the identity is 1 + tan²θ = sec²θ."],
  ["sin θ cot θ", false, "cos θ", (x) => tr.s(x) / tr.t(x), "sin θ tan θ", "cot θ was taken as sin θ/cos θ; cot θ = cos θ/sin θ."],
  ["cos θ tan θ", false, "sin θ", (x) => tr.c(x) * tr.t(x), "cos θ cot θ", "tan θ was taken as cos θ/sin θ; tan θ = sin θ/cos θ."],
  ["(sec²θ − 1) cos²θ", false, "sin²θ", (x) => (1 / tr.c(x) ** 2 - 1) * tr.c(x) ** 2, "0", "Only sec²θ was multiplied by cos²θ; the 1 must be multiplied by cos²θ too."],
  ["tan θ ÷ sec θ", false, "sin θ", (x) => tr.t(x) * tr.c(x), "sin θ tan θ", "sec θ was taken as 1/sin θ; sec θ = 1/cos θ."],
  ["cot θ ÷ cosec θ", false, "cos θ", (x) => tr.s(x) / tr.t(x), "cos θ cot θ", "cosec θ was taken as 1/cos θ; cosec θ = 1/sin θ."],
  ["(1 + cot²θ) sin²θ", false, "1", (x) => (1 + 1 / tr.t(x) ** 2) * tr.s(x) ** 2, "tan²θ", "1 + cot²θ was taken as sec²θ; the identity is 1 + cot²θ = cosec²θ."],
  ["(cosec²θ − 1) tan²θ", false, "1", (x) => (1 / tr.s(x) ** 2 - 1) * tr.t(x) ** 2, "tan²θ", "Only cosec²θ was multiplied by tan²θ; the 1 must be multiplied by tan²θ too."],
  ["sec θ − cos θ", true, "sin θ tan θ", (x) => 1 / tr.c(x) - tr.c(x), "tan θ", "1 − cos²θ was written as sin θ; it is sin²θ."],
  ["(1 − sin²θ) sec θ", false, "cos θ", (x) => (1 - tr.s(x) ** 2) / tr.c(x), "1", "1 − sin²θ was written as cos θ; it is cos²θ."],
  ["sec θ sin θ", false, "tan θ", (x) => tr.s(x) / tr.c(x), "1", "sec θ was taken as 1/sin θ; sec θ = 1/cos θ."],
  ["cosec θ tan θ", false, "sec θ", (x) => tr.t(x) / tr.s(x), "tan θ sec θ", "cosec θ was taken as 1/cos θ; cosec θ = 1/sin θ."],
  ["(sin θ + cos θ)² + (sin θ − cos θ)²", true, "2", (x) => (tr.s(x) + tr.c(x)) ** 2 + (tr.s(x) - tr.c(x)) ** 2, "2 + 4 sin θ cos θ", "(sin θ − cos θ)² was expanded with + 2 sin θ cos θ; (a − b)² = a² − 2ab + b²."],
  ["sin⁴θ − cos⁴θ", true, "sin²θ − cos²θ", (x) => tr.s(x) ** 4 - tr.c(x) ** 4, "1", "After factorising, sin²θ − cos²θ was taken as 1; it is sin²θ + cos²θ that equals 1."],
  ["(1 − cos θ)(1 + cos θ)", false, "sin²θ", (x) => (1 - tr.c(x)) * (1 + tr.c(x)), "cos²θ", "1 − cos²θ was taken as cos²θ; since sin²θ + cos²θ = 1, 1 − cos²θ = sin²θ."],
];
const scaleExpr = (m: number, e: string) => (m === 1 ? e : /^\d+$/.test(e) ? String(m * Number(e)) : / [+−] /.test(e) ? `${m}(${e})` : `${m} ${e}`);
/** anidsimp's four options: the simplified form, the identity slip's form, the form without the factor (when there is
 * one) and further simple forms, all different in value, in an order fixed by the parameters. */
const idsOptions = ([t, m]: number[]): string[] => {
  const xs = [0.4, 0.9, 1.3];
  const same = (a: string, b: string) => xs.every((x) => close(ev(a, { t: x }), ev(b, { t: x }), 1e-8));
  const out: string[] = [];
  const extra = ["sec θ", "cos²θ", "2", "cot θ", "sin θ cos θ", "tan θ", "cosec θ", "sin²θ", "1", "cos θ"];
  const k = hash(t, m, 7) % extra.length;
  const pool = [scaleExpr(m, IDS[t][2]), scaleExpr(m, IDS[t][4]), ...(m > 1 ? [IDS[t][2]] : []), ...[...extra.slice(k), ...extra.slice(0, k)].map((e) => scaleExpr(m, e))];
  for (const e of pool) if (out.length < 4 && !out.some((o) => same(o, e))) out.push(e);
  const r = hash(t, m) % 4;
  return [...out.slice(r), ...out.slice(0, r)];
};
const SECPT = [
  { given: "sec θ + tan θ", asks: ["sec θ − tan θ", "sec θ", "tan θ", "sin θ"] },
  { given: "cosec θ + cot θ", asks: ["cosec θ − cot θ", "cosec θ", "cot θ", "cos θ"] },
];
const secptAns = (p: number, q: number, ask: number) => [q / p, (p * p + q * q) / (2 * p * q), (p * p - q * q) / (2 * p * q), (p * p - q * q) / (p * p + q * q)][ask];

export const B14: Def[] = [
  // ============================================================== MATH.number.modular-arithmetic
  {
    id: "anmod",
    arity: 2,
    title: "The least non-negative residue modulo n",
    competency: MOD,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([N, n]) => (n < 3 || n > 13 || N < -80 || N > 250 || Math.abs(N) < n ? "A whole number from −80 to 250 (at least the modulus in size), modulo 3 to 13." : null),
    prompt: ([N, n]) => `Find the least non-negative integer r such that ${n_(N)} ≡ r (mod ${n}).`,
    solve: ([N, n]) => {
      const q = Math.floor(N / n);
      const r = N - q * n;
      return { steps: [step("quotient", "divide", N < 0 ? INT : DIVR, [N, n], q), step("residue", "subtract", MOD, [N, q * n], r)], answer: r };
    },
    // independent: step from the answer to N in jumps of n; it must land exactly
    validate: ([N, n], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= n) return false;
      let d = N - v;
      while (d > 0) d -= n;
      while (d < 0) d += n;
      return d === 0;
    },
    bugs: ([N, n]) => {
      const r = ((N % n) + n) % n;
      const q = Math.floor(N / n);
      const out: Bug[] = [];
      if (N < 0) {
        const a = Math.abs(N) % n;
        out.push({ id: "negative-remainder", kind: "conceptual", competency: MOD, says: `The remainder of ${-N} was given a minus sign. A residue must be one of 0, 1, …, ${n - 1}: add ${n} to a negative remainder.`, predict: a === 0 || -a === r ? null : -a });
        out.push({ id: "sign-ignored", kind: "conceptual", competency: INT, says: `The minus sign of ${n_(N)} was ignored. ${n_(N)} is ${-N} steps below 0, so count back from a multiple of ${n} below it.`, predict: a === r ? null : a });
      } else {
        out.push({ id: "quotient-given", kind: "procedural", competency: DIVR, says: `The quotient (${q}) was given; the congruence asks for the remainder.`, predict: q === r ? null : q });
        out.push({ id: "count-up", kind: "procedural", competency: MOD, says: `The gap up to the next multiple of ${n} was given; the residue is the gap down from the multiple below.`, predict: r === 0 || n - r === r ? null : n - r });
      }
      return out;
    },
    distractors: ([N, n]) => [((N % n) + n + 1) % n, ((N % n) + n + 2) % n],
    variants: () => [],
    explain: (s) => (s.id === "quotient" ? `The largest multiple of ${s.inputs[1]} not above ${n_(Number(s.inputs[0]))} is ${s.inputs[1]} × ${n_(Number(s.value))} = ${n_(Number(s.value) * Number(s.inputs[1]))}` : `${n_(Number(s.inputs[0]))} − (${n_(Number(s.inputs[1]))}) = ${s.value}, which is between 0 and the modulus`),
    domain: [[-80, 250], [3, 13]],
    keep: ([N, n]) => Math.abs(N) >= n && N % n !== 0,
    cap: 400,
    difficulty: ([N]) => (N < 0 ? 3 : N > 100 ? 2 : 1),
    word: ([N, n]) => `${n} posts stand in a circle, numbered 0 to ${n - 1} in order. ${nm(N)} starts at post 0 and walks ${Math.abs(N)} posts ${N < 0 ? "backwards (from 0 to " + (n - 1) + ", then " + (n - 2) + " …)" : "forwards (0, 1, 2 …)"}. At which post does ${nm(N)} stop?`,
    teach: {
      idea: "a ≡ r (mod n) means n divides a − r. Every integer is congruent to exactly one of 0, 1, …, n − 1 — its least non-negative residue.",
      method: "Find the largest multiple of n that is not more than the number (for a negative number this multiple is more negative), then subtract it.",
      visual: ([N, n]) => ({ type: "numberline", from: Math.min(0, Math.floor(N / n) * n), to: Math.max(N, n), marks: [Math.floor(N / n) * n, N] }),
      alternatives: [
        { id: "clock", title: "Wrap around a clock", kind: "conceptual", text: ["Think of a clock with n hours marked 0 to n − 1.", "Moving a steps from 0 lands on the residue: every full turn of n steps brings you back to 0, and going backwards is turning the other way."] },
        { id: "add-n", title: "Add or take away the modulus", kind: "procedural", text: ["Adding or subtracting n does not change the class: 17 ≡ 12 ≡ 7 ≡ 2 (mod 5).", "Keep adding n to a negative number until it lands between 0 and n − 1."] },
      ],
    },
    limits: "Integers from −80 to 250 that are not multiples of the modulus, moduli 3 to 13; powers and large exponents are left to the congruence families.",
  },
  {
    id: "ancong",
    arity: 3,
    title: "Solving a linear congruence ax ≡ b (mod n)",
    competency: MOD,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, n]) => (n < 5 || n > 13 || a < 2 || a >= n || b < 1 || b >= n || gcd(a, n) !== 1 ? "ax ≡ b (mod n) with 2 ≤ a < n, 1 ≤ b < n, a and n coprime, n from 5 to 13." : null),
    prompt: ([a, b, n]) => `Solve ${a}x ≡ ${b} (mod ${n}). Give the least non-negative solution x.`,
    solve: ([a, b, n]) => {
      let k = 0;
      while ((b + k * n) % a !== 0) k++;
      return { steps: [step("lift", "add", MOD, [b, k, n], b + k * n), step("divide", "divide", DIVR, [b + k * n, a], (b + k * n) / a)], answer: (b + k * n) / a };
    },
    // independent: substitute back — a × v leaves remainder b on division by n
    validate: ([a, b, n], v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < n && (a * v - b) % n === 0,
    bugs: ([a, b, n]) => {
      const x = (() => {
        for (let v = 0; v < n; v++) if ((a * v - b) % n === 0) return v;
        return -1;
      })();
      return [
        { id: "coefficient-dropped", kind: "procedural", competency: MOD, says: `The ${a} in front of x was left out; x must be the number that ${a} times leaves ${b}.`, predict: b === x ? null : b },
        { id: "multiplied", kind: "conceptual", competency: MOD, says: `${b} was multiplied by ${a} instead of undoing the multiplication by ${a}.`, predict: (a * b) % n === x ? null : (a * b) % n },
        { id: "subtracted", kind: "conceptual", competency: LIN, says: `${a} was taken away as if the congruence were x + ${a} ≡ ${b}; ${a}x means ${a} times x.`, predict: (((b - a) % n) + n) % n === x ? null : (((b - a) % n) + n) % n },
      ];
    },
    distractors: ([a, b, n]) => [(b + 1) % n, (b + n - 1) % n],
    variants: () => [],
    explain: (s) => (s.id === "lift" ? `Add ${s.inputs[2]} to ${s.inputs[0]} (${s.inputs[1]} times) until it divides by the coefficient: ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}, so x ≡ ${s.value}`),
    domain: [[2, 12], [1, 12], [5, 13]],
    keep: ([a, b, n]) => a < n && b < n && gcd(a, n) === 1,
    cap: 300,
    difficulty: ([a, b]) => (b % a === 0 ? 1 : a <= 3 ? 2 : 3),
    word: ([a, b, n]) => `Chocolates come in boxes of ${a}. ${nm(a + b)} buys some boxes and puts all the chocolates into bags of ${n}; ${b} ${b === 1 ? "chocolate is" : "chocolates are"} left over. What is the smallest number of boxes ${nm(a + b)} could have bought?`,
    teach: {
      idea: "ax ≡ b (mod n) asks for x so that a × x leaves remainder b. Since b, b + n, b + 2n … are all ≡ b, one of them divides exactly by a.",
      method: "Write b, b + n, b + 2n, … until one is a multiple of a; divide it by a. Check: a times your answer leaves remainder b.",
      alternatives: [
        { id: "table", title: "Try every residue", kind: "procedural", text: ["Only 0, 1, …, n − 1 need checking.", "Work out a × x for each and find the one whose remainder on division by n is b."] },
        { id: "inverse", title: "Multiply by an inverse", kind: "conceptual", text: ["Find c with a × c ≡ 1 (mod n) (for example 3 × 5 = 15 ≡ 1 mod 7).", "Multiply both sides by c: x ≡ c × b (mod n)."] },
      ],
    },
    limits: "One linear congruence with the coefficient coprime to a modulus from 5 to 13; systems and non-coprime cases are not included.",
  },
  {
    id: "anweek",
    arity: 2,
    title: "Day of the week after d days (modulo 7)",
    competency: MOD,
    type: "choice",
    parse: none,
    reject: ([s, d]) => (s < 0 || s > 6 || d < 10 || d > 400 || d % 7 === 0 ? "A start day and 10 to 400 days that are not a whole number of weeks." : null),
    prompt: ([s, d]) => `Today is ${DAYS[s]}. Which day of the week will it be ${d} days from today?`,
    choices: (p) => weekOpts(p).map((i) => DAYS[i]),
    solve: ([s, d]) => {
      const r = d % 7;
      return { steps: [step("residue", "divide", MOD, [d, 7], r), step("count-on", "add", MOD, [s, r], (s + r) % 7)], answer: weekOpts([s, d]).indexOf((s + d) % 7) };
    },
    // independent: walk through the calendar one day at a time
    validate: ([s, d], v) => {
      let day = s;
      for (let i = 0; i < d; i++) day = day === 6 ? 0 : day + 1;
      return typeof v === "number" && weekOpts([s, d])[v] === day;
    },
    bugs: ([s, d]) => {
      const o = weekOpts([s, d]);
      const c = (s + d) % 7;
      const w = weekWrong([s, d]);
      const at = (x: number) => (x === c ? null : o.indexOf(x));
      return [
        { id: "count-today", kind: "procedural", competency: MOD, says: "Today was counted as the first of the days; the first day from today is tomorrow.", predict: at(w.today) },
        { id: "weeks-not-days", kind: "conceptual", competency: DIVR, says: `The number of whole weeks (${Math.floor(d / 7)}) was counted on; whole weeks bring you back to the same day, so only the ${d % 7} extra days move the day on.`, predict: at(w.weeks) },
        { id: "counted-back", kind: "procedural", competency: MOD, says: "The days were counted backwards; days from today go forwards.", predict: at(w.back) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "residue" ? `${s.inputs[0]} = 7 × ${Math.floor(Number(s.inputs[0]) / 7)} + ${s.value}: the whole weeks change nothing` : `Count ${s.inputs[1]} days on from ${DAYS[Number(s.inputs[0])]}: ${DAYS[Number(s.value)]}`),
    domain: [[0, 6], [10, 400]],
    keep: ([, d]) => d % 7 !== 0,
    cap: 300,
    difficulty: ([, d]) => (d < 50 ? 1 : d < 200 ? 2 : 3),
    teach: {
      idea: "The days repeat every 7, so d days from today land on the same day as d mod 7 days from today.",
      method: "Divide d by 7 and keep the remainder. Count that many days forward from today (tomorrow is 1).",
      alternatives: [
        { id: "calendar", title: "Jump whole weeks on a calendar", kind: "conceptual", text: ["On a calendar, jumping 7 days moves straight down one row: same day of the week.", "Take away as many 7s as you can; only the leftover days move you across the row."] },
      ],
    },
    limits: "10 to 400 days forward from a named day, not whole weeks; the four options are the right day and the days the common slips give.",
  },
  // ============================================================== MATH.probability.classical
  {
    id: "anbag",
    arity: 4,
    title: "Probability of a colour drawn from a bag",
    competency: PROB,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([r, b, g, c]) => (r < 1 || r > 9 || b < 1 || b > 9 || g < 0 || g > 9 || c < 0 || c > 2 || [r, b, g][c] === 0 ? "Up to 9 balls of each of three colours; the colour asked about is in the bag." : null),
    prompt: ([r, b, g, c]) => `A bag has ${r} red, ${b} blue${g ? ` and ${g} green` : ""} balls, all of the same size. One ball is taken out without looking. What is the probability that it is ${COLOURS[c]}? Give a fraction.`,
    solve: ([r, b, g, c]) => {
      const k = [r, b, g][c];
      const T = r + b + g;
      return { steps: [step("total", "add", "MATH.number.addition", [r, b, g], T), step("favourable", "count", SS, [COLOURS[c]], k), step("probability", "divide", PROB, [k, T], k / T)], answer: k / T };
    },
    // independent: list every ball and count the ones of that colour
    validate: ([r, b, g, c], v) => {
      const balls: number[] = [];
      [r, b, g].forEach((n, i) => {
        for (let j = 0; j < n; j++) balls.push(i);
      });
      let hit = 0;
      for (const x of balls) if (x === c) hit++;
      return close(nv(v), hit / balls.length);
    },
    bugs: ([r, b, g, c]) => {
      const k = [r, b, g][c];
      const T = r + b + g;
      const colours = g ? 3 : 2;
      return [
        { id: "odds", kind: "conceptual", competency: PROB, says: `The ${COLOURS[c]} balls were compared with the other balls; a probability compares them with all ${T} balls.`, predict: k / (T - k) },
        { id: "colours-equally-likely", kind: "conceptual", competency: PROB, says: `Each colour was taken as equally likely; the colours have different numbers of balls, and it is the balls that are equally likely.`, predict: close(1 / colours, k / T) ? null : 1 / colours },
        { id: "count-not-probability", kind: "procedural", competency: PROB, says: `The number of ${COLOURS[c]} balls was given; a probability is that number out of the total.`, predict: k },
      ];
    },
    distractors: ([r, b, g, c]) => {
      const k = [r, b, g][c];
      const T = r + b + g;
      return [(k + 1) / (T + 1), 1 - k / T].filter((x) => !close(x, k / T));
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `All the balls: ${s.inputs.filter((x) => x !== 0).join(" + ")} = ${s.value}` : s.id === "favourable" ? `${s.value} of them are ${s.inputs[0]}` : `P = ${s.inputs[0]}/${s.inputs[1]}`),
    domain: [[1, 9], [1, 9], [0, 9], [0, 2]],
    keep: ([r, b, g, c]) => [r, b, g][c] > 0,
    cap: 400,
    difficulty: ([, , g]) => (g === 0 ? 1 : g < 5 ? 2 : 3),
    word: ([r, b, g, c]) => {
      const fl = ["mango", "orange", "lemon"];
      return `A box has ${r} mango, ${b} orange${g ? ` and ${g} lemon` : ""} toffees, all wrapped alike. ${nm(r + b + g)} picks one without looking. What is the probability that it is a ${fl[c]} toffee?`;
    },
    teach: {
      idea: "When every outcome is equally likely, P(event) = (number of outcomes in the event) ÷ (total number of outcomes).",
      method: "Count all the balls, count the balls of the asked colour, and write the second over the first.",
      visual: ([r, b, g]) => ({ type: "bars", title: "balls in the bag", labels: g ? ["red", "blue", "green"] : ["red", "blue"], values: g ? [r, b, g] : [r, b] }),
      alternatives: [
        { id: "out-of", title: "Out of how many?", kind: "conceptual", text: ["Imagine numbering every ball. Each number is as likely as any other.", "The probability is how many of the numbers belong to the colour, out of how many numbers there are."] },
      ],
    },
    limits: "One draw from a bag of up to three colours with up to 9 balls each; several draws are the tree-diagram family.",
  },
  {
    id: "ancardn",
    arity: 3,
    title: "Probability with numbered cards",
    competency: PROB,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([N, e, k]) => {
      if (N < 10 || N > 60 || e < 0 || e > 3) return "Cards 1 to N (10 ≤ N ≤ 60) and one of four kinds of event.";
      if ((e === 1 || e === 2) && k !== 0) return "Primes and squares take no second number.";
      if ((e === 0 || e === 3) && (k < 2 || k > 9 || 2 * k > N)) return "A multiple of 2 to 9.";
      return null;
    },
    prompt: ([N, e, k]) => `Cards numbered 1 to ${N} are shuffled, and one card is drawn at random. What is the probability that the number on it is ${CARDEV[e]}${e === 0 || e === 3 ? ` ${k}` : ""}?`,
    solve: ([N, e, k]) => {
      const c = cardCount(N, e, k);
      return { steps: [step("favourable", "count", e === 1 ? "MATH.number.primes" : PROB, [N, e, k], c), step("probability", "divide", PROB, [c, N], c / N)], answer: c / N };
    },
    // independent: test each card from 1 to N
    validate: ([N, e, k], v) => {
      let c = 0;
      for (let i = 1; i <= N; i++) {
        let hit: boolean;
        if (e === 0 || e === 3) {
          let x = i;
          while (x > 0) x -= k;
          hit = (x === 0) === (e === 0);
        } else if (e === 1) {
          hit = i > 1;
          for (let d = 2; d < i; d++) if (i % d === 0) hit = false;
        } else {
          hit = false;
          for (let r = 1; r * r <= i; r++) if (r * r === i) hit = true;
        }
        if (hit) c++;
      }
      return close(nv(v), c / N);
    },
    bugs: ([N, e, k]) => {
      const c = cardCount(N, e, k);
      const out: Bug[] = [];
      if (e === 0) out.push({ id: "one-in-k", kind: "conceptual", competency: PROB, says: `"One card in every ${k}" was used, but ${N} is not a multiple of ${k}; count the multiples of ${k} up to ${N}.`, predict: N % k ? 1 / k : null });
      if (e === 3) out.push({ id: "one-in-k", kind: "conceptual", competency: PROB, says: `"One card in every ${k} is a multiple" was used, but ${N} is not a multiple of ${k}; count the multiples of ${k} up to ${N} first.`, predict: N % k ? 1 - 1 / k : null });
      if (e === 1) out.push({ id: "one-is-prime", kind: "recall", competency: "MATH.number.primes", says: "1 was counted as a prime number; a prime has exactly two factors, and 1 has only one.", predict: (c + 1) / N });
      if (e === 2) out.push({ id: "one-not-square", kind: "recall", competency: PROB, says: "1 was left out; 1 = 1 × 1 is a perfect square.", predict: (c - 1) / N });
      out.push({ id: "complement-counted", kind: "procedural", competency: PROB, says: "The cards WITHOUT the property were counted; count the cards the question asks about.", predict: close((N - c) / N, c / N) ? null : (N - c) / N });
      return out;
    },
    distractors: ([N, e, k]) => {
      const c = cardCount(N, e, k);
      return [c / (N - 1), (c + 1) / N].filter((x) => !close(x, c / N));
    },
    variants: () => [],
    explain: (s) => (s.id === "favourable" ? `${s.value} of the cards 1 to ${s.inputs[0]} have that property` : `P = ${s.inputs[0]}/${s.inputs[1]}`),
    domain: [[10, 60], [0, 3], [0, 9]],
    keep: ([N, e, k]) => (e === 1 || e === 2 ? k === 0 : k >= 2 && 2 * k <= N),
    cap: 400,
    difficulty: ([N, e]) => (e === 0 && N <= 30 ? 1 : e === 1 ? 3 : 2),
    word: ([N, e, k]) => `At the school fair, raffle tickets numbered 1 to ${N} are put in a box, and ${nm(N + e)} draws one without looking. A prize is given if the number is ${CARDEV[e]}${e === 0 || e === 3 ? ` ${k}` : ""}. What is the probability of winning a prize?`,
    teach: {
      idea: "Each card is equally likely, so the probability is the number of cards with the property divided by the number of cards.",
      method: "List or count the numbers from 1 to N that have the property (multiples: divide N by k and drop the remainder), then divide by N.",
      alternatives: [
        { id: "list", title: "Write the list", kind: "procedural", text: ["Write the numbers that work: for multiples of 4 up to 30 that is 4, 8, 12, 16, 20, 24, 28 — seven cards.", "Then P = 7/30."] },
      ],
    },
    limits: "Cards 1 to 60 with multiples, non-multiples, primes or perfect squares; events joined by 'or' are the addition-rule family.",
  },
  {
    id: "andice",
    arity: 2,
    title: "Probability with two dice",
    competency: PROB,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([k, s]) => {
      if (k < 0 || k > 8 || !DICE[k].ok(s)) return "An event on the 36 outcomes of two dice from the list of kinds.";
      const c = diceCount(k, s);
      return c === 0 || c === 36 ? "The event must be possible but not certain." : null;
    },
    prompt: ([k, s]) => `Two fair dice are thrown at the same time. What is the probability that ${DICE[k].say(s)}? Give a fraction.`,
    solve: ([k, s]) => {
      const c = diceCount(k, s);
      return { steps: [step("outcomes", "multiply", SS, [6, 6], 36), step("favourable", "count", SS, [k, s], c), step("probability", "divide", PROB, [c, 36], c / 36)], answer: c / 36 };
    },
    // independent: list all 36 ordered pairs and count
    validate: ([k, s], v) => {
      const pairs: [number, number][] = [];
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) pairs.push([a, b]);
      return close(nv(v), pairs.filter(([a, b]) => DICE[k].test(a, b, s)).length / pairs.length);
    },
    bugs: ([k, s]) => {
      const c = diceCount(k, s);
      const u = diceUnordered(k, s);
      const out: Bug[] = [{ id: "order-ignored", kind: "conceptual", competency: SS, says: "(1, 2) and (2, 1) were counted as one outcome; the two dice are different, so they are two of the 36 outcomes.", predict: u === c ? null : u / 36 }];
      if (k === 0) out.push({ id: "sums-equally-likely", kind: "conceptual", competency: PROB, says: "The 11 sums 2 to 12 were taken as equally likely; a sum like 7 can happen in more ways than 2 or 12.", predict: close(1 / 11, c / 36) ? null : 1 / 11 });
      if (k === 6) out.push({ id: "double-counted", kind: "procedural", competency: SS, says: `(${s}, ${s}) was counted twice, once for each die; it is one outcome.`, predict: 12 / 36 });
      if (k === 7) out.push({ id: "one-die-only", kind: "conceptual", competency: TREE, says: "Only one die was considered; both dice must show a number above it.", predict: (6 - s) / 6 });
      if (k !== 6 && k !== 7 && c <= 12 && c / 12 !== c / 36) out.push({ id: "twelve-outcomes", kind: "conceptual", competency: SS, says: "6 + 6 = 12 outcomes were used; each of the 6 numbers on one die goes with each of the 6 on the other, so there are 6 × 6 = 36.", predict: c / 12 });
      return out;
    },
    distractors: ([k, s]) => {
      const c = diceCount(k, s);
      return [(c + 1) / 36, (c - 1) / 36, (36 - c) / 36].filter((x) => x > 0 && !close(x, c / 36));
    },
    variants: () => [],
    explain: (s) => (s.id === "outcomes" ? "Each of the 6 numbers on the first die goes with each of the 6 on the second: 6 × 6 = 36 equally likely outcomes" : s.id === "favourable" ? `${s.value} of the 36 pairs fit` : `P = ${s.inputs[0]}/36`),
    domain: [[0, 8], [0, 36]],
    keep: ([k, s]) => DICE[k].ok(s) && diceCount(k, s) > 0 && diceCount(k, s) < 36,
    difficulty: ([k]) => (k === 0 || k === 4 ? 1 : k === 6 || k === 7 ? 3 : 2),
    word: ([k, s]) => `In a board game, ${nm(k + s)} throws two dice together. What is the probability that ${DICE[k].say(s)}?`,
    teach: {
      idea: "Two dice give 6 × 6 = 36 equally likely ordered pairs (first die, second die); (2, 5) and (5, 2) are different outcomes.",
      method: "Draw the 6 × 6 grid of pairs, mark the pairs in the event, count them and divide by 36.",
      visual: () => ({ type: "grid", rows: 6, cols: 6 }),
      alternatives: [
        { id: "row-by-row", title: "Count row by row", kind: "procedural", text: ["Fix the first die at 1, 2, …, 6 in turn.", "For each, count how many numbers on the second die work, and add the six counts."] },
      ],
    },
    limits: "Events on two ordinary dice (sums, products, differences, 'at least one', 'both'); dice with other faces are not included.",
  },
  // ============================================================== MATH.probability.tree-diagrams
  {
    id: "antree",
    arity: 4,
    title: "Two counters drawn one after the other",
    competency: TREE,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([r, b, w, e]) => {
      if (r < 1 || r > 8 || b < 1 || b > 8 || (w !== 0 && w !== 1) || e < 0 || e > 3 || r + b < 3) return "Up to 8 red and 8 blue counters (at least 3 in all), with or without replacement, one of four events.";
      return w === 0 && e === 0 && r < 2 ? "Two reds cannot be drawn without replacement from one red counter." : null;
    },
    prompt: ([r, b, w, e]) => `A bag has ${r} red and ${b} blue counters. Two counters are taken out one after the other, ${w ? "putting the first one back before the second is taken" : "without putting the first one back"}. What is the probability that ${TREEEV[e]}? Give a fraction.`,
    solve: ([r, b, w, e]) => {
      const T = r + b;
      const second = w ? T : T - 1;
      const p = treeP(r, b, w, e);
      return { steps: [step("first", "divide", PROB, [r, T], r / T), step("second", "divide", TREE, [w ? r : r - 1, second], (w ? r : r - 1) / second), step("branches", "multiply", FPROD, [e], p)], answer: p };
    },
    // independent: list every ordered pair of counters and count
    validate: ([r, b, w, e], v) => {
      const T = r + b;
      let all = 0;
      let hit = 0;
      for (let i = 0; i < T; i++) for (let j = 0; j < T; j++) {
        if (!w && i === j) continue;
        all++;
        const ri = i < r;
        const rj = j < r;
        if ([ri && rj, ri === rj, ri !== rj, ri || rj][e]) hit++;
      }
      return close(nv(v), hit / all);
    },
    bugs: ([r, b, w, e]) => {
      const T = r + b;
      const p = treeP(r, b, w, e);
      const out: Bug[] = [];
      if (!w) out.push({ id: "as-if-replaced", kind: "conceptual", competency: TREE, says: "The second draw was worked out as if the first counter had been put back; without replacement there is one counter fewer, and one fewer of the colour already drawn.", predict: close(treeP(r, b, 1, e), p) ? null : treeP(r, b, 1, e) });
      if (e === 0) out.push({ id: "added-branches", kind: "conceptual", competency: FPROD, says: "The two probabilities along the path were added; 'this and then that' multiplies along the branches.", predict: r / T + (w ? r : r - 1) / (w ? T : T - 1) });
      if (e === 1) out.push({ id: "one-colour-only", kind: "procedural", competency: TREE, says: "Only 'both red' was counted; 'both blue' is also the same colour.", predict: treeP(r, b, w, 0) });
      if (e === 2) out.push({ id: "one-order-only", kind: "procedural", competency: TREE, says: "Only red-then-blue was counted; blue-then-red also gives one of each.", predict: treeP(r, b, w, 2) / 2 });
      if (e === 3) out.push({ id: "exactly-one", kind: "conceptual", competency: COMP, says: "'Exactly one red' was found; 'at least one' also includes two reds.", predict: treeP(r, b, w, 2) });
      return out.filter((x) => x.predict === null || !close(x.predict as number, p));
    },
    distractors: ([r, b, w, e]) => {
      const p = treeP(r, b, w, e);
      return [1 - p, treeP(r, b, w, (e + 1) % 4)].filter((x) => x > 0 && !close(x, p));
    },
    variants: () => [],
    explain: (s) => (s.id === "first" ? `First draw: P(red) = ${s.inputs[0]}/${s.inputs[1]}` : s.id === "second" ? `Second draw, after a red: P(red) = ${s.inputs[0]}/${s.inputs[1]}` : "Multiply along each path of the tree and add the paths that give the event"),
    domain: [[1, 8], [1, 8], [0, 1], [0, 3]],
    keep: ([r, b, w, e]) => r + b >= 3 && !(w === 0 && e === 0 && r < 2),
    cap: 400,
    difficulty: ([, , w, e]) => (w === 1 && e === 0 ? 1 : e === 0 || e === 3 ? 2 : 3),
    word: ([r, b, w, e]) => {
      const say = ["both are mango sweets", "both are the same flavour", "one is mango and the other is orange", "at least one is a mango sweet"][e];
      return `A jar has ${r} mango and ${b} orange sweets, wrapped alike. ${nm(r * b + e)} takes one sweet, ${w ? "puts it back" : "keeps it"}, and then takes a second one without looking. What is the probability that ${say}?`;
    },
    teach: {
      idea: "In a tree diagram each branch carries a probability; along a path the probabilities multiply, and different paths that give the same event add.",
      method: "Draw the first draw (red or blue), then the second draw from each branch — with one counter fewer if the first is not put back. Multiply along each path you need and add those paths.",
      alternatives: [
        { id: "table", title: "A table of ordered pairs", kind: "procedural", text: ["Number the counters and make a table: first counter down the side, second across the top.", "Without replacement cross out the diagonal (the same counter twice). Count the cells in the event over all the cells left."] },
      ],
    },
    limits: "Two draws from two colours, with or without replacement; three or more stages are not included.",
  },
  // ============================================================== MATH.probability.complements
  {
    id: "ancomp",
    contract: { kind: "typed", typed: ([m, a, c, d]) => (m === 0 ? b1Object("probability", "complement", { pa: `${a}/${d}` }) : null) },
    arity: 4,
    title: "Complementary and exhaustive events",
    competency: COMP,
    type: "fraction",
    mc: true,
    parse: none,
    // [m, a, c, d]: m = 0: P(E) = a/d, find P(not E) (c = 0); m = 1: P(win) = a/d, P(draw) = c/d, find P(lose)
    reject: ([m, a, c, d]) => {
      if (d < 3 || d > 20 || a < 1 || (m !== 0 && m !== 1)) return "Probabilities in twentieths or coarser.";
      if (m === 0) return c !== 0 || a >= d || gcd(a, d) !== 1 ? "P(E) = a/d in lowest terms." : null;
      return c < 1 || a + c >= d ? "Two outcomes whose probabilities add to less than 1." : gcd(gcd(a, c), d) !== 1 ? "a, c and d with no common factor (a common factor shows the same fractions as a smaller d)." : null;
    },
    prompt: ([m, a, c, d]) =>
      m === 0
        ? `The probability of an event E is ${probText(a, d)}. What is the probability of 'not E'?`
        : `A match can end in a win, a draw or a loss. The probability of a win is ${probText(a, d)} and the probability of a draw is ${probText(c, d)}. What is the probability of a loss?`,
    solve: ([m, a, c, d]) => {
      const ans = (d - a - c) / d;
      return m === 0
        ? { steps: [step("complement", "subtract", COMP, ["1", probText(a, d)], ans)], answer: ans }
        : { steps: [step("known", "add", "MATH.number.addition", [probText(a, d), probText(c, d)], (a + c) / d), step("complement", "subtract", COMP, ["1", probText(a + c, d)], ans)], answer: ans };
    },
    // independent: d equally likely tickets; mark a as E (and c as draw); count the unmarked ones
    validate: ([, a, c, d], v) => {
      const marks = new Array(d).fill(0);
      for (let i = 0; i < a + c; i++) marks[i] = 1;
      return close(nv(v), marks.filter((x) => x === 0).length / d);
    },
    bugs: ([m, a, c, d]) => {
      const ans = (d - a - c) / d;
      const out: Bug[] = [
        { id: "reciprocal", kind: "conceptual", competency: COMP, says: "The fraction was turned upside down; 'not E' is what is left when E is taken from the sure event: 1 − P(E).", predict: d / (a + c) },
        { id: "rest-over-event", kind: "conceptual", competency: PROB, says: "The outcomes against E were compared with the outcomes for E; a probability is always out of all the outcomes.", predict: close((d - a - c) / (a + c), ans) ? null : (d - a - c) / (a + c) },
      ];
      if (m === 1) out.push({ id: "one-subtracted", kind: "procedural", competency: COMP, says: "Only the win was taken from 1; the draw must be taken away too, since win, draw and loss together make 1.", predict: (d - a) / d });
      return out;
    },
    distractors: ([, a, c, d]) => [(a + c) / d, (d - a - c + 1) / d].filter((x) => !close(x, (d - a - c) / d)),
    variants: () => [],
    explain: (s) => (s.id === "known" ? `${s.inputs[0]} + ${s.inputs[1]} = ${fmt(Number(s.value))}` : `P(the rest) = 1 − ${s.inputs[1]}: the probabilities of all the outcomes add up to 1`),
    domain: [[0, 1], [1, 19], [0, 19], [3, 20]],
    keep: ([m, a, c, d]) => (m === 0 ? c === 0 && a < d && gcd(a, d) === 1 : c >= 1 && a + c < d && gcd(gcd(a, c), d) === 1),
    cap: 300,
    difficulty: ([m, a, c, d]) => (m === 0 ? (d <= 10 ? 1 : 2) : gcd(a, d) === 1 && gcd(c, d) === 1 ? 2 : 3),
    word: ([m, a, c, d]) =>
      m === 0
        ? `The probability that a bulb picked from a box is faulty is ${probText(a, d)}. What is the probability that a bulb picked from the box is not faulty?`
        : `${nm(a + c)} plays a game of chess that can be won, drawn or lost. The chance of winning is ${probText(a, d)} and of drawing is ${probText(c, d)}. What is the probability of losing?`,
    teach: {
      idea: "The outcomes of an experiment together form the sure event, with probability 1. So P(E) + P(not E) = 1, and the probabilities of outcomes that cannot happen together and cover everything add to 1.",
      method: "Add the probabilities you know (with a common denominator) and take the sum from 1.",
      alternatives: [
        { id: "tickets", title: "Think of tickets", kind: "conceptual", text: ["Write the probabilities with one denominator, say 20: imagine 20 equally likely tickets.", "The event takes some tickets; the rest of the tickets are 'not E'."] },
      ],
    },
    limits: "One event and its complement, or three outcomes that cannot happen together and cover everything; denominators up to 20.",
  },
  {
    id: "anunion",
    contract: { kind: "typed", typed: ([x, y, z, d]) => b1Object("probability", "union", { pa: `${x}/${d}`, pb: `${y}/${d}`, pab: `${z}/${d}` }) },
    arity: 4,
    title: "The addition rule P(A or B)",
    competency: COMP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([x, y, z, d]) => (d < 6 || d > 20 || x < 1 || y < 1 || z < 1 || z >= Math.min(x, y) || x + y - z > d ? "P(A) = x/d, P(B) = y/d, P(A and B) = z/d with the overlap smaller than each and the union at most 1." : unionDup([x, y, z, d]) ? "The same fractions as a smaller denominator d (a common factor of x, y, z and d)." : null),
    prompt: ([x, y, z, d]) => `For two events A and B, P(A) = ${probText(x, d)}, P(B) = ${probText(y, d)} and P(A and B) = ${probText(z, d)}. Find P(A or B).`,
    solve: ([x, y, z, d]) => ({ steps: [step("add", "add", "MATH.number.addition", [probText(x, d), probText(y, d)], (x + y) / d), step("overlap", "subtract", COMP, [probText(x + y, d), probText(z, d)], (x + y - z) / d)], answer: (x + y - z) / d }),
    // independent: d equally likely outcomes; A the first x, B overlapping it in exactly z; count the union
    validate: ([x, y, z, d], v) => {
      let c = 0;
      for (let i = 0; i < d; i++) if (i < x || (i >= x - z && i < x - z + y)) c++;
      return close(nv(v), c / d);
    },
    bugs: ([x, y, z, d]) => [
      { id: "overlap-not-taken", kind: "conceptual", competency: COMP, says: "P(A) and P(B) were added without taking away P(A and B); the outcomes in both were counted twice.", predict: (x + y) / d },
      { id: "overlap-twice", kind: "procedural", competency: COMP, says: "P(A and B) was taken away twice; that gives 'exactly one of A, B'. Take it away once.", predict: (x + y - 2 * z) / d },
      { id: "and-for-or", kind: "conceptual", competency: COMP, says: "'A or B' was read as 'A and B'; 'or' means at least one of them happens.", predict: z / d },
    ],
    distractors: ([x, y, z, d]) => [(x + y + z) / d, 1 - (x + y - z) / d].filter((t) => t > 0 && t <= 1 && !close(t, (x + y - z) / d)),
    variants: () => [],
    explain: (s) => (s.id === "add" ? `P(A) + P(B) = ${s.inputs[0]} + ${s.inputs[1]}` : `Take away P(A and B) once, because it was counted in both: ${s.inputs[1]}`),
    domain: [[1, 20], [1, 20], [1, 10], [6, 20]],
    keep: ([x, y, z, d]) => z < Math.min(x, y) && x + y - z <= d && !unionDup([x, y, z, d]),
    cap: 300,
    difficulty: ([x, y, z, d]) => (gcd(x, d) === 1 && gcd(y, d) === 1 ? 2 : d <= 10 ? 1 : 3),
    word: ([x, y, z, d]) => `In a school, the probability that a student chosen at random plays cricket is ${probText(x, d)}, plays kabaddi is ${probText(y, d)}, and plays both is ${probText(z, d)}. What is the probability that the student plays at least one of the two games?`,
    teach: {
      idea: "P(A) + P(B) counts the outcomes in both A and B twice, so P(A or B) = P(A) + P(B) − P(A and B).",
      method: "Add P(A) and P(B) with a common denominator, then take away P(A and B) once.",
      visual: ([x, y, z, d]) => ({ type: "table", head: ["", "in B", "not in B"], rows: [["in A", probText(z, d), probText(x - z, d)], ["not in A", probText(y - z, d), probText(d - x - y + z, d)]] }),
      alternatives: [
        { id: "venn", title: "Fill a Venn diagram", kind: "conceptual", text: ["Put P(A and B) in the overlap first.", "Then 'A only' = P(A) − overlap and 'B only' = P(B) − overlap. P(A or B) is the three regions added."] },
      ],
    },
    limits: "Two events with given probabilities (denominators up to 20) that overlap; the overlap is always given.",
  },
  {
    id: "anvalid",
    arity: 4,
    title: "Which number cannot be a probability",
    competency: COMP,
    type: "choice",
    parse: none,
    reject: ([a, b, dd, t]) => (a < 1 || b > 9 || a >= b || dd < 1 || dd > 99 || dd % 10 === 0 || t < 0 || t > 5 || Math.abs(dd / 100 - a / b) < 1e-9 ? "A proper fraction, a two-place decimal, 0 or 1, and one impossible value." : null),
    prompt: () => "Which of these numbers cannot be the probability of an event?",
    choices: (p) => validOpts(p),
    solve: (p) => {
      const o = validOpts(p);
      const i = o.findIndex((s) => optVal(s) < 0 || optVal(s) > 1);
      return { steps: [step("range", "compare", COMP, o, i)], answer: i };
    },
    // independent: every probability is a count of outcomes over the total, so it lies from 0 to 1: test each option
    validate: (p, v) => {
      const o = validOpts(p);
      if (typeof v !== "number" || !o[v]) return false;
      const bad = o.map((s) => {
        const x = optVal(s);
        return !(x >= 0 && x * 1000 <= 1000);
      });
      return bad[v] && bad.filter(Boolean).length === 1;
    },
    bugs: (p) => {
      const o = validOpts(p);
      return [
        ...(o.includes("0") ? [{ id: "zero-not-allowed", kind: "conceptual", competency: COMP, says: "0 was thought impossible as a probability; an impossible event has probability 0.", predict: o.indexOf("0") } as Bug] : []),
        ...(o.includes("1") ? [{ id: "one-not-allowed", kind: "conceptual", competency: COMP, says: "1 was thought impossible as a probability; an event that is sure to happen has probability 1.", predict: o.indexOf("1") } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => `A probability is between 0 and 1 (0 and 1 included): ${s.inputs[Number(s.value)]} is outside`,
    domain: [[1, 8], [2, 9], [1, 99], [0, 5]],
    keep: ([a, b, dd]) => a < b && dd % 10 !== 0 && Math.abs(dd / 100 - a / b) > 1e-9,
    cap: 200,
    difficulty: ([, , , t]) => (t < 2 ? 1 : t < 4 ? 2 : 3),
    teach: {
      idea: "A probability is (favourable outcomes) ÷ (all outcomes), and the favourable outcomes are some of all the outcomes. So it is never negative and never more than 1; 0 means impossible and 1 means sure.",
      method: "Check each number: is it at least 0 and at most 1? A fraction whose top is bigger than its bottom is more than 1.",
      alternatives: [
        { id: "line", title: "The probability line", kind: "conceptual", text: ["Draw a line from 0 (impossible) to 1 (sure), with 1/2 (even chance) in the middle.", "Every probability has a place on this line; a number off the line cannot be one."], visual: () => ({ type: "numberline", from: 0, to: 1, step: 0.25 }) },
      ],
    },
    limits: "Four numbers (fraction, decimal, 0 or 1, and one negative or greater-than-one value); percentages are not used.",
  },
  // ============================================================== MATH.reasoning.mathematical-argument
  {
    id: "anpts",
    arity: 5,
    title: "Deciding the shape of three points from their distances",
    competency: ARG,
    skill: "coordinate argument",
    type: "choice",
    parse: none,
    reject: (p) => {
      const [t, x0, y0, a, b] = p;
      if (t < 0 || t > 3 || Math.abs(x0) > 4 || Math.abs(y0) > 4 || a < 1 || a > 4 || Math.abs(b) > 3) return "Three lattice points built from a start point and one step.";
      return ptsByVectors(ptsOf(p)) !== t ? "These points do not have the intended shape." : null;
    },
    prompt: (p) => {
      const [P, Q, R] = ptsOf(p);
      return `The points P${pt(P)}, Q${pt(Q)} and R${pt(R)} are given. Work out PQ, QR and PR with the distance formula and decide which statement is true.`;
    },
    word: (p) => {
      const [P, Q, R] = ptsOf(p);
      return `On a village map drawn on a square grid (1 unit = 1 km), the school is at P${pt(P)}, the temple at Q${pt(Q)} and the water tank at R${pt(R)}. ${nm(p[1] + p[2] + p[3])} wants to know how these three places are placed with respect to one another, using only the straight-line distances PQ, QR and PR between them. Which statement about the three places is true?`;
    },
    choices: () => PTS,
    solve: (p) => {
      const pts = ptsOf(p);
      const [x, y, z] = [d2(pts[0], pts[1]), d2(pts[1], pts[2]), d2(pts[0], pts[2])];
      return { steps: [step("distances", "measure", PYTH, [`PQ² = ${x}`, `QR² = ${y}`, `PR² = ${z}`], [x, y, z].join(", ")), step("decide", "compare", ARG, [x, y, z], ptsByDistance(pts))], answer: ptsByDistance(pts) };
    },
    // independent: vectors — a zero cross product means one line, a zero dot product a right angle
    validate: (p, v) => v === ptsByVectors(ptsOf(p)),
    bugs: ([t]) =>
      t === 0
        ? [{ id: "squares-added", kind: "conceptual", competency: ARG, says: "The squares of the distances were added, as for a right angle. For points on one line the distances themselves add up: the two shorter ones make the longest.", predict: 3 }]
        : t === 1
          ? [{ id: "equal-sides-only", kind: "procedural", competency: PYTH, says: "Only equal sides were looked for. Also test Pythagoras: do the squares of the two shorter sides add up to the square of the longest?", predict: 3 }]
          : t === 2
            ? [{ id: "right-angle-only", kind: "procedural", competency: ARG, says: "Only a right angle was tested. Also compare the three lengths: two equal sides make the triangle isosceles.", predict: 3 }]
            : [],
    variants: () => [],
    explain: (s) => (s.id === "distances" ? `${s.inputs.join(", ")}` : `So: ${PTS[Number(s.value)].toLowerCase()}`),
    domain: [[0, 3], [-4, 4], [-4, 4], [1, 4], [-3, 3]],
    keep: (p) => ptsByVectors(ptsOf(p)) === p[0],
    cap: 300,
    difficulty: ([t]) => (t === 0 ? 2 : t === 3 ? 3 : 2),
    teach: {
      idea: "Distances decide the shape: if the two shorter distances add up to the longest, the points are on one line; if their squares add up to the square of the longest, there is a right angle (Pythagoras' converse); two equal distances make an isosceles triangle.",
      method: "Find PQ², QR² and PR² with (x₂ − x₁)² + (y₂ − y₁)². Test the line first, then the right angle, then equal sides — and state which test decided it.",
      visual: (p) => ({ type: "plane", points: ptsOf(p).map(([x, y], i) => [x, y, "PQR"[i]]), range: 16 }),
      alternatives: [
        { id: "slopes", title: "Compare slopes", kind: "conceptual", text: ["Points are on one line when the slope from P to Q equals the slope from Q to R.", "Two sides are perpendicular when the product of their slopes is −1 (or one is horizontal and the other vertical)."] },
      ],
    },
    limits: "Lattice points built to be on a line, right-angled (not isosceles), isosceles (not right-angled) or neither: an argument that must first rule out a straight line (altri classifies true triangles, including right-and-isosceles, for the distance formula itself); the written justification is marked by an educator, the conclusion here.",
  },
  {
    id: "angarr",
    arity: 4,
    title: "The largest product from four digits",
    competency: ARG,
    skill: "justify an arrangement",
    type: "integer",
    mc: true,
    parse: none,
    reject: ([p, q, r, s]) => (!(p <= 9 && p > q && q > r && r > s && s >= 1) ? "Four different digits from 1 to 9, given largest first." : null),
    prompt: ([p, q, r, s]) => `Use each of the digits ${q}, ${s}, ${p} and ${r} exactly once to make two two-digit numbers whose product is as large as possible. What is that largest product?`,
    solve: ([p, q, r, s]) => ({ steps: [step("tens", "compare", "MATH.number.place-value-tens", [p, q], `${p}_ and ${q}_`), step("units", "compare", ARG, [s, r], `${10 * p + s} and ${10 * q + r}`), step("product", "multiply", "MATH.number.multiplication-tables", [10 * p + s, 10 * q + r], (10 * p + s) * (10 * q + r))], answer: (10 * p + s) * (10 * q + r) }),
    // independent: try all 24 orders of the digits
    validate: ([p, q, r, s], v) => {
      const d = [p, q, r, s];
      let best = 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) for (let l = 0; l < 4; l++) {
        if (new Set([i, j, k, l]).size < 4) continue;
        best = Math.max(best, (10 * d[i] + d[j]) * (10 * d[k] + d[l]));
      }
      return v === best;
    },
    bugs: ([p, q, r, s]) => [
      { id: "largest-number-first", kind: "conceptual", competency: ARG, says: `The biggest possible first number (${10 * p + q}) was made, leaving the small digits for the second. Both numbers matter: the two largest digits should both be tens digits.`, predict: (10 * p + q) * (10 * r + s) },
      { id: "big-with-big", kind: "conceptual", competency: ARG, says: `The larger units digit was put with the larger tens digit. With the tens fixed, the product is larger when the two numbers are closer together, so the larger units digit goes with the smaller tens digit.`, predict: (10 * p + r) * (10 * q + s) },
    ],
    distractors: ([p, q, r, s]) => [(10 * p + s) * (10 * q + r) + 100, (10 * p + s) * (10 * q + r) + 10],
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `The two largest digits, ${s.inputs[0]} and ${s.inputs[1]}, go in the tens places (each counts ten times)` : s.id === "units" ? `The larger units digit goes with the smaller tens digit: ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[1, 9], [1, 9], [1, 9], [1, 9]],
    keep: ([p, q, r, s]) => p > q && q > r && r > s,
    difficulty: ([p, q, r, s]) => (p - q > 3 ? 1 : r - s > 2 ? 2 : 3),
    word: ([p, q, r, s]) => `${nm(p + q + r + s)} has four number cards: ${q}, ${s}, ${p} and ${r}. ${nm(p + q + r + s)} lays them out as two two-digit numbers and multiplies them. What is the largest product that can be made?`,
    teach: {
      idea: "A tens digit counts ten times as much as a units digit, so the two largest digits belong in the tens places. Then, for a fixed total, two numbers have the largest product when they are as close together as possible.",
      method: "Put the two largest digits in the tens places. Give the larger units digit to the number with the smaller tens digit. Multiply, and check one swap to see it is smaller.",
      alternatives: [
        { id: "compare-swap", title: "Compare the two pairings", kind: "procedural", text: ["With tens digits a > b and units c > d, compare (10a + d)(10b + c) and (10a + c)(10b + d).", "Their difference is 10(a − b)(c − d), which is positive: so the first pairing wins."] },
      ],
    },
    limits: "Two two-digit numbers from four different non-zero digits; the written justification is marked by an educator, the product here.",
  },
  {
    id: "anpow0",
    arity: 1,
    title: "Can aⁿ end in 0? Reasoning with prime factors",
    competency: ARG,
    skill: "uniqueness of prime factorisation",
    type: "choice",
    parse: none,
    reject: ([a]) => (a < 2 || a > 150 ? "A whole number from 2 to 150." : null),
    prompt: ([a]) => `Can ${a}ⁿ end with the digit 0 for some natural number n? Choose the statement that is true.`,
    choices: ([a]) => POW0(a),
    solve: ([a]) => ({ steps: [step("factors", "factorise", PF, [a], `${a % 2 === 0 ? "2 divides it" : "2 does not divide it"}; ${a % 5 === 0 ? "5 divides it" : "5 does not divide it"}`), step("decide", "compare", ARG, [10], pow0Answer(a))], answer: pow0Answer(a) }),
    // independent: the last digits of a, a², a³, … repeat within four powers; look at them
    validate: ([a], v) => {
      const last: number[] = [];
      let x = a % 10;
      for (let n = 1; n <= 8; n++) {
        last.push(x);
        x = (x * a) % 10;
      }
      const right = last.includes(0) ? 0 : last.some((d) => d % 2 === 0) ? 1 : last.includes(5) ? 2 : 3;
      return v === right;
    },
    bugs: ([a]) => {
      const k = pow0Answer(a);
      if (k === 1) return [{ id: "even-is-enough", kind: "conceptual", competency: PF, says: `Being even was taken as enough to end in 0. A number ending in 0 is a multiple of 10 = 2 × 5, so it needs the prime 5 as well, and powers of ${a} never gain new primes.`, predict: 0 }];
      if (k === 2) return [{ id: "five-is-enough", kind: "conceptual", competency: PF, says: `Having the factor 5 was taken as enough to end in 0. Ending in 0 needs both 2 and 5, and ${a} is odd, so every power of it is odd.`, predict: 0 }];
      if (k === 3) return [{ id: "big-powers", kind: "conceptual", competency: PF, says: "It was assumed that a large enough power must end in 0. The primes in aⁿ are exactly the primes in a, so 2 and 5 can never appear.", predict: 0 }];
      return [];
    },
    variants: () => [],
    explain: (s) => (s.id === "factors" ? `${s.inputs[0]}: ${s.value}` : `Ending in 0 means divisible by 10 = 2 × 5, and the primes in ${"a"}ⁿ are exactly the primes in a: ${["yes", "no 5", "no 2", "neither"][Number(s.value)]}`),
    domain: [[2, 150]],
    difficulty: ([a]) => (a % 10 === 0 ? 1 : a % 5 === 0 ? 3 : 2),
    teach: {
      idea: "By the Fundamental Theorem of Arithmetic, aⁿ has exactly the same prime factors as a. A number ends in 0 only when 2 and 5 both divide it.",
      method: "Factorise a. If both 2 and 5 appear, aⁿ ends in 0; if one or both are missing, no power can ever gain them.",
      alternatives: [
        { id: "last-digits", title: "Watch the last digits", kind: "procedural", text: ["The last digit of aⁿ depends only on the last digit of a: 6, 36, 216, 1296 all end in 6.", "List the last digits of a, a², a³, a⁴ — they repeat — and see whether 0 ever appears."] },
      ],
    },
    limits: "Bases 2 to 150 and the digit 0 only; the full written proof is marked by an educator.",
  },
  // ============================================================== MATH.reasoning.model-selection
  {
    id: "anpair",
    arity: 3,
    title: "Modelling with a pair of linear equations",
    competency: MODEL,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([x, y, k]) => (x < 5 || x > 30 || y < 10 || y > 60 || k < 0 || k >= PAIRK.length || x === y ? "Costs ₹5–₹30 and ₹10–₹60 (different), one of six pairs of conditions." : null),
    prompt: ([x, y, k]) => {
      const [a1, b1, a2, b2] = PAIRK[k];
      return `For a school play, ${a1} ${a1 === 1 ? "child's ticket" : "children's tickets"} and ${b1} adult ${b1 === 1 ? "ticket" : "tickets"} cost ₹${a1 * x + b1 * y}, and ${a2} ${a2 === 1 ? "child's ticket" : "children's tickets"} and ${b2} adult ${b2 === 1 ? "ticket" : "tickets"} cost ₹${a2 * x + b2 * y}. Let a child's ticket cost ₹x and an adult's ticket ₹y. Write two equations, solve them, and give the answer as (x, y).`;
    },
    solve: ([x, y, k]) => {
      const [a1, b1, a2, b2] = PAIRK[k];
      const [c1, c2] = [a1 * x + b1 * y, a2 * x + b2 * y];
      return {
        steps: [
          step("model", "write", MODEL, [`${a1}x + ${b1}y = ${c1}`, `${a2}x + ${b2}y = ${c2}`], 2),
          step("eliminate", "subtract", LIN, [`${a2} × first − ${a1} × second`], `${a2 * b1 - a1 * b2}y = ${a2 * c1 - a1 * c2}`),
          step("y", "divide", LIN, [a2 * c1 - a1 * c2, a2 * b1 - a1 * b2], y),
          step("x", "substitute", LIN, [c1, b1, y, a1], x),
        ],
        answer: `(${x}, ${y})`,
      };
    },
    // independent: put the pair back into both conditions
    validate: ([x, y, k], v) => {
      const t = tupleNums(v);
      if (!t || t.length !== 2) return false;
      const [a1, b1, a2, b2] = PAIRK[k];
      return a1 * t[0] + b1 * t[1] === a1 * x + b1 * y && a2 * t[0] + b2 * t[1] === a2 * x + b2 * y;
    },
    bugs: ([x, y]) => [{ id: "swapped", kind: "procedural", competency: MODEL, says: "The two values were written the wrong way round; the question asks for (x, y): the child's ticket first.", predict: `(${y}, ${x})` }],
    distractors: ([x, y, k]) => {
      const [a1, b1, a2, b2] = PAIRK[k];
      return [[x + b1, y - a1], [x - b2, y + a2], [x + 1, y + 1]].filter(([u, w]) => u > 0 && w > 0).map(([u, w]) => `(${u}, ${w})`);
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `The conditions: ${s.inputs.join(" and ")}` : s.id === "eliminate" ? `Make the x terms equal and subtract: ${s.value}` : s.id === "y" ? `y = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `Put y = ${s.inputs[2]} into the first equation: ${s.inputs[3]}x = ${s.inputs[0]} − ${s.inputs[1]} × ${s.inputs[2]}, so x = ${s.value}`),
    domain: [[5, 30], [10, 60], [0, 5]],
    keep: ([x, y]) => x !== y,
    cap: 400,
    difficulty: ([, , k]) => (k <= 1 ? 1 : k <= 3 ? 2 : 3),
    word: ([x, y, k]) => {
      const [a1, b1, a2, b2] = PAIRK[k];
      return `At a temple festival stall, ${a1} ${a1 === 1 ? "cup" : "cups"} of tea and ${b1} ${b1 === 1 ? "plate" : "plates"} of idli cost ₹${a1 * x + b1 * y}, while ${a2} ${a2 === 1 ? "cup" : "cups"} of tea and ${b2} ${b2 === 1 ? "plate" : "plates"} of idli cost ₹${a2 * x + b2 * y}. Find the price of one cup of tea and of one plate of idli, written as (tea, idli).`;
    },
    teach: {
      idea: "Two unknown prices and two facts about them: each fact is one linear equation, and the pair that makes both true is the answer.",
      method: "Name the unknowns, write one equation per fact, eliminate one unknown (multiply so its coefficients match, then subtract), solve, substitute back, and check both facts.",
      alternatives: [
        { id: "substitute", title: "Substitution", kind: "procedural", text: ["From the equation with a coefficient 1, write one unknown in terms of the other.", "Put it into the other equation, solve, and check both facts with the prices."] },
      ],
    },
    limits: "Two kinds of ticket or item with whole-rupee prices and six fixed pairs of conditions; the focus is writing the model (the shopping problems of alsysw practise solving). Ages, digits and speeds are other contexts of the same model.",
  },
  {
    id: "anquad",
    arity: 2,
    title: "Modelling with a quadratic and rejecting the impossible root",
    competency: MODEL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([w, d]) => (w < 2 || w > 30 || d < 1 || d > 15 ? "Width 2–30 m and the length 1–15 m more." : null),
    prompt: ([w, d]) => `The length of a rectangular plot is ${d} m more than its width, and its area is ${w * (w + d)} m². Form a quadratic equation and find the width of the plot in metres.`,
    solve: ([w, d]) => {
      const A = w * (w + d);
      return { steps: [step("model", "write", MODEL, [`x(x + ${d}) = ${A}`], `x² + ${d}x − ${A} = 0`), step("roots", "factorise", QUAD, [d, -A], `${w}, ${n_(-(w + d))}`), step("reject", "compare", MODEL, [-(w + d)], w)], answer: w };
    },
    // independent: try every whole width until width × (width + d) reaches the area
    validate: ([w, d], v) => {
      for (let x = 1; x <= 60; x++) if (x * (x + d) === w * (w + d)) return v === x;
      return false;
    },
    bugs: ([w, d]) => [
      { id: "negative-root", kind: "conceptual", competency: MODEL, says: "The negative root was kept. A width cannot be negative, so that solution of the equation does not fit the situation.", predict: -(w + d) },
      { id: "length-given", kind: "procedural", competency: MODEL, says: "The length was given; the question asks for the width, which is the shorter side.", predict: w + d },
    ],
    distractors: ([w, d]) => [w + 1, w - 1, d].filter((x) => x > 0 && x !== w),
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Width x, length x + ${s.inputs[0].toString().match(/\+ (\d+)/)?.[1]}: ${s.inputs[0]}, so ${s.value}` : s.id === "roots" ? `The roots are ${s.value}` : `${s.inputs[0]} is not a possible width, so the width is ${s.value} m`),
    domain: [[2, 30], [1, 15]],
    cap: 300,
    difficulty: ([w]) => (w <= 10 ? 1 : w <= 20 ? 2 : 3),
    word: ([w, d]) => `A photo frame is ${d} cm taller than it is wide, and the area of the glass is ${w * (w + d)} cm². How wide is the frame, in cm?`,
    teach: {
      idea: "Call the width x; then the length is x + d and the area condition is x(x + d) = A, a quadratic. A quadratic has two roots, but only a positive width fits a real plot.",
      method: "Write x² + dx − A = 0, factorise (two numbers with product −A and sum d) or use the formula, then reject the root that cannot be a length.",
      alternatives: [
        { id: "guess-check", title: "Estimate first", kind: "procedural", text: ["The width is a bit less than √A, because the length is bigger than the width.", "Try whole numbers near there: x(x + d) = A picks out the width — then confirm with the equation."] },
      ],
    },
    limits: "Rectangles with whole-number sides; consecutive numbers, ages and speeds are other contexts of the same model.",
  },
  // ============================================================== MATH.statistics.grouped-data
  {
    id: "anfreq",
    arity: 3,
    title: "Counting a class of a grouped frequency table from raw data",
    competency: GD,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([seed, j, wi]) => (seed < 0 || seed > 149 || j < 0 || j > 4 || (wi !== 0 && wi !== 1) ? "One of 150 data sets, one of its five classes." : null),
    prompt: ([seed, j, wi]) => {
      const { s, w, what } = FREQ[wi];
      const cls = [0, 1, 2, 3, 4].map((i) => `${s + i * w}–${s + (i + 1) * w}`);
      return `${what}: ${freqData([seed, j, wi]).join(", ")}. They are grouped into the classes ${cls.join(", ")}, where a class such as ${cls[1]} includes ${s + w} but not ${s + 2 * w}. What is the frequency of the class ${cls[j]}?`;
    },
    solve: ([seed, j, wi]) => {
      const { s, w } = FREQ[wi];
      const data = freqData([seed, j, wi]);
      const c = freqCount(data, s + j * w, s + (j + 1) * w, false, true);
      return { steps: [step("tally", "count", GD, [s + j * w, s + (j + 1) * w], c)], answer: c };
    },
    // independent: build the whole table by which class each value falls in, then read the asked class
    validate: ([seed, j, wi], v) => {
      const { s, w } = FREQ[wi];
      const table = [0, 0, 0, 0, 0];
      for (const x of freqData([seed, j, wi])) table[Math.floor((x - s) / w)]++;
      return v === table[j];
    },
    bugs: ([seed, j, wi]) => {
      const { s, w } = FREQ[wi];
      const data = freqData([seed, j, wi]);
      const [lo, hi] = [s + j * w, s + (j + 1) * w];
      const c = freqCount(data, lo, hi, false, true);
      const up = freqCount(data, lo, hi, true, true);
      const sh = freqCount(data, lo, hi, true, false);
      return [
        { id: "upper-included", kind: "conceptual", competency: GD, says: `The values equal to ${hi} were counted in this class too; ${hi} belongs to the next class (${hi}–${hi + w}).`, predict: up === c ? null : up },
        { id: "boundaries-shifted", kind: "conceptual", competency: GD, says: `Values on ${lo} were put in the class before and values on ${hi} in this one; a class includes its lower limit and not its upper limit.`, predict: sh === c || sh === up ? null : sh },
      ];
    },
    distractors: ([seed, j, wi]) => {
      const { s, w } = FREQ[wi];
      const c = freqCount(freqData([seed, j, wi]), s + j * w, s + (j + 1) * w, false, true);
      return [c + 2, c - 1].filter((x) => x >= 0);
    },
    variants: () => [],
    explain: (s) => `Count the values from ${s.inputs[0]} up to (but not including) ${s.inputs[1]}: ${s.value}`,
    domain: [[0, 149], [0, 4], [0, 1]],
    cap: 300,
    difficulty: ([, j]) => (j === 4 ? 1 : j === 0 ? 2 : 3),
    word: ([seed, j, wi]) => {
      const { s, w, other } = FREQ[wi];
      return `${other}: ${freqData([seed, j, wi]).join(", ")}. ${nm(seed)} groups them in intervals of ${w} starting at ${s}, each interval including its lower end but not its upper end. How many of the numbers are in the interval ${s + j * w}–${s + (j + 1) * w}?`;
    },
    teach: {
      idea: "A grouped frequency table puts every value in exactly one class. With classes like 10–20, 20–30, a value on a boundary (20) goes in the class that starts there.",
      method: "Go through the data once, tallying each value in its class (a boundary value goes up into the class it starts). Check that the tallies add up to the number of values.",
      visual: ([seed, j, wi]) => {
        const { s, w } = FREQ[wi];
        const table = [0, 0, 0, 0, 0];
        for (const x of freqData([seed, j, wi])) table[Math.floor((x - s) / w)]++;
        return { type: "table", head: ["Class", "Frequency"], rows: table.map((f, i) => [`${s + i * w}–${s + (i + 1) * w}`, f]) };
      },
      alternatives: [
        { id: "sort-first", title: "Sort first", kind: "procedural", text: ["Write the values in order from smallest to largest.", "The values in a class then sit together: count from the first value at or above the lower limit to the last value below the upper limit."] },
      ],
    },
    limits: "20 whole-number values in five equal classes (exclusive upper limits); choosing the classes and drawing the table are done in class.",
  },
  {
    id: "anumean",
    contract: { kind: "typed", typed: (p) => { const { xs, fs } = umean(p); return b1Object("statistics", "grouped-mean", { values: xs, frequencies: fs }); } },
    arity: 3,
    title: "Mean of an ungrouped frequency distribution",
    competency: GD,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => {
      const [x0, st, seed] = p;
      if (x0 < 1 || x0 > 30 || st < 1 || st > 5 || seed < 0 || seed > 39) return "Five equally spaced values with frequencies 1–12.";
      const { sf, sfx } = umean(p);
      return has2dp(sfx, sf) ? null : "The mean must have at most two decimal places.";
    },
    prompt: () => "Find the mean of the frequency distribution in the table (x is the value, f its frequency).",
    figure: (p) => {
      const { xs, fs } = umean(p);
      return { type: "table", head: ["x", ...xs.map(String)], rows: [["f", ...fs]] };
    },
    solve: (p) => {
      const { sf, sfx } = umean(p);
      return { steps: [step("fx", "multiply", GD, ["Σfx"], sfx), step("f", "add", "MATH.number.addition", ["Σf"], sf), step("mean", "divide", AVG, [sfx, sf], dv(sfx / sf))], answer: dv(sfx / sf) };
    },
    // independent: write out every value as often as it occurs and average the list
    validate: (p, v) => {
      const { xs, fs } = umean(p);
      const list: number[] = [];
      xs.forEach((x, i) => {
        for (let k = 0; k < fs[i]; k++) list.push(x);
      });
      let t = 0;
      for (const x of list) t += x;
      return close(nv(v), t / list.length);
    },
    bugs: (p) => {
      const { xs, sf, sfx } = umean(p);
      const m = sfx / sf;
      const sx = xs.reduce((a, b) => a + b, 0);
      const pr = (x: number) => (close(x, m) ? null : dv(x));
      return [
        { id: "frequencies-ignored", kind: "conceptual", competency: GD, says: "The five values were averaged without their frequencies; a value that occurs 8 times counts 8 times.", predict: pr(sx / 5) },
        { id: "divided-by-rows", kind: "procedural", competency: AVG, says: `Σfx was divided by 5 (the number of different values); divide by Σf = ${sf}, the number of observations.`, predict: pr(sfx / 5) },
      ];
    },
    distractors: (p) => {
      const { sf, sfx } = umean(p);
      return [dv((sfx + 1) / sf), dv(sf / 5)].filter((x) => !close(nv(x), sfx / sf) && typeof x === "string");
    },
    variants: () => [],
    explain: (s) => (s.id === "fx" ? `Multiply each value by its frequency and add: Σfx = ${s.value}` : s.id === "f" ? `Number of observations: Σf = ${s.value}` : `Mean = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[1, 30], [1, 5], [0, 39]],
    keep: (p) => {
      const { sf, sfx } = umean(p);
      return has2dp(sfx, sf);
    },
    cap: 300,
    difficulty: ([x0, st]) => (x0 <= 10 && st === 1 ? 1 : x0 <= 20 ? 2 : 3),
    word: (p) => {
      const { xs, fs } = umean(p);
      return `${nm(p[2])} kept a record of how many pages she read each day: on ${xs.map((x, i) => `${fs[i]} ${fs[i] === 1 ? "day" : "days"} she read ${x} pages`).join(", ")}. What was the mean number of pages read per day?`;
    },
    teach: {
      idea: "The mean shares the total equally. In a frequency table each value x occurs f times, so the total is Σfx and the number of observations is Σf.",
      method: "Make an fx column, add it (Σfx), add the frequencies (Σf), and divide: mean = Σfx ÷ Σf.",
      alternatives: [
        { id: "deviations", title: "Use deviations from a guess", kind: "procedural", text: ["Guess a mean A (the middle value). Work out d = x − A and add f × d.", "Mean = A + Σfd ÷ Σf. The deviations from the true mean add up to zero, which is a check."] },
      ],
    },
    limits: "Five equally spaced values with frequencies 1–12 and a mean with at most two decimal places.",
  },
  // ============================================================== MATH.statistics.stacked-bar-charts
  {
    id: "anstack",
    arity: 4,
    title: "Absolute numbers versus proportions in bar charts",
    competency: STACK,
    type: "choice",
    parse: none,
    reject: (p) => {
      const [a1, b1, a2, b2] = p;
      if ([a1, b1, a2, b2].some((x) => x < 2 || x > 40)) return "Counts from 2 to 40.";
      const k = stackAnswer(p);
      return a1 === a2 || (k !== 2 && (a1 > a2) === (k === 0)) ? "The larger count and the larger share must point to different answers." : null;
    },
    prompt: () => "The clustered bar chart shows how many children of Class 9A and Class 9B walk to school and how many come by bus. If the same data were drawn as a 100% stacked bar chart, which class would have the longer 'walk' part of its bar?",
    word: ([a1, b1, a2, b2]) => `For Road Safety Week, ${nm(a1 + b2)} asked the children of Class 9A and Class 9B whether they walk to school or come by bus; the counts are in the bar chart in the picture. For the school notice board, each class will be drawn as one bar of the same full length (100%), split into a 'walk' part and a 'bus' part, so that the classes can be compared fairly whatever their sizes. On the notice board, which class would have the longer 'walk' part?`,
    figure: ([a1, b1, a2, b2]) => ({ type: "bars", title: "how children come to school", labels: ["9A walk", "9A bus", "9B walk", "9B bus"], values: [a1, b1, a2, b2] }),
    choices: () => ["Class 9A", "Class 9B", "Both would be the same length"],
    solve: (p) => {
      const [a1, b1, a2, b2] = p;
      return { steps: [step("shares", "divide", RATIO, [`${a1}/${a1 + b1}`, `${a2}/${a2 + b2}`], `${a1}/${a1 + b1} and ${a2}/${a2 + b2}`), step("compare", "compare", STACK, [a1 * (a2 + b2), a2 * (a1 + b1)], stackAnswer(p))], answer: stackAnswer(p) };
    },
    // independent: the share of walkers as a percentage of each class, compared to 4 decimal places
    validate: ([a1, b1, a2, b2], v) => {
      const pa = Math.round((100 * a1 * 10000) / (a1 + b1));
      const pb = Math.round((100 * a2 * 10000) / (a2 + b2));
      return v === (pa > pb ? 0 : pa < pb ? 1 : 2);
    },
    bugs: ([a1, , a2]) => [{ id: "counts-for-shares", kind: "conceptual", competency: STACK, says: "The class with more walkers was chosen. A 100% stacked bar shows each class as a whole (100%), so it compares the share of walkers, not the number.", predict: a1 > a2 ? 0 : 1 }],
    variants: () => [],
    explain: (s) => (s.id === "shares" ? `The walking shares are ${s.value}` : `Compare by cross-multiplying: ${s.inputs[0]} and ${s.inputs[1]}`),
    domain: [[2, 40], [2, 40], [2, 40], [2, 40]],
    keep: (p) => {
      const [a1, , a2] = p;
      const k = stackAnswer(p);
      return a1 !== a2 && (k === 2 || (a1 > a2) !== (k === 0));
    },
    cap: 300,
    difficulty: (p) => (stackAnswer(p) === 2 ? 3 : Math.abs(p[0] - p[2]) > 10 ? 1 : 2),
    teach: {
      idea: "A clustered or ordinary stacked bar shows amounts; a 100% stacked bar makes every bar the same length (100%) and shows each part as a share of its whole.",
      method: "For each class, divide the walkers by the class total (or turn it into a percentage), then compare the shares, not the counts.",
      visual: ([a1, b1, a2, b2]) => ({ type: "table", head: ["Class", "Walk", "Bus", "Total", "Walk share"], rows: [["9A", a1, b1, a1 + b1, `${a1}/${a1 + b1}`], ["9B", a2, b2, a2 + b2, `${a2}/${a2 + b2}`]] }),
      alternatives: [
        { id: "per-hundred", title: "Out of 100", kind: "conceptual", text: ["Ask: if each class had exactly 100 children, how many would walk?", "That number is the length of the walk part in a 100% stacked bar."] },
      ],
    },
    limits: "Two groups and two categories, read from a clustered bar chart; drawing the stacked chart is done on paper and marked by an educator.",
  },
  {
    id: "anpct",
    arity: 4,
    title: "The percentage of a part in a 100% stacked bar",
    competency: STACK,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([a, b, c, s]) => ([a, b, c].some((x) => x < 1 || x > 40) || s < 0 || s > 2 || (1000 * [a, b, c][s]) % (a + b + c) !== 0 ? "Three counts 1–40 whose percentage has at most one decimal place." : null),
    prompt: ([a, b, c, s]) => `The bar chart shows how the ${a + b + c} children of Class 9C come to school. In a 100% stacked bar chart of this data, what percentage of the bar is the part for children who ${SEG[s]}? Give the number without the % sign.`,
    figure: ([a, b, c]) => ({ type: "bars", title: "Class 9C: how children come to school", labels: ["walk", "bus", "cycle"], values: [a, b, c] }),
    solve: ([a, b, c, s]) => {
      const k = [a, b, c][s];
      const T = a + b + c;
      return { steps: [step("total", "add", "MATH.number.addition", [a, b, c], T), step("percent", "divide", PCT, [k, T], dv((100 * k) / T))], answer: dv((100 * k) / T) };
    },
    // independent: share out 100% among the children one at a time
    validate: ([a, b, c, s], v) => {
      const k = [a, b, c][s];
      const each = 100 / (a + b + c);
      let t = 0;
      for (let i = 0; i < k; i++) t += each;
      return close(nv(v), t, 1e-9);
    },
    bugs: ([a, b, c, s]) => {
      const k = [a, b, c][s];
      const T = a + b + c;
      const p = (100 * k) / T;
      const pr = (x: number) => (close(x, p) ? null : dv(x));
      return [
        { id: "count-given", kind: "conceptual", competency: STACK, says: "The number of children was given; a 100% stacked bar shows the part as a percentage of the whole class.", predict: pr(k) },
        { id: "fraction-not-percent", kind: "procedural", competency: PCT, says: `The fraction ${k}/${T} was found but not turned into a percentage (multiply by 100).`, predict: pr(k / T) },
        { id: "part-to-rest", kind: "conceptual", competency: RATIO, says: `The part was compared with the rest (${T - k}) instead of with the whole class (${T}).`, predict: pr((100 * k) / (T - k)) },
      ];
    },
    distractors: ([a, b, c, s]) => {
      const p = (100 * [a, b, c][s]) / (a + b + c);
      return [dv(100 - p), dv(p + 10)].filter((x) => !close(nv(x), p));
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Whole class: ${s.inputs.join(" + ")} = ${s.value}` : `${s.inputs[0]}/${s.inputs[1]} × 100 = ${s.value}%`),
    domain: [[1, 40], [1, 40], [1, 40], [0, 2]],
    keep: ([a, b, c, s]) => (1000 * [a, b, c][s]) % (a + b + c) === 0,
    cap: 300,
    difficulty: ([a, b, c, s]) => ((100 * [a, b, c][s]) % (a + b + c) !== 0 ? 3 : a + b + c === 50 || a + b + c === 25 || a + b + c === 20 ? 1 : 2),
    word: ([a, b, c, s]) => `In a street survey, ${a} families said they walk to the market, ${b} take a bus and ${c} cycle. ${nm(a + b + c)} draws one 100% stacked bar for the survey. What percentage of the bar is the part for families who ${["walk", "take a bus", "cycle"][s]}? Give the number without the % sign.`,
    teach: {
      idea: "In a 100% stacked bar the whole bar stands for the whole group, 100%; each part's length is its share of the group.",
      method: "Add the counts to get the whole, divide the part by the whole and multiply by 100.",
      alternatives: [
        { id: "scale", title: "Each child is a slice", kind: "conceptual", text: ["Share the 100% bar equally among all the children: each child gets 100 ÷ total percent.", "A part with k children gets k of those slices."] },
      ],
    },
    limits: "One group with three categories and a percentage with at most one decimal place; reading several stacked bars at once is the comparison family.",
  },
  // ============================================================== MATH.statistics.weighted-mean
  {
    id: "anwmean",
    contract: { kind: "typed", typed: ([n1, m1, n2, m2]) => b1Object("statistics", "weighted-mean", { values: [m1, m2], frequencies: [n1, n2] }) },
    arity: 4,
    title: "The combined mean of two groups",
    competency: WM,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([n1, m1, n2, m2]) => (n1 < 10 || n1 > 45 || n2 < 10 || n2 > 45 || m1 < 40 || m1 > 90 || m2 < 40 || m2 > 90 || n1 === n2 || m1 === m2 || ((n1 * m1 + n2 * m2) * 10) % (n1 + n2) !== 0 ? "Two groups of different sizes and means, with a combined mean to one decimal place." : null),
    prompt: ([n1, m1, n2, m2]) => `In a test, Section A has ${n1} students with a mean mark of ${m1}, and Section B has ${n2} students with a mean mark of ${m2}. Find the mean mark of all ${n1 + n2} students together.`,
    solve: ([n1, m1, n2, m2]) => {
      const t = n1 * m1 + n2 * m2;
      return { steps: [step("total-a", "multiply", WM, [n1, m1], n1 * m1), step("total-b", "multiply", WM, [n2, m2], n2 * m2), step("total", "add", "MATH.number.addition", [n1 * m1, n2 * m2], t), step("mean", "divide", WM, [t, n1 + n2], dv(t / (n1 + n2)))], answer: dv(t / (n1 + n2)) };
    },
    // independent: list every student's mark (each section at its mean) and average the list
    validate: ([n1, m1, n2, m2], v) => {
      const marks = [...new Array(n1).fill(m1), ...new Array(n2).fill(m2)];
      let t = 0;
      for (const x of marks) t += x;
      return close(nv(v), t / marks.length);
    },
    bugs: ([n1, m1, n2, m2]) => {
      const m = (n1 * m1 + n2 * m2) / (n1 + n2);
      const pr = (x: number) => (close(x, m) ? null : dv(x));
      return [
        { id: "average-of-averages", kind: "conceptual", competency: WM, says: "The two means were averaged. The sections are of different sizes, so the bigger section must count more: work with the total marks.", predict: pr((m1 + m2) / 2) },
        { id: "divided-by-two", kind: "procedural", competency: AVG, says: `The total marks were divided by 2 (the number of sections); divide by the number of students, ${n1 + n2}.`, predict: pr((n1 * m1 + n2 * m2) / 2) },
        { id: "sizes-swapped", kind: "procedural", competency: WM, says: "Each mean was multiplied by the size of the other section.", predict: pr((n2 * m1 + n1 * m2) / (n1 + n2)) },
      ];
    },
    distractors: ([n1, m1, n2, m2]) => [dv(Math.max(m1, m2)), dv(Math.min(m1, m2))],
    variants: () => [],
    explain: (s) => (s.id === "total-a" || s.id === "total-b" ? `Total of the section: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "total" ? `Total of all marks: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `Mean = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[10, 45], [40, 90], [10, 45], [40, 90]],
    keep: ([n1, m1, n2, m2]) => n1 !== n2 && m1 !== m2 && ((n1 * m1 + n2 * m2) * 10) % (n1 + n2) === 0,
    cap: 300,
    difficulty: ([n1, m1, n2, m2]) => (((n1 * m1 + n2 * m2) % (n1 + n2)) === 0 ? 1 : Math.abs(n1 - n2) > 15 ? 2 : 3),
    word: ([n1, m1, n2, m2]) => `A shopkeeper mixes ${n1} kg of rice costing ₹${m1} per kg with ${n2} kg of rice costing ₹${m2} per kg. At what price per kg (in rupees) should the mixture be sold to get the same total money?`,
    teach: {
      idea: "A mean hides a total: total = number × mean. The combined mean is the combined total shared among everyone, so a larger group pulls it towards its own mean.",
      method: "Find each group's total (size × mean), add the totals, and divide by the total number of people.",
      alternatives: [
        { id: "balance", title: "A see-saw between the two means", kind: "conceptual", text: ["Place the two means on a number line. The combined mean lies between them, nearer the bigger group.", "It splits the gap in the ratio of the group sizes, the other way round: the bigger group's side is shorter."] },
      ],
    },
    limits: "Two groups of 10–45 with whole-number means and a combined mean to one decimal place; several groups and percentages of a mixture are not included.",
  },
  {
    id: "anaddv",
    arity: 4,
    title: "How the mean changes when a value is added or removed",
    competency: WM,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([n, m, v, op]) => {
      if (n < 4 || n > 20 || m < 10 || m > 60 || v < 5 || v > 99 || (op !== 0 && op !== 1) || v === m || 2 * v < m || v > 2 * m) return "n from 4 to 20 values with mean 10–60; a value between half and twice the mean is added or removed.";
      const [t, c] = op === 0 ? [n * m + v, n + 1] : [n * m - v, n - 1];
      return t <= 0 || (t * 10) % c !== 0 ? "The new mean must have at most one decimal place." : null;
    },
    prompt: ([n, m, v, op]) => (op === 0 ? `The mean of ${n} numbers is ${m}. The number ${v} is added to the list. What is the new mean?` : `The mean of ${n} numbers is ${m}. One of the numbers, ${v}, is removed from the list. What is the mean of the remaining numbers?`),
    solve: ([n, m, v, op]) => {
      const [t, c] = op === 0 ? [n * m + v, n + 1] : [n * m - v, n - 1];
      return { steps: [step("total", "multiply", WM, [n, m], n * m), step("new-total", op === 0 ? "add" : "subtract", "MATH.number.addition", [n * m, v], t), step("mean", "divide", AVG, [t, c], dv(t / c))], answer: dv(t / c) };
    },
    // independent: a list of n numbers with that mean (all equal to m), change it, and average by adding one at a time
    validate: ([n, m, v, op], val) => {
      const list = new Array(n).fill(m);
      if (op === 0) list.push(v);
      else {
        list.pop();
        list[0] += m - v;
      }
      let t = 0;
      for (const x of list) t += x;
      return close(nv(val), t / list.length);
    },
    bugs: ([n, m, v, op]) => {
      const [t, c] = op === 0 ? [n * m + v, n + 1] : [n * m - v, n - 1];
      const ans = t / c;
      const pr = (x: number) => (close(x, ans) || x <= 0 ? null : dv(x));
      return [
        { id: "mean-with-value", kind: "conceptual", competency: WM, says: `The old mean and ${v} were averaged, as if there were only two numbers; the old mean stands for ${n} numbers.`, predict: op === 0 ? pr((m + v) / 2) : null },
        { id: "count-unchanged", kind: "procedural", competency: AVG, says: `The new total was divided by ${n}; after ${op === 0 ? "adding" : "removing"} a number there are ${c} numbers.`, predict: pr(t / n) },
      ];
    },
    distractors: ([n, m, v, op]) => {
      const [t, c] = op === 0 ? [n * m + v, n + 1] : [n * m - v, n - 1];
      return [m, op === 0 ? m + 1 : m - 1, op === 0 ? m - 1 : m + 1].filter((x) => !close(x, t / c)).map(dv);
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Old total = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "new-total" ? `New total = ${s.value}` : `New mean = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[4, 20], [10, 60], [5, 99], [0, 1]],
    keep: ([n, m, v, op]) => {
      const [t, c] = op === 0 ? [n * m + v, n + 1] : [n * m - v, n - 1];
      return v !== m && 2 * v >= m && v <= 2 * m && t > 0 && (t * 10) % c === 0;
    },
    cap: 300,
    difficulty: ([, , , op]) => (op === 0 ? 2 : 3),
    word: ([n, m, v, op]) => (op === 0 ? `A cricket team's ${n} players have a mean age of ${m} years. A new player aged ${v} joins. What is the mean age of the team now?` : `The mean weight of ${n} parcels is ${m} kg. A parcel weighing ${v} kg is taken out. What is the mean weight of the parcels left?`),
    teach: {
      idea: "The mean times the count gives the total. Adding or removing a value changes both the total and the count.",
      method: "Old total = count × mean. Add or take away the value, change the count by one, and divide again.",
      alternatives: [
        { id: "pull", title: "How far it pulls", kind: "conceptual", text: ["A value bigger than the mean pulls the mean up when it joins; smaller pulls it down.", "The new mean moves by (value − mean) ÷ (new count): a quick check on your answer."] },
      ],
    },
    limits: "One value added or removed from a list of 4–20 numbers with a whole-number mean; the new mean has at most one decimal place.",
  },
  // ============================================================== MATH.statistics.grouped-mean
  {
    id: "angmean",
    arity: 3,
    title: "Mean of grouped data",
    competency: GM,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => {
      const [si, hi, seed] = p;
      if (si < 0 || si > 5 || hi < 0 || hi > 2 || seed < 0 || seed > 199) return "Five equal classes from one of the fixed starts and widths.";
      const g = grouped(p);
      return (g.sfm2 * 50) % g.n === 0 ? null : "The mean must have at most two decimal places.";
    },
    prompt: () => "Find the mean of the grouped frequency distribution in the table.",
    figure: (p) => gtable(grouped(p)),
    solve: (p) => {
      const g = grouped(p);
      return { steps: [step("marks", "add", GM, [g.lows[0], g.lows[0] + g.h], (2 * g.lows[0] + g.h) / 2), step("fx", "multiply", GM, ["Σfx"], g.sfm2 / 2), step("f", "add", "MATH.number.addition", ["Σf"], g.n), step("mean", "divide", AVG, [g.sfm2 / 2, g.n], dv(g.mean))], answer: dv(g.mean) };
    },
    // independent: the step-deviation method about the middle class mark
    validate: (p, v) => {
      const g = grouped(p);
      const a = g.lows[2] + g.h / 2;
      const sfu = g.fs.reduce((t, f, i) => t + f * (i - 2), 0);
      return close(nv(v), a + (g.h * sfu) / g.n);
    },
    bugs: (p) => {
      const g = grouped(p);
      const pr = (x: number) => (close(x, g.mean) ? null : dv(x));
      return [
        { id: "lower-limits", kind: "procedural", competency: GM, says: "The lower limits of the classes were used as x; use the class marks (the middle of each class).", predict: pr(g.mean - g.h / 2) },
        { id: "upper-limits", kind: "procedural", competency: GM, says: "The upper limits of the classes were used as x; use the class marks (the middle of each class).", predict: pr(g.mean + g.h / 2) },
        { id: "divided-by-classes", kind: "procedural", competency: AVG, says: `Σfx was divided by 5, the number of classes; divide by Σf = ${g.n}, the number of observations.`, predict: pr(g.sfm2 / 10) },
        { id: "frequencies-ignored", kind: "conceptual", competency: GD, says: "The class marks were averaged without their frequencies; each class mark counts as many times as its frequency.", predict: pr(g.lows[2] + g.h / 2) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "marks" ? `Class mark = (lower + upper) ÷ 2, e.g. (${s.inputs[0]} + ${s.inputs[1]}) ÷ 2 = ${s.value}` : s.id === "fx" ? `Σfx = ${s.value}` : s.id === "f" ? `Σf = ${s.value}` : `Mean = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 5], [0, 2], [0, 199]],
    keep: (p) => {
      const g = grouped(p);
      return (g.sfm2 * 50) % g.n === 0;
    },
    cap: 300,
    difficulty: ([, hi]) => (hi === 1 ? 1 : hi === 2 ? 2 : 3),
    word: () => "The table shows how many minutes the students of a school took to travel to school one morning. Find the mean travel time in minutes.",
    teach: {
      idea: "In grouped data the exact values are lost, so each class is represented by its class mark (its midpoint); then the mean is Σfx ÷ Σf as for a frequency table.",
      method: "Find each class mark x, multiply by the frequency f, add the products (Σfx) and the frequencies (Σf), and divide.",
      alternatives: [
        { id: "step-deviation", title: "Step-deviation method", kind: "procedural", text: ["Choose an assumed mean a (a middle class mark) and the class width h. For each class, u = (x − a) ÷ h is a small whole number.", "Mean = a + h × Σfu ÷ Σf — the numbers stay small."] },
        { id: "assumed-mean", title: "Assumed-mean method", kind: "procedural", text: ["Take d = x − a for an assumed mean a.", "Mean = a + Σfd ÷ Σf."] },
      ],
    },
    limits: "Five equal classes with frequencies 2–20 and a mean with at most two decimal places.",
  },
  {
    id: "angmedian",
    arity: 3,
    title: "Median of grouped data",
    competency: GM,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => {
      const [si, hi, seed] = p;
      if (si < 0 || si > 5 || hi < 0 || hi > 2 || seed < 0 || seed > 199) return "Five equal classes from one of the fixed starts and widths.";
      const g = grouped(p);
      const md = medianOf(g);
      return md.k === 0 || (100 * (g.n - 2 * md.cf) * g.h) % (2 * md.f) !== 0 ? "The median class is not the first and the median has at most two decimal places." : null;
    },
    prompt: () => "Find the median of the grouped frequency distribution in the table.",
    figure: (p) => gtable(grouped(p)),
    solve: (p) => {
      const g = grouped(p);
      const md = medianOf(g);
      return { steps: [step("half", "divide", GM, [g.n, 2], g.n / 2), step("class", "compare", GM, [md.cf, md.cf + md.f], `${md.l}–${md.l + g.h}`), step("formula", "substitute", GM, [md.l, g.n / 2, md.cf, md.f, g.h], dv(md.value))], answer: dv(md.value) };
    },
    // independent: the cumulative frequency curve (ogive) joined by straight lines; find where it reaches n/2 by halving
    validate: (p, v) => {
      const g = grouped(p);
      const C = (x: number) => {
        let t = 0;
        for (let i = 0; i < 5; i++) {
          const lo = g.lows[i];
          if (x >= lo + g.h) t += g.fs[i];
          else if (x > lo) t += (g.fs[i] * (x - lo)) / g.h;
        }
        return t;
      };
      let [a, b] = [g.lows[0], g.lows[4] + g.h];
      for (let k = 0; k < 80; k++) {
        const m = (a + b) / 2;
        if (C(m) < g.n / 2) a = m;
        else b = m;
      }
      return Math.abs(nv(v) - (a + b) / 2) < 1e-6;
    },
    bugs: (p) => {
      const g = grouped(p);
      const md = medianOf(g);
      const pr = (x: number) => (close(x, md.value) ? null : dv(x));
      return [
        { id: "upper-limit", kind: "procedural", competency: GM, says: `The upper limit of the median class (${md.l + g.h}) was used for l; l is its lower limit, ${md.l}.`, predict: pr(md.value + g.h) },
        { id: "own-cf", kind: "procedural", competency: GM, says: `The cumulative frequency up to and including the median class was used; cf is the cumulative frequency of the class before it (${md.cf}).`, predict: pr(md.l + ((g.n / 2 - md.cf - md.f) / md.f) * g.h) },
        { id: "class-mark", kind: "conceptual", competency: GM, says: "The middle of the median class was given; the formula places the median inside the class according to how many observations are needed.", predict: pr(md.l + g.h / 2) },
        { id: "n-plus-one", kind: "procedural", competency: GM, says: `(n + 1)/2 was used, as for ungrouped data; for grouped data use n/2 = ${g.n / 2}.`, predict: pr(md.l + (((g.n + 1) / 2 - md.cf) / md.f) * g.h) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "half" ? `n = ${s.inputs[0]}, so n/2 = ${s.value}` : s.id === "class" ? `The cumulative frequency first reaches n/2 in the class ${s.value}` : `Median = l + ((n/2 − cf) ÷ f) × h = ${s.inputs[0]} + ((${s.inputs[1]} − ${s.inputs[2]}) ÷ ${s.inputs[3]}) × ${s.inputs[4]} = ${s.value}`),
    domain: [[0, 5], [0, 2], [0, 199]],
    keep: (p) => {
      const g = grouped(p);
      const md = medianOf(g);
      return md.k > 0 && (100 * (g.n - 2 * md.cf) * g.h) % (2 * md.f) === 0;
    },
    cap: 300,
    difficulty: (p) => {
      const g = grouped(p);
      return g.n % 2 === 0 && g.h === 10 ? 1 : g.n % 2 === 0 ? 2 : 3;
    },
    word: () => "The table shows the weekly pocket money (in ₹) of the students of a class, in groups. Find the median pocket money.",
    teach: {
      idea: "The median is the value with half the observations below it. In grouped data we find the class where the cumulative frequency passes n/2, and assume the values are spread evenly across that class.",
      method: "Make a cumulative frequency column, find n/2 and the median class, then use median = l + ((n/2 − cf) ÷ f) × h with l its lower limit, cf the cumulative frequency before it, f its frequency and h the width.",
      alternatives: [
        { id: "ogive", title: "Read it from an ogive", kind: "conceptual", text: ["Plot cumulative frequency against upper class limits and join the points.", "Go across from n/2 to the curve and down: the reading is the median — the formula is the same thing done with a straight line inside the class."] },
      ],
    },
    limits: "Five equal classes (frequencies 2–20) with the median class after the first and a median with at most two decimal places.",
  },
  {
    id: "angmode",
    arity: 3,
    title: "Mode of grouped data",
    competency: GM,
    type: "fraction",
    mc: true,
    parse: none,
    reject: (p) => {
      const [si, hi, seed] = p;
      if (si < 0 || si > 5 || hi < 0 || hi > 2 || seed < 0 || seed > 199) return "Five equal classes from one of the fixed starts and widths.";
      const mo = modeOf(grouped(p));
      const h = [5, 10, 20][hi];
      return !mo.unique || mo.k === 0 || mo.k === 4 || (100 * (mo.f1 - mo.f0) * h) % (2 * mo.f1 - mo.f0 - mo.f2) !== 0 ? "One modal class, not at either end, and a mode with at most two decimal places." : null;
    },
    prompt: () => "Find the mode of the grouped frequency distribution in the table.",
    figure: (p) => gtable(grouped(p)),
    solve: (p) => {
      const g = grouped(p);
      const mo = modeOf(g);
      return { steps: [step("modal-class", "compare", GM, [mo.f1], `${mo.l}–${mo.l + g.h}`), step("formula", "substitute", GM, [mo.l, mo.f1, mo.f0, mo.f2, g.h], dv(mo.value))], answer: dv(mo.value) };
    },
    // independent: the histogram construction — the two crossing lines from the tops of the neighbouring bars
    validate: (p, v) => {
      const g = grouped(p);
      const mo = modeOf(g);
      // line 1 through (l, f1) and (l + h, f2); line 2 through (l, f0) and (l + h, f1)
      const [x1, y1, x2, y2] = [mo.l, mo.f1, mo.l + g.h, mo.f2];
      const [x3, y3, x4, y4] = [mo.l, mo.f0, mo.l + g.h, mo.f1];
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den;
      return close(nv(v), x);
    },
    bugs: (p) => {
      const g = grouped(p);
      const mo = modeOf(g);
      const pr = (x: number) => (close(x, mo.value) ? null : dv(x));
      return [
        { id: "frequency-for-mode", kind: "conceptual", competency: GM, says: `The highest frequency (${mo.f1}) was given; the mode is a value of the data, inside the modal class.`, predict: pr(mo.f1) },
        { id: "neighbours-swapped", kind: "procedural", competency: GM, says: `f₂ (the class after) was used in the top of the formula; it is f₁ − f₀, with f₀ = ${mo.f0} the class before.`, predict: pr(mo.l + ((mo.f1 - mo.f2) / (2 * mo.f1 - mo.f0 - mo.f2)) * g.h) },
        { id: "upper-limit", kind: "procedural", competency: GM, says: `The upper limit of the modal class was used for l; l is its lower limit, ${mo.l}.`, predict: pr(mo.value + g.h) },
        { id: "class-mark", kind: "conceptual", competency: GM, says: "The middle of the modal class was given; the mode leans towards the bigger of the two neighbouring classes.", predict: pr(mo.l + g.h / 2) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "modal-class" ? `The highest frequency is ${s.inputs[0]}, so the modal class is ${s.value}` : `Mode = l + ((f₁ − f₀) ÷ (2f₁ − f₀ − f₂)) × h = ${s.inputs[0]} + ((${s.inputs[1]} − ${s.inputs[2]}) ÷ (2 × ${s.inputs[1]} − ${s.inputs[2]} − ${s.inputs[3]})) × ${s.inputs[4]} = ${s.value}`),
    domain: [[0, 5], [0, 2], [0, 199]],
    keep: (p) => {
      const mo = modeOf(grouped(p));
      const h = [5, 10, 20][p[1]];
      return mo.unique && mo.k > 0 && mo.k < 4 && (100 * (mo.f1 - mo.f0) * h) % (2 * mo.f1 - mo.f0 - mo.f2) === 0;
    },
    cap: 300,
    difficulty: ([, hi]) => (hi === 1 ? 1 : hi === 2 ? 2 : 3),
    word: () => "The table shows how many people visited a town library each day over some weeks, grouped into classes. Find the modal number of visitors per day.",
    teach: {
      idea: "The modal class has the highest frequency. Inside it, the mode is pulled towards whichever neighbouring class is bigger.",
      method: "Pick the modal class; with l its lower limit, f₁ its frequency, f₀ and f₂ the frequencies before and after, and h the width: mode = l + ((f₁ − f₀) ÷ (2f₁ − f₀ − f₂)) × h.",
      alternatives: [
        { id: "histogram", title: "Crossing lines on a histogram", kind: "conceptual", text: ["Draw the modal bar and its neighbours. Join the top-left corner of the modal bar to the top-left corner of the next bar, and the top-right corner to the top-right corner of the bar before.", "The lines cross above the mode."] },
        { id: "empirical", title: "Check with the empirical relation", kind: "procedural", text: ["For many distributions, mode ≈ 3 × median − 2 × mean.", "Use it as a rough check, not as the answer."] },
      ],
    },
    limits: "Five equal classes with one modal class not at either end and a mode with at most two decimal places.",
  },
  // ============================================================== MATH.trigonometry.heights-distances
  {
    id: "anheight",
    arity: 3,
    title: "Heights and distances with one right triangle",
    competency: HD,
    type: "exact",
    mc: true,
    parse: none,
    reject: ([ti, d, mode]) => (ti < 0 || ti > 2 || d < 5 || d > 100 || d % 5 !== 0 || mode < 0 || mode > 2 ? "Angles 30°, 45° or 60° and lengths 5 to 100 m in steps of 5." : null),
    prompt: ([ti, d, mode]) =>
      [
        `A tower stands vertically on level ground. From a point ${d} m from its foot, the angle of elevation of the top of the tower is ${HA[ti]}°. Find the height of the tower in metres (exact value, e.g. 10√3).`,
        `The angle of elevation of the top of a ${d} m high tower, seen from a point on the level ground, is ${HA[ti]}°. How far is the point from the foot of the tower, in metres (exact value)?`,
        `A kite is flying at a height of ${d} m above the ground. Its string, pulled tight, makes an angle of ${HA[ti]}° with the ground. Find the length of the string in metres (exact value).`,
      ][mode],
    figure: ([ti, d, mode]) => ({ type: "triangle", right: true, sides: [[`${d} m`, "?", ""][mode], ["", "", "?"][mode], ["?", `${d} m`, `${d} m`][mode]], angles: ["", `${HA[ti]}°`, ""] }),
    solve: ([ti, d, mode]) => {
      const fn = HMODE[mode].ans;
      return { steps: [step("ratio", "choose", TR, [["tan", "tan", "sin"][mode], HA[ti]], hv(["tan", "tan", "sin"][mode], ti, 1)), step("solve", mode === 0 ? "multiply" : "divide", HD, [d, HA[ti]], hv(fn, ti, d))], answer: hv(fn, ti, d) };
    },
    // independent: the answer's value against the floating-point trigonometry of the triangle
    validate: ([ti, d, mode], v) => {
      if (typeof v !== "string") return false;
      const x = rad(HA[ti]);
      return close(ev(v), [d * Math.tan(x), d / Math.tan(x), d / Math.sin(x)][mode], 1e-9);
    },
    bugs: ([ti, d, mode]) => {
      const right = hnum(HMODE[mode].ans, ti);
      return HMODE[mode].bugs.map(([fn, id, says]) => ({ id, kind: "conceptual", competency: TR, says, predict: close(hnum(fn, ti), right) ? null : hv(fn, ti, d) }) as Bug);
    },
    distractors: ([ti, d, mode]) => {
      const right = hnum(HMODE[mode].ans, ti);
      const out = ["cos", "sec", "sin", "tan", "cot", "cosec"].filter((fn) => !close(hnum(fn, ti), right)).map((fn) => hv(fn, ti, d));
      return [...out, String(2 * d), surdStr(d, 1, 3), surdStr(d, 2, 3)].filter((x) => !close(ev(x), right * d));
    },
    variants: () => [],
    explain: (s) => (s.id === "ratio" ? `The sides involved need ${s.inputs[0]} ${s.inputs[1]}° = ${s.value}` : `So the answer is ${s.value} m`),
    domain: [[0, 2], [5, 100], [0, 2]],
    keep: ([, d]) => d % 5 === 0,
    difficulty: ([ti, , mode]) => (ti === 1 ? 1 : mode === 0 ? 2 : 3),
    word: ([ti, d, mode]) =>
      [
        `From the top of a lighthouse, the angle of depression of a boat is ${HA[ti]}°. The boat is ${d} m from the foot of the lighthouse. How tall is the lighthouse, in metres (exact value)?`,
        `From the top of a building ${d} m high, the angle of depression of a car parked on the road is ${HA[ti]}°. How far is the car from the foot of the building, in metres (exact value)?`,
        `A ladder leans against a wall and reaches ${d} m up the wall. The ladder makes an angle of ${HA[ti]}° with the ground. How long is the ladder, in metres (exact value)?`,
      ][mode],
    teach: {
      idea: "The height, the distance along the ground and the line of sight form a right triangle; the angle of elevation (or depression, which is equal to it by alternate angles) links two of its sides.",
      method: "Draw the triangle, mark the known side and the side you want, choose the ratio that uses exactly those two (tan for height and distance, sin or cos with the hypotenuse), and solve.",
      visual: ([ti, d]) => ({ type: "triangle", right: true, sides: [`${d} m`, "", "h"], angles: ["", `${HA[ti]}°`, ""] }),
      alternatives: [
        { id: "special-triangles", title: "Use the special triangles", kind: "conceptual", text: ["A 30°–60°–90° triangle has sides in the ratio 1 : √3 : 2; a 45°–45°–90° triangle has sides 1 : 1 : √2.", "Match the known side to its place in the ratio and scale."] },
      ],
    },
    limits: "One right triangle with 30°, 45° or 60° and lengths that are multiples of 5 m; observer height is taken as zero.",
  },
  {
    id: "antwo",
    arity: 3,
    title: "Heights and distances with two observation points",
    competency: HD,
    type: "exact",
    mc: true,
    parse: none,
    reject: ([pi, d, ask]) => (pi < 0 || pi > 2 || d < 4 || d > 80 || (ask !== 0 && ask !== 1) ? "One of three pairs of angles and a walk of 4 to 80 m." : null),
    prompt: ([pi, d, ask]) => {
      const [a, b] = TWO[pi].map((i) => HA[i]);
      return `From a point on level ground, the angle of elevation of the top of a tower is ${a}°. After walking ${d} m straight towards the tower, the angle of elevation becomes ${b}°. Find ${ask === 0 ? "the height of the tower" : "the distance from the second point to the foot of the tower"} in metres. Give the exact value with a rational denominator (rationalise the denominator if a surd is left in it).`;
    },
    solve: ([pi, d, ask]) => {
      const [a, b] = TWO[pi];
      const h = twoH(pi, d);
      return {
        steps: [
          step("near", "write", TR, [`h = x tan ${HA[b]}°`], qstr(T3(b))),
          step("far", "write", TR, [`h = (x + ${d}) tan ${HA[a]}°`], qstr(T3(a))),
          step("x", "solve", LIN, [d], qstr(twoX(pi, d))),
          step("h", "multiply", HD, [qstr(twoX(pi, d)), qstr(T3(b))], qstr(h)),
        ],
        answer: qstr(ask === 0 ? h : twoX(pi, d)),
      };
    },
    // independent: floating-point trigonometry: h = d tan α tan β ÷ (tan β − tan α), x = h ÷ tan β
    validate: ([pi, d, ask], v) => {
      if (typeof v !== "string") return false;
      const [ta, tb] = TWO[pi].map((i) => Math.tan(rad(HA[i])));
      const h = (d * ta * tb) / (tb - ta);
      return close(ev(v), ask === 0 ? h : h / tb, 1e-9);
    },
    bugs: ([pi, d, ask]) => {
      const [a, b] = TWO[pi];
      const right = ask === 0 ? twoH(pi, d) : twoX(pi, d);
      const seen: Q4[] = [right];
      const pr = (x: Q4) => {
        if (seen.some((y) => qeq(x, y))) return null;
        seen.push(x);
        return qstr(x);
      };
      const diff = pi === 0 ? Qr(1, 3, 3) : q4([2, 0, -1, 0]);
      return ask === 0
        ? [
            { id: "far-only", kind: "conceptual", competency: HD, says: `${d} m was taken as the whole distance from the first point to the tower; it is only the distance walked, and the rest (x) is unknown.`, predict: pr(qscale(T3(a), d)) },
            { id: "near-only", kind: "conceptual", competency: HD, says: `${d} m was taken as the distance from the second point to the tower; the second point is x m from the tower, an unknown.`, predict: pr(qscale(T3(b), d)) },
            // only for 30°/60°, where the difference 30° is a standard angle a learner knows (tan 15° is not)
            ...(pi === 0 ? [{ id: "angle-difference", kind: "conceptual", competency: TR, says: `The difference of the angles (${HA[b] - HA[a]}°) was used in one triangle; the two angles belong to two different right triangles that share the height.`, predict: pr(qscale(diff, d)) } as Bug] : []),
          ]
        : [
            { id: "height-given", kind: "procedural", competency: HD, says: "The height of the tower was given; the question asks for the distance from the second point.", predict: pr(twoH(pi, d)) },
            { id: "far-distance", kind: "procedural", competency: HD, says: `The distance from the first point (x + ${d}) was given; the question asks for x, from the second point.`, predict: pr(qadd(twoX(pi, d), Qn(d))) },
          ];
    },
    distractors: ([pi, d, ask]) => {
      const right = ask === 0 ? twoH(pi, d) : twoX(pi, d);
      return [qscale(right, 2), qscale(right, 1, 2), qadd(right, Qn(d))].filter((x) => !qeq(x, right)).map(qstr);
    },
    variants: () => [],
    explain: (s) => (s.id === "near" || s.id === "far" ? `${s.inputs[0]}, with tan = ${s.value}` : s.id === "x" ? `Equate the two expressions for h and solve: x = ${s.value}` : `h = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [4, 80], [0, 1]],
    keep: ([, d]) => d % 2 === 0,
    cap: 300,
    difficulty: ([pi, , ask]) => (pi === 0 ? (ask === 1 ? 1 : 2) : 3),
    word: ([pi, d, ask]) => {
      const [a, b] = TWO[pi].map((i) => HA[i]);
      return `${nm(d + pi)} stands on the bank of a river and sees the top of a tree on the opposite bank at an angle of elevation of ${b}°. Moving ${d} m straight back from the bank, the angle becomes ${a}°. Find ${ask === 0 ? "the height of the tree" : "the width of the river"} in metres. Give the exact value with a rational denominator (rationalise the denominator if a surd is left in it).`;
    },
    teach: {
      idea: "Each observation point gives a right triangle; the two triangles share the height h, and their bases differ by the distance walked.",
      method: "Let x be the distance from the nearer point. Write h = x tan β and h = (x + d) tan α, set them equal, solve for x, then find h.",
      visual: ([pi, d]) => ({ type: "triangle", right: true, sides: [`x + ${d}`, "", "h"], angles: ["", `${HA[TWO[pi][0]]}°`, ""] }),
      alternatives: [
        { id: "cot-difference", title: "Subtract the bases", kind: "procedural", text: ["The bases are h cot α and h cot β, and they differ by d: h (cot α − cot β) = d.", "So h = d ÷ (cot α − cot β)."] },
      ],
    },
    limits: "Two observation points in line with the foot, angle pairs 30°/60°, 30°/45° and 45°/60°, even distances; observer height is taken as zero.",
  },
  // ============================================================== MATH.trigonometry.identities
  {
    id: "ansecpt",
    arity: 4,
    title: "Using sec²θ − tan²θ = 1 when sec θ + tan θ is known",
    competency: IDN,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([p, q, f, ask]) => (p < 2 || p > 9 || q < 1 || q > 8 || p <= q || gcd(p, q) !== 1 || (f !== 0 && f !== 1) || ask < 0 || ask > 3 ? "sec θ + tan θ (or cosec θ + cot θ) = p/q > 1 in lowest terms, p up to 9." : null),
    prompt: ([p, q, f, ask]) => `If ${SECPT[f].given} = ${probText(p, q)} for an acute angle θ, find ${SECPT[f].asks[ask]}.`,
    solve: ([p, q, f, ask]) => {
      const steps = [step("conjugate", "divide", IDN, [SECPT[f].asks[0], `1 ÷ ${probText(p, q)}`], q / p)];
      if (ask >= 1) steps.push(step(ask === 2 ? "subtract" : "add", ask === 2 ? "subtract" : "add", IDN, [probText(p, q), probText(q, p)], ask === 2 ? (p * p - q * q) / (2 * p * q) : (p * p + q * q) / (2 * p * q)));
      if (ask === 3) steps.push(step("quotient", "divide", IDN, [SECPT[f].asks[2], SECPT[f].asks[1]], secptAns(p, q, 3)));
      return { steps, answer: secptAns(p, q, ask) };
    },
    // independent: find θ numerically (halving the interval) and evaluate the asked ratio
    validate: ([p, q, f, ask], v) => {
      const k = p / q;
      const g = (x: number) => (f === 0 ? 1 / Math.cos(x) + Math.tan(x) : 1 / Math.sin(x) + 1 / Math.tan(x));
      let [a, b] = [1e-9, Math.PI / 2 - 1e-9];
      for (let i = 0; i < 200; i++) {
        const m = (a + b) / 2;
        const up = f === 0 ? g(m) < k : g(m) > k;
        if (up) a = m;
        else b = m;
      }
      const x = (a + b) / 2;
      const want = f === 0 ? [1 / Math.cos(x) - Math.tan(x), 1 / Math.cos(x), Math.tan(x), Math.sin(x)][ask] : [1 / Math.sin(x) - 1 / Math.tan(x), 1 / Math.sin(x), 1 / Math.tan(x), Math.cos(x)][ask];
      return close(nv(v), want, 1e-7);
    },
    bugs: ([p, q, f, ask]) => {
      const k = p / q;
      const ans = secptAns(p, q, ask);
      const [A, B] = f === 0 ? ["sec θ", "tan θ"] : ["cosec θ", "cot θ"];
      const out: Bug[] = [];
      if (ask === 0) out.push({ id: "sum-not-product", kind: "conceptual", competency: IDN, says: `${A}² − ${B}² = 1 was used as if (${A} + ${B}) + (${A} − ${B}) = 1; it factorises as a product: (${A} + ${B})(${A} − ${B}) = 1.`, predict: 1 - k });
      if (ask === 1 || ask === 2) out.push({ id: "not-halved", kind: "procedural", competency: IDN, says: `The two equations were ${ask === 1 ? "added" : "subtracted"} but the result was not halved: that gives 2${ask === 1 ? A : B}.`, predict: 2 * ans });
      if (ask === 1 || ask === 2) out.push({ id: "add-subtract-swapped", kind: "procedural", competency: IDN, says: `The equations were ${ask === 1 ? "subtracted" : "added"}; ${ask === 1 ? `adding cancels ${B} and leaves 2${A}` : `subtracting cancels ${A} and leaves 2${B}`}.`, predict: secptAns(p, q, ask === 1 ? 2 : 1) });
      if (ask === 3) out.push({ id: "upside-down", kind: "recall", competency: TR, says: `The ratio was turned upside down: ${SECPT[f].asks[3]} = ${B} ÷ ${A}.`, predict: 1 / ans });
      return out.filter((b) => b.predict === null || !close(b.predict as number, ans));
    },
    distractors: ([p, q, f, ask]) => {
      const ans = secptAns(p, q, ask);
      return [p / q, (p * p + q * q) / (p * p - q * q), q / (2 * p)].filter((x) => !close(x, ans));
    },
    variants: () => [],
    explain: (s) => (s.id === "conjugate" ? `(${SECPT[String(s.inputs[0]).startsWith("cosec") ? 1 : 0].given})(${s.inputs[0]}) = 1, so ${s.inputs[0]} = ${s.inputs[1]} = ${fmt(Number(s.value))}` : s.id === "quotient" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${fmt(Number(s.value))}` : `${s.id === "add" ? "Add" : "Subtract"} the two equations and halve: (${s.inputs[0]} ${s.id === "add" ? "+" : "−"} ${s.inputs[1]}) ÷ 2 = ${fmt(Number(s.value))}`),
    domain: [[2, 9], [1, 8], [0, 1], [0, 3]],
    keep: ([p, q]) => p > q && gcd(p, q) === 1,
    cap: 300,
    difficulty: ([, , , ask]) => (ask === 0 ? 1 : ask === 3 ? 3 : 2),
    teach: {
      idea: "sec²θ − tan²θ = 1 factorises: (sec θ + tan θ)(sec θ − tan θ) = 1. So knowing the sum gives the difference as its reciprocal, and the sum and difference together give each ratio.",
      method: "sec θ − tan θ = 1 ÷ (sec θ + tan θ). Add the two equations and halve for sec θ; subtract and halve for tan θ. Then sin θ = tan θ ÷ sec θ. (The same works for cosec θ and cot θ.)",
      alternatives: [
        { id: "triangle", title: "Build the triangle", kind: "conceptual", text: ["Once sec θ = hypotenuse ÷ adjacent and tan θ = opposite ÷ adjacent are known, draw the right triangle with those sides.", "Every other ratio can be read off it; check with Pythagoras."] },
      ],
    },
    word: ([p, q, f, ask]) =>
      f === 0
        ? `A wheelchair ramp makes an acute angle θ with the ground. For each metre of ground it covers, the ramp is sec θ metres long and rises tan θ metres. A builder measures that (length of ramp) + (rise) = ${probText(p, q)} m for each metre of ground. Find ${["(length of ramp) − (rise) for each metre of ground, that is sec θ − tan θ", "the length of ramp for each metre of ground, sec θ", "the rise for each metre of ground, tan θ", "the rise for each metre along the ramp, sin θ"][ask]}.`
        : `A slide in a park makes an acute angle θ with the ground. For each metre it rises, the slide is cosec θ metres long and covers cot θ metres of ground. It is measured that (length of slide) + (ground covered) = ${probText(p, q)} m for each metre of rise. Find ${["(length of slide) − (ground covered) for each metre of rise, that is cosec θ − cot θ", "the length of slide for each metre of rise, cosec θ", "the ground covered for each metre of rise, cot θ", "the ground covered for each metre along the slide, cos θ"][ask]}.`,
    limits: "sec θ + tan θ or cosec θ + cot θ given as a fraction greater than 1 with numerator up to 9; the written proof of the identity itself is marked by an educator.",
  },
  {
    id: "anidsimp",
    arity: 2,
    title: "Simplifying with the trigonometric identities",
    competency: IDN,
    // a choice among simplified forms: a typed expression would be accepted unsimplified (it is compared by value)
    type: "choice",
    parse: none,
    reject: ([t, m]) => (t < 0 || t >= IDS.length || m < 1 || m > 6 ? "One of the sixteen expressions with a whole-number factor 1 to 6." : null),
    prompt: ([t, m]) => `Simplify ${m === 1 ? IDS[t][0] : IDS[t][1] ? `${m}[${IDS[t][0]}]` : `${m}${IDS[t][0].startsWith("(") ? "" : " "}${IDS[t][0]}`}. Which of these is it equal to?`,
    choices: (p) => idsOptions(p),
    solve: ([t, m]) => ({ steps: [step("identity", "rewrite", IDN, [IDS[t][0]], IDS[t][2]), ...(m > 1 ? [step("factor", "multiply", IDN, [m, IDS[t][2]], scaleExpr(m, IDS[t][2]))] : [])], answer: idsOptions([t, m]).indexOf(scaleExpr(m, IDS[t][2])) }),
    // independent: evaluate every option numerically at several angles; the chosen one must be the only option that
    // agrees with the original expression
    validate: ([t, m], v) => {
      const opts = idsOptions([t, m]);
      const agrees = (e: string) => [0.31, 0.52, 0.74, 0.96, 1.18, 1.37].every((x) => {
        const got = ev(e, { t: x });
        return Number.isFinite(got) && close(got, m * IDS[t][3](x), 1e-8);
      });
      return typeof v === "number" && opts[v] !== undefined && agrees(opts[v]) && opts.filter(agrees).length === 1;
    },
    bugs: ([t, m]) => {
      const opts = idsOptions([t, m]);
      return [
        { id: "identity-slip", kind: "recall", competency: IDN, says: IDS[t][5], predict: opts.indexOf(scaleExpr(m, IDS[t][4])) } as Bug,
        ...(m > 1 ? [{ id: "factor-dropped", kind: "procedural", competency: IDN, says: `The factor ${m} in front was lost while simplifying; it multiplies the whole result.`, predict: opts.indexOf(IDS[t][2]) } as Bug] : []),
      ].filter((b) => (b.predict as number) >= 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "identity" ? `Using the identities, ${s.inputs[0]} = ${s.value}` : `Multiply by ${s.inputs[0]}: ${s.value}`),
    domain: [[0, IDS.length - 1], [1, 6]],
    difficulty: ([t]) => (t <= 3 || t === 11 ? 1 : t >= 13 ? 3 : 2),
    teach: {
      idea: "Three facts do almost everything: sin²θ + cos²θ = 1 (and, dividing by cos²θ or sin²θ, 1 + tan²θ = sec²θ and 1 + cot²θ = cosec²θ), the reciprocals (sec = 1/cos, cosec = 1/sin, cot = 1/tan), and tan = sin/cos.",
      method: "Write everything in sin θ and cos θ, use sin²θ + cos²θ = 1 to replace 1 − sin²θ or 1 − cos²θ, cancel, and name the result.",
      alternatives: [
        { id: "check-angle", title: "Check with an angle", kind: "procedural", text: ["Put θ = 30° (or 60°) into the question and into your answer using the known values.", "If the two numbers differ, the simplification has a slip; if they agree for two angles, it is very likely right."] },
      ],
    },
    limits: "Sixteen one- or two-step simplifications with a whole-number factor; written proofs of identities are marked by an educator.",
  },
  // ============================================================== MATH.trigonometry.ratios
  {
    id: "anstd",
    arity: 5,
    title: "Evaluating expressions with standard angles",
    competency: TR,
    type: "exact",
    mc: true,
    parse: none,
    reject: (p) => {
      const [f1, t1, f2, t2, op] = p;
      if ([f1, f2].some((f) => f < 0 || f > 2) || [t1, t2].some((t) => t < 0 || t > 4) || op < 0 || op > 4) return "sin, cos or tan of 0°, 30°, 45°, 60°, 90° joined by +, −, ×, or as squares.";
      const [a, b] = [TRIG[f1][t1], TRIG[f2][t2]];
      if (!a || !b || qeq(a, Qn(0)) || qeq(b, Qn(0))) return "Both values must be defined and not zero.";
      return (f1 === f2 && t1 === t2) || (op === 1 && qeq(a, b)) || (op === 4 && qeq(qmul(a, a), qmul(b, b))) ? "Two different terms that do not cancel." : null;
    },
    prompt: ([f1, t1, f2, t2, op]) => `Find the exact value of ${op <= 2 ? `${stdTerm(f1, t1, false)}${op === 2 ? " " : ` ${STDOP[op]} `}${stdTerm(f2, t2, false)}` : `${stdTerm(f1, t1, true)} ${op === 3 ? "+" : "−"} ${stdTerm(f2, t2, true)}`}.`,
    solve: (p) => {
      const [f1, t1, f2, t2, op] = p;
      return { steps: [step("first", "recall", TR, [FN[f1], ANG[t1]], qstr(TRIG[f1][t1]!)), step("second", "recall", TR, [FN[f2], ANG[t2]], qstr(TRIG[f2][t2]!)), step("combine", ["add", "subtract", "multiply", "add", "subtract"][op], op >= 3 ? "MATH.number.exponents" : SURD, [STDOP[op]], qstr(stdValue(p)))], answer: qstr(stdValue(p)) };
    },
    // independent: floating-point sine, cosine and tangent of the angles in radians
    validate: ([f1, t1, f2, t2, op], v) => {
      if (typeof v !== "string") return false;
      const [a, b] = [trigNum(f1, ANG[t1]), trigNum(f2, ANG[t2])];
      return close(ev(v), [a + b, a - b, a * b, a * a + b * b, a * a - b * b][op], 1e-9);
    },
    bugs: (p) => {
      const [f1, t1, f2, t2, op] = p;
      const right = stdValue(p);
      const pr = (x: Q4 | null) => (!x || qeq(x, right) ? null : qstr(x));
      const swap = (f: number, t: number) => (f === 0 ? TRIG[1][t] : f === 1 ? TRIG[0][t] : COT[t]);
      const sa = swap(f1, t1);
      const sb = swap(f2, t2);
      const out: Bug[] = [{ id: "sin-cos-swapped", kind: "recall", competency: TR, says: "The values of sin and cos were swapped (and tan taken as cot): for example sin 30° = 1/2 and cos 30° = √3/2.", predict: sa && sb ? pr(stdCombine(sa, sb, op)) : null }];
      if (op <= 1 && f1 === f2) {
        const t = ANG.indexOf(op === 0 ? ANG[t1] + ANG[t2] : ANG[t1] - ANG[t2]);
        out.push({ id: "angles-combined", kind: "conceptual", competency: TR, says: `${FN[f1]} ${ANG[t1]}° ${STDOP[op]} ${FN[f1]} ${ANG[t2]}° was worked out as ${FN[f1]}(${ANG[t1]}° ${STDOP[op]} ${ANG[t2]}°); a trigonometric ratio does not add or subtract that way.`, predict: t >= 0 ? pr(TRIG[f1][t]) : null });
      }
      if (op >= 3) {
        out.push({ id: "square-as-double", kind: "procedural", competency: "MATH.number.exponents", says: "sin²θ was taken as 2 × sin θ; the small 2 means the value multiplied by itself.", predict: pr(op === 3 ? qscale(qadd(TRIG[f1][t1]!, TRIG[f2][t2]!), 2) : qscale(qsub(TRIG[f1][t1]!, TRIG[f2][t2]!), 2)) });
        out.push({ id: "squares-forgotten", kind: "procedural", competency: "MATH.number.exponents", says: "The squares were left out; each value must be squared before adding or subtracting.", predict: pr(op === 3 ? qadd(TRIG[f1][t1]!, TRIG[f2][t2]!) : qsub(TRIG[f1][t1]!, TRIG[f2][t2]!)) });
      }
      return out;
    },
    distractors: (p) => {
      const [f1, t1, f2, t2, op] = p;
      const right = stdValue(p);
      return [0, 1, 2, 3, 4].filter((o) => o !== op).map((o) => stdCombine(TRIG[f1][t1]!, TRIG[f2][t2]!, o)).filter((x) => !qeq(x, right)).map(qstr);
    },
    variants: () => [],
    explain: (s) => (s.id === "first" || s.id === "second" ? `${s.inputs[0]} ${s.inputs[1]}° = ${s.value}` : `Combine the values: ${s.value}`),
    domain: [[0, 2], [0, 4], [0, 2], [0, 4], [0, 4]],
    keep: (p) => {
      const [f1, t1, f2, t2, op] = p;
      const [a, b] = [TRIG[f1][t1], TRIG[f2][t2]];
      return !!a && !!b && !qeq(a, Qn(0)) && !qeq(b, Qn(0)) && !(f1 === f2 && t1 === t2) && !(op === 1 && qeq(a, b)) && !(op === 4 && qeq(qmul(a, a), qmul(b, b)));
    },
    cap: 400,
    difficulty: ([, , , , op]) => (op === 2 ? 1 : op <= 1 ? 2 : 3),
    teach: {
      idea: "The ratios of 30°, 45° and 60° come from two triangles: half an equilateral triangle of side 2 (sides 1, √3, 2) and half a square of side 1 (sides 1, 1, √2).",
      method: "Write down each value (sin 30° = 1/2, sin 45° = √2/2, sin 60° = √3/2, cos the reverse order, tan = sin ÷ cos), then do the arithmetic with surds exactly.",
      visual: () => ({ type: "table", head: ["θ", "0°", "30°", "45°", "60°", "90°"], rows: [["sin θ", "0", "1/2", "√2/2", "√3/2", "1"], ["cos θ", "1", "√3/2", "√2/2", "1/2", "0"], ["tan θ", "0", "√3/3", "1", "√3", "not defined"]] }),
      alternatives: [
        { id: "hand", title: "The square-root pattern", kind: "procedural", text: ["For 0°, 30°, 45°, 60°, 90°, sin θ = √0/2, √1/2, √2/2, √3/2, √4/2.", "cos θ is the same list backwards, and tan θ = sin θ ÷ cos θ."] },
        { id: "triangles", title: "Draw the two triangles", kind: "conceptual", text: ["Cut an equilateral triangle of side 2 in half: the half has sides 1, √3 and 2 and angles 30°, 60°, 90°.", "Cut a unit square along its diagonal: sides 1, 1, √2 and angles 45°, 45°, 90°. Read any ratio off these."] },
      ],
    },
    word: ([f1, t1, f2, t2, op]) => {
      const what = (f: number, t: number) => [`the height of the top of a 1 m rod leaning at ${ANG[t]}° to the ground (sin ${ANG[t]}°)`, `how far along the ground a 1 m rod leaning at ${ANG[t]}° reaches (cos ${ANG[t]}°)`, `the rise of a ramp at ${ANG[t]}° for each metre along the ground (tan ${ANG[t]}°)`][f];
      const A = what(f1, t1);
      const Bq = what(f2, t2);
      return [`A carpenter needs the total of two lengths, in metres: ${A}, and ${Bq}. Find the total exactly.`, `A carpenter needs the difference of two lengths, in metres: ${A}, minus ${Bq}. Find it exactly.`, `A carpenter makes a rectangle whose sides, in metres, are ${A} and ${Bq}. Find its area in m², exactly.`, `A carpenter makes two squares with sides, in metres, ${A} and ${Bq}. Find their total area in m², exactly.`, `A carpenter makes two squares with sides, in metres, ${A} and ${Bq}. By how many m² is the first square's area more than the second's? Find it exactly.`][op];
    },
    limits: "Two terms of sin, cos or tan at 0°, 30°, 45°, 60°, 90° (non-zero, defined) joined by +, −, × or as a sum or difference of squares.",
  },
  {
    id: "anratio",
    arity: 4,
    title: "Finding the other trigonometric ratios from one",
    competency: TR,
    type: "exact",
    mc: true,
    parse: none,
    reject: ([g, p, q, a]) => {
      if (g < 0 || g > 2 || p < 1 || p > 9 || q < 1 || q > 10 || a < 0 || a > 5) return "sin, cos or tan given as p/q, and one of the six ratios asked.";
      if (gcd(p, q) !== 1 || (g < 2 && p >= q) || (g === 2 && p * p + q * q > 100)) return "The given ratio is in lowest terms (below 1 for sin and cos; for tan the hypotenuse is at most 10).";
      return a === g || a === g + 3 ? "Ask for a ratio other than the given one and its reciprocal." : null;
    },
    prompt: ([g, p, q, a]) => `If ${RN[g]} θ = ${probText(p, q)}, where θ is an acute angle, find ${RN[a]} θ. Give the exact value.`,
    figure: ([g, p, q]) => {
      const s = ratioSides(g, p, q);
      return { type: "triangle", right: true, sides: [g === 1 ? sideStr(s.adj) : g === 2 ? sideStr(s.adj) : "?", g === 2 ? "?" : sideStr(s.hyp), g === 1 ? "?" : sideStr(s.opp)], angles: ["", "θ", ""] };
    },
    solve: ([g, p, q, a]) => {
      const s = ratioSides(g, p, q);
      const third = g === 0 ? s.adj : g === 1 ? s.opp : s.hyp;
      return { steps: [step("sides", "write", TR, [RN[g], p, q], `${p} and ${q}`), step("third", "pythagoras", PYTH, [p, q], sideStr(third)), step("ratio", "divide", TR, [RN[a]], ratioOf(a, s))], answer: ratioOf(a, s) };
    },
    // independent: the angle itself, by inverse trigonometry in floating point
    validate: ([g, p, q, a], v) => {
      if (typeof v !== "string") return false;
      const x = [Math.asin, Math.acos, Math.atan][g](p / q);
      return close(ev(v), [Math.sin(x), Math.cos(x), Math.tan(x), 1 / Math.sin(x), 1 / Math.cos(x), 1 / Math.tan(x)][a], 1e-9);
    },
    bugs: ([g, p, q, a]) => {
      const s = ratioSides(g, p, q);
      const right = ev(ratioOf(a, s));
      const seen: number[] = [right];
      const pr = (x: string) => {
        const val = ev(x);
        if (!Number.isFinite(val) || seen.some((y) => close(y, val))) return null;
        seen.push(val);
        return x;
      };
      const lin: Side = g === 2 ? [p + q, 1] : [q - p, 1];
      const ls = g === 0 ? { ...s, adj: lin } : g === 1 ? { ...s, opp: lin } : { ...s, hyp: lin };
      const comp = { opp: s.adj, adj: s.opp, hyp: s.hyp };
      return [
        { id: "subtracted-sides", kind: "prerequisite", competency: PYTH, says: g === 2 ? `The hypotenuse was taken as ${p} + ${q}; by Pythagoras it is √(${p}² + ${q}²).` : `The third side was taken as ${q} − ${p}; by Pythagoras it is √(${q}² − ${p}²).`, predict: pr(ratioOf(a, ls)) },
        { id: "reciprocal", kind: "recall", competency: TR, says: `The ratio was turned upside down: ${RN[a]} θ = ${["opposite ÷ hypotenuse", "adjacent ÷ hypotenuse", "opposite ÷ adjacent", "hypotenuse ÷ opposite", "hypotenuse ÷ adjacent", "adjacent ÷ opposite"][a]}.`, predict: pr(ratioOf((a + 3) % 6, s)) },
        { id: "opposite-adjacent-swapped", kind: "conceptual", competency: TR, says: "The opposite and adjacent sides were swapped; the opposite side is the one facing θ.", predict: pr(ratioOf(a, comp)) },
      ];
    },
    distractors: ([g, p, q, a]) => {
      const s = ratioSides(g, p, q);
      const right = ev(ratioOf(a, s));
      return [0, 1, 2, 3, 4, 5].filter((b) => b !== a).map((b) => ratioOf(b, s)).filter((x) => !close(ev(x), right));
    },
    variants: () => [],
    explain: (s) => (s.id === "sides" ? `${s.inputs[0]} θ = ${s.inputs[1]}/${s.inputs[2]}: take those two sides of a right triangle` : s.id === "third" ? `By Pythagoras the third side is ${s.value}` : `${s.inputs[0]} θ = ${s.value}`),
    domain: [[0, 2], [1, 9], [1, 10], [0, 5]],
    keep: ([g, p, q, a]) => gcd(p, q) === 1 && (g === 2 ? p * p + q * q <= 100 : p < q) && a !== g && a !== g + 3,
    cap: 400,
    difficulty: ([g, p, q]) => {
      const t = g === 2 ? p * p + q * q : q * q - p * p;
      return Number.isInteger(Math.sqrt(t)) ? 1 : g === 2 ? 3 : 2;
    },
    teach: {
      idea: "A ratio fixes the shape of the right triangle: sin θ = 3/5 means opposite : hypotenuse = 3 : 5, whatever the size (similar triangles). Pythagoras gives the third side, and then every ratio can be read off.",
      method: "Draw a right triangle with the two given sides, find the third by Pythagoras, then write the asked ratio (opposite, adjacent, hypotenuse) and rationalise any surd in the denominator.",
      alternatives: [
        { id: "identity", title: "Use the identities", kind: "procedural", text: ["From sin θ, cos θ = √(1 − sin²θ); from tan θ, sec θ = √(1 + tan²θ).", "Then tan = sin ÷ cos and the reciprocals give the rest."] },
      ],
    },
    limits: "sin, cos or tan given as a fraction with sides up to 10; trigonometric tables (degrees and minutes) are the tables family.",
  },
  {
    id: "ancompa",
    arity: 4,
    title: "Complementary angles: sin(…) = cos(…)",
    competency: TR,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([p, c1, q, c2]) => {
      if (p < 1 || p > 4 || q < 1 || q > 3 || Math.abs(c1) > 30 || Math.abs(c2) > 30 || p === q || c1 % 2 !== 0 || c2 % 2 !== 0) return "sin(pA + c₁) = cos(qA + c₂) with p ≠ q small and even shifts up to 30°.";
      const s = 90 - c1 - c2;
      if (s % (p + q) !== 0) return "A must be a whole number of degrees.";
      const A = s / (p + q);
      return A < 1 || p * A + c1 <= 0 || p * A + c1 >= 90 || q * A + c2 <= 0 || q * A + c2 >= 90 ? "Both angles must be acute." : null;
    },
    prompt: ([p, c1, q, c2]) => `If sin(${lead(p, c1)}) = cos(${lead(q, c2)}), where both angles are acute, find A in degrees.`,
    solve: ([p, c1, q, c2]) => {
      const A = (90 - c1 - c2) / (p + q);
      return { steps: [step("complement", "rewrite", TR, [`sin x = cos(90° − x)`], `${lead(p, c1)} + ${lead(q, c2)} = 90°`), step("solve", "solve", LIN, [p + q, 90 - c1 - c2], A)], answer: A };
    },
    // independent: try every whole number of degrees and test the equation numerically
    validate: ([p, c1, q, c2], v) => {
      for (let A = 1; A < 90; A++) {
        const [x, y] = [p * A + c1, q * A + c2];
        if (x > 0 && x < 90 && y > 0 && y < 90 && Math.abs(Math.sin(rad(x)) - Math.cos(rad(y))) < 1e-12) return v === A;
      }
      return false;
    },
    bugs: ([p, c1, q, c2]) => {
      const A = (90 - c1 - c2) / (p + q);
      const eq = (c2 - c1) / (p - q);
      const s180 = (180 - c1 - c2) / (p + q);
      return [
        { id: "angles-equated", kind: "conceptual", competency: TR, says: "The two angles were set equal. sin x = cos y does not mean x = y: since cos y = sin(90° − y), it means x + y = 90°.", predict: Number.isInteger(eq) && eq !== A ? eq : null },
        { id: "supplement", kind: "conceptual", competency: TR, says: "The angles were made to add up to 180°; sin and cos of complementary angles (adding to 90°) are equal.", predict: Number.isInteger(s180) && s180 !== A ? s180 : null },
      ];
    },
    distractors: ([p, c1, q, c2]) => {
      const A = (90 - c1 - c2) / (p + q);
      return [A + 2, A - 2, 90 - A].filter((x) => x > 0 && x !== A);
    },
    variants: () => [],
    explain: (s) => (s.id === "complement" ? `cos y = sin(90° − y), so the angles are complementary: ${s.value}` : `${s.inputs[0]}A = ${s.inputs[1]}°, so A = ${s.value}°`),
    domain: [[1, 4], [-30, 30], [1, 3], [-30, 30]],
    keep: ([p, c1, q, c2]) => {
      if (p === q || c1 % 2 !== 0 || c2 % 2 !== 0 || (90 - c1 - c2) % (p + q) !== 0) return false;
      const A = (90 - c1 - c2) / (p + q);
      return A >= 1 && p * A + c1 > 0 && p * A + c1 < 90 && q * A + c2 > 0 && q * A + c2 < 90;
    },
    cap: 300,
    difficulty: ([p, c1, q, c2]) => (c1 === 0 && c2 === 0 ? 1 : p + q <= 4 ? 2 : 3),
    teach: {
      idea: "In a right triangle the two acute angles add to 90°, and the side opposite one is adjacent to the other. So sin x = cos(90° − x): the sine of an angle is the cosine of its complement.",
      method: "If sin(first angle) = cos(second angle) with both acute, the angles add to 90°. Write that equation in A and solve it.",
      visual: () => ({ type: "triangle", right: true, sides: ["", "", ""], angles: ["", "x", "90° − x"] }),
      alternatives: [
        { id: "rewrite", title: "Rewrite as one function", kind: "procedural", text: ["Replace cos(y) by sin(90° − y).", "Now sin(first) = sin(90° − y) with both acute, so first = 90° − y."] },
      ],
    },
    limits: "sin(pA + c₁) = cos(qA + c₂) with small whole p ≠ q, even shifts up to 30° and acute angles; simplifying expressions with tan/cot and sec/cosec of complementary angles is the next family.",
  },
  // ============================================================== gap@1: when an average of averages misleads
  {
    id: "anavgav",
    arity: 4,
    title: "When the average of two means is not the mean of everyone",
    competency: WM,
    type: "choice",
    // [n1, i1, dn, i2]: Section A has n1 students with mean 40 + 2·i1, Section B n1 + 5·dn students with mean 40 + 2·i2
    parse: none,
    reject: (p) => {
      const [n1, i1, dn, i2] = p;
      if (n1 < 10 || n1 > 45 || i1 < 0 || i1 > 25 || i2 < 0 || i2 > 25 || dn < -3 || dn > 3) return "Two sections of 10 to 45 students with means from 40 to 90.";
      const n2 = n1 + 5 * dn;
      return n2 < 10 || n2 > 45 || i1 === i2 ? "Section B must have 10 to 45 students, and the two means must differ." : null;
    },
    prompt: (p) => {
      const { n1, m1, n2, m2 } = avgavOf(p);
      return `In a test, Section A has ${n1} students with a mean mark of ${m1}, and Section B has ${n2} students with a mean mark of ${m2}. ${nm(n1 + m2)} says: "The mean mark of all ${n1 + n2} students is ${dv((m1 + m2) / 2)}, the average of the two means." Is ${nm(n1 + m2)} right?`;
    },
    choices: () => AVGAV,
    solve: (p) => {
      const { n1, m1, n2, m2 } = avgavOf(p);
      const t = (n1 * m1 + n2 * m2) / (n1 + n2);
      const ans = n1 === n2 ? 0 : t > (m1 + m2) / 2 ? 1 : 2;
      return { steps: [step("true-mean", "divide", WM, [n1 * m1 + n2 * m2, n1 + n2], dv(t)), step("compare", "compare", WM, [dv((m1 + m2) / 2) as string | number], ans)], answer: ans };
    },
    // independent: list every student's mark (each section at its mean), average the list, and compare
    validate: (p, v) => {
      const { n1, m1, n2, m2 } = avgavOf(p);
      const marks = [...new Array(n1).fill(m1), ...new Array(n2).fill(m2)];
      let s = 0;
      for (const x of marks) s += x;
      const t = s / marks.length;
      return v === (close(t, (m1 + m2) / 2) ? 0 : t > (m1 + m2) / 2 ? 1 : 2);
    },
    bugs: (p) => {
      const { n1, n2 } = avgavOf(p);
      return n1 === n2
        ? []
        : [
            { id: "always-right", kind: "conceptual", competency: WM, says: "The average of the two means was taken as the mean of everyone; that is only true when the groups are the same size. Here the bigger section must count more.", predict: 3 },
            { id: "pull-reversed", kind: "conceptual", competency: WM, says: "The pull was taken the wrong way; the combined mean is pulled towards the mean of the LARGER section.", predict: avgavAnswer(p) === 1 ? 2 : 1 },
          ];
    },
    variants: () => [],
    explain: (s) => (s.id === "true-mean" ? `The true mean is ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `Compare it with ${s.inputs[0]}: ${["they are equal, because the sections are the same size", "the true mean is higher, pulled towards the larger section", "the true mean is lower, pulled towards the larger section"][Number(s.value)]}`),
    domain: [[10, 45], [0, 25], [-3, 3], [0, 25]],
    keep: (p) => {
      const [n1, i1, dn, i2] = p;
      const n2 = n1 + 5 * dn;
      return n2 >= 10 && n2 <= 45 && i1 !== i2;
    },
    cap: 300,
    difficulty: (p) => (avgavOf(p).n1 === avgavOf(p).n2 ? 2 : Math.abs(p[2]) >= 2 ? 1 : 3),
    teach: {
      idea: "The mean of everyone is total ÷ count. The average of two group means gives each GROUP equal weight, so it is right only when the groups are the same size; otherwise the larger group pulls the true mean towards its own mean.",
      method: "Find each total (size × mean), add, divide by the number of people, and compare with the average of the means.",
      alternatives: [
        { id: "extreme", title: "Try an extreme case", kind: "conceptual", text: ["Imagine 99 students with mean 90 and 1 student who scored 40.", "The average of the means is 65, but nearly everyone scored 90: the true mean is 89.5."] },
      ],
    },
    limits: "Two groups; the comparison only (the combined mean itself is the combined-mean family).",
  },
  // ============================================================== gap@1: the assumed-mean and step-deviation methods
  {
    id: "angstep",
    arity: 4,
    title: "The assumed-mean and step-deviation methods for a grouped mean",
    competency: GM,
    type: "integer",
    mc: true,
    // [m, si, hi, seed]: m 0 Σfd with d = x − a (assumed mean); m 1 Σfu with u = (x − a)/h (step deviation); a is the
    // class mark of the middle class
    parse: none,
    reject: (p) => {
      const [m, si, hi, seed] = p;
      if (m < 0 || m > 1 || si < 0 || si > 5 || hi < 0 || hi > 2 || seed < 0 || seed > 199) return "Five equal classes from one of the fixed starts and widths.";
      return stepSum(p) === 0 ? "The sum must not be 0 (then the assumed mean is the mean itself)." : null;
    },
    prompt: (p) => {
      const g = grouped(p.slice(1));
      const a = g.lows[2] + g.h / 2;
      return p[0] === 0
        ? `To find the mean of the grouped data in the table by the assumed-mean method, take the assumed mean a = ${dv(a)} (the class mark of ${g.lows[2]}–${g.lows[2] + g.h}) and d = x − a for each class mark x. Find Σfd.`
        : `To find the mean of the grouped data in the table by the step-deviation method, take the assumed mean a = ${dv(a)} (the class mark of ${g.lows[2]}–${g.lows[2] + g.h}), the class width h = ${g.h} and u = (x − a)/h for each class mark x. Find Σfu.`;
    },
    figure: (p) => gtable(grouped(p.slice(1))),
    solve: (p) => {
      const g = grouped(p.slice(1));
      const us = [-2, -1, 0, 1, 2];
      const vals = us.map((u) => (p[0] === 0 ? u * g.h : u));
      return { steps: [step("deviations", "subtract", GM, [p[0] === 0 ? "d" : "u"], vals.join(", ")), step("sum", "multiply", GM, [], stepSum(p))], answer: stepSum(p) };
    },
    // independent: from the totals: Σf(x − a) = Σfx − a·Σf (divided by h for u), with the class marks added up directly
    validate: (p, v) => {
      const g = grouped(p.slice(1));
      const a = g.lows[2] + g.h / 2;
      let sfx = 0;
      g.fs.forEach((f, i) => (sfx += f * (g.lows[i] + g.h / 2)));
      const sfd = sfx - a * g.n;
      return typeof v === "number" && close(v, p[0] === 0 ? sfd : sfd / g.h);
    },
    bugs: (p) => {
      const g = grouped(p.slice(1));
      const S = stepSum(p);
      const out: Bug[] = [{ id: "a-minus-x", kind: "procedural", competency: GM, says: "The deviations were worked out as a − x; they are x − a, so classes above the assumed mean have positive deviations.", predict: -S }];
      if (p[0] === 1) out.push({ id: "not-divided-by-h", kind: "procedural", competency: GM, says: `The deviations were not divided by the class width h = ${g.h}; u = (x − a)/h.`, predict: S * g.h });
      out.push({ id: "frequencies-ignored", kind: "conceptual", competency: GD, says: "The deviations were added without multiplying by the frequencies; each deviation counts as many times as its frequency.", predict: 0 });
      return out;
    },
    distractors: (p) => {
      const S = stepSum(p);
      return [S + 1, S - 1, S + 2].filter((x) => x !== S);
    },
    variants: () => [],
    explain: (s) => (s.id === "deviations" ? `The values of ${s.inputs[0]} for the five classes are ${s.value}` : `Multiply each by its frequency and add: ${n_(Number(s.value))}`),
    domain: [[0, 1], [0, 5], [0, 2], [0, 199]],
    keep: (p) => stepSum(p) !== 0,
    cap: 300,
    difficulty: ([m, , hi]) => (m === 1 ? 2 : hi === 1 ? 1 : 3),
    teach: {
      idea: "Mean = a + Σfd/Σf (assumed mean) = a + h × Σfu/Σf (step deviation): shifting every value by a and scaling by h makes the numbers small, and the mean shifts and scales back the same way.",
      method: "Choose a (a middle class mark) and h (the class width). Work out d = x − a (or u = d/h) for each class, multiply by f, add, then mean = a + Σfd/Σf (or a + h·Σfu/Σf).",
      alternatives: [
        { id: "direct", title: "Compare with the direct method", kind: "procedural", text: ["The direct method gives Σfx/Σf; the assumed-mean method gives a + Σf(x − a)/Σf.", "Both must give the same mean: a useful check."] },
      ],
    },
    limits: "Σfd and Σfu with the middle class mark as a; the mean itself is the grouped-mean family.",
  },
  // ============================================================== gap@1: median and mode of an ungrouped frequency table; empirical relation
  {
    id: "anfmed",
    arity: 3,
    title: "The median of a frequency table",
    competency: GM,
    type: "fraction",
    mc: true,
    decimals: true,
    // [x0, st, seed]: values x0, x0 + st, …, x0 + 4st with frequencies 1–9
    parse: none,
    reject: (p) => (p[0] < 1 || p[0] > 30 || p[1] < 1 || p[1] > 5 || p[2] < 0 || p[2] > 39 ? "Five equally spaced values starting at 1–30 with frequencies from 1 to 9." : null),
    prompt: () => "The table shows the values x and their frequencies f. Find the median of the data. (Use a cumulative frequency column.)",
    figure: (p) => {
      const t = fmedOf(p);
      return { type: "table", head: ["x", ...t.xs.map(String)], rows: [["f", ...t.fs.map(String)]] };
    },
    solve: (p) => {
      const t = fmedOf(p);
      return { steps: [step("n", "add", "MATH.number.addition", t.fs, t.N), step("cf", "add", GM, [t.N % 2 ? `${(t.N + 1) / 2}th` : `${t.N / 2}th and ${t.N / 2 + 1}th`], t.cf.join(", ")), step("median", "read", GM, [], dv(t.med))], answer: dv(t.med) };
    },
    // independent: write out every value as often as its frequency, sort, and take the middle
    validate: (p, v) => {
      const t = fmedOf(p);
      const list: number[] = [];
      t.xs.forEach((x, i) => {
        for (let k = 0; k < t.fs[i]; k++) list.push(x);
      });
      list.sort((a, b) => a - b);
      const L = list.length;
      const m = L % 2 ? list[(L - 1) / 2] : (list[L / 2 - 1] + list[L / 2]) / 2;
      return close(nv(v), m);
    },
    bugs: (p) => {
      const t = fmedOf(p);
      const pr = (x: number) => (close(x, t.med) ? null : dv(x));
      const fsort = [...t.fs].sort((a, b) => a - b);
      return [
        { id: "middle-value", kind: "conceptual", competency: GM, says: "The middle value of the table was taken; the frequencies matter: the median is the middle of all the observations.", predict: pr(t.xs[2]) },
        { id: "median-of-frequencies", kind: "conceptual", competency: GM, says: "The median of the frequencies was found; the median is a value x, found with the cumulative frequencies.", predict: pr(fsort[2]) },
        { id: "position-n-over-2", kind: "procedural", competency: GM, says: t.N % 2 ? `The ${(t.N - 1) / 2}th observation was taken; with ${t.N} observations the middle one is the ${(t.N + 1) / 2}th.` : `Only the ${t.N / 2}th observation was taken; with an even number of observations the median is the mean of the ${t.N / 2}th and ${t.N / 2 + 1}th.`, predict: pr(t.N % 2 ? t.at((t.N - 1) / 2) : t.at(t.N / 2)) },
      ];
    },
    distractors: (p) => {
      const t = fmedOf(p);
      return t.xs.filter((x) => !close(x, t.med)).map(dv);
    },
    variants: () => [],
    explain: (s) => (s.id === "n" ? `N = Σf = ${s.value}` : s.id === "cf" ? `The cumulative frequencies are ${s.value}; the median is the ${s.inputs[0]} observation` : `So the median is ${s.value}`),
    domain: [[1, 30], [1, 5], [0, 39]],
    cap: 300,
    difficulty: (p) => (fmedOf(p).N % 2 ? 1 : fmedOf(p).med % 1 ? 3 : 2),
    teach: {
      idea: "The median has half the observations at or below it. In a frequency table the cumulative frequency (cf) says how many observations are at or below each value.",
      method: "Find N = Σf. If N is odd the median is the ((N + 1)/2)th observation; if even, the mean of the (N/2)th and (N/2 + 1)th. Find them by reading down the cf column to the first cf that reaches the position.",
      alternatives: [
        { id: "write-out", title: "Write the list out", kind: "procedural", text: ["Write each value as many times as its frequency, in order.", "Cross off from both ends; what is left in the middle is the median."] },
      ],
    },
    limits: "Five equally spaced values with frequencies up to 9; grouped (class-interval) data is the grouped-median family.",
  },
  {
    id: "anempir",
    arity: 4,
    title: "The mode of a frequency table and the empirical relation",
    competency: GM,
    type: "fraction",
    mc: true,
    decimals: true,
    // [kind, M, d, seed]: kind 0 the mode of a frequency table (seed); 1 mode from mean M and median M + d; 2 median from
    // mean M and mode M + 3d; 3 mean from median M + d and mode M + 3d
    parse: none,
    reject: (p) => {
      const [k, M, d, seed] = p;
      if (k < 0 || k > 3 || M < 20 || M > 80 || d < -6 || d > 6 || seed < 0 || seed > 69) return "One of four kinds, with a mean from 20 to 80.";
      return k === 0 ? (d !== 0 || !empTable(p).unique ? "A table with one most common value." : null) : d === 0 || seed !== 0 ? "The mean and the median must differ." : null;
    },
    prompt: (p) => {
      const [k, M, d] = p;
      if (k === 0) return "The table shows the values x and their frequencies f. Find the mode of the data.";
      return k === 1 ? `For a moderately skewed distribution the mean is ${M} and the median is ${M + d}. Use the empirical relation between the mean, median and mode to estimate the mode.` : k === 2 ? `For a moderately skewed distribution the mean is ${M} and the mode is ${M + 3 * d}. Use the empirical relation to estimate the median.` : `For a moderately skewed distribution the median is ${M + d} and the mode is ${M + 3 * d}. Use the empirical relation to estimate the mean.`;
    },
    figure: (p) => {
      if (p[0] !== 0) return null;
      const t = empTable(p);
      return { type: "table", head: ["x", ...t.xs.map(String)], rows: [["f", ...t.fs.map(String)]] };
    },
    solve: (p) => {
      const [k, M, d] = p;
      if (k === 0) {
        const t = empTable(p);
        return { steps: [step("largest", "compare", GM, [Math.max(...t.fs)], t.mode)], answer: t.mode };
      }
      const v = k === 1 ? 3 * (M + d) - 2 * M : k === 2 ? (M + 3 * d + 2 * M) / 3 : (3 * (M + d) - (M + 3 * d)) / 2;
      return { steps: [step("relation", "rewrite", GM, [k], ["", "mode = 3 median − 2 mean", "median = (mode + 2 mean)/3", "mean = (3 median − mode)/2"][k]), step("evaluate", "evaluate", GM, [], dv(v))], answer: dv(v) };
    },
    // independent: kind 0 lists every observation and counts each value; kinds 1–3 check mode − mean = 3(median − mean)
    validate: (p, v) => {
      const [k, M, d] = p;
      const x = nv(v);
      if (k === 0) {
        const t = empTable(p);
        const list: number[] = [];
        t.xs.forEach((y, i) => {
          for (let j = 0; j < t.fs[i]; j++) list.push(y);
        });
        const count = (y: number) => list.filter((z) => z === y).length;
        return list.includes(x) && list.every((y) => count(y) < count(x) || y === x);
      }
      const [mean, med, mode] = k === 1 ? [M, M + d, x] : k === 2 ? [M, x, M + 3 * d] : [x, M + d, M + 3 * d];
      return close(mode - mean, 3 * (med - mean));
    },
    bugs: (p) => {
      const [k, M, d] = p;
      if (k === 0) {
        const t = empTable(p);
        return [
          { id: "frequency-for-mode", kind: "conceptual", competency: GM, says: `The highest frequency (${Math.max(...t.fs)}) was given; the mode is the VALUE that occurs most often.`, predict: Math.max(...t.fs) === t.mode ? null : Math.max(...t.fs) },
          { id: "middle-value", kind: "conceptual", competency: GM, says: "The middle value of the table was given; the mode is the value with the largest frequency.", predict: t.xs[2] === t.mode ? null : t.xs[2] },
        ];
      }
      const med = M + d;
      const mode = M + 3 * d;
      const right = k === 1 ? mode : k === 2 ? med : M;
      const pr = (x: number) => (close(x, right) ? null : dv(x));
      return k === 1
        ? [{ id: "mean-median-swapped", kind: "recall", competency: GM, says: "The mean and median were swapped: mode = 3 median − 2 mean.", predict: pr(3 * M - 2 * med) }, { id: "two-one", kind: "recall", competency: GM, says: "mode = 2 median − mean was used; the relation is mode = 3 median − 2 mean.", predict: pr(2 * med - M) }]
        : k === 2
          ? [{ id: "average", kind: "conceptual", competency: GM, says: "The median was taken halfway between the mean and the mode; it lies one third of the way from the mean to the mode.", predict: pr((M + mode) / 2) }, { id: "weights-swapped", kind: "recall", competency: GM, says: "median = (2 mode + mean)/3 was used; it is (mode + 2 mean)/3.", predict: pr((2 * mode + M) / 3) }]
          : [{ id: "average", kind: "conceptual", competency: GM, says: "The mean was taken as the average of the median and the mode; from mode = 3 median − 2 mean, mean = (3 median − mode)/2.", predict: pr((med + mode) / 2) }, { id: "sign", kind: "procedural", competency: GM, says: "The relation was rearranged with a sign slip: mean = (3 median + mode)/2 was used.", predict: pr((3 * med + mode) / 2) }];
    },
    distractors: (p) => {
      const [k, M, d] = p;
      if (k === 0) return empTable(p).xs.filter((x) => x !== empTable(p).mode);
      const right = k === 1 ? M + 3 * d : k === 2 ? M + d : M;
      return [right + 1, right - 1, right + d].filter((x) => x !== right).map(dv);
    },
    variants: () => [],
    explain: (s) => (s.id === "largest" ? `The largest frequency is ${s.inputs[0]}, for the value ${s.value}` : s.id === "relation" ? `Empirical relation: ${s.value}` : `So the answer is ${s.value}`),
    domain: [[0, 3], [20, 80], [-6, 6], [0, 69]],
    keep: (p) => (p[0] === 0 ? p[2] === 0 && p[1] % 5 === 0 && empTable(p).unique : p[2] !== 0 && p[3] === 0),
    cap: 400,
    difficulty: ([k]) => (k === 0 ? 1 : k === 1 ? 2 : 3),
    teach: {
      idea: "The mode is the value that occurs most often (the largest frequency). For moderately skewed data, mean − mode ≈ 3(mean − median), that is mode ≈ 3 median − 2 mean (Karl Pearson's empirical relation).",
      method: "For a table, find the largest frequency and read its value. For the relation, write mode = 3 median − 2 mean, put in the two known numbers and solve for the third.",
      alternatives: [
        { id: "number-line", title: "Picture it on a line", kind: "conceptual", text: ["Mark the mean and the mode on a number line.", "The median lies between them, one third of the way from the mean to the mode."] },
      ],
    },
    limits: "Ungrouped tables with one mode, and the empirical relation with whole-number data; the grouped mode is its own family.",
  },
  // ============================================================== gap@1: sure and impossible events
  {
    id: "ansure",
    arity: 3,
    title: "Sure, impossible or neither",
    competency: COMP,
    type: "choice",
    // [e, k, j]: an event on an experiment (SURE); k its number, j (bags only) the second count
    parse: none,
    reject: (p) => (p[0] < 0 || p[0] > SURE.length - 1 || !SURE[p[0]].ok(p[1], p[2]) ? "An event from the list with numbers in its range." : null),
    prompt: ([e, k, j]) => `${SURE[e].say(k, j)} Which describes this event?`,
    choices: () => SURE_CH,
    solve: ([e, k, j]) => {
      const { fav, all } = sureCount(e, k, j);
      const ans = fav === 0 ? 0 : fav === all ? 1 : 2;
      return { steps: [step("count", "count", SS, [all], fav), step("classify", "classify", COMP, [fav, all], ans)], answer: ans };
    },
    // independent: list the outcomes one by one and test the event
    validate: ([e, k, j], v) => {
      const outs = SURE[e].outcomes(k, j);
      const hit = outs.filter((o) => SURE[e].test(o, k, j)).length;
      return v === (hit === 0 ? 0 : hit === outs.length ? 1 : 2);
    },
    bugs: ([e, k, j]) => {
      const { fav, all } = sureCount(e, k, j);
      if (fav === 0) return [{ id: "small-chance", kind: "conceptual", competency: COMP, says: "The event was thought to have some small chance; no outcome makes it happen, so it is impossible and P = 0.", predict: 2 } as Bug];
      if (fav === all) return [{ id: "not-sure", kind: "conceptual", competency: COMP, says: "The event was thought not certain; EVERY outcome makes it happen, so it is a sure event and P = 1.", predict: 2 } as Bug];
      return [
        ...(6 * fav <= all ? [{ id: "unlikely-impossible", kind: "conceptual", competency: COMP, says: "An unlikely event was called impossible; some outcome makes it happen, so its probability is more than 0.", predict: 0 } as Bug] : []),
        ...(6 * fav >= 5 * all ? [{ id: "likely-sure", kind: "conceptual", competency: COMP, says: "A very likely event was called sure; some outcome does not make it happen, so its probability is less than 1.", predict: 1 } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "count" ? `${s.value} of the ${s.inputs[0]} outcomes make the event happen` : ["None does: an impossible event, P = 0", "All do: a sure event, P = 1", "Some do and some do not: 0 < P < 1"][Number(s.value)]),
    domain: [[0, 6], [0, 13], [0, 6]],
    keep: ([e, k, j]) => SURE[e].ok(k, j),
    difficulty: ([e, k, j]) => {
      const { fav, all } = sureCount(e, k, j);
      return fav === 0 || fav === all ? 2 : e >= 3 ? 3 : 1;
    },
    teach: {
      idea: "An event that cannot happen is impossible, P = 0; an event that happens for every outcome is sure, P = 1; every other event has a probability strictly between 0 and 1.",
      method: "List (or count) the outcomes of the experiment and check each one against the event: none, all, or some.",
      alternatives: [
        { id: "line", title: "The probability line", kind: "conceptual", text: ["Put impossible at 0 and sure at 1.", "Unlikely events sit near 0 and likely ones near 1, but only 'no outcome' is at 0 and only 'every outcome' is at 1."], visual: () => ({ type: "numberline", from: 0, to: 1, step: 0.25 }) },
      ],
    },
    limits: "One die, two dice, numbered cards and bags of balls; events described in words.",
  },
  // ============================================================== gap@1: checking the axioms of probability
  {
    id: "anaxiom",
    arity: 1,
    title: "Which assignment of probabilities is valid",
    competency: PROB,
    type: "choice",
    // [s]: four assignments to the outcomes ω₁ … ω₄, one valid (every value from 0 to 1, total 1)
    parse: none,
    reject: (p) => (p[0] < 0 || p[0] > 299 ? "A choice of assignments 0–299." : null),
    prompt: () => "A random experiment has the sample space S = {ω₁, ω₂, ω₃, ω₄}. Which of these assignments of probabilities to the outcomes is valid?",
    choices: (p) => axiomOpts(p[0]).map((o) => o.text),
    solve: (p) => {
      const o = axiomOpts(p[0]);
      const i = o.findIndex((x) => x.kind === "valid");
      return { steps: [step("check", "compare", PROB, [o[i].text], "every value is between 0 and 1 and the four add up to 1"), step("choose", "choose", PROB, [], i)], answer: i };
    },
    // independent: for each option add the four numerators and test each value, in whole numbers over the common denominator
    validate: (p, v) => {
      const o = axiomOpts(p[0]);
      const ok = o.map((x) => x.nums.every((n) => n >= 0 && n <= x.den) && x.nums.reduce((a, b) => a + b, 0) === x.den);
      return typeof v === "number" && ok[v] === true && ok.filter(Boolean).length === 1;
    },
    bugs: (p) => {
      const o = axiomOpts(p[0]);
      return [
        { id: "negative-accepted", kind: "conceptual", competency: PROB, says: "An assignment with a negative value was accepted because its values add up to 1; every probability must also be at least 0.", predict: o.findIndex((x) => x.kind === "negative") },
        { id: "sum-not-checked", kind: "conceptual", competency: PROB, says: "Each value was checked to lie between 0 and 1, but the total was not; the probabilities of all the outcomes must add up to exactly 1.", predict: o.findIndex((x) => x.kind === "short") },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "check" ? `${s.inputs[0]}: ${s.value}` : `So the valid one is ${"ABCD"[Number(s.value)]}`),
    domain: [[0, 299]],
    // level@1: the axiomatic approach to probability is Grade 11 (NCERT Class 11, Ch. 14)
    grade: () => 11,
    difficulty: (p) => (axiomOpts(p[0])[0].den <= 8 ? 2 : 3),
    teach: {
      idea: "An assignment of probabilities to the outcomes of a finite sample space is valid when every value is at least 0 and at most 1 and the values add up to exactly 1 (the axioms).",
      method: "For each assignment, write the values with a common denominator, check that none is negative or above 1, and add the numerators: they must give the denominator.",
      alternatives: [
        { id: "tickets", title: "Think of tickets", kind: "conceptual", text: ["With denominator 12, imagine 12 tickets shared among the four outcomes.", "A negative number of tickets is impossible, and all 12 must be shared out — no more, no fewer."] },
      ],
    },
    limits: "Four outcomes with fractional probabilities; events (sums of outcomes) are other families.",
  },
  // ============================================================== gap@1: complementary-angle relations to simplify
  {
    id: "ancomps",
    arity: 4,
    title: "Simplifying with complementary angles",
    competency: TR,
    type: "integer",
    mc: true,
    // [form, t, a, b]: θ = t°, φ = another acute angle; a, b small whole numbers
    parse: none,
    reject: ([f, t, a, b]) => (f < 0 || f > 4 || t < 10 || t > 80 || t === 45 || a < 1 || a > 6 || b < 1 || b > 6 || ((f === 2 || f === 3) && b !== 1) || (f === 1 && a === b) ? "θ from 10° to 80° (not 45°), a and b from 1 to 6." : null),
    prompt: ([f, t, a, b]) => {
      const u = 90 - t;
      const ph = compsPhi(t);
      const co = (n: number) => (n === 1 ? "" : `${n} `);
      return `Without using tables, find the value of ${[
        `${co(a)}sin ${t}° ÷ cos ${u}° + ${co(b)}tan ${ph}° ÷ cot ${90 - ph}°`,
        `${co(a)}sec ${t}° ÷ cosec ${u}° − ${co(b)}cos ${ph}° ÷ sin ${90 - ph}°`,
        `${co(a)}tan ${t}° × tan ${u}°`,
        `${a}(cos²${t}° + cos²${u}°)`,
        `${co(a)}sin ${t}° × sec ${u}° + ${b}`,
      ][f]}.`;
    },
    solve: ([f, t, a, b]) => {
      const v = [a + b, a - b, a, a, a + b][f];
      return { steps: [step("complement", "rewrite", TR, [t, 90 - t], ["cos(90° − θ) = sin θ and cot(90° − θ) = tan θ", "cosec(90° − θ) = sec θ and sin(90° − θ) = cos θ", "tan(90° − θ) = cot θ = 1/tan θ", "cos(90° − θ) = sin θ, so cos²θ + sin²θ = 1", "sec(90° − θ) = cosec θ = 1/sin θ"][f]), step("evaluate", "evaluate", TR, [], v)], answer: v };
    },
    // independent: evaluate the expression numerically with Math.sin, Math.cos, Math.tan
    validate: ([f, t, a, b], v) => {
      const s = (d: number) => Math.sin(rad(d));
      const c = (d: number) => Math.cos(rad(d));
      const tn = (d: number) => Math.tan(rad(d));
      const u = 90 - t;
      const ph = compsPhi(t);
      const want = [a * (s(t) / c(u)) + b * (tn(ph) / (1 / tn(90 - ph))), a * (1 / c(t) / (1 / s(u))) - b * (c(ph) / s(90 - ph)), a * tn(t) * tn(u), a * (c(t) ** 2 + c(u) ** 2), a * s(t) * (1 / c(u)) + b][f];
      return typeof v === "number" && close(v, want, 1e-9);
    },
    bugs: ([f, , a, b]) => {
      const right = [a + b, a - b, a, a, a + b][f];
      const w = (x: number) => (x === right ? null : x);
      return [
        f === 0 || f === 4
          ? { id: "numbers-dropped", kind: "procedural", competency: TR, says: "Each ratio of complementary functions is 1, but the numbers in front were dropped; they multiply those 1s.", predict: w(f === 0 ? 2 : 1 + b) }
          : f === 1
            ? { id: "minus-lost", kind: "procedural", competency: TR, says: "The minus sign between the two parts was lost; each part simplifies to its number, and then they are subtracted.", predict: w(a + b) }
            : f === 2
              ? { id: "tan-complement-negative", kind: "recall", competency: TR, says: "tan(90° − θ) was taken as −tan θ; for complementary angles tan(90° − θ) = cot θ, so the product is 1.", predict: w(-a) }
              : { id: "angles-added", kind: "conceptual", competency: TR, says: "The two angles were added inside one cosine, as cos²90° = 0; cos(90° − θ) = sin θ, and cos²θ + sin²θ = 1.", predict: w(0) },
      ].filter((x) => x.predict !== null) as Bug[];
    },
    distractors: ([f, , a, b]) => {
      const right = [a + b, a - b, a, a, a + b][f];
      return [right + 1, right - 1, 0, 2 * right].filter((x) => x !== right);
    },
    variants: () => [],
    explain: (s) => (s.id === "complement" ? `Use ${s.value}` : `So the value is ${n_(Number(s.value))}`),
    domain: [[0, 4], [10, 80], [1, 6], [1, 6]],
    keep: ([f, t, a, b]) => t !== 45 && !((f === 2 || f === 3) && b !== 1) && !(f === 1 && a === b) && t % 2 === 0,
    cap: 300,
    difficulty: ([f]) => (f === 2 || f === 3 ? 1 : f === 0 ? 2 : 3),
    teach: {
      idea: "For complementary angles θ and 90° − θ: sin(90° − θ) = cos θ, cos(90° − θ) = sin θ, tan(90° − θ) = cot θ, cot(90° − θ) = tan θ, sec(90° − θ) = cosec θ, cosec(90° − θ) = sec θ.",
      method: "Spot the pairs of angles that add up to 90°, rewrite one function of each pair as the co-function of the other angle, and simplify (a ratio of equal values is 1; tan θ × cot θ = 1; sin²θ + cos²θ = 1).",
      alternatives: [
        { id: "triangle", title: "One right triangle", kind: "conceptual", text: ["In a right triangle the two acute angles are θ and 90° − θ.", "The side opposite one is adjacent to the other, so each ratio of one angle is the co-ratio of the other."], visual: () => ({ type: "triangle", right: true, sides: ["", "", ""], angles: ["", "θ", "90° − θ"] }) },
      ],
    },
    limits: "Expressions with one or two pairs of complementary angles (whole degrees); expressions needing the values of non-standard angles are the tables family.",
  },
  // ============================================================== gap@1: trigonometric tables
  {
    id: "antable",
    arity: 4,
    title: "Reading trigonometric tables (degrees, minutes, mean differences)",
    competency: TR,
    type: "fraction",
    mc: true,
    decimals: true,
    // [f, d, m6, k]: f 0 sin, 1 cos, 2 tan, 3 a ladder (L = 4 + d % 5 metres) with the sine table; the angle d° (6·m6 + k)′
    parse: none,
    reject: (p) => (!tableOk(p) ? "An angle in the table's range (sine 10°–60°, cosine 30°–80°, tangent 10°–45°) with minutes not a multiple of 6." : null),
    prompt: ([f, d, m6, k]) => {
      const A = `${d}°${6 * m6 + k}′`;
      return f === 3
        ? `A ladder ${4 + (d % 5)} m long leans against a wall and makes an angle of ${A} with the ground. Using the table of natural sines in the picture (with its mean differences), find how high up the wall the ladder reaches, in metres, to 2 decimal places.`
        : `Using the table of natural ${["sines", "cosines", "tangents"][f]} in the picture (with its mean differences), find ${["sin", "cos", "tan"][f]} ${A}.`;
    },
    figure: (p) => tableFig(p),
    solve: (p) => {
      const t = tableRead(p);
      const [f, d] = p;
      return { steps: [step("column", "read", TR, [`${d}°${6 * p[2]}′`], t.base.toFixed(4)), step("mean-difference", f === 1 ? "subtract" : "add", TR, [p[3], t.md], t.value.toFixed(4)), ...(f === 3 ? [step("height", "multiply", HD, [4 + (d % 5), t.value.toFixed(4)], dvAns(f, t.answer))] : [])], answer: dvAns(f, t.answer) };
    },
    // independent: the true value of the ratio from Math.sin / Math.cos / Math.tan, which a 4-figure table matches to
    // about one unit in the last place
    validate: (p, v) => {
      const [f, d, m6, k] = p;
      const ang = rad(d + (6 * m6 + k) / 60);
      const exact = [Math.sin, Math.cos, Math.tan, Math.sin][f](ang) * (f === 3 ? 4 + (d % 5) : 1);
      // the ladder: the true height rounded to 2 decimal places
      if (f === 3) return Math.abs(nv(v) * 100 - Math.round(exact * 100)) < 1e-6;
      return Math.abs(nv(v) - exact) <= 1.5e-4;
    },
    bugs: (p) => tableBugs(p),
    distractors: (p) => {
      const t = tableRead(p);
      const L = p[0] === 3 ? 4 + (p[1] % 5) : 1;
      return [t.base + (p[0] === 1 ? -1 : 1) * 0.001 * 3, t.next, t.base + 0.01].map((x) => dvAns(p[0], x * L)).filter((x) => x !== dvAns(p[0], t.answer));
    },
    variants: () => [],
    explain: (s) => (s.id === "column" ? `In the ${String(s.inputs[0]).split("°")[0]}° row, under ${String(s.inputs[0]).split("°")[1]}: ${s.value}` : s.id === "mean-difference" ? `${s.op === "subtract" ? "Subtract" : "Add"} the mean difference for ${s.inputs[0]}′ (${s.inputs[1]} in the last place): ${s.value}` : `Height = ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} m`),
    domain: [[0, 3], [10, 80], [0, 9], [1, 5]],
    keep: (p) => tableOk(p),
    cap: 400,
    difficulty: ([f]) => (f === 0 ? 1 : f === 1 ? 3 : 2),
    teach: {
      idea: "A table gives each ratio to four decimal places for every 6′; for the minutes in between, the mean-difference columns give the small change to add (for sine and tangent, which increase) or to subtract (for cosine, which decreases).",
      method: "Find the row of the degrees and the column of the largest multiple of 6′ not above the minutes; read the value. Then read the mean difference for the extra minutes in the same row and add it (subtract for cosines) in the last decimal place.",
      alternatives: [
        { id: "between", title: "It must lie between two entries", kind: "conceptual", text: ["Your answer must lie between the table entries for the 6′ just below and just above the angle.", "For a cosine the later entry is smaller: so the mean difference is taken away."] },
      ],
    },
    limits: "Four-figure tables generated for sin, cos and tan of whole degrees in a range where the mean differences are reliable; logarithm tables are not used.",
  },
  // ============================================================== gap@1: probability with counting
  {
    id: "anncr",
    arity: 5,
    title: "Probability by counting selections",
    competency: PROB,
    type: "fraction",
    mc: true,
    // [kind, m, w, r, k]: kind 0 a committee of r from m boys and w girls with exactly k girls; kind 1 r bulbs from m good
    // and w faulty with exactly k faulty; kind 2 a committee with at least one girl (k = 0)
    parse: none,
    reject: (p) => (!ncrOk(p) ? "m and w from 2 to 8 (at most 12 in all), choosing 2 to 4, with a possible event." : null),
    prompt: ([kind, m, w, r, k]) =>
      kind === 0
        ? `A committee of ${r} is chosen at random from ${m} boys and ${w} girls. What is the probability that it has ${k === 0 ? "no girls" : `exactly ${k} ${k === 1 ? "girl" : "girls"}`}?`
        : kind === 1
          ? `A box has ${m} good bulbs and ${w} faulty bulbs. ${r} bulbs are taken out together at random. What is the probability that exactly ${k} of them ${k === 1 ? "is" : "are"} faulty?`
          : `A committee of ${r} is chosen at random from ${m} boys and ${w} girls. What is the probability that it has at least one girl?`,
    solve: ([kind, m, w, r, k]) => {
      const all = ncr(m + w, r);
      if (kind === 2) return { steps: [step("total", "count", PERMC, [m + w, r], all), step("none", "count", PERMC, [m, r], ncr(m, r)), step("complement", "subtract", COMP, [ncr(m, r), all], 1 - ncr(m, r) / all)], answer: 1 - ncr(m, r) / all };
      const fav = ncr(w, k) * ncr(m, r - k);
      return { steps: [step("total", "count", PERMC, [m + w, r], all), step("favourable", "multiply", PERMC, [ncr(w, k), ncr(m, r - k)], fav), step("probability", "divide", PROB, [fav, all], fav / all)], answer: fav / all };
    },
    // independent: list every selection of r people (bit patterns) and count those in the event
    validate: ([kind, m, w, r, k], v) => {
      const n = m + w;
      let all = 0;
      let hit = 0;
      for (let mask = 0; mask < 1 << n; mask++) {
        let c = 0;
        let g = 0;
        for (let i = 0; i < n; i++)
          if (mask & (1 << i)) {
            c++;
            if (i < w) g++;
          }
        if (c !== r) continue;
        all++;
        if (kind === 2 ? g >= 1 : g === k) hit++;
      }
      return close(nv(v), hit / all);
    },
    bugs: ([kind, m, w, r, k]) => {
      const n = m + w;
      const all = ncr(n, r);
      const right = kind === 2 ? 1 - ncr(m, r) / all : (ncr(w, k) * ncr(m, r - k)) / all;
      const pr = (x: number) => (x > 1 || x < 0 || close(x, right) ? null : x);
      if (kind === 2) return [{ id: "exactly-one", kind: "conceptual", competency: COMP, says: "'Exactly one girl' was found; 'at least one' also includes two or more girls — easiest as 1 − P(no girl).", predict: pr((ncr(w, 1) * ncr(m, r - 1)) / all) }, { id: "complement-of-one", kind: "procedural", competency: COMP, says: "1 − P(exactly one girl) was found; the complement of 'at least one girl' is 'no girl'.", predict: pr(1 - (ncr(w, 1) * ncr(m, r - 1)) / all) }].filter((b) => b.predict !== null) as Bug[];
      return [
        { id: "rest-not-chosen", kind: "procedural", competency: PERMC, says: `Only the ways to choose the ${k === 1 ? (kind === 0 ? "one girl" : "one faulty bulb") : `${k} ${kind === 0 ? "girls" : "faulty bulbs"}`} were counted; the other ${r - k === 1 ? "one" : r - k} must be chosen from the ${m} ${kind === 0 ? "boys" : "good bulbs"} too, and the two counts multiply.`, predict: pr(ncr(w, k) / all) },
        { id: "with-replacement", kind: "conceptual", competency: PROB, says: "Each choice was treated as independent with the same chance, as if each one were put back; the selection is made together, so count selections with combinations.", predict: n ** r <= 1000 ? pr(ncr(r, k) * (w / n) ** k * (m / n) ** (r - k)) : null },
      ].filter((b) => b.predict !== null) as Bug[];
    },
    distractors: ([kind, m, w, r, k]) => {
      const all = ncr(m + w, r);
      const right = kind === 2 ? 1 - ncr(m, r) / all : (ncr(w, k) * ncr(m, r - k)) / all;
      return [k / r, w / (m + w), 1 - right].filter((x) => x >= 0 && x <= 1 && !close(x, right));
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `All selections: ${s.inputs[0]}C${s.inputs[1]} = ${s.value}` : s.id === "favourable" ? `Favourable: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "none" ? `Selections with no girl: ${s.inputs[0]}C${s.inputs[1]} = ${s.value}` : `P = ${fmt(Number(s.value))}`),
    domain: [[0, 2], [2, 8], [2, 8], [2, 4], [0, 4]],
    keep: (p) => ncrOk(p),
    range: [0, 1],
    cap: 400,
    // level@1: probability by counting selections with ⁿCᵣ is Grade 11 (NCERT Class 11, Ch. 14)
    grade: () => 11,
    difficulty: ([kind, , , r]) => (kind === 2 ? 3 : r === 2 ? 1 : 2),
    teach: {
      idea: "When r things are chosen together at random, every selection is equally likely, so P = (number of favourable selections)/(number of all selections), each counted with ⁿCᵣ.",
      method: "All selections: ⁿCᵣ. Favourable: choose the k of one kind and the r − k of the other kind, and multiply the two counts. For 'at least one', use 1 − P(none).",
      alternatives: [
        { id: "small-list", title: "List a small case", kind: "procedural", text: ["With 3 boys and 2 girls choosing 2, list all 10 pairs.", "Count the pairs with one girl (6): the formula ²C₁ × ³C₁ = 6 matches."] },
      ],
    },
    limits: "Selections of 2 to 4 from two kinds (at most 12 in all); arrangements (permutations) are not used.",
  },
];

// ---------------------------------------------------------------- gap@1 helpers
const PERMC = "MATH.algebra.permutations";
const AVGAV = ["Yes, because the two sections have the same number of students", "No: the true mean is higher, because the section with the higher mean has more students", "No: the true mean is lower, because the section with the lower mean has more students", "Yes: the average of the two means is always the mean of everyone"];
function avgavOf([n1, i1, dn, i2]: number[]) {
  return { n1, m1: 40 + 2 * i1, n2: n1 + 5 * dn, m2: 40 + 2 * i2 };
}
function avgavAnswer(p: number[]): number {
  const { n1, m1, n2, m2 } = avgavOf(p);
  const t = (n1 * m1 + n2 * m2) / (n1 + n2);
  return n1 === n2 ? 0 : t > (m1 + m2) / 2 ? 1 : 2;
}
/** angstep: Σfd (m = 0) or Σfu (m = 1) about the middle class mark. */
function stepSum(p: number[]): number {
  const g = grouped(p.slice(1));
  return g.fs.reduce((s, f, i) => s + f * (i - 2), 0) * (p[0] === 0 ? g.h : 1);
}
/** anfmed: the table, cumulative frequencies and the median. */
function fmedOf([x0, st, seed]: number[]) {
  const R = gen(hash(x0, st, seed, 11));
  const xs = [0, 1, 2, 3, 4].map((i) => x0 + i * st);
  const fs = xs.map(() => R(1, 9));
  const N = fs.reduce((a, b) => a + b, 0);
  const cf: number[] = [];
  fs.reduce((a, f) => (cf.push(a + f), a + f), 0);
  const at = (pos: number) => xs[cf.findIndex((c) => c >= pos)];
  const med = N % 2 ? at((N + 1) / 2) : (at(N / 2) + at(N / 2 + 1)) / 2;
  return { xs, fs, N, cf, at, med };
}
/** anempir kind 0: a frequency table with a single mode. */
function empTable([, M, , seed]: number[]) {
  const R = gen(hash(M, seed, 13));
  const st = 1 + (seed % 4);
  const xs = [0, 1, 2, 3, 4, 5].map((i) => M + i * st);
  const fs = xs.map(() => R(1, 12));
  const top = Math.max(...fs);
  return { xs, fs, mode: xs[fs.indexOf(top)], unique: fs.filter((f) => f === top).length === 1 };
}
const SURE_CH = ["an impossible event, with probability 0", "a sure event, with probability 1", "neither: its probability is between 0 and 1"];
const DIE = [1, 2, 3, 4, 5, 6];
const PAIRS2 = DIE.flatMap((a) => DIE.map((b) => [a, b]));
const SURE: { say: (k: number, j: number) => string; ok: (k: number, j: number) => boolean; outcomes: (k: number, j: number) => number[][]; test: (o: number[], k: number, j: number) => boolean }[] = [
  { say: (k) => `A fair die is thrown. Event: "the number shown is less than ${k}".`, ok: (k, j) => k >= 1 && k <= 8 && j === 0, outcomes: () => DIE.map((x) => [x]), test: ([x], k) => x < k },
  { say: (k) => `A fair die is thrown. Event: "the number shown is greater than ${k}".`, ok: (k, j) => k >= 0 && k <= 7 && j === 0, outcomes: () => DIE.map((x) => [x]), test: ([x], k) => x > k },
  { say: (k) => `A fair die is thrown. Event: "the number shown is a multiple of ${k}".`, ok: (k, j) => k >= 1 && k <= 8 && j === 0, outcomes: () => DIE.map((x) => [x]), test: ([x], k) => x % k === 0 },
  { say: (k) => `Two fair dice are thrown together. Event: "the sum of the two numbers is ${k}".`, ok: (k, j) => k >= 1 && k <= 13 && j === 0, outcomes: () => PAIRS2, test: ([a, b], k) => a + b === k },
  { say: (k) => `Two fair dice are thrown together. Event: "the sum of the two numbers is at most ${k}".`, ok: (k, j) => k >= 1 && k <= 12 && j === 0, outcomes: () => PAIRS2, test: ([a, b], k) => a + b <= k },
  { say: (k, j) => `A bag has ${k} red and ${j} blue balls. One ball is taken out without looking. Event: "the ball is ${["green", "red", "red or blue"][(k + j) % 3]}".`, ok: (k, j) => k >= 1 && k <= 6 && j >= 1 && j <= 6, outcomes: (k, j) => [...Array(k + j).keys()].map((i) => [i < k ? 0 : 1]), test: ([c], k, j) => [false, c === 0, true][(k + j) % 3] },
  { say: (k, j) => `Cards numbered 1 to ${10 + k} are shuffled and one is drawn. Event: "the number on the card is ${[`at most ${10 + k}`, `greater than ${10 + k}`, "an even number"][j]}".`, ok: (k, j) => k >= 0 && k <= 10 && j <= 2, outcomes: (k) => [...Array(10 + k).keys()].map((i) => [i + 1]), test: ([x], k, j) => [x <= 10 + k, x > 10 + k, x % 2 === 0][j] },
];
function sureCount(e: number, k: number, j: number) {
  const outs = SURE[e].outcomes(k, j);
  return { fav: outs.filter((o) => SURE[e].test(o, k, j)).length, all: outs.length };
}
/** anaxiom: four assignments (one valid, one short of 1, one over 1, one with a negative value), in a fixed order. */
function axiomOpts(s: number): { text: string; kind: string; nums: number[]; den: number }[] {
  const R = gen(hash(s, 5, 17));
  const den = [6, 8, 10, 12, 15, 20][R(0, 5)];
  const n1 = R(1, den - 3);
  const n2 = R(1, den - n1 - 2);
  const n3 = R(1, den - n1 - n2 - 1);
  const valid = [n1, n2, n3, den - n1 - n2 - n3];
  const mod = (f: (xs: number[]) => void) => {
    const xs = [...valid];
    f(xs);
    return xs;
  };
  const i = R(0, 3);
  const j = (i + 1 + R(0, 2)) % 4;
  const short = mod((xs) => (xs[i] -= 1));
  const over = mod((xs) => (xs[j] += 1));
  const negative = mod((xs) => {
    const a = R(0, 3);
    const b = (a + 1 + R(0, 2)) % 4;
    xs[a] += xs[b] + 1;
    xs[b] = -1;
  });
  const fr = (n: number) => (n < 0 ? `−${probText(-n, den)}` : probText(n, den));
  const text = (xs: number[]) => xs.map((n, k) => `P(ω${"₁₂₃₄"[k]}) = ${fr(n)}`).join(", ");
  const all = [
    { text: text(valid), kind: "valid", nums: valid, den },
    { text: text(short), kind: "short", nums: short, den },
    { text: text(over), kind: "over", nums: over, den },
    { text: text(negative), kind: "negative", nums: negative, den },
  ];
  const ord = [0, 1, 2, 3].map((x) => ({ x, k: hash(s, x, 23) })).sort((a, b) => a.k - b.k).map((o) => o.x);
  return ord.map((x) => all[x]);
}
const compsPhi = (t: number) => ((t * 7) % 60) + 15;
// antable: four-figure tables generated from the functions themselves
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const dv4 = (x: number): Value => String(r4(x));
/** The answer as asked: the ladder's height to 2 decimal places, a table value to 4. */
const dvAns = (f: number, x: number): string => (f === 3 ? String(Math.round(x * 100) / 100) : String(r4(x)));
const tfun = (f: number, d: number, min: number) => [Math.sin, Math.cos, Math.tan][f === 3 ? 0 : f](rad(d + min / 60));
/** The mean difference for k minutes in the row of d°, in units of the 4th decimal place (from the slope mid-row). */
const mdOf = (f: number, d: number, k: number) => Math.round((Math.abs(tfun(f, d, 36) - tfun(f, d, 24)) / 12) * k * 1e4);
function tableRead([f, d, m6, k]: number[]) {
  const base = r4(tfun(f, d, 6 * m6));
  const md = mdOf(f, d, k);
  const value = r4(base + (f === 1 ? -md : md) / 1e4);
  const L = f === 3 ? 4 + (d % 5) : 1;
  return { base, md, value, answer: r4(value * L), next: r4(tfun(f, d, 6 * m6 + 6)), L };
}
function tableExact([f, d, m6, k]: number[]) {
  return tfun(f, d, 6 * m6 + k) * (f === 3 ? 4 + (d % 5) : 1);
}
function tableBugsAll(p: number[]) {
  const [f, d, m6, k] = p;
  const t = tableRead(p);
  const L = t.L;
  const M = 6 * m6 + k;
  return [
    { id: "mean-difference-left-out", kind: "procedural", competency: TR, says: `Only the entry for ${d}°${6 * m6}′ was read; the extra ${k}′ need the mean difference from the same row.`, value: r4(t.base * L) },
    f === 1
      ? { id: "mean-difference-added", kind: "procedural", competency: TR, says: "The mean difference was added; cosines DEcrease as the angle grows, so for a cosine it is subtracted.", value: r4(r4(t.base + t.md / 1e4) * L) }
      : { id: "next-column", kind: "procedural", competency: TR, says: `The entry for ${d}°${6 * m6 + 6}′ (the next column) was read; take the column just below the minutes and add the mean difference.`, value: r4(t.next * L) },
    { id: "minutes-as-decimal", kind: "conceptual", competency: TR, says: `${d}°${M}′ was read as ${d}.${String(M).padStart(2, "0")}°; there are 60 minutes in a degree, not 100.`, value: r4(r4([Math.sin, Math.cos, Math.tan][f === 3 ? 0 : f](rad(d + M / 100))) * L) },
  ];
}
function tableBugs(p: number[]): Bug[] {
  const t = tableRead(p);
  const L = t.L;
  const ex = tableExact(p);
  return tableBugsAll(p)
    .filter((b) => Math.abs(b.value - ex) > 2e-4 * L && (p[0] !== 3 || dvAns(3, b.value) !== dvAns(3, t.answer)))
    .map((b) => ({ id: b.id, kind: b.kind as Bug["kind"], competency: b.competency, says: b.says, predict: dvAns(p[0], b.value) }));
}
function tableOk(p: number[]): boolean {
  const [f, d, m6, k] = p;
  if (!(f >= 0 && f <= 3 && m6 >= 0 && m6 <= 9 && k >= 1 && k <= 5)) return false;
  const [lo, hi] = f === 1 ? [30, 79] : f === 2 ? [10, 44] : [10, 59];
  if (d < lo || d > hi) return false;
  const t = tableRead(p);
  // the ladder: the table's height and the true height round to the same 2 decimal places, away from a rounding edge
  const ex = tableExact(p);
  const edge = f !== 3 || (Math.abs(((ex * 100) % 1) - 0.5) > 0.15 && dvAns(3, t.answer) === dvAns(3, ex));
  return t.md >= 4 && Math.abs(t.answer - ex) <= 1.2e-4 * t.L && edge && tableBugs(p).length >= 1;
}
function tableFig([f, d]: number[]) {
  const row = (D: number) => [`${D}°`, ...[...Array(10).keys()].map((j) => r4(tfun(f, D, 6 * j)).toFixed(4)), ...[1, 2, 3, 4, 5].map((k) => String(mdOf(f, D, k)))];
  return { type: "table" as const, title: `Natural ${["sines", "cosines", "tangents", "sines"][f]}`, head: ["", ...[...Array(10).keys()].map((j) => `${6 * j}′`), "1′", "2′", "3′", "4′", "5′"], rows: [row(d), row(d + 1)] };
}
function ncr(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
function ncrOk([kind, m, w, r, k]: number[]): boolean {
  if (!(kind >= 0 && kind <= 2 && m >= 2 && m <= 8 && w >= 2 && w <= 8 && m + w <= 12 && r >= 2 && r <= 4)) return false;
  if (kind === 2) return k === 0 && r <= m;
  return k >= 0 && k <= r && k <= w && r - k <= m && !(kind === 1 && k === 0);
}
