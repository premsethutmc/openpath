/**
 * Supported problem families (families@1): a reusable representation of a mathematical problem.
 *
 * Each family turns a problem (written text, or a stored id "gen:<family>:<params>") into parameters, then:
 *   solve      the solution STRUCTURE: steps with an operation, the competency it uses, inputs and a value. It holds no
 *              wording; `explain` gives the learner-facing sentence for a step, separately.
 *   validate   an INDEPENDENT check of the solved answer (brute force or numerical: repeated addition, counting
 *              squares, cross-multiplication, Riemann sums, substitution, Simpson's rule), never the solver again.
 *   bugs       written explanations of wrong answers (mal-rules): what a learner with that misunderstanding would
 *              answer for these parameters. Shared bug ids (e.g. "fact-slip") mean the same thing in every family,
 *              so evidence about one explanation accumulates across different problems.
 *   variants   other parameter choices of the same family, for follow-up questions.
 *
 * Anything else is UNSUPPORTED: `parseProblem` says so, with a reason, and nothing downstream guesses.
 */
import { graph } from "./graph";

export type Value = number | number[];
export interface Step {
  id: string;
  op: "multiply" | "subtract" | "add" | "divide" | "pair" | "evaluate" | "compare" | "integrate";
  competency: string;
  inputs: (number | string)[];
  value: Value;
}
export interface Bug {
  id: string;
  kind: "conceptual" | "procedural" | "recall" | "prerequisite";
  /** The competency whose teaching addresses this explanation. */
  competency: string;
  /** Learner-facing description of the explanation (no jargon). */
  says: string;
  /** What a learner with this misunderstanding answers here (one value or several possibilities); null: no prediction. */
  predict: Value | null;
  /** A question of another family that tests this explanation directly (e.g. the multiplication fact itself). */
  probe?: string;
}
export interface Problem {
  family: string;
  id: string;
  params: number[];
  competency: string;
  /** The micro-skill (or the competency itself). */
  skill: string;
  /** "typed" (the learner writes the answer) or "mc" (chooses among the answer and mal-rule answers). */
  form: "typed" | "mc";
  prompt: string;
  type: "integer" | "fraction" | "set" | "choice";
  answer: string;
  steps: Step[];
  bugs: Bug[];
  options?: string[];
}
type Def = {
  id: string;
  /** How many parameters a stored id carries. */
  arity: number;
  title: string;
  competency: string;
  /** The micro-skill the family practises, when finer than its competency. */
  skill?: string;
  type: Problem["type"];
  /** The family also has a multiple-choice form ("gen:<family>:<params>:mc"): mal-rule answers as the options. */
  mc?: boolean;
  /** Read the parameters from written text; null if the text is not this family. */
  parse: (t: string) => number[] | null;
  /** Reject parameters outside what the family supports (a reason), or accept (null). */
  reject: (p: number[]) => string | null;
  prompt: (p: number[]) => string;
  solve: (p: number[]) => { steps: Step[]; answer: Value };
  validate: (p: number[], answer: Value) => boolean;
  bugs: (p: number[]) => Bug[];
  variants: (p: number[]) => number[][];
  explain: (s: Step) => string;
};

// ---------------------------------------------------------------- shared helpers

const MT = "MATH.number.multiplication-tables";
const EXP = "MATH.number.exponents";
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
/** A number as written in a step: "−" for minus, and in brackets when negative (so (−1)² is not read as −1²). */
const neg = (t: string | number) => String(t).replace(/^-/, "−");
const par = (v: string | number) => (Number(v) < 0 ? `(${neg(v)})` : String(v));
const sup = (n: number | string) => String(n).replace(/./g, (c) => SUP[c] ?? c);
/** x to a power, as written: x, x², x³ … */
const xp = (n: number) => (n === 1 ? "x" : `x${String(n).replace(/./g, (c) => SUP[c])}`);
const coef = (k: number) => (k === 1 ? "" : String(k));
const signed = (v: number) => `${v < 0 ? "−" : "+"} ${Math.abs(v)}`;
const SUPREAD: Record<string, string> = { "²": "^2", "³": "^3", "⁴": "^4", "⁵": "^5", "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9" };
/** Superscript powers → ^n, for reading written problems. */
const unsup = (t: string) => t.replace(/[²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPREAD[c]);
const powerOf = (a: number, n: number) => {
  let v = 1;
  for (let i = 0; i < n; i++) v *= a;
  return v;
};
/** The definite integral of g over [a, b] by Simpson's rule (an independent numerical check). */
const simpson = (g: (x: number) => number, a: number, b: number, n = 2000) => {
  const h = (b - a) / n;
  let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h);
  return (s * h) / 3;
};
const near = (x: number, y: number, rel = 1e-7) => Math.abs(x - y) <= rel * Math.max(1, Math.abs(x), Math.abs(y));
const powerSlip = (a: number, n: number, predict: Value | null, kind: Bug["kind"] = "prerequisite"): Bug => ({
  id: "multiply-for-power",
  kind,
  competency: EXP,
  says: `A power was worked out as a multiplication (${a}${String(n).replace(/./g, (c) => SUP[c])} as ${a} × ${n}); a power multiplies ${a} by itself ${n} times.`,
  predict,
  ...(a >= 2 && a <= 12 && n >= 2 && n <= 5 ? { probe: `gen:pow:${a},${n}` } : {}),
});
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const show = (v: Value): string => (Array.isArray(v) ? [...v].sort((a, b) => a - b).map(fmt).join(",") : fmt(v));
function fmt(x: number): string {
  if (Number.isInteger(x)) return String(x);
  for (let d = 2; d <= 1000; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) {
      const g = gcd(n, d);
      return `${n / g}/${d / g}`;
    }
  }
  return String(x);
}
/** Facts next to a × b that a learner who misremembers it often gives (neighbouring rows and columns). */
export const neighbours = (a: number, b: number) =>
  [...new Set([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, (a - 1) * (b + 1), (a + 1) * (b - 1)])].filter((v) => v > 0 && v !== a * b);
const mul = (a: number, b: number, competency = MT, id = "product"): Step => ({ id, op: "multiply", competency, inputs: [a, b], value: a * b });
/** A specific fact, the same id whichever problem uses it (7 × 8 and 8 × 7 are one fact). */
export const factId = (a: number, b: number) => `fact-slip:${Math.min(a, b)}x${Math.max(a, b)}`;
const factSlip = (a: number, b: number, scale = 1, extra = 0, target = MT): Bug => ({
  id: factId(a, b),
  kind: target === MT ? "prerequisite" : "recall",
  competency: MT,
  says: `A multiplication fact (${a} × ${b}) is not yet reliable.`,
  predict: neighbours(a, b).map((v) => v * scale + extra),
  ...(a >= 1 && b >= 1 && a <= 12 && b <= 12 ? { probe: `gen:mul:${a},${b}` } : {}),
});
const addForMul = (a: number, b: number, scale = 1, extra = 0): Bug => ({ id: "add-for-multiply", kind: "conceptual", competency: MT, says: `${a} × ${b} was added instead of multiplied.`, predict: (a + b) * scale + extra, probe: `gen:mul:${a},${b}` });
const int = (s: string) => Number(s.replace(/−/g, "-").replace(/\s+/g, ""));
const norm = (t: string) => t.replace(/−/g, "-").replace(/\s+/g, " ").replace(/[“”]/g, '"').trim();
const pairs = (p: number[], ranges: [number, number][], keep: (q: number[]) => boolean) => {
  const out: number[][] = [];
  const rec = (i: number, acc: number[]) => {
    if (i === ranges.length) return keep(acc) && JSON.stringify(acc) !== JSON.stringify(p) && out.push([...acc]);
    for (let v = ranges[i][0]; v <= ranges[i][1]; v++) rec(i + 1, [...acc, v]);
  };
  rec(0, []);
  return out;
};

