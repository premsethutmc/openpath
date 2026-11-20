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
import { listeningPass } from "./level-check.ts";
import { GRAMMAR_STEPS, GrammarPlacement, MIDDLE, LISTENING_STEPS, ListeningPlacement, PARTS, READING_SKILLS, ReadingPlacement, SPELLING_STEPS, SpellingPlacement, WORD_ROUNDS, levelsFrom, readingStart, spellingStart, type LevelCheckRecord } from "./level-check.ts";
import { NAMING_TOPIC, streamRows } from "./streams.ts";
import { GRAMMAR, GrammarSitting } from "../grammar-use/grammar-use.ts";

const keyFor = (prompt: string, level: number, title: string) => COURSE.questions.find((q) => q.prompt === prompt && q.level === level && q.role === "practice" && COURSE.passages.get(q.passage)!.title === title)!;
/** Sit the reading part as a learner who can read up to a level (answers right there, wrong above). */
function read(start: number, canRead: number) {
  const s = new ReadingPlacement(COURSE, start);
  const texts = new Set<string>();
  let asked = 0;
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot()) {
    assert.ok(!("answer" in v.question!), "the screen never holds the answer key");
    texts.add(v.passage!.title);
    const q = keyFor(v.question!.prompt, v.level, v.passage!.title);
    assert.ok(READING_SKILLS.includes(q.skill));
    assert.equal(COURSE.passages.get(q.passage)!.role, "practice", "never a text kept for the course's fresh checks");
    asked++;
    s.answer(v.level <= canRead ? q.answer : (q.answer + 1) % q.options.length);
  }
  return { ...s.result(), asked, texts: texts.size };
}

test("LC-1 reading: three of four passes a level; two levels up or down, then one; the start is the level above the last passed", () => {
  assert.deepEqual([readingStart("early"), readingStart("school"), readingStart(null)], [1, 3, 3]);
  assert.deepEqual([6, 5, 4, 3, 2, 1, 0].map((can) => read(3, can).passed), [6, 5, 4, 3, 2, 1, 0], "every level can be reached from the middle");
  assert.deepEqual([read(1, 5).passed, read(1, 0).passed, read(3, 6).asked, read(3, 0).asked], [4, 0, 12, 8]);
  const r = read(3, 3);
  assert.equal(r.scale, 2);
  assert.deepEqual([r.asked, r.texts, r.steps.map((s) => s.level)], [12, 3, [3, 5, 4]]);
  assert.equal(read(1, 0).asked, 4, "nothing below the first level to try");
  const s = new ReadingPlacement(COURSE, 3);
  s.answer(99);
  assert.equal(s.snapshot().index, 0, "a choice that is not on screen is ignored");
  const lv = (passed: number) => levelsFrom([{ type: "reading", passed, steps: [] }]).reading!.start;
  assert.deepEqual([lv(0), lv(1), lv(2), lv(3)], [1, 2, 4, 6], "a result stored on the old three-level scale is read on today's");
  assert.deepEqual([2, 4, 5].map((passed) => levelsFrom([{ type: "reading", passed, scale: 2, steps: [] }]).reading!.start), [3, 5, 6]);
});

/** Sit the listening part writing perfectly up to a level. */
function listen(start: number, canWrite: number, history = [] as Parameters<typeof levelFor>[1]) {
  const s = new ListeningPlacement(DICTATION, start, history);
  const ids: string[] = [];
  while (!s.finished) {
    const text = s.spoken()!;
    const sentence = DICTATION.sentences.find((x) => x.text === text)!;
    ids.push(sentence.id);
    s.check(sentence.level <= canWrite ? text : text.split(" ").slice(0, 2).join(" "), 1);
  }
  return { ...s.result(), ids, records: s.take() };
}

