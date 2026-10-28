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
/** hs with its bits mixed (murmur3 finalizer): small remainders (hm(..) % 10) are then evenly spread, so different
 * seeds really give different rows of shapes, coins or numbers (distinct@1). */
const hm = (s: string) => {
  let x = hs(s);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const inR = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const guard = (d: [number, number][], ok: (p: number[]) => boolean, why: string) => (p: number[]) => (!inR(p, d) || !ok(p) ? why : null);
/** level@1: the grade a whole number belongs to by its number of digits (Indian syllabus: up to 2 digits Grade 1,
 * 3 digits Grade 3, 4 digits Grade 4, 5–6 digits (lakhs) Grade 5, 7 or more (crores) Grade 6). */
const digitGrade = (x: number) => {
  const n = String(Math.abs(Math.round(x))).length;
  return n <= 2 ? 1 : n === 3 ? 3 : n === 4 ? 4 : n <= 6 ? 5 : 6;
};
/** level@1: an addition or subtraction story by its size: within 20 Grade 1, two-digit Grade 2, three-digit Grade 3. */
const sizeGrade = (...xs: number[]) => {
  const m = Math.max(...xs);
  return m <= 20 ? 1 : m <= 99 ? 2 : 3;
};
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
const TARGETS = [0, 1, 2, 4, 3];
const objectsOf = (seed: number) => [...OBJECTS].sort((x, y) => hs(`${seed}:${x[0]}`) - hs(`${seed}:${y[0]}`)).slice(0, 6);
const FLAT: [string, number][] = [["▲", 0], ["▼", 0], ["◀", 0], ["▶", 0], ["■", 1], ["□", 1], ["●", 2], ["○", 2], ["▬", 3], ["▮", 3]];
/** Sides and whether all sides are equal, for each drawn shape (used by the check). */
const FLAT_PROPS: Record<string, { sides: number; equal: boolean }> = { "▲": { sides: 3, equal: false }, "▼": { sides: 3, equal: false }, "◀": { sides: 3, equal: false }, "▶": { sides: 3, equal: false }, "■": { sides: 4, equal: true }, "□": { sides: 4, equal: true }, "●": { sides: 0, equal: false }, "○": { sides: 0, equal: false }, "▬": { sides: 4, equal: false }, "▮": { sides: 4, equal: false } };
const FLATN = ["triangle", "square", "circle", "rectangle"];
const flatRow = (len: number, seed: number) => [...Array(len)].map((_, i) => FLAT[hm(`${seed}:${len}:${i}`) % FLAT.length]);

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
  // the month and year as the header row (a table title is not drawn), the day names as the first row
  return { type: "table", head: [`${MONTHS[m]} ${2026 + yr}`, "", "", "", "", "", ""], rows: [DAYS.map((d) => d.slice(0, 3)), ...chunks(cells, 7)] };
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
/** A plural noun made singular (for a count of 1: "1 book", "1 mango", "1 box"). */
const SINGULAR: Record<string, string> = { boxes: "box", mangoes: "mango", leaves: "leaf", glasses: "glass", peaches: "peach" };
const sing = (t: string) => SINGULAR[t] ?? t.replace(/s$/, "");
/** n things, with the noun singular when n is 1. */
const nOf = (n: number, things: string) => `${n} ${n === 1 ? sing(things) : things}`;
const DAYLIFE = ["wakes up", "eats breakfast", "goes to school", "eats lunch at school", "comes back home", "plays outside after coming home, before dinner", "eats dinner", "goes to bed"];
const ACTS: [string, number][] = [["tie your shoelaces", 1], ["brush your teeth", 3], ["eat lunch", 20], ["watch a film", 150], ["sleep at night", 600], ["a school week, Monday to Friday", 7200], ["the summer holidays", 60000]];

// ---------------------------------------------------------------- money
const SMALL = [1, 2, 5, 10];
const BIGV = [1, 2, 5, 10, 20, 50];
/** Every different collection of coins (and notes) for aamoney, listed once each (largest first, as drawn): 2–4 coins
 * of ₹1, ₹2, ₹5, ₹10 adding up to ₹3–₹20 (big 0), or 3–5 coins and notes up to ₹50 adding up to ₹21–₹100 (big 1). The
 * seed picks one collection, so two seeds never show the same money (distinct@1). */
const MONEY_SETS = [0, 1].map((big) => {
  const vals = big ? [...BIGV].reverse() : [...SMALL].reverse();
  const [nmin, nmax, lo, hi] = big ? [3, 5, 21, 100] : [2, 4, 3, 20];
  const out: number[][] = [];
  const rec = (i: number, acc: number[], t: number) => {
    if (acc.length >= nmin && t >= lo && t <= hi) out.push(acc);
    if (acc.length === nmax) return;
    for (let j = i; j < vals.length; j++) if (t + vals[j] <= hi) rec(j, [...acc, vals[j]], t + vals[j]);
  };
  rec(0, [], 0);
  // a fixed shuffle, so neighbouring seeds are not neighbouring collections
  return out.sort((a, b) => hm(`ms${big}:${a.join("+")}`) - hm(`ms${big}:${b.join("+")}`));
});
const moneyOf = (seed: number, big: number) => MONEY_SETS[big][seed] ?? [];
const COINV1 = [1, 2, 5, 10, 20];
const COINV2 = [1, 2, 5, 10, 20, 50, 100];
const coinsOf = (seed: number, big: number) => {
  const vals = big ? COINV2 : COINV1;
  const n = 3 + (hm(`c${seed}`) % 3);
  return [...Array(n)].map((_, i) => vals[hm(`c${seed}:${i}`) % vals.length]);
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
    explain: (s) => (s.id === "shelf" ? `The shelf just ${s.inputs[1] === 0 ? "above" : "below"} is the ${String(s.value).toLowerCase()} shelf.` : `It has ${s.value} ${s.value === 1 ? "thing" : "things"} on it.`),
    domain: [[3, 4], [0, 3], [0, 1], [0, 11]],
    difficulty: ([S, , dir]) => (S === 3 && dir === 0 ? 1 : S === 3 ? 2 : 3),
    figure: ([S, , , seed]) => {
      const { items, counts, names } = shelfOf(S, seed);
      return table(["Shelf", "What is on it"], names.map((n, i) => [n, nOf(counts[i], items[i])]));
    },
    word: ([S, t, dir, seed]) => `${nm(seed + t)} is tidying the classroom cupboard, as in the picture. The teacher asks for everything on the shelf just ${dir === 0 ? "above" : "below"} the ${shelfOf(S, seed).items[t]}. How many things does ${nm(seed + t)} take out?`,
    teach: {
      idea: "Above means higher up and below means lower down. 'Just above' is the very next shelf up.",
      method: "Put your finger on the shelf named. Move it one shelf up for 'above' or one shelf down for 'below', and read what is there.",
      visual: ([S, , , seed]) => {
        const { items, counts, names } = shelfOf(S, seed);
        return table(["Shelf", "What is on it"], names.map((n, i) => [n, nOf(counts[i], items[i])]));
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
    reject: guard([[0, 4], [0, 79]], ([tg, seed]) => {
      const c = objectsOf(seed).filter((o) => o[1] === TARGETS[tg]).length;
      return c >= 1 && c <= 4;
    }, "Six everyday things with 1 to 4 of the shape asked about."),
    prompt: ([tg, seed]) => `The picture shows a ${SOLIDS[TARGETS[tg]]}. Here are some things: ${objectsOf(seed).map((o) => o[0]).join(", ")}. How many of these things are shaped like a ${SOLIDS[TARGETS[tg]]}${TARGETS[tg] === 3 ? " (a box shape whose faces are not all the same square, so not a cube)" : ""}?`,
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
        3: [2, "Cubes were counted as well. Here the cuboids asked for are the box shapes whose faces are not all the same square, like a brick; a dice is a cube."],
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
    domain: [[0, 4], [0, 79]],
    cap: 300,
    difficulty: ([tg]) => (tg === 0 ? 1 : tg >= 2 && tg !== 3 ? 3 : 2),
    figure: ([tg]) => ({ type: "solid", name: SOLIDS[TARGETS[tg]] }),
    word: ([tg, seed]) => `${nm(seed)} is tidying the room and puts every thing shaped like a ${SOLIDS[TARGETS[tg]]}${TARGETS[tg] === 3 ? " that is not a cube" : ""} (as in the picture) into one basket. The things are: ${objectsOf(seed).map((o) => o[0]).join(", ")}. How many things go into the basket?`,
    teach: {
      idea: "Solid shapes are known by their faces: a sphere has no flat face, a cylinder two circle faces, a cone one circle face and a point, a cube six equal square faces.",
      method: "For each thing, picture it in your hand: does it have flat faces? What shape are they? Then match it to the solid.",
      visual: ([tg]) => ({ type: "solid", name: SOLIDS[TARGETS[tg]] }),
      alternatives: [
        { id: "stamp", title: "Stamp the faces", kind: "conceptual", text: ["Press each flat face in clay or ink: a cube prints squares, a cylinder prints circles, a cone prints one circle.", "A sphere prints only a dot, because it has no flat face."], visual: ([tg]) => ({ type: "solid", name: SOLIDS[TARGETS[tg]] === "cube" ? "cube" : "cylinder" }) },
        { id: "roll", title: "Roll, slide or both", kind: "conceptual", text: ["A sphere rolls every way. A cylinder rolls one way and also slides on its flat face.", "A cube only slides. A cone rolls round in a circle."] },
      ],
    },
    limits: "Sorting named everyday things into sphere, cylinder, cube, cone and cuboid (for cuboids, the box shapes that are not cubes are asked for, since a cube is also a cuboid).",
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
    reject: guard([[0, 3], [6, 9], [0, 29]], ([tg, len, seed]) => {
      const row = flatRow(len, seed);
      const c = row.filter((r) => r[1] === tg).length;
      const trap = tg === 0 ? row.some((r) => r[1] === 0 && r[0] !== "▲") : tg === 1 ? row.some((r) => r[1] === 3) : tg === 3 ? row.some((r) => r[0] === "▮") && row.some((r) => r[1] === 1) : row.some((r) => r[0] === "○");
      return c >= 1 && c <= len - 2 && trap;
    }, "A row of 6 to 9 shapes with 1 or more of the shape asked about, some turned or not filled in."),
    prompt: ([tg]) => `How many ${tg === 3 ? "rectangles that are not squares" : `${FLATN[tg]}s`} are in the picture? Look carefully: some shapes are turned around or not filled in.`,
    solve: ([tg, len, seed]) => {
      const c = flatRow(len, seed).filter((r) => r[1] === tg).length;
      return { steps: [st("find", "find the shapes", SHP, [FLATN[tg]], FLATN[tg]), st("count", "count", COUNT, [c], c)], answer: c };
    },
    // independent: classify each drawn shape by its sides (3 sides; 4 equal sides; no sides) and count
    validate: ([tg, len, seed], v) => {
      let c = 0;
      for (const [s] of flatRow(len, seed)) {
        const p = FLAT_PROPS[s];
        if (tg === 0 ? p.sides === 3 : tg === 1 ? p.sides === 4 && p.equal : tg === 3 ? p.sides === 4 && !p.equal : p.sides === 0) c++;
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
            : tg === 3
              ? bug("only-lying-down", "conceptual", SHP, "Only the rectangles lying flat were counted. A rectangle standing up on its short side is still a rectangle: 4 sides, opposite sides equal, 4 square corners.", row.filter((r) => r[0] === "▬").length !== c ? row.filter((r) => r[0] === "▬").length : null)
              : bug("only-filled", "conceptual", SHP, "Only the coloured circles were counted. An empty circle is still a circle: the colour does not change the shape.", row.filter((r) => r[0] === "●").length),
        bug("missed-one", "procedural", COUNT, "One shape was missed. Touch each shape in the row once as you look at it.", c >= 2 ? c - 1 : null),
        ...(tg === 3 ? [bug("squares-too", "conceptual", SHP, "The squares were counted too. The question asks for the rectangles whose sides are not all the same length.", c + row.filter((r) => r[1] === 1).length)] : []),
      ];
    },
    distractors: ([tg, len, seed]) => {
      const c = flatRow(len, seed).filter((r) => r[1] === tg).length;
      return [c + 1, c + 2, len];
    },
    variants: () => [],
    explain: (s) => (s.id === "find" ? `Look for every ${s.value}, whichever way it is turned.` : `There ${s.value === 1 ? "is" : "are"} ${s.value}.`),
    domain: [[0, 3], [6, 9], [0, 29]],
    cap: 300,
    difficulty: ([tg, len]) => (tg === 2 && len <= 7 ? 1 : len <= 7 ? 2 : 3),
    figure: ([, len, seed]) => table(flatRow(len, seed).map((_, i) => String(i + 1)), [flatRow(len, seed).map((r) => r[0])]),
    word: ([tg, len, seed]) => `${nm(seed + len)} cut shapes from paper for a rangoli, as in the picture. How many of the shapes are ${tg === 3 ? "rectangles that are not squares" : `${FLATN[tg]}s`}?`,
    teach: {
      idea: "A shape keeps its name when it is turned or coloured differently: a triangle always has 3 sides and 3 corners, a square 4 equal sides, a circle no corners.",
      method: "Look at each shape in turn and count its sides with your finger. Then count the shapes that match.",
      visual: ([, len, seed]) => table(flatRow(len, seed).map((_, i) => String(i + 1)), [flatRow(len, seed).map((r) => r[0])]),
      alternatives: [
        { id: "sides", title: "Count sides and corners", kind: "conceptual", text: ["Triangle: 3 sides, 3 corners. Square: 4 equal sides, 4 corners. Circle: no sides, no corners.", "Turning a shape does not change how many sides it has."], visual: ([tg]) => ({ type: "shape", sides: tg === 0 ? 3 : 4, name: tg === 0 ? "triangle" : "square" }) },
      ],
    },
    limits: "Triangles, squares, circles and rectangles that are not squares, among drawn symbols turned different ways; counting sides of one drawn shape is left to the counting families.",
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
    explain: (s) => (s.id === "rest" ? `From the ${s.inputs[1]} to the end of the month (${s.inputs[0]}) is ${nOf(Number(s.value), "days")}.` : `Then ${nOf(Number(s.inputs[1]), "more days")} into the next month: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}.`),
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
      // a seed that draws exactly the coins of an earlier seed would repeat that question (distinct@1)
      const repeat = [...Array(seed).keys()].some((s0) => list(coinsOf(s0, big)) === list(it));
      return !repeat && (kind <= 1 ? new Set(it).size >= 2 : it.filter((x) => x === it[0]).length < it.length);
    }, "Three to five coins and notes, not all the same, and not a row of coins another seed already draws."),
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
      return kind === 2 ? [c - 1, c + 1, c + 2, c + 3].filter((x) => x >= 1 && x <= it.length + 1) : [...new Set(it)];
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
      return it.length > 0 && (big ? t <= 100 && t > 20 : t <= 20 && t >= 3);
    }, "One of the different collections of coins adding up to ₹20 (or coins and notes adding up to ₹100)."),
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
      return B ? `${nm(N)} has to pay ₹${N}. ${nm(N)} gives one ₹${B} ${kindOfMoney(B)} and then some ₹${c} coins (the table shows what each is worth). How many ₹${c} coins does ${nm(N)} give?` : `How many ₹${c} coins make ₹${N}? (The table shows what one coin is worth.)`;
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
    figure: ([N, bi, ci]) => table(["Money", "Worth"], [...(NOTE_B[bi] ? [[`One ₹${NOTE_B[bi]} ${kindOfMoney(NOTE_B[bi])} (given first)`, `₹${NOTE_B[bi]}`]] : []), [`Each small coin`, `₹${COIN_C[ci]}`], ["Amount to pay", `₹${N}`]]),
    word: ([N, bi, ci]) => {
      const B = NOTE_B[bi];
      const c = COIN_C[ci];
      return B ? `A bus ticket costs ₹${N}. ${nm(N + 3)} puts ₹${B} on the counter and then adds ₹${c} coins until it is enough. How many ₹${c} coins are added?` : `${nm(N + 3)} buys some sweets for ₹${N} and pays with only ₹${c} coins. How many coins are needed?`;
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
    prompt: ([q, t, kind, ctx]) => `Each ${CUPCTX[ctx][0]} was filled using a small ${CUPCTX[ctx][1]}. The table in the picture shows how many ${CUPCTX[ctx][2]} each one holds. ${cap(CUPCTX[ctx][0])} ${t} is the ${kind === 0 ? "tallest" : "shortest"}. Which ${CUPCTX[ctx][0]} holds the ${kind === 0 ? "most" : "least"}? Write its number.`,
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
    figure: ([q, , , ctx]) => table([cap(CUPCTX[ctx][0]), `${cap(CUPCTX[ctx][2])} it holds`], perm(4, q).map((r, i) => [i + 1, 3 + 2 * r])),
    word: ([q, t, kind, ctx]) => `${nm(q + t)} helps fill four ${CUPCTX[ctx][0]}s for a wedding feast, as in the picture. Number ${t} looks the ${kind === 0 ? "tallest" : "shortest"}. Which one really holds the ${kind === 0 ? "most" : "least"}? Write its number.`,
    teach: {
      idea: "How much a container holds is how many cups of water fill it. Height alone does not tell: width matters too.",
      method: "Look at how many cups each one took. The most cups means it holds the most.",
      visual: ([q, , , ctx]) => table([cap(CUPCTX[ctx][0]), `${cap(CUPCTX[ctx][2])} it holds`], perm(4, q).map((r, i) => [i + 1, 3 + 2 * r])),
      alternatives: [
        { id: "pour", title: "Pour from one into another", kind: "conceptual", text: ["Fill one container and pour it into another.", "If it overflows, the first holds more; if it does not fill up, the second holds more."], visual: () => table(["Container", "Cups it holds"], [["tall, thin bottle", 5], ["short, wide pot", 8]]) },
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
    contract: { kind: "value", statement: ([a, b]) => `${a}+${b}` },
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
    word: ([a, b]) => `${nm(a)} picks ${nOf(a, FRUIT[(a + b) % FRUIT.length])} from the tree. ${nm(a + 4)} picks ${b} more. How many ${FRUIT[(a + b) % FRUIT.length]} do they have altogether?`,
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
    explain: (s) => (s.id === "tens" ? `${s.inputs[0]} ${s.inputs[0] === 1 ? "ten is" : "tens are"} ${s.value}.` : s.id === "ones" ? `${s.value} ${s.value === 1 ? "one" : "ones"}.` : `${s.inputs[0]} and ${s.inputs[1]} make ${s.value}.`),
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
    // [n, kind]: kind 0 the value of the tens digit, 1 how many tens, 2 the value of the ones digit
    parse: none,
    reject: guard([[10, 99], [0, 2]], ([n, kind]) => Math.floor(n / 10) !== n % 10 && (kind !== 2 || n % 10 !== 0), "A two-digit number with two different digits."),
    prompt: ([n, kind]) => (kind === 0 ? `In ${n}, what is the value of the digit ${Math.floor(n / 10)}?` : kind === 2 ? `In ${n}, what is the value of the digit ${n % 10}?` : `How many tens are there in ${n}?`),
    solve: ([n, kind]) => {
      const d = Math.floor(n / 10);
      if (kind === 2) return { steps: [st("place", "find the place", PV, [n], "ones"), st("value", "value", PV, [n % 10], n % 10)], answer: n % 10 };
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
      return v === (kind === 0 ? t * 10 : kind === 2 ? r : t);
    },
    bugs: ([n, kind]) => {
      const d = Math.floor(n / 10);
      if (kind === 2)
        return [
          bug("times-ten", "conceptual", PV, `The ${n % 10} was taken to stand for tens. It is in the ones place, so it is worth just ${n % 10}.`, 10 * (n % 10)),
          bug("wrong-digit", "procedural", PV, `The value of the tens digit was given. Find the digit asked about first: the ${n % 10} is the last digit.`, 10 * d),
        ];
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
    explain: (s) => (s.id === "place" ? (s.value === "ones" ? `In ${s.inputs[0]}, the last digit is in the ones place.` : `In ${s.inputs[0]}, the first digit is in the tens place.`) : `So the answer is ${s.value}.`),
    domain: [[10, 99], [0, 2]],
    difficulty: ([n, kind]) => (kind === 1 && n < 50 ? 1 : kind !== 0 ? 2 : 3),
    figure: ([n, kind]) => (kind === 1 ? null : { type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }),
    word: ([n, kind]) => (kind === 0 ? `A shop has ${n} pencils, packed in boxes of ten with some loose ones. How many pencils are in the full boxes?` : kind === 2 ? `A shop has ${n} pencils, packed in boxes of ten with some loose ones. How many loose pencils are there?` : `${nm(n)} packs ${n} laddus into boxes of ten. How many boxes can be filled?`),
    teach: {
      idea: "Where a digit stands tells what it is worth: in 47 the 4 is in the tens place, so it means 4 tens, which is 40.",
      method: "Find the digit. If it is the first of two digits, it counts tens: its value is that digit times 10.",
      visual: ([n]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }),
      alternatives: [
        { id: "chart", title: "A tens and ones chart", kind: "procedural", text: ["Write the number in a chart with a Tens column and a Ones column.", "The digit in the Tens column is how many tens; multiply by 10 for its value."], visual: ([n]) => table(["Tens", "Ones"], [[Math.floor(n / 10), n % 10]]) },
      ],
    },
    limits: "Two-digit numbers with different digits: the value of the tens digit or of the ones digit, and how many tens; hundreds come later.",
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
    explain: (s) => (s.id === "tens" ? `${s.value} ${s.value === 1 ? "ten" : "tens"}` : `and ${s.value} ${s.value === 1 ? "one" : "ones"}.`),
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
    contract: { kind: "value", statement: ([a, b]) => `${a}-${b}` },
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
    explain: (s) => (s.id === "start" ? `Start with ${s.value}.` : `Take away ${s.inputs[1]}: ${s.value} ${s.value === 1 ? "is" : "are"} left.`),
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
    contract: { kind: "value", statement: ([kind, a]) => [`${a}+0`, `0+${a}`, `${a}-0`, `${a}-${a}`][kind] },
    arity: 2,
    title: "Adding and taking away 0 (and taking away all)",
    competency: ZERO,
    type: "integer",
    mc: true,
    // [kind, a]: 0 a + 0, 1 0 + a, 2 a − 0, 3 a − a (× 0 and × 1 belong to multiplication, a later grade)
    parse: none,
    reject: guard([[0, 3], [1, 20]], () => true, "A number up to 20 with 0 added or taken away, or all of it taken away."),
    prompt: ([kind, a]) => `${zeroExpr(kind, a)} = ?`,
    solve: ([kind, a]) => {
      const v = [a, a, a, 0][kind];
      return { steps: [st("rule", kind === 3 ? "subtract" : "add or take away zero", ZERO, [zeroExpr(kind, a)], v)], answer: v };
    },
    // independent: count on or count back, one at a time
    validate: ([kind, a], v) => {
      let s = 0;
      if (kind === 0 || kind === 1) for (let i = 0; i < a; i++) s++;
      else {
        s = a;
        for (let i = 0; i < (kind === 2 ? 0 : a); i++) s--;
      }
      return v === s;
    },
    bugs: ([kind, a]) =>
      kind <= 2
        ? [bug("zero-makes-zero", "conceptual", ZERO, `It was thought that anything with 0 gives 0. ${kind === 2 ? "Taking away" : "Adding"} nothing leaves the number the same: ${a}.`, 0)]
        : [bug("nothing-taken", "conceptual", ZERO, `Taking away all ${a} leaves nothing: an empty group is 0.`, a)],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} = ${s.value}.`,
    domain: [[0, 3], [1, 20]],
    difficulty: ([kind]) => (kind <= 2 ? 1 : 2),
    distractors: ([, a]) => [a + 1, a - 1, 1].filter((x) => x >= 0),
    figure: ([, a]) => ({ type: "tenframe", filled: a, frames: a > 10 ? 2 : 1 }),
    word: ([kind, a]) =>
      [
        `${nm(a)} has ${nOf(a, "pencils")} and gets 0 more. How many pencils does ${nm(a)} have now?`,
        `A basket has 0 mangoes. ${nm(a)} puts in ${nOf(a, "mangoes")}. How many mangoes are in the basket now?`,
        `${nm(a)} has ${nOf(a, "stickers")} and gives away 0. How many stickers are left?`,
        a === 1 ? `${nm(a)} had 1 sweet and ate it. How many sweets are left?` : `${nm(a)} had ${a} sweets and ate all ${a} of them. How many sweets are left?`,
      ][kind],
    teach: {
      idea: "Zero means nothing: adding or taking away 0 leaves a number the same, and taking all away leaves 0.",
      method: "Think of real things: 5 apples and no more apples is still 5. Eat all 4 laddus on a plate and 0 are left.",
      visual: ([kind, a]) => ({ type: "tenframe", filled: kind === 3 ? 0 : a, frames: a > 10 ? 2 : 1 }),
      alternatives: [
        { id: "empty", title: "An empty box is zero", kind: "conceptual", text: ["Show an empty ten frame: there are 0 counters.", "Adding an empty box to a full one does not change how many there are."], visual: () => ({ type: "tenframe", filled: 0, frames: 1 }) },
      ],
    },
    limits: "Whole numbers up to 20 with 0 added or taken away; × 0, × 1 and dividing by 0 belong to multiplication and division families.",
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
  return [...Array(k)].map((_, i) => 10 + (hm(`o${seed}:${k}:${i}`) % 90));
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
  return [`${a} + 0`, `0 + ${a}`, `${a} − 0`, `${a} − ${a}`][kind];
}

// ================================================================ gap@1 additions (assessment gaps closed for b01)
const NPAT = "MATH.algebra.number-patterns";
const ALGO = "MATH.reasoning.algorithms-flowcharts";
/** A fixed shuffle by a key, so the right option's letter is not predictable. */
const shuffleBy = <T,>(xs: T[], key: string): T[] => xs.map((x, i) => [x, hm(`${key}#${i}`)] as [T, number]).sort((a, b) => a[1] - b[1]).map(([x]) => x);
const ix = (cs: string[], s: string | null | undefined): number | null => (s == null || cs.indexOf(s) < 0 ? null : cs.indexOf(s));
const ixs = (cs: string[], ss: string[]): number[] | null => {
  const r = ss.map((s) => cs.indexOf(s)).filter((i) => i >= 0);
  return r.length ? r : null;
};
const mod = (a: number, n: number) => ((a % n) + n) % n;
const pad2 = (n: number) => String(n).padStart(2, "0");
/** A number with Indian commas (1,23,45,678). */
const indian = (n: number) => {
  const s = String(n);
  if (s.length <= 3) return s;
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return [...parts, s.slice(-3)].join(",");
};
/** Compare two whole numbers as digit strings: more digits is bigger, else the first digit that differs decides. */
const cmpDigits = (a: number, b: number) => {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return x.length < y.length ? -1 : 1;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};
const ORDW = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
const nth = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const WDAYS = [365, 366, 30, 31, 28, 29, 60, 90, 100, 200, 50, 75];
const isLeap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const mdays = (y: number, m: number) => (m === 1 && isLeap(y) ? 29 : MLEN[m]);
const sentence = (s: string) => {
  const t = s.split(" ");
  return { x: Number(t[0]), op: t[1], y: Number(t[2]), z: Number(t[4]) };
};

// ---- positions: inside/outside, near/far, in front of/behind
const WPLACES = ["tree", "well", "temple", "shop", "pond", "bus stop"];
const whereOf = (kind: number, seed: number, ask: number): { names: string[]; pts: [number, number, string][]; right: string; other?: string; x?: string } => {
  const h = (s: string) => hm(`aw${kind}:${seed}:${ask}:${s}`);
  if (kind === 0) {
    const animals = shuffleBy(ANIMALS, `aw0:${seed}:${ask}`).slice(0, 4);
    const lone = h("lone") % 4;
    const used = new Set<string>();
    const pts: [number, number, string][] = animals.map((a, i) => {
      const inside = (i === lone) === (ask === 0);
      for (let t = 0; ; t++) {
        let x: number;
        let y: number;
        if (inside) {
          x = 2 + (h(`x${i}:${t}`) % 3);
          y = 2 + (h(`y${i}:${t}`) % 3);
        } else {
          const r = h(`r${i}:${t}`) % 24; // the ring of cells around the fence
          [x, y] = r < 7 ? [r, 0] : r < 14 ? [r - 7, 6] : r < 19 ? [0, r - 13] : [6, r - 18];
        }
        if (!used.has(`${x},${y}`)) {
          used.add(`${x},${y}`);
          return [x, y, a];
        }
      }
    });
    return { names: animals, pts, right: animals[lone] };
  }
  if (kind === 1) {
    const places = shuffleBy(WPLACES, `aw1:${seed}`).slice(0, 3);
    const xs = shuffleBy([1, 2, 3, 4, 5, 6], `aw1x:${seed}`).slice(0, 3);
    const pts: [number, number, string][] = [[0, 3, "house"], ...places.map((p, i) => [xs[i], 3, p] as [number, number, string])];
    const near = places[xs.indexOf(Math.min(...xs))];
    const far = places[xs.indexOf(Math.max(...xs))];
    return { names: places, pts, right: ask ? far : near, other: ask ? near : far };
  }
  const q = shuffleBy(NAMES, `aw2:${seed}`).slice(0, 5);
  const j = 1 + (seed % 3);
  return { names: q, pts: [], x: q[j], right: q[ask ? j + 1 : j - 1], other: q[ask ? j - 1 : j + 1] };
};
const whereChoices = ([kind, seed, ask]: number[]) => {
  const w = whereOf(kind, seed, ask);
  return shuffleBy(kind === 2 ? w.names.filter((n) => n !== w.x) : w.names, `awc:${kind}:${seed}:${ask}`);
};
const whereFig = ([kind, seed, ask]: number[]): Visual => {
  const w = whereOf(kind, seed, ask);
  if (kind === 0) return { type: "plane", points: w.pts, segments: [[[1, 1], [5, 1]], [[5, 1], [5, 5]], [[5, 5], [1, 5]], [[1, 5], [1, 1]]], range: 6, quadrant: 1 };
  if (kind === 1) return { type: "plane", points: w.pts, segments: [[[0, 3], [6, 3]]], range: 6, quadrant: 1 };
  return table(["", "front of the queue", "", "", "", "back of the queue"], [["Ticket counter", ...w.names]]);
};

// ---- comparing groups and objects
const GRP_ITEMS = ["laddus", "mangoes", "marbles"];
const grpChoices = ([a, b, mode]: number[]) =>
  shuffleBy(mode === 0 ? [`${nm(a + 2 * b)}'s plate`, `${nm(a + 2 * b + 1)}'s plate`, "Both have the same number"] : [`${a} is more than ${b}`, `${a} is less than ${b}`, `${a} is equal to ${b}`], `grp:${a}:${b}:${mode}`);
/** The option strings for: the first is more / the first is less / equal (in the family's own words). */
const grpWords = ([a, b, mode, ask]: number[]) => {
  const P = `${nm(a + 2 * b)}'s plate`;
  const Q = `${nm(a + 2 * b + 1)}'s plate`;
  if (mode === 1) return { first: `${a} is more than ${b}`, second: `${a} is less than ${b}`, same: `${a} is equal to ${b}` };
  return ask === 0 ? { first: P, second: Q, same: "Both have the same number" } : { first: Q, second: P, same: "Both have the same number" };
};
const BIGS: [string, number][] = [["an ant", 0.5], ["a button", 1.5], ["a lemon", 6], ["a mango", 12], ["a football", 22], ["a cat", 45], ["a chair", 90], ["a bicycle", 170], ["an autorickshaw", 270], ["a bus", 1100], ["a train", 20000]];
const bigPair = ([i, j]: number[]) => ((i + j) % 2 ? [BIGS[j][0], BIGS[i][0]] : [BIGS[i][0], BIGS[j][0]]);

// ---- ordering and comparing larger numbers
const ordxNums = (lvl: number, seed: number): number[] => {
  const h = (s: string) => hm(`ox${lvl}:${seed}:${s}`);
  const out: number[] = [];
  const add = (x: number) => {
    if (!out.includes(x)) out.push(x);
  };
  const digits = (n: number, zero: boolean) => shuffleBy(zero ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9], `oxd${lvl}:${seed}`).slice(0, n);
  const perms = (ds: number[]) => {
    for (let t = 0; out.length < 3 + (lvl < 5 ? 1 : 0) && t < 200; t++) {
      const o = perm(ds.length, h(`p${t}`) % fact(ds.length)).map((i) => ds[i]);
      if (o[0] !== 0) add(Number(o.join("")));
    }
  };
  if (lvl === 0) for (let t = 0; out.length < 4; t++) add(1 + (h(`d${t}`) % 9));
  else if (lvl === 1) {
    add(50 + (h("small") % 50));
    for (let t = 0; out.length < 4; t++) add(100 + (h(`d${t}`) % 101));
  } else if (lvl === 2) {
    const H = 1 + (h("H") % 4);
    add(100 * H + (h("a") % 100));
    for (let t = 0; out.length < 2; t++) add(100 * H + (h(`b${t}`) % 100));
    for (let t = 0; out.length < 4; t++) add(100 + (h(`c${t}`) % 401));
  } else if (lvl === 3) perms(digits(3, true));
  else if (lvl === 4) perms(digits(4, true));
  else {
    const n = lvl === 5 ? 6 : 8;
    const ds = digits(n, true);
    perms(ds);
    // a number with one digit fewer whose first digit is the biggest: greater by its first digit, smaller by its length
    add(Number([...ds].sort((a, b) => b - a).slice(0, n - 1).join("")));
  }
  return out.slice(0, 4);
};
const ordxCards = (lvl: number) => lvl >= 4;
const ordxShow = (lvl: number, x: number) => (lvl >= 4 ? indian(x) : String(x));
const ordxAnswer = ([lvl, seed, dir]: number[]) => {
  const xs = ordxNums(lvl, seed);
  const idx = [0, 1, 2, 3].sort((a, b) => (dir === 0 ? xs[a] - xs[b] : xs[b] - xs[a]));
  return ordxCards(lvl) ? idx.map((i) => i + 1) : idx.map((i) => xs[i]);
};
const signPair = (lvl: number, seed: number): [number, number] => {
  const h = (s: string) => hm(`sg${lvl}:${seed}:${s}`);
  if (lvl === 0) {
    const a = 1 + (h("a") % 9);
    return [a, h("eq") % 4 === 0 ? a : 1 + (h("b") % 9)];
  }
  if (lvl === 1) {
    const a = 100 + (h("a") % 101);
    if (h("eq") % 6 === 0) return [a, a];
    const b = h("near") % 2 ? a + 1 + (h("d") % 9) : 100 + (h("b") % 101);
    return [a, b > 200 ? a - 1 - (h("d") % 9) : b];
  }
  const D = [0, 3, 3, 4, 6][lvl];
  const lo = 10 ** (D - 1);
  const a = lo + (h("a") % (9 * lo));
  if (h("eq") % 6 === 0) return [a, a];
  const s = String(a).split("").map(Number);
  const pos = h("pos") % D;
  let nd = (s[pos] + 1 + (h("nd") % 9)) % 10;
  if (pos === 0 && nd === 0) nd = s[0] === 9 ? 8 : 9;
  s[pos] = nd;
  return [a, Number(s.join(""))];
};
const SIGNS = ["<", ">", "="];
const signChoices = ([lvl, seed]: number[]) => shuffleBy(SIGNS, `sgc:${lvl}:${seed}`);
const signOf = (a: number, b: number) => (a < b ? "<" : a > b ? ">" : "=");
const digmaxDigits = ([n, seed, , z]: number[]) => {
  const pool = shuffleBy([1, 2, 3, 4, 5, 6, 7, 8, 9], `dm:${n}:${seed}:${z}`).slice(0, z ? n - 1 : n);
  return shuffleBy(z ? [...pool, 0] : pool, `dms:${n}:${seed}:${z}`);
};
const digmaxOf = (ds: number[], greatest: boolean) => {
  const s = [...ds].sort((a, b) => (greatest ? b - a : a - b));
  if (!greatest && s[0] === 0) {
    const k = s.findIndex((d) => d !== 0);
    [s[0], s[k]] = [s[k], s[0]];
  }
  return Number(s.join(""));
};
const passNums = (n: number, seed: number) => shuffleBy([...Array(90)].map((_, i) => 10 + i), `ps:${n}:${seed}`).slice(0, n);
const bubble = (xs: number[], passes: number, fromRight = false) => {
  const a = [...xs];
  for (let p = 0; p < passes; p++) {
    if (fromRight) {
      for (let i = a.length - 1; i > 0; i--) if (a[i - 1] > a[i]) [a[i - 1], a[i]] = [a[i], a[i - 1]];
    } else for (let i = 0; i + 1 < a.length; i++) if (a[i] > a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  }
  return a;
};

// ---- story problems and number sentences
const twoDigitsOk = (a: number, b: number, carry: boolean) => {
  let c = false;
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) if ((x % 10) + (y % 10) > 9) c = true;
  return c === carry;
};
const noBorrow = (a: number, b: number) => {
  for (let x = a, y = b; y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) if (x % 10 < y % 10) return false;
  return true;
};
const storyNums = (op: number, lvl: number, seed: number): [number, number] => {
  const h = (s: string) => hm(`st${op}:${lvl}:${seed}:${s}`);
  for (let t = 0; t < 500; t++) {
    if (op === 0) {
      const a = lvl === 2 ? 100 + (h(`a${t}`) % 800) : 11 + (h(`a${t}`) % 78);
      const b = lvl === 2 ? 100 + (h(`b${t}`) % 800) : 10 + (h(`b${t}`) % 78);
      if (lvl === 0 && a + b <= 99 && twoDigitsOk(a, b, false)) return [a, b];
      if (lvl === 1 && a + b <= 99 && twoDigitsOk(a, b, true)) return [a, b];
      if (lvl === 2 && a + b <= 999 && twoDigitsOk(a, b, true)) return [a, b];
    } else {
      const a = lvl === 2 ? 200 + (h(`a${t}`) % 800) : 21 + (h(`a${t}`) % 79);
      const b = lvl === 2 ? 100 + (h(`b${t}`) % 800) : 10 + (h(`b${t}`) % 79);
      if (b >= a) continue;
      if (lvl === 0 && noBorrow(a, b)) return [a, b];
      if (lvl >= 1 && !noBorrow(a, b)) return [a, b];
    }
  }
  return [0, 0];
};
const digitwise = (a: number, b: number, f: (x: number, y: number) => number) => {
  let r = 0;
  for (let x = a, y = b, p = 1; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10), p *= 10) r += f(x % 10, y % 10) * p;
  return r;
};
const ADD_STORIES = [
  (a: number, b: number, P: string, Q: string) => `${P} collects ${a} shells on Marina beach and ${Q} collects ${b} shells. How many shells do they collect altogether?`,
  (a: number, b: number) => `A bus has ${a} passengers. At the next stop ${b} more passengers get on and nobody gets off. How many passengers are on the bus now?`,
  (a: number, b: number) => `A school library has ${a} Tamil books and ${b} English books. How many books are there altogether?`,
  (a: number, b: number, P: string) => `${P} sold ${a} jasmine garlands in the morning and ${b} in the evening. How many garlands did ${P} sell in all?`,
];
const SUB_STORIES = [
  (a: number, b: number, P: string, Q: string) => `${P} had ${a} marbles and gave ${b} of them to ${Q}. How many marbles does ${P} have left?`,
  (a: number, b: number) => `A fruit seller had ${a} mangoes. ${b} mangoes were sold. How many mangoes are left?`,
  (a: number, b: number) => `There were ${a} birds on a big banyan tree. ${b} birds flew away. How many birds are still on the tree?`,
  (a: number, b: number) => `A stationery shop had ${a} notebooks. It sold ${b} of them. How many notebooks are left?`,
];
const SEN_ADD: [string, string, string][] = [["parrots", "sit on a tree", "more parrots come and sit with them"], ["ducks", "swim in a pond", "more ducks join them"], ["boats", "are at the shore", "more boats come in"], ["flowers", "are in a vase", "more flowers are put in"]];
const senAddChoices = ([a, b, c]: number[]) => {
  const R = `${a} + ${b} = ${a + b}`;
  const take = `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)}`;
  const off = `${a} + ${b} = ${a + b + 1}`;
  const third = a !== b ? `${a} + ${a} = ${2 * a}` : `${a} + ${b} = ${a + b - 1}`;
  return { list: shuffleBy([R, take, off, third], `sa:${a}:${b}:${c}`), R, take, off };
};
const SEN_SUB = [
  (a: number, b: number, P: string) => `${P} has ${a} balloons. ${b} balloons burst. Which number sentence shows how many balloons are left?`,
  (a: number, b: number, P: string) => `There are ${a} laddus on a plate. ${P} eats ${b} of them. Which number sentence shows how many laddus are left?`,
  (a: number, b: number) => `${a} crows sit on a wall. ${b} crows fly away. Which number sentence shows how many crows are still on the wall?`,
  (a: number, b: number) => `A box has ${a} crayons. ${b} crayons are lost. Which number sentence shows how many crayons are left?`,
];
const senSubChoices = ([a, b, c]: number[]) => {
  const R = `${a} − ${b} = ${a - b}`;
  const added = `${a} + ${b} = ${a + b}`;
  const swapped = `${b} − ${a} = ${a - b}`;
  const off = `${a} − ${b} = ${a - b + 1}`;
  return { list: shuffleBy([R, added, swapped, off], `ss:${a}:${b}:${c}`), R, added, swapped, off };
};

