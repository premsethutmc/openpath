/**
 * Batch b03 (families@2), Grades 1–3: mental arithmetic with tens and hundreds, number lines, equal sharing,
 * subtraction with regrouping, halves and quarters, choosing an operation for a story, pictographs, balancing
 * number sentences, missing numbers, growing patterns, line segments, tiling, elapsed time, metres and centimetres,
 * rupees and paise. Written by OpenPath; CC0.
 */
import type { Bug, Def, Visual } from "../family-kit";
import { factSlip } from "../family-kit";

const MENTAL = "MATH.number.mental-arithmetic";
const NL = "MATH.number.number-line";
const SHARE = "MATH.number.sharing";
const SUBR = "MATH.number.subtraction-regroup";
const FRAC = "MATH.number.unit-fractions";
const OPC = "MATH.reasoning.operation-choice";
const PIC = "MATH.statistics.pictographs";
const EQ = "MATH.algebra.equality-inequality";
const GROW = "MATH.algebra.growing-patterns";
const MISS = "MATH.algebra.missing-number";
const LINES = "MATH.geometry.lines-segments";
const TILE = "MATH.geometry.shape-tiling";
const TIME = "MATH.measurement.elapsed-time";
const LEN = "MATH.measurement.length-conversion";
const MONEY = "MATH.measurement.money-decimals";
const PV = "MATH.number.place-value-tens";
const ADD = "MATH.number.addition";
const SUB = "MATH.number.subtraction";
const CLOCK = "MATH.measurement.clock";
const GROUPS = "MATH.number.equal-groups";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Selvi", "Divya", "Imran", "Karthik", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const GIRLS = ["Anu", "Meena", "Kavya", "Selvi", "Divya", "Priya"];
const BOYS = ["Ravi", "Arjun", "Imran", "Karthik"];
const girl = (k: number) => GIRLS[((k % GIRLS.length) + GIRLS.length) % GIRLS.length];
const boy = (k: number) => BOYS[((k % BOYS.length) + BOYS.length) % BOYS.length];
const ITEMS = ["mangoes", "marbles", "pencils", "sweets", "stickers", "flowers"];
/** n with a noun, singular for 1 ("1 tile", "3 tiles"). */
const nn = (n: unknown, one: string, many: string) => `${n} ${Number(n) === 1 ? one : many}`;
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const digitsOf = (n: number, len: number) => Array.from({ length: len }, (_, i) => Math.floor(n / 10 ** i) % 10);
const fromDigits = (d: number[]) => d.reduce((s, x, i) => s + x * 10 ** i, 0);
/** Column subtraction, each column alone: the smaller digit taken from the larger (a common slip). */
const smallerFromLarger = (a: number, b: number) => {
  const da = digitsOf(a, 3);
  const db = digitsOf(b, 3);
  return fromDigits(da.map((x, i) => Math.abs(x - db[i])));
};
/** Column subtraction where a ten (or hundred) is exchanged for ones (regrouped) but the column it came from is not made one less. */
const borrowNoDecrease = (a: number, b: number) => {
  const da = digitsOf(a, 3);
  const db = digitsOf(b, 3);
  return fromDigits(da.map((x, i) => (x < db[i] ? x + 10 - db[i] : x - db[i])));
};
/** A rectangle split into a tens part and a ones part (an area model), as a table: the parts' products filled in when
 * `done`, else written as the multiplications to do. */
const areaModel = (a: number, b: number, done: boolean): Visual => {
  const t = Math.floor(a / 10) * 10;
  const o = a % 10;
  return { type: "table", title: `${a} × ${b}: a rectangle split into ${t} and ${o}`, head: ["×", String(t), String(o)], rows: [[b, done ? t * b : `${t} × ${b}`, done ? o * b : `${o} × ${b}`]] };
};
const money = (paise: number) => `${Math.floor(paise / 100)}.${pad2(paise % 100)}`;
const paiseOf = (v: number | number[] | string) => Math.round(Number(String(v).replace(/[₹\s]/g, "")) * 100);

