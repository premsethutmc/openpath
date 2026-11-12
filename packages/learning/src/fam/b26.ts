/**
 * Families b26 (families@2): the three ICSE (CISCE) Grade 5 outcomes that had no skill in OpenPath (icse-grade5@1 gaps).
 *   akromr  reading a Roman numeral                         Theme 1, learning outcome 7
 *   akromw  writing a number in Roman numerals (choice)      Theme 1, learning outcome 7
 *   aesym3  planes of symmetry of a cuboid or cube           Theme 6, learning outcome 8
 *   adline  reading a line graph                             Theme 9, learning outcome 2
 * All wording, contexts and pictures are OpenPath's own; nothing is taken from a textbook.
 */
import type { Bug, Def, Step, Value } from "../family-kit";

const ROM = "MATH.number.roman-numerals";
const SYM3 = "MATH.geometry.symmetry-3d";
const LINE = "MATH.statistics.line-graphs";
const none = () => null;
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: number | string): Step => ({ id, op, competency, inputs, value });

const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];

/** Explanations that predict the right answer, a negative or non-whole number, or the same wrong answer twice are dropped. */
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

// ---------------------------------------------------------------- Roman numerals
const ONES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const TENS = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"];
const HUNDREDS = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"];
/** The place parts of n (1 to 1000), largest first: 144 → C (100), XL (40), IV (4). */
const romanParts = (n: number): { sym: string; value: number }[] =>
  [
    { sym: n >= 1000 ? "M" : "", value: n >= 1000 ? 1000 : 0 },
    { sym: HUNDREDS[Math.floor((n % 1000) / 100)], value: Math.floor((n % 1000) / 100) * 100 },
    { sym: TENS[Math.floor((n % 100) / 10)], value: Math.floor((n % 100) / 10) * 10 },
    { sym: ONES[n % 10], value: n % 10 },
  ].filter((x) => x.value > 0);
