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
const ROBOT = readFileSync(new URL("./fixtures/book-robot.txt", import.meta.url), "utf8");

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
  // "Patel" is always "Mrs. Patel" in the book, so the question and its choices use the whole name
  assert.deepEqual(who.map((q) => q.answer), ["Mia", "Tom", "Mrs. Patel"]);
  assert.ok(who.every((q) => q.options.length === 3 && q.options.every((o) => ["Mia", "Tom", "Mrs. Patel"].includes(o))));
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

test("MB-5 a learner in a parent account keeps books with their record; limits; no My Books in a pilot build", async () => {
  const server = new MemoryRepo();
  Object.defineProperty(server, "kind", { value: "server" }); // the ServerRepo stores the same append-only events
  const clock = testClock();
  const acc = await Learner.create(c, server, "Account pupil", "guardian", clock, "p-acc");
  assert.equal(acc.contentPlace, "account");
  const ex = extract(STORY);
  const id = await acc.saveBook("A book", STORY, [ex.spelling[0].id, ex.vocabulary[0].id]);
  const again = await Learner.open(c, server, "p-acc", clock);
  assert.equal(again.spellingWords({ type: "book", id }).length, 1, "approvals reload with the record");
  assert.equal(again.bookQuestions(id).plan.length, 1);
  // the longest text allowed, all in 3-byte characters, still fits one book event on the server
  const widest = "“".repeat(BOOK_LIMITS.chars - 10) + " the end";
  await again.saveBook("Wide", widest, []);
  const l = await Learner.create(c, new MemoryRepo(), "L", "guardian", testClock(), "p-l3");
  await assert.rejects(l.saveBook(" ", STORY, []), /title/);
  await assert.rejects(l.saveBook("Empty", "  \n ", []), /no text/);
  await assert.rejects(l.saveBook("Long", "word ".repeat(BOOK_LIMITS.chars), []), /up to 30,000/);
  const pilot = await Learner.create(loadContent({ mode: "pilot" }), new MemoryRepo(), "P", "guardian", testClock(), "p-p3");
  await assert.rejects(pilot.saveBook("A book", STORY, []), PilotRefusal);
});

