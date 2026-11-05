/**
 * deep-recovery@0 phase 3: evidence isolation (sub-skills, adjacent episodes), lesson recovery ids with old-record compatibility,
 * the honest fallback when no mapped cause is found (the logarithm case), and the three confirmation rules. Synthetic learners only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { deepRecovery } from "../../../packages/learning/src/deep-recovery";
import { phasePool } from "../../../packages/learning/src/families";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { readRecords, type LearningRecord } from "../../../packages/learning/src/records";
import { learnerState, make } from "../../../packages/learning/src/session";
import { connectedSkill, connectionConfig } from "../../../packages/learning/src/skill-connections";
import { runDeep, structuredLearner, type Answerer } from "./deep-recovery-journey";
import { right, wrong } from "./learners";
import { SliceSession } from "./session";

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const LE = P + "algebra.linear-equations", LOG = P + "algebra.logarithms";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const deepGap = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [LS], [LS]: [L2V] }, [PF, LS, L2V]);
const taughtOf = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; episode?: string }[];
const decide = (s: SliceSession, o = {}) => { const st = s.state(); return deepRecovery(ORIG, st.records, st.evidence, s.now, s.session, o); };
const ctx = (s: SliceSession) => { s.now += 60_000; return { learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now).toISOString() }; };

test("sub-skills: a right answer on one easy sub-skill of a mapped prerequisite does not stand for the whole skill", () => {
  const cfg = connectionConfig(LE)!;
  const m = moduleFor(LE)!;
  // the question the phase-2 prototype would have asked first on linear equations (first fresh one, typed first)
  const qs = [...m.diagnostics, ...m.practice, ...m.transfer, ...(["diagnostic", "practice", "check"] as const).flatMap((ph) => modulePhasePool(m, ph))].filter((q) => question(q.replace(/:(mc|w)$/, "")).competency === LE);
  const firstQ = qs.find((q) => !q.endsWith(":mc")) ?? qs[0];
  const knownSub = connectedSkill(cfg, firstQ.replace(/:(mc|w)$/, ""));
  assert.ok(knownSub, `first linear-equations question ${firstQ} is mapped`);
  assert.ok(cfg.core.some((c) => c !== knownSub), "there is another core sub-skill");
  // the learner can do exactly that sub-skill of linear equations; the integral rests on linear equations
  const L: Answerer = (q) => {
    const b = q.replace(/:(mc|w)$/, "");
    const c = question(b).competency;
    if (c === LE) return connectedSkill(cfg, b) === knownSub ? right(q) : wrong(q);
    if (b.startsWith("gen:aupfr:")) return wrong(q);
    return right(q);
  };
  const s = new SliceSession("p3-subskill", OWN, T0);
  const r = runDeep(s, ORIG, L, { supportsOf: (id) => (id === OWN ? [LE] : []) });
  assert.ok(r.decisions.some((d) => d.cause === LE), `linear equations named as the cause: ${JSON.stringify(r.decisions.at(-1))}`);
  assert.ok(!taughtOf(s).some((t) => t.competency === OWN), "the integral skill itself is not taught over a prerequisite gap");
});

/** run episode A until it is asking about linear systems */
function untilAsking(s: SliceSession, skill: string, o = {}) {
  for (let k = 3; k < 30; k++) {
    const r = runDeep(s, ORIG, deepGap(), { ...o, stopAfter: k });
    const st = decide(s, o);
    if (st.phase === "probe" && st.active === skill && st.path.includes(PF)) return { st, r };
  }
  throw new Error("episode never asked about " + skill);
}

test("adjacent episodes: a lesson from another recovery is ignored by its id; adjacency alone would take it", () => {
  const s = new SliceSession("p3-adjacent", OWN, T0);
  untilAsking(s, LS);
  // the learner answers A's question on linear systems (wrong): it is now failing on A's path
  const st1 = decide(s);
  s.submit(st1.question!, wrong(st1.question!), "diagnostic", { context: st1.context! });
  const control = decide(s);
  // straight after, in the same session, ANOTHER recovery (episode B) delivers a lesson on linear systems
  s.events.push(make.teach(ctx(s), LS, moduleFor(LS)!.strategies[0].id, "diagnosis", { episode: "deep:gen:subst:1,2,1,2#2026-11-05T09:00:00.000Z" }));
  const withIds = decide(s);
  assert.deepEqual({ phase: withIds.phase, active: withIds.active, path: withIds.path, effort: withIds.effort }, { phase: control.phase, active: control.active, path: control.path, effort: control.effort });
  const adjacency = decide(s, { attribution: "adjacency" });
  assert.ok(adjacency.effort !== control.effort || adjacency.phase !== control.phase || adjacency.active !== control.active, "adjacency attribution is contaminated (documents the phase-2 defect)");
});

