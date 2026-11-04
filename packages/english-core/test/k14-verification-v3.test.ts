/**
 * K14: verification@3, the approved seven-full-day rule (19 October 2026). A band shown at time t is verified only by
 * a session at least 7 × 24 hours later. verification@2 (7 days less the 12-hour due tolerance) stays available for
 * replaying historical claims; due dates, check rules, intervals and estimates are unchanged.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDirect, binaryUpdate, type Composite, createComposite, leafView, retention, VERIFICATION_DEFINITION, verificationDelayMs } from "../src/index.ts";
import { ctx } from "./helpers.ts";

const SVA = "EN.GRM.VERB.sva";
const T0 = Date.UTC(2026, 9, 12, 10, 30);
const at = (d: number) => new Date(T0 + d * 86_400_000).toISOString();
const ITEM = { a: 1.3, c: 0 };
function session(c: Composite, d: number, b: number, right: number) {
  for (let k = 0; k < right; k++)
    applyDirect(c, ctx().index, { capability: SVA, at: new Date(T0 + d * 86_400_000 + k * 60_000).toISOString(), session: `s${d}`, context: k % 2 ? "typed:cloze" : "choice:grammar", decisionId: `s${d}:${k}`, update: (e) => binaryUpdate(e, { ...ITEM, b }, true), misconceptions: [], binary: { b, correct: true, ...ITEM } });
}

test("K14-1 the definition in force is verification@3: seven full days", () => {
  assert.equal(VERIFICATION_DEFINITION, "verification@3");
  assert.equal(verificationDelayMs(7), 7 * 86_400_000);
  assert.equal(verificationDelayMs(7, "verification@2"), 7 * 86_400_000 - 12 * 3_600_000);
});

for (const [days, v3, v2] of [[6.4, false, false], [6.6, false, true], [6.99, false, true], [7.01, true, true]] as const) {
  test(`K14-2 a check ${days} days after the band was shown: verification@3 ${v3 ? "verifies" : "does not"}, verification@2 ${v2 ? "did" : "did not"}`, () => {
    const c = createComposite(ctx().index, `b${days}`);
    session(c, 0, 5, 8);
    session(c, days, 5, 3);
    const now = at(days + 0.01);
    const p = ctx().index.framework.policy;
    const r3 = retention(c.nodes[SVA], p, now);
    const r2 = retention(c.nodes[SVA], p, now, undefined, { definition: "verification@2" });
    assert.equal(r3.verifiedLevel !== null, v3, `verification@3 at ${days} days`);
    assert.equal(r2.verifiedLevel !== null, v2, `verification@2 replay at ${days} days`);
    // the schedule itself (status, due date, checks) is the same under both definitions
    assert.deepEqual({ ...r3, verifiedLevel: null, verifiedLevelAt: null }, { ...r2, verifiedLevel: null, verifiedLevelAt: null });
    // the engine's view uses the definition in force
    assert.equal(leafView(c, ctx().index, SVA, now).verification.verifiedLevel !== null, v3);
  });
}
