/**
 * Regression: records.ts solution-scope@1
 *
 * The `solution` field on an attempt distinguishes genuinely assisted work (guided practice after
 * teaching) from later independent answers. Before this fix, every attempt after a
 * foundation-lesson-review@1 teaching in the same session+competency got solution=true, preventing
 * any post-teaching answer from counting as "on your own" (independent).
 *
 * The fix: only `guided` activity answers after teaching get solution=true. Check, practice,
 * retention and transfer answers are independent if unaided and first-exposure.
 *
 * Both cases are verified with save/reload to confirm the stored records reproduce the same result.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { SliceSession } from "./session";

const C = "MATH.algebra.linear-intro";

function reload(s: SliceSession) {
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  return learnerState(s.learnerId, saved, s.now, { currentSession: s.session });
}

test("guided answer after teaching has solution=true; practice/check answers have solution=false", () => {
  const at = Date.parse("2026-01-01T00:00:00Z");
  const s = new SliceSession("records-solution-scope", C, at);
  const m = moduleFor(C)!;

  // Insert a teaching record
  s.events.push(make.teach(
    { learnerId: s.learnerId, sessionId: s.session, at: new Date(at).toISOString() },
    C, m.strategies[0].id, "foundation-lesson-review@1"
  ));

  // Guided answer (genuinely assisted) → solution should be true
  const q1 = "gen:ahone:0,14,20";
  s.submit(q1, question(q1).answer, "guided");

  // Practice answer (independent work) → solution should be false
  const q2 = "gen:ahone:2,4,3";
  s.submit(q2, question(q2).answer, "practice");

  // Check answer (independent verification) → solution should be false
  const q3 = "gen:ahone:3,7,20:mc";
  s.submit(q3, question(q3).answer, "check");

  const st = s.state();
  const attempts = st.records.attempts.filter((a) => a.competency === C);
  assert.equal(attempts.length, 3, "three attempts recorded");

  const guided = attempts.find((a) => a.questionId === q1)!;
  const practice = attempts.find((a) => a.questionId === q2)!;
  const check = attempts.find((a) => a.questionId === q3)!;

  assert.equal(guided.solution, true, "guided answer after teaching is solution=true");
  assert.equal(practice.solution, false, "practice answer after teaching is solution=false");
  assert.equal(check.solution, false, "check answer after teaching is solution=false");

  // independent flag: only practice and check qualify (guided is excluded by activity !== "guided")
  const ev = st.evidence(C);
  assert.equal(ev.independent.total, 2, "practice and check are independent");
  assert.equal(ev.assisted.total, 1, "only guided is assisted");
});

test("solution=true from server record (r.solution) is preserved regardless of activity", () => {
  const at = Date.parse("2026-01-01T00:00:00Z");
  const s = new SliceSession("records-solution-server", C, at);

  // Submit a practice answer, then patch the raw record's solution field to simulate server-set solution
  const q = "gen:ahone:0,14,20";
  s.submit(q, question(q).answer, "practice");
  const rawAttempt = s.events.find((e) => e.record === "attempt" && e.questionId === q);
  assert.ok(rawAttempt, "raw attempt exists");
  (rawAttempt as { solution: boolean }).solution = true; // simulate server marking it as solution-shown

  const st = s.state();
  const attempts = st.records.attempts.filter((a) => a.competency === C);
  assert.equal(attempts[0].solution, true, "server-set solution=true is preserved for practice");
});

test("save/reload: solution field survives round-trip through stored records", () => {
  const at = Date.parse("2026-01-01T00:00:00Z");
  const s = new SliceSession("records-solution-reload", C, at);
  const m = moduleFor(C)!;

  s.events.push(make.teach(
    { learnerId: s.learnerId, sessionId: s.session, at: new Date(at).toISOString() },
    C, m.strategies[0].id, "foundation-lesson-review@1"
  ));

  s.submit("gen:ahone:0,14,20", question("gen:ahone:0,14,20").answer, "guided");
  s.submit("gen:ahone:2,4,3", question("gen:ahone:2,4,3").answer, "practice");
  s.submit("gen:ahone:3,7,20:mc", question("gen:ahone:3,7,20:mc").answer, "check");

  const live = s.state();
  const reloaded = reload(s);

  const liveAttempts = live.records.attempts.filter((a) => a.competency === C);
  const reloadAttempts = reloaded.records.attempts.filter((a) => a.competency === C);

  for (let i = 0; i < liveAttempts.length; i++) {
    assert.equal(reloadAttempts[i].solution, liveAttempts[i].solution,
      `attempt ${i} (${liveAttempts[i].activity}): solution matches after reload`);
  }

  assert.deepEqual(
    [reloaded.evidence(C).independent.total, reloaded.evidence(C).assisted.total],
    [live.evidence(C).independent.total, live.evidence(C).assisted.total],
    "independent/assisted counts match after reload"
  );
});
