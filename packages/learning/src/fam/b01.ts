/**
 * families@2, batch b01: Grades 1–3 foundations (patterns, positions, shapes, calendar, comparing lengths and masses,
 * coins and money, non-standard units, ordering events, addition and subtraction within 20, comparing numbers, tens
 * and ones, zero). Every question that needs a picture draws it (tables of shapes, ten frames, base-ten blocks, coins,
 * number lines, bars, a calendar). Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value, Visual } from "../family-kit";

// ---------------------------------------------------------------- competencies
const PAT = "MATH.algebra.repeating-patterns";
const POS = "MATH.geometry.positions";
const SHP = "MATH.geometry.shapes";
const CAL = "MATH.measurement.calendar";
const LEN = "MATH.measurement.length-comparison";
const MASS = "MATH.measurement.mass-comparison";
const COIN = "MATH.measurement.money-coins";
const MON = "MATH.measurement.money-totals";
const NSU = "MATH.measurement.non-standard-units";
const TORD = "MATH.measurement.time-order";
const ADD = "MATH.number.addition";
const CMP = "MATH.number.compare-numbers";
const PV = "MATH.number.place-value-tens";
const SUB = "MATH.number.subtraction";
const ZERO = "MATH.number.zero";
const COUNT = "MATH.number.count-objects";

// ---------------------------------------------------------------- helpers
const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Priya", "Vijay", "Lakshmi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A fixed hash (FNV-1a) for reproducible choices inside a problem. */
const hs = (s: string) => {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619) >>> 0;
  }
  return x;
};
const inR = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const guard = (d: [number, number][], ok: (p: number[]) => boolean, why: string) => (p: number[]) => (!inR(p, d) || !ok(p) ? why : null);
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const bug = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Value | null): Bug => ({ id, kind, competency, says, predict });
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const choose = (n: number, k: number): number => {
  if (k < 0 || n < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
};
/** The idx-th ordering of 0..k−1 (Lehmer code). */
const perm = (k: number, idx: number): number[] => {
  const items = [...Array(k).keys()];
  const out: number[] = [];
  let r = idx;
  for (let n = k; n >= 1; n--) {
    const f = fact(n - 1);
    out.push(items.splice(Math.floor(r / f), 1)[0]);
    r %= f;
  }
  return out;
};
/** The idx-th k-element subset of 0..n−1, in increasing order (lexicographic). */
const combo = (n: number, k: number, idx: number): number[] => {
  const out: number[] = [];
  let x = 0;
  let r = idx;
  for (let i = 0; i < k; i++) {
    for (;;) {
      const c = choose(n - x - 1, k - i - 1);
      if (r < c) break;
      r -= c;
      x++;
    }
    out.push(x);
    x++;
  }
  return out;
};
const list = (xs: (number | string)[]) => xs.join(", ");
const readList = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const parts = v.replace(/[()\s]/g, "").split(",");
  if (parts.some((x) => !/^\d+$/.test(x))) return null;
  return parts.map(Number);
};
const isPermOf = (xs: number[], k: number) => xs.length === k && new Set(xs).size === k && xs.every((x) => x >= 1 && x <= k);
/** Swaps of neighbouring entries of an ordered answer (wrong orders for a multiple-choice form). */
const swaps = (xs: number[]) => {
  const out: string[] = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const y = [...xs];
    [y[i], y[i + 1]] = [y[i + 1], y[i]];
    out.push(list(y));
  }
  out.push(list([...xs.slice(1), xs[0]]));
  return out;
};
const ORD = ["", "first", "second", "third", "fourth", "fifth"];
const table = (head: string[], rows: (string | number)[][]): Visual => ({ type: "table", head, rows });
/** The label (1-based) of the largest (most = true) or smallest value, found by comparing every pair. */
const pickBy = (vals: number[], most: boolean) => {
  for (let j = 0; j < vals.length; j++) {
    let beats = true;
    for (let i = 0; i < vals.length; i++) if (i !== j && (most ? vals[j] <= vals[i] : vals[j] >= vals[i])) beats = false;
    if (beats) return j + 1;
  }
  return -1;
};
const extreme = (vals: number[], most: boolean) => vals.indexOf(most ? Math.max(...vals) : Math.min(...vals)) + 1;

// ---------------------------------------------------------------- patterns
const UNITS = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1], [0, 1, 2, 3]];
const patVals = (a: number, b: number) => {
  const v = [a, b];
  let x = ((a + b) % 9) + 1;
  while (v.length < 4) {
    if (!v.includes(x)) v.push(x);
    x = (x % 9) + 1;
  }
  return v;
};
const patSeq = ([u, a, b, s]: number[]) => {
  const unit = UNITS[u];
  const L = unit.length;
  const v = patVals(a, b);
  const shown = 2 * L + s;
  return { unit, L, v, shown, seq: [...Array(shown)].map((_, i) => v[unit[i % L]]) };
};
/** The smallest repeat length that fits every shown item (a search, not the generator's unit). */
const period = <T,>(seq: T[]) => {
  for (let p = 1; p <= seq.length / 2; p++) if (seq.every((x, i) => i + p >= seq.length || seq[i + p] === x)) return p;
  return seq.length;
};
const chunks = <T,>(seq: T[], L: number) => [...Array(Math.ceil(seq.length / L))].map((_, i) => seq.slice(i * L, i * L + L));
const SYM = ["●", "▲", "■", "★"];
const SYMN = ["circle", "triangle", "square", "star"];

// ---------------------------------------------------------------- positions
const ANIMALS = ["cat", "dog", "cow", "hen", "goat", "duck", "parrot", "rabbit"];
const rowOf = (n: number, seed: number) => [...ANIMALS].sort((x, y) => hs(`${seed}:${x}`) - hs(`${seed}:${y}`)).slice(0, n);
const SHELF_ITEMS = ["books", "balls", "cups", "toy cars", "dolls", "boxes"];
const shelfOf = (S: number, seed: number) => {
  const items = [...SHELF_ITEMS].sort((x, y) => hs(`${seed}:${x}`) - hs(`${seed}:${y}`)).slice(0, S);
  const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort((x, y) => hs(`${seed}:c${x}`) - hs(`${seed}:c${y}`)).slice(0, S);
  const names = S === 3 ? ["Top", "Middle", "Bottom"] : ["Top", "Second", "Third", "Bottom"];
  return { items, counts, names };
};

// ---------------------------------------------------------------- shapes
const SOLIDS = ["sphere", "cylinder", "cube", "cuboid", "cone"] as const;
const OBJECTS: [string, number][] = [
  ["a ball", 0], ["a laddu", 0], ["an orange", 0], ["a globe", 0], ["a marble", 0],
  ["a candle", 1], ["a tin of oil", 1], ["a pipe", 1], ["a battery", 1], ["a drum", 1],
  ["a dice", 2], ["an ice cube", 2], ["a paneer cube", 2],
  ["a brick", 3], ["a matchbox", 3], ["a book", 3], ["a duster", 3], ["a pencil box", 3],
  ["an ice-cream cone", 4], ["a birthday cap", 4], ["a traffic cone", 4], ["a mehndi cone", 4],
];
/** What each solid is like (flat faces, a curved surface, all faces squares): the check sorts things by these. */
const SOLID_PROPS: Record<string, { flat: number; curved: boolean; squares: boolean }> = {
  sphere: { flat: 0, curved: true, squares: false },
  cylinder: { flat: 2, curved: true, squares: false },
  cube: { flat: 6, curved: false, squares: true },
  cuboid: { flat: 6, curved: false, squares: false },
  cone: { flat: 1, curved: true, squares: false },
};
const TARGETS = [0, 1, 2, 4];
const objectsOf = (seed: number) => [...OBJECTS].sort((x, y) => hs(`${seed}:${x[0]}`) - hs(`${seed}:${y[0]}`)).slice(0, 6);
const FLAT: [string, number][] = [["▲", 0], ["▼", 0], ["◀", 0], ["▶", 0], ["■", 1], ["□", 1], ["●", 2], ["○", 2], ["▬", 3], ["▮", 3]];
/** Sides and whether all sides are equal, for each drawn shape (used by the check). */
const FLAT_PROPS: Record<string, { sides: number; equal: boolean }> = { "▲": { sides: 3, equal: false }, "▼": { sides: 3, equal: false }, "◀": { sides: 3, equal: false }, "▶": { sides: 3, equal: false }, "■": { sides: 4, equal: true }, "□": { sides: 4, equal: true }, "●": { sides: 0, equal: false }, "○": { sides: 0, equal: false }, "▬": { sides: 4, equal: false }, "▮": { sides: 4, equal: false } };
const FLATN = ["triangle", "square", "circle"];
const flatRow = (len: number, seed: number) => [...Array(len)].map((_, i) => FLAT[hs(`${seed}:${len}:${i}`) % FLAT.length]);

// ---------------------------------------------------------------- calendar
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MLEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** The weekday of the 1st (0 = Sunday), from 1 January 2026 (a Thursday) and 2027 (a Friday): both are not leap years. */
const firstDay = (yr: number, m: number) => ([4, 5][yr] + MLEN.slice(0, m).reduce((a, b) => a + b, 0)) % 7;
const calendar = (yr: number, m: number): Visual => {
  const s = firstDay(yr, m);
  const cells: (number | string)[] = [...Array(s).fill(""), ...[...Array(MLEN[m])].map((_, i) => i + 1)];
  while (cells.length % 7) cells.push("");
  return { type: "table", head: DAYS.map((d) => d.slice(0, 3)), rows: chunks(cells, 7), title: `${MONTHS[m]} ${2026 + yr}` };
};
const utcDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).getUTCDay();
const EVENTS = ["the school fair", "Sports Day", "the class picnic", "Grandma's visit", "the drawing contest"];

// ---------------------------------------------------------------- lengths, masses, capacity, time
const LCTX = [
  { thing: "ribbon", most: "longest", least: "shortest" },
  { thing: "pencil", most: "longest", least: "shortest" },
  { thing: "tower of blocks", most: "tallest", least: "shortest" },
];
const plural = (t: string) => (t === "tower of blocks" ? "towers of blocks" : `${t}s`);
const DAYLIFE = ["wakes up", "eats breakfast", "goes to school", "eats lunch at school", "comes back home", "plays outside", "eats dinner", "goes to bed"];
const ACTS: [string, number][] = [["tie your shoelaces", 1], ["brush your teeth", 3], ["eat lunch", 20], ["watch a film", 150], ["sleep at night", 600], ["a school week, Monday to Friday", 7200], ["the summer holidays", 60000]];

// ---------------------------------------------------------------- money
const SMALL = [1, 2, 5, 10];
const BIGV = [1, 2, 5, 10, 20, 50];
const moneyOf = (seed: number, big: number) => {
  const vals = big ? BIGV : SMALL;
  const n = big ? 3 + (hs(`m${seed}`) % 3) : 2 + (hs(`m${seed}`) % 3);
  return [...Array(n)].map((_, i) => vals[hs(`m${seed}:${i}`) % vals.length]).sort((a, b) => b - a);
};
const COINV1 = [1, 2, 5, 10, 20];
const COINV2 = [1, 2, 5, 10, 20, 50, 100];
const coinsOf = (seed: number, big: number) => {
  const vals = big ? COINV2 : COINV1;
  const n = 3 + (hs(`c${seed}`) % 3);
  return [...Array(n)].map((_, i) => vals[hs(`c${seed}:${i}`) % vals.length]);
};
const rs = (v: number) => `₹${v}`;
const kindOfMoney = (v: number) => (v >= 50 ? "note" : "coin");
const NOTE_B = [0, 10, 20, 50];
const COIN_C = [1, 2, 5, 10];

