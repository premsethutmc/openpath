/**
 * Educator review of the five-capability pilot content: export for review, import of decisions, readiness report.
 *
 *   node tools/english/pilot/review.ts export [dir]        a CSV (opens in Excel or Google Sheets) and an HTML page to read
 *   node tools/english/pilot/review.ts import <file.csv>   record the decisions in content/english/pilot/reviews.json
 *   node tools/english/pilot/review.ts report [--check]    write (or check) docs/english/PILOT_CONTENT_REPORT.md
 *   node tools/english/pilot/review.ts export-pilot [dir]  the educator review package: only the questions a pilot build may
 *                                                         show (placement and dictation), as a CSV and a printable page
 *                                                         (default docs/product/pilot/educator-review/; --check: is it current?)
 *   node tools/english/pilot/review.ts status              print what is approved, rejected, to revise, to discuss, outstanding
 *   node tools/english/pilot/review.ts approved            list what a pilot build would show (allowlisted and approved)
 *
 * Rows: every question, passage, lesson and prerequisite of the five pilot capabilities, and every question on the
 * pilot allowlist (content/english/pilot/allowlist.json: the placement questions and dictation words a pilot build
 * may show). This is the one review record for hand-written and dictation content; generated practice words have
 * their own rule-and-sample review (tools/english/spelling/review.ts) and are never shown in a pilot build.
 *
 * Every row has a fingerprint of its exact
 * content. An imported decision is recorded with the reviewer, date, content version and that fingerprint; a row
 * whose content has changed since export is refused as stale. Nothing here changes content or marks anything
 * approved in the app: a recorded "approve" is the educator's decision, applied to content separately and visibly.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const REPO = new URL("../../../", import.meta.url).pathname;
export const CONTENT = join(REPO, "content", "english");
export const REVIEWS = join(CONTENT, "pilot", "reviews.json");
export const REPORT = join(REPO, "docs", "english", "PILOT_CONTENT_REPORT.md");

type Json = Record<string, unknown>;
const read = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

interface Item extends Json {
  id: string;
  version: number;
  target: string;
  format: string;
  b: number;
  step?: string;
  prompt: string;
  passage?: string;
  options?: string[];
  answer?: number;
  answers?: string[];
  answer_set?: number[];
  answer_pairs?: number[];
  left?: string[];
  wrong?: Record<string, string>;
  distractor_tags?: Record<string, string>;
  rationale?: string;
  review?: string;
  explain?: string;
  speak?: string;
  sentence?: string;
}
interface Passage {
  id: string;
  title: string;
  band: number;
  text: string;
}
interface Lesson {
  id: string;
  capability: string;
  step: string;
  title: string;
  rule: string;
  examples: { text: string; note?: string }[];
  tip?: string;
  check: { prompt: string; options: string[]; answer: number; explain: string };
}
export interface PoolInfo {
  pool: "diagnosis" | "practice" | "confirmation" | "retention";
  origin: "existing" | "new-pr24" | "new-pr25";
  unfamiliar?: boolean;
}
export interface Manifest {
  version: string;
  capabilities: string[];
  status: string;
  pools: Record<string, PoolInfo>;
}

export interface AllowlistEntry {
  id: string;
  version: number;
  use: "placement" | "dictation";
}

export interface Pilot {
  manifest: Manifest;
  /** The questions of the five pilot capabilities (the coverage report is about these). */
  items: Item[];
  /** Questions on the pilot allowlist that are not already in `items` (other placement skills, the dictation bank). */
  allowlisted: Item[];
  allowlist: AllowlistEntry[];
  passages: Map<string, Passage>;
  lessons: Lesson[];
  prerequisites: { capability: string; requires: string; source?: string }[];
  names: Map<string, string>;
}

/** Load the pilot's content from the repository files (the same files the app ships). */
export function loadPilot(content = CONTENT): Pilot {
  const manifest = read<Manifest>(join(content, "pilot", "manifest.json"));
  const all = [...read<Item[]>(join(content, "items", "code-items.json")), ...read<Item[]>(join(content, "items", "e2a-items.json")), ...read<Item[]>(join(content, "items", "e2b-items.json")), ...read<Item[]>(join(content, "pilot", "items.json"))];
  const order = (a: Item, b: Item) => a.target.localeCompare(b.target) || a.b - b.b || a.id.localeCompare(b.id);
  const items = all.filter((i) => manifest.capabilities.includes(i.target)).sort(order);
  const allowlist = existsSync(join(content, "pilot", "allowlist.json")) ? read<{ items: AllowlistEntry[] }>(join(content, "pilot", "allowlist.json")).items : [];
  const bank = new Map([...all, ...read<{ items: Item[] }>(join(content, "spelling", "dictation-bank.json")).items].map((i) => [i.id, i]));
  const inItems = new Set(items.map((i) => i.id));
  const allowlisted = allowlist
    .filter((a) => !inItems.has(a.id))
    .map((a) => bank.get(a.id))
    .filter((i): i is Item => !!i)
    .sort(order);
  const passages = new Map([...read<Passage[]>(join(content, "items", "passages.json")), ...read<Passage[]>(join(content, "pilot", "passages.json"))].map((p) => [p.id, p]));
  const lessons = read<{ lessons: Lesson[] }>(join(content, "web", "lessons.json")).lessons.filter((l) => manifest.capabilities.includes(l.capability));
  const fw = read<{ prerequisites: { capability: string; requires: string; source?: string }[]; strands: { substrands: { capabilities: { id: string; name: string }[] }[] }[] }>(join(content, "framework", "en-0.2.0.json"));
  const names = new Map(fw.strands.flatMap((s) => s.substrands.flatMap((ss) => ss.capabilities.map((c) => [c.id, c.name] as [string, string]))));
  const prerequisites = fw.prerequisites.filter((p) => manifest.capabilities.includes(p.capability) || manifest.capabilities.includes(p.requires));
  return { manifest, items, allowlisted, allowlist, passages, lessons, prerequisites, names };
}

