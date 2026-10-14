/**
 * Educator review of the five-capability pilot content: export for review, import of decisions, readiness report.
 *
 *   node tools/english/pilot/review.ts export [dir]        a CSV (opens in Excel or Google Sheets) and an HTML page to read
 *   node tools/english/pilot/review.ts import <file.csv>   record the decisions in content/english/pilot/reviews.json
 *   node tools/english/pilot/review.ts report [--check]    write (or check) docs/english/PILOT_CONTENT_REPORT.md
 *
 * Every question, passage, lesson and prerequisite of the pilot is one row, with a fingerprint of its exact
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
  origin: "existing" | "new-pr24";
  unfamiliar?: boolean;
}
export interface Manifest {
  version: string;
  capabilities: string[];
  status: string;
  pools: Record<string, PoolInfo>;
}

export interface Pilot {
  manifest: Manifest;
  items: Item[];
  passages: Map<string, Passage>;
  lessons: Lesson[];
  prerequisites: { capability: string; requires: string; source?: string }[];
  names: Map<string, string>;
}

/** Load the pilot's content from the repository files (the same files the app ships). */
export function loadPilot(content = CONTENT): Pilot {
  const manifest = read<Manifest>(join(content, "pilot", "manifest.json"));
  const all = [...read<Item[]>(join(content, "items", "code-items.json")), ...read<Item[]>(join(content, "items", "e2a-items.json")), ...read<Item[]>(join(content, "items", "e2b-items.json")), ...read<Item[]>(join(content, "pilot", "items.json"))];
  const items = all.filter((i) => manifest.capabilities.includes(i.target)).sort((a, b) => a.target.localeCompare(b.target) || a.b - b.b || a.id.localeCompare(b.id));
  const passages = new Map([...read<Passage[]>(join(content, "items", "passages.json")), ...read<Passage[]>(join(content, "pilot", "passages.json"))].map((p) => [p.id, p]));
  const lessons = read<{ lessons: Lesson[] }>(join(content, "web", "lessons.json")).lessons.filter((l) => manifest.capabilities.includes(l.capability));
  const fw = read<{ prerequisites: { capability: string; requires: string; source?: string }[]; strands: { substrands: { capabilities: { id: string; name: string }[] }[] }[] }>(join(content, "framework", "en-0.2.0.json"));
  const names = new Map(fw.strands.flatMap((s) => s.substrands.flatMap((ss) => ss.capabilities.map((c) => [c.id, c.name] as [string, string]))));
  const prerequisites = fw.prerequisites.filter((p) => manifest.capabilities.includes(p.capability) || manifest.capabilities.includes(p.requires));
  return { manifest, items, passages, lessons, prerequisites, names };
}

/** A short fingerprint of exactly what the reviewer sees (canonical JSON, sorted keys). */
export function fingerprint(x: unknown): string {
  const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Json).sort(([a], [b]) => a.localeCompare(b)).map(([k, w]) => [k, canon(w)])) : v);
  return createHash("sha256").update(JSON.stringify(canon(x))).digest("hex").slice(0, 16);
}

export const DECISIONS = ["approve", "reject", "revise", "discuss"] as const;
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
}
export const REVIEW_COLUMNS = ["decision", "issues", "comment", "reviewer", "date"] as const;
export const ROW_COLUMNS: (keyof ReviewRow)[] = ["kind", "id", "version", "capability", "skill", "use", "difficulty", "format", "passage", "content", "key", "misconceptions", "rationale", "status", "fingerprint"];

const USE_WORDS: Record<string, string> = {
  diagnosis: "diagnosis (first checks)",
  practice: "practice during teaching only",
  confirmation: "confirmation after teaching only",
  retention: "later (retention) check only",
};

function keyOf(i: Item): string {
  if (i.answers) return i.answers.join(" | ");
  if (i.answer !== undefined && i.options) return i.options[i.answer];
  if (i.answer_set && i.options) return i.answer_set.map((k) => i.options![k]).join(" + ");
  if (i.answer_pairs && i.left && i.options) return i.left.map((l, k) => `${l} → ${i.options![i.answer_pairs![k]]}`).join("; ");
  return "";
}

