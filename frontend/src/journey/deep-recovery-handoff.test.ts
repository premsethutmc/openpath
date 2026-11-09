/**
 * recovery-handoff@0 (RESEARCH): every genuine stop of the flagged recovery (from the stuck view, and from inside a module) becomes one
 * hand-off report with a STRUCTURED reason; a routine sitting-limit pause and every other screen none; the learner's note says only what the
 * server confirmed and never that anyone was notified. Real engine runs over synthetic learners; nothing here is evidence of learning.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DEEP_APP_OPTIONS, SITTING_GAP_MS, deepScreen, type DeepScreen } from "../learning/deep-recovery-app";
import { DEEP_MODULE_POLICY, deepModuleState } from "../learning/deep-module";
import { NOT_SENT, ROUTINE_PAUSE, handoffReport, handoffText, moduleStop, stopCode, type HandoffReason } from "../learning/deep-recovery-handoff";
import { activityFor } from "../learning/driver";
import { withDecisions, type LearnerRecords } from "../../../packages/learning/src/records";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { misconception, right, wrong } from "./learners";
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { SliceSession } from "./session";

/** the engine's English reasons, kept ONLY as an independent oracle for the structured code (never used by the app) */
function textOracle(phase: string, reason: string): HandoffReason {
  if (phase === "blocked") return "missing-content";
  if (/effort limit/i.test(reason)) return "budget-exhausted";
  if (/no fresh question/i.test(reason)) return "no-fresh-question";
  if (/have not clicked|did not fix it/i.test(reason)) return "teaching-not-worked";
  if (/cannot teach|no explanation to offer/i.test(reason)) return "missing-content";
  return "unsettled";
}
const P = "MATH.", ORIG = "gen:aupfr:1,-3,3,-2,-4", OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const EPISODE = /^deep:([^|#@>\s]{1,120})#(\d{4}-\d\d-\d\dT[0-9:.]+(?:Z|[+-]\d\d:\d\d))$/;
const SKILL = /^[A-Za-z0-9._-]{1,80}$/;

function run(id: string, answer: Answerer, o: { orig?: string; comp?: string; opts?: typeof DEEP_APP_OPTIONS } = {}) {
  const orig = o.orig ?? ORIG;
  let s = new SliceSession(`synthetic-handoff-${id}`, o.comp ?? OWN, T0);
  s.submit(orig, "1", "practice");
  const screens: DeepScreen[] = [];
  let x!: DeepScreen;
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 300; i++) {
      const st = s.state();
      x = deepScreen(orig, st.records, st.evidence, s.now, o.opts ?? DEEP_APP_OPTIONS);
      screens.push(x);
      if (x.kind === "end") break;
      if (x.kind === "lesson") { s.taught(x.module, x.episode ?? undefined); continue; }
      const taughtSkills = s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
      s.submit(x.qid, answer(x.qid, { taughtSkills, answered: s.replies.length, activity: x.activity }), x.activity, { context: x.context });
    }
    if (x.kind !== "end" || x.phase !== "pause") break;
    s = SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + SITTING_GAP_MS + 60_000, `s${round + 2}`);
  }
  return { last: x, screens, orig, records: s.state().records, opts: o.opts ?? DEEP_APP_OPTIONS };
}

/** a learner who never gets partial fractions (nor the problem), whatever is taught: everything else right */
const stuck: Answerer = (qid) => (qid.startsWith("gen:aupfr") || graph.evidenceTarget(question(qid.replace(/:(mc|w)$/, "")).competency) === PF ? wrong(qid) : right(qid));
const checkShape = (orig: string, x: DeepScreen, records: LearnerRecords, opts = DEEP_APP_OPTIONS) => {
  const r = handoffReport(orig, x, records, opts)!;
  assert.ok(r, "a stop that hands over is reported");
  assert.match(r.episode, EPISODE);
  assert.equal(EPISODE.exec(r.episode)![1], orig);
  assert.match(r.skill, SKILL);
  assert.ok(r.step === "" || SKILL.test(r.step));
  assert.ok(r.path.length <= 16 && r.path.every((p) => SKILL.test(p)));
  assert.ok(r.detail.length > 0 && r.detail.length <= 1000 && !r.detail.includes("<"));
  assert.equal(r.reason, stopCode(x, records, opts));
  assert.equal(r.reason, textOracle(x.kind === "end" ? x.phase : "", x.state.reason), `structured code agrees with the engine's text: ${x.state.reason}`);
  return r;
};

