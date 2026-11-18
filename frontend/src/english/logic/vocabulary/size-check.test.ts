/**
 * Vocabulary size check: sound content, an estimate that tracks what the learner knows, no reward for guessing,
 * no repeated word in a sitting, new words on a retake, and no effect on the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CHECK, OPTIONS, ROUNDS, ROUND_SIZE, SizeCheckSession, buildCheck, checkProblems, estimate, knownShare, latestResult, seenWords, startBand, type VocabRecord } from "./size-check.ts";
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
  const position = [0, 1, 2].map((i) => CHECK.words.filter((w) => w.answer === i).length);
  for (const k of position) assert.ok(k >= 15, `right answers by position: ${position}`);
  const bad = buildCheck({ version: 1, status: "", bands: CHECK.bands, words: [[1, "cat", "a cat that purrs", "a dog", "a dog"]] });
  assert.match(checkProblems(bad).join("\n"), /cat: needs 3 different meanings[\s\S]*cat: a meaning uses the word itself/);
});

test("VC-2 the estimate follows what the learner knows, and the range contains it", () => {
  const sizes = [0, 1000, 2000, 3000, 4000, 5000, 7000, 10000, 14000];
  let last = -1;
  for (let top = 0; top <= 8; top++) {
    const { result, asked } = sit(top);
    assert.equal(result.estimate, sizes[top], `knows bands up to ${top}`);
    assert.equal(result.band, top);
    assert.ok(result.low <= result.estimate && result.estimate <= result.high);
    assert.ok(result.estimate > last);
    last = result.estimate;
    assert.equal(new Set(asked).size, asked.length, "no word twice in a sitting");
    assert.ok(asked.length >= ROUND_SIZE * 4 && asked.length <= ROUND_SIZE * ROUNDS, `${asked.length} words`);
  }
  // wherever the check starts, the same learner gets nearly the same answer
  for (const start of [1, 3, 6]) assert.ok(Math.abs(sit(4, null, [], start).result.estimate - 4000) <= 500, `start ${start}`);
});

test("VC-3 guessing does not pay: on average it earns nothing in a band, and less than saying 'I don't know' costs nothing", () => {
  assert.equal(knownShare(1, 2, 3), 0, "one lucky guess in three is cancelled by the two misses");
  assert.equal(knownShare(3, 0, 3), 1);
  assert.equal(knownShare(0, 0, 3), 0);
  assert.equal(knownShare(0, 3, 3), 0, "never below zero");
  assert.equal(OPTIONS, 3);
  // a learner who knows bands 1-3 and guesses at random above: the estimate stays near 3,000 on average
  let total = 0;
  const runs = 300;
  let seed = 12345;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0), seed / 2 ** 32);
  for (let k = 0; k < runs; k++) total += sit(3, () => Math.floor(rnd() * 3)).result.estimate;
  const mean = total / runs;
  assert.ok(mean > 2700 && mean < 3900, `mean estimate with guessing ${mean.toFixed(0)}`);
  assert.equal(sit(3).result.estimate, 3000);
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
  assert.equal(second.result.estimate, 4000);
  assert.equal(seenWords(second.records).size, new Set([...first.asked, ...second.asked]).size);
  assert.equal(latestResult(second.records)!.estimate, 4000);
  assert.equal(latestResult([]), null);
  assert.deepEqual([startBand("early"), startBand("school"), startBand("older"), startBand(null)], [2, 3, 4, 3]);
  assert.equal(estimate(CHECK, []).estimate, 0);
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
  assert.equal(latestResult(again.vocabRecords())!.estimate, 5000);
  assert.match(String(eventProblem({ kind: "vocab", id: "x", at: clock(), record: {} })), /without its type/);
});
