// Workstream D1: integrated learner journeys — the trusted grader judges answer AND working, the journey shows it, A3 teaching follows the
// adaptive policy, rechecks and retention run on the real evidence. Only learner submissions are scripted (grader-journeys.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor } from "../../../packages/learning/src/content";
import { contentEligibility } from "../../../packages/learning/src/explanation-review";
import { JOURNEYS, runJourney, traceOf, C, REF, type JourneyTrace } from "./grader-journeys";
import { replayJourney } from "./grader-replay";
import { checkProvenance } from "./provenance";
import { checkScenario } from "./scenarios";

const runs = new Map<string, { t: JourneyTrace; prov: string[]; props: ReturnType<typeof checkScenario> }>();
const get = (id: string) => {
  let x = runs.get(id);
  if (!x) { const j = JOURNEYS.find((k) => k.id === id)!; const r = runJourney(j); x = { t: traceOf(j, r), prov: checkProvenance(r.f), props: checkScenario(r) }; runs.set(id, x); }
  return x;
};
const first = (id: string) => get(id).t.submissions[0];
const MASTERY = ["independent", "transfer", "verified"];

test("every journey: grader-owned feedback, no client authority, bounded, one record per submission", () => {
  for (const j of JOURNEYS) {
    const { t, prov, props } = get(j.id);
    assert.deepEqual(prov, [], `${j.id}: provenance`);
    for (const p of props.filter((p) => ["1 grading authority", "2 evidence recording", "3 honest uncertainty", "6 independent recheck", "7 assistance history", "10 bounded termination"].includes(p.property))) assert.ok(p.ok, `${j.id}: ${p.property} ${p.detail}`);
    for (const s of t.submissions) {
      // method verification never comes from a bare answer, and never from working the authority did not authorize and replay
      if (s.method?.evidence === "method-verified") assert.ok(s.working.length > 1 && s.method.replayed && s.method.status === "verified", `${j.id} #${s.n}`);
      if (s.method?.status === "unsupported") assert.equal(s.method.firstInvalid, null);
      if (s.answer.verdict !== "incorrect") assert.ok(!/is not the solution|not the answer/.test(s.feedback?.message ?? ""), `${j.id} #${s.n}: not marked wrong`);
    }
    assert.equal(t.after.verified, false, `${j.id}: nothing is verified without a delayed check passed`);
  }
});

test("D1-01 wrong bare answer -> substitution feedback -> general teaching (repeated difficulty, no misconception) -> fresh recheck with verified working", () => {
  const { t } = get("D1-01");
  const s = first("D1-01");
  assert.deepEqual([s.question, s.typed, s.answer.verdict, s.method?.status, s.method?.evidence], [REF, "x = 4", "incorrect", "none", "no-method-evidence"]);
  assert.match(s.feedback!.message ?? "", /^Put x = 4 into 3x = 19 − 4: the left side is 12 and the right side is 15/);
  assert.ok(t.teaching.length >= 1);
  const g = t.teaching[0];
  assert.deepEqual([g.basis, g.misconceptionEvidence, g.review, g.displayed], ["repeated-difficulty", false, "pending_review", true]);
  assert.ok(g.recheck && g.recheck.freshQuestion && g.recheck.credit === true && g.recheck.method === "method-verified", JSON.stringify(g.recheck));
});

test("D1-02 correct bare answers: right, and never method evidence", () => {
  const { t } = get("D1-02");
  assert.deepEqual([first("D1-02").answer.verdict, first("D1-02").method?.evidence], ["correct", "no-method-evidence"]);
  assert.match(first("D1-02").feedback!.message ?? "", /You gave the answer only, so your method was not checked\./);
  assert.ok(t.submissions.every((s) => s.method === null || s.method.evidence === "no-method-evidence"));
  assert.equal(t.teaching.length, 0);
});

test("D1-03 correct with verified multi-step working: every line checked, answer verdict separate", () => {
  const { t } = get("D1-03");
  const s = first("D1-03");
  assert.deepEqual([s.answer.verdict, s.method?.status, s.method?.evidence, s.method?.replayedLines], ["correct", "verified", "method-verified", 2]);
  assert.deepEqual(s.feedback!.workingLines, [{ line: "3x = 15", shownAs: "checked" }, { line: "x = 5", shownAs: "checked" }]);
  assert.ok(t.submissions.filter((x) => x.working.length > 1).every((x) => x.method?.evidence === "method-verified"), "every family's worked lines are certified");
});

test("D1-04 correct answer through invalid working: answer right, first invalid step shown, no method credit", () => {
  const s = first("D1-04");
  assert.deepEqual([s.answer.verdict, s.answer.credit, s.method?.status, s.method?.evidence, s.method?.firstInvalid?.index], ["correct", true, "invalid", "method-false-step", 0]);
  assert.match(s.feedback!.message ?? "", /^That answer is right\. But a step in your working is not right\. The first step that does not follow is 3x = 16: x = 5 makes 3x = 19 − 4 true but not 3x = 16/);
});

