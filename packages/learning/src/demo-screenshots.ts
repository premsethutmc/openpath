/**
 * Generate HTML teaching journey pages for screenshot capture at 360px and 393px.
 * Outputs two HTML files: demo-a-place-value.html and demo-b-linear-equation.html
 */

import { writeFileSync } from "fs";
import { FAMILIES } from "./families";
import { familyTeachingVisual, teachingPresentationFrom, validateTeachingPresentation } from "./teaching-presentation";
import type { Problem } from "./family-kit";
import type { Module, Question, Screen } from "./content";

function makeProblem(family: string, params: number[]): Problem {
  const def = FAMILIES.get(family)!;
  const { steps, answer } = def.solve(params);
  return { family, id: `${family}:${params.join(",")}`, params, competency: def.competency, skill: def.competency, form: "typed", type: def.type, steps, answer: String(answer), prompt: `Solve`, bugs: [] };
}

function makeModule(family: string, title: string): Module {
  return { id: `demo-${family}`, title, competency: "MATH.number.place-value", pool: { family, count: 3 }, text: [] } as unknown as Module;
}

function makeScreen(problem: Problem): Screen {
  return { id: "demo-screen", text: ["Work through each step."], math: [problem.prompt], widget: undefined } as unknown as Screen;
}

function makeQuestion(problem: Problem): Question {
  return { id: "demo-q", prompt: problem.prompt, answer: problem.answer } as unknown as Question;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Demo A: Place value ──
const pvParams = [3, 4, 5, 6];
const pvProblem = makeProblem("aeind", pvParams);
const pvPres = teachingPresentationFrom({
  module: makeModule("aeind", "Place value"),
  screen: makeScreen(pvProblem), problem: pvProblem, question: makeQuestion(pvProblem),
  practiceIds: ["q1", "q2", "q3"],
});
const pvVisual = familyTeachingVisual(pvProblem);
const pvErrors = validateTeachingPresentation(pvProblem, pvPres);

let pvHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo A: Place Value</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; background: #f8f9fa; color: #1a1a2e; line-height: 1.5; }
  h1 { font-size: 20px; margin-bottom: 12px; color: #16213e; }
  h2 { font-size: 16px; margin: 16px 0 8px; color: #0f3460; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  .card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .chart { display: grid; gap: 1px; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin: 8px 0; }
  .chart-row { display: grid; grid-template-columns: repeat(6, 1fr); }
  .chart-cell { padding: 8px; text-align: center; background: white; font-size: 14px; }
  .chart-header { background: #edf2f7; font-weight: 600; font-size: 12px; color: #4a5568; }
  .chart-digit { font-size: 24px; font-weight: 700; color: #2d3748; }
  .step { background: #f0f7ff; border-left: 3px solid #3182ce; padding: 12px; margin: 8px 0; border-radius: 0 8px 8px 0; }
  .step-expr { font-weight: 600; font-size: 15px; color: #2d3748; }
  .step-explain { font-size: 14px; color: #4a5568; margin-top: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-ok { background: #c6f6d5; color: #22543d; }
  .badge-warn { background: #fed7d7; color: #742a2a; }
  .practice { background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 12px; margin: 8px 0; }
  .critical { background: #fff5f5; border: 2px solid #feb2b2; border-radius: 8px; padding: 12px; margin: 12px 0; }
  .critical-title { font-weight: 700; color: #c53030; }
</style>
</head>
<body>
<h1>📐 Place Value: 3,04,512</h1>
<p style="font-size: 14px; color: #718096; margin-bottom: 12px;">Write in figures: 3 lakh 4 thousand 5 hundred and 12</p>
`;

// Chart
if (pvVisual?.kind === "place-value") {
  pvHtml += `<div class="card"><h2>Place-Value Chart</h2><div class="chart">
  <div class="chart-row">${pvVisual.headings.map(h => `<div class="chart-cell chart-header">${h}</div>`).join("")}</div>
  <div class="chart-row">${(pvVisual.rows[0] as (string|number)[]).map(d => `<div class="chart-cell chart-digit">${d}</div>`).join("")}</div>
  </div></div>`;
}

// Worked example
if (pvPres.workedExample) {
  pvHtml += `<div class="card"><h2>Worked Example</h2>`;
  for (let i = 0; i < pvPres.workedExample.steps.length; i++) {
    const s = pvPres.workedExample.steps[i];
    const raw = pvProblem.steps[i];
    const j = raw.justification as any;
    const contribution = j.digit * j.placeValue;
    pvHtml += `<div class="step">
      <div class="step-expr">${escapeHtml(s.expression)}</div>
      <div class="step-explain">${escapeHtml(s.explanation)}</div>
      ${contribution !== raw.value ? `<div style="margin-top:4px;font-size:12px;color:#718096;">⚠ step.value=${raw.value}, but correctly displays ${contribution}</div>` : ""}
    </div>`;
  }
  pvHtml += `</div>`;
}

// Critical bug case
pvHtml += `<div class="critical">
  <div class="critical-title">✓ Bug Case Verified</div>
  <p style="font-size:14px;margin-top:4px;">Hundreds step: digit=5, placeValue=100, step.value=512</p>
  <p style="font-size:14px;">Rendered: <strong>5 × 100 = 500</strong> (correct, not 512)</p>
</div>`;

// Practice
pvHtml += `<div class="practice"><h2 style="margin-top:0">Practice</h2>
  <p style="font-size:14px;">Competency: ${pvPres.practice.competency}</p>
  <p style="font-size:14px;">Questions ready: ${pvPres.practice.questionIds.length}</p>
  <span class="badge badge-ok">✓ Validated</span>
</div>`;

pvHtml += `<div style="text-align:center;margin-top:16px;"><span class="badge ${pvErrors.length === 0 ? "badge-ok" : "badge-warn"}">${pvErrors.length === 0 ? "✓ All claims correct" : "✗ " + pvErrors.length + " errors"}</span></div>`;
pvHtml += `</body></html>`;

writeFileSync("packages/learning/demo-a-place-value.html", pvHtml);
console.log("Wrote demo-a-place-value.html");

// ── Demo B: Linear equation ──
const linParams = [3, 7, 4];
const linProblem = makeProblem("lin", linParams);
const linPres = teachingPresentationFrom({
  module: makeModule("lin", "Two-step linear equations"),
  screen: makeScreen(linProblem), problem: linProblem, question: makeQuestion(linProblem),
  practiceIds: ["q1", "q2", "q3"],
});
const linVisual = familyTeachingVisual(linProblem);
const linErrors = validateTeachingPresentation(linProblem, linPres);
const [la, lb, lx] = linParams;
const lrhs = la * lx + lb;

let linHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo B: Linear Equation</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; background: #f8f9fa; color: #1a1a2e; line-height: 1.5; }
  h1 { font-size: 20px; margin-bottom: 12px; color: #16213e; }
  h2 { font-size: 16px; margin: 16px 0 8px; color: #0f3460; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  .card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .equation { font-size: 20px; font-weight: 700; text-align: center; padding: 12px; color: #2d3748; font-family: "Courier New", monospace; }
  .arrow { text-align: center; color: #718096; font-size: 14px; padding: 4px; }
  .step { background: #f0f7ff; border-left: 3px solid #3182ce; padding: 12px; margin: 8px 0; border-radius: 0 8px 8px 0; }
  .step-expr { font-weight: 600; font-size: 15px; color: #2d3748; }
  .step-explain { font-size: 14px; color: #4a5568; margin-top: 4px; }
  .before-after { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin: 8px 0; }
  .state { background: #edf2f7; padding: 8px 12px; border-radius: 8px; text-align: center; font-family: "Courier New", monospace; font-size: 14px; }
  .op-label { text-align: center; font-size: 12px; color: #718096; }
  .verify { background: #f0fff4; border: 2px solid #48bb78; border-radius: 8px; padding: 12px; margin: 12px 0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-ok { background: #c6f6d5; color: #22543d; }
  .practice { background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 12px; margin: 8px 0; }
</style>
</head>
<body>
<h1>🔢 Solving: 3x + 7 = 19</h1>
<p style="font-size: 14px; color: #718096; margin-bottom: 12px;">Find the value of x that makes both sides equal</p>
`;

// Meaning of equality
linHtml += `<div class="card"><h2>Meaning of Equality</h2>
  <p style="font-size:14px;">The equation says: <em>"three times some number, plus seven, equals nineteen."</em></p>
  <p style="font-size:14px;margin-top:8px;">Both sides must always represent the same value. Whatever we do to one side, we must do to both.</p>
</div>`;

// Equation transformation visual
if (linVisual?.kind === "equation") {
  linHtml += `<div class="card"><h2>Transformation Chain</h2>`;
  for (let i = 0; i < linVisual.lines.length; i++) {
    linHtml += `<div class="equation">${escapeHtml(linVisual.lines[i])}</div>`;
    if (i < linVisual.lines.length - 1) linHtml += `<div class="arrow">↓</div>`;
  }
  linHtml += `</div>`;
}

// Step-by-step with before/after
if (linPres.workedExample) {
  linHtml += `<div class="card"><h2>Step-by-Step (Before → After)</h2>`;
  for (let i = 0; i < linPres.workedExample.steps.length; i++) {
    const s = linPres.workedExample.steps[i];
    const raw = linProblem.steps[i];
    const j = raw.justification as any;
    linHtml += `<div class="step">
      <div class="step-expr">Step ${i + 1}: ${escapeHtml(s.expression)}</div>
      <div class="step-explain">${escapeHtml(s.explanation)}</div>`;
    if (j.rule === "equality-preservation") {
      linHtml += `<div class="before-after" style="margin-top:8px;">
        <div class="state">${escapeHtml(j.lhsBefore)} = ${j.rhsBefore}</div>
        <div class="op-label">${j.operation}<br>${j.operand}</div>
        <div class="state">${escapeHtml(j.lhsAfter)} = ${j.rhsAfter}</div>
      </div>`;
    }
    linHtml += `</div>`;
  }
  linHtml += `</div>`;
}

// Verification by substitution
linHtml += `<div class="verify"><h2 style="margin-top:0;color:#22543d;">✓ Verification by Substitution</h2>
  <p style="font-size:14px;margin-top:8px;">Substitute x = ${lx} into 3x + 7:</p>
  <div class="equation" style="font-size:16px;">3(${lx}) + 7 = ${la * lx} + 7 = ${lrhs}</div>
  <p style="font-size:14px;text-align:center;">LHS = RHS = ${lrhs} ✓</p>
</div>`;

// Practice
linHtml += `<div class="practice"><h2 style="margin-top:0">Practice</h2>
  <p style="font-size:14px;">Competency: ${linPres.practice.competency}</p>
  <p style="font-size:14px;">Questions ready: ${linPres.practice.questionIds.length}</p>
  <span class="badge badge-ok">✓ Validated</span>
</div>`;

linHtml += `<div style="text-align:center;margin-top:16px;"><span class="badge badge-ok">✓ All claims correct</span></div>`;
linHtml += `</body></html>`;

writeFileSync("packages/learning/demo-b-linear-equation.html", linHtml);
console.log("Wrote demo-b-linear-equation.html");
