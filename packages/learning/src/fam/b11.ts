/**
 * families@2, batch b11 (Grades 6–8): scientific notation; square roots by prime factorisation, estimating roots and
 * the numbers between consecutive squares; probability on the 0–1 scale, experimental probability, counting
 * outcomes and two-stage sample spaces; tracing algorithms and the subtraction (Euclid) game; Kaprekar's routine,
 * Collatz sequences and the odd-number square pattern; divisibility tests with a missing digit; magic squares;
 * missing-digit additions; parity of sums and products; proportional versus additive change; shift ciphers;
 * "think of a number" tricks; frequency tables (ungrouped and grouped); percentages read from a bar chart; median,
 * mode and the mean of a frequency table; reading histograms. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { gcd, near, neg, sup } from "../family-kit";

const SCI = "MATH.number.scientific-notation";
const SQ = "MATH.number.square-roots";
const CH = "MATH.probability.chance-language";
const EXPR = "MATH.probability.experimental";
const SS = "MATH.probability.sample-space";
const ALG = "MATH.reasoning.algorithms-flowcharts";
const CONJ = "MATH.reasoning.conjecture-testing";
const DIV = "MATH.reasoning.divisibility";
const GRID = "MATH.reasoning.number-grid-puzzles";
const DIG = "MATH.reasoning.digit-puzzles";
const PAR = "MATH.reasoning.parity";
const PROP = "MATH.reasoning.proportional-check";
const CIPH = "MATH.reasoning.coding-ciphers";
const PROOF = "MATH.reasoning.proof-intro";
const FREQ = "MATH.statistics.data-frequency";
const DISP = "MATH.statistics.evaluate-data-displays";
const MED = "MATH.statistics.median-mode";
const HIST = "MATH.statistics.histograms";
const EXP = "MATH.number.exponents";
const PF = "MATH.number.prime-factorisation";
const FM = "MATH.number.factors-multiples";
const HL = "MATH.number.hcf-lcm";
const EO = "MATH.number.even-odd";
const RATIO = "MATH.number.ratio";
const PROPN = "MATH.number.proportion";
const PCT = "MATH.number.percentage";
const AVG = "MATH.statistics.averages-intro";
const ADD = "MATH.number.addition";
const SUB = "MATH.number.subtraction";
const ADDR = "MATH.number.addition-regroup";
const SUBR = "MATH.number.subtraction-regroup";
const MDAS = "MATH.number.multi-digit-add-subtract";
const VAR = "MATH.algebra.variables";
const PAT = "MATH.algebra.pattern-rules";
const BAR = "MATH.statistics.bar-charts";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi", "Farhan", "Lakshmi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const bug = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null, probe?: string): Bug => ({ id, kind, competency, says, predict, ...(probe ? { probe } : {}) });

/** A small deterministic random generator seeded by the parameters (the same parameters always give the same data). */
const rng = (...seed: number[]) => {
  let s = 2166136261 >>> 0;
  for (const v of seed) {
    s ^= (v + 1013) >>> 0;
    s = Math.imul(s, 16777619) >>> 0;
  }
  s ^= s >>> 15;
  if (!s) s = 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
};
const ri = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const shuffle = <T,>(r: () => number, xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pow10 = (k: number) => {
  let v = 1;
  for (let i = 0; i < k; i++) v *= 10;
  return v;
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Indian grouping: 4,52,00,000. */
const inr = (n: number) => {
  const s = String(n);
  if (s.length <= 3) return s;
  const parts: string[] = [];
  let rest = s.slice(0, -3);
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(",")},${s.slice(-3)}`;
};
/** The numbers of a tuple answer "(a, b)". */
const tup = (v: Value) => (typeof v === "string" ? v.replace(/[()\s]/g, "").replace(/−/g, "-").split(",").map(Number) : []);
const T2 = (a: number | string, b: number | string) => `(${a}, ${b})`;
const ord = (k: number) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? "th" : k % 10 === 1 ? "st" : k % 10 === 2 ? "nd" : k % 10 === 3 ? "rd" : "th"}`;
const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const fracText = (p: number, q: number) => (p === 0 ? "0" : p === q ? "1" : `${p / gcd(p, q)}/${q / gcd(p, q)}`);

// ================================================================ scientific notation
/** m × 10^(e − 2), i.e. (m/100) × 10^e, as ordinary digits: 4,52,00,000 or 0.000452. */
const sciPlain = (m: number, e: number) => {
  const z = e - 2;
  if (z >= 0) return inr(m * pow10(z));
  return `0.${String(m).padStart(-z, "0")}`;
};
const sciA = (m: number) => String(m / 100);
/** a × 10^e as an ordinary number (exact for these sizes). */
const sciValue = (m: number, e: number) => (e >= 2 ? m * pow10(e - 2) : m / pow10(2 - e));

// ================================================================ square roots
const primeFactors = (n: number) => {
  const out: number[] = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % p === 0) {
    out.push(p);
    m /= p;
  }
  if (m > 1) out.push(m);
  return out;
};
const sqText = (d: number, n: number) => {
  const N = n * n;
  if (!d) return String(N);
  return `${Math.floor(N / 100)}.${String(N % 100).padStart(2, "0")}`;
};

// ================================================================ experiments
const EXPC = [
  { act: "tossed a coin", outs: ["Head", "Tail"], ev: (j: number) => (j ? "getting a tail" : "getting a head"), ns: [20, 30, 40, 50] },
  { act: "rolled a die", outs: ["1", "2", "3", "4", "5", "6"], ev: (j: number) => `rolling a ${j + 1}`, ns: [30, 50, 60, 100] },
  { act: "spun a spinner with four equal parts", outs: ["Red", "Blue", "Green", "Yellow"], ev: (j: number) => `landing on ${["red", "blue", "green", "yellow"][j]}`, ns: [20, 40, 50, 80] },
];
const expData = (c: number, s: number) => {
  const r = rng(7, c, s);
  const C = EXPC[c];
  const n = C.ns[ri(r, 0, 3)];
  const k = C.outs.length;
  const f = Array(k).fill(1) as number[];
  for (let i = k; i < n; i++) f[Math.floor(r() * k)]++;
  return { n, f };
};

// ================================================================ two-stage experiments
const dname = (m: number) => (m === 6 ? "an ordinary die" : `a spinner numbered 1 to ${m}`);
const pairName = (m: number, n: number) => (m === 6 && n === 6 ? "two ordinary dice" : m === n ? `two spinners, each numbered 1 to ${m}` : `${dname(m)} and ${dname(n)}`);
const diceHit = (q: number, s: number, a: number, b: number) => (q === 0 ? a + b === s : q === 1 ? a + b >= s : b > a);
const diceEvent = (q: number, s: number) => (q === 0 ? `the total of the two numbers is ${s}` : q === 1 ? `the total of the two numbers is ${s} or more` : "the second number is bigger than the first");

// ================================================================ magic squares
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const magicCells = (c: number, x: number, y: number) => [c + x, c - x - y, c + y, c - x + y, c, c + x - y, c - y, c + x + y, c - x];
const hiddenOther = (t: number) => (t === 4 ? 0 : 8 - t);
const magicLines = (t: number) => {
  const h = hiddenOther(t);
  return { full: LINES.find((l) => !l.includes(t) && !l.includes(h))!, own: LINES.find((l) => l.includes(t) && !l.includes(h))! };
};

// ================================================================ parity
const PTYPES: [string, string][] = [["+", "oo"], ["+", "oe"], ["+", "ee"], ["+", "ooo"], ["+", "ooe"], ["×", "oo"], ["×", "oe"], ["×", "ee"], ["×", "ooo"], ["−", "oe"], ["−", "oo"], ["−", "eo"]];
const parData = (s: number) => {
  const r = rng(13, s);
  const kinds = shuffle(r, [...PTYPES.keys()]).slice(0, 5);
  return kinds.map((k) => {
    const [op, pat] = PTYPES[k];
    const pick = (want: number, lo: number, hi: number) => {
      let n = ri(r, lo, hi);
      if (n % 2 !== want) n = n + 1 > hi ? n - 1 : n + 1;
      return n;
    };
    let nums: number[];
    if (op === "×") nums = shuffle(r, pat.split("").map((c) => pick(c === "o" ? 1 : 0, 11, 98)));
    else if (op === "−") nums = [pick(pat[0] === "o" ? 1 : 0, 500, 998), pick(pat[1] === "o" ? 1 : 0, 101, 498)];
    else nums = shuffle(r, pat.split("").map((c) => pick(c === "o" ? 1 : 0, 101, 998)));
    return { op, nums };
  });
};
const parText = (e: { op: string; nums: number[] }) => e.nums.join(` ${e.op} `);

// ================================================================ ciphers
const WORDS = ["RIVER", "MANGO", "TIGER", "PAPER", "CLOUD", "LAMP", "SCHOOL", "GARDEN", "PLANET", "TRAIN", "BREAD", "LOTUS", "KITE", "MARKET", "ORANGE", "PENCIL", "CANDLE", "WATER", "FOREST", "BRIDGE"];
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const shiftWord = (w: string, k: number) => w.split("").map((ch) => String.fromCharCode(65 + ((ch.charCodeAt(0) - 65 + k) % 26))).join("");

// ================================================================ data
const FQC = [
  { what: "the number of people in the families of 24 students", lo: 2, hi: 7, n: 24, ask0: (v: number) => `How many families have exactly ${v} people?`, ask1: (t: number) => `How many families have more than ${t} people?`, listed: "family sizes" },
  { what: "the shoe sizes of 24 students", lo: 3, hi: 8, n: 24, ask0: (v: number) => `How many students wear size ${v}?`, ask1: (t: number) => `How many students wear a size bigger than ${t}?`, listed: "shoe sizes" },
  { what: "the quiz marks (out of 10) of 25 students", lo: 3, hi: 10, n: 25, ask0: (v: number) => `How many students scored exactly ${v}?`, ask1: (t: number) => `How many students scored more than ${t}?`, listed: "quiz marks" },
];
const freqData = (c: number, s: number, q: number) => {
  const r = rng(17, c, s, q);
  const C = FQC[c];
  const xs = Array.from({ length: C.n }, () => Math.round((ri(r, C.lo, C.hi) + ri(r, C.lo, C.hi)) / 2));
  const count = (v: number) => xs.filter((x) => x === v).length;
  const vals = [...Array(C.hi - C.lo + 1).keys()].map((i) => C.lo + i);
  let v: number;
  if (q === 0) {
    const ok = vals.filter((x) => count(x) >= 2);
    v = ok[Math.floor(r() * ok.length)] ?? xs[0];
  } else {
    const ok = vals.filter((t) => t > C.lo && t < C.hi && count(t) >= 1 && xs.some((x) => x > t));
    v = ok[Math.floor(r() * ok.length)] ?? C.lo;
  }
  return { xs, v };
};
const groupData = (s: number) => {
  const r = rng(19, s);
  return shuffle(r, [10, 20, 30, 40, ...Array.from({ length: 26 }, () => ri(r, 0, 49))]);
};
const MEDC = [
  { desc: (n: number) => `the runs scored by a batter in ${n} matches`, lo: 5, hi: 95 },
  { desc: (n: number) => `the heights of ${n} plants, in cm`, lo: 12, hi: 60 },
  { desc: (n: number) => `the highest temperatures, in °C, on ${n} days`, lo: 24, hi: 41 },
  { desc: (n: number) => `the prices of ${n} notebooks, in rupees`, lo: 20, hi: 90 },
];
const medData = (s: number, n: number) => {
  const r = rng(23, s, n);
  const C = MEDC[s % 4];
  const pool = shuffle(r, [...Array(C.hi - C.lo + 1).keys()].map((i) => C.lo + i));
  const xs = pool.slice(0, n);
  const sorted = [...xs].sort((a, b) => a - b);
  if (xs.every((x, i) => x === sorted[i])) [xs[0], xs[n - 1]] = [xs[n - 1], xs[0]];
  return xs;
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const MODEC = [
  { desc: "the shoe sizes of some students", lo: 3, hi: 9 },
  { desc: "the goals scored by a school team in its matches", lo: 0, hi: 5 },
  { desc: "the number of brothers and sisters of some students", lo: 0, hi: 4 },
  { desc: "the marks (out of 10) in a spelling test", lo: 4, hi: 10 },
];
const modeData = (s: number) => {
  const r = rng(29, s);
  const C = MODEC[s % 4];
  const n = ri(r, 9, 12);
  const M = ri(r, C.lo, C.hi);
  const fM = ri(r, 3, 4);
  const xs = Array(fM).fill(M) as number[];
  let guard = 0;
  while (xs.length < n && guard++ < 500) {
    const v = ri(r, C.lo, C.hi);
    if (v !== M && xs.filter((x) => x === v).length < fM - 1) xs.push(v);
  }
  return { xs: shuffle(r, xs), M, fM };
};
/** distinct@1: the first seed (0 … n − 1) that draws each picture or number; a later seed that draws the same one again
 * is rejected, so no question is released twice. Worked out once per family and kept. */
const FIRST = new Map<string, Map<string, number>>();
const isRepeat = (key: string, n: number, sig: (s: number) => string, s: number) => {
  let m = FIRST.get(key);
  if (!m) {
    m = new Map();
    for (let t = 0; t < n; t++) if (!m.has(sig(t))) m.set(sig(t), t);
    FIRST.set(key, m);
  }
  return m.get(sig(s)) !== s;
};
const FMC = [
  { x: "Number of children", f: "Number of families", lo: 0, what: "number of children per family" },
  { x: "Goals scored", f: "Number of matches", lo: 0, what: "number of goals per match" },
  { x: "Books read", f: "Number of students", lo: 1, what: "number of books read per student" },
  { x: "Family size", f: "Number of families", lo: 2, what: "family size" },
];
const fmeanData = (s: number) => {
  const r = rng(31, s);
  const C = FMC[s % 4];
  const xs = [0, 1, 2, 3, 4].map((i) => C.lo + i);
  const fs = xs.map(() => ri(r, 1, 9));
  return { C, xs, fs };
};
const HC = [
  { desc: "marks scored by the students of a class in a test", who: "students", what: "a mark", unit: "", starts: [0, 10, 20, 30], w: 10 },
  { desc: "heights of the students of a class, in cm", who: "students", what: "a height", unit: " cm", starts: [130, 135, 140, 145], w: 5 },
  { desc: "weights of the students of a class, in kg", who: "students", what: "a weight", unit: " kg", starts: [25, 30, 35, 40], w: 5 },
];
const histData = (s: number, q: number) => {
  const r = rng(37, s, q);
  const C = HC[s % 3];
  const L = C.starts[ri(r, 0, 3)];
  const f = [0, 1, 2, 3, 4].map(() => ri(r, 2, 12));
  const j = q === 0 ? ri(r, 0, 4) : q === 2 ? ri(r, 1, 3) : q === 3 ? ri(r, 1, 4) : 0;
  const labels = f.map((_, i) => `${L + i * C.w}–${L + (i + 1) * C.w}`);
  return { C, L, f, j, labels, b: L + j * C.w };
};
const BPC = [
  { desc: "favourite sports of the students of a school", labels: ["Cricket", "Kabaddi", "Football", "Badminton"], ask: ["chose cricket", "chose kabaddi", "chose football", "chose badminton"], whole: "the students" },
  { desc: "ways the students of a school travel to school", labels: ["Walk", "Bus", "Cycle", "Car"], ask: ["walk to school", "come by bus", "come by cycle", "come by car"], whole: "the students" },
  { desc: "fruit sold by a shop in a week, in kg", labels: ["Mango", "Banana", "Guava", "Apple"], ask: ["was mango", "was banana", "was guava", "was apple"], whole: "the fruit sold (by weight)" },
];
const TOTALS = [200, 400, 500, 800];
const barData = (c: number, s: number) => {
  const r = rng(41, c, s);
  const T = TOTALS[ri(r, 0, 3)];
  const u = T / 20;
  let k = [2, 4, 6, 8];
  for (let t = 0; t < 60; t++) {
    const a = ri(r, 1, 9);
    const b = ri(r, 1, 9);
    const cc = ri(r, 1, 9);
    const d = 20 - a - b - cc;
    const cand = [a, b, cc, d];
    if (d >= 1 && new Set(cand).size === 4) {
      k = cand;
      break;
    }
  }
  return { T, u, v: k.map((x) => x * u), k };
};

export const B11: Def[] = [
  // ============================================================ scientific notation: ordinary → a × 10ⁿ
  {
    id: "aksci",
    arity: 2,
    title: "Writing a number in scientific notation",
    competency: SCI,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([m, e]) => (m < 101 || m > 999 || m % 10 === 0 || e < -7 || e > 10 || (e >= 0 && e <= 3) ? "Three significant digits; powers 10⁴ to 10¹⁰ or 10⁻¹ to 10⁻⁷." : null),
    prompt: ([m, e]) => `Write ${sciPlain(m, e)} in scientific notation, a × 10ⁿ with 1 ≤ a < 10. Give your answer as (a, n): for example, 3.5 × 10⁴ is written (3.5, 4).`,
    solve: ([m, e]) => ({
      steps: [
        { id: "point", op: "convert", competency: SCI, inputs: [sciPlain(m, e), sciA(m)], value: e },
        { id: "write", op: "convert", competency: SCI, inputs: [sciA(m), e], value: T2(sciA(m), e) },
      ],
      answer: T2(sciA(m), e),
    }),
    // independent: read the printed digits; count the places from the first non-zero digit to the units place
    validate: ([m, e], v) => {
      const t = tup(v);
      if (t.length !== 2 || t.some((x) => !Number.isFinite(x))) return false;
      const s = sciPlain(m, e).replace(/,/g, "");
      let digits: string;
      let pw: number;
      if (s.startsWith("0.")) {
        const f = s.slice(2);
        const i = f.search(/[1-9]/);
        pw = -(i + 1);
        digits = f.slice(i);
      } else {
        pw = s.length - 1;
        digits = s.replace(/0+$/, "");
      }
      const mant = Number(digits[0] + (digits.length > 1 ? `.${digits.slice(1)}` : ""));
      return t[1] === pw && near(t[0], mant, 1e-12);
    },
    bugs: ([m, e]) => {
      const a = sciA(m);
      const keep = bug("not-between-1-and-10", "conceptual", SCI, `The digits were kept as a whole number (${m}). In scientific notation the first number must be at least 1 and less than 10, so the point goes after the first digit.`, T2(m, e - 2));
      if (e > 0)
        return [
          bug("counted-digits", "procedural", SCI, `The number of digits was used as the power. The point moves one place fewer than the number of digits: count the jumps from the first digit to the end.`, T2(a, e + 1)),
          bug("counted-zeros", "procedural", SCI, "Only the zeros at the end were counted. The point also moves past the other digits after the first one.", T2(a, e - 2)),
          keep,
        ];
      return [
        bug("positive-power", "conceptual", EXP, `The power was written as positive. A number less than 1 has a negative power of 10: ${a} is divided by 10 again and again, not multiplied.`, T2(a, -e), e >= -3 ? `gen:akscid:${m},${e}` : undefined),
        bug("counted-zeros-after-point", "procedural", SCI, "Only the zeros after the decimal point were counted. The point must move past the first non-zero digit too, so it moves one place more.", T2(a, e + 1)),
        keep,
      ];
    },
    distractors: ([m, e]) => [T2(m / 10, e - 1), T2(sciA(m), e - 1), T2(sciA(m), -e)],
    variants: () => [],
    explain: (s) => (s.id === "point" ? (Number(s.value) > 0 ? `Move the decimal point ${s.value} places to the left to get ${s.inputs[1]}, so n = ${s.value}` : `Move the decimal point ${-Number(s.value)} places to the right to get ${s.inputs[1]}, so n = −${-Number(s.value)}`) : `${s.inputs[0]} × 10${sup(String(s.inputs[1]))}, written ${s.value}`),
    domain: [[101, 999], [-7, 10]],
    keep: ([m, e]) => m % 10 !== 0 && (e < 0 || e >= 4),
    cap: 400,
    difficulty: ([, e]) => (e >= 4 && e <= 6 ? 1 : e > 0 || e >= -3 ? 2 : 3),
    word: ([m, e]) =>
      e > 0
        ? `In a science book, ${nm(m)} reads that a distance is ${sciPlain(m, e)} km. Write this distance in scientific notation, a × 10ⁿ with 1 ≤ a < 10, as (a, n).`
        : `In a science lab, ${nm(m)} measures the thickness of a very thin sheet as ${sciPlain(m, e)} m. Write this length in scientific notation, a × 10ⁿ with 1 ≤ a < 10, as (a, n).`,
    teach: {
      idea: "Each place the decimal point moves left divides by 10, so to keep the value the same we multiply by 10 that many times: 45,200 = 4.52 × 10⁴. Moving the point right multiplies by 10, so it is balanced by a negative power: 0.0045 = 4.5 × 10⁻³.",
      method: "Put the point just after the first non-zero digit to get a. Count how many places the point moved: to the left gives a positive n, to the right gives a negative n.",
      alternatives: [
        { id: "place_value", title: "Use the place value of the first digit", kind: "conceptual", text: ["Find the place of the first non-zero digit. In 4,52,000 the 4 is in the lakhs place, and 1,00,000 = 10⁵, so n = 5.", "In 0.00045 the 4 is in the ten-thousandths place, and 1/10000 = 10⁻⁴, so n = −4."], visual: ([m, e]) => (e > 0 ? { type: "table", head: ["Place", "Power of 10"], rows: [["Thousands", "10³"], ["Lakhs", "10⁵"], ["Crores", "10⁷"]] } : { type: "table", head: ["Place", "Power of 10"], rows: [["Tenths", "10⁻¹"], ["Hundredths", "10⁻²"], ["Thousandths", "10⁻³"]] }) },
      ],
    },
    limits: "Numbers with three significant digits, from 10⁴ to 10¹⁰ and from 10⁻¹ to 10⁻⁷; comparing and estimating orders of magnitude are separate skills.",
  },
  // ============================================================ scientific notation: a × 10ⁿ → ordinary
  {
    id: "akscid",
    arity: 2,
    title: "Writing a number in scientific notation as an ordinary number",
    competency: SCI,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    reject: ([m, e]) => (m < 101 || m > 999 || m % 10 === 0 || e < -3 || e > 8 || (e >= 0 && e <= 1) ? "a with three significant digits; powers 10² to 10⁸ or 10⁻¹ to 10⁻³." : null),
    prompt: ([m, e]) => `Write ${sciA(m)} × 10${sup(e)} as an ordinary number.`,
    solve: ([m, e]) => ({
      steps: [{ id: "shift", op: "multiply", competency: SCI, inputs: [sciA(m), e], value: sciValue(m, e) }],
      answer: sciValue(m, e),
    }),
    // independent: divide or multiply the answer by 10 until it lies between 1 and 10, counting the steps
    validate: ([m, e], v) => {
      if (typeof v !== "number" || !(v > 0)) return false;
      let x = v;
      let k = 0;
      while (x >= 10 && k < 40) {
        x /= 10;
        k++;
      }
      while (x < 1 && k > -40) {
        x *= 10;
        k--;
      }
      return k === e && near(x, m / 100, 1e-9);
    },
    bugs: ([m, e]) => {
      if (e > 0)
        return [
          bug("zeros-added", "conceptual", SCI, `${e} zeros were written after the digits ${m}. The power tells how many places the point moves, and the point already has digits after it to move past.`, m * pow10(e)),
          bug("one-place-short", "procedural", SCI, "The point moved one place too few. Count each jump of the point; every jump is one × 10.", e >= 3 ? m * pow10(e - 3) : m / 10),
          bug("wrong-direction", "conceptual", EXP, `The point moved the wrong way. A positive power of 10 makes the number bigger.`, m / pow10(e + 2)),
        ];
      return [
        bug("one-place-extra", "procedural", SCI, "The point moved one place too many: one zero too many was written after the decimal point.", m / pow10(3 - e)),
        bug("one-place-short", "procedural", SCI, "The point moved one place too few. Count each jump of the point; every jump is one ÷ 10.", m / pow10(1 - e)),
        bug("wrong-direction", "conceptual", EXP, `The point moved the wrong way. A negative power of 10 makes the number smaller: 10${sup(e)} means divide by 10 ${-e} ${e === -1 ? "time" : "times"}.`, -e >= 2 ? m * pow10(-e - 2) : m / 10, `gen:aksci:${m},${e}`),
      ];
    },
    variants: () => [],
    explain: (s) => (Number(s.inputs[1]) > 0 ? `Multiply ${s.inputs[0]} by 10 ${s.inputs[1]} times: move the point ${s.inputs[1]} places to the right to get ${s.value}` : `Divide ${s.inputs[0]} by 10 ${-Number(s.inputs[1])} ${Number(s.inputs[1]) === -1 ? "time" : "times"}: move the point ${-Number(s.inputs[1])} places to the left to get ${s.value}`),
    // powers down to 10⁻³ only, so the answer and every option are written in ordinary place-value notation
    domain: [[101, 999], [-3, 8]],
    keep: ([m, e]) => m % 10 !== 0 && (e < 0 || e >= 2),
    cap: 400,
    difficulty: ([, e]) => (e >= 2 && e <= 4 ? 1 : e > 0 || e === -1 ? 2 : 3),
    word: ([m, e]) => `A science magazine gives a length as ${sciA(m)} × 10${sup(e)} metres. ${nm(m + e)} wants to write it as an ordinary number. What is the length, in metres?`,
    teach: {
      idea: "× 10ⁿ moves the decimal point n places to the right; × 10⁻ⁿ moves it n places to the left. Empty places are filled with zeros.",
      method: "Look at the sign of the power. Move the point that many places (right for positive, left for negative), writing zeros in any empty places.",
      alternatives: [
        { id: "repeat", title: "Multiply by 10 one step at a time", kind: "procedural", text: ["Write 10ⁿ as 10 × 10 × … and multiply by 10 once for each factor: 3.07 → 30.7 → 307 → 3070.", "For a negative power, divide by 10 once for each step instead: 3.07 → 0.307 → 0.0307."] },
      ],
    },
    limits: "a with three significant digits and powers from 10⁻³ to 10⁸ (except 10⁰ and 10¹), so every option is a plain decimal.",
  },
  // ============================================================ square roots by prime factorisation
  {
    id: "aksqf",
    arity: 2,
    title: "Square root of a larger perfect square or decimal",
    competency: SQ,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    reject: ([d, n]) => (d < 0 || d > 1 ? "Whole number (0) or decimal (1)." : d === 0 ? (n < 26 || n > 120 ? "√ of whole squares from 26² to 120²." : null) : n < 11 || n > 99 || n % 10 === 0 ? "√ of decimals with two decimal places (1.21 to 98.01)." : null),
    prompt: ([d, n]) => `Find √${sqText(d, n)}.${d ? "" : " (Prime factorisation can help.)"}`,
    solve: ([d, n]) => {
      const pf = primeFactors(n * n);
      const steps: Step[] = [
        { id: "factor", op: "factorise", competency: PF, inputs: [n * n], value: pf.join(" × ") },
        { id: "pairs", op: "evaluate", competency: SQ, inputs: [primeFactors(n).join(" × ")], value: n },
      ];
      if (d) steps.unshift({ id: "drop-point", op: "convert", competency: SQ, inputs: [sqText(d, n), n * n], value: n * n });
      if (d) steps.push({ id: "point", op: "divide", competency: SQ, inputs: [n, 10], value: n / 10 });
      return { steps, answer: d ? n / 10 : n };
    },
    // independent: square the answer back
    validate: ([d, n], v) => {
      if (typeof v !== "number" || v <= 0) return false;
      if (!d) return Number.isInteger(v) && v * v === n * n;
      const t = Math.round(v * 10);
      return near(t, v * 10, 1e-9) && t * t === n * n;
    },
    bugs: ([d, n]) => {
      const sc = d ? 10 : 1;
      const rad = [...new Set(primeFactors(n))].reduce((a, b) => a * b, 1);
      const other = n % 10 !== 0 && n % 10 !== 5 ? Math.floor(n / 10) * 10 + (10 - (n % 10)) : null;
      return [
        bug("halved", "conceptual", SQ, "The number was halved. The square root is the number that multiplied by itself gives the number.", (n * n) / 2 / (sc * sc)),
        ...(rad !== n ? [bug("each-prime-once", "procedural", PF, "Each different prime was taken once. The square root takes one prime from each PAIR of equal primes, so a prime that appears four times gives two.", rad / sc)] : []),
        ...(other !== null && other !== n ? [bug("wrong-last-digit", "procedural", SQ, `Two numbers have squares ending in ${(n * n) % 10}: ${Math.min(n, other)} and ${Math.max(n, other)}. Check which one by squaring, or by comparing with the square of the middle number ${Math.floor(n / 10) * 10 + 5}.`, other / sc)] : []),
        ...(d ? [bug("point-dropped", "procedural", SQ, `The decimal point was left out. ${sqText(d, n)} has two decimal places, so its square root has one.`, n), bug("point-two-places", "procedural", SQ, `The point was put two places in. A number with two decimal places has a square root with one decimal place (0.1 × 0.1 = 0.01).`, n / 100)] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "drop-point" ? `${s.inputs[0]} = ${s.inputs[1]} ÷ 100, so find √${s.inputs[1]} first` : s.id === "factor" ? `${s.inputs[0]} = ${s.value}` : s.id === "pairs" ? `Take one prime from each pair: ${s.inputs[0]} = ${s.value}` : `√100 = 10, so divide by 10: ${s.value}`),
    domain: [[0, 1], [11, 120]],
    keep: ([d, n]) => (d === 0 ? n >= 26 : n <= 99 && n % 10 !== 0),
    difficulty: ([d, n]) => (d === 0 && n <= 50 ? 1 : d === 0 || n <= 30 ? 2 : 3),
    word: ([d, n]) => (d ? `A square photo frame has an area of ${sqText(d, n)} cm². How long is each side of the frame, in cm?` : `A square courtyard is paved with ${sqText(d, n)} square tiles, each 1 m by 1 m. How long is each side of the courtyard, in metres?`),
    teach: {
      idea: "In a perfect square every prime factor appears an even number of times, so the primes split into equal pairs; the square root takes one prime from each pair.",
      method: "Write the number as a product of primes, group equal primes in pairs and multiply one prime from each pair. For a decimal, find the root without the point, then give the answer half as many decimal places.",
      alternatives: [
        { id: "last_digit", title: "Tens and the last digit", kind: "procedural", text: ["Find two square tens around the number: 70² = 4900 and 80² = 6400, so √5476 is in the seventies.", "The last digit 6 comes from 4² or 6², so try 74 and 76: 74² = 5476."] },
      ],
    },
    limits: "Whole squares from 26² to 120², and decimals with two decimal places from 1.21 to 98.01; long division is done in class.",
  },
  // ============================================================ estimating a square root
  {
    id: "aksqe",
    arity: 1,
    title: "Between which two whole numbers a square root lies",
    competency: SQ,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([N]) => (N < 2 || N > 999 || Number.isInteger(Math.sqrt(N)) ? "Whole numbers 2 to 999 that are not perfect squares." : null),
    prompt: ([N]) => `√${N} lies between two consecutive whole numbers. Which two? Give the answer as (smaller, larger), for example (40, 41).`,
    solve: ([N]) => {
      let a = 1;
      while ((a + 1) * (a + 1) < N) a++;
      return {
        steps: [
          { id: "below", op: "square", competency: SQ, inputs: [a], value: a * a },
          { id: "above", op: "square", competency: SQ, inputs: [a + 1], value: (a + 1) * (a + 1) },
        ],
        answer: T2(a, a + 1),
      };
    },
    // independent: square both numbers back and check they are consecutive and bracket N
    validate: ([N], v) => {
      const t = tup(v);
      return t.length === 2 && Number.isInteger(t[0]) && t[1] === t[0] + 1 && t[0] * t[0] < N && N < t[1] * t[1];
    },
    bugs: ([N]) => {
      const a = Math.floor(Math.sqrt(N));
      const h = Math.floor(N / 2);
      const tenth = Math.floor(N / 10);
      return [
        bug("halved", "conceptual", SQ, `${N} was halved. The square root is the number that multiplied by itself gives ${N}.`, T2(h, h + 1)),
        ...(N >= 100 ? [bug("divided-by-ten", "conceptual", SQ, `${N} was divided by 10. Square to check: ${tenth} × ${tenth} is far more than ${N}.`, T2(tenth, tenth + 1))] : []),
        bug("next-squares", "procedural", SQ, `The wrong pair of squares was used. Check by squaring: the smaller number squared must be below ${N} and the larger one squared above it.`, [T2(a + 1, a + 2), T2(a - 1, a)]),
      ];
    },
    distractors: ([N]) => {
      const a = Math.floor(Math.sqrt(N));
      return [T2(a + 1, a + 2), T2(a - 1, a), T2(a, a + 2)];
    },
    variants: () => [],
    explain: (s) => (s.id === "below" ? `${s.inputs[0]}² = ${s.value}, which is less than the number` : `${s.inputs[0]}² = ${s.value}, which is more than the number`),
    domain: [[2, 999]],
    cap: 300,
    difficulty: ([N]) => (N < 100 ? 1 : N < 400 ? 2 : 3),
    word: ([N]) => `A square garden has an area of ${N} m². The length of its side, in metres, lies between which two consecutive whole numbers? Give the answer as (smaller, larger).`,
    teach: {
      idea: "If a² < N < (a + 1)², then a < √N < a + 1, because bigger numbers have bigger square roots.",
      method: "List the squares 1, 4, 9, 16, 25 … until you pass the number. The two square roots on either side of it are the answer.",
      visual: ([N]) => {
        const a = Math.floor(Math.sqrt(N));
        return { type: "numberline", from: a * a, to: (a + 1) * (a + 1), marks: [N] };
      },
      alternatives: [
        { id: "square_table", title: "A table of squares", kind: "procedural", text: ["Write a table: 10² = 100, 20² = 400, 30² = 900. Find the tens first.", "Then square the numbers in that ten one by one until you pass the number."] },
      ],
    },
    limits: "Whole numbers up to 999; finding the root to one decimal place is a separate skill.",
  },
  // ============================================================ numbers between consecutive squares
  {
    id: "aksqb",
    arity: 1,
    title: "How many numbers lie between two consecutive squares",
    competency: SQ,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n]) => (n < 2 || n > 99 ? "n from 2 to 99." : null),
    prompt: ([n]) => (n <= 12 ? `How many whole numbers lie between ${n}² = ${n * n} and ${n + 1}² = ${(n + 1) * (n + 1)}, not counting these two squares?` : `How many whole numbers lie between ${n}² and ${n + 1}², not counting these two squares? (Look for a pattern instead of listing them.)`),
    solve: ([n]) => ({
      steps: [
        { id: "gap", op: "subtract", competency: SQ, inputs: [(n + 1) * (n + 1), n * n], value: 2 * n + 1 },
        { id: "inside", op: "subtract", competency: SQ, inputs: [2 * n + 1, 1], value: 2 * n },
      ],
      answer: 2 * n,
    }),
    // independent: count them one by one
    validate: ([n], v) => {
      let c = 0;
      for (let k = n * n + 1; k < (n + 1) * (n + 1); k++) c++;
      return v === c;
    },
    bugs: ([n]) => [
      bug("difference-of-squares", "procedural", SQ, `The two squares were subtracted (${2 * n + 1}). That counts the steps from one square to the next; the numbers strictly between are one fewer.`, 2 * n + 1),
      bug("ends-included", "procedural", SQ, "The two squares themselves were counted. The question asks only for the numbers between them.", 2 * n + 2),
      bug("just-n", "conceptual", SQ, `The answer was taken as ${n}. Try a small case: between 2² = 4 and 3² = 9 there are 5, 6, 7, 8 — four numbers, which is 2 × 2.`, n),
    ],
    variants: () => [],
    explain: (s) => (s.id === "gap" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `Leave out the square at the end: ${s.inputs[0]} − 1 = ${s.value}`),
    domain: [[2, 99]],
    difficulty: ([n]) => (n <= 12 ? 1 : n <= 30 ? 2 : 3),
    word: ([n]) => `${nm(n)} lists every page number in a book that comes after page ${n * n} and before page ${(n + 1) * (n + 1)}. How many page numbers are on the list?`,
    teach: {
      idea: "(n + 1)² − n² = 2n + 1, so the jump from one square to the next is 2n + 1, and the numbers strictly between them are 2n.",
      method: "Use the pattern: between n² and (n + 1)² there are 2n whole numbers. Check with a small case such as 3² and 4² (10 to 15: six numbers).",
      visual: ([n]) => (n <= 6 ? { type: "numberline", from: n * n, to: (n + 1) * (n + 1), step: 1, marks: [n * n, (n + 1) * (n + 1)] } : null),
      alternatives: [
        { id: "square_grow", title: "Grow a square", kind: "conceptual", text: ["A square of n × n dots grows to (n + 1) × (n + 1) by adding a row and a column: n + n + 1 dots.", "So the next square is 2n + 1 more; the numbers in between are 2n."] },
      ],
    },
    limits: "Consecutive squares from 2² to 100²; other square-number properties (last digits, sums of odd numbers) are other families.",
  },
  // ============================================================ probability scale
  {
    id: "akchance",
    arity: 4,
    title: "Probability from 0 (impossible) to 1 (certain)",
    competency: CH,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([r, b, g, q]) => (r < 1 || r > 9 || b < 1 || b > 9 || g < 0 || g > 6 || q < 0 || q > 3 ? "A bag of up to 24 red, blue and green marbles; one of four questions." : null),
    prompt: ([r, b, g, q]) => `A bag has ${g ? `${r} red, ${b} blue and ${g} green` : `${r} red and ${b} blue`} marbles, as in the table. ${nm(r + b + g)} picks one marble without looking. What is the probability that it is ${chanceEvent(g, q)}? (A fraction is fine.)`,
    solve: ([r, b, g, q]) => {
      const T = r + b + g;
      const fav = q === 0 ? r : q === 1 ? T - b : q === 2 ? 0 : T;
      return {
        steps: [
          { id: "total", op: "add", competency: ADD, inputs: g ? [r, b, g] : [r, b], value: T },
          { id: "favourable", op: "count", competency: CH, inputs: [chanceEvent(g, q)], value: fav },
          { id: "probability", op: "divide", competency: CH, inputs: [fav, T], value: fav / T },
        ],
        answer: fav / T,
      };
    },
    // independent: put every marble in a list and test each one against the event
    validate: ([r, b, g, q], v) => {
      if (typeof v !== "number") return false;
      const bag = [...Array(r).fill("red"), ...Array(b).fill("blue"), ...Array(g).fill("green")] as string[];
      const hit = (c: string) => (q === 0 ? c === "red" : q === 1 ? c !== "blue" : q === 2 ? c === "yellow" : ["red", "blue", "green"].includes(c));
      return near(v * bag.length, bag.filter(hit).length, 1e-9);
    },
    bugs: ([r, b, g, q]) => {
      const T = r + b + g;
      const k = g ? 3 : 2;
      if (q === 0) return [bug("odds", "conceptual", CH, "Red marbles were compared with the other marbles. A probability compares the red marbles with ALL the marbles.", r / (T - r)), bug("colours-equal", "conceptual", CH, `Each colour was taken as equally likely (1 out of ${k} colours). The colours have different numbers of marbles, so count marbles, not colours.`, 1 / k), bug("count-only", "procedural", CH, "The number of red marbles was given. A probability is a fraction of all the marbles, between 0 and 1.", r)];
      if (q === 1) return [bug("event-itself", "procedural", CH, "The probability of blue was found. 'Not blue' means every other marble.", b / T), bug("colours-equal", "conceptual", CH, "Colours were counted instead of marbles.", (k - 1) / k), bug("odds", "conceptual", CH, "The other marbles were compared with the blue ones. Divide by the total number of marbles.", (T - b) / b)];
      if (q === 2) return [bug("small-chance", "conceptual", CH, "An impossible event was given a small chance. There are no yellow marbles at all, so it cannot happen: its probability is 0.", 1 / T), bug("swap-certain", "conceptual", CH, "Impossible and certain were swapped. Certain is 1; impossible is 0.", 1)];
      return [bug("swap-impossible", "conceptual", CH, "Certain and impossible were swapped. Every marble in the bag fits, so it is certain: probability 1.", 0), bug("counted-marbles", "conceptual", CH, "The number of marbles was given. A probability is never more than 1; a certain event has probability 1.", T)];
    },
    distractors: ([r, b, g, q]) => (q >= 2 ? [1 / 2, q === 2 ? 1 : 0] : [1 / 2, 1]),
    variants: () => [],
    explain: (s) => (s.id === "total" ? `There are ${s.inputs.join(" + ")} = ${s.value} marbles in all` : s.id === "favourable" ? `${s.value} of them ${Number(s.value) === 1 ? "fits" : "fit"}: ${s.inputs[0]}` : `Probability = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${fracText(Number(s.inputs[0]), Number(s.inputs[1]))}`),
    figure: ([r, b, g]) => ({ type: "table", head: ["Colour", "Number of marbles"], rows: [["Red", r], ["Blue", b], ...(g ? [["Green", g]] : [])] }),
    domain: [[1, 9], [1, 9], [0, 6], [0, 3]],
    keep: ([r, b, g, q]) => q <= 1 || (r + b + g) % 4 === 0,
    cap: 400,
    difficulty: ([, , g, q]) => (q >= 2 ? 1 : q === 0 && !g ? 1 : q === 0 ? 2 : 3),
    word: ([r, b, g, q]) => `At a school fair, a box holds ${g ? `${r} red, ${b} blue and ${g} green` : `${r} red and ${b} blue`} tickets. ${nm(r * b + g)} pulls out one ticket without looking. What is the probability that it is ${chanceEvent(g, q).replace("marble", "ticket")}?`,
    teach: {
      idea: "Probability measures chance on a scale from 0 (impossible) to 1 (certain). When every marble is equally likely to be picked, P(event) = favourable marbles ÷ all the marbles. P(not A) = 1 − P(A).",
      method: "Count all the marbles. Count the ones that fit the event. Write favourable over total. Nothing fits: 0. Everything fits: 1.",
      visual: ([r, b, g, q]) => {
        const T = r + b + g;
        const fav = q === 0 ? r : q === 1 ? T - b : q === 2 ? 0 : T;
        return { type: "numberline", from: 0, to: 1, marks: [fav / T] };
      },
      alternatives: [
        { id: "scale_words", title: "Words on the scale", kind: "conceptual", text: ["Draw a line from 0 to 1. Mark 0 'impossible', 1/2 'even chance' and 1 'certain'.", "Place the event: no matching marbles at 0, all of them at 1, some of them in between — more matching marbles means nearer 1."], visual: () => ({ type: "numberline", from: 0, to: 1, marks: [0, 0.5, 1] }) },
      ],
    },
    limits: "Bags of up to 24 marbles in three colours; mutually exclusive and exhaustive events are named in class.",
  },
  // ============================================================ experimental probability
  {
    id: "akexp",
    arity: 3,
    title: "Experimental probability from a frequency table",
    competency: EXPR,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([c, s, j]) => (c < 0 || c > 2 || s < 0 || s > 59 || j < 0 || j >= (EXPC[c]?.outs.length ?? 0) ? "A coin, die or spinner experiment and one of its outcomes." : null),
    prompt: ([c, s, j]) => `${nm(c + s)} ${EXPC[c].act} ${expData(c, s).n} times and recorded the results in the table. Based on these results, what is the experimental probability of ${EXPC[c].ev(j)}? (A fraction is fine.)`,
    solve: ([c, s, j]) => {
      const { n, f } = expData(c, s);
      return {
        steps: [
          { id: "read", op: "read", competency: FREQ, inputs: [EXPC[c].outs[j]], value: f[j] },
          { id: "relative", op: "divide", competency: EXPR, inputs: [f[j], n], value: f[j] / n },
        ],
        answer: f[j] / n,
      };
    },
    // independent: add up the table again for the number of trials, and multiply back
    validate: ([c, s, j], v) => {
      if (typeof v !== "number") return false;
      const { f } = expData(c, s);
      let trials = 0;
      for (const x of f) trials += x;
      return near(v * trials, f[j], 1e-9);
    },
    bugs: ([c, s, j]) => {
      const { n, f } = expData(c, s);
      const k = EXPC[c].outs.length;
      return [
        bug("theoretical", "conceptual", EXPR, `The theoretical probability (1/${k}) was given. The question asks what happened in this experiment: use the counts in the table.`, 1 / k),
        bug("odds", "conceptual", CH, `The count was compared with the other results (${f[j]} to ${n - f[j]}). Divide by the total number of trials, ${n}.`, f[j] / (n - f[j])),
        bug("count-only", "procedural", EXPR, "The count was given. The probability is the count as a fraction of all the trials.", f[j]),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `${s.inputs[0]} happened ${s.value} times` : `Experimental probability = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${fracText(Number(s.inputs[0]), Number(s.inputs[1]))}`),
    distractors: ([c, s, j]) => {
      const { n, f } = expData(c, s);
      return [(n - f[j]) / n, (f[j] + 1) / n, (f[j] - 1) / n].filter((v) => v > 0 && v < 1);
    },
    figure: ([c, s]) => ({ type: "table", head: ["Outcome", "Number of times"], rows: EXPC[c].outs.map((o, i) => [o, expData(c, s).f[i]]) }),
    domain: [[0, 2], [0, 59], [0, 5]],
    keep: ([c, , j]) => j < EXPC[c].outs.length,
    cap: 400,
    difficulty: ([c, s]) => (c === 0 ? 1 : expData(c, s).n === 100 || c === 2 ? 2 : 3),
    word: ([c, s, j]) => {
      const { n, f } = expData(c, s);
      return `In a class activity, ${nm(c + s + 3)} ${EXPC[c].act} ${n} times. The results were ${EXPC[c].outs.map((o, i) => `${o}: ${f[i]}`).join(", ")}. From these results, what is the experimental probability of ${EXPC[c].ev(j)}?`;
    },
    teach: {
      idea: "Experimental probability is the fraction of the trials in which the event really happened: (number of times it happened) ÷ (number of trials).",
      method: "Read the count for the event from the table, add all the counts to get the number of trials, and divide.",
      alternatives: [
        { id: "compare_theory", title: "Experiment and theory", kind: "conceptual", text: ["Theory says a fair coin gives a head half of the time, but in 20 tosses you might get 12 heads: an experimental probability of 12/20.", "The experiment uses what actually happened. With many more trials, the two usually get closer."] },
      ],
    },
    limits: "Coin, die and four-colour spinner experiments of 20 to 100 trials; explaining why experiment and theory get closer is marked by an educator.",
  },
  // ============================================================ counting outcomes (multiplication principle)
  {
    id: "akss",
    arity: 4,
    title: "Counting the outcomes of choices made in stages",
    competency: SS,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, a, b, x]) => (c < 0 || c > 2 || a < 2 || a > 6 || b < 2 || b > 6 || x < 0 || x === 1 || x > 5 ? "Two or three stages with 2 to 6 choices each." : null),
    prompt: ([c, a, b, x]) => ssText(c, a, b, x),
    solve: ([c, a, b, x]) => ({
      steps: [
        { id: "two", op: "multiply", competency: SS, inputs: [a, b], value: a * b },
        ...(x ? [{ id: "three", op: "multiply", competency: SS, inputs: [a * b, x], value: a * b * x } as Step] : []),
      ],
      answer: a * b * (x || 1),
    }),
    // independent: list every combination with nested loops and count them
    validate: ([, a, b, x], v) => {
      let n = 0;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < (x || 1); k++) n++;
      return v === n;
    },
    bugs: ([, a, b, x]) => [
      bug("added", "conceptual", SS, "The numbers of choices were added. Each choice at the first stage can go with every choice at the next, so multiply.", a + b + x),
      ...(x ? [bug("two-stages", "procedural", SS, `Only the first two stages were counted. Each of the ${a * b} pairs can go with each of the ${x} choices at the last stage.`, a * b)] : []),
      ...(x ? [bug("added-then-multiplied", "procedural", SS, "Two stages were added and then multiplied by the third. Multiply all the stages.", (a + b) * x)] : []),
    ],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`,
    domain: [[0, 2], [2, 6], [2, 6], [0, 5]],
    keep: ([, , , x]) => x !== 1,
    difficulty: ([, a, b, x]) => (!x && a * b <= 12 ? 1 : !x ? 2 : 3),
    word: ([c, a, b, x]) => ssText((c + 1) % 3, a, b, x),
    teach: {
      idea: "If the first stage can happen in a ways and, for each of them, the next stage in b ways, there are a × b outcomes altogether (the multiplication principle).",
      method: "Count the choices at each stage and multiply them. A tree diagram or table shows why: every branch splits into the same number of branches.",
      visual: ([, a, b]) => ({ type: "table", head: ["", ...Array.from({ length: b }, (_, j) => `B${j + 1}`)], rows: Array.from({ length: a }, (_, i) => [`A${i + 1}`, ...Array.from({ length: b }, (_, j) => `A${i + 1}B${j + 1}`)]) }),
      alternatives: [
        { id: "tree", title: "Draw a tree diagram", kind: "conceptual", text: ["Draw one branch for each first choice. From the end of each branch, draw one branch for each second choice.", "Count the ends of the last branches: that is every possible outcome."], visual: ([, a, b]) => ({ type: "array", rows: a, cols: b }) },
      ],
    },
    limits: "Two or three independent stages with 2 to 6 choices each; arrangements with restrictions are listed in class.",
  },
  // ============================================================ two-stage sample spaces and probability
  {
    id: "akdice",
    arity: 4,
    title: "Probability from the sample space of two dice or spinners",
    competency: SS,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([m, n, q, s]) => (m < 3 || n > 6 || m > n || q < 0 || q > 2 ? "Two number makers with 3 to 6 equally likely numbers." : q === 0 && (s < 2 || s > m + n) ? "A possible total." : q === 1 && (s < 3 || s > m + n) ? "A total from 3 up to the largest." : q === 2 && s !== 0 ? "s = 0 for this event." : null),
    prompt: ([m, n, q, s]) => `${nm(m + n + s)} uses ${pairName(m, n)}. ${m === n ? `Each gives a number from 1 to ${m}` : `The first gives a number from 1 to ${m} and the second a number from 1 to ${n}`}, every number equally likely. What is the probability that ${diceEvent(q, s)}? (A fraction is fine.)`,
    solve: ([m, n, q, s]) => {
      let c = 0;
      for (let a = 1; a <= m; a++) for (let b = 1; b <= n; b++) if (diceHit(q, s, a, b)) c++;
      return {
        steps: [
          { id: "space", op: "multiply", competency: SS, inputs: [m, n], value: m * n },
          { id: "favourable", op: "count", competency: SS, inputs: [diceEvent(q, s)], value: c },
          { id: "probability", op: "divide", competency: CH, inputs: [c, m * n], value: c / (m * n) },
        ],
        answer: c / (m * n),
      };
    },
    // independent: count the ways for each total by a formula (and the "bigger" event column by column)
    validate: ([m, n, q, s], v) => {
      if (typeof v !== "number") return false;
      const ways = (t: number) => Math.max(0, Math.min(t - 1, m, n, m + n + 1 - t));
      let c = 0;
      if (q === 0) c = ways(s);
      else if (q === 1) for (let t = s; t <= m + n; t++) c += ways(t);
      else for (let a = 1; a <= m; a++) c += Math.max(0, n - a);
      return near(v * m * n, c, 1e-9);
    },
    bugs: ([m, n, q, s]) => {
      let c = 0;
      let cu = 0;
      let c2 = 0;
      for (let a = 1; a <= m; a++)
        for (let b = 1; b <= n; b++) {
          if (diceHit(q, s, a, b)) {
            c++;
            if (a <= b) cu++;
          }
          if (q === 1 ? a + b > s : q === 2 ? b >= a : false) c2++;
        }
      const totals = m + n - 1;
      return [
        ...(q < 2 ? [bug("totals-equally-likely", "conceptual", SS, `The ${totals} possible totals were taken as equally likely. They are not: list all ${m * n} pairs and count the ones that fit.`, q === 0 ? 1 / totals : (m + n - s + 1) / totals)] : []),
        bug("added-sides", "procedural", SS, `The sample space was taken as ${m} + ${n} = ${m + n} outcomes. Each of the ${m} first numbers goes with each of the ${n} second numbers: ${m} × ${n} = ${m * n}.`, c <= m + n ? c / (m + n) : null),
        ...(m === n && q < 2 ? [bug("order-ignored", "conceptual", SS, "Pairs such as (1, 3) and (3, 1) were counted once. They are different outcomes: the first and second number are different.", cu / (m * n))] : []),
        ...(q === 1 ? [bug("more-than", "procedural", SS, `'${s} or more' was read as 'more than ${s}'. Totals of exactly ${s} count too.`, c2 / (m * n))] : []),
        ...(q === 2 ? [bug("equal-included", "procedural", SS, "Pairs with equal numbers were counted. 'Bigger' leaves out pairs where both numbers are the same.", c2 / (m * n))] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "space" ? `There are ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} equally likely pairs` : s.id === "favourable" ? `${s.value} pairs fit: ${s.inputs[0]}` : `Probability = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${fracText(Number(s.inputs[0]), Number(s.inputs[1]))}`),
    distractors: ([m, n, q, s]) => {
      let c = 0;
      for (let a = 1; a <= m; a++) for (let b = 1; b <= n; b++) if (diceHit(q, s, a, b)) c++;
      return [(c + 1) / (m * n), 1 - c / (m * n), (c - 1) / (m * n), (c + 2) / (m * n)].filter((v) => v > 0 && v < 1);
    },
    domain: [[3, 6], [3, 6], [0, 2], [0, 12]],
    keep: ([m, n, q, s]) => m <= n && (q === 0 ? s >= 2 && s <= m + n : q === 1 ? s >= 3 && s <= m + n : s === 0),
    difficulty: ([m, n, q]) => (q === 0 && m * n <= 16 ? 1 : q === 0 || m * n <= 16 ? 2 : 3),
    word: ([m, n, q, s]) => `In a board game, a player moves after using ${pairName(m, n)} (the first gives 1 to ${m}, the second 1 to ${n}, each equally likely). What is the probability that ${diceEvent(q, s)}?`,
    teach: {
      idea: "For two stages, the sample space is every pair (first, second). With equally likely numbers, all m × n pairs are equally likely, so P(event) = pairs that fit ÷ all pairs.",
      method: "Draw a table: first numbers down the side, second numbers along the top, the total in each cell. Count the cells that fit the event and divide by the number of cells.",
      visual: ([m, n]) => ({ type: "table", head: ["+", ...Array.from({ length: n }, (_, j) => String(j + 1))], rows: Array.from({ length: m }, (_, i) => [String(i + 1), ...Array.from({ length: n }, (_, j) => i + j + 2)]) }),
      alternatives: [
        { id: "tree", title: "Tree diagram", kind: "conceptual", text: ["Draw a branch for each first number, then from each, a branch for each second number.", "Each path is one outcome; tick the paths that fit the event and count them."] },
      ],
    },
    limits: "Two spinners or dice with 3 to 6 equally likely numbers; totals and 'bigger than' events. Card and coin sample spaces are other families.",
  },
  // ============================================================ tracing an algorithm
  {
    id: "akloop",
    arity: 3,
    title: "Tracing a step-by-step algorithm with a loop",
    competency: ALG,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, d, N]) => {
      const t = Math.floor((N - a) / d) + 1;
      return a < 1 || a > 9 || d < 1 || d > 5 || N > 40 || t < 3 || t > 8 ? "An adding loop that runs 3 to 8 times." : null;
    },
    prompt: () => "Follow the steps in the table exactly. What is the value of S when you stop?",
    solve: ([a, d, N]) => {
      const steps: Step[] = [];
      let S = 0;
      let K = a;
      while (K <= N) {
        steps.push({ id: `add${steps.length + 1}`, op: "add", competency: ALG, inputs: [S, K], value: S + K });
        S += K;
        K += d;
      }
      steps.push({ id: "stop", op: "compare", competency: ALG, inputs: [K, N], value: S });
      return { steps, answer: S };
    },
    // independent: count the loops by division and add the arithmetic sequence by the pairing formula
    validate: ([a, d, N], v) => {
      const t = Math.floor((N - a) / d) + 1;
      return v === (t * (2 * a + (t - 1) * d)) / 2;
    },
    bugs: ([a, d, N]) => {
      const t = Math.floor((N - a) / d) + 1;
      const last = a + (t - 1) * d;
      const S = (t * (a + last)) / 2;
      return [
        bug("stopped-early", "procedural", ALG, `The loop stopped one time too early. When K = ${last}, K is still ${N} or less, so Step 2 adds it before stopping.`, S - last),
        bug("one-more-loop", "procedural", ALG, `K = ${last + d} was added too. Check the rule in Step 4 before going back: ${last + d} is more than ${N}, so stop.`, S + last + d),
        bug("gave-k", "procedural", ALG, "The final value of K was given. The question asks for S.", last + d),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "stop" ? `K is now ${s.inputs[0]}, which is more than ${s.inputs[1]}, so stop: S = ${s.value}` : `S = ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    figure: ([a, d, N]) => ({ type: "table", head: ["Step", "Instruction"], rows: [["1", `Start with S = 0 and K = ${a}.`], ["2", "Add K to S."], ["3", `Increase K by ${d}.`], ["4", `If K is ${N} or less, go back to Step 2. Otherwise, stop.`]] }),
    domain: [[1, 9], [1, 5], [5, 40]],
    cap: 400,
    difficulty: ([a, d, N]) => {
      const t = Math.floor((N - a) / d) + 1;
      return t <= 4 ? 1 : t <= 6 ? 2 : 3;
    },
    word: ([a, d, N]) => `${nm(a + d)} saves money in a box. On the first day ${nm(a + d)} puts in ₹${a}. Each day after that, ${nm(a + d)} puts in ₹${d} more than the day before, but stops before any day on which the amount would be more than ₹${N}. How many rupees are in the box at the end?`,
    teach: {
      idea: "An algorithm is a list of exact steps. Tracing it means doing every step in order and writing down each value as it changes, checking the stopping rule each time.",
      method: "Make a table with columns K and S. Do Step 2 and Step 3, write the new values, then test Step 4 before going round again.",
      visual: ([a, d, N]) => {
        const rows: (string | number)[][] = [];
        let S = 0;
        for (let K = a; K <= N; K += d) {
          S += K;
          rows.push([K, S]);
        }
        return { type: "table", head: ["K added", "S after adding"], rows };
      },
      alternatives: [
        { id: "pattern", title: "See the sequence", kind: "conceptual", text: ["The values of K that get added form a sequence: the start, then the start plus the step, and so on, up to the last one that is not more than the limit.", "List them and add them; then compare with your trace."] },
      ],
    },
    limits: "Adding loops that run 3 to 8 times; writing an algorithm or drawing a flowchart is marked by an educator.",
  },
  // ============================================================ the subtraction (Euclid) game
  {
    id: "akeuclid",
    arity: 2,
    title: "Where the repeated-subtraction game ends",
    competency: ALG,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b]) => (a <= b || b < 4 || a > 90 || a % b === 0 ? "Two different numbers, the larger not a multiple of the smaller." : null),
    prompt: ([a, b]) => `Two cards show ${a} and ${b}. In each move, the larger number is replaced by (larger − smaller). The game stops when both cards show the same number. What number is on the cards at the end?`,
    solve: ([a, b]) => {
      const steps: Step[] = [];
      let x = a;
      let y = b;
      while (x !== y) {
        const [hi, lo] = x > y ? [x, y] : [y, x];
        steps.push({ id: `move${steps.length + 1}`, op: "subtract", competency: ALG, inputs: [hi, lo], value: hi - lo });
        [x, y] = [hi - lo, lo];
      }
      return { steps, answer: x };
    },
    // independent: the end number is the largest number dividing both; search for it
    validate: ([a, b], v) => {
      if (typeof v !== "number" || v < 1 || a % v || b % v) return false;
      for (let w = v + 1; w <= b; w++) if (a % w === 0 && b % w === 0) return false;
      return true;
    },
    bugs: ([a, b]) => [
      bug("one-move", "procedural", ALG, "Only one move was made. Keep going until both cards show the same number.", a - b),
      bug("smaller-card", "procedural", ALG, "The smaller starting number was given. The game changes the cards until they are equal.", b),
      bug("always-one", "conceptual", HL, "It was guessed that the game always ends at 1. It ends at the largest number that divides both starting numbers.", 1),
      bug("past-the-end", "procedural", ALG, "One move too many was made (x − x = 0). The game stops as soon as the two cards are equal.", 0),
    ],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}: the cards now show ${s.value} and ${s.inputs[1]}`,
    domain: [[6, 90], [4, 60]],
    keep: ([a, b]) => {
      if (a <= b || a % b === 0) return false;
      let x = a;
      let y = b;
      let k = 0;
      while (x !== y) {
        if (x > y) x -= y;
        else y -= x;
        k++;
      }
      return k >= 3 && k <= 10;
    },
    cap: 400,
    difficulty: ([a, b]) => (gcd(a, b) > 1 && a < 40 ? 1 : a < 60 ? 2 : 3),
    word: ([a, b]) => `${nm(a)} has two ribbons, ${a} cm and ${b} cm long. Again and again, ${nm(a)} cuts a piece as long as the shorter ribbon off the longer one and throws it away, until both ribbons are the same length. How long are they then, in cm?`,
    teach: {
      idea: "Subtracting the smaller number does not change which numbers divide both cards, so the game ends at the largest number that divides both starting numbers: their HCF.",
      method: "Write the pair after each move in a table. Keep replacing the larger number by the difference until the two numbers are equal.",
      alternatives: [
        { id: "divide_jump", title: "Jump with division", kind: "procedural", text: ["Subtracting the smaller number many times in a row is division: the number left is the remainder.", "Divide the larger by the smaller, keep the smaller and the remainder, and repeat until the remainder is 0. The last divisor is the end number."] },
      ],
    },
    limits: "Starting numbers up to 90 that need 3 to 10 moves; Euclid's division algorithm itself is a Grade 10 family.",
  },
  // ============================================================ Kaprekar's routine
  {
    id: "akkap",
    arity: 1,
    title: "One step of Kaprekar's routine",
    competency: CONJ,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n]) => (n < 1000 || n > 9999 || new Set(String(n)).size === 1 ? "A four-digit number whose digits are not all the same." : null),
    prompt: ([n]) => `Kaprekar's routine: arrange the four digits of ${n} to make the largest possible number and the smallest possible number (the smallest may start with 0, like 0379 = 379), then subtract the smaller from the larger. What do you get?`,
    solve: ([n]) => {
      const ds = String(n).split("").map(Number);
      const L = Number([...ds].sort((a, b) => b - a).join(""));
      const S = Number([...ds].sort((a, b) => a - b).join(""));
      return {
        steps: [
          { id: "largest", op: "order", competency: CONJ, inputs: [n], value: L },
          { id: "smallest", op: "order", competency: CONJ, inputs: [n], value: S },
          { id: "subtract", op: "subtract", competency: MDAS, inputs: [L, S], value: L - S },
        ],
        answer: L - S,
      };
    },
    // independent: with sorted digits a ≥ b ≥ c ≥ d the difference is 999(a − d) + 90(b − c)
    validate: ([n], v) => {
      const [a, b, c, d] = String(n).split("").map(Number).sort((x, y) => y - x);
      return v === 999 * (a - d) + 90 * (b - c);
    },
    bugs: ([n]) => {
      const ds = String(n).split("").map(Number);
      const L = Number([...ds].sort((a, b) => b - a).join(""));
      const asc = [...ds].sort((a, b) => a - b);
      const out: Bug[] = [];
      if (asc[0] === 0) {
        const i = asc.findIndex((x) => x > 0);
        const s2 = [asc[i], ...asc.filter((_, k) => k !== i)];
        out.push(bug("no-leading-zero", "procedural", CONJ, "The smallest number was written without a 0 in front. In this routine the 0 may go first, which makes the smallest number smaller.", L - Number(s2.join(""))));
      }
      if (L !== n) out.push(bug("used-original", "procedural", CONJ, `The number ${n} itself was subtracted. Rearrange its digits to make the smallest number first.`, L - n));
      out.push(bug("added", "procedural", CONJ, "The two numbers were added. The routine subtracts the smaller from the larger.", L + Number(asc.join(""))));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "largest" ? `Digits from largest to smallest: ${s.value}` : s.id === "smallest" ? `Digits from smallest to largest: ${String(s.value).padStart(4, "0")}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[1000, 9999]],
    cap: 300,
    difficulty: ([n]) => (String(n).includes("0") ? 3 : new Set(String(n)).size === 4 ? 2 : 1),
    word: ([n]) => `${nm(n)} sees the number ${n} on a bus ticket and tries Kaprekar's routine: make the largest and the smallest numbers from its four digits (the smallest may start with 0) and subtract. What answer does ${nm(n)} get?`,
    teach: {
      idea: "Kaprekar noticed that repeating this routine on four-digit numbers always seems to reach 6174 — a conjecture you can test with your own numbers. Each step must be done exactly.",
      method: "Sort the four digits from largest to smallest for the big number and from smallest to largest for the small one (keep any 0 at the front), then subtract.",
      alternatives: [
        { id: "keep_going", title: "Test the conjecture", kind: "conceptual", text: ["Use your answer as the new number and do the routine again (write it with four digits, adding a 0 in front if needed).", "Within at most seven steps you should reach 6174, which gives 7641 − 1467 = 6174 again."] },
      ],
    },
    limits: "One step of the routine on four-digit numbers; forming and justifying the conjecture is discussed in class.",
  },
  // ============================================================ Collatz sequences
  {
    id: "akcollatz",
    arity: 2,
    title: "Terms of a Collatz sequence",
    competency: CONJ,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n, k]) => (n < 3 || n > 60 || k < 3 || k > 8 ? "Starting numbers 3 to 60, terms 3 to 8." : collatz(n, k - 1).includes(1) ? "The sequence must not reach 1 before the term asked." : null),
    prompt: ([n, k]) => `Start with ${n}. If a number is even, the next number is half of it; if it is odd, the next number is 3 times it plus 1. ${n} is the 1st number. What is the ${ord(k)} number?`,
    solve: ([n, k]) => {
      const seq = collatz(n, k);
      return { steps: seq.slice(1).map((v, i) => ({ id: `t${i + 2}`, op: seq[i] % 2 ? "multiply" : "divide", competency: CONJ, inputs: [seq[i]], value: v })), answer: seq[k - 1] };
    },
    // independent: test parity with a remainder and apply the rule recursively
    validate: ([n, k], v) => {
      const go = (x: number, left: number): number => (left === 0 ? x : go(x - 2 * Math.floor(x / 2) === 0 ? x / 2 : 3 * x + 1, left - 1));
      return v === go(n, k - 1);
    },
    bugs: ([n, k]) => {
      const seq = collatz(n, k + 1);
      let x = n;
      for (let i = 1; i < k; i++) x = x % 2 ? 3 * x : x / 2;
      return [
        bug("off-by-one", "procedural", CONJ, `The start was not counted as the 1st number, so one step too many was made. ${n} is the 1st number.`, seq[k]),
        bug("one-short", "procedural", CONJ, "One step too few was made. Number each term as you write it.", seq[k - 2]),
        bug("forgot-plus-one", "recall", PAT, "For an odd number, only 3 times was used. The rule is 3 times plus 1.", x),
      ];
    },
    variants: () => [],
    explain: (s) => (Number(s.inputs[0]) % 2 ? `${s.inputs[0]} is odd: 3 × ${s.inputs[0]} + 1 = ${s.value}` : `${s.inputs[0]} is even: ${s.inputs[0]} ÷ 2 = ${s.value}`),
    domain: [[3, 60], [3, 8]],
    keep: ([n, k]) => !collatz(n, k - 1).includes(1),
    difficulty: ([, k]) => (k <= 4 ? 1 : k <= 6 ? 2 : 3),
    word: ([n, k]) => `${nm(n + k)} plays a number game. Start: ${n}. Rule: if the number is even, halve it; if it is odd, multiply by 3 and add 1. Starting with ${n} as the 1st number, what is the ${ord(k)} number in the game?`,
    teach: {
      idea: "Each number comes from the one before by a fixed rule. The Collatz conjecture says every starting number eventually reaches 1 — it has been checked for huge numbers, but nobody has proved it.",
      method: "Write the numbers in a row and number them 1st, 2nd, 3rd …. For each one, check even or odd before using the rule.",
      visual: ([n, k]) => ({ type: "table", head: ["Term", "Number"], rows: collatz(n, k).map((v, i) => [ord(i + 1), v]) }),
      alternatives: [
        { id: "table", title: "Keep a table", kind: "procedural", text: ["Make two columns: term number and value. Write 1st and the start number.", "On each new row, write whether the last value was even or odd and the result of the rule."] },
      ],
    },
    limits: "Starting numbers up to 60 and terms up to the 8th, before the sequence reaches 1; describing long-run behaviour is discussed in class.",
  },
  // ============================================================ sums of consecutive odd numbers
  {
    id: "akodd",
    arity: 2,
    title: "Using the odd-number pattern for squares",
    competency: CONJ,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n, s]) => (n < 4 || n > 50 || s < 0 || s > n - 3 ? "Sums of at least three consecutive odd numbers, ending at most at 99." : null),
    prompt: ([n, s]) => `Use the pattern 1 = 1², 1 + 3 = 2², 1 + 3 + 5 = 3², … to find ${oddExpr(n, s)}.`,
    solve: ([n, s]) => ({
      steps: [
        { id: "count", op: "count", competency: CONJ, inputs: [2 * n - 1], value: n },
        { id: "square", op: "square", competency: CONJ, inputs: [n], value: n * n },
        ...(s ? [{ id: "remove", op: "subtract", competency: CONJ, inputs: [n * n, s * s, 2 * s - 1], value: n * n - s * s } as Step] : []),
      ],
      answer: n * n - s * s,
    }),
    // independent: add the odd numbers one by one
    validate: ([n, s], v) => {
      let t = 0;
      for (let k = 2 * s + 1; k <= 2 * n - 1; k += 2) t += k;
      return v === t;
    },
    bugs: ([n, s]) => [
      bug("last-squared", "conceptual", CONJ, `The last odd number (${2 * n - 1}) was squared. The pattern squares how MANY odd numbers are added from 1: 1 to ${2 * n - 1} is ${n} odd numbers.`, (2 * n - 1) * (2 * n - 1) - s * s),
      bug("miscounted-terms", "procedural", CONJ, `The odd numbers were miscounted. From 1 to ${2 * n - 1} there are (${2 * n - 1} + 1) ÷ 2 = ${n} of them.`, (n - 1) * (n - 1) - s * s),
      ...(s ? [bug("start-ignored", "procedural", CONJ, `The sum was taken from 1. It starts at ${2 * s + 1}, so take away 1 + 3 + … + ${2 * s - 1} = ${s}².`, n * n), bug("removed-too-many", "procedural", CONJ, `Too many odd numbers were taken away. Below ${2 * s + 1} there are ${s} odd numbers, so subtract ${s}².`, n * n - (s + 1) * (s + 1))] : []),
    ],
    variants: () => [],
    explain: (s) => (s.id === "count" ? `From 1 to ${s.inputs[0]} there are ${s.value} odd numbers` : s.id === "square" ? `So 1 + 3 + … + ${2 * Number(s.inputs[0]) - 1} = ${s.inputs[0]}² = ${s.value}` : `Take away 1 + 3 + … + ${s.inputs[2]} = ${Math.sqrt(Number(s.inputs[1]))}² = ${s.inputs[1]}: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[4, 50], [0, 20]],
    keep: ([n, s]) => s <= n - 3 && (s === 0 || s >= 2 || n <= 20),
    cap: 300,
    difficulty: ([n, s]) => (s === 0 && n <= 15 ? 1 : s === 0 ? 2 : 3),
    word: ([n, s]) => `${nm(n + s)} makes a tile pattern in layers. The first layer has ${2 * s + 1} tiles, each new layer has 2 more tiles than the one before, and the last layer has ${2 * n - 1} tiles. How many tiles are there in all?`,
    teach: {
      idea: "Each odd number is an L-shaped layer that turns a square into the next square: 1, then 1 + 3 = 2 × 2, then + 5 = 3 × 3. So the first n odd numbers add to n².",
      method: "Count how many odd numbers there are from 1 to the last one ((last + 1) ÷ 2) and square it. If the sum starts later, subtract the square for the odd numbers that are missing.",
      visual: ([n]) => ({ type: "grid", rows: Math.min(n, 8), cols: Math.min(n, 8), shaded: Math.min(n, 8) * Math.min(n, 8) }),
      alternatives: [
        { id: "pairs", title: "Pair from the ends", kind: "procedural", text: ["Pair the first and last numbers, the second and second-last, and so on: each pair has the same total.", "Multiply that total by the number of pairs (half the number of terms)."] },
      ],
    },
    limits: "Sums of consecutive odd numbers up to 99; justifying the pattern in words or pictures is marked by an educator.",
  },
  // ============================================================ divisibility with a missing digit
  {
    id: "akdivd",
    arity: 2,
    title: "The smallest missing digit that makes a number divisible",
    competency: DIV,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([di, s]) => (di < 0 || di > 3 || !Number.isInteger(s) || s < 0 || s > 149 ? "Divisibility by 3, 9, 11 or 6." : divSolve(di, s) === null ? "No digit works for this number." : isRepeat(`akdivd${di}`, 150, (t) => divShown(di, t), s) ? "An earlier choice already shows this number (distinct@1)." : null),
    prompt: ([di, s]) => `What is the smallest digit that can go in the box so that ${divShown(di, s)} is divisible by ${DIVS[di]}?`,
    solve: ([di, s]) => {
      const D = DIVS[di];
      const { d, pos } = divData(di, s);
      const x = divSolve(di, s)!;
      const known = d.filter((_, i) => i !== pos);
      const step: Step =
        D === 11
            ? { id: "alternate", op: "subtract", competency: DIV, inputs: [d.filter((_, i) => i !== pos && (d.length - 1 - i) % 2 === 0).reduce((a, b) => a + b, 0), d.filter((_, i) => i !== pos && (d.length - 1 - i) % 2 === 1).reduce((a, b) => a + b, 0)], value: x }
            : { id: "digit-sum", op: "add", competency: DIV, inputs: known, value: sum(known) };
      return { steps: [step, { id: "digit", op: "choose", competency: DIV, inputs: [D], value: x }], answer: x };
    },
    // independent: try every digit from 0 in the full number and divide
    validate: ([di, s], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 9) return false;
      const D = DIVS[di];
      const { d, pos } = divData(di, s);
      for (let x = 0; x < v; x++) if (divWith(d, pos, x) % D === 0) return false;
      return divWith(d, pos, v) % D === 0;
    },
    bugs: ([di, s]) => {
      const D = DIVS[di];
      const { d, pos } = divData(di, s);
      const x = divSolve(di, s)!;
      const S = sum(d.filter((_, i) => i !== pos));
      const smallest = (ok: (y: number) => boolean) => {
        for (let y = 0; y <= 9; y++) if (ok(y)) return y;
        return null;
      };
      const largest = (ok: (y: number) => boolean) => {
        for (let y = 9; y >= 0; y--) if (ok(y)) return y;
        return null;
      };
      if (D === 3) return [bug("used-rule-for-9", "recall", DIV, "The digit sum was made a multiple of 9. For 3, a multiple of 3 is enough.", smallest((y) => (S + y) % 9 === 0)), bug("not-smallest", "procedural", DIV, "A digit that works was chosen, but not the smallest one. Try 0, 1, 2 … in order.", largest((y) => (S + y) % 3 === 0))];
      if (D === 9) return [bug("used-rule-for-3", "recall", DIV, "The digit sum was made a multiple of 3. For 9 the digit sum must be a multiple of 9.", smallest((y) => (S + y) % 3 === 0)), bug("not-smallest", "procedural", DIV, "A digit that works was chosen, but not the smallest. 0 counts as a digit.", largest((y) => (S + y) % 9 === 0))];
      if (D === 11) {
        const sg = (d.length - 1 - pos) % 2 === 0 ? 1 : -1;
        const A = d.reduce((acc, v, i) => (i === pos ? acc : acc + ((d.length - 1 - i) % 2 === 0 ? v : -v)), 0);
        const wrong = (((sg * A) % 11) + 11) % 11;
        return [bug("digit-sum-for-11", "recall", DIV, "All the digits were added. The test for 11 uses the DIFFERENCE between the sum of alternate digits (1st, 3rd, … from the right) and the sum of the others.", smallest((y) => (S + y) % 11 === 0)), bug("wrong-side", "procedural", DIV, "The missing digit was put in the wrong group of alternate digits. Count its place from the right.", wrong <= 9 && wrong !== x ? wrong : null)];
      }
      return [bug("only-test-for-3", "procedural", DIV, "Only the test for 3 was used. A number divisible by 6 must pass the tests for BOTH 2 and 3: its last digit must also be even.", smallest((y) => (S + y) % 3 === 0)), bug("only-test-for-2", "procedural", DIV, "Only the test for 2 was used. A number divisible by 6 must also have a digit sum that is a multiple of 3.", smallest((y) => (pos === d.length - 1 ? y : d[d.length - 1]) % 2 === 0)), bug("not-smallest", "procedural", DIV, "A digit that works was chosen, but not the smallest. Try 0, 1, 2 … in order.", largest((y) => (S + y) % 3 === 0 && (pos === d.length - 1 ? y : d[d.length - 1]) % 2 === 0))];
    },
    variants: () => [],
    explain: (s) => (s.id === "digit-sum" ? `The known digits add to ${s.inputs.join(" + ")} = ${s.value}` : s.id === "alternate" ? `Alternate digits from the right: one group adds to ${s.inputs[0]}, the other to ${s.inputs[1]} (not counting the box)` : `The smallest digit that works is ${s.value}`),
    domain: [[0, 3], [0, 149]],
    keep: ([di, s]) => divSolve(di, s) !== null,
    cap: 400,
    difficulty: ([di]) => (di <= 1 ? (di === 0 ? 1 : 2) : 3),
    word: ([di, s]) => `A shop bill shows ₹${divShown(di, s)}, but one digit is smudged. ${nm(di + s)} knows the amount can be shared equally among ${DIVS[di]} friends in whole rupees. What is the smallest digit the smudged one could be?`,
    teach: {
      idea: "A number is divisible by 3 (or 9) exactly when its digit sum is; by 11 when the sums of alternate digits differ by a multiple of 11 (0, 11, 22 …); by 6 when it passes the tests for both 2 and 3. These come from place value: 10 = 9 + 1, 100 = 99 + 1, 10 = 11 − 1.",
      method: "Use the test with the digits you know, work out what the missing digit must be to pass, and choose the smallest digit from 0 to 9 that does.",
      alternatives: [
        { id: "try_digits", title: "Try the digits in order", kind: "procedural", text: ["Put 0 in the box and apply the test, then 1, then 2, and so on.", "The first digit that passes is the smallest one."] },
      ],
    },
    limits: "Numbers of four to six digits with one missing digit, for 3, 9, 11 and 6; explaining why a test works is marked by an educator.",
  },
  // ============================================================ magic squares
  {
    id: "akmagic",
    arity: 4,
    title: "Finding a hidden number in a magic square",
    competency: GRID,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, x, y, t]) => {
      const g = magicCells(c, x, y);
      return c < 5 || c > 15 || t < 0 || t > 8 || x === 0 || y === 0 || Math.abs(x) > 6 || Math.abs(y) > 6 || new Set(g).size !== 9 || g.some((v) => v < 1) ? "A 3 × 3 magic square of different positive whole numbers." : null;
    },
    prompt: () => "In this magic square, every row, column and diagonal adds up to the same total. Two numbers are hidden: one is shown as ? and the other as □. What number is hidden under the ?",
    solve: ([c, x, y, t]) => {
      const g = magicCells(c, x, y);
      const { full, own } = magicLines(t);
      const S = sum(full.map((i) => g[i]));
      const known = own.filter((i) => i !== t).map((i) => g[i]);
      return {
        steps: [
          { id: "total", op: "add", competency: GRID, inputs: full.map((i) => g[i]), value: S },
          { id: "known", op: "add", competency: ADD, inputs: known, value: sum(known) },
          { id: "missing", op: "subtract", competency: GRID, inputs: [S, sum(known)], value: S - sum(known) },
        ],
        answer: S - sum(known),
      };
    },
    // independent: put the answer in, work out the other hidden number from a line through it, and check all 8 lines
    validate: ([c, x, y, t], v) => {
      if (typeof v !== "number") return false;
      const g: (number | null)[] = magicCells(c, x, y);
      const h = hiddenOther(t);
      g[t] = v;
      g[h] = null;
      const own = LINES.find((l) => l.includes(t) && !l.includes(h))!;
      const total = sum(own.map((i) => g[i] as number));
      const via = LINES.find((l) => l.includes(h) && !l.includes(t))!;
      g[h] = total - sum(via.filter((i) => i !== h).map((i) => g[i] as number));
      return LINES.every((l) => sum(l.map((i) => g[i] as number)) === total);
    },
    bugs: ([c, x, y, t]) => {
      const g = magicCells(c, x, y);
      const { own } = magicLines(t);
      const known = own.filter((i) => i !== t).map((i) => g[i]);
      const S = 3 * c;
      return [
        bug("not-subtracted", "procedural", GRID, "The two numbers in the line were added, but their total was not taken away from the magic total.", sum(known)),
        bug("one-subtracted", "procedural", SUB, "Only one of the two numbers in the line was taken away from the magic total. Take away both.", known.map((k) => S - k)),
        bug("gave-total", "procedural", GRID, "The magic total was given. The hidden number is what the line still needs to reach that total.", S),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `A complete line: ${s.inputs.join(" + ")} = ${s.value}, so every line adds to ${s.value}` : s.id === "known" ? `The line with ? already has ${s.inputs.join(" + ")} = ${s.value}` : `? = ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    figure: ([c, x, y, t]) => {
      const g: (number | string)[] = magicCells(c, x, y);
      g[t] = "?";
      g[hiddenOther(t)] = "□";
      return { type: "table", head: ["Column 1", "Column 2", "Column 3"], rows: chunk(g, 3) };
    },
    domain: [[5, 15], [-6, 6], [-6, 6], [0, 8]],
    keep: ([c, x, y]) => {
      const g = magicCells(c, x, y);
      return x !== 0 && y !== 0 && new Set(g).size === 9 && g.every((v) => v >= 1);
    },
    cap: 400,
    difficulty: ([c, , , t]) => (t === 4 || c <= 8 ? 1 : t % 2 ? 2 : 3),
    word: ([c]) => `${nm(c)} arranges number cards in a 3 by 3 grid, as in the picture, so that every row, column and diagonal has the same total. Two cards are turned over (? and □). What number is on the card marked ?`,
    teach: {
      idea: "If one line is complete, its total is the magic total. Any line with only one gap tells you the gap: the magic total minus the two numbers in that line.",
      method: "Find a row, column or diagonal with no hidden number and add it. Then find the line through ? whose other two numbers are visible, and subtract them from the total.",
      alternatives: [
        { id: "centre", title: "Use the centre", kind: "conceptual", text: ["In a 3 × 3 magic square the total is 3 times the centre number.", "Two numbers opposite each other through the centre add up to twice the centre."] },
      ],
    },
    limits: "3 × 3 magic squares of different positive whole numbers with two hidden cells; supercell and integer-grid puzzles that need explanation are done in class.",
  },
  // ============================================================ missing-digit additions
  {
    id: "akcrypt",
    arity: 3,
    title: "Finding letters that stand for digits in an addition",
    competency: DIG,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([x, y, w]) => (x < 10 || x > 99 || y < 10 || y > 99 || w < 0 || w > 1 || x % 10 === Math.floor(y / 10) ? "Two two-digit numbers; P and Q stand for different digits." : null),
    prompt: ([x, y, w]) => `In this addition, the letters P and Q stand for two different digits: ${cryptText(x, y)}. What digit is ${w ? "Q" : "P"}?`,
    solve: ([x, y, w]) => {
      const S = x + y;
      const P = x % 10;
      const c = P + (y % 10) >= 10 ? 1 : 0;
      const Q = Math.floor(y / 10);
      const steps: Step[] = [{ id: "ones", op: "subtract", competency: DIG, inputs: [S % 10, y % 10], value: P }];
      if (w) {
        steps.push({ id: "carry", op: "compare", competency: ADDR, inputs: [P, y % 10], value: c });
        steps.push({ id: "tens", op: "subtract", competency: DIG, inputs: [Math.floor(S / 10), Math.floor(x / 10), c], value: Q });
      }
      return { steps, answer: w ? Q : P };
    },
    // independent: try every pair of digits for P and Q
    validate: ([x, y, w], v) => {
      const S = x + y;
      const fits: [number, number][] = [];
      for (let P = 0; P <= 9; P++) for (let Q = 1; Q <= 9; Q++) if (P !== Q && 10 * Math.floor(x / 10) + P + 10 * Q + (y % 10) === S) fits.push([P, Q]);
      return fits.length === 1 && v === fits[0][w];
    },
    bugs: ([x, y, w]) => {
      const S = x + y;
      const P = x % 10;
      const b = y % 10;
      const c = P + b >= 10 ? 1 : 0;
      if (!w) return [...(S % 10 < b ? [bug("smaller-from-larger", "procedural", SUBR, `${b} was taken from ${S % 10} the other way round. P + ${b} ends in ${S % 10}, so P + ${b} = ${10 + (S % 10)}: P = ${10 + (S % 10)} − ${b}.`, b - (S % 10))] : []), bug("copied-ones", "procedural", DIG, `The ones digit of the answer (${S % 10}) was copied. P plus ${b} must end in ${S % 10}.`, S % 10)];
      return [...(c ? [bug("carry-forgotten", "procedural", ADDR, `The carry from the ones column was forgotten. P + ${b} = ${P + b}, so 1 ten is carried into the tens column.`, Math.floor(S / 10) - Math.floor(x / 10))] : []), bug("tens-of-answer", "procedural", DIG, "The tens digit of the answer was copied. Q is what must be added to the tens digit of the first number to make it.", Math.floor(S / 10) % 10)];
    },
    variants: () => [],
    explain: (s) => (s.id === "ones" ? `Ones column: P + ${s.inputs[1]} ends in ${s.inputs[0]}, so P = ${s.value}` : s.id === "carry" ? (s.value ? `${s.inputs[0]} + ${s.inputs[1]} = ${Number(s.inputs[0]) + Number(s.inputs[1])}: carry 1 ten` : `${s.inputs[0]} + ${s.inputs[1]} = ${Number(s.inputs[0]) + Number(s.inputs[1])}: nothing to carry`) : `Tens: ${s.inputs[1]} + Q + ${s.inputs[2]} = ${s.inputs[0]}, so Q = ${s.value}`),
    domain: [[10, 99], [10, 99], [0, 1]],
    keep: ([x, y]) => x % 10 !== Math.floor(y / 10),
    cap: 400,
    difficulty: ([x, y, w]) => ((x % 10) + (y % 10) < 10 ? 1 : w ? 3 : 2),
    word: ([x, y, w]) => `${nm(x + y)} wrote an addition on the board, but two digits were rubbed out and replaced by the letters P and Q (two different digits): ${cryptText(x, y)}. What digit is ${w ? "Q" : "P"}?`,
    teach: {
      idea: "A letter puzzle is an ordinary addition with some digits hidden. Working column by column from the ones, as in column addition, each column fixes one digit and tells whether a ten is carried.",
      method: "Start with the ones column: find the digit that makes the ones come out right (remember it may make 10 or more). Then do the tens column, adding any carried ten.",
      alternatives: [
        { id: "substitute", title: "Check by putting the digits in", kind: "procedural", text: ["Once you have a value for each letter, write the addition with the digits in place.", "Add it normally. If the total matches, the digits are right."] },
      ],
    },
    limits: "Two-digit additions with one hidden digit in each number; puzzles with repeated letters across longer words (like SEND + MORE) are worked in class.",
  },
  // ============================================================ parity
  {
    id: "akpar",
    arity: 1,
    title: "Deciding whether sums and products are even or odd",
    competency: PAR,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s]) => (s < 0 || s > 299 ? "One of 300 sets of five calculations." : null),
    prompt: () => "Look at the five calculations in the table. Without working them out, decide which ones give an odd answer. How many of the five give an odd answer?",
    solve: ([s]) => {
      const es = parData(s);
      const odd = es.map((e) => (e.op === "×" ? e.nums.every((n) => n % 2 === 1) : e.nums.filter((n) => n % 2 === 1).length % 2 === 1));
      return {
        steps: [
          ...es.map((e, i) => ({ id: `e${i}`, op: "classify", competency: PAR, inputs: [parText(e)], value: odd[i] ? 1 : 0 }) as Step),
          { id: "count", op: "count", competency: PAR, inputs: odd.map((o) => (o ? 1 : 0)), value: odd.filter(Boolean).length },
        ],
        answer: odd.filter(Boolean).length,
      };
    },
    // independent: work every calculation out and look at the last digit
    validate: ([s], v) => {
      const es = parData(s);
      const val = (e: { op: string; nums: number[] }) => (e.op === "×" ? e.nums.reduce((a, b) => a * b, 1) : e.op === "−" ? e.nums[0] - e.nums[1] : sum(e.nums));
      return v === es.filter((e) => [1, 3, 5, 7, 9].includes(val(e) % 10)).length;
    },
    bugs: ([s]) => {
      const es = parData(s);
      const isOdd = (n: number) => n % 2 === 1;
      const rule = (f: (e: { op: string; nums: number[] }) => boolean) => es.filter(f).length;
      const truth = (e: { op: string; nums: number[] }) => (e.op === "×" ? e.nums.every(isOdd) : e.nums.filter(isOdd).length % 2 === 1);
      return [
        bug("odd-plus-odd", "conceptual", PAR, "Adding or subtracting odd numbers was taken to give an odd number. Two odd numbers each have one left over; the two left-overs make a pair, so odd + odd is even.", rule((e) => (e.op === "×" ? truth(e) : e.nums.some(isOdd)))),
        bug("odd-times-anything", "conceptual", PAR, "A product with an odd number in it was taken as odd. If any number being multiplied is even, the product is even (it is made of pairs).", rule((e) => (e.op === "×" ? e.nums.some(isOdd) : truth(e)))),
        bug("first-number-only", "procedural", EO, "Only the first number of each calculation was looked at. Every number affects whether the answer is even or odd.", rule((e) => isOdd(e.nums[0]))),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "count" ? `${s.value} of the five give an odd answer` : `${s.inputs[0]} gives an ${s.value ? "odd" : "even"} answer`),
    distractors: ([s]) => {
      const es = parData(s);
      const a = es.filter((e) => (e.op === "×" ? e.nums.every((n) => n % 2 === 1) : e.nums.filter((n) => n % 2 === 1).length % 2 === 1)).length;
      return [a + 1, a - 1, a + 2, a - 2].filter((v) => v >= 0 && v <= 5);
    },
    figure: ([s]) => ({ type: "table", head: ["", "Calculation"], rows: parData(s).map((e, i) => ["ABCDE"[i], parText(e)]) }),
    domain: [[0, 299]],
    difficulty: ([s]) => {
      const n = parData(s).filter((e) => e.op === "×" || e.nums.length === 3).length;
      return n <= 1 ? 1 : n <= 3 ? 2 : 3;
    },
    word: ([s]) => `${nm(s)}'s teacher wrote five calculations: ${parData(s).map(parText).join("; ")}. Without working them out, how many of them have an odd answer?`,
    teach: {
      idea: "An even number is made of pairs; an odd number is pairs with one left over. In a sum, the left-overs pair up, so the sum is odd only when there is an odd number of odd numbers. A product is odd only when every number multiplied is odd.",
      method: "For each calculation, look only at whether each number is even or odd (its last digit). Count the odd numbers in a sum or difference; check whether every number in a product is odd.",
      alternatives: [
        { id: "dots", title: "Picture the pairs", kind: "conceptual", text: ["Draw each odd number as pairs of dots with one extra dot.", "Put two odd numbers together: the two extra dots make a new pair, so nothing is left over and the total is even."], visual: () => ({ type: "array", rows: 2, cols: 4 }) },
      ],
    },
    limits: "Sums, differences and products of two or three numbers with up to three digits; explaining the rules in words is marked by an educator.",
  },
  // ============================================================ proportional or additive change
  {
    id: "akresize",
    arity: 4,
    title: "Scaling in proportion, not by adding",
    competency: PROP,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    reject: ([c, a, b, W]) => (c < 0 || c > 1 || a < 2 || a > 12 || b < 2 || b > 20 || W < 3 || W > 30 || W === a || b === a || (2 * b * W) % a !== 0 ? "A photo or a recipe scaled to a new size, with an answer in halves." : null),
    prompt: ([c, a, b, W]) => (c === 0 ? `A photo is ${a} cm wide and ${b} cm tall. ${nm(a + b)} prints a ${W > a ? "bigger" : "smaller"} copy that is ${W} cm wide, without stretching or squashing the picture. How tall is the copy, in cm? (A decimal is fine.)` : `A recipe for ${a} people uses ${b} cups of rice. How many cups are needed for ${W} people, so that everyone gets the same amount? (A decimal is fine.)`),
    solve: ([, a, b, W]) => ({
      steps: [
        { id: "factor", op: "divide", competency: PROPN, inputs: [W, a], value: W / a },
        { id: "scale", op: "multiply", competency: PROP, inputs: [b, W / a], value: (b * W) / a },
      ],
      answer: (b * W) / a,
    }),
    // independent: the two ratios must be equal: cross-multiply
    validate: ([, a, b, W], v) => typeof v === "number" && near(v * a, b * W, 1e-9),
    bugs: ([c, a, b, W]) => [
      bug("added-difference", "conceptual", PROP, `${W > a ? "The same amount was added" : "The same amount was taken away"} (${Math.abs(W - a)}). Keeping the ${c ? "amount per person" : "shape"} means multiplying both numbers by the same factor, ${W} ÷ ${a}.`, b + (W - a)),
      bug("ratio-flipped", "procedural", RATIO, `The factor was found the wrong way round. Compare the new ${c ? "number of people" : "width"} with the old one: ${W} ÷ ${a}.`, (b * a) / W),
      bug("factor-only", "procedural", PROPN, `Only the factor ${W} ÷ ${a} was found. Multiply the ${c ? "cups of rice" : "height"} by it.`, W / a),
    ],
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `The scale factor is ${s.inputs[0]} ÷ ${s.inputs[1]} = ${Number.isInteger(Number(s.value)) ? s.value : `${s.inputs[0]}/${s.inputs[1]}`}` : `Multiply: ${s.inputs[0]} × ${Number.isInteger(Number(s.inputs[1])) ? s.inputs[1] : "the factor"} = ${s.value}`),
    domain: [[0, 1], [2, 12], [2, 20], [3, 30]],
    keep: ([, a, b, W]) => W !== a && b !== a && (2 * b * W) % a === 0 && W <= 3 * a && b + (W - a) > 0,
    cap: 400,
    difficulty: ([, a, b, W]) => (W % a === 0 ? 1 : (b * W) % a === 0 ? 2 : 3),
    word: ([c, a, b, W]) => (c === 1 ? `A photo is ${a} cm wide and ${b} cm tall. A copy is made ${W} cm wide, keeping the same shape. How tall is the copy, in cm?` : `For ${a} people, ${nm(b)} cooks ${b} cups of rice. How many cups should be cooked for ${W} people, so each person gets the same amount?`),
    teach: {
      idea: "Keeping the shape (or the amount per person) means keeping the ratio the same, so both numbers are multiplied by the same factor. Adding the same amount to both changes the ratio.",
      method: "Find the scale factor: new ÷ old for the pair you know. Multiply the other number by the same factor (or find the amount for 1 first, then multiply).",
      alternatives: [
        { id: "why_not_add", title: "Why adding goes wrong", kind: "conceptual", text: ["A photo 2 cm wide and 4 cm tall, made 10 cm wide by adding 8 cm to both sides, would be 10 by 12: it now looks squashed.", "Multiplying both by 5 gives 10 by 20: the height is still twice the width, so the shape is kept."] },
        { id: "unitary", title: "Unitary method", kind: "procedural", text: ["Find the amount for one unit first: cups for 1 person = cups ÷ people.", "Multiply by the new number of people."] },
      ],
    },
    limits: "Photos and recipes scaled by whole-number sizes with answers in halves; explaining why a change is or is not proportional is marked by an educator.",
  },
  // ============================================================ shift ciphers
  {
    id: "akshift",
    arity: 2,
    title: "Finding the key of a shift cipher",
    competency: CIPH,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([w, k]) => (w < 0 || w >= WORDS.length || k < 1 || k > 25 ? "One of the listed words and a shift from 1 to 25." : null),
    prompt: ([w, k]) => `In a shift code, every letter moves forward the same number of places along the alphabet (after Z it goes back to A). In this code, ${WORDS[w]} is written as ${shiftWord(WORDS[w], k)}. How many places forward does each letter move?`,
    solve: ([w, k]) => {
      const p = WORDS[w].charCodeAt(0) - 64;
      const q = shiftWord(WORDS[w], k).charCodeAt(0) - 64;
      return { steps: [{ id: "first", op: "subtract", competency: CIPH, inputs: [WORDS[w][0], p, shiftWord(WORDS[w], k)[0], q], value: (q - p + 26) % 26 }], answer: (q - p + 26) % 26 };
    },
    // independent: encode the whole word with the answer, letter by letter along the alphabet, and compare
    validate: ([w, k], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 25) return false;
      const coded = shiftWord(WORDS[w], k);
      return WORDS[w].split("").every((ch, i) => ABC[(ABC.indexOf(ch) + v) % 26] === coded[i]);
    },
    bugs: ([, k]) => [
      bug("counted-back", "procedural", CIPH, "The places were counted backwards (from the code letter to the plain letter). The code moves letters FORWARD.", 26 - k),
      bug("counted-start", "procedural", CIPH, "The starting letter was counted as one of the places. Count only the jumps: from A to C is 2 places.", k + 1),
    ],
    variants: () => [],
    distractors: ([, k]) => [k + 2, k - 1, k + 3].filter((v) => v >= 1 && v <= 25),
    explain: (s) => `${s.inputs[0]} is letter ${s.inputs[1]} and ${s.inputs[2]} is letter ${s.inputs[3]}: the shift is ${s.value} places${Number(s.inputs[3]) < Number(s.inputs[1]) ? " (going round past Z)" : ""}`,
    domain: [[0, WORDS.length - 1], [1, 25]],
    cap: 400,
    difficulty: ([w, k]) => {
      const wraps = WORDS[w].split("").some((ch) => ch.charCodeAt(0) - 65 + k >= 26);
      return !wraps && k <= 5 ? 1 : !wraps ? 2 : 3;
    },
    word: ([w, k]) => `${nm(w)} and ${nm(w + 5)} send secret notes using a shift code. ${nm(w)} writes the word ${WORDS[w]} as ${shiftWord(WORDS[w], k)}. By how many places forward is each letter shifted?`,
    teach: {
      idea: "In a shift (Caesar) code every letter moves the same number of places, going round from Z back to A. So comparing one plain letter with its code letter gives the key; the other letters check it.",
      method: "Number the letters A = 1 to Z = 26. Subtract the plain letter's number from the code letter's number; if the answer is negative, add 26. Check with a second letter.",
      visual: () => ({ type: "table", head: ABC.slice(0, 13).split(""), rows: [Array.from({ length: 13 }, (_, i) => i + 1), ABC.slice(13).split(""), Array.from({ length: 13 }, (_, i) => i + 14)] }),
      alternatives: [
        { id: "wheel", title: "A letter wheel", kind: "conceptual", text: ["Write the alphabet round a circle, so that A comes after Z.", "Put a finger on the plain letter and count the jumps forward to the code letter."] },
      ],
    },
    limits: "Finding the key of a shift code from a word and its code; writing out a decoded message is practised in class (the answer is a word, which is not marked automatically).",
  },
  // ============================================================ think-of-a-number tricks
  {
    id: "akthink",
    arity: 4,
    title: "The number a 'think of a number' trick always gives",
    competency: PROOF,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([d, k, r, b]) => (d < 2 || d > 5 || k < 1 || k > 4 || r < 1 || r > 12 || b < 0 || b > 6 ? "Multiply, add, divide and take away the number, with whole steps." : null),
    prompt: ([d, k, r, b]) => `${thinkText(d, k, r, b)} Whatever number you start with, you always end with the same number. What is it?`,
    solve: ([d, k, r, b]) => ({
      steps: [
        { id: "times", op: "multiply", competency: VAR, inputs: [k * d], value: `${k * d}n` },
        { id: "plus", op: "add", competency: VAR, inputs: [r * d], value: `${k * d}n + ${r * d}` },
        { id: "divide", op: "divide", competency: VAR, inputs: [d], value: `${k === 1 ? "" : k}n + ${r}` },
        { id: "minus", op: "subtract", competency: PROOF, inputs: [k], value: r },
        ...(b ? [{ id: "end", op: "add", competency: ADD, inputs: [r, b], value: r + b } as Step] : []),
      ],
      answer: r + b,
    }),
    // independent: play the trick with several starting numbers
    validate: ([d, k, r, b], v) => {
      for (let x = 1; x <= 6; x++) if (((k * d * x + r * d) / d) - k * x + b !== v) return false;
      return true;
    },
    bugs: ([d, k, r, b]) => [
      bug("added-not-divided", "conceptual", PROOF, `Only the ${k * d} × n part was divided by ${d}. Dividing by ${d} divides the whole amount, including the ${r * d} that was added: ${r * d} ÷ ${d} = ${r}.`, r * d + b),
      ...(b ? [bug("last-step-missed", "procedural", PROOF, `The last step (add ${b}) was left out.`, r)] : []),
      bug("divisor-given", "procedural", PROOF, `The number divided by was given. Follow each step with n for the secret number to see what is left.`, d),
    ],
    variants: () => [],
    explain: (s) => (s.id === "times" ? `Call the number n. Multiply by ${s.inputs[0]}: ${s.value}` : s.id === "plus" ? `Add ${s.inputs[0]}: ${s.value}` : s.id === "divide" ? `Divide everything by ${s.inputs[0]}: ${s.value}` : s.id === "minus" ? `Take away ${Number(s.inputs[0]) === 1 ? "n" : `${s.inputs[0]}n`}: the n is gone, leaving ${s.value}` : `Add ${s.inputs[1]}: ${s.value}`),
    domain: [[2, 5], [1, 4], [1, 12], [0, 6]],
    cap: 300,
    difficulty: ([, k, , b]) => (k === 1 && !b ? 1 : k === 1 || !b ? 2 : 3),
    word: ([d, k, r, b]) => `${nm(d + r)} says to the class: "${thinkText(d, k, r, b)}" Everyone gets the same final number, whatever they started with. What is that number?`,
    teach: {
      idea: "Call the secret number n and write each step as an expression. The steps are chosen so that the n's cancel out, leaving only a number: that is why the trick works for EVERY starting number, not just the ones you tried.",
      method: "Write n for the number. Multiply, add and divide the whole expression step by step, then take away the n's. What is left is the answer.",
      alternatives: [
        { id: "examples_vs_proof", title: "Examples suggest, algebra shows", kind: "conceptual", text: ["Try the trick with 1, then with 10: both give the same end number. That suggests the trick works, but trying examples cannot check every number.", "Writing n for the number and simplifying shows it works for all numbers at once — that is a proof."] },
      ],
    },
    limits: "Tricks with multiply, add, divide and take away the starting number; writing the algebraic explanation is marked by an educator.",
  },
  // ============================================================ frequency tables (ungrouped)
  {
    id: "akfreq",
    arity: 3,
    title: "Counting from raw data with a frequency table",
    competency: FREQ,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, s, q]) => (c < 0 || c > 2 || s < 0 || s > 59 || q < 0 || q > 1 ? "One of three data sets and one of two questions." : null),
    prompt: ([c, s, q]) => {
      const { v } = freqData(c, s, q);
      return `The table shows ${FQC[c].what}. Organise the data in a frequency table with tally marks, then answer: ${q ? FQC[c].ask1(v) : FQC[c].ask0(v)}`;
    },
    solve: ([c, s, q]) => {
      const { xs, v } = freqData(c, s, q);
      const freq = new Map<number, number>();
      for (const x of xs) freq.set(x, (freq.get(x) ?? 0) + 1);
      const ans = q ? [...freq].filter(([k]) => k > v).reduce((a, [, f]) => a + f, 0) : freq.get(v) ?? 0;
      return {
        steps: [
          { id: "tally", op: "count", competency: FREQ, inputs: [xs.length], value: [...freq].sort((a, b) => a[0] - b[0]).map(([k, f]) => `${k}: ${f}`).join(", ") },
          ...(q ? [{ id: "add", op: "add", competency: ADD, inputs: [...freq].filter(([k]) => k > v).sort((a, b) => a[0] - b[0]).map(([, f]) => f), value: ans } as Step] : []),
        ],
        answer: ans,
      };
    },
    // independent: go through the raw data once and count the matches
    validate: ([c, s, q], v) => {
      const { xs, v: t } = freqData(c, s, q);
      let n = 0;
      for (const x of xs) if (q ? x > t : x === t) n++;
      return v === n;
    },
    bugs: ([c, s, q]) => {
      const { xs, v } = freqData(c, s, q);
      const n = xs.filter((x) => (q ? x > v : x === v)).length;
      return [
        bug("missed-one", "procedural", FREQ, "One value was missed. Cross off each value as you tally it, and check that the tallies add up to the number of values.", n - 1),
        bug("counted-twice", "procedural", FREQ, "One value was counted twice. Cross off each value once it has a tally mark.", n + 1),
        ...(q ? [bug("included-boundary", "conceptual", FREQ, `The values equal to ${v} were counted too. 'More than ${v}' does not include ${v} itself.`, xs.filter((x) => x >= v).length), bug("next-value-only", "procedural", FREQ, `Only the value just above ${v} was counted. Every value bigger than ${v} counts.`, xs.filter((x) => x === v + 1).length)] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "tally" ? `Tally the ${s.inputs[0]} values: ${s.value}` : `Add the frequencies: ${s.inputs.join(" + ")} = ${s.value}`),
    figure: ([c, s, q]) => ({ type: "table", head: ["", "", "", "", "", ""], rows: chunk(freqData(c, s, q).xs, 6) }),
    domain: [[0, 2], [0, 59], [0, 1]],
    difficulty: ([c, , q]) => (q === 0 && c < 2 ? 1 : q === 0 ? 2 : 3),
    word: ([c, s, q]) => {
      const { xs, v } = freqData(c, s, q);
      return `${nm(c + s)} collected ${FQC[c].listed} from a class: ${xs.join(", ")}. ${q ? FQC[c].ask1(v) : FQC[c].ask0(v)}`;
    },
    teach: {
      idea: "A frequency table shows how many times each value occurs, so the raw data can be read at a glance. The frequencies add up to the number of values collected.",
      method: "List the possible values in order. Go through the data once, making a tally mark (bundles of five: four lines and one across) beside each value and crossing it off. Count the tallies.",
      visual: ([c, s, q]) => {
        const { xs } = freqData(c, s, q);
        const vals = [...new Set(xs)].sort((a, b) => a - b);
        return { type: "table", head: ["Value", "Frequency"], rows: vals.map((x) => [x, xs.filter((y) => y === x).length]) };
      },
      alternatives: [
        { id: "sort_first", title: "Sort the data first", kind: "procedural", text: ["Write the values in order from smallest to largest.", "Equal values now sit together, so each group is easy to count."] },
      ],
    },
    limits: "24 or 25 whole-number values; posing a question and collecting the data are done in class.",
  },
  // ============================================================ grouped frequency
  {
    id: "akgroup",
    arity: 2,
    title: "Counting a class interval in grouped data",
    competency: FREQ,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s, j]) => (s < 0 || s > 99 || j < 0 || j > 4 ? "One of 100 data sets and one of five classes." : null),
    prompt: ([, j]) => `The table shows the marks (out of 50) of 30 students. Group them into the classes 0–10, 10–20, 20–30, 30–40 and 40–50, where each class includes its lower limit but not its upper limit (so 20 goes in 20–30). How many students are in the class ${10 * j}–${10 * j + 10}?`,
    solve: ([s, j]) => {
      const xs = groupData(s);
      const n = xs.filter((x) => x >= 10 * j && x < 10 * j + 10).length;
      return { steps: [{ id: "count", op: "count", competency: FREQ, inputs: [10 * j, 10 * j + 10], value: n }], answer: n };
    },
    // independent: the class of a mark is its tens digit; count by tens digit
    validate: ([s, j], v) => v === groupData(s).filter((x) => Math.floor(x / 10) === j).length,
    bugs: ([s, j]) => {
      const xs = groupData(s);
      const lo = 10 * j;
      const hi = lo + 10;
      const n = xs.filter((x) => x >= lo && x < hi).length;
      return [
        bug("upper-included", "conceptual", FREQ, `Marks of exactly ${hi} were counted in ${lo}–${hi}. The upper limit belongs to the next class.`, xs.filter((x) => x >= lo && x <= hi).length),
        ...(j > 0 ? [bug("lower-excluded", "conceptual", FREQ, `Marks of exactly ${lo} were left out. The lower limit belongs to this class.`, xs.filter((x) => x > lo && x <= hi).length)] : []),
        bug("missed-one", "procedural", FREQ, "One mark was missed. Tally each mark and cross it off.", n - 1),
      ];
    },
    variants: () => [],
    explain: (s) => `Count the marks from ${s.inputs[0]} up to (but not including) ${s.inputs[1]}: ${s.value}`,
    figure: ([s]) => ({ type: "table", head: ["", "", "", "", "", ""], rows: chunk(groupData(s), 6) }),
    domain: [[0, 99], [0, 4]],
    cap: 400,
    difficulty: ([, j]) => (j === 0 || j === 4 ? 1 : 2),
    word: ([s, j]) => `A teacher has the test marks (out of 50) of 30 students: ${groupData(s).join(", ")}. She makes groups 0–10, 10–20, 20–30, 30–40, 40–50, each including its lower limit but not its upper one. How many students go in the group ${10 * j}–${10 * j + 10}?`,
    teach: {
      idea: "Grouping puts the data in class intervals of equal width. Each value must go in exactly one class, so a value on a boundary goes in the class that starts with it.",
      method: "For each mark, find the class whose lower limit is at most the mark and whose upper limit is more than it. Tally the class, then count.",
      visual: ([s]) => {
        const xs = groupData(s);
        return { type: "table", head: ["Class", "Frequency"], rows: [0, 1, 2, 3, 4].map((j) => [`${10 * j}–${10 * j + 10}`, xs.filter((x) => Math.floor(x / 10) === j).length]) };
      },
      alternatives: [
        { id: "tens_digit", title: "Look at the tens digit", kind: "procedural", text: ["With classes of width 10 starting at 0, a mark's class is fixed by its tens digit: 27 and 20 go in 20–30, 30 goes in 30–40.", "Count the marks with the right tens digit."] },
      ],
    },
    limits: "30 marks out of 50 in five classes of width 10; drawing the grouped table is done in class.",
  },
  // ============================================================ percentage from a bar chart
  {
    id: "akbarpct",
    arity: 3,
    title: "Reading a percentage from a bar chart",
    competency: DISP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, s, j]) => (c < 0 || c > 2 || !Number.isInteger(s) || s < 0 || s > 49 || j < 0 || j > 3 ? "One of three bar charts and one of its four bars." : isRepeat(`akbarpct${c}`, 50, (t) => JSON.stringify(barData(c, t)), s) ? "An earlier choice already draws this bar chart (distinct@1)." : null),
    prompt: ([c, s, j]) => `The bar chart shows the ${BPC[c].desc}. What percentage of ${BPC[c].whole} ${BPC[c].ask[j]}?`,
    solve: ([c, s, j]) => {
      const { T, v } = barData(c, s);
      return {
        steps: [
          { id: "read", op: "read", competency: BAR, inputs: BPC[c].labels, value: v.join(", ") },
          { id: "total", op: "add", competency: ADD, inputs: v, value: T },
          { id: "percent", op: "divide", competency: PCT, inputs: [v[j], T], value: (100 * v[j]) / T },
        ],
        answer: (100 * v[j]) / T,
      };
    },
    // independent: the percentage times the total, divided by 100, must give back the bar
    validate: ([c, s, j], ans) => {
      if (typeof ans !== "number") return false;
      const { v } = barData(c, s);
      let total = 0;
      for (const x of v) total += x;
      return ans * total === 100 * v[j];
    },
    bugs: ([c, s, j]) => {
      const { T, v } = barData(c, s);
      const mx = Math.max(...v);
      return [
        bug("value-as-percent", "conceptual", PCT, `The bar's value (${v[j]}) was given as the percentage. A percentage compares the bar with the total of all bars, ${T}.`, v[j]),
        bug("compared-with-largest", "procedural", DISP, "The bar was compared with the tallest bar. Compare it with the total of ALL the bars.", (100 * v[j]) % mx === 0 && v[j] !== mx ? (100 * v[j]) / mx : null),
        bug("compared-with-rest", "conceptual", PCT, "The bar was compared with the other bars only. The whole is all the bars together.", (100 * v[j]) % (T - v[j]) === 0 ? (100 * v[j]) / (T - v[j]) : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `Read the bars: ${s.value}` : s.id === "total" ? `Total: ${s.inputs.join(" + ")} = ${s.value}` : `${s.inputs[0]} out of ${s.inputs[1]} = ${s.inputs[0]} ÷ ${s.inputs[1]} × 100% = ${s.value}%`),
    figure: ([c, s]) => ({ type: "bars", title: BPC[c].desc, labels: BPC[c].labels, values: barData(c, s).v, scale: barData(c, s).u }),
    domain: [[0, 2], [0, 49], [0, 3]],
    cap: 400,
    difficulty: ([c, s]) => (barData(c, s).T === 200 ? 1 : barData(c, s).T === 500 ? 3 : 2),
    word: ([c, s, j]) => {
      const { v } = barData(c, s);
      return `Here are the ${BPC[c].desc}: ${BPC[c].labels.map((l, i) => `${l} ${v[i]}`).join(", ")}. What percentage of ${BPC[c].whole} ${BPC[c].ask[j]}?`;
    },
    teach: {
      idea: "A bar chart shows amounts; a percentage compares one amount with the whole. The whole is the total of all the bars.",
      method: "Read every bar against the scale, add them to get the total, then work out (bar ÷ total) × 100.",
      alternatives: [
        { id: "per_hundred", title: "Scale the total to 100", kind: "procedural", text: ["If the total is 400, divide every bar by 4 to see how many there would be out of 100.", "The bar's share out of 100 is its percentage."] },
      ],
    },
    limits: "Four-bar charts with totals of 200, 400, 500 or 800 and whole-number percentages; judging whether a display is clear or honest is marked by an educator.",
  },
  // ============================================================ median
  {
    id: "akmed",
    arity: 2,
    title: "Finding the median",
    competency: MED,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    reject: ([s, n]) => (s < 0 || s > 79 || n < 5 || n > 10 ? "Five to ten different values." : null),
    prompt: ([s, n]) => `Find the median of these numbers: ${medData(s, n).join(", ")}.`,
    solve: ([s, n]) => {
      const xs = medData(s, n);
      const sorted = [...xs].sort((a, b) => a - b);
      return {
        steps: [
          { id: "sort", op: "order", competency: MED, inputs: xs, value: sorted.join(", ") },
          { id: "middle", op: "choose", competency: MED, inputs: n % 2 ? [sorted[(n - 1) / 2]] : [sorted[n / 2 - 1], sorted[n / 2]], value: median(xs) },
        ],
        answer: median(xs),
      };
    },
    // independent: as many values lie below the median as above it (the values are all different)
    validate: ([s, n], v) => {
      if (typeof v !== "number") return false;
      const xs = medData(s, n);
      const below = xs.filter((x) => x < v);
      const above = xs.filter((x) => x > v);
      if (n % 2) return xs.includes(v) && below.length === above.length;
      return below.length === n / 2 && above.length === n / 2 && near(v, (Math.max(...below) + Math.min(...above)) / 2, 1e-12);
    },
    bugs: ([s, n]) => {
      const xs = medData(s, n);
      const sorted = [...xs].sort((a, b) => a - b);
      const mean = sum(xs) / n;
      return [
        bug("not-ordered", "procedural", MED, "The middle number of the list as given was taken. Put the numbers in order first.", n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2),
        bug("mean-for-median", "conceptual", AVG, "The mean was worked out. The median is the middle value once the numbers are in order.", Number.isInteger(mean * 10) ? mean : null),
        ...(n % 2 ? [] : [bug("one-middle", "procedural", MED, `With ${n} numbers there are two middle numbers (${sorted[n / 2 - 1]} and ${sorted[n / 2]}); the median is halfway between them.`, [sorted[n / 2 - 1], sorted[n / 2]])]),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "sort" ? `In order: ${s.value}` : s.inputs.length === 1 ? `The middle value is ${s.value}` : `The two middle values are ${s.inputs[0]} and ${s.inputs[1]}: (${s.inputs[0]} + ${s.inputs[1]}) ÷ 2 = ${s.value}`),
    domain: [[0, 79], [5, 10]],
    cap: 400,
    difficulty: ([, n]) => (n % 2 && n <= 7 ? 1 : n % 2 ? 2 : 3),
    word: ([s, n]) => `${nm(s)} wrote down ${MEDC[s % 4].desc(n)}: ${medData(s, n).join(", ")}. What is the median?`,
    teach: {
      idea: "The median is the middle value when the data are in order: half the values are below it and half above, so a few very large or very small values do not pull it.",
      method: "Write the values in order. With an odd number of values, the median is the middle one; with an even number, it is halfway between the two middle ones.",
      alternatives: [
        { id: "cross_off", title: "Cross off from both ends", kind: "procedural", text: ["Write the values in order, then cross off the smallest and the largest, again and again.", "The one value left (or halfway between the last two) is the median."] },
      ],
    },
    limits: "Five to ten different whole numbers; choosing between mean and median for a purpose is marked by an educator.",
  },
  // ============================================================ mode
  {
    id: "akmode",
    arity: 1,
    title: "Finding the mode",
    competency: MED,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s]) => (s < 0 || s > 199 ? "One of 200 data sets." : null),
    prompt: ([s]) => `Here are ${MODEC[s % 4].desc}: ${modeData(s).xs.join(", ")}. What is the mode?`,
    solve: ([s]) => {
      const { xs } = modeData(s);
      const f = new Map<number, number>();
      for (const x of xs) f.set(x, (f.get(x) ?? 0) + 1);
      const [M, fM] = [...f].sort((a, b) => b[1] - a[1])[0];
      return { steps: [{ id: "count", op: "count", competency: FREQ, inputs: [M], value: fM }, { id: "mode", op: "choose", competency: MED, inputs: [fM], value: M }], answer: M };
    },
    // independent: the mode occurs more often than every other value
    validate: ([s], v) => {
      const { xs } = modeData(s);
      const cnt = (y: number) => xs.filter((x) => x === y).length;
      return typeof v === "number" && cnt(v) > 0 && xs.every((x) => x === v || cnt(x) < cnt(v));
    },
    bugs: ([s]) => {
      const { xs, fM } = modeData(s);
      const med = median(xs);
      return [
        bug("frequency-given", "conceptual", MED, `The number of times the mode appears (${fM}) was given. The mode is the VALUE that appears most often.`, fM),
        bug("largest-value", "conceptual", MED, "The largest value was given. The mode is the value that occurs most often, not the biggest one.", Math.max(...xs)),
        bug("median-for-mode", "conceptual", MED, "The middle value was found. The mode is the most common value.", Number.isInteger(med) ? med : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "count" ? `${s.inputs[0]} appears ${s.value} times, more than any other value` : `So the mode is ${s.value}`),
    domain: [[0, 199]],
    difficulty: ([s]) => (modeData(s).xs.length <= 10 ? 1 : 2),
    word: ([s]) => `${nm(s)} wrote down ${MODEC[s % 4].desc}: ${modeData(s).xs.join(", ")}. Which value occurs most often?`,
    teach: {
      idea: "The mode is the value that occurs most often. It is useful for things like shoe sizes, where a shop wants to know the most common size.",
      method: "Make a frequency table (or sort the values) and choose the value with the highest frequency.",
      visual: ([s]) => {
        const { xs } = modeData(s);
        const vals = [...new Set(xs)].sort((a, b) => a - b);
        return { type: "bars", title: "how often each value occurs", labels: vals.map(String), values: vals.map((x) => xs.filter((y) => y === x).length), scale: 1 };
      },
      alternatives: [
        { id: "sort", title: "Sort and look for the longest run", kind: "procedural", text: ["Write the values in order. Equal values sit together in runs.", "The value with the longest run is the mode."] },
      ],
    },
    limits: "9 to 12 small whole-number values with a single mode; data with two modes are discussed in class.",
  },
  // ============================================================ mean of a frequency table
  {
    id: "akfmean",
    arity: 1,
    title: "The mean of data in a frequency table",
    competency: MED,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    reject: ([s]) => {
      if (!Number.isInteger(s) || s < 0 || s > 1999) return "One of 2000 frequency tables.";
      if (isRepeat("akfmean", 2000, (t) => JSON.stringify(fmeanData(t)), s)) return "An earlier choice already shows this frequency table (distinct@1).";
      const { xs, fs } = fmeanData(s);
      return (10 * sum(xs.map((x, i) => x * fs[i]))) % sum(fs) !== 0 ? "A mean with at most one decimal place." : null;
    },
    prompt: ([s]) => `The frequency table shows the ${fmeanData(s).C.what} for a group. Find the mean ${fmeanData(s).C.what}. (A decimal is fine.)`,
    solve: ([s]) => {
      const { xs, fs } = fmeanData(s);
      const fx = xs.map((x, i) => x * fs[i]);
      return {
        steps: [
          { id: "products", op: "multiply", competency: MED, inputs: xs.map((x, i) => `${x} × ${fs[i]}`), value: fx.join(", ") },
          { id: "sum-fx", op: "add", competency: ADD, inputs: fx, value: sum(fx) },
          { id: "sum-f", op: "add", competency: ADD, inputs: fs, value: sum(fs) },
          { id: "mean", op: "divide", competency: AVG, inputs: [sum(fx), sum(fs)], value: sum(fx) / sum(fs) },
        ],
        answer: sum(fx) / sum(fs),
      };
    },
    // independent: write out every single value and average the list
    validate: ([s], v) => {
      const { xs, fs } = fmeanData(s);
      const all: number[] = [];
      xs.forEach((x, i) => {
        for (let k = 0; k < fs[i]; k++) all.push(x);
      });
      return typeof v === "number" && near(v * all.length, all.reduce((a, b) => a + b, 0), 1e-9);
    },
    bugs: ([s]) => {
      const { xs, fs } = fmeanData(s);
      const fx = sum(xs.map((x, i) => x * fs[i]));
      return [
        bug("values-only", "conceptual", MED, "The values were averaged without their frequencies. Each value must be counted as many times as it occurs.", sum(xs) / 5),
        bug("divided-by-rows", "procedural", MED, `The total was divided by the number of rows (5). Divide by the number of ${fmeanData(s).C.f.toLowerCase().replace("number of ", "")}, ${sum(fs)}.`, fx / 5),
        bug("mean-of-frequencies", "conceptual", MED, "The frequencies were averaged. The mean is of the values, each counted as often as it occurs.", sum(fs) / 5),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "products" ? `Multiply each value by its frequency: ${s.inputs.join(", ")} = ${s.value}` : s.id === "sum-fx" ? `Total of all values: ${s.value}` : s.id === "sum-f" ? `Number of values: ${s.inputs.join(" + ")} = ${s.value}` : `Mean = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    figure: ([s]) => {
      const { C, xs, fs } = fmeanData(s);
      return { type: "table", head: [C.x, C.f], rows: xs.map((x, i) => [x, fs[i]]) };
    },
    domain: [[0, 1999]],
    keep: ([s]) => {
      const { xs, fs } = fmeanData(s);
      return (10 * sum(xs.map((x, i) => x * fs[i]))) % sum(fs) === 0;
    },
    cap: 300,
    difficulty: ([s]) => {
      const { xs, fs } = fmeanData(s);
      return sum(xs.map((x, i) => x * fs[i])) % sum(fs) === 0 ? 1 : 2;
    },
    word: ([s]) => {
      const { C, xs, fs } = fmeanData(s);
      return `In a survey, ${nm(s)} recorded the ${C.what}: ${xs.map((x, i) => `${x} (${fs[i]} ${fs[i] === 1 ? "time" : "times"})`).join(", ")}. What is the mean ${C.what}?`;
    },
    teach: {
      idea: "A frequency table is a short way of writing a long list: a value with frequency 4 stands for that value written 4 times. The mean shares the total of ALL the values equally.",
      method: "Multiply each value by its frequency and add these to get the total. Add the frequencies to get how many values there are. Divide the total by that number.",
      alternatives: [
        { id: "write_out", title: "Write the list out", kind: "conceptual", text: ["Write each value as many times as its frequency, e.g. 2, 2, 2, 3, 3, ….", "Add them all and divide by how many there are; multiplying by the frequency is a shortcut for this."] },
      ],
    },
    limits: "Five whole-number values with frequencies up to 9 and a mean with at most one decimal place; the median of a frequency table is another family.",
  },
  // ============================================================ histograms
  {
    id: "akhist",
    arity: 2,
    title: "Reading a histogram of grouped data",
    competency: HIST,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s, q]) => (s < 0 || s > 149 || q < 0 || q > 3 ? "One of 150 histograms and one of four questions." : null),
    prompt: ([s, q]) => {
      const { C, j, labels, b } = histData(s, q);
      const ask = q === 0 ? `How many ${C.who} are in the group ${labels[j]}?` : q === 1 ? `How many ${C.who} are there in all?` : q === 2 ? `How many ${C.who} have ${C.what} of ${b}${C.unit} or more?` : `How many ${C.who} have ${C.what} of less than ${b}${C.unit}?`;
      return `The histogram shows the ${C.desc}. Each bar includes its lower value but not its upper value. ${ask}`;
    },
    solve: ([s, q]) => {
      const { f, j } = histData(s, q);
      const parts = q === 0 ? [f[j]] : q === 1 ? f : q === 2 ? f.slice(j) : f.slice(0, j);
      const steps: Step[] = [{ id: "read", op: "read", competency: HIST, inputs: [q, j], value: parts.join(", ") }];
      if (parts.length > 1) steps.push({ id: "add", op: "add", competency: ADD, inputs: parts, value: sum(parts) });
      return { steps, answer: sum(parts) };
    },
    // independent: test each class's limits against the question, bar by bar
    validate: ([s, q], v) => {
      const { C, L, f, j, b } = histData(s, q);
      let n = 0;
      f.forEach((x, i) => {
        const lo = L + i * C.w;
        const hi = lo + C.w;
        if (q === 0 ? i === j : q === 1 ? true : q === 2 ? lo >= b : hi <= b) n += x;
      });
      return v === n;
    },
    bugs: ([s, q]) => {
      const { f, j } = histData(s, q);
      const total = sum(f);
      if (q === 0) return [bug("next-bar", "procedural", HIST, "A bar next to the one asked about was read. Find the group's label under the bar first.", [f[j + 1], f[j - 1]].filter((x) => x !== undefined) as number[])];
      if (q === 1) return [bug("missed-bar", "procedural", HIST, "One bar was left out of the total. Add every bar, ticking each one.", [...new Set(f.map((x) => total - x))]), bug("counted-bars", "conceptual", HIST, "The bars were counted. Each bar's height is how many are in that group: add the heights.", 5)];
      if (q === 2) return [bug("class-below-included", "conceptual", HIST, "The bar just below the value was included. Its values are all less than the boundary.", sum(f.slice(j - 1))), bug("boundary-class-left-out", "conceptual", HIST, "The bar starting exactly at the value was left out. It includes its lower value, so it counts.", sum(f.slice(j + 1)))];
      return [bug("boundary-class-included", "conceptual", HIST, "The bar starting at the value was included. Its values are that value or more, so it does not count.", sum(f.slice(0, j + 1))), bug("one-class-short", "procedural", HIST, "The bar just below the value was left out. Every bar that ends at or below the value counts.", sum(f.slice(0, j - 1)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `Read the bar heights needed: ${s.value}` : `Add them: ${s.inputs.join(" + ")} = ${s.value}`),
    figure: ([s, q]) => {
      const { C, f, labels } = histData(s, q);
      return { type: "bars", title: C.desc, labels, values: f, scale: 1, histogram: true };
    },
    domain: [[0, 149], [0, 3]],
    cap: 400,
    difficulty: ([, q]) => (q === 0 ? 1 : q === 1 ? 2 : 3),
    word: ([s, q]) => {
      const { C, f, j, labels, b } = histData(s, q);
      const ask = q === 0 ? `How many ${C.who} are in the group ${labels[j]}?` : q === 1 ? `How many ${C.who} are there in all?` : q === 2 ? `How many ${C.who} have ${C.what} of ${b}${C.unit} or more?` : `How many ${C.who} have ${C.what} of less than ${b}${C.unit}?`;
      return `A teacher grouped the ${C.desc}: ${labels.map((l, i) => `${l}: ${f[i]}`).join(", ")} (each group includes its lower value but not its upper value). ${ask}`;
    },
    teach: {
      idea: "A histogram is a bar chart for grouped data: the bars touch because the groups follow on without gaps, and each bar's height is how many values are in that group.",
      method: "Read the group labels under the bars. For 'or more', add the bars that start at the value and above; for 'less than', add the bars that end at the value and below.",
      visual: ([s, q]) => {
        const { f, labels } = histData(s, q);
        return { type: "table", head: ["Group", "Frequency"], rows: labels.map((l, i) => [l, f[i]]) };
      },
      alternatives: [
        { id: "number_line", title: "Mark the boundary", kind: "conceptual", text: ["Imagine the groups along a number line. Draw a line at the value in the question.", "The bars wholly on the correct side of the line are the ones to add."] },
      ],
    },
    limits: "Five equal classes with frequencies 2 to 12; drawing histograms and frequency polygons is marked by an educator.",
  },
  // ================================================================== gap@1 additions
  // ------------------------------------------------------------------ sorting numbers by divisibility (2, 4, 5, 8, 10)
  {
    id: "akdsort",
    arity: 2,
    title: "Which number is divisible: tests for 2, 4, 5, 8 and 10",
    competency: DIV,
    type: "choice",
    // [k, s]: test k (0 by 2, 1 by 5, 2 by 10, 3 by 5 but not by 10, 4 by 4, 5 by 8); s seeds the four numbers
    parse: none,
    reject: ([k, s]) => (k >= 0 && k <= 5 && s >= 0 && s <= 99 ? null : "Six tests and seeds 0 to 99."),
    choices: (p) => dsortSet(p).opts.map(String),
    prompt: (p) => `Which of these numbers is ${DSORT_ASK[p[0]]}? ${dsortSet(p).opts.join(";  ")}`,
    solve: (p) => {
      const d = dsortSet(p);
      return { steps: [{ id: "test", op: "test", competency: DIV, inputs: [DSORT_RULE[p[0]]], value: "" }], answer: d.right };
    },
    // independent: divide each option by the divisor and look at the remainder
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const ok = (n: number) => [n % 2 === 0, n % 5 === 0, n % 10 === 0, n % 5 === 0 && n % 10 !== 0, n % 4 === 0, n % 8 === 0][p[0]];
      const opts = dsortSet(p).opts;
      return v >= 0 && v < opts.length && ok(opts[v]) && opts.filter(ok).length === 1;
    },
    bugs: (p) => {
      const d = dsortSet(p);
      return [bug(`trap-${p[0]}`, "conceptual", DIV, DSORT_SLIP[p[0]], d.trap)];
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 5], [0, 99]],
    difficulty: ([k]) => (k <= 2 ? 1 : k === 3 ? 2 : 3),
    word: (p) => `Packets are packed ${DSORT_PACK[p[0]]}. Which of these numbers of sweets can be packed exactly that way, with none left over? ${dsortSet(p).opts.join(";  ")}`,
    teach: {
      idea: "Because 10 is divisible by 2 and 5, only the ones digit decides divisibility by 2, 5 and 10. Because 100 is divisible by 4 and 1000 by 8, only the last two (for 4) or last three (for 8) digits matter.",
      method: "By 2: ones digit 0, 2, 4, 6 or 8. By 5: ones digit 0 or 5. By 10: ones digit 0. By 4: the number made by the last two digits is divisible by 4. By 8: the last three digits are divisible by 8.",
      alternatives: [{ id: "why", title: "Why the last digits", kind: "conceptual", text: ["3456 = 3400 + 56. 3400 is a number of hundreds, and 100 = 4 × 25, so 3400 is divisible by 4.", "So 3456 is divisible by 4 exactly when 56 is."] }],
    },
    limits: "Three- to five-digit numbers and one test at a time; the tests for 3, 6, 9 and 11 are akdivd, and explaining a test is a written task.",
  },

  // ------------------------------------------------------------------ digit explorations: Kaprekar to 6174, digit sums, palindromes
  {
    id: "akdig",
    arity: 2,
    title: "Testing digit conjectures: Kaprekar's 6174, repeated digit sums, reverse-and-add palindromes",
    competency: CONJ,
    type: "integer",
    mc: true,
    // [m, n]: m 0 how many Kaprekar steps take the four-digit n to 6174; 1 the single digit left by repeated digit sums;
    // 2 how many reverse-and-add steps make the two-digit n a palindrome
    parse: none,
    reject: (p) => (digOk(p) ? null : "Four-digit numbers (digits not all equal) for Kaprekar, 10 to 9999 for digit sums, two-digit numbers reaching a palindrome in at most 6 steps."),
    prompt: ([m, n]) =>
      m === 0
        ? `Kaprekar's routine: arrange the four digits to make the largest and the smallest numbers (always use four digits, so 0999 counts) and subtract. Start with ${n} and repeat the routine on each answer. How many times must you do it to reach 6174?`
        : m === 1
          ? `Add the digits of ${n}. If the result has more than one digit, add its digits, and keep going until a single digit is left. What digit is left?`
          : `Reverse the digits of ${n} and add the reversed number to it. Repeat with each answer until you get a palindrome (a number that reads the same both ways). How many additions does it take?`,
    solve: ([m, n]) => {
      if (m === 1) {
        const steps: Step[] = [];
        let x = n;
        while (x >= 10) {
          const y = sum(String(x).split("").map(Number));
          steps.push({ id: `sum${steps.length}`, op: "add", competency: ADD, inputs: [x], value: y });
          x = y;
        }
        return { steps, answer: x };
      }
      const seq = m === 0 ? kapSeq(n) : palSeq(n);
      return { steps: seq.slice(1).map((v, i) => ({ id: `s${i + 1}`, op: m === 0 ? "subtract" : "add", competency: CONJ, inputs: [seq[i]], value: v })), answer: seq.length - 1 };
    },
    // independent: m 0 uses 999(a − d) + 90(b − c) for each step; m 1 the remainder on division by 9; m 2 checks that
    // the typed number of additions gives a palindrome and one fewer does not
    validate: ([m, n], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
      if (m === 1) return v === 1 + ((n - 1) % 9);
      if (m === 0) {
        const step = (x: number) => {
          const [a, b, c, d] = String(x).padStart(4, "0").split("").map(Number).sort((s, t) => t - s);
          return 999 * (a - d) + 90 * (b - c);
        };
        let x = n;
        for (let i = 0; i < v; i++) {
          if (x === 6174) return false;
          x = step(x);
        }
        return x === 6174 && (v === 0 || n !== 6174);
      }
      const isPal = (x: number) => String(x) === String(x).split("").reverse().join("");
      let x = n;
      for (let i = 0; i < v; i++) {
        if (isPal(x)) return false;
        x += Number(String(x).split("").reverse().join(""));
      }
      return isPal(x);
    },
    bugs: ([m, n]) => {
      if (m === 1) {
        const once = sum(String(n).split("").map(Number));
        return [
          ...(once >= 10 ? [bug("one-round", "procedural", CONJ, `Only one round of adding was done: ${once} still has two digits, so add its digits again.`, once)] : []),
          ...(1 + ((n - 1) % 9) === 9 ? [bug("nine-as-zero", "conceptual", CONJ, "The answer 9 was given as 0 (the remainder on dividing by 9). Repeated digit sums never give 0 for a positive number; a multiple of 9 ends at 9.", 0)] : []),
        ];
      }
      const steps = (m === 0 ? kapSeq(n) : palSeq(n)).length - 1;
      return [
        bug("counted-start", "procedural", CONJ, "The starting number was counted as a step. Count only the times the routine is carried out.", steps + 1),
        ...(steps > 1 ? [bug("stopped-early", "procedural", CONJ, `The count stopped one step early; keep going until ${m === 0 ? "6174 itself appears" : "the palindrome itself appears"}.`, steps - 1)] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.op === "add" && s.competency === ADD ? `Digit sum of ${s.inputs[0]}: ${s.value}` : `${s.inputs[0]} → ${s.value}`),
    domain: [[0, 2], [10, 9999]],
    keep: digOk,
    cap: 450,
    difficulty: ([m, n]) => (m === 1 ? (n < 1000 ? 1 : 2) : m === 2 ? 2 : 3),
    word: ([m, n]) =>
      m === 0
        ? `${nm(n)} tests the conjecture that Kaprekar's routine always reaches 6174, starting from the year ${n}. (Each time: largest arrangement of the four digits minus smallest, keeping four digits.) After how many rounds does ${nm(n)} first get 6174?`
        : m === 1
          ? `A shopkeeper checks bills by adding the digits of the total, then the digits of that answer, until one digit is left. The bill is ₹${n}. Which digit does the check give?`
          : `${nm(n)} tests the conjecture that reversing and adding always makes a palindrome, starting from ${n}. How many additions does it take?`,
    teach: {
      idea: "A conjecture is a guess from patterns: every four-digit number (not all digits equal) reaches 6174 by Kaprekar's routine in at most 7 steps; repeated digit sums give the remainder on dividing by 9 (or 9); reversing and adding usually reaches a palindrome. Testing many numbers builds confidence, but only a proof makes it certain.",
      method: "Carry out the process carefully, writing every number, and count the steps. Check against the conjecture: the answer for Kaprekar is never more than 7; the digit-sum answer is the remainder on dividing by 9.",
      alternatives: [{ id: "table", title: "Keep a table", kind: "procedural", text: ["Write the step number and the number you get in two columns.", "Stop as soon as the target appears and read the last step number."] }],
    },
    limits: "Four-digit numbers for Kaprekar, numbers up to 9999 for digit sums and two-digit starts for palindromes (89 and 98 take 24 steps and are left out).",
  },
  {
    id: "akcolst",
    arity: 2,
    title: "How a Collatz sequence behaves: steps to reach 1, and its highest number",
    competency: CONJ,
    type: "integer",
    mc: true,
    // [m, n]: m 0 how many steps take n to 1; m 1 the largest number in the sequence from n
    parse: none,
    reject: ([m, n]) => (n >= 3 && n <= 60 && (m === 0 ? colInfo(n).steps <= 25 : m === 1 && colInfo(n).max <= 300) ? null : "Starts from 3 to 60 that reach 1 within 25 steps, or whose sequence stays at or below 300."),
    prompt: ([m, n]) => `Collatz rule: if a number is even, halve it; if it is odd, multiply by 3 and add 1. Start with ${n} and keep applying the rule until you reach 1. ${m === 0 ? "How many steps does it take to reach 1?" : "What is the largest number in the sequence?"}`,
    solve: ([m, n]) => {
      const seq = colSeq(n);
      return { steps: [{ id: "seq", op: "iterate", competency: CONJ, inputs: [seq.join(", ")], value: m === 0 ? seq.length - 1 : Math.max(...seq) }], answer: m === 0 ? seq.length - 1 : Math.max(...seq) };
    },
    // independent: recursion that tests parity with a remainder
    validate: ([m, n], v) => {
      const go = (x: number, k: number, top: number): [number, number] => (x === 1 ? [k, top] : go(x - 2 * Math.floor(x / 2) === 0 ? x / 2 : 3 * x + 1, k + 1, Math.max(top, x)));
      const [k, top] = go(n, 0, n);
      return v === (m === 0 ? k : top);
    },
    bugs: ([m, n]) => {
      const { steps, max } = colInfo(n);
      if (m === 0) return [bug("counted-terms", "procedural", CONJ, "The numbers in the sequence were counted, including the start. Count the steps (the arrows) between them.", steps + 1), bug("stopped-at-two", "procedural", CONJ, "The count stopped at 2; the sequence must reach 1.", steps - 1)];
      return [...(max !== n ? [bug("start-taken", "conceptual", CONJ, "The starting number was taken as the largest. Odd numbers make the sequence climb (3 × n + 1) before it falls.", n)] : [])].filter((b) => b.predict !== max);
    },
    variants: () => [],
    explain: (s) => `The sequence: ${s.inputs[0]}`,
    domain: [[0, 1], [3, 60]],
    keep: ([m, n]) => (m === 0 ? colInfo(n).steps <= 25 : colInfo(n).max <= 300),
    difficulty: ([m, n]) => (colInfo(n).steps <= 8 ? 1 : colInfo(n).steps <= 16 ? 2 : 3) as 1 | 2 | 3,
    word: ([m, n]) => `${nm(n)} plays the Collatz game with ${n}: halve an even number, and for an odd number multiply by 3 and add 1, until reaching 1 (after that the game would loop 4, 2, 1 for ever). ${m === 0 ? "How many moves does it take to reach 1?" : "What is the largest number that appears?"}`,
    teach: {
      idea: "Every starting number tried so far reaches 1 and then loops 4, 2, 1 — the Collatz conjecture — but no one has proved it. The sequences can climb high before they fall.",
      method: "Write each number with an arrow to the next. Count the arrows for the number of steps, and look along the row for the largest number.",
      visual: ([, n]) => ({ type: "table", head: ["Step", "Number"], rows: colSeq(n).slice(0, 12).map((v, i) => [i, v]) }),
      alternatives: [{ id: "share", title: "Share the work", kind: "procedural", text: ["Sequences join up: once you reach a number you have done before, the rest is the same.", "So 10 → 5 → 16 → 8 → 4 → 2 → 1 takes 6 steps, and 20 takes one more."] }],
    },
    limits: "Starting numbers up to 60; a few (like 27) take over 100 steps and are left out.",
  },

  // ------------------------------------------------------------------ scientific notation: comparing, orders of magnitude, computing
  {
    id: "akscmp",
    arity: 1,
    title: "The largest of four numbers in scientific notation",
    competency: SCI,
    type: "choice",
    // [s]: s even: positive powers; s odd: negative powers (small quantities)
    parse: none,
    reject: ([s]) => (s >= 0 && s <= 399 ? null : "Seeds 0 to 399."),
    choices: ([s]) => scmpSet(s).opts.map(([a, e]) => `${a} × 10${sup(e)}`),
    prompt: ([s]) => `Which of these is the largest? ${scmpSet(s).opts.map(([a, e]) => `${a} × 10${sup(e)}`).join(";  ")}`,
    solve: ([s]) => ({ steps: [{ id: "powers", op: "compare", competency: SCI, inputs: ["Compare the powers of 10 first, then the numbers in front"], value: "" }], answer: scmpSet(s).right }),
    // independent: write each number as an ordinary decimal value and compare
    validate: ([s], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const xs = scmpSet(s).opts.map(([a, e]) => a * Math.pow(10, e));
      return v >= 0 && v < xs.length && xs.every((x, i) => i === v || x < xs[v]);
    },
    bugs: ([s]) => {
      const d = scmpSet(s);
      return [
        bug("front-number-only", "conceptual", SCI, "The numbers in front were compared. The power of 10 decides the size first: one more power of 10 is ten times as big.", d.bigA),
        ...(s % 2 ? [bug("negative-power", "conceptual", SCI, "A larger negative power was taken as larger. 10⁻⁷ is much smaller than 10⁻³: the more negative the power, the smaller the number.", d.mostNeg)] : []),
      ].filter((b) => b.predict !== d.right);
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 399]],
    cap: 400,
    difficulty: ([s]) => (s % 2 ? 3 : 2),
    word: ([s]) => `Four ${s % 2 ? "tiny particles were measured; their sizes in metres are" : "distances in kilometres were found in a science book"}: ${scmpSet(s).opts.map(([a, e]) => `${a} × 10${sup(e)}`).join(";  ")}. Which is the largest?`,
    teach: {
      idea: "In scientific notation the power of 10 tells the size: a number with a higher power is bigger, whatever number stands in front (that number is always between 1 and 10).",
      method: "Compare the powers of 10 first (for negative powers, −3 is higher than −7). Only when the powers are equal compare the numbers in front.",
      alternatives: [{ id: "write-out", title: "Write them out", kind: "procedural", text: ["6.1 × 10⁴ = 61,000 and 9.8 × 10³ = 9,800.", "Written out, the number of digits shows which is bigger."] }],
    },
    limits: "Four numbers with one decimal place in front and powers from 10⁻¹⁰ to 10¹²; ordering longer lists uses the same idea.",
  },
  {
    id: "aksmag",
    arity: 4,
    title: "Orders of magnitude of real quantities, and judging a claim",
    competency: SCI,
    type: "integer",
    mc: true,
    // [c, x, m, d]: quantity c with size x; m 0 the power of 10 (order of magnitude); m 1 a claim of 10^(n + d): how
    // many powers of ten the claim is off by
    parse: none,
    reject: (p) => (magOk(p) ? null : "Six everyday quantities; a claim off by −3 to 3 powers of ten."),
    prompt: ([c, x, m, d]) => {
      const n = magN(c, x);
      return m === 0
        ? `${MAG[c].q(x)} Write the answer as a × 10ⁿ with 1 ≤ a < 10. What is n (the order of magnitude)?`
        : `${MAG[c].q(x)} A website claims the answer is about 10${sup(n + d)}. By how many powers of ten is the claim off? (Give the claim's power minus the true power: positive if the claim is too big, negative if too small, 0 if it is right.)`;
    },
    solve: ([c, x, m, d]) => {
      const N = MAG[c].v(x);
      const n = magN(c, x);
      return { steps: [{ id: "value", op: "multiply", competency: SCI, inputs: [MAG[c].how(x)], value: N }, { id: "power", op: "order", competency: SCI, inputs: [N], value: n }, ...(m ? [{ id: "claim", op: "subtract", competency: SCI, inputs: [n + d, n], value: d } as Step] : [])], answer: m ? d : n };
    },
    // independent: 10^n ≤ N < 10^(n + 1), tested with whole numbers (BigInt)
    validate: ([c, x, m, d], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const N = BigInt(MAG[c].v(x));
      const n = m ? magN(c, x) + d - v : v;
      return n >= 0 && 10n ** BigInt(n) <= N && N < 10n ** BigInt(n + 1);
    },
    bugs: ([c, x, m, d]) => {
      const n = magN(c, x);
      if (m === 0) return [bug("digits-counted", "procedural", SCI, `The number of digits (${n + 1}) was used. A number with ${n + 1} digits is between 10${sup(n)} and 10${sup(n + 1)}, so n = ${n}.`, n + 1), bug("one-factor-left-out", "procedural", SCI, "One of the multiplications was left out; every factor in the calculation changes the size.", String(MAG[c].miss(x)).length - 1)];
      return [...(d !== 0 ? [bug("difference-reversed", "procedural", SCI, "The difference was taken the other way round: claim's power minus the true power.", -d)] : []), bug("digits-for-power", "procedural", SCI, "The number of digits was used as the true power; the true power is one less than the number of digits.", d - 1)];
    },
    variants: () => [],
    explain: (s) => (s.id === "value" ? `${s.inputs[0]} = ${inr(Number(s.value))}` : s.id === "power" ? `${inr(Number(s.inputs[0]))} has ${String(s.inputs[0]).length} digits, so it is about 10${sup(Number(s.value))}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 5], [1, 99], [0, 1], [-3, 3]],
    keep: magOk,
    cap: 450,
    difficulty: ([, , m]) => (m ? 3 : 2),
    teach: {
      idea: "The order of magnitude of a quantity is the power of 10 nearest below it: it tells the size at a glance (thousands, lakhs, crores, billions) and lets you spot a claim that is wildly wrong.",
      method: "Multiply the facts (round them if you like), write the result as a × 10ⁿ with 1 ≤ a < 10, and read n. To judge a claim, compare its power of 10 with yours.",
      alternatives: [{ id: "powers", title: "Multiply the powers", kind: "procedural", text: ["Round each fact to a power of 10 times a small number: 365 ≈ 3.65 × 10², 24 ≈ 2.4 × 10.", "Multiply the small numbers and add the powers; adjust if the front number reaches 10."] }],
    },
    limits: "Six quantities built from given facts (time, heartbeats, rice grains, steps, water, hair); estimating without any facts is discussed in class.",
  },
  {
    id: "akscalc",
    arity: 5,
    title: "Multiplying and dividing numbers in scientific notation",
    competency: SCI,
    type: "tuple",
    mc: true,
    // [m, a, b, e, f]: m 0 (a/10 × 10^e) × (b/10 × 10^f); m 1 a quotient whose answer is a/10 × 10^(e − f), divisor b/10 × 10^f
    parse: none,
    reject: ([m, a, b, e, f]) => ((m === 0 || m === 1) && a >= 11 && a <= 99 && b >= 11 && b <= 99 && a % 10 !== 0 && b % 10 !== 0 && e >= -8 && e <= 12 && f >= -8 && f <= 12 && e !== 0 && f !== 0 ? null : "Numbers 1.1 to 9.9 (one decimal place) times powers of 10 from 10⁻⁸ to 10¹²."),
    prompt: (p) => {
      const [x, y] = scalcOps(p);
      return `Work out (${x}) ${p[0] ? "÷" : "×"} (${y}). Give the answer in scientific notation as (a, n) for a × 10ⁿ with 1 ≤ a < 10: for example 3.5 × 10⁴ is (3.5, 4).`;
    },
    solve: (p) => {
      const [A, N, raw, rawN] = scalcAns(p);
      return {
        steps: [
          { id: "front", op: p[0] ? "divide" : "multiply", competency: SCI, inputs: [p[0] ? "divide the numbers in front" : "multiply the numbers in front"], value: raw },
          { id: "powers", op: p[0] ? "subtract" : "add", competency: EXP, inputs: [p[0] ? "subtract the powers" : "add the powers"], value: rawN },
          { id: "normal", op: "rewrite", competency: SCI, inputs: [raw, rawN], value: `${A} × 10^${N}` },
        ],
        answer: `(${A}, ${neg(N)})`,
      };
    },
    // independent: compare the value of the typed a × 10ⁿ with the exact product or quotient, and check 1 ≤ a < 10
    validate: (p, v) => {
      const t = tup(v);
      if (t.length !== 2 || t.some((x) => !Number.isFinite(x)) || !Number.isInteger(t[1]) || t[0] < 1 || t[0] >= 10) return false;
      const [m, a, b, e, f] = p;
      const typed = t[0] * Math.pow(10, t[1]);
      const exact = m === 0 ? (a / 10) * (b / 10) * Math.pow(10, e + f) : (a / 10) * Math.pow(10, e - f);
      return near(typed, exact, 1e-9);
    },
    bugs: (p) => {
      const [m, , , e, f] = p;
      const [A, N, raw, rawN] = scalcAns(p);
      const out: Bug[] = [];
      if (raw >= 10 || raw < 1) out.push(bug("not-normalised", "procedural", SCI, `${raw} is not between 1 and 10, so it must be rewritten: the power of 10 changes by one.`, `(${raw}, ${neg(rawN)})`));
      if (m === 0) out.push(bug("powers-multiplied", "conceptual", EXP, `The powers were multiplied. When multiplying, add the powers: 10${sup(e)} × 10${sup(f)} = 10${sup(e + f)}.`, `(${A}, ${neg(N - rawN + e * f)})`));
      else out.push(bug("powers-added", "conceptual", EXP, `The powers were added. When dividing, subtract the powers: 10${sup(e)} ÷ 10${sup(f)} = 10${sup(e - f)}.`, `(${A}, ${neg(N - rawN + e + f)})`));
      return out.filter((b) => b.predict !== `(${A}, ${neg(N)})`);
    },
    distractors: (p) => {
      const [A, N] = scalcAns(p);
      return [`(${A}, ${neg(N + 1)})`, `(${A}, ${neg(N - 1)})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "front" ? `First ${s.inputs[0]}: ${s.value}` : s.id === "powers" ? `Then ${s.inputs[0]}: ${s.value}` : `In scientific notation: ${String(s.value).replace(/\^(-?\d+)/, (_, k) => sup(Number(k)))}`),
    domain: [[0, 1], [11, 99], [11, 99], [-8, 12], [-8, 12]],
    keep: ([, a, b, e, f]) => a % 10 !== 0 && b % 10 !== 0 && e !== 0 && f !== 0,
    cap: 450,
    difficulty: (p) => (scalcAns(p)[2] >= 10 || scalcAns(p)[2] < 1 ? 3 : p[3] < 0 || p[4] < 0 ? 2 : 1),
    word: (p) => {
      const [x, y] = scalcOps(p);
      return p[0] ? `A rectangular sheet of material has an area of ${x} square metres and a length of ${y} metres. What is its breadth, in metres? Give (a, n) for a × 10ⁿ.` : `A rectangular sheet of material is ${x} metres long and ${y} metres wide. What is its area, in square metres? Give (a, n) for a × 10ⁿ.`;
    },
    teach: {
      idea: "(a × 10ᵐ) × (b × 10ⁿ) = (a × b) × 10ᵐ⁺ⁿ and (a × 10ᵐ) ÷ (b × 10ⁿ) = (a ÷ b) × 10ᵐ⁻ⁿ. Then the front number may need adjusting to lie between 1 and 10.",
      method: "Work out the front numbers, add (or subtract) the powers, then if the front number is 10 or more divide it by 10 and add 1 to the power (if it is less than 1, multiply by 10 and subtract 1).",
      alternatives: [{ id: "example", title: "An example", kind: "procedural", text: ["(4 × 10³) × (5 × 10⁶) = 20 × 10⁹.", "20 is not below 10, so write 2 × 10¹⁰."] }],
    },
    limits: "Front numbers with one decimal place and powers from 10⁻⁸ to 10¹²; adding numbers in scientific notation is not asked.",
  },

  // ------------------------------------------------------------------ cryptarithms with several letters and with multiplication
  {
    id: "akcrypt2",
    arity: 3,
    title: "Letter puzzles with several letters, in additions and multiplications",
    competency: DIG,
    type: "integer",
    mc: true,
    range: [0, 9],
    // [k, i, w]: k 0 the i-th addition AB + CD = … with one solution; k 1 the i-th multiplication AB × C = …; w the letter asked
    parse: none,
    reject: (p) => (cryptOk(p) ? null : "Puzzles with exactly one solution and a letter that appears in them."),
    prompt: ([k, i, w]) => `In this puzzle each letter stands for a digit: different letters stand for different digits, the same letter always for the same digit, and no number starts with 0. ${CRYPT[k][i].p.replace("+", " + ").replace("*", " × ").replace("=", " = ")}. What digit is ${"ABCDEFG"[w]}?`,
    solve: ([k, i, w]) => {
      const c = CRYPT[k][i];
      return { steps: [{ id: "fill", op: "solve", competency: DIG, inputs: [c.p, c.s], value: cryptDigit(c, w) }], answer: cryptDigit(c, w) };
    },
    // independent: try every possible pair of numbers for the puzzle and keep those that fit the letter pattern
    validate: ([k, i, w], v) => {
      const c = CRYPT[k][i];
      const fits: string[] = [];
      for (let a = 10; a <= 99; a++) for (let b = k ? 2 : 10; b <= (k ? 9 : 99); b++) {
        const s = `${a}${k ? "*" : "+"}${b}=${k ? a * b : a + b}`;
        if (letterPattern(s) === c.p) fits.push(s);
      }
      if (fits.length !== 1) return false;
      const at = c.p.indexOf("ABCDEFG"[w]);
      return at >= 0 && Number(fits[0][at]) === v;
    },
    bugs: ([k, i, w]) => {
      const c = CRYPT[k][i];
      const right = cryptDigit(c, w);
      const slip = cryptNoCarry(c, w, k);
      return slip !== null && slip !== right ? [bug("carry-forgotten", "procedural", k ? "MATH.number.multi-digit-multiply" : ADDR, "The carry from the column to the right was forgotten. Work column by column from the ones, and add any carried ten.", slip)] : [];
    },
    distractors: ([k, i, w]) => {
      const x = cryptDigit(CRYPT[k][i], w);
      return [(x + 1) % 10, (x + 9) % 10, (x + 2) % 10];
    },
    variants: () => [],
    explain: (s) => `The puzzle is ${String(s.inputs[1]).replace("*", " × ").replace("+", " + ").replace("=", " = ")}, so the letter is ${s.value}`,
    domain: [[0, 1], [0, 75], [0, 6]],
    keep: cryptOk,
    difficulty: ([k, i]) => (k ? 3 : new Set(CRYPT[0][i].p.replace(/[^A-J]/g, "")).size >= 5 ? 3 : 2),
    teach: {
      idea: "A letter puzzle is an ordinary sum or product with digits hidden. Each column gives a clue: what the ones must add (or multiply) to, and whether a ten is carried.",
      method: "Start with the clue that fixes a letter at once (a three-digit total of two two-digit numbers starts with 1; a letter repeated in the answer limits the choice), then work column by column, trying the few digits that are left and checking the carry.",
      alternatives: [{ id: "try", title: "Try and check", kind: "procedural", text: ["List the possible digits for one letter.", "For each, work out what the others must be; drop any choice that makes two letters equal or breaks a column."] }],
    },
    limits: "Two-digit plus two-digit additions and two-digit times one-digit multiplications with exactly one solution; longer word puzzles are explored in class.",
  },

  // ------------------------------------------------------------------ the probability scale in words
  {
    id: "akscale",
    arity: 3,
    title: "Placing an event on the probability scale",
    competency: CH,
    type: "choice",
    // [t, a, b]: t 0 red from a red and b blue; 1 blue; 2 red or blue; 3 green; 4 a die shows more than a; 5 a die shows less than a
    parse: none,
    reject: (p) => (scaleOk(p) ? null : "Bags of 2 to 18 red and blue marbles, or a die."),
    choices: (p) => scaleOpts(p).map((i) => SCALE[i]),
    prompt: ([t, a, b]) => (t <= 3 ? `A bag has ${a} red and ${b} blue marbles. One marble is picked without looking. Where on the probability scale is the event "the marble is ${["red", "blue", "red or blue", "green"][t]}"?` : `An ordinary die is rolled. Where on the probability scale is the event "the number shown is ${t === 4 ? "more" : "less"} than ${a}"?`),
    solve: (p) => {
      const k = scaleTrue(p);
      return { steps: [{ id: "chance", op: "count", competency: CH, inputs: [scaleWhy(p)], value: "" }], answer: scaleOpts(p).indexOf(k) };
    },
    // independent: list every outcome, count those in the event and compare the count with half of all outcomes
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const [t, a, b] = p;
      const outs = t <= 3 ? [...Array(a).fill("red"), ...Array(b).fill("blue")] : ["1", "2", "3", "4", "5", "6"];
      const hit = outs.filter((o) => (t === 0 ? o === "red" : t === 1 ? o === "blue" : t === 2 ? o !== "green" : t === 3 ? o === "green" : t === 4 ? Number(o) > a : Number(o) < a)).length;
      const k = hit === 0 ? 0 : hit === outs.length ? 4 : 2 * hit < outs.length ? 1 : 2 * hit === outs.length ? 2 : 3;
      return scaleOpts(p)[v] === k;
    },
    bugs: (p) => {
      const k = scaleTrue(p);
      const o = scaleOpts(p);
      const out: Bug[] = [];
      if (k === 1 || k === 3) out.push(bug("two-outcomes-even", "conceptual", CH, "It was thought that with two possible results (this or not this) the chance is always even. The chance depends on how many of the outcomes are in the event.", o.indexOf(2)));
      if (k === 0) out.push(bug("impossible-as-unlikely", "conceptual", CH, "An event that cannot happen at all was called unlikely. It has probability 0, so it is impossible.", o.indexOf(1)));
      if (k === 4) out.push(bug("certain-as-likely", "conceptual", CH, "An event that must happen was called likely. Every outcome is in it, so its probability is 1: certain.", o.indexOf(3)));
      return out.filter((x) => x.predict !== -1);
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 5], [0, 9], [0, 9]],
    keep: scaleOk,
    difficulty: (p) => ([1, 2, 3, 2, 1][scaleTrue(p)] as 1 | 2 | 3),
    word: ([t, a, b]) => (t <= 3 ? `At a school fair, a lucky-dip box has ${a} red and ${b} blue tokens. ${nm(a + b)} pulls one out without looking. How likely is it that the token is ${["red", "blue", "red or blue", "green"][t]}?` : `In a board game, ${nm(a)} needs the die to show a number ${t === 4 ? "more" : "less"} than ${a}. How likely is that on one roll?`),
    teach: {
      idea: "The probability scale runs from 0 (impossible) through 1/2 (even chance) to 1 (certain). Fewer than half the outcomes: unlikely; more than half: likely.",
      method: "Count the outcomes in the event and all the outcomes. None: impossible; all: certain; exactly half: even chance; otherwise compare with half.",
      visual: () => ({ type: "numberline", from: 0, to: 1, step: 0.5, marks: [0, 0.5, 1] }),
      alternatives: [{ id: "random", title: "What random means", kind: "conceptual", text: ["A random pick means every marble has the same chance; we cannot say which one will come out.", "We can still say how likely each colour is from how many there are."] }],
    },
    limits: "Bags of two colours and one die; probabilities as numbers are akchance.",
  },

  // ------------------------------------------------------------------ sample spaces and events as subsets
  {
    id: "akssl",
    arity: 3,
    title: "Listing a sample space, and an event as a subset of it",
    competency: SS,
    type: "choice",
    // [m, e, k]: m 0 the sample space of experiment e (coins, a die, children, suits, a coin and a die); m 1 the event e
    // (with its number k) among the numbers 1 to N, N = [6, 8, 10, 12, 15, 20][k % 6]
    parse: none,
    reject: (p) => (sslOk(p) ? null : "Eight experiments, or one of nine kinds of event on numbered cards."),
    choices: (p) => sslSet(p).opts,
    prompt: (p) => sslSet(p).q,
    solve: (p) => ({ steps: [{ id: "list", op: "list", competency: SS, inputs: [sslSet(p).why], value: "" }], answer: sslSet(p).right }),
    // independent: build the outcomes again (by combining the parts, or by testing every number 1 to N) and compare
    // with the chosen list as a set
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const d = sslSet(p);
      const chosen = d.opts[v];
      if (!chosen) return false;
      const items = chosen.replace(/[{}\s]/g, "").split(",").filter(Boolean);
      const want = sslTruth(p);
      return items.length === want.length && new Set(items).size === items.length && want.every((w) => items.includes(w));
    },
    bugs: (p) => {
      const d = sslSet(p);
      return d.bug ? [bug(d.bug.id, "conceptual", SS, d.bug.says, d.bug.at)] : [];
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 1], [0, 8], [0, 11]],
    keep: sslOk,
    difficulty: ([m, e]) => (m === 0 ? (e === 1 || e === 3 ? 1 : 2) : e <= 1 ? 1 : 3),
    teach: {
      idea: "The sample space is the list of every possible outcome of an experiment. An event is a part (subset) of the sample space: the outcomes that make it happen.",
      method: "Build the outcomes systematically (for two coins: first coin H with each of H, T, then first coin T with each). For an event, go through the sample space one outcome at a time and keep those that fit.",
      alternatives: [{ id: "tree", title: "A tree diagram", kind: "procedural", text: ["Draw a branch for each result of the first part, and from each a branch for each result of the second part.", "Each path from start to end is one outcome: HT and TH are different paths."] }],
    },
    limits: "Coins (up to three), a die, two children, card suits, a coin with a die, and events on cards numbered up to 20.",
  },
  {
    id: "aksarr",
    arity: 3,
    title: "Counting arrangements that meet a condition",
    competency: SS,
    type: "integer",
    mc: true,
    // [t, n, s]: t 0 n friends in a row with one at the left end; 1 two friends side by side; 2 one friend not at either
    // end; 3 three-digit even numbers from n digits (no repeats); 4 three-digit numbers from n digits greater than 500
    parse: none,
    reject: ([t, n, s]) => (t >= 0 && t <= 4 && n >= (t >= 3 ? 4 : 3) && n <= (t >= 3 ? 6 : 5) && s >= 0 && s <= 19 && arrCount([t, n, s]) > 0 && !arrDup([t, n, s]) ? null : "Three to five friends, or four to six digits, with one condition (each list of names or digits once)."),
    prompt: (p) => arrText(p),
    solve: (p) => ({ steps: [{ id: "count", op: "count", competency: SS, inputs: [arrWhy(p)], value: arrCount(p) }], answer: arrCount(p) }),
    // independent: list every arrangement and count those that meet the condition
    validate: (p, v) => v === arrBrute(p),
    bugs: (p) => {
      const [t, n] = p;
      const f = (k: number): number => (k <= 1 ? 1 : k * f(k - 1));
      const all = t <= 2 ? f(n) : n * (n - 1) * (n - 2);
      const right = arrCount(p);
      return [
        bug("condition-ignored", "procedural", SS, "Every arrangement was counted; only those that meet the condition count.", all),
        ...(t === 1 ? [bug("pair-one-way", "procedural", SS, "The two friends were kept in one order only; they can stand side by side in two ways (A B or B A).", right / 2)] : []),
        ...(t === 2 ? [bug("one-end", "procedural", SS, "Only one end was ruled out; the friend may stand at neither end.", (n - 1) * f(n - 1))] : []),
      ].filter((b) => b.predict !== right);
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]}: ${s.value}`,
    domain: [[0, 4], [3, 6], [0, 19]],
    keep: ([t, n, s]) => n >= (t >= 3 ? 4 : 3) && n <= (t >= 3 ? 6 : 5) && !arrDup([t, n, s]),
    difficulty: ([t, n]) => (t === 0 && n <= 4 ? 1 : t <= 2 ? 2 : 3),
    teach: {
      idea: "Listing in an organised way (fix the first place, then the next …) makes sure no arrangement is missed or counted twice. A condition fixes or removes some places first.",
      method: "Deal with the condition first (put the fixed person at the end, glue the pair together, or choose the last digit), then count the ways to fill the remaining places one at a time and multiply.",
      alternatives: [{ id: "list", title: "List them", kind: "procedural", text: ["For small numbers, write every arrangement in order: first all those starting with A, then with B, and so on.", "Tick the ones that meet the condition and count the ticks."] }],
    },
    limits: "Up to five people or six digits and one condition; the general formulas for permutations are a later grade.",
  },

  // ------------------------------------------------------------------ direct, inverse or neither
  {
    id: "akdirinv",
    arity: 3,
    title: "Direct proportion, inverse proportion or neither?",
    competency: PROP,
    type: "choice",
    // [t, k, s]: t 0 y = kx; 1 xy = K; 2 y = x + k; 3 y = c − kx; the x-values from s
    parse: none,
    reject: ([t, k, s]) => (t >= 0 && t <= 3 && k >= 2 && k <= 9 && s >= 0 && s <= 5 ? null : "Four kinds of table with a constant from 2 to 9."),
    choices: (p) => order3(p, "dirinv").map((i) => DIRINV[i]),
    prompt: (p) => `Look at the table of x and y in the picture. Is y in direct proportion to x, in inverse proportion, or neither?`,
    figure: (p) => {
      const [xs, ys] = dirinvData(p);
      return { type: "table", head: ["x", ...xs.map(String)], rows: [["y", ...ys.map(String)]] };
    },
    solve: (p) => ({ steps: [{ id: "test", op: "compare", competency: PROP, inputs: [dirinvWhy(p)], value: "" }], answer: order3(p, "dirinv").indexOf(p[0] === 0 ? 0 : p[0] === 1 ? 1 : 2) }),
    // independent: test y ÷ x and x × y for every column
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const [xs, ys] = dirinvData(p);
      const ratio = xs.every((x, i) => ys[i] * xs[0] === ys[0] * x);
      const prod = xs.every((x, i) => ys[i] * x === ys[0] * xs[0]);
      return order3(p, "dirinv")[v] === (ratio ? 0 : prod ? 1 : 2);
    },
    bugs: (p) => {
      const o = order3(p, "dirinv");
      return p[0] === 2
        ? [bug("both-increase", "conceptual", PROP, "It was thought that y is in direct proportion because both increase. In direct proportion y ÷ x stays the same; here the same amount is added instead.", o.indexOf(0))]
        : p[0] === 3
          ? [bug("one-decreases", "conceptual", PROP, "It was thought that y is in inverse proportion because y goes down as x goes up. In inverse proportion x × y stays the same; check it for each column.", o.indexOf(1))]
          : p[0] === 1
            ? [bug("not-equal-steps", "conceptual", PROP, "Because y does not go down by equal steps, it was called neither. Inverse proportion means x × y stays the same, and here it does.", o.indexOf(2))]
            : [];
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 3], [2, 9], [0, 5]],
    difficulty: ([t]) => (t === 0 ? 1 : t === 1 ? 2 : 3),
    teach: {
      idea: "Direct proportion: y ÷ x is the same for every pair (doubling x doubles y). Inverse proportion: x × y is the same for every pair (doubling x halves y).",
      method: "Work out y ÷ x for each column; if they are all equal, it is direct. Otherwise work out x × y; if they are all equal, it is inverse. If neither stays the same, it is neither.",
      alternatives: [{ id: "double", title: "Double and see", kind: "conceptual", text: ["Find two columns where x doubles.", "If y doubles too, try direct; if y halves, try inverse; then check the other columns."] }],
    },
    limits: "Tables of four pairs; explaining a real situation is a written task.",
  },

  // ------------------------------------------------------------------ reading a flowchart with standard symbols
  {
    id: "akflow",
    arity: 2,
    title: "Tracing a flowchart with decision boxes",
    competency: ALG,
    type: "integer",
    mc: true,
    // [t, x]: flowchart t (0 parking fee, 1 one Collatz step, 2 bonus marks, 3 electricity bill, 4 a loop adding 1 to N) with input x
    parse: none,
    reject: ([t, x]) => (t >= 0 && t <= 4 && x >= FLOW[t].lo && x <= FLOW[t].hi ? null : "Five flowcharts with inputs in their ranges."),
    prompt: ([t, x]) => `The table in the picture describes a flowchart box by box (ovals start and stop, parallelograms are input or output, rectangles are steps, diamonds are decisions). Trace it with the input ${x}. What number is output?`,
    figure: ([t]) => ({ type: "table", head: ["Box", "Shape", "What it says", "Next box"], rows: FLOW[t].rows }),
    solve: ([t, x]) => ({ steps: [{ id: "trace", op: "trace", competency: ALG, inputs: [FLOW[t].trace(x)], value: FLOW[t].run(x) }], answer: FLOW[t].run(x) }),
    // independent: a closed formula for each flowchart
    validate: ([t, x], v) => v === FLOW[t].formula(x),
    bugs: ([t, x]) => {
      const right = FLOW[t].run(x);
      const other = FLOW[t].other(x);
      return [...(other !== right ? [bug("wrong-branch", "procedural", ALG, "The other branch of a decision box was followed. Answer the question in the diamond for this input: Yes and No lead to different boxes.", other)] : []), ...(t === 4 ? [bug("loop-once-more", "procedural", ALG, "The loop ran one extra time. Check the decision before going round again.", right + x + 1), bug("loop-stopped-early", "procedural", ALG, "The loop stopped one time too early. Check the decision after each step.", right - x)] : [])].filter((b) => b.predict !== right);
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]}`,
    domain: [[0, 4], [1, 250]],
    keep: ([t, x]) => x >= FLOW[t].lo && x <= FLOW[t].hi,
    cap: 400,
    difficulty: ([t]) => (t <= 1 ? 1 : t === 4 ? 3 : 2),
    teach: {
      idea: "A flowchart shows an algorithm as boxes joined by arrows: an oval to start and stop, a parallelogram for input and output, a rectangle for a step, and a diamond for a question with a Yes and a No arrow.",
      method: "Start at the oval and follow the arrows. At each diamond, answer the question for your number and take that arrow. Keep a note of each value as it changes.",
      alternatives: [{ id: "table", title: "A trace table", kind: "procedural", text: ["Write a column for each value and the box you are in.", "Every time a value changes, write the new value on a new row."] }],
    },
    limits: "Five flowcharts with one or two decisions and one loop; drawing a flowchart is a written task.",
  },

  // ------------------------------------------------------------------ encoding and decoding
  {
    id: "akcode",
    arity: 3,
    title: "Encoding and decoding with shift and substitution codes",
    competency: CIPH,
    type: "choice",
    // [m, w, k]: m 0 encode WORDS[w] with a shift of k; 1 decode the shift-k code of WORDS[w]; 2 decode with the substitution key made from k
    parse: none,
    reject: ([m, w, k]) => (m >= 0 && m <= 2 && w >= 0 && w < WORDS.length && k >= 2 && k <= 25 && codeOpts([m, w, k]).length === 4 ? null : "Twenty words, shifts 2 to 25, or a substitution key."),
    choices: (p) => codeOpts(p),
    prompt: ([m, w, k]) =>
      m === 0
        ? `In a shift code every letter moves forward ${k} places along the alphabet (after Z it goes back to A). How is ${WORDS[w]} written in this code?`
        : m === 1
          ? `In a shift code every letter moves forward ${k} places along the alphabet (after Z it goes back to A). A message in this code reads ${shiftWord(WORDS[w], k)}. What was the original word?`
          : `The table in the picture is the key of a substitution code: each letter in the Plain row is written as the letter below it in the Code row. A message in this code reads ${subWord(WORDS[w], k)}. What was the original word?`,
    figure: ([m, , k]) => (m === 2 ? { type: "table", head: ["Plain", ...ABC.slice(0, 13).split("")], rows: [["Code", ...subKey(k).slice(0, 13).split("")], ["Plain", ...ABC.slice(13).split("")], ["Code", ...subKey(k).slice(13).split("")]] } : null),
    solve: ([m, w, k]) => ({ steps: [{ id: "code", op: m === 0 ? "encode" : "decode", competency: CIPH, inputs: [m === 0 ? `Move each letter of ${WORDS[w]} forward ${k} places` : m === 1 ? `Move each letter back ${k} places` : "Find each code letter in the Code row and read the Plain letter above it"], value: "" }], answer: codeOpts([m, w, k]).indexOf(m === 0 ? shiftWord(WORDS[w], k) : WORDS[w]) }),
    // independent: apply the code to the chosen option (or undo it) and compare with what is given
    validate: ([m, w, k], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const opt = codeOpts([m, w, k])[v];
      if (!opt) return false;
      const back = (s: string, n: number) => s.split("").map((ch) => ABC[(ABC.indexOf(ch) - n + 26 * 2) % 26]).join("");
      if (m === 0) return back(opt, k) === WORDS[w];
      if (m === 1) return shiftWord(opt, k) === shiftWord(WORDS[w], k) && back(shiftWord(WORDS[w], k), k) === opt;
      const key = subKey(k);
      return opt.split("").map((ch) => key[ABC.indexOf(ch)]).join("") === subWord(WORDS[w], k);
    },
    bugs: ([m, w, k]) => {
      const o = codeOpts([m, w, k]);
      if (m === 0) return [bug("counted-start", "procedural", CIPH, `The starting letter was counted as the first step, so each letter moved only ${k - 1} places. Count ${k} moves forward from each letter.`, o.indexOf(shiftWord(WORDS[w], k - 1))), bug("moved-back", "procedural", CIPH, "The letters were moved backward. To encode, move each letter forward.", o.indexOf(shiftWord(WORDS[w], 26 - k)))];
      if (m === 1) return [bug("moved-forward", "procedural", CIPH, "The code letters were moved forward again. To decode, undo the code: move each letter back.", o.indexOf(shiftWord(shiftWord(WORDS[w], k), k))), bug("counted-start", "procedural", CIPH, `Each letter was moved back only ${k - 1} places because the starting letter was counted.`, o.indexOf(shiftWord(WORDS[w], 1)))];
      return [bug("key-backwards", "procedural", CIPH, "The key was read the wrong way: the code letters were looked up in the Plain row. To decode, find each letter in the Code row and read the Plain letter above it.", o.indexOf(subWord(subWord(WORDS[w], k), k)))];
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 2], [0, 19], [2, 25]],
    cap: 450,
    difficulty: ([m]) => (m === 0 ? 1 : m === 1 ? 2 : 3),
    teach: {
      idea: "A code replaces each letter by another by a rule. A shift code moves every letter the same number of places; a substitution code uses a key table. Decoding undoes the rule.",
      method: "To encode with a shift of k, move each letter forward k places, going from Z back to A. To decode, move back k places. With a key table, look the letter up in the right row.",
      visual: () => ({ type: "table", head: ABC.slice(0, 13).split(""), rows: [Array.from({ length: 13 }, (_, i) => i + 1), ABC.slice(13).split(""), Array.from({ length: 13 }, (_, i) => i + 14)] }),
      alternatives: [{ id: "numbers", title: "Use letter numbers", kind: "procedural", text: ["Number the letters A = 1 to Z = 26 and add k to each number.", "If the result is more than 26, take away 26."] }],
    },
    limits: "Single words of four to six letters; writing out a long message is practised in class.",
  },

  // ------------------------------------------------------------------ primary and secondary data
  {
    id: "akprim",
    arity: 2,
    title: "Primary or secondary data?",
    competency: FREQ,
    type: "choice",
    // [a, s]: a 0 pick the one primary source among secondary ones; 1 pick the one secondary source; s seeds the choice
    parse: none,
    reject: ([a, s]) => ((a === 0 || a === 1) && s >= 0 && s <= 199 && !primDup([a, s]) ? null : "Two questions and seeds 0 to 199 (each set of four situations once)."),
    choices: (p) => primSet(p).opts,
    prompt: ([a]) => `Which of these is ${a ? "secondary" : "primary"} data?`,
    solve: (p) => ({ steps: [{ id: "who", op: "classify", competency: FREQ, inputs: [p[0] ? "Secondary data was collected by someone else for their own purpose" : "Primary data is collected first-hand by the person who will use it"], value: "" }], answer: primSet(p).right }),
    // independent: look the chosen situation up in the list of first-hand collections
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const opt = primSet(p).opts[v];
      return opt !== undefined && PRIM.some((x) => x.t === opt) === (p[0] === 0) && primSet(p).opts.filter((o) => PRIM.some((x) => x.t === o) === (p[0] === 0)).length === 1;
    },
    bugs: (p) => {
      const d = primSet(p);
      return d.trap >= 0 ? [bug(p[0] ? "asking-is-secondary" : "copied-is-primary", "conceptual", FREQ, p[0] ? "Asking other people questions was taken as secondary data. A survey you carry out yourself is primary data, even though other people give the answers." : "Copying figures out yourself was taken as collecting primary data. The figures were collected by someone else, so they are secondary data, whoever copies them.", d.trap)] : [];
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 1], [0, 199]],
    keep: (p) => !primDup(p),
    difficulty: ([a]) => (a ? 2 : 1),
    teach: {
      idea: "Primary data is collected first-hand by the person who will use it (counting, measuring, asking). Secondary data was collected by someone else and is reused (a census, a newspaper, a website, a report).",
      method: "Ask: did the person collect these numbers themselves, for this purpose? Yes: primary. No, they were taken from somewhere else: secondary.",
      alternatives: [{ id: "examples", title: "Two examples", kind: "conceptual", text: ["Meena times her classmates running 100 m: primary.", "Meena copies last year's sports-day times from the school magazine: secondary."] }],
    },
    limits: "Everyday school situations; deciding which kind of data suits a question is a written task.",
  },

  // ------------------------------------------------------------------ mutually exclusive and exhaustive events
  {
    id: "akmex",
    arity: 3,
    title: "Mutually exclusive and exhaustive events",
    competency: CH,
    type: "choice",
    // [k, a, b]: outcomes 1 to N (N = 6 a die, 10 or 12 numbered cards for k = 0, 1, 2); events MEXE[a] and MEXE[b]
    parse: none,
    reject: (p) => (mexOk(p) ? null : "Two different non-empty events on a die or on cards numbered 1 to 10 or 12."),
    choices: (p) => order(p, 4).map((i) => MEX_TEXT[i]),
    prompt: ([k, a, b]) => `${k === 0 ? "An ordinary die is rolled" : `A card is picked from cards numbered 1 to ${MEXN[k]}`}. Event A: ${MEXE[a].t(MEXN[k])}. Event B: ${MEXE[b].t(MEXN[k])}. Which statement is true?`,
    solve: (p) => ({ steps: [{ id: "sets", op: "list", competency: SS, inputs: mexWhy(p), value: "" }], answer: order(p, 4).indexOf(mexTruth(p)) }),
    // independent: go through the outcomes one by one, marking those in both events and those in neither
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const [k, a, b] = p;
      let both = 0;
      let neither = 0;
      for (let x = 1; x <= MEXN[k]; x++) {
        const inA = MEXE[a].f(x, MEXN[k]);
        const inB = MEXE[b].f(x, MEXN[k]);
        if (inA && inB) both++;
        if (!inA && !inB) neither++;
      }
      return order(p, 4)[v] === (both === 0 ? (neither === 0 ? 2 : 0) : neither === 0 ? 1 : 3);
    },
    bugs: (p) => {
      const t = mexTruth(p);
      const o = order(p, 4);
      const [k, a, b] = p;
      const N = MEXN[k];
      let both = 0;
      for (let x = 1; x <= N; x++) if (MEXE[a].f(x, N) && MEXE[b].f(x, N)) both++;
      const out: Bug[] = [];
      if (t === 0) out.push(bug("exclusive-as-complement", "conceptual", CH, "Because A and B have no outcome in common, they were taken to cover every outcome. Mutually exclusive only means they cannot happen together; some outcomes are in neither.", o.indexOf(2)));
      if ((t === 3 || t === 1) && both === 1) out.push(bug("overlap-missed", "conceptual", CH, "The one outcome that is in both events was missed, so they were called mutually exclusive. Check every outcome against both events.", o.indexOf(t === 3 ? 0 : 2)));
      if (t === 2) out.push(bug("complement-not-exclusive", "conceptual", CH, "Events that cover every outcome were thought to overlap. Here no outcome is in both and every outcome is in one: they are complementary.", o.indexOf(1)));
      return out;
    },
    variants: () => [],
    explain: (s) => s.inputs.join("; "),
    domain: [[0, 2], [0, 9], [0, 9]],
    keep: mexOk,
    difficulty: (p) => ([2, 2, 1, 3] as const)[mexTruth(p)],
    teach: {
      idea: "Mutually exclusive events cannot happen together (no common outcome). Exhaustive events between them cover every outcome. Events that are both are complementary: B is 'not A', and P(A) + P(B) = 1.",
      method: "List the outcomes of each event. Any outcome in both? Then not mutually exclusive. Any outcome in neither? Then not exhaustive.",
      alternatives: [{ id: "venn", title: "Two circles", kind: "conceptual", text: ["Draw two circles for A and B inside a box for all outcomes.", "Overlapping circles: not mutually exclusive. Space left in the box outside both circles: not exhaustive."] }],
    },
    limits: "Two events on a die or on cards numbered 1 to 10 or 12; three or more events are discussed in class.",
  },
];

