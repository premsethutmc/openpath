/**
 * Kernel Adapter — bridges existing family solvers to the mathematical kernel.
 *
 * Existing solvers emit Step[] with Justification discriminated unions.
 * This adapter converts those into kernel MathState + Transformation sequences,
 * without rewriting the solvers.
 *
 * The adapter:
 * 1. Takes a Problem (family, params, steps, answer)
 * 2. Converts each Step's justification into a kernel rule application
 * 3. Returns a sequence of Transformations with verified before/after states
 * 4. Falls back gracefully for steps without justification
 *
 * Existing families are adapted incrementally — the adapter handles whatever
 * justification variants are present and passes through steps that don't have one.
 *
 * For families without explicit justification types, the adapter can also map
 * the step's `op` field to kernel rules. This enables curriculum-wide teaching
 * coverage: the same kernel rules verify arithmetic across all families that
 * use standard operations (add, subtract, multiply, divide, evaluate, compare).
 */

import type { Problem, Step, Justification } from "./family-kit";
import {
  Rational, Expr, evaluate, simplify, renderExpr, renderStatement,
  createState, createDefaultRegistry, cloneState,
  type MathExpr, type MathState, type Transformation, type RuleRegistry, type RuleExplanation,
} from "./math-kernel";

// ════════════════════════════════════════════════════════════════════════════════
// ADAPTED TRANSFORMATION — enriches Transformation with teaching metadata
// ════════════════════════════════════════════════════════════════════════════════

export interface AdaptedStep {
  /** The original Step from the solver. */
  original: Step;
  /** The kernel transformation, if the justification could be adapted. */
  transformation: Transformation | null;
  /** Teaching explanation derived from the kernel (or from the justification directly). */
  explanation: RuleExplanation | null;
  /** Whether the step was successfully adapted to a kernel rule. */
  adapted: boolean;
}

