import test from "node:test";
import assert from "node:assert/strict";
import { dueTopics, mastery, masterySummary, REVIEW_DAYS } from "./mastery.ts";
import { GRAMMAR, GrammarSitting, pick } from "./grammar-use.ts";
import type { GrammarRecord } from "./grammar-use.ts";

const DAY = 86_400_000;
const at = (d: number) => new Date(Date.UTC(2026, 0, 1) + d * DAY).toISOString();
const ans = (d: number, topic: string, correct: boolean, id = `${topic}.${d}.${Math.random()}`) => ({ at: at(d), record: { type: "answer", sitting: "s", id, level: 3, topic, correct, given: "" } as GrammarRecord });

test("GM-1 learning, then learnt with reviews after 3, 7 and 30 days, then mastered; a wrong review goes back to learning", () => {
  const t = [ans(0, "articles", true), ans(0, "articles", false), ans(0, "articles", true), ans(0, "articles", true)];
  let m = mastery(t)[0];
  assert.equal(m.stage, "learnt");
  assert.equal(m.due, at(REVIEW_DAYS[0]));
  // practice before the due day changes nothing
  t.push(ans(1, "articles", false));
  assert.equal(mastery(t)[0].due, at(3));
  t.push(ans(3, "articles", true));
  m = mastery(t)[0];
  assert.deepEqual([m.stage, m.passed, m.due], ["learnt", 1, at(3 + 7)]);
  t.push(ans(10, "articles", true), ans(40, "articles", true));
  m = mastery(t)[0];
  assert.deepEqual([m.stage, m.passed], ["mastered", 3]);
  // a wrong review on a mastered topic sends it back
  t.push(ans(130, "articles", false));
  m = mastery(t)[0];
  assert.deepEqual([m.stage, m.passed, m.due], ["learning", 0, at(131)]);
});

test("GM-2 due topics come first in a level sitting, one sentence each, a new one where there is one", () => {
  const t = [ans(0, "articles", true), ans(0, "articles", true), ans(0, "articles", true)];
  assert.deepEqual(dueTopics(t, at(2)), []);
  assert.deepEqual(dueTopics(t, at(3)), ["articles"]);
  const records = t.map((x) => x.record);
  const items = pick(GRAMMAR, 5, records, undefined, ["articles"]);
  assert.equal(items[0].topic, "articles");
  assert.equal(items.length, 8);
  assert.ok(!records.some((r) => r.type === "answer" && r.id === items[0].id), "a sentence not met before");
  const s = new GrammarSitting(GRAMMAR, 5, records, undefined, ["articles"]);
  assert.ok(s.snapshot().topic === "articles" || s.snapshot().phase === "learn");
  // a topic sitting is never given review places
  assert.ok(pick(GRAMMAR, 5, records, ["past"], ["articles"]).every((i) => i.topic === "past"));
  assert.deepEqual(masterySummary(t, at(3)), { mastered: 0, learnt: 1, learning: 0, due: 1 });
});
