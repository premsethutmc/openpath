/**
 * Pilot evidence integrity (PR #25): teaching never draws on assessment questions; answers on one reading passage are
 * counted once (passage@1); records made before these changes keep every result they had. Synthetic learners show
 * software behaviour, not educational effectiveness.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { type Item, evidenceLine, leafView } from "../../../../packages/english-core/src/index.ts";
import { type Code, GUIDED, loadContent } from "./content.ts";
import type { AppEvent } from "./events.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { learnerProfile } from "./profile.ts";
import { respond, runSession, start } from "./profile-sim.ts";
import { GUIDED_LENGTH, READING_PRACTICE_LENGTH, onlyFor, spellingPracticeQueue, spellingTransferQueue } from "./select.ts";
import { fold } from "./state.ts";
import { MemoryRepo } from "./store.ts";

const c = loadContent();
/** A learner record made by the app at PR #24, with the engine's results then (frontend/scripts/history-fixture.mts). */
interface History {
  now: string;
  events: (AppEvent & { session?: string; type?: string; item?: { id: string } })[];
  composite: unknown;
  decisions: { observation?: { samePassage?: unknown } }[];
  views: Record<string, unknown>;
  profile: Record<string, unknown>;
}
const history = JSON.parse(readFileSync(new URL("./fixtures/history-pr24.json", import.meta.url), "utf8")) as History;
const CAPS = c.pilot.capabilities;
const [INF, SVA, ART, DET, MAIN] = ["EN.FND.SPL.inflections", "EN.GRM.VERB.sva", "EN.GRM.NOUN.articles", "EN.RDG.LIT.locate_detail", "EN.RDG.SUM.main_idea"];
const pool = (id: string) => c.pilot.pools.get(id)?.pool;
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const all = () => true;
const fresh = async (id: string) => {
  const clock = testClock();
  return { clock, l: await Learner.create(c, new MemoryRepo(), id, "guardian", clock, id) };
};
/** Unseen diagnosis questions left on a capability: what first checks can still use. */
const diagnosisLeft = (l: Learner, cap: string) => [...onlyFor(l.state, c, "assess")].filter((id) => (c.ctx.content.items.get(id) as Code).target === cap && !l.state.ledger.exposures.has(id)).length;
/** Every question asked in sessions of a type. */
const askedIn = (l: Learner, types: string[]) => {
  const sessions = new Set(l.events.filter((e) => e.kind === "session" && types.includes(e.type)).map((e) => (e as { session: string }).session));
  return l.events.filter((e): e is Extract<AppEvent, { kind: "evidence" }> => e.kind === "evidence" && sessions.has(e.session)).map((e) => e.item.id);
};

// ---------------------------------------------------------------- historical records

test("PI-1 a record made at PR #24 replays with exactly the results it had: estimates, decisions, levels and profile", () => {
  const s = fold(c, history.events as AppEvent[]);
  assert.deepEqual(plain(s.ledger.composite), history.composite, "the engine's composite is unchanged");
  assert.deepEqual(plain(s.ledger.decisions), history.decisions, "every decision is unchanged");
  for (const [id, v] of Object.entries(history.views)) assert.deepEqual(plain(leafView(s.ledger.composite, c.index, id, history.now)), v, id);
  const p = learnerProfile(s, c, history.now);
  for (const [id, want] of Object.entries(history.profile)) {
    const x = p.capabilities.find((y) => y.id === id)!;
    assert.deepEqual(plain({ standing: x.standing, evidence: x.evidence, shownLevel: x.shownLevel, passages: x.passages }), want, id);
  }
  // it holds the patterns this PR stops: first-check questions used in teaching, and two answers on one passage
  const items = (type: string) => history.events.filter((e) => e.kind === "evidence" && history.events.some((x) => x.kind === "session" && x.type === type && (x as { session: string }).session === (e as { session: string }).session)).map((e) => (e as { item: { id: string } }).item.id);
  assert.ok(items("guided").some((id) => pool(id) === "diagnosis"), "the fixture includes teaching that used first-check questions");
  assert.ok(history.decisions.every((d) => !(d as { observation?: { samePassage?: unknown } }).observation?.samePassage), "no answer in it was held for its passage");
});