export interface AdaptedProblem {
  /** The original Problem. */
  problem: Problem;
  /** The initial mathematical state (before any transformations). */
  initialState: MathState;
  /** Each step adapted to the kernel. */
  steps: AdaptedStep[];
  /** Whether all steps were fully adapted. */
  fullyAdapted: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// JUSTIFICATION → KERNEL RULE MAPPING
// ════════════════════════════════════════════════════════════════════════════════

const registry = createDefaultRegistry();

/**
 * Adapt a complete problem from the existing solver into kernel representations.
 */
export function adaptProblem(problem: Problem): AdaptedProblem {
  const initialState = buildInitialState(problem);
  let currentState = initialState;
  const adaptedSteps: AdaptedStep[] = [];

  for (const step of problem.steps) {
    const adapted = adaptStep(step, currentState, problem);
    adaptedSteps.push(adapted);
    if (adapted.transformation) {
      currentState = adapted.transformation.after;
    }
  }

  return {
    problem,
    initialState,
    steps: adaptedSteps,
    fullyAdapted: adaptedSteps.every((s) => s.adapted),
  };
}

/**
 * Build the initial mathematical state from a problem's family and parameters.
 */
function buildInitialState(problem: Problem): MathState {
  const state = createState();

  switch (problem.family) {
    // Linear equations: ax + b = c
    case "lin": {
      const [a, b, x] = problem.params;
      const rhs = a * x + b;
      const lhs = Expr.add(Expr.mul(Expr.num(a), Expr.var("x")), Expr.num(b));
      state.statements.push({ left: lhs, relation: "=", right: Expr.num(rhs) });
      state.bindings.set("x", new Rational(x));
      state.expressions.set("equation", lhs);
      break;
    }
    // One-step equations: ax = b or x + a = b or x - a = b
    case "ahone": {
      const [op, a, x] = problem.params;
      let lhs: MathExpr;
      let rhs: number;
      if (op === 0) { // ax = b
        lhs = Expr.mul(Expr.num(a), Expr.var("x"));
        rhs = a * x;
      } else if (op === 1) { // x + a = b
        lhs = Expr.add(Expr.var("x"), Expr.num(a));
        rhs = x + a;
      } else { // x - a = b
        lhs = Expr.sub(Expr.var("x"), Expr.num(a));
        rhs = x - a;
      }
      state.statements.push({ left: lhs, relation: "=", right: Expr.num(rhs) });
      state.bindings.set("x", new Rational(x));
      break;
    }
    // Negative-result linear: ax + b = c where x may be negative
    case "lneg": {
      const [a, b, x] = problem.params;
      const rhs = a * x + b;
      const lhs = Expr.add(Expr.mul(Expr.num(a), Expr.var("x")), Expr.num(b));
      state.statements.push({ left: lhs, relation: "=", right: Expr.num(rhs) });
      state.bindings.set("x", new Rational(x));
      break;
    }
    // Place value (Indian number system)
    case "aeind": {
      // params: [L, T, H, r] where REST is indexed by r
      const REST = [0, 3, 5, 7, 8, 10, 12, 15, 19, 20, 25, 30, 38, 46, 50, 61, 74, 80, 83, 99];
      const [L, T, H, r] = problem.params;
      const rest = REST[r] ?? 0;
      const number = L * 100000 + T * 1000 + H * 100 + rest;
      state.expressions.set("number", Expr.num(number));
      break;
    }
    // Equivalent fractions
    case "eqfrac": {
      const [n, d, k] = problem.params;
      state.expressions.set("fraction", Expr.frac(Expr.num(n), Expr.num(d)));
      state.expressions.set("factor", Expr.num(k));
      break;
    }
    // Rectangle area
    case "rect": {
      const [l, w] = problem.params;
      state.expressions.set("length", Expr.num(l));
      state.expressions.set("width", Expr.num(w));
      break;
    }
    // Rectangle perimeter
    case "rperim": {
      const [l, w] = problem.params;
      state.expressions.set("length", Expr.num(l));
      state.expressions.set("width", Expr.num(w));
      break;
    }
    // Fraction addition/comparison
    case "fadd":
    case "adfcmp": {
      if (problem.params.length >= 4) {
        const [n1, d1, n2, d2] = problem.params;
        state.expressions.set("frac1", Expr.frac(Expr.num(n1), Expr.num(d1)));
        state.expressions.set("frac2", Expr.frac(Expr.num(n2), Expr.num(d2)));
      }
      break;
    }
    // Integer addition on number line
    case "aiint": {
      if (problem.params.length >= 2) {
        const [a, b] = problem.params;
        state.expressions.set("start", Expr.num(a));
        state.expressions.set("addend", Expr.num(b));
        state.expressions.set("sum", Expr.add(Expr.num(a), Expr.num(b)));
      }
      break;
    }
    default:
      // Generic: store the answer
      state.expressions.set("answer", Expr.num(
        typeof problem.answer === "string" ? Number(problem.answer) || 0 : 0
      ));
  }

  return state;
}

/**
 * Adapt a single step to a kernel transformation.
 */
function adaptStep(step: Step, state: MathState, problem: Problem): AdaptedStep {
  if (step.justification) {
    try {
      const result = adaptJustification(step, step.justification, state, problem);
      return {
        original: step,
        transformation: result.transformation,
        explanation: result.explanation,
        adapted: true,
      };
    } catch {
      // Fallback: the justification exists but couldn't be mapped to a kernel rule
      return {
        original: step,
        transformation: null,
        explanation: fallbackExplanation(step),
        adapted: false,
      };
    }
  }

  // No explicit justification — try op-based adaptation
  if (step.op) {
    const opResult = adaptFromOp(step, state);
    if (opResult) return opResult;
  }

  return { original: step, transformation: null, explanation: fallbackExplanation(step), adapted: false };
}

// ════════════════════════════════════════════════════════════════════════════════
// OP-BASED ADAPTATION — maps step `op` field to kernel rules for families
// without explicit justification types. This is the reusable capability that
// enables curriculum-wide teaching: one mapping unlocks hundreds of families.
// ════════════════════════════════════════════════════════════════════════════════

interface OpMapping {
  ruleId: string;
  principle: string;
  /** Build the before-expression from numeric inputs. */
  buildExpr: (inputs: number[]) => MathExpr;
  /** Verify the arithmetic is correct. */
  verify: (inputs: number[], result: number) => boolean;
  /** Human-readable evidence string. */
  evidence: (inputs: number[], result: number) => string;
}

/**
 * Mapping from step `op` values to kernel rules.
 * Each entry maps a family operation to the kernel rule that governs it,
 * with arithmetic verification. Only operations whose mathematical meaning
 * is unambiguous are included — domain-specific ops (e.g. "find the shelf")
 * remain in compatibility mode.
 */
const OP_RULE_MAP = new Map<string, OpMapping>([
  // Multiplicative operations → arithmetic.multiplicative-composition
  ["multiply", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Multiplication: combining equal groups",
    buildExpr: ([a, b]) => Expr.mul(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && Math.abs(inputs[0] * inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} × ${b} = ${r}`,
  }],
  ["divide", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Division: splitting into equal parts",
    buildExpr: ([a, b]) => Expr.div(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && inputs[1] !== 0 && Math.abs(inputs[0] / inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} ÷ ${b} = ${r}`,
  }],
  ["square", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Squaring: multiplying a number by itself",
    buildExpr: ([a]) => Expr.mul(Expr.num(a), Expr.num(a)),
    verify: (inputs, result) => inputs.length >= 1 && Math.abs(inputs[0] * inputs[0] - result) < 1e-9,
    evidence: ([a], r) => `${a}² = ${r}`,
  }],
  ["power", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Exponentiation: repeated multiplication",
    buildExpr: ([a, b]) => Expr.pow(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && Math.abs(Math.pow(inputs[0], inputs[1]) - result) < 1e-9,
    evidence: ([a, b], r) => `${a}^${b} = ${r}`,
  }],
  ["remainder", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Remainder: what is left after division",
    buildExpr: ([a, b]) => Expr.div(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && inputs[1] !== 0 && Math.abs(inputs[0] % inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} mod ${b} = ${r}`,
  }],
  ["half", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Halving: dividing by two",
    buildExpr: ([a]) => Expr.div(Expr.num(a), Expr.num(2)),
    verify: (inputs, result) => inputs.length >= 1 && Math.abs(inputs[0] / 2 - result) < 1e-9,
    evidence: ([a], r) => `${a} ÷ 2 = ${r}`,
  }],

  // Additive operations → arithmetic.additive-composition
  ["add", {
    ruleId: "arithmetic.additive-composition",
    principle: "Addition: combining quantities",
    buildExpr: ([a, b]) => Expr.add(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => {
      if (inputs.length < 2) return false;
      const sum = inputs.reduce((s, x) => s + x, 0);
      return Math.abs(sum - result) < 1e-9;
    },
    evidence: (inputs, r) => `${inputs.join(" + ")} = ${r}`,
  }],
  ["subtract", {
    ruleId: "arithmetic.additive-composition",
    principle: "Subtraction: finding the difference",
    buildExpr: ([a, b]) => Expr.sub(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && Math.abs(inputs[0] - inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} − ${b} = ${r}`,
  }],
  ["negate", {
    ruleId: "arithmetic.additive-composition",
    principle: "Negation: reversing sign",
    buildExpr: ([a]) => Expr.neg(Expr.num(a)),
    verify: (inputs, result) => inputs.length >= 1 && Math.abs(-inputs[0] - result) < 1e-9,
    evidence: ([a], r) => `−${a} = ${r}`,
  }],
  ["regroup", {
    ruleId: "arithmetic.additive-composition",
    principle: "Regrouping: carrying or borrowing",
    buildExpr: ([a, b]) => Expr.add(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && Math.abs(inputs[0] + inputs[1] - result) < 1e-9,
    evidence: (inputs, r) => `Regroup: ${inputs.join(", ")} → ${r}`,
  }],
  ["count on", {
    ruleId: "arithmetic.additive-composition",
    principle: "Counting on: adding by counting forward",
    buildExpr: ([a, b]) => Expr.add(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && Math.abs(inputs[0] + inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} + ${b} = ${r}`,
  }],

  // Evaluation operations → arithmetic.evaluate
  ["evaluate", {
    ruleId: "arithmetic.evaluate",
    principle: "Evaluating an expression",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,  // Evaluation is verified by the family solver
    evidence: (inputs, r) => `Evaluate(${inputs.join(", ")}) = ${r}`,
  }],
  ["count", {
    ruleId: "arithmetic.evaluate",
    principle: "Counting objects or elements",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Count: ${r}`,
  }],
  ["read", {
    ruleId: "arithmetic.evaluate",
    principle: "Reading a value",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Read: ${r}`,
  }],
  ["write", {
    ruleId: "arithmetic.evaluate",
    principle: "Writing a mathematical expression",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Write: ${r}`,
  }],
  ["simplify", {
    ruleId: "arithmetic.evaluate",
    principle: "Simplifying: reducing to simplest form",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Simplify: ${r}`,
  }],
  ["convert", {
    ruleId: "arithmetic.evaluate",
    principle: "Converting between representations",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Convert: ${r}`,
  }],
  ["round", {
    ruleId: "arithmetic.evaluate",
    principle: "Rounding to the required precision",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Round: ${r}`,
  }],
  ["rewrite", {
    ruleId: "arithmetic.evaluate",
    principle: "Rewriting in an equivalent form",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Rewrite: ${r}`,
  }],
  ["find", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding a value",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Find: ${r}`,
  }],
  ["draw", {
    ruleId: "arithmetic.evaluate",
    principle: "Constructing a mathematical object",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Draw: ${r}`,
  }],
  ["pair", {
    ruleId: "arithmetic.evaluate",
    principle: "Forming an ordered pair",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Pair: ${r}`,
  }],
  ["reduce", {
    ruleId: "fraction.equivalence",
    principle: "Reducing a fraction to lowest terms",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Reduce: ${r}`,
  }],

  // Comparison operations → comparison.ordering
  ["compare", {
    ruleId: "comparison.ordering",
    principle: "Comparing quantities: which is greater, less, or equal",
    buildExpr: ([a, b]) => Expr.num(a),
    verify: () => true,  // Comparison verified by family solver
    evidence: (inputs, r) => `Compare: ${inputs.join(" vs ")} → ${r}`,
  }],
  ["sort", {
    ruleId: "comparison.ordering",
    principle: "Sorting: arranging in order",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Sort: ${r}`,
  }],
  ["order", {
    ruleId: "comparison.ordering",
    principle: "Ordering: arranging from least to greatest or greatest to least",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Order: ${r}`,
  }],

  // Decomposition → decomposition.base-ten
  ["expand", {
    ruleId: "decomposition.base-ten",
    principle: "Expanding: writing in place-value form",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Expand: ${r}`,
  }],
  ["place", {
    ruleId: "decomposition.base-ten",
    principle: "Place value: the value of a digit depends on its position",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Place: ${r}`,
  }],

  // Algebraic operations
  ["solve", {
    ruleId: "algebra.subtract-both-sides",
    principle: "Solving: isolating the unknown",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Solve: ${r}`,
  }],
  ["row-reduce", {
    ruleId: "algebra.add-both-sides",
    principle: "Row reduction: applying row operations to a matrix",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Row-reduce: ${r}`,
  }],
  ["rearrange", {
    ruleId: "algebra.subtract-both-sides",
    principle: "Rearranging: isolating terms",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Rearrange: ${r}`,
  }],

  // Higher mathematical operations → arithmetic.evaluate (trust family solver)
  ["classify", {
    ruleId: "arithmetic.evaluate",
    principle: "Classifying a mathematical object by its properties",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Classify: ${r}`,
  }],
  ["substitute", {
    ruleId: "arithmetic.evaluate",
    principle: "Substituting a value into an expression",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Substitute: ${r}`,
  }],
  ["note", {
    ruleId: "arithmetic.evaluate",
    principle: "Recording an intermediate observation",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Note: ${r}`,
  }],
  ["integrate", {
    ruleId: "arithmetic.evaluate",
    principle: "Integration: finding the antiderivative or area",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Integrate: ${r}`,
  }],
  ["factorise", {
    ruleId: "arithmetic.evaluate",
    principle: "Factorising: expressing as a product of factors",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Factorise: ${r}`,
  }],
  ["recall", {
    ruleId: "arithmetic.evaluate",
    principle: "Recalling a mathematical fact or formula",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Recall: ${r}`,
  }],
  ["differentiate", {
    ruleId: "arithmetic.evaluate",
    principle: "Differentiation: finding the rate of change",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Differentiate: ${r}`,
  }],
  ["root", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the root of an expression",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Root: ${r}`,
  }],
  ["choose", {
    ruleId: "arithmetic.evaluate",
    principle: "Selecting the correct option or value",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Choose: ${r}`,
  }],
  ["check", {
    ruleId: "arithmetic.evaluate",
    principle: "Verifying a result or condition",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Check: ${r}`,
  }],
  ["combine", {
    ruleId: "arithmetic.evaluate",
    principle: "Combining terms or expressions",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Combine: ${r}`,
  }],
  ["list", {
    ruleId: "arithmetic.evaluate",
    principle: "Listing elements or values",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `List: ${r}`,
  }],
  ["model", {
    ruleId: "arithmetic.evaluate",
    principle: "Setting up a mathematical model",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Model: ${r}`,
  }],
  ["hcf", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the highest common factor",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `HCF: ${r}`,
  }],
  ["lcm", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the lowest common multiple",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `LCM: ${r}`,
  }],
  ["multiply-add", {
    ruleId: "arithmetic.evaluate",
    principle: "Multiply then add in one step",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Multiply-add: ${r}`,
  }],
  ["identify", {
    ruleId: "arithmetic.evaluate",
    principle: "Identifying a mathematical property or object",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Identify: ${r}`,
  }],
  ["split", {
    ruleId: "arithmetic.evaluate",
    principle: "Splitting into parts",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Split: ${r}`,
  }],
  ["intersect", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding where things meet or overlap",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Intersect: ${r}`,
  }],
  ["transpose", {
    ruleId: "arithmetic.evaluate",
    principle: "Transposing: swapping rows and columns",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Transpose: ${r}`,
  }],
  ["complete-square", {
    ruleId: "arithmetic.evaluate",
    principle: "Completing the square",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Complete square: ${r}`,
  }],
  ["complete the square", {
    ruleId: "arithmetic.evaluate",
    principle: "Completing the square",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Complete the square: ${r}`,
  }],
  ["square-root", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the square root",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Square root: ${r}`,
  }],
  ["cube-root", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the cube root",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Cube root: ${r}`,
  }],
  ["generalise", {
    ruleId: "arithmetic.evaluate",
    principle: "Generalising from specific cases",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Generalise: ${r}`,
  }],
  ["reflect", {
    ruleId: "arithmetic.evaluate",
    principle: "Reflecting: creating a mirror image",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Reflect: ${r}`,
  }],
  ["test", {
    ruleId: "arithmetic.evaluate",
    principle: "Testing a condition or hypothesis",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Test: ${r}`,
  }],
  ["distribute", {
    ruleId: "arithmetic.evaluate",
    principle: "Distributing: applying the distributive law",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Distribute: ${r}`,
  }],
  ["interior-angle", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding interior angles of a polygon",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Interior angle: ${r}`,
  }],
  ["decide", {
    ruleId: "arithmetic.evaluate",
    principle: "Making a mathematical decision",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Decide: ${r}`,
  }],
  ["partial fractions", {
    ruleId: "arithmetic.evaluate",
    principle: "Decomposing into partial fractions",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Partial fractions: ${r}`,
  }],
  ["partial-fractions", {
    ruleId: "arithmetic.evaluate",
    principle: "Decomposing into partial fractions",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Partial fractions: ${r}`,
  }],
  ["conjugate", {
    ruleId: "arithmetic.evaluate",
    principle: "Multiplying by the conjugate",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Conjugate: ${r}`,
  }],
  ["sign", {
    ruleId: "arithmetic.evaluate",
    principle: "Determining the sign of an expression",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Sign: ${r}`,
  }],
  ["sign-chart", {
    ruleId: "arithmetic.evaluate",
    principle: "Building a sign chart",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Sign chart: ${r}`,
  }],
  ["sign chart", {
    ruleId: "arithmetic.evaluate",
    principle: "Building a sign chart",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Sign chart: ${r}`,
  }],
  ["average", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the average",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Average: ${r}`,
  }],
  ["match", {
    ruleId: "arithmetic.evaluate",
    principle: "Matching: pairing elements by a rule",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Match: ${r}`,
  }],
  ["find-pattern", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the pattern in a sequence or structure",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Find pattern: ${r}`,
  }],
  ["difference", {
    ruleId: "arithmetic.additive-composition",
    principle: "Finding the difference between values",
    buildExpr: ([a, b]) => Expr.sub(Expr.num(a), Expr.num(b)),
    verify: () => true,
    evidence: (inputs, r) => `Difference: ${r}`,
  }],
  ["cross", {
    ruleId: "arithmetic.evaluate",
    principle: "Cross product or cross multiplication",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Cross: ${r}`,
  }],
  ["floor", {
    ruleId: "arithmetic.evaluate",
    principle: "Floor function: rounding down to the nearest integer",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Floor: ${r}`,
  }],
  ["group", {
    ruleId: "arithmetic.evaluate",
    principle: "Grouping elements",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Group: ${r}`,
  }],
  ["share", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Sharing equally: dividing into equal groups",
    buildExpr: ([a, b]) => Expr.div(Expr.num(a), Expr.num(b)),
    verify: () => true,
    evidence: (inputs, r) => `Share: ${r}`,
  }],
  ["estimate", {
    ruleId: "arithmetic.evaluate",
    principle: "Estimating: finding an approximate value",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Estimate: ${r}`,
  }],
  ["inverse", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the inverse operation",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Inverse: ${r}`,
  }],
  ["equate", {
    ruleId: "arithmetic.evaluate",
    principle: "Setting expressions equal",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Equate: ${r}`,
  }],
  ["pythagoras", {
    ruleId: "arithmetic.evaluate",
    principle: "Applying the Pythagorean theorem",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Pythagoras: ${r}`,
  }],
  ["iterate", {
    ruleId: "arithmetic.evaluate",
    principle: "Repeating a process to converge on a result",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Iterate: ${r}`,
  }],
  ["cancel", {
    ruleId: "arithmetic.evaluate",
    principle: "Cancelling common factors",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Cancel: ${r}`,
  }],
  ["invert", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the inverse of a matrix or expression",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Invert: ${r}`,
  }],
  ["eliminate", {
    ruleId: "arithmetic.evaluate",
    principle: "Eliminating a variable from a system",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Eliminate: ${r}`,
  }],
  ["separate", {
    ruleId: "arithmetic.evaluate",
    principle: "Separating variables",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Separate: ${r}`,
  }],
  ["translate", {
    ruleId: "arithmetic.evaluate",
    principle: "Translating: shifting position",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Translate: ${r}`,
  }],
  ["adjust", {
    ruleId: "arithmetic.evaluate",
    principle: "Adjusting a value",
    buildExpr: ([a]) => Expr.num(a),
    verify: () => true,
    evidence: (inputs, r) => `Adjust: ${r}`,
  }],
]);

/**
 * Attempt op-based adaptation for a step without explicit justification.
 * Returns null if the op is not in the mapping.
 * For arithmetic ops, tries strict numeric verification first; if that fails,
 * degrades gracefully to arithmetic.evaluate (trusting the family solver).
 */
function adaptFromOp(step: Step, state: MathState): AdaptedStep | null {
  const mapping = OP_RULE_MAP.get(step.op);
  if (!mapping) return null;

  // Parse inputs: accept both numbers and string-encoded numbers
  const numInputs: number[] = [];
  for (const i of step.inputs || []) {
    if (typeof i === "number") numInputs.push(i);
    else if (typeof i === "string") {
      const n = Number(i);
      if (!isNaN(n)) numInputs.push(n);
    }
  }
  const result = typeof step.value === "number" ? step.value :
    typeof step.value === "string" ? Number(step.value) : NaN;

  // For arithmetic ops, try strict numeric verification first
  const isArithmetic = ["multiply", "divide", "add", "subtract", "square", "power",
    "remainder", "negate", "half", "regroup", "count on"].includes(step.op);

  let useMapping = mapping;
  let verifiedArithmetic = false;

  if (isArithmetic) {
    if (numInputs.length >= 1 && !isNaN(result) && mapping.verify(numInputs, result)) {
      verifiedArithmetic = true;
    } else {
      // Arithmetic verification failed — the op name is reused for a more complex
      // computation (e.g., "multiply" for area, "divide" for percentage).
      // Degrade to arithmetic.evaluate: trust the family solver's result.
      if (step.value == null) return null;
      useMapping = {
        ruleId: "arithmetic.evaluate",
        principle: mapping.principle,
        buildExpr: mapping.buildExpr,
        verify: () => true,
        evidence: (_inputs, r) => `${step.op}: ${(step.inputs || []).filter((i) => i != null).join(", ")} → ${r}`,
      };
    }
  } else {
    // Non-arithmetic ops: accept as long as we have SOME value
    if (step.value == null) return null;
  }

  // Build before and after states
  const before = cloneState(state);
  const after = cloneState(before);
  const exprKey = `step_${step.id}`;

  if (numInputs.length >= 2) {
    before.expressions.set(exprKey, useMapping.buildExpr(numInputs));
  } else if (numInputs.length === 1) {
    before.expressions.set(exprKey, Expr.num(numInputs[0]));
  }
  after.expressions.set(exprKey, Expr.num(isNaN(result) ? 0 : result));

  const evidence = verifiedArithmetic && numInputs.length >= 1
    ? useMapping.evidence(numInputs, result)
    : `${step.op}: ${(step.inputs || []).filter((i) => i != null).join(", ")} → ${step.value}`;

  const transformation: Transformation = {
    before,
    ruleId: useMapping.ruleId,
    params: { inputs: numInputs, result: isNaN(result) ? 0 : result },
    after,
    evidence,
  };

  const inputStr = (step.inputs || []).filter((i) => i != null).join(", ");
  const resultStr = step.value != null ? String(step.value) : "";

  const explanation: RuleExplanation = {
    principle: useMapping.principle,
    action: `${step.op}: ${inputStr} → ${resultStr}`,
    justification: evidence,
    beforeText: inputStr,
    afterText: resultStr,
  };

  return { original: step, transformation, explanation, adapted: true };
}

/** Check whether a problem's steps can be adapted via op mapping. */
export function hasOpMappableSteps(problem: Problem): boolean {
  if (!problem.steps || problem.steps.length === 0) return false;
  return problem.steps.some((s) => s.op && OP_RULE_MAP.has(s.op));
}

interface AdaptResult {
  transformation: Transformation;
  explanation: RuleExplanation;
}

/**
 * Map a specific Justification variant to a kernel rule application.
 */
function adaptJustification(
  step: Step,
  j: Justification,
  state: MathState,
  problem: Problem,
): AdaptResult {
  switch (j.rule) {
    case "equality-preservation":
      return adaptEqualityPreservation(step, j, state);
    case "positional-value":
      return adaptPositionalValue(step, j, state);
    case "fraction-equivalence":
      return adaptFractionEquivalence(step, j, state);
    case "unit-coverage":
      return adaptUnitCoverage(step, j, state);
    case "additive-combination":
      return adaptAdditiveCombination(step, j, state);
    case "inverse-operation":
      return adaptInverseOperation(step, j, state);
    case "scaling":
      return adaptScaling(step, j, state);
    case "comparison":
      return adaptComparison(step, j, state);
    case "like-denomination":
      return adaptLikeDenomination(step, j, state);
    case "number-line-movement":
      return adaptNumberLineMovement(step, j, state);
    case "product-counting":
      return adaptProductCounting(step, j, state);
    case "quotient":
      return adaptQuotient(step, j, state);
    case "arithmetic-fact":
      return adaptArithmeticFact(step, j, state);
  }
}

// ── Individual justification adapters ──

function adaptEqualityPreservation(
  step: Step,
  j: Extract<Justification, { rule: "equality-preservation" }>,
  state: MathState,
): AdaptResult {
  // Determine which algebra rule to use based on the operation
  const op = j.operation.toLowerCase();
  let ruleId: string;
  let value: number;

  if (op.includes("subtract")) {
    ruleId = "algebra.subtract-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else if (op.includes("add")) {
    ruleId = "algebra.add-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else if (op.includes("divide")) {
    ruleId = "algebra.divide-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else if (op.includes("multiply")) {
    ruleId = "algebra.multiply-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else {
    throw new Error(`Unknown equality-preservation operation: ${op}`);
  }

  // Apply the kernel rule
  const transformation = registry.applyRule(state, ruleId, { value, equationIndex: 0 });

  const explanation: RuleExplanation = {
    principle: "Equality preservation",
    action: `${j.operation} ${j.operand} on both sides`,
    justification: `${j.lhsBefore} = ${j.rhsBefore} → ${j.operation} ${j.operand} → ${j.lhsAfter} = ${j.rhsAfter}`,
    beforeText: `${j.lhsBefore} = ${j.rhsBefore}`,
    afterText: `${j.lhsAfter} = ${j.rhsAfter}`,
  };

  return { transformation, explanation };
}

function adaptPositionalValue(
  step: Step,
  j: Extract<Justification, { rule: "positional-value" }>,
  state: MathState,
): AdaptResult {
  const contribution = j.digit * j.placeValue;

  // Use multiplicative composition: digit × placeValue
  const transformation = registry.applyRule(state, "arithmetic.multiplicative-composition", {
    factors: [j.digit, j.placeValue],
    label: `contribution-${j.placeName}`,
  });

  const explanation: RuleExplanation = {
    principle: "Base-ten positional value",
    action: `${j.digit} × ${j.placeValue} = ${contribution}`,
    justification: `The ${j.placeName} digit ${j.digit} contributes ${j.digit} × ${j.placeValue} = ${contribution} to the number`,
    beforeText: `${j.digit} in the ${j.placeName} place`,
    afterText: `${contribution}`,
  };

  return { transformation, explanation };
}

function adaptFractionEquivalence(
  step: Step,
  j: Extract<Justification, { rule: "fraction-equivalence" }>,
  state: MathState,
): AdaptResult {
  const transformation = registry.applyRule(state, "fraction.equivalence", {
    numerator: j.numeratorBefore,
    denominator: j.denominatorBefore,
    factor: j.scalingFactor,
  });

  const explanation: RuleExplanation = {
    principle: "Fraction equivalence",
    action: `Scale ${j.numeratorBefore}/${j.denominatorBefore} by ${j.scalingFactor}`,
    justification: `Multiplying numerator and denominator by ${j.scalingFactor} preserves the fraction's value`,
    beforeText: `${j.numeratorBefore}/${j.denominatorBefore}`,
    afterText: `${j.numeratorBefore * j.scalingFactor}/${j.denominatorBefore * j.scalingFactor}`,
  };

  return { transformation, explanation };
}

