/** mixed-practice@1: interleaving earlier skills into practice (packages/learning/src/mixed-practice.ts). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor } from "../../../packages/learning/src/content";
import { DAY } from "../../../packages/learning/src/evidence";
import { FAMILIES } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { fromPool } from "../../../packages/learning/src/intervention";
import { MIX_EVERY, mixedPracticeItem, runOn } from "../../../packages/learning/src/mixed-practice";
import type { LearnerRecords } from "../../../packages/learning/src/records";

const T0 = Date.parse("2026-11-01T09:00:00Z");
const answer = (questionId: string, competency: string, right: boolean, at: number, session: string) => ({ id: `a${at}${questionId}`, at: new Date(at).toISOString(), session, questionId, response: "", activity: "practice", hints: 0, solution: false, competency, n: 1, credit: right });
const records = (attempts: unknown[]) => ({ attempts, teaching: [], enrolments: [], sessions: {}, goals: new Map(), curricula: new Map(), skips: [], understanding: [], pending: [], unresolved: [] }) as unknown as LearnerRecords;

// two skills, each with its own module and a pool of practice questions
const empty = records([]);
const skills: { skill: string; qs: string[] }[] = [];
for (const f of FAMILIES.values()) {
  const skill = graph.evidenceTarget(f.competency), m = moduleFor(skill);
  if (!m || skills.some((s) => s.skill === skill) || !fromPool(m, "practice", empty)) continue;
  const qs: string[] = [];
  let r = empty;
  for (let i = 0; i < 6; i++) { const q = fromPool(m, "practice", r); if (!q) break; qs.push(q); r = records(qs.map((x, k) => answer(x, skill, true, T0 + k, "old"))); }
  if (qs.length >= 6) skills.push({ skill, qs });
  if (skills.length === 2) break;
}
const [A, B] = skills;
// A shown on earlier days; B practised today
const earlier = A.qs.slice(0, 4).map((q, i) => answer(q, A.skill, true, T0 + i * 2 * DAY, `old${i}`));
const today = (n: number) => B.qs.slice(0, n).map((q, i) => answer(q, B.skill, true, T0 + 20 * DAY + i * 60_000, "s"));
const now = T0 + 20 * DAY + DAY / 2;

test("two skills with practice pools were found", () => assert.ok(A && B && A.skill !== B.skill));

test("nothing is mixed in before MIX_EVERY answers on the current skill in this sitting", () => {
  for (let n = 0; n < MIX_EVERY; n++) assert.equal(mixedPracticeItem(B.skill, records([...earlier, ...today(n)]), now, "s"), null);
});

test(`after ${MIX_EVERY} answers, a fresh question from the skill shown earlier is mixed in`, () => {
  const r = records([...earlier, ...today(MIX_EVERY)]);
  const item = mixedPracticeItem(B.skill, r, now, "s");
  assert.ok(item);
  assert.equal(item!.competency, A.skill);
  assert.ok(!r.attempts.some((a) => a.questionId === item!.question), "never a question already answered");
});

test("answering the mixed question starts the run again; other sittings do not count", () => {
  const r = records([...earlier, ...today(MIX_EVERY)]);
  const item = mixedPracticeItem(B.skill, r, now, "s")!;
  const after = records([...r.attempts, answer(item.question, A.skill, true, now, "s")]);
  assert.equal(runOn(B.skill, after, "s"), 0);
  assert.equal(mixedPracticeItem(B.skill, after, now, "s"), null);
  assert.equal(runOn(B.skill, records([...earlier, ...today(MIX_EVERY)]), "other"), 0);
});

test("a skill never shown (only wrong answers) is not mixed in", () => {
  const weak = A.qs.slice(0, 4).map((q, i) => answer(q, A.skill, false, T0 + i * 2 * DAY, `old${i}`));
  assert.equal(mixedPracticeItem(B.skill, records([...weak, ...today(MIX_EVERY)]), now, "s"), null);
});
