/**
 * Walkthrough finding (PR #105, 4919cc15): a learner stuck on "Find missing operands" (MATH.algebra.missing-number) was sent
 * to "Extend additive number patterns" (a calendar-pattern question) as its support: an unaudited sequence-order edge of
 * graph 1.1.0. The relation audit (1.1.1) disputes it and competency-additions (1.1.1) adds the real supports; the skill's questions undo adding, taking away and multiplying (acmissing, acfacts), so
 * the skills they use are addition and subtraction within 20 and multiplication facts. Synthetic learners only; the
 * engine chooses what to ask and what to teach.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { graph, walkSupports } from "../../../packages/learning/src/graph";
import { runScenario } from "./scenarios";
import { misconception, right, wrong, type Learner } from "./learners";
import { problemOf } from "../../../packages/learning/src/families";

const MISS = "MATH.algebra.missing-number";
const USED = ["MATH.number.addition", "MATH.number.subtraction", "MATH.number.multiplication-tables"];
const PATTERNS = ["MATH.algebra.number-patterns", "MATH.algebra.repeating-patterns"];
const taught = (r: ReturnType<typeof runScenario>) => (r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string }[]);

test("recovery from Find missing operands follows the operations its questions undo, not number patterns", () => {
  const followed = walkSupports(MISS, 1).map((s) => s.id);
  for (const u of USED) assert.ok(followed.includes(u), `${u} is followed: ${followed}`);
  for (const p of PATTERNS) assert.ok(!walkSupports(MISS, 3).some((s) => s.id === p), `${p} is not followed`);
  // the mandatory graph and the frozen inventory are unchanged: the edge is disputed by the audit, not deleted
  assert.ok(graph.prerequisitesOf(MISS).includes("MATH.algebra.number-patterns"));
  // the audit's own view without it still has the old edge (records and replay of graph 1.1.0 keep their meaning)
  assert.ok(walkSupports(MISS, 1, { audit: false }).some((s) => s.id === "MATH.algebra.number-patterns"));
});

test("an unrecognised mistake on a missing number: any support taught is an operation fact, never a pattern", () => {
  const unrecognised: Learner = { name: "unrecognised", act: (v) => ({ answer: v.taught === 0 ? wrong(v.q) : right(v.q) }) };
  const r = runScenario({ id: "miss-support-unrecognised", category: 2, start: "gen:acmissing:3,3,10", expect: {}, learner: () => unrecognised });
  const t = taught(r);
  assert.ok(t.length >= 1, "something was taught");
  for (const x of t) assert.ok([MISS, ...USED].includes(x.competency), `taught ${x.competency} · ${x.strategy}`);
});

test("a recognised missing-number mistake is taught on the missing-number skill itself", () => {
  const bugs = new Set(["added-both", "took-away-again", "took-away"]);
  const L: Learner = { name: "recognised", act: (v) => ({ answer: v.taught === 0 && problemOf(v.q.replace(/:(mc|w)$/, ""))?.family === "acmissing" ? (misconception(v.q, bugs) ?? right(v.q)) : right(v.q) }) };
  const r = runScenario({ id: "miss-support-recognised", category: 2, start: "gen:acmissing:0,8,7", expect: {}, learner: () => L });
  const t = taught(r);
  assert.ok(t.length >= 1 && t[0].competency === MISS, JSON.stringify(t));
});

/**
 * Walkthrough a2 (PR #105 9be50269, CBSE Grade 4 · Maths Mela · 7.7 The Missing Digits), replayed exactly: the 14 answers
 * the app recorded (question, answer, activity, context), then the app's own next steps. On 9be50269 the lesson for the
 * learner's current form (10 × □: "The box was multiplied") was introduced with the open added-both claim seen on 23 − □,
 * and right after it the skill paused ("Every explanation here has been tried") with no answer after the lesson.
 * claim-teaching@1: a lesson that does not address the open claim neither names it nor counts as its teaching.
 */
