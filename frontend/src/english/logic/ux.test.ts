/**
 * The prototype's screens read the engine, never invent: the Learning Journey's stages come from the profile, "What
 * OpenPath noticed" comes from the ledger's own decision, and the learner's goal changes the order of the Journey
 * only — never an estimate, a question or the plan.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Item } from "../../../../packages/english-core/src/index.ts";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { noticedFor } from "./noticed.ts";
import { learningPath, stagesOf } from "./path.ts";
import type { CapabilityProfile } from "./profile.ts";
import { respond, runSession, start } from "./profile-sim.ts";
import { MemoryRepo } from "./store.ts";

const c = loadContent();
const ARTICLES = "EN.GRM.NOUN.articles";
const fresh = async (id: string) => {
  const clock = testClock();
  return { clock, l: await Learner.create(c, new MemoryRepo(), id, "guardian", clock, id) };
};

test("UX-1 Journey stages follow the profile's standing, one stage at a time", () => {
  const cap = (standing: CapabilityProfile["standing"], afterTeaching = 0) => ({ standing, evidence: { independent: 4, independentRight: 2, afterTeaching, afterTeachingRight: afterTeaching, unknown: 0 } }) as unknown as CapabilityProfile;
  const states = (standing: CapabilityProfile["standing"], afterTeaching = 0, taught = false) => stagesOf(cap(standing, afterTeaching), taught).map((s) => s.state);
  assert.deepEqual(states("not_checked"), ["now", "later", "later", "later"]);
  assert.deepEqual(states("uncertain"), ["now", "later", "later", "later"], "a few answers: the first check is still going on");
  assert.deepEqual(states("found_hard"), ["done", "now", "later", "later"]);
  assert.deepEqual(states("improving", 4, true), ["done", "done", "now", "later"]);
  assert.deepEqual(states("shown"), ["done", "not_needed", "done", "now"], "shown without a lesson: the lesson was not needed");
  assert.deepEqual(states("shown", 3, true), ["done", "done", "done", "now"]);
  assert.deepEqual(states("confirmed"), ["done", "not_needed", "done", "done"]);
  assert.deepEqual(states("check_due"), ["done", "not_needed", "done", "due"]);
  assert.deepEqual(states("not_kept", 2, true), ["done", "done", "done", "not_kept"]);
});

test("UX-2 the Journey offers only what the app can deliver: Today's activity, or a first check on an unchecked skill", async () => {
  const { l } = await fresh("ux2");
  // before the starting point: nothing to start
  assert.ok(learningPath(l.profile(), c.pilot.capabilities, new Set(), null, false).every((k) => k.start === null));
  await start(l, () => true);
  const path = learningPath(l.profile(), c.pilot.capabilities, new Set(l.state.lessons.keys()), null, true);
  const today = l.profile().activities;
  for (const k of path) {
    const t = today.find((a) => a.step.capability === k.id);
    if (t) assert.deepEqual(k.start?.step, t.step, `${k.id}: Today's own step`);
    else if (k.start) assert.equal(k.standing, "not_checked", `${k.id}: only an unchecked skill gets a first check`);
  }
});

test("UX-3 the goal changes the Journey's order only: estimates, questions and the plan are the same", async () => {
  const run = async (goal: "reading" | "spelling") => {
    const { l } = await fresh(`ux3-${goal}`);
    await l.setPreferences("school", goal);
    await start(l, (i) => i.b < 4);
    return l;
  };
  const a = await run("reading");
  const b = await run("spelling");
  // the same estimates for every capability (the records differ only in their own ids)
  const est = (l: Learner) => Object.fromEntries(Object.entries(l.state.ledger.composite.nodes).map(([k, n]) => [k, { direct: n.direct, combined: n.combined, n: n.directN }]));
  assert.deepEqual(est(a), est(b));
  assert.deepEqual(a.profile().activities.map((x) => x.step), b.profile().activities.map((x) => x.step));
  const order = (l: Learner) => learningPath(l.profile(), c.pilot.capabilities, new Set(), l.state.preferences!.goal, true).map((k) => k.area);
  assert.equal(order(a)[0], "Reading");
  assert.equal(order(b)[0], "Spelling");
});

test("UX-4 'What OpenPath noticed' is the engine's decision on that answer", async () => {
  const { l } = await fresh("ux4");
  // an independent first answer, right and wrong
  await l.start({ type: "check", capability: ARTICLES, purpose: "assess" });
  let cur = await l.current();
  await l.answer(cur.next!.item, respond(cur.next!.item, true), { use: cur.next!.use });
  assert.equal(noticedFor(l.state)?.kind, "independent");
  assert.match(noticedFor(l.state)!.text, /counts as evidence/);
  assert.doesNotMatch(noticedFor(l.state)!.text, /mastered/);
  cur = await l.current();
  await l.answer(cur.next!.item, respond(cur.next!.item, false), { use: cur.next!.use });
  assert.equal(noticedFor(l.state)?.title, "One answer is not a verdict");
  // a second try is help, never evidence
  await l.answer(cur.next!.item, respond(cur.next!.item, true), { assisted: true, use: cur.next!.use });
  assert.equal(noticedFor(l.state)?.kind, "help");
  await l.stop();
  // practice straight after a lesson
  await runSession(l, { type: "guided", capability: ARTICLES }, () => true);
  const after = l.state.ledger.decisions.filter((d) => d.observation?.setting === "after_teaching");
  assert.ok(after.length > 0);
  await l.start({ type: "guided", capability: ARTICLES });
  for (let cur2 = await l.current(); cur2.lesson; cur2 = await l.current()) await l.finishLesson(cur2.lesson.id, true);
  cur = await l.current();
  if (cur.next) {
    await l.answer(cur.next.item, respond(cur.next.item, true), { use: cur.next.use });
    assert.equal(noticedFor(l.state)?.kind, "after_teaching");
  }
  await l.stop();
  // a second answer on a reading passage already counted (passage@1)
  await l.start({ type: "check", capability: "EN.RDG.SUM.main_idea", purpose: "assess" });
  for (const id of ["rdg.p1.q5", "rdg.p1.q6"]) {
    const item = c.ctx.content.items.get(id) as Item;
    await l.answer(item, respond(item, true), { use: "assessment" });
  }
  assert.equal(noticedFor(l.state)?.kind, "same_passage");
  await l.stop();
});
