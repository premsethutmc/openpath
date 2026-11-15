/**
 * Families b28 (families@2): the parts of CISCE (ICSE) Class 5 outcomes that no question asked (icse5-map@1, oam@4).
 *   aeexpn  an expanded form back into the number                        Theme 1 (expanded form)
 *   aecmpd  large numbers in descending order                            Theme 1 (ordering)
 *   aeintw  writing a number named in the international system           Theme 1 (millions)
 *   aedfrm  simple fractions of a metre or a rupee as decimals           Theme 1 (fractions as decimals with length, money)
 *   aeqest  estimating a quotient                                        Theme 2 (estimation)
 *   agcomp  listing the composite numbers in a range                     Themes 2 and 4 (composite numbers)
 *   agtwin  picking out twin primes                                      Theme 4 (twin primes)
 *   agfstry fraction addition and subtraction in a story                 Theme 3 (word problems)
 *   agdeqv  equivalent, like and unlike decimals                         Theme 3
 *   ajisint which numbers are integers                                   Theme 5
 *   ajordd  integers in decreasing order                                 Theme 5
 *   agpgrid a shaded grid as a percentage                                Theme 8 (percentage pictures)
 *   agpfr   a fraction as a percentage                                   Theme 8 (fractions and percentages)
 *   abcest  estimating how many small measures fill a container          Theme 7 (estimating capacity)
 * All wording, contexts and pictures are OpenPath's own; nothing is taken from a textbook.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { gcd, near } from "../family-kit";

const LARGE = "MATH.number.large-numbers";
const INTL = "MATH.number.indian-international-numeration";
const DEC = "MATH.number.decimal-tenths";
const RND = "MATH.number.rounding";
const PRI = "MATH.number.primes";
const FADD = "MATH.number.fraction-add";
const INT = "MATH.number.integers";
const PCT = "MATH.number.percent-intro";
const CAP = "MATH.measurement.capacity";

const none = () => null;
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: number | string | number[]): Step => ({ id, op, competency, inputs, value });
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const inRange = (p: number[], ranges: [number, number][]) => p.length === ranges.length && p.every((v, i) => Number.isInteger(v) && v >= ranges[i][0] && v <= ranges[i][1]);
const rng = (seed: number) => {
  let x = (Math.imul(seed + 7, 2654435761) ^ 0x85ebca6b) >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
};
/** Indian comma grouping: 407052 → 4,07,052. */
const ind = (n: number) => {
  const s = String(n);
  if (s.length <= 3) return s;
  return `${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${s.slice(-3)}`;
};
const neg = (v: number) => (v < 0 ? `−${-v}` : String(v));
const tup = (xs: number[]) => `(${xs.map(neg).join(", ")})`;
const readTuple = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const m = v.replace(/−/g, "-").replace(/\s/g, "").match(/^\((-?\d+(?:,-?\d+)*)\)$/);
  return m ? m[1].split(",").map(Number) : null;
};
const sameSet = (v: Value, want: number[]) => Array.isArray(v) && v.length === want.length && [...v].sort((a, b) => a - b).every((x, i) => x === want[i]);
/** Trial division (the checks' own primality test). */
const divisorCount = (n: number) => {
  let c = 0;
  for (let k = 1; k <= n; k++) if (n % k === 0) c++;
  return c;
};
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let k = 2; k * k <= n; k++) if (n % k === 0) return false;
  return true;
};
const LETTERS = "ABCD";
/** Keep only explanations whose prediction differs from the answer and from each other. */
const differ = (answer: Value, list: Bug[]): Bug[] => {
  const seen = new Set<string>([JSON.stringify(answer)]);
  return list.filter((b) => {
    if (b.predict === null) return false;
    const k = JSON.stringify(b.predict);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
/** Rotate a list of options by a parameter so that the right one is not always in the same place. */
const rotate = <T,>(xs: T[], k: number) => {
  const t = ((k % xs.length) + xs.length) % xs.length;
  return [...xs.slice(t), ...xs.slice(0, t)];
};

// ---------------------------------------------------------------- aeexpn: expanded form back into the number
/** A 6- to 8-digit number with at least one zero digit inside it, from a seed. */
const expNumber = (seed: number) => {
  const r = rng(seed);
  const len = 6 + (seed % 3);
  for (;;) {
    const ds = [1 + Math.floor(r() * 9)];
    for (let i = 1; i < len; i++) ds.push(r() < 0.3 ? 0 : Math.floor(r() * 10));
    if (ds.slice(1).includes(0) && ds.slice(1).some((d) => d > 0)) return Number(ds.join(""));
  }
};
/** The non-zero place parts of n, largest first: 4,05,307 → [4,00,000, 5,000, 300, 7]. */
const placeParts = (n: number) => {
  const s = String(n);
  return [...s].map((d, i) => Number(d) * 10 ** (s.length - 1 - i)).filter((v) => v > 0);
};

// ---------------------------------------------------------------- aecmpd: large numbers in descending order
/** Four numbers: three of the same length with the same digits in different orders and one shorter number with a bigger first digit. */
const descList = (seed: number) => {
  const r = rng(seed);
  const len = 6 + (seed % 2);
  for (;;) {
    const ds = Array.from({ length: len }, (_, i) => (i === 0 ? 1 + Math.floor(r() * 7) : Math.floor(r() * 10)));
    const a = Number(ds.join(""));
    const swap = (i: number, j: number) => {
      const c = [...ds];
      [c[i], c[j]] = [c[j], c[i]];
      return Number(c.join(""));
    };
    const b = swap(1, 2);
    const c = swap(len - 3, len - 2);
    const shortFirst = Math.min(9, ds[0] + 1 + Math.floor(r() * (9 - ds[0])));
    const d = Number([shortFirst, ...ds.slice(1, len - 1)].join(""));
    const xs = [a, b, c, d];
    if (new Set(xs).size === 4 && String(b).length === len && String(c).length === len && String(d).length === len - 1 && d > 10 ** (len - 2)) return rotate(xs, seed % 4);
  }
};

// ---------------------------------------------------------------- aeintw: international number names
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const w2 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
const w3 = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} hundred` : "", n % 100 ? w2(n % 100) : ""].filter(Boolean).join(" ");
const intlName = ([m, t, u]: number[]) => [`${w3(m)} million`, t ? `${w3(t)} thousand` : "", u ? w3(u) : ""].filter(Boolean).join(" ");
/** Independent reading of a number name: each word adds to a running group; "hundred" multiplies it; "thousand"/"million" close it. */
const readName = (s: string) => {
  const val: Record<string, number> = {};
  ONES.forEach((w, i) => (val[w] = i));
  TENS.forEach((w, i) => w && (val[w] = i * 10));
  let total = 0;
  let group = 0;
  for (const word of s.split(/[\s-]+/)) {
    if (word === "hundred") group *= 100;
    else if (word === "thousand") (total += group * 1000), (group = 0);
    else if (word === "million") (total += group * 1000000), (group = 0);
    else if (word in val) group += val[word];
    else return NaN;
  }
  return total + group;
};

// ---------------------------------------------------------------- aedfrm: fractions of a metre or a rupee as decimals
const DFR: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [1, 25], [1, 50]];
const FRWORD: Record<string, string> = { "1/2": "half", "1/4": "a quarter", "3/4": "three-quarters" };
/** Hundredths of the amount w + a/b (b divides 100). */
const hundredths = (w: number, a: number, b: number) => w * 100 + (a * 100) / b;
const dec2 = (h: number) => {
  const s = (h / 100).toFixed(2);
  return s.replace(/0$/, "").replace(/\.$/, "");
};
const dfrOptions = ([ctx, k, w]: number[]) => {
  const [a, b] = DFR[k];
  const right = dec2(hundredths(w, a, b));
  const digits = `${w}.${a}${b}`; // the top and bottom numbers written after the point
  const topOnly = `${w}.${a}`; // the top number written after the point
  const ten = dec2(hundredths(w, a, b) * 10); // one place too far left
  const unit = ctx === 0 ? (s: string) => `${s} m` : (s: string) => `₹${Number(s).toFixed(2)}`;
  const raw = [right, digits, topOnly, ten];
  const shown = raw.map(unit);
  return { raw, shown, right };
};
const dfrChoices = (p: number[]) => rotate(dfrOptions(p).shown, p[1] + p[2]);
/** Hundredths from an option string ("0.75 m", "₹0.75"); independent of how the options were made. */
const optHundredths = (s: string) => {
  const m = s.replace("₹", "").replace(" m", "").match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (!m) return NaN;
  const frac = (m[2] ?? "").padEnd(3, "0");
  return Number(m[1]) * 1000 + Number(frac); // thousandths, so that 0.075 is read exactly
};

// ---------------------------------------------------------------- aeqest: estimating a quotient
/** [seed]: a dividend that rounds (at its greatest place) to R and a two-digit divisor that rounds to D, with R ÷ D whole. */
const qestOf = (seed: number) => {
  const r = rng(seed);
  for (;;) {
    const D = 10 * (2 + Math.floor(r() * 8));
    const k = 2 + Math.floor(r() * 2); // R has 3 or 4 digits
    const lead = 1 + Math.floor(r() * 9);
    const R = lead * 10 ** k;
    if (R % D !== 0 || R / D < 2) continue;
    const half = 10 ** k / 2;
    const off = Math.floor(r() * (half - 1)) * (r() < 0.5 ? -1 : 1);
    const N = R + off;
    const o = 1 + Math.floor(r() * 4);
    const M = D + (r() < 0.5 ? -o : o);
    if (off === 0 || String(N).length !== k + 1 || String(M).length !== 2) continue;
    return { N, M, R, D, Q: R / D };
  }
};
const greatestPlace = (n: number) => {
  const p = 10 ** (String(n).length - 1);
  return Math.round(n / p) * p;
};

// ---------------------------------------------------------------- agtwin: twin primes
const TWINS: [number, number][] = [[3, 5], [5, 7], [11, 13], [17, 19], [29, 31], [41, 43], [59, 61], [71, 73]];
/** Odd pairs two apart where only one is prime, prime pairs four or six apart, and odd composite pairs two apart. */
const ONE_PRIME: [number, number][] = [[7, 9], [13, 15], [19, 21], [23, 25], [31, 33], [37, 39], [47, 49], [53, 55], [61, 63], [67, 69], [79, 81], [83, 85], [89, 91], [97, 99]];
const FAR_PRIMES: [number, number][] = [[7, 11], [13, 17], [19, 23], [37, 41], [43, 47], [79, 83], [23, 29], [31, 37], [47, 53], [53, 59], [61, 67], [67, 71]];
const BOTH_COMPOSITE: [number, number][] = [[25, 27], [33, 35], [49, 51], [63, 65], [75, 77], [85, 87], [91, 93], [93, 95]];
const pairText = ([a, b]: [number, number]) => `${a} and ${b}`;
const twinQ = ([t, s]: number[]) => {
  const opts: [number, number][] = [TWINS[t], ONE_PRIME[s % ONE_PRIME.length], FAR_PRIMES[(s * 5 + t) % FAR_PRIMES.length], BOTH_COMPOSITE[(s + t) % BOTH_COMPOSITE.length]];
  return rotate(opts, s + t);
};

// ---------------------------------------------------------------- agfstry: fractions in a story
type Story = { op: 1 | -1; text: (who: string, f1: string, f2: string) => string };
const STORIES: Story[] = [
  { op: 1, text: (who, f1, f2) => `${who} paints ${f1} of a wall in the morning and ${f2} of the same wall in the afternoon. What fraction of the wall has ${who} painted? (A fraction is fine.)` },
  { op: 1, text: (who, f1, f2) => `${who} walks ${f1} km to the bus stop and then ${f2} km more to school. How many kilometres does ${who} walk? (A fraction is fine.)` },
  { op: 1, text: (who, f1, f2) => `A cake is cut into pieces. ${who} eats ${f1} of the cake and a friend eats ${f2} of it. What fraction of the cake do they eat together? (A fraction is fine.)` },
  { op: -1, text: (who, f1, f2) => `A jug is ${f1} full of buttermilk. ${who} pours out ${f2} of a jug. What fraction of the jug is still full? (A fraction is fine.)` },
  { op: -1, text: (who, f1, f2) => `${who} has a ribbon ${f1} m long and cuts off ${f2} m for a gift. How many metres of ribbon are left? (A fraction is fine.)` },
  { op: -1, text: (who, f1, f2) => `${who}'s garden plot is ${f1} of a field. ${who} plants beans on ${f2} of the field. What fraction of the field is left for other plants? (A fraction is fine.)` },
];
const fstryValue = ([s, a, b, c, d]: number[]) => (STORIES[s].op === 1 ? a / b + c / d : a / b - c / d);

// ---------------------------------------------------------------- agdeqv: equivalent, like and unlike decimals
const places = (s: string) => (s.includes(".") ? s.split(".")[1].length : 0);
/** Exact value of a decimal string in thousandths. */
const thou = (s: string) => {
  const [w, f = ""] = s.split(".");
  return Number(w) * 1000 + Number(f.padEnd(3, "0"));
};
/** [kind, w, d1, d2]: kind 0 a decimal and its equal; 1 a like pair; 2 an unlike pair. */
const deqvQ = ([kind, w, d1, d2]: number[]) => {
  const turn = w + d1 + d2;
  if (kind === 0) {
    // equal to w.d1: w.d10 (a zero added at the end) is equal; w.0d1, d1.w and w.d1d1 are not
    const x = `${w}.${d1}`;
    const opts = [`${w}.${d1}0`, `${w}.0${d1}`, `${d1}.${w}`, `${w}.${d1}${d1}`];
    return { x, prompt: `Which of these decimals is equal to ${x}?`, opts: rotate(opts, turn), right: `${w}.${d1}0` };
  }
  const a2 = `${w}.${d1}${d2}`;
  const b2 = `${d2}.${d1}${(d1 + 3) % 10}`;
  const a1 = `${w}.${d1}`;
  const b3 = `${d2}.${d1}0${d2}`;
  if (kind === 1) {
    // like decimals: the same number of decimal places
    const opts = [`${a2} and ${b2}`, `${a1} and ${b2}`, `${a2} and ${b3}`, `${a1} and ${b3}`];
    return { x: "", prompt: "Like decimals have the same number of decimal places. Which pair are like decimals?", opts: rotate(opts, turn), right: `${a2} and ${b2}` };
  }
  // unlike decimals: different numbers of decimal places
  const c2 = `${d1}.${d2}${w}`;
  const opts = [`${a1} and ${b2}`, `${a2} and ${b2}`, `${a2} and ${c2}`, `${b2} and ${c2}`];
  return { x: "", prompt: "Unlike decimals have different numbers of decimal places. Which pair are unlike decimals?", opts: rotate(opts, turn), right: `${a1} and ${b2}` };
};

// ---------------------------------------------------------------- ajisint: which numbers are integers
const isintQ = ([kind, s]: number[]) => {
  const r = rng(s * 7 + kind);
  const neg1 = -(1 + Math.floor(r() * 30));
  const pos1 = 1 + Math.floor(r() * 50);
  const pos2 = 51 + Math.floor(r() * 49);
  const den = 2 + Math.floor(r() * 7);
  const top = 1 + Math.floor(r() * (den - 1));
  const half = `${-(1 + Math.floor(r() * 9))}.5`.replace("-", "−");
  const nonInts = [`${top}/${den}`, half, `${pos1}.${1 + Math.floor(r() * 9)}`];
  if (kind === 0) {
    const opts = [neg(neg1), "0", String(pos2), nonInts[s % 3]];
    return { prompt: "Integers are the counting numbers, zero and the negatives of the counting numbers. Which of these numbers is NOT an integer?", opts: rotate(opts, s), want: false };
  }
  const opts = [neg(neg1), ...nonInts];
  return { prompt: "Integers are the counting numbers, zero and the negatives of the counting numbers. Which of these numbers IS an integer?", opts: rotate(opts, s), want: true };
};
/** Whether an option string is a whole number (its own reading, not the generator's). */
const isWhole = (s: string) => /^−?\d+$/.test(s);

// ---------------------------------------------------------------- agpgrid: a shaded grid as a percentage
const GRIDS: [number, number][] = [[10, 10], [4, 5], [5, 5], [2, 5], [5, 10]];

// ---------------------------------------------------------------- abcest: estimating capacity
const CONTAINERS: { name: string; L: number }[] = [
  { name: "bucket", L: 10 }, { name: "bucket", L: 15 }, { name: "bucket", L: 20 },
  { name: "water bottle", L: 1 }, { name: "water bottle", L: 2 }, { name: "jug", L: 2 },
  { name: "cooking pot", L: 3 }, { name: "cooking pot", L: 5 },
  { name: "water drum", L: 50 }, { name: "water drum", L: 100 }, { name: "water drum", L: 200 },
  { name: "water tank", L: 500 }, { name: "water tank", L: 1000 },
  { name: "watering can", L: 5 }, { name: "milk can", L: 20 }, { name: "water can", L: 25 },
];
const MEASURES: { name: string; ml: number }[] = [
  { name: "glass", ml: 250 }, { name: "glass", ml: 200 }, { name: "mug", ml: 300 }, { name: "cup", ml: 100 },
  { name: "cup", ml: 150 }, { name: "ladle", ml: 50 }, { name: "spoon", ml: 5 }, { name: "spoon", ml: 10 },
];
const capOf = ([ci, mi]: number[]) => {
  const c = CONTAINERS[ci];
  const m = MEASURES[mi];
  const right = (c.L * 1000) / m.ml;
  const tenths = right >= 20 && right % 10 === 0;
  const opts = rotate(tenths ? [right / 10, right, right * 10, right * 100] : [right, right * 10, right * 100, right * 1000], ci + mi);
  return { c, m, right, opts, tenths };
};
const fmtCount = (x: number) => x.toLocaleString("en-IN");

export const B28: Def[] = [
  // ============================================================ aeexpn
  {
    id: "aeexpn",
    arity: 1,
    title: "Writing the number for an expanded form",
    competency: LARGE,
    type: "integer",
    parse: none,
    reject: (p) => (!inRange(p, [[0, 399]]) ? "A seed for a 6- to 8-digit number." : null),
    prompt: ([s]) => `Write the number ${placeParts(expNumber(s)).map(ind).join(" + ")} in figures. Type the digits without commas.`,
    solve: ([s]) => {
      const n = expNumber(s);
      const parts = placeParts(n);
      return { steps: [st("add", "add", LARGE, parts, n)], answer: n };
    },
    // independent: put each part's leading digit in the place its number of zeros names, then read the digits
    validate: ([s], v) => {
      const parts = placeParts(expNumber(s)).map(ind);
      const zeros = parts.map((t) => t.replace(/,/g, "").length - 1);
      const digits = Array(zeros[0] + 1).fill("0");
      parts.forEach((t, i) => (digits[digits.length - 1 - zeros[i]] = t[0]));
      return v === Number(digits.join(""));
    },
    bugs: ([s]) => {
      const n = expNumber(s);
      const parts = placeParts(n);
      return differ(n, [
        { id: "zero-places-dropped", kind: "conceptual", competency: LARGE, says: "Only the non-zero digits were written next to each other. A place with nothing in it still needs a 0, or every digit before it moves to the wrong place.", predict: Number(parts.map((x) => String(x)[0]).join("")) },
      ]);
    },
    variants: () => [],
    explain: (x) => `Add the place values; a place with no part gets a 0: ${x.value}`,
    domain: [[0, 399]],
    difficulty: ([s]) => (1 + (s % 3)) as 1 | 2 | 3,
    teach: {
      idea: "An expanded form shows a number as the sum of its place values. The number of zeros in each part tells which place its digit goes in.",
      method: "Write a place-value chart. Put each part's first digit under the place it names, write 0 in every empty place, then read the digits from the left.",
      visual: ([s]) => {
        const n = String(expNumber(s));
        const head = ["Cr", "TL", "L", "TTh", "Th", "H", "T", "O"].slice(8 - n.length);
        return { type: "table", head, rows: [n.split("")] };
      },
      alternatives: [
        { id: "add_up", title: "Add the parts", kind: "procedural", text: ["Add the parts from the largest down, one at a time.", "Adding 0 for an empty place changes nothing, so the zeros stay where they are."] },
      ],
    },
    limits: "Numbers of 6 to 8 digits with at least one empty place; the Indian system of commas.",
  },
  // ============================================================ aecmpd
  {
    id: "aecmpd",
    arity: 1,
    title: "Putting large numbers in descending order",
    competency: LARGE,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (!inRange(p, [[0, 299]]) ? "A list of four large numbers." : null),
    prompt: ([s]) => `Write these numbers in descending order (greatest first): ${descList(s).map(ind).join("; ")}. Write the list in brackets without commas inside the numbers, for example (5678, 1234, …).`,
    solve: ([s]) => {
      const xs = [...descList(s)].sort((a, b) => b - a);
      return { steps: [st("order", "compare", LARGE, descList(s), tup(xs))], answer: tup(xs) };
    },
    // independent: each given number is used once, and each one is greater than the next (checked by subtraction)
    validate: ([s], v) => {
      const t = readTuple(v);
      const xs = descList(s);
      if (!t || t.length !== 4 || !xs.every((x) => t.filter((y) => y === x).length === 1)) return false;
      for (let i = 1; i < t.length; i++) if (t[i - 1] - t[i] <= 0) return false;
      return true;
    },
    bugs: ([s]) => {
      const xs = descList(s);
      const right = tup([...xs].sort((a, b) => b - a));
      return differ(right, [
        { id: "ascending", kind: "procedural", competency: LARGE, says: "The list was written from smallest to greatest; descending order starts with the greatest.", predict: tup([...xs].sort((a, b) => a - b)) },
        { id: "first-digit-only", kind: "conceptual", competency: LARGE, says: "The numbers were compared by their first digits only. A number with more digits is always greater, so count the digits first.", predict: tup([...xs].sort((a, b) => String(b).localeCompare(String(a)))) },
      ]);
    },
    distractors: ([s]) => {
      const d = [...descList(s)].sort((a, b) => b - a);
      return [tup([d[1], d[0], d[2], d[3]]), tup([d[0], d[2], d[1], d[3]])];
    },
    variants: () => [],
    explain: (x) => `Most digits first; numbers with the same number of digits are compared place by place from the left: ${x.value}`,
    domain: [[0, 299]],
    difficulty: ([s]) => (s % 2 === 0 ? 2 : 3),
    teach: {
      idea: "A number with more digits is greater. When two numbers have the same number of digits, the first place from the left where their digits differ decides.",
      method: "Count the digits of each number. Put the longest numbers first; compare numbers of the same length digit by digit from the left, and write the greater one first.",
      alternatives: [
        { id: "chart", title: "Line them up in a chart", kind: "procedural", text: ["Write each number in a place-value chart so the ones are in one column.", "Read down from the left: the number with the larger digit in the first column where they differ is greater."] },
      ],
    },
    limits: "Four numbers of 5 to 7 digits; ascending order is another family.",
  },
  // ============================================================ aeintw
  {
    id: "aeintw",
    arity: 3,
    title: "Writing a number named in the international system",
    competency: INTL,
    type: "integer",
    parse: none,
    reject: (p) => (!inRange(p, [[1, 99], [0, 999], [0, 999]]) ? "Millions 1 to 99, thousands and ones 0 to 999." : null),
    prompt: (p) => `Write the number "${intlName(p)}" in figures. Type the digits without commas.`,
    solve: ([m, t, u]) => {
      const n = m * 1000000 + t * 1000 + u;
      return { steps: [st("millions", "place", INTL, [m], m * 1000000), st("thousands", "place", INTL, [t], t * 1000), st("total", "add", INTL, [m * 1000000, t * 1000, u], n)], answer: n };
    },
    // independent: read the printed name word by word
    validate: (p, v) => v === readName(intlName(p)),
    bugs: ([m, t, u]) =>
      differ(m * 1000000 + t * 1000 + u, [
        { id: "groups-not-padded", kind: "conceptual", competency: INTL, says: "The groups were written one after another without their zeros. In the international system every group after the millions has exactly three digits: write 5 thousand as 005.", predict: Number(`${m}${t || ""}${u || ""}`) },
        { id: "million-as-lakh", kind: "conceptual", competency: INTL, says: "A million was taken as a lakh. One million is ten lakh (10,00,000).", predict: m * 100000 + t * 1000 + u },
      ]),
    variants: () => [],
    explain: (x) => (x.id === "total" ? `Put the groups together, three digits for each group after the millions: ${x.value}` : `The ${x.id} group: ${x.inputs[0]} ${x.id} = ${x.value}`),
    domain: [[1, 99], [0, 999], [0, 999]],
    keep: ([, t, u]) => t < 100 || u < 100 || t % 10 === 0,
    cap: 400,
    difficulty: ([, t, u]) => (t >= 100 && u >= 100 ? 1 : t === 0 || u === 0 ? 3 : 2),
    teach: {
      idea: "In the international system the digits are grouped in threes from the right: ones, thousands, millions. Each group is read like a number below a thousand, with its group name after it.",
      method: "Write the millions, then the thousands as three digits, then the ones as three digits. Fill any empty place in a group with a zero.",
      visual: ([m, t, u]) => ({ type: "table", head: ["Millions", "Thousands", "Ones"], rows: [[String(m), String(t).padStart(3, "0"), String(u).padStart(3, "0")]] }),
      alternatives: [
        { id: "commas", title: "Write the commas first", kind: "procedural", text: ["Write the millions, then a comma, then three boxes, a comma, and three more boxes.", "Fill the thousands and ones boxes from the name, with 0 in any empty box, then remove the commas."] },
      ],
    },
    limits: "Numbers from 1 million to 99 million; billions and the Indian system are other families.",
  },
  // ============================================================ aedfrm
  {
    id: "aedfrm",
    arity: 3,
    title: "Fractions of a metre or a rupee as decimals",
    competency: DEC,
    type: "choice",
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, DFR.length - 1], [0, 3]])) return "A fraction of a metre or a rupee.";
      const ch = dfrChoices(p);
      return new Set(ch).size !== 4 ? "Four different options." : null;
    },
    prompt: ([ctx, k, w]) => {
      const [a, b] = DFR[k];
      const f = `${a}/${b}`;
      const amount = w ? `${w} ${f}` : f;
      return ctx === 0
        ? `A ribbon is ${amount} m long. Which shows its length in metres as a decimal?`
        : `A sticker costs ${amount} rupees${!w && FRWORD[f] ? ` (${FRWORD[f]} of a rupee)` : ""}. Which shows this amount in rupees as a decimal?`;
    },
    choices: (p) => dfrChoices(p),
    solve: (p) => {
      const [, k, w] = p;
      const [a, b] = DFR[k];
      const { shown, right } = dfrOptions(p);
      const pick = dfrChoices(p).indexOf(shown[0]);
      return { steps: [st("hundredths", "rename", DEC, [a, b], `${(a * 100) / b}/100`), st("decimal", "write", DEC, [w, (a * 100) / b], right), st("pick", "choose the option", DEC, [shown[0]], pick)], answer: pick };
    },
    // independent: exactly one option, read as a decimal, times the bottom number equals the amount's top number
    validate: ([ctx, k, w], v) => {
      const [a, b] = DFR[k];
      const ch = dfrChoices([ctx, k, w]);
      const ok = ch.map((c) => optHundredths(c) * b === (w * b + a) * 1000);
      return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true;
    },
    bugs: (p) => {
      const ch = dfrChoices(p);
      const { shown } = dfrOptions(p);
      const at = (i: number) => ch.indexOf(shown[i]);
      const [a, b] = DFR[p[1]];
      return differ(at(0), [
        { id: "digits-after-point", kind: "conceptual", competency: DEC, says: `The top and bottom numbers were written after the point. A decimal counts tenths and hundredths: ${a}/${b} = ${(a * 100) / b}/100, so write the hundredths.`, predict: at(1) },
        { id: "top-after-point", kind: "conceptual", competency: DEC, says: `Only the top number was written after the point. That works only for tenths; first rename ${a}/${b} as hundredths.`, predict: at(2) },
        { id: "one-place-off", kind: "procedural", competency: DEC, says: "The digits are one place too far to the left. Tenths go in the first place after the point and hundredths in the second.", predict: at(3) },
      ]);
    },
    variants: () => [],
    explain: (x) => (x.id === "pick" ? `That is option ${LETTERS[Number(x.value)]}, so the answer is ${LETTERS[Number(x.value)]}` : x.id === "hundredths" ? `Rename the fraction as hundredths: ${x.inputs[0]}/${x.inputs[1]} = ${x.value}` : `Write the whole metres or rupees, then the hundredths after the point: ${x.value}`),
    domain: [[0, 1], [0, DFR.length - 1], [0, 3]],
    difficulty: ([, k, w]) => (k <= 2 && !w ? 1 : DFR[k][1] <= 10 ? 2 : 3),
    teach: {
      idea: "A fraction whose bottom number divides a hundred can be renamed as hundredths, and hundredths are the second place after the decimal point.",
      method: "Find what to multiply the bottom number by to make a hundred, multiply the top by the same, and write the hundredths after the point. Whole metres or rupees go before the point.",
      alternatives: [
        { id: "money", title: "Think in paise or centimetres", kind: "conceptual", text: ["A rupee is a hundred paise and a metre is a hundred centimetres.", "Find the fraction of a hundred paise (or centimetres), then write that many hundredths of a rupee (or metre) after the point."] },
      ],
    },
    limits: "Fractions whose bottom number divides 100, with up to 3 whole metres or rupees; other fractions are another family.",
  },
  // ============================================================ aeqest
  {
    id: "aeqest",
    arity: 1,
    title: "Estimating a quotient",
    competency: RND,
    type: "integer",
    parse: none,
    reject: (p) => (!inRange(p, [[0, 399]]) ? "A seed for a division to estimate." : null),
    prompt: ([s]) => {
      const { N, M } = qestOf(s);
      return `Estimate ${ind(N)} ÷ ${M} by rounding each number to its greatest place (for example 4,870 to 5,000 and 36 to 40), then dividing.`;
    },
    solve: ([s]) => {
      const { N, M, R, D, Q } = qestOf(s);
      return { steps: [st("round1", "round", RND, [N], R), st("round2", "round", RND, [M], D), st("divide", "divide", "MATH.number.long-division", [R, D], Q)], answer: Q };
    },
    // independent: round each printed number again from its own digits, then check by multiplying back
    validate: ([s], v) => {
      const { N, M } = qestOf(s);
      const [r, d] = [greatestPlace(N), greatestPlace(M)];
      return typeof v === "number" && v * d === r;
    },
    bugs: ([s]) => {
      const { N, M, Q, D } = qestOf(s);
      const p = 10 ** (String(N).length - 1);
      const down = Math.floor(N / p) * p;
      return differ(Q, [
        { id: "worked-exactly", kind: "procedural", competency: RND, says: "The division was worked out exactly (or nearly). An estimate rounds first, so the division becomes easy.", predict: Math.round(N / M) },
        { id: "rounded-down", kind: "conceptual", competency: RND, says: "The number was cut down instead of rounded. Look at the next digit: 5 or more rounds up.", predict: down % D === 0 ? down / D : null },
      ]);
    },
    variants: () => [],
    explain: (x) => (x.id === "divide" ? `Divide the rounded numbers: ${x.inputs[0]} ÷ ${x.inputs[1]} = ${x.value}` : `Round ${x.inputs[0]} to its greatest place: ${x.value}`),
    domain: [[0, 399]],
    difficulty: ([s]) => (qestOf(s).R >= 1000 ? 3 : 2),
    teach: {
      idea: "Rounding both numbers first turns a hard division into an easy one, and the answer is close to the exact quotient.",
      method: "Round each number to its greatest place, then divide the rounded numbers, cancelling the same number of zeros from both.",
      alternatives: [
        { id: "multiply_back", title: "Check by multiplying", kind: "procedural", text: ["After dividing the rounded numbers, multiply your estimate by the rounded divisor.", "It should give the rounded dividend; if it does not, divide again."] },
      ],
    },
    limits: "3- or 4-digit numbers divided by 2-digit numbers whose rounded values divide exactly.",
  },
  // ============================================================ agcomp
  {
    id: "agcomp",
    arity: 2,
    title: "Listing the composite numbers in a range",
    competency: PRI,
    type: "set",
    parse: none,
    reject: ([a, w]) => {
      let c = 0;
      let p = 0;
      for (let k = a; k <= a + w; k++) if (k > 1) isPrime(k) ? p++ : c++;
      return a < 1 || w < 6 || w > 10 || a + w > 100 || c < 3 || p < 1 ? "A stretch of 7 to 11 numbers up to 100 with primes and composites." : null;
    },
    prompt: ([a, w]) => `A composite number has more than two factors. List all the composite numbers from ${a} to ${a + w}.`,
    solve: ([a, w]) => {
      const cs: number[] = [];
      for (let k = a; k <= a + w; k++) if (k > 1 && !isPrime(k)) cs.push(k);
      return { steps: [st("test", "classify", PRI, [a, a + w], cs)], answer: cs };
    },
    // independent: count every factor of each number
    validate: ([a, w], v) => {
      const want: number[] = [];
      for (let k = a; k <= a + w; k++) if (divisorCount(k) > 2) want.push(k);
      return sameSet(v, want);
    },
    bugs: ([a, w]) => {
      const cs: number[] = [];
      for (let k = a; k <= a + w; k++) if (k > 1 && !isPrime(k)) cs.push(k);
      const even = cs.filter((k) => k % 2 === 0);
      return differ(cs, [
        { id: "only-even", kind: "conceptual", competency: PRI, says: "Only the even numbers were listed. Odd numbers can be composite too: 9 = 3 × 3 and 15 = 3 × 5 have more than two factors.", predict: even.length && even.length < cs.length ? even : null },
        { id: "one-composite", kind: "conceptual", competency: PRI, says: "1 was counted as composite. 1 has only one factor, so it is neither prime nor composite.", predict: a === 1 ? [1, ...cs] : null },
      ]);
    },
    variants: () => [],
    explain: (x) => `Numbers from ${x.inputs[0]} to ${x.inputs[1]} with a factor other than 1 and themselves: ${(x.value as number[]).join(", ")}`,
    domain: [[1, 94], [6, 10]],
    cap: 300,
    difficulty: ([a, w]) => (a + w <= 30 ? 1 : a + w <= 60 ? 2 : 3),
    teach: {
      idea: "A composite number has more than two factors: it can be split into a product of two smaller whole numbers. 1 is neither prime nor composite.",
      method: "For each number, try dividing by 2, 3, 5 and 7. If one of them divides it exactly (and is not the number itself), the number is composite.",
      alternatives: [
        { id: "rectangle", title: "More than one rectangle", kind: "conceptual", text: ["Try to arrange the number as dots in a rectangle with more than one row.", "If you can, the number is composite; if the only rectangle is a single row, it is prime."] },
      ],
    },
    limits: "Stretches of 7 to 11 numbers up to 100; listing primes is another family.",
  },
  // ============================================================ agtwin
  {
    id: "agtwin",
    arity: 2,
    title: "Picking out twin primes",
    competency: PRI,
    type: "choice",
    parse: none,
    reject: (p) => (!inRange(p, [[0, TWINS.length - 1], [0, 39]]) ? "A pair of twin primes and three other pairs." : null),
    prompt: () => "Twin primes are two prime numbers whose difference is 2. Which pair are twin primes?",
    choices: (p) => twinQ(p).map(pairText),
    solve: (p) => {
      const opts = twinQ(p);
      const i = opts.indexOf(TWINS[p[0]]);
      return { steps: [st("pick", "choose the option", PRI, [pairText(TWINS[p[0]])], i)], answer: i };
    },
    // independent: test every option for two primes (by counting factors) that differ by 2
    validate: (p, v) => {
      const ok = twinQ(p).map(([a, b]) => divisorCount(a) === 2 && divisorCount(b) === 2 && b - a === 2);
      return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true;
    },
    bugs: (p) => {
      const opts = twinQ(p);
      const i = opts.indexOf(TWINS[p[0]]);
      return differ(i, [
        { id: "odd-not-prime", kind: "conceptual", competency: PRI, says: "One number of that pair is not prime. Twin primes must both be prime, not just odd numbers 2 apart.", predict: opts.indexOf(ONE_PRIME[p[1] % ONE_PRIME.length]) },
        { id: "difference-not-two", kind: "recall", competency: PRI, says: "Both numbers are prime, but they are not 2 apart. Twin primes differ by exactly 2.", predict: opts.indexOf(FAR_PRIMES[(p[1] * 5 + p[0]) % FAR_PRIMES.length]) },
      ]);
    },
    variants: () => [],
    explain: (x) => `${x.inputs[0]} are both prime and differ by 2. That is option ${LETTERS[Number(x.value)]}, so the answer is ${LETTERS[Number(x.value)]}`,
    domain: [[0, TWINS.length - 1], [0, 39]],
    difficulty: ([t]) => (t <= 2 ? 1 : t <= 5 ? 2 : 3),
    teach: {
      idea: "Twin primes are pairs of prime numbers that are 2 apart, such as 11 and 13. Every number of the pair must be prime.",
      method: "Check that the two numbers differ by 2, then check each one is prime by trying 2, 3, 5 and 7 as factors.",
      alternatives: [
        { id: "list", title: "List the primes first", kind: "procedural", text: ["List the primes up to 100.", "Twin primes are the neighbours in the list that are only 2 apart."] },
      ],
    },
    limits: "Twin primes up to 73, among pairs up to 99.",
  },
  // ============================================================ agfstry
  {
    id: "agfstry",
    arity: 5,
    title: "Adding and subtracting fractions in a story",
    competency: FADD,
    type: "fraction",
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, STORIES.length - 1], [1, 11], [2, 12], [1, 11], [2, 12]])) return "A story with two fractions.";
      const [s, a, b, c, d] = p;
      if (a >= b || c >= d || b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1) return "Two proper fractions in lowest terms with different bottom numbers.";
      const v = fstryValue(p);
      if (STORIES[s].op === -1 && v <= 0) return "The amount taken away must be less than the amount there.";
      if (s <= 2 && s !== 1 && v > 1) return "Parts of one whole: at most the whole.";
      return null;
    },
    prompt: ([s, a, b, c, d]) => STORIES[s].text(nm(a + b + c + d), `${a}/${b}`, `${c}/${d}`),
    solve: ([s, a, b, c, d]) => {
      const l = (b * d) / gcd(b, d);
      const n = STORIES[s].op === 1 ? (a * l) / b + (c * l) / d : (a * l) / b - (c * l) / d;
      return {
        steps: [
          st("common", "common denominator", "MATH.number.equivalent-fractions", [b, d], l),
          st("rename", "rename", "MATH.number.equivalent-fractions", [`${a}/${b}`, `${c}/${d}`], `${(a * l) / b}/${l}, ${(c * l) / d}/${l}`),
          st("combine", STORIES[s].op === 1 ? "add" : "subtract", FADD, [(a * l) / b, (c * l) / d], `${n}/${l}`),
        ],
        answer: n / l,
      };
    },
    // independent: cross-multiplication over b × d, then compare with the answer as a number
    validate: ([s, a, b, c, d], v) => typeof v === "number" && near(v, (a * d + STORIES[s].op * c * b) / (b * d)),
    bugs: ([s, a, b, c, d]) =>
      differ(fstryValue([s, a, b, c, d]), [
        { id: "tops-and-bottoms", kind: "conceptual", competency: FADD, says: "The top numbers and the bottom numbers were combined separately. The pieces are different sizes, so first rename both fractions with the same bottom number.", predict: STORIES[s].op === 1 ? (a + c) / (b + d) : b > d && a > c ? (a - c) / (b - d) : null },
        { id: "wrong-operation", kind: "procedural", competency: "MATH.reasoning.operation-choice", says: STORIES[s].op === 1 ? "The fractions were subtracted. Both amounts together means adding." : "The fractions were added. What is left after taking some away means subtracting.", predict: STORIES[s].op === 1 ? (a / b - c / d > 0 ? a / b - c / d : null) : a / b + c / d },
      ]),
    variants: () => [],
    explain: (x) => (x.id === "common" ? `A common bottom number for ${x.inputs[0]} and ${x.inputs[1]}: ${x.value}` : x.id === "rename" ? `Rename both: ${x.value}` : `${x.op === "add" ? "Add" : "Subtract"} the tops: ${x.value}`),
    domain: [[0, STORIES.length - 1], [1, 11], [2, 12], [1, 11], [2, 12]],
    keep: ([, a, b, c, d]) => a < b && c < d && b !== d && b <= 12 && d <= 12,
    cap: 400,
    difficulty: ([, , b, , d]) => (b % d === 0 || d % b === 0 ? 1 : gcd(b, d) > 1 ? 2 : 3),
    teach: {
      idea: "Fractions can be added or subtracted only when they count pieces of the same size, so both are first renamed with the same bottom number.",
      method: "Decide from the story whether to add (both together) or subtract (what is left). Find a common bottom number, rename both fractions, then add or subtract the top numbers.",
      alternatives: [
        { id: "strip", title: "Draw a strip", kind: "conceptual", text: ["Draw a strip and cut it into as many equal parts as the common bottom number.", "Shade the first amount, then shade more (adding) or rub some out (subtracting), and count the shaded parts."] },
      ],
    },
    limits: "Two proper fractions with bottom numbers up to 12 in one-step stories; mixed numbers are another family.",
  },
  // ============================================================ agdeqv
  {
    id: "agdeqv",
    arity: 4,
    title: "Equivalent, like and unlike decimals",
    competency: DEC,
    type: "choice",
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 2], [0, 9], [1, 9], [1, 9]])) return "A question on equivalent, like or unlike decimals.";
      if (p[0] === 0 && (p[3] !== 1 || p[2] === p[1])) return "One question per decimal.";
      const q = deqvQ(p);
      return new Set(q.opts).size !== 4 ? "Four different options." : null;
    },
    prompt: (p) => deqvQ(p).prompt,
    choices: (p) => deqvQ(p).opts,
    solve: (p) => {
      const q = deqvQ(p);
      const i = q.opts.indexOf(q.right);
      return { steps: [st("pick", "choose the option", DEC, [q.right], i)], answer: i };
    },
    // independent: read every option's digits; equal values for kind 0, numbers of decimal places for kinds 1 and 2
    validate: (p, v) => {
      const q = deqvQ(p);
      const ok = q.opts.map((o) => {
        if (p[0] === 0) return thou(o) === thou(q.x);
        const [x, y] = o.split(" and ");
        return p[0] === 1 ? places(x) === places(y) : places(x) !== places(y);
      });
      return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true;
    },
    bugs: (p) => {
      const q = deqvQ(p);
      const i = q.opts.indexOf(q.right);
      if (p[0] === 0) {
        const [w, d] = q.x.split(".");
        return differ(i, [{ id: "zero-inside", kind: "conceptual", competency: DEC, says: `A zero was put straight after the point. That moves the digit to the hundredths place: ${w}.0${d} is ${d} hundredths, not ${d} tenths. A zero added at the END does not change a decimal.`, predict: q.opts.indexOf(`${w}.0${d}`) }]);
      }
      return differ(i, [{ id: "length-not-places", kind: "conceptual", competency: DEC, says: "The whole numbers were compared instead of the decimal places. Like decimals have the same number of digits AFTER the point.", predict: null }]);
    },
    variants: () => [],
    explain: (x) => `${x.inputs[0]}: that is option ${LETTERS[Number(x.value)]}, so the answer is ${LETTERS[Number(x.value)]}`,
    domain: [[0, 2], [0, 9], [1, 9], [1, 9]],
    keep: ([k, w, d1, d2]) => k > 0 || (d2 === 1 && d1 !== w),
    cap: 500,
    difficulty: ([k]) => (k === 0 ? 2 : 1),
    teach: {
      idea: "Adding zeros at the end of a decimal does not change its value. Decimals with the same number of decimal places are like decimals; with different numbers they are unlike.",
      method: "To compare values, give both decimals the same number of places by adding zeros at the end. To tell like from unlike, count the digits after the point in each.",
      alternatives: [
        { id: "money", title: "Think of money", kind: "conceptual", text: ["Two rupees and five tenths of a rupee is the same amount as two rupees and fifty hundredths: fifty paise either way.", "A zero straight after the point is different: it leaves the tenths empty, so the amount is only a few paise."] },
      ],
    },
    limits: "Decimals with up to three places; comparing and ordering decimals is another family.",
  },
  // ============================================================ ajisint
  {
    id: "ajisint",
    arity: 2,
    title: "Telling integers from other numbers",
    competency: INT,
    type: "choice",
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, 1], [0, 199]])) return "A question on which numbers are integers.";
      return new Set(isintQ(p).opts).size !== 4 ? "Four different options." : null;
    },
    prompt: (p) => isintQ(p).prompt,
    choices: (p) => isintQ(p).opts,
    solve: (p) => {
      const q = isintQ(p);
      const i = q.opts.findIndex((o) => /^−?\d+$/.test(o) === q.want);
      return { steps: [st("pick", "classify", INT, q.opts, i)], answer: i };
    },
    // independent: evaluate each option as a number and test whether it is whole
    validate: (p, v) => {
      const q = isintQ(p);
      const value = (o: string) => {
        const t = o.replace("−", "-");
        const m = t.match(/^(-?\d+)\/(\d+)$/);
        return m ? Number(m[1]) / Number(m[2]) : Number(t);
      };
      const ok = q.opts.map((o) => Number.isInteger(value(o)) === q.want);
      return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true && isWhole(q.opts[v]) === q.want;
    },
    bugs: (p) => {
      const q = isintQ(p);
      const i = q.opts.findIndex((o) => isWhole(o) === q.want);
      if (!q.want)
        return differ(i, [
          { id: "negatives-not-integers", kind: "conceptual", competency: INT, says: "A negative number was taken as not an integer. The negatives of the counting numbers (−1, −2, −3, …) are integers too.", predict: q.opts.findIndex((o) => o.startsWith("−") && isWhole(o)) },
          { id: "zero-not-integer", kind: "conceptual", competency: INT, says: "0 was taken as not an integer. Zero is an integer: it is between the negatives and the counting numbers.", predict: q.opts.indexOf("0") },
        ]);
      return differ(i, [{ id: "fraction-is-integer", kind: "conceptual", competency: INT, says: "A fraction or a decimal with a part after the point is not an integer. Integers are whole numbers, counted forwards or backwards from zero.", predict: q.opts.findIndex((o) => o.includes("/")) }]);
    },
    variants: () => [],
    explain: (x) => `Only whole numbers (counting numbers, zero and their negatives) are integers. That is option ${LETTERS[Number(x.value)]}, so the answer is ${LETTERS[Number(x.value)]}`,
    domain: [[0, 1], [0, 199]],
    difficulty: ([k]) => (k === 0 ? 1 : 2),
    teach: {
      idea: "The integers are the counting numbers (1, 2, 3, …), zero, and the negatives of the counting numbers (−1, −2, −3, …). Fractions and decimals with a part are not integers.",
      method: "For each number, ask: is it a whole number, counted forwards or backwards from zero? If it has a fraction part, it is not an integer.",
      visual: () => ({ type: "numberline", from: -5, to: 5, marks: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] }),
      alternatives: [
        { id: "number_line", title: "Look for a mark", kind: "conceptual", text: ["Draw a number line with a mark at every whole number, on both sides of zero.", "A number that falls exactly on a mark is an integer; one that falls between marks is not."] },
      ],
    },
    limits: "Whole numbers from −30 to 99 against simple fractions and decimals.",
  },
  // ============================================================ ajordd
  {
    id: "ajordd",
    arity: 4,
    title: "Ordering integers from greatest to smallest",
    competency: INT,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (p.some((x) => x < -15 || x > 15) || new Set(p).size !== 4 ? "Four different integers from −15 to 15." : null),
    prompt: (p) => `Arrange these integers in decreasing order (greatest first): ${p.map(neg).join(", ")}. Write them separated by commas.`,
    solve: (p) => {
      const s = [...p].sort((a, b) => b - a);
      return { steps: [st("place", "order", INT, p, tup(s))], answer: tup(s) };
    },
    // independent: each given number once, and each number smaller than the one before it (checked by subtraction)
    validate: (p, v) => {
      const xs = readTuple(typeof v === "string" && !v.startsWith("(") ? `(${v})` : v);
      if (!xs || xs.length !== 4 || !p.every((x) => xs.filter((y) => y === x).length === 1)) return false;
      for (let i = 1; i < xs.length; i++) if (xs[i - 1] - xs[i] <= 0) return false;
      return true;
    },
    bugs: (p) => {
      const right = tup([...p].sort((a, b) => b - a));
      return differ(right, [
        { id: "ignore-sign", kind: "conceptual", competency: INT, says: "The numbers were ordered by their size without the minus sign. A negative number is less than zero and less than every positive number.", predict: tup([...p].sort((a, b) => Math.abs(b) - Math.abs(a) || b - a)) },
        { id: "negatives-reversed", kind: "conceptual", competency: INT, says: "Among the negative numbers, the one with the bigger digit was taken as greater. −2 is closer to zero than −8, so −2 is greater.", predict: tup([...p.filter((x) => x >= 0).sort((a, b) => b - a), ...p.filter((x) => x < 0).sort((a, b) => a - b)]) },
        { id: "increasing", kind: "procedural", competency: INT, says: "The numbers were written smallest first; decreasing order starts with the greatest.", predict: tup([...p].sort((a, b) => a - b)) },
      ]);
    },
    distractors: (p) => {
      const s = [...p].sort((a, b) => b - a);
      return [tup([s[1], s[0], s[2], s[3]]), tup([s[0], s[1], s[3], s[2]])];
    },
    variants: () => [],
    explain: (x) => `On the number line, numbers decrease from right to left: ${x.value}`,
    domain: [[-15, 15], [-15, 15], [-15, 15], [-15, 15]],
    keep: (p) => new Set(p).size === 4 && p.filter((x) => x < 0).length >= 2 && p.some((x) => x > 0) && !p.every((x, i) => i === 0 || x < p[i - 1]),
    cap: 400,
    difficulty: (p) => (p.filter((x) => x < 0).length >= 3 ? 3 : Math.max(...p.map(Math.abs)) > 9 ? 2 : 1),
    teach: {
      idea: "On a number line, numbers get greater to the right. Every positive number is greater than zero, and zero is greater than every negative number; among negatives, the one closer to zero is greater.",
      method: "Write the positive numbers first, from greatest to smallest, then zero if it is there, then the negative numbers starting with the one closest to zero.",
      visual: (p) => ({ type: "numberline", from: -15, to: 15, step: 5, marks: [...p] }),
      alternatives: [
        { id: "temperature", title: "Think of temperatures", kind: "conceptual", text: ["A temperature a little below zero is warmer than one far below zero.", "Put the warmest temperature first and the coldest last."] },
      ],
    },
    limits: "Four integers from −15 to 15; increasing order is another family.",
  },
  // ============================================================ agpgrid
  {
    id: "agpgrid",
    arity: 2,
    title: "A shaded grid as a percentage",
    competency: PCT,
    type: "integer",
    parse: none,
    reject: ([g, k]) => {
      if (!inRange([g, k], [[0, GRIDS.length - 1], [1, 99]])) return "A grid and a number of shaded squares.";
      const n = GRIDS[g][0] * GRIDS[g][1];
      return k >= n ? "Fewer shaded squares than the grid has." : null;
    },
    prompt: ([g]) => `The grid in the picture has ${GRIDS[g][0] * GRIDS[g][1]} equal squares. What percentage of the grid is shaded? (Give the number of per cent: for 50% write 50.)`,
    figure: ([g, k]) => ({ type: "grid", rows: GRIDS[g][0], cols: GRIDS[g][1], shaded: k }),
    solve: ([g, k]) => {
      const n = GRIDS[g][0] * GRIDS[g][1];
      return { steps: [st("fraction", "count", PCT, [k, n], `${k}/${n}`), st("percent", "rename", PCT, [k, n], (k * 100) / n)], answer: (k * 100) / n };
    },
    // independent: the percentage p is the one for which p hundredths of the grid is exactly the shaded count
    validate: ([g, k], v) => typeof v === "number" && Number.isInteger(v) && v * GRIDS[g][0] * GRIDS[g][1] === k * 100,
    bugs: ([g, k]) => {
      const n = GRIDS[g][0] * GRIDS[g][1];
      return differ((k * 100) / n, [
        { id: "count-as-percent", kind: "conceptual", competency: PCT, says: `The shaded squares were counted as the percentage. Per cent means out of 100, and this grid has ${n} squares, so first find how many hundredths are shaded.`, predict: n !== 100 ? k : null },
        { id: "unshaded", kind: "procedural", competency: PCT, says: "The unshaded part was given. The question asks about the shaded squares.", predict: 100 - (k * 100) / n },
      ]);
    },
    variants: () => [],
    explain: (x) => (x.id === "fraction" ? `${x.inputs[0]} of the ${x.inputs[1]} squares are shaded: ${x.value}` : `Rename it as hundredths, which is the percentage: ${x.value}%`),
    domain: [[0, GRIDS.length - 1], [1, 99]],
    keep: ([g, k]) => k < GRIDS[g][0] * GRIDS[g][1] && (k * 100) % (GRIDS[g][0] * GRIDS[g][1]) === 0,
    difficulty: ([g]) => (g === 0 ? 1 : g === 3 ? 2 : 3),
    teach: {
      idea: "Per cent means out of 100. A shaded grid shows a fraction of the whole, and renaming that fraction as hundredths gives the percentage.",
      method: "Count the shaded squares and all the squares to get a fraction. Multiply the top and bottom by the same number to make the bottom 100; the top is the percentage.",
      visual: ([g, k]) => ({ type: "grid", rows: GRIDS[g][0], cols: GRIDS[g][1], shaded: k }),
      alternatives: [
        { id: "each_square", title: "What is one square worth?", kind: "procedural", text: ["Divide 100% by the number of squares to find what one square is worth.", "Multiply by the number of shaded squares."] },
      ],
    },
    limits: "Grids of 10, 20, 25, 50 or 100 squares; other shapes are another family.",
  },
  // ============================================================ agpfr
  {
    id: "agpfr",
    arity: 2,
    title: "Writing a fraction as a percentage",
    competency: PCT,
    type: "integer",
    parse: none,
    reject: ([n, d]) => (![2, 4, 5, 10, 20, 25, 50].includes(d) || n < 1 || n >= d ? "A proper fraction with bottom number 2, 4, 5, 10, 20, 25 or 50." : null),
    prompt: ([n, d]) => `Write ${n}/${d} as a percentage. (Give the number of per cent: for 50% write 50.)`,
    solve: ([n, d]) => ({ steps: [st("scale", "multiply", PCT, [n, d, 100 / d], `${(n * 100) / d}/100`), st("percent", "rename", PCT, [(n * 100) / d], (n * 100) / d)], answer: (n * 100) / d }),
    // independent: search for the whole number p with p/100 = n/d (cross-multiplication)
    validate: ([n, d], v) => {
      let p = -1;
      for (let q = 0; q <= 100; q++) if (q * d === 100 * n) p = q;
      return v === p;
    },
    bugs: ([n, d]) =>
      differ((n * 100) / d, [
        { id: "top-as-percent", kind: "conceptual", competency: PCT, says: `The top number was taken as the percentage. Per cent means out of 100, so first rename ${n}/${d} with 100 as the bottom number.`, predict: n },
        { id: "added-to-100", kind: "conceptual", competency: PCT, says: `The same number was added to the top and the bottom to make 100. Equivalent fractions come from multiplying: ${n}/${d} = ${(n * 100) / d}/100.`, predict: n + 100 - d <= 100 ? n + 100 - d : null },
      ]),
    variants: () => [],
    explain: (x) => (x.id === "scale" ? `Multiply the top and bottom by ${x.inputs[2]}: ${x.value}` : `${x.inputs[0]} hundredths is ${x.value} per cent: ${x.value}%`),
    domain: [[1, 49], [2, 50]],
    keep: ([n, d]) => [2, 4, 5, 10, 20, 25, 50].includes(d) && n < d,
    difficulty: ([, d]) => (d <= 5 ? 1 : d <= 20 ? 2 : 3),
    teach: {
      idea: "Per cent means out of 100, so a percentage is a fraction with 100 as its bottom number.",
      method: "Find what to multiply the bottom number by to make 100. Multiply the top by the same number; the new top is the percentage.",
      alternatives: [
        { id: "grid", title: "Shade a hundred grid", kind: "conceptual", text: ["A hundred grid has a hundred equal squares.", "Shade the fraction of it and count the shaded squares: that count is the percentage."] },
      ],
    },
    limits: "Proper fractions whose bottom number divides 100; percentages over 100 are another family.",
  },
  // ============================================================ abcest
  {
    id: "abcest",
    arity: 2,
    title: "Estimating how many small measures fill a container",
    competency: CAP,
    type: "choice",
    parse: none,
    reject: (p) => {
      if (!inRange(p, [[0, CONTAINERS.length - 1], [0, MEASURES.length - 1]])) return "A container and a small measure.";
      const { right } = capOf(p);
      return !Number.isInteger(right) || right < 3 || right > 20000 ? "A whole, sensible count." : null;
    },
    prompt: (p) => {
      const { c, m } = capOf(p);
      return `A ${m.name} holds about ${m.ml} mL of water and a ${c.name} holds about ${c.L} L. About how many ${m.name}s of water fill the ${c.name}?`;
    },
    choices: (p) => capOf(p).opts.map(fmtCount),
    solve: (p) => {
      const { c, m, right, opts } = capOf(p);
      return { steps: [st("convert", "convert", "MATH.measurement.unit-conversions", [`${c.L} L`], `${c.L * 1000} mL`), st("divide", "divide", CAP, [c.L * 1000, m.ml], right), st("pick", "choose the option", CAP, [right], opts.indexOf(right))], answer: opts.indexOf(right) };
    },
    // independent: litres are read from the wording and converted (1 L = 1000 mL); the option whose count of measures
    // makes the container's volume is the only right one
    validate: (p, v) => {
      const ch = capOf(p).opts.map(fmtCount);
      const words = (B28.find((f) => f.id === "abcest")!.prompt as (q: number[]) => string)(p);
      const mL = Number(words.match(/about (\d+) mL/)![1]);
      const L = Number(words.match(/about (\d+) L\./)![1]);
      const ok = ch.map((x) => near(Number(x.replace(/,/g, "")) * mL, L * 1000));
      return typeof v === "number" && ok.filter(Boolean).length === 1 && ok[v] === true;
    },
    bugs: (p) => {
      const { opts, right, tenths } = capOf(p);
      return differ(opts.indexOf(right), [
        { id: "litre-as-100", kind: "recall", competency: "MATH.measurement.unit-conversions", says: "A litre was taken as 100 mL. One litre is 1000 mL, so a container holds ten times more than that gives.", predict: tenths ? opts.indexOf(right / 10) : null },
        { id: "litre-as-10000", kind: "recall", competency: "MATH.measurement.unit-conversions", says: "Too many zeros were added when changing litres into millilitres. One litre is 1000 mL.", predict: opts.indexOf(right * 10) },
      ]);
    },
    variants: () => [],
    explain: (x) => (x.id === "convert" ? `Change litres into millilitres: ${x.inputs[0]} is ${x.value}` : x.id === "divide" ? `How many measures make it: ${x.inputs[0]} mL ÷ ${x.inputs[1]} mL = ${x.value}` : `About ${x.inputs[0]}: that is option ${LETTERS[Number(x.value)]}, so the answer is ${LETTERS[Number(x.value)]}`),
    domain: [[0, CONTAINERS.length - 1], [0, MEASURES.length - 1]],
    difficulty: ([ci, mi]) => (CONTAINERS[ci].L <= 5 && MEASURES[mi].ml >= 100 ? 1 : CONTAINERS[ci].L >= 500 || MEASURES[mi].ml <= 10 ? 3 : 2),
    teach: {
      idea: "To estimate how many small measures fill a container, put both amounts in the same unit and divide. One litre is 1000 mL.",
      method: "Change the container's litres into millilitres, then work out how many of the small measure make that amount.",
      visual: ([ci, mi]) => ({ type: "table", head: ["", "Holds about", "In mL"], rows: [[CONTAINERS[ci].name, `${CONTAINERS[ci].L} L`, `${CONTAINERS[ci].L * 1000} mL`], [MEASURES[mi].name, `${MEASURES[mi].ml} mL`, `${MEASURES[mi].ml} mL`]] }),
      alternatives: [
        { id: "build_up", title: "Build up to one litre", kind: "procedural", text: ["First find how many small measures make one litre.", "Then multiply by the number of litres the container holds."] },
      ],
    },
    limits: "Everyday containers from 1 L to 1000 L and measures from a 5 mL spoon to a 300 mL mug, with whole counts.",
  },
];
