/**
 * deep-recovery@0 phase 5 (confidence): the new confirmation options are off by default (phase-4 records reproduce exactly),
 * the interim "provisional" status is honest and resumes in a later sitting, different-form asks for the other format, the
 * educator/teaching gates are unchanged, and lucky guessing is NOT eliminated (kept visible). Synthetic learners only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { question } from "../../../packages/learning/src/content";
import { deepRecovery, type DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import { RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { problemKeyOf } from "../../../packages/learning/src/families";
import { runDeep, structuredLearner, type Answerer } from "./deep-recovery-journey";
import { right, wrong } from "./learners";
import { SliceSession } from "./session";
import { simulate4 } from "../../../research/deep-recovery/tools/deep-recovery-sim4";
import { usePrerequisiteAfterOwn, useUnteachableFixture } from "../../../packages/learning/src/intervention";
// The deep-recovery research prototype is defined over the earlier stop ("#115's stop": every explanation tried, then a person),
// so these tests run with prereq-after-own@1 off, and with integers as the skill that has no teachable lesson (a fixture now
// that the real integers lesson is repaired).
usePrerequisiteAfterOwn(false);
useUnteachableFixture(["MATH.number.integers"]);

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const BASE: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: 40, budget: 120, validDays: RETENTION_DAYS };
const slipOnce: Answerer = (q, c) => (c.answered === 0 ? wrong(q) : right(q));
const isChoice = (q: string) => q.endsWith(":mc") || !!question(q.replace(/:(mc|w)$/, "")).options?.length;

test("defaults unchanged: phase-4 held-out records reproduce exactly with the phase-5 code", () => {
  const rows = readFileSync(new URL("../../../research/deep-recovery/results/phase4/heldout2-seeds-4001-4030-at-588bd839.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const pick = rows.filter((r) => r.seed === 4001 && ["typed-guesser", "strong-slips"].includes(r.type));
  assert.ok(pick.length >= 4);
  for (const r of pick) { const x = simulate4(r.engine, r.orig, r.type, r.seed) as Record<string, unknown>; delete x.ms; delete r.ms; assert.deepEqual(x, r, `${r.engine} ${r.orig} ${r.type}`); }
});

test("delayed-replace: right today ends the sitting 'provisional' (honest, nothing claimed); a fresh check next sitting confirms", () => {
  const s = new SliceSession("p5-delay", OWN, T0);
  const a = runDeep(s, ORIG, slipOnce, { ...BASE, delayed: "replace" }).final!;
  assert.equal(a.phase, "provisional");
  assert.match(a.reason, /Right on your own today/);
  assert.match(a.reason, /before calling this solved/);
  assert.deepEqual(a.next, { phase: "goal", active: OWN });
  s.wait(1);
  const keysBefore = new Set(s.state().records.attempts.map((x) => problemKeyOf(x.questionId)));
  const b = runDeep(s, ORIG, slipOnce, { ...BASE, delayed: "replace" });
  assert.equal(b.final!.phase, "solved");
  const asked = b.steps.filter((x) => x.kind === "ask");
  assert.equal(asked.length, 1, "one fresh goal question in the later sitting");
  assert.ok(!keysBefore.has(problemKeyOf(asked[0].qid!)), "a fresh problem, not one seen before");
  assert.match(asked[0].decision!.why, /promised last time/);
});

test("delayed: a wrong answer at the later check withdraws the provisional status (no claim)", () => {
  const s = new SliceSession("p5-delay-wrong", OWN, T0);
  runDeep(s, ORIG, slipOnce, { ...BASE, delayed: "replace" });
  s.wait(1);
  let n = 0;
  const forgot: Answerer = (q) => (n++ === 0 ? wrong(q) : right(q));
  const b = runDeep(s, ORIG, forgot, { ...BASE, delayed: "replace", stopAfter: s.replies.length + 1 });
  assert.equal(b.steps.filter((x) => x.kind === "ask")[0].correct, false);
  const st = s.state();
  const d = deepRecovery(ORIG, st.records, st.evidence, s.now, s.session, { ...BASE, delayed: "replace" });
  assert.ok(!["solved", "solved_after_help", "provisional"].includes(d.phase), d.phase);
});

test("delayed-first: a right first try waits for a later-sitting check before 'solved'", () => {
  const s = new SliceSession("p5-first", OWN, T0);
  const typed = ORIG; // a typed item
  assert.ok(!isChoice(typed));
  const a = runDeep(s, typed, (q) => right(q), { ...BASE, delayed: "replace", firstTry: "provisional" }).final!;
  assert.equal(a.phase, "provisional");
  assert.equal(s.replies.length, 1);
  s.wait(1);
  const b = runDeep(s, typed, (q) => right(q), { ...BASE, delayed: "replace", firstTry: "provisional" }).final!;
  assert.equal(b.phase, "solved");
  assert.equal(s.replies.length, 2);
});

test("different-form: after a typed right, the confirming goal question is picked from options when one exists", () => {
  const s = new SliceSession("p5-form", OWN, T0);
  const r = runDeep(s, ORIG, slipOnce, { ...BASE, confirm: "different-form" });
  assert.equal(r.final!.phase, "solved");
  const goal = r.steps.filter((x) => x.kind === "ask" && x.skill === OWN).slice(1);
  assert.deepEqual(goal.map((x) => isChoice(x.qid!)), [false, true]);
});

test("gates unchanged: missing content still ends 'blocked' under every new rule; nothing is taught over it", () => {
  const PF = P + "algebra.partial-fractions", FACT = P + "algebra.factorisation", IADD = P + "number.integer-add", INTS = P + "number.integers";
  for (const o of [{ delayed: "add" }, { delayed: "replace", firstTry: "provisional" }, { confirm: "three-fresh" }, { confirm: "different-form" }] as DeepRecoveryOptions[]) {
    const s = new SliceSession(`p5-gate-${JSON.stringify(o)}`, OWN, T0);
    const r = runDeep(s, ORIG, structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IADD], [IADD]: [INTS] }, [PF, FACT, IADD, INTS]), { ...BASE, ...o });
    assert.equal(r.final!.phase, "blocked", JSON.stringify(o));
    assert.equal(r.final!.blocked!.skill, INTS);
    assert.equal(r.steps.filter((x) => x.kind === "teach").length, 0);
  }
});

test("KNOWN LIMITATION (kept visible): a learner lucky on every goal answer is still called solved under the strictest rule tested", () => {
  let n = 0;
  const lucky: Answerer = (q) => (n++ === 0 ? wrong(q) : right(q)); // cannot do it, guesses every goal question right
  const s = new SliceSession("p5-lucky", OWN, T0);
  runDeep(s, ORIG, lucky, { ...BASE, delayed: "add" });
  s.wait(1);
  const b = runDeep(s, ORIG, lucky, { ...BASE, delayed: "add" }).final!;
  assert.equal(b.phase, "solved", "no rule tested can tell a long enough lucky streak from knowledge");
});