test("D1-05 incorrect answer with the invalid transformation identified (line 2), valid line 1 kept", () => {
  const s = first("D1-05");
  assert.deepEqual([s.answer.verdict, s.method?.firstInvalid?.index, s.method?.firstInvalid?.lost, s.method?.firstInvalid?.gained, s.method?.replayedLines], ["incorrect", 1, "5", "4", 1]);
  assert.deepEqual(s.feedback!.workingLines, [{ line: "3x = 15", shownAs: "checked" }, { line: "x = 4", shownAs: "invalid" }]);
  assert.equal(get("D1-05").t.teaching.length, 0, "one wrong answer is a slip: no remediation");
});

test("D1-06 valid partial derivation: not marked, not an attempt, flagged incomplete", () => {
  const s = first("D1-06");
  assert.deepEqual([s.answer.verdict, s.answer.credit, s.method?.status, s.method?.completeness, s.feedback?.level], ["unresolved", null, "partial", "incomplete", "partial"]);
  assert.match(s.feedback!.message ?? "", /It is not finished/);
  assert.ok(!get("D1-06").t.after.familiesInEvidence.includes("authored"), "the unmarked submission is not evidence");
});

test("D1-07 unsupported working: the method is not verified and not called wrong; the answer is still marked", () => {
  const s = first("D1-07");
  assert.deepEqual([s.answer.verdict, s.method?.status, s.method?.evidence, s.method?.firstInvalid, s.feedback?.level], ["correct", "unsupported", "no-method-evidence", null, "correct"]);
  assert.match(s.feedback!.message ?? "", /could not be checked automatically, so it is not marked right or wrong/);
});

test("D1-08 verified misconception -> its matching explanation -> fresh recheck with verified working", () => {
  const { t } = get("D1-08");
  const g = t.teaching[0];
  assert.deepEqual([g.explanation, g.basis, g.misconceptionEvidence, g.displayed], ["fix_finish", "verified-misconception", true, true]);
  assert.ok(g.recheck?.freshQuestion && g.recheck.credit === true && g.recheck.method === "method-verified");
});

test("D1-09 isolated slip: no teaching", () => {
  const { t, props } = get("D1-09");
  assert.equal(t.teaching.length, 0);
  assert.ok(t.submissions.some((s) => s.answer.verdict === "incorrect"));
  assert.ok(MASTERY.includes(t.after.status), t.after.status);
  assert.ok(props.find((p) => p.property === "8 no false mastery")!.ok);
});

test("D1-10 repeated difficulty: bounded intervention, then a pause, no mastery", () => {
  const { t } = get("D1-10");
  assert.ok(t.teaching.length >= 1 && t.teaching.length <= 2, `${t.teaching.length}`);
  assert.equal(t.ended, "pause");
  assert.ok(!MASTERY.includes(t.after.status));
});

test("D1-11 successful independent recovery", () => {
  const { t } = get("D1-11");
  assert.ok(t.teaching.length >= 1 && t.teaching.at(-1)!.recheck?.credit === true);
  assert.ok(MASTERY.includes(t.after.status) && t.after.retention === "scheduled" && !t.after.verified);
});

test("D1-12 failed independent recheck: no mastery from the failed recheck; another explanation follows", () => {
  const { t } = get("D1-12");
  assert.equal(t.teaching[0].recheck?.credit, false);
  assert.ok(t.teaching.length >= 2);
});

test("D1-13 failed delayed retention: history kept, recovery required then shown again", () => {
  const { t } = get("D1-13");
  assert.deepEqual(t.after.retentionHistory.slice(0, 1), ["failed"]);
  assert.ok(t.after.retentionHistory.length >= 2 && !t.after.recoveryRequired && t.after.verified === false);
});

test("D1-14 supervised mode: the unapproved explanation is refused and nothing is shown", () => {
  const { t } = get("D1-14");
  assert.equal(t.teaching.length, 0);
  assert.equal(t.ended, "pause");
  const c = contentEligibility(moduleFor(C)!, moduleFor(C)!.strategies.find((s) => s.id === "fix_finish")!, { competency: C, mode: "supervised-evaluation" });
  assert.equal(c.eligible, false);
  assert.ok(t.engine.some((e) => e.phase === "escalate" && e.best === "forgot-divide"), "misconception established, explanation refused, escalated to a teacher");
});

test("D1-15 restart and replay: same evidence, same next step, every recorded working assessment re-derived", () => {
  const r = replayJourney();
  assert.ok(Object.values(r.evidenceEqual).every(Boolean) && r.retentionHistoryEqual && r.nextStepEqual, JSON.stringify(r));
  assert.ok(r.workingReplays.length > 0 && r.workingReplays.every((x) => x.replay === "replayable-current"));
  assert.equal(r.historicalVersionCheck?.replay, "historical-version-not-replayable");
});
