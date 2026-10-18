/**
 * K9: the complete plural journey on the FORMAL track (two-track policy), through the existing ledger, planner and
 * checks: essay → suspected plural error → independent bank diagnostic → targeted instruction → guided practice →
 * independent recheck → persistent profile → delayed retention.
 *
 * With the shipped bank the independent recheck is blocked (one unseen question at the target band where two are
 * needed), so retention is unreachable and nothing is claimed. The same journey with TEST-ONLY items added (synthetic
 * questions in this file, never shipped, standing in for reviewed bank questions) runs to verified mastery: the only
 * thing missing is reviewed content, not machinery.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  analyseEssay,
  type BankItem,
  competencyOutcome,
  createJourney,
  dueCheck,
  type EssayContext,
  type EssayEvaluator,
  essayProfile,
  ESSAY_OBSERVE_PROTOCOL_V2,
  ESSAY_REWRITE_PROTOCOL_V2,
  extendContent,
  gapHypotheses,
  journeyStatus,
  type LedgerEvent,
  Ledger,
  leafView,
  planCheck,
  planDiagnosticFor,
  recommendNext,
  type Response,
  submitEssay,
} from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";

const PLU = "EN.GRM.NOUN.plurals_countability";
const LEARNER = "learner:k9";
const DAY = 86_400_000;
const T0 = Date.parse("2026-10-19T09:00:00.000Z");
const FX = JSON.parse(readFileSync(new URL("../../../frontend/e2e/fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8")) as { essays: Record<string, { text: string; prompt: string }>; observations: Record<string, unknown[]> };
const model: EssayEvaluator = {
  id: "openpath-gateway:llm",
  version: "essay-llm@1",
  model: "mock-model",
  protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
  async observe(req) {
    return { essay_id: req.essay.id, rubric: req.rubric, observations: FX.observations.karthik, not_observable: [] };
  },
  async rewrite() {
    throw new Error("not used");
  },
};

/** A small learner record with a clock. */
function record(ectx: EssayContext) {
  const events: LedgerEvent[] = [];
  let n = 0;
  let t = T0;
  const meta = (session = "s0") => ({ id: `k9:${++n}`, at: new Date((t += 60_000)).toISOString(), session });
  const now = () => new Date(t).toISOString();
  const days = (d: number) => void (t += d * DAY);
  const item = (id: string) => ectx.ctx.content.items.get(id) as BankItem;
  const respond = (it: BankItem, right: boolean): Response => {
    const kind = it.format.split(":")[0];
    if (kind === "typed") return { kind: "typed", text: right ? it.answers![0] : "zzzq" };
    if (kind === "multi") return { kind: "multi", choices: right ? it.answer_set! : [0] };
    return { kind: "choice", choice: right ? it.answer! : (it.answer! + 1) % it.options!.length };
  };
  const answer = (id: string, right: boolean, session: string) => {
    const m = meta(session);
    events.push({ kind: "evidence", id: m.id, at: m.at, session, item: { id, version: item(id).version }, response: respond(item(id), right), use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } });
  };
  const practise = (id: string, session: string) => {
    const m = meta(session);
    events.push({ kind: "assisted_response", id: m.id, at: m.at, session, item: { id, version: item(id).version }, response: respond(item(id), true), attempt: 1, hints: [], afterFeedback: false });
  };
  return { events, meta, now, days, answer, practise };
}

/** Steps 1–5 (shared): essay, suspected gap, bank diagnostic (wrong), lesson, guided practice. */
async function upToPractice(ectx: EssayContext) {
  const r = record(ectx);
  const s = submitEssay(ectx, r.events, r.meta(), { essayId: "essay:1", learner: LEARNER, text: FX.essays.karthik.text, source: { kind: "typed", dataUse: "synthetic_test", prompt: FX.essays.karthik.prompt } });
  r.events.push(s.event);
  r.events.push((await analyseEssay(ectx, r.events, model, "essay:1", r.meta())).event);
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU)!;
  assert.equal(h.status, "suspected");
  const d = planDiagnosticFor(ectx, r.events, h.id, r.meta());
  r.events.push(d.event);
  assert.ok(d.request.items.length >= 2 && !d.request.contentGap, "the bank can diagnose plurals");
  assert.ok(d.request.items.every((i) => i.contentStatus === "candidate"), "bank questions (candidate status: the engine's evidence rules apply; none is educator-reviewed)");
  // wrong until the gap is confirmed (two wrong answers decide; the studio asks no more)
  for (const i of d.request.items.slice(0, ectx.policy.confirmMinWrong)) r.answer(i.id, false, "s0");
  assert.equal(gapHypotheses(ectx, r.events).find((x) => x.id === h.id)!.status, "confirmed");
  r.days(0.01);
  const j = createJourney(ectx, r.events, r.meta("s1"), "essay:1");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.deepEqual(node.steps.map((x) => x.kind), ["teach", "guided_practice", "independent_check"]);
  const m = r.meta("s1");
  r.events.push({ kind: "intervention", id: m.id, at: m.at, session: "s1", capability: PLU, strategy: "lesson", content: node.steps[0].content.refs[0] });
  for (const id of node.steps[1].content.refs) r.practise(id, "s1");
  return { r, h, j: j.journey, node };
}

