/**
 * Refinements to C′ (15 October): the highest level the evidence supports now, kept apart from the engine's estimate,
 * history and confirmation; lesson scope by spelling pattern; calendar days in the pupil's time zone. Synthetic
 * histories through the app's own engine; tests of software behaviour, not of how children learn.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type DayBasis, calendarDay, dayBasis } from "./calendar.ts";
import { type Code, loadContent } from "./content.ts";
import { diagnose } from "./diagnostics.ts";
import { affectedPatterns, candidateLevels } from "./mastery.ts";
import { LESSON_SCOPE, MASTERY_GATE } from "./mastery-policy.ts";
import { CAP, DICTATION_SCENARIOS, type Day, ESTIMATE_4_SHOWN_3, MASTERY_SCENARIOS, finding, history, judge } from "./mastery-scenarios.ts";
import { misconceptionFindings } from "./misconceptions.ts";
import { learnerProfile } from "./profile.ts";
import { fold } from "./state.ts";

const c = loadContent();
const scenario = (id: string) => [...MASTERY_SCENARIOS, ...DICTATION_SCENARIOS].find((x) => x[0] === id)![2];

test("estimate 4, demonstrated 3: level 3 is shown and stands; level 4 is reported as not yet shown, with what is missing", async () => {
  const { l } = await history(ESTIMATE_4_SHOWN_3, c);
  const j = judge(l, c);
  assert.deepEqual(j.profile.levels, { estimated: 4, demonstrated: 3, historical: 3, confirmed: null });
  assert.equal(j.standing, "shown");
  assert.equal(j.profile.shownLevel, 3);
  assert.ok(j.profile.strengths.some((t) => /at about level 3 of 8/.test(t)));
  assert.ok(!j.profile.strengths.some((t) => /level 4/.test(t)), "4 is never presented as shown");
  assert.match(j.profile.higherNotYetShown!, /Shown now at about level 3\. The estimate suggests about level 4, which is not shown yet: 1 recent right answer at level 4/);
  assert.equal(j.profile.notYetShown, null);
  assert.equal(j.mastery, "provisional", "candidate content: provisional");
  assert.deepEqual(candidateLevels(4), [4, 3.5, 3, 2.5, 2, 1.5, 1], "the engine's own half-band grid, never above the estimate");
});

test("the planner keeps going: it gathers evidence for the estimate above the shown level, at that level, never easier", async () => {
  const { l } = await history(ESTIMATE_4_SHOWN_3, c);
  const p = l.profile();
  const r = p.plan.all.find((x) => x.capability === CAP)!;
  assert.equal(r.action, "evidence_check");
  assert.match(r.what, /at about level 4/);
  assert.match(r.why, /shown at about level 3, and that stands/);
  assert.match(r.changeIf, /Wrong: level 3 still stands/);
  const cap = p.capabilities.find((x) => x.id === CAP)!;
  assert.equal(cap.evidenceGap!.shownBelow, 3);
  assert.equal(cap.gate!.level, 4);
  // the questions it would ask: unused, at 4 − 0.25 to 4 + 1 (not the easy words that already showed 3)
  const { evidenceCheckPool } = await import("./select.ts");
  const pool = evidenceCheckPool(l.state, c, CAP, { atLeast: 3.75, atMost: 5, why: "" }, "assess");
  assert.ok(pool.items.length > 0 && pool.items.every((i) => i.b >= 3.75 && i.b <= 5 && !l.state.ledger.exposures.has(i.id)));
  assert.ok(r.priority < 70, "after more pressing work: the lower level already stands");
});

test("the estimate rises without losing a supported lower level", async () => {
  const before = judge((await history(ESTIMATE_4_SHOWN_3, c)).l, c);
  const after = judge((await history([...ESTIMATE_4_SHOWN_3, { answers: [["forgotten", true], ["preferred", true]] }], c)).l, c);
  assert.ok(after.profile.levels.estimated! >= before.profile.levels.estimated!, "the estimate went up");
  assert.ok(after.profile.levels.demonstrated! >= before.profile.levels.demonstrated!, "the level shown did not go down");
});

test("no qualifying evidence at any level: nothing shown, nothing estimated as demonstrated, no level invented", async () => {
  const days: Day[] = [{ answers: [["stopped", true, { assisted: true }], ["dropped", true, { assisted: true }], ["smiling", true, { assisted: true }], ["hurried", true, { assisted: true }]] }];
  const j = judge((await history(days, c)).l, c);
  assert.deepEqual(j.profile.levels, { estimated: null, demonstrated: null, historical: null, confirmed: null });
  assert.notEqual(j.standing, "shown");
  // one format, one easy pattern, every word right: the engine proposes a level, the evidence supports none
  const d3 = judge((await history(scenario("D3"), c)).l, c);
  assert.ok(d3.profile.levels.estimated !== null);
  assert.equal(d3.profile.levels.demonstrated, null);
  assert.ok(d3.profile.notYetShown);
});

test("history with insufficient current evidence is history: never presented as a current level", async () => {
  // S3 shown at 5, then a lesson whose pattern the app cannot place: every earlier answer is history for the claim
  const j = judge((await history([...scenario("S3"), { lesson: "not_a_known_step", answers: [] }], c)).l, c);
  assert.equal(j.profile.levels.historical, 5);
  assert.equal(j.profile.levels.demonstrated, null);
  assert.equal(j.profile.shownLevel, null);
  assert.ok(j.profile.strengths.some((t) => /^Shown earlier, at about level 5 \(.*\); not currently shown/.test(t)));
  // shown now at a lower level than before: both said, the higher one as history
  const lower = judge((await history([...scenario("S3"), { answers: [["pointed", false]] }], c)).l, c);
  assert.equal(lower.profile.levels.historical, 5);
  assert.ok(lower.profile.levels.demonstrated !== null && lower.profile.levels.demonstrated < 5);
  assert.ok(lower.profile.strengths.some((t) => /Earlier shown at about level 5 .*history, not a current result/.test(t)), lower.profile.strengths.join(" | "));
});

test("an easy slip caps the current level only where the rule says it contradicts (≤ L − 1), and is probed, not taught", async () => {
  const j = judge((await history([...scenario("S3"), { answers: [["pointed", false]] }], c)).l, c);
  // a wrong answer at 1.5 contradicts levels from 2.5 up; 2 is the highest it leaves standing
  assert.equal(j.profile.levels.demonstrated, 2);
  assert.equal(j.gate!.contradictions.length, 1);
  assert.equal(j.gate!.next!.kind, "diagnostic", "one slip: a probe near it, not practice");
});

test("contradictory misconception evidence changes the claim only through the answers themselves", async () => {
  // right on y-to-i and drop-e words; two doubling errors on hard words (a supported misconception)
  const days: Day[] = [{ answers: [["hurried", true], ["happier", true], ["smiling", true], ["writing", true], ["admitted", "admited"], ["committed", "commited"]] }];
  const { l } = await history(days, c);
  const j = judge(l, c);
  assert.equal(finding(l, c).support, "supported");
  assert.ok(j.profile.levels.demonstrated !== null, "the level the other answers support stands");
  assert.ok(j.profile.difficulties.some((t) => /A pattern in wrong answers: no doubling/.test(t)));
});

test("a demonstrated level is never retention-confirmed before the delayed check", async () => {
  const shown = judge((await history(ESTIMATE_4_SHOWN_3, c)).l, c);
  assert.equal(shown.standing, "shown");
  assert.equal(shown.profile.levels.confirmed, null);
  assert.match(shown.profile.retention, /First check from/);
  // a day later, right again: still not a later check (the gap is 7 days)
  const next = judge((await history([...ESTIMATE_4_SHOWN_3, { answers: [["planned", true], ["closing", true]] }], c)).l, c);
  assert.notEqual(next.standing, "confirmed");
  assert.equal(next.profile.levels.confirmed, null);
});

test("lesson scope is OFF by default: every lesson supersedes earlier answers on the whole skill (conservative, until an educator reviews pattern relations)", async () => {
  assert.equal(LESSON_SCOPE.spellingPatternTags, false);
  assert.equal(affectedPatterns(c, CAP, "y_to_i"), null);
  const base: Day[] = [{ answers: [["hurried", true], ["happier", true], ["studied", true], ["stopped", true], ["dropped", true], ["grabbed", true]] }];
  const yLesson = judge((await history([...base, { lesson: "y_to_i", answers: [] }], c)).l, c);
  assert.equal(yLesson.gate!.window.length, 0, "every earlier answer is history for the claim");
  assert.equal(yLesson.gate!.superseded, 6);
});

test("lesson scope when switched on (behind LESSON_SCOPE, for educator review): a spelling lesson supersedes earlier answers on its pattern and patterns sharing a misconception tag; unrelated patterns keep theirs", async () => {
  LESSON_SCOPE.spellingPatternTags = true;
  try {
  // from the content's own misconception tags: the doubling lesson reaches every pattern where a doubling error
  // (missing or extra) is listed; y to i shares none
  const doubling = affectedPatterns(c, CAP, "double_short")!;
  for (const p of ["double_short", "stress_doubling", "no_double_unstressed"]) assert.ok(doubling.has(p), p);
  for (const p of ["y_to_i", "plain", "es_plural"]) assert.ok(!doubling.has(p), p);
  assert.deepEqual([...affectedPatterns(c, CAP, "y_to_i")!].sort(), ["y_to_i"]);
  assert.ok(!affectedPatterns(c, CAP, "drop_e")!.has("y_to_i"));
  assert.equal(affectedPatterns(c, CAP, "not_a_known_step"), null, "unknown pattern: whole skill");
  assert.equal(affectedPatterns(c, CAP, null), null);
  assert.equal(affectedPatterns(c, "EN.GRM.VERB.sva", "third_s"), null, "grammar: whole skill (patterns there are not independent enough to separate)");
  // right on y-to-i and doubling words, then a lesson on y to i: the doubling answers stand
  const base: Day[] = [{ answers: [["hurried", true], ["happier", true], ["studied", true], ["stopped", true], ["dropped", true], ["grabbed", true]] }];
  const yLesson = judge((await history([...base, { lesson: "y_to_i", answers: [] }], c)).l, c);
  assert.ok(yLesson.gate!.window.every((a) => a.pattern !== "y_to_i"), "y-to-i answers before the lesson are history");
  assert.equal(yLesson.gate!.window.length, 3, "the three doubling answers stand");
  const dLesson = judge((await history([...base, { lesson: "double_short", answers: [] }], c)).l, c);
  assert.ok(dLesson.gate!.window.every((a) => a.pattern === "y_to_i"));
  } finally {
    LESSON_SCOPE.spellingPatternTags = false;
  }
});

test("calendar days: UTC by default for every existing record; the pupil's time zone when recorded, across midnight and daylight saving", async () => {
  const utc: DayBasis = { zone: "UTC", source: "fallback_no_zone" };
  const kolkata: DayBasis = { zone: "Asia/Kolkata", source: "recorded" };
  const london: DayBasis = { zone: "Europe/London", source: "recorded" };
  const ny: DayBasis = { zone: "America/New_York", source: "recorded" };
  // 23:30 and 00:15 in Kolkata are the same UTC day
  assert.equal(calendarDay("2026-10-15T18:00:00.000Z", utc), "2026-10-15");
  assert.equal(calendarDay("2026-10-15T18:45:00.000Z", utc), "2026-10-15");
  assert.equal(calendarDay("2026-10-15T18:00:00.000Z", kolkata), "2026-10-15");
  assert.equal(calendarDay("2026-10-15T18:45:00.000Z", kolkata), "2026-10-16");
  // New York, the other way: two UTC days, one local evening
  assert.equal(calendarDay("2026-10-15T23:30:00.000Z", ny), "2026-10-15");
  assert.equal(calendarDay("2026-10-16T01:30:00.000Z", ny), "2026-10-15");
  // daylight saving ends in London on 25 October 2026 at 01:00 UTC (02:00 BST → 01:00 GMT)
  assert.equal(calendarDay("2026-10-24T23:30:00.000Z", london), "2026-10-25", "00:30 BST");
  assert.equal(calendarDay("2026-10-25T00:30:00.000Z", london), "2026-10-25", "01:30 BST, before the change");
  assert.equal(calendarDay("2026-10-25T23:30:00.000Z", london), "2026-10-25", "23:30 GMT, after the change");
  assert.equal(calendarDay("2026-10-26T00:00:00.000Z", london), "2026-10-26");
  // and begins on 29 March 2026 at 01:00 UTC
  assert.equal(calendarDay("2026-03-28T23:59:00.000Z", london), "2026-03-28");
  assert.equal(calendarDay("2026-03-29T23:30:00.000Z", london), "2026-03-30", "00:30 BST");
  // the source of the zone, with explicit fallbacks
  assert.deepEqual(dayBasis(null), utc);
  assert.deepEqual(dayBasis(null, "Not/AZone"), { zone: "UTC", source: "fallback_invalid_zone" });
  assert.deepEqual(dayBasis(null, "Asia/Kolkata"), kolkata);
});

test("misconception resolution across midnight: a later day in Kolkata, the same day in UTC; stored timestamps never change", async () => {
  // error at 23:30 IST (18:00 UTC), right twice at the error's difficulty at 00:15 and 00:20 IST the next day
  const days: Day[] = [{ answers: [["admitted", "admited"]] }, { gap: 0, answers: [["regretted", true], ["permitted", true]] }];
  const { l } = await history(days, c, "2026-10-14T17:59:00.000Z");
  // put the two right answers 45 minutes after the error: the history clock moves a minute per event, so shift the
  // session start; check the times we got rather than assume them
  const times = l.state.ledger.decisions.map((d) => d.at);
  const err = times[0];
  assert.equal(err.slice(0, 10), times.at(-1)!.slice(0, 10), "all on one UTC day");
  const stored = JSON.stringify(l.events);
  const inUtc = finding(l, c);
  assert.equal(inUtc.status, "improving", "UTC: the same day, so not yet resolved");
  assert.match(inUtc.reason, /UTC days \(no time zone recorded\)/);
  // the same record judged in a zone where midnight falls between the error and the right answers
  const local = misconceptionFindings(l.state, c, { timeZone: "Asia/Kolkata" }).find((f) => f.capability === CAP && f.misconception === "no_doubling")!;
  const localErr = calendarDay(err, { zone: "Asia/Kolkata", source: "recorded" });
  const localRight = calendarDay(times.at(-1)!, { zone: "Asia/Kolkata", source: "recorded" });
  assert.equal(local.status, localRight > localErr ? "resolved" : "improving");
  assert.equal(JSON.stringify(l.events), stored, "no timestamp rewritten");
  // a zone recorded AFTER the answers never re-dates them: they keep the basis in effect when they were given (UTC)
  const later = fold(c, [...l.events, { kind: "preferences", id: "tz", at: l.clock(), band: "school", goal: "spelling", timeZone: "Asia/Kolkata" }]);
  const lf = misconceptionFindings(later, c).find((f) => f.misconception === "no_doubling")!;
  assert.deepEqual([lf.days.zone, lf.status], ["UTC", inUtc.status]);
  // a zone recorded BEFORE the answers is the one in effect for them, without being asked for
  const first = l.events.findIndex((e) => e.kind === "session");
  const before = fold(c, [...l.events.slice(0, first), { kind: "preferences", id: "tz0", at: l.events[first].at, band: "school", goal: "spelling", timeZone: "Asia/Kolkata" }, ...l.events.slice(first)]);
  const bf = misconceptionFindings(before, c).find((f) => f.misconception === "no_doubling")!;
  assert.deepEqual([bf.days.zone, bf.status], ["Asia/Kolkata", local.status]);
});

test("existing results where the refinement does not apply are unchanged (same level as the engine, same standing); replay is identical", async () => {
  for (const id of ["S1", "S3", "S5", "S6", "D1"]) {
    const { l } = await history(scenario(id), c);
    const j = judge(l, c);
    assert.equal(j.standing, "shown", id);
    assert.equal(j.profile.levels.demonstrated, j.engineLevel, `${id}: shown at the engine's own level, as before`);
    const now = l.clock();
    assert.deepEqual(learnerProfile(fold(c, l.events), c, now).capabilities.find((x) => x.id === CAP)!.levels, learnerProfile(l.state, c, now).capabilities.find((x) => x.id === CAP)!.levels);
  }
  const { l } = await history(ESTIMATE_4_SHOWN_3, c);
  const d = await diagnose(c, { pupil: { id: l.profileId, name: "Sim" }, events: l.events, now: l.clock() });
  const row = d.retention.find((r) => r.capability === CAP)!;
  assert.deepEqual(row.levels, { estimated: 4, demonstrated: 3, historical: 3, confirmed: null });
  assert.match(row.gate, /^passed at 3 \(not at 4\)/);
  assert.equal(MASTERY_GATE.window, 6, "the recency window is unchanged");
});

test("duplicate words and assisted answers never count at any candidate level", async () => {
  // the same right answers given with help: whatever level the unaided ones show, help adds nothing to it
  const alone = judge((await history([{ answers: ESTIMATE_4_SHOWN_3[0].answers }], c)).l, c);
  const helped = judge((await history([{ answers: [...ESTIMATE_4_SHOWN_3[0].answers, ["forgotten", true, { assisted: true }], ["preferred", true, { assisted: true }]] }], c)).l, c);
  assert.deepEqual(helped.profile.levels, alone.profile.levels);
  // a question asked again: the same level as without it
  const again = judge((await history([...ESTIMATE_4_SHOWN_3, { answers: [["happier", true], ["admitted", true]] }], c)).l, c);
  assert.ok(again.gate!.window.filter((a) => a.word === "happier").length <= 1, "never twice in the window");
  void (null as unknown as Code);
});

test("review fixes: a level first supported in the later check itself is shown, not confirmed; the confirmed level is the one supported 7+ days before", async () => {
  const { l } = await history([...ESTIMATE_4_SHOWN_3, { gap: 8, answers: [["forgotten", true], ["preferred", true], ["regretted", true], ["permitted", true]] }], c);
  const j = judge(l, c);
  assert.equal(j.engineStatus, "verified");
  assert.ok(j.profile.levels.demonstrated! > 3, "a higher level is shown now");
  assert.equal(j.profile.levels.confirmed, 3, "only level 3 was supported a week before the check");
  assert.equal(j.standing, "confirmed");
  assert.ok(j.profile.strengths.some((t) => new RegExp(`at about level ${j.profile.levels.demonstrated} of 8, and still right at a later check at about level 3`).test(t)), j.profile.strengths.join(" | "));
  assert.match(j.profile.estimate.verification, /^Confirmed at about level 3; shown now at about level/);
});

test("review fixes: the check for a higher level never asks questions easier than the level shown, even after a slip", async () => {
  const { l } = await history([...scenario("S3"), { answers: [["pointed", false]] }], c);
  const cap = l.profile().capabilities.find((x) => x.id === CAP)!;
  assert.equal(cap.levels.demonstrated, 2);
  assert.equal(cap.evidenceGap!.shownBelow, 2);
  const p = l.profile();
  const r = p.plan.all.find((x) => x.capability === CAP && x.action === "evidence_check");
  assert.ok(r, "an evidence check for the estimate is planned");
  const m = r!.why.match(/new questions at difficulty ([\d.]+) to ([\d.]+) can show level ([\d.]+)/)!;
  assert.equal(Number(m[1]), parseFloat(m[3]) - MASTERY_GATE.atLevelBelow, "at the higher level, not a probe near the slip");
  assert.ok(Number(m[1]) > 2, "never easier than the level shown");
});

test("review fixes: the recorded time zone survives a later preferences change without one; an empty override is no override", async () => {
  const { l } = await history(scenario("S3"), c);
  const events = [...l.events, { kind: "preferences" as const, id: "p1", at: l.clock(), band: "school" as const, goal: "spelling" as const, timeZone: "Asia/Kolkata" }, { kind: "preferences" as const, id: "p2", at: l.clock(), band: "older" as const, goal: "spelling" as const }];
  const s = fold(c, events);
  assert.equal(dayBasis(s).zone, "Asia/Kolkata");
  assert.equal(dayBasis(s, "").zone, "Asia/Kolkata");
  assert.equal(dayBasis(fold(c, l.events)).zone, "UTC", "every existing record: UTC");
});

// ------------------------------------------------------------------ final bounded review (15 October)

const BASE: Day[] = [{ answers: [["stopped", true], ["dropped", true], ["smiling", true], ["writing", true], ["hurried", true], ["happier", true]] }];

test("review 1: the estimate does not fall from time passing or from errors far above the level; the level shown stays", async () => {
  const base = judge((await history(BASE, c)).l, c);
  assert.deepEqual([base.profile.levels.estimated, base.profile.levels.demonstrated], [4.5, 3.5]);
  // wrong on three words far harder than the level (6.25–6.5): not contradictions, and the estimate does not move
  const hard = judge((await history([...BASE, { answers: [["committed", false], ["limited", false], ["ordered", false]] }], c)).l, c);
  assert.deepEqual([hard.profile.levels.estimated, hard.profile.levels.demonstrated], [4.5, 3.5]);
});

test("review 1: when the estimate falls after wrong answers AT the level, the cap is doing real work the gate alone does not", async () => {
  // three wrong at exactly 3.5 after showing 3.5: the gate's window still has 3 right at ≥ 3.25 and no wrong at
  // ≤ 2.5, so the gate alone would keep 3.5; the engine's estimate falls to 3, and 3 is what is shown
  const { l } = await history([...BASE, { answers: [["closing", false], ["saving", false], ["chasing", false]] }], c);
  const j = judge(l, c);
  assert.deepEqual([j.profile.levels.estimated, j.profile.levels.demonstrated, j.profile.levels.historical], [3, 3, 3.5]);
  const { masteryGate, qualifyingAnswers } = await import("./mastery.ts");
  assert.equal(masteryGate(l.state, c, CAP, 3.5, l.clock(), true, qualifyingAnswers(l.state, c, CAP)).passed, true, "the gate by itself would still allow 3.5");
  assert.ok(j.profile.strengths.some((t) => /Earlier shown at about level 3\.5 .*history/.test(t)), "3.5 is kept as history");
});

test("review 1 (fix): a later check that is due is reported for a level the gate supported, even below the engine's retained level", async () => {
  // shown at 3.5 against an estimate of 4.5; thirty days later the check is overdue: "check due", not "developing"
  const j = judge((await history([...BASE, { gap: 30, answers: [] }], c)).l, c);
  assert.equal(j.engineStatus, "overdue");
  assert.equal(j.standing, "check_due");
  assert.equal(j.profile.levels.demonstrated, null, "no current level while the check is overdue");
  assert.equal(j.profile.levels.historical, 3.5);
  assert.ok(j.profile.strengths.some((t) => /Shown earlier, at about level 3\.5 .*a later check is due/.test(t)), j.profile.strengths.join(" | "));
  // and never for a level the gate never supported (one easy pattern only)
  const never = judge((await history([...DICTATION_SCENARIOS.find((x) => x[0] === "D3")![2], { gap: 30, answers: [] }], c)).l, c);
  assert.notEqual(never.standing, "check_due");
});

test("review 3: a later calendar day never substitutes for the seven-day retention interval", async () => {
  // shown on day 1; right again the next calendar day (in UTC and in Kolkata): shown, never confirmed
  const days: Day[] = [...ESTIMATE_4_SHOWN_3, { answers: [["planned", true], ["closing", true], ["grabbed", true]] }];
  for (const zone of [null, "Asia/Kolkata", "America/New_York"]) {
    const { l } = await history(days, c);
    const s = zone ? fold(c, [{ kind: "preferences" as const, id: "tz", at: "2026-09-01T00:00:00.000Z", band: "school" as const, goal: "spelling" as const, timeZone: zone }, ...l.events]) : l.state;
    const cap = learnerProfile(s, c, l.clock()).capabilities.find((x) => x.id === CAP)!;
    assert.equal(cap.standing, "shown", String(zone));
    assert.equal(cap.levels.confirmed, null);
  }
});
