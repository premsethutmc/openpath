import { test } from "node:test";
import assert from "node:assert/strict";
import { items } from "../../../packages/tamil/src/index";
import {
  answerSession,
  beginPractice,
  newSession,
  parseSession,
  present,
  revealHint,
  type Session,
} from "./session";
const current = (s: Session) =>
  items.find(
    (i) =>
      i.id ===
      (s.phase === "diagnostic" ? s.diagnosticIds : s.practiceIds)[s.cursor],
  )!;
function answer(s: Session, wrong = false) {
  s = present(s);
  return answerSession(s, wrong ? "தவறு" : current(s).answers[0], false);
}
test("actual session moves from diagnosis to relevant Tamil teaching, practice and structured export", () => {
  let s = {
    ...newSession("existing-English-pupil"),
    phase: "diagnostic" as const,
  } as Session;
  for (let i = 0; i < 6; i++) s = answer(s, i === 2);
  assert.equal(s.phase, "teach");
  assert.equal(s.target, "TA.length");
  assert.equal(s.events.length, 6);
  s = beginPractice(s);
  while (s.phase === "practice") s = answer(s);
  assert.equal(s.phase, "done");
  assert.equal(s.events.length, 9);
  assert.ok(
    s.events.every(
      (e) =>
        e.learnerId === "existing-English-pupil" && !e.eligibleForInference,
    ),
  );
  assert.equal(s.events.at(-1)?.transfer, true);
  assert.ok(s.events.at(-3)?.support.revealed);
  assert.ok(s.events.at(-2)?.independenceCandidate);
  assert.deepEqual(
    parseSession(JSON.stringify(s), "existing-English-pupil"),
    s,
  );
});
test("hints survive reload and abandoned/reopened prompts are repeated exposure", () => {
  let s = { ...newSession("pupil"), phase: "diagnostic" as const } as Session;
  s = revealHint(present(s));
  s = parseSession(JSON.stringify(s));
  s = present(s);
  s = answerSession(s, current(s).answers[0], false);
  assert.equal(s.events[0].support.hint, true);
  assert.equal(s.events[0].exposure, "repeat");
  assert.equal(s.events[0].independenceCandidate, false);
});
test("restart keeps learner identity, history and exposure while selecting fresh diagnostic families", () => {
  let s = { ...newSession("pupil"), phase: "diagnostic" as const } as Session;
  const id = current(s).id;
  s = answer(s);
  const next = newSession(s.learnerId, s.events, s.presentations);
  assert.equal(next.learnerId, s.learnerId);
  assert.notEqual(next.sessionId, s.sessionId);
  assert.notEqual(next.diagnosticIds[0], id);
  assert.equal(next.events.length, 1);
});
test("invalid storage and invalid responses fail without replacing the ledger", () => {
  const s = newSession("pupil");
  assert.throws(() => answerSession(s, "அ", false));
  assert.throws(() => parseSession("garbage"));
  assert.throws(() => parseSession(JSON.stringify(s), "different-pupil"));
  assert.throws(() =>
    parseSession(JSON.stringify({ ...s, phase: "diagnostic", cursor: 900 })),
  );
  assert.throws(() =>
    parseSession(JSON.stringify({ ...s, diagnosticIds: ["not-found"] })),
  );
  const started = present({ ...s, phase: "diagnostic" });
  assert.throws(() => answerSession(started, "", false));
  assert.equal(started.events.length, 0);
});

test("every pilot competency is reachable through a focused diagnostic and its own teaching", async () => {
  const { competencies } = await import("../../../packages/tamil/src/index");
  const { focusSession } = await import("./session");
  for (const c of competencies.filter((c) => c.status === "pilot")) {
    let s = focusSession(newSession("pupil"), c.id);
    s = answer(s);
    assert.equal(s.phase, "teach");
    assert.equal(s.target, c.id);
    s = beginPractice(s);
    while (s.phase === "practice") s = answer(s);
    assert.equal(s.phase, "done");
    assert.ok(s.events.length >= 2);
  }
});