/** Every reviewable row: questions, passages, lessons and prerequisite edges, in a stable order. */
export function reviewRows(p: Pilot): ReviewRow[] {
  const rows: ReviewRow[] = [];
  const pool = (id: string) => p.manifest.pools[id];
  for (const i of p.items) {
    const info = pool(i.id);
    const passage = i.passage ? p.passages.get(i.passage) : undefined;
    const tags = [...Object.entries(i.wrong ?? {}).map(([w, t]) => `"${w}" → ${t}`), ...Object.entries(i.distractor_tags ?? {}).map(([k, t]) => `"${i.options?.[Number(k)]}" → ${t}`)].join("; ");
    rows.push({
      kind: "question",
      id: i.id,
      version: String(i.version),
      capability: i.target,
      skill: p.names.get(i.target) ?? i.target,
      use: info ? `${USE_WORDS[info.pool]}${info.unfamiliar ? "; unfamiliar example (transfer)" : ""}` : "not reserved",
      difficulty: String(i.b),
      format: i.format,
      passage: passage ? `${passage.id}: ${passage.title}` : "",
      content: [i.prompt, ...(i.left ? [`Match: ${i.left.join(" / ")}`] : []), ...(i.options ? [`Options: ${i.options.map((o, k) => `(${k + 1}) ${o}`).join("  ")}`] : [])].join("\n"),
      key: keyOf(i),
      misconceptions: tags,
      rationale: i.rationale ?? "",
      status: `${i.review ?? "candidate"}; ${info?.origin === "new-pr24" ? "new in PR #24 (AI-assisted draft)" : "existing question"}`,
      fingerprint: fingerprint(i),
    });
  }
  const used = new Set(p.items.map((i) => i.passage).filter((x): x is string => !!x));
  for (const id of [...used].sort()) {
    const ps = p.passages.get(id)!;
    const caps = [...new Set(p.items.filter((i) => i.passage === id).map((i) => i.target))];
    rows.push({ kind: "passage", id, version: "", capability: caps.join(" "), skill: caps.map((c) => p.names.get(c) ?? c).join(", "), use: "", difficulty: String(ps.band), format: "passage", passage: ps.title, content: ps.text, key: "", misconceptions: "", rationale: "", status: id.startsWith("plt.") ? "new in PR #24 (AI-assisted draft)" : "existing passage", fingerprint: fingerprint(ps) });
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
    });
  for (const e of p.prerequisites)
    rows.push({ kind: "prerequisite", id: `${e.capability} requires ${e.requires}`, version: "", capability: e.capability, skill: `${p.names.get(e.capability)} requires ${p.names.get(e.requires)}`, use: "planning", difficulty: "", format: "prerequisite", passage: "", content: `Is ${p.names.get(e.requires)} a prerequisite of ${p.names.get(e.capability)}? The plan checks it first when ${p.names.get(e.capability)} is found hard.`, key: "", misconceptions: "", rationale: e.source ?? "", status: "candidate (OpenPath's own; no reference states it)", fingerprint: fingerprint(e) });
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
    const decision = get("decision").toLowerCase();
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
export function currentDecisions(rows: ReviewRow[], reviews: ReviewRecord[]): Map<string, ReviewRecord> {
  const out = new Map<string, ReviewRecord>();
  const fp = new Map(rows.map((r) => [`${r.kind}|${r.id}`, r.fingerprint]));
  for (const r of reviews) if (fp.get(`${r.kind}|${r.id}`) === r.fingerprint) out.set(`${r.kind}|${r.id}`, r);
  return out;
}

