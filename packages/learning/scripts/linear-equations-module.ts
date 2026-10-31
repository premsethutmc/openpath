/**
 * Workstream A3: writes the linear-equations teaching module (MATH.algebra.linear-equations) into content/learning/modules.v1.json.
 * The module stands in for the one the template built from family `lin` (content.ts: an authored module replaces a synthesised one);
 * its questions still come from the competency's families (lin, lboth, lbrk, auleq, aulwp).
 *
 * Every worked example is the family's own instance teaching (teaching-contract@1: steps, arithmetic claims and result machine-checked);
 * every misconception section quotes the family's own diagnosis of its question (so explanation-review@1 reads which misconception it
 * addresses). Rechecks are fresh questions of the same family (never the worked example), and a misconception explanation's recheck is a
 * question on which that misconception predicts a different answer.
 *
 *   node --import tsx packages/learning/scripts/linear-equations-module.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exposureKey, FAMILIES, phasePool, problemOf, type Problem } from "../src/families";
import { selectable } from "../src/question-status";
import type { Module, Screen, Strategy } from "../src/content";

const C = "MATH.algebra.linear-equations";
const root = join(import.meta.dirname, "../../../content/learning");
const file = join(root, "modules.v1.json");
const data = JSON.parse(readFileSync(file, "utf8")) as { modules: Module[] };
const library = JSON.parse(readFileSync(join(root, "library.v1.json"), "utf8")) as { modules: Module[] };
const previous = data.modules.find((m) => m.competency === C) ?? library.modules.find((m) => m.competency === C);
if (!previous) throw new Error("no current linear-equations module to start from");

const P = (id: string): Problem => { const p = problemOf(id); if (!p) throw new Error(`not a question: ${id}`); return p; };
const own = (p: Problem) => FAMILIES.get(p.family)!.teach!.instance!(p.params);
/** The worked solution as the learner sees it in a lesson: each line, then why it holds (the family's own reason for that step). */
const workedLines = (p: Problem) => own(p).worked.steps.flatMap((s) => (s.expression.startsWith("Check") ? [s.expression] : [s.expression, s.explanation]));
/** The last screen of every explanation: the opportunity to practise alone (the guided question follows). */
const yourTurn = (p: Problem): Screen => ({ title: "Your turn", text: ["Now solve one on your own. Check your answer in the original equation."], role: "strategy", instance: p.id });
const eq = (p: Problem) => p.prompt.replace(/^Solve /, "").replace(/\. What is x\?$/, "").replace(/^Find x: /, "").replace(/\.$/, "");

// the questions the module already uses (kept as they are), and every question taught or used as a recheck: none is used twice
// (idempotent: the two practice questions this script adds are left out and drawn again)
const kept = { diagnostics: previous.diagnostics, practice: previous.practice.filter((x) => !/^gen:(lboth|lbrk):/.test(x)), transfer: previous.transfer, retention: previous.retention };
const used = new Set<string>([...kept.diagnostics, ...kept.practice, ...kept.transfer, ...kept.retention].map(exposureKey));
const claim = (id: string) => { if (used.has(exposureKey(id))) throw new Error(`used twice: ${id}`); used.add(exposureKey(id)); return id; };
/** A fresh question of a family's phase pool (typed), optionally one on which a given misconception predicts a different answer. */
/** A different question from a worked example: another answer and another number of x's (not a near-copy). */
const unlike = (q: Problem, examples: Problem[]) => examples.every((e) => q.answer !== e.answer && q.params[0] !== e.params[0]);
/** Close to another question of the same kind: two of its numbers the same, or the same answer with the same number of x's
 *  (3(x − 3) = 2x + 2 and 3(x − 2) = 2x + 5). */
const nearCopy = (q: Problem, e: Problem) => q.family === e.family && ((q.answer === e.answer && q.params[0] === e.params[0]) || q.params.filter((v, i) => v === e.params[i]).length >= 2);
/** every worked example anywhere in the module, and every question used to practise or recheck: none may be a near-copy of the other kind */
const examplesAll: Problem[] = [], rechecksAll: Problem[] = [];
/** The misconception predicts an answer of its own here: not the right one, not another misconception's, and not next to the right one. */
const tells = (q: Problem, bug: string) => { const b = q.bugs.find((x) => x.id === bug); return !!b && b.predict !== null && String(b.predict) !== q.answer && Math.abs(Number(b.predict) - Number(q.answer)) >= 2 && !q.bugs.some((o) => o.id !== bug && o.predict === b.predict); };
function fresh(family: string, phase: "practice" | "check", bug?: string, prefer?: (p: Problem) => boolean, examples: Problem[] = []): string {
  const ok = (x: string) => selectable(x) && !used.has(exposureKey(x)) && unlike(P(x), examples) && !examplesAll.some((e) => nearCopy(P(x), e)) && !rechecksAll.some((r) => nearCopy(P(x), r)) && (!bug || tells(P(x), bug));
  const ids = phasePool(family, phase).map((x) => x.replace(/:mc$/, ""));
  const id = ids.find((x) => ok(x) && (!prefer || prefer(P(x)))) ?? ids.find(ok);
  if (!id) throw new Error(`no fresh ${phase} question in ${family}${bug ? ` for ${bug}` : ""}`);
  rechecksAll.push(P(id));
  return claim(id);
}
const specificExamples: Problem[] = [];
/** An example question of a family with a given misconception predicted (unambiguously, above 0), not used elsewhere, and not with the same
 *  number of x's as another misconception's example. */
