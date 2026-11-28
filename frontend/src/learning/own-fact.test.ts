/**
 * own-fact@1: right answers on other facts do not show a skill on your own over one of its own exact facts known wrong
 * (child lab S02, S02c, S11: times tables were shown while 7 × 8 = 54 stood). A slip after the skill is shown is still judged
 * by status@2 (two of the last three), not by this rule.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { learnerState, make } from "../../../packages/learning/src/session";
import type { LearningRecord } from "../../../packages/learning/src/records";
import { boardFor } from "../../../packages/learning/src/curricula";

const MT = "MATH.number.multiplication-tables";
function learner() {
  let now = Date.parse("2026-11-02T09:00:00Z");
  const events: LearningRecord[] = [];
  const ctx = () => ({ learnerId: "own-fact", sessionId: "s1", at: new Date((now += 60_000)).toISOString() });
  events.push(make.enrol(ctx(), 5, "2026-27", boardFor("tn", 5)!) as LearningRecord);
  return {
    answer: (q: string, r: string, o: { hints?: number } = {}) => events.push(make.attempt(ctx(), q, r, "practice" as never, { hints: o.hints ?? 0 }) as LearningRecord),
    ev: () => learnerState("own-fact", events, now, { currentSession: "s1" }).evidence(MT),
  };
}
test("a wrong 7 × 8 holds times tables below shown, whatever other facts say, until 7 × 8 is right alone", () => {
  const l = learner();
  l.answer("mt-d1", "54"); l.answer("mt-d2", "42"); l.answer("gen:mul:9,6", "54"); l.answer("gen:mul:4,3", "12");
  assert.ok(!["independent", "transfer", "verified"].includes(l.ev().status), l.ev().status);
  assert.equal(l.ev().factHeld?.key, "MT:7x8");
  l.answer("mt-r1", "56");
  assert.equal(l.ev().factHeld, undefined);
  assert.ok(["independent", "transfer"].includes(l.ev().status), l.ev().status);
});
test("a wrong answer with help also counts: the fact is not known; a right one with help does not clear it", () => {
  const l = learner();
  l.answer("mt-d1", "54", { hints: 1 }); l.answer("mt-d2", "42"); l.answer("gen:mul:9,6", "54"); l.answer("mt-r1", "56", { hints: 1 });
  assert.equal(l.ev().factHeld?.key, "MT:7x8");
});
test("status@2 is unchanged: one slip on a fact after the skill is shown does not undo it", () => {
  const l = learner();
  l.answer("mt-d2", "42"); l.answer("gen:mul:9,6", "54"); l.answer("gen:mul:4,3", "12");
  assert.ok(["independent", "transfer"].includes(l.ev().status));
  l.answer("mt-d1", "54");
  assert.equal(l.ev().factHeld, undefined);
  assert.ok(["independent", "transfer"].includes(l.ev().status), l.ev().status);
});
