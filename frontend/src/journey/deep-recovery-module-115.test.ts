/**
 * Phase 7 (research branch combining #115 e1d5ed74 with deep recovery; nothing merged elsewhere): in a module where #115 teaches the
 * module's OWN scoped unit first (scoped-teaching-priority@1), deep recovery starts only if the learner still struggles after that
 * teaching (struggle@0, learning/deep-module.ts). Switch on = deepModuleState(true); off = #115's moduleState. Synthetic learners
 * only: a synthetic success is not evidence that anyone learned.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { moduleState } from "../../../packages/learning/src/intervention";
import { DEEP_MODULE_POLICY, deepModuleState } from "../learning/deep-module";
import { deepScreen } from "../learning/deep-recovery-app";
import { activityFor } from "../learning/driver";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { learners, misconception } from "./learners";
import { runScenario, SCENARIOS, type Scenario } from "./scenarios";
import { SliceSession } from "./session";

const T0 = Date.parse("2026-11-05T09:00:00Z");
const N = "MATH.number.", G = "MATH.geometry.";
const ADDR = N + "addition-regroup", TRI = G + "triangle-properties", PAIRS = G + "angle-pairs", SCALE = G + "scale-drawings";
const PV = N + "place-value-tens", MEASURE = G + "angle-measure", RATIO = N + "ratio";
const FOUR = [ADDR, TRI, PAIRS, SCALE];

/** missing `gap` (gap[0] under `comp`; ["own"]: only the module's own skill, fixed by its own lesson); wrong = first modelled bug;
 *  `slipOnce`: one wrong answer on the first independent check after a lesson, right otherwise */
