/**
 * deep-recovery@0 phase 4: the multiple-gap learner (reachability vs budget), resumable pauses across sittings, and negative tests
 * for evidence leaking across episodes and sub-skills and for an unavailable fresh goal question. Synthetic learners only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { deepRecovery, type DeepRecoveryOptions } from "../../../packages/learning/src/deep-recovery";
import { RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { withDecisions } from "../../../packages/learning/src/records";
import { make } from "../../../packages/learning/src/session";
import { connectedSkill, connectionConfig } from "../../../packages/learning/src/skill-connections";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { runDeep, structuredLearner, type Answerer } from "./deep-recovery-journey";
import { trace } from "../../../research/deep-recovery/tools/deep-recovery-trace4";
import { right, wrong } from "./learners";
import { SliceSession } from "./session";

const P = "MATH.";
const ORIG = "gen:aupfr:1,-3,3,-2,-4";
const OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions", LS = P + "algebra.linear-systems", L2V = P + "algebra.linear-two-variables";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", LE = P + "algebra.linear-equations";
const T0 = Date.parse("2026-11-05T09:00:00Z");
/** the phase-4 configuration under test: reuse + a 40-step sitting, 120 across sittings, evidence valid RETENTION_DAYS */
export const P4: DeepRecoveryOptions = { confirm: "selective", reuse: true, sessionBudget: 40, budget: 120, validDays: RETENTION_DAYS };
const multi = () => structuredLearner({ "fam:aupfr": [PF], [PF]: [LS, FACT], [LS]: [L2V], [FACT]: [IDS] }, [PF, LS, L2V, FACT, IDS]);
const teachSkills = (s: SliceSession) => s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as { competency: string }).competency);
const decide = (s: SliceSession, orig: string, o: DeepRecoveryOptions) => { const st = s.state(); return deepRecovery(orig, st.records, st.evidence, s.now, s.session, o); };

test("multiple gaps (held-out seed 2001): phase-3 settings stop at 40 with the goal still unreachable; phase 4 returns to a fresh goal solved unaided", () => {
  const p3 = trace("p3-selective", "O1", "multiple-gaps", 2001);
  assert.equal(p3.r.final!.phase, "escalate");
  assert.equal(p3.r.final!.effort, 40);
  assert.ok(p3.fresh, "a fresh typed goal question exists");
  assert.equal(p3.can, false, "with the four taught skills repaired the learner still cannot do the goal (partial fractions itself is missing)");
  const p4 = trace("p3-selective", "O1", "multiple-gaps", 2001, P4 as never);
  assert.equal(p4.r.final!.phase, "solved_after_help");
  assert.equal(p4.can, true);
  const returns = p4.r.steps.filter((x) => x.phase === "return");
  assert.ok(returns.length >= 2 && returns.slice(-2).every((x) => x.correct), "two fresh unaided goal answers (selective rule after help)");
  assert.ok(p4.counts.questions < p3.counts.questions + 5, "no extra questions beyond the lesson and the goal checks");
});

test("resumable pause: a sitting ends paused with the next step named, no success claimed; resuming two days later continues the same path", () => {
  const s = new SliceSession("p4-pause", OWN, T0);
  const first = runDeep(s, ORIG, multi(), { ...P4, sessionBudget: 20 });
  const f = first.final!;
  assert.equal(f.phase, "pause", f.reason);
  assert.ok(f.next && f.next.phase, "next step named");
  assert.match(f.reason, /Your place is saved/);
  assert.match(f.reason, /nothing is counted as solved/i);
  const later = SliceSession.fromEvents(s.learnerId, OWN, withDecisions(s.events, s.decisions), s.now + 2 * 86_400_000, "s2");
  const resumed = decide(later, ORIG, { ...P4, sessionBudget: 20 });
  assert.deepEqual(resumed.path, f.path, "goal and diagnosis path restored from the records");
  assert.equal(resumed.active, f.next!.active);
  let st = runDeep(later, ORIG, multi(), { ...P4, sessionBudget: 20 }).final!;
  for (let k = 3; st.phase === "pause" && k < 8; k++) { later.wait(1); st = runDeep(later, ORIG, multi(), { ...P4, sessionBudget: 20 }).final!; }
  assert.equal(st.phase, "solved_after_help", st.reason);
  assert.ok(st.effort <= 120);
});

test("resumable pause: after a long break, evidence older than the retention window is checked again, not assumed", () => {
  const run = (days: number) => {
    const s = new SliceSession(`p4-gap-${days}`, OWN, T0);
    const a = runDeep(s, ORIG, multi(), { ...P4, sessionBudget: 20 });
    assert.equal(a.final!.phase, "pause");
    const repairedBefore = new Set(a.steps.filter((x) => x.kind === "teach").map((x) => x.skill!));
    const later = SliceSession.fromEvents(s.learnerId, OWN, withDecisions(s.events, s.decisions), s.now + days * 86_400_000, "s2");
    const b = runDeep(later, ORIG, multi(), { ...P4, sessionBudget: 20 });
    return b.steps.filter((x) => x.kind === "ask" && repairedBefore.has(x.skill!)).length;
  };
  assert.equal(run(2), 0, "within the window: skills repaired before the pause are not asked again");
  assert.ok(run(RETENTION_DAYS + 23) > 0, "after 30 days: they are re-checked with fresh questions");
});

