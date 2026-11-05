/**
 * Addition with regrouping (MATH.number.addition-regroup): the carrying sub-skill is scoped and connected,
 * pending educator review. The addr family's bugs point to place-value-tens and within-20 addition
 * (prerequisite competencies), so without the sub-skill mapping and scoped strategies, a wrong carrying
 * answer routes the learner OUT of the module entirely (§16.5 of the consolidation dashboard).
 *
 * This test verifies the corrected path: wrong carrying answer → module's own carrying teaching →
 * fresh carrying check alone → save/reload → same-skill delayed check → recovery on the carrying skill.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { phasePool, problemOf, problemKeyOf } from "../../../packages/learning/src/families";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { skillUnits } from "../../../packages/learning/src/skill-units";
import { connectionConfig } from "../../../packages/learning/src/skill-connections";
import { learnerState, make } from "../../../packages/learning/src/session";
import { withDecisions } from "../../../packages/learning/src/records";
import { SliceSession } from "./session";

const C = "MATH.number.addition-regroup";
const isAddr = (q: string | null | undefined) => !!q && !!problemOf(q.replace(/:(mc|w)$/, "")) && problemOf(q.replace(/:(mc|w)$/, ""))!.family === "addr";

/** The no-regroup bug prediction: ones add up but the ten is not carried. */
const wrongCarrying = (q: string): string => {
  const p = problemOf(q.replace(/:(mc|w)$/, ""))!;
  if (q.endsWith(":mc")) {
    const opts = question(q).options!;
    const correct = question(q).answer;
    return ["A", "B", "C", "D"].find((x) => x !== correct)!;
  }
  const noRegroup = p.bugs.find((b) => b.id === "no-regroup");
  return noRegroup && typeof noRegroup.predict === "number" ? String(noRegroup.predict) : String(p.answer - 10);
};

test("connected: the module has a carrying skill unit covering all addr strategies, pending educator review", () => {
  const m = moduleFor(C)!;
  const units = skillUnits(m);
  assert.equal(units.length, 1, "one carrying skill unit");
  assert.equal(units[0].key, "addition-regroup.carrying@1");
  assert.equal(units[0].strategies.length, 3, "three non-prerequisite strategies are scoped to carrying");
  for (const s of m.strategies) {
    if (s.kind === "prerequisite") {
      assert.equal(s.scope, undefined, "prerequisite strategy has no scope");
    } else {
      assert.deepEqual(s.scope, { family: "addr", subSkill: "addition-regroup.carrying@1" });
    }
  }
  const cfg = connectionConfig(C);
  assert.ok(cfg, "addition-regroup has a SubSkillConfig");
  assert.equal(cfg!.subSkills.length, 2, "carrying and no-regroup skills");
  assert.ok(units[0].accepts("gen:addr:36,18"), "the carrying unit accepts addr questions");
  assert.ok(!units[0].accepts("gen:aeaddn:0,23,45"), "the carrying unit does not accept aeaddn questions");
});

