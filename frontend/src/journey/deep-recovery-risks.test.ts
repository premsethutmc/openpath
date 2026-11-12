/**
 * deep-recovery@0 risk tests (owner, phase 2). Each builds the learner's records through the real SliceSession (real grader,
 * records and evidence) and asks the prototype what it decides next. Synthetic learners only.
 *   R1 an easier or unrelated right answer in the same topic is not the original skill solved
 *   R2 an answer given with help, after a shown solution, or on a second try is never called independent
 *   R3 teaching in another skill or recovery episode neither resets this diagnosis nor counts as help for this goal
 *   R4 no fresh question that tests the original skill: stop honestly, never substitute another one
 *   R5 after an interruption and unrelated work, the saved recovery resumes without mixing that work's evidence in
 *   R6 the effort limit counts teaching and the module's practice, not only the prototype's own probes
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { deepRecovery, type DeepRecoveryState } from "../../../packages/learning/src/deep-recovery";
import { problemOf } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { make } from "../../../packages/learning/src/session";
import { runDeep, structuredLearner } from "./deep-recovery-journey";
import { right, wrong } from "./learners";
import { SliceSession } from "./session";
import { usePrerequisiteAfterOwn, useUnteachableFixture } from "../../../packages/learning/src/intervention";
// The deep-recovery research prototype is defined over the earlier stop ("#115's stop": every explanation tried, then a person),
// so these tests run with prereq-after-own@1 off, and with integers as the skill that has no teachable lesson (a fixture now
// that the real integers lesson is repaired).
usePrerequisiteAfterOwn(false);
useUnteachableFixture(["MATH.number.integers"]);

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const deepGap = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [LS], [LS]: [L2V] }, [PF, LS, L2V]);
const fam = (q: string | null) => (q ? problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? null : null);
const ctx = (s: SliceSession) => { s.now += 60_000; return { learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now).toISOString() }; };
const decide = (s: SliceSession, orig = ORIG): DeepRecoveryState => { const st = s.state(); return deepRecovery(orig, st.records, st.evidence, s.now, s.session); };
/** a lesson as the app records it: one of that module's real explanations */
const teach = (s: SliceSession, competency: string, strategy = moduleFor(competency)!.strategies[0].id) => s.events.push(make.teach(ctx(s), competency, strategy, "diagnosis"));
/** the original, wrong, as the prototype asks it */
const failOriginal = (s: SliceSession, orig = ORIG) => { const st = decide(s, orig); s.submit(orig, wrong(orig), "original", { context: st.context! }); };
const SOLVED = new Set(["solved", "solved_after_help"]);

test("R1: an unrelated or easier right answer in the same topic does not solve the original skill", () => {
  const s = new SliceSession("risk-r1", OWN, T0);
  failOriginal(s);
  // the learner then does other integration work on their own, right: a substitution integral and a by-parts one
  for (const q of ["gen:subst:2,3,2,3", "gen:auparts:1,4,0,4"]) { assert.equal(question(q).competency, OWN); s.submit(q, right(q), "practice"); }
  const st = decide(s);
  assert.ok(!SOLVED.has(st.phase), `${st.phase}: ${st.reason}`);
  assert.equal(fam(st.question), "aupfr", "the next check is a fresh question of the original kind");
});

test("R2a: a first try right only with a hint is not 'solved on your own'", () => {
  const s = new SliceSession("risk-r2a", OWN, T0);
  s.submit(ORIG, right(ORIG), "original", { hints: 1, context: decide(s).context! });
  const st = decide(s);
  assert.ok(st.phase !== "solved", `${st.phase}: ${st.reason}`);
  assert.doesNotMatch(st.reason, /on your own|slip/);
});

test("R2b: a fresh question answered after its solution was shown, or on a second try, is not independent success", () => {
  const s = new SliceSession("risk-r2b", OWN, T0);
  failOriginal(s);
  const st1 = decide(s);
  assert.equal(st1.phase, "slip-check");
  s.events.push(make.attempt(ctx(s), st1.question!, right(st1.question!), "original", { solution: true, context: st1.context! }));
  const st2 = decide(s);
  assert.ok(!SOLVED.has(st2.phase), `after a shown solution: ${st2.phase}`);
  // a second try at that same question, right, unaided
  s.submit(st1.question!, right(st1.question!), "original", { context: st1.context! });
  const st3 = decide(s);
  assert.ok(!SOLVED.has(st3.phase), `after a second try: ${st3.phase}`);
});

