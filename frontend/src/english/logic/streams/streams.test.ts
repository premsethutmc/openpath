/**
 * Find my level and the streams: each part finds a level from a few answers, a part can be skipped, the levels
 * steer where each stream starts, the home rows say what is next and what was done today, and the engine is untouched.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "../content.ts";
import { DICTATION, levelFor, startLevel } from "../dictation/dictation.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { COURSE } from "../reading/course.ts";
import { progress, recommend } from "../reading/session.ts";
import { MemoryRepo } from "../store.ts";
import { CHECK, ROUND_SIZE, SizeCheckSession } from "../vocabulary/size-check.ts";
import { BANK, levelOf } from "../spelling.ts";
import { LISTENING_STEPS, ListeningPlacement, PARTS, READING_SKILLS, ReadingPlacement, SPELLING_STEPS, SpellingPlacement, WORD_ROUNDS, levelsFrom, readingStart, spellingStart, type LevelCheckRecord } from "./level-check.ts";
import { streamRows } from "./streams.ts";

const keyFor = (prompt: string, level: number) => COURSE.questions.find((q) => q.prompt === prompt && q.level === level && q.role === "practice")!;
/** Sit the reading part as a learner who can read up to a level (answers right there, wrong above). */
function read(start: number, canRead: number) {
  const s = new ReadingPlacement(COURSE, start);
  const texts = new Set<string>();
  let asked = 0;
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot()) {
    assert.ok(!("answer" in v.question!), "the screen never holds the answer key");
    texts.add(v.passage!.title);
    const q = keyFor(v.question!.prompt, v.level);
    assert.ok(READING_SKILLS.includes(q.skill));
    assert.equal(COURSE.passages.get(q.passage)!.role, "practice", "never a text kept for the course's fresh checks");
    asked++;
    s.answer(v.level <= canRead ? q.answer : (q.answer + 1) % q.options.length);
  }
  return { ...s.result(), asked, texts: texts.size };
}

test("LC-1 reading: three of four passes a level; one step up or down; the start is the level above the last passed", () => {
  assert.deepEqual([readingStart("early"), readingStart("school"), readingStart(null)], [1, 2, 2]);
  assert.deepEqual([read(2, 3).passed, read(2, 2).passed, read(2, 1).passed, read(2, 0).passed, read(1, 3).passed, read(1, 0).passed], [3, 2, 1, 0, 2, 0]);
  const r = read(2, 2);
  assert.deepEqual([r.asked, r.texts, r.steps.map((s) => s.level)], [8, 2, [2, 3]]);
  assert.equal(read(1, 0).asked, 4, "nothing below the first level to try");
  const s = new ReadingPlacement(COURSE, 2);
  s.answer(99);
  assert.equal(s.snapshot().index, 0, "a choice that is not on screen is ignored");
  const lv = (passed: number) => levelsFrom([{ type: "reading", passed, steps: [] }]).reading!.start;
  assert.deepEqual([lv(0), lv(1), lv(2), lv(3)], [1, 2, 3, 3]);
});

/** Sit the listening part writing perfectly up to a level. */
function listen(start: number, canWrite: number, history = [] as Parameters<typeof levelFor>[1]) {
  const s = new ListeningPlacement(DICTATION, start, history);
  const ids: string[] = [];
  while (!s.finished) {
    const text = s.spoken()!;
    const sentence = DICTATION.sentences.find((x) => x.text === text)!;
    ids.push(sentence.id);
    s.check(sentence.level <= canWrite ? text : text.toLowerCase().replace(/[.?!]$/, ""), 1);
  }
  return { ...s.result(), ids, records: s.take() };
}

test("LC-2 listening: three sentences, one try each, up after a perfect one; stored so they are not asked again soon", () => {
  assert.deepEqual([listen(2, 3).level, listen(2, 2).level, listen(2, 1).level, listen(2, 0).level, listen(1, 3).level], [3, 2, 1, 1, 3]);
  const r = listen(2, 2);
  assert.equal(r.ids.length, LISTENING_STEPS);
  assert.equal(new Set(r.ids).size, LISTENING_STEPS, "no sentence twice");
  assert.deepEqual(r.steps.map((s) => [s.level, s.perfect]), [[2, true], [3, false], [2, true]]);
  assert.equal(r.records.length, 3);
  assert.ok(r.records.every((x) => x.type === "answer" && x.tries === 1 && x.sitting === "level-check"));
  assert.ok(!listen(2, 2, r.records).ids.some((id) => r.ids.includes(id)), "a second check uses other sentences");
  const s = new ListeningPlacement(DICTATION, 2, []);
  s.check("  ", 0);
  assert.equal(s.snapshot().index, 0, "nothing typed is not an answer");
  assert.equal(levelFor(DICTATION, r.records, 3), 3, "answers without a finished sitting do not move the Listen and write level");
});

test("LC-3 the words part is the word check, cut to four rounds", () => {
  const s = new SizeCheckSession(CHECK, 3, [], WORD_ROUNDS);
  let n = 0;
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot(), n++) {
    const w = CHECK.words.find((x) => x.word === v.word!.word)!;
    s.answer(w.band <= 5 ? w.answer : null);
  }
  assert.ok(n <= WORD_ROUNDS * ROUND_SIZE, `${n} words`);
  assert.ok(s.snapshot().result!.band >= 4);
  let full = 0;
  const f = new SizeCheckSession(CHECK, 3);
  for (let v = f.snapshot(); v.phase === "asking"; v = f.snapshot(), full++) f.answer(CHECK.words.find((x) => x.word === v.word!.word)!.answer);
  assert.ok(full > n, "the full check is still longer");
});