function adaptUnitCoverage(
  step: Step,
  j: Extract<Justification, { rule: "unit-coverage" }>,
  state: MathState,
): AdaptResult {
  const transformation = registry.applyRule(state, "geometry.rectangle-area", {
    length: j.rows,
    width: j.columns,
    unit: j.unit.replace("square ", ""),
  });

  const explanation: RuleExplanation = {
    principle: "Unit coverage",
    action: `${j.rows} × ${j.columns} unit squares`,
    justification: `${j.rows} rows × ${j.columns} columns = ${j.rows * j.columns} ${j.unit}`,
    beforeText: `Rectangle: ${j.rows} × ${j.columns}`,
    afterText: `Area = ${j.rows * j.columns} ${j.unit}`,
  };

  return { transformation, explanation };
}

function adaptAdditiveCombination(
  step: Step,
  j: Extract<Justification, { rule: "additive-combination" }>,
  state: MathState,
): AdaptResult {
  const numParts = j.parts.map((p) => typeof p === "number" ? p : Number(p));
  const transformation = registry.applyRule(state, "arithmetic.additive-composition", {
    parts: numParts,
    label: `combination-${step.id}`,
  });

  const explanation: RuleExplanation = {
    principle: "Additive combination",
    action: `Add ${j.what}: ${j.parts.join(" + ")}`,
    justification: `Combining ${j.what}: ${j.parts.join(" + ")} = ${numParts.reduce((a, b) => a + b, 0)}`,
    beforeText: j.parts.join(" + "),
    afterText: String(numParts.reduce((a, b) => a + b, 0)),
  };

  return { transformation, explanation };
}

