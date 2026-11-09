/**
 * deep-recovery@0 real-app adapter (learning/deep-recovery-app.ts) and its switch (year/deep-recovery-flag.ts), driven exactly as
 * the flagged view (year/DeepRecovery.tsx) drives it: one screen from the saved records, the learner's answer or the lesson saved,
 * the next screen from the records again. Sessions are rebuilt from saved records (SliceSession.fromEvents) for reloads and
 * sign-outs. Synthetic learners only; a synthetic success is not evidence that anyone learned.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { question } from "../../../packages/learning/src/content";
import { exposureKey } from "../../../packages/learning/src/families";
import { withDecisions } from "../../../packages/learning/src/records";
import { DEEP_APP_OPTIONS, SITTING_GAP_MS, sittingLimit, deepScreen, openDeepRecoveries, type DeepScreen } from "../learning/deep-recovery-app";
import { DEEP_RECOVERY_BUILD, deepRecoveryOn } from "../year/deep-recovery-flag";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { SliceSession } from "./session";

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const single = () => structuredLearner({ "fam:aupfr": [PF] }, [PF]);
const multi = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [LS, FACT], [LS]: [L2V], [FACT]: [IDS] }, [PF, LS, L2V, FACT, IDS]);
const noContent = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IDS], [IDS]: [IADD], [IADD]: [INTS] }, [PF, FACT, IDS, IADD, INTS]);
// the backend's shapes (backend/family/learning.py DEEP_CONTEXT, DEEP_CONTEXT_LIMIT, DEEP_EPISODE)
const DEEP_CONTEXT = /^deep:[^|#@>\s]{1,120}\|[A-Za-z0-9._-]{1,80}(?:>[A-Za-z0-9._-]{1,80}){0,15}@[A-Za-z0-9._-]{1,80}$/;
const DEEP_EPISODE = /^deep:([^|#@>\s]{1,120})#(\d{4}-\d\d-\d\dT[0-9:.]+(?:Z|[+-]\d\d:\d\d))$/;

const screenOf = (s: SliceSession, orig = ORIG, o = DEEP_APP_OPTIONS) => { const st = s.state(); return deepScreen(orig, st.records, st.evidence, s.now, o); };
/** a shorter sitting, to reach a pause in a journey that the default 40 would finish in one sitting */
const SHORT = { ...DEEP_APP_OPTIONS, sessionBudget: 20 };
const teachRecs = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; episode?: string }[];
/** a reload / sign-out / another device: only the saved records come back; a new visit id; `after` ms later */
const reload = (s: SliceSession, after = 60_000) => SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + after, `s${Number(s.session.slice(1)) + 1}`);

interface Run { screens: DeepScreen[]; asks: { qid: string; phase: string; correct: boolean; context: string }[]; last: DeepScreen }
/** the flagged view's loop: show the screen, save the answer (with the screen's context) or the lesson (with its recovery id) */
function runApp(s: SliceSession, answer: Answerer, o: { orig?: string; max?: number; stopWhen?: (x: DeepScreen) => boolean; opts?: typeof DEEP_APP_OPTIONS } = {}): Run {
  const screens: DeepScreen[] = [], asks: Run["asks"] = [];
  let x = screenOf(s, o.orig);
  for (let i = 0; i < (o.max ?? 200); i++) {
    x = screenOf(s, o.orig, o.opts);
    screens.push(x);
    if (x.kind === "end" || o.stopWhen?.(x)) break;
    if (x.kind === "lesson") { s.taught(x.module, x.episode ?? undefined); continue; }
    const taughtSkills = teachRecs(s).map((t) => t.competency);
    const r = s.submit(x.qid, answer(x.qid, { taughtSkills, answered: s.replies.length, activity: x.activity }), x.activity, { context: x.context });
    asks.push({ qid: x.qid, phase: x.state.phase, correct: r.credit === true, context: x.context });
  }
  return { screens, asks, last: x };
}
const seedWrong = (id: string, orig = ORIG, comp = OWN) => { const s = new SliceSession(`synthetic-app-${id}`, comp, T0); s.submit(orig, "1", "practice"); return s; };
const checkShapes = (s: SliceSession, r: Run) => {
  for (const a of r.asks) { assert.ok(a.context.length <= 600 && DEEP_CONTEXT.test(a.context), `backend accepts ${a.context}`); }
  for (const t of teachRecs(s)) {
    assert.ok(t.episode && DEEP_EPISODE.test(t.episode), `lesson recovery id ${t.episode}`);
    const [, q, at] = DEEP_EPISODE.exec(t.episode!)!;
    assert.ok(s.state().records.attempts.some((a) => a.questionId === q && a.at === at), "the id names the original's first saved answer");
  }
};