// ---------------------------------------------------------------- text helpers that need the data above
function chanceEvent(g: number, q: number) {
  return q === 0 ? "red" : q === 1 ? "not blue" : q === 2 ? "yellow" : g ? "red, blue or green" : "red or blue";
}
function ssText(c: number, a: number, b: number, x: number) {
  if (c === 0) return `${nm(a + b + x)} has ${a} shirts${x ? `, ${b} pairs of trousers and ${x} caps` : ` and ${b} pairs of trousers`}. An outfit is one shirt${x ? ", one pair of trousers and one cap" : " and one pair of trousers"}. How many different outfits can ${nm(a + b + x)} make?`;
  if (c === 1) return `A school canteen offers ${a} kinds of rice${x ? `, ${b} curries and ${x} sweets` : ` and ${b} curries`}. A meal is one rice${x ? ", one curry and one sweet" : " and one curry"}. How many different meals are possible?`;
  return `There are ${a} roads from village P to village Q and ${b} roads from Q to R${x ? `, and ${x} roads from R to S` : ""}. How many different ways are there to travel from P to ${x ? "S, passing through Q and R" : "R, passing through Q"}?`;
}
function collatz(n: number, k: number) {
  const out = [n];
  while (out.length < k) {
    const x = out[out.length - 1];
    out.push(x & 1 ? 3 * x + 1 : x >> 1);
  }
  return out;
}
function oddExpr(n: number, s: number) {
  const a = 2 * s + 1;
  const L = 2 * n - 1;
  return n - s <= 4 ? Array.from({ length: n - s }, (_, i) => a + 2 * i).join(" + ") : `${a} + ${a + 2} + ${a + 4} + … + ${L}`;
}
const DIVS = [3, 9, 11, 6];
function divData(di: number, s: number) {
  const r = rng(11, di, s);
  const L = ri(r, 4, 6);
  const d = Array.from({ length: L }, (_, i) => (i === 0 ? ri(r, 1, 9) : ri(r, 0, 9)));
  const pos = ri(r, 1, L - 1);
  return { d, pos };
}
function divWith(d: number[], pos: number, x: number) {
  return Number(d.map((v, i) => (i === pos ? x : v)).join(""));
}
function divShown(di: number, s: number) {
  const { d, pos } = divData(di, s);
  return d.map((v, i) => (i === pos ? "□" : String(v))).join("");
}
/** The smallest digit by the divisibility rule (null when none works). */
function divSolve(di: number, s: number): number | null {
  const D = DIVS[di];
  const { d, pos } = divData(di, s);
  if (D === 3 || D === 9) {
    const S = sum(d.filter((_, i) => i !== pos));
    return (D - (S % D)) % D;
  }
  if (D === 11) {
    const sg = (d.length - 1 - pos) % 2 === 0 ? 1 : -1;
    const A = d.reduce((acc, v, i) => (i === pos ? acc : acc + ((d.length - 1 - i) % 2 === 0 ? v : -v)), 0);
    const x = (((-sg * A) % 11) + 11) % 11;
    return x <= 9 ? x : null;
  }
  const S = sum(d.filter((_, i) => i !== pos));
  for (let x = 0; x <= 9; x++) if ((S + x) % 3 === 0 && (pos === d.length - 1 ? x : d[d.length - 1]) % 2 === 0) return x;
  return null;
}
function cryptText(x: number, y: number) {
  return `${Math.floor(x / 10)}P + Q${y % 10} = ${x + y}`;
}
function thinkText(d: number, k: number, r: number, b: number) {
  return `Think of a number. Multiply it by ${k * d}. Add ${r * d}. Divide by ${d}. Take away ${k === 1 ? "the number you first thought of" : `${k} times the number you first thought of`}.${b ? ` Add ${b}.` : ""}`;
}

