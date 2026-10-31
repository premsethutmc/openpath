/**
 * explanation-review@1 tooling: the registry of explanation reviews (content/learning/explanation-review.v1.json).
 * Every change it makes is a file change reviewed in a pull request; nothing here approves anything by itself.
 *
 *   node --import tsx packages/learning/scripts/explanation-review.ts status
 *   … sync                      register every explanation's current revision; a changed explanation gets a new revision
 *                               (pending_review, superseding the last one): the earlier decision no longer applies
 *   … screen <matrix.json>      record AI screening (Milestone 2 closure matrix) on revisions that only the registry has
 *                               touched: ready → pending_review, revision → revision_required, demo → demo_only,
 *                               unsafe → blocked. Screening is never an approval.
 *   … decide <id> --status <approved|revision_required|demo_only|blocked> --reviewer <authorised id> --note "<what was checked>"
 *                               an EDUCATOR's decision on the CURRENT revision. The reviewer must already be listed in
 *                               "reviewers" (added by a reviewed change from the product owner, never by this tool).
 *   … check                     validate the registry against the content (exit 1 on any problem)
 *
 * The educator-review packet is written by frontend/scripts/explanation-review-packet.mts (it needs the scenarios).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modules } from "../src/content";
import { addressedMisconception, approvalDigest, chapterExplanation, contentHash, explanationBlocklist, explanationId, isMisconceptionSpecific, validateRegistry, type Blocklist, type ExplanationRegistry, type ExplanationRevision, type ReviewStatus } from "../src/explanation-review";

const file = join(import.meta.dirname, "../../../content/learning/explanation-review.v1.json");
const blockFile = join(import.meta.dirname, "../../../content/learning/explanation-blocklist.v1.json");
const BLOCK_NOTE = "Blocked explanation revisions (explanation-review@1). A revision listed here is refused in every teaching mode whatever the registry says. Entries are added when a revision is blocked; removing one is a deliberate, reviewed change. Correcting a blocked explanation means new content (a new revision), never unblocking the old one.";
const loadBlock = (): Blocklist => JSON.parse(readFileSync(blockFile, "utf8"));
const saveBlock = (b: Blocklist) => writeFileSync(blockFile, JSON.stringify({ ...b, note: BLOCK_NOTE }, null, 1) + "\n");
/** Every explanation of every module: its strategies and its concept section. */
const explanations = () => modules.flatMap((m) => [...m.strategies, ...(m.chapter.length ? [chapterExplanation(m)] : [])].map((s) => ({ m, s })));
const NOTE = "The explanation-review registry (explanation-review@1, packages/learning/src/explanation-review.ts), maintained with packages/learning/scripts/explanation-review.ts. One record per explanation; each decision applies to one exact content revision (sha256). 'approved' can only be an educator's decision by an authorised reviewer listed in 'reviewers'. AI screening and machine checks are screening evidence, never approval. No explanation is approved here.";
const load = (): ExplanationRegistry => JSON.parse(readFileSync(file, "utf8"));
const save = (r: ExplanationRegistry) => writeFileSync(file, JSON.stringify({ ...r, note: NOTE }, null, 1) + "\n");
const now = () => new Date().toISOString();
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const [cmd, ...rest] = process.argv.slice(2);

