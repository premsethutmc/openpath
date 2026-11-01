/**
 * Workstream H1: restart and persistence of a hand-over. export: a paused learner (first visit, failed self-service re-entry), its events
 * (no decisions: the server makes them) and the in-memory hand-over state before and after an acknowledgement. Django stores every record at
 * its own time and an educator acknowledges (family.test_handover.HandoverPersistence). verify: in a NEW process, from the records and
 * acknowledgements read back, the hand-over state and the next step must equal the in-memory ones.
 *   node --import tsx scripts/h1-persistence.mts export <dir>     node --import tsx scripts/h1-persistence.mts verify <dir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DAY } from "../../packages/learning/src/evidence.ts";
import { handoverState } from "../../packages/learning/src/intervention.ts";
import { journey, LE, stuck } from "../src/journey/handover-journeys.ts";
import { SliceSession } from "../src/journey/session.ts";

const [mode, dir] = process.argv.slice(2);
const summary = (h: ReturnType<typeof handoverState>) => ({ route: h.route, since: h.since, eligibleAt: h.eligibleAt, reentries: h.reentries.map((r) => r.openedBy), selfLeft: h.selfReentriesLeft, ack: !!h.acknowledgement });
if (mode === "export") {
  const j = journey("persist", stuck(), [{ days: 2 }]);
  const s = j.flow.session;
  const ackAt = s.now + DAY / 2, at = s.now + DAY;
  const before = summary(handoverState(LE, s.state().records, at));
  s.acknowledgements.push({ id: "mem", at: new Date(ackAt).toISOString(), competency: LE, by: "educator" });
  const after = summary(handoverState(LE, s.state().records, at));
  writeFileSync(`${dir}/events.json`, JSON.stringify({ events: s.events, ackAt: new Date(ackAt).toISOString() }));
  writeFileSync(`${dir}/inmem.json`, JSON.stringify({ at, before, after, attempts: s.state().records.attempts.length }));
  console.log("exported", s.events.length, JSON.stringify(after));
} else {
  const st = JSON.parse(readFileSync(`${dir}/stored.json`, "utf8")), mem = JSON.parse(readFileSync(`${dir}/inmem.json`, "utf8"));
  const s1 = SliceSession.fromEvents(st.learnerId, LE, st.events, mem.at, "s9");
  const without = summary(handoverState(LE, s1.state().records, mem.at));
  s1.acknowledgements = st.acknowledgements;
  const withAck = summary(handoverState(LE, s1.state().records, mem.at));
  const next = s1.next();
  const ok = JSON.stringify(without) === JSON.stringify(mem.before) && JSON.stringify({ ...withAck }) === JSON.stringify({ ...mem.after }) && next.phase === "reentry" && s1.state().records.attempts.length === mem.attempts;
  console.log(JSON.stringify({ storedEvents: st.events.length, acknowledgementsReadBack: st.acknowledgements.length, before: without, after: withAck, nextPhase: next.phase, equalToInMemory: ok }));
  if (!ok) { console.error("MISMATCH", JSON.stringify(mem)); process.exit(1); }
  console.log("PASS hand-over persistence and restart");
}