// ---------------------------------------------------------------- helpers for the gap@1 families

const fnvh = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
};
/** A fixed shuffle of 0 … n − 1 that differs from problem to problem (so the right letter is not predictable). */
function order(p: number[], n: number, tag = "") {
  return [...Array(n).keys()].sort((x, y) => fnvh(`${tag}:${p.join(",")}:${x}`) - fnvh(`${tag}:${p.join(",")}:${y}`) || x - y);
}
const order3 = (p: number[], tag: string) => order(p, 3, tag);
const setText = (xs: (string | number)[]) => `{${xs.join(", ")}}`;

// akdsort
const DSORT_ASK = ["divisible by 2", "divisible by 5", "divisible by 10", "divisible by 5 but not by 10", "divisible by 4", "divisible by 8"];
const DSORT_RULE = ["By 2: the ones digit is 0, 2, 4, 6 or 8", "By 5: the ones digit is 0 or 5", "By 10: the ones digit is 0", "By 5 but not 10: the ones digit is 5", "By 4: the number formed by the last two digits is divisible by 4", "By 8: the number formed by the last three digits is divisible by 8"];
const DSORT_SLIP = [
  "The first digit was checked. Only the ones digit decides divisibility by 2: it must be 0, 2, 4, 6 or 8.",
  "A 5 somewhere in the number was taken to mean divisible by 5. Only the ones digit decides: it must be 0 or 5.",
  "A number ending in 5 was taken as divisible by 10. A multiple of 10 must end in 0.",
  "A number ending in 0 was chosen. It is divisible by 5, but it is also divisible by 10.",
  "Only the ones digit was checked (it is even). For 4, the number formed by the last two digits must be divisible by 4.",
  "Only the last two digits were checked. For 8, the number formed by the last three digits must be divisible by 8.",
];
const DSORT_PACK = ["in pairs", "in fives", "in tens", "in fives, and a number that could also be packed exactly in tens is not wanted", "in fours", "in eights"];
function dsortSet([k, s]: number[]) {
  const r = rng(97, k, s);
  const L = k === 5 ? 4 + (s % 2) : 3 + (s % 3);
  const lo = pow10(L - 1);
  const ok = (n: number) => [n % 2 === 0, n % 5 === 0, n % 10 === 0, n % 5 === 0 && n % 10 !== 0, n % 4 === 0, n % 8 === 0][k];
  const trapOk = (n: number) => {
    const t = String(n);
    return [Number(t[0]) % 2 === 0 && n % 2 === 1, t.slice(0, -1).includes("5") && n % 5 !== 0, n % 10 === 5, n % 10 === 0, n % 2 === 0 && n % 4 !== 0, n % 100 % 8 === 0 && n % 8 !== 0][k];
  };
  const pick = (f: (n: number) => boolean, used: number[]) => {
    for (let i = 0; i < 5000; i++) {
      const n = ri(r, lo, 10 * lo - 1);
      if (f(n) && !used.includes(n)) return n;
    }
    return -1;
  };
  const right = pick(ok, []);
  const trap = pick(trapOk, [right]);
  const f1 = pick((n) => !ok(n) && !trapOk(n), [right, trap]);
  const f2 = pick((n) => !ok(n) && !trapOk(n), [right, trap, f1]);
  const base = [right, trap, f1, f2];
  const o = order([k, s], 4, "dsort");
  return { opts: o.map((i) => base[i]), right: o.indexOf(0), trap: o.indexOf(1) };
}

