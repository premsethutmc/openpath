/**
 * Grammar in use and the class syllabus: sound content, code scoring of fixes and built sentences, a sitting with
 * rules shown, levels that move, topic sittings that do not move them, a syllabus whose every pointer leads to real
 * practice, and no effect on the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { LEARN, learnProblems, GRAMMAR, GrammarSitting, SITTING_SIZE, checkBuild, checkChoose, checkFix, checkSpot, choices, corrected, fixParts, grammarProblems, grammarSummary, levelFor, pick, startLevel, spotWords, tiles, type GrammarItem, type GrammarRecord } from "./grammar-use.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { SYLLABUSES, coverage, syllabusFor, syllabusProblems } from "../syllabus/syllabus.ts";

const byId = new Map(GRAMMAR.items.map((i) => [i.id, i]));
const item = (sentence: string) => GRAMMAR.items.find((i) => i.sentence === sentence)!;

test("GU-1 content: three levels, every sentence checkable, tiles never laid out as the answer", () => {
  assert.deepEqual(grammarProblems(GRAMMAR), []);
  assert.ok(GRAMMAR.items.length >= 100);
  for (const l of GRAMMAR.levels) assert.ok(GRAMMAR.items.filter((i) => i.level === l.id).length >= 2 * SITTING_SIZE);
  for (const it of GRAMMAR.items) {
    if (it.kind === "fix") {
      const p = fixParts(it);
      assert.ok(p.wrong >= 0 && !p.words.join(" ").includes("["), it.id);
      for (const r of it.right!) assert.ok(checkFix(it, p.wrong, r), `${it.id}: ${r}`);
      assert.ok(!corrected(it).includes("["));
    } else {
      const t = tiles(it);
      assert.equal(t.length, (it.parts ?? it.sentence.split(" ")).length + (it.extra?.length ?? 0));
      assert.notEqual(t.slice(0, (it.parts ?? it.sentence.split(" ")).length).join(" "), it.sentence, it.id);
      assert.ok(checkBuild(it, it.sentence.split(" ")));
    }
  }
  const bad = { ...GRAMMAR, items: [{ id: "x", level: 9, topic: "nope", kind: "fix", sentence: "No brackets here.", rule: " ", right: [] } as GrammarItem] };
  assert.match(grammarProblems(bad).join("\n"), /unknown level[\s\S]*unknown topic[\s\S]*no rule[\s\S]*exactly one wrong word/);
});

test("GU-2 a fix needs the right word tapped and an accepted correction; capitals count only where the answer has one", () => {
  const it = item("She [breaked] the glass yesterday.");
  assert.deepEqual([checkFix(it, 1, "broke"), checkFix(it, 1, " Broke "), checkFix(it, 1, "breaked"), checkFix(it, 2, "broke"), checkFix(it, 1, "broken")], [true, true, false, false, false]);
  assert.equal(corrected(it), "She broke the glass yesterday.");
  const july = item("My birthday is in [july].");
  assert.deepEqual([checkFix(july, 4, "July"), checkFix(july, 4, "july")], [true, false]);
  assert.equal(corrected(july), "My birthday is in July.");
  const boys = item("The [boys] room is upstairs; three boys share it.");
  assert.ok(checkFix(boys, 1, "boys’"), "a curly apostrophe is the same mark");
  const many = item("Take an umbrella [so] it may rain.");
  assert.ok(checkFix(many, 3, "because") && checkFix(many, 3, "as"));
});

test("GU-3 a built sentence must use the right tiles in the right order", () => {
  const it = item("Ravi asked me where I was going.");
  assert.deepEqual(it.extra, ["are", "you"]);
  assert.ok(checkBuild(it, ["Ravi", "asked", "me", "where", "I", "was", "going."]));
  assert.ok(!checkBuild(it, ["Ravi", "asked", "me", "where", "are", "you", "going."]));
  assert.ok(!checkBuild(it, ["Ravi", "asked", "me", "where", "I", "was"]));
  const speech = item('"Where are you going?" asked Ravi.');
  assert.ok(checkBuild(speech, ["“Where", "are", "you", "going?”", "asked", "Ravi."]), "curly quotation marks are the same marks");
});

/** A learner who has had every topic's card already, so a sitting goes straight to its sentences. */
const LEARNT: GrammarRecord[] = LEARN.map((c) => ({ type: "learn", sitting: "g0", topic: c.topic, tried: true }));

