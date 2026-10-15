/**
 * My Words (logic/wordlists.ts): reading typed, pasted and uploaded lists with clear problems; saving, editing and
 * deleting lists in the learner's record; practising them with the shared spelling engine. Synthetic learners only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBackup } from "./backup.ts";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner, PilotRefusal } from "./learner.ts";
import { sourceProgress } from "./spelling.ts";
import { MemoryRepo } from "./store.ts";
import { LIST_LIMITS, listText, parseWords, wordProblem } from "./wordlists.ts";

const c = loadContent({ mode: "development" });

test("MW-1 typed, pasted and CSV text: new lines, commas, semicolons and tabs separate words; quotes and spaces are tidied", () => {
  const r = parseWords("cat, dog;\tbird\r\n  fish  \n\n\"horse\",'goat'\n");
  assert.deepEqual(r.words.map((w) => w.word), ["cat", "dog", "bird", "fish", "horse", "goat"]);
  assert.deepEqual(r.problems, []);
  assert.equal(r.empty, 2);
  // a CSV file with a byte-order mark and several words per row
  assert.deepEqual(parseWords("﻿word,other\nthrough,though\n").words.map((w) => w.word), ["word", "other", "through", "though"]);
});

test("MW-2 problems are reported, never silently dropped: numbers, symbols, too long, duplicates, too many", () => {
  const r = parseWords("apple, Apple, b4, hello!, x".replace("x", "a".repeat(LIST_LIMITS.wordLength + 1)) + ", ice cream, don't, well-known, 123");
  assert.deepEqual(r.words.map((w) => w.word), ["apple", "ice cream", "don't", "well-known"]);
  const why = Object.fromEntries(r.problems.map((p) => [p.text, p.reason]));
  assert.match(why.Apple, /already in the list as "apple"/);
  assert.match(why.b4, /numbers/);
  assert.match(why["hello!"], /characters/);
  assert.match(why["a".repeat(LIST_LIMITS.wordLength + 1)], /longer than/);
  assert.match(why["123"], /numbers/);
  assert.equal(r.words.length + r.problems.length, 9, "every entry is either a word or a reported problem");
  const many = parseWords(Array.from({ length: LIST_LIMITS.words + 3 }, (_, i) => `w${"abcdefghij"[i % 10]}${"abcdefghij"[Math.floor(i / 10) % 10]}${"abcdefghij"[Math.floor(i / 100) % 10]}`).join("\n"));
  assert.equal(many.words.length, LIST_LIMITS.words);
  assert.equal(many.problems.length, 3);
  assert.match(many.problems[0].reason, /at most/);
  assert.equal(wordProblem("colour"), null);
});

test("MW-3 accepted variants: colour/color gives a word and an alternative; the list text round-trips", () => {
  const r = parseWords("colour/color\norganise / organize\ncolor");
  assert.deepEqual(r.words.map((w) => [w.word, w.variants]), [
    ["colour", ["color"]],
    ["organise", ["organize"]],
    ["color", []],
  ]);
  assert.deepEqual(parseWords(listText(r.words)).words, r.words);
  assert.match(parseWords("colour/").problems[0].reason, /empty alternative/);
});

test("MW-4 save, practise with the shared engine (variants accepted), progress per list, edit keeps history, delete", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "List Learner", "guardian", clock, "p-list");
  const id = await l.saveWordList("Week 3", parseWords("colour/color, because, island, Wednesday").words);
  const other = await l.saveWordList("Week 4", parseWords("castle, listen").words);
  assert.deepEqual(l.wordLists().map((x) => x.name), ["Week 4", "Week 3"]);
  await l.startSpelling({ type: "list", id }, "device_voice");
  let cur = l.spellingSession()!;
  assert.equal(cur.total, 4, "a short list is one short session");
  assert.equal(cur.word!.word, "colour");
  assert.ok((await l.answerSpelling("COLOR", 1)).correct, "the listed variant is right");
  assert.ok(!(await l.answerSpelling("becuase", 2)).correct);
  assert.ok((await l.answerSpelling("island", 1)).correct);
  assert.ok((await l.answerSpelling("wednesday", 1)).correct, "capital letters do not matter");
  assert.equal(l.spellingSession(), null);
  const words = l.spellingWords({ type: "list", id });
  let p = sourceProgress(l.spelling(), words, clock());
  assert.deepEqual([p.total, p.practised, p.right, p.reviewList], [4, 4, 3, 1]);
  assert.equal(sourceProgress(l.spelling(), l.spellingWords({ type: "list", id: other }), clock()).practised, 0, "progress is per list");
  // edit: add a word and change the name; history follows the words that stayed
  await l.saveWordList("Week 3 (more)", parseWords("colour/color, because, island, Wednesday, February").words, id);
  p = sourceProgress(l.spelling(), l.spellingWords({ type: "list", id }), clock());
  assert.deepEqual([p.total, p.practised, p.reviewList], [5, 4, 1]);
  // the misspelt word comes first next time, then the new one
  await l.startSpelling({ type: "list", id });
  cur = l.spellingSession()!;
  assert.equal(cur.word!.word, "because");
  // the record reloads and backs up with its lists
  const again = await Learner.open(c, repo, "p-list", clock);
  assert.equal(again.wordLists().find((x) => x.id === id)!.name, "Week 3 (more)");
  assert.ok(parseBackup(JSON.stringify(again.backup())).ok);
  // delete: gone from My Words, its open session ended, its answers kept in the record
  await again.deleteWordList(id);
  assert.deepEqual(again.wordLists().map((x) => x.id), [other]);
  assert.equal(again.spellingSession(), null);
  assert.ok(again.events.some((e) => e.kind === "spell_answer" && e.source.id === id));
});

test("MW-5 a list must have a name and words; a pilot build offers no My Words", async () => {
  const l = await Learner.create(c, new MemoryRepo(), "L", "guardian", testClock(), "p-l2");
  await assert.rejects(l.saveWordList("  ", parseWords("cat").words), /name/);
  await assert.rejects(l.saveWordList("Empty", []), /no words/);
  const pilot = await Learner.create(loadContent({ mode: "pilot" }), new MemoryRepo(), "P", "guardian", testClock(), "p-p2");
  await assert.rejects(pilot.saveWordList("Week 1", parseWords("cat").words), PilotRefusal);
});

test("MW-6 a parent's lists stay on the device: not offered for a learner saved in a parent account", async () => {
  const repo = new MemoryRepo();
  Object.defineProperty(repo, "kind", { value: "server" });
  const l = await Learner.create(c, repo, "Account pupil", "guardian", testClock(), "p-acc");
  assert.equal(l.keepsParentContent, false);
  await assert.rejects(l.saveWordList("Week 1", parseWords("cat").words), /on this device only/);
  assert.equal(l.events.filter((e) => e.kind === "word_list").length, 0);
  const d = await Learner.create(c, new MemoryRepo(), "Device pupil", "guardian", testClock(), "p-dev");
  assert.equal(d.keepsParentContent, true);
});
