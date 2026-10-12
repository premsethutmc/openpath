import assert from "node:assert/strict";
import { test } from "node:test";
import { type Composite, type Goal, applyDirect, binaryUpdate, createComposite, leafView, recommend, retention, checkPassed } from "../src/index.ts";
import { LEARNERS } from "../../../tools/english/sim/learners.ts";
import { runLearner } from "../../../tools/english/sim/run.ts";
import { ctx } from "./helpers.ts";

const SVA = "EN.GRM.VERB.sva";
const day = (d: number, minute = 0) => new Date(Date.UTC(2026, 9, 12, 10, 30) + d * 86_400_000 + minute * 60_000).toISOString();
const ITEM = { a: 1.3, c: 0 };

/** A session of answers on one capability: `right` correct, then `wrong` incorrect, on items of difficulty b. */
function session(c: Composite, cap: string, d: number, b: number, right: number, wrong: number, tag = `s${d}`) {
  let k = 0;
  for (const correct of [...Array(right).fill(true), ...Array(wrong).fill(false)])
    applyDirect(c, ctx().index, { capability: cap, at: day(d, k), session: tag, context: k++ % 2 ? "typed:cloze" : "choice:grammar", decisionId: `${tag}:${k}`, update: (e) => binaryUpdate(e, { ...ITEM, b }, correct), misconceptions: [], binary: { b, correct, ...ITEM } });
}

test("retention: a check falls due after the first demonstration; passing doubles the interval, failing halves it", () => {
  const c = createComposite(ctx().index, "x");
  session(c, SVA, 0, 4, 6, 0);
  const node = c.nodes[SVA];
  let r = retention(node, ctx().index.framework.policy, day(1));
  assert.equal(r.status, "current");
  assert.equal(r.intervalDays, 7);
  assert.equal(r.dueAt!.slice(0, 10), day(7).slice(0, 10));
  session(c, SVA, 7, 4.5, 3, 0); // check on the due day: passes
  r = retention(node, ctx().index.framework.policy, day(8));
  assert.equal(r.checks.length, 1);
  assert.ok(r.checks[0].passed);
  assert.equal(r.intervalDays, 14);
  session(c, SVA, 21, 4.5, 0, 3); // next check: fails on fresh evidence, despite a strong history
  r = retention(node, ctx().index.framework.policy, day(22));
  assert.equal(r.checks.length, 2);
  assert.equal(r.checks[1].passed, false);
  assert.equal(r.intervalDays, 7);
  assert.equal(r.status, "failed");
  assert.equal(leafView(c, ctx().index, SVA, day(22)).stage, "needs_review");
});

test("an overdue check takes away current mastery even when numerical uncertainty is low; history is kept apart", () => {
  const c = createComposite(ctx().index, "x");
  session(c, SVA, 0, 4, 12, 0);
  session(c, SVA, 7, 4.5, 12, 0); // the check passes: mastered, next check due on day 21
  const before = leafView(c, ctx().index, SVA, day(20));
  assert.equal(before.stage, "mastered");
  assert.ok(before.mastered !== null);
  assert.equal(before.retention.status, "current");
  const later = leafView(c, ctx().index, SVA, day(30));
  assert.ok(later.sd < 0.6, `uncertainty is still low (sd ${later.sd.toFixed(2)})`);
  assert.equal(later.retention.status, "overdue");
  assert.equal(later.stage, "review_due");
  assert.equal(later.mastered, null, "not currently verified");
  assert.equal(later.masteredBefore, before.mastered, "previously demonstrated mastery is still recorded");
  assert.ok(later.retention.lastVerifiedAt);
});

test("a retention check is judged on the session's fresh evidence, not on the older cumulative estimate", () => {
  assert.equal(checkPassed([{ kind: "binary", b: 4.4, a: 1.3, c: 0, correct: false }, { kind: "binary", b: 4, a: 1.3, c: 0, correct: false }], 5, 4.5), false);
  assert.equal(checkPassed([{ kind: "binary", b: 4.4, a: 1.3, c: 0, correct: true }], 5, 3), true);
  assert.equal(checkPassed([{ kind: "band", value: 3, noise: 0.7 }], 5, 4.5), false);
});

const sva: Goal = { id: "g", name: "Agreement", weights: { [SVA]: 1, "EN.GRM.NOUN.articles": 1 }, targets: { "EN.GRM": 6 } };
const sel = (c: Composite, now: string, extra: Record<string, unknown> = {}) => recommend({ index: ctx().index, content: ctx().content, composite: c, goal: sva, now, seen: new Set<string>(), recent: [], writingThisSession: 0, writingAvailable: false, ...extra });

