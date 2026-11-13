/** competency-profile@1: measures and findings from a learner's own answers. */
import assert from "node:assert/strict";
import test from "node:test";
import { competencyProfile, topicName, type ProfileAttempt } from "../../../packages/learning/src/competency-profile";

const NOW = new Date(2026, 10, 13, 18, 0, 0).getTime(); // 13 Nov 2026, local
const at = (daysAgo: number) => new Date(2026, 10, 13 - daysAgo, 17, 0, 0).toISOString();
type A = ProfileAttempt & { ok: boolean };
const a = (daysAgo: number, competency: string, ok: boolean, seconds?: number, over: Partial<A> = {}): A => ({ at: at(daysAgo), competency, hints: 0, solution: false, n: 1, activity: "practice", ok, ...(seconds ? { ms: seconds * 1000 } : {}), ...over });
const run = (attempts: A[], period: "week" | "month" | "year" = "week") => competencyProfile(attempts, (x) => x.ok, (c) => c.split(".")[0], (c) => `Skill ${c}`, period, NOW);
const many = (n: number, f: (i: number) => A) => Array.from({ length: n }, (_, i) => f(i));

test("C-1 nothing answered: empty, nothing claimed", () => {
  const p = run([]);
  assert.deepEqual([p.answered, p.activeDays, p.minutes, p.paceSeconds, p.topics, p.findings], [0, 0, null, null, [], { mostAccurate: null, quickest: null, mostPractised: null, stuck: [] }]);
  assert.equal(p.calendar.length, 7);
});

test("C-2 measures per topic; nothing is stated on fewer than five answers", () => {
  const p = run([...many(8, (i) => a(1, "algebra.x", i < 7, 10)), ...many(4, () => a(1, "geometry.y", true, 30))]);
  const [alg, geo] = [p.topics.find((t) => t.topic === "algebra")!, p.topics.find((t) => t.topic === "geometry")!];
  assert.deepEqual([alg.answered, alg.rightFirstTry, alg.accuracy, alg.independence, alg.paceSeconds, alg.skills], [8, 7, 7 / 8, 1, 10, 1]);
  assert.deepEqual([geo.accuracy, geo.independence, geo.paceSeconds, geo.pace], [null, null, null, null], "four answers: not enough to say");
});

test("C-3 quick and slow compare the learner with their own pace only", () => {
  const p = run([...many(10, () => a(1, "algebra.x", true, 8)), ...many(10, () => a(1, "fractions.y", true, 40)), ...many(10, () => a(2, "number.z", true, 20))]);
  const pace = Object.fromEntries(p.topics.map((t) => [t.topic, t.pace]));
  assert.equal(p.paceSeconds, 20);
  assert.deepEqual(pace, { algebra: "quick", fractions: "slow", number: "steady" });
  assert.equal(p.findings.quickest!.topic, "algebra");
  // a topic practised far more than the others does not set the usual pace by weight of numbers
  const lop = run([...many(30, () => a(1, "algebra.x", true, 8)), ...many(5, () => a(1, "fractions.y", true, 40))]);
  assert.deepEqual([lop.paceSeconds, lop.findings.quickest!.topic], [24, "algebra"]);
  // one topic alone has nothing to be compared with
  assert.equal(run(many(10, () => a(1, "algebra.x", true, 8))).topics[0].pace, null);
  // an answer that needed a hint, or was wrong, does not set the pace
  assert.equal(run([...many(10, () => a(1, "algebra.x", false, 2)), ...many(10, () => a(1, "algebra.x", true, 2, { hints: 1 }))]).paceSeconds, null);
});

test("C-4 findings: most accurate needs two rated topics and at least 70%; stuck uses the parent page's rule", () => {
  const p = run([...many(10, (i) => a(1, "algebra.x", i < 9)), ...many(10, (i) => a(1, "fractions.y", i < 3)), ...many(4, (i) => a(1, "fractions.w", i < 4))]);
  assert.equal(p.findings.mostAccurate!.topic, "algebra");
  assert.deepEqual(p.findings.stuck, [{ topic: "fractions", skill: "Skill fractions.y" }]);
  assert.equal(p.findings.mostPractised!.topic, "fractions");
  assert.equal(run([...many(10, (i) => a(1, "algebra.x", i < 5)), ...many(10, (i) => a(1, "fractions.y", i < 3))]).findings.mostAccurate, null, "50% is not a strength");
});

test("C-5 week, month and calendar year take different spans; the calendar matches", () => {
  const all = [a(0, "algebra.x", true, 10), a(5, "algebra.x", true, 10), a(20, "algebra.x", true, 10), a(60, "algebra.x", true, 10), a(400, "algebra.x", true, 10)];
  const [w, m, y] = [run(all, "week"), run(all, "month"), run(all, "year")];
  assert.deepEqual([w.answered, m.answered, y.answered], [2, 3, 4], "last year's answer is in none of them");
  assert.deepEqual([w.calendar.length, m.calendar.length, y.calendar.length], [7, 30, 11]);
  assert.equal(y.from, "2026-01-01");
  assert.deepEqual(y.calendar.filter((c) => c.answered).map((c) => [c.label, c.answered]), [["Sep", 1], ["Oct", 1], ["Nov", 2]]);
  assert.equal(w.calendar.at(-1)!.label, "Today");
  assert.equal(w.minutes, 0, "20 seconds rounds to 0 minutes; timed, so not null");
  assert.equal(run([a(0, "algebra.x", true)]).minutes, null, "nothing timed");
});

test("C-6 topics a parent would name", () => {
  const cases: [string, string, string][] = [["MATH.number.fraction-add", "number", "Fractions"], ["MATH.number.decimal-operations", "number", "Decimals"], ["MATH.number.long-division", "number", "Multiplication, division and factors"], ["MATH.number.integer-add", "number", "Integers"], ["MATH.number.rational-numbers", "number", "Fractions"], ["MATH.number.zero", "number", "Place value and number sense"], ["MATH.number.ratio", "number", "Ratio and proportion"], ["MATH.number.place-value-tens", "number", "Place value and number sense"], ["MATH.algebra.identities", "algebra", "Algebra"], ["MATH.statistics.mean", "statistics", "Data and statistics"]];
  for (const [id, strand, want] of cases) assert.equal(topicName(id, strand), want, id);
});
