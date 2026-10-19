/**
 * families@2, batch b04 (Grades 1–5): perimeter of a shape and a missing side; hours, minutes and seconds; comparing
 * and ordering fractions; naming and building fractions; a fraction of a collection and of a measure; three-digit
 * addition and subtraction with regrouping; numbers to thousands (expanded form, making 1000, counting between);
 * estimating by rounding; reading bar charts; reading tally tables and two-way tables. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
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
const fracGrid = (a: number, b: number) => ({ type: "grid", rows: 1, cols: b, shaded: a });

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
        steps: [{ id: "compare", op: "compare", competency: FCMP, inputs: [fr(a, b), fr(c, d), mode], value: first ? a / b : c / d }],
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
        { id: "parts", op: "count", competency: FMOD, inputs: [r, c], value: r * c },
        { id: "name", op: "evaluate", competency: FMOD, inputs: [s, r * c], value: s / (r * c) },
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
];
