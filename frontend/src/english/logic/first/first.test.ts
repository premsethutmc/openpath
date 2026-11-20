import test from "node:test";
import assert from "node:assert/strict";
import { BUILDS, FIRST, FirstSitting, NEW_WORDS, OPTIONS, SENTENCES_AFTER, firstProblems, firstSummary, isBeginner, pick, type FirstRecord } from "./first.ts";
import { loadContent } from "../content.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

const W = new Map(FIRST.words.map((w) => [w.id, w]));
const byWord = (word: string) => FIRST.words.find((w) => w.word === word)!;
/** The right taps for the step on screen, worked out from the content the way a learner who knows the words would. */
function rightTaps(v: ReturnType<FirstSitting["snapshot"]>): number[] {
  const pictures = v.options.map((o) => o.picture);
  if (v.kind === "hear") return [pictures.indexOf(W.get(v.key!)!.picture)];
  if (v.kind === "count") {
    const [number, noun] = v.key!.split(" ");
    const w = FIRST.words.find((x) => [x.word, `${x.word}s`, `${x.word}es`].includes(noun))!;
    return [pictures.indexOf(w.picture.repeat(FIRST.numbers.indexOf(number) + 1))];
  }
  if (v.kind === "colour") return [pictures.indexOf(FIRST.colours.find((c) => v.key === `the ${c.id} one`)!.picture)];
  if (v.kind === "place") return [v.place!.zones.findIndex((z) => v.key!.includes(` ${FIRST.place.relations.find((r) => r.id === z.id)!.say} the `))];
  const [a, b] = v.key!.split(" then ");
  return [pictures.indexOf(byWord(a).picture), pictures.indexOf(byWord(b).picture)];
}
/** Sit one sitting. `miss(kind, i)` says whether to tap wrongly once before the right answer. */
function sit(history: FirstRecord[], miss: (kind: string, i: number) => boolean = () => false) {
  const s = new FirstSitting(FIRST, history);
  const seen: { kind: string; key: string; say: string }[] = [];
  for (let v = s.snapshot(), i = 0; v.phase !== "done"; v = s.snapshot(), i++) {
    assert.equal(v.phase, "ask");
    assert.ok(!JSON.stringify(v).includes('"answer"'), "the screen holds no answer key");
    assert.equal(v.reveal, null, "the word is not shown before a right answer");
    seen.push({ kind: v.kind!, key: v.key!, say: s.spoken()! });
    const wrongFirst = miss(v.kind!, i);
    if (v.kind === "read" || v.kind === "sentence") {
      // First sentences (FW-sentences tests): answered here by trying, as their answers come from the sentence
      solve(s);
      s.next();
      continue;
    }
    if (v.kind === "build") {
      const word = W.get(v.key!)!.word;
      assert.equal(v.build!.tiles.length, word.length + 2);
      assert.notEqual(v.build!.tiles.slice(0, word.length).map((t) => t.letter).join(""), word, "the tiles are not laid out as the word");
      if (wrongFirst) assert.equal(s.letter(v.build!.tiles.findIndex((t) => t.letter !== word[0])), false);
      for (const ch of word) assert.equal(s.letter(s.snapshot().build!.tiles.findIndex((t) => t.letter === ch && !t.used)), true);
    } else {
      assert.equal(v.kind === "place" ? v.place!.zones.length : v.options.length, OPTIONS);
      const right = rightTaps(v);
      assert.ok(right.every((r) => r >= 0), `${v.kind} ${v.key}: the right choice is on screen`);
      if (wrongFirst) {
        const wrong = [0, 1, 2].find((c) => c !== right[0])!;
        assert.equal(s.tap(wrong), false);
        if (v.kind !== "two") {
          const after = s.snapshot();
          assert.ok(v.kind === "place" ? after.place!.zones[wrong].off : after.options[wrong].off, "a wrong choice is switched off");
          assert.equal(s.tap(wrong), false, "and cannot be tapped again");
        }
      }
      for (const r of right) assert.equal(s.tap(r), true);
    }
    const done = s.snapshot();
    assert.equal(done.phase, "right");
    assert.ok(done.reveal!.text.length > 0);
    s.next();
  }
  return { seen, done: s.snapshot().done!, records: [...history, ...s.take()] };
}

