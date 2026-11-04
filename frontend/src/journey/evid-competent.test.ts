/**
 * Consolidation #112, evidence worker. A competent learner is never stuck, on the real app path (SliceSession; the engine chooses every
 * question). Right on everything, or one slip on the first answer and then right on everything: "shown on your own", then the delayed
 * check the engine offers a week later, then "verified" (the review fixture stands in for educator release, as in every verified test).
 * Each week-long gap is followed by a reload from the saved JSON, which must agree.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { SHOWN, brief, drive, reloads, start, type Step } from "./evid-driver";

useReviewFixture({ items: [], releasedAt: "2025-01-01T00:00:00Z", all: true });
export const COMPETENT = (process.env.EVID_COMPETENCIES ?? "MATH.algebra.linear-intro,MATH.algebra.missing-number,MATH.number.fraction-comparison,MATH.geometry.triangle-properties,MATH.probability.sample-space,MATH.geometry.angle-pairs,MATH.geometry.polyhedra-euler").split(",");
for (const c of COMPETENT) for (const slip of [false, true]) {
  test(`${c}: ${slip ? "one slip, then" : ""} everything right: shown, a delayed check after a week, verified; reload agrees`, () => {
    const s = start(`evid-competent-${c}-${slip}`, c);
    let n = 0;
    const learner = { right: () => !(slip && n++ === 0) };
    const trail: Step[] = [];
    drive(s, c, learner, trail, 60);
    assert.ok(SHOWN.includes(s.state().evidence(c).status), brief(trail));
    reloads(s, c);
    let offered = false;
    for (let week = 0; week < 3 && s.state().evidence(c).status !== "verified"; week++) {
      s.wait(8);
      const from = trail.length;
      drive(s, c, learner, trail, 15, { answerRetention: true });
      offered ||= trail.slice(from).some((t) => t.phase === "retention");
      reloads(s, c);
    }
    const e = s.state().evidence(c);
    assert.ok(offered, `no delayed check offered:\n${brief(trail.slice(-8))}`);
    assert.equal(e.status, "verified", `${e.status} / retention ${e.retention} / engine ${e.engine} ${e.engineRetention}:\n${brief(trail.slice(-8))}`);
    assert.deepEqual(e.retentionHistory.map((h) => h.result), ["passed"]);
  });
}

test("triangle properties: one slip on an isosceles triangle (no skill unit), then everything right: verified", () => {
  const c = "MATH.geometry.triangle-properties", s = start("evid-competent-iso-slip", c);
  let slipped = false;
  const learner = { right: (q: string) => (!slipped && q.startsWith("gen:ahiso:") ? ((slipped = true), false) : true) };
  const trail: Step[] = [];
  drive(s, c, learner, trail, 60);
  for (let week = 0; week < 3 && s.state().evidence(c).status !== "verified"; week++) { s.wait(8); drive(s, c, learner, trail, 20, { answerRetention: true }); reloads(s, c); }
  assert.ok(slipped, brief(trail));
  assert.equal(s.state().evidence(c).status, "verified", brief(trail.slice(-8)));
});

test("statistical questions: the competent learner's first diagnostic is held by the grader, so nothing can be shown (missing content)", { todo: "wm-stq-d2 is graded 'held' (unresolved): asked twice, then a pause" }, () => {
  const c = "MATH.statistics.statistical-questions", s = start("evid-competent-stq", c);
  const trail: Step[] = [];
  drive(s, c, { right: () => true }, trail, 40);
  assert.ok(SHOWN.includes(s.state().evidence(c).status), brief(trail));
});
