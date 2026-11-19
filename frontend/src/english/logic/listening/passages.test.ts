/**
 * Listen and answer: sound content, the passage kept off the screen until the answers are in, a sitting of one
 * passage, levels that move, passages that do not repeat until all are heard, and no effect on the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { LISTENING, ListenSitting, QUESTIONS, choices, levelFor, listenSummary, listeningProblems, pick, sentences, startLevel, type ListenRecord } from "./passages.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { syllabusFor } from "../syllabus/syllabus.ts";

test("LA-1 content: five passages at each of six levels, four questions each, the right choice in no favoured place", () => {
  assert.deepEqual(listeningProblems(LISTENING), []);
  const place = [0, 0, 0];
  for (const l of LISTENING.levels) assert.equal(LISTENING.passages.filter((p) => p.level === l.id).length, 5, `level ${l.id}`);
  for (const p of LISTENING.passages) {
    assert.equal(p.questions.length, QUESTIONS);
    assert.equal(sentences(p.text).join(" "), p.text, "read aloud sentence by sentence, nothing lost");
    assert.ok(sentences(p.text).every((s) => s.split(" ").length <= 40), "no sentence too long to speak in one go");
    for (const q of p.questions) {
      const c = choices(q);
      assert.equal(c.options[c.answer], q.right);
      place[c.answer]++;
    }
  }
  assert.equal(LISTENING.levels.length, 6);
  assert.deepEqual(place, [40, 40, 40]);
  // ICSE Class 7 LS1: a conversation, a speech and a poem, besides stories and factual passages
  for (const t of ["At the Ticket Window", "A Speech to the School", "When the Rain Comes (a poem)"]) assert.ok(LISTENING.passages.some((p) => p.title === t), t);
  // a passage that states facts about the world names what it was checked against
  const factual = (LISTENING.passages as unknown as { title: string; checked?: { against: string[] } }[]).filter((p) => ["How Honeybees Share News", "The Stepwell", "Salt from the Sea"].includes(p.title));
  assert.equal(factual.length, 3);
  for (const p of factual) assert.ok(p.checked && p.checked.against.length >= 1 && p.checked.against.every((x) => /https:\/\//.test(x)), p.title);
  const words = (lv: number) => LISTENING.passages.filter((p) => p.level === lv).reduce((n, p) => n + p.text.split(/\s+/).length, 0);
  assert.ok(words(1) < words(2) && words(2) < words(3), "passages get longer by level");
  const bad = { ...LISTENING, passages: [{ ...LISTENING.passages[0], level: 9, text: "Too short 1.", questions: [] }] };
  assert.match(listeningProblems(bad).join("\n"), /unknown level[\s\S]*words[\s\S]*numbers are written as words[\s\S]*needs 4 questions/);
});

/** Hear a passage and answer; `wrong` is how many of the four to get wrong. */
function sit(level: number, history: ListenRecord[], wrong = 0) {
  const s = new ListenSitting(LISTENING, level, history);
  const start = s.snapshot();
  const p = LISTENING.passages.find((x) => x.id === start.passage)!;
  assert.equal(start.phase, "listen");
  assert.ok(!JSON.stringify(start).includes(p.text.slice(0, 30)), "the passage is not on screen while listening");
  assert.equal(s.spoken().join(" "), p.text);
  s.answer(0);
  assert.equal(s.snapshot().phase, "listen", "no answers before the questions are opened");
  s.played();
  s.ready();
  for (let v = s.snapshot(), i = 0; v.phase === "ask"; v = s.snapshot(), i++) {
    assert.ok(!JSON.stringify(v).includes(p.text.slice(0, 30)) && !("answer" in v.question!), "nor during the questions, and no answer key");
    const c = choices(p.questions[i]);
    assert.deepEqual(v.question!.options, c.options);
    if (i === 1) s.played();
    s.answer(i < wrong ? (c.answer + 1) % 3 : c.answer);
  }
  const done = s.snapshot().done!;
  assert.equal(done.text, p.text, "shown once the answers are in");
  assert.equal(done.review.length, 4);
  assert.ok(done.review.every((r, i) => r.right === p.questions[i].right && r.explain === p.questions[i].explain && r.correct === i >= wrong));
  return { passage: p.id, done, records: [...history, ...s.take()] };
}

