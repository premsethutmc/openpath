/**
 * Batch b03 (families@2), Grades 1–3: mental arithmetic with tens and hundreds, number lines, equal sharing,
 * subtraction with regrouping, halves and quarters, choosing an operation for a story, pictographs, balancing
 * number sentences, missing numbers, growing patterns, line segments, tiling, elapsed time, metres and centimetres,
 * rupees and paise. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";
import { factSlip, near } from "../family-kit";

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
      if (typeof v !== "number") return false;
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
  // ================================================================== gap@1 additions (g0304)
  {
    id: "acstory9",
    arity: 4,
    title: "Small number stories: adding or taking away within 9",
    competency: OPC,
    type: "integer",
    mc: true,
    // [op, a, b, c]: op 0, a things and b more come (a + b ≤ 9); op 1, a things and b go away (b < a ≤ 9); c the story
    parse: none,
    reject: ([op, a, b, c]) => (op < 0 || op > 1 || a < 1 || a > 9 || b < 1 || b > 8 || c < 0 || c > 3 || (op === 0 ? a + b > 9 : b >= a) ? "A one-step story with numbers within 9." : null),
    prompt: ([op, a, b, c]) => story9(op, a, b, c),
    solve: ([op, a, b]) => ({
      steps: [st("choose", "choose operation", OPC, [op ? "take away" : "add"], op), st("work", op ? "subtract" : "add", op ? SUB : ADD, [a, b, op ? "−" : "+"], op ? a - b : a + b)],
      answer: op ? a - b : a + b,
    }),
    // independent: act the story out with counters, one at a time
    validate: ([op, a, b], v) => {
      let n = 0;
      for (let k = 0; k < a; k++) n++;
      for (let k = 0; k < b; k++) n += op ? -1 : 1;
      return v === n;
    },
    bugs: ([op, a, b]) => {
      const r = op ? a - b : a + b;
      const out: Bug[] = op
        ? [
            B("added", "conceptual", OPC, "The two numbers were added, but in the story some go away, so we take away.", a + b),
            B("count-back-start", "procedural", SUB, `When counting back from ${a}, the ${a} itself was counted as the first step. The first step back lands on ${a - 1}.`, a - b + 1),
          ]
        : [
            ...(a !== b ? [B("took-away", "conceptual", OPC, "The smaller number was taken from the bigger one, but in the story more come, so we add.", Math.abs(a - b))] : []),
            B("count-on-start", "procedural", ADD, `When counting on from ${a}, the ${a} itself was counted as the first step. The first step on lands on ${a + 1}.`, a + b - 1),
          ];
      return out.filter((x) => x.predict !== r);
    },
    distractors: ([op, a, b]) => {
      const r = op ? a - b : a + b;
      return [r + 1, r + 2, ...(r > 1 ? [r - 1] : [])];
    },
    variants: () => [],
    explain: (s) => (s.id === "choose" ? (s.value ? "Some go away: take away" : "More come, or two groups are put together: add") : `${s.inputs[0]} ${s.inputs[2]} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 1], [1, 9], [1, 8], [0, 3]],
    difficulty: ([op, a, b]) => (op === 0 && b <= 2 ? 1 : op === 1 && a - b <= 2 ? 3 : 2),
    figure: ([, a]) => ({ type: "dots", count: a, rows: 1 }),
    word: ([op, a, b, c]) => story9(op, a, b, (c + 1) % 4),
    teach: {
      idea: "In a number story, things are either put together (add) or some go away (take away).",
      method: "Ask: do more come, or do some go? Then count on or count back that many from the first number.",
      visual: ([op, a, b]) => (op ? { type: "numberline", from: 0, to: 9, step: 1, jumps: [[a, a - b]] } : { type: "numberline", from: 0, to: 9, step: 1, jumps: [[a, a + b]] }),
      alternatives: [
        { id: "fingers", title: "Show it with fingers or stones", kind: "conceptual", text: ["Hold up fingers (or put down stones) for the first number.", "Put up more for the ones that come, or fold down the ones that go, then count what is left."], visual: ([, a]) => ({ type: "tenframe", filled: a }) },
      ],
    },
    limits: "One-step adding and taking-away stories within 9 (Grade 1); larger numbers are acstory and acstory4; making up one's own story is a written task.",
  },
  {
    id: "acsubn",
    arity: 2,
    title: "Subtracting two-digit numbers without regrouping",
    competency: SUBR,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").replace(/−/g, "-").match(/^(\d{2})-(\d{2})=?\??$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([a, b]) => (a < 20 || a > 99 || b < 10 || b >= a || a % 10 < b % 10 ? "Two-digit subtraction where no ten has to be broken into ones." : null),
    prompt: ([a, b]) => `${a} − ${b} = ?`,
    solve: ([a, b]) => ({
      steps: [st("ones", "subtract", SUB, [a % 10, b % 10], (a % 10) - (b % 10)), st("tens", "subtract", SUB, [Math.floor(a / 10), Math.floor(b / 10)], Math.floor(a / 10) - Math.floor(b / 10))],
      answer: a - b,
    }),
    // independent: count up from b to a
    validate: ([a, b], v) => {
      if (typeof v !== "number" || v < 0) return false;
      let x = b;
      for (let i = 0; i < v; i++) x++;
      return x === a;
    },
    bugs: ([a, b]) => [
      B("added", "conceptual", SUB, "The two numbers were added; the − sign means take away.", a + b),
      B("ones-only", "procedural", SUB, `Only the ones were taken away. The ${nn(Math.floor(b / 10), "ten", "tens")} of ${b} must be taken from the tens too.`, a - (b % 10)),
      ...(b % 10 ? [B("tens-only", "procedural", SUB, `Only the tens were taken away. The ${nn(b % 10, "one", "ones")} of ${b} must be taken from the ones too.`, a - 10 * Math.floor(b / 10))] : []),
    ],
    variants: () => [],
    explain: (s) => `${s.id === "ones" ? "Ones" : "Tens"}: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`,
    domain: [[20, 99], [10, 98]],
    cap: 300,
    difficulty: ([a, b]) => (b % 10 === 0 ? 1 : a - b < 10 ? 3 : 2),
    figure: ([a]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 }),
    word: ([a, b]) => `${boy(a + b)} had ${a} stamps. He gave ${b} stamps to his cousin. How many stamps does he have now?`,
    teach: {
      idea: "Take away ones from ones and tens from tens. When each top digit is big enough, no ten needs to be broken.",
      method: "Write the numbers one under the other. Subtract the ones, then the tens.",
      visual: ([a]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 }),
      alternatives: [
        { id: "jump_back", title: "Jump back in tens, then ones", kind: "procedural", text: ["Start at the first number. Jump back one ten at a time for the tens of the second number.", "Then jump back the ones."], visual: ([a, b]) => ({ type: "numberline", from: a - b, to: a, step: 1, jumps: [[a, a - 10 * Math.floor(b / 10)], [a - 10 * Math.floor(b / 10), a - b]] }) },
      ],
    },
    limits: "Two-digit subtraction with no regrouping; regrouping is acsub2, three-digit and larger numbers are adcolx. It sits under the regrouping competency as its no-regroup starting case (curriculum outcomes rely on that placement).",
  },
  {
    id: "acequal",
    arity: 4,
    title: "Are the parts equal? Checking halves and quarters",
    competency: FRAC,
    type: "choice",
    // [k, n, d, c]: a whole of k × n units cut into k pieces (k = 2 halves, 4 quarters); d = 0 equal pieces of n,
    // d = 1 or 2 one unit moved from one piece to another; c the object (chocolate bar, ribbon, rope)
    parse: none,
    reject: ([k, n, d, c]) => ((k !== 2 && k !== 4) || n < 2 || n > (k === 2 ? 12 : 6) || d < 0 || d > 2 || c < 0 || c > 2 ? "A whole cut into 2 or 4 pieces, equal or not." : null),
    choices: (p) => eqChoices(p),
    prompt: ([k, n, , c]) => {
      const O = EQOBJ[c];
      return `${O.the} in the picture is ${k * n} ${O.unit} long and is cut at the dots into ${k} pieces. Is each piece ${k === 2 ? "one half" : "one quarter"} of ${O.it}?`;
    },
    solve: ([k, n, d, c]) => {
      const L = piecesOf(k, n, d);
      const eq = L.every((x) => x === L[0]);
      return { steps: [st("measure", "count", "MATH.number.count-objects", L, L.join(", ")), st("compare", "compare", FRAC, [k], eq ? "equal" : "not equal")], answer: posOf([k, n, d, c], 2, eq ? 0 : 1) };
    },
    // independent: read the piece lengths off the picture (the gaps between the cuts) and see whether they are all the same
    validate: (p, v) => {
      const [k, n, d, c] = p;
      const fig = eqFigure(k, n, d) as unknown as { to: number; marks: number[] };
      const cuts = [0, ...fig.marks, fig.to];
      const sizes = cuts.slice(1).map((x, i) => x - cuts[i]);
      const same = sizes.length === k && sizes.every((x) => x === sizes[0]);
      return typeof v === "number" && eqChoices(p)[v] === eqBase(k, c)[same ? 0 : 1];
    },
    bugs: ([k, n, d, c]) =>
      d === 0
        ? []
        : [B("counted-pieces", "conceptual", FRAC, `There are ${k} pieces, but that alone does not make them ${k === 2 ? "halves" : "quarters"}: they must all be the same size. Count the ${EQOBJ[c].unit} in each piece.`, posOf([k, n, d, c], 2, 0))],
    variants: () => [],
    explain: (s) => (s.id === "measure" ? `The pieces are ${s.value} long` : s.value === "equal" ? "All the pieces are the same size, so they are equal parts" : "The pieces are not all the same size, so they are not equal parts"),
    domain: [[2, 4], [2, 12], [0, 2], [0, 2]],
    difficulty: ([k, , d]) => (d === 0 ? 1 : k === 2 ? 2 : 3),
    figure: ([k, n, d]) => eqFigure(k, n, d),
    word: ([k, n, d, c]) => {
      const O = EQOBJ[(c + 1) % 3];
      const L = piecesOf(k, n, d);
      return `${girl(k + n + d)} ${O.cut} ${O.a} ${k * n} ${O.unit} long into ${k} pieces of ${L.slice(0, -1).join(", ")} and ${L[L.length - 1]} ${O.unit}. Is each piece ${k === 2 ? "one half" : "one quarter"} of ${O.it}?`;
    },
    teach: {
      idea: "Halves are 2 EQUAL parts and quarters are 4 EQUAL parts of the same whole. Cutting into 2 or 4 pieces is not enough: the pieces must be the same size.",
      method: "Count (or measure) each piece. If every piece is the same size, each is a half (of 2) or a quarter (of 4); if not, they are not halves or quarters.",
      visual: ([k]) => ({ type: "strips", top: 1, bottom: k, shaded: 1 }),
      alternatives: [
        { id: "fold", title: "Fold and match", kind: "conceptual", text: ["Fold the strip so that one piece lies on top of the other.", "If the pieces match exactly, they are equal; if one sticks out, they are not halves."], visual: ([k, n, d]) => eqFigure(k, n, d) },
      ],
    },
    limits: "A straight whole of up to 24 units cut into 2 or 4 pieces, equal or with one unit moved; shapes cut in other ways are drawn and marked by an educator.",
  },
  {
    id: "acnlcmp",
    arity: 4,
    title: "Comparing four-digit numbers by where they lie on a number line",
    competency: NL,
    type: "choice",
    // [sc, b, s, q]: sc 0, a line from b000 to (b+1)000 in hundreds; sc 1, a line from 0 to 10 000 in thousands;
    // four numbers made from the same digits (seed s); q 0 the dot farthest right, q 1 farthest left
    parse: none,
    reject: (p) => {
      const [sc, b, s, q] = p;
      if (sc < 0 || sc > 1 || b < 1 || b > 9 || s < 0 || s > 19 || q < 0 || q > 1) return "Four four-digit numbers on a line of thousands or of hundreds.";
      const key = [...nlNums(sc, b, s)].sort().join();
      for (let b0 = 1; b0 <= 9; b0++) for (let s0 = 0; s0 < 20; s0++) if ((b0 < b || (b0 === b && s0 < s)) && [...nlNums(sc, b0, s0)].sort().join() === key) return "An earlier seed shows the same numbers (distinct@1).";
      return null;
    },
    choices: ([sc, b, s]) => nlNums(sc, b, s).map(ind),
    prompt: ([sc, b, s, q]) => `The numbers ${listOf(nlNums(sc, b, s).map(ind))} are to be marked on a number line from ${sc === 0 ? ind(b * 1000) : 0} to ${sc === 0 ? ind(b * 1000 + 1000) : ind(10000)}. Which number will be farthest to the ${q ? "left" : "right"}?`,
    solve: ([sc, b, s, q]) => {
      const N = nlNums(sc, b, s);
      const t = q ? Math.min(...N) : Math.max(...N);
      return { steps: [st("compare", "compare", NL, N, t), st("place", "locate", NL, [q ? "left" : "right"], t)], answer: N.indexOf(t) };
    },
    // independent: compare the numbers digit by digit from the left, as written (all have four digits)
    validate: ([sc, b, s, q], v) => {
      const W = nlNums(sc, b, s).map(String);
      if (typeof v !== "number" || !W[v]) return false;
      return W.every((w, i) => i === v || (q ? W[v] < w : W[v] > w));
    },
    bugs: ([sc, b, s, q]) => {
      const N = nlNums(sc, b, s);
      const right = N.indexOf(q ? Math.min(...N) : Math.max(...N));
      const ones = N.map((x) => x % 10);
      const o = ones.indexOf(q ? Math.min(...ones) : Math.max(...ones));
      const opp = N.indexOf(q ? Math.max(...N) : Math.min(...N));
      return [
        ...(o !== right ? [B("ones-digit", "conceptual", "MATH.number.compare-numbers", `The numbers were compared by their ones digits. Compare the thousands first, then the hundreds, then the tens: the first place where the digits differ decides.`, o)] : []),
        B("left-is-bigger", "conceptual", NL, `The ${q ? "biggest" : "smallest"} number was put at the ${q ? "left" : "right"}. On a number line the numbers get bigger to the right.`, opp),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "compare" ? "Compare the numbers place by place, starting with the thousands" : `Bigger numbers lie further right, so ${s.value} is farthest to the ${s.inputs[0]}`),
    domain: [[0, 1], [1, 9], [0, 19], [0, 1]],
    cap: 400,
    difficulty: ([sc, , , q]) => (sc === 1 ? 1 : q ? 3 : 2),
    word: ([sc, b, s, q]) => `Four villages are on one straight road, at milestones ${listOf(nlNums(sc, b, s).map(ind))} metres from the start. The numbers go up as you walk along the road away from the start. Which milestone is ${q ? "nearest to" : "farthest from"} the start?`,
    teach: {
      idea: "On a number line, a number further to the right is bigger. Four-digit numbers are compared place by place from the thousands.",
      method: "Look at the thousands digits; if they are the same, the hundreds; then the tens; then the ones. The first place that differs tells which number is bigger and so further right.",
      visual: ([sc, b, s]) => (sc === 0 ? { type: "numberline", from: b * 1000, to: b * 1000 + 1000, step: 100, marks: nlNums(sc, b, s) } : { type: "numberline", from: 0, to: 10000, step: 1000, marks: nlNums(sc, b, s) }),
      alternatives: [
        { id: "place_table", title: "Line up the digits in a place-value table", kind: "procedural", text: ["Write each number in a Th H T O table, one under another.", "Go down the columns from the left; the first column that differs decides."], visual: ([sc, b, s]) => ({ type: "table", head: ["Th", "H", "T", "O"], rows: nlNums(sc, b, s).map((x) => String(x).split("").map(Number)) }) },
      ],
    },
    limits: "Four numbers made from the same digits on a line of hundreds (within one thousand) or of thousands; five-digit numbers and estimating a position between marks are not included.",
  },
  {
    id: "acmcmp",
    arity: 4,
    title: "Comparing lengths written in metres and centimetres",
    competency: LEN,
    type: "choice",
    // [a, b, t, k]: a m b cm against N cm: t 0, N = 100a + b; t 1, a trap (b < 10: 100a + 10b; else the digits of b
    // swapped); t 2, N = 100a + b + k − 5 (k ≠ 5)
    parse: none,
    reject: ([a, b, t, k]) => {
      if (a < 1 || a > 9 || b < 1 || b > 99 || t < 0 || t > 2 || k < 0 || k > 10) return "Lengths from 1 m 1 cm to 9 m 99 cm.";
      if (t < 2 && k !== 0) return "Only the near lengths use k.";
      const e = mcE(b, t, k);
      return e === null || e < 0 || e > 99 || (t !== 0 && e === b) ? "The second length is in the same metre and differs as set." : null;
    },
    keep: ([a, b, t, k]) => (t === 0 ? (a + b) % 2 === 0 : t === 1 ? true : (a * 7 + b + k) % 6 === 0),
    choices: (p) => mcChoices(p),
    prompt: ([a, b, t, k]) => `Which is longer: ${a} m ${b} cm or ${100 * a + (mcE(b, t, k) ?? 0)} cm?`,
    solve: ([a, b, t, k]) => {
      const N = 100 * a + (mcE(b, t, k) ?? 0);
      const A = 100 * a + b;
      return { steps: [st("convert", "convert", LEN, [a, b], A), st("compare", "compare", LEN, [A, N], A > N ? 0 : A < N ? 1 : 2)], answer: posOf([a, b, t, k], 3, A > N ? 0 : A < N ? 1 : 2) };
    },
    // independent: compare the metres first, then the centimetres (no conversion)
    validate: (p, v) => {
      const [a, b, t, k] = p;
      const N = 100 * a + (mcE(b, t, k) ?? 0);
      const m2 = Math.floor(N / 100);
      const c2 = N - 100 * m2;
      const w = a > m2 || (a === m2 && b > c2) ? 0 : a < m2 || (a === m2 && b < c2) ? 1 : 2;
      return typeof v === "number" && mcChoices(p)[v] === mcBase(p)[w];
    },
    bugs: (p) => {
      const [a, b, t, k] = p;
      const N = 100 * a + (mcE(b, t, k) ?? 0);
      const A = 100 * a + b;
      const right = A > N ? 0 : A < N ? 1 : 2;
      const cmp = (x: number) => (x > N ? 0 : x < N ? 1 : 2);
      const out: Bug[] = [];
      const joined = Number(`${a}${b}`);
      if (cmp(joined) !== right) out.push(B("joined", "conceptual", LEN, `${a} m ${b} cm was read as ${joined} cm, the two numbers side by side. ${a} m is ${100 * a} cm, so ${a} m ${b} cm is ${A} cm.`, posOf(p, 3, cmp(joined))));
      if (b < 10 && cmp(100 * a + 10 * b) !== right) out.push(B("tens", "conceptual", LEN, `${a} m ${b} cm was taken as ${100 * a + 10 * b} cm. ${b} cm is only ${b} ones of centimetres: ${a} m ${b} cm = ${A} cm.`, posOf(p, 3, cmp(100 * a + 10 * b))));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "convert" ? `${s.inputs[0]} m ${s.inputs[1]} cm = ${s.value} cm` : `Compare ${s.inputs[0]} cm with ${s.inputs[1]} cm`),
    domain: [[1, 9], [1, 99], [0, 2], [0, 10]],
    cap: 400,
    difficulty: ([, b, t]) => (t === 0 ? 2 : b < 10 ? 3 : 2),
    word: ([a, b, t, k]) => `${girl(a + b)}'s skipping rope is ${a} m ${b} cm long. ${boy(a + k)}'s rope is ${100 * a + (mcE(b, t, k) ?? 0)} cm long. Whose rope is longer?`,
    teach: {
      idea: "1 m = 100 cm, so a m b cm is a hundreds of centimetres and b more: 3 m 5 cm = 305 cm.",
      method: "Change the length in metres and centimetres into centimetres, then compare the two numbers of centimetres.",
      visual: ([a, b]) => ({ type: "numberline", from: 100 * a, to: 100 * a + 100, step: 10, marks: [100 * a + b] }),
      alternatives: [
        { id: "metres_first", title: "Compare metres, then centimetres", kind: "procedural", text: ["Write the centimetre length in metres and centimetres too: 350 cm = 3 m 50 cm.", "Compare the metres; if they are the same, compare the centimetres."] },
      ],
    },
    limits: "A length in metres and centimetres against one in centimetres, in the same metre (up to 9 m 99 cm); lengths with millimetres and kilometres are other families.",
  },
  {
    id: "acplace",
    arity: 2,
    title: "Placing digit cards to make the largest or smallest sum or difference",
    competency: MISS,
    type: "integer",
    mc: true,
    // [i, g]: the i-th set of four different digits 1–9; g 0 largest sum, 1 smallest sum, 2 largest difference of two two-digit numbers
    parse: none,
    reject: ([i, g]) => (i < 0 || i > 125 || g < 0 || g > 2 ? "Four different digit cards from 1 to 9 and one of three goals." : null),
    prompt: ([i, g]) => `Use each of the digit cards in the picture (${cardsOf(i).join(", ")}) once to make two two-digit numbers. What is the ${["largest sum", "smallest sum", "largest difference"][g]} you can get?`,
    solve: ([i, g]) => {
      const [a, b, c, d] = quads()[i];
      const [x, y] = g === 0 ? [10 * d + b, 10 * c + a] : g === 1 ? [10 * a + c, 10 * b + d] : [10 * d + c, 10 * a + b];
      const r = g === 2 ? x - y : x + y;
      return { steps: [st("place", "place digits", MISS, [x, y], `${x} and ${y}`), st("work", g === 2 ? "subtract" : "add", g === 2 ? SUB : ADD, [x, y], r)], answer: r };
    },
    // independent: try every way of placing the four cards and keep the best
    validate: ([i, g], v) => {
      const D = quads()[i];
      let best: number | null = null;
      for (const P of perms(D)) {
        const x = 10 * P[0] + P[1];
        const y = 10 * P[2] + P[3];
        const r = g === 2 ? x - y : x + y;
        if (best === null || (g === 1 ? r < best : r > best)) best = r;
      }
      return v === best;
    },
    bugs: ([i, g]) => {
      const [a, b, c, d] = quads()[i];
      if (g === 0) return [B("big-number-first", "procedural", MISS, "The biggest two-digit number was made first and the other two cards were used for the second number. For the largest sum, both tens places need the two biggest digits.", 10 * d + c + 10 * b + a)];
      if (g === 1) return [B("small-number-first", "procedural", MISS, "The smallest two-digit number was made first and the other two cards were used for the second number. For the smallest sum, both tens places need the two smallest digits.", 10 * a + b + 10 * c + d)];
      return [B("second-not-smallest", "procedural", MISS, `The second number was made with the larger of the two cards left in the tens place. To take away as little as possible, it must be the smallest number those cards make: ${10 * a + b}.`, 10 * d + c - (10 * b + a))];
    },
    distractors: ([i, g]) => {
      const [a, b, c, d] = quads()[i];
      const r = g === 0 ? 10 * (d + c) + a + b : g === 1 ? 10 * (a + b) + c + d : 10 * d + c - 10 * a - b;
      return [r + 10, r - 9, r + 9];
    },
    variants: () => [],
    explain: (s) => (s.id === "place" ? `Put the digits so the numbers are ${s.value}` : `${s.inputs[0]} ${s.op === "subtract" ? "−" : "+"} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 125], [0, 2]],
    cap: 300,
    difficulty: ([, g]) => (g === 0 ? 1 : g === 1 ? 2 : 3),
    figure: ([i]) => ({ type: "table", head: ["Card", "Card", "Card", "Card"], rows: [cardsOf(i)] }),
    word: ([i, g]) => `${name(i)} and ${name(i + 3)} play a card game with the cards ${cardsOf(i).join(", ")}. Each card is used once to make two two-digit numbers, and the winner gets the ${["largest sum", "smallest sum", "largest difference"][g]}. What is the best ${g === 2 ? "difference" : "sum"} anyone can make?`,
    teach: {
      idea: "A digit in the tens place is worth ten times as much as in the ones place, so the digits that matter most go in the tens places.",
      method: "For the largest sum, put the two biggest digits in the tens places; for the smallest sum, the two smallest. For the largest difference, make the biggest number you can and take away the smallest number the other two cards make.",
      visual: ([i]) => ({ type: "table", head: ["Tens", "Ones", "", "Tens", "Ones"], rows: [["□", "□", "+", "□", "□"]], note: cardsOf(i).join(", ") }),
      alternatives: [
        { id: "try_some", title: "Try and improve", kind: "procedural", text: ["Make any two numbers and work out the answer.", "Swap two cards and see whether the answer gets better; keep the swap if it does."] },
      ],
    },
    limits: "Two two-digit numbers from four different digit cards 1 to 9; grids with more boxes and magic figures are other families. Digit-card placement is reasoning about unknown digits, kept under missing numbers, where the curriculum outcomes place it.",
  },
  {
    id: "acelhm",
    arity: 5,
    title: "Time intervals in hours and minutes",
    competency: TIME,
    type: "tuple",
    mc: true,
    // [sh, sm5, dh, dm5, mode]: start sh:(5 sm5) p.m., a duration of dh hours 5 dm5 minutes; mode 0 find the duration
    // from the start and end, mode 1 find the end time
    parse: none,
    reject: ([sh, sm5, dh, dm5, mode]) =>
      sh < 1 || sh > 8 || sm5 < 0 || sm5 > 11 || dh < 1 || dh > 3 || dm5 < 0 || dm5 > 11 || mode < 0 || mode > 1 || 60 * sh + 5 * sm5 + 60 * dh + 5 * dm5 > 11 * 60 + 55 ? "A start from 1 p.m. and 1 to 3 hours and some minutes, ending before midnight." : null,
    prompt: ([sh, sm5, dh, dm5, mode]) => {
      const S = 60 * sh + 5 * sm5;
      const E = S + 60 * dh + 5 * dm5;
      return mode === 0
        ? `A function in the school hall starts at ${pm(S)} and ends at ${pm(E)} How long does it last? Write the answer as (hours, minutes), for example (2, 15).`
        : `A cricket practice starts at ${pm(S)} and lasts ${pl3(dh, "hour")} ${pl3(5 * dm5, "minute")}. At what time does it end? Write the time as (hours, minutes): for example, (5, 25) means 5:25 p.m.`;
    },
    solve: ([sh, sm5, dh, dm5, mode]) => {
      const S = 60 * sh + 5 * sm5;
      const D = 60 * dh + 5 * dm5;
      const E = S + D;
      return mode === 0
        ? { steps: [st("to-hour", "count on", TIME, [pm(S), pm(Math.ceil(S / 60) * 60)], Math.ceil(S / 60) * 60 - S), st("hours", "count on", TIME, [pm(Math.ceil(S / 60) * 60), pm(Math.floor(E / 60) * 60)], Math.floor(E / 60) - Math.ceil(S / 60)), st("rest", "count on", TIME, [pm(Math.floor(E / 60) * 60), pm(E)], E % 60), st("total", "add", TIME, [Math.ceil(S / 60) * 60 - S, E % 60], `(${dh}, ${5 * dm5})`)], answer: `(${dh}, ${5 * dm5})` }
        : { steps: [st("hours", "add", TIME, [pm(S), dh], pm(S + 60 * dh)), st("minutes", "add", TIME, [pm(S + 60 * dh), 5 * dm5], pm(E))], answer: `(${Math.floor(E / 60)}, ${E % 60})` };
    },
    // independent: run a clock forward one minute at a time
    validate: ([sh, sm5, dh, dm5, mode], v) => {
      const t = tup(v);
      if (t.length !== 2 || !t.every(Number.isInteger) || t[1] < 0 || t[1] >= 60 || t[0] < 0) return false;
      const S = 60 * sh + 5 * sm5;
      const E = S + 60 * dh + 5 * dm5;
      let h = sh;
      let m = 5 * sm5;
      const tick = () => {
        m++;
        if (m === 60) {
          m = 0;
          h++;
        }
      };
      if (mode === 0) {
        for (let i = 0; i < 60 * t[0] + t[1] && i < 2000; i++) tick();
        return 60 * h + m === E;
      }
      for (let i = 0; i < 60 * dh + 5 * dm5; i++) tick();
      return h === t[0] && m === t[1];
    },
    bugs: ([sh, sm5, dh, dm5, mode]) => {
      const S = 60 * sh + 5 * sm5;
      const E = S + 60 * dh + 5 * dm5;
      const [eh, em, sm] = [Math.floor(E / 60), E % 60, 5 * sm5];
      if (mode === 0) {
        if (em < sm)
          return [
            B("smaller-from-larger", "procedural", TIME, `In the minutes, ${sm} − ${em} was worked out instead of ${em} − ${sm}. Count on from ${pm(S)} to the next o'clock first.`, `(${eh - sh}, ${sm - em})`),
            B("hour-as-100", "conceptual", TIME, "An hour was broken into 100 minutes, as if time were counted in hundreds. An hour has 60 minutes.", `(${eh - sh - 1}, ${em + 100 - sm})`),
          ];
        return em > sm ? [B("hours-only", "procedural", TIME, "Only the hours were counted; the minutes from the start to the end were left out.", `(${eh - sh}, 0)`)] : [];
      }
      if (sm + 5 * dm5 >= 60)
        return [
          B("no-carry", "conceptual", TIME, `The minutes came to ${sm + 5 * dm5}, but 60 minutes make 1 hour: change 60 of them into an hour.`, `(${sh + dh}, ${sm + 5 * dm5})`),
          B("carry-kept-minutes", "procedural", TIME, "One hour was added for the 60 minutes, but those 60 minutes were not taken away from the minutes.", `(${sh + dh + 1}, ${sm + 5 * dm5})`),
        ];
      return [B("hours-not-added", "procedural", TIME, `Only the minutes were added; the ${pl3(dh, "hour")} of the duration were left out.`, `(${sh}, ${sm + 5 * dm5})`)];
    },
    distractors: ([sh, sm5, dh, dm5, mode]) => {
      const S = 60 * sh + 5 * sm5;
      const E = S + 60 * dh + 5 * dm5;
      const [h, m] = mode === 0 ? [dh, 5 * dm5] : [Math.floor(E / 60), E % 60];
      return [`(${h + 1}, ${m})`, `(${h}, ${(m + 10) % 60})`, `(${h - 1}, ${m})`, `(${h}, ${(m + 50) % 60})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs[0]} minutes and ${s.inputs[1]} minutes with the whole hours in between: ${s.value}` : s.id === "hours" && typeof s.inputs[1] === "number" ? `${s.inputs[0]} + ${pl3(Number(s.inputs[1]), "hour")} = ${s.value}` : s.id === "minutes" ? `${s.inputs[0]} + ${s.inputs[1]} minutes = ${s.value}` : `From ${s.inputs[0]} to ${s.inputs[1]}: ${s.value}`),
    domain: [[1, 8], [0, 11], [1, 3], [0, 11], [0, 1]],
    cap: 400,
    difficulty: ([, sm5, , dm5, mode]) => (dm5 === 0 || sm5 === 0 ? 1 : mode === 0 ? (5 * sm5 > (5 * sm5 + 5 * dm5) % 60 ? 3 : 2) : 5 * sm5 + 5 * dm5 >= 60 ? 3 : 2),
    word: ([sh, sm5, dh, dm5, mode]) => {
      const S = 60 * sh + 5 * sm5;
      const E = S + 60 * dh + 5 * dm5;
      return mode === 0
        ? `${name(sh + dm5)} left home for the temple festival at ${pm(S)} and came back at ${pm(E)} How long was ${name(sh + dm5)} away? Write (hours, minutes).`
        : `A bus leaves Salem at ${pm(S)}, and the journey takes ${pl3(dh, "hour")} ${pl3(5 * dm5, "minute")}. At what time does the bus arrive? Write (hours, minutes), like (5, 25) for 5:25 p.m.`;
    },
    teach: {
      idea: "Time is counted in hours of 60 minutes, so we count on to the next o'clock, then whole hours, then the minutes left.",
      method: "To find a duration: count on from the start to the next o'clock, then the whole hours, then on to the end, and add. To find an end time: add the hours, then the minutes, changing 60 minutes into an hour.",
      visual: ([sh, sm5]) => ({ type: "clock", h: sh, m: 5 * sm5 }),
      alternatives: [
        { id: "time_line", title: "Draw a time line", kind: "procedural", text: ["Mark the start, the o'clocks in between and the end on a line.", "Write the minutes or hours of each jump and add them."], visual: ([sh, sm5, dh, dm5]) => ({ type: "numberline", from: 0, to: 60 * dh + 5 * dm5, step: 15, jumps: [[0, 60 - 5 * sm5 || 60], [60 - 5 * sm5 || 60, 60 * dh + 5 * dm5]] }) },
      ],
    },
    limits: "Afternoon and evening times from 1 p.m., lasting 1 to 3 hours 55 minutes on the same day; journeys across midnight and timetables are actrain.",
  },
  {
    id: "acpicttab",
    arity: 4,
    title: "Pictographs and tables: completing, totals and the largest group",
    competency: PIC,
    type: "integer",
    mc: true,
    // [ki, s, j, q]: key [2, 5, 10][ki], data seed s; q 0 how many pictures to draw for row j (from a table),
    // q 1 the total of the pictograph, q 2 the largest group (j = 0 for q 1, 2)
    parse: none,
    reject: ([ki, s, j, q]) => {
      if (ki < 0 || ki > 2 || s < 0 || s > 29 || j < 0 || j > 3 || q < 0 || q > 2) return "A four-row pictograph with a key of 2, 5 or 10.";
      if (q > 0 && j !== 0) return "The total and the largest group use the whole pictograph.";
      for (let s0 = s % 3; s0 < s; s0 += 3) if (pics(s0).join() === pics(s).join()) return "An earlier seed draws the same pictograph (distinct@1).";
      return null;
    },
    prompt: ([ki, s, j, q]) => {
      const K = PKEY[ki];
      const T = THEMES[s % 3];
      if (q === 0) return `The table shows ${T.title}. A pictograph of it is drawn with each ● standing for ${K} children. How many ● should be drawn for ${T.labels[j]}?`;
      return `The pictograph shows ${T.title}. Each ● stands for ${K} children. ${q === 1 ? "How many children are there in all?" : "How many children are in the largest group?"}`;
    },
    solve: ([ki, s, j, q]) => {
      const K = PKEY[ki];
      const p = pics(s);
      if (q === 0) return { steps: [st("divide", "divide", PIC, [p[j] * K, K], p[j])], answer: p[j] };
      if (q === 1) return { steps: [st("pictures", "add", ADD, p, p.reduce((a, b) => a + b, 0)), st("key", "multiply", PIC, [p.reduce((a, b) => a + b, 0), K], p.reduce((a, b) => a + b, 0) * K)], answer: p.reduce((a, b) => a + b, 0) * K };
      return { steps: [st("longest", "compare", PIC, p, Math.max(...p)), st("key", "multiply", PIC, [Math.max(...p), K], Math.max(...p) * K)], answer: Math.max(...p) * K };
    },
    // independent: skip-count in the key along each row of the picture
    validate: ([ki, s, j, q], v) => {
      const K = PKEY[ki];
      const rows = pics(s).map((n) => {
        let c = 0;
        for (let i = 0; i < n; i++) c += K;
        return c;
      });
      if (q === 0) {
        let c = 0;
        let n = 0;
        while (c < rows[j]) {
          c += K;
          n++;
        }
        return c === rows[j] && v === n;
      }
      if (q === 1) return v === rows.reduce((a, b) => a + b, 0);
      return v === rows.reduce((a, b) => (b > a ? b : a), 0);
    },
    bugs: ([ki, s, j, q]) => {
      const K = PKEY[ki];
      const p = pics(s);
      const tot = p.reduce((a, b) => a + b, 0);
      if (q === 0) return [B("one-each", "conceptual", PIC, `One ● was drawn for each child, but each ● stands for ${K} children: share the number into groups of ${K}.`, p[j] * K)];
      if (q === 1) return [B("no-key", "conceptual", PIC, `The pictures were counted, but each ● stands for ${K} children.`, tot), B("missed-row", "procedural", PIC, "One row was left out of the total. Add every row.", [...new Set(p.map((x) => (tot - x) * K))])];
      return [B("no-key", "conceptual", PIC, `The pictures in the longest row were counted, but each ● stands for ${K} children.`, Math.max(...p)), ...(Math.min(...p) !== Math.max(...p) ? [B("smallest", "procedural", PIC, "The shortest row was read. The largest group has the longest row of pictures.", Math.min(...p) * K)] : [])];
    },
    distractors: ([ki, s, j, q]) => {
      const K = PKEY[ki];
      const p = pics(s);
      const r = q === 0 ? p[j] : q === 1 ? p.reduce((a, b) => a + b, 0) * K : Math.max(...p) * K;
      return q === 0 ? [r + 1, r + 2, r - 1].filter((x) => x > 0) : [r + K, r - K, r + 2 * K];
    },
    variants: () => [],
    explain: (s) => (s.id === "divide" ? `${s.inputs[0]} children ÷ ${s.inputs[1]} = ${s.value} pictures` : s.id === "pictures" ? `There are ${s.inputs.join(" + ")} = ${s.value} pictures in all` : s.id === "longest" ? `The longest row has ${s.value} pictures` : `${s.inputs[0]} pictures × ${s.inputs[1]} = ${s.value} children`),
    domain: [[0, 2], [0, 29], [0, 3], [0, 2]],
    cap: 300,
    difficulty: ([ki, , , q]) => (q === 2 && ki === 0 ? 1 : q === 1 ? 3 : 2),
    figure: ([ki, s, , q]) => (q === 0 ? { type: "table", head: ["Choice", "Children"], rows: THEMES[s % 3].labels.map((l, i) => [l, pics(s)[i] * PKEY[ki]]) } : { type: "pictograph", labels: THEMES[s % 3].labels, counts: pics(s).map((x) => x * PKEY[ki]), key: PKEY[ki] }),
    word: ([ki, s, j, q]) => {
      const K = PKEY[ki];
      const T = THEMES[s % 3];
      const p = pics(s);
      if (q === 0) return `${name(s)} is drawing a pictograph for the school notice board. ${p[j] * K} children chose ${T.labels[j]}, and one ● will stand for ${K} children. How many ● should ${name(s)} draw?`;
      return `${name(s)}'s school put up this pictograph of ${T.title}, one ● for ${K} children. The teacher asks: ${q === 1 ? "how many children were asked altogether?" : "how many children chose the most popular one?"}`;
    },
    teach: {
      idea: "Every picture stands for the key's number of children, so the number of pictures is the number of children shared into groups of the key, and the children are the pictures times the key.",
      method: "To draw a row, divide the number by the key. To read the pictograph, count the pictures and multiply by the key; for the total, add all the pictures first.",
      visual: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: pics(s).map((x) => x * PKEY[ki]), key: PKEY[ki] }),
      alternatives: [
        { id: "table", title: "Write the table beside the pictograph", kind: "procedural", text: ["Make a column for the pictures and a column for the children.", "Fill each row: pictures × key = children, or children ÷ key = pictures."], visual: ([ki, s]) => ({ type: "table", head: ["Choice", "Pictures", "Children"], rows: THEMES[s % 3].labels.map((l, i) => [l, pics(s)[i], pics(s)[i] * PKEY[ki]]) }) },
      ],
    },
    limits: "Four rows of whole pictures with a key of 2, 5 or 10; half pictures are acpicthalf, drawing the pictograph is a written task.",
  },
  {
    id: "acfacts",
    arity: 3,
    title: "Related facts: addition and subtraction, multiplication and division",
    competency: MISS,
    type: "choice",
    // [mode, x, y]: mode 0 the subtraction fact of a + b = c; 1 the addition that checks c − b = a; 2 the division fact
    // of a × b = c; 3 dividend = divisor × quotient for c ÷ a = b; x the numbers, y the order
    parse: none,
    reject: ([mode, x, y]) => (mode < 0 || mode > 3 || x < 0 || x > 39 || y < 0 || y > 1 ? "Four kinds of related fact." : mode === 3 && y === 1 ? "dividend = divisor × quotient keeps its order." : null),
    choices: (p) => factChoices(p),
    prompt: ([mode, x, y]) => {
      const [a, b, c] = factNums(mode, x);
      if (mode === 0) return `${ind(a)} + ${ind(b)} = ${ind(c)}. Which subtraction fact belongs to the same fact family?`;
      if (mode === 1) return `${name(x)} worked out ${ind(c)} − ${ind(b)} = ${ind(a)}. Which addition can ${name(x)} use to check this answer?`;
      if (mode === 2) return `${a} × ${b} = ${c}. Which division fact comes from this multiplication fact?`;
      return `In ${c} ÷ ${a} = ${b}, ${c} is the dividend, ${a} the divisor and ${b} the quotient. Which sentence shows dividend = divisor × quotient for it?`;
    },
    solve: (p) => ({ steps: [st("relate", "inverse", MISS, factNums(p[0], p[1]), factOptions(p)[0])], answer: posOf(p, 4, 0) }),
    // independent: read the chosen sentence, work out both sides and check that it is true and of the kind asked
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const o = factChoices(p)[v];
      if (!o) return false;
      const [a, b, c] = factNums(p[0], p[1]);
      const r = readFact(o);
      if (!r || !r.true) return false;
      if (p[0] === 0) return r.op === "−" && r.lone === "right";
      if (p[0] === 1) return r.op === "+" && r.lone === "right" && r.lv === c;
      if (p[0] === 2) return r.op === "÷" && r.lone === "right";
      return r.op === "×" && r.lone === "left" && r.lv === c && a * b === c;
    },
    bugs: (p) => {
      const m = p[0];
      if (m === 0) return [B("kept-order", "conceptual", MISS, "The numbers were kept in the order of the addition. A subtraction fact from a + b = c starts with the total c and takes away one part.", posOf(p, 4, 1))];
      if (m === 1) return [B("added-given", "conceptual", MISS, "The two numbers of the subtraction were added. To check c − b = a, add the answer a back to b: you should get c.", posOf(p, 4, 1))];
      if (m === 2) return [B("kept-order", "conceptual", MISS, "The numbers were kept in the order of the multiplication. A division fact starts with the product and divides it by one factor.", posOf(p, 4, 1))];
      return [B("divisor-as-dividend", "conceptual", MISS, "The divisor was written as the dividend. The dividend is the number being divided, and it equals divisor × quotient.", posOf(p, 4, 1))];
    },
    variants: () => [],
    explain: (s) => `Adding and taking away (or multiplying and dividing) undo each other, so the related fact is ${s.value}`,
    domain: [[0, 3], [0, 39], [0, 1]],
    // level@1: four-digit sums Grade 4, five-digit Grade 5; multiplication facts beyond 10 × 10 (÷ 11, ÷ 12) Grade 4
    grade: ([mode, x]) => {
      const [a, b, c] = factNums(mode, x);
      if (mode <= 1) return String(c).length >= 5 ? 5 : 4;
      return a <= 10 && b <= 10 ? 3 : 4;
    },
    cap: 320,
    difficulty: ([m]) => (m === 0 ? 1 : m === 3 ? 3 : 2),
    word: ([mode, x, y]) => {
      const [a, b, c] = factNums(mode, x);
      if (mode === 0) return `A school had ${ind(a)} books and got ${ind(b)} more, so it now has ${ind(c)} books. Which subtraction fact belongs to the same fact family?`;
      if (mode === 1) return `A shop had ${ind(c)} kg of rice and sold ${ind(b)} kg. The shopkeeper says ${ind(a)} kg is left. Which addition checks this?`;
      if (mode === 2) return `${a} boxes hold ${b} mangoes each, ${c} mangoes in all. Which division fact comes from this?`;
      return `${c} laddus are packed ${a} in a box, filling ${b} boxes, so ${c} ÷ ${a} = ${b}. Which sentence shows dividend = divisor × quotient?`;
    },
    teach: {
      idea: "Adding and taking away undo each other, and so do multiplying and dividing: a + b = c gives c − a = b and c − b = a; a × b = c gives c ÷ a = b and c ÷ b = a.",
      method: "Start the subtraction (or division) with the biggest number of the family, the total (or product). To check a subtraction, add the answer to the number taken away; to check a division, multiply the divisor by the quotient.",
      visual: ([mode, x]) => {
        const [a, b, c] = factNums(mode, x);
        return { type: "table", head: ["Whole", "Part", "Part"], rows: [[c, a, b]] };
      },
      alternatives: [
        { id: "triangle", title: "A fact triangle", kind: "conceptual", text: ["Write the whole (the total or the product) at the top of a triangle and the two parts at the bottom.", "Every fact of the family uses these three numbers: the top is always the result of + or ×, and the start of − or ÷."] },
      ],
    },
    limits: "Related facts for one addition (numbers up to five digits) or one multiplication (up to 12 × 21); remainders are other families.",
  },
  {
    id: "acmmkm",
    arity: 3,
    title: "Millimetres, centimetres, metres and kilometres",
    competency: LEN,
    type: "integer",
    mc: true,
    // [mode, a, b]: 0 a cm b mm → mm; 1 (10a + b) mm = a cm and ? mm; 2 (1000a + 5b) m = a km and ? m; 3 1000a m → km; 4 10a mm → cm
    parse: none,
    reject: ([mode, a, b]) => {
      if (mode < 0 || mode > 4 || a < 1 || b < 0 || b > 99) return "Five kinds of length change.";
      if (mode <= 1) return a > 30 || b < 1 || b > 9 ? "Up to 30 cm 9 mm." : null;
      if (mode === 2) return a > 9 || b < 1 ? "Up to 9 km 495 m." : null;
      return a > 30 || b !== 0 ? "Whole kilometres or centimetres up to 30." : null;
    },
    prompt: ([mode, a, b]) => [`${a} cm ${b} mm = how many millimetres?`, `${10 * a + b} mm = ${a} cm and how many mm?`, `${ind(1000 * a + 5 * b)} m = ${a} km and how many m?`, `${ind(1000 * a)} m = how many kilometres?`, `${10 * a} mm = how many centimetres?`][mode],
    solve: ([mode, a, b]) => {
      if (mode === 0) return { steps: [st("convert", "convert", LEN, [a, "cm", 10], 10 * a), st("add", "add", ADD, [10 * a, b], 10 * a + b)], answer: 10 * a + b };
      if (mode === 1) return { steps: [st("convert", "convert", LEN, [a, "cm", 10], 10 * a), st("rest", "subtract", SUB, [10 * a + b, 10 * a], b)], answer: b };
      if (mode === 2) return { steps: [st("convert", "convert", LEN, [a, "km", 1000], 1000 * a), st("rest", "subtract", SUB, [1000 * a + 5 * b, 1000 * a], 5 * b)], answer: 5 * b };
      return { steps: [st("group", "divide", LEN, [mode === 3 ? 1000 * a : 10 * a, mode === 3 ? 1000 : 10], a)], answer: a };
    },
    // independent: lay down whole centimetres (10 mm) or kilometres (1000 m) one at a time
    validate: ([mode, a, b], v) => {
      if (typeof v !== "number") return false;
      const unit = mode === 2 || mode === 3 ? 1000 : 10;
      const total = mode === 0 ? null : mode === 1 ? 10 * a + b : mode === 2 ? 1000 * a + 5 * b : mode === 3 ? 1000 * a : 10 * a;
      if (mode === 0) {
        let n = b;
        for (let i = 0; i < a; i++) n += 10;
        return v === n;
      }
      let rest = total as number;
      let n = 0;
      while (rest >= unit && n < a) {
        rest -= unit;
        n++;
      }
      return mode <= 2 ? v === rest && n === a : (() => {
        let r2 = total as number;
        let c = 0;
        while (r2 > 0) {
          r2 -= unit;
          c++;
        }
        return r2 === 0 && v === c;
      })();
    },
    bugs: ([mode, a, b]) => {
      if (mode === 0) return [B("cm-as-100", "recall", LEN, "A centimetre was taken as 100 mm; 1 cm = 10 mm.", 100 * a + b), B("added", "conceptual", LEN, "The numbers were added as they are; change the centimetres into millimetres first.", a + b)];
      if (mode === 1) return [B("took-a", "conceptual", LEN, `${a} was taken away, but ${a} cm is ${10 * a} mm.`, 10 * a + b - a), ...(a !== b ? [B("gave-cm", "procedural", LEN, "The whole centimetres were given; the question asks for the millimetres left over.", a)] : [])];
      if (mode === 2) return [B("took-a", "conceptual", LEN, `${a} was taken away, but ${a} km is ${ind(1000 * a)} m.`, 1000 * a + 5 * b - a), B("km-as-100", "recall", LEN, "A kilometre was taken as 100 m; 1 km = 1000 m.", 1000 * a + 5 * b - 100 * a)];
      if (mode === 3) return [B("km-as-100", "recall", LEN, "A kilometre was taken as 100 m, so the metres were divided by 100; 1 km = 1000 m.", 10 * a), B("km-as-10", "recall", LEN, "The metres were divided by 10; 1 km = 1000 m.", 100 * a)];
      return [B("cm-as-100", "recall", LEN, "A centimetre was taken as 100 mm; 1 cm = 10 mm.", a % 10 === 0 ? a / 10 : null), B("multiplied", "conceptual", LEN, "The millimetres were multiplied by 10; going to a bigger unit gives a smaller number, so divide.", 100 * a)];
    },
    distractors: ([mode, a, b]) => {
      const r = mode === 0 ? 10 * a + b : mode === 1 ? b : mode === 2 ? 5 * b : a;
      return [r + 10, r + 1, r * 10].filter((x) => x > 0 && x !== r);
    },
    variants: () => [],
    explain: (s) => (s.id === "convert" ? `${s.inputs[0]} ${s.inputs[1]} = ${s.value} ${s.inputs[1] === "cm" ? "mm" : "m"}` : s.id === "group" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : s.id === "add" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} mm` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} left over`),
    domain: [[0, 4], [1, 30], [0, 99]],
    cap: 400,
    difficulty: ([mode]) => (mode === 0 || mode === 4 ? 1 : mode === 2 ? 3 : 2),
    word: ([mode, a, b]) => [`${a < 20 ? "A pencil" : "A ribbon"} is ${a} cm ${b} mm long. How long is it in millimetres?`, `${a < 6 ? "A beetle" : a < 20 ? "A pencil" : "A ribbon"} is ${10 * a + b} mm long. That is ${a} cm and how many more millimetres?`, `${name(a + b)} walks ${ind(1000 * a + 5 * b)} m to school. That is ${a} km and how many more metres?`, `A cycle race is ${ind(1000 * a)} m long. How many kilometres is that?`, `A paper strip is ${10 * a} mm long. How many centimetres is that?`][mode],
    teach: {
      idea: "10 mm = 1 cm, 100 cm = 1 m and 1000 m = 1 km. Going to a smaller unit gives a bigger number; going to a bigger unit makes groups.",
      method: "To change to the smaller unit, multiply by 10 (cm to mm) or 1000 (km to m) and add the rest. To change to the bigger unit, make groups of 10 or 1000; what is left stays in the smaller unit.",
      visual: ([mode, a, b]) => (mode <= 1 ? { type: "numberline", from: 10 * a, to: 10 * a + 10, step: 1, marks: [10 * a + b] } : { type: "numberline", from: 0, to: 1000 * (a + 1), step: 1000, marks: [mode === 2 ? 1000 * a + 5 * b : 1000 * a] }),
      alternatives: [
        { id: "ruler", title: "Look at a ruler", kind: "conceptual", text: ["Between two centimetre numbers on a ruler there are 10 small marks: millimetres.", "So 4 cm 3 mm is 4 groups of 10 small marks and 3 more: 43 mm."] },
      ],
    },
    limits: "Whole numbers: millimetres up to 30 cm 9 mm and metres up to 9 km 495 m; decimals of a unit are acdecu.",
  },
  {
    id: "accal",
    arity: 3,
    title: "Patterns in calendars and on the clock",
    competency: TIME,
    type: "integer",
    mc: true,
    // [mode, x, y]: 0 a 3 × 3 calendar block with top-left date x (1–15), kind y (0 all nine, 1 corners, 2 middle row,
    // 3 diagonal); 1 the middle date of a block whose nine dates add to 9x (x 9–23, y 0); 2 the hour hand at x, k = y hours later (13–40)
    parse: none,
    reject: ([mode, x, y]) => {
      if (mode === 0) return x < 1 || x > 15 || y < 0 || y > 3 ? "A 3 × 3 block of dates inside one month." : null;
      if (mode === 1) return x < 9 || x > 23 || y !== 0 ? "A middle date from 9 to 23." : null;
      if (mode === 2) return x < 1 || x > 12 || y < 13 || y > 40 ? "An hour from 1 to 12 and 13 to 40 hours later." : null;
      return "Three kinds of pattern.";
    },
    prompt: ([mode, x, y]) =>
      mode === 0
        ? `The picture shows a 3 × 3 block of dates from a calendar. Use the pattern instead of adding the dates one by one: what is ${["the sum of all nine dates", "the sum of the four corner dates", "the sum of the three dates in the middle row", "the sum of the three dates on the diagonal from top left to bottom right"][y]}?`
        : mode === 1
          ? `On a calendar, the nine dates of a 3 × 3 block add up to ${9 * x}. What is the date in the middle of the block?`
          : `The hour hand of a clock points to ${x}. Where will it point ${y} hours later?`,
    solve: ([mode, x, y]) => {
      if (mode === 0) {
        const m = [9, 4, 3, 3][y];
        return { steps: [st("centre", "add", ADD, [x, 8], x + 8), st("pattern", "multiply", TIME, [m, x + 8], m * (x + 8))], answer: m * (x + 8) };
      }
      if (mode === 1) return { steps: [st("share", "divide", TIME, [9 * x, 9], x)], answer: x };
      const r = ((x - 1 + y) % 12) + 1;
      return { steps: [st("rounds", "divide", TIME, [y, 12], y % 12), st("move", "count on", TIME, [x, y % 12], r)], answer: r };
    },
    // independent: build the calendar block and add the dates, or move the hand one hour at a time
    validate: ([mode, x, y], v) => {
      if (typeof v !== "number") return false;
      if (mode === 2) {
        let h = x;
        for (let i = 0; i < y; i++) h = h === 12 ? 1 : h + 1;
        return v === h;
      }
      const t = mode === 0 ? x : v - 8;
      const g = [0, 1, 2].map((r) => [0, 1, 2].map((c) => t + 7 * r + c));
      const cells = mode === 1 ? g.flat() : [g.flat(), [g[0][0], g[0][2], g[2][0], g[2][2]], g[1], [g[0][0], g[1][1], g[2][2]]][y];
      const s = cells.reduce((a, b) => a + b, 0);
      return mode === 0 ? v === s : t >= 1 && s === 9 * x;
    },
    bugs: ([mode, x, y]) => {
      if (mode === 0) {
        const m = [9, 4, 3, 3][y];
        return [B("used-first-date", "conceptual", TIME, `The first date (${x}) was used in place of the middle date. The pattern works with the middle date, ${x + 8}: each date is as much above it as its partner is below it.`, m * x), ...(y === 0 ? [B("one-row", "procedural", TIME, "Only the middle row was added. All three rows must be added (or the middle date taken 9 times).", 3 * (x + 8))] : [])];
      }
      if (mode === 1) return [B("divided-by-3", "conceptual", TIME, "The sum was divided by 3, but there are 9 dates, each balancing around the middle one: divide by 9.", 3 * x)];
      const r = ((x - 1 + y) % 12) + 1;
      return [B("no-wrap", "conceptual", TIME, "The hours were counted on past 12, but on a clock the hand goes round: after 12 comes 1 again.", x + y), ...(x + y - 12 > 12 ? [B("wrapped-once", "procedural", TIME, "12 was taken away only once; take 12 away for every full turn of the hand.", x + y - 12)] : [])].filter((b) => b.predict !== r);
    },
    distractors: ([mode, x, y]) => {
      const r = mode === 0 ? [9, 4, 3, 3][y] * (x + 8) : mode === 1 ? x : ((x - 1 + y) % 12) + 1;
      return mode === 2 ? [(r % 12) + 1, r === 1 ? 12 : r - 1, ((r + 5) % 12) + 1] : [r + 7, r - 1, r + 9];
    },
    variants: () => [],
    explain: (s) => (s.id === "centre" ? `The middle date is ${s.inputs[0]} + 8 = ${s.value}` : s.id === "pattern" ? `The dates balance around the middle: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : s.id === "share" ? `Nine dates balance around the middle: ${s.inputs[0]} ÷ 9 = ${s.value}` : s.id === "rounds" ? `Every 12 hours the hand is back where it started; ${s.inputs[0]} hours is ${s.value} hours more than whole turns` : `${s.inputs[1]} hours on from ${s.inputs[0]}: ${s.value}`),
    domain: [[0, 2], [1, 23], [0, 40]],
    difficulty: ([mode, , y]) => (mode === 2 ? (y <= 24 ? 2 : 3) : mode === 1 ? 2 : y === 0 ? 1 : 2),
    figure: ([mode, x]) => (mode === 0 ? { type: "table", head: ["", "", ""], rows: [0, 1, 2].map((r) => [0, 1, 2].map((c) => x + 7 * r + c)) } : mode === 2 ? { type: "clock", h: x, m: 0 } : null),
    word: ([mode, x, y]) =>
      mode === 0
        ? `${name(x + y)} draws a square around nine dates on the wall calendar, like the picture, starting with ${x}. ${["What do all nine dates add up to?", "What do the four corner dates add up to?", "What do the three dates in the middle row add up to?", "What do the three dates on the diagonal from top left add up to?"][y]}`
        : mode === 1
          ? `${name(x)} drew a square around nine dates on a calendar, and they add up to ${9 * x}. On which date is the middle of the square?`
          : `It is ${x} o'clock at the railway station. A goods train will come ${y} hours from now. What o'clock will it be then?`,
    teach: {
      idea: "In a calendar the date below is 7 more and the date to the right is 1 more, so in a 3 × 3 block every date is balanced by a partner around the middle date. On a clock the hour hand comes back to the same place every 12 hours.",
      method: "Find the middle date and multiply it by how many dates you add. For the clock, take away 12 hours for every full turn, then count on what is left.",
      visual: ([mode, x]) => (mode === 0 ? { type: "table", head: ["", "", ""], rows: [0, 1, 2].map((r) => [0, 1, 2].map((c) => x + 7 * r + c)) } : { type: "clock", h: mode === 2 ? x : 12, m: 0 }),
      alternatives: [
        { id: "pairs", title: "Pair up the dates", kind: "conceptual", text: ["In a block, the top-left and bottom-right dates add up to twice the middle date, and so do the other opposite pairs.", "So nine dates are four pairs and the middle: 9 times the middle date."] },
      ],
    },
    limits: "3 × 3 blocks inside one month and the hour hand up to 40 hours later; days of the week after many days are anweek. Calendar-block sums are pattern work kept under elapsed time, where the curriculum outcomes place them.",
  },
  {
    id: "acpicthalf",
    arity: 4,
    title: "Reading a pictograph with half pictures",
    competency: PIC,
    type: "integer",
    mc: true,
    // [ki, s, j, q]: key [2, 4, 10, 20][ki]; each row has a whole number of half pictures (seed s); q 0 read row j, q 1 the total (j = 0)
    parse: none,
    reject: ([ki, s, j, q]) => {
      if (ki < 0 || ki > 3 || s < 0 || s > 29 || j < 0 || j > 3 || q < 0 || q > 1) return "A four-row pictograph with half pictures and an even key.";
      if (q === 1 && j !== 0) return "The total uses every row.";
      const h = halves(ki, s);
      if (h.every((x) => x % 2 === 0)) return "At least one row has a half picture.";
      if (q === 0 && h.filter((x) => x % 2 === 1).length === 0) return "A half picture somewhere.";
      for (let s0 = 0; s0 < s; s0++) if (halves(ki, s0).join() === h.join() && THEMES[s0 % 3] === THEMES[s % 3]) return "An earlier seed draws the same pictograph (distinct@1).";
      return null;
    },
    prompt: ([ki, s, j, q]) => {
      const K = HKEY[ki];
      const T = THEMES[s % 3];
      return `The pictograph shows ${T.title}. Each ● stands for ${K} children, and a half ● stands for ${K / 2}. ${q ? "How many children are there in all?" : `How many children chose ${T.labels[j]}?`}`;
    },
    solve: ([ki, s, j, q]) => {
      const K = HKEY[ki];
      const h = halves(ki, s);
      const n = q ? h.reduce((a, b) => a + b, 0) : h[j];
      return { steps: [st("halves", "count", PIC, [q ? "all rows" : THEMES[s % 3].labels[j]], n), st("value", "multiply", PIC, [n, K / 2], (n * K) / 2)], answer: (n * K) / 2 };
    },
    // independent: count whole pictures as the key and a half picture as half the key, row by row
    validate: ([ki, s, j, q], v) => {
      const K = HKEY[ki];
      const rows = halves(ki, s).map((x) => {
        let c = 0;
        for (let i = 0; i < Math.floor(x / 2); i++) c += K;
        if (x % 2) c += K / 2;
        return c;
      });
      return v === (q ? rows.reduce((a, b) => a + b, 0) : rows[j]);
    },
    bugs: ([ki, s, j, q]) => {
      const K = HKEY[ki];
      const h = halves(ki, s);
      const odd = q ? h.some((x) => x % 2) : h[j] % 2 === 1;
      const sum = (f: (x: number) => number) => (q ? h.reduce((a, x) => a + f(x), 0) : f(h[j]));
      const out: Bug[] = [];
      if (odd) {
        out.push(B("half-as-whole", "conceptual", PIC, `The half ● was counted as a whole ●. A half picture stands for half the key: ${K / 2}.`, sum((x) => Math.ceil(x / 2) * K)));
        out.push(B("half-left-out", "procedural", PIC, `The half ● was left out. It stands for ${nn(K / 2, "child", "children")}.`, sum((x) => Math.floor(x / 2) * K)));
      }
      const pics2 = sum((x) => x) / 2;
      if (Number.isInteger(pics2)) out.push(B("no-key", "conceptual", PIC, `The pictures were counted, but each ● stands for ${K} children.`, pics2));
      return out;
    },
    distractors: ([ki, s, j, q]) => {
      const K = HKEY[ki];
      const h = halves(ki, s);
      const r = ((q ? h.reduce((a, b) => a + b, 0) : h[j]) * K) / 2;
      return [r + K, r + K / 2, r - K / 2].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "halves" ? `Count in half pictures for ${s.inputs[0]}: ${s.value} halves` : `${s.inputs[0]} halves × ${s.inputs[1]} = ${s.value} children`),
    domain: [[0, 3], [0, 29], [0, 3], [0, 1]],
    cap: 300,
    difficulty: ([ki, , , q]) => (q ? 3 : ki <= 1 ? 1 : 2),
    figure: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: halves(ki, s).map((x) => (x * HKEY[ki]) / 2), key: HKEY[ki] }),
    word: ([ki, s, j, q]) => `${name(s + 4)}'s class put up this pictograph of ${THEMES[s % 3].title}, where one ● is ${HKEY[ki]} children and a half ● is ${HKEY[ki] / 2}. ${q ? "How many children took part in all?" : `How many children chose ${THEMES[s % 3].labels[j]}?`}`,
    teach: {
      idea: "A whole picture stands for the key; a half picture stands for half the key.",
      method: "Count the whole pictures and multiply by the key, then add half the key for a half picture.",
      visual: ([ki, s]) => ({ type: "pictograph", labels: THEMES[s % 3].labels, counts: halves(ki, s).map((x) => (x * HKEY[ki]) / 2), key: HKEY[ki] }),
      alternatives: [
        { id: "count_halves", title: "Count in halves", kind: "procedural", text: ["Count every half of a picture: a whole picture is two halves.", "Multiply the number of halves by half the key."] },
      ],
    },
    limits: "Four rows with whole and half pictures and a key of 2, 4, 10 or 20; quarter pictures and drawing pictographs (a written task) are not included.",
  },
  {
    id: "acdecu",
    arity: 2,
    title: "Writing a length in a larger unit as a decimal",
    competency: LEN,
    type: "fraction",
    decimals: true,
    mc: true,
    // [mode, n]: 0 n cm in m; 1 n mm in cm; 2 n m in km; 3 (n/100) m in cm
    parse: none,
    reject: ([mode, n]) => {
      if (mode === 0) return n < 5 || n > 999 || n % 100 === 0 ? "5 to 999 cm, not whole metres." : null;
      if (mode === 1) return n < 5 || n > 999 || n % 10 === 0 ? "5 to 999 mm, not whole centimetres." : null;
      if (mode === 2) return n < 50 || n > 9990 || n % 10 !== 0 || n % 1000 === 0 ? "50 to 9990 m in tens, not whole kilometres." : null;
      if (mode === 3) return n < 101 || n > 999 || n % 100 === 0 ? "1.01 to 9.99 m." : null;
      return "Four kinds of change.";
    },
    keep: ([mode, n]) => (mode === 2 ? n % 50 === 0 || n % 7 === 0 : mode === 3 ? n % 3 === 0 : true),
    prompt: ([mode, n]) => [`Write ${n} cm in metres, as a decimal.`, `Write ${n} mm in centimetres, as a decimal.`, `Write ${ind(n)} m in kilometres, as a decimal.`, `${dec2(n)} m = how many centimetres?`][mode],
    solve: ([mode, n]) => {
      const [k, ans] = mode === 0 ? [100, n / 100] : mode === 1 ? [10, n / 10] : mode === 2 ? [1000, n / 1000] : [100, n];
      return { steps: [st("unit", "recall", LEN, [mode], k), st("convert", mode === 3 ? "multiply" : "divide", LEN, [mode === 3 ? dec2(n) : n, k], ans)], answer: ans };
    },
    // independent: change the answer back to the smaller unit and compare
    validate: ([mode, n], v) => {
      const x = Number(String(v));
      if (!Number.isFinite(x)) return false;
      if (mode === 0) return near(x * 100, n) && Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;
      if (mode === 1) return near(x * 10, n);
      if (mode === 2) return near(x * 1000, n);
      return near(x / 100, n / 100) && Number.isInteger(Math.round(x * 1e6) / 1e6);
    },
    bugs: ([mode, n]) => {
      if (mode === 0) return [B("m-as-10", "recall", LEN, "The centimetres were divided by 10, as if 1 m were 10 cm; 1 m = 100 cm.", n / 10), B("m-as-1000", "recall", LEN, "The centimetres were divided by 1000; 1 m = 100 cm, so divide by 100.", n / 1000)];
      if (mode === 1) return [B("cm-as-100", "recall", LEN, "The millimetres were divided by 100; 1 cm = 10 mm, so divide by 10.", n / 100)];
      if (mode === 2) return [B("km-as-100", "recall", LEN, "The metres were divided by 100; 1 km = 1000 m, so divide by 1000.", n / 100), B("km-as-10", "recall", LEN, "The metres were divided by 10; 1 km = 1000 m.", n / 10)];
      return [B("m-as-1000", "recall", LEN, "The metres were multiplied by 1000; 1 m = 100 cm.", 10 * n), B("m-as-10", "recall", LEN, "The metres were multiplied by 10; 1 m = 100 cm.", n / 10)];
    },
    distractors: ([mode, n]) => (mode === 3 ? [n + 10, n - 1] : [(mode === 0 ? n / 100 : mode === 1 ? n / 10 : n / 1000) * 10]),
    variants: () => [],
    explain: (s) => (s.id === "unit" ? `The bigger unit is ${s.value} of the smaller unit` : `${s.inputs[0]} ${s.op === "multiply" ? "×" : "÷"} ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 3], [5, 9990]],
    // level@1: tenths of a centimetre Grade 4; hundredths of a metre and thousandths of a kilometre Grade 5
    grade: ([mode]) => (mode === 1 ? 4 : 5),
    cap: 400,
    difficulty: ([mode, n]) => (mode === 0 && n >= 100 ? 1 : mode === 2 && (n < 1000 || n % 100 !== 0) ? 3 : 2),
    word: ([mode, n]) => [`${n < 300 ? "A plant" : "A young coconut tree"} has grown ${n} cm tall. How tall is it in metres? Write a decimal.`, `${n < 100 ? "A screw" : "A strip of ribbon"} is ${n} mm long. How long is it in centimetres? Write a decimal.`, `${name(n)} jogs ${ind(n)} m in the morning. How many kilometres is that? Write a decimal.`, `A saree border is ${dec2(n)} m long. How many centimetres is that?`][mode],
    teach: {
      idea: "1 m = 100 cm, so 1 cm is one hundredth of a metre; 1 cm = 10 mm, so 1 mm is a tenth of a centimetre; 1 km = 1000 m, so 1 m is a thousandth of a kilometre.",
      method: "To write a length in the bigger unit, divide by 100, 10 or 1000: move the digits that many places to the right of the decimal point. To go back, multiply.",
      visual: ([mode, n]) => (mode === 0 ? { type: "table", head: ["m", ".", "tenths", "hundredths"], rows: [[Math.floor(n / 100), ".", Math.floor(n / 10) % 10, n % 10]] } : { type: "numberline", from: 0, to: mode === 1 ? 100 : 10000, step: mode === 1 ? 10 : 1000, marks: [mode === 3 ? n : n] }),
      alternatives: [
        { id: "split", title: "Split into whole units and the rest", kind: "procedural", text: ["245 cm is 2 m and 45 cm.", "45 cm is 45 hundredths of a metre, so 245 cm = 2.45 m."] },
      ],
    },
    limits: "Lengths only (mm, cm, m, km); grams and millilitres as decimals of kilograms and litres are the unit-conversion families.",
  },
  {
    id: "acparl",
    arity: 4,
    title: "Parallel, perpendicular or neither",
    competency: LINES,
    type: "choice",
    // [rel, dx, dy, s]: AB goes dx across and dy up; CD is parallel (0), perpendicular (1) or neither (2); s places them
    parse: none,
    reject: ([rel, dx, dy, s]) => (rel < 0 || rel > 2 || dx < 1 || dx > 4 || dy < -3 || dy > 3 || s < 0 || s > 5 ? "Two segments on a grid." : null),
    choices: (p) => shuf(p, "parl", PARL),
    prompt: () => "Look at the line segments AB and CD in the picture. Are they parallel, perpendicular, or neither?",
    solve: (p) => ({ steps: [st("slopes", "compare", LINES, [`${p[1]} across, ${p[2]} up`], PARL[p[0]])], answer: posOf(p, 3, p[0], "parl") }),
    // independent: from the points drawn, two segments are parallel when the cross product of their directions is 0 and perpendicular when the dot product is 0
    validate: (p, v) => {
      const [A, Bp, C, D] = parlPts(p);
      const u = [Bp[0] - A[0], Bp[1] - A[1]];
      const w = [D[0] - C[0], D[1] - C[1]];
      const kind = u[0] * w[1] - u[1] * w[0] === 0 ? 0 : u[0] * w[0] + u[1] * w[1] === 0 ? 1 : 2;
      return typeof v === "number" && shuf(p, "parl", PARL)[v] === PARL[kind];
    },
    bugs: (p) => {
      const [rel, dx, dy] = p;
      if (rel === 0 && dy !== 0) return [B("slant-not-parallel", "conceptual", LINES, "Lines were taken to be parallel only when they go straight across or straight up. Slanting segments are parallel when they go the same number of squares across for the same number up.", posOf(p, 3, 2, "parl"))];
      if (rel === 1) return [B("must-touch", "conceptual", LINES, "Perpendicular segments do not have to touch: if they were made longer, they would meet at a right angle.", posOf(p, 3, 2, "parl"))];
      if (rel === 2 && dy !== 0) return [B("looks-parallel", "procedural", LINES, `The segments slope nearly the same way, but count the squares: AB goes ${dx} across for ${Math.abs(dy)} ${dy > 0 ? "up" : "down"}, CD goes ${dx + 1} across.`, posOf(p, 3, 0, "parl"))];
      return [];
    },
    variants: () => [],
    explain: (s) => `Count the squares each segment goes across and up: they are ${String(s.value).toLowerCase()}`,
    domain: [[0, 2], [1, 4], [-3, 3], [0, 5]],
    cap: 300,
    difficulty: ([rel, , dy]) => (dy === 0 ? 1 : rel === 2 ? 3 : 2),
    figure: (p) => {
      const P = parlPts(p);
      return { type: "plane", range: 10, points: P.map(([x, y], i) => [x, y, "ABCD"[i]]), segments: [[P[0], P[1]], [P[2], P[3]]] };
    },
    word: () => "On a town map drawn on squared paper, one straight road is AB and another is CD, as in the picture. Are the two roads parallel, perpendicular, or neither?",
    teach: {
      idea: "Parallel lines go in the same direction and never meet; perpendicular lines meet (or would meet, if made longer) at a right angle.",
      method: "Count how many squares each segment goes across and up. The same for both: parallel. Across and up swapped, with one going the other way: perpendicular. Otherwise: neither.",
      visual: (p) => {
        const P = parlPts(p);
        return { type: "plane", range: 10, points: P.map(([x, y], i) => [x, y, "ABCD"[i]]), segments: [[P[0], P[1]], [P[2], P[3]]] };
      },
      alternatives: [
        { id: "set_square", title: "Slide and turn a set square", kind: "conceptual", text: ["Lay a ruler along AB and slide it without turning: if it lies along CD, they are parallel.", "Put the corner of a set square on the lines: if both edges lie along them, they are perpendicular."] },
      ],
    },
    limits: "Two segments on a square grid; folding paper to make parallel or perpendicular lines is a written task.",
  },
  {
    id: "acstory4",
    arity: 3,
    title: "One-step word problems with four-digit numbers",
    competency: OPC,
    type: "integer",
    mc: true,
    // [op, x, c]: op 0 add, 1 subtract; x the numbers; c the situation (0 people, 1 books, 2 distances in m, 3 lengths in cm)
    parse: none,
    reject: ([op, x, c]) => (op < 0 || op > 1 || x < 0 || x > 39 || c < 0 || c > 3 ? "Four-digit numbers in one of four situations." : null),
    prompt: ([op, x, c]) => story4(op, x, c),
    solve: ([op, x]) => {
      const [a, b] = s4nums(op, x);
      return { steps: [st("choose", "choose operation", OPC, [op ? "take away" : "add"], op), st("work", op ? "subtract" : "add", "MATH.number.multi-digit-add-subtract", [a, b, op ? "−" : "+"], op ? a - b : a + b)], answer: op ? a - b : a + b };
    },
    // independent: the inverse — the answer added to (or taken from) the second number gives the first (or the total)
    validate: ([op, x], v) => {
      if (typeof v !== "number") return false;
      const [a, b] = s4nums(op, x);
      return op ? v + b === a && v >= 0 : v - b === a;
    },
    bugs: ([op, x]) => {
      const [a, b] = s4nums(op, x);
      const r = op ? a - b : a + b;
      const A = digitsOf(a, 4);
      const Bd = digitsOf(b, 4);
      const slip = op ? fromDigits(A.map((d, i) => Math.abs(d - Bd[i]))) : fromDigits(A.map((d, i) => (d + Bd[i]) % 10));
      return [
        B(op ? "added" : "took-away", "conceptual", OPC, op ? "The numbers were added, but in the story some are taken away (or one part is asked for), so we subtract." : "The smaller number was taken from the bigger one, but the story puts the two amounts together, so we add.", op ? a + b : Math.abs(a - b)),
        ...(slip !== r ? [B(op ? "smaller-from-larger" : "no-carry", "procedural", op ? SUBR : "MATH.number.addition-regroup", op ? "In a column where the top digit was smaller, the top was taken from the bottom. Regroup from the next column first." : "A ten, hundred or thousand made in one column was not carried to the next.", slip)] : []),
      ];
    },
    distractors: ([op, x]) => {
      const [a, b] = s4nums(op, x);
      const r = op ? a - b : a + b;
      return [r + 100, r - 10, r + 1000];
    },
    variants: () => [],
    explain: (s) => (s.id === "choose" ? (s.value ? "Some are taken away, or one part is asked for: subtract" : "Two amounts are put together: add") : `${ind(Number(s.inputs[0]))} ${s.inputs[2]} ${ind(Number(s.inputs[1]))} = ${ind(Number(s.value))}`),
    domain: [[0, 1], [0, 39], [0, 3]],
    // level@1: four-digit numbers are Grade 4
    grade: () => 4,
    difficulty: ([op, x]) => {
      const [a, b] = s4nums(op, x);
      return op && a % 1000 < b % 1000 ? 3 : op ? 2 : 2;
    },
    figure: ([op, x]) => {
      const [a, b] = s4nums(op, x);
      // the two numbers in columns, without the operation sign (choosing the operation is the question)
      return { type: "table", head: ["Th", "H", "T", "O"], rows: [String(a).split(""), String(b).padStart(4, " ").split("")] };
    },
    word: ([op, x, c]) => story4(op, x, (c + 1) % 4),
    teach: {
      idea: "Decide first what happens in the story: two amounts put together (add), or one taken from another, or one part of a total asked for (subtract).",
      method: "Write the numbers one under the other, thousands under thousands, and work from the ones, regrouping as needed. Check with an estimate in thousands.",
      visual: ([op, x]) => {
        const [a, b] = s4nums(op, x);
        return { type: "bars", labels: op ? ["Whole", "Part taken", "Part left"] : ["First", "Second", "Total"], values: op ? [a, b, a - b] : [a, b, a + b] };
      },
      alternatives: [
        { id: "bar_model", title: "Draw a bar model", kind: "conceptual", text: ["Draw one long bar for the total and split it into the two parts.", "Label what you know; the box with the question mark tells you whether to add the parts or take one from the total."] },
      ],
    },
    limits: "One-step addition and subtraction stories with four-digit numbers (people, books, distances in metres, lengths in centimetres); two-step stories are other families.",
  },
  {
    id: "acp2r",
    arity: 2,
    title: "Changing paise into rupees",
    competency: MONEY,
    type: "fraction",
    decimals: true,
    mc: true,
    // [r, p5]: 100 r + 5 p5 paise
    parse: none,
    reject: ([r, p5]) => (r < 1 || r > 50 || p5 < 0 || p5 > 19 ? "100 to 5095 paise in steps of 5." : null),
    prompt: ([r, p5]) => `Change ${ind(100 * r + 5 * p5)} paise into rupees. Write the answer in rupees, like 4.50.`,
    solve: ([r, p5]) => ({ steps: [st("rupees", "divide", MONEY, [100 * r + 5 * p5, 100], r), st("paise", "subtract", SUB, [100 * r + 5 * p5, 100 * r], 5 * p5)], answer: money(100 * r + 5 * p5) }),
    // independent: count back ₹1 for every 100 paise, then check the paise left are the digits after the point
    validate: ([r, p5], v) => {
      const s = String(v);
      if (!/^\d+(\.\d{1,2})?$/.test(s)) return false;
      let n = 0;
      for (let i = 0; i < r; i++) n += 100;
      for (let i = 0; i < p5; i++) n += 5;
      return paiseOf(s) === n;
    },
    bugs: ([r, p5]) => {
      const N = 100 * r + 5 * p5;
      // predictions written as rupees, like the answer (N/1000 rupees has a third decimal place when N is not a multiple of 10)
      return [B("divided-by-10", "recall", MONEY, "The paise were divided by 10, as if ₹1 were 10 paise; ₹1 = 100 paise.", money(10 * N)), B("divided-by-1000", "recall", MONEY, "The paise were divided by 1000; ₹1 = 100 paise, so divide by 100.", N % 10 === 0 ? money(N / 10) : String(N / 1000))];
    },
    distractors: ([r, p5]) => [money(100 * r + 5 * p5 + 100), money(100 * (r + 1) + 5 * p5 - 50)],
    variants: () => [],
    explain: (s) => (s.id === "rupees" ? `${ind(Number(s.inputs[0]))} paise holds ${s.value} groups of 100 paise: ₹${s.value}` : `${s.value} paise are left over, written after the point`),
    domain: [[1, 50], [0, 19]],
    cap: 300,
    difficulty: ([r, p5]) => (r < 10 && p5 % 2 === 0 ? 1 : p5 * 5 < 10 ? 3 : 2),
    figure: ([r, p5]) => ({ type: "table", head: ["Paise", "Rupees (₹)"], rows: [[ind(100 * r + 5 * p5), "?"]] }),
    word: ([r, p5]) => `${girl(r + p5)}'s piggy bank has coins worth ${ind(100 * r + 5 * p5)} paise in all. How much is that in rupees? Write it like 4.50.`,
    teach: {
      idea: "100 paise make ₹1, so every hundred paise is a rupee and the paise under 100 are written after the point.",
      method: "Divide the paise by 100: the hundreds become rupees and the last two digits are the paise. 1245 paise = ₹12.45.",
      visual: ([r, p5]) => (r <= 9 ? { type: "blocks", hundreds: r, tens: Math.floor((5 * p5) / 10), ones: (5 * p5) % 10 } : null),
      alternatives: [{ id: "point", title: "Put the point two places from the right", kind: "procedural", text: ["Write the number of paise.", "Put the decimal point before the last two digits: 805 paise = ₹8.05."] }],
    },
    limits: "100 to 5095 paise in steps of 5 changed into rupees; rupees into paise is acpaise.",
  },
  {
    id: "accmpx",
    arity: 4,
    title: "Comparing two expressions with <, > or =",
    competency: EQ,
    type: "choice",
    // [f, x, u, v]: f 0 a + b against (a + u) + (b + v); f 1 a − b against (a + u) − (b + v); f 2 a × b against (a + u) × (b + v); x the numbers
    parse: none,
    reject: ([f, x, u, v]) => {
      if (f < 0 || f > 2 || x < 0 || x > 19 || u < -3 || u > 3 || v < -3 || v > 3) return "Two expressions that differ by small changes.";
      if (u === 0 && v === 0) return "The two sides differ.";
      if (f === 2 && x > 7) return "Eight multiplication pairs.";
      const [a, b] = cmpNums(f, x);
      if (f === 2 && (a + u < 2 || b + v < 2)) return "Factors from 2.";
      if (f === 2 && a + u === b && b + v === a) return "Not just the factors swapped.";
      return null;
    },
    choices: (p) => shuf(p, "cmp", SIGNS),
    prompt: (p) => `Choose <, > or = to make this true. Try to decide without working out both sides in full: ${cmpSides(p).join(" ○ ")}`,
    solve: (p) => {
      const [f, x, u, v] = p;
      const [a, b] = cmpNums(f, x);
      const d = f === 0 ? -(u + v) : f === 1 ? -(u - v) : a * b - (a + u) * (b + v);
      return { steps: [st("change", "compare", EQ, [u, v, f], d), st("sign", "compare", EQ, [d], SIGNS[d < 0 ? 0 : d > 0 ? 1 : 2])], answer: posOf(p, 3, d < 0 ? 0 : d > 0 ? 1 : 2, "cmp") };
    },
    // independent: work out both sides in full (multiplying by repeated addition) and compare
    validate: (p, w) => {
      const [f, x, u, v] = p;
      const [a, b] = cmpNums(f, x);
      const ev = (m: number, n: number) => {
        if (f === 0) return m + n;
        if (f === 1) return m - n;
        let s = 0;
        for (let i = 0; i < n; i++) s += m;
        return s;
      };
      const L = ev(a, b);
      const R = ev(a + u, b + v);
      return typeof w === "number" && shuf(p, "cmp", SIGNS)[w] === SIGNS[L < R ? 0 : L > R ? 1 : 2];
    },
    bugs: (p) => {
      const [f, x, u, v] = p;
      const [a, b] = cmpNums(f, x);
      const d = f === 0 ? -(u + v) : f === 1 ? -(u - v) : a * b - (a + u) * (b + v);
      const right = d < 0 ? 0 : d > 0 ? 1 : 2;
      const sg = (z: number) => (z < 0 ? 0 : z > 0 ? 1 : 2);
      const out: Bug[] = [];
      if (u !== 0 && sg(-u) !== right) out.push(B("first-only", "procedural", EQ, `Only the first numbers (${a} and ${a + u}) were compared. The second numbers change too, so look at both changes.`, posOf(p, 3, sg(-u), "cmp")));
      if (f === 1 && sg(-(u + v)) !== right) out.push(B("minus-as-plus", "conceptual", EQ, "Taking away more was treated as giving more. In a − b, a bigger number taken away leaves less.", posOf(p, 3, sg(-(u + v)), "cmp")));
      if (f === 2 && sg(-(u + v)) !== right) out.push(B("add-changes", "conceptual", EQ, "The changes were balanced as in adding (one up, one down, so equal). For multiplying that does not work: work out or picture both rectangles.", posOf(p, 3, sg(-(u + v)), "cmp")));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "change" ? "Compare how each number changes from the left side to the right side" : `So the sign is ${s.value}`),
    domain: [[0, 2], [0, 19], [-3, 3], [-3, 3]],
    cap: 400,
    difficulty: ([f, , u, v]) => (f === 0 && Math.sign(u) === Math.sign(v) ? 1 : f === 0 ? 2 : 3),
    word: (p) => {
      const [f] = p;
      const [L, R] = cmpSides(p);
      return f === 2 ? `Hall A has rows of chairs: ${L}. Hall B has ${R}. Which sign makes "Hall A ○ Hall B" true?` : f === 1 ? `${name(p[1])} had ${L.split(" − ")[0]} rupees and spent ${L.split(" − ")[1]}; ${name(p[1] + 1)} had ${R.split(" − ")[0]} and spent ${R.split(" − ")[1]}. Which sign makes "${L} ○ ${R}" true about the money left?` : `${name(p[1])} scored ${L} runs in two matches and ${name(p[1] + 1)} scored ${R}. Which sign makes "${L} ○ ${R}" true?`;
    },
    teach: {
      idea: "You can often compare two expressions by seeing how the numbers change: in a sum, a bigger part makes a bigger sum; in a difference, taking away more leaves less.",
      method: "Match up the numbers on the two sides and see how much each goes up or down. Add up the effects; if they cancel, the sides are equal. For products, work them out if the changes pull different ways.",
      alternatives: [
        { id: "balance", title: "Think of a balance", kind: "conceptual", text: ["Put each side on a pan of a balance.", "If one side gets 2 more on one number and 3 less on the other, it is 1 lighter: the other side is greater."], visual: (p) => ({ type: "balance", left: cmpSides(p)[0], right: cmpSides(p)[1] }) },
      ],
      visual: (p) => ({ type: "balance", left: cmpSides(p)[0], right: cmpSides(p)[1] }),
    },
    limits: "Two sums, two differences or two products whose numbers differ by up to 3; expressions with brackets and three terms are other families.",
  },
  {
    id: "acmoneymul",
    arity: 4,
    title: "Total cost and cost of one item, with paise",
    competency: MONEY,
    type: "fraction",
    decimals: true,
    mc: true,
    // [mode, r, p5, n]: one item costs ₹r.(5 p5); mode 0 the cost of n items, mode 1 the cost of one from the cost of n
    parse: none,
    reject: ([mode, r, p5, n]) => (mode < 0 || mode > 1 || r < 1 || r > 50 || p5 < 1 || p5 > 19 || n < 2 || n > 9 || n * (100 * r + 5 * p5) > 50000 ? "Prices from ₹1.05 to ₹50.95, 2 to 9 items, up to ₹500." : null),
    keep: ([mode, r, p5, n]) => (r + p5 + n + mode) % 3 === 0,
    prompt: ([mode, r, p5, n]) => {
      const P = 100 * r + 5 * p5;
      const it = ITEM2[(r + n) % ITEM2.length];
      return mode === 0 ? `One ${it[0]} costs ₹${money(P)}. What do ${n} ${it[1]} cost? Write the answer in rupees, like 4.50.` : `${n} ${it[1]} cost ₹${money(n * P)} altogether. What does one ${it[0]} cost? Write the answer in rupees, like 4.50.`;
    },
    solve: ([mode, r, p5, n]) => {
      const P = 100 * r + 5 * p5;
      return mode === 0
        ? { steps: [st("paise", "convert", MONEY, [money(P)], P), st("multiply", "multiply", "MATH.number.multi-multiplication", [P, n], n * P), st("rupees", "convert", MONEY, [n * P], money(n * P))], answer: money(n * P) }
        : { steps: [st("paise", "convert", MONEY, [money(n * P)], n * P), st("divide", "divide", "MATH.number.long-division", [n * P, n], P), st("rupees", "convert", MONEY, [P], money(P))], answer: money(P) };
    },
    // independent: add the price again and again (or check that n of the answer make the total), counting in paise
    validate: ([mode, r, p5, n], v) => {
      const s = String(v);
      if (!/^\d+(\.\d{1,2})?$/.test(s)) return false;
      const P = 100 * r + 5 * p5;
      let t = 0;
      for (let i = 0; i < n; i++) t += mode === 0 ? P : paiseOf(s);
      return mode === 0 ? paiseOf(s) === t : t === n * P;
    },
    bugs: ([mode, r, p5, n]) => {
      const P = 100 * r + 5 * p5;
      const p = 5 * p5;
      if (mode === 0) return [B("paise-not-multiplied", "procedural", MONEY, `Only the rupees were multiplied by ${n}; the ${p} paise must be multiplied too.`, money(100 * n * r + p)), ...(n * p >= 100 ? [B("paise-over-100", "conceptual", MONEY, `The paise came to ${n * p}, more than 100: 100 paise make ₹1, so carry the rupees.`, `${n * r}.${n * p}`)] : [])];
      return [B("multiplied", "conceptual", MONEY, `The total was multiplied by ${n}; the cost of one item is the total shared into ${n} equal parts.`, money(n * n * P))].filter((b) => b.predict !== money(P));
    },
    distractors: ([mode, r, p5, n]) => {
      const P = 100 * r + 5 * p5;
      const T = mode === 0 ? n * P : P;
      return [money(T + 100), money(T + 50), ...(T > 100 ? [money(T - 100)] : [])];
    },
    variants: () => [],
    explain: (s) => (s.id === "paise" ? `₹${s.inputs[0]} = ${s.value} paise` : s.id === "rupees" ? `${s.inputs[0]} paise = ₹${s.value}` : `${s.inputs[0]} ${s.op === "multiply" ? "×" : "÷"} ${s.inputs[1]} = ${s.value} paise`),
    domain: [[0, 1], [1, 50], [1, 19], [2, 9]],
    // level@1: multiplying money with paise Grade 4, dividing it Grade 5
    grade: ([mode]) => (mode === 0 ? 4 : 5),
    cap: 400,
    difficulty: ([mode, r, p5, n]) => (r < 10 && n <= 3 ? 1 : mode === 1 || n * 5 * p5 >= 100 ? 3 : 2),
    word: ([mode, r, p5, n]) => {
      const P = 100 * r + 5 * p5;
      const it = ITEM2[(r + n + 2) % ITEM2.length];
      return mode === 0 ? `At the school fair, ${name(r)} buys ${n} ${it[1]} at ₹${money(P)} each. How much does ${name(r)} pay? Write it like 4.50.` : `${name(r)} paid ₹${money(n * P)} for ${n} ${it[1]}, all the same price. What did one cost? Write it like 4.50.`;
    },
    teach: {
      idea: "Money in rupees and paise can be worked in paise: ₹12.75 is 1275 paise, a whole number you can multiply or divide.",
      method: "Change the price to paise, multiply (or divide) by the number of items, then change back to rupees by putting the point two places from the right.",
      alternatives: [
        { id: "split", title: "Split rupees and paise", kind: "procedural", text: ["Multiply the rupees and the paise separately: 3 × ₹12.75 is 3 × ₹12 and 3 × 75 paise.", "Change every 100 paise into ₹1 and add."] },
      ],
      visual: ([, r, p5, n]) => ({ type: "table", head: ["Items", "Cost (₹)"], rows: [[1, money(100 * r + 5 * p5)], [n, "?"]] }),
    },
    limits: "Prices in rupees and paise (steps of 5 paise) for 2 to 9 items, totals up to ₹500; bills with several items are acbill, unit rates for better buys are ajbest.",
  },
  {
    id: "accoll",
    arity: 3,
    title: "Which three points are collinear?",
    competency: LINES,
    type: "choice",
    // [dx, dy, s]: three points one step (dx across, dy up) apart on a line, and one point just off it; s places and labels them
    parse: none,
    reject: ([dx, dy, s]) => (dx < 1 || dx > 3 || dy < -2 || dy > 2 || s < 0 || s > 11 ? "Four points on a grid, three of them on one line." : null),
    choices: () => TRIPLES.map((t) => `${t[0]}, ${t[1]} and ${t[2]}`),
    prompt: () => "Which three of the points A, B, C and D in the picture lie on one straight line?",
    solve: (p) => {
      const lab = collLabels(p);
      const on = [0, 1, 2].map((i) => lab[i]).sort().join("");
      return { steps: [st("steps", "compare", LINES, [`${p[0]} across, ${p[1]} up`], on)], answer: TRIPLES.findIndex((t) => t.join("") === on) };
    },
    // independent: test the chosen three points with the cross product of the steps between them
    validate: (p, v) => {
      if (typeof v !== "number" || !TRIPLES[v]) return false;
      const P = collFigurePts(p);
      const [a, b, c] = TRIPLES[v].map((L) => P[L]);
      return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) === 0;
    },
    bugs: (p) => {
      const lab = collLabels(p);
      const near3 = [1, 2, 3].map((i) => lab[i]).sort().join("");
      const k = TRIPLES.findIndex((t) => t.join("") === near3);
      return [B("by-eye", "procedural", LINES, `Point ${lab[3]} looks almost in line, but count the squares: each step along the line is ${p[0]} across and ${Math.abs(p[1])} ${p[1] < 0 ? "down" : "up"}, and ${lab[3]} is one square off.`, k)];
    },
    variants: () => [],
    explain: (s) => `Each step along the line goes ${s.inputs[0]}; the points that follow this pattern are ${String(s.value).split("").join(", ")}`,
    domain: [[1, 3], [-2, 2], [0, 11]],
    difficulty: ([dx, dy]) => (dy === 0 ? 1 : dx === 1 ? 2 : 3),
    figure: (p) => {
      const P = collFigurePts(p);
      return { type: "plane", range: 10, points: "ABCD".split("").map((L) => [P[L][0], P[L][1], L]) };
    },
    word: () => "Four trees in a field are marked A, B, C and D on the squared map in the picture. A farmer wants to stretch one straight wire touching three of them. Which three trees lie on one straight line?",
    teach: {
      idea: "Points are collinear when they lie on one straight line: the steps from one to the next all go the same way.",
      method: "Pick three points. Count the squares across and up from the first to the second and from the second to the third. If the steps are in the same ratio (same direction), the three are collinear.",
      visual: (p) => {
        const P = collFigurePts(p);
        const lab = collLabels(p);
        return { type: "plane", range: 10, points: "ABCD".split("").map((L) => [P[L][0], P[L][1], L]), segments: [[P[lab[0]], P[lab[2]]]] };
      },
      alternatives: [{ id: "ruler", title: "Lay a ruler", kind: "conceptual", text: ["Lay a ruler through two of the points.", "If the edge also passes exactly through a third point, the three are collinear; one square off is not enough."] }],
    },
    limits: "Four points on a square grid with exactly one collinear three; counting the lines through points is aclines.",
  },
  {
    id: "actrain",
    arity: 5,
    title: "Journeys across midnight: railway and bus timetables",
    competency: TIME,
    type: "tuple",
    mc: true,
    // [dh, dm5, Dh, Dm5, mode]: depart at dh:(5 dm5) (24-hour), journey Dh h 5 Dm5 min, passing midnight; mode 0 the
    // journey time from a timetable, mode 1 the arrival time
    parse: none,
    reject: ([dh, dm5, Dh, Dm5, mode]) => {
      if (dh < 0 || dh > 23 || dm5 < 0 || dm5 > 11 || Dh < 1 || Dh > 30 || Dm5 < 0 || Dm5 > 11 || mode < 0 || mode > 1) return "A journey of up to 30 hours 55 minutes.";
      const S = 60 * dh + 5 * dm5;
      return S + 60 * Dh + 5 * Dm5 < 1440 ? "The journey goes past midnight." : null;
    },
    keep: ([dh, dm5, Dh, Dm5, mode]) => (dh >= 14 || Dh >= 12) && (dh + dm5 + Dh + Dm5 + mode) % 4 === 0,
    prompt: (p) => {
      const [dh, dm5, Dh, Dm5, mode] = p;
      const R = ROUTES[(dh + Dh) % ROUTES.length];
      return mode === 0
        ? `The timetable in the picture is for the ${R[0]} from ${R[1]} to ${R[2]}. How long does the journey take? Write the answer as (hours, minutes).`
        : `The ${R[0]} leaves ${R[1]} at ${hhmm(60 * dh + 5 * dm5)} and the journey takes ${pl3(Dh, "hour")} ${pl3(5 * Dm5, "minute")}. At what time does it reach ${R[2]}? Write the 24-hour time as (hours, minutes): for example, (6, 20) means 06:20.`;
    },
    solve: ([dh, dm5, Dh, Dm5, mode]) => {
      const S = 60 * dh + 5 * dm5;
      const D = 60 * Dh + 5 * Dm5;
      const E = S + D;
      if (mode === 0) return { steps: [st("to-midnight", "count on", TIME, [hhmm(S), "24:00"], 1440 - S), st("after", "count on", TIME, ["00:00", hhmm(E % 1440), Math.floor(E / 1440) - 1], E - 1440), st("total", "add", TIME, [1440 - S, E - 1440], `(${Dh}, ${5 * Dm5})`)], answer: `(${Dh}, ${5 * Dm5})` };
      return { steps: [st("add", "add", TIME, [hhmm(S), `${Dh} h ${5 * Dm5} min`], `${Math.floor(E / 60)}:${pad2(E % 60)}`), st("days", "subtract", TIME, [Math.floor(E / 60), 24 * Math.floor(E / 1440)], hhmm(E % 1440))], answer: `(${Math.floor((E % 1440) / 60)}, ${E % 60})` };
    },
    // independent: run a 24-hour clock forward minute by minute, counting the midnights passed
    validate: ([dh, dm5, Dh, Dm5, mode], v) => {
      const t = tup(v);
      if (t.length !== 2 || !t.every(Number.isInteger) || t[0] < 0 || t[1] < 0 || t[1] >= 60) return false;
      const D = 60 * Dh + 5 * Dm5;
      let h = dh;
      let m = 5 * dm5;
      let days = 0;
      const tick = () => {
        m++;
        if (m === 60) {
          m = 0;
          h++;
          if (h === 24) {
            h = 0;
            days++;
          }
        }
      };
      if (mode === 1) {
        if (t[0] > 23) return false;
        for (let i = 0; i < D; i++) tick();
        return h === t[0] && m === t[1];
      }
      const S = 60 * dh + 5 * dm5;
      const E = S + D;
      for (let i = 0; i < 60 * t[0] + t[1] && i < 3000; i++) tick();
      return h * 60 + m === E % 1440 && days === Math.floor(E / 1440);
    },
    bugs: ([dh, dm5, Dh, Dm5, mode]) => {
      const S = 60 * dh + 5 * dm5;
      const D = 60 * Dh + 5 * Dm5;
      const E = S + D;
      const A = E % 1440;
      const ans = mode === 0 ? `(${Dh}, ${5 * Dm5})` : `(${Math.floor(A / 60)}, ${A % 60})`;
      const tu = (x: number) => `(${Math.floor(x / 60)}, ${x % 60})`;
      if (mode === 0) {
        const out: Bug[] = [B("same-day", "conceptual", TIME, "The two times were taken away as if they were on the same day. The train passes midnight: count on to 24:00 first, then on to the arrival.", tu(Math.abs(A - S)))];
        if (D - 720 * Math.floor(E / 1440) > 0) out.push(B("day-as-12", "recall", TIME, "A day was taken as 12 hours. On a 24-hour timetable a whole day is 24 hours.", tu(D - 720 * Math.floor(E / 1440))));
        return out.filter((b) => b.predict !== ans);
      }
      return [B("past-24", "conceptual", TIME, "The hours were added past 24. After 23:59 the clock starts again at 00:00, so take 24 away for each midnight.", `(${Math.floor(E / 60)}, ${E % 60})`), ...(Math.floor(E / 60) - 12 >= 0 && Math.floor(E / 60) - 12 <= 23 && Math.floor(E / 60) - 12 !== Math.floor(A / 60) ? [B("minus-12", "recall", TIME, "12 was taken away, as on a 12-hour clock; on a 24-hour clock take away 24.", `(${Math.floor(E / 60) - 12}, ${E % 60})`)] : [])];
    },
    distractors: ([dh, dm5, Dh, Dm5, mode]) => {
      const E = 60 * dh + 5 * dm5 + 60 * Dh + 5 * Dm5;
      const [h, m] = mode === 0 ? [Dh, 5 * Dm5] : [Math.floor((E % 1440) / 60), E % 60];
      return [`(${h + 1}, ${m})`, `(${h}, ${(m + 10) % 60})`, `(${Math.max(0, h - 1)}, ${m})`];
    },
    variants: () => [],
    explain: (s) => (s.id === "to-midnight" ? `From ${s.inputs[0]} to midnight is ${Math.floor(Number(s.value) / 60)} h ${Number(s.value) % 60} min` : s.id === "after" ? `From midnight on to ${s.inputs[1]}${Number(s.inputs[2]) > 0 ? " the next day after" : ""} is ${Math.floor(Number(s.value) / 60)} h ${Number(s.value) % 60} min` : s.id === "total" ? `Together: ${s.value}` : s.id === "add" ? `${s.inputs[0]} + ${s.inputs[1]} gives ${s.value}` : `Take away 24 hours for each midnight: ${s.value}`),
    domain: [[0, 23], [0, 11], [1, 30], [0, 11], [0, 1]],
    cap: 400,
    difficulty: ([, , Dh]) => (Dh <= 10 ? 2 : Dh >= 24 ? 3 : 2),
    figure: ([dh, dm5, Dh, Dm5, mode]) => {
      if (mode === 1) return null;
      const S = 60 * dh + 5 * dm5;
      const E = S + 60 * Dh + 5 * Dm5;
      const R = ROUTES[(dh + Dh) % ROUTES.length];
      return { type: "table", head: ["Station", "Day", "Time"], rows: [[R[1], "Day 1", `${hhmm(S)} departs`], [R[2], `Day ${1 + Math.floor(E / 1440)}`, `${hhmm(E % 1440)} arrives`]] };
    },
    word: ([dh, dm5, Dh, Dm5, mode]) => {
      const S = 60 * dh + 5 * dm5;
      const E = S + 60 * Dh + 5 * Dm5;
      const days = Math.floor(E / 1440);
      return mode === 0
        ? `${name(dh + Dh)}'s family takes ${dh >= 18 && 60 * Dh + 5 * Dm5 < 1440 ? "an overnight bus" : "a long-distance bus"} that leaves at ${hhmm(S)} and arrives at ${hhmm(E % 1440)} ${days === 1 ? "the next day" : "two days later"}. How long is the journey? Write (hours, minutes).`
        : `A goods lorry leaves the factory at ${hhmm(S)} and drives for ${pl3(Dh, "hour")} ${pl3(5 * Dm5, "minute")}. At what time does it arrive? Write the 24-hour time as (hours, minutes).`;
    },
    teach: {
      idea: "A 24-hour clock goes from 00:00 to 23:59 and then starts again; a journey past midnight is the time up to 24:00 plus the time after it.",
      method: "For a journey time, count on from the departure to 24:00, then from 00:00 to the arrival (adding 24 hours for each extra day). For an arrival time, add the journey and take away 24 hours for each midnight passed.",
      alternatives: [{ id: "time_line", title: "A time line with midnight marked", kind: "procedural", text: ["Draw a line from the departure to the arrival and mark 24:00 on it.", "Work out the two jumps and add them."] }],
      visual: ([dh, dm5, Dh, Dm5]) => {
        const S = 60 * dh + 5 * dm5;
        const E = S + 60 * Dh + 5 * Dm5;
        return { type: "numberline", from: Math.floor(S / 60), to: Math.ceil(E / 60), step: 6, marks: [24, ...(E >= 2880 ? [48] : [])] };
      },
    },
    limits: "Departures at any time, journeys of up to 30 h 55 min passing midnight once or twice; journeys within one day are aeel24 and acelhm.",
  },
  {
    id: "acbill",
    arity: 3,
    title: "Preparing and checking a bill",
    competency: MONEY,
    type: "fraction",
    decimals: true,
    mc: true,
    // [s, mode, j]: three bill rows from seed s; mode 0 the total, mode 1 the amount for row j
    parse: none,
    reject: ([s, mode, j]) => {
      if (s < 0 || s > 59 || mode < 0 || mode > 1 || j < 0 || j > 2) return "A three-line bill.";
      if (mode === 0 && j !== 0) return "The total uses every row.";
      for (let s0 = 0; s0 < s; s0++) if (JSON.stringify(billOf(s0)) === JSON.stringify(billOf(s))) return "An earlier seed gives the same bill (distinct@1).";
      return null;
    },
    prompt: ([s, mode, j]) => (mode === 0 ? "The picture shows a shop bill with the quantity and rate of each item. Prepare the bill: find the amount for each item, then the total. What is the total, in rupees? Write it like 4.50." : `In the bill in the picture, the amount for ${billOf(s)[j][0]} is missing. What should it be, in rupees? Write it like 4.50.`),
    solve: ([s, mode, j]) => {
      const R = billOf(s);
      const amt = R.map(([, q, r]) => q * r);
      if (mode === 1) return { steps: [st("row", "multiply", "MATH.number.multi-multiplication", [R[j][1], money(R[j][2])], money(amt[j]))], answer: money(amt[j]) };
      return { steps: [...R.map(([n, q, r], i) => st(`row${i}`, "multiply", "MATH.number.multi-multiplication", [q, money(r)], money(amt[i]))), st("total", "add", ADD, amt.map(money), money(amt.reduce((a, b) => a + b, 0)))], answer: money(amt.reduce((a, b) => a + b, 0)) };
    },
    // independent: count the bill in paise, adding each rate once for every unit bought
    validate: ([s, mode, j], v) => {
      const sv = String(v);
      if (!/^\d+(\.\d{1,2})?$/.test(sv)) return false;
      const R = billOf(s);
      let t = 0;
      R.forEach(([, q, r], i) => {
        if (mode === 1 && i !== j) return;
        for (let k = 0; k < q; k++) t += r;
      });
      return paiseOf(sv) === t;
    },
    bugs: ([s, mode, j]) => {
      const R = billOf(s);
      const amt = R.map(([, q, r]) => q * r);
      const tot = amt.reduce((a, b) => a + b, 0);
      if (mode === 1) return [B("rate-only", "conceptual", MONEY, `The rate was copied as the amount, but ${R[j][1]} ${R[j][3]} were bought: the amount is quantity × rate.`, money(R[j][2])), B("added-quantity", "conceptual", MONEY, "The quantity was added to the rate; the amount is the rate taken as many times as the quantity.", money(R[j][2] + 100 * R[j][1]))].filter((b) => b.predict !== money(amt[j]));
      return [B("rates-added", "conceptual", MONEY, "The rates were added without multiplying by the quantities. Each amount is quantity × rate.", money(R.reduce((a, r) => a + r[2], 0))), B("missed-row", "procedural", MONEY, "One row was left out of the total; add every amount.", [...new Set(amt.map((x) => money(tot - x)))] as unknown as Value)].filter((b) => b.predict !== money(tot));
    },
    distractors: ([s, mode, j]) => {
      const R = billOf(s);
      const amt = R.map(([, q, r]) => q * r);
      const T = mode === 1 ? amt[j] : amt.reduce((a, b) => a + b, 0);
      return [money(T + 100), money(T + 50), money(T + 10)];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Total: ${s.inputs.map((x) => `₹${x}`).join(" + ")} = ₹${s.value}` : `${s.inputs[0]} × ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[0, 59], [0, 1], [0, 2]],
    // level@1: one line of a bill (money with paise × quantity) Grade 4, a whole bill Grade 5
    grade: ([, mode]) => (mode === 1 ? 4 : 5),
    cap: 300,
    difficulty: ([, mode]) => (mode === 1 ? 2 : 3),
    figure: ([s, mode, j]) => {
      const R = billOf(s);
      return { type: "table", head: ["Item", "Quantity", "Rate (₹)", "Amount (₹)"], rows: [...R.map(([n, q, r, u], i) => [n, `${q} ${u}`, money(r), mode === 0 ? "" : i === j ? "?" : money(q * r)]), ["Total", "", "", mode === 0 ? "?" : ""]] };
    },
    word: ([s, mode, j]) => {
      const R = billOf(s);
      const list = R.map(([n, q, r, u, u1]) => `${n.toLowerCase()}, ${q} ${u} at ₹${money(r)} a ${u1}`).join("; ");
      return mode === 0 ? `Amma buys ${list}. How much must she pay in all? Write it like 4.50.` : `Amma buys ${R[j][0].toLowerCase()}, ${R[j][1]} ${R[j][3]} at ₹${money(R[j][2])} a ${R[j][4]}. What amount should the shopkeeper write on the bill for it? Write it like 4.50.`;
    },
    teach: {
      idea: "Each line of a bill is quantity × rate; the total is the sum of the amounts.",
      method: "Multiply the quantity by the rate for each row (work in paise if it helps), write the amounts, then add them for the total. To check a bill, redo each multiplication and the addition.",
      visual: ([s]) => ({ type: "table", head: ["Item", "Quantity", "Rate (₹)", "Amount (₹)"], rows: billOf(s).map(([n, q, r, u]) => [n, `${q} ${u}`, money(r), money(q * r)]) }),
      alternatives: [{ id: "estimate", title: "Check with an estimate", kind: "procedural", text: ["Round each rate to the nearest rupee and multiply.", "The total of the estimates should be close to the bill's total."] }],
    },
    limits: "Three-line bills with quantities 1 to 5 and rates in rupees and paise; discounts and GST are ajdisc.",
  },
];

// ---------------------------------------------------------------- helpers used above

const KEYS = [1, 2, 5, 10];
const THEMES = [
  { title: "the favourite fruits of the children of a school", labels: ["Mango", "Banana", "Guava", "Apple"] },
  { title: "how the children of a school come to school", labels: ["Walk", "Bus", "Cycle", "Auto"] },
  { title: "the favourite games of the children of a school", labels: ["Kabaddi", "Cricket", "Kho-kho", "Football"] },
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

// ---------------------------------------------------------------- helpers for the gap@1 families (g0304)

function B(id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null, probe?: string): Bug {
  return { id, kind, competency, says, predict, ...(probe ? { probe } : {}) };
}
function st(id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step {
  return { id, op, competency, inputs, value };
}
function hsh(str: string): number {
  let x = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
/** A fixed order of n options for parameters p: entry k is the original index shown in place k. */
function permOf(p: number[], n: number, tag: string): number[] {
  return Array.from({ length: n }, (_, i) => i)
    .map((i) => [hsh(`${tag}:${p.join(",")}:${i}`), i])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
}
function shuf(p: number[], tag: string, opts: string[]): string[] {
  return permOf(p, opts.length, tag).map((i) => opts[i]);
}
/** Where the original option `orig` is shown, for parameters p. */
function posOf(p: number[], n: number, orig: number, tag = "o"): number {
  return permOf(p, n, tag).indexOf(orig);
}
function tup(v: Value): number[] {
  if (typeof v !== "string") return [];
  const s = v.trim();
  if (!/^\(.*\)$/.test(s)) return [];
  return s.slice(1, -1).split(",").map((x) => (/^\s*-?\d+\s*$/.test(x) ? Number(x) : NaN));
}
/** Indian grouping for numbers up to 99 999: 4,375 and 12,345. */
function ind(n: number): string {
  const s = String(n);
  return s.length <= 3 ? s : `${s.slice(0, -3)},${s.slice(-3)}`;
}
/** "a; b; c and d" (numbers with commas inside need semicolons between them). */
const listOf = (xs: string[]) => `${xs.slice(0, -1).join("; ")} and ${xs[xs.length - 1]}`;
const pl3 = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
/** Minutes after noon as a p.m. time: 875 → "2:35 p.m." */
const pm = (t: number) => `${Math.floor(t / 60) === 12 ? 12 : Math.floor(t / 60) % 12}:${pad2(t % 60)} p.m.`;
/** Minutes after midnight as a 24-hour time: 1305 → "21:45". */
const hhmm = (t: number) => `${pad2(Math.floor(t / 60) % 24)}:${pad2(t % 60)}`;
const dec2 = (n: number) => `${Math.floor(n / 100)}.${pad2(n % 100)}`;

