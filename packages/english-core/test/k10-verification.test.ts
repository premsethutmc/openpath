/**
 * K10: one meaning of "verified" (verification@2) across the engine, the ledger-derived profile and the studio:
 * band L is verified only when L was first shown without help, and a later session at least the delay afterwards has
 * fresh evidence AT L that passes the existing check rule. The statistical estimator, the mastery thresholds and the
 * retention schedule are unchanged (the schedule is compared field by field with the previous implementation).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyDirect,
  binaryUpdate,
  type Composite,
  createComposite,
  DEVELOPER_VERIFICATION,
  engineClaim,
  type EssayContext,
  leafView,
  PILOT_VERIFICATION,
  retention,
  summarise,
  validateContent,
} from "../src/index.ts";
import { loadEssayContext } from "../../../tools/english/essay-load.ts";
import { ctx } from "./helpers.ts";
import { retention as retentionV1 } from "./fixtures/retention-v1.ts";

const SVA = "EN.GRM.VERB.sva";
const T0 = Date.UTC(2026, 9, 12, 10, 30);
const day = (d: number, minute = 0) => new Date(T0 + d * 86_400_000 + minute * 60_000).toISOString();
const ITEM = { a: 1.3, c: 0 };

function session(c: Composite, d: number, b: number, right: number, wrong = 0) {
  let k = 0;
  for (const correct of [...Array(right).fill(true), ...Array(wrong).fill(false)])
    applyDirect(c, ctx().index, { capability: SVA, at: day(d, k), session: `s${d}`, context: k++ % 2 ? "typed:cloze" : "choice:grammar", decisionId: `s${d}:${k}`, update: (e) => binaryUpdate(e, { ...ITEM, b }, correct), misconceptions: [], binary: { b, correct, ...ITEM } });
}
const essay = (verification = DEVELOPER_VERIFICATION): EssayContext => ({ ...loadEssayContext(), verification });

test("K10-1 early verification: a lower band kept on day 8 does not verify the target band first shown on day 8", () => {
  const c = createComposite(ctx().index, "early");
  session(c, 0, 3, 6); // a lower band shown
  session(c, 8, 5.5, 8); // the scheduled check; the target band is first shown here
  const v = leafView(c, ctx().index, SVA, day(8, 30));
  assert.equal(v.verification.status, "verified", "the schedule's check passed (unchanged)");
  assert.ok(v.verification.currentLevel! >= 5, `the target is shown (${v.verification.currentLevel})`);
  assert.ok(v.verification.verifiedLevel !== null && v.verification.verifiedLevel < 5, `only the lower band is verified (${v.verification.verifiedLevel})`);
  const claim = engineClaim(essay(), SVA, v);
  assert.equal(claim.level, "demonstrated", "shown at the target, not verified at it");
  assert.match(claim.note!, /its own delayed check is still to come/);
  assert.match(summarise(v).status, /^(Confirmed|Mastered) at band .* Band .* is shown, not yet confirmed by a later check\./);
  // five days later: too early to verify the target
  session(c, 13, 5.5, 2);
  assert.ok((leafView(c, ctx().index, SVA, day(13, 30)).verification.verifiedLevel ?? 0) < 5);
  // at least seven days after the target was first shown, a check at the target: verified
  session(c, 15.6, 5.5, 2);
  const w = leafView(c, ctx().index, SVA, day(15.6, 30));
  assert.ok(w.verification.verifiedLevel! >= 5);
  assert.equal(engineClaim(essay(), SVA, w).level, "verified");
});

test("K10-2 historical compatibility: the retention schedule replays exactly as before for many random histories", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  for (let run = 0; run < 150; run++) {
    const c = createComposite(ctx().index, `r${run}`);
    let d = 0;
    for (let s = 0; s < 8; s++) {
      d += Math.floor(rnd() * 9);
      const b = 2 + Math.round(rnd() * 10) / 2;
      const n = 1 + Math.floor(rnd() * 5);
      const right = Math.floor(rnd() * (n + 1));
      session(c, d + s * 0.01, b, right, n - right);
    }
    const node = c.nodes[SVA];
    const p = ctx().index.framework.policy;
    const now = day(d + 3);
    const a = retention(node, p, now);
    const b = retentionV1(node, p, now);
    for (const k of ["status", "level", "firstDemonstratedAt", "lastVerifiedAt", "lastFailedAt", "dueAt", "intervalDays", "overdueDays", "checks"] as const) assert.deepEqual(a[k], b[k], `run ${run}: ${k}`);
    // a band is never verified above what the old schedule called retained
    if (a.verifiedLevel !== null) assert.ok(a.status === "none" || a.verifiedLevel <= (b.level ?? Infinity) + 0.5, `run ${run}`);
  }
});

test("K10-3 delayed retention: verified needs answers AT the band; a failed check clears it; a late check at the band restores it", () => {
  const c = createComposite(ctx().index, "ret");
  session(c, 0, 5.5, 8);
  // eight days later, only easy questions: no verification at the target (answers must be at the band)
  session(c, 8, 2.5, 4);
  assert.ok((leafView(c, ctx().index, SVA, day(8, 30)).verification.verifiedLevel ?? 0) < 5);
  session(c, 9, 5.5, 2);
  assert.ok(leafView(c, ctx().index, SVA, day(9, 30)).verification.verifiedLevel! >= 5, "a delayed check at the band verifies it");
  // a failed scheduled check: nothing stays verified
  session(c, 30, 5, 0, 4);
  const f = leafView(c, ctx().index, SVA, day(30, 30));
  assert.equal(f.verification.status, "failed");
  assert.equal(f.verification.verifiedLevel, null);
  assert.equal(engineClaim(essay(), SVA, f).level, "none");
});

test("K10-4 unreviewed questions: under the pilot policy a verified band on unreviewed questions is reported as shown, and says why", () => {
  const c = createComposite(ctx().index, "pilot");
  session(c, 0, 5.5, 8);
  session(c, 9, 5.5, 3);
  const v = leafView(c, ctx().index, SVA, day(9, 30));
  assert.ok(v.verification.verifiedLevel! >= 5);
  // no ledger to show which questions were reviewed: the pilot policy never assumes they were
  const pilot = engineClaim(essay(PILOT_VERIFICATION), SVA, v);
  assert.deepEqual([pilot.level, pilot.verificationWithheld], ["demonstrated", true]);
  assert.match(pilot.note!, /not yet reviewed by an educator/);
  const dev = engineClaim(essay(DEVELOPER_VERIFICATION), SVA, v);
  assert.deepEqual([dev.level, dev.verifiedOn], ["verified", "unreviewed"]);
  // the default policy is the pilot policy
  assert.equal(engineClaim({ ...essay(), verification: undefined }, SVA, v).level, "demonstrated");
});

test("K10-5 H-V2 distinct fresh answers: two answers to one question, or a repeat, never verify; two distinct fresh questions do", () => {
  const at = (c: Composite, d: number, b: number, correct: boolean, k: number, exposure?: "repeat") =>
    applyDirect(c, ctx().index, { capability: SVA, at: day(d, k), session: `s${d}`, context: k % 2 ? "typed:cloze" : "choice:grammar", decisionId: `s${d}:${k}`, update: (e) => binaryUpdate(e, { ...ITEM, b }, correct), misconceptions: [], binary: { b, correct, ...ITEM }, ...(exposure ? { exposure } : {}) });
  const shown = () => {
    const c = createComposite(ctx().index, "hv2");
    session(c, 0, 5.5, 8);
    return c;
  };
  // the delayed session: one fresh answer at the band and the same question again (a repeat)
  const a = shown();
  at(a, 9, 5.5, true, 0);
  at(a, 9, 5.5, true, 1, "repeat");
  assert.ok((leafView(a, ctx().index, SVA, day(9, 30)).verification.verifiedLevel ?? 0) < 5, "one distinct question is not enough");
  // two repeats (questions met before): not fresh evidence
  const b = shown();
  at(b, 9, 5.5, true, 0, "repeat");
  at(b, 9, 5.5, true, 1, "repeat");
  assert.ok((leafView(b, ctx().index, SVA, day(9, 30)).verification.verifiedLevel ?? 0) < 5, "repeats never verify");
  // two distinct fresh questions at the band
  const c = shown();
  at(c, 9, 5.5, true, 0);
  at(c, 9, 5.75, true, 1);
  assert.ok(leafView(c, ctx().index, SVA, day(9, 30)).verification.verifiedLevel! >= 5);
  // six days after the target was first shown: too early, whatever the answers
  const d = shown();
  at(d, 6, 5.5, true, 0);
  at(d, 6, 5.75, true, 1);
  assert.ok((leafView(d, ctx().index, SVA, day(6, 30)).verification.verifiedLevel ?? 0) < 5, "the delay is at least seven days (less the half-day tolerance)");
});

test("K10-6 H-V3 content rule: a validated version must say when it was released, and nothing else may", () => {
  const base = { kind: "code" as const, version: 1, target: SVA, b: 5, a: 1.2, format: "choice:grammar", prompt: "She ___ to school.", options: ["go", "goes"], answer: 1 };
  const problems = validateContent({ items: [{ ...base, id: "t.1", evidence_status: "validated" }, { ...base, id: "t.2", released_at: "2026-10-01T00:00:00Z" }, { ...base, id: "t.3", evidence_status: "validated", released_at: "2026-10-01T00:00:00Z" }], passages: [], goals: [], misspellings: {} }, ctx().index);
  assert.ok(problems.some((p) => p.includes("validated item t.1 needs released_at")));
  assert.ok(problems.some((p) => p.includes("item t.2 has released_at but is not validated")));
  assert.ok(!problems.some((p) => p.includes("t.3")));
});