/** Sit a sitting, answering right unless `miss(item)` says otherwise. */
function sit(level: number, history: GrammarRecord[], miss: (it: GrammarItem, i: number) => boolean = () => false, topics?: string[]) {
  const s = new GrammarSitting(GRAMMAR, level, [...LEARNT, ...history], topics);
  const asked: GrammarItem[] = [];
  for (let v = s.snapshot(), i = 0; v.phase !== "done"; v = s.snapshot(), i++) {
    if (v.phase === "learn") {
      // a card back after two misses on a topic (GU-17): read it and go on
      s.learned();
      i--;
      continue;
    }
    const it = byId.get(v.id!)!;
    asked.push(it);
    assert.ok(!(v.fix?.words.join(" ") ?? "").includes("["), "the wrong word is not marked on screen");
    const wrong = miss(it, i);
    const bare = (w: string) => w.replace(/[^A-Za-z']/g, "");
    if (it.kind === "choose") s.choose(choices(it).findIndex((o) => (o === it.right![0]) !== wrong));
    else if (it.kind === "spot") s.spot(spotWords(it).findIndex((w) => it.right!.includes(bare(w)) !== wrong));
    else if (it.kind === "fix") s.fix(fixParts(it).wrong, wrong ? "zzz" : it.right![0]);
    else s.build(wrong ? [...it.sentence.split(" ")].reverse() : it.sentence.split(" "));
    const f = s.snapshot().feedback!;
    assert.equal(f.correct, !wrong);
    assert.equal(f.right, corrected(it));
    assert.equal(f.rule, it.rule);
    s.next();
  }
  return { asked, done: s.snapshot().done!, records: [...history, ...s.take()] };
}

test("GU-4 a sitting: eight sentences at the level, mixed topics, the rule after each, records kept", () => {
  const r = sit(2, [], (_, i) => i < 2);
  assert.equal(r.asked.length, SITTING_SIZE);
  assert.ok(r.asked.every((it) => it.level === 2));
  assert.ok(new Set(r.asked.map((it) => it.topic)).size >= 3, "no more than three sentences on one topic");
  for (const kind of ["fix", "build"]) assert.ok(r.asked.filter((it) => it.kind === kind).length >= 3, `at least three to ${kind}`);
  assert.deepEqual([r.done.asked, r.done.right, r.done.weak.length > 0], [8, 6, true]);
  assert.equal(r.records.filter((x) => x.type === "answer").length, 8);
  assert.equal(r.records.at(-1)!.type, "end");
  const s = new GrammarSitting(GRAMMAR, 2, LEARNT);
  s.fix(99, "x");
  s.build([]);
  assert.equal(s.snapshot().phase, "ask", "an answer that cannot be given is ignored");
});

test("GU-5 levels go down after one weak sitting and up after two strong ones; missed sentences return; new ones come first", () => {
  assert.deepEqual([startLevel("early"), startLevel("school"), startLevel(null)], [1, 3, 3]);
  // a sitting stored before the six-level scale is read on today's scale: old 2 is 3
  assert.equal(levelFor(GRAMMAR, [{ type: "end", sitting: "old", level: 2, asked: 8, right: 4 }], 1), 3);
  assert.equal(levelFor(GRAMMAR, [{ type: "end", sitting: "new", level: 2, scale: 2, asked: 8, right: 4 }], 1), 2);
  const twice = (level: number) => sit(level, sit(level, []).records).done.nextLevel;
  assert.equal(sit(2, []).done.nextLevel, 2, "one strong sitting: stays");
  assert.equal(twice(2), 3, "two in a row: up");
  assert.equal(sit(3, sit(2, []).records).done.nextLevel, 3, "a strong sitting at another level does not count");
  assert.equal(sit(2, [], (_, i) => i < 5).done.nextLevel, 1);
  assert.equal(sit(2, [], (_, i) => i < 3).done.nextLevel, 2);
  assert.equal(twice(3), 4);
  assert.equal(twice(6), 7);
  assert.equal(twice(7), 7);
  const first = sit(2, [], (_, i) => i < 3);
  const next = pick(GRAMMAR, 2, first.records);
  assert.ok(!next.some((it) => first.asked.includes(it)), "new sentences before any repeat");
  const all = GRAMMAR.items.filter((it) => it.level === 2);
  const seen: GrammarRecord[] = all.map((it, i) => ({ type: "answer", sitting: "g1", id: it.id, level: 2, topic: it.topic, correct: ![4, 12, 20].includes(i), given: "" }));
  assert.deepEqual(pick(GRAMMAR, 2, seen).slice(0, 3).map((it) => it.id).sort(), [all[4].id, all[12].id, all[20].id].sort(), "once all are seen, the missed ones first");
  const sum = grammarSummary(GRAMMAR, first.records);
  assert.deepEqual([sum.answered, sum.right, sum.level], [8, 5, 2]);
  assert.ok(sum.weak.length >= 1);
});

test("GU-6 a topic sitting asks only those topics and does not move the level", () => {
  const r = sit(2, [], () => false, ["speech"]);
  assert.ok(r.asked.length >= 4 && r.asked.every((it) => it.topic === "speech"));
  assert.equal(levelFor(GRAMMAR, r.records, 2), 2);
  assert.equal(grammarSummary(GRAMMAR, r.records).level, null);
});

test("GU-7 the ICSE Class 5 syllabus: every line placed, every pointer leads to real practice, nothing copied in bulk", () => {
  const s = syllabusFor(5);
  assert.deepEqual(syllabusProblems(s), []);
  assert.deepEqual([s.board, s.class, s.source.official], ["CISCE (ICSE)", 5, false]);
  assert.match(s.source.note, /^UNOFFICIAL SOURCE/);
  assert.deepEqual(coverage(s), { covered: 21, partly: 0, guided: 12, not: 0, total: 33 });
  assert.deepEqual(s.strands.map((x) => x.outcomes.length), [9, 13, 10, 1]);
  for (const o of s.strands.flatMap((x) => x.outcomes)) {
    assert.ok(o.text.split(/\s+/).length <= 22, `${o.id}: a short line in our own words`);
    if (o.topics) assert.ok(pick(GRAMMAR, 2, [], o.topics).length >= 4, `${o.id}: a topic sitting has sentences`);
  }
  const bad = { ...s, strands: [{ ...s.strands[0], outcomes: [{ id: "Z", text: "x", coverage: "covered" as const }, { id: "Z", text: "x", coverage: "not" as const, where: "words" as const }] }] };
  assert.match(syllabusProblems(bad).join("\n"), /no stream is named[\s\S]*listed twice[\s\S]*points to a stream/);
});

test("GU-8 stored on the learner's record without touching the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Grammar", "guardian", clock, "p-gram");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  const r = sit(2, []);
  await l.recordGrammar(r.records);
  const events = await repo.load("p-gram");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-gram", clock);
  assert.equal(levelFor(GRAMMAR, again.grammarRecords(), 2), 2);
  assert.match(String(eventProblem({ kind: "grammar_use", id: "x", at: clock(), record: {} })), /without its type/);
});

