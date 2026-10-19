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
import { numericValue, sameAnswer, NEW_TYPES } from "./answer-types";
import { DOMAIN_FAMILIES } from "./fam";

import { EXP, MT, SUP, SUPREAD, addForMul, coef, factId, factSlip, fmt, gcd, int, mul, near, neg, neighbours, norm, pairs, par, powerOf, powerSlip, show, signed, simpson, sup, unsup, xp, type Bug, type Def, type Problem, type Step, type Value } from "./family-kit";
export { show, neighbours, factId, type Bug, type Problem, type Step, type Value, type Def } from "./family-kit";

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
        // the factor pair has the right product but not the right sum: a factorisation gap (algebra), not a quadratics one
        ...wrongPair(p, q, roots),
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
  // ======================================================== families@2: families for curriculum coverage (each with an
  // approved generation domain, a difficulty rule and teaching hints; reviewed as a whole, see spec.ts)
  {
    id: "rperim",
    arity: 2,
    title: "The perimeter of a rectangle",
    competency: "MATH.measurement.rectangle-perimeter",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: ([l, w]) => (l < 1 || w < 1 || l > 20 || w > 20 || l === w ? "Only rectangles (not squares) with whole-number sides up to 20 are supported." : null),
    prompt: ([l, w]) => `A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter in centimetres?`,
    solve: ([l, w]) => ({ steps: [{ id: "pair", op: "add", competency: "MATH.number.addition", inputs: [l, w], value: l + w }, { id: "double", op: "multiply", competency: "MATH.measurement.rectangle-perimeter", inputs: [2, l + w], value: 2 * (l + w) }], answer: 2 * (l + w) }),
    // walk once around the outside, one unit edge at a time
    validate: ([l, w], v) => {
      let n = 0;
      for (const side of [l, w, l, w]) for (let i = 0; i < side; i++) n++;
      return v === n;
    },
    bugs: ([l, w]) => [
      { id: "area-for-perimeter", kind: "conceptual", competency: "MATH.measurement.rectangle-perimeter", says: "The space inside (area) was found; the perimeter is the distance around the edge.", predict: l * w },
      { id: "two-sides-only", kind: "procedural", competency: "MATH.measurement.rectangle-perimeter", says: "Only two sides were added; a rectangle has four sides, two of each length.", predict: l + w },
      { id: "three-sides", kind: "procedural", competency: "MATH.measurement.rectangle-perimeter", says: "One side was left out; go all the way around: four sides.", predict: 2 * l + w },
    ],
    variants: (p) => pairs(p, [[2, 12], [1, 9]], ([l, w]) => l > w),
    explain: (s) => (s.id === "pair" ? `One length and one width: ${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}` : `Twice round that pair: 2 × ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[2, 20], [1, 19]],
    keep: ([l, w]) => l > w,
    difficulty: ([l, w]) => (l + w <= 12 ? 1 : l + w <= 24 ? 2 : 3),
    teach: { idea: "The perimeter is the distance all the way around a shape: add the lengths of every side.", method: "A rectangle has two lengths and two widths: add one length and one width, then double." },
  },
  {
    id: "mmul",
    arity: 2,
    title: "Multiplying a two-digit number by a one-digit number",
    competency: "MATH.number.multi-multiplication",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: ([a, b]) => (a < 12 || a > 99 || b < 2 || b > 9 || a % 10 === 0 ? "Only a two-digit number (not a multiple of 10) times 2 to 9 is supported." : null),
    prompt: ([a, b]) => `${a} × ${b} = ?`,
    solve: ([a, b]) => {
      const t = Math.floor(a / 10) * 10;
      const o = a % 10;
      return { steps: [mul(t, b, MT, "tens"), mul(o, b, MT, "ones"), { id: "sum", op: "add", competency: "MATH.number.multi-multiplication", inputs: [t * b, o * b], value: a * b }], answer: a * b };
    },
    validate: ([a, b], v) => v === [...Array(b)].reduce((s) => s + a, 0),
    bugs: ([a, b]) => {
      const t = Math.floor(a / 10);
      const o = a % 10;
      return [
        { id: "lost-carry", kind: "procedural", competency: "MATH.number.multi-multiplication", says: "The tens carried from the ones were not added: they belong in the tens column.", predict: t * b * 10 + ((o * b) % 10) },
        { id: "tens-as-ones", kind: "conceptual", competency: "MATH.number.multi-multiplication", says: `The tens digit was multiplied as if it were ${t}, not ${t * 10}: each digit's place value counts.`, predict: t * b + o * b },
        factSlip(o, b, 1, t * 10 * b),
      ];
    },
    variants: (p) => pairs(p, [[12, 49], [2, 9]], ([a]) => a % 10 !== 0).slice(0, 80),
    explain: (s) => (s.id === "sum" ? `${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}` : `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[12, 99], [2, 9]],
    difficulty: ([a, b]) => ((a % 10) * b < 10 ? 1 : a < 50 ? 2 : 3),
    teach: { idea: "Split the two-digit number into tens and ones, multiply each part, then add.", method: "47 × 6 = 40 × 6 + 7 × 6 = 240 + 42 = 282. The 4 tens of 42 join the tens." },
  },
  {
    id: "divr",
    arity: 2,
    title: "The remainder of a division",
    competency: "MATH.number.division-remainders",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: ([n, d]) => (n < 10 || n > 99 || d < 2 || d > 9 || n % d === 0 || n < d * 2 ? "Only two-digit numbers divided by 2 to 9 with a remainder are supported." : null),
    prompt: ([n, d]) => `${n} ÷ ${d} = ${Math.floor(n / d)} remainder □. What is the remainder?`,
    solve: ([n, d]) => {
      const q = Math.floor(n / d);
      return { steps: [mul(q, d, MT, "groups"), { id: "left", op: "subtract", competency: "MATH.number.division-remainders", inputs: [n, q * d], value: n - q * d }], answer: n - q * d };
    },
    validate: ([n, d], v) => {
      let r = n;
      while (r >= d) r -= d; // take away groups of d
      return v === r;
    },
    bugs: ([n, d]) => {
      const q = Math.floor(n / d);
      return [
        { id: "quotient-as-remainder", kind: "conceptual", competency: "MATH.number.division-remainders", says: "The number of groups was given; the remainder is what is left over after the groups.", predict: q },
        { id: "remainder-too-big", kind: "procedural", competency: "MATH.number.division-remainders", says: `One group too few was taken: a remainder is always less than ${d}.`, predict: n - (q - 1) * d },
        // a slip in the times-table fact q × d, which gives a remainder that is still possible (0 to d − 1)
        ...(q <= 12 ? [{ ...factSlip(q, d, -1, n), predict: neighbours(q, d).map((v) => n - v).filter((r) => r >= 0 && r < d && r !== n - q * d) }].filter((b) => (b.predict as number[]).length > 0) : []),
      ];
    },
    variants: (p) => pairs(p, [[20, 60], [3, 9]], ([n, d]) => n % d !== 0).slice(0, 80),
    explain: (s) => (s.id === "groups" ? `${s.inputs[0]} groups of ${s.inputs[1]} make ${show(s.value)}` : `${s.inputs[0]} − ${s.inputs[1]} = ${show(s.value)} left over`),
    domain: [[10, 99], [2, 9]],
    difficulty: ([n, d]) => (d <= 5 && n < 50 ? 1 : d <= 7 ? 2 : 3),
    teach: { idea: "Dividing makes equal groups; the remainder is what is left when no more full groups fit.", method: "Find the biggest multiple of the divisor that fits, then subtract it from the number." },
  },
  {
    id: "ldiv",
    arity: 2,
    title: "Dividing a number exactly",
    competency: "MATH.number.long-division",
    type: "integer",
    mc: true,
    parse: () => null,
    // [q, d]: (q × d) ÷ d
    reject: ([q, d]) => (q < 12 || q > 99 || d < 2 || d > 9 ? "Only a two-digit answer, dividing by 2 to 9, is supported." : null),
    prompt: ([q, d]) => `${q * d} ÷ ${d} = ?`,
    solve: ([q, d]) => {
      const t = Math.floor(q / 10) * 10;
      // a multiple of ten: the first chunk is the whole answer
      if (q === t) return { steps: [mul(t, d, MT, "tens"), { id: "whole", op: "evaluate", competency: "MATH.number.long-division", inputs: [q * d, d], value: q }], answer: q };
      return { steps: [mul(t, d, MT, "tens"), { id: "rest", op: "subtract", competency: "MATH.number.long-division", inputs: [q * d, t * d], value: q * d - t * d }, { id: "ones", op: "divide", competency: MT, inputs: [q * d - t * d, d], value: q - t }, { id: "sum", op: "add", competency: "MATH.number.long-division", inputs: [t, q - t], value: q }], answer: q };
    },
    validate: ([q, d], v) => {
      let n = q * d;
      let k = 0;
      while (n > 0) (n -= d), k++; // count the groups
      return v === k && n === 0;
    },
    bugs: ([q, d]) => [
      { id: "dropped-zero", kind: "procedural", competency: "MATH.number.long-division", says: "A zero in the answer was left out: when the divisor does not go into a step, write 0 there.", predict: q % 10 === 0 ? Math.floor(q / 10) : null },
      { id: "digits-reversed", kind: "procedural", competency: "MATH.number.long-division", says: "The digits of the answer were written in the wrong order: the first step gives the tens.", predict: q % 10 !== 0 && Math.floor(q / 10) !== q % 10 ? (q % 10) * 10 + Math.floor(q / 10) : null },
      { id: "one-group-off", kind: "recall", competency: MT, says: `A multiplication fact with ${d} slipped by one group.`, predict: [q + 1, q - 1] },
    ].filter((b) => b.predict !== null) as Bug[],
    variants: (p) => pairs(p, [[12, 40], [2, 9]], () => true).slice(0, 80),
    explain: (s) => (s.id === "tens" ? `${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}` : s.id === "whole" ? `So ${s.inputs[0]} ÷ ${s.inputs[1]} = ${show(s.value)}` : s.id === "rest" ? `${s.inputs[0]} − ${s.inputs[1]} = ${show(s.value)}` : s.id === "ones" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${show(s.value)}` : `${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[12, 99], [2, 9]],
    difficulty: ([q, d]) => (d <= 5 && q < 30 ? 1 : q < 60 ? 2 : 3),
    teach: { idea: "Dividing undoes multiplying: 84 ÷ 4 asks how many 4s make 84.", method: "Take away a large, easy chunk first (20 × 4 = 80), then divide what is left (4 ÷ 4 = 1): 20 + 1 = 21." },
  },
  {
    id: "fmulw",
    arity: 3,
    title: "A fraction times a whole number",
    competency: "MATH.number.fraction-multiply",
    type: "fraction",
    mc: true,
    parse: () => null,
    // [a, b, k]: k × a/b
    reject: ([a, b, k]) => (b < 2 || b > 12 || a < 1 || a >= b || k < 2 || k > 9 ? "Only k × a/b with a proper fraction (denominator up to 12) and k from 2 to 9 is supported." : null),
    prompt: ([a, b, k]) => `${k} × ${a}/${b} = ? (A fraction is fine.)`,
    solve: ([a, b, k]) => ({ steps: [mul(k, a, MT, "tops"), { id: "keep", op: "evaluate", competency: "MATH.number.fraction-multiply", inputs: [b], value: b }], answer: (k * a) / b }),
    // repeated addition of a/b, k times
    validate: ([a, b, k], v) => typeof v === "number" && near([...Array(k)].reduce((s) => s + a / b, 0), v),
    bugs: ([a, b, k]) => [
      { id: "multiply-both", kind: "conceptual", competency: "MATH.number.fraction-multiply", says: `Top and bottom were both multiplied by ${k}: that gives an equal fraction, not ${k} lots of it.`, predict: a / b },
      { id: "multiply-bottom", kind: "procedural", competency: "MATH.number.fraction-multiply", says: `The bottom was multiplied; ${k} lots of ${a}/${b} is ${k} × ${a} pieces of the same size.`, predict: a / (b * k) },
      { id: "add-whole", kind: "conceptual", competency: "MATH.number.fraction-multiply", says: `${k} was added to the top; multiplying means ${k} lots.`, predict: (a + k) / b },
      // the method is right, the multiplication fact is not: one group of ${a} too many (a fluency gap, not a fraction one)
      ...(a >= 2 && k * a + a <= 144 ? [{ id: "fact-slip-multiply", kind: "prerequisite" as const, competency: MT, says: `${k} × ${a} was taken as ${(k + 1) * a}, one group of ${a} too many: the method was right, the multiplication fact was not.`, predict: ((k + 1) * a) / b, ...(a <= 12 ? { probe: `gen:mul:${k},${a}` } : {}) }] : []),
    ],
    variants: (p) => pairs(p, [[1, 5], [2, 8], [2, 6]], ([a, b]) => a < b).slice(0, 80),
    explain: (s) => (s.id === "tops" ? `${s.inputs[0]} lots of ${s.inputs[1]} ${s.inputs[1] === 1 ? "piece" : "pieces"}: ${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)} pieces` : `The pieces are still the same size (each is 1/${s.inputs[0]}): the bottom stays ${s.inputs[0]}`),
    domain: [[1, 11], [2, 12], [2, 9]],
    keep: ([a, b]) => a < b,
    difficulty: ([a, b, k]) => (k * a < b ? 1 : k * a <= 2 * b ? 2 : 3),
    teach: { idea: "k × a/b means k lots of a/b: the pieces stay the same size, there are just more of them.", method: "Multiply the top by k and keep the bottom: 3 × 2/7 = 6/7." },
  },
  {
    id: "faddu",
    arity: 4,
    title: "Adding fractions with different denominators",
    competency: "MATH.number.fraction-add",
    type: "fraction",
    mc: true,
    parse: () => null,
    reject: ([a, b, c, d]) => (b < 2 || d < 2 || b > 10 || d > 10 || b === d || a < 1 || c < 1 || a >= b || c >= d ? "Only proper fractions with different denominators up to 10 are supported." : null),
    prompt: ([a, b, c, d]) => `${a}/${b} + ${c}/${d} = ? (A fraction is fine.)`,
    solve: ([a, b, c, d]) => {
      const l = (b * d) / gcd(b, d);
      return { steps: [{ id: "common", op: "multiply", competency: "MATH.number.equivalent-fractions", inputs: [b, d], value: l }, { id: "rename", op: "multiply", competency: "MATH.number.equivalent-fractions", inputs: [a * (l / b), c * (l / d)], value: [a * (l / b), c * (l / d)] }, { id: "add", op: "add", competency: "MATH.number.fraction-add", inputs: [a * (l / b), c * (l / d), l], value: a / b + c / d }], answer: a / b + c / d };
    },
    // counting pieces: find a piece size both denominators share by trying multiples, then count pieces
    validate: ([a, b, c, d], v) => {
      let D = b;
      while (D % d !== 0) D += b;
      let pieces = 0;
      for (let i = 0; i < a; i++) pieces += D / b;
      for (let i = 0; i < c; i++) pieces += D / d;
      return typeof v === "number" && near(pieces / D, v);
    },
    bugs: ([a, b, c, d]) => {
      const l = (b * d) / gcd(b, d);
      return [
        { id: "add-tops-and-bottoms", kind: "conceptual", competency: "MATH.number.fraction-add", says: "Tops and bottoms were added separately; fractions with different pieces must first be written with the same pieces.", predict: (a + c) / (b + d) },
        { id: "same-bottom-not-scaled", kind: "procedural", competency: "MATH.number.equivalent-fractions", says: "A common denominator was chosen but the tops were not changed to match it.", predict: (a + c) / l },
      ];
    },
    variants: (p) => pairs(p, [[1, 3], [2, 6], [1, 3], [2, 6]], ([a, b, c, d]) => a < b && c < d && b < d).slice(0, 80),
    explain: (s) => (s.id === "common" ? `A common denominator of ${s.inputs[0]} and ${s.inputs[1]}: ${show(s.value)}` : s.id === "rename" ? `Rename both: ${(s.value as number[])[0]} and ${(s.value as number[])[1]} of those pieces` : `${s.inputs[0]} + ${s.inputs[1]} = ${(s.inputs[0] as number) + (s.inputs[1] as number)} pieces of ${s.inputs[2]}: ${show(s.value)}`),
    domain: [[1, 9], [2, 10], [1, 9], [2, 10]],
    keep: ([a, b, c, d]) => a < b && c < d && b < d,
    difficulty: ([, b, , d]) => (d % b === 0 ? 1 : gcd(b, d) > 1 ? 2 : 3),
    teach: { idea: "Fractions can be added only when they count the same size of piece.", method: "Write both with a common denominator (an equivalent fraction for each), then add the tops." },
  },
  {
    id: "pct",
    arity: 2,
    title: "A percentage of an amount",
    competency: "MATH.number.percentage",
    type: "integer",
    mc: true,
    parse: () => null,
    // [p, n]: p% of n, with a whole-number answer
    reject: ([p, n]) => (p < 5 || p > 95 || p % 5 !== 0 || n < 20 || n > 400 || n % 20 !== 0 || (p * n) % 100 !== 0 ? "Only multiples of 5% of multiples of 20 (up to 400) with a whole-number answer are supported." : null),
    prompt: ([p, n]) => `What is ${p}% of ${n}?`,
    solve: ([p, n]) => {
      // through 10% (or 5%), which is a whole number here
      const [part, per] = p % 10 === 0 ? [10, n / 10] : [5, n / 20];
      return { steps: [{ id: "one", op: "divide", competency: "MATH.number.percentage", inputs: [n, part], value: per }, { id: "scale", op: "multiply", competency: "MATH.number.percentage", inputs: [p / part, per, p], value: (p * n) / 100 }], answer: (p * n) / 100 };
    },
    // counting: share n into 100 equal parts by repeated subtraction of whole hundredths… done on 100·n so it stays
    // whole: p of the 100 parts of n is the number that, added up 100 times, gives p × n
    validate: ([p, n], v) => {
      if (typeof v !== "number") return false;
      let total = 0;
      for (let i = 0; i < 100; i++) total += v; // 100 lots of the answer
      let target = 0;
      for (let i = 0; i < p; i++) target += n; // p lots of the amount
      return total === target;
    },
    bugs: ([p, n]) => [
      { id: "no-hundred", kind: "conceptual", competency: "MATH.number.percentage", says: "Per cent means out of 100: the amount must be divided by 100 as well as multiplied.", predict: p * n },
      { id: "percent-as-divisor", kind: "conceptual", competency: "MATH.number.percentage", says: `It was divided by ${p}; ${p}% means ${p} out of every 100.`, predict: n % p === 0 ? n / p : null },
      { id: "subtracted", kind: "procedural", competency: "MATH.number.percentage", says: `${p}% of ${n} is a part of ${n}, not ${n} minus ${p}.`, predict: n - p > 0 ? n - p : null },
    ].filter((b) => b.predict !== null) as Bug[],
    variants: (p) => pairs(p, [[2, 19], [1, 20]], () => true).map(([a, b]) => [5 * a, 20 * b]).filter(([a, b]) => (a * b) % 100 === 0).slice(0, 80),
    explain: (s) => (s.id === "one" ? `${s.inputs[1]}% of ${s.inputs[0]} is ${s.inputs[0]} ÷ ${100 / (s.inputs[1] as number)} = ${show(s.value)}` : `${s.inputs[2]}% is ${s.inputs[0]} lots of that: ${s.inputs[0]} × ${show(s.inputs[1] as number)} = ${show(s.value)}`),
    domain: [[5, 95], [20, 400]],
    keep: ([p, n]) => p % 5 === 0 && n % 20 === 0,
    difficulty: ([p]) => ([10, 25, 50].includes(p) ? 1 : p % 10 === 0 ? 2 : 3),
    teach: { idea: "Per cent means out of 100: 30% of an amount is 30 parts of every 100.", method: "Find 1% (divide by 100) or 10% (divide by 10), then build up: 30% of 200 = 3 × 20 = 60." },
  },
  {
    id: "mean4",
    arity: 4,
    title: "The mean of four numbers",
    competency: "MATH.statistics.averages-intro",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: (v) => (v.some((x) => x < 1 || x > 12) || v.reduce((s, x) => s + x, 0) % 4 !== 0 || new Set(v).size < 3 ? "Only four whole numbers from 1 to 12 (at least three different) with a whole-number mean are supported." : null),
    prompt: (v) => `What is the mean of ${v.slice(0, 3).join(", ")} and ${v[3]}?`,
    solve: (v) => {
      const s = v.reduce((a, b) => a + b, 0);
      return { steps: [{ id: "total", op: "add", competency: "MATH.number.addition", inputs: v, value: s }, { id: "share", op: "divide", competency: "MATH.statistics.averages-intro", inputs: [s, 4], value: s / 4 }], answer: s / 4 };
    },
    // level the numbers out: move one unit at a time from the largest to the smallest until all are equal
    validate: (v, m) => {
      const xs = [...v];
      for (let guard = 0; guard < 200; guard++) {
        const hi = xs.indexOf(Math.max(...xs));
        const lo = xs.indexOf(Math.min(...xs));
        if (xs[hi] === xs[lo]) break;
        xs[hi]--;
        xs[lo]++;
      }
      return typeof m === "number" && xs.every((x) => x === m);
    },
    bugs: (v) => {
      const s = v.reduce((a, b) => a + b, 0);
      const sorted = [...v].sort((a, b) => a - b);
      return [
        { id: "total-not-shared", kind: "procedural", competency: "MATH.statistics.averages-intro", says: "The numbers were added but the total was not shared out among the four.", predict: s },
        { id: "divide-by-three", kind: "procedural", competency: "MATH.statistics.averages-intro", says: "The total was divided by the wrong count: there are four numbers.", predict: s % 3 === 0 ? s / 3 : null },
        { id: "middle-for-mean", kind: "conceptual", competency: "MATH.statistics.averages-intro", says: "A middle value was chosen; the mean shares the total equally.", predict: Number.isInteger((sorted[1] + sorted[2]) / 2) ? (sorted[1] + sorted[2]) / 2 : null },
      ].filter((b) => b.predict !== null) as Bug[];
    },
    variants: (p) => pairs(p, [[1, 9], [2, 10], [3, 11], [4, 12]], (v) => v[0] < v[1] && v[1] < v[2] && v[2] < v[3] && v.reduce((s, x) => s + x, 0) % 4 === 0).slice(0, 80),
    explain: (s) => (s.id === "total" ? `${s.inputs.join(" + ")} = ${show(s.value)}` : `${s.inputs[0]} ÷ 4 = ${show(s.value)}`),
    domain: [[1, 12], [1, 12], [1, 12], [1, 12]],
    keep: (v) => v[0] < v[1] && v[1] < v[2] && v[2] < v[3],
    difficulty: (v) => (v[3] <= 8 ? 1 : v[3] <= 10 ? 2 : 3),
    teach: { idea: "The mean shares the total out equally: it is the value every number would have if they were levelled out.", method: "Add all the numbers, then divide by how many numbers there are." },
  },
  {
    id: "root",
    arity: 1,
    title: "The square root of a perfect square",
    competency: "MATH.number.square-roots",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: ([n]) => (n < 2 || n > 100 ? "Only square roots of perfect squares from 4 to 10 000 are supported." : null),
    prompt: ([n]) => `√${n * n} = ?`,
    solve: ([n]) => ({ steps: [{ id: "root", op: "evaluate", competency: "MATH.number.square-roots", inputs: [n * n], value: n }], answer: n }),
    validate: ([n], v) => typeof v === "number" && v > 0 && v * v === n * n,
    bugs: ([n]) => [
      { id: "half-for-root", kind: "conceptual", competency: "MATH.number.square-roots", says: "The number was halved; the square root is the number that multiplied by itself gives it.", predict: (n * n) % 2 === 0 ? (n * n) / 2 : null },
      { id: "squared-instead", kind: "conceptual", competency: "MATH.number.square-roots", says: "The number was squared; the square root goes the other way.", predict: n * n * n * n <= 1e6 ? n * n * n * n : null },
      { id: "near-square", kind: "recall", competency: MT, says: "A square fact next to the right one was used.", predict: [n + 1, n - 1] },
    ].filter((b) => b.predict !== null) as Bug[],
    variants: (p) => [...Array(18).keys()].map((k) => [k + 2]).filter(([n]) => n !== p[0]),
    explain: (s) => `${show(s.value)} × ${show(s.value)} = ${s.inputs[0]}`,
    domain: [[2, 100]],
    difficulty: ([n]) => (n <= 10 ? 1 : n <= 15 ? 2 : 3),
    teach: { idea: "A square root undoes squaring: √49 is the number that, multiplied by itself, makes 49.", method: "Think of the square facts: 7 × 7 = 49, so √49 = 7." },
  },
  {
    id: "vol",
    arity: 3,
    title: "The volume of a cuboid in unit cubes",
    competency: "MATH.measurement.volume-cubes",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: ([l, w, h]) => (l < 2 || w < 2 || h < 2 || l > 8 || w > 8 || h > 8 ? "Only cuboids with whole-number sides from 2 to 8 are supported." : null),
    prompt: ([l, w, h]) => `A box is built from 1 cm cubes: ${l} long, ${w} wide and ${h} high. How many cubes is that?`,
    solve: ([l, w, h]) => ({ steps: [mul(l, w, MT, "layer"), mul(l * w, h, "MATH.measurement.volume-cubes", "layers")], answer: l * w * h }),
    validate: ([l, w, h], v) => {
      let n = 0;
      for (let i = 0; i < l; i++) for (let j = 0; j < w; j++) for (let k = 0; k < h; k++) n++; // count every cube
      return v === n;
    },
    bugs: ([l, w, h]) => [
      { id: "one-layer", kind: "conceptual", competency: "MATH.measurement.volume-cubes", says: "Only the bottom layer was counted; there are as many layers as the height.", predict: l * w },
      { id: "added-sides", kind: "conceptual", competency: "MATH.measurement.volume-cubes", says: "The three lengths were added; volume multiplies them.", predict: l + w + h },
      { id: "outside-only", kind: "conceptual", competency: "MATH.measurement.volume-cubes", says: "The squares on the outside faces were counted; volume counts the cubes inside too.", predict: 2 * (l * w + w * h + l * h) },
    ],
    variants: (p) => pairs(p, [[2, 6], [2, 5], [2, 4]], ([l, w]) => l >= w).slice(0, 80),
    explain: (s) => (s.id === "layer" ? `One layer: ${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)} cubes` : `${s.inputs[1]} layers: ${s.inputs[0]} × ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[2, 8], [2, 8], [2, 8]],
    keep: ([l, w]) => l >= w,
    difficulty: ([l, w, h]) => (l * w * h <= 40 ? 1 : l * w * h <= 120 ? 2 : 3),
    teach: { idea: "Volume counts the cubes that fill a shape: layers of cubes stacked up.", method: "Count one layer (length × width), then multiply by the number of layers (the height)." },
  },
  {
    id: "lin",
    arity: 3,
    title: "Solving ax + b = c",
    competency: "MATH.algebra.linear-equations",
    type: "integer",
    mc: true,
    parse: () => null,
    // [a, b, x]: a x + b = a·x + b
    reject: ([a, b, x]) => (a < 2 || a > 9 || b < 1 || b > 30 || x < 1 || x > 12 ? "Only ax + b = c with 2 ≤ a ≤ 9, 1 ≤ b ≤ 30 and a whole-number solution from 1 to 12 is supported." : null),
    prompt: ([a, b, x]) => `Solve ${a}x + ${b} = ${a * x + b}. What is x?`,
    solve: ([a, b, x]) => ({ steps: [{ id: "undo-add", op: "subtract", competency: "MATH.algebra.linear-equations", inputs: [a * x + b, b], value: a * x }, { id: "undo-multiply", op: "divide", competency: MT, inputs: [a * x, a], value: x }], answer: x }),
    // substitution: the answer makes the two sides of the equation equal (computed by repeated addition)
    validate: ([a, b, x], v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100 && [...Array(v)].reduce((s) => s + a, 0) + b === a * x + b && v >= 1,
    bugs: ([a, b, x]) => {
      const c = a * x + b;
      return [
        { id: "forgot-divide", kind: "procedural", competency: "MATH.algebra.linear-equations", says: `${b} was taken away but the ${a} was not divided out: ${a}x = ${c - b} means x = ${c - b} ÷ ${a}.`, predict: c - b },
        { id: "added-not-subtracted", kind: "procedural", competency: "MATH.algebra.linear-equations", says: `${b} was added to both sides; to undo + ${b}, subtract ${b}.`, predict: (c + b) % a === 0 ? (c + b) / a : null },
        { id: "divided-first", kind: "procedural", competency: "MATH.algebra.linear-equations", says: `Only part of the left side was divided: undo the + ${b} first, then the × ${a}.`, predict: c % a === 0 ? c / a - b : null },
      ].filter((b2) => b2.predict !== null) as Bug[];
    },
    variants: (p) => pairs(p, [[2, 6], [1, 12], [1, 9]], () => true).slice(0, 80),
    explain: (s) => (s.id === "undo-add" ? `Take ${s.inputs[1]} from both sides: ${show(s.value)}` : `Divide by ${s.inputs[1]}: ${s.inputs[0]} ÷ ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[2, 9], [1, 30], [1, 12]],
    keep: ([, b]) => b <= 20,
    difficulty: ([a, b, x]) => (a * x + b <= 30 ? 1 : a * x + b <= 70 ? 2 : 3),
    teach: { idea: "An equation is a balance: do the same to both sides and it stays true.", method: "Undo the operations in reverse order: first take away the number added, then divide by the number multiplying x." },
  },
  {
    id: "prop",
    arity: 3,
    title: "A direct proportion",
    competency: "MATH.number.proportion",
    type: "integer",
    mc: true,
    parse: () => null,
    // [a, u, c]: a items cost a·u; what do c items cost?
    reject: ([a, u, c]) => (a < 2 || a > 8 || u < 2 || u > 15 || c < 2 || c > 12 || c === a ? "Only a items for a·u, then c items (2 to 12, not a), is supported." : null),
    prompt: ([a, u, c]) => `${a} pencils cost ₹${a * u}. At the same price each, how much do ${c} pencils cost, in rupees?`,
    solve: ([a, u, c]) => ({ steps: [{ id: "unit", op: "divide", competency: "MATH.number.proportion", inputs: [a * u, a], value: u }, mul(u, c, MT, "scale")], answer: u * c }),
    // build the price up pencil by pencil: find the price of one by sharing the total out, then add it c times
    validate: ([a, u, c], v) => {
      let one = 0;
      while (one * a < a * u) one++; // the price of one pencil, by trying
      let total = 0;
      for (let i = 0; i < c; i++) total += one;
      return v === total;
    },
    bugs: ([a, u, c]) => [
      { id: "additive", kind: "conceptual", competency: "MATH.number.proportion", says: `The difference in pencils was added to the price; in a proportion every pencil costs the same, so the price is multiplied.`, predict: a * u + (c - a) > 0 ? a * u + (c - a) : null },
      { id: "no-unit", kind: "procedural", competency: "MATH.number.proportion", says: `The total for ${a} was multiplied by ${c}; first find the price of one pencil.`, predict: a * u * c },
    ].filter((b) => b.predict !== null) as Bug[],
    variants: (p) => pairs(p, [[2, 6], [2, 9], [2, 9]], ([a, , c]) => a !== c).slice(0, 80),
    explain: (s) => (s.id === "unit" ? `One pencil: ₹${s.inputs[0]} ÷ ${s.inputs[1]} = ₹${show(s.value)}` : `${s.inputs[1]} pencils: ${s.inputs[1]} × ₹${s.inputs[0]} = ₹${show(s.value)}`),
    domain: [[2, 8], [2, 15], [2, 12]],
    difficulty: ([a, u, c]) => (u * c <= 40 ? 1 : u * c <= 100 ? 2 : 3),
    teach: { idea: "In a direct proportion, twice as many costs twice as much: the price of one stays the same.", method: "Find the cost of one (divide), then multiply by how many you want." },
  },
  {
    id: "factor",
    arity: 2,
    title: "Factorising x² + px + q",
    competency: "MATH.algebra.factorisation",
    type: "integer",
    mc: true,
    parse: () => null,
    // [m, n]: x² + (m+n)x + mn = (x + m)(x + □)
    reject: ([m, n]) => (m === 0 || n === 0 || Math.abs(m) > 9 || Math.abs(n) > 9 || m === n || m + n === 0 ? "Only (x + m)(x + n) with different non-zero m and n up to 9 (and m + n not 0) is supported." : null),
    prompt: ([m, n]) => `Factorise: x² ${signed(m + n)}x ${signed(m * n)} = (x ${signed(m)})(x + □). What number goes in the box (it may be negative)?`.replace(/ ([+−]) 1x/, " $1 x"),
    solve: ([m, n]) => ({ steps: [{ id: "product", op: "divide", competency: "MATH.algebra.factorisation", inputs: [m * n, m], value: n }, { id: "check-sum", op: "add", competency: "MATH.number.integer-add", inputs: [m, n], value: m + n }], answer: n }),
    // expand the brackets back at three points
    validate: ([m, n], v) => typeof v === "number" && [-2, 1, 3].every((x) => (x + m) * (x + v) === x * x + (m + n) * x + m * n),
    bugs: ([m, n]) => [
      { id: "sum-minus-product", kind: "procedural", competency: "MATH.algebra.factorisation", says: "The number was found from the product alone, with the wrong sign: the two numbers must multiply to q AND add to p.", predict: -n },
      { id: "coefficient-as-number", kind: "conceptual", competency: "MATH.algebra.factorisation", says: "The x coefficient was copied into the bracket; the two numbers in the brackets add up to it.", predict: m + n },
      { id: "constant-minus", kind: "procedural", competency: "MATH.algebra.factorisation", says: "The given number was taken away from the constant; the two numbers multiply to the constant.", predict: m * n - m },
    ],
    variants: (p) => pairs(p, [[-5, 5], [-6, 6]], ([m, n]) => m !== 0 && n !== 0 && m !== n && m + n !== 0).slice(0, 80),
    explain: (s) => (s.id === "product" ? `The numbers multiply to ${neg(s.inputs[0])}: ${neg(s.inputs[0])} ÷ ${par(s.inputs[1])} = ${neg(show(s.value))}` : `Check they add to the x coefficient: ${neg(s.inputs[0])} + ${par(s.inputs[1])} = ${neg(show(s.value))}`),
    domain: [[-9, 9], [-9, 9]],
    difficulty: ([m, n]) => (m > 0 && n > 0 ? 1 : m * n > 0 ? 2 : 3),
    teach: { idea: "(x + m)(x + n) = x² + (m + n)x + mn: the two numbers multiply to the constant and add to the x coefficient.", method: "List pairs that multiply to the constant; choose the pair that adds to the x coefficient. Watch the signs." },
  },
  {
    id: "apn",
    arity: 3,
    title: "The nth term of an arithmetic progression",
    competency: "MATH.algebra.arithmetic-sequences",
    type: "integer",
    mc: true,
    parse: () => null,
    // [a, d, n]
    reject: ([a, d, n]) => (a < 1 || a > 20 || d < 2 || d > 9 || n < 5 || n > 20 ? "Only first terms 1 to 20, common differences 2 to 9 and terms 5 to 20 are supported." : null),
    prompt: ([a, d, n]) => `An arithmetic progression starts ${a}, ${a + d}, ${a + 2 * d}, … What is term number ${n}?`,
    solve: ([a, d, n]) => ({ steps: [{ id: "steps", op: "subtract", competency: "MATH.algebra.arithmetic-sequences", inputs: [n, 1], value: n - 1 }, mul(n - 1, d, MT, "jump"), { id: "term", op: "add", competency: "MATH.algebra.arithmetic-sequences", inputs: [a, (n - 1) * d], value: a + (n - 1) * d }], answer: a + (n - 1) * d }),
    validate: ([a, d, n], v) => {
      let t = a;
      for (let k = 1; k < n; k++) t += d; // count along the sequence
      return v === t;
    },
    bugs: ([a, d, n]) => [
      { id: "n-jumps", kind: "procedural", competency: "MATH.algebra.arithmetic-sequences", says: `${n} jumps were counted; from term 1 to term ${n} there are ${n - 1} jumps.`, predict: a + n * d },
      { id: "times-n", kind: "conceptual", competency: "MATH.algebra.arithmetic-sequences", says: "The first term was multiplied; an arithmetic progression adds the same difference each time.", predict: a * n },
      { id: "forgot-start", kind: "procedural", competency: "MATH.algebra.arithmetic-sequences", says: "Only the jumps were counted; the sequence starts at the first term.", predict: (n - 1) * d },
    ],
    variants: (p) => pairs(p, [[1, 9], [2, 5], [5, 12]], () => true).slice(0, 80),
    explain: (s) => (s.id === "steps" ? `From term 1 to term ${s.inputs[0]}: ${show(s.value)} jumps` : s.id === "jump" ? `${s.inputs[0]} jumps of ${s.inputs[1]}: ${show(s.value)}` : `${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[1, 20], [2, 9], [5, 20]],
    difficulty: ([, d, n]) => (n <= 10 && d <= 5 ? 1 : n <= 15 ? 2 : 3),
    teach: { idea: "Each term of an arithmetic progression is the one before plus the common difference d.", method: "Term n = first term + (n − 1) × d: count the jumps, not the terms." },
  },
  {
    id: "cdist",
    arity: 4,
    title: "The distance between two points",
    competency: "MATH.coordinate.distance",
    type: "integer",
    mc: true,
    parse: () => null,
    // [x1, y1, x2, y2] with a whole-number distance
    reject: ([x1, y1, x2, y2]) => {
      const d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      return [x1, y1, x2, y2].some((v) => v < -6 || v > 6) || x1 === x2 || y1 === y2 || !Number.isInteger(Math.sqrt(d2)) ? "Only points with coordinates −6 to 6, not on one horizontal or vertical line, a whole-number distance apart are supported." : null;
    },
    prompt: ([x1, y1, x2, y2]) => `What is the distance between (${neg(x1)}, ${neg(y1)}) and (${neg(x2)}, ${neg(y2)})?`,
    solve: ([x1, y1, x2, y2]) => {
      const [dx, dy] = [Math.abs(x2 - x1), Math.abs(y2 - y1)];
      return { steps: [{ id: "across", op: "subtract", competency: "MATH.number.integer-add", inputs: [x2, x1], value: dx }, { id: "up", op: "subtract", competency: "MATH.number.integer-add", inputs: [y2, y1], value: dy }, { id: "squares", op: "add", competency: EXP, inputs: [dx * dx, dy * dy], value: dx * dx + dy * dy }, { id: "root", op: "evaluate", competency: "MATH.number.square-roots", inputs: [dx * dx + dy * dy], value: Math.sqrt(dx * dx + dy * dy) }], answer: Math.sqrt(dx * dx + dy * dy) };
    },
    // a whole number k with k × k equal to across² + up², found by counting up (squares by repeated addition)
    validate: ([x1, y1, x2, y2], v) => {
      const sq = (n: number) => [...Array(Math.abs(n))].reduce((s) => s + Math.abs(n), 0);
      const target = sq(x2 - x1) + sq(y2 - y1);
      let k = 0;
      while (sq(k) < target) k++;
      return typeof v === "number" && sq(k) === target && v === k;
    },
    bugs: ([x1, y1, x2, y2]) => {
      const [dx, dy] = [Math.abs(x2 - x1), Math.abs(y2 - y1)];
      return [
        { id: "added-sides", kind: "conceptual", competency: "MATH.coordinate.distance", says: "The across and up distances were added; the straight distance is the hypotenuse: √(across² + up²).", predict: dx + dy },
        { id: "no-root", kind: "procedural", competency: "MATH.coordinate.distance", says: "The square root was not taken at the end.", predict: dx * dx + dy * dy },
        { id: "sign-slip", kind: "prerequisite", competency: "MATH.number.integer-add", says: "A difference of coordinates lost a sign: from −2 to 3 is 5, not 1.", predict: (() => { const sx = Math.abs(Math.abs(x2) - Math.abs(x1)); const sy = Math.abs(Math.abs(y2) - Math.abs(y1)); const r = Math.sqrt(sx * sx + sy * sy); return (sx !== dx || sy !== dy) && Number.isInteger(r) && r > 0 ? r : null; })() },
      ].filter((b) => b.predict !== null) as Bug[];
    },
    variants: (p) => pairs(p, [[-3, 3], [-3, 3], [-3, 6], [-3, 6]], (q) => q[0] !== q[2] && q[1] !== q[3] && Number.isInteger(Math.hypot(q[2] - q[0], q[3] - q[1]))).slice(0, 80),
    explain: (s) => (s.id === "across" ? `Across: from ${neg(s.inputs[1])} to ${neg(s.inputs[0])} is ${show(s.value)}` : s.id === "up" ? `Up or down: from ${neg(s.inputs[1])} to ${neg(s.inputs[0])} is ${show(s.value)}` : s.id === "squares" ? `${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}` : `√${s.inputs[0]} = ${show(s.value)}`),
    domain: [[-6, 6], [-6, 6], [-6, 6], [-6, 6]],
    keep: ([x1, y1, x2, y2]) => x1 < x2 || (x1 === x2 && y1 < y2),
    difficulty: ([x1, y1, x2, y2]) => ([x1, y1, x2, y2].every((v) => v >= 0) ? 1 : Math.hypot(x2 - x1, y2 - y1) <= 5 ? 2 : 3),
    teach: { idea: "The distance between two points is the hypotenuse of a right triangle whose sides are the across and up distances.", method: "Find across and up (differences of coordinates), square them, add, and take the square root." },
  },
  {
    id: "hcf",
    arity: 2,
    title: "The highest common factor",
    competency: "MATH.number.euclid-algorithm",
    type: "integer",
    mc: true,
    parse: () => null,
    reject: ([a, b]) => (a < 12 || b > 99 || a >= b || gcd(a, b) < 2 || gcd(a, b) === a ? "Only two numbers from 12 to 99, the first smaller and not a factor of the second, with a common factor are supported." : null),
    prompt: ([a, b]) => `What is the highest common factor (HCF) of ${a} and ${b}?`,
    solve: ([a, b]) => {
      const steps: Step[] = [];
      let [x, y] = [b, a];
      while (y) {
        steps.push({ id: `div${steps.length}`, op: "divide", competency: "MATH.number.euclid-algorithm", inputs: [x, y], value: x % y });
        [x, y] = [y, x % y];
      }
      return { steps, answer: x };
    },
    // the largest number that divides both, by trying every candidate
    validate: ([a, b], v) => {
      let best = 1;
      for (let k = 1; k <= a; k++) if (a % k === 0 && b % k === 0) best = k;
      return v === best;
    },
    bugs: ([a, b]) => {
      const g = gcd(a, b);
      const small = [2, 3, 5, 7].find((p) => a % p === 0 && b % p === 0)!;
      return [
        { id: "a-common-factor", kind: "conceptual", competency: "MATH.number.euclid-algorithm", says: "A common factor was found, but not the highest one.", predict: small !== g ? small : null },
        { id: "lcm-for-hcf", kind: "conceptual", competency: "MATH.number.euclid-algorithm", says: "The lowest common multiple was found; the HCF is the largest number that divides both.", predict: (a * b) / g <= 2000 ? (a * b) / g : null },
        { id: "difference", kind: "procedural", competency: "MATH.number.euclid-algorithm", says: "The difference was given; keep going: the HCF also divides the difference, so repeat with the smaller numbers.", predict: b - a !== g ? b - a : null },
      ].filter((x) => x.predict !== null) as Bug[];
    },
    variants: (p) => pairs(p, [[12, 40], [14, 60]], ([a, b]) => a < b && gcd(a, b) >= 2 && gcd(a, b) !== a).slice(0, 80),
    explain: (s) => `${s.inputs[0]} = ${Math.floor((s.inputs[0] as number) / (s.inputs[1] as number))} × ${s.inputs[1]} + ${show(s.value)}${s.value === 0 ? `: the remainder is 0, so the HCF is ${s.inputs[1]}` : ""}`,
    domain: [[12, 98], [13, 99]],
    keep: ([a, b]) => a < b,
    difficulty: ([a, b]) => (gcd(a, b) <= 5 && b < 50 ? 1 : b < 70 ? 2 : 3),
    teach: { idea: "The HCF is the largest number that divides both exactly. Euclid: it also divides their difference and the remainder.", method: "Divide the larger by the smaller and keep the remainder; repeat with the smaller number and the remainder until the remainder is 0." },
  },
  {
    id: "det2",
    arity: 4,
    title: "A 2 × 2 determinant",
    competency: "MATH.algebra.determinants",
    type: "integer",
    mc: true,
    parse: () => null,
    // [a, b, c, d]: |a b; c d|
    reject: (v) => (v.some((x) => x < -6 || x > 9) || v[0] * v[3] === 0 || v[1] * v[2] === 0 || v[0] * v[3] === v[1] * v[2] ? "Only entries from −6 to 9, no zero product on either diagonal, and a non-zero determinant are supported." : null),
    prompt: ([a, b, c, d]) => `Find the determinant of the matrix [[${neg(a)}, ${neg(b)}], [${neg(c)}, ${neg(d)}]] (first row ${neg(a)}, ${neg(b)}; second row ${neg(c)}, ${neg(d)}).`,
    solve: ([a, b, c, d]) => ({ steps: [mul(a, d, "MATH.algebra.determinants", "main"), mul(b, c, "MATH.algebra.determinants", "other"), { id: "difference", op: "subtract", competency: "MATH.number.integer-add", inputs: [a * d, b * c], value: a * d - b * c }], answer: a * d - b * c }),
    // the signed area of the image of the unit square (shoelace over its four corners), not the ad − bc formula
    validate: ([a, b, c, d], v) => {
      const pts = [[0, 0], [a, c], [a + b, c + d], [b, d]];
      let twice = 0;
      for (let i = 0; i < 4; i++) twice += pts[i][0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * pts[i][1];
      return v === twice / 2;
    },
    bugs: ([a, b, c, d]) => [
      { id: "added-diagonals", kind: "procedural", competency: "MATH.algebra.determinants", says: "The two diagonal products were added; the determinant subtracts them: ad − bc.", predict: a * d + b * c },
      { id: "wrong-pairs", kind: "procedural", competency: "MATH.algebra.determinants", says: "The wrong entries were paired: multiply along the diagonals, a × d and b × c.", predict: a * c - b * d },
      { id: "reversed", kind: "procedural", competency: "MATH.algebra.determinants", says: "The products were subtracted the wrong way round: ad − bc, not bc − ad.", predict: b * c - a * d },
    ],
    variants: (p) => pairs(p, [[1, 5], [1, 5], [1, 5], [1, 5]], (v) => v[0] * v[3] !== v[1] * v[2]).slice(0, 80),
    explain: (s) => (s.id === "difference" ? `${neg(s.inputs[0])} − ${par(s.inputs[1])} = ${neg(show(s.value))}` : `${par(s.inputs[0])} × ${par(s.inputs[1])} = ${neg(show(s.value))}`),
    domain: [[-6, 9], [-6, 9], [-6, 9], [-6, 9]],
    keep: (v) => v.every((x) => x >= -3 && x <= 5) && v.filter((x) => x < 0).length <= 1,
    difficulty: (v) => (v.every((x) => x > 0) ? 1 : v.filter((x) => x < 0).length === 1 ? 2 : 3),
    teach: { idea: "The determinant of [[a, b], [c, d]] is ad − bc: the product down one diagonal minus the product down the other.", method: "Multiply top-left by bottom-right, multiply top-right by bottom-left, and subtract the second from the first. Keep the signs." },
  },
  {
    id: "lim",
    arity: 2,
    title: "A limit that needs factorising",
    competency: "MATH.calculus.limits",
    type: "integer",
    mc: true,
    parse: () => null,
    // [a, k]: lim x→a of k(x² − a²)/(x − a)
    reject: ([a, k]) => (a < 1 || a > 9 || k < 1 || k > 6 ? "Only lim x→a of k(x² − a²)/(x − a) with 1 ≤ a ≤ 9 and 1 ≤ k ≤ 6 is supported." : null),
    prompt: ([a, k]) => `Find lim (x → ${a}) of ${k === 1 ? "" : k}(x² − ${a * a}) ⁄ (x − ${a}).`,
    solve: ([a, k]) => ({ steps: [{ id: "factor", op: "evaluate", competency: "MATH.algebra.identities", inputs: [a], value: a }, { id: "cancel", op: "evaluate", competency: "MATH.calculus.limits", inputs: [a, k], value: 2 * a * k }], answer: 2 * a * k }),
    // the function's values close to a, from both sides
    validate: ([a, k], v) => {
      const f = (x: number) => (k * (x * x - a * a)) / (x - a);
      return typeof v === "number" && Math.abs(f(a + 1e-6) - v) < 1e-4 && Math.abs(f(a - 1e-6) - v) < 1e-4;
    },
    bugs: ([a, k]) => [
      { id: "zero-for-undefined", kind: "conceptual", competency: "MATH.calculus.limits", says: "0 ⁄ 0 was taken as 0; it means the expression must be simplified first (factorise and cancel).", predict: 0 },
      { id: "half-factor", kind: "procedural", competency: "MATH.algebra.identities", says: "Only one a was kept after cancelling (as if x² − a² were (x − a) × x, then x = a); it is (x − a)(x + a), which gives a + a = 2a.", predict: a * k },
      { id: "top-only", kind: "conceptual", competency: "MATH.calculus.limits", says: "Only the top was worked out at x = a, as k × a²; the bottom is 0 there, so simplify first: cancel (x − a).", predict: k * a * a },
    ],
    variants: (p) => pairs(p, [[1, 9], [1, 4]], () => true),
    explain: (s) => (s.id === "factor" ? `x² − ${(s.inputs[0] as number) ** 2} = (x − ${s.inputs[0]})(x + ${s.inputs[0]}); cancel (x − ${s.inputs[0]})` : `Then put x = ${s.inputs[0]}: ${s.inputs[1]} × (${s.inputs[0]} + ${s.inputs[0]}) = ${show(s.value)}`),
    domain: [[1, 9], [1, 6]],
    difficulty: ([a, k]) => (k === 1 ? 1 : a * k <= 12 ? 2 : 3),
    teach: { idea: "When substituting gives 0 ⁄ 0, the limit still exists: simplify first, then substitute.", method: "Factorise x² − a² = (x − a)(x + a), cancel (x − a), then put x = a." },
  },
  {
    id: "condp",
    arity: 4,
    title: "A conditional probability from a table",
    competency: "MATH.probability.conditional",
    type: "fraction",
    mc: true,
    range: [0, 1],
    parse: () => null,
    // [p, q, r, s]: counts: chess club & girls p, chess & boys q, not chess & girls r, not chess & boys s. P(chess | girl)
    reject: (v) => (v.some((x) => x < 2 || x > 15) ? "Only counts from 2 to 15 are supported." : null),
    prompt: ([p, q, r, s]) => `In a class, ${p} girls and ${q} boys are in the chess club; ${r} girls and ${s} boys are not. A girl is chosen at random. What is the probability she is in the chess club? (A fraction is fine.)`,
    solve: ([p, , r]) => ({ steps: [{ id: "given", op: "add", competency: "MATH.number.addition", inputs: [p, r], value: p + r }, { id: "favourable", op: "divide", competency: "MATH.probability.conditional", inputs: [p, p + r], value: p / (p + r) }], answer: p / (p + r) }),
    // count girls one by one and the chess players among them
    validate: ([p, q, r, s], v) => {
      const people = [...Array(p).fill("GC"), ...Array(q).fill("BC"), ...Array(r).fill("GN"), ...Array(s).fill("BN")];
      const girls = people.filter((x) => x[0] === "G");
      return typeof v === "number" && near(girls.filter((x) => x[1] === "C").length / girls.length, v);
    },
    bugs: ([p, q, r, s]) => [
      { id: "whole-class", kind: "conceptual", competency: "MATH.probability.conditional", says: "The whole class was counted; given that a girl is chosen, only the girls count.", predict: p / (p + q + r + s) },
      { id: "reversed-condition", kind: "conceptual", competency: "MATH.probability.conditional", says: "The chess club was taken as the group; the question is among the girls.", predict: p / (p + q) },
      { id: "not-over-yes", kind: "procedural", competency: "MATH.probability.conditional", says: "Chess girls were compared with non-chess girls; a probability divides by all the girls.", predict: p / r },
    ],
    variants: (p) => pairs(p, [[1, 6], [1, 4], [1, 6], [1, 4]], () => true).slice(0, 80),
    explain: (s) => (s.id === "given" ? `Girls: ${s.inputs[0]} + ${s.inputs[1]} = ${show(s.value)}` : `Chess girls out of all girls: ${s.inputs[0]} ⁄ ${s.inputs[1]} = ${show(s.value)}`),
    domain: [[2, 15], [2, 15], [2, 15], [2, 15]],
    keep: (v) => v.every((x) => x <= 6),
    difficulty: ([p, , r]) => (gcd(p, p + r) === 1 && p + r <= 10 ? 1 : p + r <= 14 ? 2 : 3),
    teach: { idea: "P(A given B) counts only the cases where B happened: B becomes the whole.", method: "Find the group you are told about (the girls), then the fraction of that group with the property (in the chess club)." },
  },
];
/** The specification of the families written before families@2: their approved domains, difficulty and teaching hints
 * (the generators themselves are unchanged), and a multiple-choice form for the numeric ones. */
const SPEC_V1: Record<string, Partial<Def>> = {
  mul: { mc: true, domain: [[2, 12], [2, 12]], difficulty: ([a, b]) => (a <= 5 && b <= 5 ? 1 : a <= 9 && b <= 9 ? 2 : 3), teach: { idea: "a × b counts a groups of b: the same as b groups of a.", method: "Rebuild a fact from one you know: double, add or take away one group, or split a factor." } },
  rect: { mc: true, domain: [[2, 12], [2, 12]], difficulty: ([l, w]) => (l * w <= 30 ? 1 : l * w <= 70 ? 2 : 3), teach: { idea: "Area counts the unit squares that cover a shape.", method: "A rectangle has rows of equal squares: rows × squares in a row." } },
  eqfrac: { mc: true, domain: [[1, 9], [2, 10], [4, 100]], keep: ([a, b, d]) => a < b && d % b === 0 && d / b <= 10, difficulty: ([, b, d]) => (d / b <= 3 ? 1 : d / b <= 6 ? 2 : 3), teach: { idea: "Equal fractions cover the same amount: cutting every piece into k smaller pieces multiplies top and bottom by k.", method: "Find what the bottom was multiplied by, and multiply the top by the same number." } },
  fadd: { mc: true, domain: [[1, 11], [1, 11], [2, 12], [-1, 1]], keep: ([a, b, n, sgn]) => sgn !== 0 && (sgn > 0 ? a + b < n : b < a), difficulty: ([, , n]) => (n <= 6 ? 1 : n <= 9 ? 2 : 3), teach: { idea: "Like fractions count the same size of piece: add or take away the pieces.", method: "Add or subtract the tops; the bottom (the size of the pieces) stays." } },
  cint: { mc: true, domain: [[0, 8], [1, 12], [1, 12]], keep: ([a, b]) => b > a && b - a <= 9, difficulty: ([a, b, c]) => (a === 0 && c * (b - a) <= 30 ? 1 : c * (b - a) <= 60 ? 2 : 3), teach: { idea: "The integral of a constant c from a to b is the area of a rectangle: width b − a, height c.", method: "Width (upper minus lower) times height." } },
  quad: { domain: [[-10, 10], [-30, 30]], difficulty: ([p, q]) => (q > 0 && p < 0 ? 1 : q > 0 ? 2 : 3), teach: { idea: "If a product is zero, one of its factors is zero.", method: "Factorise x² + px + q = (x − r)(x − s), then each bracket gives a solution." } },
  linev: { mc: true, domain: [[2, 9], [-10, 10], [1, 9]], difficulty: ([m, c, t]) => (c >= 0 && m * t <= 30 ? 1 : c >= 0 ? 2 : 3), teach: { idea: "y = mx + c gives y for any x: m × x, then add c.", method: "Multiply m by the value of x first, then add (or subtract) c." } },
  meet: { domain: [[0, 4], [-4, 8]], difficulty: () => 2, teach: { idea: "Where two graphs meet, their y values are equal.", method: "Try each whole number and compare x × x with the line's value." } },
  above: { domain: [[1, 3], [-4, 6], [-3, 3]], difficulty: () => 1, teach: { idea: "A graph is higher at x when its y value there is larger.", method: "Work out both y values at that x and compare." } },
  alp: { mc: true, domain: [[0, 4], [-2, 12]], difficulty: () => 3, teach: { idea: "The area between two curves is the integral of (top − bottom) between where they meet.", method: "Find where they meet, check which is on top, integrate the difference." } },
  pow: { domain: [[2, 12], [2, 5]], difficulty: ([a, n]) => (powerOf(a, n) <= 100 ? 1 : powerOf(a, n) <= 1000 ? 2 : 3), teach: { idea: "aⁿ multiplies a by itself n times.", method: "Multiply step by step: 3, 9, 27, 81 for 3⁴." } },
  dist: { domain: [[2, 12], [1, 12]], difficulty: ([a, b]) => (a * b <= 30 ? 1 : a * b <= 70 ? 2 : 3), teach: { idea: "The number outside a bracket multiplies every term inside.", method: "Multiply along an arrow to each term." } },
  expand: { domain: [[-9, 9], [-9, 9]], keep: ([a, b]) => a < b, difficulty: ([a, b]) => (a > 0 && b > 0 ? 1 : a * b > 0 ? 2 : 3), teach: { idea: "(x + a)(x + b) has four products; two of them are x terms.", method: "The x coefficient is a + b and the constant is ab." } },
  dpow: { domain: [[1, 9], [2, 5], [1, 4]], difficulty: ([k, n, t]) => (n === 2 ? 1 : k * n * powerOf(t, n - 1) <= 200 ? 2 : 3), teach: { idea: "The derivative of k xⁿ is k n xⁿ⁻¹.", method: "Multiply by the power, lower it by one, then substitute." } },
  pint: { domain: [[0, 3], [1, 4], [1, 12], [1, 3]], difficulty: ([a, , , n]) => (a === 0 && n === 1 ? 1 : n <= 2 ? 2 : 3), teach: { idea: "An antiderivative of xⁿ is xⁿ⁺¹ ⁄ (n + 1).", method: "Raise the power, divide by the new power, then F(upper) − F(lower)." } },
  subst: { domain: [[0, 2], [1, 3], [1, 4], [1, 3]], difficulty: ([, , , n]) => (n === 1 ? 1 : n === 2 ? 2 : 3), teach: { idea: "With u = x² + c, 2x dx becomes du.", method: "Change the limits to u, integrate uⁿ, and evaluate between the u limits." } },
  disc: { domain: [[-12, 12], [-20, 20]], difficulty: ([p, q]) => (p > 0 && q > 0 ? 1 : 2), teach: { idea: "b² − 4ac decides how many real solutions there are.", method: "Positive: two; zero: one; negative: none." } },
};
for (const f of F) Object.assign(f, { ...SPEC_V1[f.id], ...f, ...(SPEC_V1[f.id]?.mc ? { mc: true } : {}) });
// families@2: the families written in fam/<domain>.ts (one id space; a duplicate id is an error)
const V2 = new Set<string>();
for (const f of DOMAIN_FAMILIES) {
  if (F.some((x) => x.id === f.id)) throw new Error(`families@2: duplicate family id ${f.id}`);
  F.push(f);
  V2.add(f.id);
}
// one registry of families however the module is loaded (test runners may load it twice): shared on globalThis
const GF = globalThis as { __openpathFamilies?: Map<string, Def>; __openpathPools?: Map<string, { items: Problem[]; excluded: { params: number[]; reason: string }[]; ids: Set<string> }> };
export const FAMILIES: Map<string, Def> = (GF.__openpathFamilies ??= new Map(F.map((f) => [f.id, f])));

/** The options of a multiple-choice form: the answer and up to three mal-rule answers (the first prediction of each
 * written explanation, in order), topped up with nearby values; sorted by value, so the letters are reproducible.
 * For an answer written in its type's form (answers@2), the options are the answer, the explanations' predictions and
 * the family's distractors, distinct under the type's own equality, sorted as text. */
/** range@1: the meaningful range of this problem's answer (a probability, a cosine, a length), or null. */
export const rangeOf = (def: Def, p: number[]): [number, number] | null => (typeof def.range === "function" ? def.range(p) : def.range ?? null);
const within = (rg: [number, number] | null, v: number | null) => !rg || v === null || (v >= rg[0] - 1e-12 && v <= rg[1] + 1e-12);
function mcOptions(def: Def, p: number[], answer: Value, bugs: Bug[]): Value[] {
  if (def.id === "disc") return [0, 1, 2];
  const rg = rangeOf(def, p);
  if (typeof answer === "string") {
    const out: string[] = [];
    const add = (v: Value | undefined) => {
      if (typeof v !== "string" || sameAnswer(def.type, v, answer) || out.some((o) => sameAnswer(def.type, o, v) || o === v) || out.length >= 3) return;
      if (rg && !within(rg, numericValue(v))) return;
      out.push(v);
    };
    for (const b of bugs) add(b.predict === null ? undefined : Array.isArray(b.predict) ? undefined : b.predict);
    for (const v of def.distractors?.(p) ?? []) add(v);
    // range@1: the answer with the opposite sign, where the range allows it (a cosine's sign slip)
    if (rg && def.type === "exact") add(answer.startsWith("-") || answer.startsWith("−") ? answer.slice(1) : /^[\w√(]/.test(answer) && !/[+\-−]/.test(answer) ? `-${answer}` : undefined);
    if (out.length < 2) throw new Error(`families@2: ${def.id}(${p}) has too few wrong options for a multiple-choice form`);
    // a fixed order that differs from problem to problem (so the right letter is not always in the same place)
    const salt = `gen:${def.id}:${p.join(",")}`;
    return [...out, answer].sort((x, y) => fnv(salt + String(x)) - fnv(salt + String(y)) || (String(x) < String(y) ? -1 : 1));
  }
  const out: number[] = [];
  // range@1: an option outside the quantity's meaningful range (a probability above 1) is not offered
  const inRange = (v: number) => within(rg, v);
  const add = (v: number | undefined) => {
    if (v !== undefined && Number.isFinite(v) && inRange(v) && !near(v, answer as number) && !out.some((o) => near(o, v)) && ((answer as number) < 0 || v >= 0) && out.length < 3) out.push(v);
  };
  // families@2: a predicted wrong answer is offered whatever its sign (the wrong-sign answer is the point of a sign-rule
  // question); only the topped-up neighbours keep to the answer's sign. The first families keep their rule (the server
  // computes their options too).
  const addPredicted = (v: number | undefined) => {
    if (!V2.has(def.id)) return add(v);
    if (v !== undefined && Number.isFinite(v) && inRange(v) && !near(v, answer as number) && !out.some((o) => near(o, v)) && out.length < 3) out.push(v);
  };
  for (const b of bugs) addPredicted(b.predict === null ? undefined : Array.isArray(b.predict) ? (b.predict[0] as number) : (b.predict as number));
  for (const v of (def.distractors?.(p) ?? []) as number[]) add(v);
  // inside a range the whole-number neighbours are mostly outside it: the complement and nearby values in the range
  // the complement only for a bounded range (1 − p for a probability), never for a length (range to infinity)
  if (rg) {
    const a = answer as number;
    for (const v of [...(Number.isFinite(rg[1]) ? [rg[1] + rg[0] - a, (a + rg[1]) / 2] : []), a / 2, 2 * a, a * a]) add(v);
  }
  for (const v of [(answer as number) + 1, (answer as number) - 1, (answer as number) + 2, 2 * (answer as number), (answer as number) + 3, (answer as number) - 2]) add(v);
  // families@2: a fixed order that differs from problem to problem, so the right letter cannot be guessed from the
  // order of the values; the first families keep value order (the server computes their options too)
  if (V2.has(def.id)) {
    const salt = `gen:${def.id}:${p.join(",")}`;
    return [...out, answer].sort((x, y) => fnv(salt + show(x as number)) - fnv(salt + show(y as number)) || (x as number) - (y as number));
  }
  return [...out, answer].sort((x, y) => (x as number) - (y as number));
}
/** A value as the learner sees it: a family that works in decimals (money, measures, statistics) shows a terminating
 * value as a decimal ("54.5", not "109/2"); equal values are still equal answers. */
function shown(def: Def, v: Value): string {
  if (!def.decimals || typeof v !== "number") return show(v);
  for (let dp = 0; dp <= 6; dp++) {
    const t = Math.round(v * 10 ** dp);
    if (Math.abs(t / 10 ** dp - v) < 1e-9) return (t / 10 ** dp).toFixed(dp).replace(/^-/, "-");
  }
  return show(v);
}
/** Whether a predicted value is the right answer (then the explanation cannot be seen on this problem). */
function predictsAnswer(def: Def, v: Value, answer: Value): boolean {
  if (typeof answer === "string" || typeof v === "string") return NEW_TYPES.has(def.type) ? sameAnswer(def.type, show(v), show(answer)) || show(v) === show(answer) : show(v) === show(answer);
  if (Array.isArray(v) || Array.isArray(answer)) return show(v) === show(answer);
  return near(v, answer);
}
const mcPrompt = (text: string) => `${text.replace(/ ?\((?:A fraction is fine\.|0, 1 or 2)\)$/, "").replace(/ What number goes in the box(?: \(it may be negative\))?\?$/, " Which number goes in the box?")} Choose one.`;

/** quad: a factor pair of q with the right product but the wrong sum (x² − 5x + 6 = (x − 1)(x − 6)?). */
function wrongPair(p: number, q: number, roots: number[]): Bug[] {
  const [m, n] = roots.map((r) => -r); // (x + m)(x + n)
  const sign = Math.sign(m) || 1;
  const cands: number[][] = [];
  for (let u = 1; u * u <= Math.abs(q); u++) {
    if (q % u) continue;
    const v = Math.abs(q) / u;
    if (q > 0) cands.push([sign * u, sign * v]);
    else cands.push([-u, v], [u, -v]);
  }
  for (const pair of cands) {
    if (pair[0] * pair[1] !== q || pair[0] + pair[1] === p || (pair[0] === m && pair[1] === n) || (pair[0] === n && pair[1] === m)) continue;
    const probe = Math.abs(m) <= 9 && Math.abs(n) <= 9 && m !== n && m + n !== 0 ? { probe: `gen:factor:${m},${n}` } : {};
    return [{ id: "pair-product-only", kind: "prerequisite", competency: "MATH.algebra.factorisation", says: `The numbers ${signedNum(pair[0])} and ${signedNum(pair[1])} multiply to ${q} but add to ${pair[0] + pair[1]}, not ${p}: the pair must give both the product and the sum.`, predict: pair.map((x) => -x).sort((x, y) => x - y), ...probe }];
  }
  return [];
}
const signedNum = (x: number) => (x < 0 ? `−${-x}` : String(x));
/** wording@1: one convention for the minus sign in what a learner reads (−3, not -3): a hyphen before a number, a
 * letter, a root or a bracket, at the start or after a space, bracket, = or comma, is shown as the minus sign. Only
 * the wording changes (prompts, explanations and steps); answers and options are compared as written. */
export const prose = (t: string) => t.replace(/(^|[\s(=,[|:;])-(?=[\d.a-zA-Zπ√(])/g, "$1−");
function build(def: Def, p: number[], form: Problem["form"] = "typed"): Problem {
  const q = buildRaw(def, p, form);
  return { ...q, prompt: prose(q.prompt), bugs: q.bugs.map((b) => ({ ...b, says: prose(b.says) })) };
}
function buildRaw(def: Def, p: number[], form: Problem["form"] = "typed"): Problem {
  const { steps, answer } = def.solve(p);
  if (!def.validate(p, answer)) throw new Error(`families@1: ${def.id}(${p}) failed its independent check`);
  const raw = def.bugs(p);
  // an explanation that predicts the right answer here cannot be seen on this problem: drop those predictions
  const bugs = raw.flatMap((b) => {
    if (b.predict === null) return [b];
    if (def.type === "set") return Array.isArray(b.predict) && show(b.predict) === show(answer) ? [] : [b];
    if (typeof answer !== "number" && typeof answer !== "string") return [b];
    if (!Array.isArray(b.predict)) return predictsAnswer(def, b.predict, answer) ? [] : [b];
    const keep = (b.predict as Value[]).filter((v) => !predictsAnswer(def, v as Value, answer)) as number[];
    return keep.length ? [{ ...b, predict: keep }] : [];
  });
  const fig = def.figure?.(p) ?? null;
  const base = { family: def.id, params: p, competency: def.competency, skill: def.skill ?? def.competency, steps, ...(fig ? { figure: fig } : {}) };
  if (form === "mc") {
    if (!def.mc || (typeof answer !== "number" && typeof answer !== "string")) throw new Error(`families@1: ${def.id} has no multiple-choice form`);
    const opts = mcOptions(def, p, answer, raw);
    const idx = (v: Value) => opts.findIndex((o) => (typeof o === "string" ? typeof v === "string" && (o === v || sameAnswer(def.type, v, o)) : typeof v === "number" && near(o as number, v)));
    const right = idx(answer);
    const mcBugs = bugs.flatMap((b) => {
      const vals = b.predict === null ? [] : Array.isArray(b.predict) ? b.predict : [b.predict];
      const ix = [...new Set(vals.map((v) => idx(v as Value)))].filter((i) => i >= 0 && i !== right);
      return ix.length ? [{ ...b, predict: ix.length === 1 ? ix[0] : ix }] : [];
    });
    return { ...base, id: `gen:${def.id}:${p.join(",")}:mc`, form, prompt: mcPrompt(def.prompt(p)), type: "choice", answer: "ABCD"[right], bugs: mcBugs, options: opts.map((o) => shown(def, o)) };
  }
  if (form === "word") {
    if (!def.word) throw new Error(`families@2: ${def.id} has no everyday-situation form`);
    // a choice family's everyday form keeps its own options and the letter of the right one
    if (def.type === "choice") {
      const own = def.choices?.(p);
      if (!own || typeof answer !== "number" || !own[answer]) throw new Error(`families@2: ${def.id}(${p}) needs choices for its everyday form`);
      return { ...base, id: `gen:${def.id}:${p.join(",")}:w`, form, prompt: def.word(p), type: "choice", answer: "ABCD"[answer], bugs, options: own };
    }
    return { ...base, id: `gen:${def.id}:${p.join(",")}:w`, form, prompt: def.word(p), type: def.type, answer: shown(def, answer), bugs };
  }
  const choice = def.type === "choice";
  // a family's own options (families@2), or the first family's fixed pair
  const own = choice && def.choices ? def.choices(p) : null;
  if (own && (own.length < 2 || own.length > 4 || new Set(own).size !== own.length || typeof answer !== "number" || !own[answer])) throw new Error(`families@2: ${def.id}(${p}) needs 2–4 distinct options and the index of the right one`);
  return { ...base, id: `gen:${def.id}:${p.join(",")}`, form, prompt: def.prompt(p), type: def.type, answer: choice ? "ABCD"[answer as number] : shown(def, answer), bugs, ...(choice ? { options: own ?? ["The line", "The parabola y = x²"] } : {}) };
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
  const m = id.match(/^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/);
  const def = m && FAMILIES.get(m[1]);
  if (!def) return null;
  const p = m![2].split(",").map(Number);
  if (p.length !== def.arity || def.reject(p) || (m![3] === "mc" && !def.mc) || (m![3] === "w" && !def.word)) return null;
  try {
    return build(def, p, m![3] === "mc" ? "mc" : m![3] === "w" ? "word" : "typed");
  } catch {
    return null;
  }
}
export const variantsOf = (pr: Problem): Problem[] => FAMILIES.get(pr.family)!.variants(pr.params).flatMap((p) => (FAMILIES.get(pr.family)!.reject(p) ? [] : [build(FAMILIES.get(pr.family)!, p)]));
export const explainStep = (pr: Problem, s: Step) => prose(FAMILIES.get(pr.family)!.explain(s));

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

// ---------------------------------------------------------------- the release pool of a family (spec@1)

const fnv = (str: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
/** Every parameter choice in the domain ranges that `keep` and `reject` allow (before validation). */
const candCache = new Map<string, number[][]>();
export function candidates(fam: string): number[][] {
  const def = FAMILIES.get(fam);
  if (!def?.domain) return [];
  const hit = candCache.get(fam);
  if (hit && FAMILIES.get(fam) === def) return hit;
  const size = def.domain.reduce((n, [lo, hi]) => n * (hi - lo + 1), 1);
  // a very large domain with a cap (five-digit numbers …): a fixed, hash-chosen sample instead of every combination
  if (def.cap && size > 300_000) {
    const seen = new Set<string>();
    const out: number[][] = [];
    let state = fnv(`sample:${fam}`) || 1;
    const rnd = () => ((state = Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) >>> 0), (state = (state ^ (state >>> 12)) >>> 0), state / 4294967296);
    for (let k = 0; k < def.cap * 40 && out.length < def.cap; k++) {
      const p = def.domain.map(([lo, hi]) => lo + Math.floor(rnd() * (hi - lo + 1)));
      const key = p.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      if ((!def.keep || def.keep(p)) && !def.reject(p)) out.push(p);
    }
    out.sort((a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
    candCache.set(fam, out);
    return out;
  }
  const out: number[][] = [];
  const rec = (i: number, acc: number[]) => {
    if (i === def.domain!.length) {
      if ((!def.keep || def.keep(acc)) && !def.reject(acc)) out.push([...acc]);
      return;
    }
    for (let v = def.domain![i][0]; v <= def.domain![i][1]; v++) rec(i + 1, [...acc, v]);
  };
  rec(0, []);
  // a capped family releases a fixed, hash-chosen subset (spread across the domain, the same on every build)
  if (def.cap && out.length > def.cap) return out.map((p) => ({ p, h: fnv(`gen:${fam}:${p.join(",")}`) })).sort((a, b) => a.h - b.h).slice(0, def.cap).map((x) => x.p).sort((a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
  return out;
}
type PoolEntry = { items: Problem[]; excluded: { params: number[]; reason: string }[]; ids: Set<string>; same: Map<string, string> };
const poolCache: Map<string, PoolEntry> = (GF.__openpathPools ??= new Map<string, PoolEntry>());
/** The family's release pool: every candidate that builds and passes its independent check. A candidate that fails
 * is EXCLUDED (never offered), with the reason, so one bad parameter choice cannot reach a learner. */
export function pool(fam: string) {
  const hit = poolCache.get(fam);
  if (hit) return hit;
  const def = FAMILIES.get(fam)!;
  const items: Problem[] = [];
  const excluded: { params: number[]; reason: string }[] = [];
  // distinct@1: a parameter choice that shows the learner exactly the question an earlier one shows (same wording,
  // picture and options) is the same question: it is not released again, and answering either is one exposure
  const shownAs = new Map<string, { id: string; answer: string }>();
  const same = new Map<string, string>();
  for (const p of candidates(fam)) {
    try {
      const q = build(def, p);
      const sig = `${q.prompt}\u0000${JSON.stringify(q.figure ?? null)}\u0000${JSON.stringify(q.options ?? null)}`;
      const first = shownAs.get(sig);
      if (first) {
        // the same question with another answer is ambiguous: a defect of the family (the specification check fails it)
        excluded.push({ params: p, reason: first.answer === q.answer ? `shows the same question as ${first.id} (distinct@1)` : `AMBIGUOUS: shows the same question as ${first.id} but answers ${q.answer}, not ${first.answer}` });
        same.set(q.id, first.id);
        continue;
      }
      shownAs.set(sig, { id: q.id, answer: q.answer });
      items.push(q);
    } catch (e) {
      excluded.push({ params: p, reason: String((e as Error).message) });
    }
  }
  const r = { items, excluded, ids: new Set(items.map((x) => x.id)), same };
  poolCache.set(fam, r);
  return r;
}
/** TEST ONLY: forget the computed pools (after a test changes a generator, to see what the change does). */
export const resetPools = () => {
  poolCache.clear();
  candCache.clear();
};
/** The base (typed) id of a generated question: "gen:f:p" for both "gen:f:p" and "gen:f:p:mc" (one exposure). */
export const exposureKey = (qid: string) => {
  if (!qid.startsWith("gen:")) return qid;
  const base = qid.replace(/:(mc|w)$/, "");
  // distinct@1: a parameter choice that shows the same question as a released one is the same exposure
  const fam = base.split(":")[1];
  return (FAMILIES.has(fam) && pool(fam).same.get(base)) || base;
};
/** Whether a generated question is in its family's release pool. */
export function inPool(qid: string): boolean {
  const m = qid.match(/^gen:([a-z0-9]+):(-?\d+(?:,-?\d+)*)(?::(mc|w))?$/);
  if (!m || !FAMILIES.get(m[1])?.domain) return false;
  const def = FAMILIES.get(m[1])!;
  const p = m[2].split(",").map(Number);
  if (p.length !== def.arity || p.some((v, i) => v < def.domain![i][0] || v > def.domain![i][1]) || (def.keep && !def.keep(p))) return false;
  if ((m[3] === "mc" && !def.mc) || (m[3] === "w" && !def.word)) return false;
  return pool(m[1]).ids.has(exposureKey(qid));
}
export type Phase = "retention" | "diagnostic" | "check" | "practice";
/** A question's phase in its family's pool (a fixed partition by parameters, so a delayed-check question is never
 * met in practice, and both answer formats of one problem share a phase). */
export function phaseOf(qid: string): Phase {
  const k = fnv(exposureKey(qid)) % 10;
  return k < 2 ? "retention" : k === 2 ? "diagnostic" : k < 5 ? "check" : "practice";
}
export const difficultyOf = (pr: Problem) => FAMILIES.get(pr.family)?.difficulty?.(pr.params) ?? 2;
/** The pool items of one phase, in a stable order, as question ids (both formats where the family has them). */
export function phasePool(fam: string, phase: Phase): string[] {
  const def = FAMILIES.get(fam)!;
  return pool(fam)
    .items.filter((x) => phaseOf(x.id) === phase)
    .sort((a, b) => fnv(a.id) - fnv(b.id) || a.id.localeCompare(b.id))
    .map((x, i) => (def.mc && x.type !== "set" && x.type !== "choice" && i % 2 === 1 ? `${x.id}:mc` : x.id));
}
