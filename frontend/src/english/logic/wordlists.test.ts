/**
 * My Words (logic/wordlists.ts): reading typed, pasted and uploaded lists with clear problems; saving, editing and
 * deleting lists in the learner's record; practising them with the shared spelling engine. Synthetic learners only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("MW-6 a learner in a parent account: lists are saved in the learner's record (on the server), practised and reloaded like on a device; an oversized list is refused before saving", async () => {
  const repo = new MemoryRepo();
  Object.defineProperty(repo, "kind", { value: "server" }); // the ServerRepo stores the same append-only events
  const clock = testClock();
  const l = await Learner.create(c, repo, "Account pupil", "guardian", clock, "p-acc");
  assert.equal(l.contentPlace, "account");
  const id = await l.saveWordList("Week 1", parseWords("cat, because").words);
  await l.startSpelling({ type: "list", id });
  assert.ok((await l.answerSpelling("cat", 1)).correct);
  const again = await Learner.open(c, repo, "p-acc", clock);
  assert.equal(again.wordLists()[0].name, "Week 1");
  assert.equal(sourceProgress(again.spelling(), again.spellingWords({ type: "list", id }), clock()).practised, 1, "progress follows the learner's record");
  assert.ok(again.events.filter((e) => e.kind === "spell_answer").every((e) => e.kind === "spell_answer" && e.source.type === "list" && e.source.id === id));
  // the server takes one event of at most 32,000 bytes: a list that would not fit is refused with a reason, nothing saved
  const huge = Array.from({ length: LIST_LIMITS.words }, (_, i) => ({ id: `w${i}`.padEnd(30, "a"), word: `w${i}`.padEnd(30, "a"), variants: ["b".repeat(30), "c".repeat(30), "d".repeat(30), "e".repeat(30)] }));
  const before = again.events.length;
  await assert.rejects(again.saveWordList("Huge", huge), /too large to save/);
  assert.equal(again.events.length, before);
  const d = await Learner.create(c, new MemoryRepo(), "Device pupil", "guardian", testClock(), "p-dev");
  assert.equal(d.contentPlace, "device");
});

test("MW-7 editing or deleting a list never changes other progress: the Bee, other lists, and the answers already given", async () => {
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Many Lists", "guardian", clock, "p-many");
  // some Spelling Bee practice first
  await l.startSpelling();
  for (let k = 0; k < 3; k++) await l.answerSpelling(l.spellingSession()!.word!.word, 1);
  await l.stopSpelling();
  const bee = () => sourceProgress(l.spelling(), l.spellingWords(), clock());
  const beeBefore = bee();
  const a = await l.saveWordList("A", parseWords("castle, listen, island").words);
  const b = await l.saveWordList("B", parseWords("castle, because").words);
  for (const id of [a, b]) {
    await l.startSpelling({ type: "list", id });
    while (l.spellingSession()?.word) await l.answerSpelling(l.spellingSession()!.word!.word === "listen" ? "lisen" : l.spellingSession()!.word!.word, 1);
  }
  const progress = (id: string) => sourceProgress(l.spelling(), l.spellingWords({ type: "list", id }), clock());
  const bBefore = progress(b);
  const answersBefore = l.events.filter((e) => e.kind === "spell_answer").length;
  // the same word in two lists is two separate histories: "castle" in A is not "castle" in B
  assert.equal(l.spelling().words.size, 3 + 3 + 2);
  // edit A: drop "listen" (the misspelt one), keep the rest: A's remaining words keep their history
  await l.saveWordList("A", parseWords("castle, island").words, a);
  assert.deepEqual([progress(a).total, progress(a).practised, progress(a).reviewList], [2, 2, 0]);
  // delete A: B, the Bee and every answer already given are untouched
  await l.deleteWordList(a);
  assert.deepEqual(progress(b), bBefore);
  assert.deepEqual(bee(), beeBefore);
  assert.equal(l.events.filter((e) => e.kind === "spell_answer").length, answersBefore);
  // a new list with the same words starts fresh (it is a different list), and the old answers stay traceable to A
  const a2 = await l.saveWordList("A again", parseWords("castle, island").words);
  assert.notEqual(a2, a);
  assert.equal(progress(a2).practised, 0);
  assert.ok(l.events.some((e) => e.kind === "spell_answer" && e.source.id === a));
});

test("MW-8 deleting a list removes its words from the stored record (every version, every answer), keeps the learning history without them, and changes nothing else", async () => {
  // the same rules as the server (backend/family/scrub.py), on the shared fixture
  const { scrubEvents } = await import("./scrub.ts");
  const fixture = JSON.parse(readFileSync(new URL("../../../../backend/family/fixtures/scrub-fixture.json", import.meta.url), "utf8"));
  const r = scrubEvents(fixture.before, fixture.source);
  assert.deepEqual(JSON.parse(JSON.stringify(r.events)), fixture.after);
  assert.equal(r.changed, fixture.changed);
  assert.equal(scrubEvents(r.events, fixture.source).changed, 0, "idempotent");
  // in the app, with a device record
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Deleting", "guardian", clock, "p-del");
  await l.startSpelling();
  await l.answerSpelling(l.spellingSession()!.word!.word, 1);
  await l.stopSpelling();
  const keep = await l.saveWordList("Keep", parseWords("because, island").words);
  const gone = await l.saveWordList("Week 3", parseWords("castle, colour/color").words);
  await l.saveWordList("Week 3 (more)", parseWords("castle, colour/color, wednesday").words, gone); // two saved versions
  for (const id of [keep, gone]) {
    await l.startSpelling({ type: "list", id });
    while (l.spellingSession()?.word) await l.answerSpelling(l.spellingSession()!.word!.word === "castle" ? "casle" : l.spellingSession()!.word!.word, 1);
  }
  await l.startSpelling({ type: "list", id: gone }); // an open session on the list being deleted
  const progress = (src?: { type: "list"; id: string }) => sourceProgress(l.spelling(), src ? l.spellingWords(src) : l.spellingWords(), clock());
  const before = { bee: progress(), keep: progress({ type: "list", id: keep }), answers: l.events.filter((e) => e.kind === "spell_answer").length, count: l.events.length };
  await l.deleteWordList(gone);
  const stored = await repo.load("p-del");
  const text = JSON.stringify(stored);
  for (const secret of ["castle", "casle", "colour", "color", "wednesday", "Week 3"]) assert.ok(!text.includes(secret), `"${secret}" is gone from the stored record`);
  assert.ok(text.includes("because") && text.includes("island"), "the other list is untouched");
  // learning history kept without the words: the same answers, right/wrong and times, the words as removed-1, removed-2, …
  const answers = stored.filter((e) => e.kind === "spell_answer");
  assert.equal(answers.length, before.answers);
  const removed = answers.filter((e) => e.kind === "spell_answer" && e.source.id === gone);
  assert.ok(removed.length > 0 && removed.every((e) => e.kind === "spell_answer" && /^removed-\d+$/.test(e.word.id) && e.word.text === "" && e.response === "" && e.scrubbed));
  assert.equal(removed.filter((e) => e.kind === "spell_answer" && !e.correct).length, 1, "the misspelling is still counted, without its letters");
  // nothing else moved; the record only grew by the session stop and the deletion
  assert.deepEqual(progress(), before.bee);
  assert.deepEqual(progress({ type: "list", id: keep }), before.keep);
  assert.equal(stored.length, before.count + 2);
  assert.deepEqual(l.wordLists().map((x) => x.id), [keep]);
  // reopening (or a backup) does not bring it back
  const again = await Learner.open(c, repo, "p-del", clock);
  assert.deepEqual(again.wordLists().map((x) => x.id), [keep]);
  assert.ok(!JSON.stringify(again.backup()).includes("castle"));
  assert.ok(parseBackup(JSON.stringify(again.backup())).ok);
});
