/**
 * Batch b07 (families@2), Grades 4–5 and up: speed as distance per unit time, adding and subtracting decimals and
 * money, factors and multiples, HCF and LCM, mixed numbers, order of operations, percentages as hundredths, primes,
 * and testing a claim with a counterexample. Written by OpenPath; CC0.
 */
import type { Bug, Def, Value, Visual } from "../family-kit";
import { gcd, MT } from "../family-kit";
const primesOf = (n: number) => { const out: number[] = []; for (let p = 2; n > 1; p++) while (n % p === 0) { out.push(p); n /= p; } return out; };
import { evaluate, parse } from "../answer-types";

const SPD = "MATH.measurement.time-speed-intro";
const DEC = "MATH.number.decimal-operations";
const FM = "MATH.number.factors-multiples";
const HL = "MATH.number.hcf-lcm";
const MIX = "MATH.number.mixed-fractions";
const OOO = "MATH.number.order-of-operations";
const PCT = "MATH.number.percent-intro";
const PRI = "MATH.number.primes";
const CEX = "MATH.reasoning.counterexamples-intro";
const LDIV = "MATH.number.long-division";
const DIVR = "MATH.number.division-remainders";
const ADDR = "MATH.number.addition-regroup";
const DTEN = "MATH.number.decimal-tenths";
const none = () => null;

const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi", "Farhan", "Lakshmi"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** Paise used in the money family (agrupee). */
const PAISE = [10, 20, 25, 40, 50, 55, 60, 75, 80, 95];
/** A number of hundredths as place-value columns: tens, ones, point, tenths, hundredths. */
const pvRow = (u: number) => {
  const t = Math.floor(u / 1000);
  return [t ? String(t) : "", String(Math.floor(u / 100) % 10), ".", String(Math.floor(u / 10) % 10), String(u % 10)];
};
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** A whole number of units of 10^-k, written as a decimal ("2.37"); trailing zeros dropped unless `keep`. */
const dec = (u: number, k: number, keep = false) => {
  const s = String(Math.abs(u)).padStart(k + 1, "0");
  let r = k ? `${s.slice(0, -k)}.${s.slice(-k)}` : s;
  if (!keep && k) r = r.replace(/0+$/, "").replace(/\.$/, "");
  return (u < 0 ? "-" : "") + r;
};
/** The answer as a whole number of units of 10^-k, or null if it is not one. */
const units = (v: Value, k: number): number | null => {
  if (Array.isArray(v)) return null;
  const x = Number(String(v).replace(/−/g, "-"));
  if (!Number.isFinite(x)) return null;
  const u = Math.round(x * 10 ** k);
  return Math.abs(x * 10 ** k - u) < 1e-6 ? u : null;
};
/** Bugs written as decimals: keep only predictions whose value differs from the answer (in units). */
const decBugs = (answer: number, k: number, list: (Omit<Bug, "predict"> & { u: number | null; keep?: boolean })[]): Bug[] =>
  list.flatMap(({ u, keep, ...b }) => (u === null || u === answer || u < 0 ? [] : [{ ...b, predict: dec(u, k, keep) } as Bug]));
const decDistract = (answer: number, k: number, avoid: number[], cands: number[], keep = false) =>
  [...new Set(cands)].filter((u) => u > 0 && u !== answer && !avoid.includes(u)).map((u) => dec(u, k, keep));
/** Digit-by-digit combination of two whole numbers (no regrouping: nothing carried or exchanged): the classic column slips. */
const digitwise = (a: number, b: number, f: (x: number, y: number) => number) => {
  let r = 0;
  let p = 1;
  while (a > 0 || b > 0) {
    r += f(a % 10, b % 10) * p;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    p *= 10;
  }
  return r;
};
/** Column addition without carrying, the leftmost column written in full (5.6 + 5.51 → 10.01, as a learner writes it). */
const noCarry = (a: number, b: number) => {
  let r = 0;
  let p = 1;
  while (a >= 10 || b >= 10) {
    r += ((a % 10) + (b % 10)) % 10 * p;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    p *= 10;
  }
  return r + (a + b) * p;
};
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const sameSet = (v: Value, want: number[]) => Array.isArray(v) && v.length === want.length && [...v].sort((a, b) => a - b).every((x, i) => x === [...want].sort((a, b) => a - b)[i]);
const tupleOf = (v: Value): number[] | null => {
  const m = String(v).replace(/[()\s]/g, "").split(",");
  const out = m.map(Number);
  return out.length && out.every((x) => Number.isInteger(x)) ? out : null;
};

