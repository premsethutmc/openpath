/** parent-view@1: the parent's summary is a count of what happened. */
import assert from "node:assert/strict";
import test from "node:test";
import { parentReport, type ReportAttempt } from "../../../packages/learning/src/parent-report";

const NOW = new Date(2026, 10, 13, 18, 0, 0).getTime(); // a Friday evening, local time
const at = (daysAgo: number, hour = 17) => new Date(2026, 10, 13 - daysAgo, hour, 0, 0).toISOString();
type A = ReportAttempt & { ok: boolean };
const a = (daysAgo: number, competency: string, ok: boolean, over: Partial<A> = {}): A => ({ at: at(daysAgo), competency, hints: 0, solution: false, n: 1, activity: "practice", ok, ...over });
const run = (attempts: A[], teaching: { at: string; competency: string }[] = []) => parentReport({ attempts, teaching }, (x) => x.ok, (c) => `Name of ${c}`, NOW);

test("P-1 nothing done: zeros, seven days ending today, no skills", () => {
  const r = run([]);
  assert.deepEqual([r.lastActive, r.today, r.week, r.skills], [null, { answered: 0, rightFirstTry: 0 }, { answered: 0, rightFirstTry: 0, activeDays: 0, lessons: 0 }, []]);
  assert.deepEqual(r.days.map((d) => d.label), ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Today"]);
});

test("P-2 today, this week and active days are counted by local day; older work is outside the week", () => {
  const r = run([a(0, "f", true), a(0, "f", false), a(2, "f", true), a(6, "g", true), a(7, "g", true), a(20, "h", true)], [{ at: at(1), competency: "f" }, { at: at(9), competency: "f" }]);
  assert.deepEqual(r.today, { answered: 2, rightFirstTry: 1 });
  assert.deepEqual(r.week, { answered: 4, rightFirstTry: 3, activeDays: 3, lessons: 1 });
  assert.deepEqual(r.days.map((d) => d.answered), [1, 0, 0, 0, 1, 0, 2]);
  assert.equal(r.lastActive, at(0));
  assert.deepEqual(r.skills.map((s) => s.competency), ["f", "g"], "skills from the last 14 days, most recent first");
});

test("P-3 right at the first try means no hint, no solution, first attempt, not guided", () => {
  const r = run([a(0, "f", true), a(0, "f", true, { hints: 1 }), a(0, "f", true, { solution: true }), a(0, "f", true, { n: 2 }), a(0, "f", true, { activity: "guided" })]);
  assert.deepEqual(r.today, { answered: 5, rightFirstTry: 1 });
  assert.equal(r.skills[0].helped, 3);
});

test("P-4 needs help, going well, in progress", () => {
  const r = run([
    ...[true, false, false, false].map((ok) => a(1, "weak", ok)),
    ...[true, true, true, true, false].map((ok) => a(1, "strong", ok)),
    a(1, "new", false), a(1, "new", false),
    a(1, "peeked", true), a(1, "peeked", true, { solution: true }), a(1, "peeked", true, { solution: true }),
  ]);
  const verdict = Object.fromEntries(r.skills.map((s) => [s.competency, s.verdict]));
  assert.deepEqual(verdict, { weak: "needs_help", strong: "going_well", new: "in_progress", peeked: "needs_help" });
  assert.equal(r.skills.find((s) => s.competency === "weak")!.name, "Name of weak");
});

test("P-5 a record dated in the future is not counted", () => {
  assert.equal(run([{ ...a(0, "f", true), at: new Date(NOW + 3_600_000).toISOString() }]).week.answered, 0);
});
