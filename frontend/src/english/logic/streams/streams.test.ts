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
import { CHECK, CHECK_VERSION, SizeCheckSession } from "../vocabulary/size-check.ts";
import { BANK, levelOf } from "../spelling.ts";
import { listeningPass } from "./level-check.ts";
import { FIRST } from "../first/first.ts";
import { rightAnswer } from "../test-helpers.ts";
import { GRAMMAR_STEPS, GrammarPlacement, MIDDLE, LISTENING_STEPS, ListeningPlacement, PARTS, READING_CHECK, READING_SKILLS, READING_TEXTS, ReadingPlacement, SPELLING_STEPS, SpellingPlacement, levelsFrom, readingStart, spellingStart, type LevelCheckRecord } from "./level-check.ts";
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

test("LC-1 reading: by elimination from the middle, six questions a text, a level only for a text read well", () => {
  assert.deepEqual([readingStart("early"), readingStart("school"), readingStart(null)], [1, 3, 3]);
  // a reader who gets everything right up to a level and nothing above it is placed at that level or just below, never above
  for (const start of [1, 3])
    for (let can = 0; can <= 6; can++) {
      const r = read(start, can);
      assert.ok(r.passed <= can && r.passed >= can - 1, `start ${start}, reads to ${can}: placed ${r.passed}`);
      assert.ok(r.texts <= READING_TEXTS && r.asked === r.texts * READING_SKILLS.length);
    }
  assert.deepEqual([read(3, 6).passed, read(3, 0).passed, read(1, 6).passed], [6, 0, 6], "both ends can be reached");
  const r = read(3, 3);
  assert.deepEqual([r.scale, r.check], [2, READING_CHECK]);
  assert.deepEqual(r.steps.slice(0, 2).map((s) => s.level), [3, 6], "a text read well is followed by a much harder one: a jump, not a step");
  assert.deepEqual(read(3, 0).steps.map((s) => s.level), [3, 1], "a text read badly sends it to the bottom, and it stops there");
  const s = new ReadingPlacement(COURSE, 3);
  s.answer(99);
  assert.equal(s.snapshot().index, 0, "a choice that is not on screen is ignored");
  s.answer(null);
  assert.equal(s.snapshot().index, 1, "\"I'm not sure\" is an answer");
  // one lucky text is not a level: four of six right at level 5 after failing level 3
  const lucky = new ReadingPlacement(COURSE, 5);
  for (let v = lucky.snapshot(), i = 0; v.phase === "asking"; v = lucky.snapshot(), i++) {
    const q = keyFor(v.question!.prompt, v.level, v.passage!.title);
    lucky.answer(v.level === 5 && i < 4 ? q.answer : (q.answer + 1) % q.options.length);
  }
  assert.ok(lucky.result().passed < 5, `placed ${lucky.result().passed}`);
  // a result of the older, looser reading part is not used; on today's it is read as stored
  assert.equal(levelsFrom([{ type: "reading", passed: 5, scale: 2, steps: [] }]).reading, null);
  assert.deepEqual([0, 2, 4, 6].map((passed) => levelsFrom([{ type: "reading", passed, scale: 2, check: READING_CHECK, steps: [] }]).reading!.start), [1, 2, 4, 6]);
});

