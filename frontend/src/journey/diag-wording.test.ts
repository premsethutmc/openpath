/**
 * Diagnosis worker (m112): what the app tells a learner about WHY, on journeys where the learner's answers have not
 * established it. Synthetic learners only; the engine asks, recovers and teaches.
 *
 * 1. Equations (fixed here, reasoning.ts): two answers on x ÷ 2 = 12 and x ÷ 2 = 18 that a modelled mix-up predicts, no contrast
 *    evidence, reading still "need more". Recovery and the module said "Not sure yet. It could be: 2 was added to 12; undoing ÷ 2
 *    needs × 2." — telling the learner what they did. Now the uncertain reading names no cause and keeps the mathematics.
 * 2. Lesson introduction (proposal diagnosis-2, intervention.ts diagnosisReason): the same learner's lesson opens "You have the idea;
 *    a step in the method slips." straight after recovery said it was not sure why. TODO until the proposal is applied.
 * 3. Addition (proposal diagnosis-1, family content): two no-regroup answers on two-digit story sums (aastadd) are taught
 *    "Use a ten when it helps" (MATH.number.addition: "no full ten is needed … 5 + 2 = 7"), not carrying.
 *    TODO until the proposal is applied (and, for the module path, a moduleState change: see the report).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { runScenario, type Run } from "./scenarios";
import { misconception, right, type Learner } from "./learners";
import { problemOf } from "../../../packages/learning/src/families";
import { misconceptionOf, moduleFor, question } from "../../../packages/learning/src/content";
import { contrastBacked } from "../../../packages/learning/src/reasoning";
import { principleOf } from "../../../packages/learning/src/answer-feedback";
import { graph } from "../../../packages/learning/src/graph";

const famIs = (f: string) => (q: string) => problemOf(q.replace(/:(mc|w)$/, ""))?.family === f;
const mixup = (on: (q: string) => boolean, ids: string[]): Learner => ({ name: "mixup", act: (v) => ({ answer: v.taught === 0 && on(v.q) ? (misconception(v.q, new Set(ids)) ?? right(v.q)) : right(v.q) }) });
/** every sentence the learner reads about what comes next and why (recovery and module reasons) */
const reasons = (r: Run) => r.f.session.trace.filter((t) => t.component === "intervention.recovery" || t.component === "intervention.moduleState").map((t) => (t.output as { reason: string }).reason);
/** the cause part of each modelled explanation the learner's wrong answers matched, where no contrast evidence backs it */
const unbackedClaims = (r: Run) => {
  const out = new Set<string>();
  for (const a of r.f.session.events.filter((e) => (e as { record?: string }).record === "attempt") as unknown as { questionId: string; response: string }[]) {
    const q = question(a.questionId), m = misconceptionOf(q, a.response);
    if (!m) continue;
    const ids = (problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.bugs ?? []).map((b) => b.id).filter((b) => misconception(a.questionId, new Set([b])) === a.response);
    if (ids.some((b) => contrastBacked(a.questionId, b))) continue;
    const principle = (principleOf(m.says) ?? "").toLowerCase();
    for (const c of m.says.split(/(?<=[.;:])\s+/)) if (c.trim() && !principle.includes(c.trim().replace(/[.;:]$/, "").toLowerCase())) out.add(c.trim().replace(/[.;:]$/, "").toLowerCase());
  }
  return [...out];
};
const LIN = () => runScenario({ id: "diag-word-lin", category: 2, start: "gen:ahone:2,4,12", entry: "practice", expect: {}, learner: () => mixup(famIs("ahone"), ["add-for-multiply"]) });

test("equations: an uncertain reading does not tell the learner what they did, and keeps the mathematics", () => {
  const r = LIN();
  const claims = unbackedClaims(r), said = reasons(r);
  assert.ok(claims.length > 0, "the learner's answers matched a modelled mix-up");
  for (const c of claims) for (const s of said) assert.ok(!s.toLowerCase().includes(c), `"${c}" is told to the learner: ${s}`);
  // still useful: the uncertain reading carries the step to check
  assert.ok(said.some((s) => /Not sure yet/.test(s) && /Undoing ÷ 2 needs × 2/.test(s)), said.filter((s) => /Not sure/.test(s)).join(" | "));
});

test("equations: the lesson introduction does not claim a kind of difficulty the answers have not shown", { todo: "proposal diagnosis-2 (intervention.ts diagnosisReason)" }, () => {
  const r = LIN();
  for (const s of reasons(r)) assert.doesNotMatch(s, /You have the idea|The method is fine|Your answers suggest the idea itself/, s);
});

test("addition: two no-regroup answers on two-digit sums are taught carrying, not 'Use a ten when it helps' within 20", { todo: "proposal diagnosis-1 (no-regroup belongs to MATH.number.addition-regroup); needs regeneration" }, () => {
  for (const entry of ["practice", "diagnostic"] as const) {
    const r = runScenario({ id: `diag-word-add-${entry}`, category: 2, start: "gen:aastadd:1,7", entry, expect: {}, learner: () => mixup(famIs("aastadd"), ["no-regroup"]) });
    const taught = (r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string }[]);
    assert.ok(taught.length >= 1, `${entry}: something was taught`);
    const first = taught[0], s = moduleFor(first.competency)!.strategies.find((x) => x.id === first.strategy)!;
    assert.equal(graph.evidenceTarget(first.competency), "MATH.number.addition-regroup", `${entry}: taught ${first.competency} · ${first.strategy}`);
    assert.ok(s.screens.some((x) => /carry/i.test(x.text)), `${entry}: the lesson shows carrying`);
  }
});
