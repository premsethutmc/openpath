// Workstream H1: recoverable hand-over and return-date journeys (real journey controller, session, grader, records, evidence).
import test from "node:test";
import assert from "node:assert/strict";
import { DAY, INDEPENDENT_MIN } from "../../../packages/learning/src/evidence";
import { delayedCheckFact, formatInstant, isOpen, localDate, scheduleNote } from "../../../packages/learning/src/due-display";
import { handoverState, reentryContext, setHandoverPolicy } from "../../../packages/learning/src/intervention";
import { withDecisions, type LearningRecord } from "../../../packages/learning/src/records";
import { counts, journey, LE, record, START, stuck, visit } from "./handover-journeys";
import { SliceFlow } from "./flow";
import { learners, right } from "./learners";
import { T0 } from "./scenarios";
import { SliceSession } from "./session";
import { checkProvenance } from "./provenance";

const ends = (j: ReturnType<typeof journey>) => j.visits.map((v) => v.ended);
const routes = (j: ReturnType<typeof journey>) => j.visits.map((v) => v.handover?.route ?? null);

test("H01 initial hand-over: a pause with its way back (exact time shown), nothing credited", () => {
  const j = journey("H01", stuck(), []);
  const v = j.visits[0];
  assert.equal(v.ended, "pause");
  assert.equal(v.handover?.route, "wait");
  assert.equal(Date.parse(v.handover!.eligibleAt!) - Date.parse(v.handover!.since!), 2 * DAY);
  assert.match(v.note ?? "", /^You can try this again on your own from \w{3} \d+ \w{3} 2026, \d\d:\d\d \(UTC, UTC\)\.$/);
  assert.ok(!["independent", "transfer", "verified"].includes(v.evidence.status));
  assert.deepEqual(checkProvenance(j.flow), []);
});

test("H02 return before re-entry eligibility: nothing new, the exact opening time is stated", () => {
  const j = journey("H02", stuck(), [{ days: 1 }]);
  assert.deepEqual([j.visits[1].ended, j.visits[1].handover?.route, j.visits[1].answers.length], ["pause", "wait", 0]);
  assert.match(j.visits[1].note ?? "", /You can try this again on your own from/);
});

test("H03 return after eligibility: one fresh question alone, graded by the trusted grader, marked as re-entry", () => {
  const j = journey("H03", stuck(), [{ days: 2 }]);
  const a = j.visits[1].answers[0];
  assert.deepEqual([a.phase, a.activity, a.context], ["reentry", "diagnostic", reentryContext(LE)]);
  assert.ok(a.verdict === "incorrect" || a.verdict === "correct");
  const recs = j.flow.session.state().records;
  const prior = [...recs.attempts.filter((x) => x.at < j.visits[0].at || x.context !== reentryContext(LE)), ...recs.unresolved].filter((x) => x.questionId === a.q && !(x as { context?: string }).context);
  assert.equal(prior.length, 0, "a fresh question: never answered before, readable or not");
  assert.deepEqual(checkProvenance(j.flow), []);
});

test("H04 educator acknowledgement (server data) opens re-entry before the interval", () => {
  const j = journey("H04", stuck(), [{ days: 1, ack: true }]);
  assert.equal(j.visits[1].answers[0]?.phase, "reentry");
  const h = handoverState(LE, j.flow.session.state().records, j.flow.session.now);
  assert.equal(h.reentries[0].openedBy, "educator");
  assert.equal(h.selfReentriesLeft, 2, "an acknowledged re-entry does not use a self-service one");
});

test("H05 missing acknowledgement: after the self-service re-entries, nothing opens without a teacher", () => {
  const j = journey("H05", stuck(), [{ days: 2 }, { days: 2 }, { days: 2 }, { days: 5 }]);
  assert.deepEqual(routes(j).slice(-2), ["needs-teacher", "needs-teacher"]);
  assert.deepEqual(j.visits.slice(-2).map((v) => v.answers.length), [0, 0]);
  assert.match(j.visits.at(-1)!.note ?? "", /once a teacher has gone through it with you/);
});