test("FW-1 content: short words, one picture each, enough of each group to choose between", () => {
  assert.deepEqual(firstProblems(FIRST), []);
  assert.ok(FIRST.words.length >= 80);
  assert.deepEqual([...new Set(FIRST.words.map((w) => w.group))], ["animals", "actions", "food", "describing", "things", "world"]);
  const bad = { ...FIRST, words: [...FIRST.words, { id: "cat", word: "Cat!", picture: FIRST.words[1].picture, group: "solo" }] };
  assert.match(firstProblems(bad).join("\n"), /listed twice[\s\S]*small letters[\s\S]*used by another word[\s\S]*group needs/);
});

test("FW-2 a sitting: four new words heard, three of them built, and three things done by ear; eleven steps", () => {
  const r = sit([]);
  assert.deepEqual(r.seen.map((x) => x.kind), ["hear", "hear", "hear", "hear", "count", "build", "build", "colour", "build", "place", "two"]);
  assert.deepEqual(r.seen.slice(0, NEW_WORDS).map((x) => x.key), FIRST.words.slice(0, NEW_WORDS).map((w) => w.id));
  assert.equal(r.seen.filter((x) => x.kind === "build").length, BUILDS);
  assert.match(r.seen[0].say, /^Tap the \w+\.$/);
  assert.match(r.seen.find((x) => x.kind === "count")!.say, /^Tap (one|two|three|four|five) \w+\.$/);
  assert.match(r.seen.find((x) => x.kind === "place")!.say, /^Put the \w+ (on|next to|under) the box\.$/);
  assert.match(r.seen.at(-1)!.say, /^Tap the \w+, then the \w+\.$/);
  assert.deepEqual(r.done, { asked: 11, right: 11 });
  assert.equal(r.records.filter((x) => x.type === "step").length, 11);
  assert.equal(r.records.at(-1)!.type, "end");
});

test("FW-3 a wrong tap is switched off and tried again; only the first tap decides what is recorded", () => {
  const r = sit([], (kind, i) => kind === "build" || i === 0);
  assert.deepEqual(r.done, { asked: 11, right: 7 });
  const steps = r.records.filter((x): x is Extract<FirstRecord, { type: "step" }> => x.type === "step");
  assert.deepEqual(steps.filter((x) => !x.correct).map((x) => x.kind), ["hear", "build", "build", "build"]);
  assert.ok(steps.filter((x) => !x.correct).every((x) => x.misses === 1));
});

test("FW-4 new words come first, a missed word returns, and every word is reached", () => {
  const first = sit([], (kind, i) => kind === "hear" && i === 1);
  const missed = first.seen[1].key;
  assert.ok(!pick(FIRST, first.records).some((w) => first.seen.slice(0, 4).map((x) => x.key).includes(w.id)), "the next sitting has four new words");
  let h = first.records;
  const met = new Set(first.seen.filter((x) => x.kind === "hear").map((x) => x.key));
  for (let k = 0; k < 20 && met.size < FIRST.words.length; k++) {
    const r = sit(h);
    r.seen.filter((x) => x.kind === "hear").forEach((x) => met.add(x.key));
    h = r.records;
  }
  assert.equal(met.size, FIRST.words.length, "every word is met");
  const heardAgain = h.filter((r) => r.type === "step" && r.kind === "hear" && r.key === missed).length;
  assert.equal(heardAgain, 2, "the missed word came back as soon as the new words ran out");
  assert.deepEqual(firstSummary(FIRST, h), { sittings: Math.ceil(FIRST.words.length / NEW_WORDS), met: FIRST.words.length, sure: FIRST.words.length, total: FIRST.words.length, sentences: true });
});

test("FW-5 a beginner is someone who passed no reading text and stands on the first listening level", () => {
  assert.equal(isBeginner({ reading: { passed: 0 }, listening: { level: 1 } }), true);
  assert.equal(isBeginner({ reading: { passed: 1 }, listening: { level: 1 } }), false);
  assert.equal(isBeginner({ reading: { passed: 0 }, listening: { level: 2 } }), false);
  assert.equal(isBeginner({ reading: null, listening: null }), false, "a skipped part proves nothing");
  // a reading text passed by luck does not hide a learner who knew no band of the word check
  assert.equal(isBeginner({ reading: { passed: 2 }, listening: { level: 1 }, words: { band: 0 } }), true);
  assert.equal(isBeginner({ reading: { passed: 2 }, listening: { level: 1 }, words: { band: 2 } }), false);
  assert.equal(isBeginner({ reading: { passed: 0 }, listening: { level: 3 }, words: { band: 0 } }), false, "hears and writes sentences: not a beginner");
});

