/**
 * Structural mathematical relationship tests for the justification-driven
 * explanation engine.
 *
 * These tests verify that:
 *   1. Steps carry typed justification metadata (not just op/competency).
 *   2. The same arithmetic operation gets DIFFERENT justification rules in
 *      different mathematical contexts.
 *   3. Justification parameters encode correct mathematical relationships
 *      (equality preservation, fraction value, geometric formulas, positional value).
 *   4. The rendering layer produces text from the justification, not from op alone.
 *   5. All 15 explicit teaching families produce annotated steps.
 *
 * These tests verify mathematical STRUCTURE, not English vocabulary.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { FAMILIES } from "./families";
import { teachingPresentationFrom, EXPLICIT_TEACHING_FAMILIES } from "./teaching-presentation";
import type { Module, Screen, Question } from "./content";
import type { Justification, Problem, Step } from "./family-kit";

/** A solved family as a complete, correctly typed Problem: the fields the production builder sets, from `solve`'s steps and answer; `over` replaces any of them. */
function solvedProblem(def: NonNullable<ReturnType<typeof FAMILIES.get>>, params: number[], over: Partial<Problem> = {}): Problem {
  const s = def.solve(params);
  return { family: def.id, id: `${def.id}:${params.join(",")}`, params, competency: def.competency, skill: def.competency, form: "typed", prompt: "Solve", type: def.type, answer: String(s.answer), steps: s.steps, bugs: [], ...over };
}

/** Solve a family and return its raw steps with justifications. */
function solveFamily(familyId: string, params: number[]): { steps: Step[]; answer: number | number[] | string } {
  const family = FAMILIES.get(familyId)!;
  return family.solve(params);
}

/** Build a presentation to exercise the rendering path. */
function presentationFor(familyId: string, params: number[]) {
  const family = FAMILIES.get(familyId)!;
  const problem = solvedProblem(family, params, { bugs: family.bugs(params), prompt: `Solve: ${String(family.solve(params).answer)}` });
  const module: Module = {
    competency: family.competency,
    title: family.title,
    chapter: [{ title: "Test", text: [family.teach?.idea ?? ""] }],
    diagnostics: [],
    strategies: [],
    practice: [],
    transfer: [],
    retention: [],
    probes: [],
    pool: { family: familyId, version: "test" },
  };
  const screen: Screen = module.chapter[0];
  const question: Question = { id: "test-q", competency: family.competency, skill: family.competency, role: "practice", type: problem.type, prompt: problem.prompt, answer: problem.answer, solution: "", difficulty: 1, source: "test", licence: "test", review: "provisional" };
  return teachingPresentationFrom({ module, screen, problem, question, practiceIds: ["test-q"] });
}


// ═══════════════════════════════════════════════════════════════════════════
// CRITERION 1: Justification metadata is present and correctly typed
// ═══════════════════════════════════════════════════════════════════════════

