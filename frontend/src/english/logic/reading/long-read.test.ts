/** Long reads: three parts and the whole, one part a sitting, going on from where the learner stopped. */
import test from "node:test";
import assert from "node:assert/strict";
import { LONG, LongSitting, PARTS, choices, longProblems, longLevel, longStart, longSummary, nextStep, type LongRecord } from "./long-read.ts";
import { LABEL_OWN, type ReadingRecord } from "./session.ts";
import { loadContent } from "../content.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { eventProblem } from "../events.ts";

function sit(text: (typeof LONG.texts)[number], part: number, right: (i: number) => boolean = () => true) {
  const s = new LongSitting(text, part);
  assert.equal(s.snapshot().phase, "read");
  assert.ok(s.snapshot().text.length > (text.level === 1 ? 150 : text.level <= 3 ? 200 : 300));
  s.read();
  for (let v = s.snapshot(); v.phase === "ask"; v = s.snapshot()) {
    const c = choices(s.questions[v.index], `${text.id}|${part}|${v.index}`);
    s.answer(right(v.index) ? c.answer : (c.answer + 1) % 3);
    const a = s.snapshot();
    assert.equal(a.phase, "answered");
    assert.ok(a.answered!.explain.length > 10, "every answer shows why");
    s.next();
  }
  assert.equal(s.snapshot().phase, "done");
  return s.take();
}

test("LR-1 content: seventeen stories on seventeen themes at levels one to six, three parts, questions on theme, character and title", () => {
  assert.deepEqual(longProblems(LONG), []);
  assert.equal(LONG.texts.length, 33);
  assert.equal(new Set(LONG.texts.map((t) => t.theme)).size, 33);
  assert.deepEqual([...new Set(LONG.texts.map((t) => t.level))].sort(), [1, 2, 3, 4, 5, 6]);
  // a weak reader starts on a story at their own level, not a level 4 one
  assert.equal(nextStep(LONG, [], 1)!.text.level, 1);
  assert.equal(nextStep(LONG, [], 2)!.text.level, 2);
  // the right answer is not always in the same place
  const place = [0, 0, 0];
  for (const t of LONG.texts) [...t.parts.flatMap((p, k) => p.questions.map((q, i) => choices(q, `${t.id}|${k}|${i}`))), ...t.whole.map((q, i) => choices(q, `${t.id}|${PARTS}|${i}`))].forEach((c) => place[c.answer]++);
  assert.ok(Math.min(...place) >= 24, `places: ${place}`);
  const bad = { ...LONG, texts: [{ ...LONG.texts[0], whole: LONG.texts[0].whole.slice(0, 2) }] };
  assert.match(longProblems(bad).join(" "), /no question on the title/);
});

test("LR-2 one part a sitting, then the next part, then the whole; a new story near the reading level", () => {
  let h: LongRecord[] = [];
  const first = nextStep(LONG, h, 5)!;
  assert.equal(first.text.level, 5);
  assert.equal(first.part, 0);
  for (let k = 0; k <= PARTS; k++) {
    const step = nextStep(LONG, h, 5)!;
    assert.deepEqual([step.text.id, step.part], [first.text.id, k], "goes on from where the learner stopped");
    h = [...h, ...sit(step.text, step.part, (i) => i > 0)];
  }
  const after = nextStep(LONG, h, 5)!;
  assert.notEqual(after.text.id, first.text.id);
  assert.deepEqual([after.text.level, after.part], [5, 0]);
  const sum = longSummary(h);
  assert.deepEqual([sum.finished, sum.parts, sum.asked, sum.right], [1, 3, 9, 5]);
  // an unfinished sitting leaves no record
  const s = new LongSitting(first.text, 0);
  s.read();
  assert.deepEqual(s.take(), []);
  // the questions on the whole show the whole story to look back at
  const whole = new LongSitting(first.text, PARTS).snapshot();
  assert.ok(whole.text.includes(first.text.parts[2].text.slice(0, 40)) && whole.text.includes(first.text.parts[0].text.slice(0, 40)));
  // every story read: nothing left
  let all: LongRecord[] = [];
  for (const t of LONG.texts) for (let k = 0; k <= PARTS; k++) all = [...all, ...sit(t, k)];
  // every story read: one at the reader's level is read again from the start, never nothing
  const again = nextStep(LONG, all, 4)!;
  assert.deepEqual([again.text.level, again.part], [4, 0]);
  const twice = nextStep(LONG, [...all, ...[0, 1, 2, 3].flatMap((k) => sit(again.text, k))], 4)!;
  assert.notEqual(twice.text.id, again.text.id, "the story read fewest times comes first");
});

test("LR-4 a weak reader is never given a story more than a level up, and moves up as stories go well", () => {
  const easy = LONG.texts.filter((t) => t.level <= 2);
  let recs: LongRecord[] = [];
  for (const t of easy) for (let k = 0; k <= PARTS; k++) recs = [...recs, ...sit(t, k)];
  // all the easy stories read, but badly: stays at level 1 and reads again rather than a level 4 story
  const bad = recs.map((r) => ({ ...r, answers: r.answers.map((a) => ({ ...a, correct: false })) }));
  assert.equal(longLevel(LONG, bad, 1), 1);
  assert.ok(nextStep(LONG, bad, 1)!.text.level <= 2);
  // read well: two stories at the level or above move the reader up one level
  const good = recs.map((r) => ({ ...r, answers: r.answers.map((a) => ({ ...a, correct: true })) }));
  assert.ok(longLevel(LONG, good, 1) >= 2);
  assert.equal(longLevel(LONG, [], 1), 1);
});

test("LR-3 stored on the learner's record without touching the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Reader", "guardian", clock, "p-long");
  const before = JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const t = LONG.texts[0];
  await l.recordLong(sit(t, 0));
  for (const e of await repo.load("p-long")) assert.equal(eventProblem(e), null);
  assert.equal(JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence])), before);
  // a report that a question looks wrong: which question and a reason, nothing typed
  await l.flagContent("long", `${t.id}|0|0`, "marked_wrong");
  const flags = (await repo.load("p-long")).filter((e) => e.kind === "flag");
  assert.deepEqual(flags.map((e) => [(e as { item: { id: string } }).item.id, (e as { note: string }).note]), [[`long:${t.id}|0|0`, "marked_wrong"]]);
  for (const e of await repo.load("p-long")) assert.equal(eventProblem(e), null);
  const again = await Learner.open(c, repo, "p-long", clock);
  assert.equal(nextStep(LONG, again.longRecords(), 4)!.part, 1);
});

test("LR-5 long reads start at the level check, or higher when the Reading lessons have been passed higher", () => {
  assert.equal(longStart(undefined, []), 3);
  assert.equal(longStart(1, []), 1);
  const pass = (level: number) => ({ type: "check_result", unit: { skill: "detail", level }, answers: [], passed: true, label: LABEL_OWN }) as ReadingRecord;
  assert.equal(longStart(1, [pass(2), pass(4)]), 4);
  assert.equal(longStart(5, [pass(2)]), 5);
  // no level check: a Class 1 or 2 child starts at their class, older children at 3
  assert.deepEqual([longStart(undefined, [], 1), longStart(undefined, [], 2), longStart(undefined, [], 8)], [1, 2, 3]);
});
