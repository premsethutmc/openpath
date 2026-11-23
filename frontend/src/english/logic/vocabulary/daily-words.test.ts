/**
 * New words: sound content, questions with one right choice, five new words a day, words that return after 1, 3
 * and 7 days, a miss that sends a word back, "I know this word", levels, and no effect on the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BANDS, LEARNT, NEW_PER_DAY, WORDS, WordSitting, baseBand, buildWords, dueWords, freshWords, progress, question, summary, teachBand, wordsProblems, type Dated, type WordRecord } from "./daily-words.ts";
import { CHECK } from "./size-check.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

const byWord = new Map(WORDS.words.map((w) => [w.word, w]));
const day = (n: number) => new Date(Date.UTC(2026, 10, 1 + n, 9)).toISOString();
const dated = (records: WordRecord[], at: string): Dated[] => records.map((record) => ({ record, at }));

/** Sit one sitting on a day. `miss` names words whose first question is answered wrong; `know` names words skipped as known. */
function sit(history: Dated[], at: string, opts: { base?: number; miss?: string[]; know?: string[]; extra?: boolean } = {}) {
  const s = new WordSitting(WORDS, opts.base ?? 3, history, at, { extra: opts.extra });
  const met: string[] = [];
  const asked: [string, string][] = [];
  const missed = new Set<string>();
  for (let v = s.snapshot(), guard = 0; v.phase !== "done"; v = s.snapshot(), guard++) {
    assert.ok(guard < 200);
    if (v.phase === "meet") {
      if (opts.know?.includes(v.card!.word)) s.knowIt();
      else met.push(v.card!.word), s.met();
    } else if (v.phase === "ask") {
      assert.ok(!("answer" in v.question!), "the screen never holds the answer key");
      const w = v.question!.kind === "meaning" ? byWord.get(v.question!.prompt)! : WORDS.words.find((x) => v.question!.options.includes(x.word) && v.question!.prompt === x.sentence.replace(new RegExp(`\\b${x.word}\\b`, "i"), "_____"))!;
      const q = question(WORDS, w, v.question!.kind);
      asked.push([w.word, q.kind]);
      const wrong = opts.miss?.includes(w.word) && !missed.has(w.word);
      if (wrong) missed.add(w.word);
      s.answer(wrong ? (q.answer + 1) % q.options.length : q.answer);
      const f = s.snapshot().feedback!;
      assert.equal(f.correct, !wrong);
      assert.equal(f.card.word, w.word);
      s.next();
    }
  }
  return { met, asked, done: s.snapshot().done!, history: [...history, ...dated(s.take(), at)], level: s.level };
}

test("NW-1 content: ninety words at each of eight levels, rule-checked, none from the word check", () => {
  assert.deepEqual(wordsProblems(WORDS, new Set(CHECK.words.map((w) => w.word))), []);
  // v7: everyday words fill levels 1 to 3; the rare GRE words of level 8 are fewer
  for (let b = 1; b <= BANDS; b++) assert.ok(WORDS.words.filter((w) => w.band === b).length >= 12, `level ${b}`);
  const bad = buildWords({ version: 1, status: "", words: [[1, "v", "jump", "a jump up", "We saw a jump and a jump."]] });
  assert.match(wordsProblems(bad).join("\n"), /exactly once[\s\S]*gives the word away[\s\S]*uses the word itself[\s\S]*starts with "to"[\s\S]*too few words/);
});

