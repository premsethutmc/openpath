/**
 * Families b24 (families@2): Grade 7 coverage gaps (grade7-coverage@1). Each family closes a part of a CBSE or Tamil Nadu
 * Grade 7 outcome that the outcome-assessment map (content/learning/outcome-assessment.v1.json) found unassessed:
 *   ajmilr  millions and billions back into lakhs and crores        cbse-g07-t1-c01-o01
 *   ajsize  judging the size of a large quantity (1 crore seconds …)  cbse-g07-t1-c01-o04
 *   agchange money word problems: a bill paid with a note, the change cbse-g07-t1-c03-o04, tn-g07-t3-c01-o02
 *   ahfibp  patterns in the Virahanka-Fibonacci numbers               cbse-g07-t1-c06-o03
 *   aerot   rotating a point about the origin (90°, 180°, 270°)      tn-g07-t3-c04-o01 (rotations; reflections and
 *           translations are aerefl and aetrans)
 *   aetfig  a figure and its image: which transformation, and which symmetry the pattern has   tn-g07-t3-c04-o01
 */
import type { Bug, Def, Value, Visual } from "../family-kit";

const IIN = "MATH.number.indian-international-numeration";
const P10 = "MATH.number.multiply-divide-powers-of-ten";
const ROUND = "MATH.number.rounding";
const DEC = "MATH.number.decimal-operations";
const SEQ = "MATH.sequences.explicit-recursive-rules";
const TRANS = "MATH.geometry.transformations";
const CART = "MATH.coordinate.cartesian";
const none = () => null;

const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];

