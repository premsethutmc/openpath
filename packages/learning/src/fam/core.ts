/**
 * families@2, the first of each new kind: counting with a picture (Grade 1), two-digit addition with regrouping and
 * base-ten blocks (Grade 2), simplifying a surd (exact answer), solving a linear inequality (interval answer),
 * differentiating a trigonometric product (expression answer). Written by OpenPath; CC0.
 */
import type { Bug, Def } from "../family-kit";
import { evaluate, parse } from "../answer-types";

const COUNT = "MATH.number.count-objects";
const ADDR = "MATH.number.addition-regroup";
const PV = "MATH.number.place-value-tens";
const SURD = "MATH.number.radicals";
const INEQ = "MATH.algebra.inequalities";
const LIN = "MATH.algebra.linear-equations";
const DIFF = "MATH.calculus.derivative-rules";
const none = () => null;
const ITEMS = ["apples", "stars", "balls", "flowers", "birds", "leaves"];
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Sam", "Divya", "Imran"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const sqfree = (n: number): [number, number] => {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) {
    m /= p * p;
    k *= p;
  }
  return [k, m];
};
const surd = (k: number, m: number) => (m === 1 ? String(k) : `${k === 1 ? "" : k}√${m}`);
const sgn = (v: number) => (v < 0 ? `− ${-v}` : `+ ${v}`);
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
const lead = (a: number, v = "x") => (a === 1 ? v : a === -1 ? `−${v}` : `${a < 0 ? "−" : ""}${Math.abs(a)}${v}`);