// akdig
const isPal = (x: number) => String(x) === String(x).split("").reverse().join("");
function kapSeq(n: number) {
  const out = [n];
  while (out[out.length - 1] !== 6174 && out.length < 12) {
    const ds = String(out[out.length - 1]).padStart(4, "0").split("").map(Number);
    out.push(Number([...ds].sort((a, b) => b - a).join("")) - Number([...ds].sort((a, b) => a - b).join("")));
  }
  return out;
}
function palSeq(n: number) {
  const out = [n];
  while (!isPal(out[out.length - 1]) && out.length < 30) out.push(out[out.length - 1] + Number(String(out[out.length - 1]).split("").reverse().join("")));
  return out;
}
function digOk([m, n]: number[]) {
  if (m === 0) return n >= 1000 && n <= 9999 && new Set(String(n)).size > 1 && n !== 6174;
  if (m === 1) return n >= 10 && n <= 9999;
  return m === 2 && n >= 10 && n <= 99 && !isPal(n) && palSeq(n).length - 1 <= 6 && isPal(palSeq(n)[palSeq(n).length - 1]);
}

// akcolst
function colSeq(n: number) {
  const out = [n];
  while (out[out.length - 1] !== 1 && out.length < 200) {
    const x = out[out.length - 1];
    out.push(x % 2 ? 3 * x + 1 : x / 2);
  }
  return out;
}
function colInfo(n: number) {
  const s = colSeq(n);
  return { steps: s.length - 1, max: Math.max(...s) };
}
// akscmp
function scmpSet(s: number) {
  const r = rng(31, s);
  const negative = s % 2 === 1;
  const E = negative ? ri(r, -6, -2) : ri(r, 3, 12);
  const m = (a: number, b: number) => {
    let x = ri(r, a, b);
    while (x % 10 === 0) x = ri(r, a, b);
    return x / 10;
  };
  const right: [number, number] = [m(11, 49), E];
  const bigA: [number, number] = [m(71, 99), E - 1];
  const far: [number, number] = [m(50, 69), negative ? E - 3 - ri(r, 0, 2) : E - 2];
  let fourth: [number, number] = [m(11, 69), E - 1];
  while (fourth[0] === bigA[0]) fourth = [m(11, 69), E - 1];
  const base = [right, bigA, far, fourth];
  const o = order([s], 4, "scmp");
  return { opts: o.map((i) => base[i]), right: o.indexOf(0), bigA: o.indexOf(1), mostNeg: o.indexOf(2) };
}

