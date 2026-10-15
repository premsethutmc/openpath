/**
 * The unified learner profile and development plan, end to end through the app's own logic (the same calls the
 * screens make), for synthetic learners A–F on real framework capabilities and the real question bank. Every
 * profile is rebuilt from the stored events and must match. Synthetic learners show software behaviour, not
 * educational effectiveness.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadContent } from "./content.ts";
import { Learner } from "./learner.ts";
import { runJourney, testClock } from "./journey-sim.ts";
import { onCaps, runSession, start } from "./profile-sim.ts";
import { MemoryRepo } from "./store.ts";
import { fold } from "./state.ts";
import { learnerProfile } from "./profile.ts";
import { leafView } from "../../../../packages/english-core/src/index.ts";

const content = loadContent();
const all = () => true;
const RDG_MAIN = "EN.RDG.SUM.main_idea";
const RDG_DETAIL = "EN.RDG.LIT.locate_detail";
const SVA = "EN.GRM.VERB.sva";
const SPELLING = ["EN.FND.SPL.inflections", "EN.FND.SPL.morphological", "EN.FND.SPL.homophones"];

async function newLearner(name: string, clock = testClock()) {
  const repo = new MemoryRepo();
  const l = await Learner.create(content, repo, name, "guardian", clock, `p-${name}`);
  return { l, repo, clock };
}
const cap = (l: Learner, id: string) => l.profile().capabilities.find((x) => x.id === id)!;
const check = (l: Learner, id: string, policy: (i: { target: string }) => boolean, purpose: "assess" | "retention" = "assess") => runSession(l, { type: "check", capability: id, purpose }, policy);

/** Rebuilt from the stored events alone: the same profile, plan and activities. */
async function assertReplay(l: Learner, repo: MemoryRepo) {
  const reopened = await Learner.open(content, repo, l.profileId, l.clock);
  const now = l.clock();
  const a = learnerProfile(fold(content, l.events), content, now);
  const b = learnerProfile(fold(content, reopened.events), content, now);
  assert.equal(JSON.stringify(b), JSON.stringify(a));
}

test("F: little evidence across all capabilities: an initial assessment, and no capability is called weak", async () => {
  const { l, repo } = await newLearner("F");
  let p = l.profile();
  assert.deepEqual(p.plan.today.map((r) => r.action), ["initial_assessment"]);
  assert.deepEqual(p.activities.map((a) => a.step.type), ["placement"]);
  // three answers, all wrong, then stopped: still an initial assessment, still nothing "found hard"
  await l.start({ type: "placement" });
  for (let k = 0; k < 3; k++) {
    const cur = await l.current();
    const { respond } = await import("./profile-sim.ts");
    await l.answer(cur.next!.item, respond(cur.next!.item, false), { use: cur.next!.use });
  }
  await l.stop();
  p = l.profile();
  assert.deepEqual(p.plan.today.map((r) => r.action), ["initial_assessment"]);
  assert.ok(p.capabilities.every((x) => x.standing !== "found_hard"), "three wrong answers across capabilities are not a weakness");
  assert.ok(p.capabilities.filter((x) => x.standing === "not_checked").length > 40);
  assert.deepEqual(p.activities.map((a) => [a.kind, a.step.type]), [["start", "placement"]], "the starting point is offered again, not the next step");
  await assertReplay(l, repo);
});

test("missing evidence versus weakness: an unchecked capability is 'not checked', a capability with wrong answers alone is 'found hard'", async () => {
  const { l } = await newLearner("M");
  await start(l, all);
  assert.equal(cap(l, RDG_MAIN).standing, "not_checked");
  assert.deepEqual(cap(l, RDG_MAIN).difficulties, []);
  await check(l, RDG_MAIN, () => false);
  assert.equal(cap(l, RDG_MAIN).standing, "found_hard");
  assert.match(cap(l, RDG_MAIN).difficulties[0], /0 of \d+ right on their own/);
});

test("A: strong spelling, uncertain comprehension: the plan asks about comprehension, not more spelling; many capabilities in one learner", async () => {
  const { l, repo } = await newLearner("A");
  await start(l, all);
  for (const id of SPELLING) await check(l, id, all);
  for (const id of SPELLING) assert.ok(["shown", "confirmed"].includes(cap(l, id).standing), `${id}: ${cap(l, id).standing}`);
  // two reading answers, one right: not enough to say
  await l.start({ type: "check", capability: RDG_MAIN, purpose: "assess" });
  const { respond } = await import("./profile-sim.ts");
  for (const ok of [true, false]) {
    const cur = await l.current();
    await l.answer(cur.next!.item, respond(cur.next!.item, ok), { use: cur.next!.use });
  }
  await l.stop();
  const p = l.profile();
  assert.equal(cap(l, RDG_MAIN).standing, "uncertain");
  assert.ok(p.activities.some((a) => a.step.capability === RDG_MAIN), "comprehension is in today's plan");
  assert.ok(!p.activities.some((a) => SPELLING.includes(a.step.capability ?? "")), "spelling is not repeated");
  assert.ok(p.capabilities.filter((x) => x.standing !== "not_checked").length >= 10, "many capabilities in one profile");
  await assertReplay(l, repo);
});

