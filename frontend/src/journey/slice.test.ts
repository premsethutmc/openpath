import assert from "node:assert/strict";
import test from "node:test";
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { bugValue } from "../learning/adaptive-journey";
import { DECIDES } from "./contracts";
import { SliceFlow } from "./flow";
import { RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { gradeRequest } from "../../../packages/learning/src/server-grader";

const Q = "gen:lin:2,17,11"; // Solve 2x + 17 = 39. What is x?  (answer 11; forgot-divide predicts 22)
const BUG = new Set(["forgot-divide"]);
const answerFor = (qid: string, taught: boolean) => String((taught ? null : bugValue(problemOf(qid), BUG)) ?? question(qid).answer);

function run() {
  const f = new SliceFlow(Q);
  let taught = false;
  for (let i = 0; i < 40 && f.stage !== "summary"; i++) {
    if (f.stage === "question") f.on({ type: "answer_submitted", value: answerFor(f.frames.at(-1)!.qid!, taught), timestamp: 0 });
    else { if (f.stage === "teaching") taught = true; f.on({ type: "skip_requested", timestamp: 0 }); }
    if (f.session.trace.some((t) => t.component === "session.make.teach")) taught = true;
    if (f.frames.length > 60) break;
    if (f.session.state().evidence(f.session.competency).retention === "scheduled" && f.stage === "question" && i > 12) break;
  }
  return f;
}

test("slice: every step is produced by the component that owns it", () => {
  const f = run();
  for (const t of f.session.trace) assert.ok(DECIDES[t.authority].includes(t.decides), `${t.authority} must not decide ${t.decides}`);
  assert.ok(f.session.trace.every((t) => t.authority !== "renderer"), "renderer never appears as a decider");
  const comps = new Set(f.session.trace.map((t) => t.component));
  for (const c of ["server-grader.gradeRequest", "intervention.moduleState", "session.learnerState / evidenceFor", "session.make.teach"]) assert.ok(comps.has(c), c);
});

test("slice: first answer is incorrect by the authorized grader, the engine justifies investigation, then teaches an eligible explanation", () => {
  const f = run();
  const first = f.session.replies[0];
  assert.equal(first.verdict, "incorrect");
  assert.equal(first.decision?.schema, "grading-decision@1");
  assert.equal(f.session.investigationTriggerFor(Q)?.kind, "modelled-error");
  const steps = f.session.trace.filter((t) => t.component === "intervention.moduleState").map((t) => (t.output as { phase: string }).phase);
  assert.ok(steps.indexOf("explore") >= 0 && steps.indexOf("explore") < steps.indexOf("chapter"), `investigation before teaching: ${steps}`);
  assert.ok(steps.indexOf("chapter") < steps.indexOf("check"), "teaching before the independent recheck");
});

test("slice: the renderer shows the selected explanation's own screens, progressively, with no verification claim", () => {
  const f = run();
  const teach = f.frames.filter((x) => x.stage === "teaching");
  assert.ok(teach.length >= 2, "more than one progressive frame");
  const strat = f.session.trace.find((t) => t.decides === "teaching-selection")!.output as { strategy: string };
  assert.ok(teach.every((x) => x.strategyId === strat.strategy));
  assert.deepEqual(teach.map((x) => x.revealed), teach.map((_, i) => i + 1));
  for (const fr of teach) { assert.equal(fr.spec.working!.revealedCount, fr.revealed); assert.ok(fr.spec.working!.steps.every((s) => s.verified === false)); }
  assert.ok(teach.at(-1)!.spec.working!.steps[0].description.length > 10);
});

test("slice: correctness shown by the renderer equals the grader's decision and nothing else", () => {
  const f = run();
  const fbs = f.frames.filter((x) => x.stage === "feedback");
  assert.equal(fbs.length, f.session.replies.length);
  fbs.forEach((x, i) => assert.equal(x.spec.feedback.level, f.session.replies[i].verdict === "correct" ? "correct" : f.session.replies[i].verdict === "incorrect" ? "incorrect" : "none"));
  // a held / educator-marked item is never shown as right or wrong
  const held = gradeRequest({ id: "wr:eq:find-mistakes", response: "written:marked-correct" });
  assert.notEqual(held.verdict, "correct");
});

test("slice: independent recheck, preserved history, and retention per the established policy", () => {
  const f = run();
  const ev = f.session.state().evidence(f.session.competency);
  assert.ok(ev.independent.total >= 1);
  assert.equal(ev.retention, "scheduled");
  const due = Date.parse(ev.retentionDueAt!);
  const lastIndep = Date.parse(ev.independentAt!);
  assert.equal(Math.round((due - lastIndep) / 86_400_000), RETENTION_DAYS);
  // the wrong first attempt and the teaching event are both still in the history
  const recs = f.session.state().records;
  assert.equal(recs.attempts[0].questionId, Q);
  assert.equal(recs.attempts[0].response, "22");
  assert.ok(f.session.events.some((e) => e.record === "teach"));
});

test("boundary: the in-page grader gives the same decisions the Django boundary test asserts (backend/family/test_integration_m1.py)", () => {
  const w = gradeRequest({ id: Q, response: "22" }), r = gradeRequest({ id: Q, response: "11" });
  assert.deepEqual([w.credit, w.verdict], [false, "incorrect"]);
  assert.deepEqual([r.credit, r.verdict], [true, "correct"]);
  assert.equal(w.decision?.schema, "grading-decision@1");
});
