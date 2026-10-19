/**
 * Batch b05 (families@2): Grades 4–5 number, measurement, geometry and reasoning — pattern rules, angles, circles,
 * lines of symmetry, reflections and translations, 24-hour time, area in squares, mixed units, metric conversions,
 * tenths and hundredths, even and odd, large numbers in the Indian system, × and ÷ by 10, 100, 1000, rounding,
 * and multi-step money and capacity problems. Written by OpenPath; CC0.
 */
import type { Bug, Def, Value } from "../family-kit";

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
const say = (kind: number, b: number, s: number) => `${b} ${UNITS[kind].big} ${s} ${UNITS[kind].small}`;

// ---------------------------------------------------------------- conversions (aeconv)

const CONVK = [
  { big: "m", small: "cm", f: 100 },
  { big: "kg", small: "g", f: 1000 },
  { big: "L", small: "mL", f: 1000 },
  { big: "km", small: "m", f: 1000 },
];
const convSmall = (k: number, s: number) => (k === 0 ? s : 5 * s);

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
    explain: (s) => (s.id === "jumps" ? `From the 1st number to the ${ord(Number(s.inputs[0]))} there are ${s.value} jumps` : s.id === "total" ? `${s.inputs[0]} jumps of ${s.inputs[1]} make ${s.value}` : `Start at ${s.inputs[0]} and add ${s.inputs[1]}: ${s.value}`),
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
      return `${name(p[1] + p[2])} opens a pair of scissors four times and measures the angle each time: ${xs[0]}°, ${xs[1]}°, ${xs[2]}° and ${xs[3]}°. Which of these is ${p[0] % 2 === 0 ? "an" : "a"} ${KINDS[p[0]]} angle? Write its size in degrees.`;
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
    word: ([dir, x]) => (dir === 0 ? `${name(x)} draws a round rangoli. The string from the centre to the edge is ${x} cm long. How wide is the rangoli straight across through the centre, in cm?` : `A round chapati is ${x} cm across, measured straight through its centre. How far is it from the centre to the edge, in cm?`),
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
      if (!inRange(p, [[0, 1], [-3, 3], [-6, 6], [-6, 6]])) return "A point with coordinates −6 to 6 and a mirror line x = m or y = m, m from −3 to 3.";
      const [axis, m, x, y] = p;
      const c = axis ? y : x;
      return c === m || Math.abs(2 * m - c) > 6 ? "The point must be off the line, and its image on the grid." : null;
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
      { id: "axis-not-line", kind: "conceptual", competency: TRANS, says: `The point was reflected in the ${axis ? "x" : "y"}-axis (the sign was just changed) instead of in the line ${axis ? "y" : "x"} = ${n_(m)}.`, predict: m === 0 ? null : axis ? tup(x, -y) : tup(-x, y) },
      { id: "wrong-coordinate", kind: "conceptual", competency: CART, says: `The wrong coordinate was changed: a mirror line ${axis ? "y = " + n_(m) + " goes across, so the point moves up or down and only y changes" : "x = " + n_(m) + " goes up and down, so the point moves left or right and only x changes"}.`, predict: axis ? (x !== 2 * m - x ? tup(2 * m - x, y) : null) : y !== 2 * m - y ? tup(x, 2 * m - y) : null },
      { id: "onto-line", kind: "procedural", competency: TRANS, says: "The point was moved only as far as the mirror line; the image is as far beyond the line as P is in front of it.", predict: axis ? tup(x, m) : tup(m, y) },
    ],
    distractors: ([axis, m, x, y]) => [tup(x, y), axis ? tup(x, 2 * m - y + (y > m ? -1 : 1)) : tup(2 * m - x + (x > m ? -1 : 1), y), axis ? tup(-x, -y) : tup(-x, -y)],
    variants: () => [],
    explain: (s) => (s.id === "distance" ? `P is ${Math.abs(Number(s.value))} ${Math.abs(Number(s.value)) === 1 ? "unit" : "units"} from the mirror line` : `Go the same distance to the other side of the line: the image is ${s.value}`),
    domain: [[0, 1], [-3, 3], [-6, 6], [-6, 6]],
    cap: 400,
    difficulty: ([axis, m, x, y]) => {
      const c = axis ? y : x;
      return m === 0 ? 1 : Math.sign(c) !== Math.sign(2 * m - c) ? 3 : 2;
    },
    figure: ([axis, m, x, y]) => ({ type: "plane", points: [[x, y, "P"]], segments: [axis ? [[-7, m], [7, m]] : [[m, -7], [m, 7]]], range: 7 }),
    word: ([axis, m, x, y]) => `On a squared map, a straight canal runs along the line ${axis ? "y" : "x"} = ${n_(m)}. A temple stands at ${tup(x, y)}. Its reflection in the still water appears exactly opposite, the same distance from the canal on the other side. At which point is the reflection? Write it as (x, y).`,
    teach: {
      idea: "A mirror image is as far behind the mirror line as the object is in front of it, straight across, at right angles to the line.",
      method: "Count how far P is from the mirror line, then count the same distance on the other side. Only the coordinate that crosses the line changes.",
      visual: ([axis, m, x, y]) => ({ type: "plane", points: [[x, y, "P"], axis ? [x, 2 * m - y, "P′"] : [2 * m - x, y, "P′"]], segments: [axis ? [[-7, m], [7, m]] : [[m, -7], [m, 7]]], range: 7 }),
      alternatives: [
        { id: "fold_grid", title: "Fold the grid paper", kind: "conceptual", text: ["Draw the point on squared paper and fold the paper along the mirror line.", "Press hard on the point: the mark it makes on the other side is the image."] },
      ],
    },
    limits: "Single points reflected in lines x = m or y = m on a grid; reflecting whole figures, slanted mirror lines and drawing are not here (drawing is marked by an educator).",
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
      if (!inRange(p, [[-5, 5], [-5, 5], [-4, 4], [-4, 4]])) return "A point with coordinates −5 to 5 moved up to 4 units each way.";
      const [x, y, a, b] = p;
      return a === 0 || b === 0 || Math.abs(x + a) > 6 || Math.abs(y + b) > 6 ? "Moves both across and up or down, staying on the grid." : null;
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
      { id: "swap-moves", kind: "conceptual", competency: CART, says: "The across move was added to y and the up-down move to x; the first coordinate tells how far across, the second how far up.", predict: tup(x + b, y + a) },
      { id: "wrong-way-across", kind: "procedural", competency: CART, says: `The point was moved to the ${a > 0 ? "left" : "right"} instead of the ${a > 0 ? "right" : "left"}: moving right makes x bigger, moving left makes it smaller.`, predict: tup(x - a, y + b) },
      { id: "wrong-way-updown", kind: "procedural", competency: CART, says: `The point was moved ${b > 0 ? "down" : "up"} instead of ${b > 0 ? "up" : "down"}: moving up makes y bigger, moving down makes it smaller.`, predict: tup(x + a, y - b) },
    ],
    distractors: ([x, y, a, b]) => [tup(x + a, y), tup(x, y + b), tup(x - a, y - b)],
    variants: () => [],
    explain: (s) => (s.id === "across" ? `Across: ${n_(Number(s.inputs[0]))} ${Number(s.inputs[1]) > 0 ? "+" : "−"} ${Math.abs(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : `Up or down: ${n_(Number(s.inputs[0]))} ${Number(s.inputs[1]) > 0 ? "+" : "−"} ${Math.abs(Number(s.inputs[1]))} = ${n_(Number(s.value))}`),
    domain: [[-5, 5], [-5, 5], [-4, 4], [-4, 4]],
    cap: 400,
    difficulty: ([x, y, a, b]) => (a > 0 && b > 0 && x >= 0 && y >= 0 ? 1 : x + a < 0 !== x < 0 || y + b < 0 !== y < 0 ? 3 : 2),
    figure: ([x, y]) => ({ type: "plane", points: [[x, y, "P"]], range: 7 }),
    word: ([x, y, a, b]) => `In a board game on a squared grid, ${name(x + y + 5)}'s counter is at ${tup(x, y)}. The card says: move ${Math.abs(a)} to the ${a > 0 ? "right" : "left"} and ${Math.abs(b)} ${b > 0 ? "up" : "down"}. Where does the counter end up? Write (x, y).`,
    teach: {
      idea: "A translation slides a shape without turning or flipping it: every point moves the same distance across and the same distance up or down.",
      method: "Add the move to the right to x (take away a move to the left), and add the move up to y (take away a move down).",
      visual: ([x, y, a, b]) => ({ type: "plane", points: [[x, y, "P"], [x + a, y + b, "P′"]], segments: [[[x, y], [x + a, y]], [[x + a, y], [x + a, y + b]]], range: 7 }),
      alternatives: [
        { id: "walk", title: "Walk it on the grid", kind: "procedural", text: ["Put a finger on P. Count the squares across first, one at a time, then the squares up or down.", "Read the coordinates where your finger stops: across first, then up."] },
      ],
    },
    limits: "One point translated on a grid; translating whole figures, rotations and drawing are not here.",
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
        { id: "subtract-as-number", kind: "conceptual", competency: ELAPSED, says: "The times were subtracted like ordinary numbers, borrowing 100 minutes; an hour has only 60 minutes.", predict: borrow ? tup(Math.floor(raw / 100), raw % 100) : null },
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
    word: ([h1, k1, h2, k2]) => `A train leaves Chennai Egmore at ${hh(h1, 5 * k1)} and reaches Tiruchirappalli at ${hh(h2, 5 * k2)} the same day. How long is the journey? Write it as (hours, minutes).`,
    teach: {
      idea: "Time is counted in sixties: 60 minutes make 1 hour. So when you take away times you borrow 60 minutes, not 100.",
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
    solve: ([r, c]) => ({ steps: [{ id: "rows", op: "multiply", competency: MT, inputs: [r, c], value: r * c }], answer: r * c }),
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
      if (op === 0) return s1 + s2 < UNITS[kind].f || s1 + s2 === UNITS[kind].f || b1 + b2 > 9 ? "An addition that regroups the small units, with an answer under 10 large units." : null;
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
      return [tup(Math.floor(tot / f) + 1, tot % f), tup(Math.max(0, Math.floor(tot / f) - 1), tot % f)];
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
    reject: (p) => (!inRange(p, [[0, 3], [1, 9], [1, 199]]) || (p[0] === 0 && p[2] > 99) ? "1 to 9 large units and a small part (up to 99 cm, or up to 995 g, mL or m)." : null),
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
        { id: "wrong-factor", kind: "recall", competency: CONV, says: `1 ${CONVK[k].big} was taken as ${f === 100 ? 1000 : 100} ${CONVK[k].small}; 1 ${CONVK[k].big} = ${f} ${CONVK[k].small}.`, predict: b * (f === 100 ? 1000 : 100) + sm },
        { id: "added", kind: "conceptual", competency: CONV, says: "The two numbers were simply added; first change the large units into small units.", predict: b + sm },
      ];
    },
    distractors: ([k, b, s]) => [b * CONVK[k].f * 10 + convSmall(k, s), b * CONVK[k].f + 10 * convSmall(k, s), (b + 1) * CONVK[k].f + convSmall(k, s)],
    variants: () => [],
    explain: (s) => (s.id === "big" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [1, 9], [1, 199]],
    cap: 400,
    difficulty: ([k, , s]) => {
      const sm = convSmall(k, s);
      const short = String(sm).length < String(CONVK[k].f).length - 1;
      return short ? 3 : k === 0 ? 1 : 2;
    },
    word: ([k, b, s]) => {
      const sm = convSmall(k, s);
      return [
        `A saree border piece is ${b} m ${sm} cm long. How many centimetres long is it?`,
        `A watermelon weighs ${b} kg ${sm} g. How many grams does it weigh?`,
        `A water bottle holds ${b} L ${sm} mL. How many millilitres does it hold?`,
        `${name(b + s)} walks ${b} km ${sm} m to school. How many metres is that?`,
      ][k];
    },
    teach: {
      idea: "1 m = 100 cm, 1 kg = 1000 g, 1 L = 1000 mL and 1 km = 1000 m. A measure in two units is the large part changed into small units, plus the small part.",
      method: "Multiply the large units by 100 or 1000, then add the small units. Check the small part fills its places: 3 kg 25 g = 3000 g + 25 g = 3025 g.",
      visual: ([k, b, s]) => ({ type: "table", head: ["Thousands", "Hundreds", "Tens", "Ones"], rows: [String(b * CONVK[k].f + convSmall(k, s)).padStart(4, " ").split("")] }),
      alternatives: [
        { id: "place_chart", title: "Use a place-value chart", kind: "procedural", text: ["Write the large units in the thousands place (for g, mL, m) or hundreds place (for cm).", "Write the small units ending in the ones place, and fill any empty places with 0."] },
      ],
    },
    limits: "Large to small units for m–cm, kg–g, L–mL and km–m; changing to the larger unit with decimals and milligrams are not here.",
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
    prompt: (p) => `Write in figures: ${indWords(p)}.`,
    solve: ([L, T, H, r]) => ({
      steps: [
        { id: "lakhs", op: "place", competency: LARGE, inputs: [L, 100000], value: L * 100000 },
        { id: "thousands", op: "place", competency: THOU, inputs: [T, 1000], value: T * 1000 },
        { id: "rest", op: "place", competency: PV, inputs: [H, REST[r]], value: H * 100 + REST[r] },
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
        { id: "lakh-as-ten-thousand", kind: "recall", competency: LARGE, says: "A lakh was written like ten thousand; 1 lakh = 100 thousand = 1,00,000 (six digits).", predict: L > 0 && T < 10 ? L * 10000 + T * 1000 + H * 100 + REST[r] : null },
      ];
    },
    distractors: ([L, T, H, r]) => [L * 1000000 + T * 1000 + H * 100 + REST[r], L * 100000 + T * 10000 + H * 100 + REST[r], L * 100000 + T * 1000 + H * 10 + REST[r]],
    variants: () => [],
    explain: (s) => (s.id === "lakhs" ? `${s.inputs[0]} lakh = ${ind(Number(s.value))}` : s.id === "thousands" ? `${s.inputs[0]} thousand = ${ind(Number(s.value))}` : `${s.inputs[0]} hundred and ${s.inputs[1]} = ${s.value}; put the periods together`),
    domain: [[0, 9], [0, 99], [0, 9], [0, 19]],
    cap: 400,
    difficulty: ([L, T, H, r]) => [L === 0, T < 10, H === 0, REST[r] < 10].filter(Boolean).length >= 2 ? 3 : L === 0 ? 1 : 2,
    word: (p) => `The number of people who visited a book fair in Chennai was announced as "${indWords(p)}". ${name(p[1] + p[2])} writes it down in figures. What does ${name(p[1] + p[2])} write?`,
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
