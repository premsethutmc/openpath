/**
 * Phase 8 (research, switch on unless said): evidence after help (learning/deep-evidence.ts). The owner's decision: keep both facts. A
 * fresh hint-free right answer straight after a deep episode's help is "Solved independently after help", never the unqualified
 * "Shown on your own"; a later fresh unaided check in a later sitting strengthens it ("…; checked again later on your own"), never to
 * "Verified"; the immediate success is never discarded, and a later wrong check erases nothing. Synthetic learners only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import type { SkillEvidence } from "../../../packages/learning/src/evidence";
import { phasePool, problemKeyOf } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { withDecisions } from "../../../packages/learning/src/records";
import { presentedProblems } from "../../../packages/learning/src/skill-units";
import { tilesFor } from "../../../packages/learning/src/tiles";
import { deepModuleState } from "../learning/deep-module";
import { AFTER_HELP, AFTER_HELP_LATER, afterHelpOf, qualifyReason, relabelTiles, skillLabel } from "../learning/deep-evidence";
import { SITTING_GAP_MS, deepScreen } from "../learning/deep-recovery-app";
import { activityFor } from "../learning/driver";
import { goalSession, goalState, OWN as GOAL_STEP, runGoal, withBugs } from "./deep-goal-driver";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { right as rightOf, wrong as wrongOf } from "./learners";
import { SliceSession } from "./session";
import { usePrerequisiteAfterOwn, useUnteachableFixture } from "../../../packages/learning/src/intervention";
// The deep-recovery research prototype is defined over the earlier stop ("#115's stop": every explanation tried, then a person),
// so these tests run with prereq-after-own@1 off, and with integers as the skill that has no teachable lesson (a fixture now
// that the real integers lesson is repaired).
usePrerequisiteAfterOwn(false);
useUnteachableFixture(["MATH.number.integers"]);

const T0 = Date.parse("2026-11-05T09:00:00Z");
const ORIG = "gen:aupfr:1,-3,3,-2,-4", OWN = "MATH.calculus.integration-methods";
const A = "MATH.algebra.", PF = A + "partial-fractions", LS = A + "linear-systems", L2V = A + "linear-two-variables";
const PV = "MATH.number.place-value-tens", CMP = "MATH.number.compare-numbers";
const PAIRS = "MATH.geometry.angle-pairs", MEASURE = "MATH.geometry.angle-measure";
const STATUS_WORD: Record<SkillEvidence["status"], string> = { verified: "Verified", transfer: "Shown on your own, also on new problems", independent: "Shown on your own", review: "Review needed", guided: "Learning (with help so far)", exposure: "Started", not_started: "Not started" };
const SHOWN = ["independent", "transfer", "verified"];
const taught = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
const reload = (s: SliceSession, after = 60_000) => SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + after, `s${Number(s.session.slice(1)) + 1}`);
const ahOf = (s: SliceSession, c: string) => { const st = s.state(); return afterHelpOf(c, st.records, st.evidence, s.now); };

/** the stuck view (DeepRecovery.tsx) from a seeded wrong first try, to its end */
function stuck(id: string, L: Answerer, o: { noIds?: boolean } = {}) {
  const s = new SliceSession(`synthetic-ev-${id}`, OWN, T0);
  s.submit(ORIG, "1", "practice");
  for (let i = 0; i < 200; i++) {
    const st = s.state(), x = deepScreen(ORIG, st.records, st.evidence, s.now);
    if (x.kind === "end") return { s, end: x };
    if (x.kind === "lesson") { if (o.noIds) s.taught(x.module); else s.taught(x.module, x.episode ?? undefined); continue; }
    s.submit(x.qid, L(x.qid, { taughtSkills: taught(s), answered: s.replies.length, activity: x.activity }), x.activity, { context: x.context });
  }
  throw new Error("no end");
}
/** the flagged Module view (Learn.tsx with deepModuleState), to the module's end */
function moduleRun(comp: string, L: Answerer) {
  const s = new SliceSession(`synthetic-ev-module-${comp}`, comp, T0);
  let last = null as ReturnType<typeof deepModuleState> | null;
  for (let i = 0; i < 160; i++) {
    const st = s.state();
    const ms = deepModuleState(true, comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
    last = ms;
    if (ms.phase === "recover" && ms.original) {
      const x = deepScreen(ms.original, st.records, st.evidence, s.now);
      if (x.kind === "end") break;
      if (x.kind === "lesson") { s.taught(x.module, x.episode ?? undefined); continue; }
      s.submit(x.qid, L(x.qid, { taughtSkills: taught(s), answered: s.replies.length, activity: x.activity }), x.activity, { context: x.context });
      continue;
    }
    if (ms.phase === "chapter" && ms.strategy) { s.taught(ms); continue; }
    if (!ms.question) break;
    const act = activityFor(ms);
    s.submit(ms.question, L(ms.question, { taughtSkills: taught(s), answered: s.replies.length, activity: act }), act, ms.context ? { context: ms.context } : {});
  }
  return { s, last: last! };
}
/** a fresh question on the skill the learner has never been shown (by problem key) */
function freshOn(s: SliceSession, comp: string): string {
  const st = s.state();
  const seen = presentedProblems(st.records, (c) => moduleFor(c) ?? null);
  const m = moduleFor(comp)!;
  const pool = [...phasePool("aupfr", "check"), ...phasePool("aupfr", "practice"), ...(["check", "practice", "retention"] as const).flatMap((ph) => modulePhasePool(m, ph))];
  const q = pool.find((id) => !id.endsWith(":mc") && question(id.replace(/:(mc|w)$/, "")).competency === comp && !seen.has(problemKeyOf(id)));
  assert.ok(q, "a fresh question exists");
  return q!;
}
/** both facts, read back from the records alone */
function checkFacts(s: SliceSession, comp: string) {
  const ah = ahOf(s, comp)!;
  assert.ok(ah, "after-help facts found");
  const st = s.state();
  // the help: lessons carrying the recovery id
  assert.ok(ah.lessons.length >= 1 && ah.lessons.every((l) => l.episode === ah.episode), JSON.stringify(ah.lessons));
  assert.ok(ah.lessons.every((l) => st.records.teaching.some((t) => t.at === l.at && t.episode === ah.episode)));
  // the unaided answers: separate attempt records, after the last lesson, right, no hints or shown solution
  const lastLesson = ah.lessons.map((l) => l.at).sort().at(-1)!;
  for (const u of ah.unaided) {
    const a = st.records.attempts.find((x) => x.id === u.id)!;
    assert.ok(a.at > lastLesson && a.hints === 0 && !a.solution && a.n === 1, JSON.stringify(a));
    assert.equal(question(a.questionId.replace(/:(mc|w)$/, "")).competency, comp);
  }
  // the same facts after a reload / sign-out (a new visit rebuilt from saved records)
  const again = ahOf(reload(s), comp);
  assert.deepEqual(again, ah);
  return ah;
}
const statusOf = (s: SliceSession, c: string) => s.state().evidence(c).status;

const single = () => structuredLearner({ "fam:aupfr": [PF] }, [PF]);
const multi = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [LS], [LS]: [L2V] }, [PF, LS, L2V]);

