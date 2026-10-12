/**
 * After a failed retention check, nothing downstream may treat historical mastery as currently
 * verified proficiency (E1 merge approval). The numerical estimate and the verification status stay
 * explicitly distinguishable; the update mathematics are unchanged.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Composite, type Goal, applyDirect, binaryUpdate, createComposite, leafView, recommend, summarise } from "../src/index.ts";
import { ctx } from "./helpers.ts";

const SVA = "EN.GRM.VERB.sva";
const day = (d: number, minute = 0) => new Date(Date.UTC(2026, 9, 12, 10, 30) + d * 86_400_000 + minute * 60_000).toISOString();
const ITEM = { a: 1.3, c: 0 };

function session(c: Composite, d: number, b: number, right: number, wrong: number) {
  let k = 0;
  for (const correct of [...Array(right).fill(true), ...Array(wrong).fill(false)])
    applyDirect(c, ctx().index, { capability: SVA, at: day(d, k), session: `s${d}`, context: k++ % 2 ? "typed:cloze" : "choice:grammar", decisionId: `s${d}:${k}`, update: (e) => binaryUpdate(e, { ...ITEM, b }, correct), misconceptions: [], binary: { b, correct, ...ITEM } });
}

/** Mastered and verified, then a failed check: the long history keeps the estimate high. */
function forgot(): Composite {
  const c = createComposite(ctx().index, "x");
  session(c, 0, 5, 12, 0);
  session(c, 7, 5, 12, 0); // check passes: verified
  session(c, 21, 4.5, 0, 4); // next check fails on fresh evidence
  return c;
}

test("verification is explicit: verified, then failed, with history kept apart", () => {
  const c = forgot();
  // before the failed check
  const ok = leafView(c, ctx().index, SVA, day(8));
  assert.equal(ok.verification.status, "verified");
  // after it
  const v = leafView(c, ctx().index, SVA, day(22));
  assert.equal(v.verification.status, "failed");
  assert.equal(v.verification.currentLevel, null, "nothing is currently verified");
  assert.ok(v.verification.historicalLevel !== null && v.verification.historicalLevel >= 5, "history is kept");
  assert.equal(v.mastered, null);
  assert.equal(v.stage, "needs_review");
  assert.ok(v.masteredBefore !== null);
  // the estimate is still reported, unchanged by any of this, and is higher than what is verified
  assert.ok(v.mean > 4.5, `estimate still reflects older evidence (${v.mean.toFixed(2)})`);
});

test("the learner-facing summary never presents history as a current result after a failed check", () => {
  const s = summarise(leafView(forgot(), ctx().index, SVA, day(22)));
  assert.equal(s.currentlyVerified, false);
  assert.match(s.status, /^Needs review: the check on 2026-11-02 did not confirm your earlier level, so it is not currently confirmed/);
  assert.doesNotMatch(s.status, /mastered|confirmed at|confirmed on/i);
  assert.match(s.estimate, /^Estimate \d\.\d ± \d\.\d: OpenPath's best guess from all your answers, old and new\.$/);
  assert.match(s.history!, /^Earlier you showed band \d(\.\d)?\. That is history, not a current result\.$/);
  // while verified, it may say so
  const before = summarise(leafView(forgot(), ctx().index, SVA, day(8)));
  assert.equal(before.currentlyVerified, true);
  assert.match(before.status, /^(Mastered at band|Confirmed at band) .*confirmed on 2026-10-19|^(Mastered|Confirmed)/);
  // overdue is not verified either
  const c = createComposite(ctx().index, "y");
  session(c, 0, 5, 12, 0);
  const overdue = summarise(leafView(c, ctx().index, SVA, day(30)));
  assert.equal(overdue.currentlyVerified, false);
  assert.match(overdue.status, /^Check due: not currently confirmed/);
});

test("learning selection works from what is verified after a failed check, not from the lagging estimate", () => {
  const c = forgot();
  const v = leafView(c, ctx().index, SVA, day(22));
  const goal: Goal = { id: "g", name: "Agreement", weights: { [SVA]: 1 }, targets: { [SVA]: 7 } };
  const rec = recommend({ index: ctx().index, content: ctx().content, composite: c, goal, now: day(22), seen: new Set<string>(), recent: [], writingThisSession: 0, writingAvailable: false, mode: "learning" });
  assert.equal(rec.choice!.focus, SVA);
  assert.equal(rec.choice!.parts.retention, 1, "a failed check counts as a retention need");
  assert.match(rec.explanation, /needs review: its retention check on 2026-11-02 failed, so it is not currently verified, and practice is pitched at band [\d.]+ \(what that check supports\), not at the estimate [\d.]+ ± [\d.]+/);
  // the item is easier than one pitched at the estimate would be
  const item = ctx().content.items.get(rec.choice!.item)!;
  assert.ok(item.kind === "code" && item.b < v.mean, `item difficulty ${item.kind === "code" ? item.b : "?"} is below the estimate ${v.mean.toFixed(2)}`);
  // the composite itself is untouched by selection
  assert.deepEqual(leafView(c, ctx().index, SVA, day(22)), v);
});
