/**
 * Batch b22 (families@2, gap@1): new families for competencies whose first family is one of the original families
 * (families.ts, mirrored by the server, so it is not edited here). They close assessment gaps the outcome assessor
 * found (division by repeated subtraction, the multiplication fact behind a division, building tables beyond 12,
 * product strategies, partial products and the lattice, long division with remainders and N = D × Q + R, mental
 * division, equal fractions from folded paper, lowest terms, like and unlike fractions, subtracting and mixed
 * fractions, fraction word problems and the area model, statistical questions, exponential form, prime-power form,
 * the zero exponent, fractional exponents, remainders of sums and products, estimating large products, percentages
 * of one quantity in another and percentage change, marked price and overheads, mixtures, proportion tests, direct
 * variation, missing values and deviations from the mean, the median of a frequency table, conditional probability
 * from P(A ∩ B) and P(B), the multiplication theorem, comparing volumes and the cost of fencing). Each has an
 * everyday-situation form, so each competency gains a genuine transfer question. Written by OpenPath; CC0.
 *
 * Every `validate` uses a different method from `solve`: repeated addition or subtraction, counting, brute-force
 * search, substitution back, enumeration of outcomes, or cross-multiplication.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";
import { EXP, MT, factSlip, fmt, gcd, near, neg, show, sup } from "../family-kit";

const DR = "MATH.number.division-remainders";
const SHARE = "MATH.number.sharing";
const MM = "MATH.number.multi-multiplication";
const LD = "MATH.number.long-division";
const EQF = "MATH.number.equivalent-fractions";
const FA = "MATH.number.fraction-add";
const FAL = "MATH.number.fraction-add-like";
const FM = "MATH.number.fraction-multiply";
const FP = "MATH.number.fraction-product";
const SQ = "MATH.statistics.statistical-questions";
const RAD = "MATH.number.radicals";
const DIVB = "MATH.reasoning.divisibility";
const ROUND = "MATH.number.rounding";
const PCT = "MATH.number.percentage";
const PL = "MATH.number.profit-loss";
const WM = "MATH.statistics.weighted-mean";
const PROP = "MATH.number.proportion";
const AVG = "MATH.statistics.averages-intro";
const MED = "MATH.statistics.median-mode";
const COND = "MATH.probability.conditional";
const VOL = "MATH.measurement.volume-cubes";
const RP = "MATH.measurement.rectangle-perimeter";
const ADD = "MATH.number.addition";
const SUB = "MATH.number.subtraction";

// ---------------------------------------------------------------- helpers

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nameOf = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const hsh = (p: number[], salt = 0) => {
  let h = (2166136261 ^ salt) >>> 0;
  for (const v of p) h = Math.imul(h ^ (v + 1000), 16777619) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const inBox = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const gate = (d: [number, number][], keep: (p: number[]) => boolean, why: string) => (p: number[]) => (inBox(p, d) && keep(p) ? null : why);
const lv = (x: number, a: number, b: number): 1 | 2 | 3 => (x <= a ? 1 : x <= b ? 2 : 3);
/** Drop explanations without a prediction here (and falsy entries). */
const keepBugs = (bs: (Bug | false | null | undefined)[]) => bs.filter((b): b is Bug => !!b && b.predict !== null && !(Array.isArray(b.predict) && !b.predict.length));
/** A fixed order of n options that differs from problem to problem: perm[i] is the base option shown at letter i. */
const perm = (p: number[], n: number, salt: number) => [...Array(n).keys()].sort((a, b) => hsh([...p, a], salt) - hsh([...p, b], salt) || a - b);
/** Repeated addition: a added b times (b a whole number ≥ 0). */
const times = (a: number, b: number) => {
  let s = 0;
  for (let i = 0; i < b; i++) s += a;
  return s;
};
/** Thousands separated by commas, Indian style (12,34,567). */
const ind = (n: number) => {
  const s = String(Math.abs(n));
  if (s.length <= 3) return (n < 0 ? "−" : "") + s;
  const last = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (n < 0 ? "−" : "") + rest + "," + last;
};
const digits = (n: number) => String(n).split("").map(Number);

// ---------------------------------------------------------------- division by repeated subtraction (Grade 3)

const D_RSUB: [number, number][] = [[2, 9], [2, 10], [0, 8], [0, 1]];
const K_RSUB = ([d, q, r, ask]: number[]) => r < d && d * q + r <= 99 && (ask === 0 || r > 0);

// ---------------------------------------------------------------- the multiplication fact behind a division

const D_DFACT: [number, number][] = [[2, 10], [2, 12]];
const dfactBase = ([d, q]: number[]) => {
  const n = d * q;
  const near1 = hsh([d, q], 3) % 2 === 0 || q <= 2 ? q + 1 : q - 1;
  return [`${d} × ${q} = ${n}`, `${n} × ${d} = ${n * d}`, `${d} × ${near1} = ${d * near1}`, `${n} × ${q} = ${n * q}`];
};
const dfactPerm = (p: number[]) => perm(p, 4, 11);

// ---------------------------------------------------------------- building tables beyond 12

const D_TAB: [number, number][] = [[13, 19], [2, 10], [0, 2]];
const K_TAB = ([a, , s]: number[]) => (s === 0 ? true : s === 1 ? a % 2 === 0 : a === 15);

// ---------------------------------------------------------------- doubling and halving, nearest multiples

