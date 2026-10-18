/**
 * K10: planner corrections (policy @3) for the defects the E002P research reproduced (openpath-research PR #1):
 *
 *   A1  the first answer after teaching in a session no longer changes the demonstrated level
 *   A2  a later essay does not re-teach a skill shown since, merely because an earlier essay's hypothesis remains
 *   A3/B1  a due delayed check is a retention question: checked first, remedial teaching only if it does not hold
 *   B2  insufficient evidence is not a confirmed gap: check at the target first when the bank can
 *
 * and the behaviour the research found beneficial is kept: prerequisites are taught first; when the bank cannot check
 * at the target, the journey still teaches. Earlier journeys (the learner's assigned sequence) are never changed, and
 * journey progress is reported apart from proficiency. Every learner here is synthetic; the extra questions are
 * TEST-ONLY stand-ins for reviewed bank questions (never shipped).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  analyseEssay,
  applyDirect,
  type BankItem,
  binaryUpdate,
  competencyOutcome,
  createComposite,
  createJourney,
  type EssayContext,
  type EssayEvaluator,
  ESSAY_OBSERVE_PROTOCOL_V2,
  ESSAY_REWRITE_PROTOCOL_V2,
  extendContent,
  gapHypotheses,
  journeyOutcomes,
  journeyStatus,
  type LearningJourney,
  type LedgerEvent,
  Ledger,
  leafView,
  planCheck,
  planDiagnosticFor,
  type Response,
  retentionDue,
  submitEssay,
} from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";
import { loadContext } from "../../../tools/english/load.ts";

const PLU = "EN.GRM.NOUN.plurals_countability";
const SVA = "EN.GRM.VERB.sva";
const LEARNER = "learner:k10";
const DAY = 86_400_000;
const T0 = Date.parse("2026-10-19T09:00:00.000Z");
const FX = JSON.parse(readFileSync(new URL("../../../frontend/e2e/fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8")) as { essays: Record<string, { text: string; prompt: string }>; observations: Record<string, { competency: string; quote: string }[]> };

// Essay 2 (synthetic): plurals right throughout; whether it carries one plural error is chosen per test
const ESSAY_2_CLEAN =
  "During the Pongal holidays we visited my grandmother's village near Melur. We cooked sweet pongal in two new clay pots outside the house. My cousins decorated the cows with bells and coloured horns. In the evening the children of the street drew kolams in front of every house. We went home tired but happy.";
const ESSAY_2_ONE_ERROR =
  "During the Pongal holidays we visited my grandmother's village near Melur. We cooked sweet pongal in two new clay pots outside the house. My cousins decorated the cows with bells and coloured horns. In the evening the children of the street drew kolams in front of every house. The village headman shared many informations about the old temple tank.";

function evaluator(essay2Errors: unknown[]): EssayEvaluator {
  return {
    id: "openpath-gateway:llm",
    version: "essay-llm@1",
    model: "mock-model",
    protocols: { observe: ESSAY_OBSERVE_PROTOCOL_V2, rewrite: ESSAY_REWRITE_PROTOCOL_V2 },
    async observe(req) {
      const observations = req.essay.id === "essay:1" ? FX.observations.karthik : essay2Errors;
      return { essay_id: req.essay.id, rubric: req.rubric, observations, not_observable: [] };
    },
    async rewrite() {
      throw new Error("not used");
    },
  };
}
const INFORMATIONS = [{ competency: PLU, kind: "error", quote: "many informations", explanation: "Information is uncountable: it has no plural form.", correction: "a lot of information", misconception: "plural_uncountable", confidence: "high", verification: "required", possible_slip: false }];

/** TEST-ONLY stand-ins for reviewed plural questions at the target band (as in K9). */
const extra: BankItem[] = Array.from({ length: 16 }, (_, k): BankItem => {
  const b = 5 + (k % 6) * 0.25;
  const common = { kind: "code" as const, id: `test.k10.${k + 1}`, version: 1, family: `test.k10.${k + 1}`, target: PLU, b, a: 1.2, prompt: `Test-only plural question ${k + 1}: the ___ were there.` };
  return k % 2 ? { ...common, format: "choice:grammar", options: ["childs", "children", "childrens"], answer: 1 } : { ...common, format: "typed:cloze", answers: [`answer${k + 1}`] };
});
const withExtra = (): EssayContext => {
  const base = loadAppEssayContext();
  return { ...base, ctx: { ...base.ctx, content: extendContent(base.ctx.content, extra, base.ctx.index) } };
};

