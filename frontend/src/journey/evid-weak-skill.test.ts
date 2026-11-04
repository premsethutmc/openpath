/**
 * Consolidation #112, evidence worker. A weak skill gains no credit from the competency's other skills, on the real app path (SliceSession:
 * real grader, engine, records and replay; the engine chooses every question and lesson). The learner is wrong on every question of one
 * skill and right on everything else, through teaching, two week-long gaps and the delayed checks the engine offers.
 *   - once the weak skill's answer alone is wrong (and none right since), the status never reads independent / transfer / verified;
 *   - no delayed check is offered (retention "due", or a "retention" step) while the competency is not shown on your own: "a week after
 *     you first showed this" would not be true (was: the weak learner was sent to a delayed check and then marked "Review needed");
 *   - a reload from the saved JSON gives the same status, retention history and next step.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { pool, problemOf } from "../../../packages/learning/src/families";
import { question } from "../../../packages/learning/src/content";
import { SHOWN, brief, drive, reloads, start, unitKey, type Step } from "./evid-driver";

useReviewFixture({ items: [], releasedAt: "2025-01-01T00:00:00Z", all: true });
const CASES: [string, string][] = [
  ["MATH.algebra.linear-intro", "one-step.x-minus-a@1"],
  ["MATH.algebra.missing-number", "missing.n-minus-box@1"],
  ["MATH.number.fraction-comparison", "fraction.compare-same-top@1"],
  ["MATH.geometry.triangle-properties", "triangle-properties.exterior-angle@1"],
  // a sub-skill with no scoped explanation, so no skill unit: isosceles triangles (family ahiso; Diagnosis worker's finding)
  ["MATH.geometry.triangle-properties", "family:ahiso"],
];
for (const [c, weak] of CASES) {
  test(`${c}: wrong on ${weak}, right on the rest: never shown on your own, no delayed check while not shown; reload agrees`, () => {
    const s = start(`evid-weak-${weak}`, c);
    const isWeak = (q: string) => (weak.startsWith("family:") ? problemOf(q.replace(/:(mc|w)$/, ""))?.family === weak.slice(7) : unitKey(c, q) === weak);
    let weakWrongSinceRight = false, weakWrong = 0;
    const all: Step[] = [];
    // a question family outside every skill unit holds the status from its second wrong answer alone: one unexplained slip after
    // the skill is shown changes nothing (policy A1, policies.test.ts); a declared skill unit holds from its first (#113)
    const holdFrom = weak.startsWith("family:") ? 2 : 1;
    const onStep = (t: Step) => {
      if (t.q && isWeak(t.q)) { weakWrong = t.right ? 0 : weakWrong + 1; weakWrongSinceRight = !t.right && weakWrong >= holdFrom; }
      if (weakWrongSinceRight) assert.ok(!SHOWN.includes(t.status), `status ${t.status} with the weak skill wrong and none right since:\n${brief(all)}`);
      if (!SHOWN.includes(t.status)) assert.notEqual(t.retention, "due", `a delayed check is due while the status is ${t.status}:\n${brief(all)}`);
    };
    for (const gap of [0, 8, 8]) {
      if (gap) s.wait(gap);
      const before = all.length;
      const r = drive(s, c, { right: (q) => !isWeak(q) }, all, gap ? 25 : 60, { answerRetention: true, onStep });
      for (const t of all.slice(before)) {
        if (t.phase === "retention") assert.ok(SHOWN.includes(all[all.indexOf(t) - 1]?.status ?? ""), `delayed check offered while not shown:\n${brief(all)}`);
      }
      assert.ok(all.some((t) => t.q && isWeak(t.q) && !t.right), `the engine asks the weak skill:\n${brief(all)}`);
      // policy A1: one unexplained slip on a family outside every unit changes nothing, so the engine may not ask it again; a second
      // wrong answer alone on that family (here given directly) then holds the competency below "shown on your own"
      if (weak.startsWith("family:") && weakWrong < holdFrom) {
        const met = new Set(all.flatMap((t) => (t.q ? [t.q.replace(/:(mc|w)$/, "")] : [])));
        const q2 = pool(weak.slice(7)).items.map((p) => p.id).find((id) => !met.has(id))!;
        s.submit(q2, String(Number(question(q2).answer) + 7), "practice");
      }
      const ev = s.state().evidence(c);
      assert.ok(!SHOWN.includes(ev.status), `${ev.status} after gap ${gap}:\n${brief(all)}`);
      assert.notEqual(ev.retention, "due");
      void r;
      reloads(s, c);
    }
  });
}