function story9(op: number, a: number, b: number, c: number): string {
  const g = girl(a + b + c);
  const y = boy(a + 2 * b + c);
  const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
  if (op === 0)
    return [
      `${g} has ${nn(a, "balloon", "balloons")}. Her brother gives her ${b} more. How many balloons does she have now?`,
      `There ${s(a, "is", "are")} ${nn(a, "duck", "ducks")} in a pond. ${b} more ${s(b, "duck swims", "ducks swim")} up. How many ducks are in the pond now?`,
      `${y} has ${nn(a, "red marble", "red marbles")} and ${nn(b, "blue marble", "blue marbles")}. How many marbles does he have in all?`,
      `${nn(a, "child sits", "children sit")} on a mat. ${b} more ${s(b, "child comes", "children come")} to sit there too. How many children are on the mat now?`,
    ][c];
  return [
    `${g} has ${a} balloons. ${b} of them ${s(b, "bursts", "burst")}. How many balloons are left?`,
    `There are ${a} ducks in a pond. ${b} ${s(b, "duck swims", "ducks swim")} away. How many ducks are still in the pond?`,
    `${y} has ${a} marbles. He gives ${b} to his friend. How many marbles does he have now?`,
    `${a} children sit on a mat. ${b} ${s(b, "child goes", "children go")} home. How many children are still on the mat?`,
  ][c];
}

