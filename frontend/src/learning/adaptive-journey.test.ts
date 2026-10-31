/**
 * adaptive-journey@1 (one Grade 10 competency, end to end through the production engine; synthetic learners only).
 * The assertions are the safeguards; the controller under test knows nothing about these scenarios.
 * Set OPENPATH_JOURNEY_TRACES=<dir> to also write the machine-readable traces.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { quarantined } from "../../../packages/learning/src/question-status";
import { SCENARIOS, TARGET, type TraceStep } from "./adaptive-journey";

const SUPPORT = "MATH.number.integer-add";
type Snap = NonNullable<TraceStep["evidenceAfter"]>;
type Run = { scenario: string; steps: TraceStep[]; slipped?: string | null; retentionSlip?: string | null; final: { target: Snap; afterSlip?: Snap; support?: Snap; next: unknown } };
const runs: Partial<Record<keyof typeof SCENARIOS, Run>> = {};
const run = async (k: keyof typeof SCENARIOS) => (runs[k] ??= (await SCENARIOS[k]()) as Run);
const asked = (r: Run) => r.steps.filter((s) => s.question);
const teaches = (r: Run) => r.steps.filter((s) => s.intervention?.strategy && s.phase === "chapter");
const supportItems = (r: Run) => r.steps.filter((s) => s.stage === "plan").flatMap((s) => s.planItems ?? []).filter((i) => i.competency !== TARGET && /support|builds on|shaky/i.test(i.reason));

function common(r: Run) {
  for (const s of asked(r)) {
    assert.equal(quarantined(s.question!), false, `quarantined question asked: ${s.question}`);
    assert.equal(s.questionStatus?.quarantined, false);
    if (s.question!.startsWith("gen:")) assert.equal(s.questionStatus?.formCertified, true, `uncertified form asked: ${s.question}`);
    // authoritative grading decides what is recorded: an unresolved decision is never an attempt
    if (s.authoritative?.verdict === "unresolved") assert.equal(s.recordedAsAttempt, false);
    // E7 is an annotation only
    assert.equal((s.e7Shadow as { advisory: boolean }).advisory, true);
  }
}

test("A1: one slip on a fresh question alone keeps demonstrated independence and triggers no remediation", async () => {
  const r = await run("A1");
  common(r);
  assert.ok(r.slipped, "the learner slipped once");
  assert.ok(["independent", "transfer"].includes(r.final.afterSlip!.status), r.final.afterSlip!.status);
  assert.equal(teaches(r).length, 0, "no teaching after a single slip");
  assert.equal(supportItems(r).length, 0, "no prerequisite in any plan");
  assert.ok(["independent", "transfer", "verified"].includes(r.final.target.status));
});

test("A2: one slip on the delayed check: no remediation and no lost evidence (status → review is reported, not asserted)", async () => {
  const r = await run("A2");
  common(r);
  assert.ok(r.retentionSlip);
  assert.equal(teaches(r).length, 0);
  assert.equal(supportItems(r).length, 0);
  assert.ok(r.final.target.independent.right >= r.final.afterSlip!.independent.right);
});

test("B: a repeated prerequisite misconception is established, taught, and reassessed alone on a new question", async () => {
  const r = await run("B");
  common(r);
  const est = r.steps.find((s) => s.finding && !s.finding.resolved)!;
  assert.ok(est, "a finding was established");
  assert.equal(est.finding!.competency, SUPPORT);
  // the supporting skill was assessed (its own diagnostic questions) before any teaching
  const firstTeach = r.steps.findIndex((s) => s.phase === "chapter");
  assert.ok(r.steps.slice(0, firstTeach).some((s) => s.competency === SUPPORT && s.question));
  const t = r.steps[firstTeach];
  assert.equal(t.competency, TARGET);
  assert.equal(t.intervention!.strategy!.kind, "prerequisite");
  // the guided question counts as help; the next question alone is a new one and counts as independent evidence
  const after = r.steps.slice(firstTeach + 1).filter((s) => s.question);
  const guided = after.find((s) => s.activity === "guided")!;
  assert.equal(guided.evidenceAfter!.independent.total, guided.evidenceBefore!.independent.total);
  assert.equal(guided.evidenceAfter!.assisted.total, guided.evidenceBefore!.assisted.total + 1);
  const alone = after.find((s) => s.activity === "check")!;
  assert.ok(!r.steps.slice(0, firstTeach).some((s) => s.question === alone.question), "reassessed on a question not seen before");
  assert.equal(alone.authoritative!.verdict, "correct");
  assert.equal(alone.evidenceAfter!.independent.total, alone.evidenceBefore!.independent.total + 1);
  assert.equal(r.steps.at(-1)!.finding?.resolved, true);
});

test("C: success only with hints is never independent mastery", async () => {
  const r = await run("C");
  common(r);
  assert.ok(r.final.target.assisted.right > 0);
  assert.equal(r.final.target.independent.right, 0);
  assert.ok(!["independent", "transfer", "verified"].includes(r.final.target.status), r.final.target.status);
  for (const s of asked(r).filter((x) => x.activity === "guided")) assert.equal(s.evidenceAfter!.independent.right, s.evidenceBefore!.independent.right);
  assert.equal(r.steps.at(-1)!.stage === "module" ? r.steps.at(-1)!.phase : r.steps.filter((s) => s.stage === "module").at(-1)!.phase, "pause");
});

test("A3 (defect reproduction): two separate slips; recorded, not asserted as correct behaviour", async () => {
  const r = await run("A3");
  common(r);
  assert.equal(supportItems(r).length, 0);
  const dir = process.env.OPENPATH_JOURNEY_TRACES;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    for (const k of Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]) {
      const x = await run(k);
      writeFileSync(join(dir, `${k}.json`), JSON.stringify({ schema: "adaptive-journey-trace@1", target: TARGET, learner: "synthetic (scripted answers; engine decisions unscripted)", ...x }, null, 1) + "\n");
    }
  }
});

export type { TraceStep };
