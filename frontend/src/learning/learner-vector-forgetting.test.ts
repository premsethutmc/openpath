/**
 * learner-vector@2 (shadow): forgetting. Each skill gets a memory stability from the spacing of the learner's answers; `recall`
 * is the estimate faded by the time since the skill was last answered. Nothing in the product reads recall or the review queue.
 * The synthetic learners at the end forget along a power law too (as people do), but with their own curve, their own memory
 * rule and an ability the model does not know, so this checks calibration; it is synthetic, not evidence about children.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DAY } from "../../../packages/learning/src/evidence";
import { difficultyOf, FAMILIES, pool } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { STABILITY_START, learnerVector, REVIEW_AT, reviewQueue } from "../../../packages/learning/src/learner-vector";
import type { LearnerRecords } from "../../../packages/learning/src/records";

const T0 = Date.parse("2026-11-01T09:00:00Z");
const answer = (questionId: string, competency: string, right: boolean, at: number) => ({ id: `a${at}${questionId}`, at: new Date(at).toISOString(), session: "s", questionId, response: "", activity: "check", hints: 0, solution: false, competency, n: 1, credit: right });
const records = (attempts: unknown[]) => ({ attempts, teaching: [], enrolments: [], sessions: {}, goals: new Map(), curricula: new Map() }) as unknown as LearnerRecords;

// a family with plenty of questions across difficulty classes
const fam = [...FAMILIES.keys()].find((f) => { const it = pool(f).items; return it.length >= 40 && [1, 2, 3].every((d) => it.some((p) => difficultyOf(p) === d)); })!;
const items = pool(fam).items;
const competency = FAMILIES.get(fam)!.competency, skill = graph.evidenceTarget(competency);
const medium = items.filter((p) => difficultyOf(p) === 2).map((p) => p.id);
/** right answers on medium questions at the given day offsets */
const rights = (days: number[]) => days.map((d, i) => answer(medium[i], competency, true, T0 + d * DAY + i * 60_000));
const at = (r: LearnerRecords, now: number) => learnerVector(r, { now }).get(skill)!;

test("recall equals the estimate right after an answer and fades with time away; the estimate itself does not", () => {
  const r = records(rights([0, 0, 0]));
  const last = T0 + 2 * 60_000;
  const fresh = at(r, last), later = at(r, last + 10 * DAY), muchLater = at(r, last + 60 * DAY);
  assert.equal(fresh.recall, fresh.estimate);
  assert.ok(fresh.stabilityDays! < STABILITY_START * 1.01, "three answers in one sitting: almost no lengthening");
  assert.ok(later.recall < fresh.recall && muchLater.recall < later.recall && muchLater.recall >= 0.5);
  assert.equal(later.estimate, fresh.estimate);
});

test("spacing: the same right answers spread over weeks give a longer stability than in one sitting", () => {
  const massed = at(records(rights([0, 0, 0, 0])), T0), spaced = at(records(rights([0, 3, 10, 30])), T0 + 30 * DAY);
  assert.ok(spaced.stabilityDays! > 4 * massed.stabilityDays!, `${spaced.stabilityDays} vs ${massed.stabilityDays}`);
});

test("a wrong answer after time away halves the stability", () => {
  const before = rights([0, 3, 10]);
  const h = at(records(before), T0 + 10 * DAY).stabilityDays!;
  const after = at(records([...before, answer(medium[5], competency, false, T0 + 40 * DAY)]), T0 + 40 * DAY);
  assert.ok(Math.abs(after.stabilityDays! - Math.max(1, h / 2)) < 1e-9);
});

test("reviewDueAt is when recall reaches REVIEW_AT; the review queue holds shown skills that have faded", () => {
  const r = records(rights([0, 3, 10, 30]));
  const v = at(r, T0 + 30 * DAY);
  assert.ok(v.estimate >= REVIEW_AT && v.reviewDueAt);
  assert.ok(Math.abs(at(r, Date.parse(v.reviewDueAt!)).recall - REVIEW_AT) < 1e-6);
  assert.equal(reviewQueue(learnerVector(r, { now: Date.parse(v.reviewDueAt!) - DAY })).length, 0);
  assert.deepEqual(reviewQueue(learnerVector(r, { now: Date.parse(v.reviewDueAt!) + DAY })).map((e) => e.skill), [skill]);
  // a skill never shown has no review date and never enters the queue
  const weak = learnerVector(records([answer(medium[0], competency, false, T0)]), { now: T0 + 90 * DAY }).get(skill)!;
  assert.equal(weak.reviewDueAt, null);
  assert.equal(weak.recall, weak.estimate, "an estimate below even does not fade");
});

test("shadow: recovery reads only the estimate; nothing in the product reads recall or the review queue", () => {
  const src = (f: string) => readFileSync(new URL(`../../../packages/learning/src/${f}`, import.meta.url), "utf8");
  assert.ok(!/\.recall\b|reviewQueue|reviewDueAt|stabilityDays/.test(src("intervention.ts")));
  for (const f of ["evidence.ts", "plan.ts", "tiles.ts", "dashboard.ts"]) assert.ok(!src(f).includes("learner-vector"), f);
});

test("synthetic learners who forget (power law): recall predicts later answers better than the estimate without forgetting", () => {
  let seed = 20261115;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const B: Record<number, number> = { 1: -1, 2: 0, 3: 1 };
  let lossRecall = 0, lossEstimate = 0, n = 0, lossRecallLong = 0, lossEstimateLong = 0, nLong = 0;
  for (let learner = 0; learner < 400; learner++) {
    const ability = 1.5 + rnd() * 2; // learnt well
    let stability = 1 + rnd() * 6, last = T0; // the learner's own memory, unknown to the model
    const qs = [...items].sort(() => rnd() - 0.5).slice(0, 10);
    const attempts: ReturnType<typeof answer>[] = [];
    let t = T0, k = 0;
    const ask = (predict: boolean) => {
      const q = qs[k++], b = B[difficultyOf(q)];
      const days = (t - last) / DAY;
      const p = sigmoid(ability * Math.pow(1 + days / stability, -0.6) - b);
      if (predict) {
        const v = learnerVector(records(attempts), { now: t }).get(skill)!;
        const right = rnd() < p;
        const ll = (x: number) => -Math.log(right ? x : 1 - x);
        const lr = ll(sigmoid(Math.log(v.recall / (1 - v.recall)) - b)), le = ll(sigmoid(Math.log(v.estimate / (1 - v.estimate)) - b));
        lossRecall += lr; lossEstimate += le; n++;
        if (days > 14) { lossRecallLong += lr; lossEstimateLong += le; nLong++; }
        attempts.push(answer(q.id, competency, right, t));
        stability = right ? stability * (1 + 2 * days / (days + stability)) : stability / 2;
      } else attempts.push(answer(q.id, competency, rnd() < p, t));
      last = t;
    };
    for (let i = 0; i < 4; i++) { ask(false); t += 60_000; } // first sitting
    for (const max of [20, 45, 90]) { t += (1 + rnd() * max) * DAY; ask(true); }
  }
  const r = lossRecall / n, e = lossEstimate / n, rl = lossRecallLong / nLong, el = lossEstimateLong / nLong;
  console.log(`log-loss on later answers: with forgetting ${r.toFixed(3)}, without ${e.toFixed(3)} (n=${n}); after >14 days away: ${rl.toFixed(3)} vs ${el.toFixed(3)} (n=${nLong})`);
  assert.ok(r < e, "forgetting improves prediction overall");
  assert.ok(rl < el - 0.02, "and clearly after long gaps");
});
