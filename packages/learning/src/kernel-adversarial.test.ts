/**
 * Adversarial tests for kernel adapter soundness.
 *
 * These tests verify that the kernel adapter CANNOT be tricked into
 * granting kernel-backed status to incorrect mathematics. Each test
 * constructs a scenario that would have passed under the old
 * trust-based fallback and verifies it now correctly fails.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { adaptProblem, parseNumeric, type AdaptedProblem } from "./kernel-adapter.js";
import type { Step, Problem } from "./family-kit";

// ════════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════════

function makeStep(id: string, op: string, inputs: any[], value: any, justification?: any): Step {
  return { id, op, competency: "test", inputs, value, justification } as Step;
}

function makeProblem(family: string, params: number[], steps: Step[], answer: any): Problem {
  return { family, params, steps, answer } as Problem;
}

function assertNotKernelBacked(adapted: AdaptedProblem, reason: string) {
  assert.equal(adapted.fullyAdapted, false, `Should NOT be kernel-backed: ${reason}`);
}

function assertAllStepsNotAdapted(adapted: AdaptedProblem, reason: string) {
  for (const step of adapted.steps) {
    assert.equal(step.adapted, false, `Step ${step.original.id} should NOT be adapted: ${reason}`);
    assert.equal(step.transformation, null, `Step ${step.original.id} should have no transformation: ${reason}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. Wrong arithmetic must NEVER be kernel-backed
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: wrong arithmetic", () => {
  it("multiply(3, 4) = 15 — wrong product", () => {
    const steps = [makeStep("s1", "multiply", [3, 4], 15)];
    const problem = makeProblem("test", [3, 4], steps, 15);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "3 × 4 ≠ 15");
    assertAllStepsNotAdapted(adapted, "3 × 4 ≠ 15");
  });

  it("add(7, 8) = 16 — wrong sum", () => {
    const steps = [makeStep("s1", "add", [7, 8], 16)];
    const problem = makeProblem("test", [7, 8], steps, 16);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "7 + 8 ≠ 16");
  });

  it("subtract(10, 3) = 8 — wrong difference", () => {
    const steps = [makeStep("s1", "subtract", [10, 3], 8)];
    const problem = makeProblem("test", [10, 3], steps, 8);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "10 − 3 ≠ 8");
  });

  it("divide(20, 4) = 6 — wrong quotient", () => {
    const steps = [makeStep("s1", "divide", [20, 4], 6)];
    const problem = makeProblem("test", [20, 4], steps, 6);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "20 ÷ 4 ≠ 6");
  });

  it("square(5) = 30 — wrong square", () => {
    const steps = [makeStep("s1", "square", [5], 30)];
    const problem = makeProblem("test", [5], steps, 30);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "5² ≠ 30");
  });

  it("power(2, 3) = 9 — wrong power", () => {
    const steps = [makeStep("s1", "power", [2, 3], 9)];
    const problem = makeProblem("test", [2, 3], steps, 9);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "2³ ≠ 9");
  });

  it("negate(5) = 5 — negation should flip sign", () => {
    const steps = [makeStep("s1", "negate", [5], 5)];
    const problem = makeProblem("test", [5], steps, 5);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "−5 ≠ 5");
  });

  it("remainder(17, 5) = 3 — wrong remainder", () => {
    const steps = [makeStep("s1", "remainder", [17, 5], 3)];
    const problem = makeProblem("test", [17, 5], steps, 3);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "17 mod 5 ≠ 3");
  });

  it("half(7) = 4 — wrong half", () => {
    const steps = [makeStep("s1", "half", [7], 4)];
    const problem = makeProblem("test", [7], steps, 4);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "7 ÷ 2 ≠ 4");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 2. Misleading operation names must NOT get kernel-backed status
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: misleading operation names", () => {
  it("'multiply' used for area with unit conversion — not pure arithmetic", () => {
    // "multiply" but the result includes a unit conversion factor
    // that makes the pure arithmetic check fail
    const steps = [makeStep("s1", "multiply", [3, 4], 1200)]; // e.g., cm² to mm²
    const problem = makeProblem("test", [3, 4], steps, 1200);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "3 × 4 ≠ 1200");
  });

  it("'divide' used for percentage — not pure division", () => {
    const steps = [makeStep("s1", "divide", [25, 100], 0.025)]; // wrong: 25/100 = 0.25
    const problem = makeProblem("test", [25, 100], steps, 0.025);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "25 ÷ 100 ≠ 0.025");
  });

  it("'add' used for string concatenation result", () => {
    const steps = [makeStep("s1", "add", [1, 2], "12")]; // "12" parses as 12, not 3
    const problem = makeProblem("test", [1, 2], steps, "12");
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "1 + 2 ≠ 12");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 3. Unverifiable operations must NOT be kernel-backed
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: unverifiable operations get compatibility mode", () => {
  const unverifiableOps = [
    { op: "integrate", inputs: [3, 0, 1], value: 1.5 },
    { op: "differentiate", inputs: [3, 2], value: 6 },
    { op: "factorise", inputs: [6], value: "2 × 3" },
    { op: "solve", inputs: [2, 3, 5], value: 1 },
    { op: "classify", inputs: [3, 4, 5], value: "right triangle" },
    { op: "substitute", inputs: [3, 2], value: 11 },
    { op: "simplify", inputs: [6, 4], value: "3/2" },
    { op: "convert", inputs: [1000], value: "1 kg" },
    { op: "expand", inputs: [345], value: "300 + 40 + 5" },
    { op: "reduce", inputs: [4, 8], value: "1/2" },
    { op: "evaluate", inputs: [3, 4], value: 7 },
    { op: "compare", inputs: [3, 5], value: "less" },
    { op: "sort", inputs: [5, 2, 8], value: "2, 5, 8" },
    { op: "rearrange", inputs: [2, 3], value: 1 },
    { op: "row-reduce", inputs: [1, 2, 3], value: 1 },
    { op: "note", inputs: [42], value: 42 },
    { op: "recall", inputs: [3.14], value: 3.14 },
    { op: "choose", inputs: [3], value: 3 },
    { op: "check", inputs: [7], value: true },
    { op: "combine", inputs: [3, 4], value: 7 },
    { op: "list", inputs: [1, 2, 3], value: "1, 2, 3" },
    { op: "model", inputs: [5], value: "5x" },
    { op: "hcf", inputs: [12, 8], value: 4 },
    { op: "lcm", inputs: [3, 4], value: 12 },
    { op: "count", inputs: [5], value: 5 },
    { op: "read", inputs: [42], value: 42 },
    { op: "write", inputs: [42], value: "42" },
    { op: "round", inputs: [3.14159], value: 3.14 },
    { op: "find", inputs: [7], value: 7 },
    { op: "place", inputs: [345], value: 3 },
    { op: "order", inputs: [5, 2, 8], value: "2, 5, 8" },
    { op: "rewrite", inputs: [0.5], value: "1/2" },
  ];

  for (const { op, inputs, value } of unverifiableOps) {
    it(`"${op}" must NOT be kernel-backed`, () => {
      const steps = [makeStep("s1", op, inputs, value)];
      const problem = makeProblem("test", inputs as number[], steps, value);
      const adapted = adaptProblem(problem);
      assertNotKernelBacked(adapted, `"${op}" is not in the verified OP_RULE_MAP`);
      assertAllStepsNotAdapted(adapted, `"${op}" has no independent verification`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. Invalid fractions and incorrect signs
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: invalid fractions and incorrect signs", () => {
  it("divide by zero must not be kernel-backed", () => {
    const steps = [makeStep("s1", "divide", [10, 0], Infinity)];
    const problem = makeProblem("test", [10, 0], steps, Infinity);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "Division by zero");
  });

  it("divide by zero producing NaN must not be kernel-backed", () => {
    const steps = [makeStep("s1", "divide", [0, 0], NaN)];
    const problem = makeProblem("test", [0, 0], steps, NaN);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "0/0 = NaN");
  });

  it("subtract with wrong sign must not be kernel-backed", () => {
    // 3 - 7 = 4 (should be -4)
    const steps = [makeStep("s1", "subtract", [3, 7], 4)];
    const problem = makeProblem("test", [3, 7], steps, 4);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "3 − 7 ≠ 4");
  });

  it("negate with wrong sign must not be kernel-backed", () => {
    // negate(-3) should be 3, not -3
    const steps = [makeStep("s1", "negate", [-3], -3)];
    const problem = makeProblem("test", [-3], steps, -3);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "−(−3) ≠ −3");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 5. Null and missing values
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: null and missing values", () => {
  it("null value must not be kernel-backed", () => {
    const steps = [makeStep("s1", "multiply", [3, 4], null)];
    const problem = makeProblem("test", [3, 4], steps, null);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "null value");
  });

  it("undefined value must not be kernel-backed", () => {
    const steps = [makeStep("s1", "add", [3, 4], undefined)];
    const problem = makeProblem("test", [3, 4], steps, undefined);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "undefined value");
  });

  it("empty inputs must not be kernel-backed", () => {
    const steps = [makeStep("s1", "multiply", [], 0)];
    const problem = makeProblem("test", [], steps, 0);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "no inputs");
  });

  it("non-numeric string inputs must not be kernel-backed", () => {
    const steps = [makeStep("s1", "multiply", ["abc", "def"], "abcdef")];
    const problem = makeProblem("test", [], steps, "abcdef");
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "non-numeric strings");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 6. Unsupported transformations (made-up ops)
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: unsupported/made-up operations", () => {
  const madeUpOps = [
    "quantum-entangle",
    "blockchain-hash",
    "neural-predict",
    "magic-transform",
    "auto-solve",
    "",
  ];

  for (const op of madeUpOps) {
    it(`"${op || "(empty string)"}" must not be kernel-backed`, () => {
      const steps = [makeStep("s1", op, [1, 2], 3)];
      const problem = makeProblem("test", [1, 2], steps, 3);
      const adapted = adaptProblem(problem);
      assertNotKernelBacked(adapted, `"${op}" is not a recognized operation`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 7. Multi-step problems: one bad step poisons the whole problem
// ════════════════════════════════════════════════════════════════════════════════

describe("adversarial: partial correctness does not grant full verification", () => {
  it("correct multiply + wrong add = NOT kernel-backed", () => {
    const steps = [
      makeStep("s1", "multiply", [3, 4], 12),  // correct: 3 × 4 = 12
      makeStep("s2", "add", [12, 5], 18),       // wrong: 12 + 5 ≠ 18
    ];
    const problem = makeProblem("test", [3, 4, 5], steps, 18);
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "second step has wrong arithmetic");
    // First step should be adapted, second should not
    assert.equal(adapted.steps[0].adapted, true, "correct step should be adapted");
    assert.equal(adapted.steps[1].adapted, false, "wrong step should NOT be adapted");
  });

  it("correct arithmetic + unverifiable op = NOT fully kernel-backed", () => {
    const steps = [
      makeStep("s1", "multiply", [3, 4], 12),  // verifiable
      makeStep("s2", "classify", [12], "even"),  // not verifiable
    ];
    const problem = makeProblem("test", [3, 4], steps, "even");
    const adapted = adaptProblem(problem);
    assertNotKernelBacked(adapted, "classify is not independently verifiable");
    assert.equal(adapted.steps[0].adapted, true, "multiply step is correct");
    assert.equal(adapted.steps[1].adapted, false, "classify step is not verifiable");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 8. Positive controls — correct arithmetic MUST be kernel-backed
// ════════════════════════════════════════════════════════════════════════════════

describe("positive controls: correct arithmetic IS kernel-backed", () => {
  it("multiply(3, 4) = 12 — correct", () => {
    const steps = [makeStep("s1", "multiply", [3, 4], 12)];
    const problem = makeProblem("test", [3, 4], steps, 12);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].adapted, true);
    assert.equal(adapted.steps[0].transformation!.ruleId, "arithmetic.multiplicative-composition");
  });

  it("add(7, 8) = 15 — correct", () => {
    const steps = [makeStep("s1", "add", [7, 8], 15)];
    const problem = makeProblem("test", [7, 8], steps, 15);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].adapted, true);
  });

  it("subtract(10, 3) = 7 — correct", () => {
    const steps = [makeStep("s1", "subtract", [10, 3], 7)];
    const problem = makeProblem("test", [10, 3], steps, 7);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("divide(20, 4) = 5 — correct", () => {
    const steps = [makeStep("s1", "divide", [20, 4], 5)];
    const problem = makeProblem("test", [20, 4], steps, 5);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("square(5) = 25 — correct", () => {
    const steps = [makeStep("s1", "square", [5], 25)];
    const problem = makeProblem("test", [5], steps, 25);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("power(2, 3) = 8 — correct", () => {
    const steps = [makeStep("s1", "power", [2, 3], 8)];
    const problem = makeProblem("test", [2, 3], steps, 8);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("negate(5) = -5 — correct", () => {
    const steps = [makeStep("s1", "negate", [5], -5)];
    const problem = makeProblem("test", [5], steps, -5);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("remainder(17, 5) = 2 — correct", () => {
    const steps = [makeStep("s1", "remainder", [17, 5], 2)];
    const problem = makeProblem("test", [17, 5], steps, 2);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("half(10) = 5 — correct", () => {
    const steps = [makeStep("s1", "half", [10], 5)];
    const problem = makeProblem("test", [10], steps, 5);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("square-root(9) = 3 — correct", () => {
    const steps = [makeStep("s1", "square-root", [9], 3)];
    const problem = makeProblem("test", [9], steps, 3);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("cube-root(27) = 3 — correct", () => {
    const steps = [makeStep("s1", "cube-root", [27], 3)];
    const problem = makeProblem("test", [27], steps, 3);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("floor(3.7) = 3 — correct", () => {
    const steps = [makeStep("s1", "floor", [3.7], 3)];
    const problem = makeProblem("test", [3.7], steps, 3);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("average(4, 6) = 5 — correct", () => {
    const steps = [makeStep("s1", "average", [4, 6], 5)];
    const problem = makeProblem("test", [4, 6], steps, 5);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("share(12, 3) = 4 — correct", () => {
    const steps = [makeStep("s1", "share", [12, 3], 4)];
    const problem = makeProblem("test", [12, 3], steps, 4);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("multi-step correct arithmetic = kernel-backed", () => {
    const steps = [
      makeStep("s1", "multiply", [3, 4], 12),
      makeStep("s2", "add", [12, 5], 17),
    ];
    const problem = makeProblem("test", [3, 4, 5], steps, 17);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps.every((s) => s.adapted), true);
  });

  it("string-encoded number inputs work", () => {
    const steps = [makeStep("s1", "multiply", ["3", "4"], 12)];
    const problem = makeProblem("test", [3, 4], steps, 12);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 9. String fraction parsing — parse "1/3", "22/7" as numeric values
// ════════════════════════════════════════════════════════════════════════════════

describe("string fraction parsing", () => {
  it("parseNumeric handles integers", () => {
    assert.equal(parseNumeric(42), 42);
    assert.equal(parseNumeric("42"), 42);
  });

  it("parseNumeric handles decimals", () => {
    assert.equal(parseNumeric(3.14), 3.14);
    assert.equal(parseNumeric("3.14"), 3.14);
  });

  it("parseNumeric handles fractions", () => {
    assert.ok(Math.abs(parseNumeric("1/3")! - 1/3) < 1e-15);
    assert.ok(Math.abs(parseNumeric("22/7")! - 22/7) < 1e-15);
    assert.ok(Math.abs(parseNumeric("55/4")! - 13.75) < 1e-15);
    assert.ok(Math.abs(parseNumeric("3/8")! - 0.375) < 1e-15);
  });

  it("parseNumeric rejects non-numeric strings", () => {
    assert.equal(parseNumeric("hello"), null);
    assert.equal(parseNumeric("5π/3"), null);
    assert.equal(parseNumeric("x²"), null);
    assert.equal(parseNumeric(""), null);
    assert.equal(parseNumeric(null), null);
    assert.equal(parseNumeric(undefined), null);
  });

  it("parseNumeric rejects division by zero", () => {
    assert.equal(parseNumeric("5/0"), null);
  });

  it("multiply with fraction string inputs — correct arithmetic", () => {
    // (1/3) × (3/7) = 1/7 ≈ 0.14285714285714285
    const steps = [makeStep("s1", "multiply", ["1/3", "3/7"], 0.14285714285714285)];
    const problem = makeProblem("test", [1, 3], steps, 0.14285714285714285);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "fraction inputs should parse and verify");
  });

  it("divide with fraction string inputs — correct arithmetic", () => {
    // (3/2) ÷ (3/4) = 2
    const steps = [makeStep("s1", "divide", ["3/2", "3/4"], 2)];
    const problem = makeProblem("test", [3, 2], steps, 2);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "fraction divide should verify");
  });

  it("fraction string result also parsed", () => {
    // (3/8) ÷ (3/2) = 1/4 = 0.25
    const steps = [makeStep("s1", "divide", ["3/8", "3/2"], "1/4")];
    const problem = makeProblem("test", [3, 8], steps, "1/4");
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "fraction result should parse and verify");
  });

  it("REJECTS fraction inputs with wrong arithmetic", () => {
    // (1/3) × (3/7) ≠ 0.5
    const steps = [makeStep("s1", "multiply", ["1/3", "3/7"], 0.5)];
    const problem = makeProblem("test", [1, 3], steps, 0.5);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "wrong fraction arithmetic must fail");
  });

  it("REJECTS non-numeric fraction-like strings", () => {
    // "5π/3" is not a pure fraction
    const steps = [makeStep("s1", "multiply", ["5π/3", "180°/π"], 300)];
    const problem = makeProblem("test", [5, 3], steps, 300);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "symbolic fractions must not parse");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 10. Multi-input multiply — product of 3+ numeric inputs
// ════════════════════════════════════════════════════════════════════════════════

describe("multi-input multiply", () => {
  it("multiply(2, 3, 4) = 24 — correct", () => {
    const steps = [makeStep("s1", "multiply", [2, 3, 4], 24)];
    const problem = makeProblem("test", [2, 3, 4], steps, 24);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
    assert.equal(adapted.steps[0].adapted, true);
  });

  it("multiply(3.14, 45, 51) = 7206.3 — correct (large product)", () => {
    const expected = 3.14 * 45 * 51;
    const steps = [makeStep("s1", "multiply", [3.14, 45, 51], expected)];
    const problem = makeProblem("test", [3, 4, 5], steps, expected);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("multiply(15, 12, 60) = 10800 — correct", () => {
    const steps = [makeStep("s1", "multiply", [15, 12, 60], 10800)];
    const problem = makeProblem("test", [15, 12, 60], steps, 10800);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("multiply(2, 3, 4, 5) = 120 — four inputs", () => {
    const steps = [makeStep("s1", "multiply", [2, 3, 4, 5], 120)];
    const problem = makeProblem("test", [2, 3, 4, 5], steps, 120);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("REJECTS multiply(2, 3, 4) = 25 — wrong product", () => {
    const steps = [makeStep("s1", "multiply", [2, 3, 4], 25)];
    const problem = makeProblem("test", [2, 3, 4], steps, 25);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "wrong 3-input product must fail");
  });

  it("2-input multiply still works", () => {
    const steps = [makeStep("s1", "multiply", [6, 7], 42)];
    const problem = makeProblem("test", [6, 7], steps, 42);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 11. Integer division (quotient) — floor(a/b) verification
// ════════════════════════════════════════════════════════════════════════════════

describe("integer division (quotient)", () => {
  it("divide(5, 3) = 1 — integer quotient", () => {
    const steps = [makeStep("s1", "divide", [5, 3], 1)];
    const problem = makeProblem("test", [5, 3], steps, 1);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "floor(5/3)=1 should verify");
  });

  it("divide(17, 5) = 3 — integer quotient", () => {
    const steps = [makeStep("s1", "divide", [17, 5], 3)];
    const problem = makeProblem("test", [17, 5], steps, 3);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "floor(17/5)=3 should verify");
  });

  it("divide(10, 3) = 3 — integer quotient", () => {
    const steps = [makeStep("s1", "divide", [10, 3], 3)];
    const problem = makeProblem("test", [10, 3], steps, 3);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "floor(10/3)=3 should verify");
  });

  it("exact division still works: divide(20, 4) = 5", () => {
    const steps = [makeStep("s1", "divide", [20, 4], 5)];
    const problem = makeProblem("test", [20, 4], steps, 5);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("REJECTS divide(5, 3) = 2 — wrong quotient", () => {
    const steps = [makeStep("s1", "divide", [5, 3], 2)];
    const problem = makeProblem("test", [5, 3], steps, 2);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "wrong quotient must fail");
  });

  it("REJECTS integer division for non-integer inputs", () => {
    // divide(5.5, 3) = 1 — inputs not integers, should not get quotient shortcut
    const steps = [makeStep("s1", "divide", [5.5, 3], 1)];
    const problem = makeProblem("test", [5.5, 3], steps, 1);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "non-integer inputs should not use quotient");
  });

  it("REJECTS integer division for negative result", () => {
    // divide(5, -3) = -1 — negative result not accepted for quotient
    const steps = [makeStep("s1", "divide", [5, -3], -1)];
    const problem = makeProblem("test", [5, -3], steps, -1);
    const adapted = adaptProblem(problem);
    // This should fail quotient (negative result) but also fail exact (-1.667≠-1)
    assert.equal(adapted.fullyAdapted, false, "negative quotient not verified");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 12. Round verification — round to nearest place value
// ════════════════════════════════════════════════════════════════════════════════

describe("round verification", () => {
  it("round(23, 10) = 20 — round to nearest 10", () => {
    const steps = [makeStep("s1", "round", [23, 10], 20)];
    const problem = makeProblem("test", [23], steps, 20);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("round(164, 10) = 160 — round to nearest 10", () => {
    const steps = [makeStep("s1", "round", [164, 10], 160)];
    const problem = makeProblem("test", [164], steps, 160);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("round(6686230, 100000) = 6700000 — round to nearest 100000", () => {
    const steps = [makeStep("s1", "round", [6686230, 100000], 6700000)];
    const problem = makeProblem("test", [6686230], steps, 6700000);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("round(5) = 10 — single input, inferred round to 10", () => {
    const steps = [makeStep("s1", "round", [5], 10)];
    const problem = makeProblem("test", [5], steps, 10);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("round(3) = 0 — single input, round to 10", () => {
    const steps = [makeStep("s1", "round", [3], 0)];
    const problem = makeProblem("test", [3], steps, 0);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("REJECTS round(5) = 7 — wrong rounding", () => {
    const steps = [makeStep("s1", "round", [5], 7)];
    const problem = makeProblem("test", [5], steps, 7);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "incorrect rounding must fail");
  });

  it("REJECTS round(23, 10) = 30 — wrong rounding", () => {
    const steps = [makeStep("s1", "round", [23, 10], 30)];
    const problem = makeProblem("test", [23], steps, 30);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "wrong round-to-10 must fail");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 13. Convert as multiplication — unit conversion with verifiable factor
// ════════════════════════════════════════════════════════════════════════════════

describe("convert as multiplication/division", () => {
  it("convert(3, 60) = 180 — hours to minutes", () => {
    const steps = [makeStep("s1", "convert", [3, 60], 180)];
    const problem = makeProblem("test", [3], steps, 180);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("convert(3, 1000) = 3000 — litres to ml", () => {
    const steps = [makeStep("s1", "convert", [3, 1000], 3000)];
    const problem = makeProblem("test", [3], steps, 3000);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true);
  });

  it("convert as division: convert(200, 1000) = 0.2", () => {
    const steps = [makeStep("s1", "convert", [200, 1000], 0.2)];
    const problem = makeProblem("test", [200], steps, 0.2);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, true, "200/1000=0.2 should verify");
  });

  it("REJECTS convert with 1 input (factor unknown)", () => {
    // convert(5) = 500 — we don't know the factor, can't verify independently
    const steps = [makeStep("s1", "convert", [5], 500)];
    const problem = makeProblem("test", [5], steps, 500);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "1-input convert has unknown factor");
  });

  it("REJECTS convert(5, 18) = 5018 — not multiply or divide", () => {
    const steps = [makeStep("s1", "convert", [5, 18], 5018)];
    const problem = makeProblem("test", [5], steps, 5018);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "5×18≠5018 and 5/18≠5018");
  });

  it("REJECTS convert with non-numeric inputs", () => {
    const steps = [makeStep("s1", "convert", ["a metre", 100], 100)];
    const problem = makeProblem("test", [100], steps, 100);
    const adapted = adaptProblem(problem);
    assert.equal(adapted.fullyAdapted, false, "non-numeric first input");
  });
});