function record(ectx: EssayContext) {
  const events: LedgerEvent[] = [];
  let n = 0;
  let t = T0;
  const meta = (session = "s0") => ({ id: `k10:${++n}`, at: new Date((t += 60_000)).toISOString(), session });
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
  const teach = (cap: string, lesson: string, session: string) => {
    const m = meta(session);
    events.push({ kind: "intervention", id: m.id, at: m.at, session, capability: cap, strategy: "lesson", content: lesson });
  };
  const essay = async (id: string, text: string, ev: EssayEvaluator, session: string) => {
    events.push(submitEssay(ectx, events, meta(session), { essayId: id, learner: LEARNER, text, source: { kind: "typed", dataUse: "synthetic_test", prompt: FX.essays.karthik.prompt } }).event);
    events.push((await analyseEssay(ectx, events, ev, id, meta(session))).event);
  };
  const view = (cap = PLU) => leafView(Ledger.rebuild(ectx.ctx, LEARNER, events).composite, ectx.ctx.index, cap, now());
  return { events, meta, now, days, answer, practise, teach, essay, view };
}

/**
 * Karthik's first essay through to the target shown at band 5 without help (confirmed gap → lesson → practice →
 * journey check → later checks), on the test-only bank. Returns the record and the first journey.
 */
async function karthikShown(essay2Errors: unknown[]) {
  const ectx = withExtra();
  const r = record(ectx);
  const ev = evaluator(essay2Errors);
  await r.essay("essay:1", FX.essays.karthik.text, ev, "s0");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU)!;
  const d = planDiagnosticFor(ectx, r.events, h.id, r.meta());
  r.events.push(d.event);
  for (const i of d.request.items.slice(0, ectx.policy.confirmMinWrong)) r.answer(i.id, false, "s0");
  assert.equal(gapHypotheses(ectx, r.events).find((x) => x.id === h.id)!.status, "confirmed");
  r.days(0.01);
  const j = createJourney(ectx, r.events, r.meta("s1"), "essay:1");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "gap", "a confirmed gap is taught first (unchanged)");
  assert.deepEqual(node.steps.map((x) => x.kind), ["teach", "guided_practice", "independent_check"]);
  r.teach(PLU, node.steps[0].content.refs[0], "s1");
  for (const id of node.steps[1].content.refs) r.practise(id, "s1");
  r.days(1);
  for (const id of node.steps[2].content.refs) r.answer(id, true, "s2");
  let st = journeyStatus(ectx, r.events, j.journey.id, r.now());
  let o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  for (let k = 0; k < ectx.policy.followUpChecks && !o.demonstrated; k++) {
    const p = planCheck(ectx, r.events, r.meta("plan"), PLU, st);
    r.events.push(p.event);
    r.days(Math.ceil((Date.parse(p.check.notBefore) - Date.parse(r.now())) / DAY) + 0.01);
    for (const i of p.check.items) r.answer(i.id, true, `later${k}`);
    st = journeyStatus(ectx, r.events, j.journey.id, r.now());
    o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  }
  assert.equal(o.demonstrated, true, `Karthik shows the target without help: ${o.pending}`);
  return { ectx, r, ev, first: j.journey };
}

const journeyEvents = (events: LedgerEvent[]) => events.filter((e) => e.kind === "essay" && e.record.type === "journey") as (LedgerEvent & { record: { journey: LearningJourney } })[];

// ---------------------------------------------------------------- A1

