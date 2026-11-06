/**
 * Consolidation #112, evidence worker. Helped vs independent answers on the real app path (SliceSession; the engine chooses every question).
 *   - an answer with a hint, a guided item, or a second try at a problem is recorded and counted as helped, never as on your own;
 *   - every first, unaided answer outside guided practice is counted on your own (none is discarded), and replay from saved JSON agrees;
 *   - records.ts lesson-review rule (solution-scope@1, v3): only guided-phase answers after a lesson review count as helped;
 *     check/practice/retention answers in the same session are independent if unaided; the next session's answers are independent too.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { make } from "../../../packages/learning/src/session";
import { SHOWN, brief, drive, reloads, start, type Step } from "./evid-driver";

useReviewFixture({ items: [], releasedAt: "2025-01-01T00:00:00Z", all: true });
const C = "MATH.algebra.linear-intro";

test("a hint on every answer: everything recorded, nothing on your own, never shown on your own; reload agrees", () => {
  const s = start("evid-assisted-hints", C);
  const trail: Step[] = [];
  drive(s, C, { right: () => true, hints: () => 1 }, trail, 30);
  const e = s.state().evidence(C);
  const answered = trail.filter((t) => t.q).length;
  assert.ok(answered >= 3, brief(trail));
  assert.equal(e.independent.total, 0);
  assert.equal(e.assisted.total, answered);
  assert.ok(trail.every((t) => !SHOWN.includes(t.status)), brief(trail));
  reloads(s, C);
});

test("first unaided answers are all counted on your own; guided items and hints only as helped; reload agrees", () => {
  const s = start("evid-assisted-mixed", C);
  const trail: Step[] = [];
  // wrong on x − a until its lesson, a hint on the guided item, everything else right alone
  let k = 0;
  drive(s, C, { right: (q, x) => !(q.startsWith("gen:ahone:1,") && x.taught.size === 0), hints: (_q, phase) => (phase === "guided" ? 1 : k++ === 3 ? 2 : 0) }, trail, 40);
  const st = s.state(), e = st.evidence(C);
  const mine = st.records.attempts.filter((a) => a.competency === C);
  const alone = mine.filter((a) => a.hints === 0 && !a.solution && a.n === 1 && a.activity !== "guided" && a.activity !== "probe");
  assert.ok(trail.some((t) => t.phase === "guided"), brief(trail));
  assert.equal(e.independent.total, alone.length, "every first unaided answer counts on your own");
  assert.equal(e.assisted.total, mine.length - alone.length - mine.filter((a) => a.activity === "probe" && a.hints === 0 && a.n === 1).length);
  assert.equal(e.assisted.total, mine.filter((a) => a.hints > 0 || a.activity === "guided" || a.n > 1 || a.solution).length);
  reloads(s, C);
});

test("solution-scope@1: only guided answers after a lesson review count as helped; practice/check answers are independent", () => {
  const s = start("evid-assisted-review", C, Date.parse("2026-01-01T00:00:00Z"), false);
  s.events.push(make.teach({ learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now).toISOString() }, C, moduleFor(C)!.strategies[0].id, "foundation-lesson-review@1"));
  // guided answer after teaching → helped (solution = true)
  s.submit("gen:ahone:0,14,20", question("gen:ahone:0,14,20").answer, "guided");
  // practice answers after teaching → independent (solution = false with the fix)
  for (const q of ["gen:ahone:2,4,3", "gen:ahone:3,7,20:mc"]) s.submit(q, question(q).answer, "practice");
  let e = s.state().evidence(C);
  assert.equal(e.assisted.total, 1, "only the guided answer is assisted");
  assert.equal(e.independent.total, 2, "practice answers are independent even after teaching");
  s.wait(1);
  for (const q of ["gen:ahone:0,9,9:mc", "gen:ahone:2,10,10"]) s.submit(q, question(q).answer, "practice");
  e = s.state().evidence(C);
  assert.equal(e.independent.total, 4, "next session's practice answers are also independent");
  assert.equal(e.assisted.total, 1, "only the one guided answer remains assisted");
  reloads(s, C);
});