function exampleFor(family: string, bug: string, prefer?: (p: Problem) => boolean): Problem {
  const ids = [...phasePool(family, "practice"), ...phasePool(family, "retention")].map((x) => x.replace(/:mc$/, "")).filter((x) => selectable(x) && !used.has(exposureKey(x)));
  const ok = (x: string) => tells(P(x), bug) && Number(P(x).bugs.find((b) => b.id === bug)!.predict) > 0 && !specificExamples.some((e) => e.params[0] === P(x).params[0] && e.family === P(x).family) && !rechecksAll.some((r) => nearCopy(P(x), r)) && !examplesAll.some((e) => nearCopy(P(x), e));
  const id = ids.find((x) => ok(x) && (!prefer || prefer(P(x)))) ?? ids.find(ok);
  if (!id) throw new Error(`no example of ${bug} in ${family}`);
  const p = P(claim(id));
  specificExamples.push(p);
  examplesAll.push(p);
  return p;
}

// ---------------------------------------------------------------- the worked examples named in the teaching sequence
const twoStep = P(claim("gen:lin:2,5,6")); // 2x + 5 = 17
const both = P(claim("gen:lboth:3,4,1,4")); // 3x + 4 = x + 12
const brk = P(claim("gen:lbrk:3,-2,2,11")); // 3(x − 2) = 2x + 5
const oneAdd = P(claim("gen:ahone:1,4,15")); // x − 4 = 11 (one-step equations are linear-intro: shown as the bridge, not rechecked here)
const oneMul = P(claim("gen:ahone:2,5,7")); // 5x = 35
const twoStep2 = P(claim("gen:lin:3,4,5")); // 3x + 4 = 19
examplesAll.push(twoStep, both, brk, twoStep2);

const chapter: Screen[] = [
  {
    title: "What an equation says",
    text: [
      "An equation says that two amounts are equal. 2x + 5 = 17 means: 2 lots of a number, plus 5, is the same amount as 17.",
      "Think of a balance. If you do the same thing to both sides, it stays level. That is why each step of solving keeps the equation true, and why the answer can be checked by putting it back in.",
    ],
    role: "concept",
    instance: twoStep.id,
  },
  ...previous.chapter.slice(1),
];

const general: Strategy[] = [
  {
    id: "balance",
    title: "Keep the balance",
    kind: "procedural",
    needs: [],
    screens: [
      { title: "Do the same to both sides", text: [`In ${eq(oneAdd)}, the two sides balance. Add 4 to both sides: the − 4 is undone and the sides still balance.`], math: ["x − 4 = 11", "x − 4 + 4 = 11 + 4", "Add 4 to both sides: − 4 + 4 is 0.", "x = 15", "Check: 15 − 4 = 11"], role: "strategy", instance: oneAdd.id },
      { title: "Undo × with ÷", text: [`${eq(oneMul)}: 5x means 5 × x. Divide both sides by 5 to undo the × 5.`], math: ["5x = 35", "5x ÷ 5 = 35 ÷ 5", "Divide both sides by 5.", "x = 7", "Check: 5 × 7 = 35"], role: "strategy", instance: oneMul.id },
      { title: "Two steps: undo the last one first", text: [`In ${eq(twoStep2)}, x was multiplied by 3 and then 4 was added. Undo the + 4 first, then the × 3, each time on both sides.`], math: workedLines(twoStep2), role: "worked-example", instance: twoStep2.id },
      yourTurn(twoStep2),
    ],
    guided: fresh("lin", "practice", undefined, undefined, [twoStep2]),
    check: fresh("lin", "check", undefined, undefined, [twoStep2]),
  },
  {
    id: "two_steps",
    title: "Undo one step at a time",
    kind: "procedural",
    needs: [],
    screens: [
      { title: "What you are finding", text: [`You want the number x that makes ${eq(twoStep)} true.`, "2x + 5 means: multiply x by 2, then add 5. To get x back, undo those in reverse order: first the + 5, then the × 2."], role: "strategy", instance: twoStep.id },
      { title: `Solve ${eq(twoStep)}`, text: ["Each line does the same to both sides, so the two sides stay equal and the solution does not change."], math: workedLines(twoStep), role: "worked-example", instance: twoStep.id },
      { title: "Check in the original equation", text: ["Always check in the equation you were given. If you check in a later line, a mistake you made before it will not show up."], role: "strategy", instance: twoStep.id },
      yourTurn(twoStep),
    ],
    guided: fresh("lin", "practice", undefined, undefined, [twoStep]),
    check: fresh("lin", "check", undefined, undefined, [twoStep]),
  },
  {
    id: "both_sides",
    title: "x on both sides",
    kind: "procedural",
    needs: [],
    screens: [
      { title: "Why you may move x's", text: [`In ${eq(both)} both sides contain x. Taking x from both sides keeps them equal, just as taking a number from both sides does.`, "Every line changes both sides in the same way, so every line has the same solution as the first."], role: "strategy", instance: both.id },
      { title: `Solve ${eq(both)}`, text: ["Collect the x's on the side with more of them, then the numbers on the other side."], math: workedLines(both), role: "worked-example", instance: both.id },
      { title: "Check both sides", text: ["Put your answer into both sides of the original equation: the two sides must give the same number."], role: "strategy", instance: both.id },
      yourTurn(both),
    ],
    guided: fresh("lboth", "practice", undefined, undefined, [both]),
    check: fresh("lboth", "check", undefined, undefined, [both]),
  },
  {
    id: "brackets",
    title: "Multiply out the bracket first",
    kind: "procedural",
    needs: [],
    screens: [
      { title: "What the bracket means", text: [`${eq(brk)}: the 3 multiplies everything inside the bracket, so 3(x − 2) is 3x − 6, not 3x − 2.`, "Multiply out first. Then it is an equation with x on both sides."], role: "strategy", instance: brk.id },
      { title: `Solve ${eq(brk)}`, text: ["Multiply out, collect the x's, then the numbers, doing the same to both sides each time."], math: workedLines(brk), role: "worked-example", instance: brk.id },
      { title: "Check with the bracket", text: ["Check in the original equation, with the bracket: work out the bracket first, then multiply."], role: "strategy", instance: brk.id },
      yourTurn(brk),
    ],
    guided: fresh("lbrk", "practice", undefined, undefined, [brk]),
    check: fresh("lbrk", "check", undefined, undefined, [brk]),
  },
];