test("H06 successful independent recheck: the module moves on; mastery only from the ordinary evidence rule", () => {
  const j = journey("H06", stuck(2), [{ days: 2 }]);
  const v = j.visits[1];
  assert.equal(v.answers[0].phase, "reentry"); assert.equal(v.answers[0].verdict, "correct");
  assert.ok(v.answers.length > 1, "learning continues after a right re-entry answer");
  // right after the re-entry answer alone, before anything else: no claim from one answer
  const s0 = j.flow.session, reAt = s0.state().records.attempts.find((a) => a.context === reentryContext(LE))!.at;
  const only = SliceSession.fromEvents(s0.learnerId, LE, withDecisions(s0.events, s0.decisions).filter((e) => (e as { at: string }).at <= reAt) as LearningRecord[], Date.parse(reAt) + 1, "x");
  assert.ok(!["independent", "transfer", "verified"].includes(only.state().evidence(LE).status), "re-entry alone claims nothing");
  const recs = s0.state().records.attempts.filter((a) => a.competency === LE && a.n === 1 && a.hints === 0 && a.activity !== "guided" && a.credit === true && a.at > j.visits[0].at);
  assert.ok(!["independent", "transfer", "verified"].includes(v.evidence.status) || new Set(recs.map((a) => a.questionId)).size >= INDEPENDENT_MIN, "a claim needs the usual distinct right answers alone");
  assert.equal(v.evidence.verified, false, "nothing verified without a delayed check");
});

test("H07 failed independent recheck: a new pause, earlier failures kept, one self-service re-entry used", () => {
  const j = journey("H07", stuck(), [{ days: 2 }]);
  const before = j.visits[0].answers.length, after = j.flow.session.state().records.attempts.filter((a) => a.competency === LE).length;
  assert.equal(j.visits[1].answers[0].verdict, "incorrect");
  assert.ok(after >= before + 1, "nothing erased; the re-entry answer is added");
  assert.equal(j.visits[1].ended, "pause");
  const h = handoverState(LE, j.flow.session.state().records, j.flow.session.now);
  assert.deepEqual([h.reentries.length, h.selfReentriesLeft, h.route], [1, 1, "wait"]);
});

test("H08 repeated difficulty: exactly SELF_REENTRY_LIMIT self-service re-entries, each bounded", () => {
  const j = journey("H08", stuck(), Array.from({ length: 6 }, () => ({ days: 2 })));
  const c = counts(j.visits);
  assert.equal(c.reentryQuestions, 2);
  assert.ok(j.visits.every((v) => v.answers.length <= 20), "each visit bounded");
  assert.deepEqual(routes(j).slice(-3), ["needs-teacher", "needs-teacher", "needs-teacher"]);
});

test("H09 progress in another competency while paused (the hand-over names what to carry on with)", () => {
  const j = journey("H09", stuck(), []);
  const s = j.flow.session;
  const h0 = handoverState(LE, s.state().records, s.now);
  assert.ok(h0.continueWith.includes("MATH.algebra.linear-intro"));
  const intro = (["gen:ahone:1,6,7", "gen:ahone:2,3,4"]);
  for (const q of intro) { try { s.submit(q, right(q), "practice"); } catch { /* not a question */ } }
  const ev = s.state().evidence("MATH.algebra.linear-intro");
  assert.ok(ev.independent.right >= 1, "the other competency progresses");
  assert.equal(handoverState(LE, s.state().records, s.now).route, "wait", "and the paused one is untouched");
});

test("H10 restart during the pause: rebuilt from stored events, the same hand-over state and the same next step", () => {
  const j = journey("H10", stuck(), [{ days: 2 }]);
  const s0 = j.flow.session;
  const stored = JSON.parse(JSON.stringify(withDecisions(s0.events, s0.decisions))) as LearningRecord[];
  const s1 = SliceSession.fromEvents(s0.learnerId, LE, stored, s0.now, s0.session);
  assert.deepEqual(handoverState(LE, s1.state().records, s1.now), handoverState(LE, s0.state().records, s0.now));
  assert.deepEqual([s1.next().phase, s1.next().handover?.route], [s0.next().phase, s0.next().handover?.route]);
  const f1 = new SliceFlow(START, s0.learnerId, s0.now, { resume: s1, timeZone: "UTC" });
  assert.equal(f1.ended?.phase ?? f1.currentPhase, j.flow.ended?.phase ?? j.flow.currentPhase);
});

/** a learner shown on their own in the first visit, so a delayed check is scheduled */
const shownLearner = () => { const f = new SliceFlow(START, "h1-ret", T0, { timeZone: "Asia/Kolkata" }); visit(f, learners.strong(), 0); return f; };
test("H11 return on the displayed retention date before the due time: told the exact opening time; at the time, the check", () => {
  const f = shownLearner();
  const e = f.session.state().evidence(LE);
  assert.equal(e.retention, "scheduled");
  const due = Date.parse(e.retentionDueAt!), tz = "Asia/Kolkata";
  const shownDate = localDate(e.retentionDueAt!, tz);
  assert.match(f.spec.teacherGuide?.detail ?? "", new RegExp(`^Your delayed check opens .+ \\(GMT\\+5:30, Asia/Kolkata\\)\\.$`));
  // the learner comes back on the shown date at 09:00 local (03:30 UTC), before the due time of day
  const nine = Date.parse(`${shownDate}T09:00:00+05:30`);
  assert.ok(nine < due);
  f.later((nine - f.session.now) / DAY); visit(f, learners.strong(), 7);
  assert.ok(!f.frames.some((x) => x.phase === "retention"), "not open yet");
  assert.match(f.spec.teacherGuide?.detail ?? "", /^Your delayed check opens/);
  f.later((due - f.session.now) / DAY); const v = visit(f, learners.strong(), 7);
  assert.ok(v.answers.some((a) => a.phase === "retention"), "open from the exact instant");
});