// aksmag
const MAG: { q: (x: number) => string; v: (x: number) => number; miss: (x: number) => number; how: (x: number) => string; lo: number; hi: number }[] = [
  { q: (x) => `About how many seconds are there in ${x} year${x > 1 ? "s" : ""}? (Use 1 year = 365 days.)`, v: (x) => 365 * 24 * 3600 * x, miss: (x) => 365 * 24 * 60 * x, how: (x) => `365 × 24 × 60 × 60 × ${x}`, lo: 1, hi: 90 },
  { q: (x) => `A heart beats about 72 times a minute. About how many times does it beat in ${x} year${x > 1 ? "s" : ""}? (Use 1 year = 365 days.)`, v: (x) => 72 * 60 * 24 * 365 * x, miss: (x) => 72 * 60 * 24 * x, how: (x) => `72 × 60 × 24 × 365 × ${x}`, lo: 1, hi: 90 },
  { q: (x) => `One gram of rice has about 50 grains. About how many grains are there in a ${x} kg bag of rice?`, v: (x) => 50 * 1000 * x, miss: (x) => 50 * x, how: (x) => `50 × 1000 × ${x}`, lo: 1, hi: 99 },
  { q: (x) => `Selvi walks about 8000 steps a day. About how many steps does she walk in ${x} year${x > 1 ? "s" : ""}? (Use 1 year = 365 days.)`, v: (x) => 8000 * 365 * x, miss: (x) => 8000 * x, how: (x) => `8000 × 365 × ${x}`, lo: 1, hi: 80 },
  { q: (x) => `A town of ${x} thousand people uses about 135 litres of water per person each day. About how many litres does the town use in a year of 365 days?`, v: (x) => 135 * 1000 * x * 365, miss: (x) => 135 * 1000 * x, how: (x) => `135 × ${x} × 1000 × 365`, lo: 1, hi: 99 },
  { q: (x) => `A person has about 1,00,000 hairs on the head. About how many hairs are there on the heads of ${x} lakh people?`, v: (x) => 1e5 * 1e5 * x, miss: (x) => 1e5 * x, how: (x) => `1,00,000 × ${x} × 1,00,000`, lo: 1, hi: 99 },
];
const magN = (c: number, x: number) => String(MAG[c].v(x)).length - 1;
function magOk([c, x, m, d]: number[]) {
  if (c < 0 || c > 5 || x < MAG[c].lo || x > MAG[c].hi) return false;
  return m === 0 ? d === 0 : m === 1 && d >= -3 && d <= 3 && magN(c, x) + d >= 1;
}

