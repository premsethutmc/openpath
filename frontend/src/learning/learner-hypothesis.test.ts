/**
 * Contract tests for the integration boundary (learner-hypothesis@1, teaching-history@1, evidence@1 pass-through).
 * They reuse the journey learners (adaptive-journey.ts); nothing here is competency-specific in the engine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { familyOf, hypotheses, openHypothesis } from "../../../packages/learning/src/hypotheses";
import { reason } from "../../../packages/learning/src/reasoning";
import { moduleState, recovery, teachingHistory } from "../../../packages/learning/src/intervention";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { nextActivity } from "../../../packages/learning/src/plan";
import { topicCheck } from "../year/topic-session";
import { Journey, SCENARIOS, TARGET, slip } from "./adaptive-journey";
import { problemOf, show } from "../../../packages/learning/src/families";

const SUPPORT = "MATH.number.integer-add";
/** Scenario B's learner up to the end of the starting-point check (before any plan or teaching). */
async function afterCheck() {
  const j = new Journey("contract-B");
  const BUGS = new Set(["minus-c-sign", "minus-negative-as-minus"]);
  const answer = (q: string) => {
    const b = problemOf(q)?.bugs.find((x) => BUGS.has(x.id) && x.predict !== null);
    const v = b ? (Array.isArray(b.predict) ? b.predict[0] : b.predict) : null;
    const qq = question(q);
    if (v === null) return qq.answer;
    const i = qq.options?.findIndex((o) => o.trim() === show(v as number)) ?? -1;
    return qq.options?.length ? "ABCD"[Math.max(0, i)] : show(v as number);
  };
  await j.topicCheck(TARGET, answer);
  return j;
}

test("a broad 'shown' judgement and a narrower established misconception are held at the same time", async () => {
  const j = await afterCheck();
  const st = j.d.state();
  const h = openHypothesis(SUPPORT, st.records)!;
  assert.ok(h, "the hypothesis about the supporting skill is visible from that skill");
  assert.equal(h.status, "established");
  assert.equal(h.scope.about, SUPPORT);
  assert.ok(["independent", "transfer"].includes(st.evidence(SUPPORT).status), "the supporting skill still reads as shown");
  assert.ok(["independent", "transfer"].includes(st.evidence(TARGET).status), "the target still reads as shown");
  assert.ok(h.supporting.length >= 2, "never established on one answer");
  assert.deepEqual(h.use, { teach: true, ask: false, evidence: false, mastery: false });
});

test("an established misconception survives into planning, and into the module of the skill it is about", async () => {
  const j = await afterCheck();
  const st = j.d.state();
  const next = nextActivity(j.release, st.evidence, st.records);
  assert.equal(next.competency, TARGET);
  assert.equal(next.kind, "continue");
  for (const c of [TARGET, SUPPORT]) {
    const ms = moduleState(c, st.records, st.evidence(c), j.d.now, j.d.session);
    assert.ok(["strategy", "chapter"].includes(ms.phase), `${c}: teaching pending, not ${ms.phase}`);
  }
});

test("the same evidence reads the same through every entry path", async () => {
  const j = await afterCheck();
  const st = j.d.state();
  const h = hypotheses(st.records)[0];
  const r = recovery(h.scope.question, st.records, st.evidence, j.d.now, j.d.session).reasoning!;
  const t = topicCheck(TARGET, j.ctx()).recovery!.reasoning!;
  for (const x of [r, t]) {
    assert.deepEqual(x.support, h.support);
    assert.equal(x.best?.id, h.claim!.explanation);
  }
});

test("each observation keeps the authoritative recorded decision; hypotheses are a function of the records", async () => {
  const j = await afterCheck();
  const st = j.d.state();
  const hs = hypotheses(st.records);
  for (const h of hs) for (const o of [...h.supporting, ...h.contradicting]) {
    const a = st.records.attempts.find((x) => x.id === o.attempt)!;
    assert.equal(o.mathematical.credit, a.credit ?? null);
    assert.equal(o.mathematical.assessment?.source ?? null, a.assessment?.source ?? null);
  }
  assert.deepEqual(hypotheses(j.d.state().records), hs);
});

test("nothing is established without evidence: a slip, and a learner no explanation fits", async () => {
  const a1 = await SCENARIOS.A1(), c = await SCENARIOS.C();
  for (const h of [...a1.final.hypotheses, ...c.final.hypotheses]) {
    assert.notEqual(h.status, "established");
    assert.equal(h.claim, null);
    assert.equal(h.use.teach, false);
  }
  assert.ok(c.final.hypotheses.some((h) => h.status === "unsupported"));
  // INTEGRATION-M1 closure (policy 1): evidence interpretation and adaptive decision are separate, compatible conclusions about a lone slip.
  //  evidence:  the slip is KEPT as an observation (not erased, not counted as help) and does not establish anything: the real reasoning over
  //             that one answer is not "established" (insufficient evidence); no hypothesis is claimed, and nothing is promoted to mastery.
  //  adaptive:  with competence otherwise supported, no investigation or remedial teaching follows the slip (the loop's stopping rule).
  const slipQ = a1.slipped as unknown as string, fam = familyOf(slipQ)!;
  const r = reason(fam, [{ questionId: fam, response: slip(slipQ) }]);
  assert.ok(r && r.status !== "established", "one unexplained wrong answer never establishes a misconception");
  assert.equal(a1.final.afterSlip.independent.total - a1.final.afterSlip.independent.right, 1, "the slip stays recorded as an independent wrong answer");
  assert.equal(a1.final.hypotheses.length, 0, "no hypothesis is invented (neither established nor 'confident')");
  const after = a1.steps.slice(a1.steps.findIndex((x) => (x as { question?: string }).question === slipQ) + 1);
  assert.ok(!after.some((x) => ["explore", "recover", "chapter"].includes((x as { phase?: string }).phase ?? "")), "no investigation or lesson after an isolated slip");
});

test("teaching history: questions seen as practice are not instruction delivered, and no pause claims teaching that did not happen", async () => {
  const runs = [await SCENARIOS.A3(), await SCENARIOS.C(), await SCENARIOS.B()];
  const a3 = runs[0];
  const h = a3.final.teachingHistory[TARGET]!;
  assert.ok(h.some((s) => s.checkSeen && !s.checkSeen.inBlock), "a strategy check was answered as practice");
  assert.ok(a3.steps.some((s) => s.phase === "chapter"), "the module still teaches after its checks were used as practice");
  for (const r of runs) {
    const hist = r.final.teachingHistory;
    for (const s of r.steps.filter((x) => x.phase === "pause")) {
      const delivered = (hist[s.competency!] ?? []).filter((x) => x.delivered.length).length;
      if (/have been tried/.test(s.reason ?? "")) assert.equal(delivered, moduleFor(s.competency!)!.strategies.length, s.reason ?? "");
      if (/have not clicked/.test(s.reason ?? "")) assert.ok(delivered > 0, s.reason ?? "");
    }
    for (const [c, list] of Object.entries(hist)) for (const s of list ?? []) {
      const taught = r.steps.filter((x) => x.competency === c && x.phase === "chapter" && x.intervention?.strategy?.id === s.strategy).length;
      assert.equal(s.delivered.length, taught, `${c}/${s.strategy}: delivered = teaching steps`);
    }
  }
});

test("teaching history is per strategy and read-only", () => {
  const j = new Journey("contract-empty");
  const m = moduleFor(TARGET)!;
  const h = teachingHistory(m, j.d.state().records);
  assert.equal(h.length, m.strategies.length);
  assert.ok(h.every((s) => !s.delivered.length && s.effective === null));
});
