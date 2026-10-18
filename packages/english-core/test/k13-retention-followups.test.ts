/**
 * K13: follow-ups to the planner corrections (policy @4), on Karthik's synthetic multi-session journey:
 *
 *   R1  retention timing: the delayed check and "verified" start from the first demonstration AT the grade target;
 *       an earlier demonstration at a lower level is history and starts nothing
 *   R2  repeated essays: a skill already shown at the target is not diagnosed again automatically; only meaningful
 *       contradictory evidence, a due delayed check (which is itself the assessment) or an explicit request reopens it
 *   R3  failed retention: a failed planned delayed check records a review at once, shown in the learner's existing
 *       journey; the assigned steps and their completion percentage do not change
 *
 * Every learner is synthetic; the extra questions are TEST-ONLY stand-ins for reviewed bank questions (never shipped).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkProgress,
  competencyOutcome,
  createJourney,
  dueCheck,
  engineClaim,
  essayView,
  gapHypotheses,
  journeyStatus,
  type LearningJourney,
  type LedgerEvent,
  Ledger,
  leafView,
  planCheck,
  planDiagnosticFor,
  planDiagnostics,
  planReview,
  targetShownAt,
  usedItems,
} from "../src/index.ts";
import { DAY, ESSAY_2_ONE_ERROR, INFORMATIONS, karthikDue, karthikShown, LEARNER, PLU, record, withExtra } from "./karthik-helpers.ts";

const TARGET = 5;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

/** Essay 2 with plural errors in two sentences: meaningful contradictory evidence on its own. */
const ESSAY_2_TWO_ERRORS = `${ESSAY_2_ONE_ERROR} We carried the new furnitures into the house.`;
const TWO_ERRORS = [...INFORMATIONS, { ...INFORMATIONS[0], quote: "new furnitures", explanation: "Furniture is uncountable.", correction: "new furniture" }];

const strip = <T extends { atTarget?: unknown }>(v: T) => {
  const { atTarget: _, ...rest } = v;
  return rest;
};

// ---------------------------------------------------------------- R1 retention timing

test("K13-R1a an earlier, lower demonstration does not start the target's clock or make the first target demonstration 'verified'", async () => {
  const { ectx, r } = await karthikShown([], true);
  const L = Ledger.rebuild(ectx.ctx, LEARNER, r.events);
  const shownAt = targetShownAt(L, PLU, TARGET, r.now())!;
  const generic = r.view();
  const v = r.tview();
  // the engine's own schedule started at the low-level practice days earlier; history, kept as it was
  assert.ok(generic.retention.firstDemonstratedAt! < shownAt, "a lower level was shown first");
  assert.equal(v.atTarget!.retention.firstDemonstratedAt, shownAt, "the target's schedule starts when the target was first shown");
  // before (policy @3): the session that first showed the target was the generic schedule's "check", so it read verified
  assert.equal(engineClaim(ectx, PLU, generic).level, "verified", "the defect: verified at the very first target demonstration");
  const claim = engineClaim(ectx, PLU, v);
  assert.equal(claim.level, "demonstrated", "after: shown, not yet verified");
  const o = competencyOutcome(ectx, r.events, PLU, r.now());
  assert.equal(o.verified, false);
  assert.equal(o.retention, "pending");
  assert.equal(days(shownAt, o.retentionDueAt!), ectx.policy.retentionDelayDays, "the delayed check is due the policy's delay after the target was shown");
  // and the claim is withdrawn on the target's own date, not two weeks later on the older clock
  r.days(days(r.now(), v.atTarget!.retention.dueAt!) + 0.01);
  assert.equal(r.tview().atTarget!.verification.status, "overdue");
  assert.notEqual(r.view().verification.status, "overdue", "the generic schedule (unchanged) is not due yet");
  assert.equal(competencyOutcome(ectx, r.events, PLU, r.now()).next?.kind, "retention");
});