test("hybrid scheduler: an overdue retention check takes priority and is explained", () => {
  const c = createComposite(ctx().index, "x");
  session(c, SVA, 0, 4, 8, 0);
  session(c, "EN.GRM.NOUN.articles", 8, 3, 3, 3); // demonstrated later, so not yet due
  const rec = sel(c, day(9));
  assert.equal(rec.schedule.reason, "retention_check");
  assert.equal(rec.path, "retention_check");
  assert.equal(rec.choice!.focus, SVA);
  assert.match(rec.explanation, /Retention check: Subject–verb agreement .*days overdue.*not currently verified/);
  // explicit modes bypass the scheduler (kept for testing)
  assert.notEqual(sel(c, day(9), { mode: "learning" }).path, "retention_check");
  assert.equal(sel(c, day(9), { mode: "assessment" }).schedule.policy, "explicit");
});

test("hybrid scheduler: every third activity is an assessment probe once uncertainty is down, and the setting is configurable", () => {
  const c = createComposite(ctx().index, "x");
  session(c, SVA, 0, 3, 3, 3);
  session(c, "EN.GRM.NOUN.articles", 0, 3, 3, 3);
  const reasons = [0, 1, 2, 3, 4, 5].map((i) => sel(c, day(1), { activityIndex: i }).schedule.reason);
  assert.deepEqual(reasons, ["learning", "learning", "probe", "learning", "learning", "probe"]);
  assert.equal(sel(c, day(1), { activityIndex: 3, scheduler: { probeEvery: 4 } }).schedule.reason, "probe");
  assert.equal(sel(c, day(1), { activityIndex: 2, scheduler: { probeEvery: 0 } }).schedule.reason, "learning");
});

test("hybrid scheduler: contradictory evidence triggers a re-measuring probe", () => {
  const c = createComposite(ctx().index, "x");
  session(c, SVA, 0, 3, 3, 3);
  session(c, "EN.GRM.NOUN.articles", 0, 3, 3, 3);
  session(c, SVA, 1, 2, 0, 3, "s1-miss-easy"); // misses three easy items in the latest session
  const rec = sel(c, day(1, 30), { activityIndex: 0 });
  assert.equal(rec.schedule.reason, "contradiction");
  assert.match(rec.explanation, /Contradictory evidence: Subject–verb agreement: \d of \d items at or below the estimate were missed/);
});

test("a learner who forgets previously demonstrated skills is caught by retention checks (simulated L10)", async () => {
  const c = ctx();
  const l10 = LEARNERS.find((l) => l.id === "L10")!;
  const r = await runLearner(c, l10, { goal: c.content.goals.get("overall")!, sessionDays: [0, 1, 8, 15, 16, 22], itemsPerSession: 20, seed: 20261012, evaluatorNoise: 0.7 });
  const now = r.sessions.at(-1)!.now;
  const grammar = ["EN.GRM.NOUN.articles", "EN.GRM.VERB.aspect", "EN.GRM.VERB.sva", "EN.GRM.PUN.commas"].map((g) => leafView(r.ledger.composite, c.index, g, now));
  const flagged = grammar.filter((v) => v.retention.status === "failed" || v.retention.status === "overdue");
  assert.ok(flagged.length >= 2, grammar.map((v) => `${v.name}: ${v.retention.status}`).join("; "));
  assert.ok(flagged.some((v) => v.retention.checks.some((k) => !k.passed)), "at least one check failed on fresh evidence");
  assert.ok(grammar.every((v) => v.mastered === null || v.mastered <= 4), "nothing reported as currently mastered above 4");
  assert.ok(r.recommendations.some((x) => x.reason === "retention_check"), "retention checks were scheduled");
});

test("demonstration step 10: before and after an overdue retention check", async () => {
  const { runDemo } = await import("../../../tools/english/demo.ts");
  const { mkdtempSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const d = (await runDemo({ quiet: true, dir: mkdtempSync(join(tmpdir(), "ret-")) })).retentionDemo;
  assert.equal(d.before.retention.status, "overdue");
  assert.equal(d.before.stage, "review_due");
  assert.equal(d.beforeNext.path, "retention_check");
  assert.equal(d.beforeNext.choice!.focus, d.capability);
  assert.notEqual(d.after.retention.status, "overdue", "the check has been taken");
  assert.equal(d.after.retention.checks.length, d.before.retention.checks.length + 1);
});