test("negative: answers and a lesson from another episode on a shared prerequisite do not leak into this one (phase-4 options)", () => {
  const POLY = P + "algebra.polynomials";
  const s = new SliceSession("p4-leak", OWN, T0);
  // episode A: the integral wrong twice; its next step is a question on polynomials (a prerequisite other episodes share)
  runDeep(s, ORIG, (q) => wrong(q), { ...P4, stopAfter: 2 });
  const control = decide(s, ORIG, P4);
  assert.equal(control.phase, "probe");
  assert.equal(control.active, POLY);
  // episode B (another original) answers polynomials right twice and teaches it, all tagged with B's own context and id
  const B = "deep:gen:aulax:0,5,5,5|";
  for (const q of moduleFor(POLY)!.practice.slice(0, 2)) s.submit(q, right(q), "diagnostic", { context: `${B}${P}calculus.indefinite-integrals@${POLY}` });
  s.now += 60_000;
  s.events.push(make.teach({ learnerId: s.learnerId, sessionId: s.session, at: new Date(s.now).toISOString() }, POLY, moduleFor(POLY)!.strategies[0].id, "diagnosis", { episode: "deep:gen:aulax:0,5,5,5#x" }));
  const after = decide(s, ORIG, P4);
  assert.deepEqual({ p: after.phase, a: after.active, path: after.path, e: after.effort }, { p: control.phase, a: control.active, path: control.path, e: control.effort });
  assert.equal(after.readings.find((r) => r.skill === POLY)?.right ?? 0, 0, "B's right answers are not A's evidence");
});

test("negative: one easy sub-skill does not stand for the whole prerequisite (phase-4 options)", () => {
  const cfg = connectionConfig(LE)!, m = moduleFor(LE)!;
  const qs = [...m.diagnostics, ...m.practice, ...m.transfer, ...(["diagnostic", "practice", "check"] as const).flatMap((ph) => modulePhasePool(m, ph))].filter((q) => question(q.replace(/:(mc|w)$/, "")).competency === LE);
  const knownSub = connectedSkill(cfg, (qs.find((q) => !q.endsWith(":mc")) ?? qs[0]).replace(/:(mc|w)$/, ""));
  const L: Answerer = (q) => { const b = q.replace(/:(mc|w)$/, ""); const c = question(b).competency; if (c === LE) return connectedSkill(cfg, b) === knownSub ? right(q) : wrong(q); return b.startsWith("gen:aupfr:") ? wrong(q) : right(q); };
  const s = new SliceSession("p4-subskill", OWN, T0);
  const r = runDeep(s, ORIG, L, { ...P4, supportsOf: (id) => (id === OWN ? [LE] : []) });
  assert.ok(r.decisions.some((d) => d.cause === LE), JSON.stringify(r.final?.reason));
  assert.ok(!teachSkills(s).includes(OWN));
});

test("negative: no fresh goal question -> an honest stop, never a pause or a substitute (phase-4 options)", () => {
  const s = new SliceSession("p4-nofresh", P + "calculus.definite-integrals", T0);
  const st0 = decide(s, "di-d2", P4);
  s.submit("di-d2", wrong("di-d2"), "original", { context: st0.context! });
  const st = decide(s, "di-d2", P4);
  assert.equal(st.phase, "escalate");
  assert.match(st.reason, /no fresh question/i);
  assert.equal(st.question, null);
});

test("old records: a phase-3 style history (no recovery ids) resumes under phase-4 options by adjacency", () => {
  const s = new SliceSession("p4-old", OWN, T0);
  runDeep(s, ORIG, multi(), { attribution: "adjacency", stopAfter: 15 });
  assert.ok(s.events.every((e) => (e as { episode?: string }).episode === undefined));
  const later = SliceSession.fromEvents(s.learnerId, OWN, withDecisions(s.events, s.decisions), s.now + 86_400_000, "s2");
  const r = runDeep(later, ORIG, multi(), { ...P4, attribution: "adjacency" });
  assert.ok(["solved_after_help", "pause"].includes(r.final!.phase), r.final!.reason);
});

test("KNOWN LIMITATION (kept visible): two right answers do not rule out lucky guessing", () => {
  // a learner who cannot do the goal but happens to get both fresh goal questions right
  let n = 0;
  const lucky: Answerer = (q) => { n++; return n === 1 ? wrong(q) : right(q); };
  const s = new SliceSession("p4-lucky", OWN, T0);
  const r = runDeep(s, ORIG, lucky, P4);
  assert.equal(r.final!.phase, "solved", "the engine cannot tell two lucky answers from knowledge");
  assert.equal(s.replies.length, 3);
});

test("regression (held-out seed 3014, phase 4): one wrong answer right after a skill's OWN lesson is not taken as 'still failing'", async () => {
  const { simulate4 } = await import("../../../research/deep-recovery/tools/deep-recovery-sim4");
  const r = simulate4("p4", "O2", "single-gap", 3014) as Record<string, unknown>;
  assert.equal(r.status, "ok");
  assert.equal(r.outcome, "solved-fresh-unaided", JSON.stringify(r.perSitting));
});
