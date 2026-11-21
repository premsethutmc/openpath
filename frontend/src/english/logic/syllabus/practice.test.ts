/**
 * The child's own syllabus, practised: lines count as practised once the stream or grammar topic they point to has
 * an answer; a learner without a class sees none; the parent view carries it.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Learner } from "../learner.ts";
import { loadContent } from "../content.ts";
import { MemoryRepo } from "../store.ts";
import { testClock } from "../journey-sim.ts";
import { syllabusPractice } from "./practice.ts";
import { syllabusFor } from "./syllabus.ts";
import { childSummary } from "../parent-view.ts";

test("SP-1 a CBSE Class 10 child: nothing practised, then a grammar topic and a chart count; adults see none", async () => {
  const c = loadContent({ mode: "development" });
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Asha", "guardian", clock, "p-sp");
  assert.equal(syllabusPractice(l), null, "no class set");
  await l.setPreferences("school", "grammar", { class: 10, board: "cbse" });
  const s = syllabusFor(10, "cbse");
  const total = s.strands.flatMap((x) => x.outcomes).filter((o) => o.coverage !== "not").length;
  const before = syllabusPractice(l)!;
  assert.deepEqual([before.name, before.practised, before.total, before.notYet.length], ["CBSE Class 10", 0, total, total]);
  await l.recordGrammar([{ type: "answer", sitting: "g1", id: "x", level: 5, topic: "modals", correct: true, given: "must" }]);
  await l.recordStudy([{ type: "study", task: "chart.g1", kind: "chart", answers: [{ skill: "chart_read", correct: true }] }]);
  const after = syllabusPractice(l)!;
  const lines = (ids: string[]) => s.strands.flatMap((x) => x.outcomes).filter((o) => ids.includes(o.id));
  assert.ok(lines(["G3", "W2"]).every((o) => !after.notYet.some((n) => n.id === o.id)), "modals (G3) and the chart paragraph (W2) are practised");
  assert.equal(after.practised, 2);
  assert.equal(after.secure, 0, "answers on one day are practising, not secure");
  assert.deepEqual(childSummary(l, clock()).syllabus, { name: "CBSE Class 10", secure: 0, due: 0, practised: 2, total, notYet: after.notYet.slice(0, 3).map((x) => x.text) });
  await l.setPreferences("older", "grammar", null);
  assert.equal(syllabusPractice(l), null);
});

test("SP-2 secure needs two days and four in five right on the latest; a grown-up's full ticks make a task line secure", async () => {
  const c = loadContent({ mode: "development" });
  let now = Date.parse("2026-11-02T09:00:00Z");
  const clock = () => new Date(now).toISOString();
  const l = await Learner.create(c, new MemoryRepo(), "Ravi", "guardian", clock, "p-sp2");
  await l.setPreferences("school", "grammar", { class: 10, board: "cbse" });
  const ans = (correct: boolean) => ({ type: "answer" as const, sitting: "g", id: "x", level: 5, topic: "modals", correct, given: "" });
  const stage = (id: string) => syllabusPractice(l)!.stages.find((x) => x.id === id)!.stage;
  await l.recordGrammar([ans(true), ans(true)]);
  assert.equal(stage("G3"), "practising", "one day only");
  now += 86_400_000;
  await l.recordGrammar([ans(true), ans(false)]);
  assert.equal(stage("G3"), "practising", "half right on the latest day");
  now += 86_400_000;
  await l.recordGrammar([ans(true), ans(true), ans(true), ans(true), ans(false)]);
  assert.equal(stage("G3"), "secure", "four in five right on a later day");
  assert.equal(syllabusPractice(l)!.secure, 1);
  // three weeks with no answers on it: due for a fresh check, and Home asks for it before a new line
  now += 21 * 86_400_000;
  assert.equal(stage("G3"), "due");
  assert.deepEqual([syllabusPractice(l)!.due, syllabusPractice(l)!.dueLines[0].id], [1, "G3"]);
  // the check: mostly wrong goes back to practising; right again is secure
  await l.recordGrammar([ans(false), ans(false), ans(true)]);
  assert.equal(stage("G3"), "practising");
  now += 86_400_000;
  await l.recordGrammar([ans(true), ans(true), ans(true), ans(true)]);
  assert.equal(stage("G3"), "secure");
});
