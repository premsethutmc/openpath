/**
 * Phase 6 (worker A): the three-fresh candidate's confirming answers are genuinely different problems (families.problemKeyOf) from
 * each other and from every teaching screen; the proportionate first-try policies cost a capable learner with a record nothing and
 * never add a sitting; phase-5 records still reproduce with the default ("old") answers. Synthetic learners only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { phasePool, problemKeyOf } from "../../../packages/learning/src/families";
import { presentedProblems } from "../../../packages/learning/src/skill-units";
import type { DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import { runDeep, structuredLearner } from "./deep-recovery-journey";
import { right } from "./learners";
import { SliceSession } from "./session";
import { simulate5 } from "../../../research/deep-recovery/tools/deep-recovery-sim5";
import { wrongShaped } from "./wrong-answers";

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const T0 = Date.parse("2026-11-06T09:00:00Z");
const BASE: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: 40, budget: 120, validDays: RETENTION_DAYS };

test("three-fresh: the three confirming goal answers are three different problems, none of them a teaching screen", () => {
  const s = new SliceSession("p6-three", OWN, T0);
  const L = structuredLearner({ "fam:aupfr": [PF], [PF]: [LS], [LS]: [L2V] }, [PF, LS, L2V]);
  const r = runDeep(s, ORIG, (q, c) => (L(q, c) === right(q) ? right(q) : wrongShaped(q)), { ...BASE, confirm: "three-fresh" });
  assert.equal(r.final!.phase, "solved_after_help");
  const goal = r.steps.filter((x) => x.kind === "ask" && x.skill === OWN);
  const last3 = goal.slice(-3);
  assert.ok(last3.every((x) => x.correct), "three right goal answers at the end");
  const keys = last3.map((x) => problemKeyOf(x.qid!));
  assert.equal(new Set(keys).size, 3, `distinct problems: ${keys}`);
  assert.ok(!keys.includes(problemKeyOf(ORIG)), "none is the original problem");
  const recs = s.state().records;
  const teaching = presentedProblems({ ...recs, attempts: [], unresolved: [], pending: [] }, (c) => moduleFor(c) ?? null);
  assert.ok(teaching.size > 0, "teaching screens were shown");
  assert.deepEqual(keys.filter((k) => teaching.has(k)), [], "no confirming problem was shown as a teaching example");
});

test("proportionate first try: a capable learner WITH a record pays nothing; without one, one more question in the same sitting", () => {
  const run = (history: boolean, firstTry: DeepRecoveryOptions["firstTry"]) => {
    const s = new SliceSession(`p6-prop-${history}-${firstTry}`, OWN, T0);
    if (history) { for (const q of phasePool("aupfr", "practice").filter((x) => !x.endsWith(":mc")).slice(0, 3)) s.submit(q, right(q), "practice"); s.wait(3); }
    const before = s.replies.length;
    const r = runDeep(s, ORIG, (q) => right(q), { ...BASE, firstTry });
    return { phase: r.final!.phase, questions: s.replies.length - before };
  };
  assert.deepEqual(run(true, "proportionate"), { phase: "solved", questions: 1 });
  assert.deepEqual(run(false, "proportionate"), { phase: "solved", questions: 2 });
  assert.deepEqual(run(false, "proportionate-space"), { phase: "solved", questions: 1 }, "an integral's typed answer space is not small");
  assert.deepEqual(run(true, "confirm"), { phase: "solved", questions: 2 });
});

test("proportionate-space: a right typed first try with a small whole-number answer is confirmed once (same sitting)", () => {
  const q = "gen:pow:2,3";
  assert.equal(String(question(q).answer).trim(), "8");
  const s = new SliceSession("p6-small", question(q).competency, T0);
  const r = runDeep(s, q, (x) => right(x), { ...BASE, firstTry: "proportionate-space" });
  assert.equal(r.final!.phase, "solved");
  assert.equal(s.replies.length, 2);
  assert.equal(r.final!.phase === "solved" && s.state().records.attempts.length, 2);
});

test("old answers by default: a phase-5 held-out record reproduces exactly", () => {
  const rows = readFileSync(new URL("../../../research/deep-recovery/results/phase5-confidence/heldout-seeds-6001-6030-at-9dfa0b03.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const r of rows.filter((x) => x.seed === 6001 && x.orig === "O1" && x.type === "strong-slips" && ["selective", "three-fresh"].includes(x.rule))) {
    const x = simulate5(r.rule, r.orig, r.type, r.seed) as Record<string, unknown>;
    delete x.ms; delete r.ms;
    assert.deepEqual(x, r);
  }
});
