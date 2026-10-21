/**
 * Batch b05 (families@2): Grades 4–5 number, measurement, geometry and reasoning — pattern rules, angles, circles,
 * lines of symmetry, reflections and translations, 24-hour time, area in squares, mixed units, metric conversions,
 * tenths and hundredths, even and odd, large numbers in the Indian system, × and ÷ by 10, 100, 1000, rounding,
 * and multi-step money and capacity problems. Written by OpenPath; CC0.
 */
import type { Bug, Def, Value, Visual } from "../family-kit";
import { numericValue } from "../answer-types";

const PATR = "MATH.algebra.pattern-rules";
const GROW = "MATH.algebra.growing-patterns";
const ANG = "MATH.geometry.angles-intro";
const CIRC = "MATH.geometry.circles";
const SYM = "MATH.geometry.symmetry-lines";
const TRANS = "MATH.geometry.transformations";
const CART = "MATH.coordinate.cartesian";
const T24 = "MATH.measurement.24-hour-clock";
const CLOCK = "MATH.measurement.clock";
const ELAPSED = "MATH.measurement.elapsed-time";
const AREA = "MATH.measurement.area-squares";
const PERIM = "MATH.measurement.rectangle-perimeter";
const MIX = "MATH.measurement.compute-with-measures";
const CONV = "MATH.measurement.unit-conversions";
const DEC = "MATH.number.decimal-tenths";
const EVEN = "MATH.number.even-odd";
const LARGE = "MATH.number.large-numbers";
const P10 = "MATH.number.multiply-divide-powers-of-ten";
const ROUND = "MATH.number.rounding";
const MULTI = "MATH.reasoning.multi-step";
const PV = "MATH.number.place-value-tens";
const THOU = "MATH.number.thousands";
const ADDSUB = "MATH.number.multi-digit-add-subtract";
const MM = "MATH.number.multi-multiplication";
const MT = "MATH.number.multiplication-tables";
const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A pair as written for a tuple answer. */
const tup = (a: number, b: number) => `(${n_(a)}, ${n_(b)})`;
/** Read "(a, b)" (or a longer list) back into numbers; null if it is not a list of whole numbers. */
const readTuple = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const m = v.replace(/−/g, "-").replace(/\s/g, "").match(/^\((-?\d+(?:,-?\d+)*)\)$/);
  return m ? m[1].split(",").map(Number) : null;
};
/** A point as a tuple answer when it is on the first-quadrant grid (0 to 10), else null (no prediction). */
const onGrid = (a: number, b: number) => (a >= 0 && a <= 10 && b >= 0 && b <= 10 ? tup(a, b) : null);
const isInt = (v: Value): v is number => typeof v === "number" && Number.isInteger(v);
const inRange = (p: number[], ranges: [number, number][]) => p.length === ranges.length && p.every((v, i) => Number.isInteger(v) && v >= ranges[i][0] && v <= ranges[i][1]);
/** A small deterministic random sequence from a seed (for families whose parameter is a seed). */
const rng = (seed: number) => {
  let x = (Math.imul(seed + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
};
/** Indian comma grouping: 407052 → 4,07,052. */
const ind = (n: number) => {
  const s = String(n);
  if (s.length <= 3) return s;
  const head = s.slice(0, -3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${s.slice(-3)}`;
};
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const w2 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
const hh = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
/** A number of hundredths written as a decimal in simplest form: 380 → "3.8", 7 → "0.07", 500 → "5". */
const ds = (h: number) => {
  const w = Math.floor(h / 100);
  const r = h % 100;
  return r === 0 ? String(w) : r % 10 === 0 ? `${w}.${r / 10}` : `${w}.${String(r).padStart(2, "0")}`;
};
const hundredths = (v: Value) => {
  const x = typeof v === "string" ? Number(v.trim()) : typeof v === "number" ? v : NaN;
  const h = Math.round(x * 100);
  return Number.isFinite(x) && Math.abs(x * 100 - h) < 1e-9 ? h : null;
};
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;

// ---------------------------------------------------------------- letters and their mirror lines (aesym)

const LETTERS = "ACDEFGHIJLMNOPRSTUVWXYZ";
/** Which capital letters (in plain block capitals) have a vertical / horizontal mirror line: used by solve. */
const VSYM = new Set("AHIMOTUVWXY");
const HSYM = new Set("CDEHIOX");
/** The same letters drawn on a 5 × 5 grid: used by validate (an independent check by folding the drawing). */
const BITMAP: Record<string, string[]> = {
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  C: [".####", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#####"],
  F: ["#####", "#....", "####.", "#....", "#...."],
  G: [".####", "#....", "#..##", "#...#", ".###."],
  H: ["#...#", "#...#", "#####", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "#####"],
  J: ["#####", "...#.", "...#.", "#..#.", ".##.."],
  L: ["#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "####.", "#....", "#...."],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  S: [".####", "#....", ".###.", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", "..#..", "..#..", "..#.."],
  Z: ["#####", "...#.", "..#..", ".#...", "#####"],
};
const foldsV = (c: string) => BITMAP[c].every((row) => row === [...row].reverse().join(""));
const foldsH = (c: string) => BITMAP[c].every((row, i, rows) => row === rows[rows.length - 1 - i]);
const symLetters = (seed: number) => {
  const r = rng(seed);
  const pool = [...LETTERS];
  const out: string[] = [];
  while (out.length < 5) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
};

// ---------------------------------------------------------------- even numbers (aeeven)

const evenList = (seed: number) => {
  const r = rng(seed + 7000);
  const out: number[] = [];
  while (out.length < 6) {
    const big = r() < 0.5;
    const x = big ? 100 + Math.floor(r() * 900) : 10 + Math.floor(r() * 90);
    if (!out.includes(x)) out.push(x);
  }
  // make sure one number ends in 0 (the zero-ending misconception can be seen)
  if (!out.some((x) => x % 10 === 0)) out[Math.floor(r() * 6)] = 10 * (2 + Math.floor(r() * 60)) + (r() < 0.5 ? 100 : 0);
  return out;
};
const evenOk = (xs: number[]) => {
  const ev = xs.filter((x) => x % 2 === 0).length;
  return new Set(xs).size === 6 && ev >= 2 && ev <= 4 && xs.some((x) => Number(String(x)[0]) % 2 !== x % 2) && xs.some((x) => x % 10 === 0);
};

// ---------------------------------------------------------------- ordering numbers (aecmp)

const cmpList = (seed: number) => {
  const r = rng(seed + 31000);
  const d1 = 1 + Math.floor(r() * 7);
  const digs: number[] = [];
  while (digs.length < 3) {
    const d = 1 + Math.floor(r() * 9);
    if (!digs.includes(d)) digs.push(d);
  }
  const [x, y, z] = digs;
  const q = d1 + 1 + Math.floor(r() * (9 - d1));
  const num = (ds: number[]) => ds.reduce((a, d) => a * 10 + d, 0);
  const list = [num([d1, x, 0, y, z]), num([d1, 0, x, y, z]), num([d1, x, y, 0, z]), num([q, y, x, z])];
  const shift = Math.floor(r() * 4);
  return [...list.slice(shift), ...list.slice(0, shift)];
};

// ---------------------------------------------------------------- mixed units (aemix, aemulm)

const UNITS = [
  { big: "m", small: "cm", f: 100, step: 5, what: "length", things: ["ribbon", "rope", "cloth"] },
  { big: "kg", small: "g", f: 1000, step: 50, what: "weight", things: ["rice", "sugar", "dal"] },
  { big: "L", small: "mL", f: 1000, step: 50, what: "capacity", things: ["milk", "water", "oil"] },
];
/** A mixed measure from its index: i = 20 × big + k, small = k × step. */
const mixed = (kind: number, i: number) => [Math.floor(i / 20), (i % 20) * UNITS[kind].step] as const;
const say = (kind: number, b: number, s: number) => (s ? `${b} ${UNITS[kind].big} ${s} ${UNITS[kind].small}` : `${b} ${UNITS[kind].big}`);

// ---------------------------------------------------------------- conversions (aeconv)

const CONVK = [
  { big: "m", small: "cm", f: 100 },
  { big: "kg", small: "g", f: 1000 },
  { big: "L", small: "mL", f: 1000 },
  { big: "km", small: "m", f: 1000 },
  { big: "cm", small: "mm", f: 10 },
  { big: "g", small: "mg", f: 1000 },
];
const convSmall = (k: number, s: number) => (k === 0 || k === 4 ? s : 5 * s);

// ---------------------------------------------------------------- shopping (aeshop)

const PRICES = [12, 15, 18, 20, 24, 25, 30, 35, 40, 45, 48, 50, 60, 75, 80, 90, 120, 150];
const NOTES = [100, 200, 500, 1000];
const SHOP = [
  ["notebooks", "pencil boxes", "pencil box"],
  ["mangoes", "coconuts", "coconut"],
  ["story books", "colour pens", "colour pen"],
  ["bars of soap", "packets of biscuits", "packet of biscuits"],
];

// ---------------------------------------------------------------- rounding

const roundTo = (n: number, u: number) => Math.floor((n + u / 2) / u) * u;

// ---------------------------------------------------------------- angles

const KINDS = ["acute", "right", "obtuse", "straight"];
const angleList = ([, a, o, r]: number[]) => {
  const base = [5 * a, 90, 5 * o, 180];
  return [...base.slice(r), ...base.slice(0, r)];
};

export const B05: Def[] = [
  // ============================================================ pattern rules
  {
    id: "aepat",
    arity: 3,
    title: "Using a pattern rule to find a later number",
    competency: PATR,
    type: "integer",
    mc: true,
    // [a, d, n]: start a, rule "add d", find the n-th number
    parse: none,
    reject: (p) => (!inRange(p, [[1, 30], [2, 9], [6, 12]]) ? "A pattern that starts at 1 to 30 and adds 2 to 9 each time; the 6th to 12th number." : null),
    prompt: ([a, d, n]) => `A number pattern starts at ${a}. The rule is: add ${d} each time. The pattern begins ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, … What is the ${ord(n)} number in the pattern?`,
    solve: ([a, d, n]) => ({
      steps: [
        { id: "jumps", op: "count", competency: PATR, inputs: [n], value: n - 1 },
        { id: "total", op: "multiply", competency: MT, inputs: [n - 1, d], value: (n - 1) * d },
        { id: "add", op: "add", competency: PATR, inputs: [a, (n - 1) * d], value: a + (n - 1) * d },
      ],
      answer: a + (n - 1) * d,
    }),
    // independent: write the pattern out, one number at a time
    validate: ([a, d, n], v) => {
      let t = a;
      for (let i = 1; i < n; i++) t += d;
      return v === t;
    },
    bugs: ([a, d, n]) => [
      { id: "n-jumps", kind: "conceptual", competency: PATR, says: `${n} jumps of ${d} were added to the start, but the 1st number is the start itself: the ${ord(n)} number is only ${n - 1} jumps along.`, predict: a + n * d },
      { id: "forgot-start", kind: "procedural", competency: PATR, says: `Only the jumps (${n} × ${d}) were counted; the pattern starts at ${a}, not at 0.`, predict: n * d },
      { id: "next-only", kind: "procedural", competency: GROW, says: "Only the next number after those shown was found; keep using the rule until you reach the place asked for.", predict: a + 4 * d },
    ],
    variants: () => [],
    explain: (s) => (s.id === "jumps" ? `From the 1st number to the ${ord(Number(s.inputs[0]))} there ${Number(s.value) === 1 ? "is 1 jump" : `are ${s.value} jumps`}` : s.id === "total" ? `${s.inputs[0]} jumps of ${s.inputs[1]} make ${s.value}` : `Start at ${s.inputs[0]} and add ${s.inputs[1]}: ${s.value}`),
    domain: [[1, 30], [2, 9], [6, 12]],
    cap: 400,
    difficulty: ([, d, n]) => (n <= 7 && d <= 5 ? 1 : n <= 9 ? 2 : 3),
    figure: ([a, d]) => ({ type: "table", head: ["Place", "1st", "2nd", "3rd", "4th"], rows: [["Number", a, a + d, a + 2 * d, a + 3 * d]] }),
    word: ([a, d, n]) => `${name(a + d)} has ₹${a} in a money box on day 1. Every day after that, ${name(a + d)} puts in ₹${d} more. How many rupees are in the box on day ${n}?`,
    teach: {
      idea: "A rule like \"add 5 each time\" tells you how to get from one number to the next. The 1st number is the start, so the n-th number is n − 1 jumps after it.",
      method: "Count the jumps from the 1st number to the one asked for (one less than its place), multiply by the amount added each time, and add that to the start.",
      visual: ([a, d, n]) => ({ type: "numberline", from: a, to: a + (n - 1) * d, step: d, jumps: Array.from({ length: n - 1 }, (_, i) => [a + i * d, a + (i + 1) * d]) }),
      alternatives: [
        { id: "write_on", title: "Keep writing the pattern", kind: "procedural", text: ["Write the numbers in a row and keep adding the same amount.", "Number each one with its place (1st, 2nd, 3rd …) and stop at the place asked for."] },
      ],
    },
    limits: "Patterns that add the same whole number each time; patterns that multiply, or shape patterns to draw, are not here.",
  },
  {
    id: "aehund",
    arity: 3,
    title: "Moving on a 1–100 number grid",
    competency: PATR,
    type: "integer",
    mc: true,
    // [s, r, c]: start at s, move r rows down and c squares right
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[1, 70], [1, 3], [0, 4]])) return "Start 1 to 70, 1 to 3 rows down, 0 to 4 squares right.";
      const [s, r, c] = p;
      return ((s - 1) % 10) + c > 9 || s + 10 * r > 100 ? "The move must stay on the grid, in the same row." : null;
    },
    prompt: ([s, r, c]) => `On a 1–100 number grid there are 10 numbers in each row (1 to 10 in the first row, 11 to 20 in the next, and so on). Start at ${s}. Move ${r} ${r === 1 ? "row" : "rows"} down${c ? ` and then ${c} ${c === 1 ? "square" : "squares"} to the right` : ""}. Which number do you land on?`,
    solve: ([s, r, c]) => ({
      steps: [
        { id: "down", op: "add", competency: PATR, inputs: [s, r], value: s + 10 * r },
        { id: "right", op: "add", competency: PATR, inputs: [s + 10 * r, c], value: s + 10 * r + c },
      ],
      answer: s + 10 * r + c,
    }),
    // independent: find the start's row and column, move on the grid, read the number in the new square
    validate: ([s, r, c], v) => {
      const row = Math.floor((s - 1) / 10) + r;
      const col = ((s - 1) % 10) + c;
      return v === row * 10 + col + 1;
    },
    bugs: ([s, r, c]) => [
      { id: "down-adds-one", kind: "conceptual", competency: PATR, says: "Moving down was counted as adding 1 and moving right as adding 10; on the grid one row down adds 10 and one square right adds 1.", predict: s + r + 10 * c <= 100 ? s + r + 10 * c : null },
      { id: "down-is-up", kind: "procedural", competency: PATR, says: "The move went up instead of down: going up takes away 10 for each row.", predict: s - 10 * r + c > 0 ? s - 10 * r + c : null },
      ...(r > 1 ? [{ id: "one-row", kind: "procedural", competency: PATR, says: `Only one row was moved; each of the ${r} rows down adds another 10.`, predict: s + 10 + c } as Bug] : []),
    ],
    distractors: ([s, r, c]) => [s + 10 * (r + 1) + c, s + 10 * r, s + r + c].filter((x) => x > 0 && x <= 100),
    variants: () => [],
    explain: (s) => (s.id === "down" ? `${s.inputs[1]} ${s.inputs[1] === 1 ? "row" : "rows"} down adds ${10 * Number(s.inputs[1])}: ${s.inputs[0]} → ${s.value}` : `${s.inputs[1]} to the right adds ${s.inputs[1]}: ${s.value}`),
    domain: [[1, 70], [1, 3], [0, 4]],
    cap: 400,
    difficulty: ([, r, c]) => (r === 1 && c === 0 ? 1 : r === 1 || c === 0 ? 2 : 3),
    figure: ([s]) => ({ type: "grid", rows: 10, cols: 10, shaded: s, note: `squares 1 to ${s} are shaded; you start on the last shaded square` }),
    word: ([s, r, c]) => `In a class game the floor has a 1–100 number grid with 10 numbers in each row. ${name(s)} stands on ${s}, walks ${r} ${r === 1 ? "row" : "rows"} down${c ? ` and ${c} ${c === 1 ? "square" : "squares"} to the right` : ""}. On which number does ${name(s)} stop?`,
    teach: {
      idea: "Each row of the grid holds 10 numbers, so the number just below is always 10 more, and the number just to the right is 1 more.",
      method: "Add 10 for every row you move down, then add 1 for every square you move right.",
      visual: ([s, r]) => ({ type: "numberline", from: s, to: s + 10 * r, step: 10, jumps: Array.from({ length: r }, (_, i) => [s + 10 * i, s + 10 * (i + 1)]) }),
      alternatives: [
        { id: "tens_ones", title: "Watch the tens digit", kind: "conceptual", text: ["Moving down one row changes only the tens digit: 34 → 44 → 54.", "Moving right changes only the ones digit: 54 → 55 → 56 (until the end of a row)."] },
      ],
    },
    limits: "Moves down and to the right inside one row; moves across the end of a row, and odd/even or diagonal patterns, are not here.",
  },
  // ============================================================ angles
  {
    id: "aeang",
    arity: 4,
    title: "Picking out an acute, right, obtuse or straight angle",
    competency: ANG,
    type: "integer",
    mc: true,
    // [t, a, o, r]: kind asked (0 acute, 1 right, 2 obtuse, 3 straight); acute 5a°, obtuse 5o°; r turns the order
    parse: none,
    reject: (p) => (!inRange(p, [[0, 3], [2, 17], [19, 34], [0, 3]]) ? "One acute (10° to 85°), one right, one obtuse (95° to 170°) and one straight angle." : null),
    prompt: (p) => {
      const xs = angleList(p);
      return `The table gives the sizes of four angles: P = ${xs[0]}°, Q = ${xs[1]}°, R = ${xs[2]}°, S = ${xs[3]}°. Which one is ${p[0] % 2 === 0 ? "an" : "a"} ${KINDS[p[0]]} angle? Write its size in degrees.`;
    },
    solve: ([t, a, o]) => {
      const ans = [5 * a, 90, 5 * o, 180][t];
      return { steps: [{ id: "compare", op: "compare", competency: ANG, inputs: [KINDS[t], 90], value: ans }], answer: ans };
    },
    // independent: how many right angles fit into each listed angle (less than 1, exactly 1, between 1 and 2, exactly 2)
    validate: (p, v) => {
      if (!isInt(v) || !angleList(p).includes(v)) return false;
      const k = v / 90;
      return [k > 0 && k < 1, k === 1, k > 1 && k < 2, k === 2][p[0]];
    },
    bugs: ([t, a, o]) =>
      [
        [
          { id: "acute-obtuse-swap", kind: "recall", competency: ANG, says: "The names were mixed up: an acute angle is smaller than a right angle; an obtuse angle is bigger than a right angle.", predict: 5 * o },
          { id: "right-as-acute", kind: "conceptual", competency: ANG, says: "An angle of exactly 90° is a right angle; an acute angle is less than 90°.", predict: 90 },
        ],
        [{ id: "straight-as-right", kind: "conceptual", competency: ANG, says: "A straight angle (180°) was taken for a right angle; a right angle is a square corner, half of a straight angle.", predict: 180 }],
        [
          { id: "acute-obtuse-swap", kind: "recall", competency: ANG, says: "The names were mixed up: an obtuse angle is bigger than a right angle; an acute angle is smaller.", predict: 5 * a },
          { id: "straight-as-obtuse", kind: "conceptual", competency: ANG, says: "A straight angle (180°) is not obtuse; an obtuse angle is between 90° and 180°.", predict: 180 },
        ],
        [
          { id: "biggest-bent", kind: "conceptual", competency: ANG, says: "The biggest bent angle was chosen; a straight angle is exactly 180°, its arms make one straight line.", predict: 5 * o },
          { id: "upright-as-straight", kind: "recall", competency: ANG, says: "A right angle (an arm standing straight up) was taken for a straight angle; a straight angle is a flat line, 180°.", predict: 90 },
        ],
      ][t] as Bug[],
    distractors: (p) => angleList(p),
    variants: () => [],
    explain: (s) => (s.inputs[0] === "acute" ? `An acute angle is less than 90°: ${s.value}°` : s.inputs[0] === "right" ? "A right angle is exactly 90°" : s.inputs[0] === "obtuse" ? `An obtuse angle is more than 90° but less than 180°: ${s.value}°` : "A straight angle is exactly 180°"),
    domain: [[0, 3], [2, 17], [19, 34], [0, 3]],
    cap: 400,
    difficulty: ([t, a, o]) => (t === 1 || t === 3 ? 1 : (t === 0 && a >= 15) || (t === 2 && o <= 21) ? 3 : 2),
    figure: (p) => ({ type: "table", head: ["Angle", "P", "Q", "R", "S"], rows: [["Size", ...angleList(p).map((x) => `${x}°`)]] }),
    word: (p) => {
      const xs = angleList(p);
      return `${name(p[1] + p[2])} measures four angles drawn in a geometry notebook: ${xs[0]}°, ${xs[1]}°, ${xs[2]}° and ${xs[3]}°. Which of these is ${p[0] % 2 === 0 ? "an" : "a"} ${KINDS[p[0]]} angle? Write its size in degrees.`;
    },
    teach: {
      idea: "A right angle (90°) is a square corner. Smaller than a right angle is acute, between a right angle and a straight line is obtuse, and a straight line is a straight angle (180°).",
      method: "Compare each angle with 90°: less is acute, equal is right; more than 90° but less than 180° is obtuse; exactly 180° is straight.",
      visual: ([t, a, o]) => ({ type: "angle", deg: [5 * a, 90, 5 * o, 180][t] }),
      alternatives: [
        { id: "paper_corner", title: "Check with a folded-paper corner", kind: "conceptual", text: ["Fold a paper twice to make a square corner: that is a right angle.", "Hold the corner in the angle: if the angle fits inside the corner it is acute; if the corner fits inside the angle (and the arms are not one straight line) it is obtuse."], visual: () => ({ type: "angle", deg: 90 }) },
      ],
    },
    limits: "Angles given by their sizes in whole degrees (multiples of 5); reflex angles and measuring with a protractor are not here.",
  },
  {
    id: "aeturn",
    arity: 2,
    title: "Angles as turns on a clock face",
    competency: ANG,
    type: "integer",
    mc: true,
    // [p, s]: a hand points at p and turns clockwise s numbers
    parse: none,
    reject: (p) => (!inRange(p, [[1, 12], [1, 11]]) ? "A hand turning clockwise from one number to another, less than a full turn." : null),
    prompt: ([p, s]) => `On a clock face, a hand points at ${p}. It turns clockwise until it points at ${((p + s - 1) % 12) + 1}. Through how many degrees has it turned? (A full turn is 360°.)`,
    solve: ([, s]) => ({
      steps: [
        { id: "each", op: "divide", competency: ANG, inputs: [360, 12], value: 30 },
        { id: "turn", op: "multiply", competency: MT, inputs: [s, 30], value: 30 * s },
      ],
      answer: 30 * s,
    }),
    // independent: step the hand round one number at a time, adding a twelfth of a full turn each time
    validate: ([p, s], v) => {
      const q = ((p + s - 1) % 12) + 1;
      let at = p;
      let deg = 0;
      while (at !== q) {
        at = (at % 12) + 1;
        deg += 360 / 12;
      }
      return v === deg;
    },
    bugs: ([, s]) => [
      { id: "anticlockwise", kind: "procedural", competency: ANG, says: "The turn was counted the other way round (anticlockwise); clockwise is the way the hands of a clock move.", predict: 360 - 30 * s },
      { id: "minutes-not-degrees", kind: "conceptual", competency: CLOCK, says: "The minutes were counted (5 for each number) instead of degrees; each number on the clock is 30° of turn.", predict: 5 * s },
      { id: "count-start", kind: "procedural", competency: ANG, says: "The starting number was counted as a step too; count only the moves from one number to the next.", predict: s < 11 ? 30 * (s + 1) : null },
    ],
    distractors: ([, s]) => [30 * (s + 2), 30 * (s - 1), 360].filter((x) => x > 0 && x <= 360),
    variants: () => [],
    explain: (s) => (s.id === "each" ? "A full turn of 360° is shared by 12 numbers: 30° from one number to the next" : `${s.inputs[0]} ${s.inputs[0] === 1 ? "step" : "steps"} of 30° make ${s.value}°`),
    domain: [[1, 12], [1, 11]],
    difficulty: ([, s]) => (s % 3 === 0 ? 1 : s <= 6 ? 2 : 3),
    word: ([p, s]) => `A spinner on a board numbered 1 to 12, like a clock, points at ${p}. ${name(p + s)} spins it clockwise and it stops at ${((p + s - 1) % 12) + 1}, less than one full turn later. Through how many degrees did it turn?`,
    teach: {
      idea: "An angle is an amount of turn. A full turn is 360°, a half turn 180°, and a quarter turn is a right angle, 90°. On a clock, each number is one twelfth of a full turn: 30°.",
      method: "Count how many numbers the hand moves past clockwise, then multiply by 30°.",
      visual: ([, s]) => ({ type: "angle", deg: 30 * s }),
      alternatives: [
        { id: "quarters", title: "Use quarter turns", kind: "conceptual", text: ["12 to 3 is a quarter turn (90°), 12 to 6 a half turn (180°), 12 to 9 three quarters (270°).", "Each quarter turn is 3 numbers; find the nearest quarter and add or take away 30° for each number more or less."], visual: () => ({ type: "clock", h: 3, m: 0 }) },
      ],
    },
    limits: "Clockwise turns of less than a full turn between the numbers of a clock face; turns in the other direction and angles between hands at a given time are not here.",
  },
  // ============================================================ circles
  {
    id: "aecirc",
    arity: 2,
    title: "Radius and diameter of a circle",
    competency: CIRC,
    type: "integer",
    mc: true,
    // [dir, x]: dir 0 radius x → diameter; dir 1 diameter x (even) → radius
    parse: (t) => {
      const m = t.toLowerCase().match(/^(radius|diameter)\s*(?:is|=)?\s*(\d+)\s*cm/);
      return m ? [m[1] === "radius" ? 0 : 1, Number(m[2])] : null;
    },
    reject: (p) => {
      if (!inRange(p, [[0, 1], [1, 120]])) return "A radius up to 60 cm or an even diameter up to 120 cm.";
      return p[0] === 0 ? (p[1] > 60 ? "A radius up to 60 cm." : null) : p[1] % 2 || p[1] < 2 ? "An even diameter from 2 to 120 cm." : null;
    },
    prompt: ([dir, x]) => (dir === 0 ? `A circle has a radius of ${x} cm. How long is its diameter, in cm?` : `A circle has a diameter of ${x} cm. How long is its radius, in cm?`),
    solve: ([dir, x]) => ({
      steps: [{ id: dir === 0 ? "double" : "halve", op: dir === 0 ? "multiply" : "divide", competency: CIRC, inputs: [x, 2], value: dir === 0 ? 2 * x : x / 2 }],
      answer: dir === 0 ? 2 * x : x / 2,
    }),
    // independent: a diameter is two radii laid end to end through the centre (add, never multiply or divide)
    validate: ([dir, x], v) => isInt(v) && (dir === 0 ? x + x === v : v + v === x),
    bugs: ([dir, x]) =>
      dir === 0
        ? [
            { id: "same-length", kind: "conceptual", competency: CIRC, says: "The radius and the diameter were taken as the same length; the diameter goes right across through the centre, so it is two radii.", predict: x },
            { id: "halved", kind: "conceptual", competency: CIRC, says: "The radius was halved; the radius is the shorter one (centre to edge), so the diameter is twice as long.", predict: x % 2 === 0 ? x / 2 : null },
          ]
        : [
            { id: "same-length", kind: "conceptual", competency: CIRC, says: "The diameter and the radius were taken as the same length; the radius goes only from the centre to the edge, half of the diameter.", predict: x },
            { id: "doubled", kind: "conceptual", competency: CIRC, says: "The diameter was doubled; the diameter is the longer one, so the radius is half of it.", predict: 2 * x },
          ],
    distractors: ([dir, x]) => (dir === 0 ? [3 * x, 4 * x, x + 2] : [x - 2, x % 4 === 0 ? x / 4 : 3 * x, x + 2]),
    variants: () => [],
    explain: (s) => (s.id === "double" ? `Diameter = 2 × radius = 2 × ${s.inputs[0]} = ${s.value} cm` : `Radius = diameter ÷ 2 = ${s.inputs[0]} ÷ 2 = ${s.value} cm`),
    domain: [[0, 1], [1, 120]],
    difficulty: ([dir, x]) => (x <= 10 ? 1 : dir === 0 || x <= 40 ? 2 : 3),
    word: ([dir, x]) => (dir === 0 ? `${name(x)} draws a round rangoli. The string from the centre to the edge is ${x} cm long. How wide is the rangoli straight across through the centre, in cm?` : x <= 30 ? `A round chapati is ${x} cm across, measured straight through its centre. How far is it from the centre to the edge, in cm?` : `A round table top is ${x} cm across, measured straight through its centre. How far is it from the centre to the edge, in cm?`),
    teach: {
      idea: "The radius goes from the centre to the edge. The diameter goes right across the circle through the centre, so it is made of two radii.",
      method: "To find the diameter, double the radius. To find the radius, halve the diameter.",
      visual: ([dir, x]) => {
        const r = dir === 0 ? x : x / 2;
        return { type: "numberline", from: 0, to: 2 * r, step: r, marks: [0, r, 2 * r], jumps: [[0, r], [r, 2 * r]], note: "edge, centre, edge: two radii make the diameter" };
      },
      alternatives: [
        { id: "fold", title: "Fold a paper circle", kind: "conceptual", text: ["Cut out a circle and fold it in half: the fold is a diameter, and it passes through the centre.", "Fold again: the two folds cross at the centre, and each half of the first fold is a radius."] },
      ],
    },
    limits: "Whole-centimetre radii and diameters; chords, arcs, sectors and the circumference are not here.",
  },
  // ============================================================ lines of symmetry
  {
    id: "aesym",
    arity: 2,
    title: "Letters with a vertical or horizontal line of symmetry",
    competency: SYM,
    type: "integer",
    mc: true,
    // [axis, seed]: axis 0 vertical, 1 horizontal; the seed chooses five different capital letters
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 299]])) return "Five capital letters, a vertical or a horizontal mirror line.";
      const k = symLetters(p[1]).filter((c) => (p[0] ? HSYM : VSYM).has(c)).length;
      return k === 0 || k === 5 ? "Some, but not all, of the letters have the line." : null;
    },
    prompt: ([axis, seed]) => `Look at these capital letters: ${symLetters(seed).join("  ")}. How many of them have a ${axis ? "horizontal line of symmetry (a fold going straight across, left to right" : "vertical line of symmetry (a fold going straight up and down"}, so that the two halves match exactly)?`,
    solve: ([axis, seed]) => {
      const xs = symLetters(seed).filter((c) => (axis ? HSYM : VSYM).has(c));
      return { steps: [{ id: "check", op: "count", competency: SYM, inputs: [axis ? "horizontal" : "vertical", xs.join(", ")], value: xs.length }], answer: xs.length };
    },
    // independent: fold each letter's drawing on a 5 × 5 grid and see whether the halves land on each other
    validate: ([axis, seed], v) => v === symLetters(seed).filter((c) => (axis ? foldsH(c) : foldsV(c))).length,
    bugs: ([axis, seed]) => {
      const ls = symLetters(seed);
      const right = ls.filter((c) => (axis ? HSYM : VSYM).has(c)).length;
      const other = ls.filter((c) => (axis ? VSYM : HSYM).has(c)).length;
      const turn = ls.filter((c) => "NSZ".includes(c)).length;
      const any = ls.filter((c) => VSYM.has(c) || HSYM.has(c)).length;
      return [
        { id: "axis-swap", kind: "conceptual", competency: SYM, says: `The letters were folded the other way (${axis ? "up and down" : "across"}); a ${axis ? "horizontal line goes across, so the top half must match the bottom half" : "vertical line goes up and down, so the left half must match the right half"}.`, predict: other },
        { id: "turn-not-fold", kind: "conceptual", competency: SYM, says: "N, S or Z look the same when turned upside down, but folding them does not make the halves match: turning is not a line of symmetry.", predict: turn ? right + turn : null },
        { id: "any-line", kind: "procedural", competency: SYM, says: `Letters with any line of symmetry were counted; the question asks only for a ${axis ? "horizontal" : "vertical"} one.`, predict: any !== right ? any : null },
      ];
    },
    variants: () => [],
    explain: (s) => (s.value === 0 ? `No letter has a ${s.inputs[0]} line of symmetry` : `${s.inputs[1]} ${s.value === 1 ? "has" : "have"} a ${s.inputs[0]} line of symmetry: ${s.value}`),
    domain: [[0, 1], [0, 299]],
    difficulty: ([axis, seed]) => {
      const ls = symLetters(seed);
      return ls.some((c) => "NSZ".includes(c)) ? 3 : axis ? 2 : 1;
    },
    figure: ([, seed]) => ({ type: "table", head: ["Card 1", "Card 2", "Card 3", "Card 4", "Card 5"], rows: [symLetters(seed)] }),
    word: ([axis, seed]) => `${name(seed)} cuts out the capital letters ${symLetters(seed).join(", ")} from paper for a class chart. ${name(seed)} folds each letter ${axis ? "straight across, from left to right" : "straight down the middle, from top to bottom"}. For how many letters do the two halves match exactly?`,
    teach: {
      idea: "A line of symmetry is a fold line where the two halves of a shape match exactly, like a mirror image.",
      method: `Imagine folding each letter along the line (or stand a mirror on it): if the half you see in the mirror finishes the letter exactly, the letter has that line of symmetry.`,
      alternatives: [
        { id: "mirror", title: "Use a mirror", kind: "conceptual", text: ["Write the letter big and stand a small mirror on the line down its middle (or across its middle).", "If the letter you see, half on paper and half in the mirror, looks just like the real letter, that line is a line of symmetry."] },
      ],
    },
    limits: "Capital letters drawn in plain block capitals (B, K and Q are left out because their shape depends on the font); shapes, designs and drawing the other half are not here.",
  },
  // ============================================================ reflections and translations
  {
    id: "aerefl",
    arity: 4,
    title: "Reflecting a point in a mirror line on a grid",
    competency: TRANS,
    type: "tuple",
    mc: true,
    // [axis, m, x, y]: reflect P(x, y) in x = m (axis 0) or y = m (axis 1)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [1, 9], [0, 10], [0, 10]])) return "A point with coordinates 0 to 10 and a mirror line x = m or y = m, m from 1 to 9 (Grade 5: no negative numbers).";
      const [axis, m, x, y] = p;
      const c = axis ? y : x;
      return c === m || 2 * m - c < 0 || 2 * m - c > 10 ? "The point must be off the line, and its image on the grid (0 to 10)." : null;
    },
    prompt: ([axis, m, x, y]) => `In the picture, the point P is at ${tup(x, y)} and the mirror line is ${axis ? "y" : "x"} = ${n_(m)}. Reflect P in the mirror line. What are the coordinates of its image? Write them as (x, y).`,
    solve: ([axis, m, x, y]) => {
      const c = axis ? y : x;
      const img = axis ? tup(x, 2 * m - y) : tup(2 * m - x, y);
      return {
        steps: [
          { id: "distance", op: "subtract", competency: TRANS, inputs: [c, m], value: c - m },
          { id: "image", op: "reflect", competency: TRANS, inputs: [axis, m, c - m], value: img },
        ],
        answer: img,
      };
    },
    // independent: the mirror line must cut the segment P-image exactly in half, at right angles
    validate: ([axis, m, x, y], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      const [a, b] = t;
      return axis ? a === x && (b + y) / 2 === m && b !== y : b === y && (a + x) / 2 === m && a !== x;
    },
    bugs: ([axis, m, x, y]) => [
      { id: "wrong-coordinate", kind: "conceptual", competency: CART, says: `The wrong coordinate was changed: a mirror line ${axis ? "y = " + n_(m) + " goes across, so the point moves up or down and only y changes" : "x = " + n_(m) + " goes up and down, so the point moves left or right and only x changes"}.`, predict: axis ? (x !== 2 * m - x && 2 * m - x >= 0 && 2 * m - x <= 10 ? tup(2 * m - x, y) : null) : y !== 2 * m - y && 2 * m - y >= 0 && 2 * m - y <= 10 ? tup(x, 2 * m - y) : null },
      { id: "onto-line", kind: "procedural", competency: TRANS, says: "The point was moved only as far as the mirror line; the image is as far beyond the line as P is in front of it.", predict: axis ? tup(x, m) : tup(m, y) },
    ],
    distractors: ([axis, m, x, y]) => [tup(x, y), axis ? tup(x, 2 * m - y + (y > m ? -1 : 1)) : tup(2 * m - x + (x > m ? -1 : 1), y), axis ? tup(2 * m - y, x) : tup(y, 2 * m - x)],
    variants: () => [],
    explain: (s) => (s.id === "distance" ? `P is ${Math.abs(Number(s.value))} ${Math.abs(Number(s.value)) === 1 ? "unit" : "units"} from the mirror line` : `Go the same distance to the other side of the line: the image is ${s.value}`),
    domain: [[0, 1], [1, 9], [0, 10], [0, 10]],
    cap: 400,
    difficulty: ([axis, m, x, y]) => {
      const c = axis ? y : x;
      return Math.abs(c - m) <= 2 ? 1 : axis === 0 ? 2 : 3;
    },
    figure: ([axis, m, x, y]) => ({ type: "plane", points: [[x, y, "P"]], segments: [axis ? [[0, m], [10, m]] : [[m, 0], [m, 10]]], range: 10 }),
    word: ([axis, m, x, y]) => `On a squared map, a straight canal runs along the line ${axis ? "y" : "x"} = ${n_(m)}. A temple stands at ${tup(x, y)}. Its reflection in the still water appears exactly opposite, the same distance from the canal on the other side. At which point is the reflection? Write it as (x, y).`,
    teach: {
      idea: "A mirror image is as far behind the mirror line as the object is in front of it, straight across, at right angles to the line.",
      method: "Count how far P is from the mirror line, then count the same distance on the other side. Only the coordinate that crosses the line changes.",
      visual: ([axis, m, x, y]) => ({ type: "plane", points: [[x, y, "P"], axis ? [x, 2 * m - y, "P′"] : [2 * m - x, y, "P′"]], segments: [axis ? [[0, m], [10, m]] : [[m, 0], [m, 10]]], range: 10 }),
      alternatives: [
        { id: "fold_grid", title: "Fold the grid paper", kind: "conceptual", text: ["Draw the point on squared paper and fold the paper along the mirror line.", "Press hard on the point: the mark it makes on the other side is the image."] },
      ],
    },
    limits: "Single points in the first quadrant (coordinates 0 to 10, no negative numbers at Grade 5) reflected in lines x = m or y = m; reflecting whole figures, slanted mirror lines and drawing are not here (drawing is marked by an educator).",
  },
  {
    id: "aetrans",
    arity: 4,
    title: "Translating a point on a grid",
    competency: TRANS,
    type: "tuple",
    mc: true,
    // [x, y, a, b]: move P(x, y) a units right (left if negative) and b units up (down if negative)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 10], [0, 10], [-4, 4], [-4, 4]])) return "A point with coordinates 0 to 10 moved up to 4 units each way (Grade 5: no negative numbers).";
      const [x, y, a, b] = p;
      return a === 0 || b === 0 || x + a < 0 || x + a > 10 || y + b < 0 || y + b > 10 ? "Moves both across and up or down, staying on the grid (0 to 10)." : null;
    },
    prompt: ([x, y, a, b]) => `The point P is at ${tup(x, y)}. Slide it ${Math.abs(a)} ${Math.abs(a) === 1 ? "unit" : "units"} to the ${a > 0 ? "right" : "left"} and ${Math.abs(b)} ${Math.abs(b) === 1 ? "unit" : "units"} ${b > 0 ? "up" : "down"}. Where is it now? Write (x, y).`,
    solve: ([x, y, a, b]) => ({
      steps: [
        { id: "across", op: "add", competency: CART, inputs: [x, a], value: x + a },
        { id: "updown", op: "add", competency: CART, inputs: [y, b], value: y + b },
      ],
      answer: tup(x + a, y + b),
    }),
    // independent: walk one unit at a time on the grid
    validate: ([x, y, a, b], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      let [px, py] = [x, y];
      for (let i = 0; i < Math.abs(a); i++) px += Math.sign(a);
      for (let i = 0; i < Math.abs(b); i++) py += Math.sign(b);
      return t[0] === px && t[1] === py;
    },
    bugs: ([x, y, a, b]) => [
      { id: "swap-moves", kind: "conceptual", competency: CART, says: "The across move was added to y and the up-down move to x; the first coordinate tells how far across, the second how far up.", predict: onGrid(x + b, y + a) },
      { id: "wrong-way-across", kind: "procedural", competency: CART, says: `The point was moved to the ${a > 0 ? "left" : "right"} instead of the ${a > 0 ? "right" : "left"}: moving right makes x bigger, moving left makes it smaller.`, predict: onGrid(x - a, y + b) },
      { id: "wrong-way-updown", kind: "procedural", competency: CART, says: `The point was moved ${b > 0 ? "down" : "up"} instead of ${b > 0 ? "up" : "down"}: moving up makes y bigger, moving down makes it smaller.`, predict: onGrid(x + a, y - b) },
    ],
    distractors: ([x, y, a, b]) => [tup(x + a, y), tup(x, y + b), onGrid(x - a, y - b), tup(x + a, y + b + (y + b < 10 ? 1 : -1))].filter((t): t is string => t !== null),
    variants: () => [],
    explain: (s) => (s.id === "across" ? `Across: ${n_(Number(s.inputs[0]))} ${Number(s.inputs[1]) > 0 ? "+" : "−"} ${Math.abs(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : `Up or down: ${n_(Number(s.inputs[0]))} ${Number(s.inputs[1]) > 0 ? "+" : "−"} ${Math.abs(Number(s.inputs[1]))} = ${n_(Number(s.value))}`),
    domain: [[0, 10], [0, 10], [-4, 4], [-4, 4]],
    cap: 400,
    difficulty: ([, , a, b]) => (a > 0 && b > 0 ? 1 : a < 0 && b < 0 ? 3 : 2),
    figure: ([x, y]) => ({ type: "plane", points: [[x, y, "P"]], range: 10 }),
    word: ([x, y, a, b]) => `In a board game on a squared grid, ${name(x + y + 5)}'s counter is at ${tup(x, y)}. The card says: move ${Math.abs(a)} to the ${a > 0 ? "right" : "left"} and ${Math.abs(b)} ${b > 0 ? "up" : "down"}. Where does the counter end up? Write (x, y).`,
    teach: {
      idea: "A translation slides a shape without turning or flipping it: every point moves the same distance across and the same distance up or down.",
      method: "Add the move to the right to x (take away a move to the left), and add the move up to y (take away a move down).",
      visual: ([x, y, a, b]) => ({ type: "plane", points: [[x, y, "P"], [x + a, y + b, "P′"]], segments: [[[x, y], [x + a, y]], [[x + a, y], [x + a, y + b]]], range: 10 }),
      alternatives: [
        { id: "walk", title: "Walk it on the grid", kind: "procedural", text: ["Put a finger on P. Count the squares across first, one at a time, then the squares up or down.", "Read the coordinates where your finger stops: across first, then up."] },
      ],
    },
    limits: "One point translated in the first quadrant (coordinates 0 to 10, no negative numbers at Grade 5); translating whole figures, rotations and drawing are not here.",
  },
  // ============================================================ 24-hour clock
  {
    id: "aet24",
    arity: 3,
    title: "Writing a 12-hour time in 24-hour form",
    competency: T24,
    type: "tuple",
    mc: true,
    // [h, k, pm]: h:(5k) a.m. (pm 0) or p.m. (pm 1)
    parse: none,
    reject: (p) => (!inRange(p, [[1, 12], [0, 11], [0, 1]]) ? "A 12-hour time in five-minute steps, a.m. or p.m." : null),
    prompt: ([h, k, pm]) => `Write ${h}:${String(5 * k).padStart(2, "0")} ${pm ? "p.m." : "a.m."} in 24-hour time. Give the hours and the minutes as (hours, minutes); for example, 13:05 is written (13, 5).`,
    solve: ([h, k, pm]) => {
      const H = (h % 12) + 12 * pm;
      return { steps: [{ id: "hours", op: "convert", competency: T24, inputs: [h, pm], value: H }], answer: tup(H, 5 * k) };
    },
    // independent: count the minutes since midnight both ways and compare
    validate: ([h, k, pm], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2 || t[0] < 0 || t[0] > 23 || t[1] < 0 || t[1] > 59) return false;
      const since = (pm ? 12 * 60 : 0) + (h === 12 ? 0 : h * 60) + 5 * k;
      return t[0] * 60 + t[1] === since;
    },
    bugs: ([h, k, pm]) => {
      const m = 5 * k;
      if (h === 12) return pm
        ? [{ id: "noon-plus-12", kind: "conceptual", competency: T24, says: "12 was added to 12 noon; 12 noon is already 12:00 in 24-hour time (there is no 24:00 in the day's times).", predict: tup(24, m) }]
        : [{ id: "midnight-12", kind: "conceptual", competency: T24, says: "12 a.m. is just after midnight, the start of the day: in 24-hour time its hour is 00.", predict: tup(12, m) }];
      return pm
        ? [{ id: "pm-no-add", kind: "conceptual", competency: T24, says: "12 was not added for a p.m. time; after noon the 24-hour clock keeps counting: 1 p.m. is 13, 2 p.m. is 14 …", predict: tup(h, m) }, { id: "add-ten", kind: "procedural", competency: T24, says: "10 was added instead of 12 to the hours.", predict: tup(h + 10, m) }]
        : [{ id: "am-add", kind: "conceptual", competency: T24, says: "12 was added to a morning time; a.m. times keep the same hour in 24-hour time.", predict: tup(h + 12, m) }];
    },
    distractors: ([h, k, pm]) => {
      const H = (h % 12) + 12 * pm;
      return [tup((H + 12) % 24, 5 * k), tup(H, (5 * k + 30) % 60), tup((H + 1) % 24, 5 * k)];
    },
    variants: () => [],
    explain: (s) => (Number(s.inputs[1]) === 1 ? (s.inputs[0] === 12 ? "12 noon stays 12 in 24-hour time" : `p.m.: add 12 to the hours: ${s.inputs[0]} + 12 = ${s.value}`) : s.inputs[0] === 12 ? "12 a.m. is just after midnight: the hour is 00" : `a.m.: the hours stay ${s.value}`),
    domain: [[1, 12], [0, 11], [0, 1]],
    difficulty: ([h, , pm]) => (h === 12 ? 3 : pm ? 2 : 1),
    figure: ([h, k]) => ({ type: "clock", h, m: 5 * k }),
    word: ([h, k, pm]) => `${name(h + k)}'s train to Coimbatore leaves at ${h}:${String(5 * k).padStart(2, "0")} ${pm ? "p.m." : "a.m."}. Railway tickets show times on the 24-hour clock. What time is printed on the ticket? Write (hours, minutes).`,
    teach: {
      idea: "The 24-hour clock counts the hours of the whole day from 00 at midnight to 23. Morning (a.m.) hours stay the same; afternoon and evening (p.m.) hours go on past 12: 1 p.m. is 13, 2 p.m. is 14, and so on.",
      method: "For a.m., keep the hour (but 12 a.m. becomes 00). For p.m., add 12 to the hour (but 12 noon stays 12). The minutes do not change.",
      visual: ([h, k]) => ({ type: "clock", h, m: 5 * k }),
      alternatives: [
        { id: "day_line", title: "A line for the whole day", kind: "conceptual", text: ["Draw a line from 0 (midnight) to 24 (the next midnight), with 12 (noon) in the middle.", "Morning times are on the first half; for an afternoon time, count on past 12: 3 p.m. is 3 more than 12, which is 15."], visual: ([h, , pm]) => ({ type: "numberline", from: 0, to: 24, step: 2, marks: [(h % 12) + 12 * pm] }) },
      ],
    },
    limits: "Times in five-minute steps; the a.m./p.m. label itself is given, not asked, because the answer is written as (hours, minutes).",
  },
  {
    id: "aet12",
    arity: 2,
    title: "Reading a 24-hour time on a 12-hour clock",
    competency: T24,
    type: "tuple",
    mc: true,
    // [H, k]: the 24-hour time H:(5k), with H = 0 or 12 to 23
    parse: none,
    reject: (p) => (!inRange(p, [[0, 23], [0, 11]]) || (p[0] >= 1 && p[0] <= 11) ? "A 24-hour time at midnight's hour or from 12:00 to 23:55, in five-minute steps." : null),
    prompt: ([H, k]) => `A railway timetable shows ${hh(H, 5 * k)}. What time does an ordinary 12-hour clock show then? Write it as (hours, minutes); for example, 4:05 is written (4, 5).`,
    solve: ([H, k]) => {
      const h = H % 12 === 0 ? 12 : H % 12;
      return { steps: [{ id: "hours", op: "convert", competency: T24, inputs: [H], value: h }], answer: tup(h, 5 * k) };
    },
    // independent: run a 12-hour clock forward from midnight, hour by hour, for H hours
    validate: ([H, k], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      let h = 12;
      for (let i = 0; i < H; i++) h = h === 12 ? 1 : h + 1;
      return t[0] === h && t[1] === 5 * k;
    },
    bugs: ([H, k]) => {
      const m = 5 * k;
      if (H === 0) return [{ id: "midnight-zero", kind: "conceptual", competency: T24, says: "00 hours is midnight; a 12-hour clock shows it as 12 (12 a.m.), not 0.", predict: tup(0, m) }];
      if (H === 12) return [{ id: "noon-minus-12", kind: "conceptual", competency: T24, says: "12 was taken away from 12; 12:00 in 24-hour time is 12 noon, so the clock shows 12.", predict: tup(0, m) }];
      return [
        { id: "minus-ten", kind: "procedural", competency: T24, says: "10 was taken away instead of 12; for times after 12 noon, take away 12 from the hours.", predict: tup(H - 10, m) },
        { id: "no-change", kind: "conceptual", competency: T24, says: `The 24-hour number was kept; a 12-hour clock only goes up to 12, so ${H} hours is ${H - 12} p.m.`, predict: tup(H, m) },
      ];
    },
    distractors: ([H, k]) => {
      const h = H % 12 === 0 ? 12 : H % 12;
      return [tup(h === 12 ? 11 : h + 1, 5 * k), tup(h, (5 * k + 30) % 60), tup(H === 0 ? 24 : H, 5 * k)];
    },
    variants: () => [],
    explain: (s) => (s.inputs[0] === 0 ? "00 hours is midnight: the clock shows 12" : s.inputs[0] === 12 ? "12 hours is 12 noon: the clock shows 12" : `After noon, take away 12: ${s.inputs[0]} − 12 = ${s.value}`),
    domain: [[0, 23], [0, 11]],
    difficulty: ([H]) => (H === 0 || H === 12 ? 3 : H >= 20 ? 2 : 1),
    word: ([H, k]) => `The bus to Madurai leaves at ${hh(H, 5 * k)}, as printed on ${name(H + k)}'s ticket. Where are the hands of the wall clock pointing at that time? Write the 12-hour time as (hours, minutes).`,
    teach: {
      idea: "After 12 noon the 24-hour clock keeps counting (13, 14, … 23), but a 12-hour clock starts again at 1. 00 hours is midnight, shown as 12.",
      method: "If the hours are more than 12, take away 12 (it is p.m.). 12 stays 12 (noon). 00 becomes 12 (midnight, a.m.). Keep the minutes.",
      alternatives: [
        { id: "two_rings", title: "Two rings of numbers", kind: "conceptual", text: ["Picture a clock face with an inner ring 1 to 12 and an outer ring 13 to 24 (13 beside 1, 14 beside 2 …).", "The 24-hour number on the outer ring sits next to the 12-hour number on the inner ring."], visual: ([H, k]) => ({ type: "clock", h: H % 12, m: 5 * k }) },
      ],
    },
    limits: "Afternoon, evening, noon and midnight hours (morning hours 01–11 do not change and are left out); a.m./p.m. is not asked for in the answer.",
  },
  {
    id: "aeel24",
    arity: 4,
    title: "Time between two 24-hour times",
    competency: T24,
    skill: ELAPSED,
    type: "tuple",
    mc: true,
    // [h1, k1, h2, k2]: from h1:(5k1) to h2:(5k2) on the same day
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[5, 20], [0, 11], [6, 23], [0, 11]])) return "Two 24-hour times on one day, in five-minute steps.";
      const [h1, k1, h2, k2] = p;
      const d = h2 * 60 + 5 * k2 - (h1 * 60 + 5 * k1);
      return d < 30 || d > 8 * 60 ? "The second time is half an hour to 8 hours after the first." : null;
    },
    prompt: ([h1, k1, h2, k2]) => `How much time passes from ${hh(h1, 5 * k1)} to ${hh(h2, 5 * k2)} on the same day? Write it as (hours, minutes); for example, 2 hours 5 minutes is (2, 5).`,
    solve: ([h1, k1, h2, k2]) => {
      const d = h2 * 60 + 5 * k2 - (h1 * 60 + 5 * k1);
      const borrow = k2 < k1;
      return {
        steps: [
          { id: "minutes", op: "subtract", competency: ELAPSED, inputs: [5 * k2 + (borrow ? 60 : 0), 5 * k1], value: d % 60 },
          { id: "hours", op: "subtract", competency: ELAPSED, inputs: [h2 - (borrow ? 1 : 0), h1], value: Math.floor(d / 60) },
        ],
        answer: tup(Math.floor(d / 60), d % 60),
      };
    },
    // independent: count on from the start in steps of five minutes until the end time
    validate: ([h1, k1, h2, k2], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2 || t[1] < 0 || t[1] > 59) return false;
      let [h, m, steps] = [h1, 5 * k1, 0];
      while (h !== h2 || m !== 5 * k2) {
        m += 5;
        if (m === 60) [h, m] = [h + 1, 0];
        steps++;
        if (steps > 300) return false;
      }
      return t[0] * 60 + t[1] === steps * 5;
    },
    bugs: ([h1, k1, h2, k2]) => {
      const raw = h2 * 100 + 5 * k2 - (h1 * 100 + 5 * k1);
      const borrow = k2 < k1;
      return [
        { id: "subtract-as-number", kind: "conceptual", competency: ELAPSED, says: "The times were subtracted like ordinary numbers, so 1 hour was exchanged for 100 minutes. An hour has only 60 minutes: when you regroup, change 1 hour into 60 minutes.", predict: borrow ? tup(Math.floor(raw / 100), raw % 100) : null },
        { id: "smaller-from-larger", kind: "procedural", competency: ADDSUB, says: "The smaller number of minutes was taken from the larger one; when the end minutes are fewer, change 1 hour into 60 minutes first.", predict: borrow ? tup(h2 - h1, 5 * (k1 - k2)) : null },
        { id: "hours-only", kind: "procedural", competency: ELAPSED, says: "Only the hours were counted and the minutes were left out.", predict: tup(h2 - h1, 0) },
      ];
    },
    distractors: ([h1, k1, h2, k2]) => {
      const d = h2 * 60 + 5 * k2 - (h1 * 60 + 5 * k1);
      const [a, b] = [Math.floor(d / 60), d % 60];
      return [tup(a + 1, b), tup(a, (b + 10) % 60), tup(a + 1, (60 - b) % 60)];
    },
    variants: () => [],
    explain: (s) => (s.id === "minutes" ? `Minutes: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}${Number(s.inputs[0]) >= 60 ? " (1 hour changed into 60 minutes)" : ""}` : `Hours: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[5, 20], [0, 11], [6, 23], [0, 11]],
    cap: 400,
    difficulty: ([h1, k1, h2, k2]) => (k2 >= k1 && h1 >= 12 ? 1 : k2 >= k1 ? 2 : 3),
    word: ([h1, k1, h2, k2]) => {
      const d = h2 * 60 + 5 * k2 - (h1 * 60 + 5 * k1);
      // the Chennai–Tiruchirappalli train takes about 5 to 7 hours; other lengths get an everyday trip instead
      return d >= 300 && d <= 420
        ? `A train leaves Chennai Egmore at ${hh(h1, 5 * k1)} and reaches Tiruchirappalli at ${hh(h2, 5 * k2)} the same day. How long is the journey? Write it as (hours, minutes).`
        : `${name(h1 + k2)} leaves home at ${hh(h1, 5 * k1)} and gets back at ${hh(h2, 5 * k2)} the same day. How long was ${name(h1 + k2)} away? Write it as (hours, minutes).`;
    },
    teach: {
      idea: "Time is counted in sixties: 60 minutes make 1 hour. So when you take away times and need to regroup, 1 hour is exchanged for 60 minutes, not 100.",
      method: "Count on from the start to the next full hour, then the full hours, then the minutes to the end time, and add them up.",
      visual: ([h1, k1, h2, k2]) => ({ type: "numberline", from: h1, to: h2 + (k2 ? 1 : 0), step: 1, marks: [h1 + k1 / 12, h2 + k2 / 12] }),
      alternatives: [
        { id: "count_on", title: "Count on in jumps", kind: "procedural", text: ["Jump from the start time to the next o'clock (for example 09:45 → 10:00 is 15 minutes).", "Jump whole hours to the last o'clock before the end, then jump the leftover minutes. Add the jumps."] },
      ],
    },
    limits: "Two times on the same day, in five-minute steps, up to 8 hours apart; journeys past midnight are not here.",
  },
  // ============================================================ area in squares
  {
    id: "aearea",
    arity: 2,
    title: "Area of a rectangle by counting unit squares",
    competency: AREA,
    type: "integer",
    mc: true,
    // [r, c]: a rectangle of r rows and c columns of unit squares
    parse: none,
    reject: (p) => (!inRange(p, [[2, 10], [2, 12]]) ? "A rectangle of 2 to 10 rows and 2 to 12 columns of squares." : null),
    prompt: ([r, c]) => `Each small square in the picture is 1 square unit. The rectangle has ${r} rows with ${c} squares in each row. What is its area, in square units?`,
    solve: ([r, c]) => ({ steps: [{ id: "rows", op: "multiply", competency: MT, inputs: [r, c], value: r * c, justification: { rule: "unit-coverage" as const, rows: r, columns: c, unit: "square units" } }], answer: r * c }),
    // independent: count the squares one by one, row after row
    validate: ([r, c], v) => {
      let n = 0;
      for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) n++;
      return v === n;
    },
    bugs: ([r, c]) => [
      { id: "perimeter", kind: "conceptual", competency: PERIM, says: "The edges round the outside were counted; that is the perimeter. Area counts the squares that cover the inside.", predict: 2 * (r + c) },
      { id: "add-sides", kind: "conceptual", competency: AREA, says: `The rows and the columns were added (${r} + ${c}); there are ${r} rows of ${c} squares, so multiply.`, predict: r + c },
      { id: "border-only", kind: "procedural", competency: AREA, says: "Only the squares along the border were counted; the squares in the middle are part of the area too.", predict: r > 2 && c > 2 ? 2 * (r + c) - 4 : null },
    ],
    distractors: ([r, c]) => [(r + 1) * c, r * (c + 1), (r - 1) * c],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} rows of ${s.inputs[1]} squares: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} square units`,
    domain: [[2, 10], [2, 12]],
    difficulty: ([r, c]) => (r * c <= 20 ? 1 : r <= 6 && c <= 6 ? 2 : 3),
    figure: ([r, c]) => ({ type: "grid", rows: r, cols: c, shaded: r * c }),
    word: ([r, c]) => `${name(r * c)} covers a rectangular table top with square tiles of 1 unit, as in the picture: ${r} rows with ${c} tiles in each row and no gaps. How many tiles are used? (That is the area in square units.)`,
    teach: {
      idea: "Area is how much flat space a shape covers. We measure it by counting how many unit squares cover it with no gaps and no overlaps.",
      method: "Count the squares in one row, then count the rows. Equal rows can be counted by multiplying: rows × squares in each row.",
      visual: ([r, c]) => ({ type: "grid", rows: r, cols: c, shaded: c }),
      alternatives: [
        { id: "array", title: "See the rows as an array", kind: "conceptual", text: ["The squares sit in equal rows, like chairs in a hall.", "Skip-count one row at a time: 6, 12, 18, … until every row is counted."], visual: ([r, c]) => ({ type: "array", rows: r, cols: c }) },
      ],
    },
    limits: "Whole rectangles drawn on a grid; half squares, irregular shapes and estimating are not here.",
  },
  {
    id: "aeperar",
    arity: 4,
    title: "Choosing area or perimeter in a problem",
    competency: AREA,
    type: "integer",
    mc: true,
    // [need, a, b, ctx]: need 0 area (covering), 1 perimeter (going round); a rectangle a by b
    parse: none,
    reject: (p) => (!inRange(p, [[0, 1], [2, 15], [3, 16], [0, 2]]) || p[1] >= p[2] ? "A rectangle a by b (a < b), covering it or going round it." : null),
    prompt: ([need, a, b, ctx]) => {
      const cover = [`How many square tiles of side 1 m are needed to cover the floor`, `How many 1 cm squares of coloured paper are needed to cover the card`, `How many square mats of side 1 m are needed to cover the stage`][ctx];
      const round = [`How many metres of fencing are needed to go once round the garden`, `How many centimetres of lace are needed to go once round the edge of the card`, `How many metres of rope are needed to go once round the playground`][ctx];
      const thing = [["floor", "garden"], ["card", "card"], ["stage", "playground"]][ctx][need];
      const unit = ctx === 1 ? "cm" : "m";
      return `A rectangular ${thing} is ${b} ${unit} long and ${a} ${unit} wide. ${need ? round : cover}?`;
    },
    solve: ([need, a, b]) => (need ? { steps: [{ id: "perimeter", op: "add", competency: PERIM, inputs: [a, b], value: 2 * (a + b) }], answer: 2 * (a + b) } : { steps: [{ id: "area", op: "multiply", competency: AREA, inputs: [a, b], value: a * b }], answer: a * b }),
    // independent: for covering, lay the unit squares row by row; for going round, walk the edge one unit at a time
    validate: ([need, a, b], v) => {
      let n = 0;
      if (need) {
        for (let i = 0; i < b; i++) n += 2; // the two long sides
        for (let j = 0; j < a; j++) n += 2; // the two short sides
      } else for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) n++;
      return v === n;
    },
    bugs: ([need, a, b]) => [
      need
        ? { id: "area-for-perimeter", kind: "conceptual", competency: AREA, says: "The area was found, but going round the edge needs the perimeter (the length all the way round).", predict: a * b }
        : { id: "perimeter-for-area", kind: "conceptual", competency: AREA, says: "The perimeter was found, but covering the inside needs the area (how many squares fit inside).", predict: 2 * (a + b) },
      { id: "two-sides", kind: "procedural", competency: need ? PERIM : AREA, says: `Only one length and one width were added (${a} + ${b}).${need ? " Going round passes all four sides." : " Covering needs rows × squares in each row."}`, predict: a + b },
    ],
    distractors: ([, a, b]) => [2 * a + b, a + 2 * b, a * b + 2 * (a + b)],
    variants: () => [],
    explain: (s) => (s.id === "area" ? `Covering needs the area: ${s.inputs[0]} rows of ${s.inputs[1]} squares = ${s.value}` : `Going round needs the perimeter: ${s.inputs[1]} + ${s.inputs[0]} + ${s.inputs[1]} + ${s.inputs[0]} = ${s.value}`),
    domain: [[0, 1], [2, 15], [3, 16], [0, 2]],
    cap: 400,
    difficulty: ([, a, b]) => (a * b <= 30 ? 1 : a <= 9 ? 2 : 3),
    word: ([need, a, b, ctx]) => {
      const unit = ctx === 1 ? "cm" : "m";
      return need
        ? `${name(a + b)} wants to put a border of ribbon all the way round a rectangular notice board that is ${b} ${unit} long and ${a} ${unit} wide. How many ${unit === "cm" ? "centimetres" : "metres"} of ribbon are needed?`
        : `${name(a + b)} is painting a rectangular wall picture ${b} ${unit} long and ${a} ${unit} wide, filling it with squares 1 ${unit} by 1 ${unit}. How many squares fill the picture?`;
    },
    teach: {
      idea: "Area is the space inside a shape (how many unit squares cover it). Perimeter is the distance all the way round its edge.",
      method: "Ask: am I covering the inside (area: multiply length × width) or going round the edge (perimeter: add all four sides)?",
      visual: ([, a, b]) => ({ type: "grid", rows: Math.min(a, 10), cols: Math.min(b, 12), shaded: 0 }),
      alternatives: [
        { id: "act_it", title: "Act it out", kind: "conceptual", text: ["Covering a floor: you lay tiles all over it, so you count squares (area).", "Fencing a garden: you walk round the edge, so you add lengths (perimeter)."] },
      ],
    },
    limits: "Rectangles with whole-number sides; shapes made of several rectangles, and square units written with the answer, are not here.",
  },
  // ============================================================ calculating with mixed units
  {
    id: "aemix",
    arity: 4,
    title: "Adding and subtracting measures in two units",
    competency: MIX,
    type: "tuple",
    mc: true,
    // [kind, op, A, B]: kind 0 m cm, 1 kg g, 2 L mL; op 0 add, 1 subtract; A, B mixed measures by index
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 1], [20, 179], [20, 179]])) return "Two measures of 1 to 8 large units and some small units.";
      const [kind, op, A, B] = p;
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      if (op === 0) return s1 + s2 < UNITS[kind].f || s1 + s2 === UNITS[kind].f || b1 + b2 + 1 > 9 ? "An addition that regroups the small units, with an answer under 10 large units." : null;
      return s1 >= s2 || b1 <= b2 ? "A subtraction that needs regrouping, with a positive answer." : null;
    },
    prompt: ([kind, op, A, B]) => {
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      const u = UNITS[kind];
      return `${op ? "Subtract" : "Add"}: ${say(kind, b1, s1)} ${op ? "−" : "+"} ${say(kind, b2, s2)}. Write the answer as (${u.big}, ${u.small}); for example, 3 ${u.big} 45 ${u.small} is (3, 45).`;
    },
    solve: ([kind, op, A, B]) => {
      const f = UNITS[kind].f;
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      if (op === 0) {
        const s = s1 + s2;
        return {
          steps: [
            { id: "small", op: "add", competency: ADDSUB, inputs: [s1, s2], value: s },
            { id: "regroup", op: "regroup", competency: CONV, inputs: [s, f], value: s - f },
            { id: "big", op: "add", competency: MIX, inputs: [b1, b2, 1], value: b1 + b2 + 1 },
          ],
          answer: tup(b1 + b2 + 1, s - f),
        };
      }
      return {
        steps: [
          { id: "borrow", op: "regroup", competency: CONV, inputs: [s1, f], value: s1 + f },
          { id: "small", op: "subtract", competency: ADDSUB, inputs: [s1 + f, s2], value: s1 + f - s2 },
          { id: "big", op: "subtract", competency: MIX, inputs: [b1 - 1, b2], value: b1 - 1 - b2 },
        ],
        answer: tup(b1 - 1 - b2, s1 + f - s2),
      };
    },
    // independent: change both measures into the small unit, add or subtract, and compare with the answer
    validate: ([kind, op, A, B], v) => {
      const t = readTuple(v);
      const f = UNITS[kind].f;
      if (!t || t.length !== 2 || t[1] < 0 || t[1] >= f || t[0] < 0) return false;
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      const x = b1 * f + s1;
      const y = b2 * f + s2;
      return t[0] * f + t[1] === (op ? x - y : x + y);
    },
    bugs: ([kind, op, A, B]) => {
      const f = UNITS[kind].f;
      const u = UNITS[kind];
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      return op === 0
        ? [
            { id: "no-regroup", kind: "conceptual", competency: CONV, says: `${s1 + s2} ${u.small} was left as it is; ${f} ${u.small} make 1 ${u.big}, so change ${f} of them into 1 ${u.big}.`, predict: tup(b1 + b2, s1 + s2) },
            { id: "carry-lost", kind: "procedural", competency: MIX, says: `${f} ${u.small} were taken away, but the 1 ${u.big} they make was not added to the ${u.big}.`, predict: tup(b1 + b2, s1 + s2 - f) },
          ]
        : [
            { id: "smaller-from-larger", kind: "procedural", competency: ADDSUB, says: `${s1} − ${s2} cannot be done, so ${s1} was taken from ${s2}; instead, change 1 ${u.big} into ${f} ${u.small} first.`, predict: tup(b1 - b2, s2 - s1) },
            { id: "borrow-not-taken", kind: "procedural", competency: MIX, says: `1 ${u.big} was changed into ${f} ${u.small}, but the ${u.big} were not made 1 less.`, predict: tup(b1 - b2, s1 + f - s2) },
            ...(f === 1000 ? [{ id: "borrow-100", kind: "conceptual", competency: CONV, says: `1 ${u.big} was changed into 100 ${u.small}; 1 ${u.big} = 1000 ${u.small}.`, predict: s1 + 100 - s2 > 0 ? tup(b1 - 1 - b2, s1 + 100 - s2) : null } as Bug] : []),
          ];
    },
    distractors: ([kind, op, A, B]) => {
      const f = UNITS[kind].f;
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      const tot = op ? b1 * f + s1 - (b2 * f + s2) : b1 * f + s1 + b2 * f + s2;
      const st = UNITS[kind].step;
      const near = tot % f + st < f ? tot % f + st : tot % f - st;
      return [tup(Math.floor(tot / f) + 1, tot % f), tup(Math.max(0, Math.floor(tot / f) - 1), tot % f), tup(Math.floor(tot / f), near)];
    },
    variants: () => [],
    explain: (s) =>
      s.id === "regroup"
        ? `${s.inputs[0]} = ${s.inputs[1]} + ${s.value}: change ${s.inputs[1]} of the small units into 1 large unit`
        : s.id === "borrow"
          ? `Change 1 large unit into ${s.inputs[1]} small units: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`
          : s.id === "small"
            ? `Small units: ${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}`
            : s.op === "add"
              ? `Large units: ${s.inputs[0]} + ${s.inputs[1]} + 1 carried = ${s.value}`
              : `Large units: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`,
    domain: [[0, 2], [0, 1], [20, 179], [20, 179]],
    cap: 450,
    difficulty: ([kind, op]) => (kind === 0 && op === 0 ? 1 : op === 0 || kind === 0 ? 2 : 3),
    word: ([kind, op, A, B]) => {
      const [b1, s1] = mixed(kind, A);
      const [b2, s2] = mixed(kind, B);
      const u = UNITS[kind];
      const thing = u.things[A % 3];
      const who = name(A + B);
      if (kind === 0) return op ? `${who} has ${say(kind, b1, s1)} of ${thing} and cuts off ${say(kind, b2, s2)}. How much ${thing} is left? Write (m, cm).` : `${who} ties together two pieces of ${thing}, ${say(kind, b1, s1)} and ${say(kind, b2, s2)} long (ignore the knot). How long is it now? Write (m, cm).`;
      if (kind === 1) return op ? `A shop has a bag of ${say(kind, b1, s1)} of ${thing}. The shopkeeper sells ${say(kind, b2, s2)}. How much ${thing} is left in the bag? Write (kg, g).` : `${who} buys ${say(kind, b1, s1)} of ${thing} and then ${say(kind, b2, s2)} more. How much ${thing} is that altogether? Write (kg, g).`;
      return op ? `A can holds ${say(kind, b1, s1)} of ${thing}. ${who} pours out ${say(kind, b2, s2)}. How much ${thing} is left? Write (L, mL).` : `${who} pours ${say(kind, b1, s1)} of ${thing} and then ${say(kind, b2, s2)} more into a big vessel. How much ${thing} is in it now? Write (L, mL).`;
    },
    teach: {
      idea: "Measures in two units work like tens and ones, but the change-over is 100 cm = 1 m, 1000 g = 1 kg and 1000 mL = 1 L.",
      method: "Add or subtract the small units first. If the small units reach the change-over number, change them into 1 large unit; if there are too few to subtract, change 1 large unit into small units. Then do the large units.",
      alternatives: [
        { id: "all_small", title: "Change everything into the small unit", kind: "procedural", text: ["Write both measures in the small unit only (for example 2 m 45 cm = 245 cm).", "Add or subtract these numbers, then change the answer back (310 cm = 3 m 10 cm)."] },
      ],
    },
    limits: "Two measures with whole small units (cm in fives, g and mL in fifties) that need regrouping; answers under 10 large units.",
  },
  {
    id: "aemulm",
    arity: 3,
    title: "Multiplying a measure in two units",
    competency: MIX,
    type: "tuple",
    mc: true,
    // [kind, A, n]: n times the mixed measure A
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [20, 99], [2, 9]])) return "A measure of 1 to 4 large units, times 2 to 9.";
      const [kind, A, n] = p;
      const [b, s] = mixed(kind, A);
      const f = UNITS[kind].f;
      return s === 0 || s * n < f || (s * n) % f === 0 || b * n + Math.floor((s * n) / f) > 30 ? "The small units must regroup, with an answer up to 30 large units." : null;
    },
    prompt: ([kind, A, n]) => {
      const [b, s] = mixed(kind, A);
      const u = UNITS[kind];
      return `Work out ${n} × ${say(kind, b, s)}. Write the answer as (${u.big}, ${u.small}); for example, 3 ${u.big} 45 ${u.small} is (3, 45).`;
    },
    solve: ([kind, A, n]) => {
      const f = UNITS[kind].f;
      const [b, s] = mixed(kind, A);
      const sm = s * n;
      const carry = Math.floor(sm / f);
      return {
        steps: [
          { id: "small", op: "multiply", competency: MM, inputs: [s, n], value: sm },
          { id: "regroup", op: "regroup", competency: CONV, inputs: [sm, f], value: carry },
          { id: "big", op: "multiply", competency: MIX, inputs: [b, n, carry], value: b * n + carry },
        ],
        answer: tup(b * n + carry, sm % f),
      };
    },
    // independent: add the measure to itself n times in the small unit, then compare
    validate: ([kind, A, n], v) => {
      const t = readTuple(v);
      const f = UNITS[kind].f;
      if (!t || t.length !== 2 || t[1] < 0 || t[1] >= f) return false;
      const [b, s] = mixed(kind, A);
      let tot = 0;
      for (let i = 0; i < n; i++) tot += b * f + s;
      return t[0] * f + t[1] === tot;
    },
    bugs: ([kind, A, n]) => {
      const f = UNITS[kind].f;
      const u = UNITS[kind];
      const [b, s] = mixed(kind, A);
      return [
        { id: "no-regroup", kind: "conceptual", competency: CONV, says: `${s * n} ${u.small} was left as it is; every ${f} ${u.small} make 1 ${u.big}.`, predict: tup(b * n, s * n) },
        { id: "big-only", kind: "procedural", competency: MIX, says: `Only the ${u.big} were multiplied; the ${u.small} must be multiplied by ${n} too.`, predict: tup(b * n, s) },
        { id: "carry-lost", kind: "procedural", competency: MIX, says: `The extra ${u.small} were changed into ${u.big} but those ${u.big} were not added on.`, predict: tup(b * n, (s * n) % f) },
      ];
    },
    distractors: ([kind, A, n]) => {
      const f = UNITS[kind].f;
      const [b, s] = mixed(kind, A);
      const tot = n * (b * f + s);
      return [tup(Math.floor(tot / f) + 1, tot % f)];
    },
    variants: () => [],
    explain: (s) => (s.id === "small" ? `Small units: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "regroup" ? `${s.inputs[0]} small units make ${s.value} large ${s.value === 1 ? "unit" : "units"} and some left over` : `Large units: ${s.inputs[0]} × ${s.inputs[1]} + ${s.inputs[2]} = ${s.value}`),
    domain: [[0, 2], [20, 99], [2, 9]],
    cap: 400,
    difficulty: ([kind, , n]) => (kind === 0 && n <= 4 ? 1 : n <= 5 ? 2 : 3),
    word: ([kind, A, n]) => {
      const [b, s] = mixed(kind, A);
      const who = name(A + n);
      return [
        `${who} needs ${n} pieces of ribbon, each ${say(kind, b, s)} long, for a school function. How much ribbon is that altogether? Write (m, cm).`,
        `One bag of rice weighs ${say(kind, b, s)}. How much do ${n} such bags weigh? Write (kg, g).`,
        `A family drinks ${say(kind, b, s)} of milk every day. How much milk is that in ${n} days? Write (L, mL).`,
      ][kind];
    },
    teach: {
      idea: "Multiplying a measure is repeated adding: multiply the small units and the large units, then change extra small units into large ones.",
      method: "Multiply the small units; take out every full 100 cm (or 1000 g, 1000 mL) as a large unit. Multiply the large units and add the ones you took out.",
      alternatives: [
        { id: "all_small", title: "Work in the small unit", kind: "procedural", text: ["Change the measure into the small unit only (1 kg 250 g = 1250 g).", "Multiply, then change back: 3 × 1250 g = 3750 g = 3 kg 750 g."] },
      ],
    },
    limits: "A measure of 1 to 4 large units times a single digit, with regrouping; dividing measures and unit costs are not here.",
  },
  // ============================================================ unit conversions
  {
    id: "aeconv",
    arity: 3,
    title: "Changing a measure into the smaller unit",
    competency: CONV,
    type: "integer",
    mc: true,
    // [k, b, s]: b big units and a small part (k 0: s cm; otherwise 5s g, mL or m)
    parse: none,
    reject: (p) => (!inRange(p, [[0, 5], [1, 9], [1, 199]]) || (p[0] === 0 && p[2] > 99) || (p[0] === 4 && p[2] > 9) ? "1 to 9 large units and a small part (up to 99 cm, 9 mm, or 995 g, mL, m or mg)." : null),
    prompt: ([k, b, s]) => `${b} ${CONVK[k].big} ${convSmall(k, s)} ${CONVK[k].small} = how many ${CONVK[k].small}?`,
    solve: ([k, b, s]) => {
      const f = CONVK[k].f;
      return {
        steps: [
          { id: "big", op: "multiply", competency: CONV, inputs: [b, f], value: b * f },
          { id: "add", op: "add", competency: CONV, inputs: [b * f, convSmall(k, s)], value: b * f + convSmall(k, s) },
        ],
        answer: b * f + convSmall(k, s),
      };
    },
    // independent: the inverse — share the answer back into whole large units and what is left over
    validate: ([k, b, s], v) => {
      if (!isInt(v)) return false;
      const f = CONVK[k].f;
      let n = v;
      let big = 0;
      while (n >= f) {
        n -= f;
        big++;
      }
      return big === b && n === convSmall(k, s);
    },
    bugs: ([k, b, s]) => {
      const f = CONVK[k].f;
      const sm = convSmall(k, s);
      return [
        { id: "write-side-by-side", kind: "conceptual", competency: PV, says: `The two numbers were written side by side; ${sm} ${CONVK[k].small} needs ${String(f).length - 1} places, so empty places are filled with zeros.`, predict: Number(`${b}${sm}`) },
        { id: "wrong-factor", kind: "recall", competency: CONV, says: `1 ${CONVK[k].big} was taken as ${f === 1000 ? 100 : f === 100 ? 1000 : 100} ${CONVK[k].small}; 1 ${CONVK[k].big} = ${f} ${CONVK[k].small}.`, predict: b * (f === 1000 ? 100 : f === 100 ? 1000 : 100) + sm },
        { id: "added", kind: "conceptual", competency: CONV, says: "The two numbers were simply added; first change the large units into small units.", predict: b + sm },
      ];
    },
    // near misses: one large unit more or less, or the small part off by a ten (cm) or a hundred (g, mL, m)
    distractors: ([k, b, s]) => {
      const f = CONVK[k].f;
      const sm = convSmall(k, s);
      const d = k === 0 ? 10 : k === 4 ? 1 : 100;
      return [(b + 1) * f + sm, (b - 1) * f + sm, b * f + sm + d, b * f + sm - d].filter((x) => x > 0 && x !== b * f + sm);
    },
    variants: () => [],
    explain: (s) => (s.id === "big" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 5], [1, 9], [1, 199]],
    cap: 450,
    difficulty: ([k, , s]) => {
      const sm = convSmall(k, s);
      const short = String(sm).length < String(CONVK[k].f).length - 1;
      return short ? 3 : k === 0 ? 1 : 2;
    },
    word: ([k, b, s]) => {
      const sm = convSmall(k, s);
      return [
        `A saree border piece is ${b} m ${sm} cm long. How many centimetres long is it?`,
        b <= 5 ? `A watermelon weighs ${b} kg ${sm} g. How many grams does it weigh?` : `A bag of rice weighs ${b} kg ${sm} g. How many grams does it weigh?`,
        b <= 2 ? `A water bottle holds ${b} L ${sm} mL. How many millilitres does it hold?` : `A bucket holds ${b} L ${sm} mL of water. How many millilitres is that?`,
        b <= 2 ? `${name(b + s)} walks ${b} km ${sm} m to school. How many metres is that?` : `${name(b + s)} goes ${b} km ${sm} m by bus to the town library. How many metres is that?`,
        `A crayon is ${b} cm ${sm} mm long. How many millimetres long is it?`,
        `A tablet contains ${b} g ${sm} mg of medicine. How many milligrams is that?`,
      ][k];
    },
    teach: {
      idea: "1 m = 100 cm, 1 cm = 10 mm, 1 kg = 1000 g, 1 g = 1000 mg, 1 L = 1000 mL and 1 km = 1000 m. A measure in two units is the large part changed into small units, plus the small part.",
      method: "Multiply the large units by 100 or 1000, then add the small units. Check the small part fills its places: 3 kg 25 g = 3000 g + 25 g = 3025 g.",
      visual: ([k, b, s]) => ({ type: "table", head: ["Thousands", "Hundreds", "Tens", "Ones"], rows: [String(b * CONVK[k].f + convSmall(k, s)).padStart(4, " ").split("")] }),
      alternatives: [
        { id: "place_chart", title: "Use a place-value chart", kind: "procedural", text: ["Write the large units in the thousands place (for g, mL, m) or hundreds place (for cm).", "Write the small units ending in the ones place, and fill any empty places with 0."] },
      ],
    },
    limits: "Large to small units for m–cm, kg–g, L–mL, km–m, cm–mm and g–mg; changing to the larger unit is the families aeconvu and aeconvd.",
  },
  {
    id: "aeparts",
    arity: 3,
    title: "How many parts make a kilogram or a litre",
    competency: CONV,
    type: "integer",
    mc: true,
    // [q, n, kind]: packets of PARTS[q] g (kind 0) or bottles of PARTS[q] mL (kind 1) making n kg or n L
    parse: none,
    reject: (p) => (!inRange(p, [[0, 4], [1, 9], [0, 1]]) ? "Parts of 100, 125, 200, 250 or 500 making 1 to 9 kg or L." : null),
    prompt: ([q, n, kind]) => `How many ${kind ? "bottles" : "packets"} of ${PARTS[q]} ${kind ? "mL" : "g"} together make ${n} ${kind ? "L" : "kg"}?`,
    solve: ([q, n]) => ({
      steps: [
        { id: "small", op: "convert", competency: CONV, inputs: [n, 1000], value: n * 1000 },
        { id: "share", op: "divide", competency: "MATH.number.long-division", inputs: [n * 1000, PARTS[q]], value: (n * 1000) / PARTS[q] },
      ],
      answer: (n * 1000) / PARTS[q],
    }),
    // independent: fill up one part at a time until the total is reached
    validate: ([q, n], v) => {
      let tot = 0;
      let c = 0;
      while (tot < n * 1000) {
        tot += PARTS[q];
        c++;
      }
      return tot === n * 1000 && v === c;
    },
    bugs: ([q, n, kind]) => [
      { id: "hundred", kind: "recall", competency: CONV, says: `1 ${kind ? "L" : "kg"} was taken as 100 ${kind ? "mL" : "g"}; 1 ${kind ? "L" : "kg"} = 1000 ${kind ? "mL" : "g"}.`, predict: (n * 100) % PARTS[q] === 0 ? (n * 100) / PARTS[q] : null },
      { id: "one-only", kind: "procedural", competency: CONV, says: `The parts in only 1 ${kind ? "L" : "kg"} were found; there are ${n} of them.`, predict: n > 1 ? 1000 / PARTS[q] : null },
      { id: "times-n", kind: "conceptual", competency: CONV, says: `${n} and the number of parts in 1 ${kind ? "L" : "kg"} were added instead of multiplied.`, predict: n > 1 ? n + 1000 / PARTS[q] : null },
    ],
    distractors: ([q, n]) => {
      const a = (n * 1000) / PARTS[q];
      return [2 * a, a % 2 === 0 ? a / 2 : 3 * a, a + n];
    },
    variants: () => [],
    explain: (s) => (s.id === "small" ? `${s.inputs[0]} ${s.inputs[0] === 1 ? "unit is" : "units are"} ${s.value} small units` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} parts`),
    domain: [[0, 4], [1, 9], [0, 1]],
    difficulty: ([q, n]) => (n === 1 || PARTS[q] === 500 ? 1 : PARTS[q] === 125 ? 3 : 2),
    word: ([q, n, kind]) => (kind ? `${name(q + n)} fills small bottles of ${PARTS[q]} mL from a ${n} L can of buttermilk for a class party. How many bottles can be filled?` : `A shopkeeper packs ${n} kg of groundnuts into packets of ${PARTS[q]} g each. How many packets does she make?`),
    teach: {
      idea: "1 kg = 1000 g and 1 L = 1000 mL. Two 500 g packets make 1 kg, four 250 g packets make 1 kg, and so on.",
      method: "Find how many parts make 1 kg (or 1 L): 1000 ÷ the part. Then multiply by the number of kilograms (or litres).",
      visual: ([q]) => ({ type: "bars", title: "Parts in 1 kg", labels: Array.from({ length: 1000 / PARTS[q] }, (_, i) => `${i + 1}`), values: Array.from({ length: 1000 / PARTS[q] }, () => PARTS[q]) }),
      alternatives: [
        { id: "skip_count", title: "Skip-count to 1000", kind: "procedural", text: ["Count up in parts: 250, 500, 750, 1000 — that is 4 parts in 1 kg.", "Each extra kilogram needs the same number of parts again."] },
      ],
    },
    limits: "Parts of 100, 125, 200, 250 and 500 g or mL that divide a whole number of kilograms or litres exactly.",
  },
  // ============================================================ tenths and hundredths
  {
    id: "aedec",
    arity: 3,
    title: "Writing ones, tenths and hundredths as a decimal",
    competency: DEC,
    type: "exact",
    mc: true,
    // [w, t, h]: w wholes, t tenths, h hundredths
    parse: none,
    reject: (p) => (!inRange(p, [[0, 5], [0, 9], [0, 9]]) || (p[1] === 0 && p[2] === 0) || (p[1] === p[2]) ? "Up to 5 wholes, with tenths and hundredths that are not both the same." : null),
    prompt: ([w, t, h]) => `In the picture, a big square (flat) is 1 whole, a rod is one tenth and a small cube is one hundredth. The picture shows ${w} ${w === 1 ? "flat" : "flats"}, ${t} ${t === 1 ? "rod" : "rods"} and ${h} small ${h === 1 ? "cube" : "cubes"}. Write the number they show as a decimal.`,
    solve: ([w, t, h]) => ({
      steps: [
        { id: "tenths", op: "place", competency: DEC, inputs: [t], value: t / 10 },
        { id: "hundredths", op: "place", competency: DEC, inputs: [h], value: h / 100 },
        { id: "total", op: "add", competency: DEC, inputs: [w, t, h], value: ds(100 * w + 10 * t + h) },
      ],
      answer: ds(100 * w + 10 * t + h),
    }),
    // independent: write the number with two decimal places and read its digits back
    validate: ([w, t, h], v) => {
      if (typeof v !== "string" || !/^\d+(\.\d{1,2})?$/.test(v.trim())) return false;
      const [a, b = ""] = v.trim().split(".");
      const d = b.padEnd(2, "0");
      return Number(a) === w && Number(d[0]) === t && Number(d[1]) === h;
    },
    bugs: ([w, t, h]) => [
      t === 0
        ? { id: "zero-tenths-dropped", kind: "conceptual", competency: DEC, says: "The zero tenths were left out, so the hundredths moved into the tenths place; write 0 in the tenths place to keep it.", predict: ds(100 * w + 10 * h) }
        : { id: "places-swapped", kind: "conceptual", competency: DEC, says: "The tenths and hundredths were put in each other's places: the first place after the point is tenths, the second is hundredths.", predict: ds(100 * w + 10 * h + t) },
      { id: "cubes-as-tenths", kind: "conceptual", competency: DEC, says: "The small cubes were counted as tenths too; a small cube is ten times smaller than a rod.", predict: t + h <= 9 && h > 0 ? ds(100 * w + 10 * (t + h)) : null },
      { id: "whole-number", kind: "conceptual", competency: PV, says: "All the pieces were counted as whole ones; only the flats are wholes.", predict: String(w + t + h) },
    ],
    distractors: ([w, t, h]) => [ds(100 * (w + 1) + 10 * t + h), ...(w > 0 ? [ds(10 * t + h)] : []), `${w}.0${t}${h}`],
    variants: () => [],
    explain: (s) => (s.id === "tenths" ? `${s.inputs[0]} tenths = ${ds(10 * Number(s.inputs[0]))}` : s.id === "hundredths" ? `${s.inputs[0]} hundredths = ${ds(Number(s.inputs[0]))}` : `${s.inputs[0]} + ${ds(10 * Number(s.inputs[1]))} + ${ds(Number(s.inputs[2]))} = ${s.value}`),
    domain: [[0, 5], [0, 9], [0, 9]],
    cap: 400,
    difficulty: ([w, t, h]) => (t === 0 || h === 0 ? 3 : w === 0 ? 1 : 2),
    figure: ([w, t, h]) => ({ type: "blocks", hundreds: w, tens: t, ones: h, note: "flat = 1 whole, rod = 1 tenth, cube = 1 hundredth" }),
    word: ([w, t, h]) => `In a class game, a full sheet of 100 squares is 1 whole, a strip of 10 squares is one tenth and a single square is one hundredth. ${name(w + t + h)} has ${w} full ${w === 1 ? "sheet" : "sheets"}, ${t} ${t === 1 ? "strip" : "strips"} and ${h} single ${h === 1 ? "square" : "squares"}. How many sheets is that, as a decimal?`,
    teach: {
      idea: "Splitting 1 whole into 10 equal parts gives tenths; splitting each tenth into 10 gives hundredths. After the decimal point, the first place is tenths and the second is hundredths.",
      method: "Write the wholes, then the point, then the number of tenths, then the number of hundredths. Use 0 for an empty place.",
      visual: ([, t, h]) => ({ type: "grid", rows: 10, cols: 10, shaded: 10 * t + h }),
      alternatives: [
        { id: "hundred_grid", title: "Shade a hundred grid", kind: "conceptual", text: ["A grid of 100 squares is 1 whole: one row (10 squares) is a tenth, one square is a hundredth.", "Shade the rows for the tenths and single squares for the hundredths; 3 rows and 4 squares is 34 hundredths, 0.34."] },
      ],
    },
    limits: "Up to 5 wholes with tenths and hundredths; thousandths, the number line and changing fractions in simplest form are not here.",
  },
  {
    id: "aedecc",
    arity: 4,
    title: "Comparing a tenths decimal with a hundredths decimal",
    competency: DEC,
    type: "exact",
    // [w, t, u, v]: compare w.t with w.uv
    parse: none,
    reject: (p) => (!inRange(p, [[0, 3], [1, 9], [0, 9], [1, 9]]) || p[1] === p[2] ? "Compare w.t with w.uv (different tenths)." : null),
    prompt: ([w, t, u, v]) => {
      const [x, y] = [`${w}.${t}`, `${w}.${u}${v}`];
      return `Which number is greater: ${(t + u + v) % 2 ? `${x} or ${y}` : `${y} or ${x}`}? Write the greater number.`;
    },
    solve: ([w, t, u, v]) => {
      const x = ds(100 * w + 10 * t);
      const y = ds(100 * w + 10 * u + v);
      return { steps: [{ id: "tenths", op: "compare", competency: DEC, inputs: [t, u], value: t > u ? x : y }], answer: t > u ? x : y };
    },
    // independent: write both in hundredths (w.t = w.t0) and compare the whole numbers of hundredths
    validate: ([w, t, u, v], a) => {
      const hx = Number(`${w}${t}0`);
      const hy = Number(`${w}${u}${v}`);
      return hundredths(a) === Math.max(hx, hy);
    },
    bugs: ([w, t, u, v]) => {
      const x = ds(100 * w + 10 * t);
      const y = ds(100 * w + 10 * u + v);
      return t > u
        ? [{ id: "longer-is-larger", kind: "conceptual", competency: DEC, says: `${w}.${u}${v} was taken as greater because ${u}${v} is more than ${t}; compare the tenths first: ${t} tenths ${t === 1 ? "is" : "are"} more than ${u} ${u === 1 ? "tenth" : "tenths"}.`, predict: y }]
        : [{ id: "shorter-is-larger", kind: "conceptual", competency: DEC, says: `${w}.${t} was taken as greater because hundredths are small pieces; but ${w}.${u}${v} has more tenths (${u} against ${t}).`, predict: x }];
    },
    variants: () => [],
    explain: (s) => `Compare the tenths: ${s.inputs[0]} and ${s.inputs[1]}. The greater number is ${s.value}`,
    domain: [[0, 3], [1, 9], [0, 9], [1, 9]],
    cap: 300,
    difficulty: ([, t, u, v]) => (t < u ? 1 : u * 10 + v > t ? 3 : 2),
    word: ([w, t, u, v]) => `${name(t + u)} jumped ${w}.${t} m and ${name(t + u + 1)} jumped ${w}.${u}${v} m in the long jump. Which is the longer jump? Write the length in metres.`,
    teach: {
      idea: "Decimals are compared place by place from the left, like whole numbers: first the wholes, then the tenths, then the hundredths. More digits does not mean bigger.",
      method: "Write both with the same number of places (0.7 = 0.70) and compare them as hundredths: 70 hundredths is more than 65 hundredths.",
      visual: ([, t]) => ({ type: "grid", rows: 10, cols: 10, shaded: 10 * t }),
      alternatives: [
        { id: "money", title: "Think of rupees", kind: "conceptual", text: ["₹0.70 is 70 paise and ₹0.65 is 65 paise.", "70 paise is more, so 0.7 is greater than 0.65."] },
      ],
    },
    limits: "Comparing one tenths decimal with one hundredths decimal with the same whole part; ordering longer lists is not here.",
  },
  // ============================================================ even and odd
  {
    id: "aeeven",
    arity: 1,
    title: "Picking out the even numbers",
    competency: EVEN,
    type: "set",
    // [seed]: six different numbers from 10 to 999
    parse: none,
    reject: (p) => (!inRange(p, [[0, 499]]) || !evenOk(evenList(p[0])) ? "Six numbers with two to four even ones, one ending in 0." : null),
    prompt: ([seed]) => `Which of these numbers are even? ${evenList(seed).join(", ")}. Write all the even ones, separated by commas.`,
    solve: ([seed]) => {
      const ev = evenList(seed).filter((x) => [0, 2, 4, 6, 8].includes(x % 10));
      return { steps: [{ id: "last-digit", op: "classify", competency: EVEN, inputs: evenList(seed), value: ev }], answer: ev };
    },
    // independent: pair up — take away 2 again and again; an even number leaves nothing over
    validate: ([seed], v) => {
      if (!Array.isArray(v)) return false;
      const ev = evenList(seed).filter((x) => {
        let n = x;
        while (n >= 2) n -= 2;
        return n === 0;
      });
      return v.length === ev.length && [...v].sort((a, b) => a - b).every((x, i) => x === [...ev].sort((a, b) => a - b)[i]);
    },
    bugs: ([seed]) => {
      const xs = evenList(seed);
      return [
        { id: "first-digit", kind: "conceptual", competency: EVEN, says: "The first digit was looked at; whether a number is even depends only on its ones digit (the last digit).", predict: xs.filter((x) => Number(String(x)[0]) % 2 === 0) },
        { id: "zero-not-even", kind: "conceptual", competency: EVEN, says: "Numbers ending in 0 were left out; 0 is even (0 things can be shared into pairs with none left over), so 10, 20, 30 … are even.", predict: xs.filter((x) => x % 2 === 0 && x % 10 !== 0) },
        { id: "odd-for-even", kind: "recall", competency: EVEN, says: "The odd numbers were picked; even numbers end in 0, 2, 4, 6 or 8.", predict: xs.filter((x) => x % 2 === 1) },
      ];
    },
    variants: () => [],
    explain: (s) => `Look at the ones digit: numbers ending in 0, 2, 4, 6 or 8 are even: ${(s.value as number[]).join(", ")}`,
    domain: [[0, 499]],
    difficulty: ([seed]) => (evenList(seed).every((x) => x < 100) ? 1 : evenList(seed).filter((x) => x >= 100).length >= 4 ? 3 : 2),
    figure: ([seed]) => ({ type: "table", head: ["Numbers"], rows: evenList(seed).map((x) => [x]) }),
    word: ([seed]) => `On Gandhi Street, all the houses with even numbers are on the left side. ${name(seed)} has letters for houses ${evenList(seed).join(", ")}. Which of these houses are on the left side? Write their numbers, separated by commas.`,
    teach: {
      idea: "An even number of things can be put into pairs with none left over; an odd number always leaves one. Tens and hundreds always pair up, so only the ones digit decides.",
      method: "Look at the last digit: 0, 2, 4, 6 or 8 means even; 1, 3, 5, 7 or 9 means odd.",
      visual: () => ({ type: "array", rows: 2, cols: 7 }),
      alternatives: [
        { id: "pairs", title: "Make pairs", kind: "conceptual", text: ["Draw dots for the ones digit and join them in pairs.", "If every dot has a partner the number is even; if one dot is left alone it is odd."], visual: () => ({ type: "dots", count: 7, rows: 2 }) },
      ],
    },
    limits: "Two- and three-digit numbers in a list of six; sums of even and odd numbers and patterns in addition charts are not here.",
  },
  // ============================================================ large numbers
  {
    id: "aeind",
    arity: 4,
    title: "Writing a number in lakhs and thousands in figures",
    competency: LARGE,
    type: "integer",
    mc: true,
    // [L, T, H, r]: L lakh T thousand H hundred and REST[r]
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 9], [0, 99], [0, 9], [0, 19]])) return "Up to 9 lakh 99 thousand 999.";
      const [L, T, H, r] = p;
      if (L === 0 && T < 10) return "At least five digits.";
      return !(T < 10 || H === 0 || REST[r] < 10) ? "A number with a zero to be written somewhere." : null;
    },
    prompt: (p) => `Write in figures: ${indWords(p)}. (Write the number without commas, for example 407052.)`,
    solve: ([L, T, H, r]) => ({
      steps: [
        { id: "lakhs", op: "place", competency: LARGE, inputs: [L, 100000], value: L * 100000, justification: { rule: "positional-value" as const, digit: L, placeValue: 100000, placeName: "lakhs" } },
        { id: "thousands", op: "place", competency: THOU, inputs: [T, 1000], value: T * 1000, justification: { rule: "positional-value" as const, digit: T, placeValue: 1000, placeName: "thousands" } },
        { id: "rest", op: "place", competency: PV, inputs: [H, REST[r]], value: H * 100 + REST[r], justification: { rule: "positional-value" as const, digit: H, placeValue: 100, placeName: "hundreds" } },
      ],
      answer: L * 100000 + T * 1000 + H * 100 + REST[r],
    }),
    // independent: write the answer with Indian commas and read each period back
    validate: ([L, T, H, r], v) => {
      if (!isInt(v) || v < 0) return false;
      const parts = ind(v).split(",").map(Number);
      const rest = parts.pop()!;
      const th = parts.length ? parts.pop()! : 0;
      const lk = parts.length ? parts.pop()! : 0;
      return !parts.length && lk === L && th === T && rest === H * 100 + REST[r];
    },
    bugs: ([L, T, H, r]) => {
      const ans = L * 100000 + T * 1000 + H * 100 + REST[r];
      const heard = Number(`${L || ""}${T || ""}${H || ""}${REST[r] || ""}`);
      return [
        { id: "no-zeros", kind: "conceptual", competency: PV, says: "The numbers heard were written one after another, without zeros for the empty places; each period has a fixed number of places (lakhs, then 2 for thousands, then 3 for hundreds, tens and ones).", predict: heard !== ans ? heard : null },
        // only where it gives a number: the lakhs digit lands in the ten-thousands place, which is empty when T < 10
        ...(L > 0 && T < 10 ? [{ id: "lakh-as-ten-thousand", kind: "recall", competency: LARGE, says: `A lakh was written like ten thousand, so the ${L} went into the ten-thousands place; 1 lakh = 100 thousand = 1,00,000 (six digits).`, predict: L * 10000 + T * 1000 + H * 100 + REST[r] } as Bug] : []),
      ];
    },
    distractors: ([L, T, H, r]) => [L * 1000000 + T * 1000 + H * 100 + REST[r], L * 100000 + T * 10000 + H * 100 + REST[r], L * 100000 + T * 1000 + H * 10 + REST[r]],
    variants: () => [],
    explain: (s) => (s.id === "lakhs" ? `${s.inputs[0]} lakh = ${ind(Number(s.value))}` : s.id === "thousands" ? `${s.inputs[0]} thousand = ${ind(Number(s.value))}` : `${s.inputs[0]} hundred and ${s.inputs[1]} = ${s.value}; put the periods together`),
    domain: [[0, 9], [0, 99], [0, 9], [0, 19]],
    cap: 400,
    difficulty: ([L, T, H, r]) => [L === 0, T < 10, H === 0, REST[r] < 10].filter(Boolean).length >= 2 ? 3 : L === 0 ? 1 : 2,
    word: (p) => `The number of people who visited a book fair in Chennai was announced as "${indWords(p)}". ${name(p[1] + p[2])} writes it down in figures. What does ${name(p[1] + p[2])} write? (Write the number without commas.)`,
    teach: {
      idea: "In the Indian system the places are grouped as ones–tens–hundreds, then thousands–ten thousands, then lakhs–ten lakhs. Every place gets a digit, so empty places get 0.",
      method: "Draw a place-value chart (L, TTh, Th, H, T, O). Write each part in its own places, fill empty places with 0, then put commas: 4,07,052.",
      visual: ([L, T, H, r]) => ({ type: "table", head: ["L", "TTh", "Th", "H", "T", "O"], rows: [String(L * 100000 + T * 1000 + H * 100 + REST[r]).padStart(6, "0").split("")] }),
      alternatives: [
        { id: "periods", title: "Fill the periods", kind: "procedural", text: ["Write three boxes for hundreds-tens-ones, two boxes for thousands, and one or two for lakhs.", "Fill each period from its right, and put 0 in any empty box."] },
      ],
    },
    limits: "Numbers up to 9,99,999 in the Indian system; crores and the international system (millions) are not here.",
  },
  {
    id: "aecmp",
    arity: 1,
    title: "Putting large numbers in ascending order",
    competency: LARGE,
    type: "tuple",
    mc: true,
    // [seed]: three five-digit numbers with the same digits and a four-digit number with a bigger first digit
    parse: none,
    reject: (p) => (!inRange(p, [[0, 299]]) ? "A list of four numbers." : null),
    prompt: ([seed]) => `Write these numbers in ascending order (smallest first): ${cmpList(seed).map(ind).join("; ")}. Write the list in brackets without commas inside the numbers, for example (1234, 5678, …).`,
    solve: ([seed]) => {
      const xs = [...cmpList(seed)].sort((a, b) => a - b);
      return { steps: [{ id: "order", op: "compare", competency: LARGE, inputs: cmpList(seed), value: `(${xs.join(", ")})` }], answer: `(${xs.join(", ")})` };
    },
    // independent: the answer uses each number once, and each one is less than the next (checked by subtraction)
    validate: ([seed], v) => {
      const t = readTuple(v);
      const xs = cmpList(seed);
      if (!t || t.length !== xs.length) return false;
      if (![...t].every((x) => xs.includes(x)) || new Set(t).size !== xs.length) return false;
      for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] <= 0) return false;
      return true;
    },
    bugs: ([seed]) => {
      const xs = cmpList(seed);
      return [
        { id: "first-digit-only", kind: "conceptual", competency: LARGE, says: "The numbers were compared by their first digits only; a number with fewer digits is always smaller, so count the digits first.", predict: `(${[...xs].sort((a, b) => (String(a) < String(b) ? -1 : 1)).join(", ")})` },
        { id: "descending", kind: "procedural", competency: LARGE, says: "The list was written from greatest to smallest; ascending means smallest first.", predict: `(${[...xs].sort((a, b) => b - a).join(", ")})` },
      ];
    },
    distractors: ([seed]) => {
      const s = [...cmpList(seed)].sort((a, b) => a - b);
      return [`(${[s[0], s[2], s[1], s[3]].join(", ")})`, `(${[s[0], s[1], s[3], s[2]].join(", ")})`];
    },
    variants: () => [],
    explain: (s) => `Fewest digits first; numbers with the same number of digits are compared place by place from the left: ${s.value}`,
    domain: [[0, 299]],
    difficulty: () => 2,
    word: ([seed]) => `${name(seed)} notes the kilometres travelled by four buses of a depot in Salem: ${cmpList(seed).map(ind).join("; ")}. List them from the shortest distance to the longest, in brackets, without commas inside the numbers.`,
    teach: {
      idea: "A number with more digits is bigger. When two numbers have the same number of digits, the first place where their digits differ decides.",
      method: "First sort by how many digits each number has. Then, for numbers with the same number of digits, compare ten thousands, then thousands, then hundreds … until the digits differ.",
      visual: ([seed]) => ({ type: "table", head: ["TTh", "Th", "H", "T", "O"], rows: cmpList(seed).map((x) => String(x).padStart(5, " ").split("")) }),
      alternatives: [
        { id: "chart", title: "Line them up in a place-value chart", kind: "procedural", text: ["Write each number in a place-value chart so the ones are in one column.", "Read down the chart from the left: the first column where the digits differ shows which number is bigger."] },
      ],
    },
    limits: "Four- and five-digit numbers, four at a time; numbers in lakhs and crores and descending order are not asked here.",
  },
  // ============================================================ × and ÷ by 10, 100, 1000
  {
    id: "aep10",
    arity: 3,
    title: "Multiplying and dividing by 10, 100 and 1000",
    competency: P10,
    type: "integer",
    mc: true,
    // [op, k, m]: op 0: m × 10^k; op 1: (m × 10^k) ÷ 10^k
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d+)([×x*÷/])(10|100|1000)=?\??$/);
      if (!m) return null;
      const k = m[3].length - 1;
      const op = "×x*".includes(m[2]) ? 0 : 1;
      const a = Number(m[1]);
      return op === 0 ? [0, k, a] : a % 10 ** k === 0 ? [1, k, a / 10 ** k] : null;
    },
    reject: (p) => (!inRange(p, [[0, 1], [1, 3], [2, 999]]) || (p[0] === 1 && p[1] === 3 && p[2] > 99) ? "A whole number up to 999 times 10, 100 or 1000, or a multiple divided back exactly." : null),
    prompt: ([op, k, m]) => (op === 0 ? `${m} × ${10 ** k} = ?` : `${m * 10 ** k} ÷ ${10 ** k} = ?`),
    solve: ([op, k, m]) => ({ steps: [{ id: op ? "remove-zeros" : "add-zeros", op: op ? "divide" : "multiply", competency: P10, inputs: [op ? m * 10 ** k : m, 10 ** k], value: op ? m : m * 10 ** k }], answer: op ? m : m * 10 ** k }),
    // independent: multiplying — add the number to itself 10^k times; dividing — count how many 10^k fit (repeated subtraction)
    validate: ([op, k, m], v) => {
      if (!isInt(v)) return false;
      const p = 10 ** k;
      if (op === 0) {
        let s = 0;
        for (let i = 0; i < p; i++) s += m;
        return v === s;
      }
      let n = m * p;
      let c = 0;
      while (n > 0) {
        n -= p;
        c++;
      }
      return n === 0 && v === c;
    },
    bugs: ([op, k, m]) => {
      const p = 10 ** k;
      return op === 0
        ? [
            { id: "zeros-short", kind: "procedural", competency: P10, says: `Too few zeros were put on: × ${p} puts ${k} ${k === 1 ? "zero" : "zeros"} on the end (every digit moves ${k} ${k === 1 ? "place" : "places"} to the left).`, predict: m * 10 ** (k - 1) === m ? null : m * 10 ** (k - 1) },
            { id: "zeros-extra", kind: "procedural", competency: P10, says: `Too many zeros were put on: × ${p} puts exactly ${k} ${k === 1 ? "zero" : "zeros"} on the end.`, predict: m * 10 ** (k + 1) },
            { id: "added", kind: "conceptual", competency: P10, says: `${p} was added instead of multiplied.`, predict: m + p },
          ]
        : [
            { id: "zeros-short", kind: "procedural", competency: P10, says: `Too few zeros were taken off: ÷ ${p} takes ${k} ${k === 1 ? "zero" : "zeros"} off the end.`, predict: m * 10 },
            { id: "zeros-extra", kind: "procedural", competency: P10, says: `Too many zeros were taken off: ÷ ${p} takes off only ${k} ${k === 1 ? "zero" : "zeros"}.`, predict: m % 10 === 0 ? m / 10 : null },
            { id: "subtracted", kind: "conceptual", competency: P10, says: `${p} was subtracted instead of divided.`, predict: m * p - p },
          ];
    },
    distractors: ([op, k, m]) => (op === 0 ? [m * 10 ** (k + 2), m * 10 ** (k + 1), m] : [m * 10, m * 100, m * 10 ** k]),
    variants: () => [],
    explain: (s) => (s.id === "add-zeros" ? `× ${s.inputs[1]}: each digit moves ${String(s.inputs[1]).length - 1} ${String(s.inputs[1]).length === 2 ? "place" : "places"} left: ${s.inputs[0]} → ${s.value}` : `÷ ${s.inputs[1]}: each digit moves ${String(s.inputs[1]).length - 1} ${String(s.inputs[1]).length === 2 ? "place" : "places"} right: ${s.inputs[0]} → ${s.value}`),
    domain: [[0, 1], [1, 3], [2, 999]],
    cap: 400,
    difficulty: ([op, k, m]) => (k === 1 && m < 100 ? 1 : m % 10 === 0 || op === 1 ? 3 : 2),
    word: ([op, k, m]) => (op === 0 ? `A shop gets ${m} boxes of chalk. Each box has ${10 ** k} sticks. How many sticks of chalk is that?` : `${m * 10 ** k} pencils are packed in bundles of ${10 ** k}. How many bundles are made?`),
    teach: {
      idea: "Multiplying by 10 makes every digit worth ten times as much, so each digit moves one place to the left and a 0 fills the ones place. Dividing by 10 moves every digit one place to the right.",
      method: "× 10, × 100, × 1000: write 1, 2 or 3 zeros on the end. ÷ 10, ÷ 100, ÷ 1000 (of a number ending in enough zeros): take 1, 2 or 3 zeros off the end.",
      visual: ([op, k, m]) => ({ type: "table", head: ["", "Th", "H", "T", "O"], rows: [["before", ...String(op ? m * 10 ** k : m).padStart(4, " ").slice(-4).split("")], ["after", ...String(op ? m : m * 10 ** k).padStart(4, " ").slice(-4).split("")]] }),
      alternatives: [
        { id: "blocks", title: "Swap each block for a bigger one", kind: "conceptual", text: ["× 10 changes every one into a ten, every ten into a hundred, every hundred into a thousand.", "So 34 (3 tens, 4 ones) × 10 is 3 hundreds and 4 tens: 340."], visual: ([, , m]) => ({ type: "blocks", hundreds: Math.floor((m % 1000) / 100), tens: Math.floor((m % 100) / 10), ones: m % 10 }) },
      ],
    },
    limits: "Whole numbers up to 999 multiplied by 10, 100 or 1000, and exact divisions back; remainders and decimals are not here.",
  },
  {
    id: "aemult",
    arity: 3,
    title: "Multiplying by a multiple of 10 or 100",
    competency: P10,
    type: "integer",
    mc: true,
    // [a, d, k]: a × (d × 10^k)
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d{2})[×x*]([2-9])(0{1,2})=?\??$/);
      return m ? [Number(m[1]), Number(m[2]), m[3].length] : null;
    },
    reject: (p) => (!inRange(p, [[11, 99], [2, 9], [1, 2]]) || p[0] % 10 === 0 ? "A two-digit number (not a multiple of 10) times 20 to 90 or 200 to 900." : null),
    prompt: ([a, d, k]) => `${a} × ${d * 10 ** k} = ?`,
    solve: ([a, d, k]) => ({
      steps: [
        { id: "product", op: "multiply", competency: MM, inputs: [a, d], value: a * d },
        { id: "zeros", op: "multiply", competency: P10, inputs: [a * d, 10 ** k], value: a * d * 10 ** k },
      ],
      answer: a * d * 10 ** k,
    }),
    // independent: add a to itself d × 10^k times
    validate: ([a, d, k], v) => {
      let s = 0;
      for (let i = 0; i < d * 10 ** k; i++) s += a;
      return v === s;
    },
    bugs: ([a, d, k]) => [
      { id: "zeros-forgotten", kind: "procedural", competency: P10, says: `${a} × ${d} was found but the ${k === 1 ? "zero" : "zeros"} of ${d * 10 ** k} ${k === 1 ? "was" : "were"} not put back on the end.`, predict: a * d },
      { id: "zeros-extra", kind: "procedural", competency: P10, says: `One zero too many was put on the end; ${d * 10 ** k} has ${k === 1 ? "one zero" : "two zeros"}.`, predict: a * d * 10 ** (k + 1) },
      { id: "tens-only", kind: "procedural", competency: MM, says: `Only the tens digit of ${a} was multiplied; the ones digit must be multiplied too.`, predict: Math.floor(a / 10) * 10 * d * 10 ** k },
    ],
    variants: () => [],
    explain: (s) => (s.id === "product" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `× ${s.inputs[1]}: put ${String(s.inputs[1]).length - 1} ${String(s.inputs[1]).length === 2 ? "zero" : "zeros"} on the end: ${s.value}`),
    domain: [[11, 99], [2, 9], [1, 2]],
    cap: 400,
    difficulty: ([a, d, k]) => (a * d < 100 && k === 1 ? 1 : k === 1 ? 2 : 3),
    word: ([a, d, k]) => `A bus ticket to the Transport Museum costs ₹${d * 10 ** k}. How many rupees do ${a} tickets cost?`,
    teach: {
      idea: `Multiplying by 40 is multiplying by 4 and then by 10, because 40 = 4 × 10.`,
      method: "Multiply by the non-zero digit first, then put the zeros of the multiplier on the end of the answer.",
      visual: ([a, d]) => ({ type: "array", rows: d, cols: Math.min(a, 20) }),
      alternatives: [
        { id: "split", title: "Split the two-digit number", kind: "procedural", text: ["Break the two-digit number into tens and ones: 23 × 40 = 20 × 40 + 3 × 40.", "800 + 120 = 920."] },
      ],
    },
    limits: "A two-digit number times a single digit followed by one or two zeros.",
  },
  // ============================================================ rounding
  {
    id: "aeround",
    arity: 2,
    title: "Rounding to the nearest ten, hundred or thousand",
    competency: ROUND,
    type: "integer",
    mc: true,
    // [k, n]: round n to the nearest 10^k
    parse: (t) => {
      const m = t.toLowerCase().match(/round\s+(\d+)\s+to\s+the\s+nearest\s+(ten|hundred|thousand)/);
      return m ? [{ ten: 1, hundred: 2, thousand: 3 }[m[2] as "ten"], Number(m[1])] : null;
    },
    reject: (p) => {
      if (!inRange(p, [[1, 3], [11, 9999]])) return "Numbers 11 to 9999 rounded to the nearest 10, 100 or 1000.";
      const [k, n] = p;
      const u = 10 ** k;
      return n < u || n % u === 0 || (k === 1 && n > 999) ? "A number bigger than the place, not already a multiple of it." : null;
    },
    prompt: ([k, n]) => `Round ${ind(n)} to the nearest ${["", "ten", "hundred", "thousand"][k]}.`,
    solve: ([k, n]) => {
      const u = 10 ** k;
      const digit = Math.floor((n % u) / (u / 10));
      return {
        steps: [
          { id: "look", op: "compare", competency: ROUND, inputs: [n, u], value: digit },
          { id: "round", op: "round", competency: ROUND, inputs: [n, u], value: roundTo(n, u) },
        ],
        answer: roundTo(n, u),
      };
    },
    // independent: list the two multiples on each side and pick the closer one (halfway goes up)
    validate: ([k, n], v) => {
      const u = 10 ** k;
      let below = 0;
      while (below + u <= n) below += u;
      const above = below + u;
      return v === (n - below < above - n ? below : above);
    },
    bugs: ([k, n]) => {
      const u = 10 ** k;
      const down = Math.floor(n / u) * u;
      const digit = Math.floor((n % u) / (u / 10));
      return [
        { id: "always-down", kind: "conceptual", competency: ROUND, says: `The digits after the ${["", "tens", "hundreds", "thousands"][k]} were just changed to zeros; when the next digit is 5 or more, round up.`, predict: down },
        { id: "always-up", kind: "conceptual", competency: ROUND, says: `The number was rounded up, but the next digit is less than 5, so it is nearer to ${ind(down)}.`, predict: digit < 5 ? down + u : null },
        { id: "wrong-place", kind: "procedural", competency: PV, says: `The number was rounded to the wrong place (to the nearest ${["", "hundred", "ten", "hundred"][k]} instead of the nearest ${["", "ten", "hundred", "thousand"][k]}).`, predict: k > 1 ? roundTo(n, u / 10) : roundTo(n, 100) },
      ];
    },
    distractors: ([k, n]) => {
      const u = 10 ** k;
      const down = Math.floor(n / u) * u;
      return [down, down + u, down - u, roundTo(n, u / 10), roundTo(n, 10), down + 2 * u, roundTo(n, 10 * u)].filter((x) => x > 0 && x !== n);
    },
    variants: () => [],
    explain: (s) => (s.id === "look" ? `Look at the digit after the place you round to: it is ${s.value}` : `${s.inputs[0]} is nearer to ${s.value}`),
    domain: [[1, 3], [11, 9999]],
    cap: 450,
    difficulty: ([k, n]) => {
      const u = 10 ** k;
      const digit = Math.floor((n % u) / (u / 10));
      return digit === 5 || (roundTo(n, u) % (10 * u) === 0) ? 3 : k === 1 ? 1 : 2;
    },
    figure: ([k, n]) => {
      const u = 10 ** k;
      const lo = Math.floor(n / u) * u;
      return { type: "numberline", from: lo, to: lo + u, step: u / 10, marks: [n] };
    },
    word: ([k, n]) => `${ind(n)} people came to watch a kabaddi match in ${["", "a village", "a town", "Tiruppur"][k]}. A newspaper rounds the number to the nearest ${["", "ten", "hundred", "thousand"][k]}. What number does it print?`,
    teach: {
      idea: "Rounding finds the nearest 'round' number: on a number line, which ten (hundred, thousand) is the number closer to? A number exactly halfway is rounded up.",
      method: "Look at the digit just to the right of the place you are rounding to. If it is 0–4, round down (keep the place, zeros after). If it is 5–9, round up (add 1 to the place, zeros after).",
      visual: ([k, n]) => {
        const u = 10 ** k;
        const lo = Math.floor(n / u) * u;
        return { type: "numberline", from: lo, to: lo + u, step: u / 10, marks: [n, lo + u / 2] };
      },
      alternatives: [
        { id: "hill", title: "The rounding hill", kind: "conceptual", text: ["Picture the numbers from one ten to the next as a hill, with the halfway number at the top.", "A number before the top rolls back down to the lower ten; at the top or after it, it rolls on to the higher ten."] },
      ],
    },
    limits: "Whole numbers up to 9999; rounding decimals and large numbers in lakhs is not here.",
  },
  {
    id: "aeest",
    arity: 4,
    title: "Estimating a sum or difference by rounding",
    competency: ROUND,
    type: "integer",
    mc: true,
    // [k, a, b, op]: k 1: two-digit a, b rounded to tens; k 2: three-digit numbers made from a and b, rounded to hundreds
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[1, 2], [11, 99], [11, 99], [0, 1]])) return "Two two-digit (round to tens) or three-digit (round to hundreds) numbers.";
      const [k, op] = [p[0], p[3]];
      const [x, y] = estNums(p);
      const u = 10 ** k;
      if (x % u === 0 || y % u === 0 || (x % u) * 2 === u || (y % u) * 2 === u) return "Neither number is a multiple of the place or exactly halfway.";
      if (op === 1 && x <= y) return "A difference with the larger number first.";
      const e = op ? roundTo(x, u) - roundTo(y, u) : roundTo(x, u) + roundTo(y, u);
      return e <= 0 ? "A positive estimate." : null;
    },
    prompt: (p) => {
      const [x, y] = estNums(p);
      return `Estimate ${x} ${p[3] ? "−" : "+"} ${y} by rounding each number to the nearest ${p[0] === 1 ? "ten" : "hundred"} first.`;
    },
    solve: (p) => {
      const [x, y] = estNums(p);
      const u = 10 ** p[0];
      const [rx, ry] = [roundTo(x, u), roundTo(y, u)];
      return {
        steps: [
          { id: "rx", op: "round", competency: ROUND, inputs: [x, u], value: rx },
          { id: "ry", op: "round", competency: ROUND, inputs: [y, u], value: ry },
          { id: "combine", op: p[3] ? "subtract" : "add", competency: ADDSUB, inputs: [rx, ry], value: p[3] ? rx - ry : rx + ry },
        ],
        answer: p[3] ? rx - ry : rx + ry,
      };
    },
    // independent: find each number's nearest multiple by walking out from it, then combine
    validate: (p, v) => {
      const [x, y] = estNums(p);
      const u = 10 ** p[0];
      // step down and up from n to the nearest multiples; the closer one wins
      const near = (n: number) => {
        let lo = n;
        while (lo % u !== 0) lo--;
        let hi = n;
        while (hi % u !== 0) hi++;
        return n - lo < hi - n ? lo : hi;
      };
      return v === (p[3] ? near(x) - near(y) : near(x) + near(y));
    },
    bugs: (p) => {
      const [x, y] = estNums(p);
      const u = 10 ** p[0];
      const exact = p[3] ? x - y : x + y;
      const [dx, dy] = [Math.floor(x / u) * u, Math.floor(y / u) * u];
      return [
        { id: "exact", kind: "procedural", competency: ROUND, says: "The exact answer was worked out; an estimate rounds the numbers first so it can be done in your head.", predict: exact },
        { id: "round-down", kind: "conceptual", competency: ROUND, says: "Both numbers were rounded down (digits just cut off); round up when the next digit is 5 or more.", predict: p[3] ? dx - dy : dx + dy },
        { id: "round-answer", kind: "procedural", competency: ROUND, says: "The exact answer was rounded at the end; the question asks you to round each number first.", predict: roundTo(exact, u) },
      ];
    },
    distractors: (p) => {
      const [x, y] = estNums(p);
      const u = 10 ** p[0];
      const e = p[3] ? roundTo(x, u) - roundTo(y, u) : roundTo(x, u) + roundTo(y, u);
      return [e + u, e - u, e + 2 * u].filter((v) => v > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "combine" ? `${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} rounds to ${s.value}`),
    domain: [[1, 2], [11, 99], [11, 99], [0, 1]],
    cap: 400,
    difficulty: ([k, , , op]) => (k === 1 && op === 0 ? 1 : k === 1 || op === 0 ? 2 : 3),
    word: (p) => {
      const [x, y] = estNums(p);
      return p[3] ? `A school library has ${x} books. ${y} of them are lent out. About how many books are left on the shelves? Estimate by rounding each number to the nearest ${p[0] === 1 ? "ten" : "hundred"} first.` : `${name(x)}'s school collected ${x} kg of old newspaper in June and ${y} kg in July. About how many kilograms is that altogether? Estimate by rounding each number to the nearest ${p[0] === 1 ? "ten" : "hundred"} first.`;
    },
    teach: {
      idea: "An estimate is a quick, close answer. Rounding each number to a ten or hundred first makes the sum or difference easy to do in your head, and it tells you if an exact answer is sensible.",
      method: "Round each number to the place asked for, then add or subtract the rounded numbers.",
      visual: (p) => {
        const [x] = estNums(p);
        const u = 10 ** p[0];
        const lo = Math.floor(x / u) * u;
        return { type: "numberline", from: lo, to: lo + u, step: u / 10, marks: [x] };
      },
      alternatives: [
        { id: "check", title: "Use the estimate as a check", kind: "conceptual", text: ["Work the exact answer, then compare it with the estimate.", "If they are far apart, look again for a mistake in the exact working."] },
      ],
    },
    limits: "Sums and differences of two two-digit numbers (to tens) or two three-digit numbers (to hundreds); products and halfway values are not here.",
  },
  // ============================================================ multi-step problems
  {
    id: "aeshop",
    arity: 5,
    title: "Shopping: total cost and change",
    competency: MULTI,
    type: "integer",
    mc: true,
    // [i, q1, j, q2, nIdx]: q1 items at PRICES[i], q2 at PRICES[j], paid with NOTES[nIdx]
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 17], [2, 5], [0, 17], [1, 3], [0, 3]])) return "Two kinds of item, paid with one note.";
      const [i, q1, j, q2, k] = p;
      const tot = q1 * PRICES[i] + q2 * PRICES[j];
      return i === j || tot >= NOTES[k] || (k > 0 && tot < NOTES[k - 1]) ? "The note is the smallest one that covers the bill." : null;
    },
    prompt: ([i, q1, j, q2, k]) => {
      const [a, b, b1] = SHOP[(i + j) % SHOP.length];
      return `In a shop, ${a} cost ₹${PRICES[i]} each and ${b} cost ₹${PRICES[j]} each. ${name(i + j + k)} buys ${q1} ${a} and ${q2} ${q2 === 1 ? b1 : b}, and pays with a ₹${NOTES[k]} note. How much change, in rupees, should ${name(i + j + k)} get back?`;
    },
    solve: ([i, q1, j, q2, k]) => {
      const c1 = q1 * PRICES[i];
      const c2 = q2 * PRICES[j];
      return {
        steps: [
          { id: "cost1", op: "multiply", competency: MM, inputs: [q1, PRICES[i]], value: c1 },
          { id: "cost2", op: "multiply", competency: MM, inputs: [q2, PRICES[j]], value: c2 },
          { id: "total", op: "add", competency: ADDSUB, inputs: [c1, c2], value: c1 + c2 },
          { id: "change", op: "subtract", competency: "MATH.measurement.money-change", inputs: [NOTES[k], c1 + c2], value: NOTES[k] - c1 - c2 },
        ],
        answer: NOTES[k] - c1 - c2,
      };
    },
    // independent: count up from the bill to the note, a rupee at a time, after adding up the items one by one
    validate: ([i, q1, j, q2, k], v) => {
      let bill = 0;
      for (let n = 0; n < q1; n++) bill += PRICES[i];
      for (let n = 0; n < q2; n++) bill += PRICES[j];
      let c = 0;
      while (bill < NOTES[k]) {
        bill++;
        c++;
      }
      return v === c;
    },
    bugs: ([i, q1, j, q2, k]) => {
      const tot = q1 * PRICES[i] + q2 * PRICES[j];
      return [
        { id: "no-multiply", kind: "procedural", competency: MULTI, says: "The price of one of each item was used; the prices must be multiplied by how many were bought.", predict: NOTES[k] - PRICES[i] - PRICES[j] },
        { id: "total-not-change", kind: "procedural", competency: MULTI, says: "The total cost was given; the question asks for the change, so take the total away from the note.", predict: tot },
        { id: "one-item", kind: "procedural", competency: MULTI, says: "Only the first item was paid for; add the cost of both kinds of item before finding the change.", predict: NOTES[k] - q1 * PRICES[i] },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "cost1" || s.id === "cost2" ? `${s.inputs[0]} × ₹${s.inputs[1]} = ₹${s.value}` : s.id === "total" ? `Total: ₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}` : `Change: ₹${s.inputs[0]} − ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[0, 17], [2, 5], [0, 17], [1, 3], [0, 3]],
    cap: 400,
    difficulty: ([, , , , k]) => (k === 0 ? 1 : k <= 2 ? 2 : 3),
    figure: ([i, , j]) => {
      const [a, b] = SHOP[(i + j) % SHOP.length];
      return { type: "table", head: ["Item", "Price of one"], rows: [[a, `₹${PRICES[i]}`], [b, `₹${PRICES[j]}`]] };
    },
    word: ([i, q1, j, q2, k]) => {
      const [a, b, b1] = SHOP[(i + j) % SHOP.length];
      return `For the school fair, the class buys ${q1} ${a} at ₹${PRICES[i]} each and ${q2} ${q2 === 1 ? b1 : b} at ₹${PRICES[j]} each. The class teacher pays with a ₹${NOTES[k]} note. How many rupees should come back as change?`;
    },
    teach: {
      idea: "A multi-step problem is a chain of small questions: what does each kind of item cost, what is the whole bill, and what is left from the note.",
      method: "Multiply to find the cost of each kind of item, add the costs to get the bill, then subtract the bill from the money paid.",
      alternatives: [
        { id: "count_up", title: "Count up like a shopkeeper", kind: "procedural", text: ["After finding the bill, count up from the bill to the note: ₹265 → ₹270 → ₹300 → ₹500.", "Add the jumps: 5 + 30 + 200 = ₹235 change."], visual: ([i, q1, j, q2, k]) => ({ type: "numberline", from: 0, to: NOTES[k], step: NOTES[k] / 10, marks: [q1 * PRICES[i] + q2 * PRICES[j]] }) },
      ],
    },
    limits: "Two kinds of item, whole rupees, one note (the smallest that covers the bill) up to ₹1000; paise and combinations of notes are not here.",
  },
  {
    id: "aedrip",
    arity: 2,
    title: "Water lost from a dripping tap",
    competency: MULTI,
    type: "integer",
    mc: true,
    // [r, h]: 5r mL every minute for h hours
    parse: none,
    reject: (p) => (!inRange(p, [[1, 10], [1, 12]]) ? "5 to 50 mL a minute for 1 to 12 hours." : null),
    prompt: ([r, h]) => `A tap drips ${5 * r} mL of water every minute. How many millilitres of water drip out in ${h} ${h === 1 ? "hour" : "hours"}?`,
    solve: ([r, h]) => ({
      steps: [
        { id: "minutes", op: "convert", competency: "MATH.measurement.time-unit-conversion", inputs: [h, 60], value: 60 * h },
        { id: "water", op: "multiply", competency: MM, inputs: [5 * r, 60 * h], value: 5 * r * 60 * h },
      ],
      answer: 5 * r * 60 * h,
    }),
    // independent: add up the water hour by hour (one hour is 60 drips' worth of minutes)
    validate: ([r, h], v) => {
      let tot = 0;
      for (let hr = 0; hr < h; hr++) for (let m = 0; m < 60; m++) tot += 5 * r;
      return v === tot;
    },
    bugs: ([r, h]) => [
      { id: "hours-as-minutes", kind: "conceptual", competency: "MATH.measurement.time-unit-conversion", says: `The hours were used as if they were minutes; ${h} ${h === 1 ? "hour is" : "hours are"} ${60 * h} minutes.`, predict: 5 * r * h },
      { id: "hundred-minutes", kind: "recall", competency: "MATH.measurement.time-unit-conversion", says: "An hour was taken as 100 minutes; 1 hour = 60 minutes.", predict: 5 * r * 100 * h },
      { id: "one-hour", kind: "procedural", competency: MULTI, says: `Only the water for 1 hour was found; multiply by ${h} for all the hours.`, predict: h > 1 ? 5 * r * 60 : null },
    ],
    variants: () => [],
    explain: (s) => (s.id === "minutes" ? `${s.inputs[0]} ${s.inputs[0] === 1 ? "hour" : "hours"} = ${s.value} minutes` : `${s.inputs[0]} mL × ${s.inputs[1]} minutes = ${s.value} mL`),
    domain: [[1, 10], [1, 12]],
    difficulty: ([r, h]) => (h <= 2 && r <= 4 ? 1 : h <= 6 ? 2 : 3),
    word: ([r, h]) => `The tap in ${name(r + h)}'s school garden is broken and loses ${5 * r} mL of water each minute. The gardener can fix it only after ${h} ${h === 1 ? "hour" : "hours"}. How many millilitres of water are wasted before it is fixed?`,
    teach: {
      idea: "When something happens at the same rate every minute, the total is the amount each minute times the number of minutes. Hours must be changed into minutes first.",
      method: "Change the hours into minutes (× 60), then multiply by the millilitres lost each minute.",
      visual: ([r, h]) => ({ type: "bars", title: "Water lost (mL)", labels: Array.from({ length: Math.min(h, 6) }, (_, i) => `hour ${i + 1}`), values: Array.from({ length: Math.min(h, 6) }, (_, i) => 5 * r * 60 * (i + 1)) }),
      alternatives: [
        { id: "per_hour", title: "One hour first", kind: "procedural", text: ["Find the water lost in one hour: 60 × the millilitres each minute.", "Then add that amount once for every hour (or multiply by the number of hours)."] },
      ],
    },
    limits: "Whole millilitres per minute over whole hours; changing the answer into litres and days or weeks is not here.",
  },
];

// ---------------------------------------------------------------- helpers that need the tables above

const PARTS = [100, 125, 200, 250, 500];
const REST = [0, 3, 5, 7, 8, 10, 12, 15, 19, 20, 25, 30, 38, 46, 50, 61, 74, 80, 83, 99];
function indWords([L, T, H, r]: number[]): string {
  const parts: string[] = [];
  if (L) parts.push(`${ONES[L]} lakh`);
  if (T) parts.push(`${w2(T)} thousand`);
  if (H) parts.push(`${ONES[H]} hundred`);
  if (REST[r]) parts.push(w2(REST[r]));
  return parts.join(" ");
}
/** The two numbers of an estimation problem: two-digit as given (tens), or three-digit made from both (hundreds). */
function estNums([k, a, b]: number[]): [number, number] {
  return k === 1 ? [a, b] : [a * 10 + (b % 10), b * 10 + (a % 10)];
}

// ================================================================ gap@1: further families for the Grades 4–8 outcomes
// (angles in pictures, parts of a circle, symmetry in designs, digits and mirrors, …). Written by OpenPath; CC0.

const hash1 = (s: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
/** A fixed shuffle of 0 … n − 1 for these parameters, so the right letter of a choice is not predictable. */
const perm = (salt: string, n: number) => Array.from({ length: n }, (_, i) => i).sort((a, b) => hash1(`${salt}:${a}`) - hash1(`${salt}:${b}`) || a - b);
const firstSeen = new Map<string, Map<string, number>>();
/** distinct@1: whether an earlier seed (0 … s − 1) already gives the same key (the same question). */
const repeatOf = (tag: string, n: number, key: (t: number) => string | null, s: number) => {
  let m = firstSeen.get(tag);
  if (!m) {
    m = new Map();
    for (let t = 0; t < n; t++) {
      const k = key(t);
      if (k !== null && !m.has(k)) m.set(k, t);
    }
    firstSeen.set(tag, m);
  }
  const k = key(s);
  return k !== null && m.get(k) !== s;
};
/** A choice question: the base options in a fixed shuffled order; `at(j)` is where base option j is shown. */
const shuffled = (salt: string, base: string[]) => {
  const pm = perm(salt, base.length);
  return { choices: pm.map((i) => base[i]), at: (j: number) => pm.indexOf(j) };
};
const isIdx = (v: Value): v is number => typeof v === "number" && Number.isInteger(v);

// ---------------------------------------------------------------- right angles in pictures and objects (aertang)

type Obj = { text: string; deg?: number; clock?: number };
const RIGHT_OBJ: Obj[] = [
  { text: "the corner of a notebook page" }, { text: "the corner of a classroom door" }, { text: "the corner of a carrom board" }, { text: "the corner of a postcard" },
  { text: "the corner of a square floor tile" }, { text: "the corner of a blackboard" }, { text: "the corner of a matchbox" }, { text: "the corner where a wall meets the flat floor" },
  { text: "the hands of a clock at 3 o'clock", clock: 3 }, { text: "the hands of a clock at 9 o'clock", clock: 9 },
].map((o) => ({ deg: 90, ...o }));
const OTHER_OBJ: Obj[] = [
  { text: "the tip of a slice of a pizza cut into 8 equal slices", deg: 45 }, { text: "the point of a sharpened pencil", deg: 25 }, { text: "a corner of a samosa", deg: 60 }, { text: "the tip of a star in a rangoli", deg: 36 },
  { text: "a corner of a honeycomb cell", deg: 120 }, { text: "an open book lying flat on a table", deg: 180 },
  ...[1, 2, 4, 5, 7, 8, 10, 11].map((h) => ({ text: `the hands of a clock at ${h} o'clock`, clock: h })),
];
/** The angle an object makes, worked out again: the hands of a clock are 30° apart for each hour between them. */
const objAngle = (o: Obj) => (o.clock !== undefined ? 30 * Math.min(o.clock, 12 - o.clock) : o.deg!);
const RT_DEGS = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 90, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160];
const RT_CMP = ["smaller than a right angle", "exactly a right angle", "bigger than a right angle"];
const rtObjs = (s: number) => {
  const r = rng(s + 91000);
  const pool = [...OTHER_OBJ.keys()];
  const others: number[] = [];
  while (others.length < 3) others.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return { right: s % RIGHT_OBJ.length, others };
};
const rtQ = ([mode, v]: number[]): { choices: string[]; at: (j: number) => number; right: number; deg: number; items?: Obj[] } => {
  if (mode === 0) {
    const deg = RT_DEGS[v];
    return { ...shuffled(`aertang:${mode},${v}`, RT_CMP), right: deg < 90 ? 0 : deg === 90 ? 1 : 2, deg };
  }
  const { right, others } = rtObjs(v);
  const items = [RIGHT_OBJ[right], ...others.map((i) => OTHER_OBJ[i])];
  return { ...shuffled(`aertang:${mode},${v}`, items.map((o) => o.text)), right: 0, items, deg: 90 };
};

// ---------------------------------------------------------------- kinds of angle with reflex angles (aeangk)

const AKINDS = ["acute", "right", "obtuse", "straight", "reflex"];
const akind = (d: number) => (d < 90 ? 0 : d === 90 ? 1 : d < 180 ? 2 : d === 180 ? 3 : 4);
const akQ = ([mode, v]: number[]) => {
  const d = 5 * v;
  const k = akind(d);
  const others = k === 4 ? [akind(360 - d), 3, akind(360 - d) === 0 ? 2 : 0] : [[2, 4, 1], [0, 2, 3], [0, 4, 3], [2, 4, 1]][k];
  const base = [k, ...others].map((i) => AKINDS[i]);
  return { ...shuffled(`aeangk:${mode},${v}`, base), d, k, base };
};

// ---------------------------------------------------------------- vertex and arms (aearms)

const ALET = "ABCDEFGHKLMNPQRSTXYZ";
const TRIPLES: string[] = [];
for (let i = 0; i < ALET.length; i++) for (let j = i + 1; j < ALET.length; j++) for (let k = j + 1; k < ALET.length; k++) TRIPLES.push(ALET[i] + ALET[j] + ALET[k]);
/** The angle's three letters (the middle one is the vertex): every seed gives its own triple. */
const armsName = (s: number) => {
  const t = TRIPLES[(s * 37) % TRIPLES.length];
  return [t, `${t[1]}${t[0]}${t[2]}`, `${t[0]}${t[2]}${t[1]}`][s % 3];
};
const armQ = ([kind, s]: number[]): { choices: string[]; at: (j: number) => number; a: string; b: string; c: string; s1?: number; s2?: number } => {
  const [a, b, c] = armsName(s).split("");
  if (kind === 0) return { ...shuffled(`aearms:${kind},${s}`, [b, a, c]), a, b, c };
  if (kind === 1) return { ...shuffled(`aearms:${kind},${s}`, [`the rays ${b}${a} and ${b}${c}`, `the rays ${a}${b} and ${a}${c}`, `the rays ${c}${a} and ${c}${b}`, `the line segment ${a}${c}`]), a, b, c };
  const [s1, s2] = [1 + (s % 5), 1 + Math.floor(s / 5)];
  return { ...shuffled(`aearms:${kind},${s}`, ["∠X is bigger", "∠Y is bigger", "They are the same size"]), a, b, c, s1, s2 };
};

// ---------------------------------------------------------------- parts of a circle (aecpart)

const CPARTS = ["the centre", "a radius", "a diameter", "a chord", "an arc", "a sector", "a segment"];
/** What each part is, as features: what it joins, whether it is a region, whether it is curved, whether it goes through the centre. */
const CFEAT = [
  { point: true }, { joins: "centre-edge" }, { joins: "edge-edge", centre: true }, { joins: "edge-edge", centre: false }, { curved: true }, { region: "radii-arc" }, { region: "chord-arc" },
] as { point?: boolean; joins?: string; centre?: boolean; curved?: boolean; region?: string }[];
/** The name of a part from its features (an independent reading of the definitions). */
const cname = (f: (typeof CFEAT)[number]) => (f.point ? 0 : f.joins === "centre-edge" ? 1 : f.joins === "edge-edge" ? (f.centre ? 2 : 3) : f.curved ? 4 : f.region === "radii-arc" ? 5 : 6);
const CCEN = ["O", "C", "P", "M"];
const CPAIRS = ["AB", "XY", "DE", "RS", "KL", "GH", "TU", "FN"];
const cpQ = ([part, s]: number[]) => {
  const o = CCEN[s % 4];
  const [a, b] = CPAIRS[Math.floor(s / 4)].split("");
  const others = part === 2 ? [0, 1, 4] : part <= 1 ? [0, 1, 2, 3].filter((i) => i !== part) : { 3: [2, 4, 1], 4: [3, 5, 6], 5: [6, 4, 1], 6: [5, 3, 4] }[part as 3]!;
  const base = [part, ...others].map((i) => CPARTS[i]);
  const desc = [
    `the point ${o}, which is the same distance from every point on the circle`,
    `the line segment ${o}${a}, which joins the centre ${o} to the point ${a} on the circle`,
    `the line segment ${a}${b}, which joins two points ${a} and ${b} on the circle and passes through the centre ${o}`,
    `the line segment ${a}${b}, which joins two points ${a} and ${b} on the circle but does not pass through the centre ${o}`,
    `the curved part of the circle from ${a} to ${b}`,
    `the region inside the circle bounded by the two radii ${o}${a}, ${o}${b} and the curved part of the circle from ${a} to ${b}`,
    `the region inside the circle between the straight line segment ${a}${b} (which does not pass through the centre) and the curved part of the circle from ${a} to ${b}`,
  ][part];
  return { ...shuffled(`aecpart:${part},${s}`, base), base, o, a, b, desc };
};

// ---------------------------------------------------------------- symmetry of designs and shapes (aedsym)

const DGROUPS = [[], ["v"], ["h"], ["d"], ["v", "h"], ["d", "e"], ["v", "h", "d", "e"]] as string[][];
const reflectCell = (n: number, r: number, c: number, line: string): [number, number] => (line === "v" ? [r, n - 1 - c] : line === "h" ? [n - 1 - r, c] : line === "d" ? [c, r] : [n - 1 - c, n - 1 - r]);
const design = (s: number) => {
  const n = s % 2 ? 5 : 4;
  const g = DGROUPS[Math.floor(s / 2) % DGROUPS.length];
  const r = rng(s + 52000);
  const cells = Array.from({ length: n }, () => Array.from({ length: n }, () => (r() < 0.35 ? 1 : 0)));
  // fill the design so it has the chosen lines: a cell is shaded when any of its mirror images is
  for (let round = 0; round < 3; round++)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (cells[i][j]) for (const l of g) {
      const [a, b] = reflectCell(n, i, j, l);
      cells[a][b] = 1;
    }
  return { n, g, cells };
};
/** Fold the drawn design along each of the four lines and see whether the halves match (the check by folding). */
const foldLines = (cells: number[][]) => {
  const n = cells.length;
  return ["v", "h", "d", "e"].filter((l) => cells.every((row, i) => row.every((x, j) => {
    const [a, b] = reflectCell(n, i, j, l);
    return cells[a][b] === x;
  })));
};
const designFig = (cells: number[][]): Visual => ({ type: "table", rows: cells.map((row) => row.map((x) => (x ? "■" : "□"))) });
type ShapeS = { name: string; lines: number; pts: number[][]; fig: Visual };
const regular = (n: number) => Array.from({ length: n }, (_, i) => [110 + 80 * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), 100 + 80 * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)]);
const SSHAPES: ShapeS[] = [
  { name: "an equilateral triangle", lines: 3, pts: regular(3), fig: { type: "shape", sides: 3, name: "equilateral triangle" } },
  { name: "a square", lines: 4, pts: [[60, 40], [170, 40], [170, 150], [60, 150]], fig: { type: "shape", kind: "square", name: "square" } },
  { name: "a rectangle (not a square)", lines: 2, pts: [[30, 50], [190, 50], [190, 150], [30, 150]], fig: { type: "shape", kind: "rectangle", name: "rectangle" } },
  { name: "a rhombus (not a square)", lines: 2, pts: [[110, 20], [166, 100], [110, 180], [54, 100]], fig: { type: "shape", kind: "rhombus", name: "rhombus" } },
  { name: "a kite", lines: 1, pts: [[110, 20], [170, 80], [110, 180], [50, 80]], fig: { type: "shape", kind: "kite", name: "kite" } },
  { name: "a parallelogram (not a rectangle or rhombus)", lines: 0, pts: [[60, 50], [200, 50], [160, 150], [20, 150]], fig: { type: "shape", kind: "parallelogram", name: "parallelogram" } },
  { name: "a trapezium with equal slanting sides", lines: 1, pts: [[70, 50], [150, 50], [200, 150], [20, 150]], fig: { type: "shape", kind: "trapezium", name: "trapezium" } },
  { name: "a regular pentagon", lines: 5, pts: regular(5), fig: { type: "shape", sides: 5, name: "regular pentagon" } },
  { name: "a regular hexagon", lines: 6, pts: regular(6), fig: { type: "shape", sides: 6, name: "regular hexagon" } },
  { name: "a regular octagon", lines: 8, pts: regular(8), fig: { type: "shape", sides: 8, name: "regular octagon" } },
  { name: "a triangle with three different sides", lines: 0, pts: [[20, 160], [240, 160], [100, 30]], fig: { type: "triangle" } },
  { name: "a right-angled triangle with two different shorter sides", lines: 0, pts: [[30, 160], [230, 160], [30, 30]], fig: { type: "triangle", right: true } },
];
/** Lines of symmetry of a polygon found numerically: try mirror lines through its centre every half degree. */
const polyLines = (pts: number[][]) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let count = 0;
  for (let j = 0; j < 360; j++) {
    const t = (j * Math.PI) / 360;
    const [ux, uy] = [Math.cos(t), Math.sin(t)];
    const ok = pts.every(([x, y]) => {
      const [dx, dy] = [x - cx, y - cy];
      const dot = dx * ux + dy * uy;
      const [rx, ry] = [cx + 2 * dot * ux - dx, cy + 2 * dot * uy - dy];
      return pts.some(([px, py]) => Math.abs(px - rx) < 1e-6 && Math.abs(py - ry) < 1e-6);
    });
    if (ok) count++;
  }
  return count;
};

// ---------------------------------------------------------------- digits as on a digital clock (aedigsym)

const SEG: Record<string, string> = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
const segMap = (s: string, m: Record<string, string>) => [...s].map((c) => m[c] ?? c).sort().join("");
const HSEG = { a: "d", d: "a", b: "c", c: "b", f: "e", e: "f" };
const VSEG = { b: "f", f: "b", c: "e", e: "c" };
const digitOf = (segs: string) => Object.keys(SEG).find((d) => [...SEG[d]].sort().join("") === segs) ?? null;
/** The rule by segments: a number has a horizontal line when every digit's top and bottom halves swap onto itself; a
 * vertical line when the mirrored digits, read in reverse order, give the same number. */
const hasLineSeg = (x: number, axis: number) => {
  const ds = String(x).split("");
  if (axis === 1) return ds.every((d) => digitOf(segMap(SEG[d], HSEG)) === d);
  const mirrored = [...ds].reverse().map((d) => digitOf(segMap(SEG[d], VSEG)));
  return mirrored.join("") === ds.join("");
};
/** The digits drawn on a 5-row, 3-column grid (with a blank column between digits): used to fold the drawing. */
const segCells: Record<string, [number, number][]> = { a: [[0, 0], [0, 1], [0, 2]], b: [[0, 2], [1, 2], [2, 2]], c: [[2, 2], [3, 2], [4, 2]], d: [[4, 0], [4, 1], [4, 2]], e: [[2, 0], [3, 0], [4, 0]], f: [[0, 0], [1, 0], [2, 0]], g: [[2, 0], [2, 1], [2, 2]] };
const drawNumber = (x: number) => {
  const ds = String(x).split("");
  const w = ds.length * 4 - 1;
  const g = Array.from({ length: 5 }, () => Array(w).fill(0));
  ds.forEach((d, i) => { for (const s of SEG[d]) for (const [r, c] of segCells[s]) g[r][4 * i + c] = 1; });
  return g;
};
const foldsNum = (x: number, axis: number) => {
  const g = drawNumber(x);
  return axis === 1 ? g.every((row, i) => row.join("") === g[4 - i].join("")) : g.every((row) => row.join("") === [...row].reverse().join(""));
};
const DIGITEMS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 18, 30, 33, 38, 80, 81, 83, 88, 101, 103, 108, 110, 131, 138, 181, 303, 383, 808, 818, 838, 888, 25, 52, 285, 47, 69, 12, 55, 77, 14, 60, 90, 525];
/** Five numbers for seed s; for the vertical fold (axis 0) numbers with a 1 are left out: on a digital clock 1 is drawn
 * on the right, but printed it looks symmetric. */
const digList = (s: number, axis: number) => {
  const r = rng(s + 61000);
  const pool = axis === 0 ? DIGITEMS.filter((x) => !String(x).includes("1")) : [...DIGITEMS];
  const out: number[] = [];
  while (out.length < 5) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
};

// ---------------------------------------------------------------- mirror images of words (aemirror)

const allIn = (w: string, set: Set<string>) => [...w].every((c) => set.has(c));
const pal = (w: string) => w === [...w].reverse().join("");
const MW_SIDE = ["MOM", "WOW", "TOT", "TOOT", "OTTO", "AHA", "MUM", "YAY", "HAH", "OHO", "TUT", "HUH", "ATTA", "AMMA", "AVVA", "AYYA"].filter((w) => allIn(w, VSYM) && pal(w));
const MW_VNOTPAL = ["MAT", "TOY", "WAY", "HAT", "HOT", "TAX", "OAT", "AUTO", "MAY", "YAM", "TOW", "MATH", "WITH"].filter((w) => allIn(w, VSYM) && !pal(w));
const MW_PALNOT = ["NUN", "LEVEL", "NOON", "DAD", "PEEP", "POP", "EYE", "PUP", "SOS", "DID", "REFER", "RADAR", "GIG", "NAN"].filter((w) => !allIn(w, VSYM) && pal(w));
const MW_NEITHER = ["CAT", "DOG", "PEN", "SUN", "RICE", "FISH", "LEAF", "DRUM", "GATE", "CLAY"].filter((w) => !allIn(w, VSYM) && !pal(w) && !allIn(w, HSYM));
const MW_WATER = ["HIDE", "CODE", "DICE", "ICE", "ECHO", "DECIDE", "CHOICE", "EXCEED", "DEED", "HOOD", "OXIDE", "COD", "DOE", "ODE", "CHIDE", "ICED", "HEED", "DECODE", "DIODE", "CODEX", "DICED", "ECHOED"].filter((w) => allIn(w, HSYM));
const MW_ONEOFF = ["HIDES", "COLD", "RIDE", "TIDE", "SIDE", "NICE", "DIET", "HOME", "DOOR", "CHIEF", "MICE", "CHOP"].filter((w) => !allIn(w, HSYM) && [...w].filter((c) => !HSYM.has(c)).length === 1);
/** Side-mirror words that do NOT look the same in water (for the water question's wrong option). */
const MW_SIDE_W = MW_SIDE.filter((w) => !allIn(w, HSYM));
const mirQ = ([kind, s]: number[]) => {
  const lists = kind === 0 ? [MW_SIDE, MW_VNOTPAL, MW_PALNOT, MW_NEITHER] : [MW_WATER, MW_SIDE_W, MW_ONEOFF, MW_NEITHER];
  let t = s;
  const words = lists.map((l) => {
    const w = l[t % l.length];
    t = Math.floor(t / l.length);
    return w;
  });
  return { ...shuffled(`aemirror:${kind},${s}`, words), words };
};
/** Seen in a mirror standing beside the word: the order of the letters reverses and each letter flips left to right. */
const sameInSideMirror = (w: string) => [...w].every((c) => BITMAP[c] && foldsV(c)) && [...w].reverse().join("") === w;
/** Seen in still water below: each letter flips top to bottom and the order stays. */
const sameInWater = (w: string) => [...w].every((c) => BITMAP[c] && foldsH(c));

const GEO_MORE: Def[] = [
  {
    id: "aertang",
    arity: 2,
    title: "Spotting right angles in pictures and objects",
    competency: ANG,
    type: "choice",
    // [mode, v]: mode 0 — the angle in the picture is RT_DEGS[v]; compare it with a right angle. mode 1 — v chooses
    // one object with a right angle and three without; which one has the right angle?
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 299]])) return "An angle in a picture, or four everyday objects.";
      if (p[0] === 0 && p[1] >= RT_DEGS.length) return "One of the drawn angles.";
      return p[0] === 1 && repeatOf("aertang", 300, (t) => {
        const { right, others } = rtObjs(t);
        return `${right}|${[...others].sort((x, y) => x - y)}`;
      }, p[1]) ? "An earlier choice already shows these four objects (distinct@1)." : null;
    },
    prompt: ([mode, v]) => (mode === 0 ? "Hold the corner of a folded paper (a right angle) against the shaded angle at the centre of the circle in the picture. Is the angle in the picture smaller than a right angle, exactly a right angle, or bigger than a right angle?" : `Which of these makes a right angle (a square corner)?`),
    choices: (p) => rtQ(p).choices,
    solve: (p) => {
      const q = rtQ(p);
      return { steps: [{ id: "compare", op: "compare", competency: ANG, inputs: [p[0], q.deg], value: q.at(q.right) }], answer: q.at(q.right) };
    },
    // independent: work out the angle each option makes (a clock's hands are 30° apart per hour) and test it against 90°
    validate: (p, v) => {
      const q = rtQ(p);
      if (!isIdx(v) || v < 0 || v >= q.choices.length) return false;
      const pm = perm(`aertang:${p[0]},${p[1]}`, q.choices.length);
      if (p[0] === 0) {
        const d = RT_DEGS[p[1]];
        const quarter = d / 90;
        return pm[v] === (quarter < 1 ? 0 : quarter === 1 ? 1 : 2);
      }
      const o = q.items![pm[v]];
      return objAngle(o) === 90 && q.items!.filter((x) => objAngle(x) === 90).length === 1;
    },
    bugs: (p) => {
      const q = rtQ(p);
      if (p[0] === 0) {
        const d = q.deg;
        if (d === 90) return [{ id: "looks-big", kind: "conceptual", competency: ANG, says: "The square corner was judged by eye as a little too wide; a right angle fits the folded-paper corner exactly, with no gap on either side.", predict: q.at(2) }];
        if (Math.abs(d - 90) <= 25) return [{ id: "nearly-square", kind: "conceptual", competency: ANG, says: `An angle close to a square corner was taken as a right angle; when the paper corner is held on it there is a small gap ${d < 90 ? "outside the angle's arm" : "between the paper and the arm"}, so it is not exactly a right angle.`, predict: q.at(1) }];
        return [{ id: "corner-reversed", kind: "conceptual", competency: ANG, says: "The paper-corner test was read the wrong way round: if the angle fits inside the square corner it is smaller; if the square corner fits inside the angle it is bigger.", predict: q.at(d < 90 ? 2 : 0) }];
      }
      const out: Bug[] = [];
      const items = q.items!;
      let best = -1;
      for (let i = 1; i < items.length; i++) if (objAngle(items[i]) !== 180 && (best < 0 || Math.abs(objAngle(items[i]) - 90) < Math.abs(objAngle(items[best]) - 90))) best = i;
      if (best > 0) out.push({ id: "nearly-square", kind: "conceptual", competency: ANG, says: `The angle at ${items[best].text} is not far from a square corner, but a folded-paper right angle would not fit it exactly.`, predict: q.at(best) });
      const flat = items.findIndex((o) => objAngle(o) === 180);
      if (flat > 0) out.push({ id: "straight-as-right", kind: "conceptual", competency: ANG, says: "A flat, straight angle (an open book lying flat) was taken for a right angle; a right angle is only half of a straight angle.", predict: q.at(flat) });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.inputs[0] === 0 ? `Compare with a square corner (90°): the angle is ${RT_CMP[Number(s.inputs[1]) < 90 ? 0 : Number(s.inputs[1]) === 90 ? 1 : 2]}` : "Only the square corner fits a folded-paper right angle exactly"),
    domain: [[0, 1], [0, 299]],
    difficulty: ([mode, v]) => (mode === 1 ? 2 : Math.abs(RT_DEGS[v] - 90) <= 25 ? 3 : 1),
    figure: ([mode, v]) => (mode === 0 ? { type: "circle", sector: RT_DEGS[v], estimate: true } : null),
    word: ([mode, v]) => (mode === 0 ? `${name(v)} opens a pair of scissors so that the blades make the shaded angle in the picture. Is the angle between the blades smaller than a right angle, exactly a right angle, or bigger than a right angle?` : `${name(v)} walks round the school checking corners with a folded-paper right angle. Which of these will the paper corner fit exactly?`),
    teach: {
      idea: "A right angle is a square corner, like the corner of a page: a quarter of a full turn. Folding a paper twice makes a right-angle tester.",
      method: "Hold the folded corner in the angle with one edge along one arm. If the other arm lies along the other edge, it is a right angle; if the angle fits inside the corner it is smaller; if the corner fits inside the angle it is bigger.",
      visual: () => ({ type: "angle", deg: 90 }),
      alternatives: [
        { id: "clock_quarter", title: "A quarter turn on a clock", kind: "conceptual", text: ["The hands of a clock at 3 o'clock make a right angle: the minute hand at 12, the hour hand a quarter of the way round.", "Fewer than 3 hours apart is smaller than a right angle; more (up to 6) is bigger."], visual: () => ({ type: "clock", h: 3, m: 0 }) },
      ],
    },
    limits: "Drawn angles clearly away from 90° (or exactly 90°) and everyday objects; holding a real folded-paper tool against real objects is done in class, not in the app.",
  },
  {
    id: "aeangk",
    arity: 2,
    title: "Classifying angles, including reflex angles",
    competency: ANG,
    type: "choice",
    // [mode, v]: the angle is 5v degrees (5° to 355°); mode 0 gives its measure, mode 1 draws it
    parse: none,
    reject: (p) => (!inRange(p, [[0, 1], [1, 71]]) ? "An angle from 5° to 355°, given by its measure or drawn." : null),
    prompt: ([mode, v]) => (mode === 0 ? `An angle measures ${5 * v}°. What kind of angle is it?` : "What kind of angle is the shaded angle at the centre of the circle in the picture?"),
    choices: (p) => akQ(p).choices,
    solve: (p) => {
      const q = akQ(p);
      return { steps: [{ id: "classify", op: "compare", competency: ANG, inputs: [q.d], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: count how many right angles fit into the angle and name it from that
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = akQ(p);
      const k = q.d / 90;
      const nameOf = k < 1 ? "acute" : k === 1 ? "right" : k < 2 ? "obtuse" : k === 2 ? "straight" : k < 4 ? "reflex" : "";
      return q.choices[v] === nameOf;
    },
    bugs: (p) => {
      const q = akQ(p);
      const at = (nm: string) => q.choices.indexOf(nm);
      const out: Bug[] = [];
      if (q.k === 4) out.push({ id: "inner-angle", kind: "conceptual", competency: ANG, says: `The smaller angle between the arms (360° − ${q.d}° = ${360 - q.d}°) was named; the angle meant goes the long way round, so it is more than 180°: a reflex angle.`, predict: at(AKINDS[akind(360 - q.d)]) });
      if (q.k === 0) out.push({ id: "acute-obtuse-swap", kind: "recall", competency: ANG, says: "The names were mixed up: an angle smaller than a right angle is acute; obtuse is between 90° and 180°.", predict: at("obtuse") });
      if (q.k === 2) out.push({ id: "acute-obtuse-swap", kind: "recall", competency: ANG, says: "The names were mixed up: an angle between 90° and 180° is obtuse; acute is smaller than 90°.", predict: at("acute") }, { id: "big-is-reflex", kind: "conceptual", competency: ANG, says: "Every angle bigger than a right angle was called reflex; a reflex angle is bigger than a straight angle (more than 180°).", predict: at("reflex") });
      if (q.k === 3) out.push({ id: "biggest-bent", kind: "conceptual", competency: ANG, says: "A straight angle is not obtuse: its two arms make one straight line, exactly 180°.", predict: at("obtuse") });
      if (q.k === 1) out.push({ id: "upright-as-straight", kind: "recall", competency: ANG, says: "An arm standing straight up was taken for a straight angle; a straight angle is a flat line (180°), and a square corner is a right angle.", predict: at("straight") });
      return out.filter((b) => (b.predict as number) >= 0);
    },
    variants: () => [],
    explain: (s) => {
      const d = Number(s.inputs[0]);
      return d < 90 ? `${d}° is less than 90°: acute` : d === 90 ? "90° is a right angle" : d < 180 ? `${d}° is between 90° and 180°: obtuse` : d === 180 ? "180° is a straight angle" : `${d}° is between 180° and 360°: reflex`;
    },
    domain: [[0, 1], [1, 71]],
    difficulty: ([mode, v]) => (5 * v > 180 ? 3 : mode === 1 ? 2 : 1),
    figure: ([mode, v]) => (mode === 1 ? { type: "circle", sector: 5 * v, estimate: true } : null),
    word: ([mode, v]) => (mode === 0 ? `${name(v)} turns the steering wheel of a toy car through ${5 * v}°. What kind of angle has it turned through?` : `${name(v)} turns a key through the shaded angle in the picture. What kind of angle is that turn?`),
    teach: {
      idea: "Angles are named by comparing them with a right angle (90°) and a straight angle (180°): acute < 90° < obtuse < 180° < reflex < 360°.",
      method: "Look at how far the arc turns. Less than a square corner: acute; a square corner: right; less than a straight line: obtuse; a straight line: straight; more than a straight line: reflex.",
      visual: ([, v]) => ({ type: "circle", sector: 5 * v }),
      alternatives: [
        { id: "two_sides", title: "Every pair of arms makes two angles", kind: "conceptual", text: ["Two arms from one point make two angles that add up to 360°: one the short way round and one the long way round.", "If the short one is 120°, the long one is 240° — a reflex angle. The shading shows which one is meant."] },
      ],
    },
    limits: "Angles in steps of 5° from 5° to 355°; measuring with a protractor is a separate family.",
  },
  {
    id: "aearms",
    arity: 2,
    title: "The vertex and arms of an angle, and comparing angles by turning",
    competency: ANG,
    type: "choice",
    // [kind, s]: kind 0 the vertex of ∠(name s); kind 1 its arms; kind 2 compare turns of 1 + s % 5 and 1 + ⌊s / 5⌋ numbers
    parse: none,
    reject: (p) => (!inRange(p, [[0, 2], [0, 59]]) || (p[0] === 2 && p[1] >= 25) ? "An angle named by three letters, or two turns to compare." : null),
    prompt: ([kind, s]) => {
      const q = armQ([kind, s]);
      if (kind === 0) return `Which point is the vertex of ∠${q.a}${q.b}${q.c}?`;
      if (kind === 1) return `What are the arms of ∠${q.a}${q.b}${q.c}?`;
      return `∠X is the turn made by the minute hand of a clock moving from 12 to ${q.s1}. ∠Y is drawn with arms twice as long, and is the turn of the hand moving from 12 to ${q.s2}. If ∠X is placed on top of ∠Y with the vertices and one arm together, which is true?`;
    },
    choices: (p) => armQ(p).choices,
    solve: (p) => {
      const q = armQ(p);
      const right = p[0] === 2 ? (q.s1! > q.s2! ? 0 : q.s1! < q.s2! ? 1 : 2) : 0;
      return { steps: [{ id: "read", op: "identify", competency: ANG, inputs: [p[0], `${q.a}${q.b}${q.c}`], value: q.at(right) }], answer: q.at(right) };
    },
    // independent: read the middle letter of the name; for turns, step the hand round and compare the degrees turned
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = armQ(p);
      const nm = `${q.a}${q.b}${q.c}`;
      const c = q.choices[v];
      if (p[0] === 0) return c === nm.charAt(1);
      if (p[0] === 1) return c === `the rays ${nm.charAt(1)}${nm.charAt(0)} and ${nm.charAt(1)}${nm.charAt(2)}`;
      let [x, y] = [0, 0];
      for (let i = 0; i < q.s1!; i++) x += 30;
      for (let i = 0; i < q.s2!; i++) y += 30;
      return c === (x > y ? "∠X is bigger" : x < y ? "∠Y is bigger" : "They are the same size");
    },
    bugs: (p) => {
      const q = armQ(p);
      if (p[0] === 0) return [{ id: "first-letter", kind: "conceptual", competency: ANG, says: `The first letter was taken as the vertex; in ∠${q.a}${q.b}${q.c} the vertex is always the middle letter, where the two arms meet.`, predict: q.at(1) }];
      if (p[0] === 1) return [
        { id: "first-letter", kind: "conceptual", competency: ANG, says: "The first letter was taken as the vertex, so the arms were drawn from the wrong point; both arms start at the middle letter.", predict: q.at(1) },
        { id: "join-ends", kind: "conceptual", competency: ANG, says: "The segment joining the two outer points was taken as an arm; the arms are the two rays that start at the vertex.", predict: q.at(3) },
      ];
      return q.s1! < q.s2! ? [] : [{ id: "longer-arms", kind: "conceptual", competency: ANG, says: "∠Y was taken as bigger because its arms are longer; the size of an angle is the amount of turn between the arms, not how long the arms are drawn.", predict: q.at(1) }];
    },
    variants: () => [],
    explain: (s) => (s.inputs[0] === 0 ? `In ∠${s.inputs[1]} the middle letter is the vertex` : s.inputs[0] === 1 ? `The arms of ∠${s.inputs[1]} are the two rays from the middle letter` : "Compare the amounts of turn: 30° for each number the hand passes"),
    domain: [[0, 2], [0, 59]],
    difficulty: ([kind, s]) => (kind === 0 ? 1 : kind === 1 ? 2 : (1 + (s % 5)) >= 1 + Math.floor(s / 5) ? 3 : 2),
    word: ([kind, s]) => {
      const q = armQ([kind, s]);
      if (kind === 0) return `On a map, ${name(s)} marks three villages ${q.a}, ${q.b} and ${q.c} and draws the roads from ${q.b} to the other two, making ∠${q.a}${q.b}${q.c}. Which village is at the vertex of the angle?`;
      if (kind === 1) return `${name(s)} stretches two strings from a peg to make ∠${q.a}${q.b}${q.c} on the playground. Which are the arms of the angle?`;
      return `${name(s)} opens a small fan from closed by the turn a minute hand makes from 12 to ${q.s1} (∠X). A big fan, with blades twice as long, is opened by the turn from 12 to ${q.s2} (∠Y). Laying one angle on the other, which is true?`;
    },
    teach: {
      idea: "An angle is made by two rays (its arms) starting from one point (its vertex). Its size is the amount of turn from one arm to the other.",
      method: "In ∠ABC the middle letter B is the vertex and the arms are BA and BC. To compare two angles, put one on the other with vertices and one arm together: the one whose second arm turns further is bigger.",
      alternatives: [
        { id: "trace", title: "Trace and lay on top", kind: "conceptual", text: ["Trace one angle on thin paper and lay it on the other, vertex on vertex and one arm along one arm.", "If the traced second arm lies inside the other angle, the traced angle is smaller — however long the arms are."] },
      ],
    },
    limits: "Angles named by three capital letters and turns on a clock face; superposition with real paper cut-outs is done in class.",
  },
  {
    id: "aecpart",
    arity: 2,
    title: "Naming the parts of a circle",
    competency: CIRC,
    type: "choice",
    // [part, s]: part 0 centre, 1 radius, 2 diameter, 3 chord, 4 arc, 5 sector, 6 segment; s picks the letters
    parse: none,
    reject: (p) => (!inRange(p, [[0, 6], [0, 31]]) ? "A part of a circle described with letters." : p[0] === 0 && p[1] >= 4 ? "The centre needs only its letter." : null),
    prompt: (p) => `A circle has centre ${cpQ(p).o}. What is the name for ${cpQ(p).desc}?`,
    choices: (p) => cpQ(p).choices,
    solve: (p) => {
      const q = cpQ(p);
      return { steps: [{ id: "name", op: "identify", competency: CIRC, inputs: [CPARTS[p[0]]], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: name the part again from its features (what it joins, whether it is a region or curved)
    validate: (p, v) => isIdx(v) && cpQ(p).choices[v] === CPARTS[cname(CFEAT[p[0]])],
    bugs: (p) => {
      const q = cpQ(p);
      const at = (i: number) => q.base.indexOf(CPARTS[i]) >= 0 ? q.at(q.base.indexOf(CPARTS[i])) : -1;
      const B: Bug[] = [
        ...(p[0] === 1 ? [{ id: "radius-diameter", kind: "conceptual", competency: CIRC, says: "A radius and a diameter were mixed up: a radius goes from the centre to the circle; a diameter goes right across through the centre.", predict: at(2) } as Bug] : []),
        ...(p[0] === 2 ? [{ id: "radius-diameter", kind: "conceptual", competency: CIRC, says: "A radius and a diameter were mixed up: a segment across the whole circle through the centre is a diameter (two radii).", predict: at(1) } as Bug] : []),
        ...(p[0] === 3 ? [{ id: "chord-as-diameter", kind: "conceptual", competency: CIRC, says: "Every segment across the circle was called a diameter; a diameter must pass through the centre, and this one does not.", predict: at(2) } as Bug] : []),
        ...(p[0] === 4 ? [{ id: "arc-chord", kind: "conceptual", competency: CIRC, says: "The curved piece was called a chord; a chord is the straight segment joining the two points, the curved piece is an arc.", predict: at(3) } as Bug] : []),
        ...(p[0] === 5 ? [{ id: "sector-segment", kind: "conceptual", competency: CIRC, says: "Sector and segment were mixed up: a sector is cut off by two radii (like a slice of a round cake); a segment is cut off by a chord.", predict: at(6) } as Bug] : []),
        ...(p[0] === 6 ? [{ id: "sector-segment", kind: "conceptual", competency: CIRC, says: "Sector and segment were mixed up: a region cut off by a chord is a segment; a sector is cut off by two radii.", predict: at(5) } as Bug] : []),
        ...(p[0] === 0 ? [{ id: "centre-radius", kind: "recall", competency: CIRC, says: "The centre is a point; the radius is the distance (or segment) from the centre to the circle.", predict: at(1) } as Bug] : []),
      ];
      return B.filter((b) => (b.predict as number) >= 0);
    },
    variants: () => [],
    explain: (s) => `That is ${s.inputs[0]}`,
    domain: [[0, 6], [0, 31]],
    difficulty: ([part]) => (part <= 2 ? 1 : part <= 4 ? 2 : 3),
    figure: (p) => {
      const q = cpQ(p);
      return p[0] === 1 ? { type: "circle", radius: `${q.o}${q.a}` } : p[0] === 2 ? { type: "circle", diameter: `${q.a}${q.b}` } : p[0] === 5 ? { type: "circle", sector: 70 } : { type: "circle" };
    },
    word: (p) => {
      const q = cpQ(p);
      return `${name(p[1])} draws a round rangoli with a string tied to a peg at its centre ${q.o}. In the drawing, what is the name for ${q.desc}?`;
    },
    teach: {
      idea: "Every point of a circle is the same distance from the centre. A radius joins the centre to the circle; a chord joins two points of the circle, and the chord through the centre is a diameter. An arc is a piece of the circle itself.",
      method: "Ask: is it a point, a straight segment, a curved piece or a region? For a segment, where do its ends lie and does it pass through the centre? For a region, is it cut off by two radii (sector) or by a chord (segment)?",
      visual: () => ({ type: "circle", radius: "r", sector: 60 }),
      alternatives: [
        { id: "food", title: "Think of food", kind: "conceptual", text: ["A slice of a round cake, cut from the middle, is a sector.", "Cutting a straight line across a chapati, not through the middle, cuts off a segment; the cut itself is a chord."] },
      ],
    },
    limits: "The centre, radius, diameter (Grade 4) and chord, arc, sector, segment (Grade 7) described in words with a simple picture; drawing them is marked by an educator.",
  },
  {
    id: "aedsym",
    arity: 2,
    title: "Counting the lines of symmetry of a design or a shape",
    competency: SYM,
    type: "integer",
    mc: true,
    // [kind, s]: kind 0 — a square design of shaded squares (seed s); kind 1 — the shape SSHAPES[s]
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 199]])) return "A square design or a named shape.";
      const [kind, s] = p;
      if (kind === 1) return s >= SSHAPES.length ? "One of the named shapes." : null;
      const { cells, g } = design(s);
      const filled = cells.flat().filter(Boolean).length;
      if (filled < 4 || filled > cells.length * cells.length - 3) return "A design with some squares shaded and some not.";
      if (foldLines(cells).length !== g.length) return "The design must have exactly the lines it was made with.";
      return repeatOf("aedsym", 200, (t) => JSON.stringify(design(t).cells), s) ? "An earlier choice already shows this design (distinct@1)." : null;
    },
    prompt: ([kind, s]) => (kind === 0 ? "The picture shows a square design made of shaded and white squares. How many lines of symmetry does the design have? (Count fold lines going up and down, across, and along the two diagonals.)" : `How many lines of symmetry does ${SSHAPES[s].name} have? (The picture shows it.)`),
    solve: ([kind, s]) => {
      const n = kind === 0 ? design(s).g.length : SSHAPES[s].lines;
      return { steps: [{ id: "lines", op: "count", competency: SYM, inputs: [kind, s], value: n }], answer: n };
    },
    // independent: fold the drawing along each line (design), or test mirror lines through the centre every half degree (shape)
    validate: ([kind, s], v) => isInt(v) && v === (kind === 0 ? foldLines(design(s).cells).length : polyLines(SSHAPES[s].pts)),
    bugs: ([kind, s]) => {
      if (kind === 0) {
        const g = design(s).g;
        const straight = g.filter((l) => l === "v" || l === "h").length;
        return [
          { id: "diagonals-missed", kind: "procedural", competency: SYM, says: "Only the up-and-down and across fold lines were tried; a square design can also fold along its diagonals.", predict: straight !== g.length ? straight : null },
          { id: "looks-balanced", kind: "conceptual", competency: SYM, says: "The design was counted as symmetric because it looks balanced; a fold line works only when every shaded square lands on a shaded square.", predict: g.length === 0 ? 1 : null },
        ];
      }
      const sh = SSHAPES[s];
      const reg = /regular|equilateral/.test(sh.name);
      return [
        ...(/rectangle|rhombus/.test(sh.name) ? [{ id: "diagonals-counted", kind: "conceptual", competency: SYM, says: "The diagonals were counted as fold lines; folding along a diagonal of this shape does not make the two halves match.", predict: 4 } as Bug] : []),
        ...(/parallelogram/.test(sh.name) ? [{ id: "half-turn", kind: "conceptual", competency: SYM, says: "A parallelogram looks the same after a half turn, but that is not a fold: no fold line makes its halves match.", predict: 2 } as Bug] : []),
        ...(/square/.test(sh.name) && !/not a square/.test(sh.name) ? [{ id: "diagonals-missed", kind: "procedural", competency: SYM, says: "Only the up-and-down and across lines were counted; a square also folds along both diagonals.", predict: 2 } as Bug] : []),
        ...(reg && sh.lines % 2 === 0 ? [{ id: "corners-only", kind: "procedural", competency: SYM, says: "Only the lines through opposite corners were counted; lines through the middles of opposite sides are lines of symmetry too.", predict: sh.lines / 2 } as Bug] : []),
        ...(reg && sh.lines % 2 === 1 ? [{ id: "one-line", kind: "conceptual", competency: SYM, says: "Only the up-and-down line was found; a regular shape has a line of symmetry through every corner.", predict: 1 } as Bug] : []),
        ...(/triangle with|right-angled/.test(sh.name) ? [{ id: "any-shape", kind: "conceptual", competency: SYM, says: "A fold was taken to work for this triangle, but with three different sides (or two different shorter sides) no fold makes the halves match.", predict: 1 } as Bug] : []),
        ...(/kite|trapezium/.test(sh.name) ? [{ id: "two-ways", kind: "procedural", competency: SYM, says: "A second fold line (across) was counted; for this shape only the up-and-down fold makes the halves match.", predict: 2 } as Bug] : []),
      ];
    },
    distractors: ([kind, s]) => {
      const n = kind === 0 ? design(s).g.length : SSHAPES[s].lines;
      return [n + 1, n + 2, n - 1, 4, 2, 0].filter((x) => x >= 0 && x !== n);
    },
    variants: () => [],
    explain: (s) => (s.inputs[0] === 0 ? `Fold along each of the four lines: ${s.value} ${s.value === 1 ? "fold makes" : "folds make"} the halves match` : `It has ${s.value} ${s.value === 1 ? "line" : "lines"} of symmetry`),
    domain: [[0, 1], [0, 199]],
    difficulty: ([kind, s]) => (kind === 1 ? (SSHAPES[s].lines >= 5 ? 3 : 2) : design(s).g.some((l) => l === "d" || l === "e") ? 3 : design(s).g.length ? 2 : 1),
    figure: ([kind, s]) => (kind === 0 ? designFig(design(s).cells) : SSHAPES[s].fig),
    word: ([kind, s]) => (kind === 0 ? `${name(s)} makes a square kolam-style tile pattern, shown in the picture with shaded and white squares. In how many different ways can the pattern be folded so that the two halves match exactly?` : `${name(s)} cuts ${SSHAPES[s].name} out of paper for a festival decoration. In how many different ways can it be folded so that the two halves match exactly?`),
    teach: {
      idea: "A line of symmetry is a fold line where one half lands exactly on the other. A shape can have none, one, or several.",
      method: "Try each possible fold: up and down, across, and along the diagonals (and, for regular shapes, through every corner and every side's middle). Count only the folds where every part matches.",
      alternatives: [
        { id: "mirror", title: "Use a mirror", kind: "conceptual", text: ["Stand a small mirror on the line you are testing.", "If the half you see plus its reflection looks exactly like the whole design, the line is a line of symmetry."] },
      ],
    },
    limits: "Square designs of 4 × 4 or 5 × 5 squares (lines up and down, across, and the two diagonals) and twelve named shapes; drawing the other half is marked by an educator.",
  },
  {
    id: "aedigsym",
    arity: 2,
    title: "Lines of symmetry in digits and numbers",
    competency: SYM,
    type: "integer",
    mc: true,
    // [axis, s]: axis 0 vertical, 1 horizontal; the seed chooses five digits or numbers drawn as on a digital clock
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 199]])) return "Five digits or numbers and a vertical or horizontal line.";
      const k = digList(p[1], p[0]).filter((x) => hasLineSeg(x, p[0])).length;
      if (k === 0 || k === 5) return "Some, but not all, have the line.";
      return repeatOf(`aedigsym${p[0]}`, 200, (t) => [...digList(t, p[0])].sort((a, b) => a - b).join(","), p[1]) ? "An earlier choice already shows these numbers (distinct@1)." : null;
    },
    prompt: ([axis, s]) => `These are written the way a digital clock shows them, with straight bars: ${digList(s, axis).join(", ")}. How many of them have a ${axis ? "horizontal line of symmetry (a fold straight across the middle of the whole number, top half onto bottom half)" : "vertical line of symmetry (a fold straight down the middle of the whole number, as it is displayed, left half onto right half)"}?`,
    solve: ([axis, s]) => {
      const xs = digList(s, axis).filter((x) => hasLineSeg(x, axis));
      return { steps: [{ id: "check", op: "count", competency: SYM, inputs: [axis ? "horizontal" : "vertical", xs.join(", ")], value: xs.length }], answer: xs.length };
    },
    // independent: draw each number on a grid of bars and fold the drawing
    validate: ([axis, s], v) => v === digList(s, axis).filter((x) => foldsNum(x, axis)).length,
    bugs: ([axis, s]) => {
      const xs = digList(s, axis);
      const right = xs.filter((x) => hasLineSeg(x, axis)).length;
      const other = xs.filter((x) => hasLineSeg(x, 1 - axis)).length;
      const each = xs.filter((x) => String(x).split("").every((d) => hasLineSeg(Number(d), axis))).length;
      return [
        { id: "axis-swap", kind: "conceptual", competency: SYM, says: `The numbers were folded the other way (${axis ? "down the middle" : "across the middle"}); a ${axis ? "horizontal line goes across, so the top half must land on the bottom half" : "vertical line goes down the middle, so the left half must land on the right half"}.`, predict: other },
        ...(axis === 0 ? [{ id: "digit-by-digit", kind: "conceptual", competency: SYM, says: "Each digit was checked on its own, but folding a whole number down its middle also swaps the order of the digits: 80 folds onto 08, which is different.", predict: each !== right ? each : null } as Bug] : []),
      ];
    },
    distractors: ([axis, s]) => [0, 1, 2, 3, 4, 5].filter((x) => x !== digList(s, axis).filter((n) => hasLineSeg(n, axis)).length),
    variants: () => [],
    explain: (s) => `${s.inputs[1]} ${Number(s.value) === 1 ? "has" : "have"} a ${s.inputs[0]} line of symmetry: ${s.value}`,
    domain: [[0, 1], [0, 199]],
    difficulty: ([axis, s]) => (axis === 1 ? (digList(s, axis).some((x) => x > 9) ? 2 : 1) : 3),
    figure: ([axis, s]) => ({ type: "table", head: ["1st", "2nd", "3rd", "4th", "5th"], rows: [digList(s, axis).map(String)] }),
    word: ([axis, s]) => `${name(s)} makes number cards for a class game, drawing the numbers with straight bars like a digital clock: ${digList(s, axis).join(", ")}. ${name(s)} folds each card ${axis ? "straight across the middle of the number" : "straight down the middle of the whole number"}. For how many cards do the two halves of the number match exactly?`,
    teach: {
      idea: "On a digital clock each digit is made of straight bars. Some digits, like 8 and 0, match when folded either way; 3 matches only when folded across.",
      method: "For a fold across, check each digit's top and bottom halves. For a fold down the middle of a whole number, the left end must match the right end: read the mirrored digits in reverse order and see if you get the same number.",
      alternatives: [
        { id: "mirror", title: "Hold a mirror", kind: "conceptual", text: ["Stand a mirror along the middle of the number (across or up and down).", "If the half on paper and its reflection together show the same number, that line is a line of symmetry."] },
      ],
    },
    limits: "Digits drawn as on a digital clock (straight bars), so the answer does not depend on handwriting; numbers of up to three digits.",
  },
  {
    id: "aemirror",
    arity: 2,
    title: "Which word looks the same in a mirror",
    competency: SYM,
    type: "choice",
    // [kind, s]: kind 0 — a mirror standing beside the word; kind 1 — reflection in still water below; s chooses the four words
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 199]])) return "Four words and a mirror beside them or water below.";
      const n = p[0] === 0 ? MW_SIDE.length * MW_VNOTPAL.length * MW_PALNOT.length * MW_NEITHER.length : MW_WATER.length * MW_SIDE_W.length * MW_ONEOFF.length * MW_NEITHER.length;
      return p[1] >= Math.min(200, n) ? "One of the sets of four words." : null;
    },
    prompt: ([kind]) =>
      kind === 0
        ? "A word is written in plain capital letters on a card, and the card is held next to a mirror standing straight up beside it. Which of these words looks exactly the same in the mirror as on the card?"
        : "A word is painted in plain capital letters along the side of a boat, and the still water below shows its reflection upside down. Which of these words looks exactly the same in the reflection as on the boat?",
    choices: (p) => mirQ(p).choices,
    solve: (p) => {
      const q = mirQ(p);
      return { steps: [{ id: "mirror", op: "reflect", competency: SYM, inputs: [p[0] ? "water" : "side", q.words[0]], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: fold each letter's drawing (left onto right, or top onto bottom) and, for a side mirror, reverse the order
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = mirQ(p);
      const ok = q.choices.map((w) => (p[0] === 0 ? sameInSideMirror(w) : sameInWater(w)));
      return ok[v] && ok.filter(Boolean).length === 1;
    },
    bugs: (p) => {
      const q = mirQ(p);
      return p[0] === 0
        ? [
            { id: "palindrome-only", kind: "conceptual", competency: SYM, says: `${q.words[2]} reads the same backwards, but its letters themselves flip in a mirror (${[...new Set([...q.words[2]].filter((c) => !VSYM.has(c)))].join(", ")} look different), so it does not look the same.`, predict: q.at(2) },
            { id: "letters-only", kind: "conceptual", competency: SYM, says: `Each letter of ${q.words[1]} looks the same in a mirror, but a mirror beside the word also reverses the order of the letters: it shows ${[...q.words[1]].reverse().join("")}.`, predict: q.at(1) },
          ]
        : [
            { id: "side-rule", kind: "conceptual", competency: SYM, says: `The rule for a mirror standing beside the word was used; water below flips each letter top to bottom and keeps the order, and ${[...new Set([...q.words[1]].filter((c) => !HSYM.has(c)))].join(", ")} look different upside down.`, predict: q.at(1) },
            { id: "one-letter", kind: "procedural", competency: SYM, says: `Not every letter of ${q.words[2]} was checked: ${[...q.words[2]].filter((c) => !HSYM.has(c)).join(", ")} looks different when flipped top to bottom.`, predict: q.at(2) },
          ];
    },
    variants: () => [],
    explain: (s) => (s.inputs[0] === "side" ? `In a mirror beside it, ${s.inputs[1]} is reversed and every letter is flipped left to right, and it comes back the same` : `In the water every letter of ${s.inputs[1]} is flipped top to bottom, the order stays, and each letter looks the same`),
    domain: [[0, 1], [0, 199]],
    difficulty: ([kind]) => (kind === 0 ? 2 : 3),
    word: ([kind, s]) => (kind === 0 ? `${name(s)} writes words on cards in plain capitals for a mirror game: a card held beside a standing mirror wins if the mirror shows exactly the same word. Which card wins?` : `At the Ooty boat lake, ${name(s)} sees boats with names painted in plain capitals, reflected upside down in the still water. Which name looks exactly the same in its reflection?`),
    teach: {
      idea: "A mirror standing beside a word flips it left to right: the letters come in the reverse order and each letter is flipped. Water below flips it top to bottom: the order stays, but each letter is turned upside down.",
      method: "For a mirror beside the word: every letter must have an up-and-down line of symmetry AND the word must read the same backwards. For water below: every letter must have an across line of symmetry.",
      alternatives: [
        { id: "try_it", title: "Try it with a mirror", kind: "conceptual", text: ["Write the word in big capitals and hold a mirror beside it, then below it.", "Read what the mirror shows, letter by letter, and compare it with the card."] },
      ],
    },
    limits: "Words in plain block capitals (letters such as B, K and Q, whose shape depends on the font, are left out); drawing mirror images is marked by an educator.",
  },
];
B05.push(...GEO_MORE);

// ---------------------------------------------------------------- number helpers for the gap@1 families

/** International comma grouping: 4070523 → 4,070,523. */
const intl = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const w3 = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} hundred` : "", n % 100 ? w2(n % 100) : ""].filter(Boolean).join(" ");
const indName = (n: number) => {
  const parts = [[Math.floor(n / 1e7), "crore"], [Math.floor(n / 1e5) % 100, "lakh"], [Math.floor(n / 1000) % 100, "thousand"]] as [number, string][];
  const out = parts.filter(([v]) => v).map(([v, u]) => `${w3(v)} ${u}`);
  if (n % 1000) out.push(w3(n % 1000));
  return out.join(" ");
};
const intlName = (n: number) => {
  const parts = [[Math.floor(n / 1e9) % 1000, "billion"], [Math.floor(n / 1e6) % 1000, "million"], [Math.floor(n / 1000) % 1000, "thousand"]] as [number, string][];
  const out = parts.filter(([v]) => v).map(([v, u]) => `${w3(v)} ${u}`);
  if (n % 1000) out.push(w3(n % 1000));
  return out.join(" ");
};
const WORDVAL: Record<string, number> = Object.fromEntries([...ONES.map((w, i) => [w, i]), ...TENS.map((w, i) => [w, 10 * i]).filter(([w]) => w)]);
const BIG: Record<string, number> = { crore: 1e7, lakh: 1e5, million: 1e6, billion: 1e9, thousand: 1000 };
/** Read a number name back into a number, word by word (an independent reading of what was written). */
const readName = (t: string) => {
  let total = 0;
  let cur = 0;
  for (const w of t.replace(/-/g, " ").split(/\s+/).filter(Boolean)) {
    if (w in WORDVAL) cur += WORDVAL[w];
    else if (w === "hundred") cur *= 100;
    else if (w in BIG) {
      total += cur * BIG[w];
      cur = 0;
    } else return NaN;
  }
  return total + cur;
};
/** A number with the given count of digits, some of them zeros, from a seed. */
const numWith = (seed: number, len: number) => {
  const r = rng(seed);
  let s = String(1 + Math.floor(r() * 9));
  while (s.length < len) s += r() < 0.3 ? "0" : String(1 + Math.floor(r() * 9));
  if (!/0/.test(s.slice(1))) s = s.slice(0, -2) + "0" + s.slice(-1);
  return Number(s);
};
const dropZero = (n: number) => Number(String(n).replace(/(?<=.)0/, ""));
const swapAdj = (n: number) => {
  const s = String(n).split("");
  for (let i = s.length - 1; i > 0; i--) if (s[i] !== s[i - 1] && s[i] !== "0" && s[i - 1] !== "0") {
    [s[i], s[i - 1]] = [s[i - 1], s[i]];
    return Number(s.join(""));
  }
  return n + 1;
};
const expanded = (n: number) => String(n).split("").map((d, i, a) => [Number(d), 10 ** (a.length - 1 - i)]).filter(([d]) => d).map(([d, u]) => (u === 1 ? `${d}` : `${d} × ${ind(u)}`)).join(" + ");
const leftGroups = (n: number) => String(n).replace(/(\d{3})(?=\d)/g, "$1,");
const INDCOMMA = /^\d{1,2}(,\d{2})*,\d{3}$/;
const INTCOMMA = /^\d{1,3}(,\d{3})+$/;
const NF_LEN = (kind: number, s: number) => (kind === 0 || kind === 3 ? 5 + (s % 2) : kind <= 2 ? 6 + (s % 4) : kind === 4 ? 7 + (s % 3) : 8 + (s % 2));
const nfNum = (kind: number, s: number) => numWith(s * 7 + kind * 1000 + 81000, NF_LEN(kind, s));
const nfQ = ([kind, s]: number[]) => {
  const n = nfNum(kind, s);
  const nameOf = kind === 4 ? intlName : indName;
  if (kind === 0 || kind === 4 || kind === 5) {
    const wrong = [dropZero(n), n * 10, swapAdj(n)];
    return { ...shuffled(`aenumf:${kind},${s}`, [n, ...wrong].map(nameOf)), n };
  }
  if (kind === 1 || kind === 2) {
    const base = kind === 1 ? [ind(n), intl(n), leftGroups(n), String(n).replace(/\B(?=(\d{2})+$)/g, ",")] : [intl(n), ind(n), leftGroups(n), String(n).replace(/\B(?=(\d{2})+$)/g, ",")];
    return { ...shuffled(`aenumf:${kind},${s}`, base), n };
  }
  return { ...shuffled(`aenumf:${kind},${s}`, [expanded(n), expanded(dropZero(n)), expanded(n * 10), expanded(swapAdj(n))]), n };
};
/** The value of "4 × 1,00,000 + 7 × 1,000 + 52"-style sums, term by term. */
const sumTerms = (t: string) => t.split("+").reduce((acc, term) => acc + term.split("×").reduce((m, f) => m * Number(f.replace(/,/g, "").trim()), 1), 0);

/** Thousandths as a decimal in simplest form: 34507 → "34.507", 34500 → "34.5". */
const d3 = (th: number) => {
  const neg = th < 0;
  const a = Math.abs(th);
  const w = Math.floor(a / 1000);
  const r = a % 1000;
  const frac = r === 0 ? "" : `.${String(r).padStart(3, "0").replace(/0+$/, "")}`;
  return `${neg ? "-" : ""}${w}${frac}`;
};
const thou = (v: Value) => {
  const x = typeof v === "string" ? Number(v.trim()) : typeof v === "number" ? v : NaN;
  const t = Math.round(x * 1000);
  return Number.isFinite(x) && Math.abs(x * 1000 - t) < 1e-6 ? t : null;
};
/** Read a sum like "20 + 5 + 0.3 + 0.007" or "20 + 5 + 3/10" in thousandths. */
const sumDec = (t: string) => t.split("+").reduce((acc, term) => {
  const [a, b] = term.trim().split("/");
  return acc + Math.round((Number(a) / (b ? Number(b) : 1)) * 1000);
}, 0);
const PLACES3 = ["tens", "ones", "tenths", "hundredths", "thousandths"];
const PLACEV = [10000, 1000, 100, 10, 1]; // in thousandths
/** A decimal with two whole digits and three decimal places, from a seed: kind 0 all digits different and not 0;
 * otherwise one of the tenths or hundredths is 0. */
const dpvNum = (kind: number, s: number) => {
  const r = rng(s * 13 + kind * 977 + 33000);
  for (;;) {
    const ds = Array.from({ length: 5 }, () => 1 + Math.floor(r() * 9));
    if (kind === 0 && new Set(ds).size !== 5) continue;
    if (kind > 0) ds[2 + Math.floor(r() * 2)] = 0;
    return ds;
  }
};
const dpvQ = ([kind, s]: number[]) => {
  const ds = dpvNum(kind, s);
  const th = ds.reduce((acc, d, i) => acc + d * PLACEV[i], 0);
  if (kind === 0) {
    const pos = 1 + (s % 4); // ones, tenths, hundredths or thousandths
    const near3 = [0, 1, 2, 3, 4].filter((i) => i !== pos).sort((x, y) => Math.abs(x - pos) - Math.abs(y - pos) || y - x).slice(0, 3);
    const base = [pos, ...near3].map((i) => d3(ds[pos] * PLACEV[i]));
    return { ...shuffled(`aedpv:${kind},${s}`, base), ds, th, pos, base };
  }
  const zeroAt = ds[2] === 0 ? 2 : 3;
  const terms = (xs: number[], shift = 0) => xs.map((d, i) => [d, PLACEV[i] / 10 ** shift] as const).filter(([d]) => d).map(([d, u]) => d3(d * u)).join(" + ");
  const noZero = [...ds.slice(0, zeroAt), ...ds.slice(zeroAt + 1), 0];
  const swapWO = [ds[1], ds[0], ...ds.slice(2)];
  if (kind === 1) {
    const base = [terms(ds), terms(noZero), terms(swapWO), terms([0, ...ds.slice(0, 4)])];
    return { ...shuffled(`aedpv:${kind},${s}`, base), ds, th, pos: zeroAt, base };
  }
  const val = (xs: number[]) => d3(xs.reduce((acc, d, i) => acc + d * PLACEV[i], 0));
  const base = [val(ds), val(noZero), val(swapWO), val([...ds.slice(0, 2), ds[4], ds[3], ds[2]])];
  return { ...shuffled(`aedpv:${kind},${s}`, base), ds, th, pos: zeroAt, base };
};
const dordNums = (s: number) => {
  const w = s % 10;
  const t = 1 + (Math.floor(s / 10) % 8);
  const u = 1 + Math.floor(s / 80);
  // w.t, w.(t − 1)u, w.t0u and w.tu: more digits does not mean bigger
  const xs = [1000 * w + 100 * t, 1000 * w + 100 * (t - 1) + 10 * u, 1000 * w + 100 * t + u, 1000 * w + 100 * t + 10 * u];
  const pm = perm(`aedord:${s}`, 4);
  return pm.map((i) => xs[i]);
};
const FRACS: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 20], [3, 20], [7, 20], [9, 20], [11, 20], [1, 25], [2, 25], [6, 25], [12, 25], [1, 50], [3, 50], [7, 50], [21, 50], [3, 2], [5, 4], [7, 4], [9, 8], [6, 5], [13, 20]];
const dfrQ = ([kind, s]: number[]) => {
  if (kind === 0) {
    // s < 9: s + 1 tenths; otherwise a number of hundredths not a multiple of 10
    const h = s < 9 ? 10 * (s + 1) : [1, 3, 7, 9, 11, 13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49, 51, 53, 57, 59, 61, 63, 67, 69, 71, 73, 77, 79, 81, 83, 87, 89, 91, 93, 97, 99, 2, 4, 6, 8, 12, 14, 16, 18, 22, 24][s - 9];
    const tenths = h % 10 === 0;
    const num = tenths ? h / 10 : h;
    const base = tenths ? [`${num}/10`, `${num}/100`, `1/${num}`, `${num}/1000`] : [`${num}/100`, `${num}/10`, `${num}/1000`, `1/${num}`];
    const uniq = [...new Set(base)];
    return { ...shuffled(`aedfr:${kind},${s}`, uniq), dec: ds(h), val: h / 100, base: uniq };
  }
  const [a, b] = FRACS[s % FRACS.length];
  const th = (1000 * a) / b;
  if (kind === 1) {
    const raw = Math.round(th) % 10 === 0 ? (Math.round(th) % 100 === 0 ? [Math.round(th) / 100, 10] : [Math.round(th) / 10, 100]) : [Math.round(th), 1000];
    const base = [`${a}/${b}`, `${raw[0]}/${raw[1]}`, `${b}/${a}`, `${a + 1}/${b}`];
    return { ...shuffled(`aedfr:${kind},${s}`, [...new Set(base)]), dec: d3(th), val: a / b, base: [...new Set(base)] };
  }
  const base = [d3(th), `${a}.${b}`, `${b}.${a}`, d3(th + (th % 10 === 0 ? 100 : 10))];
  return { ...shuffled(`aedfr:${kind},${s}`, [...new Set(base)]), dec: d3(th), val: a / b, base: [...new Set(base)] };
};
const fracVal = (t: string) => {
  const [a, b] = t.split("/").map(Number);
  return b ? a / b : NaN;
};
const AMPM = (H: number, m: number) => `${H % 12 === 0 ? 12 : H % 12}:${String(m).padStart(2, "0")} ${H < 12 ? "a.m." : "p.m."}`;
const ampmQ = ([H, k]: number[]) => {
  const mm = String(5 * k).padStart(2, "0");
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const own = H < 12 ? "a.m." : "p.m.";
  const other = H < 12 ? "p.m." : "a.m.";
  const third = H === 0 || H === 12 ? `0:${mm} ${own}` : H >= 13 ? `${H}:${mm} ${own}` : `${h12 + 1}:${mm} ${own}`;
  const fourth = H >= 13 ? `${H - 10}:${mm} ${own}` : H === 0 || H === 12 ? `1:${mm} ${own}` : `${h12 === 1 ? 12 : h12 - 1}:${mm} ${own}`;
  const base = [AMPM(H, 5 * k), `${h12}:${mm} ${other}`, third, fourth];
  return { ...shuffled(`aeampm:${H},${k}`, base), base };
};
/** Minutes since midnight of "3:20 p.m." (an independent reading of the written time). */
const readAmPm = (t: string) => {
  const m = t.match(/^(\d{1,2}):(\d{2}) (a\.m\.|p\.m\.)$/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h < 1 || h > 12) return null;
  return (h === 12 ? 0 : h) * 60 + Number(m[2]) + (m[3] === "p.m." ? 720 : 0);
};
const rev = (n: number) => Number(String(n).split("").reverse().join(""));
const isPal = (n: number) => String(n) === String(rev(n));
const palSteps = (x: number) => {
  let n = x;
  let k = 0;
  while (!isPal(n) && k < 30) {
    n += rev(n);
    k++;
  }
  return k;
};
const r10 = (n: number) => roundTo(n, 10);
const rLead = (n: number) => roundTo(n, n >= 100 ? 100 : 10);
type ChkQ = { op: number; a: number; b: number; claim: number; exact: number };
const chkData = (s: number): ChkQ => {
  const r = rng(s * 5 + 71000);
  const op = s % 3;
  const c = Math.floor(s / 3);
  if (op === 0) {
    const a = 120 + Math.floor(r() * 780);
    const b = 12 + Math.floor(r() * 87);
    return { op, a, b, exact: a + b, claim: c % 2 ? a + 10 * b : a + b };
  }
  if (op === 1) {
    const a = 300 + Math.floor(r() * 700);
    const b = 12 + Math.floor(r() * Math.min(87, Math.floor(a / 10) - 13));
    return { op, a, b, exact: a - b, claim: c % 2 ? a - 10 * b : a - b };
  }
  const a = 12 + Math.floor(r() * 87);
  const b = 12 + Math.floor(r() * 87);
  const t = c % 3;
  return { op, a, b, exact: a * b, claim: t === 0 ? a * b : t === 1 ? a * (b % 10) + a * Math.floor(b / 10) : a * (b % 10) + a * Math.floor(b / 10) * 100 };
};
const estOf = (q: ChkQ) => (q.op === 0 ? rLead(q.a) + rLead(q.b) : q.op === 1 ? rLead(q.a) - rLead(q.b) : r10(q.a) * r10(q.b));
const CHK = ["Reasonable: it is close to the estimate", "Not reasonable: it is far too big", "Not reasonable: it is far too small"];
type Sit = { text: string; exact: boolean };
const SITS: Sit[] = [
  ...["the change a shopkeeper gives back", "the amount written on a cheque", "the number of tablets a doctor tells you to take", "the marks written on a report card", "the price printed on a train ticket", "the weight of gold bought at a jewellery shop", "the time a train leaves the station", "the number of chairs to put out for 32 invited guests"].map((text) => ({ text, exact: true })),
  ...["the number of people at a temple festival, for a news report", "how long it takes to walk to a friend's house", "the number of mangoes on a big tree", "the distance from Chennai to Madurai, when planning a trip", "the number of grains in a bag of rice", "the number of stars you can see on a clear night", "the number of ants in an anthill", "how many leaves are on a neem tree"].map((text) => ({ text, exact: false })),
];
const sitPick = (s: number) => {
  const r = rng(s * 3 + 17000);
  const odd = s % 2 === 0; // s even: one item needs an exact answer and three do not; s odd: the other way round
  const ones = SITS.filter((x) => x.exact === odd);
  const many = [...SITS.filter((x) => x.exact !== odd)];
  const first = ones[Math.floor(r() * ones.length)];
  const rest: Sit[] = [];
  while (rest.length < 3) rest.push(many.splice(Math.floor(r() * many.length), 1)[0]);
  return [first, ...rest];
};
const sizeData = (s: number) => {
  const r = rng(s * 9 + 23000);
  const a = s % 2 ? 12 + Math.floor(r() * 87) : 110 + Math.floor(r() * 880);
  const b = 12 + Math.floor(r() * 87);
  return { a, b, E: rLead(a) * rLead(b) };
};
const chkQ = ([kind, s]: number[]): { choices: string[]; at: (j: number) => number; right: string; q?: ChkQ; items?: ReturnType<typeof sitPick>; z?: ReturnType<typeof sizeData> } => {
  if (kind === 0) {
    const q = chkData(s);
    const right = q.claim === q.exact ? 0 : q.claim > q.exact ? 1 : 2;
    return { ...shuffled(`aechk:${kind},${s}`, CHK), right: CHK[right], q };
  }
  if (kind === 1) {
    const items = sitPick(s);
    return { ...shuffled(`aechk:${kind},${s}`, items.map((x) => x.text)), right: items[0].text, items };
  }
  const z = sizeData(s);
  const base = [z.E, z.E / 10, z.E * 10, z.E * 100].map((x) => `about ${ind(x)}`);
  return { ...shuffled(`aechk:${kind},${s}`, base), right: base[0], z };
};
const RND_PLACE = ["", "", "", "thousand", "ten thousand", "lakh", "ten lakh", "crore"];
const rndNum = (k: number, s: number) => {
  const u = 10 ** k;
  const r = rng(s * 11 + k * 1000 + 44000);
  return 2 * u + Math.floor(r() * 98 * u);
};
/** Situations that fit the size of the number (k: the place rounded to, 10^k). */
const RND_CTX = (k: number, i: number, n: number) =>
  k <= 4
    ? [`A truck has travelled ${ind(n)} km in its working life.`, `The number of people living in a town is ${ind(n)}.`, `A shop's sales last year were ₹${ind(n)}.`, `${ind(n)} tickets were sold for a film in its first month.`][i]
    : k === 5
      ? [`The number of votes cast in a district election is ${ind(n)}.`, `The number of people living in a district is ${ind(n)}.`, `A company's sales last year were ₹${ind(n)}.`, `${ind(n)} tickets were sold for a film in its first month.`][i]
      : [`The number of votes cast in a state election is ${ind(n)}.`, `The number of people living in ${k === 7 ? "a large country" : "a state"} is ${ind(n)}.`, `A company's sales last year were ₹${ind(n)}.`, `A state government plans to spend ₹${ind(n)} on new roads.`][i];
const decThou = (s: number) => {
  const r = rng(s * 7 + 64000);
  const w = Math.floor(r() * 60);
  let f = 1 + Math.floor(r() * 999);
  if (f % 10 === 0) f += 3;
  return 1000 * w + f;
};
/** An event whose time fits the stopwatch reading (thousandths of a second). */
const rdecEvent = (th: number) => (th < 12000 ? "timed a ball rolling down a slope in a science experiment" : th < 26000 ? "ran 100 m" : "swam 50 m");
const roundTh = (th: number, place: number) => {
  const u = [1000, 100, 10][place];
  return Math.floor((th + u / 2) / u) * u;
};

const NUM_MORE: Def[] = [
  {
    id: "aepair",
    arity: 2,
    title: "Even or odd by putting things in pairs",
    competency: EVEN,
    type: "choice",
    // [pic, n]: n counters drawn as dots (pic 0) or in ten frames (pic 1)
    parse: none,
    reject: (p) => (!inRange(p, [[0, 1], [5, 50]]) ? "5 to 50 counters, drawn as dots or in ten frames." : null),
    prompt: ([pic]) => (pic === 0 ? "Put the dots in the picture into pairs (join them two by two). Is the number of dots even or odd?" : "The ten frames in the picture are filled row by row. A full ten frame makes 5 pairs; put the counters in the last frame into pairs too (two side by side or one above the other). Is the number of counters even or odd?"),
    choices: (p) => shuffled(`aepair:${p}`, ["even", "odd"]).choices,
    solve: (p) => {
      const q = shuffled(`aepair:${p}`, ["even", "odd"]);
      const left = p[1] % 2;
      return { steps: [{ id: "pairs", op: "divide", competency: EVEN, inputs: [p[1], 2], value: Math.floor(p[1] / 2) }, { id: "left", op: "classify", competency: EVEN, inputs: [left], value: q.at(left) }], answer: q.at(left) };
    },
    // independent: take pairs away one at a time and see whether one is left
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      let n = p[1];
      while (n >= 2) n -= 2;
      return shuffled(`aepair:${p}`, ["even", "odd"]).choices[v] === (n === 0 ? "even" : "odd");
    },
    bugs: (p) => {
      const q = shuffled(`aepair:${p}`, ["even", "odd"]);
      const n = p[1];
      const pairs = Math.floor(n / 2);
      return [
        { id: "pairs-count", kind: "conceptual", competency: EVEN, says: `The number of pairs (${pairs}) was checked for being even; what decides is whether one is left over without a partner (${n % 2 ? "one is left" : "none is left"}).`, predict: pairs % 2 === n % 2 ? q.at(pairs % 2) : null } as Bug,
        ...(n >= 10 ? [{ id: "tens-digit", kind: "conceptual", competency: EVEN, says: `The tens digit (${Math.floor(n / 10)}) was looked at; tens always pair up, so only the ones (or the counter left over) decide.`, predict: Math.floor(n / 10) % 2 !== n % 2 ? q.at(Math.floor(n / 10) % 2) : null } as Bug] : []),
      ].filter((b) => b.predict !== null && b.predict !== q.at(n % 2));
    },
    variants: () => [],
    explain: (s) => (s.id === "pairs" ? `${s.inputs[0]} make ${s.value} pairs` : Number(s.inputs[0]) ? "One is left over without a partner: odd" : "None is left over: even"),
    domain: [[0, 1], [5, 50]],
    difficulty: ([pic, n]) => (n <= 12 ? 1 : pic === 1 ? 2 : 3),
    figure: ([pic, n]) => (pic === 0 ? { type: "dots", count: n } : { type: "tenframe", filled: n, frames: Math.ceil(n / 10) }),
    word: ([pic, n]) => `For a dance at the school assembly, children stand in pairs. There is one child for each ${pic === 0 ? "dot" : "counter"} in the picture. Is the number of children even or odd?`,
    teach: {
      idea: "An even number of things can be put into pairs with none left over. An odd number always leaves exactly one without a partner.",
      method: "Join the things two by two (a full ten frame is 5 pairs: each counter in the top row with the one below it). If every one has a partner, the number is even; if one is left over, it is odd.",
      visual: ([, n]) => ({ type: "tenframe", filled: n, frames: Math.ceil(n / 10) }),
      alternatives: [
        { id: "last_digit", title: "Check with the last digit", kind: "conceptual", text: ["Count them and look at the ones digit.", "0, 2, 4, 6 or 8 means even; 1, 3, 5, 7 or 9 means odd — the same answer as pairing."] },
      ],
    },
    limits: "5 to 50 counters drawn as dots or in ten frames; the last-digit rule on written numbers is the family aeeven.",
  },
  {
    id: "aerev",
    arity: 2,
    title: "Patterns in reverse-and-add sums and in the addition chart",
    competency: PATR,
    type: "integer",
    mc: true,
    // [kind, x]: 0 x + (x reversed); 1 reverse-and-add steps to a palindrome; 2 even sums in row x of the addition chart;
    // 3 how many cells of the 0–10 addition chart show the sum x
    parse: none,
    reject: ([kind, x]) => {
      if (!inRange([kind, x], [[0, 3], [0, 99]])) return "A two-digit number, a row of the addition chart, or a sum in it.";
      if (kind === 0) return x < 12 || x % 10 === 0 || isPal(x) ? "A two-digit number with different digits, not ending in 0." : null;
      if (kind === 1) return x < 12 || x % 10 === 0 || isPal(x) || palSteps(x) < 2 || palSteps(x) > 4 || (x % 10 > Math.floor(x / 10)) ? "A two-digit number that needs 2 to 4 steps (tens digit larger, so each pair of reversals is asked once)." : null;
      if (kind === 2) return x > 20 ? "Rows 0 to 20." : null;
      return x < 1 || x > 19 ? "Sums 1 to 19." : null;
    },
    prompt: ([kind, x]) =>
      [
        `Take ${x}, reverse its digits to get ${rev(x)}, and add the two numbers. What is the sum?`,
        `Start with ${x}. Reverse its digits and add. Keep doing this with each answer until you get a palindrome (a number that reads the same both ways, like 121). How many reverse-and-add steps does it take?`,
        `In an addition chart, row ${x} lists the sums ${x} + 0, ${x} + 1, ${x} + 2, … up to ${x} + 10. How many of these 11 sums are even?`,
        `An addition chart has rows 0 to 10 and columns 0 to 10, and each cell shows row + column. How many cells show the sum ${x}?`,
      ][kind],
    solve: ([kind, x]) => {
      const ans = kind === 0 ? x + rev(x) : kind === 1 ? palSteps(x) : kind === 2 ? (x % 2 ? 5 : 6) : x <= 10 ? x + 1 : 21 - x;
      return { steps: [{ id: ["sum", "steps", "row", "diagonal"][kind], op: kind === 0 ? "add" : "count", competency: PATR, inputs: [x], value: ans }], answer: ans };
    },
    // independent: build the sums digit by digit, step through the chart cell by cell
    validate: ([kind, x], v) => {
      if (!isInt(v)) return false;
      if (kind === 0) return v === 11 * (Math.floor(x / 10) + (x % 10));
      if (kind === 1) {
        let n = x;
        for (let k = 1; k <= 6; k++) {
          n = n + Number([...String(n)].reverse().join(""));
          if ([...String(n)].reverse().join("") === String(n)) return v === k;
        }
        return false;
      }
      let c = 0;
      for (let r = 0; r <= 10; r++) for (let col = 0; col <= 10; col++) if (kind === 2 ? r === 0 && (x + col) % 2 === 0 : r + col === x) c++;
      return v === c;
    },
    bugs: ([kind, x]) => {
      if (kind === 0) {
        const [t, o] = [Math.floor(x / 10), x % 10];
        return [
          { id: "no-carry", kind: "procedural", competency: ADDSUB, says: `The ones (${o} + ${t} = ${o + t}) were added but the ten was not carried.`, predict: o + t >= 10 ? ((t + o) % 10) * 10 + ((o + t) % 10) : null },
          { id: "doubled", kind: "procedural", competency: PATR, says: `${x} was doubled; the second number is ${x} with its digits reversed, ${rev(x)}.`, predict: 2 * x },
        ];
      }
      if (kind === 1) {
        const k = palSteps(x);
        return [
          { id: "count-start", kind: "procedural", competency: PATR, says: "The starting number was counted as a step; count only the reverse-and-add steps.", predict: k + 1 },
          { id: "stop-early", kind: "procedural", competency: PATR, says: "The count stopped too early: keep going until the sum itself reads the same both ways.", predict: k - 1 },
        ];
      }
      if (kind === 2) return [{ id: "half-of-eleven", kind: "conceptual", competency: EVEN, says: `Even and odd sums take turns, but 11 sums cannot split equally: starting with ${x} (${x % 2 ? "odd" : "even"}), there is one more ${x % 2 ? "odd" : "even"} sum than ${x % 2 ? "even" : "odd"}.`, predict: x % 2 ? 6 : 5 }];
      return [
        { id: "row-zero-missed", kind: "procedural", competency: PATR, says: "Row 0 (or column 0) was left out; 0 + a number is a cell of the chart too.", predict: x <= 10 ? x : null },
        { id: "diagonal-length", kind: "conceptual", competency: PATR, says: "The cells with the same sum lie on a slanting line; past 10 that line gets shorter again, because rows and columns stop at 10.", predict: x > 10 ? x + 1 : null },
      ];
    },
    distractors: ([kind, x]) => (kind === 0 ? [x + rev(x) + 10, x + rev(x) - 10, x + rev(x) + 11] : kind === 1 ? [palSteps(x) + 2, 1] : kind === 2 ? [10, 11, 4] : [11, 10, 21 - x === x + 1 ? 9 : Math.abs(10 - x) + 1]),
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `${s.inputs[0]} + ${rev(Number(s.inputs[0]))} = ${s.value}; such sums are always multiples of 11` : s.id === "steps" ? `${s.value} reverse-and-add ${s.value === 1 ? "step makes" : "steps make"} a palindrome` : s.id === "row" ? `The sums go even, odd, even … in turn: ${s.value} of the 11 are even` : `The cells with sum ${s.inputs[0]} lie on one slanting line of the chart: ${s.value} cells`),
    domain: [[0, 3], [0, 99]],
    difficulty: ([kind, x]) => (kind === 0 ? ((x % 10) + Math.floor(x / 10) >= 10 ? 2 : 1) : kind === 1 ? 3 : 2),
    figure: ([kind, x]) => (kind === 2 ? { type: "table", head: ["+", ...Array.from({ length: 11 }, (_, i) => String(i))], rows: [[String(x), ...Array.from({ length: 11 }, () => "")]] } : null),
    word: ([kind, x]) =>
      [
        `${name(x)}'s bus number is ${x}. ${name(x)} adds it to the number made by writing its digits the other way round. What total does ${name(x)} get?`,
        `In a class number game, ${name(x)} starts with ${x}, then keeps reversing the digits and adding, until the answer reads the same forwards and backwards. How many times does ${name(x)} reverse and add?`,
        `${name(x)} fills row ${x} of an addition chart: ${x} + 0, ${x} + 1, … up to ${x} + 10, and colours the even sums. How many sums does ${name(x)} colour?`,
        `${name(x)} draws an addition chart with rows 0 to 10 and columns 0 to 10 (each cell is row + column) and circles every cell showing ${x}. How many cells are circled?`,
      ][kind],
    teach: {
      idea: "Addition makes patterns: the sums in an addition chart grow by 1 to the right and down, the same sum lies along a slanting line, and a two-digit number plus its reverse is always 11 × (sum of its digits).",
      method: "Work out a few cases, look for what repeats, then use the rule: even and odd sums alternate along a row, and ab + ba = 11 × (a + b).",
      alternatives: [
        { id: "chart", title: "Colour the chart", kind: "conceptual", text: ["Draw a small addition chart and colour the even sums.", "The colours make a chessboard pattern, and equal sums run in slanting lines from top-right to bottom-left."] },
      ],
    },
    limits: "Two-digit starting numbers needing at most four reverse-and-add steps, and the 0–10 addition chart.",
  },
  {
    id: "aecons",
    arity: 3,
    title: "Sums of consecutive numbers",
    competency: PATR,
    type: "integer",
    mc: true,
    // [kind, a, k]: kind 0 the sum of k consecutive numbers from a; kind 1 k (3 or 5) consecutive numbers with a given sum — the smallest
    parse: none,
    reject: (p) => (!inRange(p, [[0, 1], [1, 40], [3, 6]]) || (p[0] === 1 && p[2] % 2 === 0) ? "3 to 6 consecutive numbers starting at 1 to 40 (3 or 5 when the sum is given)." : null),
    prompt: ([kind, a, k]) => (kind === 0 ? `What is the sum of the ${k} consecutive numbers starting at ${a} (that is, ${a}, ${a + 1}, ${a + 2}, …)?` : `${k === 3 ? "Three" : "Five"} consecutive numbers add up to ${k * a + (k * (k - 1)) / 2}. What is the smallest of them?`),
    solve: ([kind, a, k]) => {
      const S = k * a + (k * (k - 1)) / 2;
      return kind === 0
        ? { steps: [{ id: "pairs", op: "multiply", competency: PATR, inputs: [k, 2 * a + k - 1], value: S }], answer: S }
        : { steps: [{ id: "middle", op: "divide", competency: PATR, inputs: [S, k], value: S / k }, { id: "smallest", op: "subtract", competency: PATR, inputs: [S / k, (k - 1) / 2], value: a }], answer: a };
    },
    // independent: add the numbers one by one; for the smallest, try every starting number
    validate: ([kind, a, k], v) => {
      if (!isInt(v)) return false;
      const sum = (st: number) => {
        let t = 0;
        for (let i = 0; i < k; i++) t += st + i;
        return t;
      };
      if (kind === 0) return v === sum(a);
      return v >= 0 && sum(v) === sum(a);
    },
    bugs: ([kind, a, k]) =>
      kind === 0
        ? [
            { id: "k-times-start", kind: "procedural", competency: PATR, says: `${k} × ${a} was found, but each number after the first is 1, 2, 3 … more than ${a}.`, predict: k * a },
            { id: "first-last", kind: "procedural", competency: PATR, says: "Only the first and last numbers were added; all the numbers in between belong to the sum too.", predict: 2 * a + k - 1 },
          ]
        : [
            { id: "middle-given", kind: "procedural", competency: PATR, says: `The sum ÷ ${k} gives the middle number; the smallest is ${(k - 1) / 2} less.`, predict: a + (k - 1) / 2 },
            { id: "largest-given", kind: "procedural", competency: PATR, says: "The largest of the numbers was given; the question asks for the smallest.", predict: a + k - 1 },
          ],
    distractors: ([kind, a, k]) => (kind === 0 ? [k * a + (k * (k - 1)) / 2 + k, k * a + (k * (k + 1)) / 2] : [a + 1, a - 1].filter((x) => x > 0)),
    variants: () => [],
    explain: (s) => (s.id === "pairs" ? `Pair the first and last, the second and second-last …: the sum is ${s.inputs[0]} × (first + last) ÷ 2 = ${s.value}` : s.id === "middle" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}, the middle number` : `The smallest is ${s.inputs[1]} less than the middle: ${s.value}`),
    domain: [[0, 1], [1, 40], [3, 6]],
    difficulty: ([kind, a, k]) => (kind === 1 ? 3 : k <= 4 && a <= 20 ? 1 : 2),
    word: ([kind, a, k]) => (kind === 0 ? `${name(a)} saves ₹${a} on the first day, ₹${a + 1} on the second, ₹${a + 2} on the third, and so on, one rupee more each day, for ${k} days. How many rupees is that altogether?` : `The house numbers of ${k === 3 ? "three" : "five"} houses in a row on a street go up by 1 (they are consecutive) and add up to ${k * a + (k * (k - 1)) / 2}. What is the smallest house number?`),
    teach: {
      idea: "In a run of consecutive numbers, the middle number is the average: 3 consecutive numbers add up to 3 × the middle one. The first and last together make the same total as the second and second-last.",
      method: "To add them: number of terms × (first + last) ÷ 2. To find them from the sum (an odd number of them): sum ÷ how many = the middle; count back to the smallest.",
      alternatives: [
        { id: "staircase", title: "Make a staircase", kind: "conceptual", text: ["Draw the numbers as towers of blocks: each tower is one block taller than the last.", "Move blocks from the tall end to the short end: all towers become as tall as the middle one."] },
      ],
    },
    limits: "3 to 6 consecutive whole numbers starting at 1 to 40; the parity of sums of even and odd numbers is the parity family (akpar).",
  },
  {
    id: "aenumf",
    arity: 2,
    title: "Number names, commas and expanded forms of large numbers",
    competency: LARGE,
    type: "choice",
    // [kind, s]: 0 Indian number name; 1 Indian commas; 2 International commas; 3 expanded form; 4 International
    // number name (millions); 5 Indian number name with crores — of the number nfNum(kind, s)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 5], [0, 149]])) return "A large number to name, punctuate or expand.";
      const q = nfQ(p);
      if (new Set(q.choices).size !== 4) return "Four different options.";
      return repeatOf(`aenumf${p[0]}`, 150, (t) => String(nfNum(p[0], t)), p[1]) ? "An earlier choice already uses this number (distinct@1)." : null;
    },
    prompt: ([kind, s]) => {
      const n = nfNum(kind, s);
      return [
        `Which is the number name of ${ind(n)} in the Indian system?`,
        `Which shows ${n} with commas placed correctly in the Indian system?`,
        `Which shows ${n} with commas placed correctly in the International system?`,
        `Which is the expanded form of ${ind(n)}?`,
        `Which is the number name of ${intl(n)} in the International system?`,
        `Which is the number name of ${ind(n)} in the Indian system?`,
      ][kind];
    },
    choices: (p) => nfQ(p).choices,
    solve: (p) => {
      const q = nfQ(p);
      return { steps: [{ id: ["name", "commas", "commas", "expand", "name", "name"][p[0]], op: "place", competency: LARGE, inputs: [p[0], q.n], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: read the chosen option back into a number (word by word, or term by term) and check the comma pattern
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = nfQ(p);
      const o = q.choices[v];
      if (o === undefined) return false;
      const [kind] = p;
      if (kind === 0 || kind === 4 || kind === 5) return readName(o) === q.n && (kind === 4 ? !/lakh|crore/.test(o) : !/million|billion/.test(o));
      if (kind === 1) return Number(o.replace(/,/g, "")) === q.n && INDCOMMA.test(o);
      if (kind === 2) return Number(o.replace(/,/g, "")) === q.n && INTCOMMA.test(o);
      return sumTerms(o) === q.n;
    },
    bugs: (p) => {
      const q = nfQ(p);
      const [kind] = p;
      if (kind === 1) return [{ id: "international-commas", kind: "conceptual", competency: LARGE, says: "The commas were placed every three digits, as in the International system; in the Indian system the first comma is after three digits from the right, then after every two.", predict: q.at(1) }, { id: "from-left", kind: "procedural", competency: LARGE, says: "The commas were counted from the left; periods are always counted from the right, starting with the ones.", predict: q.at(2) }];
      if (kind === 2) return [{ id: "indian-commas", kind: "conceptual", competency: LARGE, says: "The commas were placed as in the Indian system (3, then 2s); the International system groups every three digits from the right.", predict: q.at(1) }, { id: "from-left", kind: "procedural", competency: LARGE, says: "The commas were counted from the left; periods are always counted from the right, starting with the ones.", predict: q.at(2) }];
      return [
        { id: "zero-dropped", kind: "conceptual", competency: PV, says: "A zero was skipped, so the digits after it moved into the wrong places; a 0 holds its place even though it is not said aloud.", predict: q.at(1) },
        { id: "extra-place", kind: "procedural", competency: PV, says: "The digits were read one place too high (an extra place was counted); count the places from the ones.", predict: q.at(2) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "commas" ? `Group the digits from the right: ${s.inputs[0] === 1 ? ind(Number(s.inputs[1])) : intl(Number(s.inputs[1]))}` : s.id === "expand" ? `Each digit times its place value: ${expanded(Number(s.inputs[1]))}` : `Read period by period: ${s.inputs[0] === 4 ? intlName(Number(s.inputs[1])) : indName(Number(s.inputs[1]))}`),
    domain: [[0, 5], [0, 149]],
    cap: 600,
    difficulty: ([kind]) => (kind === 0 || kind === 3 ? 1 : kind <= 2 ? 2 : 3),
    word: ([kind, s]) => {
      const n = nfNum(kind, s);
      return [
        `The number of visitors to a museum in Chennai last year was ${ind(n)}. How is this number written in words in the Indian system?`,
        `A bank slip shows the amount ₹${n} without commas. How should it be written with commas in the Indian system?`,
        `A science magazine prints the distance ${n} km without commas. How is it written with commas in the International system?`,
        `${name(s)} breaks the number of books in a city library, ${ind(n)}, into its place values. Which expanded form is right?`,
        `A world news report gives a country's population as ${intl(n)}. How is this number written in words in the International system?`,
        `A state's budget for school books is ₹${ind(n)}. How is this amount written in words in the Indian system?`,
      ][kind];
    },
    teach: {
      idea: "Digits are grouped into periods from the right. Indian system: ones (3 digits), thousands (2), lakhs (2), crores. International system: ones, thousands, millions, each 3 digits.",
      method: "Starting from the right, mark off three digits, then twos (Indian) or threes (International). Read each period with its name; a zero keeps its place even when it is not said.",
      alternatives: [
        { id: "chart", title: "Use a place-value chart", kind: "procedural", text: ["Write the number in a chart with the periods labelled (Cr, L, Th, ones).", "Read the number in each period followed by the period's name, left to right."] },
      ],
    },
    limits: "Numbers of 5 to 9 digits with some zeros; converting between lakhs and millions is the family ajmill.",
  },
  {
    id: "aernd",
    arity: 2,
    title: "Rounding large numbers in real situations",
    competency: ROUND,
    type: "integer",
    mc: true,
    // [k, s]: round rndNum(k, s) to the nearest 10^k (thousand … crore); the situation is RND_CTX(k, s % 4)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[3, 7], [0, 59]])) return "A large number rounded to the nearest thousand, ten thousand, lakh, ten lakh or crore.";
      const [k, s] = p;
      return rndNum(k, s) % 10 ** k === 0 ? "Not already a multiple of the place." : null;
    },
    prompt: ([k, s]) => `${RND_CTX(k, s % 4, rndNum(k, s))} Round this number to the nearest ${RND_PLACE[k]}.`,
    solve: ([k, s]) => {
      const n = rndNum(k, s);
      const u = 10 ** k;
      return { steps: [{ id: "look", op: "compare", competency: ROUND, inputs: [n, u], value: Math.floor((n % u) / (u / 10)) }, { id: "round", op: "round", competency: ROUND, inputs: [n, u], value: roundTo(n, u) }], answer: roundTo(n, u) };
    },
    // independent: find the multiples of the place just below and just above, and take the nearer (halfway goes up)
    validate: ([k, s], v) => {
      const n = rndNum(k, s);
      const u = 10 ** k;
      const below = n - (n % u);
      const above = below + u;
      return v === (n - below < above - n ? below : above);
    },
    bugs: ([k, s]) => {
      const n = rndNum(k, s);
      const u = 10 ** k;
      const down = n - (n % u);
      return [
        { id: "always-down", kind: "conceptual", competency: ROUND, says: `The digits after the ${RND_PLACE[k]}s place were just changed to zeros; when the next digit is 5 or more, round up.`, predict: down },
        { id: "wrong-place", kind: "procedural", competency: PV, says: `The number was rounded to the wrong place (the nearest ${RND_PLACE[k + 1] ?? "ten crore"} instead of the nearest ${RND_PLACE[k]}).`, predict: roundTo(n, 10 * u) },
        { id: "too-fine", kind: "procedural", competency: PV, says: `The number was rounded to a smaller place than asked (${RND_PLACE[k - 1] || "hundred"}s instead of ${RND_PLACE[k]}s).`, predict: roundTo(n, u / 10) },
      ];
    },
    distractors: ([k, s]) => {
      const n = rndNum(k, s);
      const u = 10 ** k;
      return [roundTo(n, u) + u, roundTo(n, u) - u].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "look" ? `Look at the digit just after the place you round to: it is ${s.value}` : `${ind(Number(s.inputs[0]))} is nearer to ${ind(Number(s.value))}`),
    domain: [[3, 7], [0, 59]],
    difficulty: ([k]) => (k <= 3 ? 1 : k <= 5 ? 2 : 3),
    word: ([k, s]) => `A newspaper headline gives a rounded figure. The exact number is ${ind(rndNum(k, s))}, and the paper rounds it to the nearest ${RND_PLACE[k]}. What number does the headline show?`,
    teach: {
      idea: "Large numbers in news and plans are usually rounded: 4,37,862 people is 'about 4,40,000' to the nearest ten thousand. Rounding finds the nearer of the two round numbers on either side.",
      method: "Find the place you round to, look at the digit just to its right: 0–4 keep the place and write zeros after it; 5–9 add 1 to the place and write zeros after it.",
      visual: ([k, s]) => {
        const n = rndNum(k, s);
        const u = 10 ** k;
        const lo = n - (n % u);
        return { type: "numberline", from: lo / u, to: lo / u + 1, step: 0.1, marks: [n / u] };
      },
      alternatives: [
        { id: "between", title: "Which two round numbers?", kind: "conceptual", text: ["Write the round number just below and just above (for example 4,30,000 and 4,40,000).", "The halfway number is 4,35,000; the number is past halfway, so it rounds up."] },
      ],
    },
    limits: "Numbers from 2 thousand up to 100 crore rounded to the nearest thousand, ten thousand, lakh, ten lakh or crore; rounding in the International system is not asked.",
  },
  {
    id: "aeestp",
    arity: 3,
    title: "Estimating a product by rounding",
    competency: ROUND,
    type: "integer",
    mc: true,
    // [mode, a, b]: mode 0 a, b two-digit, rounded to tens; mode 1 a three-digit (to hundreds) times b two-digit (to tens)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [11, 999], [11, 99]])) return "Two numbers to round and multiply.";
      const [mode, a, b] = p;
      if (mode === 0 ? a > 99 : a < 101) return mode === 0 ? "Two two-digit numbers." : "A three-digit number times a two-digit number.";
      if (b % 10 === 0 || b % 10 === 5 || a % 10 === 0 || (mode === 0 && a % 10 === 5) || (mode === 1 && (a % 100 === 50 || a % 100 === 0))) return "Neither number already round or exactly halfway.";
      return null;
    },
    keep: ([mode, a]) => mode === 0 || a % 7 === 3,
    prompt: ([mode, a, b]) => `Estimate ${a} × ${b} by rounding ${mode === 0 ? "each number to the nearest ten" : `${a} to the nearest hundred and ${b} to the nearest ten`} first.`,
    solve: ([mode, a, b]) => {
      const ra = roundTo(a, mode ? 100 : 10);
      const rb = roundTo(b, 10);
      return { steps: [{ id: "ra", op: "round", competency: ROUND, inputs: [a, mode ? 100 : 10], value: ra }, { id: "rb", op: "round", competency: ROUND, inputs: [b, 10], value: rb }, { id: "product", op: "multiply", competency: MM, inputs: [ra, rb], value: ra * rb }], answer: ra * rb };
    },
    // independent: walk from each number to its nearest round number, then add the rounded first number rb times
    validate: ([mode, a, b], v) => {
      const near = (n: number, u: number) => {
        let lo = n;
        while (lo % u) lo--;
        return n - lo < lo + u - n ? lo : lo + u;
      };
      const [ra, rb] = [near(a, mode ? 100 : 10), near(b, 10)];
      let t = 0;
      for (let i = 0; i < rb; i++) t += ra;
      return v === t;
    },
    bugs: ([mode, a, b]) => {
      const u = mode ? 100 : 10;
      const [ra, rb] = [roundTo(a, u), roundTo(b, 10)];
      return [
        { id: "exact", kind: "procedural", competency: ROUND, says: "The exact product was worked out; an estimate rounds the numbers first so it can be done in your head.", predict: a * b },
        { id: "round-down", kind: "conceptual", competency: ROUND, says: "Both numbers were rounded down (the digits just cut off); round up when the next digit is 5 or more.", predict: (a - (a % u)) * (b - (b % 10)) },
        { id: "one-only", kind: "procedural", competency: ROUND, says: `Only ${a} was rounded; round both numbers before multiplying.`, predict: ra * b },
        { id: "zeros", kind: "procedural", competency: P10, says: `${ra / u} × ${rb / 10} was found, but the zeros of ${ra} and ${rb} were not all put back.`, predict: (ra * rb) / 10 },
      ];
    },
    distractors: ([mode, a, b]) => {
      const e = roundTo(a, mode ? 100 : 10) * roundTo(b, 10);
      return [e * 10, e + (mode ? 1000 : 100)];
    },
    variants: () => [],
    explain: (s) => (s.id === "product" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} rounds to ${s.value}`),
    domain: [[0, 1], [11, 999], [11, 99]],
    cap: 450,
    difficulty: ([mode, a, b]) => (mode === 1 ? 3 : a % 10 >= 5 || b % 10 >= 5 ? 2 : 1),
    word: ([mode, a, b]) => (mode === 0 ? `A school orders ${a} cartons of notebooks with ${b} notebooks in each carton. About how many notebooks is that? Estimate by rounding each number to the nearest ten.` : `A cinema hall sells ${a} tickets a day for ${b} days of a film festival. About how many tickets is that? Estimate by rounding ${a} to the nearest hundred and ${b} to the nearest ten.`),
    teach: {
      idea: "Rounding both numbers turns a hard product into an easy one (48 × 32 ≈ 50 × 30). The estimate shows roughly how big the exact answer must be.",
      method: "Round each number as asked, multiply the non-zero digits, then put back all the zeros of both rounded numbers.",
      alternatives: [
        { id: "area", title: "Think of a rectangle", kind: "conceptual", text: ["A product is the area of a rectangle. Rounding the sides a little changes the area only a little.", "50 by 30 is easy to picture: 15 hundreds."] },
      ],
    },
    limits: "Two-digit by two-digit (rounded to tens) and three-digit by two-digit (rounded to hundreds and tens); halfway values are left out.",
  },
  {
    id: "aechk",
    arity: 2,
    title: "Judging answers with an estimate",
    competency: ROUND,
    skill: "MATH.reasoning.estimate-check",
    type: "choice",
    // [kind, s]: 0 is a worked answer reasonable? 1 when is an estimate enough, or an exact answer needed? 2 about how big is a product?
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 299]])) return "An estimate to judge an answer or a situation.";
      const [kind, s] = p;
      if (kind === 0) {
        const q = chkData(s);
        const e = estOf(q);
        if (e <= 0) return "A positive estimate.";
        const off = Math.abs(q.claim - e) / e;
        if (q.claim === q.exact ? Math.abs(q.exact - e) / e > 0.2 : off < 0.5) return "The estimate must clearly decide.";
        return null;
      }
      if (kind === 1) return repeatOf("aechk1", 300, (t) => (t % 2 === s % 2 ? sitPick(t).map((x) => x.text).sort().join("|") : null), s) ? "An earlier choice already shows these situations (distinct@1)." : null;
      return repeatOf("aechk2", 300, (t) => `${sizeData(t).a}x${sizeData(t).b}`, s) ? "An earlier choice already shows this product (distinct@1)." : null;
    },
    prompt: ([kind, s]) => {
      if (kind === 0) {
        const q = chkData(s);
        return `${name(s)} worked out ${q.a} ${["+", "−", "×"][q.op]} ${q.b} and got ${q.claim}. Without working it out exactly, round the numbers to estimate the answer. What can you say about ${name(s)}'s answer?`;
      }
      if (kind === 1) return s % 2 === 0 ? "Which of these needs an EXACT answer (an estimate is not good enough)?" : "For which of these is an ESTIMATE good enough (an exact answer is not needed)?";
      const z = sizeData(s);
      return `Without working it out exactly, about how big is ${z.a} × ${z.b}?`;
    },
    choices: (p) => chkQ(p).choices,
    solve: (p) => {
      const q = chkQ(p);
      const i = q.choices.indexOf(q.right);
      return { steps: [{ id: "judge", op: "estimate", competency: ROUND, inputs: [p[0]], value: i }], answer: i };
    },
    // independent: kind 0 compares the claim with the rounded estimate; kind 1 reads each situation's need; kind 2
    // finds the option nearest the exact product (by how many times bigger or smaller it is)
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = chkQ(p);
      const o = q.choices[v];
      if (o === undefined) return false;
      if (p[0] === 0) {
        const d = chkData(p[1]);
        const e = estOf(d);
        return o === CHK[Math.abs(d.claim - e) <= 0.3 * e ? 0 : d.claim > e ? 1 : 2];
      }
      if (p[0] === 1) {
        const want = p[1] % 2 === 0;
        const hit = q.items!.filter((x) => x.exact === want);
        return hit.length === 1 && hit[0].text === o;
      }
      const z = sizeData(p[1]);
      const exact = z.a * z.b;
      const val = (t: string) => Number(t.replace(/[^\d]/g, ""));
      const best = [...q.choices].sort((x, y) => Math.abs(Math.log(val(x) / exact)) - Math.abs(Math.log(val(y) / exact)))[0];
      return o === best;
    },
    bugs: (p) => {
      const q = chkQ(p);
      const at = (t: string) => q.choices.indexOf(t);
      if (p[0] === 0) {
        const d = q.q!;
        return d.claim === d.exact
          ? [{ id: "not-equal", kind: "conceptual", competency: ROUND, says: "The answer was thought wrong because it is not exactly the estimate; an estimate only has to be close.", predict: at(CHK[d.claim > estOf(d) ? 1 : 2]) }]
          : [{ id: "trust-working", kind: "procedural", competency: ROUND, says: "The worked answer was trusted without comparing it with the estimate; it is many times too " + (d.claim > d.exact ? "big" : "small") + ", so there must be a mistake (often a digit put in the wrong column).", predict: at(CHK[0]) }];
      }
      if (p[0] === 1) {
        const items = q.items!;
        return [{ id: "big-means-exact", kind: "conceptual", competency: ROUND, says: p[1] % 2 === 0 ? "A large or important-sounding number was taken to need an exact answer; an estimate is enough when only the rough size matters (news, planning), but money handed over and doses must be exact." : "A situation where money or a dose changes hands was taken as one where an estimate is enough; those need exact answers.", predict: at(items[1].text) }];
      }
      return [
        { id: "zeros-short", kind: "procedural", competency: P10, says: "A zero was lost when multiplying the rounded numbers; put back all the zeros of both.", predict: at(q.choices.find((c) => Number(c.replace(/[^\d]/g, "")) === q.z!.E / 10)!) },
        { id: "zeros-extra", kind: "procedural", competency: P10, says: "One zero too many was put on; count the zeros of both rounded numbers.", predict: at(q.choices.find((c) => Number(c.replace(/[^\d]/g, "")) === q.z!.E * 10)!) },
      ];
    },
    variants: () => [],
    explain: (s) => ["Round the numbers, work out the estimate and compare the answer with it", "Ask whether only the rough size matters, or every unit counts", "Round each number to its biggest place and multiply"][Number(s.inputs[0])],
    domain: [[0, 2], [0, 299]],
    difficulty: ([kind]) => (kind === 1 ? 1 : kind === 2 ? 2 : 3),
    word: ([kind, s]) => {
      if (kind === 0) {
        const q = chkData(s);
        return `At a shop, ${name(s)}'s bill needs ${q.a} ${["+", "−", "×"][q.op]} ${q.b}, and the cashier's screen shows ${q.claim}. Use an estimate (round the numbers first) to judge the cashier's answer.`;
      }
      if (kind === 1) return s % 2 === 0 ? `${name(s)} is helping at home and in the market. In which of these must the answer be EXACT?` : `${name(s)} is reading the newspaper and planning a trip. For which of these is an ESTIMATE good enough?`;
      const z = sizeData(s);
      return `A box holds ${z.b} packets and a shop has ${z.a} boxes. About how many packets does the shop have?`;
    },
    teach: {
      idea: "An estimate is a quick, nearly-right answer. It tells you how big an exact answer should be, so a worked answer far from it must have a mistake. Some situations (giving change, a medicine dose) need exact answers; others (a crowd, a distance for planning) need only an estimate.",
      method: "Round each number (to the nearest ten or hundred), work out the estimate in your head, and compare. Close: reasonable. Many times bigger or smaller: check the working.",
      alternatives: [
        { id: "columns", title: "Look for a column slip", kind: "procedural", text: ["If an answer is about ten times too big or too small, a digit was probably written in the wrong column.", "Line the numbers up by their ones digits and work it again."] },
      ],
    },
    limits: "Sums, differences and products of two- and three-digit numbers where the estimate clearly decides; mental-calculation tricks for exact answers are other families.",
  },
  {
    id: "aerdec",
    arity: 2,
    title: "Rounding a decimal to a whole number, tenths or hundredths",
    competency: ROUND,
    type: "fraction",
    mc: true,
    decimals: true,
    // [place, s]: round the three-place decimal decThou(s) (in thousandths) to the nearest whole (0), tenth (1) or hundredth (2)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 199]])) return "A decimal with three places, rounded to a whole number, tenths or hundredths.";
      const th = decThou(p[1]);
      const u = [1000, 100, 10][p[0]];
      if (th % u === 0 || th < 1000) return "Not already rounded, at least 1.";
      return repeatOf("aerdec", 200, (t) => String(decThou(t)), p[1]) ? "An earlier choice already uses this number (distinct@1)." : null;
    },
    prompt: ([place, s]) => `Round ${d3(decThou(s))} to the nearest ${["whole number", "tenth", "hundredth"][place]}.`,
    solve: ([place, s]) => {
      const th = decThou(s);
      const r = roundTh(th, place);
      return { steps: [{ id: "look", op: "compare", competency: ROUND, inputs: [d3(th), place], value: Math.floor((th % [1000, 100, 10][place]) / [100, 10, 1][place]) }, { id: "round", op: "round", competency: ROUND, inputs: [d3(th), place], value: r / 1000 }], answer: r / 1000 };
    },
    // independent: list the two candidates on either side (in thousandths) and pick the nearer; halfway goes up
    validate: ([place, s], v) => {
      const th = decThou(s);
      const a = thou(v);
      if (a === null) return false;
      const u = [1000, 100, 10][place];
      let lo = th;
      while (lo % u) lo--;
      return a === (th - lo < lo + u - th ? lo : lo + u);
    },
    bugs: ([place, s]) => {
      const th = decThou(s);
      const u = [1000, 100, 10][place];
      return [
        { id: "cut-off", kind: "conceptual", competency: ROUND, says: "The digits after the place were simply dropped; when the next digit is 5 or more, the place goes up by 1.", predict: (th - (th % u)) / 1000 },
        { id: "wrong-place", kind: "procedural", competency: DEC, says: `The number was rounded to the ${["tenths", "hundredths", "tenths"][place]} instead of the ${["ones (a whole number)", "tenths", "hundredths"][place]}: the first place after the point is tenths, the second hundredths.`, predict: roundTh(th, place === 2 ? 1 : place + 1) / 1000 },
      ];
    },
    distractors: ([place, s]) => {
      const r = roundTh(decThou(s), place);
      const u = [1000, 100, 10][place];
      return [(r + u) / 1000, (r - u) / 1000];
    },
    variants: () => [],
    explain: (s) => (s.id === "look" ? `Look at the digit after the ${["ones", "tenths", "hundredths"][Number(s.inputs[1])]} place: it is ${s.value}` : `${s.inputs[0]} rounds to ${s.value}`),
    domain: [[0, 2], [0, 199]],
    difficulty: ([place]) => (place === 0 ? 1 : place === 1 ? 2 : 3),
    word: ([place, s]) => [`A parcel weighs ${d3(decThou(s))} kg. The courier's bill shows the weight to the nearest whole kilogram. What weight is on the bill, in kg?`, `${name(s)} ${rdecEvent(decThou(s))} in a time the stopwatch showed as ${d3(decThou(s))} seconds. The record book writes times to the nearest tenth of a second. What time is written, in seconds?`, `A jeweller weighs a gold chain at ${d3(decThou(s))} g and writes the weight to the nearest hundredth of a gram. What weight is written, in grams?`][place],
    teach: {
      idea: "Rounding a decimal works like rounding whole numbers: find which of the two numbers on either side, at the place asked for, it is nearer to.",
      method: "Find the place you round to. Look at the digit just to its right: 0–4 keep the place and drop the digits after it; 5–9 add 1 to the place and drop the digits after it.",
      visual: ([place, s]) => {
        const th = decThou(s);
        const u = [1000, 100, 10][place];
        const lo = th - (th % u);
        return { type: "numberline", from: lo / 1000, to: (lo + u) / 1000, step: u / 10000, marks: [th / 1000] };
      },
      alternatives: [
        { id: "money", title: "Think of rupees and paise", kind: "conceptual", text: ["₹23.47 to the nearest rupee: is it nearer ₹23 or ₹24? 47 paise is less than 50, so ₹23.", "To the nearest tenth (10 paise): ₹23.47 is between ₹23.40 and ₹23.50, nearer ₹23.50."] },
      ],
    },
    limits: "Decimals with three places from 1 to 60, rounded to a whole number, tenths or hundredths.",
  },
];
B05.push(...NUM_MORE);

// ---------------------------------------------------------------- measures: helpers for the gap@1 families

const CU = [
  { big: "m", small: "cm", f: 100, bigw: "metres", smallw: "centimetres" },
  { big: "kg", small: "g", f: 1000, bigw: "kilograms", smallw: "grams" },
  { big: "L", small: "mL", f: 1000, bigw: "litres", smallw: "millilitres" },
  { big: "km", small: "m", f: 1000, bigw: "kilometres", smallw: "metres" },
  { big: "cm", small: "mm", f: 10, bigw: "centimetres", smallw: "millimetres" },
  { big: "g", small: "mg", f: 1000, bigw: "grams", smallw: "milligrams" },
];
const REM1000 = [5, 8, 20, 45, 50, 75, 125, 250, 305, 450, 600, 930, 999, 64, 402, 710, 85, 333, 560, 18];
const REM100 = [5, 8, 12, 25, 30, 45, 50, 60, 75, 99];
/** An amount in the small unit: big part 1 to 9 and a small part from a list (with zeros inside), or null. */
const cuAmount = (k: number, v: number) => {
  const f = CU[k].f;
  const b = 1 + (v % 9);
  const r = Math.floor(v / 9);
  if (f === 10) return r < 9 ? 10 * b + (r + 1) : null;
  if (f === 100) return r < REM100.length ? 100 * b + REM100[r] : null;
  return r < REM1000.length ? 1000 * b + REM1000[r] : null;
};
const TAB_ITEMS = [["notebooks", "notebook"], ["pens", "pen"], ["erasers", "eraser"], ["geometry boxes", "geometry box"], ["rulers", "ruler"], ["packets of crayons", "packet of crayons"], ["drawing books", "drawing book"]];
const tabData = (s: number) => {
  const r = rng(s * 3 + 12000);
  const pick: number[] = [];
  while (pick.length < 3) {
    const i = Math.floor(r() * TAB_ITEMS.length);
    if (!pick.includes(i)) pick.push(i);
  }
  const rows = pick.map((i) => ({ item: TAB_ITEMS[i], q: 2 + Math.floor(r() * 11), p: PRICES[Math.floor(r() * 12)] }));
  return rows;
};
const tabFig = (s: number): Visual => {
  const rows = tabData(s);
  return { type: "table", head: ["Item", "How many", "Price of one (₹)", "Cost (₹)"], rows: rows.map((x, i) => [x.item[0], i === 2 ? "?" : x.q, i === 1 ? "?" : x.p, i === 0 ? "?" : x.q * x.p]) };
};
const SPEEDS = [30, 40, 45, 50, 60];
/** Something whose size in inches is about x. */
const inchThing = (x: number) => (x <= 6 ? "A screw" : x <= 13 ? "A tablet screen" : x <= 27 ? "A computer monitor" : "A TV screen");
const bigData = (kind: number, s: number) => {
  const r = rng(s * 7 + kind * 300 + 5000);
  if (kind === 0) return { a: 100000 + Math.floor(r() * 900000), b: 1000 + Math.floor(r() * 19000), c: 1000 + Math.floor(r() * 14000) };
  if (kind === 1) {
    const n = 3 + Math.floor(r() * 10);
    const c = 10000 + 500 * Math.floor(r() * 160);
    const B = 100000 * (Math.ceil((n * c) / 100000) + 1 + Math.floor(r() * 20));
    return { a: B, b: n, c };
  }
  return { a: 120 + Math.floor(r() * 830), b: 2 + Math.floor(r() * 6), c: 4 + Math.floor(r() * 49) };
};
// ---------------------------------------------------------------- attribute-matching puzzles (aematch)
const MATCH_SETS = [
  { what: "fruit", verb: "likes", items: ["mangoes", "bananas", "guavas", "grapes"] },
  { what: "sport", verb: "plays", items: ["kabaddi", "cricket", "chess", "football"] },
  { what: "colour of bicycle", verb: "rides a bicycle that is", items: ["red", "blue", "green", "yellow"] },
  { what: "instrument", verb: "plays", items: ["the veena", "the flute", "the drums", "the violin"] },
];
const PERMS4: number[][] = [];
for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) if (new Set([a, b, c, d]).size === 4) PERMS4.push([a, b, c, d]);
type Clue = { who: number; item: number; yes: boolean };
const matchData = (s: number) => {
  const r = rng(s * 17 + 8000);
  const set = MATCH_SETS[s % MATCH_SETS.length];
  const people = [0, 1, 2, 3].map((i) => name(s + 3 * i));
  if (new Set(people).size < 4) return null;
  const truth = PERMS4[Math.floor(r() * 24)]; // truth[person] = item
  const clues: Clue[] = [];
  const fits = (pm: number[]) => clues.every((c) => (pm[c.who] === c.item) === c.yes);
  for (let guard = 0; guard < 200 && PERMS4.filter(fits).length > 1; guard++) {
    const who = Math.floor(r() * 4);
    const yes = clues.filter((c) => c.yes).length === 0 && r() < 0.25;
    const item = yes ? truth[who] : (truth[who] + 1 + Math.floor(r() * 3)) % 4;
    const before = PERMS4.filter(fits).length;
    clues.push({ who, item, yes });
    if (PERMS4.filter(fits).length === before) clues.pop();
  }
  if (PERMS4.filter(fits).length !== 1) return null;
  // the item asked about: never one a "does" clue names outright
  const open = [0, 1, 2, 3].filter((i) => !clues.some((c) => c.yes && c.item === i));
  const ask = open[Math.floor(r() * open.length)];
  return { set, people, truth, clues, ask };
};
const andList = (xs: string[]) => `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const clueText = (d: NonNullable<ReturnType<typeof matchData>>, c: Clue) => `${d.people[c.who]} ${c.yes ? "" : "does not "}${c.yes ? d.set.verb : d.set.verb.replace(/^likes/, "like").replace(/^plays/, "play").replace(/^rides/, "ride")} ${d.set.items[c.item]}.`;
// ---------------------------------------------------------------- estimating irregular areas on a grid (aeirr)
const IRR_SYM = { full: "■", more: "◕", half: "◑", less: "◔", none: "□" };
const irrData = (s: number) => {
  const r = rng(s * 23 + 2700);
  const rows = 6;
  const cols = 7;
  const cy = 2.5 + r();
  const cx = 3 + r();
  const ry = 1.6 + r() * 1.2;
  const rx = 2 + r() * 1.3;
  const grid: string[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      const d = ((i + 0.5 - cy) / ry) ** 2 + ((j + 0.5 - cx) / rx) ** 2 + (r() - 0.5) * 0.35;
      row.push(d < 0.55 ? "full" : d < 0.8 ? "more" : d < 1.0 ? (r() < 0.5 ? "half" : "more") : d < 1.25 ? "less" : "none");
    }
    grid.push(row);
  }
  const count = (k: string) => grid.flat().filter((x) => x === k).length;
  return { grid, full: count("full"), more: count("more"), half: count("half"), less: count("less") };
};
const twoShapes = (s: number) => {
  const r = rng(s * 29 + 3100);
  const grid = Array.from({ length: 5 }, () => Array(8).fill("·"));
  const fill = (c0: number, c1: number, ch: string) => {
    for (let i = 0; i < 5; i++) {
      const w0 = c0 + Math.floor(r() * 2);
      const w1 = c1 - Math.floor(r() * 2);
      if (r() < 0.15) continue;
      for (let j = w0; j <= w1; j++) grid[i][j] = ch;
    }
  };
  fill(0, 3, "A");
  fill(4, 7, "B");
  const a = grid.flat().filter((x) => x === "A").length;
  const b = grid.flat().filter((x) => x === "B").length;
  return { grid, a, b };
};
const euclid = (a: number, b: number) => {
  const rs: number[] = [];
  let [x, y] = [a, b];
  while (y) {
    rs.push(x % y);
    [x, y] = [y, x % y];
  }
  return rs; // the remainders, one per division
};
const FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

const MEAS_MORE: Def[] = [
  {
    id: "aedivm",
    arity: 3,
    title: "Dividing a measure in two units",
    competency: MIX,
    type: "tuple",
    mc: true,
    // [kind, A, n]: the measure n × (mixed A) shared into n equal parts; kind 0 m cm, 1 kg g, 2 L mL
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [20, 99], [2, 9]])) return "A measure shared into 2 to 9 equal parts.";
      const [kind, A, n] = p;
      const [b, s] = mixed(kind, A);
      const f = UNITS[kind].f;
      const D = n * (b * f + s);
      return s === 0 || Math.floor(D / f) % n === 0 || Math.floor(D / f) > 40 ? "The large units must not share out exactly (so the small units are needed), with up to 40 large units." : null;
    },
    prompt: ([kind, A, n]) => {
      const [b, s] = mixed(kind, A);
      const f = UNITS[kind].f;
      const D = n * (b * f + s);
      const u = UNITS[kind];
      return `Divide ${say(kind, Math.floor(D / f), D % f)} into ${n} equal parts. How much is each part? Write the answer as (${u.big}, ${u.small}); for example, 3 ${u.big} 45 ${u.small} is (3, 45).`;
    },
    solve: ([kind, A, n]) => {
      const [b, s] = mixed(kind, A);
      const f = UNITS[kind].f;
      const D = n * (b * f + s);
      const [B, S] = [Math.floor(D / f), D % f];
      return {
        steps: [
          { id: "big", op: "divide", competency: MIX, inputs: [B, n], value: Math.floor(B / n) },
          { id: "regroup", op: "regroup", competency: CONV, inputs: [B % n, f, S], value: (B % n) * f + S },
          { id: "small", op: "divide", competency: "MATH.number.long-division", inputs: [(B % n) * f + S, n], value: ((B % n) * f + S) / n },
        ],
        answer: tup(b, s),
      };
    },
    // independent: multiply the answer back by n (the inverse) and compare with the measure shared
    validate: ([kind, A, n], v) => {
      const t = readTuple(v);
      const f = UNITS[kind].f;
      if (!t || t.length !== 2 || t[1] < 0 || t[1] >= f || t[0] < 0) return false;
      const [b, s] = mixed(kind, A);
      let tot = 0;
      for (let i = 0; i < n; i++) tot += t[0] * f + t[1];
      return tot === n * (b * f + s);
    },
    bugs: ([kind, A, n]) => {
      const [b, s] = mixed(kind, A);
      const f = UNITS[kind].f;
      const u = UNITS[kind];
      const D = n * (b * f + s);
      const [B, S] = [Math.floor(D / f), D % f];
      return [
        { id: "left-over-dropped", kind: "conceptual", competency: CONV, says: `${B} ${u.big} ÷ ${n} leaves ${B % n} ${u.big} over; ${B % n === 1 ? "that 1" : `those ${B % n}`} ${u.big} must be changed into ${u.small} (${(B % n) * f} ${u.small}) and shared too.`, predict: tup(Math.floor(B / n), Math.floor(S / n)) },
        ...(f === 1000 && ((B % n) * 100 + S) % n === 0 && ((B % n) * 100 + S) / n < f ? [{ id: "change-100", kind: "recall", competency: CONV, says: `The ${u.big} left over were changed into 100 ${u.small} each; 1 ${u.big} = 1000 ${u.small}.`, predict: tup(Math.floor(B / n), ((B % n) * 100 + S) / n) } as Bug] : []),
      ];
    },
    distractors: ([kind, A]) => {
      const [b, s] = mixed(kind, A);
      return [tup(b + 1, s), tup(b, (s + UNITS[kind].step) % UNITS[kind].f)];
    },
    variants: () => [],
    explain: (s) => (s.id === "big" ? `Large units: ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}, with ${Number(s.inputs[0]) % Number(s.inputs[1])} left over` : s.id === "regroup" ? `Change the ${s.inputs[0]} left over into small units and add the ${s.inputs[2]}: ${s.value}` : `Small units: ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [20, 99], [2, 9]],
    cap: 400,
    difficulty: ([kind, , n]) => (kind === 0 && n <= 4 ? 1 : n <= 5 ? 2 : 3),
    word: ([kind, A, n]) => {
      const [b, s] = mixed(kind, A);
      const f = UNITS[kind].f;
      const D = n * (b * f + s);
      const m = say(kind, Math.floor(D / f), D % f);
      return [
        `${name(A + n)} cuts a rope of ${m} into ${n} equal pieces for a tug-of-war game. How long is each piece? Write (m, cm).`,
        `A shopkeeper packs ${m} of rice equally into ${n} bags. How much rice is in each bag? Write (kg, g).`,
        `${m} of buttermilk is poured equally into ${n} jugs for a wedding. How much buttermilk is in each jug? Write (L, mL).`,
      ][kind];
    },
    teach: {
      idea: "Dividing a measure shares the large units first; whatever large units are left over are changed into small units and shared with the small units.",
      method: "Divide the large units. Change the ones left over into small units (× 100 or × 1000), add the small units, and divide those. Check: multiply the answer back.",
      alternatives: [
        { id: "all_small", title: "Work in the small unit", kind: "procedural", text: ["Change the whole measure into the small unit (7 m 20 cm = 720 cm).", "Divide (720 ÷ 4 = 180 cm) and change back (1 m 80 cm)."] },
      ],
    },
    limits: "Measures that share exactly into 2 to 9 parts (cm in fives, g and mL in fifties); division with remainders is not here.",
  },
  {
    id: "aeconvu",
    arity: 2,
    title: "Changing a measure into the larger unit and what is left",
    competency: CONV,
    type: "tuple",
    mc: true,
    // [k, v]: cuAmount(k, v) of the small unit of CU[k], written as (large, small)
    parse: none,
    reject: (p) => (!inRange(p, [[0, 5], [0, 179]]) || cuAmount(p[0], p[1]) === null ? "An amount in cm, g, mL, m, mm or mg." : null),
    prompt: ([k, v]) => `${cuAmount(k, v)} ${CU[k].small} = how many ${CU[k].big} and ${CU[k].small}? Write the answer as (${CU[k].big}, ${CU[k].small}); for example, 3 ${CU[k].big} 5 ${CU[k].small} is (3, 5).`,
    solve: ([k, v]) => {
      const a = cuAmount(k, v)!;
      const f = CU[k].f;
      return { steps: [{ id: "big", op: "divide", competency: CONV, inputs: [a, f], value: Math.floor(a / f) }, { id: "left", op: "subtract", competency: CONV, inputs: [a, Math.floor(a / f) * f], value: a % f }], answer: tup(Math.floor(a / f), a % f) };
    },
    // independent: build the amount back from the answer (large × factor + small) and check the small part is less than one large unit
    validate: ([k, v], ans) => {
      const t = readTuple(ans);
      const f = CU[k].f;
      return !!t && t.length === 2 && t[1] >= 0 && t[1] < f && t[0] * f + t[1] === cuAmount(k, v);
    },
    bugs: ([k, v]) => {
      const a = cuAmount(k, v)!;
      const f = CU[k].f;
      const g = f === 100 ? 1000 : f === 10 ? 100 : 100;
      return [
        { id: "wrong-factor", kind: "recall", competency: CONV, says: `1 ${CU[k].big} was taken as ${g} ${CU[k].small}; 1 ${CU[k].big} = ${f} ${CU[k].small}.`, predict: Math.floor(a / g) > 0 ? tup(Math.floor(a / g), a % g) : null },
        { id: "left-dropped", kind: "procedural", competency: CONV, says: `The ${CU[k].small} left over were dropped; ${a % f} ${CU[k].small} remain after taking out the whole ${CU[k].big}.`, predict: tup(Math.floor(a / f), 0) },
      ];
    },
    distractors: ([k, v]) => {
      const a = cuAmount(k, v)!;
      const f = CU[k].f;
      return [tup(Math.floor(a / f) + 1, a % f), tup(Math.floor(a / f), (a % f) * 10 < f ? (a % f) * 10 : Math.floor((a % f) / 10))];
    },
    variants: () => [],
    explain: (s) => (s.id === "big" ? `${s.inputs[0]} ÷ ${s.inputs[1]}: ${s.value} whole large ${s.value === 1 ? "unit" : "units"}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} small units left`),
    domain: [[0, 5], [0, 179]],
    cap: 450,
    difficulty: ([k, v]) => {
      const a = cuAmount(k, v)!;
      return a % CU[k].f < CU[k].f / 10 ? 3 : k === 0 || k === 4 ? 1 : 2;
    },
    word: ([k, v]) => {
      const a = cuAmount(k, v)!;
      return [
        `A ribbon is ${a} cm long. How long is it in metres and centimetres? Write (m, cm).`,
        `A sack of onions weighs ${a} g. What is that in kilograms and grams? Write (kg, g).`,
        `A water can holds ${a} mL. What is that in litres and millilitres? Write (L, mL).`,
        `${name(v)} cycles ${a} m to the market. What is that in kilometres and metres? Write (km, m).`,
        `A pencil is ${a} mm long. How long is it in centimetres and millimetres? Write (cm, mm).`,
        `A tablet strip says each tablet has ${a} mg of medicine. What is that in grams and milligrams? Write (g, mg).`,
      ][k];
    },
    teach: {
      idea: "1 m = 100 cm, 1 cm = 10 mm, 1 kg = 1000 g, 1 g = 1000 mg, 1 L = 1000 mL, 1 km = 1000 m. To change into the larger unit, see how many whole large units fit, and what is left.",
      method: "Divide by 100, 10 or 1000: the whole number of times is the large unit; the remainder is the small unit (3450 g = 3 kg 450 g).",
      alternatives: [
        { id: "split_digits", title: "Split the digits", kind: "procedural", text: ["For × 1000 units, the last three digits are the small unit: 3|450 g = 3 kg 450 g; 3|045 g = 3 kg 45 g.", "For cm to m, the last two digits; for mm to cm, the last digit."] },
      ],
    },
    limits: "Whole amounts with 1 to 9 large units; decimals of the large unit are the family aeconvd.",
  },
  {
    id: "aeconvd",
    arity: 2,
    title: "Writing a measure as a decimal of the larger unit",
    competency: CONV,
    type: "fraction",
    mc: true,
    decimals: true,
    // [k, v]: cuAmount(k, v) of the small unit of CU[k], as a decimal of the large unit
    parse: none,
    reject: (p) => (!inRange(p, [[0, 5], [0, 179]]) || cuAmount(p[0], p[1]) === null ? "An amount in cm, g, mL, m, mm or mg." : null),
    prompt: ([k, v]) => `Write ${cuAmount(k, v)} ${CU[k].small} in ${CU[k].bigw} (as a decimal).`,
    solve: ([k, v]) => {
      const a = cuAmount(k, v)!;
      return { steps: [{ id: "divide", op: "divide", competency: CONV, inputs: [a, CU[k].f], value: a / CU[k].f }], answer: a / CU[k].f };
    },
    // independent: multiply the answer back by the factor and compare with the amount
    validate: ([k, v], ans) => {
      const t = thou(ans);
      return t !== null && (t * CU[k].f) / 1000 === cuAmount(k, v);
    },
    bugs: ([k, v]) => {
      const a = cuAmount(k, v)!;
      const f = CU[k].f;
      const g = f === 1000 ? 100 : 1000;
      const w = Math.floor(a / f);
      const rest = a % f;
      return [
        { id: "wrong-factor", kind: "recall", competency: CONV, says: `1 ${CU[k].big} was taken as ${g} ${CU[k].small}; 1 ${CU[k].big} = ${f} ${CU[k].small}.`, predict: a / g },
        { id: "zero-lost", kind: "conceptual", competency: DEC, says: `The ${rest} ${CU[k].small} were written straight after the point, but they are ${f === 1000 ? "thousandths" : f === 100 ? "hundredths" : "tenths"} of a ${CU[k].big}, so they need ${String(f).length - 1} decimal places: put zeros in the empty places.`, predict: String(rest).length < String(f).length - 1 ? Number(`${w}.${rest}`) : null },
      ];
    },
    distractors: ([k, v]) => {
      const a = cuAmount(k, v)!;
      return [a / (CU[k].f * 10), a / 10 === a / CU[k].f ? a : a / 10];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} ÷ ${s.inputs[1]} = ${String(s.value)}`,
    domain: [[0, 5], [0, 179]],
    cap: 450,
    difficulty: ([k, v]) => (String(cuAmount(k, v)! % CU[k].f).length < String(CU[k].f).length - 1 ? 3 : 2),
    word: ([k, v]) => {
      const a = cuAmount(k, v)!;
      return [`A tailor measures ${a} cm of cloth. The bill shows it in metres. What number of metres is on the bill?`, `A parcel weighs ${a} g. The post office writes the weight in kilograms. What does it write?`, `A bottle of oil holds ${a} mL. How many litres is that?`, `A walk is ${a} m long. How many kilometres is that?`, `A screw is ${a} mm long. How many centimetres is that?`, `A medicine has ${a} mg of a vitamin. How many grams is that?`][k];
    },
    teach: {
      idea: "A small unit is a fraction of the large unit: 1 g is one thousandth of a kg, so 3450 g = 3450 thousandths of a kg = 3.450 kg = 3.45 kg.",
      method: "Divide by 1000 (or 100, or 10): move the decimal point 3 (or 2, or 1) places to the left, filling empty places with zeros (3045 g = 3.045 kg).",
      alternatives: [
        { id: "chart", title: "A place-value chart", kind: "procedural", text: ["Write the amount in a chart with kg in the ones column and g in the tenths, hundredths and thousandths columns.", "3045 g: 3 in the ones, then 0, 4, 5: 3.045 kg."] },
      ],
    },
    limits: "Amounts with 1 to 9 large units; changing a decimal back into the smaller unit is the family aidp10.",
  },
  {
    id: "aewcmp",
    arity: 2,
    title: "Comparing weights in different units with <, = or >",
    competency: CONV,
    type: "choice",
    // [kind, s]: kind 0 kg and g against g; kind 1 g and mg against mg
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 149]])) return "Two weights to compare.";
      const [kind, s] = p;
      const w = wcData(kind, s);
      return w.c <= 0 || repeatOf(`aewcmp${kind}`, 150, (t) => { const x = wcData(kind, t); return `${x.a},${x.b},${x.c}`; }, s) ? "An earlier choice already compares these weights (distinct@1)." : null;
    },
    prompt: ([kind, s]) => {
      const w = wcData(kind, s);
      const [B, S] = kind ? ["g", "mg"] : ["kg", "g"];
      return `Which sign goes in the box: ${w.a} ${B} ${w.b} ${S} ☐ ${w.c} ${S}? Choose <, = or >.`;
    },
    choices: (p) => shuffled(`aewcmp:${p}`, ["<", "=", ">"]).choices,
    solve: ([kind, s]) => {
      const w = wcData(kind, s);
      const L = 1000 * w.a + w.b;
      const q = shuffled(`aewcmp:${[kind, s]}`, ["<", "=", ">"]);
      const i = L < w.c ? 0 : L === w.c ? 1 : 2;
      return { steps: [{ id: "convert", op: "convert", competency: CONV, inputs: [w.a, w.b], value: L }, { id: "compare", op: "compare", competency: CONV, inputs: [L, w.c], value: q.at(i) }], answer: q.at(i) };
    },
    // independent: change the right-hand weight into the large and small units, then compare large units first
    validate: ([kind, s], v) => {
      if (!isIdx(v)) return false;
      const w = wcData(kind, s);
      const [cb, cs] = [Math.floor(w.c / 1000), w.c % 1000];
      const sign = w.a !== cb ? (w.a < cb ? "<" : ">") : w.b === cs ? "=" : w.b < cs ? "<" : ">";
      return shuffled(`aewcmp:${[kind, s]}`, ["<", "=", ">"]).choices[v] === sign;
    },
    bugs: ([kind, s]) => {
      const w = wcData(kind, s);
      const q = shuffled(`aewcmp:${[kind, s]}`, ["<", "=", ">"]);
      const heard = Number(`${w.a}${w.b}`);
      const L = 1000 * w.a + w.b;
      const sg = (x: number) => (x < w.c ? 0 : x === w.c ? 1 : 2);
      const [B, S] = kind ? ["g", "mg"] : ["kg", "g"];
      return [
        { id: "side-by-side", kind: "conceptual", competency: PV, says: `${w.a} ${B} ${w.b} ${S} was read as ${heard} ${S} by writing the numbers side by side; it is ${w.a} × 1000 + ${w.b} = ${L} ${S}.`, predict: sg(heard) !== sg(L) ? q.at(sg(heard)) : null },
        { id: "bigger-number", kind: "conceptual", competency: CONV, says: `The numbers were compared without the units (${w.c} looks bigger than ${w.a} and ${w.b}); change both weights into the same unit first.`, predict: sg(L) !== 0 ? q.at(0) : null },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "convert" ? `${s.inputs[0]} large units ${s.inputs[1]} small units = ${s.value} small units` : `Compare ${s.inputs[0]} and ${s.inputs[1]}`),
    domain: [[0, 1], [0, 149]],
    difficulty: ([kind, s]) => (s % 3 === 1 ? 3 : kind ? 2 : 1),
    word: ([kind, s]) => {
      const w = wcData(kind, s);
      return kind === 0 ? `${name(s)}'s bag of potatoes weighs ${w.a} kg ${w.b} g and ${name(s + 1)}'s weighs ${w.c} g. Which sign is true: ${name(s)}'s bag ☐ ${name(s + 1)}'s bag? Choose <, = or >.` : `One medicine packet holds ${w.a} g ${w.b} mg of powder and another holds ${w.c} mg. Which sign is true: first packet ☐ second packet? Choose <, = or >.`;
    },
    teach: {
      idea: "Weights can be compared only in the same unit: 1 kg = 1000 g and 1 g = 1000 mg.",
      method: "Change the weight in two units into the small unit (2 kg 50 g = 2050 g), then compare the numbers.",
      alternatives: [
        { id: "large_first", title: "Compare the large units first", kind: "procedural", text: ["Change the single amount into large and small units (2500 g = 2 kg 500 g).", "Compare kilograms first; only if they are equal, compare the grams."] },
      ],
    },
    limits: "Weights in kg and g, or g and mg, compared with one amount in the small unit.",
  },
  {
    id: "aeftin",
    arity: 3,
    title: "Feet, inches and centimetres, and estimating with a known length",
    competency: CONV,
    type: "fraction",
    mc: true,
    decimals: true,
    // [kind, a, b]: kind 0 a feet; kind 1 a feet b inches (to cm, 1 foot ≈ 30 cm, 1 inch ≈ 2.5 cm); kind 2 a times the reference REFS[b]
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [1, 12], [0, 11]])) return "Feet and inches, or a number of known lengths.";
      const [kind, a, b] = p;
      if (kind === 0) return b !== 0 || a < 2 ? "2 to 12 feet." : null;
      if (kind === 1) return a > 7 || b < 1 ? "1 to 7 feet and 1 to 11 inches." : null;
      return a < 3 || b >= REFS.length ? "3 to 12 times a known length." : null;
    },
    prompt: ([kind, a, b]) =>
      kind === 0 ? `1 foot is about 30 cm. About how many centimetres is ${a} feet?`
        : kind === 1 ? `1 foot is about 30 cm and 1 inch is about 2.5 cm (12 inches make 1 foot). About how many centimetres is ${a} ${a === 1 ? "foot" : "feet"} ${b} ${b === 1 ? "inch" : "inches"}?`
          : `${REFS[b][0]} is about ${REFS[b][1]} m ${REFS[b][2]}. ${REFS[b][3](a)} About how many metres is that?`,
    solve: ([kind, a, b]) => {
      if (kind === 2) return { steps: [{ id: "times", op: "multiply", competency: CONV, inputs: [a, REFS[b][1]], value: a * REFS[b][1] }], answer: a * REFS[b][1] };
      return { steps: [{ id: "feet", op: "multiply", competency: CONV, inputs: [a, 30], value: 30 * a }, { id: "inches", op: "multiply", competency: CONV, inputs: [b, 2.5], value: 2.5 * b }], answer: 30 * a + 2.5 * b };
    },
    // independent: change everything into inches first (12 to a foot), then 2.5 cm each; for a known length, add it again and again
    validate: ([kind, a, b], v) => {
      const t = thou(v);
      if (t === null) return false;
      if (kind === 2) {
        let s = 0;
        for (let i = 0; i < a; i++) s += REFS[b][1];
        return t === s * 1000;
      }
      return t === (12 * a + b) * 2500;
    },
    bugs: ([kind, a, b]) =>
      kind === 2
        ? [{ id: "added", kind: "conceptual", competency: CONV, says: `The known length and the number of times were added; ${a} of them end to end is ${a} × ${REFS[b][1]} m.`, predict: a + REFS[b][1] }]
        : [
            { id: "ten-inches", kind: "recall", competency: CONV, says: "A foot was taken as 10 inches; 1 foot = 12 inches.", predict: kind === 1 ? (10 * a + b) * 2.5 : null },
            { id: "inches-as-cm", kind: "conceptual", competency: CONV, says: "The inches were counted as centimetres; an inch is about 2.5 cm.", predict: kind === 1 ? 30 * a + b : null },
            { id: "foot-12cm", kind: "recall", competency: CONV, says: "A foot was taken as 12 cm (the number of inches in it); 1 foot is about 30 cm.", predict: 12 * a + 2.5 * b },
          ],
    distractors: ([kind, a, b]) => (kind === 2 ? [a * REFS[b][1] * 10, (a + 1) * REFS[b][1]] : [30 * a + 2.5 * b + 30, 3 * a]),
    variants: () => [],
    explain: (s) => (s.id === "times" ? `${s.inputs[0]} × ${s.inputs[1]} m = ${s.value} m` : s.id === "feet" ? `${s.inputs[0]} feet ≈ ${s.inputs[0]} × 30 = ${s.value} cm` : `${s.inputs[0]} inches ≈ ${s.inputs[0]} × 2.5 = ${s.value} cm; add the two parts`),
    domain: [[0, 2], [1, 12], [0, 11]],
    difficulty: ([kind, , b]) => (kind === 0 ? 1 : kind === 2 ? 2 : b % 2 ? 3 : 2),
    word: ([kind, a, b]) => (kind === 2 ? `${name(a + b)} wants to estimate a length without a tape. ${REFS[b][0]} is about ${REFS[b][1]} m ${REFS[b][2]}. ${REFS[b][3](a)} Estimate the length in metres.` : `${name(a + b)}'s height is written as ${a} ${a === 1 ? "foot" : "feet"}${kind === 1 ? ` ${b} ${b === 1 ? "inch" : "inches"}` : ""} on an old card. Using 1 foot ≈ 30 cm${kind === 1 ? " and 1 inch ≈ 2.5 cm" : ""}, about how many centimetres is that?`),
    teach: {
      idea: "Feet and inches are older units still used for heights: 12 inches make 1 foot, 1 inch is about 2.5 cm and 1 foot about 30 cm. A known length (a door, a step, a bus) can be used as a ruler to estimate bigger lengths.",
      method: "Change feet to cm (× 30) and inches to cm (× 2.5) and add. To estimate with a known length, count how many of it fit and multiply.",
      alternatives: [
        { id: "body", title: "Use your body", kind: "conceptual", text: ["Your foot is close to a foot long for an adult; a thumb-width is close to an inch.", "Your step is about half a metre: 10 steps make about 5 m."] },
      ],
    },
    limits: "Rounded conversion facts (1 foot ≈ 30 cm, 1 inch ≈ 2.5 cm) and five everyday reference lengths; exact conversion (1 inch = 2.54 cm) is the family aecf.",
  },
  {
    id: "aecf",
    arity: 3,
    title: "Converting units with a conversion factor",
    competency: CONV,
    skill: "MATH.number.unit-rate",
    type: "fraction",
    mc: true,
    decimals: true,
    // [kind, x, r]: 0 18x km/h to m/s; 1 5x m/s to km/h; 2 x inches to cm (2.54); 3 5x miles to km (1.6); 4 $x to rupees at ₹(82 + r)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 4], [1, 40], [0, 6]])) return "A speed, length, distance or amount of money to convert.";
      const [kind, x, r] = p;
      if (kind !== 4 && r !== 0) return "The rate is used only for money.";
      return (kind <= 1 && x > 15) || (kind === 3 && x > 20) || (kind === 4 && x > 20) ? "Numbers that keep the working short." : null;
    },
    prompt: ([kind, x, r]) =>
      [
        `A car travels at ${18 * x} km/h. What is this speed in metres per second? (1 km = 1000 m, 1 hour = 3600 seconds.)`,
        `${x <= 6 ? "A cheetah runs" : "A racing car goes"} at ${5 * x} m/s. What is this speed in kilometres per hour? (1 km = 1000 m, 1 hour = 3600 seconds.)`,
        `1 inch = 2.54 cm. ${inchThing(x)} is ${x} ${x === 1 ? "inch" : "inches"} ${x <= 6 ? "long" : "across"}. How many centimetres is that?`,
        `1 mile is about 1.6 km. A road sign abroad shows ${5 * x} miles. About how many kilometres is that?`,
        `On one day, 1 US dollar is worth ₹${82 + r}. How many rupees is ${10 * x} dollars?`,
      ][kind],
    solve: ([kind, x, r]) => {
      const [inp, factor, out] = [[18 * x, 5 / 18, 5 * x], [5 * x, 18 / 5, 18 * x], [x, 2.54, 2.54 * x], [5 * x, 1.6, 8 * x], [10 * x, 82 + r, 10 * x * (82 + r)]][kind];
      return { steps: [{ id: "factor", op: "multiply", competency: CONV, inputs: [inp, kind <= 1 ? (kind === 0 ? "5/18" : "18/5") : factor], value: out }], answer: out };
    },
    // independent: follow the units one step at a time (km → m and h → s), or add the factor once for each unit
    validate: ([kind, x, r], v) => {
      const t = thou(v);
      if (t === null) return false;
      if (kind === 0) return t === Math.round(((18 * x * 1000) / 3600) * 1000);
      if (kind === 1) return t === Math.round(((5 * x * 3600) / 1000) * 1000);
      const [n, step] = [[x, 2540], [5 * x, 1600], [10 * x, (82 + r) * 1000]][kind - 2];
      let s = 0;
      for (let i = 0; i < n; i++) s += step;
      return t === s;
    },
    bugs: ([kind, x, r]) => {
      const inp = [18 * x, 5 * x, x, 5 * x, 10 * x][kind];
      const f = [5 / 18, 18 / 5, 2.54, 1.6, 82 + r][kind];
      const inv = Math.round((inp / f) * 1000) / 1000;
      return [
        { id: "factor-upside-down", kind: "conceptual", competency: CONV, says: kind <= 1 ? `The factor was used the wrong way up (${kind === 0 ? "18/5 instead of 5/18" : "5/18 instead of 18/5"}); ask whether the new number should be bigger or smaller.` : `The amount was divided by ${f} instead of multiplied; ${kind === 4 ? "each dollar is worth many rupees, so the number of rupees is bigger" : "each unit is more than one of the new unit, so the new number is bigger"}.`, predict: Math.abs(inv * 1000 - Math.round(inv * 1000)) < 1e-9 && Number.isInteger(Math.round(inv * 1000)) && Math.abs(inv - inp / f) < 1e-9 ? inv : null },
        ...(kind <= 1 ? [{ id: "metres-only", kind: "procedural", competency: CONV, says: "Only the kilometres and metres were changed; the hours and seconds must be changed too (1 hour = 3600 s).", predict: kind === 0 ? 18 * x * 1000 : (5 * x) / 1000 } as Bug] : []),
      ];
    },
    distractors: ([kind, x, r]) => {
      const out = [5 * x, 18 * x, 2.54 * x, 8 * x, 10 * x * (82 + r)][kind];
      return [out * 10, out + [5, 18, 2.54, 8, 10 * (82 + r)][kind]];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} × ${s.inputs[1]} = ${String(s.value)}`,
    domain: [[0, 4], [1, 40], [0, 6]],
    difficulty: ([kind]) => (kind >= 2 ? 2 : 3),
    word: ([kind, x, r]) =>
      [
        `A train's speed board shows ${18 * x} km/h. ${name(x)} wants to know how many metres it goes each second. What is the speed in m/s?`,
        `In a science book, a falcon dives at ${5 * x} m/s. ${name(x)} wants the speed in km/h to compare it with a car. What is it?`,
        `${name(x)} buys ${inchThing(x).replace(/^A/, "a")} advertised as ${x} ${x === 1 ? "inch" : "inches"} (1 inch = 2.54 cm). How many centimetres is that?`,
        `On a trip abroad, ${name(x)} reads that the next town is ${5 * x} miles away (1 mile ≈ 1.6 km). About how many km is that?`,
        `${name(x)}'s uncle sends ${10 * x} US dollars home when 1 dollar is worth ₹${82 + r}. How many rupees is that?`,
      ][kind],
    teach: {
      idea: "A conversion factor says how many of one unit make one of the other: 1 inch = 2.54 cm, 1 km/h = 5/18 m/s. Converting is multiplying by the factor, because the amount is proportional.",
      method: "Write the factor as 'new units per old unit' and multiply. Check the direction: going to a smaller unit gives a bigger number.",
      alternatives: [
        { id: "chain", title: "Change one unit at a time", kind: "procedural", text: ["For speeds, change km into m (× 1000), then per hour into per second (÷ 3600).", "72 km/h = 72 000 m per 3600 s = 20 m/s."] },
      ],
    },
    limits: "Speeds (km/h and m/s), inches, miles and dollars with given factors; compound units beyond speed are not here.",
  },
];
const REFS: [string, number, string, (a: number) => string][] = [
  ["A classroom door", 2, "tall", (a) => `A school building is about ${a} doors tall.`],
  ["One floor of a building", 3, "high", (a) => `A building has ${a} floors.`],
  ["A city bus", 10, "long", (a) => `A queue of buses parked end to end is ${a} buses long.`],
  ["A cricket pitch", 20, "long", (a) => `A running track straight is about ${a} pitches long.`],
  ["A railway coach", 25, "long", (a) => `A train has ${a} coaches.`],
];
const wcData = (kind: number, s: number) => {
  const r = rng(s * 13 + kind * 101 + 9000);
  const a = 1 + Math.floor(r() * 8);
  const b = REM1000[Math.floor(r() * REM1000.length)];
  const L = 1000 * a + b;
  const t = s % 3;
  const heard = Number(`${a}${b}`);
  const c = t === 0 ? L : t === 1 && heard !== L ? heard : L + (r() < 0.5 ? -1 : 1) * 10 * (1 + Math.floor(r() * 9));
  return { a, b, c };
};
B05.push(...MEAS_MORE);

const MIX_MORE: Def[] = [
  {
    id: "aediv0",
    arity: 3,
    title: "Dividing a multiple of 10, 100 or 1000 by a one-digit number",
    competency: P10,
    type: "integer",
    mc: true,
    // [d, q, k]: (d × q × 10^k) ÷ d
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d+)[÷/]([2-9])=?\??$/);
      if (!m) return null;
      const n = Number(m[1]);
      const d = Number(m[2]);
      for (let k = 1; k <= 3; k++) {
        const q = n / (d * 10 ** k);
        if (Number.isInteger(q) && q >= 2 && q <= 9) return [d, q, k];
      }
      return null;
    },
    reject: (p) => (!inRange(p, [[2, 9], [2, 9], [1, 3]]) ? "A multiple of 10, 100 or 1000 from a table fact, divided by 2 to 9." : null),
    prompt: ([d, q, k]) => `${d * q * 10 ** k} ÷ ${d} = ?`,
    solve: ([d, q, k]) => ({
      steps: [
        { id: "fact", op: "divide", competency: MT, inputs: [d * q, d], value: q },
        { id: "zeros", op: "multiply", competency: P10, inputs: [q, 10 ** k], value: q * 10 ** k },
      ],
      answer: q * 10 ** k,
    }),
    // independent: take d away again and again from the number and count how many times
    validate: ([d, q, k], v) => {
      let n = d * q * 10 ** k;
      let c = 0;
      while (n > 0) {
        n -= d;
        c++;
      }
      return n === 0 && v === c;
    },
    bugs: ([d, q, k]) => [
      { id: "zero-lost", kind: "procedural", competency: P10, says: `${d * q} ÷ ${d} = ${q} was right, but a zero was lost: ${d * q * 10 ** k} is ${d * q} ${["", "tens", "hundreds", "thousands"][k]}, so the answer is ${q} ${["", "tens", "hundreds", "thousands"][k]}.`, predict: k === 1 ? q : q * 10 ** (k - 1) },
      { id: "extra-zero", kind: "procedural", competency: P10, says: `One zero too many was written; ${d * q * 10 ** k} has ${k} ${k === 1 ? "zero" : "zeros"} after ${d * q}, and the answer keeps exactly those.`, predict: q * 10 ** (k + 1) },
      { id: "fact-slip", kind: "prerequisite", competency: MT, says: `The division fact ${d * q} ÷ ${d} is not yet reliable.`, predict: [(q + 1) * 10 ** k, (q - 1) * 10 ** k].filter((x) => x > 0), probe: `gen:mul:${d},${q}` },
    ],
    variants: () => [],
    explain: (s) => (s.id === "fact" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `So ${s.inputs[0]} ${["", "tens", "hundreds", "thousands"][String(s.inputs[1]).length - 1]}: ${s.value}`),
    domain: [[2, 9], [2, 9], [1, 3]],
    difficulty: ([, , k]) => (k === 1 ? 1 : k === 2 ? 2 : 3),
    word: ([d, q, k]) => `${d * q * 10 ** k} rupees collected for a school trip are shared equally among ${d} classes. How many rupees does each class get?`,
    teach: {
      idea: "2400 is 24 hundreds, so 2400 ÷ 6 is 24 hundreds ÷ 6 = 4 hundreds = 400.",
      method: "Cover the zeros, divide using the table fact, then put the zeros back on the answer.",
      visual: ([d, q]) => ({ type: "array", rows: d, cols: q }),
      alternatives: [
        { id: "check", title: "Check by multiplying", kind: "procedural", text: ["Multiply the answer by the divisor: 400 × 6 = 2400.", "If you get the number you started with, the division is right."] },
      ],
    },
    limits: "Table facts with 10, 100 or 1000; dividing by 10, 100 and 1000 themselves is the family aep10.",
  },
  {
    id: "aetab",
    arity: 2,
    title: "A table of quantities and costs with missing values",
    competency: MULTI,
    type: "integer",
    mc: true,
    // [kind, s]: the table tabData(s), one value missing in each row; kind 0 the total bill, 1 the missing price, 2 the missing number
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 199]])) return "A shopping table with missing values.";
      return repeatOf("aetab", 200, (t) => JSON.stringify(tabData(t)), p[1]) ? "An earlier choice already shows this table (distinct@1)." : null;
    },
    prompt: ([kind, s]) => {
      const rows = tabData(s);
      return `The table in the picture shows a school's order from a stationery shop; some values are missing (?). ${[`What is the total cost of the whole order, in rupees?`, `What is the price of one ${rows[1].item[1]}, in rupees?`, `How many ${rows[2].item[0]} were ordered?`][kind]}`;
    },
    solve: ([kind, s]) => {
      const [r0, r1, r2] = tabData(s);
      if (kind === 0) return { steps: [{ id: "cost0", op: "multiply", competency: MM, inputs: [r0.q, r0.p], value: r0.q * r0.p }, { id: "total", op: "add", competency: ADDSUB, inputs: [r0.q * r0.p, r1.q * r1.p, r2.q * r2.p], value: r0.q * r0.p + r1.q * r1.p + r2.q * r2.p }], answer: r0.q * r0.p + r1.q * r1.p + r2.q * r2.p };
      const r = kind === 1 ? r1 : r2;
      return { steps: [{ id: kind === 1 ? "price" : "number", op: "divide", competency: "MATH.number.long-division", inputs: [r.q * r.p, kind === 1 ? r.q : r.p], value: kind === 1 ? r.p : r.q }], answer: kind === 1 ? r.p : r.q };
    },
    // independent: read the table back (as drawn) and fill each '?' by trying values until the row is consistent
    validate: ([kind, s], v) => {
      if (!isInt(v)) return false;
      const rows = (tabFig(s).rows as (string | number)[][]).map((r) => r.slice(1));
      const fill = (r: (string | number)[]) => {
        for (let x = 1; x <= 2000; x++) {
          const [q, p, c] = r.map((y) => (y === "?" ? x : Number(y)));
          if (q * p === c) return [q, p, c];
        }
        return [NaN, NaN, NaN];
      };
      const full = rows.map(fill);
      return v === [full[0][2] + full[1][2] + full[2][2], full[1][1], full[2][0]][kind];
    },
    bugs: ([kind, s]) => {
      const [r0, r1, r2] = tabData(s);
      if (kind === 0) return [
        { id: "missing-left-out", kind: "procedural", competency: MULTI, says: `The cost of the ${r0.item[0]} (missing in the table) was left out; work it out first: ${r0.q} × ₹${r0.p}.`, predict: r1.q * r1.p + r2.q * r2.p },
        { id: "price-for-cost", kind: "procedural", competency: MULTI, says: `The price of one ${r0.item[1]} was added instead of the cost of all ${r0.q}.`, predict: r0.p + r1.q * r1.p + r2.q * r2.p },
      ];
      const r = kind === 1 ? r1 : r2;
      return [
        { id: "subtract", kind: "conceptual", competency: MULTI, says: `The ${kind === 1 ? "number" : "price"} was taken away from the cost; the cost is number × price, so divide.`, predict: r.q * r.p - (kind === 1 ? r.q : r.p) },
        { id: "other-column", kind: "procedural", competency: MULTI, says: `The wrong column was read: the question asks for the ${kind === 1 ? "price of one" : "number bought"}.`, predict: kind === 1 ? r.q : r.p },
      ];
    },
    distractors: ([kind, s]) => {
      const [r0, r1, r2] = tabData(s);
      const a = [r0.q * r0.p + r1.q * r1.p + r2.q * r2.p, r1.p, r2.q][kind];
      return [a + 10, a * 2, a + 1];
    },
    variants: () => [],
    explain: (s) => (s.id === "cost0" ? `${s.inputs[0]} × ₹${s.inputs[1]} = ₹${s.value}` : s.id === "total" ? `₹${s.inputs[0]} + ₹${s.inputs[1]} + ₹${s.inputs[2]} = ₹${s.value}` : `₹${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [0, 199]],
    difficulty: ([kind]) => (kind === 0 ? 3 : 2),
    figure: ([, s]) => tabFig(s),
    word: ([kind, s]) => {
      const rows = tabData(s);
      return `${name(s)} finds a torn bill from the class's stationery order; the picture shows what can still be read (? marks a torn-off value). ${[`How much did the whole order cost, in rupees?`, `What did one ${rows[1].item[1]} cost, in rupees?`, `How many ${rows[2].item[0]} were bought?`][kind]}`;
    },
    teach: {
      idea: "In each row, cost = how many × price of one. Knowing any two of the three gives the third: multiply for the cost, divide the cost to find the number or the price.",
      method: "Fill each missing value first (multiply or divide in its row), then answer the question, adding the costs for a total.",
      alternatives: [
        { id: "row_by_row", title: "One row at a time", kind: "procedural", text: ["Cover all rows except one and ask: which of number, price and cost is missing?", "Cost missing: multiply. Price or number missing: divide the cost by the other."] },
      ],
    },
    limits: "Three rows with whole-rupee prices; discounts and change are other families.",
  },
  {
    id: "aetrip",
    arity: 4,
    title: "Problems that combine time, distance and money",
    competency: MULTI,
    type: "integer",
    mc: true,
    // [kind, a, b, c]: kind 0 SPEEDS[a] km/h for b hours at ₹(10 + c) a km; kind 1 rowing (a + 2) km/h, b × (a + 2) km each way, ₹(50 + 10c) an hour
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 4], [1, 5], [0, 10]])) return "A journey with a speed, a time and a charge.";
      return p[0] === 1 && p[2] > 3 ? "Up to 3 hours each way." : null;
    },
    prompt: ([kind, a, b, c]) =>
      kind === 0
        ? `A taxi travels at ${SPEEDS[a]} km per hour for ${b} ${b === 1 ? "hour" : "hours"}. The fare is ₹${10 + c} for every kilometre. What is the fare, in rupees?`
        : `A boat can be hired for ₹${50 + 10 * c} an hour. ${name(a + b)} rows at ${a + 2} km per hour to an island ${b * (a + 2)} km away and back again. How much does the boat hire cost, in rupees?`,
    solve: ([kind, a, b, c]) => {
      if (kind === 0) {
        const d = SPEEDS[a] * b;
        return { steps: [{ id: "distance", op: "multiply", competency: MM, inputs: [SPEEDS[a], b], value: d }, { id: "fare", op: "multiply", competency: MM, inputs: [d, 10 + c], value: d * (10 + c) }], answer: d * (10 + c) };
      }
      const t = 2 * b;
      return { steps: [{ id: "time", op: "divide", competency: MULTI, inputs: [2 * b * (a + 2), a + 2], value: t }, { id: "hire", op: "multiply", competency: MM, inputs: [t, 50 + 10 * c], value: t * (50 + 10 * c) }], answer: t * (50 + 10 * c) };
    },
    // independent: go hour by hour (or km by km), adding up distance and money as you go
    validate: ([kind, a, b, c], v) => {
      let money = 0;
      if (kind === 0) {
        for (let h = 0; h < b; h++) for (let km = 0; km < SPEEDS[a]; km++) money += 10 + c;
        return v === money;
      }
      let left = 2 * b * (a + 2);
      while (left > 0) {
        left -= a + 2;
        money += 50 + 10 * c;
      }
      return left === 0 && v === money;
    },
    bugs: ([kind, a, b, c]) =>
      kind === 0
        ? [
            { id: "hours-times-rate", kind: "conceptual", competency: MULTI, says: "The hours were multiplied by the fare per km; first find the distance (speed × time), then multiply by the fare per km.", predict: b * (10 + c) },
            { id: "speed-times-rate", kind: "procedural", competency: MULTI, says: `Only one hour was paid for (${SPEEDS[a]} km); the taxi travels for ${b} hours.`, predict: b > 1 ? SPEEDS[a] * (10 + c) : null },
          ]
        : [
            { id: "one-way", kind: "procedural", competency: MULTI, says: "Only the trip to the island was counted; the boat must come back too.", predict: b * (50 + 10 * c) },
            { id: "km-for-hours", kind: "conceptual", competency: MULTI, says: "The kilometres were paid for as if they were hours; the hire is by the hour, so find the time (distance ÷ speed) first.", predict: 2 * b * (a + 2) * (50 + 10 * c) },
          ],
    distractors: ([kind, a, b, c]) => {
      const ans = kind === 0 ? SPEEDS[a] * b * (10 + c) : 2 * b * (50 + 10 * c);
      return [ans + (kind === 0 ? 10 + c : 50 + 10 * c), ans * 2];
    },
    variants: () => [],
    explain: (s) => (s.id === "distance" ? `Distance = ${s.inputs[0]} km/h × ${s.inputs[1]} h = ${s.value} km` : s.id === "fare" ? `Fare = ${s.inputs[0]} km × ₹${s.inputs[1]} = ₹${s.value}` : s.id === "time" ? `Time = ${s.inputs[0]} km ÷ ${s.inputs[1]} km/h = ${s.value} hours (there and back)` : `Hire = ${s.inputs[0]} hours × ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[0, 1], [0, 4], [1, 5], [0, 10]],
    cap: 400,
    difficulty: ([kind, , b]) => (kind === 1 ? 3 : b <= 2 ? 1 : 2),
    word: ([kind, a, b, c]) => (kind === 0 ? `A school hires a bus for a trip at ₹${10 + c} for every kilometre. The bus travels at ${SPEEDS[a]} km per hour for ${b} ${b === 1 ? "hour" : "hours"}. How much does the school pay, in rupees?` : `At Pichavaram, ${name(a + b)} hires a rowing boat at ₹${50 + 10 * c} an hour, rows ${b * (a + 2)} km to see the mangroves at ${a + 2} km per hour and rows back the same way. How much is the hire?`),
    teach: {
      idea: "Speed links distance and time: distance = speed × time, and time = distance ÷ speed. A charge per km or per hour then turns the distance or the time into money.",
      method: "Decide what the money depends on (km or hours). Find that quantity first from the speed, then multiply by the charge.",
      alternatives: [
        { id: "table", title: "Make a table", kind: "procedural", text: ["Write a row for each hour: the km travelled that hour and the money for those km.", "Add the rows up, or multiply when every row is the same."] },
      ],
    },
    limits: "Whole hours and whole kilometres with whole-rupee charges.",
  },
  {
    id: "aebig",
    arity: 2,
    title: "Multi-step problems with large numbers",
    competency: MULTI,
    skill: LARGE,
    type: "integer",
    mc: true,
    // [kind, s]: 0 a town's population with births and people moving away; 1 money in lakhs spent on n items; 2 a truck's kilometres over weeks
    parse: none,
    reject: (p) => (!inRange(p, [[0, 2], [0, 99]]) ? "Population, money or distance in large numbers." : null),
    prompt: ([kind, s]) => {
      const { a, b, c } = bigData(kind, s);
      return [
        `A town had ${ind(a)} people. In one year ${ind(b)} babies were born and ${ind(c)} people moved away. How many people lived in the town at the end of the year?`,
        `A school has ₹${ind(a)} to spend. It buys ${b} computers at ₹${ind(c)} each. How many rupees are left?`,
        `A truck makes ${b} trips a week between two cities that are ${a} km apart (each trip one way). How many kilometres does it travel in ${c} weeks?`,
      ][kind];
    },
    solve: ([kind, s]) => {
      const { a, b, c } = bigData(kind, s);
      if (kind === 0) return { steps: [{ id: "add", op: "add", competency: ADDSUB, inputs: [a, b], value: a + b }, { id: "sub", op: "subtract", competency: ADDSUB, inputs: [a + b, c], value: a + b - c }], answer: a + b - c };
      if (kind === 1) return { steps: [{ id: "cost", op: "multiply", competency: MM, inputs: [b, c], value: b * c }, { id: "left", op: "subtract", competency: ADDSUB, inputs: [a, b * c], value: a - b * c }], answer: a - b * c };
      return { steps: [{ id: "week", op: "multiply", competency: MM, inputs: [b, a], value: a * b }, { id: "all", op: "multiply", competency: MM, inputs: [a * b, c], value: a * b * c }], answer: a * b * c };
    },
    // independent: the other order (take away first, then add; pay one computer at a time; add week by week)
    validate: ([kind, s], v) => {
      const { a, b, c } = bigData(kind, s);
      if (kind === 0) return v === a - c + b;
      if (kind === 1) {
        let m = a;
        for (let i = 0; i < b; i++) m -= c;
        return v === m;
      }
      let km = 0;
      for (let w = 0; w < c; w++) for (let t = 0; t < b; t++) km += a;
      return v === km;
    },
    bugs: ([kind, s]) => {
      const { a, b, c } = bigData(kind, s);
      return [
        [
          { id: "both-added", kind: "conceptual", competency: MULTI, says: "The people who moved away were added; they leave the town, so take them away.", predict: a + b + c },
          { id: "both-taken", kind: "conceptual", competency: MULTI, says: "The babies born were taken away; they join the town, so add them.", predict: a - b - c },
        ],
        [
          { id: "one-item", kind: "procedural", competency: MULTI, says: `Only one computer was paid for; ${b} computers cost ${b} × ₹${ind(c)}.`, predict: a - c },
          { id: "cost-not-left", kind: "procedural", competency: MULTI, says: "The total cost was given; the question asks how much money is left.", predict: b * c },
        ],
        [
          { id: "one-week", kind: "procedural", competency: MULTI, says: `Only one week was counted; the truck runs for ${c} weeks.`, predict: a * b },
          { id: "added", kind: "conceptual", competency: MULTI, says: "The numbers were added; equal trips every week are counted by multiplying.", predict: a + b + c },
        ],
      ][kind] as Bug[];
    },
    distractors: ([kind, s]) => {
      const { a, b, c } = bigData(kind, s);
      const ans = [a + b - c, a - b * c, a * b * c][kind];
      return [ans + 1000, ans - 1000, ans + 10000];
    },
    variants: () => [],
    explain: (s) => (s.op === "add" ? `${ind(Number(s.inputs[0]))} + ${ind(Number(s.inputs[1]))} = ${ind(Number(s.value))}` : s.op === "subtract" ? `${ind(Number(s.inputs[0]))} − ${ind(Number(s.inputs[1]))} = ${ind(Number(s.value))}` : `${ind(Number(s.inputs[0]))} × ${s.inputs[1]} = ${ind(Number(s.value))}`),
    domain: [[0, 2], [0, 99]],
    difficulty: ([kind]) => (kind === 0 ? 2 : 3),
    word: ([kind, s]) => {
      const { a, b, c } = bigData(kind, s);
      return [
        `The census office of a district town counts ${ind(a)} residents. Over the next year ${ind(b)} children are born and ${ind(c)} people leave for jobs in other cities. What is the new number of residents?`,
        `A village panchayat receives ₹${ind(a)} for its school and spends it on ${b} smart boards at ₹${ind(c)} each. How much money is left?`,
        `A lorry carries vegetables ${b} times a week from Ooty to a market ${a} km away (each trip one way). How far does it travel in ${c} weeks?`,
      ][kind];
    },
    teach: {
      idea: "Large numbers in real life (people, rupees, kilometres) follow the same rules as small ones: decide what joins (add), what leaves (subtract) and what repeats (multiply).",
      method: "Write the steps in order in words first, then calculate each one, keeping the places lined up. Use Indian commas to read the answer.",
      alternatives: [
        { id: "estimate_first", title: "Estimate first", kind: "conceptual", text: ["Round the numbers and get a rough answer before calculating.", "If the exact answer is far from the estimate, check the working."] },
      ],
    },
    limits: "Populations up to 10 lakh, money up to about 70 lakh, and distances up to a few lakh km; crores are in the family aenumf.",
  },
  {
    id: "aematch",
    arity: 1,
    title: "An attribute-matching puzzle",
    competency: MULTI,
    skill: "MATH.reasoning.systematic-enumeration",
    type: "choice",
    // [s]: four friends, four different things, and clues that fix exactly one matching
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 199]])) return "A matching puzzle.";
      const d = matchData(p[0]);
      if (!d) return "The clues must fix one answer.";
      return repeatOf("aematch", 200, (t) => {
        const x = matchData(t);
        return x ? x.clues.map((c) => clueText(x, c)).join(" ") + x.ask : null;
      }, p[0]) ? "An earlier choice already shows this puzzle (distinct@1)." : null;
    },
    prompt: ([s]) => {
      const d = matchData(s)!;
      const intro = d.set.what === "colour of bicycle" ? `${andList(d.people)} each ride a bicycle of a different colour: ${d.set.items.join(", ")}.` : `${andList(d.people)} each ${d.set.verb.replace(/^likes/, "like").replace(/^plays/, "play")} a different ${d.set.what}: ${d.set.items.join(", ")}.`;
      return `${intro} Clues: ${d.clues.map((c) => clueText(d, c)).join(" ")} Who ${d.set.verb} ${d.set.items[d.ask]}?`;
    },
    choices: ([s]) => shuffled(`aematch:${s}`, matchData(s)!.people).choices,
    solve: ([s]) => {
      const d = matchData(s)!;
      const who = d.truth.indexOf(d.ask);
      const q = shuffled(`aematch:${s}`, d.people);
      return { steps: [{ id: "match", op: "deduce", competency: MULTI, inputs: [d.clues.length], value: q.at(who) }], answer: q.at(who) };
    },
    // independent: try all 24 ways of matching people to things and keep those that fit every clue
    validate: ([s], v) => {
      if (!isIdx(v)) return false;
      const d = matchData(s)!;
      const ok = PERMS4.filter((pm) => d.clues.every((c) => (pm[c.who] === c.item) === c.yes));
      if (ok.length !== 1) return false;
      return shuffled(`aematch:${s}`, d.people).choices[v] === d.people[ok[0].indexOf(d.ask)];
    },
    bugs: ([s]) => {
      const d = matchData(s)!;
      const q = shuffled(`aematch:${s}`, d.people);
      const neg = d.clues.find((c) => !c.yes && c.item === d.ask);
      return neg ? [{ id: "not-read-as-yes", kind: "procedural", competency: MULTI, says: `The clue "${clueText(d, neg)}" was read as if it said ${d.people[neg.who]} does; a "not" clue only rules ${d.people[neg.who]} out.`, predict: q.at(neg.who) }] : [];
    },
    variants: () => [],
    explain: () => "Make a grid of people and things, put ✗ for every clue that rules a pair out and ✓ for every clue that fixes one; a row or column with three ✗ has its ✓ in the last place",
    domain: [[0, 199]],
    difficulty: ([s]) => (matchData(s) && matchData(s)!.clues.length <= 4 ? 2 : 3),
    word: ([s]) => {
      const d = matchData(s)!;
      return `At a school fair, four friends talk about themselves. ${d.clues.map((c) => clueText(d, c)).join(" ")} Each of ${andList(d.people)} has a different one of these: ${d.set.items.join(", ")}. Who ${d.set.verb} ${d.set.items[d.ask]}?`;
    },
    teach: {
      idea: "In a matching puzzle every person goes with exactly one thing and every thing with exactly one person. Each clue rules out (or fixes) some pairs; when only one choice is left in a row or column, it must be the answer.",
      method: "Draw a 4 × 4 grid (people down, things across). Mark ✗ for each 'does not' clue and ✓ for each 'does' clue (with ✗ for the rest of that row and column). Keep filling until every row has one ✓.",
      alternatives: [
        { id: "try_all", title: "Try the possibilities", kind: "procedural", text: ["Start with the person who has the most ✗: try each thing still possible for them.", "If a choice breaks a clue later, go back and try the next one."] },
      ],
    },
    limits: "Four people and four things with 'does' and 'does not' clues; map-colouring puzzles are another family.",
  },
  {
    id: "aeirr",
    arity: 2,
    title: "Estimating the area of an irregular shape and comparing two areas",
    competency: AREA,
    type: "fraction",
    mc: true,
    decimals: true,
    // [kind, s]: kind 0 an irregular shape on squared paper (full, more than half, half, less than half squares);
    // kind 1 two shapes A and B made of whole squares — how many more squares the bigger one covers
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 199]])) return "A shape on squared paper.";
      const [kind, s] = p;
      if (kind === 0) {
        const d = irrData(s);
        if (d.full < 3 || d.more + d.half < 3 || d.less < 1) return "Some full and some part squares.";
        return repeatOf("aeirr0", 200, (t) => JSON.stringify(irrData(t).grid), s) ? "An earlier choice already shows this shape (distinct@1)." : null;
      }
      const z = twoShapes(s);
      if (z.a === z.b || z.a < 6 || z.b < 6) return "Two shapes of different sizes.";
      return repeatOf("aeirr1", 200, (t) => JSON.stringify(twoShapes(t).grid), s) ? "An earlier choice already shows these shapes (distinct@1)." : null;
    },
    prompt: ([kind]) =>
      kind === 0
        ? "The picture shows a leaf traced on squared paper. ■ is a square fully covered, ◕ more than half covered, ◑ exactly half covered, ◔ less than half covered, □ not covered. Estimate the area of the leaf in square units: count a full square as 1, a square more than half covered as 1, a half-covered square as ½, and leave out squares less than half covered. (A half can be written as .5, for example 12.5.)"
        : "The picture shows two shapes, A and B, drawn on squared paper (each letter fills one square). Which shape covers more squares, and how many more? Give the number of extra squares.",
    solve: ([kind, s]) => {
      if (kind === 0) {
        const d = irrData(s);
        const v = d.full + d.more + d.half / 2;
        return { steps: [{ id: "full", op: "count", competency: AREA, inputs: [d.full, d.more], value: d.full + d.more }, { id: "halves", op: "count", competency: AREA, inputs: [d.half], value: d.half / 2 }, { id: "total", op: "add", competency: AREA, inputs: [d.full + d.more, d.half / 2], value: v }], answer: v };
      }
      const z = twoShapes(s);
      return { steps: [{ id: "count", op: "count", competency: AREA, inputs: [z.a, z.b], value: Math.abs(z.a - z.b) }], answer: Math.abs(z.a - z.b) };
    },
    // independent: go through the picture square by square and add up what each symbol is worth
    validate: ([kind, s], v) => {
      const t = thou(v);
      if (t === null) return false;
      if (kind === 0) {
        const rows = irrData(s).grid.map((r) => r.map((k) => IRR_SYM[k as keyof typeof IRR_SYM]));
        let half = 0;
        for (const r of rows) for (const c of r) half += c === "■" || c === "◕" ? 2 : c === "◑" ? 1 : 0;
        return t === half * 500;
      }
      let [a, b] = [0, 0];
      for (const r of twoShapes(s).grid) for (const c of r) {
        if (c === "A") a++;
        if (c === "B") b++;
      }
      return t === Math.abs(a - b) * 1000;
    },
    bugs: ([kind, s]) => {
      if (kind === 0) {
        const d = irrData(s);
        return [
          { id: "every-part", kind: "conceptual", competency: AREA, says: "Every square the leaf touches was counted as 1; squares less than half covered are left out, and half-covered squares count as ½.", predict: d.full + d.more + d.half + d.less },
          { id: "full-only", kind: "procedural", competency: AREA, says: "Only the fully covered squares were counted; squares more than half covered count as 1 and half-covered ones as ½.", predict: d.full },
          { id: "half-as-one", kind: "procedural", competency: AREA, says: "Half-covered squares were counted as whole ones; each counts ½.", predict: d.full + d.more + d.half },
        ];
      }
      const z = twoShapes(s);
      return [
        { id: "total", kind: "procedural", competency: AREA, says: "The two areas were added; the question asks how many MORE squares the bigger shape covers (the difference).", predict: z.a + z.b },
        { id: "bigger-only", kind: "procedural", competency: AREA, says: "Only the bigger shape's squares were counted; take away the smaller shape's squares to find how many more.", predict: Math.max(z.a, z.b) },
      ];
    },
    distractors: ([kind, s]) => {
      if (kind === 0) {
        const d = irrData(s);
        const v = d.full + d.more + d.half / 2;
        return [v + 1, v - 1, v + 0.5];
      }
      const z = twoShapes(s);
      return [Math.abs(z.a - z.b) + 1, Math.abs(z.a - z.b) + 2].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "full" ? `Full squares and squares more than half covered: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "halves" ? `${s.inputs[0]} half squares make ${String(s.value)}` : s.id === "total" ? `About ${s.inputs[0]} + ${String(s.inputs[1])} = ${String(s.value)} square units` : `A covers ${s.inputs[0]} squares and B covers ${s.inputs[1]}: the difference is ${s.value}`),
    domain: [[0, 1], [0, 199]],
    difficulty: ([kind, s]) => (kind === 1 ? 1 : irrData(s).half % 2 ? 3 : 2),
    figure: ([kind, s]) => (kind === 0 ? { type: "table", rows: irrData(s).grid.map((r) => r.map((k) => IRR_SYM[k as keyof typeof IRR_SYM])) } : { type: "table", rows: twoShapes(s).grid }),
    word: ([kind, s]) => (kind === 0 ? `${name(s)} traces a banyan leaf on squared paper for a science project; the picture shows the squares (■ full, ◕ more than half, ◑ half, ◔ less than half, □ none). Counting full and more-than-half squares as 1, half squares as ½ and leaving out the rest, about how many square units is the leaf?` : `Two flower beds, A and B, are drawn on a squared plan of the school garden (each letter is one square). How many more squares does the bigger bed cover?`),
    teach: {
      idea: "Area is the number of unit squares a shape covers. For a curved shape the squares on the edge are only partly covered, so we estimate: more than half counts as a whole square, exactly half as ½, less than half as nothing.",
      method: "Count the full squares, then the more-than-half squares, then the half squares (each ½). Add them. To compare two shapes, count each and subtract.",
      alternatives: [
        { id: "pairs", title: "Pair up the bits", kind: "conceptual", text: ["A square that is a bit more than half covered and one a bit less than half covered together make about one whole square.", "That is why more than half counts as 1 and less than half as 0: the extras roughly balance out."] },
      ],
    },
    limits: "Shapes on a 6 × 7 or 5 × 8 grid with the coverage of each square shown; judging the coverage from a drawn curve is done on paper.",
  },
];
B05.push(...MIX_MORE);
/** Read "(0.35, 0.5, …)" into thousandths; null if it is not a list of decimals. */
const readDecs = (v: Value) => {
  if (typeof v !== "string") return null;
  const m = v.replace(/\s/g, "").match(/^\((\d+(?:\.\d+)?(?:,\d+(?:\.\d+)?)*)\)$/);
  if (!m) return null;
  const xs = m[1].split(",").map((x) => thou(x));
  return xs.every((x) => x !== null) ? (xs as number[]) : null;
};
const decTuple = (xs: number[]) => `(${xs.map(d3).join(", ")})`;

const DEC_MORE: Def[] = [
  {
    id: "aedpv",
    arity: 2,
    title: "Place value, expanded form and place-value form of decimals with thousandths",
    competency: DEC,
    type: "choice",
    // [kind, s]: 0 the place value of one digit; 1 the expanded form; 2 the number with given tens … thousandths
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 149]])) return "A decimal with tens, ones, tenths, hundredths and thousandths.";
      if (new Set(dpvQ(p).choices).size !== 4) return "Four different options.";
      return repeatOf(`aedpv${p[0]}`, 150, (t) => `${dpvNum(p[0], t).join("")}${p[0] === 0 ? t % 4 : ""}`, p[1]) ? "An earlier choice already uses this number (distinct@1)." : null;
    },
    prompt: (p) => {
      const q = dpvQ(p);
      if (p[0] === 0) return `What is the place value of the digit ${q.ds[q.pos]} in ${d3(q.th)}?`;
      if (p[0] === 1) return `Which is the expanded form of ${d3(q.th)}?`;
      return `Which number has ${q.ds[0]} tens, ${q.ds[1]} ones, ${q.ds[2]} tenths, ${q.ds[3]} hundredths and ${q.ds[4]} thousandths?`;
    },
    choices: (p) => dpvQ(p).choices,
    solve: (p) => {
      const q = dpvQ(p);
      return { steps: [{ id: ["place", "expand", "build"][p[0]], op: "place", competency: DEC, inputs: [d3(q.th), q.pos], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: read the number's digits from its written form (kind 0), or add up the chosen expanded form or number
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = dpvQ(p);
      const o = q.choices[v];
      if (o === undefined) return false;
      if (p[0] === 0) {
        const txt = d3(q.th).padEnd(6, "0");
        const i = [0, 1, 3, 4, 5][q.pos];
        const d = Number(txt[i]);
        const val = d * [10, 1, 0.1, 0.01, 0.001][q.pos];
        return thou(o) === Math.round(val * 1000);
      }
      if (p[0] === 1) return sumDec(o) === q.th && o.split("+").every((t) => /^0*\.?0*[1-9]0*$/.test(t.trim().replace(/^(\d)0*$/, "$1")) || /^\d0*$/.test(t.trim()) || /^0\.0*[1-9]$/.test(t.trim()));
      return thou(o) === q.th;
    },
    bugs: (p) => {
      const q = dpvQ(p);
      if (p[0] === 0) return [{ id: "next-place", kind: "conceptual", competency: DEC, says: `The digit's place was counted one place off; after the point the places are tenths, hundredths, thousandths, so the ${q.ds[q.pos]} is in the ${PLACES3[q.pos]} place.`, predict: q.at(1) }];
      return [
        { id: "zero-dropped", kind: "conceptual", competency: DEC, says: `The 0 in the ${PLACES3[q.pos]} place was skipped, so the digits after it moved one place to the left; a 0 keeps its place.`, predict: q.at(1) },
        { id: "tens-ones", kind: "recall", competency: PV, says: "The tens and ones digits were swapped; the digit just before the point is the ones.", predict: q.at(2) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "place" ? `In ${s.inputs[0]}, that digit is in the ${PLACES3[Number(s.inputs[1])]} place` : s.id === "expand" ? `Write each digit times its place value, leaving out the zeros: ${s.inputs[0]}` : `Put each digit in its place: ${s.inputs[0]}`),
    domain: [[0, 2], [0, 149]],
    difficulty: ([kind]) => (kind === 0 ? 2 : kind === 1 ? 2 : 3),
    word: (p) => {
      const q = dpvQ(p);
      if (p[0] === 0) return `A jeweller's scale shows ${d3(q.th)} g for a small gold coin. What is the value of the digit ${q.ds[q.pos]} in this reading?`;
      if (p[0] === 1) return `${name(p[1])} writes the long-jump distance ${d3(q.th)} m as a sum of place values. Which sum is right?`;
      return `A science lab measures a liquid as ${q.ds[0]} tens, ${q.ds[1]} ones, ${q.ds[2]} tenths, ${q.ds[3]} hundredths and ${q.ds[4]} thousandths of a millilitre. Which number is the reading?`;
    },
    teach: {
      idea: "Each place is ten times the place to its right: tens, ones, then after the point tenths (1/10), hundredths (1/100), thousandths (1/1000). A digit's place value is the digit times its place.",
      method: "Write the number in a place-value chart (T, O . t, h, th). Read each digit with its place; for the expanded form, add the place values of the non-zero digits.",
      alternatives: [
        { id: "money_mass", title: "Think of kilograms and grams", kind: "conceptual", text: ["1 g is one thousandth of a kilogram, so 2.305 kg is 2 kg, 3 tenths, 0 hundredths and 5 thousandths.", "That is 2 kg 305 g: 2 + 0.3 + 0.005."] },
      ],
    },
    limits: "Numbers with two whole digits and three decimal places; ordering decimals is the family aedord.",
  },
  {
    id: "aedord",
    arity: 1,
    title: "Ordering decimals",
    competency: DEC,
    type: "tuple",
    mc: true,
    // [s]: four decimals w.t, w.(t − 1)u, w.t0u and w.tu in a shuffled order
    parse: none,
    reject: (p) => (!inRange(p, [[0, 299]]) ? "Four decimals to order." : null),
    prompt: ([s]) => `Write these decimals in ascending order (smallest first): ${dordNums(s).map(d3).join("; ")}. Write them in brackets, separated by commas, for example (0.1, 0.25, 0.3, 0.4).`,
    solve: ([s]) => {
      const xs = [...dordNums(s)].sort((a, b) => a - b);
      return { steps: [{ id: "order", op: "compare", competency: DEC, inputs: dordNums(s).map(d3), value: decTuple(xs) }], answer: decTuple(xs) };
    },
    // independent: the answer uses each number once, and each is less than the next when both are written with three places
    validate: ([s], v) => {
      const t = readDecs(v);
      const xs = dordNums(s);
      if (!t || t.length !== 4 || !t.every((x) => xs.includes(x)) || new Set(t).size !== 4) return false;
      const three = (x: number) => d3(x).split(".")[0] + (d3(x).split(".")[1] ?? "").padEnd(3, "0");
      for (let i = 1; i < 4; i++) if (Number(three(t[i])) <= Number(three(t[i - 1]))) return false;
      return true;
    },
    bugs: ([s]) => {
      const xs = dordNums(s);
      const after = (x: number) => Number(d3(x).split(".")[1] ?? "0");
      return [
        { id: "longer-is-larger", kind: "conceptual", competency: DEC, says: "The digits after the point were compared as whole numbers, so more digits looked bigger; compare tenths first, then hundredths, then thousandths (0.5 = 0.500 is more than 0.45).", predict: decTuple([...xs].sort((a, b) => after(a) - after(b))) },
        { id: "descending", kind: "procedural", competency: DEC, says: "The decimals were written from greatest to smallest; ascending means smallest first.", predict: decTuple([...xs].sort((a, b) => b - a)) },
      ];
    },
    distractors: ([s]) => {
      const x = [...dordNums(s)].sort((a, b) => a - b);
      return [decTuple([x[1], x[0], x[2], x[3]]), decTuple([x[0], x[1], x[3], x[2]])];
    },
    variants: () => [],
    explain: (s) => `Give every number three decimal places (${s.inputs.map((x) => { const [w, f = ""] = String(x).split("."); return `${w}.${f.padEnd(3, "0")}`; }).join(", ")}) and compare: ${s.value}`,
    domain: [[0, 299]],
    difficulty: ([s]) => (s % 10 === 0 ? 2 : 3),
    word: ([s]) => {
      const m = dordNums(s).map((x) => `${d3(x)} m`).join(", ");
      const w = s % 10;
      return w === 0 ? `In a science class, four seedlings were measured as ${m} tall. List the heights from shortest to tallest, as numbers in brackets.` : w === 9 ? `Four bamboo poles for a festival pandal were measured as ${m} long. List the lengths from shortest to longest, as numbers in brackets.` : `In a long-jump event, four jumps were measured as ${m}. List the jumps from shortest to longest, as numbers in brackets.`;
    },
    teach: {
      idea: "Decimals are compared place by place from the left: wholes, then tenths, then hundredths, then thousandths. Writing them all with the same number of places (0.5 = 0.500) makes this easy.",
      method: "Fill each number with zeros to three decimal places, then compare them like whole numbers of thousandths: 0.500, 0.450, 0.505, 0.550.",
      alternatives: [
        { id: "number_line", title: "Place them on a number line", kind: "conceptual", text: ["Draw a line from the whole number to the next one, marked in tenths.", "Put each decimal in its tenth, then decide the order inside the tenth by the hundredths and thousandths."] },
      ],
    },
    limits: "Four decimals with the same whole part and up to three places, built so that more digits does not mean bigger.",
  },
  {
    id: "aedfr",
    arity: 2,
    title: "Decimals as fractions and fractions as decimals",
    competency: DEC,
    type: "choice",
    // [kind, s]: 0 a tenths or hundredths decimal as a fraction; 1 a decimal as a fraction in simplest form; 2 a fraction as a decimal
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 58]])) return "A decimal or a fraction to convert.";
      if (p[0] > 0 && p[1] >= FRACS.length) return "One of the fractions.";
      return new Set(dfrQ(p).choices).size !== dfrQ(p).choices.length || dfrQ(p).choices.length < 3 ? "Different options." : null;
    },
    prompt: (p) => {
      const q = dfrQ(p);
      return p[0] === 0 ? `Write ${q.dec} as a fraction.` : p[0] === 1 ? `Write ${q.dec} as a fraction in its simplest form.` : `Write ${FRACS[p[1]][0]}/${FRACS[p[1]][1]} as a decimal.`;
    },
    choices: (p) => dfrQ(p).choices,
    solve: (p) => {
      const q = dfrQ(p);
      return { steps: [{ id: ["tenths", "simplest", "divide"][p[0]], op: "convert", competency: DEC, inputs: [q.dec], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: the value of the chosen option equals the number (and, for simplest form, the top and bottom share no factor)
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = dfrQ(p);
      const o = q.choices[v];
      if (o === undefined) return false;
      const val = q.val;
      const ok = (t: string) => {
        if (p[0] === 2) return Math.abs(Number(t) - val) < 1e-9;
        const x = fracVal(t);
        if (Math.abs(x - val) > 1e-9) return false;
        const [a, b] = t.split("/").map(Number);
        return p[0] === 1 ? gcd2(a, b) === 1 : true;
      };
      return ok(o) && q.choices.filter(ok).length === 1;
    },
    bugs: (p) => {
      const q = dfrQ(p);
      if (p[0] === 0) return [{ id: "place-wrong", kind: "conceptual", competency: DEC, says: `The last digit of ${q.dec} is in the ${q.base[0].endsWith("/10") ? "tenths" : "hundredths"} place, so the bottom number is ${q.base[0].endsWith("/10") ? "10" : "100"}.`, predict: q.at(1) }];
      if (p[0] === 1) return [{ id: "not-simplified", kind: "procedural", competency: "MATH.number.equivalent-fractions", says: `${q.base[1]} is equal to ${q.dec}, but it is not in simplest form: divide the top and bottom by their highest common factor.`, predict: q.at(1) }, { id: "upside-down", kind: "conceptual", competency: DEC, says: "The fraction was turned upside down; the decimal's digits go on top and the place value on the bottom.", predict: q.at(2) }];
      return [{ id: "digits-as-decimal", kind: "conceptual", competency: DEC, says: `${FRACS[p[1]][0]}/${FRACS[p[1]][1]} was written as ${q.base[1]} by putting a point between the top and bottom numbers; a fraction is a division: ${FRACS[p[1]][0]} ÷ ${FRACS[p[1]][1]}.`, predict: q.at(1) }];
    },
    variants: () => [],
    explain: (s) => (s.id === "tenths" ? `Read the decimal with its last place: ${s.inputs[0]}` : s.id === "simplest" ? `Write ${s.inputs[0]} over 10, 100 or 1000 and cancel common factors` : `Divide the top by the bottom (or make the bottom 10, 100 or 1000): ${s.inputs[0]}`),
    domain: [[0, 2], [0, 58]],
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 ? 2 : 3),
    word: (p) => {
      const q = dfrQ(p);
      return p[0] === 0 ? `A shop label says a packet holds ${q.dec} kg of tea. ${name(p[1])} wants to write this as a fraction of a kilogram. Which fraction is it?` : p[0] === 1 ? (q.val > 1 ? `A ribbon is ${q.dec} m long. ${name(p[1])} writes its length in metres as a fraction in simplest form. Which fraction is it?` : `${name(p[1])} drank ${q.dec} of a bottle of water. What fraction of the bottle is that, in simplest form?`) : q.val > 1 ? `${name(p[1])} buys ${FRACS[p[1]][0]}/${FRACS[p[1]][1]} kg of rice. The shop's weighing scale shows kilograms as a decimal. What does the scale show?` : `${FRACS[p[1]][0]}/${FRACS[p[1]][1]} of a school's students come by bus. ${name(p[1])} must enter this in a spreadsheet as a decimal. What should be entered?`;
    },
    teach: {
      idea: "A decimal is a fraction with a bottom number of 10, 100 or 1000: 0.07 = 7/100, 0.75 = 75/100 = 3/4. A fraction is a division, so 3/8 = 3 ÷ 8 = 0.375.",
      method: "Decimal to fraction: write the digits over 10, 100 or 1000 (by the last place) and simplify. Fraction to decimal: make the bottom 10, 100 or 1000 by multiplying, or divide the top by the bottom.",
      alternatives: [
        { id: "money", title: "Use rupees and paise", kind: "conceptual", text: ["₹0.25 is 25 paise, a quarter of a rupee: 0.25 = 1/4.", "Half a rupee is 50 paise: 1/2 = 0.50 = 0.5."] },
      ],
    },
    limits: "Tenths and hundredths (Grade 5) and fractions with bottom numbers 2, 4, 5, 8, 20, 25 and 50 (Grade 7); recurring decimals are Grade 9 families.",
  },
  {
    id: "aeampm",
    arity: 2,
    title: "Writing a 24-hour time with a.m. or p.m.",
    competency: T24,
    type: "choice",
    // [H, k]: the 24-hour time H:(5k)
    parse: none,
    reject: (p) => (!inRange(p, [[0, 23], [0, 11]]) ? "A 24-hour time in five-minute steps." : null),
    prompt: ([H, k]) => `A railway clock shows ${hh(H, 5 * k)} (24-hour time). How is this time written on a 12-hour clock with a.m. or p.m.?${H % 12 === 0 ? " (12 midnight is written 12:00 a.m. and 12 noon is written 12:00 p.m.)" : ""}`,
    choices: (p) => ampmQ(p).choices,
    solve: (p) => {
      const q = ampmQ(p);
      return { steps: [{ id: "ampm", op: "convert", competency: T24, inputs: [p[0]], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: read the chosen time back into minutes after midnight and compare
    validate: ([H, k], v) => {
      if (!isIdx(v)) return false;
      const o = ampmQ([H, k]).choices[v];
      return o !== undefined && readAmPm(o) === H * 60 + 5 * k;
    },
    bugs: (p) => {
      const q = ampmQ(p);
      const [H] = p;
      return [
        { id: "am-pm-swap", kind: "conceptual", competency: T24, says: H === 0 ? "00 hours is midnight, the start of the day: it is 12 a.m., not 12 p.m. (12 p.m. is noon)." : H === 12 ? "12 hours is noon: it is 12 p.m.; 12 a.m. is midnight." : H < 12 ? "Times before 12 noon are a.m.; p.m. is for times after noon." : "Times after 12 noon are p.m.; a.m. is for times between midnight and noon.", predict: q.at(1) },
        ...(H >= 13 ? [{ id: "kept-24", kind: "conceptual", competency: T24, says: `The 24-hour number was kept; a 12-hour clock only goes up to 12, so ${H} hours is ${H - 12} o'clock in the afternoon or evening.`, predict: q.at(2) } as Bug, { id: "minus-ten", kind: "procedural", competency: T24, says: "10 was taken away instead of 12.", predict: q.at(3) } as Bug] : []),
        ...(H === 0 || H === 12 ? [{ id: "zero-hour", kind: "conceptual", competency: T24, says: "A 12-hour clock has no 0; the hour after midnight and the hour after noon are both shown as 12.", predict: q.at(2) } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (Number(s.inputs[0]) < 12 ? "Before noon: a.m." : "After noon: p.m.") + "; the hours after 12 start again at 1",
    domain: [[0, 23], [0, 11]],
    difficulty: ([H]) => (H === 0 || H === 12 ? 3 : H >= 13 ? 2 : 1),
    figure: ([H, k]) => ({ type: "clock", h: H % 12, m: 5 * k }),
    word: ([H, k]) => `${name(H + k)}'s bus ticket says the bus leaves at ${hh(H, 5 * k)}. ${name(H + k)} writes it in a diary using a.m. or p.m. What should ${name(H + k)} write?`,
    teach: {
      idea: "a.m. means before noon (from midnight to 12 noon); p.m. means after noon (from 12 noon to midnight). 12 a.m. is midnight and 12 p.m. is noon.",
      method: "If the 24-hour hour is 0 to 11 it is a.m. (00 becomes 12). If it is 12 to 23 it is p.m.: take away 12 from 13 to 23 (12 stays 12).",
      visual: ([H, k]) => ({ type: "clock", h: H % 12, m: 5 * k }),
      alternatives: [
        { id: "day", title: "Think of your day", kind: "conceptual", text: ["Waking up and the school assembly are in the morning: a.m.", "Lunch after 12, playtime in the evening and dinner are p.m."] },
      ],
    },
    limits: "Times in five-minute steps; 24-hour times as (hours, minutes) are the families aet24 and aet12.",
  },
  {
    id: "aeeuc",
    arity: 3,
    title: "The HCF by repeated division, step by step",
    competency: "MATH.number.euclid-algorithm",
    type: "integer",
    mc: true,
    // [kind, a, b]: Euclid's repeated division on a > b; kind 0 how many divisions; kind 1 the remainder of the second division
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [20, 240], [8, 239]])) return "Two numbers up to 240 for repeated division.";
      const [, a, b] = p;
      if (b >= a || a % b === 0) return "The larger number first, not a multiple of the smaller.";
      return euclid(a, b).length < 3 || euclid(a, b).length > 9 ? "Three to nine divisions." : null;
    },
    keep: ([, a, b]) => (FIBS.includes(a) && FIBS.includes(b) && FIBS.indexOf(a) === FIBS.indexOf(b) + 1) || (a * 7 + b * 3) % 11 === 0,
    prompt: ([kind, a, b]) => {
      const fib = FIBS.includes(a) && FIBS.indexOf(a) === FIBS.indexOf(b) + 1;
      return `Find the HCF of ${a} and ${b} by repeated division: divide ${a} by ${b}, then divide ${b} by the remainder, and keep dividing the last divisor by the last remainder until the remainder is 0.${fib ? ` (${b} and ${a} are next to each other in the Virahanka–Fibonacci sequence.)` : ""} ${kind === 0 ? "How many divisions do you do?" : "What is the remainder in the second division?"}`;
    },
    solve: ([kind, a, b]) => {
      const rs = euclid(a, b);
      return { steps: [{ id: "first", op: "divide", competency: "MATH.number.long-division", inputs: [a, b], value: rs[0] }, { id: "steps", op: "count", competency: "MATH.number.euclid-algorithm", inputs: [a, b], value: rs.length }], answer: kind === 0 ? rs.length : rs[1] };
    },
    // independent: subtract the smaller number from the larger again and again (each run of subtractions is one division)
    validate: ([kind, a, b], v) => {
      let [x, y] = [a, b];
      const rems: number[] = [];
      while (y > 0) {
        while (x >= y) x -= y;
        rems.push(x);
        [x, y] = [y, x];
      }
      return v === (kind === 0 ? rems.length : rems[1]);
    },
    bugs: ([kind, a, b]) => {
      const rs = euclid(a, b);
      return kind === 0
        ? [
            { id: "last-not-counted", kind: "procedural", competency: "MATH.number.euclid-algorithm", says: "The last division, the one that leaves remainder 0, was not counted; it is still a division (and it shows the HCF divides exactly).", predict: rs.length - 1 },
            { id: "hcf-given", kind: "procedural", competency: "MATH.number.euclid-algorithm", says: "The HCF was given; the question asks how many divisions were needed to reach it.", predict: [...rs].reverse().find((r) => r > 0) ?? null },
          ]
        : [
            { id: "first-remainder", kind: "procedural", competency: "MATH.number.euclid-algorithm", says: `The remainder of the first division (${a} ÷ ${b}) was given; the second division is ${b} ÷ ${rs[0]}.`, predict: rs[0] },
            { id: "quotient", kind: "procedural", competency: "MATH.number.long-division", says: `The quotient of ${b} ÷ ${rs[0]} was given instead of its remainder.`, predict: Math.floor(b / rs[0]) },
          ];
    },
    distractors: ([kind, a, b]) => {
      const rs = euclid(a, b);
      return kind === 0 ? [rs.length + 1, rs.length + 2] : [rs[1] + 1, rs[2] ?? rs[1] + 2];
    },
    variants: () => [],
    explain: (s) => (s.id === "first" ? `${s.inputs[0]} ÷ ${s.inputs[1]} leaves remainder ${s.value}` : `Repeated division of ${s.inputs[0]} and ${s.inputs[1]} takes ${s.value} divisions`),
    domain: [[0, 1], [20, 240], [8, 239]],
    cap: 300,
    difficulty: ([kind, a, b]) => (euclid(a, b).length >= 6 ? 3 : kind === 1 ? 2 : 1),
    word: ([kind, a, b]) => `A tailor has two ribbons, ${a} cm and ${b} cm long, and wants the longest pieces that cut both exactly. ${name(a)} finds this length by repeated division (${a} ÷ ${b}, then ${b} ÷ the remainder, and so on, until the remainder is 0). ${kind === 0 ? "How many divisions does it take?" : "What is the remainder in the second division?"}`,
    teach: {
      idea: "Any number that divides both a and b also divides the remainder of a ÷ b. So the HCF does not change when (a, b) is replaced by (b, remainder), and the numbers shrink until the remainder is 0: the last divisor is the HCF.",
      method: "Divide the larger by the smaller; then divide the divisor by the remainder; repeat until the remainder is 0. The last non-zero remainder is the HCF.",
      alternatives: [
        { id: "fibonacci", title: "Why Fibonacci numbers take longest", kind: "conceptual", text: ["For two neighbouring Virahanka–Fibonacci numbers, every division has quotient 1 and the remainders are the earlier Fibonacci numbers: 89, 55, 34, 21, 13, 8, 5, 3, 2, 1.", "So neighbouring Fibonacci numbers need more divisions than any smaller pair, and their HCF is always 1."] },
      ],
    },
    limits: "Pairs up to 240 needing three to nine divisions, including neighbouring Virahanka–Fibonacci numbers; the HCF value itself is the family hcf.",
  },
];
const gcd2 = (a: number, b: number): number => (b ? gcd2(b, a % b) : Math.abs(a));
B05.push(...DEC_MORE);

// ---------------------------------------------------------------- gap@1: addition without regrouping and with large numbers;
// inequations; word problems for linear equations; operations on surds

const ADDR = "MATH.number.addition-regroup";
const SUBR = "MATH.number.subtraction-regroup";
const INEQ = "MATH.algebra.inequalities";
const LINR = "MATH.algebra.linear-rational";
const SURD = "MATH.number.radicals";
const digitsOf = (n: number, len: number) => String(n).padStart(len, "0").split("").map(Number);
/** Column sums without carrying (the slip that forgets to regroup): each column's sum mod 10. */
const noCarry = (a: number, b: number) => {
  const len = Math.max(String(a).length, String(b).length);
  const x = digitsOf(a, len);
  const y = digitsOf(b, len);
  return Number(x.map((d, i) => (d + y[i]) % 10).join(""));
};
/** Each column: the smaller digit taken from the larger (the slip that never regroups in subtraction). */
const smallFromLarge = (a: number, b: number) => {
  const len = String(a).length;
  const x = digitsOf(a, len);
  const y = digitsOf(b, len);
  return Number(x.map((d, i) => Math.abs(d - y[i])).join(""));
};
const carries = (a: number, b: number) => {
  let c = 0;
  let n = 0;
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if ((x % 10) + (y % 10) + c >= 10) {
      n++;
      c = 1;
    } else c = 0;
  }
  return n;
};
const borrows = (a: number, b: number) => {
  let n = 0;
  let br = 0;
  for (let x = a, y = b; x > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if ((x % 10) - br < y % 10) {
      n++;
      br = 1;
    } else br = 0;
  }
  return n;
};
/** The column (0 = ones) of the first regrouping in a − b. */
const firstBorrow = (a: number, b: number) => {
  for (let j = 0, x = a, y = b; x > 0; j++, x = Math.floor(x / 10), y = Math.floor(y / 10)) if (x % 10 < y % 10) return j;
  return 0;
};
const setStr = (xs: number[]) => (xs.length ? xs.map(n_).join(", ") : "none");
const ineqSol = ([dom, a, b, c, op]: number[]) => {
  const lo = dom === 0 ? 0 : dom === 1 ? 1 : -5;
  const hi = dom === 2 ? 5 : 60;
  const out: number[] = [];
  // solve a x + b < c (op 0) or ≤ (op 1): x < (c − b)/a, or x > when a < 0
  const r = (c - b) / a;
  for (let x = lo; x <= hi; x++) {
    const ok = a > 0 ? (op ? x <= r + 1e-9 : x < r - 1e-9) : op ? x >= r - 1e-9 : x > r + 1e-9;
    if (ok) out.push(x);
  }
  return out;
};
const DOMN = ["whole number", "natural number", "integer from −5 to 5"];
const lhs = (a: number, b: number) => `${a === 1 ? "" : a === -1 ? "−" : n_(a)}x${b === 0 ? "" : ` ${b < 0 ? "−" : "+"} ${Math.abs(b)}`}`;
const ivStr = (lo: number, loC: boolean, hi: number, hiC: boolean) => `${loC ? "[" : "("}${n_(lo)}, ${n_(hi)}${hiC ? "]" : ")"}`;
const sysData = ([L, w, a1, a2, s]: number[]) => {
  const U = L + w;
  const b1 = (((L * 3 + a1 * 5) % 9) + 9) % 9 - 4;
  const b2 = (((U * 7 + a2 * 2) % 11) + 11) % 11 - 2;
  const strict1 = s % 2 === 0;
  const strict2 = s < 2;
  return { L, U, a1, a2, b1, b2, strict1, strict2, k1: a1 * L + b1, k2: b2 - a2 * U };
};
const KN = [[2, 1], [3, 1], [3, 2], [4, 1], [4, 3], [5, 1], [5, 2], [5, 3], [5, 4]];
const linData = ([kind, x, m]: number[]) => {
  // returns the story numbers and the equation; x is the answer
  if (kind === 0) return { k: 2 + (m % 4), n: 2 + (m % 7), S: 0 }; // ages: mother k times Anu now; in n years the sum
  if (kind === 1) return { k: 2 + (m % 9), n: 0, S: 0 }; // three consecutive multiples of k, the smallest is x
  if (kind === 2) return { k: 1 + (m % 12), n: 0, S: 0 }; // length k more than width x
  if (kind === 3) return { k: KN[m % 9][0], n: KN[m % 9][1], S: 0 }; // n/k of x added to x
  return { k: 5 * (1 + (m % 6)), n: 5 * (1 + (m % 6)) + 5 * (1 + Math.floor(m / 6) % 4), S: 0 }; // savings p and q per week
};
const surdS = (k: number, m: number) => (m === 1 ? String(k) : `${k === 1 ? "" : k}√${m}`);
const sqf = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
};
const SQFREE = [2, 3, 5, 6, 7, 10, 11];
const surOpQ = ([kind, x, y, mi]: number[]) => {
  const m = SQFREE[mi];
  if (kind <= 1) {
    const [A, B] = [x * x * m, y * y * m];
    const k = kind === 0 ? x + y : x - y;
    const [sk, sm] = sqf(kind === 0 ? A + B : A - B);
    const base = [surdS(k, m), surdS(sk, sm), surdS(kind === 0 ? x * y : x + y, m), surdS(k, m * 2 === 4 ? 3 : m + 1)];
    return { text: `√${A} ${kind === 0 ? "+" : "−"} √${B}`, base, val: k * Math.sqrt(m) };
  }
  if (kind === 2) {
    const [A, B] = [x * m, y * m];
    const [k, r] = sqf(A * B);
    const base = [surdS(k, r), `√${A + B}`, surdS(k * k, r), surdS(x * y, m)];
    return { text: `√${A} × √${B}`, base, val: Math.sqrt(A * B) };
  }
  const B = y * m;
  const A = B * x * x;
  const base = [String(x), surdS(x, m), String(x * x), `√${A - B}`];
  return { text: `√${A} ÷ √${B}`, base, val: x };
};
const ratQ = ([kind, a, b, c, sg]: number[]) => {
  if (kind === 0) {
    // a/√b = a√b / b, simplified
    const g = gcd2(a, b);
    const [top, bot] = [a / g, b / g];
    const right = bot === 1 ? surdS(top, b) : `${surdS(top, b)}/${bot}`;
    const base = [right, surdS(a, b), `${a}/${b}`, bot === 1 ? `${surdS(top, b)}/${b}` : surdS(top * bot === top ? top + 1 : top, b)];
    return { text: `${a}/√${b}`, base, val: a / Math.sqrt(b) };
  }
  // a/(√b + c) (sg 0) or a/(√b − c) (sg 1): multiply by the conjugate; the denominator becomes b − c²
  const d = b - c * c;
  const s = sg ? 1 : -1; // sign of c in the numerator
  const num = (k: number, dd: number) => {
    // a(√b ± c)/dd simplified, written with the sign carried to the numerator
    let [p, q, den] = [k, s * k * c, dd];
    if (den < 0) [p, q, den] = [-p, -q, -den];
    const g = gcd2(gcd2(Math.abs(p), Math.abs(q)), den);
    [p, q, den] = [p / g, q / g, den / g];
    const rt = `${p < 0 ? "−" : ""}${Math.abs(p) === 1 ? "" : Math.abs(p)}√${b}`;
    const t = `${rt} ${q < 0 ? "−" : "+"} ${Math.abs(q)}`;
    return den === 1 ? t : `(${t})/${den}`;
  };
  const right = num(a, d);
  const base = [right, num(a, b + c * c), num(a, b - c), num(a, -d)];
  return { text: `${a}/(√${b} ${sg ? "−" : "+"} ${c})`, base, val: a / (Math.sqrt(b) + (sg ? -c : c)) };
};

/** The two numbers to add in a place-value table, one row each (the total is not shown). */
const pvAdd = (a: number, b: number): Visual => {
  const L = a >= 100 || b >= 100 ? 3 : 2;
  const cells = (n: number) => String(n).padStart(L, " ").split("").map((c) => c.trim());
  return { type: "table", head: ["", ...(L === 3 ? ["Hundreds"] : []), "Tens", "Ones"], rows: [["First number", ...cells(a)], ["Second number", ...cells(b)]] };
};

const CORE_MORE: Def[] = [
  {
    id: "aeaddn",
    arity: 3,
    title: "Adding two-digit numbers without regrouping, and totals up to 200",
    competency: ADDR,
    type: "integer",
    mc: true,
    // [kind, a, b]: kind 0 two two-digit numbers with no regrouping; kind 1 a total from 100 to 200 (a two- or three-digit, b two-digit)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [10, 199], [10, 99]])) return "Two-digit additions, or totals from 100 to 200.";
      const [kind, a, b] = p;
      if (kind === 0) return a > 99 || (a % 10) + (b % 10) >= 10 || a + b > 99 ? "Two two-digit numbers whose ones and tens add without regrouping." : null;
      return a + b < 100 || a + b > 200 ? "A total from 100 to 200." : null;
    },
    keep: ([kind, a, b]) => kind === 0 || (a * 7 + b * 3) % 4 === 0,
    prompt: ([, a, b]) => `${a} + ${b} = ?`,
    solve: ([, a, b]) => {
      const t = Math.floor(a / 10) + Math.floor(b / 10);
      const o = (a % 10) + (b % 10);
      return {
        steps: [
          { id: "tens", op: "add", competency: PV, inputs: [Math.floor(a / 10) * 10, Math.floor(b / 10) * 10], value: t * 10 },
          { id: "ones", op: "add", competency: "MATH.number.addition", inputs: [a % 10, b % 10], value: o },
          { id: "total", op: "add", competency: ADDR, inputs: [t * 10, o], value: a + b },
        ],
        answer: a + b,
      };
    },
    // independent: count on from a in tens, then in ones
    validate: ([, a, b], v) => {
      let s = a;
      for (let i = 0; i < Math.floor(b / 10); i++) s += 10;
      for (let i = 0; i < b % 10; i++) s++;
      return v === s;
    },
    bugs: ([kind, a, b]) => {
      const o = (a % 10) + (b % 10);
      return [
        { id: "tens-ones-mixed", kind: "conceptual", competency: PV, says: `The tens digit of one number was added to the ones digit of the other; line up tens under tens and ones under ones.`, predict: Math.floor(a / 10) + (b % 10) + 10 * ((a % 10) + Math.floor(b / 10)) },
        ...(kind === 1 && o >= 10 ? [{ id: "no-regroup", kind: "prerequisite", competency: PV, says: `The ten made by the ones (${a % 10} + ${b % 10} = ${o}) was not carried to the tens.`, predict: a + b - 10 } as Bug] : []),
        ...(kind === 1 && Math.floor((a % 100) / 10) + Math.floor(b / 10) + (o >= 10 ? 1 : 0) >= 10 ? [{ id: "hundred-lost", kind: "conceptual", competency: PV, says: "The tens added up to 10 or more, but the new hundred was not written; 10 tens make 1 hundred.", predict: a + b - 100 } as Bug] : []),
      ];
    },
    distractors: ([, a, b]) => [a + b + 10, a + b - 10, a + b + 1],
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `Tens: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "ones" ? `Ones: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 1], [10, 199], [10, 99]],
    cap: 450,
    difficulty: ([kind, a, b]) => (kind === 0 ? 1 : (a % 10) + (b % 10) >= 10 ? 3 : 2),
    figure: ([, a, b]) => pvAdd(a, b),
    word: ([, a, b]) => `${name(a)} collects ${a} shells on the beach at Mamallapuram and ${name(b + 1)} collects ${b}. How many shells do they have together?`,
    teach: {
      idea: "Adding tens to tens and ones to ones works because each digit counts a different place. When the ones stay under 10, nothing needs to be regrouped.",
      method: "Split both numbers into tens and ones, add the tens, add the ones, and put them together. On a number line, jump the tens first, then the ones.",
      visual: ([, a, b]) => ({ type: "numberline", from: a, to: a + b, step: Math.max(1, Math.floor(b / 10)) === 0 ? 1 : 10, jumps: [[a, a + 10 * Math.floor(b / 10)], [a + 10 * Math.floor(b / 10), a + b]] }),
      alternatives: [
        { id: "blocks", title: "Use base-ten blocks", kind: "conceptual", text: ["Show each number with tens rods and ones cubes.", "Push the rods together and the cubes together, then count: rods first (by tens), then cubes."], visual: ([, a, b]) => ({ type: "blocks", hundreds: 0, tens: Math.floor((a % 100) / 10) + Math.floor(b / 10), ones: (a % 10) + (b % 10) }) },
      ],
    },
    limits: "Two-digit additions without regrouping (Grade 2) and totals from 100 to 200 (Grade 3); two-digit additions with regrouping are the family addr.",
  },
  {
    id: "aeadd3",
    arity: 2,
    title: "Adding three-digit numbers without regrouping",
    competency: ADDSUB,
    type: "integer",
    mc: true,
    // [a, b]: a three-digit, b two- or three-digit, no column reaching 10
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d{3})\+(\d{2,3})=?\??$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([a, b]) => (a < 100 || a > 899 || b < 10 || b > 899 || carries(a, b) > 0 || a + b > 999 ? "A three-digit number plus a two- or three-digit number with no regrouping." : null),
    prompt: ([a, b]) => `${a} + ${b} = ?`,
    solve: ([a, b]) => {
      const [x, y] = [digitsOf(a, 3), digitsOf(b, 3)];
      return {
        steps: [
          { id: "ones", op: "add", competency: "MATH.number.addition", inputs: [x[2], y[2]], value: x[2] + y[2] },
          { id: "tens", op: "add", competency: PV, inputs: [x[1], y[1]], value: x[1] + y[1] },
          { id: "hundreds", op: "add", competency: ADDSUB, inputs: [x[0], y[0]], value: x[0] + y[0] },
        ],
        answer: a + b,
      };
    },
    // independent: subtract b back from the answer (the inverse) and compare with a
    validate: ([a, b], v) => isInt(v) && v - b === a,
    bugs: ([a, b]) => [
      ...(b < 100 ? [{ id: "misaligned", kind: "conceptual", competency: PV, says: `${b} was written under the hundreds and tens of ${a}; line up the ones digits first: ${b} has no hundreds.`, predict: a + 10 * b } as Bug] : []),
      { id: "one-column", kind: "procedural", competency: ADDSUB, says: "The ones column was copied from the first number without adding; add every column.", predict: a + b - (b % 10) } as Bug,
    ].filter((x) => x.predict !== a + b),
    distractors: ([a, b]) => [a + b + 100, a + b - 10, a + b + 1],
    variants: () => [],
    explain: (s) => `${s.id[0].toUpperCase()}${s.id.slice(1)}: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`,
    domain: [[100, 899], [10, 899]],
    cap: 400,
    difficulty: ([a, b]) => (b < 100 ? 1 : a + b > 900 ? 3 : 2),
    figure: ([a, b]) => pvAdd(a, b),
    word: ([a, b]) => `A school library has ${a} story books and ${b} science books. How many books is that altogether?`,
    teach: {
      idea: "In column addition each column counts one place: ones, tens, hundreds. When no column adds up to 10 or more, each column's sum is simply written below it.",
      method: "Line up the ones digits. Add the ones, then the tens, then the hundreds, writing each sum under its column.",
      alternatives: [
        { id: "expand", title: "Split into places", kind: "procedural", text: ["Write each number as hundreds + tens + ones: 342 = 300 + 40 + 2.", "Add the hundreds, the tens and the ones separately and put them together."] },
      ],
    },
    limits: "Three-digit plus two- or three-digit numbers with no regrouping and totals up to 999; with regrouping is the family adcol3.",
  },
  {
    id: "aecol4",
    arity: 3,
    title: "Adding and subtracting four- and five-digit numbers with regrouping",
    competency: ADDSUB,
    type: "integer",
    mc: true,
    // [op, a, b]: a + b (op 0) or a − b (op 1), four- or five-digit numbers, with at least two regroupings
    parse: (t) => {
      const m = t.replace(/[\s,]/g, "").match(/^(\d{4,5})([+\-−])(\d{3,5})=?\??$/);
      return m ? [m[2] === "+" ? 0 : 1, Number(m[1]), Number(m[3])] : null;
    },
    reject: ([op, a, b]) => {
      if (![0, 1].includes(op) || a < 1000 || a > 99999 || b < 1000 || b > 99999) return "Four- and five-digit numbers.";
      if (op === 0) return a + b > 99999 || carries(a, b) < 2 ? "A sum up to 99,999 that regroups at least twice." : null;
      return b >= a || borrows(a, b) < 2 ? "A difference (larger first) that regroups at least twice." : null;
    },
    prompt: ([op, a, b]) => `${ind(a)} ${op ? "−" : "+"} ${ind(b)} = ?`,
    solve: ([op, a, b]) => ({ steps: [{ id: op ? "subtract" : "add", op: op ? "subtract" : "add", competency: ADDSUB, inputs: [a, b, op ? borrows(a, b) : carries(a, b)], value: op ? a - b : a + b }], answer: op ? a - b : a + b }),
    // independent: the inverse operation (add back for a difference, take away for a sum)
    validate: ([op, a, b], v) => isInt(v) && (op ? v + b === a : v - b === a),
    bugs: ([op, a, b]) =>
      op === 0
        ? [{ id: "no-carry", kind: "prerequisite", competency: PV, says: "The tens made in a column were not carried to the next column; 10 ones make a ten, 10 tens a hundred, and so on.", predict: noCarry(a, b) }]
        : [
            { id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: "In some columns the smaller digit was taken from the larger one; when the top digit is smaller, regroup 1 from the next column first.", predict: smallFromLarge(a, b) },
            { id: "regroup-not-reduced", kind: "procedural", competency: SUBR, says: "A column was regrouped, but the digit it was taken from was not made 1 less.", predict: a - b + 10 ** (firstBorrow(a, b) + 1) },
          ],
    distractors: ([op, a, b]) => {
      const r = op ? a - b : a + b;
      return [r + 1000, r - 100, r + 10];
    },
    variants: () => [],
    explain: (s) => `${ind(Number(s.inputs[0]))} ${s.op === "add" ? "+" : "−"} ${ind(Number(s.inputs[1]))}: column by column from the ones, ${s.op === "add" ? "carrying" : "regrouping"} ${s.inputs[2]} times: ${ind(Number(s.value))}`,
    domain: [[0, 1], [1000, 99999], [1000, 99999]],
    cap: 450,
    difficulty: ([op, a]) => (a < 10000 ? (op ? 2 : 1) : op ? 3 : 2),
    word: ([op, a, b]) => (op === 0 ? `In January ${ind(a)} people visited the Thanjavur Big Temple and in February ${ind(b)}. How many visitors came in the two months together?` : `A cooperative society had ₹${ind(a)} in its account and spent ₹${ind(b)} on seeds. How many rupees are left?`),
    teach: {
      idea: "Large numbers are added and subtracted column by column, exactly as with small ones. Ten in any place makes one of the next place (and one of a place can be broken into ten of the place to its right).",
      method: "Write the numbers with the ones lined up. Start at the ones: carry (when adding) or regroup (when subtracting) as needed, then move one column left at a time.",
      alternatives: [
        { id: "check", title: "Check with the inverse", kind: "procedural", text: ["After adding, subtract one number from the answer: you should get the other.", "After subtracting, add the answer to the smaller number: you should get the larger."] },
      ],
      visual: ([, a, b]) => ({ type: "table", head: ["TTh", "Th", "H", "T", "O"], rows: [String(a).padStart(5, " ").split(""), String(b).padStart(5, " ").split("")] }),
    },
    limits: "Four- and five-digit numbers with at least two regroupings; sums up to 99,999.",
  },
  {
    id: "aeineqz",
    arity: 5,
    title: "Solving an inequation over whole numbers, natural numbers or integers",
    competency: INEQ,
    type: "set",
    // [dom, a, b, c, op]: a x + b < c (op 0) or ≤ c (op 1), x a whole number (dom 0), natural number (1) or integer from −5 to 5 (2)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [-4, 5], [-9, 9], [-15, 30], [0, 1]])) return "ax + b < c or ≤ c over a set of numbers.";
      const [dom, a, b] = p;
      if (a === 0 || b === 0 || (dom < 2 && a < 1)) return "A non-zero coefficient (positive for whole and natural numbers) and constant.";
      const sol = ineqSol(p);
      return sol.length < 1 || sol.length > 8 || (dom === 2 && sol.length === 11) ? "Between one and eight solutions." : null;
    },
    keep: ([dom, a, , c]) => (dom === 2 ? true : (a + c) % 2 === 0),
    prompt: ([dom, a, b, c, op]) => `x is ${dom === 2 ? "an" : "a"} ${DOMN[dom]}. Solve ${lhs(a, b)} ${op ? "≤" : "<"} ${n_(c)} and list every x in the solution set, separated by commas.`,
    solve: (p) => {
      const [, a, b, c] = p;
      const sol = ineqSol(p);
      return { steps: [{ id: "bound", op: "divide", competency: INEQ, inputs: [c - b, a], value: (c - b) / a }, { id: "list", op: "list", competency: INEQ, inputs: [DOMN[p[0]]], value: sol }], answer: sol };
    },
    // independent: test every number of the set in the inequation itself
    validate: (p, v) => {
      if (!Array.isArray(v)) return false;
      const [dom, a, b, c, op] = p;
      const [lo, hi] = dom === 0 ? [0, 80] : dom === 1 ? [1, 80] : [-5, 5];
      const ok: number[] = [];
      for (let x = lo; x <= hi; x++) if (op ? a * x + b <= c : a * x + b < c) ok.push(x);
      const got = [...v].sort((x, y) => x - y);
      return got.length === ok.length && got.every((x, i) => x === ok[i]);
    },
    bugs: (p) => {
      const [dom, a, b, c, op] = p;
      const sol = ineqSol(p);
      const r = (c - b) / a;
      const out: Bug[] = [];
      if (Number.isInteger(r)) out.push(op ? { id: "boundary-left-out", kind: "procedural", competency: INEQ, says: `≤ includes the boundary: x = ${n_(r)} makes both sides equal, so it is in the solution set.`, predict: sol.filter((x) => x !== r) } : { id: "boundary-included", kind: "procedural", competency: INEQ, says: `With < the boundary x = ${n_(r)} is not included: it makes both sides equal, not smaller.`, predict: [...sol, r].filter((x) => x >= (dom === 0 ? 0 : dom === 1 ? 1 : -5) && x <= 5 * 12).sort((x, y) => x - y) });
      if (dom === 0 && sol.includes(0)) out.push({ id: "zero-left-out", kind: "recall", competency: INEQ, says: "0 was left out; the whole numbers start at 0 (the natural numbers start at 1).", predict: sol.filter((x) => x !== 0) });
      if (dom === 1) out.push({ id: "zero-put-in", kind: "recall", competency: INEQ, says: "0 was put in; the natural numbers start at 1.", predict: [0, ...sol] });
      if (a < 0) out.push({ id: "sign-kept", kind: "conceptual", competency: INEQ, says: `Both sides were divided by ${n_(a)}, a negative number, without reversing the sign.`, predict: ineqSol([dom, -a, -b, -c, op]).length ? (() => { const xs: number[] = []; for (let x = -5; x <= 5; x++) if (op ? x <= r : x < r) xs.push(x); return xs; })() : null });
      return out.filter((b) => b.predict === null || (Array.isArray(b.predict) && b.predict.length > 0));
    },
    variants: () => [],
    explain: (s) => (s.id === "bound" ? `Undo the + or − and divide by ${n_(Number(s.inputs[1]))}${Number(s.inputs[1]) < 0 ? " (reversing the sign)" : ""}: the boundary is ${fmtQ(Number(s.value))}` : `The ${s.inputs[0]}s that fit: ${setStr(s.value as number[])}`),
    domain: [[0, 2], [-4, 5], [-9, 9], [-15, 30], [0, 1]],
    cap: 450,
    difficulty: ([dom, a]) => (dom === 2 ? (a < 0 ? 3 : 2) : 1),
    word: ([dom, a, b, c, op]) => `${name(a + c)} thinks of a ${dom === 2 ? "whole number or negative number between −5 and 5" : dom === 0 ? "whole number (0 is allowed)" : "counting number (1, 2, 3, …)"}, multiplies it by ${n_(a)} and then ${b < 0 ? `takes away ${-b}` : `adds ${b}`}. The result is ${op ? "at most" : "less than"} ${n_(c)}. Which numbers could ${name(a + c)} be thinking of? List them all.`,
    teach: {
      idea: "An inequation has many solutions. When x must be a whole number, natural number or integer, the solution set is the list of those numbers on the right side of the boundary.",
      method: "Solve it like an equation to find the boundary (reverse the sign if you divide by a negative number). Then list the allowed numbers on the correct side; include the boundary only for ≤ or ≥. Show them as dots on a number line.",
      visual: ([dom, a, b, c, op]) => ({ type: "numberline", from: dom === 2 ? -5 : 0, to: dom === 2 ? 5 : Math.max(10, Math.ceil((c - b) / Math.abs(a)) + 2), marks: ineqSol([dom, a, b, c, op]) }),
      alternatives: [
        { id: "try_each", title: "Try each number", kind: "procedural", text: ["Put x = 0, 1, 2, … (or −5 to 5) into the inequation one by one.", "Keep each number that makes it true; stop when they stop working."] },
      ],
    },
    limits: "ax + b < c or ≤ c over whole numbers, natural numbers, or integers from −5 to 5, with one to eight solutions.",
  },
  {
    id: "aeineqs",
    arity: 5,
    title: "Solving a system of two linear inequalities",
    competency: INEQ,
    type: "interval",
    mc: true,
    // [L, w, a1, a2, s]: a1 x + b1 > (≥) a1 L + b1 and b2 − a2 x ≥ (>) b2 − a2 (L + w); s sets which are strict
    parse: none,
    reject: (p) => (!inRange(p, [[-8, 6], [1, 10], [1, 5], [1, 5], [0, 3]]) || (p[2] === 1 && p[3] === 1) ? "Two inequalities with whole-number boundaries." : null),
    prompt: (p) => {
      const d = sysData(p);
      return `Solve the system of inequalities ${lhs(d.a1, d.b1)} ${d.strict1 ? ">" : "≥"} ${n_(d.k1)} and ${d.b2 === 0 ? "−" : `${d.b2} − `}${d.a2 === 1 ? "" : d.a2}x ${d.strict2 ? ">" : "≥"} ${n_(d.k2)}, for real x. Write the solution set in interval notation.`;
    },
    solve: (p) => {
      const d = sysData(p);
      const ans = ivStr(d.L, !d.strict1, d.U, !d.strict2);
      return { steps: [{ id: "first", op: "solve", competency: INEQ, inputs: [1, d.L], value: `x ${d.strict1 ? ">" : "≥"} ${n_(d.L)}` }, { id: "second", op: "solve", competency: INEQ, inputs: [2, d.U], value: `x ${d.strict2 ? "<" : "≤"} ${n_(d.U)}` }, { id: "both", op: "intersect", competency: INEQ, inputs: [d.L, d.U], value: ans }], answer: ans };
    },
    // independent: test points across the line in both inequalities, and the ends themselves
    validate: (p, v) => {
      if (typeof v !== "string") return false;
      const d = sysData(p);
      const m = v.replace(/−/g, "-").replace(/\s/g, "").match(/^([[(])(-?\d+),(-?\d+)([\])])$/);
      if (!m) return false;
      const [lo, hi] = [Number(m[2]), Number(m[3])];
      const inside = (x: number) => (m[1] === "[" ? x >= lo : x > lo) && (m[4] === "]" ? x <= hi : x < hi);
      const holds = (x: number) => (d.strict1 ? d.a1 * x + d.b1 > d.k1 : d.a1 * x + d.b1 >= d.k1) && (d.strict2 ? d.b2 - d.a2 * x > d.k2 : d.b2 - d.a2 * x >= d.k2);
      for (let x = d.L - 4; x <= d.U + 4; x += 0.25) if (inside(x) !== holds(x)) return false;
      return true;
    },
    bugs: (p) => {
      const d = sysData(p);
      return [
        { id: "sign-kept", kind: "conceptual", competency: INEQ, says: `In the second inequality both sides were divided by −${d.a2} without reversing the sign, giving x ${d.strict2 ? ">" : "≥"} ${n_(d.U)} instead of x ${d.strict2 ? "<" : "≤"} ${n_(d.U)}.`, predict: `${d.strict2 ? "(" : "["}${n_(d.U)}, ∞)` },
        { id: "union", kind: "conceptual", competency: INEQ, says: "The two solution sets were joined (or) instead of overlapped (and); a system needs x to satisfy both inequalities at once.", predict: "(−∞, ∞)" },
        { id: "ends", kind: "procedural", competency: INEQ, says: "The ends were included or left out wrongly: > and < leave the end out (round bracket); ≥ and ≤ include it (square bracket).", predict: ivStr(d.L, d.strict1, d.U, d.strict2) },
      ];
    },
    distractors: (p) => {
      const d = sysData(p);
      return [ivStr(d.L - 1, !d.strict1, d.U, !d.strict2), ivStr(d.L, !d.strict1, d.U + 1, !d.strict2)];
    },
    variants: () => [],
    explain: (s) => (s.id === "both" ? `Both must hold: ${s.value}` : `Inequality ${s.inputs[0]} gives ${s.value}`),
    domain: [[-8, 6], [1, 10], [1, 5], [1, 5], [0, 3]],
    cap: 450,
    difficulty: ([, , a1, a2, s]) => (s === 0 && a1 * a2 < 6 ? 1 : a2 > 2 ? 3 : 2),
    word: (p) => {
      const d = sysData(p);
      return `A number x satisfies two conditions: ${d.a1} times x${d.b1 === 0 ? "" : d.b1 < 0 ? ` minus ${-d.b1}` : ` plus ${d.b1}`} is ${d.strict1 ? "more than" : "at least"} ${n_(d.k1)}, and ${d.b2 === 0 ? `−${d.a2} times x` : `${d.b2} minus ${d.a2} times x`} is ${d.strict2 ? "more than" : "at least"} ${n_(d.k2)}. Which real numbers x are possible? Write the set in interval notation.`;
    },
    teach: {
      idea: "A system of inequalities in one variable asks for the numbers that satisfy every inequality at the same time: the overlap (intersection) of their solution sets.",
      method: "Solve each inequality on its own (reverse the sign when dividing by a negative number). Draw both on one number line and take the part covered by both; use [ ] for ≤ or ≥ and ( ) for < or >.",
      visual: (p) => {
        const d = sysData(p);
        return { type: "numberline", from: d.L - 3, to: d.U + 3, marks: [d.L, d.U] };
      },
      alternatives: [
        { id: "test_points", title: "Test a point in each part", kind: "procedural", text: ["The two boundaries cut the number line into three parts.", "Try one number from each part in both inequalities: the part where both are true is the answer."] },
      ],
    },
    limits: "Two linear inequalities whose solution sets overlap in a bounded interval with whole-number ends; double inequalities are the family apineq.",
  },
  {
    id: "aeineqw",
    arity: 4,
    title: "Modelling a word problem with a linear inequality",
    competency: INEQ,
    skill: "MATH.reasoning.model-selection",
    type: "interval",
    mc: true,
    // [kind, a, b, c]: 0 marks m1 = a, m2 = b, average of three at least 40 + 5c; 1 a trip: ₹(500 + 100c) for the bus and ₹a per student,
    // at most ₹(500 + 100c + a b), answer 0 <= x <= b; 2 a temperature between 5(a − 5) and 5(b − 5) °C, in °F
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [5, 95], [5, 95], [0, 10]])) return "A marks, budget or temperature problem.";
      const [kind, a, b, c] = p;
      if (kind === 0) {
        const k = 3 * (40 + 5 * c) - a - b;
        return a < 30 || b < 30 || k < 10 || k > 95 ? "Marks out of 100 with a reachable target." : null;
      }
      if (kind === 1) return a % 5 || a < 20 || a > 60 || b < 10 || b > 45 || c > 5 ? "₹20 to ₹60 a student, 10 to 45 students." : null;
      return a >= b || b > 14 || c !== 0 ? "Two temperatures from 0 °C to 45 °C." : null;
    },
    prompt: ([kind, a, b, c]) =>
      [
        `${name(a + b)} scored ${a} and ${b} marks (out of 100) in the first two tests. To get a grade, the average of three tests must be at least ${40 + 5 * c}. Let x be the marks in the third test. Write the possible values of x as an inequality (remember x cannot be more than 100).`,
        `A school trip costs ₹${500 + 100 * c} for the bus plus ₹${a} for each student's entry ticket. The school can spend at most ₹${500 + 100 * c + a * b}. Let x be the number of students. Write the possible values of x as an inequality (remember x cannot be negative).`,
        `A greenhouse must be kept between ${5 * (a - 5)} °C and ${5 * (b - 5)} °C (both included). A thermometer shows °F, where F = 9C/5 + 32. Write the allowed range of F as an inequality.`,
      ][kind],
    solve: ([kind, a, b, c]) => {
      if (kind === 0) {
        const k = 3 * (40 + 5 * c) - a - b;
        return { steps: [{ id: "model", op: "model", competency: INEQ, inputs: [`(${a} + ${b} + x)/3 ≥ ${40 + 5 * c}`], value: k }, { id: "solve", op: "solve", competency: INEQ, inputs: [k], value: `${k} <= x <= 100` }], answer: `${k} <= x <= 100` };
      }
      if (kind === 1) return { steps: [{ id: "model", op: "model", competency: INEQ, inputs: [`${500 + 100 * c} + ${a}x ≤ ${500 + 100 * c + a * b}`], value: b }, { id: "solve", op: "solve", competency: INEQ, inputs: [b], value: `0 <= x <= ${b}` }], answer: `0 <= x <= ${b}` };
      const [f1, f2] = [9 * (a - 5) + 32, 9 * (b - 5) + 32];
      return { steps: [{ id: "model", op: "model", competency: INEQ, inputs: [`${5 * (a - 5)} ≤ C ≤ ${5 * (b - 5)}`], value: f1 }, { id: "solve", op: "solve", competency: INEQ, inputs: [f1], value: `${f1} <= F <= ${f2}` }], answer: `${f1} <= F <= ${f2}` };
    },
    // independent: check numbers on both sides of each end against the story itself
    validate: ([kind, a, b, c], v) => {
      if (typeof v !== "string") return false;
      const t = v.replace(/\s/g, "").replace(/≤/g, "<=").toLowerCase();
      const two = t.match(/^(-?\d+)<=([a-z])<=(-?\d+)$/);
      const ok = (x: number) => (kind === 0 ? (a + b + x) / 3 >= 40 + 5 * c && x <= 100 && x >= 0 : kind === 1 ? 500 + 100 * c + a * x <= 500 + 100 * c + a * b && x >= 0 : (5 * (x - 32)) / 9 >= 5 * (a - 5) && (5 * (x - 32)) / 9 <= 5 * (b - 5));
      const inside = (x: number) => (two ? x >= Number(two[1]) && x <= Number(two[3]) : false);
      if (!two) return false;
      for (let x = kind === 2 ? 0 : 0; x <= (kind === 2 ? 140 : 100); x += 0.5) if (ok(x) !== inside(x)) return false;
      return true;
    },
    bugs: ([kind, a, b, c]) => {
      if (kind === 0) {
        const k = 3 * (40 + 5 * c) - a - b;
        return [
          { id: "average-as-mark", kind: "conceptual", competency: INEQ, says: `The required average (${40 + 5 * c}) was used as the mark needed; the three marks together must be at least 3 × ${40 + 5 * c} = ${3 * (40 + 5 * c)}.`, predict: `${40 + 5 * c} <= x <= 100` },
          { id: "no-cap", kind: "procedural", competency: INEQ, says: "The upper limit was left out; a test is out of 100, so x ≤ 100 as well.", predict: `x >= ${k}` },
        ];
      }
      if (kind === 1) return [{ id: "fixed-ignored", kind: "procedural", competency: INEQ, says: `The bus cost (₹${500 + 100 * c}) was left out of the total; it is paid whatever the number of students.`, predict: (500 + 100 * c + a * b) % a === 0 ? `0 <= x <= ${(500 + 100 * c + a * b) / a}` : null }, { id: "wrong-way", kind: "conceptual", competency: INEQ, says: "'At most' means the cost is less than or equal to the limit, so x ≤ the boundary, not x ≥.", predict: `x >= ${b}` }];
      const [c1, c2] = [5 * (a - 5), 5 * (b - 5)];
      return [{ id: "no-32", kind: "procedural", competency: INEQ, says: "The + 32 in F = 9C/5 + 32 was left out.", predict: `${(9 * c1) / 5} <= F <= ${(9 * c2) / 5}` }, { id: "upside-down", kind: "conceptual", competency: INEQ, says: "The fraction was used upside down (5/9 instead of 9/5).", predict: (5 * c1) % 9 === 0 && (5 * c2) % 9 === 0 ? `${(5 * c1) / 9 + 32} <= F <= ${(5 * c2) / 9 + 32}` : null }];
    },
    distractors: ([kind, a, b, c]) => {
      if (kind === 0) {
        const k = 3 * (40 + 5 * c) - a - b;
        return [`${k + 1} <= x <= 100`, `x <= ${k}`];
      }
      if (kind === 1) return [`0 <= x <= ${b + 1}`, `0 <= x <= ${b - 1}`];
      return [`${9 * (a - 5) + 31} <= F <= ${9 * (b - 5) + 33}`, `${9 * (a - 5) + 32} < F < ${9 * (b - 5) + 32}`];
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Write the condition as an inequality: ${s.inputs[0]}` : `Solve it: ${s.value}`),
    domain: [[0, 2], [5, 95], [5, 95], [0, 10]],
    cap: 450,
    difficulty: ([kind]) => (kind === 1 ? 1 : kind === 0 ? 2 : 3),
    word: ([kind, a, b, c]) =>
      [
        `In the school's three unit tests (each out of 100), ${name(a)} got ${a} and ${b}. The scholarship needs an average of at least ${40 + 5 * c}. What marks x in the last test would be enough? Give the range as an inequality.`,
        `For a visit to the Guindy National Park, the bus costs ₹${500 + 100 * c} and each student's ticket is ₹${a}. The class fund has ₹${500 + 100 * c + a * b}. How many students x can go? Write the possible values of x as an inequality (x cannot be negative).`,
        `Mushrooms grow best between ${5 * (a - 5)} °C and ${5 * (b - 5)} °C (both included). A farmer's thermometer reads in °F (F = 9C/5 + 32). Write the best range of F as an inequality.`,
      ][kind],
    teach: {
      idea: "Words like 'at least', 'at most', 'no more than' and 'between' describe inequalities. Turning them into symbols and solving gives the whole range of answers that work.",
      method: "Name the unknown, write the condition with ≥, ≤, < or >, solve it like an equation (reversing the sign if you divide by a negative), then check that the answer makes sense in the story (marks up to 100, numbers of people not negative).",
      alternatives: [
        { id: "words", title: "A table of key words", kind: "conceptual", text: ["at least → ≥; at most, no more than → ≤; more than → >; less than → <.", "'between A and B, both included' → A ≤ x ≤ B."] },
      ],
    },
    limits: "Marks, budgets and temperatures leading to one linear inequality; interpreting the solution as whole numbers is asked in words only.",
  },
  {
    id: "aenbhd",
    arity: 3,
    title: "Neighbourhoods of a point in interval notation",
    competency: INEQ,
    skill: "MATH.sets-relations.real-intervals",
    type: "interval",
    mc: true,
    // [kind, a, d]: 0 the d-neighbourhood {x : |x − a| < d}; 1 {x : |x − a| ≤ d}; 2 {x : |x − a| > d}
    parse: none,
    reject: (p) => (!inRange(p, [[0, 2], [-10, 10], [1, 9]]) ? "A point from −10 to 10 and a radius from 1 to 9." : null),
    prompt: ([kind, a, d]) => {
      const ax = a === 0 ? "|x|" : `|x ${a < 0 ? "+" : "−"} ${Math.abs(a)}|`;
      return kind === 0 ? `Write the ${d}-neighbourhood of ${n_(a)}, that is the set {x ∈ ℝ : ${ax} < ${d}}, in interval notation.` : `Write the set {x ∈ ℝ : ${ax} ${kind === 1 ? "≤" : ">"} ${d}} in interval notation.`;
    },
    solve: ([kind, a, d]) => {
      const ans = kind === 0 ? `(${n_(a - d)}, ${n_(a + d)})` : kind === 1 ? `[${n_(a - d)}, ${n_(a + d)}]` : `(−∞, ${n_(a - d)}) ∪ (${n_(a + d)}, ∞)`;
      return { steps: [{ id: "ends", op: "evaluate", competency: INEQ, inputs: [a, d], value: `${n_(a - d)} and ${n_(a + d)}` }, { id: "interval", op: "write", competency: "MATH.sets-relations.real-intervals", inputs: [kind], value: ans }], answer: ans };
    },
    // independent: test points: x is in the set exactly when its distance from a is less than (at most, more than) d
    validate: ([kind, a, d], v) => {
      if (typeof v !== "string") return false;
      const t = v.replace(/−/g, "-").replace(/\s/g, "").replace(/∞/g, "inf").toLowerCase();
      const pieces = t.split(/u|∪/).map((s) => s.match(/^([[(])(-?inf|-?\d+),(-?inf|-?\d+)([\])])$/));
      if (pieces.some((m) => !m)) return false;
      const inSet = (x: number) => pieces.some((m) => {
        const lo = m![2] === "-inf" ? -Infinity : Number(m![2]);
        const hi = m![3] === "inf" ? Infinity : Number(m![3]);
        return (m![1] === "[" ? x >= lo : x > lo) && (m![4] === "]" ? x <= hi : x < hi);
      });
      for (let x = a - d - 5; x <= a + d + 5; x += 0.25) {
        const dist = Math.abs(x - a);
        if (inSet(x) !== (kind === 0 ? dist < d : kind === 1 ? dist <= d : dist > d)) return false;
      }
      return true;
    },
    bugs: ([kind, a, d]) => [
      ...(a !== 0 ? [{ id: "sign-of-centre", kind: "conceptual", competency: INEQ, says: `|x ${a < 0 ? "+" : "−"} ${Math.abs(a)}| is the distance from x to ${n_(a)}, not to ${n_(-a)}.`, predict: kind === 0 ? `(${n_(-a - d)}, ${n_(-a + d)})` : kind === 1 ? `[${n_(-a - d)}, ${n_(-a + d)}]` : `(−∞, ${n_(-a - d)}) ∪ (${n_(-a + d)}, ∞)` } as Bug] : []),
      kind === 2
        ? { id: "inside", kind: "conceptual", competency: INEQ, says: `|x − a| > ${d} means x is MORE than ${d} away from ${n_(a)}: outside the interval, on both sides.`, predict: `(${n_(a - d)}, ${n_(a + d)})` }
        : { id: "brackets", kind: "procedural", competency: "MATH.sets-relations.real-intervals", says: kind === 0 ? "A neighbourhood uses < (strictly less), so the ends are left out: round brackets." : "≤ includes the ends: square brackets.", predict: kind === 0 ? `[${n_(a - d)}, ${n_(a + d)}]` : `(${n_(a - d)}, ${n_(a + d)})` },
      ...(kind < 2 ? [{ id: "one-side", kind: "conceptual", competency: INEQ, says: `Only one side of ${n_(a)} was taken; the distance ${d} can be on either side, so the set runs from ${n_(a - d)} to ${n_(a + d)}.`, predict: kind === 0 ? `(${n_(a)}, ${n_(a + d)})` : `[${n_(a)}, ${n_(a + d)}]` } as Bug] : []),
    ],
    distractors: ([kind, a, d]) => [kind === 2 ? `(−∞, ${n_(a - d)}] ∪ [${n_(a + d)}, ∞)` : `(${n_(a - 2 * d)}, ${n_(a + 2 * d)})`, `(${n_(a - d)}, ∞)`],
    variants: () => [],
    explain: (s) => (s.id === "ends" ? `The points at distance ${s.inputs[1]} from ${n_(Number(s.inputs[0]))} are ${s.value}` : `So the set is ${s.value}`),
    domain: [[0, 2], [-10, 10], [1, 9]],
    difficulty: ([kind, a]) => (kind === 2 ? 3 : a < 0 ? 2 : 1),
    word: ([kind, a, d]) => (kind === 2 ? `A cold store sounds an alarm when its temperature x (in °C) is more than ${d} ${d === 1 ? "degree" : "degrees"} away from ${n_(a)} °C. Write the set of temperatures that sound the alarm in interval notation.` : `A cold store keeps its temperature x (in °C) ${kind === 0 ? `less than ${d} ${d === 1 ? "degree" : "degrees"} away from` : `at most ${d} ${d === 1 ? "degree" : "degrees"} away from`} ${n_(a)} °C. Write the set of allowed temperatures in interval notation.`),
    teach: {
      idea: "|x − a| is the distance from x to a on the number line. The δ-neighbourhood of a is every x less than δ away from a: the open interval (a − δ, a + δ).",
      method: "Mark a on the number line and go δ to the left and δ to the right. Less than δ: the open interval between; at most δ: include the ends; more than δ: the two outside pieces.",
      visual: ([, a, d]) => ({ type: "numberline", from: a - d - 2, to: a + d + 2, marks: [a - d, a, a + d] }),
      alternatives: [
        { id: "unfold", title: "Unfold the absolute value", kind: "procedural", text: ["|x − a| < δ means −δ < x − a < δ.", "Add a to all three parts: a − δ < x < a + δ."] },
      ],
    },
    limits: "Whole-number centres and radii; the answer in the variable's own interval (a shifted centre in the word form) is the same mathematics.",
  },
];
const fmtQ = (x: number) => (Number.isInteger(x) ? n_(x) : (() => { for (let d = 2; d <= 12; d++) if (Math.abs(Math.round(x * d) - x * d) < 1e-9) return `${n_(Math.round(x * d))}/${d}`; return String(x); })());
B05.push(...CORE_MORE);
const linStory = ([kind, x, m]: number[]) => {
  const d = linData([kind, x, m]);
  if (kind === 0) return { ...d, S: (d.k + 1) * x + 2 * d.n, ans: x };
  if (kind === 1) return { ...d, S: 3 * d.k * x + 3 * d.k, ans: d.k * x };
  if (kind === 2) return { ...d, S: 4 * x + 2 * d.k, ans: x };
  if (kind === 3) return { ...d, S: (d.k + d.n) * x, ans: d.k * x };
  const B = 100 + 10 * m;
  return { ...d, S: B, ans: x, A: B + (d.n - d.k) * x };
};
const surcQ = ([kind, s]: number[]): { choices: string[]; at: (j: number) => number; base: string[]; p?: number; q?: number; m?: number; n?: number } => {
  const r = rng(s * 19 + 4400);
  if (kind === 0) {
    const n = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 18, 20][s % 13];
    const k = 2 + Math.floor(r() * 8);
    const [pq, qq] = [[1, 4], [4, 9], [9, 16], [1, 9], [4, 25], [9, 4], [16, 9], [25, 36]][Math.floor(s / 13) % 8];
    const base = [`√${n}`, `√${k * k}`, `∛${[8, 27, 64, 125][k % 4]}`, `√(${pq}/${qq})`];
    return { ...shuffled(`aesurc:${kind},${s}`, base), base };
  }
  const p = 2 + Math.floor(r() * 5);
  const q = 2 + Math.floor(r() * 5);
  const m = SQFREE[Math.floor(r() * SQFREE.length)];
  const n = SQFREE[Math.floor(r() * SQFREE.length)];
  const base = [p * p * m > q * q * n ? surdS(p, m) : surdS(q, n), p * p * m > q * q * n ? surdS(q, n) : surdS(p, m), "They are equal"];
  return { ...shuffled(`aesurc:${kind},${s}`, base), base, p, q, m, n };
};

const SURD_MORE: Def[] = [
  {
    id: "aelinw",
    arity: 3,
    title: "Word problems that lead to a linear equation",
    competency: LINR,
    type: "integer",
    mc: true,
    // [kind, x, m]: 0 ages; 1 three consecutive multiples; 2 a rectangle's perimeter; 3 a fraction of a number added to it; 4 equal savings
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 4], [2, 20], [0, 23]])) return "One of five kinds of story, with a whole-number answer.";
      const [kind, x, m] = p;
      if (kind === 0) return x < 5 || x > 15 || m > 13 || (1 + (m % 4)) * x < 18 || (2 + (m % 4)) * x > 60 ? "A child aged 5 to 15, a mother at least 18 years older and at most 60." : null;
      if (kind === 1) return m > 8 || x > 12 ? "Multiples of 2 to 10." : null;
      if (kind === 2) return m > 11 || x < 3 ? "A width of at least 3." : null;
      if (kind === 3) return m > 8 || x > 12 ? "A number up to 60." : null;
      return x > 15 ? "Up to 15 weeks." : null;
    },
    prompt: (p) => {
      const d = linStory(p);
      const [kind] = p;
      return [
        `${name(p[1])}'s mother is ${d.k} times as old as ${name(p[1])}. In ${d.n} years, the sum of their ages will be ${d.S}. How old is ${name(p[1])} now?`,
        `The sum of three consecutive multiples of ${d.k} is ${d.S}. What is the smallest of them?`,
        `The length of a rectangle is ${d.k} cm more than its width, and its perimeter is ${d.S} cm. What is its width, in cm?`,
        `When ${d.n}/${d.k} of a number is added to the number, the result is ${d.S}. What is the number?`,
        `${name(p[1])} has ₹${(d as { A: number }).A} and saves ₹${d.k} every week. ${name(p[1] + 1)} has ₹${d.S} and saves ₹${d.n} every week. After how many weeks will they have the same amount?`,
      ][kind];
    },
    solve: (p) => {
      const d = linStory(p);
      const eq = [`(${d.k} + 1)x + 2 × ${d.n} = ${d.S}`, `x + (x + ${d.k}) + (x + ${2 * d.k}) = ${d.S}`, `2(x + x + ${d.k}) = ${d.S}`, `x + ${d.n}x/${d.k} = ${d.S}`, `${(d as { A: number }).A} + ${d.k}x = ${d.S} + ${d.n}x`][p[0]];
      return { steps: [{ id: "model", op: "model", competency: LINR, inputs: [eq], value: eq }, { id: "solve", op: "solve", competency: "MATH.algebra.linear-equations", inputs: [eq], value: d.ans }], answer: d.ans };
    },
    // independent: try every whole number and keep the one that fits the story
    validate: (p, v) => {
      const d = linStory(p);
      const fits = (t: number) => [
        t + d.n + (d.k * t + d.n) === d.S,
        t % d.k === 0 && t + (t + d.k) + (t + 2 * d.k) === d.S,
        2 * (t + (t + d.k)) === d.S,
        t * d.k + t * d.n === d.S * d.k,
        (d as { A: number }).A + d.k * t === d.S + d.n * t,
      ][p[0]];
      const hits: number[] = [];
      for (let t = 1; t <= 400; t++) if (fits(t)) hits.push(t);
      return hits.length === 1 && hits[0] === v;
    },
    bugs: (p) => {
      const d = linStory(p);
      const [kind] = p;
      const int = (x: number) => (Number.isInteger(x) && x > 0 ? x : null);
      return [
        [
          { id: "years-once", kind: "procedural", competency: LINR, says: `The ${d.n} years were added only once; both people get ${d.n} years older, so add 2 × ${d.n}.`, predict: int((d.S - d.n) / (d.k + 1)) },
          { id: "future-ignored", kind: "procedural", competency: LINR, says: `The ages now were made to add up to ${d.S}; that is their sum in ${d.n} years.`, predict: int(d.S / (d.k + 1)) },
        ],
        [
          { id: "middle", kind: "procedural", competency: LINR, says: `${d.S} ÷ 3 gives the middle multiple; the smallest is ${d.k} less.`, predict: d.ans + d.k },
          { id: "consecutive-numbers", kind: "conceptual", competency: LINR, says: `The numbers were taken as x, x + 1, x + 2; consecutive multiples of ${d.k} go up by ${d.k}.`, predict: int((d.S - 3) / 3) },
        ],
        [
          { id: "half-perimeter", kind: "conceptual", competency: "MATH.measurement.rectangle-perimeter", says: "Length + width was set equal to the perimeter; the perimeter goes round all four sides: 2 × (length + width).", predict: int((d.S - d.k) / 2) },
          { id: "length-given", kind: "procedural", competency: LINR, says: "The length was given; the question asks for the width.", predict: d.ans + d.k },
        ],
        [{ id: "fraction-of-result", kind: "conceptual", competency: LINR, says: `${d.n}/${d.k} of the result was taken away; the fraction is of the unknown number, so the equation is x + ${d.n}x/${d.k} = ${d.S}.`, predict: int((d.S * (d.k - d.n)) / d.k) }],
        [
          { id: "savings-added", kind: "conceptual", competency: LINR, says: "The two weekly savings were added; the gap closes by the DIFFERENCE of what they save each week.", predict: int(((d as { A: number }).A - d.S) / (d.k + d.n)) },
          { id: "gap-only", kind: "procedural", competency: LINR, says: "The difference in money now was given; divide it by how much the gap closes each week.", predict: (d as { A: number }).A - d.S },
        ],
      ][kind] as Bug[];
    },
    distractors: (p) => {
      const a = linStory(p).ans;
      return [a + 1, a + 2, a - 1].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "model" ? `Let x be the unknown; the story gives ${s.value}` : `Solve the equation: x = ${s.value}${String(s.inputs[0]).startsWith("x + (") ? " (the smallest multiple)" : ""}`),
    domain: [[0, 4], [2, 20], [0, 23]],
    cap: 450,
    difficulty: ([kind]) => (kind === 2 ? 1 : kind === 0 || kind === 1 ? 2 : 3),
    word: (p) => {
      const d = linStory(p);
      return [
        `At a family function, ${name(p[1])}'s grandmother says: "Your mother is ${d.k} times as old as you, and in ${d.n} years your two ages will add up to ${d.S}." How old is ${name(p[1])} now?`,
        `${name(p[1])} buys three boxes of sweets; the numbers of sweets in them are three consecutive multiples of ${d.k}, ${d.S} sweets in all. How many sweets are in the smallest box?`,
        `A farmer fences a rectangular plot whose length is ${d.k} m more than its width, using ${d.S} m of fencing for the whole boundary. How wide is the plot, in m?`,
        `A shopkeeper adds ${d.n}/${d.k} of a number of coconuts to his stock of that many coconuts and now has ${d.S}. How many did he have at first?`,
        `${name(p[1])} has ₹${(d as { A: number }).A} in a piggy bank and adds ₹${d.k} each week; ${name(p[1] + 1)} has ₹${d.S} and adds ₹${d.n} each week. After how many weeks will both piggy banks hold the same?`,
      ][p[0]];
    },
    teach: {
      idea: "A word problem becomes an equation when the unknown gets a letter and each sentence is written in symbols. Solving the equation and checking the answer in the story finishes the problem.",
      method: "Let x be what is asked. Write the other quantities with x (mother's age kx, next multiple x + k, length x + k). Write the fact the story gives as an equation, solve it, and check in the words of the story.",
      alternatives: [
        { id: "bar_model", title: "Draw a bar model", kind: "conceptual", text: ["Draw a bar for the unknown and bars for the other quantities in terms of it.", "The total length of the bars is the given total: share out what is left after the known parts."] },
      ],
    },
    limits: "Five everyday stories with whole-number answers; equations with x in a denominator are not here.",
  },
  {
    id: "aesurop",
    arity: 4,
    title: "Adding, subtracting, multiplying and dividing surds",
    competency: SURD,
    type: "choice",
    // [kind, x, y, mi]: 0 √(x²m) + √(y²m); 1 √(x²m) − √(y²m); 2 √(xm) × √(ym); 3 √(x²ym) ÷ √(ym), with m = SQFREE[mi]
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 3], [1, 6], [1, 6], [0, 6]])) return "Two surds to combine.";
      const [kind, x, y] = p;
      if (kind <= 1 && (x === y || (kind === 1 && x < y) || x === 1 && y === 1)) return "Two different like surds (the larger first for a difference).";
      if (kind === 2 && (x === y || x < 2 || y < 2)) return "Two different surds to multiply.";
      if (kind === 3 && (x < 2 || y > 5)) return "A quotient that is not 1.";
      const m = SQFREE[p[3]];
      const ops = kind <= 1 ? [x * x * m, y * y * m] : kind === 2 ? [x * m, y * m] : [x * x * y * m, y * m];
      if (ops.some((n) => Number.isInteger(Math.sqrt(n)))) return "Both numbers under the roots must be surds (not perfect squares).";
      const q = surOpQ(p);
      const vals = q.base.map((o) => numericValue(o));
      if (new Set(q.base).size !== 4 || vals.some((v) => v === null) || vals.filter((v) => Math.abs(v! - q.val) < 1e-9).length !== 1) return "Four options with exactly one right.";
      return null;
    },
    prompt: (p) => `Simplify ${surOpQ(p).text}. Which is right?`,
    choices: (p) => shuffled(`aesurop:${p}`, surOpQ(p).base).choices,
    solve: (p) => {
      const q = shuffled(`aesurop:${p}`, surOpQ(p).base);
      return { steps: [{ id: ["add", "subtract", "multiply", "divide"][p[0]], op: "simplify", competency: SURD, inputs: [surOpQ(p).text], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: evaluate each option numerically and compare with the value of the original expression
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const o = shuffled(`aesurop:${p}`, surOpQ(p).base).choices[v];
      const [kind, x, y, mi] = p;
      const m = SQFREE[mi];
      const target = kind === 0 ? Math.sqrt(x * x * m) + Math.sqrt(y * y * m) : kind === 1 ? Math.sqrt(x * x * m) - Math.sqrt(y * y * m) : kind === 2 ? Math.sqrt(x * m) * Math.sqrt(y * m) : Math.sqrt(x * x * y * m) / Math.sqrt(y * m);
      const val = o === undefined ? null : numericValue(o);
      return val !== null && Math.abs(val - target) < 1e-9;
    },
    bugs: (p) => {
      const q = shuffled(`aesurop:${p}`, surOpQ(p).base);
      const [kind] = p;
      return [
        [{ id: "add-under-root", kind: "conceptual", competency: SURD, says: "The numbers under the roots were added; √a + √b is not √(a + b). Simplify each surd first, then add like surds (like terms).", predict: q.at(1) }, { id: "multiply-coefficients", kind: "procedural", competency: SURD, says: "The numbers in front were multiplied; like surds are added like like terms: 3√2 + 2√2 = 5√2.", predict: q.at(2) }],
        [{ id: "subtract-under-root", kind: "conceptual", competency: SURD, says: "The numbers under the roots were subtracted; √a − √b is not √(a − b). Simplify each surd first, then subtract like surds.", predict: q.at(1) }, { id: "add-coefficients", kind: "procedural", competency: SURD, says: "The numbers in front were added instead of subtracted.", predict: q.at(2) }],
        [{ id: "add-for-multiply", kind: "conceptual", competency: SURD, says: "The numbers under the roots were added; √a × √b = √(ab).", predict: q.at(1) }, { id: "square-not-rooted", kind: "procedural", competency: SURD, says: "A square factor came out of the root without being square-rooted; √(k² × m) = k√m.", predict: q.at(2) }],
        [{ id: "square-not-rooted", kind: "procedural", competency: SURD, says: "The quotient under the root was not square-rooted; √a ÷ √b = √(a ÷ b).", predict: q.at(2) }, { id: "subtract-for-divide", kind: "conceptual", competency: SURD, says: "The numbers under the roots were subtracted; √a ÷ √b = √(a/b).", predict: q.at(3) }],
      ][kind] as Bug[];
    },
    variants: () => [],
    explain: (s) => (s.id === "add" || s.id === "subtract" ? `Simplify each surd in ${s.inputs[0]} and combine the like surds` : s.id === "multiply" ? `√a × √b = √(ab); then take out the largest square factor` : `√a ÷ √b = √(a ÷ b)`),
    domain: [[0, 3], [1, 6], [1, 6], [0, 6]],
    cap: 450,
    difficulty: ([kind]) => (kind <= 1 ? 2 : 3),
    word: (p) => {
      const [kind, x, y, mi] = p;
      const m = SQFREE[mi];
      return [
        `Two square tiles have areas ${x * x * m} cm² and ${y * y * m} cm², so their sides are ${surOpQ(p).text.replace(" + ", " cm and ")} cm. Placed side by side, how long is the row, in simplest surd form? (It is ${surOpQ(p).text}.)`,
        `A square plot of area ${x * x * m} m² has a square bed of area ${y * y * m} m² in one corner. How much longer is the plot's side than the bed's? (It is ${surOpQ(p).text} m.)`,
        `A rectangle's sides are √${x * m} m and √${y * m} m. Which is its area in simplest form? (It is ${surOpQ(p).text} m².)`,
        `A rectangle of area √${x * x * y * m} m² has a width of √${y * m} m. Which is its length in simplest form? (It is ${surOpQ(p).text} m.)`,
      ][kind];
    },
    teach: {
      idea: "Surds behave like letters: 3√2 + 5√2 = 8√2 (like surds), but √2 + √3 cannot be combined. For multiplying and dividing, √a × √b = √(ab) and √a ÷ √b = √(a/b).",
      method: "To add or subtract, first simplify each surd (take out square factors) and then combine like surds. To multiply or divide, combine under one root and simplify.",
      alternatives: [
        { id: "decimals", title: "Check with decimals", kind: "procedural", text: ["√2 ≈ 1.414, √3 ≈ 1.732. Work out both the question and your answer with these decimals.", "If the decimals agree, the surd answer is right."] },
      ],
    },
    limits: "Two surds with small whole numbers; expressions with three or more surds and binomial products are other families.",
  },
  {
    id: "aesurc",
    arity: 2,
    title: "Recognising surds and comparing their sizes",
    competency: SURD,
    type: "choice",
    // [kind, s]: 0 which of four roots is a surd; 1 which of p√m and q√n is greater
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 103]])) return "Roots to recognise or compare.";
      const q = surcQ(p);
      if (new Set(q.base).size !== q.base.length) return "Different options.";
      if (p[0] === 1 && q.p! * q.p! * q.m! === q.q! * q.q! * q.n!) return "Two surds of different size.";
      if (p[0] === 1 && (q.m === q.n || q.p === q.q)) return "Neither the coefficients nor the numbers under the root alone decide.";
      return repeatOf(`aesurc${p[0]}`, 104, (t) => [...surcQ([p[0], t]).base].sort().join("|"), p[1]) ? "An earlier choice already shows these (distinct@1)." : null;
    },
    prompt: ([kind]) => (kind === 0 ? "Which of these is a surd (a root that is an irrational number)?" : "Which is greater?"),
    choices: (p) => surcQ(p).choices,
    solve: (p) => {
      const q = surcQ(p);
      return { steps: [{ id: kind0(p) ? "irrational" : "square-both", op: "compare", competency: SURD, inputs: q.base.slice(0, 2), value: q.at(0) }], answer: q.at(0) };
    },
    // independent: kind 0 — evaluate each option and test whether it is a fraction with a small bottom number;
    // kind 1 — compare the decimal values
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const q = surcQ(p);
      const o = q.choices[v];
      if (o === undefined) return false;
      const valOf = (t: string) => (t.startsWith("∛") ? Math.cbrt(Number(t.slice(1))) : numericValue(t.replace(/√\((\d+)\/(\d+)\)/, "sqrt($1/$2)")));
      if (p[0] === 0) {
        const rational = (x: number) => {
          for (let d = 1; d <= 60; d++) if (Math.abs(Math.round(x * d) - x * d) < 1e-9) return true;
          return false;
        };
        const irr = q.choices.filter((t) => !rational(valOf(t)!));
        return irr.length === 1 && irr[0] === o;
      }
      const [a, b] = [valOf(q.base[0])!, valOf(q.base[1])!];
      return o === (Math.abs(a - b) < 1e-12 ? "They are equal" : a > b ? q.base[0] : q.base[1]);
    },
    bugs: (p) => {
      const q = surcQ(p);
      if (p[0] === 0) return [
        { id: "any-root", kind: "conceptual", competency: SURD, says: `${q.base[1]} has a root sign, but it is a whole number (${Math.round(Math.sqrt(Number(q.base[1].slice(1))))}); a surd is a root that cannot be written exactly as a fraction.`, predict: q.at(1) },
        { id: "fraction-root", kind: "conceptual", competency: SURD, says: `${q.base[3]} is a fraction under a root, but both its top and bottom are perfect squares, so it is a rational number.`, predict: q.at(3) },
      ];
      const big = q.base[0];
      const coefBig = q.p! > q.q! ? surdS(q.p!, q.m!) : surdS(q.q!, q.n!);
      const rootBig = q.m! > q.n! ? surdS(q.p!, q.m!) : surdS(q.q!, q.n!);
      return [
        { id: "coefficient-only", kind: "conceptual", competency: SURD, says: "Only the numbers in front were compared; the number under the root matters too. Square both: (p√m)² = p²m.", predict: coefBig !== big ? q.at(q.base.indexOf(coefBig)) : null },
        { id: "root-only", kind: "conceptual", competency: SURD, says: "Only the numbers under the roots were compared; the numbers in front matter too. Square both and compare p²m with q²n.", predict: rootBig !== big ? q.at(q.base.indexOf(rootBig)) : null },
      ].filter((b) => b.predict !== null) as Bug[];
    },
    variants: () => [],
    explain: (s) => (s.id === "irrational" ? "A surd is a root that is irrational: the number under √ is not a perfect square (and the cube root is not of a perfect cube)" : "Square both: (p√m)² = p² × m; the bigger square belongs to the bigger surd"),
    domain: [[0, 1], [0, 103]],
    difficulty: ([kind]) => (kind === 0 ? 1 : 2),
    word: ([kind, s]) => {
      if (kind === 0) return `${name(s)} measures the sides of four squares whose areas are given, and writes each side as a root. Which side length is a surd (an irrational number)?`;
      return `Two square gardens have sides ${surcQ([kind, s]).base[0]} m and ${surcQ([kind, s]).base[1]} m. Which garden has the longer side?`;
    },
    teach: {
      idea: "A surd is a root of a rational number that is itself irrational, like √2 or √12. √9 = 3 and ∛8 = 2 are not surds. To compare p√m with q√n, compare their squares p²m and q²n.",
      method: "For 'is it a surd?', check whether the number under the root is a perfect square (or cube). For 'which is greater?', put the outside number inside: 3√2 = √18 and 2√5 = √20, so 2√5 is greater.",
      alternatives: [
        { id: "inside", title: "Move everything under the root", kind: "procedural", text: ["p√m = √(p² × m): 4√3 = √48.", "Then the surd with the bigger number under the root is bigger."] },
      ],
    },
    limits: "Square roots and cube roots of small whole numbers and fractions; ordering more than two surds is not here.",
  },
  {
    id: "aerat",
    arity: 5,
    title: "Rationalising the denominator",
    competency: SURD,
    type: "choice",
    // [kind, a, b, c, sg]: 0 a/√b; 1 a/(√b + c) (sg 0) or a/(√b − c) (sg 1)
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [1, 12], [2, 15], [0, 4], [0, 1]])) return "a/√b or a/(√b ± c).";
      const [kind, , b, c, sg] = p;
      if (sqf(b)[0] !== 1) return "b without a square factor.";
      if (kind === 0 ? c !== 0 || sg !== 0 : c < 1 || c * c === b) return "c only for a binomial denominator, and b ≠ c².";
      const q = ratQ(p);
      const vals = q.base.map((o) => numericValue(o));
      return new Set(q.base).size !== 4 || vals.some((v) => v === null) || vals.filter((v) => Math.abs(v! - q.val) < 1e-9).length !== 1 ? "Four different options, exactly one equal to the expression." : null;
    },
    prompt: (p) => `Rationalise the denominator of ${ratQ(p).text} and simplify. Which is right?`,
    choices: (p) => shuffled(`aerat:${p}`, ratQ(p).base).choices,
    solve: (p) => {
      const q = shuffled(`aerat:${p}`, ratQ(p).base);
      return { steps: [{ id: p[0] ? "conjugate" : "root", op: "multiply", competency: SURD, inputs: [ratQ(p).text], value: q.at(0) }], answer: q.at(0) };
    },
    // independent: evaluate the option and the original expression as decimals, and check the option's denominator has no root
    validate: (p, v) => {
      if (!isIdx(v)) return false;
      const o = shuffled(`aerat:${p}`, ratQ(p).base).choices[v];
      if (o === undefined) return false;
      const [kind, a, b, c, sg] = p;
      const orig = kind === 0 ? a / Math.sqrt(b) : a / (Math.sqrt(b) + (sg ? -c : c));
      const val = numericValue(o);
      const den = o.includes(")/") ? o.split(")/")[1] : o.includes("/") ? o.split("/").pop()! : "1";
      return val !== null && Math.abs(val - orig) < 1e-9 && !den.includes("√");
    },
    bugs: (p) => {
      const q = shuffled(`aerat:${p}`, ratQ(p).base);
      return p[0] === 0
        ? [{ id: "top-only", kind: "procedural", competency: SURD, says: `Only the top was multiplied by √${p[2]}; multiply the top and the bottom by √${p[2]}, so the bottom becomes ${p[2]}.`, predict: q.at(1) }, { id: "root-dropped", kind: "conceptual", competency: SURD, says: "The root sign was simply removed from the bottom; that changes the value. Multiply top and bottom by the root instead.", predict: q.at(2) }]
        : [
            { id: "plus-c-squared", kind: "conceptual", competency: SURD, says: `(√${p[2]} + ${p[3]})(√${p[2]} − ${p[3]}) = ${p[2]} − ${p[3] * p[3]}; the product of a sum and a difference is a difference of squares, not ${p[2]} + ${p[3] * p[3]}.`, predict: q.at(1) },
            { id: "c-not-squared", kind: "procedural", competency: SURD, says: `${p[3]} was not squared in the denominator: it should be ${p[2]} − ${p[3]}² = ${p[2] - p[3] * p[3]}.`, predict: q.at(2) },
            { id: "sign-of-denominator", kind: "procedural", competency: SURD, says: `The denominator was worked out as ${p[3] * p[3]} − ${p[2]} instead of ${p[2]} − ${p[3] * p[3]}, which changes the sign of the answer.`, predict: q.at(3) },
          ];
    },
    variants: () => [],
    explain: (s) => (s.id === "root" ? `Multiply top and bottom of ${s.inputs[0]} by the root in the bottom` : `Multiply top and bottom of ${s.inputs[0]} by the conjugate (change the sign between the terms); the bottom becomes a difference of squares`),
    domain: [[0, 1], [1, 12], [2, 15], [0, 4], [0, 1]],
    cap: 400,
    difficulty: ([kind, a, b]) => (kind === 1 ? 3 : a % b === 0 ? 1 : 2),
    word: (p) => (ratQ(p).val > 0 ? `${name(p[1])} works out the time a pendulum takes and gets ${ratQ(p).text} seconds. The teacher asks for the answer with a rational denominator, in simplest form. Which is right?` : `${name(p[1])} solves an equation in a practice book and gets x = ${ratQ(p).text}. The answer key writes it with a rational denominator, in simplest form. Which is the answer key's form?`),
    teach: {
      idea: "Multiplying the top and bottom of a fraction by the same number does not change its value. Choosing √b (or the conjugate √b ∓ c) makes the bottom a whole number, because √b × √b = b and (√b + c)(√b − c) = b − c².",
      method: "For a/√b, multiply by √b/√b. For a/(√b ± c), multiply by (√b ∓ c)/(√b ∓ c). Then simplify, cancelling any common factor.",
      alternatives: [
        { id: "decimals", title: "Check with decimals", kind: "procedural", text: ["Work out the original fraction with a calculator-style estimate (√2 ≈ 1.414).", "Your answer must give the same decimal."] },
      ],
    },
    limits: "Denominators √b or √b ± c with b from 2 to 15 (no square factor) and c from 1 to 4.",
  },
];
const kind0 = (p: number[]) => p[0] === 0;
B05.push(...SURD_MORE);
