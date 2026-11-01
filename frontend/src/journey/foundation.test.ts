import assert from "node:assert/strict";
import test from "node:test";
import { foundationPlan, FOUNDATION_POLICY, type FoundationPolicy } from "../../../packages/learning/src/foundation";
import { LINEAR_EQUATIONS_CONFIG } from "../../../packages/learning/src/subskill-evidence";
import { TRIANGLE_PROPERTIES_CONFIG } from "../../../packages/learning/src/subskill-config-geometry";
import { ADDITION_CONFIG } from "../../../packages/learning/src/subskill-config-addition";
import { projectFromEventsWith, type SubSkillConfig } from "../../../packages/learning/src/subskill-projection";
import { withDecisions } from "../../../packages/learning/src/records";
import { graph } from "../../../packages/learning/src/graph";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { gradeRequest, gradeRequestAsync } from "../../../packages/learning/src/server-grader";
import { replayWorking } from "../../../packages/learning/src/grading/working";
import { SliceSession } from "./session";
const start = Date.parse("2026-01-01T00:00:00Z");
const policy = (config: SubSkillConfig): FoundationPolicy => ({ version: FOUNDATION_POLICY, config, requirements: config.core.map((skill) => ({ skill, method: false })) });
const events = (s: SliceSession) => withDecisions(s.events, s.decisions);
for (const config of [LINEAR_EQUATIONS_CONFIG, TRIANGLE_PROPERTIES_CONFIG, ADDITION_CONFIG]) test(`coverage, reload, retention and same-skill recovery: ${config.competency}`, () => {
  const s = new SliceSession("foundation", config.competency, start), p = policy(config);
  s.foundation = p;
  let plan = foundationPlan(p, s.learnerId, events(s), s.now);
  assert.equal(plan.status, "unobserved");
  for (let i = 0; i < 40 && plan.status !== "shown"; i++) {
    assert.ok(plan.question, JSON.stringify(plan));
    const q = question(plan.question);
    assert.equal(s.submit(q.id, q.answer, "check").credit, true);
    plan = foundationPlan(p, s.learnerId, events(s), s.now);
  }
  assert.equal(plan.status, "shown");
  const saved = JSON.parse(JSON.stringify(events(s)));
  assert.deepEqual(foundationPlan(p, s.learnerId, saved, s.now), plan);
  assert.deepEqual(foundationPlan(p, s.learnerId, saved.reverse(), s.now), plan);
  s.now += 8 * 86400000;
  const due = foundationPlan(p, s.learnerId, events(s), s.now);
  assert.equal(due.status, "retention"); assert.ok(due.question);
  s.submit(due.question, "-999", "retention");
  const recover = foundationPlan(p, s.learnerId, events(s), s.now);
  assert.equal(recover.status, "recovery"); assert.equal(recover.skill, due.skill);
  for (let i = 0; i < 2; i++) {
    const next = foundationPlan(p, s.learnerId, events(s), s.now); assert.equal(next.skill, due.skill); assert.ok(next.question);
    s.submit(next.question, question(next.question).answer, "check");
  }
  assert.notEqual(foundationPlan(p, s.learnerId, events(s), s.now).status, "recovery");
});
test("geometry observations never establish or refute learner reasoning; timeout preserves answer", async () => {
  const id = "gen:ahtri:16,44";
  for (const conclusion of ["entailed", "refuted", "unknown"] as const) {
    const r = await gradeRequestAsync({ id, response: question(id).answer, working: ["by the exterior angle theorem"] }, async (q) => ({ checker: "geometry", version: "experimental", questionId: q.questionId, competency: q.competency, conclusion }));
    assert.equal(r.credit, true); assert.equal(r.decision?.working?.status, "unsupported");
    assert.equal(r.decision?.working?.methodEvidence, "no-method-evidence");
    assert.equal(r.decision?.working?.observation?.methodAuthority, false);
  }
  const r = await gradeRequestAsync({ id, response: question(id).answer, working: ["a valid alternative"] }, () => new Promise(() => {}));
  assert.equal(r.credit, true); assert.equal(r.decision?.working?.status, "unsupported");
});
test("answer-only, invalid-method, replay and cross-task evidence binding", () => {
  const id = "le-ref-3x-19-4";
  for (const working of [["x = 5"], ["3x = 16", "x = 5"], ["3x = 15", "x = 5"]]) {
    const d = gradeRequest({ id, response: "5", working }).decision!;
    assert.equal(d.verdict, "correct"); assert.equal(replayWorking(d).replay, "replayable-current");
    assert.equal(replayWorking({ ...d, working: { ...d.working!, replayed: !d.working!.replayed } }).replay, "failed-replay");
    assert.equal(replayWorking({ ...d, working: { ...d.working!, provenance: { ...d.working!.provenance!, questionId: "other" } } }).replay, "failed-replay");
  }
  const s = new SliceSession("binding", TRIANGLE_PROPERTIES_CONFIG.competency, start);
  const q = "gen:ahtri:16,44"; s.submit(q, question(q).answer, "check", { working: ["3x = 15", "x = 5"] });
  const forged = gradeRequest({ id, response: "5", working: ["3x = 15", "x = 5"] }).decision!;
  const es = events(s).map((e) => e.record === "attempt" ? { ...e, decision: { ...forged, schema: "grading-decision@1" as const, decisionId: "forged", decidedBy: "server" as const } } : e);
  const p = projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG, s.learnerId, es, s.now);
  assert.equal(p.subSkills.find((x) => x.id.includes("angle-sum"))!.method.verified, 0);
});