test("single gap (stuck view): the skill reads 'Solved independently after help', with the help and the unaided answers apart", () => {
  const { s, end } = stuck("single", single());
  assert.equal(end.phase, "solved_after_help");
  const ah = checkFacts(s, OWN);
  assert.equal(ah.kind, "after-help");
  assert.equal(ah.label, AFTER_HELP);
  assert.ok(ah.unaided.length >= 2);
  const st = statusOf(s, OWN);
  const label = skillLabel(true, st, STATUS_WORD[st], ah);
  assert.ok(SHOWN.includes(st), `the engine counts the skill as shown (${st}): exactly the case the label is for`);
  assert.equal(label, AFTER_HELP);
  assert.doesNotMatch(label, /^Shown on your own/);
});

test("multi gap (stuck view): three lessons, one episode; the same after-help facts", () => {
  const { s, end } = stuck("multi", multi());
  assert.equal(end.phase, "solved_after_help");
  const ah = checkFacts(s, OWN);
  assert.equal(new Set(ah.lessons.map((l) => l.competency)).size, 3);
});

test("module (place value -> compare numbers): the module's end shows the after-help label and a qualified reason, never 'Shown on your own'", () => {
  const { s, last } = moduleRun(PV, withBugs(structuredLearner({ [PV]: [CMP] }, [CMP])));
  const ah = checkFacts(s, PV);
  const st = statusOf(s, PV);
  assert.ok(SHOWN.includes(st), `the module ended with the skill shown: ${st} ${last.phase}`);
  assert.equal(skillLabel(true, st, STATUS_WORD[st], ah), AFTER_HELP);
  const r = qualifyReason(true, last.reason, st, ah);
  assert.doesNotMatch(r, /Shown on your own/, r);
  if (last.reason.startsWith("Shown on your own")) assert.ok(r.startsWith(AFTER_HELP), r);
  // the year page's tile for the skill too
  const tiles = relabelTiles([{ competency: PV, status: "shown", label: "Shown on your own", children: [] }], (c) => ahOf(s, c));
  assert.equal(tiles[0].label, AFTER_HELP);
});