const EQOBJ = [
  { the: "The chocolate bar", it: "the bar", a: "a chocolate bar", unit: "squares", cut: "breaks" },
  { the: "The ribbon", it: "the ribbon", a: "a ribbon", unit: "cm", cut: "cuts" },
  { the: "The rope", it: "the rope", a: "a rope", unit: "m", cut: "cuts" },
];
/** The piece sizes: k pieces of n, or one unit moved between two pieces (d = 1, 2). */
function piecesOf(k: number, n: number, d: number): number[] {
  const L = Array(k).fill(n);
  if (d === 1) {
    L[0]++;
    L[k - 1]--;
  } else if (d === 2) {
    if (k === 2) {
      L[0]--;
      L[1]++;
    } else {
      L[1]++;
      L[2]--;
    }
  }
  return L;
}
function eqFigure(k: number, n: number, d: number): Visual {
  const L = piecesOf(k, n, d);
  const marks: number[] = [];
  let x = 0;
  for (const l of L.slice(0, -1)) marks.push((x += l));
  return { type: "numberline", from: 0, to: k * n, step: 1, marks };
}
function eqBase(k: number, c: number): string[] {
  const f = k === 2 ? "one half" : "one quarter";
  const fs = k === 2 ? "halves" : "quarters";
  void c;
  return [`Yes: all ${k} pieces are the same size, so each is ${f} of the whole`, `No: the pieces are not all the same size, so they are not ${fs}`];
}
function eqChoices(p: number[]): string[] {
  return shuf(p, "o", eqBase(p[0], p[3]));
}