test("unavailable content: reported as missing-content at the unteachable step", () => {
  const { last, screens, records } = run("nocontent", structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IDS], [IDS]: [IADD], [IADD]: [INTS] }, [PF, FACT, IDS, IADD, INTS]));
  assert.equal(last.kind === "end" && last.phase, "blocked");
  const r = checkShape(ORIG, last, records);
  assert.equal(r.reason, "missing-content");
  assert.equal(r.step, last.state.blocked!.skill);
  assert.equal(r.skill, OWN);
  assert.ok(screens.slice(0, -1).every((x) => handoffReport(ORIG, x, records) === null), "no screen before the stop is reported");
});

test("no fresh question: reported as no-fresh-question", () => {
  const { last, records } = run("nofresh", structuredLearner({}, []), { orig: "di-d2", comp: P + "calculus.definite-integrals" });
  assert.equal(last.kind === "end" && last.phase, "escalate");
  assert.equal(checkShape("di-d2", last, records).reason, "no-fresh-question");
});

test("the effort limit: reported as budget-exhausted", () => {
  const { last, records, opts } = run("budget", stuck, { opts: { ...DEEP_APP_OPTIONS, sessionBudget: undefined, budget: 8 } });
  assert.equal(last.kind === "end" && last.phase, "escalate", `${last.kind} ${last.state.phase} ${last.state.reason}`);
  assert.equal(checkShape(ORIG, last, records, opts).reason, "budget-exhausted");
});

test("teaching that did not work: reported as teaching-not-worked", () => {
  const { last, records } = run("notclicked", stuck);
  assert.equal(last.kind === "end" && last.phase, "escalate", `${last.kind} ${last.state.phase} ${last.state.reason}`);
  assert.equal(checkShape(ORIG, last, records).reason, "teaching-not-worked");
});

test("structured stop code: the branches no engine run above reaches", () => {
  const base = run("notclicked2", stuck);
  assert.ok(base.last.kind === "end");
  const end = base.last as Extract<DeepScreen, { kind: "end" }>;
  const at = (state: Partial<DeepScreen["state"]>, phase = "escalate" as const): DeepScreen => ({ ...end, phase, state: { ...end.state, blocked: undefined, ...state } });
  const none: LearnerRecords = { ...base.records, teaching: [] };
  // the adapter's own escalate (engine still in "teach"): the module decides
  assert.equal(stopCode(at({ phase: "teach", module: { ...end.state.module!, phase: "unavailable" } as never }), none), "missing-content");
  assert.equal(stopCode(at({ phase: "teach", module: { ...end.state.module!, phase: "pause" } as never }), none), "teaching-not-worked");
  assert.equal(stopCode(at({ phase: "teach", module: { phase: "explore" } as never }), none), "unsettled");
  // no mapped gap: the skill itself taught in this episode, not taught, or its module has nothing now
  const own = end.state.path[0];
  assert.equal(stopCode(at({ diagnosis: "unexplained", module: undefined }), { ...none, teaching: [{ competency: own, at: "2999-01-01T00:00:00Z", episode: end.state.episode! } as never] }), "teaching-not-worked");
  assert.equal(stopCode(at({ diagnosis: "unexplained", module: undefined }), none), "missing-content");
  assert.equal(stopCode(at({ diagnosis: "unexplained", module: { phase: "pause" } as never }), none), "missing-content");
  // no diagnosis
  assert.equal(stopCode(at({ diagnosis: null, active: null, effort: 3 }), none), "unsettled");
  assert.equal(stopCode(at({ diagnosis: null, active: own, effort: 3 }), none), "no-fresh-question");
  assert.equal(stopCode(at({ diagnosis: null, active: own, effort: 120 }), none), "budget-exhausted");
  assert.equal(stopCode(at({ blocked: { skill: own, why: "x" } }, "blocked" as never), none), "missing-content");
});

