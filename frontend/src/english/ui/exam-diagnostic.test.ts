import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { initialSession, answer, submitWriting, revise, QUESTIONS } from "../logic/exam-diagnostic/session";
(globalThis as { React?: unknown }).React = React;
const { ExamDiagnostic, ExamDiagnosticView, examStore, EXAM_STORAGE_KEY } = await import("./ExamDiagnostic");
const sample = Array(55).fill("evidence").join(" ");
const readingDone = () => QUESTIONS.reduce((s, q) => answer(s, q.id, q.answer), initialSession());
const done = () => submitWriting(readingDone(), sample);
const memory = () => {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
};
function view(session = initialSession(), writing = session.writing) {
  return renderToStaticMarkup(React.createElement(ExamDiagnosticView, { session, writing, revision: session.revision, onWriting() {}, onRevision() {}, onAnswer() {}, onSubmit() {}, onSkip() {}, onRevise() {} }));
}
test("reading hides explanations until completed and report bounds claims", () => {
  const reading = view();
  assert.match(reading, /Question 1 of 4/);
  for (const q of QUESTIONS) assert.ok(!reading.includes(q.explanation));
  const html = view(done());
  assert.match(html, /Saved, not assessed/);
  assert.match(html, /No model analysis has run/);
  assert.match(html, /predicted scores remain unknown/);
  assert.match(view(revise(done(), "A revision")), /Saving does not mean it has improved/);
});
test("writing text is escaped and writing stage has no assessed feedback", () => {
  const html = view(readingDone(), "<script>alert(1)</script>");
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("Possible gap to check"));
});
test("storage refuses conflicting writes and clears only its namespace", () => {
  const storage = memory();
  storage.setItem("other", "keep");
  const a = examStore(storage), b = examStore(storage);
  a.save(done());
  assert.throws(() => b.save(initialSession()), /another tab/);
  assert.throws(() => b.clear(), /another tab/);
  a.clear();
  assert.equal(storage.getItem("other"), "keep");
  assert.equal(storage.getItem(EXAM_STORAGE_KEY), null);
});
test("failed save can retry without advancing expected value", () => {
  const storage = memory(); let fail = true;
  const store = examStore({ ...storage, setItem(k, v) { if (fail) throw new Error("quota"); storage.setItem(k,v); } });
  assert.throws(() => store.save(done()), /quota/);
  fail = false; store.save(done());
  assert.deepEqual(store.load(), done());
});
test("invalid persisted data is preserved and offers explicit clearing", () => {
  const storage = memory(); storage.setItem(EXAM_STORAGE_KEY, "broken-json");
  const html = renderToStaticMarkup(React.createElement(ExamDiagnostic, { storage }));
  assert.match(html, /It has been preserved/);
  assert.match(html, /Clear only this preview/);
  assert.equal(storage.getItem(EXAM_STORAGE_KEY), "broken-json");
});
