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
import { b1Object } from "../typed-contract.ts";
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
const tm = (n: number) => (n === 1 ? "once" : `${n} times`);
/** "1 book", "3 books". */
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
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
            { id: "dropped-zero", kind: "conceptual", competency: MM, says: `${a} was multiplied by ${t} instead of ${t * 10}: multiplying by ${pl(t, "ten")} makes ${pl(t, "ten")} of ${a}, so the answer ends in 0.`, predict: a * t },
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
        ? `The grid in the picture is the lattice for ${a} × ${b}: ${a} along the top, ${b} down the right side, and each box holds the product of its digits written tens/ones. (The diagonals are not drawn: each runs from the top right to the bottom left, through the ones half of one box and the tens half of the next box below or to the left.) Add along the diagonals from the bottom right, carrying when a diagonal adds up to 10 or more. What is ${a} × ${b}?`
        : `The grid in the picture is the lattice for ${a} × ${b}: ${a} along the top, ${b} down the right side, and each box holds the product of its digits written tens/ones. (The diagonals are not drawn: each runs from the top right to the bottom left, through the ones half of one box and the tens half of the next box below or to the left.) What is the total of the second diagonal from the bottom right (the tens place), before any carrying?`,
    figure: ([a, b]) => latticeFigure(a, b),
    solve: ([a, b, k]) => {
      const dg = latticeDiagonals(a, b);
      if (k === 1) return { steps: [st("diag", "add", MM, [1], dg[1])], answer: dg[1] };
      return { steps: [...dg.map((x, i) => st(`d${i}`, "add", MM, [i], x)), st("carry", "evaluate", MM, dg, a * b)], answer: a * b };
    },
    // independent: k 0 by repeated addition; k 1 by reading the boxes of the picture by their row and column
    validate: ([a, b, k], v) => {
      if (k === 0) return v === times(a, b);
      const fig = latticeFigure(a, b) as unknown as { rows: string[][] };
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
        ? `A shopkeeper stacks ${b} crates with ${a} bottles in each. Using the lattice grid in the picture (each box holds tens/ones; add along the diagonals from the bottom right), how many bottles are there?`
        : `A shopkeeper stacks ${b} crates with ${a} bottles in each and works out the total with the lattice grid in the picture (each box holds tens/ones). What is the total of the tens diagonal (the second from the bottom right), before carrying?`,
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
    // level@1: dividing by a two-digit number is Grade 5 work
    grade: ([d]) => (d >= 10 ? 5 : 4),
    word: ([d, q, r, ask]) => {
      const n = d * q + r;
      return ask === 0
        ? `A farmer plants ${n} saplings in rows of ${d}. How many full rows are there?`
        : ask === 1
          ? `A farmer plants ${n} saplings in rows of ${d}. How many saplings are left over after the full rows?`
          : `A librarian ties books in bundles of ${d}. There are ${q} full bundles and ${pl(r, "book")} left over. How many books are there?`;
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

// ================================================================ fractions, statistical questions, powers, remainders

const lowest = (n: number, d: number) => {
  const g = gcd(n, d);
  return [n / g, d / g];
};
/** A mixed number in simplest form: "2 5/12", "5/6", "3". */
const mixedStr = (n: number, d: number) => {
  const [p, q] = lowest(n, d);
  const w = Math.floor(p / q);
  const r = p - w * q;
  return r === 0 ? String(w) : w ? `${w} ${r}/${q}` : `${r}/${q}`;
};
const M = (w: number, a: number, b: number) => (w ? `${w} ${a}/${b}` : `${a}/${b}`);
/** Read "w n/d", "n/d" or "w" as [whole, n, d]. */
const readMixed = (v: Value): [number, number, number] | null => {
  if (typeof v === "number") return Number.isInteger(v) && v >= 0 ? [v, 0, 1] : null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  let m = t.match(/^(\d+)$/);
  if (m) return [Number(m[1]), 0, 1];
  m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = t.match(/^(\d+)\/(\d+)$/);
  return m ? [0, Number(m[1]), Number(m[2])] : null;
};
/** No common factor other than 1, by trying every divisor (not Euclid). */
const coprime = (x: number, y: number) => {
  for (let k = 2; k <= Math.min(x, y); k++) if (x % k === 0 && y % k === 0) return false;
  return true;
};
/** The smallest common multiple, by stepping through the multiples of b. */
const commonDen = (b: number, d: number) => {
  let L = b;
  while (L % d) L += b;
  return L;
};
const tupleOf = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^\((.*)\)$/);
  if (!m) return null;
  const xs = m[1].split(",").map((x) => Number(x.trim().replace(/−/g, "-")));
  return xs.every((x) => Number.isFinite(x)) ? xs : null;
};

const D_FOLD: [number, number][] = [[1, 7], [2, 8], [2, 5]];
const K_FOLD = ([a, b]: number[]) => a < b;
const foldBase = ([a, b, k]: number[]) => [`${a * k}/${b * k}`, `${a}/${b * k}`, `${a * k}/${b}`, `${a + k}/${b + k}`];
const foldPerm = (p: number[]) => perm(p, 4, 21);

const D_LOW: [number, number][] = [[1, 11], [2, 12], [2, 9]];
const K_LOW = ([a, b]: number[]) => a < b && gcd(a, b) === 1;
const spf = (k: number) => {
  for (let s = 2; s <= k; s++) if (k % s === 0) return s;
  return k;
};

const D_LIKE: [number, number][] = [[1, 9], [1, 9], [2, 10], [3, 12]];
const K_LIKE = ([a, c, b, d]: number[]) => a < d && c < d && a !== c && a < b && b !== d;
const likeBase = ([a, c, b, d]: number[]) => [`${a}/${d} and ${c}/${d}`, `${a}/${b} and ${a}/${d}`, `${a}/${b} and ${2 * a}/${2 * b}`, `${c}/${b + 1} and ${a}/${b + 2}`];
const likePerm = (p: number[]) => perm(p, 4, 23);

const D_FAS: [number, number][] = [[0, 4], [1, 9], [2, 10], [0, 4], [1, 9], [2, 10], [0, 1]];
const fasVal = ([w1, a, b, w2, c, d, op]: number[]): [number, number] => {
  const n1 = (w1 * b + a) * d;
  const n2 = (w2 * d + c) * b;
  return [op ? n1 - n2 : n1 + n2, b * d];
};
const K_FAS = (p: number[]) => {
  const [w1, a, b, w2, c, d, op] = p;
  if (a >= b || c >= d || b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1) return false;
  if (op === 0) return w1 + w2 > 0 && w1 + w2 <= 6;
  return fasVal(p)[0] > 0 && (w1 > 0 || w2 === 0);
};

const D_FWQ: [number, number][] = [[1, 11], [2, 12], [2, 9], [0, 1]];
const K_FWQ = ([a, b]: number[]) => a < b && gcd(a, b) === 1;

const D_AREA: [number, number][] = [[1, 7], [2, 8], [1, 7], [2, 8], [0, 1]];
const K_AREA = ([a, b, c, d]: number[]) => a < b && c < d && gcd(a, b) === 1 && gcd(c, d) === 1;
const areaCount = ([a, b, c, d]: number[]) => {
  let both = 0;
  let any = 0;
  for (let i = 0; i < b; i++)
    for (let j = 0; j < d; j++) {
      if (i < a && j < c) both++;
      if (i < a || j < c) any++;
    }
  return { both, any };
};

const SQ_GROUPS = ["the students of Class 7", "the children in our apartment block", "the players in the school kabaddi team"];
const SQ_TOPICS: { g: string; one: string; s: string }[] = [
  { g: "How many hours do {G} sleep on a school night?", one: "How many hours did {N} sleep last night?", s: "{N} slept for 8 hours last night." },
  { g: "How long does each of {G} take to reach school?", one: "How long did it take {N} to reach school today?", s: "{N} took 20 minutes to reach school today." },
  { g: "How tall is each of {G}?", one: "How tall is {N}?", s: "{N} is 142 cm tall." },
  { g: "How much pocket money do {G} get in a week?", one: "How much pocket money did {N} get this week?", s: "{N} got ₹50 as pocket money this week." },
  { g: "How many people live in the home of each of {G}?", one: "How many people live in {N}'s home?", s: "Five people live in {N}'s home." },
  { g: "Which fruit do {G} like best?", one: "Which fruit does {N} like best?", s: "{N}'s favourite fruit is the mango." },
  { g: "How many books did {G} read during the summer holidays?", one: "How many books did {N} read during the summer holidays?", s: "{N} read 6 books during the summer holidays." },
  { g: "What shoe sizes do {G} wear?", one: "What is {N}'s shoe size?", s: "{N} wears size 5 shoes." },
  { g: "How many minutes of television do {G} watch on a Sunday?", one: "How many minutes of television did {N} watch last Sunday?", s: "{N} watched 90 minutes of television last Sunday." },
  { g: "How many marks did {G} score in the last mathematics test?", one: "How many marks did {N} score in the last mathematics test?", s: "{N} scored 42 out of 50 in the last mathematics test." },
  { g: "In which month were {G} born?", one: "In which month was {N} born?", s: "{N} was born in March." },
  { g: "How many glasses of water do {G} drink in a day?", one: "How many glasses of water did {N} drink today?", s: "{N} drank 7 glasses of water today." },
];
const SQ_CHOICES = ["A statistical question", "A question that is not statistical", "A statement, not a question"];
const D_SQ: [number, number][] = [[0, SQ_TOPICS.length - 1], [0, 2], [0, 2]];
const sqText = ([t, kind, w]: number[]) => {
  const T = SQ_TOPICS[t];
  return (kind === 0 ? T.g : kind === 1 ? T.one : T.s).replace("{G}", SQ_GROUPS[w]).replace("{N}", nameOf(t + 3 * w));
};
const sqPerm = (p: number[]) => perm(p, 3, 31);

const BASES = ["2", "3", "5", "7", "10", "a", "b", "m"];
const D_EXPN: [number, number][] = [[0, 7], [0, 7], [1, 5], [1, 5], [0, 1]];
const K_EXPN = ([i, j, m, n, o]: number[]) => i < j && m + n >= 3 && (o === 0 || m >= 2);
const expnFactors = ([i, j, m, n, o]: number[]) => {
  const [x, y] = [BASES[i], BASES[j]];
  if (o === 0) return [...Array(m).fill(x), ...Array(n).fill(y)];
  const out: string[] = [];
  let [u, v] = [m, n];
  while (u || v) {
    if (u) out.push(x), u--;
    if (v) out.push(y), v--;
  }
  return out;
};

const D_PPF: [number, number][] = [[0, 12], [0, 7], [0, 5], [0, 4]];
const ppfN = (e: number[]) => 2 ** e[0] * 3 ** e[1] * 5 ** e[2] * 7 ** e[3];
const K_PPF = (e: number[]) => ppfN(e) <= 5000 && e.filter((x) => x > 0).length >= 2 && Math.max(...e) >= 2;

const D_ZERO: [number, number][] = [[2, 12], [2, 5], [2, 9], [0, 4]];
const K_ZERO = ([a, m, k, f]: number[]) => (f === 0 ? k === 2 : f === 3 ? k === 2 && a ** m <= 100000 : m === 2);
const zeroExpr = ([a, m, k, f]: number[]) =>
  f === 0 ? `${a}${sup(m)} ÷ ${a}${sup(m)}` : f === 1 ? `${k} × ${a}⁰` : f === 2 ? `${a}⁰ + ${k}⁰` : f === 3 ? `${a}${sup(m)} × ${a}⁰` : `(${k} × ${a})⁰`;
const zeroVal = ([a, m, k, f]: number[]) => (f === 0 ? 1 : f === 1 ? k : f === 2 ? 2 : f === 3 ? a ** m : 1);

const D_FEXP: [number, number][] = [[2, 10], [1, 9], [2, 9], [0, 2]];
const K_FEXP = ([r, p, q, f]: number[]) => (f === 1 ? r === 2 && gcd(p, q) === 1 && p !== q : q <= 5 && p <= 4 && gcd(p, q) === 1 && r ** q <= 100000 && r ** p <= (f === 2 ? 1000 : 10000));
const rootSym = (q: number) => (q === 2 ? "√" : q === 3 ? "∛" : q === 4 ? "∜" : `${sup(q)}√`);

const D_REM: [number, number][] = [[3, 12], [0, 11], [1, 20], [0, 3]];
const K_REM = ([d, x, y, f]: number[]) => (f <= 1 ? x >= 1 && x <= y && y <= d - 1 : x >= 1 && x <= d - 1 && y >= 2);
const remAns = ([d, x, y, f]: number[]) => {
  if (f === 0) return (x + y) % d;
  if (f === 1) return (x * y) % d;
  const N = 10 * y;
  if (f === 2) {
    let n = N - (N % d) + x;
    if (n <= N) n += d;
    return n;
  }
  return Math.floor((N - x) / d) + 1;
};

