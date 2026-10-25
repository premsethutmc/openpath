/**
 * Acceptance test 9: ten scripted learner journeys on the verified bank only. Simulated learners test SYSTEM BEHAVIOUR
 * (serving, explicit limits, the mastery rules); they say nothing about educational effectiveness. Totals of the bank
 * are never asserted. The same run writes tools/mathematics/tn5-bank/results/journeys.json (run-journeys.mts).
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { runJourneys, type JourneyResult } from "./bank-journeys";
import { loadBank } from "./bank-serve";

const journeys = runJourneys();
const J = (n: number): JourneyResult => journeys[n - 1];
const only = (j: JourneyResult, suffix: string) => j.final[j.competencies.find((c) => c.endsWith(suffix))!];
const statuses = (j: JourneyResult) => Object.values(j.final).map((f) => f.status);

describe("bank journeys: ten learners, bank only", () => {
  const bank = loadBank("tn-samacheer-mathematics-grade-5");

  it("ten journeys, pseudonymous learner ids, at least one Grade 5 skill each", () => {
    assert.equal(journeys.length, 10);
    assert.deepEqual(journeys.map((j) => j.learner), Array.from({ length: 10 }, (_, k) => `learner-${String(k + 1).padStart(2, "0")}`));
    for (const j of journeys) {
      assert.ok(j.competencies.length >= 1 && j.competencies.every((c) => bank.competencies.includes(c)), j.title);
      assert.ok(j.stepsTaken >= 6, `${j.title}: steps`);
    }
  });
  it("every item served or answered came from the bank (requestItem), none twice in a phase, no unexpected missing item", () => {
    for (const j of journeys) {
      assert.ok(j.itemsServed.every((id) => bank.byId.has(id)), j.title);
      assert.equal(new Set(j.itemsServed).size, j.itemsServed.length, `${j.title}: an item was served twice`);
      for (const s of j.steps.filter((s) => s.kind === "attempt")) assert.ok(j.itemsServed.includes(s.item!), j.title);
    }
  });
  it("every journey's own checks pass", () => {
    for (const j of journeys) {
      assert.ok(j.checks.length >= 6, `${j.title}: has checks`);
      const bad = j.checks.filter((c) => !c.ok);
      assert.deepEqual(bad, [], `${j.title}: ${bad.map((c) => `${c.name} (${c.detail ?? ""})`).join("; ")}`);
    }
  });

  it("1. steady learner: a mastery claim only after varied evidence and a passed delayed check; one answer format never verifies", () => {
    const j = J(1);
    assert.equal(only(j, "rounding").status, "verified");
    assert.equal(only(j, "rounding").retention, "passed");
    const ctl = only(j, "expressions-intro");
    assert.equal(ctl.retention, "passed");
    assert.notEqual(ctl.status, "verified");
    // the delayed check came at least a week after the first independent answers
    const days = j.steps.filter((s) => s.competency?.endsWith("rounding") && s.phase === "retention").map((s) => s.day);
    assert.ok(days.length === 2 && Math.min(...days) >= 7);
  });
  it("2. recurring wrong answer: diagnosed after it recurs, taught, recovered (shown on their own, no claim yet)", () => {
    const j = J(2);
    const wrong = j.steps.filter((s) => s.kind === "attempt" && s.right === false);
    assert.ok(wrong.length >= 3 && new Set(wrong.map((s) => s.bug)).size === 1 && wrong[0].bug !== "none predicted");
    assert.ok(j.steps.some((s) => s.kind === "teach"));
    assert.ok(["independent", "transfer"].includes(statuses(j)[0]));
  });
  it("3. only watches: no attempts, exposure only", () => {
    const j = J(3);
    assert.equal(j.steps.filter((s) => s.kind === "attempt").length, 0);
    assert.ok(j.steps.some((s) => s.kind === "view") && j.steps.some((s) => s.kind === "teach"));
    assert.deepEqual(statuses(j), ["exposure"]);
  });
  it("4. one lucky correct answer: guided at most, never independent or verified", () => {
    assert.deepEqual(statuses(J(4)), ["guided"]);
    assert.equal(J(4).steps.filter((s) => s.kind === "attempt" && s.right).length, 1);
  });
  it("5. fails the delayed check: the skill returns for review", () => {
    const f = only(J(5), "rounding");
    assert.equal(f.status, "review");
    assert.equal(f.retention, "failed");
    assert.ok(J(5).findings.some((x) => /stays in review/.test(x)), "the missing way back is reported, not hidden");
  });
  it("6. guessing on multiple choice: no mastery claim, in this run or in any seeded run", () => {
    const j = J(6);
    assert.ok(j.steps.filter((s) => s.kind === "attempt").every((s) => s.format === "choice"));
    assert.ok(statuses(j).every((s) => s !== "verified"));
    assert.ok(j.findings.some((x) => /0 reached a mastery claim/.test(x)));
  });
  it("7. high ability from difficulty 3: all difficulty 3, verified after the delayed check", () => {
    const j = J(7);
    assert.ok(j.steps.filter((s) => s.kind === "attempt").every((s) => s.band === 3));
    assert.deepEqual(statuses(j), ["verified"]);
    assert.ok(!j.steps.some((s) => s.kind === "teach"));
  });
  it("8. struggling at difficulty 1: stays at 1, taught, no claim", () => {
    const j = J(8);
    assert.ok(j.steps.filter((s) => s.kind === "attempt").every((s) => s.band === 1));
    assert.ok(j.steps.some((s) => s.kind === "teach") && j.refusals.length === 0);
    assert.ok(statuses(j).every((s) => s !== "verified"));
  });
  it("9. two skills interleaved: separate evidence, separate delayed checks, both verified", () => {
    const j = J(9);
    assert.equal(j.competencies.length, 2);
    assert.deepEqual(statuses(j), ["verified", "verified"]);
    const firstRetention = (c: string) => Math.min(...j.steps.filter((s) => s.competency === c && s.phase === "retention").map((s) => s.day));
    assert.notEqual(firstRetention(j.competencies[0]), firstRetention(j.competencies[1]));
  });
  it("10. exhausted band: next band serves, or a clear failure with a log entry; never an unexplained failure", () => {
    const j = J(10);
    assert.equal(j.refusals.length, 2);
    assert.ok(j.refusals.every((r) => r.kind === "band-exhausted" && r.reason.length > 40));
    assert.equal(j.missedItemLog.length, 2);
    assert.ok(j.missedItemLog.every((e) => e.kind === "band-exhausted" && e.at && !JSON.stringify(e).match(/name|birth/i)));
    const i = j.steps.findIndex((s) => s.kind === "refused");
    assert.equal(j.steps[i + 1].kind, "attempt", "the next band served straight after");
  });

  it("a mastery claim appears only in journeys that earned it (1, 7, 9)", () => {
    const claims = journeys.filter((j) => Object.values(j.final).some((f) => f.masteryClaimed)).map((j) => j.id);
    assert.deepEqual(claims, [1, 7, 9]);
  });
  it("deterministic: a second run gives the same results", () => {
    assert.deepEqual(runJourneys(), journeys);
  });
});
