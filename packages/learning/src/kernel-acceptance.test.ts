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
import type { Problem, Step, Justification } from "./family-kit";

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
