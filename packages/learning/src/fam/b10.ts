/**
 * Batch b10 (families@2), Grades 6–8 number: ordering integers, operation properties, prime factorisation, ratio,
 * unit rates, exponent laws, Indian and international numeration, integer multiplication, profit and loss, simple
 * and compound interest, dividing in a ratio, rational-number operations, cubes, linear and exponential growth, and
 * place-value systems in other bases. Written by OpenPath; CC0.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { EXP, MT, factSlip, gcd, near, signed, sup } from "../family-kit";

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
const FACT = "MATH.algebra.factorisation";
const ZERO = "MATH.algebra.polynomial-zeros";

const none = () => null;
/** "a" or "an" before a number as it is read ("an 8 m", "an 11 cm", "an 18%", "a 7 m"). */
const aN = (x: number | string) => `${/^(8|11|18)(?!\d)|^8/.test(String(x)) ? "an" : "a"} ${x}`;
const AN = (x: number | string) => `${/^(8|11|18)(?!\d)|^8/.test(String(x)) ? "An" : "A"} ${x}`;
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
    contract: { kind: "value", statement: ([a, b, c, s]) => `${a}-(${b}${s ? "+" : "-"}${c})` },
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
    word: ([x, y, k, s]) => {
      const bags = (n: number) => `${n} bag${n === 1 ? "" : "s"}`;
      return s ? `A school canteen mixes ${bags(x)} of sand with ${bags(y)} of cement for a floor. For a bigger floor it uses ${bags(y * k)} of cement. How many bags of sand keep the same ratio?` : `A school canteen mixes ${bags(x)} of sand with ${bags(y)} of cement for a floor. For a bigger floor it uses ${bags(x * k)} of sand. How many bags of cement keep the same ratio?`;
    },
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
      { id: "reciprocal-missed", kind: "procedural", competency: EXP, says: "The value of the positive power was given; a negative power turns it into 1 over that number.", predict: m - k < 0 ? a ** (k - m) : a ** (m - k) <= 1000 ? 1 / a ** (m - k) : null },
    ]),
    // only values that show as exact fractions (denominators up to 1000), never a long decimal
    distractors: ([a, m, k]) => [a ** (m - k - 1), a ** (m - k + 1), a ** (k - m)].filter((x) => Number.isInteger(x) || Number.isInteger(Math.round(1 / x)) && Math.round(1 / x) <= 1000),
    variants: () => [],
    explain: (s) => (s.id === "combine" ? `Add the powers: ${s.inputs[0]} ${signed(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : `${s.inputs[0]} to the power ${n_(Number(s.inputs[1]))} = ${Number(s.value) < 1 ? `1/${Math.round(1 / Number(s.value))}` : s.value}`),
    domain: [[2, 10], [0, 5], [1, 8]],
    // answers written as exact fractions: denominators up to 1000
    keep: ([a, m, k]) => k <= m || a ** (k - m) <= 1000,
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
    contract: { kind: "value", statement: ([a, b]) => `${a}*${b < 0 ? `(${b})` : b}` },
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
      // money taken out of savings: any size of change makes sense (a temperature falling 15 °C an hour does not)
      if (a < 0 && b < 0) return `Every day ${nm(-a - b)} takes ₹${-a} out of a savings box, a change of −₹${-a} a day. Compared with now, how much more money was in the box ${-b} days ago? (Give the change from now to then as an integer: more money is positive.)`;
      const [rate, days] = a < 0 ? [a, b] : [b, a];
      return `Every day ${nm(days - rate)} takes ₹${-rate} out of a savings box, a change of −₹${-rate} a day. What is the total change in the money in the box after ${days} days, in rupees? (Money taken out is negative.)`;
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
      return m ? `A shopkeeper sells a fan for ${rs(sp)} and makes ${aN(p)}% ${s ? "loss" : "profit"} on it. What did the fan cost him (the cost price), in rupees?` : `A shopkeeper buys a fan for ${rs(cp)} and sells it at ${aN(p)}% ${s ? "loss" : "profit"}. What is the selling price, in rupees?`;
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
      // an item whose price fits ₹100–₹1000
      const it = cp <= 300 ? "school bag" : cp <= 600 ? "pair of shoes" : "wall clock";
      return m ? `${nm(c)} sold a ${it} for ${rs(sp)} and found that this was ${aN(p)}% ${s ? "loss" : "profit"} on what it had cost. How much had the ${it} cost, in rupees?` : `${nm(c)} bought a ${it} for ${rs(cp)} and later sold it at ${aN(p)}% ${s ? "loss" : "profit"}. For how many rupees did ${nm(c)} sell it?`;
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
    reject: ([k, r, t, m]) => (k < 1 || k > 40 || r < 2 || r > 15 || t < 1 || t > 6 || m < 0 || m > 4 ? "Principal ₹500 to ₹20,000, rate 2% to 15%, 1 to 6 years." : null),
    prompt: ([k, r, t, m]) => {
      const P = 500 * k;
      const I = (P * r * t) / 100;
      return [
        `Find the simple interest on ${rs(P)} for ${t} year${t > 1 ? "s" : ""} at ${r}% per year, in rupees.`,
        `${rs(P)} is lent for ${t} year${t > 1 ? "s" : ""} at ${r}% simple interest per year. What is the amount (principal + interest) at the end, in rupees?`,
        `The simple interest on ${rs(P)} for ${t} year${t > 1 ? "s" : ""} is ${rs(I)}. What is the rate of interest per year, in per cent?`,
        `The simple interest on ${rs(P)} at ${r}% per year is ${rs(I)}. For how many years was the money lent?`,
        `The simple interest on a sum of money for ${t} year${t > 1 ? "s" : ""} at ${r}% per year is ${rs(I)}. What is the sum (the principal), in rupees?`,
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
      if (m === 4) return { steps: [{ id: "principal", op: "divide", competency: PL, inputs: [I * 100, r * t], value: P }], answer: P };
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
      if (m === 4) {
        // independent: one year's interest on the typed principal, added up for each year, must give the stated interest
        let s = 0;
        for (let i = 0; i < t; i++) s += (v * r) / 100;
        return near(s, I, 1e-12);
      }
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
      if (m === 4) return keepBugs([
        { id: "no-hundred", kind: "conceptual", competency: PCT, says: `The interest was divided by ${r} × ${t} but not multiplied by 100. ${r}% means ${r} out of 100, so P = SI × 100 ÷ (R × T).`, predict: intOrNull(I / (r * t)) },
        t > 1 && { id: "time-forgotten", kind: "procedural", competency: PL, says: `The time was left out: the interest is for ${t} years, so divide by R × T = ${r} × ${t}.`, predict: intOrNull((I * 100) / r) },
        { id: "multiplied-back", kind: "conceptual", competency: PL, says: "The interest formula was used forwards on the interest itself. Here the interest is known and the principal is the unknown: P = SI × 100 ÷ (R × T).", predict: intOrNull((I * r * t) / 100) },
      ]);
      return keepBugs([
        { id: "rate-and-time", kind: "conceptual", competency: PL, says: "The interest was divided by the rate; divide it by one year's interest (P × R ÷ 100) to count the years.", predict: intOrNull(I / r) },
        { id: "year-interest-given", kind: "procedural", competency: PL, says: "One year's interest was given; the time is how many years of that interest make the total.", predict: year },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "year" ? `One year's interest: ${s.inputs[1]}% of ₹${s.inputs[0]} = ₹${s.value}` : s.id === "years" ? `For ${s.inputs[1]} years: ₹${s.inputs[0]} × ${s.inputs[1]} = ₹${s.value}` : s.id === "amount" ? `Amount = ₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}` : s.id === "rate" ? `R = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}%` : s.id === "principal" ? `P = ${s.inputs[0]} ÷ ${s.inputs[1]} = ₹${s.value}` : `T = ₹${s.inputs[0]} ÷ ₹${s.inputs[1]} = ${s.value} years`),
    domain: [[1, 40], [2, 15], [1, 6], [0, 4]],
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
        `${who} earned ${rs(I)} simple interest in ${t} year${t > 1 ? "s" : ""} from a bank paying ${r}% per year. How much money had ${who} deposited, in rupees?`,
      ][m];
    },
    teach: {
      idea: "Simple interest is the same every year: R% of the principal, so T years give T times as much. SI = P × R × T ÷ 100.",
      method: "Write SI = P × R × T ÷ 100, put in the three numbers you know, and work out the fourth.",
      alternatives: [
        { id: "year_by_year", title: "Year by year", kind: "conceptual", text: ["Find one year's interest first: R% of P.", "Add it once for every year. To find the time, count how many years of interest make the total."] },
      ],
    },
    limits: "Principal ₹500 to ₹20,000 in steps of ₹500, whole-number rates 2% to 15% and 1 to 6 years (interest, amount, rate, time or principal); months and fractional rates are later.",
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
    prompt: ([k, d, m]) => (m ? `A mixer costs ${rs(50 * k)} before GST. GST is ${GST[d - 1]}%. What is the price including GST, in rupees?` : `A shirt is marked ${rs(50 * k)}. The shop gives ${aN(5 * d)}% discount. What is the selling price, in rupees?`),
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
    contract: { kind: "value", statement: ([a, b, c, d, o]) => `(${a}/${b}) ${OPS[o]} (${c}/${d})` },
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
    explain: (s) => (s.id === "common" ? `Common denominator: ${s.value}` : s.id === "flip" ? `Dividing by ${s.inputs[0]} is multiplying by its reciprocal` : `${String(s.inputs[0]).replace(/^-/, "−")} ${s.op === "add" ? "+" : s.op === "subtract" ? "−" : "×"} ${String(s.inputs[1]).startsWith("-") ? `(${String(s.inputs[1]).replace(/^-/, "−")})` : s.inputs[1]} = ${fmtQ(Number(s.value))}`),
    domain: [[-8, 8], [2, 9], [-8, 8], [2, 9], [0, 3]],
    cap: 500,
    difficulty: ([, b, , d, o]) => (o === 2 ? 1 : o === 3 ? 2 : b === d || b % d === 0 || d % b === 0 ? 2 : 3),
    word: ([a, b, c, d, o]) => rqWord(a, b, c, d, o),
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

  // ================================================================== gap@1 additions
  // ------------------------------------------------------------------ prime factorisation: divisibility and co-primeness
  {
    id: "ajpfdc",
    arity: 8,
    title: "Divisibility and co-primeness from prime factorisations",
    competency: PF,
    type: "choice",
    // [e2, e3, e5, e7, f2, f3, f5, f7]: A = 2^e2 × 3^e3 × 5^e5 × 7^e7 and B = 2^f2 × 3^f3 × 5^f5 × 7^f7
    parse: none,
    reject: (p) => (p.length === 8 && p.every((x, i) => Number.isInteger(x) && x >= 0 && x <= PFD_MAX[i % 4]) && pfdOk(p) ? null : "Two different numbers built from 2, 3, 5 and 7, each with at least two prime factors, from 12 to 5000."),
    choices: (p) => order(p, 4, "pfdc").map((i) => PFD_TEXT[i]),
    prompt: (p) => `A = ${pfText(p.slice(0, 4))} and B = ${pfText(p.slice(4))}. Using only these prime factorisations (no long division), decide which statement is true.`,
    solve: (p) => {
      const t = pfdTruth(p);
      return { steps: [{ id: "compare", op: "compare", competency: PF, inputs: [PFD_WHY[t]], value: "" }], answer: order(p, 4, "pfdc").indexOf(t) };
    },
    // independent: multiply the factorisations out, test divisibility by the remainder and co-primeness by Euclid's algorithm
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 3) return false;
      const A = pfNum(p.slice(0, 4));
      const B = pfNum(p.slice(4));
      let [x, y] = [A, B];
      while (y) [x, y] = [y, x % y];
      const truth = A % B === 0 ? 0 : B % A === 0 ? 1 : x === 1 ? 2 : 3;
      return order(p, 4, "pfdc")[v] === truth;
    },
    bugs: (p) => {
      const t = pfdTruth(p);
      const o = order(p, 4, "pfdc");
      const A = pfNum(p.slice(0, 4));
      const B = pfNum(p.slice(4));
      const out: Bug[] = [];
      if (t >= 2) out.push({ id: "bigger-divisible", kind: "conceptual", competency: PF, says: "The larger number was taken to be divisible by the smaller one. One number is divisible by another only when every prime factor of the second appears in the first at least as many times.", predict: o.indexOf(A > B ? 0 : 1) });
      if (t === 3) out.push({ id: "not-dividing-is-coprime", kind: "conceptual", competency: PF, says: "Because neither number divides the other, they were called co-prime. Co-prime means the two numbers share no prime factor at all; these two share one.", predict: o.indexOf(2) });
      if (t === 2) out.push({ id: "coprime-means-prime", kind: "conceptual", competency: PRIMES, says: "Co-prime was taken to mean that both numbers must be prime. Co-prime means the two numbers have no prime factor in common, even when neither of them is prime.", predict: o.indexOf(3) });
      if (t <= 1) out.push({ id: "direction-reversed", kind: "conceptual", competency: PF, says: "The direction was reversed. 'A is divisible by B' means B goes into A exactly, so every prime factor of B must appear in A at least as often.", predict: o.indexOf(1 - t) });
      return out;
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 4], [0, 3], [0, 2], [0, 1], [0, 4], [0, 3], [0, 2], [0, 1]],
    keep: pfdOk,
    cap: 400,
    difficulty: (p) => ([2, 2, 1, 3] as const)[pfdTruth(p)],
    teach: {
      idea: "B divides A exactly when every prime of B appears in A at least as many times. Two numbers are co-prime when they share no prime factor, so their only common factor is 1.",
      method: "Compare the powers prime by prime: if each power in B is at most the power in A, A is divisible by B. If no prime appears in both, they are co-prime.",
      alternatives: [
        { id: "boxes", title: "Prime boxes", kind: "conceptual", text: ["Put the primes of each number into boxes: 2, 2, 2, 3 for 24 and 2, 3 for 6.", "If all of B's primes can be matched with primes of A, then B goes into A. If no prime can be matched at all, the numbers are co-prime."] },
      ],
    },
    limits: "Numbers built from the primes 2, 3, 5 and 7, up to 5000; larger primes use the same comparison.",
  },

  // ------------------------------------------------------------------ integers on the number line and in situations
  {
    id: "ajintl",
    arity: 3,
    title: "Integers on the number line and in real situations",
    competency: INT,
    type: "integer",
    mc: true,
    // [m, a, b]: m 0 the point |b| units left (b < 0) or right of a; 1 the integer for a situation (b: context);
    // 2 the opposite of a (b 0 a plain number, 1–5 a situation); 3 how many units apart a and b are
    parse: none,
    reject: (p) => (intlOk(p) ? null : "Integers up to 60 in size in five everyday situations, or up to 9 on the number line."),
    prompt: ([m, a, b]) =>
      m === 0
        ? `On a number line, the point P is ${Math.abs(b)} unit${Math.abs(b) > 1 ? "s" : ""} to the ${b < 0 ? "left" : "right"} of ${n_(a)}. Which integer is at P?`
        : m === 1
          ? `Using positive numbers for above zero, above sea level, a gain or a deposit, and negative numbers for the opposite, write "${sit(b, a)}" as an integer.`
          : m === 2
            ? b === 0
              ? `What is the opposite of ${n_(a)}?`
              : `The opposite of a rise is a fall, and the opposite of a gain is a loss. Write the opposite of "${sit(b - 1, a)}" as an integer (positive for above or a gain, negative for below or a loss).`
            : `How many units apart are ${n_(a)} and ${n_(b)} on the number line?`,
    solve: ([m, a, b]) => {
      const v = m === 0 ? a + b : m === 1 ? a : m === 2 ? -a : b - a;
      const op = ["move", "represent", "opposite", "count"][m];
      return { steps: [{ id: op, op, competency: INT, inputs: [a, b], value: v }], answer: v };
    },
    // independent: m 0 and 3 walk along the line one unit at a time; m 1 and 2 read the direction word of the situation
    validate: ([m, a, b], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      if (m === 0) {
        let x = a;
        for (let i = 0; i < Math.abs(b); i++) x += b < 0 ? -1 : 1;
        return v === x;
      }
      if (m === 3) {
        let x = a;
        let n = 0;
        while (x < b) {
          x++;
          n++;
        }
        return v === n;
      }
      if (m === 2 && b === 0) return v + a === 0 && v !== 0;
      const below = /below|loss|withdrawal/.test(sit(m === 1 ? b : b - 1, a));
      const negative = m === 1 ? below : !below;
      return Math.abs(v) === Math.abs(a) && (v < 0) === negative;
    },
    bugs: ([m, a, b]) => {
      if (m === 0)
        return keepBugs([
          { id: "wrong-direction", kind: "conceptual", competency: INT, says: "P was moved the wrong way. Moving left on the number line gives smaller numbers, moving right gives larger ones.", predict: a - b },
          Math.abs(b) > 1 && { id: "start-counted", kind: "procedural", competency: INT, says: "The starting point was counted as the first step. Count the jumps from one mark to the next, not the marks themselves.", predict: a + b - Math.sign(b) },
        ]);
      if (m === 1) return [a < 0 ? { id: "sign-missing", kind: "conceptual", competency: INT, says: `"${sit(b, a)}" is on the negative side, so it is written with a minus sign.`, predict: -a } : { id: "sign-swapped", kind: "conceptual", competency: INT, says: "Above zero, above sea level, a gain or a deposit is written as a positive number; negative numbers are for the opposite.", predict: -a }];
      if (m === 2) return [b === 0 ? { id: "unchanged", kind: "conceptual", competency: INT, says: "The number was copied. The opposite of a number is the same distance from 0 on the other side, so its sign changes.", predict: a } : { id: "situation-not-opposite", kind: "procedural", competency: INT, says: "The situation itself was written as an integer. Its opposite goes the other way, so the sign changes.", predict: a }];
      return keepBugs([
        a < 0 && b > 0 && Math.abs(b) !== Math.abs(a) && { id: "sizes-subtracted", kind: "conceptual", competency: INT, says: `The sizes were subtracted, but ${n_(a)} and ${n_(b)} are on opposite sides of 0: it is ${-a} units to 0 and ${b} more.`, predict: Math.abs(Math.abs(b) - Math.abs(a)) },
        b < 0 && { id: "sizes-added", kind: "conceptual", competency: INT, says: `The sizes were added, but ${n_(a)} and ${n_(b)} are both below 0; count from one to the other.`, predict: Math.abs(a) + Math.abs(b) },
        b === 0 && { id: "start-counted", kind: "procedural", competency: INT, says: "The marks were counted instead of the jumps between them.", predict: -a + 1 },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "move" ? `Starting at ${n_(Number(s.inputs[0]))} and moving ${Math.abs(Number(s.inputs[1]))} to the ${Number(s.inputs[1]) < 0 ? "left" : "right"} reaches ${n_(Number(s.value))}` : s.id === "count" ? `From ${n_(Number(s.inputs[0]))} to ${n_(Number(s.inputs[1]))} is ${s.value} units` : s.id === "opposite" ? `The opposite is the same distance from 0 on the other side: ${n_(Number(s.value))}` : `Written as an integer: ${n_(Number(s.value))}`),
    domain: [[0, 3], [-60, 60], [-9, 9]],
    keep: intlOk,
    cap: 500,
    difficulty: ([m, a, b]) => (m === 1 || m === 2 ? 1 : m === 3 && a < 0 && b > 0 ? 3 : 2),
    word: ([m, a, b]) =>
      m === 0
        ? `In a building the ground floor is 0, the floors above are 1, 2, 3 … and the basements are −1, −2, −3 …. A lift is at floor ${n_(a)} and goes ${b < 0 ? "down" : "up"} ${Math.abs(b)} floor${Math.abs(b) > 1 ? "s" : ""}. At which floor does it stop?`
        : m === 1
          ? `${nm(a + b)} keeps a diary of numbers, with positive numbers for above zero, above sea level, a gain or a deposit and negative numbers for the opposite. Which integer does ${nm(a + b)} write for "${sit(b, a)}"?`
          : m === 2
            ? b === 0
              ? `In a board game, a move written ${n_(a)} means ${Math.abs(a)} steps ${a > 0 ? "forward" : "backward"}. Which integer stands for the move that exactly undoes it?`
              : `${nm(a + b)} writes "${sit(b - 1, a)}" as the integer ${n_(a)}. Which integer does ${nm(a + b)} write for the opposite situation?`
            : `In a building with basements numbered −1, −2, …, a lift goes from floor ${n_(a)} to floor ${n_(b)}. How many floors does it travel?`,
    teach: {
      idea: "On a number line, positive integers are to the right of 0 and negative integers to the left. Every integer has an opposite, the same distance from 0 on the other side.",
      method: "Decide the direction first (above or below, gain or loss, left or right), then count the units from 0 or from the starting point.",
      visual: ([m, a, b]) => (m === 0 ? { type: "numberline", from: Math.min(a, a + b) - 1, to: Math.max(a, a + b) + 1, step: 1, marks: [a], jumps: [[a, a + b]] } : m === 3 ? { type: "numberline", from: a - 1, to: b + 1, step: 1, marks: [a, b] } : { type: "numberline", from: -10, to: 10, step: 2, marks: [] }),
      alternatives: [
        { id: "lift", title: "A lift in a building", kind: "conceptual", text: ["Think of the ground floor as 0, floors above as 1, 2, 3 and basements as −1, −2, −3.", "Going up adds, going down subtracts; the opposite of 3 floors up is 3 floors down."] },
      ],
    },
    limits: "Integers up to 60 in size for situations and opposites, and up to 9 on the number line; ordering lists of integers is ajord.",
  },

  // ------------------------------------------------------------------ crores, lakhs, millions, billions
  {
    id: "ajcrore",
    arity: 4,
    title: "Crores and lakhs in figures; millions and billions in lakhs and crores",
    competency: IIN,
    type: "integer",
    mc: true,
    // [m, x, y, z]: m 0 write "x crore y lakh z thousand" in figures; 1 x million in lakh; 2 x billion in crore
    parse: none,
    reject: (p) => (croreOk(p) ? null : "x crore y lakh z thousand (x from 1 to 99, z from 0 to 9), up to 99 million, or up to 99 billion."),
    prompt: ([m, x, y, z]) => (m === 0 ? `Write the number "${croreWords(x, y, z)}" in figures. Type the digits without commas.` : m === 1 ? `${x} million is how many lakh?` : `${x} billion is how many crore?`),
    solve: ([m, x, y, z]) => {
      if (m === 0)
        return {
          steps: [
            { id: "crore", op: "place", competency: IIN, inputs: [x], value: x * 1e7 },
            { id: "lakh", op: "place", competency: IIN, inputs: [y], value: y * 1e5 },
            { id: "thousand", op: "place", competency: IIN, inputs: [z], value: z * 1e3 },
          ],
          answer: x * 1e7 + y * 1e5 + z * 1e3,
        };
      return { steps: [{ id: m === 1 ? "million" : "billion", op: "convert", competency: IIN, inputs: [x], value: m === 1 ? 10 * x : 100 * x }], answer: m === 1 ? 10 * x : 100 * x };
    },
    // independent: m 0 splits the typed number back into its crores, lakhs and thousands (Indian periods); m 1 and 2
    // compare both amounts written out in ones
    validate: ([m, x, y, z], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      if (m === 0) return Math.floor(v / 1e7) === x && Math.floor((v % 1e7) / 1e5) === y && Math.floor((v % 1e5) / 1e3) === z && v % 1e3 === 0;
      return m === 1 ? v * 100000 === x * 1000000 : v * 10000000 === x * 1000000000;
    },
    bugs: ([m, x, y, z]) => {
      const right = m === 0 ? x * 1e7 + y * 1e5 + z * 1e3 : 0;
      if (m === 0) {
        const glued = Number(`${x}${y ? y : ""}${z ? z : ""}000`);
        return keepBugs([
          glued !== right && { id: "no-place-holder", kind: "procedural", competency: IIN, says: "The numbers were written next to each other without zeros for the empty places. Lakhs take two places and thousands two places, so missing digits must be filled with 0.", predict: glued },
          y > 0 && y <= 9 && { id: "lakh-as-ten-lakh", kind: "recall", competency: IIN, says: "1 lakh was written as 10,00,000; 1 lakh is 1,00,000 (five zeros).", predict: x * 1e7 + y * 1e6 + z * 1e3 },
          { id: "crore-six-zeros", kind: "recall", competency: IIN, says: `1 crore was written with six zeros (10,00,000), which is 10 lakh. 1 crore is 1,00,00,000: seven zeros, so ${x} crore = ${inr(x * 1e7)}.`, predict: x * 1e6 + y * 1e5 + z * 1e3 },
        ]);
      }
      if (m === 1)
        return [
          { id: "million-is-lakh", kind: "conceptual", competency: IIN, says: "1 million was taken as 1 lakh. 1 million is 10,00,000, which is 10 lakh.", predict: x },
          { id: "million-is-crore", kind: "conceptual", competency: IIN, says: "1 million was taken as 1 crore (100 lakh). 1 million is 10 lakh, and 1 crore is 10 million.", predict: 100 * x },
        ];
      return [
        { id: "billion-is-crore", kind: "conceptual", competency: IIN, says: "1 billion was taken as 1 crore. 1 billion = 1000 million, and 1 crore = 10 million, so 1 billion = 100 crore.", predict: x },
        { id: "billion-thousand-crore", kind: "procedural", competency: IIN, says: "1 billion is 1000 million, but a crore is 10 million, not 1 million: 1 billion = 100 crore.", predict: 1000 * x },
      ];
    },
    distractors: ([m, x, y, z]) => (m === 0 ? [(x * 1e7 + y * 1e5 + z * 1e3) * 10, (x * 1e7 + y * 1e5 + z * 1e3) / 10, x * 1e7 + z * 1e5 + y * 1e3] : []),
    variants: () => [],
    explain: (s) => (s.id === "crore" ? `${s.inputs[0]} crore = ${inr(Number(s.value))}` : s.id === "lakh" ? `${s.inputs[0]} lakh = ${inr(Number(s.value))}` : s.id === "thousand" ? `${s.inputs[0]} thousand = ${inr(Number(s.value))}` : s.id === "million" ? `${s.inputs[0]} million = ${s.inputs[0]} × 10 lakh = ${s.value} lakh` : `${s.inputs[0]} billion = ${s.inputs[0]} × 100 crore = ${s.value} crore`),
    // a domain small enough to be listed in full (not sampled), so the million and billion questions reach the pool too
    domain: [[0, 2], [1, 99], [0, 99], [0, 9]],
    keep: croreOk,
    cap: 450,
    difficulty: ([m, x, y, z]) => (m === 1 ? 1 : m === 2 ? 2 : y < 10 || z < 10 ? 3 : 2),
    word: ([m, x, y, z]) => (m === 0 ? `A district's budget for schools is ${croreWords(x, y, z)} rupees. The clerk types the amount in figures, without commas. What does the clerk type?` : m === 1 ? `A news report says a city has ${x} million people. How many lakh people is that?` : `A company's sales for the year were ${x} billion rupees. How many crore rupees is that?`),
    teach: {
      idea: "In the Indian system the places after thousands are lakhs and crores: 1 lakh = 1,00,000 and 1 crore = 1,00,00,000. 10 lakh = 1 million and 100 crore = 1 billion.",
      method: "Write each period in its own places (crores, then two places for lakhs, two for thousands, three for the rest), filling empty places with 0. To convert, use 1 million = 10 lakh and 1 billion = 100 crore.",
      visual: ([m, x, y, z]) => (m === 0 ? { type: "table", head: ["Crores", "Lakhs", "Thousands", "Hundreds, tens, ones"], rows: [[String(x), String(y).padStart(2, "0"), String(z).padStart(2, "0"), "000"]] } : null),
      alternatives: [
        { id: "zeros", title: "Count the zeros", kind: "procedural", text: ["1 lakh has 5 zeros, 1 million 6, 1 crore 7 and 1 billion 9.", "So a million is 10 lakh (one more zero) and a billion is 100 crore (two more zeros)."] },
      ],
    },
    limits: "Up to 99 crore 99 lakh 9 thousand in figures (single-digit thousands, which need a placeholder zero), up to 99 million and 99 billion; reading a number aloud in words is not marked.",
  },
  {
    id: "ajcrcmp",
    arity: 1,
    title: "The greatest of four numbers in lakhs and crores",
    competency: IIN,
    type: "choice",
    // [s]: a seed for four 7- to 9-digit numbers written with Indian commas
    parse: none,
    reject: ([s]) => (Number.isInteger(s) && s >= 0 && s <= 699 ? null : "Seeds 0 to 699."),
    choices: ([s]) => cmpSet(s).opts.map(inr),
    prompt: ([s]) => `Which of these numbers is the greatest? ${cmpSet(s).opts.map(inr).join(";  ")}`,
    solve: ([s]) => {
      const c = cmpSet(s);
      return { steps: [{ id: "compare", op: "compare", competency: IIN, inputs: [inr(c.opts[c.right])], value: "" }], answer: c.right };
    },
    // independent: remove the commas from the shown numbers and compare their values directly
    validate: ([s], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const xs = cmpSet(s).opts.map((n) => Number(inr(n).replace(/,/g, "")));
      return v >= 0 && v < xs.length && xs.every((x, i) => i === v || x < xs[v]);
    },
    bugs: ([s]) => {
      const c = cmpSet(s);
      return [
        { id: "first-digit", kind: "conceptual", competency: IIN, says: "The numbers were compared by their first digits. A number with more digits is greater, so count the digits (or the crores and lakhs) first.", predict: c.fewer },
        { id: "last-groups", kind: "procedural", competency: IIN, says: "The last digits (thousands and ones) were compared. When two numbers have the same number of digits, compare from the left: crores first, then lakhs.", predict: c.tail },
      ];
    },
    variants: () => [],
    explain: (s) => `The greatest is ${s.inputs[0]}: it has the most crores and lakhs.`,
    domain: [[0, 699]],
    cap: 400,
    difficulty: ([s]) => (s % 3 === 0 ? 1 : 2),
    word: ([s]) => `Four countries reported their populations: ${cmpSet(s).opts.map(inr).join(";  ")}. Which population is the largest?`,
    teach: {
      idea: "A number with more digits is greater. With the same number of digits, compare place by place from the left: crores, then lakhs, then thousands.",
      method: "Count the digits of each number. Among those with the most digits, compare the crores, then the lakhs, and so on.",
      alternatives: [
        { id: "table", title: "A place-value table", kind: "procedural", text: ["Write each number in a table with columns for crores, lakhs, thousands and the last three digits.", "Read down the first column that differs; the largest digit there is the greatest number."] },
      ],
    },
    limits: "Four numbers from 10 lakh to 99 crore with Indian commas; comparing across the international system is ajmill and ajcrore.",
  },

  // ------------------------------------------------------------------ comparing expressions without evaluating
  {
    id: "ajcmpx",
    arity: 4,
    title: "Comparing two expressions without working them out",
    competency: OPP,
    type: "choice",
    // [t, a, b, c]: template t (subtraction with brackets 0–3, 7, 8; distributing a product 4–6, 9)
    parse: none,
    reject: (p) => (cmpxOk(p) ? null : "Whole numbers with a − b − c ≥ 0 for the subtraction forms, a from 2 to 9 for the product forms."),
    choices: (p) => order(p, 3, "cmpx").map((i) => CMPX_SIGN[i]),
    prompt: ([t, a, b, c]) => {
      const [L, R] = cmpxText(t, a, b, c);
      return `Without working out either side, decide which sign goes in the box: ${L} □ ${R}`;
    },
    solve: (p) => ({ steps: [{ id: "compare", op: "rewrite", competency: OPP, inputs: [CMPX_WHY[p[0]]], value: "" }], answer: order(p, 3, "cmpx").indexOf(CMPX_TRUE[p[0]]) }),
    // independent: work out both sides and compare the values
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 2) return false;
      const [L, R] = cmpxValue(p[0], p[1], p[2], p[3]);
      return order(p, 3, "cmpx")[v] === (L < R ? 0 : L === R ? 1 : 2);
    },
    bugs: (p) => {
      const t = p[0];
      const o = order(p, 3, "cmpx");
      const says =
        t === 3
          ? "The signs inside a bracket after a plus sign were changed. Only a minus sign in front of a bracket changes the signs inside: a + (b − c) = a + b − c."
          : [4, 5, 6, 9].includes(t)
            ? "Only the first number in the bracket was multiplied. The multiplier spreads over every term inside: a × (b + c) = a × b + a × c."
            : "When the bracket after the minus sign was removed, the sign inside was kept. Taking away a bracket changes every sign inside: a − (b − c) = a − b + c and a − (b + c) = a − b − c.";
      return [{ id: [4, 5, 6, 9].includes(t) ? "distribute-one" : t === 3 ? "plus-bracket" : "inner-sign", kind: "conceptual", competency: OPP, says, predict: o.indexOf(CMPX_SLIP[t]) }];
    },
    variants: () => [],
    explain: (s) => String(s.inputs[0]),
    domain: [[0, 9], [2, 99], [2, 49], [2, 9]],
    keep: cmpxOk,
    cap: 500,
    difficulty: ([t]) => ([0, 5, 7].includes(t) ? 1 : [3, 4, 6].includes(t) ? 2 : 3),
    teach: {
      idea: "Two expressions can be compared by rewriting one to look like the other: removing a bracket after a minus sign changes the signs inside, and a multiplier spreads over every term of a bracket.",
      method: "Rewrite the side with brackets without them, then see what is left over: if the two sides now differ only by an extra + c or − c, you know which is bigger without working anything out.",
      alternatives: [
        { id: "money", title: "Think of money", kind: "conceptual", text: ["a − (b − c): you spend b but get c back, so you have a − b + c.", "a − (b + c): you spend b and then c more, so you have a − b − c, which is less."] },
      ],
    },
    limits: "Ten forms of brackets after minus and plus signs and of distributing a product over a sum or difference; longer chains are written tasks.",
  },
  {
    id: "ajprop",
    arity: 6,
    title: "Naming the property: closure, commutative, associative, distributive, identity and inverse",
    competency: OPP,
    type: "choice",
    // [k, set, o, i, j, l]: property k (0 commutative, 1 associative, 2 distributive, 3 additive identity, 4
    // multiplicative identity, 5 closure, 6 additive inverse, 7 multiplicative inverse); set 0 the whole numbers
    // i + 2, j + 2, l + 2; set 1 the rational numbers RATS[i], RATS[j], RATS[l]; o 0 addition, 1 multiplication
    parse: none,
    reject: (p) => (propOk(p) ? null : "Whole numbers from 2 to 101 (up to 50 for products), or rational numbers with denominators 2 to 9; inverses only for rational numbers."),
    choices: (p) => propOpts(p).map((k) => PROP_NAME[k]),
    prompt: (p) => `Which property does this statement show? ${propStatement(p).text}`,
    solve: (p) => ({ steps: [{ id: "name", op: "classify", competency: OPP, inputs: [PROP_NAME[p[0]]], value: "" }], answer: propOpts(p).indexOf(p[0]) }),
    // independent: classify the statement from its shape (which terms swap, regroup, spread, vanish or give 0 or 1) and
    // check that both sides really are equal
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const k = propOpts(p)[v];
      return k !== undefined && propClassify(propStatement(p)) === k;
    },
    bugs: (p) => {
      const k = p[0];
      const says = [
        "Changing the order was called associative. Associative is about regrouping with brackets; swapping the order is the commutative property.",
        "Regrouping with brackets was called commutative. The order of the numbers is the same on both sides; only the brackets moved, so it is associative.",
        "Moving the brackets was taken as the associative property. Here a multiplication is spread over an addition, which is the distributive property.",
        "0 was taken as the identity for multiplication. 0 is the identity for addition (adding 0 changes nothing); 1 is the identity for multiplication.",
        "1 was taken as the identity for addition. Multiplying by 1 changes nothing, so 1 is the multiplicative identity.",
        "'The answer is again a number of the same kind' was read as an identity property. An identity leaves a number unchanged; here the result is new but stays in the same set, which is closure.",
        "A sum of 0 was read as the additive identity. Adding 0 is the identity; two numbers that add up to 0 are additive inverses of each other.",
        "A product of 1 was read as the multiplicative identity. Multiplying by 1 is the identity; two numbers whose product is 1 are multiplicative inverses (reciprocals).",
      ][k];
      return [{ id: `confuse-${k}`, kind: "conceptual", competency: OPP, says, predict: propOpts(p).indexOf(PROP_CONF[k]) }];
    },
    variants: () => [],
    explain: (s) => `The statement shows the ${String(s.inputs[0]).replace(/ \(.*\)$/, "").toLowerCase()}.`,
    domain: [[0, 7], [0, 1], [0, 1], [0, 99], [0, 99], [0, 99]],
    keep: propOk,
    cap: 500,
    difficulty: ([k, set]) => (Math.min(3, (k <= 1 || k === 3 || k === 4 ? 1 : 2) + set) as 1 | 2 | 3),
    teach: {
      idea: "Closure: the result stays in the set. Commutative: the order can change. Associative: the grouping can change. Distributive: multiplication spreads over addition. Identity: 0 for addition, 1 for multiplication. Inverse: what brings a number back to the identity.",
      method: "Compare the two sides: same numbers in a different order (commutative), same order with brackets moved (associative), a product spread over a sum (distributive), a 0 or 1 that changes nothing (identity), or a result of 0 or 1 (inverse).",
      alternatives: [
        { id: "spot", title: "Spot the change", kind: "procedural", text: ["Cover the brackets and look at the order of the numbers: if it changed, it is commutative.", "If the order is the same and only the brackets moved, it is associative. If one number now appears twice, it is distributive."] },
      ],
    },
    limits: "One statement at a time with whole numbers (Grade 6) or rational numbers (Grade 8); whether a property holds for subtraction or division is a written task.",
  },
  {
    id: "ajinv",
    arity: 5,
    title: "Inverses of rational numbers and the distributive property",
    competency: RQ,
    type: "fraction",
    mc: true,
    // [m, a, b, c, d]: x = a/b; m 0 the additive inverse of x; 1 the multiplicative inverse; 2 x × c/d + x × (d − c)/d
    parse: none,
    reject: (p) => (invOk(p) ? null : "a/b in lowest terms with denominators 2 to 9, and for the distributive form c/d with 0 < c < d."),
    prompt: ([m, a, b, c, d]) => (m === 0 ? `What is the additive inverse of ${fr(a, b)}?` : m === 1 ? `What is the multiplicative inverse (reciprocal) of ${fr(a, b)}?` : `Use the distributive property to work out ${fr(a, b)} × ${c}/${d} + ${fr(a, b, true)} × ${d - c}/${d}. (A fraction is fine.)`),
    solve: ([m, a, b, c, d]) => {
      if (m === 0) return { steps: [{ id: "additive", op: "opposite", competency: RQ, inputs: [`${a}/${b}`], value: -a / b }], answer: -a / b };
      if (m === 1) return { steps: [{ id: "reciprocal", op: "reciprocal", competency: RQ, inputs: [`${a}/${b}`], value: b / a }], answer: b / a };
      return {
        steps: [
          { id: "factor", op: "rewrite", competency: OPP, inputs: [`${a}/${b}`, `${c}/${d}`, `${d - c}/${d}`], value: 1 },
          { id: "times", op: "multiply", competency: RQ, inputs: [`${a}/${b}`, 1], value: a / b },
        ],
        answer: a / b,
      };
    },
    // independent: m 0 the sum with x must be 0, m 1 the product with x must be 1; m 2 works out both products and adds them
    validate: ([m, a, b, c, d], v) => {
      if (typeof v !== "number") return false;
      if (m === 0) return near(v + a / b, 0, 1e-9) && Math.abs(v) > 1e-12;
      if (m === 1) return near(v * (a / b), 1, 1e-9);
      return near(v, ((a * c) / (b * d)) + (a * (d - c)) / (b * d), 1e-9);
    },
    bugs: ([m, a, b, c, d]) => {
      if (m === 0)
        return [
          { id: "reciprocal-instead", kind: "conceptual", competency: RQ, says: "The reciprocal was given. The additive inverse is the number that ADDS to give 0: just change the sign.", predict: -b / a },
          { id: "reciprocal-signed", kind: "conceptual", competency: RQ, says: "The fraction was turned upside down; the additive inverse keeps the numerator and denominator and only changes the sign.", predict: b / a },
        ];
      if (m === 1)
        return [
          { id: "sign-changed", kind: "conceptual", competency: RQ, says: "The sign was changed as well. The reciprocal keeps the sign, because the product must be +1 (a negative times a negative is positive).", predict: -b / a },
          { id: "additive-instead", kind: "conceptual", competency: RQ, says: "The additive inverse was given. The multiplicative inverse is the number that MULTIPLIES to give 1: turn the fraction upside down.", predict: -a / b },
        ];
      return [
        { id: "factor-dropped", kind: "procedural", competency: OPP, says: `After taking out the common factor, only the bracket was worked out: ${c}/${d} + ${d - c}/${d} = 1 must still be multiplied by ${fr(a, b)}.`, predict: 1 },
        ...(a < 0 ? [{ id: "sign-error", kind: "conceptual", competency: IMUL, says: "The sign was lost: the common factor is negative, so the answer is negative too.", predict: -a / b } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "additive" ? `${String(s.inputs[0]).replace(/^-/, "−")} + (${fmtQ(Number(s.value))}) = 0` : s.id === "reciprocal" ? `${String(s.inputs[0]).replace(/^-/, "−")} × ${fmtQ(Number(s.value))} = 1` : s.id === "factor" ? `Take out the common factor: ${String(s.inputs[0]).replace(/^-/, "−")} × (${s.inputs[1]} + ${s.inputs[2]}) = ${String(s.inputs[0]).replace(/^-/, "−")} × 1` : `= ${fmtQ(Number(s.value))}`),
    domain: [[0, 2], [-9, 9], [2, 9], [1, 8], [2, 9]],
    keep: invOk,
    cap: 400,
    difficulty: ([m, a]) => (m === 2 ? 3 : a < 0 ? 2 : 1),
    word: ([m, a, b, c, d]) =>
      m === 0
        ? `A tank's water level changed by ${fr(a, b)} m (a fall is negative). What change, in m, would bring it back to where it started?`
        : m === 1
          ? a > 0
            ? `A recipe is scaled by multiplying every amount by ${fr(a, b)}. By what number must the scaled amounts be multiplied to get back the original amounts exactly? (A fraction is fine.)`
            : `A number machine multiplies every number put into it by ${fr(a, b)}. By what number must its output be multiplied to get back the number that was put in? (A fraction is fine.)`
          : `A tank's water level changes by ${fr(a, b)} m every hour (a fall is negative). The pump runs for ${c}/${d} of an hour in the morning and ${d - c}/${d} of an hour in the evening. What is the total change in the level, in m?`,
    teach: {
      idea: "The additive inverse of x is −x, because x + (−x) = 0. The multiplicative inverse of a/b is b/a, because a/b × b/a = 1. The distributive property x × y + x × z = x × (y + z) can make a calculation easy.",
      method: "Additive inverse: change the sign. Multiplicative inverse: turn the fraction upside down and keep the sign. For x × y + x × z, add y and z first and multiply once.",
      alternatives: [
        { id: "check", title: "Check by combining", kind: "procedural", text: ["Add your additive inverse to the number: you must get 0.", "Multiply your multiplicative inverse by the number: you must get 1."] },
      ],
    },
    limits: "Proper and improper fractions with denominators up to 9; inverses of mixed numbers and longer expressions are other families.",
  },

  // ------------------------------------------------------------------ sums of two cubes in two ways
  {
    id: "ajtaxi",
    arity: 2,
    title: "Numbers that are sums of two cubes in two ways",
    competency: CUBE,
    type: "integer",
    mc: true,
    // [i, w]: the i-th such number N = a³ + b³ = c³ + d³ (a < b, c < d); w 0–3 hides a, b, c or d, w 4 asks for N
    parse: none,
    reject: ([i, w]) => (Number.isInteger(i) && i >= 0 && i < TAXI.length && Number.isInteger(w) && w >= 0 && w <= 4 ? null : "One of 27 numbers up to 4,50,000 that are sums of two cubes in two ways."),
    prompt: ([i, w]) => {
      const [N, ...xs] = TAXI[i];
      const t = xs.map((x, j) => (j === w ? "□³" : `${x}³`));
      return w === 4 ? `Find the number that equals both ${xs[0]}³ + ${xs[1]}³ and ${xs[2]}³ + ${xs[3]}³.` : `${N} can be written as a sum of two cubes in two ways: ${N} = ${t[0]} + ${t[1]} = ${t[2]} + ${t[3]}. What number goes in the box?`;
    },
    solve: ([i, w]) => {
      const [N, ...xs] = TAXI[i];
      if (w === 4) return { steps: [{ id: "cubes", op: "add", competency: CUBE, inputs: [xs[0] ** 3, xs[1] ** 3], value: N }], answer: N };
      const other = xs[w ^ 1];
      return {
        steps: [
          { id: "subtract", op: "subtract", competency: "MATH.number.subtraction", inputs: [N, other ** 3], value: N - other ** 3 },
          { id: "root", op: "cube-root", competency: CUBE, inputs: [N - other ** 3], value: xs[w] },
        ],
        answer: xs[w],
      };
    },
    // independent: put the answer back in its place and check both sums of cubes equal the same number (N given, or each other)
    validate: ([i, w], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      const [N, ...xs] = TAXI[i];
      if (w === 4) return v === xs[0] * xs[0] * xs[0] + xs[1] * xs[1] * xs[1] && v === xs[2] * xs[2] * xs[2] + xs[3] * xs[3] * xs[3];
      const ys = xs.map((x, j) => (j === w ? v : x));
      const cube = (n: number) => n * n * n;
      return cube(ys[0]) + cube(ys[1]) === N && cube(ys[2]) + cube(ys[3]) === N;
    },
    bugs: ([i, w]) => {
      const [N, ...xs] = TAXI[i];
      if (w === 4) {
        const a = xs[0];
        const b = xs[1];
        return [
          { id: "times-three", kind: "conceptual", competency: CUBE, says: "The cubes were worked out as 3 times the number. A cube is the number multiplied by itself three times.", predict: 3 * a + 3 * b },
          { id: "cube-of-sum", kind: "conceptual", competency: CUBE, says: "The two numbers were added first and then cubed; (a + b)³ is not a³ + b³.", predict: (a + b) ** 3 },
        ];
      }
      const rest = N - xs[w ^ 1] ** 3;
      return keepBugs([
        { id: "no-cube-root", kind: "procedural", competency: CUBE, says: `${N} − ${xs[w ^ 1]}³ = ${rest} was found, but the box holds the number whose CUBE is ${rest}: take the cube root.`, predict: rest },
        rest % 3 === 0 && { id: "root-by-three", kind: "conceptual", competency: CUBE, says: "The cube root was found by dividing by 3. The cube root is the number that, multiplied by itself three times, gives the result.", predict: rest / 3 },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "cubes" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "subtract" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `The cube root of ${s.inputs[0]} is ${s.value}`),
    domain: [[0, 26], [0, 4]],
    difficulty: ([i, w]) => (w === 4 ? 1 : i < 6 ? 2 : 3),
    word: ([i, w]) => {
      const [N, ...xs] = TAXI[i];
      return w === 4 ? `${nm(i)} builds two pairs of solid cubes from unit blocks: one pair with edges ${xs[0]} and ${xs[1]}, the other with edges ${xs[2]} and ${xs[3]}. Both pairs use the same number of blocks. How many blocks is that?` : `${nm(i)} has ${N} unit blocks and builds two solid cubes from them, using every block. One cube has edge ${xs[w ^ 1]}. What is the edge of the other cube?`;
    },
    teach: {
      idea: "Some numbers are the sum of two cubes in two different ways, like 1729 = 1³ + 12³ = 9³ + 10³ (Ramanujan's taxicab number).",
      method: "Subtract the known cube from the number, then find the cube root of what is left (by prime factorisation, or by trying numbers whose cube ends in the right digit).",
      alternatives: [
        { id: "last-digit", title: "Use the last digit", kind: "procedural", text: ["The last digit of a cube decides the last digit of its cube root: cubes ending in 8 come from numbers ending in 2, ending in 7 from 3, and so on.", "Then estimate the size: 10³ = 1000, 20³ = 8000, 30³ = 27,000."] },
      ],
    },
    limits: "The 27 numbers up to 4,50,000 that are sums of two positive cubes in two ways; searching for such numbers is an exploration task.",
  },

  // ------------------------------------------------------------------ comparing ratios
  {
    id: "ajrcmp",
    arity: 4,
    title: "Comparing two ratios, or deciding whether they are equivalent",
    competency: RAT,
    type: "choice",
    // [a, b, c, d]: compare a : b with c : d
    parse: none,
    reject: (p) => (rcmpOk(p) ? null : "a : b in simplest form (terms up to 12) and c : d with terms up to 36."),
    choices: ([a, b, c, d]) => order([a, b, c, d], 3, "rcmp").map((i) => [`${a} : ${b} is greater than ${c} : ${d}`, `${c} : ${d} is greater than ${a} : ${b}`, `${a} : ${b} and ${c} : ${d} are equivalent`][i]),
    prompt: ([a, b, c, d]) => `Compare the ratios ${a} : ${b} and ${c} : ${d}. Which statement is true?`,
    solve: ([a, b, c, d]) => {
      const t = a * d > b * c ? 0 : a * d < b * c ? 1 : 2;
      return { steps: [{ id: "cross", op: "multiply", competency: RAT, inputs: [a * d, b * c], value: "" }], answer: order([a, b, c, d], 3, "rcmp").indexOf(t) };
    },
    // independent: compare the decimal values of a ÷ b and c ÷ d
    validate: ([a, b, c, d], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const x = a / b;
      const y = c / d;
      const t = Math.abs(x - y) < 1e-12 ? 2 : x > y ? 0 : 1;
      return order([a, b, c, d], 3, "rcmp")[v] === t;
    },
    bugs: ([a, b, c, d]) => {
      const o = order([a, b, c, d], 3, "rcmp");
      const t = a * d > b * c ? 0 : a * d < b * c ? 1 : 2;
      const first = a === c ? 2 : a > c ? 0 : 1;
      const additive = b - a === d - c ? 2 : first;
      return keepBugs([
        b - a === d - c && t !== 2 && { id: "additive", kind: "conceptual", competency: RAT, says: "The ratios were compared by the difference between their terms. Ratios compare by multiplication: compare a/b with c/d, for example by cross-multiplying.", predict: o.indexOf(additive) },
        b !== d && first !== t && !(b - a === d - c && first === 2) && { id: "first-terms", kind: "procedural", competency: RAT, says: "Only the first terms were compared. A ratio depends on both terms: bring the second terms to the same number first.", predict: o.indexOf(first) },
      ]);
    },
    variants: () => [],
    explain: (s) => `Cross-multiply: ${s.inputs[0]} and ${s.inputs[1]}. ${Number(s.inputs[0]) === Number(s.inputs[1]) ? "They are equal, so the ratios are equivalent." : Number(s.inputs[0]) > Number(s.inputs[1]) ? "The first is bigger, so the first ratio is greater." : "The second is bigger, so the second ratio is greater."}`,
    domain: [[1, 12], [1, 12], [1, 36], [1, 36]],
    keep: rcmpOk,
    cap: 450,
    difficulty: ([a, b, c, d]) => (a * d === b * c ? 2 : b === d ? 1 : 3),
    word: ([a, b, c, d]) => `Jug A of nannari sherbet is made with ${cups(a)} of syrup to ${cups(b)} of water, and jug B with ${cups(c)} of syrup to ${cups(d)} of water. Comparing the ratio of syrup to water in the two jugs, which statement is true?`,
    teach: {
      idea: "Ratios compare by multiplication. a : b and c : d are equivalent when a/b = c/d; the one with the larger fraction is the greater ratio.",
      method: "Cross-multiply: compare a × d with b × c. Equal products mean equivalent ratios; otherwise the larger product shows the greater ratio. Or write both with the same second term.",
      alternatives: [
        { id: "same-second", title: "Make the second terms equal", kind: "procedural", text: ["To compare 3 : 4 and 5 : 8, write 3 : 4 as 6 : 8.", "Now 6 : 8 and 5 : 8 have the same second term, so 3 : 4 is greater."] },
      ],
    },
    limits: "Two-term ratios with whole-number terms up to 36; three-term ratios are not compared.",
  },

  // ------------------------------------------------------------------ total cost at a fixed rate
  {
    id: "ajfare",
    arity: 3,
    title: "Total cost from a fixed rate per kilometre or metre",
    competency: UR,
    type: "integer",
    mc: true,
    // [r, k, t]: ₹r per unit for k units, context t (auto, taxi, courier, cloth)
    parse: none,
    reject: ([r, k, t]) => (r >= 5 && r <= 30 && k >= 2 && k <= 25 && t >= 0 && t <= 3 ? null : "₹5 to ₹30 per unit for 2 to 25 units."),
    prompt: ([r, k, t]) => fareText(r, k, t),
    solve: ([r, k]) => ({ steps: [{ id: "total", op: "multiply", competency: UR, inputs: [r, k], value: r * k }], answer: r * k }),
    // independent: add the rate once for every kilometre (or metre)
    validate: ([r, k], v) => {
      let s = 0;
      for (let i = 0; i < k; i++) s += r;
      return v === s;
    },
    bugs: ([r, k]) => [
      { id: "added", kind: "conceptual", competency: UR, says: `The rate and the distance were added. Every one of the ${k} units costs ₹${r}, so multiply.`, predict: r + k },
      { id: "rate-only", kind: "procedural", competency: UR, says: "The rate for one unit was given; the question asks for the cost of all of them.", predict: r },
      ...(r <= 12 && k <= 12 && r >= 2 ? [factSlip(r, k)] : []),
    ],
    variants: () => [],
    explain: (s) => `${s.inputs[1]} × ₹${s.inputs[0]} = ₹${s.value}`,
    domain: [[5, 30], [2, 25], [0, 3]],
    cap: 400,
    difficulty: ([r, k]) => (r <= 10 && k <= 10 ? 1 : r * k <= 300 ? 2 : 3),
    word: ([r, k, t]) => fareText(r, k, (t + 1) % 4),
    teach: {
      idea: "At a fixed rate, every kilometre (or metre) costs the same, so the total is the rate times the number of units.",
      method: "Multiply the rate by the distance. Check by estimating: about ₹10 a km for about 10 km is about ₹100.",
      alternatives: [
        { id: "table", title: "A rate table", kind: "procedural", text: ["1 km costs ₹12, 2 km cost ₹24, 3 km cost ₹36 …", "Keep adding ₹12 for each kilometre, or jump: 10 km cost ₹120."] },
      ],
    },
    limits: "Whole-rupee rates from ₹5 to ₹30 and 2 to 25 units with no fixed starting charge; finding the rate from a total is ajrate.",
  },

  // ------------------------------------------------------------------ profit or loss in rupees
  {
    id: "ajplamt",
    arity: 3,
    title: "Profit or loss in rupees, and a missing price",
    competency: PL,
    type: "integer",
    mc: true,
    // [c, d, m]: cost price ₹10c, selling price ₹(10c + 5d); m 0 find the profit (+) or loss (−); 1 find SP from the
    // profit or loss; 2 find CP from SP and the profit or loss
    parse: none,
    reject: ([c, d, m]) => (c >= 5 && c <= 100 && d !== 0 && Math.abs(d) <= 30 && 5 * Math.abs(d) < 10 * c && m >= 0 && m <= 2 ? null : "Cost prices ₹50 to ₹1000 and a profit or loss of ₹5 to ₹150 (less than the cost price)."),
    prompt: ([c, d, m]) => {
      const cp = 10 * c;
      const g = 5 * d;
      const it = plItem(cp);
      return m === 0
        ? `A shopkeeper bought ${it} for ${rs(cp)} and sold it for ${rs(cp + g)}. Find the profit or loss. Type a profit as a positive number and a loss as a negative number (a loss of ₹20 is −20).`
        : m === 1
          ? `A shopkeeper bought ${it} for ${rs(cp)} and made a ${g > 0 ? "profit" : "loss"} of ${rs(Math.abs(g))}. What was the selling price, in rupees?`
          : `A shopkeeper sold ${it} for ${rs(cp + g)} and made a ${g > 0 ? "profit" : "loss"} of ${rs(Math.abs(g))}. What was the cost price, in rupees?`;
    },
    solve: ([c, d, m]) => {
      const cp = 10 * c;
      const g = 5 * d;
      if (m === 0) return { steps: [{ id: "diff", op: "subtract", competency: PL, inputs: [cp + g, cp], value: g }], answer: g };
      if (m === 1) return { steps: [{ id: "sp", op: g > 0 ? "add" : "subtract", competency: PL, inputs: [cp, Math.abs(g)], value: cp + g }], answer: cp + g };
      return { steps: [{ id: "cp", op: g > 0 ? "subtract" : "add", competency: PL, inputs: [cp + g, Math.abs(g)], value: cp }], answer: cp };
    },
    // independent: substitute back: profit = SP − CP must come out as the stated profit (positive) or loss (negative)
    validate: ([c, d, m], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const cp = 10 * c;
      const sp = cp + 5 * d;
      if (m === 0) return v + cp === sp;
      if (m === 1) return v > 0 && v - cp === 5 * d;
      return v > 0 && sp - v === 5 * d;
    },
    bugs: ([c, d, m]) => {
      const cp = 10 * c;
      const g = 5 * d;
      if (m === 0)
        return [
          { id: "reversed", kind: "conceptual", competency: PL, says: g > 0 ? "It was called a loss. Selling for more than the cost price gives a profit, so the answer is positive." : "It was called a profit. Selling for less than the cost price gives a loss, so the answer is negative.", predict: -g },
          { id: "prices-added", kind: "procedural", competency: PL, says: "The two prices were added. Profit or loss is the difference: selling price − cost price.", predict: 2 * cp + g },
        ];
      if (m === 1) return [{ id: "wrong-direction", kind: "conceptual", competency: PL, says: g > 0 ? "The profit was taken away. With a profit the selling price is MORE than the cost price." : "The loss was added. With a loss the selling price is LESS than the cost price.", predict: cp - g }];
      return [{ id: "applied-to-sp", kind: "conceptual", competency: PL, says: g > 0 ? "The profit was added to the selling price. The selling price already includes the profit, so take it away to get the cost price." : "The loss was taken away from the selling price. The cost price is more than the selling price by the loss, so add it.", predict: cp + 2 * g }];
    },
    variants: () => [],
    explain: (s) => (s.id === "diff" ? `₹${s.inputs[0]} − ₹${s.inputs[1]} = ${n_(Number(s.value))} (${Number(s.value) > 0 ? "a profit" : "a loss"})` : `₹${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ₹${s.inputs[1]} = ₹${s.value}`),
    domain: [[5, 100], [-30, 30], [0, 2]],
    keep: ([c, d]) => d !== 0 && 5 * Math.abs(d) < 10 * c,
    cap: 450,
    difficulty: ([, d, m]) => (m === 0 && d > 0 ? 1 : m === 2 ? 3 : 2),
    word: ([c, d, m]) => {
      const cp = 10 * c;
      const g = 5 * d;
      const who = nm(c + d);
      return m === 0
        ? `${who} bought ${plItem(cp).replace(/^a /, "a second-hand ")} for ${rs(cp)} and later sold it to a friend for ${rs(cp + g)}. What was ${who}'s profit or loss? (A profit is positive, a loss negative.)`
        : m === 1
          ? `At the school fair, ${who} spent ${rs(cp)} making paper lanterns and ended with a ${g > 0 ? "profit" : "loss"} of ${rs(Math.abs(g))}. How much money did the lanterns sell for, in rupees?`
          : `At the school fair, ${who} sold paper lanterns for ${rs(cp + g)} in all and made a ${g > 0 ? "profit" : "loss"} of ${rs(Math.abs(g))}. How much had making them cost, in rupees?`;
    },
    teach: {
      idea: "Profit = selling price − cost price when the selling price is more; loss = cost price − selling price when it is less.",
      method: "To find a price: SP = CP + profit (or CP − loss), and CP = SP − profit (or SP + loss).",
      alternatives: [
        { id: "line", title: "On a number line", kind: "conceptual", text: ["Mark the cost price. A profit moves to the right to reach the selling price; a loss moves to the left.", "The size of the move is the profit or loss."] },
      ],
    },
    limits: "Cost prices ₹50 to ₹1000 with a profit or loss up to ₹150; per cent profit and loss are ajpl.",
  },

  // ------------------------------------------------------------------ dividing integers
  {
    id: "ajidiv",
    contract: { kind: "value", statement: ([q, d]) => `${q * d}/${d < 0 ? `(${d})` : d}` },
    arity: 2,
    title: "Dividing integers",
    competency: IMUL,
    type: "integer",
    mc: true,
    // [q, d]: (q × d) ÷ d = q
    parse: none,
    reject: ([q, d]) => (Math.abs(q) >= 2 && Math.abs(d) >= 2 && Math.abs(q) <= 15 && Math.abs(d) <= 12 && (q < 0 || d < 0) ? null : "A quotient from −15 to 15 and a divisor from −12 to 12 (not 0 or ±1), with a negative number involved."),
    prompt: ([q, d]) => `${n_(q * d)} ÷ ${pr(d)} = ?`,
    solve: ([q, d]) => ({
      steps: [
        { id: "size", op: "divide", competency: MT, inputs: [Math.abs(q * d), Math.abs(d)], value: Math.abs(q) },
        { id: "sign", op: "sign", competency: IMUL, inputs: [q * d, d], value: q },
      ],
      answer: q,
    }),
    // independent: the inverse operation: the answer times the divisor, by repeated addition, gives the dividend
    validate: ([q, d], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      let s = 0;
      for (let i = 0; i < Math.abs(v); i++) s += d;
      return (v < 0 ? -s : s) === q * d;
    },
    bugs: ([q, d]) => [
      { id: "sign-rule", kind: "conceptual", competency: IMUL, says: (q * d < 0) === (d < 0) ? "Two negatives were divided to give a negative. A negative divided by a negative is positive." : "A positive and a negative were divided to give a positive. When the signs are different, the quotient is negative.", predict: -q },
      { id: "multiplied", kind: "conceptual", competency: IMUL, says: "The numbers were multiplied instead of divided.", predict: q * d * d },
    ],
    variants: () => [],
    explain: (s) => (s.id === "size" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}` : `${(Number(s.inputs[0]) < 0) === (Number(s.inputs[1]) < 0) ? "Same signs give a positive quotient" : "Different signs give a negative quotient"}: ${n_(Number(s.value))}`),
    domain: [[-15, 15], [-12, 12]],
    keep: ([q, d]) => Math.abs(q) >= 2 && Math.abs(d) >= 2 && (q < 0 || d < 0),
    cap: 400,
    difficulty: ([q, d]) => (Math.abs(q * d) > 100 ? 3 : q < 0 && d < 0 ? 1 : 2),
    word: ([q, d]) =>
      d > 0
        ? `Over ${d} days the money in ${nm(d - q)}'s savings box changed by ${q * d < 0 ? "−" : ""}₹${Math.abs(q * d)}, by the same amount each day. What was the change each day, in rupees? (Money added is positive, money taken out negative.)`
        : `${-d} days ago there was ₹${Math.abs(q * d)} ${q * d > 0 ? "more" : "less"} in ${nm(q - d)}'s savings box than there is now, and the money changed by the same amount each day. What was the change each day, in rupees? (Money added is positive, money taken out negative.)`,
    teach: {
      idea: "Division undoes multiplication, so the sign rules are the same: same signs give a positive quotient, different signs a negative one.",
      method: "Divide the sizes, then decide the sign. Check by multiplying the answer by the divisor.",
      alternatives: [
        { id: "inverse", title: "Use multiplication", kind: "conceptual", text: ["−48 ÷ 6 asks: what times 6 gives −48? The answer is −8.", "−48 ÷ (−6) asks: what times −6 gives −48? The answer is 8."] },
      ],
    },
    limits: "Exact divisions with divisors up to 12 and quotients up to 15 in size; division by 0 is not defined and not asked.",
  },

  // ------------------------------------------------------------------ rational numbers: standard form, comparing, number line
  {
    id: "ajrstd",
    arity: 4,
    title: "A rational number in standard form",
    competency: RQ,
    type: "mixed",
    mc: true,
    // [p, q, k, s]: the standard form p/q (|p| < q, coprime) shown as (kp)/(kq), or as (−kp)/(−kq) when s = 1
    parse: none,
    reject: ([p, q, k, s]) => (p !== 0 && q >= 2 && q <= 12 && Math.abs(p) < q && gcd(Math.abs(p), q) === 1 && k >= 2 && k <= 6 && (s === 0 || s === 1) && k * q <= 60 ? null : "A proper fraction in lowest terms with denominator up to 12, scaled by 2 to 6."),
    prompt: ([p, q, k, s]) => `Write ${n_((s ? -1 : 1) * k * p)}/${n_((s ? -1 : 1) * k * q)} in standard form (a positive denominator, and no common factor of the numerator and denominator other than 1).`,
    solve: ([p, q, k, s]) => ({
      steps: [
        ...(s ? [{ id: "sign", op: "rewrite", competency: RQ, inputs: [-k * p, -k * q], value: `${n_(k * p)}/${k * q}` } as Step] : []),
        { id: "divide", op: "divide", competency: RQ, inputs: [k * p, k * q, k], value: `${n_(p)}/${q}` },
      ],
      answer: `${n_(p)}/${q}`,
    }),
    // independent: read the typed fraction; its denominator must be positive, the two numbers co-prime (by trying every
    // divisor) and its value equal to the given one (cross-multiplication)
    validate: ([p, q, k, s], v) => {
      if (typeof v !== "string") return false;
      const m = v.replace(/−/g, "-").replace(/\s/g, "").match(/^(-?)(\d+)\/(\d+)$/);
      if (!m) return false;
      const n = Number(m[2]) * (m[1] ? -1 : 1);
      const d = Number(m[3]);
      if (d <= 0) return false;
      for (let t = 2; t <= Math.min(Math.abs(n), d); t++) if (n % t === 0 && d % t === 0) return false;
      const N = (s ? -1 : 1) * k * p;
      const D = (s ? -1 : 1) * k * q;
      return n * D === d * N;
    },
    bugs: ([p, q, k]) => {
      let sp = 2;
      while (k % sp) sp++;
      return keepBugs([
        { id: "not-reduced", kind: "procedural", competency: RQ, says: `The sign was put in the right place, but ${k * Math.abs(p)} and ${k * q} still have the common factor ${k}; divide both by it.`, predict: `${n_(k * p)}/${k * q}` },
        { id: "sign-lost", kind: "conceptual", competency: RQ, says: p < 0 ? "The minus sign was lost. A negative number divided by a positive one (or a positive by a negative) is negative." : "The two minus signs were not cancelled correctly: a negative divided by a negative is positive.", predict: `${n_(-p)}/${q}` },
        sp < k && { id: "part-reduced", kind: "procedural", competency: RQ, says: `Only the common factor ${sp} was divided out; ${k} is the highest common factor.`, predict: `${n_((k / sp) * p)}/${(k / sp) * q}` },
      ]);
    },
    distractors: ([p, q]) => [`${n_(p)}/${q + 1}`, `${n_(q)}/${Math.abs(p) === 1 ? q + 2 : Math.abs(p)}`],
    variants: () => [],
    explain: (s) => (s.id === "sign" ? `Multiply the numerator and denominator by −1: ${s.value}` : `Divide both by the highest common factor ${s.inputs[2]}: ${s.value}`),
    domain: [[-11, 11], [2, 12], [2, 6], [0, 1]],
    keep: ([p, q, k]) => p !== 0 && Math.abs(p) < q && gcd(Math.abs(p), q) === 1 && k * q <= 60,
    cap: 400,
    difficulty: ([p, , k, s]) => (s ? 3 : p < 0 && k > 3 ? 2 : 1),
    teach: {
      idea: "A rational number is in standard form when its denominator is positive and the numerator and denominator have no common factor other than 1.",
      method: "If the denominator is negative, multiply top and bottom by −1. Then divide both by their highest common factor.",
      alternatives: [
        { id: "equivalent", title: "Like equivalent fractions", kind: "procedural", text: ["−18/24: the HCF of 18 and 24 is 6, so −18/24 = −3/4.", "36/−48: first write −36/48, then divide by 12 to get −3/4."] },
      ],
    },
    limits: "Proper fractions whose standard form has a denominator up to 12; improper fractions follow the same steps.",
  },
  {
    id: "ajrcq",
    arity: 4,
    title: "Comparing two rational numbers",
    competency: RQ,
    type: "choice",
    // [a, b, c, d]: compare a/b with c/d (c/d may be an unreduced equal form of a/b)
    parse: none,
    reject: (p) => (rcqOk(p) ? null : "a/b in lowest terms (denominator up to 9) and c/d with denominator up to 18, at least one negative."),
    choices: (p) => rcqChoices(p),
    prompt: ([a, b, c, d]) => `Compare ${fr(a, b)} and ${fr(c, d)}. Which statement is true?`,
    solve: ([a, b, c, d]) => {
      const t = a * d > b * c ? 0 : a * d < b * c ? 1 : 2;
      return { steps: [{ id: "common", op: "compare", competency: RQ, inputs: [`${n_(a * d)}/${b * d}`, `${n_(c * b)}/${b * d}`], value: "" }], answer: order([a, b, c, d], 3, "rcq").indexOf(t) };
    },
    // independent: compare the decimal values
    validate: ([a, b, c, d], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const x = a / b;
      const y = c / d;
      return order([a, b, c, d], 3, "rcq")[v] === (Math.abs(x - y) < 1e-12 ? 2 : x > y ? 0 : 1);
    },
    bugs: ([a, b, c, d]) => {
      const o = order([a, b, c, d], 3, "rcq");
      const t = a * d > b * c ? 0 : a * d < b * c ? 1 : 2;
      const bySize = Math.abs(a * d) === Math.abs(b * c) ? 2 : Math.abs(a / b) > Math.abs(c / d) ? 0 : 1;
      const tops = a === c ? 2 : a > c ? 0 : 1;
      return keepBugs([
        a < 0 && c < 0 && bySize !== t && { id: "negatives-by-size", kind: "conceptual", competency: RQ, says: "The numbers were compared by size without their signs. For negative numbers, the one further from 0 is the smaller.", predict: o.indexOf(bySize) },
        b !== d && tops !== t && tops !== bySize && { id: "numerators-only", kind: "procedural", competency: RQ, says: "Only the numerators were compared. With different denominators, write both with a common denominator first.", predict: o.indexOf(tops) },
      ]);
    },
    variants: () => [],
    explain: (s) => `With a common denominator: ${String(s.inputs[0])} and ${String(s.inputs[1])}; compare the numerators.`,
    domain: [[-9, 9], [2, 9], [-18, 18], [2, 18]],
    keep: rcqOk,
    cap: 450,
    difficulty: ([a, b, c, d]) => (a * d === b * c ? 2 : a < 0 && c < 0 ? 3 : b === d ? 1 : 2),
    // a temperature only in halves and quarters of a degree; other denominators are points on a number line
    word: ([a, b, c, d]) =>
      [2, 4].includes(b) && [2, 4].includes(d)
        ? `At dawn the temperature in Kodaikanal was ${fr(a, b)} °C and in Munnar it was ${fr(c, d)} °C. Comparing the two temperatures, which statement is true?`
        : `In a number-line game on the school playground, ${nm(b + d)} stands at ${fr(a, b)} and ${nm(b + d + 1)} stands at ${fr(c, d)}. Comparing the two numbers, which statement is true?`,
    teach: {
      idea: "On the number line, the number to the right is greater. Every positive number is greater than every negative number; between two negatives, the one closer to 0 is greater.",
      method: "Write both with the same positive denominator and compare the numerators (−8/12 < −3/12 because −8 < −3).",
      alternatives: [
        { id: "cross", title: "Cross-multiply", kind: "procedural", text: ["With positive denominators, a/b > c/d exactly when a × d > c × b.", "For −2/3 and −3/5: −2 × 5 = −10 and −3 × 3 = −9; −10 < −9, so −2/3 < −3/5."] },
      ],
    },
    limits: "Two rational numbers with denominators up to 18; ordering longer lists uses the same comparison.",
  },
  {
    id: "ajrline",
    arity: 5,
    title: "Rational numbers on the number line, and one halfway between two",
    competency: RQ,
    type: "fraction",
    mc: true,
    // [m, p, q, s, t]: m 0 the gap from p to p + 1 is cut into q equal parts and P is the s-th mark from the left end
    // (t = 2) or from the right end (t = 3); m 1 the number halfway between p/q and s/t
    parse: none,
    reject: (p) => (rlineOk(p) ? null : "Gaps cut into 2 to 9 parts between −4 and 2, or two fractions with denominators 2 to 9."),
    prompt: ([m, p, q, s, t]) =>
      m === 0
        ? `On a number line, the gap between ${n_(p)} and ${n_(p + 1)} is divided into ${q} equal parts. The point P is the ${ordw(s)} division mark to the ${t === 2 ? `right of ${n_(p)}` : `left of ${n_(p + 1)}`}. Which rational number is at P? (Write it as a fraction, for example −7/4.)`
        : `Find the rational number exactly halfway between ${fr(p, q)} and ${fr(s, t)}. (A fraction is fine.)`,
    solve: ([m, p, q, s, t]) => {
      if (m === 0) {
        const v = t === 2 ? p + s / q : p + 1 - s / q;
        return { steps: [{ id: "mark", op: t === 2 ? "add" : "subtract", competency: RQ, inputs: [t === 2 ? p : p + 1, `${s}/${q}`], value: v }], answer: v };
      }
      const v = (p / q + s / t) / 2;
      return {
        steps: [
          { id: "sum", op: "add", competency: RQ, inputs: [`${p}/${q}`, `${s}/${t}`], value: p / q + s / t },
          { id: "half", op: "divide", competency: RQ, inputs: [p / q + s / t, 2], value: v },
        ],
        answer: v,
      };
    },
    // independent: m 0 steps along the line one part at a time from the named end; m 1 checks the answer is the same
    // distance from both numbers
    validate: ([m, p, q, s, t], v) => {
      if (typeof v !== "number") return false;
      if (m === 0) {
        let x = t === 2 ? p : p + 1;
        for (let i = 0; i < s; i++) x += (t === 2 ? 1 : -1) / q;
        return near(v, x, 1e-9);
      }
      return near(v - p / q, s / t - v, 1e-9) && v > Math.min(p / q, s / t);
    },
    bugs: ([m, p, q, s, t]) => {
      if (m === 0) {
        const right = t === 2 ? p + s / q : p + 1 - s / q;
        return keepBugs([
          !near(p + 1 - s / q, p + s / q) && { id: "other-end", kind: "procedural", competency: RQ, says: `The marks were counted from the other end. P is ${s} parts from ${n_(t === 2 ? p : p + 1)}.`, predict: t === 2 ? p + 1 - s / q : p + s / q },
          (t === 2 ? p < 0 : p + 1 <= 0) && { id: "negative-direction", kind: "conceptual", competency: RQ, says: `From a negative number, moving right still adds and moving left still subtracts: ${n_(t === 2 ? p : p + 1)} ${t === 2 ? "+" : "−"} ${s}/${q}.`, predict: t === 2 ? p - s / q : p + 1 + s / q },
          q > 2 && { id: "marks-as-parts", kind: "procedural", competency: RQ, says: `The ${q - 1} marks were taken as the number of parts; ${q - 1} marks cut the gap into ${q} parts.`, predict: t === 2 ? p + s / (q - 1) : p + 1 - s / (q - 1) },
        ]).filter((b) => !near(b.predict as number, right));
      }
      const v = (p / q + s / t) / 2;
      return keepBugs([
        { id: "not-halved", kind: "procedural", competency: RQ, says: "The two numbers were added but not halved. Halfway is their sum divided by 2.", predict: p / q + s / t },
        !near((p + s) / (q + t), v) && { id: "mediant", kind: "conceptual", competency: RQ, says: "The numerators and the denominators were added: (a + c)/(b + d) lies between the two numbers but not halfway. Halfway is (x + y) ÷ 2.", predict: (p + s) / (q + t) },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "mark" ? `${n_(Number(s.inputs[0]))} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${fmtQ(Number(s.value))}` : s.id === "sum" ? `${String(s.inputs[0]).replace(/^-/, "−")} + ${String(s.inputs[1]).startsWith("-") ? `(${String(s.inputs[1]).replace(/^-/, "−")})` : s.inputs[1]} = ${fmtQ(Number(s.value))}` : `${fmtQ(Number(s.inputs[0]))} ÷ 2 = ${fmtQ(Number(s.value))}`),
    domain: [[0, 1], [-9, 9], [2, 9], [-9, 9], [2, 9]],
    keep: rlineOk,
    cap: 450,
    difficulty: ([m, p, q, , t]) => (m === 1 ? (q === t ? 2 : 3) : p < 0 && t === 3 ? 3 : p < 0 ? 2 : 1),
    word: ([m, p, q, s, t]) =>
      m === 0
        ? ![2, 4, 5].includes(q)
          ? `A number line is painted on the school playground. The gap between ${n_(p)} and ${n_(p + 1)} is divided into ${q} equal small parts. ${nm(p + q)} stands on the ${ordw(s)} small mark to the ${t === 2 ? `right of ${n_(p)}` : `left of ${n_(p + 1)}`}. Which number is ${nm(p + q)} standing on, as a fraction?`
          : `On a thermometer scale, the gap between ${n_(p)} °C and ${n_(p + 1)} °C is divided into ${q} equal small parts. The liquid stops at the ${ordw(s)} small mark to the ${t === 2 ? `right of ${n_(p)}` : `left of ${n_(p + 1)}`} °C (the scale is drawn lying flat, numbers increasing to the right). What temperature does it show, in °C, as a fraction?`
        : ![2, 4, 5].includes(q) || ![2, 4, 5].includes(t)
          ? `Two friends stand on a number line painted on the school playground, at ${fr(p, q)} and ${fr(s, t)}. A third friend wants to stand exactly halfway between them. At which number should the third friend stand? (A fraction is fine.)`
          : `Two marks on a post in a lake are at heights ${fr(p, q)} m and ${fr(s, t)} m from the water surface (negative means below it). A third mark is painted exactly halfway between them. At what height is it, in m?`,
    teach: {
      idea: "Between two integers the number line can be cut into q equal parts; each part is 1/q. A rational number halfway between x and y is their average.",
      method: "Start at the named end and move s parts of 1/q (right adds, left subtracts). For halfway, add the two numbers and divide by 2.",
      visual: ([m, p, q, s, t]) => (m === 0 ? { type: "numberline", from: p - 1, to: p + 2, step: 1, marks: [t === 2 ? p + s / q : p + 1 - s / q] } : null),
      alternatives: [
        { id: "ruler", title: "Like a ruler", kind: "conceptual", text: ["A ruler cuts each centimetre into 10 parts; here each unit is cut into q parts.", "Count the small parts from the end you are told, just as you count millimetres."] },
      ],
    },
    limits: "Points between −4 and 2 with up to 9 parts per unit, and halfway points between two fractions; more numbers between two given ones follow by repeating.",
  },

  // ------------------------------------------------------------------ compound interest: half-yearly, quarterly, and against simple interest
  {
    id: "ajcip",
    arity: 4,
    title: "Compound interest half-yearly or quarterly, and compared with simple interest",
    competency: CI,
    type: "fraction",
    mc: true,
    decimals: true,
    range: [0, Infinity],
    // [k, i, n, m]: principal ₹1000k; m 0 i% per half-year (2i% a year) for n half-years; 1 i% per quarter (4i% a year)
    // for n quarters; 2 CI − SI at i% a year for n years, compounded yearly
    parse: none,
    reject: (p) => (cipOk(p) ? null : "₹1000 to ₹1,00,000 with an exact answer in paise: half-yearly up to 16% a year, quarterly up to 16% a year (6 months to 1 year), or CI − SI for 2 or 3 years."),
    prompt: ([k, i, n, m]) => {
      const P = rs(1000 * k);
      return m === 0
        ? `Find the compound interest on ${P} for ${HALF_T[n]} at ${2 * i}% per year, compounded half-yearly, in rupees.`
        : m === 1
          ? `Find the compound interest on ${P} for ${QTR_T[n]} at ${4 * i}% per year, compounded quarterly, in rupees.`
          : `Find the difference between the compound interest (compounded yearly) and the simple interest on ${P} for ${n} years at ${i}% per year, in rupees.`;
    },
    solve: ([k, i, n, m]) => {
      const P = 1000 * k;
      const A = cipAmount(P, i, n);
      if (m < 2)
        return {
          steps: [
            { id: "period", op: "divide", competency: CI, inputs: [m === 0 ? 2 * i : 4 * i, m === 0 ? 2 : 4], value: i },
            { id: "amount", op: "multiply", competency: EXP, inputs: [P, i, n], value: A },
            { id: "interest", op: "subtract", competency: CI, inputs: [A, P], value: A - P },
          ],
          answer: A - P,
        };
      const si = (P * i * n) / 100;
      return {
        steps: [
          { id: "amount", op: "multiply", competency: EXP, inputs: [P, i, n], value: A },
          { id: "ci", op: "subtract", competency: CI, inputs: [A, P], value: A - P },
          { id: "si", op: "multiply", competency: PL, inputs: [P, i, n], value: si },
          { id: "diff", op: "subtract", competency: CI, inputs: [A - P, si], value: A - P - si },
        ],
        answer: A - P - si,
      };
    },
    // independent: period by period, adding that period's interest to the balance (and, for m 2, simple interest year by year)
    validate: ([k, i, n, m], v) => {
      if (typeof v !== "number") return false;
      const P = 1000 * k;
      let x = P;
      let si = 0;
      for (let t = 0; t < n; t++) {
        x += (x * i) / 100;
        si += (P * i) / 100;
      }
      return near(v, m < 2 ? x - P : x - P - si, 1e-9);
    },
    bugs: ([k, i, n, m]) => {
      const P = 1000 * k;
      const A = cipAmount(P, i, n);
      const si = (P * i * n) / 100;
      const paise = (x: number) => (Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? Math.round(x * 100) / 100 : null);
      if (m === 2)
        return [
          { id: "ci-only", kind: "procedural", competency: CI, says: "Only the compound interest was found; the question asks how much MORE it is than the simple interest.", predict: A - P },
          { id: "amount-minus-si", kind: "procedural", competency: CI, says: "The simple interest was taken away from the amount; take it away from the compound interest (amount − principal).", predict: A - si },
        ];
      const R = m === 0 ? 2 * i : 4 * i;
      const per = m === 0 ? 2 : 4;
      const years = n / per;
      return keepBugs([
        { id: "annual-rate-each-period", kind: "procedural", competency: CI, says: `The yearly rate ${R}% was used for each ${m === 0 ? "half-year" : "quarter"}. Each period earns ${R}% ÷ ${per} = ${i}%.`, predict: (() => { const a = cipAmount(P, R, n); return paise(a - P); })() },
        { id: "simple-interest", kind: "conceptual", competency: CI, says: "Simple interest was found. With compounding, each period's interest is added on and earns interest in the next period.", predict: si },
        { id: "amount-given", kind: "procedural", competency: CI, says: "The amount was given; compound interest is the amount minus the principal.", predict: A },
        Number.isInteger(years) && { id: "compounded-yearly", kind: "procedural", competency: CI, says: `The interest was compounded once a year. ${m === 0 ? "Half-yearly" : "Quarterly"} means ${n} periods at ${i}% each.`, predict: (() => { const a = cipAmount(P, R, years); return paise(a - P); })() },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "period" ? `Rate for each period: ${s.inputs[0]}% ÷ ${s.inputs[1]} = ${s.value}%` : s.id === "amount" ? `Amount = ₹${s.inputs[0]} × (1 + ${s.inputs[1]}/100)^${s.inputs[2]} = ₹${fmtMoney(Number(s.value))}` : s.id === "si" ? `Simple interest = ₹${s.inputs[0]} × ${s.inputs[1]} × ${s.inputs[2]} ÷ 100 = ₹${fmtMoney(Number(s.value))}` : s.id === "diff" ? `Difference = ₹${fmtMoney(Number(s.inputs[0]))} − ₹${fmtMoney(Number(s.inputs[1]))} = ₹${fmtMoney(Number(s.value))}` : `Interest = ₹${fmtMoney(Number(s.inputs[0]))} − ₹${s.inputs[1]} = ₹${fmtMoney(Number(s.value))}`),
    domain: [[1, 100], [1, 20], [2, 4], [0, 2]],
    keep: cipOk,
    cap: 400,
    difficulty: ([, , n, m]) => (m === 2 ? 2 : n === 2 ? 2 : 3),
    word: ([k, i, n, m]) => {
      const P = rs(1000 * k);
      const who = nm(k + i);
      return m === 0
        ? `${who} keeps ${P} in a deposit that pays ${2 * i}% per year, with the interest added every six months. How much interest does the deposit earn in ${HALF_T[n]}, in rupees?`
        : m === 1
          ? `${who} keeps ${P} in a deposit that pays ${4 * i}% per year, with the interest added every three months. How much interest does the deposit earn in ${QTR_T[n]}, in rupees?`
          : `${who} can lend ${P} for ${n} years at ${i}% per year, either at simple interest or at compound interest added yearly. How many more rupees does compound interest give?`;
    },
    teach: {
      idea: "Compounding more often means more periods at a smaller rate: half-yearly uses R/2 per half-year, quarterly R/4 per quarter. Compound interest is more than simple interest because interest earns interest.",
      method: "Amount = P × (1 + r/100)ⁿ with r the rate per period and n the number of periods; CI = amount − P. For the difference, also find SI = P × R × T ÷ 100 and subtract.",
      alternatives: [
        { id: "table", title: "Period by period", kind: "procedural", text: ["Write the balance at the start of each period, add that period's interest, and carry it on.", "For simple interest, add the same interest (on the original principal) each year."] },
      ],
    },
    limits: "Exact answers in paise; half-yearly up to 2 years, quarterly up to 1 year, and CI − SI for 2 or 3 years; finding the rate or time is not asked.",
  },

  // ------------------------------------------------------------------ factorising with identities
  {
    id: "ajfsq",
    arity: 4,
    title: "Factorising a difference of squares or a perfect square",
    competency: FACT,
    type: "tuple",
    mc: true,
    // [m, p, q, k]: m 0 p²x² − q² (k 1: q²y²) = (px + q)(px − q); 1 (px + q)²; 2 (px − q)²; 3 p x² − p q² = p(x + q)(x − q)
    parse: none,
    reject: (p) => (fsqOk(p) ? null : "p and q from 1 to 12 with no common factor (p from 2 to 9 as the common factor in the last form)."),
    prompt: ([m, p, q, k]) => {
      const y = k ? "y" : "";
      const form = ["(ax + b" + y + ")(ax − b" + y + ")", "(ax + b" + y + ")²", "(ax − b" + y + ")²", "c(x + b)(x − b)"][m];
      const names = m === 3 ? "(c, b)" : "(a, b)";
      return `Factorise ${fsqPoly(m, p, q, k)} using an identity. Write it as ${form} with positive whole numbers and type ${names}.`;
    },
    solve: ([m, p, q, k]) => ({
      steps: [
        ...(m === 3 ? [{ id: "common", op: "factorise", competency: FACT, inputs: [p], value: `${p}(x² − ${q * q})` } as Step] : []),
        { id: "identity", op: "factorise", competency: "MATH.algebra.identities", inputs: [m, p, q, k], value: fsqForm(m, p, q, k) },
      ],
      answer: `(${p}, ${q})`,
    }),
    // independent: expand the typed numbers back into the form and compare with the expression at several values of x and y
    validate: ([m, p, q, k], v) => {
      const t = nums(v);
      if (!t || t.length !== 2 || t.some((x) => x <= 0)) return false;
      const [u, w] = t;
      return [[2, 1], [3, 5], [7, 2], [-4, 3]].every(([x, y0]) => {
        const y = k ? y0 : 1;
        const given = m === 0 ? p * p * x * x - q * q * y * y : m === 1 ? p * p * x * x + 2 * p * q * x * y + q * q * y * y : m === 2 ? p * p * x * x - 2 * p * q * x * y + q * q * y * y : p * x * x - p * q * q;
        const typed = m === 0 ? (u * x + w * y) * (u * x - w * y) : m === 1 ? (u * x + w * y) ** 2 : m === 2 ? (u * x - w * y) ** 2 : u * (x + w) * (x - w);
        return given === typed;
      });
    },
    bugs: ([m, p, q]) =>
      keepBugs([
        m < 3 && (p > 1 || q > 1) && { id: "squares-in-brackets", kind: "conceptual", competency: "MATH.algebra.identities", says: `The squares were written in the brackets. The brackets hold the square roots: ${p * p}x² = (${p}x)² and ${q * q} = ${q}².`, predict: `(${p * p}, ${q * q})` },
        m === 3 && q > 1 && { id: "constant-not-rooted", kind: "procedural", competency: "MATH.algebra.identities", says: `After taking out ${p}, the bracket is x² − ${q * q} = x² − ${q}²: the number in the brackets is ${q}, the square root of ${q * q}.`, predict: `(${p}, ${q * q})` },
        m === 3 && { id: "factor-not-taken", kind: "procedural", competency: FACT, says: `The common factor ${p} must be taken out first; then x² − ${q * q} is a difference of squares.`, predict: `(1, ${q})` },
      ]),
    distractors: ([, p, q]) => [`(${q}, ${p})`, `(${p}, ${2 * q})`, `(${p + 1}, ${q})`],
    variants: () => [],
    explain: (s) => (s.id === "common" ? `Take out the common factor: ${s.value}` : `Using the identity: ${s.value}`),
    domain: [[0, 3], [1, 12], [1, 12], [0, 1]],
    keep: fsqOk,
    cap: 450,
    difficulty: ([m, p]) => (m === 0 && p <= 5 ? 1 : m === 3 ? 3 : 2),
    word: ([m, p, q, k]) => {
      const y = k ? "y" : "";
      return m === 0
        ? `A square garden of side ${p === 1 ? "" : p}x m has a square pond of side ${k && q === 1 ? "" : q}${y} m dug in one corner. The area left for plants is ${fsqPoly(m, p, q, k)} square metres. Writing this area as (ax + b${y})(ax − b${y}) with positive whole numbers, what is (a, b)?`
        : m === 3
          ? `${p} identical square tiles of side x cm each have a square of side ${q} cm cut out. The area left is ${fsqPoly(m, p, q, k)} square cm. Writing it as c(x + b)(x − b) with positive whole numbers, what is (c, b)?`
          : `A square rangoli has an area of ${fsqPoly(m, p, q, k)} square units, so its side is (ax ${m === 1 ? "+" : "−"} b${y}) units. With positive whole numbers a and b, what is (a, b)?`;
    },
    teach: {
      idea: "a² − b² = (a + b)(a − b), a² + 2ab + b² = (a + b)² and a² − 2ab + b² = (a − b)². An expression that matches one of these can be factorised at once.",
      method: "Take out any common factor first. Then find a and b as the square roots of the first and last terms; for a perfect square, check that the middle term is 2ab.",
      alternatives: [
        { id: "area", title: "Cut and move a square", kind: "conceptual", text: ["Cut a b × b square from the corner of an a × a square.", "The L-shape that is left can be cut and moved into an (a + b) × (a − b) rectangle."] },
      ],
    },
    limits: "Whole-number coefficients with square roots up to 12; identities with fractions are not asked.",
  },
  {
    id: "ajfcub",
    arity: 4,
    title: "Factorising with the cube identities",
    competency: FACT,
    type: "integer",
    mc: true,
    // [m, a, b, c]: m 0 a³x³ + b³ = (ax + b)(a²x² − □x + b²); 1 a³x³ − b³; 2 a³x³ + b³y³ + c³z³ − 3abc·xyz (box: the xy term)
    parse: none,
    reject: (p) => (fcubOk(p) ? null : "a and b from 1 to 9 (coprime), or a, b, c from 1 to 4 for a³ + b³ + c³ − 3abc."),
    prompt: ([m, a, b, c]) => `Use an identity to factorise: ${fcubLeft(m, a, b, c)} = ${fcubRight(m, a, b, c)}. What number goes in the box?`,
    solve: ([m, a, b, c]) => ({
      steps: [
        { id: "match", op: "match", competency: "MATH.algebra.identities", inputs: [m === 2 ? `a = ${a}x, b = ${b}y, c = ${c}z` : `a = ${a}x, b = ${b}`], value: "" },
        { id: "box", op: "multiply", competency: FACT, inputs: [a, b], value: a * b },
      ],
      answer: a * b,
    }),
    // independent: multiply the brackets out at several values of x, y, z with the answer in the box and compare
    validate: ([m, a, b, c], v) => {
      if (typeof v !== "number") return false;
      return [[2, 3, 1], [-1, 2, 5], [3, -2, 4], [5, 1, -3]].every(([x, y, z]) => {
        if (m === 0) return a ** 3 * x ** 3 + b ** 3 === (a * x + b) * (a * a * x * x - v * x + b * b);
        if (m === 1) return a ** 3 * x ** 3 - b ** 3 === (a * x - b) * (a * a * x * x + v * x + b * b);
        const X = a * x;
        const Y = b * y;
        const Z = c * z;
        return X ** 3 + Y ** 3 + Z ** 3 - 3 * X * Y * Z === (X + Y + Z) * (X * X + Y * Y + Z * Z - v * x * y - b * c * y * z - c * a * z * x);
      });
    },
    bugs: ([m, a, b, c]) =>
      keepBugs([
        { id: "square-middle", kind: "conceptual", competency: "MATH.algebra.identities", says: `The middle term of a square, 2ab, was used. In the cube identities the second bracket has ab: ${m === 2 ? "a² + b² + c² − ab − bc − ca" : m === 0 ? "a³ + b³ = (a + b)(a² − ab + b²)" : "a³ − b³ = (a − b)(a² + ab + b²)"}.`, predict: 2 * a * b },
        m === 2 && { id: "three-abc", kind: "procedural", competency: "MATH.algebra.identities", says: `The coefficient 3abc = ${3 * a * b * c} was copied into the bracket; each cross term in the second bracket is just the product of two of the terms.`, predict: 3 * a * b * c },
        m < 2 && a * b > 2 && { id: "squares-multiplied", kind: "procedural", competency: "MATH.algebra.identities", says: `The two squares ${a * a} and ${b * b} were multiplied; the middle term is a × b = ${a} × ${b}.`, predict: a * a * b * b },
      ]),
    variants: () => [],
    explain: (s) => (s.id === "match" ? `Match the identity: ${s.inputs[0]}` : `The middle term is ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [1, 5], [1, 9], [0, 4]],
    keep: fcubOk,
    // level@1: x³ ± a³ and x³ + y³ + z³ − 3xyz are Class 9 identities
    grade: () => 9,
    difficulty: ([m, a]) => (m === 2 ? 3 : a === 1 ? 1 : 2),
    teach: {
      idea: "a³ + b³ = (a + b)(a² − ab + b²), a³ − b³ = (a − b)(a² + ab + b²), and a³ + b³ + c³ − 3abc = (a + b + c)(a² + b² + c² − ab − bc − ca).",
      method: "Write each cube term as (something)³ to find a, b (and c), then fill the second bracket from the identity.",
      alternatives: [
        { id: "check", title: "Check by multiplying", kind: "procedural", text: ["Multiply the two brackets out: the x² and x terms must cancel, leaving only the cubes.", "If a middle term is left over, the number in the box is wrong."] },
      ],
    },
    limits: "Cubes of ax and b with a up to 5 and b up to 9, and a³ + b³ + c³ − 3abc with a, b, c up to 4.",
  },
  {
    id: "ajfgrp",
    arity: 5,
    title: "Factorising by a common factor or by grouping",
    competency: FACT,
    type: "tuple",
    // [m, p, q, r, s]: m 0 (pq)x²y ± (pr)xy² = p·xy(qx ± ry), s 0 plus, 1 minus; m 1 pq x² + ps x + qr x + rs grouped
    // as qx(px + s) + r(px + s) = (qx + r)(px + s)
    parse: none,
    reject: (p) => (fgrpOk(p) ? null : "A highest common factor from 2 to 9, or four-term expressions (qx + r)(px + s) with p, q up to 5 and r, s up to 9."),
    prompt: ([m, p, q, r, s]) =>
      m === 0
        ? `Factorise ${p * q}x²y ${s ? "−" : "+"} ${p * r}xy² completely by taking out the highest common factor. Write it as g·xy(ax ${s ? "−" : "+"} by) and type (g, a, b).`
        : `Factorise ${grpPoly(p, q, r, s)} by grouping the first two terms and the last two terms. One factor is (${lin(p, s)}). Write the other as (ax + b) and type (a, b).`,
    solve: ([m, p, q, r, s]) =>
      m === 0
        ? { steps: [{ id: "hcf", op: "hcf", competency: FACT, inputs: [p * q, p * r], value: `${p}xy` }], answer: `(${p}, ${q}, ${r})` }
        : {
            steps: [
              { id: "group", op: "factorise", competency: FACT, inputs: [q, r, p, s], value: `${q === 1 ? "" : q}x(${lin(p, s)}) ${r < 0 ? "−" : "+"} ${Math.abs(r)}(${lin(p, s)})` },
              { id: "common", op: "factorise", competency: FACT, inputs: [q, r, p, s], value: `(${lin(q, r)})(${lin(p, s)})` },
            ],
            answer: tup([q, r]),
          },
    // independent: multiply the typed factors back out and compare coefficients (m 0 also: nothing common is left inside)
    validate: ([m, p, q, r, s], v) => {
      const t = nums(v);
      if (!t) return false;
      if (m === 0) {
        if (t.length !== 3 || t.some((x) => x <= 0)) return false;
        const [g, a, b] = t;
        for (let d = 2; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) return false;
        return g * a === p * q && g * b === p * r;
      }
      if (t.length !== 2) return false;
      return [-3, 1, 2, 5].every((x) => (t[0] * x + t[1]) * (p * x + s) === p * q * x * x + (q * s + p * r) * x + r * s);
    },
    bugs: ([m, p, q, r, s]) =>
      m === 0
        ? [{ id: "only-letters", kind: "procedural", competency: FACT, says: `Only xy was taken out. The numbers ${p * q} and ${p * r} also have the common factor ${p}; the highest common factor includes it.`, predict: `(1, ${p * q}, ${p * r})` }]
        : keepBugs([r < 0 && { id: "second-group-sign", kind: "procedural", competency: FACT, says: `When −${-r} is taken out of the last two terms, the signs inside the bracket change: ${r * p}x ${r * s < 0 ? "−" : "+"} ${Math.abs(r * s)} = −${-r}(${lin(p, s)}).`, predict: tup([q, -r]) }]),
    variants: () => [],
    explain: (s) => (s.id === "hcf" ? `The highest common factor of the two terms is ${s.value}` : s.id === "group" ? `Group in pairs: ${s.value}` : `Take out the common bracket: ${s.value}`),
    domain: [[0, 1], [1, 9], [1, 9], [-9, 9], [-9, 9]],
    keep: fgrpOk,
    cap: 400,
    difficulty: ([m, , , r, s]) => (m === 0 ? 1 : r < 0 || s < 0 ? 3 : 2),
    teach: {
      idea: "Factorising undoes expanding: a common factor of every term can be taken outside a bracket, and after grouping, a common bracket can be taken out too.",
      method: "Find the highest common factor of the numbers and the letters. For four terms, take a common factor out of each pair so that the same bracket appears twice, then take that bracket out.",
      alternatives: [
        { id: "reverse", title: "Expand to check", kind: "procedural", text: ["Multiply your answer out again.", "If you get back the expression you started with, the factorisation is right."] },
      ],
    },
    limits: "Two-term expressions in x and y with a numerical common factor up to 9, and four-term expressions that group into two brackets.",
  },
  {
    id: "ajfspl",
    arity: 4,
    title: "Factorising ax² + bx + c by splitting the middle term",
    competency: FACT,
    type: "tuple",
    mc: true,
    // [p, q, r, s]: (px + q)(rx + s) with p < r
    parse: none,
    reject: (p) => (fsplOk(p) ? null : "(px + q)(rx + s) with 1 ≤ p < r ≤ 6, q and s from −9 to 9, no common factor in a bracket."),
    prompt: ([p, q, r, s]) => `Factorise ${quad(p * r, p * s + q * r, q * s)} by splitting the middle term. Write it as (${p === 1 ? "" : p}x + □)(${r}x + □) and type the two numbers in the boxes in order, for example (3, −2).`,
    solve: ([p, q, r, s]) => ({
      steps: [
        { id: "product", op: "multiply", competency: FACT, inputs: [p * r, q * s], value: p * r * q * s },
        { id: "split", op: "split", competency: FACT, inputs: [p * s, q * r], value: p * s + q * r },
        { id: "group", op: "factorise", competency: FACT, inputs: [p, q, r, s], value: `(${lin(p, q)})(${lin(r, s)})` },
      ],
      answer: tup([q, s]),
    }),
    // independent: multiply out (px + u)(rx + w) for the typed u, w and compare with the quadratic at several x
    validate: ([p, q, r, s], v) => {
      const t = nums(v);
      if (!t || t.length !== 2) return false;
      return [-2, 0, 1, 3].every((x) => (p * x + t[0]) * (r * x + t[1]) === p * r * x * x + (p * s + q * r) * x + q * s);
    },
    bugs: ([p, q, r, s]) =>
      keepBugs([
        p * q + r * s !== p * s + q * r && p * q + r * s !== 0 && { id: "swapped", kind: "procedural", competency: FACT, says: `The two numbers were put in the wrong brackets. Multiplying out (${lin(p, s)})(${lin(r, q)}) gives the middle term ${n_(p * q + r * s)}x, not ${n_(p * s + q * r)}x.`, predict: tup([s, q]) },
        { id: "signs-reversed", kind: "procedural", competency: FACT, says: "The signs were reversed: check the sign of the middle term after multiplying out. The constant only fixes whether the two signs are the same or different.", predict: tup([-q, -s]) },
      ]),
    distractors: ([, q, , s]) => [tup([q, -s]), tup([-q, s])],
    variants: () => [],
    explain: (s) => (s.id === "product" ? `a × c = ${n_(Number(s.inputs[0]))} × ${n_(Number(s.inputs[1]))} = ${n_(Number(s.value))}` : s.id === "split" ? `Split the middle term into ${n_(Number(s.inputs[0]))}x and ${n_(Number(s.inputs[1]))}x (their product is a × c and their sum is ${n_(Number(s.value))})` : `Group and take out the common bracket: ${s.value}`),
    domain: [[1, 6], [-9, 9], [1, 6], [-9, 9]],
    keep: fsplOk,
    cap: 450,
    // level@1: splitting the middle term of ax² + bx + c with a ≠ 1 is Class 9 (here a = pr ≥ 2 always)
    grade: ([p, , r]) => (p * r === 1 ? 8 : 9),
    difficulty: ([, q, , s]) => (q > 0 && s > 0 ? 1 : q < 0 && s < 0 ? 2 : 3),
    word: ([p, q, r, s]) => `A rectangular mat has an area of (${quad(p * r, p * s + q * r, q * s)}) square units. Its sides are (${p === 1 ? "" : p}x + □) and (${r}x + □) units long. What numbers go in the boxes, in order?`,
    teach: {
      idea: "If ax² + bx + c = (px + q)(rx + s), then b splits into two parts whose product is a × c: ps and qr.",
      method: "Find two numbers that multiply to a × c and add to b. Write bx as their sum, group the four terms in pairs, take out the common factor of each pair, then the common bracket.",
      alternatives: [
        { id: "tiles", title: "Algebra tiles", kind: "conceptual", text: ["Lay out a x² tiles, b x-tiles and c unit tiles into one rectangle.", "The length and breadth of the rectangle are the two factors."] },
      ],
    },
    limits: "Non-monic quadratics with whole-number coefficients that factorise over the integers; monic x² + px + q is the family factor.",
  },

  // ------------------------------------------------------------------ zeros of a quadratic, and checking them
  {
    id: "ajzero",
    arity: 4,
    title: "The zeros of a quadratic polynomial by factorising",
    competency: ZERO,
    type: "set",
    // [p, q, r, s]: p(x) = (px + q)(rx + s) multiplied out; zeros −q/p and −s/r
    parse: none,
    reject: (p) => (zeroOk(p) ? null : "(px + q)(rx + s) with p, r from 1 to 6, q, s from −9 to 9 and two different zeros."),
    prompt: ([p, q, r, s]) => `Find the zeros of p(x) = ${quad(p * r, p * s + q * r, q * s)} by factorising. Type both zeros separated by a comma (fractions are fine).`,
    solve: ([p, q, r, s]) => ({
      steps: [
        { id: "factor", op: "factorise", competency: FACT, inputs: [p, q, r, s], value: `(${lin(p, q)})(${lin(r, s)})` },
        { id: "zeros", op: "solve", competency: ZERO, inputs: [p, q, r, s], value: [-q / p, -s / r] },
      ],
      answer: [-q / p, -s / r],
    }),
    // independent: substitute each typed number into the polynomial (it must give 0) and check there are two different ones
    validate: ([p, q, r, s], v) => {
      if (!Array.isArray(v) || v.length !== 2 || near(v[0], v[1], 1e-12)) return false;
      const a = p * r;
      const b = p * s + q * r;
      const c = q * s;
      return v.every((x) => Math.abs(a * x * x + b * x + c) < 1e-9);
    },
    bugs: ([p, q, r, s]) =>
      keepBugs([
        { id: "zero-signs", kind: "procedural", competency: ZERO, says: `The zeros were read with the wrong signs: ${lin(p, q)} = 0 gives x = ${fmtQ(-q / p)}.`, predict: [q / p, s / r] },
        (p > 1 || r > 1) && { id: "coefficient-ignored", kind: "procedural", competency: ZERO, says: `x was not divided by its coefficient: ${lin(p, q)} = 0 gives ${p === 1 ? "x" : `${p}x`} = ${n_(-q)}, so x = ${fmtQ(-q / p)}.`, predict: [-q, -s] },
      ]),
    variants: () => [],
    explain: (s) => (s.id === "factor" ? `p(x) = ${s.value}` : `Each bracket is 0: x = ${(s.value as number[]).map(fmtQ).join(" or x = ")}`),
    domain: [[1, 6], [-9, 9], [1, 6], [-9, 9]],
    keep: zeroOk,
    cap: 400,
    difficulty: ([p, , r]) => (p === 1 && r === 1 ? 1 : p === 1 || r === 1 ? 2 : 3),
    teach: {
      idea: "A product is zero only when one of its factors is zero, so the zeros of (px + q)(rx + s) are −q/p and −s/r.",
      method: "Factorise by splitting the middle term, set each bracket equal to 0 and solve. Check: the zeros add to −b/a and multiply to c/a.",
      alternatives: [
        { id: "substitute", title: "Substitute to check", kind: "procedural", text: ["Put each zero back into p(x).", "If the result is 0 both times, the zeros are right."] },
      ],
    },
    limits: "Quadratics with rational zeros that factorise over the integers; quadratics with surd zeros use the formula.",
  },
  {
    id: "ajzchk",
    arity: 5,
    title: "Checking zeros against the coefficients",
    competency: ZERO,
    type: "choice",
    // [p, q, r, s, e]: p(x) = (px + q)(rx + s); claimed zeros: e 0 right, 1 both signs wrong, 2 coefficients ignored, 3 one sign wrong
    parse: none,
    reject: (p) => (zchkOk(p) ? null : "(px + q)(rx + s) with p, r from 1 to 6 and four kinds of claimed zeros."),
    choices: (p) => order(p, 4, "zchk").map((i) => ZCHK_TEXT[i]),
    prompt: (p) => {
      const [z1, z2] = zchkClaim(p);
      return `${nm(p[1] + p[3])} factorised p(x) = ${quad(p[0] * p[2], p[0] * p[3] + p[1] * p[2], p[1] * p[3])} and found the zeros ${qText(z1)} and ${qText(z2)}. Check them using α + β = −b/a and αβ = c/a. Which statement is true?`;
    },
    solve: (p) => {
      const t = zchkTruth(p);
      return { steps: [{ id: "check", op: "compare", competency: ZERO, inputs: zchkWhy(p), value: "" }], answer: order(p, 4, "zchk").indexOf(t) };
    },
    // independent: put the claimed zeros into a(α + β) + b and a·αβ − c in decimals; each check holds when that is 0
    validate: (p, v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      const [z1, z2] = zchkClaim(p).map((z) => z[0] / z[1]);
      const a = p[0] * p[2];
      const b = p[0] * p[3] + p[1] * p[2];
      const c = p[1] * p[3];
      const sumOk = Math.abs(a * (z1 + z2) + b) < 1e-9;
      const prodOk = Math.abs(a * z1 * z2 - c) < 1e-9;
      return order(p, 4, "zchk")[v] === (sumOk ? (prodOk ? 0 : 2) : prodOk ? 1 : 3);
    },
    bugs: (p) => {
      const t = zchkTruth(p);
      const o = order(p, 4, "zchk");
      const [z1, z2] = zchkClaim(p);
      const a = p[0] * p[2];
      const b = p[0] * p[3] + p[1] * p[2];
      const c = p[1] * p[3];
      const S = rq(z1[0] * z2[1] + z2[0] * z1[1], z1[1] * z2[1]);
      const Pd = rq(z1[0] * z2[0], z1[1] * z2[1]);
      const eq = (x: Rq, n: number, d: number) => x[0] * d === n * x[1];
      const cat = (s: boolean, pr: boolean) => (s ? (pr ? 0 : 2) : pr ? 1 : 3);
      const sumSlip = cat(eq(S, b, a), eq(Pd, c, a));
      const prodSlip = cat(eq(S, -b, a), eq(Pd, -c, a));
      return keepBugs([
        sumSlip !== t && { id: "sum-sign", kind: "conceptual", competency: ZERO, says: "The sum of the zeros was compared with b/a. The sum of the zeros is −b/a.", predict: o.indexOf(sumSlip) },
        prodSlip !== t && prodSlip !== sumSlip && { id: "product-sign", kind: "conceptual", competency: ZERO, says: "The product of the zeros was compared with −c/a. The product of the zeros is c/a, with no minus sign.", predict: o.indexOf(prodSlip) },
      ]);
    },
    variants: () => [],
    explain: (s) => s.inputs.join("; "),
    domain: [[1, 6], [-9, 9], [1, 6], [-9, 9], [0, 3]],
    keep: zchkOk,
    cap: 400,
    difficulty: ([, , , , e]) => (e === 0 ? 2 : e === 3 ? 3 : 2),
    teach: {
      idea: "For p(x) = ax² + bx + c with zeros α and β, α + β = −b/a and αβ = c/a. A pair that fails either check cannot be the zeros.",
      method: "Add the claimed zeros and compare with −b/a; multiply them and compare with c/a. Both must agree.",
      alternatives: [
        { id: "why", title: "Why it works", kind: "conceptual", text: ["a(x − α)(x − β) = ax² − a(α + β)x + aαβ.", "Matching with ax² + bx + c gives −a(α + β) = b and aαβ = c."] },
      ],
    },
    limits: "Quadratics with rational zeros; the checks only rule zeros out or support them, they do not find them.",
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

// ---------------------------------------------------------------- helpers for the gap@1 families

const fnvh = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
};
/** A fixed shuffle of 0 … n − 1 that differs from problem to problem (so the right letter is not predictable). */
function order(p: number[], n: number, tag: string) {
  return [...Array(n).keys()].sort((x, y) => fnvh(`${tag}:${p.join(",")}:${x}`) - fnvh(`${tag}:${p.join(",")}:${y}`) || x - y);
}
type Rq = [number, number];
function rq(n: number, d = 1): Rq {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(Math.abs(n), d) || 1;
  return [n / g, d / g];
}
const rqs = (r: Rq) => (r[1] === 1 ? n_(r[0]) : `${n_(r[0])}/${r[1]}`);
const qText = rqs;
const cf = (k: number) => (k === 1 ? "" : String(k));
const ORDW = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
const ordw = (s: number) => ORDW[s - 1];
function fmtMoney(x: number) {
  return Number.isInteger(x) ? inr(x) : x.toFixed(2);
}
/** px + s as written: 2x − 3, x + 5. */
function lin(p: number, s: number) {
  return `${p === 1 ? "" : p === -1 ? "−" : n_(p)}x ${s < 0 ? "−" : "+"} ${Math.abs(s)}`;
}
/** ax² + bx + c as written. */
function quad(a: number, b: number, c: number) {
  const mid = b === 0 ? "" : ` ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x`;
  return `${cf(a)}x²${mid}${c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}`}`;
}

// ajpfdc
const PFD_MAX = [4, 3, 2, 1];
const PFD_P = [2, 3, 5, 7];
const pfNum = (e: number[]) => e.reduce((s, x, i) => s * PFD_P[i] ** x, 1);
const pfText = (e: number[]) =>
  e
    .map((x, i) => (x === 0 ? "" : `${PFD_P[i]}${x > 1 ? sup(x) : ""}`))
    .filter(Boolean)
    .join(" × ");
function pfdOk(p: number[]) {
  const A = pfNum(p.slice(0, 4));
  const B = pfNum(p.slice(4));
  const om = (e: number[]) => e.reduce((s, x) => s + x, 0);
  return A !== B && A >= 12 && B >= 12 && A <= 5000 && B <= 5000 && om(p.slice(0, 4)) >= 2 && om(p.slice(4)) >= 2;
}
function pfdTruth(p: number[]) {
  const e = p.slice(0, 4);
  const f = p.slice(4);
  if (f.every((x, i) => x <= e[i])) return 0;
  if (e.every((x, i) => x <= f[i])) return 1;
  return e.some((x, i) => x > 0 && f[i] > 0) ? 3 : 2;
}
const PFD_TEXT = ["A is divisible by B", "B is divisible by A", "A and B are co-prime (their only common factor is 1)", "A and B have a common factor greater than 1, but neither is divisible by the other"];
const PFD_WHY = [
  "Every prime power in B also appears in A (at least as high), so A is divisible by B",
  "Every prime power in A also appears in B (at least as high), so B is divisible by A",
  "No prime appears in both factorisations, so A and B are co-prime",
  "Some prime appears in both, but each number has a prime power the other lacks, so neither divides the other",
];

// ajintl
function sit(ctx: number, a: number) {
  const n = Math.abs(a);
  return [
    a > 0 ? `${n} °C above zero` : `${n} °C below zero`,
    `${n} m ${a > 0 ? "above" : "below"} sea level`,
    a > 0 ? `a profit of ₹${n}` : `a loss of ₹${n}`,
    `${n} floor${n > 1 ? "s" : ""} ${a > 0 ? "above" : "below"} the ground floor`,
    a > 0 ? `a deposit of ₹${n} into a bank account` : `a withdrawal of ₹${n} from a bank account`,
  ][ctx];
}
const sitOk = (ctx: number, a: number) => (ctx === 0 ? Math.abs(a) <= 45 : ctx === 3 ? Math.abs(a) <= 9 : true);
function intlOk([m, a, b]: number[]) {
  if (m === 0) return Math.abs(a) <= 9 && b !== 0 && Math.abs(b) <= 9 && (a < 0 || a + b < 0);
  if (m === 1) return a !== 0 && Math.abs(a) <= 60 && b >= 0 && b <= 4 && sitOk(b, a);
  if (m === 2) return a !== 0 && Math.abs(a) <= 60 && b >= 0 && b <= 5 && (b === 0 || sitOk(b - 1, a));
  return m === 3 && a < 0 && a < b && Math.abs(a) <= 9 && Math.abs(b) <= 9;
}

// ajcrore, ajcrcmp
function croreOk([m, x, y, z]: number[]) {
  if (m === 0) return x >= 1 && x <= 99 && y >= 0 && y <= 99 && z >= 0 && z <= 9 && (y > 0 || z > 0);
  if (m === 1) return x >= 1 && x <= 99 && y === 0 && z === 0;
  return m === 2 && x >= 1 && x <= 99 && y === 0 && z === 0;
}
const croreWords = (x: number, y: number, z: number) => [`${x} crore`, y ? `${y} lakh` : "", z ? `${z} thousand` : ""].filter(Boolean).join(" ");
function cmpSet(s: number) {
  let h = (Math.imul(s + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  const r = (n: number) => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return (h >>> 8) % n;
  };
  const nine = s % 2 === 1;
  const c = nine ? 12 + r(78) : 2 + r(6);
  const l = 10 + r(80);
  const t = r(90000);
  const G = c * 1e7 + l * 1e5 + t;
  const lead = nine ? Math.floor(c / 10) : c;
  const fewer = nine ? (lead + 1 + r(9 - lead)) * 1e7 + r(1e7) : (lead + 1 + r(9 - lead)) * 1e6 + r(1e6);
  const tail = c * 1e7 + (l - 1 - r(5)) * 1e5 + (t + 1 + r(99999 - t));
  const other = (c - 1) * 1e7 + (90 + r(10)) * 1e5 + r(1e5);
  const base = [G, fewer, tail, other];
  const o = order([s], 4, "crcmp");
  return { opts: o.map((i) => base[i]), right: o.indexOf(0), fewer: o.indexOf(1), tail: o.indexOf(2) };
}

// ajcmpx
const CMPX_SIGN = ["<", "=", ">"];
const CMPX_TRUE = [1, 0, 2, 1, 2, 1, 0, 1, 2, 0];
const CMPX_SLIP = [0, 1, 1, 0, 1, 2, 1, 0, 1, 1];
const CMPX_WHY = [
  "a − (b − c) = a − b + c: the two sides are equal",
  "a − (b + c) = a − b − c, which is 2c less than a − b + c",
  "a − (b − c) = a − b + c, which is 2c more than a − b − c",
  "(a + b) − c and a + (b − c) both mean a + b − c: equal",
  "a × (b + c) = a × b + a × c, which is more than a × b + c",
  "a × b + a × c = a × (b + c) by the distributive property: equal",
  "a × (b − c) = a × b − a × c, which is less than a × b − c",
  "a − b − c = a − (b + c): taking away b and then c is taking away b + c",
  "a − (b + c) = a − b − c, which is 2c less than a − b + c",
  "a × (b + c) = a × b + a × c, which is more than a × b + c",
];
function cmpxText(t: number, a: number, b: number, c: number): [string, string] {
  return [
    [`${a} − (${b} − ${c})`, `${a} − ${b} + ${c}`],
    [`${a} − (${b} + ${c})`, `${a} − ${b} + ${c}`],
    [`${a} − (${b} − ${c})`, `${a} − ${b} − ${c}`],
    [`(${a} + ${b}) − ${c}`, `${a} + (${b} − ${c})`],
    [`${a} × (${b} + ${c})`, `${a} × ${b} + ${c}`],
    [`${a} × ${b} + ${a} × ${c}`, `${a} × (${b} + ${c})`],
    [`${a} × (${b} − ${c})`, `${a} × ${b} − ${c}`],
    [`${a} − ${b} − ${c}`, `${a} − (${b} + ${c})`],
    [`${a} − ${b} + ${c}`, `${a} − (${b} + ${c})`],
    [`${a} × ${b} + ${c}`, `${a} × (${b} + ${c})`],
  ][t] as [string, string];
}
function cmpxValue(t: number, a: number, b: number, c: number): [number, number] {
  return [
    [a - (b - c), a - b + c],
    [a - (b + c), a - b + c],
    [a - (b - c), a - b - c],
    [a + b - c, a + (b - c)],
    [a * (b + c), a * b + c],
    [a * b + a * c, a * (b + c)],
    [a * (b - c), a * b - c],
    [a - b - c, a - (b + c)],
    [a - b + c, a - (b + c)],
    [a * b + c, a * (b + c)],
  ][t] as [number, number];
}
function cmpxOk([t, a, b, c]: number[]) {
  if (t < 0 || t > 9 || c < 2 || c > 9 || b <= c) return false;
  if ([4, 5, 6, 9].includes(t)) return a >= 2 && a <= 9 && b >= 11 && b <= 49;
  return a >= 40 && a <= 99 && b >= 10 && b <= 39 && a > b + c;
}

// ajprop
const PROP_NAME = ["Commutative property", "Associative property", "Distributive property", "Additive identity (adding 0)", "Multiplicative identity (multiplying by 1)", "Closure property", "Additive inverse", "Multiplicative inverse"];
const PROP_CONF = [1, 0, 1, 4, 3, 3, 3, 4];
const RATS: Rq[] = [];
for (let y = 2; y <= 9; y++) for (let x = 1; x <= 9; x++) if (gcd(x, y) === 1) RATS.push([x, y], [-x, y]);
type PN = { v: Rq } | { op: "+" | "×"; l: PN; r: PN };
const isLeaf = (n: PN): n is { v: Rq } => "v" in n;
function pnText(n: PN, inner = false, after = false): string {
  if (isLeaf(n)) return after && n.v[0] < 0 ? `(${rqs(n.v)})` : rqs(n.v);
  return `${inner ? "(" : ""}${pnText(n.l, true, false)} ${n.op} ${pnText(n.r, true, true)}${inner ? ")" : ""}`;
}
function pnVal(n: PN): Rq {
  if (isLeaf(n)) return n.v;
  const a = pnVal(n.l);
  const b = pnVal(n.r);
  return n.op === "+" ? rq(a[0] * b[1] + b[0] * a[1], a[1] * b[1]) : rq(a[0] * b[0], a[1] * b[1]);
}
const lf = (v: Rq): PN => ({ v });
const nd = (op: "+" | "×", l: PN, r: PN): PN => ({ op, l, r });
type PStatement = { kind: "eq"; L: PN; R: PN; text: string } | { kind: "closure"; set: number; A: Rq; B: Rq; op: "+" | "×"; text: string; val: Rq };
function propNums([, set, , i, j, l]: number[]): Rq[] {
  return set === 0 ? [[i + 2, 1], [j + 2, 1], [l + 2, 1]] : [RATS[i], RATS[j], RATS[l]];
}
function propOk(p: number[]) {
  const [k, set, o, i, j, l] = p;
  if (k < 0 || k > 7 || (set !== 0 && set !== 1) || (o !== 0 && o !== 1)) return false;
  if (set === 0 && k >= 6) return false;
  if (set === 1 && (i >= RATS.length || j >= RATS.length || l >= RATS.length)) return false;
  if (set === 0 && o === 1 && Math.max(i, j, l) > 48) return false;
  const [A, B, C] = propNums(p);
  const same = (x: Rq, y: Rq) => x[0] === y[0] && x[1] === y[1];
  if (k >= 3 && k !== 5 && (j !== 0 || l !== 0)) return false;
  if (k === 5 && l !== 0) return false;
  return !same(A, B) && (k !== 1 && k !== 2 ? true : !same(B, C) && !same(A, C));
}
function propStatement(p: number[]): PStatement {
  const [k, set, o] = p;
  const [A, B, C] = propNums(p);
  const op = o ? "×" : "+";
  const eq = (L: PN, R: PN): PStatement => ({ kind: "eq", L, R, text: `${pnText(L)} = ${pnText(R)}` });
  if (k === 0) return eq(nd(op, lf(A), lf(B)), nd(op, lf(B), lf(A)));
  if (k === 1) return eq(nd(op, nd(op, lf(A), lf(B)), lf(C)), nd(op, lf(A), nd(op, lf(B), lf(C))));
  if (k === 2) return eq(nd("×", lf(A), nd("+", lf(B), lf(C))), nd("+", nd("×", lf(A), lf(B)), nd("×", lf(A), lf(C))));
  if (k === 3) return eq(o ? nd("+", lf([0, 1]), lf(A)) : nd("+", lf(A), lf([0, 1])), lf(A));
  if (k === 4) return eq(o ? nd("×", lf([1, 1]), lf(A)) : nd("×", lf(A), lf([1, 1])), lf(A));
  if (k === 6) return eq(o ? nd("+", lf(rq(-A[0], A[1])), lf(A)) : nd("+", lf(A), lf(rq(-A[0], A[1]))), lf([0, 1]));
  if (k === 7) return eq(o ? nd("×", lf(rq(A[1], A[0])), lf(A)) : nd("×", lf(A), lf(rq(A[1], A[0]))), lf([1, 1]));
  const val = pnVal(nd(op, lf(A), lf(B)));
  const kind = set ? "rational number" : "whole number";
  return { kind: "closure", set, A, B, op, val, text: `${rqs(A)} and ${rqs(B)} are ${kind}s, and ${pnText(nd(op, lf(A), lf(B)))} = ${rqs(val)} is also a ${kind}.` };
}
/** Which property a statement shows, from its shape alone (−1: none or not true). */
function propClassify(st: PStatement): number {
  if (st.kind === "closure") {
    const a = st.A;
    const b = st.B;
    const v = st.op === "+" ? (a[0] * b[1] + b[0] * a[1]) / (a[1] * b[1]) : (a[0] * b[0]) / (a[1] * b[1]);
    if (Math.abs(v - st.val[0] / st.val[1]) > 1e-12) return -1;
    return st.set === 1 || (Number.isInteger(v) && v >= 0) ? 5 : -1;
  }
  const { L, R } = st;
  const lv = pnVal(L);
  const rv = pnVal(R);
  if (lv[0] * rv[1] !== rv[0] * lv[1]) return -1;
  const same = (a: PN, b: PN) => pnText(a) === pnText(b);
  const val = (n: PN) => (isLeaf(n) ? n.v[0] / n.v[1] : NaN);
  if (isLeaf(R)) {
    if (isLeaf(L)) return -1;
    const kids = [L.l, L.r];
    if (L.op === "+" && kids.some((c) => val(c) === 0) && kids.some((c) => same(c, R))) return 3;
    if (L.op === "×" && kids.some((c) => val(c) === 1) && kids.some((c) => same(c, R))) return 4;
    if (L.op === "+" && val(R) === 0) return 6;
    if (L.op === "×" && val(R) === 1) return 7;
    return -1;
  }
  if (isLeaf(L)) return -1;
  if (L.op === R.op && same(L.l, R.r) && same(L.r, R.l)) return 0;
  if (L.op === R.op && !isLeaf(L.l) && L.l.op === L.op && !isLeaf(R.r) && R.r.op === R.op && same(L.l.l, R.l) && same(L.l.r, R.r.l) && same(L.r, R.r.r)) return 1;
  if (L.op === "×" && !isLeaf(L.r) && L.r.op === "+" && R.op === "+" && !isLeaf(R.l) && !isLeaf(R.r) && R.l.op === "×" && R.r.op === "×" && same(R.l.l, L.l) && same(R.r.l, L.l) && same(R.l.r, L.r.l) && same(R.r.r, L.r.r)) return 2;
  return -1;
}
function propOpts(p: number[]) {
  const [k, set] = p;
  const allowed = set ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5];
  const picks = [k, PROP_CONF[k]];
  const rest = allowed.filter((x) => !picks.includes(x)).sort((x, y) => fnvh(`propf:${p.join(",")}:${x}`) - fnvh(`propf:${p.join(",")}:${y}`));
  const four = [...picks, ...rest.slice(0, 2)];
  return order(p, 4, "prop").map((i) => four[i]);
}

// ajinv
function invOk([m, a, b, c, d]: number[]) {
  if (a === 0 || Math.abs(a) > 9 || b < 2 || b > 9 || gcd(Math.abs(a), b) !== 1) return false;
  return m < 2 ? m >= 0 && c === 1 && d === 2 : m === 2 && c >= 1 && c < d && d <= 9;
}

// ajtaxi: N = a³ + b³ = c³ + d³
const TAXI: number[][] = [[1729, 1, 12, 9, 10], [4104, 2, 16, 9, 15], [13832, 2, 24, 18, 20], [20683, 10, 27, 19, 24], [32832, 4, 32, 18, 30], [39312, 2, 34, 15, 33], [40033, 9, 34, 16, 33], [46683, 3, 36, 27, 30], [64232, 17, 39, 26, 36], [65728, 12, 40, 31, 33], [110656, 4, 48, 36, 40], [110808, 6, 48, 27, 45], [134379, 12, 51, 38, 43], [149389, 8, 53, 29, 50], [165464, 20, 54, 38, 48], [171288, 17, 55, 24, 54], [195841, 9, 58, 22, 57], [216027, 3, 60, 22, 59], [216125, 5, 60, 45, 50], [262656, 8, 64, 36, 60], [314496, 4, 68, 30, 66], [320264, 18, 68, 32, 66], [327763, 30, 67, 51, 58], [373464, 6, 72, 54, 60], [402597, 42, 69, 56, 61], [439101, 5, 76, 48, 69], [443889, 17, 76, 38, 73]];

// ajrcmp, ajrcq
function rcmpOk([a, b, c, d]: number[]) {
  if (a < 1 || b < 1 || a > 12 || b > 12 || a === b || gcd(a, b) !== 1 || c < 1 || d < 1 || c > 36 || d > 36 || c === d) return false;
  if (a * d === b * c) return c !== a;
  return gcd(c, d) === 1 && c <= 12 && d <= 12 && !(a === c && b === d);
}
function rcqOk([a, b, c, d]: number[]) {
  if (a === 0 || Math.abs(a) > 9 || b < 2 || b > 9 || gcd(Math.abs(a), b) !== 1 || c === 0 || d < 2 || d > 18 || !(a < 0 || c < 0)) return false;
  if (a * d === b * c) return gcd(Math.abs(c), d) > 1;
  return gcd(Math.abs(c), d) === 1 && d <= 9 && Math.abs(c) <= 9;
}
function rcqChoices([a, b, c, d]: number[]) {
  const X = fr(a, b);
  const Y = fr(c, d);
  return order([a, b, c, d], 3, "rcq").map((i) => [`${X} is greater than ${Y}`, `${Y} is greater than ${X}`, `${X} and ${Y} are equal`][i]);
}

// ajfare, ajplamt
function fareText(r: number, k: number, t: number) {
  return [
    `An auto-rickshaw charges ₹${r} per km. What is the fare for a ride of ${k} km, in rupees?`,
    `A taxi charges ₹${r} for every kilometre. How much does ${/^(8|11|18)$/.test(String(k)) ? "an" : "a"} ${k} km trip cost, in rupees?`,
    `A courier service charges ₹${r} per km of distance. What does it charge to deliver a parcel ${k} km away, in rupees?`,
    `A shop sells ribbon at ₹${r} per metre. How much do ${k} metres of ribbon cost, in rupees?`,
  ][t];
}
const cups = (n: number) => `${n} cup${n === 1 ? "" : "s"}`;
const plItem = (cp: number) => (cp <= 150 ? "a geometry box" : cp <= 400 ? "a school bag" : cp <= 700 ? "a pair of shoes" : "a wall clock");

// ajrline
function rlineOk([m, p, q, s, t]: number[]) {
  if (m === 0) return p >= -4 && p <= 1 && q >= 2 && q <= 9 && s >= 1 && s < q && (t === 2 || t === 3);
  if (m !== 1 || p === 0 || s === 0 || q < 2 || t < 2 || gcd(Math.abs(p), q) !== 1 || gcd(Math.abs(s), t) !== 1) return false;
  return p * t < s * q && (p < 0 || s < 0);
}

// ajcip
const HALF_T = ["", "", "1 year", "1½ years", "2 years"];
const QTR_T = ["", "", "6 months", "9 months", "1 year"];
const cipAmount = (P: number, i: number, n: number) => (P * (100 + i) ** n) / 100 ** n;
function cipOk([k, i, n, m]: number[]) {
  if (k < 1 || k > 100) return false;
  if (m === 0 ? i < 1 || i > 8 || n < 2 || n > 4 : m === 1 ? i < 1 || i > 4 || n < 2 || n > 4 : m !== 2 || i < 2 || i > 20 || n < 2 || n > 3) return false;
  return (BigInt(1000 * k) * BigInt(100 + i) ** BigInt(n) * 100n) % 100n ** BigInt(n) === 0n;
}

// ajfsq, ajfcub, ajfgrp, ajfspl
function fsqOk([m, p, q, k]: number[]) {
  if (m === 3) return p >= 2 && p <= 9 && q >= 1 && q <= 12 && k === 0;
  return m >= 0 && m <= 2 && p >= 1 && p <= 12 && q >= 1 && q <= 12 && gcd(p, q) === 1 && (k === 0 || k === 1);
}
function fsqPoly(m: number, p: number, q: number, k: number) {
  const y = k ? "y" : "";
  const last = `${k && q === 1 ? "" : q * q}${k ? "y²" : ""}`;
  if (m === 0) return `${cf(p * p)}x² − ${last}`;
  if (m === 3) return `${p}x² − ${p * q * q}`;
  return `${cf(p * p)}x² ${m === 1 ? "+" : "−"} ${2 * p * q}x${y} + ${last}`;
}
function fsqForm(m: number, p: number, q: number, k: number) {
  const y = k ? "y" : "";
  const b = `${k && q === 1 ? "" : q}${y}`;
  if (m === 0) return `(${cf(p)}x + ${b})(${cf(p)}x − ${b})`;
  if (m === 3) return `${p}(x + ${q})(x − ${q})`;
  return `(${cf(p)}x ${m === 1 ? "+" : "−"} ${b})²`;
}
function fcubOk([m, a, b, c]: number[]) {
  if (m < 2) return m >= 0 && a >= 1 && a <= 5 && b >= 1 && b <= 9 && gcd(a, b) === 1 && c === 0;
  return m === 2 && a >= 1 && a <= 4 && b >= 1 && b <= 4 && c >= 1 && c <= 4;
}
function fcubLeft(m: number, a: number, b: number, c: number) {
  if (m === 2) return `${cf(a ** 3)}x³ + ${cf(b ** 3)}y³ + ${cf(c ** 3)}z³ − ${3 * a * b * c}xyz`;
  return `${cf(a ** 3)}x³ ${m === 0 ? "+" : "−"} ${b ** 3}`;
}
function fcubRight(m: number, a: number, b: number, c: number) {
  if (m === 2) return `(${cf(a)}x + ${cf(b)}y + ${cf(c)}z)(${cf(a * a)}x² + ${cf(b * b)}y² + ${cf(c * c)}z² − □xy − ${cf(b * c)}yz − ${cf(c * a)}zx)`;
  return m === 0 ? `(${cf(a)}x + ${b})(${cf(a * a)}x² − □x + ${b * b})` : `(${cf(a)}x − ${b})(${cf(a * a)}x² + □x + ${b * b})`;
}
function fgrpOk([m, p, q, r, s]: number[]) {
  if (m === 0) return p >= 2 && p <= 9 && q >= 1 && q <= 9 && r >= 1 && r <= 9 && gcd(q, r) === 1 && (s === 0 || s === 1);
  return m === 1 && p >= 1 && p <= 5 && q >= 1 && q <= 5 && r !== 0 && s !== 0 && gcd(p, Math.abs(s)) === 1 && gcd(q, Math.abs(r)) === 1 && !(p === q && r === s) && q * s + p * r !== 0;
}
function grpPoly(p: number, q: number, r: number, s: number) {
  const term = (v: number) => `${v < 0 ? "−" : "+"} ${Math.abs(v) === 1 ? "" : Math.abs(v)}x`;
  return `${cf(p * q)}x² ${term(q * s)} ${term(p * r)} ${r * s < 0 ? "−" : "+"} ${Math.abs(r * s)}`;
}
function fsplOk([p, q, r, s]: number[]) {
  return p >= 1 && p < r && r <= 6 && q !== 0 && s !== 0 && Math.abs(q) <= 9 && Math.abs(s) <= 9 && gcd(p, Math.abs(q)) === 1 && gcd(r, Math.abs(s)) === 1 && p * s + q * r !== 0;
}

// ajzero, ajzchk
function zeroOk([p, q, r, s]: number[]) {
  return p >= 1 && p <= 6 && r >= 1 && r <= 6 && q !== 0 && s !== 0 && Math.abs(q) <= 9 && Math.abs(s) <= 9 && gcd(p, Math.abs(q)) === 1 && gcd(r, Math.abs(s)) === 1 && (p < r || (p === r && q < s)) && q * r !== s * p;
}
function zchkOk(p: number[]) {
  return zeroOk(p.slice(0, 4)) && p[4] >= 0 && p[4] <= 3 && p[0] * p[3] + p[1] * p[2] !== 0 && (p[4] !== 2 || p[0] > 1 || p[2] > 1);
}
function zchkClaim([p, q, r, s, e]: number[]): [Rq, Rq] {
  return ([[rq(-q, p), rq(-s, r)], [rq(q, p), rq(s, r)], [rq(-q, 1), rq(-s, 1)], [rq(q, p), rq(-s, r)]] as [Rq, Rq][])[e];
}
function zchkTruth(p: number[]) {
  const [z1, z2] = zchkClaim(p);
  const a = p[0] * p[2];
  const b = p[0] * p[3] + p[1] * p[2];
  const c = p[1] * p[3];
  const S = rq(z1[0] * z2[1] + z2[0] * z1[1], z1[1] * z2[1]);
  const Pd = rq(z1[0] * z2[0], z1[1] * z2[1]);
  const sumOk = S[0] * a === -b * S[1];
  const prodOk = Pd[0] * a === c * Pd[1];
  return sumOk ? (prodOk ? 0 : 2) : prodOk ? 1 : 3;
}
function zchkWhy(p: number[]) {
  const [z1, z2] = zchkClaim(p);
  const a = p[0] * p[2];
  const b = p[0] * p[3] + p[1] * p[2];
  const c = p[1] * p[3];
  const S = rq(z1[0] * z2[1] + z2[0] * z1[1], z1[1] * z2[1]);
  const Pd = rq(z1[0] * z2[0], z1[1] * z2[1]);
  return [`α + β = ${qText(S)} and −b/a = ${qText(rq(-b, a))}`, `αβ = ${qText(Pd)} and c/a = ${qText(rq(c, a))}`];
}
const ZCHK_TEXT = ["Both checks hold, so these can be the zeros", "Only the sum check fails, so these are not the zeros", "Only the product check fails, so these are not the zeros", "Both checks fail, so these are not the zeros"];
/** The everyday form of ajrq: temperatures and a tank's water level, in fractions of a degree or a metre. */
function rqWord(a: number, b: number, c: number, d: number, o: number) {
  const x = fr(a, b);
  const y = fr(c, d);
  if (o === 0) return `At 6 a.m. the temperature on a hill in Ooty was ${x} °C. By 9 a.m. it had changed by ${y} °C (a fall is negative). What was the temperature at 9 a.m., in °C?`;
  if (o === 1) return `A thermometer read ${x} °C at noon and ${y} °C at midnight. How many degrees warmer was it at noon than at midnight? (If it was colder at noon, the answer is negative.)`;
  if (o === 2) {
    if (a / b < 0 && c / d < 0) return `A tank's water level changes steadily by ${x} m every hour (a fall is negative). Compared with now, how much higher was the level ${-c}/${d} of an hour ago, in m? (Lower is negative.)`;
    const [rate, time] = a / b < 0 ? [x, `${c}/${d}`] : [y, `${a}/${b}`];
    return `A tank's water level changes steadily by ${rate} m every hour (a fall is negative). What is the change in the level after ${time} of an hour, in m?`;
  }
  if (c / d > 0) return `A tank's water level changed by ${x} m in ${y} of an hour, at a steady rate (a fall is negative). What was the change per hour, in m?`;
  return `A tank's water level changes steadily by ${y} m every hour (a fall is negative). How many hours from now will the level be ${x} m from its present height? (A time in the past is negative, and a level below the present height is negative.)`;
}