const P2: Def[] = [
  {
    id: "avfold",
    arity: 3,
    title: "Equal fractions from folding paper",
    competency: EQF,
    type: "choice",
    // [a, b, k]: a of b strips coloured; each strip folded into k parts
    parse: none,
    reject: gate(D_FOLD, K_FOLD, "A sheet folded into 2 to 8 strips, then each strip into 2 to 5 parts."),
    choices: (p) => foldPerm(p).map((i) => foldBase(p)[i]),
    prompt: ([a, b, k]) => `A sheet of paper is folded into ${b} equal strips and ${a} of the strips ${a === 1 ? "is" : "are"} coloured, so ${a}/${b} of the sheet is coloured. It is then folded the other way so that every strip is cut into ${k} equal parts. The picture shows the sheet after both folds. Which fraction of the sheet is coloured now?`,
    figure: ([a, b, k]) => ({ type: "grid", rows: b, cols: k, shaded: a * k }),
    solve: (p) => {
      const [a, b, k] = p;
      return { steps: [st("parts", "multiply", MT, [b, k], b * k), st("coloured", "multiply", MT, [a, k], a * k), st("equal", "evaluate", EQF, [a, b, a * k, b * k], `${a * k}/${b * k}`)], answer: foldPerm(p).indexOf(0) };
    },
    // independent: count the small parts of the picture, and the coloured ones
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [a, b, k] = p;
      const m = foldBase(p)[foldPerm(p)[v]]?.match(/^(\d+)\/(\d+)$/);
      if (!m) return false;
      let all = 0;
      let col = 0;
      for (let r = 0; r < b; r++)
        for (let c = 0; c < k; c++) {
          all++;
          if (r < a) col++;
        }
      return Number(m[1]) === col && Number(m[2]) === all;
    },
    bugs: (p) => {
      const [, , k] = p;
      const pr = foldPerm(p);
      return [
        { id: "strips-over-parts", kind: "conceptual", competency: EQF, says: "The coloured strips were counted, but the whole sheet was counted in small parts: the top and the bottom must count the same size of part.", predict: pr.indexOf(1) },
        { id: "top-only", kind: "conceptual", competency: EQF, says: "Only the coloured parts were multiplied; folding again cuts the whole sheet into more parts too, so the bottom number grows as well.", predict: pr.indexOf(2) },
        { id: "added-folds", kind: "conceptual", competency: EQF, says: `${k} was added to the top and the bottom; cutting every strip into ${k} parts multiplies the number of parts by ${k}.`, predict: pr.indexOf(3) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "parts" ? `${s.inputs[0]} strips × ${s.inputs[1]} parts = ${s.value} small parts in all` : s.id === "coloured" ? `${s.inputs[0]} coloured strips × ${s.inputs[1]} = ${s.value} coloured small parts` : `${s.inputs[0]}/${s.inputs[1]} = ${s.value}: the same amount is coloured`),
    domain: D_FOLD,
    keep: K_FOLD,
    difficulty: ([, b, k]) => (b * k <= 12 ? 1 : b * k <= 24 ? 2 : 3),
    word: ([a, b, k]) => `${nameOf(a + b + k)} cuts a cake into ${b} equal slices and keeps ${a} of them for the family. Then every slice is cut into ${k} equal pieces, as in the picture. Which fraction of the cake is kept?`,
    teach: {
      idea: "Folding again cuts every part into the same number of smaller parts: the coloured amount does not change, so a/b = (a × k)/(b × k).",
      method: "Count all the small parts (the new bottom number) and the coloured small parts (the new top number).",
      visual: ([a, b, k]) => ({ type: "grid", rows: b, cols: k, shaded: a * k }),
      alternatives: [
        { id: "strips", title: "Two strips side by side", kind: "conceptual", text: ["Draw one strip in thirds with one third coloured, and an equal strip in sixths.", "The coloured length is the same: it covers 2 of the sixths, so 1/3 = 2/6."] },
      ],
    },
    limits: "Sheets of 2 to 8 strips each folded into 2 to 5 parts; folding into unequal parts is left to a hands-on activity.",
  },
  {
    id: "avlow",
    arity: 3,
    title: "Reducing a fraction to its lowest terms",
    competency: EQF,
    type: "mixed",
    mc: true,
    // [a, b, k]: (a·k)/(b·k) with a/b in lowest terms
    parse: none,
    reject: gate(D_LOW, K_LOW, "Fractions (a × k)/(b × k) with a/b in lowest terms, b up to 12 and k from 2 to 9."),
    prompt: ([a, b, k]) => `Write ${a * k}/${b * k} in its lowest terms.`,
    solve: ([a, b, k]) => ({ steps: [st("hcf", "evaluate", "MATH.number.factors-multiples", [a * k, b * k], k), st("divide", "divide", EQF, [a * k, b * k, k], `${a}/${b}`)], answer: `${a}/${b}` }),
    // independent: no common factor is left (trying every divisor) and the cross-products are equal
    validate: ([a, b, k], v) => {
      const m = readMixed(v);
      if (!m || m[0] !== 0 || m[2] < 2 || m[1] < 1) return false;
      return coprime(m[1], m[2]) && m[1] * b * k === m[2] * a * k;
    },
    bugs: ([a, b, k]) => {
      const s = spf(k);
      return keepBugs([
        s < k && { id: "partly-reduced", kind: "procedural", competency: EQF, says: `Top and bottom were divided by ${s}, but they still share a factor: keep dividing until the only common factor is 1 (or divide by the highest common factor, ${k}, at once).`, predict: `${(a * k) / s}/${(b * k) / s}` },
        { id: "bottom-only", kind: "procedural", competency: EQF, says: "Only the bottom number was divided; to keep the fraction equal, the top and the bottom are divided by the same number.", predict: `${a * k}/${b}` },
        { id: "left-as-is", kind: "conceptual", competency: EQF, says: `The fraction was taken to be in lowest terms already, but ${a * k} and ${b * k} are both divisible by ${k}.`, predict: `${a * k}/${b * k}` },
      ]);
    },
    distractors: ([a, b, k]) => [`${a}/${b * k}`, `${a + 1}/${b + 1}`],
    variants: () => [],
    explain: (s) => (s.id === "hcf" ? `The highest common factor of ${s.inputs[0]} and ${s.inputs[1]} is ${s.value}` : `Divide the top and the bottom by ${s.inputs[2]}: ${s.value}`),
    domain: D_LOW,
    keep: K_LOW,
    difficulty: ([, b, k]) => (k <= 3 && b <= 6 ? 1 : [4, 6, 8, 9].includes(k) ? 3 : 2),
    // level@1: denominators beyond 50 (63/108) belong to Grade 5
    grade: ([, b, k]) => (b * k > 50 ? 5 : 4),
    word: ([a, b, k]) => `In a class of ${b * k} students, ${a * k} come to school by bus. What fraction of the class comes by bus? Give it in its lowest terms.`,
    teach: {
      idea: "Dividing the top and the bottom by the same number gives an equal fraction; in lowest terms they have no common factor except 1.",
      method: "Find the highest common factor of the top and the bottom and divide both by it (or keep dividing by common factors until none is left).",
      alternatives: [
        { id: "prime", title: "Cancel prime factors", kind: "procedural", text: ["Write the top and the bottom as products of primes: 18/24 = (2 × 3 × 3)/(2 × 2 × 2 × 3).", "Cancel the primes they share: what is left is 3/4."] },
      ],
    },
    limits: "Proper fractions with a lowest-terms denominator up to 12, multiplied by 2 to 9.",
  },
  {
    id: "avlike",
    arity: 4,
    title: "Telling like fractions from unlike fractions",
    competency: EQF,
    type: "choice",
    // [a, c, b, d]: the like pair a/d, c/d among three unlike pairs
    parse: none,
    reject: gate(D_LIKE, K_LIKE, "Proper fractions with denominators up to 12."),
    choices: (p) => likePerm(p).map((i) => likeBase(p)[i]),
    prompt: () => `Which pair are like fractions?`,
    solve: (p) => ({ steps: [st("bottoms", "compare", EQF, [p[3], p[3]], likeBase(p)[0])], answer: likePerm(p).indexOf(0) }),
    // independent: read the chosen pair and compare its two denominators
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const m = likeBase(p)[likePerm(p)[v]]?.match(/^(\d+)\/(\d+) and (\d+)\/(\d+)$/);
      if (!m || m[2] !== m[4]) return false;
      return likeBase(p).filter((o) => { const q = o.match(/^(\d+)\/(\d+) and (\d+)\/(\d+)$/)!; return q[2] === q[4]; }).length === 1;
    },
    bugs: (p) => [
      { id: "same-top", kind: "conceptual", competency: EQF, says: "Fractions with the same numerator were taken as like fractions; like fractions have the same denominator (the same size of part).", predict: likePerm(p).indexOf(1) },
      { id: "equal-means-like", kind: "conceptual", competency: EQF, says: "Equal (equivalent) fractions were taken as like fractions; they show the same amount, but their denominators differ, so they are unlike.", predict: likePerm(p).indexOf(2) },
    ],
    variants: () => [],
    explain: (s) => `${s.value}: the denominators are both ${s.inputs[0]}, so the parts are the same size`,
    domain: D_LIKE,
    keep: K_LIKE,
    cap: 300,
    difficulty: ([, , b, d]) => (d <= 6 ? 1 : b <= 6 ? 2 : 3),
    word: ([a, b]) => `In a cookery class, ${nameOf(a + b)} measures ingredients in parts of a cup. Which pair of amounts are like fractions, so that they can be added just by adding the numerators?`,
    teach: {
      idea: "Like fractions count the same size of part: their denominators are equal. Unlike fractions have different denominators.",
      method: "Look only at the denominators (the bottom numbers): if they are the same, the fractions are like fractions.",
      alternatives: [
        { id: "pieces", title: "Same-sized pieces", kind: "conceptual", text: ["2/7 and 5/7 are both counted in sevenths: same-sized pieces.", "2/7 and 2/9 have the same number of pieces but different sizes, so they are unlike."] },
      ],
    },
    limits: "Proper fractions with denominators up to 12; ordering like fractions is another family.",
  },
  {
    id: "avfas",
    arity: 7,
    title: "Adding and subtracting unlike and mixed fractions",
    competency: FA,
    type: "mixed",
    mc: true,
    // [w1, a, b, w2, c, d, op]: (w1 a/b) ± (w2 c/d); op 0 add (at least one mixed), op 1 subtract
    parse: none,
    reject: gate(D_FAS, K_FAS, "Unlike fractions or mixed numbers (whole parts up to 4, denominators up to 10)."),
    prompt: ([w1, a, b, w2, c, d, op]) => `${M(w1, a, b)} ${op ? "−" : "+"} ${M(w2, c, d)} = ? Write the answer in its simplest form, as a mixed number if it is more than 1.`,
    solve: (p) => {
      const [w1, a, b, w2, c, d, op] = p;
      const L = (b * d) / gcd(b, d);
      const n1 = (w1 * b + a) * (L / b);
      const n2 = (w2 * d + c) * (L / d);
      const n = op ? n1 - n2 : n1 + n2;
      return { steps: [st("common", "multiply", EQF, [b, d], L), st("rename", "multiply", EQF, [n1, n2, L], [n1, n2]), st("combine", op ? "subtract" : "add", FA, [n1, n2, L, op], n / L), st("simplify", "simplify", EQF, [n, L], mixedStr(n, L))], answer: mixedStr(n, L) };
    },
    // independent: count pieces of a common size found by stepping through multiples, then check the form
    validate: ([w1, a, b, w2, c, d, op], v) => {
      const m = readMixed(v);
      if (!m) return false;
      const [W, x, y] = m;
      if (x && (x >= y || !coprime(x, y))) return false;
      const D = commonDen(b, d);
      let pieces = 0;
      for (let i = 0; i < w1 * b + a; i++) pieces += D / b;
      let other = 0;
      for (let i = 0; i < w2 * d + c; i++) other += D / d;
      const tot = op ? pieces - other : pieces + other;
      return (W * y + x) * D === tot * y;
    },
    bugs: (p) => {
      const [w1, a, b, w2, c, d, op] = p;
      const [n, D] = fasVal(p);
      const [pn, pd] = lowest(n, D);
      const W = op ? w1 - w2 : w1 + w2;
      const L = (b * d) / gcd(b, d);
      const nL = (n * L) / D;
      const wL = Math.floor(nL / L);
      const rL = nL - wL * L;
      const tb = op ? (a >= c && b > d ? [a - c, b - d] : null) : [a + c, b + d];
      const fracOnly = op ? a * d - c * b : a * d + c * b;
      return keepBugs([
        tb && W >= 0 && { id: "add-tops-and-bottoms", kind: "conceptual", competency: FA, says: `The whole numbers were ${op ? "subtracted" : "added"}, and the tops and the bottoms were ${op ? "subtracted" : "added"} separately; unlike fractions must first be written with the same denominator.`, predict: tb[0] === 0 ? String(W) : W ? `${W} ${tb[0]}/${tb[1]}` : `${tb[0]}/${tb[1]}` },
        pn > pd && pn % pd !== 0 && { id: "improper-left", kind: "procedural", competency: EQF, says: "The answer was left as an improper fraction; the question asks for a mixed number when the answer is more than 1.", predict: `${pn}/${pd}` },
        rL !== 0 && gcd(rL, L) > 1 && { id: "not-simplified", kind: "procedural", competency: EQF, says: `The fraction part was not reduced: ${rL} and ${L} still have a common factor.`, predict: wL ? `${wL} ${rL}/${L}` : `${rL}/${L}` },
        op === 1 && a * d < c * b && W >= 1 && { id: "smaller-from-larger", kind: "procedural", competency: FA, says: `${a}/${b} is smaller than ${c}/${d}, so the fractions were subtracted the other way round; regroup 1 whole from the whole number into the fraction part first.`, predict: mixedStr(W * b * d + (c * b - a * d), b * d) },
        w1 + w2 > 0 && fracOnly > 0 && { id: "wholes-dropped", kind: "procedural", competency: FA, says: "Only the fraction parts were worked out; the whole numbers must be included too.", predict: mixedStr(fracOnly, b * d) },
      ]);
    },
    distractors: (p) => {
      const [n, D] = fasVal(p);
      return [mixedStr(n + D, D), n > D ? mixedStr(n - D, D) : mixedStr(n * 2, D)];
    },
    variants: () => [],
    explain: (s) =>
      s.id === "common"
        ? `A common denominator of ${s.inputs[0]} and ${s.inputs[1]}: ${s.value}`
        : s.id === "rename"
          ? `As improper fractions over ${s.inputs[2]}: ${s.inputs[0]}/${s.inputs[2]} and ${s.inputs[1]}/${s.inputs[2]}`
          : s.id === "combine"
            ? `${s.inputs[0]} ${s.inputs[3] ? "−" : "+"} ${s.inputs[1]} = ${s.inputs[3] ? Number(s.inputs[0]) - Number(s.inputs[1]) : Number(s.inputs[0]) + Number(s.inputs[1])} pieces of size 1/${s.inputs[2]}`
            : `In simplest form: ${s.value}`,
    domain: D_FAS,
    keep: K_FAS,
    cap: 420,
    difficulty: ([w1, , b, w2, , d, op]) => (w1 + w2 === 0 ? 1 : op === 1 || gcd(b, d) === 1 ? 3 : 2),
    word: ([w1, a, b, w2, c, d, op]) =>
      op === 0
        ? `${nameOf(a + c + b)} buys ${M(w1, a, b)} kg of tomatoes and ${M(w2, c, d)} kg of onions. How many kilograms of vegetables is that altogether? Write the answer in its simplest form, as a mixed number if it is more than 1.`
        : `A ribbon is ${M(w1, a, b)} m long. ${nameOf(a + c + d)} cuts off ${M(w2, c, d)} m to tie a gift. How many metres of ribbon are left? Write the answer in its simplest form, as a mixed number if it is more than 1.`,
    teach: {
      idea: "Fractions can be added or subtracted only when they count the same size of piece; mixed numbers can be written as improper fractions first.",
      method: "Change mixed numbers to improper fractions, write both with a common denominator, add or subtract the tops, then simplify and change back to a mixed number.",
      alternatives: [
        { id: "wholes", title: "Wholes and parts separately", kind: "procedural", text: ["Add (or subtract) the whole numbers, then the fraction parts with a common denominator.", "If the fraction part being taken away is bigger, regroup 1 whole as a fraction first; if the fraction parts add to more than 1, carry 1 whole."] },
      ],
    },
    limits: "Two fractions or mixed numbers with different denominators up to 10 and whole parts up to 4; like denominators are the family fadd.",
  },
  {
    id: "avfwq",
    arity: 4,
    title: "Fraction word problems with whole numbers",
    competency: FM,
    type: "fraction",
    mc: true,
    // [a, b, k, s]: s 0: k glasses of a/b litre each (k × a/b); s 1: a/b of b·k students
    parse: none,
    reject: gate(D_FWQ, K_FWQ, "A proper fraction in lowest terms (denominator up to 12) times 2 to 9, or a fraction of a multiple of its denominator."),
    prompt: ([a, b, k, s]) =>
      s === 0
        ? `Each glass holds ${a}/${b} litre of buttermilk. How many litres do ${k} such glasses hold? (A fraction or mixed number is fine.)`
        : `There are ${b * k} students in a class and ${a}/${b} of them come to school by bus. How many students come by bus?`,
    solve: ([a, b, k, s]) =>
      s === 0
        ? { steps: [st("tops", "multiply", MT, [k, a], k * a), st("keep", "evaluate", FM, [k * a, b], (k * a) / b)], answer: (k * a) / b }
        : { steps: [st("one-part", "divide", FM, [b * k, b], k), st("parts", "multiply", MT, [k, a], a * k)], answer: a * k },
    // independent: s 0 by adding a/b again and again; s 1 by checking b × answer = a × (number of students), by repeated addition
    validate: ([a, b, k, s], v) => {
      if (typeof v !== "number") return false;
      if (s === 0) return near([...Array(k)].reduce((t) => t + a / b, 0), v);
      return Number.isInteger(v) && times(v, b) === times(b * k, a);
    },
    bugs: ([a, b, k, s]) =>
      s === 0
        ? keepBugs([
            { id: "multiply-both", kind: "conceptual", competency: FM, says: `Top and bottom were both multiplied by ${k}: that gives an equal fraction, not ${k} lots of it.`, predict: a / b },
            { id: "multiply-bottom", kind: "procedural", competency: FM, says: `The bottom was multiplied; ${k} glasses of ${a}/${b} litre is ${k} × ${a} pieces of the same size.`, predict: a / (b * k) },
            { id: "add-whole", kind: "conceptual", competency: FM, says: `${k} was added to the top; ${k} glasses means ${k} lots.`, predict: (a + k) / b },
          ])
        : keepBugs([
            { id: "one-part-only", kind: "procedural", competency: FM, says: `Only 1/${b} of the class was found (${b * k} ÷ ${b}); ${a}/${b} is ${a} of those parts.`, predict: a > 1 ? k : null },
            { id: "no-divide", kind: "procedural", competency: FM, says: `The number of students was multiplied by ${a} but not divided by ${b}.`, predict: a * b * k },
            { id: "upside-down", kind: "conceptual", competency: FM, says: `The class was divided by ${a} and multiplied by ${b}; ${a}/${b} of a number means divide by ${b}, then multiply by ${a}.`, predict: (b * b * k) % a === 0 && a > 1 ? (b * b * k) / a : null },
          ]),
    variants: () => [],
    explain: (s) => (s.id === "tops" ? `${s.inputs[0]} lots of ${s.inputs[1]} pieces: ${s.value} pieces` : s.id === "keep" ? `${s.inputs[0]} pieces of size 1/${s.inputs[1]}: ${show(s.value)}` : s.id === "one-part" ? `1/${s.inputs[1]} of ${s.inputs[0]} is ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `${s.inputs[1]} of those parts: ${s.inputs[1]} × ${s.inputs[0]} = ${s.value}`),
    domain: D_FWQ,
    keep: K_FWQ,
    cap: 400,
    difficulty: ([a, b, k]) => (k * a < b ? 1 : k * a <= 2 * b ? 2 : 3),
    word: ([a, b, k, s]) =>
      s === 0
        ? `A recipe needs ${a}/${b} cup of rice for each person. How many cups of rice are needed for ${k} people? (A fraction or mixed number is fine.)`
        : `${nameOf(a + b + k)} has ₹${b * k} and spends ${a}/${b} of it on books. How many rupees does ${nameOf(a + b + k)} spend on books?`,
    teach: {
      idea: "k lots of a/b is k × a pieces of size 1/b; a/b of a number is a of its b equal parts.",
      method: "For k × a/b, multiply the top by k. For a/b of N, divide N by b, then multiply by a.",
      alternatives: [
        { id: "bar", title: "A bar model", kind: "conceptual", text: ["Draw the whole amount as a bar cut into b equal parts.", "Each part is the whole ÷ b; shade a parts and add them up."], visual: ([a, b]) => ({ type: "grid", rows: 1, cols: b, shaded: a }) },
      ],
    },
    limits: "Proper fractions with denominators up to 12, times 2 to 9; dividing by a fraction is the family aifdiv.",
  },
  {
    id: "avarea",
    arity: 5,
    title: "A fraction product in an area model",
    competency: FP,
    type: "fraction",
    mc: true,
    // [a, b, c, d, ask]: a of b columns and c of d rows shaded; ask 0: rectangles shaded twice; ask 1: the fraction they make
    parse: none,
    reject: gate(D_AREA, K_AREA, "Rectangles of 2 to 8 columns and 2 to 8 rows, both fractions in lowest terms."),
    range: (p) => (p[4] === 1 ? [0, 1] : null),
    // the rectangle cut into columns and rows, with the yellow rows shaded (the blue columns are described in words)
    figure: ([, b, c, d]) => ({ type: "grid", rows: d, cols: b, shaded: c * b }),
    prompt: ([a, b, c, d, ask]) =>
      `A rectangle is cut into ${b} equal columns and ${d} equal rows, making ${b * d} small rectangles, as in the picture. ${a} of the columns ${a === 1 ? "is" : "are"} shaded blue and ${c} of the rows ${c === 1 ? "is" : "are"} shaded yellow (the picture shows the yellow ${c === 1 ? "row" : "rows"}), so the part shaded in both colours shows ${a}/${b} × ${c}/${d}. ` +
      (ask === 0 ? `How many small rectangles are shaded in both colours?` : `What fraction of the whole rectangle is shaded in both colours? (A fraction is fine.)`),
    solve: ([a, b, c, d, ask]) => {
      const steps = [st("both", "multiply", MT, [a, c], a * c), st("all", "multiply", MT, [b, d], b * d)];
      return ask === 0 ? { steps: steps.slice(0, 1), answer: a * c } : { steps: [...steps, st("fraction", "divide", FP, [a * c, b * d], (a * c) / (b * d))], answer: (a * c) / (b * d) };
    },
    // independent: walk over every small rectangle and count the doubly shaded ones
    validate: (p, v) => {
      const { both } = areaCount(p);
      return typeof v === "number" && near(p[4] === 0 ? both : both / (p[1] * p[3]), v);
    },
    bugs: (p) => {
      const [a, b, c, d, ask] = p;
      const { any } = areaCount(p);
      return ask === 0
        ? keepBugs([
            { id: "counted-all-shaded", kind: "conceptual", competency: FP, says: "Every shaded rectangle was counted; the product is only the part shaded in both colours (the overlap).", predict: any },
            { id: "added-rows-columns", kind: "conceptual", competency: FP, says: `The shaded columns and rows were added (${a} + ${c}); the overlap has ${pl(a, "column")} of ${pl(c, "rectangle")}.`, predict: a + c },
            { id: "one-colour", kind: "procedural", competency: FP, says: "Only the blue rectangles were counted; the product is where blue and yellow overlap.", predict: a * d },
          ])
        : keepBugs([
            { id: "counted-all-shaded", kind: "conceptual", competency: FP, says: "Every shaded rectangle was counted; the product is only the part shaded in both colours (the overlap).", predict: any / (b * d) },
            { id: "one-colour", kind: "procedural", competency: FP, says: `Only the blue part (${a}/${b}) was given; the product is the overlap of the two colours.`, predict: a / b },
            { id: "added-fractions", kind: "conceptual", competency: FP, says: "Tops and bottoms were added; in the area model the product is the overlap: (top × top) out of (bottom × bottom) small rectangles.", predict: (a + c) / (b + d) },
          ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "both" ? `${s.inputs[0]} blue columns × ${s.inputs[1]} yellow rows: ${s.value} rectangles shaded twice` : s.id === "all" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value} small rectangles in all` : `${s.inputs[0]} out of ${s.inputs[1]}: ${show(s.value)}`),
    domain: D_AREA,
    keep: K_AREA,
    cap: 360,
    difficulty: ([, b, , d]) => lv(b * d, 12, 30),
    word: ([a, b, c, d, ask]) =>
      `A school garden is laid out in ${b} equal columns and ${d} equal rows of beds. Tomatoes grow in ${a} of the columns, and ${c} of the rows ${c === 1 ? "has" : "have"} drip pipes (the picture shows the ${c === 1 ? "row" : "rows"} with drip pipes). ` +
      (ask === 0 ? `How many beds have both tomatoes and drip pipes?` : `What fraction of the garden has both tomatoes and drip pipes? (A fraction is fine.)`),
    teach: {
      idea: "a/b × c/d is the part of a whole that is both a/b one way and c/d the other way: an overlap of a × c small rectangles out of b × d.",
      method: "Cut the rectangle into b columns and d rows, shade a columns and c rows, and count the overlap over the total: (a × c)/(b × d).",
      visual: ([, b, c, d]) => ({ type: "grid", rows: d, cols: b, shaded: c * b }),
      alternatives: [
        { id: "of", title: "A fraction of a fraction", kind: "conceptual", text: ["2/3 × 3/4 means 2/3 of 3/4.", "Take 3/4 of the rectangle, then shade 2/3 of that piece: the overlap is the product."] },
      ],
    },
    limits: "Proper fractions with denominators up to 8; mixed numbers in an area model are left out.",
  },
  {
    id: "avstatq",
    arity: 3,
    title: "Statistical questions, other questions and statements",
    competency: SQ,
    type: "choice",
    // [t, kind, w]: topic t; kind 0 a statistical question about a group, 1 a question about one person, 2 a statement; w the group or person
    parse: none,
    reject: gate(D_SQ, () => true, "One of the twelve survey topics, as a question about a group, a question about one person, or a statement."),
    choices: (p) => sqPerm(p).map((i) => SQ_CHOICES[i]),
    prompt: (p) => `What kind of item is this: “${sqText(p)}”`,
    solve: (p) => ({ steps: [st("classify", "classify", SQ, [sqText(p)], SQ_CHOICES[p[1]])], answer: sqPerm(p).indexOf(p[1]) }),
    // independent: read the text: a question ends with "?", and a statistical one asks about a whole group
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const t = sqText(p);
      const want = !t.endsWith("?") ? 2 : SQ_GROUPS.some((g) => t.includes(g)) ? 0 : 1;
      return sqPerm(p)[v] === want;
    },
    bugs: (p) => {
      const pr = sqPerm(p);
      const kind = p[1];
      return kind === 0
        ? [{ id: "one-answer", kind: "conceptual", competency: SQ, says: "The question was taken to have one answer; it asks about many people whose answers vary, so answering it needs data: it is statistical.", predict: pr.indexOf(1) }]
        : kind === 1
          ? [{ id: "any-number-question", kind: "conceptual", competency: SQ, says: "A question with one answer was taken as statistical; it asks about one person, so no data that vary are needed.", predict: pr.indexOf(0) }]
          : [
              { id: "data-is-statistical", kind: "conceptual", competency: SQ, says: "A sentence that gives a piece of data was taken as a statistical question; it tells a fact and asks nothing.", predict: pr.indexOf(0) },
              { id: "statement-as-question", kind: "procedural", competency: SQ, says: "The sentence was read as a question; it ends with a full stop and tells something.", predict: pr.indexOf(1) },
            ];
    },
    variants: () => [],
    explain: (s) => `“${s.inputs[0]}” is ${String(s.value).toLowerCase()}`,
    domain: D_SQ,
    difficulty: ([, kind]) => (kind === 2 ? 1 : kind === 0 ? 2 : 3),
    word: (p) => `For a Class 7 survey project, ${nameOf(p[0] + p[2] + 5)} wrote this on a card: “${sqText(p)}” What kind of item is it?`,
    teach: {
      idea: "A statistical question expects answers that vary, so it is answered by collecting data from many people or times; a question with one fixed answer is not statistical, and a statement asks nothing.",
      method: "Ask: is it a question? If so, would different people (or days) give different answers? If yes, it is statistical.",
      alternatives: [
        { id: "survey", title: "Imagine the survey", kind: "conceptual", text: ["Picture going round with a clipboard to answer it.", "If you would need to ask many people and write down many answers, it is a statistical question; if one look gives the answer, it is not."] },
      ],
    },
    limits: "Twelve everyday survey topics about people; questions about measurements over time (rainfall each day) are left out.",
  },
  {
    id: "avexpn",
    arity: 5,
    title: "Writing a repeated product in exponential form",
    competency: EXP,
    type: "tuple",
    mc: true,
    // [i, j, m, n, o]: m factors of BASES[i] and n of BASES[j]; o 0 grouped, 1 mixed in order
    parse: none,
    reject: gate(D_EXPN, K_EXPN, "Two different bases, each appearing 1 to 5 times."),
    prompt: (p) => {
      const [i, j] = p;
      return `Write ${expnFactors(p).join(" × ")} in exponential form, as ${BASES[i]}^□ × ${BASES[j]}^□. Give the two powers as (power of ${BASES[i]}, power of ${BASES[j]}).`;
    },
    solve: ([i, j, m, n]) => ({ steps: [st("count", "count", EXP, [BASES[i], m, BASES[j], n], `(${m}, ${n})`)], answer: `(${m}, ${n})` }),
    // independent: count each base among the factors of the written product
    validate: (p, v) => {
      const xs = tupleOf(v);
      if (!xs || xs.length !== 2) return false;
      const f = expnFactors(p);
      return xs[0] === f.filter((x) => x === BASES[p[0]]).length && xs[1] === f.filter((x) => x === BASES[p[1]]).length;
    },
    bugs: ([i, j, m, n]) =>
      keepBugs([
        m !== n && { id: "powers-swapped", kind: "procedural", competency: EXP, says: `The two counts were given the wrong way round: ${BASES[i]} appears ${tm(m)} and ${BASES[j]} appears ${tm(n)}.`, predict: `(${n}, ${m})` },
        { id: "counted-signs", kind: "procedural", competency: EXP, says: "The multiplication signs were counted instead of the factors; the power is how many times the base is a factor.", predict: `(${m - 1}, ${n - 1})` },
        { id: "total-count", kind: "conceptual", competency: EXP, says: "All the factors were counted together; each base gets its own power.", predict: `(${m + n}, ${m + n})` },
      ]),
    distractors: ([, , m, n]) => [`(${m + 1}, ${n})`, `(${m}, ${n + 1})`],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} appears ${tm(Number(s.inputs[1]))} and ${s.inputs[2]} appears ${tm(Number(s.inputs[3]))}: ${s.inputs[0]}${sup(Number(s.inputs[1]))} × ${s.inputs[2]}${sup(Number(s.inputs[3]))}`,
    domain: D_EXPN,
    keep: K_EXPN,
    cap: 320,
    difficulty: ([, , m, n, o]) => (o === 0 && m + n <= 5 ? 1 : o === 0 ? 2 : 3),
    teach: {
      idea: "A power is a short way of writing a repeated product: aⁿ means n factors of a multiplied together.",
      method: "Group equal factors together, count how many there are of each, and write each count as the power of its base.",
      alternatives: [
        { id: "tally", title: "Tally the factors", kind: "procedural", text: ["Go along the product and put a tally mark under its base each time a factor appears.", "The tally for each base is its power: 2 × 5 × 2 × 2 = 2³ × 5¹."] },
      ],
    },
    limits: "Two bases each appearing 1 to 5 times; products with three bases are the prime-power family avppf.",
  },
  {
    id: "avppf",
    arity: 4,
    title: "Writing a number as a product of prime powers",
    competency: EXP,
    type: "tuple",
    mc: true,
    // [a, b, c, d]: n = 2ᵃ × 3ᵇ × 5ᶜ × 7ᵈ
    parse: none,
    reject: gate(D_PPF, K_PPF, "Numbers up to 5000 made of the primes 2, 3, 5 and 7 (at least two of them, one repeated)."),
    prompt: (e) => `Write ${ppfN(e)} as a product of powers of primes: ${ppfN(e)} = 2ᵃ × 3ᵇ × 5ᶜ × 7ᵈ. Give (a, b, c, d), writing 0 for a prime that does not divide ${ppfN(e)}.`,
    solve: (e) => {
      const steps: Step[] = [];
      let x = ppfN(e);
      [2, 3, 5, 7].forEach((pr, k) => {
        for (let i = 0; i < e[k]; i++) steps.push(st(`d${steps.length}`, "divide", "MATH.number.prime-factorisation", [x, pr], (x /= pr)));
      });
      steps.push(st("index", "count", EXP, e, `(${e.join(", ")})`));
      return { steps, answer: `(${e.join(", ")})` };
    },
    // independent: multiply the powers back by repeated multiplication
    validate: (e, v) => {
      const xs = tupleOf(v);
      if (!xs || xs.length !== 4 || xs.some((x) => !Number.isInteger(x) || x < 0)) return false;
      let prod = 1;
      [2, 3, 5, 7].forEach((pr, k) => {
        for (let i = 0; i < xs[k]; i++) prod *= pr;
      });
      return prod === ppfN(e);
    },
    bugs: (e) => {
      const big = e.indexOf(Math.max(...e));
      const less = e.map((x, k) => (k === big ? x - 1 : x));
      return keepBugs([
        { id: "each-prime-once", kind: "conceptual", competency: EXP, says: "Each prime was given the power 1; the power counts how many times that prime divides the number.", predict: `(${e.map((x) => (x ? 1 : 0)).join(", ")})` },
        { id: "one-division-missed", kind: "procedural", competency: "MATH.number.prime-factorisation", says: `One division by ${[2, 3, 5, 7][big]} was missed: keep dividing by a prime until it no longer divides.`, predict: `(${less.join(", ")})` },
      ]);
    },
    distractors: (e) => [`(${[e[1], e[0], e[2], e[3]].join(", ")})`, `(${e.map((x) => x + 1).join(", ")})`],
    variants: () => [],
    explain: (s) => (s.id === "index" ? `Count each prime: 2${sup(Number(s.inputs[0]))} × 3${sup(Number(s.inputs[1]))} × 5${sup(Number(s.inputs[2]))} × 7${sup(Number(s.inputs[3]))}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: D_PPF,
    keep: K_PPF,
    difficulty: (e) => lv(ppfN(e), 200, 1500),
    teach: {
      idea: "Every whole number greater than 1 is a product of primes in exactly one way; powers say how many times each prime appears.",
      method: "Divide by 2 as often as possible, then by 3, 5 and 7, counting the divisions: the counts are the powers.",
      alternatives: [
        { id: "tree", title: "A factor tree", kind: "procedural", text: ["Split the number into two factors and keep splitting until every branch ends in a prime.", "Count how many times each prime appears at the ends of the branches."] },
      ],
    },
    limits: "Numbers up to 5000 whose prime factors are 2, 3, 5 and 7; larger primes are left out.",
  },
  {
    id: "avzero",
    contract: { kind: "value", statement: ([a, m, k, f]) => (f === 0 ? `${a}^${m}/${a}^${m}` : f === 1 ? `${k}*${a}^0` : f === 2 ? `${a}^0+${k}^0` : f === 3 ? `${a}^${m}*${a}^0` : `(${k}*${a})^0`) },
    arity: 4,
    title: "The zero exponent",
    competency: EXP,
    type: "integer",
    mc: true,
    // [a, m, k, f]: f 0 aᵐ ÷ aᵐ; 1 k × a⁰; 2 a⁰ + k⁰; 3 aᵐ × a⁰; 4 (k × a)⁰
    parse: none,
    reject: gate(D_ZERO, K_ZERO, "Expressions with a zero power, bases 2 to 12."),
    prompt: (p) => `Find the value of ${zeroExpr(p)}.`,
    solve: (p) => {
      const [a, m, , f] = p;
      return { steps: [...(f === 0 ? [st("subtract-powers", "subtract", EXP, [a, m, m], `${a}⁰`)] : []), st("zero", "evaluate", EXP, [f === 4 ? `(${p[2]} × ${a})` : String(a), 0], 1), st("value", "evaluate", EXP, [zeroExpr(p)], zeroVal(p))], answer: zeroVal(p) };
    },
    // independent: evaluate the expression numerically
    validate: ([a, m, k, f], v) => v === (f === 0 ? a ** m / a ** m : f === 1 ? k * a ** 0 : f === 2 ? a ** 0 + k ** 0 : f === 3 ? a ** m * a ** 0 : (k * a) ** 0),
    bugs: ([a, m, k, f]) =>
      keepBugs([
        { id: "zero-power-zero", kind: "conceptual", competency: EXP, says: `A zero power was taken as 0; ${f === 0 ? `${a}${sup(m)} ÷ ${a}${sup(m)} is a number divided by itself, so it` : "any non-zero number to the power 0"} is 1.`, predict: f === 2 ? 0 : f === 0 ? 0 : 0 },
        { id: "zero-power-base", kind: "conceptual", competency: EXP, says: "A zero power was taken as the number itself; a⁰ = 1, because a⁰ = aᵐ ÷ aᵐ.", predict: f === 0 ? a : f === 1 ? k * a : f === 2 ? a + k : f === 3 ? a ** (m + 1) : k * a },
      ]),
    variants: () => [],
    explain: (s) => (s.id === "subtract-powers" ? `Same base, so subtract the powers: ${s.inputs[1]} − ${s.inputs[2]} = 0` : s.id === "zero" ? `${s.inputs[0]}⁰ = 1` : `So ${s.inputs[0]} = ${s.value}`),
    domain: D_ZERO,
    keep: K_ZERO,
    difficulty: ([, , , f]) => (f === 1 || f === 4 ? 1 : f === 2 ? 2 : 3),
    teach: {
      idea: "aᵐ ÷ aᵐ = aᵐ⁻ᵐ = a⁰, and a number divided by itself is 1, so a⁰ = 1 for any a ≠ 0.",
      method: "Replace every zero power by 1, then work out the rest.",
      alternatives: [
        { id: "pattern", title: "Follow the pattern", kind: "conceptual", text: ["2³ = 8, 2² = 4, 2¹ = 2: each step down divides by 2.", "One more step down: 2⁰ = 2 ÷ 2 = 1."] },
      ],
    },
    limits: "Whole-number bases 2 to 12; 0⁰ is left out (it is not defined at this grade).",
  },
  {
    id: "avfexp",
    arity: 4,
    title: "Fractional exponents and radicals",
    competency: RAD,
    type: "fraction",
    mc: true,
    // [r, p, q, f]: f 0 (r^q)^(p/q); f 2 (r^q)^(−p/q); f 1 the q-th root of x^p in index form (r unused, 2)
    parse: none,
    reject: gate(D_FEXP, K_FEXP, "Perfect powers to fractional powers, or a radical written in index form."),
    prompt: ([r, p, q, f]) =>
      f === 1
        ? `Write ${rootSym(q)}(x${p === 1 ? "" : sup(p)}) in index form as xᵏ. What is k? (A fraction is fine.)`
        : `Find the value of ${r ** q}^(${f === 2 ? "−" : ""}${p}/${q}).${f === 2 ? " (A fraction is fine.)" : ""}`,
    solve: ([r, p, q, f]) => {
      if (f === 1) return { steps: [st("index", "convert", RAD, [p, q], p / q)], answer: p / q };
      const steps = [st("root", "evaluate", RAD, [r ** q, q], r), st("power", "evaluate", EXP, [r, p], r ** p)];
      return f === 0 ? { steps, answer: r ** p } : { steps: [...steps, st("reciprocal", "divide", EXP, [1, r ** p], 1 / r ** p)], answer: 1 / r ** p };
    },
    // independent: numerical powers (and, for the index form, raising back to the q-th power at x = 3)
    validate: ([r, p, q, f], v) => {
      if (typeof v !== "number") return false;
      if (f === 1) return near(Math.pow(Math.pow(1.5, v), q), 1.5 ** p, 1e-9);
      return near(Math.pow(r ** q, (f === 2 ? -p : p) / q), v, 1e-9);
    },
    bugs: ([r, p, q, f]) => {
      const base = r ** q;
      if (f === 1)
        return keepBugs([
          { id: "upside-down", kind: "conceptual", competency: RAD, says: `The fraction was turned upside down; the power inside (${p}) is the numerator and the root (${q}) the denominator.`, predict: q / p },
          p > 1 && { id: "multiplied", kind: "conceptual", competency: RAD, says: `The power and the root were multiplied; a ${q === 2 ? "square" : q === 3 ? "cube" : `${q}th`} root divides the power by ${q}.`, predict: p * q },
          { id: "root-as-subtraction", kind: "procedural", competency: RAD, says: `The root was taken away from the power (${p} − ${q}); a ${q === 2 ? "square" : q === 3 ? "cube" : `${q}th`} root divides the power by ${q}.`, predict: p - q },
        ]);
      const pos = keepBugs([
        { id: "times-the-fraction", kind: "conceptual", competency: RAD, says: `${base} was multiplied by ${p}/${q}; a fractional power means a root and a power, not a multiplication.`, predict: (base * p) / q },
        { id: "root-as-division", kind: "conceptual", competency: RAD, says: `The ${q === 2 ? "square" : q === 3 ? "cube" : `${q}th`} root of ${base} was taken as ${base} ÷ ${q}; the root is the number that, multiplied by itself ${q} times, gives ${base}.`, predict: (base / q) ** p <= 1e6 ? (base / q) ** p : null },
        p > 1 && { id: "root-only", kind: "procedural", competency: RAD, says: `Only the ${q === 2 ? "square" : q === 3 ? "cube" : `${q}th`} root was taken; the numerator ${p} is a power still to be applied.`, predict: r },
        base ** p <= 1e7 && p > 1 && { id: "power-only", kind: "procedural", competency: RAD, says: `Only the power ${p} was applied; the denominator ${q} means a root too.`, predict: base ** p },
      ]);
      if (f === 0) return pos;
      return keepBugs([
        { id: "negative-value", kind: "conceptual", competency: EXP, says: "A negative power was taken to give a negative number; it gives the reciprocal: a⁻ⁿ = 1/aⁿ.", predict: -(r ** p) },
        { id: "sign-ignored", kind: "procedural", competency: EXP, says: "The minus sign in the power was left out; it turns the answer into its reciprocal.", predict: r ** p },
        p > 1 && { id: "root-only", kind: "procedural", competency: RAD, says: `Only the root was taken; the numerator ${p} is a power still to be applied.`, predict: 1 / r },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "index" ? `The power inside over the root: x^(${s.inputs[0]}/${s.inputs[1]})` : s.id === "root" ? `The ${s.inputs[1] === 2 ? "square" : s.inputs[1] === 3 ? "cube" : `${s.inputs[1]}th`} root of ${s.inputs[0]} is ${s.value}` : s.id === "power" ? `${s.inputs[0]}${sup(Number(s.inputs[1]))} = ${s.value}` : `The negative power gives the reciprocal: 1/${s.inputs[1]}`),
    domain: D_FEXP,
    keep: K_FEXP,
    cap: 300,
    difficulty: ([, p, q, f]) => (f === 1 ? (p === 1 ? 1 : 2) : f === 2 ? 3 : q === 2 ? 1 : 2),
    teach: {
      idea: "a^(p/q) is the q-th root of a, raised to the power p: (ᵠ√a)ᵖ = ᵠ√(aᵖ). A negative power gives the reciprocal.",
      method: "Take the root first (the denominator), then the power (the numerator); for a negative power, take the reciprocal at the end.",
      alternatives: [
        { id: "laws", title: "Use the law (aᵐ)ⁿ = aᵐⁿ", kind: "procedural", text: ["Write the base as a power: 27 = 3³.", "Then 27^(2/3) = (3³)^(2/3) = 3^(3 × 2/3) = 3² = 9."] },
      ],
    },
    limits: "Perfect powers up to 100 000 raised to p/q with q up to 5; radicals of single powers of x up to the 9th root.",
  },
  {
    id: "avrem",
    arity: 4,
    title: "Reasoning about remainders",
    competency: DIVB,
    type: "integer",
    mc: true,
    // [d, x, y, f]: f 0 remainder of a sum (remainders x, y); f 1 of a product; f 2 smallest number > 10y leaving remainder x; f 3 how many from 1 to 10y leave remainder x
    parse: none,
    reject: gate(D_REM, K_REM, "Remainders on division by 3 to 12."),
    prompt: ([d, x, y, f]) =>
      f === 0
        ? `A number leaves remainder ${x} when divided by ${d}, and another number leaves remainder ${y} when divided by ${d}. What remainder does their sum leave when divided by ${d}?`
        : f === 1
          ? `A number leaves remainder ${x} when divided by ${d}, and another number leaves remainder ${y} when divided by ${d}. What remainder does their product leave when divided by ${d}?`
          : f === 2
            ? `What is the smallest number greater than ${10 * y} that leaves remainder ${x} when divided by ${d}?`
            : `How many numbers from 1 to ${10 * y} leave remainder ${x} when divided by ${d}?`,
    solve: (p) => {
      const [d, x, y, f] = p;
      if (f === 0) return { steps: [st("add", "add", ADD, [x, y], x + y), st("reduce", "divide", DR, [x + y, d], remAns(p))], answer: remAns(p) };
      if (f === 1) return { steps: [st("mult", "multiply", MT, [x, y], x * y), st("reduce", "divide", DR, [x * y, d], remAns(p))], answer: remAns(p) };
      if (f === 2) return { steps: [st("multiple", "evaluate", DIVB, [10 * y, d], 10 * y - ((10 * y) % d)), st("next", "add", DIVB, [d, x], remAns(p))], answer: remAns(p) };
      return { steps: [st("first", "evaluate", DIVB, [x, d], x), st("count", "divide", DIVB, [10 * y - x, d], remAns(p))], answer: remAns(p) };
    },
    // independent: try actual numbers (several with the given remainders), or search and count one number at a time
    validate: ([d, x, y, f], v) => {
      if (typeof v !== "number") return false;
      const rem = (n: number) => {
        while (n >= d) n -= d;
        return n;
      };
      if (f <= 1) {
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) {
            const [A, B] = [d * (i + 2) + x, d * (j + 3) + y];
            if (rem(f === 0 ? A + B : A * B) !== v) return false;
          }
        return true;
      }
      const N = 10 * y;
      if (f === 2) {
        let n = N + 1;
        while (n % d !== x) n++;
        return v === n;
      }
      let c = 0;
      for (let n = 1; n <= N; n++) if (n % d === x) c++;
      return v === c;
    },
    bugs: (p) => {
      const [d, x, y, f] = p;
      const ans = remAns(p);
      const N = 10 * y;
      if (f === 0)
        return keepBugs([
          x + y >= d && { id: "not-reduced", kind: "procedural", competency: DR, says: `The remainders were added, but ${x + y} is not less than ${d}: divide it by ${d} again to get the remainder.`, predict: x + y },
          { id: "multiplied", kind: "procedural", competency: DR, says: "The remainders were multiplied; for a sum, the remainders are added.", predict: (x * y) % d },
        ]);
      if (f === 1)
        return keepBugs([
          x * y >= d && { id: "not-reduced", kind: "procedural", competency: DR, says: `The remainders were multiplied, but ${x * y} is not less than ${d}: divide it by ${d} again to get the remainder.`, predict: x * y },
          { id: "added", kind: "procedural", competency: DR, says: "The remainders were added; for a product, the remainders are multiplied.", predict: (x + y) % d },
        ]);
      if (f === 2)
        return keepBugs([
          { id: "added-remainder", kind: "procedural", competency: DIVB, says: `${x} was added to ${N}; the number must be a multiple of ${d} plus ${x}, and ${N} is not a multiple of ${d}.`, predict: N % d ? N + x : null },
          { id: "next-multiple", kind: "procedural", competency: DIVB, says: `The next multiple of ${d} was given; it leaves remainder 0, so ${x} more is needed.`, predict: N - (N % d) + d },
          ans - d > 0 && { id: "below", kind: "procedural", competency: DIVB, says: `That number leaves the right remainder but is not greater than ${N}.`, predict: ans - d },
        ]);
      return keepBugs([
        { id: "counted-multiples", kind: "conceptual", competency: DIVB, says: `The multiples of ${d} were counted; the numbers wanted are one multiple of ${d} plus ${x}, starting at ${x} itself.`, predict: Math.floor(N / d) },
        { id: "off-by-one", kind: "procedural", competency: DIVB, says: `The first number (${x}) or the last one was left out or counted twice.`, predict: [ans - 1, ans + 1] },
      ]);
    },
    variants: () => [],
    explain: (s) =>
      s.id === "add" || s.id === "mult"
        ? `The remainders ${s.id === "add" ? "added" : "multiplied"}: ${s.value}`
        : s.id === "reduce"
          ? `${s.inputs[0]} ÷ ${s.inputs[1]} leaves ${s.value}`
          : s.id === "multiple"
            ? `The multiple of ${s.inputs[1]} at or below ${s.inputs[0]} is ${s.value}`
            : s.id === "next"
              ? `Add ${s.inputs[1]} (and ${s.inputs[0]} more if needed to pass the number): ${s.value}`
              : s.id === "first"
                ? `The first such number is ${s.value}; then every ${s.inputs[1]}th number`
                : `${s.inputs[0]} ÷ ${s.inputs[1]}, rounded down, plus 1: ${s.value}`,
    domain: D_REM,
    keep: K_REM,
    cap: 400,
    difficulty: ([d, , , f]) => (f === 0 ? 1 : f === 2 ? 2 : d >= 8 ? 3 : 2),
    word: ([d, x, y, f]) =>
      f === 0
        ? `When ${nameOf(d + x)}'s marbles are put into bags of ${d}, ${x} ${x === 1 ? "is" : "are"} left over; when ${nameOf(d + x + 1)}'s marbles are, ${y} ${y === 1 ? "is" : "are"} left over. They put all their marbles together into bags of ${d}. How many marbles are left over?`
        : f === 1
          ? `A shop has ${d * 3 + x} boxes with ${d * 2 + y} sweets in each. All the sweets are repacked in bags of ${d}. How many sweets are left over?`
          : f === 2
            ? `Chairs in a hall are set out in rows of ${d}, and ${pl(x, "chair is", "chairs are")} left over. There are more than ${10 * y} chairs. What is the smallest number of chairs there can be?`
            : `Tokens numbered 1 to ${10 * y} are given out at a school fair. A token wins a prize if its number leaves remainder ${x} when divided by ${d}. How many tokens win a prize?`,
    teach: {
      idea: "Only the remainders matter: a number is a multiple of d plus its remainder, so the remainder of a sum (or product) is the remainder of the sum (or product) of the remainders.",
      method: "Combine the remainders, then divide by d again if the result is d or more. Numbers leaving remainder r are r, r + d, r + 2d, …",
      alternatives: [
        { id: "clock", title: "A clock with d hours", kind: "conceptual", text: ["Think of a clock face numbered 0 to d − 1: counting on past d − 1 comes back to 0.", "Adding remainders is moving round the clock; where you stop is the remainder."] },
      ],
    },
    limits: "Divisors 3 to 12 and numbers up to 200; congruence notation is the Grade 10 family anmod.",
  },
];