test("PI-2 continuing that record: history keeps its results, and only new answers follow passage@1", async () => {
  // restore the historical record onto this device, as importing a backup does, and carry on
  const repo = new MemoryRepo();
  await repo.replaceAll("history", plain(history.events) as AppEvent[]);
  const l = await Learner.open(c, repo, "history", testClock("2026-11-02T09:00:00.000Z"));
  const before = plain(l.state.ledger.decisions);
  await l.start({ type: "check", capability: DET, purpose: "assess" });
  // a passage the record has not met for this skill, with two questions on it
  const onPassage = new Map<string, string[]>();
  for (const i of c.ctx.content.byCapability.get(DET) ?? []) if (i.kind === "code" && i.passage && c.handWritten.has(i.id)) onPassage.set(i.passage, [...(onPassage.get(i.passage) ?? []), i.id]);
  const unseen = [...onPassage.values()].find((ids) => ids.length >= 2 && ids.every((id) => !l.state.ledger.exposures.has(id)))!.slice(0, 2);
  assert.ok(unseen, "the test needs a passage the record has not met");
  for (const id of unseen) {
    const item = c.ctx.content.items.get(id) as Item;
    await l.answer(item, respond(item, true), { use: "assessment" });
  }
  await l.stop();
  assert.deepEqual(plain(l.state.ledger.decisions.slice(0, before.length)), before, "history is untouched");
  const newOnes = l.state.ledger.decisions.slice(before.length).filter((d) => d.capability === DET);
  assert.deepEqual(newOnes.map((d) => d.verdict), ["accepted", "held"], "a new passage counts once; a second answer on it does not");
});

// ---------------------------------------------------------------- teaching never consumes assessment questions

test("PI-3 teaching on every pilot capability uses practice questions only: no first-check, confirmation or later-check question, and the first-check supply is untouched", async () => {
  const { l } = await fresh("pi3");
  await start(l, all);
  const left = Object.fromEntries(CAPS.map((cap) => [cap, diagnosisLeft(l, cap)]));
  for (const cap of [SVA, ART, DET, MAIN]) for (let k = 0; k < 3; k++) await runSession(l, { type: "guided", capability: cap }, (_i, n) => n % 2 === 0);
  for (const st of ["plain", "es_plural", "double_short", "drop_e", "y_to_i"]) await runSession(l, { type: "spelling_practice", capability: INF, step: st }, all);
  await runSession(l, { type: "explore" }, all);
  const taught = askedIn(l, ["guided", "spelling_practice", "explore"]).filter((id) => c.pilot.pools.has(id));
  assert.ok(taught.length >= 20, `teaching asked ${taught.length} pilot questions`);
  for (const id of taught) assert.equal(pool(id), "practice", `${id} asked in teaching`);
  for (const cap of CAPS) assert.equal(diagnosisLeft(l, cap), left[cap], `${cap}: first-check questions are not used up by teaching`);
});

test("PI-4 when practice questions run out, teaching asks nothing more rather than borrowing assessment questions", async () => {
  const { l } = await fresh("pi4");
  await start(l, all);
  const left = diagnosisLeft(l, SVA);
  const asked: string[] = [];
  for (let k = 0; k < 4; k++) asked.push(...(await runSession(l, { type: "guided", capability: SVA }, all)).asked);
  const practice = [...c.pilot.pools].filter(([id, p]) => p.pool === "practice" && (c.ctx.content.items.get(id) as Code).target === SVA).length;
  assert.equal(asked.filter((id) => c.pilot.pools.has(id)).length, practice, "every practice question once, then nothing");
  assert.ok(asked.every((id) => pool(id) === "practice"));
  assert.equal(diagnosisLeft(l, SVA), left);
});