// ---------------------------------------------------------------------------------------------------------------- the switch
test("switch: off in any build without the research define, whatever the URL or saved preference says", () => {
  assert.equal(DEEP_RECOVERY_BUILD, false, "not defined outside a research build (node, and every shipped bundle defines it false)");
  const store = new Map<string, string>([["openpath.deep-recovery@0", "on"]]);
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  assert.equal(deepRecoveryOn(false, "?deep=1", storage), false);
  assert.equal(deepRecoveryOn(), false);
  store.clear();
  assert.equal(deepRecoveryOn(true, "", storage), false, "default off in a research build too");
  assert.equal(deepRecoveryOn(true, "?deep=1", storage), true);
  assert.equal(deepRecoveryOn(true, "", storage), true, "remembered in this browser");
  assert.equal(deepRecoveryOn(true, "?deep=0", storage), false);
  assert.equal(deepRecoveryOn(true, "", storage), false);
});

test("switch: the build script defines it false unless --test --deep-recovery, and refuses --deep-recovery alone", () => {
  const script = fileURLToPath(new URL("../../scripts/build-year.mjs", import.meta.url));
  const src = readFileSync(script, "utf8");
  assert.match(src, /OPENPATH_DEEP_RECOVERY: deep \? "true" : "false"/);
  const r = spawnSync(process.execPath, [script, "--deep-recovery"], { encoding: "utf8", env: { ...process.env, DIST: "dist-deep-refused" } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /needs --test/);
  for (const f of ["../../scripts/build-curriculum.mjs", "../../scripts/build-mathematics-journey.mjs"]) {
    try { assert.doesNotMatch(readFileSync(fileURLToPath(new URL(f, import.meta.url)), "utf8"), /OPENPATH_DEEP_RECOVERY: *(?:"true"|true)/, f); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
  for (const bad of [["--deep-sitting=12"], ["--test", "--deep-sitting=12"], ["--test", "--deep-recovery", "--deep-sitting=40"], ["--test", "--deep-recovery", "--deep-sitting=x"]]) {
    const b = spawnSync(process.execPath, [script, ...bad], { encoding: "utf8", env: { ...process.env, DIST: "dist-deep-refused" } });
    assert.notEqual(b.status, 0, bad.join(" "));
    assert.match(b.stderr, /needs --test|needs --test --deep-recovery/, bad.join(" "));
  }
});

test("switch: a shipped build (no flags) never reads ?deep or the saved preference; the sitting limit stays 40", () => {
  const script = fileURLToPath(new URL("../../scripts/build-year.mjs", import.meta.url));
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "shipped-year-"));
  try {
    const r = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, DIST: relative(root, dir) } });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /deep-recovery/);
    const js = readFileSync(join(dir, "year/app.js"), "utf8");
    assert.ok(js.length > 100_000, "the bundle was built");
    assert.ok(!js.includes('get("deep")'), "the switch is folded to false: ?deep is never read");
    assert.ok(!/(?:set|remove)Item\("openpath\.deep-recovery@0"/.test(js), "nor is the saved preference");
    assert.ok(!js.includes("OPENPATH_DEEP"), "no build constant left to set at run time");
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.equal(sittingLimit(undefined), 40);
  assert.equal(sittingLimit(0), 40);
  assert.equal(sittingLimit(12), 12);
  assert.equal(sittingLimit(400), 40, "never raised above the default");
  assert.equal(DEEP_APP_OPTIONS.sessionBudget, 40, "node (no build define): the default");
});