test("FW-6 stored on the learner's record without touching the engine", async () => {
  const l = await Learner.create(loadContent({ mode: "development" }), new MemoryRepo(), "First", "guardian", testClock(), "p-first");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  await l.recordFirst(sit([]).records);
  assert.equal(l.firstRecords().length, 12);
  assert.equal(firstSummary(FIRST, l.firstRecords()).met, 4);
  assert.equal(picture(), before, "no capability estimate moves");
});

test("FW-7 action and describing words are said bare; a two-step direction needs both taps in the order said", () => {
  let h: FirstRecord[] = [];
  const says: string[] = [];
  for (let k = 0; k < 5; k++) {
    const r = sit(h);
    says.push(...r.seen.map((x) => x.say));
    h = r.records;
  }
  assert.ok(says.includes("Tap run."), "an action word has no \"the\"");
  assert.ok(says.some((x) => /^The word is \w+\. Build the word \w+\.$/.test(x)));
  const s = new FirstSitting(FIRST, []);
  for (let v = s.snapshot(); v.kind !== "two"; v = s.snapshot()) {
    if (v.kind === "build") for (const ch of W.get(v.key!)!.word) s.letter(s.snapshot().build!.tiles.findIndex((t) => t.letter === ch && !t.used));
    else for (const r of rightTaps(v)) s.tap(r);
    s.next();
  }
  const [first, second] = rightTaps(s.snapshot());
  assert.equal(s.tap(second), false, "the second thing first is a miss");
  assert.equal(s.snapshot().options.every((o) => !o.off), true, "nothing is switched off");
  assert.equal(s.tap(first), true);
  assert.equal(s.snapshot().options[first].picked, true);
  assert.equal(s.snapshot().phase, "ask");
  assert.equal(s.tap(second), true);
  assert.equal(s.snapshot().phase, "right");
});

/** Finish the step on screen by trying taps until one is right (misses are recorded, which these tests do not mind). */
function solve(s: FirstSitting): void {
  for (let guard = 0; s.snapshot().phase === "ask" && guard < 200; guard++) {
    const v = s.snapshot();
    const n = v.build ? v.build.tiles.length : v.place ? v.place.zones.length : v.options.length;
    for (let i = 0; i < n && s.snapshot().phase === "ask"; i++) (v.build ? s.letter(i) : s.tap(i));
  }
}

/** A learner who has found every word on the first tap, so First sentences have joined the sittings. */
const fluent = (): FirstRecord[] => [...FIRST.words.map((w) => ({ type: "step" as const, sitting: "f1", kind: "hear" as const, key: w.id, correct: true, misses: 0 })), { type: "end", sitting: "f1", asked: 82, right: 82 }];

test("FW-sentences 1 sentences join only after twenty words found on the first tap", () => {
  const few = fluent().slice(0, SENTENCES_AFTER - 1);
  assert.equal(firstSummary(FIRST, few).sentences, false);
  const s = new FirstSitting(FIRST, few);
  const kinds = new Set<string>();
  for (let v = s.snapshot(); v.phase !== "done"; v = s.snapshot()) (kinds.add(v.kind!), solve(s), s.next());
  assert.ok(!kinds.has("read") && !kinds.has("sentence"));
  assert.equal(firstSummary(FIRST, fluent()).sentences, true);
});

test("FW-sentences 2 read a sentence and tap its picture; it is said aloud only after a wrong tap", () => {
  const s = new FirstSitting(FIRST, fluent());
  let v = s.snapshot();
  const kinds: string[] = [];
  while (v.phase !== "done" && v.kind !== "read") (kinds.push(v.kind!), solve(s), s.next(), (v = s.snapshot()));
  assert.equal(v.kind, "read");
  assert.match(v.text!, /^(This is an? [a-z]+|I see (two|three|four) [a-z]+|I see an? [a-z]+ and an? [a-z]+|The [a-z]+ is (on|under|next to) the box|I can [a-z]+|I am [a-z]+)\.$/);
  assert.match(s.spoken()!, /^Read the sentence, then tap (its picture|where it is)\.$/, "the sentence is not read out before the learner tries");
  const n = v.place ? v.place.zones.length : v.options.length;
  const wrong = [...Array(n).keys()].findIndex((i) => !s.tap(i));
  assert.ok(wrong >= 0);
  assert.ok(s.spoken()!.startsWith(v.text!), "after a wrong tap the sentence is said");
});

