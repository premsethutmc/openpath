// D1 + E1 integration: the twenty journeys. Real grader (answer + working verdict, server-recorded), records, evidence, flow and session;
// the E1 projection (shadow) over the stored events. Only learner responses are scripted (d1e1-journeys.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { DE1_JOURNEYS, type DE1Trace } from "./d1e1-journeys";

const cache = new Map<string, DE1Trace>();
const J = (id: string) => { let t = cache.get(id); if (!t) { t = DE1_JOURNEYS.find((j) => j.id === id)!.run(); cache.set(id, t); } return t; };
const S = (id: string, k: string) => J(id).projection.subSkills[k];
const first = (id: string) => J(id).submissions[0];

test("J01 correct bare answer: right, no method evidence", () => {
  assert.deepEqual([first("J01").verdict, first("J01").workingStatus], ["correct", "none"]);
  assert.deepEqual([S("J01", "two-step").method.verified, S("J01", "two-step").method.noWorking, S("J01", "two-step").attempts.independentRight], [0, 1, 1]);
});
test("J02 correct answer with verified working: a current verified method", () => {
  assert.deepEqual([first("J02").verdict, first("J02").workingStatus, first("J02").methodEvidence], ["correct", "verified", "method-verified"]);
  assert.deepEqual([S("J02", "two-step").method.verified, S("J02", "two-step").method.status], [1, "verified"]);
});
test("J03 correct answers with invalid working: answers kept, no verified method, not demonstrated; the authoritative state counts the answers (exposed)", () => {
  const x = S("J03", "two-step");
  assert.ok(J("J03").submissions.every((s) => s.verdict === "correct" && s.workingStatus === "invalid"));
  assert.deepEqual([x.attempts.total, x.attempts.contradicted, x.method.verified, x.method.falseStep, x.method.status], [3, 3, 0, 3, "contradicted"]);
  assert.notEqual(x.status, "independently-demonstrated");
  assert.equal(J("J03").authoritative.status, "independent");
  assert.equal(J("J03").projection.discrepancies.length, 1);
});
test("J04 incorrect answer with the first invalid step identified", () => {
  assert.deepEqual([first("J04").verdict, first("J04").workingStatus, first("J04").firstInvalid], ["incorrect", "invalid", 1]);
  assert.deepEqual([S("J04", "two-step").method.falseStep, S("J04", "two-step").attempts.contradicted], [1, 0]);
});
test("J05 valid partial working: not an attempt, no credit, counted as partial working only", () => {
  assert.deepEqual([first("J05").verdict, first("J05").workingStatus], ["unresolved", "partial"]);
  assert.deepEqual([S("J05", "two-step").status, S("J05", "two-step").attempts.total, S("J05", "two-step").method.partialWorking], ["not-attempted", 0, 1]);
});
test("J06 unsupported working: never a false step, never verified", () => {
  assert.equal(first("J06").workingStatus, "unsupported");
  assert.deepEqual([S("J06", "two-step").method.unsupported, S("J06", "two-step").method.falseStep, S("J06", "two-step").method.verified], [1, 0, 0]);
});
test("J07 assisted success: never independent", () => {
  const x = S("J07", "brackets");
  assert.deepEqual([x.attempts.independent, x.attempts.assistedRight, x.status, x.method.verified], [0, 3, "insufficient-evidence", 0]);
});
test("J08 / J09 independent rechecks in the real flow: success counts, failure does not", () => {
  for (const id of ["J08", "J09"]) assert.ok(J(id).submissions.some((s) => s.activity === "check"), id);
  const checks = (id: string) => J(id).submissions.filter((s) => s.activity === "check" && s.family === "lin");
  assert.equal(checks("J08")[0].verdict, "correct"); assert.equal(checks("J08")[0].methodEvidence, "method-verified");
  assert.equal(checks("J09")[0].verdict, "incorrect");
  assert.equal(S("J08", "two-step").status, "independently-demonstrated");
});
test("J10 / J11 / J12 one family only: only that sub-skill; the broad authoritative claim is exposed", () => {
  for (const [id, k] of [["J10", "two-step"], ["J11", "both-sides"], ["J12", "brackets"]] as const) {
    const shown = Object.entries(J(id).projection.subSkills).filter(([, x]) => x.status === "independently-demonstrated").map(([n]) => n);
    assert.deepEqual(shown, [k], id);
    assert.equal(J(id).authoritative.status, "independent", id);
    assert.equal(J(id).projection.discrepancies.length, 1, id);
  }
  assert.equal(J("J10").projection.subSkills["brackets"], undefined);
  assert.equal(J("J10").projection.subSkills["both-sides"], undefined);
});
test("J13 mixed-family success: all three shown, no discrepancy", () => {
  for (const k of ["two-step", "both-sides", "brackets"]) assert.equal(S("J13", k).status, "independently-demonstrated", k);
  assert.equal(J("J13").projection.discrepancies.length, 0);
});
test("J14 delayed retention success: the sub-skill's own check passes", () => {
  assert.deepEqual([S("J14", "two-step").retention.state, J("J14").authoritative.retention], ["passed", "passed"]);
});
test("J15 delayed retention failure: recovery required (history kept), then recovered", () => {
  const b = J("J15").checks.beforeRecovery as { twoStep: string; authoritative: { recoveryRequired: boolean } };
  assert.equal(b.twoStep, "recovery-required"); assert.equal(b.authoritative.recoveryRequired, true);
  assert.equal(S("J15", "two-step").retention.history[0], "failed→recovered");
  assert.equal(S("J15", "two-step").everDemonstrated, true);
});
test("J16 recovery in one sub-skill does not clear another", () => {
  assert.equal(S("J16", "two-step").retention.history[0], "failed→recovered");
  assert.equal(S("J16", "both-sides").status, "recovery-required");
  assert.equal(S("J16", "both-sides").everDemonstrated, true);
});
test("J17 historical replay: pre-D1 records are not re-judged; an older authority's verdicts stay historical", () => {
  const c = J("J17").checks as { current: { falseStep: number }; preD1: { notRecorded: number; falseStep: number }; authority3: { historical: number }; preD1Repeatable: boolean };
  assert.equal(c.current.falseStep, 3);
  assert.deepEqual([c.preD1.notRecorded, c.preD1.falseStep], [3, 0]);
  assert.equal(c.authority3.historical, 3);
  assert.equal(c.preD1Repeatable, true);
});
test("J18 restart: the rebuilt session projects identically and the authoritative state is equal", () => {
  assert.deepEqual(J("J18").checks, { identicalAfterRestart: true, authoritativeEqual: true });
});
test("J19 forged client verification establishes nothing", () => {
  const c = J("J19").checks as { forgedByClient: { verified: number; notRecorded: number }; inconsistentVerdict: { verified: number } };
  assert.deepEqual([c.forgedByClient.verified, c.forgedByClient.notRecorded, c.inconsistentVerdict.verified], [0, 3, 0]);
  assert.equal(S("J19", "two-step").method.verified, 0);
});
test("J20 unknown question families create no sub-skill evidence, even with a server verdict attached", () => {
  const u = J("J20").projection.unknown;
  assert.equal((u["unmapped-family"] ?? 0) + (u["excluded-by-existing-reader"] ?? 0), 4);
  assert.equal(S("J20", "two-step").attempts.total, 2);
  assert.equal(Object.keys(J("J20").projection.subSkills).join(","), "two-step");
});
