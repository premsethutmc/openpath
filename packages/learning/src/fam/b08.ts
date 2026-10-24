/**
 * families@2, batch b08: Grades 6–8 algebra (one-step equations, simplifying expressions, number pyramids,
 * generalising patterns, recursive and explicit rules, inverse proportion, equations with fractions and with the
 * variable on both sides), the coordinate plane, and geometry (angle sum, exterior angle, isosceles triangles, the
 * triangle inequality, congruent triangles, parallel lines, Baudhayana-Pythagoras, angles at a point in a tiling).
 * Written by OpenPath; CC0.
 */
import type { Bug, Def, Value, Visual } from "../family-kit";
import { evaluate, parse } from "../answer-types";
import { fmt, gcd, near, signed } from "../family-kit";

const LINI = "MATH.algebra.linear-intro";
const SIMP = "MATH.algebra.algebra-simplify";
const GEN = "MATH.algebra.generalise-with-expressions";
const SEQ = "MATH.sequences.explicit-recursive-rules";
const INV = "MATH.algebra.inverse-proportion";
const LRAT = "MATH.algebra.linear-rational";
const CART = "MATH.coordinate.cartesian";
const TRI = "MATH.geometry.triangle-properties";
const CONG = "MATH.geometry.congruence";
const PAR = "MATH.geometry.parallel-angles";
const PYTH = "MATH.geometry.pythagoras";
const TILE = "MATH.geometry.tessellations";
const VAR = "MATH.algebra.variables";
const LIN = "MATH.algebra.linear-equations";
const INTADD = "MATH.number.integer-add";
const INTS = "MATH.number.integers";
const FRADD = "MATH.number.fraction-add";
const SQRT = "MATH.number.square-roots";
const MT = "MATH.number.multiplication-tables";
const PROP = "MATH.number.proportion";
const POLY = "MATH.geometry.polygon-angles";
const ANG = "MATH.geometry.angle-measure";
const AP = "MATH.algebra.arithmetic-sequences";

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Karthik", "Fathima"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
/** A number as printed: − for minus. */
const n_ = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** A sum of terms [coefficient, letters] as written: 3x − y + 5 (zero terms left out; "0" if all are zero). */
function poly(terms: [number, string][]): string {
  let out = "";
  for (const [k, v] of terms) {
    if (k === 0) continue;
    const mag = Math.abs(k) === 1 && v ? v : `${Math.abs(k)}${v}`;
    out += out ? ` ${k < 0 ? "−" : "+"} ${mag}` : `${k < 0 ? "−" : ""}${mag}`;
  }
  return out || "0";
}
/** The prompt form of a polynomial: x^2 → x². */
const pretty = (s: string) => s.replace(/\^2/g, "²");
/** The answer v (an expression in the given letters) agrees with f at several sample points. */
function agrees(v: Value, f: (e: Record<string, number>) => number, letters: string[]): boolean {
  if (typeof v !== "string") return false;
  try {
    const e = parse(v);
    const pts = [[2, 3], [-1, 5], [7, -4], [0.5, 1.5], [11, 13]];
    for (const [s, t] of pts) {
      const env: Record<string, number> = {};
      letters.forEach((l, i) => (env[l] = i === 0 ? s : t));
      const val = evaluate(e, env);
      if (!Number.isFinite(val) || !near(val, f(env), 1e-9)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
/** The numbers in a written tuple "(3, −2, 5)". */
function nums(v: Value): number[] | null {
  if (typeof v !== "string") return null;
  const m = v.replace(/−/g, "-").replace(/\s/g, "").match(/^\((-?\d+(?:,-?\d+)*)\)$/);
  return m ? m[1].split(",").map(Number) : null;
}
const tup = (xs: number[]) => `(${xs.map(n_).join(", ")})`;
const isInt = (v: number) => Number.isInteger(v);
const keepPred = (b: Bug[]) => b.filter((x) => x.predict !== null);

// one-step equations: [form, a, t]
const oneStep = ([f, a, t]: number[]) => {
  // the equation x ∘ a = b, its answer x
  if (f === 0) return { lhs: `x + ${a}`, b: t + a, x: t, holds: (x: number) => x + a === t + a };
  if (f === 1) return { lhs: `x − ${a}`, b: t - a, x: t, holds: (x: number) => x - a === t - a };
  if (f === 2) return { lhs: `${a}x`, b: a * t, x: t, holds: (x: number) => a * x === a * t };
  return { lhs: `x ÷ ${a}`, b: t, x: a * t, holds: (x: number) => x / a === t };
};

// number pyramid with a bottom row of four blocks, x at position pos
const PYR_W = [1, 3, 3, 1];
const pyrRow = ([pos, a, b, c]: number[]) => {
  const others = [a, b, c];
  const row: (number | string)[] = [];
  let k = 0;
  for (let i = 0; i < 4; i++) row.push(i === pos ? "x" : others[k++]);
  return row;
};
const pyrConst = (p: number[], w: number[]) => pyrRow(p).reduce<number>((s, v, i) => s + (v === "x" ? 0 : (v as number) * w[i]), 0);

// recursive sequences t₁ = a, tₙ₊₁ = r·tₙ + d
const recTerms = (a: number, r: number, d: number, n = 5, plusFirst = false) => {
  const out: number[] = [];
  let t = a;
  for (let i = 0; i < n; i++) {
    out.push(t);
    t = plusFirst ? r * (t + d) : r * t + d;
  }
  return out;
};
const recRule = (r: number, d: number) => `tₙ₊₁ = ${r === 1 ? "tₙ" : `${r}tₙ`} ${d < 0 ? "−" : "+"} ${Math.abs(d)}`;

// congruent triangles
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const PAIRS: [number, number][] = [[0, 1], [1, 2], [2, 0]];
const congAngles = (s1: number, s2: number) => {
  const A = 5 * (s1 + 5);
  const B = 5 * (s2 + 5);
  return [A, B, 180 - A - B];
};
/** side of ABC between vertices i and j: AB = s1, BC = s2, CA = s3 */
const sideABC = (i: number, j: number, s: number[]) => {
  const k = [Math.min(i, j), Math.max(i, j)].join("");
  return k === "01" ? s[0] : k === "12" ? s[1] : s[2];
};

// parallel lines: the relation names
const REL = ["corresponding angle", "alternate interior angle", "co-interior angle (on the same side of the transversal, between the lines)", "vertically opposite angle", "angle that makes a linear pair with it"];
const RELSHORT = ["corresponding", "alternate interior", "co-interior", "vertically opposite", "linear pair"];

// Pythagorean triples with hypotenuse up to 100
const isSq = (n: number) => Number.isInteger(Math.sqrt(n));

// regular polygons with whole-number interior angles
const POLYNAME: Record<number, string> = { 3: "equilateral triangle", 4: "square", 5: "regular pentagon", 6: "regular hexagon", 8: "regular octagon", 9: "regular nonagon", 10: "regular decagon", 12: "regular dodecagon (12 sides)" };
const interior = (n: number) => (180 * (n - 2)) / n;
const tileList = ([n1, k1, n2, k2]: number[]) => {
  const part = (n: number, k: number) => `${k === 1 ? "one" : k} ${POLYNAME[n]}${k === 1 ? "" : n === 12 ? "s" : "s"}`.replace("dodecagon (12 sides)s", "dodecagons (12 sides)");
  return k2 ? `${part(n1, k1)} and ${part(n2, k2)}` : part(n1, k1);
};

export const B08: Def[] = [
  // ------------------------------------------------------------ Grade 6: one-step equations
  {
    id: "ahone",
    arity: 3,
    title: "Solving a one-step equation",
    competency: LINI,
    type: "integer",
    mc: true,
    // [f, a, t]: f 0 x + a = b, 1 x − a = b, 2 ax = b, 3 x ÷ a = b
    parse: none,
    reject: ([f, a, t]) => (f < 0 || f > 3 || a < 2 || a > 20 || t < 1 || t > 20 || (f >= 2 && a > 10) || (f === 1 && t <= a) ? "One-step equations with whole numbers: x + a, x − a (answer above a), ax or x ÷ a (a up to 10)." : null),
    prompt: (p) => {
      const e = oneStep(p);
      return `Find x: ${e.lhs} = ${e.b}.`;
    },
    solve: (p) => {
      const [f, a] = p;
      const e = oneStep(p);
      const op = ["subtract", "add", "divide", "multiply"][f];
      const undoing = ["add", "subtract", "multiply", "divide"][f];
      return { steps: [{ id: `undo-${op}`, op, competency: LINI, inputs: [e.b, a], value: e.x,
        justification: { rule: "equality-preservation" as const, operation: op, operand: a, lhsBefore: e.lhs, rhsBefore: String(e.b), lhsAfter: "x", rhsAfter: String(e.x) },
      }], answer: e.x };
    },
    // independent: trial — try x = 0, 1, 2 … in the equation itself until it balances
    validate: (p, v) => {
      const e = oneStep(p);
      let found = -1;
      for (let x = 0; x <= 500; x++) if (e.holds(x)) {
        found = x;
        break;
      }
      return v === found;
    },
    bugs: (p) => {
      const [f, a] = p;
      const e = oneStep(p);
      const b = e.b;
      if (f === 0) return [{ id: "same-operation", kind: "conceptual", competency: LINI, says: `${a} was added to ${b}; x + ${a} = ${b} is undone by taking ${a} away.`, predict: b + a }];
      if (f === 1) return [{ id: "same-operation", kind: "conceptual", competency: LINI, says: `${a} was taken away from ${b}; x − ${a} = ${b} is undone by adding ${a} back.`, predict: b - a >= 0 ? b - a : null }].filter((x) => x.predict !== null) as Bug[];
      if (f === 2) return [
        { id: "subtract-coefficient", kind: "conceptual", competency: VAR, says: `${a} was taken away from ${b}; ${a}x means ${a} × x, so divide by ${a}.`, predict: b - a },
        { id: "same-operation", kind: "conceptual", competency: LINI, says: `${b} was multiplied by ${a}; ${a}x = ${b} is undone by dividing by ${a}.`, predict: b * a },
      ];
      return keepPred([
        { id: "same-operation", kind: "conceptual", competency: LINI, says: `${b} was divided by ${a}; x ÷ ${a} = ${b} is undone by multiplying by ${a}.`, predict: b % a === 0 ? b / a : null },
        { id: "add-for-multiply", kind: "procedural", competency: LINI, says: `${a} was added to ${b}; undoing ÷ ${a} needs × ${a}.`, predict: b + a },
      ]);
    },
    variants: () => [],
    explain: (s) => {
      const [b, a] = s.inputs;
      return s.op === "subtract" ? `Take ${a} from both sides: x = ${b} − ${a} = ${s.value}` : s.op === "add" ? `Add ${a} to both sides: x = ${b} + ${a} = ${s.value}` : s.op === "divide" ? `Divide both sides by ${a}: x = ${b} ÷ ${a} = ${s.value}` : `Multiply both sides by ${a}: x = ${b} × ${a} = ${s.value}`;
    },
    domain: [[0, 3], [2, 20], [1, 20]],
    cap: 400,
    difficulty: ([f, a, t]) => (f <= 1 && t + a <= 20 ? 1 : f <= 1 || a * t <= 50 ? 2 : 3),
    word: (p) => {
      const [f, a] = p;
      const e = oneStep(p);
      const who = name(a + f);
      if (f === 0) return `${who} had some marbles. A friend gave ${who} ${a} more, and now ${who} has ${e.b}. How many marbles did ${who} have at first?`;
      if (f === 1) return `${who} had some money and spent ₹${a} on a pen. ₹${e.b} is left. How many rupees did ${who} have at first?`;
      if (f === 2) return `${a} boxes each hold the same number of pencils. Together they hold ${e.b} pencils. How many pencils are in each box?`;
      return `${who} shared some sweets equally among ${a} friends, and each friend got ${e.b}. How many sweets were there?`;
    },
    figure: none,
    teach: {
      idea: "An equation is a balance: both sides have the same value. Doing the opposite operation to both sides keeps it balanced and leaves x alone.",
      method: "Look at what is done to x (+, −, ×, ÷). Do the opposite to both sides. Then put your answer back into the equation to check it.",
      visual: (p) => {
        const e = oneStep(p);
        return { type: "balance", left: e.lhs, right: String(e.b) };
      },
      alternatives: [
        { id: "think_back", title: "Guess, check and improve", kind: "conceptual", text: ["Ask: which number makes the equation true? Try one, work out the left side, and compare.", "If the left side is too big, try a smaller number; too small, try a bigger one."] },
        { id: "balance", title: "Keep the balance level", kind: "conceptual", text: ["Picture the two sides on a balance.", "Whatever you take off or add on one side, do the same on the other, until x is alone."], visual: (p) => ({ type: "balance", left: oneStep(p).lhs, right: String(oneStep(p).b) }) },
      ],
    },
    limits: "One operation on x with whole numbers up to 20 (answers up to 200); two-step equations are the linear-equations families.",
  },

  // ------------------------------------------------------------ Grade 7: simplifying expressions
  {
    id: "ahlike",
    arity: 4,
    title: "Collecting like terms",
    competency: SIMP,
    type: "exact",
    mc: true,
    // [a, b, c, d]: ax + by + cx + dy
    parse: none,
    reject: ([a, b, c, d]) => (a < 1 || a > 9 || [b, c, d].some((k) => k === 0 || Math.abs(k) > 9) || a + c < 1 || b + d === 0 ? "ax + by + cx + dy with small non-zero whole numbers, a + c positive and b + d not 0." : null),
    prompt: ([a, b, c, d]) => `Simplify ${poly([[a, "x"], [b, "y"], [c, "x"], [d, "y"]])}.`,
    solve: ([a, b, c, d]) => ({
      steps: [
        { id: "x-terms", op: "add", competency: INTADD, inputs: [a, c], value: a + c },
        { id: "y-terms", op: "add", competency: INTADD, inputs: [b, d], value: b + d },
        { id: "write", op: "combine", competency: SIMP, inputs: [a + c, b + d], value: poly([[a + c, "x"], [b + d, "y"]]) },
      ],
      answer: poly([[a + c, "x"], [b + d, "y"]]),
    }),
    // independent: work out the original expression at several values of x and y
    validate: ([a, b, c, d], v) => agrees(v, ({ x, y }) => a * x + b * y + c * x + d * y, ["x", "y"]),
    bugs: ([a, b, c, d]) => {
      const s = a + b + c + d;
      const anyNeg = [b, c, d].some((k) => k < 0);
      return keepPred([
        { id: "unlike-combined", kind: "conceptual", competency: SIMP, says: "x terms and y terms were added together into one term. Only like terms (the same letter) can be added: x terms with x terms, y terms with y terms.", predict: s !== 0 ? poly([[s, "xy"]]) : null },
        { id: "squared-letters", kind: "conceptual", competency: SIMP, says: "Adding x terms was written as a power (like x + x = x²). Adding like terms only adds the numbers in front: 2x + 3x = 5x.", predict: poly([[a + c, "x^2"], [b + d, "y^2"]]) },
        { id: "sign-dropped", kind: "prerequisite", competency: INTADD, says: "A minus sign in front of a term was lost. The sign belongs to the term that follows it.", predict: anyNeg ? poly([[a + Math.abs(c), "x"], [Math.abs(b) + Math.abs(d), "y"]]) : null },
      ]);
    },
    distractors: ([a, b, c, d]) => [poly([[a + c, "x"], [b - d, "y"]]), poly([[a - c, "x"], [b + d, "y"]]), poly([[b + d, "x"], [a + c, "y"]])],
    variants: () => [],
    explain: (s) => (s.id === "x-terms" ? `x terms: ${n_(Number(s.inputs[0]))} ${signed(Number(s.inputs[1]))} = ${n_(Number(s.value))}, so ${poly([[Number(s.value), "x"]])}` : s.id === "y-terms" ? `y terms: ${n_(Number(s.inputs[0]))} ${signed(Number(s.inputs[1]))} = ${n_(Number(s.value))}, so ${poly([[Number(s.value), "y"]])}` : `Together: ${s.value}`),
    domain: [[1, 9], [-9, 9], [-9, 9], [-9, 9]],
    cap: 400,
    difficulty: ([, b, c, d]) => ([b, c, d].every((k) => k > 0) ? 1 : [b, c, d].filter((k) => k < 0).length === 1 ? 2 : 3),
    word: ([a, b, c, d]) => {
      // gains and losses of points: a negative coefficient (a wrong answer) and a negative total (points lost) both make sense
      const act = (k: number, subj: string) => (k > 0 ? `gets ${k} ${subj} question${k === 1 ? "" : "s"} right` : `gets ${-k} ${subj} question${k === -1 ? "" : "s"} wrong`);
      const who = name(a + b);
      return `In a quiz, a science question answered right gains x points and one answered wrong loses x points; a maths question gains or loses y points in the same way. In the first round ${who} ${act(a, "science")} and ${act(b, "maths")}; in the second round ${who} ${act(c, "science")} and ${act(d, "maths")}. Write a simplified expression for the total points ${who} gains (a negative total means points lost).`;
    },
    teach: {
      idea: "Like terms have the same letter part: 3x and −5x are like terms, 3x and 2y are not. Like terms can be added because they count the same thing.",
      method: "Group the x terms and the y terms, keeping each sign with the term after it. Add the numbers in front of each group and write one term for each letter.",
      alternatives: [
        { id: "objects", title: "Count things of the same kind", kind: "conceptual", text: ["Read x as 'apples' and y as 'bananas': 3 apples + 2 bananas + 4 apples is 7 apples + 2 bananas.", "You cannot add apples to bananas to get 'applebananas', just as 3x + 2y is not 5xy."] },
        { id: "check_number", title: "Check with a number", kind: "procedural", text: ["Put x = 2 and y = 1 into the question and into your answer.", "If the two values are different, a term has been combined wrongly."] },
      ],
    },
    limits: "Four terms in two letters with coefficients from −9 to 9; constants and products of letters are other families.",
  },
  {
    id: "ahsub",
    arity: 4,
    title: "Subtracting one expression from another",
    competency: SIMP,
    type: "exact",
    mc: true,
    // [a, b, c, d]: (ax + b) − (cx + d)
    parse: none,
    reject: ([a, b, c, d]) => (a < 2 || a > 12 || c < 1 || c > 12 || a === c || b === 0 || d === 0 || Math.abs(b) > 12 || Math.abs(d) > 12 || b === d ? "(ax + b) − (cx + d) with whole numbers up to 12, a ≠ c, b ≠ d and no zero constant." : null),
    prompt: ([a, b, c, d]) => `Simplify (${poly([[a, "x"], [b, ""]])}) − (${poly([[c, "x"], [d, ""]])}).`,
    solve: ([a, b, c, d]) => ({
      steps: [
        { id: "open", op: "distribute", competency: SIMP, inputs: [poly([[c, "x"], [d, ""]])], value: poly([[-c, "x"], [-d, ""]]) },
        { id: "x-terms", op: "subtract", competency: INTADD, inputs: [a, c], value: a - c },
        { id: "numbers", op: "subtract", competency: INTADD, inputs: [b, d], value: b - d },
      ],
      answer: poly([[a - c, "x"], [b - d, ""]]),
    }),
    // independent: evaluate the two brackets at several x and subtract the values
    validate: ([a, b, c, d], v) => agrees(v, ({ x }) => (a * x + b) - (c * x + d), ["x"]),
    bugs: ([a, b, c, d]) => [
      { id: "minus-first-term-only", kind: "procedural", competency: SIMP, says: `The minus sign was used on ${poly([[c, "x"]])} but not on ${n_(d)}. A minus in front of a bracket changes the sign of every term inside it.`, predict: poly([[a - c, "x"], [b + d, ""]]) },
      { id: "added-instead", kind: "procedural", competency: SIMP, says: "The two expressions were added. The question takes the second bracket away.", predict: poly([[a + c, "x"], [b + d, ""]]) },
      { id: "wrong-order", kind: "procedural", competency: INTADD, says: "The first expression was taken away from the second. The order matters: (first) − (second).", predict: poly([[c - a, "x"], [d - b, ""]]) },
    ],
    distractors: ([a, b, c, d]) => [poly([[a - c, "x"], [d - b, ""]]), poly([[a - c, "x"], [b, ""]])],
    variants: () => [],
    explain: (s) => (s.id === "open" ? `−(${s.inputs[0]}) = ${s.value}: every sign in the bracket changes` : s.id === "x-terms" ? `x terms: ${s.inputs[0]}x − ${s.inputs[1]}x = ${poly([[Number(s.value), "x"]])}` : `Numbers: ${n_(Number(s.inputs[0]))} ${signed(-Number(s.inputs[1]))} = ${n_(Number(s.value))}`),
    domain: [[2, 12], [-12, 12], [1, 12], [-12, 12]],
    cap: 400,
    difficulty: ([, b, , d]) => (b > 0 && d > 0 && b > d ? 1 : d > 0 ? 2 : 3),
    // the triangle story only when the third side, (a − c)x + (b − d), is positive for large x (a > c); otherwise a
    // profit-and-loss story, where a negative difference makes sense
    word: ([a, b, c, d]) =>
      a > c
        ? `The perimeter of a triangle is (${poly([[a, "x"], [b, ""]])}) cm. Two of its sides together measure (${poly([[c, "x"], [d, ""]])}) cm. Write a simplified expression for the third side, in cm.`
        : `A stall's profit on Saturday was ₹(${poly([[a, "x"], [b, ""]])}) and on Sunday ₹(${poly([[c, "x"], [d, ""]])}) (a negative profit is a loss). Write a simplified expression for Saturday's profit minus Sunday's profit, in rupees.`,
    teach: {
      idea: "Taking away a bracket takes away every term inside it, so each sign in the bracket changes: −(3x − 4) = −3x + 4.",
      method: "Remove the brackets, changing every sign in the second one. Then collect the x terms and the number terms.",
      alternatives: [
        { id: "add_opposite", title: "Add the opposite", kind: "procedural", text: ["Subtracting is adding the opposite: (5x + 2) − (2x − 3) = (5x + 2) + (−2x + 3).", "Now add like terms as usual."] },
        { id: "column", title: "Line up like terms", kind: "procedural", text: ["Write the first expression above the second, x terms under x terms and numbers under numbers.", "Subtract each column, taking care with negative numbers."] },
      ],
    },
    limits: "Two-term linear expressions in x with whole numbers up to 12; addition and longer expressions are folded into ahlike.",
  },
  {
    id: "ahcoef",
    arity: 5,
    title: "Coefficients and the constant term",
    competency: SIMP,
    skill: "MLY.alg.terms-coefficients",
    type: "integer",
    mc: true,
    // [p, q, r, s, ask]: px² + qxy + ry + s; ask 0 x², 1 xy, 2 y, 3 constant
    parse: none,
    reject: ([p, q, r, s, ask]) => (p < 1 || p > 9 || [q, r, s].some((k) => k === 0 || Math.abs(k) > 9) || ask < 0 || ask > 3 ? "px² + qxy + ry + s with small non-zero whole numbers." : null),
    prompt: ([p, q, r, s, ask]) => `In the expression ${pretty(poly([[p, "x^2"], [q, "xy"], [r, "y"], [s, ""]]))}, ${ask === 3 ? "what is the constant term" : `what is the coefficient of ${["x²", "xy", "y"][ask]}`}?`,
    solve: ([p, q, r, s, ask]) => {
      const v = [p, q, r, s][ask];
      return { steps: [{ id: "read", op: "identify", competency: SIMP, inputs: [["x²", "xy", "y", "constant"][ask]], value: v }], answer: v };
    },
    // independent: recover the coefficient from values of the expression (differences at x, y = 0, 1, 2)
    validate: ([p, q, r, s, ask], v) => {
      const f = (x: number, y: number) => p * x * x + q * x * y + r * y + s;
      const got = [(f(2, 0) - 2 * f(1, 0) + f(0, 0)) / 2, f(1, 1) - f(1, 0) - f(0, 1) + f(0, 0), f(0, 1) - f(0, 0), f(0, 0)][ask];
      return v === got;
    },
    bugs: ([p, q, r, s, ask]) => {
      const v = [p, q, r, s][ask];
      return keepPred([
        { id: "sign-dropped", kind: "conceptual", competency: SIMP, says: "The sign was left out. The coefficient includes the sign in front of the term: in 5 − 3y the coefficient of y is −3.", predict: v < 0 ? -v : null },
        { id: "invisible-one", kind: "conceptual", competency: SIMP, says: "A term with no number in front was given coefficient 0. A term like xy means 1 × xy, so its coefficient is 1 (or −1 with a minus sign).", predict: ask < 3 && Math.abs(v) === 1 ? 0 : null },
        { id: "power-for-coefficient", kind: "conceptual", competency: SIMP, says: "The power 2 in x² was taken as the coefficient. The coefficient is the number multiplying x², written in front of it.", predict: ask === 0 && p !== 2 ? 2 : null },
      ]);
    },
    distractors: ([p, q, r, s, ask]) => [p, q, r, s].filter((_, i) => i !== ask),
    variants: () => [],
    explain: (s) => (s.inputs[0] === "constant" ? `The constant term is the term with no letter: ${n_(Number(s.value))}` : `The number (with its sign) in front of ${s.inputs[0]} is ${n_(Number(s.value))}`),
    domain: [[1, 9], [-9, 9], [-9, 9], [-9, 9], [0, 3]],
    cap: 300,
    difficulty: ([p, q, r, s, ask]) => {
      const v = [p, q, r, s][ask];
      return v > 1 ? 1 : v === 1 || v === -1 ? 3 : 2;
    },
    teach: {
      idea: "An expression is a sum of terms. Each term is a number (the coefficient, with its sign) times letters; a term with no letter is the constant term.",
      method: "Split the expression at each + or −, keeping the sign with the term after it. The coefficient is the signed number in front of the letters; no number means 1.",
      alternatives: [
        { id: "term_table", title: "Make a table of terms", kind: "procedural", text: ["Write each term in its own column: for 4x² − xy + 3y − 9 the terms are 4x², −xy, 3y, −9.", "Under each, write its number part: 4, −1, 3 and −9."] },
      ],
    },
    limits: "Expressions with an x² term, an xy term, a y term and a constant; like-term recognition is practised in ahlike.",
  },
  {
    id: "ahpyr",
    arity: 4,
    title: "The top of a number pyramid",
    competency: SIMP,
    skill: "MLY.alg.number-pyramid",
    type: "exact",
    mc: true,
    // [pos, a, b, c]: bottom row of four blocks, x at position pos and a, b, c in the others
    parse: none,
    reject: ([pos, a, b, c]) => (pos < 0 || pos > 3 || [a, b, c].some((k) => k < 1 || k > 15) ? "A four-block bottom row with x and three whole numbers from 1 to 15." : null),
    prompt: (p) => `In a number pyramid each block is the sum of the two blocks just below it. The bottom row is ${pyrRow(p).join(", ")}. Write a simplified expression for the block at the top.`,
    solve: (p) => {
      const row = pyrRow(p);
      const second = [0, 1, 2].map((i) => `(${row[i]} + ${row[i + 1]})`);
      const ans = poly([[PYR_W[p[0]], "x"], [pyrConst(p, PYR_W), ""]]);
      return {
        steps: [
          { id: "row2", op: "add", competency: SIMP, inputs: second, value: second.join(", ") },
          { id: "top", op: "combine", competency: SIMP, inputs: [PYR_W[p[0]], pyrConst(p, PYR_W)], value: ans },
        ],
        answer: ans,
      };
    },
    // independent: build the pyramid with numbers in place of x, block by block
    validate: (p, v) =>
      agrees(v, ({ x }) => {
        let row = pyrRow(p).map((c) => (c === "x" ? x : (c as number)));
        while (row.length > 1) row = row.slice(1).map((c, i) => c + row[i]);
        return row[0];
      }, ["x"]),
    bugs: (p) => [
      { id: "bottom-row-sum", kind: "conceptual", competency: SIMP, says: "Only the bottom row was added up. Each block is used again in the rows above, so the middle blocks count more than once.", predict: poly([[1, "x"], [p[1] + p[2] + p[3], ""]]) },
      { id: "three-rows", kind: "procedural", competency: SIMP, says: "The middle blocks were counted twice, as in a pyramid with three rows. With four rows, each middle block of the bottom row reaches the top 3 times.", predict: poly([[[1, 2, 2, 1][p[0]], "x"], [pyrConst(p, [1, 2, 2, 1]), ""]]) },
      { id: "x-counted-once", kind: "procedural", competency: SIMP, says: "The x terms were not all collected: x appears in more than one block on the way up, and each one must be added.", predict: poly([[1, "x"], [pyrConst(p, PYR_W), ""]]) },
    ],
    distractors: (p) => [poly([[PYR_W[p[0]] + 1, "x"], [pyrConst(p, PYR_W), ""]]), poly([[PYR_W[p[0]], "x"], [pyrConst(p, PYR_W) + 1, ""]])],
    variants: () => [],
    explain: (s) => (s.id === "row2" ? `Second row: ${s.value}` : `Keep adding pairs to the top and collect like terms: ${s.value}`),
    figure: (p) => ({ type: "table", head: ["Row", "Blocks"], rows: [["Top", "?"], ["Third", "? ?"], ["Second", "? ? ?"], ["Bottom", pyrRow(p).join("   ")]] }),
    domain: [[0, 3], [1, 15], [1, 15], [1, 15]],
    cap: 300,
    difficulty: ([pos, a, b, c]) => (pos === 0 || pos === 3 ? (a + b + c <= 20 ? 1 : 2) : 3),
    word: (p) => `${name(p[1] + p[2])} writes number cards in a pyramid: every card is the sum of the two cards under it. The bottom row of four cards reads ${pyrRow(p).join(", ")}, where x is a hidden number. Write a simplified expression for the top card.`,
    teach: {
      idea: "In a four-row pyramid the corner blocks of the bottom row reach the top once and the two middle blocks reach it 3 times each, so the top is 1, 3, 3, 1 times the bottom blocks.",
      method: "Write the second row as sums, then the third row, then the top, collecting like terms at each step.",
      alternatives: [
        { id: "paths", title: "Count the paths to the top", kind: "conceptual", text: ["Each bottom block adds into the top once for every path upward.", "A corner block has 1 path; a middle block has 3 paths. So top = first + 3 × second + 3 × third + fourth."] },
        { id: "number_first", title: "Try a number for x", kind: "procedural", text: ["Put x = 0 and build the pyramid: that gives the number part of the answer.", "Then put x = 1: the top grows by the coefficient of x."] },
      ],
    },
    limits: "Pyramids with a four-block bottom row and one unknown; grids and calendars are not included.",
  },

  // ------------------------------------------------------------ Grades 7–8: generalising with expressions
  {
    id: "ahmatch",
    arity: 3,
    title: "An expression for a growing pattern",
    competency: GEN,
    type: "exact",
    mc: true,
    // [d, c, ctx]: Figure n uses dn + c
    parse: none,
    reject: ([d, c, ctx]) => (d < 2 || d > 9 || c < -1 || c > 9 || d + c < 1 || ctx < 0 || ctx > 1 ? "Patterns that grow by 2 to 9 each step, starting from at least 1." : null),
    prompt: ([d, c, ctx]) => {
      const t = [1, 2, 3, 4].map((n) => d * n + c);
      const thing = ctx ? "square tiles" : "matchsticks";
      return `A pattern of figures uses ${t.slice(0, 3).join(", ")} and ${t[3]} ${thing} for Figures 1, 2, 3 and 4. Each figure adds the same number of ${thing}. Write an expression for the number of ${thing} in Figure n.`;
    },
    solve: ([d, c]) => ({
      steps: [
        { id: "growth", op: "subtract", competency: AP, inputs: [2 * d + c, d + c], value: d },
        { id: "start", op: "subtract", competency: GEN, inputs: [d + c, d], value: c },
      ],
      answer: poly([[d, "n"], [c, ""]]),
    }),
    // independent: build the pattern figure by figure (repeated addition) and compare with the expression
    validate: ([d, c], v) => {
      if (typeof v !== "string") return false;
      try {
        const e = parse(v);
        let t = d + c;
        for (let n = 1; n <= 8; n++) {
          if (!near(evaluate(e, { n }), t)) return false;
          t += d;
        }
        return true;
      } catch {
        return false;
      }
    },
    bugs: ([d, c]) => keepPred([
      { id: "step-as-expression", kind: "conceptual", competency: GEN, says: `The rule 'add ${d} each time' was written as n + ${d}. Figure n has ${d} added n times, which is ${d}n, plus a fixed part.`, predict: poly([[1, "n"], [d, ""]]) },
      { id: "first-term-as-coefficient", kind: "conceptual", competency: GEN, says: `The first figure's count, ${d + c}, was used as the number multiplying n. The number that multiplies n is how many are added each time (${d}).`, predict: c !== 0 ? poly([[d + c, "n"]]) : null },
      { id: "first-term-as-constant", kind: "procedural", competency: GEN, says: `The first figure's count was added on as the fixed part. Check Figure 1: ${d} × 1 + ${d + c} is not ${d + c}.`, predict: poly([[d, "n"], [d + c, ""]]) },
      { id: "constant-forgotten", kind: "procedural", competency: GEN, says: `Only the growing part ${d}n was written. Check with Figure 1: ${d} × 1 = ${d}, but the figure has ${d + c}.`, predict: c !== 0 ? poly([[d, "n"]]) : null },
    ]),
    variants: () => [],
    explain: (s) => (s.id === "growth" ? `Each figure adds ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}, so the expression has ${s.value}n` : `Figure 1 has ${s.inputs[0]}; ${s.inputs[1]} × 1 = ${s.inputs[1]}, so add ${n_(Number(s.value))}`),
    figure: ([d, c, ctx]) => ({ type: "table", head: ["Figure", "1", "2", "3", "4", "n"], rows: [[ctx ? "Tiles" : "Matchsticks", d + c, 2 * d + c, 3 * d + c, 4 * d + c, "?"]] }),
    domain: [[2, 9], [-1, 9], [0, 1]],
    difficulty: ([d, c]) => (c === 0 || c === 1 ? 1 : c > 0 ? 2 : 3),
    word: ([d, c]) => `In a school hall, tables are joined in a row. With 1 table, ${d + c} chair${d + c === 1 ? "" : "s"} ${d + c === 1 ? "fits" : "fit"} around it; with 2 tables, ${2 * d + c}; with 3 tables, ${3 * d + c}. The number keeps growing the same way. Write an expression for the number of chairs around n tables.`,
    teach: {
      idea: "If a pattern grows by the same amount d each time, Figure n is d × n plus a fixed part. The fixed part is what makes Figure 1 come out right.",
      method: "Find how many are added each time: that number multiplies n. Then compare d × 1 with Figure 1 to find what to add or take away. Check with Figure 2.",
      alternatives: [
        { id: "zero_figure", title: "Go back to Figure 0", kind: "conceptual", text: ["Step back once from Figure 1: Figure 0 would have (Figure 1) − d.", "That is the fixed part; then add d for each figure: d n + (Figure 0)."] },
        { id: "see_groups", title: "See the groups in the picture", kind: "conceptual", text: ["In a row of squares made of matchsticks, each new square needs 3 more sticks and the first square needs one extra.", "So n squares need 3n + 1 sticks: 3 for each square, plus the first stick."] },
      ],
    },
    limits: "Linear patterns given by their first four figures; non-linear patterns and written justification are left to the educator.",
  },
  {
    id: "ahthink",
    arity: 3,
    title: "Why a 'think of a number' trick works",
    competency: GEN,
    skill: "MLY.alg.think-of-a-number",
    type: "exact",
    mc: true,
    // [a, b, c]: n → an → an + b → c(an + b) → c(an + b) − bc
    parse: none,
    reject: ([a, b, c]) => (a < 2 || a > 9 || b < 1 || b > 9 || c < 2 || c > 5 ? "Multiply by 2 to 9, add 1 to 9, multiply by 2 to 5, then take away the extra." : null),
    prompt: ([a, b, c]) => `Think of a number n. Multiply it by ${a}. Add ${b}. Multiply the result by ${c}. Then take away ${b * c}. Write a simplified expression for the final result.`,
    solve: ([a, b, c]) => ({
      steps: [
        { id: "build", op: "write", competency: GEN, inputs: [a, b, c], value: `${c}(${a}n + ${b}) − ${b * c}` },
        { id: "expand", op: "distribute", competency: SIMP, inputs: [c, a, b], value: `${a * c}n + ${b * c} − ${b * c}` },
        { id: "simplify", op: "combine", competency: SIMP, inputs: [a * c], value: `${a * c}n` },
      ],
      answer: `${a * c}n`,
    }),
    // independent: play the trick with actual numbers n = 1 … 5, step by step
    validate: ([a, b, c], v) => {
      if (typeof v !== "string") return false;
      try {
        const e = parse(v);
        for (let n = 1; n <= 5; n++) {
          let r = n;
          r *= a;
          r += b;
          r *= c;
          r -= b * c;
          if (!near(evaluate(e, { n }), r)) return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    bugs: ([a, b, c]) => [
      { id: "bracket-not-multiplied", kind: "procedural", competency: SIMP, says: `Only ${a}n was multiplied by ${c}, not the ${b} added to it. Multiplying 'the result' multiplies the whole of ${a}n + ${b}.`, predict: poly([[a * c, "n"], [b - b * c, ""]]) },
      { id: "number-not-multiplied", kind: "procedural", competency: SIMP, says: `The ${b} was multiplied by ${c} but ${a}n was not. Every term in the bracket is multiplied by ${c}.`, predict: `${a}n` },
    ],
    distractors: ([a, b, c]) => [poly([[a + c, "n"]]), poly([[a * c, "n"], [b, ""]])],
    variants: () => [],
    explain: (s) => (s.id === "build" ? `Following the steps: ${s.value}` : s.id === "expand" ? `Open the bracket: ${s.value}` : `The numbers cancel, leaving ${s.value}: the result is always ${s.inputs[0]} times the starting number`),
    domain: [[2, 9], [1, 9], [2, 5]],
    difficulty: ([a, b, c]) => (a * c <= 12 ? 1 : a * c <= 24 ? 2 : 3),
    word: ([a, b, c]) => `${name(a + b + c)} tells a friend: "Think of a number. Multiply it by ${a}, add ${b}, multiply by ${c}, then take away ${b * c}. Tell me your answer and I will tell you your number!" If the friend's number is n, write a simplified expression for the friend's answer.`,
    teach: {
      idea: "Using a letter for the number lets you follow the trick for every number at once. When the added numbers cancel, the answer depends only on n, which is why the trick always works.",
      method: "Write each step as an expression, using brackets when a whole result is multiplied. Expand the brackets and collect like terms.",
      alternatives: [
        { id: "try_numbers", title: "Try a few numbers first", kind: "conceptual", text: ["Play the trick with n = 1, 2 and 3 and write the results.", "Look for the pattern (each result is a fixed multiple of n), then show it with algebra."] },
        { id: "bags", title: "Bags and counters", kind: "conceptual", text: ["Picture n as a closed bag of counters and the numbers as loose counters.", "Follow the steps with bags and counters: the loose counters all leave at the end, so only the bags are left."] },
      ],
    },
    limits: "Four-step tricks of the form c(an + b) − bc; explaining in words why a trick works is marked by an educator.",
  },

  // ------------------------------------------------------------ Grades 7–11: explicit and recursive rules
  {
    id: "ahrec",
    arity: 3,
    title: "Terms from a recursive rule",
    competency: SEQ,
    type: "tuple",
    mc: true,
    // [a, r, d]: t₁ = a, tₙ₊₁ = r tₙ + d
    parse: none,
    reject: ([a, r, d]) => (a < 1 || a > 9 || r < 1 || r > 3 || d === 0 || d < -5 || d > 9 || recTerms(a, r, d, 6).some((t) => t < 1 || t > 1500) ? "t₁ from 1 to 9, multiplier 1 to 3, a non-zero step from −5 to 9, with all terms positive." : null),
    prompt: ([a, r, d]) => `A sequence has t₁ = ${a} and ${recRule(r, d)}. Write the first five terms as (t₁, t₂, t₃, t₄, t₅).`,
    solve: ([a, r, d]) => {
      const t = recTerms(a, r, d);
      return { steps: t.slice(1).map((v, i) => ({ id: `t${i + 2}`, op: r === 1 ? "add" : "multiply-add", competency: SEQ, inputs: [t[i], r, d], value: v })), answer: tup(t) };
    },
    // independent: the closed form of each term, tₙ = rⁿ⁻¹a + d(rⁿ⁻¹ − 1)/(r − 1) (or a + (n − 1)d when r = 1)
    validate: ([a, r, d], v) => {
      const xs = nums(v);
      if (!xs || xs.length !== 5) return false;
      return xs.every((x, i) => x === (r === 1 ? a + i * d : r ** i * a + (d * (r ** i - 1)) / (r - 1)));
    },
    bugs: ([a, r, d]) => keepPred([
      { id: "add-before-multiply", kind: "procedural", competency: SEQ, says: `${d < 0 ? `${-d} was taken away` : `${d} was added`} before multiplying by ${r}. The rule multiplies the term first, then ${d < 0 ? "takes away" : "adds"}.`, predict: r > 1 ? tup(recTerms(a, r, d, 5, true)) : null },
      { id: "started-late", kind: "procedural", competency: SEQ, says: `The list started at t₂. The first term is t₁ = ${a} itself; the rule makes the terms after it.`, predict: tup(recTerms(a, r, d, 6).slice(1)) },
      { id: "sign-dropped", kind: "prerequisite", competency: INTADD, says: `The minus sign in the rule was lost: tₙ₊₁ = … − ${-d} takes ${-d} away.`, predict: d < 0 ? tup(recTerms(a, r, -d)) : null },
      { id: "multiplier-ignored", kind: "procedural", competency: SEQ, says: `Only the ${d < 0 ? "subtraction" : "addition"} was used. Each new term is ${r} times the last one, then ${d < 0 ? "minus" : "plus"} ${Math.abs(d)}.`, predict: r > 1 ? tup(recTerms(a, 1, d)) : null },
    ]),
    distractors: ([a, r, d]) => [tup(recTerms(a, r, d + 1)), tup(recTerms(a + 1, r, d))],
    variants: () => [],
    explain: (s) => {
      const [t, r, d] = s.inputs.map(Number);
      return `Term ${s.id.slice(1)}: ${r === 1 ? t : `${r} × ${t}`} ${d < 0 ? "−" : "+"} ${Math.abs(d)} = ${s.value}`;
    },
    domain: [[1, 9], [1, 3], [-5, 9]],
    difficulty: ([, r, d]) => (r === 1 && d > 0 ? 1 : r === 1 || r === 2 ? 2 : 3),
    word: ([a, r, d]) => `A savings game: ${name(a + r)} starts with ₹${a} in a box. Each week the money in the box is ${r === 1 ? "kept" : r === 2 ? "doubled by a parent" : "tripled by a parent"}, and then ${d > 0 ? `₹${d} is added` : `₹${-d} is taken out`}. Write the amounts for the first five weeks, starting with ₹${a}, as (week 1, week 2, week 3, week 4, week 5).`,
    teach: {
      idea: "A recursive rule tells you how to get each term from the one before it; the first term starts the chain.",
      method: "Write t₁. Put it into the rule to get t₂, put t₂ in to get t₃, and so on. Do the operations in the order the rule gives.",
      alternatives: [
        { id: "table", title: "A table of n and tₙ", kind: "procedural", text: ["Make two columns: n = 1, 2, 3, 4, 5 and tₙ.", "Fill each row from the row above using the rule, showing the working."] },
        { id: "machine", title: "A number machine", kind: "conceptual", text: ["Think of the rule as a machine: a term goes in, the next term comes out.", "Feed each output back in as the next input."] },
      ],
    },
    limits: "Rules tₙ₊₁ = r tₙ + d with r from 1 to 3; two-term recursions are ahfib, explicit formulas ahnth.",
  },
  {
    id: "ahnth",
    arity: 2,
    title: "From a recursive rule to a formula for tₙ",
    competency: SEQ,
    skill: "MLY.seq.recursive-to-explicit",
    type: "exact",
    mc: true,
    // [a, d]: t₁ = a, tₙ₊₁ = tₙ + d → tₙ = dn + (a − d)
    parse: none,
    reject: ([a, d]) => (a < -9 || a > 20 || d === 0 || d < -6 || d > 9 || a === d ? "t₁ from −9 to 20 and a non-zero step from −6 to 9, not equal to t₁." : null),
    prompt: ([a, d]) => `A sequence has t₁ = ${n_(a)} and ${recRule(1, d)}. Write a formula for tₙ in terms of n.`,
    solve: ([a, d]) => ({
      steps: [
        { id: "jumps", op: "multiply", competency: AP, inputs: [d], value: poly([[d, "n"], [-d, ""]]) },
        { id: "formula", op: "add", competency: SEQ, inputs: [a], value: poly([[d, "n"], [a - d, ""]]) },
      ],
      answer: poly([[d, "n"], [a - d, ""]]),
    }),
    // independent: generate the terms from the rule and compare with the formula at n = 1 … 8
    validate: ([a, d], v) => {
      if (typeof v !== "string") return false;
      try {
        const e = parse(v);
        let t = a;
        for (let n = 1; n <= 8; n++) {
          if (!near(evaluate(e, { n }), t)) return false;
          t += d;
        }
        return true;
      } catch {
        return false;
      }
    },
    bugs: ([a, d]) => [
      { id: "one-jump-too-many", kind: "procedural", competency: AP, says: `t₁ = ${n_(a)} was used as the fixed part. To reach tₙ from t₁ there are n − 1 jumps of ${n_(d)}, not n.`, predict: poly([[d, "n"], [a, ""]]) },
      { id: "step-added-to-n", kind: "conceptual", competency: SEQ, says: `The rule was copied with n in place of tₙ. Each step adds ${n_(d)}, so n steps add ${n_(d)} × n.`, predict: poly([[1, "n"], [d, ""]]) },
      { id: "swapped", kind: "procedural", competency: SEQ, says: "The first term and the step were swapped. The number multiplying n is the step (what is added each time).", predict: poly([[a, "n"], [d, ""]]) },
    ],
    distractors: ([a, d]) => [poly([[d, "n"], [a + d, ""]]), poly([[-d, "n"], [a - d, ""]])],
    variants: () => [],
    explain: (s) => (s.id === "jumps" ? `From t₁ to tₙ there are n − 1 steps of ${n_(Number(s.inputs[0]))}: ${s.value}` : `Add t₁ = ${n_(Number(s.inputs[0]))}: tₙ = ${s.value}`),
    domain: [[-9, 20], [-6, 9]],
    cap: 300,
    difficulty: ([a, d]) => (a > 0 && d > 0 ? 1 : d > 0 ? 2 : 3),
    teach: {
      idea: "Adding d each time means tₙ is the first term plus (n − 1) steps of d: tₙ = t₁ + (n − 1)d.",
      method: "Write t₁ + (n − 1)d with the numbers, open the bracket and collect the numbers. Check that n = 1 gives t₁ and n = 2 gives t₂.",
      alternatives: [
        { id: "zeroth", title: "Find term number 0", kind: "conceptual", text: ["Step back once from t₁: t₀ = t₁ − d.", "Then tₙ = dn + t₀, since n steps of d take you from t₀ to tₙ."] },
      ],
    },
    limits: "Arithmetic rules tₙ₊₁ = tₙ + d; geometric and other rules are not converted here.",
  },
  {
    id: "ahfib",
    arity: 3,
    title: "A Virahanka-Fibonacci style sequence",
    competency: SEQ,
    skill: "MLY.seq.virahanka",
    type: "integer",
    mc: true,
    // [a, b, k]: t₁ = a, t₂ = b, tₙ = tₙ₋₁ + tₙ₋₂; term k
    parse: none,
    reject: ([a, b, k]) => (a < 1 || a > 9 || b < 1 || b > 9 || k < 5 || k > 10 ? "Two starting numbers from 1 to 9; terms 5 to 10." : null),
    prompt: ([a, b, k]) => `A sequence begins ${a}, ${b}, and every term after that is the sum of the two terms just before it. What is term number ${k}?`,
    solve: ([a, b, k]) => {
      const t = [a, b];
      while (t.length < k) t.push(t[t.length - 1] + t[t.length - 2]);
      return { steps: t.slice(2).map((v, i) => ({ id: `t${i + 3}`, op: "add", competency: SEQ, inputs: [t[i], t[i + 1]], value: v })), answer: t[k - 1] };
    },
    // independent: term k = F(k−2)·a + F(k−1)·b, from the Fibonacci numbers F(0) = 0, F(1) = 1 counted separately
    validate: ([a, b, k], v) => {
      const F = [0, 1];
      for (let i = 2; i <= k; i++) F.push(F[i - 1] + F[i - 2]);
      return v === F[k - 2] * a + F[k - 1] * b;
    },
    bugs: ([a, b, k]) => {
      const t = [a, b];
      while (t.length < k + 1) t.push(t[t.length - 1] + t[t.length - 2]);
      return keepPred([
        { id: "off-by-one", kind: "procedural", competency: SEQ, says: "The terms were miscounted by one. Number each term as you write it: term 1 is the first number given.", predict: [t[k - 2], t[k]] },
        { id: "arithmetic", kind: "conceptual", competency: SEQ, says: `The sequence was treated as adding ${b - a} each time. Here each term is the sum of the two before it, so the jumps grow.`, predict: b !== a && a + (k - 1) * (b - a) > 0 ? a + (k - 1) * (b - a) : null },
      ]);
    },
    variants: () => [],
    explain: (s) => `${s.id.replace("t", "Term ")}: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`,
    domain: [[1, 9], [1, 9], [5, 10]],
    cap: 300,
    difficulty: ([, , k]) => (k <= 6 ? 1 : k <= 8 ? 2 : 3),
    word: ([a, b, k]) => `A plant has ${a} ${a === 1 ? "leaf" : "leaves"} in week 1 and ${b} in week 2. After that, the number of leaves each week is the sum of the numbers in the two weeks before. How many leaves does it have in week ${k}?`,
    teach: {
      idea: "Each new term is made from the two terms before it, so you must keep the last two terms in view as you go.",
      method: "Write the terms in a numbered row: add the last two to get the next, until you reach the term you need.",
      alternatives: [
        { id: "rhythms", title: "Virahanka's rhythms", kind: "conceptual", text: ["Virahanka counted rhythms made of short (1 beat) and long (2 beat) syllables: 1, 2, 3, 5, 8 … rhythms for 1, 2, 3, 4, 5 beats.", "A rhythm of n beats ends in a short syllable (after n − 1 beats) or a long one (after n − 2 beats), so the counts add."] },
        { id: "numbered", title: "Number every term", kind: "procedural", text: ["Write 1, 2, 3 … above the terms as you go, so you stop at the right term.", "Check each sum before moving on."] },
      ],
    },
    limits: "Two-term recursions with small starting values up to term 10; counting rhythms directly is not asked.",
  },

  // ------------------------------------------------------------ Grade 8: inverse proportion
  {
    id: "ahinv",
    arity: 3,
    title: "An inverse proportion",
    competency: INV,
    type: "integer",
    mc: true,
    // [a, d, b]: a workers take d days; b workers take ad/b days
    parse: none,
    reject: ([a, d, b]) => (a < 2 || a > 12 || d < 2 || d > 30 || b < 2 || b > 15 || a === b || (a * d) % b !== 0 || a * d / b > 60 ? "a and b from 2 to 15 (different), d up to 30, with a whole-number answer up to 60." : null),
    prompt: ([a, d, b]) => `x and y are in inverse proportion. When x = ${a}, y = ${d}. What is y when x = ${b}?`,
    solve: ([a, d, b]) => ({ steps: [{ id: "product", op: "multiply", competency: INV, inputs: [a, d], value: a * d }, { id: "share", op: "divide", competency: INV, inputs: [a * d, b], value: (a * d) / b }], answer: (a * d) / b }),
    // independent: count worker-days — b workers finish b worker-days each day, until a·d worker-days are done
    validate: ([a, d, b], v) => {
      let total = 0;
      for (let i = 0; i < a; i++) total += d;
      let done = 0;
      let days = 0;
      while (done < total) {
        done += b;
        days++;
      }
      return done === total && v === days;
    },
    bugs: ([a, d, b]) => keepPred([
      { id: "direct-for-inverse", kind: "conceptual", competency: INV, says: `y was scaled the same way as x, as in a direct proportion. Here more of x means less of y: the product x × y stays ${a * d}.`, predict: (d * b) % a === 0 ? (d * b) / a : null },
      { id: "additive", kind: "conceptual", competency: INV, says: `The change in x was taken off y. In an inverse proportion the product stays the same, not the sum.`, predict: d - (b - a) > 0 ? d - (b - a) : null },
      { id: "not-divided", kind: "procedural", competency: INV, says: `The product ${a} × ${d} = ${a * d} is right, but it must then be shared by ${b}.`, predict: a * d },
    ]),
    variants: () => [],
    explain: (s) => (s.id === "product" ? `x × y stays the same: ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}` : `y = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[2, 12], [2, 30], [2, 15]],
    cap: 400,
    difficulty: ([a, d, b]) => (b === 2 * a || a === 2 * b ? 1 : a * d <= 60 ? 2 : 3),
    word: ([a, d, b]) => `${a} workers can paint a school building in ${d} days. Working at the same rate, how many days would ${b} workers take?`,
    teach: {
      idea: "In an inverse proportion, when one quantity is multiplied by some number the other is divided by it, so their product never changes (workers × days = the total work).",
      method: "Multiply the two given values to get the fixed product, then divide it by the new value.",
      alternatives: [
        { id: "unitary", title: "Go through one worker", kind: "procedural", text: ["If a workers take d days, 1 worker takes a × d days (one person does all the work).", "Then b workers share it: (a × d) ÷ b days."] },
        { id: "ratio", title: "Invert the ratio", kind: "conceptual", text: ["If x becomes twice as big, y becomes half as big.", "So y(new) = y(old) × x(old) ÷ x(new)."] },
      ],
    },
    limits: "Whole-number inverse proportions with answers up to 60; compound variation is not included.",
  },
  {
    id: "ahwork",
    arity: 2,
    title: "Time taken working together",
    competency: INV,
    skill: "MLY.prop.time-and-work",
    type: "fraction",
    mc: true,
    // [p, q]: p days alone, q days alone → pq/(p + q) together
    parse: none,
    reject: ([p, q]) => (p < 2 || q > 20 || p >= q ? "Two different times from 2 to 20 days, the first shorter." : null),
    prompt: ([p, q]) => `${name(p)} can finish a job alone in ${p} days, and ${name(q + 3) === name(p) ? name(q + 4) : name(q + 3)} can finish it alone in ${q} days. Working together at the same rates, how many days will they take? (A fraction is fine.)`,
    solve: ([p, q]) => ({
      steps: [
        { id: "rates", op: "add", competency: FRADD, inputs: [`1/${p}`, `1/${q}`], value: fmt((p + q) / (p * q)) },
        { id: "flip", op: "divide", competency: INV, inputs: [1, fmt((p + q) / (p * q))], value: (p * q) / (p + q) },
      ],
      answer: (p * q) / (p + q),
    }),
    // independent: in the answer's time, the two together must do exactly one whole job: t/p + t/q = 1, cross-multiplied
    validate: ([p, q], v) => typeof v === "number" && v > 0 && near(v * q + v * p, p * q),
    bugs: ([p, q]) => [
      { id: "add-times", kind: "conceptual", competency: INV, says: "The two times were added. Working together is faster than either one alone, so the answer must be less than both times.", predict: p + q },
      { id: "average", kind: "conceptual", competency: INV, says: "The average of the two times was taken. Two people together finish sooner than either one alone.", predict: (p + q) / 2 },
      { id: "rate-not-flipped", kind: "procedural", competency: INV, says: `The work per day, 1/${p} + 1/${q}, was given as the answer. That is the part of the job done in one day; the days needed is 1 divided by it.`, predict: (p + q) / (p * q) },
    ],
    variants: () => [],
    explain: (s) => (s.id === "rates" ? `Part of the job done in one day together: ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `Days for the whole job: 1 ÷ ${s.inputs[1]} = ${fmt(Number(s.value))}`),
    domain: [[2, 19], [3, 20]],
    difficulty: ([p, q]) => (q % p === 0 ? 1 : (p * q) % (p + q) === 0 ? 2 : 3),
    word: ([p, q]) => `One tap fills a water tank in ${p} hours and another tap fills it in ${q} hours. If both taps are opened together, how many hours will it take to fill the tank? (A fraction is fine.)`,
    teach: {
      idea: "Think of the work done in one day: a person who takes p days does 1/p of the job each day. Working together, the parts done per day add up.",
      method: "Add 1/p and 1/q to get the part of the job done in one day together; the number of days is 1 divided by that fraction.",
      alternatives: [
        { id: "units", title: "Count units of work", kind: "procedural", text: ["Pretend the job is p × q units of work (for example, bricks).", "One person lays q units a day, the other p units a day; together p + q a day, so the job takes pq ÷ (p + q) days."] },
      ],
    },
    limits: "Two workers with whole-number times up to 20 days; three workers and leaving part-way are not included.",
  },

  // ------------------------------------------------------------ Grade 8: equations with rational coefficients
  {
    id: "ahfrac",
    arity: 4,
    title: "An equation with fractions of x",
    competency: LRAT,
    type: "integer",
    mc: true,
    // [a, b, k, s]: x/a ± x/b = c with x = k·lcm(a, b)
    parse: none,
    reject: ([a, b, k, s]) => {
      const l = (a * b) / gcd(a, b);
      return a < 2 || b > 9 || a >= b || k < 1 || k > 6 || (s !== 0 && s !== 1) || k * l > 144 || b % a === 0 ? "x/a + x/b or x/a − x/b with 2 ≤ a < b ≤ 9 (b not a multiple of a) and a whole-number answer up to 144." : null;
    },
    prompt: ([a, b, k, s]) => {
      const x = (k * a * b) / gcd(a, b);
      return `Solve x/${a} ${s ? "−" : "+"} x/${b} = ${s ? x / a - x / b : x / a + x / b}. What is x?`;
    },
    solve: ([a, b, k, s]) => {
      const l = (a * b) / gcd(a, b);
      const x = k * l;
      const c = s ? x / a - x / b : x / a + x / b;
      const m = s ? l / a - l / b : l / a + l / b;
      return {
        steps: [
          { id: "lcd", op: "multiply", competency: FRADD, inputs: [l, c], value: l * c },
          { id: "collect", op: "combine", competency: LRAT, inputs: [l / a, l / b], value: m },
          { id: "divide", op: "divide", competency: LIN, inputs: [l * c, m], value: x },
        ],
        answer: x,
      };
    },
    // independent: substitute back, with both sides multiplied by a·b (no fractions): v·b ± v·a = c·a·b
    validate: ([a, b, k, s], v) => {
      const x = (k * a * b) / gcd(a, b);
      const c = s ? x / a - x / b : x / a + x / b;
      return typeof v === "number" && Number.isInteger(v) && (s ? v * b - v * a : v * b + v * a) === c * a * b;
    },
    bugs: ([a, b, k, s]) => {
      const x = (k * a * b) / gcd(a, b);
      const c = s ? x / a - x / b : x / a + x / b;
      const m = s ? b - a : a + b;
      return keepPred([
        { id: "denominators-combined", kind: "conceptual", competency: FRADD, says: `x/${a} ${s ? "−" : "+"} x/${b} was written as x/${m}, ${s ? "subtracting" : "adding"} the bottom numbers. Fractions with different denominators are first written with a common denominator.`, predict: c * m },
        { id: "lcd-one-side", kind: "procedural", competency: LRAT, says: `The left side was multiplied by ${a * b} but the right side (${c}) was not. Multiply every term on both sides by the same number.`, predict: c % m === 0 ? c / m : null },
        { id: "one-fraction-only", kind: "procedural", competency: LRAT, says: `Only x/${a} was used, as if x/${a} = ${c}. Both fractions of x are part of the left side.`, predict: a * c },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "lcd" ? `Multiply every term by ${s.inputs[0]}: the right side becomes ${s.value}` : s.id === "collect" ? `The left side becomes ${s.inputs[0]}x ${Number(s.value) < Number(s.inputs[0]) ? "−" : "+"} ${s.inputs[1]}x = ${s.value}x` : `x = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[2, 8], [3, 9], [1, 6], [0, 1]],
    difficulty: ([a, b, , s]) => (gcd(a, b) === 1 && a * b <= 12 && !s ? 1 : s ? 3 : 2),
    word: ([a, b, k, s]) => {
      const x = (k * a * b) / gcd(a, b);
      return s
        ? `In a school, 1/${a} of the students in Class 8 walk to school and 1/${b} come by bus. ${x / a - x / b} more students walk than come by bus. How many students are in Class 8?`
        : `${name(a + b)} spent 1/${a} of the money in a purse on books and 1/${b} of it on a school bag. Together these cost ₹${x / a + x / b}. How many rupees were in the purse?`;
    },
    teach: {
      idea: "Multiplying every term on both sides by the same number keeps an equation true; choosing the least common multiple of the denominators clears all the fractions.",
      method: "Find the LCM of the denominators, multiply every term by it, collect the x terms, then divide.",
      alternatives: [
        { id: "common_denominator", title: "Combine the fractions first", kind: "procedural", text: ["Write both fractions over a common denominator: x/3 + x/4 = 4x/12 + 3x/12 = 7x/12.", "Then 7x/12 = c gives x = 12c ÷ 7."] },
        { id: "parts", title: "Think in equal parts", kind: "conceptual", text: ["If the whole is cut into (LCM) equal parts, x/a is LCM ÷ a of them and x/b is LCM ÷ b of them.", "Find how many parts the right side is, and how big one part is."] },
      ],
    },
    limits: "Two fractions of x on one side with whole-number answers; brackets with fractions and variables on both sides are ahboth.",
  },
  {
    id: "ahboth",
    arity: 4,
    title: "An equation with x on both sides",
    competency: LRAT,
    skill: "MLY.alg.variable-both-sides",
    type: "fraction",
    mc: true,
    // [a, b, c, d]: ax + b = cx + d
    parse: none,
    reject: ([a, b, c, d]) => (a < 2 || a > 9 || c === 0 || c < -5 || c > 8 || a === c || b === 0 || d === 0 || Math.abs(b) > 15 || Math.abs(d) > 15 || b === d ? "ax + b = cx + d with a from 2 to 9, c from −5 to 8 (not 0 or a) and different non-zero numbers b, d up to 15." : null),
    prompt: ([a, b, c, d]) => `Solve ${poly([[a, "x"], [b, ""]])} = ${poly([[c, "x"], [d, ""]])}. (A fraction is fine.)`,
    solve: ([a, b, c, d]) => ({
      steps: [
        { id: "x-left", op: "subtract", competency: LRAT, inputs: [a, c], value: a - c },
        { id: "numbers-right", op: "subtract", competency: INTADD, inputs: [d, b], value: d - b },
        { id: "divide", op: "divide", competency: LIN, inputs: [d - b, a - c], value: (d - b) / (a - c) },
      ],
      answer: (d - b) / (a - c),
    }),
    // independent: substitute the answer into both sides and compare
    validate: ([a, b, c, d], v) => typeof v === "number" && near(a * v + b, c * v + d, 1e-12),
    bugs: ([a, b, c, d]) => keepPred([
      { id: "x-sign-kept", kind: "procedural", competency: LRAT, says: `${poly([[c, "x"]])} was moved to the left side without changing its sign. Taking ${poly([[c, "x"]])} from both sides leaves ${poly([[a - c, "x"]])} on the left.`, predict: a + c !== 0 ? (d - b) / (a + c) : null },
      { id: "number-sign-kept", kind: "procedural", competency: LRAT, says: `${n_(b)} was moved to the right side without changing its sign. To remove ${b < 0 ? `− ${-b}` : `+ ${b}`} from the left, ${b < 0 ? "add" : "take away"} ${Math.abs(b)} on both sides.`, predict: (d + b) / (a - c) },
      { id: "wrong-way-round", kind: "procedural", competency: INTADD, says: "The numbers were subtracted the wrong way round, giving the right size with the wrong sign. Check by putting the answer back into both sides.", predict: (b - d) / (a - c) },
    ]),
    variants: () => [],
    explain: (s) => (s.id === "x-left" ? `Take ${poly([[Number(s.inputs[1]), "x"]])} from both sides: ${poly([[Number(s.value), "x"]])} on the left` : s.id === "numbers-right" ? (Number(s.inputs[1]) < 0 ? `Add ${-Number(s.inputs[1])} to both sides: ${n_(Number(s.inputs[0]))} + ${-Number(s.inputs[1])} = ${n_(Number(s.value))} on the right` : `Take ${s.inputs[1]} from both sides: ${n_(Number(s.inputs[0]))} − ${s.inputs[1]} = ${n_(Number(s.value))} on the right`) : `x = ${n_(Number(s.inputs[0]))} ÷ ${n_(Number(s.inputs[1]))} = ${fmt(Number(s.value)).replace(/^-/, "−")}`),
    domain: [[2, 9], [-15, 15], [-5, 8], [-15, 15]],
    cap: 400,
    difficulty: ([a, b, c, d]) => ((d - b) % (a - c) === 0 && c > 0 ? 1 : (d - b) % (a - c) === 0 ? 2 : 3),
    word: ([a, b, c, d]) => {
      const step = (k: number, m: number) => `multiplies a number by ${n_(k)} and then ${m > 0 ? `adds ${m}` : `takes away ${-m}`}`;
      return `Machine A ${step(a, b)}. Machine B ${step(c, d)}. ${name(a + d)} puts the same number into both machines and gets the same output. What number was put in? (A fraction is fine.)`;
    },
    teach: {
      idea: "An equation stays balanced when the same thing is added to or taken from both sides, including a number of x's.",
      method: "Take the smaller x term from both sides so x is on one side only, move the numbers to the other side, then divide by the coefficient of x. Check by substituting.",
      alternatives: [
        { id: "balance", title: "Remove x's from both pans", kind: "conceptual", text: ["Picture x-bags and counters on a balance.", "Take the same number of bags off both pans, then the same number of counters, until one bag is balanced by counters."], visual: ([a, b, c, d]) => ({ type: "balance", left: poly([[a, "x"], [b, ""]]), right: poly([[c, "x"], [d, ""]]) }) },
      ],
    },
    limits: "Whole-number coefficients with a rational answer; equations with fractions of x are ahfrac.",
  },

  // ------------------------------------------------------------ Grade 8: the coordinate plane
  {
    id: "ahread",
    arity: 2,
    title: "Reading the coordinates of a point",
    competency: CART,
    type: "tuple",
    mc: true,
    // [x, y]
    parse: none,
    reject: ([x, y]) => (Math.abs(x) > 6 || Math.abs(y) > 6 || (x === 0 && y === 0) ? "A point other than the origin with coordinates from −6 to 6." : null),
    prompt: () => "What are the coordinates of point A in the picture? Write them as (x, y).",
    solve: ([x, y]) => ({ steps: [{ id: "across", op: "count", competency: CART, inputs: [x], value: x }, { id: "up", op: "count", competency: CART, inputs: [y], value: y }], answer: tup([x, y]) }),
    // independent: walk from the origin one grid square at a time — along the x-axis first, then parallel to the y-axis
    validate: ([x, y], v) => {
      const got = nums(v);
      if (!got || got.length !== 2) return false;
      let cx = 0;
      let cy = 0;
      while (cx !== x) cx += Math.sign(x - cx);
      while (cy !== y) cy += Math.sign(y - cy);
      return got[0] === cx && got[1] === cy;
    },
    bugs: ([x, y]) => keepPred([
      { id: "swapped", kind: "conceptual", competency: CART, says: "The coordinates were written the wrong way round. The x-coordinate (across) comes first, then the y-coordinate (up or down).", predict: x !== y ? tup([y, x]) : null },
      { id: "sign-dropped", kind: "conceptual", competency: INTS, says: "A coordinate left of the y-axis or below the x-axis is negative; the minus sign was left out.", predict: x < 0 || y < 0 ? tup([Math.abs(x), Math.abs(y)]) : null },
    ]),
    distractors: ([x, y]) => [tup([-x, y]), tup([x, -y]), tup([-y, -x])],
    variants: () => [],
    explain: (s) => (s.id === "across" ? `From the origin, go ${Math.abs(Number(s.value))} ${Number(s.value) < 0 ? "left" : "right"}: x = ${n_(Number(s.value))}` : `Then ${Math.abs(Number(s.value))} ${Number(s.value) < 0 ? "down" : "up"}: y = ${n_(Number(s.value))}`),
    figure: ([x, y]) => ({ type: "plane", points: [[x, y, "A"]], range: 6 }),
    domain: [[-6, 6], [-6, 6]],
    difficulty: ([x, y]) => (x > 0 && y > 0 ? 1 : x === 0 || y === 0 || x < 0 !== y < 0 ? 2 : 3),
    word: () => "A school map is drawn on a grid with the main gate at the origin. The library is marked A, as in the picture. What are the coordinates of the library? Write them as (x, y).",
    teach: {
      idea: "A point's coordinates say how to reach it from the origin: first across (x), then up or down (y). Left and down are negative.",
      method: "Start at the origin. Count squares across to the point's line: that is x (negative if left). Then count up or down: that is y. Write (x, y).",
      alternatives: [
        { id: "corridor_stairs", title: "Along the corridor, then up the stairs", kind: "conceptual", text: ["You walk along the corridor (x) before you climb the stairs (y).", "So the across number always comes first."] },
        { id: "drop_lines", title: "Drop lines to the axes", kind: "procedural", text: ["From the point, imagine a line straight down (or up) to the x-axis: where it meets is x.", "And a line straight across to the y-axis: where it meets is y."] },
      ],
    },
    limits: "Whole-number points from −6 to 6 on a square grid; choosing a scale and drawing graphs are marked by an educator.",
  },
  {
    id: "ahquad",
    arity: 2,
    title: "Which quadrant a point is in",
    competency: CART,
    skill: "MLY.coord.quadrants",
    type: "integer",
    mc: true,
    // [x, y], both non-zero
    parse: none,
    reject: ([x, y]) => (x === 0 || y === 0 || Math.abs(x) > 9 || Math.abs(y) > 9 ? "A point off the axes with coordinates from −9 to 9." : null),
    prompt: ([x, y]) => `In which quadrant does the point (${n_(x)}, ${n_(y)}) lie? Write 1, 2, 3 or 4 for quadrant I, II, III or IV.`,
    solve: ([x, y]) => {
      const q = x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
      return { steps: [{ id: "signs", op: "compare", competency: CART, inputs: [x > 0 ? "+" : "−", y > 0 ? "+" : "−"], value: q }], answer: q };
    },
    // independent: the direction of the point from the origin (its angle, measured anticlockwise from the positive x-axis)
    validate: ([x, y], v) => {
      const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      return v === Math.floor(deg / 90) + 1;
    },
    bugs: ([x, y]) => {
      const q = x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
      return keepPred([
        { id: "clockwise", kind: "recall", competency: CART, says: "The quadrants were numbered clockwise. They go anticlockwise from the top right: I (+, +), II (−, +), III (−, −), IV (+, −).", predict: q === 2 ? 4 : q === 4 ? 2 : null },
      ]);
    },
    distractors: () => [1, 2, 3, 4],
    variants: () => [],
    explain: (s) => `x is ${s.inputs[0] === "+" ? "positive (right)" : "negative (left)"} and y is ${s.inputs[1] === "+" ? "positive (up)" : "negative (down)"}: quadrant ${["I", "II", "III", "IV"][Number(s.value) - 1]}`,
    domain: [[-9, 9], [-9, 9]],
    cap: 300,
    difficulty: ([x, y]) => (x > 0 && y > 0 ? 1 : x < 0 && y < 0 ? 2 : 3),
    word: ([x, y]) => `On a town map, the bus stand is at the origin and each square is 1 km. A temple is at (${n_(x)}, ${n_(y)}). In which quadrant of the map is the temple? Write 1, 2, 3 or 4 for quadrant I, II, III or IV.`,
    teach: {
      idea: "The two axes cut the plane into four quadrants, numbered anticlockwise from the top right. The signs of x and y tell which one a point is in.",
      method: "Look at the sign of x (right +, left −) and of y (up +, down −). (+, +) is I, (−, +) is II, (−, −) is III, (+, −) is IV.",
      alternatives: [
        { id: "sketch", title: "Sketch it", kind: "procedural", text: ["Draw two crossing lines and mark I, II, III, IV anticlockwise starting top right.", "Move right or left for x, up or down for y, and see where you land."], visual: ([x, y]) => ({ type: "plane", points: [[Math.max(-6, Math.min(6, x)), Math.max(-6, Math.min(6, y)), "P"]], range: 6 }) },
      ],
    },
    limits: "Points off the axes; points on an axis are read in ahread.",
  },
  {
    id: "ahmove",
    arity: 4,
    title: "Moving on a grid",
    competency: CART,
    skill: "MLY.coord.translate",
    type: "tuple",
    mc: true,
    // [x, y, dx, dy]
    parse: none,
    reject: ([x, y, dx, dy]) => (Math.abs(x) > 5 || Math.abs(y) > 5 || dx === 0 || dy === 0 || Math.abs(dx) > 6 || Math.abs(dy) > 6 ? "Start from −5 to 5; move 1 to 6 squares across and 1 to 6 up or down." : null),
    prompt: ([x, y, dx, dy]) => `Start at the point (${n_(x)}, ${n_(y)}). Move ${Math.abs(dx)} ${Math.abs(dx) === 1 ? "unit" : "units"} to the ${dx > 0 ? "right" : "left"}, then ${Math.abs(dy)} ${Math.abs(dy) === 1 ? "unit" : "units"} ${dy > 0 ? "up" : "down"}. Which point do you reach? Write it as (x, y).`,
    solve: ([x, y, dx, dy]) => ({ steps: [{ id: "x", op: "add", competency: INTADD, inputs: [x, dx], value: x + dx }, { id: "y", op: "add", competency: INTADD, inputs: [y, dy], value: y + dy }], answer: tup([x + dx, y + dy]) }),
    // independent: take the moves one square at a time
    validate: ([x, y, dx, dy], v) => {
      const got = nums(v);
      if (!got || got.length !== 2) return false;
      let [cx, cy] = [x, y];
      for (let i = 0; i < Math.abs(dx); i++) cx += dx > 0 ? 1 : -1;
      for (let i = 0; i < Math.abs(dy); i++) cy += dy > 0 ? 1 : -1;
      return got[0] === cx && got[1] === cy;
    },
    bugs: ([x, y, dx, dy]) => keepPred([
      { id: "axes-swapped", kind: "conceptual", competency: CART, says: "The left–right move was added to y and the up–down move to x. Moving right or left changes x; moving up or down changes y.", predict: dx !== dy ? tup([x + dy, y + dx]) : null },
      { id: "direction-ignored", kind: "prerequisite", competency: INTADD, says: "A move left or down was added. Moving left or down makes the coordinate smaller.", predict: dx < 0 || dy < 0 ? tup([x + Math.abs(dx), y + Math.abs(dy)]) : null },
    ]),
    distractors: ([x, y, dx, dy]) => [tup([x - dx, y - dy]), tup([x + dx, y - dy]), tup([x - dx, y + dy])],
    variants: () => [],
    explain: (s) => `${s.id === "x" ? "x" : "y"}: ${n_(Number(s.inputs[0]))} ${Number(s.inputs[1]) < 0 ? "−" : "+"} ${Math.abs(Number(s.inputs[1]))} = ${n_(Number(s.value))}`,
    domain: [[-5, 5], [-5, 5], [-6, 6], [-6, 6]],
    cap: 300,
    difficulty: ([x, y, dx, dy]) => (dx > 0 && dy > 0 && x >= 0 && y >= 0 ? 1 : x + dx < 0 || y + dy < 0 ? 3 : 2),
    word: ([x, y, dx, dy]) => `A robot on a classroom floor grid starts at (${n_(x)}, ${n_(y)}). It moves ${Math.abs(dx)} ${Math.abs(dx) === 1 ? "square" : "squares"} ${dx > 0 ? "right (towards positive x)" : "left (towards negative x)"} and then ${Math.abs(dy)} ${Math.abs(dy) === 1 ? "square" : "squares"} ${dy > 0 ? "forward (towards positive y)" : "back (towards negative y)"}. Where does it stop? Write the point as (x, y).`,
    teach: {
      idea: "Moving right or left changes only the x-coordinate; moving up or down changes only the y-coordinate. Right and up add; left and down take away.",
      method: "Add the across move to x (subtract for left). Add the up move to y (subtract for down). Write the new (x, y).",
      alternatives: [
        { id: "plot", title: "Plot the start and walk", kind: "procedural", text: ["Mark the starting point on a grid.", "Count the squares across, then up or down, and read off the point where you stop."], visual: ([x, y, dx, dy]) => ({ type: "plane", points: [[x, y, "start"], [x + dx, y + dy, "end"]], segments: [[[x, y], [x + dx, y]], [[x + dx, y], [x + dx, y + dy]]], range: Math.max(6, Math.abs(x + dx), Math.abs(y + dy)) }) },
      ],
    },
    limits: "One move across then one up or down, with whole numbers; reflections and other transformations are not included.",
  },

  // ------------------------------------------------------------ Grade 6–7: triangle properties
  {
    id: "ahtri",
    arity: 2,
    title: "The third angle of a triangle",
    competency: TRI,
    type: "integer",
    mc: true,
    // [a, b]: two angles
    parse: none,
    reject: ([a, b]) => (a < 15 || b < 15 || a > 150 || b > 150 || a + b > 165 ? "Two angles of at least 15° with a sum of at most 165°." : null),
    prompt: ([a, b]) => `Two angles of a triangle are ${a}° and ${b}°, as in the picture (not to scale). What is the third angle, in degrees?`,
    solve: ([a, b]) => ({ steps: [{ id: "known", op: "add", competency: ANG, inputs: [a, b], value: a + b }, { id: "rest", op: "subtract", competency: TRI, inputs: [180, a + b], value: 180 - a - b }], answer: 180 - a - b }),
    // independent: count on from a + b to 180 one degree at a time
    validate: ([a, b], v) => {
      let c = 0;
      for (let s = a + b; s < 180; s++) c++;
      return v === c;
    },
    bugs: ([a, b]) => keepPred([
      { id: "used-360", kind: "recall", competency: TRI, says: "The angles were taken from 360°. The three angles of a triangle add up to 180°; 360° is the sum around a point or in a quadrilateral.", predict: 360 - a - b },
      { id: "added", kind: "procedural", competency: TRI, says: "The two angles were added, but the third angle is what is left over from 180° after them.", predict: a + b < 180 ? a + b : null },
      { id: "one-angle-only", kind: "procedural", competency: TRI, says: "Only one of the two angles was taken from 180°. Both known angles must be taken away.", predict: [180 - a, 180 - b] },
    ]),
    variants: () => [],
    explain: (s) => (s.id === "known" ? `The two angles together: ${s.inputs[0]}° + ${s.inputs[1]}° = ${s.value}°` : `Third angle: 180° − ${s.inputs[1]}° = ${s.value}°`),
    figure: ([a, b]) => ({ type: "triangle", angles: [`${a}°`, `${b}°`, "?"] }),
    domain: [[15, 150], [15, 150]],
    cap: 400,
    difficulty: ([a, b]) => (a % 10 === 0 && b % 10 === 0 ? 1 : a % 5 === 0 && b % 5 === 0 ? 2 : 3),
    word: ([a, b]) => `A triangular garden has two corners measuring ${a}° and ${b}°. What is the angle at the third corner, in degrees?`,
    teach: {
      idea: "The three angles of any triangle add up to 180°: tear off the corners and they fit together on a straight line.",
      method: "Add the two angles you know, then take the sum from 180°.",
      alternatives: [
        { id: "tear_corners", title: "Tear off the corners", kind: "conceptual", text: ["Cut out a paper triangle, tear off its three corners and place them side by side.", "They make a straight line, which is 180°."], visual: ([a, b]) => ({ type: "triangle", angles: [`${a}°`, `${b}°`, `${180 - a - b}°`] }) },
        { id: "count_on", title: "Count on to 180", kind: "procedural", text: ["Start from the sum of the two angles and count up to 180 in easy jumps (to the next ten, then tens).", "The total of the jumps is the third angle."] },
      ],
    },
    limits: "Whole-degree angles; deciding whether three given angles can form a triangle is part of the teaching, not a separate question.",
  },
  {
    id: "ahext",
    arity: 3,
    title: "The exterior angle of a triangle",
    competency: TRI,
    skill: "MLY.geo.exterior-angle",
    type: "integer",
    mc: true,
    // [a, b, f]: interior opposite angles a, b; f 0 find the exterior angle, 1 given exterior a + b and a, find b
    parse: none,
    reject: ([a, b, f]) => (a < 20 || b < 20 || a > 120 || b > 120 || a + b > 160 || (f !== 0 && f !== 1) || (f === 1 && a === b) ? "Interior opposite angles from 20° to 120° with a sum of at most 160°." : null),
    prompt: ([a, b, f]) => (f === 0 ? `One side of a triangle is extended. The two interior angles opposite the exterior angle are ${a}° and ${b}°. What is the exterior angle, in degrees?` : `One side of a triangle is extended. The exterior angle is ${a + b}° and one of the two interior opposite angles is ${a}°. What is the other interior opposite angle, in degrees?`),
    solve: ([a, b, f]) => (f === 0 ? { steps: [{ id: "sum", op: "add", competency: TRI, inputs: [a, b], value: a + b }], answer: a + b } : { steps: [{ id: "diff", op: "subtract", competency: TRI, inputs: [a + b, a], value: b }], answer: b }),
    // independent: use the angle sum and the straight line — the third interior angle and the exterior angle make 180°
    validate: ([a, b, f], v) => {
      if (typeof v !== "number") return false;
      if (f === 0) return v + (180 - a - b) === 180;
      const ext = a + b;
      const third = 180 - ext;
      return a + v + third === 180;
    },
    bugs: ([a, b, f]) => keepPred(f === 0
      ? [
          { id: "third-interior", kind: "conceptual", competency: TRI, says: "The third interior angle was found instead. The exterior angle sits outside, next to that angle, on the straight line.", predict: 180 - a - b },
          { id: "one-angle", kind: "procedural", competency: TRI, says: "Only one of the opposite angles was used. The exterior angle equals the sum of both interior opposite angles.", predict: [180 - a, 180 - b] },
        ]
      : [
          { id: "exterior-as-interior", kind: "conceptual", competency: TRI, says: `The exterior angle was used as if it were inside the triangle (180° − ${a + b}° − ${a}°). The exterior angle equals the two opposite interior angles together.`, predict: 180 - (a + b) - a > 0 ? 180 - (a + b) - a : null },
          { id: "added", kind: "procedural", competency: TRI, says: "The two angles were added. The exterior angle is the sum, so the missing part is the difference.", predict: 2 * a + b },
          { id: "adjacent-interior", kind: "conceptual", competency: TRI, says: "The interior angle next to the exterior angle was found (180° − exterior). The question asks for the other opposite angle.", predict: 180 - (a + b) },
        ]),
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `Exterior angle = sum of the interior opposite angles: ${s.inputs[0]}° + ${s.inputs[1]}° = ${s.value}°` : `Other opposite angle = exterior − known: ${s.inputs[0]}° − ${s.inputs[1]}° = ${s.value}°`),
    domain: [[20, 120], [20, 120], [0, 1]],
    cap: 400,
    difficulty: ([a, b, f]) => (f === 0 && a % 10 === 0 && b % 10 === 0 ? 1 : f === 0 ? 2 : 3),
    word: ([a, b, f]) => (f === 0 ? `A triangular plot has corners A, B and C. The fence along BC is continued past C. The angles at A and B are ${a}° and ${b}°. What angle does the continued fence make with side AC, in degrees?` : `A triangular plot has corners A, B and C. The fence along BC is continued past C, making an angle of ${a + b}° with side AC. The angle at A is ${a}°. What is the angle at B, in degrees?`),
    teach: {
      idea: "An exterior angle and the interior angle next to it make a straight line (180°), and the three interior angles also make 180°, so the exterior angle equals the two far interior angles together.",
      method: "To find the exterior angle, add the two interior opposite angles. To find one of those, subtract the other from the exterior angle.",
      alternatives: [
        { id: "via_third", title: "Go through the third angle", kind: "procedural", text: ["Find the third interior angle with the angle sum (180° minus the other two).", "The exterior angle is 180° minus that third angle, because they lie on a straight line."] },
      ],
    },
    limits: "Whole-degree angles; an exterior angle given with the adjacent interior angle is the straight-line fact, not asked here.",
  },
  {
    id: "ahiso",
    arity: 2,
    title: "Angles of an isosceles triangle",
    competency: TRI,
    skill: "MLY.geo.isosceles-angles",
    type: "integer",
    mc: true,
    // [v, f]: f 0 vertex angle v → base angle; f 1 base angle v → vertex angle
    parse: none,
    reject: ([v, f]) => (f === 0 ? (v < 20 || v > 160 || v % 2 !== 0 ? "An even vertex angle from 20° to 160°." : null) : f === 1 ? (v < 20 || v > 85 ? "A base angle from 20° to 85°." : null) : "Only the two forms."),
    prompt: ([v, f]) => (f === 0 ? `In an isosceles triangle the angle between the two equal sides is ${v}°. What is each of the other two angles, in degrees?` : `In an isosceles triangle each of the two equal angles (opposite the equal sides) is ${v}°. What is the third angle, in degrees?`),
    solve: ([v, f]) => (f === 0 ? { steps: [{ id: "rest", op: "subtract", competency: TRI, inputs: [180, v], value: 180 - v }, { id: "half", op: "divide", competency: TRI, inputs: [180 - v, 2], value: (180 - v) / 2 }], answer: (180 - v) / 2 } : { steps: [{ id: "double", op: "multiply", competency: TRI, inputs: [v, 2], value: 2 * v }, { id: "rest", op: "subtract", competency: TRI, inputs: [180, 2 * v], value: 180 - 2 * v }], answer: 180 - 2 * v }),
    // independent: check that the three angles (with the two equal ones) add to 180°
    validate: ([v, f], u) => typeof u === "number" && u > 0 && (f === 0 ? v + u + u === 180 : u + v + v === 180),
    bugs: ([v, f]) => keepPred(f === 0
      ? [
          { id: "not-halved", kind: "procedural", competency: TRI, says: `180° − ${v}° = ${180 - v}° is shared by the two equal angles, so each one is half of it.`, predict: 180 - v },
          { id: "all-equal", kind: "conceptual", competency: TRI, says: "All three angles were taken to be equal. In an isosceles triangle only the two angles opposite the equal sides are equal.", predict: v },
        ]
      : [
          { id: "one-base-angle", kind: "procedural", competency: TRI, says: `Only one ${v}° angle was taken from 180°. There are two equal angles of ${v}°.`, predict: 180 - v },
          { id: "halved", kind: "procedural", competency: TRI, says: "The remaining angle was halved, but here only one angle (the third) is missing.", predict: (180 - v) % 2 === 0 ? (180 - v) / 2 : null },
        ]),
    variants: () => [],
    explain: (s) => (s.id === "half" ? `The two equal angles share ${s.inputs[0]}°: each is ${s.value}°` : s.id === "double" ? `The two equal angles: 2 × ${s.inputs[0]}° = ${s.value}°` : `180° − ${s.inputs[1]}° = ${s.value}°`),
    figure: ([v, f]) => ({ type: "triangle", angles: f === 0 ? ["?", "?", `${v}°`] : [`${v}°`, `${v}°`, "?"] }),
    domain: [[20, 160], [0, 1]],
    difficulty: ([v, f]) => (f === 1 ? (v % 10 === 0 ? 1 : 2) : v % 4 === 0 ? 2 : 3),
    word: ([v, f]) => (f === 0 ? `The roof of a hut is shaped like an isosceles triangle. The angle at the top, between the two equal sloping sides, is ${v}°. What angle does each sloping side make with the base, in degrees?` : `The roof of a hut is shaped like an isosceles triangle. Each sloping side makes an angle of ${v}° with the base. What is the angle at the top, in degrees?`),
    teach: {
      idea: "In an isosceles triangle the angles opposite the two equal sides are equal; with the angle sum of 180°, one angle tells you the other two.",
      method: "Vertex angle known: take it from 180° and halve. Base angle known: double it and take that from 180°.",
      alternatives: [
        { id: "fold", title: "Fold it in half", kind: "conceptual", text: ["Fold an isosceles triangle along the line from the top to the middle of the base: the two halves match.", "So the two base angles are the same size."], visual: ([v, f]) => ({ type: "triangle", angles: f === 0 ? [`${(180 - v) / 2}°`, `${(180 - v) / 2}°`, `${v}°`] : [`${v}°`, `${v}°`, `${180 - 2 * v}°`] }) },
      ],
    },
    limits: "Whole-degree angles; equilateral triangles (all 60°) are mentioned in teaching only.",
  },
  {
    id: "ahineq",
    arity: 3,
    title: "How long can the third side be?",
    competency: TRI,
    skill: "MLY.geo.triangle-inequality",
    type: "integer",
    mc: true,
    // [a, b, f]: sides a ≤ b; f 0 longest whole third side, 1 shortest
    parse: none,
    reject: ([a, b, f]) => (a < 2 || b > 20 || a > b || (f !== 0 && f !== 1) ? "Two sides from 2 to 20 cm, the first not longer." : null),
    prompt: ([a, b, f]) => `Two sides of a triangle are ${a} cm and ${b} cm. The third side is a whole number of centimetres. What is the ${f ? "shortest" : "longest"} it can be, in cm?`,
    solve: ([a, b, f]) => (f === 0 ? { steps: [{ id: "sum", op: "add", competency: TRI, inputs: [a, b], value: a + b }, { id: "below", op: "subtract", competency: TRI, inputs: [a + b, 1], value: a + b - 1 }], answer: a + b - 1 } : { steps: [{ id: "diff", op: "subtract", competency: TRI, inputs: [b, a], value: b - a }, { id: "above", op: "add", competency: TRI, inputs: [b - a, 1], value: b - a + 1 }], answer: b - a + 1 }),
    // independent: try every whole length and keep those that pass all three triangle-inequality tests
    validate: ([a, b, f], v) => {
      const ok: number[] = [];
      for (let c = 1; c <= 60; c++) if (a + b > c && a + c > b && b + c > a) ok.push(c);
      return v === (f ? ok[0] : ok[ok.length - 1]);
    },
    bugs: ([a, b, f]) => keepPred(f === 0
      ? [
          { id: "equal-allowed", kind: "conceptual", competency: TRI, says: `A third side of ${a + b} cm was allowed. If it equals ${a} + ${b}, the two sides lie flat along it and there is no triangle: it must be shorter.`, predict: a + b },
          { id: "longest-given", kind: "conceptual", competency: TRI, says: `The third side was thought not to be longer than ${b} cm. It can be longer, as long as it is less than ${a} + ${b}.`, predict: a === b ? null : b },
        ]
      : [
          { id: "equal-allowed", kind: "conceptual", competency: TRI, says: `A third side of ${b - a} cm was allowed. Then ${a} + ${b - a} = ${b}, and the sides would lie flat: it must be longer than ${b - a}.`, predict: b - a >= 1 ? b - a : null },
          { id: "any-length", kind: "conceptual", competency: TRI, says: `It was thought any length will do. The two shorter sides together must be longer than the longest side, so the third side must be more than ${b} − ${a}.`, predict: b - a + 1 === 1 ? null : 1 },
        ]),
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `The third side must be less than ${s.inputs[0]} + ${s.inputs[1]} = ${s.value} cm` : s.id === "below" ? `The longest whole number below ${s.inputs[0]} is ${s.value}` : s.id === "diff" ? `The third side must be more than ${s.inputs[0]} − ${s.inputs[1]} = ${s.value} cm` : `The shortest whole number above ${s.inputs[0]} is ${s.value}`),
    domain: [[2, 20], [2, 20], [0, 1]],
    cap: 380,
    difficulty: ([a, b, f]) => (f === 0 ? (a + b <= 15 ? 1 : 2) : a === b ? 3 : 2),
    word: ([a, b, f]) => `${name(a + b)} has two sticks, ${a} cm and ${b} cm long, and wants a third stick (a whole number of cm) to make a triangle with them. What is the ${f ? "shortest" : "longest"} third stick that works, in cm?`,
    teach: {
      idea: "In a triangle, any two sides together are longer than the third. So the third side is less than the sum of the other two and more than their difference.",
      method: "Longest: one less than the sum of the two sides. Shortest: one more than their difference (for whole numbers).",
      alternatives: [
        { id: "sticks", title: "Try it with sticks", kind: "conceptual", text: ["Hold two sticks at a hinge. Open them wide: the gap grows but never reaches their total length.", "Close them up: the gap shrinks but never reaches their difference."] },
      ],
    },
    limits: "Whole-number lengths up to 20 cm; constructing the triangle with instruments is marked by an educator.",
  },

  // ------------------------------------------------------------ Grade 7: congruent triangles
  {
    id: "ahcong",
    arity: 6,
    title: "Corresponding parts of congruent triangles",
    competency: CONG,
    type: "integer",
    mc: true,
    // [perm, f, ask, s1, s2, s3]: ΔABC ≅ Δ(PQR permuted); f 0 a side, 1 an angle
    parse: none,
    reject: ([perm, f, ask, s1, s2, s3]) => {
      if (perm < 1 || perm > 5 || (f !== 0 && f !== 1) || ask < 0 || ask > 2 || [s1, s2, s3].some((s) => s < 3 || s > 11)) return "A non-trivial matching and sides from 3 to 11.";
      if (f === 0) return new Set([s1, s2, s3]).size < 3 || s1 + s2 <= s3 || s2 + s3 <= s1 || s1 + s3 <= s2 ? "Three different sides that make a triangle." : null;
      const [A, B, C] = congAngles(s1, s2);
      return s3 !== 3 || C < 20 || new Set([A, B, C]).size < 3 ? "Three different angles of at least 20°." : null;
    },
    prompt: ([perm, f, ask, s1, s2, s3]) => {
      const nm = PERMS[perm].map((i) => "PQR"[i]).join("");
      if (f === 0) return `In triangle ABC, AB = ${s1} cm, BC = ${s2} cm and CA = ${s3} cm. Triangle ABC ≅ triangle ${nm}. What is the length of ${PAIRS[ask].map((i) => "PQR"[i]).join("")}, in cm?`;
      const [A, B, C] = congAngles(s1, s2);
      return `In triangle ABC, ∠A = ${A}°, ∠B = ${B}° and ∠C = ${C}°. Triangle ABC ≅ triangle ${nm}. What is ∠${"PQR"[ask]}, in degrees?`;
    },
    solve: ([perm, f, ask, s1, s2, s3]) => {
      const pm = PERMS[perm];
      const back = (letter: number) => pm.indexOf(letter);
      if (f === 0) {
        const [i, j] = PAIRS[ask].map(back);
        const v = sideABC(i, j, [s1, s2, s3]);
        return { steps: [{ id: "match", op: "match", competency: CONG, inputs: [PAIRS[ask].map((k) => "PQR"[k]).join(""), [i, j].map((k) => "ABC"[k]).join("")], value: v }], answer: v };
      }
      const i = back(ask);
      const v = congAngles(s1, s2)[i];
      return { steps: [{ id: "match", op: "match", competency: CONG, inputs: ["PQR"[ask], "ABC"[i]], value: v }], answer: v };
    },
    // independent: read the two names letter by letter into a table of matching sides (or angles), then look up the asked part
    validate: ([perm, f, ask, s1, s2, s3], v) => {
      const first = "ABC";
      const second = PERMS[perm].map((i) => "PQR"[i]).join("");
      if (f === 0) {
        const len: Record<string, number> = { AB: s1, BA: s1, BC: s2, CB: s2, CA: s3, AC: s3 };
        const table: Record<string, number> = {};
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) table[second[i] + second[j]] = len[first[i] + first[j]];
        return v === table[PAIRS[ask].map((k) => "PQR"[k]).join("")];
      }
      const [A, B] = [5 * (s1 + 5), 5 * (s2 + 5)];
      const ang: Record<string, number> = { A, B, C: 180 - A - B };
      const table: Record<string, number> = {};
      for (let i = 0; i < 3; i++) table[second[i]] = ang[first[i]];
      return v === table["PQR"[ask]];
    },
    bugs: ([perm, f, ask, s1, s2, s3]) => {
      const pos = f === 0 ? sideABC(PAIRS[ask][0], PAIRS[ask][1], [s1, s2, s3]) : congAngles(s1, s2)[ask];
      return [{ id: "alphabetical-match", kind: "conceptual", competency: CONG, says: "P, Q, R were matched with A, B, C in alphabetical order. The order of the letters in the congruence statement shows the matching: the first letters match, the second letters match, and the third letters match.", predict: pos }];
    },
    distractors: ([, f, , s1, s2, s3]) => (f === 0 ? [s1, s2, s3] : congAngles(s1, s2)),
    variants: () => [],
    explain: (s) => `In the statement, ${s.inputs[0]} sits in the same places as ${s.inputs[1]}, so ${s.inputs[0]} = ${s.inputs[1]} = ${s.value}${String(s.inputs[0]).length === 1 ? "°" : " cm"}`,
    domain: [[1, 5], [0, 1], [0, 2], [3, 11], [3, 11], [3, 11]],
    cap: 400,
    difficulty: ([perm, f]) => (perm <= 2 ? 1 : f === 0 ? 2 : 3),
    word: ([perm, f, ask, s1, s2, s3]) => {
      const nm = PERMS[perm].map((i) => "PQR"[i]).join("");
      if (f === 0) return `Two triangular metal plates are exactly the same shape and size: plate ABC ≅ plate ${nm}. On plate ABC, AB = ${s1} cm, BC = ${s2} cm and CA = ${s3} cm. How long is edge ${PAIRS[ask].map((i) => "PQR"[i]).join("")} of the other plate, in cm?`;
      const [A, B, C] = congAngles(s1, s2);
      return `Two triangular metal plates are exactly the same shape and size: plate ABC ≅ plate ${nm}. Plate ABC has corner angles ∠A = ${A}°, ∠B = ${B}° and ∠C = ${C}°. What is the angle at corner ${"PQR"[ask]} of the other plate, in degrees?`;
    },
    teach: {
      idea: "When ΔABC ≅ ΔXYZ, the letters are written in matching order: A goes with X, B with Y, C with Z. Matching parts are equal.",
      method: "Write the two names one above the other. Find the asked letters in the second name, read the letters above them in the first name, and use that side or angle.",
      alternatives: [
        { id: "stack", title: "Stack the names", kind: "procedural", text: ["Write A B C on one line and the second triangle's name under it.", "Each column is a matching pair of vertices; a side is two columns."] },
        { id: "trace", title: "Trace and place", kind: "conceptual", text: ["Imagine tracing triangle ABC and placing the tracing exactly on the other triangle.", "Each vertex lands on its matching vertex, so matching sides lie on top of each other."] },
      ],
    },
    limits: "Reading corresponding sides and angles from a congruence statement; choosing SSS/SAS/ASA/RHS and writing proofs are marked by an educator.",
  },

  // ------------------------------------------------------------ Grade 7: angles and parallel lines
  {
    id: "ahpar",
    arity: 2,
    title: "Angles made by a transversal with parallel lines",
    competency: PAR,
    type: "integer",
    mc: true,
    // [a, rel]: an interior angle of a°, find its rel-related angle
    parse: none,
    reject: ([a, rel]) => (a < 30 || a > 150 || a === 90 || rel < 0 || rel > 4 ? "An interior angle from 30° to 150° (not 90°) and one of five angle relations." : null),
    prompt: ([a, rel]) => `Two parallel lines are cut by a transversal. One of the angles between the parallel lines is ${a}°. What is the size of its ${REL[rel]}, in degrees?`,
    solve: ([a, rel]) => {
      const v = rel === 2 || rel === 4 ? 180 - a : a;
      return { steps: [{ id: RELSHORT[rel].replace(/ /g, "-"), op: v === a ? "equal" : "supplement", competency: PAR, inputs: [a], value: v }], answer: v };
    },
    // independent: a model of the eight angles. With the transversal at θ to the lines, each crossing has angles
    // θ (top right, bottom left) and 180 − θ (top left, bottom right); the given angle is the upper crossing's bottom right.
    validate: ([a, rel], v) => {
      const theta = 180 - a;
      const at = (pos: string) => (pos === "TR" || pos === "BL" ? theta : 180 - theta);
      const target = [["lower", "BR"], ["lower", "TL"], ["lower", "TR"], ["upper", "TL"], ["upper", "BL"]][rel][1];
      return at("BR") === a && v === at(target);
    },
    bugs: ([a, rel]) => (rel === 2 || rel === 4
      ? [{ id: "equal-for-supplementary", kind: "conceptual", competency: PAR, says: `The ${RELSHORT[rel]} angle was taken to be equal. ${rel === 2 ? "Co-interior angles" : "Angles in a linear pair"} add up to 180°.`, predict: a }]
      : [{ id: "supplementary-for-equal", kind: "conceptual", competency: PAR, says: `The ${RELSHORT[rel]} angle was taken from 180°. With parallel lines, ${RELSHORT[rel]} angles are equal.`, predict: 180 - a }]),
    variants: () => [],
    explain: (s) => (s.op === "equal" ? `${s.id.replace(/-/g, " ")} angles are equal: ${s.value}°` : `${s.id.replace(/-/g, " ")} angles add to 180°: 180° − ${s.inputs[0]}° = ${s.value}°`),
    domain: [[30, 150], [0, 4]],
    cap: 400,
    difficulty: ([a, rel]) => (rel === 3 || rel === 4 ? 1 : rel === 0 ? 2 : 3),
    word: ([a, rel]) => `Two straight railway lines run parallel, and a straight road crosses both. One of the angles between the road and a rail, on the inside between the rails, is ${a}°. What is the size of its ${REL[rel]}, in degrees?`,
    teach: {
      idea: "A transversal crosses parallel lines at the same slant, so the angles at the two crossings repeat: corresponding and alternate angles are equal, and co-interior angles add to 180°.",
      method: "Decide whether the two angles are the same 'shape' (equal: corresponding, alternate, vertically opposite) or together make a straight line (add to 180°: co-interior, linear pair).",
      alternatives: [
        { id: "letters", title: "F, Z and C shapes", kind: "procedural", text: ["Corresponding angles sit in an F shape, alternate angles in a Z shape: they are equal.", "Co-interior angles sit inside a C (or U) shape: they add up to 180°."] },
        { id: "slide", title: "Slide one crossing onto the other", kind: "conceptual", text: ["Slide the upper crossing along the transversal until it lies on the lower one.", "Because the lines are parallel the angles match exactly: that is why corresponding angles are equal."] },
      ],
    },
    limits: "One known interior angle and a named relation; deciding whether lines are parallel and proofs are marked by an educator.",
  },
  {
    id: "ahparx",
    arity: 5,
    title: "Finding x from angles at parallel lines",
    competency: PAR,
    skill: "MLY.geo.parallel-algebra",
    type: "integer",
    mc: true,
    // [rel, p, r, x, qq]: angles (px + q)° and (rx + s)°, q = 5qq − 10; rel 0 alternate (equal), 1 co-interior (sum 180)
    parse: none,
    reject: ([rel, p, r, x, qq]) => {
      if ((rel !== 0 && rel !== 1) || p < 1 || p > 5 || r < 1 || r > 5 || x < 5 || x > 35 || qq < 0 || qq > 8) return "Coefficients 1 to 5 and x from 5 to 35.";
      const q = 5 * qq - 10;
      const A = p * x + q;
      const s = rel === 0 ? A - r * x : 180 - A - r * x;
      const B = r * x + s;
      return (rel === 0 && p === r) || A < 20 || A > 160 || B < 20 || B > 160 || s < -40 || s > 60 || s === 0 || q === 0 ? "Both angles between 20° and 160° with small constants." : null;
    },
    prompt: ([rel, p, r, x, qq]) => {
      const q = 5 * qq - 10;
      const s = rel === 0 ? p * x + q - r * x : 180 - p * x - q - r * x;
      return `Two parallel lines are cut by a transversal. A pair of ${rel ? "co-interior" : "alternate interior"} angles measure (${poly([[p, "x"], [q, ""]])})° and (${poly([[r, "x"], [s, ""]])})°. What is x?`;
    },
    solve: ([rel, p, r, x, qq]) => {
      const q = 5 * qq - 10;
      const s = rel === 0 ? p * x + q - r * x : 180 - p * x - q - r * x;
      return rel === 0
        ? { steps: [{ id: "equal", op: "equate", competency: PAR, inputs: [poly([[p, "x"], [q, ""]]), poly([[r, "x"], [s, ""]])], value: `${poly([[p - r, "x"]])} = ${n_(s - q)}` }, { id: "divide", op: "divide", competency: LIN, inputs: [s - q, p - r], value: x }], answer: x }
        : { steps: [{ id: "sum", op: "add", competency: PAR, inputs: [poly([[p, "x"], [q, ""]]), poly([[r, "x"], [s, ""]])], value: `${poly([[p + r, "x"]])} = ${180 - q - s}` }, { id: "divide", op: "divide", competency: LIN, inputs: [180 - q - s, p + r], value: x }], answer: x };
    },
    // independent: substitute the answer into both angle expressions and test the angle fact
    validate: ([rel, p, r, x, qq], v) => {
      if (typeof v !== "number") return false;
      const q = 5 * qq - 10;
      const s = rel === 0 ? p * x + q - r * x : 180 - p * x - q - r * x;
      const A = p * v + q;
      const B = r * v + s;
      return rel === 0 ? A === B : A + B === 180;
    },
    bugs: ([rel, p, r, x, qq]) => {
      const q = 5 * qq - 10;
      const s = rel === 0 ? p * x + q - r * x : 180 - p * x - q - r * x;
      const sup = (180 - q - s) / (p + r);
      const eq = p !== r ? (s - q) / (p - r) : NaN;
      return keepPred([
        rel === 0
          ? { id: "supplementary-for-equal", kind: "conceptual", competency: PAR, says: "The two angles were added to make 180°. Alternate angles at parallel lines are equal.", predict: isInt(sup) && sup > 0 ? sup : null }
          : { id: "equal-for-supplementary", kind: "conceptual", competency: PAR, says: "The two angles were set equal. Co-interior angles at parallel lines add up to 180°.", predict: isInt(eq) && eq > 0 ? eq : null },
        { id: "gave-angle", kind: "procedural", competency: LIN, says: `The size of an angle was given instead of x. Once x is found, the angle is ${poly([[p, "x"], [q, ""]])} worked out, but the question asks for x.`, predict: p * x + q },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "equal" ? `Alternate angles are equal: ${s.inputs[0]} = ${s.inputs[1]}, so ${s.value}` : s.id === "sum" ? `Co-interior angles add to 180°: ${s.inputs[0]} + ${s.inputs[1]} = 180, so ${s.value}` : `x = ${n_(Number(s.inputs[0]))} ÷ ${n_(Number(s.inputs[1]))} = ${s.value}`),
    domain: [[0, 1], [1, 5], [1, 5], [5, 35], [0, 8]],
    cap: 400,
    difficulty: ([rel, p, r]) => (rel === 0 && Math.abs(p - r) === 1 ? 1 : rel === 0 ? 2 : 3),
    word: ([rel, p, r, x, qq]) => {
      const q = 5 * qq - 10;
      const s = rel === 0 ? p * x + q - r * x : 180 - p * x - q - r * x;
      return `A ladder-like design has two parallel bars crossed by a slanting rod. Two angles between the bars, ${rel ? "on the same side of the rod" : "on opposite sides of the rod"}, are marked (${poly([[p, "x"], [q, ""]])})° and (${poly([[r, "x"], [s, ""]])})°. What is x?`;
    },
    teach: {
      idea: "The angle facts become equations: alternate angles give 'angle = angle', co-interior angles give 'angle + angle = 180'.",
      method: "Write the equation from the angle fact, collect the x terms and the numbers, and divide. Then check both angles with your x.",
      alternatives: [
        { id: "check_angles", title: "Check the angles", kind: "procedural", text: ["Put your x into both expressions to get the two angles.", "Alternate angles must come out equal; co-interior angles must add to 180°."] },
      ],
    },
    limits: "Linear angle expressions with whole-number x; corresponding and vertically opposite angles give the same 'equal' equation and are practised in ahpar.",
  },

  // ------------------------------------------------------------ Grades 7–10: Baudhayana-Pythagoras
  {
    id: "ahpyth",
    arity: 3,
    title: "A missing side of a right triangle",
    competency: PYTH,
    type: "integer",
    mc: true,
    // [a, b, f]: legs a < b, hypotenuse c (whole); f 0 find c, 1 find a, 2 find b
    parse: none,
    reject: ([a, b, f]) => (a < 3 || a >= b || f < 0 || f > 2 || !isSq(a * a + b * b) || Math.sqrt(a * a + b * b) > 100 ? "A right triangle with whole-number sides and hypotenuse up to 100." : null),
    prompt: ([a, b, f]) => {
      const c = Math.sqrt(a * a + b * b);
      return f === 0 ? `A right-angled triangle has shorter sides ${a} cm and ${b} cm, as in the picture. How long is the hypotenuse, in cm?` : `A right-angled triangle has hypotenuse ${c} cm and one shorter side ${f === 1 ? b : a} cm, as in the picture. How long is the other shorter side, in cm?`;
    },
    solve: ([a, b, f]) => {
      const c = Math.sqrt(a * a + b * b);
      if (f === 0) return { steps: [{ id: "squares", op: "add", competency: PYTH, inputs: [a * a, b * b], value: c * c }, { id: "root", op: "square-root", competency: SQRT, inputs: [c * c], value: c }], answer: c };
      const k = f === 1 ? b : a;
      const u = f === 1 ? a : b;
      return { steps: [{ id: "difference", op: "subtract", competency: PYTH, inputs: [c * c, k * k], value: u * u }, { id: "root", op: "square-root", competency: SQRT, inputs: [u * u], value: u }], answer: u };
    },
    // independent: square the answer back and check the three sides satisfy the theorem (no square roots)
    validate: ([a, b, f], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return false;
      const c2 = a * a + b * b;
      if (f === 0) return v * v === c2;
      return v * v + (f === 1 ? b * b : a * a) === c2;
    },
    bugs: ([a, b, f]) => {
      const c = Math.sqrt(a * a + b * b);
      if (f === 0) return [
        { id: "added-sides", kind: "conceptual", competency: PYTH, says: "The two sides were added. The theorem adds the squares of the sides, then takes the square root.", predict: a + b },
        { id: "no-square-root", kind: "procedural", competency: SQRT, says: `${a * a} + ${b * b} = ${c * c} is the square of the hypotenuse; its square root is the length.`, predict: c * c },
      ];
      const k = f === 1 ? b : a;
      const u = f === 1 ? a : b;
      const plus = Math.sqrt(c * c + k * k);
      return keepPred([
        { id: "subtracted-sides", kind: "conceptual", competency: PYTH, says: "The sides were subtracted. Subtract the squares, then take the square root.", predict: c - k },
        { id: "added-squares", kind: "conceptual", competency: PYTH, says: "The squares were added, as for the hypotenuse. The hypotenuse is the longest side, so for a shorter side subtract its square from the hypotenuse's square.", predict: Number.isInteger(plus) ? plus : null },
        { id: "no-square-root", kind: "procedural", competency: SQRT, says: `${c * c} − ${k * k} = ${u * u} is the square of the side; its square root is the length.`, predict: u * u },
      ]);
    },
    variants: () => [],
    explain: (s) => (s.id === "squares" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "difference" ? `${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `√${s.inputs[0]} = ${s.value}`),
    figure: ([a, b, f]) => {
      const c = Math.sqrt(a * a + b * b);
      return { type: "triangle", right: true, sides: [f === 2 ? "?" : `${b} cm`, f === 0 ? "?" : `${c} cm`, f === 1 ? "?" : `${a} cm`] };
    },
    domain: [[3, 99], [4, 99], [0, 2]],
    difficulty: ([a, b, f]) => (Math.sqrt(a * a + b * b) <= 25 ? 1 : f === 0 ? 2 : 3),
    word: ([a, b, f]) => {
      const c = Math.sqrt(a * a + b * b);
      return f === 0 ? `A rectangular playground is ${a} m wide and ${b} m long. A straight path runs across it from one corner to the opposite corner. How long is the path, in metres?` : `A straight path runs across a rectangular playground from one corner to the opposite corner and is ${c} m long. One side of the playground is ${f === 1 ? b : a} m. How long is the other side, in metres?`;
    },
    teach: {
      idea: "In a right-angled triangle the square on the hypotenuse equals the sum of the squares on the other two sides (Baudhayana's rule for the diagonal of a rectangle).",
      method: "Hypotenuse: add the squares of the two shorter sides and take the square root. Shorter side: subtract the square of the known shorter side from the square of the hypotenuse, then take the square root.",
      alternatives: [
        { id: "squares_on_sides", title: "Squares on the sides", kind: "conceptual", text: ["Draw a square on each side of the triangle. The two smaller squares together have the same area as the big one.", "So the area of the big square is a² + b², and its side is the square root."], visual: ([a, b]) => ({ type: "triangle", right: true, sides: [`${b}`, `${Math.sqrt(a * a + b * b)}`, `${a}`] }) },
        { id: "triples", title: "Spot a triple", kind: "procedural", text: ["Many whole-number right triangles are multiples of 3-4-5, 5-12-13 or 8-15-17.", "Divide the sides by a common factor, recognise the triple, then scale back."] },
      ],
    },
    limits: "Whole-number right triangles with hypotenuse up to 100; the converse and surd answers are not asked here.",
  },

  // ------------------------------------------------------------ Grade 7: tilings
  {
    id: "ahtile",
    arity: 5,
    title: "The missing angle at a point of a tiling",
    competency: TILE,
    type: "integer",
    mc: true,
    // [n1, k1, n2, k2, t]: k1 regular n1-gons and k2 regular n2-gons (k2 = 0: none) meet at a point with t more equal corners
    parse: none,
    reject: ([n1, k1, n2, k2, t]) => {
      if (!POLYNAME[n1] || !POLYNAME[n2] || k1 < 1 || k1 > 5 || k2 < 0 || k2 > 4 || t < 1 || t > 2) return "Regular polygons with whole-number angles (3, 4, 5, 6, 8, 9, 10 or 12 sides) and one or two more tiles.";
      if (k2 === 0 ? n2 !== 3 : n2 <= n1) return "One kind of polygon, or two kinds listed by number of sides.";
      const m = (360 - k1 * interior(n1) - k2 * interior(n2)) / t;
      return !isInt(m) || m < 30 || m >= 180 ? "Each missing corner must be a whole number of degrees between 30° and 180°." : null;
    },
    prompt: ([n1, k1, n2, k2, t]) => `At one point of a floor tiling, ${tileList([n1, k1, n2, k2])} meet, together with ${t === 1 ? "one more tile" : "two more tiles whose corners there are equal"}, with no gaps and no overlaps. What angle must ${t === 1 ? "the corner of the last tile" : "each of those two corners"} be, in degrees?`,
    solve: ([n1, k1, n2, k2, t]) => {
      const used = k1 * interior(n1) + k2 * interior(n2);
      return {
        steps: [
          { id: "angle1", op: "interior-angle", competency: POLY, inputs: [n1], value: interior(n1) },
          ...(k2 ? [{ id: "angle2", op: "interior-angle", competency: POLY, inputs: [n2], value: interior(n2) }] : []),
          { id: "used", op: "add", competency: TILE, inputs: [k1, interior(n1), k2, interior(n2)], value: used },
          { id: "rest", op: "subtract", competency: TILE, inputs: [360, used], value: 360 - used },
          ...(t === 2 ? [{ id: "share", op: "divide", competency: TILE, inputs: [360 - used, 2], value: (360 - used) / 2 }] : []),
        ],
        answer: (360 - used) / t,
      };
    },
    // independent: interior angle = 180° − exterior angle (360° ÷ n); then all corners round the point must make 360°
    validate: ([n1, k1, n2, k2, t], v) => {
      const corner = (n: number) => 180 - 360 / n;
      let total = 0;
      for (let i = 0; i < k1; i++) total += corner(n1);
      for (let i = 0; i < k2; i++) total += corner(n2);
      for (let i = 0; i < t; i++) total += typeof v === "number" ? v : NaN;
      return near(total, 360);
    },
    bugs: ([n1, k1, n2, k2, t]) => {
      const used = k1 * interior(n1) + k2 * interior(n2);
      const ext = (360 - k1 * (360 / n1) - k2 * (360 / n2)) / t;
      const half = (180 - used) / t;
      return keepPred([
        { id: "exterior-for-interior", kind: "prerequisite", competency: POLY, says: "The angle of each polygon was taken as 360° ÷ (number of sides), which is its exterior angle. A tile's corner is the interior angle, 180° − 360° ÷ n.", predict: ext > 0 && ext < 360 && isInt(ext) ? ext : null },
        { id: "straight-line", kind: "recall", competency: TILE, says: "The corners were made to add up to 180°. Angles all the way round a point add up to 360°.", predict: half > 0 && isInt(half) ? half : null },
        { id: "not-shared", kind: "procedural", competency: TILE, says: "The whole gap was given as one corner. Two equal tiles share the gap, so each corner is half of it.", predict: t === 2 ? 360 - used : null },
      ]);
    },
    distractors: ([n1, k1, n2, k2, t]) => [interior(n1), (360 - k1 * interior(n1) - k2 * interior(n2)) / t + 10, Math.abs(180 - (360 - k1 * interior(n1) - k2 * interior(n2)) / t)],
    variants: () => [],
    explain: (s) => (s.op === "interior-angle" ? `Each corner of a regular ${s.inputs[0]}-sided polygon is 180° − 360° ÷ ${s.inputs[0]} = ${s.value}°` : s.id === "used" ? `Corners already there: ${s.inputs[0]} × ${s.inputs[1]}°${Number(s.inputs[2]) ? ` + ${s.inputs[2]} × ${s.inputs[3]}°` : ""} = ${s.value}°` : s.id === "rest" ? `The gap left: 360° − ${s.inputs[1]}° = ${s.value}°` : `Two equal corners share it: ${s.inputs[0]}° ÷ 2 = ${s.value}°`),
    domain: [[3, 12], [1, 5], [3, 12], [0, 4], [1, 2]],
    difficulty: ([n1, , , k2, t]) => (k2 === 0 && t === 1 && (n1 === 3 || n1 === 4 || n1 === 6) ? 1 : k2 === 0 || t === 1 ? 2 : 3),
    word: ([n1, k1, n2, k2, t]) => `${name(n1 + k1)} is making a rangoli pattern from paper tiles. At one point, ${tileList([n1, k1, n2, k2])} fit together, and ${t === 1 ? "one more tile must close the gap exactly. What angle must that tile's corner be" : "two more tiles with equal corners must close the gap exactly. What angle must each of their corners be"}, in degrees?`,
    teach: {
      idea: "Tiles fit around a point with no gaps or overlaps only when their corner angles add up to exactly 360°.",
      method: "Find each regular polygon's interior angle (180° − 360° ÷ number of sides), add the angles already at the point, and take the total from 360°; share the gap if more than one tile fills it.",
      alternatives: [
        { id: "angle_table", title: "Know the polygon angles", kind: "recall", text: ["Triangle 60°, square 90°, pentagon 108°, hexagon 120°, octagon 135°, decagon 144°, dodecagon 150°.", "Squares (4 × 90°), triangles (6 × 60°) and hexagons (3 × 120°) tile on their own; pentagons do not, since 360 ÷ 108 is not whole."] },
        { id: "split_triangles", title: "Split into triangles", kind: "conceptual", text: ["A polygon with n sides splits into n − 2 triangles from one corner, so its angles add up to (n − 2) × 180°.", "In a regular polygon all n corners are equal: divide by n."] },
      ],
    },
    limits: "Regular polygons with whole-degree angles meeting at one point; drawing or describing whole tilings is marked by an educator.",
  },
];

// ================================================================ gap@1 additions (naming angle pairs, Virahanka rhythms,
// congruent figures, square and cube identities, numbers by identities, the converse of Pythagoras, generating triples,
// recognising and using inverse proportion, compound variation, calendar and grid patterns, floor plans on a grid,
// explicit and recursive rules, coefficients from conditions on zeros, perfect squares, square roots to one decimal place)

const IDN = "MATH.algebra.identities";
const PZEROS = "MATH.algebra.polynomial-zeros";
const Bq = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Bug["predict"]): Bug => ({ id, kind, competency, says, predict });
/** A fixed, well-mixed hash (FNV-1a and a murmur finaliser): option orders and seeded choices that differ by problem. */
const h8 = (s: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const shuffled = <T,>(salt: string, xs: T[]) => [...xs].sort((a, b) => h8(salt + String(a)) - h8(salt + String(b)) || (String(a) < String(b) ? -1 : 1));
/** The seeds 0 … n − 1 whose problem differs from every earlier seed's (distinct@1), worked out once per key. */
const uniqueSeeds = (() => {
  const memo = new Map<string, Set<number>>();
  return (key: string, n: number, sig: (s: number) => string) => {
    if (!memo.has(key)) {
      const seen = new Set<string>();
      const ok = new Set<number>();
      for (let s = 0; s < n; s++) {
        const k = sig(s);
        if (k && !seen.has(k)) {
          seen.add(k);
          ok.add(s);
        }
      }
      memo.set(key, ok);
    }
    return memo.get(key)!;
  };
})();
const ww = (x: number) => (x === 1 ? "x" : `${x}x`);

// ---------------------------------------------------------------- naming angle pairs (ahname)
// an angle's position: line (0 l, 1 m), above (0) or below (1) the line, left (0) or right (1) of the transversal t
const posOf = (k: number) => ({ L: k >> 2, V: (k >> 1) & 1, S: k & 1 });
const pos = (L: number, V: number, S: number) => (L << 2) | (V << 1) | S;
const LABELS = [
  (k: number) => String([1, 2, 4, 3][k & 3] + 4 * (k >> 2)),
  (k: number) => "abcdefgh"[k],
  (k: number) => String([2, 1, 3, 4][k & 3] + 4 * (k >> 2)),
];
// scheme 0: at each line top-left 1, top-right 2, bottom-right 3, bottom-left 4 (clockwise); scheme 1: a b / c d row by
// row; scheme 2: top-right 1, top-left 2, bottom-left 3, bottom-right 4 (anticlockwise)
const lab = (scheme: number, k: number) => LABELS[scheme](k);
const RELN = ["corresponding", "alternate interior", "co-interior", "vertically opposite"];
const interiorPos = (k: number) => {
  const { L, V } = posOf(k);
  return (L === 0 && V === 1) || (L === 1 && V === 0);
};
const partner = (rel: number, k: number): number | null => {
  const { L, V, S } = posOf(k);
  if (rel === 0) return pos(1 - L, V, S);
  if (rel === 1) return interiorPos(k) ? pos(1 - L, 1 - V, 1 - S) : null;
  if (rel === 2) return interiorPos(k) ? pos(1 - L, 1 - V, S) : null;
  return pos(L, 1 - V, 1 - S);
};
const relOf = (a: number, b: number) => [0, 1, 2, 3].find((r) => partner(r, a) === b) ?? -1;
/** The geometry check: the direction of each angle's bisector, with t crossing at 65° (l on y = 1, m on y = 0). */
function bisector(k: number): [number, number, number] {
  const { L, V, S } = posOf(k);
  const t = [Math.cos((65 * Math.PI) / 180), Math.sin((65 * Math.PI) / 180)];
  // the angle lies between the ray along the line (left or right) and the ray along t (up or down)
  const along = S === 0 ? -1 : 1;
  const tray = V === 0 ? 1 : -1;
  return [along + tray * t[0], tray * t[1], L === 0 ? 1 : 0];
}
function classifyGeo(a: number, b: number): number {
  const [ax, ay, al] = bisector(a);
  const [bx, by, bl] = bisector(b);
  const side = (x: number, y: number) => Math.sign(Math.cos((65 * Math.PI) / 180) * y - Math.sin((65 * Math.PI) / 180) * x);
  const between = (y: number, line: number) => (line === 1 ? y < 0 : y > 0);
  if (al === bl) return near(ax, -bx) && near(ay, -by) ? 3 : -1;
  if (near(ax, bx) && near(ay, by)) return 0;
  if (!between(ay, al) || !between(by, bl)) return -1;
  return side(ax, ay) === side(bx, by) ? 2 : 1;
}
const nameOk = ([mode, scheme, x, y]: number[]) => scheme >= 0 && scheme <= 2 && (mode === 0 ? x >= 0 && x <= 3 && y >= 0 && y <= 7 && partner(x, y) !== null : mode === 1 ? x < y && x >= 0 && y <= 7 && relOf(x, y) >= 0 : false);
function nameOpts([mode, scheme, x, y]: number[]): { opts: string[]; right: string } {
  if (mode === 1) return { opts: shuffled(`ahname:${mode},${scheme},${x},${y}`, RELN.map((r) => `${r} angles`)), right: `${RELN[relOf(x, y)]} angles` };
  const right = partner(x, y)!;
  const set = [right];
  for (const r of [0, 1, 2, 3]) {
    const q = partner(r, y);
    if (q !== null && !set.includes(q)) set.push(q);
  }
  for (let k = 0; set.length < 4; k++) if (k !== y && !set.includes(k)) set.push(k);
  return { opts: shuffled(`ahname:${mode},${scheme},${x},${y}`, set.slice(0, 4).map((k) => lab(scheme, k))), right: lab(scheme, right) };
}
const nameTable = (scheme: number): Visual => ({ type: "table", head: ["", "left of t", "right of t"], rows: [["line l, above", lab(scheme, 0), lab(scheme, 1)], ["line l, below", lab(scheme, 2), lab(scheme, 3)], ["line m, above", lab(scheme, 4), lab(scheme, 5)], ["line m, below", lab(scheme, 6), lab(scheme, 7)]] });

// ---------------------------------------------------------------- Virahanka rhythms (ahrhy)
const rhythms = (n: number): number => {
  let [a, b] = [1, 1];
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return n < 0 ? 0 : b;
};
const binom = (n: number, k: number) => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};
/** The same count another way: choose how many long beats (k) and where they go among the n − k syllables. */
const rhythmsByChoosing = (n: number) => {
  if (n < 0) return 0;
  let t = 0;
  for (let k = 0; 2 * k <= n; k++) t += binom(n - k, k);
  return t;
};
const RHY = [
  { all: (n: number) => `In Indian poetry a short syllable takes 1 beat and a long syllable takes 2 beats. How many different rhythms (orders of short and long syllables) last exactly ${n} beats?`, start: (n: number, l: boolean) => `In Indian poetry a short syllable takes 1 beat and a long syllable takes 2 beats. How many different rhythms of exactly ${n} beats begin with a ${l ? "long" : "short"} syllable?` },
  { all: (n: number) => `A staircase has ${n} steps. ${"Ravi"} climbs it taking either 1 step or 2 steps at a time. In how many different ways can he climb to the top?`, start: (n: number, l: boolean) => `A staircase has ${n} steps. Ravi climbs it taking either 1 or 2 steps at a time. In how many different ways can he climb to the top if his first move is ${l ? "2 steps" : "1 step"}?` },
  { all: (n: number) => `A path 2 units wide and ${n} units long is paved with tiles of 2 units by 1 unit (each tile lies across the path, or two tiles lie side by side along it). In how many different ways can the path be paved?`, start: (n: number, l: boolean) => `A path 2 units wide and ${n} units long is paved with tiles of 2 units by 1 unit (each tile lies across the path, or two lie side by side along it). In how many ways can it be paved if it starts with ${l ? "two tiles side by side along the path" : "one tile across the path"}?` },
  { all: (n: number) => `Meena lays ₹1 and ₹2 coins in a row so that they add up to ₹${n}. How many different rows can she make (the order of the coins matters)?`, start: (n: number, l: boolean) => `Meena lays ₹1 and ₹2 coins in a row so that they add up to ₹${n}. How many different rows can she make that start with a ₹${l ? 2 : 1} coin?` },
];
const rhyAns = ([, mode, n]: number[]) => (mode === 0 ? rhythms(n) : mode === 1 ? rhythms(n - 2) : rhythms(n - 1));

// ---------------------------------------------------------------- congruent figures (ahcfig)
function cfig(kind: number, seed: number): { prompt: string; opts: string[]; right: string; scaled: string; same: string; dims: Map<string, number[]>; base: number[] } {
  const r = (k: number) => h8(`ahcfig:${kind}:${seed}:${k}`);
  const dims = new Map<string, number[]>();
  const sort = (x: number[]) => [...x].sort((a, b) => a - b);
  if (kind === 0) {
    let s: number[] = [5, 6, 7];
    for (let k = 0; k < 50; k++) {
      const c = [3 + (r(k) % 9), 3 + (r(k + 99) % 9), 3 + (r(k + 199) % 9)].sort((a, b) => a - b);
      if (c[0] !== c[1] && c[1] !== c[2] && c[0] + c[1] > c[2] + 1) {
        s = c;
        break;
      }
    }
    const t = (x: number[]) => `a triangle with sides ${x.join(" cm, ")} cm`;
    const right = [s[1], s[2], s[0]];
    const scaled = s.map((x) => 2 * x);
    const same = [s[0] - 1, s[1] + 1, s[2]];
    const oneOff = [s[0], s[1], s[2] + 1];
    for (const x of [right, scaled, same, oneOff]) dims.set(t(x), sort(x));
    return { prompt: `Triangle PQR has sides PQ = ${s[0]} cm, QR = ${s[1]} cm and RP = ${s[2]} cm. Which of these triangles is congruent to triangle PQR?`, opts: shuffled(`ahcfig:${kind}:${seed}`, [t(right), t(scaled), t(same), t(oneOff)]), right: t(right), scaled: t(scaled), same: t(same), dims, base: sort(s) };
  }
  if (kind === 1) {
    const w = 2 + (seed % 8);
    const l = w + 1 + Math.floor(seed / 8);
    const t = (a: number, b: number) => `a rectangle ${a} cm wide and ${b} cm long`;
    const right = t(l, w);
    const scaled = t(2 * w, 2 * l);
    const same = t(w + 1, l - 1);
    const area = l * w;
    let alt = [1, area];
    for (let a = 2; a * a <= area; a++) if (area % a === 0 && a !== w && a !== l) alt = [a, area / a];
    const sameArea = t(alt[0], alt[1]);
    dims.set(right, sort([l, w]));
    dims.set(scaled, sort([2 * w, 2 * l]));
    dims.set(same, sort([w + 1, l - 1]));
    dims.set(sameArea, sort(alt));
    return { prompt: `A rectangle is ${l} cm long and ${w} cm wide. Which of these rectangles is congruent to it?`, opts: shuffled(`ahcfig:${kind}:${seed}`, [right, scaled, same, sameArea]), right, scaled, same: sameArea, dims, base: sort([l, w]) };
  }
  const rad = 2 + seed;
  const right = `a circle with diameter ${2 * rad} cm`;
  const wrong1 = `a circle with diameter ${rad} cm`;
  const wrong2 = `a circle with radius ${2 * rad} cm`;
  const wrong3 = `a circle with radius ${rad + 1} cm`;
  dims.set(right, [rad]);
  dims.set(wrong1, [rad / 2]);
  dims.set(wrong2, [2 * rad]);
  dims.set(wrong3, [rad + 1]);
  return { prompt: `A circle has radius ${rad} cm. Which of these circles is congruent to it?`, opts: shuffled(`ahcfig:${kind}:${seed}`, [right, wrong1, wrong2, wrong3]), right, scaled: wrong2, same: wrong1, dims, base: [rad] };
}
const cfigOk = ([kind, seed]: number[]) => kind >= 0 && kind <= 2 && seed >= 0 && seed <= (kind === 2 ? 23 : 59) && new Set(cfig(kind, seed).opts).size === 4 && uniqueSeeds(`ahcfig${kind}`, 60, (s) => (kind === 2 && s > 23 ? "" : cfig(kind, s).prompt)).has(seed);

// ---------------------------------------------------------------- square identities (ahid), numbers by identities (ahidn)
const idCoef = ([form, p, q]: number[]) => (form === 0 ? [p * p, 2 * p * q, q * q] : form === 1 ? [p * p, -2 * p * q, q * q] : [p * p, 0, -q * q]);
const idLeft = ([form, p, q]: number[]) => (form === 0 ? `(${ww(p)} + ${q})²` : form === 1 ? `(${ww(p)} − ${q})²` : `(${ww(p)} + ${q})(${ww(p)} − ${q})`);
const idRight = (c: number[], box: number) => {
  const parts: string[] = [];
  const term = (k: number, v: string, first: boolean) => (first ? `${k < 0 ? "−" : ""}${Math.abs(k) === 1 && v ? "" : Math.abs(k)}${v}` : ` ${k < 0 ? "−" : "+"} ${Math.abs(k) === 1 && v ? "" : Math.abs(k)}${v}`);
  const vars = ["x²", "x", ""];
  for (let i = 0; i < 3; i++) {
    if (i === box) parts.push(i === 0 ? "□x²" : ` + □${vars[i]}`);
    else if (c[i] !== 0) parts.push(term(c[i], vars[i], i === 0));
  }
  return parts.join("");
};
const idOk = ([form, p, q, box]: number[]) => form >= 0 && form <= 2 && p >= 1 && p <= 5 && q >= 1 && q <= 9 && box >= 0 && box <= 2 && !(form === 2 && box === 1) && !(p === 1 && box === 0);
const IDENT = ["(a + b)² = a² + 2ab + b²", "(a − b)² = a² − 2ab + b²", "(a + b)(a − b) = a² − b²"];
const numOk = ([form, B, b]: number[]) => form >= 0 && form <= 2 && B >= 1 && B <= 10 && b >= 1 && b <= 4 && 10 * B - b > 0;

// ---------------------------------------------------------------- cube identities and products of three (ahcube)
// [form, a, b, c, box]: 0 (x + a)³, 1 (x − a)³, 2 (x + a)(x + b)(x + c), 3 (x + ay + b)²; box picks the coefficient asked
function cubeCoef([form, a, b, c]: number[]): { terms: string[]; coef: number[] } {
  if (form === 0) return { terms: ["x³", "x²", "x", ""], coef: [1, 3 * a, 3 * a * a, a ** 3] };
  if (form === 1) return { terms: ["x³", "x²", "x", ""], coef: [1, -3 * a, 3 * a * a, -(a ** 3)] };
  if (form === 2) return { terms: ["x³", "x²", "x", ""], coef: [1, a + b + c, a * b + b * c + c * a, a * b * c] };
  return { terms: ["x²", "y²", "", "xy", "y", "x"], coef: [1, a * a, b * b, 2 * a, 2 * a * b, 2 * b] };
}
const cubeLeft = ([form, a, b, c]: number[]) => (form === 0 ? `(x + ${a})³` : form === 1 ? `(x − ${a})³` : form === 2 ? `(x ${signed(a)})(x ${signed(b)})(x ${signed(c)})` : `(x + ${a === 1 ? "" : a}y + ${b})²`);
const cubeOk = ([form, a, b, c, box]: number[]) => {
  if (form === 0 || form === 1) return a >= 1 && a <= 6 && b === 0 && c === 0 && box >= 1 && box <= 3;
  if (form === 2) return a >= -6 && a < b && b < c && c <= 6 && a !== 0 && b !== 0 && c !== 0 && box >= 1 && box <= 3 && cubeCoef([form, a, b, c]).coef[box] !== 0;
  if (form === 3) return a >= 1 && a <= 5 && b >= 1 && b <= 9 && c === 0 && box >= 3 && box <= 5;
  return false;
};
const cubeRight = (p: number[]) => {
  const { terms, coef } = cubeCoef(p);
  const box = p[4];
  return terms
    .map((t, i) => (i === box ? `□${t}` : `${Math.abs(coef[i]) === 1 && t ? "" : Math.abs(coef[i])}${t}`))
    .map((s, i) => (i === 0 ? s : ` ${i === box ? "+" : coef[i] < 0 ? "−" : "+"} ${s}`))
    .join("");
};
const cubeEval = (p: number[], x: number, y: number) => {
  const [form, a, b, c] = p;
  return form === 0 ? (x + a) ** 3 : form === 1 ? (x - a) ** 3 : form === 2 ? (x + a) * (x + b) * (x + c) : (x + a * y + b) ** 2;
};
const cubeMono = (t: string, x: number, y: number) => ({ "x³": x ** 3, "x²": x * x, x, "": 1, "y²": y * y, xy: x * y, y }[t] as number);

// ---------------------------------------------------------------- the converse of Pythagoras (ahconv), generating triples (ahgen)
const TRIPLES: number[][] = (() => {
  const out: number[][] = [];
  for (let c = 5; c <= 65; c++) for (let a = 3; a < c; a++) for (let b = a + 1; b < c; b++) if (a * a + b * b === c * c) out.push([a, b, c]);
  return out;
})();
function convSides([t, kind, order]: number[]): number[] {
  const [a, b, c] = TRIPLES[t];
  const s = kind === 0 ? [a, b, c] : kind === 1 ? [a, b, c + 1] : [a + 1, b, c];
  return order === 0 ? s : order === 1 ? [s[2], s[0], s[1]] : [s[0], s[2], s[1]];
}
const convOk = ([t, kind, order, ctx]: number[]) => t >= 0 && t < TRIPLES.length && kind >= 0 && kind <= 2 && order >= 0 && order <= 2 && (ctx === 0 || (ctx === 1 && order === 0)) && !(kind === 2 && TRIPLES[t][0] + 1 === TRIPLES[t][1]);
const CONV_CH = ["Yes, it is right-angled", "No, it is not right-angled"];
const convOpts = (p: number[]) => shuffled(`ahconv:${p}`, CONV_CH);
const genOk = ([mode, m, n]: number[]) => (mode <= 1 ? mode >= 0 && m >= 2 && m <= 20 && n === 0 : mode <= 4 ? m >= 2 && m <= 9 && n >= 1 && n < m : false);
const genAns = ([mode, m, n]: number[]) => [m * m + 1, m * m - 1, m * m - n * n, 2 * m * n, m * m + n * n][mode];

// ---------------------------------------------------------------- recognising and using inverse proportion (ahvary, ahman, ahcomp)
const VARY = ["inverse proportion", "direct proportion", "neither direct nor inverse proportion"];
function varyRows(kind: number, seed: number): number[][] {
  const r = (k: number) => h8(`ahvary:${kind}:${seed}:${k}`);
  if (kind === 0) {
    const K = [24, 36, 48, 60, 72, 90, 120, 144, 180, 240][seed % 10];
    const ds: number[] = [];
    for (let d = 1; d <= K; d++) if (K % d === 0) ds.push(d);
    const pickd = [...ds].sort((x, y) => r(x) - r(y)).slice(0, 4).sort((x, y) => x - y);
    return pickd.map((x) => [x, K / x]);
  }
  if (kind === 1) {
    const k = 2 + (seed % 9);
    const x0 = 1 + Math.floor(seed / 9);
    const st = 1 + (r(1) % 3);
    return [0, 1, 2, 3].map((i) => [x0 + i * st, k * (x0 + i * st)]);
  }
  if (kind === 2) {
    const c = 3 + (seed % 12);
    const x0 = 1 + Math.floor(seed / 12);
    return [0, 1, 2, 3].map((i) => [x0 + 2 * i, x0 + 2 * i + c]);
  }
  const c = 20 + seed;
  return [0, 1, 2, 3].map((i) => [2 + 3 * i, c - 2 - 3 * i]);
}
const varyOk = ([kind, seed]: number[]) => kind >= 0 && kind <= 3 && seed >= 0 && seed <= 29 && varyRows(kind, seed).every(([x, y]) => x > 0 && y > 0) && new Set(varyRows(kind, seed).map((r) => r[0])).size === 4;
const MAN = [
  { thing: (w: number, d: number) => `${w} workers can build a wall in ${d} days`, ask: (w: number) => `How many days would ${w} workers take, working at the same rate?`, word: (w1: number, d1: number, w2: number) => `A farmer finds that ${w1} labourers harvest his paddy field in ${d1} days. This year ${w2} labourers come to work. If they all work at the same rate, how many days will the harvest take?` },
  { thing: (w: number, d: number) => `A car going at ${w} km per hour takes ${d} hours for a journey`, ask: (w: number) => `How many hours would the same journey take at ${w} km per hour?`, word: (w1: number, d1: number, w2: number) => `A bus from Madurai to Chennai takes ${d1} hours at an average speed of ${w1} km per hour. How many hours would it take at an average speed of ${w2} km per hour?` },
  { thing: (w: number, d: number) => `A stock of fodder lasts ${w} cows for ${d} days`, ask: (w: number) => `How many days would it last ${w} cows, each eating the same amount?`, word: (w1: number, d1: number, w2: number) => `A hostel's stock of rice lasts ${w1} students for ${d1} days. If ${w2} students stay instead, eating the same amount each, how many days will the rice last?` },
];
const manOk = ([ctx, w1, d1, w2]: number[]) => ctx >= 0 && ctx <= 2 && w1 !== w2 && (ctx === 1 ? w1 % 10 === 0 && w2 % 10 === 0 && w1 >= 30 && w1 <= 80 && w2 >= 30 && w2 <= 80 && d1 >= 2 && d1 <= 9 : w1 >= 2 && w1 <= 24 && w2 >= 2 && w2 <= 24 && d1 >= 3 && d1 <= 30) && (w1 * d1) % w2 === 0;
function compData(ctx: number, seed: number) {
  const r = (k: number) => h8(`ahcomp:${ctx}:${seed}:${k}`);
  for (let k = 0; k < 400; k++) {
    const m1 = 4 + (r(k) % 13);
    const m2 = 4 + (r(k + 1000) % 13);
    const x1 = ctx === 0 ? 5 + (r(k + 2000) % 6) : 20 + 10 * (r(k + 2000) % 9);
    const x2 = ctx === 0 ? 5 + (r(k + 3000) % 6) : 20 + 10 * (r(k + 3000) % 9);
    const d1 = 6 + (r(k + 4000) % 25);
    const num = ctx === 0 ? m1 * x1 * d1 : m1 * d1 * x2;
    const den = ctx === 0 ? m2 * x2 : m2 * x1;
    if (m1 !== m2 && x1 !== x2 && num % den === 0 && num / den >= 2 && num / den <= 60 && num / den !== d1) return { m1, m2, x1, x2, d1, d2: num / den };
  }
  return null;
}
const compOk = ([ctx, seed]: number[]) => (ctx === 0 || ctx === 1) && seed >= 0 && seed <= 199 && compData(ctx, seed) !== null && uniqueSeeds(`ahcomp${ctx}`, 200, (s) => JSON.stringify(compData(ctx, s))).has(seed);

// ---------------------------------------------------------------- calendar and number-grid patterns (ahcal)
// [grid, shape, dir, n]: grid 0 a calendar (7 a row), 1 a 1–100 grid (10 a row); shape 0 a 2 × 2 square, 1 a 3 × 3 square;
// dir 0: the smallest number is n, find the sum; dir 1: the sum is given, find the smallest number n
const calW = (g: number) => (g === 0 ? 7 : 10);
const calSum = ([g, shape, , n]: number[]) => (shape === 0 ? 4 * n + 2 * calW(g) + 2 : 9 * (n + calW(g) + 1));
const calOk = ([g, shape, dir, n]: number[]) => {
  if (g < 0 || g > 1 || shape < 0 || shape > 1 || dir < 0 || dir > 1 || n < 1) return false;
  if (g === 0) return shape === 0 ? n <= 23 : n <= 15;
  return shape === 0 ? n <= 89 && n % 10 !== 0 : n <= 78 && n % 10 !== 0 && n % 10 !== 9;
};

// ---------------------------------------------------------------- floor plans on a grid (ahmap)
// [mode, x, y, w, h]: a rectangular room with corners A(x, y), B(x + w, y), C(x + w, y + h), D(x, y + h)
/** The point a hall question asks for (D, the door half-way along AB, or the centre). */
const mapAns = ([mode, x, y, w, h]: number[]) => (mode === 0 ? [x, y + h] : mode === 1 ? [x + w / 2, y] : [x + w / 2, y + h / 2]);
// no corner and no answer at the origin, where the gate is labelled
const mapOk = ([mode, x, y, w, h]: number[]) => mapAns([mode, x, y, w, h]).some((c) => c !== 0) && [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].every(([a, b]) => a !== 0 || b !== 0) && mode >= 0 && mode <= 2 && x >= -7 && x <= 2 && y >= -6 && y <= 2 && w >= 2 && w <= 8 && h >= 2 && h <= 6 && x + w <= 8 && y + h <= 6 && w !== h && (mode === 0 || (mode === 1 ? w % 2 === 0 : w % 2 === 0 && h % 2 === 0));

// ---------------------------------------------------------------- explicit and recursive rules (ahexp)
// [mode, a, b]: 0 tₙ = an + b, the first three terms; 1 tₙ = an + b, its recursive rule (t₁, d); 2 tₙ = b × aⁿ⁻¹, its recursive rule (t₁, r)
const expOk = ([mode, a, b]: number[]) => (mode <= 1 ? mode >= 0 && a >= -5 && a <= 9 && a !== 0 && a !== 1 && b >= -9 && b <= 9 && b !== 0 : mode === 2 ? a >= 2 && a <= 5 && b >= 1 && b <= 9 : false);
const linText = (a: number, b: number) => `tₙ = ${a === 1 ? "" : a === -1 ? "−" : n_(a)}n ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;

// ---------------------------------------------------------------- a coefficient from a condition on the zeros (ahzk)
// [mode, a, s, c]: 0 ax² + kx + c, the sum of the zeros is s; 1 ax² + cx + k, the product is s; 2 x² + kx + as, one zero is a
// (the other is s); 3 x² + (k − a)x − c², the zeros are negatives of each other
const zkOk = ([mode, a, s, c]: number[]) => {
  if (mode === 0) return a >= 1 && a <= 5 && s >= -6 && s <= 6 && s !== 0 && c >= -9 && c <= 9 && c !== 0 && a * a * s * s - 4 * a * c >= 0;
  if (mode === 1) return a >= 2 && a <= 5 && s >= -6 && s <= 6 && s !== 0 && c >= -9 && c <= 9 && c !== 0 && c * c - 4 * a * (a * s) >= 0;
  if (mode === 2) return a >= -6 && a <= 6 && a !== 0 && s >= -6 && s <= 6 && s !== 0 && s !== a && s !== -a && c === 0;
  if (mode === 3) return a >= -9 && a <= 9 && a !== 0 && s === 0 && c >= 1 && c <= 9;
  return false;
};
const zkAns = ([mode, a, s]: number[]) => (mode === 0 ? -a * s : mode === 1 ? a * s : mode === 2 ? -(a + s) : a);
const zkPoly = ([mode, a, s, c]: number[]) => {
  const t = (k: number, v: string, first = false) => (k === 0 ? "" : `${first ? (k < 0 ? "−" : "") : k < 0 ? " − " : " + "}${Math.abs(k) === 1 && v ? "" : Math.abs(k)}${v}`);
  if (mode === 0) return `${a === 1 ? "" : a}x² + kx${t(c, "")}`;
  if (mode === 1) return `${a}x²${t(c, "x")} + k`;
  if (mode === 2) return `x² + kx${t(a * s, "")}`;
  return `x² + (k ${a < 0 ? "+" : "−"} ${Math.abs(a)})x − ${c * c}`;
};

// ---------------------------------------------------------------- perfect squares (ahpsq), square roots to one decimal place (ahsqd)
function psqOpts([mode, m]: number[]): { opts: string[]; right: string; good: string; same: string } {
  if (mode === 1) {
    const d = (m * m) % 10;
    const set = [d, (2 * (m % 10)) % 10, m % 10, (d + 5) % 10, (d + 1) % 10, (d + 3) % 10].filter((x, i, a) => a.indexOf(x) === i).slice(0, 4).map(String);
    return { opts: shuffled(`ahpsq:${mode},${m}`, set), right: String(d), good: String((2 * (m % 10)) % 10), same: String(m % 10) }; // good: the last digit doubled; same: the last digit itself
  }
  const sq = m * m;
  const bad = [2, 3, 7, 8].map((e) => sq - (sq % 10) + e).filter((x) => x !== sq);
  // a non-square ending in a digit that squares can end in (so the last-digit test alone does not decide)
  let good = sq + 10;
  while (Number.isInteger(Math.sqrt(good))) good += 10;
  const b1 = bad[h8(`ahpsq:b1:${m}`) % bad.length];
  const b2 = bad.find((x) => x !== b1 && x % 10 !== b1 % 10)!;
  return { opts: shuffled(`ahpsq:${mode},${m}`, [sq, good, b1, b2].map(String)), right: String(sq), good: String(good), same: String(b1) };
}
const psqOk = ([mode, m]: number[]) => (mode === 0 ? m >= 11 && m <= 60 : mode === 1 ? m >= 11 && m <= 99 && m % 10 !== 0 : false);
/** √n by the long-division method, digit by digit, to two decimal places (as a whole number of hundredths). */
function sqrtDigits(n: number): { digits: number[]; hundredths: number } {
  // pair the digits of n × 10 000 and bring them down two at a time
  let N = n * 10000;
  const pairs: number[] = [];
  while (N > 0) {
    pairs.unshift(N % 100);
    N = Math.floor(N / 100);
  }
  let root = 0;
  let rem = 0;
  const digits: number[] = [];
  for (const pr of pairs) {
    rem = rem * 100 + pr;
    let d = 9;
    while ((20 * root + d) * d > rem) d--;
    rem -= (20 * root + d) * d;
    root = 10 * root + d;
    digits.push(d);
  }
  return { digits, hundredths: root };
}
const sqdOk = ([n]: number[]) => n >= 2 && n <= 200 && !Number.isInteger(Math.sqrt(n));
const sqdAns = (n: number) => Math.round(sqrtDigits(n).hundredths / 10) / 10;

B08.push(
  // ============================================================ naming angle pairs at parallel lines
  {
    id: "ahname",
    arity: 4,
    title: "Naming corresponding, alternate, co-interior and vertically opposite angles",
    competency: PAR,
    type: "choice",
    // [mode, scheme, x, y]: mode 0: which angle is the RELN[x] angle to angle y? mode 1: what kind of pair are angles x and y?
    parse: none,
    reject: (p) => (nameOk(p) ? null : "Eight angles at two parallel lines, labelled in one of three ways."),
    choices: (p) => nameOpts(p).opts,
    prompt: ([mode, scheme, x, y]) => `Line t crosses two parallel lines l and m, making eight angles. The table shows where each angle lies (above or below each line, and on which side of t). ${mode === 0 ? `Which angle is the ${RELN[x]} angle to angle ${lab(scheme, y)}?` : `What kind of pair are angles ${lab(scheme, x)} and ${lab(scheme, y)}?`}`,
    solve: (p) => {
      const { opts, right } = nameOpts(p);
      const [mode, scheme, x, y] = p;
      return { steps: [{ id: "locate", op: "read", competency: PAR, inputs: mode === 0 ? [lab(scheme, y)] : [lab(scheme, x), lab(scheme, y)], value: right }], answer: opts.indexOf(right) };
    },
    // independent: put the angles on an actual drawing (t at 65°) and classify the pair from the directions of their bisectors
    validate: (p, v) => {
      const [mode, scheme, x, y] = p;
      const { opts } = nameOpts(p);
      if (typeof v !== "number" || !opts[v]) return false;
      if (mode === 1) return opts[v] === `${RELN[classifyGeo(x, y)]} angles`;
      const k = [0, 1, 2, 3, 4, 5, 6, 7].find((q) => lab(scheme, q) === opts[v])!;
      return k !== undefined && classifyGeo(Math.min(k, y), Math.max(k, y)) === x;
    },
    bugs: (p) => {
      const [mode, scheme, x, y] = p;
      const { opts } = nameOpts(p);
      if (mode === 1) {
        const r = relOf(x, y);
        const slip = [[1, "Corresponding angles are in the same position at each line (both above, on the same side of t); these two are"], [2, "Alternate angles lie on opposite sides of t; these two are on the same side, between the lines: they are"], [1, "Co-interior angles are on the same side of t; these two lie on opposite sides of t, between the lines: they are"], [0, "Corresponding angles are at different lines; these two are at the same crossing point and face each other: they are"]][r] as [number, string];
        return [Bq("mixed-names", "conceptual", PAR, `${slip[1]} ${RELN[r]} angles.`, opts.indexOf(`${RELN[slip[0]]} angles`))];
      }
      const out: Bug[] = [];
      const say = ["Corresponding angles sit in the same corner at each line: same side of t, and both above (or both below) their line.", "Alternate interior angles are between the two lines, on OPPOSITE sides of t (they make a Z shape).", "Co-interior angles are between the two lines on the SAME side of t (they make a C or U shape).", "Vertically opposite angles are at the same crossing point, facing each other across it."][x];
      for (const r of [0, 1, 2, 3]) {
        const q = r === x ? null : partner(r, y);
        if (q !== null && q !== partner(x, y) && opts.includes(lab(scheme, q)) && out.length < 2) out.push(Bq(`gave-${RELN[r].replace(/ /g, "-")}`, "conceptual", PAR, `The ${RELN[r]} angle was given. ${say}`, opts.indexOf(lab(scheme, q))));
      }
      return out;
    },
    variants: () => [],
    explain: (s) => (s.inputs.length === 1 ? `Find angle ${s.inputs[0]} in the table and move to the matching place: ${s.value}` : `Angles ${s.inputs[0]} and ${s.inputs[1]} are ${s.value}`),
    domain: [[0, 1], [0, 2], [0, 7], [0, 7]],
    keep: nameOk,
    difficulty: ([mode, , x]) => (mode === 0 && (x === 0 || x === 3) ? 1 : mode === 0 ? 2 : 3),
    figure: ([, scheme]) => nameTable(scheme),
    word: ([mode, scheme, x, y]) => `A straight railway line t crosses two parallel roads l and m. A surveyor labels the eight corners where they cross, as shown in the table. ${mode === 0 ? `Which corner makes the ${RELN[x]} angle with corner ${lab(scheme, y)}?` : `What kind of pair are corners ${lab(scheme, x)} and ${lab(scheme, y)}?`}`,
    teach: {
      idea: "Where a transversal crosses two lines it makes the same four angles at each line. Corresponding angles are in matching places; alternate interior angles are between the lines on opposite sides of t; co-interior angles are between the lines on the same side; vertically opposite angles face each other at one crossing.",
      method: "Find the given angle: which line, above or below it, which side of t. Corresponding: same place at the other line. Alternate interior: other line, other side of t, still between the lines. Co-interior: other line, same side of t, between the lines. Vertically opposite: same line, both other side and other position.",
      alternatives: [
        { id: "letters", title: "Look for F, Z and C shapes", kind: "conceptual", text: ["Corresponding angles sit in an F shape, alternate angles in a Z shape, co-interior angles in a C (or U) shape.", "Trace the letter through the two angles to check."] },
        { id: "slide", title: "Slide one crossing onto the other", kind: "procedural", text: ["Imagine sliding the crossing at l down t until it sits on the crossing at m.", "Each angle lands on its corresponding angle; then turn half way round the point to find the vertically opposite one."] },
      ],
    },
    limits: "Two parallel lines and a transversal, with angle positions given in a table (no drawn figure yet); proving lines parallel is the ahparx family and educator-marked tasks.",
  },
  // ============================================================ Virahanka numbers in counting problems
  {
    id: "ahrhy",
    arity: 3,
    title: "Counting rhythms, climbs and tilings: Virahanka numbers",
    competency: SEQ,
    type: "integer",
    mc: true,
    // [ctx, mode, n]: mode 0 all arrangements of length n; 1 those starting with a long (2) part; 2 those starting with a short (1) part
    parse: none,
    reject: ([ctx, mode, n]) => (ctx < 0 || ctx > 3 || mode < 0 || mode > 2 || n < 3 || n > 18 ? "Rhythms, stairs, tilings and coin rows of length 3 to 18." : null),
    prompt: ([ctx, mode, n]) => (mode === 0 ? RHY[ctx].all(n) : RHY[ctx].start(n, mode === 1)),
    solve: (p) => {
      const [, mode, n] = p;
      const steps = [];
      let [a, b] = [1, 1];
      for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
        steps.push({ id: `len${i}`, op: "add", competency: SEQ, inputs: [i, a, b - a], value: b });
      }
      const ans = rhyAns(p);
      return { steps: [...steps, ...(mode ? [{ id: "start", op: "rest", competency: SEQ, inputs: [mode === 1 ? n - 2 : n - 1], value: ans }] : [])], answer: ans };
    },
    // independent: count by choosing how many long parts there are and where they go (a sum of binomial coefficients)
    validate: ([, mode, n], v) => v === (mode === 0 ? rhythmsByChoosing(n) : mode === 1 ? rhythmsByChoosing(n - 2) : rhythmsByChoosing(n - 1)),
    bugs: (p) => {
      const [, mode, n] = p;
      const ans = rhyAns(p);
      const k = (x: number) => (x === ans ? null : x);
      return mode === 0
        ? [Bq("one-term-back", "procedural", SEQ, `The count for ${n - 1} was given. Each number in the sequence 1, 2, 3, 5, 8, … is the sum of the two before it; count on to length ${n}.`, k(rhythms(n - 1))), Bq("count-up", "conceptual", SEQ, "The counts were taken to grow by 1 each time. They grow by adding the two previous counts: endings with a short part plus endings with a long part.", k(n))]
        : [Bq("all-of-them", "procedural", SEQ, "All the arrangements were counted. Only those that start with the given part are asked: after it, the rest can be any arrangement of the remaining length.", k(rhythms(n))), Bq("wrong-rest", "procedural", SEQ, `The rest was taken to have length ${mode === 1 ? n - 1 : n - 2}. After a ${mode === 1 ? "long (2)" : "short (1)"} part, ${mode === 1 ? n - 2 : n - 1} remains.`, k(mode === 1 ? rhythms(n - 1) : rhythms(n - 2)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "start" ? `After the first part, the rest has length ${s.inputs[0]}: ${s.value} ways` : `Length ${s.inputs[0]}: ${s.inputs[1]} (ending with a short part) + ${s.inputs[2]} (ending with a long part) = ${s.value}`),
    domain: [[0, 3], [0, 2], [3, 18]],
    difficulty: ([, mode, n]) => (n <= 6 && mode === 0 ? 1 : mode === 0 ? 2 : 3),
    word: ([, mode, n]) => (mode === 0 ? `A drummer plays a pattern of ${n} beats using only short strokes (1 beat) and long strokes (2 beats). How many different patterns can he play?` : `A drummer plays a pattern of ${n} beats using only short strokes (1 beat) and long strokes (2 beats). How many different patterns begin with a ${mode === 1 ? "long" : "short"} stroke?`),
    teach: {
      idea: "Every arrangement of length n ends with a short part (after an arrangement of length n − 1) or a long part (after one of length n − 2). So the counts follow Virahanka's rule: each is the sum of the two before (1, 2, 3, 5, 8, 13, …).",
      method: "Start with length 1: 1 way, length 2: 2 ways. Add the last two counts to get the next, up to the length asked. For arrangements that must start with a given part, count the arrangements of what is left.",
      alternatives: [
        { id: "list_small", title: "List the small cases", kind: "procedural", text: ["Length 3: S S S, S L, L S (3 ways). Length 4: S S S S, S S L, S L S, L S S, L L (5 ways).", "Notice 3 + 5 = 8 for length 5, and continue."], visual: () => ({ type: "table", head: ["Length", "1", "2", "3", "4", "5"], rows: [["Ways", "1", "2", "3", "5", "8"]] }) },
        { id: "choose_longs", title: "Count by the number of long parts", kind: "conceptual", text: ["With k long parts there are n − 2k short ones: n − k parts in all.", "Choose which k of the n − k places are long, and add up over every possible k."] },
      ],
    },
    limits: "Lengths 3 to 18; sums and other patterns in the Virahanka sequence are the ahfib family.",
  },
  // ============================================================ recognising congruent figures
  {
    id: "ahcfig",
    arity: 2,
    title: "Which figure is congruent to the given one?",
    competency: CONG,
    type: "choice",
    // [kind, seed]: kind 0 triangles by their sides, 1 rectangles, 2 circles
    parse: none,
    reject: (p) => (cfigOk(p) ? null : "Triangles, rectangles and circles given by their measurements."),
    choices: (p) => cfig(p[0], p[1]).opts,
    prompt: (p) => cfig(p[0], p[1]).prompt,
    solve: ([kind, seed]) => {
      const f = cfig(kind, seed);
      return { steps: [{ id: "compare", op: "compare", competency: CONG, inputs: [f.base.join(", ")], value: f.right }], answer: f.opts.indexOf(f.right) };
    },
    // independent: compare the measurements in any order (sorted); exactly one option must match the given figure
    validate: ([kind, seed], v) => {
      const f = cfig(kind, seed);
      const same = (o: string) => JSON.stringify(f.dims.get(o)) === JSON.stringify(f.base);
      return typeof v === "number" && f.opts.filter(same).length === 1 && same(f.opts[v]);
    },
    bugs: ([kind, seed]) => {
      const f = cfig(kind, seed);
      return [
        Bq(kind === 2 ? "radius-diameter" : "same-shape", "conceptual", CONG, kind === 2 ? "The radius was taken for the diameter (or the other way round). A circle of radius r has diameter 2r; congruent circles have the same radius." : "This figure has the same shape but is twice as big. Congruent figures are the same shape AND the same size: one fits exactly on the other.", f.opts.indexOf(f.scaled)),
        Bq(kind === 0 ? "same-perimeter" : kind === 1 ? "same-area" : "half-size", "conceptual", CONG, kind === 0 ? "This triangle has the same perimeter, but its sides are different. Congruent triangles have all three sides equal in pairs." : kind === 1 ? "This rectangle has the same area, but different sides, so it will not fit exactly on the first one." : "Half the diameter was used as the radius twice. The diameter here must be 2 × the radius.", f.opts.indexOf(f.same)),
      ];
    },
    variants: () => [],
    explain: (s) => `Match the measurements in any order (${s.inputs[0]}): ${s.value} fits exactly`,
    domain: [[0, 2], [0, 59]],
    keep: cfigOk,
    difficulty: ([kind]) => (kind === 1 ? 1 : kind === 2 ? 2 : 3),
    word: (p) => `${name(p[1])} is cutting out paper shapes for a craft project and needs a piece that fits EXACTLY on top of this one: ${cfig(p[0], p[1]).prompt.replace(/ Which.*$/, "")} Which of these pieces should ${name(p[1])} choose?`,
    teach: {
      idea: "Two figures are congruent when one can be placed exactly on the other (perhaps after turning or flipping it): the same shape and the same size, so all matching sides and angles are equal.",
      method: "Compare the measurements, not their order: list each figure's sides from smallest to largest (or its radius) and check they match exactly. The same shape at a different size, or the same area or perimeter, is not enough.",
      alternatives: [
        { id: "trace", title: "Trace and place", kind: "conceptual", text: ["Trace one figure on thin paper and lay it on the other; you may turn it or flip it over.", "If every edge lies exactly on an edge, they are congruent."] },
        { id: "sort_sides", title: "Sort the measurements", kind: "procedural", text: ["Write each figure's sides in order of size: 4, 6, 7 and 7, 4, 6 both become 4, 6, 7.", "Equal lists mean congruent (for triangles this is the SSS rule)."] },
      ],
    },
    limits: "Triangles by their three sides, rectangles and circles; congruence by angles (SAS, ASA, RHS) is the amcrit family.",
  },
  // ============================================================ (a ± b)² and (a + b)(a − b)
  {
    id: "ahid",
    arity: 4,
    title: "Expanding with (a + b)², (a − b)² and (a + b)(a − b)",
    competency: IDN,
    type: "integer",
    mc: true,
    // [form, p, q, box]: form 0 (px + q)², 1 (px − q)², 2 (px + q)(px − q); box: which coefficient is asked (0 x², 1 x, 2 the number)
    parse: none,
    reject: (p) => (idOk(p) ? null : "(px ± q)² and (px + q)(px − q) with p from 1 to 5 and q from 1 to 9."),
    prompt: (p) => {
      const [form] = p;
      return `Use the identity ${IDENT[form]} to expand ${idLeft(p)}. ${idLeft(p)} = ${idRight(idCoef(p), p[3])}. What number goes in the box? (It may be negative.)`;
    },
    solve: (p) => {
      const [form, pp, q, box] = p;
      const c = idCoef(p);
      const steps = [
        { id: "a2", op: "square", competency: IDN, inputs: [ww(pp)], value: `${c[0]}x²` },
        ...(form === 2 ? [] : [{ id: "2ab", op: "multiply", competency: IDN, inputs: [2, ww(pp), q], value: `${c[1]}x` }]),
        { id: "b2", op: "square", competency: IDN, inputs: [q], value: c[2] },
      ];
      return { steps, answer: c[box] };
    },
    // independent: put the number in the box and compare both sides at two values of x
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [form, pp, q, box] = p;
      const c = idCoef(p).map((k, i) => (i === box ? v : k));
      return [2, 5].every((x) => {
        const left = form === 0 ? (pp * x + q) ** 2 : form === 1 ? (pp * x - q) ** 2 : (pp * x + q) * (pp * x - q);
        return left === c[0] * x * x + c[1] * x + c[2];
      });
    },
    bugs: (p) => {
      const [form, pp, q, box] = p;
      const c = idCoef(p);
      const k = (x: number) => (x === c[box] ? null : x);
      if (box === 0) return [Bq("p-not-squared", "procedural", IDN, `${ww(pp)} was not squared fully: (${ww(pp)})² = ${pp}x × ${pp}x = ${pp * pp}x².`, k(pp)), Bq("doubled-not-squared", "procedural", IDN, `${pp} was doubled instead of squared: ${pp}² = ${pp * pp}.`, k(2 * pp))];
      if (box === 1) return [Bq("middle-not-doubled", "conceptual", IDN, `The middle term was written as ab. The identity has 2ab: the two products ${ww(pp)} × ${q} and ${q} × ${ww(pp)} are both there.`, k(form === 0 ? pp * q : -pp * q)), Bq("middle-sign", "procedural", IDN, form === 1 ? "The middle term of (a − b)² is −2ab: it carries the minus sign." : "The middle term of (a + b)² is +2ab.", k(-c[1]))];
      return form === 2
        ? [Bq("sign-of-b2", "conceptual", IDN, "The last term of (a + b)(a − b) is −b²: the middle terms cancel and the product of +b and −b is negative.", k(q * q)), Bq("q-not-squared", "procedural", IDN, `${q} was not squared: b² = ${q} × ${q} = ${q * q}.`, k(-q))]
        : [Bq("minus-squared", "conceptual", IDN, `(−${q})² was written as −${q * q}. The square of a negative number is positive: the last term of (a − b)² is +b².`, form === 1 ? k(-(q * q)) : null), Bq("q-doubled", "procedural", IDN, `${q} was doubled instead of squared: b² = ${q} × ${q}.`, k(2 * q))];
    },
    variants: () => [],
    explain: (s) => (s.id === "a2" ? `a² = (${s.inputs[0]})² = ${s.value}` : s.id === "2ab" ? `2ab = 2 × ${s.inputs[1]} × ${s.inputs[2]} = ${s.value}` : `b² = ${s.inputs[0]}² = ${s.value}`),
    domain: [[0, 2], [1, 5], [1, 9], [0, 2]],
    keep: idOk,
    difficulty: ([form, p, , box]) => (p === 1 && box !== 0 ? 1 : form === 1 || box === 1 ? 2 : 3),
    word: (p) => {
      const [form, pp, q] = p;
      return form === 2
        ? `A square plot has sides of ${ww(pp)} metres. One pair of sides is made ${q} m longer and the other pair ${q} m shorter, making a rectangle (${ww(pp)} + ${q}) m by (${ww(pp)} − ${q}) m. Its area is ${idRight(idCoef(p), p[3])} square metres. What number goes in the box?`
        : `A square courtyard has sides of (${ww(pp)} ${form === 0 ? "+" : "−"} ${q}) metres. Its area is ${idLeft(p)} = ${idRight(idCoef(p), p[3])} square metres. What number goes in the box?`;
    },
    teach: {
      idea: "(a + b)² is the area of a square of side a + b: it splits into a square a², a square b² and two rectangles ab. So (a + b)² = a² + 2ab + b², (a − b)² = a² − 2ab + b², and (a + b)(a − b) = a² − b² because the two ab terms cancel.",
      method: "Decide what a and b are (a = px, b = q). Work out a², then 2ab (with its sign), then b², and write them in order.",
      alternatives: [
        { id: "area", title: "Draw the square", kind: "conceptual", text: ["Draw a square of side a + b and cut it into a² , b² and two rectangles a × b.", "The two rectangles are why the middle term is 2ab, not ab."], visual: () => ({ type: "grid", rows: 2, cols: 2 }) },
        { id: "multiply_out", title: "Multiply it out to check", kind: "procedural", text: ["Write (px + q)² as (px + q)(px + q) and multiply each term by each term.", "Collect the two middle products: they always come out equal."] },
      ],
    },
    limits: "Binomials px ± q with p up to 5 and q up to 9, asked one coefficient at a time (so that the unexpanded form is not accepted as an expansion).",
  },
  {
    id: "ahidn",
    arity: 3,
    title: "Quick calculation with identities",
    competency: IDN,
    type: "integer",
    mc: true,
    // [form, B, b]: with a = 10B: form 0 (a + b)², 1 (a − b)², 2 (a + b)(a − b)
    parse: none,
    reject: (p) => (numOk(p) ? null : "Numbers within 4 of a multiple of 10, up to 104."),
    prompt: ([form, B, b]) => {
      const a = 10 * B;
      return form === 0 ? `Use (a + b)² = a² + 2ab + b² to work out ${a + b}².` : form === 1 ? `Use (a − b)² = a² − 2ab + b² to work out ${a - b}².` : `Use (a + b)(a − b) = a² − b² to work out ${a + b} × ${a - b}.`;
    },
    solve: ([form, B, b]) => {
      const a = 10 * B;
      const ans = form === 0 ? a * a + 2 * a * b + b * b : form === 1 ? a * a - 2 * a * b + b * b : a * a - b * b;
      return { steps: [{ id: "split", op: "rewrite", competency: IDN, inputs: [a, b], value: form === 0 ? `(${a} + ${b})²` : form === 1 ? `(${a} − ${b})²` : `(${a} + ${b})(${a} − ${b})` }, { id: "use", op: "evaluate", competency: IDN, inputs: [a * a, 2 * a * b, b * b, form], value: ans }], answer: ans };
    },
    // independent: multiply the two numbers out in full, column by column
    validate: ([form, B, b], v) => {
      const a = 10 * B;
      const [x, y] = form === 0 ? [a + b, a + b] : form === 1 ? [a - b, a - b] : [a + b, a - b];
      let prod = 0;
      let place = 1;
      for (let t = y; t > 0; t = Math.floor(t / 10), place *= 10) prod += x * (t % 10) * place;
      return v === prod;
    },
    bugs: ([form, B, b]) => {
      const a = 10 * B;
      return form === 0
        ? [Bq("no-middle", "conceptual", IDN, `Only a² + b² was worked out. (${a} + ${b})² also has the middle term 2ab = 2 × ${a} × ${b} = ${2 * a * b}.`, a * a + b * b), Bq("middle-not-doubled", "procedural", IDN, `The middle term was taken as ab. It is 2ab = ${2 * a * b}.`, a * a + a * b + b * b)]
        : form === 1
          ? [Bq("as-difference", "conceptual", IDN, `(${a} − ${b})² was taken as ${a}² − ${b}². The square of a difference is a² − 2ab + b².`, a * a - b * b), Bq("minus-b2", "procedural", IDN, `The last term was subtracted. In (a − b)² the b² is added: (−b)² is positive.`, a * a - 2 * a * b - b * b)]
          : [Bq("plus-b2", "conceptual", IDN, `b² was added. (a + b)(a − b) = a² − b²: subtract ${b * b}.`, a * a + b * b), Bq("b-not-squared", "procedural", IDN, `${b} was taken away instead of ${b}² = ${b * b}.`, b * b === b ? null : a * a - b)];
    },
    variants: () => [],
    explain: (s) => (s.id === "split" ? `Write it as ${s.value}` : s.inputs[3] === 2 ? `${s.inputs[0]} − ${s.inputs[2]} = ${s.value}` : `${s.inputs[0]} ${s.inputs[3] === 0 ? "+" : "−"} ${s.inputs[1]} + ${s.inputs[2]} = ${s.value}`),
    domain: [[0, 2], [1, 10], [1, 4]],
    keep: numOk,
    difficulty: ([form, B]) => (form === 2 ? 1 : B <= 5 ? 2 : 3),
    word: ([form, B, b]) => {
      const a = 10 * B;
      return form === 2 ? `A hall has ${a + b} rows of ${a - b} chairs. Using (a + b)(a − b) = a² − b², how many chairs are there?` : `A square garden has sides of ${form === 0 ? a + b : a - b} m. Using ${form === 0 ? "(a + b)²" : "(a − b)²"}, what is its area, in square metres?`;
    },
    teach: {
      idea: "A number near a round number is easy to square with an identity: 103 = 100 + 3, so 103² = 100² + 2 × 100 × 3 + 3². Products like 103 × 97 are (100 + 3)(100 − 3) = 100² − 3².",
      method: "Write the number as a ± b with a a multiple of 10. Work out a², 2ab and b² (all easy) and combine them with the right signs.",
      alternatives: [
        { id: "area", title: "See it as an area", kind: "conceptual", text: ["103² is a 100 by 100 square, two 100 by 3 strips and a 3 by 3 corner.", "Add the parts: 10000 + 600 + 9."] },
        { id: "check_last_digit", title: "Check the last digit", kind: "procedural", text: ["The last digit of 103² must be the last digit of 3² = 9.", "If your answer ends in another digit, look for a slip."] },
      ],
    },
    limits: "Numbers within 4 of a multiple of 10 up to 104.",
  },
  // ============================================================ cube identities, (a + b + c)² and products of three binomials
  {
    id: "ahcube",
    arity: 5,
    title: "Expanding (x ± a)³, (x + a)(x + b)(x + c) and (x + ay + b)²",
    competency: IDN,
    type: "integer",
    mc: true,
    // [form, a, b, c, box]: see cubeCoef; box is the position of the coefficient asked
    parse: none,
    reject: (p) => (cubeOk(p) ? null : "(x ± a)³ with a up to 6, three binomials with numbers −6 to 6, (x + ay + b)² with a up to 5 and b up to 9."),
    prompt: (p) => `Expand ${cubeLeft(p)} using ${["(a + b)³ = a³ + 3a²b + 3ab² + b³", "(a − b)³ = a³ − 3a²b + 3ab² − b³", "(x + a)(x + b)(x + c) = x³ + (a + b + c)x² + (ab + bc + ca)x + abc", "(a + b + c)² = a² + b² + c² + 2ab + 2bc + 2ca"][p[0]]}. ${cubeLeft(p)} = ${cubeRight(p)}. What number goes in the box? (It may be negative.)`,
    solve: (p) => {
      const { coef } = cubeCoef(p);
      return { steps: [{ id: "identity", op: "substitute", competency: IDN, inputs: [cubeLeft(p)], value: cubeRight(p).replace("□", String(coef[p[4]])) }], answer: coef[p[4]] };
    },
    // independent: put the number in the box and compare both sides at several points
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const { terms, coef } = cubeCoef(p);
      const c = coef.map((k, i) => (i === p[4] ? v : k));
      return [[2, 3], [-1, 5], [4, -2]].every(([x, y]) => near(terms.reduce((s, t, i) => s + c[i] * cubeMono(t, x, y), 0), cubeEval(p, x, y)));
    },
    bugs: (p) => {
      const [form, a, b, c, box] = p;
      const { coef } = cubeCoef(p);
      const ans = coef[box];
      const k = (x: number) => (x === ans ? null : x);
      if (form <= 1) return box === 3 ? [Bq("cube-sign", "conceptual", IDN, form === 1 ? `(−${a})³ is negative: −${a ** 3}.` : `${a}³ = ${a} × ${a} × ${a} = ${a ** 3}.`, k(form === 1 ? a ** 3 : 3 * a)), Bq("cube-as-square", "procedural", IDN, `${a} was squared instead of cubed.`, k(form === 1 ? -(a * a) : a * a))] : [Bq("no-three", "conceptual", IDN, `The 3 in the identity was left out: the coefficient is 3 × ${box === 1 ? a : `${a}²`}${form === 1 && box === 1 ? " with a minus sign" : ""}.`, k(box === 1 ? (form === 1 ? -a : a) : a * a)), Bq("square-pattern", "procedural", IDN, "The pattern of (a + b)² (2ab) was used. In a cube the middle coefficients are 3a²b and 3ab².", k(box === 1 ? (form === 1 ? -2 * a : 2 * a) : 2 * a))];
      if (form === 2) return box === 1 ? [Bq("product-for-sum", "procedural", IDN, `The x² coefficient is the SUM ${a} + ${b} + ${c}; the product is the number at the end.`, k(a * b * c))] : box === 2 ? [Bq("two-products", "procedural", IDN, "Only some of the pair products were added. The x coefficient is ab + bc + ca: all three pairs.", k(a * b + b * c)), Bq("sum-for-pairs", "procedural", IDN, "The sum a + b + c belongs to x²; the x coefficient is the sum of the products of pairs.", k(a + b + c))] : [Bq("sum-for-product", "procedural", IDN, "The number at the end is the product abc, not the sum.", k(a + b + c))];
      return [Bq("no-doubling", "conceptual", IDN, "The cross term was not doubled. (a + b + c)² has 2ab + 2bc + 2ca.", k(ans / 2)), Bq("cross-forgotten", "procedural", IDN, "A cross term was missed out (counted as 0); every pair of the three terms gives a doubled product.", k(0))];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} = ${s.value}`,
    domain: [[0, 3], [-6, 6], [-6, 9], [-6, 6], [1, 5]],
    keep: cubeOk,
    cap: 400,
    // level@1: (x ± a)³, (x + a)(x + b)(x + c) and (a + b + c)² are Class 9 identities (NCERT 9, Polynomials)
    grade: () => 9,
    difficulty: ([form]) => (form === 0 ? 1 : form === 2 ? 2 : 3),
    word: (p) => (p[0] <= 1 ? `A cube-shaped box has edges of (x ${p[0] === 0 ? "+" : "−"} ${p[1]}) cm. Its volume is ${cubeLeft(p)} = ${cubeRight(p)} cubic cm. What number goes in the box?` : p[0] === 2 ? `A cuboid tank measures (x ${signed(p[1])}) m by (x ${signed(p[2])}) m by (x ${signed(p[3])}) m. Its volume is ${cubeRight(p)} cubic metres. What number goes in the box?` : `A square mat has sides of ${cubeLeft(p).slice(0, -1)} metres (x, y in metres). Its area is ${cubeRight(p)} square metres. What number goes in the box?`),
    teach: {
      idea: "(a + b)³ = (a + b)(a + b)²: multiplying out gives a³ + 3a²b + 3ab² + b³. (x + a)(x + b)(x + c) collects the sum of the numbers, the sum of their pair products and their product. (a + b + c)² has each square and every pair product twice.",
      method: "Name the parts (a, b, c), then fill the identity term by term, keeping track of signs: (x − a)³ has alternating signs.",
      alternatives: [
        { id: "step_by_step", title: "Multiply two at a time", kind: "procedural", text: ["First expand two brackets, then multiply that by the third.", "Collect like terms carefully: write the powers of x in columns."] },
        { id: "check_number", title: "Check with a number", kind: "conceptual", text: ["Put x = 1 (and y = 1) into both sides.", "Both sides must give the same number; if not, a coefficient is wrong."] },
      ],
    },
    limits: "One coefficient asked at a time (so the unexpanded form is not accepted as the expansion); factorising with these identities is another family.",
  },
  // ============================================================ the converse of Pythagoras
  {
    id: "ahconv",
    arity: 4,
    title: "Is the triangle right-angled? The converse of Pythagoras",
    competency: PYTH,
    type: "choice",
    // [t, kind, order, ctx]: TRIPLES[t]; kind 0 the triple, 1 longest side + 1, 2 shortest side + 1; order: which place the longest side is listed; ctx 1 a real-life check
    parse: none,
    reject: (p) => (convOk(p) ? null : "Whole-number triangles with sides up to 66."),
    choices: convOpts,
    prompt: (p) => {
      const s = convSides(p);
      return p[3] === 0 ? `A triangle has sides ${s[0]} cm, ${s[1]} cm and ${s[2]} cm. Is it a right-angled triangle?` : `A mason checks the corner of a wall. He marks a point ${s[0]} cm from the corner along one wall and a point ${s[1]} cm from the corner along the other, and the two marks are ${s[2]} cm apart. Is the corner a right angle?`;
    },
    solve: (p) => {
      const s = [...convSides(p)].sort((a, b) => a - b);
      const right = s[0] ** 2 + s[1] ** 2 === s[2] ** 2;
      return { steps: [{ id: "longest", op: "compare", competency: PYTH, inputs: convSides(p), value: s[2] }, { id: "squares", op: "add", competency: PYTH, inputs: [s[0] ** 2, s[1] ** 2], value: s[0] ** 2 + s[1] ** 2 }, { id: "test", op: "compare", competency: PYTH, inputs: [s[0] ** 2 + s[1] ** 2, s[2] ** 2], value: right ? "equal" : "not equal" }], answer: convOpts(p).indexOf(CONV_CH[right ? 0 : 1]) };
    },
    // independent: work out the largest angle with the cosine rule and see whether it is 90°
    validate: (p, v) => {
      const [x, y, z] = [...convSides(p)].sort((a, b) => a - b);
      const ang = (Math.acos((x * x + y * y - z * z) / (2 * x * y)) * 180) / Math.PI;
      return typeof v === "number" && convOpts(p)[v] === CONV_CH[Math.abs(ang - 90) < 1e-9 ? 0 : 1];
    },
    bugs: (p) => {
      const [, kind, order] = p;
      const s = convSides(p);
      const o = convOpts(p);
      const out: Bug[] = [];
      if (kind === 0 && order !== 0) out.push(Bq("last-side-as-longest", "procedural", PYTH, `The last side listed (${s[2]}) was used as the longest. The test uses the LONGEST side: is the square of ${Math.max(...s)} equal to the sum of the squares of the other two?`, o.indexOf(CONV_CH[1])));
      if (kind !== 0) out.push(Bq("nearly-equal", "conceptual", PYTH, "The two sides of the test came out close, so it was taken as right-angled. The converse needs them EXACTLY equal; if they differ at all, the angle is not 90°.", o.indexOf(CONV_CH[0])));
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "longest" ? `The longest side is ${s.value}` : s.id === "squares" ? `The squares of the other two add to ${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : `${s.inputs[0]} and ${s.inputs[1]} are ${s.value}, so ${s.value === "equal" ? "the angle opposite the longest side is 90°" : "the triangle is not right-angled"}`),
    domain: [[0, TRIPLES.length - 1], [0, 2], [0, 2], [0, 1]],
    keep: convOk,
    cap: 360,
    difficulty: ([, kind, order]) => (kind === 0 && order === 0 ? 1 : kind === 0 ? 3 : 2),
    word: (p) => {
      const s = convSides(p);
      return `${name(s[0])} makes a triangular frame for a kite from three sticks ${s[0]} cm, ${s[1]} cm and ${s[2]} cm long. Will one corner of the frame be a right angle?`;
    },
    teach: {
      idea: "The converse of Baudhayana–Pythagoras: if the square of the longest side equals the sum of the squares of the other two, the angle opposite the longest side is a right angle. If not, there is no right angle.",
      method: "Find the longest side. Square it, and add the squares of the other two. Equal: right-angled. Not equal, even by a little: not right-angled.",
      alternatives: [
        { id: "rope", title: "The knotted rope", kind: "conceptual", text: ["Builders once made a right angle with a rope of 12 equal parts, pegged into a triangle 3, 4, 5.", "Because 3² + 4² = 5², the corner between the 3 and the 4 is a right angle."] },
        { id: "triples", title: "Look for a known triple", kind: "procedural", text: ["Divide the sides by a common factor: 30, 40, 50 → 3, 4, 5.", "If you get a known triple (3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), it is right-angled."] },
      ],
    },
    limits: "Whole-number sides; proving the converse is an educator-marked task.",
  },
  // ============================================================ generating Pythagorean triples
  {
    id: "ahgen",
    arity: 3,
    title: "Generating Pythagorean triples by a rule",
    competency: PYTH,
    type: "integer",
    mc: true,
    // [mode, m, n]: 0/1: the triple 2m, m² − 1, m² + 1, asking the largest (0) or the middle (1) number; 2–4: m² − n², 2mn, m² + n² asking that member
    parse: none,
    reject: (p) => (genOk(p) ? null : "m from 2 to 20 for 2m, m² − 1, m² + 1; m > n with m up to 9 for m² − n², 2mn, m² + n²."),
    prompt: ([mode, m, n]) =>
      mode <= 1
        ? `For any whole number m greater than 1, the numbers 2m, m² − 1 and m² + 1 form a Pythagorean triple. Find the triple that contains ${2 * m} as its even member 2m. What is its ${mode === 0 ? "largest" : "other smaller"} number?`
        : `The numbers m² − n², 2mn and m² + n² form a Pythagorean triple for whole numbers m > n. Take m = ${m} and n = ${n}. What is ${["m² − n²", "2mn", "m² + n²"][mode - 2]}?`,
    solve: (p) => {
      const [mode, m, n] = p;
      return mode <= 1 ? { steps: [{ id: "m", op: "divide", competency: PYTH, inputs: [2 * m, 2], value: m }, { id: "member", op: "evaluate", competency: PYTH, inputs: [mode === 0 ? "m² + 1" : "m² − 1", m], value: genAns(p) }], answer: genAns(p) } : { steps: [{ id: "member", op: "evaluate", competency: PYTH, inputs: [["m² − n²", "2mn", "m² + n²"][mode - 2], `${m}, ${n}`], value: genAns(p) }], answer: genAns(p) };
    },
    // independent: the three numbers must satisfy a² + b² = c² (with the other two members worked out)
    validate: ([mode, m, n], v) => {
      if (typeof v !== "number") return false;
      if (mode === 0) return (2 * m) ** 2 + (v - 2) ** 2 === v * v && v > 2 * m;
      if (mode === 1) return (2 * m) ** 2 + v * v === (v + 2) ** 2;
      const t = [m * m - n * n, 2 * m * n, m * m + n * n];
      t[mode - 2] = v;
      return t[0] ** 2 + t[1] ** 2 === t[2] ** 2;
    },
    bugs: ([mode, m, n]) => {
      const ans = genAns([mode, m, n]);
      const k = (x: number) => (x === ans || x <= 0 ? null : x);
      if (mode <= 1) return [Bq("m-is-2m", "procedural", PYTH, `2m = ${2 * m}, so m = ${m}; ${2 * m} itself was used as m.`, k(mode === 0 ? 4 * m * m + 1 : 4 * m * m - 1)), Bq("m-squared-only", "procedural", PYTH, `Only m² = ${m * m} was worked out; the rule says m² ${mode === 0 ? "+" : "−"} 1.`, k(m * m))];
      return [Bq("not-squared", "procedural", PYTH, "m and n were not squared (or 2mn was taken as 2m + n).", k(mode === 2 ? m - n : mode === 3 ? 2 * m + n : m + n)), Bq("other-member", "procedural", PYTH, `Another member of the triple was given; the question asks for ${["m² − n²", "2mn", "m² + n²"][mode - 2]}.`, k(genAns([mode === 4 ? 2 : mode + 1, m, n])))];
    },
    variants: () => [],
    explain: (s) => (s.id === "m" ? `2m = ${s.inputs[0]}, so m = ${s.value}` : `${s.inputs[0]} with ${s.inputs[1]}: ${s.value}`),
    domain: [[0, 4], [2, 20], [0, 8]],
    keep: genOk,
    difficulty: ([mode, m]) => (mode >= 2 ? 1 : m <= 10 ? 2 : 3),
    word: ([mode, m, n]) => (mode <= 1 ? `${name(m)} wants a right-angled garden bed with whole-number sides, one of them ${2 * m} m. Using the rule 2m, m² − 1, m² + 1, what is the ${mode === 0 ? "longest side" : "third side (not the longest)"} in metres?` : `A carpenter builds right-angled frames using the rule: sides m² − n², 2mn and m² + n². For m = ${m} and n = ${n}, how long is the side ${["m² − n²", "2mn", "m² + n²"][mode - 2]}, in cm?`),
    teach: {
      idea: "(m² + 1)² − (m² − 1)² = 4m² = (2m)², so 2m, m² − 1 and m² + 1 always form a Pythagorean triple. In the same way (m² + n²)² = (m² − n²)² + (2mn)².",
      method: "From the even member 2m, halve it to get m, then work out m² − 1 and m² + 1. With m and n given, substitute into the three expressions.",
      alternatives: [
        { id: "check", title: "Check the triple", kind: "procedural", text: ["Square the two smaller numbers and add them; square the largest.", "If they are equal, the triple is right."] },
        { id: "odd_squares", title: "From odd squares", kind: "conceptual", text: ["Every odd square is a sum of consecutive odd numbers: 9 = 1 + 3 + 5.", "When an odd square is itself the next odd number in such a sum, as 9 after 16 = 1 + 3 + 5 + 7, it gives 9 + 16 = 25: the triple 3, 4, 5."] },
      ],
    },
    limits: "The two classic rules; finding every triple with a given member is not asked.",
  },
  // ============================================================ recognising direct and inverse proportion
  {
    id: "ahvary",
    arity: 2,
    title: "Direct proportion, inverse proportion or neither?",
    competency: INV,
    type: "choice",
    // [kind, seed]: kind 0 inverse (xy fixed), 1 direct (y/x fixed), 2 both grow by adding, 3 one grows as the other falls by subtracting
    parse: none,
    reject: (p) => (varyOk(p) ? null : "Tables of four pairs of whole numbers."),
    choices: (p) => shuffled(`ahvary:${p}`, VARY),
    prompt: () => "The table shows pairs of values of two quantities x and y. Are x and y in direct proportion, in inverse proportion, or neither?",
    solve: ([kind, seed]) => {
      const rows = varyRows(kind, seed);
      const ans = VARY[kind === 0 ? 0 : kind === 1 ? 1 : 2];
      return { steps: [{ id: "products", op: "multiply", competency: INV, inputs: rows.map((r) => r[0] * r[1]), value: rows.map((r) => r[0] * r[1]).join(", ") }, { id: "ratios", op: "divide", competency: PROP, inputs: rows.map((r) => r[1] / r[0]), value: rows.map((r) => fmt(r[1] / r[0])).join(", ") }, { id: "decide", op: "classify", competency: INV, inputs: [], value: ans }], answer: shuffled(`ahvary:${[kind, seed]}`, VARY).indexOf(ans) };
    },
    // independent: test the definitions on the table itself: all products equal (inverse), all ratios equal (direct)
    validate: ([kind, seed], v) => {
      const rows = varyRows(kind, seed);
      const prodSame = rows.every((r) => r[0] * r[1] === rows[0][0] * rows[0][1]);
      const ratioSame = rows.every((r) => r[1] * rows[0][0] === rows[0][1] * r[0]);
      const ans = prodSame ? VARY[0] : ratioSame ? VARY[1] : VARY[2];
      return typeof v === "number" && shuffled(`ahvary:${[kind, seed]}`, VARY)[v] === ans;
    },
    bugs: ([kind, seed]) => {
      const o = shuffled(`ahvary:${[kind, seed]}`, VARY);
      return [
        [Bq("not-equal-steps", "conceptual", INV, "x and y do not change by equal steps, so it was taken as neither. Inverse proportion is about PRODUCTS: here x × y is the same in every row.", o.indexOf(VARY[2]))],
        [Bq("equal-steps-needed", "conceptual", PROP, "The steps between the numbers were compared. Direct proportion is about RATIOS: y ÷ x is the same in every row.", o.indexOf(VARY[2]))],
        [Bq("both-grow", "conceptual", PROP, "Both quantities grow, so they were taken as directly proportional. In direct proportion y ÷ x stays the same; here the same number is added instead, so the ratio changes.", o.indexOf(VARY[1]))],
        [Bq("one-falls", "conceptual", INV, "One quantity rises while the other falls, so it was taken as inverse proportion. In inverse proportion x × y stays the same; here the products change.", o.indexOf(VARY[0]))],
      ][kind];
    },
    variants: () => [],
    explain: (s) => (s.id === "products" ? `x × y in each row: ${s.value}` : s.id === "ratios" ? `y ÷ x in each row: ${s.value}` : `So: ${s.value}`),
    domain: [[0, 3], [0, 29]],
    keep: varyOk,
    difficulty: ([kind]) => (kind <= 1 ? 1 : kind === 2 ? 2 : 3),
    figure: ([kind, seed]) => ({ type: "table", head: ["x", ...varyRows(kind, seed).map((r) => String(r[0]))], rows: [["y", ...varyRows(kind, seed).map((r) => String(r[1]))]] }),
    // the same neutral situations for every kind, so the story does not give the answer away
    word: ([kind, seed]) => `${name(kind + seed)} reads two dials on ${["a machine in a factory", "a pump at a farm", "a model in the science lab", "a generator at a wedding hall"][(kind + seed) % 4]} several times and writes the readings in the table (dial x and dial y). Are the readings x and y in direct proportion, in inverse proportion, or neither?`,
    teach: {
      idea: "Two quantities are in inverse proportion when their product stays the same (double one, the other halves). They are in direct proportion when their ratio stays the same. One going up while the other goes down is not enough for inverse proportion.",
      method: "Multiply x × y in every row: all equal means inverse proportion. Divide y ÷ x in every row: all equal means direct proportion. Otherwise neither.",
      alternatives: [
        { id: "double", title: "Double and see", kind: "conceptual", text: ["Find two rows where x doubles (or triples).", "If y halves (or becomes a third), it is inverse; if y doubles too, it is direct."] },
        { id: "graph", title: "Picture the graph", kind: "conceptual", text: ["Direct proportion is a straight line through 0; inverse proportion is a curve that never meets the axes.", "A straight line that does not pass through 0 is neither."] },
      ],
    },
    limits: "Four pairs of whole numbers; quantities in proportion with a constant added are 'neither'.",
  },
  {
    id: "ahman",
    arity: 4,
    title: "Inverse proportion: workers and time, speed and time",
    competency: INV,
    type: "integer",
    mc: true,
    // [ctx, w1, d1, w2]: w1 (workers, km per hour, cows) take d1 (days, hours); how long for w2?
    parse: none,
    reject: (p) => (manOk(p) ? null : "Workers, cows (2 to 24) or speeds (30 to 80 km per hour) with a whole-number answer."),
    prompt: ([ctx, w1, d1, w2]) => `${MAN[ctx].thing(w1, d1)}. ${MAN[ctx].ask(w2)}`,
    solve: ([, w1, d1, w2]) => ({ steps: [{ id: "total", op: "multiply", competency: INV, inputs: [w1, d1], value: w1 * d1 }, { id: "share", op: "divide", competency: INV, inputs: [w1 * d1, w2], value: (w1 * d1) / w2 }], answer: (w1 * d1) / w2 }),
    // independent: the product stays the same: check v × w2 = w1 × d1 by repeated addition
    validate: ([, w1, d1, w2], v) => {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1) return false;
      let t = 0;
      for (let i = 0; i < w2; i++) t += v;
      return t === w1 * d1;
    },
    bugs: ([ctx, w1, d1, w2]) => {
      const ans = (w1 * d1) / w2;
      const direct = (d1 * w2) / w1;
      const diff = d1 - (w2 - w1);
      return [
        Bq("used-direct", "conceptual", INV, `It was treated as direct proportion (more ${ctx === 1 ? "speed" : ctx === 0 ? "workers" : "cows"}, more ${ctx === 1 ? "hours" : "days"}). Here more ${ctx === 1 ? "speed means less time" : ctx === 0 ? "workers means fewer days" : "cows means fewer days"}: the product stays the same.`, Number.isInteger(direct) && direct !== ans ? direct : null),
        Bq("take-away-difference", "conceptual", INV, `The difference ${Math.abs(w2 - w1)} was ${w2 > w1 ? "taken from" : "added to"} the ${ctx === 1 ? "hours" : "days"}. Inverse proportion multiplies and divides: ${w1} × ${d1} = ${w2} × ?.`, diff > 0 && diff !== ans ? diff : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `The whole job is ${s.inputs[0]} × ${s.inputs[1]} = ${s.value} (it stays the same)` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [2, 80], [2, 30], [2, 80]],
    keep: manOk,
    cap: 400,
    difficulty: ([, w1, , w2]) => (w2 % w1 === 0 || w1 % w2 === 0 ? 1 : 2),
    word: ([ctx, w1, d1, w2]) => MAN[ctx].word(w1, d1, w2),
    teach: {
      idea: "When one quantity goes up and the job stays the same, the other goes down in the same ratio: workers × days (or speed × time) is constant.",
      method: "Multiply the first pair to get the whole job (worker-days, or distance). Divide by the new number of workers (or the new speed).",
      alternatives: [
        { id: "unitary", title: "Go through one", kind: "procedural", text: ["If 6 workers take 10 days, 1 worker takes 6 × 10 = 60 days.", "Then 4 workers take 60 ÷ 4 = 15 days."] },
        { id: "sense_check", title: "Ask: more or less?", kind: "conceptual", text: ["More workers should finish SOONER; a faster car should take LESS time.", "If your answer goes the other way, the proportion was used the wrong way round."] },
      ],
    },
    limits: "One inverse proportion with a whole-number answer; two changes at once are the ahcomp family.",
  },
  {
    id: "ahcomp",
    arity: 2,
    title: "Compound variation: workers, hours and days",
    competency: INV,
    type: "integer",
    mc: true,
    // [ctx, seed]: ctx 0 workers × hours a day × days stays the same; ctx 1 workers × days is in proportion to the items made
    parse: none,
    reject: (p) => (compOk(p) ? null : "Two changes at once with a whole-number answer."),
    prompt: ([ctx, seed]) => {
      const d = compData(ctx, seed)!;
      return ctx === 0 ? `${d.m1} workers, working ${d.x1} hours a day, finish a job in ${d.d1} days. How many days will ${d.m2} workers take for the same job, working ${d.x2} hours a day?` : `${d.m1} weavers make ${d.x1} saris in ${d.d1} days. How many days will ${d.m2} weavers take to make ${d.x2} saris, working at the same rate?`;
    },
    solve: ([ctx, seed]) => {
      const d = compData(ctx, seed)!;
      return ctx === 0
        ? { steps: [{ id: "total", op: "multiply", competency: INV, inputs: [d.m1, d.x1, d.d1], value: d.m1 * d.x1 * d.d1 }, { id: "share", op: "divide", competency: INV, inputs: [d.m1 * d.x1 * d.d1, d.m2 * d.x2], value: d.d2 }], answer: d.d2 }
        : { steps: [{ id: "total", op: "multiply", competency: INV, inputs: [d.m1, d.d1, d.x2], value: d.m1 * d.d1 * d.x2 }, { id: "share", op: "divide", competency: INV, inputs: [d.m1 * d.d1 * d.x2, d.m2 * d.x1], value: d.d2 }], answer: d.d2 };
    },
    // independent: work per worker-hour (or per sari) must come out the same in both situations
    validate: ([ctx, seed], v) => {
      const d = compData(ctx, seed)!;
      if (typeof v !== "number") return false;
      return ctx === 0 ? d.m1 * d.x1 * d.d1 === d.m2 * d.x2 * v : d.m1 * d.d1 * d.x2 === d.m2 * v * d.x1;
    },
    bugs: ([ctx, seed]) => {
      const d = compData(ctx, seed)!;
      const ans = d.d2;
      const k = (x: number) => (Number.isInteger(x) && x > 0 && x !== ans ? x : null);
      return ctx === 0
        ? [Bq("hours-ignored", "procedural", INV, `Only the change in workers was used. The hours a day changed too (${d.x1} to ${d.x2}): fewer hours a day means more days.`, k((d.m1 * d.d1) / d.m2)), Bq("all-direct", "conceptual", INV, "Both changes were treated as direct proportion. More workers, or more hours a day, mean FEWER days: divide, do not multiply.", k((d.d1 * d.m2 * d.x2) / (d.m1 * d.x1)))]
        : [Bq("saris-ignored", "procedural", INV, `Only the change in weavers was used. The number of saris changed too (${d.x1} to ${d.x2}): more saris take more days.`, k((d.m1 * d.d1) / d.m2)), Bq("weavers-direct", "conceptual", INV, "More weavers were taken to need more days. More weavers finish SOONER: days go down in the same ratio as weavers go up.", k((d.d1 * d.m2 * d.x2) / (d.m1 * d.x1)))];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `The work stays in proportion: ${s.inputs.join(" × ")} = ${s.value}` : `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value} days`),
    domain: [[0, 1], [0, 199]],
    keep: compOk,
    difficulty: ([ctx]) => (ctx === 0 ? 2 : 3),
    word: ([ctx, seed]) => {
      const d = compData(ctx, seed)!;
      return ctx === 0 ? `To paint a school, ${d.m1} painters working ${d.x1} hours a day need ${d.d1} days. The headmaster can get ${d.m2} painters for ${d.x2} hours a day. How many days will the painting take?` : `In a handloom unit, ${d.m1} weavers make ${d.x1} saris in ${d.d1} days. For a wedding order of ${d.x2} saris, ${d.m2} weavers are available. How many days will they take?`;
    },
    teach: {
      idea: "With two changes, look at each separately: more workers or more hours a day mean fewer days (inverse); more work to do means more days (direct). The total work (worker-hours, or worker-days per item) stays the same.",
      method: "Write the total work for the first situation (workers × hours a day × days). The second situation needs the same total, so divide it by workers × hours a day. For items, scale by the new number of items first.",
      alternatives: [
        { id: "one_at_a_time", title: "Change one thing at a time", kind: "procedural", text: ["First change only the workers (inverse): days × old workers ÷ new workers.", "Then change only the hours (or items) and adjust again."] },
        { id: "table", title: "Use a table with arrows", kind: "conceptual", text: ["Make columns for workers, hours, days. Put arrows: up means up or down?", "Multiply the old days by each ratio in the direction the arrows say."] },
      ],
    },
    limits: "Two quantities changing together with a whole-number answer.",
  },
  // ============================================================ calendar and number-grid patterns
  {
    id: "ahcal",
    arity: 4,
    title: "Patterns in calendar and number-grid squares",
    competency: GEN,
    type: "integer",
    mc: true,
    // [grid, shape, dir, n]: see calSum; dir 0 find the sum, dir 1 find the smallest number from the sum
    parse: none,
    reject: (p) => (calOk(p) ? null : "2 × 2 and 3 × 3 squares on a calendar (7 a row) or a 1–100 grid (10 a row)."),
    prompt: (p) => {
      const [g, shape, dir, n] = p;
      const where = g === 0 ? "on a calendar page (7 dates in each row)" : "on a 1 to 100 number grid (10 numbers in each row)";
      const sq = shape === 0 ? "2 × 2 square of four numbers" : "3 × 3 square of nine numbers";
      return dir === 0 ? `A ${sq} is marked ${where}. Its smallest number is ${n}. Without adding them one by one, use an expression in n to find the sum of the numbers in the square.` : `A ${sq} is marked ${where}. Its numbers add up to ${calSum(p)}. What is the smallest number in the square?`;
    },
    solve: (p) => {
      const [g, shape, dir, n] = p;
      const w = calW(g);
      const expr = shape === 0 ? `4n + ${2 * w + 2}` : `9n + ${9 * (w + 1)}`;
      return dir === 0
        ? { steps: [{ id: "expr", op: "generalise", competency: GEN, inputs: [shape, w], value: expr }, { id: "sub", op: "substitute", competency: GEN, inputs: [expr, n], value: calSum(p) }], answer: calSum(p) }
        : { steps: [{ id: "expr", op: "generalise", competency: GEN, inputs: [shape, w], value: expr }, { id: "solve", op: "solve", competency: LIN, inputs: [`${expr} = ${calSum(p)}`], value: n }], answer: n };
    },
    // independent: build the square on the grid and add its numbers (or try each possible smallest number)
    validate: (p, v) => {
      const [g, shape, dir] = p;
      const w = calW(g);
      const k = shape === 0 ? 2 : 3;
      const sumFrom = (n: number) => {
        let t = 0;
        for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) t += n + i * w + j;
        return t;
      };
      if (typeof v !== "number") return false;
      if (dir === 0) return v === sumFrom(p[3]);
      for (let n = 1; n <= 100; n++) if (sumFrom(n) === calSum(p)) return v === n;
      return false;
    },
    bugs: (p) => {
      const [g, shape, dir, n] = p;
      const w = calW(g);
      const ans = dir === 0 ? calSum(p) : n;
      const k = (x: number) => (Number.isInteger(x) && x > 0 && x !== ans ? x : null);
      if (dir === 0) return shape === 0 ? [Bq("next-is-plus-one", "conceptual", GEN, `Each number was taken to be 1 more than the last: n, n + 1, n + 2, n + 3. The number below n is n + ${w}, because a row has ${w} numbers.`, k(4 * n + 6)), Bq("four-n", "procedural", GEN, `Only 4n was used; the numbers are n, n + 1, n + ${w} and n + ${w + 1}, so add ${2 * w + 2} too.`, k(4 * n))] : [Bq("centre-times-nine", "procedural", GEN, `9 × (the smallest number) was used. 9 times the MIDDLE number (${n + w + 1}) gives the sum.`, k(9 * n)), Bq("row-plus-one", "conceptual", GEN, `The numbers below were taken to go up by 1. Each row down adds ${w}.`, k(9 * n + 36))];
      return shape === 0 ? [Bq("divide-by-four", "procedural", GEN, `The sum was divided by 4, giving the average of the four numbers, not the smallest. Solve 4n + ${2 * w + 2} = ${calSum(p)}.`, k(calSum(p) / 4)), Bq("forgot-constant", "procedural", GEN, `The ${2 * w + 2} was added instead of taken away.`, k((calSum(p) + 2 * w + 2) / 4))] : [Bq("gave-centre", "procedural", GEN, `Sum ÷ 9 = ${calSum(p) / 9} is the MIDDLE number. The smallest is ${w + 1} less.`, k(calSum(p) / 9)), Bq("one-row-back", "procedural", GEN, `Only one row back was taken from the middle number; the smallest is one row up AND one column left.`, k(calSum(p) / 9 - w))];
    },
    variants: () => [],
    explain: (s) => (s.id === "expr" ? `With n the smallest, the square's numbers add up to ${s.value}` : s.id === "sub" ? `Put n = ${s.inputs[1]}: ${s.value}` : `Solve ${s.inputs[0]}: n = ${s.value}`),
    domain: [[0, 1], [0, 1], [0, 1], [1, 89]],
    keep: calOk,
    cap: 400,
    difficulty: ([, shape, dir]) => (shape === 0 && dir === 0 ? 1 : dir === 0 ? 2 : 3),
    figure: ([g, shape]) => {
      const w = calW(g);
      const k = shape === 0 ? 2 : 3;
      return { type: "table", head: Array.from({ length: k }, () => ""), rows: Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === 0 && j === 0 ? "n" : `n + ${i * w + j}`))) };
    },
    word: (p) => {
      const [g, shape, dir, n] = p;
      const where = g === 0 ? "the school calendar" : "the class's 1 to 100 number chart";
      return dir === 0 ? `${name(n)} draws a box round a ${shape === 0 ? "2 × 2" : "3 × 3"} block of numbers on ${where}. The smallest number in the box is ${n}. Using an expression in n instead of adding them one by one, what do the numbers in the box add up to?` : `${name(n)} draws a box round a ${shape === 0 ? "2 × 2" : "3 × 3"} block of numbers on ${where} and tells you the numbers add up to ${calSum(p)}. What is the smallest number in the box?`;
    },
    teach: {
      idea: `In a grid with w numbers in each row, the number to the right of n is n + 1 and the number below it is n + w. So every square of numbers can be written in terms of n, and its sum is an expression in n.`,
      method: "Write the numbers of the square in terms of n (as in the picture) and add them: a 2 × 2 square gives 4n + 2w + 2, a 3 × 3 square gives 9n + 9(w + 1). Substitute n, or solve the equation for n.",
      alternatives: [
        { id: "middle", title: "Use the middle", kind: "conceptual", text: ["In a 3 × 3 square the numbers balance round the middle one: the sum is 9 × the middle number.", "In a 2 × 2 square, the sum is 4 × the average of the smallest and largest."] },
        { id: "try_one", title: "Try one on a real calendar", kind: "procedural", text: ["Pick a square on a calendar, add its numbers, and compare with the expression.", "If they agree, the expression works for every square."] },
      ],
    },
    limits: "Sums of 2 × 2 and 3 × 3 squares on grids of 7 or 10 columns; products of diagonals and other patterns are written tasks.",
  },
  // ============================================================ floor plans on a coordinate grid
  {
    id: "ahmap",
    arity: 5,
    title: "Using a coordinate grid for a floor plan",
    competency: CART,
    type: "tuple",
    // [mode, x, y, w, h]: the hall ABCD with A(x, y), B(x + w, y), C(x + w, y + h), D(x, y + h); mode 0 the fourth corner D;
    // mode 1 a door half-way along wall AB; mode 2 a fan at the centre of the hall
    parse: none,
    reject: (p) => (mapOk(p) ? null : "Rectangular rooms 2 to 8 m by 2 to 6 m on a grid from −7 to 8."),
    prompt: ([mode, x, y, w, h]) => {
      const pt = (a: number, b: number) => tup([a, b]);
      const intro = "A floor plan of a house and its garden is drawn on a coordinate grid; each unit is 1 metre and the origin is the garden gate.";
      if (mode === 0) return `${intro} The rectangular hall ABCD has corners A${pt(x, y)}, B${pt(x + w, y)} and C${pt(x + w, y + h)}, as in the picture. What are the coordinates of corner D?`;
      if (mode === 1) return `${intro} The rectangular hall has corners A${pt(x, y)}, B${pt(x + w, y)}, C${pt(x + w, y + h)} and D${pt(x, y + h)}. A door is exactly half-way along the wall AB. What are the coordinates of the door?`;
      return `${intro} The rectangular hall has corners A${pt(x, y)}, B${pt(x + w, y)}, C${pt(x + w, y + h)} and D${pt(x, y + h)}. A ceiling fan hangs over the exact centre of the hall. What are its coordinates?`;
    },
    solve: ([mode, x, y, w, h]) => {
      if (mode === 0) return { steps: [{ id: "same-x", op: "read", competency: CART, inputs: ["A", x], value: x }, { id: "same-y", op: "read", competency: CART, inputs: ["C", y + h], value: y + h }], answer: tup([x, y + h]) };
      if (mode === 1) return { steps: [{ id: "mid-x", op: "average", competency: CART, inputs: [x, x + w], value: x + w / 2 }], answer: tup([x + w / 2, y]) };
      return { steps: [{ id: "mid-x", op: "average", competency: CART, inputs: [x, x + w], value: x + w / 2 }, { id: "mid-y", op: "average", competency: CART, inputs: [y, y + h], value: y + h / 2 }], answer: tup([x + w / 2, y + h / 2]) };
    },
    // independent: mode 0, the four points must make a rectangle (equal opposite sides, a right angle at A);
    // modes 1 and 2, the point must be the same distance from the ends of the wall (or from all four corners), on that wall or inside
    validate: ([mode, x, y, w, h], v) => {
      const q = nums(v);
      if (!q || q.length !== 2) return false;
      const [px, py] = q;
      const d2 = (a: number, b: number, c: number, d: number) => (a - c) ** 2 + (b - d) ** 2;
      if (mode === 0) {
        const [ax, ay, bx, by, cx, cy] = [x, y, x + w, y, x + w, y + h];
        return (bx - ax) * (px - ax) + (by - ay) * (py - ay) === 0 && d2(px, py, cx, cy) === d2(ax, ay, bx, by) && d2(px, py, ax, ay) === d2(bx, by, cx, cy);
      }
      if (mode === 1) return py === y && d2(px, py, x, y) === d2(px, py, x + w, y);
      const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => d2(px, py, a, b));
      return c.every((t) => t === c[0]);
    },
    bugs: ([mode, x, y, w, h]) => {
      if (mode === 0) return [Bq("wrong-corner", "procedural", CART, "B and C were added and A taken away, which finds a point across from A. D is next to A and C: it has A's x-coordinate and C's y-coordinate.", tup([x + 2 * w, y + h])), Bq("swapped", "conceptual", CART, "The coordinates were written in the wrong order. A point is (x, y): across first, then up.", x === y + h ? null : tup([y + h, x]))];
      if (mode === 1) return [Bq("added-not-halved", "procedural", CART, "The x-coordinates of A and B were added but not halved. Half-way is the average: (first + second) ÷ 2.", tup([2 * x + w, y])), Bq("half-the-width", "procedural", CART, `Half the width (${w / 2}) was given as the x-coordinate. Start from A's x-coordinate and add half the width.`, x === 0 ? null : tup([w / 2, y]))];
      return [Bq("half-sizes", "procedural", CART, `Half the length and half the width were given as the coordinates. Start at corner A ${tup([x, y])} and move half way across and half way up.`, x === 0 && y === 0 ? null : tup([w / 2, h / 2])), Bq("corner-c", "procedural", CART, "The far corner was given. The centre is half way between A and C.", tup([x + w, y + h]))];
    },
    variants: () => [],
    explain: (s) => (s.id === "same-x" ? `D is straight above A, so its x-coordinate is A's: ${s.value}` : s.id === "same-y" ? `D is level with C, so its y-coordinate is C's: ${s.value}` : `Half-way between ${s.inputs[0]} and ${s.inputs[1]} is ${s.value}`),
    domain: [[0, 2], [-7, 2], [-6, 2], [2, 8], [2, 6]],
    keep: mapOk,
    cap: 400,
    difficulty: ([mode, x, y]) => (mode === 0 && x >= 0 && y >= 0 ? 1 : mode === 0 ? 2 : 3),
    figure: ([mode, x, y, w, h]) => ({ type: "plane", points: [[x, y, "A"], [x + w, y, "B"], [x + w, y + h, "C"], ...(mode === 0 ? [] : [[x, y + h, "D"]]), [0, 0, "gate"]], segments: mode === 0 ? [[[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]]] : [[[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]], [[x + w, y + h], [x, y + h]], [[x, y + h], [x, y]]], range: 9 }),
    word: ([mode, x, y, w, h]) => `A village map is drawn on a grid with the bus stop at the origin and 1 unit = 100 m. A rectangular playground has corners A${tup([x, y])}, B${tup([x + w, y])}, C${tup([x + w, y + h])}${mode === 0 ? "" : ` and D${tup([x, y + h])}`}. ${mode === 0 ? "What are the coordinates of its fourth corner D?" : mode === 1 ? "A gate is exactly half-way along the side AB. What are the gate's coordinates?" : "A flagpole stands at the exact centre of the playground. What are its coordinates?"}`,
    teach: {
      idea: "A grid turns a plan into numbers: each place is (across, up) from the origin. Walls of a rectangular room run along grid lines, so corners share x- or y-coordinates.",
      method: "Fourth corner: it lines up with one corner across and with another up and down, so copy those coordinates. Half-way: average the two x-coordinates and the two y-coordinates.",
      alternatives: [
        { id: "walk", title: "Walk it on the grid", kind: "procedural", text: ["From A, walk along the wall to B: count the steps across.", "From A, walk up to D: the same number of steps as from B up to C."] },
        { id: "sketch", title: "Sketch the room", kind: "conceptual", text: ["Mark the three corners you know on squared paper.", "Complete the rectangle; read the last corner's coordinates."] },
      ],
    },
    limits: "Rectangular rooms with sides along the grid lines; rooms at a slant are not included.",
  },
  // ============================================================ explicit and recursive rules
  {
    id: "ahexp",
    arity: 3,
    title: "From an explicit rule to its terms and its recursive rule",
    competency: SEQ,
    type: "tuple",
    // [mode, a, b]: 0 tₙ = an + b, give (t₁, t₂, t₃); 1 tₙ = an + b, give (t₁, d) for t₁ and tₙ = tₙ₋₁ + d; 2 tₙ = b × aⁿ⁻¹, give (t₁, r) for t₁ and tₙ = r × tₙ₋₁
    parse: none,
    reject: (p) => (expOk(p) ? null : "Linear rules an + b with a from −5 to 9 (not 0 or 1) and b from −9 to 9 (not 0); geometric rules b × aⁿ⁻¹."),
    prompt: ([mode, a, b]) =>
      mode === 0
        ? `A sequence has the explicit rule ${linText(a, b)}. Write its first three terms (t₁, t₂, t₃).`
        : mode === 1
          ? `A sequence has the explicit rule ${linText(a, b)}. Write the same sequence with a recursive rule: t₁ = ?, and tₙ = tₙ₋₁ + d for n ≥ 2. Give the pair (t₁, d).`
          : `A sequence has the explicit rule tₙ = ${b === 1 ? "" : `${b} × `}${a}ⁿ⁻¹. Write it with a recursive rule: t₁ = ?, and tₙ = r × tₙ₋₁ for n ≥ 2. Give the pair (t₁, r).`,
    solve: ([mode, a, b]) => {
      if (mode === 0) return { steps: [1, 2, 3].map((n) => ({ id: `t${n}`, op: "substitute", competency: SEQ, inputs: [n], value: a * n + b })), answer: tup([a + b, 2 * a + b, 3 * a + b]) };
      if (mode === 1) return { steps: [{ id: "t1", op: "substitute", competency: SEQ, inputs: [1], value: a + b }, { id: "d", op: "subtract", competency: SEQ, inputs: [2 * a + b, a + b], value: a }], answer: tup([a + b, a]) };
      return { steps: [{ id: "t1", op: "substitute", competency: SEQ, inputs: [1], value: b }, { id: "r", op: "divide", competency: SEQ, inputs: [a * b, b], value: a }], answer: tup([b, a]) };
    },
    // independent: generate six terms from the answer (directly, or by the recursive rule) and compare with the explicit rule
    validate: ([mode, a, b], v) => {
      const q = nums(v);
      if (!q) return false;
      const explicit = (n: number) => (mode === 2 ? b * a ** (n - 1) : a * n + b);
      if (mode === 0) return q.length === 3 && q.every((t, i) => t === explicit(i + 1));
      if (q.length !== 2) return false;
      let t = q[0];
      for (let n = 1; n <= 6; n++) {
        if (t !== explicit(n)) return false;
        t = mode === 1 ? t + q[1] : t * q[1];
      }
      return true;
    },
    bugs: ([mode, a, b]) => {
      if (mode === 0) return [Bq("start-at-zero", "procedural", SEQ, "The terms were started at n = 0. The first term is t₁: put n = 1, 2, 3.", tup([b, a + b, 2 * a + b])), Bq("added-b-only", "procedural", SEQ, `a and n were added instead of multiplied: ${a}n means ${a} × n.`, a === 2 ? null : tup([a + 1 + b, a + 2 + b, a + 3 + b]))];
      if (mode === 1) return [Bq("b-as-t1", "procedural", SEQ, `The constant ${b} was taken as the first term. t₁ = ${a} × 1 ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${a + b}.`, tup([b, a])), Bq("b-as-d", "conceptual", SEQ, `The constant was taken as the step. The step d is the number multiplying n (${a}): each term is ${a} more than the one before.`, a + b === a ? null : tup([a + b, b]))];
      return [Bq("t1-times-r", "procedural", SEQ, `t₁ was taken as ${b} × ${a}. For n = 1 the power is ${a}⁰ = 1, so t₁ = ${b}.`, tup([a * b, a])), Bq("swapped", "procedural", SEQ, "The ratio and the first term were swapped.", a === b ? null : tup([a, b]))];
    },
    variants: () => [],
    explain: (s) => (s.id.startsWith("t") && s.id !== "t1" ? `t${s.inputs[0]} = ${s.value}` : s.id === "t1" ? `Put n = 1: t₁ = ${s.value}` : s.id === "d" ? `The step: t₂ − t₁ = ${s.inputs[0]} − ${s.inputs[1]} = ${s.value}` : `The ratio: t₂ ÷ t₁ = ${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [-5, 9], [-9, 9]],
    keep: expOk,
    difficulty: ([mode, a]) => (mode === 0 ? (a > 0 ? 1 : 2) : mode === 1 ? 2 : 3),
    // a fare only when it is positive and rises with the distance (a > 0, F₁ = a + b > 0); otherwise a temperature, which may
    // fall and go below zero
    word: ([mode, a, b]) =>
      mode === 2
        ? `The number of people who have heard a rumour after n hours is ${b === 1 ? "" : `${b} × `}${a}ⁿ⁻¹. Write this as a recursive rule: the number in hour 1, and how many times bigger each hour is than the hour before. Give (t₁, r).`
        : a > 0 && a + b > 0
          ? `An auto-rickshaw's fare for an n km ride is ₹Fₙ, where ${linText(a, b).replace("tₙ", "Fₙ")}. ${mode === 0 ? "Write the fares for 1, 2 and 3 km, in rupees, as (F₁, F₂, F₃)." : "Write this as a recursive rule: the fare for 1 km, and how much each extra km adds. Give (F₁, d)."}`
          : `In a science activity, the temperature of a liquid n hours after it is put in a freezer is Tₙ °C, where ${linText(a, b).replace("tₙ", "Tₙ")} (a negative temperature is below zero). ${mode === 0 ? "Write the temperatures after 1, 2 and 3 hours as (T₁, T₂, T₃)." : "Write this as a recursive rule: the temperature after 1 hour, and how much it changes each hour (negative for a fall). Give (T₁, d)."}`,
    teach: {
      idea: "An explicit rule gives any term straight from its position n; a recursive rule gives the first term and how each term comes from the one before. For tₙ = an + b each term is a more than the last; for tₙ = b × aⁿ⁻¹ each term is a times the last.",
      method: "Put n = 1, 2, 3 into the explicit rule to get the terms. The first term is t₁; the step d = t₂ − t₁ (or the ratio r = t₂ ÷ t₁).",
      alternatives: [
        { id: "table", title: "Make a table", kind: "procedural", text: ["Write n = 1, 2, 3, 4 in one row and tₙ under each.", "Look at how each term gets from the one before: that is the recursive rule."] },
        { id: "check_both", title: "Check that both rules agree", kind: "conceptual", text: ["Use your recursive rule to make the first five terms.", "Use the explicit rule for the same five; they must match exactly."] },
      ],
    },
    limits: "Linear and geometric explicit rules; recursive rules to explicit ones are the ahnth family.",
  },
  // ============================================================ a coefficient from a condition on the zeros
  {
    id: "ahzk",
    arity: 4,
    title: "Finding an unknown coefficient from a condition on the zeros",
    competency: PZEROS,
    type: "integer",
    mc: true,
    // [mode, a, s, c]: see zkPoly; the answer is k
    parse: none,
    reject: (p) => (zkOk(p) ? null : "Quadratics with real zeros and whole-number coefficients."),
    prompt: (p) => {
      const [mode, a, s, c] = p;
      const poly2 = `p(x) = ${zkPoly(p)}`;
      return mode === 0 ? `The sum of the zeros of ${poly2} is ${n_(s)}. Find k.` : mode === 1 ? `The product of the zeros of ${poly2} is ${n_(s)}. Find k.` : mode === 2 ? `One zero of ${poly2} is ${n_(a)}. Find k.` : `The zeros of ${poly2} are equal in size and opposite in sign (α = −β). Find k. (The other numbers are ${c} and ${c * c}.)`.replace(` (The other numbers are ${c} and ${c * c}.)`, "");
    },
    solve: (p) => {
      const [mode, a, s] = p;
      const k = zkAns(p);
      const step = mode === 0 ? { id: "sum", op: "relate", competency: PZEROS, inputs: ["−k/a", a, s], value: k } : mode === 1 ? { id: "product", op: "relate", competency: PZEROS, inputs: ["k/a", a, s], value: k } : mode === 2 ? { id: "substitute", op: "substitute", competency: PZEROS, inputs: [a, s], value: k } : { id: "sum0", op: "relate", competency: PZEROS, inputs: ["sum of zeros = 0", a], value: k };
      return { steps: [step], answer: k };
    },
    // independent: put k back, find the zeros with the quadratic formula, and check the condition numerically
    validate: (p, v) => {
      if (typeof v !== "number") return false;
      const [mode, a, s, c] = p;
      const [A, Bc, C] = mode === 0 ? [a, v, c] : mode === 1 ? [a, c, v] : mode === 2 ? [1, v, a * s] : [1, v - a, -(c * c)];
      const D = Bc * Bc - 4 * A * C;
      if (D < 0) return false;
      const r1 = (-Bc + Math.sqrt(D)) / (2 * A);
      const r2 = (-Bc - Math.sqrt(D)) / (2 * A);
      if (mode === 0) return near(r1 + r2, s);
      if (mode === 1) return near(r1 * r2, s);
      if (mode === 2) return near(r1, a) || near(r2, a);
      return near(r1, -r2) && !near(r1, 0);
    },
    bugs: (p) => {
      const [mode, a, s] = p;
      const k = zkAns(p);
      const q = (x: number) => (Number.isInteger(x) && x !== k ? x : null);
      if (mode === 0) return [Bq("sign", "conceptual", PZEROS, "The sum of the zeros is −b/a: the minus sign was left out.", q(a * s)), Bq("forgot-a", "procedural", PZEROS, `The coefficient of x² (${a}) was left out: sum = −k/${a}.`, a === 1 ? null : q(-s))];
      if (mode === 1) return [Bq("divided-by-a", "procedural", PZEROS, `The product of the zeros is c/a = k/${a}, so k = ${a} × ${n_(s)}; it was divided instead.`, Number.isInteger(s / a) ? q(s / a) : null), Bq("sign", "conceptual", PZEROS, "The product of the zeros is +c/a; a minus sign was added.", q(-a * s))];
      if (mode === 2) return [Bq("sign", "conceptual", PZEROS, `The sum of the zeros is −k, so k = −(${n_(a)} + ${n_(s)}); the minus was left out.`, q(a + s)), Bq("one-zero-only", "procedural", PZEROS, `Only the zero ${n_(a)} was used for k. Substitute x = ${n_(a)} into p(x) = 0 and solve for k.`, q(-a))];
      return [Bq("sign", "procedural", PZEROS, `The coefficient of x must be 0, so k − ${n_(a)} = 0 means k = ${n_(a)}; the sign was changed.`, q(-a))];
    },
    variants: () => [],
    explain: (s) => (s.id === "sum" ? `Sum of the zeros = −k/${s.inputs[1]} = ${n_(Number(s.inputs[2]))}, so k = ${n_(Number(s.value))}` : s.id === "product" ? `Product of the zeros = k/${s.inputs[1]} = ${n_(Number(s.inputs[2]))}, so k = ${n_(Number(s.value))}` : s.id === "substitute" ? `The zeros are ${n_(Number(s.inputs[0]))} and ${n_(Number(s.inputs[1]))} (their product is the constant term), so k = −(sum) = ${n_(Number(s.value))}` : `Opposite zeros add to 0, so the coefficient of x is 0: k = ${n_(Number(s.value))}`),
    domain: [[0, 3], [-9, 9], [-6, 6], [-9, 9]],
    keep: zkOk,
    cap: 400,
    difficulty: ([mode, a]) => (mode === 3 ? 1 : mode === 2 || a === 1 ? 2 : 3),
    teach: {
      idea: "For ax² + bx + c the zeros α, β satisfy α + β = −b/a and αβ = c/a. A condition on the zeros therefore becomes an equation for the unknown coefficient.",
      method: "Write the condition with the relations: sum = −b/a, product = c/a, or substitute a known zero into p(x) = 0. Solve the equation for k.",
      alternatives: [
        { id: "substitute", title: "Substitute a zero", kind: "procedural", text: ["If r is a zero, then p(r) = 0.", "Put x = r into the polynomial and solve the resulting equation for k."] },
        { id: "factor_form", title: "Use the factor form", kind: "conceptual", text: ["p(x) = a(x − α)(x − β) = a x² − a(α + β)x + aαβ.", "Compare coefficients with the given polynomial."] },
      ],
    },
    limits: "Quadratics with whole-number coefficients and real zeros; cubics and conditions like α² + β² are other families.",
  },
  // ============================================================ perfect squares and their last digits
  {
    id: "ahpsq",
    arity: 2,
    title: "Is it a perfect square? Last digits of squares",
    competency: SQRT,
    type: "choice",
    // [mode, m]: mode 0: which of four numbers is a perfect square (m² is); mode 1: the last digit of m²
    parse: none,
    reject: (p) => (psqOk(p) ? null : "Squares of 11 to 60 among near numbers; last digits of squares of 11 to 99."),
    choices: (p) => psqOpts(p).opts,
    prompt: ([mode, m]) => (mode === 0 ? "Exactly one of these numbers is a perfect square. Which one?" : `Without working out the whole square, which digit does ${m}² end in?`),
    solve: (p) => {
      const [mode, m] = p;
      const { opts, right } = psqOpts(p);
      return { steps: mode === 0 ? [{ id: "last-digits", op: "rule-out", competency: SQRT, inputs: opts, value: "a square never ends in 2, 3, 7 or 8" }, { id: "root", op: "square-root", competency: SQRT, inputs: [m * m], value: m }] : [{ id: "units", op: "square", competency: SQRT, inputs: [m % 10], value: (m % 10) ** 2 }], answer: opts.indexOf(right) };
    },
    // independent: test each option by searching for a whole number whose square it is (or square the number in full)
    validate: ([mode, m], v) => {
      const { opts } = psqOpts([mode, m]);
      if (typeof v !== "number" || !opts[v]) return false;
      if (mode === 1) return String(m * m).slice(-1) === opts[v];
      const isSquare = (x: number) => {
        for (let k = 1; k * k <= x; k++) if (k * k === x) return true;
        return false;
      };
      return opts.filter((o) => isSquare(Number(o))).length === 1 && isSquare(Number(opts[v]));
    },
    bugs: (p) => {
      const [mode, m] = p;
      const { opts, right, good, same } = psqOpts(p);
      if (mode === 0) return [Bq("last-digit-enough", "conceptual", SQRT, `${good} ends in a digit that squares can end in, but that only rules numbers OUT; it does not prove ${good} is a square. Check it: it lies between two neighbouring squares.`, opts.indexOf(good)), Bq("ends-badly", "recall", SQRT, `${same} ends in ${Number(same) % 10}. No perfect square ends in 2, 3, 7 or 8.`, opts.indexOf(same))];
      return [...(good !== right ? [Bq("doubled", "procedural", SQRT, `The last digit was doubled instead of squared: ${m % 10} × ${m % 10} = ${(m % 10) ** 2}, which ends in ${right}.`, opts.indexOf(good))] : []), ...(same !== right ? [Bq("same-digit", "conceptual", SQRT, `The square was taken to end in the same digit as ${m}. Only the last digit of ${m % 10} × ${m % 10} matters: ${(m % 10) ** 2}.`, opts.indexOf(same))] : [])];
    },
    variants: () => [],
    explain: (s) => (s.id === "last-digits" ? `Rule out by last digits: ${s.value}` : s.id === "root" ? `${s.inputs[0]} = ${s.value} × ${s.value}` : `The last digit of ${s.inputs[0]} × ${s.inputs[0]} = ${s.value}`),
    domain: [[0, 1], [11, 99]],
    keep: psqOk,
    difficulty: ([mode, m]) => (mode === 1 ? 1 : m <= 31 ? 2 : 3),
    teach: {
      idea: "The last digit of a square depends only on the last digit of the number: 0, 1, 4, 5, 6 or 9. So a number ending in 2, 3, 7 or 8 is never a perfect square; a number ending in another digit may or may not be one.",
      method: "Rule out the numbers ending in 2, 3, 7 or 8. For the others, find the two squares the number lies between (e.g. 30² = 900 and 31² = 961); a perfect square must be one of them exactly.",
      alternatives: [
        { id: "table", title: "Make a last-digit table", kind: "procedural", text: ["Square 0 to 9: 0, 1, 4, 9, 16, 25, 36, 49, 64, 81.", "The last digits 0, 1, 4, 5, 6, 9 are the only ones a square can have."], visual: () => ({ type: "table", head: ["Last digit of n", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], rows: [["Last digit of n²", "0", "1", "4", "9", "6", "5", "6", "9", "4", "1"]] }) },
        { id: "between", title: "Squeeze between squares", kind: "conceptual", text: ["Every number lies between two neighbouring squares.", "If it is not equal to one of them, it is not a perfect square."] },
      ],
    },
    limits: "Numbers up to about 3600; zeros at the end (an odd number of zeros means not a square) are not included.",
  },
  // ============================================================ square roots of non-perfect squares to one decimal place
  {
    id: "ahsqd",
    arity: 1,
    title: "The square root of a non-square, to one decimal place",
    competency: SQRT,
    type: "fraction",
    mc: true,
    decimals: true,
    parse: none,
    reject: (p) => (sqdOk(p) ? null : "Whole numbers from 2 to 200 that are not perfect squares."),
    prompt: ([n]) => `Find √${n} correct to one decimal place (use the long-division method, or squaring to check).`,
    solve: ([n]) => {
      const { digits, hundredths } = sqrtDigits(n);
      return { steps: [{ id: "digits", op: "long-division", competency: SQRT, inputs: [n], value: `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}…` }, { id: "round", op: "round", competency: "MATH.number.rounding", inputs: [digits.length], value: sqdAns(n) }], answer: sqdAns(n) };
    },
    // independent: the answer must be within half a tenth of √n: (10v − 0.5)² ≤ 100n < (10v + 0.5)², in whole numbers
    validate: ([n], v) => {
      if (typeof v !== "number") return false;
      const t = Math.round(v * 10);
      if (Math.abs(v * 10 - t) > 1e-9) return false;
      return (2 * t - 1) ** 2 <= 400 * n && 400 * n < (2 * t + 1) ** 2;
    },
    bugs: ([n]) => {
      const ans = sqdAns(n);
      const trunc = Math.floor(sqrtDigits(n).hundredths / 10) / 10;
      const whole = Math.round(Math.sqrt(n));
      const half = Math.round(n / 2 * 10) / 10;
      return [
        Bq("truncated", "procedural", "MATH.number.rounding", "The digits were cut off after the first decimal place without rounding. Work out the second decimal place too, then round.", trunc === ans ? null : trunc),
        Bq("nearest-whole", "procedural", SQRT, "Only the nearest whole number was given. The square root lies between two whole numbers; find the tenths too.", whole),
        Bq("halved", "conceptual", SQRT, `${n} was halved. The square root is the number that, multiplied by ITSELF, gives ${n}.`, half === ans || n < 7 ? null : half),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "digits" ? `Long division gives √${s.inputs[0]} = ${s.value}` : `Rounded to one decimal place: ${s.value}`),
    domain: [[2, 200]],
    keep: sqdOk,
    difficulty: ([n]) => (n < 50 ? 1 : n < 120 ? 2 : 3),
    word: ([n]) => `A square plot of land has an area of ${n} square metres. How long is each side, in metres, correct to one decimal place?`,
    teach: {
      idea: "A non-square has a square root between two whole numbers that never ends as a decimal. The long-division method finds its digits one at a time; one more digit than needed lets you round.",
      method: "Pair the digits from the decimal point and use the long-division method to two decimal places, then round to one. Check: the square of your answer should be close to the number.",
      alternatives: [
        { id: "squeeze", title: "Squeeze between squares", kind: "procedural", text: ["Find the whole numbers: 7² = 49 < 55 < 64 = 8², so √55 is between 7 and 8.", "Try 7.4² = 54.76 and 7.5² = 56.25; 55 is closer to 54.76, and 7.45² = 55.5 > 55, so √55 ≈ 7.4."] },
        { id: "area", title: "Think of a square's side", kind: "conceptual", text: ["√n is the side of a square of area n.", "A bigger area needs a longer side, but the side grows more slowly than the area."] },
      ],
    },
    limits: "Whole numbers up to 200, to one decimal place; square roots of decimals are the aksqf family.",
  },
);