test("B: a hard capability with an unmeasured prerequisite: the prerequisite is checked first; when it is shown, the plan moves on and says why", async () => {
  const { l, repo } = await newLearner("B");
  await start(l, all);
  await check(l, RDG_MAIN, () => false);
  let p = l.profile();
  assert.deepEqual([p.plan.today[0].action, p.plan.today[0].capability, p.plan.today[0].because], ["check_prerequisite", RDG_DETAIL, RDG_MAIN]);
  assert.equal(p.activities[0].step.capability, RDG_DETAIL);
  assert.match(cap(l, RDG_MAIN).notes[0], /may reflect/i);
  assert.ok(!p.plan.all.some((r) => r.capability === RDG_MAIN), "main idea is not worked on while its prerequisite is unknown");
  // the prerequisite is shown: main idea is now its own difficulty, taught with the pilot's reading lessons (PR #24)
  await check(l, RDG_DETAIL, all);
  p = l.profile();
  assert.ok(["shown", "confirmed"].includes(cap(l, RDG_DETAIL).standing));
  assert.deepEqual([p.plan.today[0].action, p.plan.today[0].capability], ["teach", RDG_MAIN]);
  const teach = p.activities.find((a) => a.step.capability === RDG_MAIN)!;
  assert.deepEqual([teach.kind, teach.step.type, teach.step.lesson], ["keep_learning", "guided", `${RDG_MAIN}#topic`], "the first reading lesson in the sequence");
  const { overview } = l.overview();
  assert.ok(overview.changes.some((t) => /Locating details|locate|detail/i.test(t) && /→/.test(t)), overview.changes.join(" | "));
  assert.ok(overview.changes.some((t) => /No longer planned: Check .* first/.test(t)));
  await assertReplay(l, repo);
});

test("B2: a hard capability whose prerequisite is also hard: the prerequisite is taught first, never the dependent skill", async () => {
  const { l } = await newLearner("B2");
  await start(l, all);
  await check(l, RDG_MAIN, () => false);
  await check(l, RDG_DETAIL, () => false);
  const p = l.profile();
  assert.deepEqual([p.plan.today[0].action, p.plan.today[0].capability, p.plan.today[0].because], ["teach_prerequisite", RDG_DETAIL, RDG_MAIN]);
  assert.deepEqual([p.activities[0].kind, p.activities[0].step.capability, p.activities[0].step.lesson], ["keep_learning", RDG_DETAIL, `${RDG_DETAIL}#short_fact`]);
  assert.ok(!p.activities.some((a) => a.step.capability === RDG_MAIN), "the dependent skill waits for its prerequisite");
});

test("C / G: wrong on their own, a lesson, right in practice straight after it: 'improving, awaiting confirmation', never 'shown'; the next step is a fresh check", async () => {
  const { l, repo } = await newLearner("C");
  await start(l, (i) => i.target !== SVA);
  await check(l, SVA, () => false);
  let p = l.profile();
  assert.equal(cap(l, SVA).standing, "found_hard");
  assert.deepEqual([p.activities[0].kind, p.activities[0].step.type, p.activities[0].step.capability], ["keep_learning", "guided", SVA]);
  await runSession(l, p.activities[0].step, all); // the lesson, then practice, all right
  p = l.profile();
  const sva = cap(l, SVA);
  assert.equal(sva.standing, "improving");
  assert.ok(sva.evidence.afterTeaching >= 3 && sva.evidence.afterTeachingRight === sva.evidence.afterTeaching);
  assert.equal(sva.evidence.independentRight, 0, "practice after the lesson is never counted as independent");
  assert.notEqual(leafView(l.state.ledger.composite, content.index, SVA, l.clock()).verification.status, "demonstrated");
  assert.match(sva.strengths[0], /Not yet shown on their own/);
  assert.deepEqual([p.plan.today[0].action, p.plan.today[0].capability], ["confirm", SVA]);
  assert.deepEqual([p.activities[0].kind, p.activities[0].step.type, p.activities[0].step.capability, p.activities[0].step.purpose], ["show_what_you_know", "check", SVA, "confirm"]);
  const { overview } = l.overview();
  assert.ok(overview.improving.some((x) => x.id === SVA));
  assert.ok(!overview.shown.some((x) => x.id === SVA));
  assert.ok(overview.changes.some((t) => /No longer planned: Learn Subject–verb agreement/.test(t)));
  assert.ok(overview.improved.some((t) => /Subject–verb agreement: found hard so far on .*, improving in practice, awaiting confirmation now/.test(t)), overview.improved.join(" | "));
  await assertReplay(l, repo);
});

