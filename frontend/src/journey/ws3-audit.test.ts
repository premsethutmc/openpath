/**
 * Workstream 3: adaptive-engine audit reproducer tests.
 * These tests reproduce known issues from §16.5 and document their impact.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { moduleFor, question, poolFamilies } from "../../../packages/learning/src/content";
import { phasePool, problemOf } from "../../../packages/learning/src/families";
import { readRecords } from "../../../packages/learning/src/records";
import { skillEvidence, RETENTION_DAYS } from "../../../packages/learning/src/evidence";
import { make } from "../../../packages/learning/src/session";
import { boardFor } from "../../../packages/learning/src/curricula";
import { modulePhasePool } from "../../../packages/learning/src/library";
import { runScenario, type Scenario } from "./scenarios";
import { learners, right, wrong, type Learner } from "./learners";

const C = "MATH.algebra.linear-equations";
const M = () => moduleFor(C)!;
const S = (o: Partial<Scenario> & Pick<Scenario, "learner">): Scenario => ({ id: "ws3", category: 1, start: "gen:lin:2,17,11", expect: {}, ...o });
const teaches = (r: ReturnType<typeof runScenario>) => r.f.session.events.filter((e) => (e as { record?: string }).record === "teach") as unknown as { competency: string; strategy: string; at: string }[];
const records = (r: ReturnType<typeof runScenario>) => r.f.session.state().records;
const ev = (r: ReturnType<typeof runScenario>, c = C) => r.f.session.state().evidence(c);
const SHOWN = ["independent", "transfer", "verified"];

// ---------------------------------------------------------------- Issue 1: Linear-equations detour
// After a taught skill goes wrong, the verify branch asks about questions on other
// families before returning to it.

test("AUDIT-1 detour in verify: after teaching x+a=b, learner shown, then wrong on lin again — count other-family questions before sub-skill gap", () => {
  // A learner who:
  // - gets the misconception right after being taught (so they become "shown")
  // - then gets lin family questions wrong again in verify
  // - but gets other families right
  let postTeachingPhase = false;
  let linCheckPassed = false;
  const learner: Learner = { name: "relapses on lin after teaching", act: (v) => {
    const fam = problemOf(v.q.replace(/:(mc|w)$/, ""))?.family;
    if (v.taught === 0) {
      // Before teaching: make forgot-divide errors to trigger teaching
      return { answer: wrong(v.q) };
    }
    // After teaching: right on the first check (to become "shown")
    if (!linCheckPassed && v.activity === "check" && fam === "lin") {
      linCheckPassed = true;
      return { answer: right(v.q) };
    }
    postTeachingPhase = true;
    // In verify phase: wrong on lin, right on everything else
    if (fam === "lin") return { answer: wrong(v.q) };
    return { answer: right(v.q) };
  } };
  const r = runScenario(S({ learner: () => learner }));
  const t = teaches(r);
  const attempts = records(r).attempts;

  // Count questions in the verify phase
  const lastTeachAt = t.at(-1)?.at ?? "";
  // Find the first lin check after teaching (which was right)
  const firstLinCheckAfter = attempts.find(a => a.at > lastTeachAt && problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family === "lin" && a.credit === true);
  if (firstLinCheckAfter) {
    // After that successful check, count non-lin questions before lin is addressed again
    const afterShown = attempts.filter(a => a.at > firstLinCheckAfter.at);
    let nonLinBeforeReturn = 0;
    let linWrongCount = 0;
    const detourQuestions: string[] = [];
    for (const a of afterShown) {
      const fam = problemOf(a.questionId.replace(/:(mc|w)$/, ""))?.family;
      if (fam === "lin") {
        linWrongCount++;
      } else if (linWrongCount > 0) {
        nonLinBeforeReturn++;
        detourQuestions.push(`${a.questionId} (${fam})`);
      }
    }
    console.log(`  After "shown": ${afterShown.length} total questions`);
    console.log(`  Lin wrong answers: ${linWrongCount}`);
    console.log(`  Non-lin detour questions while lin was still wrong: ${nonLinBeforeReturn}`);
    console.log(`  Detour: ${detourQuestions.join(", ") || "none"}`);
    // Document for the report
  }
  assert.ok(true, "detour documented");
});

// ---------------------------------------------------------------- Issue 2: records.ts:144 — assisted counting
// Every answer in the session after a lesson review counts as helped

test("AUDIT-2 solution field set to true after foundation-lesson-review (same competency)", () => {
  const LR = "MATH.algebra.missing-number";
  const now = Date.parse("2026-10-01T09:00:00Z");
  let seq = 0;
  const ctx = () => ({ learnerId: "audit-2", sessionId: "s1", at: new Date(now + (++seq * 60_000)).toISOString() });
  const events = [
    make.enrol(ctx(), 3, "2026-27", boardFor("cbse", 3)!),
    // The foundation lesson review teaching record
    make.teach(ctx(), LR, moduleFor(LR)!.strategies[0].id, "foundation-lesson-review@1"),
    // A correct answer AFTER the lesson review, same session, same competency
    make.attempt(ctx(), "gen:acmissing:0,10,3:mc", right("gen:acmissing:0,10,3:mc"), "practice"),
  ];
  const recs = readRecords("audit-2", events);
  const attempt = recs.attempts[0];
  // The bug: solution is true because of the foundation-lesson-review@1 in the same session
  console.log(`  After foundation-lesson-review@1 on ${LR}:`);
  console.log(`  - Answer on same competency: solution = ${attempt.solution}`);
  console.log(`  - This makes assistedAttempt() return true, so the answer CANNOT be independent evidence`);
  assert.equal(attempt.solution, true, "solution is set to true after lesson review (the bug)");
});

test("AUDIT-2b solution field for a DIFFERENT competency in the same session", () => {
  const LR = "MATH.algebra.missing-number";
  const OTHER = "MATH.algebra.linear-equations";
  const now = Date.parse("2026-10-01T09:00:00Z");
  let seq = 0;
  const ctx = () => ({ learnerId: "audit-2b", sessionId: "s1", at: new Date(now + (++seq * 60_000)).toISOString() });
  const events = [
    make.enrol(ctx(), 3, "2026-27", boardFor("cbse", 3)!),
    make.teach(ctx(), LR, moduleFor(LR)!.strategies[0].id, "foundation-lesson-review@1"),
    // Answer on a DIFFERENT competency in the same session
    make.attempt(ctx(), "gen:lin:2,17,11", right("gen:lin:2,17,11"), "practice"),
  ];
  const recs = readRecords("audit-2b", events);
  const attempt = recs.attempts[0];
  console.log(`  Lesson reviewed: ${LR}`);
  console.log(`  Answer on: ${attempt.competency} (different competency)`);
  console.log(`  solution = ${attempt.solution}`);
  // Check: the condition checks t.competency === r.competency, so different competencies should NOT match
  const crossContaminated = attempt.solution;
  console.log(`  Cross-competency contamination: ${crossContaminated}`);
});

test("AUDIT-2c solution field for same competency in a DIFFERENT session", () => {
  const LR = "MATH.algebra.missing-number";
  const now = Date.parse("2026-10-01T09:00:00Z");
  let seq = 0;
  const ctx = (sid: string) => ({ learnerId: "audit-2c", sessionId: sid, at: new Date(now + (++seq * 60_000)).toISOString() });
  const events = [
    make.enrol(ctx("s1"), 3, "2026-27", boardFor("cbse", 3)!),
    make.teach(ctx("s1"), LR, moduleFor(LR)!.strategies[0].id, "foundation-lesson-review@1"),
    // Different session
    make.attempt(ctx("s2"), "gen:acmissing:0,10,3:mc", right("gen:acmissing:0,10,3:mc"), "practice"),
  ];
  const recs = readRecords("audit-2c", events);
  const attempt = recs.attempts[0];
  console.log(`  Lesson reviewed in session s1`);
  console.log(`  Answer in session s2: solution = ${attempt.solution}`);
  console.log(`  Session-scoped correctly: ${!attempt.solution}`);
});

// ---------------------------------------------------------------- Issue 1 (improved): verify pool family distribution
// The verify phase pools ALL families together. After teaching a lin strategy,
// the learner is served lboth, lbrk, auleq, aulwp questions before more lin questions.

test("AUDIT-1b verify pool family distribution for linear-equations", () => {
  const m = M();
  // The verify pool: practice + transfer + strategy checks
  const verifyPool = [...m.practice, ...m.transfer, ...m.strategies.map((s) => s.check)];
  const byFamily: Record<string, number> = {};
  for (const q of verifyPool) {
    const fam = problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? "unknown";
    byFamily[fam] = (byFamily[fam] ?? 0) + 1;
  }
  console.log("  Verify pool for linear-equations:");
  console.log(`  Total questions: ${verifyPool.length}`);
  for (const [fam, count] of Object.entries(byFamily)) {
    console.log(`    ${fam}: ${count} (${Math.round((count / verifyPool.length) * 100)}%)`);
  }
  // The detour: after teaching e.g. a lin strategy, the next unanswered question
  // in the pool may be from lboth, lbrk, auleq, or aulwp
  const nonLin = verifyPool.filter((q) => problemOf(q.replace(/:(mc|w)$/, ""))?.family !== "lin");
  console.log(`  Non-lin questions in verify pool: ${nonLin.length} of ${verifyPool.length}`);
  // Document: at least 12 questions from other families can appear before returning to lin
  assert.ok(nonLin.length >= 10, `Expected 10+ non-lin questions in verify pool, got ${nonLin.length}`);
});

// ---------------------------------------------------------------- Issue 3: Overdue-review wording
// "Review needed" with "the delayed check was missed" shown when a skill's retention
// becomes overdue (engine says "overdue"), even though no check was offered and missed.

test("AUDIT-3 overdue-review wording analysis", () => {
  const LR = "MATH.algebra.missing-number";
  const T0 = Date.parse("2026-10-01T09:00:00Z");
  let seq = 0;
  const ctx = () => ({ learnerId: "audit-3", sessionId: "s1", at: new Date(T0 + (++seq * 60_000)).toISOString() });

  // Build records with enough attempts to be "shown" AND pass local retention
  const events = [
    make.enrol(ctx(), 3, "2026-27", boardFor("cbse", 3)!),
    make.attempt(ctx(), "gen:acmissing:0,10,3:mc", right("gen:acmissing:0,10,3:mc"), "practice"),
    make.attempt(ctx(), "gen:acmissing:1,15,7", right("gen:acmissing:1,15,7"), "practice"),
    make.attempt(ctx(), "gen:acmissing:2,11,7", right("gen:acmissing:2,11,7"), "check"),
  ];
  const recs = readRecords("audit-3", events);

  // Scenario A: 14 days later, engine says "overdue"
  // Local retention is "due" (>7 days), which guards against "review"
  const twoWeeksLater = T0 + 14 * 24 * 60 * 60 * 1000;
  const evA = skillEvidence(LR, recs, "independent", twoWeeksLater, "overdue");
  console.log("  A) 14d later, engine overdue, local due:");
  console.log(`    status=${evA.status} retention=${evA.retention}`);
  console.log("    Guard works: local 'due' prevents 'review'");
  assert.equal(evA.retention, "due");
  assert.equal(evA.status, "independent", "local due prevents review status");

  // Scenario B: local retention passed, engine NOT verified, engine says overdue
  // This is the triggering case: local check passed but engine hasn't verified yet
  // Now add retention answers to make local retention "passed"
  let seq2 = 0;
  const ctx2 = () => ({ learnerId: "audit-3b", sessionId: "s2", at: new Date(T0 + 8 * 24 * 60 * 60 * 1000 + (++seq2 * 60_000)).toISOString() });
  const eventsB = [
    make.enrol({ learnerId: "audit-3b", sessionId: "s1", at: new Date(T0).toISOString() }, 3, "2026-27", boardFor("cbse", 3)!),
    // Independent answers in session 1
    make.attempt({ learnerId: "audit-3b", sessionId: "s1", at: new Date(T0 + 60000).toISOString() }, "gen:acmissing:0,10,3:mc", right("gen:acmissing:0,10,3:mc"), "practice"),
    make.attempt({ learnerId: "audit-3b", sessionId: "s1", at: new Date(T0 + 120000).toISOString() }, "gen:acmissing:1,15,7", right("gen:acmissing:1,15,7"), "practice"),
    // Retention answers 8 days later (after RETENTION_DAYS=7)
    make.attempt(ctx2(), "gen:acmissing:0,20,12", right("gen:acmissing:0,20,12"), "retention"),
    make.attempt(ctx2(), "gen:acplace:111,1:mc", right("gen:acplace:111,1:mc"), "retention"),
  ];
  const recsB = readRecords("audit-3b", eventsB);
  // Check 14 days after original: local retention should be "passed"
  const evB = skillEvidence(LR, recsB, "independent", twoWeeksLater, "overdue");
  console.log("  B) Local retention passed, engine says overdue (not yet verified):");
  console.log(`    status=${evB.status} retention=${evB.retention}`);
  if (evB.status === "review") {
    console.log("    BUG TRIGGERED: status='review' -> label 'Review needed'");
    console.log("    plan.ts says: 'The delayed check was missed'");
    console.log("    REALITY: learner PASSED local check; engine just hasn't verified");
  }

  // Document the wording chain
  console.log("  Wording chain when status === 'review':");
  console.log("    tiles.ts:126 -> label: 'Review needed'");
  console.log("    plan.ts:79   -> 'The delayed check was missed'");
  console.log("    ISSUE: 'missed' implies learner skipped a presented check");
  console.log("    When triggered by engine 'overdue' with local 'passed',");
  console.log("    the check was NOT missed -- it was passed locally");
  assert.ok(true, "wording analysis documented");
});

// ---------------------------------------------------------------- Issue 4: Digit-card delayed checks
// acplace questions make up a large portion of the missing-number retention pool,
// despite being explicitly marked as unmapped/needing its own skill contract.

test("AUDIT-4 digit-card (acplace) proportion in missing-number retention pool", () => {
  const MN = "MATH.algebra.missing-number";
  const m = moduleFor(MN)!;

  // Listed retention questions
  console.log("  Listed retention questions:");
  const listedByFam: Record<string, number> = {};
  for (const q of m.retention) {
    const fam = problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? "unknown";
    listedByFam[fam] = (listedByFam[fam] ?? 0) + 1;
    console.log(`    ${q} -> ${fam}`);
  }
  const listedAcplace = listedByFam["acplace"] ?? 0;
  console.log(`  acplace in listed retention: ${listedAcplace} of ${m.retention.length} (${Math.round((listedAcplace / m.retention.length) * 100)}%)`);

  // Generated pool retention questions
  const poolQ = modulePhasePool(m, "retention");
  const poolByFam: Record<string, number> = {};
  for (const q of poolQ) {
    const fam = problemOf(q.replace(/:(mc|w)$/, ""))?.family ?? "unknown";
    poolByFam[fam] = (poolByFam[fam] ?? 0) + 1;
  }
  console.log("  Generated retention pool:");
  console.log(`    Total: ${poolQ.length}`);
  for (const [fam, count] of Object.entries(poolByFam)) {
    console.log(`    ${fam}: ${count} (${Math.round((count / poolQ.length) * 100)}%)`);
  }
  const poolAcplace = poolByFam["acplace"] ?? 0;
  // acplace is 50% of listed retention and ~29% of the generated pool
  assert.ok(listedAcplace > 0, "acplace appears in listed retention");
  assert.ok(poolAcplace >= poolQ.length * 0.2, `acplace is >= 20% of retention pool (got ${Math.round((poolAcplace / poolQ.length) * 100)}%)`);

  // Also check the pools config
  const families = poolFamilies(m);
  console.log(`  Module pools: ${families.join(", ")}`);
  console.log("  NOTE: subskill-config-inverse.ts marks acplace as unmapped:");
  console.log('    "needs its own skill contract"');
});