// ------------------------------------------------------------------ counterexample claims (agcex)
const CLAIMS: { says: string; fits: (n: number) => boolean; agree: number[]; counter: number[] }[] = [
  { says: "Every multiple of 4 is also a multiple of 8.", fits: (n) => n % 8 === 0, agree: [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96], counter: [4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92, 100] },
  { says: "Every odd number bigger than 1 is a prime number.", fits: isPrime, agree: [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97], counter: [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99] },
  { says: "Every number that ends in 6 is a multiple of 4.", fits: (n) => n % 4 === 0, agree: [16, 36, 56, 76, 96, 116, 136, 156, 176, 196], counter: [6, 26, 46, 66, 86, 106, 126, 146, 166, 186] },
  { says: "Every multiple of 3 is an odd number.", fits: (n) => n % 2 === 1, agree: [3, 9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87, 93, 99], counter: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96] },
];
const CEXN = ["Meena", "Arjun", "Selvi", "Farhan"];
/** A fixed, well-mixed hash (FNV-1a, then the murmur3 finalizer). */
const hm = (str: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
/** The five numbers tested for claim k, choice s: four that fit the claim (a hash-chosen four of its agreeing numbers,
 * smallest first) and one counterexample put in among them. Different choices test different numbers (distinct@1). */
function claimList(k: number, s: number): { list: number[]; counter: number } {
  const c = CLAIMS[k];
  const counter = c.counter[hm(`cex${k}:${s}:c`) % c.counter.length];
  const ag = [...c.agree].sort((x, y) => hm(`cex${k}:${s}:${x}`) - hm(`cex${k}:${s}:${y}`) || x - y).slice(0, 4).sort((a, b) => a - b);
  const list = [...ag];
  list.splice(hm(`cex${k}:${s}:at`) % 5, 0, counter);
  return { list, counter };
}
const CEX_SEEDS = 50;

// ------------------------------------------------------------------ order of operations (agbod)
const FORMS = [
  { show: (a: number, b: number, c: number) => `${a} + ${b} × ${c}`, ascii: (a: number, b: number, c: number) => `${a} + ${b} * ${c}` },
  { show: (a: number, b: number, c: number) => `${a} − ${b} × ${c}`, ascii: (a: number, b: number, c: number) => `${a} - ${b} * ${c}` },
  { show: (a: number, b: number, c: number) => `(${a} + ${b}) × ${c}`, ascii: (a: number, b: number, c: number) => `(${a} + ${b}) * ${c}` },
  { show: (a: number, b: number, c: number) => `${a} − ${b} + ${c}`, ascii: (a: number, b: number, c: number) => `${a} - ${b} + ${c}` },
  { show: (a: number, b: number, c: number) => `${a} + ${b} ÷ ${c}`, ascii: (a: number, b: number, c: number) => `${a} + ${b} / ${c}` },
  { show: (a: number, b: number, c: number) => `${a} × (${b} − ${c})`, ascii: (a: number, b: number, c: number) => `${a} * (${b} - ${c})` },
];
const bodValue = (f: number, a: number, b: number, c: number) => [a + b * c, a - b * c, (a + b) * c, a - b + c, a + b / c, a * (b - c)][f];

export const B07: Def[] = [
  // ================================================================ speed as distance per unit time
  {
    id: "agspd",
    arity: 3,
    title: "Distance covered in one hour or one minute",
    competency: SPD,
    type: "integer",
    mc: true,
    parse: none,
    // [s, t, u]: a steady s per unit of time for t units; u = 0 km per hour (a vehicle), u = 1 metres per minute (walking)
    reject: ([s, t, u]) => (s < 12 || s > 90 || t < 2 || t > 6 || (u !== 0 && u !== 1) ? "A steady speed of 12 to 90 per unit of time, over 2 to 6 hours or minutes." : null),
    prompt: ([s, t, u]) => (u === 0 ? `A van travels ${s * t} km in ${t} hours, going the same distance every hour. How many km does it travel in 1 hour?` : `A girl walks ${s * t} metres in ${t} minutes, walking the same distance every minute. How many metres does she walk in 1 minute?`),
    solve: ([s, t, u]) => ({
      steps: [
        { id: "total", op: "read", competency: SPD, inputs: [s * t, t, u ? "metres" : "km", u ? "minutes" : "hours"], value: s * t },
        { id: "share", op: "divide", competency: LDIV, inputs: [s * t, t], value: s },
      ],
      answer: s,
    }),
    // independent: add the answer once for every hour (or minute) and see whether it makes the whole distance
    validate: ([s, t], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      let d = 0;
      for (let i = 0; i < t; i++) d += v;
      return d === s * t;
    },
    bugs: ([s, t, u]) => [
      { id: "multiply-not-divide", kind: "conceptual", competency: SPD, says: `The distance was multiplied by the time. In 1 ${u ? "minute" : "hour"} the distance is less than the whole journey, so share it out: divide by ${t}.`, predict: s * t * t },
      { id: "whole-distance", kind: "conceptual", competency: SPD, says: `The whole distance was given. The question asks for the part covered in just 1 ${u ? "minute" : "hour"}.`, predict: s * t },
      { id: "subtract-time", kind: "procedural", competency: SPD, says: `${t} was taken away from the distance. Sharing a distance equally over ${t} ${u ? "minutes" : "hours"} means dividing by ${t}.`, predict: s * t - t },
      { id: "division-slip", kind: "prerequisite", competency: LDIV, says: `A slip in dividing ${s * t} by ${t}. Check by multiplying back: the answer × ${t} must give ${s * t}.`, predict: [s + 1, s - 1, s + 10, s - 10].filter((x) => x > 0), ...(s >= 12 && s <= 99 ? { probe: `gen:ldiv:${s},${t}` } : {}) },
    ],
    variants: () => [],
    explain: (st) => (st.id === "total" ? `${st.inputs[0]} ${st.inputs[2]} are covered in ${st.inputs[1]} equal ${st.inputs[3]}` : `Share it equally: ${st.inputs[0]} ÷ ${st.inputs[1]} = ${st.value} in each one`),
    domain: [[12, 90], [2, 6], [0, 1]],
    cap: 400,
    difficulty: ([s, t]) => (s % 10 === 0 && t <= 3 ? 1 : s * t <= 250 ? 2 : 3),
    // only the start and the whole distance: ticks or jumps at each hour would show the answer
    figure: ([s, t]) => ({ type: "numberline", from: 0, to: s * t, step: s * t }),
    word: ([s, t, u]) => (u === 0 ? `${name(s)}'s family drives ${s * t} km from Chennai to a temple town in ${t} hours, at a steady speed. How many km do they drive in each hour?` : `${name(s + t)} cycles ${s * t} metres around the school ground in ${t} minutes, at a steady speed. How many metres does ${name(s + t)} cycle each minute?`),
    teach: {
      idea: "Speed tells how far something goes in ONE hour (or one minute). If the speed is steady, every hour covers the same part of the journey.",
      method: "Share the whole distance equally among the hours: distance ÷ time. Check by multiplying back.",
      visual: ([s, t]) => ({ type: "numberline", from: 0, to: s * t, step: s, jumps: Array.from({ length: t }, (_, i) => [i * s, (i + 1) * s]) }),
      alternatives: [
        { id: "hour_table", title: "Build an hour-by-hour table", kind: "conceptual", text: ["Make a table: after 1 hour, after 2 hours, and so on.", "Guess the distance for 1 hour, keep adding it, and adjust the guess until the last row gives the whole distance."], visual: ([s, t]) => ({ type: "table", head: ["Time", "Distance so far"], rows: Array.from({ length: t }, (_, i) => [`${i + 1}`, i === t - 1 ? `${s * t}` : "?"]) }) },
      ],
    },
    limits: "Whole-number speeds from 12 to 90 per hour or per minute over 2 to 6 units of time; changing units (km/h to m/min) is another family.",
  },
  {
    id: "agspdc",
    arity: 4,
    title: "Comparing two speeds from distance and time",
    competency: SPD,
    type: "integer",
    mc: true,
    parse: none,
    // [a, t1, b, t2]: Anu-side child covers a m each minute for t1 minutes, the other b m each minute for t2 minutes
    reject: ([a, t1, b, t2]) => (a < 20 || a > 80 || b < 20 || b > 80 || t1 < 2 || t1 > 6 || t2 < 2 || t2 > 6 || a === b || t1 === t2 || a * t1 === b * t2 ? "Two different steady speeds (20 to 80 m a minute) over different times of 2 to 6 minutes, and different distances." : null),
    prompt: ([a, t1, b, t2]) => `The table shows how far ${name(a + t1)} and ${name(a + t1 + 6)} cycled and how long each took, each at a steady speed. How many metres in 1 minute does the faster child cycle?`,
    solve: ([a, t1, b, t2]) => ({
      steps: [
        { id: "first", op: "divide", competency: SPD, inputs: [name(a + t1), a * t1, t1], value: a },
        { id: "second", op: "divide", competency: SPD, inputs: [name(a + t1 + 6), b * t2, t2], value: b },
        { id: "compare", op: "compare", competency: SPD, inputs: [a, b], value: Math.max(a, b) },
      ],
      answer: Math.max(a, b),
    }),
    // independent: for each child, search for the steady speed that fits (speed × time = distance), then take the larger
    validate: ([a, t1, b, t2], v) => {
      const fit = (d: number, t: number) => {
        for (let x = 1; x <= d; x++) if (x * t === d) return x;
        return -1;
      };
      return v === Math.max(fit(a * t1, t1), fit(b * t2, t2));
    },
    bugs: ([a, t1, b, t2]) => {
      const farther = a * t1 > b * t2 ? a : b;
      const quicker = t1 < t2 ? a : b;
      return [
        { id: "farther-is-faster", kind: "conceptual", competency: SPD, says: "The child who went farther was taken as faster. Going farther may just mean cycling for longer: compare the distance in ONE minute.", predict: farther },
        { id: "less-time-is-faster", kind: "conceptual", competency: SPD, says: "The child with the shorter time was taken as faster, but they cycled different distances. Work out each child's metres in one minute.", predict: quicker },
        { id: "bigger-distance", kind: "procedural", competency: SPD, says: "The longer distance was given instead of a speed. Speed is the distance in 1 minute: distance ÷ minutes.", predict: Math.max(a * t1, b * t2) },
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "compare" ? `${st.inputs[0]} and ${st.inputs[1]} metres a minute: the faster speed is ${st.value} metres a minute` : `${st.inputs[0]}: ${st.inputs[1]} m ÷ ${st.inputs[2]} minutes = ${st.value} m in each minute`),
    domain: [[20, 80], [2, 6], [20, 80], [2, 6]],
    keep: ([a, t1, b, t2]) => a < b && t1 !== t2 && a * t1 !== b * t2 && a * t1 <= 400 && b * t2 <= 400 && (a % 5 === 0 || b % 5 === 0),
    cap: 400,
    difficulty: ([a, t1, b, t2]) => ((a * t1 > b * t2) !== (a > b) ? 3 : a % 10 === 0 && b % 10 === 0 ? 1 : 2),
    figure: ([a, t1, b, t2]) => ({ type: "table", head: ["Child", "Distance (metres)", "Time (minutes)"], rows: [[name(a + t1), String(a * t1), String(t1)], [name(a + t1 + 6), String(b * t2), String(t2)]] }),
    word: ([a, t1, b, t2]) => `Two buses run at steady speeds. The red bus goes ${a * t1} km in ${t1} hours. The blue bus goes ${b * t2} km in ${t2} hours. How many km in 1 hour does the faster bus go?`,
    teach: {
      idea: "To compare speeds fairly, compare the distance each covers in the SAME time: one minute (or one hour).",
      method: "For each one, divide distance by time to get the distance in 1 minute. The bigger result is the faster one.",
      alternatives: [
        { id: "same_time", title: "Stretch both to the same time", kind: "conceptual", text: ["Find a time both can be scaled to, e.g. 12 minutes for 3 and 4 minutes.", "Multiply each distance up to that time; the one that goes farther in the same time is faster."] },
      ],
    },
    limits: "Two children with whole-number speeds in metres per minute; the everyday form uses km per hour with the same numbers.",
  },

  // ================================================================ decimals: add and subtract
  {
    id: "agdec",
    contract: { kind: "value", statement: ([x, y, op]) => `${dec(x, 1)}${op ? "-" : "+"}${dec(y, 2)}` },
    arity: 3,
    title: "Adding and subtracting decimals with different places",
    competency: DEC,
    type: "fraction",
    mc: true,
    parse: none,
    // [x, y, op]: x tenths (1.1 to 19.9), y hundredths (1.01 to 9.99); op 0: x + y, op 1: x − y
    reject: ([x, y, op]) => (x < 11 || x > 199 || y < 101 || y > 999 || x % 10 === 0 || y % 10 === 0 || (op !== 0 && op !== 1) || (op === 1 && 10 * x <= y) ? "A number with tenths and a number with hundredths (1.01 to 9.99), added, or subtracted when the answer is positive." : null),
    prompt: ([x, y, op]) => `Work out ${dec(x, 1)} ${op ? "−" : "+"} ${dec(y, 2)}.`,
    solve: ([x, y, op]) => {
      const r = op ? 10 * x - y : 10 * x + y;
      return {
        steps: [
          { id: "line-up", op: "rewrite", competency: DTEN, inputs: [dec(x, 1), dec(10 * x, 2, true)], value: dec(10 * x, 2, true) },
          { id: "combine", op: op ? "subtract" : "add", competency: DEC, inputs: [dec(10 * x, 2, true), dec(y, 2), op ? "−" : "+"], value: dec(r, 2) },
        ],
        answer: dec(r, 2),
      };
    },
    // independent: undo the operation with ordinary numbers (answer − y, or answer + y) and compare with x
    validate: ([x, y, op], v) => {
      const n = Number(String(v));
      if (!Number.isFinite(n)) return false;
      const back = op ? n + y / 100 : n - y / 100;
      return Math.abs(back - x / 10) < 1e-9;
    },
    bugs: ([x, y, op]) => {
      const X = 10 * x;
      const r = op ? X - y : X + y;
      return decBugs(r, 2, [
        { id: "right-align", kind: "conceptual" as const, competency: DTEN, says: `The digits were lined up from the right, as for whole numbers, so tenths were added to hundredths. Line up the decimal points: write ${dec(x, 1)} as ${dec(X, 2, true)}.`, u: op ? (x - y > 0 ? x - y : null) : x + y },
        ...(op
          ? [
              { id: "bring-down", kind: "procedural" as const, competency: DEC, says: `The empty hundredths place in ${dec(x, 1)} was skipped and the ${y % 10} was brought down. Write ${dec(x, 1)} as ${dec(X, 2, true)}: the empty place is a 0, and you take ${y % 10} away from it by exchanging.`, u: X - y + 2 * (y % 10) },
              { id: "smaller-from-larger", kind: "procedural" as const, competency: DEC, says: "In each column the smaller digit was taken from the larger one. When the top digit is smaller, exchange 1 from the next place first.", u: digitwise(X, y, (a, b) => Math.abs(a - b)) },
            ]
          : [{ id: "no-carry", kind: "procedural" as const, competency: ADDR, says: "A column added up to 10 or more, but the 1 was not carried to the next place on the left.", u: noCarry(X, y) }]),
      ]);
    },
    distractors: ([x, y, op]) => {
      const r = op ? 10 * x - y : 10 * x + y;
      return decDistract(r, 2, [], [r + 10, r - 10, r + 100, r - 100, r + 1]);
    },
    variants: () => [],
    explain: (st) => (st.id === "line-up" ? `Line up the decimal points: ${st.inputs[0]} = ${st.inputs[1]}` : `${st.inputs[0]} ${st.inputs[2]} ${st.inputs[1]} = ${st.value}, column by column from the hundredths`),
    domain: [[11, 199], [101, 999], [0, 1]],
    cap: 500,
    difficulty: ([x, y, op]) => (x < 100 && op === 0 ? 1 : op === 0 || x >= 100 ? 2 : 3),
    word: ([x, y, op]) => (op ? `A water can holds ${dec(x, 1)} litres. ${name(x)} pours out ${dec(y, 2)} litres to water the plants. How many litres are left in the can?` : `${name(y)} joins a rope ${dec(x, 1)} m long to another rope ${dec(y, 2)} m long, end to end. How long is the joined rope, in metres?`),
    teach: {
      idea: "Each place has a value: ones, tenths, hundredths. Only digits of the same place can be added or taken away, so the decimal points must line up.",
      method: "Write the numbers one under the other with the decimal points in a line. Fill empty places with 0, then add or subtract from the right as with whole numbers, and keep the point in the answer.",
      visual: ([x, y]) => ({ type: "table", head: ["Tens", "Ones", ".", "Tenths", "Hundredths"], rows: [pvRow(10 * x), pvRow(y)] }),
      alternatives: [
        { id: "money", title: "Think of rupees and paise", kind: "conceptual", text: ["Read 4.5 as ₹4.50 and 2.37 as ₹2.37: 50 paise and 37 paise are both paise, so they go together.", "Add the paise, then the rupees, exchanging 100 paise for ₹1 when needed."] },
      ],
    },
    limits: "One number with tenths (up to 19.9) and one with hundredths (up to 9.99); positive differences only.",
  },
  {
    id: "agrupee",
    arity: 5,
    title: "Adding and subtracting money in rupees and paise",
    competency: DEC,
    type: "fraction",
    mc: true,
    parse: none,
    // [ra, pa, rb, pb, op]: ₹ra.pa ± ₹rb.pb, paise as P[pa], P[pb]; adding makes 100 paise or more, taking away needs an exchange
    reject: ([ra, pa, rb, pb, op]) => {
      const A = ra * 100 + PAISE[pa];
      const B = rb * 100 + PAISE[pb];
      return ra < 10 || ra > 80 || rb < 5 || rb > 60 || pa < 0 || pa > 9 || pb < 0 || pb > 9 || (op !== 0 && op !== 1) || (op === 0 && PAISE[pa] + PAISE[pb] < 100) || (op === 1 && (PAISE[pa] >= PAISE[pb] || A <= B)) ? "Money from ₹5 to ₹80 with paise: additions that make a rupee from the paise, subtractions that need one rupee changed into paise." : null;
    },
    prompt: ([ra, pa, rb, pb, op]) => `₹${dec(ra * 100 + PAISE[pa], 2, true)} ${op ? "−" : "+"} ₹${dec(rb * 100 + PAISE[pb], 2, true)} = ? Give the answer in rupees (for example, write 12.50 for ₹12.50).`,
    solve: ([ra, pa, rb, pb, op]) => {
      const p1 = PAISE[pa];
      const p2 = PAISE[pb];
      const r = op ? ra * 100 + p1 - (rb * 100 + p2) : ra * 100 + p1 + rb * 100 + p2;
      return {
        steps: op
          ? [
              { id: "exchange", op: "regroup", competency: DEC, inputs: [ra, p1], value: p1 + 100 },
              { id: "paise", op: "subtract", competency: DEC, inputs: [p1 + 100, p2], value: p1 + 100 - p2 },
              { id: "rupees", op: "subtract", competency: DEC, inputs: [ra - 1, rb], value: ra - 1 - rb },
            ]
          : [
              { id: "paise", op: "add", competency: DEC, inputs: [p1, p2], value: p1 + p2 },
              { id: "exchange", op: "regroup", competency: DEC, inputs: [p1 + p2], value: p1 + p2 - 100 },
              { id: "rupees", op: "add", competency: DEC, inputs: [ra, rb, 1], value: ra + rb + 1 },
            ],
        answer: dec(r, 2, true),
      };
    },
    // independent: count in paise and undo the operation
    validate: ([ra, pa, rb, pb, op], v) => {
      const u = units(v, 2);
      if (u === null) return false;
      const A = ra * 100 + PAISE[pa];
      const B = rb * 100 + PAISE[pb];
      return op ? u + B === A : u - B === A;
    },
    bugs: ([ra, pa, rb, pb, op]) => {
      const p1 = PAISE[pa];
      const p2 = PAISE[pb];
      const r = op ? ra * 100 + p1 - (rb * 100 + p2) : ra * 100 + p1 + rb * 100 + p2;
      if (!op) {
        return [
          { id: "paise-over-100", kind: "conceptual", competency: DEC, says: `The paise were added to ${p1 + p2} and all written after the point. ${p1 + p2} paise is ₹1 and ${p1 + p2 - 100} paise, so carry ₹1 to the rupees.`, predict: `${ra + rb}.${p1 + p2}` },
          ...decBugs(r, 2, [{ id: "rupee-not-carried", kind: "procedural", competency: DEC, says: `100 paise were taken away from the paise but the ₹1 they make was not added to the rupees.`, u: r - 100, keep: true }]),
        ];
      }
      return decBugs(r, 2, [
        { id: "smaller-paise-from-larger", kind: "procedural", competency: DEC, says: `${p1} paise is less than ${p2} paise, so ${p1} was taken from ${p2} instead. Change ₹1 into 100 paise first: ${p1 + 100} − ${p2}.`, u: (ra - rb) * 100 + (p2 - p1), keep: true },
        { id: "rupee-not-reduced", kind: "procedural", competency: DEC, says: `₹1 was changed into paise, but the rupees were not made one less (₹${ra} becomes ₹${ra - 1}).`, u: r + 100, keep: true },
      ]);
    },
    distractors: ([ra, pa, rb, pb, op]) => {
      const r = op ? ra * 100 + PAISE[pa] - (rb * 100 + PAISE[pb]) : ra * 100 + PAISE[pa] + rb * 100 + PAISE[pb];
      return decDistract(r, 2, [r + 100, r - 100], [r + 10, r - 10, r + 1000, r - 5], true);
    },
    variants: () => [],
    explain: (st) =>
      st.id === "paise"
        ? `Paise: ${st.inputs[0]} ${st.op === "add" ? "+" : "−"} ${st.inputs[1]} = ${st.value} paise`
        : st.id === "exchange"
          ? st.inputs.length === 2
            ? `${st.inputs[1]} paise is too few, so change ₹1 into 100 paise: now there are ${st.value} paise`
            : `${st.inputs[0]} paise = ₹1 and ${st.value} paise: carry ₹1`
          : st.op === "add"
            ? `Rupees: ${st.inputs[0]} + ${st.inputs[1]} + 1 carried = ₹${st.value}`
            : `Rupees: ${st.inputs[0]} − ${st.inputs[1]} = ₹${st.value}`,
    domain: [[10, 80], [0, 9], [5, 60], [0, 9], [0, 1]],
    cap: 500,
    difficulty: ([ra, , rb, , op]) => (op === 0 && ra + rb < 60 ? 1 : op === 0 || ra - rb > 20 ? 2 : 3),
    word: ([ra, pa, rb, pb, op]) => (op ? `${name(ra)} has ₹${dec(ra * 100 + PAISE[pa], 2, true)} and buys a notebook for ₹${dec(rb * 100 + PAISE[pb], 2, true)}. How much money is left, in rupees?` : `${name(rb)} buys a pencil box for ₹${dec(ra * 100 + PAISE[pa], 2, true)} and a storybook for ₹${dec(rb * 100 + PAISE[pb], 2, true)}. How much is the bill, in rupees?`),
    teach: {
      idea: "100 paise make ₹1. Paise go with paise and rupees with rupees, and 100 paise can be swapped for ₹1 (or ₹1 for 100 paise).",
      method: "Line up the decimal points. Work on the paise first, exchanging ₹1 and 100 paise when needed, then the rupees.",
      visual: ([ra, pa, rb, pb]) => ({ type: "table", head: ["", "Rupees", "Paise"], rows: [["", String(ra), String(PAISE[pa]).padStart(2, "0")], ["", String(rb), String(PAISE[pb]).padStart(2, "0")]] }),
      alternatives: [
        { id: "all_paise", title: "Change everything into paise", kind: "procedural", text: ["₹45.50 is 4550 paise and ₹28.75 is 2875 paise.", "Add or subtract the paise as whole numbers, then put the point back two places from the right: 7425 paise = ₹74.25."] },
      ],
    },
    limits: "Amounts from ₹5 to ₹80 with paise that need an exchange; three or more amounts and change from notes are other families.",
  },

  // ================================================================ factors and multiples
  {
    id: "agfac",
    arity: 1,
    title: "Listing all the factors of a number",
    competency: FM,
    type: "set",
    parse: (t) => {
      const m = t.trim().match(/^(?:list|find)?\s*(?:all\s+)?(?:the\s+)?factors\s+of\s+(\d{1,3})\??$/i);
      return m ? [Number(m[1])] : null;
    },
    reject: ([n]) => (n < 4 || n > 100 ? "The factors of a whole number from 4 to 100." : null),
    prompt: ([n]) => `List all the factors of ${n}.`,
    solve: ([n]) => {
      const fs: number[] = [];
      const steps = [];
      for (let a = 1; a * a <= n; a++)
        if (n % a === 0) {
          steps.push({ id: `pair${a}`, op: "factorise", competency: FM, inputs: [a, n / a], value: n });
          fs.push(a);
          if (a !== n / a) fs.push(n / a);
        }
      return { steps, answer: fs.sort((x, y) => x - y) };
    },
    // independent: test every number from 1 to n
    validate: ([n], v) => {
      const want: number[] = [];
      for (let k = 1; k <= n; k++) if (n % k === 0) want.push(k);
      return sameSet(v, want);
    },
    bugs: ([n]) => {
      const all: number[] = [];
      for (let k = 1; k <= n; k++) if (n % k === 0) all.push(k);
      const inner = all.filter((k) => k !== 1 && k !== n);
      const low = all.filter((k) => k * k <= n);
      return [
        { id: "forget-1-and-n", kind: "conceptual", competency: FM, says: `1 and ${n} were left out. Every number has 1 and itself as factors: 1 × ${n} = ${n}.`, predict: inner.length ? inner : null },
        { id: "half-the-pairs", kind: "procedural", competency: FM, says: "Only the first number of each factor pair was written. Each factor comes with a partner: write both numbers of every pair.", predict: low },
        { id: "multiples-for-factors", kind: "conceptual", competency: FM, says: `Multiples of ${n} were listed. Factors divide ${n} exactly, so they are never bigger than ${n}.`, predict: [n, 2 * n, 3 * n, 4 * n, 5 * n] },
      ];
    },
    variants: () => [],
    explain: (st) => `${st.inputs[0]} × ${st.inputs[1]} = ${st.value}, so ${st.inputs[0]}${st.inputs[0] === st.inputs[1] ? " is a factor" : ` and ${st.inputs[1]} are factors`}`,
    domain: [[4, 100]],
    difficulty: ([n]) => (n <= 30 ? 1 : n <= 60 ? 2 : 3),
    figure: ([n]) => {
      let r = 1;
      for (let a = 2; a * a <= n; a++) if (n % a === 0) r = a;
      return r > 1 ? { type: "array", rows: r, cols: n / r } : { type: "dots", count: n, rows: 1 };
    },
    word: ([n]) => `${name(n)} has ${n} square tiles and wants to lay all of them in a rectangle, in equal rows with no gaps. List every possible number of rows (one long row counts too).`,
    teach: {
      idea: "A factor of a number divides it exactly. Factors come in pairs: if a × b = n, both a and b are factors of n.",
      method: "Try 1, 2, 3, … in order. Each time one divides exactly, write it and its partner. Stop when the numbers meet in the middle.",
      visual: ([n]) => {
        let r = 1;
        for (let a = 2; a * a <= n; a++) if (n % a === 0) r = a;
        return { type: "array", rows: r, cols: n / r };
      },
      alternatives: [
        { id: "arrays", title: "Make rectangles of dots", kind: "conceptual", text: ["Arrange the number as dots in a rectangle: rows × columns.", "Every rectangle you can make gives a factor pair; a number with only one rectangle (1 row) is prime."], visual: ([n]) => ({ type: "array", rows: n % 2 === 0 ? 2 : 1, cols: n % 2 === 0 ? n / 2 : n }) },
      ],
    },
    limits: "Numbers from 4 to 100; prime factorisation is another family.",
  },
  {
    id: "agcomf",
    arity: 2,
    title: "Common factors of two numbers",
    competency: FM,
    type: "set",
    parse: none,
    reject: ([a, b]) => (a < 6 || b > 60 || a >= b || gcd(a, b) < 4 || isPrime(gcd(a, b)) ? "Two numbers from 6 to 60, the first smaller, whose highest common factor is 4 or more and not prime (so there are several common factors)." : null),
    prompt: ([a, b]) => `List all the common factors of ${a} and ${b}.`,
    solve: ([a, b]) => {
      const fa: number[] = [];
      for (let k = 1; k <= a; k++) if (a % k === 0) fa.push(k);
      const common = fa.filter((k) => b % k === 0);
      return {
        steps: [
          { id: "factors-a", op: "factorise", competency: FM, inputs: [a], value: fa },
          { id: "common", op: "intersect", competency: FM, inputs: [b], value: common },
        ],
        answer: common,
      };
    },
    // independent: the common factors are exactly the factors of the HCF (Euclid), found by pairing
    validate: ([a, b], v) => {
      let [x, y] = [b, a];
      while (y) [x, y] = [y, x % y];
      const want: number[] = [];
      for (let k = 1; k * k <= x; k++) if (x % k === 0) want.push(...(k * k === x ? [k] : [k, x / k]));
      return sameSet(v, want);
    },
    bugs: ([a, b]) => {
      const fa: number[] = [];
      for (let k = 1; k <= a; k++) if (a % k === 0) fa.push(k);
      const common = fa.filter((k) => b % k === 0);
      return [
        { id: "hcf-only", kind: "conceptual", competency: FM, says: "Only the highest common factor was given. The question asks for every number that divides both.", predict: [gcd(a, b)] },
        { id: "forget-1", kind: "conceptual", competency: FM, says: "1 was left out; 1 divides every number, so it is always a common factor.", predict: common.filter((k) => k !== 1) },
        { id: "factors-of-one", kind: "procedural", competency: FM, says: `All the factors of ${a} were listed. Check each one: does it also divide ${b}?`, predict: fa },
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "factors-a" ? `Factors of ${st.inputs[0]}: ${(st.value as number[]).join(", ")}` : `Keep those that also divide ${st.inputs[0]}: ${(st.value as number[]).join(", ")}`),
    domain: [[6, 59], [7, 60]],
    keep: ([a, b]) => a < b && gcd(a, b) >= 4 && !isPrime(gcd(a, b)),
    cap: 400,
    difficulty: ([a, b]) => (b <= 30 ? 1 : gcd(a, b) <= 6 ? 2 : 3),
    word: ([a, b]) => `${name(a)} has ${a} red beads and ${b} blue beads. ${name(a)} wants to share them into bags so that every bag gets the same number of red beads and the same number of blue beads, with none left over. List every possible number of bags.`,
    teach: {
      idea: "A common factor divides both numbers exactly. 1 is always one; the largest is the HCF.",
      method: "List the factors of the smaller number, then keep only the ones that also divide the larger number.",
      visual: ([a, b]) => {
        const f = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((k) => n % k === 0).join(", ");
        return { type: "table", head: ["Number", "Factors"], rows: [[String(a), f(a)], [String(b), f(b)]] };
      },
      alternatives: [
        { id: "through_hcf", title: "Find the HCF first", kind: "procedural", text: ["Find the largest number that divides both (the HCF).", "Every common factor is a factor of the HCF: list the factors of the HCF."] },
      ],
    },
    limits: "Two numbers up to 60 whose HCF is 4 or more and not prime (several common factors to find); the HCF and LCM themselves are the HCF and LCM families.",
  },
  {
    id: "agjump",
    arity: 3,
    title: "Common multiples from jumps on a number line",
    competency: FM,
    type: "set",
    parse: none,
    // [a, b, N]: one animal jumps a at a time, another b at a time, from 0, up to N
    reject: ([a, b, N]) => (a < 2 || b > 12 || a >= b || b % a === 0 || N < 20 || N > 60 || 2 * lcm(a, b) > N ? "Jumps of 2 to 12 (neither a multiple of the other) up to 60, landing together at least twice." : null),
    prompt: ([a, b, N]) => `A frog starts at 0 and jumps ${a} at a time. A rabbit starts at 0 and jumps ${b} at a time. The picture shows their jumps up to ${N}. List every number more than 0 and up to ${N} where both of them land.`,
    solve: ([a, b, N]) => {
      const L = lcm(a, b);
      const both: number[] = [];
      for (let k = L; k <= N; k += L) both.push(k);
      return {
        steps: [
          { id: "first", op: "lcm", competency: FM, inputs: [a, b], value: L },
          { id: "repeat", op: "multiples", competency: FM, inputs: [L, N], value: both },
        ],
        answer: both,
      };
    },
    // independent: walk along the number line and check each number for both animals
    validate: ([a, b, N], v) => {
      const want: number[] = [];
      for (let k = 1; k <= N; k++) if (k % a === 0 && k % b === 0) want.push(k);
      return sameSet(v, want);
    },
    bugs: ([a, b, N]) => {
      const L = lcm(a, b);
      const ma: number[] = [];
      for (let k = a; k <= N; k += a) ma.push(k);
      const prod: number[] = [];
      for (let k = a * b; k <= N; k += a * b) prod.push(k);
      return [
        { id: "first-only", kind: "procedural", competency: FM, says: `Only the first meeting point was given. After ${L} they meet again every ${L}: keep going up to ${N}.`, predict: [L] },
        { id: "one-animal", kind: "conceptual", competency: FM, says: `These are all the frog's landing places. A common multiple must be a landing place for the rabbit too.`, predict: ma },
        ...(gcd(a, b) > 1 && prod.length ? [{ id: "product", kind: "conceptual", competency: HL, says: `Only multiples of ${a} × ${b} were used. ${a} and ${b} share a factor, so they meet sooner, at ${L}.`, predict: prod } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "first" ? `The first number both land on is ${st.value}: it is in the ${st.inputs[0]} times table and the ${st.inputs[1]} times table` : `They land together on every multiple of ${st.inputs[0]} up to ${st.inputs[1]}: ${(st.value as number[]).join(", ")}`),
    domain: [[2, 11], [3, 12], [20, 60]],
    keep: ([a, b, N]) => a < b && b % a !== 0 && 2 * lcm(a, b) <= N,
    cap: 300,
    difficulty: ([a, b]) => (lcm(a, b) === a * b && b <= 6 ? 1 : gcd(a, b) === 1 ? 2 : 3),
    figure: ([a, b, N]) => ({ type: "numberline", from: 0, to: N, step: 1, jumps: Array.from({ length: Math.floor(N / a) }, (_, i) => [i * a, (i + 1) * a]), marks: Array.from({ length: Math.floor(N / b) }, (_, i) => (i + 1) * b) }),
    word: ([a, b, N]) => `At ${name(a + b)}'s school, one bell rings every ${a} minutes and another rings every ${b} minutes, both starting together at 0 minutes. In the first ${N} minutes, list every minute (after 0) when both ring at the same time.`,
    teach: {
      idea: "A number where both animals land is in both times tables: a common multiple. After the first one, they meet again at regular steps of that same size.",
      method: "Write the multiples of the bigger jump and check each one: does the smaller jump also land there? Collect those up to the end of the line.",
      visual: ([a, b, N]) => ({ type: "numberline", from: 0, to: N, step: 1, jumps: Array.from({ length: Math.floor(N / a) }, (_, i) => [i * a, (i + 1) * a]), marks: Array.from({ length: Math.floor(N / b) }, (_, i) => (i + 1) * b) }),
      alternatives: [
        { id: "two_lists", title: "Two lists side by side", kind: "procedural", text: ["Write the frog's landing places in one row and the rabbit's in the row below.", "Circle the numbers that appear in both rows."], visual: ([a, b, N]) => ({ type: "table", head: ["Animal", "Lands on"], rows: [["Frog", Array.from({ length: Math.floor(N / a) }, (_, i) => (i + 1) * a).join(", ")], ["Rabbit", Array.from({ length: Math.floor(N / b) }, (_, i) => (i + 1) * b).join(", ")]] }) },
      ],
    },
    limits: "Two jumps up to 12 (neither a multiple of the other) on a line up to 60.",
  },

  // ================================================================ HCF and LCM
  {
    id: "aglcm",
    arity: 2,
    title: "The lowest common multiple of two numbers",
    competency: HL,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.trim().match(/^(?:find\s+)?(?:the\s+)?(?:lcm|l\.c\.m\.)\s+of\s+(\d{1,2})\s+and\s+(\d{1,2})\??$/i);
      return m ? [Math.min(Number(m[1]), Number(m[2])), Math.max(Number(m[1]), Number(m[2]))] : null;
    },
    reject: ([a, b]) => (a < 2 || b > 24 || a >= b ? "Two different numbers from 2 to 24." : null),
    prompt: ([a, b]) => `What is the lowest common multiple (LCM) of ${a} and ${b}?`,
    solve: ([a, b]) => {
      const g = gcd(a, b);
      return {
        steps: [
          { id: "hcf", op: "hcf", competency: HL, inputs: [a, b], value: g },
          { id: "lcm", op: "multiply", competency: MT, inputs: [a / g, b], value: (a / g) * b },
        ],
        answer: (a / g) * b,
      };
    },
    // independent: go up the b times table until a multiple of a appears
    validate: ([a, b], v) => {
      let m = b;
      while (m % a !== 0) m += b;
      return v === m;
    },
    bugs: ([a, b]) => {
      const g = gcd(a, b);
      // an explanation is offered only where its premise is true for these numbers
      return [
        ...(g > 1 ? [{ id: "product", kind: "conceptual", competency: HL, says: `${a} × ${b} is a common multiple, but ${a} and ${b} share the factor ${g}, so a smaller one comes first.`, predict: a * b } as Bug] : []),
        { id: "hcf-for-lcm", kind: "conceptual", competency: HL, says: "The highest common factor was found. The LCM is the smallest number that BOTH divide into: it is never smaller than the larger number.", predict: g },
        ...(b % a ? [{ id: "larger-number", kind: "procedural", competency: HL, says: `${b} was given, but ${b} is not in the ${a} times table. Keep going along the ${b} times table.`, predict: b } as Bug] : []),
        { id: "common-not-lowest", kind: "procedural", competency: HL, says: "A common multiple was found, but not the lowest one. Check the smaller multiples first.", predict: 2 * lcm(a, b) },
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "hcf" ? (st.value === 1 ? `${st.inputs[0]} and ${st.inputs[1]} have no common factor other than 1` : `The highest common factor of ${st.inputs[0]} and ${st.inputs[1]} is ${st.value}`) : `LCM = ${st.inputs[0]} × ${st.inputs[1]} = ${st.value} (check: both ${st.inputs[1]} and the other number divide it)`),
    domain: [[2, 23], [3, 24]],
    keep: ([a, b]) => a < b,
    difficulty: ([a, b]) => (b <= 10 ? 1 : gcd(a, b) === 1 ? 2 : 3),
    // buses only for believable gaps (5 minutes or more); otherwise festival lights blinking every few seconds
    word: ([a, b]) =>
      a >= 5
        ? `Two buses leave the Madurai bus stand together at 8 o'clock. One bus leaves again every ${a} minutes and the other every ${b} minutes. After how many minutes will they next leave together?`
        : `Two strings of festival lights blink together. Then one blinks every ${a} seconds and the other every ${b} seconds. After how many seconds will they next blink together?`,
    teach: {
      idea: "A common multiple is in both times tables. The lowest one is the first time they meet.",
      method: "Go up the times table of the larger number and stop at the first one the smaller number divides exactly.",
      visual: ([a, b]) => ({ type: "numberline", from: 0, to: lcm(a, b), marks: Array.from({ length: lcm(a, b) / b }, (_, i) => (i + 1) * b), jumps: Array.from({ length: lcm(a, b) / a }, (_, i) => [i * a, (i + 1) * a]) }),
      alternatives: [
        {
          id: "prime_factors", title: "Use prime factors", kind: "procedural", text: ["Write each number as a product of primes, e.g. 12 = 2 × 2 × 3 and 18 = 2 × 3 × 3.", "Take each prime the greatest number of times it appears in either: 2 × 2 × 3 × 3 = 36."],
          // stage 2: the explanation works on the question's own two numbers
          textFor: ([a, b]) => {
            const pa = primesOf(a), pb = primesOf(b), take: number[] = [];
            for (const p of [...new Set([...pa, ...pb])].sort((x, y) => x - y)) for (let k = 0; k < Math.max(pa.filter((q) => q === p).length, pb.filter((q) => q === p).length); k++) take.push(p);
            return [`Write each number as a product of primes: ${a} = ${pa.join(" × ")} and ${b} = ${pb.join(" × ")}.`, `Take each prime the greatest number of times it appears in either: ${take.join(" × ")} = ${take.reduce((x, y) => x * y, 1)}.`];
          },
        },
        { id: "ladder", title: "Divide both together", kind: "procedural", text: ["Divide both numbers by a common factor and write the quotients below; repeat until no common factor is left.", "Multiply the divisors on the left by the numbers left at the bottom."] },
      ],
    },
    limits: "Two numbers from 2 to 24; three numbers and the HCF × LCM rule are other families.",
  },
  {
    id: "aghcf3",
    arity: 3,
    title: "The highest common factor of three numbers",
    competency: HL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c]) => (a < 6 || c > 72 || a >= b || b >= c || gcd(gcd(a, b), c) < 2 ? "Three numbers from 6 to 72, in increasing order, with a common factor." : null),
    prompt: ([a, b, c]) => `What is the highest common factor (HCF) of ${a}, ${b} and ${c}?`,
    solve: ([a, b, c]) => {
      const g1 = gcd(a, b);
      const g = gcd(g1, c);
      return {
        steps: [
          { id: "two", op: "hcf", competency: HL, inputs: [a, b], value: g1 },
          { id: "three", op: "hcf", competency: HL, inputs: [g1, c], value: g },
        ],
        answer: g,
      };
    },
    // independent: try every number from the smallest down to 1
    validate: ([a, b, c], v) => {
      for (let k = a; k >= 1; k--) if (a % k === 0 && b % k === 0 && c % k === 0) return v === k;
      return false;
    },
    bugs: ([a, b, c]) => {
      const g = gcd(gcd(a, b), c);
      const small = [2, 3, 5, 7].find((p) => g % p === 0)!;
      return [
        { id: "two-only", kind: "procedural", competency: HL, says: `This is the HCF of ${a} and ${b} only. Check that it divides ${c} too.`, predict: gcd(a, b) },
        { id: "a-common-factor", kind: "conceptual", competency: HL, says: "A common factor was found, but not the highest one. Look for a bigger number that divides all three.", predict: small },
        { id: "smallest-number", kind: "conceptual", competency: HL, says: `The smallest number, ${a}, was given, but ${a} does not divide all of them.`, predict: a },
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "two" ? `HCF of ${st.inputs[0]} and ${st.inputs[1]} is ${st.value}` : `Now with ${st.inputs[1]}: the HCF of ${st.inputs[0]} and ${st.inputs[1]} is ${st.value}`),
    domain: [[6, 70], [7, 71], [8, 72]],
    keep: ([a, b, c]) => {
      const g = gcd(gcd(a, b), c);
      return a < b && b < c && g >= 2 && g < a && (g >= 3 || gcd(a, b) > g);
    },
    cap: 400,
    difficulty: ([a, b, c]) => (c <= 36 ? 1 : gcd(a, b) === gcd(gcd(a, b), c) ? 2 : 3),
    word: ([a, b, c]) => `A tailor has three ribbons, ${a} cm, ${b} cm and ${c} cm long. She cuts all of them into pieces of the same length, as long as possible, with nothing left over. How long is each piece, in cm?`,
    teach: {
      idea: "The HCF is the biggest number that divides every one of the numbers exactly.",
      method: "Find the HCF of the first two numbers, then find the HCF of that result and the third number.",
      alternatives: [
        { id: "list_factors", title: "List and compare factors", kind: "procedural", text: ["List the factors of the smallest number, biggest first.", "The first one that divides the other two numbers exactly is the HCF."] },
        { id: "prime_factors", title: "Common prime factors", kind: "procedural", text: ["Write each number as a product of primes.", "Multiply the primes that appear in all three (as many times as they appear in every one)."] },
      ],
    },
    limits: "Three numbers up to 72 whose HCF is at least 2 and smaller than the smallest number; two numbers are the hcf family.",
  },

  // ================================================================ mixed numbers and improper fractions
  {
    id: "agimp",
    arity: 3,
    title: "Writing a mixed number as an improper fraction",
    competency: MIX,
    // "mixed": the answer is read as written, so 17/5 is right and 3 2/5, 1.5 or 34/10 are not the improper fraction asked for
    type: "mixed",
    mc: true,
    parse: (t) => {
      const m = t.trim().match(/^(?:write\s+)?(\d)\s+(\d{1,2})\/(\d{1,2})(?:\s+as\s+an\s+improper\s+fraction)?\.?$/i);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    },
    // [w, n, d]: w n/d
    reject: ([w, n, d]) => (w < 1 || w > 9 || d < 2 || d > 10 || n < 1 || n >= d || gcd(n, d) !== 1 ? "A mixed number w n/d with w from 1 to 9 and a proper fraction part in simplest form (denominator up to 10)." : null),
    prompt: ([w, n, d]) => `Write the mixed number ${w} ${n}/${d} as an improper fraction (for example 7/3).`,
    solve: ([w, n, d]) => ({
      steps: [
        { id: "wholes", op: "multiply", competency: MT, inputs: [w, d], value: w * d },
        { id: "add", op: "add", competency: MIX, inputs: [w * d, n], value: w * d + n },
      ],
      answer: `${w * d + n}/${d}`,
    }),
    // independent: take whole ones (d pieces) away from the numerator one at a time and see what is left
    validate: ([w, n, d], v) => {
      const m = String(v).trim().match(/^(\d+)\/(\d+)$/);
      if (!m || Number(m[2]) !== d) return false;
      let k = Number(m[1]);
      let wholes = 0;
      while (k >= d && wholes < 50) {
        k -= d;
        wholes++;
      }
      return wholes === w && k === n;
    },
    bugs: ([w, n, d]) => [
      { id: "add-whole-to-top", kind: "conceptual", competency: MIX, says: `${w} was added to the numerator. Each whole is ${d}/${d}, so ${w} wholes are ${w * d} ${d === 2 ? "halves" : `pieces of size 1/${d}`}.`, predict: `${w + n}/${d}` },
      { id: "times-numerator", kind: "procedural", competency: MIX, says: `The whole number was multiplied by the numerator and the denominator was added. Multiply the whole number by the DENOMINATOR, then add the numerator.`, predict: `${w * n + d}/${d}` },
      { id: "forget-numerator", kind: "procedural", competency: MIX, says: `Only the wholes were changed into ${d === 2 ? "halves" : "pieces"}; the ${n}/${d} was not added on.`, predict: `${w * d}/${d}` },
      { id: "fact-slip", kind: "prerequisite", competency: MT, says: `The multiplication ${w} × ${d} is not yet reliable.`, predict: [`${w * d + d + n}/${d}`, ...(w > 1 ? [`${w * d - d + n}/${d}`] : [])] as unknown as Bug["predict"], ...(w >= 2 && d >= 2 ? { probe: `gen:mul:${w},${d}` } : {}) },
    ],
    variants: () => [],
    explain: (st) => (st.id === "wholes" ? `${st.inputs[0]} wholes = ${st.inputs[0]} × ${st.inputs[1]} = ${st.value} pieces` : `${st.inputs[0]} + ${st.inputs[1]} = ${st.value} pieces in all`),
    distractors: ([w, n, d]) => [`${w * d + n}/${d + 1}`, `${w * d - n}/${d}`, `${w * d + n + 1}/${d}`, `${w} ${n}/${d}`],
    domain: [[1, 9], [1, 9], [2, 10]],
    keep: ([, n, d]) => n < d && gcd(n, d) === 1,
    difficulty: ([w, , d]) => (w <= 3 && d <= 5 ? 1 : w * d <= 40 ? 2 : 3),
    word: ([w, n, d]) => `A recipe needs ${w} ${n}/${d} cups of rice flour. ${name(w + d)} has only a 1/${d}-cup measure. Write the amount of flour as an improper fraction of a cup.`,
    teach: {
      idea: `A whole cut into d equal pieces is d/d. So w wholes are w × d pieces, and the fraction part adds a few more pieces of the same size.`,
      method: "Multiply the whole number by the denominator, add the numerator, and write the total over the same denominator.",
      visual: ([w, n, d]) => ({ type: "numberline", from: 0, to: w + 1, step: 1, marks: [w + n / d] }),
      alternatives: [
        { id: "pieces", title: "Cut every whole into pieces", kind: "conceptual", text: ["Draw each whole as a bar cut into the same number of pieces as the denominator.", "Count all the pieces, including the extra ones: that count goes on top."], visual: ([w, n, d]) => ({ type: "grid", rows: w + 1, cols: d, shaded: w * d + n }) },
      ],
    },
    limits: "Whole parts 1 to 9 with denominators up to 10; adding mixed numbers is another family.",
  },
  {
    id: "agmix",
    arity: 2,
    title: "Writing an improper fraction as a mixed number",
    competency: MIX,
    type: "mixed",
    mc: true,
    parse: none,
    // [n, d]: n/d with n > d, not a whole number, in simplest form
    reject: ([n, d]) => (d < 2 || d > 10 || n <= d || n >= 10 * d || n % d === 0 || gcd(n, d) !== 1 ? "An improper fraction n/d (denominator 2 to 10, simplest form) that is between 1 and 10 and not a whole number." : null),
    prompt: ([n, d]) => `Write ${n}/${d} as a mixed number (for example 2 1/3).`,
    solve: ([n, d]) => {
      const w = Math.floor(n / d);
      const r = n % d;
      return {
        steps: [
          { id: "divide", op: "divide", competency: DIVR, inputs: [n, d], value: w },
          { id: "left", op: "remainder", competency: MIX, inputs: [n, w * d], value: r },
        ],
        answer: `${w} ${r}/${d}`,
      };
    },
    // independent: rebuild the improper fraction by repeated addition of d and check the fraction part is proper
    validate: ([n, d], v) => {
      const m = String(v).match(/^(\d+) (\d+)\/(\d+)$/);
      if (!m) return false;
      const [w, r, den] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (den !== d || r <= 0 || r >= den || w < 1) return false;
      let tot = r;
      for (let i = 0; i < w; i++) tot += den;
      return tot === n;
    },
    bugs: ([n, d]) => {
      const w = Math.floor(n / d);
      const r = n % d;
      return [
        { id: "swap", kind: "procedural", competency: MIX, says: `The quotient and the remainder swapped places. ${n} ÷ ${d} = ${w} remainder ${r}: ${w} ${w === 1 ? "whole" : "wholes"}, and the ${r} ${r === 1 ? "piece" : "pieces"} left over ${r === 1 ? "goes" : "go"} on top.`, predict: w === r ? null : `${r} ${w}/${d}` },
        { id: "too-few-wholes", kind: "procedural", competency: DIVR, says: `One whole was missed: ${r + d}/${d} is more than 1, so another whole can be taken out.`, predict: w > 1 ? `${w - 1} ${r + d}/${d}` : null },
        { id: "remainder-as-denominator", kind: "conceptual", competency: MIX, says: `The pieces keep their size: the denominator stays ${d}.`, predict: `${w} ${r}/${n}` },
        { id: "division-slip", kind: "prerequisite", competency: DIVR, says: `A slip in dividing ${n} by ${d}. Check: ${d} × whole number + numerator must give ${n}.`, predict: r + 1 < d ? `${w} ${r + 1}/${d}` : `${w + 1} ${r}/${d}`, ...(n >= 10 && n <= 99 && d <= 9 && n >= 2 * d ? { probe: `gen:divr:${n},${d}` } : {}) },
      ];
    },
    distractors: ([n, d]) => [`${Math.floor(n / d) + 1} ${n % d}/${d}`, `${Math.floor(n / d)} ${d - (n % d) || 1}/${d}`, `${Math.floor(n / d)} ${n}/${d}`],
    variants: () => [],
    explain: (st) => (st.id === "divide" ? `${st.inputs[0]} ÷ ${st.inputs[1]} = ${st.value} whole ones` : `${st.inputs[0]} − ${st.inputs[1]} = ${st.value} pieces left over`),
    domain: [[3, 99], [2, 10]],
    keep: ([n, d]) => n > d && n < 10 * d && n % d !== 0 && gcd(n, d) === 1,
    cap: 400,
    difficulty: ([n, d]) => (n < 3 * d && d <= 5 ? 1 : d <= 6 ? 2 : 3),
    word: ([n, d]) => `${name(n)} has ${n} pieces of chikki, and each piece is 1/${d} of a bar. How many bars is that altogether? Write it as a mixed number.`,
    teach: {
      idea: `A whole is made of d pieces of size 1/d. Dividing the numerator by the denominator tells how many wholes there are; the remainder is the pieces left.`,
      method: "Divide the numerator by the denominator. The quotient is the whole number, the remainder is the new numerator, and the denominator stays the same.",
      visual: ([n, d]) => ({ type: "grid", rows: Math.ceil(n / d), cols: d, shaded: n }),
      alternatives: [
        { id: "count_wholes", title: "Count out the wholes", kind: "conceptual", text: ["Take away d/d (one whole) again and again, counting the wholes.", "When less than a whole is left, that is the fraction part."], visual: ([n, d]) => ({ type: "numberline", from: 0, to: Math.ceil(n / d), step: 1, marks: [n / d] }) },
      ],
    },
    limits: "Improper fractions in simplest form between 1 and 10 with denominators up to 10; the answer is a mixed number in simplest form.",
  },

  // ================================================================ order of operations
  {
    id: "agbod",
    contract: { kind: "value", statement: ([f, a, b, c]) => FORMS[f].ascii(a, b, c) },
    arity: 4,
    title: "Order of operations with brackets",
    competency: OOO,
    type: "integer",
    mc: true,
    parse: none,
    // [f, a, b, c]: the expression FORMS[f] with numbers a, b, c
    reject: ([f, a, b, c]) => {
      if (f < 0 || f > 5 || a < 2 || a > 40 || b < 2 || b > 12 || c < 2 || c > 12) return "Three numbers (2 to 40, 2 to 12, 2 to 12) in one of six expression shapes.";
      if (f === 1 && a <= b * c) return "a − b × c must stay above 0.";
      if (f === 3 && a <= b) return "a − b must stay above 0.";
      if (f === 4 && b % c !== 0) return "b ÷ c must be a whole number.";
      if (f === 5 && b <= c) return "b − c must be above 0.";
      return null;
    },
    prompt: ([f, a, b, c]) => `Work out ${FORMS[f].show(a, b, c)}.`,
    solve: ([f, a, b, c]) => {
      const steps =
        f === 0 || f === 1 || f === 4
          ? [
              { id: "first", op: f === 4 ? "divide" : "multiply", competency: OOO, inputs: [b, c, f === 4 ? "÷" : "×"], value: f === 4 ? b / c : b * c },
              { id: "then", op: f === 1 ? "subtract" : "add", competency: OOO, inputs: [a, f === 4 ? b / c : b * c, f === 1 ? "−" : "+"], value: bodValue(f, a, b, c) },
            ]
          : f === 2 || f === 5
            ? [
                { id: "bracket", op: f === 2 ? "add" : "subtract", competency: OOO, inputs: f === 2 ? [a, b, "+"] : [b, c, "−"], value: f === 2 ? a + b : b - c },
                { id: "then", op: "multiply", competency: OOO, inputs: f === 2 ? [a + b, c, "×"] : [a, b - c, "×"], value: bodValue(f, a, b, c) },
              ]
            : [
                { id: "left", op: "subtract", competency: OOO, inputs: [a, b, "−"], value: a - b },
                { id: "then", op: "add", competency: OOO, inputs: [a - b, c, "+"], value: a - b + c },
              ];
      return { steps, answer: bodValue(f, a, b, c) };
    },
    // independent: read the written expression with the general expression parser and evaluate it
    validate: ([f, a, b, c], v) => {
      try {
        return typeof v === "number" && Math.abs(evaluate(parse(FORMS[f].ascii(a, b, c)), {}) - v) < 1e-9;
      } catch {
        return false;
      }
    },
    bugs: ([f, a, b, c]) => {
      const ans = bodValue(f, a, b, c);
      const out: Bug[] = [];
      if (f === 0) out.push({ id: "left-to-right", kind: "conceptual", competency: OOO, says: `The adding was done first, from left to right. Multiplication comes before addition: work out ${b} × ${c} first.`, predict: (a + b) * c });
      if (f === 1) out.push({ id: "left-to-right", kind: "conceptual", competency: OOO, says: `The subtraction was done first. Multiplication comes before subtraction: work out ${b} × ${c} first.`, predict: (a - b) * c });
      if (f === 4) out.push({ id: "left-to-right", kind: "conceptual", competency: OOO, says: `The adding was done first. Division comes before addition: work out ${b} ÷ ${c} first.`, predict: (a + b) % c === 0 ? (a + b) / c : null });
      if (f === 2) out.push({ id: "ignore-brackets", kind: "conceptual", competency: OOO, says: "The brackets were ignored. Work out what is inside the brackets first.", predict: a + b * c });
      if (f === 5) out.push({ id: "ignore-brackets", kind: "conceptual", competency: OOO, says: "The brackets were ignored. Work out what is inside the brackets first.", predict: a * b - c });
      if (f === 3) out.push({ id: "add-before-subtract", kind: "conceptual", competency: OOO, says: `${b} + ${c} was worked out first. Adding and taking away have equal rank: go from left to right, ${a} − ${b} first.`, predict: a - b - c > 0 ? a - b - c : null });
      if (f === 0 || f === 1 || f === 2 || f === 5) {
        const [x, y] = f === 5 ? [a, b - c] : f === 2 ? [a + b, c] : [b, c];
        if (x >= 2 && x <= 12 && y >= 2 && y <= 12) out.push({ id: `fact-slip:${Math.min(x, y)}x${Math.max(x, y)}`, kind: "prerequisite", competency: MT, says: `A multiplication fact (${x} × ${y}) is not yet reliable.`, predict: [ans + (f === 1 ? -x : x), ans + (f === 1 ? x : -x)].filter((v) => v > 0), probe: `gen:mul:${x},${y}` });
      }
      return out;
    },
    variants: () => [],
    explain: (st) =>
      st.id === "first"
        ? `${st.inputs[2] === "÷" ? "Divide" : "Multiply"} first: ${st.inputs[0]} ${st.inputs[2]} ${st.inputs[1]} = ${st.value}`
        : st.id === "bracket"
          ? `Brackets first: ${st.inputs[0]} ${st.inputs[2]} ${st.inputs[1]} = ${st.value}`
          : st.id === "left"
            ? `Left to right: ${st.inputs[0]} − ${st.inputs[1]} = ${st.value}`
            : `Then ${st.inputs[0]} ${st.inputs[2]} ${st.inputs[1]} = ${st.value}`,
    domain: [[0, 5], [2, 40], [2, 12], [2, 12]],
    cap: 600,
    difficulty: ([f, a, b, c]) => (f === 2 || f === 3 ? (a + b * c < 60 ? 1 : 2) : bodValue(f, a, b, c) <= 60 ? 2 : 3),
    word: ([f, a, b, c]) =>
      [
        `${name(a)} has ${a} marbles and buys ${b} packets with ${c} marbles in each. How many marbles does ${name(a)} have now?`,
        `${name(a + 1)} has ₹${a} and buys ${b} pens costing ₹${c} each. How many rupees are left?`,
        `A hall has ${c} rows of chairs. Each row has ${a} red chairs and ${b} blue chairs. How many chairs are there?`,
        `A bus has ${a} passengers. At a stop, ${b} people get off and then ${c} people get on. How many passengers are on the bus now?`,
        `${name(b)} has ${a} stickers. A packet of ${b} stickers is shared equally among ${c} friends, and ${name(b)} is one of them. How many stickers does ${name(b)} have now?`,
        `There are ${a} boxes with ${b} mangoes in each. From every box, ${c} mangoes are taken out for a neighbour. How many mangoes are left in the boxes?`,
      ][f],
    teach: {
      idea: "Everyone agrees on one order so an expression has only one value: brackets first, then × and ÷, then + and −; equal ranks go from left to right.",
      method: "Look for brackets and work them out. Next do every × and ÷, left to right. Last do + and −, left to right.",
      alternatives: [
        { id: "tree", title: "Draw it as a tree", kind: "conceptual", text: ["Put the last operation at the top of a tree, with its two parts as branches: 6 + 4 × 3 has + at the top, with 6 on one branch and 4 × 3 on the other.", "Work from the bottom of the tree upwards: 4 × 3 = 12, then 6 + 12 = 18."] },
        { id: "terms", title: "Split into terms", kind: "procedural", text: ["Cut the expression at every + and − that is not inside brackets: each piece is a term.", "Work out each term on its own, then add and take away the terms from left to right."] },
      ],
    },
    limits: "Three numbers in six shapes (a + b × c, a − b × c, (a + b) × c, a − b + c, a + b ÷ c, a × (b − c)); longer expressions and tree diagrams as pictures are other families.",
  },

  // ================================================================ percentages as hundredths
  {
    id: "agpct",
    arity: 2,
    title: "Writing a fraction or decimal as a percentage",
    competency: PCT,
    type: "fraction",
    mc: true,
    parse: none,
    // [m, x]: m = 0: the fraction x/100 in simplest form; m = 1: the decimal x/100; the answer is x (per cent)
    reject: ([m, x]) => (x < 1 || x > 99 || (m !== 0 && m !== 1) ? "A fraction or decimal between 0 and 1 with an exact whole-number percentage." : null),
    prompt: ([m, x]) => {
      const g = gcd(x, 100);
      return `Write ${m ? dec(x, 2) : `${x / g}/${100 / g}`} as a percentage. (Give the number of per cent: for 50% write 50.)`;
    },
    solve: ([m, x]) => {
      const g = gcd(x, 100);
      return {
        steps: m
          ? [{ id: "hundredths", op: "read", competency: PCT, inputs: [dec(x, 2)], value: x }]
          : [
              { id: "scale", op: "scale", competency: PCT, inputs: [x / g, 100 / g, g], value: x },
              { id: "hundredths", op: "read", competency: PCT, inputs: [`${x}/100`], value: x },
            ],
        answer: String(x),
      };
    },
    // independent: the percentage over 100 must equal the given number (cross-multiply, or read the decimal digits)
    validate: ([m, x], v) => {
      const n = Number(String(v));
      if (!Number.isFinite(n)) return false;
      if (m) return Math.abs(Number(dec(x, 2)) * 100 - n) < 1e-9;
      const g = gcd(x, 100);
      return Math.abs(n * (100 / g) - (x / g) * 100) < 1e-9;
    },
    bugs: ([m, x]) => {
      const g = gcd(x, 100);
      const [num, den] = [x / g, 100 / g];
      const out: { id: string; kind: Bug["kind"]; competency: string; says: string; u: number | null }[] = m
        ? [
            { id: "one-place", kind: "conceptual", competency: PCT, says: `The point moved only one place. Per cent means hundredths: ${dec(x, 2)} is ${x} hundredths, so it is ${x}%.`, u: x * 10 },
            { id: "zero-ignored", kind: "conceptual", competency: DTEN, says: `The 0 straight after the point was ignored. ${dec(x, 2)} is ${x} hundredths, not ${x} tenths.`, u: x < 10 ? x * 1000 : null },
          ]
        : [
            { id: "numerator-as-percent", kind: "conceptual", competency: PCT, says: `The numerator was taken as the percentage. Per cent means out of 100: change ${num}/${den} into hundredths first.`, u: den === 100 ? null : num * 100 },
            { id: "unit-fraction", kind: "procedural", competency: PCT, says: `1/${den} is ${100 / den}%, but there are ${num} of them: ${num} × ${100 / den} = ${x}.`, u: num > 1 ? (100 / den) * 100 : null },
            { id: "add-not-scale", kind: "procedural", competency: PCT, says: `The same number was added to the top and bottom to make the bottom 100. To keep the fraction the same size, MULTIPLY both by ${100 / den}.`, u: den < 100 && num + 100 - den <= 100 ? (num + 100 - den) * 100 : null },
          ];
      return out.flatMap(({ u, ...b }) => (u === null || u === x * 100 ? [] : [{ ...b, predict: dec(u, 2) } as Bug]));
    },
    distractors: ([, x]) => [x + 10, x - 10, x + 5, 100 - x, x + 1].filter((y) => y > 0 && y !== x).map(String),
    variants: () => [],
    explain: (st) => (st.id === "scale" ? `Multiply top and bottom by ${st.inputs[2]}: ${st.inputs[0]}/${st.inputs[1]} = ${st.value}/100` : `${st.inputs[0]} is ${st.value} hundredths, so it is ${st.value}%`),
    domain: [[0, 1], [1, 99]],
    difficulty: ([m, x]) => (m === 0 && [25, 50, 75, 10, 20].includes(x) ? 1 : m === 1 && x % 10 !== 0 ? 2 : 3),
    word: ([m, x]) => {
      const g = gcd(x, 100);
      return m ? `In a class test, ${name(x)} got ${dec(x, 2)} of the marks. What percentage of the marks is that? (Give the number of per cent.)` : `${x / g} out of every ${100 / g} children in ${name(x + 3)}'s school walk to school. What percentage of the children walk to school? (Give the number of per cent.)`;
    },
    teach: {
      idea: "Per cent means 'out of 100'. A percentage is a number of hundredths: 37% = 37/100 = 0.37.",
      method: "Turn the fraction into hundredths by multiplying top and bottom by the same number; for a decimal, read how many hundredths it is. That number of hundredths is the percentage.",
      visual: ([, x]) => ({ type: "grid", rows: 10, cols: 10, shaded: x }),
      alternatives: [
        { id: "hundred_grid", title: "Shade a hundred square", kind: "conceptual", text: ["A 10 × 10 square has 100 small squares; each one is 1%.", "Shade the part the fraction or decimal stands for and count the small squares."], visual: ([, x]) => ({ type: "grid", rows: 10, cols: 10, shaded: x }) },
      ],
    },
    limits: "Whole-number percentages from 1% to 99%; percentages over 100 and with decimals are other families.",
  },
  {
    id: "agpctd",
    arity: 1,
    title: "Writing a percentage as a decimal",
    competency: PCT,
    type: "fraction",
    mc: true,
    parse: (t) => {
      const m = t.trim().match(/^(?:write\s+)?(\d{1,3})\s*%\s*(?:as\s+a\s+decimal)?\.?$/i);
      return m ? [Number(m[1])] : null;
    },
    reject: ([x]) => (x < 1 || x > 150 || x % 100 === 0 ? "A whole-number percentage from 1% to 150% (not 100%)." : null),
    prompt: ([x]) => `Write ${x}% as a decimal.`,
    solve: ([x]) => ({ steps: [{ id: "hundredths", op: "divide", competency: PCT, inputs: [x], value: dec(x, 2) }], answer: dec(x, 2) }),
    // independent: the decimal × 100 must give back the percentage
    validate: ([x], v) => {
      const n = Number(String(v));
      return Number.isFinite(n) && Math.abs(n * 100 - x) < 1e-9;
    },
    bugs: ([x]) =>
      decBugs(10 * x, 3, [
        { id: "tenths", kind: "conceptual", competency: PCT, says: `${x}% was written as ${x} tenths. Per cent means hundredths: ${x}% = ${x}/100.`, u: x * 100 },
        { id: "thousandths", kind: "procedural", competency: DTEN, says: "The point moved three places. Dividing by 100 moves the point two places to the left.", u: x },
        { id: "drop-sign", kind: "conceptual", competency: PCT, says: `The % sign was just dropped. ${x}% is ${x} out of 100, which is ${dec(x, 2)}.`, u: x * 1000 },
      ]),
    distractors: ([x]) => decDistract(10 * x, 3, [x * 100, x, x * 1000], [10 * x + 100, 10 * x + 10, 10 * (100 - x), 10 * (100 + x)]),
    variants: () => [],
    explain: (st) => `${st.inputs[0]}% = ${st.inputs[0]}/100 = ${st.value}`,
    domain: [[1, 150]],
    keep: ([x]) => x !== 100,
    difficulty: ([x]) => (x % 10 === 0 && x < 100 ? 1 : x < 100 ? 2 : 3),
    word: ([x]) => `A shop says that ${x}% of the price is the cost of making a toy. ${name(x)} wants to type this into a calculator as a decimal. What decimal should ${name(x)} type?`,
    teach: {
      idea: "Per cent means hundredths, so x% is x/100. Dividing by 100 moves every digit two places to the right of where it was.",
      method: "Write the percentage over 100, then write it as a decimal: the last two digits of the number become the tenths and hundredths.",
      visual: ([x]) => ({ type: "grid", rows: 10, cols: 10, shaded: Math.min(x, 100) }),
      alternatives: [
        { id: "money", title: "Think of paise in a rupee", kind: "conceptual", text: ["₹1 has 100 paise, so 1% of a rupee is 1 paisa.", "7% of a rupee is 7 paise = ₹0.07; 45% is 45 paise = ₹0.45."] },
      ],
    },
    limits: "Whole-number percentages from 1% to 150%; percentages with decimals (12.5%) are another family.",
  },

  // ================================================================ primes
  {
    id: "agprime",
    arity: 2,
    title: "Listing the prime numbers in a range",
    competency: PRI,
    type: "set",
    parse: (t) => {
      const m = t.trim().match(/^(?:list\s+)?(?:all\s+)?(?:the\s+)?prime\s+numbers\s+(?:from|between)\s+(\d{1,2})\s+(?:to|and)\s+(\d{1,3})\??$/i);
      return m ? [Number(m[1]), Number(m[2]) - Number(m[1])] : null;
    },
    // [a, w]: from a to a + w
    reject: ([a, w]) => {
      let c = 0;
      for (let k = a; k <= a + w; k++) if (isPrime(k)) c++;
      return a < 1 || w < 10 || w > 20 || a + w > 100 || c < 2 ? "A stretch of 11 to 21 numbers, up to 100, with at least two primes." : null;
    },
    prompt: ([a, w]) => `List all the prime numbers from ${a} to ${a + w}.`,
    solve: ([a, w]) => {
      const ps: number[] = [];
      for (let k = a; k <= a + w; k++) if (isPrime(k)) ps.push(k);
      return { steps: [{ id: "test", op: "classify", competency: PRI, inputs: [a, a + w], value: ps }], answer: ps };
    },
    // independent: the sieve of Eratosthenes up to the end of the range
    validate: ([a, w], v) => {
      const N = a + w;
      const comp = new Array(N + 1).fill(false);
      comp[0] = comp[1] = true;
      for (let p = 2; p * p <= N; p++) if (!comp[p]) for (let q = p * p; q <= N; q += p) comp[q] = true;
      const want: number[] = [];
      for (let k = a; k <= N; k++) if (!comp[k]) want.push(k);
      return sameSet(v, want);
    },
    bugs: ([a, w]) => {
      const ps: number[] = [];
      const looks: number[] = [];
      for (let k = a; k <= a + w; k++) {
        if (isPrime(k)) ps.push(k);
        else if (k > 1 && k % 2 === 1) looks.push(k);
      }
      return [
        { id: "odd-is-prime", kind: "conceptual", competency: PRI, says: `Some odd numbers that are not prime were included (${looks.slice(0, 3).join(", ")}). Being odd is not enough: test whether 3, 5, 7 or another number divides it.`, predict: looks.length ? [...ps, ...looks].sort((x, y) => x - y) : null },
        { id: "one-is-prime", kind: "conceptual", competency: PRI, says: "1 was counted as prime. A prime has exactly two factors; 1 has only one factor.", predict: a === 1 ? [1, ...ps] : null },
        { id: "two-not-prime", kind: "conceptual", competency: PRI, says: "2 was left out because it is even. 2 has exactly two factors (1 and 2), so it is prime: the only even prime.", predict: a <= 2 ? ps.filter((k) => k !== 2) : null },
      ];
    },
    variants: () => [],
    explain: (st) => `Test each number from ${st.inputs[0]} to ${st.inputs[1]} for factors other than 1 and itself: the primes are ${(st.value as number[]).join(", ")}`,
    domain: [[1, 90], [10, 20]],
    cap: 400,
    difficulty: ([a, w]) => (a + w <= 30 ? 1 : a + w <= 60 ? 2 : 3),
    word: ([a, w]) => `At ${name(a)}'s school sports day, the runners wear the numbers ${a} to ${a + w}. Every runner whose number is a prime number gets a gold ribbon. List the numbers of the runners who get a gold ribbon.`,
    teach: {
      idea: "A prime number has exactly two factors: 1 and itself. 1 is not prime, and 2 is the only even prime.",
      method: "For each number, try dividing by 2, 3, 5 and 7 (enough up to 100, unless the number is that prime). If none divides it exactly, it is prime.",
      alternatives: [
        { id: "sieve", title: "Use a sieve", kind: "procedural", text: ["Write the numbers in a grid. Cross out 1.", "Keep 2 and cross out every other multiple of 2; keep 3 and cross out its multiples; do the same for 5 and 7. The numbers left are prime."] },
        { id: "rectangles", title: "Only one rectangle", kind: "conceptual", text: ["Try to arrange the number as dots in a rectangle with more than one row.", "If the only rectangle is a single row, the number is prime."], visual: ([a]) => ({ type: "array", rows: 1, cols: Math.max(a, 2) }) },
      ],
    },
    limits: "Stretches of 11 to 21 numbers up to 100; testing a single larger number is another family.",
  },

  // ================================================================ testing a claim with a counterexample (the automatic part)
  {
    id: "agcex",
    arity: 2,
    title: "Finding a counterexample to a claim",
    competency: CEX,
    type: "integer",
    mc: true,
    parse: none,
    // [k, s]: claim k tested on the five numbers of choice s
    reject: ([k, s]) =>
      k < 0 || k >= CLAIMS.length || !Number.isInteger(s) || s < 0 || s >= CEX_SEEDS
        ? "One of four claims about numbers, tested on five numbers."
        : [...Array(s).keys()].some((s0) => claimList(k, s0).list.join() === claimList(k, s).list.join())
          ? "An earlier choice already tests these numbers in this order (distinct@1)."
          : null,
    prompt: ([k, s]) => `${CEXN[k]} says: "${CLAIMS[k].says}" ${CEXN[k]} tests the numbers in the table. Which one of them shows that the claim is NOT always true?`,
    solve: ([k, s]) => {
      const { list, counter } = claimList(k, s);
      return { steps: [{ id: "test", op: "test", competency: CEX, inputs: list, value: counter }], answer: counter };
    },
    // independent: the answer must be one of the five numbers, a number the claim talks about, and one where it fails
    validate: ([k, s], v) => {
      const { list } = claimList(k, s);
      if (typeof v !== "number" || !list.includes(v)) return false;
      const about = [(n: number) => n % 4 === 0, (n: number) => n % 2 === 1 && n > 1, (n: number) => n % 10 === 6, (n: number) => n % 3 === 0][k];
      const holds = [(n: number) => n % 8 === 0, (n: number) => { for (let d = 2; d < n; d++) if (n % d === 0) return false; return true; }, (n: number) => n % 4 === 0, (n: number) => n % 2 === 1][k];
      return about(v) && !holds(v);
    },
    bugs: ([k, s]) => {
      const { list, counter } = claimList(k, s);
      const fit = list.find((n) => n !== counter)!;
      return [{ id: "confirming-example", kind: "conceptual", competency: CEX, says: `${fit} agrees with the claim, so it does not show the claim is wrong. To show a claim is not always true, find ONE number where it fails.`, predict: fit }];
    },
    distractors: ([k, s]) => {
      const { list, counter } = claimList(k, s);
      return list.filter((n) => n !== counter);
    },
    variants: () => [],
    explain: (st) => `Test each number: ${st.value} fits the first part of the claim but not the second, so it is a counterexample`,
    domain: [[0, 3], [0, CEX_SEEDS - 1]],
    difficulty: ([k]) => (k === 0 || k === 3 ? 1 : k === 2 ? 2 : 3),
    figure: ([k, s]) => ({ type: "table", head: ["Numbers tested"], rows: claimList(k, s).list.map((n) => [String(n)]) }),
    word: ([k, s]) => {
      const { list } = claimList(k, s);
      return `${name(k + s)} and ${name(k + s + 5)} are arguing. One of them believes: "${CLAIMS[k].says}" The other wants to prove it wrong and picks one of these numbers: ${list.join(", ")}. Which number proves that the claim is false?`;
    },
    teach: {
      idea: "A claim that says 'every' must work for ALL numbers. One number where it fails, a counterexample, is enough to show it is not always true; numbers where it works never prove it.",
      method: "Test each number: does it fit the first part of the claim? If yes, does the rest of the claim hold? The number that fits the first part but not the rest is the counterexample.",
      alternatives: [
        { id: "two_checks", title: "Two ticks", kind: "procedural", text: ["Make two columns: 'is it one the claim talks about?' and 'does the claim hold?'.", "The counterexample has a tick in the first column and a cross in the second."] },
      ],
    },
    limits: "Only the automatically marked part of the competency: choosing the counterexample among five given numbers for four claims; saying whether a claim is always, sometimes or never true, and justifying it, needs written reasoning that an educator marks.",
  },
];

// ================================================================ gap@1 additions (fractions on a number line, co-prime
// numbers, writing and reading expressions, terms, measurement word problems, LCM of three numbers, HCF/LCM word
// problems, HCF × LCM = product, conversions between fractions, decimals and percentages, primality tests, Euclid's
// division algorithm, HCF and LCM from prime factorisations, kinds of fractions, expression trees)

const PERC = "MATH.number.percentage";
const EUC = "MATH.number.euclid-algorithm";
const TREE = "MATH.algebra.expression-trees";
const PF = "MATH.number.prime-factorisation";
const Bg = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Bug["predict"]): Bug => ({ id, kind, competency, says, predict });
const ordered = <T,>(salt: string, xs: T[]) => [...xs].sort((a, b) => hm(salt + String(a)) - hm(salt + String(b)) || (String(a) < String(b) ? -1 : 1));
const mixedOf = (n: number, d: number) => {
  const w = Math.floor(n / d);
  const r = n % d;
  const g = gcd(r, d);
  return r === 0 ? String(w) : w === 0 ? `${r / g}/${d / g}` : `${w} ${r / g}/${d / g}`;
};
/** Read a mixed number, fraction or whole number written as text, as an exact [numerator, denominator]. */
const readMixed = (v: Value): [number, number] | null => {
  const m = String(v).trim().replace(/−/g, "-").match(/^(\d+)(?:\s+(\d+)\/(\d+))?$|^(\d+)\/(\d+)$/);
  if (!m) return null;
  if (m[4] !== undefined) return [Number(m[4]), Number(m[5])];
  return m[2] === undefined ? [Number(m[1]), 1] : [Number(m[1]) * Number(m[3]) + Number(m[2]), Number(m[3])];
};
/** The seeds (0 … n − 1) whose problem differs from every earlier seed's (distinct@1), worked out once. */
const firstSeeds = (() => {
  const memo = new Map<string, Set<number>>();
  return (fam: string, n: number, sig: (s: number) => string) => {
    if (!memo.has(fam)) {
      const seen = new Set<string>();
      const ok = new Set<number>();
      for (let s = 0; s < n; s++) {
        const k = sig(s);
        if (!seen.has(k)) {
          seen.add(k);
          ok.add(s);
        }
      }
      memo.set(fam, ok);
    }
    return memo.get(fam)!;
  };
})();
const lcm3 = (a: number, b: number, c: number) => lcm(lcm(a, b), c);
const evalText = (t: string) => {
  try {
    return evaluate(parse(t.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")), {});
  } catch {
    return NaN;
  }
};

// ---------------------------------------------------------------- fractions beyond 1 on a number line (agnl)
const nlOk = ([n, d]: number[]) => d >= 2 && d <= 8 && n > d && n < 5 * d && n <= 32 && n % d !== 0;

// ---------------------------------------------------------------- co-prime pairs (agcop)
type Pair = [number, number];
function copSet(seed: number): { pairs: Pair[]; right: number; odd: number; prime: number } {
  const r = (k: number) => hm(`agcop:${seed}:${k}`);
  // the co-prime pair: two composite numbers with no common factor (so it cannot be spotted by "one of them is prime")
  const comp = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 26, 27, 28, 32, 33, 34, 35, 38, 39, 49, 51, 55];
  let cp: Pair = [8, 15];
  for (let k = 0; k < 200; k++) {
    const a = comp[r(k) % comp.length];
    const b = comp[r(k + 500) % comp.length];
    if (a < b && gcd(a, b) === 1) {
      cp = [a, b];
      break;
    }
  }
  // two odd numbers that share a factor (looks co-prime to someone who thinks odd numbers have no common factor)
  const oddP: Pair[] = [[9, 15], [15, 25], [21, 35], [9, 21], [15, 21], [25, 35], [27, 45], [21, 49], [33, 55], [35, 45], [39, 65], [45, 75], [9, 33], [15, 27], [35, 55], [21, 33]];
  // a prime and one of its multiples (looks co-prime to someone who thinks a prime is co-prime to every number)
  const primeP: Pair[] = [[7, 21], [5, 35], [3, 27], [11, 33], [13, 39], [7, 49], [5, 45], [3, 51], [11, 55], [13, 26], [17, 51], [7, 42]];
  const evenP: Pair[] = [[12, 18], [14, 20], [16, 22], [6, 26], [10, 24], [18, 30], [8, 28], [20, 34], [22, 36], [24, 38]];
  const o = oddP[r(1) % oddP.length];
  const pr = primeP[r(2) % primeP.length];
  const ev = evenP[r(3) % evenP.length];
  const pairs = ordered(`agcop:${seed}`, [cp, o, pr, ev].map((p) => p.join(","))).map((s) => s.split(",").map(Number) as Pair);
  const at = (p: Pair) => pairs.findIndex((q) => q[0] === p[0] && q[1] === p[1]);
  return { pairs, right: at(cp), odd: at(o), prime: at(pr) };
}

// ---------------------------------------------------------------- writing an expression for a situation (agwrite)
/** For each situation (the agbod everyday forms), the right expression and two that a learner often writes instead. */
const WRITE: ((a: number, b: number, c: number) => string[])[] = [
  (a, b, c) => [`${a} + ${b} × ${c}`, `(${a} + ${b}) × ${c}`, `${a} × ${b} + ${c}`, `${a} + ${b} + ${c}`],
  (a, b, c) => [`${a} − ${b} × ${c}`, `(${a} − ${b}) × ${c}`, `${a} − ${b} − ${c}`, `${a} − ${b} + ${c}`],
  (a, b, c) => [`(${a} + ${b}) × ${c}`, `${a} + ${b} × ${c}`, `${a} × ${b} + ${c}`, `${a} + ${b} + ${c}`],
  (a, b, c) => [`${a} − ${b} + ${c}`, `${a} − (${b} + ${c})`, `${a} + ${b} − ${c}`, `${a} − ${b} − ${c}`],
  (a, b, c) => [`${a} + ${b} ÷ ${c}`, `(${a} + ${b}) ÷ ${c}`, `${a} + ${c} ÷ ${b}`, `${a} × ${b} ÷ ${c}`],
  (a, b, c) => [`${a} × (${b} − ${c})`, `${a} × ${b} − ${c}`, `${a} × ${c} − ${b}`, `(${a} − ${c}) × ${b}`],
];
/** The story's answer by acting it out step by step (independent of any expression). */
function story(f: number, a: number, b: number, c: number): number {
  let n = a;
  if (f === 0) for (let i = 0; i < b; i++) n += c;
  else if (f === 1) for (let i = 0; i < b; i++) n -= c;
  else if (f === 2) {
    n = 0;
    for (let i = 0; i < c; i++) n += a + b;
  } else if (f === 3) n = a - b + c;
  else if (f === 4) {
    let share = 0;
    for (let left = b; left >= c; left -= c) share++;
    n = a + share;
  } else {
    n = 0;
    for (let i = 0; i < a; i++) n += b - c;
  }
  return n;
}
const writeOk = ([f, a, b, c]: number[]) => {
  if (f < 0 || f > 5 || a < 2 || a > 40 || b < 2 || b > 12 || c < 2 || c > 12) return false;
  if ((f === 1 && a <= b * c) || (f === 3 && a <= b + c) || (f === 4 && b % c !== 0) || (f === 5 && b <= c)) return false;
  const opts = WRITE[f](a, b, c);
  const vals = opts.map(evalText);
  // every wrong expression must give a different value (so only the right one fits the story) and stay a whole number ≥ 0
  return Number.isInteger(vals[0]) && vals[0] >= 0 && vals.every((v, i) => Number.isFinite(v) && (i === 0 || Math.abs(v - vals[0]) > 1e-9)) && new Set(opts).size === 4;
};

// ---------------------------------------------------------------- terms of an expression (agterm)
type Term = { text: string; value: number; nums: number };
/** An expression of 3 or 4 terms for a seed: whole numbers, products, quotients and bracketed products. */
function termExpr(seed: number): { terms: Term[]; signs: string[]; text: string } {
  const r = (k: number) => hm(`agterm:${seed}:${k}`);
  const n = 3 + (r(0) % 2);
  const terms: Term[] = [];
  for (let i = 0; i < n; i++) {
    const kind = r(10 + i) % 4;
    const p = 2 + (r(20 + i) % 9);
    const q = 2 + (r(30 + i) % 8);
    const s = 1 + (r(40 + i) % 6);
    if (kind === 0) terms.push({ text: String(p + q * 3), value: p + q * 3, nums: 1 });
    else if (kind === 1) terms.push({ text: `${p} × ${q}`, value: p * q, nums: 2 });
    else if (kind === 2) terms.push({ text: `${p * q} ÷ ${q}`, value: p, nums: 2 });
    else terms.push({ text: `(${p} + ${s}) × ${q}`, value: (p + s) * q, nums: 3 });
  }
  const signs = ["", ...Array.from({ length: n - 1 }, (_, i) => (r(50 + i) % 3 === 0 ? "−" : "+"))];
  // keep the value positive: the first term is made the largest
  terms.sort((x, y) => y.value - x.value);
  const text = terms.map((t, i) => (i === 0 ? t.text : `${signs[i]} ${t.text}`)).join(" ");
  return { terms, signs, text };
}
/** Split an expression at the + and − signs that are not inside brackets (an independent reading of its terms). */
function splitTerms(t: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of t) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if ((ch === "+" || ch === "−") && depth === 0 && cur.trim()) {
      out.push(cur.trim());
      cur = ch === "−" ? "−" : "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
const termOk = ([seed, ask]: number[]) => {
  if (seed < 0 || seed > 149 || ask < 0 || ask > 1) return false;
  const e = termExpr(seed);
  return e.terms.some((t) => t.nums > 1) && (ask === 0 || e.signs.slice(1).includes("−")) && evalText(e.text) > 0;
};
/** For ask 1: the term asked about (the first one with a minus sign in front). */
const termAsked = (seed: number) => termExpr(seed).signs.findIndex((s, i) => i > 0 && s === "−");

// ---------------------------------------------------------------- measurement with mixed units (agmeas)
const MEAS = [
  { big: "m", small: "cm", f: 100, thing: (A: string, y: number, op: number, nm: string) => (op ? `${nm} has a ribbon ${A} m long and cuts off ${y} cm to tie a gift. How long is the ribbon left, in metres?` : `${nm} joins a rope ${A} m long to another rope ${y} cm long. How long is the joined rope, in metres?`) },
  { big: "kg", small: "g", f: 1000, thing: (A: string, y: number, op: number, nm: string) => (op ? `A sack holds ${A} kg of rice. ${nm} takes out ${y} g to cook. How much rice is left in the sack, in kg?` : `${nm} buys ${A} kg of tomatoes and ${y} g of beans. What is the total mass, in kg?`) },
  { big: "km", small: "m", f: 1000, thing: (A: string, y: number, op: number, nm: string) => (op ? `The way from ${nm}'s house to the school is ${A} km. ${nm} has already walked ${y} m. How far is there still to go, in km?` : `${nm} cycles ${A} km to the market and then ${y} m more to the library. How far does ${nm} cycle altogether, in km?`) },
  { big: "L", small: "mL", f: 1000, thing: (A: string, y: number, op: number, nm: string) => (op ? `A can holds ${A} L of milk. ${nm} pours out ${y} mL for tea. How much milk is left, in litres?` : `${nm} pours ${A} L of water into a bucket and then adds ${y} mL more. How much water is in the bucket, in litres?`) },
];
// [ctx, A, y, op]: A tenths of the big unit (1.1 to 9.9), y × 25 of the small unit (cm) or y × 50 (g, m, mL)
const measY = (ctx: number, y: number) => y * (ctx === 0 ? 5 : 50);
const measOk = ([ctx, A, y, op]: number[]) => {
  if (ctx < 0 || ctx > 3 || A < 11 || A > 99 || A % 10 === 0 || y < 1 || y > 19 || (op !== 0 && op !== 1)) return false;
  const f = MEAS[ctx].f;
  const big = (A * f) / 10;
  const sm = measY(ctx, y);
  return sm < f && (op === 0 || big > sm);
};
const measAns = ([ctx, A, y, op]: number[]) => {
  const f = MEAS[ctx].f;
  const sm = measY(ctx, y);
  const tot = (A * f) / 10 + (op ? -sm : sm);
  return { units: tot, f, k: f === 100 ? 2 : 3 };
};

// ---------------------------------------------------------------- HCF and LCM in word problems (aghlw)
const HLW = [
  { hcf: true, text: (a: number, b: number, nm: string) => `${nm} has ${a} laddoos and ${b} jalebis for a party. All the plates must be the same: each plate gets the same number of laddoos and the same number of jalebis, with nothing left over. What is the greatest number of plates ${nm} can fill?` },
  { hcf: true, text: (a: number, b: number) => `Two pieces of cloth are ${a} cm and ${b} cm long. A tailor cuts both into pieces that are all the same length, as long as possible, with nothing left over. How long is each piece, in cm?` },
  { hcf: true, text: (a: number, b: number) => `A school has ${a} girls and ${b} boys going on a trip. They must be put into groups of the same size, each group all girls or all boys. What is the largest possible group size?` },
  { hcf: false, text: (a: number, b: number) => `At a railway junction, one train arrives every ${a} minutes and another every ${b} minutes. Both arrive together at 6 a.m. After how many minutes will they next arrive together?` },
  { hcf: false, text: (a: number, b: number, nm: string) => `${nm} wants to buy the same number of pencils and erasers. Pencils come in packets of ${a} and erasers in packets of ${b}. What is the smallest number of each ${nm} can buy, using full packets?` },
  { hcf: false, text: (a: number, b: number) => `Two runners go round a track. One takes ${a} minutes for a round and the other ${b} minutes. They start together. After how many minutes are they next at the starting point together?` },
];
const hlwOk = ([ctx, a, b]: number[]) => {
  if (ctx < 0 || ctx > 5 || a >= b) return false;
  if (HLW[ctx].hcf) return a >= 12 && b <= 96 && gcd(a, b) >= 3 && gcd(a, b) < a && b % a !== 0;
  return a >= 2 && b <= 30 && gcd(a, b) > 1 && b % a !== 0 && lcm(a, b) <= 180;
};

// ---------------------------------------------------------------- HCF × LCM = product (aghlp)
// [mode, g, x, y]: the numbers are g·x and g·y (x < y co-prime); mode 0: find the LCM; 1: find the second number; 2: find the HCF
const hlpOk = ([mode, g, x, y]: number[]) => mode >= 0 && mode <= 2 && g >= 2 && g <= 15 && x >= 1 && x < y && y <= 12 && gcd(x, y) === 1 && g * y <= 120 && !(x === 1 && mode === 2);

// ---------------------------------------------------------------- percent and decimal to fraction (agpfrac), fraction to decimal or percent (agfdec)
/** [mode, n, d]: mode 0 the percentage 100n/d %, mode 1 the decimal n/d; answer n/d in its simplest form (n/d reduced). */
const PFD = [2, 4, 5, 8, 10, 16, 20, 25, 40, 50];
const pfOk = ([mode, n, d]: number[]) => {
  if (mode < 0 || mode > 1 || !PFD.includes(d) || n < 1 || gcd(n, d) !== 1 || n === d) return false;
  if (mode === 0) return n < 2 * d && ((100 * n) % d === 0 || (1000 * n) % d === 0) && d !== 2;
  return n < d && d !== 2 && d !== 10;
};
const pfShown = ([mode, n, d]: number[]) => (mode === 0 ? `${String((100 * n) / d)}%` : String(n / d));
const fdOk = ([mode, n, d]: number[]) => (mode === 0 || mode === 1) && PFD.includes(d) && d !== 2 && d !== 10 && n >= 1 && n < 2 * d && n !== d && gcd(n, d) === 1;
/** The decimal of n/d by long division, digit by digit (exact for these denominators). */
function longDiv(n: number, d: number): string {
  const w = Math.floor(n / d);
  let r = n % d;
  let out = "";
  for (let i = 0; i < 6 && r; i++) {
    r *= 10;
    out += String(Math.floor(r / d));
    r %= d;
  }
  return out ? `${w}.${out}` : String(w);
}
function fdOpts([mode, n, d]: number[]) {
  const dec = longDiv(n, d);
  // a percentage is 100n ÷ d, divided out exactly with whole numbers (no floating-point × 100)
  const right = mode === 0 ? dec : `${longDiv(100 * n, d)}%`;
  const asDigits = mode === 0 ? `${n}.${d}` : `${n}${d}%`;
  const flip = mode === 0 ? longDiv(d, n).slice(0, 5) : `${d}.${n}%`;
  const tenth = mode === 0 ? longDiv(n, 10) : `${n}%`;
  const near = mode === 0 ? longDiv(Math.round((100 * n) / d) + 1, 100) : `${Math.round((100 * n) / d) + 1}%`;
  const set: string[] = [];
  for (const o of [right, asDigits, flip, tenth, near]) if (!set.includes(o) && set.length < 4) set.push(o);
  return { opts: ordered(`agfdec:${mode},${n},${d}`, set), right, asDigits, flip };
}

// ---------------------------------------------------------------- testing primality (agptest)
const isPr = (n: number) => {
  if (n < 2) return false;
  for (let k = 2; k < n; k++) if (n % k === 0) return false;
  return true;
};
const spf = (n: number) => {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
};
const ptOk = ([mode, n]: number[]) => (mode === 0 ? n >= 50 && n <= 999 && n % 2 === 1 && n % 5 !== 0 && isPr(n) : mode === 1 ? n >= 101 && n <= 999 && n % 2 === 1 && n % 3 !== 0 && n % 5 !== 0 && (spf(n) >= 7 || isPr(n)) : false);
const lastPrimeTest = (n: number) => {
  let best = 2;
  for (let p = 2; p * p <= n; p++) if (spf(p) === p) best = p;
  return best;
};

// ---------------------------------------------------------------- Euclid's division algorithm (agediv)
function euclidSteps(a: number, b: number): { a: number; b: number; q: number; r: number }[] {
  const out = [];
  let [x, y] = [a, b];
  while (y) {
    out.push({ a: x, b: y, q: Math.floor(x / y), r: x % y });
    [x, y] = [y, x % y];
  }
  return out;
}
const edOk = ([mode, a, b]: number[]) => mode >= 0 && mode <= 1 && b >= 20 && a > b && a <= 999 && a % b !== 0 && euclidSteps(a, b).length >= 3 && euclidSteps(a, b).length <= 6;

// ---------------------------------------------------------------- HCF and LCM from prime factorisations (agfta)
const PR3 = [2, 3, 5, 7];
/** [ask, e]: e encodes the exponents of 2, 3, 5, 7 in two numbers (0 … 3 each); ask 0 the HCF, 1 the LCM. */
const ftaExp = (e: number) => {
  const xs: number[] = [];
  let k = e;
  for (let i = 0; i < 8; i++) {
    xs.push(k % 4);
    k = Math.floor(k / 4);
  }
  return { a: xs.slice(0, 4), b: xs.slice(4) };
};
const fromExp = (ex: number[]) => ex.reduce((v, k, i) => v * PR3[i] ** k, 1);
const ftaText = (ex: number[]) =>
  ex
    .map((k, i) => (k === 0 ? "" : k === 1 ? String(PR3[i]) : `${PR3[i]}${"⁰¹²³"[k]}`))
    .filter(Boolean)
    .join(" × ");
const ftaOk = ([ask, e]: number[]) => {
  if (ask < 0 || ask > 1 || e < 0 || e >= 65536) return false;
  const { a, b } = ftaExp(e);
  const A = fromExp(a);
  const Bn = fromExp(b);
  const used = a.filter((x) => x).length >= 2 && b.filter((x) => x).length >= 2;
  // two different numbers up to 5000 sharing at least one prime, each with at least two primes, neither dividing the other,
  // and the 7s kept small
  return used && A !== Bn && A <= 5000 && Bn <= 5000 && gcd(A, Bn) > 1 && A % Bn !== 0 && Bn % A !== 0 && a[3] + b[3] <= 2 && a.some((x, i) => x !== b[i] && x && b[i]);
};

// ---------------------------------------------------------------- kinds of fractions (agclass)
const FKIND = ["a proper fraction", "an improper fraction", "a mixed number"];
const classOk = ([form, n, d]: number[]) => d >= 2 && d <= 12 && n >= 1 && (form === 0 ? n < d : form === 1 ? n >= d && n <= 3 * d : form === 2 ? n < d && gcd(n, d) === 1 : false) && (form === 2 || gcd(n, d) === 1 || n === d);
const classText = ([form, n, d]: number[]) => (form === 2 ? `${1 + ((n + d) % 4)} ${n}/${d}` : `${n}/${d}`);

// ---------------------------------------------------------------- expression trees (agtree)
type TNode = { op: string; l: TNode | number; r: TNode | number } | number;
const OPS = ["+", "−", "×"];
function treeOf(shape: number, seed: number): TNode {
  const r = (k: number) => hm(`agtree:${shape}:${seed}:${k}`);
  const num = (k: number) => 2 + (r(k) % 9);
  const op = (k: number) => OPS[r(k) % 3];
  const leaf = (k: number): TNode => ({ op: op(k), l: num(k + 1) + (op(k) === "−" ? 9 : 0), r: num(k + 2) });
  if (shape === 0) return { op: op(10), l: leaf(20), r: num(11) };
  if (shape === 1) return { op: op(10), l: num(11) + 20, r: leaf(30) };
  return { op: op(10), l: leaf(20), r: leaf(30) };
}
const tval = (t: TNode): number => (typeof t === "number" ? t : t.op === "+" ? tval(t.l) + tval(t.r) : t.op === "−" ? tval(t.l) - tval(t.r) : tval(t.l) * tval(t.r));
/** The expression the tree stands for, with brackets round every branch that is an operation (as a learner writes it). */
const tbr = (t: TNode, top = true): string => (typeof t === "number" ? String(t) : top ? `${tbr(t.l, false)} ${t.op} ${tbr(t.r, false)}` : `(${tbr(t.l, false)} ${t.op} ${tbr(t.r, false)})`);
/** The tree read flat, left to right, with no brackets. */
const tflat = (t: TNode): string => (typeof t === "number" ? String(t) : `${tflat(t.l)} ${t.op} ${tflat(t.r)}`);
const leftToRight = (s: string) => {
  const tok = s.split(" ");
  let v = Number(tok[0]);
  for (let i = 1; i < tok.length; i += 2) v = tok[i] === "+" ? v + Number(tok[i + 1]) : tok[i] === "−" ? v - Number(tok[i + 1]) : v * Number(tok[i + 1]);
  return v;
};
function treeTable(t: TNode): Visual {
  const rows: string[][] = [];
  const names = ["the top", "box P", "box Q"];
  let next = 1;
  const visit = (n: TNode, label: string) => {
    if (typeof n === "number") return;
    const sub = (c: TNode) => (typeof c === "number" ? String(c) : names[next++]);
    const L = sub(n.l);
    const R = sub(n.r);
    rows.push([label, n.op, L, R]);
    if (typeof n.l !== "number") visit(n.l, L);
    if (typeof n.r !== "number") visit(n.r, R);
  };
  visit(t, names[0]);
  return { type: "table", head: ["Box", "Operation", "Left branch", "Right branch"], rows };
}
/** The everyday form of a tree: a shop bill worked out in stages, each box a stage, told in the tree's left-to-right order. */
function treeWord(shape: number, seed: number): string {
  const t = treeOf(shape, seed) as { op: string; l: TNode; r: TNode };
  const r = (k: number) => hm(`agtreew:${shape}:${seed}:${k}`);
  const pick = <T,>(xs: T[], k: number) => xs[r(k) % xs.length];
  const box = (n: TNode) => n as { op: string; l: number; r: number };
  /** A box whose branches are numbers, as an amount of money. */
  const amt = (n: TNode, k: number) => {
    const b = box(n);
    if (b.op === "×") return `${b.l} ${pick(["pencils", "bananas", "samosas", "erasers", "toffee packets", "candles"], k)} at ₹${b.r} each`;
    if (b.op === "+") {
      const [x, y] = pick([["pen", "ruler"], ["cup of tea", "biscuit packet"], ["comb", "hair clip"], ["notebook", "sharpener"], ["bunch of coriander", "lemon"]], k);
      return `a ${x} for ₹${b.l} and a ${y} for ₹${b.r}`;
    }
    return `a ${pick(["toy car", "lunch box", "water bottle", "torch", "kite"], k)} priced ₹${b.l} with ₹${b.r} off`;
  };
  /** A box whose branches are numbers, as a number of children. */
  const cnt = (n: TNode) => {
    const b = box(n);
    return b.op === "×" ? `${b.l} rows of ${b.r} children` : b.op === "+" ? `${b.l} boys and ${b.r} girls` : `${b.l} children, but ${b.r} of them are absent`;
  };
  const N = name(seed + shape);
  const N2 = name(seed + shape + 5);
  const end = " (The table shows this working as a tree diagram.)";
  if (shape === 0) {
    const c = t.r as number;
    if (t.op === "+") return `${N} buys ${amt(t.l, 1)}, and also pays ₹${c} for a cloth bag. How much does ${N} pay in all, in rupees?${end}`;
    if (t.op === "−") return `${N} buys ${amt(t.l, 1)}, and a coupon then takes ₹${c} off the whole bill. How much does ${N} pay, in rupees?${end}`;
    return `${N} buys ${amt(t.l, 1)} every day, for ${c} days. How much does ${N} spend over the ${c} days, in rupees?${end}`;
  }
  if (shape === 1) {
    const n = t.l as number;
    if (t.op === "+") return `${N} already owes a shopkeeper ₹${n}, and now buys ${amt(t.r, 2)} on credit as well. How much does ${N} owe now, in rupees?${end}`;
    if (t.op === "−") return `${N} has ₹${n} and buys ${amt(t.r, 2)}. How much money is left, in rupees?${end}`;
    return `For each of ${n} children, a teacher buys the same gift: ${amt(t.r, 2)}. How much is spent on the gifts in all, in rupees?${end}`;
  }
  if (t.op === "+") return `${N} buys ${amt(t.l, 1)}. ${N2} buys ${amt(t.r, 2)}. How much do they pay together, in rupees?${end}`;
  if (t.op === "−") return `${N} buys ${amt(t.l, 1)}. ${N2} buys ${amt(t.r, 2)}. How many rupees more does ${N} pay than ${N2}?${end}`;
  return `For a class outing, every child who goes pays for ${amt(t.l, 1)}. The class has ${cnt(t.r)}, and every child present goes. How many rupees are collected?${end}`;
}
const treeOk = ([shape, seed]: number[]) => {
  if (shape < 0 || shape > 2 || seed < 0 || seed > 79) return false;
  const t = treeOf(shape, seed);
  const v = tval(t);
  const sub = (n: TNode) => typeof n === "number" || tval(n) > 0;
  return v > 0 && v <= 500 && typeof t !== "number" && sub(t.l) && sub(t.r) && leftToRight(tflat(t)) !== v;
};

const WRITE_SAYS: [string, string][] = [
  ["Brackets were put round the first two numbers, so the marbles already there were multiplied too. Only the packets are multiplied: the packets × the marbles in each, then add what was there at the start.", "The numbers were joined in the order they appear in the story. The marbles at the start are added on; it is the number of packets that multiplies the marbles in each packet."],
  ["Brackets were put round the first two numbers, so the money was multiplied as well. Only the pens are multiplied (number of pens × cost of each), and that total is taken from the money.", "Only one pen's cost was taken away. All the pens cost the number of pens × the cost of each."],
  ["The brackets were left out, so only the blue chairs were multiplied by the number of rows. Each row has BOTH colours, so add them first, inside brackets, then multiply.", "The numbers were joined in the order they appear in the story. Each row has red + blue chairs, and there are that many rows."],
  ["The people getting on were taken away too. People get off (take away), then others get on (add): left to right, with no brackets.", "The getting on and getting off were swapped round. Those who get off are taken away and those who get on are added."],
  ["Brackets were put round the stickers already there and the packet, so they were all shared. Only the packet is shared out: packet ÷ friends, then add.", "The division was written the wrong way round. The packet's stickers are divided by the number of friends."],
  ["The mangoes taken out were taken away only once. They are taken from EVERY box, so take them from each box first (inside brackets), then multiply by the number of boxes.", "The numbers were mixed up: it is the mangoes in each box, minus those taken out, that is multiplied by the number of boxes."],
];

B07.push(
  // ================================================================ fractions beyond 1 on a number line
  {
    id: "agnl",
    arity: 2,
    title: "Fractions greater than 1 on a number line",
    competency: MIX,
    type: "mixed",
    mc: true,
    // [n, d]: n jumps of 1/d from 0
    parse: none,
    reject: (p) => (nlOk(p) ? null : "Jumps of 1/2 to 1/8, more than one whole and less than 5, up to 32 jumps, not landing on a whole number."),
    prompt: ([n, d]) => `Meena starts at 0 and makes ${n} equal jumps of 1/${d} along the number line in the picture. At which number does she land? Write it as a mixed number in its simplest form (for example 2 1/3).`,
    solve: ([n, d]) => ({ steps: [{ id: "count", op: "multiply", competency: MIX, inputs: [n, `1/${d}`], value: `${n}/${d}` }, { id: "mixed", op: "convert", competency: MIX, inputs: [n, d], value: mixedOf(n, d) }], answer: mixedOf(n, d) }),
    // independent: add 1/d again and again, counting whole ones as they fill up, and check the form is simplest
    validate: ([n, d], v) => {
      const m = String(v).match(/^(\d+) (\d+)\/(\d+)$/);
      if (!m) return false;
      const [w, r, den] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (r < 1 || r >= den || gcd(r, den) !== 1) return false;
      let wholes = 0;
      let parts = 0;
      for (let i = 0; i < n; i++) {
        parts++;
        if (parts === d) {
          wholes++;
          parts = 0;
        }
      }
      return wholes === w && parts * den === r * d;
    },
    bugs: ([n, d]) => {
      const w = Math.floor(n / d);
      const r = n % d;
      return [
        Bg("counted-start", "procedural", MIX, "The starting point 0 was counted as a jump. Count the jumps (the arcs), not the marks they start and end on.", mixedOf(n + 1, d) === mixedOf(n, d) || (n + 1) % d === 0 ? null : mixedOf(n + 1, d)),
        Bg("jumps-as-wholes", "conceptual", MIX, `Each jump was counted as 1 whole. Each jump is only 1/${d}: ${d} jumps make 1 whole.`, String(n)),
        ...(gcd(r, d) > 1 ? [Bg("not-simplest", "procedural", MIX, `${w} ${r}/${d} is the right amount but not in its simplest form: ${r}/${d} = ${r / gcd(r, d)}/${d / gcd(r, d)}.`, `${w} ${r}/${d}`)] : []),
      ];
    },
    distractors: ([n, d]) => [mixedOf(n + d, d), mixedOf(Math.max(d + 1, n - 1), d), `${Math.floor(n / d) + 1} ${1}/${d}`].filter((x) => x !== mixedOf(n, d)),
    variants: () => [],
    explain: (st) => (st.id === "count" ? `${st.inputs[0]} jumps of ${st.inputs[1]} take her to ${st.value}` : `${st.inputs[0]}/${st.inputs[1]} = ${st.value}: count the whole ones (each is ${st.inputs[1]} jumps) and the jumps left over`),
    domain: [[3, 32], [2, 8]],
    keep: nlOk,
    difficulty: ([n, d]) => (d <= 4 && n < 3 * d ? 1 : gcd(n % d, d) > 1 ? 3 : 2),
    figure: ([n, d]) => ({ type: "numberline", from: 0, to: Math.ceil(n / d), step: 1, jumps: Array.from({ length: n }, (_, i) => [i / d, (i + 1) / d]) }),
    word: ([n, d]) => `A snail crawls 1/${d} of a metre every minute along a straight garden path. How far from its start is it after ${n} minutes? Write the distance in metres as a mixed number in its simplest form.`,
    teach: {
      idea: "On a number line every whole is cut into equal parts. A fraction greater than 1 lies beyond 1: its whole-number part says how many wholes are passed, and the fraction part how far into the next whole.",
      method: "Count the jumps: that many parts is (jumps)/(parts in a whole). Take out the whole ones (each is one full set of parts) and write the rest as the fraction part; simplify it.",
      visual: ([n, d]) => ({ type: "numberline", from: 0, to: Math.ceil(n / d), step: 1, marks: [n / d] }),
      alternatives: [
        { id: "count_by_wholes", title: "Count whole by whole", kind: "procedural", text: ["Every whole on the line holds the same number of jumps (the denominator).", "Count how many wholes the jumps fill, then count the jumps past the last whole number."] },
        { id: "fraction_strips", title: "Use fraction strips", kind: "conceptual", text: ["Lay strips of 1/d end to end along a ruler marked in whole units.", "Where the last strip ends is the number: wholes, and a part of the next whole."], visual: ([, d]) => ({ type: "grid", rows: 2, cols: d, shaded: d + 1 }) },
      ],
    },
    limits: "Fractions from 1 to 5 with denominators 2 to 8, read from jumps on a number line; marking a point on a drawn line is an educator-marked task.",
  },
  // ================================================================ co-prime numbers
  {
    id: "agcop",
    arity: 1,
    title: "Which pair of numbers is co-prime?",
    competency: HL,
    type: "choice",
    parse: none,
    reject: ([s]) => (s < 0 || s > 159 ? "Sets of four pairs of numbers up to 75." : null),
    choices: ([s]) => copSet(s).pairs.map(([a, b]) => `${a} and ${b}`),
    prompt: () => "Two numbers are co-prime when their only common factor is 1. Which pair of numbers is co-prime?",
    solve: ([s]) => {
      const { pairs, right } = copSet(s);
      return { steps: pairs.map(([a, b], i) => ({ id: `pair${i}`, op: "hcf", competency: HL, inputs: [a, b], value: gcd(a, b) })), answer: right };
    },
    // independent: list the common factors of each pair by trying every number from 2 up; exactly the chosen pair has none
    validate: ([s], v) => {
      const { pairs } = copSet(s);
      const noCommon = (a: number, b: number) => {
        for (let k = 2; k <= Math.min(a, b); k++) if (a % k === 0 && b % k === 0) return false;
        return true;
      };
      return typeof v === "number" && pairs.filter(([a, b]) => noCommon(a, b)).length === 1 && !!pairs[v] && noCommon(pairs[v][0], pairs[v][1]);
    },
    bugs: ([s]) => {
      const { pairs, odd, prime } = copSet(s);
      const [o1, o2] = pairs[odd];
      const [p1, p2] = pairs[prime];
      return [
        Bg("odd-means-coprime", "conceptual", HL, `Two odd numbers were taken to have no common factor. Odd numbers have no factor 2, but they can share another one: ${o1} and ${o2} are both divisible by ${gcd(o1, o2)}.`, odd),
        Bg("prime-means-coprime", "conceptual", HL, `A pair with a prime number in it was taken to be co-prime. A prime has no factors except 1 and itself, but it can still divide the other number: ${p2} = ${p1} × ${p2 / p1}.`, prime),
      ];
    },
    variants: () => [],
    explain: (st) => `HCF of ${st.inputs[0]} and ${st.inputs[1]} is ${st.value}${st.value === 1 ? ": co-prime" : ""}`,
    domain: [[0, 159]],
    keep: ([s]) => firstSeeds("agcop", 160, (k) => copSet(k).pairs.map((p) => p.join(",")).join(";")).has(s),
    difficulty: ([s]) => (copSet(s).pairs[copSet(s).right][0] % 2 === 0 ? 2 : 3),
    teach: {
      idea: "Co-prime numbers have no common factor except 1, so their HCF is 1. Neither number needs to be prime: 8 and 15 are co-prime, but 9 and 15 are not.",
      method: "For each pair, test the small primes 2, 3, 5, 7, … : if one of them divides both numbers, the pair is not co-prime. If none does, it is.",
      alternatives: [
        { id: "factor_lists", title: "Compare factor lists", kind: "procedural", text: ["List the factors of both numbers.", "If 1 is the only number in both lists, they are co-prime."] },
        { id: "prime_factors", title: "Look at prime factors", kind: "conceptual", text: ["Write each number as a product of primes: 8 = 2 × 2 × 2, 15 = 3 × 5.", "No prime appears in both, so they are co-prime."] },
      ],
    },
    limits: "Choosing the co-prime pair among four pairs up to 75; explaining why is an educator-marked task.",
  },
  // ================================================================ writing an expression for a situation
  {
    id: "agwrite",
    arity: 4,
    title: "Writing an expression for a situation",
    competency: OOO,
    type: "choice",
    // [f, a, b, c]: the situation of shape f (as in agbod) with numbers a, b, c
    parse: none,
    reject: (p) => (writeOk(p) ? null : "Six kinds of situation with numbers that keep every expression a whole number, and different values for different expressions."),
    choices: ([f, a, b, c]) => ordered(`agwrite:${f},${a},${b},${c}`, WRITE[f](a, b, c)),
    prompt: (p) => `${(B07.find((d) => d.id === "agbod")!.word as (q: number[]) => string)(p)} Which expression gives the answer?`,
    solve: ([f, a, b, c]) => {
      const opts = ordered(`agwrite:${f},${a},${b},${c}`, WRITE[f](a, b, c));
      const right = WRITE[f](a, b, c)[0];
      return { steps: [{ id: "write", op: "model", competency: OOO, inputs: [f], value: right }, { id: "value", op: "evaluate", competency: OOO, inputs: [right], value: evalText(right) }], answer: opts.indexOf(right) };
    },
    // independent: act the story out step by step, then evaluate every option; only the chosen one may give that number
    validate: ([f, a, b, c], v) => {
      const opts = ordered(`agwrite:${f},${a},${b},${c}`, WRITE[f](a, b, c));
      const want = story(f, a, b, c);
      return typeof v === "number" && opts.filter((o) => evalText(o) === want).length === 1 && evalText(opts[v]) === want;
    },
    bugs: ([f, a, b, c]) => {
      const all = WRITE[f](a, b, c);
      const opts = ordered(`agwrite:${f},${a},${b},${c}`, all);
      return [Bg("brackets", "conceptual", OOO, WRITE_SAYS[f][0], opts.indexOf(all[1])), Bg("order-of-story", "procedural", OOO, WRITE_SAYS[f][1], opts.indexOf(all[2]))];
    },
    variants: () => [],
    explain: (st) => (st.id === "write" ? `The story is ${st.value}` : `${st.inputs[0]} = ${st.value}`),
    domain: [[0, 5], [2, 40], [2, 12], [2, 12]],
    keep: writeOk,
    cap: 360,
    difficulty: ([f]) => (f === 0 || f === 3 ? 1 : f === 2 || f === 5 ? 3 : 2),
    word: (p) => `${(B07.find((d) => d.id === "agbod")!.word as (q: number[]) => string)(p)} ${name(p[1] + 2)} wants to write the whole working as one expression in a notebook, worked out by the usual order of operations. Which expression should ${name(p[1] + 2)} write?`,
    teach: {
      idea: "An expression is the story written in numbers and signs. Brackets show what must be worked out first; without brackets, × and ÷ are done before + and −.",
      method: "Say the story in steps: what is there at the start, what is added or taken away, what is repeated. Write each step, and put brackets round anything that must happen before a multiplication.",
      alternatives: [
        { id: "check_value", title: "Check with the story's answer", kind: "procedural", text: ["Work the story out step by step without any expression.", "Evaluate each option (brackets first, then × and ÷, then + and −); the one that gives the story's answer is right."] },
        { id: "tree", title: "Draw the story as a tree", kind: "conceptual", text: ["The last step of the story goes at the top of the tree; what it uses hangs below as branches.", "Read the tree back as an expression, with brackets round each branch that is an operation."] },
      ],
    },
    limits: "Six kinds of one- and two-step situations with three numbers; writing an expression from scratch, and longer stories, are educator-marked tasks.",
  },
  // ================================================================ terms of an expression
  {
    id: "agterm",
    arity: 2,
    title: "The terms of an expression",
    competency: OOO,
    type: "integer",
    mc: true,
    // [seed, ask]: an expression of 3 or 4 terms; ask 0: how many terms; ask 1: the value of the first term after a minus sign
    parse: none,
    reject: (p) => (termOk(p) ? null : "Expressions of 3 or 4 terms with products, quotients or brackets."),
    prompt: ([seed, ask]) => {
      const e = termExpr(seed);
      return ask === 0 ? `How many terms does the expression ${e.text} have?` : `In the expression ${e.text}, what is the value of the ${["first", "second", "third", "fourth"][termAsked(seed)]} term? (A term after a minus sign is negative: give its sign.)`;
    },
    solve: ([seed, ask]) => {
      const e = termExpr(seed);
      if (ask === 0) return { steps: [{ id: "split", op: "split", competency: OOO, inputs: [e.text], value: e.terms.map((t, i) => (i === 0 ? t.text : `${e.signs[i]}${t.text}`)).join(" | ") }, { id: "count", op: "count", competency: OOO, inputs: [e.terms.length], value: e.terms.length }], answer: e.terms.length };
      const k = termAsked(seed);
      return { steps: [{ id: "term", op: "split", competency: OOO, inputs: [e.text], value: `−${e.terms[k].text}` }, { id: "value", op: "evaluate", competency: OOO, inputs: [`−(${e.terms[k].text})`], value: -e.terms[k].value }], answer: -e.terms[k].value };
    },
    // independent: read the written expression, cut it at the + and − signs outside brackets, and evaluate the piece
    validate: ([seed, ask], v) => {
      const pieces = splitTerms(termExpr(seed).text);
      if (ask === 0) return v === pieces.length;
      const piece = pieces[termAsked(seed)];
      return piece.startsWith("−") && typeof v === "number" && Math.abs(evalText(piece.replace(/^−\s*/, "-(") + ")") - v) < 1e-9;
    },
    bugs: ([seed, ask]) => {
      const e = termExpr(seed);
      if (ask === 0) {
        const nums = e.terms.reduce((s, t) => s + t.nums, 0);
        const br = e.terms.length + e.terms.filter((t) => t.nums === 3).length;
        return [
          Bg("counted-numbers", "conceptual", OOO, "The numbers were counted. A term is a part joined to the rest by + or −; a product like 4 × 3 is one term.", nums === e.terms.length ? null : nums),
          Bg("split-brackets", "procedural", OOO, "The + inside a bracket was taken to start a new term. A bracket is worked out as one piece, so (5 + 2) × 3 is a single term.", br === e.terms.length || br === nums ? null : br),
        ];
      }
      const t = e.terms[termAsked(seed)];
      const first = Number(t.text.replace(/[()]/g, "").split(" ")[0]);
      return [
        Bg("sign-dropped", "conceptual", OOO, "The minus sign in front was left off. The term includes its sign: after a minus sign the term is negative.", t.value),
        Bg("first-number", "procedural", OOO, `Only the first number of the term was taken. The term is everything up to the next + or − outside brackets: ${t.text}.`, first === t.value ? null : -first),
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "split" ? `Cut at each + and − outside brackets: ${st.value}` : st.id === "count" ? `${st.value} terms` : st.id === "term" ? `The term is ${st.value}` : `${st.inputs[0]} = ${st.value}`),
    domain: [[0, 149], [0, 1]],
    keep: (p) => termOk(p) && firstSeeds("agterm", 150, (k) => termExpr(k).text).has(p[0]),
    difficulty: ([seed, ask]) => (ask === 0 ? (termExpr(seed).terms.some((t) => t.nums === 3) ? 2 : 1) : 3),
    teach: {
      idea: "The terms of an expression are the parts joined by + and − (outside brackets). Each term carries the sign in front of it: 20 − 3 × 4 + 6 is 20 + (−12) + 6, with terms 20, −3 × 4 and 6.",
      method: "Read along the expression and cut it at every + and − that is not inside brackets. Each piece, with the sign before it, is a term; work out each term on its own.",
      alternatives: [
        { id: "underline", title: "Underline each term", kind: "procedural", text: ["Underline each piece between the + and − signs; a whole bracket and whatever multiplies it stays in one piece.", "Count the underlined pieces, and write the sign in front of each."] },
        { id: "money", title: "Think of money in and out", kind: "conceptual", text: ["Each term is one amount of money: + means money coming in, − money going out.", "4 × 3 after a minus sign is one payment of ₹12 going out: the term −12."] },
      ],
    },
    limits: "Expressions of 3 or 4 terms with whole numbers, products, quotients and one kind of bracket.",
  },
  // ================================================================ measurement problems with two units
  {
    id: "agmeas",
    arity: 4,
    title: "Measurement problems with two units (m and cm, kg and g, km and m, L and mL)",
    competency: DEC,
    type: "fraction",
    mc: true,
    decimals: true,
    // [ctx, A, y, op]: A tenths of the larger unit; y × 5 cm, or y × 50 g, m or mL; op 0 add, 1 take away
    parse: none,
    reject: (p) => (measOk(p) ? null : "1.1 to 9.9 of the larger unit and up to 95 cm or 950 g, m or mL, added or taken away."),
    prompt: ([ctx, A, y, op]) => MEAS[ctx].thing(dec(A, 1), measY(ctx, y), op, name(A + y)),
    solve: (p) => {
      const [ctx, A, y, op] = p;
      const { units: u, f, k } = measAns(p);
      const sm = measY(ctx, y);
      return {
        steps: [
          { id: "convert", op: "convert", competency: "MATH.measurement.unit-conversions", inputs: [sm, MEAS[ctx].small, f, MEAS[ctx].big], value: dec(sm, k) },
          { id: "combine", op: op ? "subtract" : "add", competency: DEC, inputs: [dec(A, 1), dec(sm, k), op ? "−" : "+"], value: dec(u, k) },
        ],
        answer: dec(u, k),
      };
    },
    // independent: change the answer back into the smaller unit and undo the adding or taking away
    validate: ([ctx, A, y, op], v) => {
      const f = MEAS[ctx].f;
      const u = units(v, f === 100 ? 2 : 3);
      if (u === null) return false;
      const big = (A * f) / 10;
      const sm = measY(ctx, y);
      return op ? u + sm === big : u - sm === big;
    },
    bugs: (p) => {
      const [ctx, A, y, op] = p;
      const { f, units: u } = measAns(p);
      const sm = measY(ctx, y);
      const asBig = op ? A / 10 - sm : A / 10 + sm;
      const wrongF = f === 1000 ? 100 : 1000;
      const slip = A / 10 + (op ? -1 : 1) * (sm / wrongF);
      const r = (x: number) => String(Math.round(x * 1e6) / 1e6);
      return [
        Bg("units-not-matched", "conceptual", DEC, `${sm} ${MEAS[ctx].small} was ${op ? "taken from" : "added to"} ${dec(A, 1)} ${MEAS[ctx].big} as if they were the same unit. Change ${MEAS[ctx].small} into ${MEAS[ctx].big} first: ${sm} ${MEAS[ctx].small} = ${dec(sm, f === 100 ? 2 : 3)} ${MEAS[ctx].big}.`, asBig > 0 ? r(asBig) : null),
        Bg("wrong-factor", "recall", "MATH.measurement.unit-conversions", `The ${MEAS[ctx].small} were changed into ${MEAS[ctx].big} by dividing by ${wrongF}. 1 ${MEAS[ctx].big} = ${f} ${MEAS[ctx].small}, so divide by ${f}.`, slip > 0 && Math.abs(slip * f - u) > 1e-6 ? r(slip) : null),
      ];
    },
    distractors: (p) => {
      const { units: u, f } = measAns(p);
      return [u + f / 10, u - f / 10, u + f].filter((x) => x > 0).map((x) => String(Math.round((x / f) * 1e6) / 1e6));
    },
    variants: () => [],
    explain: (st) => (st.id === "convert" ? `${st.inputs[0]} ${st.inputs[1]} = ${st.inputs[0]} ÷ ${st.inputs[2]} = ${st.value} ${st.inputs[3]}` : `${st.inputs[0]} ${st.inputs[2]} ${st.inputs[1]} = ${st.value}, with the decimal points lined up`),
    domain: [[0, 3], [11, 99], [1, 19], [0, 1]],
    keep: measOk,
    cap: 400,
    difficulty: ([ctx, , , op]) => (ctx === 0 && op === 0 ? 1 : op === 0 ? 2 : 3),
    teach: {
      idea: "Only amounts in the same unit can be added or taken away. 1 m = 100 cm, and 1 kg = 1000 g, 1 km = 1000 m, 1 L = 1000 mL, so the smaller unit becomes a decimal of the larger one.",
      method: "Change the amount in the smaller unit into the larger unit (divide by 100 or 1000), line up the decimal points, then add or subtract.",
      alternatives: [
        { id: "all_small", title: "Work in the smaller unit", kind: "procedural", text: ["Change both amounts into the smaller unit: 2.5 kg = 2500 g.", "Add or subtract the whole numbers, then change back: 2500 g + 750 g = 3250 g = 3.25 kg."] },
        { id: "place_value", title: "Use a place-value table", kind: "conceptual", text: ["Write the amounts in a table with columns ones, tenths, hundredths, thousandths of the larger unit.", "750 g is 0.750 kg: the 7 goes in the tenths column."] },
      ],
    },
    limits: "Two amounts, one in each unit, added or taken away; three or more amounts and changes from the larger into the smaller unit are other families.",
  },
  // ================================================================ LCM of three numbers
  {
    id: "aglcm3",
    arity: 3,
    title: "The lowest common multiple of three numbers",
    competency: HL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c]) => (a < 2 || a >= b || b >= c || c > 20 || lcm3(a, b, c) > 420 || lcm3(a, b, c) === c ? "Three numbers from 2 to 20, in increasing order, whose LCM is at most 420 and more than the largest." : null),
    prompt: ([a, b, c]) => `What is the lowest common multiple (LCM) of ${a}, ${b} and ${c}?`,
    solve: ([a, b, c]) => ({ steps: [{ id: "two", op: "lcm", competency: HL, inputs: [a, b], value: lcm(a, b) }, { id: "three", op: "lcm", competency: HL, inputs: [lcm(a, b), c], value: lcm3(a, b, c) }], answer: lcm3(a, b, c) }),
    // independent: go up the multiples of the largest number until the other two both divide it
    validate: ([a, b, c], v) => {
      let m = c;
      while (m % a !== 0 || m % b !== 0) m += c;
      return v === m;
    },
    bugs: ([a, b, c]) => {
      const L = lcm3(a, b, c);
      return [
        Bg("product", "conceptual", HL, `${a} × ${b} × ${c} is a common multiple, but the numbers share factors, so a smaller one comes first.`, a * b * c === L ? null : a * b * c),
        Bg("two-only", "procedural", HL, `This is the LCM of ${b} and ${c} only. Check that ${a} divides it too.`, lcm(b, c) === L ? null : lcm(b, c)),
        Bg("hcf-for-lcm", "conceptual", HL, "A common factor was found. The LCM is the smallest number that all three divide into: it is never smaller than the largest number.", gcd(gcd(a, b), c)),
        Bg("common-not-lowest", "procedural", HL, "A common multiple was found, but not the lowest. Check the smaller multiples first.", 2 * L),
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "two" ? `LCM of ${st.inputs[0]} and ${st.inputs[1]} is ${st.value}` : `LCM of ${st.inputs[0]} and ${st.inputs[1]} is ${st.value}`),
    domain: [[2, 18], [3, 19], [4, 20]],
    keep: ([a, b, c]) => a < b && b < c && lcm3(a, b, c) <= 420 && lcm3(a, b, c) !== c,
    cap: 400,
    difficulty: ([a, b, c]) => (lcm3(a, b, c) <= 60 ? 1 : lcm3(a, b, c) <= 180 ? 2 : 3),
    word: ([a, b, c]) => `Three temple bells ring together at 6 o'clock in the morning. After that, one rings every ${a} minutes, one every ${b} minutes and one every ${c} minutes. After how many minutes will all three next ring together?`,
    teach: {
      idea: "The LCM of three numbers is the smallest number in all three times tables.",
      method: "Find the LCM of two of the numbers, then the LCM of that and the third. Or go up the times table of the largest number until the other two both divide it.",
      alternatives: [
        { id: "ladder", title: "Divide all three together", kind: "procedural", text: ["Divide by a prime that divides at least two of the numbers; write the quotients (and copy any number it does not divide).", "Repeat until no two numbers share a factor; multiply all the divisors and the numbers left at the bottom."] },
        { id: "prime_powers", title: "Highest powers of primes", kind: "procedural", text: ["Write each number as a product of primes.", "Take each prime as many times as it appears in the number that has most of it, and multiply."] },
      ],
    },
    limits: "Three numbers from 2 to 20 with LCM up to 420.",
  },
  // ================================================================ HCF or LCM? word problems
  {
    id: "aghlw",
    arity: 3,
    title: "Sharing, grouping and timing problems: HCF or LCM?",
    competency: HL,
    type: "integer",
    mc: true,
    // [ctx, a, b]: situation HLW[ctx]; the first three need the HCF, the last three the LCM
    parse: none,
    reject: (p) => (hlwOk(p) ? null : "Sharing and cutting problems with numbers up to 96 (HCF), timing and buying problems with numbers up to 30 (LCM)."),
    prompt: ([ctx, a, b]) => HLW[ctx].text(a, b, name(a + b)),
    solve: ([ctx, a, b]) => (HLW[ctx].hcf ? { steps: [{ id: "decide", op: "choose", competency: HL, inputs: ["HCF"], value: "HCF" }, { id: "hcf", op: "hcf", competency: HL, inputs: [a, b], value: gcd(a, b) }], answer: gcd(a, b) } : { steps: [{ id: "decide", op: "choose", competency: HL, inputs: ["LCM"], value: "LCM" }, { id: "lcm", op: "lcm", competency: HL, inputs: [a, b], value: lcm(a, b) }], answer: lcm(a, b) }),
    // independent: try every possible answer in turn (largest equal share, or first time both fit) and keep the first that works
    validate: ([ctx, a, b], v) => {
      if (HLW[ctx].hcf) {
        for (let k = a; k >= 1; k--) if (a % k === 0 && b % k === 0) return v === k;
        return false;
      }
      for (let m = 1; m <= a * b; m++) if (m % a === 0 && m % b === 0) return v === m;
      return false;
    },
    bugs: ([ctx, a, b]) => {
      const g = gcd(a, b);
      if (HLW[ctx].hcf) {
        const small = [2, 3, 5, 7, 11].find((p) => g % p === 0)!;
        return [Bg("lcm-for-hcf", "conceptual", HL, "The LCM was found. Sharing or cutting into the greatest equal parts needs the greatest number that divides both: the HCF.", lcm(a, b)), Bg("a-common-factor", "procedural", HL, "A number that divides both was found, but not the greatest one.", small === g ? null : small)];
      }
      return [Bg("hcf-for-lcm", "conceptual", HL, "The HCF was found. Waiting until two repeating things happen together needs the smallest number both divide into: the LCM.", g), Bg("product", "procedural", HL, `${a} × ${b} is a common multiple, but ${a} and ${b} share the factor ${g}, so they meet sooner.`, a * b)];
    },
    variants: () => [],
    explain: (st) => (st.id === "decide" ? (st.value === "HCF" ? "The parts must divide both amounts exactly and be as large as possible: use the HCF" : "The two must happen together again as soon as possible: use the LCM") : `${st.op === "hcf" ? "HCF" : "LCM"} of ${st.inputs[0]} and ${st.inputs[1]} = ${st.value}`),
    domain: [[0, 5], [2, 95], [3, 96]],
    keep: hlwOk,
    cap: 400,
    difficulty: ([ctx, a, b]) => (HLW[ctx].hcf ? (b <= 40 ? 1 : 2) : lcm(a, b) <= 60 ? 2 : 3),
    teach: {
      idea: "Sharing or cutting into the biggest equal parts with nothing left over uses the HCF (it divides both). Waiting for two repeating events to happen together, or buying equal amounts in packets, uses the LCM (both divide it).",
      method: "Ask: is the answer smaller than the numbers (a part of them)? Then it is the HCF. Is it bigger (a time or amount both reach)? Then it is the LCM. Then work it out.",
      alternatives: [
        { id: "act_out", title: "Try it out", kind: "conceptual", text: ["For a timing problem, list the times each event happens: 6, 12, 18, … and 8, 16, 24, ….", "The first time in both lists is the answer. For sharing, try the number of plates from the biggest down."] },
        { id: "size_check", title: "Is the answer bigger or smaller?", kind: "procedural", text: ["Groups and pieces must fit INTO the amounts: the answer is at most the smaller number (HCF).", "Meeting times come AFTER both: the answer is at least the bigger number (LCM)."] },
      ],
    },
    limits: "Two-number sharing, cutting and grouping (HCF) and timing and packet (LCM) problems; three-number problems use aghcf3 and aglcm3.",
  },
  // ================================================================ HCF × LCM = product of the two numbers
  {
    id: "aghlp",
    arity: 4,
    title: "Using HCF × LCM = product of the two numbers",
    competency: HL,
    type: "integer",
    mc: true,
    // [mode, g, x, y]: the numbers g·x and g·y; mode 0: find the LCM; 1: find the second number; 2: find the HCF
    parse: none,
    reject: (p) => (hlpOk(p) ? null : "Two numbers g·x and g·y up to 120 (x and y co-prime) with HCF g."),
    prompt: ([mode, g, x, y]) => {
      const [A, Bn, L] = [g * x, g * y, g * x * y];
      return mode === 0 ? `The HCF of ${A} and ${Bn} is ${g}. Use HCF × LCM = product of the numbers to find their LCM.` : mode === 1 ? `Two numbers have HCF ${g} and LCM ${L}. One of the numbers is ${A}. Find the other number.` : `The LCM of ${A} and ${Bn} is ${L}. Use HCF × LCM = product of the numbers to find their HCF.`;
    },
    solve: ([mode, g, x, y]) => {
      const [A, Bn, L] = [g * x, g * y, g * x * y];
      if (mode === 0) return { steps: [{ id: "product", op: "multiply", competency: MT, inputs: [A, Bn], value: A * Bn }, { id: "divide", op: "divide", competency: HL, inputs: [A * Bn, g], value: L }], answer: L };
      if (mode === 1) return { steps: [{ id: "product", op: "multiply", competency: MT, inputs: [g, L], value: g * L }, { id: "divide", op: "divide", competency: HL, inputs: [g * L, A], value: Bn }], answer: Bn };
      return { steps: [{ id: "product", op: "multiply", competency: MT, inputs: [A, Bn], value: A * Bn }, { id: "divide", op: "divide", competency: HL, inputs: [A * Bn, L], value: g }], answer: g };
    },
    // independent: search directly (the smallest common multiple, the number whose HCF and LCM with A fit, the largest common factor)
    validate: ([mode, g, x, y], v) => {
      const [A, Bn, L] = [g * x, g * y, g * x * y];
      const hcfOf = (p: number, q: number) => {
        for (let k = Math.min(p, q); k >= 1; k--) if (p % k === 0 && q % k === 0) return k;
        return 1;
      };
      if (typeof v !== "number" || v < 1) return false;
      if (mode === 0) {
        let m = Bn;
        while (m % A !== 0) m += Bn;
        return v === m;
      }
      if (mode === 1) return L % v === 0 && hcfOf(A, v) === g && (A * v) / hcfOf(A, v) === L;
      return v === hcfOf(A, Bn);
    },
    bugs: ([mode, g, x, y]) => {
      const [A, Bn, L] = [g * x, g * y, g * x * y];
      if (mode === 0) return [Bg("product-is-lcm", "conceptual", HL, `The product ${A} × ${Bn} was given as the LCM. The product equals HCF × LCM, so divide it by the HCF, ${g}.`, A * Bn), Bg("hcf-times", "procedural", HL, `The HCF was multiplied by the product instead of dividing it into the product.`, A * Bn * g)];
      if (mode === 1) return [Bg("forgot-hcf", "procedural", HL, `The LCM was divided by ${A}, leaving out the HCF. HCF × LCM = ${A} × (other number), so the other number is ${g} × ${L} ÷ ${A}.`, L / A === Bn ? null : L / A), Bg("lcm-over-hcf", "procedural", HL, `The LCM was divided by the HCF. Use HCF × LCM ÷ (the number you know).`, L / g === Bn || L / g === L / A ? null : L / g)];
      return [Bg("lcm-over-number", "procedural", HL, `The LCM was divided by one number. The HCF is the product of the two numbers ÷ the LCM.`, L / A === g ? null : L / A), Bg("product-is-hcf", "conceptual", HL, "The product of the numbers was not divided by the LCM. HCF × LCM = product, so the HCF = product ÷ LCM.", A * Bn)];
    },
    variants: () => [],
    explain: (st) => (st.id === "product" ? `${st.inputs[0]} × ${st.inputs[1]} = ${st.value}` : `${st.inputs[0]} ÷ ${st.inputs[1]} = ${st.value}`),
    domain: [[0, 2], [2, 15], [1, 11], [2, 12]],
    keep: hlpOk,
    cap: 400,
    difficulty: ([mode]) => (mode === 0 ? 1 : mode === 2 ? 2 : 3),
    word: ([mode, g, x, y]) => {
      const [A, Bn, L] = [g * x, g * y, g * x * y];
      return mode === 0 ? `Two temple bells ring every ${A} and every ${Bn} seconds, and have just rung together. ${name(g)} knows that the HCF of ${A} and ${Bn} is ${g}. Using HCF × LCM = product of the two numbers, after how many seconds will the bells next ring together?` : mode === 1 ? `Two ropes have whole-number lengths in metres. The longest piece that measures both exactly is ${g} m, and the shortest length both measure exactly is ${L} m. One rope is ${A} m long. How long is the other rope, in metres?` : `Two ribbons, ${A} cm and ${Bn} cm long, are to be cut into pieces all of the same length, as long as possible, with nothing left over. ${name(g)} knows that ${L} cm is the smallest length that both ${A} and ${Bn} divide exactly. Using HCF × LCM = product of the two lengths, how long is each piece, in cm?`;
    },
    teach: {
      idea: "For two numbers, HCF × LCM = the product of the numbers: the common prime factors are counted once in the HCF and the rest in the LCM, so together they use every prime factor of both numbers exactly once.",
      method: "Write HCF × LCM = first number × second number, put in the three values you know, and divide to find the fourth.",
      alternatives: [
        { id: "check_example", title: "Check with a small example", kind: "conceptual", text: ["Take 4 and 6: HCF 2, LCM 12. 2 × 12 = 24 = 4 × 6.", "Use the same pattern with the numbers in the question."] },
        { id: "prime_split", title: "Split into prime factors", kind: "procedural", text: ["Write both numbers as products of primes; the HCF takes the shared primes, the LCM takes the rest of them as well.", "Multiplying HCF and LCM uses every prime of both numbers, the same as multiplying the numbers."] },
      ],
    },
    limits: "Two numbers up to 120; the rule does not hold for three numbers (not asked).",
  },
  // ================================================================ percentages and decimals as fractions
  {
    id: "agpfrac",
    arity: 3,
    title: "Writing a percentage or a decimal as a fraction in its simplest form",
    competency: PERC,
    type: "mixed",
    mc: true,
    // [mode, n, d]: mode 0: the percentage 100n/d %; mode 1: the decimal n/d; the answer is n/d (a mixed number when more than 1)
    parse: none,
    reject: (p) => (pfOk(p) ? null : "Percentages and decimals that are fractions with denominators 2 to 50 made of 2s and 5s."),
    prompt: (p) => `Write ${pfShown(p)} as a fraction in its simplest form. (If it is more than 1, write it as a mixed number, for example 1 1/4.)`,
    solve: ([mode, n, d]) => {
      const shown = pfShown([mode, n, d]);
      const places = mode === 0 ? (String((100 * n) / d).split(".")[1] ?? "").length : String(n / d).split(".")[1].length;
      const den = mode === 0 ? 100 * 10 ** places : 10 ** places;
      const num = Math.round((n / d) * den);
      return { steps: [{ id: "over", op: "rewrite", competency: mode === 0 ? PERC : DTEN, inputs: [shown], value: `${num}/${den}` }, { id: "simplify", op: "simplify", competency: "MATH.number.equivalent-fractions", inputs: [num, den, gcd(num, den)], value: mixedOf(n, d) }], answer: mixedOf(n, d) };
    },
    // independent: the fraction must be in simplest form, and dividing it out (long division) must give the number shown
    validate: ([mode, n, d], v) => {
      const f = readMixed(v);
      if (!f) return false;
      const m = String(v).match(/(\d+)\/(\d+)$/);
      if (m && (gcd(Number(m[1]), Number(m[2])) !== 1 || Number(m[1]) >= Number(m[2]))) return false;
      if (f[0] > f[1] && !/\s/.test(String(v).trim())) return false;
      const ld = longDiv(f[0] * (mode === 0 ? 100 : 1), f[1]);
      return mode === 0 ? `${ld}%` === pfShown([mode, n, d]) : ld === pfShown([mode, n, d]);
    },
    bugs: ([mode, n, d]) => {
      const shown = pfShown([mode, n, d]);
      const places = mode === 0 ? (String((100 * n) / d).split(".")[1] ?? "").length : String(n / d).split(".")[1].length;
      const den = mode === 0 ? 100 * 10 ** places : 10 ** places;
      const num = Math.round((n / d) * den);
      const digits = Number(shown.replace(/[.%]/g, "").replace(/^0+/, ""));
      return [
        Bg("not-simplified", "procedural", "MATH.number.equivalent-fractions", `${num}/${den} is right but not in its simplest form: divide the top and bottom by ${gcd(num, den)}.`, num > den ? null : `${num}/${den}`),
        mode === 0
          ? Bg("percent-as-tenths", "conceptual", PERC, `${shown} was written over 10. Per cent means out of 100: ${shown} = ${String((100 * n) / d)}/100.`, mixedOf(digits, 10 * 10 ** places) === mixedOf(n, d) ? null : mixedOf(digits, 10 * 10 ** places))
          : Bg("hundredths-always", "conceptual", DTEN, `Every decimal was put over 100. ${shown} has ${places} decimal place${places === 1 ? "" : "s"}, so it is ${num} over ${den}.`, places === 2 ? null : mixedOf(digits, 100)),
      ];
    },
    distractors: ([mode, n, d]) => [mixedOf(d, n), mixedOf(n + 1, d), mixedOf(n, d * 2)].filter((x) => x !== mixedOf(n, d)),
    variants: () => [],
    explain: (st) => (st.id === "over" ? `${st.inputs[0]} = ${st.value}` : `Divide the top and bottom by ${st.inputs[2]}: ${st.value}`),
    domain: [[0, 1], [1, 99], [2, 50]],
    keep: pfOk,
    difficulty: ([mode, n, d]) => (mode === 0 && (100 * n) % d === 0 && n < d ? 1 : n > d || (mode === 0 && (100 * n) % d !== 0) ? 3 : 2),
    word: (p) => {
      const [mode, n, d] = p;
      if (mode === 1) return `A water tank is ${pfShown(p)} full, says its gauge. ${name(n + d)} wants to say how full it is as a fraction in its simplest form. What fraction is it?`;
      return n < d ? `A shop's sale board says "${pfShown(p)} off". ${name(n + d)} wants to write the part taken off as a fraction of the price, in its simplest form. What fraction is it?` : `This year a farm grew ${pfShown(p)} of last year's harvest. Write this year's harvest as a fraction of last year's, in its simplest form, as a mixed number.`;
    },
    teach: {
      idea: "A percentage is a number of hundredths, and a decimal is a number of tenths, hundredths or thousandths. Either can be written as a fraction and then simplified.",
      method: "Percentage: write it over 100 (multiply top and bottom by 10 to clear a decimal point, as 12.5/100 = 125/1000). Decimal: write the digits over 10, 100 or 1000 (one zero for each decimal place). Then divide the top and bottom by their HCF.",
      alternatives: [
        { id: "known_facts", title: "Build from facts you know", kind: "conceptual", text: ["50% = 1/2, 25% = 1/4, 12.5% = 1/8, 20% = 1/5.", "37.5% = 3 × 12.5% = 3/8; 0.75 = 3 × 0.25 = 3/4."] },
        { id: "hcf_first", title: "Find the HCF in one go", kind: "procedural", text: ["Find the HCF of the top and bottom (for 375 and 1000 it is 125).", "Divide both by it once: 375/1000 = 3/8."] },
      ],
    },
    limits: "Percentages (up to two decimal places) and decimals whose fractions have denominators made of 2s and 5s up to 50; recurring decimals are another family.",
  },
  {
    id: "agfdec",
    arity: 3,
    title: "Writing a fraction as a decimal or a percentage",
    competency: PERC,
    type: "choice",
    // [mode, n, d]: mode 0: n/d as a decimal; mode 1: n/d as a percentage
    parse: none,
    reject: (p) => (fdOk(p) ? null : "Fractions in simplest form with denominators 4 to 50 made of 2s and 5s, less than 2."),
    choices: (p) => fdOpts(p).opts,
    prompt: ([mode, n, d]) => `Which ${mode === 0 ? "decimal" : "percentage"} is equal to ${n}/${d}?`,
    solve: (p) => {
      const { opts, right } = fdOpts(p);
      const [mode, n, d] = p;
      return { steps: [{ id: "divide", op: "divide", competency: "MATH.number.long-division", inputs: [mode === 0 ? n : 100 * n, d], value: mode === 0 ? longDiv(n, d) : longDiv(100 * n, d) }, { id: "write", op: "write", competency: PERC, inputs: [mode], value: right }], answer: opts.indexOf(right) };
    },
    // independent: multiply the chosen decimal back by the denominator (and by 100 for a percentage): it must give the numerator
    validate: ([mode, n, d], v) => {
      const o = fdOpts([mode, n, d]).opts;
      if (typeof v !== "number" || !o[v]) return false;
      const x = Number(o[v].replace("%", ""));
      const ok = (s: string) => Math.abs(Number(s.replace("%", "")) * d - (mode === 0 ? n : 100 * n)) < 1e-9;
      return Number.isFinite(x) && o.filter(ok).length === 1 && ok(o[v]);
    },
    bugs: (p) => {
      const [mode, n, d] = p;
      const { opts, asDigits, flip } = fdOpts(p);
      return [
        Bg("digits-joined", "conceptual", PERC, `The numerator and denominator were just written next to each other${mode === 0 ? " with a point between them" : ""}. ${n}/${d} means ${n} ÷ ${d}${mode === 1 ? ", and then × 100 for a percentage" : ""}.`, opts.indexOf(asDigits)),
        Bg("divided-wrong-way", "procedural", "MATH.number.long-division", `${d} was divided by ${n}. The fraction ${n}/${d} is ${n} ÷ ${d}: the top divided by the bottom.`, opts.indexOf(flip)),
      ];
    },
    variants: () => [],
    explain: (st) => (st.id === "divide" ? `${st.inputs[0]} ÷ ${st.inputs[1]} = ${st.value}` : `So the ${st.inputs[0] === 0 ? "decimal" : "percentage"} is ${st.value}`),
    domain: [[0, 1], [1, 99], [4, 50]],
    keep: fdOk,
    cap: 300,
    difficulty: ([mode, n, d]) => (d <= 5 && n < d ? 1 : mode === 0 ? 2 : 3),
    word: ([mode, n, d]) =>
      mode === 0
        ? n < d
          ? `A recipe needs ${n}/${d} kg of sugar. ${name(n + d)}'s kitchen scale shows decimals only. Which reading on the scale is ${n}/${d} kg?`
          : `${name(n + d)} needs a piece of cloth ${n}/${d} m long. The measuring tape in the shop is marked in decimals of a metre. Which reading on the tape is ${n}/${d} m?`
        : n < d
          ? `${n} out of every ${d} children in a school come by bus. ${name(n + d)} wants to write this as a percentage for the school magazine. Which percentage is it?`
          : `This year a village had ${n}/${d} times last year's rainfall. ${name(n + d)} wants to write this year's rainfall as a percentage of last year's. Which percentage is it?`,
    teach: {
      idea: "A fraction n/d means n ÷ d. Dividing gives the decimal; a percentage is that decimal × 100 (the number of hundredths).",
      method: "Divide the numerator by the denominator (long division, adding zeros after the point), or scale the fraction to a denominator of 10, 100 or 1000. For a percentage, multiply the decimal by 100.",
      alternatives: [
        { id: "scale", title: "Scale to 100 or 1000", kind: "procedural", text: ["3/8: 8 × 125 = 1000, so 3/8 = 375/1000 = 0.375.", "7/20: 20 × 5 = 100, so 7/20 = 35/100 = 0.35 = 35%."] },
        { id: "eighths", title: "Use known eighths and quarters", kind: "conceptual", text: ["1/8 = 0.125 = 12.5%, so 3/8 = 0.375 = 37.5% and 5/8 = 0.625 = 62.5%.", "1/4 = 0.25 = 25%, so 5/4 = 1.25 = 125%."] },
      ],
    },
    limits: "Fractions less than 2 with terminating decimals; recurring decimals are another family. A choice of four is used so that the fraction itself is not typed back as the answer.",
  },
  // ================================================================ primality by testing up to the square root
  {
    id: "agptest",
    arity: 2,
    title: "Testing for primes by dividing up to the square root",
    competency: PRI,
    type: "integer",
    mc: true,
    // [mode, n]: mode 0: the largest prime that must be tried before n can be called prime; mode 1: the smallest prime factor of n (n itself if prime)
    parse: none,
    reject: (p) => (ptOk(p) ? null : "Primes from 50 to 999 (mode 0, so the test really ends with \"prime\"); odd numbers from 101 to 999 with no factor 3 or 5 (mode 1)."),
    prompt: ([mode, n]) => (mode === 0 ? `To decide whether ${n} is prime, ${name(n)} divides it by the primes 2, 3, 5, 7, … in order. If none of them divides ${n} exactly, what is the largest prime ${name(n)} needs to have tried before saying ${n} is prime?` : `What is the smallest prime factor of ${n}? (If ${n} is prime, write ${n}.)`),
    solve: ([mode, n]) => {
      const r = Math.floor(Math.sqrt(n));
      if (mode === 0) return { steps: [{ id: "root", op: "square-root", competency: "MATH.number.square-roots", inputs: [n], value: r }, { id: "prime", op: "largest-prime", competency: PRI, inputs: [r], value: lastPrimeTest(n) }], answer: lastPrimeTest(n) };
      const p = spf(n);
      return { steps: [{ id: "root", op: "square-root", competency: "MATH.number.square-roots", inputs: [n], value: r }, { id: "try", op: "divide", competency: PRI, inputs: [n, r], value: p === n ? "no prime up to the square root divides it" : `${p} divides it: ${n} = ${p} × ${n / p}` }], answer: p };
    },
    // independent: mode 0, the answer must be prime, its square at most n, and no larger prime's square at most n;
    // mode 1, try EVERY number from 2 upwards (no square-root shortcut)
    validate: ([mode, n], v) => {
      if (typeof v !== "number" || v < 2) return false;
      if (mode === 0) {
        if (!isPr(v) || v * v > n) return false;
        for (let q = v + 1; q * q <= n; q++) if (isPr(q)) return false;
        return true;
      }
      for (let k = 2; k <= n; k++) if (n % k === 0) return v === k;
      return false;
    },
    bugs: ([mode, n]) => {
      if (mode === 0) {
        let half = Math.floor(n / 2);
        while (!isPr(half)) half--;
        const r = Math.floor(Math.sqrt(n));
        return [Bg("up-to-half", "conceptual", PRI, `Primes up to half of ${n} were tried. If ${n} had a factor bigger than its square root, it would have a partner factor smaller than the square root, already tested. So stop at √${n} ≈ ${r}.`, half), Bg("root-not-prime", "procedural", PRI, `${r} is the whole number below √${n}, but only primes need to be tried: ${r} is not prime.`, isPr(r) ? null : r)];
      }
      const p = spf(n);
      return p === n
        ? [Bg("half-a-check", "procedural", PRI, `A factor was guessed without checking. Every prime up to √${n} ≈ ${Math.floor(Math.sqrt(n))} leaves a remainder, so ${n} is prime.`, null)]
        : [Bg("stopped-early", "procedural", PRI, `Only 2, 3 and 5 were tried, and ${n} was called prime. Keep going with 7, 11, 13, … up to √${n} ≈ ${Math.floor(Math.sqrt(n))}: ${p} divides ${n}.`, n), Bg("largest-factor", "conceptual", PRI, `${n / p} is a factor, but the question asks for the smallest prime factor: ${n} = ${p} × ${n / p}.`, n / p)];
    },
    distractors: ([mode, n]) => {
      const a = mode === 0 ? lastPrimeTest(n) : spf(n);
      return [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].filter((q) => q !== a && (mode === 0 || n % q !== 0)).slice(0, 4);
    },
    variants: () => [],
    explain: (st) => (st.id === "root" ? `√${st.inputs[0]} is a little more than ${st.value} (${st.value}² = ${Number(st.value) ** 2})` : st.id === "prime" ? `The largest prime not more than ${st.inputs[0]} is ${st.value}` : `Try the primes up to ${st.inputs[1]}: ${st.value}`),
    domain: [[0, 1], [50, 999]],
    keep: ptOk,
    cap: 400,
    difficulty: ([mode, n]) => (mode === 0 ? (n < 400 ? 1 : 2) : isPr(n) ? 3 : 2),
    word: ([mode, n]) => (mode === 0 ? `A computer checks whether the ticket number ${n} is prime by dividing it by 2, 3, 5, 7, 11, … in order. If no division is exact, what is the last prime it needs to try before printing "prime"?` : `${n} marbles are to be packed into bags with the same number of marbles in each bag and more than one marble in each. What is the smallest number of marbles that can go in each bag? (If the only way is a single bag holding all ${n}, write ${n}.)`),
    teach: {
      idea: "Factors come in pairs: if n = a × b, one of a and b is at most √n. So if no prime up to √n divides n, n has no factor other than 1 and itself: it is prime.",
      method: "Find the whole number just below √n (the largest k with k² ≤ n). Divide n by each prime up to k. The first one that divides exactly is the smallest prime factor; if none does, n is prime.",
      alternatives: [
        { id: "square_list", title: "Use a list of squares", kind: "procedural", text: ["Write the prime squares: 4, 9, 25, 49, 121, 169, 289, 361, 529, 841, 961.", "Try each prime whose square is not more than n; stop at the first prime whose square is bigger than n."] },
        { id: "factor_pairs", title: "Factor pairs meet at the square root", kind: "conceptual", text: ["For 91: 1 × 91, 7 × 13. The pairs close in on √91 ≈ 9.5 from both sides.", "Once you pass the square root, every factor you would find is the partner of one already found."] },
      ],
    },
    limits: "Odd numbers up to 999 (primes only when asking where the test can stop, since only a prime survives every division); numbers with the factors 2, 3 or 5 are left out of the smallest-factor questions so that a real test is needed. Writing out the whole factorisation is the ajpf family.",
  },
  // ================================================================ Euclid's division algorithm, step by step
  {
    id: "agediv",
    arity: 3,
    title: "The steps of Euclid's division algorithm",
    competency: EUC,
    type: "integer",
    mc: true,
    // [mode, a, b]: mode 0: how many divisions; mode 1: the remainder in the second division
    parse: none,
    reject: (p) => (edOk(p) ? null : "Two numbers up to 999, the larger not a multiple of the smaller, needing 3 to 6 divisions."),
    prompt: ([mode, a, b]) => `Euclid's division algorithm finds the HCF of ${a} and ${b}: divide ${a} by ${b}, then divide ${b} by the remainder, and keep dividing the last divisor by the last remainder until a remainder is 0. ${mode === 0 ? "How many divisions are made altogether (counting the one with remainder 0)?" : "What is the remainder in the second division?"}`,
    solve: ([mode, a, b]) => {
      const S = euclidSteps(a, b);
      const steps = S.map((s, i) => ({ id: `div${i + 1}`, op: "divide", competency: EUC, inputs: [s.a, s.b, s.q], value: s.r }));
      return { steps: mode === 0 ? steps : steps.slice(0, 2), answer: mode === 0 ? S.length : S[1].r };
    },
    // independent: subtract the smaller number again and again (Euclid's subtraction form); each run of the same subtraction is one division
    validate: ([mode, a, b], v) => {
      let [x, y] = [a, b];
      let runs = 0;
      const rems: number[] = [];
      while (y > 0) {
        while (x >= y) x -= y;
        runs++;
        rems.push(x);
        [x, y] = [y, x];
      }
      return mode === 0 ? v === runs : v === rems[1];
    },
    bugs: ([mode, a, b]) => {
      const S = euclidSteps(a, b);
      if (mode === 0) return [Bg("last-not-counted", "procedural", EUC, "The last division, the one with remainder 0, was not counted. It is the step that shows the algorithm is finished.", S.length - 1)];
      return [Bg("first-remainder", "procedural", EUC, `The remainder of the first division was given. In the second division, ${S[1].a} is divided by ${S[1].b}.`, S[0].r), Bg("quotient-for-remainder", "procedural", EUC, `The quotient of the second division was given. ${S[1].a} = ${S[1].b} × ${S[1].q} + ${S[1].r}: the remainder is what is left over.`, S[1].q === S[1].r ? null : S[1].q)];
    },
    distractors: ([mode, a, b]) => {
      const S = euclidSteps(a, b);
      const ans = mode === 0 ? S.length : S[1].r;
      return [ans + 1, ans + 2, ans - 1, mode === 1 ? S[2].r : ans + 3].filter((x) => x >= 0 && x !== ans);
    },
    variants: () => [],
    explain: (st) => `${st.inputs[0]} = ${st.inputs[1]} × ${st.inputs[2]} + ${st.value}`,
    domain: [[0, 1], [21, 999], [20, 998]],
    keep: edOk,
    cap: 400,
    difficulty: ([mode, a, b]) => (mode === 1 ? (a < 300 ? 1 : 2) : euclidSteps(a, b).length <= 3 ? 2 : 3),
    word: ([mode, a, b]) => `A carpenter has a rectangular board ${a} cm by ${b} cm. He cuts off as many squares of side ${b} cm as he can, leaving a strip. From the strip he again cuts the biggest squares possible, and so on, until nothing is left over. ${mode === 0 ? "How many rounds of cutting does he make (one round for each size of square)?" : "How wide is the strip left after the second round, in cm?"}`,
    teach: {
      idea: "If a = bq + r, every common factor of a and b is also a factor of r, so HCF(a, b) = HCF(b, r). Repeating with smaller and smaller numbers must end with remainder 0; the last divisor is the HCF. (Aryabhata's 'mutual division' uses the same chain of divisions.)",
      method: "Write a = b × q + r. Replace (a, b) by (b, r) and repeat. Stop when the remainder is 0: the divisor at that step is the HCF.",
      alternatives: [
        { id: "squares", title: "Cut squares from a rectangle", kind: "conceptual", text: ["Cutting the biggest squares from a rectangle is one division: the number of squares is the quotient, the leftover strip the remainder.", "Keep cutting squares from the strip; the side of the last squares, which fit exactly, is the HCF."] },
        { id: "table", title: "Keep a table", kind: "procedural", text: ["Make columns: dividend, divisor, quotient, remainder.", "Each new row starts with the last row's divisor and remainder; count the rows at the end."] },
      ],
    },
    limits: "Two numbers up to 999 needing 3 to 6 divisions; the subtraction form of the algorithm is the akeuclid family. Proving why the algorithm works is an educator-marked task.",
  },
  // ================================================================ HCF and LCM from prime factorisations
  {
    id: "agfta",
    arity: 2,
    title: "HCF and LCM from prime factorisations",
    competency: EUC,
    type: "integer",
    mc: true,
    // [ask, e]: two numbers with the exponents in e (of 2, 3, 5, 7); ask 0 the HCF, 1 the LCM
    parse: none,
    reject: (p) => (ftaOk(p) ? null : "Two different numbers up to 5000 built from 2, 3, 5 and 7, sharing a prime."),
    prompt: ([ask, e]) => {
      const { a, b } = ftaExp(e);
      return `${fromExp(a)} = ${ftaText(a)} and ${fromExp(b)} = ${ftaText(b)}. Use these prime factorisations to find the ${ask === 0 ? "HCF" : "LCM"} of ${fromExp(a)} and ${fromExp(b)}.`;
    },
    solve: ([ask, e]) => {
      const { a, b } = ftaExp(e);
      const ex = a.map((x, i) => (ask === 0 ? Math.min(x, b[i]) : Math.max(x, b[i])));
      return { steps: [{ id: "powers", op: ask === 0 ? "lowest-powers" : "highest-powers", competency: EUC, inputs: [ftaText(a), ftaText(b)], value: ftaText(ex) }, { id: "multiply", op: "multiply", competency: EUC, inputs: [ftaText(ex)], value: fromExp(ex) }], answer: fromExp(ex) };
    },
    // independent: from the numbers themselves, search downwards for the largest common factor or upwards through the multiples
    validate: ([ask, e], v) => {
      const { a, b } = ftaExp(e);
      const [A, Bn] = [fromExp(a), fromExp(b)];
      if (ask === 0) {
        for (let k = Math.min(A, Bn); k >= 1; k--) if (A % k === 0 && Bn % k === 0) return v === k;
        return false;
      }
      const big = Math.max(A, Bn);
      const small = Math.min(A, Bn);
      for (let m = big; m <= A * Bn; m += big) if (m % small === 0) return v === m;
      return false;
    },
    bugs: ([ask, e]) => {
      const { a, b } = ftaExp(e);
      const [A, Bn] = [fromExp(a), fromExp(b)];
      const lo = fromExp(a.map((x, i) => Math.min(x, b[i])));
      const hi = fromExp(a.map((x, i) => Math.max(x, b[i])));
      const common = PR3.reduce((v, p, i) => (a[i] && b[i] ? v * p : v), 1);
      return ask === 0
        ? [Bg("highest-for-hcf", "conceptual", EUC, "The higher power of each prime was taken. The HCF uses each COMMON prime with the LOWER power (the most that divides both numbers).", hi), Bg("primes-once", "procedural", EUC, "Each common prime was taken only once. The HCF takes each common prime to the lower of its two powers.", common === lo ? null : common)]
        : [Bg("lowest-for-lcm", "conceptual", EUC, "The lower powers of the common primes were taken: that is the HCF. The LCM takes every prime that appears, with the HIGHER power.", lo), Bg("product", "conceptual", EUC, `The two numbers were multiplied. They share primes, so the LCM is ${A} × ${Bn} ÷ HCF.`, A * Bn)];
    },
    variants: () => [],
    explain: (st) => (st.id === "powers" ? `${st.op === "lowest-powers" ? "Common primes, lower powers" : "Every prime, higher power"}: ${st.value}` : `${st.inputs[0]} = ${st.value}`),
    domain: [[0, 1], [0, 65535]],
    keep: ftaOk,
    cap: 400,
    difficulty: ([, e]) => {
      const { a, b } = ftaExp(e);
      return a.filter(Boolean).length + b.filter(Boolean).length <= 4 ? 1 : a.some((x, i) => x && b[i] && x !== b[i]) ? 3 : 2;
    },
    teach: {
      idea: "By the Fundamental Theorem of Arithmetic every number has exactly one prime factorisation. A common factor can only use primes both numbers have, as often as both allow; a common multiple must contain every prime of each number.",
      method: "HCF: multiply the common primes, each to the LOWER of its two powers. LCM: multiply every prime that appears, each to the HIGHER power. Check: HCF × LCM = the product of the two numbers.",
      alternatives: [
        { id: "venn", title: "Sort the primes in a Venn diagram", kind: "conceptual", text: ["Put the shared prime factors in the middle and the rest on each side.", "The middle multiplied is the HCF; everything multiplied is the LCM."] },
        { id: "table_powers", title: "A table of powers", kind: "procedural", text: ["Make a row for each number and a column for each prime, writing its power (0 if missing).", "Take the smaller entry in each column for the HCF and the bigger for the LCM."] },
      ],
    },
    limits: "Numbers up to 5000 built from 2, 3, 5 and 7; stating and proving the Fundamental Theorem of Arithmetic is an educator-marked task.",
  },
  // ================================================================ kinds of fractions
  {
    id: "agclass",
    arity: 3,
    title: "Proper fractions, improper fractions and mixed numbers",
    competency: MIX,
    type: "choice",
    // [form, n, d]: form 0 a proper fraction n/d, 1 an improper fraction n/d (n ≥ d), 2 a mixed number w n/d
    parse: none,
    reject: (p) => (classOk(p) ? null : "Fractions with denominators 2 to 12 in simplest form (and fractions equal to 1), and mixed numbers."),
    choices: (p) => ordered(`agclass:${p}`, FKIND),
    prompt: (p) => `What kind of number is ${classText(p)}?`,
    solve: (p) => ({ steps: [{ id: "look", op: "classify", competency: MIX, inputs: [classText(p)], value: FKIND[p[0]] }], answer: ordered(`agclass:${p}`, FKIND).indexOf(FKIND[p[0]]) }),
    // independent: read the written number: a whole part in front makes a mixed number; otherwise compare top and bottom
    validate: (p, v) => {
      const t = classText(p);
      const m = t.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
      if (!m || typeof v !== "number") return false;
      const kind = m[1] ? 2 : Number(m[2]) < Number(m[3]) ? 0 : 1;
      return ordered(`agclass:${p}`, FKIND)[v] === FKIND[kind];
    },
    bugs: (p) => {
      const [form, n, d] = p;
      const o = ordered(`agclass:${p}`, FKIND);
      if (form === 0) return [Bg("reversed-rule", "conceptual", MIX, `The rule was turned round. In a proper fraction the top number is SMALLER than the bottom one, as in ${n}/${d}: it is less than 1.`, o.indexOf(FKIND[1]))];
      if (form === 1) return n === d ? [Bg("one-is-proper", "conceptual", MIX, `${n}/${d} is exactly 1, so it was taken as proper. A proper fraction is less than 1; when the top equals the bottom (or is bigger) the fraction is improper.`, o.indexOf(FKIND[0]))] : [Bg("more-than-one-mixed", "conceptual", MIX, `${n}/${d} is more than 1, so it was called a mixed number. It is written as one fraction with the top bigger than the bottom: an improper fraction. A mixed number has a whole number written in front.`, o.indexOf(FKIND[2]))];
      return [Bg("more-than-one-improper", "conceptual", MIX, `${classText(p)} is more than 1, so it was called improper. It is written as a whole number and a proper fraction side by side: a mixed number.`, o.indexOf(FKIND[1]))];
    },
    variants: () => [],
    explain: (st) => `${st.inputs[0]} is ${st.value}`,
    domain: [[0, 2], [1, 36], [2, 12]],
    keep: classOk,
    difficulty: ([form, n, d]) => (form === 0 ? 1 : form === 1 && n === d ? 3 : 2),
    teach: {
      idea: "A proper fraction is less than 1 (top smaller than bottom). An improper fraction has the top equal to or bigger than the bottom, so it is 1 or more. A mixed number writes a value over 1 as a whole number and a proper fraction.",
      method: "Is there a whole number in front? Then it is a mixed number. If not, compare the top and the bottom: top smaller → proper; top equal or bigger → improper.",
      alternatives: [
        { id: "pizza", title: "Count the pieces", kind: "conceptual", text: ["7/4 of a pizza cut in quarters is 7 quarters: more than one whole pizza.", "1 3/4 is the same amount written as 1 whole pizza and 3 quarters."], visual: () => ({ type: "grid", rows: 2, cols: 4, shaded: 7 }) },
        { id: "number_line", title: "Place it on a number line", kind: "procedural", text: ["Fractions between 0 and 1 are proper.", "From 1 onwards they are improper, or can be written as mixed numbers."], visual: () => ({ type: "numberline", from: 0, to: 3, step: 1, marks: [0.75, 1.75] }) },
      ],
    },
    limits: "Fractions with denominators up to 12; converting between the forms is the agimp and agmix families.",
  },
  // ================================================================ reading a tree diagram as an expression
  {
    id: "agtree",
    arity: 2,
    title: "The value of an expression given as a tree diagram",
    competency: TREE,
    type: "integer",
    mc: true,
    // [shape, seed]: shape 0 (a ○ b) ○ c, 1 a ○ (b ○ c), 2 (a ○ b) ○ (c ○ d)
    parse: none,
    reject: (p) => (treeOk(p) ? null : "Tree diagrams of two or three operations with whole-number branches."),
    prompt: () => "The table describes a tree diagram for a numerical expression. Each box does its operation on the values of its left and right branches; a branch can be a number or another box. What is the value of the whole expression (the box at the top)?",
    solve: ([shape, seed]) => {
      const t = treeOf(shape, seed);
      const steps: { id: string; op: string; competency: string; inputs: (number | string)[]; value: number }[] = [];
      const go = (n: TNode): number => {
        if (typeof n === "number") return n;
        const [l, r] = [go(n.l), go(n.r)];
        const v = n.op === "+" ? l + r : n.op === "−" ? l - r : l * r;
        steps.push({ id: `box${steps.length + 1}`, op: n.op === "+" ? "add" : n.op === "−" ? "subtract" : "multiply", competency: TREE, inputs: [l, n.op, r], value: v });
        return v;
      };
      const v = go(t);
      return { steps, answer: v };
    },
    // independent: write the tree as an expression with brackets and evaluate it with the expression reader
    validate: ([shape, seed], v) => typeof v === "number" && Math.abs(evalText(tbr(treeOf(shape, seed))) - v) < 1e-9,
    bugs: ([shape, seed]) => {
      const t = treeOf(shape, seed);
      const v = tval(t);
      const ltr = leftToRight(tflat(t));
      const bod = evalText(tflat(t));
      return [
        Bg("read-flat", "conceptual", TREE, `The numbers and signs were read in a line from left to right (${tflat(t)}), ignoring the branches. A box must be worked out before the box above it uses its value: that is what brackets do.`, ltr),
        Bg("bodmas-without-brackets", "conceptual", TREE, `The expression was written without brackets (${tflat(t)}) and worked out by the usual order. The tree says which part comes first: write it with brackets, ${tbr(t)}.`, bod === v || bod === ltr ? null : bod),
      ];
    },
    variants: () => [],
    explain: (st) => `${st.inputs[0]} ${st.inputs[1]} ${st.inputs[2]} = ${st.value}`,
    domain: [[0, 2], [0, 79]],
    keep: (p) => treeOk(p) && firstSeeds(`agtree${p[0]}`, 80, (k) => (treeOk([p[0], k]) ? tbr(treeOf(p[0], k)) : `x${k}`)).has(p[1]),
    difficulty: ([shape]) => (shape === 0 ? 1 : shape === 1 ? 2 : 3),
    figure: ([shape, seed]) => treeTable(treeOf(shape, seed)),
    word: ([shape, seed]) => treeWord(shape, seed),
    teach: {
      idea: "A tree diagram shows the order of work: the operation at the top is done last, and each branch that is a box must be worked out first. Written as an expression, every such branch goes in brackets.",
      method: "Start at the bottom: work out each box whose branches are both numbers. Put its value in place of the box, and move up until the top box is done.",
      alternatives: [
        { id: "write_brackets", title: "Write it with brackets", kind: "procedural", text: ["Write the top box as (left branch) op (right branch).", "Replace each branch that is a box by its own expression in brackets; then work out the brackets first."] },
        { id: "family_tree", title: "Children before parents", kind: "conceptual", text: ["Think of each box as a parent and its branches as children.", "A parent can only be worked out when all its children have values."] },
      ],
    },
    limits: "Trees with two or three operations (+, −, ×) and whole numbers, given as a table of boxes (no drawn trees yet); drawing a tree for an expression is an educator-marked task.",
  },
);
