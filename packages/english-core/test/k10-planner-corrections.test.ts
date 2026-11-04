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
import { test } from "node:test";
import {
  applyDirect,
  type BankItem,
  binaryUpdate,
  competencyOutcome,
  createComposite,
  createJourney,
  type EssayContext,
  gapHypotheses,
  journeyOutcomes,
  journeyStatus,
  leafView,
  planCheck,
  planDiagnosticFor,
} from "../src/index.ts";
import { loadAppEssayContext } from "../../../tools/english/essay-load.ts";
import { DAY, ESSAY_2_CLEAN, ESSAY_2_ONE_ERROR, evaluator, FX, INFORMATIONS, journeyEvents, karthikDue, karthikShown, PLU, record, SVA, withExtra } from "./karthik-helpers.ts";
import { loadContext } from "../../../tools/english/load.ts";


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

test("K10-B1d an essay retention check already planned is the same check: shared when due, waited for when not", async () => {
  const { ectx, r, ev, first } = await karthikDue();
  const st = journeyStatus(ectx, r.events, first.id, r.now());
  const p = planCheck(ectx, r.events, r.meta("plan"), PLU, st);
  r.events.push(p.event);
  assert.equal(p.check.kind, "retention");
  const due = Date.parse(p.check.notBefore) <= Date.parse(r.now());
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2").journey;
  const node = j.trees.find((t) => t.root === PLU)?.nodes[0];
  if (due) {
    assert.deepEqual(node!.steps[0].content.refs, p.check.items.map((i) => i.id), "the journey asks the planned check's own questions");
    assert.equal(node!.steps[0].purpose, "retention");
  } else {
    assert.equal(node, undefined);
    assert.match(j.skipped.find((s) => s.competency === PLU)!.reason, /already planned and not yet due/);
  }
  // either way: no second set of delayed-check questions is reserved, and nothing is taught before the check
  assert.ok(!j.trees.some((t) => t.nodes.some((n) => n.competency === PLU && n.steps[0]?.kind === "teach")));
});

test("K10-B1e the delayed check is planned when the target is shown; before it is due a new essay neither asks nor teaches, and when due the journey asks its own questions", async () => {
  const { ectx, r, ev, first } = await karthikShown(INFORMATIONS, true);
  const p = planCheck(ectx, r.events, r.meta("plan"), PLU, journeyStatus(ectx, r.events, first.id, r.now()));
  r.events.push(p.event);
  assert.equal(p.check.kind, "retention");
  // policy @4: the target's own schedule and the planned check fall due together (the earlier low-level practice no
  // longer starts a clock of its own), so there is never an engine due date ahead of the planned check
  assert.equal(r.tview().atTarget!.retention.dueAt, p.check.notBefore);
  r.days(2);
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2").journey;
  assert.ok(!j.trees.some((t) => t.nodes.some((n) => n.competency === PLU)), "no node: nothing is asked or taught before the planned check");
  r.days((Date.parse(p.check.notBefore) - Date.parse(r.now())) / DAY + 0.01);
  await r.essay("essay:3", `${ESSAY_2_ONE_ERROR} It rained in the evening.`, ev, "e3");
  const node = createJourney(ectx, r.events, r.meta("e3"), "essay:3").journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "retention_due");
  assert.deepEqual(node.steps[0].content.refs, p.check.items.map((i) => i.id), "the planned check's own questions, never a second set");
});
