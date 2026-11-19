// together@1: before the product stops for a person, it works a question with the learner, then asks one alone.
import test from "node:test";
import assert from "node:assert/strict";
import { Driver } from "./driver";
import { boardFor } from "../../../packages/learning/src/curricula";
import { question, questions } from "../../../packages/learning/src/content";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { TOGETHER } from "../../../packages/learning/src/intervention";
import { stepsHelp } from "../../../packages/learning/src/step-help";

const wrong = (q: string) => { const p = question(q) as { type: string; answer: string }; return p.type === "choice" ? (p.answer === "A" ? "B" : "A") : p.answer === "7" ? "8" : "7"; };

test("together@1: a child who stays wrong is walked through a question, then asked one alone, before any stop", () => {
  useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
  try {
    const skill = "MATH.measurement.length-conversion", release = boardFor("icse", 5)!;
    const d = new Driver("together-test", Date.parse("2026-11-06T09:00:00Z"));
    d.enrol(5, "2026-27", release);
    const seen: { phase: string; context?: string; q: string | null; reason?: string }[] = [];
    let after = false; // answers right from the first walk-through on
    for (let sitting = 0; sitting < 3; sitting++) {
      if (sitting) d.newSession(1);
      for (let i = 0; i < 60; i++) {
        const before = d.trace.length;
        const ms = d.step(skill, (q) => (after ? (question(q) as { answer: string }).answer : wrong(q)));
        seen.push({ phase: ms.phase, context: ms.context, q: ms.question, reason: ms.reason });
        if (ms.context === TOGETHER.context) after = true;
        if (d.trace.length === before || ["done", "pause", "unavailable", "waiting"].includes(ms.phase)) break;
      }
    }
    const i = seen.findIndex((s) => s.context === TOGETHER.context);
    assert.ok(i > 0, "a walk-through is offered");
    assert.ok(!seen.slice(0, i).some((s) => s.phase === "pause"), "no stop for a person before the walk-through");
    assert.equal(seen[i].phase, "guided", "the walk-through is practice with help, never a test");
    assert.ok((stepsHelp(seen[i].q!)?.length ?? 0) >= 2, "the walked question has steps to type");
    assert.equal(seen[i + 1].phase, "check", "then one alone");
    assert.notEqual(seen[i + 1].q, seen[i].q, "on a fresh question");
    const walk = d.state().records.attempts.find((a) => a.context === TOGETHER.context)!;
    assert.equal(walk.activity, "guided", "recorded as helped");
  } finally { useReviewFixture(null); }
});

test("together@1: bounded: a child who is never right gets a fixed number of walk-throughs, at most two a sitting, then a person", () => {
  useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
  try {
    const skill = "MATH.measurement.length-conversion", release = boardFor("icse", 5)!;
    const d = new Driver("together-bound", Date.parse("2026-11-06T09:00:00Z"));
    d.enrol(5, "2026-27", release);
    const per: number[] = []; let lastReason = "";
    for (let sitting = 0; sitting < 6; sitting++) {
      if (sitting) d.newSession(1);
      let n = 0;
      for (let i = 0; i < 60; i++) {
        const before = d.trace.length;
        const ms = d.step(skill, wrong);
        if (ms.context === TOGETHER.context) n++;
        if (ms.phase === "pause") lastReason = ms.reason ?? "";
        if (d.trace.length === before || ["done", "pause", "unavailable", "waiting"].includes(ms.phase)) break;
      }
      per.push(n);
    }
    assert.ok(per.every((n) => n <= TOGETHER.sitting), `at most ${TOGETHER.sitting} a sitting: ${per}`);
    assert.equal(per.reduce((a, b) => a + b, 0), TOGETHER.all, `walk-throughs in all: ${per}`);
    assert.match(lastReason, /teacher or parent/, "after the ladder, a person");
  } finally { useReviewFixture(null); }
});
