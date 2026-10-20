import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSession,
  duration,
  timeSlice,
  examScope,
  EXAM_GOALS,
  type JourneyRecord,
} from "../../../packages/learning/src/journey";
import { sampleFor } from "../../../packages/learning/src/curricula";
import { learnerState, make } from "../../../packages/learning/src/session";
import { question } from "../../../packages/learning/src/content";
const release = sampleFor(7)!;
const context = {
  learnerId: "one",
  sessionId: "learn:one:visit",
  at: new Date().toISOString(),
};
const enrol = make.enrol(context, 7, "2026-27", release);
const st = () =>
  learnerState("one", [enrol], Date.now(), {
    currentSession: context.sessionId,
  });
test("30-minute plan uses exact selected release and canonical next; missing rational lesson is not invented", () => {
  const s = st(),
    p = buildSession(release, s.evidence, s.records, [], 30);
  assert.equal(p.curriculum.hash, release.hash);
  assert.equal(p.modules.length, 2);
  assert.equal(p.modules[0].competency, s.next!.competency);
  assert.ok(
    !p.modules.some((m) => m.competency === "MATH.number.rational-numbers"),
  );
  assert.ok(p.modules.reduce((n, m) => n + m.estimatedMs, 0) <= 30 * 60000);
  assert.ok(release.source.synthetic);
});
test("GRE shares percentage competency identity, never school session completion or readiness", () => {
  const s = st(),
    school = buildSession(
      release,
      s.evidence,
      s.records,
      [],
      30,
      "school",
      "MATH.number.percentage",
    ),
    exam = buildSession(release, s.evidence, s.records, [], 30, "gre-quant");
  assert.notEqual(school.id, exam.id);
  assert.equal(school.modules[0].competency, "MATH.number.percentage");
  assert.ok(
    exam.modules.some((m) => m.competency === "MATH.number.percentage"),
  );
  assert.equal(examScope("gre-quant")!.scoringRules, null);
  assert.equal(examScope("gre-quant")!.formatsVerified, false);
  assert.equal(EXAM_GOALS.find((g) => g.id === "tnpsc")!.tracks.length, 0);
  assert.equal(EXAM_GOALS.find((g) => g.id === "upsc")!.tracks.length, 0);
  const q = question("gen:pct:20,220");
  const attempt = make.attempt(context, q.id, q.answer, "practice");
  const receipt = {
    kind: "math_session",
    version: "math-session@1",
    id: "usage",
    at: context.at,
    learnerId: "one",
    sessionId: context.sessionId,
    planId: school.id,
    action: "finish",
    competency: q.competency,
  } as JourneyRecord;
  const a = learnerState("one", [enrol, attempt], Date.now()),
    b = learnerState("one", [enrol, attempt, receipt], Date.now());
  assert.deepEqual(a.evidence(q.competency), b.evidence(q.competency));
  assert.notEqual(b.evidence(q.competency).status, "verified");
  const repeated = make.attempt(
    { ...context, sessionId: "learn:one:exam" },
    q.id,
    q.answer,
    "diagnostic",
  );
  const shared = learnerState("one", [enrol, attempt, repeated], Date.now());
  assert.equal(shared.records.attempts[1].n, 2);
});
test("active, idle, solving are separate monotonic intervals; hidden time is not active", () => {
  assert.deepEqual(timeSlice(0, 90000, 0, true, true), {
    activeMs: 60000,
    idleMs: 30000,
    solvingMs: 60000,
    helpCount: 0,
  });
  assert.equal(timeSlice(90000, 120000, 0, true, false).activeMs, 0);
  assert.deepEqual(timeSlice(0, 5000, 0, false, true), {
    activeMs: 0,
    idleMs: 5000,
    solvingMs: 0,
    helpCount: 0,
  });
  assert.equal(timeSlice(10000, 5000, 0, true, true).activeMs, 0);
});
test("duration estimator conservatively learns only completed activity times, not answers or mastery", () => {
  const base = {
    kind: "math_session",
    version: "math-session@1",
    learnerId: "one",
    sessionId: "learn:one:v",
    id: "r",
    at: context.at,
    planId: "p",
    competency: "MATH.number.percentage",
  } as const;
  assert.deepEqual(duration(base.competency, []), {
    estimatedMs: 720000,
    source: "default",
  });
  const rows: JourneyRecord[] = [
    {
      ...base,
      action: "time",
      usage: {
        activeMs: 1200000,
        idleMs: 40000,
        solvingMs: 10000,
        helpCount: 1,
      },
    },
    { ...base, id: "f", action: "finish" },
  ];
  assert.deepEqual(duration(base.competency, rows), {
    estimatedMs: 840000,
    source: "history",
  });
  assert.equal(duration(base.competency, rows.slice(0, 1)).source, "default");
});
test("shown school foundations are reused without assigning the same lesson again; optional study stays available", () => {
  const a = question("gen:pct:20,220"),
    b = question("gen:pct:60,240");
  const state = learnerState(
    "one",
    [
      enrol,
      make.attempt(context, a.id, a.answer, "practice"),
      make.attempt(context, b.id, b.answer, "practice"),
    ],
    Date.now(),
  );
  assert.equal(state.evidence(a.competency).status, "independent");
  const plan = buildSession(
    release,
    state.evidence,
    state.records,
    [],
    30,
    "gre-quant",
  );
  assert.ok(!plan.modules.some((m) => m.competency === a.competency));
  const optional = buildSession(
    release,
    state.evidence,
    state.records,
    [],
    30,
    "gre-quant",
    a.competency,
  );
  assert.equal(optional.modules[0].competency, a.competency);
  assert.notEqual(state.evidence(a.competency).status, "verified");
});
