/**
 * Vocabulary size check: sound content, an estimate that tracks what the learner knows, no reward for guessing,
 * no repeated word in a sitting, new words on a retake, and no effect on the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CHECK, OPTIONS, ROUNDS, ROUND_SIZE, SizeCheckSession, buildCheck, checkProblems, score, latestResult, seenWords, startBand, wordPracticeBand, type VocabRecord } from "./size-check.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

const byWord = new Map(CHECK.words.map((w) => [w.word, w]));
/** Sit the check as a learner who knows every word up to a band; for other words: say so, or pick by `guess`. */
function sit(knowsUpTo: number, guess: ((i: number) => number) | null = null, history: VocabRecord[] = [], start = 3) {
  const s = new SizeCheckSession(CHECK, start, history);
  const asked: string[] = [];
  for (let v = s.snapshot(), i = 0; v.phase === "asking"; v = s.snapshot(), i++) {
    const w = byWord.get(v.word!.word)!;
    asked.push(w.word);
    assert.ok(!("answer" in v.word!), "the screen never holds the answer key");
    s.answer(w.band <= knowsUpTo ? w.answer : guess ? guess(i) : null);
  }
  return { result: s.snapshot().result!, asked, records: [...history, ...s.take()] };
}

test("VC-1 content: eight bands of ten words, three different meanings each, none using the word itself", () => {
  assert.deepEqual(checkProblems(CHECK), []);
  assert.equal(CHECK.words.length, 80);
  for (const b of CHECK.bands) assert.equal(CHECK.words.filter((w) => w.band === b.id).length, 10);
  assert.equal(CHECK.bands.reduce((s, b) => s + b.families, 0), 14000);
  const position = [0, 1, 2, 3].map((i) => CHECK.words.filter((w) => w.answer === i).length);
  for (const k of position) assert.ok(k >= 12, `right answers by position: ${position}`);
  const bad = buildCheck({ version: 1, status: "", bands: CHECK.bands, words: [[1, "cat", "a cat that purrs", "a dog", "a dog"]] });
  assert.match(checkProblems(bad).join("\n"), /cat: needs 4 different meanings[\s\S]*cat: a meaning uses the word itself/);
});

test("VC-2 only tested words count, and a single lucky round cannot set placement", () => {
  for (const [start, knows] of [[1, 0], [3, 4], [6, 4], [4, 8], [8, 8]]) {
    const { result, asked, records } = sit(knows, null, [], start);
    assert.equal(result.answered, asked.length);
    assert.equal(result.correct, records.filter((r) => r.type === "answer" && r.outcome === "right").length);
    assert.ok(result.band <= knows);
    assert.equal(new Set(asked).size, asked.length);
    assert.ok(asked.length <= ROUND_SIZE * ROUNDS);
  }
  assert.equal(sit(0, null, [], 8).result.correct, 0, "starting high cannot add credit");
  assert.equal(score(CHECK, Array.from({ length: 3 }, () => ({ band: 6, outcome: "right" as const }))).band, 0);
  assert.equal(sit(4).result.band, 4);
  assert.equal(sit(8).result.band, 8);
});

test("VC-3 lucky two-of-three rounds cannot climb to a high practice level", () => {
  const s = new SizeCheckSession(CHECK, 3, [], 4);
  const bands: number[] = [];
  for (let v = s.snapshot(), i = 0; v.phase === "asking"; v = s.snapshot(), i++) {
    const w = byWord.get(v.word!.word)!;
    bands.push(w.band);
    s.answer(i % 3 === 2 ? (w.answer + 1) % OPTIONS : w.answer);
  }
  assert.equal(s.snapshot().result!.band, 0);
  assert.ok(Math.max(...bands) <= 3, "old routing reached band 6 and displayed practice level 7");
  let seed = 12345;
  let high = 0;
  for (let k = 0; k < 10000; k++) {
    const nextGuess = () => Math.floor(((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32) * OPTIONS);
    if (sit(0, nextGuess).result.band >= 6) high++;
  }
  assert.equal(high, 0, "no tested blind guesser reaches practice level 7 in 10,000 full checks");
});

test("VC-4 a retake uses unseen words first, and the latest result is the one reported", () => {
  const first = sit(4);
  const second = sit(4, null, first.records);
  // ten words a band: a second sitting takes every unseen word of a band before it reuses one
  const reused = second.asked.filter((w) => first.asked.includes(w));
  for (const w of reused) {
    const band = byWord.get(w)!.band;
    const unseen = CHECK.words.filter((x) => x.band === band && !first.asked.includes(x.word)).map((x) => x.word);
    assert.ok(unseen.every((u) => second.asked.includes(u)), `band ${band}: unseen words come first`);
  }
  assert.ok(reused.length <= 4, `${reused.length} words came round again`);
  assert.equal(sit(4, null, first.records, 4).asked.slice(0, 3).filter((w) => first.asked.includes(w)).length, 0);
  assert.equal(second.result.band, 4);
  assert.equal(seenWords(second.records).size, new Set([...first.asked, ...second.asked]).size);
  assert.equal(latestResult(second.records)!.band, 4);
  assert.equal(latestResult([]), null);
  const old = { type: "result", check: "1", estimate: 6500, low: 5500, high: 7500, band: 6, answered: 12 } as const;
  assert.deepEqual(latestResult([old]), old);
  assert.equal(wordPracticeBand([old], 6), undefined);
  assert.equal(wordPracticeBand([old, ...second.records], 6), 4);
  assert.deepEqual([startBand("early"), startBand("school"), startBand("older"), startBand(null)], [2, 3, 4, 3]);
  assert.equal(score(CHECK, []).correct, 0);
  const third = sit(4, null, second.records);
  assert.equal(new Set(third.asked).size, third.asked.length, "no duplicates after the unseen list is exhausted");
});

test("VC-5 the record is kept with the learner and never reaches the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Words", "guardian", clock, "p-vocab");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  await l.recordVocab(sit(5).records);
  const events = await repo.load("p-vocab");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-vocab", clock);
  assert.equal(latestResult(again.vocabRecords())!.band, 5);
  assert.match(String(eventProblem({ kind: "vocab", id: "x", at: clock(), record: {} })), /without its type/);
});