const roman = (n: number) => romanParts(n).map((x) => x.sym).join("");
const LETTER: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/** Independent of the place tables: read letter by letter; a letter smaller than the one after it is taken away. */
const readRoman = (s: string, value: Record<string, number> = LETTER) => {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const [a, b] = [value[s[i]], value[s[i + 1]] ?? 0];
    total += a < b ? -a : a;
  }
  return total;
};
/** Every letter added, whatever its position (the "IV is 6" reading). */
const addAll = (s: string) => [...s].reduce((t, c) => t + LETTER[c], 0);
/** A properly written numeral up to 1000: at most three of a letter in a row, only the six allowed take-away pairs. */
const WELL_FORMED = /^M?(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const subtractive = (s: string) => /IV|IX|XL|XC|CD|CM/.test(s);
/** The numeral written with repeats only (no take-away pairs): 4 → IIII, 90 → LXXXX. */
const repeated = (n: number) => roman(n).replace(/CM/, "DCCCC").replace(/CD/, "CCCC").replace(/XC/, "LXXXX").replace(/XL/, "XXXX").replace(/IX/, "VIIII").replace(/IV/, "IIII");
/** A take-away pair that is not allowed, or the letters of a pair the wrong way round: 99 → IC, 4 → VI, 6 → IV. */
const wrongPair = (n: number) => {
  if (n % 100 === 99) return roman(n - 99) + "IC";
  if (n % 100 === 49) return roman(n - 49) + "IL";
  if (n % 100 === 45) return roman(n - 45) + "VL";
  if (n % 100 === 95) return roman(n - 95) + "VC";
  const swap: Record<number, string> = { 4: "VI", 6: "IV", 9: "XI" };
  if (swap[n % 10]) return roman(n - (n % 10)) + swap[n % 10];
  const tens = Math.floor((n % 100) / 10);
  const tswap: Record<number, string> = { 4: "LX", 6: "XL", 9: "CX" };
  return tswap[tens] ? roman(n - (n % 100)) + tswap[tens] + ONES[n % 10] : null;
};
/** The four options for writing n, in a fixed order that depends on n; the right numeral is one of them. */
const romanChoices = (n: number): string[] => {
  const right = roman(n);
  const out = [right];
  const add = (s: string | null) => {
    if (s && !out.includes(s) && out.length < 4) out.push(s);
  };
  if (subtractive(right)) add(repeated(n));
  add(wrongPair(n));
  for (const d of [1, -1, 10, -10, 5, -5, 2, 20, 100]) if (n + d >= 1 && n + d <= 1000) add(roman(n + d));
  const turn = n % 4;
  return [...out.slice(turn), ...out.slice(0, turn)].reverse();
};

// ---------------------------------------------------------------- planes of symmetry of a cuboid
/** Independent of the counting rule: reflect the eight corners in each of the nine candidate mirror planes of a box. */
const mirrorPlanes = ([a, b, c]: number[]) => {
  const corners: number[][] = [];
  for (const x of [-a, a]) for (const y of [-b, b]) for (const z of [-c, c]) corners.push([x, y, z]);
  const key = (q: number[]) => q.join(",");
  const all = new Set(corners.map(key));
  const maps: ((q: number[]) => number[])[] = [
    ([x, y, z]) => [-x, y, z], ([x, y, z]) => [x, -y, z], ([x, y, z]) => [x, y, -z],
    ([x, y, z]) => [y, x, z], ([x, y, z]) => [-y, -x, z],
    ([x, y, z]) => [x, z, y], ([x, y, z]) => [x, -z, -y],
    ([x, y, z]) => [z, y, x], ([x, y, z]) => [-z, y, -x],
  ];
  return maps.filter((f) => corners.every((q) => all.has(key(f(q))))).length;
};
/** How many pairs of the three edge lengths are equal (0 none, 1 one pair: two square faces, 3 a cube). */
const equalPairs = ([a, b, c]: number[]) => Number(a === b) + Number(b === c) + Number(a === c);

// ---------------------------------------------------------------- line graphs
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
type LineCtx = { title: string; labels: string[]; full: string[]; scales: number[]; read: (L: string) => string; more: (L1: string, L2: string) => string; rises: string; unit: string };
const DAYS = { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], full: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MONTHS = { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], full: ["January", "February", "March", "April", "May", "June"] };
const WEEKS = { labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"], full: ["week 1", "week 2", "week 3", "week 4", "week 5", "week 6"] };
const LINES: LineCtx[] = [
  { title: "Temperature at noon (°C)", ...DAYS, scales: [2, 5], unit: "°C", read: (L) => `What was the temperature at noon on ${L}, in °C?`, more: (a, b) => `How many degrees warmer was it at noon on ${a} than on ${b}?`, rises: "On how many days was the noon temperature higher than on the day before?" },
  { title: "Rainfall each month (mm)", ...MONTHS, scales: [10, 20, 50], unit: "mm", read: (L) => `How many millimetres of rain fell in ${L}?`, more: (a, b) => `How many more millimetres of rain fell in ${a} than in ${b}?`, rises: "In how many months did more rain fall than in the month before?" },
  { title: "Books borrowed from the library", ...WEEKS, scales: [5, 10, 20], unit: "books", read: (L) => `How many books were borrowed in ${L}?`, more: (a, b) => `How many more books were borrowed in ${a} than in ${b}?`, rises: "In how many weeks were more books borrowed than in the week before?" },
  { title: "Visitors to the science fair", ...DAYS, scales: [10, 50, 100], unit: "visitors", read: (L) => `How many visitors came on ${L}?`, more: (a, b) => `How many more visitors came on ${a} than on ${b}?`, rises: "On how many days did more visitors come than on the day before?" },
];
/** [ci, kind, s]: context, kind (0 read one point, 1 how much more, 2 how many rises), graph number. */
const lineData = ([ci, , s]: number[]) => {
  const ctx = LINES[ci];
  const r = rng(ci * 7919 + s * 104729 + 17);
  const sc = ctx.scales[s % ctx.scales.length];
  const ks: number[] = [];
  while (ks.length < 6) {
    const k = 1 + Math.floor(r() * 9);
    if (k !== ks.at(-1)) ks.push(k);
  }
  // two different points with different heights, the higher first
  let i = Math.floor(r() * 6);
  let j = Math.floor(r() * 6);
  for (let t = 0; t < 12 && (i === j || ks[i] === ks[j]); t++) j = (j + 1) % 6;
  if (ks[i] < ks[j]) [i, j] = [j, i];
  return { ctx, sc, ks, i, j };
};
const risesIn = (ks: number[]) => ks.filter((k, t) => t > 0 && k > ks[t - 1]).length;

export const B26: Def[] = [
  // ============================================================ reading a Roman numeral
  {
    id: "akromr",
    arity: 1,
    title: "Reading a Roman numeral",
    competency: ROM,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n]) => (!Number.isInteger(n) || n < 1 || n > 1000 ? "A whole number from 1 to 1000." : null),
    prompt: ([n]) => `What number does the Roman numeral ${roman(n)} stand for?`,
    solve: ([n]) => {
      const parts = romanParts(n);
      const steps = parts.map((x, i) => st(`part${i + 1}`, "read", ROM, [x.sym], x.value));
      return { steps: parts.length > 1 ? [...steps, st("total", "add", ROM, parts.map((x) => x.value), n)] : steps, answer: n };
    },
    // independent: read the numeral letter by letter (a smaller letter before a larger one is taken away)
    validate: ([n], v) => WELL_FORMED.test(roman(n)) && v === readRoman(roman(n)),
    bugs: ([n]) => {
      const s = roman(n);
      const swapped = { ...LETTER, L: 100, C: 50 };
      // a smaller letter written AFTER a larger one taken away as well, in the ones part (VI read as 4, VIII as 2)
      const ones = n % 10;
      const alwaysTake = ones >= 6 && ones <= 8 ? n - ones + (10 - ones) : null;
      return differ(n, [
        { id: "add-every-letter", kind: "conceptual", competency: ROM, says: "Every letter was added. A smaller letter written just before a larger one is taken away from it: IV is 5 − 1 = 4, not 6.", predict: subtractive(s) ? addAll(s) : null },
        { id: "take-away-after", kind: "conceptual", competency: ROM, says: "A smaller letter written after a larger one was taken away. Only a smaller letter written before a larger one is taken away; after it, it is added: VI is 5 + 1 = 6.", predict: alwaysTake },
        { id: "l-and-c-swapped", kind: "recall", competency: ROM, says: "L and C were mixed up. L stands for 50 and C stands for 100.", predict: /[LC]/.test(s) ? readRoman(s, swapped) : null },
      ]);
    },
    distractors: ([n]) => [n + 10, n + 1, n > 5 ? n - 5 : n + 5, n + 100].filter((v) => v > 0),
    variants: () => [],
    explain: (s) =>
      s.id === "total"
        ? `Add the parts: ${s.inputs.join(" + ")} = ${s.value}`
        : subtractive(String(s.inputs[0]))
          ? `${s.inputs[0]}: the smaller letter comes first, so it is taken away. ${s.inputs[0]} = ${s.value}`
          : `${s.inputs[0]} = ${s.value}`,
    domain: [[1, 1000]],
    cap: 400,
    difficulty: ([n]) => (n <= 39 ? 1 : n <= 399 ? 2 : 3),
    word: ([n]) => `The chapters of ${nm(n)}'s storybook are numbered in Roman numerals. ${nm(n)} is reading chapter ${roman(n)}. Which chapter number is that?`,
    teach: {
      idea: "Roman numerals use letters for numbers. Each letter always stands for the same number, and the letters are put together to make other numbers.",
      method: "Read the numeral from the left, one place part at a time. Letters written from larger to smaller are added. A smaller letter written just before a larger one is taken away from it. Then add the parts.",
      visual: () => ({ type: "table", head: ["I", "V", "X", "L", "C", "D", "M"], rows: [[1, 5, 10, 50, 100, 500, 1000]] }),
      alternatives: [
        { id: "letter_by_letter", title: "Go letter by letter", kind: "procedural", text: ["Write the value of each letter under it.", "Where a smaller value stands just before a larger one, take it away; add all the others."], visual: () => ({ type: "table", head: ["I", "V", "X", "L", "C", "D", "M"], rows: [[1, 5, 10, 50, 100, 500, 1000]] }) },
      ],
    },
    limits: "Numerals from I to M (1 to 1000); numbers above 1000 and the bar notation are not included.",
  },
  // ============================================================ writing a number in Roman numerals
  {
    id: "akromw",
    arity: 1,
    title: "Writing a number in Roman numerals",
    competency: ROM,
    type: "choice",
    parse: none,
    reject: ([n]) => (!Number.isInteger(n) || n < 1 || n > 1000 ? "A whole number from 1 to 1000." : romanChoices(n).length === 4 ? null : "Fewer than four different options."),
    prompt: ([n]) => `Which of these is ${n} written in Roman numerals?`,
    choices: ([n]) => romanChoices(n),
    solve: ([n]) => {
      const parts = romanParts(n);
      const pick = romanChoices(n).indexOf(roman(n));
      return {
        steps: [
          ...parts.map((x, i) => st(`part${i + 1}`, "write", ROM, [x.value], x.sym)),
          ...(parts.length > 1 ? [st("join", "join", ROM, parts.map((x) => x.sym), roman(n))] : []),
          st("pick", "choose the option", ROM, [roman(n)], pick),
        ],
        answer: pick,
      };
    },
    // independent: exactly one option is a properly written numeral that reads, letter by letter, as n
    validate: ([n], v) => {
      const ch = romanChoices(n);
      const ok = ch.map((c) => WELL_FORMED.test(c) && readRoman(c) === n);
      return typeof v === "number" && Number.isInteger(v) && ok.filter(Boolean).length === 1 && ok[v] === true;
    },
    bugs: ([n]) => {
      const ch = romanChoices(n);
      const at = (s: string | null) => (s && ch.includes(s) && s !== roman(n) ? ch.indexOf(s) : null);
      const list: Bug[] = [
        { id: "four-in-a-row", kind: "conceptual", competency: ROM, says: "A letter was repeated four times. A letter is written at most three times in a row; for 4 and 9 (and 40, 90, 400, 900) a smaller letter is written before the next larger one.", predict: subtractive(roman(n)) ? at(repeated(n)) : null },
        { id: "wrong-pair", kind: "procedural", competency: ROM, says: "The letters of a pair are in the wrong order, or the pair is not allowed. Only I before V or X, X before L or C, and C before D or M take away; a smaller letter after a larger one is added.", predict: at(wrongPair(n)) },
      ];
      return list.filter((b) => b.predict !== null);
    },
    variants: () => [],
    explain: (s) =>
      s.id === "pick"
        ? `That is option ${"ABCD"[Number(s.value)]}, so the answer is ${"ABCD"[Number(s.value)]}`
        : s.id === "join"
          ? `Write the parts side by side, largest first: ${s.value}`
          : `${s.inputs[0]} is written ${s.value}`,
    domain: [[1, 1000]],
    cap: 400,
    difficulty: ([n]) => (n <= 39 ? 1 : n <= 399 ? 2 : 3),
    word: ([n]) => `${nm(n)} is making a clock face and a page of chapter headings with Roman numerals. Which of these is the right way to write ${n}?`,
    teach: {
      idea: "A number is written in Roman numerals one place at a time: first the hundreds, then the tens, then the ones, each with its own letters.",
      method: "Split the number into hundreds, tens and ones. Write each part with its letters, using a take-away pair where a letter would be needed four times. Put the parts side by side, largest first.",
      visual: () => ({ type: "table", head: ["I", "V", "X", "L", "C", "D", "M"], rows: [[1, 5, 10, 50, 100, 500, 1000]] }),
      alternatives: [
        { id: "build_up", title: "Build it from the largest letter", kind: "procedural", text: ["Take the largest letter that fits and write it down. Take its value away from the number.", "Carry on with what is left until nothing remains, using a take-away pair where a letter would be needed four times."], visual: () => ({ type: "table", head: ["I", "V", "X", "L", "C", "D", "M"], rows: [[1, 5, 10, 50, 100, 500, 1000]] }) },
      ],
    },
    limits: "Numbers from 1 to 1000, as one of four options; typing a Roman numeral as the answer is not included.",
  },
  // ============================================================ planes of symmetry of a cuboid
  {
    id: "aesym3",
    arity: 3,
    title: "Mirror cuts of a box (planes of symmetry)",
    competency: SYM3,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (p.some((x) => !Number.isInteger(x) || x < 1 || x > 9) ? "Three whole-number edge lengths from 1 to 9 cm." : null),
    prompt: ([a, b, c]) =>
      `A solid block is ${a} cm long, ${b} cm wide and ${c} cm high. One straight flat cut can divide it into two halves that are mirror images of each other. In how many different ways can this be done?`,
    solve: (p) => {
      const pairs = equalPairs(p);
      const diagonal = pairs === 0 ? 0 : pairs === 1 ? 2 : 6;
      return { steps: [st("middle", "count", SYM3, p, 3), st("square", "count", SYM3, [pairs === 0 ? 0 : pairs === 1 ? 2 : 6], diagonal), st("total", "add", SYM3, [3, diagonal], 3 + diagonal)], answer: 3 + diagonal };
    },
    // independent: reflect the block's eight corners in each candidate mirror plane and count the planes that fit
    validate: (p, v) => v === mirrorPlanes(p),
    bugs: (p) => {
      const pairs = equalPairs(p);
      const answer = pairs === 0 ? 3 : pairs === 1 ? 5 : 9;
      return differ(answer, [
        { id: "middle-cuts-only", kind: "conceptual", competency: SYM3, says: "Only the cuts through the middle, parallel to the faces, were counted. A square face can also be cut from corner to corner.", predict: 3 },
        { id: "counted-faces", kind: "conceptual", competency: SYM3, says: "The faces were counted. A mirror cut goes through the middle of the block; it is not a face.", predict: 6 },
        { id: "diagonal-everywhere", kind: "conceptual", competency: SYM3, says: "Corner-to-corner cuts were counted for every pair of faces. A corner-to-corner cut gives mirror halves only on a square face.", predict: 9 },
        { id: "one-diagonal-per-square", kind: "procedural", competency: SYM3, says: "Only one corner-to-corner cut was counted for each pair of square faces. A square has two diagonals, so there are two such cuts.", predict: pairs === 0 ? null : pairs === 1 ? 4 : 6 },
      ]);
    },
    variants: () => [],
    explain: (s) =>
      s.id === "middle"
        ? "Cuts through the middle, parallel to a pair of faces: 3 (one for each pair of opposite faces)"
        : s.id === "square"
          ? s.value === 0
            ? "No face is a square, so no corner-to-corner cut gives mirror halves: 0"
            : s.value === 2
              ? "One pair of faces is square: a square can be cut along each of its 2 diagonals, so 2 more cuts"
              : "Every face is a square: 2 corner-to-corner cuts for each of the 3 pairs of faces, so 6 more cuts"
          : `Altogether: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`,
    domain: [[1, 9], [1, 9], [1, 9]],
    cap: 400,
    difficulty: (p) => (equalPairs(p) === 0 ? 1 : equalPairs(p) === 1 ? 2 : 3),
    figure: ([a, b, c]) => ({ type: "solid", name: a === b && b === c ? "cube" : "cuboid", dims: [`${a} cm`, `${b} cm`, `${c} cm`] }),
    word: ([a, b, c]) => `${nm(a + b + c)} has a block of soap ${a} cm long, ${b} cm wide and ${c} cm high, and wants to cut it with one straight cut into two halves that match like mirror images. How many different cuts are possible?`,
    teach: {
      idea: "A solid has mirror symmetry when a flat cut divides it into two halves that are mirror images. A box has such a cut through the middle of each pair of opposite faces; a square face allows corner-to-corner cuts as well.",
      method: "Count the cuts through the middle, parallel to each pair of opposite faces. Then look for square faces: each pair of square faces adds a cut along each diagonal. Add the two counts.",
      visual: ([a, b, c]) => ({ type: "solid", name: a === b && b === c ? "cube" : "cuboid", dims: [`${a} cm`, `${b} cm`, `${c} cm`] }),
      alternatives: [
        { id: "fold_the_face", title: "Look at one face at a time", kind: "conceptual", text: ["Look straight at one face of the block. Every line of symmetry of that face that goes right through the block gives a mirror cut.", "A rectangle has two lines of symmetry; a square has four. Do this for each pair of faces, counting each cut once."], visual: ([a, b, c]) => ({ type: "solid", name: a === b && b === c ? "cube" : "cuboid", dims: [`${a} cm`, `${b} cm`, `${c} cm`] }) },
      ],
    },
    limits: "Cuboids and cubes with whole-number edges; cylinders, cones, spheres and prisms on other bases are not included.",
  },
  // ============================================================ reading a line graph
  {
    id: "adline",
    arity: 3,
    title: "Reading a line graph",
    competency: LINE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([ci, kind, s]) => (ci < 0 || ci >= LINES.length || kind < 0 || kind > 2 || s < 0 || s > 29 ? "A line graph (0–3), a kind (0 read a point, 1 how much more, 2 how many rises), a graph number (0–29)." : null),
    prompt: (p) => {
      const { ctx, i, j } = lineData(p);
      return `The line graph shows ${ctx.title.replace(/ \(.*\)$/, "").toLowerCase()}. Read the scale carefully. ${p[1] === 0 ? ctx.read(ctx.full[i]) : p[1] === 1 ? ctx.more(ctx.full[i], ctx.full[j]) : ctx.rises}`;
    },
    solve: (p) => {
      const { ks, sc, i, j } = lineData(p);
      const [x, y] = [ks[i] * sc, ks[j] * sc];
      if (p[1] === 0) return { steps: [st("read1", "read", LINE, [ks[i], sc], x)], answer: x };
      if (p[1] === 1) return { steps: [st("read1", "read", LINE, [ks[i], sc], x), st("read2", "read", LINE, [ks[j], sc], y), st("compare", "subtract", LINE, [x, y], x - y)], answer: x - y };
      return { steps: [st("rises", "count", LINE, ks.map((k) => k * sc), risesIn(ks))], answer: risesIn(ks) };
    },
    // independent: build each point's value by counting up the scale line by line, then answer from those values
    validate: (p, v) => {
      const { ks, sc, i, j } = lineData(p);
      const up = (k: number) => {
        let t = 0;
        for (let m = 0; m < k; m++) t += sc;
        return t;
      };
      const vals = ks.map(up);
      let rises = 0;
      for (let t = 1; t < vals.length; t++) if (vals[t] - vals[t - 1] > 0) rises++;
      return v === (p[1] === 0 ? vals[i] : p[1] === 1 ? vals[i] - vals[j] : rises);
    },
    bugs: (p) => {
      const { ks, sc, i, j } = lineData(p);
      const answer = p[1] === 0 ? ks[i] * sc : p[1] === 1 ? (ks[i] - ks[j]) * sc : risesIn(ks);
      const falls = ks.filter((k, t) => t > 0 && k < ks[t - 1]).length;
      const list: Bug[] =
        p[1] === 2
          ? [
              { id: "counted-falls", kind: "conceptual", competency: LINE, says: "The times the line goes down were counted. A higher value than the time before is where the line goes up.", predict: falls },
              { id: "counted-every-change", kind: "procedural", competency: LINE, says: "Every change was counted, the rises and the falls. Count only the parts where the line goes up.", predict: 5 },
              { id: "counted-points", kind: "procedural", competency: LINE, says: "The points were counted. Look at the line between one point and the next: does it go up?", predict: 6 },
            ]
          : [
              { id: "count-lines", kind: "conceptual", competency: LINE, says: `The lines were counted as 1 each. On this graph each line on the scale stands for ${sc}.`, predict: p[1] === 0 ? ks[i] : ks[i] - ks[j] },
              ...(p[1] === 0 ? [{ id: "next-point", kind: "procedural", competency: LINE, says: "The point beside it was read. Go straight up from the name at the bottom to the point, then across to the scale.", predict: ks[i < 5 ? i + 1 : i - 1] * sc } as Bug] : []),
              ...(p[1] === 1 ? [{ id: "add-for-more", kind: "conceptual", competency: LINE, says: "\"How much more\" asks for the difference between the two points, not their total.", predict: (ks[i] + ks[j]) * sc } as Bug, { id: "one-point-only", kind: "procedural", competency: LINE, says: "Only one of the two points was read. Read both, then find the difference.", predict: ks[i] * sc } as Bug] : []),
            ];
      return differ(answer, list);
    },
    variants: () => [],
    explain: (s) =>
      s.id === "read1" || s.id === "read2"
        ? `The point is ${s.inputs[0]} lines up; each line is ${s.inputs[1]}, so it shows ${s.value}`
        : s.id === "compare"
          ? `How much more: ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}`
          : `The values in order are ${s.inputs.join(", ")}. The line goes up ${s.value} time${s.value === 1 ? "" : "s"}`,
    domain: [[0, LINES.length - 1], [0, 2], [0, 29]],
    cap: 360,
    difficulty: ([, kind, s]) => (kind === 0 ? (s % 2 ? 2 : 1) : kind === 1 ? 2 : 3),
    figure: (p) => {
      const { ctx, ks, sc } = lineData(p);
      return { type: "linegraph", title: ctx.title, labels: ctx.labels, values: ks.map((k) => k * sc), scale: sc };
    },
    word: (p) => {
      const { ctx, i, j } = lineData(p);
      const who = nm(p[0] + p[2]);
      return `${who} found this line graph in a newspaper. ${p[1] === 0 ? ctx.read(ctx.full[i]) : p[1] === 1 ? ctx.more(ctx.full[i], ctx.full[j]) : ctx.rises}`;
    },
    teach: {
      idea: "A line graph shows how something changes over time. Each point shows the value at one time; the line joining the points shows whether it went up, went down or stayed the same.",
      method: "Find the time along the bottom and go straight up to the point. Go across to the scale and read the value, counting in steps of the scale. To compare two times, read both points and subtract. Where the line slopes up, the value rose.",
      visual: (p) => {
        const { ctx, ks, sc } = lineData(p);
        return { type: "linegraph", title: ctx.title, labels: ctx.labels, values: ks.map((k) => k * sc), scale: sc };
      },
      alternatives: [
        { id: "make_a_table", title: "Turn the graph into a table", kind: "procedural", text: ["Read every point in turn and write its value in a table, under its time.", "Answer the question from the table: read one value, subtract two, or see where the values go up."], visual: (p) => {
          const { ctx, ks, sc } = lineData(p);
          return { type: "table", head: ["", ...ctx.labels], rows: [[ctx.unit, ...ks.map((k) => k * sc)]] };
        } },
      ],
    },
    limits: "Six points that lie exactly on scale lines; points between lines, two lines on one graph, and drawing a line graph are not included.",
  },
];