test("routine sitting pauses are never reported; the genuine stop after them is", () => {
  const { screens, last, records, opts } = run("pauses", stuck, { opts: { ...DEEP_APP_OPTIONS, sessionBudget: 6 } });
  const pauses = screens.filter((x) => x.kind === "end" && x.phase === "pause");
  assert.ok(pauses.length >= 1, "at least one routine pause");
  for (const x of pauses) assert.equal(handoffReport(ORIG, x, records, opts), null, "a routine pause hands nothing over");
  assert.ok(last.kind === "end" && last.handover, `${last.kind} ${last.state.phase}`);
  assert.ok(checkShape(ORIG, last, records, opts));
});

// ---------------------------------------------------------------------------------------------------- inside a module (deep-module.ts)
const N = "MATH.number.", MC = N + "addition-regroup", PV = N + "place-value-tens", CMP = N + "compare-numbers", CNT = N + "count-objects";
const MDEPS = { "fam:addr": [PV], [MC]: [PV], [PV]: [CMP] };
const noRegroup = (a: Answerer): Answerer => (q, c) => { const r = a(q, c); return r === question(q).answer ? r : misconception(q, new Set(["no-regroup"])) ?? r; };
const taught = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
const reloadAfter = (s: SliceSession, ms: number, n: number) => SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + ms, `m${n}`);
/** the flagged Module view's loop (as deep-recovery-module.test.ts drives it); stops at a module stop or the episode's own end screen */
function runModule(answer: Answerer, comp = MC, start?: SliceSession) {
  const s = start ?? new SliceSession("synthetic-module-handoff", comp, T0);
  for (let i = 0; i < 200; i++) {
    const st = s.state();
    const ms = deepModuleState(true, comp, st.records, st.evidence(comp), s.now, s.session, null, st.evidence);
    const deep = ms.phase === "recover" && ms.original ? deepScreen(ms.original, st.records, st.evidence, s.now) : null;
    if (deep) {
      if (deep.kind === "end") return { s, ms, deep, original: ms.original! };
      if (deep.kind === "lesson") { s.taught(deep.module, deep.episode ?? undefined); continue; }
      s.submit(deep.qid, answer(deep.qid, { taughtSkills: taught(s), answered: s.replies.length, activity: deep.activity }), deep.activity, { context: deep.context });
      continue;
    }
    if (ms.phase === "chapter" && ms.strategy) { s.taught(ms); continue; }
    if (!ms.question) return { s, ms, deep: null, original: null };
    s.submit(ms.question, answer(ms.question, { taughtSkills: taught(s), answered: s.replies.length, activity: activityFor(ms) }), activityFor(ms), { context: ms.context });
  }
  throw new Error("no end");
}
const stopOf = (s: SliceSession, comp = MC) => { const st = s.state(); return moduleStop(comp, st.records, st.evidence(comp), s.now, s.session, st.evidence); };

test("in a module: teaching that did not work pauses the module and is handed over as teaching-not-worked", () => {
  const r = runModule(noRegroup((q, c) => (question(q).competency === PV ? "-1" : structuredLearner(MDEPS, [PV])(q, c))));
  assert.equal(r.ms.phase, "pause");
  assert.ok(r.ms.why?.startsWith(`${DEEP_MODULE_POLICY}: `), r.ms.why);
  const stop = stopOf(r.s)!;
  assert.ok(stop, "the stopped episode is found");
  const rep = checkShape(stop.original, stop.screen, r.s.state().records);
  assert.equal(rep.reason, "teaching-not-worked");
  assert.equal(rep.skill, MC);
});

test("in a module: a missing piece OpenPath cannot teach is handed over as missing-content", () => {
  const deps: Record<string, string[]> = { [PV]: [CMP], [CMP]: [CNT] };
  const sl = structuredLearner(deps, [CMP, CNT]);
  const chain: Answerer = (q, c) => { const r = sl(q, c); if (r === question(q).answer) return r; const bug = problemOf(q.replace(/:(mc|w)$/, ""))?.bugs?.[0]?.id; return (bug && misconception(q, new Set([bug]))) || r; };
  const r = runModule(chain, PV);
  assert.equal(r.ms.phase, "pause", r.ms.reason);
  assert.ok(r.ms.why?.startsWith(`${DEEP_MODULE_POLICY}: `), `${r.ms.why} ${r.ms.reason}`);
  const stop = stopOf(r.s, PV)!;
  assert.ok(stop);
  assert.equal(checkShape(stop.original, stop.screen, r.s.state().records).reason, "missing-content");
});

