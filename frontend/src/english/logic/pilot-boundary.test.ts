/**
 * The pilot content-safety boundary (content.ts PilotGate). In a pilot build a pupil is shown a question only if its
 * activity is allowed, it is on the pilot allowlist at that version, and an educator approved that exact version.
 * Everything else is refused, and with no approvals nothing is shown (fail closed). Development builds are unchanged.
 *
 * The approvals here are injected for the test only (`loadContent({ approved })`); nothing is marked approved in the
 * committed content (content/english/pilot/reviews.json stays as the educator leaves it).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { type Code, PILOT_ALLOWLIST, activityAllowed, itemAllowed, loadContent } from "./content.ts";
import type { AppEvent, SessionType } from "./events.ts";
import { testClock } from "./journey-sim.ts";
import { Learner, PilotRefusal } from "./learner.ts";
import { respond, runSession } from "./profile-sim.ts";
import { MemoryRepo } from "./store.ts";

const ALL: SessionType[] = ["placement", "spelling_assess", "spelling_check", "spelling_practice", "spelling_review", "spelling_transfer", "guided", "explore", "check", "doubling_journey"];
const REFUSED = ALL.filter((t) => t !== "placement" && t !== "spelling_assess");
const reviews = JSON.parse(readFileSync(new URL("../../../../content/english/pilot/reviews.json", import.meta.url), "utf8")) as unknown[];

const placementIds = PILOT_ALLOWLIST.items.filter((a) => a.use === "placement");
const dictationIds = PILOT_ALLOWLIST.items.filter((a) => a.use === "dictation");
/** A test approval: the first `n` placement questions and `m` dictation words of the allowlist. */
const approve = (n: number, m: number) => [...placementIds.slice(0, n), ...dictationIds.slice(0, m)].map((a) => `${a.id}@${a.version}`);

const presentedIn = (l: Learner) => l.events.filter((e): e is Extract<AppEvent, { kind: "presented" }> => e.kind === "presented").map((e) => `${e.item.id}@${e.item.version}`);

test("PB-1 nothing is approved in the committed record, so the pilot build shows nothing (fail closed)", async () => {
  assert.equal(reviews.length, 0, "the committed review record has no decisions: nothing was marked approved automatically");
  const c = loadContent({ mode: "pilot" });
  assert.ok(c.gate);
  assert.equal(c.gate.allowed.size, 0);
  assert.equal(c.handWritten.size, 0);
  assert.equal(c.dictation.items.length, 0);
  assert.equal(c.generated.length, 0, "no generated practice");
  assert.equal(c.lessons.size, 0, "no lessons");
  assert.equal(c.feedback.size, 0, "no unreviewed feedback text");
  for (const t of ALL) assert.equal(activityAllowed(c, t), false, t);
  const l = await Learner.create(c, new MemoryRepo(), "Pilot", "guardian", testClock(), "p-empty");
  const before = l.events.length;
  assert.deepEqual(l.plan(), []);
  assert.deepEqual(l.profile().activities, []);
  for (const t of ALL) await assert.rejects(l.start({ type: t, capability: "EN.FND.SPL.inflections", step: "plain" }), PilotRefusal, t);
  await assert.rejects(l.startJourney(), PilotRefusal);
  await assert.rejects(l.journey(), PilotRefusal);
  assert.equal(l.events.length, before, "a refused activity records nothing");
  // every item is still in the bank, so an older record still rebuilds and scores exactly
  assert.equal(c.ctx.content.items.size, loadContent({ mode: "development" }).ctx.content.items.size);
});

test("PB-2 approvals count only for allowlisted questions at that exact version; anything else is refused", () => {
  const dev = loadContent({ mode: "development" });
  const generated = dev.generatedAll[0];
  const journey = dev.journey.items[0];
  const notListed = [...dev.handWritten].map((id) => dev.ctx.content.items.get(id) as Code).find((i) => !PILOT_ALLOWLIST.items.some((a) => a.id === i.id))!;
  const listed = placementIds[0];
  const c = loadContent({
    mode: "pilot",
    approved: [`${generated.id}@${generated.version}`, `${journey.id}@${journey.version}`, `${notListed.id}@${notListed.version}`, `${listed.id}@${listed.version + 1}`, "made.up@1", `${dictationIds[0].id}@${dictationIds[0].version}`],
  });
  assert.deepEqual([...c.gate!.allowed], [`${dictationIds[0].id}@${dictationIds[0].version}`], "only the allowlisted dictation word at its version");
  assert.equal(c.handWritten.size, 0);
  assert.equal(activityAllowed(c, "placement"), false, "no approved placement question: placement is not offered");
  assert.equal(activityAllowed(c, "spelling_assess"), true);
  for (const it of [generated, journey, notListed]) assert.equal(itemAllowed(c, it), false, it.id);
  assert.equal(itemAllowed(c, { id: listed.id, version: listed.version }), false, "the wrong version approved does not approve this one");
});