test("K13-R1b verified only after a delayed check at least the policy's delay after the target was first shown", async () => {
  const { ectx, r, first } = await karthikShown([], true);
  const shownAt = r.tview().atTarget!.retention.firstDemonstratedAt!;
  const p = planCheck(ectx, r.events, r.meta("plan"), PLU, journeyStatus(ectx, r.events, first.id, r.now()));
  r.events.push(p.event);
  assert.equal(p.check.kind, "retention");
  assert.equal(days(shownAt, p.check.notBefore), ectx.policy.retentionDelayDays);
  assert.equal(dueCheck(ectx, r.events, r.now()), null, "never offered early");
  r.days(days(r.now(), p.check.notBefore) + 0.01);
  for (const i of p.check.items) r.answer(i.id, true, "delayed");
  const o = competencyOutcome(ectx, r.events, PLU, r.now());
  assert.equal(o.retention, "demonstrated");
  assert.equal(o.verified, true);
  const ver = r.tview().atTarget!.verification;
  assert.ok(days(shownAt, ver.verifiedAt!) >= ectx.policy.retentionDelayDays, "verified by a check after the delay, on the target's schedule");
});

test("K13-R1c compatibility: without a target the engine's view is unchanged; when the first demonstration is at the target both schedules agree", async () => {
  for (const early of [false, true]) {
    const { ectx, r } = await karthikShown([], early);
    const c = Ledger.rebuild(ectx.ctx, LEARNER, r.events).composite;
    for (let d = 0; d < 20; d += 3) {
      const at = new Date(Date.parse(r.now()) + d * DAY).toISOString();
      const plain = leafView(c, ectx.ctx.index, PLU, at);
      const anchored = essayView(ectx, c, PLU, at);
      assert.equal(plain.atTarget, undefined);
      assert.deepEqual(strip(anchored), plain, "the anchored view only adds `atTarget`; everything else is the engine's own view");
      if (plain.retention.firstDemonstratedAt === anchored.atTarget!.retention.firstDemonstratedAt) assert.deepEqual(anchored.atTarget!.retention, plain.retention);
    }
  }
  // a learner whose first demonstration is already at the target: the two schedules are the same at every point
  const ectx = withExtra();
  const r = record(ectx);
  for (let d = 0; d < 3; d++) {
    for (const k of [1, 2, 3, 4].map((x) => x + 4 * d)) r.answer(`test.k10.${k}`, true, `t${d}`);
    r.days(1);
  }
  const c = Ledger.rebuild(ectx.ctx, LEARNER, r.events).composite;
  const g0 = leafView(c, ectx.ctx.index, PLU, r.now());
  assert.ok(g0.retention.firstDemonstratedAt && (g0.demonstrated ?? 0) >= TARGET, "shown, at the target");
  for (let d = 0; d < 30; d += 2) {
    const at = new Date(Date.parse(r.now()) + d * DAY).toISOString();
    assert.deepEqual(essayView(ectx, c, PLU, at).atTarget!.retention, leafView(c, ectx.ctx.index, PLU, at).retention, "first shown at the target: the two schedules are the same");
  }
});

// ---------------------------------------------------------------- R2 repeated essays

test("K13-R2a a later essay with one plural error does not restart diagnosis for plurals Karthik has shown at the target", async () => {
  const { ectx, r, ev } = await karthikShown(INFORMATIONS);
  r.days(2);
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU && x.essays.includes("essay:2"))!;
  assert.equal(h.status, "suspected", "the essay's error is still recorded and suspected with the earlier essay's errors");
  assert.equal(h.reassessment?.reason, "held");
  assert.equal(h.reassessment?.diagnose, false);
  // before (policy @3): planDiagnostics planned three new diagnostic questions here
  const d = planDiagnostics(ectx, r.events, () => r.meta("e2"));
  assert.ok(!d.requests.some((q) => q.competency === PLU), "no automatic diagnostic for plurals");
  assert.throws(() => planDiagnosticFor(ectx, r.events, h.id, r.meta("e2")), /not enough to reopen it/);
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2").journey;
  assert.ok(!j.trees.some((t) => t.nodes.some((n) => n.competency === PLU)), "nothing is asked or taught on plurals");
  assert.match(j.skipped.find((s) => s.competency === PLU)!.reason, /watched, not reassessed/);
  // an explicit reason (the learner chooses to check it) still can, and the reason is recorded
  const e = planDiagnosticFor(ectx, r.events, h.id, r.meta("e2"), { explicitReason: "the learner chose to check this skill again" });
  assert.equal(e.request.reassessment, "the learner chose to check this skill again");
});