/** Four numbers made from the same digits: sc 0, b thousands and three digits (perms); sc 1, four non-zero digits. */
function nlNums(sc: number, b: number, s: number): number[] {
  const want = sc === 0 ? 3 : 4;
  const ds: number[] = [];
  for (let i = 0; ds.length < want && i < 200; i++) {
    const d = (sc === 0 ? 0 : 1) + (hsh(`nl${sc}:${b}:${s}:${i}`) % (sc === 0 ? 10 : 9));
    if (!ds.includes(d)) ds.push(d);
  }
  const all = perms(ds).map((P) => P.reduce((a, x) => a * 10 + x, 0));
  const pick = all.map((x, i) => [hsh(`nlp${sc}:${b}:${s}:${i}`), x]).sort((a, c) => a[0] - c[0]).slice(0, 4).map((x) => x[1]);
  return sc === 0 ? pick.map((x) => b * 1000 + x) : pick;
}
function perms(D: number[]): number[][] {
  if (D.length <= 1) return [D];
  return D.flatMap((d, i) => perms([...D.slice(0, i), ...D.slice(i + 1)]).map((r) => [d, ...r]));
}

/** The centimetres of the second length for acmcmp (null when that kind does not exist). */
function mcE(b: number, t: number, k: number): number | null {
  if (t === 0) return b;
  if (t === 1) return b < 10 ? 10 * b : (b % 10) * 10 + Math.floor(b / 10);
  return k === 5 ? null : b + k - 5;
}
function mcBase([a, b, t, k]: number[]): string[] {
  return [`${a} m ${b} cm is longer`, `${100 * a + (mcE(b, t, k) ?? 0)} cm is longer`, "They are the same length"];
}
function mcChoices(p: number[]): string[] {
  return shuf(p, "o", mcBase(p));
}

