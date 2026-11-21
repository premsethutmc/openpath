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
  assert.deepEqual(childSummary(l, clock()).syllabus, { name: "CBSE Class 10", practised: 2, total, notYet: after.notYet.slice(0, 3).map((x) => x.text) });
  await l.setPreferences("older", "grammar", null);
  assert.equal(syllabusPractice(l), null);
});