// akscalc
function scalcAns([m, a, b, e, f]: number[]): [number, number, number, number] {
  if (m === 0) {
    const raw = (a * b) / 100;
    return raw >= 10 ? [(a * b) / 1000, e + f + 1, raw, e + f] : [raw, e + f, raw, e + f];
  }
  const big = a * b >= 1000;
  const De = big ? e + 1 : e;
  const raw = big ? a / 100 : a / 10;
  return [a / 10, e - f, raw, De - f];
}
function scalcOps([m, a, b, e, f]: number[]): [string, string] {
  const sc = (x: number, k: number) => `${x} × 10${sup(k)}`;
  if (m === 0) return [sc(a / 10, e), sc(b / 10, f)];
  const big = a * b >= 1000;
  return [sc(big ? (a * b) / 1000 : (a * b) / 100, big ? e + 1 : e), sc(b / 10, f)];
}

// akcrypt2
function letterPattern(s: string) {
  const m = new Map<string, string>();
  return s.replace(/\d/g, (d) => {
    if (!m.has(d)) m.set(d, "ABCDEFGHIJ"[m.size]);
    return m.get(d)!;
  });
}
type Crypt = { p: string; s: string };
const CRYPT: Crypt[][] = [[], []];
for (const k of [0, 1]) {
  const seen = new Map<string, string[]>();
  for (let a = 10; a <= 99; a++)
    for (let b = k ? 2 : 10; b <= (k ? 9 : 99); b++) {
      const s = `${a}${k ? "*" : "+"}${b}=${k ? a * b : a + b}`;
      const p = letterPattern(s);
      seen.set(p, [...(seen.get(p) ?? []), s]);
    }
  for (const [p, ss] of [...seen].sort((x, y) => (x[0] < y[0] ? -1 : 1))) if (ss.length === 1) CRYPT[k].push({ p, s: ss[0] });
}
function cryptDigit(c: Crypt, w: number) {
  const at = c.p.indexOf("ABCDEFG"[w]);
  return at < 0 ? NaN : Number(c.s[at]);
}
function cryptOk([k, i, w]: number[]) {
  return (k === 0 || k === 1) && i >= 0 && i < CRYPT[k].length && w >= 0 && w <= 6 && c_has(CRYPT[k][i], w);
}
const c_has = (c: Crypt, w: number) => c.p.includes("ABCDEFG"[w]);
/** The digit a letter would get if the carry into its column were forgotten (null when the slip does not apply). */
function cryptNoCarry(c: Crypt, w: number, k: number): number | null {
  const at = c.p.indexOf("ABCDEFG"[w]);
  const eq = c.s.indexOf("=");
  const res = c.s.slice(eq + 1);
  if (at <= eq || at !== eq + 1 + res.length - 2) return null;
  const [x, y] = c.s.slice(0, eq).split(/[+*]/).map(Number);
  const tens = k ? (Math.floor(x / 10) * y) % 10 : (Math.floor(x / 10) + Math.floor(y / 10)) % 10;
  return tens;
}

