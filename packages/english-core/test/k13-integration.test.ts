/**
 * K13: the integration of verification@2 (PR #51) with the planner corrections (PR #52). The engine's retention
 * schedule runs from the first demonstration at ANY band; the delayed check that can verify the TARGET runs from when
 * the target was first shown. The planner treats an overdue engine check as a retention question (policy @3) only once
 * the target's own delay has passed; before then it waits: nothing is asked or taught, and no questions are spent.
 * Since the integration with policy @4 this is read from ONE clock: retention() anchored at the target (essayView).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDirect, binaryUpdate, type Composite, createComposite, engineClaim, essayView, leafView, retentionDue, retentionTiming } from "../src/index.ts";
import { loadEssayContext } from "../../../tools/english/essay-load.ts";
import { ctx } from "./helpers.ts";

const SVA = "EN.GRM.VERB.sva";
const T0 = Date.UTC(2026, 9, 12, 10, 30);
const day = (d: number, minute = 0) => new Date(T0 + d * 86_400_000 + minute * 60_000).toISOString();
function session(c: Composite, d: number, b: number, right: number) {
  for (let k = 0; k < right; k++)
    applyDirect(c, ctx().index, { capability: SVA, at: day(d, k), session: `s${d}`, context: k % 2 ? "typed:cloze" : "choice:grammar", decisionId: `s${d}:${k}`, update: (e) => binaryUpdate(e, { a: 1.3, c: 0, b }, true), misconceptions: [], binary: { b, correct: true, a: 1.3, c: 0 } });
}

test("K13-1 the target's delay, not the engine's earlier clock, decides when a delayed check is due (one clock)", () => {
  const ectx = loadEssayContext();
  assert.equal(ectx.profile.byCapability.get(SVA)?.expectedBand, 5);
  const c = createComposite(ctx().index, "clock");
  session(c, 0, 3, 6); // a lower band first: the engine's own schedule starts here (check due day 7)
  session(c, 5, 5.5, 8); // the target first shown on day 5
  const v8 = leafView(c, ctx().index, SVA, day(8));
  assert.equal(v8.verification.status, "overdue", "the engine's own (main-app) schedule is overdue on day 8");
  // PR #52 alone treated this as due; a check on day 8 could not verify the target (shown only 3 days earlier)
  assert.equal(retentionDue(ectx, SVA, v8), true, "a plain view: the engine's own schedule, the previous reading");
  // the essay layer reads the ONE clock anchored at the target (essayView): not due, so nothing is asked or taught
  const a8 = essayView(ectx, c, SVA, day(8));
  assert.equal(a8.atTarget!.retention.firstDemonstratedAt?.slice(0, 10), day(5).slice(0, 10));
  assert.equal(retentionTiming(ectx, SVA, a8), null);
  assert.equal(retentionDue(ectx, SVA, a8), false);
  assert.equal(engineClaim(ectx, SVA, a8).level, "demonstrated", "and the claim is not withdrawn by the earlier clock");
  const a12 = essayView(ectx, c, SVA, day(12, 10));
  assert.equal(retentionTiming(ectx, SVA, a12), "due", "seven days after the target was first shown");
  // never shown at the target: not a retention question at all
  const d = createComposite(ctx().index, "low");
  session(d, 0, 3, 6);
  assert.equal(retentionTiming(ectx, SVA, essayView(ectx, d, SVA, day(8))), null);
});