test("real path: wrong carrying answers → module's own teaching → fresh check → save/reload → delayed check → recovery", () => {
  const at = Date.parse("2026-01-01T00:00:00Z"), s = new SliceSession("addition-regroup-carrying", C, at);
  s.events.push(make.pathway({ learnerId: s.learnerId, sessionId: s.session, at: new Date(at - 1000).toISOString() }, C));

  const diagnostics = phasePool("addr", "diagnostic").map((x) => x.replace(/:mc$/, "")).filter(isAddr);
  assert.ok(diagnostics.length >= 3, `enough diagnostic questions: ${diagnostics.length}`);
  const first = diagnostics[0];

  // First wrong carrying answer
  assert.equal(s.submit(first, wrongCarrying(first), "check").credit, false);
  const presented = [first];

  // The engine asks more questions before teaching
  let n = s.next(C);
  assert.equal(n.strategy ?? null, null, "no teaching yet after one wrong answer");
  assert.ok(n.question, "engine asks another question");
  presented.push(n.question!);
  s.submit(n.question!, isAddr(n.question) ? wrongCarrying(n.question!) : question(n.question!).answer, n.phase === "explore" ? "diagnostic" : "practice", { context: n.context });

  // Keep going until we reach teaching
  for (let i = 0; i < 6 && n.phase !== "chapter"; i++) {
    n = s.next(C);
    if (n.phase === "chapter") break;
    if (n.question) {
      presented.push(n.question);
      s.submit(n.question, isAddr(n.question) ? wrongCarrying(n.question) : question(n.question).answer, n.phase === "explore" ? "diagnostic" : "practice", { context: n.context });
    }
  }
  assert.equal(n.phase, "chapter", `reached teaching: ${n.reason}`);

  // KEY ASSERTION: the teaching strategy is one of THIS module's strategies, not a redirect to PV or within-20 addition
  assert.ok(n.strategy, "a strategy was selected");
  const m = moduleFor(C)!;
  assert.ok(m.strategies.some((st) => st.id === n.strategy!.id), `teaching is from this module: ${n.strategy!.id}`);
  assert.equal(n.competency, C, "teaching is for addition-regroup, not a prerequisite");
  assert.ok(["pending_review", "revision_required"].includes(n.contentReview?.status ?? ""), `content review status is pending or revision_required, not approved: ${n.contentReview?.status}`);
  assert.equal(n.contentReview?.educatorApproved, false);

  // Record the teaching
  presented.push(...n.strategy!.screens.flatMap((sc) => (sc.instance ? [sc.instance] : [])));
  s.taught(n);

  // Guided practice
  n = s.next(C);
  assert.equal(n.phase, "guided");
  assert.ok(isAddr(n.question), `guided question is addr: ${n.question}`);
  presented.push(n.question!);
  s.submit(n.question!, question(n.question!).answer, "guided");

  // Fresh check: must be an addr question not previously shown
  n = s.next(C);
  assert.equal(n.phase, "check", n.reason);
  assert.ok(isAddr(n.question), `check question is addr: ${n.question}`);
  assert.ok(!presented.some((x) => problemKeyOf(x) === problemKeyOf(n.question!)), `${n.question} is fresh (not a previously shown problem)`);

  // Save and reload at the check
  const saved = JSON.parse(JSON.stringify(withDecisions(s.events, s.decisions)));
  assert.deepEqual(learnerState(s.learnerId, saved, s.now, { currentSession: s.session }).module(C), s.state().module(C));
  const r = SliceSession.fromEvents(s.learnerId, C, s.events, s.now, s.session);
  Object.assign(r.decisions, s.decisions);
  assert.equal(r.next(C).question, n.question, "same question after reload");

  // Answer correctly
  assert.equal(s.submit(n.question!, question(n.question!).answer, "check").credit, true, "answered right on the check");

  // Carry on answering correctly until a delayed check is scheduled
  for (let i = 0; i < 50; i++) {
    n = s.next(C);
    if (!n.question) break;
    s.submit(n.question, question(n.question).answer, (["guided", "check", "practice", "transfer"].includes(n.phase) ? n.phase : "practice") as never);
    presented.push(n.question);
  }
  assert.equal(s.state().evidence(C).retention, "scheduled", `retention scheduled: ${s.state().module(C).reason}`);

  // Wait for the delayed check
  s.wait(8);
  n = s.next(C);
  assert.equal(n.phase, "retention");
  assert.ok(isAddr(n.question), `delayed check is an addr question: ${n.question}`);
  assert.ok(!presented.some((x) => problemKeyOf(x) === problemKeyOf(n.question!)), "delayed check is fresh");

  // Fail the delayed check
  assert.equal(s.submit(n.question!, wrongCarrying(n.question!), "retention").credit, false);

  // Recovery: the engine enters support/recover; the competency stays addition-regroup even if
  // the active prerequisite changes (scoped-teaching-priority@1 prevents re-routing during initial
  // teaching; recovery after retention failure may still check prerequisites like place-value-tens).
  const rc = s.recover(n.question!);
  assert.ok(["teach", "support", "recover"].includes(rc.phase), `recovery phase is teach/support/recover: ${rc.phase}`);
  assert.equal(rc.competency, C, "recovery competency stays addition-regroup");
  assert.equal(s.state().evidence(C).retention, "failed");
});