// ---- calendar: order of days and months, seasons, dates, ages
const STEPK = [1, 2, 3, -1, -2, -3];
const weekChoices = ([kind, i, k]: number[]) => {
  const L = kind === 0 ? DAYS : MONTHS;
  const n = L.length;
  if (kind === 2) {
    const R = MONTHS[i];
    const extra = MONTHS[mod(i + 1, 12)];
    const cands = [R, extra, MONTHS[mod(i - 1, 12)], MONTHS[mod(i + 6, 12)]];
    return { list: shuffleBy(cands, `wk2:${i}`), R, opp: null as string | null, extra };
  }
  const s = STEPK[k];
  const sg = Math.sign(s);
  const R = L[mod(i + s, n)];
  const opp = L[mod(i - s, n)];
  const extra = L[mod(i + s + sg, n)];
  const cands = [...new Set([R, opp, extra, L[mod(i + s - sg, n)], L[mod(i + 2 * s, n)], L[mod(i + s + 2 * sg, n)], L[mod(i + s - 2 * sg, n)]])].filter((x) => x !== L[i] || Math.abs(s) > 1);
  const four = [R, ...cands.filter((x) => x !== R)].slice(0, 4);
  return { list: shuffleBy(four, `wk:${kind}:${i}:${k}`), R, opp: opp !== R ? opp : null, extra: extra !== R ? extra : null };
};
const SEASONS: [string, number[]][] = [["Winter", [0, 1]], ["Summer", [2, 3, 4]], ["Monsoon (rainy season)", [5, 6, 7, 8]], ["Post-monsoon", [9, 10, 11]]];
const SEASON_OF = [0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3];
const seasonChoices = (p: number[]) => shuffleBy(SEASONS.map((s) => s[0]), `sea:${p.join(",")}`);
const seasonTable = (): Visual => table(["Season", "Months"], SEASONS.map(([s, ms]) => [s, ms.map((m) => MONTHS[m]).join(", ")]));
const seasonWant = ([kind, m, k]: number[]) => (kind === 0 ? SEASON_OF[m] : kind === 1 ? SEASON_OF[mod(m + k, 12)] : mod(m + (k ? -1 : 1), 4));
const ddmm = (d: number, m: number, y: number) => `${pad2(d)}/${pad2(m + 1)}/${y}`;
const ddmmYear = (m: number, d: number) => 2025 + ((m + d) % 3);
const ddmmChoices = ([kind, m, d]: number[]) => {
  const y = ddmmYear(m, d);
  const m2 = m <= 10 ? m + 1 : m - 1;
  if (kind === 0) {
    const R = ddmm(d, m, y);
    const SW = `${pad2(m + 1)}/${pad2(d)}/${y}`;
    const MO = ddmm(d, m2, y);
    const DO = ddmm(d < 28 ? d + 1 : d - 1, m, y);
    return { list: shuffleBy([R, SW, MO, DO], `dd0:${m}:${d}`), R, SW, MO };
  }
  const R = `${d} ${MONTHS[m]} ${y}`;
  const SW = `${m + 1} ${MONTHS[d - 1]} ${y}`;
  const MO = `${d} ${MONTHS[m2]} ${y}`;
  const DO = `${d < 28 ? d + 1 : d - 1} ${MONTHS[m]} ${y}`;
  return { list: shuffleBy([R, SW, MO, DO], `dd1:${m}:${d}`), R, SW, MO };
};
const ageToday = ([, bm, tm, dd]: number[]) => ({ td: tm === bm ? (dd ? 25 : 5) : 10 + dd, bd: 15 });
const dayChoices = ([yr, m, d]: number[]) => {
  const w = utcDay(2026 + yr, m, d);
  return { list: shuffleBy([DAYS[w], DAYS[mod(w + 1, 7)], DAYS[mod(w - 1, 7)], DAYS[mod(w + 3, 7)]], `dy:${yr}:${m}:${d}`), w };
};
const cellOf = (yr: number, m: number, d: number) => {
  const c = firstDay(yr, m) + d - 1;
  return { row: Math.floor(c / 7), col: c % 7 };
};
const CALMOVE: [number, number][] = [[1, 0], [1, 1], [1, -1], [-1, 0]];

