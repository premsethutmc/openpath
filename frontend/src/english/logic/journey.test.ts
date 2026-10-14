/**
 * The adaptive consonant-doubling journey, end to end through the app's own logic (the same calls the
 * screens make), for six synthetic learners A–F. Every journey is replayed from its event log and must give
 * the same state, decision and parent summary.
 *
 * Synthetic learners establish software behaviour only, not educational effectiveness. All questions,
 * lessons and hints in the journey are provisional (not yet educator-reviewed).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadContent } from "./content.ts";
import { Learner } from "./learner.ts";
import { doublingRule, journeyView } from "./journey.ts";
import { fold } from "./state.ts";
import { noDouble, right, runJourney, strategiesTaught, testClock } from "./journey-sim.ts";
import { MemoryRepo } from "./store.ts";

const content = loadContent();

async function newLearner(name: string, clock = testClock()) {
  const repo = new MemoryRepo();
  const l = await Learner.create(content, repo, name, "guardian", clock, `p-${name}`);
  return { l, repo, clock };
}

/** Rebuild from the stored events alone and compare everything the screens show. */
async function assertReplay(l: Learner, repo: MemoryRepo) {
  const reopened = await Learner.open(content, repo, l.profileId, l.clock);
  const now = l.clock();
  const a = fold(content, l.events);
  const b = fold(content, reopened.events);
  assert.equal(JSON.stringify(b.ledger.composite), JSON.stringify(a.ledger.composite));
  assert.deepEqual(doublingRule(b, content, now), doublingRule(a, content, now));
  const reportA = JSON.stringify(l.doublingReport());
  assert.equal(JSON.stringify(reopened.doublingReport()), reportA);
}

const never = () => Infinity;
const evidenceIds = (l: Learner) => new Set(l.events.filter((e) => e.kind === "evidence").map((e) => (e as { item: { id: string } }).item.id));

test("Learner A understands doubling: independent questions only, shown on new words, no teaching, retention pending", async () => {
  const { l, repo } = await newLearner("A");
  const t = await runJourney(l, { independent: () => true, guided: () => 0 });
  assert.deepEqual(t.steps, ["assessment:spl.infl.j02:right", "assessment:spl.infl.18:right", "assessment:spl.infl.24:right", "assessment:spl.infl.19:right", "assessment:spl.infl.22:right"]);
  assert.equal(t.outcome, "shown_independently");
  const r = l.doublingReport();
  assert.equal(doublingRule(l.state, content, l.clock()).status, "demonstrated");
  assert.equal(r.retention, "pending");
  assert.ok(r.retentionDue);
  assert.equal(r.assistance.hints, 0);
  assert.deepEqual(r.afterTeaching, []);
  assert.match(r.status, /Not yet checked after a delay/);
  await assertReplay(l, repo);
});

test("Learner B fails at first, responds to teaching and succeeds on unfamiliar words: progress, not mastery", async () => {
  const { l, repo } = await newLearner("B");
  const taught = () => strategiesTaught(l).length > 0;
  const t = await runJourney(l, { independent: () => taught(), guided: () => 0 });
  assert.deepEqual(t.steps.slice(0, 3), ["assessment:spl.infl.j02:wrong", "assessment:spl.infl.18:wrong", "teach:worked_examples"]);
  assert.equal(t.steps.filter((s) => s.startsWith("guided:")).length, 4);
  assert.deepEqual(t.steps.slice(-2), ["reassess:spl.infl.19:right", "reassess:spl.infl.22:right"]);
  assert.equal(t.outcome, "improved_after_teaching");
  const rule = doublingRule(l.state, content, l.clock());
  assert.ok(!["demonstrated", "verified"].includes(rule.status), `no mastery claim: ${rule.status}`);
  const r = l.doublingReport();
  assert.deepEqual(r.afterTeaching, [{ strategy: "Rule and worked examples", right: 2, total: 2 }]);
  assert.equal(r.differentStrategyNeeded, false);
  assert.equal(r.retention, "not_shown");
  assert.match(r.status, /not yet mastery/);
  assert.ok(r.difficulty.some((d) => d.kind === "independent" && d.text.includes("swiming") && d.evidence.length === 1));
  await assertReplay(l, repo);
});