const DH = [5, 15, 25, 35, 45, 50, 125];
const NM = [9, 19, 29, 39, 49, 99, 11, 21, 31, 101];
const D_STRAT: [number, number][] = [[0, 9], [3, 48], [0, 1]];
const K_STRAT = ([i, y, s]: number[]) => (s === 0 ? i < DH.length && y % 2 === 0 && y >= 12 && (DH[i] === 125 ? y % 8 === 0 : true) : y <= 25);
const stratX = ([i, , s]: number[]) => (s === 0 ? DH[i] : NM[i]);

// ---------------------------------------------------------------- partial products

const D_PP: [number, number][] = [[12, 999], [12, 99], [0, 1]];
const K_PP = ([a, b]: number[]) => a % 10 !== 0 && b % 10 !== 0 && (a < 100 || a >= 101);
/** The non-zero place parts of a number: 347 → [300, 40, 7]. */
const parts = (n: number) => digits(n).map((g, i, a) => g * 10 ** (a.length - 1 - i)).filter((x) => x > 0);

// ---------------------------------------------------------------- the lattice method

const D_LAT: [number, number][] = [[12, 99], [12, 99], [0, 1]];
const K_LAT = ([a, b]: number[]) => a % 10 !== 0 && b % 10 !== 0;
/** Diagonal sums of the lattice for a × b, from the ones place upwards (before carrying). */
const latticeDiagonals = (a: number, b: number) => {
  const A = digits(a).reverse();
  const B = digits(b).reverse();
  const diag = Array(A.length + B.length).fill(0);
  A.forEach((x, i) =>
    B.forEach((y, j) => {
      diag[i + j] += (x * y) % 10;
      diag[i + j + 1] += Math.floor((x * y) / 10);
    }),
  );
  return diag;
};
const latticeFigure = (a: number, b: number): Visual => {
  const A = digits(a);
  const B = digits(b);
  return { type: "table", head: ["", ...A.map(String), ""], rows: B.map((y) => ["", ...A.map((x) => `${Math.floor((x * y) / 10)}/${(x * y) % 10}`), String(y)]) };
};

// ---------------------------------------------------------------- long division with a remainder

const D_DIV: [number, number][] = [[2, 39], [10, 999], [0, 38], [0, 2]];
const K_DIV = ([d, q, r, ask]: number[]) => {
  const n = d * q + r;
  if (r >= d || n < 100 || n > 9999) return false;
  if (d >= 10 && (d % 10 === 0 || n < 1000 || d < 11)) return false;
  return ask === 0 || r > 0;
};

// ---------------------------------------------------------------- mental division

const D_MDIV: [number, number][] = [[3, 16], [12, 99], [0, 1]];
const K_MDIV = ([d, q, s]: number[]) => (s === 0 ? d <= 9 && q % 10 !== 0 : [4, 8, 16].includes(d) && (d < 16 || q <= 60));
const halvings = (d: number) => (d === 4 ? 2 : d === 8 ? 3 : 4);