// ================================================================ estimation, percentages, proportion, statistics, probability, measures

/** Round to the greatest place (nearest): 4870 → 5000, 23 → 20. */
const lead = (n: number) => {
  const p = 10 ** (String(n).length - 1);
  return Math.round(n / p) * p;
};
const halfway = (n: number) => {
  const p = 10 ** (String(n).length - 1);
  return n % p === p / 2;
};
const D_PEST: [number, number][] = [[1000, 9999], [11, 99]];
const K_PEST = ([a, b]: number[]) => !halfway(a) && !halfway(b) && a % 1000 !== 0 && b % 10 !== 0 && lead(a) * lead(b) !== a * b;

const D_PCTOF: [number, number][] = [[5, 95], [20, 400], [0, 4]];
const K_PCTOF = ([p, n]: number[]) => p % 5 === 0 && n % 20 === 0 && (p * n) % 100 === 0;

const D_MARK: [number, number][] = [[5, 50], [1, 20], [-30, 50], [0, 1]];
const K_MARK = ([A, B, r, m]: number[]) => {
  if (r % 5 !== 0 || r === 0) return false;
  if (m === 0) return (20 * A + 10 * B) % 20 === 0 && r >= -30 && r <= 40 && 10 * B < 20 * A;
  return B === 1 && r > 0 && r <= 50;
};