test("PI-5 the spelling module: practice inserts only practice questions; the transfer check only first-check questions", () => {
  const s = fold(c, []);
  for (const step of ["plain", "es_plural", "double_short", "drop_e", "y_to_i"]) {
    const prac = spellingPracticeQueue(s, c, INF, step, false).map((p) => p.item).filter((id) => c.pilot.pools.has(id));
    for (const id of prac) assert.equal(pool(id), "practice", `${step}: ${id}`);
    const transfer = spellingTransferQueue(s, c, INF, step, false).map((p) => p.item).filter((id) => c.pilot.pools.has(id));
    for (const id of transfer) assert.equal(pool(id), "diagnosis", `${step}: ${id}`);
  }
});

test("PI-6 practice supply: one full teaching session per grammar capability, every taught spelling step, and all three reading lessons", () => {
  const n = (cap: string) => [...c.pilot.pools].filter(([id, p]) => p.pool === "practice" && (c.ctx.content.items.get(id) as Code).target === cap);
  assert.ok(n(SVA).length >= GUIDED_LENGTH && n(ART).length >= GUIDED_LENGTH);
  for (const cap of [DET, MAIN]) {
    const lessons = [...c.lessons.values()].filter((x) => x.capability === cap).length;
    assert.ok(n(cap).length >= lessons * READING_PRACTICE_LENGTH, `${cap}: ${n(cap).length} practice questions for ${lessons} lessons`);
    assert.equal(new Set(n(cap).map(([id]) => (c.ctx.content.items.get(id) as Code).passage)).size, n(cap).length, "each on its own passage");
  }
  const steps = new Set(n(INF).map(([id]) => (c.ctx.content.items.get(id) as Code).step));
  for (const st of ["plain", "es_plural", "double_short", "drop_e", "y_to_i"]) assert.ok(steps.has(st), st);
  assert.ok((GUIDED.spelling as readonly string[]).includes(INF));
});

// ---------------------------------------------------------------- reading: passage dependence in the app

test("PI-7 reading in the app: selection never returns to a passage already answered for that skill, across sessions", async () => {
  const { l, clock } = await fresh("pi7");
  await start(l, all);
  for (let k = 0; k < 3; k++) {
    await runSession(l, { type: "check", capability: DET, purpose: "assess" }, all);
    clock.days(1);
  }
  await runSession(l, { type: "check", capability: DET, purpose: "confirm" }, all);
  const seen = l.events.filter((e) => e.kind === "evidence").map((e) => c.ctx.content.items.get((e as { item: { id: string } }).item.id) as Code).filter((i) => i.passage && i.target === DET);
  assert.ok(seen.length >= 4);
  assert.equal(new Set(seen.map((i) => i.passage)).size, seen.length, "one answer per passage for the skill");
  assert.ok(l.state.ledger.decisions.every((d) => !d.observation?.samePassage));
});

test("PI-8 a second answer on a counted passage is recorded and shown, but not counted: the profile says so", async () => {
  const { l } = await fresh("pi8");
  await l.start({ type: "check", capability: MAIN, purpose: "assess" });
  for (const [id, ok] of [["rdg.p1.q5", true], ["rdg.p1.q6", false], ["rdg.p2.q5", true]] as const) {
    const item = c.ctx.content.items.get(id) as Item;
    await l.answer(item, respond(item, ok), { use: "assessment" });
  }
  await l.stop();
  const held = l.state.ledger.decisions.filter((d) => d.observation?.samePassage);
  assert.equal(held.length, 1);
  assert.equal(held[0].observation!.item, "rdg.p1.q6");
  const x = learnerProfile(l.state, c, "2026-10-15T09:00:00.000Z").capabilities.find((y) => y.id === MAIN)!;
  assert.equal(x.evidence.independent, 2, "two passages, two counted answers");
  assert.equal(x.evidence.samePassage, 1);
  assert.equal(x.evidence.samePassageRight, 0);
  assert.equal(x.evidence.assisted, 0, "not mistaken for help");
  assert.match(evidenceLine(x), /0 of 1 right on a passage already counted \(not counted again\)/);
  assert.equal(l.state.ledger.composite.nodes[MAIN].directN, 2);
});