/** A short fingerprint of exactly what the reviewer sees (canonical JSON, sorted keys). */
export function fingerprint(x: unknown): string {
  const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Json).sort(([a], [b]) => a.localeCompare(b)).map(([k, w]) => [k, canon(w)])) : v);
  return createHash("sha256").update(JSON.stringify(canon(x))).digest("hex").slice(0, 16);
}

export const DECISIONS = ["approve", "reject", "revise", "discuss"] as const;
/** Words an educator may write for a decision, as recorded ("request correction" is recorded as "revise"). */
export const DECISION_ALIASES: Record<string, (typeof DECISIONS)[number]> = { approved: "approve", rejected: "reject", "request correction": "revise", correction: "revise", correct: "revise" };
export const ISSUES = ["incorrect answer", "ambiguous", "wrong difficulty", "wrong skill", "not age-appropriate", "duplicate", "cultural or context", "other"] as const;

export interface ReviewRow {
  kind: "question" | "passage" | "lesson" | "prerequisite";
  id: string;
  version: string;
  capability: string;
  skill: string;
  use: string;
  difficulty: string;
  format: string;
  passage: string;
  content: string;
  key: string;
  misconceptions: string;
  rationale: string;
  status: string;
  fingerprint: string;
  /** The current review state of this exact content: outstanding, approved, rejected, revise, discuss, or re-review (changed since the decision). */
  review_status: string;
}
export const REVIEW_COLUMNS = ["decision", "issues", "comment", "reviewer", "date"] as const;
export const ROW_COLUMNS: (keyof ReviewRow)[] = ["kind", "id", "version", "capability", "skill", "use", "difficulty", "format", "passage", "content", "key", "misconceptions", "rationale", "status", "fingerprint", "review_status"];

const USE_WORDS: Record<string, string> = {
  diagnosis: "diagnosis (first checks)",
  practice: "practice during teaching only",
  confirmation: "confirmation after teaching only",
  retention: "later (retention) check only",
};

const ORIGIN_WORDS: Record<PoolInfo["origin"], string> = { existing: "existing question", "new-pr24": "new in PR #24 (AI-assisted draft)", "new-pr25": "new in PR #25: practice only (AI-assisted draft)" };

function keyOf(i: Item): string {
  if (i.answers) return i.answers.join(" | ");
  if (i.answer !== undefined && i.options) return i.options[i.answer];
  if (i.answer_set && i.options) return i.answer_set.map((k) => i.options![k]).join(" + ");
  if (i.answer_pairs && i.left && i.options) return i.left.map((l, k) => `${l} → ${i.options![i.answer_pairs![k]]}`).join("; ");
  return "";
}

/**
 * Every reviewable row: questions, passages, lessons and prerequisite edges, in a stable order. With the recorded
 * reviews, each row also says its current review state (the fingerprint never includes it).
 */
export function reviewRows(p: Pilot, reviews: ReviewRecord[] = []): ReviewRow[] {
  const rows = contentRows(p);
  const states = reviewStates(rows, reviews);
  return rows.map((r) => ({ ...r, review_status: stateWords(states.get(`${r.kind}|${r.id}`)!) }));
}