const P1: Def[] = [
  {
    id: "avrsub",
    arity: 4,
    title: "Dividing by repeated subtraction",
    competency: DR,
    type: "integer",
    mc: true,
    // [d, q, r, ask]: n = d·q + r; ask 0: how many times d can be taken away; ask 1: what is left at the end
    parse: none,
    reject: gate(D_RSUB, K_RSUB, "A number up to 99, taking away 2 to 9 again and again."),
    prompt: ([d, q, r, ask]) =>
      ask === 0
        ? `Start at ${d * q + r} and take away ${d} again and again, as long as you can. How many times can you take away ${d}?`
        : `Start at ${d * q + r} and keep taking away ${d} until you cannot take away ${d} any more. What number is left at the end?`,
    solve: ([d, q, r, ask]) => {
      const n = d * q + r;
      return { steps: [st("takes", "subtract", DR, [n, d, q], r), st("division", "divide", DR, [n, d, q, r], ask === 0 ? q : r)], answer: ask === 0 ? q : r };
    },
    // independent: count up in steps of d from what is left back to the start
    validate: ([d, q, r, ask], v) => {
      const n = d * q + r;
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
      if (ask === 0) return times(d, v) <= n && times(d, v + 1) > n;
      if (v >= d) return false;
      let x = v;
      while (x < n) x += d;
      return x === n;
    },
    bugs: ([d, q, r, ask]) => {
      const n = d * q + r;
      return ask === 0
        ? keepBugs([
            { id: "counted-the-start", kind: "procedural", competency: DR, says: `The starting number ${n} was counted as one of the take-aways, so the count came out one too many. Count only the times ${d} is taken away.`, predict: q + 1 },
            { id: "stopped-early", kind: "procedural", competency: DR, says: `The taking away stopped one step early: while ${d} or more is left, ${d} can be taken away again.`, predict: q - 1 },
            r > 0 && r !== q && { id: "left-for-times", kind: "conceptual", competency: DR, says: "The number left at the end was given; the question asks how many times the number was taken away.", predict: r },
          ])
        : keepBugs([
            { id: "stopped-early", kind: "procedural", competency: DR, says: `The taking away stopped one step early: ${r + d} is still ${d} or more, so ${d} can be taken away once more.`, predict: r + d },
            { id: "times-for-left", kind: "conceptual", competency: DR, says: "The number of take-aways was given; the question asks what is left at the end.", predict: q },
            { id: "assumed-exact", kind: "conceptual", competency: DR, says: `It was assumed the taking away ends exactly at 0, but ${n} is not a multiple of ${d}.`, predict: 0 },
          ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "takes" ? `${s.inputs[0]} − ${s.inputs[1]} − ${s.inputs[1]} − … : ${s.inputs[1]} is taken away ${s.inputs[2]} times and ${s.value} is left` : `So ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.inputs[2]}${s.inputs[3] ? ` remainder ${s.inputs[3]}` : ""}`),
    domain: D_RSUB,
    keep: K_RSUB,
    cap: 400,
    difficulty: ([d, q, r]) => lv(d * q + r, 30, 60),
    word: ([d, q, r, ask]) => {
      const n = d * q + r;
      const who = nameOf(n + d);
      return ask === 0
        ? `${who} has ${n} laddus and fills boxes with ${d} laddus each, one box after another${r ? `, until fewer than ${d} are left` : ", until none are left"}. How many boxes does ${who} fill?`
        : `${who} has ${n} laddus and fills boxes with ${d} laddus each, one box after another, until fewer than ${d} are left. How many laddus are left over?`;
    },
    teach: {
      idea: "Dividing asks how many times a number can be taken away: each take-away is one equal group.",
      method: "Keep subtracting the divisor and count the subtractions; stop when what is left is smaller than the divisor. That is the remainder.",
      visual: ([d, q, r]) => ({ type: "numberline", from: 0, to: d * q + r, jumps: [...Array(q).keys()].map((k) => [d * q + r - k * d, d * q + r - (k + 1) * d]) }),
      alternatives: [
        { id: "groups", title: "Make groups and count them", kind: "conceptual", text: ["Put out counters for the number.", "Move them away in groups of the divisor; count the groups and the counters left."], visual: ([d, q, r]) => ({ type: "dots", count: d * q + r, rows: Math.ceil((d * q + r) / 10) }) },
      ],
    },
    limits: "Numbers up to 99, taking away 2 to 9; larger dividends are long division (avdiv).",
  },
  {
    id: "avdfact",
    arity: 2,
    title: "The multiplication fact behind a division",
    competency: DR,
    type: "choice",
    // [d, q]: n = d·q; which multiplication fact shows n ÷ d = q?
    parse: none,
    reject: gate(D_DFACT, ([d, q]) => d !== q, "n ÷ d = q with d from 2 to 10 and q from 2 to 12."),
    choices: (p) => dfactPerm(p).map((i) => dfactBase(p)[i]),
    prompt: ([d, q]) => `Which multiplication fact shows that ${d * q} ÷ ${d} = ${q}?`,
    solve: (p) => {
      const [d, q] = p;
      return { steps: [st("groups", "multiply", MT, [d, q], d * q), st("undo", "divide", DR, [d * q, d], q)], answer: dfactPerm(p).indexOf(0) };
    },
    // independent: read the chosen fact back and check it by repeated addition: d groups of q make n
    validate: (p, v) => {
      const [d, q] = p;
      if (typeof v !== "number") return false;
      const opt = dfactBase(p)[dfactPerm(p)[v]];
      const m = opt?.match(/^(\d+) × (\d+) = (\d+)$/);
      if (!m) return false;
      const [x, y, z] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return times(y, x) === z && z === times(q, d) && ((x === d && y === q) || (x === q && y === d));
    },
    bugs: (p) => {
      const [d, q] = p;
      const pr = dfactPerm(p);
      return [
        { id: "multiply-the-dividend", kind: "conceptual", competency: DR, says: `The number being divided (${d * q}) was multiplied again. A division undoes a multiplication: ${d} groups of the answer make ${d * q}.`, predict: [pr.indexOf(1), pr.indexOf(3)] },
        { ...factSlip(d, q), says: `The fact ${d} × ${q} is not yet reliable, so a fact one group away was chosen.`, predict: pr.indexOf(2) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "groups" ? `${s.inputs[0]} groups of ${s.inputs[1]} make ${s.value}` : `So ${s.inputs[0]} shared into groups of ${s.inputs[1]} gives ${s.value}: ${s.inputs[1]} × ${s.value} = ${s.inputs[0]}`),
    domain: D_DFACT,
    keep: ([d, q]) => d !== q,
    difficulty: ([d, q]) => (d <= 5 && q <= 5 ? 1 : d * q <= 60 ? 2 : 3),
    word: ([d, q]) => `${nameOf(d + q)} shares ${d * q} bangles equally into ${d} boxes and finds ${q} bangles in each box. Which multiplication fact checks this sharing?`,
    teach: {
      idea: "Multiplication and division are opposites: if d groups of q make n, then n ÷ d = q and n ÷ q = d.",
      method: "To check n ÷ d = q, multiply the divisor by the answer: d × q should give n.",
      visual: ([d, q]) => ({ type: "array", rows: d, cols: q }),
      alternatives: [
        { id: "array", title: "Rows of an array", kind: "conceptual", text: ["Arrange the objects in rows, one row for each share.", "Rows × objects in a row gives the total: that is the multiplication fact."], visual: ([d, q]) => ({ type: "array", rows: d, cols: q }) },
      ],
    },
    limits: "Exact divisions up to 10 × 12; the division facts from a multiplication fact are another family.",
  },
  {
    id: "avtab",
    arity: 3,
    title: "Building the 13 to 19 times tables",
    competency: MT,
    type: "integer",
    mc: true,
    // [a, b, s]: a × b; s 0: split a into 10 and a − 10; s 1: double the (a/2) table; s 2 (a = 15): 10 × b plus half of it
    parse: none,
    reject: gate(D_TAB, K_TAB, "Tables 13 to 19 up to × 10, built by splitting, doubling or halving."),
    prompt: ([a, b, s]) =>
      s === 0
        ? `Build the ${a} times table from facts you know: ${a} × ${b} = 10 × ${b} + ${a - 10} × ${b}. What is ${a} × ${b}?`
        : s === 1
          ? `Build the ${a} times table by doubling the ${a / 2} times table: ${a / 2} × ${b} = ${(a / 2) * b}. What is ${a} × ${b}?`
          : `Build the 15 times table: 15 × ${b} = 10 × ${b} + 5 × ${b}, and 5 × ${b} is half of 10 × ${b}. What is 15 × ${b}?`,
    solve: ([a, b, s]) => {
      if (s === 0) return { steps: [st("ten", "multiply", MT, [10, b], 10 * b), st("rest", "multiply", MT, [a - 10, b], (a - 10) * b), st("join", "add", ADD, [10 * b, (a - 10) * b], a * b)], answer: a * b };
      if (s === 1) return { steps: [st("half", "multiply", MT, [a / 2, b], (a / 2) * b), st("double", "multiply", MT, [2, (a / 2) * b], a * b)], answer: a * b };
      return { steps: [st("ten", "multiply", MT, [10, b], 10 * b), st("halve", "divide", MT, [10 * b, 2], 5 * b), st("join", "add", ADD, [10 * b, 5 * b], 15 * b)], answer: 15 * b };
    },
    validate: ([a, b], v) => v === times(a, b),
    bugs: ([a, b, s]) =>
      s === 0
        ? [
            { id: "ten-part-left-out", kind: "procedural", competency: MT, says: `Only the ${a - 10} × ${b} part was worked out; the 10 × ${b} part must be added on.`, predict: (a - 10) * b },
            { id: "added-not-multiplied", kind: "procedural", competency: MT, says: `${a - 10} was added instead of ${a - 10} × ${b}: both parts of ${a} are multiplied by ${b}.`, predict: 10 * b + a - 10 },
            factSlip(a - 10, b, 1, 10 * b),
          ]
        : s === 1
          ? [
              { id: "not-doubled", kind: "procedural", competency: MT, says: `The ${a / 2} times fact was given without doubling it; ${a} is twice ${a / 2}, so the answer is twice as big.`, predict: (a / 2) * b },
              { id: "added-for-double", kind: "conceptual", competency: MT, says: `${a / 2} was added to the fact instead of doubling it: ${a} groups of ${b} is two lots of ${a / 2} groups.`, predict: (a / 2) * b + a / 2 },
            ]
          : [
              { id: "not-halved", kind: "procedural", competency: MT, says: `The 5 × ${b} part was taken as 10 × ${b} again; it is half of it.`, predict: 20 * b },
              { id: "only-half", kind: "procedural", competency: MT, says: `Only the half (5 × ${b}) was given; the 10 × ${b} part must be added.`, predict: 5 * b },
            ],
    variants: () => [],
    explain: (s) => (s.id === "double" ? `Double it: 2 × ${s.inputs[1]} = ${s.value}` : s.id === "halve" ? `Half of ${s.inputs[0]} is ${s.value}` : s.id === "join" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: D_TAB,
    keep: K_TAB,
    difficulty: ([a, b, s]) => (s === 1 && a <= 14 ? 1 : b <= 5 ? 1 : a <= 16 ? 2 : 3),
    word: ([a, b]) => `A bus ticket costs ₹${a}. ${nameOf(a + b)} buys ${b} tickets for the family. How much does ${nameOf(a + b)} pay, in rupees?`,
    teach: {
      idea: "A new table can be built from known ones: 14 groups is 10 groups and 4 groups, or two lots of 7 groups.",
      method: "Split the number into 10 and the rest and add the two facts, or double a table you know (14 = 2 × 7, 16 = 2 × 8).",
      visual: ([a, b]) => ({ type: "array", rows: b, cols: a, split: 10 }),
      alternatives: [
        { id: "array_split", title: "Split the array", kind: "conceptual", text: ["Draw the product as an array of rows and columns.", "Cut it after 10 columns: the two smaller arrays are facts you know; add them."], visual: ([a, b]) => ({ type: "array", rows: b, cols: a, split: 10 }) },
      ],
    },
    limits: "Tables 13 to 19 up to × 10; recall of facts up to 12 × 12 is the family mul.",
  },
  {
    id: "avstrat",
    arity: 3,
    title: "Products by doubling and halving or a nearest multiple",
    competency: MM,
    type: "integer",
    mc: true,
    // [i, y, s]: s 0: x = DH[i] doubled while y is halved; s 1: x = NM[i] next to a multiple of ten
    parse: none,
    reject: gate(D_STRAT, K_STRAT, "Doubling and halving with 5, 15, 25, 35, 45, 50 or 125, or a factor next to a multiple of 10."),
    prompt: (p) => {
      const [, y, s] = p;
      const x = stratX(p);
      if (s === 0) return `Work out ${x} × ${y} by doubling ${x} and halving ${y} (as many times as helps): ${x} × ${y} = ${2 * x} × ${y / 2}. What is ${x} × ${y}?`;
      const m = x % 10 === 9 ? x + 1 : x - 1;
      return `Work out ${x} × ${y} using the nearest multiple of ten: ${x} × ${y} = ${m} × ${y} ${x < m ? "−" : "+"} ${y}. What is ${x} × ${y}?`;
    },
    solve: (p) => {
      const [, y, s] = p;
      const x = stratX(p);
      if (s === 0) return { steps: [st("swap", "multiply", MM, [2 * x, y / 2], x * y)], answer: x * y };
      const m = x % 10 === 9 ? x + 1 : x - 1;
      return { steps: [st("round", "multiply", MM, [m, y], m * y), st("adjust", x < m ? "subtract" : "add", MM, [m * y, y], x * y)], answer: x * y };
    },
    validate: (p, v) => v === times(stratX(p), p[1]),
    bugs: (p) => {
      const [, y, s] = p;
      const x = stratX(p);
      if (s === 0)
        return [
          { id: "halved-only", kind: "procedural", competency: MM, says: `${y} was halved but ${x} was not doubled: halving one factor and doubling the other keeps the product the same.`, predict: (x * y) / 2 },
          { id: "doubled-both", kind: "conceptual", competency: MM, says: "Both numbers were doubled; that makes the product four times as big.", predict: 4 * x * y },
        ];
      const m = x % 10 === 9 ? x + 1 : x - 1;
      return [
        { id: "no-adjust", kind: "procedural", competency: MM, says: `${m} × ${y} was given without the last step: ${x} is ${x < m ? "one less" : "one more"} than ${m}, so one group of ${y} must be ${x < m ? "taken away" : "added"}.`, predict: m * y },
        { id: "adjust-by-one", kind: "conceptual", competency: MM, says: `1 was ${x < m ? "taken away" : "added"} instead of one whole group of ${y}.`, predict: x < m ? m * y - 1 : m * y + 1 },
        { id: "wrong-way", kind: "procedural", competency: MM, says: `The group of ${y} was ${x < m ? "added" : "taken away"}; ${x} groups is ${x < m ? "fewer" : "more"} than ${m} groups.`, predict: x < m ? m * y + y : m * y - y },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "swap" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "round" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} ${s.op === "subtract" ? "−" : "+"} ${s.inputs[1]} = ${s.value}`),
    domain: D_STRAT,
    keep: K_STRAT,
    cap: 320,
    difficulty: (p) => lv(stratX(p) * p[1], 300, 1000),
    word: (p) => {
      const [, y, s] = p;
      const x = stratX(p);
      return s === 0 ? `A dairy farm fills ${y} cans with ${x} litres of milk each. How many litres of milk is that?` : `A dairy sells milk packets at ₹${x} each. A hotel buys ${y} packets. How much does the hotel pay, in rupees?`;
    },
    teach: {
      idea: "Doubling one factor and halving the other leaves the product unchanged; a factor next to a multiple of ten is that multiple minus (or plus) one group.",
      method: "25 × 36 = 50 × 18 = 100 × 9 = 900. 19 × 24 = 20 × 24 − 24 = 480 − 24 = 456.",
      alternatives: [
        { id: "rectangle", title: "Reshape a rectangle", kind: "conceptual", text: ["Think of x × y as a rectangle of squares.", "Cut it in half along one side and put the halves end to end: twice as long, half as wide, the same squares."], visual: () => ({ type: "array", rows: 4, cols: 6 }) },
      ],
    },
    limits: "Doubling with 5, 15, 25, 35, 45, 50 and 125, and nearest multiples for 9, 11, 19, 21, …, 99 and 101; written column multiplication is avpp.",
  },
  {
    id: "avpp",
    arity: 3,
    title: "Multiplying with partial products",
    competency: MM,
    type: "integer",
    mc: true,
    // [a, b, k]: a × b with b = T + o; k 0: the product; k 1: the partial product a × T
    parse: none,
    reject: gate(D_PP, K_PP, "A two- or three-digit number times a two-digit number (neither a multiple of 10)."),
    prompt: ([a, b, k]) => {
      const T = b - (b % 10);
      const o = b % 10;
      return k === 0
        ? `Multiply ${a} × ${b} with partial products: split ${b} into ${T} + ${o}, work out ${a} × ${T} and ${a} × ${o}, and add them. What is ${a} × ${b}?`
        : `In ${a} × ${b}, ${b} is split into ${T} + ${o}. What is the partial product ${a} × ${T}?`;
    },
    figure: ([a, b]) => ({ type: "table", head: ["×", ...parts(a).map(String)], rows: parts(b).map((y) => [String(y), ...parts(a).map(() => "?")]) }),
    solve: ([a, b, k]) => {
      const T = b - (b % 10);
      const o = b % 10;
      const tens = st("tens", "multiply", MM, [a, T], a * T);
      if (k === 1) return { steps: [tens], answer: a * T };
      return { steps: [tens, st("ones", "multiply", MM, [a, o], a * o), st("sum", "add", ADD, [a * T, a * o], a * b)], answer: a * b };
    },
    // independent: repeated addition
    validate: ([a, b, k], v) => v === times(a, k === 1 ? b - (b % 10) : b),
    bugs: ([a, b, k]) => {
      const t = Math.floor(b / 10);
      const o = b % 10;
      return k === 0
        ? [
            { id: "tens-as-ones", kind: "conceptual", competency: MM, says: `${a} was multiplied by ${t} instead of ${t * 10}: the tens digit of ${b} stands for ${t * 10}, so that partial product ends in 0.`, predict: a * t + a * o },
            { id: "one-partial-product", kind: "procedural", competency: MM, says: `Only one partial product was found; ${a} × ${b} needs both ${a} × ${t * 10} and ${a} × ${o}, added together.`, predict: [a * t * 10, a * o] },
            { id: "multiplied-place-by-place", kind: "conceptual", competency: MM, says: "Digits were multiplied only with the digit in the same place (tens with tens, ones with ones); every part of one number multiplies every part of the other.", predict: a < 100 ? Math.floor(a / 10) * t * 100 + (a % 10) * o : null },
          ].filter((x) => x.predict !== null) as Bug[]
        : [
            { id: "dropped-zero", kind: "conceptual", competency: MM, says: `${a} was multiplied by ${t} instead of ${t * 10}: multiplying by ${t} tens makes ${t} tens of ${a}, so the answer ends in 0.`, predict: a * t },
            { id: "used-ones", kind: "procedural", competency: MM, says: `${a} × ${o} was given; that is the other partial product.`, predict: a * o },
          ];
    },
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `Add the partial products: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: D_PP,
    keep: K_PP,
    cap: 420,
    difficulty: ([a, b]) => (a < 50 && b < 30 ? 1 : a < 100 ? 2 : 3),
    word: ([a, b, k]) => {
      const T = b - (b % 10);
      return k === 0 ? `A school orders ${b} boxes of chalk with ${a} sticks in each box. How many sticks of chalk is that?` : `A school orders ${b} boxes of chalk with ${a} sticks in each box. The first ${T} boxes go to the primary classes. How many sticks are in those ${T} boxes?`;
    },
    teach: {
      idea: "Splitting a factor by place value turns one hard product into easier ones: 47 × 36 = 47 × 30 + 47 × 6.",
      method: "Multiply by the tens (the answer ends in 0), multiply by the ones, then add the partial products.",
      visual: ([a, b]) => ({ type: "table", head: ["×", ...parts(a).map(String)], rows: parts(b).map((y) => [String(y), ...parts(a).map((x) => String(x * y))]) }),
      alternatives: [
        { id: "area", title: "An area model", kind: "conceptual", text: ["Draw a rectangle with sides split by place value, e.g. 40 + 7 and 30 + 6.", "Find the area of each small rectangle (40 × 30, 7 × 30, 40 × 6, 7 × 6) and add them all."], visual: ([a, b]) => ({ type: "table", head: ["×", ...parts(a).map(String)], rows: parts(b).map((y) => [String(y), ...parts(a).map((x) => String(x * y))]) }) },
      ],
    },
    limits: "Two- or three-digit numbers times two-digit numbers, neither a multiple of 10; four-digit factors are left out.",
  },
  {
    id: "avlat",
    arity: 3,
    title: "Multiplying with the lattice method",
    competency: MM,
    type: "integer",
    mc: true,
    // [a, b, k]: the lattice for a × b; k 0: the product; k 1: the total of the tens diagonal before carrying
    parse: none,
    reject: gate(D_LAT, K_LAT, "A two-digit number times a two-digit number (neither a multiple of 10)."),
    prompt: ([a, b, k]) =>
      k === 0
        ? `The picture shows the lattice for ${a} × ${b}: ${a} along the top, ${b} down the right side, and each box holds the product of its digits as tens/ones. Add along the diagonals from the right, carrying when a diagonal adds up to 10 or more. What is ${a} × ${b}?`
        : `The picture shows the lattice for ${a} × ${b}: ${a} along the top, ${b} down the right side, and each box holds the product of its digits as tens/ones. What is the total of the second diagonal from the right (the tens place), before any carrying?`,
    figure: ([a, b]) => latticeFigure(a, b),
    solve: ([a, b, k]) => {
      const dg = latticeDiagonals(a, b);
      if (k === 1) return { steps: [st("diag", "add", MM, [1], dg[1])], answer: dg[1] };
      return { steps: [...dg.map((x, i) => st(`d${i}`, "add", MM, [i], x)), st("carry", "evaluate", MM, dg, a * b)], answer: a * b };
    },
    // independent: k 0 by repeated addition; k 1 by reading the boxes of the picture by their row and column
    validate: ([a, b, k], v) => {
      if (k === 0) return v === times(a, b);
      const fig = latticeFigure(a, b) as { rows: string[][] };
      const nr = fig.rows.length;
      let tot = 0;
      fig.rows.forEach((row, r) =>
        row.slice(1, -1).forEach((cell, c) => {
          const [t, o] = cell.split("/").map(Number);
          const fromRight = row.length - 3 - c + (nr - 1 - r); // diagonal of the ones half
          if (fromRight === 1) tot += o;
          if (fromRight + 1 === 1) tot += t;
        }),
      );
      return v === tot;
    },
    bugs: ([a, b, k]) => {
      const dg = latticeDiagonals(a, b);
      if (k === 0) {
        const noCarry = dg.reduce((s, x, i) => s + (x % 10) * 10 ** i, 0);
        let swapped = 0;
        digits(a).reverse().forEach((x, i) => digits(b).reverse().forEach((y, j) => (swapped += ((x * y) % 10) * 10 ** (i + j + 1) + Math.floor((x * y) / 10) * 10 ** (i + j))));
        return [
          { id: "no-carry", kind: "procedural", competency: MM, says: "Only the ones digit of each diagonal total was written; when a diagonal adds up to 10 or more, the tens are carried to the next diagonal.", predict: noCarry !== a * b ? noCarry : null },
          { id: "box-halves-swapped", kind: "procedural", competency: MM, says: "The two halves of the boxes were read the wrong way round: the upper-left half holds the tens and the lower-right half the ones.", predict: swapped !== a * b ? swapped : null },
        ].filter((x) => x.predict !== null) as Bug[];
      }
      let onesOnly = 0;
      const A = digits(a).reverse();
      const B = digits(b).reverse();
      A.forEach((x, i) => B.forEach((y, j) => i + j === 1 && (onesOnly += (x * y) % 10)));
      return keepBugs([
        { id: "ones-halves-only", kind: "procedural", competency: MM, says: "Only the ones halves were added; a diagonal also runs through the tens halves of the boxes below and to the right.", predict: onesOnly !== dg[1] ? onesOnly : null },
        { id: "wrong-diagonal", kind: "procedural", competency: MM, says: "The diagonals were counted from the wrong end or one too far along; the ones diagonal is the single half-box at the bottom right.", predict: [dg[0], dg[2]].filter((x) => x !== dg[1]) },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "carry" ? `Diagonal totals ${[...(s.inputs as number[])].reverse().join(", ")} (from the left), carried into place: ${s.value}` : `Diagonal ${Number(s.inputs[0]) + 1} from the right adds up to ${s.value}`),
    domain: D_LAT,
    keep: K_LAT,
    cap: 320,
    difficulty: ([a, b, k]) => (k === 1 ? 2 : latticeDiagonals(a, b).some((x) => x >= 10) ? 3 : 1),
    word: ([a, b, k]) =>
      k === 0
        ? `A shopkeeper stacks ${b} crates with ${a} bottles in each. Using the lattice in the picture, how many bottles are there?`
        : `A shopkeeper stacks ${b} crates with ${a} bottles in each and works out the total with the lattice in the picture. What is the total of the tens diagonal, before carrying?`,
    teach: {
      idea: "The lattice keeps every digit product in its place: each diagonal collects the digits of one place value.",
      method: "Fill each box with the product of its digits (tens above the slash, ones below), add along the diagonals from the bottom right, and carry when a total is 10 or more.",
      visual: ([a, b]) => latticeFigure(a, b),
      alternatives: [
        { id: "partial", title: "Check with partial products", kind: "procedural", text: ["Split one number by place value: 46 × 23 = 46 × 20 + 46 × 3.", "Both methods add the same digit products; the lattice just lines them up on diagonals."] },
      ],
    },
    limits: "Two-digit by two-digit lattices (neither a multiple of 10); larger lattices draw too many boxes for a phone screen.",
  },
  {
    id: "avdiv",
    arity: 4,
    title: "Long division with a remainder, and dividend = divisor × quotient + remainder",
    competency: LD,
    type: "integer",
    mc: true,
    // [d, q, r, ask]: n = d·q + r; ask 0: the quotient; ask 1: the remainder; ask 2: the dividend from d, q and r
    parse: none,
    reject: gate(D_DIV, K_DIV, "Three- or four-digit numbers divided by 2 to 9, or four-digit numbers by 11 to 39."),
    prompt: ([d, q, r, ask]) => {
      const n = d * q + r;
      return ask === 0
        ? `Use long division to work out ${n} ÷ ${d}. What is the quotient?`
        : ask === 1
          ? `Use long division to work out ${n} ÷ ${d}. What is the remainder?`
          : `A division has divisor ${d}, quotient ${q} and remainder ${r}. Use dividend = divisor × quotient + remainder. What is the dividend?`;
    },
    solve: ([d, q, r, ask]) => {
      const n = d * q + r;
      if (ask === 2) return { steps: [st("dq", "multiply", LD, [d, q], d * q), st("plus", "add", ADD, [d * q, r], n)], answer: n };
      return { steps: [st("long", "divide", LD, [n, d], q), st("back", "multiply", LD, [d, q], d * q), st("left", "subtract", DR, [n, d * q], r)], answer: ask === 0 ? q : r };
    },
    // independent: repeated subtraction of the divisor, counting the subtractions
    validate: ([d, q, r, ask], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      if (ask === 2) {
        let x = v;
        let c = 0;
        while (x >= d) (x -= d), c++;
        return c === q && x === r;
      }
      let x = d * q + r;
      let c = 0;
      while (x >= d) (x -= d), c++;
      return v === (ask === 0 ? c : x);
    },
    bugs: ([d, q, r, ask]) => {
      const n = d * q + r;
      if (ask === 2)
        return keepBugs([
          { id: "remainder-left-out", kind: "procedural", competency: LD, says: `Only divisor × quotient was found; the remainder ${r} must be added on.`, predict: d * q },
          { id: "remainder-to-quotient", kind: "procedural", competency: LD, says: `The remainder was added to the quotient before multiplying; it is added after: ${d} × ${q} + ${r}.`, predict: d * (q + r) },
          { id: "subtracted-remainder", kind: "conceptual", competency: LD, says: "The remainder was taken away; it is what was left over, so it is added back.", predict: d * q - r },
        ]);
      const qs = String(q);
      const noZero = qs.includes("0") ? Number(qs.replace(/0/g, "")) : null;
      if (ask === 0)
        return keepBugs([
          noZero !== null && noZero > 0 && { id: "dropped-zero", kind: "procedural", competency: LD, says: "A zero in the quotient was left out: when the divisor does not go into a step, a 0 is written in the quotient.", predict: noZero },
          { id: "one-group-off", kind: "recall", competency: MT, says: `A multiplication fact with ${d} slipped by one group in one step.`, predict: [q + 1, q - 1] },
        ]);
      return keepBugs([
        { id: "remainder-too-big", kind: "procedural", competency: DR, says: `One group too few was taken: a remainder is always less than the divisor ${d}.`, predict: r + d },
        { id: "quotient-for-remainder", kind: "conceptual", competency: DR, says: "The quotient was given; the remainder is what is left after the last subtraction.", predict: q },
        { id: "first-step-remainder", kind: "procedural", competency: LD, says: "The remainder of the first step was given; the division continues to the last digit.", predict: (() => { const s = String(n); let k = 1; while (Number(s.slice(0, k)) < d) k++; const f = Number(s.slice(0, k)) % d; return k < s.length && f !== r ? f : null; })() },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "long" ? `${s.inputs[0]} ÷ ${s.inputs[1]}: the quotient is ${s.value}` : s.id === "back" || s.id === "dq" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "left" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} is the remainder` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: D_DIV,
    keep: K_DIV,
    cap: 500,
    difficulty: ([d, q, r]) => (d >= 10 ? 3 : d * q + r >= 1000 ? 2 : 1),
    word: ([d, q, r, ask]) => {
      const n = d * q + r;
      return ask === 0
        ? `A farmer plants ${n} saplings in rows of ${d}. How many full rows are there?`
        : ask === 1
          ? `A farmer plants ${n} saplings in rows of ${d}. How many saplings are left over after the full rows?`
          : `A librarian ties books in bundles of ${d}. There are ${q} full bundles and ${r} books left over. How many books are there?`;
    },
    teach: {
      idea: "Long division shares out one place at a time; the remainder is what is left when no more full groups fit, and it is always less than the divisor.",
      method: "Divide, multiply, subtract and bring down the next digit, again and again. Check: divisor × quotient + remainder = dividend.",
      alternatives: [
        { id: "chunks", title: "Take away big chunks", kind: "procedural", text: ["Take away easy multiples of the divisor: 100 groups, 10 groups, single groups.", "Add up the groups taken away (the quotient); what is left at the end is the remainder."] },
      ],
    },
    limits: "Three- and four-digit dividends by 2 to 9, and four-digit dividends by 11 to 39 (not multiples of 10); five-digit dividends are left out.",
  },
  {
    id: "avmdiv",
    arity: 3,
    title: "Dividing mentally by splitting or by halving",
    competency: LD,
    type: "integer",
    mc: true,
    // [d, q, s]: n = d·q; s 0: split n into a multiple of 10·d and the rest; s 1: d = 4, 8 or 16, halve repeatedly
    parse: none,
    reject: gate(D_MDIV, K_MDIV, "Splitting the dividend for 3 to 9, or halving repeatedly for 4, 8 and 16."),
    prompt: ([d, q, s]) => {
      const n = d * q;
      if (s === 1) return `Work out ${n} ÷ ${d} in your head by halving ${halvings(d)} times (${d} = ${Array(halvings(d)).fill(2).join(" × ")}). What is ${n} ÷ ${d}?`;
      const A = d * 10 * Math.floor(q / 10);
      return `Work out ${n} ÷ ${d} in your head by splitting ${n} into ${A} + ${n - A}. What is ${n} ÷ ${d}?`;
    },
    solve: ([d, q, s]) => {
      const n = d * q;
      if (s === 1) {
        const steps: Step[] = [];
        let x = n;
        for (let i = 0; i < halvings(d); i++) steps.push(st(`h${i}`, "divide", LD, [x, 2], (x /= 2)));
        return { steps, answer: q };
      }
      const A = d * 10 * Math.floor(q / 10);
      return { steps: [st("big", "divide", LD, [A, d], A / d), st("rest", "divide", MT, [n - A, d], (n - A) / d), st("join", "add", ADD, [A / d, (n - A) / d], q)], answer: q };
    },
    // independent: the answer times the divisor (repeated addition) gives the dividend
    validate: ([d, q], v) => typeof v === "number" && v > 0 && times(v, d) === d * q,
    bugs: ([d, q, s]) => {
      const n = d * q;
      if (s === 1)
        return keepBugs([
          { id: "halved-once-too-few", kind: "procedural", competency: LD, says: `The halving stopped one time too soon: dividing by ${d} means halving ${halvings(d)} times.`, predict: 2 * q },
          { id: "halved-once", kind: "conceptual", competency: LD, says: `The number was halved only once; halving once divides by 2, not by ${d}.`, predict: n / 2 !== 2 * q ? n / 2 : null },
        ]);
      const A = d * 10 * Math.floor(q / 10);
      return keepBugs([
        { id: "rest-not-divided", kind: "procedural", competency: LD, says: `Only the first part (${A}) was divided; the other part (${n - A}) must be divided by ${d} too.`, predict: A / d + (n - A) },
        { id: "first-part-only", kind: "procedural", competency: LD, says: `Only ${A} ÷ ${d} was given; the answers for both parts are added.`, predict: A / d },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "join" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.op === "divide" && String(s.id).startsWith("h") ? `Half of ${s.inputs[0]} is ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: D_MDIV,
    keep: K_MDIV,
    cap: 360,
    difficulty: ([d, q, s]) => (s === 0 ? lv(d * q, 150, 400) : d === 4 ? 1 : d === 8 ? 2 : 3),
    word: ([d, q, s]) => (s === 0 ? `A coconut farmer packs ${d * q} coconuts equally into ${d} sacks. How many coconuts go into each sack?` : `${d * q} coconuts are shared equally among ${d} families of a village. How many coconuts does each family get?`),
    teach: {
      idea: "A dividend can be split into parts that are easy to divide; dividing by 4 or 8 is halving two or three times.",
      method: "Split into a multiple of 10 × divisor and the rest, divide each part and add. For ÷ 8, halve, halve and halve again.",
      alternatives: [
        { id: "share", title: "Share in two rounds", kind: "conceptual", text: ["Share the big part first: 80 among 4 is 20 each.", "Then share what is left: 16 among 4 is 4 each. Each share gets 20 + 4 = 24."] },
      ],
    },
    limits: "Exact divisions only; splitting for divisors 3 to 9 and halving for 4, 8 and 16.",
  },
];
