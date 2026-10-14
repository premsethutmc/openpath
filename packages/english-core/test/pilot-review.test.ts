/**
 * The educator review workflow for the pilot content (tools/english/pilot/review.ts): export, import of decisions,
 * and the readiness report. Nothing here approves content: these test that decisions are recorded faithfully.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { REPORT, REPO, ROW_COLUMNS, currentDecisions, exportCsv, importReviews, loadPilot, parseCsv, report, reviewRows, type ReviewRecord } from "../../../tools/english/pilot/review.ts";

const p = loadPilot();
const rows = reviewRows(p);
const csv = exportCsv(rows);

/** Fill decisions into an exported CSV: { "kind|id": [decision, issues, comment, reviewer, date] }. */
function fill(text: string, by: Record<string, string[]>): string {
  const t = parseCsv(text);
  const head = t[0];
  const k = head.indexOf("kind");
  const id = head.indexOf("id");
  const dec = head.indexOf("decision");
  for (const r of t.slice(1)) {
    const v = by[`${r[k]}|${r[id]}`];
    if (v) v.forEach((x, n) => (r[dec + n] = x));
  }
  return t.map((r) => r.map((x) => (/[",\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(",")).join("\n");
}

test("PR-1 the export has one row per question, passage, lesson and prerequisite, and survives a CSV round trip exactly", () => {
  const kinds = (k: string) => rows.filter((r) => r.kind === k).length;
  assert.equal(kinds("question"), p.items.length);
  assert.equal(kinds("lesson"), p.lessons.length);
  assert.equal(kinds("prerequisite"), p.prerequisites.length);
  assert.equal(kinds("passage"), new Set(p.items.map((i) => i.passage).filter(Boolean)).size);
  const back = parseCsv(csv);
  assert.equal(back.length, rows.length + 1);
  back.slice(1).forEach((r, n) => ROW_COLUMNS.forEach((c, k) => assert.equal(r[k], rows[n][c], `${rows[n].id} ${c}`)));
  // every question shows its key and what it is reserved for
  for (const r of rows.filter((x) => x.kind === "question")) assert.ok(r.key && r.use && r.difficulty && r.fingerprint.length === 16, r.id);
});

test("PR-2 import records a decision with reviewer, date, content version and fingerprint; it never changes content", () => {
  const q = rows.find((r) => r.id === "plt.sva.05")!;
  const l = rows.find((r) => r.kind === "lesson")!;
  const filled = fill(csv, { [`question|${q.id}`]: ["approve", "", "", "A. Teacher", "2026-10-20"], [`lesson|${l.id}`]: ["revise", "ambiguous", "Example 2 is unclear", "A. Teacher", "2026-10-20"] });
  const before = JSON.stringify(loadPilot());
  const { records, problems } = importReviews(filled, rows, p.manifest.version);
  assert.deepEqual(problems, []);
  assert.deepEqual(
    records.map((r) => [r.kind, r.id, r.decision, r.reviewer, r.date, r.content_version, r.fingerprint]),
    [
      ["question", q.id, "approve", "A. Teacher", "2026-10-20", p.manifest.version, q.fingerprint],
      ["lesson", l.id, "revise", "A. Teacher", "2026-10-20", p.manifest.version, l.fingerprint],
    ],
  );
  assert.deepEqual(records[1].issues, ["ambiguous"]);
  assert.equal(JSON.stringify(loadPilot()), before, "importing changes no content");
});

test("PR-3 import refuses decisions without a reviewer or a valid date, unknown decisions, unexplained rejections, and stale rows", () => {
  const [a, b, c2, d] = rows.filter((r) => r.kind === "question");
  const bad = fill(csv, {
    [`question|${a.id}`]: ["approve", "", "", "", "2026-10-20"],
    [`question|${b.id}`]: ["approve", "", "", "A. Teacher", "20/10/2026"],
    [`question|${c2.id}`]: ["maybe", "", "", "A. Teacher", "2026-10-20"],
    [`question|${d.id}`]: ["reject", "", "", "A. Teacher", "2026-10-20"],
  });
  const { records, problems } = importReviews(bad, rows, p.manifest.version);
  assert.equal(records.length, 0);
  assert.equal(problems.length, 4);
  assert.match(problems.join("\n"), /reviewer's name[\s\S]*YYYY-MM-DD[\s\S]*decision must be one of[\s\S]*say why/);
  // the content changes after export: the old decision is refused, and a decision recorded earlier no longer counts
  const changed = rows.map((r) => (r.id === a.id ? { ...r, fingerprint: "0000000000000000" } : r));
  const stale = importReviews(fill(csv, { [`question|${a.id}`]: ["approve", "", "", "A. Teacher", "2026-10-20"] }), changed, p.manifest.version);
  assert.match(stale.problems[0], /content has changed since this file was exported/);
  const old: ReviewRecord = { kind: "question", id: a.id, version: a.version, fingerprint: a.fingerprint, content_version: p.manifest.version, decision: "approve", issues: [], comment: "", reviewer: "A", date: "2026-10-20" };
  assert.equal(currentDecisions(changed, [old]).size, 0);
  assert.equal(currentDecisions(rows, [old]).size, 1);
});

test("PR-4 the committed review export and readiness report are up to date with the content", () => {
  assert.equal(readFileSync(join(REPO, "docs", "english", "review", "pilot", "pilot-review.csv"), "utf8"), csv, "run: node tools/english/pilot/review.ts export");
  assert.equal(readFileSync(REPORT, "utf8"), report(p, JSON.parse(readFileSync(join(REPO, "content", "english", "pilot", "reviews.json"), "utf8"))), "run: node tools/english/pilot/review.ts report");
});

test("PR-5 the report separates software readiness from educational validation, and approves nothing", () => {
  const text = report(p, []);
  for (const cap of p.manifest.capabilities) assert.ok(text.includes(`\`${cap}\``), cap);
  assert.equal((text.match(/\*\*Approved for children:\*\* no\./g) ?? []).length, p.manifest.capabilities.length);
  assert.ok(!/Educationally validated:\*\* yes/.test(text));
});