test("in a module: a routine sitting-limit pause creates nothing and says nothing was sent; a later genuine stop does create one", () => {
  // slips every third answer: the episode reaches the sitting limit (40) before it settles
  const slipping = noRegroup((q, c) => ((c.answered + 1) % 3 === 0 ? wrong(q) : structuredLearner(MDEPS, [PV, CMP])(q, c)));
  const r1 = runModule(slipping);
  assert.ok(r1.deep && r1.deep.kind === "end" && r1.deep.phase === "pause", "a routine pause inside the module");
  assert.equal(r1.ms.phase, "recover", "the module stays on its recovery (place saved)");
  assert.equal(handoffReport(r1.original!, r1.deep!, r1.s.state().records), null, "no hand-off for a routine pause");
  assert.equal(stopOf(r1.s), null, "the module is not stopped");
  assert.match(ROUTINE_PAUSE, /Nothing has been sent to anyone/);
  assert.doesNotMatch(ROUTINE_PAUSE, /educator|teacher|notified|help list/i);
  // next sitting: this synthetic learner now gets nothing below the problem right; the episode stops for real and is handed over
  const never = noRegroup((q) => ([PV, CMP].includes(question(q).competency) || q.startsWith("gen:addr") ? wrong(q) : right(q)));
  const r2 = runModule(never, MC, reloadAfter(r1.s, SITTING_GAP_MS + 3_600_000, 2));
  assert.equal(r2.ms.phase, "pause");
  assert.ok(r2.ms.why?.startsWith(`${DEEP_MODULE_POLICY}: `), r2.ms.why);
  const stop = stopOf(r2.s)!;
  assert.ok(stop, "the genuine stop after the routine pause is handed over");
  assert.equal(stop.original, r1.original, "the same episode");
  assert.ok(["teaching-not-worked", "budget-exhausted", "missing-content"].includes(checkShape(stop.original, stop.screen, r2.s.state().records).reason));
});

test("in a module: no module pause of the shipped kind (no deep stop) is ever handed over", () => {
  const r = runModule(noRegroup(structuredLearner(MDEPS, [PV])));
  assert.notEqual(r.ms.phase, "pause");
  assert.equal(stopOf(r.s), null);
});

test("a learner who is taught through is never reported", () => {
  const { last, screens, records } = run("single", structuredLearner({ "fam:aupfr": [PF] }, [PF]));
  assert.ok(last.kind === "end" && (last.phase === "solved_after_help" || last.phase === "solved"), last.state.reason);
  assert.ok(screens.every((x) => handoffReport(ORIG, x, records) === null));
});

test("the learner's note says only what the server confirmed; never that a message was sent", () => {
  const open = { id: 1, skill: OWN, episode: "e", status: "open" as const, resolvedAt: null, note: "" };
  assert.equal(handoffText(null, true), NOT_SENT, "no answer from the server: the original honest note");
  assert.match(handoffText(open, true), /help list of the educator your family shared your work with/);
  assert.match(handoffText(open, true), /Nobody has been emailed or messaged/);
  assert.match(handoffText(open, false), /no educator can see it yet/);
  assert.match(handoffText(open, false), /OpenPath has not sent this to anyone/);
  const done = handoffText({ ...open, status: "resolved", resolvedAt: "2026-11-06T10:00:00Z", note: "We went through it." }, true);
  assert.match(done, /An educator marked this as dealt with on 2026-11-06\. Their note: “We went through it\.”/);
  assert.match(done, /Nothing here is counted as solved/);
  for (const t of [handoffText(open, true), handoffText(open, false), done, NOT_SENT, ROUTINE_PAUSE]) assert.doesNotMatch(t, /\b(email(ed)? (has been|was) sent|notified|we have told|your teacher has been)/i);
});