let QUADS: number[][] | null = null;
/** The 126 sets of four different digits 1–9, smallest first. */
function quads(): number[][] {
  if (!QUADS) {
    QUADS = [];
    for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) for (let d = c + 1; d <= 9; d++) QUADS.push([a, b, c, d]);
  }
  return QUADS;
}
/** The cards as shown, in a fixed mixed order. */
const cardsOf = (i: number) => shuf([i], "cards", quads()[i].map(String)).map(Number);

const PKEY = [2, 5, 10];
const HKEY = [2, 4, 10, 20];
/** Half pictures in each of the four rows (1 to 15 halves). */
const halves = (ki: number, s: number) => [0, 1, 2, 3].map((i) => 1 + (hsh(`ph${ki}:${s}:${i}`) % 15));

/** acfacts numbers [a, b, c]: mode 0, 1 a + b = c (four- and five-digit); mode 2, 3 a × b = c. */
function factNums(mode: number, x: number): [number, number, number] {
  if (mode <= 1) {
    const a = 1015 + 211 * x;
    const b = 300 + (hsh(`fb${mode}:${x}`) % 6700);
    return [a, b, a + b];
  }
  const a = 2 + (x % 10);
  const b = a + 1 + 3 * Math.floor(x / 10);
  return [a, b, a * b];
}
/** The four sentences, the right one first. */
function factOptions([mode, x, y]: number[]): string[] {
  const [a0, b0, c] = factNums(mode, x);
  const [a, b] = y ? [b0, a0] : [a0, b0];
  const f = mode <= 1 ? ind : String;
  if (mode === 0) return [`${f(c)} − ${f(a)} = ${f(b)}`, `${f(a)} − ${f(b)} = ${f(c)}`, `${f(b)} − ${f(c)} = ${f(a)}`, `${f(c)} + ${f(a)} = ${f(b)}`];
  if (mode === 1) return [`${f(a)} + ${f(b)} = ${f(c)}`, `${f(c)} + ${f(b0)} = ${f(a0)}`, `${f(a0)} + ${f(c)} = ${f(b0)}`, `${f(a0)} − ${f(b0)} = ${f(c)}`];
  if (mode === 2) return [`${c} ÷ ${a} = ${b}`, `${a} ÷ ${b} = ${c}`, `${b} ÷ ${c} = ${a}`, `${c} × ${a} = ${b}`];
  return [`${c} = ${a0} × ${b0}`, `${a0} = ${c} × ${b0}`, `${b0} = ${a0} × ${c}`, `${c} = ${a0} + ${b0}`];
}
function factChoices(p: number[]): string[] {
  return shuf(p, "o", factOptions(p));
}
/** Read a sentence like "4,326 − 1,758 = 2,568" or "56 = 8 × 7": its operation, which side has the lone number, that number, and whether it is true. */
function readFact(t: string): { op: string; lone: "left" | "right"; lv: number; true: boolean } | null {
  const sides = t.replace(/,/g, "").split("=").map((x) => x.trim());
  if (sides.length !== 2) return null;
  const ex = (x: string) => {
    const m = x.match(/^(\d+)\s*([+−×÷])\s*(\d+)$/);
    if (!m) return null;
    const [p, q] = [Number(m[1]), Number(m[3])];
    const v = m[2] === "+" ? p + q : m[2] === "−" ? p - q : m[2] === "×" ? p * q : q === 0 ? NaN : p / q;
    return { op: m[2], v };
  };
  const L = ex(sides[0]);
  const R = ex(sides[1]);
  if (L && /^\d+$/.test(sides[1])) return { op: L.op, lone: "right", lv: Number(sides[1]), true: L.v === Number(sides[1]) };
  if (R && /^\d+$/.test(sides[0])) return { op: R.op, lone: "left", lv: Number(sides[0]), true: R.v === Number(sides[0]) };
  return null;
}

