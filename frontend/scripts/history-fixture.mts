/**
 * Writes a learner record made by the app as it is checked out, with the engine's results on it, as a fixture.
 * PR #25 ran this on the PR #24 commit (5fb4a4c) to freeze a record made before passage@1 and the practice pools:
 *
 *   (in a checkout of 5fb4a4c) node --import tsx scripts/history-fixture.mts <out.json>
 *
 * The test history-preservation.test.ts replays that record with the current code and requires the same engine
 * results: a record made before a policy keeps every result it had.
 */
import { writeFileSync } from "node:fs";
import { type Item, leafView } from "../../packages/english-core/src/index.ts";
import { loadContent } from "../src/english/logic/content.ts";
import { testClock } from "../src/english/logic/journey-sim.ts";
import { Learner } from "../src/english/logic/learner.ts";
import { learnerProfile } from "../src/english/logic/profile.ts";
import { respond, runSession, start } from "../src/english/logic/profile-sim.ts";
import { MemoryRepo } from "../src/english/logic/store.ts";

const SVA = "EN.GRM.VERB.sva";
const ART = "EN.GRM.NOUN.articles";
const DET = "EN.RDG.LIT.locate_detail";
const MAIN = "EN.RDG.SUM.main_idea";
const c = loadContent();
const clock = testClock();
const l = await Learner.create(c, new MemoryRepo(), "History", "guardian", clock, "history");
const all = () => true;
await start(l, (i) => i.target !== SVA);
// grammar: found hard, then a lesson and practice (practice could then draw on first-check questions)
await runSession(l, { type: "check", capability: SVA, purpose: "assess" }, () => false);
await runSession(l, { type: "guided", capability: SVA }, all);
await runSession(l, { type: "guided", capability: ART }, (_i, k) => k % 3 !== 0);
// reading: two answers on one passage in one session, as a record made before one-per-passage selection holds
await l.start({ type: "check", capability: DET, purpose: "assess" });
for (const [id, ok] of [["rdg.p1.q1", true], ["rdg.p1.q2", true], ["rdg.p2.q1", false], ["rdg.p1.q5", true], ["rdg.p1.q6", false]] as const) {
  const item = c.ctx.content.items.get(id) as Item;
  await l.answer(item, respond(item, ok), { use: "assessment" });
}
await l.stop();
clock.days(2);
// later sessions: the same passages can come round again
await runSession(l, { type: "check", capability: DET, purpose: "assess" }, all);
await runSession(l, { type: "check", capability: MAIN, purpose: "assess" }, (_i, k) => k % 2 === 0);
await runSession(l, { type: "explore" }, (_i, k) => k % 2 === 0);
clock.days(9);
await runSession(l, { type: "check", capability: DET, purpose: "retention" }, all);

const now = new Date(Date.parse("2026-11-01T09:00:00.000Z")).toISOString();
const s = l.state;
const caps = [...c.index.leafIds].filter((id) => s.ledger.composite.nodes[id]?.directN);
const profile = learnerProfile(s, c, now);
const out = {
  note: "A learner record made by the app at PR #24 (commit 5fb4a4c), with the engine's results then. Do not edit: history-preservation.test.ts replays it.",
  made_by: "frontend/scripts/history-fixture.mts",
  now,
  events: l.events,
  composite: s.ledger.composite,
  decisions: s.ledger.decisions,
  views: Object.fromEntries(caps.map((id) => [id, leafView(s.ledger.composite, c.index, id, now)])),
  profile: Object.fromEntries(profile.capabilities.filter((x) => caps.includes(x.id)).map((x) => [x.id, { standing: x.standing, evidence: x.evidence, shownLevel: x.shownLevel, passages: x.passages }])),
};
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${l.events.length} events on ${caps.length} capabilities to ${process.argv[2]}`);