test("K9-1 shipped bank: diagnosis, teaching and practice work; the independent recheck is blocked, so retention is unreachable and nothing is claimed", async () => {
  const ectx = loadAppEssayContext();
  const { r, j, node } = await upToPractice(ectx);
  assert.equal(node.steps[2].status, "blocked");
  assert.match(node.steps[2].content.note, /Not enough unseen questions at the target band/);
  r.days(1);
  const st = journeyStatus(ectx, r.events, j.id, r.now());
  const sn = st.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.deepEqual(sn.steps.map((x) => x.status), ["done", "done", "blocked"]);
  const o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  assert.deepEqual([o.journeyCompleted, o.demonstrated, o.verified, o.retention], [true, false, false, "not_applicable"]);
  assert.match(o.pending!, /more reviewed questions are needed/);
  assert.throws(() => planCheck(ectx, r.events, r.meta("plan"), PLU, st), /more reviewed questions|nothing to check/);
  const rec = recommendNext(ectx, r.events)!;
  assert.equal(rec.verification?.available, false);
  assert.match(rec.verification!.reason, /Mastery verification is not available/);
  // persistent: the profile is rebuilt from the same record, identically
  const a = essayProfile(ectx, LEARNER, r.events, r.now());
  const b = essayProfile(ectx, LEARNER, [...r.events], r.now());
  assert.deepEqual(a, b);
  const p = a.competencies.find((c) => c.competency === PLU)!;
  assert.equal(p.gap?.status, "confirmed");
  assert.ok(p.engine.estimate && p.engine.estimate.mean < 5, "an estimate from the counted diagnostic answers, below the target");
  assert.equal(p.provenance.independent.length >= 2, true);
  assert.equal(p.provenance.assisted.length, node.steps[1].content.refs.length, "practice is assisted, never independent");
  // a week later: still no retention check, because nothing was shown
  r.days(7);
  assert.equal(dueCheck(ectx, r.events, r.now()), null);
  assert.equal(competencyOutcome(ectx, r.events, PLU, r.now(), journeyStatus(ectx, r.events, j.id, r.now())).retention, "not_applicable");
});

/** TEST-ONLY stand-ins for reviewed bank questions at the target band (never shipped, never in content/). */
const extra: BankItem[] = [
  ["The teacher gave us some good ___ before the test.", ["advices", "advice", "an advices"], 1, 5.0],
  ["Ten ___ were grazing near the canal.", ["sheeps", "sheep", "sheepes"], 1, 5.25],
  ["We need more ___ for the new classroom.", ["furnitures", "furniture", "a furniture"], 1, 5.5],
  ["How ___ luggage are you carrying?", ["many", "much", "few"], 1, 5.75],
  ["The ___ of the survey were surprising.", ["datas", "data", "datum's"], 1, 6.0],
  ["Two ___ were stuck in the mud after the rain.", ["buses", "bus", "busses'"], 0, 5.0],
  ["Our grandparents told us many ___ about the old town.", ["story", "storys", "stories"], 2, 5.25],
  ["The doctor checked all the ___ in the ward.", ["babys", "babies", "baby"], 1, 5.5],
  ["The ___ in the village well is clean now.", ["waters", "water", "a water"], 1, 5.75],
  ["My aunt bought two ___ of bread at the bakery.", ["loafs", "loaves", "loaf"], 1, 6.0],
  ["The ___ is very good this morning.", ["news", "newses", "a news"], 0, 6.25],
  ["How ___ students came to the assembly?", ["much", "many", "a lot"], 1, 5.0],
].map(([prompt, options, answer, b], k): BankItem => {
  const common = { kind: "code" as const, id: `test.plu.${k + 1}`, version: 1, family: `test.plu.${k + 1}`, target: PLU, b: b as number, a: 1.2, prompt: prompt as string };
  // half typed (constructed: no guessing), half choice (recognition)
  return k % 2 ? { ...common, format: "choice:grammar", options: options as string[], answer: answer as number } : { ...common, format: "typed:cloze", answers: [(options as string[])[answer as number]] };
});