test("FW-sentences 3 build a heard sentence from its words, with one word that does not belong", () => {
  const s = new FirstSitting(FIRST, fluent());
  let v = s.snapshot();
  while (v.phase !== "done" && v.kind !== "sentence") (solve(s), s.next(), (v = s.snapshot()));
  assert.equal(v.kind, "sentence");
  assert.ok(v.build!.words);
  const target = s.spoken()!.replace(/ Build the sentence\.$/, "").replace(/\.$/, "").split(" ");
  assert.equal(v.build!.tiles.length, target.length + 1);
  assert.notDeepEqual(v.build!.tiles.slice(0, target.length).map((t) => t.letter), target, "not already in order");
  for (const w of target) assert.ok(s.letter(v.build!.tiles.findIndex((t, i) => t.letter === w && !s.snapshot().build!.tiles[i].used)));
  v = s.snapshot();
  assert.equal(v.phase, "right");
  assert.equal(v.reveal!.text, `${target.join(" ")}.`);
});

test("FW-sentences 4 a sitting with sentences: eleven steps, two to read or three, two to build, all from words found before", () => {
  const known = FIRST.words.filter((w) => ["cat", "dog", "cow", "apple", "mango", "egg", "ball", "book", "bag", "run", "swim", "sleep", "happy", "sad", "hot", "star", "fish", "sun", "moon", "tree"].includes(w.id));
  const h: FirstRecord[] = known.map((w) => ({ type: "step", sitting: "f1", kind: "hear", key: w.id, correct: true, misses: 0 }));
  const s = new FirstSitting(FIRST, h);
  const steps: { kind: string; text?: string }[] = [];
  for (let v = s.snapshot(); v.phase !== "done"; v = s.snapshot()) (steps.push({ kind: v.kind!, text: v.text ?? undefined }), solve(s), s.next());
  assert.ok(steps.filter((x) => x.kind === "read").length >= 2);
  assert.equal(steps.filter((x) => x.kind === "sentence").length, 2);
  const words = new Set(known.map((w) => w.word));
  for (const r of s.take().filter((r) => r.type === "step" && (r.kind === "read" || r.kind === "sentence")) as Extract<FirstRecord, { type: "step" }>[]) {
    const content = r.key.replace(/\.$/, "").split(" ").map((w) => w.toLowerCase()).filter((w) => !["i", "see", "this", "is", "can", "am", "the", "a", "an", "and", "two", "three", "four", "on", "under", "next", "to"].includes(w)).map((w) => w.replace(/s$/, ""));
    for (const w of content) assert.ok(words.has(w) || words.has(`${w}s`), `${r.key}: ${w} was found before`);
  }
});

test("FW-sentences 5 never the same sentence to read and to build in a sitting, whatever the learner knows; places and pairs to read", () => {
  const kinds = new Set<string>();
  let places = 0;
  for (let n = SENTENCES_AFTER; n <= FIRST.words.length; n += 3) {
    for (const start of [0, 7, 19, 40]) {
      const ids = [...FIRST.words.slice(start), ...FIRST.words.slice(0, start)].slice(0, n).map((w) => w.id);
      const h: FirstRecord[] = ids.map((id) => ({ type: "step", sitting: "f1", kind: "hear", key: id, correct: true, misses: 0 }));
      const s = new FirstSitting(FIRST, h);
      const read: string[] = [];
      const built: string[] = [];
      for (let v = s.snapshot(); v.phase !== "done"; v = s.snapshot()) {
        if (v.kind === "read") (read.push(v.key!), v.place && places++, kinds.add(v.key!.split(" ").slice(0, 2).join(" ")));
        if (v.kind === "sentence") built.push(v.key!);
        solve(s);
        s.next();
      }
      if (!read.length) continue;
      assert.deepEqual(built.filter((b) => read.includes(b)), [], `${n} words from ${start}: ${read} / ${built}`);
      assert.equal(new Set(built).size, built.length);
      assert.equal(new Set(read).size, read.length);
    }
  }
  assert.ok(places > 0, "sentences with a place to read");
  assert.ok([...kinds].some((k) => k === "I see") , "pairs and counts");
});