test("untrusted decisions cannot satisfy coverage; unsupported method requirements stop honestly", () => {
  const c = TRIANGLE_PROPERTIES_CONFIG, p = policy(c), s = new SliceSession("untrusted", c.competency, start);
  for (let i = 0; i < 25; i++) {
    const plan = foundationPlan(p, s.learnerId, events(s), s.now);
    if (plan.status === "shown") break;
    assert.ok(plan.question); s.submit(plan.question, question(plan.question).answer, "check");
  }
  const forged = events(s).map((e) => e.record === "attempt" ? { ...e, decision: { ...e.decision!, decidedBy: "client" } } : e);
  assert.notEqual(foundationPlan(p, s.learnerId, forged, s.now).status, "shown");
  const methods = { ...p, requirements: p.requirements.map((r) => ({ ...r, method: true })) };
  assert.equal(foundationPlan(methods, s.learnerId, events(s), s.now).status, "unavailable");
});

test("lesson review remains assistance after save/reload", () => {
  const s = new SliceSession("review", ADDITION_CONFIG.competency, start);
  const first = foundationPlan(policy(ADDITION_CONFIG), s.learnerId, [], s.now);
  assert.ok(first.question);
  // This is the existing append-only teach record, with a review-specific reason.
  s.events.push({ kind: "learning_record", id: "review-exposure", at: new Date(start).toISOString(), learnerId: s.learnerId, sessionId: s.session,
    record: "teach", competency: ADDITION_CONFIG.competency, strategy: "worked_steps", rule: "foundation-lesson-review@1" });
  s.submit(first.question, question(first.question).answer, "check");
  const p = projectFromEventsWith(ADDITION_CONFIG, s.learnerId, JSON.parse(JSON.stringify(events(s))), s.now);
  assert.equal(p.subSkills.reduce((n, x) => n + x.attempts.independentRight, 0), 0);
  assert.equal(p.subSkills.reduce((n, x) => n + x.attempts.assistedRight, 0), 1);
});


test("explicit higher target uses prerequisites rather than an enrolment ceiling", () => {
  const s = new SliceSession("upward", LINEAR_EQUATIONS_CONFIG.competency, start);
  s.events.push({ kind: "learning_record", record: "enrol", id: "placement", learnerId: s.learnerId, sessionId: s.session, at: new Date(start).toISOString(), grade: 1, academicYear: "2026-27", curriculum: { id: "placement-fixture", version: "1", hash: "fixture" } });
  const p = { ...policy(LINEAR_EQUATIONS_CONFIG), placement: "readiness" as const };
  s.submit("gen:aaadd:1,2", "3", "check");
  const before = foundationPlan(p, s.learnerId, events(s), s.now);
  assert.equal(before.status, "unavailable"); assert.match(before.reason, /prerequisites/);
  for (const r of graph.relationsOf(p.config.competency).filter((r) => r.type === "mandatory" || r.type === "plausible")) {
    const m = moduleFor(r.from); assert.ok(m, r.from);
    for (const q of [...m.diagnostics, ...m.practice, ...m.transfer]) {
      if (["independent", "transfer", "verified"].includes(s.state().evidence(r.from).status)) break;
      s.submit(q, question(q).answer, "check");
    }
    assert.ok(["independent", "transfer", "verified"].includes(s.state().evidence(r.from).status), r.from);
  }
  const after = foundationPlan(p, s.learnerId, events(s), s.now);
  assert.ok(after.question, after.reason); assert.equal(question(after.question).competency, p.config.competency);
  assert.notEqual(after.status, "shown");
});

test("typed geometry working is preserved by the existing learner flow", async () => {
  const { SliceFlow } = await import('./flow');
  const f = new SliceFlow("gen:ahtri:16,44", "geometry-working", start);
  f.on({ type: "answer_submitted", value: "By the triangle angle sum; 120" });
  const d = f.session.replies.at(-1)?.decision;
  assert.equal(d?.verdict, "correct");
  assert.deepEqual(d?.response.working, ["By the triangle angle sum", "120"]);
  assert.equal(d?.working?.status, "unsupported");
});


test("symbolic answers remain answers and oversized working stays editable", async () => {
  const { SliceFlow } = await import('./flow');
  const symbolic = new SliceFlow("gen:asdist3:-5,-5,-5,-2,-2,-3", "symbolic", start);
  symbolic.on({ type: "answer_submitted", value: "sqrt(22)" });
  assert.equal(symbolic.session.replies.at(-1)?.decision?.response.raw, "sqrt(22)");
  assert.equal(symbolic.session.replies.at(-1)?.decision?.verdict, "correct");
  const f = new SliceFlow("gen:ahtri:16,44", "oversized-working", start);
  f.on({ type: "answer_submitted", value: "a".repeat(81) + "; 120" });
  assert.equal(f.stage, "question");
  assert.equal(f.session.replies.length, 0);
  assert.match(f.spec.feedback.message ?? "", /still in the input/);
  f.on({ type: "answer_submitted", value: "Angle sum; 120" });
  assert.equal(f.session.replies.at(-1)?.decision?.verdict, "correct");
});