test("Learner C fails the first explanation and receives a different strategy, which works", async () => {
  const { l, repo } = await newLearner("C");
  const sound = () => strategiesTaught(l).includes("sound_first");
  const t = await runJourney(l, { independent: (i) => sound() || (i.family ?? "").endsWith(".contrast"), guided: () => (sound() ? 0 : Infinity) });
  const taught = t.steps.filter((s) => s.startsWith("teach:"));
  assert.deepEqual(taught, ["teach:worked_examples", "teach:sound_first"]);
  assert.equal(t.outcome, "improved_after_teaching");
  const r = l.doublingReport();
  assert.equal(r.differentStrategyNeeded, true);
  assert.deepEqual(
    r.afterTeaching.map((x) => [x.strategy, x.right, x.total]),
    [
      ["Rule and worked examples", 0, 2],
      ["Listen for the short vowel", 2, 2],
    ],
  );
  await assertReplay(l, repo);
});

test("Learner D succeeds only after hints: helped answers are never evidence and no independent success is claimed", async () => {
  const { l, repo } = await newLearner("D");
  const t = await runJourney(l, { independent: (i) => (i.family ?? "").endsWith(".contrast"), guided: () => 1 });
  assert.equal(t.decision, "recommend_human");
  assert.equal(t.diagnosis, "help_dependence");
  const guidedItems = new Set(content.journey.guided);
  // no guided item ever produced an evidence event: every answer to one was recorded as assisted
  for (const id of evidenceIds(l)) assert.ok(!guidedItems.has(id), `${id} is guided practice`);
  assert.ok(l.events.filter((e) => e.kind === "assisted_response").length >= 12);
  const rule = doublingRule(l.state, content, l.clock());
  assert.equal(rule.status, "weak");
  assert.ok(rule.assisted.total >= 24);
  const r = l.doublingReport();
  assert.ok(r.assistance.rightWithHelp >= 12 && r.assistance.rightFirstTry === 0);
  assert.equal(r.assistance.hints, 12, "one hint per word, counted once");
  assert.match(r.status, /with help/);
  assert.ok(r.afterTeaching.every((x) => x.right === 0));
  await assertReplay(l, repo);
});

test("Learner E repeatedly fails: three different approaches, then the app stops and recommends support (no 58 repetitions)", async () => {
  const { l, repo } = await newLearner("E");
  const t = await runJourney(l, { independent: (i) => (i.family ?? "").endsWith(".contrast"), guided: never });
  assert.equal(t.decision, "recommend_human");
  assert.equal(t.outcome, "paused_for_support");
  assert.equal(t.diagnosis, "misconception");
  const taught = strategiesTaught(l);
  assert.deepEqual(taught, ["worked_examples", "sound_first", "word_building"]);
  assert.equal(new Set(taught).size, taught.length, "no strategy repeated");
  const guided = t.steps.filter((s) => s.startsWith("guided:")).length;
  assert.equal(guided, 12, "four guided words per approach, three approaches");
  const r = l.doublingReport();
  assert.ok(r.support && /teacher or parent/.test(r.support));
  assert.equal(r.assistance.hints, 36, "12 words x 3 hints, each hint counted once");
  // starting again does not restart the same teaching: the rule stays paused for support
  const again = await runJourney(l, { independent: () => false, guided: never });
  assert.deepEqual(again.steps, []);
  assert.equal(again.decision, "recommend_human");
  await assertReplay(l, repo);
});

test("Learner F returns after seven days and fails retention: status changes, earlier progress is kept", async () => {
  const clock = testClock();
  const { l, repo } = await newLearner("F", clock);
  await runJourney(l, { independent: () => true, guided: () => 0 });
  const before = doublingRule(l.state, content, l.clock());
  assert.equal(before.status, "demonstrated");
  clock.days(8);
  await l.startJourney();
  const checked: string[] = [];
  for (let i = 0; i < 2; i++) {
    const v = await l.journey();
    assert.equal(v.step.kind, "question");
    if (v.step.kind !== "question") return;
    assert.equal(v.step.purpose, "retention");
    checked.push(v.step.item.id);
    await l.answerJourney(v.step.item, noDouble(v.step.item), "retention");
  }
  const after = doublingRule(l.state, content, l.clock());
  assert.equal(after.status, "needs_reconfirmation");
  assert.equal(after.retention.state, "failed");
  assert.equal(after.history.firstDemonstratedAt, before.history.firstDemonstratedAt);
  const r = l.doublingReport();
  assert.equal(r.retention, "failed");
  assert.match(r.status, /First shown on 2026-10-14/);
  // next: a refresher, not more questions and not a claim
  const next = await l.journey();
  assert.equal(next.step.kind, "teach");
  assert.equal(next.decision.diagnosis.kind, "retrieval_difficulty");
  await assertReplay(l, repo);
});