test("goal step (integration-methods goal): the step's status reads after help", () => {
  const EXP = "MATH.number.exponents";
  const { s } = runGoal(goalSession("ev", GOAL_STEP, T0), withBugs(structuredLearner({ "fam:subst": [EXP] }, [EXP])));
  const st = goalState(s);
  const ah = afterHelpOf(GOAL_STEP, st.selectionRecords, st.selectionEvidence, s.now)!;
  assert.ok(ah && ah.lessons.some((l) => l.competency === EXP));
  const status = st.selectionEvidence(GOAL_STEP).status;
  assert.ok(SHOWN.includes(status), status);
  assert.equal(skillLabel(true, status, STATUS_WORD[status], ah), AFTER_HELP);
});

test("angle-pairs route 1: after the fresh angle-pairs answer the module carries on; the skill reads after help", () => {
  const { s } = moduleRun(PAIRS, withBugs(structuredLearner({ [PAIRS]: [MEASURE] }, [MEASURE])));
  const ah = checkFacts(s, PAIRS);
  assert.ok(ah.lessons.some((l) => l.competency === MEASURE));
  const st = statusOf(s, PAIRS);
  assert.ok(SHOWN.includes(st), `angle pairs shown after the module carried on: ${st}`);
  assert.equal(skillLabel(true, st, STATUS_WORD[st], ah), AFTER_HELP);
  assert.ok(ah.unaided.length >= 1);
});

test("retention: a later fresh unaided check (later sitting, new problem key) right -> 'checked again later'; never 'Verified'", () => {
  const { s: s0 } = stuck("later-right", single());
  const before = ahOf(s0, OWN)!;
  // the same sitting does not count as later
  const same = reload(s0, 10 * 60_000);
  const q0 = freshOn(same, OWN);
  same.submit(q0, rightOf(q0), "check");
  assert.equal(ahOf(same, OWN)!.kind, "after-help", "a check in the same sitting is not a later check");
  // a later sitting
  const s = reload(s0, SITTING_GAP_MS + 60 * 60_000);
  const q = freshOn(s, OWN);
  s.submit(q, rightOf(q), "check");
  const ah = ahOf(s, OWN)!;
  assert.equal(ah.kind, "after-help-checked-later");
  assert.equal(ah.label, AFTER_HELP_LATER);
  assert.deepEqual(ah.unaided, before.unaided, "the immediate success is kept");
  for (const st of ["independent", "transfer", "verified"] as const) assert.equal(skillLabel(true, st, STATUS_WORD[st], ah), AFTER_HELP_LATER, `never ${STATUS_WORD[st]}`);
  assert.doesNotMatch(ah.note, /verified|master/i);
});

test("retention: a later check WRONG keeps the earlier success on record (and says so)", () => {
  const { s: s0 } = stuck("later-wrong", single());
  const before = ahOf(s0, OWN)!;
  const s = reload(s0, SITTING_GAP_MS + 60 * 60_000);
  const q = freshOn(s, OWN);
  s.submit(q, wrongOf(q), "check");
  const ah = ahOf(s, OWN)!;
  assert.equal(ah.kind, "after-help-later-wrong");
  assert.deepEqual(ah.unaided, before.unaided, "not erased");
  assert.match(ah.note, /earlier success is still recorded/);
  assert.equal(ah.later.at(-1)!.right, false);
  const st = statusOf(s, OWN);
  assert.equal(skillLabel(true, st, STATUS_WORD[st], ah), SHOWN.includes(st) ? AFTER_HELP : STATUS_WORD[st]);
});

test("old records (lessons without a recovery id): the help is still attributed, and the facts replay the same after a reload", () => {
  const { s } = stuck("old", single(), { noIds: true });
  const ah = ahOf(s, OWN)!;
  assert.ok(ah && ah.lessons.length >= 1 && ah.lessons.every((l) => l.episode === null));
  assert.deepEqual(ahOf(reload(s), OWN), ah);
});

test("switch off: every label and reason is today's, word for word; no deep episode: no change", () => {
  const { s } = stuck("off", single());
  const ah = ahOf(s, OWN);
  for (const st of Object.keys(STATUS_WORD) as SkillEvidence["status"][]) {
    assert.equal(skillLabel(false, st, STATUS_WORD[st], ah), STATUS_WORD[st]);
    assert.equal(qualifyReason(false, "Shown on your own. More practice is optional.", st, ah), "Shown on your own. More practice is optional.");
  }
  // a learner who shows the skill alone, with no deep episode: null
  const plain = new SliceSession("synthetic-ev-plain", OWN, T0);
  for (let i = 0; i < 3; i++) { const q = freshOn(plain, OWN); plain.submit(q, rightOf(q), "check"); }
  assert.equal(ahOf(plain, OWN), null);
  for (const st of Object.keys(STATUS_WORD) as SkillEvidence["status"][]) assert.equal(skillLabel(true, st, STATUS_WORD[st], null), STATUS_WORD[st]);
  void tilesFor;
});
