/**
 * Demo B: Linear Equation Learner Experience
 *
 * Demonstrates the complete teaching journey for solving 3x + 7 = 19.
 * Exercises: meaning of equality, step-by-step with before/after states,
 * verification by substitution, practice, feedback.
 *
 * This is an acceptance demonstration per the Codex Directive.
 */

import { FAMILIES } from "./families";
import { familyTeachingVisual, teachingPresentationFrom, validateTeachingPresentation } from "./teaching-presentation";
import type { Problem } from "./family-kit";
import type { Module, Question, Screen } from "./content";

// ── Helpers ──

function makeProblem(family: string, params: number[]): Problem {
  const def = FAMILIES.get(family)!;
  const { steps, answer } = def.solve(params);
  return { family, params, steps, answer: String(answer), prompt: `Solve for x`, bugs: [], figure: undefined };
}

function makeModule(family: string, title: string): Module {
  return { id: `demo-${family}`, title, competency: "MATH.algebra.linear-equations", pool: { family, count: 3 }, text: [] } as unknown as Module;
}

function makeScreen(problem: Problem): Screen {
  return { id: "demo-screen", text: ["Solve the equation step by step."], math: [problem.prompt], widget: undefined } as unknown as Screen;
}

function makeQuestion(problem: Problem): Question {
  return { id: "demo-q", prompt: problem.prompt, answer: problem.answer } as unknown as Question;
}

// ── Demo B: 3x + 7 = 19 ──

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  DEMO B: Linear Equation Teaching Journey");
console.log("  Equation: 3x + 7 = 19");
console.log("═══════════════════════════════════════════════════════════════════\n");

const params = [3, 7, 4]; // a=3, b=7, x=4 → 3(4) + 7 = 19
const problem = makeProblem("lin", params);
const module = makeModule("lin", "Two-step linear equations");
const screen = makeScreen(problem);
const question = makeQuestion(problem);

// ── Step 1: Meaning of Equality ──
console.log("─── Step 1: Meaning of Equality ───");
const [a, b, x] = params;
const rhs = a * x + b;
console.log(`  The equation 3x + 7 = 19 means:`);
console.log(`  "Three times some number, plus seven, equals nineteen."`);
console.log(`  Both sides must always represent the same value.`);
console.log(`  ✓ Equality = balanced: whatever we do to one side, we do to both.`);

// ── Step 2: Visual (equation lines) ──
console.log("\n─── Step 2: Equation Visual ───");
const visual = familyTeachingVisual(problem);
if (visual?.kind === "equation") {
  for (const line of visual.lines) {
    console.log(`  ${line}`);
  }
  console.log(`  ✓ Visual shows the complete transformation chain`);
} else {
  console.error("  ✗ Expected an equation visual!");
}

// ── Step 3: Step-by-step with before/after states ──
console.log("\n─── Step 3: Step-by-Step with Before → After States ───");

const presentation = teachingPresentationFrom({
  module, screen, problem, question, practiceIds: ["q1", "q2", "q3"],
});

console.log(`  Status: ${presentation.status}`);

if (presentation.workedExample) {
  for (let i = 0; i < presentation.workedExample.steps.length; i++) {
    const step = presentation.workedExample.steps[i];
    const rawStep = problem.steps[i];
    const j = rawStep.justification as any;

    console.log(`\n  Step ${i + 1}: ${step.expression}`);
    console.log(`  Explanation: ${step.explanation}`);

    if (j.rule === "equality-preservation") {
      console.log(`  Before: ${j.lhsBefore} = ${j.rhsBefore}`);
      console.log(`  Operation: ${j.operation} ${j.operand} on both sides`);
      console.log(`  After:  ${j.lhsAfter} = ${j.rhsAfter}`);

      // Verify the transformation is correct
      const rhsBeforeNum = Number(j.rhsBefore);
      const rhsAfterNum = Number(j.rhsAfter);
      const operandNum = Number(j.operand);
      const expectedAfter = j.operation === "subtract" ? rhsBeforeNum - operandNum : rhsBeforeNum + operandNum;

      if (expectedAfter === rhsAfterNum) {
        console.log(`  ✓ ${j.rhsBefore} ${j.operation === "subtract" ? "−" : "+"} ${j.operand} = ${j.rhsAfter} is correct`);
      } else {
        console.error(`  ✗ Expected ${expectedAfter}, got ${j.rhsAfter}`);
      }
    } else if (j.rule === "inverse-operation") {
      console.log(`  ${j.applying} by ${j.operand} undoes the ${j.undoing}`);
      console.log(`  → x = ${rawStep.value}`);

      // Verify
      const expectedX = (rhs - b) / a;
      if (rawStep.value === expectedX) {
        console.log(`  ✓ x = ${rawStep.value} is correct`);
      } else {
        console.error(`  ✗ Expected x = ${expectedX}, got ${rawStep.value}`);
      }
    }
  }
} else {
  console.error("  ✗ No worked example generated!");
}