if (cmd === "sync") {
  const r = load();
  let added = 0, revised = 0;
  for (const { m, s } of explanations()) {
    {
      const id = explanationId(m.competency, s.id), hash = contentHash(m.competency, s);
      let e = r.entries.find((x) => x.id === id);
      if (!e) {
        r.entries.push((e = { id, subject: "mathematics", competency: m.competency, strategy: s.id, intervention: s.kind, misconceptionSpecific: isMisconceptionSpecific(s), addresses: addressedMisconception(s), revisions: [] }));
        added++;
      }
      e.intervention = s.kind;
      e.misconceptionSpecific = isMisconceptionSpecific(s);
      e.addresses = addressedMisconception(s);
      if (e.revisions.some((x) => x.contentHash === hash)) continue;
      const last = e.revisions.at(-1);
      e.revisions.push({ contentHash: hash, status: "pending_review", provenance: { source: "registry", by: "explanation-review sync", at: now(), note: last ? `content changed: the decision on ${last.contentHash.slice(0, 19)} (${last.status}) no longer applies; review again` : "registered: not yet screened or reviewed" }, reviewerRole: "none", knownIssues: [], scope: ["demonstration"], ...(last ? { supersedes: last.contentHash } : {}) });
      if (last) revised++;
    }
  }
  r.entries.sort((a, b) => a.id.localeCompare(b.id));
  save(r);
  console.log(`sync: ${added} explanation(s) registered, ${revised} changed explanation(s) given a new revision; ${r.entries.length} records`);
} else if (cmd === "screen") {
  const rows = JSON.parse(readFileSync(rest[0], "utf8")) as { cid: string; strategy: string; classification: string; notes: string }[];
  const map: Record<string, ReviewStatus> = { "ready for supervised educational evaluation": "pending_review", "requires teaching-content revision": "revision_required", "demonstration-only": "demo_only", "mathematically unsupported or unsafe": "blocked" };
  const r = load();
  let n = 0;
  for (const row of rows) {
    const e = r.entries.find((x) => x.id === explanationId(row.cid, row.strategy));
    if (!e) throw new Error(`screen: no record for ${row.cid}#${row.strategy}`);
    const cur = e.revisions.at(-1)!;
    if (e.revisions.length !== 1 || cur.provenance.source !== "registry") continue; // screening applies to the revision it reviewed only; a later decision stands
    const status = map[row.classification];
    if (!status) throw new Error(`screen: unknown classification ${row.classification}`);
    Object.assign(cur, {
      status,
      provenance: { source: "ai-screening", by: "Milestone 2 closure audit (three independent AI reviews, machine data; errors verified by hand)", at: "2026-10-31T00:00:00.000Z", note: `screening: ${row.classification}. Not an educator review.`, ref: "docs/milestone-2/closure/03-TEACHING-CONTENT-MATRIX.md" },
      reviewerRole: "ai-reviewer",
      knownIssues: status === "pending_review" ? [] : [row.notes],
      scope: ["demonstration"],
    } satisfies Partial<ExplanationRevision>);
    if (status === "blocked") { const b = loadBlock(); if (!b.entries.some((x) => x.id === e.id && x.contentHash === cur.contentHash)) { b.entries.push({ id: e.id, contentHash: cur.contentHash, reason: row.notes, blockedAt: "2026-10-31T00:00:00.000Z", by: "Milestone 2 closure audit (AI screening, error verified by hand)" }); saveBlock(b); } }
    n++;
  }
  save(r);
  console.log(`screen: ${n} revision(s) given an AI screening classification`);
} else if (cmd === "decide") {
  const [id] = rest;
  const status = arg("status") as ReviewStatus, reviewer = arg("reviewer"), note = arg("note");
  if (!id || !status || !reviewer || !note) throw new Error("decide <id> --status <s> --reviewer <id> --note <text>");
  if (!["approved", "revision_required", "demo_only", "blocked"].includes(status)) throw new Error(`decide: ${status} is not an educator decision`);
  const r = load();
  const who = r.reviewers.find((x) => x.id === reviewer);
  if (!who || who.role !== "educator") throw new Error(`decide: ${reviewer} is not an authorised educator in this registry`);
  const e = r.entries.find((x) => x.id === id);
  const m = modules.find((x) => x.competency === e?.competency), s = e?.strategy === "chapter" && m ? chapterExplanation(m) : m?.strategies.find((x) => x.id === e?.strategy);
  if (!e || !m || !s) throw new Error(`decide: no explanation ${id}`);
  const hash = contentHash(m.competency, s);
  const cur = e.revisions.find((x) => x.contentHash === hash);
  if (!cur) throw new Error(`decide: the current revision of ${id} is not registered (run sync)`);
  if (cur.status === "blocked" || explanationBlocklist().entries.some((b) => b.id === id && b.contentHash === hash)) throw new Error(`decide: ${id} at this revision is blocked; correct the content (a new revision) instead of unblocking it`);
  const history = { ...cur };
  Object.assign(cur, { status, provenance: { source: "educator", by: reviewer, at: now(), note, ref: `previous: ${history.status} (${history.provenance.source})` }, reviewerRole: "educator", reviewer, reviewedAt: now(), knownIssues: status === "approved" ? [] : [note], scope: status === "approved" ? ["demonstration", "supervised-evaluation"] : ["demonstration"] });
  cur.approvalDigest = status === "approved" ? approvalDigest(id, cur) : undefined;
  save(r);
  if (status === "blocked") { const b = loadBlock(); b.entries.push({ id, contentHash: hash, reason: note, blockedAt: now(), by: reviewer }); saveBlock(b); }
  console.log(`decide: ${id} ${hash.slice(0, 19)} → ${status} by ${reviewer}`);
} else if (cmd === "check") {
  const problems = validateRegistry(load(), modules);
  for (const p of problems) console.log(p);
  console.log(problems.length ? `${problems.length} problem(s)` : "explanation-review registry OK");
  if (problems.length) process.exit(1);
} else {
  const r = load();
  const cur = modules.flatMap((m) => [...m.strategies, ...(m.chapter.length ? [chapterExplanation(m)] : [])].map((s) => r.entries.find((e) => e.id === explanationId(m.competency, s.id))?.revisions.find((x) => x.contentHash === contentHash(m.competency, s))?.status ?? "unregistered"));
  const counts: Record<string, number> = {};
  for (const c of cur) counts[c] = (counts[c] ?? 0) + 1;
  console.log(JSON.stringify({ explanations: cur.length, current: counts, reviewers: r.reviewers.length }));
}
