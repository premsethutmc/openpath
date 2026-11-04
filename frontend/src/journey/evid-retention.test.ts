/**
 * Consolidation #112, evidence worker. Delayed checks on the real app path (SliceSession: real grader, engine, records and replay).
 *   1. A failed delayed check stays failed and in the history when the shared engine first counts the skill as demonstrated only after
 *      it (was: evidence moved the first check to the engine's later demonstration, the failed answers fell before the new due date and
 *      the failure vanished; one right answer in another format then turned "Review needed" into "guided" with nothing recovered).
 *   2. After a failed delayed check and recovery on your own, a new check is scheduled and the status is no longer "Review needed"
 *      (was: the shared engine's "overdue" for the same missed check kept "review" for the whole week until the new check, and the module
 *      kept serving practice).
 *   3. A written answer waiting for an educator's mark: a delayed check that is due is not a missed one (was: "Review needed",
 *      "the delayed check was missed", from the engine's "overdue", although no check had been offered).
 * Reload from saved JSON agrees at every step.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { SHOWN, brief, drive, reloads, start, wrongAnswer, type Step } from "./evid-driver";

useReviewFixture({ items: [], releasedAt: "2025-01-01T00:00:00Z", all: true });
const right = { right: () => true };

test("a failed delayed check is kept when the shared engine demonstrates the skill only later; recovery, a new check, verified", () => {
  const c = "MATH.algebra.linear-intro";
  const s = start("evid-retention-engine-late", c, Date.parse("2026-01-01T00:00:00Z"), false);
  // two right answers alone in one format: shown on your own here; the shared engine has not demonstrated it yet
  for (const q of ["gen:ahone:0,14,20", "gen:ahone:2,4,3"]) s.submit(q, question(q).answer, "practice");
  assert.equal(s.state().evidence(c).status, "independent");
  s.wait(8);
  const n = s.next(c);
  assert.equal(n.phase, "retention", n.reason);
  s.submit(n.question!, wrongAnswer(n.question!), "retention");
  let e = s.state().evidence(c);
  assert.equal(e.status, "review");
  assert.deepEqual(e.retentionHistory.map((h) => h.result), ["failed"]);
  reloads(s, c);
  // one right answer in another format: the engine now demonstrates the skill; the failure stays, nothing is recovered yet
  s.submit("gen:ahone:0,9,9:mc", question("gen:ahone:0,9,9:mc").answer, "practice");
  e = s.state().evidence(c);
  assert.deepEqual(e.retentionHistory.map((h) => [h.result, h.recoveredAt]), [["failed", null]], JSON.stringify(e.retentionHistory));
  assert.equal(e.status, "review");
  assert.equal(e.retention, "failed");
  reloads(s, c);
  // recovery through the engine: a new delayed check after it, then verified; the failure is still in the history
  const trail: Step[] = [];
  drive(s, c, right, trail, 30);
  e = s.state().evidence(c);
  assert.equal(e.retentionHistory[0].result, "failed");
  assert.ok(e.retentionHistory[0].recoveredAt, brief(trail));
  assert.ok(SHOWN.includes(e.status), `${e.status}\n${brief(trail)}`);
  reloads(s, c);
  // the competent learner is never stuck: the delayed checks the engine offers end in "verified" (the shared engine first demonstrates
  // the skill again at the first check after recovery, so that one can be asked again a week later: verification@3)
  for (let week = 0; week < 3 && s.state().evidence(c).status !== "verified"; week++) {
    s.wait(8);
    drive(s, c, right, trail, 10, { answerRetention: true });
    reloads(s, c);
  }
  e = s.state().evidence(c);
  assert.equal(e.status, "verified", brief(trail));
  assert.equal(e.retentionHistory[0].result, "failed", "the failure is kept");
  assert.equal(e.retentionHistory.at(-1)!.result, "passed");
});

for (const c of ["MATH.algebra.missing-number", "MATH.algebra.linear-intro"]) {
  test(`${c}: after a failed delayed check and recovery alone, the new check is scheduled and the status is not "review"`, () => {
    const s = start(`evid-recovered-${c}`, c);
    let failed = false;
    const learner = { right: (_q: string, x: { phase: string }) => (x.phase === "retention" && !failed ? ((failed = true), false) : true) };
    const trail: Step[] = [];
    drive(s, c, learner, trail, 60);
    assert.ok(SHOWN.includes(s.state().evidence(c).status));
    s.wait(8);
    const seen: string[] = [];
    drive(s, c, learner, trail, 25, { answerRetention: true, onStep: (t) => { seen.push(t.status); } });
    const e = s.state().evidence(c);
    assert.ok(failed, brief(trail));
    assert.equal(e.retentionHistory[0].result, "failed");
    assert.ok(e.retentionHistory[0].recoveredAt, brief(trail));
    assert.equal(e.retention, "scheduled");
    assert.notEqual(e.status, "review", `still "Review needed" after recovery (engine ${e.engineRetention}):\n${brief(trail.slice(-6))}`);
    assert.ok(trail.length - trail.findIndex((t) => t.phase === "retention") < 15, `the module keeps serving practice after recovery:\n${brief(trail)}`);
    reloads(s, c);
    s.wait(8);
    drive(s, c, learner, trail, 10, { answerRetention: true });
    const v = s.state().evidence(c);
    assert.deepEqual(v.retentionHistory.map((h) => h.result), ["failed", "passed"]);
    assert.equal(v.status, "verified");
    reloads(s, c);
  });
}

test("a written answer waiting for a mark: a delayed check that is due is not reported as missed", () => {
  const c = "MATH.reasoning.winning-strategies";
  const s = start("evid-written-wait", c);
  const trail: Step[] = [];
  drive(s, c, right, trail, 30);
  assert.equal(trail.at(-1)!.phase, "waiting", brief(trail));
  assert.ok(SHOWN.includes(s.state().evidence(c).status));
  s.wait(8);
  const e = s.state().evidence(c);
  assert.equal(e.retention, "due");
  assert.notEqual(e.status, "review", `"Review needed" (engine ${e.engineRetention}) although no delayed check was offered`);
  reloads(s, c);
});

test("a written answer waiting for a mark does not hold back a due delayed check (selection: proposal evidence-1)", { todo: "intervention.ts moduleStep returns 'waiting' before the delayed check" }, () => {
  const c = "MATH.reasoning.winning-strategies";
  const s = start("evid-written-wait-2", c);
  drive(s, c, right, [], 30);
  s.wait(8);
  assert.equal(s.next(c).phase, "retention");
});