// ---------------------------------------------------------------------------------------------------------------- journeys
test("single gap: probe -> lesson (with its recovery id) -> fresh unaided goal question, saved shapes accepted by the backend", () => {
  const s = seedWrong("single");
  const r = runApp(s, single());
  assert.equal(r.last.kind, "end");
  assert.equal(r.last.state.phase, "solved_after_help", r.last.state.reason);
  assert.deepEqual(teachRecs(s).map((t) => t.competency), [PF]);
  assert.equal(new Set(teachRecs(s).map((t) => t.episode)).size, 1);
  const goal = r.asks.filter((a) => a.phase === "return");
  assert.ok(goal.length >= 2 && goal.slice(-2).every((a) => a.correct), "two fresh unaided goal answers after help (selective rule)");
  for (const g of goal) { assert.notEqual(exposureKey(g.qid), exposureKey(ORIG)); assert.equal(question(g.qid.replace(/:(mc|w)$/, "")).competency, OWN); }
  const asked = r.asks.map((a) => exposureKey(a.qid));
  assert.equal(new Set(asked).size, asked.length, "nothing asked twice");
  checkShapes(s, r);
  assert.match((r.last as Extract<DeepScreen, { kind: "end" }>).title, /Solved after help/);
});

test("multi gap (default settings): several gaps taught bottom-up in one sitting, then fresh unaided goal questions", () => {
  const s = seedWrong("multi");
  const r = runApp(s, multi());
  assert.equal(r.last.state.phase, "solved_after_help", r.last.state.reason);
  assert.ok(teachRecs(s).length >= 3, `several gaps taught: ${teachRecs(s).map((t) => t.competency).join(", ")}`);
  const goal = r.asks.filter((a) => a.phase === "return");
  assert.ok(goal.length >= 2 && goal.slice(-2).every((a) => a.correct) && goal.every((a) => exposureKey(a.qid) !== exposureKey(ORIG)));
  for (const g of goal) assert.equal(question(g.qid.replace(/:(mc|w)$/, "")).competency, OWN);
  checkShapes(s, r);
});

test("multi gap with a short sitting: pauses; a reload inside the sitting stays paused; the next sitting resumes the same path and finishes", () => {
  let s = seedWrong("multi-pause");
  let r = runApp(s, multi(), { opts: SHORT });
  assert.equal(r.last.kind, "end");
  assert.equal(r.last.state.phase, "pause", r.last.state.reason);
  assert.match(r.last.state.reason, /Your place is saved/);
  assert.match(r.last.state.reason, /nothing is counted as solved/i);
  const paused = r.last.state;
  // reload / sign out and in again 20 minutes later: the same sitting, still paused (the page's visit id changed)
  s = reload(s, 20 * 60_000);
  const again = screenOf(s, ORIG, SHORT);
  assert.equal(again.kind === "end" && again.state.phase, "pause", "a reload does not reset the sitting budget");
  assert.deepEqual(openDeepRecoveries(s.state().records, s.state().evidence, s.now, SHORT).map((o) => o.original), [ORIG], "offered on the year page");
  let all = r;
  for (let k = 0; k < 6 && screenOf(s, ORIG, SHORT).state.phase === "pause"; k++) {
    s = reload(s, SITTING_GAP_MS + 60_000);
    const first = screenOf(s, ORIG, SHORT);
    if (k === 0) { assert.deepEqual(first.state.path, paused.path, "goal and diagnosis path restored from saved records only"); assert.equal(first.state.active, paused.next!.active); }
    r = runApp(s, multi(), { opts: SHORT });
    all = { screens: [...all.screens, ...r.screens], asks: [...all.asks, ...r.asks], last: r.last };
  }
  assert.equal(r.last.state.phase, "solved_after_help", r.last.state.reason);
  assert.ok(r.last.state.effort <= SHORT.budget!);
  const goal = all.asks.filter((a) => a.phase === "return");
  assert.ok(goal.slice(-2).every((a) => a.correct) && goal.every((a) => exposureKey(a.qid) !== exposureKey(ORIG)));
  checkShapes(s, all);
  assert.deepEqual(openDeepRecoveries(s.state().records, s.state().evidence, s.now, SHORT), [], "finished: no longer offered");
});

