import assert from "node:assert/strict";
import test from "node:test";
import {
  lesson,
  replay,
  percent,
  questionItem,
  type MathActivity,
} from "../../../../packages/mathematics/src/fractions-program";
import { mathematicsContext } from "../../../../packages/mathematics/src/registration";
import {
  indexFramework,
  validateFramework,
} from "../../../../packages/english-core/src/framework";
import english from "../../../../content/english/framework/en-0.2.0.json";
import { parseNumber } from "../../../../packages/mathematics/src/answers";
const pupil = "existing-canonical-id";
const at = "2026-10-18T12:00:00Z";
function activity(
  action: MathActivity["action"],
  stage: string,
  extra: Partial<MathActivity> = {},
): MathActivity {
  return {
    kind: "math_activity",
    id: `event-${n++}`,
    at,
    learnerId: pupil,
    journey: "school",
    lessonVersion: "2.0.0",
    action,
    stage,
    elapsedMs: 100,
    ...extra,
  };
}
let n = 0;
test("subject-neutral registration uses real indexer and keeps English default identity unchanged", () => {
  const ctx = mathematicsContext();
  assert.equal(ctx.index.leafIds.length, 200);
  assert.equal(ctx.index.parent.get("MATH.number"), "MATH");
  assert.equal(ctx.index.names.get("MATH"), "Mathematics");
  assert.equal(ctx.index.leaves.has(lesson.competencyId), true);
  assert.throws(() => indexFramework(ctx.index.framework));
  assert.deepEqual(validateFramework(english as never), []);
  assert.equal(indexFramework(english as never).names.get("EN"), "English");
});
test("fixed content has independently checked fractions, solutions and distinct delayed items", () => {
  assert.equal(lesson.questions.length, 10);
  assert.equal(lesson.stages.length, 7);
  for (const q of lesson.questions) {
    assert.equal(questionItem(q.id).evidence_status, "provisional");
    assert.ok(q.solution.length > 30);
    assert.doesNotThrow(() => parseNumber(q.answer));
  }
  // Mathematical invariants independent of answer-key self-comparison.
  const expected = ["2", "6", "9", "3/5", "6", "8", "5", "15", "12", "3/5"];
  assert.deepEqual(
    lesson.questions.map((q) => q.answer),
    expected,
  );
  assert.equal(1 * 4, 2 * 2);
  assert.equal(2 * 9, 6 * 3);
  assert.equal(3 * 12, 9 * 4);
  assert.equal(6 * 5, 3 * 10);
  assert.equal(3 * 8, 6 * 4);
  assert.equal(2 * 20, 8 * 5);
  assert.equal(5 * 12, 10 * 6);
  assert.equal(3 * 20, 15 * 4);
  assert.equal(4 * 21, 12 * 7);
  assert.equal(9 * 5, 3 * 15);
});
test("complete school, resume, enter GRE and satisfy delayed activity without any mastery from provisional content", () => {
  const events: MathActivity[] = [];
  const due = "2026-10-19T12:00:00Z";
  for (const stage of lesson.stages.slice(0, 6)) {
    for (const id of stage.questions)
      events.push(
        activity("answer", stage.id, {
          questionId: id,
          response: lesson.questions.find((q) => q.id === id)!.answer,
        }),
      );
    events.push(
      activity(
        "complete",
        stage.id,
        stage.id === "transfer" ? { retentionDueAt: due } : {},
      ),
    );
  }
  const frozen = JSON.stringify(lesson);
  const first = replay(pupil, events);
  assert.equal(percent(first.programs.school), 86);
  assert.equal(first.profile.status, "unavailable");
  assert.equal(first.programs.school.current, "retention");
  assert.equal(first.programs.school.retentionDueAt, due);
  assert.equal(
    first.ledger.decisions.every((d) => d.verdict === "held"),
    true,
  );
  const resumed = replay(pupil, JSON.parse(JSON.stringify(events)));
  assert.deepEqual(resumed.programs, first.programs);
  assert.equal(percent(resumed.programs["gre-quant"]), 0);
  events.push(activity("complete", "concept", { journey: "gre-quant" }));
  events.push(activity("complete", "worked", { journey: "gre-quant" }));
  events.push(
    activity("answer", "guided", {
      journey: "gre-quant",
      questionId: "guided-1",
      response: "2",
    }),
  );
  const gre = replay(pupil, events);
  assert.equal(gre.ledger.decisions.at(-1)!.observation?.exposure, "repeat");
  assert.equal(percent(gre.programs.school), 86);
  assert.equal(percent(gre.programs["gre-quant"]), 29);
  assert.equal(gre.profile.competencyId, lesson.competencyId);
  events.push(activity("complete", "retention"));
  assert.equal(percent(replay(pupil, events).programs.school), 86);
  for (const id of ["retention-1", "retention-2"])
    events.push(
      activity("answer", "retention", {
        at: due,
        questionId: id,
        response: lesson.questions.find((q) => q.id === id)!.answer,
      }),
    );
  events.push(activity("complete", "retention", { at: due }));
  const later = replay(pupil, events, due);
  assert.equal(percent(later.programs.school), 100);
  assert.equal(later.profile.status, "unavailable");
  assert.equal(later.ledger.composite.nodes[lesson.competencyId].directN, 0);
  assert.equal(percent(later.programs["gre-quant"]), 29);
  assert.equal(JSON.stringify(lesson), frozen);
});
test("provisional wrong and supported responses cannot modify any node; other learner is rejected", () => {
  const ev = activity("answer", "guided", {
    questionId: "guided-1",
    response: "9",
  });
  const before = replay(pupil, []);
  const after = replay(pupil, [
    activity("hint", "guided", { questionId: "guided-1" }),
    ev,
  ]);
  assert.equal(after.programs.school.answers["guided-1"].correct, false);
  assert.equal(after.programs.school.answers["guided-1"].assisted, true);
  assert.deepEqual(after.ledger.composite.nodes, before.ledger.composite.nodes);
  assert.throws(() => replay("other", [ev]), /Invalid persisted/);
});

test("equivalence normalization preserves a request for simplest fraction form", () => {
  for (const raw of ["6/10", "0.6"]) {
    const result = replay(pupil, [
      activity("answer", "independent", {
        questionId: "independent-2",
        response: raw,
      }),
    ]);
    assert.equal(
      result.programs.school.answers["independent-2"].correct,
      false,
    );
    assert.equal(result.profile.status, "unavailable");
  }
  const result = replay(pupil, [
    activity("answer", "independent", {
      questionId: "independent-2",
      response: "3/5",
    }),
  ]);
  assert.equal(result.programs.school.answers["independent-2"].correct, true);
});