test("LC-1b reading placement on simulated readers: may place low, rarely high, never on a guess", () => {
  const rng = (seed: number) => {
    let x = seed >>> 0;
    return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  };
  /** A reader whose level is `t` gets a question of level L right less often as L rises above t (blind: never knows). */
  const sitting = (t: number, style: "honest" | "guesser" | "blind", r: () => number) => {
    const s = new ReadingPlacement(COURSE, MIDDLE.reading);
    for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot()) {
      const q = keyFor(v.question!.prompt, v.level, v.passage!.title);
      const knows = style !== "blind" && r() < 0.93 / (1 + Math.exp(-(1.3 * (t - v.level) + 1.0)));
      s.answer(knows ? q.answer : style === "honest" ? null : Math.floor(r() * q.options.length));
    }
    return s.result().passed;
  };
  const N = 1500;
  const share = (t: number, style: "honest" | "guesser" | "blind", seed: number) => {
    const r = rng(seed);
    const placed = Array<number>(7).fill(0);
    for (let i = 0; i < N; i++) placed[sitting(t, style, r)]++;
    return (from: number) => placed.slice(Math.max(0, Math.min(7, from))).reduce((a, b) => a + b, 0) / N;
  };
  for (let t = 1; t <= 6; t++) {
    const guess = share(t, "guesser", 300 + t);
    assert.ok(guess(t + 1) <= 0.18, `guesses when unsure, reads at ${t}: placed above it ${(100 * guess(t + 1)).toFixed(1)}%`);
    assert.ok(guess(t + 2) <= 0.05, `guesses when unsure, reads at ${t}: two levels up ${(100 * guess(t + 2)).toFixed(1)}%`);
    const honest = share(t, "honest", 500 + t);
    assert.ok(honest(t + 1) <= 0.03, `says "I'm not sure", reads at ${t}: placed above it ${(100 * honest(t + 1)).toFixed(1)}%`);
    if (t >= 3) assert.ok(guess(t - 2) >= 0.85 && honest(t - 2) >= 0.85, `reads at ${t}: within two levels`);
  }
  const blind = share(0, "blind", 77);
  assert.ok(blind(2) <= 0.04 && blind(3) <= 0.015, `taps anything: level 2 or more ${(100 * blind(2)).toFixed(1)}%, level 3 or more ${(100 * blind(3)).toFixed(1)}%`);
  assert.ok(share(7, "guesser", 9)(6) >= 0.8, "a reader well above the top texts is placed at the top");
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

test("LC-3 the words part is the word check itself, and its level is the one Find my level reports", () => {
  const s = new SizeCheckSession(CHECK, 4);
  let n = 0;
  for (let v = s.snapshot(); v.phase === "asking"; v = s.snapshot(), n++) {
    const w = CHECK.words.find((x) => x.word === v.item!.word);
    if (v.item!.kind === "know") s.answer(!!w && w.band <= 5);
    else s.answer(w!.band <= 5 ? w!.answer : null);
  }
  assert.ok(n <= 30, `${n} questions`);
  const band = s.snapshot().result!.band;
  assert.ok(band === 4 || band === 5, `placed ${band}`);
});

test("LC-4 the latest level of each part counts; a skipped part leaves none", () => {
  const records: LevelCheckRecord[] = [{ type: "start" }, { type: "words", band: 3, scale: CHECK_VERSION, estimate: 3000, answered: 12 }, { type: "skipped", part: "reading" }, { type: "listening", level: 2, steps: [] }];
  assert.deepEqual(levelsFrom(records), { done: false, words: { band: 3, estimate: 3000 }, reading: null, listening: { level: 3 }, spelling: null, grammar: null }, "a level stored on the old three-level scale is read on today's");
  const again: LevelCheckRecord[] = [...records, { type: "done" }, { type: "start" }, { type: "reading", passed: 3, scale: 2, check: READING_CHECK, steps: [] }, { type: "listening", level: 3, scale: 2, steps: [] }, { type: "spelling", level: 4, steps: [] }, { type: "done" }];
  assert.deepEqual(levelsFrom(again), { done: true, words: { band: 3, estimate: 3000 }, reading: { passed: 3, start: 3 }, listening: { level: 3 }, spelling: { level: 4 }, grammar: null });
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
  await l.recordLevelCheck([{ type: "start" }, { type: "words", band: 4, scale: CHECK_VERSION, estimate: 4000, answered: 12 }, { type: "reading", passed: 1, scale: 2, check: READING_CHECK, steps: [] }, { type: "listening", level: 3, steps: [] }, { type: "done" }]);
  assert.equal(l.levels().done, true);
  assert.equal(row("words").level, "Level 5 of 8");
  assert.equal(row("words").next, "Five new words");
  assert.match(row("reading").level, /^Starter \(level 1 of 6\)$/);
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
test("reading placement uses the practice text that carries every placement skill, never an inference-only text", () => {
  const expected = ["L1.P2", "N2.P2", "L2.P2", "N4.P2", "L3.P2", "N6.P2"];
  for (let level = 1; level <= 6; level++) {
    const s = new ReadingPlacement(COURSE, level);
    for (let i = 0; i < READING_SKILLS.length; i++) {
      const v = s.snapshot();
      assert.equal(v.phase, "asking");
      const q = keyFor(v.question!.prompt, v.level, v.passage!.title);
      assert.equal(q.id, `${expected[level - 1]}.${READING_SKILLS[i]}`);
      s.answer(q.answer);
    }
  }
  const noAnchor = { ...COURSE, questions: COURSE.questions.filter((q) => q.skill === "inference") };
  assert.equal(new ReadingPlacement(noAnchor, 3).snapshot().phase, "done");
});

test("LC-11 grammar placement: a right answer high up followed by misses does not set the level", () => {
  const run = (pattern: boolean[]) => {
    const s = new GrammarPlacement(GRAMMAR, MIDDLE.grammar);
    let k = 0;
    for (let v = s.snapshot(); v.phase === "ask"; v = s.snapshot(), k++) {
      const it = GRAMMAR.items.find((x) => x.id === v.id)!;
      const bare = (w: string) => w.replace(/[^A-Za-z']/g, "");
      const rightAt = it.kind === "spot" ? v.words.findIndex((w) => it.right!.includes(bare(w))) : it.sentence.split(" ").findIndex((w) => w.includes("["));
      const ok = k < 2 || pattern[k - 2];
      s.answer(ok ? rightAt : it.kind === "spot" ? v.words.findIndex((w) => !it.right!.includes(bare(w))) : (rightAt + 1) % v.words.length);
    }
    return s.result();
  };
  // 3 right → 5 right → 6 wrong → 5 wrong: the highest right was 5, but the learner then missed at 5
  const lucky = run([true, true, false, false]);
  assert.deepEqual(lucky.steps.map((x) => [x.level, x.correct]), [[3, true], [5, true], [6, false], [5, false]]);
  assert.equal(lucky.level, 4);
  // 3 right → 5 wrong → 4 right → 5 right: ends where it was answered right
  assert.equal(run([true, false, true, true]).level, 5);
});

test("LC-12 a beginner's Words row opens First words until First sentences open", async () => {
  const c = loadContent({ mode: "development" });
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "New", "guardian", clock, "p-new");
  await l.recordLevelCheck([{ type: "start" }, { type: "words", band: 0, scale: CHECK_VERSION, estimate: 0, answered: 12 }, { type: "reading", passed: 0, scale: 2, check: READING_CHECK, steps: [] }, { type: "listening", level: 1, scale: 2, steps: [] }, { type: "done" }]);
  const words = () => streamRows(l, clock()).find((r) => r.id === "words")!;
  assert.deepEqual([words().level, words().next, words().open], ["First words", "Find words in pictures", "first"]);
  // once twenty words are sure, First sentences open and the row goes back to Words
  const sure = FIRST.words.slice(0, 20).map((w) => ({ type: "step" as const, sitting: "f1", kind: "hear" as const, key: w.id, correct: true, misses: 0 }));
  await l.recordFirst([...sure, { type: "end", sitting: "f1", asked: 20, right: 20 }]);
  assert.match(words().level, /^Level \d of 8$/);
  assert.equal(words().open, undefined);
});

test("LC-13 the Spelling row offers the next spelling rule (lesson then practice) every other day, with no older starting check", async () => {
  const c = loadContent({ mode: "development" });
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Rules", "guardian", clock, "p-rules");
  l.speechAvailable = true;
  await l.recordLevelCheck([{ type: "start" }, { type: "words", band: 4, scale: CHECK_VERSION, estimate: 3000, answered: 12 }, { type: "reading", passed: 3, scale: 2, check: READING_CHECK, steps: [] }, { type: "listening", level: 3, scale: 2, steps: [] }, { type: "done" }]);
  const spelling = () => streamRows(l, clock()).find((r) => r.id === "spelling")!;
  const row = spelling();
  assert.equal(row.open, "rule");
  assert.match(row.next, /^Spelling rule: /);
  assert.equal(row.step!.type, "spelling_practice");
  // it starts straight away, with its lesson first, although the older journey's starting check was never done
  const cur = await l.start(row.step!);
  assert.ok(cur.lesson, "a short lesson first");
  await l.finishLesson(cur.lesson!.id, true);
  for (let v = await l.current(), g = 0; v.next && g < 60; v = await l.current(), g++) await l.answer(v.next.item, rightAnswer(v.next.item), { use: v.next.use });
  // done today, and tomorrow it is the Spelling Bee's turn
  assert.equal(spelling().doneToday, true);
  assert.notEqual(spelling().open, "rule");
});