const D_MIX: [number, number][] = [[1, 9], [1, 30], [1, 9], [1, 30], [0, 1]];
const mixX = (x: number, kind: number) => (kind === 0 ? 20 + 4 * x : 5 * x);
const K_MIX = ([q1, x1, q2, x2, kind]: number[]) => {
  if (x1 >= x2 || q1 === q2) return false;
  if (kind === 1 && (x1 > 12 || x2 > 12)) return false;
  const tot = q1 * mixX(x1, kind) + q2 * mixX(x2, kind);
  return (tot * 100) % (q1 + q2) === 0;
};

const PROP_CHOICES = ["Yes, they are in proportion", "No, they are not in proportion"];
const D_PRP: [number, number][] = [[2, 12], [2, 12], [2, 9], [0, 2]];
const K_PRP = ([a, b]: number[]) => a !== b;
const prpTerms = ([a, b, k, m]: number[]) => (m === 0 ? [a, b, k * a, k * b] : m === 1 ? [a, b, a + k, b + k] : [a, b, k * a, k * b + 1]);
const prpPerm = (p: number[]) => perm(p, 2, 41);

const D_PMISS: [number, number][] = [[2, 12], [2, 15], [2, 9], [0, 3]];
const K_PMISS = ([a, b]: number[]) => a !== b && gcd(a, b) === 1;
const pmTerms = ([a, b, k]: number[]) => [a, b, k * a, k * b];
const ratioRow = (t: number[], pos: number) => t.map((x, i) => (i === pos ? "□" : String(x)));