export const B03: Def[] = [
  // ------------------------------------------------------------------ mental arithmetic
  {
    id: "acaddten",
    arity: 4,
    title: "Adding and taking away tens or hundreds in your head",
    competency: MENTAL,
    type: "integer",
    mc: true,
    // [a, k, u, op]: a + k tens (u = 0) or k hundreds (u = 1); op = 1 takes away
    parse: none,
    reject: ([a, k, u, op]) => {
      const r = a + (op ? -1 : 1) * k * (u ? 100 : 10);
      return a < 11 || a > 899 || a % 10 === 0 || k < 1 || k > 9 || (u !== 0 && u !== 1) || (op !== 0 && op !== 1) || r < 1 || r > 999 ? "A 2- or 3-digit number plus or minus a few tens or hundreds, staying between 1 and 999." : null;
    },
    prompt: ([a, k, u, op]) => `Work it out in your head: ${a} ${op ? "−" : "+"} ${k * (u ? 100 : 10)} = ?`,
    solve: ([a, k, u, op]) => {
      const P = u ? 100 : 10;
      const r = a + (op ? -1 : 1) * k * P;
      return {
        steps: [
          { id: "place", op: "identify", competency: PV, inputs: [k * P, u ? "hundreds" : "tens"], value: k },
          { id: "change", op: op ? "subtract" : "add", competency: MENTAL, inputs: [a, k, u ? "hundreds" : "tens", op ? "−" : "+"], value: r },
        ],
        answer: r,
      };
    },
    // independent: count on (or back) in tens or hundreds, one jump at a time
    validate: ([a, k, u, op], v) => {
      let s = a;
      for (let i = 0; i < k; i++) s += (op ? -1 : 1) * (u ? 100 : 10);
      return v === s;
    },
    bugs: ([a, k, u, op]) => {
      const P = u ? 100 : 10;
      const sg = op ? -1 : 1;
      const r = a + sg * k * P;
      const d = Math.floor(a / P) % 10;
      const crosses = op ? d < k : d + k > 9;
      const out: Bug[] = [
        { id: "changed-ones", kind: "conceptual", competency: PV, says: `${k * P} was treated as ${k} ones. ${k * P} is ${k} ${u ? "hundreds" : "tens"}, so the ${u ? "hundreds" : "tens"} digit changes, not the ones.`, predict: a + sg * k },
      ];
      const other = u ? 10 : 100;
      const w = a + sg * k * other;
      if (w >= 0 && w <= 9999) out.push({ id: "wrong-place", kind: "procedural", competency: PV, says: `The ${u ? "tens" : "hundreds"} digit was changed instead of the ${u ? "hundreds" : "tens"} digit.`, predict: w });
      if (crosses && !op) out.push({ id: "no-carry", kind: "procedural", competency: PV, says: `The ${u ? "hundreds" : "tens"} went past 9 but the extra ${u ? "thousand" : "hundred"} was not carried on.`, predict: a - d * P + ((d + k) % 10) * P });
      if (crosses && op) out.push({ id: "smaller-from-larger", kind: "procedural", competency: SUB, says: `There were not enough ${u ? "hundreds" : "tens"}, so ${d} was taken from ${k} instead. Break one ${u ? "thousand" : "hundred"} into ten ${u ? "hundreds" : "tens"} first.`, predict: a - d * P + (k - d) * P });
      return out.filter((b) => b.predict !== r);
    },
    variants: () => [],
    explain: (s) => (s.id === "place" ? `${s.inputs[0]} is ${s.value} ${s.inputs[1]}` : `Count ${s.inputs[3] === "−" ? "back" : "on"} ${s.inputs[1]} ${s.inputs[2]} from ${s.inputs[0]}: ${s.value}`),
    domain: [[11, 899], [1, 9], [0, 1], [0, 1]],
    cap: 400,
    difficulty: ([a, k, u, op]) => {
      const P = u ? 100 : 10;
      const d = Math.floor(a / P) % 10;
      const crosses = op ? d < k : d + k > 9;
      return crosses ? 3 : a < 100 ? 1 : 2;
    },
    figure: ([a]) => ({ type: "blocks", hundreds: Math.floor(a / 100), tens: Math.floor(a / 10) % 10, ones: a % 10 }),
    word: ([a, k, u, op]) => (op ? `${girl(a)} has ₹${a}. She spends ₹${k * (u ? 100 : 10)} on a book. How many rupees are left?` : `${girl(a)} has ₹${a}. Her uncle gives her ₹${k * (u ? 100 : 10)} more. How many rupees does she have now?`),
    teach: {
      idea: "Adding tens changes the tens digit; adding hundreds changes the hundreds digit. The ones stay the same.",
      method: "Say how many tens (or hundreds) you are adding, then count on (or back) that many tens (or hundreds) from the number.",
      visual: ([a]) => ({ type: "blocks", hundreds: Math.floor(a / 100), tens: Math.floor(a / 10) % 10, ones: a % 10 }),
      alternatives: [
        {
          id: "jumps",
          title: "Jump along a number line",
          kind: "conceptual",
          text: ["Start at the first number.", "Make one jump of ten (or a hundred) for each ten (or hundred) you add, and say each new number."],
          visual: ([a, k, u, op]) => {
            const P = u ? 100 : 10;
            const r = a + (op ? -1 : 1) * k * P;
            const lo = Math.min(a, r);
            return { type: "numberline", from: lo, to: lo + k * P, step: P, jumps: Array.from({ length: k }, (_, i) => (op ? [a - i * P, a - (i + 1) * P] : [a + i * P, a + (i + 1) * P])) };
          },
        },
      ],
    },
    limits: "Numbers up to 999 with a few tens or hundreds added or taken away; mixed amounts like + 230 are not included.",
  },
  {
    id: "acpart",
    arity: 2,
    title: "Multiplying in your head by splitting into tens and ones",
    competency: MENTAL,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d{2})[x×*](\d)=?\??$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([a, b]) => (a < 11 || a > 99 || a % 10 === 0 || b < 2 || b > 9 || a * b > 500 ? "A two-digit number (not a multiple of 10) times 2 to 9, product up to 500." : null),
    prompt: ([a, b]) => `Work it out in your head by splitting ${a} into tens and ones: ${a} × ${b} = ?`,
    solve: ([a, b]) => {
      const t = Math.floor(a / 10) * 10;
      const o = a % 10;
      return {
        steps: [
          { id: "split", op: "split", competency: PV, inputs: [a, t, o], value: a },
          { id: "tens", op: "multiply", competency: "MATH.number.multiplication-tables", inputs: [t, b], value: t * b },
          { id: "ones", op: "multiply", competency: "MATH.number.multiplication-tables", inputs: [o, b], value: o * b },
          { id: "add", op: "add", competency: MENTAL, inputs: [t * b, o * b], value: a * b },
        ],
        answer: a * b,
      };
    },
    // independent: repeated addition, b copies of a
    validate: ([a, b], v) => {
      let s = 0;
      for (let i = 0; i < b; i++) s += a;
      return v === s;
    },
    bugs: ([a, b]) => {
      const t = Math.floor(a / 10);
      const o = a % 10;
      const out: Bug[] = [
        { id: "ones-not-multiplied", kind: "conceptual", competency: MENTAL, says: `Only the tens were multiplied (${t * 10} × ${b}); the ${o} ones must be multiplied by ${b} too.`, predict: t * 10 * b + o },
        { id: "tens-as-ones", kind: "conceptual", competency: PV, says: `The tens digit ${t} was multiplied as if it were ${t} ones; it stands for ${t * 10}.`, predict: t * b + o * b },
      ];
      if (o >= 2) out.push(factSlip(o, b, 1, t * 10 * b));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "split" ? `${s.inputs[0]} = ${s.inputs[1]} + ${s.inputs[2]}` : s.id === "add" ? `Add the parts: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[11, 99], [2, 9]],
    cap: 300,
    difficulty: ([a, b]) => (a < 30 && b <= 5 ? 1 : a * b <= 250 ? 2 : 3),
    figure: ([a, b]) => areaModel(a, b, false),
    word: ([a, b]) => `A box holds ${a} crayons. ${name(a + b)} buys ${b} boxes. How many crayons is that?`,
    teach: {
      idea: `Splitting a number into tens and ones lets you multiply each part separately and add: 23 × 4 = 20 × 4 + 3 × 4.`,
      method: "Split the two-digit number into tens and ones. Multiply the tens, multiply the ones, then add the two answers.",
      visual: ([a, b]) => areaModel(a, b, true),
      alternatives: [
        { id: "double", title: "Double and double again", kind: "procedural", text: ["For × 2 double the number; for × 4 double it twice; for × 8 double it three times.", "For × 5, multiply by 10 and halve."] },
      ],
    },
    limits: "Two-digit times one-digit numbers, products up to 500; larger mental products are other families.",
  },
  // ------------------------------------------------------------------ number line
  {
    id: "acnlpos",
    arity: 3,
    title: "Finding a number on a number line",
    competency: NL,
    type: "integer",
    mc: true,
    // [si, fk, i]: step S = [2, 5, 10, 50, 100][si], line from F = fk × 10 × S to F + 10S, ? at the i-th tick
    parse: none,
    reject: ([si, fk, i]) => (si < 0 || si > 4 || fk < 0 || fk > 9 || i < 1 || i > 9 ? "A number line with ten equal steps of 2, 5, 10, 50 or 100." : null),
    prompt: () => "The marks on the number line in the picture are equally spaced. What number goes where the ? is?",
    solve: ([si, fk, i]) => {
      const S = [2, 5, 10, 50, 100][si];
      const F = fk * 10 * S;
      return {
        steps: [
          { id: "step", op: "find step", competency: NL, inputs: [F, F + S], value: S },
          { id: "count", op: "count on", competency: NL, inputs: [F, S, i], value: F + i * S },
        ],
        answer: F + i * S,
      };
    },
    // independent: walk along the ticks from the left end, checking the value lands on the ?-tick
    validate: ([si, fk, i], v) => {
      const S = [2, 5, 10, 50, 100][si];
      const F = fk * 10 * S;
      let x = F;
      let n = 0;
      while (x < v && n < 20) {
        x += S;
        n++;
      }
      return x === v && n === i;
    },
    bugs: ([si, fk, i]) => {
      const S = [2, 5, 10, 50, 100][si];
      const prev = fk * 10 * S + (i - 1) * S;
      return [
        { id: "count-by-ones", kind: "conceptual", competency: NL, says: `Each gap was counted as 1, but the marks go up by ${S} each time.`, predict: prev + 1 },
        ...(S !== 10 ? [{ id: "count-by-tens", kind: "conceptual", competency: NL, says: `Each gap was counted as 10, but the marks go up by ${S}. Look at two labelled marks next to each other to find the step.`, predict: prev + 10 } as Bug] : []),
      ];
    },
    distractors: ([si, fk, i]) => {
      const S = [2, 5, 10, 50, 100][si];
      const v = fk * 10 * S + i * S;
      return [v + S, v - S];
    },
    variants: () => [],
    explain: (s) => (s.id === "step" ? `From ${s.inputs[0]} to ${s.inputs[1]} is one step of ${s.value}` : `Count on in ${s.inputs[1]}s from ${s.inputs[0]}, ${s.inputs[2]} steps: ${s.value}`),
    domain: [[0, 4], [0, 9], [1, 9]],
    cap: 300,
    difficulty: ([si]) => (si <= 1 ? 1 : si === 2 ? 2 : 3),
    figure: ([si, fk, i]) => {
      const S = [2, 5, 10, 50, 100][si];
      const F = fk * 10 * S;
      return { type: "numberline", from: F, to: F + 10 * S, step: S, unknown: F + i * S };
    },
    word: ([si, fk, i]) => {
      const S = [2, 5, 10, 50, 100][si];
      const F = fk * 10 * S;
      return `Stones along a road are placed ${S} metres apart. The first stone says ${F} m, the next says ${F + S} m, and so on. What does the stone ${i} places after the first one say?`;
    },
    teach: {
      idea: "On a number line the marks are equally spaced, so every gap is worth the same amount.",
      method: "Find the step from two labelled marks next to each other, then count on in that step to the ?.",
      visual: ([si, fk, i]) => {
        const S = [2, 5, 10, 50, 100][si];
        const F = fk * 10 * S;
        return { type: "numberline", from: F, to: F + 10 * S, step: S, jumps: Array.from({ length: i }, (_, k) => [F + k * S, F + (k + 1) * S]) };
      },
      alternatives: [
        { id: "skip_count", title: "Skip count aloud", kind: "procedural", text: ["Say the first number, then keep adding the step: for steps of 5, say 35, 40, 45 …", "Touch one mark for each number you say until you reach the ?."] },
      ],
    },
    limits: "Number lines with ten equal steps of 2, 5, 10, 50 or 100 up to 10 000; unlabelled lines and estimating between marks are not included.",
  },
  {
    id: "acnljump",
    arity: 4,
    title: "Counting on and back in jumps on a number line",
    competency: NL,
    type: "integer",
    mc: true,
    // [si, a, k, dir]: start at a, k jumps of s = [1, 2, 5, 10][si], forward (dir 0) or back (dir 1)
    parse: none,
    reject: ([si, a, k, dir]) => {
      const s = [1, 2, 5, 10][si];
      const r = a + (dir ? -1 : 1) * k * s;
      return si < 0 || si > 3 || a < 0 || a > 100 || k < 2 || k > 6 || (dir !== 0 && dir !== 1) || r < 0 || r > 150 ? "Two to six jumps of 1, 2, 5 or 10 from a number up to 100, landing between 0 and 150." : null;
    },
    prompt: ([si, a, k, dir]) => `Start at ${a} on the number line. Make ${k} jumps of ${[1, 2, 5, 10][si]} ${dir ? "back" : "forward"}. Where do you land?`,
    solve: ([si, a, k, dir]) => {
      const s = [1, 2, 5, 10][si];
      return {
        steps: [
          { id: "total", op: "multiply", competency: GROUPS, inputs: [k, s], value: k * s },
          { id: "move", op: dir ? "count back" : "count on", competency: NL, inputs: [a, k * s, dir ? "back" : "on"], value: a + (dir ? -1 : 1) * k * s },
        ],
        answer: a + (dir ? -1 : 1) * k * s,
      };
    },
    // independent: one jump at a time
    validate: ([si, a, k, dir], v) => {
      let x = a;
      for (let i = 0; i < k; i++) x += (dir ? -1 : 1) * [1, 2, 5, 10][si];
      return v === x;
    },
    bugs: ([si, a, k, dir]) => {
      const s = [1, 2, 5, 10][si];
      const g = dir ? -1 : 1;
      const out: Bug[] = [
        { id: "count-start", kind: "procedural", competency: NL, says: "The starting number was counted as the first jump. A jump starts at the number and ends at the next one.", predict: a + g * (k - 1) * s },
        { id: "extra-jump", kind: "procedural", competency: NL, says: "One jump too many was made. Count the jumps as you make them.", predict: a + g * (k + 1) * s },
      ];
      if (s > 1) out.push({ id: "jumps-of-one", kind: "conceptual", competency: NL, says: `Each jump was taken as 1, but each jump is ${s}.`, predict: a + g * k });
      const w = a - g * k * s;
      if (w >= 0) out.push({ id: "wrong-way", kind: "procedural", competency: NL, says: `The jumps went the wrong way: ${dir ? "back means to smaller numbers" : "forward means to bigger numbers"}.`, predict: w });
      return out.filter((b) => (b.predict as number) >= 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs[0]} jumps of ${s.inputs[1]} make ${s.value}` : `Count ${s.inputs[2]} ${s.inputs[1]} from ${s.inputs[0]}: ${s.value}`),
    domain: [[0, 3], [0, 100], [2, 6], [0, 1]],
    cap: 300,
    difficulty: ([si, , k, dir]) => (si === 0 || (si === 3 && !dir && k <= 3) ? 1 : dir ? 3 : 2),
    figure: ([si, a, k, dir]) => {
      const s = [1, 2, 5, 10][si];
      const lo = dir ? a - k * s : a;
      const from = lo - s * Math.min(2, Math.floor(lo / s));
      return { type: "numberline", from, to: lo + (k + 2) * s, step: s, marks: [a] };
    },
    word: ([si, a, k, dir]) => {
      const s = [1, 2, 5, 10][si];
      return dir ? `A frog sits on stone number ${a}. It hops back ${s} ${s === 1 ? "stone" : "stones"} at a time, ${k} times. On which stone number does it land?` : `A frog sits on stone number ${a}. It hops forward ${s} ${s === 1 ? "stone" : "stones"} at a time, ${k} times. On which stone number does it land?`;
    },
    teach: {
      idea: "Each jump moves the same amount along the line: forward to bigger numbers, back to smaller numbers.",
      method: "Put your finger on the start. Make one jump at a time, saying the new number each time, and count the jumps.",
      visual: ([si, a, k, dir]) => {
        const s = [1, 2, 5, 10][si];
        const g = dir ? -1 : 1;
        const lo = dir ? a - k * s : a;
        return { type: "numberline", from: lo, to: lo + k * s, step: s, jumps: Array.from({ length: k }, (_, i) => [a + g * i * s, a + g * (i + 1) * s]) };
      },
      alternatives: [
        { id: "total_first", title: "Find the total jump first", kind: "procedural", text: ["k jumps of s are k × s altogether.", "Add (or take away) that total in one go, then check by jumping."] },
      ],
    },
    limits: "Two to six equal jumps of 1, 2, 5 or 10 within 0 to 150; mixed jumps are not included.",
  },
  {
    id: "acnlbetween",
    arity: 2,
    title: "How many whole numbers lie between two numbers",
    competency: NL,
    type: "integer",
    mc: true,
    // [a, d]: whole numbers strictly between a and a + d
    parse: none,
    reject: ([a, d]) => (a < 10 || a > 9990 || d < 2 || d > 15 ? "Two numbers from 10 to 10 005 that are 2 to 15 apart." : null),
    keep: ([a, d]) => (a < 100 ? true : a < 1000 ? a % 7 === 0 : a % 37 === 0 && d <= 10),
    prompt: ([a, d]) => `How many whole numbers are there between ${a} and ${a + d}? (Do not count ${a} or ${a + d}.)`,
    solve: ([a, d]) => ({
      steps: [
        { id: "gap", op: "subtract", competency: SUB, inputs: [a + d, a], value: d },
        { id: "inside", op: "subtract", competency: NL, inputs: [d, 1], value: d - 1 },
      ],
      answer: d - 1,
    }),
    // independent: list the numbers after a and before a + d, one by one
    validate: ([a, d], v) => {
      let c = 0;
      for (let x = a + 1; x < a + d; x++) c++;
      return v === c;
    },
    bugs: ([a, d]) => [
      { id: "difference", kind: "conceptual", competency: NL, says: `${a + d} − ${a} = ${d} counts the jumps from ${a} to ${a + d}, not the numbers in between. There is one fewer number between them than jumps.`, predict: d },
      { id: "both-ends", kind: "procedural", competency: NL, says: `${a} and ${a + d} were counted too; "between" leaves out both ends.`, predict: d + 1 },
    ],
    variants: () => [],
    explain: (s) => (s.id === "gap" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} jumps` : `The numbers between are one fewer than the jumps: ${s.inputs[0]} − 1 = ${s.value}`),
    domain: [[10, 9990], [2, 15]],
    cap: 300,
    difficulty: ([a]) => (a < 100 ? 1 : a < 1000 ? 2 : 3),
    figure: ([a, d]) => ({ type: "numberline", from: a, to: a + d, step: 1, marks: [a, a + d] }),
    word: ([a, d]) => `Houses on a street are numbered in order. ${name(a)} lives at number ${a} and ${name(a + 3)} lives at number ${a + d}, on the same side. How many houses are there between their two houses?`,
    teach: {
      idea: "The numbers between two numbers leave out both end numbers.",
      method: "Find the difference (the number of jumps), then take away 1: that is how many numbers sit strictly between.",
      visual: ([a, d]) => ({ type: "numberline", from: a, to: a + d, step: 1, marks: Array.from({ length: d - 1 }, (_, i) => a + 1 + i) }),
      alternatives: [
        { id: "small_case", title: "Try a small case", kind: "conceptual", text: ["Between 5 and 8 are 6 and 7: two numbers, although 8 − 5 = 3.", "So the count between is always one less than the difference."] },
      ],
    },
    limits: "Two numbers up to 10 005 that are at most 15 apart, so the count can be checked on the line; larger gaps are not included.",
  },
  // ------------------------------------------------------------------ sharing
  {
    id: "acshare",
    arity: 4,
    title: "Sharing equally and making equal groups",
    competency: SHARE,
    type: "integer",
    mc: true,
    // [k, q, t, g]: n = k × q objects; g = 0 shared among k children; g = 1 put in groups of k
    parse: none,
    reject: ([k, q, t, g]) => (k < 2 || k > 5 || q < 1 || q > 10 || t < 0 || t >= ITEMS.length || (g !== 0 && g !== 1) ? "Up to 50 objects shared among 2 to 5, or grouped in 2s to 5s." : null),
    keep: ([, q]) => q >= 2,
    prompt: ([k, q, t, g]) => (g ? `Put the ${k * q} ${ITEMS[t]} in the picture into groups of ${k}. How many groups are there?` : `The ${k * q} ${ITEMS[t]} in the picture are shared equally among ${k} children. How many does each child get?`),
    solve: ([k, q, t, g]) => ({
      steps: [
        { id: "total", op: "count", competency: "MATH.number.count-objects", inputs: [k * q, ITEMS[t]], value: k * q },
        { id: "share", op: g ? "group" : "share", competency: SHARE, inputs: [k * q, k], value: q },
        { id: "check", op: "multiply", competency: GROUPS, inputs: [k, q], value: k * q },
      ],
      answer: q,
    }),
    // independent: repeated subtraction — take k away until nothing is left, counting the takes
    validate: ([k, q], v) => {
      let n = k * q;
      let c = 0;
      while (n >= k) {
        n -= k;
        c++;
      }
      return n === 0 && v === c;
    },
    bugs: ([k, q, , g]) => [
      { id: "took-away-once", kind: "conceptual", competency: SHARE, says: `${k} was taken away once. Sharing keeps giving out until none are left: count how many each gets (or how many groups you make).`, predict: k * q - k },
      { id: "gave-divisor", kind: "conceptual", competency: SHARE, says: g ? `The answer given was the size of each group (${k}); the question asks how many groups.` : `The answer given was the number of children (${k}); the question asks how many each child gets.`, predict: k },
      { id: "gave-total", kind: "procedural", competency: SHARE, says: "The answer given was the total number of objects; the total has to be split up.", predict: k * q },
    ],
    variants: () => [],
    explain: (s) => (s.id === "total" ? `There are ${s.value} ${s.inputs[1]}` : s.id === "share" ? `${s.inputs[0]} shared into ${s.inputs[1]} equal parts gives ${s.value}` : `Check: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[2, 5], [1, 10], [0, 5], [0, 1]],
    cap: 300,
    difficulty: ([k, q]) => (k * q <= 12 ? 1 : k * q <= 30 ? 2 : 3),
    figure: ([k, q]) => ({ type: "dots", count: k * q, rows: Math.ceil((k * q) / 10) }),
    word: ([k, q, t, g]) => (g ? `${k * q} children are in a playground. The teacher makes teams of ${k}. How many teams are there?` : `${name(q + t)} has ${k * q} ${ITEMS[t]} and gives the same number to each of ${k} friends, with none left over. How many does each friend get?`),
    teach: {
      idea: "Sharing equally means every share has the same number and nothing is left over.",
      method: "Deal the objects out one at a time to each share (or make groups of the given size) and count one share (or the groups).",
      visual: ([k, q]) => ({ type: "array", rows: k, cols: q }),
      alternatives: [
        { id: "times_fact", title: "Use a times fact", kind: "conceptual", text: ["Ask: what number times the number of shares gives the total?", "For 15 shared among 3, 3 × 5 = 15, so each gets 5."], visual: ([k, q]) => ({ type: "array", rows: k, cols: q }) },
      ],
    },
    limits: "Up to 50 objects with no remainder, shared among 2 to 5 or grouped in 2s to 5s; remainders are another family.",
  },
  // ------------------------------------------------------------------ subtraction with regrouping
  {
    id: "acsub2",
    arity: 2,
    title: "Subtracting two-digit numbers with regrouping",
    competency: SUBR,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").replace(/−/g, "-").match(/^(\d{2})-(\d{2})=?\??$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([a, b]) => (a < 20 || a > 99 || b < 10 || b > 98 || b >= a || a % 10 >= b % 10 ? "Two-digit subtraction that needs a ten broken into ones." : null),
    prompt: ([a, b]) => `${a} − ${b} = ?`,
    solve: ([a, b]) => {
      const ta = Math.floor(a / 10);
      const oa = a % 10;
      const tb = Math.floor(b / 10);
      const ob = b % 10;
      return {
        steps: [
          { id: "regroup", op: "regroup", competency: PV, inputs: [ta, oa], value: oa + 10 },
          { id: "ones", op: "subtract", competency: SUB, inputs: [oa + 10, ob], value: oa + 10 - ob },
          { id: "tens", op: "subtract", competency: SUBR, inputs: [ta - 1, tb], value: ta - 1 - tb },
        ],
        answer: a - b,
      };
    },
    // independent: count up from b to a (the inverse: b + answer = a)
    validate: ([a, b], v) => {
      if (typeof v !== "number" || v < 0) return false;
      let x = b;
      for (let i = 0; i < v; i++) x++;
      return x === a;
    },
    bugs: ([a, b]) => [
      { id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: `In the ones, ${b % 10} − ${a % 10} was worked out instead of ${a % 10} − ${b % 10}. When the top digit is smaller, break a ten into 10 ones first.`, predict: smallerFromLarger(a, b) },
      { id: "tens-not-reduced", kind: "procedural", competency: SUBR, says: "A ten was broken into ones, but the tens digit was not made one less.", predict: borrowNoDecrease(a, b) },
      { id: "fact-slip-sub", kind: "recall", competency: SUB, says: `A take-away fact (${(a % 10) + 10} − ${b % 10}) is not yet reliable.`, predict: [a - b - 1, a - b + 1] },
    ],
    variants: () => [],
    explain: (s) => (s.id === "regroup" ? `Break 1 ten into 10 ones: ${nn(s.inputs[1], "one becomes", "ones become")} ${s.value} ones, ${nn(s.inputs[0], "ten becomes", "tens become")} ${Number(s.inputs[0]) - 1}` : s.id === "ones" ? `Ones: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `Tens: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[20, 99], [10, 98]],
    cap: 400,
    difficulty: ([a, b]) => (b % 10 - (a % 10) <= 2 && a - b >= 10 ? 1 : a - b < 10 ? 3 : 2),
    figure: ([a]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 }),
    word: ([a, b]) => `${girl(a)} had ${a} beads. She used ${b} beads to make a necklace. How many beads are left?`,
    teach: {
      idea: "If there are not enough ones to take away, break one ten into 10 ones. The number stays the same; only how it is grouped changes.",
      method: "Start with the ones. If the top digit is smaller, take 1 ten and make it 10 ones, then subtract the ones and then the tens.",
      visual: ([a]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10) - 1, ones: (a % 10) + 10 }),
      alternatives: [
        { id: "count_up", title: "Count up from the smaller number", kind: "conceptual", text: ["Jump from the smaller number to the next ten, then on to the bigger number.", "Add the jumps: that is the difference."], visual: ([a, b]) => ({ type: "numberline", from: b, to: a, step: a - b > 20 ? 5 : 1, jumps: [[b, Math.ceil(b / 10) * 10], [Math.ceil(b / 10) * 10, a]] }) },
      ],
    },
    limits: "Two-digit minus two-digit with one regrouping; three-digit subtraction is family acsub3.",
  },
  {
    id: "acsub3",
    arity: 2,
    title: "Subtracting three-digit numbers with regrouping",
    competency: SUBR,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").replace(/−/g, "-").match(/^(\d{3})-(\d{2,3})=?\??$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([a, b]) => {
      const da = digitsOf(a, 3);
      const db = digitsOf(b, 3);
      return a < 100 || a > 999 || b < 10 || b >= a || (da[0] >= db[0] && da[1] >= db[1]) ? "Three-digit minus a smaller two- or three-digit number with at least one regrouping." : null;
    },
    prompt: ([a, b]) => `${a} − ${b} = ?`,
    solve: ([a, b]) => {
      const da = digitsOf(a, 3);
      const db = digitsOf(b, 3);
      const steps = [];
      let borrow = 0;
      const names = ["ones", "tens", "hundreds"];
      for (let i = 0; i < 3; i++) {
        let top = da[i] - borrow;
        borrow = 0;
        if (top < db[i]) {
          top += 10;
          borrow = 1;
        }
        steps.push({ id: names[i], op: borrow ? "regroup and subtract" : "subtract", competency: borrow ? SUBR : SUB, inputs: [top, db[i], borrow], value: top - db[i] });
      }
      return { steps, answer: a - b };
    },
    // independent: add back — count on from b in hundreds, tens and ones of the answer to reach a
    validate: ([a, b], v) => {
      if (typeof v !== "number" || v < 0) return false;
      let x = b;
      for (let i = 0; i < Math.floor(v / 100); i++) x += 100;
      for (let i = 0; i < Math.floor(v / 10) % 10; i++) x += 10;
      for (let i = 0; i < v % 10; i++) x += 1;
      return x === a;
    },
    bugs: ([a, b]) => [
      { id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: "In a column where the top digit was smaller, the top was taken from the bottom. Break one from the next column into ten first.", predict: smallerFromLarger(a, b) },
      { id: "next-not-reduced", kind: "procedural", competency: SUBR, says: "A ten (or hundred) was broken up, but the column it came from was not made one less.", predict: borrowNoDecrease(a, b) },
    ],
    distractors: ([a, b]) => [a - b + 10, a - b - 10, a - b + 100],
    variants: () => [],
    explain: (s) => `${s.id[0].toUpperCase()}${s.id.slice(1)}: ${s.inputs[2] ? "break one from the next column, then " : ""}${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`,
    domain: [[100, 999], [10, 998]],
    cap: 400,
    difficulty: ([a, b]) => {
      const da = digitsOf(a, 3);
      const db = digitsOf(b, 3);
      const n = (da[0] < db[0] ? 1 : 0) + (da[1] - (da[0] < db[0] ? 1 : 0) < db[1] ? 1 : 0);
      return da[1] === 0 && da[0] < db[0] ? 3 : n >= 2 ? 3 : b < 100 ? 1 : 2;
    },
    figure: ([a]) => ({ type: "blocks", hundreds: Math.floor(a / 100), tens: Math.floor(a / 10) % 10, ones: a % 10 }),
    word: ([a, b]) => `A school library has ${a} books. ${b} books are lent out to children. How many books are still in the library?`,
    teach: {
      idea: "Breaking one hundred into ten tens, or one ten into ten ones, keeps the number the same, so you can always take away column by column.",
      method: "Work from the ones to the hundreds. When the top digit is smaller, break one from the next column on the left and make that column one less.",
      visual: ([a]) => ({ type: "blocks", hundreds: Math.floor(a / 100), tens: Math.floor(a / 10) % 10, ones: a % 10 }),
      alternatives: [
        { id: "check_add", title: "Check by adding back", kind: "procedural", text: ["Add your answer to the number you took away.", "If you get the first number back, your answer is right."] },
      ],
    },
    limits: "Three-digit numbers minus smaller numbers with one or two regroupings; four-digit subtraction is not included.",
  },
  // ------------------------------------------------------------------ halves and quarters
  {
    id: "achalf",
    arity: 3,
    title: "Naming the shaded part: a half, a quarter or three quarters",
    competency: FRAC,
    type: "fraction",
    mc: true,
    // [r, c, q]: an r × c grid with q quarters shaded (q = 2 is one half)
    parse: none,
    reject: ([r, c, q]) => (r < 1 || r > 6 || c < 2 || c > 12 || q < 1 || q > 3 || (q * r * c) % 4 !== 0 || r * c > 48 ? "A grid of up to 48 squares with a half, a quarter or three quarters shaded." : null),
    prompt: () => "What fraction of the shape in the picture is shaded? Write it like 1/2.",
    solve: ([r, c, q]) => {
      const T = r * c;
      const s = (q * T) / 4;
      return {
        steps: [
          { id: "total", op: "count", competency: "MATH.number.count-objects", inputs: [r, c], value: T },
          { id: "shaded", op: "count", competency: "MATH.number.count-objects", inputs: [T], value: s },
          { id: "fraction", op: "simplify", competency: FRAC, inputs: [s, T], value: q / 4 },
        ],
        answer: q / 4,
      };
    },
    // independent: count the shaded squares one by one and check answer × total = shaded
    validate: ([r, c, q], v) => {
      if (typeof v !== "number") return false;
      const T = r * c;
      const shadedCount = (q * T) / 4;
      let s = 0;
      for (let i = 0; i < T; i++) if (i < shadedCount) s++;
      return Math.abs(v * T - s) < 1e-9;
    },
    bugs: ([r, c, q]) => {
      const T = r * c;
      const s = (q * T) / 4;
      return [
        { id: "shaded-to-unshaded", kind: "conceptual", competency: FRAC, says: "The shaded part was compared with the unshaded part. A fraction compares the shaded part with the whole shape.", predict: s / (T - s) },
        { id: "unshaded", kind: "procedural", competency: FRAC, says: "The fraction of the shape that is NOT shaded was given.", predict: (T - s) / T },
        { id: "count-only", kind: "conceptual", competency: FRAC, says: `Only the shaded squares were counted (${s}); the fraction is shaded squares out of all ${T} squares.`, predict: s },
      ];
    },
    distractors: () => [1 / 4, 1 / 2, 3 / 4, 1 / 3],
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs[0]} rows of ${s.inputs[1]}: ${s.value} squares in all` : s.id === "shaded" ? `${s.value} squares are shaded` : `${s.inputs[0]} out of ${s.inputs[1]} is ${s.value === 0.5 ? "1/2" : s.value === 0.25 ? "1/4" : "3/4"}`),
    domain: [[1, 6], [2, 12], [1, 3]],
    difficulty: ([r, c, q]) => (r * c <= 8 && q === 2 ? 1 : q === 3 || r * c > 24 ? 3 : 2),
    figure: ([r, c, q]) => ({ type: "grid", rows: r, cols: c, shaded: (q * r * c) / 4 }),
    word: ([r, c, q]) => `A chocolate bar has ${r * c} equal pieces. ${name(r + c + q)} eats ${(q * r * c) / 4} of the pieces. What fraction of the bar does ${name(r + c + q)} eat?`,
    teach: {
      idea: "A half is 1 of 2 equal parts; a quarter is 1 of 4 equal parts; three quarters is 3 of 4 equal parts.",
      method: "Count all the squares and the shaded squares. If the shaded squares are half of all, it is 1/2; a quarter of all, 1/4; three quarters, 3/4.",
      visual: ([r, c, q]) => ({ type: "grid", rows: r, cols: c, shaded: (q * r * c) / 4 }),
      alternatives: [
        { id: "fold", title: "Fold into equal parts", kind: "conceptual", text: ["Fold the shape in half, then in half again: you get 4 equal parts.", "Count how many of the 4 parts are shaded."], visual: ([, , q]) => ({ type: "strips", top: 1, bottom: 4, shaded: q }) },
      ],
    },
    limits: "Grids up to 48 squares shaded row by row as a half, a quarter or three quarters; other fractions and unequal parts are other families.",
  },
  {
    id: "achalfof",
    arity: 3,
    title: "A half, a quarter or three quarters of a number of things",
    competency: FRAC,
    type: "integer",
    mc: true,
    // [f, n, t]: f = 0 half, 1 quarter, 2 three quarters, of n things
    parse: none,
    reject: ([f, n, t]) => (f < 0 || f > 2 || n < 2 || n > 40 || t < 0 || t >= ITEMS.length || n % (f ? 4 : 2) !== 0 ? "A half, a quarter or three quarters of up to 40 things, with no part left over." : null),
    prompt: ([f, n, t]) => `There are ${n} ${ITEMS[t]} in the picture. How many is ${["half", "a quarter", "three quarters"][f]} of them?`,
    solve: ([f, n]) => {
      const den = f ? 4 : 2;
      const num = f === 2 ? 3 : 1;
      return {
        steps: [
          { id: "part", op: "share", competency: SHARE, inputs: [n, den], value: n / den },
          ...(num > 1 ? [{ id: "times", op: "multiply", competency: GROUPS, inputs: [n / den, num], value: (num * n) / den }] : []),
        ],
        answer: (num * n) / den,
      };
    },
    // independent: deal the things one at a time into den piles, then count num piles
    validate: ([f, n], v) => {
      const den = f ? 4 : 2;
      const piles = Array(den).fill(0);
      for (let i = 0; i < n; i++) piles[i % den]++;
      const take = f === 2 ? 3 : 1;
      return v === piles.slice(0, take).reduce((a, b) => a + b, 0);
    },
    bugs: ([f, n]) => {
      if (f === 0) return [
        { id: "doubled", kind: "conceptual", competency: FRAC, says: "The number was doubled. Half means splitting into 2 equal parts and taking one part.", predict: 2 * n },
        { id: "take-two", kind: "conceptual", competency: FRAC, says: "2 was taken away. Half means 2 equal parts, not taking away 2.", predict: n - 2 },
      ];
      if (f === 1) return [
        { id: "quarter-as-half", kind: "conceptual", competency: FRAC, says: "The things were split into 2 parts. A quarter is one of 4 equal parts.", predict: n / 2 },
        { id: "take-four", kind: "conceptual", competency: FRAC, says: "4 was taken away. A quarter means one of 4 equal parts.", predict: n - 4 },
      ];
      return [
        { id: "one-quarter", kind: "procedural", competency: FRAC, says: "Only one quarter was found. Three quarters is 3 of the 4 equal parts.", predict: n / 4 },
        { id: "take-three", kind: "conceptual", competency: FRAC, says: "3 was taken away. Three quarters means 3 out of 4 equal parts.", predict: n - 3 },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "part" ? `Share ${s.inputs[0]} into ${s.inputs[1]} equal parts: ${s.value} in each part` : `${s.inputs[1]} parts of ${s.inputs[0]}: ${s.value}`),
    domain: [[0, 2], [2, 40], [0, 5]],
    difficulty: ([f, n]) => (f === 0 && n <= 12 ? 1 : f === 2 ? 3 : 2),
    figure: ([, n]) => ({ type: "dots", count: n, rows: Math.ceil(n / 10) }),
    word: ([f, n, t]) => `${girl(n + t)} picked ${n} ${ITEMS[t]} and gave ${["half", "a quarter", "three quarters"][f]} of them to her grandmother. How many did she give?`,
    teach: {
      idea: "To find a half, share into 2 equal parts; a quarter, into 4 equal parts. Three quarters is 3 of those 4 parts.",
      method: "Deal the things out into 2 (or 4) equal piles. Count one pile for a half or a quarter; count three piles for three quarters.",
      visual: ([f, n]) => ({ type: "array", rows: f ? 4 : 2, cols: n / (f ? 4 : 2) }),
      alternatives: [
        { id: "halve_twice", title: "A quarter is half of a half", kind: "procedural", text: ["Halve the number, then halve it again: that is a quarter.", "Three quarters is the whole minus one quarter."] },
      ],
    },
    limits: "Up to 40 things that split exactly into halves or quarters; other unit fractions are other families.",
  },
  // ------------------------------------------------------------------ choosing an operation
  {
    id: "acstory",
    arity: 4,
    title: "Choosing whether to add, take away, multiply or share",
    competency: OPC,
    type: "integer",
    mc: true,
    // [op, i, j, c]: op 0 put together (10+i) + j; 1 take away (10+i+j) − j; 2 i groups of j; 3 i×j shared among i
    parse: none,
    reject: ([op, i, j, c]) => (op < 0 || op > 3 || i < 2 || i > 9 || j < 2 || j > 9 || c < 0 || c > 2 || (op >= 2 && (i * j > 50 || i > 6)) ? "A one-step story with numbers up to 50." : null),
    prompt: ([op, i, j, c]) => story(op, i, j, c),
    solve: ([op, i, j]) => {
      const [a, b, ans, what] = op === 0 ? [10 + i, j, 10 + i + j, "add"] : op === 1 ? [10 + i + j, j, 10 + i, "take away"] : op === 2 ? [i, j, i * j, "multiply"] : [i * j, i, j, "share"];
      return {
        steps: [
          { id: "choose", op: "choose operation", competency: OPC, inputs: [what], value: op },
          { id: "work", op: String(what), competency: op < 2 ? (op ? SUB : ADD) : op === 2 ? GROUPS : SHARE, inputs: [a as number, b as number, what], value: ans as number },
        ],
        answer: ans as number,
      };
    },
    // independent: act the story out with counters
    validate: ([op, i, j], v) => {
      let n = 0;
      if (op === 0) {
        for (let k = 0; k < 10 + i; k++) n++;
        for (let k = 0; k < j; k++) n++;
      } else if (op === 1) {
        for (let k = 0; k < 10 + i + j; k++) n++;
        for (let k = 0; k < j; k++) n--;
      } else if (op === 2) {
        for (let g = 0; g < i; g++) for (let k = 0; k < j; k++) n++;
      } else {
        const each = Array(i).fill(0);
        for (let k = 0; k < i * j; k++) each[k % i]++;
        n = each[0];
      }
      return v === n;
    },
    bugs: ([op, i, j]) => {
      if (op === 0) return [{ id: "took-away", kind: "conceptual", competency: OPC, says: "The smaller number was taken away from the bigger one, but the story puts two groups together, so we add.", predict: 10 + i - j }];
      if (op === 1) return [{ id: "added", kind: "conceptual", competency: OPC, says: "The numbers were added, but in the story some go away, so we take away.", predict: 10 + i + 2 * j }];
      if (op === 2) return [{ id: "added", kind: "conceptual", competency: OPC, says: `${i} and ${j} were added, but the story has ${i} equal groups of ${j}, so we multiply (or add ${j} again and again).`, predict: i + j }];
      return [
        { id: "took-away", kind: "conceptual", competency: OPC, says: `${i} was taken away from ${i * j}, but the story shares equally, so we divide.`, predict: i * j - i },
        { id: "multiplied", kind: "conceptual", competency: OPC, says: `${i * j} and ${i} were multiplied, but sharing makes each share smaller than the total.`, predict: i * j * i },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "choose" ? (["The story puts things together: add", "Some are taken away: subtract", "There are equal groups: multiply", "It is shared equally: divide"][Number(s.value)]) : `${s.inputs[0]} ${({ add: "+", "take away": "−", multiply: "×", share: "÷" } as Record<string, string>)[String(s.inputs[2])]} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [2, 9], [2, 9], [0, 2]],
    cap: 400,
    difficulty: ([op, i, j]) => (op < 2 && 10 + i + j <= 20 ? 1 : op < 2 ? 2 : 3),
    word: ([op, i, j, c]) => story(op, i, j, (c + 1) % 3),
    teach: {
      idea: "First picture what happens in the story: things put together (add), taken away (subtract), equal groups (multiply) or shared equally (divide).",
      method: "Ask: does the amount get bigger or smaller? Are the groups equal? Then choose the operation and work it out.",
      visual: ([op, i, j]) => (op === 0 ? { type: "numberline", from: 10 + i, to: 10 + i + j, jumps: [[10 + i, 10 + i + j]] } : op === 1 ? { type: "numberline", from: 10 + i, to: 10 + i + j, jumps: [[10 + i + j, 10 + i]] } : { type: "array", rows: i, cols: j }) as Visual,
      alternatives: [
        { id: "act_out", title: "Act it out with counters", kind: "conceptual", text: ["Use beads or stones for the things in the story.", "Do exactly what the story says with them, then count what you have."], visual: ([op, i, j]) => ({ type: "dots", count: op === 0 ? 10 + i : op === 1 ? 10 + i + j : i * j, rows: 2 }) },
      ],
    },
    limits: "One-step stories with numbers up to 50; two-step stories are another family.",
  },
  // ------------------------------------------------------------------ pictographs
  {
    id: "acpict",
    arity: 3,
    title: "Reading a pictograph with a key",
    competency: PIC,
    type: "integer",
    mc: true,
    // [ki, s, j]: key [1, 2, 5, 10][ki], data from seed s, asking about category j
    parse: none,
    reject: ([ki, s, j]) => (ki < 0 || ki > 3 || s < 0 || s > 29 || j < 0 || j > 3 ? "A four-row pictograph with a key of 1, 2, 5 or 10." : null),
    prompt: ([ki, s, j]) => `The pictograph shows ${THEMES[s % 3].title}. Each ● stands for ${KEYS[ki]} ${KEYS[ki] === 1 ? "child" : "children"}. How many children chose ${THEMES[s % 3].labels[j]}?`,
    solve: ([ki, s, j]) => {
      const p = pics(s)[j];
      return {
        steps: [
          { id: "pictures", op: "count", competency: "MATH.number.count-objects", inputs: [THEMES[s % 3].labels[j]], value: p },
          { id: "key", op: "multiply", competency: PIC, inputs: [p, KEYS[ki]], value: p * KEYS[ki] },
        ],
        answer: p * KEYS[ki],
      };
    },
    // independent: skip-count the key once for each picture in the row
    validate: ([ki, s, j], v) => {
      const counts = pics(s).map((p) => p * KEYS[ki]);
      let n = 0;
      for (let k = 0; k < counts[j] / KEYS[ki]; k++) n += KEYS[ki];
      return v === n;
    },
    bugs: ([ki, s, j]) => {
      const p = pics(s);
      const nb = j < 3 ? j + 1 : j - 1;
      return [
        { id: "no-key", kind: "conceptual", competency: PIC, says: `The pictures were counted, but each picture stands for ${KEYS[ki]} children, not 1.`, predict: p[j] },
        { id: "wrong-row", kind: "procedural", competency: PIC, says: `The row for ${THEMES[s % 3].labels[nb]} was read instead. Put a finger on the right label and follow its row.`, predict: p[nb] * KEYS[ki] },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "pictures" ? `The row for ${s.inputs[0]} has ${nn(s.value, "picture", "pictures")}` : `${s.inputs[0]} pictures × ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [0, 29], [0, 3]],
    cap: 300,
    difficulty: ([ki]) => (ki === 0 ? 1 : ki <= 2 ? 2 : 3),
    figure: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: pics(s).map((p) => p * KEYS[ki]), key: KEYS[ki] }),
    word: ([ki, s, j]) => `${name(s)}'s class made this pictograph of ${THEMES[s % 3].title}. One ● means ${KEYS[ki]}. ${name(s + 1)} wants to know: how many children chose ${THEMES[s % 3].labels[j]}?`,
    teach: {
      idea: "In a pictograph every picture stands for the same number of things: the number in the key.",
      method: "Count the pictures in the row, then count in the key's number once for each picture (or multiply).",
      visual: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: pics(s).map((p) => p * KEYS[ki]), key: KEYS[ki] }),
      alternatives: [
        { id: "table", title: "Turn it into a table", kind: "procedural", text: ["Write each label with its number of pictures.", "Multiply each by the key and write the real number beside it."], visual: ([ki, s]) => ({ type: "table", head: ["Choice", "Pictures", "Children"], rows: THEMES[s % 3].labels.map((l, i) => [l, pics(s)[i], pics(s)[i] * KEYS[ki]]) }) },
      ],
    },
    limits: "Four-row pictographs with whole pictures and a key of 1, 2, 5 or 10; half pictures and drawing pictographs are not included.",
  },
  {
    id: "acpictmore",
    arity: 3,
    title: "Comparing two rows of a pictograph",
    competency: PIC,
    type: "integer",
    mc: true,
    // [ki, s, pr]: key, data seed, pair of rows
    parse: none,
    reject: ([ki, s, pr]) => {
      if (ki < 0 || ki > 3 || s < 0 || s > 29 || pr < 0 || pr > 5) return "A four-row pictograph with a key of 1, 2, 5 or 10, comparing two rows.";
      const [x, y] = PAIRS[pr];
      return pics(s)[x] === pics(s)[y] ? "The two rows are equal." : null;
    },
    prompt: ([ki, s, pr]) => {
      const [hi, lo] = order(s, pr);
      const L = THEMES[s % 3].labels;
      return `The pictograph shows ${THEMES[s % 3].title}. Each ● stands for ${KEYS[ki]} ${KEYS[ki] === 1 ? "child" : "children"}. How many more children chose ${L[hi]} than ${L[lo]}?`;
    },
    solve: ([ki, s, pr]) => {
      const [hi, lo] = order(s, pr);
      const p = pics(s);
      return {
        steps: [
          { id: "big", op: "read", competency: PIC, inputs: [p[hi], KEYS[ki]], value: p[hi] * KEYS[ki] },
          { id: "small", op: "read", competency: PIC, inputs: [p[lo], KEYS[ki]], value: p[lo] * KEYS[ki] },
          { id: "diff", op: "subtract", competency: SUB, inputs: [p[hi] * KEYS[ki], p[lo] * KEYS[ki]], value: (p[hi] - p[lo]) * KEYS[ki] },
        ],
        answer: (p[hi] - p[lo]) * KEYS[ki],
      };
    },
    // independent: count up in the key from the smaller row's total to the larger row's total
    validate: ([ki, s, pr], v) => {
      const [hi, lo] = order(s, pr);
      const p = pics(s);
      let x = p[lo] * KEYS[ki];
      let c = 0;
      while (x < p[hi] * KEYS[ki]) {
        x += 1;
        c++;
      }
      return v === c;
    },
    bugs: ([ki, s, pr]) => {
      const [hi, lo] = order(s, pr);
      const p = pics(s);
      return [
        { id: "no-key", kind: "conceptual", competency: PIC, says: `The difference in pictures was found, but each picture stands for ${KEYS[ki]}.`, predict: p[hi] - p[lo] },
        { id: "added", kind: "conceptual", competency: OPC, says: `"How many more" asks for the difference, so take the smaller number from the bigger one; the two rows were added.`, predict: (p[hi] + p[lo]) * KEYS[ki] },
        { id: "bigger-only", kind: "procedural", competency: PIC, says: "Only the bigger row was read. Compare it with the smaller row by taking away.", predict: p[hi] * KEYS[ki] },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "diff" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} pictures × ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [0, 29], [0, 5]],
    cap: 300,
    difficulty: ([ki]) => (ki === 0 ? 1 : ki <= 2 ? 2 : 3),
    figure: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: pics(s).map((p) => p * KEYS[ki]), key: KEYS[ki] }),
    word: ([ki, s, pr]) => {
      const [hi, lo] = order(s, pr);
      const L = THEMES[s % 3].labels;
      return `${name(s + 2)}'s teacher shows this pictograph of ${THEMES[s % 3].title}, where one ● means ${KEYS[ki]}. How many fewer children chose ${L[lo]} than ${L[hi]}?`;
    },
    teach: {
      idea: "\"How many more\" compares two amounts: it is the bigger amount minus the smaller one.",
      method: "Read both rows using the key, then take the smaller number from the bigger one.",
      visual: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: pics(s).map((p) => p * KEYS[ki]), key: KEYS[ki] }),
      alternatives: [
        { id: "extra_pictures", title: "Count the extra pictures", kind: "conceptual", text: ["Line up the two rows. Count the pictures the longer row has that the shorter one does not.", "Then count in the key's number once for each extra picture."] },
      ],
    },
    limits: "Comparing two rows of a four-row pictograph with whole pictures; totals over all rows are not included.",
  },
  // ------------------------------------------------------------------ equality
  {
    id: "acbalance",
    arity: 4,
    title: "Making both sides of a number sentence equal",
    competency: EQ,
    type: "integer",
    mc: true,
    // [f, a, b, c]: f 0: a + b = □ + c; f 1: a + b = c + □; f 2: a − b = □ − c
    parse: none,
    reject: ([f, a, b, c]) => {
      if (f < 0 || f > 2 || a < 2 || a > 20 || b < 2 || b > 20 || c < 1 || c > 20) return "Numbers up to 20 on each side.";
      if (f < 2) return a + b - c < 1 || c === a || c === b ? "The box is a whole number from 1, and the sides do not just swap." : null;
      return a <= b || a - b + c > 40 || c === b ? "The box is a whole number up to 40, and the sides do not just repeat." : null;
    },
    prompt: ([f, a, b, c]) => `What number goes in the box to make both sides equal? ${sentence(f, a, b, c)}`,
    solve: ([f, a, b, c]) => {
      const left = f < 2 ? a + b : a - b;
      const x = f < 2 ? left - c : left + c;
      return {
        steps: [
          { id: "left", op: f < 2 ? "add" : "subtract", competency: f < 2 ? ADD : SUB, inputs: [a, b], value: left },
          { id: "box", op: f < 2 ? "subtract" : "add", competency: EQ, inputs: [left, c, f < 2 ? "−" : "+"], value: x },
        ],
        answer: x,
      };
    },
    // independent: put the answer in the box and work out both sides
    validate: ([f, a, b, c], v) => {
      if (typeof v !== "number") return false;
      return f < 2 ? a + b === v + c : a - b === v - c;
    },
    bugs: ([f, a, b, c]) =>
      f < 2
        ? [
            { id: "equals-gives-answer", kind: "conceptual", competency: EQ, says: `The answer to ${a} + ${b} was written in the box. The = sign means both sides have the same value, not "the answer comes next".`, predict: a + b },
            { id: "add-all", kind: "conceptual", competency: EQ, says: "All the numbers were added together. Find what the box must be so that the right side has the same value as the left side.", predict: a + b + c },
          ]
        : [
            { id: "equals-gives-answer", kind: "conceptual", competency: EQ, says: `The answer to ${a} − ${b} was written in the box. The = sign means both sides have the same value.`, predict: a - b },
            { id: "took-away", kind: "procedural", competency: EQ, says: `${c} was taken away again; the box must be ${c} MORE than ${a - b}, so that taking ${c} from it leaves ${a - b}.`, predict: a - b - c >= 0 ? a - b - c : null },
          ],
    variants: () => [],
    explain: (s) => (s.id === "left" ? `The left side is ${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}` : `The right side must also be ${s.inputs[0]}, so the box is ${s.inputs[0]} ${s.inputs[2]} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [2, 20], [2, 20], [1, 20]],
    cap: 400,
    difficulty: ([f, a, b]) => (f === 0 && a + b <= 20 ? 1 : f === 2 ? 3 : 2),
    figure: ([f, a, b, c]) => ({ type: "balance", left: f < 2 ? `${a} + ${b}` : `${a} − ${b}`, right: f === 0 ? `□ + ${c}` : f === 1 ? `${c} + □` : `□ − ${c}` }),
    word: ([f, a, b, c]) =>
      f < 2
        ? `${name(a)} has ${a} red bangles and ${b} green bangles. ${name(b + 3)} has ${c} ${c === 1 ? "bangle" : "bangles"} and buys some more. Now they both have the same number of bangles. How many did ${name(b + 3)} buy?`
        : `${name(a)} had ${a} stickers and gave away ${b}. ${name(c + 5)} had some stickers and gave away ${c}. Now they have the same number left. How many stickers did ${name(c + 5)} have at first?`,
    teach: {
      idea: "The = sign means \"has the same value as\", like a balance that is level: both sides must be worth the same.",
      method: "Work out the side you can finish. Then find the number in the box that makes the other side worth the same.",
      visual: ([f, a, b, c]) => ({ type: "balance", left: f < 2 ? `${a} + ${b}` : `${a} − ${b}`, right: f === 0 ? `□ + ${c}` : f === 1 ? `${c} + □` : `□ − ${c}` }),
      alternatives: [
        { id: "compare", title: "Compare without adding up", kind: "conceptual", text: ["In 9 + 7 = □ + 8, the 8 on the right is one less than the 9 on the left, so the box must be one more than 7: it is 8.", "If one number goes up by some amount, the other must go down by the same amount for the sides to stay equal."] },
      ],
    },
    limits: "One box in sentences like a + b = □ + c or a − b = □ − c with numbers up to 40; comparing with < and > is not included because those answers are signs, not numbers.",
  },
  // ------------------------------------------------------------------ missing numbers
  {
    id: "acmissing",
    arity: 3,
    title: "Finding the missing number in a number sentence",
    competency: MISS,
    type: "integer",
    mc: true,
    // [f, u, k]: f 0: □ + k = u + k; 1: (u + k) − □ = k; 2: □ − k = u − k; 3: k × □ = k u; the box is u
    parse: none,
    reject: ([f, u, k]) => {
      if (f < 0 || f > 3 || u < 2 || u > 20 || k < 2 || k > 20) return "Numbers up to 40.";
      if (f === 0 && u + k > 40) return "Sums up to 40.";
      if (f === 1 && u === k) return "The box and the answer are different.";
      if (f === 2 && k >= u) return "The box is bigger than the number taken away.";
      if (f === 3 && (u > 10 || k > 10)) return "Times-table facts up to 10 × 10.";
      return null;
    },
    prompt: ([f, u, k]) => `What number goes in the box? ${missingText(f, u, k)}`,
    solve: ([f, u, k]) => {
      const [op, x, y, comp] = f === 0 ? ["subtract", u + k, k, SUB] : f === 1 ? ["subtract", u + k, k, SUB] : f === 2 ? ["add", u - k, k, ADD] : ["divide", k * u, k, "MATH.number.multiplication-tables"];
      return {
        steps: [
          { id: "undo", op: String(op), competency: MISS, inputs: [String(op)], value: f },
          { id: "work", op: String(op), competency: String(comp), inputs: [x as number, y as number], value: u },
        ],
        answer: u,
      };
    },
    // independent: substitute the answer into the box and check the sentence is true
    validate: ([f, u, k], v) => {
      if (typeof v !== "number") return false;
      return f === 0 ? v + k === u + k : f === 1 ? u + k - v === k : f === 2 ? v - k === u - k : k * v === k * u;
    },
    bugs: ([f, u, k]) => {
      if (f === 0) return [{ id: "added-both", kind: "conceptual", competency: MISS, says: `The two numbers you can see were added. The box plus ${k} makes ${u + k}, so the box is ${u + k} − ${k}.`, predict: u + 2 * k }];
      if (f === 1) return [{ id: "added-both", kind: "conceptual", competency: MISS, says: `The two numbers you can see were added. Taking the box away from ${u + k} leaves ${k}, so the box is ${u + k} − ${k}.`, predict: u + 2 * k }];
      if (f === 2) return [{ id: "took-away-again", kind: "conceptual", competency: MISS, says: `${k} was taken away again. The box is the number we started with before ${k} was taken away, so add ${k} back.`, predict: u - 2 * k >= 0 ? u - 2 * k : null }];
      return [
        { id: "took-away", kind: "conceptual", competency: MISS, says: `${k} was taken away from ${k * u}. The box is how many times ${k} goes into ${k * u}: use the ${k} times table.`, predict: k * u - k },
        { ...factSlip(k, u), predict: [u - 1, u + 1].filter((x) => x > 0 && x !== u) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "undo" ? ["Undo the adding: take away", "Undo the taking away: take away from the first number", "Undo the taking away: add it back", "Undo the multiplying: divide"][Number(s.value)] : `${s.inputs[0]} ${s.op === "add" ? "+" : s.op === "divide" ? "÷" : "−"} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [2, 20], [2, 20]],
    cap: 400,
    difficulty: ([f, u, k]) => (f === 0 && u + k <= 20 ? 1 : f === 3 || f === 1 ? 3 : 2),
    figure: ([f, u, k]) => ({ type: "balance", left: missingText(f, u, k).split(" = ")[0], right: missingText(f, u, k).split(" = ")[1] }),
    word: ([f, u, k]) =>
      f === 0
        ? `${girl(u)} had some beads. Her friend gave her ${k} more, and now she has ${u + k}. How many beads did she have at first?`
        : f === 1
          ? `There were ${u + k} birds on a tree. Some flew away and ${k} are left. How many birds flew away?`
          : f === 2
            ? `${boy(k)} had some rupees. He spent ₹${k} and now has ₹${u - k}. How many rupees did he have at first?`
            : `${k} children each have the same number of pencils. Together they have ${k * u} pencils. How many pencils does each child have?`,
    teach: {
      idea: "Adding and taking away undo each other, and so do multiplying and dividing, so you can work backwards to the missing number.",
      method: "Read the sentence and ask what was done to the box. Do the opposite to the other number, then check by putting your answer in the box.",
      visual: ([f, u, k]) => ({ type: "balance", left: missingText(f, u, k).split(" = ")[0], right: missingText(f, u, k).split(" = ")[1] }),
      alternatives: [
        { id: "count_on", title: "Count on to find the gap", kind: "procedural", text: ["For □ + 7 = 15, start at 7 and count on to 15: 8, 9, … 15 is 8 counts.", "The number of counts is the missing number."], visual: ([f, u, k]) => (f === 0 ? { type: "numberline", from: k, to: u + k, jumps: [[k, u + k]] } : null) },
      ],
    },
    limits: "One missing number in an addition, subtraction or times-table sentence, numbers up to 40 (or 10 × 10); missing digits are not included.",
  },
  // ------------------------------------------------------------------ growing patterns
  {
    id: "acgrow",
    arity: 3,
    title: "Continuing a growing pattern",
    competency: GROW,
    type: "integer",
    mc: true,
    // [a, d, k]: step 1 has a dots, each step adds d; find step k
    parse: none,
    reject: ([a, d, k]) => (a < 1 || a > 10 || d < 1 || d > 6 || k < 4 || k > 8 ? "A pattern that starts at 1 to 10 and grows by 1 to 6, up to step 8." : null),
    prompt: ([a, d, k]) => `The table shows a growing pattern of dots. How many dots will there be in step ${k}?`,
    solve: ([a, d, k]) => ({
      steps: [
        { id: "rule", op: "find rule", competency: GROW, inputs: [a, a + d], value: d },
        { id: "extend", op: "count on", competency: GROW, inputs: [a + 2 * d, d, k - 3], value: a + (k - 1) * d },
      ],
      answer: a + (k - 1) * d,
    }),
    // independent: write out the pattern step by step
    validate: ([a, d, k], v) => {
      const seq = [a];
      while (seq.length < k) seq.push(seq[seq.length - 1] + d);
      return v === seq[k - 1];
    },
    bugs: ([a, d, k]) => [
      { id: "next-only", kind: "procedural", competency: GROW, says: `Only the next step (step 4) was found. Keep adding ${d} until step ${k}.`, predict: k > 4 ? a + 3 * d : null },
      { id: "one-too-many", kind: "procedural", competency: GROW, says: `${d} was added ${k} times, but step 1 already has ${a}; from step 1 to step ${k} there are ${k - 1} jumps.`, predict: a + k * d },
      { id: "times-step", kind: "conceptual", competency: GROW, says: `The step number was multiplied by ${d}, but the pattern started at ${a}, not at ${d}.`, predict: k * d },
    ],
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `From ${s.inputs[0]} to ${s.inputs[1]}: the pattern grows by ${s.value} each step` : `Keep adding ${s.inputs[1]}: ${s.value}`),
    domain: [[1, 10], [1, 6], [4, 8]],
    difficulty: ([, d, k]) => (k === 4 && d <= 3 ? 1 : k >= 7 ? 3 : 2),
    figure: ([a, d]) => ({ type: "table", head: ["Step", "1", "2", "3"], rows: [["Dots", a, a + d, a + 2 * d]] }),
    word: ([a, d, k]) => `${name(a + d)} builds towers of blocks. The first tower has ${a} blocks, the second ${a + d}, the third ${a + 2 * d}, and each new tower has ${d} more than the one before. How many blocks are in tower ${k}?`,
    teach: {
      idea: "In a growing pattern the same amount is added each time; find that amount and keep adding it.",
      method: "Find how much the pattern grows from one step to the next. Keep adding that amount, step by step, until you reach the step you want.",
      visual: ([a, d]) => ({ type: "dots", count: a + 2 * d, rows: 1 }),
      alternatives: [
        { id: "table", title: "Extend the table", kind: "procedural", text: ["Write the step numbers 1, 2, 3, … in one row and the counts under them.", "Fill each new box by adding the same amount as before."], visual: ([a, d, k]) => ({ type: "table", head: ["Step", ...Array.from({ length: k }, (_, i) => String(i + 1))], rows: [["Dots", ...Array.from({ length: k }, (_, i) => (i < 3 ? a + i * d : "?"))]] }) },
      ],
    },
    limits: "Patterns that add the same amount each step, up to step 8; repeating patterns and patterns that double are not included.",
  },
  {
    id: "acsticks",
    arity: 2,
    title: "Matchstick shapes in a row",
    competency: GROW,
    type: "integer",
    mc: true,
    // [s, n]: n joined shapes with s sides each, in a row, neighbours sharing one stick
    parse: none,
    reject: ([s, n]) => (s < 3 || s > 6 || n < 2 || n > 22 ? "Rows of 2 to 22 triangles, squares, pentagons or hexagons." : null),
    prompt: ([s, n]) => `One ${SHAPE[s]} is made with ${s} matchsticks, as in the picture. ${SHAPE[s][0].toUpperCase()}${SHAPE[s].slice(1)}s are joined in a row, and each one shares a stick with the one next to it. How many matchsticks are needed for a row of ${n} ${SHAPE[s]}s?`,
    solve: ([s, n]) => ({
      steps: [
        { id: "first", op: "count", competency: GROW, inputs: [SHAPE[s]], value: s },
        { id: "each", op: "find rule", competency: GROW, inputs: [s], value: s - 1 },
        { id: "total", op: "extend", competency: GROW, inputs: [s, s - 1, n - 1], value: s + (n - 1) * (s - 1) },
      ],
      answer: s + (n - 1) * (s - 1),
    }),
    // independent: count every side of every shape, then take away the shared sticks (one between each neighbour)
    validate: ([s, n], v) => {
      let sides = 0;
      for (let i = 0; i < n; i++) sides += s;
      let shared = 0;
      for (let i = 1; i < n; i++) shared++;
      return v === sides - shared;
    },
    bugs: ([s, n]) => [
      { id: "no-sharing", kind: "conceptual", competency: GROW, says: `Each ${SHAPE[s]} was given ${s} sticks, but neighbours share a stick, so each new ${SHAPE[s]} needs only ${s - 1} more.`, predict: s * n },
      { id: "forgot-first", kind: "procedural", competency: GROW, says: `Every ${SHAPE[s]} was given ${s - 1} sticks, but the first one needs all ${s}.`, predict: (s - 1) * n },
    ],
    distractors: ([s, n]) => [s + n * (s - 1), s * n - n],
    variants: () => [],
    explain: (s) => (s.id === "first" ? `The first ${s.inputs[0]} needs ${s.value} sticks` : s.id === "each" ? `Each new one shares a stick, so it needs ${s.value} more` : `${s.inputs[0]} + ${s.inputs[2]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[3, 6], [2, 22]],
    difficulty: ([s, n]) => (n <= 5 ? 1 : n <= 12 && s <= 4 ? 2 : 3),
    figure: ([s]) => ({ type: "shape", sides: s, name: SHAPE[s] }),
    word: ([s, n]) => `${name(n + s)} makes a row of ${n} ${SHAPE[s]}s with ice-cream sticks. Each ${SHAPE[s]} has ${s} sides, and ${SHAPE[s]}s next to each other share one stick. How many ice-cream sticks does ${name(n + s)} use?`,
    teach: {
      idea: `The first shape needs all its sticks; every shape after it shares one stick with its neighbour, so it needs one stick fewer.`,
      method: "Start with the sticks for one shape, then add (sides − 1) for each extra shape.",
      visual: ([s, n]) => ({ type: "table", head: ["Shapes", "1", "2", "3", "4"], rows: [["Sticks", s, 2 * s - 1, 3 * s - 2, 4 * s - 3]] }),
      alternatives: [
        { id: "count_and_remove", title: "Count all sides, then remove the shared ones", kind: "conceptual", text: ["If the shapes were apart, n shapes need n × sides sticks.", "Joining them in a row shares one stick between each pair of neighbours: take away one fewer than the number of shapes."] },
      ],
    },
    limits: "Single rows of joined regular shapes (3 to 6 sides), up to 22 shapes; grids of shapes are not included.",
  },
  // ------------------------------------------------------------------ lines and line segments
  {
    id: "aclines",
    arity: 3,
    title: "Counting line segments and lines through points",
    competency: LINES,
    type: "integer",
    mc: true,
    // [n, k, s]: k = 0, n points on one straight line, count segments; k = 1, n points no three in a line, count lines
    parse: none,
    reject: ([n, k, s]) => (n < 3 || n > 7 || (k !== 0 && k !== 1) || s < 0 || s > 9 || (k === 1 && n > 6) ? "3 to 7 points on a line, or 3 to 6 points with no three in a line." : null),
    prompt: ([n, k]) =>
      k
        ? `The ${n} points in the picture (${letters(n)}) are placed so that no three of them are on one straight line. How many different straight lines can be drawn, each going through two of the points?`
        : `The ${n} points in the picture (${letters(n)}) are marked on one straight line. How many different line segments have two of these points as their end points?`,
    solve: ([n, k]) => ({
      steps: [
        { id: "pairs", op: "count pairs", competency: LINES, inputs: [n], value: (n * (n - 1)) / 2 },
        { id: "each", op: "count", competency: LINES, inputs: [k ? "line" : "segment"], value: (n * (n - 1)) / 2 },
      ],
      answer: (n * (n - 1)) / 2,
    }),
    // independent: list every pair of drawn points, and (for k = 1) check that no three drawn points are in a line
    validate: ([n, k, s], v) => {
      const pts = layout(n, k, s);
      if (k) {
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let m = j + 1; m < n; m++) {
          const [a, b, c] = [pts[i], pts[j], pts[m]];
          if ((b[0] - a[0]) * (c[1] - a[1]) === (b[1] - a[1]) * (c[0] - a[0])) return false;
        }
      }
      let c = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++;
      return v === c;
    },
    bugs: ([n, k]) => [
      { id: "neighbours-only", kind: "conceptual", competency: LINES, says: k ? "Only lines joining points next to each other were counted. Every pair of points gives a line." : "Only the short segments between neighbouring points were counted. Longer segments, such as from the first point to the third, count too.", predict: n - 1 },
      { id: "counted-twice", kind: "procedural", competency: LINES, says: `Each ${k ? "line" : "segment"} was counted twice (AB and BA are the same).`, predict: n * (n - 1) },
      { id: "counted-points", kind: "conceptual", competency: LINES, says: `The points were counted; ${k ? "a line" : "a segment"} needs two points.`, predict: n },
    ],
    variants: () => [],
    explain: (s) => (s.id === "pairs" ? `Pair each point with every point after it: ${Array.from({ length: Number(s.inputs[0]) - 1 }, (_, i) => Number(s.inputs[0]) - 1 - i).join(" + ")} = ${s.value}` : `Each pair gives one ${s.inputs[0]}: ${s.value}`),
    domain: [[3, 7], [0, 1], [0, 9]],
    difficulty: ([n]) => (n <= 4 ? 1 : n <= 5 ? 2 : 3),
    figure: ([n, k, s]) => {
      const pts = layout(n, k, s);
      return { type: "plane", range: 10, points: pts.map(([x, y], i) => [x, y, "ABCDEFG"[i]]), segments: k ? [] : [[[pts[0][0], pts[0][1]], [pts[n - 1][0], pts[n - 1][1]]]] };
    },
    word: ([n, k]) =>
      k
        ? `${n} children stand in a field, with no three of them in a straight line. Each pair of children holds a long straight rope between them. How many ropes are needed?`
        : `A straight road has ${n} bus stops on it. A ticket is printed for every journey between two different stops (going either way counts as the same ticket). How many different tickets are there?`,
    teach: {
      idea: "Every pair of points gives exactly one line segment (or one straight line), and AB is the same as BA.",
      method: "Start with the first point and join it to every point after it; then the second point to every point after it; and so on. Add up the counts.",
      visual: ([n, k, s]) => {
        const pts = layout(n, k, s);
        return { type: "plane", range: 10, points: pts.map(([x, y], i) => [x, y, "ABCDEFG"[i]]), segments: pts.flatMap((a, i) => pts.slice(i + 1).map((b) => [[a[0], a[1]], [b[0], b[1]]])) };
      },
      alternatives: [
        { id: "list", title: "Make a list", kind: "procedural", text: ["Write the pairs in order: AB, AC, AD, then BC, BD, then CD.", "Never write a pair you already have the other way round."] },
      ],
    },
    limits: "Counting segments or lines from up to 7 points; naming lines, rays and segments by symbol is not marked automatically here (it needs a choice of symbols), nor are parallel and perpendicular lines.",
  },
  // ------------------------------------------------------------------ tiling
  {
    id: "actile",
    arity: 3,
    title: "How many tiles cover a floor",
    competency: TILE,
    type: "integer",
    mc: true,
    // [R, C, ti]: an R × C grid covered with tiles TILES[ti] (h rows by w columns), all the same way round
    parse: none,
    reject: ([R, C, ti]) => (R < 2 || R > 8 || C < 2 || C > 10 || ti < 0 || ti > 4 || R % TILES[ti][0] !== 0 || C % TILES[ti][1] !== 0 ? "A grid up to 8 by 10 that the tile covers exactly." : null),
    prompt: ([R, C, ti]) => `${TILES[ti][0] === 1 ? `The floor in the picture is a grid of ${R} rows and ${C} columns of squares. Each tile covers ${TILES[ti][2]} (the first tile is shaded).` : `A floor is a grid of ${R} rows and ${C} columns of squares. The picture shows one tile: it covers ${TILES[ti][2]}.`} The tiles cover the floor with no gaps and no overlaps. How many tiles are needed?`,
    solve: ([R, C, ti]) => {
      const [h, w] = TILES[ti];
      return {
        steps: [
          { id: "row", op: "divide", competency: TILE, inputs: [C, w], value: C / w },
          { id: "rows", op: "divide", competency: TILE, inputs: [R, h], value: R / h },
          { id: "total", op: "multiply", competency: GROUPS, inputs: [R / h, C / w], value: (R / h) * (C / w) },
        ],
        answer: (R * C) / (h * w),
      };
    },
    // independent: lay tiles one at a time in the first empty square, checking each fits, and count them
    validate: ([R, C, ti], v) => {
      const [h, w] = TILES[ti];
      const g = Array.from({ length: R }, () => Array(C).fill(false));
      let n = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (g[r][c]) continue;
        if (r + h > R || c + w > C) return false;
        for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
          if (g[r + i][c + j]) return false;
          g[r + i][c + j] = true;
        }
        n++;
      }
      return v === n;
    },
    bugs: ([R, C, ti]) => {
      const [h, w] = TILES[ti];
      return [
        { id: "counted-squares", kind: "conceptual", competency: TILE, says: `The squares were counted, but each tile covers ${h * w} squares.`, predict: R * C },
        { id: "one-row", kind: "procedural", competency: TILE, says: `Only the tiles for the top ${h === 1 ? "row" : "two rows"} were counted. The same number fits in every ${h === 1 ? "row" : "pair of rows"}.`, predict: C / w },
        ...(h * w !== 2 ? [{ id: "two-squares", kind: "conceptual", competency: TILE, says: `Each tile was taken to cover 2 squares, but it covers ${h * w}.`, predict: (R * C) / 2 } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "row" ? `${s.inputs[0]} columns ÷ ${s.inputs[1]}: ${nn(s.value, "tile", "tiles")} across` : s.id === "rows" ? `${s.inputs[0]} rows ÷ ${s.inputs[1]}: ${nn(s.value, "row", "rows")} of tiles` : `${nn(s.inputs[0], "row", "rows")} of ${nn(s.inputs[1], "tile", "tiles")}: ${s.value} tiles`),
    domain: [[2, 8], [2, 10], [0, 4]],
    difficulty: ([R, C, ti]) => (ti <= 1 && R * C <= 24 ? 1 : ti >= 2 && R * C > 40 ? 3 : 2),
    figure: ([R, C, ti]) => tileFigure(R, C, ti),
    word: ([R, C, ti]) => `${name(R + C)}'s verandah floor is ${R} squares long one way and ${C} squares the other way. The tiles each cover ${TILES[ti][2]}. How many tiles are needed to cover the whole verandah with no gaps?`,
    teach: {
      idea: "Tiles that fit with no gaps and no overlaps cover the floor exactly, so the floor splits into equal tile-sized pieces.",
      method: "Find how many tiles fit across one row of tiles and how many rows of tiles there are, then multiply (or add the rows).",
      visual: ([R, C, ti]) => ({ type: "grid", rows: R, cols: C, shaded: TILES[ti][0] === 1 ? TILES[ti][1] : 0 }),
      alternatives: [
        { id: "squares_per_tile", title: "Share the squares among the tiles", kind: "conceptual", text: ["Count all the squares on the floor.", "Each tile covers the same number of squares (count them on one tile), so share the squares into groups of that size."], visual: ([, , ti]) => ({ type: "grid", rows: TILES[ti][0], cols: TILES[ti][1], shaded: TILES[ti][0] * TILES[ti][1] }) },
      ],
    },
    limits: "Rectangular floors covered by one kind of rectangular tile, all laid the same way; tessellations of other shapes need drawing and are marked by an educator.",
  },
  // ------------------------------------------------------------------ elapsed time
  {
    id: "acelapsed",
    arity: 3,
    title: "How long something lasts, from the clock",
    competency: TIME,
    type: "integer",
    mc: true,
    // [h, m5, d5]: starts at h:(5 m5) shown on the clock, lasts 5 d5 minutes
    parse: none,
    reject: ([h, m5, d5]) => (h < 1 || h > 12 || m5 < 0 || m5 > 11 || d5 < 1 || d5 > 18 ? "Start times on a clock in 5 minutes, lasting 5 to 90 minutes." : null),
    prompt: ([h, m5, d5]) => {
      const [eh, em] = endOf(h, m5 * 5, d5 * 5);
      return `A school play starts at the time shown on the clock. It ends at ${eh}:${pad2(em)}. How many minutes does the play last?`;
    },
    solve: ([h, m5, d5]) => {
      const m = m5 * 5;
      const d = d5 * 5;
      const [eh, em] = endOf(h, m, d);
      const toHour = 60 - m;
      return {
        steps: [
          { id: "read", op: "read clock", competency: CLOCK, inputs: [h, m], value: `${h}:${pad2(m)}` },
          ...(d > toHour
            ? [
                { id: "to-hour", op: "count on", competency: TIME, inputs: [`${h}:${pad2(m)}`, `${nextH(h)}:00`], value: toHour },
                { id: "rest", op: "count on", competency: TIME, inputs: [`${nextH(h)}:00`, `${eh}:${pad2(em)}`], value: d - toHour },
                { id: "total", op: "add", competency: ADD, inputs: [toHour, d - toHour], value: d },
              ]
            : [{ id: "count", op: "count on", competency: TIME, inputs: [`${h}:${pad2(m)}`, `${eh}:${pad2(em)}`], value: d }]),
        ],
        answer: d,
      };
    },
    // independent: run a clock forward minute by minute from the start until it shows the end time
    validate: ([h, m5, d5], v) => {
      const [eh, em] = endOf(h, m5 * 5, d5 * 5);
      let ch = h;
      let cm = m5 * 5;
      let n = 0;
      while (!(ch === eh && cm === em) && n < 720) {
        cm++;
        if (cm === 60) {
          cm = 0;
          ch = nextH(ch);
        }
        n++;
      }
      return v === n;
    },
    bugs: ([h, m5, d5]) => {
      const m = m5 * 5;
      const d = d5 * 5;
      const [eh, em] = endOf(h, m, d);
      const out: Bug[] = [];
      const crosses = eh !== h;
      if (crosses && eh > h) out.push({ id: "hour-as-100", kind: "conceptual", competency: TIME, says: `The times were taken away like ordinary numbers (${eh}${pad2(em)} − ${h}${pad2(m)}), but an hour has 60 minutes, not 100.`, predict: eh * 100 + em - (h * 100 + m) });
      if (m5 > 0) out.push({ id: "hand-number", kind: "recall", competency: CLOCK, says: `The minute hand points to ${m5}, which means ${m} minutes (count in 5s), not ${m5} minutes.`, predict: d + m - m5 });
      if (crosses && Math.abs(em - m) > 0) out.push({ id: "minutes-only", kind: "procedural", competency: TIME, says: "Only the minute numbers were compared and the hour that went past was forgotten. Count on to the next o'clock first.", predict: Math.abs(em - m) });
      return out;
    },
    distractors: ([, , d5]) => [d5 * 5 + 5, d5 * 5 - 5, d5 * 5 + 10],
    variants: () => [],
    explain: (s) => (s.id === "read" ? `The clock shows ${s.value}` : s.id === "to-hour" ? `From ${s.inputs[0]} to ${s.inputs[1]} is ${s.value} minutes` : s.id === "rest" ? `From ${s.inputs[0]} to ${s.inputs[1]} is ${s.value} minutes` : s.id === "total" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} minutes` : `Count on in 5s from ${s.inputs[0]} to ${s.inputs[1]}: ${s.value} minutes`),
    domain: [[1, 12], [0, 11], [1, 18]],
    cap: 400,
    difficulty: ([, m5, d5]) => (m5 * 5 + d5 * 5 <= 60 ? 1 : d5 <= 12 ? 2 : 3),
    figure: ([h, m5]) => ({ type: "clock", h, m: m5 * 5 }),
    word: ([h, m5, d5]) => {
      const [eh, em] = endOf(h, m5 * 5, d5 * 5);
      return `${name(h + m5)} starts reading a story book at ${h}:${pad2(m5 * 5)}, the time on the clock, and stops at ${eh}:${pad2(em)}. For how many minutes does ${name(h + m5)} read?`;
    },
    teach: {
      idea: "Time is counted in hours of 60 minutes, so count on from the start to the next o'clock, then on to the end.",
      method: "Read the start time from the clock. Count on in 5s to the next o'clock, then count on to the end time, and add the two parts.",
      visual: ([h, m5]) => ({ type: "clock", h, m: m5 * 5 }),
      alternatives: [
        {
          id: "time_line",
          title: "Use a time line",
          kind: "procedural",
          text: ["Draw a line from the start time to the end time with a mark at the o'clock in between.", "Write the minutes for each jump and add them."],
          visual: ([, m5, d5]) => {
            const toHour = 60 - m5 * 5;
            const d = d5 * 5;
            return { type: "numberline", from: 0, to: d, step: 5, jumps: d > toHour ? [[0, toHour], [toHour, d]] : [[0, d]] };
          },
        },
      ],
    },
    limits: "Start times to the 5 minutes on a 12-hour clock, lasting 5 to 90 minutes, answered in minutes; 24-hour times and days on a calendar are not included.",
  },
  // ------------------------------------------------------------------ metres and centimetres
  {
    id: "acmcm",
    arity: 3,
    title: "Changing metres and centimetres",
    competency: LEN,
    type: "integer",
    mc: true,
    // [a, b, dir]: dir 0: a m b cm → cm; dir 1: (100a + b) cm = a m and ? cm
    parse: none,
    reject: ([a, b, dir]) => (a < 1 || a > 9 || b < 0 || b > 99 || (dir !== 0 && dir !== 1) || (dir === 0 && b === 0) ? "Lengths from 1 m to 9 m 99 cm." : null),
    prompt: ([a, b, dir]) => (dir ? `${100 * a + b} cm = ${a} m and how many cm?` : `${a} m ${b} cm = how many centimetres?`),
    solve: ([a, b, dir]) => ({
      steps: [
        { id: "metres", op: "convert", competency: LEN, inputs: [a], value: 100 * a },
        dir ? { id: "rest", op: "subtract", competency: SUB, inputs: [100 * a + b, 100 * a], value: b } : { id: "add", op: "add", competency: ADD, inputs: [100 * a, b], value: 100 * a + b },
      ],
      answer: dir ? b : 100 * a + b,
    }),
    // independent: lay down metre sticks of 100 cm one at a time
    validate: ([a, b, dir], v) => {
      let cm = 0;
      for (let i = 0; i < a; i++) cm += 100;
      return dir ? v === 100 * a + b - cm && cm + (v as number) === 100 * a + b : v === cm + b;
    },
    bugs: ([a, b, dir]) => {
      if (dir) return [
        { id: "took-metres", kind: "conceptual", competency: LEN, says: `${a} was taken away, but ${a} m is ${100 * a} cm.`, predict: 100 * a + b - a },
        { id: "ten-cm", kind: "recall", competency: LEN, says: `A metre was taken as 10 cm; 1 metre is 100 centimetres.`, predict: 100 * a + b - 10 * a },
      ];
      return [
        b < 10
          ? { id: "wrote-together", kind: "conceptual", competency: LEN, says: `${a} and ${b} were written side by side (${a}${b}); ${a} m is ${100 * a} cm, so ${b} cm goes in the ones place: ${100 * a + b}.`, predict: Number(`${a}${b}`) }
          : { id: "ten-cm", kind: "recall", competency: LEN, says: "A metre was taken as 10 cm; 1 metre is 100 centimetres.", predict: 10 * a + b },
        { id: "added-numbers", kind: "conceptual", competency: LEN, says: `The numbers ${a} and ${b} were added, but metres and centimetres are different sizes: change the metres to centimetres first.`, predict: a + b },
      ];
    },
    distractors: ([a, b, dir]) => (dir ? [b + 10, 100 - b] : [100 * a + b + 100, 100 * a + 10 * b]),
    variants: () => [],
    explain: (s) => (s.id === "metres" ? `${s.inputs[0]} m = ${s.value} cm` : s.id === "add" ? `${s.inputs[0]} cm + ${s.inputs[1]} cm = ${s.value} cm` : `${s.inputs[0]} cm − ${s.inputs[1]} cm = ${s.value} cm left over`),
    domain: [[1, 9], [0, 99], [0, 1]],
    cap: 300,
    difficulty: ([, b, dir]) => (b % 10 === 0 && !dir ? 1 : b < 10 ? 3 : 2),
    word: ([a, b, dir]) => (dir ? `A ribbon is ${100 * a + b} cm long. That is ${a} metres and how many more centimetres?` : `${name(a + b)}'s rope is ${a} m ${b} cm long. How long is it in centimetres?`),
    teach: {
      idea: "1 metre is 100 centimetres, so each metre is a hundred in centimetres.",
      method: "Change the metres to centimetres by multiplying by 100, then add the extra centimetres (or take the metres away to find what is left).",
      visual: ([a, b]) => ({ type: "numberline", from: 0, to: (a + 1) * 100, step: 100, marks: [100 * a + b] }),
      alternatives: [
        { id: "place_value", title: "Metres are hundreds", kind: "conceptual", text: ["In centimetres the metres go in the hundreds place.", "3 m 7 cm is 3 hundreds, 0 tens and 7 ones: 307 cm."], visual: ([a, b]) => ({ type: "blocks", hundreds: a, tens: Math.floor(b / 10), ones: b % 10 }) },
      ],
    },
    limits: "Lengths up to 9 m 99 cm changed between m and cm; kilometres, millimetres and decimals of a metre are other families.",
  },
  // ------------------------------------------------------------------ rupees and paise
  {
    id: "acpaise",
    arity: 3,
    title: "Changing rupees and paise into paise",
    competency: MONEY,
    type: "integer",
    mc: true,
    // [r, p5, f]: ₹r and 5 p5 paise; f = 0 written in words, f = 1 written as ₹r.pp
    parse: none,
    reject: ([r, p5, f]) => (r < 1 || r > 20 || p5 < 0 || p5 > 19 || (f !== 0 && f !== 1) || (f === 0 && p5 === 0) ? "Amounts from ₹1 to ₹20.95 in steps of 5 paise." : null),
    prompt: ([r, p5, f]) => (f ? `How many paise make ₹${r}.${pad2(p5 * 5)}?` : `How many paise are there in ₹${r} and ${p5 * 5} paise?`),
    solve: ([r, p5]) => ({
      steps: [
        { id: "rupees", op: "convert", competency: MONEY, inputs: [r], value: 100 * r },
        { id: "add", op: "add", competency: ADD, inputs: [100 * r, p5 * 5], value: 100 * r + p5 * 5 },
      ],
      answer: 100 * r + p5 * 5,
    }),
    // independent: count ₹1 coins as 100 paise each, then the paise in 5s
    validate: ([r, p5], v) => {
      let n = 0;
      for (let i = 0; i < r; i++) n += 100;
      for (let i = 0; i < p5; i++) n += 5;
      return v === n;
    },
    bugs: ([r, p5, f]) => {
      const p = p5 * 5;
      return [
        p < 10
          ? { id: "wrote-together", kind: "conceptual", competency: MONEY, says: `${r} and ${p} were written side by side; ₹${r} is ${100 * r} paise, so the answer is ${100 * r} + ${p}.`, predict: Number(`${r}${p}`) }
          : { id: "ten-paise", kind: "recall", competency: MONEY, says: "₹1 was taken as 10 paise; ₹1 is 100 paise.", predict: 10 * r + p },
        { id: "added-numbers", kind: "conceptual", competency: MONEY, says: `${r} and ${p} were added, but a rupee and a paisa are different sizes: change the rupees to paise first.`, predict: r + p },
        ...(f && p > 0 ? [{ id: "paise-only", kind: "procedural", competency: MONEY, says: `Only the paise after the dot (${p}) were given; the ₹${r} before the dot are ${100 * r} paise more.`, predict: p } as Bug] : []),
      ];
    },
    distractors: ([r, p5]) => [100 * r + p5 * 5 + 100, 100 * r + p5 * 50],
    variants: () => [],
    explain: (s) => (s.id === "rupees" ? `₹${s.inputs[0]} = ${s.inputs[0]} × 100 paise = ${s.value} paise` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} paise`),
    domain: [[1, 20], [0, 19], [0, 1]],
    cap: 300,
    difficulty: ([r, p5]) => (r <= 5 && p5 % 2 === 0 ? 1 : p5 * 5 < 10 ? 3 : 2),
    figure: ([r, p5, f]) => ({ type: "table", head: ["Rupees (₹)", "Paise"], rows: [[r, f ? pad2(p5 * 5) : p5 * 5]] }),
    word: ([r, p5, f]) => (f ? `A pencil costs ₹${r}.${pad2(p5 * 5)}. How many paise is that?` : `${name(r + p5)} has ₹${r} and ${p5 * 5} paise in a purse. How many paise is that altogether?`),
    teach: {
      idea: "₹1 is 100 paise, so each rupee is a hundred paise; in ₹3.45 the 3 is rupees and the 45 is paise.",
      method: "Multiply the rupees by 100 to get paise, then add the paise.",
      visual: ([r, p5]) => (r <= 9 ? { type: "blocks", hundreds: r, tens: Math.floor((p5 * 5) / 10), ones: (p5 * 5) % 10 } : null),
      alternatives: [
        { id: "drop_dot", title: "Read the digits as paise", kind: "procedural", text: ["Write the amount with two digits after the dot: ₹3.05, ₹12.40.", "Read all the digits without the dot: ₹3.05 is 305 paise, ₹12.40 is 1240 paise."] },
      ],
    },
    limits: "Amounts up to ₹20.95 in steps of 5 paise, changed into paise; changing paise back into rupees is not included.",
  },
  {
    id: "acmoneyadd",
    arity: 5,
    title: "Adding and taking away rupees and paise",
    competency: MONEY,
    type: "fraction",
    mc: true,
    // [a, ap5, b, bp5, op]: ₹a.(5 ap5) + or − ₹b.(5 bp5)
    parse: none,
    reject: ([a, ap5, b, bp5, op]) => {
      if (a < 1 || a > 30 || ap5 < 0 || ap5 > 19 || b < 1 || b > 20 || bp5 < 0 || bp5 > 19 || (op !== 0 && op !== 1)) return "Amounts up to ₹30.95 and ₹20.95 in steps of 5 paise.";
      return op && 100 * a + 5 * ap5 <= 100 * b + 5 * bp5 ? "The amount taken away is smaller." : null;
    },
    keep: ([a, ap5, b, bp5, op]) => (op ? ap5 < bp5 : ap5 + bp5 >= 20) || (a + b + ap5 + bp5) % 6 === 0,
    prompt: ([a, ap5, b, bp5, op]) => `₹${a}.${pad2(5 * ap5)} ${op ? "−" : "+"} ₹${b}.${pad2(5 * bp5)} = ? Write the answer in rupees, like 4.50.`,
    solve: ([a, ap5, b, bp5, op]) => {
      const A = 100 * a + 5 * ap5;
      const B = 100 * b + 5 * bp5;
      const T = op ? A - B : A + B;
      const pa = 5 * ap5;
      const pb = 5 * bp5;
      return {
        steps: [
          { id: "paise", op: op ? "subtract" : "add", competency: MONEY, inputs: [pa, pb, op ? "−" : "+", op ? (pa < pb ? 1 : 0) : pa + pb >= 100 ? 1 : 0], value: op ? (pa < pb ? pa + 100 - pb : pa - pb) : (pa + pb) % 100 },
          { id: "rupees", op: op ? "subtract" : "add", competency: op ? SUBR : "MATH.number.addition-regroup", inputs: [a, b, op ? "−" : "+", op ? (pa < pb ? 1 : 0) : pa + pb >= 100 ? 1 : 0], value: Math.floor(T / 100) },
        ],
        answer: money(T),
      };
    },
    // independent: count everything in paise (₹1 = 100 paise) with loops, and compare with the answer read as paise
    validate: ([a, ap5, b, bp5, op], v) => {
      const s = String(v);
      if (!/^\d+(\.\d{1,2})?$/.test(s)) return false;
      let n = 0;
      for (let i = 0; i < a; i++) n += 100;
      for (let i = 0; i < ap5; i++) n += 5;
      for (let i = 0; i < b; i++) n += op ? -100 : 100;
      for (let i = 0; i < bp5; i++) n += op ? -5 : 5;
      return paiseOf(s) === n;
    },
    bugs: ([a, ap5, b, bp5, op]) => {
      const pa = 5 * ap5;
      const pb = 5 * bp5;
      const out: Bug[] = [];
      if (!op && pa + pb >= 100) {
        out.push({ id: "paise-over-100", kind: "conceptual", competency: MONEY, says: `The paise came to ${pa + pb}, which is more than 100: 100 paise make ₹1, so ${pa + pb} paise is ₹1 and ${pa + pb - 100} paise.`, predict: `${a + b}.${pa + pb}` });
        out.push({ id: "no-carry", kind: "procedural", competency: MONEY, says: "The rupee made from 100 paise was not carried to the rupees.", predict: money(100 * (a + b) + pa + pb - 100) });
      }
      if (op && pa < pb) {
        out.push({ id: "smaller-from-larger", kind: "conceptual", competency: SUBR, says: `In the paise, ${pb} − ${pa} was worked out instead. Change ₹1 into 100 paise first.`, predict: money(100 * (a - b) + pb - pa) });
        out.push({ id: "rupee-not-reduced", kind: "procedural", competency: SUBR, says: "₹1 was changed into 100 paise, but the rupees were not made one less.", predict: money(100 * (a - b) + pa + 100 - pb) });
      }
      return out;
    },
    distractors: ([a, ap5, b, bp5, op]) => {
      const T = op ? 100 * a + 5 * ap5 - 100 * b - 5 * bp5 : 100 * a + 5 * ap5 + 100 * b + 5 * bp5;
      return [money(T + 100), ...(T >= 100 ? [money(T - 100)] : []), money(T + 10), ...(T >= 10 ? [money(T - 10)] : [])];
    },
    variants: () => [],
    explain: (s) => {
      const carry = Number(s.inputs[3]);
      if (s.id === "paise") return s.inputs[2] === "+" ? `Paise: ${s.inputs[0]} + ${s.inputs[1]} = ${Number(s.inputs[0]) + Number(s.inputs[1])}${carry ? `, which is ₹1 and ${s.value} paise` : ""}` : `Paise: ${carry ? `change ₹1 into 100 paise, ${Number(s.inputs[0]) + 100}` : s.inputs[0]} − ${s.inputs[1]} = ${s.value}`;
      return s.inputs[2] === "+" ? `Rupees: ${s.inputs[0]} + ${s.inputs[1]}${carry ? " + 1 carried" : ""} = ₹${s.value}` : `Rupees: ${carry ? `${Number(s.inputs[0]) - 1}` : s.inputs[0]} − ${s.inputs[1]} = ₹${s.value}`;
    },
    domain: [[1, 30], [0, 19], [1, 20], [0, 19], [0, 1]],
    cap: 400,
    difficulty: ([a, ap5, b, bp5, op]) => {
      const regroup = op ? ap5 < bp5 : ap5 + bp5 >= 20;
      return !regroup && a + b <= 20 ? 1 : regroup && op ? 3 : 2;
    },
    figure: ([a, ap5, b, bp5, op]) => ({ type: "table", head: ["", "₹", "paise"], rows: [["", a, pad2(5 * ap5)], [op ? "−" : "+", b, pad2(5 * bp5)]] }),
    word: ([a, ap5, b, bp5, op]) => (op ? `${girl(a + b)} had ₹${a}.${pad2(5 * ap5)}. She spent ₹${b}.${pad2(5 * bp5)} on vegetables. How much money is left? Write the answer in rupees, like 4.50.` : `${girl(a + b)} buys a notebook for ₹${a}.${pad2(5 * ap5)} and a pen for ₹${b}.${pad2(5 * bp5)}. How much does she pay in all? Write the answer in rupees, like 4.50.`),
    teach: {
      idea: "Rupees and paise work like hundreds: 100 paise make ₹1, so paise over 100 become a rupee, and a rupee can be broken into 100 paise.",
      method: "Write the amounts one under the other with the dots in line. Add (or take away) the paise first, carrying or breaking ₹1 when needed, then the rupees.",
      visual: ([a, ap5, b, bp5, op]) => ({ type: "table", head: ["", "₹", "paise"], rows: [["", a, pad2(5 * ap5)], [op ? "−" : "+", b, pad2(5 * bp5)]] }),
      alternatives: [
        { id: "all_paise", title: "Work in paise", kind: "procedural", text: ["Change both amounts to paise: ₹12.50 is 1250 paise.", "Add or take away the whole numbers, then put the dot back two places from the right."] },
      ],
    },
    limits: "Adding or taking away two amounts up to ₹30.95 in steps of 5 paise; multiplying and dividing money and bills are other families.",
  },
];

// ---------------------------------------------------------------- helpers used above

const KEYS = [1, 2, 5, 10];
const THEMES = [
  { title: "the favourite fruits of a class", labels: ["Mango", "Banana", "Guava", "Apple"] },
  { title: "how the children of a class come to school", labels: ["Walk", "Bus", "Cycle", "Auto"] },
  { title: "the favourite games of a class", labels: ["Kabaddi", "Cricket", "Kho-kho", "Football"] },
];
/** Pictures in each of the four rows for data seed s (1 to 8 each). */
function pics(s: number): number[] {
  return [0, 1, 2, 3].map((c) => 1 + ((s * 5 + c * 3 + Math.floor(s / 2) * c + c * c) % 8));
}
const PAIRS: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
/** The pair of rows as [bigger, smaller]. */
function order(s: number, pr: number): [number, number] {
  const [x, y] = PAIRS[pr];
  return pics(s)[x] >= pics(s)[y] ? [x, y] : [y, x];
}
function story(op: number, i: number, j: number, c: number): string {
  if (op === 0) return [
    `Anu has ${10 + i} red bangles and ${j} green bangles. How many bangles does she have in all?`,
    `${10 + i} children are playing in the park. ${j} more children come to play. How many children are in the park now?`,
    `A farmer picks ${10 + i} brinjals in the morning and ${j} in the evening. How many brinjals does he pick that day?`,
  ][c];
  if (op === 1) return [
    `There are ${10 + i + j} laddus on a plate. The children eat ${j} of them. How many laddus are left?`,
    `${10 + i + j} birds sit on a wire. ${j} birds fly away. How many birds are still on the wire?`,
    `Ravi has ${10 + i + j} stamps. He gives ${j} stamps to his sister. How many stamps does he have now?`,
  ][c];
  if (op === 2) return [
    `There are ${i} plates with ${j} idlis on each plate. How many idlis are there altogether?`,
    `A shop has ${i} bunches of bananas with ${j} bananas in each bunch. How many bananas does the shop have?`,
    `Meena has ${i} boxes with ${j} crayons in each box. How many crayons does she have?`,
  ][c];
  return [
    `${i * j} sweets are shared equally among ${i} children. How many sweets does each child get?`,
    `${i * j} flowers are put equally into ${i} vases. How many flowers are in each vase?`,
    `${i * j} pencils are packed equally into ${i} boxes. How many pencils are in each box?`,
  ][c];
}
function sentence(f: number, a: number, b: number, c: number): string {
  return f === 0 ? `${a} + ${b} = □ + ${c}` : f === 1 ? `${a} + ${b} = ${c} + □` : `${a} − ${b} = □ − ${c}`;
}
function missingText(f: number, u: number, k: number): string {
  return f === 0 ? `□ + ${k} = ${u + k}` : f === 1 ? `${u + k} − □ = ${k}` : f === 2 ? `□ − ${k} = ${u - k}` : `${k} × □ = ${k * u}`;
}
const SHAPE: Record<number, string> = { 3: "triangle", 4: "square", 5: "pentagon", 6: "hexagon" };
const letters = (n: number) => "ABCDEFG".slice(0, n).split("").join(", ");
/** Point positions for the lines family: on one horizontal line (k = 0) or on a curve y = ±(x² + bx − 4) (k = 1), so
 * that no three are in a line. */
function layout(n: number, k: number, s: number): [number, number][] {
  if (!k) {
    const out: [number, number][] = [];
    let x = -10 + (s % 5);
    for (let i = 0; i < n; i++) {
      out.push([x, 3]);
      x += 2 + ((i + Math.floor(s / 5)) % 2);
    }
    return out;
  }
  const xs = [-3, -2, -1, 0, 1, 2, 3];
  const skip = new Set(Array.from({ length: 7 - n }, (_, i) => (s + 2 * i) % 7));
  const chosen = xs.filter((_, i) => !skip.has(i)).slice(0, n);
  const b = (s % 3) - 1;
  const sg = Math.floor(s / 3) % 2 ? -1 : 1;
  return chosen.map((x) => [x * 3, sg * (x * x + b * x - 4)] as [number, number]);
}
/** Tiles: [rows, columns, description]. */
const TILES: [number, number, string][] = [
  [1, 2, "2 squares side by side"],
  [2, 1, "2 squares, one above the other"],
  [2, 2, "a block of 2 rows of 2 squares"],
  [1, 3, "3 squares side by side"],
  [2, 3, "a block of 2 rows of 3 squares"],
];
/** The floor with its first tile shaded when the tile is one row tall; a taller tile cannot be shaded on the floor (the
 * grid shades row by row), so the picture shows one tile instead and the prompt gives the floor's size. */
const tileFigure = (R: number, C: number, ti: number): Visual => (TILES[ti][0] === 1 ? { type: "grid", rows: R, cols: C, shaded: TILES[ti][1] } : { type: "grid", rows: TILES[ti][0], cols: TILES[ti][1], shaded: TILES[ti][0] * TILES[ti][1] });
const nextH = (h: number) => (h === 12 ? 1 : h + 1);
/** The end time on a 12-hour clock after d minutes from h:m. */
function endOf(h: number, m: number, d: number): [number, number] {
  let ch = h;
  let t = m + d;
  while (t >= 60) {
    t -= 60;
    ch = nextH(ch);
  }
  return [ch, t];
}