// ---------------------------------------------------------------- HTML for reading

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function exportHtml(p: Pilot, rows: ReviewRow[]): string {
  const caps = p.manifest.capabilities;
  const section = (cap: string) => {
    const r = rows.filter((x) => x.capability.split(" ").includes(cap));
    const block = (x: ReviewRow) => `<article class="${x.kind}"><h4>${esc(x.kind)} <code>${esc(x.id)}</code>${x.version ? ` v${esc(x.version)}` : ""}</h4><p class="meta">${[x.use, x.difficulty && `difficulty ${x.difficulty}`, x.format, x.status].filter(Boolean).map(esc).join(" · ")}</p>${x.passage && x.kind === "question" ? `<p class="meta">Passage: ${esc(x.passage)}</p>` : ""}<pre>${esc(x.content)}</pre>${x.key ? `<p><b>Key:</b> ${esc(x.key)}</p>` : ""}${x.misconceptions ? `<p><b>Wrong answers tagged:</b> ${esc(x.misconceptions)}</p>` : ""}${x.rationale ? `<p class="meta">${esc(x.rationale)}</p>` : ""}<p class="meta">fingerprint ${esc(x.fingerprint)}</p></article>`;
    return `<h2>${esc(p.names.get(cap) ?? cap)}</h2><p class="meta">${esc(cap)}</p>${["lesson", "passage", "question"].map((k) => r.filter((x) => x.kind === k)).map((list) => list.map(block).join("")).join("")}`;
  };
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pilot content for review</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:16px;max-width:52rem;color:#222}h2{margin-top:2.5rem;border-bottom:2px solid #ccd}article{border:1px solid #dde;border-radius:8px;padding:8px 12px;margin:10px 0}article.lesson{background:#f4f7ff}article.passage{background:#fbfaf4}pre{white-space:pre-wrap;font:inherit;margin:4px 0}.meta{color:#666;font-size:13px;margin:2px 0}h4{margin:0}.warn{background:#fff4d6;padding:10px;border-radius:8px}</style>
<h1>OpenPath: five-capability pilot content for educator review</h1>
<p class="warn">Content version ${esc(p.manifest.version)}. Everything here is a candidate awaiting review: nothing is approved. Record decisions in the CSV (one row per item) and return it; decisions are recorded with your name, the date and a fingerprint of exactly what you reviewed.</p>
${p.prerequisites.length ? `<h2>Prerequisite assumptions</h2>${rows.filter((x) => x.kind === "prerequisite").map((x) => `<article><pre>${esc(x.content)}</pre><p class="meta">${esc(x.status)} · ${esc(x.rationale)}</p></article>`).join("")}` : ""}
${caps.map(section).join("\n")}`;
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
  const rows = reviewRows(p);
  const decided = currentDecisions(rows, reviews);
  const pool = (id: string) => p.manifest.pools[id]?.pool;
  const lines: string[] = [];
  lines.push("# Pilot content: coverage, review status and readiness", "");
  lines.push(`Generated by \`node tools/english/pilot/review.ts report\` from content version **${p.manifest.version}**. Do not edit by hand.`, "");
  lines.push("**Software readiness** means the app can run diagnosis → teaching → a fresh confirming check → a later check on this content. **Educational validation** means an educator has approved the content. They are reported separately: the first can be yes while the second is no.", "");
  const approvedAll = [...decided.values()].filter((r) => r.decision === "approve").length;
  lines.push(`Review decisions recorded: ${decided.size} of ${rows.length} rows (${approvedAll} approved). Approval in the app is not automatic.`, "");
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
    const easy = (u: keyof typeof READY_MIN) => items.filter((i) => pool(i.id) === u && i.b <= 4).length;
    const lessonSteps = new Set(lessons.map((l) => l.step));
    const easySteps = [...new Set(items.filter((i) => i.b <= 4 && i.step).map((i) => i.step!))];
    const untaught = easySteps.filter((s) => !lessonSteps.has(s));
    lines.push(`- Questions: ${items.length} (${items.filter((i) => p.manifest.pools[i.id]?.origin === "new-pr24").length} new candidates)${passages.size ? `, on ${passages.size} passages` : ""}.`);
    lines.push(`- Teaching: ${lessons.length} lesson${lessons.length === 1 ? "" : "s"} (${lessons.map((l) => l.step).join(", ") || "none"}).${untaught.length ? ` Steps used at the easier levels with no lesson: ${untaught.join(", ")}.` : ""}`);
    lines.push(`- Awaiting review: ${capRows.length - approved} of ${capRows.length} rows (questions, passages, lessons, prerequisites); approved: ${approved}.`);
    const gaps: string[] = [];
    for (const u of Object.keys(READY_MIN) as (keyof typeof READY_MIN)[]) if (easy(u) < READY_MIN[u]) gaps.push(`only ${easy(u)} ${u} question${easy(u) === 1 ? "" : "s"} at difficulty ≤ 4 (needs ${READY_MIN[u]})`);
    if (!lessons.length) gaps.push("no teaching");
    if (items.filter((i) => pool(i.id) === "confirmation" || pool(i.id) === "retention").length < 12) gaps.push("enough reserved questions for one confirming check and one later check, not for repeated cycles");
    if (cap.startsWith("EN.RDG")) gaps.push("the older reading questions come two per passage; only one per passage is asked in a session, and the engine still treats them as independent");
    if (items.some((i) => i.b > 4.25) && !items.some((i) => (pool(i.id) === "confirmation" || pool(i.id) === "retention") && i.b > 4.25))
      gaps.push("no confirmation or later-check questions above difficulty 4: older or stronger learners cannot be confirmed at their level");
    lines.push(`- Outstanding gaps: ${gaps.length ? gaps.join("; ") : "none found by the checks"}.`);
    const softwareReady = (Object.keys(READY_MIN) as (keyof typeof READY_MIN)[]).every((u) => easy(u) >= READY_MIN[u]) && lessons.length > 0;
    lines.push(`- **Software ready for supervised testing:** ${softwareReady ? "yes, at difficulty ≤ 4" : "no"}. **Educationally validated:** ${approved === capRows.length ? "yes" : `no (${approved} of ${capRows.length} approved)`}. **Approved for children:** no.`, "");
  }
  lines.push("## Not covered by this report", "", "- Whether any question, passage or lesson is correct, clear or suitable: that is the educator's review.", "- Safeguarding, consent, data protection and the session protocol for supervised testing (see PILOT_READINESS_DOUBLING.md).", "");
  return lines.join("\n");
}

// ---------------------------------------------------------------- command line

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  const p = loadPilot();
  const rows = reviewRows(p);
  const reviews: ReviewRecord[] = existsSync(REVIEWS) ? read<ReviewRecord[]>(REVIEWS) : [];
  if (cmd === "export") {
    const dir = arg ?? join(REPO, "docs", "english", "review", "pilot");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "pilot-review.csv"), exportCsv(rows));
    writeFileSync(join(dir, "pilot-review.html"), exportHtml(p, rows));
    console.log(`wrote ${rows.length} rows (${rows.filter((r) => r.kind === "question").length} questions, ${rows.filter((r) => r.kind === "passage").length} passages, ${rows.filter((r) => r.kind === "lesson").length} lessons, ${rows.filter((r) => r.kind === "prerequisite").length} prerequisites) to ${dir}`);
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
  } else console.log("usage: review.ts export [dir] | import <file.csv> | report [--check]");
}