test("MB-6 quality (rule version 2): accurate skill labels and none of the known giveaways, on two different stories", () => {
  const MARKER = /^["'“‘(]*(?:then|finally|at last|later|afterwards|next|in the end|eventually|when they returned|one day|on the first)\b/i;
  for (const text of [STORY, ROBOT]) {
    const ex = extract(text);
    const flat = sentencesOf(text).map((x) => x.text).join(" ");
    const opening = sentencesOf(text).find((x) => x.words.length >= 6)!.text;
    // labels: what each activity actually practises; nothing claims to be inferential comprehension
    for (const q of ex.vocabulary) assert.equal(q.skill, "vocabulary-in-context");
    for (const q of ex.comprehension) assert.equal(q.skill, q.type === "who" ? "literal-comprehension" : "sequencing");
    assert.ok(![...ex.vocabulary, ...ex.comprehension].some((q) => /infer/i.test(q.skill)));
    // vocabulary: no other choice is used in the book right next to a word beside the gap (it would probably fit too)
    for (const q of ex.vocabulary) {
      const [before, after] = q.text!.split("_____");
      const prev = (before.match(/([A-Za-z'’]+)\W*$/) ?? [])[1];
      const next = (after.match(/^\W*([A-Za-z'’]+)/) ?? [])[1];
      for (const o of q.options.filter((o) => o !== q.answer)) {
        assert.ok(!(prev && new RegExp(`\\b${prev} ${o}\\b`, "i").test(flat)), `${q.id}: "${prev} ${o}" is in the book`);
        assert.ok(!(next && new RegExp(`\\b${o} ${next}\\b`, "i").test(flat)), `${q.id}: "${o} ${next}" is in the book`);
      }
    }
    // who: no he/she word to narrow the names, and no bare surname after a title
    for (const q of ex.comprehension.filter((q) => q.type === "who")) {
      assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(q.text!), `${q.id}: ${q.text}`);
      assert.ok(!/\b(Mr|Mrs|Ms|Miss|Dr)\.? _____/.test(q.text!), `${q.id}: ${q.text}`);
    }
    // which comes first: never the opening line, never a sentence that starts with a time word
    for (const q of ex.comprehension.filter((q) => q.type === "order")) for (const o of q.options) assert.ok(o !== opening && !MARKER.test(o), `${q.id}: ${o}`);
  }
  // the second story: dialogue, a teacher always called "Mr. Okafor", and he/she sentences
  const robot = extract(ROBOT);
  assert.deepEqual(robot.comprehension.filter((q) => q.type === "who").map((q) => q.answer), ["Bolt", "Priya", "Daniel", "Grace", "Mr. Okafor"]);
});


test("MB-7 one engine for every source: editing or deleting a book never changes the Bee, a list, or answers already given", async () => {
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Three Sources", "guardian", clock, "p-three");
  await l.startSpelling();
  await l.answerSpelling(l.spellingSession()!.word!.word, 1);
  await l.stopSpelling();
  const list = await l.saveWordList("Week 1", (await import("./wordlists.ts")).parseWords("castle, because").words);
  await l.startSpelling({ type: "list", id: list });
  await l.answerSpelling("castle", 1);
  const ex = extract(STORY);
  const id = await l.saveBook("The Lantern", STORY, ex.spelling.slice(0, 3).map((s) => s.id));
  await l.startSpelling({ type: "book", id });
  const first = l.spellingSession()!.word!.word;
  await l.answerSpelling(`${first}x`, 1);
  // every answer names its source; the same scoring (checkSpelling) marked all three
  const answers = l.events.filter((e) => e.kind === "spell_answer") as Extract<(typeof l.events)[number], { kind: "spell_answer" }>[];
  assert.deepEqual(answers.map((a) => a.source.type), ["bank", "list", "book"]);
  const progress = () => [l.spellingWords(), l.spellingWords({ type: "list", id: list })].map((w) => sourceProgress(l.spelling(), w, clock()));
  const before = progress();
  // edit the text (approvals must be given again); the book's words keep their history, nothing else moves
  const edited = STORY.replace("steep hill", "steep, windy hill");
  await l.saveBook("The Lantern", edited, extract(edited).spelling.slice(0, 3).map((s) => s.id), id);
  const bookProgress = sourceProgress(l.spelling(), l.spellingWords({ type: "book", id }), clock());
  assert.deepEqual([bookProgress.practised, bookProgress.reviewList], [1, 1], "the misspelt book word is still on the review list");
  assert.deepEqual(progress(), before);
  // delete the book: the open session on it ends; the Bee, the list and every answer stay
  await l.deleteBook(id);
  assert.equal(l.spellingSession(), null);
  assert.deepEqual(progress(), before);
  assert.equal(l.events.filter((e) => e.kind === "spell_answer").length, answers.length);
});

test("MB-8 deleting a book removes its text, approvals and activities from the stored record, keeps answers without its words, and changes nothing else", async () => {
  const { scrubEvents } = await import("./scrub.ts");
  const fixture = JSON.parse(readFileSync(new URL("../../../../backend/family/fixtures/scrub-fixture-book.json", import.meta.url), "utf8"));
  const r = scrubEvents(fixture.before, fixture.source);
  assert.deepEqual(JSON.parse(JSON.stringify(r.events)), fixture.after, "the same rules as the server (backend/family/scrub.py)");
  assert.equal(r.changed, fixture.changed);
  assert.equal(scrubEvents(r.events, fixture.source).changed, 0, "idempotent");
  // in the app
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Book Deleter", "guardian", clock, "p-bdel");
  await l.startSpelling();
  await l.answerSpelling(l.spellingSession()!.word!.word, 1);
  await l.stopSpelling();
  const other = await l.saveBook("The Robot Who Forgot", ROBOT, [extract(ROBOT).spelling[0].id]);
  const ex = extract(STORY);
  const id = await l.saveBook("The Lantern on the Hill", STORY, [...ex.spelling.slice(0, 2).map((s) => s.id), ex.vocabulary[0].id]);
  await l.startSpelling({ type: "book", id });
  while (l.spellingSession()?.word) await l.answerSpelling(`${l.spellingSession()!.word!.word}x`, 1);
  await l.answerBookQuestion(id, ex.vocabulary[0].id, ex.vocabulary[0].answer);
  const progress = () => [sourceProgress(l.spelling(), l.spellingWords(), clock()), sourceProgress(l.spelling(), l.spellingWords({ type: "book", id: other }), clock())];
  const before = { progress: progress(), answers: l.events.filter((e) => e.kind === "spell_answer" || e.kind === "book_answer").length };
  await l.deleteBook(id);
  const text = JSON.stringify(await repo.load("p-bdel"));
  for (const secret of ["Lantern", "narrow house", "steep hill", ...ex.spelling.slice(0, 2).map((s) => s.word), ex.vocabulary[0].id]) assert.ok(!text.includes(secret), `"${secret}" is gone`);
  assert.ok(text.includes("Mr. Okafor carried"), "the other book is kept");
  assert.equal(JSON.parse(text).filter((e: { kind: string }) => e.kind === "spell_answer" || e.kind === "book_answer").length, before.answers, "every answer kept");
  assert.deepEqual(progress(), before.progress, "the Spelling Bee and the other book unchanged");
  assert.deepEqual(l.books().map((b) => b.id), [other]);
  const again = await Learner.open(c, repo, "p-bdel", clock);
  assert.deepEqual(again.books().map((b) => b.id), [other], "reopening does not bring it back");
  assert.ok(!JSON.stringify(again.backup()).includes("Lantern"), "nor a backup made after the deletion");
});