test("GU-9 Classes 1 to 8 are held; each is sound, unofficial-source labelled, and its grammar lines have sentences", () => {
  assert.deepEqual(SYLLABUSES.map((x) => x.class), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(coverage(syllabusFor(1)), { covered: 17, partly: 5, guided: 16, not: 0, total: 38 });
  assert.deepEqual(coverage(syllabusFor(2)), { covered: 11, partly: 2, guided: 12, not: 0, total: 25 });
  assert.deepEqual(coverage(syllabusFor(8)), { covered: 9, partly: 1, guided: 27, not: 0, total: 37 });
  assert.deepEqual(coverage(syllabusFor(3)), { covered: 12, partly: 1, guided: 11, not: 0, total: 24 });
  assert.deepEqual(coverage(syllabusFor(7)), { covered: 13, partly: 0, guided: 12, not: 0, total: 25 });
  assert.deepEqual(coverage(syllabusFor(4)), { covered: 12, partly: 1, guided: 12, not: 0, total: 25 });
  assert.deepEqual(coverage(syllabusFor(6)), { covered: 23, partly: 1, guided: 22, not: 0, total: 46 });
  for (const s of SYLLABUSES) {
    assert.deepEqual(syllabusProblems(s), []);
    assert.equal(s.source.official, false);
    assert.match(s.source.note, /^UNOFFICIAL SOURCE/);
    for (const o of s.strands.flatMap((x) => x.outcomes)) {
      assert.ok(o.text.split(/\s+/).length <= 22, `${s.class} ${o.id}`);
      if (o.topics) assert.ok(pick(GRAMMAR, 2, [], o.topics).length >= 3, `${s.class} ${o.id}: a topic sitting has sentences`);
    }
  }
  assert.equal(syllabusFor(99).class, 1, "an unknown class falls back to the first held");
});

test("GU-9 naming words: a word of the kind asked is right, any other word is not, and the basics come first", () => {
  const spots = GRAMMAR.items.filter((it) => it.kind === "spot");
  assert.ok(spots.length >= 24);
  for (const it of spots) {
    const words = spotWords(it);
    const right = words.map((_, i) => checkSpot(it, i));
    assert.equal(right.filter(Boolean).length, it.right!.length, it.id);
    assert.ok(right.some((r) => !r), `${it.id}: some word is not of the kind`);
    assert.equal(checkSpot(it, 99), false);
  }
  assert.deepEqual([...new Set(spots.filter((it) => it.level === 1).map((it) => it.ask))].sort(), ["noun", "verb"]);
  const v = new GrammarSitting(GRAMMAR, 1, LEARNT, ["parts_of_speech"]).snapshot();
  assert.ok(v.spot && !JSON.stringify(v).includes('"right"'), "the screen holds the words and the kind asked for, never the answer");
});

test("GU-10 sentences in order: whole sentences are the tiles, shuffled, and only the right order passes", () => {
  const items = GRAMMAR.items.filter((it) => it.parts);
  assert.ok(items.length >= 4);
  for (const it of items) {
    assert.deepEqual([...tiles(it)].sort(), [...it.parts!].sort());
    assert.ok(checkBuild(it, it.parts!));
    assert.ok(!checkBuild(it, [...it.parts!].reverse()));
  }
  const v = new GrammarSitting(GRAMMAR, 3, LEARNT, ["sentence_order"]).snapshot();
  assert.equal(v.build?.whole, true);
});

test("GU-11 choosing an answer: one right answer among two or three, in an order that does not give it away", () => {
  const items = GRAMMAR.items.filter((it) => it.kind === "choose");
  assert.ok(items.length >= 36);
  const place = [0, 0, 0];
  for (const it of items) {
    const o = choices(it);
    assert.deepEqual([...o].sort(), [...it.right!, ...it.wrong!].sort());
    assert.equal(o.filter((_, i) => checkChoose(it, i)).length, 1, it.id);
    place[o.indexOf(it.right![0])]++;
  }
  assert.ok(place[0] > 0 && place[1] > 0, `the right answer is not always in one place: ${place}`);
  const v = new GrammarSitting(GRAMMAR, 6, LEARNT, ["figures"]).snapshot();
  assert.ok(v.choose && v.choose.options.length === 3 && !JSON.stringify(v).includes('"right"'));
  // a level sitting keeps room for three sentences to fix and three to build
  const level = pick(GRAMMAR, 6, []);
  assert.ok(level.filter((it) => it.kind === "choose" || it.kind === "spot").length <= 2);
});

test("GU-14 the five lines closed on 19 Nov 2026 have their sentences and passages", () => {
  const at = (topic: string) => GRAMMAR.items.filter((i) => i.topic === topic);
  // Class 1 RW9 and Class 2 RW3: pictures in story order, and how people felt
  assert.equal(at("picture_order").filter((i) => i.kind === "build" && i.parts?.every((p) => /^\p{Extended_Pictographic}/u.test(p))).length, 5);
  assert.equal(at("picture_order").filter((i) => i.kind === "choose").length, 3);
  // Class 6 GV11: each, every, everyone, someone, nobody
  assert.ok(at("pronoun_agreement").filter((i) => /\b(Each|Every|Everyone|Someone|Nobody)\b/.test(i.sentence)).length >= 6);
  // Class 6 GV12: a tense held across a paragraph of three sentences
  assert.ok(at("tense_shift").filter((i) => i.sentence.split(/(?<=\.) /).length >= 3).length >= 6);
});

test("GU-15 a card teaches a topic before its first sentence, once, and is never scored", () => {
  assert.deepEqual(learnProblems(LEARN, GRAMMAR), []);
  assert.equal(LEARN.length, GRAMMAR.topics.length, "every topic has a card");
  const s = new GrammarSitting(GRAMMAR, 1, []);
  let v = s.snapshot();
  assert.equal(v.phase, "learn");
  const card = LEARN.find((c) => c.topic === byId.get(v.id!)!.topic)!;
  assert.equal(v.learn!.rule, card.rule);
  assert.deepEqual(v.learn!.examples, card.examples);
  assert.equal(new Set(v.learn!.options).size, 3);
  // the sentence cannot be answered while its card is showing
  const it = byId.get(v.id!)!;
  if (it.kind === "fix") s.fix(fixParts(it).wrong, it.right![0]);
  else if (it.kind === "build") s.build(it.sentence.split(" "));
  else if (it.kind === "choose") s.choose(0);
  else s.spot(0);
  assert.equal(s.snapshot().phase, "learn");
  // trying shows the answer; a wrong try is not held against the learner
  const wrong = v.learn!.options.findIndex((o) => o !== card.try.right);
  s.tryCard(wrong);
  v = s.snapshot();
  assert.deepEqual(v.learn!.tried, { chosen: wrong, right: false, answer: v.learn!.options.indexOf(card.try.right) });
  s.learned();
  assert.equal(s.snapshot().phase, "ask");
  const recs = s.take();
  assert.deepEqual(recs.find((r) => r.type === "learn"), { type: "learn", sitting: "g1", topic: card.topic, tried: false });
  assert.ok(!recs.some((r) => r.type === "answer"), "no answer is recorded for a card");
  // a topic has its card only once, across sittings
  const r = sit(1, [...recs], () => false);
  const later = new GrammarSitting(GRAMMAR, 1, [...LEARN.filter((c) => c.topic !== card.topic).map((c) => ({ type: "learn" as const, sitting: "g0", topic: c.topic, tried: true })), ...recs, ...r.records]);
  assert.notEqual(later.snapshot().phase, "learn");
});

test("GU-16 the basics have enough sentences: am, is, are; this and these; word order; have and has", () => {
  for (const t of ["be_verbs", "this_these", "word_order", "have_has", "pronouns", "questions", "capitals", "plurals"]) assert.ok(GRAMMAR.items.filter((i) => i.topic === t).length >= 8, t);
  assert.ok(GRAMMAR.items.filter((i) => i.level === 1).length >= 90, "level 1");
});

test("GU-17 the card comes back after two wrong answers in a row on its topic, and not before", () => {
  // a learner who has seen every card, then misses two sentences of one topic in a row
  const s = new GrammarSitting(GRAMMAR, 2, LEARNT);
  const missed = new Map<string, number>();
  let again: string | null = null;
  for (let v = s.snapshot(), g = 0; v.phase !== "done" && g < 40; v = s.snapshot(), g++) {
    if (v.phase === "learn") {
      again = byId.get(v.id!)!.topic;
      assert.ok((missed.get(again) ?? 0) >= 2, "only after two misses");
      s.learned();
      continue;
    }
    if (v.phase === "feedback") {
      s.next();
      continue;
    }
    const it = byId.get(v.id!)!;
    // always wrong
    if (it.kind === "choose") s.choose(choices(it).findIndex((o) => o !== it.right![0]));
    else if (it.kind === "spot") s.spot(spotWords(it).findIndex((w) => !it.right!.includes(w.replace(/[^A-Za-z']/g, ""))));
    else if (it.kind === "fix") s.fix(fixParts(it).wrong, "zzz");
    else s.build([...it.sentence.split(" ")].reverse());
    missed.set(it.topic, (missed.get(it.topic) ?? 0) + 1);
  }
  const recs = s.take();
  if ([...missed.values()].some((n) => n >= 3)) assert.ok(again, "a topic missed twice brought its card back");
  for (const r of recs.filter((r) => r.type === "learn")) assert.equal((r as { again?: boolean }).again, true);
  // a right answer in between resets the count
  const h: GrammarRecord[] = [...LEARNT, { type: "answer", sitting: "g1", id: "x", level: 2, topic: "past", correct: false, given: "" }, { type: "answer", sitting: "g1", id: "y", level: 2, topic: "past", correct: true, given: "" }, { type: "answer", sitting: "g1", id: "z", level: 2, topic: "past", correct: false, given: "" }];
  const t = new GrammarSitting(GRAMMAR, 2, h, ["past"]);
  assert.notEqual(t.snapshot().phase, "learn");
  const h2: GrammarRecord[] = [...h, { type: "answer", sitting: "g1", id: "w", level: 2, topic: "past", correct: false, given: "" }];
  assert.equal(new GrammarSitting(GRAMMAR, 2, h2, ["past"]).snapshot().phase, "learn");
});

test("GU-18 every topic has at least eight sentences, and every card a common mistake and two questions", () => {
  const thin = GRAMMAR.topics.filter((t) => GRAMMAR.items.filter((i) => i.topic === t.id).length < 8).map((t) => t.id);
  assert.deepEqual(thin, []);
  for (const c of LEARN) {
    assert.notEqual(c.mistake.wrong, c.mistake.right, c.topic);
    assert.notEqual(c.try2.question, c.try.question, c.topic);
  }
});