function contentRows(p: Pilot): ReviewRow[] {
  const rows: ReviewRow[] = [];
  const pool = (id: string) => p.manifest.pools[id];
  const listed = new Map(p.allowlist.map((a) => [a.id, a]));
  for (const i of [...p.items, ...p.allowlisted]) {
    const info = pool(i.id);
    const pilotUse = listed.get(i.id)?.version === i.version ? `; pilot allowlist: ${listed.get(i.id)!.use}` : "";
    const passage = i.passage ? p.passages.get(i.passage) : undefined;
    const tags = [...Object.entries(i.wrong ?? {}).map(([w, t]) => `"${w}" → ${t}`), ...Object.entries(i.distractor_tags ?? {}).map(([k, t]) => `"${i.options?.[Number(k)]}" → ${t}`)].join("; ");
    rows.push({
      kind: "question",
      id: i.id,
      version: String(i.version),
      capability: i.target,
      skill: p.names.get(i.target) ?? i.target,
      use: (info ? `${USE_WORDS[info.pool]}${info.unfamiliar ? "; unfamiliar example (transfer)" : ""}` : "not reserved") + pilotUse,
      difficulty: String(i.b),
      format: i.format,
      passage: passage ? `${passage.id}: ${passage.title}` : "",
      content: [
        i.prompt,
        ...(i.speak ? [`Said aloud: "${i.speak}"`] : []),
        ...(i.sentence ? [`Sentence said aloud (never shown): "${i.sentence}"`] : []),
        ...(i.left ? [`Match: ${i.left.join(" / ")}`] : []),
        ...(i.options ? [`Options: ${i.options.map((o, k) => `(${k + 1}) ${o}`).join("  ")}`] : []),
        ...(i.explain ? [`Shown after answering: ${i.explain}`] : []),
      ].join("\n"),
      key: keyOf(i),
      misconceptions: tags,
      rationale: i.rationale ?? "",
      status: `${i.review ?? "candidate"}; ${ORIGIN_WORDS[info?.origin ?? "existing"]}`,
      fingerprint: fingerprint(i),
      review_status: "",
    });
  }
  const used = new Set([...p.items, ...p.allowlisted].map((i) => i.passage).filter((x): x is string => !!x));
  for (const id of [...used].sort()) {
    const ps = p.passages.get(id)!;
    const on = p.items.filter((i) => i.passage === id);
    const caps = [...new Set(on.map((i) => i.target))];
    const origin = !id.startsWith("plt.") ? "existing passage" : on.every((i) => pool(i.id)?.origin === "new-pr25") ? "new in PR #25: practice only (AI-assisted draft)" : "new in PR #24 (AI-assisted draft)";
    rows.push({ kind: "passage", id, version: "", capability: caps.join(" "), skill: caps.map((c) => p.names.get(c) ?? c).join(", "), use: "", difficulty: String(ps.band), format: "passage", passage: ps.title, content: ps.text, key: "", misconceptions: "", rationale: "", status: origin, fingerprint: fingerprint(ps), review_status: "" });
  }
  for (const l of p.lessons)
    rows.push({
      kind: "lesson",
      id: l.id,
      version: "",
      capability: l.capability,
      skill: p.names.get(l.capability) ?? l.capability,
      use: "teaching",
      difficulty: "",
      format: `lesson: ${l.step}`,
      passage: "",
      content: [l.title, l.rule, ...l.examples.map((e) => `Example: ${e.text}${e.note ? ` (${e.note})` : ""}`), ...(l.tip ? [`Tip: ${l.tip}`] : []), `Check: ${l.check.prompt} Options: ${l.check.options.join(" / ")}`].join("\n"),
      key: `${l.check.options[l.check.answer]}: ${l.check.explain}`,
      misconceptions: "",
      rationale: "",
      status: l.capability.startsWith("EN.RDG") ? "new in PR #24 (AI-assisted draft)" : "existing lesson, examples revised in PR #24",
      fingerprint: fingerprint(l),
      review_status: "",
    });
  for (const e of p.prerequisites)
    rows.push({ kind: "prerequisite", id: `${e.capability} requires ${e.requires}`, version: "", capability: e.capability, skill: `${p.names.get(e.capability)} requires ${p.names.get(e.requires)}`, use: "planning", difficulty: "", format: "prerequisite", passage: "", content: `Is ${p.names.get(e.requires)} a prerequisite of ${p.names.get(e.capability)}? The plan checks it first when ${p.names.get(e.capability)} is found hard.`, key: "", misconceptions: "", rationale: e.source ?? "", status: "candidate (OpenPath's own; no reference states it)", fingerprint: fingerprint(e), review_status: "" });
  return rows;
}

// ---------------------------------------------------------------- CSV (RFC 4180)

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") (row.push(field), (field = ""));
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x !== "")) out.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) (row.push(field), row.some((x) => x !== "") && out.push(row));
  return out;
}

export function exportCsv(rows: ReviewRow[]): string {
  return "﻿" + toCsv([...ROW_COLUMNS, ...REVIEW_COLUMNS], rows.map((r) => [...ROW_COLUMNS.map((k) => r[k]), "", "", "", "", ""]));
}

// ---------------------------------------------------------------- import

export interface ReviewRecord {
  kind: ReviewRow["kind"];
  id: string;
  version: string;
  fingerprint: string;
  content_version: string;
  decision: (typeof DECISIONS)[number];
  issues: string[];
  comment: string;
  reviewer: string;
  date: string;
}

/**
 * Read a filled review CSV against the current content. Rows without a decision are skipped. A decision needs a
 * reviewer and a date; a row whose fingerprint no longer matches the content is refused (the content changed after
 * export and must be reviewed again). Returns the records to append and the problems; it never edits content.
 */
