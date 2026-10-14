/**
 * Reliability of the doubling journey: reloads, leaving and returning, running out of questions, retrying
 * after failed strategies, late delayed checks and repeated opening. The app must never crash, falsely advance
 * or invent evidence. Synthetic learners only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { countsAsVerified } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, loadContent } from "./content.ts";
import { Learner } from "./learner.ts";
import { doublingRule } from "./journey.ts";
import { LEARNERS, noDouble, right, runJourney, stepJourney, strategiesTaught, testClock } from "./journey-sim.ts";
import { MemoryRepo } from "./store.ts";

const content = loadContent();

async function newLearner(name: string, c: AppContent = content, clock = testClock()) {
  const repo = new MemoryRepo();
  const l = await Learner.create(c, repo, name, "guardian", clock, `p-${name}`);
  return { l, repo, clock };
}
const reopen = (l: Learner, repo: MemoryRepo, c: AppContent = content) => Learner.open(c, repo, l.profileId, l.clock);
const kinds = (l: Learner) => l.events.map((e) => e.kind);

test("R-1 refreshing in the middle of a lesson and of guided practice: the same step comes back, nothing is lost or added", async () => {
  const { l, repo } = await newLearner("reload");
  await l.startJourney();
  for (let k = 0; k < 2; k++) {
    const v = await l.journey();
    if (v.step.kind !== "question") throw new Error("expected a question");
    await l.answerJourney(v.step.item, noDouble(v.step.item), v.step.purpose);
  }
  const atLesson = await l.journey();
  assert.equal(atLesson.step.kind, "teach");
  const n = l.events.length;
  // reload: a new Learner from the stored events
  const r1 = await reopen(l, repo);
  const again = await r1.journey();
  assert.equal(again.step.kind, "teach");
  assert.equal(again.step.kind === "teach" && again.step.strategy.id, "worked_examples");
  assert.equal(r1.events.length, n, "showing the lesson again records nothing");
  if (again.step.kind !== "teach") return;
  await r1.teach(again.step.strategy, again.decision.reason);
  // guided: a wrong try and a hint, then reload
  const g = await r1.journey();
  if (g.step.kind !== "guided") throw new Error("expected guided practice");
  await r1.answerGuided(g.step.item, noDouble(g.step.item), g.step.intervention);
  await r1.hint(g.step.item, g.step.strategy);
  const r2 = await reopen(r1, repo);
  const g2 = await r2.journey();
  assert.equal(g2.step.kind, "guided");
  if (g2.step.kind !== "guided") return;
  assert.equal(g2.step.item.id, g.step.item.id);
  assert.deepEqual([g2.step.attempts.length, g2.step.hints.length], [1, 1]);
});

test("R-2 leaving for another activity and returning: the journey carries on the same teaching block in a new session", async () => {
  const { l } = await newLearner("leave");
  const b = LEARNERS.B.behaviour(l);
  await l.startJourney();
  // diagnostic, lesson, then one guided word
  for (let guard = 0; guard < 10; guard++) {
    const v = await l.journey();
    if (v.step.kind === "guided" && v.step.attempts.length === 0 && strategiesTaught(l).length === 1 && l.events.some((e) => e.kind === "assisted_response")) break;
    await stepJourney(l, b, v);
  }
  const block = strategiesTaught(l);
  // leave: another activity ends the journey session as stopped
  await l.start({ type: "explore" });
  assert.equal(l.state.open?.event.type, "explore");
  const t = await runJourney(l, b);
  assert.deepEqual(strategiesTaught(l), block, "the same teaching block, not a new lesson");
  assert.equal(t.outcome, "improved_after_teaching");
  assert.equal(t.steps.filter((s) => s.startsWith("guided:")).length, 3, "the remaining three guided words");
});

test("R-3 running out of unseen assessment questions: a content gap, no mastery, no crash, and reopening adds nothing", async () => {
  const short = { ...content, journey: { ...content.journey, assessOrder: content.journey.assessOrder.slice(0, 3) } };
  const { l } = await newLearner("gap", short);
  const t = await runJourney(l, { independent: () => true, guided: () => 0 });
  assert.deepEqual([t.decision, t.outcome], ["content_gap", "content_gap"]);
  const rule = doublingRule(l.state, short, l.clock());
  assert.equal(rule.status, "insufficient_evidence");
  const n = l.events.length;
  const v = await l.startJourney();
  assert.equal(v.step.kind, "summary");
  assert.equal(l.events.length, n);
});

test("R-4 running out of retention questions: the delayed check is reported as a gap; the earlier result stands and is not verified", async () => {
  const exact = { ...content, journey: { ...content.journey, assessOrder: content.journey.assessOrder.slice(0, 5) } };
  const clock = testClock();
  const { l } = await newLearner("gap2", exact, clock);
  await runJourney(l, { independent: () => true, guided: () => 0 });
  clock.days(8);
  const v = await l.startJourney();
  assert.equal(v.step.kind, "summary");
  assert.equal(v.decision.action, "content_gap");
  const rule = doublingRule(l.state, exact, l.clock());
  assert.equal(rule.status, "demonstrated");
  assert.equal(l.doublingReport().retention, "pending");
});

test("R-5 retrying after failed strategies: a learner paused for support is not taught the same way again on later days", async () => {
  const clock = testClock();
  const { l } = await newLearner("retry", content, clock);
  await runJourney(l, LEARNERS.E.behaviour(l));
  const n = l.events.length;
  clock.days(3);
  const v = await l.startJourney();
  assert.equal(v.decision.action, "recommend_human");
  assert.equal(l.events.length, n, "opening it again adds no events");
  // a learner whose first strategy failed and who comes back the next day gets the next strategy, not the same one
  const { l: c } = await newLearner("retry2", content, clock);
  const bc = LEARNERS.E.behaviour(c);
  await c.startJourney();
  for (let guard = 0; guard < 40 && strategiesTaught(c).length < 1; guard++) await stepJourney(c, bc, await c.journey());
  for (let guard = 0; guard < 40; guard++) {
    const v2 = await c.journey();
    if (v2.step.kind === "teach") break;
    await stepJourney(c, bc, v2);
  }
  await c.stop();
  clock.days(1);
  const back = await c.startJourney();
  assert.equal(back.step.kind, "teach");
  assert.equal(back.step.kind === "teach" && back.step.strategy.id, "sound_first");
});

test("R-6 a delayed check taken well after its date: right answers confirm retention; the claim stays a demonstration on provisional questions", async () => {
  const clock = testClock();
  const { l } = await newLearner("late", content, clock);
  await runJourney(l, LEARNERS.A.behaviour(l));
  clock.days(30);
  const t = await runJourney(l, { independent: () => true, guided: () => 0 });
  assert.equal(t.steps.length, 2);
  assert.ok(t.steps.every((s) => s.startsWith("retention:")));
  assert.equal(t.outcome, "retention_confirmed");
  const rule = doublingRule(l.state, content, l.clock());
  assert.equal(rule.status, "verified");
  assert.equal(countsAsVerified(rule), false, "provisional questions never verify");
  const r = l.doublingReport();
  assert.equal(r.retention, "confirmed");
  assert.match(r.status, /provisional questions: a demonstration, not a verified result/);
});

test("R-7 opening the journey repeatedly never duplicates events", async () => {
  const { l } = await newLearner("repeat");
  await l.startJourney();
  await l.startJourney();
  assert.equal(l.events.filter((e) => e.kind === "session").length, 1);
  await l.journey();
  const n = l.events.length;
  for (let k = 0; k < 5; k++) await l.journey();
  for (let k = 0; k < 3; k++) await l.startJourney();
  assert.equal(l.events.length, n);
  assert.equal(kinds(l).filter((k) => k === "presented").length, 1);
});

test("R-8 the provisional journey questions never change the capability estimate", async () => {
  const { l } = await newLearner("gate");
  const before = JSON.stringify(l.state.ledger.composite.nodes[content.journey.capability].direct);
  await l.startJourney();
  for (let k = 0; k < 5; k++) {
    const v = await l.journey();
    if (v.step.kind !== "question") break;
    const provisional = v.step.item.evidence_status === "provisional";
    const was = JSON.stringify(l.state.ledger.composite.nodes[content.journey.capability].direct);
    await l.answerJourney(v.step.item, right(v.step.item), v.step.purpose);
    const now = JSON.stringify(l.state.ledger.composite.nodes[content.journey.capability].direct);
    if (provisional) assert.equal(now, was, `${v.step.item.id} is provisional: no estimate change`);
    else assert.notEqual(now, was, `${v.step.item.id} is a candidate bank item: it updates the estimate, as before`);
  }
  assert.notEqual(JSON.stringify(l.state.ledger.composite.nodes[content.journey.capability].direct), before);
  const held = l.state.ledger.decisions.filter((d) => d.verdict === "held" && d.reasons[0].includes("provisional item"));
  assert.equal(held.length, 4);
});

test("R-9 a finished journey is closed when its summary appears, even if the app is then simply closed; a return a week later is a new session with a real delayed check", async () => {
  const clock = testClock();
  const { l, repo } = await newLearner("closed", content, clock);
  const b = LEARNERS.A.behaviour(l);
  await l.startJourney();
  for (let g = 0; g < 20; g++) {
    const v = await l.journey();
    if (v.step.kind === "summary") break;
    await stepJourney(l, b, v);
  }
  // no "Back to today": the app is closed here
  assert.equal(l.state.open, null);
  clock.days(8);
  const back = await reopen(l, repo);
  await back.startJourney();
  for (let k = 0; k < 2; k++) {
    const v = await back.journey();
    if (v.step.kind !== "question") throw new Error(`expected a retention question, got ${v.step.kind}`);
    assert.equal(v.step.purpose, "retention");
    await back.answerJourney(v.step.item, noDouble(v.step.item), "retention");
  }
  const rule = doublingRule(back.state, content, back.clock());
  assert.equal(rule.retention.state, "failed");
  assert.equal(rule.retention.checks.length, 1);
});

test("R-10 a journey left open in the middle and reopened days later is ended and a new session starts; nothing is lost", async () => {
  const clock = testClock();
  const { l } = await newLearner("idle", content, clock);
  await l.startJourney();
  const v = await l.journey();
  if (v.step.kind !== "question") throw new Error("expected a question");
  await l.answerJourney(v.step.item, right(v.step.item), v.step.purpose);
  const first = l.state.open!.event.session;
  clock.days(2);
  await l.startJourney();
  assert.notEqual(l.state.open!.event.session, first);
  assert.equal(l.state.sessions.get(first)!.end?.reason, "stopped");
  assert.equal(l.events.filter((e) => e.kind === "evidence").length, 1);
});
