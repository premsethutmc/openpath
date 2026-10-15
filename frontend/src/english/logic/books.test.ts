/**
 * My Books (logic/books.ts): activities found only in the supplied text, by fixed rules; nothing reaches the learner
 * until a parent approves it; approvals are tied to the exact text; spelling through the shared engine; private to the
 * device. The book is an original synthetic story written for these tests (fixtures/book-lantern.txt).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseBackup } from "./backup.ts";
import { BOOK_LIMITS, extract, fingerprint, sentencesOf } from "./books.ts";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner, PilotRefusal } from "./learner.ts";
import { sourceProgress } from "./spelling.ts";
import { MemoryRepo } from "./store.ts";

const c = loadContent({ mode: "development" });
const STORY = readFileSync(new URL("./fixtures/book-lantern.txt", import.meta.url), "utf8");

test("MB-1 everything comes from the text: words, sentences, choices and answers; the same text gives the same activities", () => {
  const ex = extract(STORY);
  const flat = STORY.replace(/\s+/g, " ");
  const sentences = sentencesOf(STORY).map((s) => s.text);
  assert.ok(ex.spelling.length === BOOK_LIMITS.spelling && ex.vocabulary.length >= 5 && ex.comprehension.length >= 4, "a 300-word story gives each kind of activity");
  for (const s of ex.spelling) {
    assert.match(flat, new RegExp(`\\b${s.word}\\b`), `${s.word} is in the book`);
    if (s.sentence) assert.ok(sentences.includes(s.sentence) && s.sentence.includes(s.word), "the spoken sentence is the book's own");
  }
  for (const q of [...ex.vocabulary, ...ex.comprehension]) {
    assert.ok(q.options.includes(q.answer), `${q.id}: the answer is a choice`);
    assert.equal(new Set(q.options).size, q.options.length, `${q.id}: no repeated choices`);
    for (const o of q.options) assert.ok(flat.includes(o), `${q.id}: the choice "${o}" is from the book`);
    if (q.text) {
      assert.ok(q.text.includes("_____") && !new RegExp(`\\b${q.answer}\\b`).test(q.text), `${q.id}: the gap hides the answer`);
      assert.ok(sentences.includes(q.text.replace("_____", q.answer)), `${q.id}: filling the gap gives the book's sentence`);
    }
    if (q.type === "order") assert.ok(sentences.indexOf(q.answer) < sentences.indexOf(q.options.find((o) => o !== q.answer)!), "the answer comes first in the book");
  }
  assert.equal(new Set([...ex.spelling, ...ex.vocabulary, ...ex.comprehension].map((a) => a.id)).size, ex.spelling.length + ex.vocabulary.length + ex.comprehension.length, "activity ids are unique");
  assert.deepEqual(extract(STORY), ex, "deterministic");
  assert.notEqual(fingerprint(STORY), fingerprint(STORY.replace("Mia", "Maya")));
});

test("MB-2 names: written with a capital mid-sentence, never in lower case, used twice; titles and days are not names", () => {
  const ex = extract(STORY);
  assert.deepEqual(ex.names, ["Mia", "Tom", "Patel"]);
  const who = ex.comprehension.filter((q) => q.type === "who");
  assert.deepEqual(who.map((q) => q.answer), ["Mia", "Tom", "Patel"]);
  assert.ok(who.every((q) => q.options.length === 3 && q.options.every((o) => ex.names.includes(o))));
  // a text with fewer than 3 names says why there are no "who" questions
  const two = extract(STORY.replace(/Patel/g, "Smith").replace(/Mrs\. Smith/g, "the old woman").replace(/\bSmith\b/g, "the woman"));
  assert.equal(two.comprehension.filter((q) => q.type === "who").length, 0);
  assert.match(two.notes.join(" "), /only 2 names were found \(Mia, Tom\)/);
});

test("MB-3 a short or empty text gives no activities, and says why", () => {
  const ex = extract("The cat sat on the mat.");
  assert.deepEqual([ex.spelling.length, ex.vocabulary.length, ex.comprehension.length], [0, 0, 0]);
  assert.match(ex.notes[0], /6 words; at least 30/);
  assert.equal(sentencesOf("Mr. Brown waved. Then he left!").length, 2, "Mr. does not end a sentence");
  assert.equal(sentencesOf("“Wait!” shouted Mia. She ran.").length, 2, "speech followed by lower case stays in its sentence");
  const accented = extract(`${STORY}\nThe résumé and the naïve café owner were mentioned. The résumé was unremarkable.`);
  assert.ok(!accented.spelling.some((s) => /sum|caf|na$/.test(s.word)), "an accented word is skipped whole, never split into fragments");
});

test("MB-4 nothing reaches the learner until approved; approvals are for this exact text; spelling uses the shared engine", async () => {
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Book Learner", "guardian", clock, "p-book");
  // saved without approvals: the learner sees nothing
  const id = await l.saveBook("The Lantern on the Hill", STORY, []);
  assert.deepEqual(l.spellingWords({ type: "book", id }), []);
  assert.equal(l.bookQuestions(id).plan.length, 0);
  await assert.rejects(l.startSpelling({ type: "book", id }), /no words/);
  // the parent approves 4 spelling words, 1 vocabulary and 1 comprehension question (and an id that is not an activity)
  const ex = l.bookActivities(l.books()[0]);
  const words = ex.spelling.slice(0, 4);
  const vq = ex.vocabulary[0];
  const cq = ex.comprehension.find((q) => q.type === "who")!;
  await l.saveBook("The Lantern on the Hill", STORY, [...words.map((w) => w.id), vq.id, cq.id, "s:invented"], id);
  assert.equal(l.events.filter((e) => e.kind === "book").length, 1, "the text is saved once, not again for a review");
  assert.deepEqual(l.books()[0].approved, new Set([...words.map((w) => w.id), vq.id, cq.id]), "ids that are not activities are dropped");
  const sw = l.spellingWords({ type: "book", id });
  assert.deepEqual(sw.map((w) => w.word), words.map((w) => w.word));
  assert.ok(sw.every((w) => w.source.type === "book" && w.source.id === id && /approved by a parent/.test(w.status)));
  assert.equal(sw[0].sentence, words[0].sentence, "the book's sentence is spoken with the word");
  // spelling: the Spelling Bee's engine, source book
  await l.startSpelling({ type: "book", id });
  assert.equal(l.spellingSession()!.total, 4);
  assert.ok((await l.answerSpelling(words[0].word, 1)).correct);
  assert.ok(!(await l.answerSpelling("x", 1)).correct);
  const p = sourceProgress(l.spelling(), sw, clock());
  assert.deepEqual([p.practised, p.right, p.reviewList], [2, 1, 1]);
  // questions: only the approved two; an unapproved one is refused
  const plan = l.bookQuestions(id).plan;
  assert.deepEqual(plan.map((q) => q.id).sort(), [vq.id, cq.id].sort());
  assert.deepEqual(await l.answerBookQuestion(id, vq.id, vq.answer), { correct: true, answer: vq.answer });
  assert.equal((await l.answerBookQuestion(id, cq.id, cq.options.find((o) => o !== cq.answer)!)).correct, false);
  await assert.rejects(l.answerBookQuestion(id, ex.vocabulary[1].id, ex.vocabulary[1].answer), /not approved/);
  assert.deepEqual(l.bookQuestions(id).progress, { total: 2, answered: 2, right: 1 });
  assert.equal(l.bookQuestions(id).plan[0].id, cq.id, "the one answered wrongly comes first next time");
  // a new title keeps the approvals; a changed text drops them until the parent reviews again
  await l.saveBook("The Lantern", STORY, [...l.books()[0].approved], id);
  assert.equal(l.spellingWords({ type: "book", id }).length, 4);
  await l.saveBook("The Lantern", STORY.replace("steep hill", "steep green hill"), [...l.books()[0].approved], id);
  assert.ok(l.spellingWords({ type: "book", id }).length > 0, "approving again for the new text works");
  const edited = l.events.filter((e) => e.kind === "book").at(-1)!;
  await repo.append("p-book", { ...edited, id: "p-book:edit", book: { ...(edited as { book: { id: string; title: string; text: string } }).book, text: STORY.replace("hill", "mountain") } } as never);
  const reopened = await Learner.open(c, repo, "p-book", clock);
  assert.deepEqual(reopened.spellingWords({ type: "book", id }), [], "a text changed after the review shows nothing");
  assert.equal(reopened.bookQuestions(id).plan.length, 0);
  assert.equal(reopened.books()[0].reviewed, false);
  // never engine evidence; backed up; deleted
  assert.equal(reopened.events.filter((e) => e.kind === "evidence").length, 0);
  assert.ok(parseBackup(JSON.stringify(reopened.backup())).ok);
  await reopened.deleteBook(id);
  assert.deepEqual(reopened.books(), []);
});

test("MB-5 private to the device, limits, and no My Books in a pilot build", async () => {
  const server = new MemoryRepo();
  Object.defineProperty(server, "kind", { value: "server" });
  const acc = await Learner.create(c, server, "Account pupil", "guardian", testClock(), "p-acc");
  await assert.rejects(acc.saveBook("A book", STORY, []), /on this device only/);
  assert.equal(acc.events.filter((e) => e.kind === "book").length, 0, "the text never reached the server's record");
  const l = await Learner.create(c, new MemoryRepo(), "L", "guardian", testClock(), "p-l3");
  await assert.rejects(l.saveBook(" ", STORY, []), /title/);
  await assert.rejects(l.saveBook("Empty", "  \n ", []), /no text/);
  await assert.rejects(l.saveBook("Long", "word ".repeat(BOOK_LIMITS.chars), []), /up to 30,000/);
  const pilot = await Learner.create(loadContent({ mode: "pilot" }), new MemoryRepo(), "P", "guardian", testClock(), "p-p3");
  await assert.rejects(pilot.saveBook("A book", STORY, []), PilotRefusal);
});