// akscale
const SCALE = ["Impossible (0)", "Unlikely (between 0 and 1/2)", "Even chance (1/2)", "Likely (between 1/2 and 1)", "Certain (1)"];
function scaleOk([t, a, b]: number[]) {
  if (t <= 3) return t >= 0 && a + b >= 2 && a >= 0 && b >= 0 && a <= 9 && b <= 9 && (t === 3 ? a > 0 && b > 0 : true);
  if (t === 4) return a >= 0 && a <= 6 && b === 0;
  return t === 5 && a >= 1 && a <= 7 && b === 0;
}
function scaleCount([t, a, b]: number[]): [number, number] {
  if (t <= 3) return [[a, b, a + b, 0][t], a + b];
  return [t === 4 ? 6 - a : a - 1, 6];
}
function scaleTrue(p: number[]) {
  const [h, n] = scaleCount(p);
  return h === 0 ? 0 : h === n ? 4 : 2 * h < n ? 1 : 2 * h === n ? 2 : 3;
}
function scaleOpts(p: number[]) {
  const k = scaleTrue(p);
  const want = [k, k === 1 || k === 3 ? 2 : k === 0 ? 1 : k === 4 ? 3 : 1, k === 2 ? 3 : k === 0 ? 2 : k === 4 ? 2 : k === 1 ? 0 : 4];
  const four = [...new Set(want)];
  for (const x of [0, 1, 2, 3, 4].sort((x, y) => fnvh(`scf:${p.join(",")}:${x}`) - fnvh(`scf:${p.join(",")}:${y}`))) if (four.length < 4 && !four.includes(x)) four.push(x);
  return order(p, 4, "scale").map((i) => four[i]);
}
function scaleWhy(p: number[]) {
  const [h, n] = scaleCount(p);
  return `${h} of the ${n} equally likely outcomes are in the event, so the probability is ${h === 0 ? "0" : h === n ? "1" : fracText(h, n)}: ${SCALE[scaleTrue(p)].toLowerCase()}.`;
}

