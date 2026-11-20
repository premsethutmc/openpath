// taught@1: per skill, how well OpenPath taught it and how sure we are; own-it@1: the child is never sent off to find an adult.
import test from "node:test";
import assert from "node:assert/strict";
import { Driver } from "./driver";
import { boardFor } from "../../../packages/learning/src/curricula";
import { question, questions } from "../../../packages/learning/src/content";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { taughtMarks, ownIt, COME_BACK } from "../../../packages/learning/src/taught";

const wrong = (q: string) => { const p = question(q) as { type: string; answer: string }; return p.type === "choice" ? (p.answer === "A" ? "B" : "A") : p.answer === "7" ? "8" : "7"; };
const right = (q: string) => (question(q) as { answer: string }).answer;

test("taught@1: a child who stays wrong after the whole checklist is the parent's turn; a child who is right is marked sure, with no steps owed", () => {
  useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
  try {
    const d = new Driver("taught-test", Date.parse("2026-11-06T09:00:00Z"));
    d.enrol(5, "2026-27", boardFor("icse", 5)!);
    const plan: [string, (q: string) => string][] = [["MATH.measurement.length-conversion", wrong], ["MATH.measurement.rectangle-area", right]];
    for (const [skill, ans] of plan) for (let s = 0; s < 6; s++) {
      d.newSession(s ? 2 : 0);
      for (let i = 0; i < 60; i++) { const b = d.trace.length; const ms = d.step(skill, ans); if (d.trace.length === b || ["done", "pause", "unavailable", "waiting"].includes(ms.phase)) break; }
    }
    const st = d.state();
    const marks = taughtMarks(st.records, st.evidence);
    const stuck = marks.find((m) => m.competency === "MATH.measurement.length-conversion")!;
    assert.equal(stuck.confidence, "not_yet");
    assert.equal(stuck.taught, "fully", JSON.stringify(stuck.checks));
    assert.ok(stuck.sitDown, "fully taught and not yet: the parent's turn");
    assert.equal(marks[0].competency, stuck.competency, "listed first");
    assert.equal(stuck.checks.find((c) => c.id === "together")!.state, "done");
    const easy = marks.find((m) => m.competency === "MATH.measurement.rectangle-area")!;
    assert.equal(easy.confidence, "sure");
    assert.ok(!easy.sitDown && easy.checks.every((c) => c.state !== "to_come"), "nothing owed once sure");
    assert.ok(!/%/.test(marks.map((m) => m.why).join(" ")), "a level with a reason, never a percentage");
  } finally { useReviewFixture(null); }
});

test("taught@1: too few answers is 'too early', not a verdict", () => {
  const ev = { status: "guided" as const, verified: false, independent: { right: 0, total: 2 }, assisted: { right: 1, total: 1 }, recoveryRequired: false, retention: "none" as const };
  const [m] = taughtMarks({ attempts: [], teaching: [{ at: "2026-11-06T09:00:00Z", rule: "r", strategy: "s", competency: "MATH.measurement.length-conversion", session: "x" }] }, () => ev);
  assert.equal(m.confidence, "too_early");
  assert.equal(m.taught, "partly");
});

test("own-it@1: what the child reads never sends them to find an adult, and says the skill comes back", () => {
  for (const r of [
    "Every explanation here has been tried. Carry on, and go through this with a teacher or parent; it will come back.",
    "Different explanations have not clicked yet. That is not a failure: carry on, and ask a teacher or parent to go through it with you.",
    "Your answers could not be read. This needs a person: go through it with a teacher or parent.",
    "",
  ]) {
    const t = ownIt(r);
    assert.ok(!/teacher|parent|a person/i.test(t), t);
    assert.ok(t.endsWith(COME_BACK), t);
  }
  assert.equal(ownIt("Every explanation here has been tried. Carry on, and go through this with a teacher or parent; it will come back."), `Every explanation here has been tried. ${COME_BACK}`);
});