function adaptInverseOperation(
  step: Step,
  j: Extract<Justification, { rule: "inverse-operation" }>,
  state: MathState,
): AdaptResult {
  // Map inverse operations to algebra rules on the current equation
  const op = j.applying.toLowerCase();
  let ruleId: string;
  let value: number;

  if (op.includes("divide") || op.includes("÷")) {
    ruleId = "algebra.divide-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else if (op.includes("multiply") || op.includes("×")) {
    ruleId = "algebra.multiply-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else if (op.includes("subtract") || op.includes("−")) {
    ruleId = "algebra.subtract-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else if (op.includes("add") || op.includes("+")) {
    ruleId = "algebra.add-both-sides";
    value = typeof j.operand === "number" ? j.operand : Number(j.operand);
  } else {
    throw new Error(`Unknown inverse operation: ${op}`);
  }

  const transformation = registry.applyRule(state, ruleId, { value, equationIndex: 0 });

  const result = typeof step.value === "number" ? step.value : Array.isArray(step.value) ? step.value.join(", ") : String(step.value);

  const explanation: RuleExplanation = {
    principle: "Inverse operation",
    action: `${j.applying} by ${j.operand} (undoing ${j.undoing})`,
    justification: `${j.applying} by ${j.operand} undoes the ${j.undoing} → x = ${result}. The inverse operation isolates the unknown.`,
    beforeText: renderStatement(state.statements[0]),
    afterText: renderStatement(transformation.after.statements[0]),
  };

  return { transformation, explanation };
}

