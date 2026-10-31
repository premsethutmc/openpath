/**
 * Workstream E1: the 17 learner journeys for the sub-skill evidence projection, through the real session (trusted grader, records, evidence,
 * derivation authority), over several seeds of generated variants. The projection is a shadow: it must never change the authoritative state.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { COMPETENCY } from "../../../packages/learning/src/subskill-evidence";
import { SliceSession } from "./session";
import { phasePool } from "../../../packages/learning/src/families";
import { answerOf, projectionOf, runE1Scenarios, variantsFrom, E1_START, type ScenarioResult } from "./subskill-scenarios";
const variants = variantsFrom(phasePool);

const SEEDS = [0, 1, 2];
const sub = (r: ScenarioResult, k: string) => r.projection.subSkills.find((s) => s.id === `linear-equations.${k}@1`)!;
const auth = (r: ScenarioResult) => r.authoritative as { status: string; verified: boolean; retention: string; recoveryRequired: boolean };
const shown = (r: ScenarioResult) => r.projection.subSkills.filter((s) => s.status === "independently-demonstrated").map((s) => s.id.split(".")[1].replace("@1", "")).sort();

for (const seed of SEEDS) test(`E1 journeys (seed ${seed})`, () => {
  const R = runE1Scenarios(variants, seed), j = (n: number) => R.find((r) => r.id === n)!;
  assert.equal(R.length, 17);
  // 1–4: one family only → only its sub-skill
  assert.deepEqual(shown(j(1)), ["one-step"]); assert.equal(auth(j(1)).status, "not_started");
  for (const [n, k] of [[2, "two-step"], [3, "both-sides"], [4, "brackets"]] as const) {
    assert.deepEqual(shown(j(n)), [k]); assert.equal(auth(j(n)).status, "independent");
    assert.equal(j(n).discrepancy, true, `scenario ${n}: the broad "independent" claim is exposed`);
  }
  // 5: all three solving kinds → no discrepancy
  assert.deepEqual(shown(j(5)), ["both-sides", "brackets", "two-step"]); assert.equal(j(5).discrepancy, false);
  // 6: repeated success in one family
  assert.deepEqual(shown(j(6)), ["two-step"]); assert.equal(sub(j(6), "both-sides").status, "not-attempted"); assert.equal(sub(j(6), "brackets").status, "not-attempted");
  // 7: right answers, false working → contradicted, not shown; the authoritative state counts the answers (exposed)
  assert.equal(sub(j(7), "two-step").method.status, "contradicted"); assert.notEqual(sub(j(7), "two-step").status, "independently-demonstrated"); assert.equal(auth(j(7)).status, "independent"); assert.equal(j(7).discrepancy, true);
  // 8: bare answers → shown by answers, no method
  assert.equal(sub(j(8), "two-step").method.status, "not-established"); assert.equal(sub(j(8), "two-step").method.noMethodEvidence, 3);
  // 9: unsupported working → no false step, no method
  assert.equal(sub(j(9), "two-step").method.falseStep, 0); assert.equal(sub(j(9), "two-step").method.status, "not-established");
  // 10: assisted success then independent failure
  assert.equal(sub(j(10), "two-step").status, "developing"); assert.equal(sub(j(10), "two-step").attempts.assistedRight, 3); assert.equal(sub(j(10), "two-step").attempts.independentRight, 0); assert.equal(auth(j(10)).status, "guided");
  // 11, 12: rechecks recorded with their outcome
  assert.deepEqual(sub(j(11), "two-step").rechecks.map((c) => c.correct), [true]);
  assert.deepEqual(sub(j(12), "two-step").rechecks.map((c) => c.correct), [false]);
  // 13: the module's delayed check passes two-step and modelling; both-sides (shown, never sampled) stays due
  assert.equal(sub(j(13), "two-step").retention.state, "passed"); assert.equal(sub(j(13), "modelling").retention.state, "passed");
  assert.equal(sub(j(13), "both-sides").status, "retention-due"); assert.equal(sub(j(13), "both-sides").retention.sampledByModuleCheck, false); assert.equal(auth(j(13)).retention, "passed");
  // 14: failed delayed check → recovery required (history kept), recovered after fresh answers; both-sides not invalidated
  const b14 = (j(14) as unknown as { beforeRecovery: { projection: ScenarioResult["projection"]; authoritative: { recoveryRequired: boolean } } }).beforeRecovery;
  const two14 = b14.projection.subSkills.find((s) => s.id === "linear-equations.two-step@1")!;
  assert.equal(two14.status, "recovery-required"); assert.equal(two14.historical.everDemonstrated, true); assert.equal(b14.authoritative.recoveryRequired, true);
  assert.notEqual(b14.projection.subSkills.find((s) => s.id === "linear-equations.both-sides@1")!.status, "recovery-required");
  assert.equal(sub(j(14), "two-step").retention.history[0].result, "failed"); assert.ok(sub(j(14), "two-step").retention.history[0].recoveredAt);
  // 15: restart and store order
  assert.deepEqual((j(15) as unknown as { replay: unknown }).replay, { identicalAfterRestart: true, identicalWithReversedStoreOrder: true });
  // 16: records the existing reader does not admit are reported unknown, never credited
  assert.equal(j(16).projection.unknown.byReason["excluded-by-existing-reader"], 2); assert.equal(sub(j(16), "two-step").attempts.total, 2);
  // 17: an unmapped family counts for the competency but for no sub-skill
  assert.equal(j(17).projection.unknown.byReason["unmapped-family"], 3); assert.deepEqual(shown(j(17)), []); assert.equal(auth(j(17)).status, "independent"); assert.equal(j(17).discrepancy, true);
});

test("the projection never changes the authoritative state or adds events", () => {
  const s = new SliceSession("e1-shadow", COMPETENCY, E1_START);
  for (const q of [...variants("lin", "practice", 3), ...variants("lboth", "practice", 1)]) s.submit(q, answerOf(q), "practice");
  const n = s.events.length, before = JSON.stringify(s.state().evidence(COMPETENCY)), nextBefore = JSON.stringify(s.next());
  for (let i = 0; i < 3; i++) projectionOf(s);
  assert.equal(s.events.length, n);
  assert.equal(JSON.stringify(s.state().evidence(COMPETENCY)), before);
  assert.equal(JSON.stringify(s.next()).replace(/"at":"[^"]*"/g, ""), nextBefore.replace(/"at":"[^"]*"/g, ""));
});
