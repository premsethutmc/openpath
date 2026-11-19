import test from "node:test";
import assert from "node:assert/strict";
import { BUILDS, FIRST, FirstSitting, NEW_WORDS, OPTIONS, firstProblems, firstSummary, isBeginner, pick, type FirstRecord } from "./first.ts";
import { loadContent } from "../content.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

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
    if (v.kind === "build") {
      const word = FIRST.words.find((w) => w.id === v.key)!.word;
      assert.equal(v.build!.tiles.length, word.length + 2);
      assert.notEqual(v.build!.tiles.slice(0, word.length).map((t) => t.letter).join(""), word, "the tiles are not laid out as the word");
      if (wrongFirst) assert.equal(s.letter(v.build!.tiles.findIndex((t) => t.letter !== word[0])), false);
      for (const ch of word) {
        const now = s.snapshot().build!;
        assert.equal(s.letter(now.tiles.findIndex((t) => t.letter === ch && !t.used)), true);
      }
    } else {
      const n = v.kind === "place" ? v.place!.zones.length : v.options.length;
      assert.equal(n, OPTIONS);
      const tried: boolean[] = [];
      // find the right choice by trying: on a copy when the first tap must be right
      const probe = new FirstSitting(FIRST, history);
      for (let k = 0; k < i; k++) (solve(probe), probe.next());
      const right = [0, 1, 2].find((c) => probe.tap(c))!;
      if (wrongFirst) {
        const wrong = [0, 1, 2].find((c) => c !== right)!;
        assert.equal(s.tap(wrong), false);
        const after = s.snapshot();
        assert.ok(v.kind === "place" ? after.place!.zones[wrong].off : after.options[wrong].off, "a wrong choice is switched off");
        assert.equal(s.tap(wrong), false, "and cannot be tapped again");
      }
      tried.push(s.tap(right));
      assert.deepEqual(tried, [true]);
    }
    const done = s.snapshot();
    assert.equal(done.phase, "right");
    assert.ok(done.reveal!.text.length > 0);
    s.next();
  }
  return { seen, done: s.snapshot().done!, records: [...history, ...s.take()] };
}
function solve(s: FirstSitting) {
  const v = s.snapshot();
  if (v.kind === "build") {
    const word = FIRST.words.find((w) => w.id === v.key)!.word;
    for (const ch of word) s.letter(s.snapshot().build!.tiles.findIndex((t) => t.letter === ch && !t.used));
  } else for (const c of [0, 1, 2]) if (s.tap(c)) break;
}

test("FW-1 content: short words, one picture each, enough of each group to choose between", () => {
  assert.deepEqual(firstProblems(FIRST), []);
  assert.ok(FIRST.words.length >= 60);
  const bad = { ...FIRST, words: [...FIRST.words, { id: "cat", word: "Cat!", picture: FIRST.words[1].picture, group: "solo" }] };
  assert.match(firstProblems(bad).join("\n"), /listed twice[\s\S]*small letters[\s\S]*used by another word[\s\S]*group needs/);
});

test("FW-2 a sitting: four new words heard, three of them built, and three things done by ear; ten steps", () => {
  const r = sit([]);
  assert.deepEqual(r.seen.map((x) => x.kind), ["hear", "hear", "hear", "hear", "count", "build", "build", "colour", "build", "place"]);
  assert.deepEqual(r.seen.slice(0, NEW_WORDS).map((x) => x.key), FIRST.words.slice(0, NEW_WORDS).map((w) => w.id));
  assert.equal(r.seen.filter((x) => x.kind === "build").length, BUILDS);
  assert.match(r.seen[0].say, /^Tap the \w+\.$/);
  assert.match(r.seen.find((x) => x.kind === "count")!.say, /^Tap (one|two|three|four|five) \w+\.$/);
  assert.match(r.seen.find((x) => x.kind === "place")!.say, /^Put the \w+ (on|next to|under) the box\.$/);
  assert.deepEqual(r.done, { asked: 10, right: 10 });
  assert.equal(r.records.filter((x) => x.type === "step").length, 10);
  assert.equal(r.records.at(-1)!.type, "end");
});

test("FW-3 a wrong tap is switched off and tried again; only the first tap decides what is recorded", () => {
  const r = sit([], (kind, i) => kind === "build" || i === 0);
  assert.deepEqual(r.done, { asked: 10, right: 6 });
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
  assert.deepEqual(firstSummary(FIRST, h), { sittings: Math.ceil(FIRST.words.length / NEW_WORDS), met: FIRST.words.length, sure: FIRST.words.length, total: FIRST.words.length });
});

test("FW-5 a beginner is someone who passed no reading text and stands on the first listening level", () => {
  assert.equal(isBeginner({ reading: { passed: 0 }, listening: { level: 1 } }), true);
  assert.equal(isBeginner({ reading: { passed: 1 }, listening: { level: 1 } }), false);
  assert.equal(isBeginner({ reading: { passed: 0 }, listening: { level: 2 } }), false);
  assert.equal(isBeginner({ reading: null, listening: null }), false, "a skipped part proves nothing");
});

test("FW-6 stored on the learner's record without touching the engine", async () => {
  const l = await Learner.create(loadContent({ mode: "development" }), new MemoryRepo(), "First", "guardian", testClock(), "p-first");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  await l.recordFirst(sit([]).records);
  assert.equal(l.firstRecords().length, 11);
  assert.equal(firstSummary(FIRST, l.firstRecords()).met, 4);
  assert.equal(picture(), before, "no capability estimate moves");
});
