/**
 * Batch b07 (families@2), Grades 4–5 and up: speed as distance per unit time, adding and subtracting decimals and
 * money, factors and multiples, HCF and LCM, mixed numbers, order of operations, percentages as hundredths, primes,
 * and testing a claim with a counterexample. Written by OpenPath; CC0.
 */
import type { Bug, Def, Value, Visual } from "../family-kit";
import { gcd, MT } from "../family-kit";
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
/** Digit-by-digit combination of two whole numbers (no carrying or borrowing): the classic column slips. */
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
/** The five numbers tested for claim k, choice s: four that fit the claim and one counterexample. */
function claimList(k: number, s: number): { list: number[]; counter: number } {
  const c = CLAIMS[k];
  const counter = c.counter[(s * 5 + k) % c.counter.length];
  const step = Math.floor(c.agree.length / 4);
  const ag = [0, 1, 2, 3].map((i) => c.agree[(s * 7 + i * step) % c.agree.length]).sort((a, b) => a - b);
  const list = [...ag];
  list.splice(s % 5, 0, counter);
  return { list, counter };
}

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
        { id: "right-align", kind: "conceptual", competency: DTEN, says: `The digits were lined up from the right, as for whole numbers, so tenths were added to hundredths. Line up the decimal points: write ${dec(x, 1)} as ${dec(X, 2, true)}.`, u: op ? (x - y > 0 ? x - y : null) : x + y },
        ...(op
          ? [
              { id: "bring-down", kind: "procedural", competency: DEC, says: `The empty hundredths place in ${dec(x, 1)} was skipped and the ${y % 10} was brought down. Write ${dec(x, 1)} as ${dec(X, 2, true)}: the empty place is a 0, and you take ${y % 10} away from it by exchanging.`, u: X - y + 2 * (y % 10) },
              { id: "smaller-from-larger", kind: "procedural", competency: DEC, says: "In each column the smaller digit was taken from the larger one. When the top digit is smaller, exchange 1 from the next place first.", u: digitwise(X, y, (a, b) => Math.abs(a - b)) },
            ]
          : [{ id: "no-carry", kind: "procedural", competency: ADDR, says: "A column added up to 10 or more, but the 1 was not carried to the next place on the left.", u: noCarry(X, y) }]),
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
        { id: "prime_factors", title: "Use prime factors", kind: "procedural", text: ["Write each number as a product of primes, e.g. 12 = 2 × 2 × 3 and 18 = 2 × 3 × 3.", "Take each prime the greatest number of times it appears in either: 2 × 2 × 3 × 3 = 36."] },
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
      { id: "fact-slip", kind: "prerequisite", competency: MT, says: `The multiplication ${w} × ${d} is not yet reliable.`, predict: [`${w * d + d + n}/${d}`, ...(w > 1 ? [`${w * d - d + n}/${d}`] : [])], ...(w >= 2 && d >= 2 ? { probe: `gen:mul:${w},${d}` } : {}) },
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
    reject: ([k, s]) => (k < 0 || k >= CLAIMS.length || s < 0 || s > 29 ? "One of four claims about numbers, tested on five numbers." : null),
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
    domain: [[0, 3], [0, 29]],
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