export function importReviews(csv: string, current: ReviewRow[], contentVersion: string): { records: ReviewRecord[]; problems: string[] } {
  const table = parseCsv(csv);
  const problems: string[] = [];
  const records: ReviewRecord[] = [];
  if (!table.length) return { records, problems: ["the file is empty"] };
  const head = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  for (const need of ["kind", "id", "fingerprint", ...REVIEW_COLUMNS]) if (col(need) < 0) problems.push(`missing column: ${need}`);
  if (problems.length) return { records, problems };
  const byKey = new Map(current.map((r) => [`${r.kind}|${r.id}`, r]));
  table.slice(1).forEach((row, n) => {
    const get = (name: string) => (row[col(name)] ?? "").trim();
    const line = n + 2;
    const decision = DECISION_ALIASES[get("decision").toLowerCase().replace(/\s+/g, " ")] ?? get("decision").toLowerCase();
    if (!decision) return;
    const label = `row ${line} (${get("kind")} ${get("id")})`;
    if (!(DECISIONS as readonly string[]).includes(decision)) return void problems.push(`${label}: decision must be one of ${DECISIONS.join(", ")} (is "${decision}")`);
    const reviewer = get("reviewer");
    const date = get("date");
    if (!reviewer) return void problems.push(`${label}: a decision needs the reviewer's name`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return void problems.push(`${label}: a decision needs a date as YYYY-MM-DD`);
    const cur = byKey.get(`${get("kind")}|${get("id")}`);
    if (!cur) return void problems.push(`${label}: no such content in the current version`);
    if (cur.fingerprint !== get("fingerprint")) return void problems.push(`${label}: the content has changed since this file was exported; review the current version`);
    const issues = get("issues")
      .split(/[;|]/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    for (const i of issues) if (!(ISSUES as readonly string[]).includes(i)) problems.push(`${label}: unknown issue "${i}" (use ${ISSUES.join(", ")})`);
    if ((decision === "reject" || decision === "revise") && !get("comment") && !issues.length) return void problems.push(`${label}: say why (an issue or a comment) when rejecting or asking for a revision`);
    records.push({ kind: cur.kind, id: cur.id, version: cur.version, fingerprint: cur.fingerprint, content_version: contentVersion, decision: decision as ReviewRecord["decision"], issues, comment: get("comment"), reviewer, date });
  });
  return { records, problems };
}

/** The latest decision per row that still matches the current content (older or stale decisions do not count). */
export function currentDecisions(rows: Pick<ReviewRow, "kind" | "id" | "fingerprint">[], reviews: ReviewRecord[]): Map<string, ReviewRecord> {
  const out = new Map<string, ReviewRecord>();
  const fp = new Map(rows.map((r) => [`${r.kind}|${r.id}`, r.fingerprint]));
  for (const r of reviews) if (fp.get(`${r.kind}|${r.id}`) === r.fingerprint) out.set(`${r.kind}|${r.id}`, r);
  return out;
}

/**
 * Where each row stands:
 *   outstanding  no decision on this exact content (never reviewed)
 *   re-review    decided once, but the content has changed since: the old decision no longer counts
 *   approve / reject / revise / discuss   the latest decision on this exact content
 * Only "approve" on the current fingerprint counts as approved; everything else is not approved.
 */
export type ReviewState = { state: "outstanding" } | { state: "re-review"; was: ReviewRecord } | { state: ReviewRecord["decision"]; record: ReviewRecord };

export function reviewStates(rows: Pick<ReviewRow, "kind" | "id" | "fingerprint">[], reviews: ReviewRecord[]): Map<string, ReviewState> {
  const current = currentDecisions(rows, reviews);
  const out = new Map<string, ReviewState>();
  for (const r of rows) {
    const key = `${r.kind}|${r.id}`;
    const now = current.get(key);
    const older = reviews.filter((x) => `${x.kind}|${x.id}` === key).at(-1);
    out.set(key, now ? { state: now.decision, record: now } : older ? { state: "re-review", was: older } : { state: "outstanding" });
  }
  return out;
}

function stateWords(s: ReviewState): string {
  if (s.state === "outstanding") return "outstanding: not reviewed";
  if (s.state === "re-review") return `re-review: changed since ${s.was.decision} by ${s.was.reviewer} on ${s.was.date}`;
  const r = s.record;
  const words = { approve: "approved", reject: "rejected", revise: "revise", discuss: "discuss" }[r.decision];
  return `${words} by ${r.reviewer} on ${r.date}${r.issues.length ? ` (${r.issues.join("; ")})` : ""}`;
}

const STATE_ORDER = ["approve", "reject", "revise", "discuss", "re-review", "outstanding"] as const;
const STATE_HEAD: Record<(typeof STATE_ORDER)[number], string> = { approve: "Approved", reject: "Rejected", revise: "To revise", discuss: "To discuss", "re-review": "Changed since a decision (re-review)", outstanding: "Outstanding (not reviewed)" };

/** The review status: counts by state and kind, then every row that is not simply outstanding, with the decision. */
export function reviewStatus(rows: ReviewRow[], reviews: ReviewRecord[]): string[] {
  const states = reviewStates(rows, reviews);
  const kinds = ["question", "passage", "lesson", "prerequisite"] as const;
  const of = (st: string, k?: string) => rows.filter((r) => states.get(`${r.kind}|${r.id}`)!.state === st && (!k || r.kind === k));
  const lines: string[] = [];
  lines.push("| State | " + kinds.map((k) => `${k}s`).join(" | ") + " | total |", "|---|" + kinds.map(() => "---").join("|") + "|---|");
  for (const st of STATE_ORDER) lines.push(`| ${STATE_HEAD[st]} | ${kinds.map((k) => of(st, k).length).join(" | ")} | ${of(st).length} |`);
  lines.push("");
  for (const st of STATE_ORDER.filter((x) => x !== "outstanding")) {
    const list = of(st);
    if (!list.length) continue;
    lines.push(`**${STATE_HEAD[st]}:**`, "");
    for (const r of list) {
      const s = states.get(`${r.kind}|${r.id}`)!;
      const rec = "record" in s ? s.record : "was" in s ? s.was : null;
      lines.push(`- ${r.kind} \`${r.id}\`${rec ? `: ${rec.reviewer}, ${rec.date}${rec.issues.length ? `; ${rec.issues.join(", ")}` : ""}${rec.comment ? `; "${rec.comment.replace(/\s+/g, " ")}"` : ""}` : ""}`);
    }
    lines.push("");
  }
  const out = of("outstanding").length;
  lines.push(out ? `${out} of ${rows.length} rows have no decision on their current content.` : "Every row has a decision on its current content.", "");
  return lines;
}

/**
 * What a pilot build may show: `id@version` for each allowlisted question with an educator "approve" on its exact
 * current content (fingerprint), and `passage:id` for each approved passage. Nothing else is ever approved here:
 * an empty list means a pilot build shows nothing. The app applies the same allowlist again at run time.
 */
export function approvedForPilot(p: Pilot, reviews: ReviewRecord[]): string[] {
  const rows = contentRows(p);
  const decided = currentDecisions(rows, reviews);
  const ok = (kind: ReviewRow["kind"], id: string) => decided.get(`${kind}|${id}`)?.decision === "approve";
  const byId = new Map(rows.filter((r) => r.kind === "question").map((r) => [r.id, r]));
  const out: string[] = [];
  for (const a of p.allowlist) {
    const r = byId.get(a.id);
    if (r && r.version === String(a.version) && ok("question", a.id)) out.push(`${a.id}@${a.version}`);
  }
  for (const r of rows) if (r.kind === "passage" && ok("passage", r.id)) out.push(`passage:${r.id}`);
  return out.sort();
}

// ---------------------------------------------------------------- HTML for reading

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function exportHtml(p: Pilot, rows: ReviewRow[]): string {
  const caps = p.manifest.capabilities;
  const section = (cap: string) => {
    const r = rows.filter((x) => x.capability.split(" ").includes(cap));
    const block = (x: ReviewRow) => `<article class="${x.kind}"><h4>${esc(x.kind)} <code>${esc(x.id)}</code>${x.version ? ` v${esc(x.version)}` : ""}</h4><p class="meta">${[x.use, x.difficulty && `difficulty ${x.difficulty}`, x.format, x.status].filter(Boolean).map(esc).join(" · ")}</p>${x.passage && x.kind === "question" ? `<p class="meta">Passage: ${esc(x.passage)}</p>` : ""}<pre>${esc(x.content)}</pre>${x.key ? `<p><b>Key:</b> ${esc(x.key)}</p>` : ""}${x.misconceptions ? `<p><b>Wrong answers tagged:</b> ${esc(x.misconceptions)}</p>` : ""}${x.rationale ? `<p class="meta">${esc(x.rationale)}</p>` : ""}<p class="meta">fingerprint ${esc(x.fingerprint)} · <b>review: ${esc(x.review_status)}</b></p></article>`;
    return `<h2>${esc(p.names.get(cap) ?? cap)}</h2><p class="meta">${esc(cap)}</p>${["lesson", "passage", "question"].map((k) => r.filter((x) => x.kind === k)).map((list) => list.map(block).join("")).join("")}`;
  };
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pilot content for review</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:16px;max-width:52rem;color:#222}h2{margin-top:2.5rem;border-bottom:2px solid #ccd}article{border:1px solid #dde;border-radius:8px;padding:8px 12px;margin:10px 0}article.lesson{background:#f4f7ff}article.passage{background:#fbfaf4}pre{white-space:pre-wrap;font:inherit;margin:4px 0}.meta{color:#666;font-size:13px;margin:2px 0}h4{margin:0}.warn{background:#fff4d6;padding:10px;border-radius:8px}</style>
<h1>OpenPath: five-capability pilot content for educator review</h1>
<p class="warn">Content version ${esc(p.manifest.version)}. Everything here is a candidate awaiting review: nothing is approved. Record decisions in the CSV (one row per item) and return it; decisions are recorded with your name, the date and a fingerprint of exactly what you reviewed.</p>
${p.prerequisites.length ? `<h2>Prerequisite assumptions</h2>${rows.filter((x) => x.kind === "prerequisite").map((x) => `<article><pre>${esc(x.content)}</pre><p class="meta">${esc(x.status)} · ${esc(x.rationale)}</p></article>`).join("")}` : ""}
${caps.map(section).join("\n")}
${p.allowlisted.length ? `<h2>Other questions a pilot build may show (pilot allowlist)</h2><p class="meta">Placement questions on the other guided skills, and the dictation words. Each needs its own approval.</p>${rows.filter((x) => x.kind === "question" && !caps.includes(x.capability)).concat(rows.filter((x) => x.kind === "question" && caps.includes(x.capability) && p.allowlisted.some((i) => i.id === x.id))).map((x) => `<article class="question"><h4>question <code>${esc(x.id)}</code> v${esc(x.version)}</h4><p class="meta">${[x.capability, x.use, `difficulty ${x.difficulty}`, x.format].map(esc).join(" · ")}</p><pre>${esc(x.content)}</pre>${x.key ? `<p><b>Key:</b> ${esc(x.key)}</p>` : ""}<p class="meta">fingerprint ${esc(x.fingerprint)} · <b>review: ${esc(x.review_status)}</b></p></article>`).join("")}` : ""}`;
}

// ---------------------------------------------------------------- the educator review package (pilot questions only)

export const PILOT_PACKAGE = join(REPO, "docs", "product", "pilot", "educator-review");

/**
 * The questions a pilot build may show, in review order: dictation batch 1 (difficulty ≤ 4.5), dictation batch 2,
 * then placement by skill and difficulty. These are ordinary review rows: the CSV imports with `review.ts import`.
 */
export function pilotPackageRows(p: Pilot, reviews: ReviewRecord[] = []): (ReviewRow & { section: string })[] {
  const rows = new Map(reviewRows(p, reviews).filter((r) => r.kind === "question").map((r) => [r.id, r]));
  const listed = p.allowlist.map((a) => ({ a, r: rows.get(a.id)! })).filter((x) => x.r && x.r.version === String(x.a.version));
  const dictation = listed.filter((x) => x.a.use === "dictation").sort((x, y) => Number(x.r.difficulty) - Number(y.r.difficulty) || x.r.key.localeCompare(y.r.key));
  const placement = listed.filter((x) => x.a.use === "placement").sort((x, y) => x.r.skill.localeCompare(y.r.skill) || Number(x.r.difficulty) - Number(y.r.difficulty) || x.r.id.localeCompare(y.r.id));
  return [
    ...dictation.map((x) => ({ ...x.r, section: Number(x.r.difficulty) <= 4.5 ? "Dictation words, batch 1 (difficulty 4.5 or below)" : "Dictation words, batch 2 (difficulty above 4.5)" })),
    ...placement.map((x) => ({ ...x.r, section: `Placement: ${x.r.skill}` })),
  ];
}

export function exportPilotHtml(p: Pilot, rows: (ReviewRow & { section: string })[]): string {
  const sections = [...new Set(rows.map((r) => r.section))];
  let n = 0;
  const card = (x: ReviewRow) => {
    n++;
    const lines = x.content.split("\n");
    return `<article><h3><span class="n">${n}.</span> <code>${esc(x.id)}</code> · version ${esc(x.version)}</h3>
<p class="meta">${esc(x.skill)} · difficulty ${esc(x.difficulty)} (author's estimate, 1 easy to 8 hard) · ${esc(x.format)}</p>
<div class="q">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>
<p><b>Expected answer:</b> ${esc(x.key)}</p>
${x.misconceptions ? `<p class="meta"><b>Wrong answers the app recognises:</b> ${esc(x.misconceptions)}</p>` : ""}
<p class="meta">Current review: ${esc(x.review_status)} · fingerprint ${esc(x.fingerprint)}</p>
<p class="decide">Decision: ☐ approve &nbsp; ☐ reject &nbsp; ☐ request correction &nbsp; Reason: ______________________________</p></article>`;
  };
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenPath pilot questions: educator review</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:16px;max-width:52rem;color:#222}h2{margin-top:2.5rem;border-bottom:2px solid #ccd;break-before:page}article{border:1px solid #dde;border-radius:8px;padding:8px 12px;margin:10px 0;break-inside:avoid}h3{margin:0;font-size:1rem}.n{color:#777}.q{background:#f6f7fb;border-radius:6px;padding:4px 10px}.q p{margin:4px 0}.meta{color:#555;font-size:13px;margin:2px 0}.decide{font-size:14px;border-top:1px dashed #ccd;padding-top:6px}.warn{background:#fff4d6;padding:10px;border-radius:8px}@media print{body{margin:0}}</style>
<h1>OpenPath pilot questions: educator review</h1>
<p class="warn">Content version ${esc(p.manifest.version)}. ${rows.length} questions: ${rows.filter((r) => r.section.startsWith("Dictation")).length} dictation words and ${rows.filter((r) => r.section.startsWith("Placement")).length} placement questions. <b>Nothing here is approved.</b> A pilot build shows a question to a child only after an educator approves that exact version. Record decisions in <code>pilot-questions-review.csv</code> (one row per question, same order and numbering as this page). The instructions are in EDUCATOR_REVIEW_GUIDE.md.</p>
<p>Contents: ${sections.map((s) => `${esc(s)} (${rows.filter((r) => r.section === s).length})`).join(" · ")}</p>
${sections.map((s) => `<h2>${esc(s)}</h2>${rows.filter((r) => r.section === s).map(card).join("")}`).join("\n")}`;
}

// ---------------------------------------------------------------- the readiness report

const BANDS: [string, number, number][] = [
  ["1–2.5", 0, 2.75],
  ["3–4", 2.75, 4.25],
  ["4.5–5.5", 4.25, 5.75],
  ["6–8", 5.75, 9],
];
const POOLS = ["diagnosis", "practice", "confirmation", "retention"] as const;
/** Minimum reserved questions at the easier levels (difficulty ≤ 4) for the software to run a full journey once. */
export const READY_MIN = { diagnosis: 3, confirmation: 4, retention: 4 };

export function report(p: Pilot, reviews: ReviewRecord[]): string {
  const rows = reviewRows(p, reviews);
  const decided = currentDecisions(rows, reviews);
  const pool = (id: string) => p.manifest.pools[id]?.pool;
  const lines: string[] = [];
  lines.push("# Pilot content: coverage, review status and readiness", "");
  lines.push(`Generated by \`node tools/english/pilot/review.ts report\` from content version **${p.manifest.version}**. Do not edit by hand.`, "");
  lines.push("**Software readiness** means the app can run diagnosis → teaching → a fresh confirming check → a later check on this content. **Educational validation** means an educator has approved the content. They are reported separately: the first can be yes while the second is no.", "");
  const approvedAll = [...decided.values()].filter((r) => r.decision === "approve").length;
  lines.push(`Review decisions recorded: ${decided.size} of ${rows.length} rows (${approvedAll} approved). Approval in the app is not automatic.`, "");
  lines.push("## Review status", "", "Only an educator's \"approve\" on the exact current content counts. A row that changed after its decision needs review again. Nothing here is applied to the app: approved content still has to be marked validated in a separate, visible change.", "");
  lines.push(...reviewStatus(rows, reviews));
  for (const cap of p.manifest.capabilities) {
    const items = p.items.filter((i) => i.target === cap);
    const lessons = p.lessons.filter((l) => l.capability === cap);
    const capRows = rows.filter((r) => r.capability.split(" ").includes(cap));
    const approved = capRows.filter((r) => decided.get(`${r.kind}|${r.id}`)?.decision === "approve").length;
    lines.push(`## ${p.names.get(cap)} (\`${cap}\`)`, "");
    lines.push("| Use | " + BANDS.map((b) => `difficulty ${b[0]}`).join(" | ") + " | total |", "|---|" + BANDS.map(() => "---").join("|") + "|---|");
    for (const u of POOLS) {
      const inPool = items.filter((i) => pool(i.id) === u);
      lines.push(`| ${u} | ${BANDS.map(([, lo, hi]) => inPool.filter((i) => i.b >= lo && i.b < hi).length).join(" | ")} | ${inPool.length} |`);
    }
    const passages = new Set(items.map((i) => i.passage).filter(Boolean));
    lines.push("");
    // what a check can count at the easier levels: questions, but one per reading passage (passage@1)
    const easy = (u: keyof typeof READY_MIN) => {
      const list = items.filter((i) => pool(i.id) === u && i.b <= 4);
      return list.filter((i) => !i.passage).length + new Set(list.map((i) => i.passage).filter(Boolean)).size;
    };
    const lessonSteps = new Set(lessons.map((l) => l.step));
    const easySteps = [...new Set(items.filter((i) => i.b <= 4 && i.step).map((i) => i.step!))];
    const untaught = easySteps.filter((s) => !lessonSteps.has(s));
    lines.push(`- Questions: ${items.length} (${items.filter((i) => p.manifest.pools[i.id]?.origin !== "existing").length} new candidates)${passages.size ? `, on ${passages.size} passages` : ""}.`);
    lines.push(`- Teaching: ${lessons.length} lesson${lessons.length === 1 ? "" : "s"} (${lessons.map((l) => l.step).join(", ") || "none"}).${untaught.length ? ` Steps used at the easier levels with no lesson: ${untaught.join(", ")}.` : ""}`);
    lines.push(`- Awaiting review: ${capRows.length - approved} of ${capRows.length} rows (questions, passages, lessons, prerequisites); approved: ${approved}.`);
    const gaps: string[] = [];
    for (const u of Object.keys(READY_MIN) as (keyof typeof READY_MIN)[]) if (easy(u) < READY_MIN[u]) gaps.push(`only ${easy(u)} ${u} question${easy(u) === 1 ? "" : "s"} at difficulty ≤ 4 (needs ${READY_MIN[u]})`);
    if (!lessons.length) gaps.push("no teaching");
    if (passages.size) lines.push(`- Counted answers available at difficulty ≤ 4 (one per passage): diagnosis ${easy("diagnosis")}, confirmation ${easy("confirmation")}, later check ${easy("retention")}.`);
    if (items.filter((i) => pool(i.id) === "confirmation" || pool(i.id) === "retention").length < 12) gaps.push("enough reserved questions for one confirming check and one later check, not for repeated cycles");
    if (cap.startsWith("EN.RDG")) gaps.push("the older reading questions come two per passage: only the first answer on a passage counts (passage@1), so they supply one counted answer per passage");
    if (items.some((i) => i.b > 4.25) && !items.some((i) => (pool(i.id) === "confirmation" || pool(i.id) === "retention") && i.b > 4.25))
      gaps.push("no confirmation or later-check questions above difficulty 4: older or stronger learners cannot be confirmed at their level");
    lines.push(`- Outstanding gaps: ${gaps.length ? gaps.join("; ") : "none found by the checks"}.`);
    const softwareReady = (Object.keys(READY_MIN) as (keyof typeof READY_MIN)[]).every((u) => easy(u) >= READY_MIN[u]) && lessons.length > 0;
    lines.push(`- **Software ready for supervised testing:** ${softwareReady ? "yes, at difficulty ≤ 4" : "no"}. **Educationally validated:** ${approved === capRows.length ? "yes" : `no (${approved} of ${capRows.length} approved)`}. **Approved for children:** no.`, "");
  }
  lines.push("## Not covered by this report", "", "- Whether any question, passage or lesson is correct, clear or suitable: that is the educator's review.", "- Safeguarding, consent, data protection and the session protocol for supervised testing: see PILOT_PROTOCOL.md (a draft awaiting the responsible adults' agreement).", "- The educator decisions that remain open: see EDUCATOR_DECISION_PACK.md.", "");
  return lines.join("\n");
}

// ---------------------------------------------------------------- command line

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  const p = loadPilot();
  const reviews: ReviewRecord[] = existsSync(REVIEWS) ? read<ReviewRecord[]>(REVIEWS) : [];
  const rows = reviewRows(p, reviews);
  if (cmd === "export") {
    const dir = arg ?? join(REPO, "docs", "english", "review", "pilot");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "pilot-review.csv"), exportCsv(rows));
    writeFileSync(join(dir, "pilot-review.html"), exportHtml(p, rows));
    console.log(`wrote ${rows.length} rows (${rows.filter((r) => r.kind === "question").length} questions, ${rows.filter((r) => r.kind === "passage").length} passages, ${rows.filter((r) => r.kind === "lesson").length} lessons, ${rows.filter((r) => r.kind === "prerequisite").length} prerequisites) to ${dir}`);
  } else if (cmd === "export-pilot") {
    const check = arg === "--check";
    const dir = check || !arg ? PILOT_PACKAGE : arg;
    const pkg = pilotPackageRows(p, reviews);
    const files: [string, string][] = [
      ["pilot-questions-review.csv", exportCsv(pkg)],
      ["pilot-questions-review.html", exportPilotHtml(p, pkg)],
    ];
    if (check) {
      const stale = files.filter(([f, t]) => !existsSync(join(dir, f)) || readFileSync(join(dir, f), "utf8") !== t);
      if (stale.length) {
        console.log(`educator review package is out of date (${stale.map(([f]) => f).join(", ")}): run \`node tools/english/pilot/review.ts export-pilot\``);
        process.exitCode = 1;
      } else console.log("educator review package is up to date");
    } else {
      mkdirSync(dir, { recursive: true });
      for (const [f, t] of files) writeFileSync(join(dir, f), t);
      console.log(`wrote ${pkg.length} questions (${pkg.filter((r) => r.section.startsWith("Dictation")).length} dictation, ${pkg.filter((r) => r.section.startsWith("Placement")).length} placement) to ${dir}`);
    }
  } else if (cmd === "import") {
    if (!arg) throw new Error("usage: import <file.csv>");
    const { records, problems } = importReviews(readFileSync(arg, "utf8"), rows, p.manifest.version);
    for (const x of problems) console.log(`PROBLEM  ${x}`);
    if (problems.length) {
      console.log("Nothing recorded: fix the problems and import again.");
      process.exitCode = 1;
    } else {
      writeFileSync(REVIEWS, JSON.stringify([...reviews, ...records], null, 1) + "\n");
      console.log(`recorded ${records.length} decision${records.length === 1 ? "" : "s"} in ${REVIEWS} (content is not changed)`);
    }
  } else if (cmd === "report") {
    const text = report(p, reviews);
    if (arg === "--check") {
      if (!existsSync(REPORT) || readFileSync(REPORT, "utf8") !== text) {
        console.log("PILOT_CONTENT_REPORT.md is out of date: run `node tools/english/pilot/review.ts report`");
        process.exitCode = 1;
      } else console.log("pilot content report is up to date");
    } else {
      writeFileSync(REPORT, text);
      console.log(`wrote ${REPORT}`);
    }
  } else if (cmd === "approved") {
    // what a pilot build would show (build-english.mjs --pilot compiles exactly this list)
    const list = approvedForPilot(p, reviews);
    console.log(list.length ? list.join("\n") : "nothing approved for the pilot: a pilot build would show no questions");
  } else if (cmd === "status") {
    console.log(reviewStatus(rows, reviews).join("\n"));
  } else console.log("usage: review.ts export [dir] | export-pilot [dir|--check] | import <file.csv> | report [--check] | status | approved");
}
