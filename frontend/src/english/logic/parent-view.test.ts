/** Parent view: counts read from each child's record, two children kept apart, and nothing written by looking. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { childSummary, gateQuestion, weeklyNote } from "./parent-view.ts";
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

test("PV-4 new words and Listen and write show on the child's summary, and only on that child's", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const a = await Learner.create(c, repo, "Anu", "guardian", clock, "p-anu2");
  const b = await Learner.create(c, repo, "Bala", "guardian", clock, "p-bala2");
  assert.deepEqual([childSummary(a, clock()).newWords, childSummary(a, clock()).dictation], [null, null]);
  await a.recordWordLearn([
    { type: "meet", word: "brave", band: 2 },
    { type: "meet", word: "crowd", band: 2 },
    { type: "result", word: "brave", clean: false },
    { type: "result", word: "crowd", clean: true },
  ]);
  await a.recordDictation([
    { type: "start", sitting: "d1", level: 2 },
    { type: "answer", sitting: "d1", id: "d2.01", level: 2, tries: 2, perfectFirst: false, perfect: true, right: 6, total: 7, missed: ["umbrella"], capitals: 0, end: true, plays: 2, typed: "Where did you put my blue umbrela?" },
    { type: "answer", sitting: "d1", id: "d2.02", level: 2, tries: 1, perfectFirst: true, perfect: true, right: 7, total: 7, missed: [], capitals: 0, end: true, plays: 1, typed: "x" },
  ]);
  const s = childSummary(a, clock());
  assert.deepEqual(s.newWords, { learnt: 0, learning: 2, tricky: ["brave"] });
  assert.deepEqual(s.dictation, { sentences: 2, perfectFirst: 1, level: 3, missed: ["umbrella"] });
  assert.deepEqual([childSummary(b, clock()).newWords, childSummary(b, clock()).dictation], [null, null]);
});

test("PV-9 every daily activity: levels, days of any English, reading skills, writing counts and First words", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const a = await Learner.create(c, repo, "Chitra", "guardian", clock, "p-chitra");
  const empty = childSummary(a, clock());
  assert.deepEqual([empty.englishDays, empty.reading, empty.writing, empty.first], [0, null, null, null]);
  assert.deepEqual(empty.levels.map((l) => l.name), ["Words", "Reading", "Listening", "Spelling", "Grammar"]);
  await a.recordGuided({ type: "done", task: "t1", syllabus: "s", outcome: "o", seen: [0], of: 2, words: 42, self: [] });
  await a.recordGuided({ type: "done", task: "t2", syllabus: "s", outcome: "o", seen: [], of: 1 });
  const unit = { skill: "main_idea" as const, level: 3 as const };
  await a.recordReading([{ type: "check_result", unit, answers: [], passed: false, label: null }, { type: "check_result", unit: { skill: "detail" as const, level: 3 as const }, answers: [], passed: true, label: null }]);
  const s = childSummary(a, clock());
  assert.equal(s.englishDays, 1);
  assert.deepEqual(s.writing, { tasks: 2, pieces: 1, words: 42 });
  assert.equal(s.reading!.passed, 1);
  assert.match(s.reading!.needsPractice[0], /level 3$/);
});

test("PV-10 weekly note: days and activities this week, what went well, what to practise; nothing typed; a quiet week says so", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const a = await Learner.create(c, repo, "Kavi", "guardian", clock, "p-kavi");
  const quiet = weeklyNote(childSummary(a, clock()));
  assert.match(quiet, /^Kavi's English this week \(OpenPath\)\nNo English practice in the last 7 days/);
  await a.recordGuided({ type: "done", task: "t1", syllabus: "s", outcome: "o", seen: [0], of: 2, words: 42, self: [] });
  await a.recordReading([{ type: "check_result", unit: { skill: "main_idea" as const, level: 3 as const }, answers: [], passed: false, label: null }, { type: "check_result", unit: { skill: "detail" as const, level: 3 as const }, answers: [], passed: true, label: null }]);
  const s = childSummary(a, clock());
  assert.deepEqual(s.week, [{ activity: "Reading", days: 1 }, { activity: "Tasks with a grown-up", days: 1 }]);
  const note = weeklyNote(s, "https://example.org");
  assert.match(note, /Practised on 1 of the last 7 days\./);
  assert.match(note, /Did: Reading \(1 day\), Tasks with a grown-up \(1 day\)\./);
  assert.match(note, /So far: 1 reading skill passed\./);
  assert.match(note, /To practise next: reading: Main idea/i);
  assert.ok(note.endsWith("https://example.org"));
});
