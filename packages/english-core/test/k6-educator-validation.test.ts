/**
 * K6: educator validation v1. The consolidated review package reconciles with the repository, the decision workflow
 * resolves only agreed or adjudicated rows and never promotes content, the annotation scorer measures what it says,
 * and no competency is called pilot-ready.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadBenchmark } from "../../../tools/english/essay-benchmark.ts";
import { REPO } from "../../../tools/english/load.ts";
import { referenceMarks, readMarks, scoreAgreement, scoreVsReference } from "../../../tools/english/educator/annotation-score.ts";
import { validationFiles, VALIDATION_DIR } from "../../../tools/english/educator/essay-validation.ts";
import { pilotMatrix } from "../../../tools/english/educator/pilot-matrix.ts";
import { buildInventory, DECISION_COLUMNS, exportDecisions, exportPackage, PACKAGE_DIR, type QuestionRecord, readDecisions, reconcile } from "../../../tools/english/educator/review.ts";
import { toCsv } from "../../../tools/english/pilot/review.ts";

const inv = buildInventory();
const questions = inv.records.filter((r): r is QuestionRecord => r.kind === "question");

test("K6-1 the package reconciles with the repository: 96 proposed + 189 existing (181 + 8 on plurals, profile @2), deduplicated, every field present", () => {
  assert.equal(inv.counts["proposed-supplement"], 96);
  assert.equal(inv.counts["existing-for-review"], 189);
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length, "no duplicate question");
  assert.ok(inv.discrepancies.every((d) => /pilot-additional/.test(d)), inv.discrepancies.join("; "));
  for (const q of questions) {
    for (const k of ["question", "expected_answer", "explanation", "competency", "difficulty_justification", "intended_role", "evidence_status", "fingerprint"] as const) assert.ok(String(q[k]).trim(), `${q.id}: ${k}`);
    assert.equal(q.response_type, q.format.startsWith("typed") ? "constructed" : "recognition", q.id);
    if (q.set === "proposed-supplement") assert.match(q.evidence_status, /^provisional/);
  }
  assert.equal(inv.counts.lessons, 19);
  assert.equal(inv.counts.competencies, 20);
});

test("K6-2 the committed package and essay-validation files are current", () => {
  const fresh = exportPackage(join(REPO, "tools", "english", "out", "k6-package"));
  for (const [f, text] of fresh) assert.equal(readFileSync(join(PACKAGE_DIR, f), "utf8"), text, `${f} is stale: run node tools/english/educator/review.ts export`);
  for (const [f, text] of validationFiles()) assert.equal(readFileSync(join(VALIDATION_DIR, f), "utf8"), text, `${f} is stale: run node tools/english/educator/essay-validation.ts`);
});

const header = [...DECISION_COLUMNS];
const row = (q: { kind: string; id: string; version: number; fingerprint: string }, reviewer: string, decision: string, reason = "", correction = "", fp = q.fingerprint) => [q.kind, q.id, String(q.version), fp, reviewer, decision, reason, correction, "", "2026-10-20"];
const hashDir = (dir: string) => {
  const h = createHash("sha256");
  for (const f of readdirSync(dir, { recursive: true }).map(String).sort()) {
    try {
      h.update(f).update(readFileSync(join(dir, f)));
    } catch {
      // a directory
    }
  }
  return h.digest("hex");
};

test("K6-3 decisions: agreed rows resolve, disagreements and 'unable' go to adjudication, stale rows are refused, nothing is promoted", () => {
  const [q1, q2, q3, q4] = questions;
  const before = hashDir(join(REPO, "content", "english"));
  const A = toCsv(header, [row(q1, "EdA", "approve"), row(q2, "EdA", "reject", "two options are correct"), row(q3, "EdA", "unable_to_determine", "unsure about Indian usage"), row(q4, "EdA", "approve", "", "", "0000000000000000")]);
  const B = toCsv(header, [row(q1, "EdB", "approve"), row(q2, "EdB", "approve"), row(q3, "EdB", "approve"), row(q4, "EdB", "revise", "too easy")]);
  const a = readDecisions(A, inv.records);
  const b = readDecisions(B, inv.records);
  assert.match(a.problems.join(" "), /stale/);
  assert.match(b.problems.join(" "), /revise decision needs a suggested correction/);
  const rows = [...a.rows, ...b.rows];
  const rec = reconcile(rows);
  const state = (id: string) => rec.find((r) => r.id === id)!.state;
  assert.equal(state(q1.id), "agreed");
  assert.equal(state(q2.id), "disagreement");
  assert.equal(state(q3.id), "undetermined");
  // without adjudication, only the agreed row is resolved; "unable" never resolves
  const plain = exportDecisions(rows, null, inv.records).out;
  assert.deepEqual(plain.resolved.map((r) => [r.id, r.decision, r.basis]), [[q1.id, "approve", "agreed"]]);
  assert.deepEqual(plain.unresolved.map((r) => r.id).sort(), [q2.id, q3.id].sort());
  assert.match(plain.promotion, /^none/);
  // an adjudicator resolves the disagreement; "unable_to_determine" is not a final decision
  const adj = toCsv(["record_kind", "record_id", "fingerprint", "state", "reviewer_decisions", "adjudicator_id", "final_decision", "reason", "suggested_correction", "date"], [
    [q2.kind, q2.id, q2.fingerprint, "disagreement", "", "EdC", "reject", "B is also correct", "", "2026-10-21"],
    [q3.kind, q3.id, q3.fingerprint, "undetermined", "", "EdC", "unable_to_determine", "", "", "2026-10-21"],
  ]);
  const done = exportDecisions(rows, adj, inv.records);
  assert.match(done.problems.join(" "), /final_decision must be approve, revise or reject/);
  assert.deepEqual(done.out.resolved.find((r) => r.id === q2.id)?.basis, "adjudicated");
  assert.ok(!done.out.resolved.some((r) => r.id === q3.id));
  assert.ok(done.out.agreement[0].common >= 3);
  assert.equal(hashDir(join(REPO, "content", "english")), before, "no content file changed");
});

test("K6-4 the annotation scorer: the reference against itself is perfect; false positives and disagreement are measured", () => {
  const b = loadBenchmark();
  const ref = referenceMarks(b, "R");
  const self = scoreVsReference(b, ref)[0];
  assert.deepEqual([self.precision, self.recall, self.falsePositivesOnValidText, self.competency.kappa], [1, 1, 0, 1]);
  const csv = toCsv(["annotator_id", "essay_id", "quote", "competency_id", "kind", "correction", "note"], [
    ["T1", "b01-agreement", "She say", "EN.GRM.VERB.sva", "error", "She says", ""],
    ["T1", "b09-clean-alternatives", "Everyone has their own style", "EN.GRM.VERB.sva", "error", "", "should be his"],
    ["T1", "b01-agreement", "not in the essay", "EN.GRM.VERB.sva", "error", "", ""],
  ]);
  const { marks, problems } = readMarks(csv, b);
  assert.equal(problems.length, 1, "an invented quote is refused");
  const t1 = scoreVsReference(b, marks)[0];
  assert.equal(t1.precision, 0.5);
  assert.equal(t1.falsePositivesOnValidText, 1);
  assert.ok(t1.recall! < 0.1);
  const pair = scoreAgreement(b, [...ref, ...marks])[0];
  assert.ok(pair.errorF1 !== null && pair.errorF1 < 0.2);
});

test("K6-5 no competency is called pilot-ready; the matrix says exactly what blocks each and what needs approval", () => {
  const rows = pilotMatrix();
  assert.deepEqual(rows.map((r) => r.competency).sort(), ["EN.GRM.NOUN.articles", "EN.GRM.VERB.present_past_simple", "EN.GRM.VERB.sva"]);
  const ids = new Set(questions.map((q) => q.id));
  for (const r of rows) {
    assert.equal(r.pilotReady, false);
    assert.equal(r.stages.length, 8);
    assert.equal(r.stages[0].now.count, 0, "no validated essay evaluator");
    assert.equal(r.contentSufficientNow, false);
    assert.equal(r.sufficientWithOneLaterCheck.ifSupplementApproved, true);
    assert.ok(r.requiresEducatorApproval.lessons.length > 0);
    for (const q of r.requiresEducatorApproval.questions) assert.ok(ids.has(q), `${q} is in the review package`);
  }
});