// akssl
const NS = [6, 8, 10, 12, 15, 20];
const isPrimeN = (x: number) => {
  if (x < 2) return false;
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false;
  return true;
};
type SslEvent = { t: (N: number, j: number) => string; f: (x: number, N: number, j: number) => boolean; usesJ: boolean; slip?: { id: string; says: string; g: (N: number, j: number) => number[] } };
const SSL_EV: SslEvent[] = [
  { t: () => "an even number", f: (x) => x % 2 === 0, usesJ: false, slip: { id: "odd-even", says: "The odd numbers were listed. Even numbers are those divisible by 2.", g: (N) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => x % 2 === 1) } },
  { t: () => "an odd number", f: (x) => x % 2 === 1, usesJ: false, slip: { id: "odd-even", says: "The even numbers were listed. Odd numbers are those that leave 1 when divided by 2.", g: (N) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => x % 2 === 0) } },
  { t: () => "a prime number", f: (x) => isPrimeN(x), usesJ: false, slip: { id: "one-prime", says: "1 was counted as prime. A prime has exactly two factors, 1 and itself, so 1 is not prime.", g: (N) => [1, ...Array.from({ length: N }, (_, i) => i + 1).filter(isPrimeN)] } },
  { t: (N, j) => `a multiple of ${j ? 4 : 3}`, f: (x, N, j) => x % (j ? 4 : 3) === 0, usesJ: true, slip: { id: "factor-for-multiple", says: "The factors were listed instead of the multiples. Multiples of 3 are 3, 6, 9, …; factors of 3 are 1 and 3.", g: (N, j) => (j ? [1, 2, 4] : [1, 3]) } },
  { t: (N, j) => `a number greater than ${j ? Math.floor(N / 2) : 3}`, f: (x, N, j) => x > (j ? Math.floor(N / 2) : 3), usesJ: true, slip: { id: "boundary-included", says: "The boundary number itself was included. 'Greater than' does not include the number itself.", g: (N, j) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => x >= (j ? Math.floor(N / 2) : 3)) } },
  { t: (N, j) => `a number less than ${j ? Math.floor(N / 2) + 1 : 4}`, f: (x, N, j) => x < (j ? Math.floor(N / 2) + 1 : 4), usesJ: true, slip: { id: "boundary-included", says: "The boundary number itself was included. 'Less than' does not include the number itself.", g: (N, j) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => x <= (j ? Math.floor(N / 2) + 1 : 4)) } },
  { t: (N) => `a factor of ${N}`, f: (x, N) => N % x === 0, usesJ: false, slip: { id: "ends-left-out", says: "1 and the number itself were left out. They are factors too.", g: (N) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => N % x === 0 && x !== 1 && x !== N) } },
  { t: () => "a perfect square", f: (x) => Number.isInteger(Math.sqrt(x)), usesJ: false, slip: { id: "roots-listed", says: "The numbers that are squared were listed, not the squares. The perfect squares are 1, 4, 9, 16, ….", g: (N) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => x * x <= N) } },
  { t: (N, j) => `a multiple of ${j ? 6 : 5}`, f: (x, N, j) => x % (j ? 6 : 5) === 0, usesJ: true, slip: { id: "factor-for-multiple", says: "The factors were listed instead of the multiples. A multiple of 5 is 5 times a whole number: 5, 10, 15, ….", g: (N, j) => (j ? [1, 2, 3, 6] : [1, 5]) } },
];
type SslExp = { q: string; parts: string[][]; join: boolean; wrong: string[][]; slip?: { id: string; says: string; at: number } };
const SSL_EXP: SslExp[] = [
  { q: "A coin is tossed once.", parts: [["H", "T"]], join: true, wrong: [["H"], ["HH", "TT"], ["H", "T", "HT"]] },
  { q: "Two coins are tossed together.", parts: [["H", "T"], ["H", "T"]], join: true, wrong: [["HH", "HT", "TT"], ["HH", "TT"], ["H", "T"]], slip: { id: "order-ignored", says: "HT and TH were taken as the same outcome. The first coin can show H and the second T, or the other way round: they are two different outcomes.", at: 0 } },
  { q: "Three coins are tossed together.", parts: [["H", "T"], ["H", "T"], ["H", "T"]], join: true, wrong: [["HHH", "HHT", "HTT", "TTT"], ["HHH", "TTT"], ["HHH", "HHT", "HTH", "THH", "TTT", "HTT"]], slip: { id: "order-ignored", says: "Outcomes with the same number of heads were taken as one. HHT, HTH and THH are different outcomes.", at: 0 } },
  { q: "An ordinary die is rolled once.", parts: [["1", "2", "3", "4", "5", "6"]], join: true, wrong: [["1", "2", "3", "4", "5"], ["0", "1", "2", "3", "4", "5", "6"], ["2", "4", "6"]] },
  { q: "A family has two children, and we note whether each is a boy (B) or a girl (G), oldest first.", parts: [["B", "G"], ["B", "G"]], join: true, wrong: [["BB", "BG", "GG"], ["B", "G"], ["BG", "GB"]], slip: { id: "order-ignored", says: "BG and GB were taken as the same. An older boy with a younger girl is different from an older girl with a younger boy.", at: 0 } },
  { q: "One card is drawn from a full pack of playing cards, and its suit is noted.", parts: [["spades", "hearts", "diamonds", "clubs"]], join: false, wrong: [["red", "black"], ["hearts", "diamonds"], ["spades", "clubs", "hearts"]], slip: { id: "colour-not-suit", says: "The colours were listed. The question asks for the suit, and there are four suits.", at: 0 } },
  { q: "A coin is tossed and a die is rolled.", parts: [["H", "T"], ["1", "2", "3", "4", "5", "6"]], join: true, wrong: [["H", "T", "1", "2", "3", "4", "5", "6"], ["H1", "H2", "H3", "H4", "H5", "H6"], ["H1", "T6"]], slip: { id: "parts-separately", says: "The results of the coin and the die were listed separately. Each outcome is a pair, such as H3.", at: 0 } },
  { q: "A spinner with three equal parts coloured red (R), yellow (Y) and green (G) is spun twice.", parts: [["R", "Y", "G"], ["R", "Y", "G"]], join: true, wrong: [["RR", "RY", "RG", "YY", "YG", "GG"], ["R", "Y", "G"], ["RY", "RG", "YG"]], slip: { id: "order-ignored", says: "RY and YR were taken as the same. Red then yellow is a different outcome from yellow then red.", at: 0 } },
];
const product = (parts: string[][]): string[] => parts.reduce<string[]>((acc, p) => acc.flatMap((a) => p.map((b) => a + b)), [""]);
function sslOk([m, e, k]: number[]) {
  if (m === 0) return e >= 0 && e <= 7 && k === 0;
  if (m !== 1 || e < 0 || e > 8 || k < 0 || k > 11) return false;
  const ev = SSL_EV[e];
  if (!ev.usesJ && k >= 6) return false;
  const N = NS[k % 6];
  const j = Math.floor(k / 6);
  const right = Array.from({ length: N }, (_, i) => i + 1).filter((x) => ev.f(x, N, j));
  return right.length >= 1 && right.length < N;
}
function sslTruth([m, e, k]: number[]): string[] {
  if (m === 0) {
    const ex = SSL_EXP[e];
    return ex.join ? product(ex.parts) : ex.parts[0];
  }
  const N = NS[k % 6];
  const j = Math.floor(k / 6);
  const out: string[] = [];
  // test each card in turn with plain arithmetic
  for (let x = 1; x <= N; x++) {
    const hit = [x % 2 === 0, x % 2 === 1, Array.from({ length: x }, (_, i) => i + 1).filter((d) => x % d === 0).length === 2, x % (j ? 4 : 3) === 0, x > (j ? Math.floor(N / 2) : 3), x < (j ? Math.floor(N / 2) + 1 : 4), N % x === 0, [1, 4, 9, 16].includes(x), x % (j ? 6 : 5) === 0][e];
    if (hit) out.push(String(x));
  }
  return out;
}
function sslSet(p: number[]): { q: string; opts: string[]; right: number; why: string; bug?: { id: string; says: string; at: number } } {
  const [m, e, k] = p;
  const o = order(p, 4, "ssl");
  if (m === 0) {
    const ex = SSL_EXP[e];
    const right = ex.join ? product(ex.parts) : ex.parts[0];
    const base = [right, ...ex.wrong].map(setText);
    const opts = o.map((i) => base[i]);
    return { q: `${ex.q} Which list is the sample space (every possible outcome)?`, opts, right: o.indexOf(0), why: `Every outcome: ${base[0]}`, bug: ex.slip ? { id: ex.slip.id, says: ex.slip.says, at: o.indexOf(1) } : undefined };
  }
  const ev = SSL_EV[e];
  const N = NS[k % 6];
  const j = Math.floor(k / 6);
  const all = Array.from({ length: N }, (_, i) => i + 1);
  const right = all.filter((x) => ev.f(x, N, j));
  const slip = ev.slip!.g(N, j);
  const r = rng(13, e, k);
  const sets: number[][] = [right];
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const slipOk = slip.length > 0 && !same(slip, right);
  if (slipOk) sets.push(slip);
  const tries: number[][] = [right.length > 1 ? right.slice(0, -1) : [], [...right, ...all.filter((x) => !right.includes(x)).slice(0, 1)].sort((a, b) => a - b), all.filter((x) => !right.includes(x)).slice(0, Math.max(1, right.length)), shuffle(r, all).slice(0, right.length).sort((a, b) => a - b), shuffle(r, all).slice(0, right.length + 1).sort((a, b) => a - b)];
  for (const t of tries) if (sets.length < 4 && t.length && !sets.some((s) => same(s, t))) sets.push(t);
  const base = sets.map(setText);
  return { q: `A card is picked at random from cards numbered 1 to ${N}. Which set is the event "the number is ${ev.t(N, j)}"?`, opts: o.map((i) => base[i]), right: o.indexOf(0), why: `Go through 1 to ${N} and keep each number that is ${ev.t(N, j)}: ${base[0]}`, bug: slipOk ? { id: ev.slip!.id, says: ev.slip!.says, at: o.indexOf(1) } : undefined };
}

// aksarr
const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
function arrPeople([n, s]: number[]) {
  return shuffle(rng(19, n, s), NAMES).slice(0, n);
}
function arrDigits([n, s]: number[]) {
  const r = rng(23, n, s);
  return shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n).sort((a, b) => a - b);
}
function arrCount([t, n, s]: number[]) {
  if (t === 0) return fact(n - 1);
  if (t === 1) return 2 * fact(n - 1);
  if (t === 2) return (n - 2) * fact(n - 1);
  const D = arrDigits([n, s]);
  return (t === 3 ? D.filter((d) => d % 2 === 0).length : D.filter((d) => d >= 5).length) * (n - 1) * (n - 2);
}
function arrText([t, n, s]: number[]) {
  if (t <= 2) {
    const P = arrPeople([n, s]);
    const list = `${P.slice(0, -1).join(", ")} and ${P[P.length - 1]}`;
    return `In how many different ways can ${list} stand in a row ${["if " + P[0] + " must stand at the left end", `if ${P[0]} and ${P[1]} must stand next to each other`, `if ${P[0]} must not stand at either end`][t]}?`;
  }
  const D = arrDigits([n, s]);
  return `How many three-digit numbers can be made from the digits ${D.slice(0, -1).join(", ")} and ${D[D.length - 1]}, using each digit at most once, if the number must be ${t === 3 ? "even" : "greater than 500"}?`;
}
function arrWhy([t, n, s]: number[]) {
  if (t === 0) return `Fix the first place; the other ${n - 1} can be arranged in ${n - 1}! ways`;
  if (t === 1) return `Glue the two together: ${n - 1} blocks in ${n - 1}! ways, times 2 orders of the pair`;
  if (t === 2) return `${n - 2} middle places for the friend, then ${n - 1}! ways for the rest`;
  const D = arrDigits([n, s]);
  const c = t === 3 ? D.filter((d) => d % 2 === 0).length : D.filter((d) => d >= 5).length;
  return `${c} choices for the ${t === 3 ? "last" : "first"} digit, then ${n - 1} and ${n - 2} for the other two`;
}
/** Every arrangement listed and checked one by one. */
function arrBrute([t, n, s]: number[]) {
  const perms = (xs: number[], k: number): number[][] => (k === 0 ? [[]] : xs.flatMap((x) => perms(xs.filter((y) => y !== x), k - 1).map((r) => [x, ...r])));
  if (t <= 2) {
    const all = perms([...Array(n).keys()], n);
    return all.filter((r) => (t === 0 ? r[0] === 0 : t === 1 ? Math.abs(r.indexOf(0) - r.indexOf(1)) === 1 : r[0] !== 0 && r[n - 1] !== 0)).length;
  }
  const D = arrDigits([n, s]);
  return perms(D, 3).filter((r) => (t === 3 ? (100 * r[0] + 10 * r[1] + r[2]) % 2 === 0 : 100 * r[0] + 10 * r[1] + r[2] > 500)).length;
}

// akdirinv
const DIRINV = ["Direct proportion", "Inverse proportion", "Neither"];
const XSETS = [[1, 2, 3, 4], [2, 4, 6, 8], [1, 2, 4, 8], [2, 3, 4, 6], [1, 2, 3, 6], [3, 4, 6, 12]];
function dirinvData([t, k, s]: number[]): [number[], number[]] {
  const xs = XSETS[s];
  const L = xs.reduce((a, b) => (a * b) / gcd(a, b), 1);
  const ys = xs.map((x) => (t === 0 ? k * x : t === 1 ? (k * L) / x : t === 2 ? x + k : k * (xs[3] + 2) - k * x));
  return [xs, ys];
}
function dirinvWhy(p: number[]) {
  const [xs, ys] = dirinvData(p);
  return `y ÷ x: ${xs.map((x, i) => fracText(ys[i], x)).join(", ")}; x × y: ${xs.map((x, i) => x * ys[i]).join(", ")}. ${p[0] === 0 ? "y ÷ x is the same each time: direct proportion." : p[0] === 1 ? "x × y is the same each time: inverse proportion." : "Neither stays the same: neither."}`;
}

// akflow
type Flow = { lo: number; hi: number; rows: string[][]; run: (x: number) => number; formula: (x: number) => number; other: (x: number) => number; trace: (x: number) => string };
const FLOW: Flow[] = [
  {
    lo: 1, hi: 12,
    rows: [["1", "Oval", "Start", "2"], ["2", "Parallelogram", "Input H (hours parked)", "3"], ["3", "Diamond", "Is H ≤ 2?", "Yes: 4. No: 5"], ["4", "Rectangle", "Fee = 20", "6"], ["5", "Rectangle", "Fee = 20 + 10 × (H − 2)", "6"], ["6", "Parallelogram", "Output Fee", "7"], ["7", "Oval", "Stop", "—"]],
    run: (x) => (x <= 2 ? 20 : 20 + 10 * (x - 2)), formula: (x) => Math.max(20, 10 * x), other: (x) => (x <= 2 ? 20 + 10 * (x - 2) : 20),
    trace: (x) => (x <= 2 ? `H = ${x}: is ${x} ≤ 2? Yes, so Fee = 20` : `H = ${x}: is ${x} ≤ 2? No, so Fee = 20 + 10 × ${x - 2} = ${20 + 10 * (x - 2)}`),
  },
  {
    lo: 3, hi: 99,
    rows: [["1", "Oval", "Start", "2"], ["2", "Parallelogram", "Input N", "3"], ["3", "Diamond", "Is N even?", "Yes: 4. No: 5"], ["4", "Rectangle", "N = N ÷ 2", "6"], ["5", "Rectangle", "N = 3 × N + 1", "6"], ["6", "Parallelogram", "Output N", "7"], ["7", "Oval", "Stop", "—"]],
    run: (x) => (x % 2 === 0 ? x / 2 : 3 * x + 1), formula: (x) => ((x & 1) === 0 ? x >> 1 : x + x + x + 1), other: (x) => 3 * x + 1,
    trace: (x) => (x % 2 === 0 ? `${x} is even, so N = ${x} ÷ 2 = ${x / 2}` : `${x} is odd, so N = 3 × ${x} + 1 = ${3 * x + 1}`),
  },
  {
    lo: 20, hi: 99,
    rows: [["1", "Oval", "Start", "2"], ["2", "Parallelogram", "Input M (marks)", "3"], ["3", "Diamond", "Is M ≥ 75?", "Yes: 4. No: 5"], ["4", "Rectangle", "M = M + 10", "7"], ["5", "Diamond", "Is M ≥ 50?", "Yes: 6. No: 7"], ["6", "Rectangle", "M = M + 5", "7"], ["7", "Parallelogram", "Output M", "8"], ["8", "Oval", "Stop", "—"]],
    run: (x) => (x >= 75 ? x + 10 : x >= 50 ? x + 5 : x), formula: (x) => x + 5 * (Number(x >= 50) + Number(x >= 75)), other: (x) => (x >= 75 ? x + 5 : x + 10),
    trace: (x) => (x >= 75 ? `${x} ≥ 75? Yes: M = ${x + 10}` : x >= 50 ? `${x} ≥ 75? No. ${x} ≥ 50? Yes: M = ${x + 5}` : `${x} ≥ 75? No. ${x} ≥ 50? No: M stays ${x}`),
  },
  {
    lo: 20, hi: 250,
    rows: [["1", "Oval", "Start", "2"], ["2", "Parallelogram", "Input U (units of electricity used)", "3"], ["3", "Diamond", "Is U ≤ 100?", "Yes: 4. No: 5"], ["4", "Rectangle", "Bill = 3 × U", "6"], ["5", "Rectangle", "Bill = 300 + 5 × (U − 100)", "6"], ["6", "Parallelogram", "Output Bill (in ₹)", "7"], ["7", "Oval", "Stop", "—"]],
    run: (x) => (x <= 100 ? 3 * x : 300 + 5 * (x - 100)), formula: (x) => Math.max(3 * x, 5 * x - 200), other: (x) => (x <= 100 ? 300 + 5 * (x - 100) : 3 * x),
    trace: (x) => (x <= 100 ? `${x} ≤ 100? Yes: Bill = 3 × ${x} = ${3 * x}` : `${x} ≤ 100? No: Bill = 300 + 5 × ${x - 100} = ${300 + 5 * (x - 100)}`),
  },
  {
    lo: 3, hi: 20,
    rows: [["1", "Oval", "Start", "2"], ["2", "Parallelogram", "Input N", "3"], ["3", "Rectangle", "S = 0 and K = 1", "4"], ["4", "Rectangle", "S = S + K", "5"], ["5", "Rectangle", "K = K + 1", "6"], ["6", "Diamond", "Is K > N?", "Yes: 7. No: 4"], ["7", "Parallelogram", "Output S", "8"], ["8", "Oval", "Stop", "—"]],
    run: (x) => {
      let S = 0;
      for (let K = 1; K <= x; K++) S += K;
      return S;
    },
    formula: (x) => (x * (x + 1)) / 2, other: (x) => (x * (x + 1)) / 2,
    trace: (x) => `S becomes 1, 3, 6, … adding K = 1, 2, …, ${x}; when K reaches ${x + 1} it is more than ${x}, so the output is S = ${(x * (x + 1)) / 2}`,
  },
];

// akcode
function subKey(k: number) {
  return shuffle(rng(53, k), ABC.split("")).join("");
}
const subWord = (w: string, k: number) => w.split("").map((ch) => subKey(k)[ABC.indexOf(ch)]).join("");
function codeOpts([m, w, k]: number[]) {
  const W = WORDS[w];
  const base = m === 0 ? [shiftWord(W, k), shiftWord(W, k - 1), shiftWord(W, 26 - k), shiftWord(W, (k + 1) % 26)] : m === 1 ? [W, shiftWord(W, (2 * k) % 26), shiftWord(W, 1), shiftWord(W, 25)] : [W, subWord(subWord(W, k), k), ...WORDS.filter((x, i) => i !== w && x.length === W.length).slice(0, 2)];
  if (new Set(base).size !== 4) return [];
  return order([m, w, k], 4, "code").map((i) => base[i]);
}

// akprim
const PRIM: { t: string; ask: boolean }[] = [
  { t: "Meena counts the vehicles passing her school gate between 8 and 9 a.m.", ask: false },
  { t: "A class measures the heights of its own students for a project.", ask: false },
  { t: "Ravi asks 30 neighbours which newspaper they read.", ask: true },
  { t: "Kavya records the temperature outside her house every morning for a month.", ask: false },
  { t: "The sports teacher times each runner in the 100 m race on sports day.", ask: false },
  { t: "Imran asks every student in his class how they travel to school.", ask: true },
  { t: "A farmer weighs the mangoes picked from each tree in his orchard.", ask: false },
  { t: "Divya asks shoppers at the market what they paid for a kilogram of tomatoes.", ask: true },
];
const SEC: { t: string; copied: boolean }[] = [
  { t: "Arjun copies the population of each state from the census website.", copied: true },
  { t: "A student uses rainfall figures printed in a newspaper.", copied: false },
  { t: "Selvi takes last year's exam results from the school's annual report.", copied: false },
  { t: "Karthik writes down cricket scores from a sports magazine.", copied: true },
  { t: "A class uses the number of tourists to Ooty given in a government report.", copied: false },
  { t: "Priya copies her town's monthly bus-passenger numbers from the transport department's website.", copied: true },
  { t: "A teacher uses milk-production figures from a table in a textbook.", copied: false },
  { t: "Farhan uses temperature records published by the weather department.", copied: false },
];
function primSet([a, s]: number[]) {
  const r = rng(71, a, s);
  if (a === 0) {
    const one = PRIM[ri(r, 0, PRIM.length - 1)].t;
    const copied = shuffle(r, SEC.filter((x) => x.copied))[0].t;
    const rest = shuffle(r, SEC.filter((x) => x.t !== copied)).slice(0, 2).map((x) => x.t);
    const base = [one, copied, ...rest];
    const o = order([a, s], 4, "prim");
    return { opts: o.map((i) => base[i]), right: o.indexOf(0), trap: o.indexOf(1) };
  }
  const one = SEC[ri(r, 0, SEC.length - 1)].t;
  const asked = shuffle(r, PRIM.filter((x) => x.ask))[0].t;
  const rest = shuffle(r, PRIM.filter((x) => x.t !== asked)).slice(0, 2).map((x) => x.t);
  const base = [one, asked, ...rest];
  const o = order([a, s], 4, "prim");
  return { opts: o.map((i) => base[i]), right: o.indexOf(0), trap: o.indexOf(1) };
}

// akmex
const MEXN = [6, 10, 12];
const MEXE: { t: (N: number) => string; f: (x: number, N: number) => boolean }[] = [
  { t: () => "an even number", f: (x) => x % 2 === 0 },
  { t: () => "an odd number", f: (x) => x % 2 === 1 },
  { t: () => "a prime number", f: (x) => isPrimeN(x) },
  { t: () => "a multiple of 3", f: (x) => x % 3 === 0 },
  { t: () => "a number greater than 3", f: (x) => x > 3 },
  { t: () => "a number of 3 or less", f: (x) => x <= 3 },
  { t: () => "a perfect square", f: (x) => Number.isInteger(Math.sqrt(x)) },
  { t: () => "a multiple of 4", f: (x) => x % 4 === 0 },
  { t: (N) => `a number greater than ${N / 2}`, f: (x, N) => x > N / 2 },
  { t: (N) => `a number of ${N / 2} or less`, f: (x, N) => x <= N / 2 },
];
const MEX_TEXT = ["A and B are mutually exclusive, but not exhaustive", "A and B are exhaustive, but not mutually exclusive", "A and B are mutually exclusive and exhaustive (complementary)", "A and B are neither mutually exclusive nor exhaustive"];
const mexSet = (e: number, N: number) => Array.from({ length: N }, (_, i) => i + 1).filter((x) => MEXE[e].f(x, N));
function mexOk([k, a, b]: number[]) {
  if (k < 0 || k > 2 || a < 0 || b > 9 || a >= b || (k === 0 && b >= 8)) return false;
  const N = MEXN[k];
  const A = mexSet(a, N);
  const B = mexSet(b, N);
  return A.length > 0 && B.length > 0 && A.length < N && B.length < N && A.join() !== B.join();
}
function mexTruth([k, a, b]: number[]) {
  const N = MEXN[k];
  const A = mexSet(a, N);
  const B = mexSet(b, N);
  const exclusive = !A.some((x) => B.includes(x));
  const exhaustive = A.length + B.filter((x) => !A.includes(x)).length === N;
  return exclusive ? (exhaustive ? 2 : 0) : exhaustive ? 1 : 3;
}
function mexWhy([k, a, b]: number[]) {
  const N = MEXN[k];
  return [`A = ${setText(mexSet(a, N))}`, `B = ${setText(mexSet(b, N))}`, MEX_TEXT[mexTruth([k, a, b])]];
}

/** A seed whose list of names or digits already came up with a smaller seed (the same question twice). */
function arrDup([t, n, s]: number[]) {
  const key = (x: number) => (t <= 2 ? arrPeople([n, x]).join() : arrDigits([n, x]).join());
  for (let x = 0; x < s; x++) if (key(x) === key(s)) return true;
  return false;
}
const primKey = (p: number[]) => [...primSet(p).opts].sort().join("|");
function primDup([a, s]: number[]) {
  const k = primKey([a, s]);
  for (let x = 0; x < s; x++) if (primKey([a, x]) === k) return true;
  return false;
}