// ---------------------------------------------------------------- the families

const F: Def[] = [
  {
    id: "mul",
    arity: 2,
    title: "A multiplication fact",
    competency: MT,
    type: "integer",
    parse: (t) => {
      const m = norm(t).match(/^(?:what is )?(\d{1,3}) ?[×x*] ?(\d{1,3})(?: ?= ?\??)?\??$/i);
      return m ? [int(m[1]), int(m[2])] : null;
    },
    reject: ([a, b]) => (a < 1 || b < 1 || a > 12 || b > 12 ? "Only multiplication facts up to 12 × 12 are supported." : null),
    prompt: ([a, b]) => `${a} × ${b} = ?`,
    solve: ([a, b]) => ({ steps: [mul(a, b)], answer: a * b }),
    validate: ([a, b], v) => {
      let s = 0;
      for (let i = 0; i < b; i++) s += a; // repeated addition
      return v === s;
    },
    bugs: ([a, b]) => [{ ...factSlip(a, b), kind: "recall" }, addForMul(a, b)],
    variants: (p) => pairs(p, [[2, 9], [2, 9]], ([a, b]) => a >= 2 && b >= 2),
    explain: (s) => `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`,
  },
  {
    id: "rect",
    arity: 2,
    title: "Area of a rectangle",
    competency: "MATH.measurement.rectangle-area",
    type: "integer",
    parse: (t) => {
      const s = norm(t).toLowerCase();
      if (!/area/.test(s) || !/rectangle|square/.test(s)) return null;
      const m = s.match(/(\d{1,3}) ?(?:cm|m|mm|units?)? ?(?:by|×|x) ?(\d{1,3})/);
      if (m) return [int(m[1]), int(m[2])];
      const q = s.match(/square (?:with |of )?sides? (?:of )?(\d{1,3})/);
      return q ? [int(q[1]), int(q[1])] : null;
    },
    reject: ([l, w]) => (l < 1 || w < 1 || l > 12 || w > 12 ? "Only rectangles with whole-number sides up to 12 are supported." : null),
    prompt: ([l, w]) => `A rectangle is ${l} cm by ${w} cm. What is its area in square centimetres?`,
    solve: ([l, w]) => ({ steps: [mul(l, w, MT, "area")], answer: l * w }),
    validate: ([l, w], v) => {
      let n = 0;
      for (let i = 0; i < l; i++) for (let j = 0; j < w; j++) n++; // count unit squares
      return v === n;
    },
    bugs: ([l, w]) => [
      { id: "perimeter-for-area", kind: "conceptual", competency: "MATH.measurement.rectangle-area", says: "The distance around (perimeter) was found instead of the space inside (area).", predict: 2 * (l + w) },
      { id: "add-sides", kind: "conceptual", competency: "MATH.measurement.rectangle-area", says: "The two sides were added; area multiplies them.", predict: l + w },
      factSlip(l, w),
    ],
    variants: (p) => pairs(p, [[2, 9], [2, 9]], () => true),
    explain: (s) => `Rows × columns of unit squares: ${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`,
  },
  {
    id: "eqfrac",
    arity: 3,
    title: "A missing part of an equivalent fraction",
    competency: "MATH.number.equivalent-fractions",
    type: "integer",
    // [a, b, d]: a/b = □/d
    parse: (t) => {
      const m = norm(t).replace(/ /g, "").match(/^(?:fillinthebox:)?(\d{1,3})\/(\d{1,3})=(?:□|\?|_+)\/(\d{1,3})$/i);
      return m ? [int(m[1]), int(m[2]), int(m[3])] : null;
    },
    reject: ([a, b, d]) => (b < 1 || a < 1 || d % b !== 0 || d <= b || d > 100 ? "Only a/b = □/d with d a whole multiple of b (up to 100) is supported." : null),
    prompt: ([a, b, d]) => `${a}/${b} = □/${d}`,
    solve: ([a, b, d]) => {
      const k = d / b;
      return { steps: [{ id: "factor", op: "divide", competency: MT, inputs: [d, b], value: k }, mul(a, k, MT, "top")], answer: a * k };
    },
    validate: ([a, b, d], v) => typeof v === "number" && a * d === b * v, // cross-multiplication
    bugs: ([a, b, d]) => {
      const k = d / b;
      return [
        { id: "additive-scaling", kind: "conceptual", competency: "MATH.number.equivalent-fractions", says: "The same amount was added to the top as to the bottom; equal fractions multiply both by the same number.", predict: a + (d - b) },
        { id: "scale-one-part", kind: "procedural", competency: "MATH.number.equivalent-fractions", says: "Only the bottom was changed; the top must be multiplied by the same number.", predict: a },
        { ...factSlip(a, k), kind: k > 1 && a > 1 ? "recall" : "prerequisite" },
      ];
    },
    variants: (p) => pairs(p, [[1, 7], [2, 9], [2, 5]], ([a, b, k]) => a < b).map(([a, b, k]) => [a, b, b * k]),
    explain: (s) => (s.op === "divide" ? `${s.inputs[1]} × ${show(s.value)} = ${s.inputs[0]}, so multiply by ${show(s.value)}` : `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`),
  },
  {
    id: "fadd",
    arity: 4,
    title: "Adding or subtracting like fractions",
    competency: "MATH.number.fraction-add-like",
    type: "fraction",
    // [a, b, n, sign]: a/n ± b/n
    parse: (t) => {
      const m = norm(t).replace(/ /g, "").match(/^(\d{1,3})\/(\d{1,3})([+-])(\d{1,3})\/(\d{1,3})(?:=\??)?$/);
      if (!m) return null;
      return int(m[2]) === int(m[5]) ? [int(m[1]), int(m[4]), int(m[2]), m[3] === "+" ? 1 : -1] : [int(m[1]), int(m[4]), int(m[2]), m[3] === "+" ? 1 : -1, int(m[5])];
    },
    reject: (p) => (p.length > 4 ? "Only fractions with the same denominator are supported (unlike denominators are not yet)." : p[3] !== 1 && p[3] !== -1 ? "Unknown operation." : p[2] < 2 || p[2] > 20 || (p[3] < 0 && p[1] > p[0]) ? "Only like fractions with denominators up to 20 and a result of at least 0 are supported." : null),
    prompt: ([a, b, n, s]) => `${a}/${n} ${s > 0 ? "+" : "−"} ${b}/${n} = ?`,
    solve: ([a, b, n, s]) => ({ steps: [{ id: "tops", op: s > 0 ? "add" : "subtract", competency: "MATH.number.fraction-add-like", inputs: [a, b], value: a + s * b }], answer: (a + s * b) / n }),
    validate: ([a, b, n, s], v) => typeof v === "number" && Math.abs(v - (a / n + (s * b) / n)) < 1e-9,
    bugs: ([a, b, n, s]) =>
      s > 0
        ? [
            { id: "add-denominators", kind: "conceptual", competency: "MATH.number.fraction-add-like", says: "The bottom numbers were added too; they name the size of the pieces, which does not change.", predict: (a + b) / (2 * n) },
            { id: "multiply-tops", kind: "procedural", competency: "MATH.number.fraction-add-like", says: "The top numbers were multiplied; adding fractions adds the pieces.", predict: (a * b) / n },
          ]
        : [{ id: "subtract-reversed", kind: "procedural", competency: "MATH.number.fraction-add-like", says: "The smaller top number was taken from the larger one the wrong way round.", predict: a === b ? null : (b - a) / n }].filter((x) => x.predict !== null) as Bug[],
    variants: (p) => pairs(p, [[1, 5], [1, 5], [5, 9]], ([a, b, n]) => a + b < n).map((q) => [...q, 1]),
    explain: (s) => `${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${show(s.value)} pieces of the same size`,
  },
  {
    id: "cint",
    arity: 3,
    title: "The definite integral of a constant",
    competency: "MATH.calculus.definite-integrals",
    type: "integer",
    // [a, b, c]: ∫ from a to b of c dx
    parse: (t) => {
      const s = norm(t).toLowerCase();
      const m = s.match(/(?:∫|integral) ?(?:from )?(-?\d{1,3}) ?to ?(-?\d{1,3}) ?(?:of )?(-?\d{1,3}) ?dx/) ?? s.match(/integral of (-?\d{1,3}) ?(?:dx )?from (-?\d{1,3}) to (-?\d{1,3})/);
      if (!m) return null;
      return s.includes("integral of") && !/(?:∫|integral) ?(?:from)/.test(s) ? [int(m[2]), int(m[3]), int(m[1])] : [int(m[1]), int(m[2]), int(m[3])];
    },
    reject: ([a, b, c]) => (b <= a || c < 1 || c > 12 || b - a > 12 || a < 0 ? "Only ∫ from a to b of c dx with 0 ≤ a < b, b − a ≤ 12 and 1 ≤ c ≤ 12 is supported." : null),
    prompt: ([a, b, c]) => `∫ from ${a} to ${b} of ${c} dx = ?`,
    solve: ([a, b, c]) => ({ steps: [{ id: "width", op: "subtract", competency: "MATH.calculus.definite-integrals", inputs: [b, a], value: b - a }, mul(c, b - a, MT, "area")], answer: c * (b - a) }),
    validate: ([a, b, c], v) => {
      const n = 4000;
      let s = 0;
      for (let i = 0; i < n; i++) s += c * ((b - a) / n); // Riemann sum
      return typeof v === "number" && Math.abs(s - v) < 1e-6;
    },
    bugs: ([a, b, c]) => [
      { id: "ignore-lower-limit", kind: "conceptual", competency: "MATH.calculus.definite-integrals", says: "The width was taken as the upper limit only; the width is upper minus lower.", predict: a === 0 ? null : c * b },
      { id: "fencepost-width", kind: "procedural", competency: "MATH.calculus.definite-integrals", says: "The whole numbers from a to b were counted (one too many); the width is b − a.", predict: c * (b - a + 1) },
      { id: "forget-height", kind: "conceptual", competency: "MATH.calculus.definite-integrals", says: "Only the width was found; the area is width × height.", predict: b - a },
      { id: "add-width-height", kind: "conceptual", competency: "MATH.calculus.definite-integrals", says: "Width and height were added; the area multiplies them.", predict: c + (b - a) },
      factSlip(c, b - a),
    ].filter((x) => x.predict !== null) as Bug[],
    variants: (p) => pairs(p, [[0, 4], [3, 9], [2, 9]], ([a, b]) => b > a && b - a <= 9),
    explain: (s) => (s.op === "subtract" ? `Width: ${s.inputs[0]} − ${s.inputs[1]} = ${show(s.value)}` : `Area under y = ${s.inputs[0]}: ${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`),
  },
  {
    id: "quad",
    arity: 2,
    title: "A quadratic equation with whole-number roots",
    competency: "MATH.algebra.quadratics",
    type: "set",
    // [p, q]: x² + p x + q = 0
    parse: (t) => {
      const s = norm(t).toLowerCase().replace(/^solve:? ?/, "").replace(/ /g, "").replace(/x\^2/g, "x²");
      const m = s.match(/^x²(?:([+-]\d*)x)?([+-]\d+)?=0\.?$/) ?? s.match(/^x²=(?:([+-]?\d*)x)?([+-]?\d+)?$/);
      if (!m || (!m[1] && !m[2])) return null;
      const coef = (v?: string) => (v === undefined ? 0 : v === "+" || v === "" ? 1 : v === "-" ? -1 : int(v));
      const eqRight = s.includes("x²=") && !s.endsWith("=0");
      return eqRight ? [-coef(m[1]), -coef(m[2])] : [coef(m[1]), coef(m[2])];
    },
    reject: ([p, q]) => {
      const d = p * p - 4 * q;
      const r = Math.sqrt(d);
      return d <= 0 || !Number.isInteger(r) || (-p + r) % 2 !== 0 ? "Only quadratics x² + px + q = 0 with two different whole-number roots are supported." : Math.abs(p) > 20 || Math.abs(q) > 100 ? "Coefficients up to 20 and 100 are supported." : null;
    },
    prompt: ([p, q]) => `Solve x² ${p < 0 ? "−" : "+"} ${Math.abs(p)}x ${q < 0 ? "−" : "+"} ${Math.abs(q)} = 0. Give both solutions, separated by a comma.`.replace(/ [+−] 1x/, (m) => m.replace("1x", "x")),
    solve: ([p, q]) => {
      const r = Math.sqrt(p * p - 4 * q);
      const roots = [(-p - r) / 2, (-p + r) / 2];
      return { steps: [{ id: "pair", op: "pair", competency: "MATH.algebra.factorisation", inputs: [q, -p], value: roots }, { id: "roots", op: "evaluate", competency: "MATH.algebra.quadratics", inputs: ["zero product"], value: roots }], answer: roots };
    },
    validate: ([p, q], v) => Array.isArray(v) && v.length === 2 && v[0] !== v[1] && v.every((x) => x * x + p * x + q === 0), // substitution
    bugs: ([p, q]) => {
      const r = Math.sqrt(p * p - 4 * q);
      const roots = [(-p - r) / 2, (-p + r) / 2];
      return [
        { id: "root-signs", kind: "procedural", competency: "MATH.algebra.quadratics", says: "The numbers in the brackets were taken as the solutions; (x − 2) = 0 gives x = 2, so the signs flip.", predict: roots.map((x) => -x) },
        { id: "one-root", kind: "conceptual", competency: "MATH.algebra.quadratics", says: "Only one solution was found; a quadratic like this has two.", predict: null },
      ].filter((x) => x.predict !== null) as Bug[];
    },
    variants: (p) => pairs(p, [[-4, 4], [-4, 4]], ([r, s]) => r !== s && r !== 0 && s !== 0).map(([r, s]) => [-(r + s), r * s]).filter(([pp, qq], i, a) => a.findIndex((x) => x[0] === pp && x[1] === qq) === i),
    explain: (s) => (s.op === "pair" ? `Two numbers that multiply to ${s.inputs[0]} and add to ${s.inputs[1]}` : `Each bracket can be zero: x = ${show(s.value).replace(",", " or x = ")}`),
  },
  {
    id: "linev",
    arity: 3,
    title: "A value on a straight line",
    competency: "MATH.algebra.variables",
    type: "integer",
    // [m, c, t]: y = m x + c at x = t
    parse: (t) => {
      const s = norm(t).toLowerCase().replace(/ /g, "");
      const m = s.match(/y=(-?\d*)x([+-]\d+)?.*?x=(-?\d+)/);
      if (!m) return null;
      const k = m[1] === "" ? 1 : m[1] === "-" ? -1 : int(m[1]);
      return [k, m[2] ? int(m[2]) : 0, int(m[3])];
    },
    reject: ([m, c, t]) => (Math.abs(m) > 12 || Math.abs(c) > 50 || Math.abs(t) > 12 ? "Only small whole-number lines are supported." : null),
    prompt: ([m, c, t]) => `On the line y = ${m === 1 ? "" : m}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}, what is y when x = ${t}?`,
    solve: ([m, c, t]) => ({ steps: [mul(m, t, MT, "mx"), { id: "y", op: "add", competency: "MATH.algebra.variables", inputs: [m * t, c], value: m * t + c }], answer: m * t + c }),
    validate: ([m, c, t], v) => v === [...Array(Math.abs(t))].reduce((s) => s + Math.sign(t) * m, 0) + c,
    bugs: ([m, c, t]) => [{ id: "concatenate", kind: "conceptual", competency: "MATH.algebra.variables", says: `${m}x with x = ${t} was read as the digits ${m}${t}; ${m}x means ${m} × x.`, predict: m > 0 && t > 0 && m < 10 && t < 10 ? 10 * m + t + c : null }, { id: "add-for-multiply", kind: "conceptual", competency: MT, says: `${m}x was worked out as ${m} + x; it means ${m} × x.`, predict: m + t + c }].filter((x) => x.predict !== null) as Bug[],
    variants: (p) => pairs(p, [[2, 5], [-3, 5], [2, 5]], () => true),
    explain: (s) => (s.op === "multiply" ? `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}` : `${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}`),
  },
  {
    id: "meet",
    arity: 2,
    title: "Where a line meets y = x², by trying whole numbers",
    competency: "MATH.algebra.linear-equations",
    type: "set",
    // [m, c]: whole x from −4 to 4 with x × x = m x + c
    parse: (t) => {
      const s = norm(t).toLowerCase().replace(/ /g, "");
      const m = s.match(/x×x(?:is|=)(?:equalto)?(-?\d*)x([+-]\d+)?/);
      return m ? [m[1] === "" ? 1 : m[1] === "-" ? -1 : int(m[1]), m[2] ? int(m[2]) : 0] : null;
    },
    reject: ([m, c]) => ([...Array(9).keys()].map((k) => k - 4).filter((x) => x * x === m * x + c).length !== 2 ? "Only lines meeting y = x² at two whole numbers from −4 to 4 are supported." : null),
    prompt: ([m, c]) => `Try whole numbers x from −4 to 4. For which of them is x × x equal to ${m === 1 ? "" : m}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}? Enter both, separated by a comma.`,
    solve: ([m, c]) => {
      const v = [...Array(9).keys()].map((k) => k - 4).filter((x) => x * x === m * x + c);
      return { steps: [{ id: "try", op: "evaluate", competency: "MATH.algebra.linear-equations", inputs: [m, c], value: v }], answer: v };
    },
    validate: ([m, c], v) => Array.isArray(v) && v.length === 2 && v.every((x) => x * x - m * x - c === 0),
    bugs: ([m, c]) => [{ id: "square-as-double", kind: "conceptual", competency: "MATH.algebra.variables", says: "x × x was worked out as x + x (doubling); x × x is x squared.", predict: [...Array(9).keys()].map((k) => k - 4).filter((x) => 2 * x === m * x + c) }].filter((b) => (b.predict as number[]).length > 0) as Bug[],
    variants: () => [[1, 2], [1, 6], [2, 3], [0, 4], [-1, 2], [3, -2]].filter(([m, c]) => [...Array(9).keys()].map((k) => k - 4).filter((x) => x * x === m * x + c).length === 2),
    explain: (s) => `x × x = ${s.inputs[0]}x + ${s.inputs[1]} at x = ${show(s.value).replace(",", " and x = ")}`,
  },
  {
    id: "above",
    arity: 3,
    title: "Which graph is higher at a point",
    competency: "MATH.algebra.functions",
    type: "choice",
    // [m, c, t]: at x = t, is y = m x + c above y = x²?
    parse: () => null,
    reject: ([m, c, t]) => (m * t + c === t * t ? "The graphs meet there." : null),
    prompt: ([m, c, t]) => `At x = ${t}, which graph is higher: y = ${m === 1 ? "" : m}x ${c < 0 ? "−" : "+"} ${Math.abs(c)} or y = x²?`,
    solve: ([m, c, t]) => ({ steps: [{ id: "compare", op: "compare", competency: "MATH.algebra.functions", inputs: [m * t + c, t * t], value: m * t + c > t * t ? 0 : 1 }], answer: m * t + c > t * t ? 0 : 1 }),
    validate: ([m, c, t], v) => v === (m * t + c - t * t > 0 ? 0 : 1),
    bugs: () => [],
    variants: (p) => [[p[0], p[1], p[2] + 1]],
    explain: (s) => `Line: ${s.inputs[0]}; parabola: ${s.inputs[1]}`,
  },
  {
    id: "alp",
    arity: 2,
    title: "The area between a parabola and a line",
    competency: "MATH.calculus.area-integrals",
    type: "fraction",
    // [m, c]: the region x² ≤ y ≤ m x + c
    parse: (t) => {
      const s = norm(t).toLowerCase().replace(/ /g, "").replace(/x\^2/g, "x²");
      const m = s.match(/x²≤y≤(-?\d*)x([+-]\d+)?/) ?? s.match(/y=x²andy=(-?\d*)x([+-]\d+)?/) ?? s.match(/y=(-?\d*)x([+-]\d+)?andy=x²/);
      if (!m || !/area/.test(s)) return null;
      return [m[1] === "" ? 1 : m[1] === "-" ? -1 : int(m[1]), m[2] ? int(m[2]) : 0];
    },
    reject: ([m, c]) => {
      const d = m * m + 4 * c;
      return d <= 0 || !Number.isInteger(Math.sqrt(d)) || (m + Math.sqrt(d)) % 2 !== 0 ? "Only a line meeting y = x² at two whole-number points is supported." : null;
    },
    prompt: ([m, c]) => `Find the area of the region {(x, y) : x² ≤ y ≤ ${m === 1 ? "" : m}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}}.`,
    solve: ([m, c]) => {
      const r = Math.sqrt(m * m + 4 * c);
      const [x1, x2] = [(m - r) / 2, (m + r) / 2];
      const F = (x: number) => (m * x * x) / 2 + c * x - (x * x * x) / 3;
      return {
        steps: [
          { id: "line-value", op: "evaluate", competency: "MATH.algebra.variables", inputs: [m, c, x2 + 1], value: m * (x2 + 1) + c },
          { id: "meet-try", op: "pair", competency: "MATH.algebra.linear-equations", inputs: ["try whole numbers"], value: [x1, x2] },
          { id: "meet", op: "pair", competency: "MATH.algebra.quadratics", inputs: [-m, -c], value: [x1, x2] },
          { id: "above", op: "compare", competency: "MATH.algebra.functions", inputs: [Math.floor((x1 + x2) / 2) > x1 ? Math.floor((x1 + x2) / 2) : (x1 + x2) / 2], value: 0 },
          { id: "area", op: "integrate", competency: "MATH.calculus.area-integrals", inputs: [x1, x2], value: F(x2) - F(x1) },
        ],
        answer: F(x2) - F(x1),
      };
    },
    validate: ([m, c], v) => {
      // Simpson's rule on the vertical gap, between intersections found by scanning integers
      const meet = [...Array(41).keys()].map((k) => k - 20).filter((x) => x * x === m * x + c);
      if (meet.length !== 2 || typeof v !== "number") return false;
      const [a, b] = meet;
      const g = (x: number) => m * x + c - x * x;
      const n = 200;
      const h = (b - a) / n;
      let s = g(a) + g(b);
      for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h);
      return Math.abs((s * h) / 3 - v) < 1e-9;
    },
    bugs: ([m, c]) => {
      const r = Math.sqrt(m * m + 4 * c);
      const [x1, x2] = [(m - r) / 2, (m + r) / 2];
      const line = (x: number) => (m * x * x) / 2 + c * x;
      return [
        { id: "line-only", kind: "conceptual", competency: "MATH.calculus.area-integrals", says: "The area under the line was found; the region is between the line and the parabola.", predict: line(x2) - line(x1) },
        { id: "wrong-order", kind: "procedural", competency: "MATH.calculus.area-integrals", says: "The parabola was taken as the top curve; here the line is above, so the answer was negative.", predict: -((r * r * r) / 6) },
      ];
    },
    variants: (p) => [[1, 2], [1, 6], [2, 3], [0, 4], [1, 12], [3, 4]].filter((q) => q[0] !== p[0] || q[1] !== p[1]),
    explain: (s) => s.id,
  },

  {
    id: "pow",
    arity: 2,
    title: "A power of a whole number",
    competency: EXP,
    skill: "MLY.pow.whole",
    type: "integer",
    mc: true,
    // [a, n]: a to the power n
    parse: (t) => {
      const m = unsup(norm(t)).replace(/ /g, "").match(/^(?:whatis)?(\d{1,2})(?:\^|tothepowerof|tothepower)(\d)(?:=\??)?\??$/i);
      return m ? [int(m[1]), int(m[2])] : null;
    },
    reject: ([a, n]) => (a < 2 || a > 12 || n < 2 || n > 5 || powerOf(a, n) > 100000 ? "Only powers aⁿ with 2 ≤ a ≤ 12, 2 ≤ n ≤ 5 (up to 100 000) are supported." : null),
    prompt: ([a, n]) => `${a}${String(n).replace(/./g, (c) => SUP[c])} = ?`,
    solve: ([a, n]) => ({ steps: [{ id: "power", op: "multiply", competency: EXP, inputs: [a, n], value: powerOf(a, n) }], answer: powerOf(a, n) }),
    validate: ([a, n], v) => v === Number(BigInt(a) ** BigInt(n)),
    bugs: ([a, n]) => [
      powerSlip(a, n, a * n, "conceptual"),
      { id: "one-factor-short", kind: "procedural", competency: EXP, says: `One factor too few was multiplied: ${a} must appear ${n} times.`, predict: powerOf(a, n - 1) },
      { id: "add-for-power", kind: "conceptual", competency: EXP, says: "The two numbers were added; a power is repeated multiplication.", predict: a + n },
    ],
    variants: (p) => pairs(p, [[2, 9], [2, 4]], ([a, n]) => powerOf(a, n) <= 1300),
    explain: (s) => `${[...Array(Number(s.inputs[1]))].map(() => s.inputs[0]).join(" × ")} = ${show(s.value)}`,
  },
  {
    id: "dist",
    arity: 2,
    title: "Expanding a(x + b)",
    competency: "MATH.algebra.identities-intro",
    skill: "MLY.alg.distributive",
    type: "integer",
    mc: true,
    // [a, b]: a(x + b) = ax + □
    parse: (t) => {
      const m = norm(t).toLowerCase().replace(/ /g, "").match(/^(?:expand:?)?(\d{1,2})\(x\+(\d{1,2})\)(?:=\d*x\+(?:□|\?|_+))?\??$/);
      return m ? [int(m[1]), int(m[2])] : null;
    },
    reject: ([a, b]) => (a < 2 || a > 12 || b < 1 || b > 12 ? "Only a(x + b) with whole numbers 2 ≤ a ≤ 12 and 1 ≤ b ≤ 12 is supported." : null),
    prompt: ([a, b]) => `Expand the bracket: ${a}(x + ${b}) = ${a}x + □. What number goes in the box?`,
    solve: ([a, b]) => ({ steps: [{ id: "x-term", op: "multiply", competency: "MATH.algebra.identities-intro", inputs: [a, "x"], value: a }, mul(a, b, MT, "constant")], answer: a * b }),
    validate: ([a, b], v) => {
      // the two sides agree at x = 3 and x = 7, by repeated addition of the bracket
      const left = (x: number) => [...Array(a)].reduce((s) => s + (x + b), 0);
      return typeof v === "number" && left(3) === a * 3 + v && left(7) === a * 7 + v;
    },
    bugs: ([a, b]) => [
      { id: "first-term-only", kind: "procedural", competency: "MATH.algebra.identities-intro", says: `Only the x was multiplied by ${a}; the number outside multiplies every term in the bracket.`, predict: b },
      { ...addForMul(a, b), says: `${a} and ${b} were added; the bracket means ${a} × ${b}.` },
      factSlip(a, b),
    ],
    variants: (p) => pairs(p, [[2, 9], [2, 9]], ([a, b]) => a !== b),
    explain: (s) => (s.id === "x-term" ? `${s.inputs[0]} × x = ${s.inputs[0]}x` : `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`),
  },
  {
    id: "expand",
    arity: 2,
    title: "Expanding (x + a)(x + b)",
    competency: "MATH.algebra.identities",
    skill: "MLY.alg.expand-binomials",
    type: "integer",
    mc: true,
    // [a, b]: (x + a)(x + b) = x² + □x + ab
    parse: (t) => {
      const m = norm(t).toLowerCase().replace(/ /g, "").match(/^(?:expand:?)?\(x([+-]\d{1,2})\)\(x([+-]\d{1,2})\)/);
      return m ? [int(m[1]), int(m[2])] : null;
    },
    reject: ([a, b]) => (a === 0 || b === 0 || Math.abs(a) > 12 || Math.abs(b) > 12 || a + b === 0 ? "Only (x + a)(x + b) with non-zero whole numbers up to 12 and a + b not 0 is supported." : null),
    prompt: ([a, b]) => `Expand (x ${signed(a)})(x ${signed(b)}) = x² + □x ${signed(a * b)}. What number goes in the box (it may be negative)?`,
    solve: ([a, b]) => ({ steps: [{ id: "outer", op: "multiply", competency: "MATH.algebra.identities", inputs: ["x", b], value: b }, { id: "inner", op: "multiply", competency: "MATH.algebra.identities", inputs: [a, "x"], value: a }, { id: "collect", op: "add", competency: "MATH.number.integer-add", inputs: [a, b], value: a + b }], answer: a + b }),
    validate: ([a, b], v) => typeof v === "number" && [2, 5].every((x) => (x + a) * (x + b) === x * x + v * x + a * b),
    bugs: ([a, b]) => [
      { id: "product-for-sum", kind: "conceptual", competency: "MATH.algebra.identities", says: `The two numbers were multiplied for the x term; ${a} × ${b} is the number at the end, and the x term collects ${a}x and ${b}x.`, predict: a * b },
      { id: "one-cross-term", kind: "procedural", competency: "MATH.algebra.identities", says: "Only one of the two middle products was kept; both x × b and a × x give an x term.", predict: [a, b] },
      ...(Math.sign(a) !== Math.sign(b) ? [{ id: "sign-slip", kind: "prerequisite" as const, competency: "MATH.number.integer-add", says: `${a} + ${b} was worked out without the signs; adding numbers with different signs is a difference.`, predict: Math.abs(a) + Math.abs(b) === a + b ? -(a + b) : Math.sign(a + b) * (Math.abs(a) + Math.abs(b)) }] : []),
    ],
    variants: (p) => pairs(p, [[-5, 5], [-5, 5]], ([a, b]) => a !== 0 && b !== 0 && a < b && a + b !== 0),
    explain: (s) => (s.id === "collect" ? `${neg(s.inputs[0])}x + ${par(s.inputs[1])}x = ${neg(show(s.value))}x` : s.id === "outer" ? `x × ${par(s.inputs[1])} = ${neg(s.inputs[1])}x` : `${par(s.inputs[0])} × x = ${neg(s.inputs[0])}x`),
  },
  {
    id: "dpow",
    arity: 3,
    title: "The derivative of k xⁿ at a point",
    competency: "MATH.calculus.derivative-rules",
    skill: "MLY.calc.power-derivative",
    type: "integer",
    mc: true,
    // [k, n, t]: f(x) = k xⁿ, f′(t)
    parse: (t) => {
      const m = unsup(norm(t)).replace(/ /g, "").match(/f\(x\)=(\d*)x(?:\^(\d))?[.,;]?(?:whatis|find)?f['′]\((-?\d{1,2})\)/i);
      return m ? [m[1] ? int(m[1]) : 1, m[2] ? int(m[2]) : 1, int(m[3])] : null;
    },
    reject: ([k, n, t]) => (k < 1 || k > 9 || n < 2 || n > 5 || t < 1 || t > 4 || k * n * powerOf(t, n - 1) > 5000 ? "Only f(x) = k xⁿ with 1 ≤ k ≤ 9, 2 ≤ n ≤ 5 and f′(t) at a whole number 1 ≤ t ≤ 4 is supported." : null),
    prompt: ([k, n, t]) => `f(x) = ${coef(k)}${xp(n)}. What is f′(${t})?`,
    solve: ([k, n, t]) => ({ steps: [{ id: "rule", op: "multiply", competency: "MATH.calculus.derivative-rules", inputs: [k, n], value: k * n }, { id: "power", op: "evaluate", competency: EXP, inputs: [t, n - 1], value: powerOf(t, n - 1) }, mul(k * n, powerOf(t, n - 1), MT, "value")], answer: k * n * powerOf(t, n - 1) }),
    validate: ([k, n, t], v) => {
      // a central difference of f itself, not the rule
      const f = (x: number) => k * x ** n;
      const h = 1e-4;
      return typeof v === "number" && Math.abs((f(t + h) - f(t - h)) / (2 * h) - v) < 1e-3 * Math.max(1, Math.abs(v));
    },
    bugs: ([k, n, t]) => [
      { id: "power-not-lowered", kind: "procedural", competency: "MATH.calculus.derivative-rules", says: "The power was not lowered: the derivative of xⁿ is n xⁿ⁻¹.", predict: k * n * powerOf(t, n) },
      { id: "power-not-multiplied", kind: "procedural", competency: "MATH.calculus.derivative-rules", says: "The power was lowered but not brought down as a factor: the derivative of xⁿ is n xⁿ⁻¹.", predict: k * powerOf(t, n - 1) },
      { id: "value-not-slope", kind: "conceptual", competency: "MATH.calculus.derivative-rules", says: "The function's value was found, not its rate of change (the derivative).", predict: k * powerOf(t, n) },
      ...(n - 1 >= 2 && t >= 2 ? [powerSlip(t, n - 1, k * n * t * (n - 1))] : []),
    ],
    variants: (p) => pairs(p, [[1, 4], [2, 4], [1, 3]], ([k, n, t]) => k * n * powerOf(t, n - 1) <= 400),
    explain: (s) => (s.id === "rule" ? `Bring the power down: ${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}` : s.id === "power" ? `${s.inputs[0]}${sup(s.inputs[1])} = ${show(s.value)}` : `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`),
  },
  {
    id: "pint",
    arity: 4,
    title: "The definite integral of k xⁿ",
    competency: "MATH.calculus.indefinite-integrals",
    skill: "MLY.calc.power-antiderivative",
    type: "fraction",
    mc: true,
    // [a, b, k, n]: ∫ from a to b of k xⁿ dx
    parse: (t) => {
      const s = unsup(norm(t).toLowerCase()).replace(/ /g, "");
      const m = s.match(/^(?:∫|integral)(?:from)?(\d)to(\d)(?:of)?(\d{0,2})x(?:\^(\d))?dx(?:=\??)?\??$/);
      return m ? [int(m[1]), int(m[2]), m[3] ? int(m[3]) : 1, m[4] ? int(m[4]) : 1] : null;
    },
    reject: ([a, b, k, n]) => (a < 0 || b <= a || b > 4 || k < 1 || k > 12 || n < 1 || n > 3 ? "Only ∫ from a to b of k xⁿ dx with 0 ≤ a < b ≤ 4, 1 ≤ k ≤ 12 and n = 1, 2 or 3 is supported." : null),
    prompt: ([a, b, k, n]) => `∫ from ${a} to ${b} of ${coef(k)}${xp(n)} dx = ? (A fraction is fine.)`,
    solve: ([a, b, k, n]) => {
      const F = (x: number) => (k * powerOf(x, n + 1)) / (n + 1);
      return { steps: [{ id: "antiderivative", op: "integrate", competency: "MATH.calculus.indefinite-integrals", inputs: [k, n + 1], value: k / (n + 1) }, { id: "upper", op: "evaluate", competency: EXP, inputs: [b, n + 1], value: powerOf(b, n + 1) }, { id: "lower", op: "evaluate", competency: EXP, inputs: [a, n + 1], value: powerOf(a, n + 1) }, { id: "difference", op: "subtract", competency: "MATH.calculus.definite-integrals", inputs: [b, a], value: F(b) - F(a) }], answer: F(b) - F(a) };
    },
    validate: ([a, b, k, n], v) => typeof v === "number" && near(simpson((x) => k * x ** n, a, b, 200), v),
    bugs: ([a, b, k, n]) => [
      { id: "no-divide", kind: "procedural", competency: "MATH.calculus.indefinite-integrals", says: "The power was raised but not divided by: ∫ xⁿ dx = xⁿ⁺¹ ⁄ (n + 1).", predict: k * (powerOf(b, n + 1) - powerOf(a, n + 1)) },
      { id: "differentiated", kind: "conceptual", competency: "MATH.calculus.indefinite-integrals", says: "The function was differentiated instead of integrated: integrating raises the power.", predict: k * n * (powerOf(b, n - 1) - powerOf(a, n - 1)) },
      { id: "power-not-raised", kind: "procedural", competency: "MATH.calculus.indefinite-integrals", says: "It was divided by the power without raising it: xⁿ becomes xⁿ⁺¹ ⁄ (n + 1).", predict: (k * (powerOf(b, n) - powerOf(a, n))) / n },
      ...(a > 0 ? [{ id: "ignore-lower-limit", kind: "conceptual" as const, competency: "MATH.calculus.definite-integrals", says: "Only the upper limit was used; the answer is F(upper) − F(lower).", predict: (k * powerOf(b, n + 1)) / (n + 1) }] : []),
      ...(b >= 2 ? [powerSlip(b, n + 1, (k * ((n + 1) * b - (n + 1) * a)) / (n + 1))] : []),
    ],
    variants: (p) => pairs(p, [[0, 1], [2, 3], [1, 6], [1, 3]], () => true),
    explain: (s) => (s.id === "antiderivative" ? `Raise the power and divide: F(x) = ${s.inputs[0]}x${sup(s.inputs[1])} ⁄ ${s.inputs[1]}` : s.id === "difference" ? `F(${s.inputs[0]}) − F(${s.inputs[1]}) = ${show(s.value)}` : `${s.inputs[0]}${sup(s.inputs[1])} = ${show(s.value)}`),
  },
  {
    id: "subst",
    arity: 4,
    title: "An integral by substitution",
    competency: "MATH.calculus.integration-methods",
    skill: "MLY.calc.substitution",
    type: "fraction",
    mc: true,
    // [a, b, c, n]: ∫ from a to b of 2x (x² + c)ⁿ dx
    parse: (t) => {
      const s = unsup(norm(t).toLowerCase()).replace(/ /g, "").replace(/·|\*/g, "");
      const m = s.match(/^(?:∫|integral)(?:from)?(\d)to(\d)(?:of)?2x\(x\^2\+(\d)\)(?:\^(\d))?dx(?:=\??)?\??$/);
      return m ? [int(m[1]), int(m[2]), int(m[3]), m[4] ? int(m[4]) : 1] : null;
    },
    reject: ([a, b, c, n]) => (a < 0 || b <= a || b > 3 || c < 1 || c > 4 || n < 1 || n > 3 ? "Only ∫ from a to b of 2x(x² + c)ⁿ dx with 0 ≤ a < b ≤ 3, 1 ≤ c ≤ 4 and n = 1, 2 or 3 is supported." : null),
    prompt: ([a, b, c, n]) => `∫ from ${a} to ${b} of 2x(x² + ${c})${n === 1 ? "" : String(n).replace(/./g, (d) => SUP[d])} dx = ? (A fraction is fine.)`,
    solve: ([a, b, c, n]) => {
      const [u1, u2] = [a * a + c, b * b + c];
      const v = (powerOf(u2, n + 1) - powerOf(u1, n + 1)) / (n + 1);
      return { steps: [{ id: "u-limits", op: "evaluate", competency: "MATH.algebra.variables", inputs: [a, b, c], value: [u1, u2] }, { id: "antiderivative", op: "integrate", competency: "MATH.calculus.indefinite-integrals", inputs: [n, n + 1], value: 1 / (n + 1) }, { id: "upper", op: "evaluate", competency: EXP, inputs: [u2, n + 1], value: powerOf(u2, n + 1) }, { id: "lower", op: "evaluate", competency: EXP, inputs: [u1, n + 1], value: powerOf(u1, n + 1) }, { id: "difference", op: "subtract", competency: "MATH.calculus.integration-methods", inputs: [u2, u1], value: v }], answer: v };
    },
    validate: ([a, b, c, n], v) => typeof v === "number" && near(simpson((x) => 2 * x * (x * x + c) ** n, a, b), v, 1e-9),
    bugs: ([a, b, c, n]) => {
      const [u1, u2] = [a * a + c, b * b + c];
      return [
        { id: "limits-not-changed", kind: "procedural", competency: "MATH.calculus.integration-methods", says: `The old limits were used for u: when x goes from ${a} to ${b}, u = x² + ${c} goes from ${u1} to ${u2}.`, predict: (powerOf(b, n + 1) - powerOf(a, n + 1)) / (n + 1) },
        { id: "no-divide", kind: "procedural", competency: "MATH.calculus.indefinite-integrals", says: "The power was raised but not divided by: ∫ uⁿ du = uⁿ⁺¹ ⁄ (n + 1).", predict: powerOf(u2, n + 1) - powerOf(u1, n + 1) },
        { id: "extra-half", kind: "conceptual", competency: "MATH.calculus.integration-methods", says: "It was divided by 2 for du = 2x dx, but the 2x is already in the integral: 2x dx is exactly du.", predict: (powerOf(u2, n + 1) - powerOf(u1, n + 1)) / (2 * (n + 1)) },
        ...(u2 <= 12 && n + 1 <= 5 ? [powerSlip(u2, n + 1, u2 - u1)] : []),
      ];
    },
    variants: (p) => pairs(p, [[0, 1], [1, 2], [1, 3], [1, 2]], ([a, b]) => b > a),
    explain: (s) => (s.id === "u-limits" ? `Let u = x² + ${s.inputs[2]}: x = ${s.inputs[0]} gives u = ${(s.value as number[])[0]}, x = ${s.inputs[1]} gives u = ${(s.value as number[])[1]}` : s.id === "antiderivative" ? `2x dx = du, so the integral is ∫ u${sup(s.inputs[0])} du = u${sup(s.inputs[1])} ⁄ ${s.inputs[1]}` : s.id === "difference" ? `Between u = ${s.inputs[1]} and u = ${s.inputs[0]}: ${show(s.value)}` : `${s.inputs[0]}${sup(s.inputs[1])} = ${show(s.value)}`),
  },
  {
    id: "disc",
    arity: 2,
    title: "How many real solutions a quadratic has",
    competency: "MATH.algebra.quadratic-discriminant",
    type: "integer",
    mc: true,
    // [p, q]: x² + p x + q = 0
    parse: (t) => {
      const s = unsup(norm(t).toLowerCase()).replace(/ /g, "");
      const m = s.match(/howmany(?:real)?(?:solutions|roots).*x\^2([+-]\d*)x([+-]\d+)=0/);
      if (!m) return null;
      const c = m[1] === "+" ? 1 : m[1] === "-" ? -1 : int(m[1]);
      return [c, int(m[2])];
    },
    reject: ([p, q]) => (Math.abs(p) > 12 || Math.abs(q) > 40 || p === 0 || q === 0 ? "Only x² + px + q = 0 with whole numbers p and q not 0, |p| ≤ 12 and |q| ≤ 40 is supported." : null),
    prompt: ([p, q]) => `How many different real solutions does x² ${signed(p)}x ${signed(q)} = 0 have? (0, 1 or 2)`.replace(/ ([+−]) 1x/, " $1 x"),
    solve: ([p, q]) => {
      const d = p * p - 4 * q;
      const count = d > 0 ? 2 : d === 0 ? 1 : 0;
      return { steps: [{ id: "square", op: "evaluate", competency: EXP, inputs: [p, 2], value: p * p }, mul(4, q, MT, "four-q"), { id: "discriminant", op: "subtract", competency: "MATH.number.integer-add", inputs: [p * p, 4 * q], value: d }, { id: "count", op: "compare", competency: "MATH.algebra.quadratic-discriminant", inputs: [d], value: count }], answer: count };
    },
    // independent: the lowest point of y = x² + px + q, by evaluating the function at its axis of symmetry
    validate: ([p, q], v) => {
      const low = (-p / 2) ** 2 + p * (-p / 2) + q;
      return v === (low < 0 ? 2 : low === 0 ? 1 : 0);
    },
    bugs: ([p, q]) => {
      const count = (d: number) => (d > 0 ? 2 : d === 0 ? 1 : 0);
      const right = count(p * p - 4 * q);
      return [
        { id: "forgot-four", kind: "procedural", competency: "MATH.algebra.quadratic-discriminant", says: "The discriminant was taken as b² − c; it is b² − 4ac.", predict: count(p * p - q) },
        { id: "minus-c-sign", kind: "prerequisite", competency: "MATH.number.integer-add", says: "The sign of −4ac was lost when c is negative: − 4 × (a negative number) adds.", predict: q < 0 ? count(p * p + 4 * q) : null },
        { id: "negative-square", kind: "prerequisite", competency: EXP, says: "b² was taken as negative for a negative b; a square is never negative.", predict: p < 0 ? count(-(p * p) - 4 * q) : null },
      ].filter((x) => x.predict !== null && x.predict !== right) as Bug[];
    },
    variants: (p) => pairs(p, [[-6, 6], [-9, 9]], ([pp, qq]) => pp !== 0 && qq !== 0),
    explain: (s) => (s.id === "square" ? `b² = ${par(s.inputs[0])}² = ${show(s.value)}` : s.id === "four-q" ? `4ac = 4 × ${par(s.inputs[1])} = ${neg(show(s.value))}` : s.id === "discriminant" ? `b² − 4ac = ${s.inputs[0]} − ${par(s.inputs[1])} = ${neg(show(s.value))}` : `${show(s.inputs[0] as number)} is ${(s.inputs[0] as number) > 0 ? "positive: two solutions" : s.inputs[0] === 0 ? "zero: one solution" : "negative: no real solutions"}`),
  },
];
export const FAMILIES = new Map(F.map((f) => [f.id, f]));

/** The options of a multiple-choice form: the answer and up to three mal-rule answers (the first prediction of each
 * written explanation, in order), topped up with nearby values; sorted by value, so the letters are reproducible. */
function mcOptions(def: Def, p: number[], answer: number, bugs: Bug[]): number[] {
  if (def.id === "disc") return [0, 1, 2];
  const out: number[] = [];
  const add = (v: number | undefined) => {
    if (v !== undefined && Number.isFinite(v) && !near(v, answer) && !out.some((o) => near(o, v)) && (answer < 0 || v >= 0) && out.length < 3) out.push(v);
  };
  for (const b of bugs) add(b.predict === null ? undefined : Array.isArray(b.predict) ? b.predict[0] : b.predict);
  for (const v of [answer + 1, answer - 1, answer + 2, 2 * answer, answer + 3, answer - 2]) add(v);
  return [...out, answer].sort((x, y) => x - y);
}
const mcPrompt = (text: string) => `${text.replace(/ ?\((?:A fraction is fine\.|0, 1 or 2)\)$/, "").replace(/ What number goes in the box(?: \(it may be negative\))?\?$/, " Which number goes in the box?")} Choose one.`;

function build(def: Def, p: number[], form: Problem["form"] = "typed"): Problem {
  const { steps, answer } = def.solve(p);
  if (!def.validate(p, answer)) throw new Error(`families@1: ${def.id}(${p}) failed its independent check`);
  const raw = def.bugs(p);
  // an explanation that predicts the right answer here cannot be seen on this problem: drop those predictions
  const bugs = raw.flatMap((b) => {
    if (b.predict === null || def.type === "set" || typeof answer !== "number") return [b];
    if (!Array.isArray(b.predict)) return near(b.predict, answer) ? [] : [b];
    const keep = b.predict.filter((v) => !near(v, answer));
    return keep.length ? [{ ...b, predict: keep }] : [];
  });
  const base = { family: def.id, params: p, competency: def.competency, skill: def.skill ?? def.competency, steps };
  if (form === "mc") {
    if (!def.mc || typeof answer !== "number") throw new Error(`families@1: ${def.id} has no multiple-choice form`);
    const opts = mcOptions(def, p, answer, raw);
    const idx = (v: number) => opts.findIndex((o) => near(o, v));
    const right = idx(answer);
    const mcBugs = bugs.flatMap((b) => {
      const vals = b.predict === null ? [] : Array.isArray(b.predict) ? b.predict : [b.predict];
      const ix = [...new Set(vals.map(idx))].filter((i) => i >= 0 && i !== right);
      return ix.length ? [{ ...b, predict: ix.length === 1 ? ix[0] : ix }] : [];
    });
    return { ...base, id: `gen:${def.id}:${p.join(",")}:mc`, form, prompt: mcPrompt(def.prompt(p)), type: "choice", answer: "ABCD"[right], bugs: mcBugs, options: opts.map(show) };
  }
  const choice = def.type === "choice";
  return { ...base, id: `gen:${def.id}:${p.join(",")}`, form, prompt: def.prompt(p), type: def.type, answer: choice ? "AB"[answer as number] : show(answer), bugs, ...(choice ? { options: ["The line", "The parabola y = x²"] } : {}) };
}

export type Parsed = { supported: true; problem: Problem } | { supported: false; reason: string; family?: string };
/** Written problem → a supported problem, or a reason it is not supported. Never a guess. */
export function parseProblem(text: string): Parsed {
  if (!text.trim()) return { supported: false, reason: "Nothing to read." };
  if (text.length > 200) return { supported: false, reason: "Too long: type one problem." };
  for (const def of F) {
    const p = def.parse(text);
    if (!p || p.some((x) => !Number.isFinite(x))) continue;
    const why = def.reject(p);
    if (why) return { supported: false, family: def.id, reason: why };
    return { supported: true, problem: build(def, p) };
  }
  return { supported: false, reason: "This is not one of the kinds of problem OpenPath can work through yet, so it will not guess what went wrong." };
}

/** A stored generated question id "gen:<family>:<params>" → the problem (null if unknown or unsupported). */
export function problemOf(id: string): Problem | null {
  const m = id.match(/^gen:([a-z]+):(-?\d+(?:,-?\d+)*)(?::(mc))?$/);
  const def = m && FAMILIES.get(m[1]);
  if (!def) return null;
  const p = m![2].split(",").map(Number);
  if (p.length !== def.arity || def.reject(p) || (m![3] && !def.mc)) return null;
  try {
    return build(def, p, m![3] ? "mc" : "typed");
  } catch {
    return null;
  }
}
export const variantsOf = (pr: Problem): Problem[] => FAMILIES.get(pr.family)!.variants(pr.params).flatMap((p) => (FAMILIES.get(pr.family)!.reject(p) ? [] : [build(FAMILIES.get(pr.family)!, p)]));
export const explainStep = (pr: Problem, s: Step) => FAMILIES.get(pr.family)!.explain(s);

// ---------------------------------------------------------------- decomposition (decomposition@2)

export interface StepQuestion {
  step: Step;
  /** A question for this step, from another family, when the step is itself a supported problem. */
  question: Problem | null;
  /** Grade the step's competency belongs to. */
  grade: number;
}
/**
 * A problem's steps as questions a learner can answer on their own, each tied to the competency it uses. A younger
 * learner gets only steps at or below their grade; the full problem is offered only when every step is.
 */
export function decompose(pr: Problem, grade: number) {
  const steps: StepQuestion[] = pr.steps.map((s) => ({ step: s, grade: graph.get(s.competency).gradeRange[0], question: stepQuestion(pr, s) }));
  const forGrade = steps.filter((s) => s.grade <= grade && s.question);
  return { problem: pr, steps, forGrade, full: steps.every((s) => s.grade <= grade) && graph.get(pr.competency).gradeRange[0] <= grade };
}
function stepQuestion(pr: Problem, s: Step): Problem | null {
  const at = (fam: string, p: number[]) => (FAMILIES.get(fam)!.reject(p) ? null : build(FAMILIES.get(fam)!, p));
  if (s.op === "multiply" && s.inputs.every((x) => typeof x === "number")) return at("mul", s.inputs as number[]);
  if (s.op === "evaluate" && s.competency === EXP && s.inputs.every((x) => typeof x === "number")) return at("pow", s.inputs as number[]);
  if (pr.family === "alp") {
    const [m, c] = pr.params;
    if (s.id === "line-value") return at("linev", [m, c, s.inputs[2] as number]);
    if (s.id === "meet") return at("quad", [-m, -c]);
    if (s.id === "meet-try") return at("meet", [m, c]);
    if (s.id === "above") return at("above", [m, c, s.inputs[0] as number]);
  }
  if (pr.family === "cint" && s.id === "width") return null;
  return null;
}
