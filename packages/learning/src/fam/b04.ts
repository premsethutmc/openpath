/**
 * families@2, batch b04 (Grades 1–5): perimeter of a shape and a missing side; hours, minutes and seconds; comparing
 * and ordering fractions; naming and building fractions; a fraction of a collection and of a measure; three-digit
 * addition and subtraction with regrouping; numbers to thousands (expanded form, making 1000, counting between);
 * estimating by rounding; reading bar charts; reading tally tables and two-way tables. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";
import { MT, gcd, near } from "../family-kit";

const PER = "MATH.measurement.perimeter-intro";
const TIME = "MATH.measurement.time-unit-conversion";
const FCMP = "MATH.number.fraction-comparison";
const FMOD = "MATH.number.fraction-models";
const FCOL = "MATH.number.fraction-of-collection";
const MDAS = "MATH.number.multi-digit-add-subtract";
const TH = "MATH.number.thousands";
const EST = "MATH.reasoning.estimate-check";
const BAR = "MATH.statistics.bar-charts";
const TAB = "MATH.statistics.tables";
const ADD = "MATH.number.addition";
const ADDR = "MATH.number.addition-regroup";
const SUBR = "MATH.number.subtraction-regroup";
const PV = "MATH.number.place-value-tens";
const UNIT = "MATH.number.unit-fractions";
const SHARE = "MATH.number.sharing";
const CLOCK = "MATH.measurement.clock";
const ROUND = "MATH.number.rounding";
const PICT = "MATH.statistics.pictographs";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Selvi", "Divya", "Imran", "Karthik", "Priya"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Indian grouping: 4,325 and 12,34,567. */
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
const fr = (a: number, b: number) => `${a}/${b}`;
const FRAC_WORD: Record<string, string> = { "1/2": "one-half", "1/4": "one-quarter", "3/4": "three-quarters", "1/3": "one-third" };
const frw = (a: number, b: number) => (FRAC_WORD[fr(a, b)] ? `${fr(a, b)} (${FRAC_WORD[fr(a, b)]})` : fr(a, b));
const digits = (n: number) => String(n).split("").map(Number);
/** Reads "a/b", "0.5" or "3" as a number (NaN when it is not one). */
const num = (t: string) => {
  const s = t.trim().replace(/−/g, "-");
  const m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};
const tupleNums = (v: Value) => (typeof v === "string" ? v.replace(/^\s*\(|\)\s*$/g, "").split(",").map(num) : []);

// ---------------------------------------------------------------- perimeter: side lengths of a closed shape

const SHAPE = ["", "", "", "triangle", "four-sided shape", "five-sided shape", "six-sided shape"];
/** The n side lengths (2–12 cm) chosen by a and t. */
const sidesOf = (n: number, a: number, t: number) => Array.from({ length: n }, (_, i) => 2 + ((a + i * (t + 2) + i * i * a) % 11));
const closes = (L: number[]) => Math.max(...L) < L.reduce((x, y) => x + y, 0) - Math.max(...L);
const rejectSides = ([n, a, t]: number[]) =>
  n < 3 || n > 6 || a < 2 || a > 9 || t < 0 || t > 5 ? "A shape with 3 to 6 sides, each 2 to 12 cm long." : !closes(sidesOf(n, a, t)) ? "These sides cannot close up into a shape (one side is longer than all the others together)." : null;
const cum = (L: number[]) => L.reduce<[number, number][]>((acc, l) => [...acc, [acc.length ? acc[acc.length - 1][1] : 0, (acc.length ? acc[acc.length - 1][1] : 0) + l]], []);

// ---------------------------------------------------------------- fractions to compare

/** mode 0: x/k and y/k (same bottom number); mode 1: k/x and k/y (same top number). */
const pairOf = (mode: number, k: number, x: number): [number, number] => (mode === 0 ? [x, k] : [k, x]);
const properFor = (mode: number, k: number, xs: number[]) =>
  mode === 0 ? k >= 2 && k <= 12 && xs.every((x) => x >= 1 && x < k) : k >= 1 && k <= 11 && xs.every((x) => x > k && x <= 12);
const fracGrid = (a: number, b: number): Visual => ({ type: "grid", rows: 1, cols: b, shaded: a });

// ---------------------------------------------------------------- measures for a fraction of a whole

const WHOLES = [
  { of: "an hour", tot: 60, unit: "minutes", ask: (f: string) => `How many minutes are there in ${f} of an hour?`, word: (f: string, k: number) => `${nm(k)}'s music class lasts ${f} of an hour. How many minutes long is the class?` },
  { of: "₹100", tot: 100, unit: "rupees", ask: (f: string) => `What is ${f} of ₹100? Give the answer in rupees.`, word: (f: string, k: number) => `${nm(k)} had ₹100 and spent ${f} of it on a book. How many rupees did the book cost?` },
  { of: "a metre", tot: 100, unit: "centimetres", ask: (f: string) => `How many centimetres are there in ${f} of a metre?`, word: (f: string, k: number) => `${nm(k)} cuts ${f} of a metre of ribbon for a gift. How many centimetres of ribbon is that?` },
  { of: "a kilogram", tot: 1000, unit: "grams", ask: (f: string) => `How many grams are there in ${f} of a kilogram?`, word: (f: string, k: number) => `Amma buys ${f} kg of dal. How many grams of dal is that?` },
  { of: "a day", tot: 24, unit: "hours", ask: (f: string) => `How many hours are there in ${f} of a day?`, word: (f: string, k: number) => `A water pump at ${nm(k)}'s farm runs for ${f} of a day. How many hours does the pump run?` },
];

// ---------------------------------------------------------------- column arithmetic

const colAdd = (a: number, b: number) => {
  const [ah, at, ao] = digits(a);
  const [bh, bt, bo] = digits(b);
  const o = ao + bo;
  const c1 = o >= 10 ? 1 : 0;
  const t = at + bt + c1;
  const c2 = t >= 10 ? 1 : 0;
  return { o, c1, t, c2, h: ah + bh + c2, ah, at, ao, bh, bt, bo };
};
const colSub = (a: number, b: number) => {
  const [ah, at, ao] = digits(a);
  const [bh, bt, bo] = digits(b);
  const b1 = ao < bo ? 1 : 0;
  const t = at - b1;
  const b2 = t < bt ? 1 : 0;
  return { o: ao + 10 * b1 - bo, b1, t: t + 10 * b2 - bt, b2, h: ah - b2 - bh, ah, at, ao, bh, bt, bo };
};

// ---------------------------------------------------------------- data contexts

