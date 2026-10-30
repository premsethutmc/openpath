/**
 * Contract tests for resolution-probe@1, investigation-trigger@1 and teacher-evidence@1 (Phase 4).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { probeReading } from "../../../packages/learning/src/reasoning";
import { teacherEvidence } from "../../../packages/learning/src/teacher-evidence";
import { bugValue, Journey, respond, SCENARIOS, TARGET } from "./adaptive-journey";
import { problemOf } from "../../../packages/learning/src/families";

test("probe@1 reading is family-independent and refuses non-discriminating questions", () => {
  // a question whose problem does not model the explanation never discriminates it
  assert.equal(probeReading("gen:disc:-2,-7", "no-such-explanation").discriminates, false);
  const r = probeReading("gen:disc:-2,-7", "minus-c-sign");
  if (r.discriminates) {
    assert.ok(r.predicted.length && !r.predicted.includes(r.correct!));
    assert.equal(probeReading("gen:disc:-2,-7", "minus-c-sign", r.predicted[0]).reading, "predicted");
  }
});

test("resolution needs a discriminating answer alone after teaching; every recorded probe discriminates", async () => {
  const b = await SCENARIOS.B();
  const h = b.final.hypotheses.find((x) => x.claim)!;
  assert.equal(h.status, "resolved");
  const by = h.probes.find((p) => p.attempt === h.resolvedBy)!;
  assert.equal(by.outcome, "contradicts");
  assert.ok(by.afterTeaching && by.assistance.independent);
  for (const p of h.probes) {
    assert.equal(p.contract, "resolution-probe@1");
    assert.ok(p.prediction.values.length && !p.prediction.values.includes(p.expected.target!));
    assert.equal(probeReading(p.question, p.prediction.explanation).discriminates, true);
  }
  // the first right answer alone after teaching was not enough by itself unless it discriminated
  const firstRight = b.steps.find((s) => s.stage === "module" && s.activity === "check" && s.authoritative?.verdict === "correct")!;
  if (!probeReading(firstRight.question!, h.claim!.explanation).discriminates) assert.notEqual(by.question, firstRight.question);
});

test("an isolated unexplained slip is not investigated; repeated errors are, with the reason recorded", async () => {
  const a1 = await SCENARIOS.A1(), c = await SCENARIOS.C();
  const moduleInvestigations = (r: { steps: { stage: string; context?: string }[] }) => r.steps.filter((s) => s.stage === "module" && s.context?.startsWith("investigate:"));
  assert.equal(moduleInvestigations(a1).length, 0);
  assert.ok(moduleInvestigations(c).length > 0);
  for (const h of c.final.hypotheses) assert.ok(h.trigger.kind && h.trigger.detail);
  assert.ok(c.final.hypotheses.some((h) => h.trigger.kind === "repeated-errors" || h.trigger.kind === "modelled-error"));
  // bounded: at most two investigations begun per skill per session, each at most three follow-ups
  const per = new Map<string, number>();
  for (const s of moduleInvestigations(c)) per.set(s.context!, (per.get(s.context!) ?? 0) + 1);
  for (const n of per.values()) assert.ok(n <= 3);
});

test("teacher-evidence@1 words hypotheses as possibilities and keeps them apart from observations and policy", async () => {
  const b = new Journey("teacher-view");
  // the prerequisite-gap learner of journey B (subtracting a negative as if positive), up to the starting check
  const BUGS = new Set(["minus-c-sign", "minus-negative-as-minus"]);
  await b.topicCheck(TARGET, (q) => { const v = bugValue(problemOf(q), BUGS); return v === null ? respond(q, "right") : respond(q, v); });
  const st = b.d.state();
  const view = teacherEvidence(TARGET, st.records, st.evidence(TARGET));
  const hyp = view.statements.filter((s) => s.kind === "hypothesis");
  for (const s of hyp) {
    assert.equal(s.certainty, "suspected");
    assert.match(s.text, /^(Possible|Earlier possible|A wrong answer)/);
    assert.doesNotMatch(s.text, /\b(confirmed misconception|has the misconception|definitely)\b/i);
  }
  assert.ok(hyp.length > 0, "the view shows the hypothesis");
  assert.equal(hyp.length, hypotheses(st.records).filter((h) => h.scope.observedIn === TARGET || h.scope.about === TARGET).length);
  for (const s of view.statements.filter((x) => x.kind === "observation")) assert.ok(["verified", "unknown"].includes(s.certainty));
  assert.ok(view.statements.some((s) => s.kind === "policy"));
});

test("no discriminating probe left: the hypothesis stays open and the module carries on (never resolved without one)", async () => {
  const { make } = await import("../../../packages/learning/src/session");
  const { discriminatingProbe, openHypothesis } = await import("../../../packages/learning/src/hypotheses");
  const { moduleState } = await import("../../../packages/learning/src/intervention");
  const j = new Journey("no-probe-left");
  const BUGS = new Set(["minus-c-sign", "minus-negative-as-minus"]);
  await j.topicCheck(TARGET, (q) => { const v = bugValue(problemOf(q), BUGS); return v === null ? respond(q, "right") : respond(q, v); });
  j.d.events.push(make.teach(j.d.ctx(), TARGET, "signed_numbers", "prerequisite"));
  let h = openHypothesis(TARGET, j.d.state().records)!;
  assert.ok(h.probeDue, "taught: a discriminating probe is owed");
  // every discriminating question is used up with help (assisted answers are never resolution evidence)
  for (let i = 0; i < 400; i++) {
    const q = discriminatingProbe(h, j.d.state().records);
    if (!q) break;
    j.d.answer(q, respond(q, "right"), "practice", { hints: 1 });
  }
  const st = j.d.state();
  assert.equal(discriminatingProbe(h, st.records), null);
  h = openHypothesis(TARGET, st.records)!;
  assert.equal(h.status, "established", "kept open: assisted right answers do not resolve it");
  assert.ok(h.probes.length > 0 && h.probes.every((p) => p.outcome === "inconclusive"));
  const ms = moduleState(TARGET, st.records, st.evidence(TARGET), j.d.now, j.d.session);
  assert.ok(!(ms.phase === "verify" && ms.why?.startsWith("resolution probe")), "no probe is asked when none is left");
});