test("NW-2 every question has three different choices, one right, and a gap that hides the word", () => {
  const position = [0, 0, 0];
  for (const w of WORDS.words)
    for (const kind of ["meaning", "gap"] as const) {
      const q = question(WORDS, w, kind);
      assert.equal(new Set(q.options).size, 3, w.word);
      assert.equal(q.options[q.answer], kind === "meaning" ? w.meaning : w.word);
      position[q.answer]++;
      if (kind === "gap") {
        assert.ok(q.prompt.includes("_____") && !new RegExp(`\\b${w.word}\\b`, "i").test(q.prompt), w.word);
        for (const o of q.options) assert.ok(!w.not.includes(o), `${w.word}: ${o} would also fit`);
        for (const o of q.options) assert.equal(byWord.get(o)!.pos, w.pos, "choices are the same kind of word");
      }
    }
  for (const k of position) assert.ok(k >= 300, `right answers by position: ${position}`);
});

test("NW-3 a first sitting: five new words, each met, then asked for its meaning and in a gap", () => {
  const r = sit([], day(0));
  assert.equal(r.met.length, NEW_PER_DAY);
  for (const w of r.met) assert.equal(byWord.get(w)!.band, 3);
  assert.deepEqual(r.asked.map(([, k]) => k), [...Array(5).fill("meaning"), ...Array(5).fill("gap")]);
  assert.deepEqual(new Set(r.asked.map(([w]) => w)), new Set(r.met));
  assert.deepEqual([r.done.newWords.length, r.done.clean, r.done.missed.length, r.done.reviewed], [5, 5, 0, 0]);
  const again = sit(r.history, day(0));
  assert.deepEqual([again.met.length, again.asked.length], [0, 0], "nothing more the same day");
  const more = sit(r.history, day(0), { extra: true });
  assert.equal(more.met.length, 5, "unless more are asked for");
  assert.ok(!more.met.some((w) => r.met.includes(w)));
});

test("NW-4 words come back after 1, 3 and 7 days, then count as learnt", () => {
  let h = sit([], day(0)).history;
  const first = [...progress(h).words.keys()];
  assert.equal(dueWords(progress(h), day(0)).length, 0);
  const d1 = sit(h, day(1));
  assert.deepEqual(new Set(d1.asked.slice(0, 5).map(([w]) => w)), new Set(first), "yesterday's words first");
  assert.equal(d1.done.reviewed, 5);
  assert.equal(d1.met.length, 5, "and five new ones");
  h = d1.history;
  const box = (w: string) => progress(h).words.get(w)!.box;
  assert.equal(box(first[0]), 2);
  assert.ok(!dueWords(progress(h), day(3)).some((s) => first.includes(s.word)), "not due two days later");
  assert.ok(first.every((w) => dueWords(progress(h), day(4)).some((s) => s.word === w)), "due three days later");
  h = sit(h, day(4)).history;
  assert.equal(box(first[0]), 3);
  assert.ok(!dueWords(progress(h), day(10)).some((s) => first.includes(s.word)));
  // at most ten reviews a sitting, longest-waiting first: a second sitting that day takes the rest
  h = sit(h, day(11)).history;
  h = sit(h, day(11)).history;
  assert.ok(first.every((w) => box(w) === LEARNT));
  assert.ok(!dueWords(progress(h), day(60)).some((s) => first.includes(s.word)), "a learnt word is not asked again");
  assert.ok(summary(h, day(11)).learnt >= 5);
});

test("NW-5 a missed question shows the answer, returns once, and sends the word back to the start", () => {
  const a = sit([], day(0));
  const w = a.met[0];
  const b = sit(a.history, day(1), { miss: [w] });
  assert.equal(b.asked.filter(([x]) => x === w).length, 2, "asked again before the sitting ends");
  assert.deepEqual(b.done.missed, [w]);
  const p = progress(b.history);
  assert.equal(p.words.get(w)!.box, 1);
  assert.equal(p.words.get(a.met[1])!.box, 2);
  assert.ok(dueWords(p, day(2)).some((s) => s.word === w), "back the next day");
  assert.deepEqual(summary(b.history, day(1)).tricky, [w]);
  const s = new WordSitting(WORDS, 3, a.history, day(1));
  s.answer(99);
  assert.equal(s.snapshot().phase, "ask", "a choice that is not on screen is ignored");
});

