/**
 * deep-recovery@0 opened from INSIDE a module (learning/deep-module.ts, research switch, default off), driven as the flagged Module
 * view (year/Learn.tsx) drives it: the module's decision from the saved records; on "recover" the deep-recovery screen
 * (learning/deep-recovery-app.ts deepScreen) for the module's own wrong answer; the learner's answer or the lesson saved; again.
 * Sessions are rebuilt from saved records (SliceSession.fromEvents) for reloads. Synthetic learners only: a synthetic success is
 * not evidence that anyone learned.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { question } from "../../../packages/learning/src/content";
import { exposureKey, problemKeyOf, problemOf } from "../../../packages/learning/src/families";
import { investigateContext, moduleState, recovery, type ModuleState } from "../../../packages/learning/src/intervention";
import { withDecisions } from "../../../packages/learning/src/records";
import { DEEP_MODULE_POLICY, deepModuleState, moduleOriginals } from "../learning/deep-module";
import { deepScreen, type DeepScreen } from "../learning/deep-recovery-app";
import { activityFor } from "../learning/driver";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { misconception } from "./learners";
import { SliceSession } from "./session";

const P = "MATH.number.";
const C = P + "addition-regroup", PV = P + "place-value-tens", CMP = P + "compare-numbers";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const DEPS = { "fam:addr": [PV], [C]: [PV], [PV]: [CMP] };
/** a learner missing `gap` (until taught, in order); a wrong carrying answer is the no-regroup bug, so the module can reason about it */
function learner(gap: string[], never: string[] = []): Answerer {
  const sl = structuredLearner(DEPS, gap);
  return (q, c) => {
    if (never.includes(question(q).competency)) return "-1";
    const r = sl(q, c);
    return r === question(q).answer ? r : misconception(q, new Set(["no-regroup"])) ?? r;
  };
}
/** a learner missing a chain of skills `gap` (gap[0] directly under `comp`); a wrong answer is the question's first modelled bug */
function chainLearner(comp: string, gap: string[]): Answerer {
  const deps: Record<string, string[]> = { [comp]: [gap[0]] };
  gap.forEach((g, i) => { if (gap[i + 1]) deps[g] = [gap[i + 1]]; });
  const sl = structuredLearner(deps, gap);
  return (q, c) => {
    const r = sl(q, c);
    if (r === question(q).answer) return r;
    const b = problemOf(q.replace(/:(mc|w)$/, ""))?.bugs?.[0]?.id;
    return (b && misconception(q, new Set([b]))) || r;
  };
}
const taughtSkills = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
const reload = (s: SliceSession, after = 60_000) => SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + after, `s${Number(s.session.slice(1)) + 1}`);