import { SliceSession } from "./session";
import { releasesFor } from "../../../packages/learning/src/curricula";
import { assigned } from "../../../packages/learning/src/curriculum";
import { make } from "../../../packages/learning/src/session";
import { question } from "../../../packages/learning/src/content";
const A2: [string, string, "diagnostic" | "practice" | "original", string?][] = [
  ["gen:acmissing:3,3,10", "20", "diagnostic"], ["gen:acmissing:3,3,9", "18", "diagnostic"],
  ["gen:acmissing:2,15,14", "15", "diagnostic", "investigate:gen:acmissing:3,3,10"], ["gen:acmissing:2,11,3", "5", "diagnostic", "investigate:gen:acmissing:3,3,10"],
  ["gen:acmissing:2,18,17", "18", "diagnostic", "investigate:gen:acmissing:3,3,10"], ["gen:acmissing:1,3,20", "43", "practice"],
  ["gen:acmissing:0,10,4", "18", "diagnostic", "investigate:gen:acmissing:1,3,20"],
  ["mt-d1", "56", "diagnostic"], ["mt-d2", "42", "diagnostic"], ["gen:abgroup:7,6", "42", "diagnostic"], ["gen:abgroup:4,3", "12", "diagnostic"],
  ["gen:aaadd:4,13", "17", "diagnostic"], ["gen:aaadd:5,1", "6", "diagnostic"], ["gen:acmissing:3,3,10", "20", "original", "recovery:gen:acmissing:3,3,10"],
];
test("walkthrough a2 replayed: the lesson's introduction fits it, and a question follows the lesson instead of an immediate pause", () => {
  const L = new SliceSession("walk-a2", MISS, Date.parse("2026-11-03T09:00:00Z"));
  const release = releasesFor(4).filter((r) => /^cbse-/.test(r.id)).find((r) => assigned(r).some((x) => x.competency === MISS))!;
  L.events.push(make.enrol({ learnerId: L.learnerId, sessionId: L.session, at: new Date(L.now).toISOString() }, 4, "2026-27", release));
  for (const [qid, answer, activity, context] of A2) L.submit(qid, answer, activity as never, context ? { context } : {});
  // the open claim is added-both on 23 − □; the learner's latest wrong answer is on 10 × □
  const recov = L.recover("gen:acmissing:3,3,10");
  assert.equal(recov.phase, "teach", recov.reason);
  // the skill's own lesson, as the app's Module shows it inside a recovery
  const lesson = L.next(MISS, { inRecovery: true });
  assert.equal(lesson.phase, "chapter", lesson.reason);
  assert.equal(lesson.strategy!.id, "k_times_box");
  assert.doesNotMatch(lesson.reason, /were added|23 − 20/, "the introduction does not describe another operation's mistake");
  L.taught(lesson);
  // straight after the lesson: no pause; the learner is given something to answer
  const next = L.next(MISS);
  assert.notEqual(next.phase, "pause", next.reason);
  // the learner carries on (right answers) to a right answer on their own after the lesson
  let alone = false;
  for (let i = 0; i < 8 && !alone; i++) {
    const r = L.recover("gen:acmissing:3,3,10");
    const ms = r.phase === "teach" || r.phase === "support" ? L.next(r.active ?? MISS, { inRecovery: true }) : L.next(MISS);
    if (ms.phase === "chapter") { L.taught(ms); continue; }
    assert.notEqual(ms.phase, "pause", ms.reason);
    const qid = ms.question ?? (r.phase === "attempt" || r.phase === "return" ? "gen:acmissing:3,3,10" : null);
    assert.ok(qid, `${ms.phase}: ${ms.reason}`);
    L.submit(qid!, question(qid!).answer, (ms.activity ?? "practice") as never, ms.context ? { context: ms.context } : {});
    alone = (ms.activity ?? "practice") !== "guided" && L.replies.at(-1)!.credit === true;
  }
  assert.ok(alone, "a right answer on their own after the lesson");
});
