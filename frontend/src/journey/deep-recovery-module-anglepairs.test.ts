/**
 * Phase 8 (research, switch on unless said): the owner's decision on #115's angle-pairs stop after a repaired prerequisite
 * (repaired-gap@0, learning/deep-module.ts). A repaired gap alone does not lift the stop; when the stop is solely attributable to that
 * gap, one fresh angle-pairs question on the learner's own decides: right, the module carries on (route 1); wrong, the stop stays
 * (route 2). Any other reason for a stop is kept. Synthetic learners only: a synthetic success is not evidence that anyone learned.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { problemKeyOf, problemOf } from "../../../packages/learning/src/families";
import { moduleState } from "../../../packages/learning/src/intervention";
import { withDecisions } from "../../../packages/learning/src/records";
import { presentedProblems } from "../../../packages/learning/src/skill-units";
import { moduleFor } from "../../../packages/learning/src/content";
import { DEEP_MODULE_POLICY, deepModuleState, repairedGapOnly } from "../learning/deep-module";
import { deepScreen } from "../learning/deep-recovery-app";
import { activityFor } from "../learning/driver";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { misconception } from "./learners";
import { SliceSession } from "./session";

const T0 = Date.parse("2026-11-05T09:00:00Z");
const G = "MATH.geometry.", N = "MATH.number.";
const PAIRS = G + "angle-pairs", MEASURE = G + "angle-measure", SCALE = G + "scale-drawings", RATIO = N + "ratio";
const P = `${DEEP_MODULE_POLICY}: `;

/** missing `gap` under `comp` until taught; wrong = the question's first modelled bug. `failAfterRepair`: the after-repair question is
 *  answered wrong (the gap was not all that was missing); `slipOnce`: one wrong on the first check after a lesson */
