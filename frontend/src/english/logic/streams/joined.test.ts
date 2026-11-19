/**
 * Joining the streams: words misspelt in writing and new words remembered become spelling practice lists with
 * their sentences, kept up to date, never emptied, and a word leaves once it is spelt right there.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "../content.ts";
import { DICTATION, mark, type DictationRecord } from "../dictation/dictation.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { WORDS } from "../vocabulary/daily-words.ts";
import { AUTO_LIST_MAX, NEW_WORD_SPELLING, TRICKY, autoLists, syncAutoLists, trickyWords, waiting } from "./joined.ts";
import { streamRows } from "./streams.ts";

const S = DICTATION.sentences.find((s) => s.text === "I lost my pencil on Monday.")!;
function answer(typed: string, s = S): DictationRecord {
  const m = mark(s, typed);
  return { type: "answer", sitting: "d1", id: s.id, level: s.level, tries: 1, perfectFirst: m.perfect, perfect: m.perfect, right: m.right, total: m.total, missed: m.missed, misspelt: m.misspelt, capitals: m.capitals, end: m.end === "ok", plays: 1, typed };
}
async function make(id: string) {
  const clock = testClock();
  const l = await Learner.create(loadContent({ mode: "development" }), new MemoryRepo(), "Join", "guardian", clock, id);
  return { l, clock };
}

test("JS-1 only misspelt words are taken, as the sentence writes them, with the sentence; not missing, tiny or capital-only ones", () => {
  const m = mark(S, "i lost my pensil on Munday");
  assert.deepEqual(m.misspelt, ["pencil", "Monday"]);
  assert.deepEqual(mark(S, "I lost pencil on Monday.").misspelt, [], "a missing word is not a misspelling");
  assert.deepEqual(mark({ text: "The dog ran.", alt: {} }, "Teh dog rann.").misspelt, ["the", "ran"], "a first word loses its capital");
  const words = trickyWords([answer("i lost mi pensil on Munday")], [], () => undefined);
  assert.deepEqual(words.map((w) => [w.id, w.word, w.sentence]), [["pencil", "pencil", S.text], ["monday", "Monday", S.text]], "'my' is too short to list");
  const many = DICTATION.sentences.filter((s) => s.level === 3).map((s) => answer(s.text.replace(/[a-z]{6,}/g, (w) => `${w}x`), s));
  const list = trickyWords(many, [], () => undefined);
  assert.equal(list.length, AUTO_LIST_MAX, "the newest words only");
  assert.equal(new Set(list.map((w) => w.id)).size, AUTO_LIST_MAX);
});

test("JS-2 a finished sitting's misspellings become the practice list 'My tricky words', spoken with their sentence", async () => {
  const { l, clock } = await make("p-join1");
  assert.deepEqual(await syncAutoLists(l), { tricky: [], newWords: [] });
  assert.equal(l.wordLists().length, 0, "no empty list is made");
  await l.recordDictation([answer("I lost my pensil on Munday.")]);
  assert.deepEqual(await syncAutoLists(l), { tricky: ["pencil", "Monday"], newWords: [] });
  const list = l.wordLists().find((x) => x.id === TRICKY.id)!;
  assert.deepEqual([list.name, list.mode, list.words.length], [TRICKY.name, "practice", 2]);
  const n = (await (l as unknown as { repo: MemoryRepo; profileId: string }).repo.load("p-join1")).length;
  assert.deepEqual(await syncAutoLists(l), { tricky: [], newWords: [] });
  assert.equal((await (l as unknown as { repo: MemoryRepo }).repo.load("p-join1")).length, n, "nothing saved when nothing changed");
  assert.deepEqual(waiting(l), { tricky: 2, newWords: 0 });
  const row = streamRows(l, clock()).find((r) => r.id === "spelling")!;
  assert.equal(row.next, "2 words from your writing and new words");
  assert.equal(row.open, "mywords");
  const spoken = l.spellingWords({ type: "list", id: TRICKY.id });
  assert.deepEqual(spoken.map((w) => [w.word, w.sentence]), [["pencil", S.text], ["Monday", S.text]]);
});

test("JS-3 a word spelt right in the list leaves it; the list is never emptied by the app", async () => {
  const { l } = await make("p-join2");
  await l.recordDictation([answer("I lost my pensil on Munday.")]);
  await syncAutoLists(l);
  const source = { type: "list" as const, id: TRICKY.id };
  await l.startSpelling(source);
  for (let w = l.spellingSession(); w?.word; w = l.spellingSession()) await l.answerSpelling(w.word.word, 1, {});
  const left = autoLists(l).find((x) => x.id === TRICKY.id)!.words;
  assert.equal(left.length, 0, "both were spelt right on their own");
  await syncAutoLists(l);
  assert.equal(l.wordLists().find((x) => x.id === TRICKY.id)!.words.length, 2, "the saved list keeps its last words until new ones come");
  const other = DICTATION.sentences.find((s) => s.text === "The moon was bright last night.")!;
  await l.recordDictation([answer("The moon was brite last night.", other)]);
  assert.deepEqual((await syncAutoLists(l)).tricky, ["bright"]);
  assert.deepEqual(l.wordLists().find((x) => x.id === TRICKY.id)!.words.map((w) => w.word), ["bright"]);
});

test("JS-4 new words remembered after the first day become 'Spell my new words'; the level check's missed spellings count too", async () => {
  const { l } = await make("p-join3");
  const [a, b] = WORDS.words.filter((w) => w.band === 2);
  await l.recordWordLearn([{ type: "meet", word: a.word, band: 2 }, { type: "meet", word: b.word, band: 2 }, { type: "result", word: a.word, clean: true }, { type: "result", word: b.word, clean: true }]);
  assert.deepEqual((await syncAutoLists(l)).newWords, [], "not on the first day");
  await l.recordWordLearn([{ type: "result", word: a.word, clean: true }, { type: "result", word: b.word, clean: false }]);
  assert.deepEqual((await syncAutoLists(l)).newWords, [a.word], "only the one remembered");
  const list = l.wordLists().find((x) => x.id === NEW_WORD_SPELLING.id)!;
  assert.deepEqual(list.words.map((w) => [w.word, w.sentence]), [[a.word, a.sentence]]);
  await l.recordLevelCheck([{ type: "spelling", level: 1, steps: [{ word: "friend", level: 1, correct: true }, { word: "laugh", level: 2, correct: false }] }]);
  const added = await syncAutoLists(l);
  assert.deepEqual(added.tricky, ["laugh"]);
  assert.ok(l.spellingWords({ type: "list", id: TRICKY.id })[0].sentence, "with the Spelling Bee's own sentence");
});