const BARCTX = [
  { title: "the fruit children in Class 3 like best", labels: ["Mango", "Banana", "Guava", "Apple"], q: (l: string) => `How many children like ${l} best?`, unit: "children", more: (x: string, y: string) => `How many more children like ${x} than ${y}?` },
  { title: "the books four friends read in June", labels: ["Anu", "Ravi", "Meena", "Imran"], q: (l: string) => `How many books did ${l} read?`, unit: "books", more: (x: string, y: string) => `How many more books did ${x} read than ${y}?` },
  { title: "the birds seen in a school garden one morning", labels: ["Crow", "Sparrow", "Parrot", "Myna"], q: (l: string) => `How many ${l === "Sparrow" ? "sparrows" : `${l.toLowerCase()}s`} were seen?`, unit: "birds", more: (x: string, y: string) => `How many more ${x.toLowerCase()}s than ${y.toLowerCase()}s were seen?` },
  { title: "the vehicles that passed a school gate in ten minutes", labels: ["Bus", "Car", "Auto", "Cycle"], q: (l: string) => `How many ${l === "Bus" ? "buses" : `${l.toLowerCase()}s`} passed?`, unit: "vehicles", more: (x: string, y: string) => `How many more ${x === "Bus" ? "buses" : `${x.toLowerCase()}s`} than ${y === "Bus" ? "buses" : `${y.toLowerCase()}s`} passed?` },
];
/** A fixed, well-mixed hash (FNV-1a, then the murmur3 finalizer): every seed gives its own chart or table (distinct@1). */
const hm = (str: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const barValues = (c: number, s: number, sc: number) => [0, 1, 2, 3].map((i) => (2 + (hm(`bar${c}:${s}:${i}`) % 9)) * (sc ? 5 : 1));
const distinct = (v: number[]) => new Set(v).size === v.length;

const TALLYCTX = [
  { head: "Fruit", items: ["Mango", "Banana", "Guava"], who: "children chose", what: "fruit" },
  { head: "Colour", items: ["Red", "Blue", "Green"], who: "children chose", what: "colour" },
  { head: "Game", items: ["Kabaddi", "Kho-kho", "Cricket"], who: "children chose", what: "game" },
  { head: "Flower", items: ["Jasmine", "Rose", "Marigold"], who: "children chose", what: "flower" },
];
const BUNDLE = "||||/";
const tallyCounts = (c: number, s: number) => [0, 1, 2].map((i) => 3 + (hm(`tally:${c}:${s}:${i}`) % 15));
const tally = (n: number) => [...Array(Math.floor(n / 5)).fill(BUNDLE), ...(n % 5 ? ["|".repeat(n % 5)] : [])].join(" ");
/** Count the marks drawn: a bundle is five, a stroke is one (independent of the numbers that made them). */
const readTally = (t: string) => [...t].reduce((s, ch) => s + (ch === "|" || ch === "/" ? 1 : 0), 0);

const TWOCTX = [
  { topic: "which game the boys and girls of a class chose", rows: ["Boys", "Girls"], cols: ["Kabaddi", "Kho-kho"], one: ["boy", "girl"], many: ["boys", "girls"], did1: ["chose kabaddi", "chose kho-kho"], didN: ["chose kabaddi", "chose kho-kho"] },
  { topic: "what children in two classes chose for breakfast", rows: ["Class 3A", "Class 3B"], cols: ["Idli", "Dosa"], one: ["child in Class 3A", "child in Class 3B"], many: ["children in Class 3A", "children in Class 3B"], did1: ["chose idli", "chose dosa"], didN: ["chose idli", "chose dosa"] },
  { topic: "how the boys and girls of a class come to school", rows: ["Boys", "Girls"], cols: ["Walk", "By bus"], one: ["boy", "girl"], many: ["boys", "girls"], did1: ["walks to school", "comes by bus"], didN: ["walk to school", "come by bus"] },
];
/** "3 boys walk to school", "1 girl comes by bus". */
const who = (C: (typeof TWOCTX)[number], row: number, n: number) => `${n} ${n === 1 ? C.one[row] : C.many[row]}`;
const did = (C: (typeof TWOCTX)[number], col: number, n: number) => (n === 1 ? C.did1[col] : C.didN[col]);
/** The 3 × 3 numbers of a two-way table: rows, then the totals row; each row ends with its total. */
const twoWay = (a: number, b: number, c: number, d: number) => [
  [a, b, a + b],
  [c, d, c + d],
  [a + c, b + d, a + b + c + d],
];

export const B04: Def[] = [
  // ============================================================ perimeter
  {
    id: "adperim",
    arity: 3,
    title: "The perimeter of a shape from its side lengths",
    competency: PER,
    type: "integer",
    mc: true,
    parse: none,
    reject: rejectSides,
    prompt: ([n, a, t]) => `Find the perimeter of the ${SHAPE[n]} in the picture. The length of each side is marked (the picture is not drawn to scale). Give the answer in cm.`,
    solve: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      return { steps: [{ id: "sum", op: "add", competency: PER, inputs: L, value: L.reduce((x, y) => x + y, 0) }], answer: L.reduce((x, y) => x + y, 0) };
    },
    // independent: walk once round the boundary, one centimetre at a time
    validate: ([n, a, t], v) => {
      let c = 0;
      for (const side of sidesOf(n, a, t)) for (let i = 0; i < side; i++) c++;
      return v === c;
    },
    bugs: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      const P = L.reduce((x, y) => x + y, 0);
      return [
        { id: "missed-side", kind: "procedural", competency: PER, says: "One side was left out. Tick each side as you add it, and go all the way round.", predict: [...new Set(L.map((l) => P - l))] },
        { id: "side-twice", kind: "procedural", competency: PER, says: "One side was added twice. Start at one corner and stop when you are back at it.", predict: P + L[0] },
        ...(n === 4 ? [{ id: "multiplied-sides", kind: "conceptual", competency: PER, says: "Two sides were multiplied, as for the space inside. The perimeter is the distance around the edge: add all the sides.", predict: L[0] * L[1] } as Bug] : []),
        ...(P >= 20 ? [{ id: "lost-ten", kind: "recall", competency: ADD, says: "A ten was lost while adding the lengths. Add the sides one at a time and check each step.", predict: P - 10 } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => `Add every side: ${s.inputs.join(" + ")} = ${s.value} cm`,
    figure: ([n, a, t]) => ({ type: "shape", sides: n, lengths: sidesOf(n, a, t).map((l) => `${l} cm`), name: SHAPE[n] }),
    domain: [[3, 6], [2, 9], [0, 5]],
    difficulty: ([n, a, t]) => {
      const P = sidesOf(n, a, t).reduce((x, y) => x + y, 0);
      return n === 3 && P <= 20 ? 1 : P <= 35 ? 2 : 3;
    },
    word: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      return `A flower bed has ${n} straight sides, ${L.slice(0, -1).join(" m, ")} m and ${L[L.length - 1]} m long. ${nm(a + t)} walks once around its edge. How many metres does ${nm(a + t)} walk?`;
    },
    teach: {
      idea: "The perimeter is the length of the boundary: the distance all the way around a shape.",
      method: "Start at one corner. Add the length of each side in turn, ticking it, until you are back where you started.",
      visual: ([n, a, t]) => ({ type: "shape", sides: n, lengths: sidesOf(n, a, t).map((l) => `${l} cm`) }),
      alternatives: [
        { id: "string", title: "Straighten the boundary", kind: "conceptual", text: ["Imagine a string laid along every side of the shape, then pulled straight.", "Its length is the perimeter: one jump on the number line for each side."], visual: ([n, a, t]) => ({ type: "numberline", from: 0, to: sidesOf(n, a, t).reduce((x, y) => x + y, 0), jumps: cum(sidesOf(n, a, t)) }) },
      ],
    },
    limits: "Shapes with 3 to 6 straight sides of 2 to 12 cm, all marked; measuring with a ruler and drawing on a dot grid are done in class.",
  },
  {
    id: "admper",
    arity: 3,
    title: "A missing side from the perimeter",
    competency: PER,
    type: "integer",
    mc: true,
    parse: none,
    reject: rejectSides,
    prompt: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      return `The perimeter of the ${SHAPE[n]} in the picture is ${L.reduce((x, y) => x + y, 0)} cm. One side is marked ?. How long is that side, in cm?`;
    },
    solve: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      const P = L.reduce((x, y) => x + y, 0);
      const known = L.slice(0, -1);
      const k = known.reduce((x, y) => x + y, 0);
      return {
        steps: [
          { id: "known", op: "add", competency: PER, inputs: known, value: k },
          { id: "rest", op: "subtract", competency: PER, inputs: [P, k], value: P - k },
        ],
        answer: P - k,
      };
    },
    // independent: put the answer in as the last side and walk round: the total must be the perimeter
    validate: ([n, a, t], v) => {
      if (typeof v !== "number" || v <= 0) return false;
      const L = sidesOf(n, a, t);
      let c = 0;
      for (const side of [...L.slice(0, -1), v]) for (let i = 0; i < side; i++) c++;
      return c === L.reduce((x, y) => x + y, 0);
    },
    bugs: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      const P = L.reduce((x, y) => x + y, 0);
      const k = P - L[n - 1];
      return [
        { id: "added-perimeter", kind: "conceptual", competency: PER, says: "The perimeter was added to the other sides. The perimeter is already the whole way round, so take the known sides away from it.", predict: P + k },
        { id: "known-sum", kind: "procedural", competency: PER, says: "The known sides were added, but the total was not taken away from the perimeter.", predict: k },
        { id: "one-side-taken", kind: "procedural", competency: PER, says: "Only one known side was taken away from the perimeter. Take away every side you know.", predict: P - L[0] },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "known" ? `The sides you know: ${s.inputs.join(" + ")} = ${s.value} cm` : `The missing side is what is left of the perimeter: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value} cm`),
    figure: ([n, a, t]) => ({ type: "shape", sides: n, lengths: [...sidesOf(n, a, t).slice(0, -1).map((l) => `${l} cm`), "?"], name: SHAPE[n] }),
    domain: [[3, 6], [2, 9], [0, 5]],
    difficulty: ([n]) => (n === 3 ? 1 : n <= 4 ? 2 : 3),
    word: ([n, a, t]) => {
      const L = sidesOf(n, a, t);
      return `${nm(a)} uses a lace exactly ${L.reduce((x, y) => x + y, 0)} cm long to go once around the edge of a card with ${n} sides. ${n - 1} of the sides are ${L.slice(0, -2).join(" cm, ")}${n > 3 ? " cm" : " cm"} and ${L[n - 2]} cm long. How long is the last side, in cm?`;
    },
    teach: {
      idea: "The perimeter is all the sides added together, so the missing side is what is left when the known sides are taken away.",
      method: "Add the sides you know. Take that total away from the perimeter. Check: all the sides together should make the perimeter.",
      visual: ([n, a, t]) => ({ type: "shape", sides: n, lengths: [...sidesOf(n, a, t).slice(0, -1).map((l) => `${l} cm`), "?"] }),
      alternatives: [
        { id: "count_on", title: "Count on to the perimeter", kind: "conceptual", text: ["Jump along a number line by each known side.", "The last jump, up to the perimeter, is the missing side."], visual: ([n, a, t]) => ({ type: "numberline", from: 0, to: sidesOf(n, a, t).reduce((x, y) => x + y, 0), jumps: cum(sidesOf(n, a, t)) }) },
      ],
    },
    limits: "One missing side of a shape with 3 to 6 sides of 2 to 12 cm; rectangles and squares with only two sides marked are another family.",
  },

  // ============================================================ time units
  {
    id: "adhmin",
    arity: 2,
    title: "Hours and minutes into minutes",
    competency: TIME,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.toLowerCase().match(/^(\d)\s*h(?:ours?)?\s*(\d{1,2})\s*m(?:in(?:ute)?s?)?\s*=?\s*\?\s*(?:min(?:ute)?s?)?$/);
      return m && Number(m[2]) % 5 === 0 ? [Number(m[1]), Number(m[2]) / 5] : null;
    },
    reject: ([h, f]) => (h < 1 || h > 8 || f < 0 || f > 11 ? "1 to 8 hours and a whole number of 5 minutes under an hour." : null),
    prompt: ([h, f]) => `How many minutes are there in ${pl(h, "hour")}${f ? ` ${f * 5} minutes` : ""}?`,
    solve: ([h, f]) => ({
      steps: [
        { id: "hours", op: "multiply", competency: MT, inputs: [h, 60], value: 60 * h },
        { id: "add", op: "add", competency: TIME, inputs: [60 * h, 5 * f], value: 60 * h + 5 * f },
      ],
      answer: 60 * h + 5 * f,
    }),
    // independent: take the extra minutes off and count how many whole hours of 60 are left
    validate: ([h, f], v) => {
      if (typeof v !== "number") return false;
      let r = v - 5 * f;
      let n = 0;
      while (r >= 60) {
        r -= 60;
        n++;
      }
      return r === 0 && n === h;
    },
    bugs: ([h, f]) => [
      { id: "hour-as-100", kind: "conceptual", competency: TIME, says: "An hour was taken as 100 minutes, as if time were counted in hundreds. An hour has 60 minutes.", predict: 100 * h + 5 * f },
      ...(f ? [{ id: "minutes-left-out", kind: "procedural", competency: TIME, says: `The hours were changed to minutes, but the extra ${f * 5} minutes were not added.`, predict: 60 * h } as Bug] : []),
      { id: "not-converted", kind: "conceptual", competency: TIME, says: "The hours and minutes were added as they are. Hours must first be changed to minutes: 1 hour = 60 minutes.", predict: h + 5 * f },
    ],
    variants: () => [],
    explain: (s) => (s.id === "hours" ? `${pl(Number(s.inputs[0]), "hour")} = ${s.inputs[0]} × 60 = ${s.value} minutes` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} minutes`),
    domain: [[1, 8], [0, 11]],
    difficulty: ([h, f]) => (h <= 2 && f % 3 === 0 ? 1 : h <= 4 ? 2 : 3),
    word: ([h, f]) => `A bus journey takes ${pl(h, "hour")}${f ? ` and ${f * 5} minutes` : ""}. How many minutes is the journey?`,
    teach: {
      idea: "1 hour is 60 minutes: the minute hand goes once all the way round the clock.",
      method: "Change the hours to minutes (60 for each hour), then add the extra minutes.",
      visual: ([h, f]) => ({ type: "numberline", from: 0, to: 60 * h + 5 * f, step: 60, jumps: [...Array.from({ length: h }, (_, i) => [60 * i, 60 * (i + 1)] as [number, number]), ...(f ? [[60 * h, 60 * h + 5 * f] as [number, number]] : [])] }),
      alternatives: [
        { id: "clock_round", title: "Once round the clock", kind: "conceptual", text: ["Each time the minute hand goes all the way round, 60 minutes pass and the hour hand moves to the next number.", "Count 60, 120, 180 … for the hours, then count on the extra minutes."], visual: ([, f]) => ({ type: "clock", h: 12, m: (5 * f) % 60 }) },
      ],
    },
    limits: "Whole hours (1–8) and multiples of 5 minutes; seconds and adding durations are in other families.",
  },
  {
    id: "adm2h",
    arity: 2,
    title: "Minutes into hours and minutes",
    competency: TIME,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([h, f]) => (h < 1 || h > 8 || f < 0 || f > 11 ? "60 to 535 minutes, in steps of 5." : null),
    prompt: ([h, f]) => `Write ${60 * h + 5 * f} minutes in hours and minutes. Write the answer as (hours, minutes), for example (1, 20).`,
    solve: ([h, f]) => ({
      steps: [
        { id: "hours", op: "divide", competency: TIME, inputs: [60 * h + 5 * f, 60], value: h },
        { id: "left", op: "subtract", competency: TIME, inputs: [60 * h + 5 * f, 60 * h], value: 5 * f },
      ],
      answer: `(${h}, ${5 * f})`,
    }),
    // independent: the minutes must be under 60, and the hours and minutes must make the total again
    validate: ([h, f], v) => {
      const t = tupleNums(v);
      return t.length === 2 && Number.isInteger(t[0]) && Number.isInteger(t[1]) && t[1] >= 0 && t[1] < 60 && 60 * t[0] + t[1] === 60 * h + 5 * f;
    },
    bugs: ([h, f]) => {
      const T = 60 * h + 5 * f;
      return [
        ...(T >= 100 ? [{ id: "hour-as-100", kind: "conceptual", competency: TIME, says: "The minutes were split into hundreds, as if an hour were 100 minutes. An hour has 60 minutes.", predict: `(${Math.floor(T / 100)}, ${T % 100})` } as Bug] : []),
        ...(h >= 2 ? [{ id: "hour-left-in", kind: "procedural", competency: TIME, says: `Not every hour was taken out: ${5 * f + 60} minutes is still ${f ? "more than" : "exactly"} an hour, so it makes one more hour.`, predict: `(${h - 1}, ${5 * f + 60})` } as Bug] : []),
        { id: "minutes-as-hours", kind: "conceptual", competency: TIME, says: "The number of minutes was written as hours. Change minutes to hours by making groups of 60.", predict: `(${T}, 0)` },
      ];
    },
    distractors: ([h, f]) => [`(${h + 1}, ${5 * f})`, `(${h}, ${(5 * f + 10) % 60})`, `(${h - 1}, ${5 * f})`],
    variants: () => [],
    explain: (s) => (s.id === "hours" ? `${s.inputs[0]} minutes holds ${pl(Number(s.value), "group")} of 60 minutes: ${pl(Number(s.value), "hour")}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} minutes left over`),
    domain: [[1, 8], [0, 11]],
    difficulty: ([h, f]) => (h === 1 ? 1 : h <= 3 || f === 0 ? 2 : 3),
    word: ([h, f]) => `${h <= 3 ? "A Tamil film lasts" : "A train journey from Chennai to Madurai takes"} ${60 * h + 5 * f} minutes. How long is it in hours and minutes? Write (hours, minutes).`,
    teach: {
      idea: "Every 60 minutes make 1 hour. The minutes left over, fewer than 60, stay as minutes.",
      method: "Take away 60 minutes as many times as you can. Count the 60s: that is the hours. What is left is the minutes.",
      visual: ([h, f]) => ({ type: "numberline", from: 0, to: 60 * h + 5 * f, step: 60, jumps: Array.from({ length: h }, (_, i) => [60 * i, 60 * (i + 1)] as [number, number]) }),
      alternatives: [
        { id: "table", title: "Use the 60 times table", kind: "procedural", text: ["Say 60, 120, 180, 240 … and stop before you pass the number of minutes.", "The count of 60s is the hours; the difference to the total is the minutes."] },
      ],
    },
    limits: "60 to 535 minutes in steps of 5; seconds are in another family.",
  },
  {
    id: "adsec",
    arity: 2,
    title: "Minutes and seconds into seconds",
    competency: TIME,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([m, f]) => (m < 1 || m > 9 || f < 0 || f > 11 ? "1 to 9 minutes and a whole number of 5 seconds under a minute." : null),
    prompt: ([m, f]) => `How many seconds are there in ${pl(m, "minute")}${f ? ` ${f * 5} seconds` : ""}?`,
    solve: ([m, f]) => ({
      steps: [
        { id: "minutes", op: "multiply", competency: MT, inputs: [m, 60], value: 60 * m },
        { id: "add", op: "add", competency: TIME, inputs: [60 * m, 5 * f], value: 60 * m + 5 * f },
      ],
      answer: 60 * m + 5 * f,
    }),
    // independent: count up in steps of 5 seconds, ticking a new minute at every 60
    validate: ([m, f], v) => {
      let s = 0;
      let mins = 0;
      let rest = 0;
      while (mins < m || rest < 5 * f) {
        s += 5;
        if (mins < m) {
          rest += 5;
          if (rest === 60) {
            mins++;
            rest = 0;
          }
        } else rest += 5;
      }
      return v === s;
    },
    bugs: ([m, f]) => [
      { id: "minute-as-100", kind: "conceptual", competency: TIME, says: "A minute was taken as 100 seconds. A minute has 60 seconds.", predict: 100 * m + 5 * f },
      ...(f ? [{ id: "seconds-left-out", kind: "procedural", competency: TIME, says: `The minutes were changed to seconds, but the extra ${f * 5} seconds were not added.`, predict: 60 * m } as Bug] : []),
      { id: "not-converted", kind: "conceptual", competency: TIME, says: "The minutes and seconds were added as they are. Change the minutes to seconds first: 1 minute = 60 seconds.", predict: m + 5 * f },
    ],
    variants: () => [],
    explain: (s) => (s.id === "minutes" ? `${pl(Number(s.inputs[0]), "minute")} = ${s.inputs[0]} × 60 = ${s.value} seconds` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} seconds`),
    domain: [[1, 9], [0, 11]],
    difficulty: ([m, f]) => (m <= 2 && f % 6 === 0 ? 1 : m <= 4 ? 2 : 3),
    word: ([m, f]) => `${nm(m + f)} ran once around the school ground in ${pl(m, "minute")}${f ? ` and ${f * 5} seconds` : ""}. How many seconds did ${nm(m + f)} take?`,
    teach: {
      idea: "1 minute is 60 seconds: the seconds hand goes once round the clock in a minute.",
      method: "Change the minutes to seconds (60 for each minute), then add the extra seconds.",
      visual: ([m, f]) => ({ type: "numberline", from: 0, to: 60 * m + 5 * f, step: 60, jumps: [...Array.from({ length: m }, (_, i) => [60 * i, 60 * (i + 1)] as [number, number]), ...(f ? [[60 * m, 60 * m + 5 * f] as [number, number]] : [])] }),
      alternatives: [
        { id: "same_as_hours", title: "Just like hours and minutes", kind: "conceptual", text: ["Minutes and seconds work the same way as hours and minutes: 60 of the small unit make one of the big unit.", "So 2 minutes 10 seconds = 60 + 60 + 10 seconds."] },
      ],
    },
    limits: "1 to 9 minutes and multiples of 5 seconds; comparing race times is in another family.",
  },

  // ============================================================ comparing fractions
  {
    id: "adfcmp",
    arity: 5,
    title: "Comparing two fractions with the same bottom or top number",
    competency: FCMP,
    type: "fraction",
    parse: none,
    reject: ([mode, k, x, y, ask]) => (mode < 0 || mode > 1 || ask < 0 || ask > 1 || x === y || !properFor(mode, k, [x, y]) ? "Two different fractions less than 1 that share a bottom number (up to 12) or a top number." : null),
    prompt: ([mode, k, x, y, ask]) => {
      const [a, b] = pairOf(mode, k, x);
      const [c, d] = pairOf(mode, k, y);
      return `Which fraction is ${ask ? "smaller" : "greater"}: ${frw(a, b)} or ${frw(c, d)}? Write that fraction.`;
    },
    solve: ([mode, k, x, y, ask]) => {
      const [a, b] = pairOf(mode, k, x);
      const [c, d] = pairOf(mode, k, y);
      const first = a / b > c / d === !ask;
      return {
        steps: [{ id: "compare", op: "compare", competency: FCMP, inputs: [fr(a, b), fr(c, d), mode], value: first ? a / b : c / d, justification: { rule: "comparison" as const, left: fr(a, b), right: fr(c, d), relation: (a / b > c / d ? ">" : a / b < c / d ? "<" : "=") as "<" | ">" | "=" } }],
        answer: first ? a / b : c / d,
      };
    },
    // independent: the answer must be one of the two fractions, and cross-multiplying must put it on the asked side
    validate: ([mode, k, x, y, ask], v) => {
      if (typeof v !== "number") return false;
      const A = pairOf(mode, k, x);
      const B = pairOf(mode, k, y);
      const [m, o] = near(v * A[1], A[0]) ? [A, B] : near(v * B[1], B[0]) ? [B, A] : [null, null];
      if (!m || !o) return false;
      const l = m[0] * o[1];
      const r = o[0] * m[1];
      return ask ? l < r : l > r;
    },
    bugs: ([mode, k, x, y, ask]) => {
      const A = pairOf(mode, k, x);
      const B = pairOf(mode, k, y);
      const right = A[0] / A[1] > B[0] / B[1] === !ask ? A : B;
      const other = right === A ? B : A;
      return mode === 1
        ? [{ id: "bigger-bottom-bigger", kind: "conceptual", competency: UNIT, says: `The fraction with the ${ask ? "smaller" : "bigger"} bottom number was chosen as ${ask ? "smaller" : "greater"}. A bigger bottom number means the whole is cut into more parts, so each part is smaller.`, predict: other[0] / other[1] }]
        : [{ id: "more-parts-wrong-way", kind: "procedural", competency: FCMP, says: `Both fractions count parts of the same size (a whole cut into ${k} equal parts), so the one with more parts is greater. The ${ask ? "smaller" : "greater"} one was mixed up.`, predict: other[0] / other[1] }];
    },
    variants: () => [],
    explain: (s) =>
      Number(s.inputs[2]) === 1
        ? `Both have the same number of parts on top. The bottom number tells how many equal parts the whole is cut into: more parts are smaller parts. So ${s.inputs[0]} and ${s.inputs[1]} compare the other way to their bottom numbers.`
        : `Both are counted in the same size of part, so compare the top numbers: more parts is more.`,
    domain: [[0, 1], [1, 12], [1, 12], [1, 12], [0, 1]],
    // fractions already in their simplest form, so the answer is written as the learner sees it
    keep: ([mode, k, x, y]) => gcd(k, x) === 1 && gcd(k, y) === 1,
    cap: 500,
    difficulty: ([mode, k]) => (mode === 1 && k === 1 ? 1 : mode === 0 && k <= 6 ? 1 : mode === 0 ? 2 : 3),
    word: ([mode, k, x, y, ask]) =>
      mode === 1
        ? k === 1
          ? `One roti is shared equally among ${x} children. Another roti of the same size is shared equally among ${y} children. Is ${fr(1, x)} or ${fr(1, y)} of a roti the ${ask ? "smaller" : "bigger"} share? Write that fraction.`
          : `${nm(x + y)} ate ${fr(k, x)} of a cake and ${nm(x + y + 1)} ate ${fr(k, y)} of another cake of the same size. Write the fraction eaten by the one who ate ${ask ? "less" : "more"}.`
        : `A ribbon is cut into ${k} equal pieces. ${nm(x + y)} takes ${pl(x, "piece")} and ${nm(x + y + 1)} takes ${pl(y, "piece")}. Write the fraction of the ribbon held by the one with ${ask ? "less" : "more"} ribbon.`,
    teach: {
      idea: "Same bottom number: the parts are the same size, so more parts is more. Same top number: the same number of parts, but a bigger bottom number cuts the whole into more, smaller parts.",
      method: "Look at which number is the same. If the bottoms match, compare the tops. If the tops match, the smaller bottom number gives the greater fraction.",
      visual: ([mode, k, x]) => fracGrid(...pairOf(mode, k, x)),
      alternatives: [
        { id: "draw_both", title: "Shade both in the same whole", kind: "conceptual", text: ["Draw two strips of the same length. Cut one into the first fraction's parts and the other into the second's, and shade.", "The longer shaded part is the greater fraction."], visual: ([mode, k, y]) => fracGrid(...pairOf(mode, k, y)) },
        { id: "sharing", title: "More sharers, smaller shares", kind: "conceptual", text: ["Share one roti among 2 children, then another among 4.", "With more children each piece is smaller: 1/4 is less than 1/2."], visual: () => fracGrid(1, 4) },
      ],
    },
    limits: "Two fractions less than 1 with the same bottom number or the same top number (up to twelfths); unlike fractions are compared in a later family.",
  },
  {
    id: "adford",
    arity: 5,
    title: "Ordering three fractions with the same bottom or top number",
    competency: FCMP,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([mode, k, x, y, z]) => (mode < 0 || mode > 1 || new Set([x, y, z]).size !== 3 || !properFor(mode, k, [x, y, z]) ? "Three different fractions less than 1 that share a bottom number (up to 12) or a top number." : null),
    keep: ([mode, k, x, y, z]) => {
      const v = [x, y, z].map((w) => { const [a, b] = pairOf(mode, k, w); return a / b; });
      return !(v[0] < v[1] && v[1] < v[2]);
    },
    prompt: ([mode, k, x, y, z]) => `Write these fractions in order from the smallest to the largest: ${[x, y, z].map((w) => fr(...pairOf(mode, k, w))).join(", ")}. Write them in brackets, separated by commas.`,
    solve: ([mode, k, x, y, z]) => {
      const f = [x, y, z].map((w) => pairOf(mode, k, w)).sort((p, q) => p[0] / p[1] - q[0] / q[1]);
      const ans = `(${f.map(([a, b]) => fr(a, b)).join(", ")})`;
      return { steps: [{ id: "order", op: "order", competency: FCMP, inputs: [x, y, z, mode], value: ans }], answer: ans };
    },
    // independent: the list must hold exactly the three fractions, each smaller than the next by cross-multiplying
    validate: ([mode, k, x, y, z], v) => {
      if (typeof v !== "string") return false;
      const t = tupleNums(v);
      if (t.length !== 3 || t.some((q) => !Number.isFinite(q))) return false;
      const given = [x, y, z].map((w) => pairOf(mode, k, w));
      const used = t.map((q) => given.findIndex(([a, b]) => near(q * b, a)));
      if (used.some((i) => i < 0) || new Set(used).size !== 3) return false;
      for (let i = 0; i < 2; i++) {
        const [a, b] = given[used[i]];
        const [c, d] = given[used[i + 1]];
        if (!(a * d < c * b)) return false;
      }
      return true;
    },
    bugs: ([mode, k, x, y, z]) => {
      const f = [x, y, z].map((w) => pairOf(mode, k, w));
      const asc = [...f].sort((p, q) => p[0] / p[1] - q[0] / q[1]);
      const list = (g: [number, number][]) => `(${g.map(([a, b]) => fr(a, b)).join(", ")})`;
      return [
        mode === 1
          ? { id: "bigger-bottom-bigger", kind: "conceptual", competency: UNIT, says: "The fractions were put in order of their bottom numbers. With the same top number, a bigger bottom number means smaller parts, so the order goes the other way.", predict: list([...asc].reverse()) }
          : { id: "largest-first", kind: "procedural", competency: FCMP, says: "The fractions were put from the largest to the smallest. The question asks for the smallest first.", predict: list([...asc].reverse()) },
        { id: "as-given", kind: "procedural", competency: FCMP, says: "The fractions were written in the order they were given. Compare them first, then write the smallest one first.", predict: list(f) },
      ];
    },
    distractors: ([mode, k, x, y, z]) => {
      const f = [x, y, z].map((w) => pairOf(mode, k, w)).sort((p, q) => p[0] / p[1] - q[0] / q[1]);
      const list = (g: [number, number][]) => `(${g.map(([a, b]) => fr(a, b)).join(", ")})`;
      return [list([f[1], f[0], f[2]]), list([f[0], f[2], f[1]]), list([f[2], f[0], f[1]])];
    },
    variants: () => [],
    explain: (s) => (Number(s.inputs[3]) === 1 ? `Same top number: the bigger the bottom number, the smaller the fraction. Smallest to largest: ${s.value}` : `Same bottom number: order by the top numbers. Smallest to largest: ${s.value}`),
    domain: [[0, 1], [1, 12], [1, 12], [1, 12], [1, 12]],
    cap: 400,
    difficulty: ([mode, k]) => (mode === 0 && k <= 8 ? 1 : mode === 0 ? 2 : k === 1 ? 2 : 3),
    word: ([mode, k, x, y, z]) =>
      mode === 0
        ? `A cake is cut into ${k} equal pieces. ${nm(x + y + z)} eats ${pl(x, "piece")}, ${nm(x + y + z + 1)} eats ${pl(y, "piece")} and ${nm(x + y + z + 2)} eats ${pl(z, "piece")}. Write the fractions of the cake they ate, ${fr(x, k)}, ${fr(y, k)} and ${fr(z, k)}, from the smallest to the largest, in brackets.`
        : `Three cakes of the same size are cut into ${x}, ${y} and ${z} equal pieces. ${nm(k)} takes ${pl(k, "piece")} from each, so ${fr(k, x)}, ${fr(k, y)} and ${fr(k, z)} of a cake. Write these from the smallest to the largest, in brackets.`,
    teach: {
      idea: "With the same bottom number the parts are the same size, so order by the top numbers. With the same top number, a bigger bottom number means smaller parts.",
      method: "Find the smallest fraction and write it first, then the next, then the largest. Check each one is smaller than the next.",
      visual: ([mode, k, x]) => fracGrid(...pairOf(mode, k, x)),
      alternatives: [
        { id: "strips", title: "Line up fraction strips", kind: "conceptual", text: ["Shade each fraction on a strip of the same length, one under another.", "Read the shaded lengths from the shortest to the longest."], visual: ([mode, k, , y]) => fracGrid(...pairOf(mode, k, y)) },
      ],
    },
    limits: "Three fractions less than 1 with a common bottom or common top number; unlike fractions are ordered in a later family.",
  },

  // ============================================================ fraction models
  {
    id: "adfname",
    arity: 3,
    title: "Naming the shaded fraction of a shape",
    competency: FMOD,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([r, c, s]) => (r < 1 || r > 5 || c < 2 || c > 10 || r * c > 20 || s < 1 || s >= r * c ? "A grid of up to 20 equal squares with some, but not all, shaded." : null),
    // shaded fractions already in their simplest form (2 of 4 squares is the same as 1/2, which the answer would show)
    keep: ([r, c, s]) => gcd(s, r * c) === 1,
    prompt: () => `What fraction of the shape in the picture is shaded? All the small squares are the same size.`,
    solve: ([r, c, s]) => ({
      steps: [
        { id: "parts", op: "count", competency: FMOD, inputs: [r, c], value: r * c, justification: { rule: "product-counting" as const, what: "total equal parts in the shape", factors: [r, c] } },
        { id: "name", op: "evaluate", competency: FMOD, inputs: [s, r * c], value: s / (r * c), justification: { rule: "arithmetic-fact" as const, operation: `${s} shaded out of ${r * c} total`, supports: "fraction-naming" } },
      ],
      answer: s / (r * c),
    }),
    // independent: count the shaded squares cell by cell; the answer times the number of cells must be that count
    validate: ([r, c, s], v) => {
      if (typeof v !== "number") return false;
      let all = 0;
      let on = 0;
      for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
        if (all < s) on++;
        all++;
      }
      return near(v * all, on);
    },
    bugs: ([r, c, s]) => {
      const t = r * c;
      return [
        { id: "shaded-to-unshaded", kind: "conceptual", competency: FMOD, says: "The shaded squares were put over the unshaded ones. The bottom number is ALL the equal parts of the whole.", predict: s / (t - s) },
        { id: "unshaded", kind: "procedural", competency: FMOD, says: "The unshaded squares were counted. The question asks about the shaded part.", predict: (t - s) / t },
        { id: "count-only", kind: "conceptual", competency: FMOD, says: "Only the shaded squares were counted. A fraction also says how many equal parts make the whole.", predict: s },
      ];
    },
    distractors: ([r, c, s]) => [(s + 1) / (r * c), s / (r * c + 1)],
    variants: () => [],
    explain: (s) => (s.id === "parts" ? `The whole has ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} equal squares: the bottom number` : `${s.inputs[0]} of them are shaded: ${s.inputs[0]}/${s.inputs[1]}`),
    figure: ([r, c, s]) => ({ type: "grid", rows: r, cols: c, shaded: s }),
    domain: [[1, 5], [2, 10], [1, 19]],
    difficulty: ([r, c]) => (r === 1 && c <= 4 ? 1 : r * c <= 8 ? 2 : 3),
    word: ([r, c, s]) => `${nm(r + c + s)} has a chocolate bar of ${r * c} equal pieces, like the picture. ${nm(r + c + s)} eats the ${pl(s, "piece")} shown shaded. What fraction of the bar is eaten?`,
    teach: {
      idea: "A fraction names equal parts of a whole: the bottom number is how many equal parts make the whole, the top number is how many we mean.",
      method: "Count all the equal parts for the bottom number. Count the shaded parts for the top number.",
      visual: ([r, c, s]) => ({ type: "grid", rows: r, cols: c, shaded: s }),
      alternatives: [
        { id: "pie", title: "The same fraction as a round cake", kind: "conceptual", text: ["Cut a round cake into the same number of equal pieces and colour the same number.", "The fraction is the same: it does not depend on the shape of the whole."], visual: ([r, c, s]) => ({ type: "pie", labels: ["shaded", "not shaded"], values: [s, r * c - s] }) },
      ],
    },
    limits: "Grids of up to 20 equal squares, shaded fractions in simplest form; shapes cut into unequal parts, and drawing halves and quarters, are done in class.",
  },
  {
    id: "adfbuild",
    arity: 3,
    title: "Building a fraction from unit fractions",
    competency: FMOD,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([n, k, mode]) => (n < 3 || n > 12 || k < 2 || k >= n || mode < 0 || mode > 1 ? "k pieces of 1/n with 2 ≤ k < n ≤ 12." : null),
    prompt: ([n, k, mode]) => (mode === 0 ? `${Array(k).fill(fr(1, n)).join(" + ")} = ? Write the answer as one fraction.` : `How many pieces of ${fr(1, n)} make ${fr(k, n)}?`),
    solve: ([n, k, mode]) => ({
      steps: [{ id: "count", op: "count", competency: UNIT, inputs: [k, n], value: mode === 0 ? k / n : k }],
      answer: mode === 0 ? k / n : k,
    }),
    // independent: mode 0, the answer times n must count back the k pieces; mode 1, that many pieces of 1/n must make k/n
    validate: ([n, k, mode], v) => {
      if (typeof v !== "number") return false;
      if (mode === 0) return near(v * n, k);
      let s = 0;
      for (let i = 0; i < v && i < 100; i++) s += 1 / n;
      return Number.isInteger(v) && near(s, k / n);
    },
    bugs: ([n, k, mode]) =>
      mode === 0
        ? [
            { id: "add-bottoms", kind: "conceptual", competency: FMOD, says: `The bottom numbers were added too. Every piece is still a ${fr(1, n)} piece: the bottom number names the size of the piece and stays ${n}.`, predict: 1 / n },
            { id: "count-only", kind: "conceptual", competency: FMOD, says: "Only the number of pieces was written. Say what size the pieces are too: that is the bottom number.", predict: k },
          ]
        : [
            { id: "bottom-number", kind: "conceptual", competency: FMOD, says: `The bottom number ${n} was given. It says how many pieces make the WHOLE; the top number says how many pieces we have.`, predict: n },
            { id: "pieces-left", kind: "procedural", competency: FMOD, says: "The pieces that are left over were counted. Count the pieces that make the fraction.", predict: n - k },
          ],
    distractors: ([n, k, mode]) => (mode === 0 ? [(k + 1) / n, k / (n + 1), 1 / (n * k)] : [k + 1, k - 1]),
    variants: () => [],
    explain: (s) => `${s.inputs[0]} pieces, each ${fr(1, Number(s.inputs[1]))}, make ${fr(Number(s.inputs[0]), Number(s.inputs[1]))}`,
    figure: ([n, k]) => ({ type: "grid", rows: 1, cols: n, shaded: k }),
    domain: [[2, 12], [2, 11], [0, 1]],
    // the sum is asked only when k/n is already in its simplest form (so the answer shows k/n itself)
    keep: ([n, k, mode]) => mode === 1 || gcd(n, k) === 1,
    difficulty: ([n, k, mode]) => (n <= 5 ? 1 : mode === 0 || k <= 3 ? 2 : 3),
    word: ([n, k, mode]) =>
      mode === 0
        ? `A cake is cut into ${n} equal pieces, so each piece is ${fr(1, n)} of the cake. ${nm(n + k)} eats ${k} pieces. What fraction of the cake does ${nm(n + k)} eat?`
        : `A ribbon is cut into ${n} equal pieces, so each piece is ${fr(1, n)} of the ribbon. How many pieces does ${nm(n + k)} need to have ${fr(k, n)} of the ribbon?`,
    teach: {
      idea: "A unit fraction 1/n is one of n equal parts. Putting k of those parts together gives k/n: the top number counts the parts.",
      method: "Count how many pieces there are (the top number). The size of each piece (the bottom number) does not change.",
      visual: ([n, k]) => ({ type: "grid", rows: 1, cols: n, shaded: k }),
      alternatives: [
        { id: "count_pieces", title: "Count pieces like objects", kind: "conceptual", text: ["Say the pieces like counting things: one eighth, two eighths, three eighths.", "Three eighths is written 3/8: 3 pieces, each an eighth."], visual: ([n, k]) => ({ type: "pie", labels: ["taken", "left"], values: [k, n - k] }) },
      ],
    },
    limits: "Fractions less than 1 built from 2 to 11 unit pieces (up to twelfths); fractions greater than 1 and number lines are later families.",
  },

  // ============================================================ fraction of a collection
  {
    id: "adfcol",
    arity: 3,
    title: "A fraction of a collection of objects",
    competency: FCOL,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s+/g, " ").trim().match(/^(?:what is )?(\d+)\/(\d+) of (\d+)\??$/i);
      return m && Number(m[3]) % Number(m[2]) === 0 ? [Number(m[1]), Number(m[2]), Number(m[3]) / Number(m[2])] : null;
    },
    reject: ([a, b, m]) => (b < 2 || b > 10 || a < 1 || a >= b || m < 1 || m > 10 || b * m > 60 ? "A fraction less than 1 (up to tenths) of a collection of up to 60 that shares exactly." : null),
    prompt: ([a, b, m]) => `The picture shows ${b * m} beads. What is ${frw(a, b)} of ${b * m}?`,
    solve: ([a, b, m]) => ({
      steps: [
        { id: "share", op: "divide", competency: SHARE, inputs: [b * m, b], value: m },
        { id: "take", op: "multiply", competency: MT, inputs: [a, m], value: a * m },
      ],
      answer: a * m,
    }),
    // independent: deal the objects one by one into b equal groups, then count what is in a of the groups
    validate: ([a, b, m], v) => {
      const groups = Array(b).fill(0);
      for (let i = 0; i < b * m; i++) groups[i % b]++;
      return v === groups.slice(0, a).reduce((x, y) => x + y, 0);
    },
    bugs: ([a, b, m]) => {
      const N = b * m;
      return [
        ...(a > 1 ? [{ id: "one-part-only", kind: "procedural", competency: UNIT, says: `${N} was shared into ${b} equal groups, but only one group was counted. ${fr(a, b)} means ${a} of those groups.`, predict: m, probe: `gen:adfcol:1,${b},${m}` } as Bug] : []),
        ...(a > 1 && N % a === 0 ? [{ id: "divide-by-top", kind: "conceptual", competency: FCOL, says: `${N} was divided by the top number ${a}. Share into ${b} equal groups first (the bottom number), then take ${a} of them.`, predict: N / a } as Bug] : []),
        { id: "what-is-left", kind: "procedural", competency: FCOL, says: `The part that is left was found (${N} minus the fraction). The question asks for the fraction itself.`, predict: N - a * m },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "share" ? `Share ${s.inputs[0]} into ${s.inputs[1]} equal groups: ${s.value} in each group` : `Take ${s.inputs[0]} of the groups: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    figure: ([, b, m]) => ({ type: "dots", count: b * m, rows: b }),
    domain: [[1, 9], [2, 10], [1, 10]],
    cap: 300,
    difficulty: ([a, b, m]) => (a === 1 && b <= 4 && m <= 6 ? 1 : a === 1 || b * m <= 24 ? 2 : 3),
    word: ([a, b, m]) => `${nm(a + m)} has ${b * m} laddoos and gives ${fr(a, b)} of them to ${nm(a + m + 3)}. How many laddoos does ${nm(a + m + 3)} get?`,
    teach: {
      idea: `To find a fraction of a collection, share it into as many equal groups as the bottom number, and take as many groups as the top number.`,
      method: "Divide by the bottom number to find one group. Multiply by the top number.",
      visual: ([a, b, m]) => ({ type: "array", rows: b, cols: m, split: a }),
      alternatives: [
        { id: "deal", title: "Deal them out like cards", kind: "conceptual", text: ["Make as many piles as the bottom number. Give one object to each pile in turn until none are left.", "Count the objects in as many piles as the top number."], visual: ([, b, m]) => ({ type: "dots", count: b * m, rows: b }) },
      ],
    },
    limits: "Fractions less than 1 (up to tenths) of collections of up to 60 that share exactly; remainders are not used.",
  },
  {
    id: "adfmeas",
    arity: 3,
    title: "A fraction of an hour, a metre, a kilogram, a day or ₹100",
    competency: FCOL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([u, a, b]) => (u < 0 || u > 4 || a < 1 || a >= b || b < 2 || b > 12 || WHOLES[u].tot % b !== 0 ? "A fraction less than 1 of a whole measure that shares exactly." : null),
    prompt: ([u, a, b]) => WHOLES[u].ask(frw(a, b)),
    solve: ([u, a, b]) => {
      const T = WHOLES[u].tot;
      return {
        steps: [
          { id: "whole", op: "convert", competency: u === 0 || u === 4 ? TIME : "MATH.measurement.length-conversion", inputs: [WHOLES[u].of, T], value: T },
          { id: "share", op: "divide", competency: SHARE, inputs: [T, b], value: T / b },
          { id: "take", op: "multiply", competency: MT, inputs: [a, T / b], value: (a * T) / b },
        ],
        answer: (a * T) / b,
      };
    },
    // independent: find one part by repeated subtraction of b-sized handfuls, then add a parts
    validate: ([u, a, b], v) => {
      const T = WHOLES[u].tot;
      let part = 0;
      for (let rest = T; rest > 0; rest -= b) part++;
      let s = 0;
      for (let i = 0; i < a; i++) s += part;
      return part * b === T && v === s;
    },
    bugs: ([u, a, b]) => {
      const T = WHOLES[u].tot;
      return [
        ...(a > 1 ? [{ id: "one-part-only", kind: "procedural", competency: UNIT, says: `Only ${fr(1, b)} was found. ${fr(a, b)} is ${a} of those parts.`, predict: T / b } as Bug] : []),
        ...(u === 0 && (100 * a) % b === 0 ? [{ id: "hour-as-100", kind: "conceptual", competency: TIME, says: "An hour was taken as 100 minutes. An hour has 60 minutes.", predict: (100 * a) / b } as Bug] : []),
        ...(u === 3 && (100 * a) % b === 0 ? [{ id: "kg-as-100", kind: "recall", competency: "MATH.measurement.length-conversion", says: "A kilogram was taken as 100 grams. 1 kg = 1000 g.", predict: (100 * a) / b } as Bug] : []),
        ...(a > 1 && T % a === 0 ? [{ id: "divide-by-top", kind: "conceptual", competency: FCOL, says: `The whole was divided by the top number ${a}. Divide by the bottom number ${b} to find one part, then take ${a} parts.`, predict: T / a } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "whole" ? `${s.inputs[0]} is ${s.value}` : s.id === "share" ? `One part: ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `${pl(Number(s.inputs[0]), "part")}: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 4], [1, 11], [2, 12]],
    difficulty: ([u, a, b]) => (a === 1 && b <= 4 ? 1 : u === 3 || b > 6 ? 3 : 2),
    word: ([u, a, b]) => WHOLES[u].word(fr(a, b), a + b),
    teach: {
      idea: "First change the whole into small units (an hour is 60 minutes, a metre is 100 cm, a kilogram is 1000 g, a day is 24 hours). Then find the fraction of that number.",
      method: "Write the whole in the small unit, divide by the bottom number, then multiply by the top number.",
      visual: ([u, , b]) => ({ type: "numberline", from: 0, to: WHOLES[u].tot, step: WHOLES[u].tot / b }),
      alternatives: [
        { id: "clock", title: "Fractions of an hour on a clock", kind: "conceptual", text: ["Half past is the minute hand halfway round: 30 minutes. A quarter past is a quarter of the way round: 15 minutes.", "Three quarters of an hour is three of those quarter turns: 45 minutes."], visual: () => ({ type: "clock", h: 3, m: 45 }) },
      ],
    },
    limits: "Fractions less than 1 of 1 hour, ₹100, 1 metre, 1 kilogram or 1 day that give a whole number; other wholes are other families.",
  },

  // ============================================================ three-digit addition and subtraction
  {
    id: "adcol3",
    arity: 3,
    title: "Adding and subtracting three-digit numbers with regrouping",
    competency: MDAS,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").replace(/−/g, "-").match(/^(\d{3})([+-])(\d{3})=?\??$/);
      return m ? [Number(m[1]), Number(m[3]), m[2] === "+" ? 0 : 1] : null;
    },
    reject: ([a, b, op]) => {
      if (a < 100 || a > 999 || b < 100 || b > 999 || (op !== 0 && op !== 1)) return "Two three-digit numbers.";
      if (op === 0) {
        const c = colAdd(a, b);
        return a + b > 999 ? "Sums up to 999." : !c.c1 && !c.c2 ? "Sums that need at least one regrouping." : null;
      }
      const c = colSub(a, b);
      return a <= b ? "The first number is the larger." : !c.b1 && !c.b2 ? "Differences that need at least one regrouping." : null;
    },
    prompt: ([a, b, op]) => `${a} ${op ? "−" : "+"} ${b} = ?`,
    solve: ([a, b, op]) => {
      if (op === 0) {
        const c = colAdd(a, b);
        const steps: Step[] = [
          { id: "ones", op: "add", competency: ADD, inputs: [c.ao, c.bo], value: c.o },
          { id: "tens", op: "add", competency: ADDR, inputs: [c.at, c.bt, c.c1], value: c.t },
          { id: "hundreds", op: "add", competency: MDAS, inputs: [c.ah, c.bh, c.c2], value: c.h },
        ];
        return { steps, answer: c.h * 100 + (c.t % 10) * 10 + (c.o % 10) };
      }
      const c = colSub(a, b);
      const steps: Step[] = [
        { id: "ones-sub", op: "subtract", competency: SUBR, inputs: [c.ao + 10 * c.b1, c.bo, c.b1], value: c.o },
        { id: "tens-sub", op: "subtract", competency: SUBR, inputs: [c.at - c.b1 + 10 * c.b2, c.bt, c.b2], value: c.t },
        { id: "hundreds-sub", op: "subtract", competency: MDAS, inputs: [c.ah - c.b2, c.bh], value: c.h },
      ];
      return { steps, answer: c.h * 100 + c.t * 10 + c.o };
    },
    // independent: count on from the first number one at a time (addition), or count up from b to a (subtraction)
    validate: ([a, b, op], v) => {
      if (op === 0) {
        let s = a;
        for (let i = 0; i < b; i++) s++;
        return v === s;
      }
      let n = 0;
      for (let x = b; x < a; x++) n++;
      return v === n;
    },
    bugs: ([a, b, op]) => {
      const A = digits(a);
      const B = digits(b);
      if (op === 0) {
        const noCarry = Number(A.map((d, i) => (d + B[i]) % 10).join(""));
        return [
          { id: "no-carry", kind: "conceptual", competency: PV, says: "A ten (or a hundred) made in one column was not carried to the next column.", predict: noCarry },
          ...(colAdd(a, b).c1 && colAdd(a, b).c2 ? [{ id: "first-carry-forgotten", kind: "procedural", competency: ADDR, says: "The hundred was carried, but the ten carried from the ones was forgotten in the tens column. Add every carried 1 to the next column.", predict: a + b - 10 } as Bug] : []),
        ];
      }
      const c = colSub(a, b);
      return [
        { id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: "In each column the smaller digit was taken from the larger one. When the top digit is smaller, regroup first: exchange 1 ten from the next column for 10 ones.", predict: Number(A.map((d, i) => Math.abs(d - B[i])).join("")) },
        { id: "borrow-not-taken", kind: "procedural", competency: SUBR, says: "A ten (or a hundred) was exchanged for 10 ones (or 10 tens), but the column it came from was not made one less. When you regroup, the next column gives one away, so it goes down by 1.", predict: a - b + 10 * c.b1 + 100 * c.b2 },
      ];
    },
    variants: () => [],
    explain: (s) => {
      const [x, y, c] = s.inputs.map(Number);
      if (s.id === "ones") return `Ones: ${x} + ${y} = ${s.value}${Number(s.value) >= 10 ? `: write ${Number(s.value) % 10}, carry 1 ten` : ""}`;
      if (s.id === "tens") return `Tens: ${x} + ${y}${c ? " + 1 carried" : ""} = ${s.value}${Number(s.value) >= 10 ? `: write ${Number(s.value) % 10}, carry 1 hundred` : ""}`;
      if (s.id === "hundreds") return `Hundreds: ${x} + ${y}${c ? " + 1 carried" : ""} = ${s.value}`;
      if (s.id === "ones-sub") return c ? `Ones: take 1 ten to make ${x} ones; ${x} − ${y} = ${s.value}` : `Ones: ${x} − ${y} = ${s.value}`;
      if (s.id === "tens-sub") return c ? `Tens: take 1 hundred to make ${x} tens; ${x} − ${y} = ${s.value}` : `Tens: ${x} − ${y} = ${s.value}`;
      return `Hundreds: ${x} − ${y} = ${s.value}`;
    },
    figure: ([a, b, op]) => {
      const A = digits(a);
      const B = digits(b);
      return op === 0 ? { type: "blocks", hundreds: A[0] + B[0], tens: A[1] + B[1], ones: A[2] + B[2], note: `${a} and ${b} together` } : { type: "blocks", hundreds: A[0], tens: A[1], ones: A[2], note: `${a}, before ${b} is taken away` };
    },
    domain: [[100, 999], [100, 999], [0, 1]],
    cap: 500,
    difficulty: ([a, b, op]) => {
      if (op === 0) {
        const c = colAdd(a, b);
        return c.c1 && c.c2 ? 3 : 2;
      }
      const c = colSub(a, b);
      return digits(a)[1] === 0 && c.b1 ? 3 : c.b1 && c.b2 ? 3 : c.b1 ? 1 : 2;
    },
    word: ([a, b, op]) => (op === 0 ? `A school library has ${a} Tamil books and ${b} English books. How many books does it have in all?` : `A farmer picked ${a} coconuts and sold ${b} of them at the market. How many coconuts are left?`),
    teach: {
      idea: "Ten ones make a ten and ten tens make a hundred, so a column that gets too big passes a ten (or a hundred) on, and a column that is too small can break one from the next column.",
      method: "Write the numbers one under the other, ones under ones. Work from the ones to the hundreds, regrouping as you go: carry a ten when adding, exchange a ten for 10 ones when subtracting. Check with an estimate.",
      visual: ([a]) => ({ type: "blocks", hundreds: digits(a)[0], tens: digits(a)[1], ones: digits(a)[2] }),
      alternatives: [
        { id: "jumps", title: "Jump by hundreds, tens and ones", kind: "conceptual", text: ["Start at the first number. Jump by the hundreds of the second number, then its tens, then its ones (forwards to add, backwards to subtract).", "Each jump is easy to do in your head."], visual: ([a, b, op]) => {
          const B = digits(b);
          const s = op ? -1 : 1;
          const p1 = a + s * 100 * B[0];
          const p2 = p1 + s * 10 * B[1];
          const p3 = p2 + s * B[2];
          return { type: "numberline", from: Math.min(a, p3), to: Math.max(a, p3), jumps: [[a, p1], [p1, p2], [p2, p3]] };
        } },
      ],
    },
    limits: "Two three-digit numbers with at least one regrouping, sums up to 999; four- and five-digit numbers are not in this family.",
  },

  // ============================================================ thousands
  {
    id: "adexp",
    arity: 4,
    title: "Writing a number from its place-value parts",
    competency: TH,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([th, h, t, o]) => ([th, h, t, o].some((d) => d < 0 || d > 9) ? "Digits 0 to 9." : th === 0 && h === 0 ? "Numbers from 100 to 9999." : [th, h, t, o].filter((d) => d > 0).length < 2 ? "At least two places that are not zero." : null),
    prompt: ([th, h, t, o]) =>
      th === 0
        ? `What number do the base-ten blocks in the picture show? (A flat is 100, a long is 10, a small cube is 1.)`
        : `Write as one number: ${[th * 1000, h * 100, t * 10, o].filter((x) => x > 0).join(" + ")}`,
    solve: ([th, h, t, o]) => ({
      steps: [{ id: "place", op: "evaluate", competency: TH, inputs: [th, h, t, o], value: 1000 * th + 100 * h + 10 * t + o }],
      answer: 1000 * th + 100 * h + 10 * t + o,
    }),
    // independent: read the answer's digits from the right and check each one is the count for its place
    validate: ([th, h, t, o], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
      const d = String(v).split("").reverse().map(Number);
      if (d.length > 4) return false;
      return (d[0] ?? 0) === o && (d[1] ?? 0) === t && (d[2] ?? 0) === h && (d[3] ?? 0) === th;
    },
    bugs: ([th, h, t, o]) => {
      const parts = [th * 1000, h * 100, t * 10, o].filter((x) => x > 0);
      if (th === 0)
        return [
          { id: "blocks-as-ones", kind: "conceptual", competency: PV, says: "Every block was counted as 1. A flat is 100 and a long is 10.", predict: h + t + o },
          ...(t !== o ? [{ id: "tens-ones-swapped", kind: "procedural", competency: PV, says: "The tens and the ones were written in each other's places.", predict: 100 * h + 10 * o + t } as Bug] : []),
        ];
      return [
        ...([h, t, o].includes(0) ? [{ id: "zero-left-out", kind: "conceptual", competency: TH, says: "A place with nothing in it was left out. Write 0 to keep the other digits in their places.", predict: Number([th, h, t, o].filter((x) => x > 0).join("")) } as Bug] : []),
        { id: "parts-side-by-side", kind: "conceptual", competency: TH, says: "The parts were written next to each other. Add them: each digit goes in its own place.", predict: Number(parts.join("")) },
      ];
    },
    variants: () => [],
    explain: (s) => {
      const [th, h, t, o] = s.inputs.map(Number);
      return `${th ? `${th} thousands, ` : ""}${h} hundreds, ${t} tens and ${o} ones: ${s.value}`;
    },
    figure: ([th, h, t, o]) => (th === 0 ? { type: "blocks", hundreds: h, tens: t, ones: o } : null),
    domain: [[0, 9], [0, 9], [0, 9], [0, 9]],
    cap: 400,
    difficulty: ([th, h, t, o]) => (th === 0 && t > 0 && o > 0 ? 1 : th === 0 || ![h, t, o].includes(0) ? 2 : 3),
    word: ([th, h, t, o]) =>
      th === 0
        ? `${nm(h + t + o)} has ${[h ? `${pl(h, "note")} of ₹100` : "", t ? `${pl(t, "note")} of ₹10` : "", o ? `${pl(o, "coin")} of ₹1` : ""].filter(Boolean).join(", ")}. How many rupees is that in all?`
        : `A shop has ${[`${pl(th, "box", "boxes")} of 1000 pins`, h ? `${pl(h, "packet")} of 100 pins` : "", t ? `${pl(t, "strip")} of 10 pins` : "", o ? pl(o, "loose pin") : ""].filter(Boolean).join(", ")}. How many pins are there in all?`,
    teach: {
      idea: "Each place is worth ten of the place on its right: ones, tens, hundreds, thousands. A digit shows how many of that place there are.",
      method: "Write the thousands, hundreds, tens and ones digits in a place-value table. Write 0 for an empty place.",
      visual: ([th, h, t, o]) => ({ type: "table", head: ["Th", "H", "T", "O"], rows: [[th, h, t, o]] }),
      alternatives: [
        { id: "blocks", title: "Build it with blocks", kind: "conceptual", text: ["Show the number with flats (100), longs (10) and cubes (1); a big cube is 1000.", "Count each kind and write the counts in order: thousands, hundreds, tens, ones."], visual: ([, h, t, o]) => ({ type: "blocks", hundreds: h, tens: t, ones: o }) },
      ],
    },
    limits: "Numbers from 100 to 9999 from blocks or from expanded form; reading number names in words is not marked here.",
  },
  {
    id: "ad1000",
    arity: 1,
    title: "How much more makes 1000",
    competency: TH,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d{3})\+\?=1000$/);
      return m ? [Number(m[1])] : null;
    },
    reject: ([n]) => (n < 100 || n > 999 ? "A three-digit number." : null),
    prompt: ([n]) => `${n} + ? = 1000. What number goes in the box?`,
    solve: ([n]) => {
      const up10 = Math.ceil(n / 10) * 10;
      const up100 = Math.ceil(up10 / 100) * 100;
      return {
        steps: [
          { id: "to-ten", op: "add", competency: PV, inputs: [n, up10], value: up10 - n },
          { id: "to-hundred", op: "add", competency: "MATH.number.hundreds", inputs: [up10, up100], value: up100 - up10 },
          { id: "to-thousand", op: "add", competency: TH, inputs: [up100, 1000], value: 1000 - up100 },
        ],
        answer: 1000 - n,
      };
    },
    // independent: count on from n to 1000 one at a time
    validate: ([n], v) => {
      let c = 0;
      for (let x = n; x < 1000; x++) c++;
      return v === c;
    },
    bugs: ([n]) => {
      const d = digits(n);
      return [
        ...(d.every((x) => x > 0) ? [{ id: "each-digit-to-ten", kind: "conceptual", competency: TH, says: "Each digit was made up to 10. Only the ones make 10; the tens and the hundreds each make 9, because the ten and the hundred carried over fill the rest.", predict: Number(d.map((x) => 10 - x).join("")) } as Bug] : []),
        { id: "made-999", kind: "procedural", competency: TH, says: "The number was made up to 999, one short of 1000.", predict: 999 - n },
        ...(n % 10 !== 0 ? [{ id: "ones-dropped", kind: "procedural", competency: PV, says: "The ones were left out: only the tens and hundreds were made up.", predict: 1000 - (n - (n % 10)) } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} to ${s.inputs[1]} is ${s.value}`,
    figure: ([n]) => ({ type: "blocks", hundreds: digits(n)[0], tens: digits(n)[1], ones: digits(n)[2], note: `${n}: how much more to make 1000?` }),
    domain: [[100, 999]],
    cap: 300,
    difficulty: ([n]) => (n % 100 === 0 ? 1 : n % 10 === 0 ? 2 : 3),
    word: ([n]) => `Our school wants to collect 1000 old newspapers for recycling. We have ${n} so far. How many more do we need?`,
    teach: {
      idea: "Counting up in friendly jumps (to the next ten, then the next hundred, then 1000) finds the difference without regrouping.",
      method: "Jump from the number to the next ten, then to the next hundred, then to 1000. Add the jumps.",
      visual: ([n]) => {
        const a = Math.ceil(n / 10) * 10;
        const b = Math.ceil(a / 100) * 100;
        return { type: "numberline", from: n, to: 1000, jumps: [[n, a], [a, b], [b, 1000]].filter(([x, y]) => x !== y) };
      },
      alternatives: [
        { id: "nines", title: "Make 999, then one more", kind: "procedural", text: ["Each digit of the number and the missing number add up to 9: that makes 999.", "One more makes 1000, so add 1 to what you found."] },
      ],
    },
    limits: "Three-digit numbers made up to 1000; other targets are other families.",
  },
  {
    id: "adbetw",
    arity: 2,
    title: "How many whole numbers lie between two numbers",
    competency: TH,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, d]) => (a < 1000 || a > 9979 || d < 2 || d > 20 ? "Two four-digit numbers 2 to 20 apart." : null),
    prompt: ([a, d]) => `How many whole numbers are there between ${inr(a)} and ${inr(a + d)}? (Do not count ${inr(a)} and ${inr(a + d)} themselves.)`,
    solve: ([a, d]) => ({
      steps: [
        { id: "gap", op: "subtract", competency: TH, inputs: [a + d, a], value: d },
        { id: "inside", op: "subtract", competency: TH, inputs: [d, 1], value: d - 1 },
      ],
      answer: d - 1,
    }),
    // independent: list the numbers strictly between and count them
    validate: ([a, d], v) => {
      let c = 0;
      for (let x = a + 1; x < a + d; x++) c++;
      return v === c;
    },
    bugs: ([a, d]) => [
      { id: "difference-only", kind: "procedural", competency: TH, says: `The difference ${d} counts the steps from one number to the other, which includes the last number. The numbers between are one fewer.`, predict: d },
      { id: "both-ends", kind: "procedural", competency: TH, says: "Both end numbers were counted. 'Between' leaves them out.", predict: d + 1 },
    ],
    variants: () => [],
    explain: (s) => (s.id === "gap" ? `${inr(Number(s.inputs[0]))} − ${inr(Number(s.inputs[1]))} = ${s.value} steps` : `The steps land on the last number too, so between them there ${Number(s.value) === 1 ? "is" : "are"} ${s.inputs[0]} − 1 = ${pl(Number(s.value), "number")}`),
    // only the two ends are labelled (four-digit labels at every whole number would crowd the line)
    figure: ([a, d]) => ({ type: "numberline", from: a, to: a + d, step: d, marks: [a, a + d] }),
    domain: [[1000, 9979], [2, 20]],
    cap: 300,
    difficulty: ([, d]) => (d <= 5 ? 1 : d <= 12 ? 2 : 3),
    word: ([a, d]) => `Raffle tickets are numbered in order. ${nm(a)} has ticket ${inr(a)} and ${nm(a + 1)} has ticket ${inr(a + d)}. How many tickets have numbers between theirs?`,
    teach: {
      idea: "Subtracting counts the steps from one number to the other; the last step lands on the end number, so the numbers in between are one fewer than the steps.",
      method: "Subtract the smaller number from the larger, then take away 1.",
      visual: ([a, d]) => ({ type: "numberline", from: a, to: a + d, step: d, marks: [a, a + d], jumps: Array.from({ length: d }, (_, i) => [a + i, a + i + 1] as [number, number]) }),
      alternatives: [
        { id: "small_case", title: "Try a small case", kind: "conceptual", text: ["Between 3 and 7 are 4, 5 and 6: three numbers, and 7 − 3 = 4.", "So the count between is always the difference minus one."] },
      ],
    },
    limits: "Four-digit numbers 2 to 20 apart; counting sequences by 10s, 100s and 1000s are other families.",
  },

  // ============================================================ estimating
  {
    id: "adest",
    arity: 3,
    title: "Estimating a sum or difference by rounding to tens",
    competency: EST,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, op]) => (a < 11 || a > 99 || b < 11 || b > 99 || (op !== 0 && op !== 1) || a % 10 === 0 || b % 10 === 0 ? "Two two-digit numbers that are not already tens." : op === 1 && a <= b ? "The first number is the larger." : null),
    prompt: ([a, b, op]) => `Estimate ${a} ${op ? "−" : "+"} ${b}: round each number to the nearest ten first, then ${op ? "subtract" : "add"}. What is your estimate?`,
    solve: ([a, b, op]) => {
      const r = (x: number) => Math.round(x / 10 + 1e-9) * 10;
      return {
        steps: [
          { id: "round-a", op: "round", competency: ROUND, inputs: [a], value: r(a) },
          { id: "round-b", op: "round", competency: ROUND, inputs: [b], value: r(b) },
          { id: "combine", op: op ? "subtract" : "add", competency: EST, inputs: [r(a), r(b)], value: op ? r(a) - r(b) : r(a) + r(b) },
        ],
        answer: op ? r(a) - r(b) : r(a) + r(b),
      };
    },
    // independent: the nearest ten by searching the tens for the smallest distance (a 5 goes up)
    validate: ([a, b, op], v) => {
      const nearest = (x: number) => {
        let best = 0;
        for (let t = 0; t <= 100; t += 10) if (Math.abs(x - t) < Math.abs(x - best) || Math.abs(x - t) === Math.abs(x - best)) best = t;
        return best;
      };
      return v === (op ? nearest(a) - nearest(b) : nearest(a) + nearest(b));
    },
    bugs: ([a, b, op]) => {
      const dn = (x: number) => Math.floor(x / 10) * 10;
      const r = (x: number) => Math.round(x / 10 + 1e-9) * 10;
      return [
        { id: "exact", kind: "procedural", competency: EST, says: "The exact answer was worked out. An estimate uses the rounded numbers, so it is quick to find in your head.", predict: op ? a - b : a + b },
        { id: "always-down", kind: "conceptual", competency: ROUND, says: "Both numbers were rounded down. Round to the NEAREST ten: 5 or more in the ones goes up.", predict: op ? dn(a) - dn(b) : dn(a) + dn(b) },
        { id: "one-rounded", kind: "procedural", competency: EST, says: "Only the first number was rounded. Round both numbers before working it out.", predict: op ? r(a) - b : r(a) + b },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "combine" ? `${s.inputs[0]} ${s.op === "subtract" ? "−" : "+"} ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} is nearest to ${s.value}`),
    figure: ([a, b]) => ({ type: "numberline", from: 0, to: 100, step: 10, marks: [a, b] }),
    domain: [[11, 99], [11, 99], [0, 1]],
    cap: 400,
    difficulty: ([a, b]) => (a % 10 !== 5 && b % 10 !== 5 && (a % 10 < 5) === (b % 10 < 5) ? 1 : a % 10 === 5 || b % 10 === 5 ? 3 : 2),
    word: ([a, b, op]) =>
      op
        ? `${nm(a)} had ₹${a} and spent ₹${b} at the fair. About how much money is left? Round each amount to the nearest ten rupees first.`
        : `${nm(a)} buys a notebook for ₹${a} and a box of colours for ₹${b}. About how much does ${nm(a)} spend? Round each price to the nearest ten rupees first.`,
    teach: {
      idea: "A number rounded to the nearest ten is the ten it is closest to on the number line. Rounded numbers are easy to add or subtract in your head, and the estimate shows whether an exact answer is sensible.",
      method: "Look at the ones digit: 0 to 4 round down, 5 to 9 round up. Round both numbers, then work out the answer with the tens.",
      visual: ([a, b]) => ({ type: "numberline", from: 0, to: 100, step: 10, marks: [a, b] }),
      alternatives: [
        { id: "closest", title: "Which ten is closer?", kind: "conceptual", text: ["Put the number on a number line between two tens.", "Count the steps to each ten: it rounds to the closer one (halfway goes up)."], visual: ([a]) => ({ type: "numberline", from: Math.floor(a / 10) * 10, to: Math.floor(a / 10) * 10 + 10, step: 1, marks: [a] }) },
      ],
    },
    limits: "Two-digit numbers rounded to the nearest ten; rounding to hundreds and estimating lengths, weights and capacities are other families or done in class.",
  },

  // ============================================================ bar charts
  {
    id: "adbar",
    arity: 4,
    title: "Reading a bar chart",
    competency: BAR,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, s, q, sc]) => (c < 0 || c > 3 || s < 0 || s > 29 || q < 0 || q > 3 || sc < 0 || sc > 1 ? "A bar chart of four bars and one of four questions." : !distinct(barValues(c, s, sc)) ? "The four bars have different heights." : null),
    prompt: ([c, s, q, sc]) => {
      const C = BARCTX[c];
      const v = barValues(c, s, sc);
      const j = s % 4;
      const k = (j + 1) % 4;
      const [x, y] = v[j] > v[k] ? [j, k] : [k, j];
      const ask = q === 0 ? C.q(C.labels[j]) : q === 1 ? C.more(C.labels[x], C.labels[y]) : q === 2 ? `How many ${C.unit} are there in all?` : `How many more ${C.unit} does the tallest bar show than the shortest bar?`;
      return `The bar chart shows ${C.title}${sc ? " (each line on the scale is 5)" : ""}. ${ask}`;
    },
    solve: ([c, s, q, sc]) => {
      const v = barValues(c, s, sc);
      const j = s % 4;
      const k = (j + 1) % 4;
      const [x, y] = v[j] > v[k] ? [j, k] : [k, j];
      const read: Step = { id: "read", op: "read", competency: BAR, inputs: q === 0 ? [j] : q === 1 ? [x, y] : [0, 1, 2, 3], value: q === 0 ? v[j] : q === 1 ? [v[x], v[y]] : v };
      const ans = q === 0 ? v[j] : q === 1 ? v[x] - v[y] : q === 2 ? v.reduce((p, r) => p + r, 0) : Math.max(...v) - Math.min(...v);
      return { steps: q === 0 ? [read] : [read, { id: q === 2 ? "total" : "difference", op: q === 2 ? "add" : "subtract", competency: q === 2 ? ADD : BAR, inputs: q === 2 ? v : q === 1 ? [v[x], v[y]] : [Math.max(...v), Math.min(...v)], value: ans }], answer: ans };
    },
    // independent: check the answer against the bars by the inverse operation (add back, take away each bar)
    validate: ([c, s, q, sc], ans) => {
      if (typeof ans !== "number") return false;
      const v = barValues(c, s, sc);
      const j = s % 4;
      const k = (j + 1) % 4;
      if (q === 0) return v.indexOf(ans) === j;
      if (q === 1) return ans > 0 && (ans + v[j] === v[k] || ans + v[k] === v[j]);
      if (q === 2) {
        let r = ans;
        for (const b of v) r -= b;
        return r === 0;
      }
      const sorted = [...v].sort((p, r) => r - p);
      return ans + sorted[3] === sorted[0];
    },
    bugs: ([c, s, q, sc]) => {
      const v = barValues(c, s, sc);
      const j = s % 4;
      const k = (j + 1) % 4;
      const big = Math.max(v[j], v[k]);
      const small = Math.min(v[j], v[k]);
      const total = v.reduce((p, r) => p + r, 0);
      const scaleBug: Bug[] = sc ? [{ id: "counted-lines", kind: "conceptual", competency: PICT, says: "The lines on the scale were counted as 1 each. Each line on this scale stands for 5.", predict: q === 0 ? v[j] / 5 : q === 1 ? (big - small) / 5 : q === 2 ? total / 5 : (Math.max(...v) - Math.min(...v)) / 5 }] : [];
      if (q === 0) return [{ id: "next-bar", kind: "procedural", competency: BAR, says: "The bar next to the one asked about was read. Find the label first, then go straight up its bar.", predict: [v[(j + 1) % 4], v[(j + 3) % 4]] }, ...scaleBug];
      if (q === 1) return [{ id: "added", kind: "conceptual", competency: BAR, says: "The two bars were added. 'How many more' asks for the difference: take the smaller from the larger.", predict: big + small }, { id: "one-bar", kind: "procedural", competency: BAR, says: "Only the larger bar was read. Compare it with the other bar by subtracting.", predict: big }, ...scaleBug];
      if (q === 2) return [{ id: "missed-bar", kind: "procedural", competency: BAR, says: "One bar was left out of the total. Add every bar, ticking each one.", predict: [...new Set(v.map((b) => total - b))] }, ...scaleBug];
      return [{ id: "tallest-only", kind: "procedural", competency: BAR, says: "Only the tallest bar was read. Subtract the shortest bar from it.", predict: Math.max(...v) }, { id: "added", kind: "conceptual", competency: BAR, says: "The tallest and shortest bars were added. 'How many more' means the difference.", predict: Math.max(...v) + Math.min(...v) }, ...scaleBug];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `Read the bars: ${Array.isArray(s.value) ? s.value.join(", ") : s.value}` : s.id === "total" ? `Add all the bars: ${s.inputs.join(" + ")} = ${s.value}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    figure: ([c, s, , sc]) => ({ type: "bars", title: BARCTX[c].title, labels: BARCTX[c].labels, values: barValues(c, s, sc), scale: sc ? 5 : 1 }),
    domain: [[0, 3], [0, 29], [0, 3], [0, 1]],
    cap: 450,
    difficulty: ([, , q, sc]) => (q === 0 && !sc ? 1 : q <= 1 || !sc ? 2 : 3),
    word: ([c, s, q, sc]) => {
      const C = BARCTX[c];
      const v = barValues(c, s, sc);
      const j = s % 4;
      const k = (j + 1) % 4;
      const [x, y] = v[j] > v[k] ? [j, k] : [k, j];
      const facts = C.labels.map((l, i) => `${l}: ${v[i]}`).join(", ");
      const ask = q === 0 ? C.q(C.labels[j]) : q === 1 ? C.more(C.labels[x], C.labels[y]) : q === 2 ? `How many ${C.unit} are there in all?` : `What is the difference between the largest and the smallest of these numbers?`;
      return `${nm(c + s)} made a list of ${C.title}. ${facts}. ${ask}`;
    },
    teach: {
      idea: "In a bar chart the height of each bar shows a number. The scale on the side tells how much each line stands for.",
      method: "Find the label under the bar, go to the top of the bar and read across to the scale. For 'how many more', subtract; for 'in all', add.",
      visual: ([c, s, , sc]) => ({ type: "bars", labels: BARCTX[c].labels, values: barValues(c, s, sc), scale: sc ? 5 : 1 }),
      alternatives: [
        { id: "table", title: "Turn the chart into a table", kind: "procedural", text: ["Write each label with the number its bar shows.", "Then answer from the table: compare, add or subtract the numbers."], visual: ([c, s, , sc]) => ({ type: "table", head: ["", "Number"], rows: BARCTX[c].labels.map((l, i) => [l, barValues(c, s, sc)[i]]) }) },
      ],
    },
    limits: "Four bars with whole values up to 10, or up to 50 on a scale of 5; drawing a bar chart is done in class.",
  },

  // ============================================================ tables
  {
    id: "adtally",
    arity: 3,
    title: "Reading tally marks in a table",
    competency: TAB,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, s, q]) => (c < 0 || c > 3 || s < 0 || s > 29 || q < 0 || q > 2 ? "A tally table of three rows and one of three questions." : !distinct(tallyCounts(c, s)) ? "The three counts are different." : [...Array(s).keys()].some((s0) => tallyCounts(c, s0).join() === tallyCounts(c, s).join()) ? "An earlier seed already draws this table (distinct@1)." : null),
    prompt: ([c, s, q]) => {
      const C = TALLYCTX[c];
      const n = tallyCounts(c, s);
      const j = s % 3;
      const k = (j + 1) % 3;
      const [x, y] = n[j] > n[k] ? [j, k] : [k, j];
      const ask = q === 0 ? `How many children chose ${C.items[j]}?` : q === 1 ? `How many children are counted in the table altogether?` : `How many more children chose ${C.items[x]} than ${C.items[y]}?`;
      return `Children in a class chose their favourite ${C.what}. The table shows their choices as tally marks (${BUNDLE} stands for 5 marks). ${ask}`;
    },
    solve: ([c, s, q]) => {
      const n = tallyCounts(c, s);
      const j = s % 3;
      const k = (j + 1) % 3;
      const [x, y] = n[j] > n[k] ? [j, k] : [k, j];
      const ans = q === 0 ? n[j] : q === 1 ? n[0] + n[1] + n[2] : n[x] - n[y];
      return { steps: [{ id: "count", op: "count", competency: TAB, inputs: q === 0 ? [tally(n[j])] : q === 1 ? n.map(tally) : [tally(n[x]), tally(n[y])], value: q === 0 ? n[j] : q === 1 ? n : [n[x], n[y]] }, ...(q ? [{ id: q === 1 ? "total" : "difference", op: q === 1 ? "add" : "subtract", competency: q === 1 ? ADD : TAB, inputs: q === 1 ? n : [n[x], n[y]], value: ans }] : [])], answer: ans };
    },
    // independent: count the marks drawn in the table (5 for a bundle, 1 for a stroke)
    validate: ([c, s, q], v) => {
      const counts = tallyCounts(c, s).map((t) => readTally(tally(t)));
      const j = s % 3;
      const k = (j + 1) % 3;
      if (q === 0) return v === counts[j];
      if (q === 1) return v === counts.reduce((p, r) => p + r, 0);
      return v === Math.abs(counts[j] - counts[k]);
    },
    bugs: ([c, s, q]) => {
      const n = tallyCounts(c, s);
      const j = s % 3;
      const k = (j + 1) % 3;
      const asBundle = (t: number, w: number) => Math.floor(t / 5) * w + (t % 5);
      if (q === 0)
        return [
          ...(n[j] >= 5 ? [{ id: "bundle-as-one", kind: "conceptual", competency: TAB, says: `Each bundle ${BUNDLE} was counted as 1. A bundle is 5 marks: count 5, 10, 15 … then the single marks.`, predict: asBundle(n[j], 1) } as Bug] : []),
          ...(n[j] >= 5 ? [{ id: "bundle-as-four", kind: "conceptual", competency: TAB, says: `Only the four upright marks of each bundle were counted. The line across is the fifth mark.`, predict: asBundle(n[j], 4) } as Bug] : []),
          { id: "wrong-row", kind: "procedural", competency: TAB, says: "The marks in another row were counted. Find the right row first.", predict: [n[k], n[(j + 2) % 3]] },
        ];
      if (q === 1) return [{ id: "missed-row", kind: "procedural", competency: TAB, says: "One row was left out of the total. Add every row.", predict: [...new Set(n.map((t) => n[0] + n[1] + n[2] - t))] }, { id: "bundle-as-one", kind: "conceptual", competency: TAB, says: `Each bundle ${BUNDLE} was counted as 1 instead of 5.`, predict: n.reduce((p, t) => p + asBundle(t, 1), 0) }];
      return [{ id: "added", kind: "conceptual", competency: TAB, says: "The two rows were added. 'How many more' asks for the difference.", predict: n[j] + n[k] }, { id: "one-row", kind: "procedural", competency: TAB, says: "Only one row was counted. Subtract the smaller count from the larger.", predict: Math.max(n[j], n[k]) }];
    },
    variants: () => [],
    explain: (s) => (s.id === "count" ? `Count the marks in fives, then the single marks: ${Array.isArray(s.value) ? s.value.join(", ") : s.value}` : s.id === "total" ? `${s.inputs.join(" + ")} = ${s.value}` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    figure: ([c, s]) => ({ type: "table", head: [TALLYCTX[c].head, "Tally marks"], rows: TALLYCTX[c].items.map((it, i) => [it, tally(tallyCounts(c, s)[i])]) }),
    domain: [[0, 3], [0, 29], [0, 2]],
    difficulty: ([c, s, q]) => (q === 0 && tallyCounts(c, s)[s % 3] <= 10 ? 1 : q === 0 ? 2 : 3),
    word: ([c, s, q]) => {
      const C = TALLYCTX[c];
      const n = tallyCounts(c, s);
      const j = s % 3;
      const k = (j + 1) % 3;
      const [x, y] = n[j] > n[k] ? [j, k] : [k, j];
      const ask = q === 0 ? `How many children chose ${C.items[j]}?` : q === 1 ? `How many children did ${nm(s)} ask altogether?` : `How many more chose ${C.items[x]} than ${C.items[y]}?`;
      return `${nm(s)} asked classmates about their favourite ${C.what} and made a mark for each answer (${BUNDLE} is a bundle of 5): ${C.items.map((it, i) => `${it} ${tally(n[i])}`).join("; ")}. ${ask}`;
    },
    teach: {
      idea: "Tally marks record one mark for each thing counted; every fifth mark crosses the four before it, so the marks come in easy bundles of 5.",
      method: "Count the bundles in fives (5, 10, 15 …), then count on the single marks.",
      visual: ([c, s]) => ({ type: "table", head: [TALLYCTX[c].head, "Tally marks", "Number"], rows: TALLYCTX[c].items.map((it, i) => [it, tally(tallyCounts(c, s)[i]), tallyCounts(c, s)[i]]) }),
      alternatives: [
        { id: "ten_frame", title: "Bundles as half ten frames", kind: "conceptual", text: ["Each bundle of 5 fills half a ten frame; two bundles fill a whole frame.", "Count the full frames as tens, then add the rest."], visual: ([c, s]) => ({ type: "tenframe", filled: tallyCounts(c, s)[s % 3], frames: tallyCounts(c, s)[s % 3] > 10 ? 2 : 1 }) },
      ],
    },
    limits: "Three rows of 3 to 17 tally marks; collecting data with a survey is done in class.",
  },
  {
    id: "adtwo",
    arity: 5,
    title: "A missing number in a two-way table",
    competency: TAB,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c, d, h]) => ([a, b, c, d].some((x) => x < 1 || x > 9) || h < 0 || h > 8 ? "Counts 1 to 9 and one of the nine numbers hidden." : null),
    prompt: ([a, b, c, d, h]) => {
      const C = TWOCTX[(a + b + c + d) % TWOCTX.length];
      return `The table shows ${C.topic}. One number is missing (?). What is the missing number?`;
    },
    solve: ([a, b, c, d, h]) => {
      const T = twoWay(a, b, c, d);
      const r = Math.floor(h / 3);
      const col = h % 3;
      const ans = T[r][col];
      // a cell of the totals row or column is a sum; an inner cell is a total minus the other part
      const step: Step =
        col === 2
          ? { id: "row-sum", op: "add", competency: ADD, inputs: [T[r][0], T[r][1]], value: ans }
          : r === 2
            ? { id: "col-sum", op: "add", competency: ADD, inputs: [T[0][col], T[1][col]], value: ans }
            : { id: "part", op: "subtract", competency: TAB, inputs: [T[r][2], T[r][1 - col]], value: ans };
      return { steps: [step], answer: ans };
    },
    // independent: put the answer in the gap and check every row and every column adds up to its total
    validate: ([a, b, c, d, h], v) => {
      if (typeof v !== "number") return false;
      const T = twoWay(a, b, c, d).map((r) => [...r]);
      T[Math.floor(h / 3)][h % 3] = v;
      for (let i = 0; i < 3; i++) if (T[i][0] + T[i][1] !== T[i][2] || T[0][i] + T[1][i] !== T[2][i]) return false;
      return true;
    },
    bugs: ([a, b, c, d, h]) => {
      const T = twoWay(a, b, c, d);
      const r = Math.floor(h / 3);
      const col = h % 3;
      if (col < 2 && r < 2)
        return [
          { id: "added-to-total", kind: "conceptual", competency: TAB, says: "The total and the other number were added. The total is already both parts together, so take the other part away from it.", predict: T[r][2] + T[r][1 - col] },
          { id: "gave-total", kind: "procedural", competency: TAB, says: "The total of the row was given. The missing number is only one part of that total.", predict: T[r][2] },
        ];
      if (r === 2 && col === 2) return [{ id: "double-total", kind: "procedural", competency: TAB, says: "Both the row totals and the column totals were added, so every child was counted twice.", predict: 2 * T[2][2] }, { id: "one-total", kind: "procedural", competency: TAB, says: "Only one group's total was given. Add the totals of both groups.", predict: T[0][2] }];
      const parts = col === 2 ? [T[r][0], T[r][1]] : [T[0][col], T[1][col]];
      return [
        ...(parts[0] !== parts[1] ? [{ id: "subtracted", kind: "conceptual", competency: TAB, says: "The two numbers were subtracted. A total puts the parts together: add them.", predict: Math.abs(parts[0] - parts[1]) } as Bug] : []),
        { id: "one-part", kind: "procedural", competency: TAB, says: "Only one of the numbers was given. The total includes both.", predict: Math.max(...parts) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.op === "add" ? `The total is the two parts together: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `Take the known part from the total: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    figure: ([a, b, c, d, h]) => {
      const C = TWOCTX[(a + b + c + d) % TWOCTX.length];
      const T = twoWay(a, b, c, d);
      return { type: "table", head: ["", ...C.cols, "Total"], rows: [C.rows[0], C.rows[1], "Total"].map((lab, i) => [lab, ...T[i].map((x, j) => (i * 3 + j === h ? "?" : x))]) };
    },
    domain: [[1, 9], [1, 9], [1, 9], [1, 9], [0, 8]],
    cap: 400,
    difficulty: ([, , , , h]) => (h === 2 || h === 5 || h === 6 || h === 7 ? 1 : h === 8 ? 2 : 3),
    word: ([a, b, c, d, h]) => {
      const C = TWOCTX[(a + b + c + d) % TWOCTX.length];
      const T = twoWay(a, b, c, d);
      const r = Math.floor(h / 3);
      const col = h % 3;
      if (r < 2 && col < 2) return `There are ${who(C, r, T[r][2])}. ${T[r][1 - col]} of them ${did(C, 1 - col, T[r][1 - col])}; the rest ${did(C, col, 2)}. How many ${C.many[r]} ${did(C, col, 2)}?`;
      if (col === 2 && r < 2) return `${who(C, r, T[r][0])} ${did(C, 0, T[r][0])} and ${who(C, r, T[r][1])} ${did(C, 1, T[r][1])}. How many ${C.many[r]} are there altogether?`;
      if (r === 2 && col < 2) return `${who(C, 0, T[0][col])} and ${who(C, 1, T[1][col])} ${did(C, col, 2)}. How many children ${did(C, col, 2)} altogether?`;
      return `There are ${who(C, 0, T[0][2])} and ${who(C, 1, T[1][2])}. How many children are there altogether?`;
    },
    teach: {
      idea: "In a two-way table every row and every column adds up to its total, so any one missing number can be found from the others.",
      method: "Look along the row (or down the column) with the gap. If the gap is a total, add the parts; if it is a part, take the other part from the total.",
      visual: ([a, b, c, d]) => {
        const C = TWOCTX[(a + b + c + d) % TWOCTX.length];
        const T = twoWay(a, b, c, d);
        return { type: "table", head: ["", ...C.cols, "Total"], rows: [C.rows[0], C.rows[1], "Total"].map((lab, i) => [lab, ...T[i]]) };
      },
      alternatives: [
        { id: "bars", title: "See the parts as bars", kind: "conceptual", text: ["Draw the total as one long bar, split into the two parts.", "The missing part is the piece of the bar that is not yet labelled."], visual: ([a, b]) => ({ type: "bars", labels: ["Part 1", "Part 2", "Total"], values: [a, b, a + b] }) },
      ],
    },
    limits: "Two groups by two choices, counts 1 to 9 in each cell, one number missing; collecting the data is done in class.",
  },
  // ============================================================ gap@1 additions (g0304)
  {
    id: "adfnl",
    arity: 4,
    title: "Unit fractions such as 1/2 and 1/4 on a number line",
    competency: FCMP,
    type: "choice",
    // [i, j, q, o]: 1/UF[i] and 1/UF[j] (i < j, so 1/UF[i] is greater) marked on a line from 0 to 1; q 0 the dot nearer 0,
    // 1 nearer 1, 2 farther right; o the order they are named in
    parse: none,
    reject: ([i, j, q, o]) => (i < 0 || j > 6 || i >= j || q < 0 || q > 2 || o < 0 || o > 1 ? "Two different unit fractions from 1/2 to 1/10." : null),
    choices: (p) => shufO(p, "fnl", fnlPair(p).map((d) => fr(1, d))),
    prompt: (p) => {
      const [x, y] = fnlPair(p);
      return `The two dots on the number line from 0 to 1 in the picture show ${frw(1, x)} and ${frw(1, y)}. Which fraction is at the dot ${["nearer to 0", "nearer to 1", "farther to the right"][p[2]]}?`;
    },
    solve: (p) => {
      const [i, j, q] = p;
      const pick = q === 0 ? UF[j] : UF[i];
      return { steps: [sp("compare", "compare", FCMP, [fr(1, UF[i]), fr(1, UF[j])], fr(1, pick))], answer: posO(p, 2, fnlPair(p).indexOf(pick), "fnl") };
    },
    // independent: work out how far along the line each dot is (top ÷ bottom) and compare the distances
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const opts = shufO(p, "fnl", fnlPair(p).map((d) => fr(1, d)));
      const val = opts.map(num);
      if (!opts[v]) return false;
      return p[2] === 0 ? val[v] < val[1 - v] : val[v] > val[1 - v];
    },
    bugs: (p) => {
      const [i, j, q] = p;
      const wrong = q === 0 ? UF[i] : UF[j];
      return [Bg("bigger-bottom-bigger", "conceptual", UNIT, `A bigger bottom number was taken to mean a bigger fraction. 1/${UF[j]} cuts the whole into more parts than 1/${UF[i]}, so each part is smaller and its dot is nearer to 0.`, posO(p, 2, fnlPair(p).indexOf(wrong), "fnl"))];
    },
    variants: () => [],
    explain: (s) => `With the same top number, the smaller bottom number gives the bigger part: ${s.inputs[0]} is greater than ${s.inputs[1]}, so the answer is ${s.value}`,
    domain: [[0, 6], [0, 6], [0, 2], [0, 1]],
    difficulty: ([i, j]) => (UF[i] === 2 && UF[j] === 4 ? 1 : j - i === 1 ? 3 : 2),
    figure: ([i, j]) => ({ type: "numberline", from: 0, to: 1, step: 1, marks: [Math.round(1000 / UF[i]) / 1000, Math.round(1000 / UF[j]) / 1000] }),
    word: (p) => {
      const [x, y] = fnlPair(p);
      return `${nm(x + y)} and ${nm(x + y + 1)} start at the same gate and walk along a road 1 km long. One walks ${fr(1, x)} km and the other ${fr(1, y)} km. ${["Which distance is shorter?", "Which distance ends nearer to the far end of the road?", "Which distance is longer?"][p[2]]}`;
    },
    teach: {
      idea: "On a number line from 0 to 1, 1/2 is halfway and 1/4 is halfway to the half: cutting the line into more equal parts makes each part shorter, so 1/4 is nearer to 0 than 1/2.",
      method: "Picture the line from 0 to 1 cut into as many equal parts as the bottom number; the first mark is the unit fraction. More parts means the first mark is closer to 0.",
      visual: ([i, j]) => ({ type: "strips", top: UF[i], bottom: UF[j], shaded: 1 }),
      alternatives: [
        { id: "fold", title: "Fold a strip", kind: "conceptual", text: ["Fold a paper strip in half and mark the fold: that is 1/2.", "Fold it in half again: the first fold from the start is 1/4, closer to the start."], visual: () => ({ type: "numberline", from: 0, to: 1, step: 1, marks: [0.25, 0.5, 0.75] }) },
      ],
    },
    limits: "Two unit fractions from 1/2 to 1/10 on one line from 0 to 1; non-unit fractions are adfcmpu.",
  },
  {
    id: "adwtcap",
    arity: 2,
    title: "Estimating and checking weights and capacities",
    competency: EST,
    type: "integer",
    mc: true,
    // [mode, x]: 0 how far a weight estimate was from the weighing; 1 how many glasses a jug really fills (checking a guess);
    // 2 checking an estimated total weight: the real total in grams; 3 checking a guessed number of mugs that fill a bucket
    parse: none,
    reject: ([mode, x]) => {
      if (mode < 0 || mode > 3 || x < 0 || x > 39) return "Four kinds of weight and capacity problem.";
      for (let x0 = 0; x0 < x; x0++) if (wcText([mode, x0], false) === wcText([mode, x], false)) return "An earlier seed gives the same problem (distinct@1).";
      return null;
    },
    prompt: (p) => wcText(p, false),
    solve: (p) => {
      const W = wcNums(p);
      return { steps: [sp("work", W.op, EST, W.inputs, W.ans)], answer: W.ans };
    },
    // independent: count it out (kilograms one by one, glasses poured one at a time)
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const W = wcNums(p);
      const [a, b] = W.inputs as number[];
      if (p[0] === 0) {
        let n = 0;
        for (let x = Math.min(a, b); x < Math.max(a, b); x++) n++;
        return v === n;
      }
      if (p[0] === 2) {
        let g = b;
        for (let i = 0; i < a; i++) g += 1000;
        return v === g;
      }
      let left = a;
      let n = 0;
      while (left >= b) {
        left -= b;
        n++;
      }
      return left === 0 && v === n;
    },
    bugs: (p) => {
      const W = wcNums(p);
      const [a, b] = W.inputs as number[];
      if (p[0] === 0) return [Bg("added", "conceptual", EST, "The guess and the weighing were added. How far off the guess was is the difference: take the smaller from the larger.", a + b)];
      if (p[0] === 1) return [Bg("kept-guess", "procedural", EST, "The guess was given again. Check it: find how many glasses of that size the jug really holds.", W.guess ?? null), Bg("subtracted", "conceptual", EST, "The glass was taken away from the jug once. Filling glasses takes the glass away again and again: count how many times.", a - b)].filter((x) => x.predict !== W.ans);
      if (p[0] === 2) return [Bg("kept-guess", "procedural", EST, "The estimate was given again in grams. Check it: work out the real total from the two weights.", 1000 * (W.guess ?? 0)), Bg("kg-as-100", "recall", "MATH.measurement.standard-mass", "A kilogram was taken as 100 g; 1 kg = 1000 g.", 100 * a + b), Bg("added-numbers", "conceptual", "MATH.measurement.standard-mass", "The numbers were added without changing kilograms into grams first.", a + b)].filter((x) => x.predict !== W.ans);
      return [Bg("kept-guess", "procedural", EST, "The guess was given again. Check it: find how many mugs of that size the bucket really holds.", W.guess ?? null), Bg("litre-as-100", "recall", "MATH.measurement.capacity", "A litre was taken as 100 mL; 1 L = 1000 mL.", (a / 10) % b === 0 ? a / 10 / b : null), Bg("litres-only", "conceptual", "MATH.measurement.capacity", "The number of litres was given; change the litres into millilitres and see how many mugs fit.", a / 1000)].filter((x) => x.predict !== W.ans);
    },
    distractors: (p) => {
      const r = wcNums(p).ans;
      return [r + 1, r + 2, r > 1 ? r - 1 : r + 3];
    },
    variants: () => [],
    explain: (s) => `${s.op === "difference" ? `${s.inputs[0]} and ${s.inputs[1]} differ by` : s.op === "add" ? `${s.inputs[0]} kg and ${s.inputs[1]} g together are` : `${s.inputs[0]} mL holds ${s.inputs[1]} mL this many times:`} ${s.value}`,
    domain: [[0, 3], [0, 39]],
    difficulty: ([mode]) => (mode === 0 ? 1 : mode === 2 ? 2 : 3),
    figure: (p) => wcFigure(p),
    word: (p) => wcText(p, true),
    teach: {
      idea: "An estimate is a sensible guess; checking it by weighing or pouring tells how close it was. Estimates get better when we compare with things we know (a 1 kg packet of salt, a 1 L bottle).",
      method: "Make a guess using a known weight or container, then measure. The difference between the guess and the measurement shows how good the guess was.",
      visual: () => ({ type: "balance", left: "school bag", right: "1 kg + 1 kg + 1 kg" }),
      alternatives: [
        { id: "benchmark", title: "Compare with things you know", kind: "conceptual", text: ["A packet of salt weighs 1 kg; a water bottle often holds 1 L.", "Ask: is it about as heavy as 2 packets? 5 packets? That gives a sensible guess."] },
      ],
    },
    limits: "Whole kilograms and grams, and capacities in millilitres that share exactly; estimating by hand is done in class (a written task).",
  },
  {
    id: "adday",
    arity: 3,
    title: "Hours in days, days in weeks and months, months in years",
    competency: TIME,
    type: "integer",
    mc: true,
    // [mode, x, e]: 0 x days e hours → hours; 1 x weeks e days → days; 2 days in month x (e = 1) or in months x and x + 1 (e = 0); 3 x years e months → months
    parse: none,
    reject: ([mode, x, e]) => {
      if (mode === 0) return x < 1 || x > 10 || e < 0 || e > 11 ? "Up to 10 days and 11 hours." : null;
      if (mode === 1) return x < 1 || x > 12 || e < 0 || e > 6 ? "Up to 12 weeks and 6 days." : null;
      if (mode === 2) return x < 1 || x > 12 || e < 0 || e > 1 ? "One month or two months next to each other." : null;
      if (mode === 3) return x < 1 || x > 9 || e < 0 || e > 11 ? "Up to 9 years and 11 months." : null;
      return "Four kinds of time change.";
    },
    prompt: ([mode, x, e]) =>
      mode === 0
        ? `How many hours are there in ${pl(x, "day")}${e ? ` ${pl(e, "hour")}` : ""}?`
        : mode === 1
          ? `How many days are there in ${pl(x, "week")}${e ? ` ${pl(e, "day")}` : ""}?`
          : mode === 2
            ? e
              ? `How many days are there in ${MONTHS[x - 1]} (in a year that is not a leap year)?`
              : `How many days are there in ${MONTHS[x - 1]} and ${MONTHS[x % 12]} together (not in a leap year)?`
            : `How many months are there in ${pl(x, "year")}${e ? ` ${pl(e, "month")}` : ""}?`,
    solve: ([mode, x, e]) => {
      if (mode === 2) {
        const d1 = MDAYS[x - 1];
        const d2 = MDAYS[x % 12];
        return { steps: [sp("month", "recall", TIME, [MONTHS[x - 1]], d1), ...(e ? [] : [sp("next", "recall", TIME, [MONTHS[x % 12]], d2), sp("add", "add", ADD, [d1, d2], d1 + d2)])], answer: e ? d1 : d1 + d2 };
      }
      const k = [24, 7, 0, 12][mode];
      return { steps: [sp("convert", "multiply", MT, [x, k], k * x), sp("add", "add", ADD, [k * x, e], k * x + e)], answer: k * x + e };
    },
    // independent: count through a calendar of 2027 (not a leap year), or count hours/days/months one big unit at a time
    validate: ([mode, x, e], v) => {
      if (typeof v !== "number") return false;
      if (mode === 2) {
        let n = 0;
        const months = e ? [x - 1] : [x - 1, x % 12];
        for (const m of months) for (let d = 1; d <= 31; d++) if (new Date(Date.UTC(2027, m, d)).getUTCMonth() === m) n++;
        return v === n;
      }
      const k = [24, 7, 0, 12][mode];
      let n = e;
      for (let i = 0; i < x; i++) for (let j = 0; j < k; j++) n++;
      return v === n;
    },
    bugs: ([mode, x, e]) => {
      if (mode === 2) {
        const r = e ? MDAYS[x - 1] : MDAYS[x - 1] + MDAYS[x % 12];
        return [Bg("thirty-each", "recall", TIME, "Every month was taken to have 30 days. Months have 28, 30 or 31 days: use the knuckle rhyme or a calendar.", e ? 30 : 60), Bg("thirty-one-each", "recall", TIME, "Every month was taken to have 31 days. Some months have 30 days, and February has 28 (29 in a leap year).", e ? 31 : 62)].filter((b) => b.predict !== r);
      }
      const k = [24, 7, 0, 12][mode];
      const out: Bug[] = [Bg("not-converted", "conceptual", TIME, `The numbers were added as they are; change the ${["days into hours", "weeks into days", "", "years into months"][mode]} first.`, x + e)];
      if (mode === 0) out.push(Bg("day-as-12", "recall", TIME, "A day was taken as 12 hours. A whole day and night is 24 hours.", 12 * x + e));
      if (mode === 3) out.push(Bg("year-as-10", "recall", TIME, "A year was taken as 10 months, as if time were counted in tens. A year has 12 months.", 10 * x + e));
      if (mode === 1 && e) out.push(Bg("extra-days-left-out", "procedural", TIME, `The weeks were changed into days, but the extra ${pl(e, "day")} were not added.`, 7 * x));
      return out.filter((b) => b.predict !== k * x + e);
    },
    distractors: ([mode, x, e]) => {
      const r = mode === 2 ? (e ? MDAYS[x - 1] : MDAYS[x - 1] + MDAYS[x % 12]) : [24, 7, 0, 12][mode] * x + e;
      return [r + 1, r - 1, r + 2];
    },
    variants: () => [],
    explain: (s) => (s.id === "convert" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "add" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} has ${s.value} days`),
    domain: [[0, 3], [1, 12], [0, 11]],
    difficulty: ([mode, x]) => (mode === 1 && x <= 4 ? 1 : mode === 2 ? 2 : x > 5 ? 3 : 2),
    figure: ([mode, x]) => (mode === 2 ? { type: "table", head: ["Month", "Days"], rows: [[MONTHS[x - 1], "?"], [MONTHS[x % 12], "?"]] } : null),
    word: ([mode, x, e]) =>
      mode === 0
        ? x <= 5
          ? `A cricket test match went on for ${pl(x, "day")}${e ? ` and ${pl(e, "hour")}` : ""}, counting day and night. How many hours is that?`
          : `A temple festival went on for ${pl(x, "day")}${e ? ` and ${pl(e, "hour")}` : ""}, counting day and night. How many hours is that?`
        : mode === 1
          ? `${nm(x + e)}'s summer holiday lasts ${pl(x, "week")}${e ? ` and ${pl(e, "day")}` : ""}. How many days is the holiday?`
          : mode === 2
            ? e
              ? `A school library lends a book for the whole month of ${MONTHS[x - 1]}. For how many days can the book be kept (not in a leap year)?`
              : `A summer camp runs for the whole of ${MONTHS[x - 1]} and ${MONTHS[x % 12]} (not in a leap year). How many days long is the camp?`
            : `${nm(x)}'s little brother is ${pl(x, "year")}${e ? ` and ${pl(e, "month")}` : ""} old. How many months old is he?`,
    teach: {
      idea: "1 day = 24 hours, 1 week = 7 days, 1 year = 12 months; months have 28, 30 or 31 days.",
      method: "Multiply the bigger unit by how many small units it holds, then add the extra small units. For days in a month, use a calendar or the knuckle rhyme.",
      visual: ([mode, x]) => (mode === 2 ? { type: "table", head: ["Month", "Days"], rows: MONTHS.map((m, i) => [m, MDAYS[i]]) } : { type: "numberline", from: 0, to: [24, 7, 0, 12][mode] * Math.min(x, 4), step: [24, 7, 1, 12][mode] }),
      alternatives: [
        { id: "knuckles", title: "The knuckle way", kind: "conceptual", text: ["Make two fists. Say the months along the knuckles and the gaps between them.", "Months on a knuckle have 31 days; months in a gap have 30, except February (28, or 29 in a leap year)."] },
      ],
    },
    limits: "Days and hours, weeks and days, months, years and months; leap years are mentioned but not asked.",
  },
  {
    id: "adname",
    arity: 2,
    title: "Number names and expanded form of four-digit numbers",
    competency: TH,
    type: "choice",
    // [mode, x]: a four-digit number with a zero (seed x); mode 0 choose its number name, 1 choose the numeral for a number name, 2 choose its expanded form
    parse: none,
    reject: ([mode, x]) => {
      if (mode < 0 || mode > 2 || x < 0 || x > 59) return "Three ways of writing a four-digit number.";
      const n = nameNum(x);
      for (let x0 = 0; x0 < x; x0++) if (nameNum(x0) === n) return "An earlier seed gives the same number (distinct@1).";
      return null;
    },
    choices: (p) => shufO(p, "name", nameOptions(p)),
    prompt: ([mode, x]) => {
      const n = nameNum(x);
      return mode === 0 ? `Which is the number name of ${inr(n)}?` : mode === 1 ? `Which numeral is "${words(n)}"?` : `Which is the expanded form of ${inr(n)}?`;
    },
    solve: (p) => {
      const n = nameNum(p[1]);
      const d = digits(n);
      return { steps: [sp("place", "identify", TH, d, `${d[0]} thousands, ${d[1]} hundreds, ${d[2]} tens, ${d[3]} ones`), sp("write", "write", TH, [n], nameOptions(p)[0])], answer: posO(p, 4, 0, "name") };
    },
    // independent: read the chosen option back into a number (the name word by word, the expanded form term by term) and compare
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const o = shufO(p, "name", nameOptions(p))[v];
      if (!o) return false;
      const n = nameNum(p[1]);
      if (p[0] === 0) return nameToNum(o) === n;
      if (p[0] === 1) return Number(o.replace(/,/g, "")) === nameToNum(words(n));
      const terms = o.split("+").map((t) => t.trim());
      const pows = terms.map((t) => (/^[1-9]0*$/.test(t) ? t.length - 1 : -1));
      return pows.every((k) => k >= 0) && new Set(pows).size === pows.length && terms.reduce((s, t) => s + Number(t), 0) === n;
    },
    bugs: (p) => {
      const n = nameNum(p[1]);
      const place = ["hundreds", "tens", "ones"][String(n).slice(1).indexOf("0")];
      if (p[0] === 0) return [Bg("zero-place", "conceptual", TH, `The 0 in ${inr(n)} was read in the wrong place. A 0 keeps its place empty: here there are no ${place}.`, posO(p, 4, 1, "name"))];
      if (p[0] === 1) return [Bg("thousand-as-zero", "procedural", TH, `A 0 was written for the word "thousand", giving five digits. The thousands digit is just the number before "thousand", and the number has four digits.`, posO(p, 4, 3, "name"))];
      return [Bg("face-values", "conceptual", TH, "The digits were added as they are. In the expanded form each digit is written with its place value: thousands, hundreds, tens, ones.", posO(p, 4, 3, "name"))];
    },
    variants: () => [],
    explain: (s) => (s.id === "place" ? `In the place-value table: ${s.value}` : `So it is ${s.value}`),
    domain: [[0, 2], [0, 59]],
    difficulty: ([mode, x]) => (String(nameNum(x)).endsWith("0") ? 1 : mode === 2 ? 2 : 3),
    word: ([mode, x]) => {
      const n = nameNum(x);
      return mode === 0 ? `A cheque for ₹${inr(n)} must have the amount written in words. Which words should be written?` : mode === 1 ? `The newspaper says "${words(n)} people came to the temple festival". Which numeral is that?` : `A bank packs ₹${inr(n)} as bundles of ₹1000 (ten ₹100 notes each), single ₹100 notes, ₹10 notes and ₹1 coins, using as few as possible. Which shows the money in expanded form?`;
    },
    teach: {
      idea: "A four-digit number has thousands, hundreds, tens and ones. The name and the expanded form say each digit with its place; a 0 means that place is empty.",
      method: "Write the number in a Th H T O table. Read it as (thousands digit) thousand, (hundreds digit) hundred, then the tens and ones; skip a place with 0. The expanded form adds the value of each non-zero digit.",
      visual: ([, x]) => ({ type: "table", head: ["Th", "H", "T", "O"], rows: [digits(nameNum(x))] }),
      alternatives: [{ id: "money", title: "Think of notes", kind: "conceptual", text: ["₹4,507 is 4 bundles of ₹1000 (ten ₹100 notes each), 5 more notes of ₹100, no ₹10 notes and 7 coins of ₹1.", "So it is 4000 + 500 + 7, four thousand five hundred seven."] }],
    },
    limits: "Four-digit numbers with one zero; five-digit numbers and the international system are other families.",
  },
  {
    id: "adseq",
    arity: 3,
    title: "Continuing number patterns up to 10,000",
    competency: TH,
    type: "integer",
    mc: true,
    // [si, x, dir]: steps of [10, 25, 50, 100, 250, 500, 1000][si], start from seed x, forwards (0) or backwards (1)
    parse: none,
    reject: ([si, x, dir]) => {
      if (si < 0 || si > 6 || x < 0 || x > 39 || dir < 0 || dir > 1) return "A pattern with a step from 10 to 1000.";
      for (let x0 = 0; x0 < x; x0++) if (seqTerms([si, x0, dir]).join() === seqTerms([si, x, dir]).join()) return "An earlier seed gives the same pattern (distinct@1).";
      return null;
    },
    prompt: (p) => `Continue the number pattern: ${seqTerms(p).slice(0, 4).map(inr).join("; ")}; ? What is the next number?`,
    solve: (p) => {
      const t = seqTerms(p);
      return { steps: [sp("step", "subtract", TH, [t[1], t[0]], t[1] - t[0]), sp("next", t[1] > t[0] ? "add" : "subtract", TH, [t[3], Math.abs(t[1] - t[0])], t[4])], answer: t[4] };
    },
    // independent: the gaps between shown terms are all the same, and the answer keeps that gap
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const t = seqTerms(p).slice(0, 4);
      const all = [...t, v];
      const g = all.slice(1).map((x, i) => x - all[i]);
      return g.every((d) => d === g[0]) && g[0] !== 0;
    },
    bugs: (p) => {
      const t = seqTerms(p);
      const d = t[1] - t[0];
      const S = Math.abs(d);
      return [
        ...(S !== 10 ? [Bg("step-ten", "procedural", TH, `The pattern was continued in tens, but each step is ${inr(S)}: look at the gap between two numbers next to each other.`, t[3] + Math.sign(d) * 10)] : []),
        Bg("wrong-way", "conceptual", TH, `The numbers ${d > 0 ? "go up" : "go down"} each time; the step was taken the other way.`, t[3] - d),
        ...(S >= 100 && Math.floor(t[4] / (10 * S)) !== Math.floor(t[3] / (10 * S)) && d > 0 ? [Bg("no-carry", "procedural", TH, "The digit went past 9 but the next place was not made one more.", t[4] - 10 * S)] : []),
      ].filter((b) => (b.predict as number) >= 0 && b.predict !== t[4]);
    },
    distractors: (p) => {
      const t = seqTerms(p);
      const d = t[1] - t[0];
      return [t[4] + d, t[4] + Math.sign(d) * 100, t[3]].filter((x) => x >= 0 && x !== t[4]);
    },
    variants: () => [],
    explain: (s) => (s.id === "step" ? `${inr(Number(s.inputs[0]))} − ${inr(Number(s.inputs[1]))} = ${inr(Number(s.value))}: the step` : `${inr(Number(s.inputs[0]))} ${s.op === "add" ? "+" : "−"} ${inr(Number(s.inputs[1]))} = ${inr(Number(s.value))}`),
    domain: [[0, 6], [0, 39], [0, 1]],
    cap: 400,
    difficulty: ([si]) => (si === 0 || si === 3 || si === 6 ? 1 : si === 1 || si === 4 ? 3 : 2),
    word: (p) => {
      const t = seqTerms(p);
      return t[1] > t[0]
        ? `The odometer of a lorry is read at the end of each trip: ${t.slice(0, 4).map(inr).join("; ")} km. If the pattern goes on, what is the next reading?`
        : `On a long lorry journey, the kilometres still to go are noted at the end of each trip: ${t.slice(0, 4).map(inr).join("; ")} km. If the pattern goes on, how many kilometres are still to go after the next trip?`;
    },
    teach: {
      idea: "In a number pattern that adds (or takes away) the same step each time, find the step and keep going; when a place goes past 9, the next place goes up by one.",
      method: "Subtract two numbers next to each other to find the step. Add (or take away) the step from the last number, regrouping if a place passes 9 or 0.",
      visual: (p) => {
        const t = seqTerms(p);
        return { type: "numberline", from: Math.min(t[0], t[4]), to: Math.max(t[0], t[4]), step: Math.abs(t[1] - t[0]), jumps: t.slice(0, 4).map((x, i) => [x, t[i + 1]] as [number, number]) };
      },
      alternatives: [{ id: "place", title: "Watch the place that changes", kind: "procedural", text: ["Steps of 100 change the hundreds digit; steps of 1000 change the thousands digit.", "When the hundreds go from 9 to 10, write 0 hundreds and add one thousand."] }],
    },
    limits: "Patterns with one constant step from 10 to 1000, within 0 to 10,000; growing steps are other families.",
  },
  {
    id: "adestchk",
    arity: 3,
    title: "Checking an answer by estimating",
    competency: EST,
    type: "choice",
    // [op, x, k]: a three-digit number + or − a two- or three-digit one (seed x); the answer shown is right (k 0) or a common slip (k 1, 2)
    parse: none,
    reject: (p) => {
      const [op, x, k] = p;
      if (op < 0 || op > 1 || x < 0 || x > 59 || k < 0 || k > 2) return "One worked sum or difference to check.";
      const E = estNums(op, x);
      if (!E) return "The numbers do not fit.";
      if (k === 0) return null;
      const c = E.slips[k - 1];
      return c === null || c < 0 || c === E.exact || Math.abs(c - E.est) < 40 || (k === 2 && c === E.slips[0]) ? "The slip is far from the estimate (and differs from the other slip)." : null;
    },
    choices: (p) => shufO(p, "est", CHECK3),
    prompt: (p) => {
      const [op, x] = p;
      const E = estNums(op, x)!;
      return `${nm(x)} worked out ${E.a} ${op ? "−" : "+"} ${E.b} and got ${estClaim(p)}. Round each number to the nearest ten to estimate the answer. Is the answer sensible?`;
    },
    solve: (p) => {
      const [op, x] = p;
      const E = estNums(op, x)!;
      const c = estClaim(p);
      const w = Math.abs(c - E.est) <= 15 ? 0 : c < E.est ? 1 : 2;
      return { steps: [sp("round", "round", ROUND, [E.a, E.b], `${r10(E.a)} and ${r10(E.b)}`), sp("estimate", op ? "subtract" : "add", EST, [r10(E.a), r10(E.b)], E.est), sp("judge", "compare", EST, [c, E.est], CHECK3[w])], answer: posO(p, 3, w, "est") };
    },
    // independent: work the exact answer out by counting on (or back) in hundreds, tens and ones, and see whether the shown answer is it, below it or above it
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [op, x] = p;
      const E = estNums(op, x)!;
      let t = E.a;
      const s = op ? -1 : 1;
      for (let i = 0; i < Math.floor(E.b / 100); i++) t += s * 100;
      for (let i = 0; i < Math.floor(E.b / 10) % 10; i++) t += s * 10;
      for (let i = 0; i < E.b % 10; i++) t += s;
      const c = estClaim(p);
      const w = c === t ? 0 : c < t ? 1 : 2;
      return shufO(p, "est", CHECK3)[v] === CHECK3[w];
    },
    bugs: (p) => {
      const [op, x, k] = p;
      const E = estNums(op, x)!;
      if (k > 0) return [Bg("trusted-working", "procedural", EST, `The working was trusted without checking. The estimate is about ${E.est}, which is far from ${estClaim(p)}, so something went wrong.`, posO(p, 3, 0, "est"))];
      return E.exact !== E.est ? [Bg("estimate-must-match", "conceptual", EST, `The answer was rejected because it is not exactly ${E.est}. An estimate is only close: ${E.exact} is near ${E.est}, so it is sensible.`, posO(p, 3, E.exact < E.est ? 1 : 2, "est"))] : [];
    },
    variants: () => [],
    explain: (s) => (s.id === "round" ? `Round: ${s.value}` : s.id === "estimate" ? `Estimate: ${s.inputs[0]} ${s.op === "subtract" ? "−" : "+"} ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} compared with about ${s.inputs[1]}: ${s.value}`),
    domain: [[0, 1], [0, 59], [0, 2]],
    difficulty: ([op, x, k]) => (k === 0 ? 2 : (estNums(op, x)?.b ?? 0) < 100 ? 1 : 3),
    word: (p) => {
      const [op, x] = p;
      const E = estNums(op, x)!;
      return op ? `A shop had ${E.a} kg of rice and sold ${E.b} kg. The shopkeeper's son says ${estClaim(p)} kg is left. Estimate by rounding to the nearest ten: is his answer sensible?` : `A school has ${E.a} children in the morning school and ${E.b} in the evening school. The clerk adds them and writes ${estClaim(p)}. Estimate by rounding to the nearest ten: is the clerk's answer sensible?`;
    },
    teach: {
      idea: "An estimate made with rounded numbers is close to the exact answer, so an answer far from the estimate must be wrong.",
      method: "Round each number to the nearest ten and work out the estimate in your head. If the answer is close (within about 15 here), it is sensible; if it is much smaller or bigger, check the working again.",
      visual: (p) => {
        const E = estNums(p[0], p[1])!;
        return { type: "numberline", from: Math.max(0, Math.min(E.est, estClaim(p)) - 50), to: Math.max(E.est, estClaim(p)) + 50, step: 50, marks: [E.est, estClaim(p)] };
      },
      alternatives: [{ id: "front_end", title: "Use the hundreds first", kind: "procedural", text: ["Add (or subtract) the hundreds only: 468 + 57 is more than 400 + 50 = 450.", "An answer below that cannot be right."] }],
    },
    limits: "Three-digit numbers with a two- or three-digit number, slips that land at least 40 from the estimate; finer judgements are left to class discussion.",
  },
  {
    id: "adcolx",
    arity: 3,
    title: "Column addition and subtraction from three to five digits, with and without regrouping",
    competency: MDAS,
    type: "integer",
    mc: true,
    // [kind, x, op]: kind 0 three digits ± two digits; 1 three digits without regrouping; 2 four digits (x even without, x odd with regrouping); 3 five digits; op 0 add, 1 subtract
    parse: none,
    reject: (p) => {
      const [kind, x, op] = p;
      if (kind < 0 || kind > 3 || x < 0 || x > 149 || op < 0 || op > 1) return "Two numbers of three to five digits.";
      const [a, b] = colxNums(p);
      if (op === 1 && b >= a) return "The first number is larger.";
      const L = String(a).length;
      const rg = needsRegroup(a, b, op, L);
      if (kind === 1 && rg) return "No regrouping for this kind.";
      if (kind === 2 && (x % 2 === 1) !== rg) return "Regrouping as the seed says.";
      if (op === 0 && a + b > 99999) return "Up to five digits.";
      return null;
    },
    prompt: (p) => {
      const [a, b] = colxNums(p);
      return `${inr(a)} ${p[2] ? "−" : "+"} ${inr(b)} = ?`;
    },
    solve: (p) => {
      const [a, b] = colxNums(p);
      const op = p[2];
      const L = String(Math.max(a, b)).length;
      const A = digitsL(a, L);
      const Bd = digitsL(b, L);
      const names = ["ones", "tens", "hundreds", "thousands", "ten thousands"];
      const steps: Step[] = [];
      let c = 0;
      for (let i = L - 1; i >= 0; i--) {
        let v = op ? A[i] - Bd[i] - c : A[i] + Bd[i] + c;
        const nc = op ? (v < 0 ? 1 : 0) : v >= 10 ? 1 : 0;
        if (op && v < 0) v += 10;
        steps.push(sp(names[L - 1 - i], op ? "subtract" : "add", nc || c ? (op ? SUBR : ADDR) : op ? "MATH.number.subtraction" : ADD, [A[i], Bd[i], c], op ? v : v % 10));
        c = nc;
      }
      return { steps, answer: op ? a - b : a + b };
    },
    // independent: the inverse operation (the answer and the second number give back the first)
    validate: (p, v) => {
      if (typeof v !== "number" || v < 0) return false;
      const [a, b] = colxNums(p);
      return p[2] ? v + b === a : v - b === a;
    },
    bugs: (p) => {
      const [a, b] = colxNums(p);
      const [kind, , op] = p;
      const L = String(Math.max(a, b)).length;
      const A = digitsL(a, L);
      const Bd = digitsL(b, L);
      const r = op ? a - b : a + b;
      const out: Bug[] = [];
      if (op === 0) out.push(Bg("no-carry", "conceptual", PV, "A ten (or hundred, or thousand) made in one column was not carried to the next column.", Number(A.map((d, i) => (d + Bd[i]) % 10).join(""))));
      else {
        out.push(Bg("smaller-from-larger", "conceptual", SUBR, "In each column the smaller digit was taken from the larger one. When the top digit is smaller, regroup: exchange 1 from the next column for 10.", Number(A.map((d, i) => Math.abs(d - Bd[i])).join(""))));
        let c = 0;
        let w = 0;
        for (let i = L - 1, pv = 1; i >= 0; i--, pv *= 10) {
          const top = A[i];
          const d = top < Bd[i] ? top + 10 - Bd[i] : top - Bd[i];
          c = top < Bd[i] ? 1 : 0;
          w += d * pv;
        }
        void c;
        out.push(Bg("not-reduced", "procedural", SUBR, "A column was regrouped, but the column it came from was not made one less.", w));
      }
      if (kind === 0) {
        const m = op ? a - 10 * b : a + 10 * b;
        if (m >= 0) out.push(Bg("misaligned", "procedural", PV, `${b} was written under the wrong places (its tens under the hundreds). Line up the ones under the ones.`, m));
      }
      return out.filter((x) => x.predict !== r);
    },
    distractors: (p) => {
      const [a, b] = colxNums(p);
      const r = p[2] ? a - b : a + b;
      return [r + 10, r - 100, r + 1000];
    },
    variants: () => [],
    explain: (s) => {
      const [x, y, c] = s.inputs.map(Number);
      const name = `${s.id[0].toUpperCase()}${s.id.slice(1)}`;
      return s.op === "add" ? `${name}: ${x} + ${y}${c ? " + 1 carried" : ""}: write ${s.value}` : `${name}: ${c ? `${x} − 1 given away, ` : ""}${x - c < y ? "regroup, " : ""}${x - c < y ? x - c + 10 : x - c} − ${y} = ${s.value}`;
    },
    domain: [[0, 3], [0, 149], [0, 1]],
    cap: 500,
    difficulty: ([kind, x]) => (kind === 1 || (kind === 2 && x % 2 === 0) ? 1 : kind === 3 ? 3 : 2),
    figure: (p) => {
      const [a, b] = colxNums(p);
      const L = String(Math.max(a, b)).length;
      const head = ["", ...["TTh", "Th", "H", "T", "O"].slice(5 - L)];
      return { type: "table", head, rows: [["", ...digitsL(a, L)], [p[2] ? "−" : "+", ...digitsL(b, L).map((d, i) => (i < L - String(b).length ? "" : d))]] };
    },
    word: (p) => {
      const [a, b] = colxNums(p);
      const [kind, x, op] = p;
      if (op === 0) return kind >= 2 ? `In a census, a town counted ${inr(a)} men and ${inr(b)} women. How many people were counted in all?` : `A temple received ${inr(a)} visitors on Saturday and ${inr(b)} on Sunday. How many visitors came on the two days?`;
      return x % 2 ? `A village had ${inr(a)} people in 2011. In 2021 it had ${inr(b)} people. By how many did the number of people decrease?` : `A school library had ${inr(b)} books last year and has ${inr(a)} books now. By how many books has it increased?`;
    },
    teach: {
      idea: "Write the numbers with ones under ones, tens under tens and so on; each column is added or subtracted on its own, passing a 1 to the next column (or taking one from it) when needed.",
      method: "Start with the ones and work left. Adding: if a column makes 10 or more, write the ones digit and carry 1. Subtracting: if the top digit is smaller, regroup 1 from the next column as 10.",
      visual: (p) => {
        const [a] = colxNums(p);
        return { type: "table", head: ["TTh", "Th", "H", "T", "O"].slice(5 - String(a).length), rows: [digitsL(a, String(a).length)] };
      },
      alternatives: [{ id: "check_inverse", title: "Check with the inverse", kind: "procedural", text: ["After subtracting, add your answer to the number you took away: you should get the first number.", "After adding, take one number away from your answer: you should get the other."] }],
    },
    limits: "Three-digit with two-digit numbers, three- and four-digit numbers with and without regrouping, and five-digit numbers, up to 99,999.",
  },
  {
    id: "advenn",
    arity: 5,
    title: "Only one, both or neither: reading a two-way table",
    competency: TAB,
    type: "integer",
    mc: true,
    // [a, b, c, d, q]: a play both games, b cricket only, c kho-kho only, d neither; q 0 exactly one game, 1 cricket, 2 at least one, 3 the whole class
    parse: none,
    reject: ([a, b, c, d, q]) => (a < 1 || a > 9 || b < 1 || b > 12 || c < 1 || c > 12 || d < 1 || d > 9 || q < 0 || q > 3 ? "Counts in a 2 × 2 table of two games." : b === c ? "The two only-one counts differ." : null),
    keep: ([a, b, c, d, q]) => (a * 3 + b + 5 * c + d + q) % 9 === 0,
    prompt: ([, , , , q]) => `The table shows which of two games, cricket and kho-kho, the children of a class play. ${["How many children play exactly one of the two games?", "How many children play cricket?", "How many children play at least one of the games?", "How many children are there in the class?"][q]}`,
    solve: ([a, b, c, d, q]) => {
      const cells = [[b, c], [a, b], [a, b, c], [a, b, c, d]][q];
      return { steps: [sp("cells", "choose cells", TAB, [q], cells.join(", ")), sp("add", "add", ADD, cells, cells.reduce((x, y) => x + y, 0))], answer: cells.reduce((x, y) => x + y, 0) };
    },
    // independent: list the children one by one by the two answers (plays cricket? plays kho-kho?) and count those that fit
    validate: ([a, b, c, d, q], v) => {
      const kids: [boolean, boolean][] = [];
      for (let i = 0; i < a; i++) kids.push([true, true]);
      for (let i = 0; i < b; i++) kids.push([true, false]);
      for (let i = 0; i < c; i++) kids.push([false, true]);
      for (let i = 0; i < d; i++) kids.push([false, false]);
      const fits = (k: [boolean, boolean]) => (q === 0 ? k[0] !== k[1] : q === 1 ? k[0] : q === 2 ? k[0] || k[1] : true);
      return v === kids.filter(fits).length;
    },
    bugs: ([a, b, c, d, q]) => {
      if (q === 0) return [Bg("counted-both", "conceptual", TAB, "The children who play both games were counted too. 'Exactly one' leaves out those who play both and those who play neither.", a + b + c), Bg("one-cell", "procedural", TAB, "Only one of the 'only one game' cells was taken; there are two such groups.", b)];
      if (q === 1) return [Bg("only-cell", "conceptual", TAB, "Only the children who play cricket and not kho-kho were counted; those who play both also play cricket.", b)];
      if (q === 2) return [Bg("added-neither", "conceptual", TAB, "The children who play neither game were counted too.", a + b + c + d), Bg("both-twice", "procedural", TAB, "The children who play both were counted once for each game, so twice.", 2 * a + b + c)];
      return [Bg("missed-neither", "procedural", TAB, "The children who play neither game were left out; they are in the class too.", a + b + c)];
    },
    distractors: ([a, b, c, d, q]) => {
      const r = [b + c, a + b, a + b + c, a + b + c + d][q];
      return [r + 1, r - 1, r + a];
    },
    variants: () => [],
    explain: (s) => (s.id === "cells" ? `Use the cells that fit: ${s.value}` : `${s.inputs.join(" + ")} = ${s.value}`),
    domain: [[1, 9], [1, 12], [1, 12], [1, 9], [0, 3]],
    cap: 400,
    difficulty: ([, , , , q]) => (q === 1 || q === 3 ? 2 : 3),
    figure: ([a, b, c, d]) => ({ type: "table", head: ["", "Plays kho-kho", "Does not play kho-kho"], rows: [["Plays cricket", a, b], ["Does not play cricket", c, d]] }),
    word: ([a, b, c, d, q]) => `In ${nm(a + b)}'s class, ${pl(a, "child plays", "children play")} both cricket and kho-kho, ${b} ${b === 1 ? "plays" : "play"} only cricket, ${c} ${c === 1 ? "plays" : "play"} only kho-kho and ${d} ${d === 1 ? "plays" : "play"} neither. ${["How many play exactly one of the games?", "How many play cricket?", "How many play at least one game?", "How many children are in the class?"][q]}`,
    teach: {
      idea: "Each child is in exactly one cell: both games, cricket only, kho-kho only, or neither. 'Exactly one' is the two 'only' cells; 'cricket' includes those who play both; 'at least one' is everyone except 'neither'.",
      method: "Decide which cells fit the question, then add only those cells.",
      visual: ([a, b, c, d]) => ({ type: "table", head: ["", "Plays kho-kho", "Does not play kho-kho"], rows: [["Plays cricket", a, b], ["Does not play cricket", c, d]] }),
      alternatives: [{ id: "circles", title: "Two overlapping circles", kind: "conceptual", text: ["Draw a circle for cricket and one for kho-kho that overlap. Both games go in the overlap; only one game in the rest of a circle; neither outside both circles.", "Read the question and shade the parts it asks for."] }],
    },
    limits: "Two yes/no questions about one class, counts up to 12 in a cell; three sets are other families.",
  },
  {
    id: "adshade",
    arity: 4,
    title: "How many squares to shade to show a fraction",
    competency: FMOD,
    type: "integer",
    mc: true,
    // [r, c, a, b]: shade a/b of an r × c grid
    parse: none,
    reject: ([r, c, a, b]) => (r < 1 || r > 6 || c < 2 || c > 10 || r * c > 40 || b < 2 || b > 10 || a < 1 || a >= b || gcd(a, b) !== 1 || (r * c) % b !== 0 || (r * c) / b < 2 ? "A fraction in simplest form of a grid of up to 40 squares that shares exactly." : null),
    prompt: ([r, c, a, b]) => `The grid in the picture has ${r * c} equal squares. How many squares must be shaded to show ${frw(a, b)} of the grid?`,
    solve: ([r, c, a, b]) => ({ steps: [
      { ...sp("part", "divide", SHARE, [r * c, b], (r * c) / b), justification: { rule: "quotient" as const, dividend: r * c, divisor: b, purpose: "size of one equal part of the grid" } },
      { ...sp("take", "multiply", MT, [a, (r * c) / b], (a * r * c) / b), justification: { rule: "product-counting" as const, what: "squares to shade", factors: [a, (r * c) / b] } },
    ], answer: (a * r * c) / b }),
    // independent: shade squares one at a time until shaded ÷ all equals the fraction
    validate: ([r, c, a, b], v) => {
      if (typeof v !== "number") return false;
      for (let s = 0; s <= r * c; s++) if (s * b === a * r * c) return v === s;
      return false;
    },
    bugs: ([r, c, a, b]) => {
      const T = r * c;
      const ans = (a * T) / b;
      return [
        Bg("top-number", "conceptual", FMOD, `${a} squares were shaded, the top number. The top number counts parts of size 1/${b} of the WHOLE grid, and each such part here is ${T / b} squares.`, a),
        ...(a > 1 ? [Bg("one-part", "procedural", UNIT, `Only 1/${b} of the grid was found (${T / b} squares); ${a}/${b} is ${a} of those parts.`, T / b)] : []),
        Bg("unshaded", "procedural", FMOD, "The squares left unshaded were counted.", T - ans),
      ].filter((x) => x.predict !== ans);
    },
    distractors: ([r, c, a, b]) => {
      const ans = (a * r * c) / b;
      return [ans + 1, ans - 1, b].filter((x) => x > 0 && x !== ans);
    },
    variants: () => [],
    explain: (s) => (s.id === "part" ? `1/${s.inputs[1]} of ${s.inputs[0]} squares is ${s.value} squares` : `${s.inputs[0]} of those parts: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} squares`),
    domain: [[1, 6], [2, 10], [1, 9], [2, 10]],
    cap: 300,
    difficulty: ([r, c, a, b]) => (a === 1 && r * c <= 12 ? 1 : (r * c) / b >= 4 && a > 1 ? 3 : 2),
    figure: ([r, c]) => ({ type: "grid", rows: r, cols: c, shaded: 0 }),
    word: ([r, c, a, b]) => `A rangoli is drawn on a floor of ${r * c} equal tiles. ${nm(r + c + a)} wants to colour ${fr(a, b)} of the tiles red. How many tiles should be coloured red?`,
    teach: {
      idea: "The same fraction can be shown on wholes of different sizes: 3/4 of 8 squares is 6 squares, 3/4 of 12 squares is 9 squares, but each time it is 3 of 4 equal parts of the whole.",
      method: "Share the squares into as many equal groups as the bottom number, then shade as many groups as the top number.",
      visual: ([r, c, a, b]) => ({ type: "grid", rows: r, cols: c, shaded: (a * r * c) / b }),
      alternatives: [{ id: "two_wholes", title: "Same fraction, different wholes", kind: "conceptual", text: ["Shade 1/2 of a 2 × 2 grid and 1/2 of a 2 × 4 grid.", "Different numbers of squares are shaded (2 and 4), but each is half of its own grid."], visual: () => ({ type: "grid", rows: 2, cols: 4, shaded: 4 }) }],
    },
    limits: "Fractions in simplest form of grids up to 40 squares (shading row by row in the picture's answer); drawing shapes is done in class.",
  },
  {
    id: "admental",
    arity: 2,
    title: "Mental shortcuts: making 100 and 10,000, and taking away or adding 9 or 99",
    competency: MDAS,
    type: "integer",
    mc: true,
    // [mode, x]: 0 n + ? = 100; 1 n + ? = 10,000; 2 n − 9; 3 n − 99; 4 n + 99
    parse: none,
    reject: ([mode, x]) => {
      if (mode < 0 || mode > 4 || x < 0 || x > 79) return "Five kinds of mental shortcut.";
      const n = mentN(mode, x);
      return (mode <= 1 && n % 10 === 0) ? "Not already a multiple of ten." : null;
    },
    prompt: ([mode, x]) => {
      const n = mentN(mode, x);
      return [`Work it out in your head: ${n} + ? = 100. What is the missing number?`, `Work it out in your head: ${inr(n)} + ? = 10,000. What is the missing number?`, `Use a shortcut (take away 10, then add 1 back): ${inr(n)} − 9 = ?`, `Use a shortcut (take away 100, then add 1 back): ${inr(n)} − 99 = ?`, `Use a shortcut (add 100, then take 1 away): ${inr(n)} + 99 = ?`][mode];
    },
    solve: ([mode, x]) => {
      const n = mentN(mode, x);
      if (mode <= 1) {
        const T = mode ? 10000 : 100;
        return { steps: [sp("nines", "subtract", PV, [T - 1, n], T - 1 - n), sp("one", "add", ADD, [T - 1 - n, 1], T - n)], answer: T - n };
      }
      const [k, f] = mode === 2 ? [10, 1] : mode === 3 ? [100, 1] : [100, -1];
      const s = mode === 4 ? 1 : -1;
      return { steps: [sp("round", s > 0 ? "add" : "subtract", MDAS, [n, k], n + s * k), sp("adjust", f > 0 ? "add" : "subtract", MDAS, [n + s * k, 1], n + s * (k - 1))], answer: n + s * (k - 1) };
    },
    // independent: check with the inverse (add back the number taken, or the missing part)
    validate: ([mode, x], v) => {
      if (typeof v !== "number") return false;
      const n = mentN(mode, x);
      if (mode === 0) return v + n === 100;
      if (mode === 1) return v + n === 10000;
      if (mode === 2) return v + 9 === n;
      if (mode === 3) return v + 99 === n;
      return v - 99 === n;
    },
    bugs: ([mode, x]) => {
      const n = mentN(mode, x);
      if (mode <= 1) {
        const T = mode ? 10000 : 100;
        const d = String(n).split("").map(Number);
        return [
          ...(d.every((q) => q > 0) ? [Bg("each-to-ten", "conceptual", MDAS, "Each digit was made up to 10. Only the ones make 10; the other places each make 9, because the ten carried over fills the rest.", Number(d.map((q) => 10 - q).join("")))] : []),
          Bg("made-nines", "procedural", MDAS, `The number was made up to ${inr(T - 1)}, one short of ${inr(T)}.`, T - 1 - n),
        ].filter((b) => b.predict !== T - n);
      }
      if (mode === 2) return [Bg("no-adjust", "procedural", MDAS, "10 was taken away, but the extra 1 was not added back: 9 is one less than 10.", n - 10), Bg("adjust-wrong-way", "procedural", MDAS, "10 was taken away and then 1 more was taken away; since 10 is one too many, add 1 back.", n - 11)];
      if (mode === 3) return [Bg("no-adjust", "procedural", MDAS, "100 was taken away, but the extra 1 was not added back: 99 is one less than 100.", n - 100), Bg("adjust-wrong-way", "procedural", MDAS, "100 was taken away and then 1 more was taken away; since 100 is one too many, add 1 back.", n - 101)];
      return [Bg("no-adjust", "procedural", MDAS, "100 was added, but the extra 1 was not taken away: 99 is one less than 100.", n + 100), Bg("adjust-wrong-way", "procedural", MDAS, "100 was added and then 1 more was added; since 100 is one too many, take 1 away.", n + 101)];
    },
    distractors: ([mode, x]) => {
      const n = mentN(mode, x);
      const r = mode === 0 ? 100 - n : mode === 1 ? 10000 - n : mode === 2 ? n - 9 : mode === 3 ? n - 99 : n + 99;
      return [r + 10, r - 1, r + 1];
    },
    variants: () => [],
    explain: (s) => (s.id === "nines" ? `Up to ${inr(Number(s.inputs[0]))}: each digit makes 9 with the digit below it, ${inr(Number(s.value))}` : s.id === "one" ? `One more makes the round number: ${inr(Number(s.value))}` : `${inr(Number(s.inputs[0]))} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${inr(Number(s.value))}`),
    domain: [[0, 4], [0, 79]],
    difficulty: ([mode]) => (mode === 0 || mode === 2 ? 1 : mode === 1 ? 3 : 2),
    word: ([mode, x]) => {
      const n = mentN(mode, x);
      return [`A cricket team needs 100 runs and has ${n}. How many more runs are needed?`, `A school wants to plant 10,000 saplings and has planted ${inr(n)}. How many more must be planted?`, `${nm(x)} has ₹${inr(n)} and buys a pen for ₹9. How much money is left?`, `${nm(x)} has ₹${inr(n)} and buys a book for ₹99. How much money is left?`, `${nm(x)} has ₹${inr(n)} and gets ₹99 more as a gift. How much does ${nm(x)} have now?`][mode];
    },
    teach: {
      idea: "Round numbers are easy: 9 is 10 − 1 and 99 is 100 − 1. To make 100 or 10,000, every digit pairs to 9 except the ones, which pair to 10.",
      method: "To take away 9, take away 10 and add 1 back; to add 99, add 100 and take 1 away. To make 10,000, find what makes each digit 9 and the ones digit 10.",
      visual: ([mode, x]) => {
        const n = mentN(mode, x);
        return mode <= 1 ? { type: "numberline", from: n, to: mode ? 10000 : 100, jumps: [[n, (mode ? 10000 : 100) - 1], [(mode ? 10000 : 100) - 1, mode ? 10000 : 100]] } : { type: "numberline", from: Math.min(n, n + (mode === 4 ? 100 : -(mode === 2 ? 10 : 100))), to: Math.max(n, n + (mode === 4 ? 100 : -(mode === 2 ? 10 : 100))), jumps: [[n, n + (mode === 4 ? 100 : -(mode === 2 ? 10 : 100))]] };
      },
      alternatives: [{ id: "compensate", title: "Too much, then fix it", kind: "conceptual", text: ["Taking away 99 is taking away 100, which is 1 too many.", "So give that 1 back: 562 − 99 = 462 + 1 = 463."] }],
    },
    limits: "Complements of two-digit numbers to 100 and four-digit numbers to 10,000 (to 1000 is ad1000), and subtracting 9 or 99 or adding 99 to three- and four-digit numbers.",
  },
  {
    id: "adrace",
    arity: 3,
    title: "Race times, and choosing seconds, minutes or hours",
    competency: TIME,
    type: "choice",
    // [mode, x, q]: mode 0 three race times (seed x), q 0 the fastest, 1 the slowest; mode 1 the right unit for activity x (q = 0)
    parse: none,
    reject: ([mode, x, q]) => {
      if (mode === 0) return x < 0 || x > 59 || q < 0 || q > 1 ? "Three race times." : null;
      if (mode === 1) return x < 0 || x >= ACTS.length || q !== 0 ? "One activity." : null;
      return "Two kinds of question.";
    },
    choices: (p) => (p[0] === 0 ? shufO(p, "race", raceNames(p[1])) : shufO(p, "unit", UNITS3)),
    prompt: ([mode, x, q]) =>
      mode === 0
        ? `In a running race, ${raceNames(x).map((n, i) => `${n} took ${tShow(raceTimes(x)[i])}`).join(", ")}. Who was the ${q ? "slowest" : "fastest"}?`
        : `Which unit is best for measuring how long it takes to ${ACTS[x][0]}?`,
    solve: (p) => {
      const [mode, x, q] = p;
      if (mode === 1) return { steps: [sp("think", "estimate", TIME, [ACTS[x][0]], ACTS[x][1])], answer: posO(p, 3, UNITS3.indexOf(ACTS[x][1]), "unit") };
      const T = raceTimes(x);
      const k = T.indexOf(q ? Math.max(...T) : Math.min(...T));
      return { steps: [sp("seconds", "convert", TIME, T.map(tShow), T.join(", ")), sp("compare", "compare", TIME, [q ? "most" : "least"], raceNames(x)[k])], answer: posO(p, 3, k, "race") };
    },
    // independent: read each shown time back into seconds and compare (races); for activities, the unit that fits a typical length of time
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [mode, x, q] = p;
      if (mode === 1) {
        const s = ACTS[x][2];
        return shufO(p, "unit", UNITS3)[v] === (s < 90 ? "seconds" : s < 90 * 60 ? "minutes" : "hours");
      }
      const secs = raceTimes(x).map((t) => {
        const m = tShow(t).match(/^(?:(\d+) min )?(\d+) s$/)!;
        return 60 * Number(m[1] ?? 0) + Number(m[2]);
      });
      const who = shufO(p, "race", raceNames(x))[v];
      const i = raceNames(x).indexOf(who);
      return secs.every((s, j) => j === i || (q ? secs[i] > s : secs[i] < s));
    },
    bugs: (p) => {
      const [mode, x, q] = p;
      if (mode === 1) return [];
      const T = raceTimes(x);
      const right = T.indexOf(q ? Math.max(...T) : Math.min(...T));
      const shown = T.map((t) => t % 60);
      const k = shown.indexOf(q ? Math.max(...shown) : Math.min(...shown));
      const opp = T.indexOf(q ? Math.min(...T) : Math.max(...T));
      return [
        ...(k !== right ? [Bg("seconds-only", "conceptual", TIME, "Only the numbers of seconds were compared and the minutes were left out. Change each time into seconds first: 1 min 5 s is 65 s.", posO(p, 3, k, "race"))] : []),
        Bg("more-is-faster", "conceptual", TIME, `The ${q ? "smallest" : "biggest"} time was taken as the ${q ? "slowest" : "fastest"}. In a race, the fastest runner takes the LEAST time.`, posO(p, 3, opp, "race")),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "seconds" ? `In seconds the times are ${s.value}` : s.id === "think" ? `It usually takes a number of ${s.value}` : `The ${s.inputs[0]} time is ${s.value}'s`),
    domain: [[0, 1], [0, 59], [0, 1]],
    difficulty: ([mode, x]) => (mode === 1 ? 1 : raceTimes(x).some((t) => t >= 60) && raceTimes(x).some((t) => t < 60) ? 3 : 2),
    word: ([mode, x, q]) =>
      mode === 0
        ? `At the school sports day, the times for one lap were: ${raceNames(x).map((n, i) => `${n} ${tShow(raceTimes(x)[i])}`).join(", ")}. Who ${q ? "came last" : "won"}?`
        : `${nm(x)} wants to time how long it takes to ${ACTS[x][0]}. Which unit should ${nm(x)} use?`,
    teach: {
      idea: "1 minute = 60 seconds. In a race the fastest runner takes the least time. Short things (a clap, a 100 m run) are timed in seconds, longer ones in minutes, very long ones in hours.",
      method: "Change every time into seconds (minutes × 60 + seconds), then compare. For choosing a unit, think how long the activity usually takes.",
      visual: ([mode, x]) => (mode === 0 ? { type: "bars", title: "Race times in seconds", labels: raceNames(x), values: raceTimes(x) } : { type: "clock", h: 12, m: 0 }),
      alternatives: [{ id: "count", title: "Count it out", kind: "conceptual", text: ["Say 'one thousand one, one thousand two …': each is about a second.", "If you would be counting for a long time, minutes (or hours) are the better unit."] }],
    },
    limits: "Three race times from 45 seconds to 2 min 10 s; the unit for everyday activities that clearly take seconds, minutes or hours.",
  },
  {
    id: "addur",
    arity: 2,
    title: "Adding durations and changing seconds into minutes and seconds",
    competency: TIME,
    type: "tuple",
    mc: true,
    // [mode, x]: 0 add two durations in hours and minutes; 1 add two in minutes and seconds; 2 seconds into (minutes, seconds)
    parse: none,
    reject: ([mode, x]) => {
      if (mode < 0 || mode > 2 || x < 0 || x > 99) return "Three kinds of duration question.";
      if (mode < 2) for (let x0 = 0; x0 < x; x0++) if (durParts(mode, x0).join() === durParts(mode, x).join()) return "An earlier seed gives the same durations (distinct@1).";
      return null;
    },
    prompt: ([mode, x]) => {
      if (mode === 2) return `Write ${durSecs(x)} seconds in minutes and seconds. Write the answer as (minutes, seconds).`;
      const [a, b, c, d] = durParts(mode, x);
      return mode === 0 ? `A bus ride takes ${a} h ${b} min and a train ride after it takes ${c} h ${d} min. How long is the whole journey? Write the answer as (hours, minutes).` : `${nm(x)} runs two laps in ${a} min ${b} s and ${c} min ${d} s. What is the total time? Write the answer as (minutes, seconds).`;
    },
    solve: ([mode, x]) => {
      if (mode === 2) {
        const N = durSecs(x);
        return { steps: [sp("minutes", "divide", TIME, [N, 60], Math.floor(N / 60)), sp("left", "subtract", TIME, [N, 60 * Math.floor(N / 60)], N % 60)], answer: `(${Math.floor(N / 60)}, ${N % 60})` };
      }
      const [a, b, c, d] = durParts(mode, x);
      const small = b + d;
      return { steps: [sp("small", "add", ADD, [b, d], small), sp("big", "add", ADD, [a, c, small >= 60 ? 1 : 0], a + c + (small >= 60 ? 1 : 0))], answer: `(${a + c + (small >= 60 ? 1 : 0)}, ${small % 60})` };
    },
    // independent: everything in the small unit, counted one at a time; the answer must give the same total with the small part under 60
    validate: ([mode, x], v) => {
      const t = tupleNums(v);
      if (t.length !== 2 || !t.every(Number.isInteger) || t[0] < 0 || t[1] < 0 || t[1] >= 60) return false;
      let total = 0;
      if (mode === 2) total = durSecs(x);
      else {
        const [a, b, c, d] = durParts(mode, x);
        for (let i = 0; i < a + c; i++) total += 60;
        total += b + d;
      }
      return 60 * t[0] + t[1] === total;
    },
    bugs: ([mode, x]) => {
      if (mode === 2) {
        const N = durSecs(x);
        return [Bg("minute-as-100", "conceptual", TIME, "The seconds were split into hundreds, as if a minute were 100 seconds. A minute has 60 seconds.", `(${Math.floor(N / 100)}, ${N % 100})`), ...(N >= 120 ? [Bg("one-minute-only", "procedural", TIME, "Only one minute was taken out; keep taking out 60 seconds while you can.", `(1, ${N - 60})`)] : [])].filter((b) => b.predict !== `(${Math.floor(N / 60)}, ${N % 60})`);
      }
      const [a, b, c, d] = durParts(mode, x);
      if (b + d < 60) return [Bg("small-unit-left-out", "procedural", TIME, `Only the ${mode ? "minutes" : "hours"} were added.`, `(${a + c}, 0)`)];
      return [Bg("no-carry", "conceptual", TIME, `The ${mode ? "seconds" : "minutes"} came to ${b + d}, but 60 of them make one ${mode ? "minute" : "hour"}.`, `(${a + c}, ${b + d})`), Bg("carry-kept", "procedural", TIME, `One ${mode ? "minute" : "hour"} was carried, but its 60 ${mode ? "seconds" : "minutes"} were not taken away.`, `(${a + c + 1}, ${b + d})`)];
    },
    distractors: ([mode, x]) => {
      let h: number;
      let m: number;
      if (mode === 2) [h, m] = [Math.floor(durSecs(x) / 60), durSecs(x) % 60];
      else {
        const [a, b, c, d] = durParts(mode, x);
        [h, m] = [a + c + (b + d >= 60 ? 1 : 0), (b + d) % 60];
      }
      return [`(${h + 1}, ${m})`, `(${h}, ${(m + 10) % 60})`, `(${Math.max(0, h - 1)}, ${m})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "small" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}${Number(s.value) >= 60 ? `, which is 1 and ${Number(s.value) - 60} more` : ""}` : s.id === "big" ? `${s.inputs[0]} + ${s.inputs[1]}${s.inputs[2] ? " + 1 carried" : ""} = ${s.value}` : s.id === "minutes" ? `${s.inputs[0]} seconds hold ${s.value} groups of 60` : `${s.value} seconds are left over`),
    domain: [[0, 2], [0, 99]],
    difficulty: ([mode, x]) => (mode === 2 ? 2 : durParts(mode, x)[1] + durParts(mode, x)[3] >= 60 ? 3 : 1),
    word: ([mode, x]) => {
      if (mode === 2) return `A song on the radio lasts ${durSecs(x)} seconds. How long is it in minutes and seconds? Write (minutes, seconds).`;
      const [a, b, c, d] = durParts(mode, x);
      return mode === 0 ? `${nm(x)} studies for ${a} h ${b} min on Saturday and ${c} h ${d} min on Sunday. How long is that in all? Write (hours, minutes).` : `A pressure cooker whistles after ${a} min ${b} s, and the rice then needs ${c} min ${d} s more. How long is that in all? Write (minutes, seconds).`;
    },
    teach: {
      idea: "60 minutes make 1 hour and 60 seconds make 1 minute, so when the small units add up to 60 or more, 60 of them become one big unit.",
      method: "Add the small units, then the big units. If the small units are 60 or more, take 60 away and add 1 to the big units. To change seconds into minutes and seconds, take out 60 seconds as many times as you can.",
      visual: ([mode, x]) => ({ type: "numberline", from: 0, to: 120, step: 60, marks: [mode === 2 ? Math.min(120, durSecs(x) % 120) : 60] }),
      alternatives: [{ id: "like_carrying", title: "Like carrying, but at 60", kind: "procedural", text: ["It works like carrying in addition, but you carry when you reach 60, not 10.", "45 min + 30 min = 75 min = 1 h 15 min."] }],
    },
    limits: "Two durations of up to 5 h 55 min (or 5 min 55 s), and up to 599 seconds; three or more durations are not included.",
  },
  {
    id: "adbartf",
    arity: 4,
    title: "True or false? Checking statements about a bar chart",
    competency: BAR,
    type: "choice",
    // [c, s, k, t]: bar chart c with seed s; statement kind k (0 more, 1 total, 2 how many more); t 0 a true statement, 1 a false one
    parse: none,
    reject: ([c, s, k, t]) => {
      if (c < 0 || c > 3 || s < 0 || s > 29 || k < 0 || k > 2 || t < 0 || t > 1) return "A statement about a four-bar chart.";
      if (!distinct(barValues(c, s, 0))) return "The bars have different heights.";
      for (let s0 = s % 4; s0 < s; s0 += 4) if (barValues(c, s0, 0).join() === barValues(c, s, 0).join()) return "An earlier seed draws the same chart (distinct@1).";
      return null;
    },
    choices: (p) => shufO(p, "tf", ["True", "False"]),
    prompt: (p) => `The bar chart shows ${BARCTX[p[0]].title}. Is this statement true or false? "${tfStatement(p)}"`,
    solve: (p) => ({ steps: [sp("read", "read", BAR, barValues(p[0], p[1], 0), tfStatement(p)), sp("judge", "compare", BAR, [p[3]], p[3] ? "False" : "True")], answer: posO(p, 2, p[3], "tf") }),
    // independent: work the statement out from the bars (counting up the bars one unit at a time) and see whether it holds
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [c, s, k] = p;
      const V = barValues(c, s, 0);
      const { x, y, n } = tfParts(p);
      let ok: boolean;
      if (k === 0) ok = V[x] > V[y];
      else if (k === 1) {
        let tot = 0;
        for (const b of V) for (let i = 0; i < b; i++) tot++;
        ok = tot === n;
      } else {
        let gap = 0;
        for (let h = V[y]; h < V[x]; h++) gap++;
        ok = gap === n;
      }
      return shufO(p, "tf", ["True", "False"])[v] === (ok ? "True" : "False");
    },
    bugs: (p) => {
      const [, , k, t] = p;
      if (!t) return [];
      if (k === 0) return [Bg("believed-order", "procedural", BAR, "The statement was accepted without looking at the two bars. Compare their heights: the taller bar is the larger number.", posO(p, 2, 0, "tf"))];
      if (k === 1) return [Bg("missed-bar", "procedural", BAR, "One bar was left out when checking the total, so the wrong total looked right. Add every bar.", posO(p, 2, 0, "tf"))];
      return [Bg("added", "conceptual", BAR, "The two bars were added, so the sum looked like the answer. 'How many more' is the difference.", posO(p, 2, 0, "tf"))];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `Read the bars: ${s.inputs.join(", ")}` : `So the statement is ${s.value}`),
    domain: [[0, 3], [0, 29], [0, 2], [0, 1]],
    cap: 400,
    difficulty: ([, , k]) => (k === 0 ? 1 : k === 1 ? 3 : 2),
    figure: ([c, s]) => ({ type: "bars", title: BARCTX[c].title, labels: BARCTX[c].labels, values: barValues(c, s, 0), scale: 1 }),
    word: (p) => `${nm(p[1])} looked at the class bar chart of ${BARCTX[p[0]].title} and said: "${tfStatement(p)}" Is ${nm(p[1])} right? Choose True or False.`,
    teach: {
      idea: "A statement about a chart is true only if the numbers read from the bars make it so: check it, do not guess from how it sounds.",
      method: "Read the bars the statement talks about. Work out what it claims (compare, add or subtract) and see whether you get the same.",
      visual: ([c, s]) => ({ type: "bars", labels: BARCTX[c].labels, values: barValues(c, s, 0), scale: 1 }),
      alternatives: [{ id: "table", title: "Write the numbers down first", kind: "procedural", text: ["Make a small table of each label and its number.", "Then test the statement on the table."] }],
    },
    limits: "Three kinds of statement about a four-bar chart with values 2 to 10; statements about pictures are acequal and the pictograph families.",
  },
  {
    id: "adpreg",
    arity: 3,
    title: "Perimeter of a square or regular polygon from one side, and the side from the perimeter",
    competency: PER,
    type: "integer",
    mc: true,
    // [n, s, mode]: a regular n-gon (n 3 to 8) with side s cm; mode 0 the perimeter, mode 1 the side from the perimeter
    parse: none,
    reject: ([n, s, mode]) => (n < 3 || n > 8 || s < 2 || s > 25 || mode < 0 || mode > 1 ? "A regular shape with 3 to 8 sides of 2 to 25 cm." : null),
    prompt: ([n, s, mode]) => (mode === 0 ? `All the sides of the ${REG[n]} in the picture are equal, and one side is ${s} cm. What is its perimeter, in cm?` : `The perimeter of ${an(REG[n])} is ${n * s} cm. All its sides are equal. How long is one side, in cm?`),
    solve: ([n, s, mode]) => (mode === 0 ? { steps: [sp("count", "count", PER, [REG[n]], n), sp("multiply", "multiply", MT, [n, s], n * s)], answer: n * s } : { steps: [sp("count", "count", PER, [REG[n]], n), sp("divide", "divide", PER, [n * s, n], s)], answer: s }),
    // independent: walk once round the shape, side by side
    validate: ([n, s, mode], v) => {
      if (typeof v !== "number" || v <= 0) return false;
      let t = 0;
      for (let i = 0; i < n; i++) t += mode === 0 ? s : v;
      return mode === 0 ? v === t : t === n * s;
    },
    bugs: ([n, s, mode]) => {
      const P = n * s;
      if (mode === 0)
        return [
          Bg("one-side", "procedural", PER, "Only the marked side was given. The perimeter goes all the way round: every side counts.", s),
          ...(n !== 4 ? [Bg("four-sides", "conceptual", PER, `The side was multiplied by 4, as for a square, but ${an(REG[n])} has ${n} sides.`, 4 * s)] : [Bg("area", "conceptual", "MATH.measurement.area-squares", "The side was multiplied by itself, which gives the area (the space inside). The perimeter is the distance round: 4 sides.", s * s)]),
        ].filter((b) => b.predict !== P);
      return [
        ...(n !== 4 && P % 4 === 0 ? [Bg("divided-by-4", "conceptual", PER, `The perimeter was divided by 4, as for a square, but ${an(REG[n])} has ${n} equal sides.`, P / 4)] : []),
        ...(P % 2 === 0 && n !== 2 ? [Bg("halved", "conceptual", PER, "The perimeter was halved, as when finding length + breadth of a rectangle. Here all the sides are equal, so share the perimeter among all of them.", P / 2)] : []),
        Bg("multiplied", "conceptual", PER, `The perimeter was multiplied by ${n}; the side is the perimeter shared equally among the ${n} sides.`, P * n),
      ].filter((b) => b.predict !== s);
    },
    distractors: ([n, s, mode]) => {
      const r = mode === 0 ? n * s : s;
      return [r + 1, r + n, r - 1].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "count" ? `${an(String(s.inputs[0]))[0].toUpperCase()}${an(String(s.inputs[0])).slice(1)} has ${s.value} equal sides` : s.id === "multiply" ? `${s.inputs[0]} × ${s.inputs[1]} cm = ${s.value} cm` : `${s.inputs[0]} cm ÷ ${s.inputs[1]} = ${s.value} cm`),
    domain: [[3, 8], [2, 25], [0, 1]],
    difficulty: ([n, , mode]) => (n === 4 && mode === 0 ? 1 : n >= 7 || mode === 1 ? 3 : 2),
    figure: ([n, s, mode]) => (n === 4 ? { type: "shape", kind: "square", lengths: [mode ? "?" : `${s} cm`] } : { type: "shape", sides: n, lengths: [mode ? "?" : `${s} cm`], name: REG[n] }),
    word: ([n, s, mode]) => (mode === 0 ? `A garden bed shaped like ${an(REG[n])} has equal sides of ${s} m. How many metres of fencing go once round it?` : `${nm(n + s)} used ${n * s} cm of lace to go once round a card shaped like ${an(REG[n])} with equal sides. How long is each side, in cm?`),
    teach: {
      idea: "A regular polygon has all its sides equal, so its perimeter is the number of sides times one side: 4 × side for a square, 3 × side for an equilateral triangle, n × side in general.",
      method: "Count the sides. Multiply the side by that number for the perimeter; divide the perimeter by it for the side.",
      visual: ([n, s]) => (n === 4 ? { type: "shape", kind: "square", lengths: Array(4).fill(`${s} cm`) } : { type: "shape", sides: n, lengths: Array(n).fill(`${s} cm`) }),
      alternatives: [{ id: "add_all", title: "Add the equal sides", kind: "conceptual", text: ["Write the side once for every side of the shape and add: 6 + 6 + 6 + 6 + 6 = 30 for a pentagon of side 6.", "Adding the same number again and again is multiplying."] }],
    },
    limits: "Regular polygons with 3 to 8 sides of 2 to 25 cm; shapes with different sides are adperim and admper, rectangles rperim.",
  },
  {
    id: "adfunit",
    arity: 3,
    title: "Measuring lengths with fractional units",
    competency: FMOD,
    type: "fraction",
    mc: true,
    // [mode, b, k]: a strip 1/b of a metre long; mode 0 a length of k strips, in metres; mode 1 how many strips make k metres
    parse: none,
    reject: ([mode, b, k]) => {
      if (mode < 0 || mode > 1 || b < 2 || b > 10) return "Strips from 1/2 to 1/10 of a metre.";
      if (mode === 0) return k < 2 || k > 30 || k / b > 5 || k % b === 0 ? "2 to 30 strips, not a whole number of metres, up to 5 m." : null;
      return k < 1 || k > 6 ? "1 to 6 metres." : null;
    },
    prompt: ([mode, b, k]) => (mode === 0 ? `A paper strip is ${fr(1, b)} of a metre long. A table is exactly ${k} strips long. How long is the table, in metres? (A fraction or mixed number is fine.)` : `A paper strip is ${fr(1, b)} of a metre long. How many strips, laid end to end, make ${pl(k, "metre")}?`),
    solve: ([mode, b, k]) => (mode === 0 ? { steps: [sp("count", "count", UNIT, [k, fr(1, b)], fr(k, b))], answer: k / b } : { steps: [sp("per-metre", "count", UNIT, [fr(1, b)], b), sp("multiply", "multiply", MT, [b, k], b * k)], answer: b * k }),
    // independent: lay the strips end to end, adding 1/b each time
    validate: ([mode, b, k], v) => {
      const x = typeof v === "number" ? v : num(String(v));
      if (!Number.isFinite(x)) return false;
      let len = 0;
      if (mode === 0) {
        for (let i = 0; i < k; i++) len += 1 / b;
        return near(len, x);
      }
      if (!Number.isInteger(x) || x <= 0 || x > 200) return false;
      for (let i = 0; i < x; i++) len += 1 / b;
      return near(len, k);
    },
    bugs: ([mode, b, k]) =>
      mode === 0
        ? [Bg("counted-strips", "conceptual", FMOD, `The number of strips was given as metres. Each strip is only ${fr(1, b)} m, so ${k} strips are ${k} of those parts.`, k), Bg("multiplied", "conceptual", FMOD, `${k} was multiplied by ${b}. The strips are smaller than a metre, so ${k} strips are fewer metres than ${k}: ${k} × ${fr(1, b)}.`, k * b)]
        : [Bg("divided", "conceptual", FMOD, `The metres were divided by ${b}. A short strip fits into a metre ${b} times, so you need MORE strips than metres.`, k / b), ...(k > 1 ? [Bg("one-metre", "procedural", FMOD, `Only the strips for one metre were counted; there are ${pl(k, "metre")}.`, b)] : [])],
    distractors: ([mode, b, k]) => (mode === 0 ? [(k + 1) / b, k / (b + 1)] : [b * k + b, b + k]),
    variants: () => [],
    explain: (s) => (s.id === "count" ? `${s.inputs[0]} strips of ${s.inputs[1]} m make ${s.value} m` : s.id === "per-metre" ? `${s.value} strips of ${s.inputs[0]} m make 1 m` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value} strips`),
    domain: [[0, 1], [2, 10], [1, 30]],
    difficulty: ([mode, b, k]) => (mode === 1 && k <= 2 ? 1 : mode === 0 && k > b ? 3 : 2),
    figure: ([mode, b, k]) => ({ type: "numberline", from: 0, to: mode === 0 ? Math.ceil(k / b) : k, step: 1, marks: mode === 0 ? Array.from({ length: k }, (_, i) => (i + 1) / b) : Array.from({ length: b }, (_, i) => (i + 1) / b) }),
    word: ([mode, b, k]) => (mode === 0 ? `${nm(b + k)} measures a saree border with a stick that is ${fr(1, b)} of a metre long. The border is ${k} sticks long. How many metres is that? (A fraction or mixed number is fine.)` : `Tiles ${fr(1, b)} of a metre long are laid in a line along a path ${pl(k, "metre")} long. How many tiles are needed?`),
    teach: {
      idea: "A unit can be a fraction of a metre: if a strip is 1/b of a metre, b strips make 1 metre, and k strips make k/b of a metre.",
      method: "For a length, write the number of strips over b (and change to a mixed number if you like). For how many strips, multiply the metres by b.",
      visual: ([, b]) => ({ type: "strips", top: 1, bottom: b, shaded: 1 }),
      alternatives: [{ id: "number_line", title: "Jump along a number line", kind: "procedural", text: ["Mark 0, 1, 2 … metres and cut each metre into b equal jumps.", "Count the jumps: k jumps land on k/b."] }],
    },
    limits: "Strips of 1/2 to 1/10 m, up to 5 m; non-unit fractional units (such as 3/4 m) are not included.",
  },
  {
    id: "adfcmpu",
    arity: 5,
    title: "Comparing two fractions with different tops and bottoms",
    competency: FCMP,
    type: "fraction",
    // [a, b, c, d, ask]: a/b and c/d in simplest form, a ≠ c and b ≠ d; ask 0 greater, 1 smaller
    parse: none,
    reject: ([a, b, c, d, ask]) => (b < 2 || b > 12 || d < 2 || d > 12 || a < 1 || a >= b || c < 1 || c >= d || a === c || b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1 || a * d === b * c || ask < 0 || ask > 1 ? "Two different fractions less than 1, in simplest form, with different tops and different bottoms." : null),
    keep: ([a, b, c, d, ask]) => (a * 7 + b * 3 + c * 5 + d + ask) % 11 === 0,
    prompt: ([a, b, c, d, ask]) => `Which fraction is ${ask ? "smaller" : "greater"}: ${fr(a, b)} or ${fr(c, d)}? Write that fraction.`,
    solve: ([a, b, c, d, ask]) => {
      const L = (b * d) / gcd(b, d);
      const [p, q] = [(a * L) / b, (c * L) / d];
      const first = ask ? p < q : p > q;
      return { steps: [sp("common", "lcm", "MATH.number.equivalent-fractions", [b, d], L), sp("rewrite", "convert", "MATH.number.equivalent-fractions", [fr(a, b), fr(c, d)], `${fr(p, L)} and ${fr(q, L)}`), sp("compare", "compare", FCMP, [p, q], first ? fr(a, b) : fr(c, d))], answer: first ? a / b : c / d };
    },
    // independent: the answer must be one of the two fractions, and its decimal value (by division) must be on the side asked
    validate: ([a, b, c, d, ask], v) => {
      if (typeof v !== "number") return false;
      const [x, y] = [a / b, c / d];
      const isX = near(v, x);
      const isY = near(v, y);
      if (isX === isY) return false;
      const other = isX ? y : x;
      return ask ? v < other : v > other;
    },
    bugs: ([a, b, c, d, ask]) => {
      const ans = (ask ? a * d < c * b : a * d > c * b) ? a / b : c / d;
      const out: Bug[] = [];
      const bigBottom = b > d ? a / b : c / d;
      const bigTop = a > c ? a / b : c / d;
      const asked = (f: number) => (ask ? (f === a / b ? c / d : a / b) : f);
      if (asked(bigBottom) !== ans) out.push(Bg("bigger-bottom-bigger", "conceptual", FCMP, `The fraction with the ${ask ? "smaller" : "bigger"} bottom number was chosen. The bottom number alone does not decide: change both to the same bottom number first.`, asked(bigBottom)));
      if (asked(bigTop) !== ans) out.push(Bg("bigger-top-bigger", "conceptual", FCMP, `The fraction with the ${ask ? "smaller" : "bigger"} top number was chosen. The parts are different sizes, so compare with a common bottom number.`, asked(bigTop)));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "common" ? `A common bottom number for ${s.inputs[0]} and ${s.inputs[1]} is ${s.value}` : s.id === "rewrite" ? `${s.inputs[0]} and ${s.inputs[1]} become ${s.value}` : `Compare the tops ${s.inputs[0]} and ${s.inputs[1]}: the answer is ${s.value}`),
    domain: [[1, 11], [2, 12], [1, 11], [2, 12], [0, 1]],
    cap: 400,
    difficulty: ([, b, , d]) => (b % d === 0 || d % b === 0 ? 1 : gcd(b, d) > 1 ? 2 : 3),
    word: ([a, b, c, d, ask]) => `${nm(a + b)} ate ${fr(a, b)} of a cake and ${nm(c + d)} ate ${fr(c, d)} of another cake of the same size. Write the fraction eaten by the one who ate ${ask ? "less" : "more"}.`,
    teach: {
      idea: "Fractions with different bottom numbers count parts of different sizes; writing them with a common bottom number makes the parts the same size, so the tops can be compared.",
      method: "Find a common multiple of the bottom numbers (the smallest is easiest). Change both fractions to it, then the one with the bigger top is greater.",
      visual: ([a, b, , d]) => ({ type: "strips", top: b, bottom: d, shaded: a }),
      alternatives: [
        { id: "benchmark", title: "Compare with 1/2", kind: "conceptual", text: ["If one fraction is more than half and the other less than half, the first is greater.", "3/5 is more than 1/2 (3 is more than half of 5); 3/8 is less than 1/2."] },
        { id: "cross", title: "Cross-multiply", kind: "procedural", text: ["For a/b and c/d, compare a × d with c × b.", "The bigger product goes with the greater fraction."] },
      ],
    },
    limits: "Two fractions less than 1 in simplest form with different tops and bottoms (up to twelfths); same tops or bottoms are adfcmp.",
  },
  {
    id: "adfordu",
    arity: 3,
    title: "Ordering three unlike fractions",
    competency: FCMP,
    type: "tuple",
    mc: true,
    // [i, j, k]: three fractions from the list of fractions in simplest form with bottoms 2 to 10, all bottoms different
    parse: none,
    reject: ([i, j, k]) => {
      const F = fracList();
      if (i < 0 || k >= F.length || !(i < j && j < k)) return "Three fractions from the list, in list order.";
      const T = [F[i], F[j], F[k]];
      return new Set(T.map((f) => f[1])).size < 3 || new Set(T.map((f) => f[0])).size < 2 ? "Different bottom numbers and not all the same top." : null;
    },
    keep: ([i, j, k]) => {
      const F = fracList();
      const v = [F[i], F[j], F[k]].map(([a, b]) => a / b);
      return !(v[0] < v[1] && v[1] < v[2]) && (i + 2 * j + 3 * k) % 5 === 0;
    },
    prompt: ([i, j, k]) => `Write these fractions in order from the smallest to the largest: ${[i, j, k].map((x) => fr(fracList()[x][0], fracList()[x][1])).join(", ")}. Write them in brackets, separated by commas.`,
    solve: ([i, j, k]) => {
      const T = [i, j, k].map((x) => fracList()[x]);
      const L = T.reduce((m, [, b]) => (m * b) / gcd(m, b), 1);
      const sorted = [...T].sort((p, q) => (p[0] * L) / p[1] - (q[0] * L) / q[1]);
      const ans = `(${sorted.map(([a, b]) => fr(a, b)).join(", ")})`;
      return { steps: [sp("common", "lcm", "MATH.number.equivalent-fractions", T.map((f) => f[1]), L), sp("rewrite", "convert", "MATH.number.equivalent-fractions", T.map(([a, b]) => fr(a, b)), T.map(([a, b]) => fr((a * L) / b, L)).join(", ")), sp("order", "order", FCMP, [L], ans)], answer: ans };
    },
    // independent: the list must hold exactly the three fractions, each smaller than the next by cross-multiplying
    validate: ([i, j, k], v) => {
      if (typeof v !== "string") return false;
      const t = tupleNums(v);
      if (t.length !== 3 || t.some((q) => !Number.isFinite(q))) return false;
      const given = [i, j, k].map((x) => fracList()[x]);
      const used = t.map((q) => given.findIndex(([a, b]) => near(q * b, a)));
      if (used.some((u) => u < 0) || new Set(used).size !== 3) return false;
      for (let n = 0; n < 2; n++) {
        const [a, b] = given[used[n]];
        const [c, d] = given[used[n + 1]];
        if (!(a * d < c * b)) return false;
      }
      return true;
    },
    bugs: ([i, j, k]) => {
      const T = [i, j, k].map((x) => fracList()[x]);
      const list = (g: number[][]) => `(${g.map(([a, b]) => fr(a, b)).join(", ")})`;
      const ans = list([...T].sort((p, q) => p[0] / p[1] - q[0] / q[1]));
      const byBottom = list([...T].sort((p, q) => p[1] - q[1]));
      const byTop = list([...T].sort((p, q) => p[0] - q[0] || p[1] - q[1]));
      return [
        Bg("by-bottom", "conceptual", FCMP, "The fractions were ordered by their bottom numbers. With different tops and bottoms, change them to a common bottom number first.", byBottom),
        Bg("by-top", "conceptual", FCMP, "The fractions were ordered by their top numbers, but the parts are different sizes. Use a common bottom number.", byTop),
      ].filter((b) => b.predict !== ans);
    },
    distractors: ([i, j, k]) => {
      const T = [i, j, k].map((x) => fracList()[x]).sort((p, q) => p[0] / p[1] - q[0] / q[1]);
      const list = (g: number[][]) => `(${g.map(([a, b]) => fr(a, b)).join(", ")})`;
      return [list([T[1], T[0], T[2]]), list([T[0], T[2], T[1]]), list([T[2], T[1], T[0]])];
    },
    variants: () => [],
    explain: (s) => (s.id === "common" ? `A common bottom number for ${s.inputs.join(", ")} is ${s.value}` : s.id === "rewrite" ? `They become ${s.value}` : `Order by the tops: ${s.value}`),
    domain: [[0, 30], [0, 30], [0, 30]],
    cap: 400,
    difficulty: ([i, j, k]) => {
      const T = [i, j, k].map((x) => fracList()[x]);
      const L = T.reduce((m, [, b]) => (m * b) / gcd(m, b), 1);
      return L <= 12 ? 1 : L <= 40 ? 2 : 3;
    },
    word: ([i, j, k]) => `Three friends ran parts of the same 1 km road: ${[i, j, k].map((x, n) => `${nm(i + n)} ran ${fr(fracList()[x][0], fracList()[x][1])} km`).join(", ")}. Write the three distances from the shortest to the longest, in brackets.`,
    teach: {
      idea: "To order fractions with different bottom numbers, write them all with one common bottom number; then their tops are in the same order as the fractions.",
      method: "Find a common multiple of all three bottom numbers. Change each fraction to it, order the tops, and write the original fractions in that order.",
      visual: ([i, j]) => ({ type: "strips", top: fracList()[i][1], bottom: fracList()[j][1], shaded: fracList()[i][0] }),
      alternatives: [{ id: "benchmarks", title: "Sort by 0, 1/2 and 1", kind: "conceptual", text: ["First put each fraction into 'less than 1/2' or 'more than 1/2'.", "Then compare only the fractions in the same group."] }],
    },
    limits: "Three fractions less than 1 in simplest form with three different bottom numbers from 2 to 10.",
  },
  {
    id: "adestcost",
    arity: 2,
    title: "Estimating the total cost of several items",
    competency: EST,
    type: "integer",
    mc: true,
    // [n, x]: n = 3 or 4 items with prices from seed x, each rounded to the nearest ten rupees
    parse: none,
    reject: ([n, x]) => {
      if (n < 3 || n > 4 || x < 0 || x > 59) return "Three or four prices.";
      for (let x0 = 0; x0 < x; x0++) if (costPrices(n, x0).join() === costPrices(n, x).join()) return "An earlier seed gives the same prices (distinct@1).";
      return null;
    },
    prompt: ([n, x]) => `${nm(x)} buys the things in the picture: ${costItems(n, x).map(([it, pr]) => `${it} for ₹${pr}`).join(", ")}. Round each price to the nearest ten rupees and estimate the total cost. What is the estimate, in rupees?`,
    solve: ([n, x]) => {
      const P = costPrices(n, x);
      const R = P.map(r10);
      return { steps: [...P.map((pr, i) => sp(`round${i}`, "round", ROUND, [pr], R[i])), sp("total", "add", EST, R, R.reduce((a, b) => a + b, 0))], answer: R.reduce((a, b) => a + b, 0) };
    },
    // independent: for each price search the tens for the nearest one (a 5 rounds up), then add
    validate: ([n, x], v) => {
      if (typeof v !== "number") return false;
      let s = 0;
      for (const pr of costPrices(n, x)) {
        let best = 0;
        for (let t = 0; t <= 1000; t += 10) if (Math.abs(pr - t) <= Math.abs(pr - best)) best = t;
        s += best;
      }
      return v === s;
    },
    bugs: ([n, x]) => {
      const P = costPrices(n, x);
      const est = P.map(r10).reduce((a, b) => a + b, 0);
      return [
        Bg("exact", "procedural", EST, "The exact total was worked out. An estimate uses the rounded prices, so it can be found quickly in your head.", P.reduce((a, b) => a + b, 0)),
        Bg("always-down", "conceptual", ROUND, "Every price was rounded down. Round to the NEAREST ten: 5 or more in the ones goes up.", P.reduce((a, b) => a + Math.floor(b / 10) * 10, 0)),
      ].filter((b) => b.predict !== est);
    },
    distractors: ([n, x]) => {
      const est = costPrices(n, x).map(r10).reduce((a, b) => a + b, 0);
      return [est + 10, est - 10, est + 20];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs.join(" + ")} = ₹${s.value}` : `₹${s.inputs[0]} is about ₹${s.value}`),
    domain: [[3, 4], [0, 59]],
    difficulty: ([n]) => (n === 3 ? 2 : 3),
    figure: ([n, x]) => ({ type: "table", head: ["Item", "Price (₹)"], rows: costItems(n, x).map(([it, pr]) => [it, pr]) }),
    word: ([n, x]) => `Before going to the shop, ${nm(x + 1)} wants to know about how much money to take for ${costItems(n, x).map(([it, pr]) => `${it} (₹${pr})`).join(", ")}. Round each price to the nearest ten rupees: about how many rupees are needed?`,
    teach: {
      idea: "Rounding each price to the nearest ten gives friendly numbers that are easy to add in your head; the estimate tells you roughly how much money you need.",
      method: "Look at the ones digit of each price: 0 to 4 round down, 5 to 9 round up. Add the rounded prices.",
      visual: ([n, x]) => ({ type: "table", head: ["Item", "Price (₹)", "About (₹)"], rows: costItems(n, x).map(([it, pr]) => [it, pr, r10(pr)]) }),
      alternatives: [{ id: "number_line", title: "Which ten is nearer?", kind: "conceptual", text: ["Put the price on a number line between two tens.", "It rounds to the ten it is closer to; exactly halfway goes up."] }],
    },
    limits: "Three or four prices from ₹12 to ₹199 rounded to the nearest ten; rounding to the nearest hundred and paise are other families.",
  },
  {
    id: "adrec",
    arity: 2,
    title: "Recording a list in a two-way table",
    competency: TAB,
    type: "integer",
    mc: true,
    // [s, q]: a list of children (seed s), each a boy or girl choosing idli or dosa; q 0–3 a cell (boys idli, boys dosa, girls idli, girls dosa), 4 all boys, 5 all who chose idli
    parse: none,
    reject: ([s, q]) => {
      if (s < 0 || s > 39 || q < 0 || q > 5) return "A list of 12 to 16 children and one cell or total.";
      const C = recCounts(s);
      return C.some((x) => x === 0) ? "Every cell has someone." : null;
    },
    prompt: ([, q]) => `The list in the picture shows each child of a class and what they chose for breakfast. Record it in a table with rows Boys and Girls and columns Idli and Dosa. ${recAsk(q)}`,
    solve: ([s, q]) => {
      const C = recCounts(s);
      const ans = q < 4 ? C[q] : q === 4 ? C[0] + C[1] : C[0] + C[2];
      return { steps: [sp("tally", "count", TAB, C, `Boys: ${C[0]} idli, ${C[1]} dosa; Girls: ${C[2]} idli, ${C[3]} dosa`), sp("read", "read", TAB, [q], ans)], answer: ans };
    },
    // independent: go down the list in the picture and count the rows that fit
    validate: ([s, q], v) => {
      const rows = recRows(s);
      const fits = (g: string, c: string) => (q === 0 ? g === "Boy" && c === "Idli" : q === 1 ? g === "Boy" && c === "Dosa" : q === 2 ? g === "Girl" && c === "Idli" : q === 3 ? g === "Girl" && c === "Dosa" : q === 4 ? g === "Boy" : c === "Idli");
      return v === rows.filter(([, g, c]) => fits(g, c)).length;
    },
    bugs: ([s, q]) => {
      const C = recCounts(s);
      if (q < 4) {
        const row = q < 2 ? C[0] + C[1] : C[2] + C[3];
        const col = q % 2 === 0 ? C[0] + C[2] : C[1] + C[3];
        return [Bg("whole-row", "procedural", TAB, `All the ${q < 2 ? "boys" : "girls"} were counted, whatever they chose. The cell needs both: ${q < 2 ? "boys" : "girls"} AND ${q % 2 ? "dosa" : "idli"}.`, row), Bg("whole-column", "procedural", TAB, `Everyone who chose ${q % 2 ? "dosa" : "idli"} was counted, boys and girls. The cell is only for the ${q < 2 ? "boys" : "girls"}.`, col)].filter((b) => b.predict !== C[q]);
      }
      return [Bg("one-cell", "procedural", TAB, q === 4 ? "Only the boys who chose idli were counted; boys who chose dosa are boys too." : "Only the boys who chose idli were counted; girls who chose idli count too.", C[0])];
    },
    distractors: ([s, q]) => {
      const C = recCounts(s);
      const ans = q < 4 ? C[q] : q === 4 ? C[0] + C[1] : C[0] + C[2];
      return [ans + 1, ans - 1, ans + 2].filter((x) => x >= 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "tally" ? `Make a tally for each cell: ${s.value}` : `The answer is ${s.value}`),
    domain: [[0, 39], [0, 5]],
    difficulty: ([, q]) => (q < 4 ? 2 : 3),
    figure: ([s]) => ({ type: "table", head: ["Child", "Boy or girl", "Breakfast"], rows: recRows(s) }),
    word: ([s, q]) => `The school canteen is getting tomorrow's breakfast ready from the list in the picture, which shows each child of the class and what they chose. ${["How many plates of idli must be kept for the boys?", "How many plates of dosa must be kept for the boys?", "How many plates of idli must be kept for the girls?", "How many plates of dosa must be kept for the girls?", "The boys sit at one long table. How many places are needed at it?", "How many plates of idli are needed in all?"][q]}`,
    teach: {
      idea: "A two-way table sorts each child two ways at once (boy or girl, and idli or dosa), so every child goes in exactly one cell.",
      method: "Draw the table. Go down the list one child at a time, put a tally mark in the cell for both answers, and tick the child off. Count the tallies in each cell; add along a row or down a column for totals.",
      visual: ([s]) => {
        const C = recCounts(s);
        return { type: "table", head: ["", "Idli", "Dosa", "Total"], rows: [["Boys", C[0], C[1], C[0] + C[1]], ["Girls", C[2], C[3], C[2] + C[3]]] };
      },
      alternatives: [{ id: "sort", title: "Sort into four piles", kind: "conceptual", text: ["Write each child's name on a card.", "Sort the cards into four piles: boy-idli, boy-dosa, girl-idli, girl-dosa, and count each pile."] }],
    },
    limits: "Lists of 12 to 16 children with two yes-or-no categories; collecting the data is done in class.",
  },
];

