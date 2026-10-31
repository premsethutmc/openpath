/**
 * Integration M1 closure: does the journey's evidence survive a new request/session?
 *   export  <events.json> <inmem.json>   run the slice (real components, real clock) and write its record events + the in-memory evidence summary
 *   verify  <stored.json> <inmem.json>   rebuild the learner's evidence in a NEW process from events read back from the Django store
 * The Django step (backend/family/test_integration_m1.py PersistenceRoundTrip) sits between them: POST each event, then GET with a fresh login.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { learnerState } from "../../packages/learning/src/session.ts";
import { hypotheses } from "../../packages/learning/src/hypotheses.ts";
import { runScripted, SLICE_QUESTION } from "../src/journey/scripted.ts";
import { question } from "../../packages/learning/src/content.ts";

const [mode, a, b] = process.argv.slice(2);
const comp = question(SLICE_QUESTION).competency;
const summary = (events: any[], learnerId: string, now: number) => {
  const st = learnerState(learnerId, events, now, {});
  const ev: any = st.evidence(comp);
  return { attempts: st.records.attempts.map((x: any) => ({ id: x.id, q: x.questionId, response: x.response, activity: x.activity, at: x.at })), teaches: events.filter((e) => e.record === "teach").map((e) => e.strategy),
    status: ev.status, independent: ev.independent, retention: ev.retention, retentionDueAt: ev.retentionDueAt, independentAt: ev.independentAt, retentionHistory: ev.retentionHistory, hypotheses: hypotheses(st.records).length };
};
if (mode === "export") {
  const f = runScripted();
  const events = f.session.events as any[];
  writeFileSync(a, JSON.stringify(events));
  const verdicts = f.session.replies.map((r) => r.verdict);
  writeFileSync(a.replace(/\.json$/, ".trace.json"), JSON.stringify({ trace: f.session.trace, frames: f.frames.map((x) => ({ stage: x.stage, revealed: x.revealed ?? null, qid: x.qid })) }));
  writeFileSync(b, JSON.stringify({ learnerId: f.session.learnerId, verdicts, ...summary(f.session.events as any[], f.session.learnerId, f.session.now), clockAtEnd: new Date(f.session.now).toISOString() }));
} else if (mode === "verify") {
  const stored = JSON.parse(readFileSync(a, "utf8")) as { events: any[]; decisions?: Record<string, unknown>; learnerId: string };
  const mem = JSON.parse(readFileSync(b, "utf8"));
  const now = Date.now();
  const got = summary(stored.events, stored.learnerId, now);
  const decided = stored.events.filter((e) => e.record === "attempt").map((e) => ({ id: e.id, verdict: e.decision?.verdict, by: e.decision?.decidedBy, schema: e.decision?.schema }));
  const out = { clockNow: new Date(now).toISOString(), inMemory: { retention: mem.retention, due: mem.retentionDueAt, independentAt: mem.independentAt }, fromStore: { retention: got.retention, due: got.retentionDueAt, independentAt: got.independentAt, history: got.retentionHistory, status: got.status, independent: got.independent },
    daysFromNowToDue: got.retentionDueAt ? +(((Date.parse(got.retentionDueAt) - now) / 86400000).toFixed(3)) : null,
    dueMinusIndependentDays: got.retentionDueAt && got.independentAt ? +(((Date.parse(got.retentionDueAt) - Date.parse(got.independentAt)) / 86400000).toFixed(3)) : null,
    sameAttempts: JSON.stringify(got.attempts.map((x: any) => [x.q, x.response, x.activity])) === JSON.stringify(mem.attempts.map((x: any) => [x.q, x.response, x.activity])),
    sameTeaches: JSON.stringify(got.teaches) === JSON.stringify(mem.teaches), serverVerdictsMatchSlice: JSON.stringify(decided.map((d) => d.verdict === "correct" ? "correct" : d.verdict === "incorrect" ? "incorrect" : d.verdict)) === JSON.stringify(mem.verdicts),
    allDecidedByServer: decided.every((d) => d.by === "server" && d.schema === "grading-decision@1"), attemptsStored: decided.length, ids: decided.map((d) => d.id) };
  writeFileSync(a.replace(/\.json$/, ".report.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
}