test("LC-2 listening: four sentences, one try each, a wide first move then single steps; stored so they are not asked again soon", () => {
  assert.deepEqual([7, 6, 5, 4, 3, 2, 1, 0].map((can) => listen(3, can).level), [7, 6, 5, 4, 3, 2, 1, 1], "every level can be reached from the middle");
  assert.equal(listen(1, 6).level, 5);
  const r = listen(3, 4);
  assert.equal(r.scale, 2);
  assert.equal(r.ids.length, LISTENING_STEPS);
  assert.equal(new Set(r.ids).size, LISTENING_STEPS, "no sentence twice");
  assert.deepEqual(r.steps.map((s) => [s.level, s.perfect]), [[3, true], [5, false], [4, true], [5, false]]);
  assert.equal(r.records.length, 4);
  assert.ok(r.records.every((x) => x.type === "answer" && x.tries === 1 && x.sitting === "level-check"));
  assert.ok(!listen(3, 4, r.records).ids.some((id) => r.ids.includes(id)), "a second check uses other sentences");
  const s = new ListeningPlacement(DICTATION, 3, []);
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
  assert.deepEqual(levelsFrom(records), { done: false, words: { band: 3, estimate: 3000 }, reading: null, listening: { level: 3 }, spelling: null, grammar: null }, "a level stored on the old three-level scale is read on today's");
  const again: LevelCheckRecord[] = [...records, { type: "done" }, { type: "start" }, { type: "reading", passed: 2, steps: [] }, { type: "listening", level: 3, scale: 2, steps: [] }, { type: "spelling", level: 4, steps: [] }, { type: "done" }];
  assert.deepEqual(levelsFrom(again), { done: true, words: { band: 3, estimate: 3000 }, reading: { passed: 3, start: 4 }, listening: { level: 3 }, spelling: { level: 4 }, grammar: null });
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
  assert.equal(row("listening").level, `Level ${startLevel(l.state.preferences?.band)} of 7`);
  assert.match(row("reading").level, /^Starter \(level 1 of 6\)$/);
  await l.recordLevelCheck([{ type: "start" }, { type: "words", band: 4, estimate: 4000, answered: 12 }, { type: "reading", passed: 1, steps: [] }, { type: "listening", level: 3, steps: [] }, { type: "done" }]);
  assert.equal(l.levels().done, true);
  assert.equal(row("words").level, "Level 5 of 8");
  assert.equal(row("words").next, "Five new words");
  assert.match(row("reading").level, /^Explorer \(level 2 of 6\)$/);
  assert.equal(row("listening").level, "Level 5 of 7");
  assert.match(row("spelling").level, /level 1 of 5/);
  await l.recordLevelCheck([{ type: "spelling", level: 3, steps: [] }]);
  assert.equal(levelOf(l.spelling(), BANK), 3, "the Spelling Bee starts at the level found");
  assert.match(row("spelling").level, /^Intermediate \(level 3 of 5\)$/);
  assert.equal(l.spellingSession(), null);
  await l.startSpelling();
  assert.ok(l.spellingSession()!.word, "and offers a word from there");
  assert.equal(row("grammar").level, "Level 3 of 7");
  assert.equal(row("grammar").next, "Eight sentences to fix and build");
  assert.ok(streamRows(l, clock()).every((r) => !r.doneToday));
  await l.recordDictation([{ type: "start", sitting: "d1", level: 3 }, { type: "end", sitting: "d1", level: 3, asked: 5, perfectFirst: 5 }]);
  await l.recordWordLearn([{ type: "meet", word: "anxious", band: 4 }]);
  assert.equal(row("listening").doneToday, false, "written, but nothing heard yet");
  assert.deepEqual([row("listening").next, row("listening").open], ["A passage to hear, with four questions", "passage"]);
  await l.recordListen([{ type: "result", passage: "lp2.1", level: 2, plays: 1, right: 4, answers: [] }]);
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
  assert.deepEqual(PARTS, ["words", "reading", "listening", "spelling", "grammar"]);
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

test("LC-8 listening placement passes a sentence on its words: no capital or end mark needed, one slip in a long sentence", () => {
  assert.deepEqual([listeningPass(6, 6), listeningPass(5, 6), listeningPass(7, 8), listeningPass(6, 8), listeningPass(11, 12)], [true, false, true, false, true]);
  const s = new ListeningPlacement(DICTATION, 3, []);
  while (!s.finished) s.check(s.spoken()!.toLowerCase().replace(/[.?!,]/g, ""), 1);
  assert.equal(s.result().level, 7, "words right without capitals or end marks still places at the top");
  assert.ok(s.take().every((r) => r.type === "answer" && !r.perfectFirst), "though the stored answers stay marked as not perfect");
  const t = new ListeningPlacement(DICTATION, 3, []);
  while (!t.finished) t.check(t.spoken()!.split(" ").slice(0, 2).join(" "), 1);
  assert.equal(t.result().level, 1, "half a sentence does not pass");
});

/** Sit the grammar part as a learner who can name words or not, and can do sentences up to a level. */
function grammarCheck(names: boolean, can: number) {
  const s = new GrammarPlacement(GRAMMAR, MIDDLE.grammar);
  const kinds: string[] = [];
  for (let v = s.snapshot(); v.phase === "ask"; v = s.snapshot()) {
    assert.ok(!v.words.join(" ").includes("["), "the wrong word is not marked on screen");
    const it = GRAMMAR.items.find((x) => x.id === v.id)!;
    kinds.push(v.task!.kind === "spot" ? v.task!.ask : "fix");
    const bare = (w: string) => w.replace(/[^A-Za-z']/g, "");
    const rightAt = it.kind === "spot" ? v.words.findIndex((w) => it.right!.includes(bare(w))) : it.sentence.split(" ").findIndex((w) => w.includes("["));
    const ok = v.index < 2 ? names : it.level <= can;
    s.answer(ok ? rightAt : it.kind === "spot" ? v.words.findIndex((w) => !it.right!.includes(bare(w))) : (rightAt + 1) % v.words.length);
  }
  return { ...s.result(), kinds };
}

test("LC-9 grammar: a noun and a verb for everyone, then four on a staircase from the middle; every level within reach", () => {
  const all = grammarCheck(true, 6);
  assert.deepEqual(all.kinds.slice(0, 2), ["noun", "verb"]);
  assert.equal(all.kinds.length, GRAMMAR_STEPS);
  assert.deepEqual([all.basics, all.level, all.scale], [{ right: 2, asked: 2 }, 6, 2]);
  assert.deepEqual([7, 6, 5, 4, 3, 2, 1, 0].map((can) => grammarCheck(true, can).level), [7, 6, 5, 4, 3, 2, 1, 1]);
  // someone who does sentences well but cannot name a noun or a verb: the level stands, and the gap is recorded
  const gap = grammarCheck(false, 5);
  assert.deepEqual([gap.basics, gap.level], [{ right: 0, asked: 2 }, 5]);
  assert.deepEqual(levelsFrom([{ type: "grammar", ...gap }]).grammar, { level: 5, basics: false });
  assert.deepEqual(levelsFrom([{ type: "grammar", ...all }]).grammar, { level: 6, basics: true });
});

test("LC-10 after the check, the grammar row starts at the level found, and names naming words first when that was missed", async () => {
  const c = loadContent({ mode: "development" });
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Grammar", "guardian", clock, "p-grammar");
  const row = () => streamRows(l, clock()).find((r) => r.id === "grammar")!;
  await l.recordLevelCheck([{ type: "start" }, { type: "grammar", ...grammarCheck(false, 5) }, { type: "done" }]);
  assert.deepEqual([row().level, row().next, row().open], ["Level 5 of 7", "Start with naming words: noun and verb", "naming"]);
  const s = new GrammarSitting(GRAMMAR, 5, [], [NAMING_TOPIC]);
  for (let v = s.snapshot(); v.phase !== "done"; v = s.snapshot()) if (v.phase === "learn") s.learned(); else (s.spot(0), s.next());
  await l.recordGrammar(s.take());
  assert.deepEqual([row().level, row().next, row().open], ["Level 5 of 7", "Eight sentences to fix and build", undefined], "a topic sitting does not move the level");
});
test('reading placement retains the legacy four-skill practice anchor after inference-only texts are added',()=>{
 const expected=['L1.P2','N2.P2','L2.P2','N4.P2','L3.P2','N6.P2'];
 for(let level=1;level<=6;level++){const s=new ReadingPlacement(COURSE,level);for(let i=0;i<4;i++){const v=s.snapshot();assert.equal(v.phase,'asking');const q=keyFor(v.question!.prompt,v.level,v.passage!.title);assert.equal(q.id,`${expected[level-1]}.${READING_SKILLS[i]}`);s.answer(q.answer);}}
 const noAnchor={...COURSE,questions:COURSE.questions.filter(q=>q.skill==='inference')};assert.equal(new ReadingPlacement(noAnchor,3).snapshot().phase,'done');
});