const PARL = ["Parallel", "Perpendicular", "Neither parallel nor perpendicular"];
/** A, B, C, D for acparl. */
function parlPts([rel, dx, dy, s]: number[]): [number, number][] {
  const A: [number, number] = [-9 + s, -3 + (s % 3) * 3];
  const Bp: [number, number] = [A[0] + dx, A[1] + dy];
  const C: [number, number] = [2, -2 + ((s + 1) % 3) * 2];
  const w = rel === 0 ? [dx, dy] : rel === 1 ? [-dy, dx] : dy === 0 ? [dx, 1] : [dx + 1, dy];
  return [A, Bp, C, [C[0] + w[0], C[1] + w[1]]];
}

/** acstory4 numbers [a, b]: four-digit, b < a for subtraction, a + b ≤ 9999 for addition. */
function s4nums(op: number, x: number): [number, number] {
  const a = op ? 3000 + (hsh(`s4a${x}`) % 6800) : 1000 + (hsh(`s4a${x}`) % 6000);
  const b = op ? 1000 + (hsh(`s4b${x}`) % (a - 1500)) : 1000 + (hsh(`s4b${x}`) % (9000 - a));
  return [a, b];
}
function story4(op: number, x: number, c: number): string {
  const [a, b] = s4nums(op, x);
  const [A, Bn] = [ind(a), ind(b)];
  if (op === 0)
    return [
      `A village has ${A} men and ${Bn} women. How many people live in the village?`,
      `A school library has ${A} books and buys ${Bn} more. How many books does it have now?`,
      `A lorry travels ${A} m to the market and then ${Bn} m more to a farm. How many metres does it travel in all?`,
      `A tailor has two rolls of cloth, ${A} cm and ${Bn} cm long. How many centimetres of cloth are there in all?`,
    ][c];
  return [
    `A town had ${A} people. ${Bn} people moved away to the city. How many people are left in the town?`,
    `A school library has ${A} books. ${Bn} of them are English books and the rest are Tamil books. How many Tamil books are there?`,
    `The road from the bus stand to the temple is ${A} m long. ${Bn} m of it has been tarred. How many metres are still to be tarred?`,
    `A wire is ${A} cm long. ${Bn} cm is cut off. How many centimetres of wire are left?`,
  ][c];
}