const DIRV_CHOICES = ["Yes, x and y vary directly", "No, x and y do not vary directly"];
const D_DIRV: [number, number][] = [[1, 6], [1, 4], [2, 9], [0, 2]];
const dirvXs = ([x0, s]: number[]) => [0, 1, 2, 3].map((i) => x0 + i * s);
const dirvYs = (p: number[]) => dirvXs(p).map((x) => (p[3] === 0 ? p[2] * x : p[3] === 1 ? x + p[2] : p[2] * x + 1));
const dirvPerm = (p: number[]) => perm(p, 2, 43);

const D_MISS: [number, number][] = [[6, 25], [-8, 8], [-8, 8], [-8, 8], [-8, 8], [0, 1]];
const K_MISS = ([m, d1, d2, d3, d4]: number[]) => {
  const d5 = -(d1 + d2 + d3 + d4);
  return d1 < d2 && d2 < d3 && d3 < d4 && m + d1 >= 1 && m + d5 >= 1 && Math.abs(d5) <= 15 && ![d1, d2, d3, d4].includes(d5) && d5 !== 0;
};

const D_FMED: [number, number][] = [[0, 10], [1, 9], [1, 9], [1, 9], [1, 9], [1, 9]];
const fmedList = ([x0, ...f]: number[]) => f.flatMap((c, i) => Array(c).fill(x0 + i) as number[]);
const K_FMED = (p: number[]) => {
  const xs = fmedList(p);
  const N = xs.length;
  return N % 2 === 1 || xs[N / 2 - 1] === xs[N / 2];
};
const fmedAns = (p: number[]) => {
  const f = p.slice(1);
  const N = f.reduce((s, x) => s + x, 0);
  const k = Math.floor(N / 2) + 1; // the (N + 1)/2-th value (odd N), or the equal middle pair
  let c = 0;
  for (let i = 0; i < 5; i++) {
    c += f[i];
    if (c >= (N % 2 ? k : N / 2)) return p[0] + i;
  }
  return p[0] + 4;
};
const FMED_CTX = [
  { what: "the number of children in each family on a street", x: "Children", f: "Families" },
  { what: "the number of books each student in a class read during the summer holidays", x: "Books", f: "Students" },
  { what: "the number of goals a school team scored in each of its matches", x: "Goals", f: "Matches" },
  { what: "the number of people living in each house on a street", x: "People", f: "Houses" },
  { what: "the ages, in years, of the children in a dance class", x: "Age (years)", f: "Children" },
];
/** A context in which the values x0 … x0 + 4 are realistic (no family has 9 to 13 children). */
const fmedCtx = (p: number[]) => {
  const ok = p[0] <= 1 ? [0, 1, 2] : p[0] === 2 ? [1, 2] : p[0] <= 4 ? [1, 3] : [1, 4];
  return FMED_CTX[ok[(p[1] + p[2]) % ok.length]];
};

const D_COND: [number, number][] = [[1, 18], [2, 19], [0, 2]];
const K_COND = ([u, v]: number[]) => u < v;
const dec20 = (u: number) => String(u / 20);

const D_DRAW: [number, number][] = [[2, 10], [2, 10], [0, 3]];
const drawAns = ([r, b, m]: number[]) => {
  const n = r + b;
  return m === 0 ? (r * (r - 1)) / (n * (n - 1)) : m === 1 ? (r * b) / (n * (n - 1)) : m === 2 ? (r * (r - 1) + b * (b - 1)) / (n * (n - 1)) : (r * r) / (n * n);
};

const VC_CHOICES = ["Box A has the greater volume", "Box B has the greater volume", "Both boxes have the same volume"];
const D_VC: [number, number][] = [[2, 6], [2, 6], [2, 6], [2, 6], [2, 6], [2, 6]];
const K_VC = ([l1, w1, h1, l2, w2, h2]: number[]) => {
  if (l1 < w1 || l2 < w2) return false;
  const [v1, v2] = [l1 * w1 * h1, l2 * w2 * h2];
  const [s1, s2] = [l1 + w1 + h1, l2 + w2 + h2];
  if (l1 === l2 && w1 === w2 && h1 === h2) return false;
  // keep the comparisons where adding the edges would mislead, and the equal volumes
  return v1 === v2 || Math.sign(v1 - v2) !== Math.sign(s1 - s2) || Math.abs(v1 - v2) <= 6;
};
const vcRight = ([l1, w1, h1, l2, w2, h2]: number[]) => (l1 * w1 * h1 > l2 * w2 * h2 ? 0 : l1 * w1 * h1 < l2 * w2 * h2 ? 1 : 2);
const vcPerm = (p: number[]) => perm(p, 3, 47);

const D_FENCE: [number, number][] = [[5, 40], [3, 30], [1, 10]];
const K_FENCE = ([l, w]: number[]) => l > w;

