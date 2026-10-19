/**
 * families@2, batch b08: Grades 6–8 algebra (one-step equations, simplifying expressions, number pyramids,
 * generalising patterns, recursive and explicit rules, inverse proportion, equations with fractions and with the
 * variable on both sides), the coordinate plane, and geometry (angle sum, exterior angle, isosceles triangles, the
 * triangle inequality, congruent triangles, parallel lines, Baudhayana-Pythagoras, angles at a point in a tiling).
 * Written by OpenPath; CC0.
 */
import type { Bug, Def, Value } from "../family-kit";
import { evaluate, parse } from "../answer-types";
import { fmt, gcd, near } from "../family-kit";

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
const keepPred = <T>(b: (Bug & { predict: T | null })[]) => b.filter((x) => x.predict !== null) as Bug[];

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
      return { steps: [{ id: `undo-${op}`, op, competency: LINI, inputs: [e.b, a], value: e.x }], answer: e.x };
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
    explain: (s) => (s.id === "x-terms" ? `x terms: ${n_(Number(s.inputs[0]))} + (${n_(Number(s.inputs[1]))}) = ${n_(Number(s.value))}, so ${poly([[Number(s.value), "x"]])}` : s.id === "y-terms" ? `y terms: ${n_(Number(s.inputs[0]))} + (${n_(Number(s.inputs[1]))}) = ${n_(Number(s.value))}, so ${poly([[Number(s.value), "y"]])}` : `Together: ${s.value}`),
    domain: [[1, 9], [-9, 9], [-9, 9], [-9, 9]],
    cap: 400,
    difficulty: ([, b, c, d]) => ([b, c, d].every((k) => k > 0) ? 1 : [b, c, d].filter((k) => k < 0).length === 1 ? 2 : 3),
    word: ([a, b, c, d]) => {
      const act = (k: number, item: string) => (k > 0 ? `buys ${k} ${item}${k === 1 ? "" : "s"}` : `returns ${-k} ${item}${k === -1 ? "" : "s"}`);
      return `A pen costs ₹x and a notebook costs ₹y. In one week ${name(a + b)} ${act(a, "pen")}, ${act(b, "notebook")}, ${act(c, "pen")} and ${act(d, "notebook")} (money for a returned item is given back). Write a simplified expression for the money ${name(a + b)} pays in all, in rupees.`;
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
    explain: (s) => (s.id === "open" ? `−(${s.inputs[0]}) = ${s.value}: every sign in the bracket changes` : s.id === "x-terms" ? `x terms: ${s.inputs[0]}x − ${s.inputs[1]}x = ${poly([[Number(s.value), "x"]])}` : `Numbers: ${n_(Number(s.inputs[0]))} − (${n_(Number(s.inputs[1]))}) = ${n_(Number(s.value))}`),
    domain: [[2, 12], [-12, 12], [1, 12], [-12, 12]],
    cap: 400,
    difficulty: ([, b, , d]) => (b > 0 && d > 0 && b > d ? 1 : d > 0 ? 2 : 3),
    word: ([a, b, c, d]) => `The perimeter of a triangle is (${poly([[a, "x"], [b, ""]])}) cm. Two of its sides together measure (${poly([[c, "x"], [d, ""]])}) cm. Write a simplified expression for the third side, in cm.`,
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
    word: ([d, c]) => `In a school hall, tables are joined in a row. With 1 table, ${d + c} chairs fit around it; with 2 tables, ${2 * d + c}; with 3 tables, ${3 * d + c}. The number keeps growing the same way. Write an expression for the number of chairs around n tables.`,
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
    prompt: ([p, q]) => `${name(p)} can finish a job alone in ${p} days, and ${name(q + 3)} can finish it alone in ${q} days. Working together at the same rates, how many days will they take? (A fraction is fine.)`,
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
    explain: (s) => (s.id === "x-left" ? `Take ${poly([[Number(s.inputs[1]), "x"]])} from both sides: ${poly([[Number(s.value), "x"]])} on the left` : s.id === "numbers-right" ? `Move the numbers to the right: ${n_(Number(s.inputs[0]))} − (${n_(Number(s.inputs[1]))}) = ${n_(Number(s.value))}` : `x = ${n_(Number(s.inputs[0]))} ÷ ${n_(Number(s.inputs[1]))} = ${fmt(Number(s.value)).replace(/^-/, "−")}`),
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