test("K13-R2b meaningful contradictory evidence (errors in two sentences of the new essay) reopens it with questions, not a lesson", async () => {
  const { ectx, r, ev } = await karthikShown(TWO_ERRORS);
  r.days(2);
  await r.essay("essay:2", ESSAY_2_TWO_ERRORS, ev, "e2");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU && x.essays.includes("essay:2"))!;
  assert.equal(h.reassessment?.reason, "contradictory");
  assert.equal(h.reassessment?.diagnose, true);
  const d = planDiagnostics(ectx, r.events, () => r.meta("e2"));
  const req = d.requests.find((q) => q.competency === PLU)!;
  assert.ok(req, "diagnosed again");
  assert.match(req.reassessment!, /this essay alone has errors in 2 sentences/);
});

test("K13-R2c with the delayed check due, the delayed check is the assessment: no diagnostic questions, check first in the journey", async () => {
  const { ectx, r, ev } = await karthikDue();
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU && x.essays.includes("essay:2"))!;
  assert.equal(h.reassessment?.reason, "retention_due");
  assert.ok(!planDiagnostics(ectx, r.events, () => r.meta("e2")).requests.some((q) => q.competency === PLU));
  const node = createJourney(ectx, r.events, r.meta("e2"), "essay:2").journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "retention_due");
  assert.equal(node.steps[0].purpose, "retention");
});

// ---------------------------------------------------------------- R3 failed retention (Karthik's multi-session journey)

/** Karthik shown at the target, the delayed check planned, then taken when due and failed. */
async function karthikFailsDelayedCheck() {
  const s = await karthikShown(INFORMATIONS);
  const { ectx, r, first } = s;
  const p = planCheck(ectx, r.events, r.meta("plan"), PLU, journeyStatus(ectx, r.events, first.id, r.now()));
  r.events.push(p.event);
  assert.equal(p.check.kind, "retention");
  const beforeFailure = journeyStatus(ectx, r.events, first.id, r.now());
  r.days(days(r.now(), p.check.notBefore) + 0.01);
  for (const i of p.check.items) r.answer(i.id, false, "delayed");
  assert.equal(checkProgress(ectx, r.events, p.check).passed, false);
  return { ...s, delayed: p.check, beforeFailure };
}

/** The assigned steps, and whether each was carried out ("green" and "done" are both carried out; green also reads the engine). */
const stepsOf = (j: LearningJourney) => j.trees.flatMap((t) => t.nodes.flatMap((n) => n.steps.map((x) => [x.id, x.kind, x.order, x.status === "green" ? "done" : x.status])));