test("LC-4 the latest level of each part counts; a skipped part leaves none", () => {
  const records: LevelCheckRecord[] = [{ type: "start" }, { type: "words", band: 3, estimate: 3000, answered: 12 }, { type: "skipped", part: "reading" }, { type: "listening", level: 2, steps: [] }];
  assert.deepEqual(levelsFrom(records), { done: false, words: { band: 3, estimate: 3000 }, reading: null, listening: { level: 2 }, spelling: null });
  const again: LevelCheckRecord[] = [...records, { type: "done" }, { type: "start" }, { type: "reading", passed: 2, steps: [] }, { type: "listening", level: 3, steps: [] }, { type: "spelling", level: 4, steps: [] }, { type: "done" }];
  assert.deepEqual(levelsFrom(again), { done: true, words: { band: 3, estimate: 3000 }, reading: { passed: 2, start: 3 }, listening: { level: 3 }, spelling: { level: 4 } });
});

test("LC-5 the levels steer the streams: reading begins at its start level, with the levels below still open", () => {
  const p = progress(COURSE, []);
  assert.equal(recommend(COURSE, p)!.unit.level, 1);
  assert.equal(recommend(COURSE, p, 2)!.unit.level, 2);
  assert.equal(recommend(COURSE, p, 3)!.unit.level, 3);
  assert.equal(recommend(COURSE, p, 3)!.unit.skill, COURSE.skills[0].id);
});

test("LC-6 home rows: a level and a next step per stream, a tick for today, and nothing written to the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Streams", "guardian", clock, "p-streams");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  assert.equal(l.levels().done, false);
  const row = (id: string) => streamRows(l, clock()).find((r) => r.id === id)!;
  assert.deepEqual(streamRows(l, clock()).map((r) => r.id), ["words", "reading", "listening", "spelling", "grammar"]);
  assert.equal(row("listening").level, `Level ${startLevel(l.state.preferences?.band)} of 3`);
  assert.match(row("reading").level, /^Starter \(level 1 of 3\)$/);
  await l.recordLevelCheck([{ type: "start" }, { type: "words", band: 4, estimate: 4000, answered: 12 }, { type: "reading", passed: 1, steps: [] }, { type: "listening", level: 3, steps: [] }, { type: "done" }]);
  assert.equal(l.levels().done, true);
  assert.equal(row("words").level, "Level 5 of 8");
  assert.equal(row("words").next, "Five new words");
  assert.match(row("reading").level, /^Builder \(level 2 of 3\)$/);
  assert.equal(row("listening").level, "Level 3 of 3");
  assert.match(row("spelling").level, /level 1 of 5/);
  await l.recordLevelCheck([{ type: "spelling", level: 3, steps: [] }]);
  assert.equal(levelOf(l.spelling(), BANK), 3, "the Spelling Bee starts at the level found");
  assert.match(row("spelling").level, /^Intermediate \(level 3 of 5\)$/);
  assert.equal(l.spellingSession(), null);
  await l.startSpelling();
  assert.ok(l.spellingSession()!.word, "and offers a word from there");
  assert.equal(row("grammar").level, "Not checked yet");
  assert.ok(streamRows(l, clock()).every((r) => !r.doneToday));
  await l.recordDictation([{ type: "start", sitting: "d1", level: 3 }, { type: "end", sitting: "d1", level: 3, asked: 5, perfectFirst: 5 }]);
  await l.recordWordLearn([{ type: "meet", word: "anxious", band: 4 }]);
  assert.equal(row("listening").doneToday, true);
  assert.equal(row("words").doneToday, false, "one word met is not the day's five");
  assert.equal(row("words").next, "1 word to see again");
  const events = await repo.load("p-streams");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  assert.match(String(eventProblem({ kind: "level_check", id: "x", at: clock(), record: {} })), /without its type/);
});

test("LC-7 spelling: six Bee words, up after a right one, down after a wrong one; the level is the highest spelt right", async () => {
  assert.deepEqual(PARTS, ["words", "reading", "listening", "spelling"]);
  assert.deepEqual([spellingStart("early"), spellingStart("school"), spellingStart("older")], [1, 2, 3]);
  const c = loadContent({ mode: "development" });
  const l = await Learner.create(c, new MemoryRepo(), "Speller", "guardian", testClock(), "p-spell");
  const bank = l.spellingWords(BANK);
  const byText = new Map(bank.map((w) => [w.word, w]));
  const spell = (start: number, can: number) => {
    const s = new SpellingPlacement(bank, start);
    const seen: string[] = [];
    while (!s.finished) {
      const said = s.spoken()!;
      const word = s.spoken(true)!.replace(/\.$/, "");
      assert.ok(said.startsWith(`${word}.`) && said.endsWith(`${word}.`), "the word, its sentence, the word again");
      seen.push(word);
      s.answer(byText.get(word)!.level! <= can ? ` ${word.toUpperCase()} ` : `${word}x`);
    }
    return { ...s.result(), seen };
  };
  assert.deepEqual([spell(2, 5).level, spell(2, 3).level, spell(2, 1).level, spell(2, 0).level, spell(1, 2).level], [5, 3, 1, 1, 2]);
  const r = spell(2, 3);
  assert.equal(r.seen.length, SPELLING_STEPS);
  assert.equal(new Set(r.seen).size, SPELLING_STEPS, "no word twice");
  assert.deepEqual(r.steps.map((s) => s.level), [2, 3, 4, 3, 4, 3]);
  const s = new SpellingPlacement(bank, 2);
  s.answer("   ");
  assert.equal(s.snapshot().index, 0, "nothing typed is not an answer");
});