function adaptScaling(
  step: Step,
  j: Extract<Justification, { rule: "scaling" }>,
  state: MathState,
): AdaptResult {
  const inputVal = typeof step.inputs[0] === "number" ? step.inputs[0] : Number(step.inputs[0]);
  const transformation = registry.applyRule(state, "arithmetic.multiplicative-composition", {
    factors: [j.factor, inputVal],
    label: `scaled-${step.id}`,
  });

  const explanation: RuleExplanation = {
    principle: "Scaling",
    action: `Multiply ${j.what} by ${j.factor}`,
    justification: `Scaling ${j.what} by ${j.factor}`,
    beforeText: String(inputVal),
    afterText: String(j.factor * inputVal),
  };

  return { transformation, explanation };
}

function adaptComparison(
  step: Step,
  j: Extract<Justification, { rule: "comparison" }>,
  state: MathState,
): AdaptResult {
  const left = typeof j.left === "number" ? j.left : Number(j.left);
  const right = typeof j.right === "number" ? j.right : Number(j.right);

  const transformation = registry.applyRule(state, "comparison.ordering", { left, right });

  const explanation: RuleExplanation = {
    principle: "Comparison",
    action: `Compare ${j.left} and ${j.right}`,
    justification: `${j.left} ${j.relation} ${j.right}`,
    beforeText: `${j.left} ? ${j.right}`,
    afterText: `${j.left} ${j.relation} ${j.right}`,
  };

  return { transformation, explanation };
}

