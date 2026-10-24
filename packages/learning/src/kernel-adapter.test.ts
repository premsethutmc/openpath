import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  adaptProblem,
  kernelWorkedSteps,
  rulesUsed,
  type AdaptedProblem,
} from "./kernel-adapter";
import type { Problem, Step, Justification } from "./family-kit";

// ── Helpers ──

function makeProblem(
  family: string,
  params: number[],
  steps: Step[],
  answer: number | string = 0,
): Problem {
  return {
    family,
    id: `${family}:${params.join(",")}`,
    params,
    competency: `test.${family}`,
    skill: `test.${family}`,
    form: "typed",
    steps,
    answer,
    bugs: [],
    figure: null,
  } as Problem;
}

function makeStep(
  id: string,
  op: string,
  inputs: (number | string)[],
  value: number | string,
  justification?: Justification,
): Step {
  return { id, op, competency: "test", inputs, value, justification };
}

// ════════════════════════════════════════════════════════════════════════════════
// LINEAR EQUATION (lin family): 3x + 7 = 19
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: lin (linear equation)", () => {
  const steps: Step[] = [
    makeStep("s1", "subtract", [19, 7], 12, {
      rule: "equality-preservation",
      operation: "Subtract",
      operand: 7,
      lhsBefore: "3x + 7",
      rhsBefore: "19",
      lhsAfter: "3x",
      rhsAfter: "12",
    }),
    makeStep("s2", "divide", [12, 3], 4, {
      rule: "equality-preservation",
      operation: "Divide by",
      operand: 3,
      lhsBefore: "3x",
      rhsBefore: "12",
      lhsAfter: "x",
      rhsAfter: "4",
    }),
  ];

  const problem = makeProblem("lin", [3, 7, 4], steps, 4);

  it("adapts both steps", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps.length, 2);
    assert.equal(adapted.steps[0].adapted, true);
    assert.equal(adapted.steps[1].adapted, true);
  });

  it("uses algebra rules", () => {
    const adapted = adaptProblem(problem);
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["algebra.subtract-both-sides", "algebra.divide-both-sides"]);
  });

  it("generates kernel transformations with before/after states", () => {
    const adapted = adaptProblem(problem);
    const t1 = adapted.steps[0].transformation!;
    assert.ok(t1.before);
    assert.ok(t1.after);
    assert.equal(t1.ruleId, "algebra.subtract-both-sides");
    assert.ok(t1.evidence);
  });

  it("chains states correctly", () => {
    const adapted = adaptProblem(problem);
    const t1 = adapted.steps[0].transformation!;
    const t2 = adapted.steps[1].transformation!;
    // Second step's before should be first step's after
    assert.deepEqual(t2.before, t1.after);
  });

  it("generates worked steps for teaching", () => {
    const adapted = adaptProblem(problem);
    const worked = kernelWorkedSteps(adapted);
    assert.equal(worked.length, 2);
    assert.ok(worked[0].expression.includes("Subtract"));
    assert.ok(worked[0].principle === "Equality preservation");
    assert.ok(worked[1].expression.includes("Divide"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ONE-STEP EQUATION (ahone family): 5x = 30
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: ahone (one-step equation)", () => {
  // op=0 → 5x = 30
  const steps: Step[] = [
    makeStep("s1", "divide", [30, 5], 6, {
      rule: "inverse-operation",
      undoing: "multiplication by 5",
      applying: "divide by",
      operand: 5,
    }),
  ];

  const problem = makeProblem("ahone", [0, 5, 6], steps, 6);

  it("adapts inverse-operation to algebra rule", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["algebra.divide-both-sides"]);
  });

  it("generates explanation with inverse reasoning", () => {
    const adapted = adaptProblem(problem);
    const worked = kernelWorkedSteps(adapted);
    assert.equal(worked.length, 1);
    assert.ok(worked[0].principle === "Inverse operation");
    assert.ok(worked[0].explanation.includes("undoes"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PLACE VALUE (aeind family)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: aeind (place value)", () => {
  const steps: Step[] = [
    makeStep("s1", "multiply", [3, 100000], 300000, {
      rule: "positional-value",
      digit: 3,
      placeValue: 100000,
      placeName: "lakhs",
    }),
    makeStep("s2", "multiply", [5, 1000], 5000, {
      rule: "positional-value",
      digit: 5,
      placeValue: 1000,
      placeName: "thousands",
    }),
    makeStep("s3", "add", [300000, 5000, 700], 305700, {
      rule: "additive-combination",
      what: "place-value contributions",
      parts: [300000, 5000, 700],
    }),
  ];

  const problem = makeProblem("aeind", [3, 5, 7, 0], steps, 305700);

  it("adapts positional-value and additive-combination", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const rules = rulesUsed(adapted);
    assert.ok(rules.includes("arithmetic.multiplicative-composition"));
    assert.ok(rules.includes("arithmetic.additive-composition"));
  });

  it("generates explanations with place names", () => {
    const adapted = adaptProblem(problem);
    const worked = kernelWorkedSteps(adapted);
    assert.ok(worked[0].explanation.includes("lakhs"));
    assert.ok(worked[1].explanation.includes("thousands"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// EQUIVALENT FRACTIONS (eqfrac family)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: eqfrac (equivalent fractions)", () => {
  const steps: Step[] = [
    makeStep("s1", "scale", [3, 4, 5], "15/20", {
      rule: "fraction-equivalence",
      scalingFactor: 5,
      numeratorBefore: 3,
      denominatorBefore: 4,
    }),
  ];

  const problem = makeProblem("eqfrac", [3, 4, 5], steps, "15/20");

  it("adapts fraction-equivalence to kernel rule", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["fraction.equivalence"]);
  });

  it("generates worked step showing scaling", () => {
    const adapted = adaptProblem(problem);
    const worked = kernelWorkedSteps(adapted);
    assert.equal(worked.length, 1);
    assert.ok(worked[0].explanation.includes("5"));
    assert.ok(worked[0].after.includes("15/20"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// RECTANGLE AREA (rect family)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: rect (rectangle area)", () => {
  const steps: Step[] = [
    makeStep("s1", "multiply", [7, 4], 28, {
      rule: "unit-coverage",
      rows: 7,
      columns: 4,
      unit: "square cm",
    }),
  ];

  const problem = makeProblem("rect", [7, 4], steps, 28);

  it("adapts unit-coverage to geometry.rectangle-area", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["geometry.rectangle-area"]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// FRACTION COMPARISON (adfcmp family)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: comparison", () => {
  const steps: Step[] = [
    makeStep("s1", "compare", [3, 5], "<", {
      rule: "comparison",
      left: 3,
      right: 5,
      relation: "<",
    }),
  ];

  const problem = makeProblem("adfcmp", [3, 7, 5, 7], steps, "<");

  it("adapts comparison to kernel rule", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["comparison.ordering"]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// LIKE-DENOMINATION (fraction addition)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: like-denomination", () => {
  const steps: Step[] = [
    makeStep("s1", "add-numerators", [2, 3], 5, {
      rule: "like-denomination",
      operation: "add",
      numeratorA: 2,
      numeratorB: 3,
      denominator: 7,
    }),
  ];

  const problem = makeProblem("fadd", [2, 7, 3, 7], steps, "5/7");

  it("adapts like-denomination to additive composition", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const worked = kernelWorkedSteps(adapted);
    assert.ok(worked[0].explanation.includes("denominator"));
    assert.ok(worked[0].after.includes("5/7"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// NUMBER LINE MOVEMENT (aiint family)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: number-line-movement", () => {
  const steps: Step[] = [
    makeStep("s1", "move", [3, 5], 8, {
      rule: "number-line-movement",
      start: 3,
      direction: "right",
      distance: 5,
    }),
  ];

  const problem = makeProblem("aiint", [3, 5], steps, 8);

  it("adapts number-line-movement to additive composition", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const worked = kernelWorkedSteps(adapted);
    assert.ok(worked[0].explanation.includes("right"));
    assert.ok(worked[0].after === "8");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SCALING, QUOTIENT, ARITHMETIC-FACT, PRODUCT-COUNTING
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: scaling", () => {
  const steps: Step[] = [
    makeStep("s1", "double", [15], 30, {
      rule: "scaling",
      factor: 2,
      what: "half-perimeter",
    }),
  ];

  const problem = makeProblem("rperim", [7, 8], steps, 30);

  it("adapts scaling to multiplicative composition", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    const rules = rulesUsed(adapted);
    assert.deepEqual(rules, ["arithmetic.multiplicative-composition"]);
  });
});

describe("kernel-adapter: quotient", () => {
  const steps: Step[] = [
    makeStep("s1", "divide", [20, 4], 5, {
      rule: "quotient",
      dividend: 20,
      divisor: 4,
      purpose: "finding the scaling factor",
    }),
  ];

  const problem = makeProblem("eqfrac", [3, 4, 5], steps, 5);

  it("adapts quotient to arithmetic.evaluate", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].transformation!.ruleId, "arithmetic.evaluate");
  });
});

describe("kernel-adapter: arithmetic-fact", () => {
  const steps: Step[] = [
    makeStep("s1", "compute", [7, 4], 28, {
      rule: "arithmetic-fact",
      operation: "7 × 4",
      supports: "area calculation",
    }),
  ];

  const problem = makeProblem("rect", [7, 4], steps, 28);

  it("adapts arithmetic-fact to arithmetic.evaluate", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].transformation!.ruleId, "arithmetic.evaluate");
  });
});

describe("kernel-adapter: product-counting", () => {
  const steps: Step[] = [
    makeStep("s1", "count", [3, 4], 12, {
      rule: "product-counting",
      what: "Cartesian product positions",
      factors: [3, 4],
    }),
  ];

  const problem = makeProblem("aocart", [3, 4], steps, 12);

  it("adapts product-counting to multiplicative composition", () => {
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].transformation!.ruleId, "arithmetic.multiplicative-composition");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// FALLBACK: steps without justification
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: fallback for unjustified steps", () => {
  it("adapts unjustified steps via op mapping when op is recognized", () => {
    const steps: Step[] = [
      makeStep("s1", "add", [3, 4], 7),
    ];
    const problem = makeProblem("unknown", [3, 4], steps, 7);
    const adapted = adaptProblem(problem);
    // Op "add" maps to arithmetic.additive-composition — verified: 3+4=7
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].adapted, true);
    assert.ok(adapted.steps[0].transformation !== null);
    assert.equal(adapted.steps[0].transformation!.ruleId, "arithmetic.additive-composition");
    assert.equal(adapted.steps[0].explanation!.principle, "Addition: combining quantities");
  });

  it("falls back for unrecognized op values", () => {
    const steps: Step[] = [
      makeStep("s1", "find the shelf", ["top"], "A"),
    ];
    const problem = makeProblem("unknown", [1, 2], steps, "A");
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false);
    assert.equal(adapted.steps[0].adapted, false);
    assert.equal(adapted.steps[0].transformation, null);
  });

  it("rejects wrong arithmetic — multiply(3, 4) = 15 must NOT be kernel-backed", () => {
    // multiply(3, 4) = 15 — strict arithmetic says 3×4=12≠15
    // There is NO graceful degradation. Wrong math = not adapted.
    const steps: Step[] = [
      makeStep("s1", "multiply", [3, 4], 15),
    ];
    const problem = makeProblem("unknown", [3, 4], steps, 15);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false);
    assert.equal(adapted.steps[0].adapted, false);
    assert.equal(adapted.steps[0].transformation, null);
  });

  it("generates explanation for op-adapted steps", () => {
    const steps: Step[] = [
      makeStep("s1", "multiply", [5, 3], 15),
    ];
    const problem = makeProblem("unknown", [5, 3], steps, 15);
    const adapted = adaptProblem(problem);
    assert.ok(adapted.steps[0].explanation !== null);
    assert.ok(adapted.steps[0].explanation!.action.includes("multiply"));
    assert.ok(adapted.steps[0].explanation!.principle.includes("Multiplication"));
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// CROSS-FAMILY RULE REUSE
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: rule reuse across families", () => {
  it("same additive-composition rule for place value and perimeter", () => {
    const placeValueProblem = makeProblem("aeind", [3, 5, 7, 0], [
      makeStep("s1", "add", [300000, 5000, 700], 305700, {
        rule: "additive-combination",
        what: "place-value contributions",
        parts: [300000, 5000, 700],
      }),
    ], 305700);

    const perimeterProblem = makeProblem("rperim", [7, 4], [
      makeStep("s1", "add", [7, 4], 11, {
        rule: "additive-combination",
        what: "adjacent sides",
        parts: [7, 4],
      }),
    ], 22);

    const pv = adaptProblem(placeValueProblem);
    const pr = adaptProblem(perimeterProblem);

    // Both use the same kernel rule
    assert.equal(pv.steps[0].transformation!.ruleId, "arithmetic.additive-composition");
    assert.equal(pr.steps[0].transformation!.ruleId, "arithmetic.additive-composition");

    // But explanations differ
    assert.ok(pv.steps[0].explanation!.justification.includes("place-value"));
    assert.ok(pr.steps[0].explanation!.justification.includes("adjacent sides"));
  });

  it("same algebra.subtract-both-sides for lin and ahone", () => {
    const linProblem = makeProblem("lin", [3, 7, 4], [
      makeStep("s1", "subtract", [19, 7], 12, {
        rule: "equality-preservation",
        operation: "Subtract",
        operand: 7,
        lhsBefore: "3x + 7",
        rhsBefore: "19",
        lhsAfter: "3x",
        rhsAfter: "12",
      }),
    ], 4);

    const ahoneProblem = makeProblem("ahone", [1, 5, 6], [
      makeStep("s1", "subtract", [11, 5], 6, {
        rule: "equality-preservation",
        operation: "Subtract",
        operand: 5,
        lhsBefore: "x + 5",
        rhsBefore: "11",
        lhsAfter: "x",
        rhsAfter: "6",
      }),
    ], 6);

    const lin = adaptProblem(linProblem);
    const ahone = adaptProblem(ahoneProblem);

    assert.equal(lin.steps[0].transformation!.ruleId, "algebra.subtract-both-sides");
    assert.equal(ahone.steps[0].transformation!.ruleId, "algebra.subtract-both-sides");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// MULTI-STEP PROBLEM (full linear equation solve)
// ════════════════════════════════════════════════════════════════════════════════

describe("kernel-adapter: multi-step problem", () => {
  it("adapts full two-step linear equation with state chaining", () => {
    const steps: Step[] = [
      makeStep("s1", "subtract", [25, 5], 20, {
        rule: "equality-preservation",
        operation: "Subtract",
        operand: 5,
        lhsBefore: "4x + 5",
        rhsBefore: "25",
        lhsAfter: "4x",
        rhsAfter: "20",
      }),
      makeStep("s2", "divide", [20, 4], 5, {
        rule: "equality-preservation",
        operation: "Divide by",
        operand: 4,
        lhsBefore: "4x",
        rhsBefore: "20",
        lhsAfter: "x",
        rhsAfter: "5",
      }),
    ];

    const problem = makeProblem("lin", [4, 5, 5], steps, 5);
    const adapted = adaptProblem(problem);

    assert.equal(adapted.fullyAdapted, true);

    // State chaining: step 2's before = step 1's after
    assert.deepEqual(
      adapted.steps[1].transformation!.before,
      adapted.steps[0].transformation!.after,
    );

    // Worked steps flow through
    const worked = kernelWorkedSteps(adapted);
    assert.equal(worked.length, 2);
    assert.equal(worked[0].principle, "Equality preservation");
    assert.equal(worked[1].principle, "Equality preservation");
  });
});