test("a slip (two letters swapped) is reported as a slip: no pattern, no rule error, evidence linked", async () => {
  const { l, repo } = await newLearner("G");
  await l.startJourney();
  const v = await l.journey();
  if (v.step.kind !== "question") throw new Error("expected a question");
  const a = (v.step.item as { answers: string[] }).answers[0];
  await l.answerJourney(v.step.item, { kind: "typed", text: a.slice(0, -2) + a.at(-1) + a.at(-2) }, "assessment");
  const r = l.doublingReport();
  assert.deepEqual(r.difficulty.map((d) => d.kind), ["slip"]);
  assert.match(r.difficulty[0].text, /letters swapped, the rule itself was applied/);
  assert.equal(r.difficulty[0].evidence.length, 1);
  assert.ok(l.events.some((e) => e.id === r.difficulty[0].evidence[0] && e.kind === "evidence"));
  await assertReplay(l, repo);
});

test("an answer after a hint is never independent, even on an assessment question", async () => {
  const { l } = await newLearner("H");
  await l.startJourney();
  const v = await l.journey();
  if (v.step.kind !== "question") throw new Error("expected a question");
  await l.hint(v.step.item, content.journey.strategies[0]);
  await l.answerJourney(v.step.item, right(v.step.item), "assessment");
  assert.equal(l.events.filter((e) => e.kind === "evidence").length, 0);
  assert.equal(l.events.filter((e) => e.kind === "assisted_response").length, 1);
});

test("legacy records with unknown assistance stay unknown: nothing is confirmed from them", async () => {
  const { l, repo } = await newLearner("L");
  await runJourney(l, { independent: () => true, guided: () => 0 });
  // the same answers as an older app would have stored them: no provenance
  const legacy = l.events.map((e) => {
    if (e.kind !== "evidence") return e;
    const { provenance: _p, ...rest } = e;
    return rest;
  });
  const s = fold(content, legacy);
  const rule = doublingRule(s, content, l.clock());
  assert.equal(rule.status, "insufficient_evidence");
  assert.equal(rule.unknown.total, 5);
  assert.equal(JSON.stringify(s.ledger.composite), JSON.stringify(l.state.ledger.composite));
  void repo;
});

test("the journey's provisional questions are never used by placement, practice or checks", () => {
  for (const i of content.journey.items) assert.ok(!content.handWritten.has(i.id), i.id);
  for (const i of content.journey.items) assert.equal(i.review, "candidate-unvalidated");
});

test("the planner's draft policy is configurable: two strategies before support", async () => {
  const { l } = await newLearner("P");
  await l.startJourney();
  const behave = async () => {
    for (let g = 0; g < 200; g++) {
      const v = journeyView(l.state, content, l.state.open!, l.clock(), { ...(await import("../../../../packages/english-core/src/index.ts")).PLANNER_POLICY_DRAFT, maxStrategiesBeforeHuman: 2 });
      const s = v.step;
      if (s.kind === "summary") return v;
      if (s.kind === "teach") await l.teach(s.strategy, "");
      else if (s.kind === "question") {
        await l.present(s.item, "assessment");
        await l.answerJourney(s.item, noDouble(s.item), s.purpose);
      } else if (s.attempts.length > s.hints.length) await l.hint(s.item, s.strategy);
      else await l.answerGuided(s.item, noDouble(s.item), s.intervention);
    }
    throw new Error("did not finish");
  };
  const v = await behave();
  assert.equal(v.decision.action, "recommend_human");
  assert.deepEqual(strategiesTaught(l), ["worked_examples", "sound_first"]);
});