test("PB-3 with approvals: placement and the spelling check present only approved, allowlisted questions; the rest stays closed", async () => {
  const approved = new Set(approve(20, 15));
  const c = loadContent({ mode: "pilot", approved });
  assert.equal(c.gate!.allowed.size, 35);
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Pilot", "guardian", clock, "p-approved");
  l.speechAvailable = true;
  assert.deepEqual(l.plan().map((x) => x.type), ["placement"]);
  const placed = await runSession(l, { type: "placement" }, (_i, n) => n % 3 !== 0);
  assert.ok(placed.asked.length > 0, "placement ran on approved questions");
  assert.deepEqual(l.plan().map((x) => x.type), ["spelling_assess"]);
  const spelt = await runSession(l, { type: "spelling_assess" }, (_i, n) => n % 2 === 0);
  assert.ok(spelt.asked.length > 0, "the spelling check ran on approved words");
  const shown = presentedIn(l);
  assert.ok(shown.length >= placed.asked.length + spelt.asked.length);
  for (const k of shown) assert.ok(approved.has(k), `${k} was shown but is not approved`);
  // after the two checks nothing else is offered, whatever the plan would otherwise suggest
  for (const a of l.profile().activities) assert.ok(["placement", "spelling_assess"].includes(a.step.type), a.step.type);
  for (const t of REFUSED) await assert.rejects(l.start({ type: t, capability: "EN.FND.SPL.inflections", step: "plain" }), PilotRefusal, t);
  // the record is ordinary: the same events rebuild in a development build (pupil history is never lost)
  const dev = loadContent({ mode: "development" });
  const again = await Learner.open(dev, l.repo, l.profileId, clock);
  assert.equal(again.state.ledger.decisions.length, l.state.ledger.decisions.length);
});

test("PB-4 an unapproved question is refused at the last line, even when asked for directly", async () => {
  const c = loadContent({ mode: "pilot", approved: approve(10, 0) });
  const l = await Learner.create(c, new MemoryRepo(), "Pilot", "guardian", testClock(), "p-direct");
  await l.start({ type: "placement" });
  const other = c.ctx.content.items.get(placementIds[50].id)!;
  await assert.rejects(l.present(other, "assessment"), PilotRefusal);
  await assert.rejects(l.answer(other, respond(other, true), { use: "assessment" }), PilotRefusal);
  await assert.rejects(l.finishLesson("EN.FND.SPL.inflections#plain", true), PilotRefusal);
  assert.ok(!presentedIn(l).includes(`${other.id}@${other.version}`));
});

test("PB-5 a session the pilot does not allow, resumed from an older or imported record, is ended without showing anything", async () => {
  // a record made in a development build, left in the middle of practice
  const dev = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const d = await Learner.create(dev, repo, "Pilot", "guardian", clock, "p-resume");
  await d.start({ type: "explore" });
  assert.equal(d.state.open?.event.type, "explore");
  const shownBefore = presentedIn(d).length;
  // opened in a pilot build
  const c = loadContent({ mode: "pilot", approved: approve(10, 10) });
  const l = await Learner.open(c, repo, d.profileId, clock);
  assert.equal(l.allows("explore"), false);
  const cur = await l.current();
  assert.equal(cur.next, null);
  assert.equal(cur.lesson, null);
  assert.equal(l.state.open, null, "the session was ended");
  assert.equal(presentedIn(l).length, shownBefore, "nothing more was shown");
});

test("PB-6 development and preview builds are unchanged: no gate, every activity open", () => {
  for (const mode of ["development", "preview"] as const) {
    const c = loadContent({ mode, approved: [] });
    assert.equal(c.gate, null);
    for (const t of ALL) assert.equal(activityAllowed(c, t), true, `${mode} ${t}`);
    assert.ok(c.lessons.size > 0 && c.handWritten.size > 200 && c.dictation.items.length > 0);
  }
});

test("PB-7 the allowlist holds placement candidates and dictation words only, never generated or journey questions", () => {
  const dev = loadContent({ mode: "development" });
  const journey = new Set(dev.journey.items.map((i) => i.id));
  assert.deepEqual(PILOT_ALLOWLIST.sessions_allowed, ["placement", "spelling_assess"]);
  for (const a of PILOT_ALLOWLIST.items) {
    const it = dev.ctx.content.items.get(a.id) as Code;
    assert.ok(it, `${a.id} exists`);
    assert.equal(it.version, a.version, a.id);
    assert.ok(!it.generated && !journey.has(a.id), a.id);
    assert.equal(a.use === "dictation", it.format === "typed:dictation", a.id);
  }
});