test("K10-A1 the first answer after teaching in a session no longer moves the demonstrated level, right or wrong", () => {
  const index = loadContext().index;
  const run = (post: boolean[]) => {
    const c = createComposite(index, "a1");
    const ans = (k: number, at: string, session: string, b: number, ok: boolean, ctx: string, qualifying = true) =>
      applyDirect(c, index, { capability: SVA, at, session, context: ctx, decisionId: `d${k}`, update: (e) => binaryUpdate(e, { a: 1.3, b, c: 0 }, ok), misconceptions: [], binary: { b, correct: ok, a: 1.3, c: 0 }, exposure: "fresh", ...(qualifying ? {} : { qualifying: false }) });
    ans(1, "2026-10-01T10:00:00.000Z", "s1", 5, true, "choice:grammar");
    ans(2, "2026-10-01T10:01:00.000Z", "s1", 5, true, "typed:cloze");
    ans(3, "2026-10-01T10:02:00.000Z", "s1", 5, true, "choice:grammar");
    const before = leafView(c, index, SVA, "2026-10-01T10:03:00.000Z");
    post.forEach((ok, k) => ans(10 + k, `2026-10-02T10:0${k}:00.000Z`, "s2", 5.5, ok, "typed:cloze", false));
    const after = leafView(c, index, SVA, "2026-10-02T11:00:00.000Z");
    return { before: before.demonstrated, after: after.demonstrated, currentBefore: before.verification.currentLevel, currentAfter: after.verification.currentLevel, meanMoved: after.direct.mean !== before.direct.mean };
  };
  // before the fix: one right answer raised the level to 5.5 and one wrong answer lowered it to 4.5
  for (const post of [[true], [false], [true, true], [false, true]]) {
    const r = run(post);
    assert.equal(r.before, 5);
    assert.equal(r.after, 5, `answers straight after teaching (${post}) never change the demonstrated level`);
    assert.equal(r.currentAfter, r.currentBefore, "nor the level the evidence currently supports");
    assert.ok(r.meanMoved, "the estimate itself still updates, as the existing rule says");
  }
});

// ---------------------------------------------------------------- A2 (Karthik's second essay)

test("K10-A2 Karthik's second essay, with no plural errors, does not re-teach plurals he has since shown", async () => {
  const { ectx, r, ev, first } = await karthikShown([]);
  const firstRecord = JSON.stringify(journeyEvents(r.events)[0]);
  r.days(2);
  await r.essay("essay:2", ESSAY_2_CLEAN, ev, "e2");
  const j2 = createJourney(ectx, r.events, r.meta("e2"), "essay:2");
  r.events.push(j2.event);
  assert.ok(!j2.journey.trees.some((t) => t.nodes.some((n) => n.competency === PLU)), "plurals is not on the second journey");
  const skip = j2.journey.skipped.find((s) => s.competency === PLU)!;
  assert.match(skip.reason, /earlier essay/);
  assert.match(skip.reason, /shown at the grade target since/);
  assert.ok(!r.events.some((e) => e.kind === "intervention" && e.at > j2.event.at), "no lesson follows");
  // its delayed check keeps its schedule: the outcomes across journeys still carry plurals, with the retention check next
  const o = journeyOutcomes(ectx, r.events, r.now()).find((x) => x.competency === PLU)!;
  assert.ok(o, "plurals keeps an outcome although the new journey leaves it out");
  assert.equal(o.next?.kind, "retention", o.pending ?? "");
  // the first journey (the learner's assigned sequence) is unchanged, step for step
  assert.equal(JSON.stringify(journeyEvents(r.events)[0]), firstRecord);
  const st1 = journeyStatus(ectx, r.events, first.id, r.now());
  assert.deepEqual(st1.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps.map((s) => s.id))), first.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps.map((s) => s.id))));
});

