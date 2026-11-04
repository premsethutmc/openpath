/**
 * K7: pilot validation execution v1. The pilot assessment policy is locked; the round-1 review package is the right
 * subset, current, and holds no decision; and the content shortfall the policy document reports is what the bank
 * actually gives.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ESSAY_POLICY_DRAFT } from "../src/index.ts";
import { REPO } from "../../../tools/english/load.ts";
import { pilotMatrix } from "../../../tools/english/educator/pilot-matrix.ts";
import { buildInventory } from "../../../tools/english/educator/review.ts";
import { exportRound1, progress, round1, ROUND1_DIR } from "../../../tools/english/educator/round1.ts";
import { parseCsv } from "../../../tools/english/pilot/review.ts";

const DOCS = join(REPO, "docs", "product", "essay-learning", "pilot-validation-v1");

test("K7-1 the pilot assessment policy is locked: essay-policy@2-draft, values unchanged", () => {
  assert.deepEqual(ESSAY_POLICY_DRAFT, {
    version: "essay-policy@2-draft",
    suspectMinSentences: 2,
    maxObservations: 40,
    diagnosticItems: 3,
    diagnosticMinIndependent: 2,
    confirmMinWrong: 2,
    weakenAllRight: true,
    maxTrees: 3,
    prerequisiteDepth: 2,
    guidedItems: 3,
    checkItems: 2,
    retentionDelayDays: 7,
    retentionItems: 2,
    followUpChecks: 3,
    followUpSpacingDays: [1, 3, 7],
    rewriteLimit: 50,
    rewriteMin: 20,
  });
  const doc = readFileSync(join(DOCS, "PILOT_ASSESSMENT_POLICY.md"), "utf8");
  assert.match(doc, /essay-policy@2-draft/);
});

test("K7-2 every pilot competency lacks eligible questions now and has enough for one sequence if round 1 is approved", () => {
  const rows = pilotMatrix();
  for (const r of rows) {
    assert.equal(r.sufficientWithOneLaterCheck.now, false, r.competency);
    assert.equal(r.sufficientWithOneLaterCheck.ifSupplementApproved, true, r.competency);
    assert.equal(r.pilotReady, false);
  }
});

test("K7-3 round 1: 3 competencies, 19 lessons, 41 questions in review order, same records as the package, no decision filled", () => {
  const entries = round1();
  const count = (k: string) => entries.filter((e) => e.record.kind === k).length;
  assert.deepEqual([count("competency"), count("lesson"), count("question")], [3, 19, 41]);
  assert.deepEqual(entries.map((e) => e.review_order), entries.map((_, k) => k + 1));
  const inv = new Map(buildInventory().records.map((r) => [`${r.kind}:${r.id}`, r.fingerprint]));
  for (const e of entries) assert.equal(inv.get(`${e.record.kind}:${e.record.id}`), e.record.fingerprint, e.record.id);
  // per competency: its definition first, then lessons, then questions
  for (const cap of new Set(entries.map((e) => e.pilot_competency))) {
    const kinds = entries.filter((e) => e.pilot_competency === cap).map((e) => e.record.kind);
    assert.equal(kinds[0], "competency");
    assert.equal(kinds.lastIndexOf("lesson") < kinds.indexOf("question"), true, cap);
  }
  assert.equal(entries.filter((e) => e.pilot_priority === "required").length, 36);
  // the committed files are current, and both reviewers' templates are blank
  const fresh = exportRound1(join(REPO, "tools", "english", "out", "k7-round1"));
  for (const [f, text] of fresh) assert.equal(readFileSync(join(ROUND1_DIR, f), "utf8"), text, `${f} is stale: run node tools/english/educator/round1.ts export`);
  for (const slot of ["A", "B"]) {
    const t = parseCsv(readFileSync(join(ROUND1_DIR, `reviewer-${slot}`, "decisions.csv"), "utf8").replace(/^﻿/, ""));
    const d = t[0].indexOf("decision");
    assert.equal(t.length - 1, 63);
    assert.ok(t.slice(1).every((row) => !row[d]?.trim()), `reviewer ${slot}: no decision may be pre-filled`);
  }
});

test("K7-4 progress shows completion without decisions and flags non-independent files", () => {
  const blank = readFileSync(join(ROUND1_DIR, "reviewer-A", "decisions.csv"), "utf8");
  const p = progress([blank, blank]);
  assert.equal(p.complete, false);
  assert.ok(!JSON.stringify(p).includes("approve"), "no decision is shown");
  const rows = parseCsv(blank.replace(/^﻿/, ""));
  const h = rows[0];
  const fill = (who: string) => [h, ...rows.slice(1).map((r) => r.map((c, k) => (h[k] === "reviewer_id" ? who : h[k] === "decision" ? "approve" : c)))].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const same = progress([fill("EdA"), fill("EdA")]);
  assert.equal(same.independent, false);
  assert.match(same.notes.join(" "), /not independent/);
  const ok = progress([fill("EdA"), fill("EdB")]);
  assert.deepEqual([ok.independent, ok.complete], [true, true]);
  assert.ok(!JSON.stringify(ok).includes("approve"));
});