test("R3a: teaching in another skill does not count as help for this goal", () => {
  const s = new SliceSession("risk-r3a", OWN, T0);
  failOriginal(s);
  teach(s, P + "number.exponents"); // a lesson from the learner's ordinary exponents module
  const st1 = decide(s);
  s.submit(st1.question!, right(st1.question!), "original", { context: st1.context! });
  const st2 = decide(s);
  assert.equal(st2.phase, "solved", `${st2.phase}: ${st2.reason}`);
});

test("R3b: teaching in another recovery episode does not reset this diagnosis", () => {
  const s = new SliceSession("risk-r3b", OWN, T0);
  runDeep(s, ORIG, deepGap(), { stopAfter: 7 });
  const before = decide(s);
  assert.ok(before.path.includes(PF), `diagnosis has reached partial fractions: ${before.path.join(">")}`);
  // another episode: a different original's recovery asks a question and teaches linear systems
  s.submit("gen:subst:1,2,1,2", wrong("gen:subst:1,2,1,2"), "original", { context: "recovery:gen:subst:1,2,1,2" });
  teach(s, LS);
  teach(s, P + "number.exponents");
  const after = decide(s);
  assert.deepEqual(after.path, before.path);
  assert.equal(after.phase, before.phase);
  assert.equal(after.active, before.active);
});

test("R4: no fresh question that tests the original skill: stop honestly, no substitute", () => {
  // a fixed (non-generated) integral item: no family, no skill unit, no sub-skill mapping ties any other item to it
  const ORIG4 = "di-d2";
  assert.equal(question(ORIG4).competency, P + "calculus.definite-integrals");
  const s = new SliceSession("risk-r4", P + "calculus.definite-integrals", T0);
  failOriginal(s, ORIG4);
  const st = decide(s, ORIG4);
  assert.ok(!(st.question && st.question !== ORIG4 && (st.phase === "slip-check" || st.phase === "return")), `substituted ${st.question} as a check of ${ORIG4}`);
  assert.equal(st.phase, "escalate");
  assert.match(st.reason, /no fresh question/i);
});

test("R5: after an interruption and unrelated work, the saved recovery resumes without mixing evidence", () => {
  const s = new SliceSession("risk-r5", OWN, T0);
  runDeep(s, ORIG, deepGap(), { stopAfter: 9 });
  const rebuilt = (days: number) => SliceSession.fromEvents(s.learnerId, OWN, withDecisions(s.events, s.decisions), s.now + days * 86_400_000, "s2");
  const control = rebuilt(2);
  const other = rebuilt(2);
  // unrelated work that day: linear systems in the learner's class lesson (two right, one with the solution shown), a lesson on it,
  // and partial fractions practice
  for (const q of ["gen:alsys:2,2,4,1,5,-2", "gen:alsys:4,1,5,-2,-3,1"]) { try { question(q); other.submit(q, right(q), "practice"); } catch { /* id not in this build */ } }
  teach(other, LS);
  const pf = "gen:aopf:2,3,-1,2";
  other.submit(pf, right(pf), "practice", { hints: 1 });
  const a = decide(control), b = decide(other);
  assert.deepEqual({ phase: b.phase, active: b.active, path: b.path }, { phase: a.phase, active: a.active, path: a.path });
  // and it still finishes, teaching inside this episode
  const end = runDeep(other, ORIG, deepGap());
  assert.equal(end.final!.phase, "solved_after_help");
});

test("R6: the effort limit counts the module's teaching and practice, not only the prototype's probes", () => {
  const s = new SliceSession("risk-r6", OWN, T0);
  const budget = 12;
  const { final } = runDeep(s, ORIG, deepGap(), { budget });
  const lessons = s.events.filter((e) => (e as { record?: string }).record === "teach").length;
  assert.ok(s.replies.length + lessons <= budget + 1, `questions ${s.replies.length} + lessons ${lessons} > ${budget} (+1 for the original)`);
  assert.equal(final!.phase, "escalate");
});

test("R2c: a right first try picked from options is not 'solved on your own' until a fresh one confirms it", () => {
  const s = new SliceSession("risk-r2c", OWN, T0);
  const mc = "gen:aupfr:1,-1,3,-4,-3:mc";
  s.submit(mc, right(mc), "original", { context: decide(s, mc).context! });
  const st = decide(s, mc);
  assert.notEqual(st.phase, "solved", st.reason);
  assert.equal(fam(st.question), "aupfr");
  assert.ok(!st.question!.endsWith(":mc"), "the confirming question is typed when one exists");
});
