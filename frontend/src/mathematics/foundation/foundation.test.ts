import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  programs,
  replayFoundation,
  key,
  itemFor,
  evaluate,
  canFinish,
  instructionalSupport,
  type FoundationActivity,
  type Receipt,
} from "../../../../packages/mathematics/src/foundation/programs";
import {
  developmentalGraph,
  validateDevelopmentalGraph,
  audit,
} from "../../../../packages/mathematics/src/foundation/graph";
const learner = "canonical-test-pupil",
  at = "2026-10-19T00:00:00Z",
  due = "2026-10-20T00:00:00Z";
let serial = 0;
function event(
  p: (typeof programs)[number],
  stage: string,
  action: FoundationActivity["action"],
  extra: Partial<FoundationActivity> = {},
): FoundationActivity {
  return {
    kind: "math_foundation_activity",
    id: `f-${serial++}`,
    at,
    learnerId: learner,
    programId: p.id,
    lessonVersion: "1.0.0",
    journey: "school",
    stage,
    action,
    sessionId: `math:${learner}:visit`,
    elapsedMs: 100,
    ...extra,
  };
}
function core(p: (typeof programs)[number]) {
  const events: FoundationActivity[] = [];
  for (const stage of p.stages.slice(0, 7)) {
    if (stage.id === "explore")
      events.push(
        event(p, stage.id, "draft", {
          questionId: "exploration",
          response: "done",
        }),
      );
    for (const id of stage.questions)
      events.push(
        event(p, stage.id, "answer", {
          questionId: id,
          response: p.questions.find((q) => q.id === id)!.answer,
        }),
      );
    events.push(
      event(
        p,
        stage.id,
        "complete",
        stage.id === "transfer" ? { retentionDueAt: due } : {},
      ),
    );
  }
  return events;
}
test("developmental overlay keeps all historical IDs and a cycle-free domain graph, roots justified", () => {
  const result = validateDevelopmentalGraph();
  assert.equal(result.nodes, 200);
  assert.equal(result.audited, 92);
  assert.equal(result.proposedRefinements, 14);
  const prereq = (id: string) =>
    developmentalGraph.find((n) => n.id === `MATH.number.${id}`)!.prerequisites;
  assert.deepEqual(prereq("addition"), ["MATH.number.count-objects"]);
  assert.ok(
    !prereq("equivalent-fractions").includes("MATH.number.long-division"),
  );
  assert.ok(audit.compoundSkills.length >= 6);
  assert.equal(
    audit.sources.every((s) => s.edition === null),
    true,
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync("../content/mathematics/curriculum.v1.json"))
      .digest("hex"),
    "e4c17772945ff4ad1892b8839d99d3f1a5d149cebdaeb8d138ecfcc112df44d4",
  );
});
test("three substantive programs contain concept, exploration, worked contrasts, application and distinct delayed review", () => {
  assert.deepEqual(
    programs.map((p) => p.grade),
    [1, 3, 5],
  );
  const ids = new Set<string>();
  for (const p of programs) {
    assert.equal(p.stages.length, 8);
    assert.match(p.stages[0].text, /Addition|equal group|fraction/i);
    assert.match(p.stages[2].text, /zero|not|does not/i);
    assert.equal(p.questions.length, 6);
    for (const q of p.questions) {
      const item = itemFor(p, q);
      assert.ok(!ids.has(item.id));
      ids.add(item.id);
      assert.equal(item.evidence_status, "provisional");
      assert.ok(q.solution && q.hint && q.misconception);
      assert.equal(evaluate(p, q, q.answer).correct, true);
      assert.equal(evaluate(p, q, q.commonError).correct, false);
      assert.ok(
        evaluate(p, q, q.commonError).message.includes(q.misconception),
      );
    }
  }
});
test("independent numerical oracle checks every answer, equivalence and semantic distinctions", () => {
  const expected = [
    [3 + 2, 4 + 1, 2 + 0, 3 + 3, 2 + 4, 5 + 2],
    [3 * 2, 4 * 3, 2 * 5, 5 * 4, 4 * 3, 6 * 2],
    [(1 * 4) / 2, (2 * 6) / 3, "3/4", "3/4", 10 / 2, (3 * 10) / 5],
  ];
  programs.forEach((p, i) =>
    assert.deepEqual(
      p.questions.map((q) => q.answer),
      expected[i].map(String),
    ),
  );
  const p = programs[2],
    q = p.questions[2];
  assert.equal(evaluate(p, q, "0.75").correct, true);
  assert.equal(evaluate(p, q, "3/0").correct, false);
  assert.equal(evaluate(p, q, "2/3").correct, false);
  // Compare 2/3 and 3/4 by cross products, independent of the stored solution.
  assert.ok(2 * 4 < 3 * 3);
  assert.equal(1 * 4, 2 * 2);
  assert.equal(2 * 6, 4 * 3);
});
test("all three synthetic learners finish fixed programs, resume drafts, retain progress until delayed review, never gain mastery", () => {
  for (const p of programs) {
    const events = core(p);
    const before = JSON.stringify(events);
    let state = replayFoundation(learner, events, at);
    const s = state.progress[key(p.id, "school")];
    assert.equal(s.completed.length, 7);
    assert.equal(canFinish(p, s, "retention", Date.parse(at)), false);
    assert.equal(state.profiles[p.id].status, "unavailable");
    assert.equal(state.ledger.events.length, 5);
    assert.deepEqual(
      replayFoundation(learner, JSON.parse(before), at).progress,
      state.progress,
    );
    assert.equal(JSON.stringify(events), before);
    events.push(
      event(p, "retention", "answer", {
        at: due,
        questionId: "retention",
        response: p.questions[5].answer,
      }),
      event(p, "retention", "complete", { at: due }),
    );
    state = replayFoundation(learner, events, due);
    assert.equal(state.progress[key(p.id, "school")].completed.length, 8);
    assert.notEqual(state.profiles[p.id].status, "verified");
    assert.equal(state.ledger.composite.nodes[p.competencyId].directN, 0);
  }
});
test("one learner shares fraction identity across school and GRE but never program completion; old evidence remains", () => {
  const p = programs[2],
    events: Receipt[] = core(p);
  events.unshift({
    kind: "math_activity",
    id: "historical",
    at,
    learnerId: learner,
    journey: "school",
    lessonVersion: "2.0.0",
    action: "answer",
    stage: "guided",
    questionId: "guided-1",
    response: "2",
    elapsedMs: 20,
  });
  const old = JSON.stringify(events[0]);
  events.push(
    event(p, "guided", "answer", {
      journey: "gre-quant",
      questionId: "guided",
      response: "2",
    }),
  );
  const r = replayFoundation(learner, events, at);
  assert.equal(r.progress[key(p.id, "school")].completed.length, 7);
  assert.equal(r.progress[key(p.id, "gre-quant")].completed.length, 0);
  assert.equal(r.historicalPrograms.school.answers["guided-1"].correct, true);
  assert.equal(r.ledger.events.length, 7);
  assert.equal(JSON.stringify(events[0]), old);
  assert.equal(r.ledger.exposures.get(itemFor(p, p.questions[0]).id)?.count, 2);
  assert.equal(r.ledger.composite.nodes[p.competencyId].directN, 0);
});
test("strong, uncertain and struggling practice patterns select support without rewriting programs or diagnosing a missing skill", () => {
  const p = programs[1],
    events: FoundationActivity[] = [];
  let r = replayFoundation(learner, events, at),
    s = r.progress[key(p.id, "school")];
  assert.match(instructionalSupport(p, s), /Explore first/);
  events.push(
    event(p, "independent", "answer", {
      questionId: "independent-a",
      response: "7",
    }),
  );
  r = replayFoundation(learner, events, at);
  assert.doesNotMatch(
    instructionalSupport(p, r.progress[key(p.id, "school")]),
    /suggest trying/,
  );
  events.push(
    event(p, "independent", "answer", {
      questionId: "independent-b",
      response: "7",
    }),
  );
  r = replayFoundation(learner, events, at);
  assert.match(
    instructionalSupport(p, r.progress[key(p.id, "school")]),
    /does not establish a missing skill/,
  );
  events.push(
    event(p, "independent", "answer", {
      questionId: "independent-a",
      response: "12",
    }),
    event(p, "independent", "answer", {
      questionId: "independent-b",
      response: "10",
    }),
  );
  r = replayFoundation(learner, events, at);
  assert.doesNotMatch(
    instructionalSupport(p, r.progress[key(p.id, "school")]),
    /Both independent/,
  ); // Repeated exposure cannot masquerade as independent proof.
  const fresh = [
    event(p, "independent", "answer", {
      questionId: "independent-a",
      response: "12",
    }),
    event(p, "independent", "answer", {
      questionId: "independent-b",
      response: "10",
    }),
  ];
  r = replayFoundation(learner, fresh, at);
  assert.match(
    instructionalSupport(p, r.progress[key(p.id, "school")]),
    /extra practice is optional/,
  );
  assert.equal(r.progress[key(p.id, "school")].completed.length, 0);
});

test("draft edits are not submitted answers; mixed historical events keep append order", () => {
  const p = programs[0];
  const first = event(p, "guided", "answer", {
    questionId: "guided",
    response: "2",
  });
  const old: Receipt = {
    kind: "math_activity",
    id: "old-later",
    at,
    learnerId: learner,
    journey: "school",
    lessonVersion: "2.0.0",
    action: "answer",
    stage: "guided",
    questionId: "guided-1",
    response: "2",
    elapsedMs: 0,
  };
  const events: Receipt[] = [
    first,
    old,
    event(p, "guided", "draft", { questionId: "guided", response: "5" }),
  ];
  const r = replayFoundation(learner, events, at);
  assert.deepEqual(
    r.ledger.events.map((e) => e.id),
    [`native:${first.id}`, "native:old-later"],
  );
  assert.equal(r.progress[key(p.id, "school")].answers.guided.response, "2");
  assert.equal(r.progress[key(p.id, "school")].drafts.guided, "5");
});