const SIGNS = ["<", ">", "="];
function cmpNums(f: number, x: number): [number, number] {
  if (f === 0) return [24 + ((37 * x) % 70), 15 + ((23 * x) % 60)];
  if (f === 1) return [60 + ((17 * x) % 39), 12 + ((11 * x) % 40)];
  return [3 + (x % 8), 4 + ((3 * x) % 8)];
}
function cmpSides([f, x, u, v]: number[]): [string, string] {
  const [a, b] = cmpNums(f, x);
  const o = ["+", "−", "×"][f];
  return [`${a} ${o} ${b}`, `${a + u} ${o} ${b + v}`];
}

const ITEM2 = [["notebook", "notebooks"], ["pen", "pens"], ["packet of biscuits", "packets of biscuits"], ["bottle of ink", "bottles of ink"], ["box of crayons", "boxes of crayons"], ["kite", "kites"]];

const TRIPLES = [["A", "B", "C"], ["A", "B", "D"], ["A", "C", "D"], ["B", "C", "D"]];
/** The labels of the three line points (in order along the line) and of the point just off it. */
const collLabels = (p: number[]) => permOf(p, 4, "coll").map((i) => "ABCD"[i]);
function collFigurePts(p: number[]): Record<string, [number, number]> {
  const [dx, dy, s] = p;
  const O: [number, number] = [-8 + (s % 4), -4 + Math.floor(s / 4)];
  const pts: [number, number][] = [O, [O[0] + dx, O[1] + dy], [O[0] + 2 * dx, O[1] + 2 * dy], [O[0] + 3 * dx, O[1] + 3 * dy + 1]];
  const lab = collLabels(p);
  const out: Record<string, [number, number]> = {};
  lab.forEach((L, i) => (out[L] = pts[i]));
  return out;
}

