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
import { SHOWN, brief, drive, reloads, start, unitKey, type Step } from "./evid-driver";

useReviewFixture({ items: [], releasedAt: "2025-01-01T00:00:00Z", all: true });
const CASES: [string, string][] = [
  ["MATH.algebra.linear-intro", "one-step.x-minus-a@1"],
  ["MATH.algebra.missing-number", "missing.n-minus-box@1"],
  ["MATH.number.fraction-comparison", "fraction.compare-same-top@1"],
  ["MATH.geometry.triangle-properties", "triangle-properties.exterior-angle@1"],
];
for (const [c, weak] of CASES) {
  test(`${c}: wrong on ${weak}, right on the rest: never shown on your own, no delayed check while not shown; reload agrees`, () => {
    const s = start(`evid-weak-${weak}`, c);
    const isWeak = (q: string) => unitKey(c, q) === weak;
    let weakWrongSinceRight = false;
    const all: Step[] = [];
    const onStep = (t: Step) => {
      if (t.q && isWeak(t.q)) weakWrongSinceRight = !t.right;
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
      const ev = s.state().evidence(c);
      assert.ok(!SHOWN.includes(ev.status), `${ev.status} after gap ${gap}:\n${brief(all)}`);
      assert.notEqual(ev.retention, "due");
      void r;
      reloads(s, c);
    }
  });
}
