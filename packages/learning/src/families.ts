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
  type: Problem["type"];
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
];
export const FAMILIES = new Map(F.map((f) => [f.id, f]));

function build(def: Def, p: number[]): Problem {
  const { steps, answer } = def.solve(p);
  if (!def.validate(p, answer)) throw new Error(`families@1: ${def.id}(${p}) failed its independent check`);
  const choice = def.type === "choice";
  return { family: def.id, id: `gen:${def.id}:${p.join(",")}`, params: p, competency: def.competency, prompt: def.prompt(p), type: def.type, answer: choice ? "AB"[answer as number] : show(answer), steps, bugs: def.bugs(p), ...(choice ? { options: ["The line", "The parabola y = x²"] } : {}) };
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
  const m = id.match(/^gen:([a-z]+):(-?\d+(?:,-?\d+)*)$/);
  const def = m && FAMILIES.get(m[1]);
  if (!def) return null;
  const p = m![2].split(",").map(Number);
  if (p.length !== def.arity || def.reject(p)) return null;
  try {
    return build(def, p);
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