test("K13-R3 Karthik fails his delayed check: the review is recorded at once and appears in his existing journey; its steps and percentage are unchanged", async () => {
  const { ectx, r, ev, first, delayed, beforeFailure } = await karthikFailsDelayedCheck();
  let o = competencyOutcome(ectx, r.events, PLU, r.now());
  assert.equal(o.retention, "not_demonstrated");
  assert.deepEqual(o.review, { required: delayed.id, planned: null, complete: false }, "required immediately, without another essay");
  assert.throws(() => planCheck(ectx, r.events, r.meta("plan"), PLU), /review is required first/);
  // recorded at once (the studio does this when the last delayed-check answer is given)
  const rv = planReview(ectx, r.events, r.meta("review"), PLU);
  r.events.push(rv.event);
  assert.equal(rv.event.record.type, "check", "an ordinary planned-check record: earlier app versions read it as a later check");
  assert.equal(rv.check.kind, "verification");
  assert.equal(rv.check.review!.after, delayed.id);
  assert.ok(rv.check.review!.lessons.length > 0 && rv.check.review!.practice.length > 0 && rv.check.items.length === ectx.policy.checkItems);
  assert.throws(() => planReview(ectx, r.events, r.meta("review"), PLU), /already recorded/, "never twice");
  o = competencyOutcome(ectx, r.events, PLU, r.now());
  assert.equal(o.review?.planned, rv.check.id);
  assert.match(o.pending!, /review after the delayed check/);

  // the existing journey shows it; its own assigned steps and completion percentage are exactly as before the failure
  let st = journeyStatus(ectx, r.events, first.id, r.now());
  assert.deepEqual(stepsOf(st), stepsOf(beforeFailure), "the assigned sequence is not regenerated or erased");
  assert.deepEqual(st.progress, beforeFailure.progress, "historical completion percentage is preserved");
  assert.equal(st.reviews?.length, 1);
  assert.deepEqual(st.reviews![0].steps.map((x) => [x.kind, x.status]), [["teach", "pending"], ["guided_practice", "pending"], ["independent_check", "pending"]]);

  // the review's check never comes before its lesson, nor before its date
  r.days(days(r.now(), rv.check.notBefore) + 0.01);
  assert.equal(dueCheck(ectx, r.events, r.now()), null, "lesson first");
  r.teach(PLU, rv.check.review!.lessons[0], "rev");
  for (const id of rv.check.review!.practice) r.practise(id, "rev");
  st = journeyStatus(ectx, r.events, first.id, r.now());
  assert.deepEqual(st.reviews![0].steps.map((x) => x.status), ["done", "done", "pending"]);
  r.days(1);
  const due = dueCheck(ectx, r.events, r.now());
  assert.equal(due?.check.id, rv.check.id, "then the review's check, in a new sitting");
  for (const i of rv.check.items) r.answer(i.id, true, "rev-check");
  st = journeyStatus(ectx, r.events, first.id, r.now());
  assert.equal(st.reviews![0].complete, true);
  assert.deepEqual(st.progress, beforeFailure.progress, "the review never changes the journey's own percentage");
  o = competencyOutcome(ectx, r.events, PLU, r.now(), st);
  assert.equal(o.review?.complete, true);
  assert.equal(o.demonstrated, true, `kept after the review, by the engine's own rule: ${o.pending}`);
  assert.equal(o.next?.kind, "retention", "and another delayed check follows");

  // a third essay with one plural error: neither re-diagnosed nor re-taught
  await r.essay("essay:3", `${ESSAY_2_ONE_ERROR} It rained in the evening.`, ev, "e3");
  assert.ok(gapHypotheses(ectx, r.events).some((x) => x.competency === PLU && x.essays.includes("essay:3")), "the third essay's error is recorded");
  assert.ok(!planDiagnostics(ectx, r.events, () => r.meta("e3")).requests.some((q) => q.competency === PLU));
  const j3 = createJourney(ectx, r.events, r.meta("e3"), "essay:3").journey;
  assert.ok(!j3.trees.some((t) => t.nodes.some((n) => n.competency === PLU && n.steps.some((x) => x.kind === "teach" && !x.condition))));
});

test("K13-R3b an essay before the review is done does not plan a second review or re-teach: the review continues in the existing journey", async () => {
  const { ectx, r, ev } = await karthikFailsDelayedCheck();
  r.events.push(planReview(ectx, r.events, r.meta("review"), PLU).event);
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU && x.essays.includes("essay:2"))!;
  assert.equal(h.reassessment?.reason, "review");
  assert.ok(!planDiagnostics(ectx, r.events, () => r.meta("e2")).requests.some((q) => q.competency === PLU));
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2");
  r.events.push(j.event);
  assert.ok(!j.journey.trees.some((t) => t.nodes.some((n) => n.competency === PLU)));
  assert.match(j.journey.skipped.find((s) => s.competency === PLU)!.reason, /review after the failed delayed check is already planned/);
  // the latest journey carries the review, so it is never lost when a new essay arrives
  assert.equal(journeyStatus(ectx, r.events, j.journey.id, r.now()).reviews?.length, 1);
});

test("K13-R3c a delayed check that is kept requires no review", async () => {
  const { ectx, r, first } = await karthikShown([]);
  const p = planCheck(ectx, r.events, r.meta("plan"), PLU, journeyStatus(ectx, r.events, first.id, r.now()));
  r.events.push(p.event);
  r.days(days(r.now(), p.check.notBefore) + 0.01);
  for (const i of p.check.items) r.answer(i.id, true, "delayed");
  assert.equal(competencyOutcome(ectx, r.events, PLU, r.now()).review, undefined);
  assert.throws(() => planReview(ectx, r.events, r.meta("review"), PLU), /no failed delayed check/);
  assert.deepEqual(journeyStatus(ectx, r.events, first.id, r.now()).reviews, []);
});

test("K13-R3d the review never consumes questions used elsewhere, and later plans never reuse the review's", async () => {
  const { ectx, r } = await karthikFailsDelayedCheck();
  const rv = planReview(ectx, r.events, r.meta("review"), PLU);
  const seen = new Set((r.events as LedgerEvent[]).flatMap((e) => (e.kind === "evidence" || e.kind === "assisted_response" ? [e.item.id] : [])));
  const mine = [...rv.check.items.map((i) => i.id), ...rv.check.review!.practice];
  assert.ok(mine.every((id) => !seen.has(id)), "unseen questions only");
  assert.equal(new Set(mine).size, mine.length);
  r.events.push(rv.event);
  const used = usedItems(r.events);
  assert.ok(mine.every((id) => used.has(id)), "reserved for the review: no later plan takes them");
});