// ---------------------------------------------------------------- helpers for the gap@1 families (g0304)

function Bg(id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null): Bug {
  return { id, kind, competency, says, predict };
}
function sp(id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step {
  return { id, op, competency, inputs, value };
}
/** A fixed order of n options for parameters p (entry k is the original index shown in place k). */
function permO(p: number[], n: number, tag: string): number[] {
  return Array.from({ length: n }, (_, i) => i)
    .map((i) => [hm(`${tag}:${p.join(",")}:${i}`), i])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
}
const shufO = (p: number[], tag: string, opts: string[]) => permO(p, opts.length, tag).map((i) => opts[i]);
const posO = (p: number[], n: number, orig: number, tag: string) => permO(p, n, tag).indexOf(orig);
const r10 = (x: number) => Math.round(x / 10 + 1e-9) * 10;

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
/** The number name of 1 to 99 999: "four thousand five hundred seven". */
function words(n: number): string {
  const th = Math.floor(n / 1000);
  const h = Math.floor(n / 100) % 10;
  const r = n % 100;
  return [th ? `${below100(th)} thousand` : "", h ? `${ONES[h]} hundred` : "", r ? below100(r) : ""].filter(Boolean).join(" ");
}
/** Read a number name back, word by word (independent of `words`). */
function nameToNum(t: string): number | null {
  const val: Record<string, number> = {};
  ONES.forEach((w, i) => (val[w] = i));
  TENS.forEach((w, i) => w && (val[w] = 10 * i));
  let total = 0;
  let cur = 0;
  for (const w of t.toLowerCase().replace(/-/g, " ").split(/\s+/).filter(Boolean)) {
    if (w === "and") continue;
    if (w in val) cur += val[w];
    else if (w === "hundred") cur *= 100;
    else if (w === "thousand") {
      total += cur * 1000;
      cur = 0;
    } else return null;
  }
  return total + cur;
}

const UF = [2, 3, 4, 5, 6, 8, 10];
const fnlPair = ([i, j, , o]: number[]) => (o ? [UF[j], UF[i]] : [UF[i], UF[j]]);

// ---- weights and capacities (adwtcap)
const WOBJ: [string, number][] = [["school bag", 4], ["watermelon", 3], ["bag of rice", 10], ["pumpkin", 5], ["bucket of water", 8], ["jackfruit", 6], ["sack of onions", 25], ["gas cylinder", 30], ["small dog", 7], ["box of books", 12]];
const GLASS = [100, 150, 200, 250];
function wcNums([mode, x]: number[]): { op: string; inputs: number[]; ans: number; guess?: number } {
  const h = (k: string) => hm(`wc${mode}:${x}:${k}`);
  if (mode === 0) {
    const A = WOBJ[x % WOBJ.length][1] + (Math.floor(x / WOBJ.length) % 3);
    const d = 1 + (h("d") % 4);
    const E = h("s") % 2 && A - d > 0 ? A - d : A + d;
    return { op: "difference", inputs: [E, A], ans: Math.abs(E - A) };
  }
  if (mode === 1) {
    const g = GLASS[x % 4];
    const n = 3 + (h("n") % 8);
    const guess = n + (h("g") % 2 ? 2 : -2);
    return { op: "divide", inputs: [g * n, g], ans: n, guess };
  }
  if (mode === 2) {
    const kg = 1 + (x % 9);
    const g = 50 * (1 + (h("g") % 19));
    return { op: "add", inputs: [kg, g], ans: 1000 * kg + g, guess: kg + (h("e") % 2) };
  }
  const L = 2 + (x % 9);
  const mug = [250, 500, 200, 100][Math.floor(x / 9) % 4];
  const n = (1000 * L) / mug;
  return { op: "divide", inputs: [1000 * L, mug], ans: n, guess: n + (h("g") % 2 ? 2 : -2) };
}
function wcText(p: number[], word: boolean): string {
  const [mode, x] = p;
  const W = wcNums(p);
  const [a, b] = W.inputs;
  if (mode === 0) {
    const obj = WOBJ[x % WOBJ.length][0];
    return word ? `At the market, ${nm(x)} guessed that a ${obj} would weigh about ${a} kg. The shopkeeper weighed it: ${b} kg. By how many kilograms was the guess off?` : `${nm(x)} estimated that a ${obj} weighs about ${a} kg. On the weighing scale it showed ${b} kg. By how many kilograms was the estimate wrong?`;
  }
  if (mode === 1) return word ? `${nm(x)} thinks a jug of buttermilk will fill about ${pl(W.guess ?? 0, "glass", "glasses")}. The jug holds ${a} mL and each glass holds ${b} mL. How many glasses does the jug really fill?` : `A jug holds ${a} mL. ${nm(x)} guesses that it will fill about ${pl(W.guess ?? 0, "glass", "glasses")} of ${b} mL. Check the guess: how many glasses does the jug really fill?`;
  if (mode === 2) return word ? `Amma buys ${a} kg of rice and ${b} g of dal and carries them in one bag. She estimates the bag weighs about ${W.guess} kg. Check her estimate: how many grams does she really carry?` : `A bag has ${a} kg of potatoes and ${b} g of tomatoes. ${nm(x)} estimates that the bag weighs about ${W.guess} kg. Check the estimate: what is the real total weight in grams?`;
  return word ? `${nm(x)} fills a ${a / 1000} litre bucket using a mug that holds ${b} mL, and guesses it will take about ${pl(W.guess ?? 0, "mugful")}. Check the guess: how many mugfuls are really needed?` : `A bucket holds ${a / 1000} L of water. A mug holds ${b} mL. ${nm(x)} guesses that about ${pl(W.guess ?? 0, "mug")} of water will fill the bucket. Check the guess: how many mugs are really needed?`;
}
function wcFigure([mode, x]: number[]): Visual | null {
  const W = wcNums([mode, x]);
  if (mode === 0) return { type: "balance", left: WOBJ[x % WOBJ.length][0], right: `${W.inputs[1]} kg` };
  if (mode === 2) return { type: "balance", left: `${W.inputs[0]} kg + ${W.inputs[1]} g`, right: "? g" };
  return null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** A four-digit number with one zero among its last three digits (seed x). */
function nameNum(x: number): number {
  const th = 1 + (x % 9);
  const z = Math.floor(x / 9) % 3;
  const d = [1 + (hm(`nn${x}:a`) % 9), 1 + (hm(`nn${x}:b`) % 9)];
  const low = [0, 1, 2].map((i) => (i === z ? 0 : d.shift()!));
  return th * 1000 + low[0] * 100 + low[1] * 10 + low[2];
}
/** The four options for adname, the right one first: the number, the number with its zero in the other two places, and a typical slip. */
function nameOptions([mode, x]: number[]): string[] {
  const n = nameNum(x);
  const th = Math.floor(n / 1000);
  const low = String(n).slice(1).split("").map(Number);
  const nz = low.filter((d) => d !== 0);
  const moved = [0, 1, 2].filter((z) => low[z] !== 0).map((z) => {
    const q = [...nz];
    return th * 1000 + [0, 1, 2].reduce((s, i) => s * 10 + (i === z ? 0 : q.shift()!), 0);
  });
  const extra = th * 10000 + (n % 1000);
  const expand = (m: number) => String(m).split("").map((c, i, a) => (c === "0" ? "" : c + "0".repeat(a.length - 1 - i))).filter(Boolean).join(" + ");
  if (mode === 0) return [words(n), ...moved.map(words), words(extra)];
  if (mode === 1) return [inr(n), ...moved.map(inr), inr(extra)];
  return [expand(n), ...moved.map(expand), String(n).split("").filter((c) => c !== "0").join(" + ")];
}

const STEPS = [10, 25, 50, 100, 250, 500, 1000];
function seqTerms([si, x, dir]: number[]): number[] {
  const S = STEPS[si];
  const base = dir ? 4 * S + 500 + (hm(`sq${si}:${x}`) % (9500 - 4 * S - 500)) : 100 + (hm(`sq${si}:${x}`) % (9900 - 4 * S - 100));
  const a0 = Math.round(base / S) * S + (si === 0 ? 0 : S === 25 ? 0 : 0);
  return [0, 1, 2, 3, 4].map((i) => a0 + (dir ? -1 : 1) * i * S);
}

const CHECK3 = ["The answer is sensible", "The answer is too small to be right", "The answer is too big to be right"];
function estNums(op: number, x: number): { a: number; b: number; exact: number; est: number; slips: (number | null)[] } | null {
  const a = 150 + (hm(`es${op}:${x}:a`) % 850);
  const b = x % 2 ? 11 + (hm(`es${op}:${x}:b`) % 89) : 101 + (hm(`es${op}:${x}:b`) % 800);
  if (op === 1 && b >= a) return null;
  const exact = op ? a - b : a + b;
  const est = op ? r10(a) - r10(b) : r10(a) + r10(b);
  const A = String(a).padStart(3, "0").split("").map(Number);
  const Bd = String(b).padStart(3, "0").split("").map(Number);
  const s1 = op ? Number(A.map((d, i) => Math.abs(d - Bd[i])).join("")) : Number(A.map((d, i) => (d + Bd[i]) % 10).join(""));
  const s2 = b < 100 ? (op ? (a - 10 * b >= 0 ? a - 10 * b : null) : a + 10 * b) : op ? a - b + 100 : a + b - 100;
  return { a, b, exact, est, slips: [s1, s2] };
}
function estClaim([op, x, k]: number[]): number {
  const E = estNums(op, x)!;
  return k === 0 ? E.exact : (E.slips[k - 1] as number);
}

const digitsL = (n: number, L: number) => String(n).padStart(L, "0").split("").map(Number);
function needsRegroup(a: number, b: number, op: number, L: number): boolean {
  const A = digitsL(a, L);
  const Bd = digitsL(b, L);
  return A.some((d, i) => (op ? d < Bd[i] : d + Bd[i] >= 10));
}
/** adcolx numbers [a, b]. */
function colxNums([kind, x, op]: number[]): [number, number] {
  const h = (k: string) => hm(`cx${kind}:${x}:${op}:${k}`);
  if (kind === 0) return [100 + (h("a") % 900), 10 + (h("b") % 90)];
  if (kind === 3) {
    const a = op ? 30000 + (h("a") % 69999) : 10000 + (h("a") % 60000);
    const b = op ? 1000 + (h("b") % (a - 1000)) : 1000 + (h("b") % (99999 - a - 1000));
    return [a, b];
  }
  const L = kind === 1 ? 3 : 4;
  const noRg = kind === 1 || x % 2 === 0;
  if (noRg) {
    const A = Array.from({ length: L }, (_, i) => (i === 0 ? 1 + (h(`d${i}`) % (op ? 9 : 8)) : h(`d${i}`) % 10));
    const Bd = A.map((d, i) => {
      const room = op ? d : 9 - d;
      return i === 0 ? 1 + (h(`e${i}`) % Math.max(1, room)) : h(`e${i}`) % (room + 1);
    });
    if (op === 0 && Bd[0] + A[0] > 9) Bd[0] = 9 - A[0];
    return [Number(A.join("")), Number(Bd.join(""))];
  }
  const a = op ? 2000 + (h("a") % 8000) : 1000 + (h("a") % 7000);
  const b = op ? 1000 + (h("b") % (a - 1000)) : 1000 + (h("b") % (9999 - a - 999));
  return [a, b];
}

function mentN(mode: number, x: number): number {
  if (mode === 0) return 11 + ((37 * x) % 89);
  if (mode === 1) return 1003 + 113 * x;
  return 105 + 123 * x + (mode === 3 ? 7 : mode === 4 ? 3 : 0);
}

const RACERS = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Selvi", "Divya", "Imran", "Karthik", "Priya"];
const raceNames = (x: number) => [RACERS[x % 10], RACERS[(x + 3) % 10], RACERS[(x + 7) % 10]];
function raceTimes(x: number): number[] {
  const out: number[] = [];
  for (let i = 0; out.length < 3 && i < 50; i++) {
    const t = 45 + (hm(`race${x}:${i}`) % 86);
    if (!out.includes(t)) out.push(t);
  }
  if (!out.some((t) => t >= 60)) out[1] = 60 + (out[1] % 40) + (out.includes(60 + (out[1] % 40)) ? 1 : 0);
  return out;
}
const tShow = (t: number) => (t >= 60 ? `${Math.floor(t / 60)} min ${t % 60} s` : `${t} s`);
const UNITS3 = ["seconds", "minutes", "hours"];
/** [activity, unit, a typical time in seconds]. */
const ACTS: [string, string, number][] = [
  ["clap your hands once", "seconds", 1], ["brush your teeth", "minutes", 150], ["sleep at night", "hours", 30000], ["run 100 metres", "seconds", 20],
  ["cook a pot of rice", "minutes", 1200], ["finish a whole school day", "hours", 25000], ["tie your shoelaces", "seconds", 15], ["watch a full film", "hours", 9000],
  ["boil an egg", "minutes", 600], ["clap your hands ten times", "seconds", 6], ["walk one kilometre", "minutes", 720], ["travel from Chennai to Madurai by train", "hours", 28000],
  ["drink a glass of water", "seconds", 10], ["have a bath", "minutes", 900], ["play one day of a test match", "hours", 25000], ["write your name", "seconds", 8],
  ["eat your lunch", "minutes", 1200], ["make one kabaddi raid", "seconds", 30], ["cycle to a school 2 km away", "minutes", 600], ["fly from Chennai to Delhi", "hours", 10000],
  ["jump over a skipping rope once", "seconds", 1],
];

function durParts(mode: number, x: number): [number, number, number, number] {
  const h = (k: string) => hm(`du${mode}:${x}:${k}`);
  return [1 + (h("a") % 5), 5 * (h("b") % 12), 1 + (h("c") % 5), 5 * (h("d") % 12)];
}
const durSecs = (x: number) => 61 + ((53 * x) % 539);

/** The bars and number used by statement p of adbartf. */
function tfParts([c, s, k, t]: number[]): { x: number; y: number; n: number } {
  const v = barValues(c, s, 0);
  const j = s % 4;
  const i2 = (j + 1) % 4;
  const [x, y] = v[j] > v[i2] ? [j, i2] : [i2, j];
  const tot = v.reduce((a, b) => a + b, 0);
  if (k === 0) return t ? { x: y, y: x, n: 0 } : { x, y, n: 0 };
  if (k === 1) return { x, y, n: t ? tot - v[(s + 2) % 4] : tot };
  return { x, y, n: t ? v[x] + v[y] : v[x] - v[y] };
}
function tfStatement(p: number[]): string {
  const c = p[0];
  const L = BARCTX[c].labels;
  const { x, y, n } = tfParts(p);
  const one = (l: string) => l.toLowerCase();
  const many = (l: string) => (l === "Bus" ? "buses" : `${l.toLowerCase()}s`);
  const what = (k: number) => (n === 1 ? one(L[k]) : many(L[k]));
  if (c === 0) return p[2] === 0 ? `More children like ${L[x]} best than ${L[y]}.` : p[2] === 1 ? `${n} children were asked in all.` : `${n} more ${n === 1 ? "child likes" : "children like"} ${L[x]} best than ${L[y]}.`;
  if (c === 1) return p[2] === 0 ? `${L[x]} read more books than ${L[y]}.` : p[2] === 1 ? `The four friends read ${n} books in all.` : `${L[x]} read ${pl(n, "book")} more than ${L[y]}.`;
  const verb = c === 2 ? "seen" : "passed";
  return p[2] === 0 ? `More ${many(L[x])} than ${many(L[y])} were ${verb}.` : p[2] === 1 ? `${n} ${BARCTX[c].unit} were ${verb} in all.` : `${n} more ${what(x)} than ${many(L[y])} ${n === 1 ? "was" : "were"} ${verb}.`;
}

const an = (w: string) => `${/^[aeiou]/.test(w) ? "an" : "a"} ${w}`;
const REG: Record<number, string> = { 3: "equilateral triangle", 4: "square", 5: "regular pentagon", 6: "regular hexagon", 7: "regular heptagon", 8: "regular octagon" };

let FRACS: number[][] | null = null;
/** Fractions less than 1 in simplest form with bottoms 2 to 10 (31 of them), by bottom then top. */
function fracList(): number[][] {
  if (!FRACS) {
    FRACS = [];
    for (let b = 2; b <= 10; b++) for (let a = 1; a < b; a++) if (gcd(a, b) === 1) FRACS.push([a, b]);
  }
  return FRACS;
}

const SHOP: string[] = ["a school bag", "a water bottle", "a lunch box", "a geometry box", "a pair of slippers", "a torch", "an umbrella", "a storybook", "a cricket ball", "a pencil box", "a towel", "a steel tumbler"];
function costPrices(n: number, x: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const v = 12 + (hm(`cost${n}:${x}:${i}`) % 188);
    return v % 10 === 0 ? v + 5 : v;
  });
}
const costItems = (n: number, x: number): [string, number][] => costPrices(n, x).map((pr, i) => [SHOP[(x + 5 * i) % SHOP.length], pr]);

const KIDS = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Selvi", "Divya", "Imran", "Karthik", "Priya", "Vijay", "Lakshmi", "Suresh", "Fathima", "Naveen", "Revathi"];
const KIDG = ["Girl", "Boy", "Girl", "Boy", "Girl", "Girl", "Girl", "Boy", "Boy", "Girl", "Boy", "Girl", "Boy", "Girl", "Boy", "Girl"];
function recRows(s: number): string[][] {
  const m = 12 + (s % 5);
  const start = s % 16;
  return Array.from({ length: m }, (_, i) => {
    const k = (start + i) % 16;
    return [KIDS[k], KIDG[k], hm(`rec${s}:${i}`) % 2 ? "Dosa" : "Idli"];
  });
}
function recCounts(s: number): number[] {
  const R = recRows(s);
  const n = (g: string, c: string) => R.filter((r) => r[1] === g && r[2] === c).length;
  return [n("Boy", "Idli"), n("Boy", "Dosa"), n("Girl", "Idli"), n("Girl", "Dosa")];
}
const recAsk = (q: number) => ["How many boys chose idli?", "How many boys chose dosa?", "How many girls chose idli?", "How many girls chose dosa?", "How many boys are there in all?", "How many children chose idli in all?"][q];
