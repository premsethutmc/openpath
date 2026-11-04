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
  DEVELOPER_VERIFICATION,
  PILOT_VERIFICATION,
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
  lessonProgramme,
  planCheck,
  planDiagnosticFor,
  recommendNext,
  type Response,
  submitEssay,
  verificationEligibility,
} from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";
import { loadContextWithPlurals } from "../../../tools/english/supplement/plurals.ts";

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
  assert.ok(d.request.items.every((i) => i.contentStatus === "candidate" || i.contentStatus === "validated"), "bank questions only (never provisional or generated)");
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

/** TEST-ONLY stand-ins for bank questions at the target band (never shipped, never in content/). */
const standIns = (status?: "validated", releasedAt = "2026-01-01T00:00:00.000Z"): BankItem[] =>
  [
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
    const common = { kind: "code" as const, id: `test.plu.${k + 1}`, version: 1, family: `test.plu.${k + 1}`, target: PLU, b: b as number, a: 1.2, prompt: prompt as string, ...(status ? { evidence_status: status, released_at: releasedAt } : {}) };
    // half typed (constructed: no guessing), half choice (recognition)
    return k % 2 ? { ...common, format: "choice:grammar", options: options as string[], answer: answer as number } : { ...common, format: "typed:cloze", answers: [(options as string[])[answer as number]] };
  });

const withStandIns = (status?: "validated", verification = PILOT_VERIFICATION, releasedAt?: string): EssayContext => {
  const base = loadAppEssayContext();
  return { ...base, verification, ctx: { ...base.ctx, content: extendContent(base.ctx.content, standIns(status, releasedAt), base.ctx.index) } };
};

/** Recheck, later checks until the target is shown, then the planned delayed check. Returns the outcomes either side of it. */
async function throughRetention(ectx: EssayContext) {
  const { r, j, node } = await upToPractice(ectx);
  assert.equal(node.steps[2].status, "pending", "with enough questions at the target band the independent recheck is planned");
  r.days(1);
  for (const id of node.steps[2].content.refs) r.answer(id, true, "s2");
  let st = journeyStatus(ectx, r.events, j.id, r.now());
  let o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
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
  const before = o;
  const shownAt = o.targetShownAt!;
  const ret = planCheck(ectx, r.events, r.meta("plan"), PLU, st);
  assert.equal(ret.check.kind, "retention");
  assert.ok(Date.parse(ret.check.notBefore) - Date.parse(shownAt) >= ectx.policy.retentionDelayDays * DAY, "at least seven days after the target was first shown");
  r.events.push(ret.event);
  assert.equal(dueCheck(ectx, r.events, r.now()), null, "not offered before it is due");
  r.days(Math.ceil((Date.parse(ret.check.notBefore) - Date.parse(r.now())) / DAY) + 0.01);
  assert.ok(dueCheck(ectx, r.events, r.now()));
  for (const i of ret.check.items) r.answer(i.id, true, "retention");
  const after = competencyOutcome(ectx, r.events, PLU, r.now(), journeyStatus(ectx, r.events, j.id, r.now()));
  return { r, j, before, after, shownAt };
}