test("H12 just before and exactly at the due instant", () => {
  const f = shownLearner();
  const due = Date.parse(f.session.state().evidence(LE).retentionDueAt!);
  f.later((due - 60_000 - f.session.now) / DAY);
  assert.equal(f.session.state().evidence(LE).retention, "scheduled");
  assert.equal(isOpen(new Date(due).toISOString(), f.session.now), false);
  f.later(60_000 / DAY);
  assert.equal(f.session.state().evidence(LE).retention, "due");
  assert.equal(isOpen(new Date(due).toISOString(), f.session.now), true);
});

test("H13 midnight and time-zone boundaries: one instant, shown per zone; open at the same instant everywhere", () => {
  const due = "2026-03-09T18:30:00.000Z";   // Kolkata midnight; the day after US daylight saving began
  assert.equal(localDate(due, "Asia/Kolkata"), "2026-03-10");
  assert.equal(localDate(due, "UTC"), "2026-03-09");
  assert.equal(localDate(due, "America/Los_Angeles"), "2026-03-09");
  assert.equal(localDate(due, "Pacific/Kiritimati"), "2026-03-10");
  assert.equal(formatInstant(due, "Asia/Kolkata"), "Tue 10 Mar 2026, 00:00 (GMT+5:30, Asia/Kolkata)");
  assert.equal(formatInstant(due, "UTC"), "Mon 9 Mar 2026, 18:30 (UTC, UTC)");   // zone names in English (en-US), the rest en-GB
  assert.equal(formatInstant(due, "America/Los_Angeles"), "Mon 9 Mar 2026, 11:30 (PDT, America/Los_Angeles)");
  assert.equal(formatInstant("2026-03-07T19:30:00.000Z", "America/Los_Angeles"), "Sat 7 Mar 2026, 11:30 (PST, America/Los_Angeles)");
  const t = Date.parse(due);
  for (const tz of ["Asia/Kolkata", "UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) {
    assert.equal(isOpen(due, t - 1), false, tz); assert.equal(isOpen(due, t), true, tz);
    assert.equal(delayedCheckFact({ retention: "scheduled", retentionDueAt: due }, tz).label, "Opens");
  }
  // the local midnight start of the shown day is NOT open (no day-start rule): Kolkata midnight is the instant itself, LA midnight is earlier
  assert.equal(isOpen(due, Date.parse("2026-03-09T00:00:00-07:00")), false);
  assert.equal(scheduleNote({ retentionOpensAt: due }, "Asia/Kolkata"), "Your delayed check opens Tue 10 Mar 2026, 00:00 (GMT+5:30, Asia/Kolkata).");
});

test("H14 forged acknowledgement: a learner record, a non-educator, a mismatched, a future or a before-the-pause one opens nothing", () => {
  const j = journey("H14", stuck(), []);
  const s = j.flow.session;
  s.acknowledgements.push({ id: "before", at: new Date(T0 + 60_000).toISOString(), competency: LE, by: "educator" });   // before the pause began
  s.events.push({ ...(s.events.at(-1) as object), id: "forged-ack", record: "handover_ack", competency: LE, by: "educator", at: new Date(s.now).toISOString() } as unknown as LearningRecord);
  s.acknowledgements.push({ id: "p", at: new Date(s.now).toISOString(), competency: LE, by: "parent" as never });
  s.acknowledgements.push({ id: "other", at: new Date(s.now).toISOString(), competency: "MATH.algebra.linear-intro", by: "educator" });
  s.acknowledgements.push({ id: "future", at: new Date(s.now + 10 * DAY).toISOString(), competency: LE, by: "educator" });
  assert.equal(handoverState(LE, s.state().records, s.now).route, "wait");
  assert.equal(s.next().phase, "pause");
});

test("H15 historical paused events (recorded before handover@1): re-entry opens, nothing is rewritten", () => {
  const j = journey("H15", stuck(), []);
  const s0 = j.flow.session;
  const stored = JSON.parse(JSON.stringify(withDecisions(s0.events, s0.decisions))) as LearningRecord[];
  const snapshot = JSON.stringify(stored);
  const s1 = SliceSession.fromEvents(s0.learnerId, LE, stored, s0.now + 60 * DAY, "s9");
  const ms = s1.next();
  assert.deepEqual([ms.phase, ms.handover?.route], ["reentry", "reentry-self"]);
  assert.equal(JSON.stringify(stored), snapshot, "the stored events are not changed");
  assert.equal(s1.state().records.attempts.length, s0.state().records.attempts.length);
});

test("H16 bounded retry exhaustion: no question after the limit however often the learner returns; an acknowledgement opens exactly one", () => {
  const j = journey("H16", stuck(), [...Array.from({ length: 3 }, () => ({ days: 2 })), ...Array.from({ length: 10 }, () => ({ days: 1 })), { days: 1, ack: true }, { days: 3 }]);
  assert.equal(counts(j.visits).reentryQuestions, 3, "two self-service + one acknowledged");
  assert.ok(j.visits.slice(4, 14).every((v) => v.answers.length === 0), "exhausted: nothing offered for ten visits");
  assert.equal(j.visits.at(-2)!.answers[0]?.phase, "reentry");
  assert.equal(j.visits.at(-1)!.handover?.route, "needs-teacher");
});

test("the policy is configurable, recorded in the state, and validated", () => {
  const prev = setHandoverPolicy({ reentryDays: 3, selfLimit: 1 });
  try {
    const j = journey("HC", stuck(), [{ days: 2 }, { days: 1 }]);
    assert.deepEqual(routes(j), ["wait", "wait", "needs-teacher"]);   // 2 days < 3: still waiting; at 3 days: the one self-service re-entry
    assert.equal(j.visits[2].answers[0]?.phase, "reentry");
    assert.deepEqual(handoverState(LE, j.flow.session.state().records, j.flow.session.now).config, { reentryDays: 3, selfLimit: 1 });
  } finally { setHandoverPolicy(prev); }
  assert.throws(() => setHandoverPolicy({ reentryDays: 0, selfLimit: 1 }));
});

// ---------------------------------------------------------------- independent review fixes
test("R1 an unreadable answer to a re-entry question uses that re-entry (no unbounded loop)", () => {
  const j = journey("R1", stuck(), []);
  const f = j.flow;
  for (let i = 0; i < 4; i++) { f.later(2); if (f.stage === "question") { f.on({ type: "answer_submitted", value: "1..2", timestamp: 0 } as never); f.on({ type: "skip_requested", timestamp: 0 } as never); for (let k = 0; k < 30 && (f.stage as string) !== "summary"; k++) f.on(f.stage === "question" ? ({ type: "answer_submitted", value: "1..2", timestamp: 0 } as never) : ({ type: "skip_requested", timestamp: 0 } as never)); } }
  const h = handoverState(LE, f.session.state().records, f.session.now);
  assert.equal(h.reentries.length, 2);
  assert.deepEqual([h.selfReentriesLeft, h.route], [0, "needs-teacher"]);
  assert.ok(f.session.state().records.unresolved.filter((u) => u.context === reentryContext(LE)).length >= 1);
});
test("R2 an acknowledgement from before the pause neither opens it nor relabels a self-service re-entry", () => {
  const j = journey("R2", stuck(), []);
  const s = j.flow.session;
  s.acknowledgements.push({ id: "early", at: new Date(T0 + 60_000).toISOString(), competency: LE, by: "educator" });
  assert.equal(handoverState(LE, s.state().records, s.now).route, "wait");
  j.flow.later(2); visit(j.flow, stuck(), 2);
  const h = handoverState(LE, s.state().records, s.now);
  assert.deepEqual(h.reentries.map((r) => r.openedBy), ["self"]);
  assert.equal(h.selfReentriesLeft, 1);
});
test("R3 the re-entry question after an unreadable-answer pause is not the unreadable question", () => {
  const f = new SliceFlow(START, "h1-R3", T0, { timeZone: "UTC" });
  for (let k = 0; k < 40 && f.stage !== "summary"; k++) f.on(f.stage === "question" ? ({ type: "answer_submitted", value: "1..2", timestamp: 0 } as never) : ({ type: "skip_requested", timestamp: 0 } as never));
  assert.equal(f.ended?.phase, "pause");
  const unread = new Set(f.session.state().records.unresolved.map((u) => u.questionId));
  f.later(2);
  assert.equal(f.currentPhase, "reentry");
  assert.ok(!unread.has(f.currentQuestion!), `fresh: ${f.currentQuestion}`);
});
test("R4 a later answer elsewhere in the competency does not cancel a valid acknowledgement", () => {
  const j = journey("R4", stuck(), []);
  const s = j.flow.session;
  s.now += 60_000;
  s.acknowledgements.push({ id: "ack", at: new Date(s.now).toISOString(), competency: LE, by: "educator" });
  assert.equal(handoverState(LE, s.state().records, s.now).route, "reentry-acknowledged");
  s.submit("gen:lin:7,9,11:mc", "A", "practice");
  assert.equal(handoverState(LE, s.state().records, s.now).route, "reentry-acknowledged");
});

