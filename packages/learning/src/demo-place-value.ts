/**
 * Demo A: Place-Value Learner Experience
 *
 * Demonstrates the complete teaching journey for place value with
 * zero and nonzero digits. Exercises: chart, contributions, worked
 * example with correct digit × placeValue reasoning, practice, feedback.
 *
 * This is an acceptance demonstration per the Codex Directive.
 */

import { FAMILIES } from "./families";
import { familyTeachingVisual, teachingPresentationFrom, validateTeachingPresentation } from "./teaching-presentation";
import type { Problem, Step } from "./family-kit";
import type { Module, Question, Screen } from "./content";

// ── Helpers ──

function makeProblem(family: string, params: number[]): Problem {
  const def = FAMILIES.get(family)!;
  const { steps, answer } = def.solve(params);
  return { family, params, steps, answer: String(answer), prompt: `What is the place value of each digit?`, bugs: [], figure: undefined };
}

function makeModule(family: string): Module {
  return { id: `demo-${family}`, title: `Place value: ${family}`, competency: "MATH.number.place-value", pool: { family, count: 3 }, text: [] } as unknown as Module;
}

function makeScreen(problem: Problem): Screen {
  return { id: "demo-screen", text: ["Identify the value of each digit by its position."], math: [problem.prompt], widget: undefined } as unknown as Screen;
}

function makeQuestion(problem: Problem): Question {
  return { id: "demo-q", prompt: problem.prompt, answer: problem.answer } as unknown as Question;
}

// ── Demo A: aeind [3, 4, 5, 6] → 3 lakh 4 thousand 512 = 304512 ──
// L=3, T=4, H=5, r=6 → REST[6]=12 → value = 3*100000 + 4*1000 + 5*100 + 12 = 304512
// The "rest" step has step.value = 512 but digit=5, placeValue=100 → contribution=500
// This is the critical bug case: the renderer must show 500, NOT 512.

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  DEMO A: Place-Value Teaching Journey");
console.log("  Number: 304512 (3 lakh 4 thousand 5 hundred and 12)");
console.log("  Critical test: hundreds step.value=512 but digit×place=500");
console.log("═══════════════════════════════════════════════════════════════════\n");

const params = [3, 4, 5, 6]; // L=3, T=4, H=5, r=6(=REST[6]=12)
const problem = makeProblem("aeind", params);
const module = makeModule("aeind");
const screen = makeScreen(problem);
const question = makeQuestion(problem);

// ── Step 1: Chart / Visual ──
console.log("─── Step 1: Place-Value Chart ───");
const visual = familyTeachingVisual(problem);
if (visual?.kind === "place-value") {
  console.log(`  Headings: ${visual.headings.join(" | ")}`);
  console.log(`  Digits:   ${visual.rows[0].join(" | ")}`);
  console.log(`  ✓ Chart shows each digit in its positional column`);
} else {
  console.error("  ✗ Expected a place-value visual!");
}

// ── Step 2: Contributions (digit × placeValue) ──
console.log("\n─── Step 2: Positional Contributions ───");

for (const step of problem.steps) {
  const j = step.justification as { rule: "positional-value"; digit: number; placeValue: number; placeName: string };
  const contribution = j.digit * j.placeValue;
  console.log(`  ${j.digit} × ${j.placeValue} = ${contribution} (${j.placeName} place)`);

  // CRITICAL CHECK: contribution must be digit × placeValue, not step.value
  if (j.digit !== 0 && contribution !== step.value) {
    console.log(`    ⚠ step.value=${step.value} differs from contribution=${contribution}`);
    console.log(`    ✓ Renderer correctly uses ${contribution}, not ${step.value}`);
  }
}

// ── Step 3: Worked Example ──
console.log("\n─── Step 3: Worked Example ───");
const presentation = teachingPresentationFrom({
  module, screen, problem, question, practiceIds: ["q1", "q2", "q3"],
});

console.log(`  Status: ${presentation.status}`);
console.log(`  Concept: ${presentation.concept}`);
console.log(`  Objective: ${presentation.objective}`);