function learner(comp: string, gap: string[], slipOnce = false): Answerer {
  const own = gap[0] === "own";
  const deps: Record<string, string[]> = own ? {} : { [comp]: [gap[0]] };
  if (!own) gap.forEach((g, i) => { if (gap[i + 1]) deps[g] = [gap[i + 1]]; });
  const sl = structuredLearner(deps, own ? [comp] : gap);
  let slipped = false;
  return (q, c) => {
    if (slipOnce && !slipped && c.activity === "check" && c.taughtSkills.length) { slipped = true; return "-7"; }
    const r = sl(q, c);
    if (r === question(q).answer) return r;
    const b = problemOf(q.replace(/:(mc|w)$/, ""))?.bugs?.[0]?.id;
    return (b && misconception(q, new Set([b]))) || r;
  };
}
interface Step { where: "module" | "deep"; phase: string; qid: string | null; lesson: string | null; correct?: boolean; why?: string; reason?: string }
/** the flagged Module view's loop; at every module step the switch-off decision (#115's moduleState) is recorded beside it */
function run(comp: string, answer: Answerer, on = true, max = 90) {
  const s = new SliceSession(`synthetic-p7-${comp}`, comp, T0);
  const steps: Step[] = [];
  let divergedAt = -1;
  const taught = () => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
  for (let i = 0; i < max; i++) {
    const st = s.state();
    const ms = deepModuleState(on, comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
    const off = moduleState(comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
    if (divergedAt < 0 && JSON.stringify(ms) !== JSON.stringify(off)) divergedAt = steps.length;
    const say = (qid: string, activity: Parameters<SliceSession["submit"]>[2], where: Step["where"], phase: string, context?: string) => {
      const r = s.submit(qid, answer(qid, { taughtSkills: taught(), answered: s.replies.length, activity }), activity, context ? { context } : {});
      steps.push({ where, phase, qid, lesson: null, correct: r.credit === true });
    };
    if (on && ms.phase === "recover" && ms.original) {
      const x = deepScreen(ms.original, st.records, st.evidence, s.now);
      if (x.kind === "end") { steps.push({ where: "deep", phase: `end:${x.phase}`, qid: null, lesson: null }); break; }
      if (x.kind === "lesson") { s.taught(x.module, x.episode ?? undefined); steps.push({ where: "deep", phase: "lesson", qid: null, lesson: x.competency }); continue; }
      say(x.qid, x.activity, "deep", x.state.phase, x.context);
      continue;
    }
    if (ms.phase === "chapter" && ms.strategy) { s.taught(ms); steps.push({ where: "module", phase: "chapter", qid: null, lesson: comp }); continue; }
    if (!ms.question) { steps.push({ where: "module", phase: ms.phase, qid: null, lesson: null, why: ms.why, reason: ms.reason }); break; }
    say(ms.question, activityFor(ms), "module", ms.why?.endsWith("struggle-check") ? "struggle-check" : ms.phase, ms.context);
  }
  return { s, steps, divergedAt };
}
const lessons = (steps: Step[]) => steps.filter((x) => x.lesson).map((x) => x.lesson);
const asked = (steps: Step[]) => steps.filter((x) => x.qid).length;

test("own teaching is enough (all four modules #115 changed): no detour, the journey is #115's own, step for step", () => {
  for (const c of FOUR) {
    const { steps, divergedAt } = run(c, learner(c, ["own"]));
    assert.equal(divergedAt, -1, `${c}: switch on decided exactly as #115 at every step`);
    assert.ok(steps.some((x) => x.phase === "chapter"), `${c}: the module's own teaching`);
    assert.ok(!steps.some((x) => x.where === "deep"), `${c}: no deep recovery`);
    assert.deepEqual([...new Set(lessons(steps))], [c], `${c}: only its own lesson`);
    assert.ok(steps.every((x) => !x.qid || question(x.qid).competency === c), `${c}: no prerequisite question`);
  }
});

test("a capable learner who slips once on the check after the module's own teaching: one extra question, no prerequisite question, no lesson below; #115's next step stands", () => {
  for (const c of [ADDR]) {
    const on = run(c, learner(c, ["own"], true));
    const off = run(c, learner(c, ["own"], true), false);
    assert.equal(asked(on.steps) - asked(off.steps), 1, `${c}: at most one extra question (${asked(on.steps)} vs ${asked(off.steps)})`);
    assert.equal(on.steps.filter((x) => x.phase === "struggle-check").length, 1);
    assert.ok(on.steps.find((x) => x.phase === "struggle-check")!.correct);
    assert.ok(!on.steps.some((x) => x.where === "deep"), `${c}: no deep recovery`);
    assert.ok(on.steps.every((x) => !x.qid || question(x.qid).competency === c), `${c}: no prerequisite question`);
    assert.deepEqual([...new Set(lessons(on.steps))], [c], `${c}: no lesson below`);
    // #115's decision after the failed check (policy C: a person, with its way back) is kept; only its reason is made true
    const last = on.steps.at(-1)!, lastOff = off.steps.at(-1)!;
    assert.equal(last.phase, lastOff.phase);
    assert.equal(last.why, `${DEEP_MODULE_POLICY}: slip; module stop kept (policy C)`);
  }
});

test("own teaching fails, then deep recovery, then fresh problems in the module (addition with regrouping, triangle properties)", () => {
  for (const [c, gap] of [[ADDR, PV], [TRI, MEASURE]] as const) {
    const { steps } = run(c, learner(c, [gap]));
    const firstDeep = steps.findIndex((x) => x.where === "deep");
    assert.ok(firstDeep > 0, `${c}: deep recovery started`);
    const before = steps.slice(0, firstDeep);
    assert.ok(before.some((x) => x.phase === "chapter") && before.some((x) => x.phase === "check" && !x.correct), `${c}: own teaching and its check came first`);
    assert.ok(before.every((x) => x.where === "module" && (!x.qid || question(x.qid).competency === c)), `${c}: no prerequisite question before the own teaching failed`);
    assert.ok(steps.some((x) => x.where === "deep" && x.phase === "probe" && x.qid && question(x.qid).competency === gap && !x.correct), `${c}: the gap is found`);
    assert.ok(lessons(steps).includes(gap), `${c}: the gap is taught`);
    const returns = steps.filter((x) => x.phase === "return");
    assert.ok(returns.length >= 1 && returns.every((x) => question(x.qid!).competency === c && x.correct), `${c}: fresh problems in the module, right`);
    const after = steps.slice(steps.lastIndexOf(returns.at(-1)!) + 1);
    assert.ok(after.length && after.every((x) => x.where === "module"), `${c}: the module goes on`);
    assert.equal(after.at(-1)!.phase, "done", `${c}: and ends shown`);
  }
});

test("angle pairs: own teaching fails, deep recovery teaches angle measure, fresh angle-pair problems right; then (phase 8, repaired-gap@0) one fresh angle-pairs question alone decides: right here, the module carries on", () => {
  const { steps } = run(PAIRS, learner(PAIRS, [MEASURE]));
  assert.ok(lessons(steps).includes(MEASURE));
  assert.ok(steps.some((x) => x.phase === "return" && x.correct));
  // phase 7 kept #115's stop here; the owner's phase-8 decision replaces that (deep-recovery-module-anglepairs.test.ts covers both routes)
  assert.ok(steps.some((x) => x.where === "module" && x.phase === "check" && x.correct && x.qid && question(x.qid).competency === PAIRS));
  assert.notEqual(steps.at(-1)!.phase, "pause");
});

test("scale drawings: own teaching fails, deep recovery finds ratio with no teachable content here: the module pauses, nothing solved", () => {
  const { steps } = run(SCALE, learner(SCALE, [RATIO]));
  assert.ok(steps.some((x) => x.where === "deep" && x.qid && question(x.qid).competency === RATIO && !x.correct));
  assert.ok(!steps.some((x) => x.phase === "return"));
  assert.equal(steps.at(-1)!.phase, "pause");
  assert.equal(steps.at(-1)!.why, `${DEEP_MODULE_POLICY}: blocked`);
});

test("policies A1 and C with the switch on: every module decision in those journeys is #115's own (no divergence)", () => {
  const proto = SliceSession.prototype as unknown as { next: SliceSession["next"] };
  const orig = proto.next;
  let calls = 0, diverged: string[] = [];
  proto.next = function (this: SliceSession, competency = this.competency, o = {}) {
    const ms = orig.call(this, competency, o);
    if (!o.established && !o.inRecovery) {
      const st = this.state();
      const on = deepModuleState(true, competency, st.records, st.evidence(competency), this.now, this.session, null, st.evidence);
      calls++;
      if (JSON.stringify(on) !== JSON.stringify(moduleState(competency, st.records, st.evidence(competency), this.now, this.session, null, st.evidence))) diverged.push(`${competency}:${on.phase}`);
    }
    return ms;
  };
  try {
    const S = (o: Partial<Scenario> & Pick<Scenario, "learner">): Scenario => ({ id: "policy", category: 1, start: "gen:lin:2,17,11", expect: {}, ...o });
    for (const k of [3, 4, 5]) runScenario(S({ learner: () => learners.oneSlip(k) }));
    runScenario(SCENARIOS.find((s) => s.id === "3h")!);
  } finally { proto.next = orig; }
  assert.ok(calls > 10, `${calls} module decisions checked`);
  assert.deepEqual(diverged, []);
});

// Grade 7's worked examples change the fresh pool: this slip now reaches another own-skill
// explanation in the ordinary module. Research must preserve that whole path, not force a stop.
test("angle pairs after Grade 7 integration: a slip keeps the ordinary module's own teaching and fresh recheck", () => {
  const on = run(PAIRS, learner(PAIRS, ["own"], true));
  const off = run(PAIRS, learner(PAIRS, ["own"], true), false);
  assert.deepEqual(on.steps, off.steps);
  assert.equal(on.steps.at(-1)!.phase, "done");
  assert.equal(on.steps.filter((x) => x.phase === "check" && x.correct === false).length, 1);
  assert.ok(on.steps.some((x) => x.phase === "check" && x.correct));
  assert.deepEqual([...new Set(lessons(on.steps))], [PAIRS]);
  assert.ok(on.steps.every((x) => x.where === "module" && (!x.qid || question(x.qid).competency === PAIRS)));
});