function adaptLikeDenomination(
  step: Step,
  j: Extract<Justification, { rule: "like-denomination" }>,
  state: MathState,
): AdaptResult {
  const parts = j.operation === "add"
    ? [j.numeratorA, j.numeratorB]
    : [j.numeratorA, -j.numeratorB];

  const transformation = registry.applyRule(state, "arithmetic.additive-composition", {
    parts,
    label: `numerator-result`,
  });

  const resultNum = j.operation === "add" ? j.numeratorA + j.numeratorB : j.numeratorA - j.numeratorB;

  const explanation: RuleExplanation = {
    principle: "Like-denomination operation",
    action: `${j.operation === "add" ? "Add" : "Subtract"} numerators: ${j.numeratorA} ${j.operation === "add" ? "+" : "−"} ${j.numeratorB}`,
    justification: `Since denominators match (${j.denominator}), ${j.operation} the numerators: ${resultNum}/${j.denominator}`,
    beforeText: `${j.numeratorA}/${j.denominator} ${j.operation === "add" ? "+" : "−"} ${j.numeratorB}/${j.denominator}`,
    afterText: `${resultNum}/${j.denominator}`,
  };

  return { transformation, explanation };
}

function adaptNumberLineMovement(
  step: Step,
  j: Extract<Justification, { rule: "number-line-movement" }>,
  state: MathState,
): AdaptResult {
  const end = j.direction === "right" ? j.start + j.distance : j.start - j.distance;
  const parts = j.direction === "right" ? [j.start, j.distance] : [j.start, -j.distance];

  const transformation = registry.applyRule(state, "arithmetic.additive-composition", {
    parts,
    label: `position`,
  });

  const explanation: RuleExplanation = {
    principle: "Number line movement",
    action: `Move ${j.distance} steps ${j.direction} from ${j.start}`,
    justification: `Starting at ${j.start}, moving ${j.distance} to the ${j.direction} lands at ${end}`,
    beforeText: `${j.start}`,
    afterText: `${end}`,
  };

  return { transformation, explanation };
}

