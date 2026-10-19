/**
 * Batch b10 (families@2), Grades 6–8 number: ordering integers, operation properties, prime factorisation, ratio,
 * unit rates, exponent laws, Indian and international numeration, integer multiplication, profit and loss, simple
 * and compound interest, dividing in a ratio, rational-number operations, cubes, linear and exponential growth, and
 * place-value systems in other bases. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { EXP, MT, factSlip, gcd, near, sup } from "../family-kit";

const INT = "MATH.number.integers";
const OPP = "MATH.number.operation-properties";
const PF = "MATH.number.prime-factorisation";
const RAT = "MATH.number.ratio";
const UR = "MATH.number.unit-rate";
const IIN = "MATH.number.indian-international-numeration";
const IMUL = "MATH.number.integer-multiply";
const PL = "MATH.number.profit-loss";
const RDIV = "MATH.number.ratio-division";
const RQ = "MATH.number.rational-numbers";
const CI = "MATH.number.compound-interest";
const CUBE = "MATH.number.cubes";
const GROW = "MATH.number.exponential-growth";
const BASE = "MATH.number.number-bases";
const PCT = "MATH.number.percentage";
const PRIMES = "MATH.number.primes";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nm = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A number as the second operand: in brackets when negative. */
const pr = (v: number) => (v < 0 ? `(−${-v})` : String(v));
/** Indian digit grouping: 1,00,000. */
const inr = (v: number) => {
  const s = String(Math.abs(v));
  if (s.length <= 3) return (v < 0 ? "−" : "") + s;
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return (v < 0 ? "−" : "") + parts.join(",") + "," + s.slice(-3);
};
const rs = (v: number) => `₹${inr(v)}`;
/** The numbers of a tuple answer "(−5, −2, 0, 3)" (null if not readable). */
const nums = (v: Value): number[] | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/−/g, "-").replace(/[()\s]/g, "");
  if (!t) return null;
  const xs = t.split(",").map(Number);
  return xs.every((x) => Number.isInteger(x)) ? xs : null;
};
const tup = (xs: number[]) => `(${xs.map(n_).join(", ")})`;
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
/** Prime factors with repeats, smallest first. */
const primeList = (n: number) => {
  const out: number[] = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % p === 0) {
    out.push(p);
    m /= p;
  }
  if (m > 1) out.push(m);
  return out;
};
/** Prime → exponent. */
const expo = (n: number) => {
  const m = new Map<number, number>();
  for (const p of primeList(n)) m.set(p, (m.get(p) ?? 0) + 1);
  return m;
};
const isSquare = (n: number) => {
  let r = 0;
  while (r * r < n) r++;
  return r * r === n;
};
const isCube = (n: number) => {
  let r = 0;
  while (r * r * r < n) r++;
  return r * r * r === n;
};
const ratio = (a: number, b: number) => {
  const g = gcd(a, b);
  return `${a / g}:${b / g}`;
};
const ratioNums = (v: Value): [number, number] | null => {
  if (typeof v !== "string") return null;
  const m = v.replace(/\s/g, "").match(/^(\d+):(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const big = (a: number, n: number) => BigInt(a) ** BigInt(n);
const keepBugs = (xs: (Bug | null | false)[]) => xs.filter((b): b is Bug => !!b && b.predict !== null);
const intOrNull = (v: number) => (Number.isInteger(v) ? v : null);

export const B10: Def[] = [
  // ------------------------------------------------------------------ integers: order
  {
    id: "ajord",
    arity: 4,
    title: "Ordering positive and negative integers",
    competency: INT,
    type: "tuple",
    mc: true,
    parse: none,
    reject: (p) => (p.some((x) => x < -9 || x > 9) || new Set(p).size !== 4 ? "Four different integers from −9 to 9." : null),
    prompt: (p) => `Arrange these integers in increasing order (smallest first): ${p.map(n_).join(", ")}. Write them separated by commas.`,
    solve: (p) => {
      const s = [...p].sort((a, b) => a - b);
      return { steps: [{ id: "place", op: "order", competency: INT, inputs: p, value: tup(s) }], answer: tup(s) };
    },
    // independent: the answer uses each given number once, and each number is greater than the one before it
    // (the difference next − previous is positive), checked by subtraction rather than sorting
    validate: (p, v) => {
      const xs = nums(v);
      if (!xs || xs.length !== p.length) return false;
      for (const x of p) if (xs.filter((y) => y === x).length !== 1) return false;
      for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] <= 0) return false;
      return true;
    },
    bugs: (p) => {
      const byAbs = [...p].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
      const negs = p.filter((x) => x < 0).sort((a, b) => b - a);
      const rest = p.filter((x) => x >= 0).sort((a, b) => a - b);
      const [lo, hi] = [negs[negs.length - 1], negs[negs.length - 2]];
      return [
        { id: "ignore-sign", kind: "conceptual", competency: INT, says: `The numbers were ordered by their size without the minus sign. On the number line, ${n_(lo)} is to the left of ${n_(hi)}, so ${n_(lo)} is smaller.`, predict: tup(byAbs) },
        { id: "negatives-reversed", kind: "conceptual", competency: INT, says: `Among the negative numbers, the one with the bigger digit was taken as bigger. ${n_(lo)} is further below zero than ${n_(hi)}, so ${n_(lo)} is the smaller number.`, predict: tup([...negs, ...rest]) },
        { id: "decreasing", kind: "procedural", competency: INT, says: "The numbers were written largest first; increasing order starts with the smallest.", predict: tup([...p].sort((a, b) => b - a)) },
      ];
    },
    distractors: (p) => {
      const s = [...p].sort((a, b) => a - b);
      return [tup(p), tup([s[1], s[0], s[2], s[3]]), tup([s[0], s[1], s[3], s[2]])];
    },
    variants: () => [],
    explain: (s) => `On the number line, numbers increase from left to right: ${s.value}`,
    domain: [[-9, 9], [-9, 9], [-9, 9], [-9, 9]],
    keep: (p) => new Set(p).size === 4 && p.filter((x) => x < 0).length >= 2 && p.some((x) => x > 0) && !p.every((x, i) => i === 0 || x > p[i - 1]),
    cap: 400,
    difficulty: (p) => (p.some((x) => x > 0 && p.includes(-x)) ? 3 : p.filter((x) => x < 0).length >= 3 ? 2 : 1),
    word: (p) => `In a building, the ground floor is floor 0, floors above are 1, 2, 3 … and basement floors are −1, −2, −3 …. Four lifts are at floors ${p.map(n_).join(", ")}. List these floors from the lowest to the highest, separated by commas.`,
    teach: {
      idea: "On a number line, numbers get bigger as you move to the right. Every negative number is left of 0, and the further a negative number is from 0, the smaller it is.",
      method: "Mark the numbers on a number line, then read them from left to right.",
      visual: (p) => ({ type: "numberline", from: -10, to: 10, step: 1, marks: p }),
      alternatives: [
        { id: "thermometer", title: "Think of a thermometer", kind: "conceptual", text: ["−8 °C is colder than −3 °C: it is further below zero.", "So start with the coldest (most negative) temperature and go up to the warmest."] },
      ],
    },
    limits: "Four different integers from −9 to 9, with at least two negatives and one positive; larger integers use the same idea.",
  },

  // ------------------------------------------------------------------ operation properties
  {
    id: "ajd99",
    arity: 2,
    title: "Multiplying by a number near 100 using the distributive property",
    competency: OPP,
    skill: "MLY.alg.distributive",
    type: "integer",
    mc: true,
    parse: none,
    reject: ([k, d]) => (k < 12 || k > 99 || d === 0 || Math.abs(d) > 2 ? "k × (100 ± 1 or 2), with k from 12 to 99." : null),
    prompt: ([k, d]) => `Work out ${k} × ${100 + d} without long multiplication.`,
    solve: ([k, d]) => ({
      steps: [
        { id: "hundred", op: "multiply", competency: OPP, inputs: [k, 100], value: k * 100 },
        { id: "part", op: "multiply", competency: MT, inputs: [k, Math.abs(d)], value: k * Math.abs(d) },
        { id: "combine", op: d < 0 ? "subtract" : "add", competency: OPP, inputs: [k * 100, k * Math.abs(d)], value: k * (100 + d) },
      ],
      answer: k * (100 + d),
    }),
    // independent: repeated addition of k, (100 + d) times
    validate: ([k, d], v) => {
      let s = 0;
      for (let i = 0; i < 100 + d; i++) s += k;
      return v === s;
    },
    bugs: ([k, d]) => [
      { id: "wrong-sign-correction", kind: "conceptual", competency: OPP, says: `${100 + d} is 100 ${d < 0 ? "minus" : "plus"} ${Math.abs(d)}, so ${k} × ${Math.abs(d)} must be ${d < 0 ? "taken away from" : "added to"} ${k} × 100.`, predict: k * (100 - d) },
      { id: "correction-not-multiplied", kind: "procedural", competency: OPP, says: `Only ${Math.abs(d)} was ${d < 0 ? "taken away" : "added"}; every one of the ${k} lots ${d < 0 ? "loses" : "gains"} ${Math.abs(d)}, so it is ${k} × ${Math.abs(d)}.`, predict: k * 100 + d },
      { id: "part-left-out", kind: "procedural", competency: OPP, says: `Only ${k} × 100 was found; the ${k} × ${Math.abs(d)} part was left out.`, predict: k * 100 },
    ],
    variants: () => [],
    explain: (s) => (s.id === "hundred" ? `${s.inputs[0]} × 100 = ${s.value}` : s.id === "part" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} ${s.op === "subtract" ? "−" : "+"} ${s.inputs[1]} = ${s.value}`),
    domain: [[12, 99], [-2, 2]],
    keep: ([, d]) => d !== 0,
    difficulty: ([k, d]) => (Math.abs(d) === 1 && k < 50 ? 1 : Math.abs(d) === 1 ? 2 : 3),
    word: ([k, d]) => `A school buys ${k} chairs at ₹${100 + d} each. What is the total cost, in rupees?`,
    teach: {
      idea: `Multiplication spreads over addition and subtraction: k × (100 − 2) = k × 100 − k × 2.`,
      method: "Write the number near 100 as 100 plus or minus a little, multiply k by each part, then add or take away.",
      alternatives: [
        { id: "area_split", title: "Split a rectangle", kind: "conceptual", text: ["Think of k × 98 as the area of a rectangle k by 98.", "It is a k by 100 rectangle with a k by 2 strip cut off: k × 100 − k × 2."] },
      ],
    },
    limits: "A two-digit number times 98, 99, 101 or 102; other near-round numbers (49², 998 × 1002) use the same idea.",
  },
  {
    id: "ajbrk",
    arity: 4,
    title: "Removing brackets after a minus sign",
    competency: OPP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c, s]) => (a < 20 || a > 99 || b < 10 || b > 60 || c < 2 || c > 30 || (s !== 0 && s !== 1) || b <= c || a - b - c < 0 ? "a − (b ± c) with whole numbers and a whole-number answer." : null),
    prompt: ([a, b, c, s]) => `Remove the brackets first, then work out: ${a} − (${b} ${s ? "+" : "−"} ${c}) = ?`,
    solve: ([a, b, c, s]) => ({
      steps: [
        { id: "remove", op: "rewrite", competency: OPP, inputs: [a, b, c, s], value: s ? `${a} − ${b} − ${c}` : `${a} − ${b} + ${c}` },
        { id: "first", op: "subtract", competency: "MATH.number.integer-add", inputs: [a, b], value: a - b },
        { id: "last", op: s ? "subtract" : "add", competency: "MATH.number.integer-add", inputs: [a - b, c], value: s ? a - b - c : a - b + c },
      ],
      answer: s ? a - b - c : a - b + c,
    }),
    // independent: the other route, working out the bracket first and then subtracting it
    validate: ([a, b, c, s], v) => {
      const inside = s ? b + c : b - c;
      return v === a - inside;
    },
    bugs: ([a, b, c, s]) => [
      { id: "sign-not-changed", kind: "conceptual", competency: OPP, says: `When brackets after a minus sign are removed, every sign inside changes: ${a} − (${b} ${s ? "+" : "−"} ${c}) = ${a} − ${b} ${s ? "−" : "+"} ${c}.`, predict: s ? a - b + c : a - b - c },
      { id: "last-term-dropped", kind: "procedural", competency: OPP, says: `The ${c} inside the brackets was forgotten after the brackets were removed.`, predict: a - b },
    ],
    distractors: ([a, b, c, s]) => [s ? a + b + c : a + b - c],
    variants: () => [],
    explain: (s) => (s.id === "remove" ? `Without brackets: ${s.value} (the minus sign changes every sign inside)` : `${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}`),
    domain: [[20, 99], [10, 60], [2, 30], [0, 1]],
    keep: ([a, b, c]) => (a - b) % 10 === 0 && a - b > 0 && b > c && a - b - c >= 0,
    cap: 400,
    difficulty: ([, , , s]) => (s ? 1 : 2),
    word: ([a, b, c, s]) => (s ? `${nm(a)} had ₹${a}. ${nm(a)} bought a notebook for ₹${b} and a pen for ₹${c}. How much money is left, in rupees?` : `${nm(a)} had ₹${a} and paid ₹${b} for a set of books. The shopkeeper gave back ₹${c} because one book was missing. How much money does ${nm(a)} have now, in rupees?`),
    teach: {
      idea: "Taking away a bracket takes away everything inside it: taking away (b − c) takes away b but gives c back.",
      method: "Remove the brackets and change the sign of every term inside, then group numbers that are easy to combine.",
      alternatives: [
        { id: "money", title: "Money in and out", kind: "conceptual", text: ["Spending ₹47 and then getting ₹8 back is the same as spending ₹(47 − 8).", "So 100 − (47 − 8) = 100 − 47 + 8."] },
      ],
    },
    limits: "a − (b − c) and a − (b + c) with whole numbers and a whole-number answer; nested brackets and negative terms are later.",
  },

  // ------------------------------------------------------------------ prime factorisation
  {
    id: "ajpf",
    arity: 1,
    title: "Writing a number as a product of primes",
    competency: PF,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([n]) => (n < 16 || n > 400 || primeList(n).length < 3 || primeList(n).some((p) => p > 19) ? "Numbers from 16 to 400 with at least three prime factors, all up to 19." : null),
    prompt: ([n]) => `Write ${n} as a product of prime numbers. List the primes from smallest to largest, repeating a prime as often as it occurs (for example, 12 is written 2, 2, 3).`,
    solve: ([n]) => {
      const ps = primeList(n);
      const steps: Step[] = [];
      let m = n;
      for (const p of ps) {
        steps.push({ id: `div${steps.length}`, op: "divide", competency: PF, inputs: [m, p], value: m / p });
        m /= p;
      }
      return { steps, answer: tup(ps) };
    },
    // independent: every listed number is prime (trial division), they are in order, and they multiply back to n
    validate: ([n], v) => {
      const xs = nums(v);
      if (!xs || !xs.length) return false;
      let prod = 1;
      for (let i = 0; i < xs.length; i++) {
        if (!isPrime(xs[i]) || (i && xs[i] < xs[i - 1])) return false;
        prod *= xs[i];
      }
      return prod === n;
    },
    bugs: ([n]) => {
      const ps = primeList(n);
      const last = ps.slice(0, -2);
      const combined = ps[ps.length - 2] * ps[ps.length - 1];
      const uniq = [...new Set(ps)];
      return keepBugs([
        { id: "composite-left", kind: "procedural", competency: PF, says: `The splitting stopped too early: ${combined} is not prime, so it can still be split into ${ps[ps.length - 2]} × ${ps[ps.length - 1]}.`, predict: tup([...last, combined].sort((a, b) => a - b)) },
        { id: "one-included", kind: "conceptual", competency: PRIMES, says: "1 was written as a factor. 1 is not a prime number, so it is not part of the list.", predict: tup([1, ...ps]) },
        uniq.length < ps.length && { id: "repeat-missed", kind: "conceptual", competency: PF, says: "Each prime was written only once. A prime must be written as many times as it divides the number.", predict: tup(uniq) },
      ]);
    },
    distractors: ([n]) => {
      const ps = primeList(n);
      return [tup([ps[0] * ps[1], ...ps.slice(2)].sort((a, b) => a - b)), tup([...ps, ps[ps.length - 1]])];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`,
    domain: [[16, 400]],
    cap: 400,
    difficulty: ([n]) => (n <= 100 ? 1 : primeList(n).some((p) => p >= 7) ? 3 : 2),
    teach: {
      idea: "Every whole number greater than 1 is either prime or can be split into primes in exactly one way (apart from order).",
      method: "Divide by the smallest prime that goes exactly (2, then 3, then 5 …) again and again until 1 is left. The divisors are the prime factors.",
      alternatives: [
        { id: "factor_tree", title: "A factor tree", kind: "procedural", text: ["Split the number into any two factors, for example 72 = 8 × 9.", "Keep splitting every factor that is not prime: 8 = 2 × 2 × 2 and 9 = 3 × 3.", "The primes at the ends of the branches are the answer: 2, 2, 2, 3, 3."] },
      ],
    },
    limits: "Numbers from 16 to 400 with at least three prime factors, all at most 19; index form (2³ × 3²) is checked as the same list.",
  },
  {
    id: "ajsqm",
    arity: 1,
    title: "The smallest multiplier that makes a perfect square",
    competency: PF,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n]) => {
      if (n < 8 || n > 500 || isSquare(n)) return "A number from 8 to 500 that is not a perfect square.";
      let m = 1;
      for (const [p, e] of expo(n)) if (e % 2) m *= p;
      return m === n ? "The number must have a square factor." : null;
    },
    prompt: ([n]) => `What is the smallest whole number that ${n} must be multiplied by so that the product is a perfect square?`,
    solve: ([n]) => {
      let m = 1;
      for (const [p, e] of expo(n)) if (e % 2) m *= p;
      return {
        steps: [
          { id: "factor", op: "factorise", competency: PF, inputs: [n], value: primeList(n).join(" × ") },
          { id: "unpaired", op: "multiply", competency: PF, inputs: [...expo(n)].filter(([, e]) => e % 2).map(([p]) => p), value: m },
        ],
        answer: m,
      };
    },
    // independent: try multipliers 1, 2, 3 … until the product is a perfect square
    validate: ([n], v) => {
      for (let k = 1; k <= n; k++) if (isSquare(n * k)) return v === k;
      return false;
    },
    bugs: ([n]) => {
      const ex = [...expo(n)];
      const odd = ex.filter(([, e]) => e % 2).map(([p]) => p);
      return keepBugs([
        { id: "largest-prime", kind: "procedural", competency: PF, says: `The largest prime factor of ${n} was used; the primes without a partner decide the multiplier, not the largest prime.`, predict: Math.max(...ex.map(([p]) => p)) },
        odd.length > 1 && { id: "one-unpaired", kind: "procedural", competency: PF, says: "Only one of the primes without a partner was used; every prime without a partner needs one more copy.", predict: odd[0] },
        { id: "itself", kind: "conceptual", competency: PF, says: `${n} × ${n} is a perfect square, but it is not the smallest; only the primes without a partner are needed.`, predict: n },
      ]);
    },
    distractors: ([n]) => {
      let m = 1;
      for (const [p, e] of expo(n)) if (e % 2) m *= p;
      return [primeList(n)[0], n / m, 2 * m];
    },
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `${s.inputs[0]} = ${s.value}` : `Primes without a partner: ${s.inputs.join(" × ")} = ${s.value}`),
    domain: [[8, 500]],
    difficulty: ([n]) => {
      const odd = [...expo(n)].filter(([, e]) => e % 2).length;
      return n <= 100 ? 1 : odd === 1 ? 2 : 3;
    },
    word: ([n]) => `A gardener has ${n} square tiles. She wants to join some identical sets of ${n} tiles to make one large square with no tiles left over. What is the smallest number of sets she needs?`,
    teach: {
      idea: "In a perfect square every prime factor comes in pairs, because the number is something times itself.",
      method: "Write the number as a product of primes and pair equal primes. Multiply together the primes that have no partner: that is the smallest multiplier.",
      alternatives: [
        { id: "index", title: "Even powers", kind: "procedural", text: ["Write the number in index form, for example 180 = 2² × 3² × 5.", "A perfect square has only even powers, so multiply by each prime with an odd power once: here by 5."] },
      ],
    },
    limits: "Numbers from 8 to 500 that have a square factor but are not perfect squares; dividing to make a square is the same idea.",
  },

  // ------------------------------------------------------------------ ratio
  {
    id: "ajrat",
    arity: 4,
    title: "A ratio in its simplest form",
    competency: RAT,
    type: "ratio",
    mc: true,
    parse: none,
    reject: ([x, y, g, u]) => (x < 1 || y < 1 || x > 12 || y > 12 || x === y || gcd(x, y) !== 1 || g < 2 || g > 75 || (u !== 0 && u !== 1) || (u === 0 && g > 15) || (u === 1 && (y * g) % 100 !== 0) ? "Two quantities x·g and y·g (x, y coprime up to 12); in cm and m the second is a whole number of metres." : null),
    prompt: ([x, y, g, u]) => (u ? `Write the ratio of ${x * g} cm to ${(y * g) / 100} m in its simplest form.` : `Write the ratio ${x * g} : ${y * g} in its simplest form.`),
    solve: ([x, y, g, u]) => ({
      steps: [
        ...(u ? [{ id: "units", op: "convert", competency: "MATH.measurement.unit-conversions", inputs: [(y * g) / 100], value: y * g } as Step] : []),
        { id: "hcf", op: "hcf", competency: RAT, inputs: [x * g, y * g], value: g },
        { id: "divide", op: "divide", competency: RAT, inputs: [x * g, y * g, g], value: `${x}:${y}` },
      ],
      answer: `${x}:${y}`,
    }),
    // independent: cross-multiplication (a/b = first/second) and no common factor, found by trying every divisor
    validate: ([x, y, g], v) => {
      const r = ratioNums(v);
      if (!r || !r[0] || !r[1]) return false;
      for (let d = 2; d <= Math.min(r[0], r[1]); d++) if (r[0] % d === 0 && r[1] % d === 0) return false;
      return r[0] * y * g === r[1] * x * g;
    },
    bugs: ([x, y, g, u]) => {
      let q = 2;
      while (g % q) q++;
      return keepBugs([
        q < g && { id: "not-simplest", kind: "procedural", competency: RAT, says: `Both numbers were divided by ${q}, but they still have a common factor; divide by their highest common factor, ${g}.`, predict: `${(x * g) / q}:${(y * g) / q}` },
        { id: "order-reversed", kind: "conceptual", competency: RAT, says: "The ratio was written the other way round; the first quantity named comes first.", predict: `${y}:${x}` },
        u === 1 && { id: "units-not-matched", kind: "conceptual", competency: RAT, says: "The two lengths were compared in different units. Change metres to centimetres first (1 m = 100 cm).", predict: ratio(x * g, (y * g) / 100) },
      ]);
    },
    distractors: ([x, y, g]) => [`${x * g}:${y * g}`, `${x + 1}:${y}`, `${x}:${y + 1}`],
    variants: () => [],
    explain: (s) => (s.id === "units" ? `${s.inputs[0]} m = ${s.value} cm` : s.id === "hcf" ? `The highest common factor of ${s.inputs[0]} and ${s.inputs[1]} is ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[2]} : ${s.inputs[1]} ÷ ${s.inputs[2]} = ${s.value}`),
    domain: [[1, 12], [1, 12], [2, 75], [0, 1]],
    keep: ([x, y, g, u]) => x !== y && gcd(x, y) === 1 && (u === 0 ? g <= 15 : (y * g) % 100 === 0),
    cap: 450,
    difficulty: ([, , g, u]) => (u ? 3 : isPrime(g) ? 1 : 2),
    word: ([x, y, g, u]) => (u ? `A ribbon is ${x * g} cm long and a rope is ${(y * g) / 100} m long. What is the ratio of the length of the ribbon to the length of the rope, in its simplest form?` : `In a school there are ${x * g} girls and ${y * g} boys. What is the ratio of girls to boys, in its simplest form?`),
    teach: {
      idea: "A ratio compares two quantities of the same kind. Dividing both by the same number gives an equal ratio, like an equivalent fraction.",
      method: "Make the units the same, then divide both numbers by their highest common factor.",
      visual: ([x, y]) => ({ type: "bars", labels: ["first", "second"], values: [x, y] }),
      alternatives: [
        { id: "groups", title: "Equal groups", kind: "conceptual", text: ["18 : 24 means 18 of one thing for every 24 of another.", "Make groups of 6: 3 groups and 4 groups. So for every 3 of the first there are 4 of the second: 3 : 4."] },
      ],
    },
    limits: "Ratios of two whole numbers (or cm and whole metres) that simplify to x : y with x, y up to 12; three-term ratios are in ajrdiv.",
  },
  {
    id: "ajeqr",
    arity: 4,
    title: "The missing term of an equivalent ratio",
    competency: RAT,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([x, y, k, s]) => (x < 1 || y < 1 || x > 12 || y > 12 || x === y || k < 2 || k > 12 || (s !== 0 && s !== 1) ? "x : y = kx : ky with one term missing (x, y up to 12, k from 2 to 12)." : null),
    prompt: ([x, y, k, s]) => (s ? `Fill in the box: ${x} : ${y} = □ : ${y * k}. What number goes in the box?` : `Fill in the box: ${x} : ${y} = ${x * k} : □. What number goes in the box?`),
    solve: ([x, y, k, s]) => ({
      steps: [
        { id: "scale", op: "divide", competency: RAT, inputs: s ? [y * k, y] : [x * k, x], value: k },
        { id: "apply", op: "multiply", competency: MT, inputs: [s ? x : y, k], value: (s ? x : y) * k },
      ],
      answer: (s ? x : y) * k,
    }),
    // independent: cross-multiplication of the two ratios
    validate: ([x, y, k, s], v) => (typeof v === "number" ? (s ? v * y === x * y * k : x * v === y * x * k) : false),
    bugs: ([x, y, k, s]) => [
      { id: "additive", kind: "conceptual", competency: RAT, says: `The same amount was added to both terms. Equivalent ratios multiply both terms by the same number (here ${k}).`, predict: s ? x + (y * k - y) : y + (x * k - x) },
      { id: "scale-factor-given", kind: "procedural", competency: RAT, says: `${k} is how many times bigger the terms became; the missing term is ${s ? x : y} × ${k}.`, predict: k },
      ...((s ? x : y) >= 2 && (s ? x : y) <= 9 && k <= 9 ? [factSlip(s ? x : y, k)] : []),
    ],
    variants: () => [],
    explain: (s) => (s.id === "scale" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}: the terms were multiplied by ${s.value}` : `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[1, 12], [1, 12], [2, 12], [0, 1]],
    keep: ([x, y]) => x !== y,
    cap: 400,
    difficulty: ([x, y, k]) => (k <= 5 && x <= 5 && y <= 5 ? 1 : k <= 9 ? 2 : 3),
    word: ([x, y, k, s]) => (s ? `A school canteen mixes ${x} bags of sand with ${y} bags of cement for a floor. For a bigger floor it uses ${y * k} bags of cement. How many bags of sand keep the same ratio?` : `A school canteen mixes ${x} bags of sand with ${y} bags of cement for a floor. For a bigger floor it uses ${x * k} bags of sand. How many bags of cement keep the same ratio?`),
    teach: {
      idea: "Equivalent ratios are made by multiplying (or dividing) both terms by the same number, just like equivalent fractions.",
      method: "Find what the known term was multiplied by, then multiply the other term by the same number.",
      alternatives: [
        { id: "table", title: "A ratio table", kind: "procedural", text: ["Write the ratio in two rows: 2 | 3.", "Keep doubling, tripling … both rows together: 4 | 6, 6 | 9, 8 | 12, until you reach the known number."] },
      ],
    },
    limits: "Two-term ratios with terms up to 12 scaled by 2 to 12; comparing two ratios uses the same cross-multiplication.",
  },

  // ------------------------------------------------------------------ unit rate
  {
    id: "ajrate",
    arity: 3,
    title: "Finding a unit rate",
    competency: UR,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([r, k, t]) => (r < 12 || r > 99 || k < 3 || k > 12 || t < 0 || t > 3 ? "A rate from 12 to 99 per unit, over 3 to 12 units, in one of four contexts." : null),
    prompt: ([r, k, t]) => rateText(r, k, t),
    solve: ([r, k]) => ({ steps: [{ id: "share", op: "divide", competency: UR, inputs: [r * k, k], value: r }], answer: r }),
    // independent: take away the answer k times from the total; it must leave exactly nothing
    validate: ([r, k], v) => {
      if (typeof v !== "number" || v <= 0) return false;
      let left = r * k;
      for (let i = 0; i < k; i++) left -= v;
      return left === 0;
    },
    bugs: ([r, k]) => [
      { id: "multiplied", kind: "conceptual", competency: UR, says: `The total was multiplied by ${k}. To find the amount for one, share the total equally: divide by ${k}.`, predict: r * k * k },
      { id: "subtracted", kind: "conceptual", competency: UR, says: `${k} was taken away from the total; sharing equally means dividing.`, predict: r * k - k },
      { id: "division-slip", kind: "recall", competency: MT, says: `A division step slipped. Check by multiplying back: the answer × ${k} should give ${r * k}.`, predict: [r + 1, r - 1] },
    ],
    variants: () => [],
    explain: (s) => `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`,
    domain: [[12, 99], [3, 12], [0, 3]],
    cap: 400,
    difficulty: ([r, k]) => (k <= 5 && r < 50 ? 1 : k <= 9 ? 2 : 3),
    word: ([r, k, t]) => rateText(r, k, (t + 1) % 4),
    teach: {
      idea: "A unit rate is the amount for one unit: one kilogram, one hour, one kilometre or one day.",
      method: "Divide the total by the number of units. Check by multiplying back.",
      alternatives: [
        { id: "share_out", title: "Share it out", kind: "conceptual", text: ["Imagine the total being shared equally among the units, one by one.", "Each unit gets the same amount: that amount is the rate."] },
      ],
    },
    limits: "Whole-number rates from 12 to 99 over 3 to 12 units; rates with paise and changing units are other families.",
  },
  {
    id: "ajbest",
    arity: 4,
    title: "The better buy by unit price",
    competency: UR,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, u, b, w]) => (a < 2 || b > 12 || a >= b || u < 10 || u > 50 || w < 10 || w > 50 || u === w ? "Pack A (a items at u each) and a larger Pack B (b items at w each), different prices per item." : null),
    prompt: ([a, u, b, w]) => `Pack A has ${a} soaps for ₹${a * u}. Pack B has ${b} soaps for ₹${b * w}. Find the price of one soap in the pack that is better value, in rupees.`,
    solve: ([a, u, b, w]) => ({
      steps: [
        { id: "unitA", op: "divide", competency: UR, inputs: [a * u, a], value: u },
        { id: "unitB", op: "divide", competency: UR, inputs: [b * w, b], value: w },
        { id: "compare", op: "compare", competency: UR, inputs: [u, w], value: Math.min(u, w) },
      ],
      answer: Math.min(u, w),
    }),
    // independent: price the same number of soaps (the LCM of a and b) from each pack, by buying whole packs
    validate: ([a, u, b, w], v) => {
      let L = a;
      while (L % b) L += a;
      let costA = 0;
      for (let i = 0; i < L / a; i++) costA += a * u;
      let costB = 0;
      for (let i = 0; i < L / b; i++) costB += b * w;
      return typeof v === "number" && v * L === Math.min(costA, costB);
    },
    bugs: ([a, u, b, w]) => keepBugs([
      a * u !== b * w && { id: "lower-total", kind: "conceptual", competency: UR, says: "The pack with the lower total price was chosen. The packs hold different numbers of soaps, so compare the price of one soap.", predict: a * u < b * w ? u : w },
      { id: "bigger-pack", kind: "conceptual", competency: UR, says: "The bigger pack was taken to be the better value. A bigger pack is not always cheaper per item: compare the price of one soap.", predict: w },
      { id: "price-difference", kind: "procedural", competency: UR, says: "The difference between the two prices per soap was given; the question asks for the price of one soap in the better pack.", predict: Math.abs(u - w) },
    ]),
    variants: () => [],
    explain: (s) => (s.id === "compare" ? `₹${s.value} is the lower price per soap` : `${s.id === "unitA" ? "Pack A" : "Pack B"}: ₹${s.inputs[0]} ÷ ${s.inputs[1]} = ₹${s.value} per soap`),
    domain: [[2, 11], [10, 50], [3, 12], [10, 50]],
    keep: ([a, u, b, w]) => a < b && u !== w,
    cap: 400,
    difficulty: ([a, u, b, w]) => (u < w ? 3 : a * u > b * w ? 1 : 2),
    word: ([a, u, b, w]) => `${nm(a + b)} is buying dal. ${a === 8 ? "An" : "A"} ${a} kg bag costs ₹${a * u} and ${b === 8 || b === 11 ? "an" : "a"} ${b} kg bag costs ₹${b * w}. What is the price of 1 kg in the bag that is better value, in rupees?`,
    teach: {
      idea: "To compare packs of different sizes, compare the same amount from each: the price of one item is the fairest comparison.",
      method: "Divide each pack's price by the number of items, then choose the lower price per item.",
      alternatives: [
        { id: "same_number", title: "Buy the same number", kind: "procedural", text: ["Find a number of soaps both packs can make, for example 12 from packs of 4 and 6.", "Work out what 12 soaps cost using each pack, and see which is cheaper."] },
      ],
    },
    limits: "Two packs with whole-rupee prices per item from ₹10 to ₹50; offers like 'buy 2 get 1 free' are not included.",
  },
  {
    id: "ajwork",
    arity: 2,
    title: "Time taken working together",
    competency: UR,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([a, b]) => (a < 2 || b > 24 || a >= b ? "Two workers taking a and b days (2 ≤ a < b ≤ 24)." : null),
    prompt: ([a, b]) => `Arun can finish a job in ${a} days. Bala can finish the same job in ${b} days. Working together at these rates, how many days do they take? (A fraction is fine.)`,
    solve: ([a, b]) => ({
      steps: [
        { id: "rates", op: "add", competency: "MATH.number.fraction-add", inputs: [`1/${a}`, `1/${b}`], value: (a + b) / (a * b) },
        { id: "invert", op: "divide", competency: UR, inputs: [a * b, a + b], value: (a * b) / (a + b) },
      ],
      answer: (a * b) / (a + b),
    }),
    // independent: substitute back: in v days Arun does v/a of the job and Bala v/b; together that is the whole job
    validate: ([a, b], v) => typeof v === "number" && near(v / a + v / b, 1, 1e-9),
    bugs: ([a, b]) => [
      { id: "add-days", kind: "conceptual", competency: UR, says: "The days were added. Working together is faster than either alone, so the answer must be less than both.", predict: a + b },
      { id: "average-days", kind: "conceptual", competency: UR, says: "The average of the two times was found. Two people working together finish sooner than the faster one alone.", predict: (a + b) / 2 },
      { id: "rate-not-inverted", kind: "procedural", competency: UR, says: `The work done in one day (1/${a} + 1/${b}) was given; the number of days is 1 divided by that.`, predict: (a + b) / (a * b) },
    ],
    variants: () => [],
    explain: (s) => (s.id === "rates" ? `In one day together they do ${s.inputs[0]} + ${s.inputs[1]} = ${fmtQ(Number(s.value))} of the job` : `Days = 1 ÷ (work per day) = ${s.inputs[0]}/${s.inputs[1]} = ${fmtQ(Number(s.value))}`),
    domain: [[2, 23], [3, 24]],
    keep: ([a, b]) => a < b,
    difficulty: ([a, b]) => ((a * b) % (a + b) === 0 ? 1 : b <= 12 ? 2 : 3),
    word: ([a, b]) => `One tap fills a tank in ${a} hours and a second tap fills it in ${b} hours. If both taps are opened together, how many hours does it take to fill the tank? (A fraction is fine.)`,
    teach: {
      idea: "Rates add: if Arun does 1/6 of the job each day and Bala 1/12, together they do 1/6 + 1/12 = 1/4 each day.",
      method: "Add the work done per day, then divide 1 whole job by that rate.",
      alternatives: [
        { id: "common_job", title: "Count pieces of a bigger job", kind: "procedural", text: ["Pretend the job has 12 pieces (a number both times divide).", "In one day Arun does 12 ÷ 6 = 2 pieces and Bala 12 ÷ 12 = 1: together 3 pieces a day, so 12 ÷ 3 = 4 days."] },
      ],
    },
    limits: "Two workers (or taps) from 2 to 24 days; three workers and leaky taps use the same idea.",
  },

  // ------------------------------------------------------------------ exponents
  {
    id: "ajlaw",
    arity: 4,
    title: "Laws of exponents with one base",
    competency: EXP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, m, n, o]) => (a < 2 || a > 9 || m < 1 || n < 1 || m > 12 || n > 12 || o < 0 || o > 2 || (o === 0 && (m < 2 || n < 2)) || (o === 1 && m === n) || (o === 2 && (m < 2 || n < 2 || m > 6 || n > 6)) ? "aᵐ × aⁿ, aᵐ ÷ aⁿ or (aᵐ)ⁿ with a from 2 to 9." : null),
    prompt: ([a, m, n, o]) => `Write ${o === 0 ? `${a}${sup(m)} × ${a}${sup(n)}` : o === 1 ? `${a}${sup(m)} ÷ ${a}${sup(n)}` : `(${a}${sup(m)})${sup(n)}`} as a single power of ${a}, that is ${a} to the power □. What number goes in the box${o === 1 ? " (it may be negative)" : ""}?`,
    solve: ([, m, n, o]) => {
      const e = o === 0 ? m + n : o === 1 ? m - n : m * n;
      return { steps: [{ id: o === 0 ? "add" : o === 1 ? "subtract" : "multiply", op: o === 0 ? "add" : o === 1 ? "subtract" : "multiply", competency: EXP, inputs: [m, n], value: e }], answer: e };
    },
    // independent: evaluate both sides as whole numbers (exactly, with BigInt) and compare
    validate: ([a, m, n, o], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || Math.abs(v) > 60) return false;
      const A = BigInt(a);
      const pw = (k: number) => A ** BigInt(Math.abs(k));
      if (o === 0) return v >= 0 && pw(m) * pw(n) === pw(v);
      if (o === 1) return v >= 0 ? pw(m) === pw(n) * pw(v) : pw(m) * pw(v) === pw(n);
      let s = 1n;
      for (let i = 0; i < n; i++) s *= pw(m);
      return v >= 0 && s === pw(v);
    },
    bugs: ([, m, n, o]) => keepBugs([
      o === 0 && { id: "multiplied-exponents", kind: "conceptual", competency: EXP, says: `The powers were multiplied. aᵐ × aⁿ puts ${m} factors and ${n} factors together, so the powers add.`, predict: m * n },
      o === 1 && { id: "divided-exponents", kind: "conceptual", competency: EXP, says: "The powers were divided. Dividing cancels factors, so the powers subtract.", predict: intOrNull(m / n) },
      o === 1 && { id: "reversed-subtraction", kind: "procedural", competency: EXP, says: "The powers were subtracted the wrong way round: it is the top power minus the bottom power.", predict: n - m },
      o === 1 && { id: "added-exponents", kind: "procedural", competency: EXP, says: "The powers were added; that is the rule for multiplying, not dividing.", predict: m + n },
      o === 2 && { id: "added-for-power", kind: "conceptual", competency: EXP, says: `The powers were added. (aᵐ)ⁿ is aᵐ written ${n} times, so the powers multiply.`, predict: m + n },
      o === 2 && { id: "power-of-power", kind: "procedural", competency: EXP, says: "The first power was raised to the second; the powers simply multiply.", predict: m ** n <= 10000 ? m ** n : null },
    ]),
    variants: () => [],
    explain: (s) => `${s.inputs[0]} ${s.op === "add" ? "+" : s.op === "subtract" ? "−" : "×"} ${s.inputs[1]} = ${s.value}`,
    domain: [[2, 9], [1, 12], [1, 12], [0, 2]],
    cap: 450,
    difficulty: ([, m, n, o]) => (o === 0 ? 1 : o === 2 ? 2 : m > n ? 2 : 3),
    teach: {
      idea: "A power counts how many times the base is multiplied. Multiplying joins the factors (add the powers), dividing cancels them (subtract), and a power of a power repeats them (multiply).",
      method: "aᵐ × aⁿ = aᵐ⁺ⁿ, aᵐ ÷ aⁿ = aᵐ⁻ⁿ, (aᵐ)ⁿ = aᵐⁿ. A negative power means a fraction: a⁻² = 1/a².",
      alternatives: [
        { id: "write_out", title: "Write the factors out", kind: "conceptual", text: ["2³ × 2² = (2 × 2 × 2) × (2 × 2): five 2s, so 2⁵.", "2² ÷ 2⁵ = (2 × 2)/(2 × 2 × 2 × 2 × 2) = 1/2³ = 2⁻³."] },
      ],
    },
    limits: "One base from 2 to 9 and one law at a time; mixed bases and several laws together are other families.",
  },
  {
    id: "ajudig",
    arity: 2,
    title: "The units digit of a large power",
    competency: EXP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, n]) => (a < 2 || a > 39 || ![2, 3, 4, 7, 8, 9].includes(a % 10) || n < 10 || n > 60 ? "a from 2 to 39 ending in 2, 3, 4, 7, 8 or 9, to a power from 10 to 60." : null),
    prompt: ([a, n]) => `What is the units digit of ${a}${sup(n)}?`,
    solve: ([a, n]) => {
      const d = a % 10;
      const cyc: number[] = [];
      let x = d;
      while (!cyc.includes(x)) {
        cyc.push(x);
        x = (x * d) % 10;
      }
      const r = n % cyc.length;
      const pos = r === 0 ? cyc.length : r;
      return {
        steps: [
          { id: "cycle", op: "pattern", competency: EXP, inputs: [d], value: cyc.join(", ") },
          { id: "position", op: "divide", competency: "MATH.number.division-remainders", inputs: [n, cyc.length], value: pos },
          { id: "digit", op: "read", competency: EXP, inputs: [pos], value: cyc[pos - 1] },
        ],
        answer: cyc[pos - 1],
      };
    },
    // independent: multiply out n times, keeping only the units digit
    validate: ([a, n], v) => {
      let u = 1;
      for (let i = 0; i < n; i++) u = (u * a) % 10;
      return v === u;
    },
    bugs: ([a, n]) => {
      const d = a % 10;
      let u = 1;
      for (let i = 0; i < n % 10; i++) u = (u * d) % 10;
      return keepBugs([
        { id: "multiplied", kind: "conceptual", competency: EXP, says: `The units digit ${d} was multiplied by ${n}; a power multiplies ${d} by itself ${n} times.`, predict: (d * n) % 10 },
        n % 4 === 0 && { id: "remainder-zero", kind: "procedural", competency: EXP, says: `${n} divides exactly by the length of the cycle, so the answer is the LAST digit of the cycle, not 1.`, predict: 1 },
        { id: "last-digit-of-power", kind: "procedural", competency: EXP, says: `The last digit of the power (${n % 10}) was used; use the remainder when ${n} is divided by the length of the cycle.`, predict: u },
      ]);
    },
    distractors: ([a]) => {
      const d = a % 10;
      return [d, (d * d) % 10, (d * d * d) % 10, (d * d * d * d) % 10];
    },
    variants: () => [],
    explain: (s) => (s.id === "cycle" ? `Units digits of the powers of ${s.inputs[0]} repeat: ${s.value}, …` : s.id === "position" ? `${s.inputs[0]} ÷ ${s.inputs[1]} leaves the place ${s.value} in the cycle` : `The digit in place ${s.inputs[0]} is ${s.value}`),
    domain: [[2, 39], [10, 60]],
    cap: 350,
    difficulty: ([a]) => ([4, 9].includes(a % 10) ? 1 : a < 10 ? 2 : 3),
    word: ([a, n]) => `${nm(a)} writes the pattern ${a}, ${a}², ${a}³, … and keeps going. What is the last digit of ${a}${sup(n)}?`,
    teach: {
      idea: "Only the units digit affects the units digit of a product, and the units digits of powers repeat in a short cycle.",
      method: "Write the units digits of the first few powers until they repeat. Divide the power by the cycle length; the remainder tells the place in the cycle (remainder 0 means the last place).",
      alternatives: [
        { id: "table", title: "A table of units digits", kind: "procedural", text: ["Powers of 7: 7, 9, 3, 1, then 7 again: a cycle of 4.", "7³⁰: 30 = 4 × 7 + 2, so it is the 2nd in the cycle: 9."] },
      ],
    },
    limits: "Bases ending in 2, 3, 4, 7, 8, 9 (the ones with a real cycle) and powers from 10 to 60.",
  },
  {
    id: "ajneg",
    arity: 3,
    title: "Zero and negative powers",
    competency: EXP,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([a, m, k]) => (a < 2 || a > 10 || m < 0 || m > 5 || m === 1 || k < 1 || k > 8 || m === k || a ** Math.max(m, k) > 100000 ? "aᵐ × a⁻ᵏ with a from 2 to 10, m 0 or 2 to 5, k from 1 to 8." : null),
    prompt: ([a, m, k]) => `Find the value of ${m === 0 ? `${a}${sup(-k)}` : `${a}${sup(m)} × ${a}${sup(-k)}`}. (A fraction is fine.)`,
    solve: ([a, m, k]) => {
      const e = m - k;
      const val = e >= 0 ? a ** e : 1 / a ** -e;
      return {
        steps: [
          ...(m ? [{ id: "combine", op: "add", competency: EXP, inputs: [m, -k], value: e } as Step] : []),
          { id: "value", op: "evaluate", competency: EXP, inputs: [a, e], value: val },
        ],
        answer: val,
      };
    },
    // independent: multiply the answer back by aᵏ; it must give aᵐ
    validate: ([a, m, k], v) => typeof v === "number" && near(v * a ** k, a ** m, 1e-9),
    bugs: ([a, m, k]) => keepBugs([
      { id: "negative-as-minus", kind: "conceptual", competency: EXP, says: `${a}${sup(-k)} was read as a negative number. A negative power means a fraction: ${a}${sup(-k)} = 1/${a}${sup(k)}.`, predict: -(a ** m) * a ** k },
      m > 0 && { id: "sign-ignored", kind: "procedural", competency: EXP, says: `The powers were added as ${m} + ${k}; the second power is −${k}, so it is ${m} − ${k}.`, predict: a ** (m + k) <= 1e7 ? a ** (m + k) : null },
      m === 0 && { id: "multiplied", kind: "conceptual", competency: EXP, says: `${a} was multiplied by −${k}. A power is repeated multiplication; a negative power is 1 over the positive power.`, predict: -a * k },
      { id: "reciprocal-missed", kind: "procedural", competency: EXP, says: "The value of the positive power was given; a negative power turns it into 1 over that number.", predict: m - k < 0 ? a ** (k - m) : 1 / a ** (m - k) },
    ]),
    distractors: ([a, m, k]) => [a ** (m - k - 1), a ** (m - k + 1)],
    variants: () => [],
    explain: (s) => (s.id === "combine" ? `${s.inputs[0]} + (${n_(Number(s.inputs[1]))}) = ${n_(Number(s.value))}` : `${s.inputs[0]} to the power ${n_(Number(s.inputs[1]))} = ${Number(s.value) < 1 ? `1/${Math.round(1 / Number(s.value))}` : s.value}`),
    domain: [[2, 10], [0, 5], [1, 8]],
    cap: 400,
    difficulty: ([, m]) => (m === 0 ? 1 : 2),
    word: ([a, m, k]) => `A scientist writes a measurement as ${m === 0 ? `${a}${sup(-k)}` : `${a}${sup(m)} × ${a}${sup(-k)}`} grams. What is that as a number of grams? (A fraction is fine.)`,
    teach: {
      idea: "Each step down in the power divides by the base once: 2³ = 8, 2² = 4, 2¹ = 2, 2⁰ = 1, 2⁻¹ = 1/2, 2⁻² = 1/4.",
      method: "Combine the powers first (add them, keeping the signs), then a⁻ⁿ = 1/aⁿ.",
      alternatives: [
        { id: "halving", title: "Keep dividing", kind: "conceptual", text: ["Write the powers of the base in a row and divide by the base each time you go left.", "The pattern shows a⁰ = 1 and a⁻ⁿ = 1/aⁿ, never a negative number."] },
      ],
    },
    limits: "One base from 2 to 10; standard form (scientific notation) is its own competency.",
  },

  // ------------------------------------------------------------------ Indian and international numeration
  {
    id: "ajmill",
    arity: 2,
    title: "Crores and lakhs in millions",
    competency: IIN,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, k]) => (c < 1 || c > 99 || k < 0 || k > 9 ? "c crore and a multiple of 10 lakh (c from 1 to 99)." : null),
    prompt: ([c, k]) => `${inr(c * 1e7 + k * 1e6)} is ${c} crore${k ? ` ${10 * k} lakh` : ""}. How many millions is it?`,
    solve: ([c, k]) => ({
      steps: [
        { id: "crore", op: "convert", competency: IIN, inputs: [c], value: 10 * c },
        { id: "lakh", op: "convert", competency: IIN, inputs: [10 * k], value: k },
        { id: "total", op: "add", competency: "MATH.number.addition", inputs: [10 * c, k], value: 10 * c + k },
      ],
      answer: 10 * c + k,
    }),
    // independent: write the number out in ones and count how many lots of 10,00,000 (one million) it holds
    validate: ([c, k], v) => {
      let N = c * 10000000 + k * 1000000;
      let lots = 0;
      while (N >= 1000000) {
        N -= 1000000;
        lots++;
      }
      return N === 0 && v === lots;
    },
    bugs: ([c, k]) => [
      { id: "crore-is-million", kind: "conceptual", competency: IIN, says: "1 crore was taken as 1 million. 1 million is 10 lakh, so 1 crore (100 lakh) is 10 million.", predict: c + k },
      { id: "crore-hundred-million", kind: "recall", competency: IIN, says: "1 crore was taken as 100 million; 1 crore is 10 million (and 100 crore is 1 billion).", predict: 100 * c + k },
      { id: "lakh-is-million", kind: "conceptual", competency: IIN, says: "1 lakh was taken as 1 million. 1 lakh is 1,00,000 = one hundred thousand; 10 lakh make a million.", predict: 10 * c + 10 * k },
    ],
    variants: () => [],
    explain: (s) => (s.id === "crore" ? `${s.inputs[0]} crore = ${s.value} million (1 crore = 10 million)` : s.id === "lakh" ? `${s.inputs[0]} lakh = ${s.value} million (10 lakh = 1 million)` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} million`),
    domain: [[1, 99], [0, 9]],
    cap: 350,
    difficulty: ([c, k]) => (k === 0 ? 1 : c < 10 ? 2 : 3),
    word: ([c, k]) => `The population of a state is ${inr(c * 1e7 + k * 1e6)}. A newspaper written in the international system gives it in millions. How many millions does it print?`,
    teach: {
      idea: "Both systems use the same digits; only the grouping differs. 10 lakh = 1 million, and 1 crore = 10 million.",
      method: "Rewrite the number with international commas (groups of three: 34,000,000) and read the millions.",
      visual: ([c, k]) => ({ type: "table", head: ["Indian", "International"], rows: [[inr(c * 1e7 + k * 1e6), (c * 1e7 + k * 1e6).toLocaleString("en-US")]] }),
      alternatives: [
        { id: "count_zeros", title: "Count the zeros", kind: "procedural", text: ["1 lakh has 5 zeros, 1 million has 6, 1 crore has 7.", "So 1 crore = 10 million, and 10 lakh = 1 million."] },
      ],
    },
    limits: "Whole numbers of crore and multiples of 10 lakh, converted to millions; billions and the reverse direction are other families.",
  },

  // ------------------------------------------------------------------ integer multiplication
  {
    id: "ajimul",
    arity: 2,
    title: "Multiplying integers",
    competency: IMUL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b]) => (Math.abs(a) < 2 || Math.abs(b) < 2 || Math.abs(a) > 15 || Math.abs(b) > 15 || (a > 0 && b > 0) ? "Two integers from −15 to 15 (not 0 or ±1), at least one negative." : null),
    prompt: ([a, b]) => `${n_(a)} × ${pr(b)} = ?`,
    solve: ([a, b]) => ({
      steps: [
        { id: "size", op: "multiply", competency: MT, inputs: [Math.abs(a), Math.abs(b)], value: Math.abs(a * b) },
        { id: "sign", op: "sign", competency: IMUL, inputs: [a, b], value: a * b },
      ],
      answer: a * b,
    }),
    // independent: repeated addition of b, |a| times, and the opposite when a is negative
    validate: ([a, b], v) => {
      let s = 0;
      for (let i = 0; i < Math.abs(a); i++) s += b;
      return v === (a < 0 ? -s : s);
    },
    bugs: ([a, b]) => [
      { id: "sign-rule", kind: "conceptual", competency: IMUL, says: a < 0 && b < 0 ? "A negative times a negative was made negative. The product of two negative numbers is positive." : "A positive times a negative was made positive. The product of a positive and a negative number is negative.", predict: -a * b },
      { id: "added", kind: "conceptual", competency: IMUL, says: "The two numbers were added instead of multiplied.", predict: a + b },
      ...(Math.abs(a) <= 12 && Math.abs(b) <= 12 ? [factSlip(Math.abs(a), Math.abs(b), Math.sign(a * b))] : []),
    ],
    distractors: ([a, b]) => [Math.abs(a) + Math.abs(b), a * b + Math.sign(a * b) * Math.abs(a), a * b - Math.sign(a * b) * Math.abs(b)],
    variants: () => [],
    explain: (s) => (s.id === "size" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `${Number(s.inputs[0]) < 0 === Number(s.inputs[1]) < 0 ? "Same signs give a positive product" : "Different signs give a negative product"}: ${n_(Number(s.value))}`),
    domain: [[-15, 15], [-15, 15]],
    keep: ([a, b]) => Math.abs(a) >= 2 && Math.abs(b) >= 2 && (a < 0 || b < 0),
    cap: 400,
    difficulty: ([a, b]) => (Math.abs(a) > 10 || Math.abs(b) > 10 ? 3 : a < 0 && b < 0 ? 2 : 1),
    word: ([a, b]) => {
      if (a < 0 && b < 0) return `The temperature in a hill town is falling by ${-a} °C every hour. Compared with now, how many degrees warmer was it ${-b} hours ago? (Give the change from now to then as an integer: warmer is positive.)`;
      const [rate, hours] = a < 0 ? [a, b] : [b, a];
      return `The temperature in a hill town falls by ${-rate} °C every hour, a change of ${n_(rate)} °C per hour. What is the total change in temperature after ${hours} hours? (A fall is negative.)`;
    },
    teach: {
      idea: "Multiplying by a negative number reverses the direction: so a negative times a positive is negative, and a negative times a negative is positive.",
      method: "Multiply the sizes, then decide the sign: same signs give +, different signs give −.",
      alternatives: [
        { id: "pattern", title: "Follow a pattern", kind: "conceptual", text: ["−3 × 2 = −6, −3 × 1 = −3, −3 × 0 = 0: each step adds 3.", "Keep going: −3 × (−1) = 3, −3 × (−2) = 6. A negative times a negative is positive."] },
      ],
    },
    limits: "Two factors from −15 to 15 (not 0 or ±1), at least one negative; longer products and integer division are other families.",
  },

  // ------------------------------------------------------------------ profit and loss, interest
  {
    id: "ajpl",
    arity: 4,
    title: "Selling price or cost price from a profit or loss per cent",
    competency: PL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, p, s, m]) => (c < 5 || c > 50 || p < 5 || p > 40 || p % 5 !== 0 || (s !== 0 && s !== 1) || (m !== 0 && m !== 1) ? "A cost price ₹100 to ₹1000 (multiple of 20) with a 5% to 40% profit or loss." : null),
    prompt: ([c, p, s, m]) => {
      const cp = 20 * c;
      const sp = cp + (s ? -1 : 1) * ((cp * p) / 100);
      return m ? `A shopkeeper sells a fan for ${rs(sp)} and makes a ${p}% ${s ? "loss" : "profit"} on it. What did the fan cost him (the cost price), in rupees?` : `A shopkeeper buys a fan for ${rs(cp)} and sells it at a ${p}% ${s ? "loss" : "profit"}. What is the selling price, in rupees?`;
    },
    solve: ([c, p, s, m]) => {
      const cp = 20 * c;
      const amt = (cp * p) / 100;
      const sp = s ? cp - amt : cp + amt;
      return m
        ? { steps: [{ id: "percent", op: "subtract", competency: PL, inputs: [100, s ? -p : p], value: 100 + (s ? -p : p) }, { id: "back", op: "divide", competency: PCT, inputs: [sp, 100 + (s ? -p : p)], value: cp }], answer: cp }
        : { steps: [{ id: "amount", op: "multiply", competency: PCT, inputs: [cp, p], value: amt }, { id: "price", op: s ? "subtract" : "add", competency: PL, inputs: [cp, amt], value: sp }], answer: sp };
    },
    // independent: substitute back: (SP − CP) × 100 must be ± p × CP
    validate: ([c, p, s, m], v) => {
      if (typeof v !== "number") return false;
      const cp = 20 * c;
      const sp = cp + (s ? -1 : 1) * ((cp * p) / 100);
      const [C, S] = m ? [v, sp] : [cp, v];
      return C > 0 && (S - C) * 100 === (s ? -p : p) * C;
    },
    bugs: ([c, p, s, m]) => {
      const cp = 20 * c;
      const amt = (cp * p) / 100;
      const sp = s ? cp - amt : cp + amt;
      if (!m)
        return [
          { id: "amount-only", kind: "procedural", competency: PL, says: `Only the ${s ? "loss" : "profit"} (${p}% of ${rs(cp)}) was found; the selling price is the cost price ${s ? "minus" : "plus"} it.`, predict: amt },
          { id: "wrong-direction", kind: "conceptual", competency: PL, says: `The ${s ? "loss was added" : "profit was taken away"}. A profit means selling for more than the cost; a loss means selling for less.`, predict: s ? cp + amt : cp - amt },
          { id: "percent-as-rupees", kind: "conceptual", competency: PCT, says: `${p}% was used as ₹${p}; ${p}% of ${rs(cp)} means ${p} out of every 100 rupees.`, predict: s ? cp - p : cp + p },
        ];
      return [
        { id: "percent-of-sp", kind: "conceptual", competency: PL, says: `${p}% of the selling price was ${s ? "added to" : "taken away from"} it. Profit and loss per cent are of the COST price, so the selling price is ${s ? 100 - p : 100 + p}% of the cost price: divide by ${s ? 100 - p : 100 + p} and multiply by 100.`, predict: Math.round(s ? sp + (sp * p) / 100 : sp - (sp * p) / 100) },
        { id: "applied-forward", kind: "procedural", competency: PL, says: `The ${s ? "loss" : "profit"} was applied to the selling price as if it were the cost price. Here the selling price is known and the cost price is the unknown.`, predict: Math.round(s ? sp - (sp * p) / 100 : sp + (sp * p) / 100) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "amount" ? `${s.inputs[1]}% of ₹${s.inputs[0]} = ₹${s.value}` : s.id === "price" ? `₹${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ₹${s.inputs[1]} = ₹${s.value}` : s.id === "percent" ? `The selling price is ${s.value}% of the cost price` : `Cost price = ₹${s.inputs[0]} × 100 ÷ ${s.inputs[1]} = ₹${s.value}`),
    domain: [[5, 50], [5, 40], [0, 1], [0, 1]],
    keep: ([, p]) => p % 5 === 0,
    cap: 400,
    difficulty: ([, p, , m]) => (m ? 3 : [10, 20, 25].includes(p) ? 1 : 2),
    word: ([c, p, s, m]) => {
      const cp = 20 * c;
      const sp = cp + (s ? -1 : 1) * ((cp * p) / 100);
      return m ? `${nm(c)} sold an old cycle for ${rs(sp)} and found that this was a ${p}% ${s ? "loss" : "profit"} on what it had cost. How much had the cycle cost, in rupees?` : `${nm(c)} bought a cycle for ${rs(cp)} and later sold it at a ${p}% ${s ? "loss" : "profit"}. For how many rupees did ${nm(c)} sell it?`;
    },
    teach: {
      idea: "Profit or loss per cent compares the profit or loss with the cost price: 20% profit means the selling price is 120% of the cost price.",
      method: "To find the selling price, find p% of the cost price and add it (profit) or take it away (loss). To find the cost price, divide the selling price by (100 ± p) and multiply by 100.",
      alternatives: [
        { id: "hundred_parts", title: "Think of 100 parts", kind: "conceptual", text: ["Split the cost price into 100 equal parts.", "With a 15% profit the selling price is 115 of those parts; with a 15% loss it is 85 parts."] },
      ],
    },
    limits: "Cost prices ₹100 to ₹1000 with profit or loss in steps of 5% up to 40%; overhead expenses are not included.",
  },
  {
    id: "ajsi",
    arity: 4,
    title: "Simple interest, amount, rate or time",
    competency: PL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([k, r, t, m]) => (k < 1 || k > 40 || r < 2 || r > 15 || t < 1 || t > 6 || m < 0 || m > 3 ? "Principal ₹500 to ₹20,000, rate 2% to 15%, 1 to 6 years." : null),
    prompt: ([k, r, t, m]) => {
      const P = 500 * k;
      const I = (P * r * t) / 100;
      return [
        `Find the simple interest on ${rs(P)} for ${t} year${t > 1 ? "s" : ""} at ${r}% per year, in rupees.`,
        `${rs(P)} is lent for ${t} year${t > 1 ? "s" : ""} at ${r}% simple interest per year. What is the amount (principal + interest) at the end, in rupees?`,
        `The simple interest on ${rs(P)} for ${t} year${t > 1 ? "s" : ""} is ${rs(I)}. What is the rate of interest per year, in per cent?`,
        `The simple interest on ${rs(P)} at ${r}% per year is ${rs(I)}. For how many years was the money lent?`,
      ][m];
    },
    solve: ([k, r, t, m]) => {
      const P = 500 * k;
      const I = (P * r * t) / 100;
      const year = (P * r) / 100;
      const steps: Step[] = [{ id: "year", op: "multiply", competency: PCT, inputs: [P, r], value: year }];
      if (m === 0) return { steps: [...steps, { id: "years", op: "multiply", competency: PL, inputs: [year, t], value: I }], answer: I };
      if (m === 1) return { steps: [...steps, { id: "years", op: "multiply", competency: PL, inputs: [year, t], value: I }, { id: "amount", op: "add", competency: PL, inputs: [P, I], value: P + I }], answer: P + I };
      if (m === 2) return { steps: [{ id: "rate", op: "divide", competency: PL, inputs: [I * 100, P * t], value: r }], answer: r };
      return { steps: [...steps, { id: "time", op: "divide", competency: PL, inputs: [I, year], value: t }], answer: t };
    },
    // independent: add one year's interest at a time and check the totals
    validate: ([k, r, t, m], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      const P = 500 * k;
      const yearly = (rate: number) => (P * rate) / 100;
      const accrue = (rate: number, years: number) => {
        let s = 0;
        for (let i = 0; i < years; i++) s += yearly(rate);
        return s;
      };
      const I = accrue(r, t);
      if (m === 0) return v === I;
      if (m === 1) return v === P + I;
      if (m === 2) return v <= 100 && near(accrue(v, t), I, 1e-12);
      return v <= 100 && near(accrue(r, v), I, 1e-12);
    },
    bugs: ([k, r, t, m]) => {
      const P = 500 * k;
      const I = (P * r * t) / 100;
      const year = (P * r) / 100;
      if (m === 0) return keepBugs([
        { id: "no-hundred", kind: "conceptual", competency: PCT, says: `${r}% means ${r} out of 100, so divide by 100: SI = P × R × T ÷ 100.`, predict: P * r * t },
        t > 1 && { id: "one-year", kind: "procedural", competency: PL, says: `Only one year's interest was found; the money is lent for ${t} years.`, predict: year },
        { id: "amount-given", kind: "procedural", competency: PL, says: "The amount (principal + interest) was given; the question asks for the interest only.", predict: P + I },
      ]);
      if (m === 1) return keepBugs([
        { id: "interest-only", kind: "procedural", competency: PL, says: "Only the interest was found; the amount is the principal plus the interest.", predict: I },
        t > 1 && { id: "one-year", kind: "procedural", competency: PL, says: `Only one year's interest was added; the money is lent for ${t} years.`, predict: P + year },
      ]);
      if (m === 2) return keepBugs([
        t > 1 && { id: "time-forgotten", kind: "procedural", competency: PL, says: `The interest is for ${t} years; divide by the time too: R = SI × 100 ÷ (P × T).`, predict: r * t },
        t > 1 && { id: "one-year-interest", kind: "conceptual", competency: PL, says: "One year's interest in rupees was given; the rate compares it with the principal, out of 100.", predict: intOrNull(I / t) },
      ]);
      return keepBugs([
        { id: "rate-and-time", kind: "conceptual", competency: PL, says: "The interest was divided by the rate; divide it by one year's interest (P × R ÷ 100) to count the years.", predict: intOrNull(I / r) },
        { id: "year-interest-given", kind: "procedural", competency: PL, says: "One year's interest was given; the time is how many years of that interest make the total.", predict: year },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "year" ? `One year's interest: ${s.inputs[1]}% of ₹${s.inputs[0]} = ₹${s.value}` : s.id === "years" ? `For ${s.inputs[1]} years: ₹${s.inputs[0]} × ${s.inputs[1]} = ₹${s.value}` : s.id === "amount" ? `Amount = ₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}` : s.id === "rate" ? `R = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}%` : `T = ₹${s.inputs[0]} ÷ ₹${s.inputs[1]} = ${s.value} years`),
    domain: [[1, 40], [2, 15], [1, 6], [0, 3]],
    cap: 500,
    difficulty: ([, , , m]) => (m === 0 ? 1 : m === 1 ? 2 : 3),
    word: ([k, r, t, m]) => {
      const P = 500 * k;
      const I = (P * r * t) / 100;
      const who = nm(k + r);
      return [
        `${who} puts ${rs(P)} in a bank that pays ${r}% simple interest per year. How much interest does ${who} earn in ${t} year${t > 1 ? "s" : ""}, in rupees?`,
        `${who} borrows ${rs(P)} at ${r}% simple interest per year and repays everything after ${t} year${t > 1 ? "s" : ""}. How much does ${who} repay in all, in rupees?`,
        `${who} deposited ${rs(P)} and earned ${rs(I)} simple interest in ${t} year${t > 1 ? "s" : ""}. What rate per cent per year did the bank pay?`,
        `${who} deposited ${rs(P)} at ${r}% simple interest per year and earned ${rs(I)}. How many years was the money in the bank?`,
      ][m];
    },
    teach: {
      idea: "Simple interest is the same every year: R% of the principal, so T years give T times as much. SI = P × R × T ÷ 100.",
      method: "Write SI = P × R × T ÷ 100, put in the three numbers you know, and work out the fourth.",
      alternatives: [
        { id: "year_by_year", title: "Year by year", kind: "conceptual", text: ["Find one year's interest first: R% of P.", "Add it once for every year. To find the time, count how many years of interest make the total."] },
      ],
    },
    limits: "Principal ₹500 to ₹20,000 in steps of ₹500, whole-number rates 2% to 15% and 1 to 6 years; months and fractional rates are later.",
  },
  {
    id: "ajdisc",
    arity: 3,
    title: "Discount and GST",
    competency: PL,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([k, d, m]) => (k < 2 || k > 60 || (m !== 0 && m !== 1) || d < 1 || d > (m ? 4 : 10) || (k * (m ? GST[d - 1] : 5 * d)) % 2 !== 0 ? "A price ₹100 to ₹3000 with a discount (5% steps) or GST (5, 12, 18, 28%), giving whole rupees." : null),
    prompt: ([k, d, m]) => (m ? `A mixer costs ${rs(50 * k)} before GST. GST is ${GST[d - 1]}%. What is the price including GST, in rupees?` : `A shirt is marked ${rs(50 * k)}. The shop gives a ${5 * d}% discount. What is the selling price, in rupees?`),
    solve: ([k, d, m]) => {
      const P = 50 * k;
      const pc = m ? GST[d - 1] : 5 * d;
      const amt = (P * pc) / 100;
      return { steps: [{ id: "amount", op: "multiply", competency: PCT, inputs: [P, pc], value: amt }, { id: "price", op: m ? "add" : "subtract", competency: PL, inputs: [P, amt], value: m ? P + amt : P - amt }], answer: m ? P + amt : P - amt };
    },
    // independent: build the change 1% at a time (1% of the price, added up pc times)
    validate: ([k, d, m], v) => {
      if (typeof v !== "number") return false;
      const P = 50 * k;
      const pc = m ? GST[d - 1] : 5 * d;
      let change = 0;
      for (let i = 0; i < pc; i++) change += P / 100;
      return near(v, m ? P + change : P - change, 1e-9);
    },
    bugs: ([k, d, m]) => {
      const P = 50 * k;
      const pc = m ? GST[d - 1] : 5 * d;
      const amt = (P * pc) / 100;
      return keepBugs([
        { id: m ? "tax-only" : "discount-only", kind: "procedural", competency: PL, says: m ? "Only the GST was found; the price including GST is the price plus the tax." : "Only the discount was found; the selling price is the marked price minus the discount.", predict: amt },
        { id: "wrong-direction", kind: "conceptual", competency: PL, says: m ? "The GST was taken away; a tax is added to the price." : "The discount was added; a discount makes the price lower.", predict: m ? P - amt : P + amt },
        { id: "percent-as-rupees", kind: "conceptual", competency: PCT, says: `${pc}% was used as ₹${pc}; ${pc}% of ${rs(P)} means ${pc} rupees for every 100 rupees.`, predict: m ? P + pc : P - pc },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "amount" ? `${s.inputs[1]}% of ₹${s.inputs[0]} = ₹${s.value}` : `₹${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[2, 60], [1, 10], [0, 1]],
    cap: 400,
    difficulty: ([, d, m]) => (m ? 3 : [2, 4, 5, 10].includes(d) ? 1 : 2),
    word: ([k, d, m]) => (m ? `${nm(k)} buys a cricket bat priced ${rs(50 * k)} before tax. ${GST[d - 1]}% GST is added at the counter. How much does ${nm(k)} pay, in rupees?` : `In a festival sale, a saree marked ${rs(50 * k)} has ${5 * d}% off. How much does ${nm(k)} pay for it, in rupees?`),
    teach: {
      idea: "A discount is a per cent of the marked price taken off; GST is a per cent of the price added on.",
      method: "Find the per cent of the price, then subtract it (discount) or add it (GST).",
      alternatives: [
        { id: "one_step", title: "One multiplication", kind: "procedural", text: ["A 20% discount leaves 80% of the price: multiply by 80 and divide by 100.", "18% GST makes 118% of the price: multiply by 118 and divide by 100."] },
      ],
    },
    limits: "One discount or one GST rate on a price in steps of ₹50; successive discounts and finding the marked price are other families.",
  },

  // ------------------------------------------------------------------ dividing in a ratio
  {
    id: "ajrdiv",
    arity: 5,
    title: "Sharing an amount in a given ratio",
    competency: RDIV,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c, k, w]) => {
      const parts = c ? [a, b, c] : [a, b];
      if (a < 1 || b < 1 || a > 9 || b > 9 || c < 0 || c > 9 || k < 2 || k > 40 || w < 0 || w >= parts.length) return "Two or three parts from 1 to 9, ₹5k for each part.";
      if (gcd(gcd(a, b), c) !== 1 || new Set(parts).size === 1) return "The ratio must be in simplest form and not all parts equal.";
      return parts.reduce((s, x) => s + x, 0) * 5 * k > 5000 ? "Totals up to ₹5000." : null;
    },
    prompt: ([a, b, c, k, w]) => {
      const parts = c ? [a, b, c] : [a, b];
      const T = parts.reduce((s, x) => s + x, 0) * 5 * k;
      return c ? `${rs(T)} is shared among Anu, Ravi and Meena in the ratio ${a} : ${b} : ${c}. How much does ${WHO[w]} get, in rupees?` : `${rs(T)} is shared between Anu and Ravi in the ratio ${a} : ${b}. How much does ${WHO[w]} get, in rupees?`;
    },
    solve: ([a, b, c, k, w]) => {
      const parts = c ? [a, b, c] : [a, b];
      const sum = parts.reduce((s, x) => s + x, 0);
      return {
        steps: [
          { id: "parts", op: "add", competency: "MATH.number.addition", inputs: parts, value: sum },
          { id: "one", op: "divide", competency: RDIV, inputs: [sum * 5 * k, sum], value: 5 * k },
          { id: "share", op: "multiply", competency: MT, inputs: [5 * k, parts[w]], value: 5 * k * parts[w] },
        ],
        answer: 5 * k * parts[w],
      };
    },
    // independent: hand the money out round by round (each person gets their number of rupees per round) until it
    // is all gone, then read this person's pile
    validate: ([a, b, c, k, w], v) => {
      const parts = c ? [a, b, c] : [a, b];
      const T = parts.reduce((s, x) => s + x, 0) * 5 * k;
      const piles = parts.map(() => 0);
      let left = T;
      while (left > 0) parts.forEach((x, i) => {
        piles[i] += x;
        left -= x;
      });
      return left === 0 && v === piles[w];
    },
    bugs: ([a, b, c, k, w]) => {
      const parts = c ? [a, b, c] : [a, b];
      const T = parts.reduce((s, x) => s + x, 0) * 5 * k;
      const other = parts.length === 2 ? parts[1 - w] : 0;
      return keepBugs([
        { id: "one-part", kind: "procedural", competency: RDIV, says: `The value of one part (${rs(T)} ÷ ${parts.reduce((s, x) => s + x, 0)}) was given; ${WHO[w]} gets ${parts[w]} parts.`, predict: 5 * k },
        { id: "shared-equally", kind: "conceptual", competency: RDIV, says: "The money was shared equally. In a ratio the shares are different: count the parts first.", predict: intOrNull(T / parts.length) },
        parts.length === 2 && { id: "ratio-as-fraction", kind: "conceptual", competency: RDIV, says: `The ratio ${a} : ${b} was read as the fraction ${parts[w]}/${other} of the whole. The whole is ${a + b} parts, so ${WHO[w]} gets ${parts[w]}/${a + b} of it.`, predict: intOrNull((T * parts[w]) / other) },
        { id: "other-share", kind: "procedural", competency: RDIV, says: "Someone else's share was given; check whose part of the ratio is asked for.", predict: 5 * k * parts[(w + 1) % parts.length] },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "parts" ? `Total parts: ${s.inputs.join(" + ")} = ${s.value}` : s.id === "one" ? `One part: ₹${s.inputs[0]} ÷ ${s.inputs[1]} = ₹${s.value}` : `${s.inputs[1]} parts: ${s.inputs[1]} × ₹${s.inputs[0]} = ₹${s.value}`),
    domain: [[1, 9], [1, 9], [0, 9], [2, 40], [0, 2]],
    cap: 450,
    difficulty: ([, , c, k]) => (c ? 3 : k <= 10 ? 1 : 2),
    word: ([a, b, c, k, w]) => {
      const parts = c ? [a, b, c] : [a, b];
      const T = parts.reduce((s, x) => s + x, 0) * 5 * k;
      return c ? `Anu, Ravi and Meena put money into a stall in the ratio ${a} : ${b} : ${c} and agree to share the profit the same way. The profit is ${rs(T)}. How much is ${WHO[w]}'s share, in rupees?` : `A ribbon ${T} cm long is cut into two pieces, one for Anu and one for Ravi, in the ratio ${a} : ${b}. How long is ${WHO[w]}'s piece, in cm?`;
    },
    teach: {
      idea: "A ratio a : b splits the whole into a + b equal parts; the first person gets a of them and the second b.",
      method: "Add the terms to find the number of parts, divide the total by it to find one part, then multiply by the person's number of parts.",
      visual: ([a, b, c]) => ({ type: "strips", top: (c ? a + b + c : a + b), bottom: 1, shaded: a }),
      alternatives: [
        { id: "bar_model", title: "A bar model", kind: "conceptual", text: ["Draw one bar for each person: a boxes, b boxes (and c boxes).", "All the boxes are equal; the total divided by the number of boxes is the value of one box."] },
      ],
    },
    limits: "Two- or three-term ratios with terms up to 9 and totals up to ₹5000 that share exactly.",
  },

  // ------------------------------------------------------------------ rational numbers
  {
    id: "ajrq",
    arity: 5,
    title: "Adding, subtracting, multiplying and dividing rational numbers",
    competency: RQ,
    type: "fraction",
    mc: true,
    parse: none,
    reject: ([a, b, c, d, o]) => (b < 2 || d < 2 || b > 9 || d > 9 || a === 0 || c === 0 || Math.abs(a) >= b || Math.abs(c) >= d || gcd(a, b) !== 1 || gcd(c, d) !== 1 || o < 0 || o > 3 || (a > 0 && c > 0) ? "Two proper fractions in lowest terms (denominators 2 to 9), at least one negative, and one of + − × ÷." : null),
    prompt: ([a, b, c, d, o]) => `Work out ${fr(a, b)} ${OPS[o]} ${fr(c, d, true)}. (A fraction is fine.)`,
    solve: ([a, b, c, d, o]) => {
      const x = a / b;
      const y = c / d;
      const v = [x + y, x - y, x * y, x / y][o];
      const steps: Step[] =
        o < 2
          ? [{ id: "common", op: "rewrite", competency: "MATH.number.equivalent-fractions", inputs: [b, d], value: (b * d) / gcd(b, d) }, { id: "combine", op: o ? "subtract" : "add", competency: RQ, inputs: [`${a}/${b}`, `${c}/${d}`], value: v }]
          : o === 2
            ? [{ id: "multiply", op: "multiply", competency: RQ, inputs: [`${a}/${b}`, `${c}/${d}`], value: v }]
            : [{ id: "flip", op: "reciprocal", competency: RQ, inputs: [`${c}/${d}`], value: d / c }, { id: "multiply", op: "multiply", competency: RQ, inputs: [`${a}/${b}`, `${d}/${c}`], value: v }];
      return { steps, answer: v };
    },
    // independent: the inverse operation takes the answer back to the first number
    validate: ([a, b, c, d, o], v) => {
      if (typeof v !== "number") return false;
      const y = c / d;
      const back = [v - y, v + y, v / y, v * y][o];
      return near(back, a / b, 1e-9);
    },
    bugs: ([a, b, c, d, o]) => {
      const x = a / b;
      const y = c / d;
      const v = [x + y, x - y, x * y, x / y][o];
      return keepBugs([
        o < 2 && { id: "add-tops-and-bottoms", kind: "conceptual", competency: "MATH.number.fraction-add", says: "The tops and the bottoms were added (or subtracted) separately. Write both fractions with the same denominator first.", predict: (o ? a - c : a + c) / (b + d) },
        o === 1 && c < 0 && { id: "minus-negative", kind: "conceptual", competency: RQ, says: `Subtracting ${fr(c, d)} was done as subtracting ${fr(-c, d)}. Taking away a negative number is the same as adding its opposite.`, predict: x + y },
        o === 2 && { id: "cross-multiplied", kind: "procedural", competency: RQ, says: "The fractions were cross-multiplied. To multiply fractions, multiply top by top and bottom by bottom.", predict: (a * d) / (b * c) },
        o === 3 && { id: "not-flipped", kind: "procedural", competency: RQ, says: "The fractions were multiplied without turning the second one upside down. Dividing by a fraction means multiplying by its reciprocal.", predict: x * y },
        o === 3 && { id: "flipped-first", kind: "procedural", competency: RQ, says: "The first fraction was turned upside down; it is the second one (the divisor) that is flipped.", predict: (b / a) * y },
        v !== 0 && { id: "sign-error", kind: "conceptual", competency: IMUL, says: o >= 2 ? "The sign is wrong: same signs give a positive answer, different signs a negative one." : "The sign is wrong: compare the sizes of the two fractions to see whether the answer is above or below zero.", predict: -v },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "common" ? `Common denominator: ${s.value}` : s.id === "flip" ? `Dividing by ${s.inputs[0]} is multiplying by its reciprocal` : `${s.inputs[0]} ${s.op === "add" ? "+" : s.op === "subtract" ? "−" : "×"} ${s.inputs[1]} = ${fmtQ(Number(s.value))}`),
    domain: [[-8, 8], [2, 9], [-8, 8], [2, 9], [0, 3]],
    cap: 500,
    difficulty: ([, b, , d, o]) => (o === 2 ? 1 : o === 3 ? 2 : b === d || b % d === 0 || d % b === 0 ? 2 : 3),
    teach: {
      idea: "Rational numbers follow the same rules as fractions, together with the sign rules for integers.",
      method: "For + and −, write both with a common denominator and combine the tops. For ×, multiply tops and bottoms. For ÷, multiply by the reciprocal of the second. Then fix the sign and simplify.",
      visual: ([a, b, c, d]) => ({ type: "numberline", from: -1, to: 1, marks: [a / b, c / d] }),
      alternatives: [
        { id: "number_line", title: "Move on the number line", kind: "conceptual", text: ["Adding a negative fraction moves left; subtracting a negative fraction moves right.", "Mark the first fraction and move by the second to see the sign of the answer before working it out."] },
      ],
    },
    limits: "Proper fractions in lowest terms with denominators up to 9, at least one negative; mixed numbers and longer expressions are other families.",
  },

  // ------------------------------------------------------------------ compound interest
  {
    id: "ajci",
    arity: 4,
    title: "Compound interest and depreciation",
    competency: CI,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([k, r, n, m]) => {
      if (k < 1 || k > 50 || r < 2 || r > 20 || n < 2 || n > 3 || m < 0 || m > 2 || (m === 1 && r % 2)) return "₹1000 to ₹50,000, a rate of 2% to 20% (even when half-yearly), 2 or 3 years.";
      return ciValue(k, r, n, m) === null ? "A whole-rupee answer." : null;
    },
    prompt: ([k, r, n, m]) => [`Find the compound interest on ${rs(1000 * k)} for ${n} years at ${r}% per year, compounded annually, in rupees.`, `Find the compound interest on ${rs(1000 * k)} for ${n} years at ${r}% per year, compounded half-yearly, in rupees.`, `A machine worth ${rs(1000 * k)} loses ${r}% of its value each year (on its value at the start of that year). What is it worth after ${n} years, in rupees?`][m],
    solve: ([k, r, n, m]) => {
      const P = 1000 * k;
      const A = ciValue(k, r, n, m)!;
      const steps: Step[] = [
        { id: "factor", op: "convert", competency: CI, inputs: [m === 1 ? r / 2 : r, m === 1 ? 2 * n : n, m], value: m === 2 ? `(1 − ${r}/100)^${n}` : `(1 + ${m === 1 ? r / 2 : r}/100)^${m === 1 ? 2 * n : n}` },
        { id: "value", op: "multiply", competency: EXP, inputs: [P], value: A },
      ];
      if (m === 2) return { steps, answer: A };
      return { steps: [...steps, { id: "interest", op: "subtract", competency: CI, inputs: [A, P], value: A - P }], answer: A - P };
    },
    // independent: year by year (or half-year by half-year), adding or taking away that period's interest
    validate: ([k, r, n, m], v) => {
      if (typeof v !== "number") return false;
      const P = 1000 * k;
      let x = P;
      const periods = m === 1 ? 2 * n : n;
      const rate = m === 1 ? r / 2 : r;
      for (let i = 0; i < periods; i++) x += (m === 2 ? -1 : 1) * ((x * rate) / 100);
      return near(v, m === 2 ? x : x - P, 1e-9);
    },
    bugs: ([k, r, n, m]) => {
      const P = 1000 * k;
      const A = ciValue(k, r, n, m)!;
      const si = (P * r * n) / 100;
      if (m === 2) return keepBugs([
        { id: "simple-depreciation", kind: "conceptual", competency: CI, says: `${r}% of the ORIGINAL value was taken off every year. Each year the loss is ${r}% of that year's starting value, which keeps getting smaller.`, predict: P - si },
        { id: "loss-given", kind: "procedural", competency: CI, says: "The total loss in value was given; the question asks what the machine is worth.", predict: P - A },
        { id: "growth", kind: "conceptual", competency: CI, says: "The value was increased; depreciation means the value goes down each year.", predict: ciValue(k, r, n, 0) },
      ]);
      const yearly = ciValue(k, r, n, 0)!;
      const fullRateHalf = ciBig(1000 * k, 100 + r, 100, 2 * n);
      return keepBugs([
        { id: "simple-interest", kind: "conceptual", competency: CI, says: "Simple interest was found. With compound interest, each year's interest is added on and earns interest too.", predict: si },
        { id: "amount-given", kind: "procedural", competency: CI, says: "The amount was given; compound interest is the amount minus the principal.", predict: A },
        m === 1 && { id: "full-rate-each-half", kind: "procedural", competency: CI, says: `For half-yearly compounding the rate for each half-year is ${r / 2}%, not ${r}%, and there are ${2 * n} half-years.`, predict: fullRateHalf === null ? null : fullRateHalf - P },
        m === 1 && { id: "compounded-yearly", kind: "procedural", competency: CI, says: `The interest was compounded once a year; half-yearly means ${2 * n} periods at ${r / 2}% each.`, predict: yearly - P },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `Each ${s.inputs[2] === 1 ? "half-year" : "year"} multiplies the value by ${s.value}` : s.id === "value" ? `₹${s.inputs[0]} becomes ₹${s.value}` : `Interest = ₹${s.inputs[0]} − ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[1, 50], [2, 20], [2, 3], [0, 2]],
    cap: 400,
    difficulty: ([, , n, m]) => (m === 0 && n === 2 ? 1 : m === 1 ? 3 : 2),
    word: ([k, r, n, m]) => [`${nm(k)} deposits ${rs(1000 * k)} in a bank that pays ${r}% per year, compounded annually. How much interest has the money earned after ${n} years, in rupees?`, `${nm(k)} deposits ${rs(1000 * k)} in a bank that pays ${r}% per year, compounded every six months. How much interest has the money earned after ${n} years, in rupees?`, `A scooter bought for ${rs(1000 * k)} loses ${r}% of its value every year (each time on its value at the start of the year). What is it worth after ${n} years, in rupees?`][m],
    teach: {
      idea: "With compound interest, each period's interest joins the principal, so the next period's interest is bigger. Depreciation works the same way, downwards.",
      method: "Amount = P × (1 + R/100)ⁿ (depreciation: 1 − R/100). Half-yearly: use R/2 for each half-year and 2n half-years. Interest = amount − principal.",
      alternatives: [
        { id: "year_table", title: "A year-by-year table", kind: "procedural", text: ["Year 1: interest on the principal, add it on.", "Year 2: interest on the new amount, add it on. Repeat for each year, then subtract the starting principal."] },
      ],
    },
    limits: "Principals in thousands, 2 or 3 years, and whole-rupee answers; quarterly compounding and finding the rate are other families.",
  },

  // ------------------------------------------------------------------ cubes
  {
    id: "ajcube",
    arity: 2,
    title: "Cubes and cube roots",
    competency: CUBE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([m, n]) => (m < 0 || m > 2 || n < 2 || n > [25, 50, 30][m] ? "n³ (n up to 25), ∛(n³) (n up to 50) or ∛(−n³) (n up to 30)." : null),
    prompt: ([m, n]) => [`${n}³ = ?`, `∛${n ** 3} = ?`, `∛(−${n ** 3}) = ?`][m],
    solve: ([m, n]) => {
      if (m === 0) return { steps: [{ id: "cube", op: "multiply", competency: CUBE, inputs: [n, n, n], value: n ** 3 }], answer: n ** 3 };
      const steps: Step[] = [{ id: "root", op: "evaluate", competency: CUBE, inputs: [n ** 3], value: n }];
      if (m === 2) steps.push({ id: "sign", op: "sign", competency: IMUL, inputs: [n], value: -n });
      return { steps, answer: m === 2 ? -n : n };
    },
    // independent: cube by repeated addition (n lots of n, n times); a root is checked by cubing the answer
    validate: ([m, n], v) => {
      if (typeof v !== "number") return false;
      if (m === 0) {
        let sq = 0;
        for (let i = 0; i < n; i++) sq += n;
        let c = 0;
        for (let i = 0; i < n; i++) c += sq;
        return v === c;
      }
      return v * v * v === (m === 2 ? -1 : 1) * n ** 3;
    },
    bugs: ([m, n]) => {
      if (m === 0) return [
        { id: "times-three", kind: "conceptual", competency: CUBE, says: `${n}³ was worked out as ${n} × 3; a cube multiplies ${n} by itself three times.`, predict: 3 * n },
        { id: "squared", kind: "procedural", competency: CUBE, says: `${n} was multiplied by itself only twice (that is ${n}²).`, predict: n * n },
      ];
      const r = m === 2 ? -n : n;
      return keepBugs([
        { id: "divided-by-three", kind: "conceptual", competency: CUBE, says: "The number was divided by 3; a cube root is the number that, multiplied by itself three times, gives it.", predict: intOrNull(((m === 2 ? -1 : 1) * n ** 3) / 3) },
        isSquare(n) && { id: "square-root", kind: "procedural", competency: "MATH.number.square-roots", says: "The square root was found; a cube root needs three equal factors, not two.", predict: (m === 2 ? -1 : 1) * n * Math.round(Math.sqrt(n)) },
        m === 2 && { id: "sign-dropped", kind: "conceptual", competency: CUBE, says: "A negative number has a negative cube root, because a negative × negative × negative is negative.", predict: n },
        { id: "near-cube", kind: "recall", competency: CUBE, says: `A cube next to the right one was used; check: ${n_(r)} × ${pr(r)} × ${pr(r)} = ${n_(r ** 3)}.`, predict: [r + 1, r - 1] },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "cube" ? `${n_(Number(s.inputs[0]))} × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}` : s.id === "root" ? `${s.value} × ${s.value} × ${s.value} = ${s.inputs[0]}` : `The cube root of a negative number is negative: ${n_(Number(s.value))}`),
    domain: [[0, 2], [2, 50]],
    keep: ([m, n]) => n <= [25, 50, 30][m],
    difficulty: ([m, n]) => (n <= 10 ? 1 : m === 2 || n > 20 ? 3 : 2),
    word: ([m, n]) => [`A cube-shaped box has edges ${n} cm long. How many 1 cm cubes fill it completely?`, `${nm(n)} builds one large cube using ${n ** 3} small cubes, all of them. How many small cubes are along one edge?`, `A number multiplied by itself three times gives −${n ** 3}. What is the number?`][m],
    teach: {
      idea: "A cube is a number times itself three times; a cube root undoes it. Three negative factors make a negative, so negative numbers have negative cube roots.",
      method: "For a cube root, use the units digit to guess the last digit of the root and the size to guess the tens, then check by cubing. Or use prime factors in groups of three.",
      visual: ([, n]) => ({ type: "solid", name: "cube", dims: [`${Math.min(n, 9)}`] }),
      alternatives: [
        { id: "triples", title: "Group prime factors in threes", kind: "procedural", text: ["Write the number as a product of primes, e.g. 1728 = 2 × 2 × 2 × 2 × 2 × 2 × 3 × 3 × 3.", "Take one prime from each group of three equal primes: 2 × 2 × 3 = 12."] },
      ],
    },
    limits: "Cubes of 2 to 25, cube roots of perfect cubes up to 50³ and of negative cubes; estimating non-perfect cube roots is not included.",
  },
  {
    id: "ajcmul",
    arity: 1,
    title: "The smallest multiplier that makes a perfect cube",
    competency: CUBE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n]) => {
      if (n < 16 || n > 2000 || isCube(n)) return "A number from 16 to 2000 that is not a perfect cube.";
      const k = cubeMult(n);
      return k >= n || k > 50 || ![...expo(n).values()].some((e) => e >= 2) ? "A number with a repeated prime factor whose multiplier is at most 50." : null;
    },
    prompt: ([n]) => `What is the smallest whole number that ${n} must be multiplied by so that the product is a perfect cube?`,
    solve: ([n]) => ({
      steps: [
        { id: "factor", op: "factorise", competency: PF, inputs: [n], value: primeList(n).join(" × ") },
        { id: "complete", op: "multiply", competency: CUBE, inputs: [n], value: cubeMult(n) },
      ],
      answer: cubeMult(n),
    }),
    // independent: try multipliers 1, 2, 3 … until the product is a perfect cube
    validate: ([n], v) => {
      for (let k = 1; k <= 1000; k++) if (isCube(n * k)) return v === k;
      return false;
    },
    bugs: ([n]) => {
      let sq = 1;
      let rad = 1;
      for (const [p, e] of expo(n)) {
        if (e % 2) sq *= p;
        if (e % 3) rad *= p;
      }
      return keepBugs([
        { id: "square-thinking", kind: "conceptual", competency: CUBE, says: "The primes were paired as for a perfect square. A perfect cube needs every prime in groups of three.", predict: sq === 1 ? null : sq },
        { id: "one-each", kind: "procedural", competency: CUBE, says: "Each incomplete group got one more prime; a group of one needs two more to make three.", predict: rad },
        { id: "leftover-given", kind: "procedural", competency: CUBE, says: "The primes left over after taking out the complete groups of three were given; the multiplier is what is MISSING to complete those groups.", predict: leftover(n) },
        { id: "square-of-number", kind: "conceptual", competency: CUBE, says: `Multiplying by ${n} × ${n} does make a cube (${n}³), but it is not the smallest; only the missing primes are needed.`, predict: n * n },
      ]);
    },
    distractors: ([n]) => [cubeMult(n) * 2, cubeMult(n) * 3, primeList(n)[primeList(n).length - 1]],
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `${s.inputs[0]} = ${s.value}` : `Complete each group of three equal primes: multiply by ${s.value}`),
    domain: [[16, 2000]],
    difficulty: ([n]) => ([...expo(n)].filter(([, e]) => e % 3).length === 1 ? 1 : n <= 300 ? 2 : 3),
    word: ([n]) => `A shop has ${n} small cube-shaped sweets. The owner wants to put together some identical boxes of ${n} sweets each so that all the sweets can be stacked into one large solid cube. What is the smallest number of boxes needed?`,
    teach: {
      idea: "In a perfect cube every prime factor comes in groups of three, because the number is something times itself three times.",
      method: "Write the number as a product of primes and group equal primes in threes. Multiply by whatever primes are needed to complete every group.",
      alternatives: [
        { id: "index", title: "Powers that divide by 3", kind: "procedural", text: ["Write the number in index form, e.g. 72 = 2³ × 3².", "A perfect cube has every power a multiple of 3: 3² needs one more 3, so multiply by 3."] },
      ],
    },
    limits: "Numbers from 16 to 2000 with a repeated prime factor and a multiplier up to 50; dividing to make a cube is the same idea.",
  },

  // ------------------------------------------------------------------ linear and exponential growth
  {
    id: "ajgrow",
    arity: 3,
    title: "When doubling overtakes adding",
    competency: GROW,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, d, b]) => {
      if (a < 10 || a > 100 || d < 5 || d > 50 || b < 1 || b > 10 || b >= a) return "Plan A from ₹10 to ₹100 adding ₹5 to ₹50; Plan B from ₹1 to ₹10 doubling.";
      const n = cross(a, d, b);
      return n < 3 || n > 10 ? "Plan B overtakes between day 3 and day 10." : null;
    },
    prompt: ([a, d, b]) => `Plan A: ₹${a} on day 0, then ₹${d} more each day. Plan B: ₹${b} on day 0, then doubled each day. On which day is Plan B first worth more than Plan A?`,
    solve: ([a, d, b]) => {
      const n = cross(a, d, b);
      return {
        steps: [
          { id: "before", op: "compare", competency: GROW, inputs: [n - 1, a + d * (n - 1), b * 2 ** (n - 1)], value: n - 1 },
          { id: "after", op: "compare", competency: GROW, inputs: [n, a + d * n, b * 2 ** n], value: n },
        ],
        answer: n,
      };
    },
    // independent: simulate day by day, adding d to A and doubling B
    validate: ([a, d, b], v) => {
      let A = a;
      let B = b;
      for (let day = 1; day <= 40; day++) {
        A += d;
        B += B;
        if (B > A) return v === day;
      }
      return false;
    },
    bugs: ([a, d, b]) => {
      const n = cross(a, d, b);
      let lin: number | null = null;
      for (let day = 1; day <= 60 && b > d; day++) if (b + b * day > a + d * day) {
        lin = day;
        break;
      }
      let mul: number | null = null;
      for (let day = 1; day <= 60 && 2 * b > d; day++) if (b * 2 * day > a + d * day) {
        mul = day;
        break;
      }
      return keepBugs([
        { id: "power-as-multiplication", kind: "conceptual", competency: EXP, says: `After n days of doubling the amount is ₹${b} × 2ⁿ, not ₹${b} × 2 × n: each day multiplies by 2 again.`, predict: mul },
        { id: "doubling-as-adding", kind: "conceptual", competency: GROW, says: `Doubling was treated as adding ₹${b} each day. Doubling adds the whole current amount, which itself keeps growing.`, predict: lin },
        { id: "last-day-behind", kind: "procedural", competency: GROW, says: "The last day on which Plan A was still ahead (or equal) was given; the question asks for the first day Plan B is ahead.", predict: n - 1 },
        { id: "start-as-day-one", kind: "procedural", competency: GROW, says: "The start was counted as day 1; here the start is day 0.", predict: n + 1 },
      ]);
    },
    variants: () => [],
    explain: (s) => `Day ${s.inputs[0]}: Plan A ₹${s.inputs[1]}, Plan B ₹${s.inputs[2]}`,
    domain: [[10, 100], [5, 50], [1, 10]],
    cap: 300,
    difficulty: ([a, d, b]) => (cross(a, d, b) <= 5 ? 1 : cross(a, d, b) <= 7 ? 2 : 3),
    word: ([a, d, b]) => `A pond has two kinds of weed. Weed A covers ${a} square metres and spreads by ${d} square metres every week. Weed B covers ${b} square metre${b > 1 ? "s" : ""} and doubles every week. After how many weeks does Weed B first cover more than Weed A?`,
    teach: {
      idea: "Adding grows by the same amount each step (linear); doubling grows by more and more each step (exponential), so doubling always overtakes in the end.",
      method: "Make a table of the two plans day by day: add for one, double for the other, and look for the first day the doubling plan is bigger.",
      visual: ([a, d, b]) => {
        const n = cross(a, d, b);
        const days = [...Array(n + 1).keys()];
        return { type: "table", head: ["Day", "Plan A", "Plan B"], rows: days.map((k) => [String(k), String(a + d * k), String(b * 2 ** k)]) };
      },
      alternatives: [
        { id: "paper_fold", title: "Folding paper", kind: "conceptual", text: ["Fold a sheet in half again and again: 2, 4, 8, 16, 32 … layers.", "Adding one sheet each time gives only 2, 3, 4, 5 …: doubling soon leaves adding far behind."] },
      ],
    },
    limits: "One adding plan against one doubling plan, crossing between day 3 and day 10; growth by other factors uses the same table.",
  },

  // ------------------------------------------------------------------ number bases
  {
    id: "ajb10",
    arity: 2,
    title: "A numeral in another base, in base ten",
    competency: BASE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([b, n]) => (b < 2 || b > 9 || n < 4 || n > 400 || n.toString(b).length < 3 || n.toString(b).length > 6 ? "Bases 2 to 9, numerals with 3 to 6 digits, values up to 400." : null),
    prompt: ([b, n]) => `The numeral ${n.toString(b)} is written in base ${b}. What is its value in base ten?`,
    solve: ([b, n]) => {
      const ds = n.toString(b).split("").map(Number);
      return {
        steps: ds.map((d, i) => ({ id: `place${i}`, op: "multiply", competency: BASE, inputs: [d, b, ds.length - 1 - i], value: d * b ** (ds.length - 1 - i) })),
        answer: n,
      };
    },
    // independent: convert the answer back to base b by repeated division and compare the digits
    validate: ([b, n], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      let x = v;
      let s = "";
      while (x > 0) {
        s = String(x % b) + s;
        x = Math.floor(x / b);
      }
      return s === n.toString(b);
    },
    bugs: ([b, n]) => {
      const s = n.toString(b);
      return [
        { id: "read-as-ten", kind: "conceptual", competency: BASE, says: `The digits were read as a base-ten number. In base ${b} the places are worth 1, ${b}, ${b * b}, …, not 1, 10, 100.`, predict: Number(s) },
        { id: "digit-sum", kind: "conceptual", competency: BASE, says: "The digits were simply added; each digit must be multiplied by the value of its place first.", predict: s.split("").reduce((t, c) => t + Number(c), 0) },
        { id: "places-reversed", kind: "procedural", competency: BASE, says: `The place values were taken from the left; the rightmost digit is the ones place, then ${b}s, then ${b * b}s.`, predict: parseInt(s.split("").reverse().join(""), b) },
      ];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} × ${s.inputs[1]}${sup(Number(s.inputs[2]))} = ${s.value}`,
    domain: [[2, 9], [4, 400]],
    cap: 400,
    difficulty: ([b, n]) => (b === 2 && n < 32 ? 1 : n.toString(b).length <= 3 ? 2 : 3),
    word: ([b, n]) => `On a planet, people count using only the digits 0 to ${b - 1}, so their places are worth 1, ${b}, ${b * b}, … from the right. A sign there shows ${n.toString(b)} mangoes. How many mangoes is that in our base-ten numbers?`,
    teach: {
      idea: `In base b, each place is worth b times the place to its right: 1, b, b², b³, … just as base ten has 1, 10, 100.`,
      method: "Multiply each digit by the value of its place and add the results.",
      alternatives: [
        { id: "horner", title: "Multiply and add from the left", kind: "procedural", text: ["Start with the first digit. Multiply by the base and add the next digit; repeat to the end.", "Base 5, 243: 2 × 5 + 4 = 14, 14 × 5 + 3 = 73."] },
      ],
    },
    limits: "Bases 2 to 9 with 3- to 6-digit numerals and values up to 400; bases above ten need extra digit symbols.",
  },
  {
    id: "ajbase",
    arity: 2,
    title: "A base-ten number in another base",
    competency: BASE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([b, n]) => (b < 2 || b > 9 || n < 4 || n > 400 || n.toString(b).length < 3 || n.toString(b).length > 6 ? "Bases 2 to 9, numerals with 3 to 6 digits, values up to 400." : null),
    prompt: ([b, n]) => `Write the base-ten number ${n} in base ${b}. Type the digits of the base-${b} numeral.`,
    solve: ([b, n]) => {
      const steps: Step[] = [];
      let x = n;
      while (x > 0) {
        steps.push({ id: `div${steps.length}`, op: "divide", competency: BASE, inputs: [x, b, x % b], value: Math.floor(x / b) });
        x = Math.floor(x / b);
      }
      return { steps, answer: Number(n.toString(b)) };
    },
    // independent: read the typed digits back in base b (multiply-and-add from the left) and compare with n
    validate: ([b, n], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      let val = 0;
      for (const c of String(v)) {
        const d = Number(c);
        if (d >= b) return false;
        val = val * b + d;
      }
      return val === n;
    },
    bugs: ([b, n]) => {
      const s = n.toString(b);
      const q = Math.floor(n / b);
      return keepBugs([
        { id: "remainders-top-down", kind: "procedural", competency: BASE, says: "The remainders were written in the order they were found. The first remainder is the ones digit, so read them from the last one up.", predict: Number(s.split("").reverse().join("")) },
        q >= b && { id: "one-division", kind: "procedural", competency: BASE, says: `Only one division was done: ${n} = ${q} × ${b} + ${n % b}, but ${q} is ${b} or more, so it must be divided by ${b} again.`, predict: Number(`${q}${n % b}`) },
        { id: "unchanged", kind: "conceptual", competency: BASE, says: `The base-ten digits were kept. In base ${b} only the digits 0 to ${b - 1} are used and the places are worth 1, ${b}, ${b * b}, ….`, predict: n },
      ]);
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} remainder ${s.inputs[2]}`,
    domain: [[2, 9], [4, 400]],
    cap: 400,
    difficulty: ([b, n]) => (b === 2 && n < 32 ? 1 : n.toString(b).length <= 3 ? 2 : 3),
    word: ([b, n]) => `A machine stores numbers in base ${b}, using only the digits 0 to ${b - 1}. How does it store the number ${n}? Type the digits.`,
    teach: {
      idea: "Writing a number in base b means making groups of 1, b, b², … : the remainders after dividing by b are the digits, ones first.",
      method: "Divide by b again and again, writing each remainder. Stop at 0, then read the remainders from the last to the first.",
      alternatives: [
        { id: "place_values", title: "Take away the biggest places", kind: "procedural", text: ["List the place values: for base 3, 1, 3, 9, 27, 81.", "Take away as many of the biggest place value as fit; the count is that digit. Repeat with the next place."] },
      ],
    },
    limits: "Bases 2 to 9 with 3- to 6-digit results and values up to 400.",
  },
];

// ---------------------------------------------------------------- helpers used above

const GST = [5, 12, 18, 28];
const WHO = ["Anu", "Ravi", "Meena"];
const OPS = ["+", "−", "×", "÷"];
/** a/b as printed: −3/4; in brackets when it follows an operation and is negative. */
function fr(a: number, b: number, after = false) {
  const t = `${a < 0 ? "−" : ""}${Math.abs(a)}/${b}`;
  return after && a < 0 ? `(${t})` : t;
}
function fmtQ(x: number) {
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) {
      const g = gcd(n, d);
      return d / g === 1 ? n_(n / g) : `${n_(n / g)}/${d / g}`;
    }
  }
  return String(x);
}
function rateText(r: number, k: number, t: number) {
  const T = r * k;
  return [
    `${k} kg of rice cost ₹${T}. What is the cost of 1 kg, in rupees?`,
    `A bus travels ${T} km in ${k} hours at a steady speed. How many km does it travel in 1 hour?`,
    `An auto charges ₹${T} for a ride of ${k} km, at a fixed rate per km. What is the fare per km, in rupees?`,
    `A worker earns ₹${T} for ${k} days of work, the same each day. How much does the worker earn per day, in rupees?`,
  ][t];
}
/** P·(1 ± r/100)ⁿ (half-yearly: r/2 for 2n periods) as a whole number, or null when it is not whole. */
function ciValue(k: number, r: number, n: number, m: number): number | null {
  const P = 1000 * k;
  if (m === 1) return ciBig(P, 200 + r, 200, 2 * n);
  return ciBig(P, m === 2 ? 100 - r : 100 + r, 100, n);
}
function ciBig(P: number, num: number, den: number, n: number): number | null {
  const top = BigInt(P) * big(num, n);
  const bottom = big(den, n);
  return top % bottom === 0n ? Number(top / bottom) : null;
}
/** The smallest multiplier that makes n a perfect cube. */
function cubeMult(n: number) {
  let k = 1;
  for (const [p, e] of expo(n)) if (e % 3) k *= p ** (3 - (e % 3));
  return k;
}
/** n divided by its largest perfect-cube factor. */
function leftover(n: number) {
  let k = 1;
  for (const [p, e] of expo(n)) k *= p ** (e % 3);
  return k;
}
/** The first day n ≥ 1 with b·2ⁿ > a + d·n. */
function cross(a: number, d: number, b: number) {
  for (let n = 1; n <= 40; n++) if (b * 2 ** n > a + d * n) return n;
  return 99;
}