/** A whole number with Indian commas: 1,00,00,000. */
const inr = (v: number) => {
  const s = String(Math.abs(v));
  if (s.length <= 3) return (v < 0 ? "−" : "") + s;
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return (v < 0 ? "−" : "") + parts.join(",") + "," + s.slice(-3);
};
/** A whole number with international commas: 1,000,000. */
const intl = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** Only explanations whose prediction is a different, meaningful answer. */
const differ = (answer: Value, list: Bug[]): Bug[] => {
  const seen = new Set<string>([String(answer)]);
  return list.filter((b) => {
    if (b.predict === null || (typeof b.predict === "number" && (!Number.isInteger(b.predict) || b.predict < 0))) return false;
    const k = String(b.predict);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ================================================================ ajmilr: international → Indian
// [x, kind]: 0 = x million in lakh (x 1–99) · 1 = x billion in crore (x 1–20) · 2 = 10x million in crore (x 1–99)
const MILR = ["million-to-lakh", "billion-to-crore", "million-to-crore"] as const;
const milrQ = ([x, kind]: number[]) => (kind === 0 ? { n: x * 1e6, from: `${x} million`, to: "lakh", per: 1e5 } : kind === 1 ? { n: x * 1e9, from: `${x} billion`, to: "crore", per: 1e7 } : { n: x * 1e7, from: `${10 * x} million`, to: "crore", per: 1e7 });

// ================================================================ ajsize: how big is a large quantity?
// [m, e, kind]: N = m × 10^e (e = 5 lakh, 6 ten lakh, 7 crore) of a small unit, given in the larger unit to the nearest whole one
const SIZE = [
  { from: "seconds", to: "hours", per: 3600, chain: [60, 60], names: ["minutes", "hours"] },
  { from: "seconds", to: "days", per: 86400, chain: [60, 60, 24], names: ["minutes", "hours", "days"] },
  { from: "minutes", to: "days", per: 1440, chain: [60, 24], names: ["hours", "days"] },
  { from: "hours", to: "years", per: 8760, chain: [24, 365], names: ["days", "years"] },
  { from: "days", to: "years", per: 365, chain: [365], names: ["years"] },
];
const POWER = { 5: "lakh", 6: "ten lakh", 7: "crore" } as Record<number, string>;
const sizeN = ([m, e]: number[]) => m * 10 ** e;
const sizeName = ([m, e]: number[]) => (e === 6 ? `${10 * m} lakh` : `${m} ${POWER[e]}`);
const nearest = (n: number, d: number) => Math.floor((2 * n + d) / (2 * d));

// ================================================================ agchange: a bill and the change from a note
// [ra, pa, rb, pb, k]: items cost ₹ra.PAISE[pa] and ₹rb.PAISE[pb]; paid with NOTES[k]
const PAISE = [10, 20, 25, 40, 50, 55, 60, 75, 80, 95];
const NOTES = [100, 200, 500];
/** Items whose usual price fits the amount: under ₹50, ₹50 to ₹150, over ₹150 (two choices in each band). */
const ITEMS: [string, string][] = [
  ["a pen", "a cup of tea"],
  ["a storybook", "a box of crayons"],
  ["a school bag", "a wall clock"],
];
const itemFor = (u: number, slot: number) => ITEMS[u < 5000 ? 0 : u <= 15000 ? 1 : 2][slot];
const money = (u: number) => `₹${Math.floor(u / 100)}.${String(u % 100).padStart(2, "0")}`;
const rupees = (u: number) => `${Math.floor(u / 100)}.${String(u % 100).padStart(2, "0")}`;
const changeOf = ([ra, pa, rb, pb, k]: number[]) => {
  const a = ra * 100 + PAISE[pa];
  const b = rb * 100 + PAISE[pb];
  return { a, b, total: a + b, note: NOTES[k] * 100, change: NOTES[k] * 100 - a - b };
};
/** The answer in paise, or null if it is not a whole number of paise. */
const paiseOf = (v: Value): number | null => {
  if (Array.isArray(v)) return null;
  const x = Number(String(v).replace(/−/g, "-"));
  if (!Number.isFinite(x)) return null;
  const u = Math.round(x * 100);
  return Math.abs(x * 100 - u) < 1e-6 ? u : null;
};

// ================================================================ ahfibp: patterns in 1, 2, 3, 5, 8, …
// [n, kind]: 0 = the sum of the first n numbers · 1, 2, 3 = how many of the first n are multiples of 2, 3, 5
const FIB_RANGE: [number, number][] = [[3, 12], [6, 30], [8, 40], [10, 40]];
const FIB_MOD = [0, 2, 3, 5];
/** the places of the multiples repeat every FIB_GAP terms (2, 5, 8 … · 3, 7, 11 … · 4, 9, 14 …) */
const FIB_GAP = [0, 3, 4, 5];
const FIB_WHAT = ["", "even", "multiples of 3", "multiples of 5"];
const FIB_PATTERN = ["", "the even numbers are terms 2, 5, 8, … (one in every three)", "the multiples of 3 are terms 3, 7, 11, … (one in every four)", "the multiples of 5 are terms 4, 9, 14, … (one in every five)"];
const virahanka = (n: number) => {
  const t = [1, 2];
  while (t.length < n) t.push(t[t.length - 1] + t[t.length - 2]);
  return t.slice(0, n);
};

// ================================================================ aerot: a quarter or half turn about the origin
// [x, y, turn]: rotate P(x, y) about O(0, 0); turn 0 = 90° anticlockwise, 1 = 90° clockwise, 2 = 180°
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
const tup = (a: number, b: number) => `(${n_(a)}, ${n_(b)})`;
const readTuple = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const m = v.replace(/−/g, "-").replace(/\s/g, "").match(/^\((-?\d+(?:,-?\d+)*)\)$/);
  return m ? m[1].split(",").map(Number) : null;
};
const TURN = ["90° anticlockwise", "90° clockwise", "180°"];
const rot = ([x, y, turn]: number[]): [number, number] => (turn === 0 ? [-y, x] : turn === 1 ? [y, -x] : [-x, -y]);

// ================================================================ aetfig: a triangle and its image
// [s, t, kind, v]: triangle TRI[s]; t = 0 reflection in the y-axis, 1 reflection in the x-axis, 2 translation (slide v),
// 3 half turn about O, 4 quarter turn anticlockwise about O; kind 0 = which transformation, 1 = which symmetry the pattern has
const TRI: number[][][] = [
  [[1, 1], [4, 1], [1, 3]],
  [[1, 1], [5, 2], [2, 4]],
  [[2, 1], [5, 1], [3, 3]],
  [[1, 2], [4, 1], [3, 4]],
  [[1, 1], [3, 1], [1, 4]],
  [[2, 1], [5, 3], [1, 3]],
  [[1, 1], [4, 2], [2, 3]],
  [[1, 3], [3, 1], [5, 4]],
  [[2, 2], [5, 1], [4, 4]],
  [[1, 1], [5, 1], [2, 3]],
];
const TF_NAME = ["a reflection in the y-axis", "a reflection in the x-axis", "a translation (a slide)", "a rotation through 180° about O", "a rotation through 90° anticlockwise about O"];
const SYM_NAME = ["line symmetry, with the y-axis as its mirror line", "line symmetry, with the x-axis as its mirror line", "translational symmetry (it fits onto itself after a slide)", "rotational symmetry of order 2 about O", "rotational symmetry of order 4 about O"];
const MAKE = ["its reflection in the y-axis", "its reflection in the x-axis", "copies of it slid again and again by the same step, so that the strip goes on in both directions", "its image after a half turn about O", "its images after turning it through 90°, 180° and 270° about O"];
const SLIDE1 = [[-6, 1], [0, -6], [-6, -6], [-5, 2]];
const SLIDE2 = [[-4, 0], [0, -4], [-3, -3], [-4, 1]];
const moveBy = (q: number[][], f: (x: number, y: number) => number[]) => q.map(([x, y]) => f(x, y));
const MOVES: ((x: number, y: number, v: number) => number[])[] = [
  (x, y) => [-x, y],
  (x, y) => [x, -y],
  (x, y, v) => [x + SLIDE1[v][0], y + SLIDE1[v][1]],
  (x, y) => [-x, -y],
  (x, y) => [-y, x],
];
const tfImage = ([s, t, , v]: number[]) => moveBy(TRI[s], (x, y) => MOVES[t](x, y, v));
/** The triangles of the picture: kind 0 the triangle and its image; kind 1 the whole pattern. */
const tfCopies = ([s, t, kind, v]: number[]): number[][][] => {
  const A = TRI[s];
  if (kind === 0) return [A, tfImage([s, t, kind, v])];
  if (t === 2) return [0, 1, 2].map((k) => moveBy(A, (x, y) => [x + k * SLIDE2[v][0], y + k * SLIDE2[v][1]]));
  if (t === 4) return [A, moveBy(A, (x, y) => [-y, x]), moveBy(A, (x, y) => [-x, -y]), moveBy(A, (x, y) => [y, -x])];
  return [A, moveBy(A, (x, y) => MOVES[t](x, y, 0))];
};
const tfFigure = (p: number[]): Visual => {
  const copies = tfCopies(p);
  const segments = copies.flatMap((q) => [0, 1, 2].map((i) => [q[i], q[(i + 1) % 3]] as [number, number][]));
  const labels = p[2] === 0 ? [...copies[0].map(([x, y], i) => [x, y, "ABC"[i]]), ...copies[1].map(([x, y], i) => [x, y, `${"ABC"[i]}′`])] : [];
  return { type: "plane", points: [...labels, [0, 0, "O"]] as [number, number, string][], segments, range: 7 } as Visual;
};
/** Every listed answer that fits the picture, read from its points with geometric tests (not the formulas above). */
const tfMatches = (p: number[]): number[] => {
  const copies = tfCopies(p);
  const out: number[] = [];
  if (p[2] === 0) {
    const [S, I] = copies;
    const area = (q: number[][]) => (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]);
    const flipped = Math.sign(area(S)) !== Math.sign(area(I));
    const pairs = S.map((a, i) => [a, I[i]]);
    if (flipped && pairs.every(([a, b]) => a[0] + b[0] === 0 && a[1] === b[1])) out.push(0);
    if (flipped && pairs.every(([a, b]) => a[1] + b[1] === 0 && a[0] === b[0])) out.push(1);
    const d = [I[0][0] - S[0][0], I[0][1] - S[0][1]];
    if (!flipped && (d[0] || d[1]) && pairs.every(([a, b]) => b[0] - a[0] === d[0] && b[1] - a[1] === d[1])) out.push(2);
    if (!flipped && pairs.every(([a, b]) => a[0] + b[0] === 0 && a[1] + b[1] === 0)) out.push(3);
    if (!flipped && pairs.every(([a, b]) => a[0] * a[0] + a[1] * a[1] === b[0] * b[0] + b[1] * b[1] && a[0] * b[0] + a[1] * b[1] === 0 && a[0] * b[1] - a[1] * b[0] > 0)) out.push(4);
    return out;
  }
  // kind 1: the symmetries of the whole pattern, as a set of corner points
  const key = (q: number[][]) => q.map(([x, y]) => `${x},${y}`).sort().join(" ");
  const all = new Set(copies.map(key));
  const maps = (f: (x: number, y: number) => number[]) => copies.every((q) => all.has(key(moveBy(q, f))));
  const ly = maps((x, y) => [-x, y]);
  const lx = maps((x, y) => [x, -y]);
  const r2 = maps((x, y) => [-x, -y]);
  const r4 = maps((x, y) => [-y, x]);
  const steps = copies.slice(1).map((q, k) => [q[0][0] - copies[k][0][0], q[0][1] - copies[k][0][1]]);
  const strip = copies.length >= 3 && steps.every((d) => (d[0] || d[1]) && d[0] === steps[0][0] && d[1] === steps[0][1]) && copies.slice(1).every((q, k) => q.every((pt, i) => pt[0] - copies[k][i][0] === steps[0][0] && pt[1] - copies[k][i][1] === steps[0][1]));
  if (ly) out.push(0);
  if (lx) out.push(1);
  if (strip) out.push(2);
  if (r2 && !r4) out.push(3);
  if (r4) out.push(4);
  return out;
};
/** Four of the five answers (the right one always kept), in an order that varies with the triangle. */
const tfChoices = ([s, t, kind]: number[]) => {
  // a pattern with four quarter turns also fits after a half turn: "order 2" would be arguable, so it is never offered there
  const drop = kind === 1 && t === 4 ? 3 : [(t + 1 + s) % 5, (t + 2 + s) % 5].find((j) => j !== t)!;
  const rest = [0, 1, 2, 3, 4].filter((j) => j !== drop);
  const r = s % 4;
  return [...rest.slice(r), ...rest.slice(0, r)];
};

export const B24: Def[] = [
  {
    id: "ajmilr",
    arity: 2,
    title: "Millions and billions in lakhs and crores",
    competency: IIN,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([x, kind]) => (kind < 0 || kind > 2 || x < 1 || x > (kind === 1 ? 20 : 99) ? "x million in lakh, x billion in crore (x up to 20), or 10x million in crore." : null),
    prompt: (p) => {
      const q = milrQ(p);
      return `${q.from} is ${intl(q.n)} in the international system. How many ${q.to} is it?`;
    },
    solve: ([x, kind]) =>
      kind === 0
        ? { steps: [{ id: "million", op: "convert", competency: IIN, inputs: [1, "million"], value: 10 }, { id: "total", op: "multiply", competency: P10, inputs: [x, 10], value: 10 * x }], answer: 10 * x }
        : kind === 1
          ? { steps: [{ id: "billion", op: "convert", competency: IIN, inputs: [1, "billion"], value: 100 }, { id: "total", op: "multiply", competency: P10, inputs: [x, 100], value: 100 * x }], answer: 100 * x }
          : { steps: [{ id: "crore", op: "convert", competency: IIN, inputs: [10, "million"], value: 1 }, { id: "total", op: "divide", competency: P10, inputs: [10 * x, 10], value: x }], answer: x },
    // independent: write the number out in ones and take away one lakh (or one crore) at a time
    validate: (p, v) => {
      const q = milrQ(p);
      let n = q.n;
      let lots = 0;
      while (n >= q.per) {
        n -= q.per;
        lots++;
      }
      return n === 0 && v === lots;
    },
    bugs: ([x, kind]) => {
      const answer = kind === 0 ? 10 * x : kind === 1 ? 100 * x : x;
      const list: Bug[] =
        kind === 0
          ? [
              { id: "million-is-lakh", kind: "conceptual", competency: IIN, says: "1 million was taken as 1 lakh. 1 million is 10,00,000 = 10 lakh.", predict: x },
              { id: "million-hundred-lakh", kind: "recall", competency: IIN, says: "1 million was taken as 100 lakh (1 crore). 1 crore is 10 million, so 1 million is only 10 lakh.", predict: 100 * x },
            ]
          : kind === 1
            ? [
                { id: "billion-ten-crore", kind: "recall", competency: IIN, says: "1 billion was taken as 10 crore. 1 billion is 1,000 million and 1 crore is 10 million, so 1 billion is 100 crore.", predict: 10 * x },
                { id: "billion-is-crore", kind: "conceptual", competency: IIN, says: "1 billion was taken as 1 crore. 1 crore is only 10 million; 1 billion is 100 crore.", predict: x },
                { id: "billion-thousand-crore", kind: "recall", competency: IIN, says: "1 billion was taken as 1,000 crore. 1 billion is 1,00,00,00,000 = 100 crore.", predict: 1000 * x },
              ]
            : [
                { id: "million-is-crore", kind: "conceptual", competency: IIN, says: "Each million was counted as a crore. 1 crore is 10 million, so divide the millions by 10.", predict: 10 * x },
                { id: "lakh-for-crore", kind: "procedural", competency: IIN, says: "The millions were changed into lakh, not crore. 10 million is 1 crore (100 lakh).", predict: 100 * x },
              ];
      return differ(answer, list);
    },
    distractors: ([x, kind]) => (kind === 0 ? [x + 10, 10 * x + 10, 1000 * x] : kind === 1 ? [100 * x + 100, 1000 * x, 10 * x + 1] : [x + 1, 100 * x, x * 1000]).filter((v) => v > 0),
    variants: () => [],
    explain: (s) =>
      s.id === "million"
        ? "1 million = 10,00,000 = 10 lakh"
        : s.id === "billion"
          ? "1 billion = 1,000 million = 1,00,00,00,000 = 100 crore"
          : s.id === "crore"
            ? "10 million = 1,00,00,000 = 1 crore"
            : s.op === "multiply"
              ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`
              : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`,
    domain: [[1, 99], [0, 2]],
    difficulty: ([x, kind]) => (kind === 0 && x < 20 ? 1 : kind === 1 ? 3 : 2),
    word: (p) => {
      const q = milrQ(p);
      return `A news report gives a company's yearly sales as ${q.from} rupees (₹${intl(q.n)}). ${nm(p[0])} wants to say it in the Indian system. How many ${q.to} rupees is that?`;
    },
    teach: {
      idea: "The two systems name the same number differently: one million is ten lakh, ten million is one crore, and one billion is a hundred crore.",
      method: "Write the number out in full, then regroup its digits with Indian commas (a comma before the last three digits, then after every two digits going left) and read off the lakhs or crores.",
      alternatives: [
        { id: "commas", title: "Move the commas", kind: "procedural", text: ["Write 20,000,000 with Indian commas: 2,00,00,000.", "That reads 2 crore, so 20 million is 2 crore."] },
        { id: "ladder", title: "A ladder of names", kind: "conceptual", text: ["1 lakh = 100 thousand. 10 lakh = 1 million. 1 crore = 10 million. 100 crore = 1 billion.", "Climb the ladder one step at a time."] },
      ],
    },
    limits: "Whole numbers of millions or billions; numbers with lakhs and thousands mixed in are other families.",
  },
  {
    id: "ajsize",
    arity: 3,
    title: "How big is a large quantity? (time)",
    competency: P10,
    skill: ROUND,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([m, e, kind]) => {
      if (m < 1 || m > 9 || e < 5 || e > 7 || kind < 0 || kind > 4) return "1 to 9 lakh, ten lakh or crore of seconds, minutes or hours.";
      const n = sizeN([m, e]);
      const d = SIZE[kind].per;
      if (2 * (n % d) === d) return "the answer would be exactly halfway between two whole numbers";
      return nearest(n, d) < 1 || nearest(n, d) > 99999 ? "the answer should be between 1 and 99,999" : null;
    },
    prompt: ([m, e, kind]) => {
      const s = SIZE[kind];
      return `About how many ${s.to} are ${sizeName([m, e])} (${inr(sizeN([m, e]))}) ${s.from}? Give the answer to the nearest whole number of ${s.to}${kind >= 3 ? " (take a year as 365 days)" : ""}.`;
    },
    solve: ([m, e, kind]) => {
      const s = SIZE[kind];
      const n = sizeN([m, e]);
      return {
        steps: [
          { id: "per", op: "multiply", competency: P10, inputs: s.chain, value: s.per },
          { id: "share", op: "divide", competency: P10, inputs: [n, s.per], value: n / s.per },
          { id: "round", op: "round", competency: ROUND, inputs: [n / s.per], value: nearest(n, s.per) },
        ],
        answer: nearest(n, s.per),
      };
    },
    // independent: the nearest whole number v puts v × (units in one) within half a unit of the quantity
    validate: ([m, e, kind], v) => typeof v === "number" && Number.isInteger(v) && Math.abs(2 * (v * SIZE[kind].per - sizeN([m, e]))) < SIZE[kind].per,
    bugs: ([m, e, kind]) => {
      const s = SIZE[kind];
      const n = sizeN([m, e]);
      const answer = nearest(n, s.per);
      const list: Bug[] = [
        { id: "one-step-short", kind: "procedural", competency: P10, says: `Only part of the change of units was done: ${s.from} were changed into ${s.names[s.names.length - 2] ?? s.names[0]} but not on into ${s.to}.`, predict: s.chain.length > 1 ? nearest(n, s.per / s.chain[s.chain.length - 1]) : null },
        { id: "hundred-for-sixty", kind: "conceptual", competency: P10, says: "Time was treated like decimals, with 100 seconds in a minute or 100 minutes in an hour. There are 60.", predict: nearest(n, s.chain.reduce((a, c) => a * (c === 60 ? 100 : c), 1)) },
        { id: "lakh-as-ten-thousand", kind: "recall", competency: IIN, says: "1 lakh was read as 10,000. 1 lakh is 1,00,000 (one hundred thousand).", predict: e === 5 ? nearest(n / 10, s.per) : null },
        { id: "crore-as-ten-lakh", kind: "recall", competency: IIN, says: "1 crore was read as 10 lakh. 1 crore is 100 lakh = 1,00,00,000.", predict: e === 7 ? nearest(n / 10, s.per) : null },
        { id: "rounded-down", kind: "procedural", competency: ROUND, says: "The answer was cut off at the whole number instead of rounded: look at what is left over and round up when it is more than half.", predict: Math.floor(n / s.per) },
      ];
      return differ(answer, list).filter((b) => (b.predict as number) >= 1);
    },
    distractors: ([m, e, kind]) => {
      const a = nearest(sizeN([m, e]), SIZE[kind].per);
      return [a * 10, Math.max(1, Math.round(a / 10)), a + 1, a * 60];
    },
    variants: () => [],
    explain: (s) =>
      s.id === "per"
        ? `${(s.inputs as number[]).join(" × ")} = ${s.value}`
        : s.id === "share"
          ? `${inr(s.inputs[0] as number)} ÷ ${inr(s.inputs[1] as number)} = ${Number(s.value).toFixed(2)}`
          : `${Number(s.inputs[0]).toFixed(2)} is nearest to ${s.value}`,
    domain: [[1, 9], [5, 7], [0, 4]],
    difficulty: ([, e, kind]) => (kind === 0 || kind === 2 ? 1 : e === 7 ? 3 : 2),
    // level@1: lakhs of a unit are Grade 5 work; ten lakh and crores (the CBSE Grade 7 chapter) are Grade 7
    grade: ([, e]) => (e === 5 ? 5 : 7),
    word: ([m, e, kind]) => {
      const s = SIZE[kind];
      return `${nm(m + kind)} says, "I could count to ${sizeName([m, e])} if I said one number every ${s.from.replace(/s$/, "")}." About how many ${s.to} would that take? Give the answer to the nearest whole number of ${s.to}${kind >= 3 ? " (take a year as 365 days)" : ""}.`;
    },
    teach: {
      idea: "A large number of a small unit is easier to picture in a bigger unit: change the units step by step (60 seconds in a minute, 60 minutes in an hour, 24 hours in a day).",
      method: "Multiply the steps to find how many small units make one big unit, divide the quantity by it, then round to the nearest whole number.",
      alternatives: [
        { id: "step-by-step", title: "One change at a time", kind: "procedural", text: ["Divide by 60 to get minutes, by 60 again to get hours, then by 24 to get days.", "Round only at the end."] },
        { id: "benchmark", title: "Use a benchmark", kind: "conceptual", text: ["There are 86,400 seconds in a day, about 1 lakh.", "So 1 lakh seconds is a little more than 1 day, and 1 crore seconds is about 100 days."] },
      ],
    },
    limits: "Time units only (seconds, minutes, hours or days to hours, days or years); other quantities and judging plausibility by choice are other families.",
  },
  {
    id: "agchange",
    arity: 5,
    title: "Money word problems: the bill and the change",
    competency: DEC,
    type: "fraction",
    decimals: true,
    mc: true,
    parse: none,
    reject: (p) => {
      const [ra, pa, rb, pb, k] = p;
      if (ra < 5 || ra > 240 || rb < 5 || rb > 240 || pa < 0 || pa > 9 || pb < 0 || pb > 9 || k < 0 || k > 2) return "Two prices from ₹5 to ₹240 with paise, paid with a ₹100, ₹200 or ₹500 note.";
      const c = changeOf(p);
      if (c.change < 100) return "the note must leave at least ₹1 of change";
      if (k > 0 && c.total <= NOTES[k - 1] * 100) return "the smallest note that pays the bill is used";
      return null;
    },
    prompt: (p) => {
      const c = changeOf(p);
      return `${nm(p[0] + p[2])} buys ${itemFor(c.a, 0)} for ${money(c.a)} and ${itemFor(c.b, 1)} for ${money(c.b)}, and pays with a ₹${NOTES[p[4]]} note. How much change should ${nm(p[0] + p[2])} get, in rupees?`;
    },
    solve: (p) => {
      const c = changeOf(p);
      return {
        steps: [
          { id: "bill", op: "add", competency: DEC, inputs: [rupees(c.a), rupees(c.b)], value: rupees(c.total) },
          { id: "change", op: "subtract", competency: DEC, inputs: [String(NOTES[p[4]]), rupees(c.total)], value: rupees(c.change) },
        ],
        answer: rupees(c.change),
      };
    },
    // independent: count up from each price in paise; the change and the two prices together make the note
    validate: (p, v) => {
      const u = paiseOf(v);
      const c = changeOf(p);
      return u !== null && u > 0 && u + c.a + c.b === c.note;
    },
    bugs: (p) => {
      const c = changeOf(p);
      const list: Bug[] = [
        { id: "bill-not-change", kind: "conceptual", competency: DEC, says: "The bill was found, but the question asks for the change: take the bill away from the note.", predict: rupees(c.total) },
        { id: "one-item-only", kind: "procedural", competency: DEC, says: "Only one item was taken away from the note. Add both prices first to get the bill.", predict: rupees(c.note - c.a) },
        { id: "paise-not-carried", kind: "procedural", competency: DEC, says: "When the paise were added, the ₹1 they made was not carried, so the bill came out ₹1 too small.", predict: PAISE[p[1]] + PAISE[p[3]] >= 100 ? rupees(c.change + 100) : null },
        { id: "paise-not-exchanged", kind: "procedural", competency: DEC, says: "The note has no paise, so ₹1 must be changed into 100 paise before the bill's paise are taken away; here the bill's paise were written down as the change's paise instead.", predict: c.total % 100 ? rupees((NOTES[p[4]] - Math.ceil(c.total / 100)) * 100 + (c.total % 100)) : null },
      ];
      return differ(rupees(c.change), list);
    },
    distractors: (p) => {
      const c = changeOf(p);
      return [c.change + 100, c.change - 100, c.change + 10, c.change - 10].filter((u) => u > 0).map(rupees);
    },
    variants: () => [],
    explain: (s) => (s.id === "bill" ? `Bill: ₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}` : `Change: ₹${s.inputs[0]} − ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[5, 240], [0, 9], [5, 240], [0, 9], [0, 2]],
    cap: 500,
    // level@1: prices under ₹100 are Grade 5 money work; bills with prices of ₹100 or more are Grade 7
    grade: ([ra, , rb]) => (ra >= 100 || rb >= 100 ? 7 : 5),
    difficulty: (p) => {
      const c = changeOf(p);
      return p[4] === 0 && PAISE[p[1]] + PAISE[p[3]] < 100 ? 1 : c.total % 100 === 0 || p[4] < 2 ? 2 : 3;
    },
    word: (p) => {
      const c = changeOf(p);
      return `At the school fair, ${nm(p[0] + p[2] + 3)} buys two things at one stall, costing ${money(c.a)} and ${money(c.b)}, and pays for both together with one ₹${NOTES[p[4]]} note. How much money does the stall give back, in rupees?`;
    },
    teach: {
      idea: "The change is what is left of the note after the whole bill is paid: first add the prices, then take the bill away from the note.",
      method: "Line up the decimal points to add the prices (carry ₹1 when the paise make 100 or more), then subtract the bill from the note, changing ₹1 into 100 paise when needed.",
      alternatives: [
        { id: "count-up", title: "Count up like a shopkeeper", kind: "procedural", text: ["Start at the bill and count up to the next whole rupee, then to the next ten, then to the note.", "Add up the jumps: that is the change."] },
        { id: "paise", title: "Work in paise", kind: "conceptual", text: ["₹23.50 is 2350 paise. Change every amount into paise, add and subtract as whole numbers.", "Put the point back two places from the right at the end."] },
      ],
    },
    limits: "Two items and one note; three or more items, discounts and change in several notes are other families.",
  },
  {
    id: "ahfibp",
    arity: 2,
    title: "Patterns in the Virahanka-Fibonacci numbers",
    // grade7-split@1: the Grade 7 competency (was SEQ)
    competency: "MATH.sequences.virahanka-numbers",
    skill: "MLY.seq.virahanka",
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n, kind]) => {
      if (kind < 0 || kind > 3) return "kind 0 (sum) or 1–3 (how many are multiples of 2, 3 or 5)";
      const [lo, hi] = FIB_RANGE[kind];
      return n < lo || n > hi ? `n from ${lo} to ${hi} for this kind of question` : null;
    },
    prompt: ([n, kind]) =>
      `The Virahanka numbers are 1, 2, 3, 5, 8, 13, … (each number after the first two is the sum of the two before it). ` +
      (kind === 0 ? `What is the sum of the first ${n} Virahanka numbers?` : `How many of the first ${n} Virahanka numbers are ${FIB_WHAT[kind]}?`),
    solve: ([n, kind]) => {
      const t = virahanka(n);
      if (kind === 0) {
        let s = 0;
        return { steps: t.map((v, i) => ({ id: `s${i + 1}`, op: "add", competency: SEQ, inputs: [s, v], value: (s += v) })), answer: s };
      }
      const k = FIB_MOD[kind];
      const hits = t.filter((v) => v % k === 0).length;
      return { steps: [{ id: "list", op: "list", competency: SEQ, inputs: [n], value: t.join(", ") }, { id: "count", op: "count", competency: SEQ, inputs: [n, k], value: hits }], answer: hits };
    },
    // independent: the sum is the (n + 2)th number minus 2; divisibility follows from remainders alone (the rule applied to remainders)
    validate: ([n, kind], v) => {
      if (kind === 0) {
        let a = 1;
        let b = 2;
        for (let i = 3; i <= n + 2; i++) [a, b] = [b, a + b];
        return v === b - 2;
      }
      const k = FIB_MOD[kind];
      let p = 1 % k;
      let q = 2 % k;
      let hits = (p === 0 ? 1 : 0) + (q === 0 ? 1 : 0);
      for (let i = 3; i <= n; i++) {
        [p, q] = [q, (p + q) % k];
        if (q === 0) hits++;
      }
      return v === hits;
    },
    bugs: ([n, kind]) => {
      const t = virahanka(n + 1);
      if (kind === 0) {
        const s = t.slice(0, n).reduce((a, b) => a + b, 0);
        return differ(s, [
          { id: "last-term", kind: "conceptual", competency: SEQ, says: `The ${n}th number was given, not the sum of the first ${n}. Add all of them.`, predict: t[n - 1] },
          { id: "one-too-many", kind: "procedural", competency: SEQ, says: `One number too many was added. Number the terms as you add them and stop at term ${n}.`, predict: s + t[n] },
          { id: "one-too-few", kind: "procedural", competency: SEQ, says: `One number was left out. Number the terms as you add them and include term ${n}.`, predict: s - t[n - 1] },
        ]);
      }
      const k = FIB_MOD[kind];
      const hits = t.slice(0, n).filter((v) => v % k === 0).length;
      return differ(hits, [
        { id: `like-counting-numbers-${k}`, kind: "conceptual", competency: SEQ, says: `It was assumed that, as in 1, 2, 3, 4, …, one number in every ${k} is ${FIB_WHAT[kind].replace(/s$/, "")}. The Virahanka numbers follow their own pattern: ${FIB_PATTERN[kind]}.`, predict: Math.floor(n / k) },
        { id: "counted-the-others", kind: "procedural", competency: SEQ, says: `The numbers that are not ${FIB_WHAT[kind]} were counted instead.`, predict: n - hits },
        { id: "pattern-from-wrong-place", kind: "procedural", competency: SEQ, says: `The repeating pattern was started from the wrong term. ${FIB_PATTERN[kind]}; list the first few and check before counting.`, predict: Math.floor(n / FIB_GAP[kind]) },
      ]);
    },
    distractors: ([n, kind]) => {
      const t = virahanka(n + 2);
      return kind === 0 ? [t[n + 1], t[n + 1] - 1, t[n]] : [Math.ceil(n / FIB_GAP[kind]) + 1, Math.floor(n / FIB_GAP[kind]) - 1, Math.floor(n / 2) + 1].filter((v) => v > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "list" ? `The first ${s.inputs[0]} numbers: ${s.value}` : s.id === "count" ? `Multiples of ${s.inputs[1]} among them: ${s.value}` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[3, 40], [0, 3]],
    difficulty: ([n, kind]) => (kind === 0 ? (n <= 6 ? 1 : n <= 9 ? 2 : 3) : kind === 1 && n <= 12 ? 2 : 3),
    word: ([n, kind]) =>
      `A drummer plays rhythms of short beats (1 count) and long beats (2 counts). The numbers of rhythms lasting 1, 2, 3, … counts are 1, 2, 3, 5, 8, 13, … ` +
      (kind === 0 ? `What do the first ${n} of these numbers add up to?` : `How many of the first ${n} of these numbers are ${FIB_WHAT[kind]}?`),
    teach: {
      idea: "Each Virahanka number is the sum of the two before it, so patterns in the list come from that rule: odd + odd makes even, so the even numbers come back every third place; multiples of 3 come every fourth place and multiples of 5 every fifth.",
      method: "Write the numbers in a numbered row and mark what you are looking for (each running sum, or each even number or multiple); find where the pattern repeats before counting a long list.",
      alternatives: [
        { id: "parity", title: "Only odd and even", kind: "conceptual", text: ["Write O for odd and E for even: O, E, O, O, E, O, O, E, …", "After the first number the block E, O, O repeats, so one number in every three is even: terms 2, 5, 8, …"] },
        { id: "sum-shortcut", title: "A shortcut for the sum", kind: "procedural", text: ["Add the first few and compare with the list: 1 + 2 + 3 = 6, and the 5th number is 8; 8 − 2 = 6.", "The sum of the first n numbers is always the (n + 2)th number minus 2."] },
      ],
      caseOf: ([, kind]) => ["sum", "even", "multiple-of-3", "multiple-of-5"][kind],
    },
    limits: "Sums of the first 3–12 numbers, and how many of the first numbers are even (6–30), multiples of 3 (8–40) or of 5 (10–40); ratios and other properties are not asked.",
  },
  {
    id: "aerot",
    arity: 3,
    title: "Rotating a point about the origin",
    competency: TRANS,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([x, y, turn]) => (x < -6 || x > 6 || y < -6 || y > 6 || turn < 0 || turn > 2 ? "A point with coordinates −6 to 6 and a turn of 90° either way or 180°." : x === 0 && y === 0 ? "The origin does not move." : x === 0 || y === 0 ? (turn === 2 ? null : "Points on an axis are kept for the half turn (a quarter turn of an axis point is the warm-up, not the task).") : null),
    prompt: ([x, y, turn]) => `In the picture, the point P is at ${tup(x, y)}. Rotate P through ${TURN[turn]} about the origin O(0, 0). What are the coordinates of its image? Write them as (x, y).`,
    solve: (p) => {
      const [x, y, turn] = p;
      const [a, b] = rot(p);
      return {
        steps:
          turn === 2
            ? [{ id: "half", op: "rotate", competency: TRANS, inputs: [x, y, 180], value: tup(a, b) }]
            : [
                { id: "swap", op: "swap", competency: CART, inputs: [x, y], value: tup(y, x) },
                { id: "sign", op: "rotate", competency: TRANS, inputs: [y, x, turn], value: tup(a, b) },
              ],
        answer: tup(a, b),
      };
    },
    // independent: a rotation about O keeps the distance from O; a half turn puts O midway between P and the image; a
    // quarter turn makes OP and OP′ perpendicular (dot product 0), anticlockwise when the cross product is positive
    validate: ([x, y, turn], v) => {
      const t = readTuple(v);
      if (!t || t.length !== 2) return false;
      const [a, b] = t;
      if (a * a + b * b !== x * x + y * y) return false;
      if (turn === 2) return a + x === 0 && b + y === 0;
      const dot = a * x + b * y;
      const cross = x * b - y * a;
      return dot === 0 && (turn === 0 ? cross > 0 : cross < 0);
    },
    bugs: (p) => {
      const [x, y, turn] = p;
      const [a, b] = rot(p);
      const answer = tup(a, b);
      const other = turn === 0 ? rot([x, y, 1]) : turn === 1 ? rot([x, y, 0]) : null;
      return differ(answer, [
        { id: "wrong-direction", kind: "conceptual", competency: TRANS, says: `The point was turned the wrong way. ${turn === 0 ? "Anticlockwise" : "Clockwise"} is ${turn === 0 ? "against" : "with"} the direction a clock's hands move.`, predict: other ? tup(other[0], other[1]) : null },
        { id: "swap-only", kind: "procedural", competency: TRANS, says: "The coordinates were swapped but no sign was changed: that is a reflection in the line y = x, not a turn. For a quarter turn, one of the swapped coordinates also changes sign.", predict: turn === 2 ? null : tup(y, x) },
        { id: "one-sign", kind: "conceptual", competency: TRANS, says: turn === 2 ? "Only one coordinate changed sign: that is a reflection in an axis. A half turn about O changes the sign of both coordinates." : "Only a sign was changed, without swapping: that is a reflection or a half turn, not a quarter turn.", predict: turn === 2 ? tup(-x, y) : tup(-x, y) },
      ]);
    },
    // a point on an axis has fewer distinct mistakes: (y, x), (−y, x) and (x + y, y − x) keep four options
    distractors: ([x, y]) => [tup(x, -y), tup(-y, -x), tup(x, y), tup(y, x), tup(-y, x), tup(x + y, y - x)],
    variants: () => [],
    explain: (s) =>
      s.id === "half"
        ? `A half turn about O sends (${n_(Number(s.inputs[0]))}, ${n_(Number(s.inputs[1]))}) to the opposite side of O: ${s.value}`
        : s.id === "swap"
          ? `A quarter turn swaps the coordinates: ${s.value}`
          : `${Number(s.inputs[2]) === 0 ? "Anticlockwise: the new x-coordinate takes the opposite sign" : "Clockwise: the new y-coordinate takes the opposite sign"}, giving ${s.value}`,
    domain: [[-6, 6], [-6, 6], [0, 2]],
    difficulty: ([x, y, turn]) => (turn === 2 ? 1 : x > 0 && y > 0 ? 2 : 3),
    // level@1: negative coordinates (all four quadrants) are Grade 7 work
    grade: () => 7,
    figure: ([x, y]) => ({ type: "plane", points: [[x, y, "P"], [0, 0, "O"]], range: 7 }),
    word: ([x, y, turn]) => `On a squared map, a toy aeroplane flies at the point ${tup(x, y)} on a string held at the town clock, O(0, 0). The string swings round the clock through ${TURN[turn]}. Where is the aeroplane now? Write the point as (x, y).`,
    teach: {
      idea: "A rotation about O keeps every point the same distance from O. A half turn sends P straight through O to the other side; a quarter turn makes OP and its image meet at a right angle.",
      method: "Half turn: change the sign of both coordinates. Quarter turn: swap the coordinates, then change the sign of the new x (anticlockwise) or the new y (clockwise). Check with tracing paper on the grid.",
      visual: (p) => {
        const [a, b] = rot(p);
        return { type: "plane", points: [[p[0], p[1], "P"], [a, b, "P′"], [0, 0, "O"]], segments: [[[0, 0], [p[0], p[1]]], [[0, 0], [a, b]]], range: 7 };
      },
      alternatives: [
        { id: "tracing", title: "Turn the tracing paper", kind: "conceptual", text: ["Trace the axes and P on thin paper. Put a pencil point on O and turn the paper a quarter turn.", "The traced P now sits on the image; read its coordinates."] },
        { id: "box", title: "Turn the box", kind: "procedural", text: ["Draw the box from O across x and up y to P. Turn the box a quarter turn: its width and height swap.", "Then decide from the picture which coordinates are negative."] },
      ],
    },
    limits: "Points with coordinates −6 to 6 turned about the origin through 90° either way or 180°; rotating whole figures, other centres and drawing are not here (drawing is marked by an educator).",
  },
  {
    id: "aetfig",
    arity: 4,
    title: "A figure and its image: the transformation, and the symmetry it makes",
    competency: TRANS,
    type: "choice",
    parse: none,
    reject: (p) => {
      const [s, t, kind, v] = p;
      if (s < 0 || s >= TRI.length || t < 0 || t > 4 || kind < 0 || kind > 1 || v < 0 || v > 3) return "A triangle (0–9), a transformation (0–4), a kind (0 which transformation, 1 which symmetry), a slide (0–3).";
      if (t !== 2 && v !== 0) return "Only a translation uses a slide.";
      return tfMatches(p).length === 1 ? null : "More than one listed answer fits this picture.";
    },
    prompt: ([s, t, kind, v]) =>
      kind === 0
        ? "In the picture, triangle A′B′C′ is the image of triangle ABC after one transformation. Which transformation is it?"
        : `${nm(s + t)} draws triangle ABC and then ${MAKE[t]}. Which symmetry does the whole pattern have?`,
    choices: (p) => tfChoices(p).map((j) => (p[2] === 0 ? TF_NAME[j] : SYM_NAME[j])),
    solve: (p) => {
      const [s, t, kind] = p;
      const shape = TRI[s];
      const img = tfImage(p);
      const area = (q: number[][]) => (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]);
      return {
        steps:
          kind === 0
            ? [
                { id: "turned", op: "compare", competency: TRANS, inputs: [area(shape), area(img)], value: Math.sign(area(shape)) === Math.sign(area(img)) ? "kept" : "reversed" },
                { id: "name", op: "identify", competency: TRANS, inputs: [t], value: TF_NAME[t] },
                { id: "pick", op: "choose the option", competency: TRANS, inputs: [TF_NAME[t]], value: tfChoices(p).indexOf(t) },
              ]
            : [
                { id: "copies", op: "transform", competency: TRANS, inputs: [t], value: MAKE[t] },
                { id: "symmetry", op: "identify", competency: TRANS, inputs: [t], value: SYM_NAME[t] },
                { id: "pick", op: "choose the option", competency: TRANS, inputs: [SYM_NAME[t]], value: tfChoices(p).indexOf(t) },
              ],
        answer: tfChoices(p).indexOf(t),
      };
    },
    // independent: read the picture's points with geometric tests, never the transformation's formula (see tfMatches)
    validate: (p, v) => typeof v === "number" && Number.isInteger(v) && tfMatches(p).length === 1 && tfChoices(p)[v] === tfMatches(p)[0],
    bugs: (p) => {
      const [, t, kind] = p;
      const ch = tfChoices(p);
      const at = (j: number) => (ch.includes(j) && j !== t ? ch.indexOf(j) : null);
      const list: Bug[] =
        kind === 0
          ? [
              { id: "half-turn-or-mirror", kind: "conceptual", competency: TRANS, says: t === 3 ? "A half turn was taken for a reflection. Follow the letters: after a reflection A, B, C go round the other way; after a half turn they go round the same way, upside down." : "A reflection was taken for a half turn. After a reflection the letters A, B, C go round the other way; after a turn they keep their order.", predict: t === 3 ? at(0) : t === 0 || t === 1 ? at(3) : null },
              { id: "which-axis", kind: "procedural", competency: TRANS, says: "The wrong mirror line was chosen. A reflection in the y-axis flips left and right; a reflection in the x-axis flips up and down.", predict: t === 0 ? at(1) : t === 1 ? at(0) : null },
              { id: "quarter-or-half", kind: "conceptual", competency: TRANS, says: "The size of the turn was misjudged. Draw a line from O to A and from O to A′: they make a right angle for a quarter turn and a straight line for a half turn.", predict: t === 4 ? at(3) : t === 3 ? at(4) : null },
              { id: "slide-or-flip", kind: "conceptual", competency: TRANS, says: "A slide was taken for a reflection. In a translation every point moves the same distance in the same direction, and the triangle is not flipped.", predict: t === 2 ? at(0) ?? at(1) : null },
            ]
          : [
              { id: "mirror-gives-turn", kind: "conceptual", competency: TRANS, says: "A reflection makes a pattern with line symmetry (it folds onto itself along the mirror line), not rotational symmetry.", predict: t === 0 || t === 1 ? at(3) : null },
              { id: "turn-gives-mirror", kind: "conceptual", competency: TRANS, says: "A half turn makes rotational symmetry of order 2 (the pattern fits onto itself after half a turn about O); it cannot be folded onto itself.", predict: t === 3 ? at(0) ?? at(1) : null },
              { id: "count-positions", kind: "procedural", competency: TRANS, says: "The four copies a quarter turn apart were taken as mirror images. Turn the pattern: it fits onto itself after every quarter turn, so it has rotational symmetry of order 4.", predict: t === 4 ? at(0) ?? at(1) : null },
              { id: "slide-gives-mirror", kind: "conceptual", competency: TRANS, says: "Copies made by sliding give translational symmetry (the strip fits onto itself after a slide), not a mirror line.", predict: t === 2 ? at(0) ?? at(1) : null },
            ];
      return list.filter((b) => b.predict !== null);
    },
    variants: () => [],
    explain: (s) =>
      s.id === "pick"
        ? `That is option ${"ABCD"[Number(s.value)]}, so the answer is ${"ABCD"[Number(s.value)]}`
        : s.id === "turned"
        ? s.value === "kept"
          ? "A, B, C go round in the same direction in both triangles: a slide or a turn, not a reflection"
          : "A, B, C go round in opposite directions: the triangle has been flipped, so it is a reflection"
        : s.id === "name"
          ? `So the transformation is ${s.value}`
          : s.id === "copies"
            ? `The pattern: triangle ABC and ${s.value}`
            : `So the pattern has ${s.value}`,
    domain: [[0, 9], [0, 4], [0, 1], [0, 3]],
    difficulty: ([, t, kind]) => (kind === 0 ? (t === 2 ? 1 : t === 4 ? 3 : 2) : t === 4 || t === 2 ? 3 : 2),
    // level@1: the TN Grade 7 chapter (symmetry through transformations, on a grid with all four quadrants)
    grade: () => 7,
    figure: (p) => tfFigure(p),
    word: ([s, t, kind, v]) =>
      kind === 0
        ? `A designer moves a triangle-shaped tile on a squared floor plan (shown in the picture) by sliding it, turning it about O or flipping it over: ABC is where it was and A′B′C′ is where it is now, after one such move. Which move was it?`
        : `For a rangoli on squared paper, ${nm(s + t + v)} draws a triangle and then ${MAKE[t]}. Which symmetry does the finished design have?`,
    teach: {
      idea: "Reflections, translations and rotations move a figure without changing its size or shape. A reflection flips it (the order of the corners reverses); a translation slides it; a rotation turns it about a point. A figure together with its images has the symmetry that made it.",
      method: "Follow the letters A, B, C: if they go round the other way, it is a reflection (find the mirror line halfway between each point and its image). If every point moved the same way, it is a translation. Otherwise join O to A and to A′: a straight line through O is a half turn, a right angle is a quarter turn.",
      visual: (p) => tfFigure(p),
      alternatives: [
        { id: "trace", title: "Trace and test", kind: "conceptual", text: ["Trace triangle ABC on thin paper.", "Try to slide it, turn it about O or flip it over a line until it lands on A′B′C′: the move that works is the transformation."] },
        { id: "symmetry-from-move", title: "The move gives the symmetry", kind: "procedural", text: ["A shape and its mirror image fold onto each other: line symmetry.", "A shape and its half turn: rotational symmetry of order 2; four quarter turns: order 4. Copies slid again and again: translational symmetry."] },
      ],
      caseOf: ([, , kind]) => (kind === 0 ? "which-transformation" : "which-symmetry"),
    },
    limits: "Ten scalene triangles; reflections in the axes, translations, and turns about O through 90° anticlockwise or 180°; reflections in other lines, other centres and drawing the image are not here (drawing is marked by an educator).",
  },
];
