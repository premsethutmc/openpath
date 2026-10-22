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
 *
 * VERIFICATION POLICY: A step is kernel-backed only when the adapter can
 * independently verify the arithmetic from its inputs and output.
 * An operation name alone is insufficient — the inputs, output, semantics
 * and preconditions must be enough to confirm the rule.
 *
 * Operations whose mathematical meaning requires context beyond
 * (inputs → output) — integrate, differentiate, factorise, solve, etc. —
 * remain in compatibility mode. They are valid teaching content but
 * cannot be independently verified by the kernel.
 */
const OP_RULE_MAP = new Map<string, OpMapping>([
  // ── Multiplicative operations ───────────────────────────────────────────────────────
  // Each verifies: inputs ×/÷ → result within floating-point tolerance.
  ["multiply", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Multiplication: combining equal groups",
    buildExpr: (inputs) => inputs.length === 2
      ? Expr.mul(Expr.num(inputs[0]), Expr.num(inputs[1]))
      : inputs.reduce((e, v, i) => i === 0 ? Expr.num(v) : Expr.mul(e, Expr.num(v)), Expr.num(0) as MathExpr),
    verify: (inputs, result) => {
      if (inputs.length < 2) return false;
      const product = inputs.reduce((p, x) => p * x, 1);
      return Math.abs(product - result) < 1e-9 ||
        (Math.abs(result) > 1 && Math.abs((product - result) / result) < 1e-9);
    },
    evidence: (inputs, r) => `${inputs.join(" × ")} = ${r}`,
  }],
  ["divide", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Division: splitting into equal parts",
    buildExpr: ([a, b]) => Expr.div(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => {
      if (inputs.length < 2 || inputs[1] === 0) return false;
      const exact = inputs[0] / inputs[1];
      // Exact division
      if (Math.abs(exact - result) < 1e-9) return true;
      // Integer division (quotient): floor(a/b) = result
      // Verified only when both inputs are integers and result is a non-negative integer
      if (Number.isInteger(inputs[0]) && Number.isInteger(inputs[1]) &&
          Number.isInteger(result) && result >= 0 &&
          Math.floor(inputs[0] / inputs[1]) === result) return true;
      return false;
    },
    evidence: ([a, b], r) => {
      const exact = a / b;
      if (Math.abs(exact - r) < 1e-9) return `${a} ÷ ${b} = ${r}`;
      return `${a} ÷ ${b} = ${r} (integer quotient)`;
    },
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
  ["share", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Sharing equally: dividing into equal groups",
    buildExpr: ([a, b]) => Expr.div(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && inputs[1] !== 0 && Math.abs(inputs[0] / inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} ÷ ${b} = ${r} (sharing equally)`,
  }],

  // ── Additive operations ───────────────────────────────────────────────────────────
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
  ["difference", {
    ruleId: "arithmetic.additive-composition",
    principle: "Finding the difference between values",
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
    verify: (inputs, result) => {
      if (inputs.length < 2) return false;
      const sum = inputs.reduce((s, x) => s + x, 0);
      return Math.abs(sum - result) < 1e-9;
    },
    evidence: (inputs, r) => `Regroup: ${inputs.join(", ")} → ${r}`,
  }],
  ["count on", {
    ruleId: "arithmetic.additive-composition",
    principle: "Counting on: adding by counting forward",
    buildExpr: ([a, b]) => Expr.add(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => inputs.length >= 2 && Math.abs(inputs[0] + inputs[1] - result) < 1e-9,
    evidence: ([a, b], r) => `${a} + ${b} = ${r}`,
  }],

  // ── Verifiable single-input operations ──────────────────────────────────────────
  // These can be verified because the mathematical relationship between
  // input and output is unambiguous and computable.
  ["square-root", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the square root",
    buildExpr: ([a]) => Expr.num(a),
    verify: (inputs, result) => inputs.length >= 1 && result >= 0 && Math.abs(result * result - inputs[0]) < 1e-6,
    evidence: ([a], r) => `√${a} = ${r}`,
  }],
  ["cube-root", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the cube root",
    buildExpr: ([a]) => Expr.num(a),
    verify: (inputs, result) => inputs.length >= 1 && Math.abs(result * result * result - inputs[0]) < 1e-6,
    evidence: ([a], r) => `∛${a} = ${r}`,
  }],
  ["floor", {
    ruleId: "arithmetic.evaluate",
    principle: "Floor function: rounding down to the nearest integer",
    buildExpr: ([a]) => Expr.num(a),
    verify: (inputs, result) => inputs.length >= 1 && Math.abs(Math.floor(inputs[0]) - result) < 1e-9,
    evidence: ([a], r) => `⌊${a}⌋ = ${r}`,
  }],
  ["average", {
    ruleId: "arithmetic.evaluate",
    principle: "Finding the average (mean)",
    buildExpr: ([a]) => Expr.num(a),
    verify: (inputs, result) => inputs.length >= 1 && Math.abs(inputs.reduce((s, x) => s + x, 0) / inputs.length - result) < 1e-9,
    evidence: (inputs, r) => `mean(${inputs.join(", ")}) = ${r}`,
  }],

  // ── Rounding operations ──────────────────────────────────────────────────────────
  // Rounding is independently verifiable: round(value, place) = Math.round(value/place)*place
  ["round", {
    ruleId: "arithmetic.evaluate",
    principle: "Rounding to a given place value",
    buildExpr: ([a]) => Expr.num(a),
    verify: (inputs, result) => {
      if (inputs.length < 1) return false;
      const value = inputs[0];
      if (inputs.length >= 2 && inputs[1] > 0) {
        // Explicit place value: round(value, place)
        const place = inputs[1];
        return Math.abs(Math.round(value / place) * place - result) < 1e-9;
      }
      // Single input: try common place values
      for (const place of [1, 10, 100, 1000, 10000, 100000, 1000000]) {
        if (Math.abs(Math.round(value / place) * place - result) < 1e-9) return true;
      }
      return false;
    },
    evidence: (inputs, r) => {
      if (inputs.length >= 2) return `round(${inputs[0]}, to nearest ${inputs[1]}) = ${r}`;
      return `round(${inputs[0]}) = ${r}`;
    },
  }],

  // ── Convert as multiplication/division ─────────────────────────────────────────────
  // When convert has exactly 2 numeric inputs and the result equals input[0] × input[1]
  // or input[0] / input[1], the conversion is independently verifiable as multiplication.
  ["convert", {
    ruleId: "arithmetic.multiplicative-composition",
    principle: "Unit conversion: multiplying or dividing by a conversion factor",
    buildExpr: ([a, b]) => Expr.mul(Expr.num(a), Expr.num(b)),
    verify: (inputs, result) => {
      if (inputs.length < 2) return false;
      // Check multiply: input[0] × input[1] = result
      if (Math.abs(inputs[0] * inputs[1] - result) < 1e-9) return true;
      // Check divide: input[0] / input[1] = result (reverse conversion)
      if (inputs[1] !== 0 && Math.abs(inputs[0] / inputs[1] - result) < 1e-9) return true;
      return false;
    },
    evidence: ([a, b], r) => {
      if (Math.abs(a * b - r) < 1e-9) return `${a} × ${b} = ${r} (conversion)`;
      return `${a} ÷ ${b} = ${r} (conversion)`;
    },
  }],

  // ── No unverified mappings below this line ─────────────────────────────────────────
  // Operations like integrate, differentiate, factorise, solve, classify,
  // substitute, simplify, expand, reduce, evaluate, count, read,
  // write, compare, sort, order, place, etc. are NOT mapped because the
  // kernel cannot independently verify their results from (inputs, output)
  // alone. They remain in compatibility mode: valid teaching, no kernel label.
]);

/**
 * Parse a numeric value from a number or string, including fraction notation.
 * Handles: 42, "3.14", "22/7", "1/3", "55/4".
 * Returns null if the value cannot be parsed as a finite number.
 */
export function parseNumeric(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s === "") return null;
  // Try direct number parse first
  const direct = Number(s);
  if (!isNaN(direct) && isFinite(direct)) return direct;
  // Try fraction: "22/7", "1/3", "55/4"
  // Only match pure numeric fractions — reject anything with letters/symbols
  const match = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (match) {
    const num = Number(match[1]);
    const den = Number(match[2]);
    if (!isNaN(num) && !isNaN(den) && den !== 0 && isFinite(num / den)) {
      return num / den;
    }
  }
  return null;
}

/**
 * Attempt op-based adaptation for a step without explicit justification.
 * Returns null if the op is not in the mapping or if verification fails.
 *
 * SOUNDNESS POLICY: A step receives kernel-backed status ONLY when its
 * arithmetic is independently verified. There is no fallback to
 * arithmetic.evaluate with verify: () => true. If verification fails,
 * the step is not adapted (adapted: false / compatibility mode).
 */
function adaptFromOp(step: Step, state: MathState): AdaptedStep | null {
  const mapping = OP_RULE_MAP.get(step.op);
  if (!mapping) return null;

  // Parse inputs: accept numbers, string-encoded numbers, and fraction strings
  const numInputs: number[] = [];
  for (const i of step.inputs || []) {
    const parsed = parseNumeric(i);
    if (parsed !== null) numInputs.push(parsed);
  }
  // Parse result: also accept fraction strings like "1/4"
  const result = (() => {
    const p = parseNumeric(step.value);
    return p !== null ? p : NaN;
  })();

  // Every mapped op MUST pass its verify function.
  // There is no graceful degradation — failed verification means not adapted.
  if (step.value == null) return null;
  if (numInputs.length < 1) return null;
  if (isNaN(result)) return null;
  if (!mapping.verify(numInputs, result)) return null;

  // Build before and after states
  const before = cloneState(state);
  const after = cloneState(before);
  const exprKey = `step_${step.id}`;

  if (numInputs.length >= 2) {
    before.expressions.set(exprKey, mapping.buildExpr(numInputs));
  } else if (numInputs.length === 1) {
    before.expressions.set(exprKey, Expr.num(numInputs[0]));
  }
  after.expressions.set(exprKey, Expr.num(result));

  const evidence = mapping.evidence(numInputs, result);

  const transformation: Transformation = {
    before,
    ruleId: mapping.ruleId,
    params: { inputs: numInputs, result },
    after,
    evidence,
  };

  const inputStr = (step.inputs || []).filter((i) => i != null).join(", ");
  const resultStr = step.value != null ? String(step.value) : "";

  const explanation: RuleExplanation = {
    principle: mapping.principle,
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
