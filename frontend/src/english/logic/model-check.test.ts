/** Model check: app records in, an honest sentence out; too little data is said to be too little. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.ts";
import type { AppEvent } from "./events.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { modelCheck } from "./model-check.ts";
import { MemoryRepo } from "./store.ts";
import { rightAnswer, wrongAnswer } from "./test-helpers.ts";

const c = loadContent({ mode: "development" });

async function record(id: string, wrongEvery: number): Promise<AppEvent[]> {
  const repo = new MemoryRepo();
  const l = await Learner.create(c, repo, id, "guardian", testClock(), id);
  await l.start({ type: "placement" });
  for (let k = 0; k < 60; k++) {
    const cur = await l.current();
    if (!cur.next) break;
    const item = cur.next.item;
    if (item.kind !== "code") break;
    await l.answer(item, k % wrongEvery === 0 ? wrongAnswer(item) : rightAnswer(item), { use: cur.next.use });
  }
  return repo.load(id);
}

test("MC-1 nothing recorded: nothing to compare", () => {
  const r = modelCheck(c, [{ id: "p", events: [] }]);
  assert.equal(r.comparison.answers, 0);
  assert.match(r.verdict, /No scored answers yet/);
});

test("MC-2 a real app record is replayed, other app events are ignored, and a small sample is called small", async () => {
  const events = await record("p-model-check", 3);
  assert.ok(events.some((e) => e.kind === "session") && events.some((e) => e.kind === "evidence"));
  const before = JSON.stringify(events);
  const r = modelCheck(c, [{ id: "p-model-check", events }]);
  assert.equal(JSON.stringify(events), before, "the record is not changed");
  assert.ok(r.comparison.answers >= 5, `${r.comparison.answers} answers scored`);
  assert.equal(r.comparison.learners, 1);
  assert.equal(r.comparison.enough, false);
  assert.match(r.verdict, /Too little to judge: \d+ scored answers from 1 learner\./);
  assert.ok(r.comparison.live!.logLoss > 0 && r.comparison.candidate!.logLoss > 0);
});