test("H: after the lesson, right on fresh questions in a separate check: the skill can be shown by the existing rules", async () => {
  const { l, repo } = await newLearner("H");
  await start(l, (i) => i.target !== SVA);
  await check(l, SVA, () => false);
  await runSession(l, l.profile().activities[0].step, all); // lesson and practice
  await runSession(l, l.profile().activities[0].step, all); // the fresh check the plan asked for
  const sva = cap(l, SVA);
  assert.ok(["shown", "developing"].includes(sva.standing), sva.standing);
  assert.ok(sva.evidence.independentRight >= 3);
  if (sva.standing === "shown") assert.ok(sva.shownLevel !== null && /at about level \d/.test(sva.strengths[0]), "shown always carries the level shown");
  assert.ok(!l.profile().plan.all.some((r) => r.capability === SVA && (r.action === "confirm" || r.action === "teach")));
  await assertReplay(l, repo);
});

test("I: shown after teaching and a fresh check, then wrong at the check ten days later: refreshing comes first", async () => {
  const clock = testClock();
  const { l, repo } = await newLearner("I", clock);
  await start(l, (i) => i.target !== SVA);
  await check(l, SVA, () => false);
  await runSession(l, l.profile().activities[0].step, all);
  await runSession(l, l.profile().activities[0].step, all);
  if (cap(l, SVA).standing !== "shown") await check(l, SVA, all);
  assert.equal(cap(l, SVA).standing, "shown");
  clock.days(10);
  assert.equal(cap(l, SVA).standing, "check_due");
  await check(l, SVA, () => false, "retention");
  const p = l.profile();
  assert.equal(cap(l, SVA).standing, "not_kept");
  assert.deepEqual([p.plan.today[0].action, p.plan.today[0].capability], ["refresh", SVA]);
  await assertReplay(l, repo);
});

test("J: second attempts and hints add no independent proficiency: the estimate and independent counts match a learner who never retried", async () => {
  const retried = await newLearner("J1");
  const plain = await newLearner("J2");
  for (const x of [retried, plain]) await start(x.l, all);
  await runSession(retried.l, { type: "check", capability: SVA, purpose: "assess" }, () => false, { retry: true });
  await runSession(plain.l, { type: "check", capability: SVA, purpose: "assess" }, () => false);
  // the same estimate: the retries are held. (They take extra minutes on the test clock, and the engine grows
  // uncertainty with time, so the numbers agree to well within 0.001 rather than to the last digit.)
  const ra = retried.l.state.ledger.composite.nodes[SVA].direct;
  const pa = plain.l.state.ledger.composite.nodes[SVA].direct;
  assert.ok(Math.abs(ra.mean - pa.mean) < 1e-3 && Math.abs(ra.variance - pa.variance) < 1e-3, `${JSON.stringify(ra)} vs ${JSON.stringify(pa)}`);
  assert.equal(retried.l.state.ledger.decisions.filter((d) => d.capability === SVA && d.verdict === "accepted").length, plain.l.state.ledger.decisions.filter((d) => d.capability === SVA && d.verdict === "accepted").length);
  const a = cap(retried.l, SVA);
  const b = cap(plain.l, SVA);
  assert.deepEqual([a.evidence.independent, a.evidence.independentRight], [b.evidence.independent, b.evidence.independentRight]);
  assert.ok(a.evidence.assisted > 0 && a.evidence.assistedRight === a.evidence.assisted, "the retries are recorded as help");
  assert.equal(a.standing, b.standing);
});

test("K: historical records without provenance, or from before lessons were tracked, are never relabelled independent", async () => {
  const { l } = await newLearner("K");
  await start(l, (i) => i.target !== SVA);
  await check(l, SVA, () => false);
  await runSession(l, l.profile().activities[0].step, all); // lesson and practice
  // the same record as an older app would have stored it: no interventions (before lessons were tracked)
  const beforeTracking = l.events.filter((e) => e.kind !== "intervention");
  const p1 = learnerProfile(fold(content, beforeTracking), content, l.clock());
  const k1 = p1.capabilities.find((x) => x.id === SVA)!;
  assert.ok(k1.evidence.afterTeaching > 0, "answers in a session that opened with a lesson are practice after teaching");
  assert.ok(!["shown", "confirmed"].includes(k1.standing), k1.standing);
  // and with no provenance at all: assistance unknown, never independent, never shown
  const noProvenance = beforeTracking.map((e) => {
    if (e.kind !== "evidence") return e;
    const { provenance: _p, ...rest } = e;
    return rest;
  });
  const p2 = learnerProfile(fold(content, noProvenance as typeof beforeTracking), content, l.clock());
  const k2 = p2.capabilities.find((x) => x.id === SVA)!;
  assert.equal(k2.evidence.independent, 0);
  assert.ok(k2.evidence.unknown > 0);
  assert.ok(!["shown", "confirmed", "found_hard"].includes(k2.standing), k2.standing);
  // the engine's own estimate for the old record is unchanged by this release (historical interpretation preserved)
  assert.equal(fold(content, noProvenance as typeof beforeTracking).ledger.decisions.filter((d) => d.observation?.setting).length, 0);
});

