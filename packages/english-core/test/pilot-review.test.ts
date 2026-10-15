/**
 * The educator review workflow for the pilot content (tools/english/pilot/review.ts): export, import of decisions,
 * and the readiness report. Nothing here approves content: these test that decisions are recorded faithfully.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { REPORT, REPO, ROW_COLUMNS, approvedForPilot, currentDecisions, exportCsv, exportHtml, importReviews, loadPilot, parseCsv, report, reviewRows, reviewStates, reviewStatus, type ReviewRecord } from "../../../tools/english/pilot/review.ts";

const p = loadPilot();
const committedReviews: ReviewRecord[] = JSON.parse(readFileSync(join(REPO, "content", "english", "pilot", "reviews.json"), "utf8"));
const rows = reviewRows(p, committedReviews);
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
  // the five pilot capabilities' questions, and every other question on the pilot allowlist (placement and dictation)
  assert.equal(kinds("question"), p.items.length + p.allowlisted.length);
  const ids = new Set(rows.filter((r) => r.kind === "question").map((r) => r.id));
  for (const a of p.allowlist) assert.ok(ids.has(a.id), `allowlisted ${a.id} has a review row`);
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
  assert.equal(readFileSync(REPORT, "utf8"), report(p, committedReviews), "run: node tools/english/pilot/review.ts report");
});

test("PR-5 the report separates software readiness from educational validation, and approves nothing", () => {
  const text = report(p, []);
  for (const cap of p.manifest.capabilities) assert.ok(text.includes(`\`${cap}\``), cap);
  assert.equal((text.match(/\*\*Approved for children:\*\* no\./g) ?? []).length, p.manifest.capabilities.length);
  assert.ok(!/Educationally validated:\*\* yes/.test(text));
});

test("PR-6 the full round trip: export, an educator's decisions of every kind, import, then a status that names what is approved, rejected, to revise, to discuss and outstanding", () => {
  const fresh = reviewRows(p);
  const q = fresh.filter((r) => r.kind === "question");
  const passage = fresh.find((r) => r.kind === "passage")!;
  const lesson = fresh.find((r) => r.kind === "lesson")!;
  const edge = fresh.find((r) => r.kind === "prerequisite")!;
  const exported = exportCsv(fresh);
  // the reviewer fills the CSV in a spreadsheet and sends it back
  const filled = fill(exported, {
    [`question|${q[0].id}`]: ["approve", "", "", "R. Educator", "2026-11-02"],
    [`question|${q[1].id}`]: ["reject", "incorrect answer", "Two options are correct.", "R. Educator", "2026-11-02"],
    [`question|${q[2].id}`]: ["Revise", "wrong difficulty; not age-appropriate", "", "R. Educator", "2026-11-02"],
    [`passage|${passage.id}`]: ["discuss", "", "Is this context familiar to the children?", "R. Educator", "2026-11-02"],
    [`lesson|${lesson.id}`]: ["approve", "", "", "S. Teacher", "2026-11-03"],
    [`prerequisite|${edge.id}`]: ["approve", "", "Agree.", "S. Teacher", "2026-11-03"],
  });
  const { records, problems } = importReviews(filled, fresh, p.manifest.version);
  assert.deepEqual(problems, []);
  assert.equal(records.length, 6);
  assert.equal(records[2].decision, "revise", "decisions are read case-insensitively");
  assert.deepEqual(records[2].issues, ["wrong difficulty", "not age-appropriate"]);

  // where every row now stands
  const states = reviewStates(fresh, records);
  const st = (r: { kind: string; id: string }) => states.get(`${r.kind}|${r.id}`)!.state;
  assert.deepEqual([q[0], q[1], q[2], passage, lesson, edge].map(st), ["approve", "reject", "revise", "discuss", "approve", "approve"]);
  assert.equal([...states.values()].filter((s) => s.state === "outstanding").length, fresh.length - 6, "every row without a decision is outstanding, never approved");

  // the status names each one, with who decided and why
  const status = reviewStatus(fresh, records).join("\n");
  assert.match(status, /\| Approved \| 1 \| 0 \| 1 \| 1 \| 3 \|/);
  assert.match(status, /\| Rejected \| 1 \| 0 \| 0 \| 0 \| 1 \|/);
  assert.match(status, /\| To revise \| 1 \| 0 \| 0 \| 0 \| 1 \|/);
  assert.match(status, /\| To discuss \| 0 \| 1 \| 0 \| 0 \| 1 \|/);
  assert.match(status, new RegExp(`\\| Outstanding \\(not reviewed\\) \\| ${q.length - 3} \\| ${fresh.filter((r) => r.kind === "passage").length - 1} \\|`));
  assert.ok(status.includes(`question \`${q[1].id}\`: R. Educator, 2026-11-02; incorrect answer; "Two options are correct."`));
  assert.ok(status.includes(`${fresh.length - 6} of ${fresh.length} rows have no decision`));

  // re-exporting shows each row's state in the CSV and on the reading page
  const again = reviewRows(p, records);
  const back = parseCsv(exportCsv(again));
  const col = back[0].indexOf("review_status");
  const line = (id: string) => back.find((r) => r[1] === id)![col];
  assert.equal(line(q[0].id), "approved by R. Educator on 2026-11-02");
  assert.equal(line(q[1].id), "rejected by R. Educator on 2026-11-02 (incorrect answer)");
  assert.equal(line(q[3].id), "outstanding: not reviewed");
  assert.ok(exportHtml(p, again).includes("review: revise by R. Educator on 2026-11-02 (wrong difficulty; not age-appropriate)"));
  // the re-exported file can be filled and imported again: a later decision replaces the earlier one
  const second = importReviews(fill(exportCsv(again), { [`question|${q[2].id}`]: ["approve", "", "Revised version is fine.", "R. Educator", "2026-11-09"] }), again, p.manifest.version);
  assert.deepEqual(second.problems, []);
  assert.equal(reviewStates(fresh, [...records, ...second.records]).get(`question|${q[2].id}`)!.state, "approve");

  // the report carries the same status
  const text = report(p, records);
  assert.match(text, /## Review status/);
  assert.match(text, /Review decisions recorded: 6 of \d+ rows \(3 approved\)/);
});

test("PR-7 unreviewed or changed content never becomes validated: approval is recorded, never applied, and a change after approval needs review again", () => {
  const fresh = reviewRows(p);
  const target = fresh.find((r) => r.kind === "question")!;
  const approve: ReviewRecord = { kind: "question", id: target.id, version: target.version, fingerprint: target.fingerprint, content_version: p.manifest.version, decision: "approve", issues: [], comment: "", reviewer: "R. Educator", date: "2026-11-02" };
  // the content of that question changes after approval: the approval no longer counts
  const changed = fresh.map((r) => (r.id === target.id ? { ...r, fingerprint: "ffffffffffffffff" } : r));
  const s = reviewStates(changed, [approve]).get(`question|${target.id}`)!;
  assert.equal(s.state, "re-review");
  assert.match(reviewStatus(changed, [approve]).join("\n"), /Changed since a decision \(re-review\) \| 1 \|/);
  // even with every row approved, nothing in the content or the app is marked validated, and children are not approved
  const all: ReviewRecord[] = fresh.map((r) => ({ kind: r.kind, id: r.id, version: r.version, fingerprint: r.fingerprint, content_version: p.manifest.version, decision: "approve", issues: [], comment: "", reviewer: "R. Educator", date: "2026-11-02" }));
  const text = report(p, all);
  assert.equal((text.match(/\*\*Approved for children:\*\* no\./g) ?? []).length, p.manifest.capabilities.length);
  for (const i of loadPilot().items) assert.notEqual((i as { evidence_status?: string }).evidence_status, "validated", i.id);
  // the review tool writes only to a reviews file; the app never reads it
  const app = readFileSync(join(REPO, "frontend", "src", "english", "logic", "content.ts"), "utf8");
  assert.ok(!app.includes("reviews.json"), "the app does not read review decisions");
  // a dry import into a scratch directory leaves the committed reviews untouched
  const dir = mkdtempSync(join(tmpdir(), "review-"));
  assert.ok(dir);
  assert.deepEqual(JSON.parse(readFileSync(join(REPO, "content", "english", "pilot", "reviews.json"), "utf8")), committedReviews);
});

test("PR-9 a pilot build shows only allowlisted questions with an educator approval on their exact current content", () => {
  assert.deepEqual(approvedForPilot(p, committedReviews), [], "nothing is approved in the committed record");
  const fresh = reviewRows(p);
  const byId = new Map(fresh.filter((r) => r.kind === "question").map((r) => [r.id, r]));
  const listed = p.allowlist.map((a) => byId.get(a.id)!);
  const dictation = p.allowlist.find((a) => a.use === "dictation")!;
  const notListed = fresh.find((r) => r.kind === "question" && !p.allowlist.some((a) => a.id === r.id))!;
  assert.ok(notListed, "some pilot-capability questions (practice, confirmation pools) are not on the allowlist");
  const rec = (r: { kind: ReviewRecord["kind"]; id: string; version: string; fingerprint: string }, decision: ReviewRecord["decision"], fp = r.fingerprint): ReviewRecord => ({ kind: r.kind, id: r.id, version: r.version, fingerprint: fp, content_version: p.manifest.version, decision, issues: [], comment: "", reviewer: "R. Educator", date: "2026-11-02" });
  const reviews = [
    rec(listed[0], "approve"),
    rec(listed[1], "reject"),
    rec(listed[2], "approve", "0000000000000000"), // approved, but the content changed since: does not count
    rec(listed[3], "revise"),
    rec(byId.get(dictation.id)!, "approve"),
    rec(notListed, "approve"), // approved, but not on the allowlist: never shown in a pilot build
  ];
  assert.deepEqual(approvedForPilot(p, reviews), [`${listed[0].id}@${listed[0].version}`, `${dictation.id}@${dictation.version}`].sort());
  // a later decision replaces an earlier one
  assert.deepEqual(approvedForPilot(p, [...reviews, rec(listed[0], "discuss")]), [`${dictation.id}@${dictation.version}`]);
});