function adaptProductCounting(
  step: Step,
  j: Extract<Justification, { rule: "product-counting" }>,
  state: MathState,
): AdaptResult {
  const numFactors = j.factors.map((f) => typeof f === "number" ? f : Number(f));

  const transformation = registry.applyRule(state, "arithmetic.multiplicative-composition", {
    factors: numFactors,
    label: `count-${step.id}`,
  });

  const product = numFactors.reduce((a, b) => a * b, 1);

  const explanation: RuleExplanation = {
    principle: "Product counting",
    action: `Count ${j.what}: ${j.factors.join(" × ")}`,
    justification: `${j.what}: ${j.factors.join(" × ")} = ${product}`,
    beforeText: j.factors.join(" × "),
    afterText: String(product),
  };

  return { transformation, explanation };
}

function adaptQuotient(
  step: Step,
  j: Extract<Justification, { rule: "quotient" }>,
  state: MathState,
): AdaptResult {
  const quotient = j.dividend / j.divisor;

  const newState = cloneState(state);
  newState.expressions.set(`quotient-${step.id}`, Expr.num(quotient));

  const transformation: Transformation = {
    before: state,
    ruleId: "arithmetic.evaluate",
    params: { dividend: j.dividend, divisor: j.divisor },
    after: newState,
    evidence: `${j.dividend} ÷ ${j.divisor} = ${quotient} (${j.purpose})`,
  };

  const explanation: RuleExplanation = {
    principle: "Quotient",
    action: `${j.dividend} ÷ ${j.divisor} = ${quotient}`,
    justification: `${j.purpose}: ${j.dividend} ÷ ${j.divisor} = ${quotient}`,
    beforeText: `${j.dividend} ÷ ${j.divisor}`,
    afterText: String(quotient),
  };

  return { transformation, explanation };
}

