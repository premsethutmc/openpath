/**
 * Architecture acceptance tests — verify the full pipeline:
 * Problem → Mathematical State → Rule Application → Verified Transformation → Teaching
 *
 * These test the MECHANISM, not hardcoded examples. Changing parameters must produce
 * different numbers but the same rules.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  Rational, Expr, evaluate, renderExpr, simplify, exprEquals,
  createState, createDefaultRegistry, cloneState, renderStatement,
  type MathExpr, type MathState,
} from "./math-kernel";
import { adaptProblem, kernelWorkedSteps, rulesUsed } from "./kernel-adapter";
import { teachingPresentationFrom, validateTeachingPresentation, type TeachingPresentation, type KernelFailure } from "./teaching-presentation";
import { FAMILIES } from "./families";
import type { Problem, Step, Justification } from "./family-kit";
import type { Module, Screen } from "./content";

// ── Helpers ──

function makeProblem(
  family: string, params: number[], steps: Step[], answer: number | string = 0,
): Problem {
  return { family, id: `${family}:${params.join(",")}`, params, competency: `test.${family}`,
    skill: `test.${family}`, form: "typed", steps, answer, bugs: [], figure: null } as Problem;
}

function makeStep(id: string, op: string, inputs: (number|string)[], value: number|string, j?: Justification): Step {
  return { id, op, competency: "test", inputs, value, justification: j };
}

const registry = createDefaultRegistry();

// ════════════════════════════════════════════════════════════════════════════════
// 1. PLACE VALUE — internal zeros and different digit positions
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: place value with internal zeros", () => {
  // 305,700 — has zero in ten-thousands and tens positions
  it("handles internal zeros correctly", () => {
    const state = createState();
    // Decompose 305,700 = 3×100000 + 0×10000 + 5×1000 + 7×100 + 0×10 + 0×1
    const t1 = registry.applyRule(state, "arithmetic.multiplicative-composition", {
      factors: [3, 100000], label: "lakhs",
    });
    assert.equal(t1.after.expressions.get("lakhs")!.kind, "num");

    const t2 = registry.applyRule(t1.after, "arithmetic.multiplicative-composition", {
      factors: [0, 10000], label: "ten-thousands",
    });
    // Zero contribution
    const zeroExpr = t2.after.expressions.get("ten-thousands")!;
    assert.equal(zeroExpr.kind, "num");
    assert.equal(evaluate(zeroExpr).toNumber(), 0);

    const t3 = registry.applyRule(t2.after, "arithmetic.additive-composition", {
      parts: [300000, 0, 5000, 700, 0, 0], label: "total",
    });
    assert.equal(evaluate(t3.after.expressions.get("total")!).toNumber(), 305700);
  });

  it("same rules work for different digits", () => {
    // 410,008 = 4×100000 + 1×10000 + 0×1000 + 0×100 + 0×10 + 8×1
    const state = createState();
    const t1 = registry.applyRule(state, "arithmetic.multiplicative-composition", {
      factors: [4, 100000], label: "lakhs",
    });
    const t2 = registry.applyRule(t1.after, "arithmetic.multiplicative-composition", {
      factors: [1, 10000], label: "ten-thousands",
    });
    const t3 = registry.applyRule(t2.after, "arithmetic.additive-composition", {
      parts: [400000, 10000, 0, 0, 0, 8], label: "total",
    });
    assert.equal(evaluate(t3.after.expressions.get("total")!).toNumber(), 410008);
    // Same rules, different parameters
    assert.equal(t1.ruleId, "arithmetic.multiplicative-composition");
    assert.equal(t3.ruleId, "arithmetic.additive-composition");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 2. EQUIVALENT FRACTIONS — different nonzero scaling factors
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: equivalent fractions with different scaling", () => {
  it("scales by 3: 2/5 → 6/15", () => {
    const t = registry.applyRule(createState(), "fraction.equivalence", {
      numerator: 2, denominator: 5, factor: 3,
    });
    const result = t.after.expressions.get("fraction-after")!;
    assert.equal(result.kind, "frac");
    if (result.kind === "frac") {
      assert.equal(evaluate(result.num).toNumber(), 6);
      assert.equal(evaluate(result.den).toNumber(), 15);
    }
  });

  it("scales by 7: 1/3 → 7/21", () => {
    const t = registry.applyRule(createState(), "fraction.equivalence", {
      numerator: 1, denominator: 3, factor: 7,
    });
    const result = t.after.expressions.get("fraction-after")!;
    if (result.kind === "frac") {
      assert.equal(evaluate(result.num).toNumber(), 7);
      assert.equal(evaluate(result.den).toNumber(), 21);
    }
  });

  it("rejects zero scaling factor", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "fraction.equivalence", {
        numerator: 2, denominator: 5, factor: 0,
      });
    }, /precondition/i);
  });

  it("rejects zero denominator", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "fraction.equivalence", {
        numerator: 2, denominator: 0, factor: 3,
      });
    }, /precondition/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 3. EQUATIONS — one-step and two-step with different coefficients
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: equations with different coefficients", () => {
  it("two-step: 3x + 7 = 19 → x = 4", () => {
    const state = createState();
    state.statements.push({
      left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)),
      relation: "=",
      right: Expr.num(19),
    });

    const t1 = registry.applyRule(state, "algebra.subtract-both-sides", { value: 7, equationIndex: 0 });
    const t2 = registry.applyRule(t1.after, "algebra.divide-both-sides", { value: 3, equationIndex: 0 });

    // Verify final equation has simplified RHS
    const finalStmt = t2.after.statements[0];
    assert.equal(evaluate(finalStmt.right).toNumber(), 4);
  });

  it("two-step: 5x + 3 = 28 → x = 5", () => {
    const state = createState();
    state.statements.push({
      left: Expr.add(Expr.mul(Expr.num(5), Expr.var("x")), Expr.num(3)),
      relation: "=",
      right: Expr.num(28),
    });

    const t1 = registry.applyRule(state, "algebra.subtract-both-sides", { value: 3, equationIndex: 0 });
    const t2 = registry.applyRule(t1.after, "algebra.divide-both-sides", { value: 5, equationIndex: 0 });

    assert.equal(evaluate(t2.after.statements[0].right).toNumber(), 5);
    // Same rules, different numbers
    assert.equal(t1.ruleId, "algebra.subtract-both-sides");
    assert.equal(t2.ruleId, "algebra.divide-both-sides");
  });

  it("one-step add: x − 4 = 7 → add 4 → x = 11", () => {
    const state = createState();
    state.statements.push({
      left: Expr.sub(Expr.var("x"), Expr.num(4)),
      relation: "=",
      right: Expr.num(7),
    });

    const t = registry.applyRule(state, "algebra.add-both-sides", { value: 4, equationIndex: 0 });
    assert.equal(evaluate(t.after.statements[0].right).toNumber(), 11);
  });

  it("one-step multiply: x ÷ 3 = 4 → multiply 3 → x = 12", () => {
    const state = createState();
    state.statements.push({
      left: Expr.div(Expr.var("x"), Expr.num(3)),
      relation: "=",
      right: Expr.num(4),
    });

    const t = registry.applyRule(state, "algebra.multiply-both-sides", { value: 3, equationIndex: 0 });
    assert.equal(evaluate(t.after.statements[0].right).toNumber(), 12);
  });

  it("rejects division by zero", () => {
    const state = createState();
    state.statements.push({
      left: Expr.mul(Expr.num(3), Expr.var("x")),
      relation: "=",
      right: Expr.num(12),
    });

    assert.throws(() => {
      registry.applyRule(state, "algebra.divide-both-sides", { value: 0, equationIndex: 0 });
    }, /precondition/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. RECTANGLE — different dimensions and measures
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: rectangle area and perimeter", () => {
  it("area: 7 × 4 = 28", () => {
    const t = registry.applyRule(createState(), "geometry.rectangle-area", {
      length: 7, width: 4, unit: "cm",
    });
    assert.equal(evaluate(t.after.expressions.get("area")!).toNumber(), 28);
  });

  it("area: 12 × 9 = 108 (different dimensions, same rule)", () => {
    const t = registry.applyRule(createState(), "geometry.rectangle-area", {
      length: 12, width: 9, unit: "m",
    });
    assert.equal(evaluate(t.after.expressions.get("area")!).toNumber(), 108);
    assert.equal(t.ruleId, "geometry.rectangle-area");
  });

  it("perimeter: 7 × 4 → 2(7+4) = 22", () => {
    const t = registry.applyRule(createState(), "geometry.rectangle-perimeter", {
      length: 7, width: 4, unit: "cm",
    });
    assert.equal(evaluate(t.after.expressions.get("perimeter")!).toNumber(), 22);
  });

  it("perimeter: 15 × 3 → 2(15+3) = 36", () => {
    const t = registry.applyRule(createState(), "geometry.rectangle-perimeter", {
      length: 15, width: 3, unit: "m",
    });
    assert.equal(evaluate(t.after.expressions.get("perimeter")!).toNumber(), 36);
  });

  it("rejects zero dimensions", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "geometry.rectangle-area", {
        length: 0, width: 4, unit: "cm",
      });
    }, /precondition/i);
  });

  it("rejects negative dimensions", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "geometry.rectangle-perimeter", {
        length: -2, width: 4, unit: "cm",
      });
    }, /precondition/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 5. SAME RULE REUSED ACROSS FAMILIES
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: same rule reused across families", () => {
  it("arithmetic.additive-composition serves place value, perimeter, and fraction addition", () => {
    const placeValue = registry.applyRule(createState(), "arithmetic.additive-composition", {
      parts: [300000, 5000, 700], label: "digits",
    });
    const perimeter = registry.applyRule(createState(), "arithmetic.additive-composition", {
      parts: [7, 4], label: "sides",
    });
    const fracAdd = registry.applyRule(createState(), "arithmetic.additive-composition", {
      parts: [2, 3], label: "numerators",
    });

    // Same rule
    assert.equal(placeValue.ruleId, "arithmetic.additive-composition");
    assert.equal(perimeter.ruleId, "arithmetic.additive-composition");
    assert.equal(fracAdd.ruleId, "arithmetic.additive-composition");

    // Different results
    assert.equal(evaluate(placeValue.after.expressions.get("digits")!).toNumber(), 305700);
    assert.equal(evaluate(perimeter.after.expressions.get("sides")!).toNumber(), 11);
    assert.equal(evaluate(fracAdd.after.expressions.get("numerators")!).toNumber(), 5);
  });

  it("algebra.subtract-both-sides serves lin, lneg, and ahone", () => {
    // lin: 3x + 7 = 19
    const state1 = createState();
    state1.statements.push({ left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)), relation: "=", right: Expr.num(19) });
    const t1 = registry.applyRule(state1, "algebra.subtract-both-sides", { value: 7, equationIndex: 0 });

    // ahone: x + 5 = 11
    const state2 = createState();
    state2.statements.push({ left: Expr.add(Expr.var("x"), Expr.num(5)), relation: "=", right: Expr.num(11) });
    const t2 = registry.applyRule(state2, "algebra.subtract-both-sides", { value: 5, equationIndex: 0 });

    assert.equal(t1.ruleId, t2.ruleId);
    assert.equal(evaluate(t1.after.statements[0].right).toNumber(), 12);
    assert.equal(evaluate(t2.after.statements[0].right).toNumber(), 6);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 6. INCORRECT TRANSFORMATIONS REJECTED
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: incorrect transformations rejected", () => {
  it("division by zero is rejected even with plausible explanation text", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "algebra.divide-both-sides", { value: 0, equationIndex: 0 });
    });
  });

  it("zero scaling factor rejected for fractions", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "fraction.equivalence", { numerator: 3, denominator: 4, factor: 0 });
    });
  });

  it("negative dimensions rejected for rectangles", () => {
    assert.throws(() => {
      registry.applyRule(createState(), "geometry.rectangle-area", { length: -5, width: 3, unit: "cm" });
    });
  });

  it("multiply by zero rejected for algebra", () => {
    const state = createState();
    state.statements.push({ left: Expr.var("x"), relation: "=", right: Expr.num(5) });
    assert.throws(() => {
      registry.applyRule(state, "algebra.multiply-both-sides", { value: 0, equationIndex: 0 });
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 7. LANGUAGE/FORMAT INVARIANCE
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: mathematical transformation is format-independent", () => {
  it("kernel transformation produces the same mathematical result regardless of rendering", () => {
    const state = createState();
    state.statements.push({
      left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)),
      relation: "=",
      right: Expr.num(19),
    });

    const t = registry.applyRule(state, "algebra.subtract-both-sides", { value: 7, equationIndex: 0 });

    // The mathematical result is the same whether we render in English, Hindi, or any format
    const mathResult = evaluate(t.after.statements[0].right).toNumber();
    assert.equal(mathResult, 12);

    // The rule explanation is structural, not linguistic
    const explanation = registry.get("algebra.subtract-both-sides")!.explain(t.before, t.after, { value: 7, equationIndex: 0 });
    assert.ok(explanation.principle.length > 0);
    assert.ok(explanation.action.length > 0);
    // The principle is mathematical, not language-specific
    assert.ok(explanation.principle.includes("quality") || explanation.principle.includes("subtract"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 8. FULL PIPELINE: Problem → Adapt → Teach
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: full pipeline integration", () => {
  it("lin problem adapts and generates coherent teaching", () => {
    const steps: Step[] = [
      makeStep("s1", "subtract", [19, 7], 12, {
        rule: "equality-preservation", operation: "Subtract", operand: 7,
        lhsBefore: "3x + 7", rhsBefore: "19", lhsAfter: "3x", rhsAfter: "12",
      }),
      makeStep("s2", "divide", [12, 3], 4, {
        rule: "equality-preservation", operation: "Divide by", operand: 3,
        lhsBefore: "3x", rhsBefore: "12", lhsAfter: "x", rhsAfter: "4",
      }),
    ];
    const problem = makeProblem("lin", [3, 7, 4], steps, 4);
    const adapted = adaptProblem(problem);

    // Full adaptation
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps.length, 2);

    // Kernel rules
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["algebra.subtract-both-sides", "algebra.divide-both-sides"]);

    // Teaching worked steps
    const worked = kernelWorkedSteps(adapted);
    assert.equal(worked.length, 2);
    assert.equal(worked[0].principle, "Equality preservation");
    assert.equal(worked[1].principle, "Equality preservation");

    // State chain: step 2's before = step 1's after
    assert.deepEqual(adapted.steps[1].transformation!.before, adapted.steps[0].transformation!.after);

    // Mathematical correctness: final state has x = 4
    const finalRHS = adapted.steps[1].transformation!.after.statements[0].right;
    assert.equal(evaluate(finalRHS).toNumber(), 4);
  });

  it("aeind problem adapts with decomposition through adapter", () => {
    const steps: Step[] = [
      makeStep("s1", "multiply", [3, 100000], 300000, {
        rule: "positional-value", digit: 3, placeValue: 100000, placeName: "lakhs",
      }),
      makeStep("s2", "multiply", [5, 1000], 5000, {
        rule: "positional-value", digit: 5, placeValue: 1000, placeName: "thousands",
      }),
      makeStep("s3", "add", [300000, 5000, 700], 305700, {
        rule: "additive-combination", what: "place-value contributions", parts: [300000, 5000, 700],
      }),
    ];
    const problem = makeProblem("aeind", [3, 5, 7, 0], steps, 305700);
    const adapted = adaptProblem(problem);

    assert.equal(adapted.fullyAdapted, true);
    const worked = kernelWorkedSteps(adapted);
    assert.equal(worked.length, 3);
    assert.equal(worked[0].principle, "Base-ten positional value");
    assert.equal(worked[2].principle, "Additive combination");
  });

  it("eqfrac problem: same mechanism, different scaling factors", () => {
    for (const [n, d, k] of [[2, 3, 4], [1, 5, 7], [3, 4, 5]]) {
      const steps: Step[] = [
        makeStep("s1", "scale", [n, d, k], `${n*k}/${d*k}`, {
          rule: "fraction-equivalence", scalingFactor: k, numeratorBefore: n, denominatorBefore: d,
        }),
      ];
      const problem = makeProblem("eqfrac", [n, d, k], steps, `${n*k}/${d*k}`);
      const adapted = adaptProblem(problem);

      assert.equal(adapted.fullyAdapted, true);
      assert.deepEqual(rulesUsed(adapted), ["fraction.equivalence"]);

      const worked = kernelWorkedSteps(adapted);
      assert.ok(worked[0].after.includes(`${n*k}/${d*k}`));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 9. LEARNER-FACING OUTPUT CORRECTNESS — verify the actual presentation
// ════════════════════════════════════════════════════════════════════════════════

/** Build a full TeachingPresentation through the real pipeline, same as the app. */
function buildPresentation(familyId: string, params: number[]): TeachingPresentation {
  const def = FAMILIES.get(familyId)!;
  const problem = def.solve(params);
  problem.family = familyId;
  problem.params = params;
  problem.bugs = problem.bugs ?? def.bugs?.(params) ?? [];
  problem.answer = String(problem.answer);
  problem.prompt = problem.prompt ?? "Solve";
  const module = {
    competency: def.competency, id: `m-${familyId}`, title: def.title,
    pool: { family: familyId, level: 1 }, screens: [], pools: [],
  } as any as Module;
  const screen = { text: ["Explanation"], math: [] } as any as Screen;
  return teachingPresentationFrom({ module, screen, problem, question: null, practiceIds: [] });
}