test("K13-R3e a later failure never turns steps the check made unnecessary back into assigned steps: the sequence and percentage hold", async () => {
  const { ectx, r, ev } = await karthikDue();
  await r.essay("essay:2", ESSAY_2_ONE_ERROR, ev, "e2");
  const j = createJourney(ectx, r.events, r.meta("e2"), "essay:2");
  r.events.push(j.event);
  const node = j.journey.trees.find((t) => t.root === PLU)!.nodes[0];
  assert.equal(node.decision, "retention_due");
  for (const id of node.steps[0].content.refs) r.answer(id, true, "e2-check");
  const kept = journeyStatus(ectx, r.events, j.journey.id, r.now());
  const statuses = (st: LearningJourney) => st.trees.find((t) => t.root === PLU)!.nodes[0].steps.map((s) => (s.status === "green" ? "done" : s.status));
  assert.deepEqual(statuses(kept), ["done", "skipped", "skipped", "skipped"]);
  // weeks later the engine's next check at the target fails (wrong answers without help on unseen questions)
  r.days(days(r.now(), r.tview().atTarget!.retention.dueAt!) + 1);
  const used = usedItems(r.events);
  const unseen = Array.from({ length: 16 }, (_, k) => `test.k10.${k + 1}`).filter((id) => !used.has(id));
  assert.ok(unseen.length >= 2, "unseen, unreserved test questions remain");
  for (const id of unseen.slice(0, 2)) r.answer(id, false, "later-fail");
  assert.equal(r.tview().atTarget!.verification.status, "failed", "the engine records the failure");
  const after = journeyStatus(ectx, r.events, j.journey.id, r.now());
  assert.deepEqual(statuses(after), statuses(kept), "skipped steps stay skipped (before: they turned back into pending lessons)");
  assert.deepEqual(after.progress, kept.progress, "completion percentage unchanged");
  // the failure is handled from here: no automatic diagnosis, and a new essay teaches it as a review
  await r.essay("essay:3", `${ESSAY_2_ONE_ERROR} It rained in the evening.`, ev, "e3");
  const h = gapHypotheses(ectx, r.events).find((x) => x.competency === PLU && x.essays.includes("essay:3"))!;
  assert.equal(h.reassessment?.reason, "review");
  assert.equal(createJourney(ectx, r.events, r.meta("e3"), "essay:3").journey.trees.find((t) => t.root === PLU)!.nodes[0].decision, "review");
});

test("K13-R3f a partly right delayed check that still fails: the review is practice and a check; the lesson stays available, not required", async () => {
  // three questions kept for the delayed check; one right answer, which the engine's retention rule judges as not kept
  for (const pattern of [[true, false, false], [false, true, false], [false, false, true]]) {
    const s = await karthikShown(INFORMATIONS);
    const { r, first } = s;
    const ectx = { ...s.ectx, policy: { ...s.ectx.policy, retentionItems: 3 } };
    const p = planCheck(ectx, r.events, r.meta("plan"), PLU, journeyStatus(ectx, r.events, first.id, r.now()));
    r.events.push(p.event);
    r.days(days(r.now(), p.check.notBefore) + 0.01);
    p.check.items.forEach((i, k) => r.answer(i.id, pattern[k], "delayed"));
    if (checkProgress(ectx, r.events, p.check).passed !== false) continue;
    const rv = planReview(ectx, r.events, r.meta("review"), PLU);
    r.events.push(rv.event);
    assert.equal(rv.check.review!.lessonNeeded, false);
    const steps = journeyStatus(ectx, r.events, first.id, r.now()).reviews![0].steps;
    assert.deepEqual(steps.map((x) => [x.kind, x.status]), [["teach", "skipped"], ["guided_practice", "pending"], ["independent_check", "pending"]]);
    r.days(days(r.now(), rv.check.notBefore) + 0.01);
    assert.equal(dueCheck(ectx, r.events, r.now())?.check.id, rv.check.id, "the check does not wait for an optional lesson");
    return;
  }
  assert.fail("no mixed pattern failed the delayed check; the case is covered only by the all-wrong test");
});
