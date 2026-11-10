/**
 * G5: the geometry learner journeys and the portability properties of the shared evidence (sub-skill projection under the geometry
 * configurations). Learners are behaviour models; every grade and decision is the real engine's.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { make } from "../../../packages/learning/src/session";
import { ANGLE_PAIRS_CONFIG, TRIANGLE_PROPERTIES_CONFIG } from "../../../packages/learning/src/subskill-config-geometry";
import { classifyQuestionWith, projectFromEventsWith } from "../../../packages/learning/src/subskill-projection";
import { GEOMETRY_JOURNEYS, runGeometryJourney, type GeometryTrace } from "./geometry-journeys";

const T: Record<string, GeometryTrace> = Object.fromEntries(GEOMETRY_JOURNEYS.map((j) => [j.id, runGeometryJourney(j)]));
const TRI = "MATH.geometry.triangle-properties", PAIRS = "MATH.geometry.angle-pairs";
const sub = (t: GeometryTrace, c: string, id: string) => t.projections[c].subSkills[id];

test("every geometry journey satisfies the ten shared scenario properties, except where the content has no eligible explanation", () => {
  for (const t of Object.values(T)) {
    const failed = t.properties.filter((p) => !p.ok).map((p) => p.property);
    // G-06 used to fail "5 eligible teaching" (no crossing-lines explanation); the vertically-opposite lesson now teaches it
    // (feat/geometry-two-skills: TP-GEO-02 as a skill-scoped template extension, pending educator review)
    assert.deepEqual(failed, [], `${t.id}: ${JSON.stringify(t.properties.filter((p) => !p.ok))}`);
  }
});

test("only trusted grader decisions: every attempt carries the server's grading-decision@1 verdict", () => {
  for (const t of Object.values(T)) for (const s of t.submissions) assert.ok(s.verdict !== null, `${t.id} ${s.q}`);
});

// method-sections@2 (2026-11-10): the lesson now shows every method the mixed delayed check asks, so it is passed; that a method
// not shown cannot pass is covered by method-alignment.test.ts (a changed explanation) and method-sections.test.ts (no gaps)
test("G-02: fresh angle-sum success survives reload, and the mixed delayed check passes after a lesson showing every method", () => {
  const t = T["G-02"];
  assert.equal(t.submissions[0].activity, "diagnostic");
  assert.equal(t.submissions[0].verdict, "incorrect");
  assert.ok(t.steps.some((s) => s.summary.startsWith("explore") || s.summary.startsWith("recover")));
  assert.ok(t.teaching.length >= 1 && t.teaching.every((x) => x.eligibility.eligible));
  assert.ok(t.submissions.some((s) => s.activity === "check" && s.verdict === "correct" && s.hints === 0));
  assert.ok(["independent", "transfer"].includes(t.authoritative[TRI].status));
  assert.deepEqual(t.authoritative[TRI].retentionHistory, ["passed"]);
  assert.equal(t.ended, "done");
  assert.deepEqual(t.replay, { identicalState: true, identicalProjection: true, identicalNextModuleDecision: true, reversedOrderProjectionIdentical: true });
});

test("failed journey needing remediation (G-03): the exterior-angle lesson is now taught; a learner who never learns does not read shown", () => {
  const t = T["G-03"];
  assert.deepEqual(t.teaching.map((x) => x.strategy), ["exterior_angle", "exterior_via_third"], "this skill's explanations, both tried");
  assert.ok(!["independent", "transfer", "verified"].includes(t.authoritative[TRI].status), `before the delayed check the competency is not claimed: ${t.authoritative[TRI].status}`);
  assert.notEqual(sub(t, TRI, "triangle-properties.exterior-angle@1").status, "independently-demonstrated");
  // a delayed check that only other skills pass is not retention evidence for it: geometry-two-skills.test.ts (skill-units@1)
});

test("straight-line (supplementary) success does not establish exterior-angle proficiency", () => {
  const t = T["G-06"];
  assert.equal(sub(t, PAIRS, "angle-pairs.complementary-supplementary@1").status, "independently-demonstrated");
  assert.equal(sub(t, TRI, "triangle-properties.exterior-angle@1").status, "not-attempted");
  assert.equal(t.authoritative[TRI].status, "not_started");
  // within angle pairs: the misconception is now taught (vertically_opposite) and the crossing-lines sub-skill is shown after it
  assert.deepEqual(t.teaching.map((x) => x.strategy), ["vertically_opposite"]);
  assert.equal(sub(t, PAIRS, "angle-pairs.intersecting-lines@1").status, "independently-demonstrated");
});

test("a correct numerical answer does not establish proof competence: geometric working is not examined (fail-closed)", () => {
  const t = T["G-07"];
  const withWorking = t.submissions.filter((s) => s.working.length);
  assert.ok(withWorking.length > 0);
  assert.ok(withWorking.every((s) => s.verdict === "correct" && s.workingVerdict === "unsupported"));
  for (const s of Object.values(t.projections[TRI].subSkills)) assert.equal(s.method, "not-established");
});

test("assisted success never becomes independent mastery (G-04)", () => {
  const t = T["G-04"];
  assert.equal(t.authoritative[TRI].status, "guided");
  assert.equal(sub(t, TRI, "triangle-properties.angle-sum@1").independentRight, 0);
  assert.notEqual(sub(t, TRI, "triangle-properties.angle-sum@1").status, "independently-demonstrated");
});

test("retention is per sub-skill: a failed delayed check on the angle sum is not recovered by other sub-skills' answers (G-05)", () => {
  const t = T["G-05"];
  assert.ok(t.authoritative[TRI].retentionHistory[0].startsWith("failed"), "the competency's own check failed, then recovered");
  // solution-scope@1: check answers after teaching are now independent, giving the sub-skill enough
  // evidence to be independently-demonstrated even after a failed retention check
  assert.equal(sub(t, TRI, "triangle-properties.angle-sum@1").status, "independently-demonstrated");
  assert.notEqual(sub(t, TRI, "triangle-properties.exterior-angle@1").retention, "failed");
});

test("an isolated slip causes no remediation (G-08)", () => {
  assert.equal(T["G-08"].teaching.length, 0);
});

test("unknown or unmapped families, client claims and forged decisions never create geometry evidence", () => {
  const c = { learnerId: "L", sessionId: "s1", at: "2026-03-02T09:00:00Z" };
  const evs = [
    { ...make.attempt(c, "gen:ahtri:36,26", "118", "diagnostic"), decision: { schema: "grading-decision@1", decidedBy: "client", verdict: "correct", working: { schema: "working-assessment@1", status: "verified", methodEvidence: "method-verified" } } },
    make.attempt({ ...c, at: "2026-03-02T09:01:00Z" }, "gen:ahpar:30,0", "150", "practice"),
  ];
  const p = projectFromEventsWith(TRIANGLE_PROPERTIES_CONFIG, "L", evs, Date.parse("2026-03-03T09:00:00Z"));
  assert.equal(p.subSkills.find((s) => s.id === "triangle-properties.angle-sum@1")!.method.status, "not-established", "a client decision is not a trusted verdict");
  assert.equal(p.subSkills.find((s) => s.id === "triangle-properties.angle-sum@1")!.method.verified, 0);
  for (const q of ["gen:zzz:1,2", "gen:ahpar:30,0", "q-not-generated", "gen:ahtri:999999,1"]) assert.equal(classifyQuestionWith(TRIANGLE_PROPERTIES_CONFIG, q).kind, "unknown", q);
  assert.equal(classifyQuestionWith(ANGLE_PAIRS_CONFIG, "gen:ahtri:36,26").kind, "unknown", "a triangle family is not angle-pairs evidence");
});

test("the shared engine files contain no geometry (or linear-equations) identifiers; the configurations hold them", () => {
  const src = (f: string) => readFileSync(new URL(`../../../packages/learning/src/${f}`, import.meta.url), "utf8");
  for (const f of ["subskill-projection.ts", "evidence.ts", "intervention.ts", "plan.ts", "records.ts", "session.ts", "server-grader.ts", "hypotheses.ts"]) {
    assert.doesNotMatch(src(f), /MATH\.geometry|"ah(tri|ext|iso|ineq)"|"af(pair|cross)"/, f);
    assert.doesNotMatch(src(f), /MATH\.algebra\.linear-equations|"lboth"|"lbrk"/, f);
  }
});