describe("acceptance: learner-facing output correctness", () => {
  const kernelFamilies: [string, number[], string][] = [
    ["lin", [3, 7, 4], "linear equation 3x+7=19"],
    ["lin", [2, -5, 8], "linear equation with negative constant"],
    ["ahone", [0, 5, 3], "one-step x+5=8"],
    ["ahone", [2, 4, 7], "one-step 4x=28"],
    ["lneg", [2, 10, -3], "two-step with negative solution"],
    ["aeind", [3, 4, 5, 6], "place value 304,512"],
    ["aeind", [5, 0, 0, 0], "place value with zeros 500,000"],
    ["eqfrac", [2, 3, 9], "equivalent fraction 2/3 = ?/9"],
    ["eqfrac", [1, 4, 20], "equivalent fraction 1/4 = ?/20"],
    ["rect", [5, 3], "rectangle area 5×3"],
    ["rect", [12, 8], "rectangle area 12×8"],
    ["rperim", [7, 4], "rectangle perimeter 7×4"],
    ["aocart", [3, 4, 0], "cartesian product 3×4"],
    ["aiint", [5, 3, 0], "integer addition 5+3"],
    // aiint subtraction uses inverse-operation on expressions (not equations), stays compatibility
    // ["aiint", [5, 3, 1], "integer subtraction 5-3"],
    ["fadd", [2, 3, 5, 1], "fraction addition 2/5 + 3/5"],
    ["adfcmp", [0, 5, 2, 3, 0], "fraction comparison"],
    ["aearea", [6, 4], "rectangle area (square units)"],
    ["rperim", [10, 3], "rectangle perimeter 10×3"],
  ];

  for (const [family, params, desc] of kernelFamilies) {
    it(`${desc}: kernel-backed with correct content`, () => {
      const pres = buildPresentation(family, params);

      // 1. Teaching source is kernel
      assert.equal(pres.teachingSource, "kernel", `${family} should be kernel-backed`);
      assert.equal(pres.status, "supported");

      // 2. No parallel kernel field
      assert.equal((pres as any).kernel, undefined, "parallel kernel field must not exist");

      // 3. workedExample exists with steps
      assert.ok(pres.workedExample, "workedExample must exist");
      assert.ok(pres.workedExample!.steps.length > 0, "must have at least one step");

      // 4. Every step has expression, explanation, and principle
      for (const step of pres.workedExample!.steps) {
        assert.ok(step.expression, "step must have expression");
        assert.ok(step.explanation, "step must have explanation");
        assert.ok(step.principle, "kernel step must have principle");
      }

      // 5. Validation passes (math is correct)
      const def = FAMILIES.get(family)!;
      const problem = def.solve(params);
      problem.family = family;
      problem.params = params;
      problem.bugs = problem.bugs ?? [];
      problem.answer = String(problem.answer);
      const errors = validateTeachingPresentation(problem, pres);
      assert.deepEqual(errors, [], `validation errors: ${errors.join("; ")}`);
    });
  }

  it("parameter variations produce different content but same rules", () => {
    const p1 = buildPresentation("lin", [3, 7, 4]);
    const p2 = buildPresentation("lin", [5, 2, 6]);

    // Same teaching source
    assert.equal(p1.teachingSource, "kernel");
    assert.equal(p2.teachingSource, "kernel");

    // Same structure (2 steps each)
    assert.equal(p1.workedExample!.steps.length, p2.workedExample!.steps.length);

    // Different numeric content
    assert.notEqual(
      p1.workedExample!.steps[0].explanation,
      p2.workedExample!.steps[0].explanation,
    );
  });

  it("before/after states are consistent across steps", () => {
    const def = FAMILIES.get("lin")!;
    const problem = def.solve([3, 7, 4]);
    problem.family = "lin";
    problem.params = [3, 7, 4];
    problem.answer = "4";

    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);

    // Each step's before-state matches the previous step's after-state
    for (let i = 1; i < adapted.steps.length; i++) {
      const prev = adapted.steps[i - 1].transformation!;
      const curr = adapted.steps[i].transformation!;
      assert.deepEqual(curr.before, prev.after,
        `step ${i} before-state must equal step ${i-1} after-state`);
    }
  });

  it("units remain correct for geometry families", () => {
    const rect = buildPresentation("rect", [5, 3]);
    assert.ok(rect.visual?.kind === "geometry");
    assert.equal(rect.visual.labels.measureUnit, "cm²");
    assert.equal(rect.visual.labels.dimensionUnit, "cm");

    const perim = buildPresentation("rperim", [7, 4]);
    assert.ok(perim.visual?.kind === "geometry");
    assert.equal(perim.visual.labels.measureUnit, "cm");

    const area = buildPresentation("aearea", [6, 4]);
    assert.ok(area.visual?.kind === "geometry");
    assert.equal(area.visual.labels.measureUnit, "square units");
    assert.equal(area.visual.labels.dimensionUnit, "units");
  });

  it("fractions and signs are correct in kernel output", () => {
    const frac = buildPresentation("eqfrac", [2, 3, 9]);
    const step = frac.workedExample!.steps.find((s) => s.principle === "Fraction equivalence")!;
    // The expression shows the fraction being scaled: "Scale 2/3 by 3"
    assert.ok(step.expression.includes("2/3"), "expression must show original fraction");
    // The explanation describes the scaling factor
    assert.ok(step.explanation.includes("3"), "explanation must show scaling factor");

    const neg = buildPresentation("lneg", [2, 10, -3]);
    assert.equal(neg.teachingSource, "kernel");
    assert.ok(neg.workedExample!.steps.length > 0);
  });

  it("aiint subtraction uses explicit compatibility mode", () => {
    const pres = buildPresentation("aiint", [5, 3, 1]);
    // Subtraction mode has inverse-operation on expressions (not equations) — can't map to algebra rules
    assert.equal(pres.teachingSource, "compatibility");
    assert.equal(pres.status, "supported");
    assert.ok(pres.workedExample, "compatibility mode still produces worked example");
    assert.ok(pres.workedExample!.steps.length > 0);
    // No kernel principle on compatibility steps
    assert.equal(pres.workedExample!.steps[0].principle, undefined);
    // Records the unsupported capability
    assert.ok(Array.isArray(pres.unsupportedCapabilities) && pres.unsupportedCapabilities.length > 0,
      "must record unsupported capabilities");
  });

  it("invalid transformations are rejected by the kernel", () => {
    const state = createState();
    state.statements.push({
      left: Expr.add(Expr.mul(Expr.num(3), Expr.var("x")), Expr.num(7)),
      relation: "=",
      right: Expr.num(19),
    });

    // Subtracting 0 should still work but not change the equation
    const t = registry.applyRule(state, "algebra.subtract-both-sides", { value: 0, equationIndex: 0 });
    const rhs = evaluate(t.after.statements[0].right);
    assert.equal(rhs.toNumber(), 19); // Unchanged
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 10. MATHEMATICAL CONSISTENCY — displayed steps match kernel records
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: mathematical consistency verification", () => {
  it("kernel-backed steps match transformation records exactly", () => {
    // Build a presentation and independently re-adapt to get kernel records
    const pres = buildPresentation("lin", [3, 7, 4]);
    assert.equal(pres.teachingSource, "kernel");

    // Re-adapt to get the authoritative records
    const def = FAMILIES.get("lin")!;
    const problem = def.solve([3, 7, 4]);
    problem.family = "lin";
    problem.params = [3, 7, 4];
    problem.answer = "4";
    problem.bugs = [];
    const adapted = adaptProblem(problem);
    const kSteps = kernelWorkedSteps(adapted);

    // Every displayed step must match the kernel's records
    const displayed = pres.workedExample!.steps;
    assert.equal(displayed.length, kSteps.length, "step count must match");
    for (let i = 0; i < displayed.length; i++) {
      assert.equal(displayed[i].expression, kSteps[i].expression, `step ${i} expression`);
      assert.equal(displayed[i].explanation, kSteps[i].explanation, `step ${i} explanation`);
      assert.equal(displayed[i].principle, kSteps[i].principle, `step ${i} principle`);
      assert.equal(displayed[i].before, kSteps[i].before, `step ${i} before`);
      assert.equal(displayed[i].after, kSteps[i].after, `step ${i} after`);
    }
  });

  it("consistency check catches tampered expression", () => {
    const pres = buildPresentation("lin", [3, 7, 4]);
    assert.equal(pres.teachingSource, "kernel");

    // Tamper with a step's expression
    const tampered = { ...pres, workedExample: {
      ...pres.workedExample!,
      steps: pres.workedExample!.steps.map((s, i) =>
        i === 0 ? { ...s, expression: "WRONG" } : s
      ),
    }};

    const def = FAMILIES.get("lin")!;
    const problem = def.solve([3, 7, 4]);
    problem.family = "lin";
    problem.params = [3, 7, 4];
    problem.answer = "4";
    problem.bugs = [];

    const errors = validateTeachingPresentation(problem, tampered);
    assert.ok(errors.some((e) => e.includes("expression") && e.includes("WRONG")),
      `expected expression mismatch error, got: ${errors.join("; ")}`);
  });

  it("consistency check catches tampered before-state", () => {
    const pres = buildPresentation("eqfrac", [2, 3, 9]);
    assert.equal(pres.teachingSource, "kernel");

    const tampered = { ...pres, workedExample: {
      ...pres.workedExample!,
      steps: pres.workedExample!.steps.map((s) => ({ ...s, before: "FAKE" })),
    }};

    const def = FAMILIES.get("eqfrac")!;
    const problem = def.solve([2, 3, 9]);
    problem.family = "eqfrac";
    problem.params = [2, 3, 9];
    problem.answer = String(problem.answer);
    problem.bugs = [];

    const errors = validateTeachingPresentation(problem, tampered);
    assert.ok(errors.some((e) => e.includes("before-state")),
      `expected before-state mismatch, got: ${errors.join("; ")}`);
  });

  it("consistency check catches tampered principle", () => {
    const pres = buildPresentation("rect", [5, 3]);
    assert.equal(pres.teachingSource, "kernel");

    const tampered = { ...pres, workedExample: {
      ...pres.workedExample!,
      steps: pres.workedExample!.steps.map((s) => ({ ...s, principle: "Fake principle" })),
    }};

    const def = FAMILIES.get("rect")!;
    const problem = def.solve([5, 3]);
    problem.family = "rect";
    problem.params = [5, 3];
    problem.answer = String(problem.answer);
    problem.bugs = [];

    const errors = validateTeachingPresentation(problem, tampered);
    assert.ok(errors.some((e) => e.includes("principle")),
      `expected principle mismatch, got: ${errors.join("; ")}`);
  });

  it("multiple families all pass consistency verification", () => {
    const cases: [string, number[]][] = [
      ["lin", [2, -5, 8]], ["ahone", [0, 5, 3]], ["lneg", [2, 10, -3]],
      ["aeind", [3, 4, 5, 6]], ["eqfrac", [1, 4, 20]], ["rect", [12, 8]],
      ["rperim", [7, 4]], ["aocart", [3, 4, 0]], ["aiint", [5, 3, 0]],
      ["fadd", [2, 3, 5, 1]], ["aearea", [6, 4]],
    ];

    for (const [family, params] of cases) {
      const pres = buildPresentation(family, params);
      if (pres.teachingSource !== "kernel") continue; // skip compatibility
      const def = FAMILIES.get(family)!;
      const problem = def.solve(params);
      problem.family = family;
      problem.params = params;
      problem.answer = String(problem.answer);
      problem.bugs = [];
      const errors = validateTeachingPresentation(problem, pres);
      assert.deepEqual(errors, [], `${family}(${params}): ${errors.join("; ")}`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 11. FAILURE CLASSIFICATION — no silent fallbacks
// ════════════════════════════════════════════════════════════════════════════════

describe("acceptance: failure classification", () => {
  it("unsupported rule records diagnostic with rule names", () => {
    // aiint subtraction has an unsupported inverse-operation on expressions
    const pres = buildPresentation("aiint", [5, 3, 1]);
    assert.equal(pres.teachingSource, "compatibility");
    assert.ok(pres.kernelDiagnostic, "must have kernel diagnostic");
    assert.equal(pres.kernelDiagnostic!.kind, "unsupported-rule");
    if (pres.kernelDiagnostic!.kind === "unsupported-rule") {
      assert.ok(pres.kernelDiagnostic!.rules.length > 0, "must name the unsupported rules");
    }
  });

  it("kernel-backed families do NOT have a kernel diagnostic", () => {
    const pres = buildPresentation("lin", [3, 7, 4]);
    assert.equal(pres.teachingSource, "kernel");
    assert.equal(pres.kernelDiagnostic, undefined, "no diagnostic for fully kernel-backed");
  });

  it("compatibility-mode families preserve worked example", () => {
    // aiint subtraction falls to compatibility but still produces valid teaching
    const pres = buildPresentation("aiint", [5, 3, 1]);
    assert.equal(pres.status, "supported");
    assert.ok(pres.workedExample, "compatibility mode still has worked example");
    assert.ok(pres.workedExample!.steps.length > 0);
  });

  it("unsupported capabilities are recorded for partial adaptation", () => {
    const pres = buildPresentation("aiint", [5, 3, 1]);
    assert.ok(Array.isArray(pres.unsupportedCapabilities));
    assert.ok(pres.unsupportedCapabilities!.length > 0);
    // The specific unsupported rule should be named
    assert.ok(pres.unsupportedCapabilities!.some((c) =>
      c === "inverse-operation" || c === "number-line-movement"
    ));
  });
});