test("K10-A2b an earlier gap that was never resolved is still carried to the next journey (unchanged)", async () => {
  const ectx = loadAppEssayContext();
  const r = record(ectx);
  const ev = evaluator([]);
  await r.essay("essay:1", FX.essays.karthik.text, ev, "s0");
  r.days(3);
  await r.essay("essay:2", ESSAY_2_CLEAN, ev, "e2");
  const j2 = createJourney(ectx, r.events, r.meta("e2"), "essay:2").journey;
  assert.ok(j2.trees.some((t) => t.root === PLU), "never checked, never shown: the earlier suggestion stays on the path");
});

// ---------------------------------------------------------------- A3/B1 (Karthik's retention journey)

async function karthikDue() {
  const s = await karthikShown(INFORMATIONS);
  // no sitting until the engine's delayed check falls due
  let k = 0;
  while (s.r.view().verification.status !== "overdue" && k++ < 40) s.r.days(1);
  const v = s.r.view();
  assert.equal(v.verification.status, "overdue", "the engine's delayed check is due");
  assert.ok(retentionDue(s.ectx, PLU, v), "a retention question, not a gap");
  return s;
}

test("K10-A3 while the delayed check is due, the outcome asks for that check, never a fresh verification or teaching", async () => {
  const { ectx, r, first } = await karthikDue();
  const o = competencyOutcome(ectx, r.events, PLU, r.now(), journeyStatus(ectx, r.events, first.id, r.now()));
  assert.equal(o.demonstrated, false, "the engine withdraws the current claim while its check is due");
  assert.equal(o.next?.kind, "retention", o.pending ?? "");
  assert.ok(o.retention === "due" || o.retention === "pending");
});

test("K10-B1 Karthik's second essay arrives with his delayed check due: the check comes first; kept → no remedial lesson", async () => {
  const { ectx, r, ev } = await karthikDue();
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "retention_due");
  assert.deepEqual(node.steps.map((s) => [s.kind, s.purpose ?? null, s.condition ?? null]), [["independent_check", "retention", null], ["teach", null, "if_not_shown"], ["guided_practice", null, "if_not_shown"], ["independent_check", null, "if_not_shown"]]);
  for (const id of node.steps[0].content.refs) r.answer(id, true, "e2-check");
  const st = journeyStatus(ectx, r.events, j.journey.id, r.now());
  const sn = st.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.notEqual(sn.level, "none", "the delayed check restored the claim");
  assert.deepEqual(sn.steps.map((s) => s.status), ["green", "skipped", "skipped", "skipped"], "no remedial teaching was needed");
  const o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  assert.equal(o.demonstrated, true);
  assert.equal(o.retention, "demonstrated", JSON.stringify(o));
  // the skipped lesson is still assigned (it can be opened), and it is not counted as completed
  assert.ok(st.progress!.lessonsAssigned >= 1);
  assert.equal(st.progress!.lessonsCompleted, 0);
  assert.ok(st.progress!.stepsSkipped >= 2);
  assert.ok(st.progress!.percent < 100, "proficiency was shown without the journey being 100% complete");
});

test("K10-B1b the delayed check does not hold: the remedial lesson and practice follow", async () => {
  const { ectx, r, ev } = await karthikDue();
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  for (const id of node.steps[0].content.refs) r.answer(id, false, "e2-check");
  const sn = journeyStatus(ectx, r.events, j.journey.id, r.now()).trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(sn.level, "none");
  assert.deepEqual(sn.steps.map((s) => s.status), ["done", "pending", "pending", "pending"], "the lesson is next, then a check after it");
});

test("K10-B1c too few questions kept for the delayed check: teaching proceeds as before", async () => {
  const { ectx: full, r, ev } = await karthikDue();
  // the same record, but more questions needed for the delayed check than the bank keeps for it
  const sparse: EssayContext = { ...full, policy: { ...full.policy, retentionItems: 99 } };
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const node = createJourney(sparse, r.events, r.meta("e2"), "essay:2").journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.notEqual(node.steps[0].purpose, "retention");
  assert.ok(node.steps.some((s) => s.kind === "teach" && !s.condition), "teaching is not withheld when the delayed check cannot be given");
});