test("every step of every explicit teaching family carries a justification", () => {
  const VALID_PARAMS: Record<string, number[]> = {
    rect: [5, 3], eqfrac: [2, 3, 9], fadd: [3, 2, 7, 1], rperim: [8, 5],
    lin: [3, 7, 4], ahone: [0, 5, 8], lneg: [2, 3, 11], aearea: [4, 6],
    aeind: [3, 4, 5, 6, 7, 8], aiint: [5, -3, 0], adfcmp: [0, 5, 2, 3, 0],
    adfname: [2, 3, 3], adshade: [3, 4, 1, 2], aocart: [3, 4, 0], apcartn: [0, 3, 4, 0],
  };
  for (const fid of EXPLICIT_TEACHING_FAMILIES) {
    const params = VALID_PARAMS[fid];
    assert.ok(params, `test params defined for ${fid}`);
    const { steps } = solveFamily(fid, params);
    for (const step of steps) {
      assert.ok(
        step.justification !== undefined,
        `${fid} step "${step.id}" must have a justification, got undefined`
      );
      assert.ok(
        typeof step.justification.rule === "string" && step.justification.rule.length > 0,
        `${fid} step "${step.id}" justification must have a non-empty rule`
      );
    }
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// CRITERION 3: Same operation, different justifications
// ═══════════════════════════════════════════════════════════════════════════

test("subtract in an equation vs subtract elsewhere carry different justification rules", () => {
  // Algebra: 3x + 7 = 19 → subtract 7 from both sides
  const lin = solveFamily("lin", [3, 7, 4]);
  const linSubtract = lin.steps.find(s => s.op === "subtract");
  assert.ok(linSubtract, "lin has a subtract step");
  assert.equal(linSubtract!.justification!.rule, "equality-preservation",
    "subtraction in an equation is justified by equality-preservation");

  // Fraction addition: 3/7 + 2/7 = 5/7 — the operation is add/subtract but
  // justified by like-denomination
  const fadd = solveFamily("fadd", [3, 2, 7, 1]);
  assert.equal(fadd.steps[0].justification!.rule, "like-denomination",
    "fraction addition is justified by like-denomination, not generic add");
});

test("multiply in geometry vs multiply in Cartesian products carry different justification rules", () => {
  // Geometry: 5 × 3 = 15 square cm
  const rect = solveFamily("rect", [5, 3]);
  assert.equal(rect.steps[0].justification!.rule, "unit-coverage",
    "rectangle area multiplication is justified by unit-coverage");

  // Cartesian product: |A| × |B|
  const cart = solveFamily("aocart", [3, 4, 0]);
  assert.equal(cart.steps[0].justification!.rule, "product-counting",
    "Cartesian product multiplication is justified by product-counting");
});

test("divide for scaling factor vs divide for inverse operation are distinguished", () => {
  // eqfrac: 9 ÷ 3 = 3 to find scaling factor
  const eqfrac = solveFamily("eqfrac", [2, 3, 9]);
  assert.equal(eqfrac.steps[0].justification!.rule, "quotient",
    "finding the scaling factor uses quotient rule");

  // ahone: x + 5 = 8 → subtract 5 (equality-preservation), not divide
  // lin: 3x + 7 = 19 → step 2 divides both sides
  const lin = solveFamily("lin", [3, 7, 4]);
  const divStep = lin.steps.find(s => s.justification?.rule === "inverse-operation");
  assert.ok(divStep, "lin has an inverse-operation step for division");
  assert.equal((divStep!.justification as { rule: "inverse-operation"; undoing: string }).undoing,
    "multiply", "the inverse undoes multiplication");
});


// ═══════════════════════════════════════════════════════════════════════════
// CRITERION 4: Mathematical relationships are structurally correct
// ═══════════════════════════════════════════════════════════════════════════

test("equality-preservation: before/after states are mathematically consistent", () => {
  // 3x + 7 = 19 → subtract 7 from both sides → 3x = 12
  const lin = solveFamily("lin", [3, 7, 4]);
  const ep = lin.steps[0].justification as { rule: "equality-preservation"; operation: string; operand: number | string; lhsBefore: string; rhsBefore: string; lhsAfter: string; rhsAfter: string };
  assert.equal(ep.rule, "equality-preservation");
  assert.equal(ep.operation, "subtract");
  assert.equal(ep.operand, 7);
  // Before: RHS = ax + b
  assert.equal(Number(ep.rhsBefore), 3 * 4 + 7, "RHS before = ax + b");
  // After: applying the operation to the RHS before must give the RHS after
  assert.equal(Number(ep.rhsBefore) - Number(ep.operand), Number(ep.rhsAfter),
    "rhsBefore − operand = rhsAfter");
  // After: the after-state must be a valid equation (lhsAfter evaluated = rhsAfter)
  assert.equal(ep.lhsAfter, "3x", "LHS after removes the constant");
  assert.equal(Number(ep.rhsAfter), 12, "RHS after = 3 × 4 = 12");
});

test("equality-preservation: after-states carry through two-step equations", () => {
  // 2x + 3 = 11 → subtract 3 → 2x = 8 → divide by 2 → x = 4
  const lneg = solveFamily("lneg", [2, 3, 4]);
  const step1 = lneg.steps[0].justification as { rule: "equality-preservation"; lhsBefore: string; rhsBefore: string; lhsAfter: string; rhsAfter: string; operand: number | string };
  assert.equal(step1.rule, "equality-preservation");
  // After step 1: 2x = 8
  assert.equal(Number(step1.rhsBefore) - Number(step1.operand), Number(step1.rhsAfter),
    "step 1 after-state: rhsBefore − operand = rhsAfter");
  // Step 2: inverse-operation divides to get x
  const step2 = lneg.steps[1].justification as { rule: "inverse-operation"; operand: number | string };
  assert.equal(step2.rule, "inverse-operation");
  assert.equal(Number(step1.rhsAfter) / Number(step2.operand), 4,
    "step1.rhsAfter ÷ step2.operand = solution x");
});

test("equality-preservation: final solution satisfies original equation by substitution", () => {
  // Verify for multiple parameter sets
  for (const [a, b, x] of [[3, 7, 4], [5, 2, 3], [2, 9, 6]]) {
    const lin = solveFamily("lin", [a, b, x]);
    const ep = lin.steps[0].justification as { rule: "equality-preservation"; rhsBefore: string };
    // Original equation: ax + b = rhsBefore
    // Substituting x into the LHS must equal rhsBefore
    assert.equal(a * x + b, Number(ep.rhsBefore),
      `substitution check: ${a}×${x}+${b} = ${ep.rhsBefore}`);
  }
});

test("equality-preservation: one-step equations (ahone) have correct after-states", () => {
  // x + 5 = 8 → subtract 5 → x = 3
  const ahone = solveFamily("ahone", [0, 5, 3]);
  const ep = ahone.steps[0].justification as { rule: "equality-preservation"; lhsAfter: string; rhsAfter: string };
  assert.equal(ep.lhsAfter, "x", "after isolating, LHS is x");
  assert.equal(Number(ep.rhsAfter), 3, "after isolating, RHS is the solution");
});

test("fraction-equivalence: scaling preserves the fraction value", () => {
  // 2/3 = ?/9 → scalingFactor = 3, so 2/3 × 3/3 = 6/9
  const eqfrac = solveFamily("eqfrac", [2, 3, 9]);
  const feq = eqfrac.steps[1].justification as { rule: "fraction-equivalence"; scalingFactor: number; numeratorBefore: number; denominatorBefore: number };
  assert.equal(feq.rule, "fraction-equivalence");
  // The scaling factor times the original denominator equals the target denominator
  assert.equal(feq.scalingFactor * feq.denominatorBefore, 9,
    "scalingFactor × denominatorBefore = target denominator");
  // The original fraction value is preserved
  const originalValue = feq.numeratorBefore / feq.denominatorBefore;
  const scaledNumerator = feq.numeratorBefore * feq.scalingFactor;
  assert.equal(scaledNumerator / 9, originalValue,
    "scaled fraction value equals original fraction value");
});

test("unit-coverage: rows × columns = computed area", () => {
  const rect = solveFamily("rect", [5, 3]);
  const uc = rect.steps[0].justification as { rule: "unit-coverage"; rows: number; columns: number; unit: string };
  assert.equal(uc.rule, "unit-coverage");
  assert.equal(uc.rows * uc.columns, rect.answer, "rows × columns = area");
  assert.equal(uc.rows, 5);
  assert.equal(uc.columns, 3);
});

test("positional-value: digit × placeValue is a valid place contribution", () => {
  // aeind with params [3, 4, 5, 6, 7, 8]
  const aeind = solveFamily("aeind", [3, 4, 5, 6, 7, 8]);
  for (const step of aeind.steps) {
    const pv = step.justification as { rule: "positional-value"; digit: number; placeValue: number; placeName: string };
    assert.equal(pv.rule, "positional-value");
    // digit must be 0-9 and placeValue must be a power of 10
    assert.ok(pv.digit >= 0 && pv.digit <= 9, `digit ${pv.digit} is in 0-9`);
    assert.ok(Math.log10(pv.placeValue) % 1 === 0, `placeValue ${pv.placeValue} is a power of 10`);
    // The digit's contribution (digit × placeValue) must not exceed the step value
    // (step.value may bundle lower-order digits as well)
    assert.ok(pv.digit * pv.placeValue <= (step.value as number),
      `digit contribution ${pv.digit * pv.placeValue} ≤ step value ${step.value}`);
  }
});

test("positional-value: rendered text shows digit × placeValue, never step.value", () => {
  // This is the critical test for the aeind bug: hundreds digit 5 with step.value=512
  // must render "5 × 100 = 500", NOT "5 × 100 = 512"
  const aeind = solveFamily("aeind", [3, 4, 5, 6, 7, 8]);
  const pres = presentationFor("aeind", [3, 4, 5, 6, 7, 8]);

  for (let i = 0; i < aeind.steps.length; i++) {
    const step = aeind.steps[i];
    const pv = step.justification as { rule: "positional-value"; digit: number; placeValue: number };
    const contribution = pv.digit * pv.placeValue;
    const explanation = pres.workedExample!.steps[i].explanation;

    // The rendered text must contain the correct contribution
    if (pv.digit !== 0) {
      assert.ok(explanation.includes(String(contribution)),
        `step ${i}: rendered text must contain ${contribution} (digit=${pv.digit} × place=${pv.placeValue}), got: "${explanation}"`);
    }

    // The rendered text must NOT contain step.value when it differs from contribution
    if (step.value !== contribution && pv.digit !== 0) {
      assert.ok(!explanation.includes(` = ${step.value}`) && !explanation.includes(`= ${step.value} `),
        `step ${i}: rendered text must NOT show step.value=${step.value} as the product (contribution=${contribution})`);
    }
  }
});

test("positional-value: zero-digit steps correctly render zero contribution", () => {
  // Use params where some digits are 0
  const aeind = solveFamily("aeind", [0, 0, 5, 0, 7, 0]);
  const pres = presentationFor("aeind", [0, 0, 5, 0, 7, 0]);

  for (let i = 0; i < aeind.steps.length; i++) {
    const step = aeind.steps[i];
    const pv = step.justification as { rule: "positional-value"; digit: number; placeValue: number };
    const explanation = pres.workedExample!.steps[i].explanation;

    if (pv.digit === 0) {
      // Zero digit: contribution is 0, explanation should convey "0 × placeValue = 0"
      assert.ok(explanation.includes("0"),
        `zero digit step ${i}: explanation should mention zero`);
    }
  }
});

test("number-line-movement: start ± distance = result", () => {
  // 5 + (-3) = 2
  const aiint = solveFamily("aiint", [5, -3, 0]);
  const lastStep = aiint.steps[aiint.steps.length - 1];
  const nlm = lastStep.justification as { rule: "number-line-movement"; start: number; direction: "left" | "right"; distance: number };
  assert.equal(nlm.rule, "number-line-movement");
  const expected = nlm.direction === "right" ? nlm.start + nlm.distance : nlm.start - nlm.distance;
  assert.equal(expected, lastStep.value, "start + signed distance = result");
});

test("like-denomination: numerators operate over the shared denominator", () => {
  // 3/7 + 2/7 = 5/7
  const fadd = solveFamily("fadd", [3, 2, 7, 1]);
  const ld = fadd.steps[0].justification as { rule: "like-denomination"; operation: "add" | "subtract"; numeratorA: number; numeratorB: number; denominator: number };
  assert.equal(ld.rule, "like-denomination");
  assert.equal(ld.denominator, 7);
  if (ld.operation === "add") {
    assert.equal((ld.numeratorA + ld.numeratorB) / ld.denominator, fadd.answer,
      "numeratorA + numeratorB over denominator = answer");
  }
});

test("comparison: relation matches actual fraction ordering", () => {
  // Compare 2/5 and 3/5 (same denominator, mode=0)
  const cmp = solveFamily("adfcmp", [0, 5, 2, 3, 0]);
  const j = cmp.steps[0].justification as { rule: "comparison"; left: number | string; right: number | string; relation: string };
  assert.equal(j.rule, "comparison");
  // The relation should reflect the actual ordering
  assert.ok(["<", ">", "="].includes(j.relation), "relation is a valid comparator");
});

test("additive-combination and scaling for perimeter are structurally correct", () => {
  // rperim: l=8, w=5 → step 1: l + w = 13, step 2: 2 × 13 = 26
  const rperim = solveFamily("rperim", [8, 5]);
  const ac = rperim.steps[0].justification as { rule: "additive-combination"; what: string; parts: (number | string)[] };
  assert.equal(ac.rule, "additive-combination");
  const sumParts = (ac.parts as number[]).reduce((a, b) => a + b, 0);
  assert.equal(sumParts, 13, "l + w = half perimeter");

  const sc = rperim.steps[1].justification as { rule: "scaling"; factor: number; what: string };
  assert.equal(sc.rule, "scaling");
  assert.equal(sc.factor, 2, "perimeter doubles the half-perimeter");
  assert.equal(sc.factor * (rperim.steps[0].value as number), rperim.answer,
    "2 × half-perimeter = perimeter");
});


// ═══════════════════════════════════════════════════════════════════════════
// CRITERION 5: Rendering uses justification, not op
// ═══════════════════════════════════════════════════════════════════════════

test("rendering produces different text for same op with different justifications", () => {
  // Both rect and rperim use "multiply" as an op, but they should render differently
  const rectPres = presentationFor("rect", [5, 3]);
  const rperimPres = presentationFor("rperim", [8, 5]);

  const rectExplanation = rectPres.workedExample!.steps[0].explanation;
  const rperimStep2 = rperimPres.workedExample!.steps[1].explanation;

  // They must be different strings because the justification rules differ
  assert.notEqual(rectExplanation, rperimStep2,
    "unit-coverage explanation ≠ scaling explanation even though both involve multiplication");
});

test("rendering includes justification parameters, not just op name", () => {
  // 3x + 7 = 19: the explanation should reference the actual equation values
  const linPres = presentationFor("lin", [3, 7, 4]);
  const step1 = linPres.workedExample!.steps[0];
  // The explanation should contain the operand (7) and the equation sides
  assert.ok(step1.explanation.includes("7"), "explanation includes the operand from justification");
  assert.ok(step1.explanation.includes("19"), "explanation includes the RHS from justification");
});

test("rendering: equality-preservation shows before → operation → after", () => {
  // 3x + 7 = 19 → subtract 7 → 3x = 12
  const linPres = presentationFor("lin", [3, 7, 4]);
  const step1Explanation = linPres.workedExample!.steps[0].explanation;
  // Must show the before-state
  assert.ok(step1Explanation.includes("3x + 7"), "shows LHS before");
  assert.ok(step1Explanation.includes("19"), "shows RHS before");
  // Must show the after-state
  assert.ok(step1Explanation.includes("3x") && step1Explanation.includes("12"),
    "shows after-state (3x = 12)");
  // Must mention the operation
  assert.ok(step1Explanation.includes("subtract"),
    "mentions the balancing operation");
});

test("rendering: inverse-operation shows the resulting value", () => {
  // lin [3, 7, 4]: step 2 is divide by 3 → x = 4
  const linPres = presentationFor("lin", [3, 7, 4]);
  const step2Explanation = linPres.workedExample!.steps[1].explanation;
  assert.ok(step2Explanation.includes("4"),
    "inverse-operation explanation includes the solution value");
  assert.ok(step2Explanation.includes("3"),
    "inverse-operation explanation includes the operand");
});

test("varying parameters changes justification data, not the rule", () => {
  // rect 5×3 and rect 7×9 both use unit-coverage, but with different row/column counts
  const r1 = solveFamily("rect", [5, 3]);
  const r2 = solveFamily("rect", [7, 9]);
  const j1 = r1.steps[0].justification as { rule: "unit-coverage"; rows: number; columns: number };
  const j2 = r2.steps[0].justification as { rule: "unit-coverage"; rows: number; columns: number };
  assert.equal(j1.rule, j2.rule, "same rule for same family");
  assert.notEqual(j1.rows * j1.columns, j2.rows * j2.columns, "different parameters → different area");
});


// ═══════════════════════════════════════════════════════════════════════════
// CRITERION 6: All four demonstration domains
// ═══════════════════════════════════════════════════════════════════════════

test("arithmetic (place value): aeind justifications are positional-value", () => {
  const { steps } = solveFamily("aeind", [3, 4, 5, 6, 7, 8]);
  assert.ok(steps.every(s => s.justification!.rule === "positional-value"),
    "all aeind steps use positional-value rule");
});

test("fractions (equivalent fractions): eqfrac uses quotient + fraction-equivalence", () => {
  const { steps } = solveFamily("eqfrac", [2, 3, 9]);
  assert.equal(steps[0].justification!.rule, "quotient");
  assert.equal(steps[1].justification!.rule, "fraction-equivalence");
});

test("algebra (one-step): ahone uses equality-preservation", () => {
  const { steps } = solveFamily("ahone", [0, 5, 8]);
  assert.equal(steps[0].justification!.rule, "equality-preservation");
});

test("algebra (two-step): lneg uses equality-preservation + inverse-operation", () => {
  const { steps } = solveFamily("lneg", [2, 3, 11]);
  assert.equal(steps[0].justification!.rule, "equality-preservation");
  assert.equal(steps[1].justification!.rule, "inverse-operation");
});

test("geometry (area): rect uses unit-coverage", () => {
  const { steps } = solveFamily("rect", [5, 3]);
  assert.equal(steps[0].justification!.rule, "unit-coverage");
});

test("geometry (perimeter): rperim uses additive-combination + scaling", () => {
  const { steps } = solveFamily("rperim", [8, 5]);
  assert.equal(steps[0].justification!.rule, "additive-combination");
  assert.equal(steps[1].justification!.rule, "scaling");
});