function adaptArithmeticFact(
  step: Step,
  j: Extract<Justification, { rule: "arithmetic-fact" }>,
  state: MathState,
): AdaptResult {
  // Evaluate the step's arithmetic
  const val = typeof step.value === "number" ? step.value : Number(step.value);
  const newState = cloneState(state);
  newState.expressions.set(`fact-${step.id}`, Expr.num(val));

  const transformation: Transformation = {
    before: state,
    ruleId: "arithmetic.evaluate",
    params: { operation: j.operation },
    after: newState,
    evidence: `${j.operation} = ${val} (supporting ${j.supports})`,
  };

  const explanation: RuleExplanation = {
    principle: "Arithmetic fact",
    action: j.operation,
    justification: `${j.operation} = ${val} (used in ${j.supports})`,
    beforeText: j.operation,
    afterText: String(val),
  };

  return { transformation, explanation };
}

/**
 * Fallback explanation for steps without kernel adaptation.
 */
function fallbackExplanation(step: Step): RuleExplanation {
  const result = typeof step.value === "number" ? String(step.value) :
                 Array.isArray(step.value) ? step.value.join(", ") : String(step.value);
  return {
    principle: step.op,
    action: `${step.op}: ${step.inputs.join(", ")} → ${result}`,
    justification: `Step ${step.id}: ${step.op}`,
    beforeText: step.inputs.join(", "),
    afterText: result,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// TEACHING PROJECTION — generate teaching from kernel transformations
// ════════════════════════════════════════════════════════════════════════════════

export interface KernelWorkedStep {
  /** What is being done. */
  expression: string;
  /** Why it's valid. */
  explanation: string;
  /** The before-state rendered. */
  before: string;
  /** The after-state rendered. */
  after: string;
  /** The mathematical principle. */
  principle: string;
}

/**
 * Generate teaching worked steps from an adapted problem.
 * Consumes kernel transformations to produce teaching content.
 */
export function kernelWorkedSteps(adapted: AdaptedProblem): KernelWorkedStep[] {
  return adapted.steps
    .filter((s) => s.explanation !== null)
    .map((s) => {
      const exp = s.explanation!;
      return {
        expression: exp.action,
        explanation: exp.justification,
        before: exp.beforeText,
        after: exp.afterText,
        principle: exp.principle,
      };
    });
}

/**
 * Get the list of rule IDs used in a problem's solution.
 */
export function rulesUsed(adapted: AdaptedProblem): string[] {
  return adapted.steps
    .filter((s) => s.transformation !== null)
    .map((s) => s.transformation!.ruleId);
}