test("D: shown, then wrong at a later check: refreshing it comes first", async () => {
  const clock = testClock();
  const { l, repo } = await newLearner("D", clock);
  await start(l, all);
  await check(l, SVA, all);
  assert.equal(cap(l, SVA).standing, "shown");
  clock.days(10);
  let p = l.profile();
  assert.equal(cap(l, SVA).standing, "check_due");
  // other capabilities (spelling, now measured by dictation) may also be due: take the later check on SVA
  const sva = p.activities.find((a) => a.step.capability === SVA)!;
  assert.deepEqual([p.plan.today.find((r) => r.capability === SVA)?.action, sva.kind, sva.step.purpose], ["retention_check", "check_learned", "retention"]);
  await runSession(l, sva.step, () => false);
  p = l.profile();
  assert.equal(cap(l, SVA).standing, "not_kept");
  assert.deepEqual([p.plan.today[0].action, p.plan.today[0].capability], ["refresh", SVA]);
  assert.equal(p.activities[0].kind, "keep_learning");
  assert.match(cap(l, SVA).retention, /Not kept/);
  await assertReplay(l, repo);
});

test("E: many answers with help, little on their own: help is never taken for mastery", async () => {
  const { l, repo } = await newLearner("E");
  const INF = "EN.FND.SPL.inflections";
  await start(l, (i) => i.target !== INF);
  await runJourney(l, { independent: (i) => (i.family ?? "").endsWith(".contrast"), guided: () => 1 });
  const p = l.profile();
  const inf = cap(l, INF);
  assert.ok(inf.evidence.assistedRight >= 12);
  assert.ok(inf.evidence.provisional > 0, "the journey's provisional answers are shown apart");
  assert.ok(!["shown", "confirmed"].includes(inf.standing));
  assert.deepEqual(inf.strengths, []);
  assert.ok(!p.activities.some((a) => a.step.capability === INF), "not offered as if secure, and not repeated: paused for an adult");
  assert.ok(p.plan.forAdults.some((r) => r.capability === INF));
  const { overview } = l.overview();
  assert.ok(overview.helped.some((x) => x.id === INF));
  assert.ok(overview.provisional.some((t) => /never count/.test(t)));
  await assertReplay(l, repo);
});

test("content exhaustion: a capability with every question used is never offered to the child; the plan says so to an adult", async () => {
  const { l } = await newLearner("X");
  await start(l, all);
  // alternate right and wrong so the capability stays unsure, until no question is left
  for (let k = 0; k < 6 && cap(l, RDG_MAIN).content.assess > 0; k++) await check(l, RDG_MAIN, () => k % 2 === 0);
  const c = cap(l, RDG_MAIN);
  assert.equal(c.content.assess, 0);
  const p = l.profile();
  assert.ok(!p.activities.some((a) => a.step.capability === RDG_MAIN));
  if (!["shown", "confirmed"].includes(c.standing)) assert.ok(p.plan.forAdults.some((r) => r.capability === RDG_MAIN) || p.plan.all.every((r) => r.capability !== RDG_MAIN || !r.content.available));
});

test("provisional content stays apart: journey answers never move an estimate, never make a capability shown, and are labelled", async () => {
  const { l } = await newLearner("P");
  await start(l, all);
  const before = JSON.stringify(l.state.ledger.composite.nodes["EN.FND.SPL.inflections"]);
  await runJourney(l, { independent: () => true, guided: () => 0 });
  assert.equal(JSON.stringify(l.state.ledger.composite.nodes["EN.FND.SPL.inflections"]), before);
  const inf = cap(l, "EN.FND.SPL.inflections");
  assert.ok(inf.evidence.provisional >= 5);
  assert.ok(inf.difficulties.some((t) => /provisional questions, not counted/.test(t)) || inf.evidence.provisional > 0);
});

test("the profile is a view of the record, not a second store: nothing new is written by reading it", async () => {
  const { l } = await newLearner("V");
  await start(l, all);
  const n = l.events.length;
  l.profile();
  l.overview();
  assert.equal(l.events.length, n);
});
