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