/** Invented trains and buses (story timetables, not real ones). */
const ROUTES: [string, string, string][] = [
  ["Palm Grove Express", "Chennai", "Madurai"],
  ["long-distance bus", "Coimbatore", "Bengaluru"],
  ["Coral Coast Express", "Tirunelveli", "Chennai"],
  ["Silver Sands Express", "Rameswaram", "Chennai"],
  ["long-distance bus", "Salem", "Puducherry"],
  ["Sunrise Valley Express", "Kanniyakumari", "Mumbai"],
  ["Lotus Lake Express", "Chennai", "New Delhi"],
];

const BILLITEMS: [string, number, string, string][] = [
  ["Rice", 5250, "kg", "kg"], ["Toor dal", 13850, "kg", "kg"], ["Sugar", 4475, "kg", "kg"], ["Onions", 3820, "kg", "kg"], ["Tomatoes", 2650, "kg", "kg"],
  ["Milk", 2850, "packet", "packets"], ["Bananas", 6250, "dozen", "dozen"], ["Coconuts", 3575, "piece", "pieces"], ["Soap", 4250, "bar", "bars"], ["Notebooks", 3850, "piece", "pieces"],
];
/** Three rows [item, quantity, rate in paise, quantity's unit, unit of the rate] for bill seed s. */
function billOf(s: number): [string, number, number, string, string][] {
  const idx: number[] = [];
  for (let i = 0; idx.length < 3 && i < 50; i++) {
    const k = hsh(`bill${s}:${i}`) % BILLITEMS.length;
    if (!idx.includes(k)) idx.push(k);
  }
  return idx.map((k, i) => {
    const q = 1 + (hsh(`billq${s}:${i}`) % 5);
    return [BILLITEMS[k][0], q, BILLITEMS[k][1], q === 1 ? BILLITEMS[k][2] : BILLITEMS[k][3], BILLITEMS[k][2]];
  });
}
