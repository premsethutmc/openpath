import test from "node:test";
import assert from "node:assert/strict";
import { GUIDED, done, guidedProblems, guidedSummary, tasksFor } from "./guided.ts";
import { SYLLABUSES, coverage, syllabusProblems } from "../syllabus/syllabus.ts";
import { loadContent } from "../content.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { testClock } from "../journey-sim.ts";

test("GT-1 content: every task names its syllabus line, what to do and what an adult looks for", () => {
  assert.deepEqual(guidedProblems(GUIDED), []);
  const bad = { ...GUIDED, tasks: [{ ...GUIDED.tasks[0], look: ["a"] }, { ...GUIDED.tasks[0] }] };
  assert.match(guidedProblems(bad).join("\n"), /two to four[\s\S]*listed twice/);
});

test("GT-2 every syllabus line marked 'with a grown-up' has at least two tasks, and every task serves such a line", () => {
  const lines = new Set<string>();
  for (const s of SYLLABUSES) {
    assert.deepEqual(syllabusProblems(s), []);
    for (const o of s.strands.flatMap((st) => st.outcomes).filter((o) => o.coverage === "guided")) {
      lines.add(`${s.id}/${o.id}`);
      assert.ok(tasksFor(GUIDED, s.id, o.id).length >= 2, o.id);
    }
  }
  for (const t of GUIDED.tasks) assert.ok(lines.has(`${t.syllabus}/${t.outcome}`), `${t.id} serves a line marked guided`);
  for (const s of SYLLABUSES) assert.equal(coverage(s).not, 0, `Class ${s.class} has no line left without a place`);
});

test("GT-3 a task done is kept with the adult's ticks, counted again when repeated, and writes nothing to the engine", async () => {
  const t = GUIDED.tasks[0];
  assert.deepEqual(done(t, [2, 0, 0, 9, -1]), { type: "done", task: t.id, syllabus: t.syllabus, outcome: t.outcome, seen: [0, 2], of: t.look.length });
  const l = await Learner.create(loadContent({ mode: "development" }), new MemoryRepo(), "Guided", "guardian", testClock(), "p-guided");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  await l.recordGuided(done(t, [0]));
  await l.recordGuided(done(t, [0, 1, 2]));
  assert.deepEqual(guidedSummary(l.guidedRecords()).done.get(t.id), { seen: 3, of: t.look.length, times: 2 });
  assert.equal(picture(), before, "no capability estimate moves");
});