// ---------------------------------------------------------------- B2

async function unresolvedPlurals(ectx: EssayContext) {
  const r = record(ectx);
  await r.essay("essay:1", FX.essays.karthik.text, evaluator([]), "s0");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU)!;
  const d = planDiagnosticFor(ectx, r.events, h.id, r.meta());
  r.events.push(d.event);
  // mixed answers: one wrong, the rest right — neither a confirmed gap nor ruled out
  d.request.items.forEach((i, k) => r.answer(i.id, k !== 0, "s0"));
  assert.equal(gapHypotheses(ectx, r.events).find((x) => x.id === h.id)!.status, "unresolved");
  r.days(0.01);
  return r;
}

test("K10-B2 insufficient evidence: checked at the target first; lesson and practice only if the check does not show the skill", async () => {
  const ectx = withExtra();
  const r = await unresolvedPlurals(ectx);
  const j = createJourney(ectx, r.events, r.meta("s1"), "essay:1");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "insufficient_evidence");
  assert.deepEqual(node.steps.map((s) => s.kind), ["independent_check", "teach", "guided_practice", "independent_check"]);
  assert.deepEqual(node.steps.map((s) => s.condition ?? null), [null, "if_not_shown", "if_not_shown", "if_not_shown"]);
  assert.ok(node.steps[0].content.refs.every((id) => (ectx.ctx.content.items.get(id) as BankItem).b >= 5), "the check is at the target band");
  // the check is not passed: the lesson comes next (insufficient evidence was not treated as a confirmed gap, but a
  // learner who still cannot do it is taught)
  for (const id of node.steps[0].content.refs) r.answer(id, false, "s1");
  const sn = journeyStatus(ectx, r.events, j.journey.id, r.now()).trees.find((t) => t.root === PLU)!.nodes[0];
  assert.deepEqual(sn.steps.map((s) => s.status), ["done", "pending", "pending", "pending"]);
});

test("K10-B2b a confirmed gap is still taught first; the shipped bank (too few questions at the target) still teaches first", async () => {
  // confirmed: covered by karthikShown's own assertion (decision "gap", teach first); shipped bank:
  const ectx = loadAppEssayContext();
  const r = await unresolvedPlurals(ectx);
  const node = createJourney(ectx, r.events, r.meta("s1"), "essay:1").journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "insufficient_evidence");
  assert.deepEqual(node.steps.map((s) => [s.kind, s.status, s.condition ?? null]), [["teach", "pending", null], ["guided_practice", "pending", null], ["independent_check", "blocked", null]], "teaching is not withheld when nothing at the target can check first");
});

// ---------------------------------------------------------------- progress apart from proficiency

test("K10-P journey progress reads step statuses only: lessons and practice raise it, never proficiency", async () => {
  const { ectx, r, first } = await karthikShown([]);
  const st = journeyStatus(ectx, r.events, first.id, r.now());
  // (the journey also holds the essay's agreement tree, not worked on here)
  const all = st.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps));
  assert.equal(st.progress!.percent, Math.round((100 * all.filter((s) => s.status === "done" || s.status === "green").length) / all.length));
  assert.equal(st.progress!.lessonsCompleted, 1);
  // the same journey, before any step was done: 0% whatever the engine says
  const before = r.events.filter((e) => e.at <= journeyEvents(r.events)[0].at);
  const st0 = journeyStatus(ectx, before, first.id, journeyEvents(r.events)[0].at);
  assert.equal(st0.progress!.percent, 0);
  // completing the lesson and practice alone: progress rises, the node is not green
  const lessonOnly = r.events.filter((e) => e.kind !== "evidence" || e.at <= journeyEvents(r.events)[0].at);
  const stL = journeyStatus(ectx, lessonOnly, first.id, r.now());
  const n = stL.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.ok(stL.progress!.percent > 0 && !n.green, "a finished lesson is progress, not proficiency");
});