test("K9-2 the same journey with reviewed questions at the target band (test-only) runs through the recheck and the delayed retention check to verified", async () => {
  const base = loadAppEssayContext();
  const ectx: EssayContext = { ...base, ctx: { ...base.ctx, content: extendContent(base.ctx.content, extra, base.ctx.index) } };
  const { r, j, node } = await upToPractice(ectx);
  assert.equal(node.steps[2].status, "pending", "with enough reviewed questions the independent recheck is planned");
  const check = node.steps[2].content.refs;
  assert.equal(check.length, 2);
  assert.ok(check.every((id) => id.startsWith("test.plu.") || id.startsWith("grm.plu.")));
  r.days(1);
  for (const id of check) r.answer(id, true, "s2");
  let st = journeyStatus(ectx, r.events, j.id, r.now());
  let o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  // later checks (new sittings, spaced 1, 3, 7 days) while the target is not yet shown
  for (let k = 0; k < ectx.policy.followUpChecks && !o.demonstrated; k++) {
    assert.equal(o.next?.kind, "verification", o.pending ?? "");
    const p = planCheck(ectx, r.events, r.meta("plan"), PLU, st);
    r.events.push(p.event);
    assert.equal(dueCheck(ectx, r.events, r.now()), null, "never offered early");
    r.days(Math.ceil((Date.parse(p.check.notBefore) - Date.parse(r.now())) / DAY) + 0.01);
    for (const i of p.check.items) r.answer(i.id, true, `later${k}`);
    st = journeyStatus(ectx, r.events, j.id, r.now());
    o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  }
  assert.equal(o.demonstrated, true, `shown at the target without help: ${o.pending}`);
  // the delayed retention check: planned on reserved unseen questions, never offered early, then passed
  const shownAt = o.targetShownAt!;
  // the delayed check at the target is still to come. (The engine's own level-generic schedule may already read
  // "verified" here, because a later check came at least the delay after a LOWER level was first shown; since
  // policy @4 the essay claim uses the schedule anchored to the target, so it is not verified yet.)
  assert.equal(o.retention, "pending");
  assert.equal(o.verified, false, "not verified before the delayed check after the target was shown");
  assert.equal(o.next?.kind, "retention");
  {
    const ret = planCheck(ectx, r.events, r.meta("plan"), PLU, st);
    assert.equal(ret.check.kind, "retention");
    assert.ok(Date.parse(ret.check.notBefore) - Date.parse(shownAt) >= ectx.policy.retentionDelayDays * DAY, "at least seven days after the target was first shown");
    r.events.push(ret.event);
    assert.equal(dueCheck(ectx, r.events, r.now()), null, "not offered before it is due");
    r.days(Math.ceil((Date.parse(ret.check.notBefore) - Date.parse(r.now())) / DAY) + 0.01);
    assert.ok(dueCheck(ectx, r.events, r.now()));
    for (const i of ret.check.items) r.answer(i.id, true, "retention");
    o = competencyOutcome(ectx, r.events, PLU, r.now(), journeyStatus(ectx, r.events, j.id, r.now()));
  }
  assert.equal(o.retention, "demonstrated", JSON.stringify(o));
  assert.equal(o.verified, true);
  // verified only by the engine's own rule on the schedule anchored to the target (policy @4): shown at the target,
  // then kept on independent answers at least the delay later
  const v = leafView(Ledger.rebuild(ectx.ctx, LEARNER, r.events).composite, ectx.ctx.index, PLU, r.now(), { target: ectx.profile.byCapability.get(PLU)!.expectedBand });
  assert.equal(v.atTarget!.retention.firstDemonstratedAt, shownAt);
  assert.ok(Date.parse(v.atTarget!.verification.verifiedAt!) - Date.parse(shownAt) >= ectx.policy.retentionDelayDays * DAY);
  const p = essayProfile(ectx, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.equal(p.state, "verified");
  assert.equal(p.provenance.provisional.length, 0, "no generated question took part");
});
