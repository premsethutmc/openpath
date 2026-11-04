/**
 * retention@2: a failed delayed check is kept; after recovery shown alone, a new delayed check is scheduled; nothing is
 * forgiven automatically. Driven through the module as the app drives it (synthetic learner).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { Journey, TARGET, respond, slip, slippable } from "./adaptive-journey";

const right = (q: string) => ({ response: respond(q, "right") });
/** answer every question right, except the first slippable delayed-check question, which is a slip */
const slipOnce = () => { let done = false; return (q: string, ms: { phase: string }) => (!done && ms.phase === "retention" && slippable(q) ? ((done = true), { response: slip(q) }) : right(q)); };

async function shown() {
  const j = new Journey("retention-cycle");
  await j.topicCheck(TARGET, (q) => respond(q, "right"));
  await j.module(TARGET, right);
  return j;
}
const ev = (j: Journey) => j.d.state().evidence(TARGET);

test("a failed delayed check stays failed until recovery is shown alone; then a new check is scheduled, not forgiven", async () => {
  const j = await shown();
  assert.equal(ev(j).retention, "scheduled");
  j.newSession(RETENTION_DAYS + 1);
  assert.equal(ev(j).retention, "due");
  // one slip on the delayed check, and nothing else answered: failed, review, no new check
  await j.module(TARGET, slipOnce(), 1);
  let e = ev(j);
  assert.equal(e.retention, "failed");
  assert.equal(e.status, "review");
  assert.equal(e.retentionHistory.length, 1);
  assert.equal(e.retentionHistory[0].result, "failed");
  assert.equal(e.retentionHistory[0].recoveredAt, null);
  // time alone forgives nothing
  j.newSession(30);
  assert.equal(ev(j).retention, "failed");
  assert.equal(ev(j).status, "review");
  // recovery: fresh questions right alone (the module asks them); a new delayed check is scheduled RETENTION_DAYS later
  await j.module(TARGET, right, 6);
  e = ev(j);
  assert.equal(e.retentionHistory[0].result, "failed", "the failure is kept");
  assert.ok(e.retentionHistory[0].recoveredAt);
  assert.equal(e.retentionHistory.length, 2);
  assert.equal(e.retention, "scheduled");
  assert.equal(Date.parse(e.retentionDueAt!), Date.parse(e.retentionHistory[0].recoveredAt!) + RETENTION_DAYS * DAY);
  assert.notEqual(e.status, "review");
});

test("repeated failures each stay in the history; a later delayed check passed after recovery counts", async () => {
  const j = await shown();
  for (let cycle = 1; cycle <= 2; cycle++) {
    j.newSession(RETENTION_DAYS + 1);
    assert.equal(ev(j).retention, "due", `cycle ${cycle} due`);
    await j.module(TARGET, slipOnce(), 1);
    assert.equal(ev(j).retention, "failed");
    await j.module(TARGET, right, 6);
    assert.equal(ev(j).retention, "scheduled", `cycle ${cycle}: recovery schedules the next check`);
  }
  j.newSession(RETENTION_DAYS + 1);
  assert.equal(ev(j).retention, "due");
  await j.module(TARGET, right, 6);
  const e = ev(j);
  assert.deepEqual(e.retentionHistory.map((c) => c.result), ["failed", "failed", "passed"]);
  assert.equal(e.retention, "passed");
  assert.notEqual(e.status, "review");
});

test("without a failure, retention is unchanged (one check, passed)", async () => {
  const j = await shown();
  j.newSession(RETENTION_DAYS + 1);
  await j.module(TARGET, right, 6);
  assert.deepEqual(ev(j).retentionHistory.map((c) => c.result), ["passed"]);
});