// ---- money, tens, number names, units
const WAYS_D = [[20, 10, 5, 2, 1], [500, 200, 100, 50, 20, 10, 5, 2, 1]];
const collCache = new Map<string, number[][]>();
const collsOf = (lvl: number, N: number) => {
  const key = `${lvl}:${N}`;
  if (collCache.has(key)) return collCache.get(key)!;
  const ds = WAYS_D[lvl];
  const max = lvl ? 6 : 5;
  const out: number[][] = [];
  const rec = (i: number, acc: number[], t: number) => {
    if (t === N && acc.length >= 2) out.push(acc);
    if (t >= N || acc.length === max) return;
    for (let j = i; j < ds.length; j++) if (t + ds[j] <= N) rec(j, [...acc, ds[j]], t + ds[j]);
  };
  rec(0, [], 0);
  collCache.set(key, out);
  return out;
};
const moneyStr = (xs: number[]) => [...xs].sort((a, b) => b - a).map((x) => `₹${x}`).join(" + ");
const waysOf = (lvl: number, seed: number) => {
  const h = (s: string) => hm(`wy${lvl}:${seed}:${s}`);
  const N = lvl ? 50 + 5 * (h("N") % 91) : 6 + (h("N") % 15);
  const cs = collsOf(lvl, N);
  if (cs.length < 2) return null;
  const s = h("s") % cs.length;
  let r = h("r") % (cs.length - 1);
  if (r >= s) r++;
  const shown = cs[s];
  const right = cs[r];
  const variants = (xs: number[]) => {
    const out: string[] = [];
    xs.forEach((x, j) => {
      for (const d of WAYS_D[lvl]) if (d !== x) {
        const y = [...xs];
        y[j] = d;
        if (y.reduce((a, b) => a + b, 0) !== N) out.push(moneyStr(y));
      }
    });
    return [...new Set(out)];
  };
  const R = moneyStr(right);
  const vs = variants(shown).filter((x) => x !== R);
  const same = vs.length ? vs[h("v") % vs.length] : null;
  const rv = variants(right).filter((x) => x !== same && x !== R);
  if (!same || rv.length < 2) return null;
  const w2 = rv[h("w2") % rv.length];
  const rest = rv.filter((x) => x !== w2);
  const w3 = rest[h("w3") % rest.length];
  return { N, shown, R, same, w2, w3, list: shuffleBy([R, same, w2, w3], `wyc:${lvl}:${seed}`) };
};
const sumStr = (s: string) => (s.match(/₹(\d+)/g) ?? []).reduce((t, x) => t + Number(x.slice(1)), 0);
const bundRows = (rows: number, seed: number) => [...Array(rows)].map((_, i) => 5 + (hm(`bd${rows}:${seed}:${i}`) % 7));
const nameChoices = (n: number) => {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const R = words(n);
  const rev = o !== 0 && o !== t ? words(10 * o + t) : null;
  const teen = n >= 13 && n <= 19 ? words(10 * o) : o === 0 && t >= 2 ? words(10 + t) : null;
  const digit = `${ONES[t] || "zero"} ${ONES[o] || "zero"}`;
  const off = words(n + 10 <= 99 ? n + 10 : n - 10);
  const cands = [R, ...[rev, teen, digit, off, words(n + 1)].filter((x): x is string => !!x && x !== R)];
  const four = [...new Set(cands)].slice(0, 4);
  return { list: shuffleBy(four, `nm:${n}`), R, rev, teen, digit };
};
const SPAN_OBJ: [string, string][] = [["table", "bench"], ["door", "window"], ["mat", "rope"]];
const SPAN_UNIT: [string, string, string][] = [["paper clip", "matchstick", "ribbon"], ["hand span", "pencil", "bench"], ["pen", "pencil", "desk"]];
const SPAN_PL: Record<string, string> = { "paper clip": "paper clips", matchstick: "matchsticks", "hand span": "hand spans", pencil: "pencils", pen: "pens" };
const spanChoices = ([kind, a, b, c]: number[]) =>
  shuffleBy(kind === 0 ? [`the ${SPAN_OBJ[c][0]}`, `the ${SPAN_OBJ[c][1]}`, "both are the same length"] : [`a ${SPAN_UNIT[c][0]}`, `a ${SPAN_UNIT[c][1]}`, "both are the same length"], `sp:${kind}:${a}:${b}:${c}`);
const spanWant = ([kind, a, b, c]: number[]) =>
  kind === 0 ? (a > b ? `the ${SPAN_OBJ[c][0]}` : a < b ? `the ${SPAN_OBJ[c][1]}` : "both are the same length") : a < b ? `a ${SPAN_UNIT[c][0]}` : a > b ? `a ${SPAN_UNIT[c][1]}` : "both are the same length";
const weaveSeq = (o: number, u: number, n: number) => [...Array(n)].map((_, i) => (i % (o + u) < o ? "over" : "under"));

