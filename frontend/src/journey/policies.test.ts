/**
 * Milestone 2 closure: regression tests for the three adaptive policy decisions, through the integrated components (real grader, records,
 * evidence and adaptive engine; only learner actions scripted).
 *   A  isolated slip: completing the starting assessment is distinguished from investigating a misconception
 *   B  failed delayed check: earlier achievement kept, current verification withdrawn, recovery required, and it drives the next step
 *   C  recovery with no prerequisite gap: the skill itself is taught once through the eligibility gate, rechecked alone, then a person
 */
import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { graph } from "../../../packages/learning/src/graph";
import { hypotheses } from "../../../packages/learning/src/hypotheses";
import { moduleState, RETRY_LIMIT } from "../../../packages/learning/src/intervention";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { learners, misconception, right, wrong } from "./learners";
import { runScenario, SCENARIOS, T0, type Scenario } from "./scenarios";

const phasesAfter = (r: ReturnType<typeof runScenario>, n: number) => r.f.session.trace.filter((t) => t.n > n && t.component === "intervention.moduleState").map((t) => t.output as { phase: string; context: string | null });
const firstWrong = (r: ReturnType<typeof runScenario>) => r.f.session.trace.find((t) => t.decides === "correctness" && (t.output as { verdict: string }).verdict === "incorrect")!;
const S = (o: Partial<Scenario> & Pick<Scenario, "learner">): Scenario => ({ id: "policy", category: 1, start: "gen:lin:2,17,11", expect: {}, ...o });

test("A1 an unexplained slip after the skill is shown: no further assessment, no investigation, no teaching; the observation is kept", () => {
  for (const k of [3, 4, 5]) {
    const r = runScenario(S({ learner: () => learners.oneSlip(k) }));
    const after = phasesAfter(r, firstWrong(r).n);
    assert.ok(!after.some((p) => p.phase === "explore" || p.phase === "chapter" || p.phase === "recover" || String(p.context ?? "").startsWith("investigate:")), `slip at ${k}: ${after.map((p) => p.phase)}`);
    const recs = r.f.session.state().records;
    assert.equal(recs.attempts.filter((a) => a.credit === false).length, 1, "the slip stays in the record");
    assert.equal(hypotheses(recs).filter((h) => h.status === "established").length, 0);
  }
});

test("A2 a slip before any evidence: the starting check continues only until the diagnosis is decided; it is assessment, not investigation", () => {
  const r = runScenario(S({ learner: () => learners.oneSlip(1) }));
  const after = phasesAfter(r, firstWrong(r).n);
  const explore = after.filter((p) => p.phase === "explore");
  assert.ok(explore.every((p) => !String(p.context ?? "").startsWith("investigate:")), "starting-check questions carry no investigate: context");
  const m = moduleFor(question("gen:lin:2,17,11").competency)!;
  assert.ok(explore.length <= m.diagnostics.length, `at most the module's own diagnostic questions (${explore.length})`);
  assert.equal(r.f.session.events.filter((e) => (e as { record?: string }).record === "teach").length, 0, "no teaching");
});

test("A3 a wrong answer that a modelled misconception predicts is investigated (with investigate: context), even from a strong learner", () => {
  // strong, but answers the forgot-divide value once on a later practice question: this is evidence, not a slip
  let used = false;
  const r = runScenario(S({ learner: () => ({ name: "strong, one modelled error", act: (v) => { const m = misconception(v.q, new Set(["forgot-divide"])); if (!used && v.answered >= 3 && m) { used = true; return { answer: m }; } return { answer: right(v.q) }; } }) }));
  const after = phasesAfter(r, firstWrong(r).n);
  assert.ok(after.some((p) => String(p.context ?? "").startsWith("investigate:")), `investigated: ${after.map((p) => `${p.phase}:${p.context}`).slice(0, 4)}`);
});

test("B a failed delayed check withdraws current verification, requires recovery, keeps the earlier achievement, and drives the next step", () => {
  const r = runScenario(S({ learner: () => learners.strong() }));
  const before = r.f.session.state().evidence(r.f.session.competency);
  assert.ok(["independent", "transfer"].includes(before.status));
  const shownAt = before.independentAt;
  // eight days later the learner fails the delayed check: stop right after that answer
  r.f.later(8);
  assert.equal(r.f.currentPhase, "retention");
  r.f.on({ type: "answer_submitted", value: wrong(r.f.currentQuestion!), timestamp: 0 });
  const st = r.f.session.state(), ev = st.evidence(r.f.session.competency);
  assert.equal(ev.status, "review");
  assert.equal(ev.verified, false);
  assert.equal(ev.recoveryRequired, true);
  assert.equal(ev.independentAt, shownAt, "earlier achievement is kept");
  assert.equal(ev.retentionHistory[0].result, "failed");
  const ms = moduleState(r.f.session.competency, st.records, ev, r.f.session.now, r.f.session.session, null, st.evidence);
  assert.notEqual(ms.phase, "done", "a failed check is not treated as done");
  assert.ok(ms.question, `the engine asks for recovery work (${ms.phase})`);
  // recovery: right alone on fresh questions -> the requirement lifts, a new delayed check is scheduled, still not verified
  r.f.on({ type: "skip_requested", timestamp: 0 });
  for (let i = 0; i < 40 && r.f.stage !== "summary"; i++) r.f.stage === "question" ? r.f.on({ type: "answer_submitted", value: right(r.f.currentQuestion!), timestamp: 0 }) : r.f.on({ type: "skip_requested", timestamp: 0 });
  const after = r.f.session.state().evidence(r.f.session.competency);
  assert.equal(after.recoveryRequired, false);
  assert.equal(after.verified, false);
  assert.deepEqual(after.retentionHistory.map((c) => c.result), ["failed", "pending"]);
});

test("C no prerequisite gap: the problem's own skill is taught once through the gate, rechecked alone, the problem is tried once more, then a person", () => {
  const r = runScenario(SCENARIOS.find((s) => s.id === "3h")!);
  const own = graph.evidenceTarget(question(r.s.start).competency);
  const teaches = r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string; at: string }[];
  const ownTeach = teaches.filter((t) => graph.evidenceTarget(t.competency) === own);
  assert.ok(ownTeach.length >= 1, "the skill itself was taught");
  for (const t of ownTeach) { const m = moduleFor(t.competency)!; const e = teachingEligibility(m, m.strategies.find((s) => s.id === t.strategy)!); assert.ok(!(e.checked && !e.eligible), `eligible: ${t.strategy}`); }
  const recs = r.f.session.state().records;
  const recheck = recs.attempts.find((a) => graph.evidenceTarget(a.competency) === own && a.activity === "check" && a.at > ownTeach[0].at && a.n === 1 && a.hints === 0);
  assert.ok(recheck, "an independent recheck after the teaching");
  const tries = recs.attempts.filter((a) => a.questionId === r.s.start);
  assert.ok(tries.length <= 1 + RETRY_LIMIT, `bounded tries on the problem (${tries.length})`);
  assert.ok(tries.at(-1)!.at > recheck!.at, "the problem is tried again after the recheck");
  const rec = r.f.session.trace.filter((t) => t.component === "intervention.recovery").map((t) => (t.output as { phase: string }).phase);
  assert.ok(rec.includes("escalate"), "then it stops for a person");
  assert.equal(rec.filter((p, i) => p === "teach" && rec[i - 1] !== "teach").length, 1, "one own-skill teaching cycle, not a loop");
  assert.equal(r.f.ended?.phase, "pause");
});
