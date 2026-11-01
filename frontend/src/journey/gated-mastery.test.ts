/**
 * M1: the 16 learner journeys for sub-skill-gated mastery (shadow), through the real session (trusted grader, D1 working verdicts, records,
 * learnerState). The proposed policy must never change the authoritative state, the next question, or the stored events.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { phasePool } from "../../../packages/learning/src/families";
import { gatedMastery, isChoice, proposedRetentionPlan } from "../../../packages/learning/src/gated-mastery";
import { COMPETENCY, projectFromEvents } from "../../../packages/learning/src/subskill-evidence";
import { Learner, runGatedJourneys, type GatedTrace } from "./gated-journeys";

const R = runGatedJourneys(phasePool), j = (n: number) => R.find((r) => r.id === n)!;
const P = (t: GatedTrace, v = "gated") => t.comparison.proposed[v];
const sub = (t: GatedTrace, k: string, v = "gated") => P(t, v).subSkills[k];
const claims = (t: GatedTrace) => t.comparison.existing.claimsCompetence;
const shown = (s: string) => s === "independently-demonstrated" || s === "retention-due";

test("16 journeys run", () => assert.equal(R.length, 16));
test("1–4: one sub-skill alone never demonstrates the competency (the existing status does: disagreement reported)", () => {
  for (const [n, k] of [[1, "two-step"], [2, "both-sides"], [3, "brackets"], [4, "modelling"]] as const) {
    assert.ok(claims(j(n)), `${n}: existing claims`); assert.equal(P(j(n)).status, "developing"); assert.deepEqual(P(j(n)).shown, [k]);
    assert.equal(P(j(n)).missing.length, 3); assert.ok(j(n).comparison.disagreements.some((d) => d.variant === "gated"));
  }
});
test("5: every core sub-skill shown → demonstrated under every variant, no disagreement", () => {
  for (const v of ["gated", "gated-method", "gated-slip"]) assert.equal(P(j(5), v).status, "independently-demonstrated");
  assert.equal(j(5).comparison.disagreements.filter((d) => d.variant !== "gated-typed").length, 0);
  // gated-typed: modelling was shown only through auleq, a choice item → withheld (an over-restriction reported in 04/07)
  assert.deepEqual(P(j(5), "gated-typed").missing, ["modelling"]);
  assert.equal(sub(j(5), "two-step").method, "verified (verified 2, false step 0)");
});
test("6: a right answer with trusted invalid working does not establish two-step; a forged client verdict is never accepted as verified", () => {
  assert.notEqual(sub(j(6), "two-step").status, "independently-demonstrated"); assert.match(sub(j(6), "two-step").method, /^contradicted/);
  assert.equal(P(j(6)).status, "developing"); assert.ok(claims(j(6)));
  // replacing the server's "invalid working" decision by a client one must not turn the answers into credit (provenance guard)
  const f = j(6).extra!.forgedClientVerdict as { gated: string; twoStep: string; verified: number; gatedMethod: string; twoStepMethod: string };
  assert.equal(f.verified, 0); assert.notEqual(f.twoStepMethod, "verified"); assert.equal(f.gatedMethod, "developing");
  assert.equal(f.gated, "developing"); assert.ok(!shown(f.twoStep));
});
test("7: bare right answers: answers shown, method not established (gated-method separates them)", () => {
  assert.equal(P(j(7)).status, "independently-demonstrated");
  for (const k of ["two-step", "both-sides", "brackets"]) assert.match(sub(j(7), k).method, /^not-established/);
  assert.equal(P(j(7), "gated-method").status, "developing"); assert.deepEqual(P(j(7), "gated-method").shown, ["modelling"]);
});
test("8: assisted success is recorded as assisted and demonstrates nothing", () => {
  assert.equal(P(j(8)).status, "insufficient-evidence"); assert.equal(sub(j(8), "two-step").assisted, "3/3"); assert.equal(sub(j(8), "two-step").independent, "0/0");
  assert.equal(j(8).comparison.existing.status, "guided");
});
test("9: repeated guesses: never demonstrate the competency; multiple-choice guesses demonstrate nothing under gated-typed", () => {
  for (const v of ["gated", "gated-typed", "gated-method", "gated-slip"]) assert.ok(!shown(P(j(9), v).status), v);
  // choice items (":mc" variants AND auleq, a four-option item without the suffix) never demonstrate a sub-skill under gated-typed
  assert.deepEqual(P(j(9), "gated-typed").shown, []);
  for (const k of ["two-step", "both-sides", "brackets", "modelling"]) assert.equal(sub(j(9), k, "gated-typed").independent, "0/0", k);
});
test("10: a failed delayed check affects only that sub-skill; history kept; the plan sampled both-sides and brackets", () => {
  const t = j(10); assert.equal(P(t).status, "recovery-required"); assert.deepEqual(P(t).recoveryRequired, ["brackets"]);
  assert.ok(sub(t, "brackets").historical); assert.ok(P(t).historicalAchievement);
  for (const k of ["two-step", "both-sides", "modelling"]) assert.ok(shown(sub(t, k).status), k);
  const plan = t.extra!.checkPlan as { subSkill: string; questions: string[]; unchecked: boolean }[];
  assert.deepEqual(plan.map((p) => p.subSkill.split(".")[1].replace("@1", "")).sort(), ["both-sides", "brackets", "modelling", "two-step"]);
  for (const p of plan) { assert.ok(!p.unchecked); assert.ok(p.questions.every((q) => !isChoice(q)), p.subSkill); }
  assert.ok(plan.find((p) => p.subSkill.includes("modelling"))!.questions.every((q) => q.startsWith("gen:aulwp:")));
  assert.ok(t.comparison.existing.recoveryRequired);
});
test("11: recovery needs new independent success on brackets", () => {
  const t = j(11), b = t.extra!.beforeRecovery as { gated: string; recoveryRequired: string[] };
  assert.equal(b.gated, "recovery-required"); assert.equal(P(t).status, "independently-demonstrated"); assert.equal(P(t).recoveryRequired.length, 0);
});
test("12: unrelated success does not clear brackets recovery (the existing competency-wide recovery is cleared: disagreement)", () => {
  const t = j(12); assert.deepEqual(P(t).recoveryRequired, ["brackets"]); assert.ok(claims(t)); assert.ok(!t.comparison.existing.recoveryRequired);
  assert.ok(t.comparison.disagreements.some((d) => d.variant === "gated" && /brackets/.test(d.why)));
});
test("13: one careless slip: a practice slip keeps the demonstration; a one-wrong delayed check fails under gated, not under gated-slip", () => {
  const t = j(13), a = t.extra!.afterPracticeSlip as { gated: string };
  assert.equal(a.gated, "independently-demonstrated");
  assert.deepEqual(P(t).recoveryRequired, ["brackets"]); assert.equal(P(t, "gated-slip").status, "independently-demonstrated");
});
test("14: historical replay: an older authority's verdicts stay historical (never upgraded); records from before D1 have no method; deterministic", () => {
  const x = j(14).extra as { current: { verified: number[]; method: string }; olderAuthority: { verified: number[]; method: string; gated: string }; beforeD1: { verified: number[]; method: string; gated: string }; replayIdentical: boolean; olderAuthorityFalseStep: { gated: string; twoStep: string; twoStepMethod: string } };
  assert.deepEqual(x.current.verified, [2, 2, 2, 0]); assert.deepEqual(x.olderAuthority.verified, [0, 0, 0, 0]); assert.deepEqual(x.beforeD1.verified, [0, 0, 0, 0]);
  assert.equal(x.olderAuthority.gated, "independently-demonstrated"); assert.equal(x.olderAuthority.method, "developing"); assert.equal(x.beforeD1.method, "developing");
  assert.ok(x.replayIdentical);
  // a false step recorded by an older authority is kept as recorded (not regraded away): still contradicted
  assert.equal(x.olderAuthorityFalseStep.twoStepMethod, "contradicted"); assert.ok(!shown(x.olderAuthorityFalseStep.twoStep)); assert.equal(x.olderAuthorityFalseStep.gated, "developing");
});
test("15: an unknown/unmapped family contributes nothing (modelling stays missing)", () => {
  const t = j(15); assert.equal(P(t).unknown, 3); assert.deepEqual(P(t).missing, ["modelling"]); assert.equal(sub(t, "modelling").status, "not-attempted"); assert.ok(claims(t));
});
test("16: restart, reversed store order and client-supplied mastery fields give the identical comparison", () => {
  assert.deepEqual(j(16).extra, { identicalAfterRestart: true, identicalWithReversedStoreOrder: true, clientClaimsIgnored: true });
});
test("a sub-skill with no fresh retention item is reported unchecked, never passed", () => {
  const l = new Learner("unchecked", phasePool); l.allCore(); l.s.wait(8);
  const plan = proposedRetentionPlan(l.s.learnerId, l.events(), l.s.now, { pool: (f) => (f === "lbrk" ? [] : phasePool(f, "retention")) });
  const b = plan.find((p) => p.subSkill.includes("brackets"))!;
  assert.equal(b.unchecked, true); assert.deepEqual(b.questions, []);
  assert.equal(l.compare().proposed.gated.subSkills.find((s) => s.id.includes("brackets"))!.status, "retention-due");
});
test("the shadow policy never changes the authoritative state, the next question or the events", () => {
  const l = new Learner("shadow", phasePool); l.right(l.fresh("lin", "practice", 3));
  const n = l.s.events.length, before = JSON.stringify(l.s.state().evidence(COMPETENCY)), next = JSON.stringify(l.s.next()).replace(/"at":"[^"]*"/g, "");
  for (let i = 0; i < 3; i++) { l.compare(); l.plan(); }
  assert.equal(l.s.events.length, n); assert.equal(JSON.stringify(l.s.state().evidence(COMPETENCY)), before);
  assert.equal(JSON.stringify(l.s.next()).replace(/"at":"[^"]*"/g, ""), next);
  assert.equal(l.compare().existing.status, JSON.parse(before).status);
});
test("gated-slip: a lone wrong answer in a delayed check is not a pass (the sub-skill is not shown until the check completes)", () => {
  const l = new Learner("slip-alone", phasePool); l.allCore(); l.s.wait(8);
  l.answer(l.fresh("lbrk", "retention", 1)[0], false, { activity: "retention" });
  const g = l.compare().proposed;
  assert.equal(g["gated-slip"].subSkills.find((s) => s.id.includes("brackets"))!.status, "developing"); assert.ok(!shown(g["gated-slip"].status));
  assert.deepEqual(g.gated.recoveryRequired.map((x) => x.split(".")[1]), ["brackets@1"]);
});
test("default options reproduce E1 exactly: the gated variant's per-sub-skill statuses are E1's", () => {
  for (const t of [1, 5, 6, 10, 12, 13]) {
    const l = new Learner(`eq${t}`, phasePool); l.allCore(); l.right(l.fresh("lin", "practice", 2), { working: "invalid" }); l.s.wait(8);
    for (const p of l.plan()) p.questions.forEach((q, i) => l.answer(q, i !== 0 || t % 2 === 0, { activity: "retention" }));
    const e1 = projectFromEvents(l.s.learnerId, l.events(), l.s.now), g = gatedMastery(l.s.learnerId, l.events(), l.s.now);
    for (const s of g.subSkills) assert.equal(s.status, e1.subSkills.find((x) => x.id === s.id)!.status);
  }
});