test("recovery ids: old records without one replay unchanged; the shipped engine ignores the field", () => {
  const c = { learnerId: "compat", sessionId: "s1", at: "2026-11-05T09:00:00.000Z" };
  const old = make.teach(c, LS, moduleFor(LS)!.strategies[0].id, "diagnosis");
  assert.ok(!("episode" in old), "records made without an id have no field at all");
  assert.deepEqual(readRecords("compat", [old]).teaching[0], { at: c.at, rule: "diagnosis", strategy: moduleFor(LS)!.strategies[0].id, competency: LS, session: "s1" });
  const tagged = make.teach(c, LS, moduleFor(LS)!.strategies[0].id, "diagnosis", { episode: "deep:x#y" });
  assert.equal(readRecords("compat", [tagged]).teaching[0].episode, "deep:x#y");
  // the same history with and without ids: identical evidence and identical shipped module decisions
  const s = new SliceSession("p3-replay", OWN, T0);
  runDeep(s, ORIG, deepGap());
  const ids = s.events as LearningRecord[];
  const stripped = ids.map((e) => { const { episode: _e, ...rest } = e as LearningRecord & { episode?: string }; return rest as LearningRecord; });
  assert.ok(ids.some((e) => (e as { episode?: string }).episode), "the run wrote ids");
  const a = learnerState(s.learnerId, ids, s.now), b = learnerState(s.learnerId, stripped, s.now);
  for (const k of [OWN, PF, LS, L2V]) {
    assert.deepEqual(a.evidence(k).status, b.evidence(k).status, k);
    const ma = a.module(k, true), mb = b.module(k, true);
    assert.deepEqual([ma.phase, ma.question, ma.strategy?.id ?? null], [mb.phase, mb.question, mb.strategy?.id ?? null], k);
  }
});

test("recovery ids: an old-style run (no ids, adjacency) reaches the same result as a run with ids", () => {
  const a = new SliceSession("p3-old", OWN, T0), b = new SliceSession("p3-new", OWN, T0);
  const ra = runDeep(a, ORIG, deepGap(), { attribution: "adjacency" }), rb = runDeep(b, ORIG, deepGap());
  assert.equal(ra.final!.phase, rb.final!.phase);
  assert.deepEqual(taughtOf(a).map((t) => t.competency), taughtOf(b).map((t) => t.competency));
  assert.ok(taughtOf(a).every((t) => t.episode === undefined) && taughtOf(b).every((t) => t.episode === rb.final!.episode));
});

test("logarithm case: no mapped cause found -> the skill itself taught once -> 'unexplained', no skill claimed", () => {
  const s = new SliceSession("p3-log", OWN, T0);
  const r = runDeep(s, ORIG, structuredLearner({ "fam:aupfr": [LOG] }, [LOG]));
  const t = taughtOf(s).map((x) => x.competency);
  assert.deepEqual(t, [OWN], "exactly one lesson, on the integral skill itself");
  assert.ok(r.decisions.some((d) => d.phase === "teach" && d.diagnosis === "own-or-unmapped"));
  assert.equal(r.final!.phase, "escalate");
  assert.equal(r.final!.diagnosis, "unexplained");
  assert.equal(r.final!.cause, null);
  assert.doesNotMatch(r.final!.reason, /logarithm/i, "it does not claim the unmapped skill");
  assert.match(r.final!.reason, /does not link|will not guess/);
});

test("own-skill case: the same path ends 'solved after help' when the integral skill itself was the gap", () => {
  const s = new SliceSession("p3-own", OWN, T0);
  const r = runDeep(s, ORIG, structuredLearner({}, [OWN]));
  assert.deepEqual(taughtOf(s).map((x) => x.competency), [OWN]);
  assert.equal(r.final!.phase, "solved_after_help");
  assert.equal(r.final!.diagnosis, "own-or-unmapped");
});

test("confirmation rules: strong learner with one slip; history decides the selective rule", () => {
  const slip: Answerer = (q, c) => (c.answered === 0 ? wrong(q) : right(q));
  const asked = (confirm: "current" | "two-fresh" | "selective", history: boolean) => {
    const s = new SliceSession(`p3-confirm-${confirm}-${history}`, OWN, T0);
    if (history) { for (const q of phasePool("aupfr", "practice").filter((x) => !x.endsWith(":mc")).slice(0, 3)) s.submit(q, right(q), "practice"); s.wait(3); }
    const before = s.replies.length;
    const r = runDeep(s, ORIG, (q, c) => slip(q, { ...c, answered: s.replies.length - before }), { confirm });
    assert.equal(r.final!.phase, "solved", `${confirm}/${history}`);
    return s.replies.length - before;
  };
  assert.equal(asked("current", false), 2);
  assert.equal(asked("two-fresh", false), 3);
  assert.equal(asked("two-fresh", true), 3);
  assert.equal(asked("selective", false), 3);
  assert.equal(asked("selective", true), 2);
});