// ---------------------------------------------------------------------------------------------------------------- interruptions
test("interrupted mid-question and mid-lesson: a reload shows exactly the same screen, from the saved records only", () => {
  let s = seedWrong("interrupt");
  runApp(s, single(), { stopWhen: (x) => x.kind === "ask" && x.state.phase === "probe" });
  const q1 = screenOf(s);
  s = reload(s);
  const q2 = screenOf(s);
  assert.equal(q2.kind, "ask");
  assert.deepEqual([q2.kind === "ask" && q2.qid, q2.kind === "ask" && q2.context], [q1.kind === "ask" && q1.qid, q1.kind === "ask" && q1.context]);
  runApp(s, single(), { stopWhen: (x) => x.kind === "lesson" });
  const l1 = screenOf(s);
  assert.equal(l1.kind, "lesson");
  s = reload(s, 5 * 60_000);
  const l2 = screenOf(s);
  assert.equal(l2.kind === "lesson" && l2.strategy.id, l1.kind === "lesson" && l1.strategy.id, "the same lesson (its screen position is the browser's draft key)");
  assert.equal(runApp(s, single()).last.state.phase, "solved_after_help");
});

test("failed save: nothing recorded means nothing changes (same screen, no progress claimed); the retried save continues", () => {
  const s = seedWrong("failsave");
  const before = screenOf(s);
  assert.equal(before.kind, "ask");
  // the API refused or the network failed: the app keeps the answer in the box and appends nothing (Main.tsx save -> false)
  const after = screenOf(s);
  assert.deepEqual([after.kind, after.kind === "ask" && after.qid, after.state.effort], [before.kind, before.kind === "ask" && before.qid, before.state.effort]);
  // the retry is saved once: the next screen moves on
  if (before.kind === "ask") s.submit(before.qid, single()(before.qid, { taughtSkills: [], answered: 1, activity: before.activity }), before.activity, { context: before.context });
  assert.notEqual(screenOf(s).kind === "ask" && (screenOf(s) as { qid: string }).qid, before.qid);
});

// ---------------------------------------------------------------------------------------------------------------- honest stops
test("unavailable content: stops at the unteachable root, says it is OpenPath's gap, hands over to a teacher or parent, teaches nothing", () => {
  let s = seedWrong("nocontent");
  let r = runApp(s, noContent());
  for (let k = 0; k < 4 && r.last.state.phase === "pause"; k++) { s = reload(s, SITTING_GAP_MS + 60_000); r = runApp(s, noContent()); }
  assert.equal(r.last.kind, "end");
  assert.equal(r.last.state.phase, "blocked", r.last.state.reason);
  assert.ok(r.last.kind === "end" && r.last.handover);
  assert.match(r.last.state.reason, /gap in OpenPath's content, not in you/);
  assert.match(r.last.state.reason, /teacher or parent/);
  assert.equal(teachRecs(s).length, 0);
});

test("no fresh question on the original skill: an honest stop, never a substitute", () => {
  const s = seedWrong("nofresh", "di-d2", P + "calculus.definite-integrals");
  const r = runApp(s, structuredLearner({}, []), { orig: "di-d2" });
  assert.equal(r.last.kind, "end");
  assert.equal(r.last.state.phase, "escalate");
  assert.match(r.last.state.reason, /no fresh question/i);
  assert.equal(r.asks.length, 0);
});

test("old records: a history with no recovery ids (adjacency) continues through the adapter", () => {
  const s = seedWrong("old");
  runApp(s, single(), { stopWhen: (x) => x.kind === "lesson" });
  const l = screenOf(s);
  assert.equal(l.kind, "lesson");
  if (l.kind === "lesson") s.taught(l.module); // an old client: no episode on the lesson
  assert.ok(teachRecs(s).every((t) => t.episode === undefined));
  const r = runApp(reload(s), single());
  assert.equal(r.last.state.phase, "solved_after_help");
});