test("NW-6 an unfinished sitting loses nothing: the words met are asked next time", () => {
  const s = new WordSitting(WORDS, 3, [], day(0));
  s.met();
  s.met();
  const h = dated(s.take(), day(0));
  const r = sit(h, day(0));
  assert.equal(r.met.length, 3, "three more make five for the day");
  assert.equal(r.asked.length, 2 * 2 + 3 * 2);
  assert.equal(progress(r.history).words.size, 5);
});

test("NW-7 'I know this word' skips it for good, brings another, and moves a learner up a level", () => {
  const first = freshWords(WORDS, progress([]), 3).slice(0, 5).map((w) => w.word);
  const r = sit([], day(0), { know: first.slice(0, 2) });
  assert.equal(r.met.length, 5, "still five to learn");
  assert.ok(!r.met.some((w) => first.slice(0, 2).includes(w)));
  assert.ok(!r.asked.some(([w]) => first.slice(0, 2).includes(w)));
  assert.equal(progress(r.history).known.size, 2);
  const all = WORDS.words.filter((w) => w.band === 3).map((w) => w.word);
  const knowsAll = sit([], day(0), { know: all });
  assert.ok(knowsAll.met.every((w) => byWord.get(w)!.band === 4), "the level above once this one runs out");
  assert.equal(teachBand(WORDS, progress(knowsAll.history), 3), 4);
  assert.equal(teachBand(WORDS, progress([]), 3), 3);
  assert.deepEqual([baseBand(null, "early"), baseBand(null, "school"), baseBand(null, "older"), baseBand(4, "early"), baseBand(8, null), baseBand(0, null)], [1, 2, 2, 5, 8, 1]);
});

test("NW-11 a learner who gets a level's words right moves up after ten, without going through all ninety", () => {
  let h: Dated[] = [];
  for (let d = 0; d < 2; d++) h = sit(h, day(d)).history;
  assert.equal(teachBand(WORDS, progress(h), 3), 4, "ten right: up a level");
  const r = sit(h, day(2));
  assert.ok(r.met.every((w) => byWord.get(w)!.band === 4), "new words now come from the level above");
  // two of ten missed: stays
  let m: Dated[] = [];
  for (let d = 0; d < 2; d++) m = sit(m, day(d), { miss: freshWords(WORDS, progress(m), 3).slice(0, 1).map((w) => w.word) }).history;
  assert.equal(teachBand(WORDS, progress(m), 3), 3, "two missed: more practice at this level");
  // one missed in ten: up
  let o: Dated[] = sit([], day(0), { miss: freshWords(WORDS, progress([]), 3).slice(0, 1).map((w) => w.word) }).history;
  o = sit(o, day(1)).history;
  assert.equal(teachBand(WORDS, progress(o), 3), 4);
  // half of ten missed: back one level until it goes well
  let b: Dated[] = [];
  for (let d = 0; d < 2; d++) b = sit(b, day(d), { miss: freshWords(WORDS, progress(b), 3).slice(0, 3).map((w) => w.word) }).history;
  assert.equal(teachBand(WORDS, progress(b), 3), 2, "struggling: the level below");
  assert.equal(teachBand(WORDS, progress(b), 1), 1, "never below level 1");
});

test("NW-8 stored on the learner's record without touching the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Words", "guardian", clock, "p-words");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  const s = new WordSitting(WORDS, 2, l.wordLearnRecords(), clock(), { dayOf: l.dayFn() });
  for (let v = s.snapshot(); v.phase === "meet"; v = s.snapshot()) s.met();
  await l.recordWordLearn(s.take());
  const events = await repo.load("p-words");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-words", clock);
  assert.equal(summary(again.wordLearnRecords(), clock(), again.dayFn()).newToday, 5);
  assert.match(String(eventProblem({ kind: "word_learn", id: "x", at: clock(), record: {} })), /without its type/);
});