/** A misconception-specific explanation: the mistake on one question (the family's own diagnosis), the fix, and that question solved. */
function mistake(id: string, title: string, family: string, bug: string, fix: string, prefer?: (p: Problem) => boolean): Strategy {
  const p = exampleFor(family, bug, prefer);
  const b = p.bugs.find((x) => x.id === bug)!;
  const wrong = String(b.predict).replace(/^-/, "−");
  return {
    id,
    title,
    kind: b.kind === "conceptual" ? "conceptual" : "procedural",
    needs: [],
    screens: [
      { title: "What went wrong", text: [`In ${eq(p)}, one wrong answer is ${wrong}.`, b.says, fix], math: [`Not ${wrong}, but ${p.answer}`], role: "misconception", instance: p.id },
      { title: `Solve ${eq(p)} correctly`, text: ["Every line does the same to both sides; the check uses the original equation."], math: workedLines(p), role: "worked-example", instance: p.id },
      yourTurn(p),
    ],
    guided: fresh(family, "practice", bug, prefer, [p]),
    check: fresh(family, "check", bug, (q) => (!prefer || prefer(q)) && q.params[0] >= 3, [p]),
  };
}
const specific: Strategy[] = [
  mistake("fix_finish", "Finish by dividing", "lin", "forgot-divide", "x is not on its own until the number multiplying it has been divided out, on both sides."),
  mistake("fix_inverse", "Undo with the opposite operation", "lin", "added-not-subtracted", "To undo + a number, take it away from both sides; to undo × a number, divide both sides by it."),
  mistake("fix_divide_all", "Divide the whole side", "lin", "divided-first", "Dividing both sides is allowed, but it must divide every term of each side."),
  mistake("fix_one_side", "Change both sides", "lboth", "only-one-side", "An equation stays true only if both sides change in the same way."),
  mistake("fix_sign_move", "Taking away an x term", "lboth", "x-sign-kept", "Moving a term to the other side means taking it from both sides, so its sign changes."),
  mistake("fix_number_sign", "Taking away a number", "lboth", "number-sign-kept", "Moving a number to the other side means taking it from both sides, so its sign changes."),
  mistake("fix_distribution", "Multiply every term in the bracket", "lbrk", "first-term-only", "The number outside a bracket multiplies each term inside it."),
  mistake("fix_bracket_sign", "Keep the sign in the bracket", "lbrk", "bracket-sign", "Multiply the sign too: a positive number times a negative number is negative.", (p) => p.params[1] < 0),
];

// two extra practice questions for the new kinds of equation; the rest of the module's questions are unchanged
const module: Module = {
  ...previous,
  title: "Solve linear equations",
  chapter,
  // general explanations first (the lesson page's order: A–E, then the mistakes); the engine still offers an explanation of an
  // established misconception before a general one (intervention.orderStrategies)
  strategies: [...general, ...specific],
  practice: [...kept.practice, fresh("lboth", "practice"), fresh("lbrk", "practice")],
  probes: [],
} as Module;
for (const k of ["pool", "pools", "provenance", "written"] as const) delete (module as unknown as Record<string, unknown>)[k];
const i = data.modules.findIndex((m) => m.competency === C);
if (i >= 0) data.modules[i] = module; else data.modules.push(module);
writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
console.log(`linear-equations module: ${module.strategies.length} explanations (${specific.length} misconception-specific), chapter ${chapter.length} screens`);