// ---------------------------------------------------------------- numbers
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n: number) => (n < 10 ? ONES[n] : n < 20 ? TEENS[n - 10] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
/** The value of a number name, by adding the values of its parts (the check reads the words, not the number). */
const WORDVAL: Record<string, number> = Object.fromEntries([
  ...ONES.map((w, i) => [w, i] as [string, number]).filter(([w]) => w),
  ...TEENS.map((w, i) => [w, 10 + i] as [string, number]),
  ...TENS.map((w, i) => [w, 10 * i] as [string, number]).filter(([w]) => w),
]);
const wordValue = (w: string) => w.split("-").reduce((s, part) => s + (WORDVAL[part] ?? NaN), 0);
const FRUIT = ["mangoes", "bananas", "guavas", "apples", "lemons"];

export const B01: Def[] = [
  // ================================================================ MATH.algebra.repeating-patterns
  {
    id: "aapatn",
    arity: 4,
    title: "What comes next in a repeating pattern",
    competency: PAT,
    type: "integer",
    mc: true,
    // [u, a, b, s]: the repeating part UNITS[u] (AB, AAB, ABB, ABC, AABB, ABCD) made of numbers a, b (and two more), shown 2 full times plus s
    parse: none,
    reject: guard([[0, 5], [1, 9], [1, 9], [0, 3]], ([u, a, b, s]) => a !== b && s < UNITS[u].length, "A repeating pattern of small numbers, shown at least twice."),
    prompt: (p) => {
      const { seq } = patSeq(p);
      return `The number cards in the picture make a pattern that repeats: ${list(seq)}, ?. Which number comes next?`;
    },
    solve: (p) => {
      const { unit, L, v, shown } = patSeq(p);
      return {
        steps: [
          st("unit", "find the repeating part", PAT, unit.map((i) => v[i]), list(unit.map((i) => v[i]))),
          st("place", "find the place in the part", PAT, [shown, L], (shown % L) + 1),
          st("next", "continue", PAT, [], v[unit[shown % L]]),
        ],
        answer: v[unit[shown % L]],
      };
    },
    // independent: search for the shortest repeat that fits the cards, then the next card equals the card one repeat back
    validate: (p, ans) => {
      const { seq } = patSeq(p);
      const r = period(seq);
      return ans === seq[seq.length - r];
    },
    bugs: (p) => {
      const { unit, L, v, shown, seq } = patSeq(p);
      return [
        bug("copy-last", "procedural", PAT, "The last card was copied. Find the part that repeats, then see what comes after the last card in that part.", seq[shown - 1]),
        bug("start-again", "conceptual", PAT, "The pattern was started again from its first number, but the last repeating part is not finished yet.", v[unit[0]]),
        bug("skip-one", "procedural", PAT, "One place was skipped. Point to each card as you say the pattern, then say the next one.", v[unit[(shown + 1) % L]]),
      ];
    },
    distractors: (p) => {
      const { v, unit } = patSeq(p);
      return [...new Set(unit.map((i) => v[i])), v[3]];
    },
    variants: () => [],
    explain: (s) => (s.id === "unit" ? `The part that repeats is ${s.value}.` : s.id === "place" ? `The ? is place ${s.value} of the repeating part.` : `So the next number is ${s.value}.`),
    domain: [[0, 5], [1, 9], [1, 9], [0, 3]],
    cap: 400,
    difficulty: ([u]) => (UNITS[u].length === 2 ? 1 : UNITS[u].length === 3 ? 2 : 3),
    figure: (p) => {
      const { seq } = patSeq(p);
      return table([...seq.map((_, i) => String(i + 1)), String(seq.length + 1)], [[...seq, "?"]]);
    },
    word: (p) => {
      const { seq } = patSeq(p);
      return `${nm(p[1] + p[2])} draws a kolam border with groups of dots. The groups have ${list(seq)} dots, and the pattern keeps repeating. How many dots are in the next group?`;
    },
    teach: {
      idea: "A repeating pattern has one part that comes again and again, always in the same order.",
      method: "Find the part that repeats and say the pattern aloud part by part. See where the last part stops: the next number is the one that comes after it in the part.",
      visual: (p) => {
        const { seq, L } = patSeq(p);
        return table([...Array(L)].map((_, i) => ORD[i + 1]), chunks([...seq, "?"], L));
      },
      alternatives: [
        { id: "rows", title: "Put each repeat in its own row", kind: "conceptual", text: ["Write the pattern in rows, one repeating part in each row.", "The ? sits under a number in the row above: it is the same number."], visual: (p) => {
          const { seq, L } = patSeq(p);
          return table([...Array(L)].map((_, i) => ORD[i + 1]), chunks([...seq, "?"], L));
        } },
        { id: "clap", title: "Clap and say it", kind: "procedural", text: ["Say the pattern aloud and clap on the first number of each repeat.", "Keep going one more number after the last card."] },
      ],
    },
    limits: "Repeating parts of 2 to 4 numbers (AB, AAB, ABB, ABC, AABB, ABCD) shown at least twice; growing patterns and turning shapes are other families.",
  },
  {
    id: "aapatu",
    arity: 3,
    title: "How many shapes are in the part that repeats",
    competency: PAT,
    type: "integer",
    mc: true,
    // [u, q, s]: repeating part UNITS[u], shapes chosen by ordering 2q of the four shapes, shown 2 full times plus s
    parse: none,
    reject: guard([[0, 5], [0, 11], [0, 3]], ([u, , s]) => s < UNITS[u].length, "A repeating pattern of shapes, shown at least twice."),
    prompt: ([u, q, s]) => `This pattern of shapes repeats: ${shapeSeq(u, q, s).join(" ")}. How many shapes are in the part that repeats?`,
    solve: ([u, q, s]) => {
      const L = UNITS[u].length;
      const sh = shapeSeq(u, q, s);
      return { steps: [st("unit", "find the repeating part", PAT, sh.slice(0, L), sh.slice(0, L).join(" ")), st("count", "count", COUNT, [L], L)], answer: L };
    },
    // independent: the shortest shift that makes the row match itself
    validate: ([u, q, s], v) => v === period(shapeSeq(u, q, s)),
    bugs: ([u, q, s]) => {
      const sh = shapeSeq(u, q, s);
      return [
        bug("count-all", "conceptual", PAT, "All the shapes in the row were counted. The repeating part is the group that comes again and again.", sh.length),
        bug("count-kinds", "conceptual", PAT, "The different kinds of shape were counted. A shape can come twice inside one repeating part (like ● ● ▲).", new Set(sh).size),
        bug("two-repeats", "procedural", PAT, "Two repeats were counted as one. Stop at the first place where the pattern starts again.", 2 * UNITS[u].length),
      ];
    },
    distractors: ([u]) => [UNITS[u].length + 1, UNITS[u].length - 1],
    variants: () => [],
    explain: (s) => (s.id === "unit" ? `The part that repeats is ${s.value}.` : `It has ${s.value} shapes.`),
    domain: [[0, 5], [0, 11], [0, 3]],
    difficulty: ([u]) => (u === 0 ? 1 : u <= 3 ? 2 : 3),
    figure: ([u, q, s]) => {
      const sh = shapeSeq(u, q, s);
      return table(sh.map((_, i) => String(i + 1)), [sh]);
    },
    word: ([u, q, s]) => `${nm(u + q)} sticks paper shapes along the edge of a greeting card, as in the picture, and keeps repeating the same group. How many shapes are in the group that repeats?`,
    teach: {
      idea: "The repeating part is the smallest group of shapes that, put again and again, makes the whole pattern.",
      method: "Start at the first shape and look for the place where the same shapes start again in the same order. Count the shapes before that place.",
      visual: ([u, q, s]) => table([...Array(UNITS[u].length)].map((_, i) => ORD[i + 1]), chunks(shapeSeq(u, q, s), UNITS[u].length)),
      alternatives: [
        { id: "cut", title: "Cut the row into repeats", kind: "conceptual", text: ["Draw a line after the first group and check that the next shapes are the same group.", "If every group matches, you found the repeating part."], visual: ([u, q, s]) => table([...Array(UNITS[u].length)].map((_, i) => ORD[i + 1]), chunks(shapeSeq(u, q, s), UNITS[u].length)) },
      ],
    },
    limits: "Patterns of up to four kinds of shape with a repeating part of 2 to 4 shapes, shown at least twice.",
  },

  // ================================================================ MATH.geometry.positions
  {
    id: "aarow",
    arity: 4,
    title: "Places in a row: left and right",
    competency: POS,
    type: "integer",
    mc: true,
    // [n, k, kind, seed]: n animals in a row, the k-th from the left; kind 0 place from left, 1 place from right, 2 how many to the left, 3 how many to the right
    parse: none,
    reject: guard([[4, 8], [1, 8], [0, 3], [0, 2]], ([n, k]) => k <= n, "A row of 4 to 8 animals."),
    prompt: ([n, k, kind, seed]) => {
      const t = rowOf(n, seed)[k - 1];
      return kind === 0
        ? `The animals in the picture stand in a row. Counting from the left, in which place is the ${t}? (Write 1 for first, 2 for second, and so on.)`
        : kind === 1
          ? `The animals in the picture stand in a row. Counting from the right, in which place is the ${t}? (Write 1 for first, 2 for second, and so on.)`
          : `The animals in the picture stand in a row. How many animals are to the ${kind === 2 ? "left" : "right"} of the ${t}?`;
    },
    solve: ([n, k, kind]) => {
      const ans = kind === 0 ? k : kind === 1 ? n - k + 1 : kind === 2 ? k - 1 : n - k;
      return { steps: [st("find", "find", POS, [k, n], k), st("count", "count", COUNT, [kind], ans)], answer: ans };
    },
    // independent: find the animal by looking along the row, then count the animals on each side one by one
    validate: ([n, k, kind, seed], v) => {
      const row = rowOf(n, seed);
      const t = rowOf(n, seed)[k - 1];
      let at = -1;
      for (let i = 0; i < row.length; i++) if (row[i] === t) at = i;
      let left = 0;
      let right = 0;
      for (let i = 0; i < row.length; i++) {
        if (i < at) left++;
        if (i > at) right++;
      }
      return v === [left + 1, right + 1, left, right][kind];
    },
    bugs: ([n, k, kind]) =>
      kind === 0
        ? [bug("other-side", "conceptual", POS, "The counting started from the right. Start at the box marked left and count towards the right.", n - k + 1)]
        : kind === 1
          ? [bug("other-side", "conceptual", POS, "The counting started from the left. Start at the box marked right and count towards the left.", k)]
          : [
            bug("count-self", "procedural", POS, "The animal itself was counted too. Count only the animals beside it, not the animal named.", kind === 2 ? k : n - k + 1),
            bug("other-side", "conceptual", POS, `The animals on the other side were counted. ${kind === 2 ? "Left" : "Right"} is the side marked ${kind === 2 ? "left" : "right"} in the picture.`, kind === 2 ? n - k : k - 1),
          ],
    distractors: ([n, k, kind]) => [k, n - k + 1, k - 1, n - k, n, k + 1].filter((x) => (kind <= 1 ? x >= 1 && x <= n : x >= 0 && x < n)),
    variants: () => [],
    explain: (s) => (s.id === "find" ? `Find the animal in the row: it is in box ${s.value} from the left.` : `Count from the side asked about: the answer is ${s.value}.`),
    domain: [[4, 8], [1, 8], [0, 3], [0, 2]],
    cap: 300,
    difficulty: ([n, , kind]) => (kind === 0 && n <= 5 ? 1 : kind <= 1 ? 2 : 3),
    figure: ([n, , , seed]) => table([...Array(n)].map((_, i) => (i === 0 ? "left" : i === n - 1 ? "right" : "")), [rowOf(n, seed)]),
    word: ([n, k, kind, seed]) => {
      const t = rowOf(n, seed)[k - 1];
      return kind <= 1
        ? `At the village pond the animals line up to drink water, as in the picture. ${nm(n + k)} counts from the ${kind === 0 ? "left" : "right"}. In which place does the ${t} stand?`
        : `At the village pond the animals line up to drink water, as in the picture. How many animals stand to the ${kind === 2 ? "left" : "right"} of the ${t}?`;
    },
    teach: {
      idea: "A place in a row depends on where you start counting: first from the left can be last from the right.",
      method: "Put your finger on the side you are told (left or right). Count each animal once, moving along the row, until you reach the one asked about.",
      visual: ([n, , , seed]) => table([...Array(n)].map((_, i) => (i === 0 ? "left" : i === n - 1 ? "right" : "")), [rowOf(n, seed)]),
      alternatives: [
        { id: "number_line", title: "Number the boxes", kind: "procedural", text: ["Write 1, 2, 3 … under the boxes, starting from the side you are told.", "The number under the animal is its place. The animals before it are one fewer."], visual: ([n]) => ({ type: "numberline", from: 1, to: n }) },
      ],
    },
    limits: "Left and right in a single row of up to 8; inside/outside, near/far and route maps are not drawn here.",
  },
  {
    id: "aashelf",
    arity: 4,
    title: "Above and below on shelves",
    competency: POS,
    type: "integer",
    mc: true,
    // [S, t, dir, seed]: S shelves (top first), the thing on shelf t; dir 0 the shelf just above, 1 just below
    parse: none,
    reject: guard([[3, 4], [0, 3], [0, 1], [0, 11]], ([S, t, dir]) => t < S && (dir === 0 ? t >= 1 : t <= S - 2), "Three or four shelves, asking about the shelf just above or just below."),
    prompt: ([S, t, dir, seed]) => `Look at the shelves in the picture. How many things are on the shelf just ${dir === 0 ? "above" : "below"} the ${shelfOf(S, seed).items[t]}?`,
    solve: ([S, t, dir, seed]) => {
      const { counts, names } = shelfOf(S, seed);
      const r = dir === 0 ? t - 1 : t + 1;
      return { steps: [st("shelf", "find the shelf", POS, [t, dir], names[r]), st("read", "read", COUNT, [r], counts[r])], answer: counts[r] };
    },
    // independent: number the shelves by height from the floor (bottom = 0) and look for the shelf one higher or lower
    validate: ([S, t, dir, seed], v) => {
      const { counts } = shelfOf(S, seed);
      const height = (i: number) => S - 1 - i;
      const want = height(t) + (dir === 0 ? 1 : -1);
      for (let i = 0; i < S; i++) if (height(i) === want) return v === counts[i];
      return false;
    },
    bugs: ([S, t, dir, seed]) => {
      const { counts } = shelfOf(S, seed);
      const other = dir === 0 ? t + 1 : t - 1;
      return [
        bug("above-below", "conceptual", POS, `${dir === 0 ? "Above means higher up" : "Below means lower down"}: the shelf ${dir === 0 ? "over" : "under"} the ${shelfOf(S, seed).items[t]}, not the one on the other side.`, other >= 0 && other < S ? counts[other] : null),
        bug("same-shelf", "procedural", POS, `The things on the ${shelfOf(S, seed).items[t]} shelf itself were counted. Move one shelf ${dir === 0 ? "up" : "down"} first.`, counts[t]),
      ];
    },
    distractors: ([S, , , seed]) => shelfOf(S, seed).counts,
    variants: () => [],
    explain: (s) => (s.id === "shelf" ? `The shelf just ${s.inputs[1] === 0 ? "above" : "below"} is the ${String(s.value).toLowerCase()} shelf.` : `It has ${s.value} things on it.`),
    domain: [[3, 4], [0, 3], [0, 1], [0, 11]],
    difficulty: ([S, , dir]) => (S === 3 && dir === 0 ? 1 : S === 3 ? 2 : 3),
    figure: ([S, , , seed]) => {
      const { items, counts, names } = shelfOf(S, seed);
      return table(["Shelf", "What is on it"], names.map((n, i) => [n, `${counts[i]} ${items[i]}`]));
    },
    word: ([S, t, dir, seed]) => `${nm(seed + t)} is tidying the classroom cupboard, as in the picture. The teacher asks for everything on the shelf just ${dir === 0 ? "above" : "below"} the ${shelfOf(S, seed).items[t]}. How many things does ${nm(seed + t)} take out?`,
    teach: {
      idea: "Above means higher up and below means lower down. 'Just above' is the very next shelf up.",
      method: "Put your finger on the shelf named. Move it one shelf up for 'above' or one shelf down for 'below', and read what is there.",
      visual: ([S, , , seed]) => {
        const { items, counts, names } = shelfOf(S, seed);
        return table(["Shelf", "What is on it"], names.map((n, i) => [n, `${counts[i]} ${items[i]}`]));
      },
      alternatives: [
        { id: "body", title: "Use your body", kind: "conceptual", text: ["Your head is above your shoulders; your feet are below your knees.", "Point up for above and down for below, then move one shelf that way."], visual: () => ({ type: "numberline", from: 0, to: 4 }) },
      ],
    },
    limits: "Just above and just below on 3 or 4 shelves; inside/outside, in front/behind and near/far need real pictures and are left to the teacher.",
  },

  // ================================================================ MATH.geometry.shapes
  {
    id: "aasolid",
    arity: 2,
    title: "Things shaped like a sphere, cylinder, cube or cone",
    competency: SHP,
    type: "integer",
    mc: true,
    // [tg, seed]: the solid SOLIDS[TARGETS[tg]]; six everyday things chosen by seed
    parse: none,
    reject: guard([[0, 3], [0, 79]], ([tg, seed]) => {
      const c = objectsOf(seed).filter((o) => o[1] === TARGETS[tg]).length;
      return c >= 1 && c <= 4;
    }, "Six everyday things with 1 to 4 of the shape asked about."),
    prompt: ([tg, seed]) => `The picture shows a ${SOLIDS[TARGETS[tg]]}. Here are some things: ${objectsOf(seed).map((o) => o[0]).join(", ")}. How many of these things are shaped like a ${SOLIDS[TARGETS[tg]]}?`,
    solve: ([tg, seed]) => {
      const hits = objectsOf(seed).filter((o) => o[1] === TARGETS[tg]);
      return { steps: [st("sort", "sort by shape", SHP, hits.map((o) => o[0]), hits.map((o) => o[0]).join(", ")), st("count", "count", COUNT, [hits.length], hits.length)], answer: hits.length };
    },
    // independent: sort by what the solid is like (flat faces, curved surface, square faces), not by its name
    validate: ([tg, seed], v) => {
      const want = SOLID_PROPS[SOLIDS[TARGETS[tg]]];
      let c = 0;
      for (const [, s] of objectsOf(seed)) {
        const p = SOLID_PROPS[SOLIDS[s]];
        if (p.flat === want.flat && p.curved === want.curved && p.squares === want.squares) c++;
      }
      return v === c;
    },
    bugs: ([tg, seed]) => {
      const objs = objectsOf(seed);
      const n = (k: number) => objs.filter((o) => o[1] === k).length;
      const t = TARGETS[tg];
      const right = n(t);
      const mix: Record<number, [number, string]> = {
        0: [1, "Things that roll were all counted as spheres. A sphere is round all over, like a ball; a candle or a tin is a cylinder, with two flat circle faces."],
        1: [0, "Things that roll were all counted as cylinders. A cylinder has two flat circle faces; a ball has no flat face at all."],
        2: [3, "Box shapes were all counted as cubes. A cube has six faces that are all the same square, like a dice; a brick is longer than it is wide."],
        4: [1, "Things with a circle face were all counted as cones. A cone has one flat circle face and comes to a point; a cylinder has two circle faces."],
      };
      const [other, says] = mix[t];
      return [
        bug("mix-up", "conceptual", SHP, says, n(other) ? right + n(other) : null),
        bug("missed-one", "procedural", COUNT, "One thing was missed. Go through the list one by one and tick each thing of this shape.", right >= 2 ? right - 1 : null),
      ];
    },
    distractors: ([tg, seed]) => {
      const right = objectsOf(seed).filter((o) => o[1] === TARGETS[tg]).length;
      return [right + 1, right + 2, right - 1];
    },
    variants: () => [],
    explain: (s) => (s.id === "sort" ? `Shaped like this: ${s.value}.` : `That is ${s.value}.`),
    domain: [[0, 3], [0, 79]],
    cap: 300,
    difficulty: ([tg]) => (tg === 0 ? 1 : tg === 2 ? 3 : 2),
    figure: ([tg]) => ({ type: "solid", name: SOLIDS[TARGETS[tg]] }),
    word: ([tg, seed]) => `${nm(seed)} is tidying the room and puts every thing shaped like a ${SOLIDS[TARGETS[tg]]} (as in the picture) into one basket. The things are: ${objectsOf(seed).map((o) => o[0]).join(", ")}. How many things go into the basket?`,
    teach: {
      idea: "Solid shapes are known by their faces: a sphere has no flat face, a cylinder two circle faces, a cone one circle face and a point, a cube six equal square faces.",
      method: "For each thing, picture it in your hand: does it have flat faces? What shape are they? Then match it to the solid.",
      visual: ([tg]) => ({ type: "solid", name: SOLIDS[TARGETS[tg]] }),
      alternatives: [
        { id: "stamp", title: "Stamp the faces", kind: "conceptual", text: ["Press each flat face in clay or ink: a cube prints squares, a cylinder prints circles, a cone prints one circle.", "A sphere prints only a dot, because it has no flat face."], visual: ([tg]) => ({ type: "solid", name: SOLIDS[TARGETS[tg]] === "cube" ? "cube" : "cylinder" }) },
        { id: "roll", title: "Roll, slide or both", kind: "conceptual", text: ["A sphere rolls every way. A cylinder rolls one way and also slides on its flat face.", "A cube only slides. A cone rolls round in a circle."] },
      ],
    },
    limits: "Sorting named everyday things into sphere, cylinder, cube and cone (cuboid things are among the choices but are not asked for, since a cube is also a cuboid).",
  },
  {
    id: "aaflat",
    arity: 3,
    title: "Finding triangles, squares and circles turned different ways",
    competency: SHP,
    type: "integer",
    mc: true,
    // [tg, len, seed]: FLATN[tg] in a row of len shapes
    parse: none,
    reject: guard([[0, 2], [6, 9], [0, 29]], ([tg, len, seed]) => {
      const row = flatRow(len, seed);
      const c = row.filter((r) => r[1] === tg).length;
      const trap = tg === 0 ? row.some((r) => r[1] === 0 && r[0] !== "▲") : tg === 1 ? row.some((r) => r[1] === 3) : row.some((r) => r[0] === "○");
      return c >= 1 && c <= len - 2 && trap;
    }, "A row of 6 to 9 shapes with 1 or more of the shape asked about, some turned or not filled in."),
    prompt: ([tg, len, seed]) => `How many ${FLATN[tg]}s are in the picture? Look carefully: some shapes are turned around or not filled in.`,
    solve: ([tg, len, seed]) => {
      const c = flatRow(len, seed).filter((r) => r[1] === tg).length;
      return { steps: [st("find", "find the shapes", SHP, [FLATN[tg]], FLATN[tg]), st("count", "count", COUNT, [c], c)], answer: c };
    },
    // independent: classify each drawn shape by its sides (3 sides; 4 equal sides; no sides) and count
    validate: ([tg, len, seed], v) => {
      let c = 0;
      for (const [s] of flatRow(len, seed)) {
        const p = FLAT_PROPS[s];
        if (tg === 0 ? p.sides === 3 : tg === 1 ? p.sides === 4 && p.equal : p.sides === 0) c++;
      }
      return v === c;
    },
    bugs: ([tg, len, seed]) => {
      const row = flatRow(len, seed);
      const c = row.filter((r) => r[1] === tg).length;
      return [
        tg === 0
          ? bug("only-upright", "conceptual", SHP, "Only the triangles pointing up were counted. A triangle is still a triangle when it is turned: it has 3 sides and 3 corners.", row.filter((r) => r[0] === "▲").length)
          : tg === 1
            ? bug("rectangles-too", "conceptual", SHP, "Long rectangles were counted as squares. A square has 4 sides that are all the same length.", c + row.filter((r) => r[1] === 3).length)
            : bug("only-filled", "conceptual", SHP, "Only the coloured circles were counted. An empty circle is still a circle: the colour does not change the shape.", row.filter((r) => r[0] === "●").length),
        bug("missed-one", "procedural", COUNT, "One shape was missed. Touch each shape in the row once as you look at it.", c >= 2 ? c - 1 : null),
      ];
    },
    distractors: ([tg, len, seed]) => {
      const c = flatRow(len, seed).filter((r) => r[1] === tg).length;
      return [c + 1, c + 2, len];
    },
    variants: () => [],
    explain: (s) => (s.id === "find" ? `Look for every ${s.value}, whichever way it is turned.` : `There are ${s.value}.`),
    domain: [[0, 2], [6, 9], [0, 29]],
    cap: 300,
    difficulty: ([tg, len]) => (tg === 2 && len <= 7 ? 1 : len <= 7 ? 2 : 3),
    figure: ([, len, seed]) => table(flatRow(len, seed).map((_, i) => String(i + 1)), [flatRow(len, seed).map((r) => r[0])]),
    word: ([tg, len, seed]) => `${nm(seed + len)} cut shapes from paper for a rangoli, as in the picture. How many of the shapes are ${FLATN[tg]}s?`,
    teach: {
      idea: "A shape keeps its name when it is turned or coloured differently: a triangle always has 3 sides and 3 corners, a square 4 equal sides, a circle no corners.",
      method: "Look at each shape in turn and count its sides with your finger. Then count the shapes that match.",
      visual: ([, len, seed]) => table(flatRow(len, seed).map((_, i) => String(i + 1)), [flatRow(len, seed).map((r) => r[0])]),
      alternatives: [
        { id: "sides", title: "Count sides and corners", kind: "conceptual", text: ["Triangle: 3 sides, 3 corners. Square: 4 equal sides, 4 corners. Circle: no sides, no corners.", "Turning a shape does not change how many sides it has."], visual: ([tg]) => ({ type: "shape", sides: tg === 0 ? 3 : 4, name: tg === 0 ? "triangle" : "square" }) },
      ],
    },
    limits: "Triangles, squares and circles among drawn symbols (squares are not asked as rectangles); counting sides of one drawn shape is left to the counting families.",
  },

  // ================================================================ MATH.measurement.calendar
  {
    id: "aacald",
    arity: 4,
    title: "The date of the first, second … Monday on a calendar",
    competency: CAL,
    type: "integer",
    mc: true,
    // [yr, m, w, k]: the k-th weekday w (0 = Sunday) of month m in 2026 + yr
    parse: none,
    reject: guard([[0, 1], [0, 11], [0, 6], [1, 5]], ([yr, m, w, k]) => 1 + ((w - firstDay(yr, m) + 7) % 7) + 7 * (k - 1) <= MLEN[m], "A day that is on the month's calendar."),
    prompt: ([yr, m, w, k]) => `Look at the calendar for ${MONTHS[m]} ${2026 + yr}. What is the date of the ${ORD[k]} ${DAYS[w]}?`,
    solve: ([yr, m, w, k]) => {
      const first = 1 + ((w - firstDay(yr, m) + 7) % 7);
      return { steps: [st("first", "find on the calendar", CAL, [DAYS[w]], first), st("weeks", "add weeks", ADD, [first, k - 1], first + 7 * (k - 1))], answer: first + 7 * (k - 1) };
    },
    // independent: walk through the month day by day with the computer's own calendar, counting the weekday
    validate: ([yr, m, w, k], v) => {
      let seen = 0;
      for (let d = 1; d <= 31; d++) {
        const dt = new Date(Date.UTC(2026 + yr, m, d));
        if (dt.getUTCMonth() !== m) break;
        if (dt.getUTCDay() === w && ++seen === k) return v === d;
      }
      return false;
    },
    bugs: ([yr, m, w, k]) => {
      const s = firstDay(yr, m);
      const first = 1 + ((w - s + 7) % 7);
      const ans = first + 7 * (k - 1);
      return [
        bug("blank-box", "procedural", CAL, `The empty box in the first row was counted as a ${DAYS[w]}. Start from the first box in the ${DAYS[w].slice(0, 3)} column that has a date.`, w < s && k >= 2 ? ans - 7 : null),
        bug("one-week-out", "procedural", CAL, `The ${DAYS[w]}s were counted one too many. Say first, second, third … as you go down the column.`, ans + 7 <= MLEN[m] ? ans + 7 : null),
        bug("next-column", "procedural", CAL, `The date was read from the column next to ${DAYS[w]}. Keep your finger in the ${DAYS[w].slice(0, 3)} column.`, ans + 1 <= MLEN[m] ? ans + 1 : ans - 1),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "first" ? `The first ${s.inputs[0]} is on date ${s.value}.` : `Each week down the column adds 7: ${s.inputs[0]} + 7 × ${s.inputs[1]} = ${s.value}.`),
    domain: [[0, 1], [0, 11], [0, 6], [1, 5]],
    cap: 300,
    difficulty: ([yr, m, w, k]) => (k <= 2 && w >= firstDay(yr, m) ? 1 : k <= 3 ? 2 : 3),
    figure: ([yr, m]) => calendar(yr, m),
    word: ([yr, m, w, k]) => `${nm(m + w)} has a dance class every ${DAYS[w]}. In ${MONTHS[m]} ${2026 + yr}, on which date is the ${ORD[k]} dance class? Use the calendar.`,
    teach: {
      idea: "On a calendar each column is one day of the week, and going down one row moves on 7 days.",
      method: "Find the column for the day. Go down it from the first date in that column, counting first, second, third … The date in the box is the answer.",
      visual: ([yr, m]) => calendar(yr, m),
      alternatives: [
        { id: "add7", title: "Add 7 for each week", kind: "procedural", text: ["Find the date of the first one.", "Add 7 for each week after it: the third one is the first one + 7 + 7."], visual: ([yr, m, w, k]) => {
          const first = 1 + ((w - firstDay(yr, m) + 7) % 7);
          return { type: "numberline", from: 0, to: 35, step: 7, marks: [...Array(k)].map((_, i) => first + 7 * i) };
        } },
      ],
    },
    limits: "Months of 2026 and 2027 (no leap years); naming the day for a date is asked through dates, since answers are numbers.",
  },
  {
    id: "aacalc",
    arity: 3,
    title: "How many Mondays (or other days) are in a month",
    competency: CAL,
    type: "integer",
    mc: true,
    // [yr, m, w]
    parse: none,
    reject: guard([[0, 1], [0, 11], [0, 6]], () => true, "A month of 2026 or 2027 and a day of the week."),
    prompt: ([yr, m, w]) => `Look at the calendar for ${MONTHS[m]} ${2026 + yr}. How many ${DAYS[w]}s are there in this month?`,
    solve: ([yr, m, w]) => {
      const first = 1 + ((w - firstDay(yr, m) + 7) % 7);
      const c = Math.floor((MLEN[m] - first) / 7) + 1;
      return { steps: [st("first", "find on the calendar", CAL, [DAYS[w]], first), st("count", "count", COUNT, [first, MLEN[m]], c)], answer: c };
    },
    // independent: go through every date of the month with the computer's calendar and count the matches
    validate: ([yr, m, w], v) => {
      let c = 0;
      for (let d = 1; d <= 31; d++) if (new Date(Date.UTC(2026 + yr, m, d)).getUTCMonth() === m && utcDay(2026 + yr, m, d) === w) c++;
      return v === c;
    },
    bugs: ([yr, m]) => {
      const rows = Math.ceil((firstDay(yr, m) + MLEN[m]) / 7);
      return [
        bug("count-rows", "procedural", CAL, "The rows of the calendar were counted, but some rows have an empty box in this column. Count only boxes with a date.", rows),
        bug("always-four", "conceptual", CAL, "It was taken that every month has 4 of each day. A month is a little longer than 4 weeks, so some days come 5 times.", 4),
      ];
    },
    distractors: () => [3, 4, 5, 6],
    variants: () => [],
    explain: (s) => (s.id === "first" ? `The first one is on the ${s.value}.` : `Going down the column there are ${s.value} dates.`),
    domain: [[0, 1], [0, 11], [0, 6]],
    difficulty: ([yr, m, w]) => (MLEN[m] === 28 ? 1 : w < firstDay(yr, m) ? 3 : 2),
    figure: ([yr, m]) => calendar(yr, m),
    word: ([yr, m, w]) => `${nm(m + w + 3)}'s grandmother visits the temple every ${DAYS[w]}. How many times does she go in ${MONTHS[m]} ${2026 + yr}? Use the calendar.`,
    teach: {
      idea: "Each column of a calendar holds one day of the week; a month of 29 to 31 days has some days 5 times.",
      method: "Find the column for the day and count the boxes in it that have a date. Skip empty boxes.",
      visual: ([yr, m]) => calendar(yr, m),
      alternatives: [
        { id: "weeks", title: "Four weeks and a few days", kind: "conceptual", text: ["4 weeks are 28 days, so every day comes at least 4 times.", "The days left over after 28 (the 29th, 30th, 31st) are the days that come a 5th time."], visual: ([yr, m]) => ({ type: "numberline", from: 0, to: MLEN[m], step: 7 }) },
      ],
    },
    limits: "Months of 2026 and 2027 (no leap years).",
  },
  {
    id: "aacalgap",
    arity: 4,
    title: "Days from one date to another in the same month",
    competency: CAL,
    type: "integer",
    mc: true,
    // [yr, m, d1, g]: from d1 to d1 + g in month m
    parse: none,
    reject: guard([[0, 1], [0, 11], [1, 28], [2, 20]], ([, m, d1, g]) => d1 + g <= MLEN[m], "Two dates in the same month, 2 to 20 days apart."),
    prompt: ([yr, m, d1, g]) => `Today is ${d1} ${MONTHS[m]} ${2026 + yr}. ${cap(EVENTS[(m + d1) % EVENTS.length])} is on ${d1 + g} ${MONTHS[m]}. How many days from today until ${EVENTS[(m + d1) % EVENTS.length]}? Use the calendar.`,
    solve: ([, , d1, g]) => ({ steps: [st("subtract", "subtract", SUB, [d1 + g, d1], g)], answer: g }),
    // independent: step from today one day at a time with the computer's calendar until the day arrives
    validate: ([yr, m, d1, g], v) => {
      const end = Date.UTC(2026 + yr, m, d1 + g);
      let t = Date.UTC(2026 + yr, m, d1);
      let c = 0;
      while (t < end) {
        t += 86400000;
        c++;
      }
      return v === c;
    },
    bugs: ([, , , g]) => [
      bug("count-both", "procedural", CAL, "Today was counted as well as the last day. Start counting with tomorrow: tomorrow is 1 day away.", g + 1),
      bug("count-between", "procedural", CAL, "Only the days in between were counted. The day itself must be reached too.", g - 1),
    ],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} days.`,
    domain: [[0, 1], [0, 11], [1, 28], [2, 20]],
    cap: 300,
    difficulty: ([, , , g]) => (g <= 7 ? 1 : g <= 14 ? 2 : 3),
    figure: ([yr, m]) => calendar(yr, m),
    word: ([yr, m, d1, g]) => `${nm(d1 + g)} plants a bean seed on ${d1} ${MONTHS[m]}. The first leaf comes out on ${d1 + g} ${MONTHS[m]}. How many days did the seed take? Use the calendar.`,
    teach: {
      idea: "The number of days from one date to a later one is how many steps you take, one day at a time, from the first date to the second.",
      method: "Put your finger on today. Count 1 for tomorrow, 2 for the next day … and stop on the day itself. Or take the smaller date from the bigger one.",
      visual: ([yr, m]) => calendar(yr, m),
      alternatives: [
        { id: "jumps", title: "Jumps on a number line", kind: "procedural", text: ["Mark both dates on a number line.", "Count the jumps between them, not the marks."], visual: ([, , d1, g]) => ({ type: "numberline", from: d1, to: d1 + g, jumps: [...Array(g)].map((_, i) => [d1 + i, d1 + i + 1]) }) },
      ],
    },
    limits: "Dates in the same month of 2026 or 2027, 2 to 20 days apart; spans across months are the next family.",
  },
  {
    id: "aacalmo",
    arity: 4,
    title: "Days from a date in one month to a date in the next",
    competency: CAL,
    type: "integer",
    mc: true,
    // [yr, m, o, d2]: from (last day of month m − o) to d2 of the next month
    parse: none,
    reject: guard([[0, 1], [0, 11], [0, 9], [1, 10]], ([, , o, d2]) => o + d2 >= 2, "From near the end of a month to early in the next month."),
    prompt: ([yr, m, o, d2]) => `Today is ${MLEN[m] - o} ${MONTHS[m]}. ${nm(m + o)}'s birthday is on ${d2} ${MONTHS[(m + 1) % 12]}. How many days from today until the birthday?`,
    solve: ([, m, o, d2]) => ({
      steps: [st("rest", "days left in the month", CAL, [MLEN[m], MLEN[m] - o], o), st("add", "add", ADD, [o, d2], o + d2)],
      answer: o + d2,
    }),
    // independent: the difference of the two dates on the computer's calendar
    validate: ([yr, m, o, d2], v) => {
      const y = 2026 + yr;
      const days = (Date.UTC(y, m + 1, d2) - Date.UTC(y, m, new Date(Date.UTC(y, m + 1, 0)).getUTCDate() - o)) / 86400000;
      return v === days;
    },
    bugs: ([, m, o, d2]) => [
      bug(MLEN[m] === 30 ? "thirty-one-days" : "thirty-days", "recall", CAL, `It was taken that ${MONTHS[m]} has ${MLEN[m] === 30 ? 31 : 30} days. ${MONTHS[m]} has ${MLEN[m]} days: use the knuckle rhyme or the calendar.`, MLEN[m] === 30 ? o + 1 + d2 : 30 - (MLEN[m] - o) + d2),
      bug("count-both", "procedural", CAL, "Today was counted as well as the birthday. Start counting with tomorrow.", o + d2 + 1),
    ],
    variants: () => [],
    explain: (s) => (s.id === "rest" ? `From the ${s.inputs[1]} to the end of the month (${s.inputs[0]}) is ${s.value} days.` : `Then ${s.inputs[1]} more days into the next month: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}.`),
    domain: [[0, 1], [0, 11], [0, 9], [1, 10]],
    cap: 300,
    difficulty: ([, m, o, d2]) => (o + d2 <= 7 ? 1 : MLEN[m] === 31 ? 2 : 3),
    figure: ([yr, m]) => calendar(yr, m),
    word: ([yr, m, o, d2]) => `${nm(m + d2)}'s family goes to Madurai on ${MLEN[m] - o} ${MONTHS[m]} ${2026 + yr} and comes home on ${d2} ${MONTHS[(m + 1) % 12]}. How many days after they leave do they come home?`,
    teach: {
      idea: "Months have different numbers of days: April, June, September and November have 30, February has 28 (29 in a leap year), the rest have 31.",
      method: "Count the days left in this month (its last date minus today), then add the date in the next month.",
      visual: ([yr, m]) => calendar(yr, m),
      alternatives: [
        { id: "knuckles", title: "The knuckle way", kind: "recall", text: ["Make two fists. Say the months along your knuckles and the gaps between them.", "Months on a knuckle have 31 days; months in a gap have 30 (February 28 or 29)."], visual: ([, m, o, d2]) => ({ type: "numberline", from: MLEN[m] - o, to: MLEN[m] + d2, marks: [MLEN[m]] }) },
      ],
    },
    limits: "From the last 10 days of a month to the first 10 days of the next, in 2026 or 2027 (no leap years).",
  },

  // ================================================================ MATH.measurement.length-comparison
  {
    id: "aalong",
    arity: 4,
    title: "Which is the longest or the shortest",
    competency: LEN,
    type: "integer",
    mc: true,
    // [k, q, kind, ctx]: k things with lengths 3 + 2 × (order q); kind 0 longest/tallest, 1 shortest
    parse: none,
    reject: guard([[4, 5], [0, 119], [0, 1], [0, 2]], ([k, q]) => q < fact(k), "Four or five things of different lengths."),
    prompt: ([k, q, kind, ctx]) => `Look at the ${plural(LCTX[ctx].thing)} in the picture. Which ${LCTX[ctx].thing} is the ${kind === 0 ? LCTX[ctx].most : LCTX[ctx].least}? Write its number.`,
    solve: ([k, q, kind]) => {
      const L = perm(k, q).map((r) => 3 + 2 * r);
      const a = extreme(L, kind === 0);
      return { steps: [st("compare", "compare", LEN, L, a)], answer: a };
    },
    // independent: the one that beats every other one when compared two at a time
    validate: ([k, q, kind], v) => v === pickBy(perm(k, q).map((r) => 3 + 2 * r), kind === 0),
    bugs: ([k, q, kind, ctx]) => {
      const L = perm(k, q).map((r) => 3 + 2 * r);
      return [
        bug("opposite", "conceptual", LEN, `The ${kind === 0 ? LCTX[ctx].least : LCTX[ctx].most} one was chosen. ${kind === 0 ? `The ${LCTX[ctx].most} one reaches the furthest.` : `The ${LCTX[ctx].least} one ends first.`}`, extreme(L, kind !== 0)),
        bug("label-number", "conceptual", LEN, "The number written under it was taken as its length. The numbers only name them; look at how far each one reaches.", kind === 0 ? k : 1),
      ];
    },
    distractors: ([k]) => [...Array(k)].map((_, i) => i + 1),
    variants: () => [],
    explain: (s) => `They all start on the same line; compare the other ends: number ${s.value} is the one asked for.`,
    domain: [[4, 5], [0, 119], [0, 1], [0, 2]],
    cap: 300,
    difficulty: ([k, , kind]) => (k === 4 && kind === 0 ? 1 : k === 4 ? 2 : 3),
    figure: ([k, q, , ctx]) => ({ type: "bars", title: plural(LCTX[ctx].thing), labels: [...Array(k)].map((_, i) => String(i + 1)), values: perm(k, q).map((r) => 3 + 2 * r) }),
    word: ([k, q, kind, ctx]) => `${nm(q + ctx)} and friends stand their ${plural(LCTX[ctx].thing)} side by side on the floor, as in the picture. Whose is the ${kind === 0 ? LCTX[ctx].most : LCTX[ctx].least}? Write the number of that ${LCTX[ctx].thing}.`,
    teach: {
      idea: "To compare lengths, start everything from the same line; then the one that reaches furthest is the longest.",
      method: "Check that all the ends start together. Look at the other ends: the one that goes furthest is longest, the one that stops first is shortest.",
      visual: ([k, q, , ctx]) => ({ type: "bars", title: plural(LCTX[ctx].thing), labels: [...Array(k)].map((_, i) => String(i + 1)), values: perm(k, q).map((r) => 3 + 2 * r) }),
      alternatives: [
        { id: "pairs", title: "Compare two at a time", kind: "procedural", text: ["Hold the first two side by side and keep the longer one.", "Compare it with the next, and keep the longer again. The one you keep at the end is the longest."], visual: ([k, q]) => ({ type: "bars", labels: ["1", "2"], values: perm(k, q).slice(0, 2).map((r) => 3 + 2 * r) }) },
      ],
    },
    limits: "Four or five things standing on one line, each a clearly different length; the numbers on the bars' scale are not needed.",
  },
  {
    id: "aaorder",
    arity: 4,
    title: "Ordering three or four things by length",
    competency: LEN,
    type: "tuple",
    mc: true,
    // [k, q, dir, ctx]: dir 0 shortest first, 1 longest first
    parse: none,
    reject: guard([[3, 4], [0, 23], [0, 1], [0, 2]], ([k, q]) => q < fact(k), "Three or four things of different lengths."),
    prompt: ([k, , dir, ctx]) => `Put the ${plural(LCTX[ctx].thing)} in the picture in order, from the ${dir === 0 ? LCTX[ctx].least : LCTX[ctx].most} to the ${dir === 0 ? LCTX[ctx].most : LCTX[ctx].least}. Write their numbers in that order, with commas between them.`,
    solve: ([k, q, dir]) => {
      const L = perm(k, q).map((r) => 3 + 2 * r);
      const order = [...Array(k)].map((_, i) => i + 1).sort((a, b) => (dir === 0 ? L[a - 1] - L[b - 1] : L[b - 1] - L[a - 1]));
      return { steps: [st("order", "order", LEN, L, list(order))], answer: list(order) };
    },
    // independent: every number appears once, and each one is longer (or shorter) than the one before it
    validate: ([k, q, dir], v) => {
      const xs = readList(v);
      if (!xs || !isPermOf(xs, k)) return false;
      const L = perm(k, q).map((r) => 3 + 2 * r);
      for (let i = 1; i < k; i++) if (dir === 0 ? L[xs[i] - 1] <= L[xs[i - 1] - 1] : L[xs[i] - 1] >= L[xs[i - 1] - 1]) return false;
      return true;
    },
    bugs: ([k, q, dir, ctx]) => {
      const L = perm(k, q).map((r) => 3 + 2 * r);
      const asc = [...Array(k)].map((_, i) => i + 1).sort((a, b) => L[a - 1] - L[b - 1]);
      return [
        bug("reversed", "procedural", LEN, `The order was turned round: it starts with the ${dir === 0 ? LCTX[ctx].most : LCTX[ctx].least}. Read again which one comes first.`, list(dir === 0 ? [...asc].reverse() : asc)),
        bug("label-order", "conceptual", LEN, "The numbers were written in counting order. The numbers only name them; the order comes from how long each one is.", list([...Array(k)].map((_, i) => i + 1))),
      ];
    },
    distractors: ([k, q, dir]) => {
      const L = perm(k, q).map((r) => 3 + 2 * r);
      return swaps([...Array(k)].map((_, i) => i + 1).sort((a, b) => (dir === 0 ? L[a - 1] - L[b - 1] : L[b - 1] - L[a - 1])));
    },
    variants: () => [],
    explain: (s) => `From the picture, in order: ${s.value}.`,
    domain: [[3, 4], [0, 23], [0, 1], [0, 2]],
    difficulty: ([k, , dir]) => (k === 3 && dir === 0 ? 1 : k === 3 ? 2 : 3),
    figure: ([k, q, , ctx]) => ({ type: "bars", title: plural(LCTX[ctx].thing), labels: [...Array(k)].map((_, i) => String(i + 1)), values: perm(k, q).map((r) => 3 + 2 * r) }),
    word: ([k, q, dir, ctx]) => `${nm(q + k)} wants to arrange the ${plural(LCTX[ctx].thing)} in the picture on a shelf, from the ${dir === 0 ? LCTX[ctx].least : LCTX[ctx].most} to the ${dir === 0 ? LCTX[ctx].most : LCTX[ctx].least}. In what order should they go? Write their numbers with commas.`,
    teach: {
      idea: "Putting things in order by length means each one is longer than the one before it (or shorter, if you start from the longest).",
      method: "Find the shortest and write its number. Then find the shortest of the ones left, and so on, until all are used.",
      visual: ([k, q, , ctx]) => ({ type: "bars", title: plural(LCTX[ctx].thing), labels: [...Array(k)].map((_, i) => String(i + 1)), values: perm(k, q).map((r) => 3 + 2 * r) }),
      alternatives: [
        { id: "staircase", title: "Make a staircase", kind: "conceptual", text: ["Stand them up next to each other from shortest to longest: the tops make a staircase going up.", "If a step goes down, two of them are in the wrong order: swap them."], visual: ([k]) => ({ type: "bars", labels: [...Array(k)].map((_, i) => String(i + 1)), values: [...Array(k)].map((_, i) => 3 + 2 * i) }) },
      ],
    },
    limits: "Three or four things of clearly different lengths, standing on one line.",
  },

  // ================================================================ MATH.measurement.mass-comparison
  {
    id: "aaheavy",
    arity: 4,
    title: "Which is the heaviest or the lightest (a balance with cubes)",
    competency: MASS,
    type: "integer",
    mc: true,
    // [q, b, kind, ctx]: four parcels balancing 2 + 3 × (order q) cubes; parcel b is the biggest (kind 0, heaviest asked) or smallest (kind 1, lightest asked)
    parse: none,
    reject: guard([[0, 23], [1, 4], [0, 1], [0, 1]], ([q, b, kind]) => extreme(perm(4, q), kind === 0) !== b, "Four parcels; the biggest is not the heaviest (or the smallest not the lightest)."),
    prompt: ([q, b, kind, ctx]) => `Each ${ctx ? "bag" : "parcel"} was put on a balance with cubes on the other side. The picture shows how many cubes balanced each one. ${cap(ctx ? "bag" : "parcel")} ${b} is the ${kind === 0 ? "biggest" : "smallest"}. Which ${ctx ? "bag" : "parcel"} is the ${kind === 0 ? "heaviest" : "lightest"}? Write its number.`,
    solve: ([q, , kind]) => {
      const W = perm(4, q).map((r) => 2 + 3 * r);
      const a = extreme(W, kind === 0);
      return { steps: [st("compare", "compare", MASS, W, a)], answer: a };
    },
    // independent: the one that is heavier (lighter) than each other one, compared two at a time
    validate: ([q, , kind], v) => v === pickBy(perm(4, q).map((r) => 2 + 3 * r), kind === 0),
    bugs: ([q, b, kind]) => [
      bug("bigger-heavier", "conceptual", MASS, `The ${kind === 0 ? "biggest" : "smallest"} one was chosen. Size does not tell weight: a big box of cotton can be lighter than a small stone. The balance tells.`, b),
      bug("opposite", "conceptual", MASS, `The ${kind === 0 ? "lightest" : "heaviest"} one was chosen. More cubes on the balance means heavier.`, extreme(perm(4, q), kind !== 0)),
    ],
    distractors: () => [1, 2, 3, 4],
    variants: () => [],
    explain: (s) => `Compare the cubes: number ${s.value} is the one asked for.`,
    domain: [[0, 23], [1, 4], [0, 1], [0, 1]],
    difficulty: ([, , kind]) => (kind === 0 ? 2 : 3),
    figure: ([q, , , ctx]) => ({ type: "bars", title: "cubes that balance it", labels: [1, 2, 3, 4].map((i) => `${cap(ctx ? "bag" : "parcel")} ${i}`), values: perm(4, q).map((r) => 2 + 3 * r) }),
    word: ([q, b, kind, ctx]) => `At the post office, ${nm(q + b)} weighs four ${ctx ? "bags" : "parcels"} against cubes, as in the picture. Number ${b} looks the ${kind === 0 ? "biggest" : "smallest"}. Which one is really the ${kind === 0 ? "heaviest" : "lightest"}? Write its number.`,
    teach: {
      idea: "A balance goes down on the heavier side. The more cubes it takes to balance a thing, the heavier the thing is.",
      method: "Look at how many cubes balanced each one. The most cubes means heaviest; the fewest means lightest. Do not go by size.",
      visual: ([q]) => ({ type: "balance", left: "Parcel 1", right: `${2 + 3 * perm(4, q)[0]} cubes` }),
      alternatives: [
        { id: "hands", title: "Hold one in each hand", kind: "conceptual", text: ["Hold two things, one in each hand: the hand that is pulled down more holds the heavier one.", "A balance does the same, but it is fair and exact."], visual: () => ({ type: "balance", left: "heavier (goes down)", right: "lighter (goes up)" }) },
      ],
    },
    limits: "Four things measured with a balance and cubes; real weighing in grams and kilograms comes later.",
  },
  {
    id: "aaheavyo",
    arity: 4,
    title: "Ordering three bags from lightest to heaviest using balance results",
    competency: MASS,
    type: "tuple",
    mc: true,
    // [q, f, o, ctx]: the true order (lightest → heaviest) is perm(3, q) + 1; f wording of the two results; o which result is told first
    parse: none,
    reject: guard([[0, 5], [0, 3], [0, 1], [0, 2]], () => true, "Three things and two balance results."),
    prompt: (p) => `Three ${heavyCtx(p[3])} are numbered 1, 2 and 3. The table shows what a balance showed. Put them in order from the lightest to the heaviest. Write their numbers with commas between them.`,
    solve: ([q]) => {
      const order = perm(3, q).map((x) => x + 1);
      return { steps: [st("order", "order", MASS, order, list(order))], answer: list(order) };
    },
    // independent: each balance result told in the table must hold for the order written
    validate: (p, v) => {
      const xs = readList(v);
      if (!xs || !isPermOf(xs, 3)) return false;
      return balanceResults(p).every(([heavy, light]) => xs.indexOf(heavy) > xs.indexOf(light));
    },
    bugs: (p) => {
      const order = perm(3, p[0]).map((x) => x + 1);
      const seen: number[] = [];
      for (const t of balanceTold(p)) for (const x of t.named) if (!seen.includes(x)) seen.push(x);
      return [
        bug("reversed", "procedural", MASS, "The order starts with the heaviest. The question asks for the lightest first.", list([...order].reverse())),
        bug("order-told", "conceptual", MASS, "The numbers were written in the order the table names them. Use what each sentence says: which one is heavier, which one is lighter.", list(seen)),
      ];
    },
    distractors: ([q]) => swaps(perm(3, q).map((x) => x + 1)),
    variants: () => [],
    explain: (s) => `Lightest to heaviest: ${s.value}.`,
    domain: [[0, 5], [0, 3], [0, 1], [0, 2]],
    difficulty: ([, f, o]) => (f === 0 && o === 0 ? 2 : 3),
    figure: (p) => table(["Balance", "What it showed"], balanceTold(p).map((t, i) => [i === 0 ? "First try" : "Second try", t.text])),
    word: (p) => `At the market, ${nm(p[0] + p[1])} weighs three ${heavyCtx(p[3])} on a balance, two at a time. The table shows what happened. Which order goes from the lightest to the heaviest? Write their numbers with commas.`,
    teach: {
      idea: "On a balance, the side that goes down is heavier. If A is heavier than B and B is heavier than C, then A is the heaviest and C the lightest.",
      method: "Find the one that never goes down: it is the lightest. Find the one that never goes up: it is the heaviest. The other one is in the middle.",
      visual: (p) => table(["Balance", "Goes down (heavier)", "Goes up (lighter)"], balanceResults(p).map(([h, l], i) => [i === 0 ? "First try" : "Second try", `${heavyOne(p[3])} ${h}`, `${heavyOne(p[3])} ${l}`])),
      alternatives: [
        { id: "line", title: "Put them on a line", kind: "conceptual", text: ["Draw a line from light to heavy. Put the first two on it as the balance says.", "Then fit the third one in, using the second result."], visual: () => ({ type: "balance", left: "heavier (down)", right: "lighter (up)" }) },
      ],
    },
    limits: "Three things and two balance results that link them in a chain.",
  },

  // ================================================================ MATH.measurement.money-coins
  {
    id: "aacoin",
    arity: 3,
    title: "Knowing the value of Indian coins and notes",
    competency: COIN,
    type: "integer",
    mc: true,
    // [kind, seed, big]: kind 0 the coin or note worth the most, 1 the least, 2 how many of one value; big 0 up to ₹20, 1 up to ₹100
    parse: none,
    reject: guard([[0, 2], [0, 59], [0, 1]], ([kind, seed, big]) => {
      const it = coinsOf(seed, big);
      return kind <= 1 ? new Set(it).size >= 2 : it.filter((x) => x === it[0]).length < it.length;
    }, "Three to five coins and notes, not all the same."),
    prompt: ([kind, seed, big]) => {
      const it = coinsOf(seed, big);
      return kind === 0
        ? "Look at the money in the picture. Which coin or note is worth the most? Write its value in rupees."
        : kind === 1
          ? "Look at the money in the picture. Which coin or note is worth the least? Write its value in rupees."
          : `How many ${rs(it[0])} ${kindOfMoney(it[0])}s are in the picture?`;
    },
    solve: ([kind, seed, big]) => {
      const it = coinsOf(seed, big);
      const a = kind === 0 ? Math.max(...it) : kind === 1 ? Math.min(...it) : it.filter((x) => x === it[0]).length;
      return { steps: [st("read", "read values", COIN, it, list(it.map(rs))), st("pick", kind === 2 ? "count" : "compare", COIN, [kind], a)], answer: a };
    },
    // independent: kind 0/1, an amount in the picture that no other one beats; kind 2, tick off each matching coin
    validate: ([kind, seed, big], v) => {
      const it = coinsOf(seed, big);
      if (kind === 2) {
        let c = 0;
        for (const x of it) if (x === it[0]) c++;
        return v === c;
      }
      return typeof v === "number" && it.includes(v) && it.every((x) => (kind === 0 ? x <= v : x >= v));
    },
    bugs: ([kind, seed, big]) => {
      const it = coinsOf(seed, big);
      const freq = new Map<number, number>();
      for (const x of it) freq.set(x, (freq.get(x) ?? 0) + 1);
      const top = Math.max(...freq.values());
      const modes = [...freq].filter(([, c]) => c === top).map(([x]) => x);
      return kind === 2
        ? [bug("count-all", "procedural", COUNT, `All the money was counted. Count only the ${rs(it[0])} ones: read the number on each.`, it.length)]
        : [
          bug("most-coins", "conceptual", COIN, "The kind there are most of was chosen. How much a coin or note is worth is the number printed on it, not how many there are.", top > 1 && modes.length === 1 ? modes[0] : null),
          bug("opposite", "conceptual", COIN, `The one worth the ${kind === 0 ? "least" : "most"} was chosen. Compare the numbers printed on them.`, kind === 0 ? Math.min(...it) : Math.max(...it)),
        ];
    },
    distractors: ([kind, seed, big]) => {
      const it = coinsOf(seed, big);
      const c = it.filter((x) => x === it[0]).length;
      return kind === 2 ? [c + 1, c + 2, c + 3] : [...new Set(it)];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `The money is ${s.value}.` : `So the answer is ${s.value}.`),
    domain: [[0, 2], [0, 59], [0, 1]],
    cap: 300,
    difficulty: ([kind, , big]) => (big === 0 && kind <= 1 ? 1 : big === 0 || kind === 2 ? 2 : 3),
    figure: ([, seed, big]) => ({ type: "coins", items: coinsOf(seed, big) }),
    word: ([kind, seed, big]) => {
      const it = coinsOf(seed, big);
      return kind <= 1
        ? `${nm(seed)} empties a purse and finds the money in the picture. ${nm(seed)} wants to give away the coin or note worth the ${kind === 0 ? "most" : "least"}. How many rupees is it worth?`
        : `${nm(seed)} empties a purse and finds the money in the picture. How many of them are ${rs(it[0])} ${kindOfMoney(it[0])}s?`;
    },
    teach: {
      idea: "Every Indian coin and note has its value printed on it in rupees (₹): ₹1, ₹2, ₹5, ₹10, ₹20, ₹50, ₹100.",
      method: "Read the number on each coin or note. To find the one worth the most, compare those numbers, not the sizes or how many there are.",
      visual: ([, seed, big]) => ({ type: "coins", items: [...coinsOf(seed, big)].sort((a, b) => a - b) }),
      alternatives: [
        { id: "ones", title: "How many ₹1 coins?", kind: "conceptual", text: ["Think of each coin or note as a pile of ₹1 coins: ₹5 is 5 one-rupee coins, ₹10 is 10.", "The one that stands for the biggest pile is worth the most."], visual: () => ({ type: "coins", items: [1, 2, 5, 10, 20] }) },
      ],
    },
    limits: "Coins and notes up to ₹20 (Grade 1) and ₹100 (Grade 2) as drawn pictures; ₹10 and ₹20 are drawn as coins.",
  },

  // ================================================================ MATH.measurement.money-totals
  {
    id: "aamoney",
    arity: 2,
    title: "Adding up coins and notes",
    competency: MON,
    type: "integer",
    mc: true,
    // [seed, big]: 2–4 coins up to ₹20 in all (big 0), or 3–5 coins and notes up to ₹100 (big 1)
    parse: none,
    reject: guard([[0, 299], [0, 1]], ([seed, big]) => {
      const it = moneyOf(seed, big);
      const t = it.reduce((a, b) => a + b, 0);
      return big ? t <= 100 && t > 20 : t <= 20 && t >= 3;
    }, "Coins and notes adding up to ₹20 (or to ₹100)."),
    prompt: () => "How much money is in the picture altogether, in rupees?",
    solve: ([seed, big]) => {
      const it = moneyOf(seed, big);
      const steps: Step[] = [];
      let s = 0;
      it.forEach((x, i) => {
        s += x;
        steps.push(st(`add${i}`, "add", ADD, [s - x, x], s));
      });
      return { steps, answer: s };
    },
    // independent: count the money rupee by rupee
    validate: ([seed, big], v) => {
      let c = 0;
      for (const x of moneyOf(seed, big)) for (let i = 0; i < x; i++) c++;
      return v === c;
    },
    bugs: ([seed, big]) => {
      const it = moneyOf(seed, big);
      const t = it.reduce((a, b) => a + b, 0);
      return [
        bug("count-coins", "conceptual", COIN, "The coins and notes were counted, one each. Each one is worth the number printed on it.", it.length),
        bug("missed-one", "procedural", ADD, "One coin was left out. Touch each coin as you add it.", t - it[it.length - 1]),
      ];
    },
    variants: () => [],
    explain: (s) => `₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}`,
    domain: [[0, 299], [0, 1]],
    cap: 300,
    difficulty: ([seed, big]) => (big === 0 && moneyOf(seed, big).length <= 3 ? 1 : big === 0 ? 2 : 3),
    figure: ([seed, big]) => ({ type: "coins", items: moneyOf(seed, big) }),
    word: ([seed, big]) => `${nm(seed + 5)} opens a piggy bank and finds the money in the picture. How many rupees has ${nm(seed + 5)} saved?`,
    teach: {
      idea: "The total is the sum of the values printed on the coins and notes, not the number of coins.",
      method: "Start with the coin or note worth the most and count on: for ₹10, ₹5, ₹2 say 10 … 15 … 17.",
      visual: ([seed, big]) => ({ type: "coins", items: moneyOf(seed, big) }),
      alternatives: [
        { id: "line", title: "Jumps on a number line", kind: "procedural", text: ["Start at 0 and jump the value of each coin.", "Where you land is the total."], visual: ([seed, big]) => {
          const it = moneyOf(seed, big);
          const ends = it.map((_, i) => it.slice(0, i + 1).reduce((a, b) => a + b, 0));
          return { type: "numberline", from: 0, to: ends[ends.length - 1], step: ends[ends.length - 1] > 20 ? 10 : 1, jumps: ends.map((e, i) => [i ? ends[i - 1] : 0, e]) };
        } },
      ],
    },
    limits: "Up to ₹20 with coins (Grade 1) and up to ₹100 with coins and notes (Grade 2–3); change is another competency.",
  },
  {
    id: "aamake",
    arity: 3,
    title: "Making an amount with a note and coins",
    competency: MON,
    type: "integer",
    mc: true,
    // [N, bi, ci]: pay ₹N with ₹NOTE_B[bi] (0: none) and some ₹COIN_C[ci] coins
    parse: none,
    reject: guard([[2, 100], [0, 3], [0, 3]], ([N, bi, ci]) => {
      const B = NOTE_B[bi];
      const c = COIN_C[ci];
      return N > B && (N - B) % c === 0 && (N - B) / c >= 2 && (N - B) / c <= 10 && (B === 0 ? c >= 2 : c < B);
    }, "An amount up to ₹100 made from one note or coin and 2 to 10 smaller coins of one kind."),
    prompt: ([N, bi, ci]) => {
      const B = NOTE_B[bi];
      const c = COIN_C[ci];
      return B ? `${nm(N)} has to pay ₹${N}. ${nm(N)} gives ₹${B} and some ₹${c} coins, as in the picture. How many ₹${c} coins does ${nm(N)} give?` : `How many ₹${c} coins (as in the picture) make ₹${N}?`;
    },
    solve: ([N, bi, ci]) => {
      const B = NOTE_B[bi];
      const c = COIN_C[ci];
      return { steps: [st("rest", "subtract", SUB, [N, B], N - B), st("coins", "share into coins", MON, [N - B, c], (N - B) / c)], answer: (N - B) / c };
    },
    // independent: start with the first ₹B and add one ₹c coin at a time until the amount is reached
    validate: ([N, bi, ci], v) => {
      let s = NOTE_B[bi];
      let k = 0;
      while (s < N) {
        s += COIN_C[ci];
        k++;
      }
      return s === N && v === k;
    },
    bugs: ([N, bi, ci]) => {
      const B = NOTE_B[bi];
      const c = COIN_C[ci];
      return [
        bug("forgot-note", "procedural", MON, `The ₹${B} already given was forgotten. Only ₹${N - B} more is needed after it.`, B && N % c === 0 ? N / c : null),
        bug("rupees-not-coins", "conceptual", MON, `The rupees still needed were given instead of the number of coins. Each coin is worth ₹${c}, so count in ${c}s.`, c > 1 ? N - B : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "rest" ? `₹${s.inputs[0]} − ₹${s.inputs[1]} = ₹${s.value} still to pay.` : `₹${s.inputs[0]} in ₹${s.inputs[1]} coins is ${s.value} coins.`),
    domain: [[2, 100], [0, 3], [0, 3]],
    difficulty: ([N, bi, ci]) => (N <= 20 && COIN_C[ci] <= 2 ? 1 : N <= 50 || NOTE_B[bi] === 0 ? 2 : 3),
    figure: ([, bi, ci]) => ({ type: "coins", items: NOTE_B[bi] ? [NOTE_B[bi], COIN_C[ci]] : [COIN_C[ci]] }),
    word: ([N, bi, ci]) => {
      const B = NOTE_B[bi];
      const c = COIN_C[ci];
      return B ? `A bus ticket costs ₹${N}. ${nm(N + 3)} puts ₹${B} on the counter and then adds ₹${c} coins until it is enough. How many ₹${c} coins are added?` : `A bunch of bananas costs ₹${N}. ${nm(N + 3)} pays with only ₹${c} coins. How many coins are needed?`;
    },
    teach: {
      idea: "To make an amount, the coins together must add up to exactly that many rupees.",
      method: "Start from what is already given and count on in steps of the coin: for ₹20 and ₹5 coins up to ₹35, say 20 … 25, 30, 35: that is 3 coins.",
      visual: ([N, bi, ci]) => ({ type: "coins", items: [...(NOTE_B[bi] ? [NOTE_B[bi]] : []), ...Array((N - NOTE_B[bi]) / COIN_C[ci]).fill(COIN_C[ci])] }),
      alternatives: [
        { id: "skip", title: "Skip-count on a number line", kind: "procedural", text: ["Start at the amount given and jump by the coin's value.", "Count the jumps until you land on the price."], visual: ([N, bi, ci]) => ({ type: "numberline", from: NOTE_B[bi], to: N, step: COIN_C[ci], jumps: [...Array((N - NOTE_B[bi]) / COIN_C[ci])].map((_, i) => [NOTE_B[bi] + i * COIN_C[ci], NOTE_B[bi] + (i + 1) * COIN_C[ci]]) }) },
      ],
    },
    limits: "One note or coin plus 2 to 10 coins of one kind, up to ₹100; mixed combinations are not asked as a count.",
  },

  // ================================================================ MATH.measurement.non-standard-units
  {
    id: "aaclip",
    arity: 3,
    title: "Measuring a length with paper clips or matchsticks",
    competency: NSU,
    type: "integer",
    mc: true,
    // [a, L, u]: the thing starts at a and is L units long; unit NSU_UNITS[u]
    parse: none,
    reject: guard([[0, 6], [2, 12], [0, 2]], ([a, L]) => a + L <= 16, "A length of 2 to 12 units on a line of up to 18."),
    prompt: ([a, L, u]) => `A ${NSU_UNITS[u][2]} is laid along a line of ${NSU_UNITS[u][1]}. It starts at the dot at ${a} and ends at the dot at ${a + L}. Each jump in the picture is one ${NSU_UNITS[u][0]}. How long is the ${NSU_UNITS[u][2]}, in ${NSU_UNITS[u][1]}?`,
    solve: ([a, L]) => ({ steps: [st("count", "count units", NSU, [a, a + L], L)], answer: L }),
    // independent: count the jumps one by one from start to end
    validate: ([a, L], v) => {
      let c = 0;
      for (let x = a; x < a + L; x++) c++;
      return v === c;
    },
    bugs: ([a, L, u]) => [
      bug("read-end", "conceptual", NSU, `The number at the end was read, but the ${NSU_UNITS[u][2]} does not start at 0. Count the ${NSU_UNITS[u][1]} it covers.`, a > 0 ? a + L : null),
      bug("count-marks", "procedural", NSU, `The dots or marks were counted instead of the ${NSU_UNITS[u][1]} between them. There is one more mark than ${NSU_UNITS[u][1]}.`, L + 1),
    ],
    variants: () => [],
    explain: (s) => `From ${s.inputs[0]} to ${s.inputs[1]} there are ${s.value} jumps, so ${s.value} units.`,
    domain: [[0, 6], [2, 12], [0, 2]],
    difficulty: ([a, L]) => (a === 0 && L <= 6 ? 1 : a === 0 || L <= 6 ? 2 : 3),
    figure: ([a, L]) => ({ type: "numberline", from: 0, to: a + L + 2, marks: [a, a + L], jumps: [...Array(L)].map((_, i) => [a + i, a + i + 1]) }),
    word: ([a, L, u]) => `${nm(a + L)} lays ${NSU_UNITS[u][1]} end to end along a ${NSU_UNITS[u][2]}, as in the picture. The ${NSU_UNITS[u][2]} begins at the mark ${a} and finishes at the mark ${a + L}. How many ${NSU_UNITS[u][1]} long is it?`,
    teach: {
      idea: "A length is how many equal units fit along it, end to end, with no gaps and no overlaps.",
      method: "Count the units (the jumps) from one end to the other. If it does not start at 0, count jumps, or take the start number from the end number.",
      visual: ([a, L]) => ({ type: "numberline", from: 0, to: a + L + 2, marks: [a, a + L], jumps: [...Array(L)].map((_, i) => [a + i, a + i + 1]) }),
      alternatives: [
        { id: "spans", title: "Hand spans", kind: "conceptual", text: ["Put your hand flat at one end, then move it so your thumb starts where your little finger ended.", "Count each hand you put down: that is the length in spans."], visual: ([, L]) => ({ type: "numberline", from: 0, to: L, jumps: [...Array(L)].map((_, i) => [i, i + 1]) }) },
      ],
    },
    limits: "Whole numbers of one kind of unit laid in a line; estimating and explaining why a standard unit is needed are left to the teacher.",
  },
  {
    id: "aacups",
    arity: 4,
    title: "Which container holds the most cups",
    competency: NSU,
    type: "integer",
    mc: true,
    // [q, t, kind, ctx]: four containers holding 3 + 2 × (order q) cups; container t is the tallest (kind 0) or shortest (kind 1)
    parse: none,
    reject: guard([[0, 23], [1, 4], [0, 1], [0, 1]], ([q, t, kind]) => extreme(perm(4, q), kind === 0) !== t, "Four containers; the tallest does not hold the most (or the shortest the least)."),
    prompt: ([q, t, kind, ctx]) => `Each ${CUPCTX[ctx][0]} was filled using a small ${CUPCTX[ctx][1]}. The picture shows how many ${CUPCTX[ctx][2]} each one holds. ${cap(CUPCTX[ctx][0])} ${t} is the ${kind === 0 ? "tallest" : "shortest"}. Which ${CUPCTX[ctx][0]} holds the ${kind === 0 ? "most" : "least"}? Write its number.`,
    solve: ([q, , kind]) => {
      const C = perm(4, q).map((r) => 3 + 2 * r);
      const a = extreme(C, kind === 0);
      return { steps: [st("compare", "compare", NSU, C, a)], answer: a };
    },
    validate: ([q, , kind], v) => v === pickBy(perm(4, q).map((r) => 3 + 2 * r), kind === 0),
    bugs: ([q, t, kind]) => [
      bug("tallest-most", "conceptual", NSU, `The ${kind === 0 ? "tallest" : "shortest"} one was chosen. A short, wide pot can hold more than a tall, thin bottle: count the cups.`, t),
      bug("opposite", "conceptual", NSU, `The one that holds the ${kind === 0 ? "least" : "most"} was chosen. More cups means it holds more.`, extreme(perm(4, q), kind !== 0)),
    ],
    distractors: () => [1, 2, 3, 4],
    variants: () => [],
    explain: (s) => `Number ${s.value} took the number of cups asked for.`,
    domain: [[0, 23], [1, 4], [0, 1], [0, 1]],
    difficulty: ([, , kind]) => (kind === 0 ? 2 : 3),
    figure: ([q, , , ctx]) => ({ type: "bars", title: `${CUPCTX[ctx][2]} each holds`, labels: [1, 2, 3, 4].map((i) => `${cap(CUPCTX[ctx][0])} ${i}`), values: perm(4, q).map((r) => 3 + 2 * r) }),
    word: ([q, t, kind, ctx]) => `${nm(q + t)} helps fill four ${CUPCTX[ctx][0]}s for a wedding feast, as in the picture. Number ${t} looks the ${kind === 0 ? "tallest" : "shortest"}. Which one really holds the ${kind === 0 ? "most" : "least"}? Write its number.`,
    teach: {
      idea: "How much a container holds is how many cups of water fill it. Height alone does not tell: width matters too.",
      method: "Look at how many cups each one took. The most cups means it holds the most.",
      visual: ([q, , , ctx]) => ({ type: "bars", labels: [1, 2, 3, 4].map(String), values: perm(4, q).map((r) => 3 + 2 * r), title: CUPCTX[ctx][2] }),
      alternatives: [
        { id: "pour", title: "Pour from one into another", kind: "conceptual", text: ["Fill one container and pour it into another.", "If it overflows, the first holds more; if it does not fill up, the second holds more."], visual: () => ({ type: "bars", labels: ["tall, thin", "short, wide"], values: [5, 8] }) },
      ],
    },
    limits: "Four containers measured with one cup; litres come later.",
  },

  // ================================================================ MATH.measurement.time-order
  {
    id: "aaseq",
    arity: 3,
    title: "Putting the day's events in order",
    competency: TORD,
    type: "tuple",
    mc: true,
    // [k, c, sh]: k events (the c-th set of DAYLIFE), listed in the order perm(k, sh)
    parse: none,
    reject: guard([[3, 4], [0, 69], [0, 23]], ([k, c, sh]) => c < choose(DAYLIFE.length, k) && sh < fact(k) && sh > 0, "Three or four events of a school day, listed out of order."),
    prompt: ([k, c, sh]) => `Here are some things ${nm(c)} does in a day. Put them in order, from first in the day to last. Write their numbers with commas between them.`,
    solve: ([k, c, sh]) => {
      const pi = perm(k, sh);
      const order = [...Array(k)].map((_, t) => pi.indexOf(t) + 1);
      return { steps: [st("order", "order", TORD, seqEvents(k, c, sh), list(order))], answer: list(order) };
    },
    // independent: every number once, and each event happens later in the day than the one before
    validate: ([k, c, sh], v) => {
      const xs = readList(v);
      if (!xs || !isPermOf(xs, k)) return false;
      const ev = seqEvents(k, c, sh);
      for (let i = 1; i < k; i++) if (DAYLIFE.indexOf(ev[xs[i] - 1]) <= DAYLIFE.indexOf(ev[xs[i - 1] - 1])) return false;
      return true;
    },
    bugs: ([k, c, sh]) => {
      const pi = perm(k, sh);
      const order = [...Array(k)].map((_, t) => pi.indexOf(t) + 1);
      return [
        bug("reversed", "procedural", TORD, "The order starts with the last thing in the day. Start with what happens first, in the morning.", list([...order].reverse())),
        bug("as-listed", "conceptual", TORD, "The numbers were kept in the order they are listed. Think about when each one happens in the day.", list([...Array(k)].map((_, i) => i + 1))),
      ];
    },
    distractors: ([k, , sh]) => {
      const pi = perm(k, sh);
      return swaps([...Array(k)].map((_, t) => pi.indexOf(t) + 1));
    },
    variants: () => [],
    explain: (s) => `First to last: ${s.value}.`,
    domain: [[3, 4], [0, 69], [0, 23]],
    cap: 300,
    difficulty: ([k]) => (k === 3 ? 1 : 2),
    figure: ([k, c, sh]) => table(["Number", `What ${nm(c)} does`], seqEvents(k, c, sh).map((e, i) => [i + 1, e])),
    word: ([k, c, sh]) => `${nm(c)} tells a friend about a school day, but tells it all mixed up (see the picture). In what order did the things really happen? Write their numbers with commas.`,
    teach: {
      idea: "A day goes in order: morning (waking up, breakfast), then school, then afternoon, evening and night.",
      method: "Find what happens first in the morning and write its number. Then ask 'what comes next?' until every number is used.",
      visual: ([k, c, sh]) => table(["Number", `What ${nm(c)} does`], seqEvents(k, c, sh).map((e, i) => [i + 1, e])),
      alternatives: [
        { id: "clock", title: "Match each to a time", kind: "conceptual", text: ["Think of when each thing happens: waking up near 6 in the morning, school near 8, dinner near 8 at night.", "Earlier times come first."], visual: () => ({ type: "clock", h: 7, m: 0 }) },
      ],
    },
    limits: "Three or four everyday events with a clear order in a school day.",
  },
  {
    id: "aadur",
    arity: 3,
    title: "Which takes the longest or the shortest time",
    competency: TORD,
    type: "integer",
    mc: true,
    // [c, sh, kind]: four activities (the c-th set of ACTS), listed in the order perm(4, sh); kind 0 longest, 1 shortest
    parse: none,
    reject: guard([[0, 34], [0, 23], [0, 1]], () => true, "Four everyday activities of clearly different lengths of time."),
    prompt: ([, , kind]) => `Look at the list in the picture. Which of these takes the ${kind === 0 ? "longest" : "shortest"} time? Write its number.`,
    solve: ([c, sh, kind]) => {
      const T = durActs(c, sh).map((a) => a[1]);
      const a = extreme(T, kind === 0);
      return { steps: [st("compare", "compare durations", TORD, T, a)], answer: a };
    },
    validate: ([c, sh, kind], v) => v === pickBy(durActs(c, sh).map((a) => a[1]), kind === 0),
    bugs: ([c, sh, kind]) => [
      bug("opposite", "conceptual", TORD, `The one that takes the ${kind === 0 ? "shortest" : "longest"} time was chosen. Think: which one could you finish ${kind === 0 ? "last" : "first"}?`, extreme(durActs(c, sh).map((a) => a[1]), kind !== 0)),
    ],
    distractors: () => [1, 2, 3, 4],
    variants: () => [],
    explain: (s) => `Number ${s.value} is the one asked for.`,
    domain: [[0, 34], [0, 23], [0, 1]],
    cap: 300,
    difficulty: ([c]) => (combo(ACTS.length, 4, c).includes(6) ? 1 : 2),
    figure: ([c, sh]) => table(["Number", "Activity"], durActs(c, sh).map((a, i) => [i + 1, a[0]])),
    word: ([c, sh, kind]) => `${nm(c + sh)}'s teacher asks the class: of the things in the picture, which one lasts the ${kind === 0 ? "longest" : "shortest"} time? Write its number.`,
    teach: {
      idea: "Some things take minutes, some hours, some days or weeks. Minutes are short, hours longer, days and weeks longer still.",
      method: "For each one, think: does it take a few minutes, a few hours, or days? Then compare.",
      visual: ([c, sh]) => table(["Number", "Activity"], durActs(c, sh).map((a, i) => [i + 1, a[0]])),
      alternatives: [
        { id: "ladder", title: "A time ladder", kind: "conceptual", text: ["Make a ladder: minutes at the bottom, then hours, then days, then weeks.", "Put each activity on the ladder; the higher one takes longer."], visual: () => ({ type: "bars", labels: ["minutes", "hours", "days", "weeks"], values: [1, 2, 3, 4] }) },
      ],
    },
    limits: "Everyday activities whose lengths differ clearly (minutes, hours, days, weeks).",
  },

  // ================================================================ MATH.number.addition
  {
    id: "aaadd",
    arity: 2,
    title: "Adding two numbers with a total up to 20",
    competency: ADD,
    type: "integer",
    mc: true,
    // [a, b]: a + b ≤ 20
    parse: none,
    reject: guard([[1, 19], [1, 19]], ([a, b]) => a + b <= 20, "Adding two numbers with a total up to 20."),
    prompt: ([a, b]) => `${a} + ${b} = ? (You can count on from ${a} on the number line.)`,
    solve: ([a, b]) => ({ steps: [st("start", "start at", ADD, [a], a), st("count-on", "count on", ADD, [a, b], a + b)], answer: a + b }),
    // independent: count on from a, one at a time
    validate: ([a, b], v) => {
      let s = a;
      for (let i = 0; i < b; i++) s++;
      return v === s;
    },
    bugs: ([a, b]) => [
      bug("count-start", "procedural", ADD, `${a} was counted again as the first step. Start at ${a} and say the NEXT number as 1.`, a + b - 1),
      bug("take-away", "conceptual", SUB, "The smaller number was taken away. The + sign means put the two groups together.", Math.abs(a - b) || null),
      bug("one-extra", "procedural", ADD, "One number too many was counted. Count exactly as many steps as the number you add.", a + b + 1),
    ],
    variants: () => [],
    explain: (s) => (s.id === "start" ? `Start at ${s.value}.` : `Count on ${s.inputs[1]}: you land on ${s.value}.`),
    domain: [[1, 19], [1, 19]],
    difficulty: ([a, b]) => (a + b <= 9 ? 1 : a + b <= 10 || (a % 10) + (b % 10) < 10 ? 2 : 3),
    figure: ([a]) => ({ type: "numberline", from: 0, to: 20, marks: [a] }),
    word: ([a, b]) => `${nm(a)} picks ${a} ${FRUIT[(a + b) % FRUIT.length]} from the tree. ${nm(a + 4)} picks ${b} more. How many ${FRUIT[(a + b) % FRUIT.length]} do they have altogether?`,
    teach: {
      idea: "Adding puts two groups together; the total is how many there are in all.",
      method: "Start at the bigger number and count on the other number, one step at a time. Where you stop is the total.",
      visual: ([a, b]) => ({ type: "numberline", from: 0, to: 20, marks: [a], jumps: [[a, a + b]] }),
      alternatives: [
        { id: "ten_frame", title: "Fill ten frames", kind: "conceptual", text: ["Put the first number of counters in a ten frame, then the second number.", "A full frame is 10; count the rest after 10."], visual: ([a, b]) => ({ type: "tenframe", filled: a + b, frames: a + b > 10 ? 2 : 1 }) },
        { id: "make_ten", title: "Make a ten first", kind: "procedural", text: ["Break the second number to fill up to 10: 8 + 5 = 8 + 2 + 3 = 10 + 3.", "10 and some more is a teen number: 13."] },
      ],
    },
    limits: "Two whole numbers from 1 to 19 with a total up to 20; adding 0 is the zero family, two-digit sums are other families.",
  },
  {
    id: "aabond",
    arity: 2,
    title: "How many more to make 10 (or another number up to 20)",
    competency: ADD,
    type: "integer",
    mc: true,
    // [a, t]: a + ? = t
    parse: none,
    reject: guard([[1, 19], [5, 20]], ([a, t]) => a < t && t - a >= 1, "A missing part, with a total from 5 to 20."),
    prompt: ([a, t]) => `The ten frame${t > 10 ? "s show" : " shows"} ${a}. How many more counters are needed to make ${t}? (${a} + ? = ${t})`,
    solve: ([a, t]) => ({ steps: [st("count-up", "count up", ADD, [a, t], t - a)], answer: t - a }),
    // independent: add one counter at a time until there are t
    validate: ([a, t], v) => {
      let s = a;
      let k = 0;
      while (s < t) {
        s++;
        k++;
      }
      return v === k;
    },
    bugs: ([a, t]) => [
      bug("gave-total", "conceptual", ADD, `The total ${t} was given. The question asks how many MORE are needed after the ${a} already there.`, t),
      bug("gave-filled", "procedural", COUNT, "The counters already there were counted. Count the empty boxes you still need to fill.", a),
      bug("count-start", "procedural", ADD, `${a} was counted as one of the steps. Start counting at the next number after ${a}.`, t - a + 1),
    ],
    variants: () => [],
    explain: (s) => `From ${s.inputs[0]}, count up to ${s.inputs[1]}: ${s.value} more.`,
    domain: [[1, 19], [5, 20]],
    difficulty: ([, t]) => (t === 10 ? 1 : t < 10 ? 2 : 3),
    figure: ([a, t]) => ({ type: "tenframe", filled: a, frames: t > 10 ? 2 : 1 }),
    word: ([a, t]) => `${nm(a + t)} wants to put ${t} diyas on the steps for Deepavali and has already put ${a}. How many more diyas are needed?`,
    teach: {
      idea: "A number can be split into two parts: 10 is 7 and 3, 6 and 4, and so on. If you know one part, the other part is what is missing.",
      method: "Count the empty boxes, or count up from the number you have to the number you want.",
      visual: ([a, t]) => ({ type: "tenframe", filled: a, frames: t > 10 ? 2 : 1 }),
      alternatives: [
        { id: "line", title: "Count up on a number line", kind: "procedural", text: ["Put your finger on the number you have.", "Jump one at a time to the number you want; count the jumps."], visual: ([a, t]) => ({ type: "numberline", from: 0, to: 20, marks: [a, t], jumps: [[a, t]] }) },
      ],
    },
    limits: "A missing part with a total from 5 to 20.",
  },

  // ================================================================ MATH.number.compare-numbers
  {
    id: "aacmp",
    arity: 3,
    title: "Which number is more (or less)",
    competency: CMP,
    type: "integer",
    // [a, b, kind]: kind 0 more, 1 less
    parse: none,
    reject: guard([[1, 99], [1, 99], [0, 1]], ([a, b]) => a !== b && ((a <= 20 && b <= 20) || (a >= 10 && b >= 10 && (Math.floor(a / 10) - Math.floor(b / 10)) * ((a % 10) - (b % 10)) < 0)), "Two different numbers up to 20, or two two-digit numbers whose ones digits point the other way."),
    prompt: ([a, b, kind]) => `Which number is ${kind === 0 ? "more" : "less"}: ${a} or ${b}?`,
    solve: ([a, b, kind]) => {
      const ans = kind === 0 ? Math.max(a, b) : Math.min(a, b);
      return { steps: a >= 10 && b >= 10 ? [st("tens", "compare tens", PV, [Math.floor(a / 10), Math.floor(b / 10)], ans)] : [st("compare", "compare", CMP, [a, b], ans)], answer: ans };
    },
    // independent: match the two numbers one to one (take one from each until one runs out)
    validate: ([a, b, kind], v) => {
      let x = a;
      let y = b;
      while (x > 0 && y > 0) {
        x--;
        y--;
      }
      const more = x > 0 ? a : b;
      return v === (kind === 0 ? more : more === a ? b : a);
    },
    bugs: ([a, b, kind]) => {
      const other = kind === 0 ? Math.min(a, b) : Math.max(a, b);
      return a >= 10 && b >= 10 && Math.floor(a / 10) !== Math.floor(b / 10) && (Math.floor(a / 10) - Math.floor(b / 10)) * ((a % 10) - (b % 10)) < 0
        ? [bug("ones-first", "conceptual", PV, "The ones digits were compared first. Compare the tens first: the number with more tens is more.", other)]
        : [bug("other-way", "conceptual", CMP, `The ${kind === 0 ? "smaller" : "bigger"} number was chosen. On the number line, the number further right is more.`, other)];
    },
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `Compare the tens: ${s.inputs[0]} tens and ${s.inputs[1]} tens. So the answer is ${s.value}.` : `On the number line, ${s.value} is the one asked for.`),
    domain: [[1, 99], [1, 99], [0, 1]],
    cap: 300,
    difficulty: ([a, b]) => (a <= 9 && b <= 9 ? 1 : a <= 20 && b <= 20 ? 2 : 3),
    figure: ([a, b]) => (a <= 20 && b <= 20 ? { type: "numberline", from: 0, to: 20, marks: [a, b] } : { type: "numberline", from: 0, to: 100, step: 10, marks: [a, b] }),
    word: ([a, b, kind]) => `${nm(a)} has ${a} marbles and ${nm(b + 1)} has ${b} marbles. How many marbles does the child with ${kind === 0 ? "more" : "fewer"} marbles have?`,
    teach: {
      idea: "A number is more when it comes later when we count; on a number line it is further to the right.",
      method: "For two-digit numbers, compare the tens first. Only if the tens are the same, compare the ones.",
      visual: ([a, b]) => (a <= 20 && b <= 20 ? { type: "numberline", from: 0, to: 20, marks: [a, b] } : { type: "numberline", from: 0, to: 100, step: 10, marks: [a, b] }),
      alternatives: [
        { id: "blocks", title: "Build both with blocks", kind: "conceptual", text: ["Build each number with tens and ones.", "The one with more tens is more, whatever the ones."], visual: ([a]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10), ones: a % 10 }) },
      ],
    },
    limits: "Two different numbers up to 20, or two-digit numbers where looking at the ones first would mislead; the answer is typed (no choice form, since the two numbers are the only choices).",
  },
  {
    id: "aanext",
    arity: 2,
    title: "The number just before, just after or between",
    competency: CMP,
    type: "integer",
    mc: true,
    // [n, kind]: kind 0 just before n, 1 just after n, 2 between n − 1 and n + 1
    parse: none,
    reject: guard([[1, 99], [0, 2]], ([n, kind]) => (kind === 0 ? n >= 2 : kind === 1 ? n <= 99 : n >= 2 && n <= 98), "Numbers up to 100."),
    prompt: ([n, kind]) => (kind === 0 ? `Which number comes just before ${n}?` : kind === 1 ? `Which number comes just after ${n}?` : `Which number comes between ${n - 1} and ${n + 1}?`),
    solve: ([n, kind]) => {
      const a = kind === 0 ? n - 1 : kind === 1 ? n + 1 : n;
      return { steps: [st("step", kind === 0 ? "count back" : "count on", CMP, [n, kind], a)], answer: a };
    },
    // independent: count from 0 and remember the neighbours of n
    validate: ([n, kind], v) => {
      let prev = -1;
      for (let x = 0; x <= 101; x++) {
        if (kind === 0 && x === n) return v === prev;
        if (kind === 1 && prev === n) return v === x;
        if (kind === 2 && prev === n - 1 && x + 1 === n + 1) return v === x;
        prev = x;
      }
      return false;
    },
    bugs: ([n, kind]) =>
      kind === 0
        ? [bug("before-after", "conceptual", CMP, "The number after was given. 'Before' is the number we say just before it when counting.", n + 1)]
        : kind === 1
          ? [
            bug("before-after", "conceptual", CMP, "The number before was given. 'After' is the number we say next when counting.", n - 1),
            bug("decade", "conceptual", PV, `After ${n} comes a new ten: ${n} + 1 = ${n + 1}, not ${Math.floor(n / 10)}10.`, n % 10 === 9 && n > 9 ? Number(`${Math.floor(n / 10)}10`) : null),
          ]
          : [bug("next-of-last", "procedural", CMP, `The number after ${n + 1} was given. The number between ${n - 1} and ${n + 1} is the one we say in the middle.`, n + 2)],
    variants: () => [],
    explain: (s) => `Count: the answer is ${s.value}.`,
    domain: [[1, 99], [0, 2]],
    difficulty: ([n, kind]) => (n <= 20 ? 1 : n % 10 === 9 || n % 10 === 0 || kind === 0 ? 3 : 2),
    figure: ([n, kind]) => (n <= 20 ? { type: "numberline", from: 0, to: 20, marks: kind === 2 ? [n - 1, n + 1] : [n] } : null),
    word: ([n, kind]) => (kind === 0 ? `${nm(n)} is waiting in a queue for token number ${n}. Which token number is called just before it?` : kind === 1 ? `${nm(n)} reads page ${n} of a storybook. Which page comes next?` : `The houses on a street are numbered in order. ${nm(n)} lives between house ${n - 1} and house ${n + 1}. What is ${nm(n)}'s house number?`),
    teach: {
      idea: "Counting goes up by 1 each time: the number after is 1 more, the number before is 1 less.",
      method: "Say the numbers in order up to the number. The one you said just before it comes before; the next one you say comes after. After 9 ones comes the next ten (39, 40).",
      visual: ([n]) => ({ type: "numberline", from: Math.max(0, n - 5), to: Math.max(0, n - 5) + 10, marks: [n] }),
      alternatives: [
        { id: "blocks", title: "Add or take one cube", kind: "conceptual", text: ["Build the number with tens and ones.", "Add one cube for 'after', take one away for 'before'. Ten cubes make a new ten."], visual: ([n]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }) },
      ],
    },
    limits: "Neighbours of whole numbers up to 100.",
  },
  {
    id: "aaordn",
    arity: 3,
    title: "Putting numbers up to 99 in order",
    competency: CMP,
    type: "tuple",
    mc: true,
    // [seed, k, dir]: k two-digit numbers; dir 0 smallest first, 1 biggest first
    parse: none,
    reject: guard([[0, 199], [3, 4], [0, 1]], ([seed, k]) => {
      const xs = ordNums(seed, k);
      return new Set(xs).size === k && new Set(xs.map((x) => x % 10)).size === k && list([...xs].sort((a, b) => a - b)) !== list([...xs].sort((a, b) => (a % 10) - (b % 10)));
    }, "Three or four different two-digit numbers."),
    prompt: ([seed, k, dir]) => `Put these numbers in order from the ${dir === 0 ? "smallest to the biggest" : "biggest to the smallest"}: ${list(ordNums(seed, k))}. Write them with commas.`,
    solve: ([seed, k, dir]) => {
      const xs = [...ordNums(seed, k)].sort((a, b) => (dir === 0 ? a - b : b - a));
      return { steps: [st("order", "order", CMP, ordNums(seed, k), list(xs))], answer: list(xs) };
    },
    // independent: the same numbers, each one bigger (smaller) than the one before
    validate: ([seed, k, dir], v) => {
      const xs = readList(v);
      const given = ordNums(seed, k);
      if (!xs || xs.length !== k || !given.every((g) => xs.includes(g))) return false;
      for (let i = 1; i < k; i++) if (dir === 0 ? xs[i] <= xs[i - 1] : xs[i] >= xs[i - 1]) return false;
      return true;
    },
    bugs: ([seed, k, dir]) => {
      const xs = ordNums(seed, k);
      const asc = [...xs].sort((a, b) => a - b);
      const byOnes = [...xs].sort((a, b) => (a % 10) - (b % 10));
      return [
        bug("reversed", "procedural", CMP, `The order was turned round. Start with the ${dir === 0 ? "smallest" : "biggest"} number.`, list(dir === 0 ? [...asc].reverse() : asc)),
        bug("ones-first", "conceptual", PV, "The numbers were ordered by their ones digits. Look at the tens first: more tens means a bigger number.", list(dir === 0 ? byOnes : [...byOnes].reverse())),
      ];
    },
    distractors: ([seed, k, dir]) => swaps([...ordNums(seed, k)].sort((a, b) => (dir === 0 ? a - b : b - a))),
    variants: () => [],
    explain: (s) => `In order: ${s.value}.`,
    domain: [[0, 199], [3, 4], [0, 1]],
    cap: 300,
    difficulty: ([, k, dir]) => (k === 3 && dir === 0 ? 1 : k === 3 ? 2 : 3),
    figure: ([seed, k]) => ({ type: "numberline", from: 0, to: 100, step: 10, marks: ordNums(seed, k) }),
    word: ([seed, k, dir]) => `The children in ${nm(seed)}'s class have roll numbers ${list(ordNums(seed, k))}. The teacher calls them from the ${dir === 0 ? "smallest number to the biggest" : "biggest number to the smallest"}. In what order are they called? Write the numbers with commas.`,
    teach: {
      idea: "Numbers further along the number line are bigger. For two-digit numbers, the tens tell you most.",
      method: "Look at the tens digits first and order by them. If two numbers have the same tens, order those two by their ones.",
      visual: ([seed, k]) => ({ type: "numberline", from: 0, to: 100, step: 10, marks: ordNums(seed, k) }),
      alternatives: [
        { id: "smallest", title: "Pick the smallest each time", kind: "procedural", text: ["Find the smallest number, write it and cross it out.", "Do it again with the numbers left, until none are left."], visual: ([seed, k]) => table(["Numbers"], ordNums(seed, k).map((x) => [x])) },
      ],
    },
    limits: "Three or four different two-digit numbers; numbers beyond 100 are later grades.",
  },

  // ================================================================ MATH.number.place-value-tens
  {
    id: "aatens",
    arity: 2,
    title: "Tens and ones: what number do the blocks show",
    competency: PV,
    type: "integer",
    mc: true,
    // [t, o]: t tens and o ones (o may be 10–14: loose ones that make another ten)
    parse: none,
    reject: guard([[1, 9], [0, 14]], ([t, o]) => 10 * t + o <= 99, "Tens and ones making a number up to 99."),
    prompt: () => "What number do the blocks in the picture show? (Each long block is a ten; each small cube is a one.)",
    solve: ([t, o]) => ({
      steps: [st("tens", "count tens", PV, [t], 10 * t), st("ones", "count ones", COUNT, [o], o), st("total", "add", ADD, [10 * t, o], 10 * t + o)],
      answer: 10 * t + o,
    }),
    // independent: count every block: 10 for each long one, 1 for each cube
    validate: ([t, o], v) => {
      let c = 0;
      for (let i = 0; i < t; i++) for (let j = 0; j < 10; j++) c++;
      for (let i = 0; i < o; i++) c++;
      return v === c;
    },
    bugs: ([t, o]) => [
      bug("count-blocks", "conceptual", PV, "Each block was counted as one. A long block is a ten: it is worth 10 small cubes.", t + o),
      bug("swap-digits", "procedural", PV, `The tens and ones were written the wrong way round. The tens digit comes first: ${t} tens.`, o >= 1 && o <= 9 && o !== t ? 10 * o + t : null),
      bug("join-digits", "conceptual", PV, `${o} ones were written next to the tens. ${o} ones are 1 ten and ${o - 10} ${o - 10 === 1 ? "one" : "ones"}, so there are ${t + 1} tens.`, o >= 10 ? Number(`${t}${o}`) : null),
    ],
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `${s.inputs[0]} tens are ${s.value}.` : s.id === "ones" ? `${s.value} ones.` : `${s.inputs[0]} and ${s.inputs[1]} make ${s.value}.`),
    domain: [[1, 9], [0, 14]],
    difficulty: ([, o]) => (o === 0 ? 1 : o <= 9 ? 2 : 3),
    figure: ([t, o]) => ({ type: "blocks", hundreds: 0, tens: t, ones: o }),
    word: ([t, o]) => `${nm(t + o)} ties sticks into bundles of ten: ${t} bundle${t > 1 ? "s" : ""} of ten and ${o} loose stick${o === 1 ? "" : "s"}, as in the picture. How many sticks are there in all?`,
    teach: {
      idea: "Ten ones make one ten. A two-digit number tells how many tens and how many ones: 47 is 4 tens and 7 ones.",
      method: "Count the tens in tens (10, 20, 30 …), then count on the ones. If there are 10 or more loose ones, make another ten first.",
      visual: ([t, o]) => ({ type: "blocks", hundreds: 0, tens: t, ones: o }),
      alternatives: [
        { id: "count_on", title: "Count in tens, then in ones", kind: "procedural", text: ["Touch each long block and say 10, 20, 30 …", "Then touch each cube and keep counting by ones."], visual: ([t, o]) => ({ type: "numberline", from: 0, to: 10 * t + o, step: 10 * t + o > 20 ? 10 : 1, jumps: [...[...Array(t)].map((_, i) => [10 * i, 10 * i + 10] as [number, number]), [10 * t, 10 * t + o] as [number, number]] }) },
        { id: "bundles", title: "Bundles of sticks", kind: "conceptual", text: ["Tie ten loose sticks into a bundle: one bundle is one ten.", "Write the bundles as the tens digit and the loose sticks as the ones digit."] },
      ],
    },
    limits: "Numbers up to 99 shown as tens and up to 14 loose ones.",
  },
  {
    id: "aadigit",
    arity: 2,
    title: "The value of a digit in a two-digit number",
    competency: PV,
    type: "integer",
    mc: true,
    // [n, kind]: kind 0 the value of the tens digit, 1 how many tens
    parse: none,
    reject: guard([[10, 99], [0, 1]], ([n]) => Math.floor(n / 10) !== n % 10, "A two-digit number with two different digits."),
    prompt: ([n, kind]) => (kind === 0 ? `In ${n}, what is the value of the digit ${Math.floor(n / 10)}?` : `How many tens are there in ${n}?`),
    solve: ([n, kind]) => {
      const d = Math.floor(n / 10);
      return { steps: [st("place", "find the place", PV, [n], "tens"), st("value", "value", PV, [d], kind === 0 ? 10 * d : d)], answer: kind === 0 ? 10 * d : d };
    },
    // independent: take away ten at a time and count how many tens fit
    validate: ([n, kind], v) => {
      let r = n;
      let t = 0;
      while (r >= 10) {
        r -= 10;
        t++;
      }
      return v === (kind === 0 ? t * 10 : t);
    },
    bugs: ([n, kind]) => {
      const d = Math.floor(n / 10);
      return kind === 0
        ? [
          bug("face-value", "conceptual", PV, `The digit itself was given. The ${d} is in the tens place, so it stands for ${d} tens, which is ${10 * d}.`, d),
          bug("wrong-digit", "procedural", PV, "The ones digit was used. Find the digit asked about first.", n % 10),
        ]
        : [
          bug("value-not-count", "conceptual", PV, `The value of the tens was given (${10 * d}). The question asks how many tens: ${d}.`, 10 * d),
          bug("wrong-digit", "procedural", PV, "The ones digit was read. The tens digit is the first digit.", n % 10),
        ];
    },
    variants: () => [],
    explain: (s) => (s.id === "place" ? `In ${s.inputs[0]}, the first digit is in the tens place.` : `So the answer is ${s.value}.`),
    domain: [[10, 99], [0, 1]],
    difficulty: ([n, kind]) => (kind === 1 && n < 50 ? 1 : kind === 1 ? 2 : 3),
    figure: ([n]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }),
    word: ([n, kind]) => (kind === 0 ? `A shop has ${n} pencils, packed in boxes of ten with some loose ones. How many pencils are in the full boxes?` : `${nm(n)} packs ${n} laddus into boxes of ten. How many boxes can be filled?`),
    teach: {
      idea: "Where a digit stands tells what it is worth: in 47 the 4 is in the tens place, so it means 4 tens, which is 40.",
      method: "Find the digit. If it is the first of two digits, it counts tens: its value is that digit times 10.",
      visual: ([n]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }),
      alternatives: [
        { id: "chart", title: "A tens and ones chart", kind: "procedural", text: ["Write the number in a chart with a Tens column and a Ones column.", "The digit in the Tens column is how many tens; multiply by 10 for its value."], visual: ([n]) => table(["Tens", "Ones"], [[Math.floor(n / 10), n % 10]]) },
      ],
    },
    limits: "Two-digit numbers with different digits; hundreds come later.",
  },
  {
    id: "aagreat",
    arity: 2,
    title: "The greatest and smallest two-digit number from digit cards",
    competency: PV,
    type: "integer",
    mc: true,
    // [x, kind]: three different digits (the x-th set of 3 from 0–9); kind 0 greatest, 1 smallest
    parse: none,
    reject: guard([[0, 119], [0, 1]], () => true, "Three different digit cards."),
    prompt: ([x, kind]) => `Use two of the digit cards in the picture (${list(cards(x))}) to make the ${kind === 0 ? "greatest" : "smallest"} two-digit number you can. Use each card only once. Which number is it?`,
    solve: ([x, kind]) => {
      const [a, b, c] = combo(10, 3, x);
      const ans = kind === 0 ? 10 * c + b : a === 0 ? 10 * b : 10 * a + b;
      return { steps: [st("tens", "choose the tens digit", PV, [a, b, c], Math.floor(ans / 10)), st("ones", "choose the ones digit", PV, [a, b, c], ans % 10)], answer: ans };
    },
    // independent: try every two-digit number made of two different cards and keep the greatest (smallest)
    validate: ([x, kind], v) => {
      const ds = combo(10, 3, x);
      let best = kind === 0 ? -1 : 1000;
      for (const t of ds) for (const o of ds) if (t !== o && t !== 0) best = kind === 0 ? Math.max(best, 10 * t + o) : Math.min(best, 10 * t + o);
      return v === best;
    },
    bugs: ([x, kind]) => {
      const [a, b, c] = combo(10, 3, x);
      const [p, q] = cards(x);
      const first = p === 0 ? null : 10 * p + q;
      return kind === 0
        ? [
          bug("wrong-order", "conceptual", PV, `The two biggest digits were used but in the wrong places. The bigger digit (${c}) goes in the tens place.`, 10 * b + c),
          bug("first-two", "procedural", PV, "The first two cards were used as they lie. Choose the cards: the biggest in the tens place.", first),
        ]
        : [
          a === 0
            ? bug("zero-first", "conceptual", PV, `0 was put in the tens place, but 0${b} is just ${b}, a one-digit number. The smallest tens digit that is not 0 goes first.`, b)
            : bug("wrong-order", "conceptual", PV, `The two smallest digits were used but in the wrong places. The smaller digit (${a}) goes in the tens place.`, 10 * b + a),
          bug("first-two", "procedural", PV, "The first two cards were used as they lie. Choose the cards: the smallest (not 0) in the tens place.", first),
        ];
    },
    distractors: ([x, kind]) => {
      const [a, b, c] = combo(10, 3, x);
      return kind === 0 ? [10 * c + a, 10 * b + a] : [10 * c + (a || b), 10 * (a || b) + c];
    },
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `Tens place: ${s.value}.` : `Ones place: ${s.value}.`),
    domain: [[0, 119], [0, 1]],
    difficulty: ([x, kind]) => (kind === 0 ? 2 : combo(10, 3, x)[0] === 0 ? 3 : 2),
    figure: ([x]) => table(["Card", "Card", "Card"], [cards(x)]),
    word: ([x, kind]) => `${nm(x)} and a friend play a card game with the digit cards ${list(cards(x))}. Each picks two cards to make a two-digit number, and the ${kind === 0 ? "greatest" : "smallest"} number wins. What is the best number to make?`,
    teach: {
      idea: "In a two-digit number the tens digit matters most: 71 is more than 17 because 7 tens is more than 1 ten.",
      method: "For the greatest, put the biggest digit in the tens place and the next biggest in the ones. For the smallest, put the smallest digit that is not 0 in the tens place.",
      visual: ([x]) => table(["Card", "Card", "Card"], [cards(x)]),
      alternatives: [
        { id: "list_all", title: "Make them all and compare", kind: "procedural", text: ["Write every two-digit number you can make with the cards.", "Put them on a number line: the one furthest right is greatest, furthest left is smallest."], visual: ([x]) => {
          const ds = combo(10, 3, x);
          const all: number[] = [];
          for (const t of ds) for (const o of ds) if (t !== o && t !== 0) all.push(10 * t + o);
          return { type: "numberline", from: 0, to: 100, step: 10, marks: all };
        } },
      ],
    },
    limits: "Three different digit cards, using two of them once each.",
  },
  {
    id: "aaword",
    arity: 1,
    title: "Writing a number name as a number",
    competency: PV,
    type: "integer",
    mc: true,
    // [n]: the number name of n, 11–99
    parse: none,
    reject: guard([[11, 99]], () => true, "Number names from eleven to ninety-nine."),
    prompt: ([n]) => `Write "${words(n)}" as a number.`,
    solve: ([n]) => ({ steps: [st("tens", "tens", PV, [words(n)], Math.floor(n / 10)), st("ones", "ones", PV, [words(n)], n % 10)], answer: n }),
    // independent: add up the values of the parts of the name ("sixty" + "three")
    validate: ([n], v) => v === wordValue(words(n)),
    bugs: ([n]) => {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return [
        bug("write-parts", "conceptual", PV, `"${words(n)}" was written part by part as ${10 * t}${o}. ${cap(words(n))} is ${t} tens and ${o} ones: two digits, ${n}.`, n >= 21 && o ? Number(`${10 * t}${o}`) : null),
        bug("teen-ty", "recall", PV, n < 20 ? `"-teen" was read as "-ty". ${cap(words(n))} is 1 ten and ${o} ones.` : `"-ty" was read as "-teen". ${cap(TENS[t])} is ${t} tens.`, n < 20 ? (o >= 3 ? 10 * o : null) : o === 0 ? 10 + t : null),
        bug("reversed", "procedural", PV, n < 20 ? `The digits came out the wrong way round because "${ONES[o]}" is said first. ${cap(words(n))} has 1 ten: write 1 first.` : "The digits were written the wrong way round. The tens come first.", o && o !== t && (n >= 21 || o >= 3) ? 10 * o + (n < 20 ? 1 : t) : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `${s.value} tens` : `and ${s.value} ones.`),
    domain: [[11, 99]],
    difficulty: ([n]) => (n % 10 === 0 ? 1 : n < 20 ? 2 : 3),
    word: ([n]) => `${nm(n)} hears the teacher say a bus number: "${words(n)}". How is it written in digits?`,
    teach: {
      idea: "A number name tells the tens and the ones: sixty-three is 6 tens and 3 ones, written 63. The '-ty' words are tens; the '-teen' words are 1 ten and some ones.",
      method: "Find the tens word (twenty, thirty …) and write its digit first; then write the ones digit. A '-teen' number starts with 1.",
      visual: ([n]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }),
      alternatives: [
        { id: "chart", title: "Fill a tens and ones chart", kind: "procedural", text: ["Write the tens in the Tens column and the ones in the Ones column.", "Read the two digits together."], visual: ([n]) => table(["Tens", "Ones"], [[Math.floor(n / 10), n % 10]]) },
      ],
    },
    limits: "Number names from eleven to ninety-nine; writing numbers in words cannot be marked automatically and is left to the teacher.",
  },

  // ================================================================ MATH.number.subtraction
  {
    id: "aasub",
    arity: 2,
    title: "Taking away within 20",
    competency: SUB,
    type: "integer",
    mc: true,
    // [a, b]: a − b, 0 < b < a ≤ 20
    parse: none,
    reject: guard([[2, 20], [1, 19]], ([a, b]) => b < a, "Taking away from a number up to 20."),
    prompt: ([a, b]) => `${a} − ${b} = ? (The ten frame${a > 10 ? "s show" : " shows"} ${a}. Take away ${b}.)`,
    solve: ([a, b]) => ({ steps: [st("start", "start at", SUB, [a], a), st("count-back", "count back", SUB, [a, b], a - b)], answer: a - b }),
    // independent: take away one at a time
    validate: ([a, b], v) => {
      let s = a;
      for (let i = 0; i < b; i++) s--;
      return v === s;
    },
    bugs: ([a, b]) => [
      bug("count-start", "procedural", SUB, `${a} was counted as the first step back. Start at ${a} and say the number before it as 1.`, a - b + 1),
      bug("added", "conceptual", ADD, "The two numbers were added. The − sign means take away.", a + b),
      bug("one-extra", "procedural", SUB, "One too many was taken away. Take away exactly as many as the number says.", a - b - 1),
    ],
    variants: () => [],
    explain: (s) => (s.id === "start" ? `Start with ${s.value}.` : `Take away ${s.inputs[1]}: ${s.value} are left.`),
    domain: [[2, 20], [1, 19]],
    difficulty: ([a, b]) => (a <= 9 ? 1 : a - b >= 10 || a <= 10 ? 2 : 3),
    figure: ([a]) => ({ type: "tenframe", filled: a, frames: a > 10 ? 2 : 1 }),
    word: ([a, b]) => `There were ${a} birds on a neem tree. ${b} flew away. How many birds are still on the tree?`,
    teach: {
      idea: "Taking away makes a group smaller; what is left is the difference.",
      method: "Start with all of them and take away one at a time, or count back on a number line. Check by adding back: what is left + what was taken = what you had.",
      visual: ([a, b]) => ({ type: "numberline", from: 0, to: 20, marks: [a], jumps: [[a, a - b]] }),
      alternatives: [
        { id: "ten_frame", title: "Cross out counters", kind: "conceptual", text: ["Fill the ten frames with the first number.", "Cross out as many as you take away. Count the counters left."], visual: ([a]) => ({ type: "tenframe", filled: a, frames: a > 10 ? 2 : 1 }) },
        { id: "think_add", title: "Think of adding", kind: "procedural", text: ["13 − 5: what goes with 5 to make 13?", "5 + 5 = 10 and 3 more is 13, so 8."] },
      ],
    },
    limits: "Taking away from numbers up to 20; taking away 0 or all is the zero family.",
  },
  {
    id: "aamore",
    arity: 4,
    title: "How many more: comparing two groups in a picture",
    competency: SUB,
    type: "integer",
    mc: true,
    // [x, y, ctx, ord]: x of the first thing, y of the second (x > y); ord 1 lists the second thing first
    parse: none,
    reject: guard([[2, 12], [1, 11], [0, 2], [0, 1]], ([x, y]) => y < x, "Two groups of up to 12, the first bigger."),
    prompt: ([x, y, ctx]) => `The picture shows how many ${MORE[ctx][0]} and ${MORE[ctx][1]} there are. How many more ${MORE[ctx][0]} than ${MORE[ctx][1]} are there?`,
    solve: ([x, y]) => ({ steps: [st("compare", "subtract", SUB, [x, y], x - y)], answer: x - y }),
    // independent: match one of each until the smaller group runs out, then count the ones left over
    validate: ([x, y], v) => {
      let a = x;
      let b = y;
      while (b > 0) {
        a--;
        b--;
      }
      return v === a;
    },
    bugs: ([x, y]) => [
      bug("gave-bigger", "conceptual", SUB, "The bigger group's number was given. 'How many more' asks for the difference: the ones left after matching.", x),
      bug("added", "conceptual", ADD, "The two groups were added. 'How many more' compares them; it does not put them together.", x + y),
      bug("gave-smaller", "conceptual", SUB, "The smaller group's number was given. Match the two rows one to one and count the extra ones.", y),
    ],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} more.`,
    domain: [[2, 12], [1, 11], [0, 2], [0, 1]],
    cap: 300,
    difficulty: ([x, y]) => (x <= 6 ? 1 : x - y <= 3 ? 2 : 3),
    figure: ([x, y, ctx, ord]) => ({ type: "pictograph", labels: ord ? [MORE[ctx][1], MORE[ctx][0]] : [MORE[ctx][0], MORE[ctx][1]], counts: ord ? [y, x] : [x, y], key: 1 }),
    word: ([x, y, ctx]) => `${nm(x + y)}'s class made a picture chart of ${MORE[ctx][2]}, as shown. ${MORE[ctx][3]}`,
    teach: {
      idea: "'How many more' compares two groups: match them one to one, and the extra ones are the answer.",
      method: "Pair each picture in the shorter row with one in the longer row. Count the pictures with no partner, or subtract the smaller number from the bigger.",
      visual: ([x, y, ctx]) => ({ type: "pictograph", labels: [MORE[ctx][0], MORE[ctx][1]], counts: [x, y], key: 1 }),
      alternatives: [
        { id: "count_up", title: "Count up from the smaller", kind: "procedural", text: ["Start at the smaller number.", "Count up to the bigger number; the number of steps is how many more."], visual: ([x, y]) => ({ type: "numberline", from: 0, to: 12, marks: [y, x], jumps: [[y, x]] }) },
      ],
    },
    limits: "Two groups of up to 12 in a picture chart where one picture is one thing.",
  },

  // ================================================================ MATH.number.zero
  {
    id: "aazero",
    arity: 2,
    title: "Adding, taking away and multiplying with 0 (and times 1)",
    competency: ZERO,
    type: "integer",
    mc: true,
    // [kind, a]: 0 a + 0, 1 0 + a, 2 a − 0, 3 a − a, 4 a × 0, 5 a × 1
    parse: none,
    reject: guard([[0, 5], [1, 20]], () => true, "A number up to 20 with 0 (or times 1)."),
    prompt: ([kind, a]) => `${zeroExpr(kind, a)} = ?`,
    solve: ([kind, a]) => {
      const v = [a, a, a, 0, 0, a][kind];
      return { steps: [st("rule", kind >= 4 ? "multiply" : kind === 3 ? "subtract" : "add or take away zero", ZERO, [zeroExpr(kind, a)], v)], answer: v };
    },
    // independent: count on, count back, or add a number of equal groups, one at a time
    validate: ([kind, a], v) => {
      let s = 0;
      if (kind === 0 || kind === 1) for (let i = 0; i < a; i++) s++;
      else if (kind === 2 || kind === 3) {
        s = a;
        for (let i = 0; i < (kind === 2 ? 0 : a); i++) s--;
      } else for (let g = 0; g < a; g++) s += kind === 4 ? 0 : 1;
      return v === s;
    },
    bugs: ([kind, a]) =>
      kind <= 2
        ? [bug("zero-makes-zero", "conceptual", ZERO, `It was thought that anything with 0 gives 0. ${kind === 2 ? "Taking away" : "Adding"} nothing leaves the number the same: ${a}.`, 0)]
        : kind === 3
          ? [bug("nothing-taken", "conceptual", ZERO, `Taking away all ${a} leaves nothing: an empty group is 0.`, a)]
          : kind === 4
            ? [bug("times-zero-same", "conceptual", ZERO, `× 0 was treated like + 0. ${a} ${a === 1 ? "group" : "groups"} of 0 is nothing: 0.`, a)]
            : [
              bug("times-one-plus", "conceptual", ZERO, `× 1 was treated like + 1. ${a} ${a === 1 ? "group" : "groups"} of 1 is ${a}.`, a + 1),
              bug("times-one-one", "conceptual", ZERO, `It was thought that × 1 gives 1. ${a} groups of 1 thing are ${a} things.`, a === 1 ? null : 1),
            ],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} = ${s.value}.`,
    domain: [[0, 5], [1, 20]],
    difficulty: ([kind]) => (kind <= 2 ? 1 : kind === 3 ? 2 : 3),
    figure: ([kind, a]) => (kind <= 3 ? { type: "tenframe", filled: a, frames: a > 10 ? 2 : 1 } : kind === 5 ? { type: "array", rows: a, cols: 1 } : null),
    word: ([kind, a]) =>
      [
        `${nm(a)} has ${a} pencils and gets 0 more. How many pencils does ${nm(a)} have now?`,
        `A basket has 0 mangoes. ${nm(a)} puts in ${a} mangoes. How many mangoes are in the basket now?`,
        `${nm(a)} has ${a} stickers and gives away 0. How many stickers are left?`,
        `${nm(a)} had ${a} sweets and ate all ${a} of them. How many sweets are left?`,
        `There ${a === 1 ? "is 1 plate" : `are ${a} plates`} with 0 laddus on ${a === 1 ? "it" : "each plate"}. How many laddus are there?`,
        `There ${a === 1 ? "is 1 plate" : `are ${a} plates`} with 1 laddu on ${a === 1 ? "it" : "each plate"}. How many laddus are there?`,
      ][kind],
    teach: {
      idea: "Zero means nothing: adding or taking away 0 leaves a number the same, and taking all away leaves 0. Groups of 0 make 0; groups of 1 make the number itself.",
      method: "Think of real things: 5 apples and no more apples is still 5. 4 empty plates hold 0 laddus.",
      visual: ([kind, a]) => (kind <= 3 ? { type: "tenframe", filled: kind === 3 ? 0 : a, frames: a > 10 ? 2 : 1 } : kind === 5 ? { type: "array", rows: a, cols: 1 } : { type: "tenframe", filled: 0, frames: 1 }),
      alternatives: [
        { id: "empty", title: "An empty box is zero", kind: "conceptual", text: ["Show an empty ten frame: there are 0 counters.", "Adding an empty box to a full one does not change how many there are."], visual: () => ({ type: "tenframe", filled: 0, frames: 1 }) },
      ],
    },
    limits: "Whole numbers up to 20 with 0, and × 1; dividing by 0 is not asked.",
  },
];

// ---------------------------------------------------------------- helpers used by the families above
// an explanation that cannot happen on a problem (no prediction there) is left out of that problem
for (const d of B01) {
  const all = d.bugs;
  d.bugs = (p) => all(p).filter((b) => b.predict !== null);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shapeSeq(u: number, q: number, s: number) {
  const unit = UNITS[u];
  const L = unit.length;
  const order = perm(4, 2 * q);
  return [...Array(2 * L + s)].map((_, i) => SYM[order[unit[i % L]]]);
}
const NSU_UNITS: [string, string, string][] = [["paper clip", "paper clips", "pencil"], ["matchstick", "matchsticks", "ribbon"], ["eraser", "erasers", "straw"]];
const CUPCTX: [string, string, string][] = [["bottle", "glass", "glasses"], ["pot", "cup", "cups"]];
const heavyCtx = (c: number) => ["bags", "parcels", "boxes"][c];
const heavyOne = (c: number) => ["Bag", "Parcel", "Box"][c];
/** The two balance results [heavier, lighter] for [q, f, o, ctx], in the order told: the true order (lightest first) is
 * perm(3, q) + 1; o tells the second result first. */
function balanceResults([q, , o]: number[]): [number, number][] {
  const order = perm(3, q).map((x) => x + 1);
  const r: [number, number][] = [[order[1], order[0]], [order[2], order[1]]];
  return o ? [r[1], r[0]] : r;
}
/** Each result as a sentence: bit i of f says it with "lighter" (lighter one named first) instead of "heavier". */
function balanceTold(p: number[]): { text: string; named: number[] }[] {
  const c = heavyOne(p[3]);
  return balanceResults(p).map(([h, l], i) => ((p[1] >> i) & 1 ? { text: `${c} ${l} is lighter than ${c} ${h}`, named: [l, h] } : { text: `${c} ${h} is heavier than ${c} ${l}`, named: [h, l] }));
}
function seqEvents(k: number, c: number, sh: number) {
  const chosen = combo(DAYLIFE.length, k, c).map((i) => DAYLIFE[i]);
  return perm(k, sh).map((t) => chosen[t]);
}
function durActs(c: number, sh: number) {
  const chosen = combo(ACTS.length, 4, c).map((i) => ACTS[i]);
  return perm(4, sh).map((t) => chosen[t]);
}
function ordNums(seed: number, k: number) {
  return [...Array(k)].map((_, i) => 10 + (hs(`o${seed}:${k}:${i}`) % 90));
}
function cards(x: number) {
  const ds = combo(10, 3, x);
  return perm(3, hs(`cards${x}`) % 6).map((i) => ds[i]);
}
const MORE: [string, string, string, string][] = [
  ["cars", "dolls", "the toys in the toy box", "How many more cars than dolls are in the toy box?"],
  ["mangoes", "bananas", "the fruit each child likes best", "How many more children like mangoes best than bananas?"],
  ["red flowers", "yellow flowers", "the flowers in the school garden", "How many more red flowers than yellow flowers are in the garden?"],
];
function zeroExpr(kind: number, a: number) {
  return [`${a} + 0`, `0 + ${a}`, `${a} − 0`, `${a} − ${a}`, `${a} × 0`, `${a} × 1`][kind];
}