function learner(comp: string, gap: string[], o: { slipOnce?: boolean } = {}): Answerer & { forceWrong?: boolean } {
  const own = gap[0] === "own";
  const deps: Record<string, string[]> = own ? {} : { [comp]: [gap[0]] };
  const sl = structuredLearner(deps, own ? [comp] : gap);
  let slipped = false;
  const f = ((q: string, c: Parameters<Answerer>[1]) => {
    if (f.forceWrong) { f.forceWrong = false; return "-7"; }
    if (o.slipOnce && !slipped && c.activity === "check" && c.taughtSkills.length) { slipped = true; return "-7"; }
    const r = sl(q, c);
    if (r === question(q).answer) return r;
    const b = problemOf(q.replace(/:(mc|w)$/, ""))?.bugs?.[0]?.id;
    return (b && misconception(q, new Set([b]))) || r;
  }) as Answerer & { forceWrong?: boolean };
  return f;
}
interface Step { where: "module" | "deep"; phase: string; qid: string | null; lesson: string | null; correct?: boolean; why?: string; reason?: string }
const reload = (s: SliceSession, after = 60_000) => SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + after, `s${Number(s.session.slice(1)) + 1}`);
const decideKey = (s: SliceSession, comp: string, on = true) => {
  const st = s.state();
  const ms = deepModuleState(on, comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
  const deep = on && ms.phase === "recover" && ms.original ? deepScreen(ms.original, st.records, st.evidence, s.now) : null;
  return JSON.stringify({ phase: ms.phase, q: ms.question, why: ms.why ?? null, original: ms.original ?? null, deep: deep ? { kind: deep.kind, q: deep.kind === "ask" ? deep.qid : null, l: deep.kind === "lesson" ? deep.competency : null } : null });
};
/** the flagged Module view's loop. `wrongAfterRepair`: the learner answers the after-repair question wrong. `reloadEvery`: the session is
 *  rebuilt from saved records after every action, and the decision it shows must equal the one before the reload */
function run(comp: string, answer: ReturnType<typeof learner>, o: { on?: boolean; wrongAfterRepair?: boolean; reloadEvery?: boolean; max?: number; stopBefore?: string } = {}) {
  const on = o.on ?? true;
  let s = new SliceSession(`synthetic-p8-${comp}`, comp, T0);
  const steps: Step[] = [];
  let reloads = 0;
  const taught = () => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
  for (let i = 0; i < (o.max ?? 110); i++) {
    if (o.reloadEvery && i > 0) { const before = decideKey(s, comp, on); s = reload(s); assert.equal(decideKey(s, comp, on), before, `reload at step ${i}`); reloads++; }
    const st = s.state();
    const ms = deepModuleState(on, comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
    if (o.stopBefore && ms.why === o.stopBefore) break;
    if (!on) assert.deepEqual(ms, moduleState(comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence));
    const say = (qid: string, activity: Parameters<SliceSession["submit"]>[2], where: Step["where"], phase: string, why?: string, context?: string) => {
      if (o.wrongAfterRepair && why === `${P}after-repair check`) answer.forceWrong = true;
      const r = s.submit(qid, answer(qid, { taughtSkills: taught(), answered: s.replies.length, activity }), activity, context ? { context } : {});
      steps.push({ where, phase, qid, lesson: null, correct: r.credit === true, why });
    };
    if (on && ms.phase === "recover" && ms.original) {
      const x = deepScreen(ms.original, st.records, st.evidence, s.now);
      if (x.kind === "end") { steps.push({ where: "deep", phase: `end:${x.phase}`, qid: null, lesson: null }); break; }
      if (x.kind === "lesson") { s.taught(x.module, x.episode ?? undefined); steps.push({ where: "deep", phase: "lesson", qid: null, lesson: x.competency }); continue; }
      say(x.qid, x.activity, "deep", x.state.phase, undefined, x.context);
      continue;
    }
    if (ms.phase === "chapter" && ms.strategy) { s.taught(ms); steps.push({ where: "module", phase: "chapter", qid: null, lesson: comp }); continue; }
    if (!ms.question) { steps.push({ where: "module", phase: ms.phase, qid: null, lesson: null, why: ms.why, reason: ms.reason }); break; }
    say(ms.question, activityFor(ms), "module", ms.phase, ms.why, ms.context);
  }
  return { s, steps, reloads };
}
const afterRepair = (steps: Step[]) => steps.filter((x) => x.why === `${P}after-repair check`);

test("route 1: repaired gap (angle measure) -> one fresh angle-pairs question on their own, right -> the module carries on; the recovery stays in the records", () => {
  const { s, steps } = run(PAIRS, learner(PAIRS, [MEASURE]));
  assert.ok(steps.some((x) => x.lesson === MEASURE), "the gap was taught by deep recovery");
  const ar = afterRepair(steps);
  assert.equal(ar.length, 1, "exactly one after-repair question");
  assert.equal(question(ar[0].qid!).competency, PAIRS);
  assert.ok(ar[0].correct);
  // fresh: never presented before it (answers, teaching screens) by problem key
  const i = steps.indexOf(ar[0]);
  const prior = SliceSession.fromEvents(s.learnerId, PAIRS, withDecisions(s.events.slice(0, s.events.findIndex((e) => (e as { questionId?: string }).questionId === ar[0].qid)), s.decisions), s.now, "x").state().records;
  assert.ok(!presentedProblems(prior, moduleFor).has(problemKeyOf(ar[0].qid!)), "never presented before");
  const after = steps.slice(i + 1);
  assert.ok(after.length >= 2 && after.every((x) => x.where === "module"), "the module carries on");
  assert.ok(after.filter((x) => x.qid).length >= 1, "with questions of its own");
  assert.ok(after.filter((x) => x.qid).every((x) => x.why?.startsWith(`${P}recovered (${MEASURE}`) || !x.why?.startsWith(P)), after.map((x) => x.why).join());
  assert.notEqual(after.at(-1)!.phase, "pause", `not stopped again: ${after.at(-1)!.phase} ${after.at(-1)!.why}`);
  // the recovery stays in the records: the episode's answers and lesson, and its solved-after-help outcome, rebuilt from them
  const st = s.state();
  const orig = st.records.attempts.find((a) => a.context?.startsWith("deep:"))!.context!.slice(5).split("|")[0];
  const ep = deepScreen(orig, st.records, st.evidence, s.now);
  assert.equal(ep.kind, "end");
  assert.ok(ep.kind === "end" && ep.phase === "solved_after_help" && ep.state.diagnosis === "prerequisite" && ep.state.cause === MEASURE);
  assert.ok(st.records.teaching.some((t) => t.competency === MEASURE && t.episode?.startsWith(`deep:${orig}#`)));
});

test("route 2: repaired gap -> the fresh angle-pairs question is wrong -> #115's stop is kept (a person, with its way back); no second descent", () => {
  const { s, steps } = run(PAIRS, learner(PAIRS, [MEASURE]), { wrongAfterRepair: true });
  const ar = afterRepair(steps);
  assert.equal(ar.length, 1);
  assert.ok(!ar[0].correct);
  const last = steps.at(-1)!;
  assert.equal(last.phase, "pause");
  assert.equal(last.why, `${P}after-repair check wrong; module stop kept (policy C)`);
  assert.equal(steps.slice(steps.indexOf(ar[0]) + 1).filter((x) => x.qid).length, 0, "no further question, no second deep episode");
  assert.equal(new Set(s.state().records.attempts.filter((a) => a.context?.startsWith("deep:")).map((a) => a.context!.split("|")[0])).size, 1, "one episode only");
  // the stop is #115's own (its decision and handover), only the reason is ours
  const st = s.state();
  const shipped = moduleState(PAIRS, st.records, st.evidence(PAIRS), s.now, s.session, null, undefined);
  const ours = deepModuleState(true, PAIRS, st.records, st.evidence(PAIRS), s.now, s.session, null, st.evidence);
  assert.equal(ours.decision?.action, shipped.decision?.action);
  assert.deepEqual(ours.handover, shipped.handover);
});

test("no repaired-gap override for an ordinary slip path or an unteachable gap", () => {
  const slip = run(PAIRS, learner(PAIRS, ["own"], { slipOnce: true }));
  assert.equal(afterRepair(slip.steps).length, 0);
  const slipOff = run(PAIRS, learner(PAIRS, ["own"], { slipOnce: true }), { on: false });
  assert.deepEqual(slip.steps, slipOff.steps, "Grade 7 fresh-pool changes keep the ordinary own-skill path, with no research override");
  assert.equal(slip.steps.at(-1)!.phase, "done");
  const blocked = run(SCALE, learner(SCALE, [RATIO]));
  assert.equal(afterRepair(blocked.steps).length, 0);
  assert.equal(blocked.steps.at(-1)!.phase, "pause");
  assert.equal(blocked.steps.at(-1)!.why, `${P}blocked`);
});

test("solely attributable: other or additional reasons are refused by the rule itself", () => {
  const { s } = run(PAIRS, learner(PAIRS, [MEASURE]), { stopBefore: `${P}after-repair check` });
  const st = s.state();
  const orig = st.records.attempts.find((a) => a.context?.startsWith("deep:"))!.context!.slice(5).split("|")[0];
  const stop = moduleState(PAIRS, st.records, st.evidence(PAIRS), s.now, s.session, null, undefined);
  assert.equal(stop.phase, "pause");
  const ep = { diagnosis: "prerequisite", cause: MEASURE, original: orig };
  assert.equal(repairedGapOnly(PAIRS, st.records, stop, ep), true, "the repaired-gap case");
  assert.equal(repairedGapOnly(PAIRS, st.records, { ...stop, decision: null, why: "no-dead-end@1: assess with no fresh question" }, ep), false, "another kind of stop");
  assert.equal(repairedGapOnly(PAIRS, st.records, stop, { ...ep, diagnosis: "own-or-unmapped", cause: null }), false, "no prerequisite repaired");
  assert.equal(repairedGapOnly(PAIRS, st.records, stop, { ...ep, original: "gen:afpair:1,99" }), false, "an episode not from this unit's struggle");
});

test("reload at every step rebuilds the same decision from saved records only (both routes)", () => {
  for (const wrongAfterRepair of [false, true]) {
    const a = run(PAIRS, learner(PAIRS, [MEASURE]), { wrongAfterRepair });
    const b = run(PAIRS, learner(PAIRS, [MEASURE]), { wrongAfterRepair, reloadEvery: true });
    assert.ok(b.reloads >= a.steps.length - 1 && b.reloads > 10, `${b.reloads} reloads, ${a.steps.length} steps`);
    const key = (x: Step) => `${x.where}:${x.phase}:${x.lesson ?? ""}:${x.correct ?? ""}:${x.why ?? ""}`;
    assert.deepEqual(b.steps.map(key), a.steps.map(key), `route ${wrongAfterRepair ? 2 : 1}`);
  }
});

test("switch off: #115's own decision at every step (asserted inside the loop), no deep-recovery record, and the module stops after its own teaching", () => {
  const { s, steps } = run(PAIRS, learner(PAIRS, [MEASURE]), { on: false });
  assert.ok(!s.events.some((e) => String((e as { context?: string }).context ?? "").startsWith("deep:")));
  assert.ok(!steps.some((x) => x.why?.startsWith(P)));
  assert.equal(steps.at(-1)!.phase, "pause");
});