test("K9-2 with reviewed questions at the target band (test-only stand-ins, validated): recheck, delayed check, then verified, never earlier", async () => {
  const ectx = withStandIns("validated");
  const { r, before, after, shownAt } = await throughRetention(ectx);
  // no early verification: at the moment the target is first shown nothing is verified, whatever lower band was kept
  assert.deepEqual([before.demonstrated, before.verified, before.retention], [true, false, "pending"]);
  assert.doesNotMatch(before.pending ?? "", /cannot verify/, "reviewed, released questions: the delayed check can verify");
  assert.deepEqual([after.demonstrated, after.verified, after.retention], [true, true, "demonstrated"]);
  const v = leafView(Ledger.rebuild(ectx.ctx, LEARNER, r.events).composite, ectx.ctx.index, PLU, r.now());
  assert.ok(v.verification.verifiedLevel! >= 5, "the engine verified band 5 itself");
  assert.ok(Date.parse(v.verification.verifiedLevelAt!) - Date.parse(shownAt) >= ectx.policy.retentionDelayDays * DAY - 12 * 3_600_000);
  // the one clock (integration): the essay reads the schedule anchored at the target, which starts when band 5 was
  // first shown and verifies band 5 itself
  const t = leafView(Ledger.rebuild(ectx.ctx, LEARNER, r.events).composite, ectx.ctx.index, PLU, r.now(), { target: ectx.profile.byCapability.get(PLU)!.expectedBand }).atTarget!;
  assert.equal(t.retention.firstDemonstratedAt, shownAt);
  assert.ok(t.verification.verifiedLevel! >= 5);
  const p = essayProfile(ectx, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.equal(p.state, "verified", "engine, profile and outcome agree");
  assert.equal(p.engine.verifiedOn, "reviewed");
  assert.equal(p.provenance.provisional.length, 0, "no generated question took part");
});

test("K9-3 unreviewed questions cannot establish verified mastery under the pilot policy; the developer policy says what it is", async () => {
  // the same record on unreviewed (candidate) stand-ins
  const pilot = withStandIns(undefined, PILOT_VERIFICATION);
  const { r, before, after } = await throughRetention(pilot);
  assert.match(before.pending ?? "", /under the pilot policy this check records retention but cannot verify mastery/, "the planner says the delayed check cannot verify");
  assert.deepEqual([after.demonstrated, after.verified, after.retention], [true, false, "demonstrated"], "the delayed check passed, but on unreviewed questions");
  const pp = essayProfile(pilot, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.equal(pp.state, "demonstrated");
  assert.equal(pp.engine.verificationWithheld, true);
  // developer testing: the same record, the same engine, verified and labelled as on unreviewed questions
  const dev = { ...pilot, verification: DEVELOPER_VERIFICATION };
  const pd = essayProfile(dev, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.equal(pd.state, "verified");
  assert.equal(pd.engine.verifiedOn, "unreviewed");
  assert.equal(competencyOutcome(dev, r.events, PLU, r.now()).verified, true);
  // nothing in the record changed between the two readings
  assert.deepEqual(Ledger.rebuild(pilot.ctx, LEARNER, r.events).composite, Ledger.rebuild(dev.ctx, LEARNER, r.events).composite);
});

test("K9-4 with the proposed plural questions as if an educator approved them (validated), the pilot policy verifies the full journey", async () => {
  const ectx = { ...loadContextWithPlurals({ asIfReviewed: true }), verification: PILOT_VERIFICATION };
  const { r, before, after } = await throughRetention(ectx);
  assert.deepEqual([before.verified, after.verified, after.retention], [false, true, "demonstrated"]);
  const p = essayProfile(ectx, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.deepEqual([p.state, p.engine.verifiedOn], ["verified", "reviewed"]);
  // as shipped (provisional), the same proposed questions verify nothing
  const shipped = loadContextWithPlurals();
  assert.equal(competencyOutcome(shipped, r.events, PLU, r.now()).verified, false);
});

test("K9-5 H-V3 non-retroactive approval: answers given before a question version was released never verify, even once it is", async () => {
  // the same learner and timeline with questions released before any answer: verified (K9-2)
  const early = await throughRetention(withStandIns("validated"));
  assert.equal(early.after.verified, true);
  // released only after the target was first shown: the demonstration was on answers given before the release, so
  // the pilot cannot verify from it; the answers stay in the ledger, counted for the estimate and for "shown" as before
  const releasedAt = new Date(Date.parse(early.shownAt) + DAY).toISOString();
  const late = withStandIns("validated", PILOT_VERIFICATION, releasedAt);
  const { r, after } = await throughRetention(late);
  assert.deepEqual([after.demonstrated, after.verified, after.retention], [true, false, "demonstrated"]);
  const p = essayProfile(late, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.deepEqual([p.state, p.engine.verificationWithheld], ["demonstrated", true]);
  const why = verificationEligibility(late.ctx, r.events);
  const reasons = new Set(r.events.filter((e) => e.kind === "evidence" && e.item.id.startsWith("test.plu.")).map((e) => why.get(e.id)));
  assert.ok(reasons.has("before_release") && reasons.has("eligible"), [...reasons].join(","));
  // the estimate and the shown claim are identical to the early-release reading of the same record
  assert.deepEqual(Ledger.rebuild(late.ctx, LEARNER, r.events).composite, Ledger.rebuild(withStandIns("validated").ctx, LEARNER, r.events).composite);
  // released after everything: nothing is eligible
  const never = withStandIns("validated", PILOT_VERIFICATION, new Date(Date.parse(r.now()) + DAY).toISOString());
  assert.equal(competencyOutcome(never, r.events, PLU, r.now()).verified, false);
});

test("K9-6 Karthik across sessions, then a later essay: verified once, never early; the later essay checks before re-teaching; lessons and earlier journeys are kept", async () => {
  const ectx = withStandIns("validated");
  const { r, j, after } = await throughRetention(ectx);
  assert.equal(after.verified, true);
  const firstJourney = JSON.stringify(r.events.find((e) => e.kind === "essay" && e.record.type === "journey"));
  const lessonsBefore = lessonProgramme(ectx, r.events, PLU)!;
  assert.ok(lessonsBefore.completed >= 1 && lessonsBefore.completed < lessonsBefore.total, "part of the fixed programme done");
  // a later essay, two days on, with one plural slip ("won two medal")
  r.days(2);
  const second: EssayEvaluator = { ...model, async observe(req) {
    return { essay_id: req.essay.id, rubric: req.rubric, observations: req.essay.id === "essay:2" ? FX.observations.second : FX.observations.karthik, not_observable: [] };
  } };
  r.events.push(submitEssay(ectx, r.events, r.meta("s9"), { essayId: "essay:2", learner: LEARNER, text: FX.essays.second.text, source: { kind: "typed", dataUse: "synthetic_test", prompt: FX.essays.second.prompt } }).event);
  r.events.push((await analyseEssay(ectx, r.events, second, "essay:2", r.meta("s9"))).event);
  const j2 = createJourney(ectx, r.events, r.meta("s9"), "essay:2").journey;
  const node = j2.trees.find((t) => t.root === PLU)?.nodes.find((n) => n.competency === PLU);
  if (process.env.K9_DEBUG) console.log("K9-6", node?.decision, node?.steps.map((s) => s.kind), j2.skipped);
  if (node) {
    // a verified skill with one new slip: check first, never a lesson first
    assert.notEqual(node.steps[0].kind, "teach", `decision ${node.decision}: ${node.steps.map((s) => s.kind).join(",")}`);
    assert.equal(node.decision, "check_only");
  } else assert.ok(j2.skipped.some((s) => s.competency === PLU), "or not in the journey at all");
  // nothing earlier was rewritten, and nothing was lost
  assert.equal(JSON.stringify(r.events.find((e) => e.kind === "essay" && e.record.type === "journey")), firstJourney);
  assert.deepEqual(lessonProgramme(ectx, r.events, PLU), lessonsBefore, "the lesson programme and its completion are unchanged by a new essay");
  const p = essayProfile(ectx, LEARNER, r.events, r.now()).competencies.find((c) => c.competency === PLU)!;
  assert.equal(p.state, "verified", "a suspected slip in an essay does not withdraw verified mastery; only the engine's own evidence can");
  assert.equal(p.lessons!.completed, lessonsBefore.completed);
  // the whole record replays to the same profile
  assert.deepEqual(essayProfile(ectx, LEARNER, [...r.events], r.now()), essayProfile(ectx, LEARNER, r.events, r.now()));
  void j;
});