export const CORE: Def[] = [
  {
    id: "cnt",
    arity: 2,
    title: "Counting objects in a picture",
    competency: COUNT,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([n, t]) => (n < 1 || n > 20 || t < 0 || t >= ITEMS.length ? "Counting up to 20 objects of a known kind." : null),
    prompt: ([n, t]) => `How many ${ITEMS[t]} are in the picture?`,
    solve: ([n]) => ({ steps: [{ id: "count", op: "count", competency: COUNT, inputs: [n], value: n }], answer: n }),
    // independent: touch each object once (count the drawn dots one by one)
    validate: ([n], v) => {
      let c = 0;
      for (let i = 0; i < n; i++) c++;
      return v === c;
    },
    bugs: ([n]) => [
      { id: "skip-one", kind: "procedural", competency: COUNT, says: "One object was missed. Touch each one as you say its number.", predict: n - 1 },
      { id: "count-twice", kind: "procedural", competency: COUNT, says: "One object was counted twice. Move each one (or tick it) once you have counted it.", predict: n + 1 },
      ...(n > 10 ? [{ id: "teen-reversal", kind: "conceptual", competency: PV, says: `The number was said the wrong way round: ${n} is 1 ten and ${n - 10} ones.`, predict: n - 10 === 1 || n === 11 ? null : (n % 10) * 10 + 1 } as Bug] : []),
    ],
    variants: () => [],
    explain: (s) => `Touch and count each one: 1, 2, 3 … ${s.value}. The last number said is how many.`,
    figure: ([n]) => ({ type: "dots", count: n, rows: n > 10 ? 2 : 1 }),
    domain: [[1, 20], [0, 5]],
    difficulty: ([n]) => (n <= 5 ? 1 : n <= 10 ? 2 : 3),
    word: ([n, t]) => `${name(n + t)} put ${n} ${ITEMS[t]} in a row, as in the picture. How many ${ITEMS[t]} are there?`,
    teach: {
      idea: "Each object gets exactly one number. The last number you say tells how many there are.",
      method: "Touch each object once as you count, starting from 1. Stop when every object has a number.",
      visual: ([n]) => ({ type: "dots", count: n, rows: n > 10 ? 2 : 1 }),
      alternatives: [
        { id: "ten_frame", title: "Fill a ten frame", kind: "conceptual", text: ["Put the objects in a ten frame: each square holds one.", "A full frame is 10; count the extra squares after 10."], visual: ([n]) => ({ type: "tenframe", filled: n, frames: n > 10 ? 2 : 1 }) },
      ],
    },
    limits: "Up to 20 objects, drawn in rows; no grouping beyond tens.",
  },
  {
    id: "addr",
    arity: 2,
    title: "Adding two-digit numbers with regrouping",
    competency: ADDR,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(\d{2})\+(\d{2})=?\??$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([a, b]) => (a < 10 || b < 10 || a > 99 || b > 99 || a + b > 99 || (a % 10) + (b % 10) < 10 ? "Two-digit sums up to 99 that need regrouping." : null),
    prompt: ([a, b]) => `${a} + ${b} = ?`,
    solve: ([a, b]) => {
      const ones = (a % 10) + (b % 10);
      const tens = Math.floor(a / 10) + Math.floor(b / 10) + 1;
      return {
        steps: [
          { id: "ones", op: "add", competency: "MATH.number.addition", inputs: [a % 10, b % 10], value: ones },
          { id: "regroup", op: "regroup", competency: PV, inputs: [ones], value: ones - 10 },
          { id: "tens", op: "add", competency: ADDR, inputs: [Math.floor(a / 10), Math.floor(b / 10), 1], value: tens },
        ],
        answer: tens * 10 + (ones - 10),
      };
    },
    // independent: count on from a, one at a time
    validate: ([a, b], v) => {
      let s = a;
      for (let i = 0; i < b; i++) s++;
      return v === s;
    },
    bugs: ([a, b]) => {
      const ones = (a % 10) + (b % 10);
      const tensNoCarry = Math.floor(a / 10) + Math.floor(b / 10);
      return [
        { id: "no-regroup", kind: "conceptual", competency: PV, says: `The ten made by the ones (${a % 10} + ${b % 10} = ${ones}) was not carried to the tens.`, predict: tensNoCarry * 10 + (ones - 10) },
        { id: "write-both-digits", kind: "conceptual", competency: PV, says: `All of ${ones} was written in the ones place; ${ones} is 1 ten and ${ones - 10} ${ones - 10 === 1 ? "one" : "ones"}.`, predict: Number(`${tensNoCarry}${ones}`) },
        { id: "fact-slip-add", kind: "recall", competency: "MATH.number.addition", says: `An addition fact (${a % 10} + ${b % 10}) is not yet reliable.`, predict: [tensNoCarry * 10 + 10 + (ones - 11), tensNoCarry * 10 + 10 + (ones - 9)].filter((x) => x !== a + b) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "ones" ? `Ones: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "regroup" ? `${s.inputs[0]} ones = 1 ten and ${s.value} ${s.value === 1 ? "one" : "ones"}: carry the ten` : `Tens: ${s.inputs[0]} + ${s.inputs[1]} + 1 carried = ${s.value} tens`),
    domain: [[10, 89], [10, 89]],
    keep: ([a, b]) => a + b <= 99 && (a % 10) + (b % 10) >= 10,
    cap: 400,
    difficulty: ([a, b]) => ((a % 10) + (b % 10) === 10 ? 1 : a + b < 70 ? 2 : 3),
    figure: ([a, b]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10) + Math.floor(b / 10), ones: (a % 10) + (b % 10), note: `${a} and ${b} together` }),
    word: ([a, b]) => `${name(a)} has ${a} marbles. ${name(b + 1)} gives ${name(a)} ${b} more. How many marbles does ${name(a)} have now?`,
    teach: {
      idea: "Ten ones make one ten. When the ones add up to 10 or more, swap ten of them for a ten.",
      method: "Add the ones first. If there are 10 or more, carry 1 ten to the tens column. Then add the tens, including the carried ten.",
      visual: ([a, b]) => ({ type: "blocks", hundreds: 0, tens: Math.floor(a / 10) + Math.floor(b / 10), ones: (a % 10) + (b % 10) }),
      alternatives: [
        { id: "make_ten", title: "Make a ten first", kind: "conceptual", text: ["Break the second number to make a ten with the first: 38 + 25 = 38 + 2 + 23 = 40 + 23.", "A round number of tens is easy to add to."], visual: ([a, b]) => ({ type: "numberline", from: a, to: a + b, jumps: [[a, Math.ceil(a / 10) * 10], [Math.ceil(a / 10) * 10, a + b]] }) },
      ],
    },
    limits: "Sums of two two-digit numbers up to 99 that need one regrouping; hundreds come later.",
  },
  {
    id: "surd",
    arity: 1,
    title: "Simplifying a square root",
    competency: SURD,
    type: "exact",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s/g, "").match(/^(?:simplify)?(?:√|sqrt)\(?(\d{1,4})\)?$/i);
      return m ? [Number(m[1])] : null;
    },
    reject: ([n]) => {
      const [k, m] = sqfree(n);
      return n < 8 || n > 600 || k === 1 || m === 1 ? "A square root that simplifies to k√m (not a perfect square), up to √600." : null;
    },
    prompt: ([n]) => `Write √${n} in its simplest form.`,
    solve: ([n]) => {
      const [k, m] = sqfree(n);
      return {
        steps: [
          { id: "split", op: "factorise", competency: "MATH.number.factors-multiples", inputs: [n, k * k, m], value: k * k * m },
          { id: "root", op: "evaluate", competency: SURD, inputs: [k * k, m], value: surd(k, m) },
        ],
        answer: surd(k, m),
      };
    },
    // independent: square the answer k√m back (k² × m) and check m has no square factor by trial
    validate: ([n], v) => {
      const m = String(v).match(/^(\d*)√(\d+)$/);
      if (!m) return false;
      const k = m[1] ? Number(m[1]) : 1;
      const r = Number(m[2]);
      for (let d = 2; d * d <= r; d++) if (r % (d * d) === 0) return false;
      return k * k * r === n;
    },
    bugs: ([n]) => {
      const [k, m] = sqfree(n);
      const out: Bug[] = [];
      // a square factor taken out but not the largest one
      for (let d = 2; d < k; d++) if (k % d === 0) {
        out.push({ id: "not-largest-square", kind: "procedural", competency: SURD, says: `A square factor was taken out, but not the largest one: √${n} still has a square factor left inside.`, predict: surd(d, (k / d) ** 2 * m) });
        break;
      }
      out.push({ id: "root-not-squared", kind: "conceptual", competency: SURD, says: `${k * k} came out of the root as ${k * k}; a square comes out as its square root (√${k * k} = ${k}).`, predict: surd(k * k, m) });
      out.push({ id: "halve-instead", kind: "conceptual", competency: SURD, says: "The number was halved; a square root asks which number times itself gives it.", predict: n % 2 === 0 ? surd(1, sqfree(n / 2)[1]) === "1" ? null : String(n / 2) : null });
      return out;
    },
    distractors: ([n]) => {
      const [k, m] = sqfree(n);
      return [surd(k + 1, m), surd(k, m + 1 === 4 ? 5 : m + 1), surd(m, k)];
    },
    variants: () => [],
    explain: (s) => (s.id === "split" ? `${s.inputs[0]} = ${s.inputs[1]} × ${s.inputs[2]}, and ${s.inputs[1]} is a perfect square` : `√${s.inputs[0]} × √${s.inputs[1]} = ${s.value}`),
    domain: [[8, 600]],
    difficulty: ([n]) => (n <= 50 ? 1 : n <= 200 ? 2 : 3),
    teach: {
      idea: "√(a × b) = √a × √b, so a perfect-square factor can come out of the root as its square root.",
      method: "Find the largest perfect square that divides the number, write the number as square × rest, and take the square root of the square outside.",
      alternatives: [
        { id: "prime_pairs", title: "Pair the prime factors", kind: "procedural", text: ["Write the number as a product of primes, e.g. 72 = 2 × 2 × 2 × 3 × 3.", "Each pair of equal primes comes out as one prime: (2)(3)√2 = 6√2."] },
      ],
    },
    limits: "Square roots of whole numbers up to 600 that are not perfect squares and have a square factor.",
  },
  {
    id: "lineq",
    arity: 3,
    title: "Solving a linear inequality",
    competency: INEQ,
    type: "interval",
    mc: true,
    // [a, b, c, ] : a x + b < c  (a ≠ 0), sign of the inequality fixed as "<"; the 4th parameter chooses the sign
    parse: none,
    reject: ([a, b, c]) => (a === 0 || Math.abs(a) > 9 || (c - b) % a !== 0 ? "ax + b < c with a whole-number answer." : null),
    prompt: ([a, b, c]) => `Solve ${lead(a)} ${sgn(b)} < ${n_(c)}. Write the answer as an inequality for x (e.g. x > 2).`,
    solve: ([a, b, c]) => {
      const r = (c - b) / a;
      return {
        steps: [
          { id: "move", op: "subtract", competency: LIN, inputs: [c, b], value: c - b },
          { id: "divide", op: "divide", competency: INEQ, inputs: [c - b, a], value: r },
        ],
        answer: a > 0 ? `x < ${n_(r)}` : `x > ${n_(r)}`,
      };
    },
    // independent: test whole numbers around the boundary in the original inequality
    validate: ([a, b, c], v) => {
      const m = String(v).replace(/−/g, "-").match(/^x ([<>]) (-?\d+)$/);
      if (!m) return false;
      const r = Number(m[2]);
      const holds = (x: number) => a * x + b < c;
      const inside = (x: number) => (m[1] === "<" ? x < r : x > r);
      for (let x = r - 6; x <= r + 6; x += 0.5) if (holds(x) !== inside(x)) return false;
      return true;
    },
    bugs: ([a, b, c]) => {
      const r = (c - b) / a;
      return [
        ...(a < 0 ? [{ id: "keep-sign-negative", kind: "conceptual", competency: INEQ, says: `Both sides were divided by ${n_(a)}, a negative number, but the inequality sign was not reversed.`, predict: `x < ${n_(r)}` } as Bug] : []),
        { id: "add-instead", kind: "procedural", competency: LIN, says: `${Math.abs(b)} was moved to the other side without changing its sign.`, predict: (c + b) % a === 0 ? (a > 0 ? `x < ${n_((c + b) / a)}` : `x > ${n_((c + b) / a)}`) : null },
        { id: "boundary-included", kind: "procedural", competency: INEQ, says: "The boundary value was included; with < it is not part of the answer.", predict: a > 0 ? `x ≤ ${n_(r)}` : `x ≥ ${n_(r)}` },
      ];
    },
    distractors: ([a, b, c]) => {
      const r = (c - b) / a;
      return [a > 0 ? `x > ${n_(r)}` : `x < ${n_(r)}`, a > 0 ? `x < ${n_(-r)}` : `x > ${n_(-r)}`];
    },
    variants: () => [],
    explain: (s) => (s.id === "move" ? (Number(s.inputs[1]) < 0 ? `Add ${-Number(s.inputs[1])} to both sides: the right side becomes ${n_(Number(s.value))}` : `Take ${s.inputs[1]} from both sides: the right side becomes ${n_(Number(s.value))}`) : Number(s.inputs[1]) < 0 ? `Divide both sides by ${n_(Number(s.inputs[1]))} and reverse the sign, because dividing by a negative number reverses an inequality: x > ${n_(Number(s.value))}` : `Divide both sides by ${s.inputs[1]}: x < ${n_(Number(s.value))}`),
    domain: [[-6, 6], [-15, 15], [-20, 20]],
    keep: ([a, b, c]) => a !== 0 && a !== 1 && b !== 0 && (c - b) % a === 0 && Math.abs((c - b) / a) <= 12,
    cap: 500,
    difficulty: ([a, b]) => (a > 0 && b > 0 ? 1 : a > 0 ? 2 : 3),
    word: ([a, b, c]) => `A number x is multiplied by ${n_(a)}, then ${b < 0 ? `${-b} is taken away` : `${b} is added`}. ${name(b)} finds that the result is less than ${n_(c)}. Which numbers x are possible? Write an inequality for x.`,
    teach: {
      idea: "An inequality stays true when you add, subtract, or multiply and divide by a POSITIVE number; dividing by a negative number flips the order, so the sign reverses.",
      method: "Get the x term alone as for an equation. When you divide by the coefficient, reverse the sign if it is negative. Check with one number from your answer.",
      alternatives: [
        { id: "test_numbers", title: "Test numbers on a number line", kind: "conceptual", text: ["Find the boundary by solving the equation ax + b = c.", "Try one number on each side in the original inequality: the side where it is true is the answer."], visual: ([a, b, c]) => ({ type: "numberline", from: (c - b) / a - 5, to: (c - b) / a + 5, marks: [(c - b) / a] }) },
      ],
    },
    limits: "ax + b < c with a whole-number boundary; ≤, ≥ and double inequalities are other families.",
  },
  {
    id: "dprod",
    arity: 4,
    title: "Differentiating k xⁿ times sin(ax) or cos(ax)",
    competency: DIFF,
    type: "expression",
    mc: true,
    // [k, n, f, a]: d/dx (k xⁿ sin(ax)) (f = 0) or (k xⁿ cos(ax)) (f = 1)
    parse: none,
    reject: ([k, n, f, a]) => (k < 1 || k > 5 || n < 1 || n > 4 || (f !== 0 && f !== 1) || a < 1 || a > 3 ? "k xⁿ sin(ax) or k xⁿ cos(ax): k up to 5, n up to 4, a up to 3." : null),
    prompt: ([k, n, f, a]) => `Differentiate y = ${term(k, n)} ${trig(f, a)} with respect to x.`,
    solve: ([k, n, f, a]) => {
      const du = term(k * n, n - 1);
      const dv = f ? `−${a === 1 ? "" : a}sin(${ax(a)})` : `${a === 1 ? "" : a}cos(${ax(a)})`;
      const ans = productAnswer(k, n, f, a);
      return {
        steps: [
          { id: "u", op: "differentiate", competency: "MLY.calc.power-derivative", inputs: [term(k, n)], value: du },
          { id: "v", op: "differentiate", competency: DIFF, inputs: [trig(f, a)], value: dv },
          { id: "product", op: "combine", competency: DIFF, inputs: [term(k, n), du], value: ans },
        ],
        answer: ans,
      };
    },
    // independent: a central difference of y, compared with the answer's value (parsed as a learner would type it)
    validate: ([k, n, f, a], v) => {
      if (typeof v !== "string") return false;
      const y = (x: number) => k * x ** n * (f ? Math.cos(a * x) : Math.sin(a * x));
      const h = 1e-5;
      try {
        const e = parse(v);
        for (const x of [0.4, 0.9, 1.3, 2.1]) {
          const num = (y(x + h) - y(x - h)) / (2 * h);
          const val = evaluate(e, { x });
          if (!Number.isFinite(val) || Math.abs(val - num) > 1e-5 * Math.max(1, Math.abs(num))) return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    bugs: ([k, n, f, a]) => {
      const du = term(k * n, n - 1);
      const dvCoef = a === 1 ? "" : String(a);
      const u = term(k, n);
      return [
        { id: "product-of-derivatives", kind: "conceptual", competency: DIFF, says: "The two derivatives were multiplied; the derivative of a product is u′v + uv′, not u′v′.", predict: f ? `−${times(du, dvCoef)}sin(${ax(a)})` : `${times(du, dvCoef)}cos(${ax(a)})` },
        { id: "one-term-only", kind: "procedural", competency: DIFF, says: "Only one part of the product rule was used; there are two terms, u′v and uv′.", predict: `${du === "1" ? "" : du + " "}${trig(f, a)}` },
        ...(a > 1 ? [{ id: "chain-forgotten", kind: "procedural", competency: DIFF, says: `The inner ${a}x was forgotten: the derivative of ${f ? "cos" : "sin"}(${a}x) has a factor ${a} (chain rule).`, predict: productAnswer(k, n, f, 1).replace(/\(x\)/g, `(${a}x)`) } as Bug] : []),
        ...(f ? [{ id: "cos-derivative-sign", kind: "recall", competency: DIFF, says: "The derivative of cos is −sin (with a minus sign).", predict: `${du === "1" ? "" : du + " "}cos(${ax(a)}) + ${times(u, dvCoef)}sin(${ax(a)})` } as Bug] : []),
      ];
    },
    distractors: ([k, n, f, a]) => [`${term(k * n, n - 1)} ${f ? "−sin" : "cos"}(${ax(a)})`, `${term(k, n + 1)} ${trig(f, a)}`],
    variants: () => [],
    explain: (s) => (s.id === "u" ? `u = ${s.inputs[0]}, so u′ = ${s.value}` : s.id === "v" ? `v = ${s.inputs[0]}, so v′ = ${s.value}` : `y′ = u′v + uv′ = ${s.value}`),
    domain: [[1, 5], [1, 4], [0, 1], [1, 3]],
    difficulty: ([, n, , a]) => (n === 1 && a === 1 ? 1 : a === 1 || n <= 2 ? 2 : 3),
    teach: {
      idea: "When y = u × v, a small change in x changes both factors: y′ = u′v + uv′. The derivative of sin(ax) is a cos(ax), and of cos(ax) is −a sin(ax).",
      method: "Name u and v, differentiate each (remember the inner factor a), then write u′v + uv′.",
      alternatives: [{ id: "table", title: "A u, v table", kind: "procedural", text: ["Write u and u′ in one row, v and v′ in the next.", "Cross-multiply: u′ times v, plus u times v′."] }],
    },
    limits: "k xⁿ sin(ax) and k xⁿ cos(ax) with small whole k, n, a; quotients and other functions are other families.",
  },
];

/** k xⁿ as printed (k = 1 and n = 1 written plainly; n = 0 gives k). */
function term(k: number, n: number): string {
  if (n === 0) return String(k);
  return `${k === 1 ? "" : k}${n === 1 ? "x" : `x^${n}`}`;
}
const ax = (a: number) => (a === 1 ? "x" : `${a}x`);
const trig = (f: number, a: number) => `${f ? "cos" : "sin"}(${ax(a)})`;
/** u written before a coefficient c: "3x^2" and "2" → "6x^2"-style text is avoided; c u is written "c·u" as "2 · 3x^2"? No: as a product the app reads. */
function times(u: string, c: string): string {
  if (!c) return u === "1" ? "" : `${u} `;
  if (u === "1") return `${c}`;
  const m = u.match(/^(\d*)(x.*)$/);
  return m ? `${Number(m[1] || 1) * Number(c)}${m[2]} ` : `${Number(u) * Number(c)}`;
}
/** k n xⁿ⁻¹ sin(ax) + k a xⁿ cos(ax), or k n xⁿ⁻¹ cos(ax) − k a xⁿ sin(ax). */
function productAnswer(k: number, n: number, f: number, a: number): string {
  const first = term(k * n, n - 1);
  const second = term(k * a, n);
  const lead1 = first === "1" ? "" : `${first} `;
  return f ? `${lead1}cos(${ax(a)}) − ${second} sin(${ax(a)})` : `${lead1}sin(${ax(a)}) + ${second} cos(${ax(a)})`;
}
