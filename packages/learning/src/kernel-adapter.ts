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
  if (!step.justification) {
    return { original: step, transformation: null, explanation: fallbackExplanation(step), adapted: false };
  }

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
    action: `${j.digit} × ${j.placeValue.toLocaleString()} = ${contribution.toLocaleString()}`,
    justification: `The ${j.placeName} digit ${j.digit} contributes ${j.digit} × ${j.placeValue.toLocaleString()} = ${contribution.toLocaleString()} to the number`,
    beforeText: `${j.digit} in the ${j.placeName} place`,
    afterText: `${contribution.toLocaleString()}`,
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

  const explanation: RuleExplanation = {
    principle: "Inverse operation",
    action: `${j.applying} ${j.operand} (undoing ${j.undoing})`,
    justification: `Applying ${j.applying} undoes ${j.undoing}: isolates the unknown`,
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