// ── Step 4: Verification by Substitution ──
console.log("\n─── Step 4: Verification by Substitution ───");
const solution = Number(problem.answer);
const lhsCheck = a * solution + b;
console.log(`  Substitute x = ${solution} into 3x + 7:`);
console.log(`  3(${solution}) + 7 = ${a * solution} + 7 = ${lhsCheck}`);
console.log(`  RHS = ${rhs}`);
if (lhsCheck === rhs) {
  console.log(`  ✓ LHS = RHS = ${rhs}. The solution x = ${solution} is verified.`);
} else {
  console.error(`  ✗ LHS (${lhsCheck}) ≠ RHS (${rhs})`);
}

// ── Step 5: Validation ──
console.log("\n─── Step 5: Structural Validation ───");
const errors = validateTeachingPresentation(problem, presentation);
if (errors.length === 0) {
  console.log("  ✓ All mathematical claims validated");
} else {
  for (const e of errors) console.error(`  ✗ ${e}`);
}

// ── Step 6: Practice & Feedback ──
console.log("\n─── Step 6: Practice Setup ───");
console.log(`  Competency: ${presentation.practice.competency}`);
console.log(`  Families: ${presentation.practice.families.join(", ")}`);
console.log(`  Practice IDs: ${presentation.practice.questionIds.join(", ")}`);

// Simulate parameter variations
console.log("\n─── Step 6b: Parameter Variations ───");
for (const [ta, tb, tx] of [[5, 2, 3], [2, 9, 6], [4, 3, 5], [7, 1, 2]]) {
  const p = makeProblem("lin", [ta, tb, tx]);
  const pres = teachingPresentationFrom({
    module, screen: makeScreen(p), problem: p, question: makeQuestion(p),
    practiceIds: ["p1"],
  });
  const valid = validateTeachingPresentation(p, pres);
  const trhs = ta * tx + tb;

  // Substitution check
  const subCheck = ta * Number(p.answer) + tb === trhs;
  console.log(`  ${ta}x + ${tb} = ${trhs}, x=${tx}: ${valid.length === 0 ? "✓" : "✗ " + valid.join("; ")} ${subCheck ? "(substitution ✓)" : "(substitution ✗)"}`);

  // Check before/after states
  if (pres.workedExample) {
    const step1 = p.steps[0];
    const j = step1.justification as any;
    if (j.rule === "equality-preservation") {
      const correctAfter = Number(j.rhsBefore) - Number(j.operand) === Number(j.rhsAfter);
      if (!correctAfter) {
        console.error(`    ✗ After-state incorrect: ${j.rhsBefore} - ${j.operand} ≠ ${j.rhsAfter}`);
      }
    }
  }
}

// ── One-step equation cross-check (ahone) ──
console.log("\n─── Step 7: One-Step Equations (ahone) ───");
for (const [form, ta, tt] of [[0, 5, 3], [1, 4, 7], [2, 3, 6], [3, 2, 5]]) {
  const p = makeProblem("ahone", [form, ta, tt]);
  const pres = teachingPresentationFrom({
    module: makeModule("ahone", "One-step equations"),
    screen: makeScreen(p), problem: p, question: makeQuestion(p),
    practiceIds: ["p1"],
  });
  const valid = validateTeachingPresentation(p, pres);
  const j = p.steps[0].justification as any;

  console.log(`  Form ${form}: ${j.lhsBefore} = ${j.rhsBefore} → ${j.operation} ${j.operand} → ${j.lhsAfter} = ${j.rhsAfter}`);
  console.log(`    ${valid.length === 0 ? "✓ valid" : "✗ " + valid.join("; ")}`);
}

// ── lneg (negative coefficient / subtraction variations) ──
console.log("\n─── Step 8: Two-Step with Negatives (lneg) ───");
for (const [ta, tb, tx] of [[2, 3, 4], [3, -5, 7], [4, 6, 2]]) {
  const p = makeProblem("lneg", [ta, tb, tx]);
  const pres = teachingPresentationFrom({
    module: makeModule("lneg", "Two-step linear equations (negative)"),
    screen: makeScreen(p), problem: p, question: makeQuestion(p),
    practiceIds: ["p1"],
  });
  const valid = validateTeachingPresentation(p, pres);
  const trhs = ta * tx + tb;
  const subCheck = ta * Number(p.answer) + tb === trhs;

  console.log(`  ${ta}x + ${tb} = ${trhs}, x=${tx}: ${valid.length === 0 ? "✓" : "✗ " + valid.join("; ")} ${subCheck ? "(sub ✓)" : "(sub ✗)"}`);

  if (pres.workedExample) {
    for (const step of pres.workedExample.steps) {
      console.log(`    ${step.explanation.substring(0, 80)}${step.explanation.length > 80 ? "..." : ""}`);
    }
  }
}

console.log("\n═══════════════════════════════════════════════════════════════════");
console.log("  Demo B complete: linear equation 3x + 7 = 19 and variations");
console.log("═══════════════════════════════════════════════════════════════════");