test("LA-2 a sitting: listen, four questions, then the passage with each answer explained; one record kept", () => {
  const r = sit(2, [], 1);
  assert.equal(r.done.right, 3);
  assert.equal(r.records.length, 1);
  const rec = r.records[0];
  assert.deepEqual([rec.level, rec.right, rec.plays, rec.answers.length, rec.answers.filter((a) => a.correct).length], [2, 3, 2, 4, 3]);
  const s = new ListenSitting(LISTENING, 2, []);
  s.ready();
  s.answer(7);
  assert.equal(s.snapshot().index, 0, "a choice that is not on screen is ignored");
});

test("LA-3 the level moves after four right or one right; passages do not repeat until all are heard", () => {
  assert.deepEqual([startLevel("early"), startLevel("school"), startLevel(null)], [1, 3, 3]);
  // a passage stored before the six-level scale is read on today's scale: old 2 is 4
  assert.equal(levelFor(LISTENING, [{ type: "result", passage: "lp2.1", level: 2, plays: 1, right: 2, answers: [] }], 1), 4);
  assert.deepEqual([sit(2, []).done.nextLevel, sit(2, [], 1).done.nextLevel, sit(2, [], 3).done.nextLevel, sit(6, []).done.nextLevel, sit(1, [], 4).done.nextLevel], [3, 2, 1, 6, 1]);
  let h: ListenRecord[] = [];
  const heard: string[] = [];
  for (let k = 0; k < 5; k++) {
    const r = sit(2, h, 1);
    heard.push(r.passage);
    h = r.records;
  }
  assert.equal(new Set(heard).size, 5, "all five before any repeat");
  // then one not yet heard from the level below, and only when those are heard too, the one heard longest ago
  const lower: string[] = [];
  let h2 = h;
  for (let k = 0; k < 5; k++) {
    const p = pick(LISTENING, 2, h2);
    assert.equal(p.level, 1);
    lower.push(p.id);
    h2 = [...h2, { type: "result", passage: p.id, level: 2, scale: 2, plays: 1, right: 3, answers: [] }];
  }
  assert.equal(new Set(lower).size, 5);
  assert.equal(pick(LISTENING, 2, h2).id, heard[0], "then the one heard longest ago");
  assert.equal(levelFor(LISTENING, h, 1), 2);
  const sum = listenSummary([...h, ...sit(2, [], 4).records.slice(-1)]);
  assert.deepEqual([sum.passages, sum.asked, sum.right], [6, 24, 15]);
  assert.ok(sum.weak.length >= 1);
});

test("LA-4 the syllabus lines on listening to a passage now lead here", () => {
  const where = (cls: number, id: string) => syllabusFor(cls).strands[0].outcomes.find((o) => o.id === id)!;
  assert.deepEqual([where(5, "LS3").where, where(5, "LS3").coverage, where(5, "LS4").coverage], ["listen", "covered", "covered"]);
  assert.deepEqual([where(6, "LS1").coverage, where(6, "LS2").coverage, where(4, "LS6").coverage], ["covered", "partly", "partly"]);
  assert.equal(where(5, "LS9").where, "passage", "dictation of a passage opens Listen and write with a passage");
});

test("LA-5 stored on the learner's record without touching the engine", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Ears", "guardian", clock, "p-ears");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  await l.recordListen(sit(2, []).records);
  const events = await repo.load("p-ears");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "session"));
  assert.equal(picture(), before);
  const again = await Learner.open(c, repo, "p-ears", clock);
  assert.equal(levelFor(LISTENING, again.listenRecords(), 2), 3);
  assert.match(String(eventProblem({ kind: "listen_passage", id: "x", at: clock(), record: {} })), /without its type/);
});
