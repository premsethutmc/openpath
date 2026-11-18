/** Parent view: counts read from each child's record, two children kept apart, and nothing written by looking. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { childSummary, gateQuestion } from "./parent-view.ts";
import { MemoryRepo } from "./store.ts";
import { parseWords } from "./wordlists.ts";

const c = loadContent({ mode: "development" });

test("PV-1 a child's lists, test result, words to work on and days practised", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const a = await Learner.create(c, repo, "Anu", "guardian", clock, "p-anu");
  const b = await Learner.create(c, repo, "Bala", "guardian", clock, "p-bala");
  const words = parseWords("garden, bridge, honest, quiet").words;
  const practice = await a.saveWordList("Week 12", words, undefined, "practice");
  const testList = await a.saveWordList("Friday test", words, undefined, "test");
  await a.startSpelling({ type: "list", id: practice });
  const order: string[] = [];
  for (const [k, aid] of [{ studied: true }, { help: 2 }, {}, {}].entries()) {
    const w = a.spellingSession()!.word!.word;
    order.push(w);
    await a.answerSpelling(k === 2 ? "zzz" : w, 1, aid);
  }
  await a.startSpelling({ type: "list", id: testList });
  for (let k = 0; k < 4; k++) await a.answerSpelling(k === 0 ? "nope" : a.spellingSession()!.word!.word, 1);
  const before = (await repo.load("p-anu")).length;
  const s = childSummary(a, clock());
  assert.equal((await repo.load("p-anu")).length, before, "looking writes nothing");
  assert.equal(s.name, "Anu");
  const p = s.lists.find((l) => l.id === practice)!;
  assert.deepEqual([p.mode, p.words, p.unaided, p.withHelp, p.wrong, p.notTried], ["practice", 4, 1, 2, 1, 0]);
  assert.deepEqual(p.toWorkOn, [order[2], ...p.toWorkOn.slice(1)], "the wrong word first");
  assert.equal(p.toWorkOn.length, 3);
  assert.equal(p.lastTest, null);
  const t = s.lists.find((l) => l.id === testList)!;
  assert.deepEqual([t.mode, t.lastTest!.right, t.lastTest!.total, t.wrong, t.unaided], ["test", 3, 4, 1, 3]);
  assert.equal(s.daysPractisedThisWeek, 1);
  assert.ok(s.lastActive);
  assert.equal(s.bee, null, "the Spelling Bee was not played");
  assert.equal(s.words, null);
  // the other child is untouched
  const other = childSummary(b, clock());
  assert.deepEqual([other.name, other.lists.length, other.daysPractisedThisWeek, other.lastActive], ["Bala", 0, 0, null]);
});

test("PV-2 the gate is a sum with one right answer", () => {
  for (let s = 0; s < 30; s++) {
    const g = gateQuestion(s);
    assert.equal(g.answer, g.a * g.b);
    assert.ok(g.a >= 6 && g.a <= 9 && g.b >= 7 && g.b <= 9);
  }
});