const P3: Def[] = [
  {
    id: "avpest",
    arity: 2,
    title: "Estimating a large product by rounding",
    competency: ROUND,
    type: "integer",
    mc: true,
    // [a, b]: a four-digit number times a two-digit number, each rounded to its greatest place
    parse: none,
    reject: gate(D_PEST, K_PEST, "A four-digit number times a two-digit number, neither exactly halfway when rounded."),
    prompt: ([a, b]) => `Estimate ${ind(a)} × ${b} by rounding each number to its greatest place (for example 4,870 to 5,000 and 36 to 40) and then multiplying.`,
    solve: ([a, b]) => {
      const [ra, rb] = [lead(a), lead(b)];
      return { steps: [st("round-a", "round", ROUND, [a], ra), st("round-b", "round", ROUND, [b], rb), st("digits", "multiply", MT, [ra / 10 ** (String(ra).length - 1), rb / 10 ** (String(rb).length - 1)], (ra * rb) / 10 ** (String(ra).length + String(rb).length - 2)), st("zeros", "multiply", "MATH.number.multiply-divide-powers-of-ten", [ra, rb], ra * rb)], answer: ra * rb };
    },
    // independent: find the nearest number of the form (one digit) × (a power of ten) by trying them all, then multiply by repeated addition
    validate: ([a, b], v) => {
      const nearest = (n: number) => {
        let best = 0;
        const p = 10 ** (String(n).length - 1);
        for (let dgt = 1; dgt <= 10; dgt++) if (Math.abs(dgt * p - n) < Math.abs(best - n)) best = dgt * p;
        return best;
      };
      return v === times(nearest(a), nearest(b));
    },
    bugs: ([a, b]) => {
      const [ra, rb] = [lead(a), lead(b)];
      const ta = Math.floor(a / 1000) * 1000;
      const tb = Math.floor(b / 10) * 10;
      return keepBugs([
        { id: "rounded-down", kind: "procedural", competency: ROUND, says: "Both numbers were cut down to their first digit instead of rounded to the nearest; look at the next digit: 5 or more rounds up.", predict: ta * tb !== ra * rb ? ta * tb : null },
        { id: "zero-lost", kind: "procedural", competency: "MATH.number.multiply-divide-powers-of-ten", says: "A zero was lost when multiplying; count the zeros in both rounded numbers and write them all after the product of the first digits.", predict: (ra * rb) / 10 },
        { id: "zero-extra", kind: "procedural", competency: "MATH.number.multiply-divide-powers-of-ten", says: "One zero too many was written; the zeros of the answer are the zeros of the two rounded numbers together.", predict: ra * rb * 10 },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "round-a" || s.id === "round-b" ? `${ind(Number(s.inputs[0]))} rounds to ${ind(Number(s.value))}` : s.id === "digits" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `Put back the zeros: ${ind(Number(s.inputs[0]))} × ${s.inputs[1]} = ${ind(Number(s.value))}`),
    domain: D_PEST,
    keep: K_PEST,
    cap: 400,
    difficulty: ([a, b]) => (lead(a) < 10000 && lead(b) < 100 && (lead(a) / 1000) * (lead(b) / 10) < 10 ? 1 : lead(a) === 10000 || lead(b) === 100 ? 3 : 2),
    word: ([a, b]) => `A printing press prints ${ind(a)} copies of a school magazine, each with ${b} pages. About how many pages does it print? Estimate by rounding each number to its greatest place.`,
    teach: {
      idea: "Rounding each factor to its greatest place gives an easy product that is close to the real one: a quick check of size.",
      method: "Round each number, multiply the first digits, then write all the zeros of both rounded numbers: 5,000 × 40 = 20 × 10,000 = 2,00,000.",
      alternatives: [
        { id: "powers", title: "Use powers of ten", kind: "procedural", text: ["Write 5,000 × 40 as 5 × 1,000 × 4 × 10.", "Multiply 5 × 4 = 20 and 1,000 × 10 = 10,000: 20 × 10,000 = 2,00,000."] },
      ],
    },
    limits: "Four-digit numbers times two-digit numbers, rounded to one non-zero digit; estimating to two digits is left out.",
  },
  {
    id: "avpctof",
    arity: 3,
    title: "Percentage of one quantity in another, and percentage change",
    competency: PCT,
    type: "integer",
    mc: true,
    // [p, n, mode]: part = p% of n; mode 0: what % of n is part; 1: % increase n → n + part; 2: % decrease n → n − part; 3: n increased by p%; 4: n decreased by p%
    parse: none,
    reject: gate(D_PCTOF, K_PCTOF, "Multiples of 5% of multiples of 20 (up to 400) with whole-number parts."),
    prompt: ([p, n, m]) => {
      const part = (p * n) / 100;
      return m === 0
        ? `What percentage of ${n} is ${part}?`
        : m === 1
          ? `The price of a school bag rises from ₹${n} to ₹${n + part}. What is the percentage increase?`
          : m === 2
            ? `The price of a school bag falls from ₹${n} to ₹${n - part}. What is the percentage decrease?`
            : m === 3
              ? `Increase ₹${n} by ${p}%. What is the new amount, in rupees?`
              : `Decrease ₹${n} by ${p}%. What is the new amount, in rupees?`;
    },
    solve: ([p, n, m]) => {
      const part = (p * n) / 100;
      if (m === 0) return { steps: [st("fraction", "divide", PCT, [part, n], part / n), st("percent", "multiply", PCT, [part / n, 100], p)], answer: p };
      if (m <= 2) return { steps: [st("change", "subtract", SUB, m === 1 ? [n + part, n] : [n, n - part], part), st("fraction", "divide", PCT, [part, n], part / n), st("percent", "multiply", PCT, [part / n, 100], p)], answer: p };
      return { steps: [st("part", "multiply", PCT, [p, n], part), st("new", m === 3 ? "add" : "subtract", ADD, [n, part], m === 3 ? n + part : n - part)], answer: m === 3 ? n + part : n - part };
    },
    // independent: the answer checked by repeated addition (answer × n against 100 × part, or 100 × answer against n × (100 ± p))
    validate: ([p, n, m], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
      const part = (p * n) / 100;
      if (m <= 2) return times(n, v) === times(part, 100);
      return times(v, 100) === times(n, m === 3 ? 100 + p : 100 - p);
    },
    bugs: ([p, n, m]) => {
      const part = (p * n) / 100;
      const pct = (x: number, y: number) => ((100 * x) % y === 0 ? (100 * x) / y : null);
      if (m === 0)
        return keepBugs([
          { id: "part-as-percent", kind: "conceptual", competency: PCT, says: `The part (${part}) was given as the percentage; a percentage compares the part with the whole, out of 100.`, predict: part },
          { id: "upside-down", kind: "conceptual", competency: PCT, says: `The whole was divided by the part; the percentage is part ÷ whole × 100.`, predict: pct(n, part) },
        ]);
      if (m <= 2)
        return keepBugs([
          { id: "change-as-percent", kind: "conceptual", competency: PCT, says: `The change in rupees (₹${part}) was given; the percentage change compares it with the original price.`, predict: part },
          { id: "new-as-base", kind: "conceptual", competency: PCT, says: `The change was compared with the new price; percentage change is always worked out on the original amount (₹${n}).`, predict: pct(part, m === 1 ? n + part : n - part) },
        ]);
      return keepBugs([
        { id: "change-only", kind: "procedural", competency: PCT, says: `Only the ${m === 3 ? "increase" : "decrease"} (${p}% of ${n}) was given; it must be ${m === 3 ? "added to" : "taken from"} the original amount.`, predict: part },
        { id: "rupees-for-percent", kind: "conceptual", competency: PCT, says: `₹${p} was ${m === 3 ? "added" : "taken away"}; ${p}% of ₹${n} is ₹${part}.`, predict: m === 3 ? n + p : n - p },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "change" ? `The change: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : s.id === "fraction" ? `As a fraction of the original: ${s.inputs[0]}/${s.inputs[1]}` : s.id === "percent" ? `Times 100: ${s.value}%` : s.id === "part" ? `${s.inputs[0]}% of ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}`),
    domain: D_PCTOF,
    keep: K_PCTOF,
    cap: 450,
    difficulty: ([p, , m]) => (m === 0 && [10, 25, 50].includes(p) ? 1 : m >= 3 ? 2 : 3),
    word: ([p, n, m]) => {
      const part = (p * n) / 100;
      const who = nameOf(p + n);
      return m === 0
        ? `${who} scored ${part} marks out of ${n} in a test. What percentage of the marks did ${who} score?`
        : m === 1
          ? `A village library had ${n} books last year and has ${n + part} books now. What is the percentage increase in the number of books?`
          : m === 2
            ? `A shop sold ${n} kites last Pongal and ${n - part} kites this Pongal. What is the percentage decrease in the number of kites sold?`
            : m === 3
              ? `A school had ${n} students last year, and the number grew by ${p}%. How many students does it have now?`
              : `A water tank held ${n} litres, and ${p}% of the water was used. How many litres are left?`;
    },
    teach: {
      idea: "A percentage compares a part with a whole out of 100; a percentage change compares the change with the ORIGINAL amount.",
      method: "Percentage = part ÷ whole × 100. Percentage change = change ÷ original × 100. To increase by p%, add p% of the amount (or multiply by (100 + p)/100).",
      alternatives: [
        { id: "per100", title: "Scale to 100", kind: "conceptual", text: ["Ask: if the whole were 100, how big would the part be?", "18 out of 60: 60 × 5/3 = 100, so 18 × 5/3 = 30 out of 100, or 30%."] },
      ],
    },
    limits: "Multiples of 5% of multiples of 20 up to 400 with whole-number results; successive percentage changes are left out.",
  },
  {
    id: "avmarked",
    arity: 4,
    title: "Overhead expenses and the marked price",
    competency: PL,
    type: "integer",
    mc: true,
    // [A, B, r, m]: m 0: bought for 20A, overheads 10B, sold at a profit (r > 0) or loss (r < 0) of |r|%: find |r|; m 1: marked price 20A, discount r%: find the marked price from the selling price
    parse: none,
    reject: gate(D_MARK, K_MARK, "Prices up to ₹1000 with overheads up to ₹200, profit or loss in multiples of 5%, or discounts of 5% to 50%."),
    prompt: ([A, B, r, m]) => {
      if (m === 1) return `After a discount of ${r}% on its marked price, a shirt is sold for ₹${(20 * A * (100 - r)) / 100}. What is its marked price, in rupees?`;
      const cp = 20 * A + 10 * B;
      return `A trader buys an old bicycle for ₹${20 * A}, spends ₹${10 * B} on repairs, and sells it for ₹${(cp * (100 + r)) / 100}. What is the ${r > 0 ? "profit" : "loss"} per cent?`;
    },
    solve: ([A, B, r, m]) => {
      if (m === 1) {
        const sp = (20 * A * (100 - r)) / 100;
        return { steps: [st("pays", "subtract", PL, [100, r], 100 - r), st("mp", "divide", PL, [sp, 100 - r], 20 * A)], answer: 20 * A };
      }
      const cp = 20 * A + 10 * B;
      const sp = (cp * (100 + r)) / 100;
      return { steps: [st("cp", "add", ADD, [20 * A, 10 * B], cp), st("gain", "subtract", SUB, r > 0 ? [sp, cp] : [cp, sp], Math.abs(sp - cp)), st("percent", "divide", PCT, [Math.abs(sp - cp), cp], Math.abs(r))], answer: Math.abs(r) };
    },
    // independent: m 0 by repeated addition (answer × CP against 100 × gain); m 1 by taking the discount off the answer
    validate: ([A, B, r, m], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      if (m === 1) return times(v, 100 - r) === times((20 * A * (100 - r)) / 100, 100);
      const cp = 20 * A + 10 * B;
      const sp = (cp * (100 + r)) / 100;
      return times(cp, v) === times(Math.abs(sp - cp), 100);
    },
    bugs: ([A, B, r, m]) => {
      if (m === 1) {
        const sp = (20 * A * (100 - r)) / 100;
        return keepBugs([
          { id: "added-discount-of-sp", kind: "conceptual", competency: PL, says: `${r}% of the selling price was added back; the discount was ${r}% of the marked price, so the selling price is ${100 - r}% of it.`, predict: (sp * (100 + r)) % 100 === 0 ? (sp * (100 + r)) / 100 : null },
          { id: "discount-taken-again", kind: "procedural", competency: PL, says: "The discount was taken off the selling price again; the marked price is more than the selling price.", predict: (sp * (100 - r)) % 100 === 0 ? (sp * (100 - r)) / 100 : null },
          { id: "rupees-added", kind: "conceptual", competency: PL, says: `₹${r} was added; the discount is ${r}% of the marked price, not ₹${r}.`, predict: sp + r },
        ]);
      }
      const cp = 20 * A + 10 * B;
      const sp = (cp * (100 + r)) / 100;
      const g = Math.abs(sp - cp);
      const P = 20 * A;
      return keepBugs([
        { id: "overheads-left-out", kind: "conceptual", competency: PL, says: `The repair cost was left out; the cost price includes overhead expenses: ₹${P} + ₹${10 * B} = ₹${cp}.`, predict: (100 * Math.abs(sp - P)) % P === 0 && sp !== P ? (100 * Math.abs(sp - P)) / P : null },
        { id: "percent-of-sp", kind: "conceptual", competency: PL, says: "The profit or loss was compared with the selling price; it is always a percentage of the cost price.", predict: (100 * g) % sp === 0 ? (100 * g) / sp : null },
        { id: "amount-for-percent", kind: "procedural", competency: PL, says: `The ${r > 0 ? "profit" : "loss"} in rupees (₹${g}) was given; the question asks for it as a percentage of the cost price.`, predict: g },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "cp" ? `Cost price = price paid + overheads: ${s.inputs[0]} + ${s.inputs[1]} = ₹${s.value}` : s.id === "gain" ? `${s.inputs[0]} − ${s.inputs[1]} = ₹${s.value}` : s.id === "percent" ? `${s.inputs[0]} ÷ ${s.inputs[1]} × 100 = ${s.value}%` : s.id === "pays" ? `The shirt sells for ${s.value}% of its marked price` : `${s.value}% of the marked price is ₹${s.inputs[0]}, so the marked price is ₹${s.inputs[0]} ÷ ${s.inputs[1]} × 100 = ₹${s.value}`),
    domain: D_MARK,
    keep: K_MARK,
    cap: 420,
    difficulty: ([, , r, m]) => (m === 1 ? (r % 10 === 0 ? 2 : 3) : r > 0 && r % 10 === 0 ? 1 : 2),
    word: ([A, B, r, m]) => {
      if (m === 1) return `A shop gives ${r}% off the marked price of a pressure cooker. ${nameOf(A + r)} pays ₹${(20 * A * (100 - r)) / 100} for it. What was the marked price, in rupees?`;
      const cp = 20 * A + 10 * B;
      return `${nameOf(A + B)} buys a used sewing machine for ₹${20 * A} and pays ₹${10 * B} to have it carried home. Later it is sold for ₹${(cp * (100 + r)) / 100}. What is the ${r > 0 ? "profit" : "loss"} per cent?`;
    },
    teach: {
      idea: "Overheads (repairs, transport) are part of what was spent, so they belong in the cost price; a discount is a percentage of the marked price.",
      method: "CP = price paid + overheads; profit % = profit ÷ CP × 100. If the discount is d%, the selling price is (100 − d)% of the marked price, so MP = SP × 100 ÷ (100 − d).",
      alternatives: [
        { id: "bar", title: "A bar of 100 parts", kind: "conceptual", text: ["Draw the marked price as a bar of 100 equal parts.", "The discount takes away d parts; the selling price is the other 100 − d parts. Find one part, then all 100."] },
      ],
    },
    limits: "Prices up to ₹1000 with whole-number results; GST on a discounted price is the family ajdisc.",
  },
  {
    id: "avmix",
    arity: 5,
    title: "The price or concentration of a mixture",
    competency: WM,
    type: "fraction",
    mc: true,
    decimals: true,
    // [q1, x1, q2, x2, kind]: kind 0 rice at ₹(20 + 4x) per kg; kind 1 syrup of 5x% sugar
    parse: none,
    reject: gate(D_MIX, K_MIX, "Two quantities up to 9 mixed, prices ₹24 to ₹140 per kg or strengths 5% to 60%, with an answer in at most two decimal places."),
    prompt: ([q1, x1, q2, x2, kind]) =>
      kind === 0
        ? `A grocer mixes ${q1} kg of rice costing ₹${mixX(x1, 0)} per kg with ${q2} kg of rice costing ₹${mixX(x2, 0)} per kg. What is the cost of the mixture per kg, in rupees?`
        : `${pl(q1, "litre")} of syrup that is ${mixX(x1, 1)}% sugar ${q1 === 1 ? "is" : "are"} mixed with ${pl(q2, "litre")} of syrup that is ${mixX(x2, 1)}% sugar. What percentage of the mixture is sugar?`,
    solve: ([q1, x1, q2, x2, kind]) => {
      const [a, b] = [mixX(x1, kind), mixX(x2, kind)];
      const tot = q1 * a + q2 * b;
      return { steps: [st("first", "multiply", WM, [q1, a], q1 * a), st("second", "multiply", WM, [q2, b], q2 * b), st("total", "add", ADD, [q1 * a, q2 * b], tot), st("share", "divide", WM, [tot, q1 + q2], tot / (q1 + q2))], answer: tot / (q1 + q2) };
    },
    // independent: add the price (or sugar) unit by unit over every kilogram (or litre) of the mixture
    validate: ([q1, x1, q2, x2, kind], v) => {
      if (typeof v !== "number") return false;
      let s = 0;
      for (let i = 0; i < q1; i++) s += mixX(x1, kind);
      for (let i = 0; i < q2; i++) s += mixX(x2, kind);
      return near(v * (q1 + q2), s);
    },
    bugs: ([q1, x1, q2, x2, kind]) => {
      const [a, b] = [mixX(x1, kind), mixX(x2, kind)];
      return keepBugs([
        { id: "plain-average", kind: "conceptual", competency: WM, says: `The two ${kind ? "strengths" : "prices"} were averaged; there is more of one than the other (${q1} and ${q2}), so each must be weighted by its quantity.`, predict: (a + b) / 2 },
        { id: "weights-swapped", kind: "procedural", competency: WM, says: "Each quantity was multiplied by the other one's " + (kind ? "strength" : "price") + "; match each quantity with its own.", predict: (q2 * a + q1 * b) / (q1 + q2) },
        { id: "total-not-shared", kind: "procedural", competency: WM, says: `The total ${kind ? "amount of sugar" : "cost"} was found but not divided by the total quantity (${q1 + q2}).`, predict: q1 * a + q2 * b },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Total: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "share" ? `Per unit of the mixture: ${s.inputs[0]} ÷ ${s.inputs[1]} = ${show(s.value)}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: D_MIX,
    keep: K_MIX,
    cap: 400,
    difficulty: ([q1, , q2]) => ((q1 + q2) % 2 === 0 && q1 + q2 <= 8 ? 1 : q1 + q2 <= 10 ? 2 : 3),
    word: ([q1, x1, q2, x2, kind]) =>
      kind === 0
        ? `A tea shop blends ${q1} kg of tea leaves costing ₹${mixX(x1, 0)} per kg with ${q2} kg costing ₹${mixX(x2, 0)} per kg. What does the blend cost per kg, in rupees?`
        : `${nameOf(q1 + q2 + x1)} mixes ${pl(q1, "litre")} of a fruit drink that is ${mixX(x1, 1)}% mango pulp with ${pl(q2, "litre")} of one that is ${mixX(x2, 1)}% mango pulp. What percentage of the mixture is mango pulp?`,
    teach: {
      idea: "The price (or strength) of a mixture is a weighted mean: each part counts as much as its quantity.",
      method: "Find the total cost (or total sugar) of all the parts, then divide by the total quantity.",
      alternatives: [
        { id: "line", title: "A balance on a line", kind: "conceptual", text: ["Mark the two prices on a number line; the mixture's price lies between them.", "It lies nearer the price there is more of: with 3 kg and 1 kg, it is three quarters of the way towards the 3 kg price."] },
      ],
    },
    limits: "Two parts only, with quantities up to 9 and answers in at most two decimal places; alligation with three parts is left out.",
  },
  {
    id: "avprop",
    arity: 4,
    title: "Are four numbers in proportion?",
    competency: PROP,
    type: "choice",
    // [a, b, k, m]: m 0 a, b, ka, kb (in proportion); m 1 a, b, a + k, b + k (same differences); m 2 a, b, ka, kb + 1
    parse: none,
    reject: gate(D_PRP, K_PRP, "Four whole numbers up to 109."),
    choices: (p) => prpPerm(p).map((i) => PROP_CHOICES[i]),
    prompt: (p) => {
      const [a, b, c, d] = prpTerms(p);
      return `Are ${a}, ${b}, ${c} and ${d} in proportion, in this order? (Compare the product of the extremes with the product of the means.)`;
    },
    solve: (p) => {
      const [a, b, c, d] = prpTerms(p);
      return { steps: [st("extremes", "multiply", MT, [a, d], a * d), st("means", "multiply", MT, [b, c], b * c), st("compare", "compare", PROP, [a * d, b * c], a * d === b * c ? PROP_CHOICES[0] : PROP_CHOICES[1])], answer: prpPerm(p).indexOf(a * d === b * c ? 0 : 1) };
    },
    // independent: compare the two ratios by repeated addition (a × d against b × c)
    validate: (p, v) => {
      const [a, b, c, d] = prpTerms(p);
      return typeof v === "number" && prpPerm(p)[v] === (times(a, d) === times(b, c) ? 0 : 1);
    },
    bugs: (p) => {
      const pr = prpPerm(p);
      return p[3] === 1
        ? [{ id: "same-difference", kind: "conceptual", competency: "MATH.reasoning.proportional-check", says: "The numbers were taken to be in proportion because they go up by the same amount; a proportion needs the same ratio (the same multiplier), not the same difference.", predict: pr.indexOf(0) }]
        : p[3] === 2
          ? [{ id: "first-pair-only", kind: "procedural", competency: PROP, says: "Only the first terms were checked (the third is a multiple of the first); the fourth must be the same multiple of the second.", predict: pr.indexOf(0) }]
          : [{ id: "differences-differ", kind: "conceptual", competency: "MATH.reasoning.proportional-check", says: "The differences were compared and found unequal; in a proportion the ratios are equal, so the differences usually are not.", predict: pr.indexOf(1) }];
    },
    variants: () => [],
    explain: (s) => (s.id === "extremes" ? `Product of the extremes: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "means" ? `Product of the means: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} ${s.inputs[0] === s.inputs[1] ? "=" : "≠"} ${s.inputs[1]}: ${String(s.value).toLowerCase()}`),
    domain: D_PRP,
    keep: K_PRP,
    cap: 360,
    difficulty: ([a, b, k, m]) => (m === 0 && k <= 3 ? 1 : m === 2 ? 3 : a * b * k <= 150 ? 1 : 2),
    word: (p) => {
      const [a, b, c, d] = prpTerms(p);
      return `A recipe uses ${a} cups of rice for ${b} people. ${nameOf(a + b + c)} uses ${c} cups of rice for ${d} people. Are the two amounts of rice in proportion to the numbers of people?`;
    },
    teach: {
      idea: "a, b, c, d are in proportion when a : b = c : d, that is, when the product of the extremes equals the product of the means: a × d = b × c.",
      method: "Multiply the first and the last numbers, then the middle two. Equal products: in proportion; different: not in proportion.",
      alternatives: [
        { id: "ratios", title: "Simplify both ratios", kind: "procedural", text: ["Write a : b and c : d in simplest form.", "If the simplest forms are the same, the four numbers are in proportion."] },
      ],
    },
    limits: "Whole numbers up to 109; proportions with fractions or decimals are left out.",
  },
  {
    id: "avpmiss",
    arity: 4,
    title: "The missing term of a proportion",
    competency: PROP,
    type: "integer",
    mc: true,
    // [a, b, k, pos]: a : b :: ka : kb, with term pos missing
    parse: none,
    reject: gate(D_PMISS, K_PMISS, "a : b :: ka : kb with a, b up to 15 and k up to 9."),
    prompt: (p) => {
      const t = ratioRow(pmTerms(p), p[3]);
      return `Find the missing term: ${t[0]} : ${t[1]} :: ${t[2]} : ${t[3]}`;
    },
    solve: (p) => {
      const t = pmTerms(p);
      const pos = p[3];
      const known = t.filter((_, i) => i !== pos);
      // the product of the extremes equals the product of the means
      const other = pos === 0 ? t[1] * t[2] : pos === 3 ? t[1] * t[2] : t[0] * t[3];
      const by = pos === 0 ? t[3] : pos === 3 ? t[0] : pos === 1 ? t[2] : t[1];
      return { steps: [st("product", "multiply", PROP, known, other), st("divide", "divide", PROP, [other, by], t[pos])], answer: t[pos] };
    },
    // independent: put the answer back and compare the cross-products by repeated addition
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      const t = pmTerms(p).map((x, i) => (i === p[3] ? v : x));
      return times(t[0], t[3]) === times(t[1], t[2]);
    },
    bugs: (p) => {
      const t = pmTerms(p);
      const pos = p[3];
      // the additive slip: the same difference instead of the same multiplier
      const add = pos === 3 ? t[2] + (t[1] - t[0]) : pos === 2 ? t[3] - (t[1] - t[0]) : pos === 1 ? t[0] + (t[3] - t[2]) : t[1] - (t[3] - t[2]);
      const wrongPair = pos === 3 ? (t[0] * t[2]) / t[1] : pos === 2 ? (t[0] * t[1]) / t[3] : pos === 1 ? (t[0] * t[3]) / t[2] : (t[2] * t[3]) / t[1];
      return keepBugs([
        add > 0 && { id: "additive", kind: "conceptual", competency: "MATH.reasoning.proportional-check", says: "The same difference was used instead of the same multiplier; in a proportion the second ratio is the first one scaled.", predict: add },
        Number.isInteger(wrongPair) && wrongPair > 0 && { id: "wrong-pair", kind: "procedural", competency: PROP, says: "The wrong pair was multiplied: it is the extremes (first and last) against the means (middle two).", predict: wrongPair },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "product" ? `Extremes × means: the known pair multiplies to ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: D_PMISS,
    keep: K_PMISS,
    cap: 400,
    difficulty: ([, , k, pos]) => (pos === 3 && k <= 4 ? 1 : pos >= 2 ? 2 : 3),
    word: (p) => {
      const [a, b, c, d] = pmTerms(p);
      const pos = p[3];
      return pos === 0
        ? `On a map, ${c} cm stands for ${d} km. How many centimetres on the map stand for ${b} km?`
        : pos === 1
          ? `On a map, ${c} cm stands for ${d} km. How many kilometres does ${a} cm stand for?`
          : pos === 2
            ? `On a map, ${a} cm stands for ${b} km. How many centimetres on the map stand for ${d} km?`
            : `On a map, ${a} cm stands for ${b} km. How many kilometres does ${c} cm stand for?`;
    },
    teach: {
      idea: "In a : b :: c : d the product of the extremes equals the product of the means: a × d = b × c.",
      method: "Multiply the two known terms that pair up (extremes or means), then divide by the known term of the other pair.",
      alternatives: [
        { id: "unitary", title: "The unitary method", kind: "procedural", text: ["Find what 1 of the first quantity goes with: 4 cm for 10 km is 2.5 km for 1 cm.", "Then scale up to the number you need."] },
      ],
    },
    limits: "a : b in simplest form with a, b up to 15 and a whole multiplier up to 9.",
  },
  {
    id: "avdirv",
    arity: 4,
    title: "Do two quantities vary directly?",
    competency: PROP,
    type: "choice",
    // [x0, s, k, m]: x = x0, x0 + s, …; m 0 y = kx; m 1 y = x + k; m 2 y = kx + 1
    parse: none,
    reject: gate(D_DIRV, () => true, "Four values of x in steps of 1 to 4."),
    choices: (p) => dirvPerm(p).map((i) => DIRV_CHOICES[i]),
    figure: (p) => ({ type: "table", head: ["x", ...dirvXs(p).map(String)], rows: [["y", ...dirvYs(p).map(String)]] }),
    prompt: () => `The table in the picture shows four pairs of values of two quantities x and y. Do x and y vary directly?`,
    solve: (p) => {
      const ys = dirvYs(p);
      const xs = dirvXs(p);
      const direct = p[3] === 0;
      return { steps: [st("ratios", "divide", PROP, ys.map((y, i) => `${y}/${xs[i]}`), direct ? p[2] : "not equal"), st("decide", "compare", PROP, [], DIRV_CHOICES[direct ? 0 : 1])], answer: dirvPerm(p).indexOf(direct ? 0 : 1) };
    },
    // independent: cross-multiply every pair of columns (y₁ × x₂ = y₂ × x₁ for all pairs)
    validate: (p, v) => {
      const xs = dirvXs(p);
      const ys = dirvYs(p);
      let same = true;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (times(ys[i], xs[j]) !== times(ys[j], xs[i])) same = false;
      return typeof v === "number" && dirvPerm(p)[v] === (same ? 0 : 1);
    },
    bugs: (p) => {
      const pr = dirvPerm(p);
      return p[3] === 0
        ? [{ id: "equal-steps-expected", kind: "conceptual", competency: PROP, says: "y was expected to go up by the same amount as x; in direct variation y ÷ x stays the same, so y goes up by k times as much.", predict: pr.indexOf(1) }]
        : [{ id: "both-increase", kind: "conceptual", competency: "MATH.reasoning.proportional-check", says: "Both quantities increase together, but that is not enough: in direct variation y ÷ x is the same for every pair (and y = 0 when x = 0).", predict: pr.indexOf(0) }];
    },
    variants: () => [],
    explain: (s) => (s.id === "ratios" ? `y ÷ x for each pair: ${s.inputs.join(", ")} — ${typeof s.value === "number" ? `all equal to ${s.value}` : "not all equal"}` : String(s.value)),
    domain: D_DIRV,
    cap: 300,
    difficulty: ([, , , m]) => (m === 1 ? 1 : m === 0 ? 2 : 3),
    word: () => `At a photocopy shop, the table in the picture shows the number of copies ordered (x) and the bill in rupees (y) for four orders. Do x and y vary directly?`,
    teach: {
      idea: "Two quantities vary directly when y = kx: y ÷ x is the same for every pair, so doubling x doubles y.",
      method: "Work out y ÷ x for each column of the table. All equal: direct variation. Any different: not direct variation.",
      alternatives: [
        { id: "double", title: "Double and check", kind: "conceptual", text: ["Find two columns where x doubles (or triples).", "In direct variation y must double (or triple) too; if it does not, the quantities do not vary directly."] },
      ],
    },
    limits: "Four pairs of whole numbers; inverse variation is the family ahinv.",
  },
  {
    id: "avmiss",
    arity: 6,
    title: "A missing value from the mean, and deviations from the mean",
    competency: AVG,
    type: "integer",
    mc: true,
    // [m, d1, d2, d3, d4, mode]: five values with mean m, four given as m + dᵢ; mode 0: the fifth value; mode 1: its deviation from the mean
    parse: none,
    reject: gate(D_MISS, K_MISS, "Five whole numbers with a whole-number mean from 6 to 25."),
    prompt: ([m, d1, d2, d3, d4, mode]) => {
      const xs = [d1, d2, d3, d4].map((d) => m + d).join(", ");
      return mode === 0
        ? `The mean of five numbers is ${m}. Four of them are ${xs}. What is the fifth number?`
        : `The mean of five numbers is ${m}. Four of them are ${xs}. The deviations from the mean (value − mean) of all five numbers add up to 0. What is the deviation of the fifth number from the mean? (It may be negative.)`;
    },
    solve: ([m, d1, d2, d3, d4, mode]) => {
      const xs = [d1, d2, d3, d4].map((d) => m + d);
      const s = xs.reduce((a, b) => a + b, 0);
      const d5 = -(d1 + d2 + d3 + d4);
      if (mode === 0) return { steps: [st("total", "multiply", AVG, [5, m], 5 * m), st("given", "add", ADD, xs, s), st("fifth", "subtract", SUB, [5 * m, s], 5 * m - s)], answer: 5 * m - s };
      return { steps: [st("devs", "subtract", AVG, xs.map((x) => x - m), d1 + d2 + d3 + d4), st("balance", "evaluate", AVG, [d1 + d2 + d3 + d4], d5)], answer: d5 };
    },
    // independent: put the fifth value in and level the five numbers out one unit at a time: they must all reach the mean
    validate: ([m, d1, d2, d3, d4, mode], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const xs = [d1, d2, d3, d4].map((d) => m + d);
      xs.push(mode === 0 ? v : m + v);
      if (xs[4] < 0) return false;
      for (let g = 0; g < 400; g++) {
        const hi = xs.indexOf(Math.max(...xs));
        const lo = xs.indexOf(Math.min(...xs));
        if (xs[hi] === xs[lo]) break;
        xs[hi]--;
        xs[lo]++;
      }
      return xs.every((x) => x === m);
    },
    bugs: ([m, d1, d2, d3, d4, mode]) => {
      const xs = [d1, d2, d3, d4].map((d) => m + d);
      const s = xs.reduce((a, b) => a + b, 0);
      const d5 = -(d1 + d2 + d3 + d4);
      return mode === 0
        ? keepBugs([
            { id: "four-for-five", kind: "procedural", competency: AVG, says: `The total was taken as 4 × ${m}; there are five numbers, so their total is 5 × ${m}.`, predict: 4 * m - s > 0 ? 4 * m - s : null },
            { id: "mean-of-four", kind: "conceptual", competency: AVG, says: "The mean of the four given numbers was found; the question asks for the number that makes the mean of all five equal to " + m + ".", predict: s % 4 === 0 ? s / 4 : null },
            { id: "mean-as-value", kind: "conceptual", competency: AVG, says: `The fifth number was taken to be the mean (${m}); the fifth number balances the others, so it is usually different.`, predict: m },
          ])
        : keepBugs([
            { id: "sign-flipped", kind: "procedural", competency: AVG, says: `The sum of the four deviations (${d1 + d2 + d3 + d4}) was given; the fifth must balance it, so it has the opposite sign.`, predict: d1 + d2 + d3 + d4 },
            { id: "value-for-deviation", kind: "conceptual", competency: AVG, says: "The fifth value was given; its deviation is the value minus the mean.", predict: m + d5 },
          ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `The five numbers add up to 5 × ${s.inputs[1]} = ${s.value}` : s.id === "given" ? `The four given numbers add up to ${s.value}` : s.id === "fifth" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : s.id === "devs" ? `Deviations of the four: ${(s.inputs as number[]).map((d) => (d < 0 ? `−${-d}` : `+${d}`)).join(", ")}; they add up to ${neg(Number(s.value))}` : `The fifth balances them: ${neg(Number(s.value))}`),
    domain: D_MISS,
    keep: K_MISS,
    cap: 420,
    difficulty: ([m, , , , , mode]) => (mode === 1 ? 3 : m <= 12 ? 1 : 2),
    // level@1: deviations from the mean need negative integers, which come in a later grade
    grade: (p) => (p[5] === 1 ? 7 : 5),
    word: ([m, d1, d2, d3, d4, mode]) => {
      const xs = [d1, d2, d3, d4].map((d) => m + d).join(", ");
      return mode === 0
        ? `${nameOf(m + d1)} took five tests, and the mean score was ${m}. The scores in four of them were ${xs}. What was the score in the fifth test?`
        : `The mean rainfall over five days was ${m} mm. On four of the days it was ${xs} mm. By how many millimetres was the fifth day's rainfall above the mean? (Give a negative number if it was below the mean.)`;
    },
    teach: {
      idea: "The mean is the balance point of the data: the deviations above it exactly balance those below, so they add up to 0. The total is the mean times the count.",
      method: "Missing value: total = mean × number of values; subtract the values you know. Deviation: add the known deviations and take the opposite.",
      visual: ([m, d1, d2, d3, d4]) => ({ type: "numberline", from: Math.max(0, m + Math.min(d1, -(d1 + d2 + d3 + d4)) - 1), to: m + Math.max(d4, -(d1 + d2 + d3 + d4)) + 1, marks: [m] }),
      alternatives: [
        { id: "seesaw", title: "A seesaw", kind: "conceptual", text: ["Put the values on a number line as weights and the mean as the pivot.", "Distances to the left and to the right of the mean balance: the missing value sits where the seesaw levels."] },
      ],
    },
    limits: "Five whole numbers within 15 of a whole-number mean from 6 to 25; grouped data are other families.",
  },
  {
    id: "avfmed",
    contract: { kind: "typed", typed: ([x0, ...f]) => b1Object("statistics", "median", { values: f.flatMap((n, i) => new Array(n).fill(x0 + i)) }) },
    arity: 6,
    title: "The median of data in a frequency table",
    competency: MED,
    type: "integer",
    mc: true,
    // [x0, f1 … f5]: values x0 … x0 + 4 with frequencies f1 … f5
    parse: none,
    reject: gate(D_FMED, K_FMED, "Five consecutive values with frequencies 1 to 9 and a single middle value."),
    figure: (p) => {
      const c = fmedCtx(p);
      return { type: "table", head: [c.x, c.f], rows: p.slice(1).map((f, i) => [String(p[0] + i), String(f)]) };
    },
    prompt: (p) => `The table in the picture shows ${fmedCtx(p).what}. What is the median?`,
    solve: (p) => {
      const f = p.slice(1);
      const N = f.reduce((s, x) => s + x, 0);
      const cum = f.map((_, i) => f.slice(0, i + 1).reduce((s, x) => s + x, 0));
      return { steps: [st("n", "add", ADD, f, N), st("cumulative", "add", MED, cum, cum[cum.length - 1]), st("middle", "evaluate", MED, [N % 2 ? (N + 1) / 2 : N / 2], fmedAns(p))], answer: fmedAns(p) };
    },
    // independent: write the list out in full and take its middle entry
    validate: (p, v) => {
      const xs = fmedList(p).sort((a, b) => a - b);
      const N = xs.length;
      const med = N % 2 ? xs[(N - 1) / 2] : (xs[N / 2 - 1] + xs[N / 2]) / 2;
      return v === med;
    },
    bugs: (p) => {
      const f = p.slice(1);
      const sorted = [...f].sort((a, b) => a - b);
      const mode = p[0] + f.indexOf(Math.max(...f));
      return keepBugs([
        { id: "middle-of-table", kind: "conceptual", competency: MED, says: "The middle row of the table was taken; the median is the middle of all the data, so the frequencies count how many times each value appears.", predict: p[0] + 2 },
        f.filter((x) => x === Math.max(...f)).length === 1 && { id: "mode-for-median", kind: "conceptual", competency: MED, says: "The value with the highest frequency was given; that is the mode. The median is the middle value when all the data are in order.", predict: mode },
        { id: "median-of-frequencies", kind: "conceptual", competency: MED, says: "The middle of the frequencies was found; the median is a value of the data, found by counting through the frequencies.", predict: sorted[2] },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "n" ? `There are ${s.inputs.join(" + ")} = ${s.value} values in all` : s.id === "cumulative" ? `Running totals: ${s.inputs.join(", ")}` : `The middle (value number ${s.inputs[0]}) falls in the row of ${s.value}`),
    domain: D_FMED,
    keep: K_FMED,
    cap: 420,
    difficulty: (p) => lv(p.slice(1).reduce((s, x) => s + x, 0), 15, 30),
    word: (p) => `For a school project, ${nameOf(p[0] + p[1])} collected data on ${fmedCtx(p).what}; the results are in the table in the picture. Half the data are at or below which value, and half at or above it? (Give the median.)`,
    teach: {
      idea: "In a frequency table each value appears as many times as its frequency; the median is the middle value of that full ordered list.",
      method: "Add the frequencies to get n. Find the middle position ((n + 1)/2 for odd n). Keep a running total of the frequencies until it reaches that position: that row's value is the median.",
      alternatives: [
        { id: "write_out", title: "Write the list out", kind: "conceptual", text: ["Write each value as many times as its frequency, in order.", "Cross off one from each end, again and again: the value left in the middle is the median."] },
      ],
    },
    limits: "Five consecutive whole-number values with frequencies up to 9 and one middle value; grouped data are the family angmedian.",
  },
  {
    id: "avcond",
    contract: { kind: "typed", typed: ([u, v, mode]) => (mode === 0 ? b1Object("probability", "conditional", { pab: `${u}/20`, pb: `${v}/20` }) : null) },
    arity: 3,
    title: "Conditional probability from P(A ∩ B) and P(B)",
    competency: COND,
    type: "fraction",
    mc: true,
    range: [0, 1],
    // [u, v, mode]: P(A ∩ B) = u/20, P(B) = v/20; mode 0: P(A | B); 1: P(A′ | B); 2: P(A ∩ B) from P(B) and P(A | B)
    parse: none,
    reject: gate(D_COND, K_COND, "P(A ∩ B) and P(B) in twentieths, with P(A ∩ B) < P(B)."),
    prompt: ([u, v, mode]) => {
      const pab = dec20(u);
      const pb = dec20(v);
      return mode === 0
        ? `For events A and B, P(A ∩ B) = ${pab} and P(B) = ${pb}. Find P(A | B). (A fraction is fine.)`
        : mode === 1
          ? `For events A and B, P(A ∩ B) = ${pab} and P(B) = ${pb}. Find P(A′ | B), the probability that A does not happen given that B happens. (A fraction is fine.)`
          : `For events A and B, P(B) = ${pb} and P(A | B) = ${show(u / v)}. Find P(A ∩ B). (A decimal or fraction is fine.)`;
    },
    solve: ([u, v, mode]) => {
      if (mode === 2) return { steps: [st("multiply", "multiply", COND, [v / 20, u / v], u / 20)], answer: u / 20 };
      const s = st("formula", "divide", COND, [u / 20, v / 20], u / v);
      return mode === 0 ? { steps: [s], answer: u / v } : { steps: [s, st("complement", "subtract", COND, [1, u / v], 1 - u / v)], answer: 1 - u / v };
    },
    // independent: invert the relation P(A ∩ B) = P(B) × P(A | B) and check it numerically
    validate: ([u, v, mode], x) => {
      if (typeof x !== "number" || x < 0 || x > 1) return false;
      if (mode === 0) return near(x * (v / 20), u / 20);
      if (mode === 1) return near((1 - x) * (v / 20), u / 20);
      return near(x / (v / 20), u / v);
    },
    bugs: ([u, v, mode]) =>
      mode === 0
        ? keepBugs([
            { id: "multiplied", kind: "conceptual", competency: COND, says: "P(A ∩ B) and P(B) were multiplied; given B, the probability is the share of B taken by A ∩ B: divide.", predict: (u * v) / 400 },
            { id: "intersection-as-answer", kind: "conceptual", competency: COND, says: "P(A ∩ B) was given; knowing that B happened makes B the whole, so divide by P(B).", predict: u / 20 },
            { id: "upside-down", kind: "procedural", competency: COND, says: "P(B) was divided by P(A ∩ B); it is P(A ∩ B) ÷ P(B).", predict: v / u },
          ])
        : mode === 1
          ? keepBugs([
              { id: "no-complement", kind: "procedural", competency: COND, says: "P(A | B) was found but not taken from 1; P(A′ | B) = 1 − P(A | B).", predict: u / v },
              { id: "complement-of-intersection", kind: "conceptual", competency: COND, says: "1 − P(A ∩ B) was found; the complement must also be taken within B: 1 − P(A ∩ B)/P(B).", predict: (20 - u) / 20 },
            ])
          : keepBugs([
              { id: "divided", kind: "procedural", competency: COND, says: "P(A | B) was divided by P(B); the multiplication theorem multiplies: P(A ∩ B) = P(B) × P(A | B).", predict: (u / v) / (v / 20) },
              { id: "conditional-as-joint", kind: "conceptual", competency: COND, says: "P(A | B) was given as P(A ∩ B); the joint probability also needs the chance that B happens.", predict: u / v },
            ]),
    variants: () => [],
    explain: (s) => (s.id === "formula" ? `P(A | B) = P(A ∩ B) ÷ P(B) = ${show(Number(s.inputs[0]))} ÷ ${show(Number(s.inputs[1]))} = ${show(s.value)}` : s.id === "complement" ? `P(A′ | B) = 1 − ${show(Number(s.inputs[1]))} = ${show(s.value)}` : `P(A ∩ B) = P(B) × P(A | B) = ${show(Number(s.inputs[0]))} × ${show(Number(s.inputs[1]))} = ${show(s.value)}`),
    domain: D_COND,
    keep: K_COND,
    difficulty: ([u, v, mode]) => (mode === 0 && gcd(u, v) === 1 ? 1 : mode === 0 ? 2 : 3),
    word: ([u, v, mode]) => {
      const pab = dec20(u);
      const pb = dec20(v);
      return mode === 0
        ? `In a college, the probability that a student travels by bus is ${pb}, and the probability that a student travels by bus and is in the NCC is ${pab}. A student who travels by bus is chosen at random. What is the probability that this student is in the NCC? (A fraction is fine.)`
        : mode === 1
          ? `In a college, the probability that a student travels by bus is ${pb}, and the probability that a student travels by bus and is in the NCC is ${pab}. A student who travels by bus is chosen at random. What is the probability that this student is not in the NCC? (A fraction is fine.)`
          : `In a college, the probability that a student travels by bus is ${pb}, and among the students who travel by bus the probability of being in the NCC is ${show(u / v)}. What is the probability that a student chosen at random travels by bus and is in the NCC? (A decimal or fraction is fine.)`;
    },
    teach: {
      idea: "Given that B happened, B becomes the whole sample space: P(A | B) = P(A ∩ B)/P(B). Conditional probabilities given B obey the usual rules, e.g. P(A′ | B) = 1 − P(A | B).",
      method: "Divide P(A ∩ B) by P(B). For a joint probability, multiply: P(A ∩ B) = P(B) × P(A | B).",
      alternatives: [
        { id: "hundred", title: "Imagine 20 equally likely cases", kind: "conceptual", text: ["With probabilities in twentieths, picture 20 students: P(B) = 0.6 means 12 of them are in B.", "If 7 are in both, then among the 12 in B the chance of A is 7/12."] },
      ],
    },
    limits: "Probabilities in twentieths; Bayes' theorem is the family asbayes.",
  },
  {
    id: "avdraw",
    arity: 3,
    title: "The multiplication theorem: drawing two without replacement",
    competency: COND,
    type: "fraction",
    mc: true,
    range: [0, 1],
    // [r, b, mode]: r red and b blue balls; mode 0 both red; 1 red then blue; 2 both the same colour (all without replacement); 3 both red with replacement
    parse: none,
    reject: gate(D_DRAW, () => true, "Bags of 2 to 10 red and 2 to 10 blue balls."),
    prompt: ([r, b, mode]) =>
      `A bag has ${r} red balls and ${b} blue balls. Two balls are drawn one after the other at random, ${mode === 3 ? "with the first put back before the second is drawn" : "without replacement"}. ` +
      (mode === 0 || mode === 3 ? `What is the probability that both are red?` : mode === 1 ? `What is the probability that the first is red and the second is blue?` : `What is the probability that both are the same colour?`) +
      ` (A fraction is fine.)`,
    solve: ([r, b, mode]) => {
      const n = r + b;
      if (mode === 3) return { steps: [st("first", "divide", COND, [r, n], r / n), st("second", "divide", COND, [r, n], r / n), st("both", "multiply", COND, [r / n, r / n], (r * r) / (n * n))], answer: drawAns([r, b, mode]) };
      if (mode === 2) return { steps: [st("rr", "multiply", COND, [r / n, (r - 1) / (n - 1)], (r * (r - 1)) / (n * (n - 1))), st("bb", "multiply", COND, [b / n, (b - 1) / (n - 1)], (b * (b - 1)) / (n * (n - 1))), st("either", "add", COND, [(r * (r - 1)) / (n * (n - 1)), (b * (b - 1)) / (n * (n - 1))], drawAns([r, b, mode]))], answer: drawAns([r, b, mode]) };
      const sec = mode === 0 ? r - 1 : b;
      return { steps: [st("first", "divide", COND, [r, n], r / n), st("second", "divide", COND, [sec, n - 1], sec / (n - 1)), st("both", "multiply", COND, [r / n, sec / (n - 1)], drawAns([r, b, mode]))], answer: drawAns([r, b, mode]) };
    },
    // independent: list every ordered pair of balls and count the favourable ones
    validate: ([r, b, mode], v) => {
      if (typeof v !== "number") return false;
      const balls = [...Array(r).fill("R"), ...Array(b).fill("B")];
      let all = 0;
      let fav = 0;
      for (let i = 0; i < balls.length; i++)
        for (let j = 0; j < balls.length; j++) {
          if (i === j && mode !== 3) continue;
          all++;
          const [x, y] = [balls[i], balls[j]];
          if (mode === 0 || mode === 3 ? x === "R" && y === "R" : mode === 1 ? x === "R" && y === "B" : x === y) fav++;
        }
      return near(fav / all, v);
    },
    bugs: ([r, b, mode]) => {
      const n = r + b;
      if (mode === 3)
        return keepBugs([
          { id: "without-for-with", kind: "procedural", competency: COND, says: "The second draw was treated as if the first ball stayed out; it was put back, so the bag is the same for both draws.", predict: (r * (r - 1)) / (n * (n - 1)) },
          { id: "added", kind: "conceptual", competency: COND, says: "The two probabilities were added; for 'first and second' they are multiplied.", predict: (2 * r) / n },
        ]);
      return keepBugs([
        { id: "with-replacement", kind: "conceptual", competency: COND, says: "The bag was treated as unchanged for the second draw; without replacement there is one ball fewer, so the second probability is out of " + (n - 1) + ".", predict: mode === 0 ? (r * r) / (n * n) : mode === 1 ? (r * b) / (n * n) : (r * r + b * b) / (n * n) },
        mode === 1 && { id: "either-order", kind: "procedural", competency: COND, says: "Both orders (red then blue, blue then red) were counted; the question fixes the order: red first.", predict: (2 * r * b) / (n * (n - 1)) },
        mode === 2 && { id: "one-colour-only", kind: "procedural", competency: COND, says: "Only both red was counted; both blue is the same colour too, so add its probability.", predict: (r * (r - 1)) / (n * (n - 1)) },
        mode === 0 && { id: "second-unchanged-red", kind: "procedural", competency: COND, says: `The number of red balls was not reduced for the second draw: after one red is taken, ${r - 1} red ${r - 1 === 1 ? "is" : "are"} left among ${n - 1}.`, predict: (r * r) / (n * (n - 1)) },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "first" ? `First draw: ${s.inputs[0]}/${s.inputs[1]}` : s.id === "second" ? `Second draw, given the first: ${s.inputs[0]}/${s.inputs[1]}` : s.id === "both" ? `Multiply: ${show(Number(s.inputs[0]))} × ${show(Number(s.inputs[1]))} = ${show(s.value)}` : s.id === "either" ? `Add the two ways: ${show(Number(s.inputs[0]))} + ${show(Number(s.inputs[1]))} = ${show(s.value)}` : `${show(Number(s.inputs[0]))} × ${show(Number(s.inputs[1]))} = ${show(s.value)}`),
    domain: D_DRAW,
    difficulty: ([, , mode]) => (mode === 3 ? 1 : mode === 2 ? 3 : 2),
    word: ([r, b, mode]) =>
      `A box has ${r} mango toffees and ${b} orange toffees. ${nameOf(r + b + mode)} takes one without looking${mode === 3 ? ", puts it back," : " and eats it,"} and then takes another. ` +
      (mode === 0 || mode === 3 ? `What is the probability that both are mango toffees?` : mode === 1 ? `What is the probability that the first is mango and the second is orange?` : `What is the probability that both are the same flavour?`) +
      ` (A fraction is fine.)`,
    teach: {
      idea: "The multiplication theorem: P(A ∩ B) = P(A) × P(B | A). Without replacement the second draw depends on the first: there is one ball fewer.",
      method: "Probability of the first draw times the probability of the second given the first; add the separate ways when more than one outcome counts.",
      alternatives: [
        { id: "tree", title: "A tree diagram", kind: "conceptual", text: ["Draw two branches for the first ball and, from each, two for the second with the new counts.", "Multiply along a path; add the paths that give the event."] },
      ],
    },
    limits: "Two draws from bags of up to 20 balls of two colours; three or more draws are left out.",
  },
  {
    id: "avvcmp",
    arity: 6,
    title: "Comparing the volumes of two boxes",
    competency: VOL,
    type: "choice",
    // [l1, w1, h1, l2, w2, h2]: two cuboids of 1 cm cubes
    parse: none,
    reject: gate(D_VC, K_VC, "Two cuboids with edges from 2 to 6 cubes."),
    choices: (p) => vcPerm(p).map((i) => VC_CHOICES[i]),
    // the two boxes side by side, edge lengths in cubes (one drawing of two solids would need a new picture type)
    figure: ([l1, w1, h1, l2, w2, h2]) => ({ type: "table", head: ["", "Long", "Wide", "High"], rows: [["Box A", `${l1} cubes`, `${w1} cubes`, `${h1} cubes`], ["Box B", `${l2} cubes`, `${w2} cubes`, `${h2} cubes`]] }),
    prompt: ([l1, w1, h1, l2, w2, h2]) => `Box A is built from 1 cm cubes: ${l1} long, ${w1} wide and ${h1} high. Box B is built from 1 cm cubes: ${l2} long, ${w2} wide and ${h2} high (the table in the picture shows both). Which is true?`,
    solve: (p) => {
      const [l1, w1, h1, l2, w2, h2] = p;
      return { steps: [st("a", "multiply", VOL, [l1, w1, h1], l1 * w1 * h1), st("b", "multiply", VOL, [l2, w2, h2], l2 * w2 * h2), st("compare", "compare", VOL, [l1 * w1 * h1, l2 * w2 * h2], VC_CHOICES[vcRight(p)])], answer: vcPerm(p).indexOf(vcRight(p)) };
    },
    // independent: count every cube of each box
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const count = (l: number, w: number, h: number) => {
        let n = 0;
        for (let i = 0; i < l; i++) for (let j = 0; j < w; j++) for (let k = 0; k < h; k++) n++;
        return n;
      };
      const [A, B] = [count(p[0], p[1], p[2]), count(p[3], p[4], p[5])];
      return vcPerm(p)[v] === (A > B ? 0 : A < B ? 1 : 2);
    },
    bugs: (p) => {
      const [l1, w1, h1, l2, w2, h2] = p;
      const pr = vcPerm(p);
      const right = vcRight(p);
      const bySum = l1 + w1 + h1 > l2 + w2 + h2 ? 0 : l1 + w1 + h1 < l2 + w2 + h2 ? 1 : 2;
      const byH = h1 > h2 ? 0 : h1 < h2 ? 1 : 2;
      return keepBugs([
        bySum !== right && { id: "added-edges", kind: "conceptual", competency: VOL, says: "The lengths of the edges were added and compared; volume counts the cubes, which is length × width × height.", predict: pr.indexOf(bySum) },
        byH !== right && byH !== bySum && { id: "taller-is-bigger", kind: "conceptual", competency: VOL, says: "The taller box was taken to be the bigger one; a shorter box can hold more if it is longer or wider.", predict: pr.indexOf(byH) },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "compare" ? String(s.value) : `Box ${s.id === "a" ? "A" : "B"}: ${s.inputs.join(" × ")} = ${s.value} cubes`),
    domain: D_VC,
    keep: K_VC,
    cap: 360,
    difficulty: (p) => (vcRight(p) === 2 ? 3 : Math.abs(p[0] * p[1] * p[2] - p[3] * p[4] * p[5]) <= 6 ? 2 : 1),
    word: ([l1, w1, h1, l2, w2, h2]) => `Two shops pack sugar cubes in boxes. Box A holds the cubes in ${h1} layers, each ${l1} cubes long and ${w1} cubes wide. Box B holds them in ${h2} layers, each ${l2} cubes long and ${w2} cubes wide. Which is true?`,
    teach: {
      idea: "The volume of a box made of unit cubes is how many cubes it holds: length × width × height, not how big its edges look.",
      method: "Work out the number of cubes in each box (one layer × the number of layers) and compare the two numbers.",
      visual: ([l1, w1, h1]) => ({ type: "solid", name: "cuboid", dims: [`${l1} cubes long`, `${w1} cubes wide`, `${h1} cubes high`] }),
      alternatives: [
        { id: "layers", title: "Compare layer by layer", kind: "conceptual", text: ["Count the cubes in one layer of each box (length × width).", "Multiply by the number of layers, then compare."] },
      ],
    },
    limits: "Two cuboids with edges of 2 to 6 cubes; comparing irregular solids is left to hands-on work with cubes.",
  },
  {
    id: "avfence",
    arity: 3,
    title: "The cost of fencing a rectangle",
    competency: RP,
    type: "integer",
    mc: true,
    // [l, w, k]: a rectangle l m by w m; fencing costs ₹5k per metre
    parse: none,
    reject: gate(D_FENCE, K_FENCE, "Rectangles up to 40 m by 30 m, fencing at ₹5 to ₹50 per metre."),
    prompt: ([l, w, k]) => `A rectangular garden is ${l} m long and ${w} m wide. Fencing costs ₹${5 * k} per metre. What does it cost to fence the garden all the way round, in rupees?`,
    figure: ([l, w]) => ({ type: "shape", kind: "rectangle", lengths: [`${l} m`, `${w} m`, `${l} m`, `${w} m`] }),
    solve: ([l, w, k]) => ({ steps: [st("pair", "add", ADD, [l, w], l + w), st("perimeter", "multiply", RP, [2, l + w], 2 * (l + w)), st("cost", "multiply", MM, [2 * (l + w), 5 * k], 10 * k * (l + w))], answer: 10 * k * (l + w) }),
    // independent: walk round the edge one metre at a time, paying for each metre
    validate: ([l, w, k], v) => {
      let cost = 0;
      for (const side of [l, w, l, w]) for (let i = 0; i < side; i++) cost += 5 * k;
      return v === cost;
    },
    bugs: ([l, w, k]) => [
      { id: "area-for-perimeter", kind: "conceptual", competency: RP, says: "The area was used; a fence goes round the edge, so it is the perimeter that is paid for.", predict: l * w * 5 * k },
      { id: "two-sides-only", kind: "procedural", competency: RP, says: "Only one length and one width were fenced; a rectangle has two of each.", predict: (l + w) * 5 * k },
      { id: "perimeter-only", kind: "procedural", competency: RP, says: `The length of fencing (${2 * (l + w)} m) was given; each metre costs ₹${5 * k}.`, predict: 2 * (l + w) },
    ],
    variants: () => [],
    explain: (s) => (s.id === "pair" ? `One length and one width: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value} m` : s.id === "perimeter" ? `Perimeter: 2 × ${s.inputs[1]} = ${s.value} m` : `${s.inputs[0]} m × ₹${s.inputs[1]} = ₹${s.value}`),
    domain: D_FENCE,
    keep: K_FENCE,
    cap: 400,
    difficulty: ([l, w, k]) => (l + w <= 30 && k % 2 === 0 ? 1 : l + w <= 50 ? 2 : 3),
    word: ([l, w, k]) =>
      l >= 20
        ? `A school playground is a rectangle ${l} m long and ${w} m wide. A white line is painted all the way round its edge, and painting costs ₹${5 * k} for each metre. What does the painting cost, in rupees?`
        : `A flower bed in a park is a rectangle ${l} m long and ${w} m wide. A border of bricks is laid all the way round its edge, and the border costs ₹${5 * k} for each metre. What does the border cost, in rupees?`,
    teach: {
      idea: "A fence (or a border) runs along the edge, so its length is the perimeter; the cost is that length times the price of one metre.",
      method: "Perimeter = 2 × (length + width); then multiply by the cost per metre.",
      alternatives: [
        { id: "walk", title: "Walk round the edge", kind: "conceptual", text: ["Imagine walking round the garden: along a length, a width, a length and a width.", "Add those four sides to get the metres of fence, then pay for each metre."] },
      ],
    },
    limits: "Whole-metre rectangles up to 40 m by 30 m, with rates in multiples of ₹5; irregular plots are left out.",
  },
];

/** Two explanations never predict the same answer, and none predicts an answer the family's own check accepts: a
 * value already predicted by an earlier explanation is dropped from a later one (and an explanation left with no
 * prediction is dropped). */
const key = (v: Value) => JSON.stringify(typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v);
const distinctBugs = (d: Def): Def => ({
  ...d,
  bugs: (p) => {
    const seen = new Set<string>();
    const out: Bug[] = [];
    for (const b of d.bugs(p)) {
      if (b.predict === null) continue;
      const many = d.type !== "set" && Array.isArray(b.predict);
      const vals: Value[] = many ? (b.predict as number[]) : [b.predict];
      const kept = vals.filter((v) => !(typeof v === "number" && !Number.isFinite(v)) && !d.validate(p, v) && !seen.has(key(v)));
      kept.forEach((v) => seen.add(key(v)));
      if (!kept.length) continue;
      out.push({ ...b, predict: many ? (kept.length === 1 ? kept[0] : (kept as number[])) : kept[0] });
    }
    return out;
  },
});

export const B22: Def[] = [...P1, ...P2, ...P3].map(distinctBugs);