interface Step { where: "module" | "deep"; phase: string; qid: string | null; lesson: string | null; context?: string; correct?: boolean; original?: string }
/** the decision the flagged Module view shows now (pure function of the saved records) */
function decide(s: SliceSession, on = true, comp = C): { ms: ModuleState; deep: DeepScreen | null } {
  const st = s.state();
  const ms = deepModuleState(on, comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
  return { ms, deep: on && ms.phase === "recover" && ms.original ? deepScreen(ms.original, st.records, st.evidence, s.now) : null };
}
/** the flagged view's loop; `reloadEvery`: rebuild the session from saved records after every action */
function run(answer: Answerer, o: { max?: number; reloadEvery?: boolean; start?: SliceSession; comp?: string } = {}) {
  const comp = o.comp ?? C;
  let s = o.start ?? new SliceSession("synthetic-module", comp, T0);
  const steps: Step[] = [];
  for (let i = 0; i < (o.max ?? 120); i++) {
    if (o.reloadEvery) s = reload(s);
    const { ms, deep } = decide(s, true, comp);
    const say = (qid: string, activity: Parameters<SliceSession["submit"]>[2], context: string | undefined, where: Step["where"], phase: string) => {
      const r = s.submit(qid, answer(qid, { taughtSkills: taughtSkills(s), answered: s.replies.length, activity }), activity, context ? { context } : {});
      steps.push({ where, phase, qid, lesson: null, context, correct: r.credit === true, ...(ms.original ? { original: ms.original } : {}) });
    };
    if (deep) {
      if (deep.kind === "end") { steps.push({ where: "deep", phase: `end:${deep.phase}`, qid: null, lesson: null }); break; }
      if (deep.kind === "lesson") { s.taught(deep.module, deep.episode ?? undefined); steps.push({ where: "deep", phase: "lesson", qid: null, lesson: deep.competency }); continue; }
      say(deep.qid, deep.activity, deep.context, "deep", deep.state.phase);
      continue;
    }
    if (ms.phase === "chapter" && ms.strategy) { s.taught(ms); steps.push({ where: "module", phase: "chapter", qid: null, lesson: comp }); continue; }
    if (!ms.question) { steps.push({ where: "module", phase: ms.phase, qid: null, lesson: null }); break; }
    say(ms.question, activityFor(ms), ms.context, "module", ms.phase);
  }
  return { s, steps };
}
const deepSteps = (steps: Step[]) => steps.filter((x) => x.where === "deep");

test("in-module: start in the module -> wrong own question -> down to prerequisites -> lesson -> fresh problem on the original skill -> module continues", () => {
  const { s, steps } = run(learner([PV]));
  const firstDeep = steps.findIndex((x) => x.where === "deep");
  assert.ok(firstDeep > 0 && steps.slice(0, firstDeep).every((x) => x.where === "module" && x.phase === "explore"), "starts in the module's own questions");
  const orig = steps[firstDeep].original!;
  assert.equal(question(orig).competency, C);
  assert.equal(s.events.find((e) => (e as { questionId?: string }).questionId === orig && (e as { record?: string }).record === "attempt")!["activity" as never], "diagnostic", "the original is the module's own exploratory answer");
  const deep = deepSteps(steps);
  assert.ok(deep.some((x) => x.phase === "probe" && x.qid && question(x.qid).competency === PV && !x.correct), "goes down to the prerequisite and finds it failing");
  assert.ok(deep.some((x) => x.lesson === PV), "teaches the prerequisite");
  const lessonAt = steps.findIndex((x) => x.lesson === PV);
  const returns = steps.filter((x, i) => i > lessonAt && x.where === "deep" && x.phase === "return");
  assert.ok(returns.length >= 1 && returns.every((x) => question(x.qid!).competency === C && x.correct), "returns to fresh problems on the original skill, right");
  for (const r of returns) assert.notEqual(problemKeyOf(r.qid!), problemKeyOf(orig), "never the same problem again");
  for (const x of deep.filter((y) => y.qid)) assert.ok(x.context!.startsWith(`deep:${orig}|`), `episode context ${x.context}`);
  // the module continues after the episode: no more recovery, its own questions (not in the episode), and it ends shown
  const lastReturn = steps.lastIndexOf(returns.at(-1)!);
  const after = steps.slice(lastReturn + 1);
  assert.ok(after.length >= 1 && after.every((x) => x.where === "module"), `module continues: ${after.map((x) => x.phase)}`);
  assert.ok(after.every((x) => !x.context?.startsWith("deep:")));
  assert.equal(after.at(-1)!.phase, "done");
  // the shared engine never sees the module asking for its own recovery once the episode is solved
  const st = s.state();
  assert.notEqual(moduleState(C, st.records, st.evidence(C), s.now, s.session, null, undefined).phase, "recover");
  const ep = deepScreen(orig, st.records, st.evidence, s.now);
  assert.equal(ep.kind, "end");
  assert.ok(ep.kind === "end" && (ep.phase === "solved" || ep.phase === "solved_after_help"));
});

test("in-module: a gap two levels below the module's skill (compare numbers under place value) is found and taught first", () => {
  const { steps } = run(learner([PV, CMP]));
  const lessons = steps.filter((x) => x.where === "deep" && x.phase === "lesson").map((x) => x.lesson);
  assert.deepEqual(lessons, [CMP, PV], "deepest first, then the skill above it");
  assert.ok(steps.some((x) => x.phase === "return" && x.correct));
  assert.equal(steps.at(-1)!.where, "module");
  assert.equal(steps.at(-1)!.phase, "done");
});

test("in-module: without the adapter the shipped module keeps its own recovery while the episode runs (why the hook is needed)", () => {
  // replay the flagged journey and, before each deep step, ask what the SHIPPED module and recovery would show instead
  const { s, steps } = run(learner([PV]));
  const orig = steps.find((x) => x.original)!.original!;
  const attempts = s.events.filter((e) => (e as { record?: string }).record === "attempt");
  let disagree = 0, checked = 0;
  for (let k = 0; k < steps.length; k++) {
    if (steps[k].where !== "deep" || !steps[k].qid) continue;
    const n = steps.slice(0, k).filter((x) => x.qid).length;
    const cutAt = (attempts[n - 1] as { at: string }).at;
    const cut = s.events.filter((e) => (e as { at: string }).at <= cutAt);
    const r0 = SliceSession.fromEvents(s.learnerId, C, withDecisions(cut, s.decisions), Date.parse(cutAt) + 1, s.session).state();
    const shipped = moduleState(C, r0.records, r0.evidence(C), Date.parse(cutAt) + 1, s.session, null, r0.evidence);
    assert.equal(shipped.phase, "recover", "the shipped module asks for its own (two-level) recovery throughout the episode");
    assert.equal(shipped.original, orig);
    const r = recovery(orig, r0.records, r0.evidence, Date.parse(cutAt) + 1, s.session);
    checked++;
    // the shipped recovery would show the original problem again or a support module, never the deep episode's question
    if (!(r.phase === "investigate" && r.question === steps[k].qid)) disagree++;
  }
  assert.ok(checked > 5 && disagree === checked, `${disagree}/${checked}`);
});

test("in-module resume: rebuilt from saved records only after every action, the journey is the same and ends the same", () => {
  const a = run(learner([PV]));
  const b = run(learner([PV]), { reloadEvery: true });
  const key = (x: Step) => `${x.where}:${x.phase}:${x.qid ?? x.lesson}:${x.correct ?? ""}`;
  // the deep part (sitting-based, not session-based) is identical; the module ends in the same place
  assert.deepEqual(deepSteps(b.steps).map(key), deepSteps(a.steps).map(key));
  assert.equal(b.steps.at(-1)!.phase, a.steps.at(-1)!.phase);
});

test("in-module resume: a reload mid-episode (and the next day, a new sitting) reopens the same recovery at the same step", () => {
  const { s, steps } = run(learner([PV]), { max: 12 });
  assert.ok(steps.some((x) => x.where === "deep"), "inside the episode");
  const before = decide(s);
  assert.equal(before.ms.phase, "recover");
  for (const after of [60_000, 26 * 3_600_000]) {
    const r = reload(s, after);
    const d = decide(r);
    assert.equal(d.ms.phase, "recover");
    assert.equal(d.ms.original, before.ms.original);
    assert.equal(d.ms.why, DEEP_MODULE_POLICY);
    assert.equal(d.deep!.kind, before.deep!.kind);
    if (d.deep!.kind === "ask" && before.deep!.kind === "ask") assert.equal(exposureKey(d.deep!.qid), exposureKey(before.deep!.qid));
    assert.deepEqual(moduleOriginals(C, r.state().records), [before.ms.original]);
  }
  // and finishing after the reload: down, taught, back to a fresh problem, module continues
  const rest = run(learner([PV]), { start: reload(s, 26 * 3_600_000) });
  assert.ok(rest.steps.some((x) => x.lesson === PV) || steps.some((x) => x.lesson === PV));
  assert.ok(rest.steps.some((x) => x.phase === "return" && x.correct));
  assert.equal(rest.steps.at(-1)!.phase, "done");
});

test("in-module: an episode that stops (explanations have not clicked) pauses the module with the episode's reason", () => {
  const { steps, s } = run(learner([PV], [PV]));
  const last = steps.at(-1)!;
  assert.equal(last.where, "module");
  assert.equal(last.phase, "pause");
  const d = decide(s);
  assert.equal(d.ms.phase, "pause");
  assert.ok(d.ms.why?.startsWith(`${DEEP_MODULE_POLICY}: `), d.ms.why);
  // nothing is counted as solved
  assert.ok(!steps.some((x) => x.phase === "return" && x.correct));
});

test("switch off: deepModuleState is moduleState (same decisions at every step of the shipped journey)", () => {
  const s = new SliceSession("synthetic-module-off", C, T0);
  const answer = learner([PV]);
  let recovering: string | null = null, n = 0;
  for (let i = 0; i < 60; i++) {
    const st = s.state();
    const off = deepModuleState(false, C, st.records, st.evidence(C), s.now, s.session, null, st.evidence);
    const shipped = moduleState(C, st.records, st.evidence(C), s.now, s.session, null, st.evidence);
    assert.deepEqual(off, shipped);
    n++;
    // drive the shipped view (Learn.tsx Module + Recovery) one step
    const say = (q: string, act: Parameters<SliceSession["submit"]>[2], context?: string) => s.submit(q, answer(q, { taughtSkills: taughtSkills(s), answered: s.replies.length, activity: act }), act, context ? { context } : {});
    if (shipped.phase === "recover" && shipped.original) recovering = shipped.original;
    if (recovering) {
      const r = recovery(recovering, st.records, st.evidence, s.now, s.session);
      if (r.phase === "attempt" || r.phase === "return") { say(recovering, "original", `recovery:${recovering}`); continue; }
      if (r.phase === "investigate") { say(r.question!, "diagnostic", investigateContext(recovering)); continue; }
      if ((r.phase === "support" || r.phase === "teach") && r.active) {
        const inner = moduleState(r.active, st.records, st.evidence(r.active), s.now, s.session, r.established, undefined);
        if (inner.phase === "chapter" && inner.strategy) { s.taught(inner); continue; }
        if (inner.question) { say(inner.question, activityFor(inner), inner.context); continue; }
      }
      recovering = null;
      if (shipped.phase === "recover") break;
      continue;
    }
    if (shipped.phase === "chapter" && shipped.strategy) { s.taught(shipped); continue; }
    if (!shipped.question) break;
    say(shipped.question, activityFor(shipped), shipped.context);
  }
  assert.ok(n > 3);
  assert.ok(!s.events.some((e) => String((e as { context?: string }).context ?? "").startsWith("deep:")), "no deep-recovery record with the switch off");
});

test("in-module: an episode opened from the stuck view (first try 'original') is not taken over by the module", () => {
  const s = new SliceSession("synthetic-module-stuck", C, T0);
  const q = "gen:addr:47,38";
  s.submit(q, misconception(q, new Set(["no-regroup"]))!, "original");
  const st = s.state();
  const x = deepScreen(q, st.records, st.evidence, s.now);
  assert.equal(x.kind, "ask");
  if (x.kind === "ask") s.submit(x.qid, "1", x.activity, { context: x.context });
  assert.deepEqual(moduleOriginals(C, s.state().records), []);
  assert.notEqual(decide(s).ms.why, DEEP_MODULE_POLICY);
});

// place value (tens) -> compare numbers: a module whose recovery #115 (scoped-teaching-priority@1) does not change; the same journey
// was run on a scratch merge of this branch with e1d5ed74 (MODULE-RECOVERY.md)
const CNT = P + "count-objects";
test("in-module (second module, place value): down to compare numbers, taught, fresh place-value problems, module continues; and with a reload after every action", () => {
  for (const reloadEvery of [false, true]) {
    const { steps } = run(chainLearner(PV, [CMP]), { comp: PV, reloadEvery });
    const orig = steps.find((x) => x.original)!.original!;
    assert.equal(question(orig).competency, PV);
    assert.ok(steps.some((x) => x.where === "deep" && x.phase === "probe" && x.qid && question(x.qid).competency === CMP && !x.correct));
    assert.deepEqual(steps.filter((x) => x.where === "deep" && x.phase === "lesson").map((x) => x.lesson), [CMP]);
    const returns = steps.filter((x) => x.phase === "return");
    assert.ok(returns.length >= 1 && returns.every((x) => question(x.qid!).competency === PV && x.correct && problemKeyOf(x.qid!) !== problemKeyOf(orig)));
    const after = steps.slice(steps.lastIndexOf(returns.at(-1)!) + 1);
    assert.ok(after.length >= 1 && after.every((x) => x.where === "module"), `reload=${reloadEvery}`);
    assert.equal(after.at(-1)!.phase, "done");
  }
});

test("in-module: a missing piece OpenPath cannot teach here (count objects) stops the episode and pauses the module, nothing solved", () => {
  const { steps, s } = run(chainLearner(PV, [CMP, CNT]), { comp: PV });
  assert.equal(steps.at(-1)!.where, "module");
  assert.equal(steps.at(-1)!.phase, "pause");
  const d = decide(s, true, PV);
  assert.ok(d.ms.why?.startsWith(`${DEEP_MODULE_POLICY}: `), d.ms.why);
  assert.ok(!steps.some((x) => x.phase === "return"));
});