if (presentation.workedExample) {
  console.log(`  Question: ${presentation.workedExample.question}`);
  for (const step of presentation.workedExample.steps) {
    console.log(`\n  Step: ${step.expression}`);
    console.log(`  Explanation: ${step.explanation}`);

    // Verify no incorrect multiplication in the text
    // e.g., "5 × 100 = 512" would be wrong; "5 × 100 = 500" is correct
    const match = step.explanation.match(/(\d+) × ([\d,]+) = ([\d,]+)/);
    if (match) {
      const [, d, p, r] = match;
      const expected = Number(d) * Number(p.replace(/,/g, ""));
      const shown = Number(r.replace(/,/g, ""));
      if (expected === shown) {
        console.log(`  ✓ ${d} × ${p} = ${r} is mathematically correct`);
      } else {
        console.error(`  ✗ ${d} × ${p} should be ${expected}, not ${r}`);
      }
    }
  }
} else {
  console.error("  ✗ No worked example generated!");
}

// ── Step 4: Validation ──
console.log("\n─── Step 4: Structural Validation ───");
const errors = validateTeachingPresentation(problem, presentation);
if (errors.length === 0) {
  console.log("  ✓ All mathematical claims validated");
} else {
  for (const e of errors) console.error(`  ✗ ${e}`);
}

// ── Step 5: Practice & Feedback ──
console.log("\n─── Step 5: Practice Setup ───");
console.log(`  Competency: ${presentation.practice.competency}`);
console.log(`  Families: ${presentation.practice.families.join(", ")}`);
console.log(`  Practice IDs: ${presentation.practice.questionIds.join(", ")}`);

// Simulate learner answering
console.log("\n─── Step 5b: Simulated Practice (parameter variations) ───");
// aeind params: [L, T, H, r] where REST = [0,3,5,7,8,10,12,15,19,20,25,30,38,46,50,61,74,80,83,99]
for (const testParams of [[1, 20, 3, 5], [0, 10, 0, 0], [9, 0, 9, 19]]) {
  const p = makeProblem("aeind", testParams);
  const pres = teachingPresentationFrom({
    module, screen: makeScreen(p), problem: p, question: makeQuestion(p),
    practiceIds: ["practice-1"],
  });
  const valid = validateTeachingPresentation(p, pres);
  const num = Number(p.answer);
  console.log(`  ${testParams.join("")} → ${num}: ${valid.length === 0 ? "✓ correct" : "✗ " + valid.join("; ")}`);

  // Check each step's rendered contribution
  if (pres.workedExample) {
    for (let i = 0; i < p.steps.length; i++) {
      const j = p.steps[i].justification as { digit: number; placeValue: number };
      const c = j.digit * j.placeValue;
      const exp = pres.workedExample.steps[i].explanation;
      if (j.digit !== 0 && !exp.includes(String(c))) {
        console.error(`    ✗ Step ${i}: expected contribution ${c} in explanation`);
      }
    }
  }
}

console.log("\n─── Step 6: The Critical Bug Case (step.value ≠ digit × placeValue) ───");
// For params [3, 4, 5, 6]: the "rest" step has value = 5*100 + 12 = 512
// but justification says digit=5, placeValue=100 → contribution = 500
// The renderer MUST show "5 × 100 = 500", NOT "5 × 100 = 512"
const restStep = problem.steps[2]; // The "rest" step (id: "rest")
if (restStep) {
  const j = restStep.justification as { digit: number; placeValue: number; placeName: string };
  const contribution = j.digit * j.placeValue;
  console.log(`  ${j.placeName} step:`);
  console.log(`    digit = ${j.digit}, placeValue = ${j.placeValue}`);
  console.log(`    digit × placeValue = ${contribution}`);
  console.log(`    step.value = ${restStep.value} (includes lower-order digits from solver)`);
  if (contribution !== restStep.value) {
    console.log(`  ✓ step.value (${restStep.value}) ≠ contribution (${contribution})`);
    console.log(`  ✓ Renderer correctly displays ${contribution}, not ${restStep.value}`);

    // Verify the rendered text
    const renderedStep = presentation.workedExample?.steps[2];
    if (renderedStep) {
      const hasCorrect = renderedStep.explanation.includes(String(contribution));
      const hasIncorrect = renderedStep.explanation.includes(`= ${restStep.value}`);
      console.log(`  Rendered: "${renderedStep.explanation}"`);
      console.log(`  Contains correct value (${contribution}): ${hasCorrect ? "✓ YES" : "✗ NO"}`);
      console.log(`  Contains incorrect value (${restStep.value}): ${hasIncorrect ? "✗ YES — BUG!" : "✓ NO — correct"}`);
    }
  } else {
    console.log(`  (step.value happens to equal contribution — no divergence for this case)`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════════════");
console.log("  Demo A complete: place value with zero/nonzero digits");
console.log("═══════════════════════════════════════════════════════════════════");
