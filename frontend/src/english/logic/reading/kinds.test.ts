import test from "node:test";
import assert from "node:assert/strict";
import { KINDS, KIND_LEVELS, KindSitting, kindChoices, kindsProblems, kindsSummary, nextKind, type KindRecord } from "./kinds.ts";
import { loadContent } from "../content.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";
import { eventProblem } from "../events.ts";

test("KT-1 content: every level 1 to 7 has a poem and four other kinds; the new skills are all asked; answers are not given away", () => {
  assert.deepEqual(kindsProblems(KINDS), []);
  for (let l = 1; l <= KIND_LEVELS; l++) {
    const at = KINDS.texts.filter((t) => t.level === l);
    assert.ok(at.length >= 5, `level ${l}: ${at.length} texts`);
    assert.ok(at.some((t) => t.kind === "poem"), `level ${l} has a poem`);
    assert.ok(new Set(at.map((t) => t.kind)).size >= 4, `level ${l} has four kinds`);
  }
  const skills = new Set(KINDS.texts.flatMap((t) => t.questions.map((q) => q.skill)));
  for (const s of ["word_meaning", "purpose", "point_of_view", "figurative", "structure", "compare", "summary"]) assert.ok(skills.has(s as never), s);
  // the right answer is spread over the three places
  const place = [0, 0, 0];
  for (const t of KINDS.texts) t.questions.forEach((q, i) => place[kindChoices(q, `${t.id}|${i}`).answer]++);
  assert.ok(Math.min(...place) >= 35, `places: ${place}`);
  // texts grow longer with the level
  const words = (l: number) => KINDS.texts.filter((t) => t.level === l).reduce((a, t) => a + t.text.split(/\s+/).length, 0) / KINDS.texts.filter((t) => t.level === l).length;
  for (let l = 2; l <= KIND_LEVELS; l++) assert.ok(words(l) > words(l - 1), `level ${l} longer than ${l - 1}`);
  const bad = { ...KINDS, texts: [{ ...KINDS.texts[0], questions: KINDS.texts[0].questions.map((q) => ({ ...q, right: q.right + " and much much more besides that" })) }] };
  assert.match(kindsProblems(bad).join(" "), /much the longest/);
});

test("KT-2 next text: at the learner's level, a new kind first; up a level after two strong texts; never the same text twice", () => {
  const first = nextKind(KINDS, [], 3)!;
  assert.equal(first.level, 3);
  const rec = (id: string, right: number, n = 4): KindRecord => ({ type: "text", text: id, answers: Array.from({ length: n }, (_, i) => ({ skill: "detail" as const, correct: i < right })) });
  const second = nextKind(KINDS, [rec(first.id, 2)], 3)!;
  assert.equal(second.level, 3);
  assert.notEqual(second.kind, first.kind, "a kind not met yet");
  assert.equal(nextKind(KINDS, [rec(first.id, 4), rec(second.id, 4)], 3)!.level, 4, "two strong texts: one level up");
  assert.equal(nextKind(KINDS, [rec(first.id, 1), rec(second.id, 1)], 3)!.level, 2, "two weak texts: one level down");
  // reading on and on: no text twice, never more than one level away, and nothing left once the near levels are read
  const seen: string[] = [];
  for (let t = nextKind(KINDS, [], 1); t; t = nextKind(KINDS, seen.map((id) => rec(id, 2)), 1)) {
    assert.ok(!seen.includes(t.id));
    assert.ok(t.level <= 2);
    seen.push(t.id);
  }
  assert.equal(seen.length, KINDS.texts.filter((t) => t.level <= 2).length);
});

test("KT-3 a sitting: read, answer each question, see why; stored as a text_read event without touching the engine", async () => {
  const text = KINDS.texts.find((t) => t.id === "kt4.pair")!;
  const s = new KindSitting(text);
  assert.equal(s.snapshot().phase, "read");
  s.read();
  for (let i = 0; i < text.questions.length; i++) {
    const v = s.snapshot();
    assert.equal(v.phase, "ask");
    const answer = kindChoices(text.questions[i], `${text.id}|${i}`).answer;
    s.answer(i === 0 ? (answer + 1) % 3 : answer);
    assert.equal(s.snapshot().answered!.correct, i !== 0);
    assert.ok(s.snapshot().answered!.explain);
    s.next();
  }
  assert.equal(s.snapshot().phase, "done");
  assert.equal(s.snapshot().right, text.questions.length - 1);
  const records = s.take();
  assert.equal(records.length, 1);
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const learner = await Learner.create(c, repo, "Reader", "guardian", clock, "p-kinds");
  const before = JSON.stringify(learner.profile().capabilities.map((x) => [x.standing, x.evidence]));
  await learner.recordKind(records);
  for (const e of await repo.load("p-kinds")) assert.equal(eventProblem(e), null);
  assert.equal(JSON.stringify(learner.profile().capabilities.map((x) => [x.standing, x.evidence])), before);
  const again = await Learner.open(c, repo, "p-kinds", clock);
  assert.equal(again.kindRecords().length, 1);
  assert.notEqual(nextKind(KINDS, again.kindRecords(), 4)!.id, text.id);
  const sum = kindsSummary(again.kindRecords());
  assert.deepEqual([sum.texts, sum.right, sum.asked], [1, text.questions.length - 1, text.questions.length]);
});