const GAP01: Def[] = [
  // ================================================================ MATH.geometry.positions: inside/outside, near/far, in front of/behind
  {
    id: "aawhere",
    arity: 3,
    title: "Inside or outside, near or far, in front of or behind",
    competency: POS,
    type: "choice",
    // [kind, seed, ask]: kind 0 inside/outside a fence (ask 0 the one inside, 1 the one outside); kind 1 near/far from a house (ask 0 nearest, 1 farthest); kind 2 a queue (ask 0 just in front of, 1 just behind)
    parse: none,
    reject: guard([[0, 2], [0, 39], [0, 1]], () => true, "A picture of a fence, a road or a queue."),
    prompt: ([kind, seed, ask]) => {
      const w = whereOf(kind, seed, ask);
      return kind === 0
        ? `The square in the picture is a fence, and the dots are animals. Which animal is ${ask ? "outside" : "inside"} the fence?`
        : kind === 1
          ? `In the picture, the house is at the left end of a straight road, and three places are along the road. Which place is ${ask ? "farthest from" : "nearest to"} the house?`
          : `Children stand in a queue at the ticket counter, as in the picture. The child at the front is next to the counter. Who stands just ${ask ? "behind" : "in front of"} ${w.x}?`;
    },
    choices: whereChoices,
    solve: (p) => {
      const w = whereOf(p[0], p[1], p[2]);
      return { steps: [st("look", "find the position", POS, [["inside/outside", "near/far", "in front/behind"][p[0]]], w.right)], answer: whereChoices(p).indexOf(w.right) };
    },
    // independent: kind 0 counts how many fence sides a line from the animal to the right crosses (odd = inside);
    // kind 1 measures straight-line distances; kind 2 counts the children between each child and the counter
    validate: (p, v) => {
      const [kind, seed, ask] = p;
      const cs = whereChoices(p);
      if (typeof v !== "number" || !cs[v]) return false;
      const w = whereOf(kind, seed, ask);
      if (kind === 0) {
        const inside = (x: number, y: number) => [1, 5].filter((sx) => sx > x && y > 1 && y < 5).length % 2 === 1;
        const pt = w.pts.find((q) => q[2] === cs[v])!;
        const others = w.pts.filter((q) => q[2] !== cs[v]);
        const want = ask === 0;
        return inside(pt[0], pt[1]) === want && others.every((q) => inside(q[0], q[1]) !== want);
      }
      if (kind === 1) {
        const d = (q: [number, number, string]) => Math.hypot(q[0] - 0, q[1] - 3);
        const pt = w.pts.find((q) => q[2] === cs[v])!;
        return w.pts.slice(1).every((q) => q === pt || (ask ? d(q) < d(pt) : d(q) > d(pt)));
      }
      const ahead = (n: string) => w.names.indexOf(n);
      return ahead(cs[v]) - ahead(w.x!) === (ask ? 1 : -1);
    },
    bugs: (p) => {
      const [kind, seed, ask] = p;
      const cs = whereChoices(p);
      const w = whereOf(kind, seed, ask);
      if (kind === 0)
        return [bug("inside-outside", "conceptual", POS, `An animal ${ask ? "inside" : "outside"} the fence was chosen. Inside means within the four sides of the fence; outside means beyond them.`, ixs(cs, w.names.filter((n) => n !== w.right)))];
      if (kind === 1) return [bug("near-far", "conceptual", POS, `The place ${ask ? "nearest to" : "farthest from"} the house was chosen. ${ask ? "Far" : "Near"} means ${ask ? "a long" : "a short"} way from the house.`, ix(cs, w.other))];
      return [bug("front-behind", "conceptual", POS, `The child just ${ask ? "in front of" : "behind"} ${w.x} was chosen. In front of means nearer the counter; behind means further back in the queue.`, ix(cs, w.other))];
    },
    variants: () => [],
    explain: (s) => `Look at the picture: the answer is ${s.value}.`,
    domain: [[0, 2], [0, 39], [0, 1]],
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 ? 2 : 3),
    figure: whereFig,
    word: ([kind, seed, ask]) => {
      const w = whereOf(kind, seed, ask);
      return kind === 0
        ? `${nm(seed)}'s grandfather keeps his animals in a fenced yard, shown as the square in the picture. ${ask ? "One animal has got out of the fence." : "Only one animal is still inside the fence; the others have wandered out."} Which animal is ${ask ? "outside" : "inside"} the fence?`
        : kind === 1
          ? `${nm(seed)} walks from home along the road in the picture. Which place does ${nm(seed)} reach ${ask ? "last, because it is farthest away" : "first, because it is nearest"}?`
          : `At the railway station, children wait in a queue to buy tickets, as in the picture. Who is just ${ask ? "behind" : "in front of"} ${w.x}?`;
    },
    teach: {
      idea: "Position words tell where a thing is compared with something else: inside or outside a fence, near to or far from a house, in front of or behind a person.",
      method: "First find the thing you compare with (the fence, the house, the child named). Then look where the other things are from it.",
      visual: whereFig,
      alternatives: [
        { id: "act", title: "Act it out", kind: "conceptual", text: ["Stand inside a chalk circle, then step outside it.", "Line up with friends: the friend nearer the door is in front of you, the one further back is behind you."], visual: () => table(["", "front", "", "back"], [["door", "Anu", "you", "Ravi"]]) },
      ],
    },
    limits: "A square fence with four animals, three places along a straight road, and a queue of five children; above/below and left/right are other families.",
  },

  // ================================================================ MATH.number.compare-numbers: groups, objects, larger numbers
  {
    id: "aagrp",
    arity: 4,
    title: "Which group has more or fewer, or are they the same",
    competency: CMP,
    type: "choice",
    // [a, b, mode, ask]: mode 0 two plates of a and b things in a picture (ask 0 more, 1 fewer); mode 1 the numerals a and b (more, less or equal)
    parse: none,
    reject: guard([[1, 9], [1, 9], [0, 1], [0, 1]], ([, , mode, ask]) => mode === 0 || ask === 0, "Two groups or two numbers up to 9."),
    prompt: ([a, b, mode, ask]) =>
      mode === 0
        ? `Look at the ${GRP_ITEMS[(a * b) % 3]} on the two plates in the picture. Which plate has ${ask ? "fewer" : "more"} ${GRP_ITEMS[(a * b) % 3]}? If they have the same number, choose that.`
        : `Compare the numbers ${a} and ${b}. Which sentence is true?`,
    choices: grpChoices,
    solve: (p) => {
      const g = grpWords(p);
      const [a, b] = p;
      const r = a > b ? g.first : a < b ? g.second : g.same;
      return { steps: [st("compare", "compare", CMP, [a, b], r)], answer: grpChoices(p).indexOf(r) };
    },
    // independent: match the two groups one to one, taking one from each until a group runs out
    validate: (p, v) => {
      let [x, y] = p;
      while (x > 0 && y > 0) {
        x--;
        y--;
      }
      const g = grpWords(p);
      return grpChoices(p)[v as number] === (x > 0 ? g.first : y > 0 ? g.second : g.same);
    },
    bugs: (p) => {
      const [a, b, mode, ask] = p;
      const cs = grpChoices(p);
      const g = grpWords(p);
      if (a === b) return [bug("one-must-win", "conceptual", CMP, "One of them was chosen, but every one can be matched with one on the other side and none are left over: they are the same.", ixs(cs, [g.first, g.second]))];
      return [
        bug("opposite", "conceptual", CMP, mode === 0 ? `The plate with ${ask ? "more" : "fewer"} was chosen. ${ask ? "Fewer means the smaller group, the one that runs out first when you match them." : "More means the bigger group, the one with some left over when you match them."}` : "More and less were mixed up. The number that comes later when counting is more.", ix(cs, a > b ? g.second : g.first)),
      ];
    },
    variants: () => [],
    explain: (s) => `Match them one to one: ${s.value}.`,
    domain: [[1, 9], [1, 9], [0, 1], [0, 1]],
    difficulty: ([a, b, mode]) => (mode === 0 && Math.abs(a - b) >= 3 ? 1 : a === b || Math.abs(a - b) === 1 ? 3 : 2),
    figure: ([a, b, mode]) => (mode === 0 ? { type: "pictograph", labels: [`${nm(a + 2 * b)}'s plate`, `${nm(a + 2 * b + 1)}'s plate`], counts: [a, b], key: 1 } : table(["First number", "Second number"], [[a, b]])),
    word: ([a, b, mode, ask]) =>
      mode === 0
        ? `${nm(a + 2 * b)} and ${nm(a + 2 * b + 1)} each take some ${GRP_ITEMS[(a * b) % 3]} at a function, as in the picture. Whose plate has ${ask ? "fewer" : "more"}? If both have the same number, choose that.`
        : `${nm(a + 2 * b)} has ${nOf(a, "stickers")} and ${nm(a + 2 * b + 1)} has ${nOf(b, "stickers")}. Which sentence is true about the numbers ${a} and ${b}?`,
    teach: {
      idea: "To compare two groups without counting, match them one to one: the group with some left over has more; if none are left over they are the same.",
      method: "Pair one thing from the first group with one from the second, again and again. Look at what is left.",
      visual: ([a, b]) => ({ type: "pictograph", labels: ["first", "second"], counts: [a, b], key: 1 }),
      alternatives: [
        { id: "line", title: "Longer row", kind: "conceptual", text: ["Put the two groups in rows, one under the other, with the same gaps.", "The row that sticks out further has more; rows that end together are the same."], visual: ([a, b]) => ({ type: "bars", labels: ["first", "second"], values: [a, b] }) },
      ],
    },
    limits: "Groups and numbers up to 9, including equal groups; larger numbers are in aacmp and aasign.",
  },
  {
    id: "aabig",
    arity: 3,
    title: "Which of two things is bigger or smaller",
    competency: CMP,
    type: "choice",
    // [i, j, ask]: BIGS[i] is smaller than BIGS[j] (at least two steps apart); ask 0 which is bigger, 1 smaller
    parse: none,
    reject: guard([[0, 10], [0, 10], [0, 1]], ([i, j]) => j - i >= 2, "Two everyday things of clearly different size."),
    prompt: (p) => {
      const [x, y] = bigPair(p);
      return `Think of ${x} and ${y}. Which is ${p[2] ? "smaller" : "bigger"}?`;
    },
    choices: bigPair,
    solve: (p) => {
      const [i, j, ask] = p;
      const r = BIGS[ask ? i : j][0];
      return { steps: [st("compare", "compare sizes", CMP, [BIGS[i][0], BIGS[j][0]], r)], answer: bigPair(p).indexOf(r) };
    },
    // independent: compare their usual lengths in centimetres
    validate: (p, v) => {
      const cs = bigPair(p);
      const size = (n: string) => BIGS.find((b) => b[0] === n)![1];
      const other = cs[1 - (v as number)];
      return typeof v === "number" && !!cs[v] && (p[2] ? size(cs[v]) < size(other) : size(cs[v]) > size(other));
    },
    bugs: (p) => [bug("opposite", "conceptual", CMP, `The ${p[2] ? "bigger" : "smaller"} one was chosen. ${p[2] ? "Smaller means it takes up less room." : "Bigger means it takes up more room."}`, bigPair(p).indexOf(BIGS[p[2] ? p[1] : p[0]][0]))],
    variants: () => [],
    explain: (s) => `${s.value} is the one asked for.`,
    domain: [[0, 10], [0, 10], [0, 1]],
    difficulty: ([i, j]) => (j - i >= 5 ? 1 : j - i >= 3 ? 2 : 3),
    word: (p) => {
      const [x, y] = bigPair(p);
      return `${nm(p[0] + p[1])} thinks about ${x} and ${y}, and which of them would need the ${p[2] ? "smaller" : "bigger"} box to be packed in. Which one is ${p[2] ? "smaller" : "bigger"}?`;
    },
    teach: {
      idea: "Big and small compare how much room things take: an elephant is bigger than a cat, an ant is smaller than a lemon.",
      method: "Picture the two things side by side. The one that takes up more room is bigger; the other is smaller.",
      visual: ([i, j]) => ({ type: "bars", labels: [BIGS[i][0], BIGS[j][0]], values: [1, 3] }),
      alternatives: [
        { id: "hands", title: "Hold it or not", kind: "conceptual", text: ["Ask: can it sit on my hand? Can I carry it? Could I sit in it?", "A thing that fits in a smaller place is smaller."] },
      ],
    },
    limits: "Pairs of familiar things whose sizes are clearly different; comparing groups is aagrp.",
  },
  {
    id: "aaordx",
    arity: 3,
    title: "Ordering numbers from 9 up to crores, ascending or descending",
    competency: CMP,
    type: "tuple",
    mc: true,
    // [lvl, seed, dir]: lvl 0 one-digit, 1 up to 200, 2 up to 500, 3 up to 999, 4 four-digit, 5 lakhs, 6 crores (lvl 4–6 on numbered cards); dir 0 ascending, 1 descending
    parse: none,
    reject: guard([[0, 6], [0, 29], [0, 1]], ([lvl, seed, dir]) => {
      const xs = ordxNums(lvl, seed);
      const sorted = [...xs].sort((a, b) => (dir ? b - a : a - b));
      return xs.length === 4 && sorted.join() !== xs.join();
    }, "Four different numbers of the level's size, not already in the order asked for."),
    prompt: ([lvl, seed, dir]) => {
      const order = dir ? "descending order (from the greatest to the smallest)" : "ascending order (from the smallest to the greatest)";
      return ordxCards(lvl)
        ? `The four cards in the picture show numbers. Put the numbers in ${order}. Write the card numbers (1 to 4) in that order, with commas between them.`
        : `Put these numbers in ${order}: ${list(ordxNums(lvl, seed))}. Write them in that order, with commas between them.`;
    },
    solve: (p) => {
      const a = list(ordxAnswer(p));
      return { steps: [st("compare", "compare digits from the left", CMP, ordxNums(p[0], p[1]), a), st("order", "order", CMP, [p[2]], a)], answer: a };
    },
    // independent: each number must come before the next by a digit-by-digit comparison from the left
    validate: ([lvl, seed, dir], v) => {
      const xs = ordxNums(lvl, seed);
      const got = readList(v);
      if (!got || got.length !== 4) return false;
      const vals = ordxCards(lvl) ? (isPermOf(got, 4) ? got.map((g) => xs[g - 1]) : null) : got;
      if (!vals || [...vals].sort((a, b) => a - b).join() !== [...xs].sort((a, b) => a - b).join()) return false;
      for (let i = 1; i < 4; i++) if (cmpDigits(vals[i - 1], vals[i]) !== (dir ? 1 : -1)) return false;
      return true;
    },
    bugs: ([lvl, seed, dir]) => {
      const xs = ordxNums(lvl, seed);
      const right = ordxAnswer([lvl, seed, dir]);
      const asText = [0, 1, 2, 3].sort((a, b) => (dir ? (String(xs[b]) < String(xs[a]) ? -1 : 1) : String(xs[a]) < String(xs[b]) ? -1 : 1));
      const text = list(ordxCards(lvl) ? asText.map((i) => i + 1) : asText.map((i) => xs[i]));
      return [
        bug("reversed", "procedural", CMP, `The order was turned round. ${dir ? "Descending starts with the greatest number." : "Ascending starts with the smallest number."}`, list([...right].reverse())),
        bug("digits-before-length", "conceptual", CMP, "The numbers were compared by their first digits only, without first counting how many digits each has. A number with more digits is greater.", text !== list(right) ? text : null),
        bug("card-order", "procedural", CMP, "The card numbers were written in counting order. The order comes from the numbers on the cards.", ordxCards(lvl) && list([1, 2, 3, 4]) !== list(right) ? list([1, 2, 3, 4]) : null),
      ];
    },
    distractors: (p) => swaps(ordxAnswer(p)),
    variants: () => [],
    explain: (s) => (s.id === "compare" ? "Compare the numbers: first count the digits, then compare place by place from the left." : `In order: ${s.value}.`),
    domain: [[0, 6], [0, 29], [0, 1]],
    grade: ([lvl, seed]) => digitGrade(Math.max(...ordxNums(lvl, seed))),
    difficulty: ([lvl]) => (lvl <= 1 ? 1 : lvl <= 3 ? 2 : 3),
    figure: ([lvl, seed]) => (ordxCards(lvl) ? table(["Card 1", "Card 2", "Card 3", "Card 4"], [ordxNums(lvl, seed).map((x) => ordxShow(lvl, x))]) : table(["Numbers"], [[list(ordxNums(lvl, seed))]])),
    word: ([lvl, seed, dir]) =>
      ordxCards(lvl)
        ? `The cards in the picture show the ${lvl === 4 ? "number of visitors to four museums last year" : lvl === 5 ? "populations of four towns in Tamil Nadu" : "money (in rupees) four companies earned"}. Arrange them in ${dir ? "descending order (greatest first)" : "ascending order (smallest first)"}. Write the card numbers with commas.`
        : `${nm(seed + lvl)} notes the number of ${lvl === 0 ? "goals scored in four matches" : "tickets sold on four days at a fair"}: ${list(ordxNums(lvl, seed))}. Write them in ${dir ? "descending order (greatest first)" : "ascending order (smallest first)"}, with commas.`,
    teach: {
      idea: "A number with more digits is greater. When two numbers have the same number of digits, the first place from the left where their digits differ decides.",
      method: "Count the digits of each number. For numbers with the same count, compare the highest place, then the next, until a digit differs. Then write them in the order asked.",
      visual: ([lvl, seed]) => table(["Number", "Digits"], ordxNums(lvl, seed).map((x) => [ordxShow(lvl, x), String(x).length])),
      alternatives: [
        { id: "place_chart", title: "A place value chart", kind: "procedural", text: ["Write each number in a place value chart, lining up the ones.", "Read down the highest column first: the biggest digit there is the greatest number."], visual: ([lvl, seed]) => table(["Number"], ordxNums(lvl, seed).map((x) => [ordxShow(lvl, x)])) },
      ],
    },
    limits: "Four numbers at a time, from one digit to eight digits (crores), in ascending or descending order; numbers of four or more digits are on numbered cards with Indian commas.",
  },
  {
    id: "aasign",
    arity: 2,
    title: "Comparing two numbers with <, > or =",
    competency: CMP,
    type: "choice",
    // [lvl, seed]: lvl 0 up to 9, 1 up to 200, 2 three-digit, 3 four-digit, 4 lakhs (six digits)
    parse: none,
    reject: guard([[0, 4], [0, 39]], ([lvl, seed]) => ![...Array(seed).keys()].some((s0) => signPair(lvl, s0).join() === signPair(lvl, seed).join()), "Two numbers of the level's size, not a pair an earlier seed already gives."),
    prompt: ([lvl, seed]) => {
      const [a, b] = signPair(lvl, seed);
      return `Which sign goes in the box: ${indian(a)} ☐ ${indian(b)}? Choose <, > or =.`;
    },
    choices: signChoices,
    solve: (p) => {
      const [a, b] = signPair(p[0], p[1]);
      return { steps: [st("compare", "compare", CMP, [a, b], signOf(a, b))], answer: signChoices(p).indexOf(signOf(a, b)) };
    },
    // independent: count digits, then find the first place from the left where the digits differ
    validate: (p, v) => {
      const [a, b] = signPair(p[0], p[1]);
      return signChoices(p)[v as number] === ["<", "=", ">"][cmpDigits(a, b) + 1];
    },
    bugs: (p) => {
      const [a, b] = signPair(p[0], p[1]);
      const cs = signChoices(p);
      const r = signOf(a, b);
      const ones = signOf(a % 10, b % 10);
      return [
        bug("sign-reversed", "conceptual", CMP, "The sign points the wrong way. The open side of < or > faces the greater number.", r === "=" ? null : cs.indexOf(r === "<" ? ">" : "<")),
        bug("last-digit", "conceptual", CMP, "Only the ones digits were compared. Compare from the left: the highest place where the digits differ decides.", a !== b && ones !== r && ones !== "=" ? cs.indexOf(ones) : null),
      ];
    },
    variants: () => [],
    explain: (s) => `${indian(Number(s.inputs[0]))} ${s.value} ${indian(Number(s.inputs[1]))}`,
    domain: [[0, 4], [0, 39]],
    grade: ([lvl, seed]) => digitGrade(Math.max(...signPair(lvl, seed))),
    difficulty: ([lvl]) => (lvl === 0 ? 1 : lvl <= 2 ? 2 : 3),
    figure: ([lvl, seed]) => table(["First number", "", "Second number"], [[indian(signPair(lvl, seed)[0]), "☐", indian(signPair(lvl, seed)[1])]]),
    word: ([lvl, seed]) => {
      const [a, b] = signPair(lvl, seed);
      return `${nm(seed)}'s village has ${lvl === 0 ? nOf(a, "wells") : `${indian(a)} people`} and ${nm(seed + 1)}'s village has ${indian(b)}. Which sign makes "${indian(a)} ☐ ${indian(b)}" true?`;
    },
    teach: {
      idea: "< means 'is less than' and > means 'is greater than'; the open side faces the greater number. = means the two are the same.",
      method: "Count the digits; more digits is greater. With the same number of digits, compare from the left until the digits differ.",
      visual: () => table(["", "", ""], [["3", "<", "5"], ["9", ">", "4"], ["6", "=", "6"]]),
      alternatives: [
        { id: "crocodile", title: "The hungry crocodile", kind: "conceptual", text: ["Think of < and > as a crocodile's open mouth.", "It always opens towards the bigger number, because it wants to eat more."], visual: () => table(["", "", ""], [["2", "<", "7"]]) },
      ],
    },
    limits: "Two whole numbers from one digit to six digits (lakhs), often differing in one place only; equal pairs are included.",
  },
  {
    id: "aadigmax",
    arity: 4,
    title: "The greatest or smallest number made from given digits",
    competency: CMP,
    type: "integer",
    mc: true,
    // [n, seed, ask, z]: n different digits (z 1: one of them is 0); ask 0 greatest, 1 smallest n-digit number
    parse: none,
    reject: guard([[3, 7], [0, 19], [0, 1], [0, 1]], () => true, "Three to seven different digits."),
    prompt: (p) => `Use each of the digits ${list(digmaxDigits(p))} exactly once to make the ${p[2] ? "smallest" : "greatest"} ${p[0]}-digit number. Write it without commas.`,
    solve: (p) => {
      const a = digmaxOf(digmaxDigits(p), p[2] === 0);
      return { steps: [st("arrange", p[2] ? "smallest digit first (not 0)" : "biggest digit first", CMP, digmaxDigits(p), a)], answer: a };
    },
    // independent: try every arrangement of the digits that does not start with 0 and keep the greatest (smallest)
    validate: (p, v) => {
      const ds = digmaxDigits(p);
      let best: number | null = null;
      const rec = (left: number[], acc: string) => {
        if (!left.length) {
          if (acc[0] === "0") return;
          const x = Number(acc);
          if (best === null || (p[2] ? x < best : x > best)) best = x;
          return;
        }
        left.forEach((d, i) => rec([...left.slice(0, i), ...left.slice(i + 1)], acc + d));
      };
      rec(ds, "");
      return v === best;
    },
    bugs: (p) => {
      const ds = digmaxDigits(p);
      const asc = [...ds].sort((a, b) => a - b);
      return [
        bug("opposite", "procedural", CMP, `The ${p[2] ? "greatest" : "smallest"} number was made. Read again which one is asked for.`, digmaxOf(ds, p[2] === 1)),
        bug("zero-first", "conceptual", PV, `The 0 was put first. A number cannot start with 0: that would make it a ${p[0] - 1}-digit number. Put the smallest digit that is not 0 first, then the 0.`, p[2] === 1 && p[3] === 1 ? Number(asc.join("")) : null),
        bug("order-given", "procedural", CMP, "The digits were written in the order they were given. Arrange them by size first.", Number(ds.join("")) !== digmaxOf(ds, p[2] === 0) && ds[0] !== 0 ? Number(ds.join("")) : null),
      ];
    },
    variants: () => [],
    explain: (s) => `Arrange the digits: ${s.value}.`,
    domain: [[3, 7], [0, 19], [0, 1], [0, 1]],
    grade: ([n]) => digitGrade(10 ** (n - 1)),
    cap: 300,
    difficulty: ([n, , ask, z]) => (n <= 4 && !z ? 1 : ask && z ? 3 : 2),
    word: (p) => `${nm(p[1] + p[0])} has number cards with the digits ${list(digmaxDigits(p))}. Using every card once, what is the ${p[2] ? "smallest" : "greatest"} ${p[0]}-digit number that can be made? Write it without commas.`,
    teach: {
      idea: "The left-most place is worth the most, so the biggest digit there gives the greatest number; for the smallest number the smallest digit goes there, but never 0.",
      method: "Greatest: write the digits from the biggest to the smallest. Smallest: from the smallest to the biggest, and if the first is 0, swap it with the next digit.",
      visual: (p) => table(["Digits", "Greatest", "Smallest"], [[list(digmaxDigits(p)), digmaxOf(digmaxDigits(p), true), digmaxOf(digmaxDigits(p), false)]]),
      alternatives: [
        { id: "places", title: "Fill the places one by one", kind: "procedural", text: ["Draw one box for each place.", "Fill the highest place first with the best digit for the job, cross it out, and go on to the next place."] },
      ],
    },
    limits: "Three to seven different digits, each used once, with or without a 0; repeated digits are not used.",
  },
  {
    id: "aapass",
    arity: 3,
    title: "Sorting a list by comparing neighbours (passes of swaps)",
    competency: ALGO,
    type: "tuple",
    mc: true,
    // [n, seed, P]: n different two-digit numbers; the list after P passes (1 or 2) of compare-and-swap from the left
    parse: none,
    reject: guard([[4, 6], [0, 39], [1, 2]], ([n, seed, P]) => list(bubble(passNums(n, seed), P)) !== list(bubble(passNums(n, seed), n)) || P === 1, "A list that is not yet sorted after the passes asked for (or one pass)."),
    prompt: ([n, seed, P]) => `A list is sorted by this rule. Compare the 1st and 2nd numbers and swap them if the first is bigger; then compare the 2nd and 3rd, and so on to the end of the list. That is one pass. Start with ${list(passNums(n, seed))}. Write the list after ${P === 1 ? "one pass" : "two passes"}, with commas between the numbers.`,
    solve: ([n, seed, P]) => {
      const steps: Step[] = [];
      for (let k = 1; k <= P; k++) steps.push(st(`pass${k}`, "compare and swap neighbours", ALGO, [k], list(bubble(passNums(n, seed), k))));
      return { steps, answer: list(bubble(passNums(n, seed), P)) };
    },
    // independent: in one pass the biggest number seen so far is carried along; each place keeps the smaller of the carried number and the next one
    validate: ([n, seed, P], v) => {
      let a = passNums(n, seed);
      for (let k = 0; k < P; k++) {
        const out: number[] = [];
        let carry = a[0];
        for (let i = 1; i < a.length; i++) {
          out.push(Math.min(carry, a[i]));
          carry = Math.max(carry, a[i]);
        }
        a = [...out, carry];
      }
      return readList(v)?.join() === a.join();
    },
    bugs: ([n, seed, P]) => {
      const xs = passNums(n, seed);
      const right = list(bubble(xs, P));
      const firstSwap = (() => {
        const a = [...xs];
        for (let i = 0; i + 1 < a.length; i++) if (a[i] > a[i + 1]) {
          [a[i], a[i + 1]] = [a[i + 1], a[i]];
          break;
        }
        return list(a);
      })();
      const full = list(bubble(xs, n));
      const fromRight = list(bubble(xs, P, true));
      return [
        bug("sorted-all", "procedural", ALGO, `The whole list was sorted. The question asks what the list looks like after ${P === 1 ? "only one pass" : "only two passes"}.`, full !== right ? full : null),
        bug("one-swap", "procedural", ALGO, "The pass stopped after the first swap. A pass goes on comparing neighbours to the end of the list.", P === 1 && firstSwap !== right ? firstSwap : null),
        bug("one-pass-only", "procedural", ALGO, "Only one pass was made. Make the second pass on the list the first pass gave.", P === 2 && list(bubble(xs, 1)) !== right ? list(bubble(xs, 1)) : null),
        bug("from-right", "procedural", ALGO, "The pass was started at the right-hand end. The rule starts with the 1st and 2nd numbers.", fromRight !== right ? fromRight : null),
      ];
    },
    distractors: ([n, seed, P]) => swaps(bubble(passNums(n, seed), P)),
    variants: () => [],
    explain: (s) => `After pass ${s.inputs[0]}: ${s.value}.`,
    domain: [[4, 6], [0, 39], [1, 2]],
    difficulty: ([n, , P]) => (n === 4 && P === 1 ? 1 : P === 1 ? 2 : 3),
    figure: ([n, seed]) => table(passNums(n, seed).map((_, i) => `${nth(i + 1)}`), [passNums(n, seed)]),
    word: ([n, seed, P]) => `In a rice godown, ${nm(seed)} arranges ${n} sacks in a row by weight using this rule: compare the 1st and 2nd sacks and swap them if the first is heavier, then the 2nd and 3rd, and so on to the end; that is one pass. The sacks weigh ${list(passNums(n, seed))} kg, in that order. Write the weights in their order after ${P === 1 ? "one pass" : "two passes"}, with commas.`,
    teach: {
      idea: "One pass of comparing neighbours carries the biggest number to the end of the list; each further pass puts the next biggest in its place.",
      method: "Point to the 1st and 2nd numbers; swap them if they are in the wrong order. Move one place right and repeat until the end. Write the new list after each pass.",
      visual: ([n, seed]) => table(["Start", "After pass 1"], [[list(passNums(n, seed)), list(bubble(passNums(n, seed), 1))]]),
      alternatives: [
        { id: "bubble", title: "The bubble rises", kind: "conceptual", text: ["Watch the biggest number: once it is reached, it is swapped again and again and moves to the end like a bubble rising.", "So after one pass the last number is always the biggest."], visual: ([n, seed]) => table(["Pass", "List"], [0, 1, 2].map((k) => [k, list(bubble(passNums(n, seed), k))])) },
      ],
    },
    limits: "Lists of 4 to 6 different two-digit numbers, one or two passes; other sorting methods are not asked.",
  },

  // ================================================================ MATH.number.addition / subtraction: story problems and number sentences
  {
    id: "aastadd",
    arity: 2,
    title: "How many altogether: addition story problems",
    competency: ADD,
    type: "integer",
    mc: true,
    // [lvl, seed]: lvl 0 two-digit numbers without regrouping, 1 two-digit with regrouping, 2 three-digit
    parse: none,
    reject: guard([[0, 2], [0, 99]], ([lvl, seed]) => storyNums(0, lvl, seed)[0] > 0 && ![...Array(seed).keys()].some((s0) => s0 % 4 === seed % 4 && storyNums(0, lvl, s0).join() === storyNums(0, lvl, seed).join()), "Numbers of the level's size, not a story an earlier seed already tells."),
    prompt: ([lvl, seed]) => {
      const [a, b] = storyNums(0, lvl, seed);
      return ADD_STORIES[seed % 4](a, b, nm(seed), nm(seed + 1));
    },
    solve: ([lvl, seed]) => {
      const [a, b] = storyNums(0, lvl, seed);
      return { steps: [st("sentence", "write the addition", ADD, [a, b], `${a} + ${b}`), st("add", "add", ADD, [a, b], a + b)], answer: a + b };
    },
    // independent: the inverse operation, taking the second number back off the answer
    validate: ([lvl, seed], v) => {
      const [a, b] = storyNums(0, lvl, seed);
      return typeof v === "number" && v - b === a;
    },
    bugs: ([lvl, seed]) => {
      const [a, b] = storyNums(0, lvl, seed);
      return [
        bug("subtracted", "conceptual", SUB, "The numbers were subtracted. 'Altogether' and 'more get on' join the two groups, so add.", Math.abs(a - b)),
        bug("no-regroup", "procedural", ADD, "The ten made in the ones column was not carried to the tens. When a column adds up to 10 or more, write the ones and carry the ten.", lvl >= 1 ? digitwise(a, b, (x, y) => (x + y) % 10) : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "sentence" ? `The story joins two groups: ${s.value}.` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [0, 99]],
    grade: ([lvl, seed]) => {
      const [a, b] = storyNums(0, lvl, seed);
      return sizeGrade(a, b, a + b);
    },
    difficulty: ([lvl]) => (lvl + 1) as 1 | 2 | 3,
    word: ([lvl, seed]) => {
      const [a, b] = storyNums(0, lvl, seed);
      return ADD_STORIES[(seed + 2) % 4](a, b, nm(seed + 3), nm(seed + 4));
    },
    teach: {
      idea: "When two groups are put together, the total is found by adding: words like 'altogether', 'in all' and 'more come' tell us to join.",
      method: "Write the addition. Add the ones, then the tens (then the hundreds); if a column makes 10 or more, carry the ten to the next column.",
      visual: ([lvl, seed]) => {
        const [a, b] = storyNums(0, lvl, seed);
        return table(["", "Hundreds", "Tens", "Ones"], [["", Math.floor(a / 100) || "", Math.floor(a / 10) % 10, a % 10], ["+", Math.floor(b / 100) || "", Math.floor(b / 10) % 10, b % 10]]);
      },
      alternatives: [
        { id: "blocks", title: "Join base-ten blocks", kind: "conceptual", text: ["Show each number with tens rods and ones cubes.", "Push them together; swap ten cubes for a rod if you can, then count rods and cubes."], visual: ([lvl, seed]) => {
          const [a, b] = storyNums(0, lvl, seed);
          return { type: "blocks", hundreds: Math.floor((a + b) / 100), tens: Math.floor((a + b) / 10) % 10, ones: (a + b) % 10 };
        } },
      ],
    },
    limits: "Two-digit sums without regrouping and with regrouping (Grade 2) and three-digit sums up to 999 (Grade 3), each declared by grade(p); one-step stories only.",
  },
  {
    id: "aastsub",
    arity: 2,
    title: "How many are left: subtraction story problems",
    competency: SUB,
    type: "integer",
    mc: true,
    // [lvl, seed]: lvl 0 two-digit without regrouping, 1 two-digit with regrouping, 2 three-digit with regrouping
    parse: none,
    reject: guard([[0, 2], [0, 99]], ([lvl, seed]) => storyNums(1, lvl, seed)[0] > 0 && ![...Array(seed).keys()].some((s0) => s0 % 4 === seed % 4 && storyNums(1, lvl, s0).join() === storyNums(1, lvl, seed).join()), "Numbers of the level's size, not a story an earlier seed already tells."),
    prompt: ([lvl, seed]) => {
      const [a, b] = storyNums(1, lvl, seed);
      return SUB_STORIES[seed % 4](a, b, nm(seed), nm(seed + 1));
    },
    solve: ([lvl, seed]) => {
      const [a, b] = storyNums(1, lvl, seed);
      return { steps: [st("sentence", "write the subtraction", SUB, [a, b], `${a} − ${b}`), st("subtract", "subtract", SUB, [a, b], a - b)], answer: a - b };
    },
    // independent: the inverse operation, adding what was taken away back to the answer
    validate: ([lvl, seed], v) => {
      const [a, b] = storyNums(1, lvl, seed);
      return typeof v === "number" && v >= 0 && v + b === a;
    },
    bugs: ([lvl, seed]) => {
      const [a, b] = storyNums(1, lvl, seed);
      return [
        bug("added", "conceptual", ADD, "The numbers were added. 'Left' and 'flew away' mean some are taken away, so subtract.", a + b),
        bug("smaller-from-larger", "procedural", SUB, "In a column, the smaller digit was taken from the larger one, whichever was on top. When the top digit is smaller, regroup: exchange one ten for ten ones first.", lvl >= 1 ? digitwise(a, b, (x, y) => Math.abs(x - y)) : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "sentence" ? `Some are taken away: ${s.value}.` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [0, 99]],
    grade: ([lvl, seed]) => sizeGrade(...storyNums(1, lvl, seed)),
    difficulty: ([lvl]) => (lvl + 1) as 1 | 2 | 3,
    word: ([lvl, seed]) => {
      const [a, b] = storyNums(1, lvl, seed);
      return SUB_STORIES[(seed + 2) % 4](a, b, nm(seed + 3), nm(seed + 4));
    },
    teach: {
      idea: "When some are taken away from a group, what is left is found by subtracting the part taken away from the whole.",
      method: "Write the bigger number on top. Subtract the ones, then the tens (then the hundreds); if the top digit is smaller, regroup one from the next place first.",
      visual: ([lvl, seed]) => {
        const [a, b] = storyNums(1, lvl, seed);
        return table(["", "Hundreds", "Tens", "Ones"], [["", Math.floor(a / 100) || "", Math.floor(a / 10) % 10, a % 10], ["−", Math.floor(b / 100) || "", Math.floor(b / 10) % 10, b % 10]]);
      },
      alternatives: [
        { id: "count_up", title: "Count up from the part taken away", kind: "procedural", text: ["Start at the number taken away and count up to the number you started with.", "Jump in tens first, then in ones: the total of the jumps is what is left."], visual: ([lvl, seed]) => {
          const [a, b] = storyNums(1, lvl, seed);
          return { type: "numberline", from: b, to: a, marks: [b, a], jumps: [[b, a]] };
        } },
      ],
    },
    limits: "Two-digit differences without and with regrouping (Grade 2) and three-digit differences (Grade 3), each declared by grade(p); one-step stories only.",
  },
  {
    id: "aasenadd",
    arity: 3,
    title: "Choosing the addition sentence for a story",
    competency: ADD,
    type: "choice",
    // [a, b, c]: a things, then b more come; story SEN_ADD[c]
    parse: none,
    reject: guard([[2, 9], [2, 9], [0, 3]], ([a, b]) => a + b <= 15, "Two small groups, together at most 15."),
    prompt: ([a, b, c]) => `${a} ${SEN_ADD[c][0]} ${SEN_ADD[c][1]}. ${b} ${SEN_ADD[c][2]}. Which number sentence shows how many there are now? (The picture shows the two groups.)`,
    choices: (p) => senAddChoices(p).list,
    solve: (p) => {
      const s = senAddChoices(p);
      return { steps: [st("record", "write as an addition", ADD, [p[0], p[1]], s.R)], answer: s.list.indexOf(s.R) };
    },
    // independent: read the chosen sentence: it must join the two groups with +, and be true
    validate: (p, v) => {
      const c = senAddChoices(p).list[v as number];
      if (!c) return false;
      const { x, op, y, z } = sentence(c);
      return op === "+" && x + y === z && [x, y].sort().join() === [p[0], p[1]].sort().join();
    },
    bugs: (p) => {
      const s = senAddChoices(p);
      return [
        bug("take-away", "conceptual", SUB, "A subtraction was chosen. More are coming to join the group, so the story is an addition.", s.list.indexOf(s.take)),
        bug("miscount", "procedural", ADD, "A sentence with the wrong total was chosen. Count all of them in the picture to check the total.", s.list.indexOf(s.off)),
      ];
    },
    variants: () => [],
    explain: (s) => `The two groups are joined: ${s.value}.`,
    domain: [[2, 9], [2, 9], [0, 3]],
    cap: 300,
    difficulty: ([a, b]) => (a + b <= 10 ? 1 : 2),
    figure: ([a, b]) => ({ type: "pictograph", labels: ["At first", "Then came"], counts: [a, b], key: 1 }),
    word: ([a, b, c]) => `${nm(a + b)} tells a story: "${a} ${SEN_ADD[(c + 1) % 4][0]} ${SEN_ADD[(c + 1) % 4][1]}. Then ${b} ${SEN_ADD[(c + 1) % 4][2]}." The picture shows the two groups. Which number sentence matches the story?`,
    teach: {
      idea: "A story where more things come and join a group is an addition: first group + the ones that came = how many now.",
      method: "Find the first number, find how many came, and write first + came = total. Count them all to check the total.",
      visual: ([a, b]) => ({ type: "pictograph", labels: ["At first", "Then came"], counts: [a, b], key: 1 }),
      alternatives: [
        { id: "ten_frame", title: "Fill a ten frame", kind: "conceptual", text: ["Put counters for the first group in a ten frame.", "Add counters for the group that came: the number sentence is first + came = all the counters."], visual: ([a, b]) => ({ type: "tenframe", filled: a + b, frames: a + b > 10 ? 2 : 1 }) },
      ],
    },
    limits: "Join stories with two groups of 2 to 9 (total up to 15); the right sentence keeps the story's order.",
  },
  {
    id: "aasensub",
    arity: 3,
    title: "Choosing the subtraction sentence for a take-away story",
    competency: SUB,
    type: "choice",
    // [a, b, c]: a things, b are taken away; story SEN_SUB[c]
    parse: none,
    reject: guard([[3, 12], [2, 11], [0, 3]], ([a, b]) => b < a, "A group of up to 12 with some taken away (a row of the picture holds 12)."),
    prompt: ([a, b, c]) => `${SEN_SUB[c](a, b, nm(a + b))} (The picture shows the group and how many are taken away.)`,
    choices: (p) => senSubChoices(p).list,
    solve: (p) => {
      const s = senSubChoices(p);
      return { steps: [st("record", "write as a subtraction", SUB, [p[0], p[1]], s.R)], answer: s.list.indexOf(s.R) };
    },
    // independent: read the chosen sentence: it must start from the whole group, take away the part, and be true
    validate: (p, v) => {
      const c = senSubChoices(p).list[v as number];
      if (!c) return false;
      const { x, op, y, z } = sentence(c);
      return op === "−" && x === p[0] && y === p[1] && x - y === z;
    },
    bugs: (p) => {
      const s = senSubChoices(p);
      return [
        bug("added", "conceptual", ADD, "An addition was chosen. Some are taken away, so the story is a subtraction.", s.list.indexOf(s.added)),
        bug("order-swapped", "conceptual", SUB, "The smaller number was written first. A take-away sentence starts with how many there were, then takes away the part that went.", s.list.indexOf(s.swapped)),
        bug("miscount", "procedural", SUB, "A sentence with the wrong answer was chosen. Count the ones left in the picture to check.", s.list.indexOf(s.off)),
      ];
    },
    variants: () => [],
    explain: (s) => `Start with all of them and take away the part that went: ${s.value}.`,
    domain: [[3, 12], [2, 11], [0, 3]],
    cap: 300,
    difficulty: ([a]) => (a <= 10 ? 1 : 2),
    figure: ([a, b]) => ({ type: "pictograph", labels: ["At first", "Taken away"], counts: [a, b], key: 1 }),
    word: ([a, b, c]) => `${SEN_SUB[(c + 2) % 4](a, b, nm(a + b + 1))} The picture shows the group and how many are taken away.`,
    teach: {
      idea: "A story where some are taken away is a subtraction: how many at first − how many went = how many are left.",
      method: "Write the number you start with first, then − and the number taken away, then = and what is left.",
      visual: ([a, b]) => ({ type: "pictograph", labels: ["At first", "Taken away"], counts: [a, b], key: 1 }),
      alternatives: [
        { id: "cross_out", title: "Cross out", kind: "conceptual", text: ["Draw all the things, then cross out the ones that go.", "Count the ones not crossed out: that is the number after the = sign."], visual: ([a]) => ({ type: "tenframe", filled: a, frames: a > 10 ? 2 : 1 }) },
      ],
    },
    limits: "Take-away stories from groups of 3 to 12 (all drawn in one row of the picture); comparing two groups ('how many more') is aamore.",
  },

  // ================================================================ MATH.measurement.calendar: days and months in order, seasons, dates, ages
  {
    id: "aaweek",
    arity: 3,
    title: "The days of the week and the months in order",
    competency: CAL,
    type: "choice",
    // [kind, i, k]: kind 0 the day STEPK[k] days after (before) DAYS[i]; kind 1 the month STEPK[k] months after MONTHS[i]; kind 2 the (i+1)-th month
    parse: none,
    reject: guard([[0, 2], [0, 11], [0, 5]], ([kind, i, k]) => (kind === 0 ? i <= 6 : kind === 2 ? k === 0 : true), "A day or a month and a step forwards or backwards."),
    prompt: ([kind, i, k]) => {
      const s = STEPK[k];
      const L = kind === 0 ? "day" : "month";
      const nmx = kind === 0 ? DAYS[i] : MONTHS[i];
      if (kind === 2) return `Which is the ${ORDW[i + 1]} month of the year?`;
      return Math.abs(s) === 1 ? `Which ${L} comes just ${s > 0 ? "after" : "before"} ${nmx}?` : `Which ${L} is ${Math.abs(s)} ${L}s ${s > 0 ? "after" : "before"} ${nmx}?`;
    },
    choices: (p) => weekChoices(p).list,
    solve: (p) => {
      const w = weekChoices(p);
      return { steps: [st("count", "count on or back", CAL, [p[1], p[0] === 2 ? 0 : STEPK[p[2]]], w.R)], answer: w.list.indexOf(w.R) };
    },
    // independent: the computer's calendar (4 January 2026 was a Sunday), moved on by days or months
    validate: ([kind, i, k], v) => {
      const c = weekChoices([kind, i, k]).list[v as number];
      if (kind === 0) return c === DAYS[new Date(Date.UTC(2026, 0, 4 + i + STEPK[k])).getUTCDay()];
      if (kind === 1) return c === MONTHS[new Date(Date.UTC(2026, i + STEPK[k], 1)).getUTCMonth()];
      return c === MONTHS[new Date(Date.UTC(2026, i, 1)).getUTCMonth()];
    },
    bugs: (p) => {
      const w = weekChoices(p);
      return p[0] === 2
        ? [bug("one-too-many", "procedural", CAL, "One month too many was counted: January is the first month, so start counting with January as 1.", ix(w.list, w.extra))]
        : [
          bug("wrong-way", "conceptual", CAL, `The count went the wrong way. ${STEPK[p[2]] > 0 ? "After means later, going forwards." : "Before means earlier, going backwards."}`, ix(w.list, w.opp)),
          bug("one-too-many", "procedural", CAL, "One step too many was made. Say the next name for each step and stop when the steps are used up.", ix(w.list, w.extra)),
        ];
    },
    variants: () => [],
    explain: (s) => `Say them in order: the answer is ${s.value}.`,
    domain: [[0, 2], [0, 11], [0, 5]],
    difficulty: ([kind, , k]) => (kind === 0 && Math.abs(STEPK[k]) === 1 ? 1 : kind === 2 || Math.abs(STEPK[k]) === 1 ? 2 : 3),
    word: ([kind, i, k]) => {
      const s = STEPK[k];
      if (kind === 2) return `${nm(i)} writes the months of the year in order, starting with January. Which month is ${nm(i)}'s ${ORDW[i + 1]} one?`;
      return kind === 0
        ? `${nm(i + k)}'s cricket practice is on ${DAYS[i]}. The match is ${Math.abs(s)} day${Math.abs(s) > 1 ? "s" : ""} ${s > 0 ? "later" : "earlier"}. On which day is the match?`
        : `${nm(i + k)}'s school exams are in ${MONTHS[i]}. The school trip is ${Math.abs(s)} month${Math.abs(s) > 1 ? "s" : ""} ${s > 0 ? "after" : "before"} that. In which month is the trip?`;
    },
    teach: {
      idea: "The days of the week always come in the same order, Sunday to Saturday, and then start again; the months go January to December and then start again.",
      method: "Say the names in order from the one given, one name for each step: forwards for 'after', backwards for 'before'.",
      visual: () => table(["Days of the week"], DAYS.map((d) => [d])),
      alternatives: [
        { id: "circle", title: "A circle of names", kind: "conceptual", text: ["Write the 7 days (or 12 months) round a circle, like a clock.", "Going after is going round one way; going before is going round the other way."], visual: () => table(["Months"], MONTHS.map((m) => [m])) },
      ],
    },
    limits: "Steps of 1 to 3 days or months forwards or backwards, and naming the n-th month.",
  },
  {
    id: "aaseason",
    arity: 3,
    title: "Months and seasons",
    competency: CAL,
    type: "choice",
    // [kind, m, k]: kind 0 the season of month m; kind 1 the season k months after month m; kind 2 the season just after (k 0) or before (k 1) season m
    parse: none,
    reject: guard([[0, 2], [0, 11], [0, 6]], ([kind, m, k]) => (kind === 0 ? k === 0 : kind === 1 ? k >= 1 : m <= 3 && k <= 1), "A month or season from the chart."),
    prompt: ([kind, m, k]) =>
      kind === 0
        ? `The table shows the four seasons used by the India Meteorological Department. In which season is ${MONTHS[m]}?`
        : kind === 1
          ? `The table shows the four seasons used by the India Meteorological Department. ${nm(m)} visits the grandparents in ${MONTHS[m]}. The next visit is ${k} month${k > 1 ? "s" : ""} later. In which season is the next visit?`
          : `The table shows the four seasons used by the India Meteorological Department, in order through the year. Which season comes just ${k ? "before" : "after"} ${SEASONS[m][0]}?`,
    choices: seasonChoices,
    solve: (p) => {
      const s = SEASONS[seasonWant(p)][0];
      return { steps: [st("month", "find the month", CAL, [p[1], p[0] === 1 ? p[2] : 0], p[0] === 2 ? SEASONS[p[1]][0] : MONTHS[mod(p[1] + (p[0] === 1 ? p[2] : 0), 12)]), st("season", "read the table", CAL, [], s)], answer: seasonChoices(p).indexOf(s) };
    },
    // independent: move through the months with the computer's calendar, then find the row of the table that lists that month
    validate: (p, v) => {
      const [kind, m, k] = p;
      const name = seasonChoices(p)[v as number];
      if (kind === 2) {
        const row = SEASONS.findIndex((s) => s[0] === name);
        if (row < 0) return false;
        const lastOf = (r: number) => SEASONS[r][1][SEASONS[r][1].length - 1];
        return k ? mod(lastOf(row) + 1, 12) === SEASONS[m][1][0] : mod(lastOf(m) + 1, 12) === SEASONS[row][1][0];
      }
      const month = new Date(Date.UTC(2026, m + (kind === 1 ? k : 0), 1)).getUTCMonth();
      return SEASONS.some(([s, ms]) => s === name && ms.includes(month));
    },
    bugs: (p) => {
      const [kind, m, k] = p;
      const cs = seasonChoices(p);
      const right = seasonWant(p);
      if (kind === 1) {
        const start = SEASON_OF[mod(m + k - 1, 12)];
        return [bug("counted-start", "procedural", CAL, `${MONTHS[m]} itself was counted${k > 1 ? ` as one of the ${k} months` : ""}. Start counting with the month after ${MONTHS[m]}.`, start !== right ? cs.indexOf(SEASONS[start][0]) : null)];
      }
      if (kind === 2) return [bug("wrong-way", "conceptual", CAL, `The season ${k ? "after" : "before"} was given. ${k ? "Before" : "After"} means ${k ? "earlier" : "later"} in the year.`, cs.indexOf(SEASONS[mod(m + (k ? 1 : -1), 4)][0]))];
      return [bug("next-row", "procedural", CAL, "The row next to the right one was read. Find the month's name in the Months column first.", cs.indexOf(SEASONS[mod(right + 1, 4)][0]))];
    },
    variants: () => [],
    explain: (s) => (s.id === "month" ? `The month (or season) to look for is ${s.value}.` : `The table says: ${s.value}.`),
    domain: [[0, 2], [0, 11], [0, 6]],
    difficulty: ([kind, , k]) => (kind === 0 ? 1 : kind === 2 || k <= 2 ? 2 : 3),
    figure: seasonTable,
    word: ([kind, m, k]) =>
      kind === 0
        ? `${nm(m)}'s birthday is in ${MONTHS[m]}. Use the table of seasons. In which season is the birthday?`
        : kind === 1
          ? k >= 3
            ? `A farmer sows paddy in ${MONTHS[m]}. The crop is ready ${k} months later. Use the table of seasons: in which season is the crop ready?`
            : `${nm(m + 1)}'s family books a holiday in ${MONTHS[m]} for ${k} month${k > 1 ? "s" : ""} later. Use the table of seasons: in which season is the holiday?`
          : k
            ? `Use the table of seasons. Which season ends just as ${SEASONS[m][0]} begins?`
            : `Use the table of seasons. When ${SEASONS[m][0]} ends, which season begins?`,
    teach: {
      idea: "A season is a group of months with similar weather. The India Meteorological Department uses four: winter, summer, the monsoon and post-monsoon.",
      method: "Find the month (count on from the month given if you need to), then find the row of the table that lists it.",
      visual: seasonTable,
      alternatives: [
        { id: "wheel", title: "A season wheel", kind: "conceptual", text: ["Write the 12 months round a circle and colour each season's months.", "Count on round the circle; the colour you land on is the season."] },
      ],
    },
    limits: "The four IMD seasons; local rainy seasons differ by region (much of Tamil Nadu gets its rain in October–December) and are not asked.",
  },
  {
    id: "aamdays",
    arity: 3,
    title: "Days in months and years, weeks and days, years and months",
    competency: CAL,
    type: "integer",
    mc: true,
    // [kind, a, b]: kind 0 days in month a of year 2024 + b; 1 days in the year 2024 + b; 2 days in months a and a+1 of 2024 + b;
    // 3 months in a years and b months; 4 days in a weeks and b days; 5 full weeks in WDAYS[a] days
    parse: none,
    reject: guard([[0, 5], [0, 11], [0, 8]], ([kind, a, b]) =>
      kind === 5 ? b === 0 :
      kind === 0 ? a === 1 || b === 2
        : kind === 1 ? a === 0
          : kind === 2 ? a <= 10 && (a <= 1 || b === 2)
            : kind === 3 ? a >= 1 && a <= 5 && b >= 1 && b <= 8
              : a >= 1 && a <= 8 && b >= 1 && b <= 6, "A month or year from 2024 to 2032, or a number of years, months, weeks and days."),
    prompt: ([kind, a, b]) => {
      const Y = 2024 + b;
      return [
        `How many days are there in ${MONTHS[a]} ${Y}?`,
        `How many days are there in the year ${Y}?`,
        `How many days are there in ${MONTHS[a]} and ${MONTHS[a + 1]} ${Y} together?`,
        `How many months are there in ${a} year${a > 1 ? "s" : ""} and ${b} month${b > 1 ? "s" : ""}?`,
        `How many days are there in ${a} week${a > 1 ? "s" : ""} and ${b} day${b > 1 ? "s" : ""}?`,
        `How many full weeks are there in ${WDAYS[a] >= 365 ? `a year of ${WDAYS[a]} days` : `${WDAYS[a]} days`}?`,
      ][kind];
    },
    solve: ([kind, a, b]) => {
      const Y = 2024 + b;
      const ans = [mdays(Y, a), isLeap(Y) ? 366 : 365, kind === 2 ? mdays(Y, a) + mdays(Y, a + 1) : 0, 12 * a + b, 7 * a + b, Math.floor(WDAYS[a] / 7)][kind];
      return { steps: [st("fact", "use the calendar facts", CAL, [kind, a, b], ans)], answer: ans };
    },
    // independent: the computer's calendar (the 0th day of the next month is the last day of this one), and counting
    validate: ([kind, a, b], v) => {
      const Y = 2024 + b;
      const last = (m: number) => new Date(Date.UTC(Y, m + 1, 0)).getUTCDate();
      if (kind === 0) return v === last(a);
      if (kind === 1) return v === (Date.UTC(Y + 1, 0, 1) - Date.UTC(Y, 0, 1)) / 86400000;
      if (kind === 2) return v === (Date.UTC(Y, a + 2, 1) - Date.UTC(Y, a, 1)) / 86400000;
      if (kind === 5) {
        let left = WDAYS[a];
        let w = 0;
        while (left >= 7) {
          left -= 7;
          w++;
        }
        return v === w;
      }
      let c = 0;
      for (let i = 0; i < a; i++) c += kind === 3 ? 12 : 7;
      return v === c + b;
    },
    bugs: ([kind, a, b]) => {
      const Y = 2024 + b;
      if (kind === 0)
        return a === 1
          ? [bug(isLeap(Y) ? "leap-missed" : "leap-every-year", "recall", CAL, isLeap(Y) ? `${Y} is a leap year (it divides by 4), so February has 29 days.` : `${Y} is not a leap year, so February has 28 days; only a leap year has 29 February.`, isLeap(Y) ? 28 : 29)]
          : [bug("knuckle-slip", "recall", CAL, `${MONTHS[a]} was given ${MLEN[a] === 31 ? 30 : 31} days. Use the knuckle rhyme: months on a knuckle have 31 days, months in a gap have 30.`, MLEN[a] === 31 ? 30 : 31)];
      if (kind === 1) return [bug("leap-slip", "recall", CAL, isLeap(Y) ? `${Y} is a leap year, so it has one extra day, 29 February.` : `${Y} is not a leap year (it does not divide by 4), so it has 365 days.`, isLeap(Y) ? 365 : 366)];
      if (kind === 5)
        return [
          bug("days-left", "procedural", CAL, `The days left over were given. ${WDAYS[a]} days make ${Math.floor(WDAYS[a] / 7)} full weeks with ${WDAYS[a] % 7} day${WDAYS[a] % 7 === 1 ? "" : "s"} left over.`, WDAYS[a] % 7 !== Math.floor(WDAYS[a] / 7) ? WDAYS[a] % 7 : null),
          bug("ten-per", "conceptual", CAL, "A week was taken as 10 days. A week has 7 days: share the days into sevens.", Math.floor(WDAYS[a] / 10)),
        ];
      if (kind === 2) return [bug("thirty-each", "recall", CAL, "Each month was taken as 30 days. Look up how many days each of the two months really has.", 60 !== mdays(Y, a) + mdays(Y, a + 1) ? 60 : null)];
      return [bug("ten-per", "conceptual", CAL, kind === 3 ? "A year was taken as 10 months. A year has 12 months." : "A week was taken as 10 days. A week has 7 days.", 10 * a + b)];
    },
    variants: () => [],
    explain: (s) => `That is ${s.value}.`,
    domain: [[0, 5], [0, 11], [0, 8]],
    difficulty: ([kind, a]) => (kind === 0 && a !== 1 ? 1 : kind <= 1 || kind >= 3 ? 2 : 3),
    word: ([kind, a, b]) => {
      const Y = 2024 + b;
      return [
        `${nm(a + b)}'s family pays the milkman for every day of ${MONTHS[a]} ${Y}. For how many days do they pay?`,
        `A diary for ${Y} has one page for each day of the year. How many pages for days does it have?`,
        `A summer camp in ${Y} runs on every day of ${MONTHS[a]} and ${MONTHS[a + 1]}. On how many days does it run?`,
        `${nm(a + b)}'s baby brother is ${a} year${a > 1 ? "s" : ""} and ${b} month${b > 1 ? "s" : ""} old. How old is he in months?`,
        `A bean plant took ${a} week${a > 1 ? "s" : ""} and ${b} day${b > 1 ? "s" : ""} to flower. How many days did it take?`,
        `A school wall chart has one column for each full week. How many full weeks fit into ${WDAYS[a] >= 365 ? `a year of ${WDAYS[a]} days` : `${WDAYS[a]} days`}?`,
      ][kind];
    },
    teach: {
      idea: "A week has 7 days and a year 12 months. April, June, September and November have 30 days; February has 28, or 29 in a leap year (a year that divides by 4, like 2028); the rest have 31. A year has 365 days, a leap year 366.",
      method: "Use the facts: add the days of each month, multiply weeks by 7 and years by 12, then add the extra days or months.",
      visual: () => table(["Month", "Days"], MONTHS.map((m, i) => [m, i === 1 ? "28 (29 in a leap year)" : MLEN[i]])),
      alternatives: [
        { id: "knuckles", title: "The knuckle way", kind: "recall", text: ["Make two fists and say the months along the knuckles and the gaps between them.", "Knuckle months have 31 days; gap months have 30, except February."] },
      ],
    },
    limits: "Years 2024 to 2032 (2024, 2028 and 2032 are leap years); century leap-year rules are not needed. Full weeks in a year (52, with 1 or 2 days over) and in other spans are included.",
  },
  {
    id: "aaddmm",
    arity: 3,
    title: "Writing and reading dates as DD/MM/YYYY",
    competency: CAL,
    type: "choice",
    // [kind, m, d]: kind 0 write d (month m) as DD/MM/YYYY; kind 1 read a DD/MM/YYYY date (d up to 12, so the swap is a real date)
    parse: none,
    reject: guard([[0, 1], [0, 11], [1, 28]], ([kind, m, d]) => d !== m + 1 && (kind === 0 || d <= 12) && new Set(ddmmChoices([kind, m, d]).list).size === 4, "A date whose day and month numbers differ."),
    prompt: ([kind, m, d]) => (kind === 0 ? `Which shows ${d} ${MONTHS[m]} ${ddmmYear(m, d)} written as DD/MM/YYYY?` : `A date is written as ${ddmm(d, m, ddmmYear(m, d))} (DD/MM/YYYY). Which date is it?`),
    choices: (p) => ddmmChoices(p).list,
    solve: (p) => {
      const c = ddmmChoices(p);
      return { steps: [st("format", "day, then month, then year", CAL, [p[2], p[1] + 1], c.R)], answer: c.list.indexOf(c.R) };
    },
    // independent: read the chosen option back into a day, month and year and compare with the computer's calendar
    validate: ([kind, m, d], v) => {
      const c = ddmmChoices([kind, m, d]).list[v as number];
      if (!c) return false;
      const y = ddmmYear(m, d);
      if (kind === 0) {
        const t = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(c);
        return !!t && Date.UTC(Number(t[3]), Number(t[2]) - 1, Number(t[1])) === Date.UTC(y, m, d);
      }
      const t = c.split(" ");
      return Date.UTC(Number(t[2]), MONTHS.indexOf(t[1]), Number(t[0])) === Date.UTC(y, m, d);
    },
    bugs: (p) => {
      const c = ddmmChoices(p);
      return [
        bug("month-first", "conceptual", CAL, "The month was put first. In DD/MM/YYYY the day comes first, then the month, then the year.", c.list.indexOf(c.SW)),
      ];
    },
    variants: () => [],
    explain: (s) => `Day ${s.inputs[0]}, month ${s.inputs[1]}: ${s.value}.`,
    domain: [[0, 1], [0, 11], [1, 28]],
    cap: 300,
    difficulty: ([kind, m, d]) => (kind === 0 && d > 12 ? 1 : kind === 0 ? 2 : 3),
    figure: () => table(["DD", "MM", "YYYY"], [["day", "month", "year"]]),
    word: ([kind, m, d]) =>
      kind === 0
        ? `${nm(m + d)} fills in a library form. The book must be returned on ${d} ${MONTHS[m]} ${ddmmYear(m, d)}, and the form asks for the date as DD/MM/YYYY. What should be written?`
        : `A medicine strip says "Expiry: ${ddmm(d, m, ddmmYear(m, d))}" (DD/MM/YYYY). On which date does the medicine expire?`,
    teach: {
      idea: "DD/MM/YYYY writes the day in two digits, then the month as a number in two digits (January = 01, December = 12), then the year in four digits.",
      method: "Write the day (put a 0 in front of 1 to 9), a slash, the month's number, a slash, and the year. To read, take the first part as the day and the middle part as the month.",
      visual: () => table(["Month", "Number"], MONTHS.map((m, i) => [m, pad2(i + 1)])),
      alternatives: [
        { id: "boxes", title: "Fill three boxes", kind: "procedural", text: ["Draw boxes labelled DD, MM and YYYY.", "Fill the day box first, then the month box, then the year box."], visual: () => table(["DD", "MM", "YYYY"], [["05", "08", "2026"]]) },
      ],
    },
    limits: "Dates from 2025 to 2027 with day and month numbers that differ; other date formats are not asked.",
  },
  {
    id: "aaage",
    arity: 4,
    title: "Finding a person's age from the date of birth",
    competency: CAL,
    type: "integer",
    mc: true,
    // [yo, bm, tm, dd]: born on 15 of month bm in 2010 + yo; today is in month tm of 2026, on the 5th or 25th when tm = bm (dd), else the 10th or 11th
    parse: none,
    reject: guard([[0, 9], [0, 11], [0, 11], [0, 1]], ([, bm, tm, dd]) => tm === bm || dd === 0, "A date of birth from 2010 to 2019 and a date in 2026."),
    prompt: (p) => {
      const [yo, bm, tm] = p;
      const { td, bd } = ageToday(p);
      return `${nm(yo + bm)} was born on ${ddmm(bd, bm, 2010 + yo)}. How old is ${nm(yo + bm)} on ${ddmm(td, tm, 2026)}, in completed years? (Dates are DD/MM/YYYY.)`;
    },
    solve: (p) => {
      const [yo, bm, tm] = p;
      const { td, bd } = ageToday(p);
      const before = tm < bm || (tm === bm && td < bd);
      return { steps: [st("years", "subtract the years", SUB, [2026, 2010 + yo], 2026 - 2010 - yo), st("birthday", "has the birthday come yet?", CAL, [before ? "not yet" : "yes"], 2026 - 2010 - yo - (before ? 1 : 0))], answer: 2026 - 2010 - yo - (before ? 1 : 0) };
    },
    // independent: count the birthdays that have come, one year at a time
    validate: (p, v) => {
      const [yo, bm, tm] = p;
      const { td, bd } = ageToday(p);
      let a = 0;
      while (Date.UTC(2010 + yo + a + 1, bm, bd) <= Date.UTC(2026, tm, td)) a++;
      return v === a;
    },
    bugs: (p) => {
      const [yo, bm, tm] = p;
      const { td, bd } = ageToday(p);
      const before = tm < bm || (tm === bm && td < bd);
      const y = 2026 - 2010 - yo;
      return [
        bug("birthday-not-yet", "conceptual", CAL, "Only the years were subtracted. This year's birthday has not come yet, so one year is not complete.", before ? y : null),
        bug("counted-both-years", "procedural", CAL, "Both the birth year and this year were counted. Age counts the birthdays that have passed.", before ? null : y + 1),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "years" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}.` : `The birthday this year: ${s.inputs[0]}. Age: ${s.value}.`),
    domain: [[0, 9], [0, 11], [0, 11], [0, 1]],
    cap: 300,
    difficulty: ([, bm, tm]) => (tm > bm ? 1 : tm < bm ? 2 : 3),
    word: (p) => {
      const [yo, bm, tm] = p;
      const { td, bd } = ageToday(p);
      return `A school admission form asks for a child's age in completed years on ${ddmm(td, tm, 2026)}. The child's date of birth is ${ddmm(bd, bm, 2010 + yo)}. What age should be written? (Dates are DD/MM/YYYY.)`;
    },
    teach: {
      idea: "Age in completed years is the number of birthdays that have passed.",
      method: "Subtract the birth year from this year. If this year's birthday has not come yet, take away 1.",
      visual: (p) => table(["Born", "Today"], [[ddmm(ageToday(p).bd, p[1], 2010 + p[0]), ddmm(ageToday(p).td, p[2], 2026)]]),
      alternatives: [
        { id: "line", title: "A birthday line", kind: "procedural", text: ["Draw a line of years from the birth year to this year.", "Put a mark at each birthday up to today and count the marks."] },
      ],
    },
    limits: "Born on the 15th of a month in 2010–2019, today in 2026; durations in days are aacalgap and aacalmo.",
  },
  {
    id: "aaday",
    arity: 3,
    title: "The day of the week for a date",
    competency: CAL,
    type: "choice",
    // [yr, m, d]: d month m of 2026 + yr
    parse: none,
    reject: guard([[0, 1], [0, 11], [1, 31]], ([, m, d]) => d <= MLEN[m], "A date in 2026 or 2027."),
    prompt: ([yr, m, d]) => `Look at the calendar for ${MONTHS[m]} ${2026 + yr}. On which day of the week is ${d} ${MONTHS[m]}?`,
    choices: (p) => dayChoices(p).list,
    solve: ([yr, m, d]) => {
      const w = (firstDay(yr, m) + d - 1) % 7;
      return { steps: [st("column", "find the date's column", CAL, [d], DAYS[w])], answer: dayChoices([yr, m, d]).list.indexOf(DAYS[w]) };
    },
    // independent: the computer's own calendar
    validate: ([yr, m, d], v) => dayChoices([yr, m, d]).list[v as number] === DAYS[new Date(Date.UTC(2026 + yr, m, d)).getUTCDay()],
    bugs: (p) => {
      const { list: cs, w } = dayChoices(p);
      return [
        bug("next-column", "procedural", CAL, "The day of the next column was read. Keep your finger on the date and go straight up to the top of its column.", cs.indexOf(DAYS[mod(w + 1, 7)])),
        bug("previous-column", "procedural", CAL, "The day of the column before was read. Go straight up from the date to the day at the top.", cs.indexOf(DAYS[mod(w - 1, 7)])),
      ];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} is in the ${s.value} column.`,
    domain: [[0, 1], [0, 11], [1, 31]],
    cap: 300,
    difficulty: ([yr, m, d]) => (cellOf(yr, m, d).row === 0 ? 1 : d <= 21 ? 2 : 3),
    figure: ([yr, m]) => calendar(yr, m),
    word: ([yr, m, d]) => `${nm(m + d)}'s school annual day is on ${d} ${MONTHS[m]} ${2026 + yr}. On which day of the week is it? Use the calendar.`,
    teach: {
      idea: "On a calendar every date sits under the name of its day of the week.",
      method: "Find the date in the calendar, then move straight up its column to read the day at the top.",
      visual: ([yr, m]) => calendar(yr, m),
      alternatives: [
        { id: "add7", title: "Jump by weeks", kind: "procedural", text: ["Dates 7 apart fall on the same day.", "Take 7 away again and again until you reach a date in the first row, and read its day."] },
      ],
    },
    limits: "Dates in 2026 and 2027 with the month's calendar shown.",
  },
  {
    id: "aacalpat",
    arity: 5,
    title: "Patterns on a calendar: moving down, up and along the diagonals",
    competency: NPAT,
    type: "integer",
    mc: true,
    // [yr, m, d, kind, k]: from date d move k times: kind 0 down a row, 1 down and right, 2 down and left, 3 up a row
    parse: none,
    reject: guard([[0, 1], [0, 11], [1, 31], [0, 3], [1, 3]], ([yr, m, d, kind, k]) => {
      if (d > MLEN[m]) return false;
      const { col } = cellOf(yr, m, d);
      const [dr, dc] = CALMOVE[kind];
      const t = d + k * (7 * dr + dc);
      return t >= 1 && t <= MLEN[m] && col + k * dc >= 0 && col + k * dc <= 6;
    }, "A move that stays inside the month's calendar."),
    prompt: ([yr, m, d, kind, k]) => {
      const move = ["straight down one row", "one row down and one column to the right", "one row down and one column to the left", "straight up one row"][kind];
      return `On the calendar for ${MONTHS[m]} ${2026 + yr}, start at ${d}. Move ${move}, ${k === 1 ? "once" : `${k} times`}. Which date do you reach?`;
    },
    solve: ([, , d, kind, k]) => {
      const [dr, dc] = CALMOVE[kind];
      const step = 7 * dr + dc;
      return { steps: [st("rule", "find the change for one move", NPAT, [dr, dc], step), st("apply", "add the change each time", ADD, [d, k], d + k * step)], answer: d + k * step };
    },
    // independent: read the date in the drawn calendar grid, k cells away
    validate: ([yr, m, d, kind, k], v) => {
      const rows = (calendar(yr, m) as unknown as { rows: (number | string)[][] }).rows;
      const row = rows.findIndex((r) => r.includes(d));
      const col = row < 0 ? -1 : rows[row].indexOf(d);
      const [dr, dc] = CALMOVE[kind];
      return row > 0 && rows[row + k * dr]?.[col + k * dc] === v && row + k * dr > 0;
    },
    bugs: ([, m, d, kind, k]) => {
      const [dr, dc] = CALMOVE[kind];
      const right = d + k * (7 * dr + dc);
      return [
        bug("ten-per-row", "conceptual", NPAT, "Each row was taken to add 10, as on a hundred chart. A calendar row has 7 days, so one row down adds 7.", dr > 0 ? d + k * (10 * dr + dc) : null),
        bug("forgot-sideways", "procedural", NPAT, `Only the move down was made. Each diagonal move also goes one column ${dc > 0 ? "right (one more day)" : "left (one day fewer)"}.`, dc !== 0 ? d + 7 * k : null),
        bug("wrong-way", "conceptual", NPAT, `The move went the wrong way. ${dr > 0 ? "Down" : "Up"} means ${dr > 0 ? "later dates" : "earlier dates"}.`, dc === 0 && d - 7 * k * dr !== right && d - 7 * k * dr >= 1 && d - 7 * k * dr <= MLEN[m] ? d - 7 * k * dr : null),
      ];
    },
    // only dates of the month shown are offered
    range: ([, m]) => [1, MLEN[m]],
    distractors: ([, m, d, kind, k]) => {
      const right = d + k * (7 * CALMOVE[kind][0] + CALMOVE[kind][1]);
      return [right + 1, right - 1, right + 7, right - 7, right + 2, right - 2].filter((x) => x >= 1 && x <= MLEN[m]);
    },
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `One move changes the date by ${s.value}.` : `${s.inputs[0]} + ${s.inputs[1]} moves: ${s.value}.`),
    domain: [[0, 1], [0, 11], [1, 31], [0, 3], [1, 3]],
    cap: 300,
    difficulty: ([, , , kind, k]) => (kind === 0 && k === 1 ? 1 : kind === 0 || kind === 3 ? 2 : 3),
    figure: ([yr, m]) => calendar(yr, m),
    word: ([yr, m, d, kind, k]) =>
      kind === 0
        ? `${nm(d)} has a swimming class on ${d} ${MONTHS[m]} ${2026 + yr} and then every week on the same day. On which date is the class ${k} week${k > 1 ? "s" : ""} later? Use the calendar.`
        : kind === 3
          ? `${nm(d)}'s music exam is on ${d} ${MONTHS[m]} ${2026 + yr}. The practice test was ${k} week${k > 1 ? "s" : ""} earlier, on the same day of the week. On which date was it? Use the calendar.`
          : `In a calendar game, ${nm(d)} puts a counter on ${d} in the calendar for ${MONTHS[m]} ${2026 + yr}. Each turn it moves one row down and one column to the ${kind === 1 ? "right" : "left"}. Where is it after ${k} turn${k > 1 ? "s" : ""}?`,
    teach: {
      idea: "A calendar has a pattern: going down one row adds 7, going right adds 1, so a step down-right adds 8 and a step down-left adds 6.",
      method: "Work out how much one move adds or takes away, then add it once for each move.",
      visual: ([yr, m]) => calendar(yr, m),
      alternatives: [
        { id: "square", title: "Look at a 2 by 2 square", kind: "conceptual", text: ["Take any four dates in a square, like 5, 6, 12, 13.", "Down adds 7 (5 to 12), right adds 1 (5 to 6), down-right adds 8 (5 to 13), down-left adds 6 (6 to 12)."] },
      ],
    },
    limits: "Moves of 1 to 3 steps inside one month of 2026 or 2027.",
  },

  // ================================================================ MATH.measurement.money-totals: the same amount in different ways
  {
    id: "aaways",
    arity: 2,
    title: "Another way to make the same amount",
    competency: MON,
    type: "choice",
    // [lvl, seed]: lvl 0 up to ₹20 with ₹1–₹20, lvl 1 up to ₹500 with coins and notes up to ₹500
    parse: none,
    reject: guard([[0, 1], [0, 99]], ([lvl, seed]) => waysOf(lvl, seed) !== null, "An amount that can be made in at least two ways."),
    prompt: ([lvl, seed]) => {
      const w = waysOf(lvl, seed)!;
      return `${nm(seed)} makes ₹${w.N} with the money in the picture: ${moneyStr(w.shown)}. Which of these is another way to make exactly ₹${w.N}?`;
    },
    choices: ([lvl, seed]) => waysOf(lvl, seed)!.list,
    solve: ([lvl, seed]) => {
      const w = waysOf(lvl, seed)!;
      return { steps: [st("total", "add the values", ADD, [w.R], w.N), st("pick", "compare", MON, [w.N], w.R)], answer: w.list.indexOf(w.R) };
    },
    // independent: add up the chosen option rupee by rupee; it must make the amount and be a different collection
    validate: ([lvl, seed], v) => {
      const w = waysOf(lvl, seed)!;
      const c = w.list[v as number];
      if (!c) return false;
      let t = 0;
      for (const x of c.match(/₹(\d+)/g) ?? []) for (let i = 0; i < Number(x.slice(1)); i++) t++;
      return t === w.N && c !== moneyStr(w.shown);
    },
    bugs: ([lvl, seed]) => {
      const w = waysOf(lvl, seed)!;
      return [
        bug("same-count", "conceptual", COIN, `The choice with the same number of coins and notes was picked. That one makes ₹${sumStr(w.same)}. Different coins can make the same amount; add up the values to check.`, w.list.indexOf(w.same)),
        bug("added-wrong", "procedural", ADD, `This one adds up to ₹${sumStr(w.w2)}, not ₹${w.N}. Add the values one by one, starting with the biggest.`, w.list.indexOf(w.w2)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `${s.inputs[0]} makes ₹${s.value}.` : `So ${s.value} is another way.`),
    domain: [[0, 1], [0, 99]],
    cap: 300,
    difficulty: ([lvl, seed]) => (lvl === 0 && waysOf(lvl, seed)!.N <= 12 ? 1 : lvl === 0 ? 2 : 3),
    figure: ([lvl, seed]) => ({ type: "coins", items: [...waysOf(lvl, seed)!.shown].sort((a, b) => b - a) }),
    word: ([lvl, seed]) => {
      const w = waysOf(lvl, seed)!;
      return `A ${lvl ? "school bag" : "packet of crayons"} costs ₹${w.N}. ${nm(seed + 1)} could pay with the money in the picture, ${moneyStr(w.shown)}, but wants to keep those for later. Which of these other collections also pays exactly ₹${w.N}?`;
    },
    teach: {
      idea: "The same amount can be made with different coins and notes: ₹10 is one ₹10 coin, or two ₹5 coins, or five ₹2 coins.",
      method: "Add up the values in each choice, biggest first. The one that comes to the same amount is another way to make it.",
      visual: ([lvl, seed]) => ({ type: "coins", items: [...waysOf(lvl, seed)!.shown].sort((a, b) => b - a) }),
      alternatives: [
        { id: "swap", title: "Swap a coin for smaller ones", kind: "conceptual", text: ["Change one coin or note for smaller ones worth the same: a ₹5 for a ₹2, a ₹2 and a ₹1.", "The total stays the same, but the collection is different."], visual: () => ({ type: "coins", items: [5, 2, 2, 1] }) },
      ],
    },
    limits: "Up to ₹20 with ₹1, ₹2, ₹5, ₹10 and ₹20 (up to 5 pieces), and up to ₹500 with coins and notes up to ₹500 (up to 6 pieces).",
  },

  // ================================================================ MATH.number.place-value-tens: grouping into tens, number names
  {
    id: "aabund",
    arity: 3,
    title: "Counting a collection by making groups of ten",
    competency: PV,
    type: "integer",
    mc: true,
    // [rows, seed, kind]: rows of 5–11 shells in the picture; kind 0 how many full tens, 1 how many left over, 2 how many in all
    parse: none,
    reject: guard([[3, 9], [0, 19], [0, 2]], ([rows, seed, kind]) => {
      const n = bundRows(rows, seed).reduce((a, b) => a + b, 0);
      return n <= 99 && n >= 21 && (kind !== 1 || n % 10 !== 0);
    }, "21 to 99 shells in rows of different lengths."),
    prompt: ([rows, seed, kind]) =>
      `The shells in the picture lie in rows of different lengths. ${nm(seed + rows)} puts them into groups of ten. ${["How many full groups of ten can be made?", "How many shells are left over, not in a full group of ten?", "How many shells are there in all?"][kind]}`,
    solve: ([rows, seed, kind]) => {
      const n = bundRows(rows, seed).reduce((a, b) => a + b, 0);
      const ans = [Math.floor(n / 10), n % 10, n][kind];
      return { steps: [st("group", "make groups of ten", PV, [n], `${Math.floor(n / 10)} tens and ${n % 10} ones`), st("read", "read", PV, [kind], ans)], answer: ans };
    },
    // independent: put the shells one at a time into a bag, closing a bag each time it holds ten
    validate: ([rows, seed, kind], v) => {
      let bags = 0;
      let open = 0;
      let all = 0;
      for (const r of bundRows(rows, seed)) for (let i = 0; i < r; i++) {
        all++;
        open++;
        if (open === 10) {
          bags++;
          open = 0;
        }
      }
      return v === [bags, open, all][kind];
    },
    bugs: ([rows, seed, kind]) => {
      const rs = bundRows(rows, seed);
      const n = rs.reduce((a, b) => a + b, 0);
      return kind === 0
        ? [bug("rows-as-tens", "conceptual", PV, "Each row was taken as a group of ten. The rows have different lengths; make new groups of exactly ten.", rows !== Math.floor(n / 10) ? rows : null)]
        : kind === 1
          ? [bug("last-row", "procedural", PV, "The shells in the last row were given. The left-over shells are the ones that do not fill a group of ten after all the grouping.", rs[rows - 1] !== n % 10 ? rs[rows - 1] : null)]
          : [
            bug("rows-as-tens", "conceptual", PV, "Each row was counted as ten. Count the shells into groups of exactly ten.", rows * 10 !== n ? rows * 10 : null),
            bug("tens-only", "procedural", PV, "The left-over shells were not counted. Add the ones after the tens.", n % 10 ? n - (n % 10) : null),
          ];
    },
    variants: () => [],
    explain: (s) => (s.id === "group" ? `Grouping gives ${s.value}.` : `So the answer is ${s.value}.`),
    domain: [[3, 9], [0, 19], [0, 2]],
    cap: 300,
    difficulty: ([rows]) => (rows <= 4 ? 1 : rows <= 6 ? 2 : 3),
    figure: ([rows, seed]) => ({ type: "pictograph", labels: bundRows(rows, seed).map((_, i) => `Row ${i + 1}`), counts: bundRows(rows, seed), key: 1 }),
    word: ([rows, seed, kind]) => `${nm(seed)} collects the eggs in the picture from the hens and packs them into trays of ten. ${["How many full trays are there?", "How many eggs are left without a full tray?", "How many eggs are there in all?"][kind]}`,
    teach: {
      idea: "Counting a big collection is easier in groups of ten: 4 groups of ten and 7 more is 47.",
      method: "Circle ten at a time, crossing them out as you go, until fewer than ten are left. The groups are the tens digit and the ones left are the ones digit.",
      visual: ([rows, seed]) => {
        const n = bundRows(rows, seed).reduce((a, b) => a + b, 0);
        return { type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 };
      },
      alternatives: [
        { id: "sticks", title: "Bundle sticks", kind: "conceptual", text: ["Take ice-cream sticks for the shells and tie every ten with a rubber band.", "Count the bundles in tens and the loose sticks in ones."] },
      ],
    },
    limits: "21 to 99 things in 3 to 9 uneven rows; hundreds are other families.",
  },
  {
    id: "aaname",
    arity: 1,
    title: "The number name of a two-digit number",
    competency: PV,
    type: "choice",
    // [n]
    parse: none,
    reject: guard([[10, 99]], ([n]) => nameChoices(n).list.length === 4, "A number from 10 to 99."),
    prompt: ([n]) => `Which is the number name of ${n}?`,
    choices: ([n]) => nameChoices(n).list,
    solve: ([n]) => {
      const c = nameChoices(n);
      return { steps: [st("tens", "name the tens", PV, [Math.floor(n / 10)], c.R), st("name", "write the name", PV, [n], c.R)], answer: c.list.indexOf(c.R) };
    },
    // independent: add up the values of the words in the chosen name
    validate: ([n], v) => wordValue(nameChoices(n).list[v as number] ?? "") === n,
    bugs: ([n]) => {
      const c = nameChoices(n);
      return [
        bug("reversed", "procedural", PV, "The digits were named the other way round. The first digit is the tens, the second the ones.", ix(c.list, c.rev)),
        bug("teen-ty", "recall", PV, "A -teen and a -ty word were mixed up. Fourteen is 14 (ten and four); forty is 40 (four tens).", ix(c.list, c.teen)),
        bug("digit-by-digit", "conceptual", PV, "Each digit was named on its own. The first digit stands for tens, so it has a tens name like twenty or sixty.", ix(c.list, c.digit)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "tens" ? `The tens digit is ${s.inputs[0]}.` : `${s.inputs[0]} is written ${s.value}.`),
    domain: [[10, 99]],
    difficulty: ([n]) => (n % 10 === 0 ? 1 : n < 20 ? 3 : 2),
    figure: ([n]) => table(["Tens", "Ones"], [[Math.floor(n / 10), n % 10]]),
    word: ([n]) => `${nm(n)} writes a receipt for ₹${n} collected for a school trip. The receipt asks for the amount in words too. Which words are right?`,
    teach: {
      idea: "A two-digit number's name says the tens first (twenty, thirty …) and then the ones; 11 to 19 have their own names (eleven to nineteen).",
      method: "Name the tens digit as a tens word, add a hyphen and the ones word: 47 is forty-seven. For 11 to 19 use the teen word.",
      visual: () => table(["Tens", "Name"], [2, 3, 4, 5, 6, 7, 8, 9].map((t) => [t * 10, TENS[t]])),
      alternatives: [
        { id: "say_it", title: "Say it, then write it", kind: "procedural", text: ["Read the number aloud the way you say it: 'sixty-three'.", "Write the two words you said, joined with a hyphen."], visual: ([n]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 }) },
      ],
    },
    limits: "Choosing the right name for 10 to 99; writing the name in full is an educator-marked task (written.v1).",
  },

  // ================================================================ MATH.measurement.non-standard-units: comparing measured lengths
  {
    id: "aaspan",
    arity: 4,
    title: "Comparing lengths measured in hand spans, clips or sticks",
    competency: NSU,
    type: "choice",
    // [kind, a, b, c]: kind 0 two things measured with the same unit (a and b units long); kind 1 one thing measured with two units (a of the first, b of the second)
    parse: none,
    reject: guard([[0, 1], [3, 15], [3, 15], [0, 2]], () => true, "Lengths of 3 to 15 units."),
    prompt: ([kind, a, b, c]) =>
      kind === 0
        ? `${nm(a + b)} measures with hand spans. The ${SPAN_OBJ[c][0]} is ${a} spans long and the ${SPAN_OBJ[c][1]} is ${b} spans long, as in the picture. Which is longer?`
        : `The same ${SPAN_UNIT[c][2]} was measured twice (see the table): it is ${a} ${SPAN_PL[SPAN_UNIT[c][0]]} long and ${b} ${SPAN_PL[SPAN_UNIT[c][1]]} long. Which is longer, one ${SPAN_UNIT[c][0]} or one ${SPAN_UNIT[c][1]}?`,
    choices: spanChoices,
    solve: (p) => {
      const r = spanWant(p);
      return { steps: [st("compare", p[0] === 0 ? "compare the counts" : "fewer units means a longer unit", NSU, [p[1], p[2]], r)], answer: spanChoices(p).indexOf(r) };
    },
    // independent: kind 0 match the spans one to one; kind 1 work out each unit's length as a share of the same length
    validate: (p, v) => {
      const [kind, a, b, c] = p;
      const ch = spanChoices(p)[v as number];
      if (kind === 0) {
        let x = a;
        let y = b;
        while (x > 0 && y > 0) {
          x--;
          y--;
        }
        return ch === (x > 0 ? `the ${SPAN_OBJ[c][0]}` : y > 0 ? `the ${SPAN_OBJ[c][1]}` : "both are the same length");
      }
      const L = a * b;
      const u1 = L / a;
      const u2 = L / b;
      return ch === (u1 > u2 ? `a ${SPAN_UNIT[c][0]}` : u1 < u2 ? `a ${SPAN_UNIT[c][1]}` : "both are the same length");
    },
    bugs: (p) => {
      const [kind, a, b, c] = p;
      const cs = spanChoices(p);
      if (a === b) return [bug("one-must-win", "conceptual", NSU, "One was chosen, but the two counts are the same, so the two lengths are the same.", ixs(cs, kind === 0 ? [`the ${SPAN_OBJ[c][0]}`, `the ${SPAN_OBJ[c][1]}`] : [`a ${SPAN_UNIT[c][0]}`, `a ${SPAN_UNIT[c][1]}`]))];
      return kind === 0
        ? [bug("fewer-is-longer", "conceptual", NSU, "The one with fewer spans was chosen. With the same hand, more spans means a longer thing.", cs.indexOf(a > b ? `the ${SPAN_OBJ[c][1]}` : `the ${SPAN_OBJ[c][0]}`))]
        : [bug("more-units-longer", "conceptual", NSU, "The unit used more times was taken as the longer unit. A longer unit fits fewer times into the same length.", cs.indexOf(a > b ? `a ${SPAN_UNIT[c][0]}` : `a ${SPAN_UNIT[c][1]}`))];
    },
    variants: () => [],
    explain: (s) => `Compare ${s.inputs[0]} and ${s.inputs[1]}: ${s.value}.`,
    domain: [[0, 1], [3, 15], [3, 15], [0, 2]],
    cap: 300,
    difficulty: ([kind, a, b]) => (kind === 0 && a !== b ? 1 : kind === 0 ? 2 : 3),
    figure: ([kind, a, b, c]) => (kind === 0 ? { type: "bars", title: "hand spans", labels: [SPAN_OBJ[c][0], SPAN_OBJ[c][1]], values: [a, b], scale: 1 } : table(["Measured with", "How many"], [[SPAN_UNIT[c][0], a], [SPAN_UNIT[c][1], b]])),
    word: ([kind, a, b, c]) =>
      kind === 0
        ? `At home, ${nm(a)} uses the same hand to measure the ${SPAN_OBJ[c][0]} (${a} spans) and the ${SPAN_OBJ[c][1]} (${b} spans), as in the picture. Which is longer?`
        : `${nm(a)} lays ${SPAN_PL[SPAN_UNIT[c][0]]} end to end along a ${SPAN_UNIT[c][2]} and counts ${a}; ${nm(b + 1)} lays ${SPAN_PL[SPAN_UNIT[c][1]]} along the same ${SPAN_UNIT[c][2]} and counts ${b}, as in the table. Which is longer, one ${SPAN_UNIT[c][0]} or one ${SPAN_UNIT[c][1]}?`,
    teach: {
      idea: "With the same unit, the bigger count is the longer thing. When one length is measured with two units, the longer unit fits fewer times.",
      method: "Same unit: compare the counts. Two units on one length: the unit with the smaller count is the longer one.",
      visual: ([kind, a, b, c]) => (kind === 0 ? { type: "bars", labels: [SPAN_OBJ[c][0], SPAN_OBJ[c][1]], values: [a, b], scale: 1 } : { type: "numberline", from: 0, to: a * b, step: Math.max(a, b) }),
      alternatives: [
        { id: "feet", title: "Big steps and small steps", kind: "conceptual", text: ["Walk across a room with big steps and then with tiny steps.", "You need fewer big steps: a longer unit fits fewer times."] },
      ],
    },
    limits: "Two lengths in one unit, or one length in two units, counts 3 to 15; measuring itself is aaclip.",
  },

  // ================================================================ MATH.algebra.repeating-patterns: weaving patterns as ordered sequences
  {
    id: "aaweave",
    arity: 4,
    title: "Weaving patterns: over and under as an ordered sequence",
    competency: PAT,
    type: "integer",
    mc: true,
    // [o, u, n, kind]: a strip goes over o, under u, again and again; kind 0 how many overs in the first n crossings, 1 at which crossing is the n-th under
    parse: none,
    reject: guard([[1, 3], [1, 3], [10, 40], [0, 1]], ([o, u, n, kind]) => kind === 0 || n <= 25, "A weave of over 1–3, under 1–3."),
    prompt: ([o, u, n, kind]) => {
      const show = weaveSeq(o, u, 2 * (o + u)).join(", ");
      return `A mat is woven with a strip that goes over ${o} and under ${u}, again and again: ${show}, … ${kind === 0 ? `In the first ${n} crossings, how many times does the strip go over?` : `At which crossing (counting from the first) does the strip go under for the ${nth(n)} time?`}`;
    },
    solve: ([o, u, n, kind]) => {
      const L = o + u;
      if (kind === 0) {
        const ans = Math.floor(n / L) * o + Math.min(n % L, o);
        return { steps: [st("repeat", "find the repeating part", PAT, [o, u], L), st("count", "full repeats and the part left", PAT, [Math.floor(n / L), n % L], ans)], answer: ans };
      }
      const ans = Math.floor((n - 1) / u) * L + o + ((n - 1) % u) + 1;
      return { steps: [st("repeat", "find the repeating part", PAT, [o, u], L), st("place", "find the place", PAT, [Math.floor((n - 1) / u), (n - 1) % u], ans)], answer: ans };
    },
    // independent: write the crossings out one by one and count
    validate: ([o, u, n, kind], v) => {
      const s = weaveSeq(o, u, 400);
      if (kind === 0) return v === s.slice(0, n).filter((x) => x === "over").length;
      let c = 0;
      for (let i = 0; i < s.length; i++) if (s[i] === "under" && ++c === n) return v === i + 1;
      return false;
    },
    bugs: ([o, u, n, kind]) => {
      const L = o + u;
      if (kind === 0) {
        const ans = Math.floor(n / L) * o + Math.min(n % L, o);
        return [
          bug("full-repeats-only", "procedural", PAT, "Only the full repeats were counted; the crossings after the last full repeat were left out.", Math.floor(n / L) * o !== ans ? Math.floor(n / L) * o : null),
          bug("counted-unders", "procedural", PAT, "The unders were counted. The question asks how many times the strip goes over.", n - ans !== ans ? n - ans : null),
        ];
      }
      const ans = Math.floor((n - 1) / u) * L + o + ((n - 1) % u) + 1;
      return [
        bug("unders-only", "conceptual", PAT, "Only the unders were counted, as if every crossing were an under. The overs in each repeat take places too.", n !== ans ? n : null),
        bug("one-repeat-off", "procedural", PAT, "One repeat too few was counted. Count how many full repeats come before this under.", ans - L > 0 ? ans - L : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "repeat" ? `The pattern repeats every ${s.value} crossings.` : `So the answer is ${s.value}.`),
    domain: [[1, 3], [1, 3], [10, 40], [0, 1]],
    cap: 300,
    difficulty: ([o, u, , kind]) => (kind === 0 && o + u <= 3 ? 1 : kind === 0 ? 2 : 3),
    figure: ([o, u]) => table(weaveSeq(o, u, 2 * (o + u)).map((_, i) => String(i + 1)), [weaveSeq(o, u, 2 * (o + u))]),
    word: ([o, u, n, kind]) => `A weaver in Kanchipuram weaves a border where the thread goes over ${nOf(o, "threads")} and under ${nOf(u, "threads")}, again and again, as in the picture. ${kind === 0 ? `In the first ${n} crossings, how many times does the thread go over?` : `At which crossing does the thread go under for the ${nth(n)} time?`}`,
    teach: {
      idea: "A weaving pattern is an ordered sequence that repeats: over 2, under 1 is the repeating part 'over, over, under'.",
      method: "Find the length of the repeating part. Count how many full repeats fit, then look at the crossings left in the last, unfinished repeat.",
      visual: ([o, u]) => table(["Repeat", ...weaveSeq(o, u, o + u).map((_, i) => String(i + 1))], [1, 2, 3].map((r) => [r, ...weaveSeq(o, u, o + u)])),
      alternatives: [
        { id: "rows", title: "One repeat per row", kind: "procedural", text: ["Write the crossings in rows, one repeating part in each row, numbering them as you go.", "Each row has the same overs and unders; count the rows and the part of the last row."] },
      ],
    },
    limits: "Over 1–3 and under 1–3 repeats, up to 40 crossings (or the 25th under); two-colour designs drawn on a grid are left to the teacher.",
  },

  // ================================================================ MATH.number.zero: multiplying by 1 and by 0
  {
    id: "aamul01",
    contract: { kind: "value", statement: ([kind, n]) => (kind < 4 ? [`${n}*1`, `1*${n}`, `${n}*0`, `0*${n}`][kind] : null) },
    arity: 2,
    title: "Multiplying by 1 and by 0",
    competency: ZERO,
    type: "integer",
    mc: true,
    // [kind, n]: kind 0 n × 1, 1 1 × n, 2 n × 0, 3 0 × n, 4 ☐ × 1 = n, 5 n × ☐ = n
    parse: none,
    reject: guard([[0, 5], [2, 999]], () => true, "A whole number from 2 to 999."),
    prompt: ([kind, n]) => [`Work out ${n} × 1.`, `Work out 1 × ${n}.`, `Work out ${n} × 0.`, `Work out 0 × ${n}.`, `What number goes in the box? ☐ × 1 = ${n}`, `What number goes in the box? ${n} × ☐ = ${n}`][kind],
    solve: ([kind, n]) => {
      const ans = [n, n, 0, 0, n, 1][kind];
      return { steps: [st("rule", kind <= 1 || kind >= 4 ? "multiplying by 1 keeps the number" : "multiplying by 0 gives 0", ZERO, [n], ans)], answer: ans };
    },
    // independent: multiplication as repeated addition, or the answer put back into the box
    validate: ([kind, n], v) => {
      if (typeof v !== "number") return false;
      const rep = (a: number, times: number) => {
        let s = 0;
        for (let i = 0; i < times; i++) s += a;
        return s;
      };
      if (kind === 0) return v === rep(n, 1);
      if (kind === 1) return v === rep(1, n);
      if (kind === 2) return v === rep(n, 0);
      if (kind === 3) return v === rep(0, n);
      if (kind === 4) return v * 1 === n;
      return n * v === n;
    },
    bugs: ([kind, n]) =>
      kind <= 1
        ? [
          bug("added-one", "conceptual", ZERO, "1 was added instead of multiplying by 1. One group of a number is the number itself.", n + 1),
          bug("gave-one", "conceptual", ZERO, "The answer was taken to be 1. Multiplying by 1 keeps the number the same.", 1),
        ]
        : kind <= 3
          ? [bug("like-adding-zero", "conceptual", ZERO, "Multiplying by 0 was treated like adding 0. Zero groups (or groups of zero) make nothing at all: the answer is 0.", n)]
          : kind === 4
            ? [bug("one-in-box", "procedural", ZERO, "1 was put in the box. Which number, taken once, gives the number on the right?", 1)]
            : [
              bug("zero-in-box", "conceptual", ZERO, "0 was put in the box. Anything times 0 is 0; to keep the number the same, multiply by 1.", 0),
              bug("number-in-box", "procedural", ZERO, "The number itself was put in the box. Check: the number times itself is much bigger.", n),
            ],
    variants: () => [],
    explain: (s) => `So the answer is ${s.value}.`,
    domain: [[0, 5], [2, 999]],
    // level@1: multiplying by 1 and by 0 is Grade 3 work (multiplication), though the family sits under zero
    grade: () => 3,
    cap: 300,
    difficulty: ([kind, n]) => (kind <= 1 && n < 100 ? 1 : kind <= 3 ? 2 : 3),
    word: ([kind, n]) =>
      [
        `There are ${n} plates at a wedding, with 1 sweet on each plate. How many sweets are there?`,
        `There is 1 box with ${n} pencils in it. How many pencils are there?`,
        `There are ${n} baskets, but every basket is empty (0 mangoes in each). How many mangoes are there?`,
        `In a game, each goal scores ${n} points. ${nm(n)} scores 0 goals. How many points does ${nm(n)} get from goals?`,
        `Some children each get 1 balloon, and ${n} balloons are given out. How many children are there?`,
        `${n} children each bring the same number of mangoes to school, and there are ${n} mangoes in all. How many mangoes does each child bring?`,
      ][kind],
    teach: {
      idea: "Any number times 1 is the number itself (one group of it). Any number times 0 is 0 (no groups, or groups with nothing in them).",
      method: "Times 1: write the number. Times 0: write 0. For a box, think which number keeps the other one the same or makes it 0.",
      visual: () => ({ type: "tenframe", filled: 0, frames: 1 }),
      alternatives: [
        { id: "groups", title: "Think of groups", kind: "conceptual", text: ["7 × 1 is 7 groups of 1 or 1 group of 7: either way 7.", "7 × 0 is 7 empty plates: nothing at all."], visual: () => ({ type: "array", rows: 1, cols: 7 }) },
      ],
    },
    limits: "Whole numbers from 2 to 999 multiplied by 1 or by 0, and the missing factor 1; dividing by 0 is not asked.",
  },
];
for (const d of GAP01) {
  const all = d.bugs;
  d.bugs = (p) => all(p).filter((b) => b.predict !== null);
}
B01.push(...GAP01);
