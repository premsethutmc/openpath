/**
 * Educator validation v1: one consolidated review package for the Grade 8 essay-to-mastery content, and the decision
 * workflow (independent review, disagreement resolution, structured export). Nothing here changes content or marks
 * anything approved in the app. Approved decisions are applied later, by a separate, explicit content-release change.
 *
 *   node tools/english/educator/review.ts export [--check]
 *        write docs/product/essay-learning/educator-review-v1/ (records.json, questions.csv, lessons.csv,
 *        competencies.csv, decisions-template.csv, INVENTORY.md); --check: is it current?
 *   node tools/english/educator/review.ts reconcile <reviewer.csv> <reviewer.csv> … [--out adjudication.csv]
 *        compare independent reviewers: agreement (percent, Cohen's kappa) and the rows that need adjudication
 *   node tools/english/educator/review.ts decisions <reviewer.csv> … [--adjudication adjudication.csv] [--out decisions.json]
 *        the structured decisions (educator-decisions@1) for the content pipeline: resolved rows only
 *
 * Decisions: approve | revise | reject | unable_to_determine, with a reason, a suggested correction and the
 * reviewer's identifier. A row is resolved when at least two reviewers agree and none disagrees, or an adjudicator
 * decides it. "unable_to_determine" never resolves a row. A decision whose fingerprint no longer matches the
 * content (the content changed after export) is refused as stale.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type CodeItem, contentStatus, type EssayContext, type Item, itemEligibility, POOL_ROLE } from "../../../packages/english-core/src/index.ts";
import { loadProgressions } from "../bank/checks.ts";
import { loadAppEssayContext } from "../essay-load.ts";
import { REPO } from "../load.ts";
import { fingerprint, ISSUES, parseCsv, toCsv } from "../pilot/review.ts";
import { loadSupplementItems, loadSupplementManifest } from "../supplement/load.ts";

export const PACKAGE_DIR = join(REPO, "docs", "product", "essay-learning", "educator-review-v1");
export const DECISIONS = ["approve", "revise", "reject", "unable_to_determine"] as const;
export type Decision = (typeof DECISIONS)[number];
export const CONTENT_VERSION = "educator-review@1";

type Code = { kind: "code" } & CodeItem;
type Json = Record<string, unknown>;
const read = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

export interface QuestionRecord {
  kind: "question";
  id: string;
  version: number;
  set: "proposed-supplement" | "existing-for-review" | "pilot-additional";
  competency: string;
  competency_name: string;
  response_type: "recognition" | "constructed";
  format: string;
  question: string;
  passage: string;
  options: string;
  expected_answer: string;
  explanation: string;
  misconceptions: string;
  difficulty_b: number;
  difficulty_justification: string;
  intended_role: string;
  evidence_status: string;
  fingerprint: string;
}
export interface LessonRecord {
  kind: "lesson";
  id: string;
  version: number;
  set: "pilot-lesson";
  competency: string;
  competency_name: string;
  title: string;
  rule: string;
  examples: string;
  tip: string;
  check_question: string;
  check_options: string;
  check_answer: string;
  check_explanation: string;
  evidence_status: string;
  fingerprint: string;
}
export interface CompetencyRecord {
  kind: "competency";
  id: string;
  version: number;
  set: "grade8-profile";
  name: string;
  area: string;
  specified: string;
  band_descriptors: string;
  band5_descriptor: string;
  prerequisites: string;
  curriculum_mappings: string;
  target_band: string;
  target_status: string;
  review_question: string;
  fingerprint: string;
}
export type ReviewRecord = QuestionRecord | LessonRecord | CompetencyRecord;

const RECOGNITION = new Set(["choice", "multi", "match", "order"]);
const letter = (k: number) => String.fromCharCode(65 + k);

export function keyOf(i: Code): string {
  const kind = i.format.split(":")[0];
  if (kind === "choice") return `${letter(i.answer!)}. ${i.options![i.answer!]}`;
  if (kind === "typed") return i.answers!.join(" / ");
  if (kind === "multi") return i.answer_set!.map((k) => `${letter(k)}. ${i.options![k]}`).join("; ");
  if (kind === "order") return i.answer_order!.map((k) => i.options![k]).join(" → ");
  if (kind === "match") return i.left!.map((l, k) => `${l} → ${i.options![i.answer_pairs![k]]}`).join("; ");
  return "";
}

/** The 181 existing questions identified for review (ASSESSMENT_RETENTION.md): diagnostic or check questions, not validated. */
export function existingForReview(ectx: EssayContext): string[] {
  const out: string[] = [];
  for (const c of ectx.profile.profile.competencies.filter((x) => x.specified && x.expectedBand !== null))
    for (const e of itemEligibility(ectx, c.capability)) if (e.status !== "validated" && (e.roles.includes("independent_verification") || e.roles.includes("diagnostic"))) out.push(e.item);
  return out;
}

export const PILOT_COMPETENCIES = ["EN.GRM.VERB.sva", "EN.GRM.VERB.present_past_simple", "EN.GRM.NOUN.articles"];

export interface Inventory {
  records: ReviewRecord[];
  counts: Record<string, number>;
  discrepancies: string[];
}

export function buildInventory(): Inventory {
  const ectx = loadAppEssayContext();
  const prog = loadProgressions();
  const manifest = loadSupplementManifest();
  const ownerApproved = new Set(read<{ id: string; version: string; decision: string; authority: string }[]>(join(REPO, "content", "english", "pilot", "reviews.json")).filter((r) => r.decision === "approve" && r.authority === "product-owner").map((r) => `${r.id}@${r.version}`));
  const name = (cap: string) => ectx.profile.byCapability.get(cap)?.name ?? ectx.ctx.index.names.get(cap) ?? cap;
  const passages = ectx.ctx.content.passages;
  const discrepancies: string[] = [];

  const question = (i: Code, set: QuestionRecord["set"], proposedPool?: string): QuestionRecord => {
    const kind = i.format.split(":")[0];
    const step = prog.capabilities[i.target]?.steps.find((s) => s.id === i.step);
    const roles = itemEligibility(ectx, i.target).find((e) => e.item === i.id)?.roles ?? [];
    const pool = ectx.pools?.get(i.id);
    const status = contentStatus(i as Item);
    const content = { id: i.id, version: i.version, target: i.target, format: i.format, b: i.b, prompt: i.prompt, passage: i.passage ?? null, options: i.options ?? null, left: i.left ?? null, key: keyOf(i), step: i.step ?? null };
    return {
      kind: "question",
      id: i.id,
      version: i.version,
      set,
      competency: i.target,
      competency_name: name(i.target),
      response_type: RECOGNITION.has(kind) ? "recognition" : "constructed",
      format: i.format,
      question: i.prompt,
      passage: i.passage ? (passages.get(i.passage)?.text ?? i.passage) : "",
      options: [...(i.left ? [`match: ${i.left.join(", ")}`] : []), ...(i.options ?? []).map((o, k) => `${letter(k)}. ${o}`)].join(" | "),
      expected_answer: keyOf(i),
      explanation: [i.rationale, (i as { explain?: string }).explain].filter(Boolean).join(" "),
      misconceptions: [...new Set([...Object.values(i.distractor_tags ?? {}), ...Object.values(i.wrong ?? {}), ...(i.addresses ?? [])])].join(", "),
      difficulty_b: i.b,
      difficulty_justification: step ? `Expert estimate (not calibrated). Ladder step "${step.id}" at band ${step.band}: ${step.feature} b ${i.b} is ${(i.b - step.band >= 0 ? "+" : "") + (i.b - step.band).toFixed(2)} from the step.` : `Expert estimate (not calibrated); no ladder step recorded.`,
      intended_role: [
        set === "proposed-supplement" ? `proposed: ${proposedPool === "retention" ? "delayed retention check" : "independent check"} (after review)` : "",
        pool ? `pilot pool: ${pool} (${POOL_ROLE[pool]})` : "",
        `allocation now: ${roles.length ? roles.join(", ") : "none"}`,
      ]
        .filter(Boolean)
        .join("; "),
      evidence_status: [
        status === "provisional" ? "provisional: never changes an estimate" : `${status}: counts as evidence under the current policy`,
        `content review: ${i.review ?? "none"}`,
        ownerApproved.has(`${i.id}@${i.version}`) ? "owner-approved for product use (not an educator review)" : "",
        "educator review: none",
      ]
        .filter(Boolean)
        .join("; "),
      fingerprint: fingerprint(content),
    };
  };

  // questions: the proposed supplement, the existing questions identified for review, and any pilot question outside both
  const supplement = loadSupplementItems().filter((i): i is Code => i.kind === "code");
  const existingIds = existingForReview(ectx);
  const seen = new Set<string>();
  const records: ReviewRecord[] = [];
  for (const i of supplement) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    records.push(question(i, "proposed-supplement", manifest.proposedPools[i.id]));
  }
  for (const id of existingIds) {
    if (seen.has(id)) {
      discrepancies.push(`${id} is listed twice (supplement and existing): kept once`);
      continue;
    }
    seen.add(id);
    records.push(question(ectx.ctx.content.items.get(id) as Code, "existing-for-review"));
  }
  // every other question a pilot sequence could use (practice, confirmation, retention pools) on the pilot competencies
  for (const cap of PILOT_COMPETENCIES)
    for (const e of itemEligibility(ectx, cap)) {
      if (seen.has(e.item) || !e.roles.length) continue;
      seen.add(e.item);
      records.push(question(ectx.ctx.content.items.get(e.item) as Code, "pilot-additional"));
    }

  // lessons for the pilot competencies
  const lessons = read<{ lessons: (Json & { id: string; capability: string; title: string; rule: string; examples: { text: string }[]; tip?: string; check: { prompt: string; options: string[]; answer: number; explain: string } })[] }>(join(REPO, "content", "english", "web", "lessons.json"));
  for (const l of lessons.lessons.filter((x) => PILOT_COMPETENCIES.includes(x.capability)))
    records.push({
      kind: "lesson",
      id: l.id,
      version: 1,
      set: "pilot-lesson",
      competency: l.capability,
      competency_name: name(l.capability),
      title: l.title,
      rule: l.rule,
      examples: l.examples.map((e) => e.text).join(" | "),
      tip: l.tip ?? "",
      check_question: l.check.prompt,
      check_options: l.check.options.map((o, k) => `${letter(k)}. ${o}`).join(" | "),
      check_answer: `${letter(l.check.answer)}. ${l.check.options[l.check.answer]}`,
      check_explanation: l.check.explain,
      evidence_status: `teaching content; status ${(lessons as unknown as { status?: string }).status ?? "unknown"}; educator review: none`,
      fingerprint: fingerprint(l),
    });

  // competencies: definitions, prerequisites, curriculum mappings and provisional targets
  for (const c of ectx.profile.profile.competencies) {
    const leaf = ectx.ctx.index.leaves.get(c.capability)!;
    const bands = (leaf.bands ?? {}) as Record<string, string>;
    const content = { capability: c.capability, bands, requires: ectx.ctx.index.requires.get(c.capability) ?? [], curriculum: c.curriculum, target: c.expectedBand, status: c.expectedBandStatus ?? null };
    records.push({
      kind: "competency",
      id: c.capability,
      version: ectx.profile.profile.version,
      set: "grade8-profile",
      name: c.name,
      area: c.area,
      specified: c.specified ? "yes" : "no: no descriptors, questions or lessons yet",
      band_descriptors: Object.entries(bands).map(([b, d]) => `band ${b}: ${d}`).join(" | "),
      band5_descriptor: bands["5"] ?? "none: the framework describes bands 2, 4, 6 and 8 only",
      prerequisites: (ectx.ctx.index.requires.get(c.capability) ?? []).map((p) => `${p} (${name(p)})`).join("; ") || "none",
      curriculum_mappings: c.curriculum.map((r) => `${r.scheme}${r.code ? `: ${r.code}` : ""}${r.grade ? ` (grade ${r.grade})` : ""}; ${r.note}; validated: ${r.validated}`).join(" | "),
      target_band: c.expectedBand === null ? "none" : String(c.expectedBand),
      target_status: c.expectedBand === null ? "no target" : (c.expectedBandStatus ?? "unlabelled"),
      review_question: c.expectedBand === null ? "Should this competency have a Grade 8 target? Are the curriculum mappings right?" : `Is band ${c.expectedBand} the right Grade 8 expectation (there is no band-${c.expectedBand} descriptor)? Are the descriptors, prerequisites and curriculum mappings right?`,
      fingerprint: fingerprint(content),
    });
  }

  const q = records.filter((r): r is QuestionRecord => r.kind === "question");
  const counts = {
    "proposed-supplement": q.filter((r) => r.set === "proposed-supplement").length,
    "existing-for-review": q.filter((r) => r.set === "existing-for-review").length,
    "pilot-additional": q.filter((r) => r.set === "pilot-additional").length,
    questions: q.length,
    recognition: q.filter((r) => r.response_type === "recognition").length,
    constructed: q.filter((r) => r.response_type === "constructed").length,
    lessons: records.filter((r) => r.kind === "lesson").length,
    competencies: records.filter((r) => r.kind === "competency").length,
  };
  if (counts["proposed-supplement"] !== 96) discrepancies.push(`the brief states 96 proposed questions; the repository has ${counts["proposed-supplement"]}`);
  if (counts["existing-for-review"] !== 181) discrepancies.push(`the brief states 181 existing questions for review; the repository rule gives ${counts["existing-for-review"]}`);
  if (counts["pilot-additional"] > 0) discrepancies.push(`${counts["pilot-additional"]} further questions on the pilot competencies (practice, confirmation and retention pools) are not in the 181 but a pilot sequence would use them: added as "pilot-additional"`);
  const ids = q.map((r) => r.id);
  if (new Set(ids).size !== ids.length) discrepancies.push("duplicate question ids remain after deduplication");
  const dupContent = new Map<string, string>();
  for (const r of q) {
    const k = `${r.competency}§${r.question.toLowerCase()}§${r.options.toLowerCase()}`;
    if (dupContent.has(k)) discrepancies.push(`${r.id} has the same question and options as ${dupContent.get(k)}`);
    else dupContent.set(k, r.id);
  }
  return { records, counts, discrepancies };
}

// ---------------------------------------------------------------- export

const QUESTION_COLUMNS: (keyof QuestionRecord)[] = ["id", "version", "set", "competency", "competency_name", "response_type", "format", "question", "passage", "options", "expected_answer", "explanation", "misconceptions", "difficulty_b", "difficulty_justification", "intended_role", "evidence_status", "fingerprint"];
const LESSON_COLUMNS: (keyof LessonRecord)[] = ["id", "version", "competency", "competency_name", "title", "rule", "examples", "tip", "check_question", "check_options", "check_answer", "check_explanation", "evidence_status", "fingerprint"];
const COMPETENCY_COLUMNS: (keyof CompetencyRecord)[] = ["id", "version", "name", "area", "specified", "band_descriptors", "band5_descriptor", "prerequisites", "curriculum_mappings", "target_band", "target_status", "review_question", "fingerprint"];
export const DECISION_COLUMNS = ["record_kind", "record_id", "version", "fingerprint", "reviewer_id", "decision", "reason", "suggested_correction", "issues", "date"] as const;

function inventoryMarkdown(inv: Inventory): string {
  const c = inv.counts;
  return [
    "# Inventory and reconciliation",
    "",
    "Generated by `node tools/english/educator/review.ts export` from the repository; do not edit by hand.",
    "",
    "| Set | Records | Rule |",
    "|---|---:|---|",
    `| Proposed supplement | ${c["proposed-supplement"]} | content/english/proposed/g8-supplement-v1/items.json (provisional, not loaded by the app) |`,
    `| Existing questions for review | ${c["existing-for-review"]} | Live bank as the app ships it: the 16 specified Grade 8 competencies, questions the allocation may use for diagnosis or independent checks, not educator-validated |`,
    `| Pilot-additional questions | ${c["pilot-additional"]} | Other questions a pilot sequence on the three pilot competencies would use (practice, confirmation and retention pools) |`,
    `| **All questions** | **${c.questions}** | ${c.recognition} recognition (choice, multi, order, match), ${c.constructed} constructed (typed) |`,
    `| Pilot lessons | ${c.lessons} | content/english/web/lessons.json, the three pilot competencies |`,
    `| Competencies | ${c.competencies} | content/english/essay/g8-writing.json with the framework's descriptors and prerequisites |`,
    "",
    "Essay benchmark (15 essays, 3 rewrites, reference annotations): `../essay-validation-v1/`.",
    "",
    "## Discrepancies against the stated totals",
    "",
    ...(inv.discrepancies.length ? inv.discrepancies.map((d) => `- ${d}`) : ["None."]),
    "",
  ].join("\n");
}

export function exportPackage(dir = PACKAGE_DIR): Map<string, string> {
  const inv = buildInventory();
  const files = new Map<string, string>();
  const qs = inv.records.filter((r): r is QuestionRecord => r.kind === "question");
  const ls = inv.records.filter((r): r is LessonRecord => r.kind === "lesson");
  const cs = inv.records.filter((r): r is CompetencyRecord => r.kind === "competency");
  const str = (v: unknown) => String(v ?? "");
  files.set("records.json", JSON.stringify({ schema: "educator-review-records@1", content_version: CONTENT_VERSION, counts: inv.counts, discrepancies: inv.discrepancies, records: inv.records }, null, 1) + "\n");
  files.set("questions.csv", "﻿" + toCsv(QUESTION_COLUMNS, qs.map((r) => QUESTION_COLUMNS.map((k) => str(r[k])))));
  files.set("lessons.csv", "﻿" + toCsv(LESSON_COLUMNS, ls.map((r) => LESSON_COLUMNS.map((k) => str(r[k])))));
  files.set("competencies.csv", "﻿" + toCsv(COMPETENCY_COLUMNS, cs.map((r) => COMPETENCY_COLUMNS.map((k) => str(r[k])))));
  files.set("decisions-template.csv", "﻿" + toCsv([...DECISION_COLUMNS], inv.records.map((r) => [r.kind, r.id, String(r.version), r.fingerprint, "", "", "", "", "", ""])));
  files.set("INVENTORY.md", inventoryMarkdown(inv));
  mkdirSync(dir, { recursive: true });
  for (const [f, text] of files) writeFileSync(join(dir, f), text);
  return files;
}

// ---------------------------------------------------------------- decisions

export interface DecisionRow {
  kind: string;
  id: string;
  version: string;
  fingerprint: string;
  reviewer: string;
  decision: Decision;
  reason: string;
  correction: string;
  issues: string[];
  date: string;
}

/** Read one reviewer's decision file (CSV), checking each row against the current records. */
export function readDecisions(csv: string, records: ReviewRecord[]): { rows: DecisionRow[]; problems: string[] } {
  const table = parseCsv(csv);
  const header = table[0]?.map((h) => h.trim()) ?? [];
  const col = (n: string) => header.indexOf(n);
  for (const n of DECISION_COLUMNS) if (col(n) < 0) return { rows: [], problems: [`missing column "${n}"`] };
  const byKey = new Map(records.map((r) => [`${r.kind}:${r.id}`, r]));
  const rows: DecisionRow[] = [];
  const problems: string[] = [];
  table.slice(1).forEach((t, k) => {
    const g = (n: string) => (t[col(n)] ?? "").trim();
    const decision = g("decision").toLowerCase().replace(/\s+/g, "_") as Decision;
    if (!decision) return; // not reviewed yet
    const line = `row ${k + 2} (${g("record_kind")} ${g("record_id")})`;
    const rec = byKey.get(`${g("record_kind")}:${g("record_id")}`);
    if (!rec) return problems.push(`${line}: no such record`);
    if (!(DECISIONS as readonly string[]).includes(decision)) return problems.push(`${line}: decision must be one of ${DECISIONS.join(", ")}`);
    if (g("fingerprint") !== rec.fingerprint) return problems.push(`${line}: stale: the content changed after this was exported (fingerprint ${g("fingerprint")}, now ${rec.fingerprint})`);
    if (!g("reviewer_id")) return problems.push(`${line}: reviewer_id is required`);
    if ((decision === "revise" || decision === "reject" || decision === "unable_to_determine") && !g("reason")) return problems.push(`${line}: a ${decision} decision needs a reason`);
    if (decision === "revise" && !g("suggested_correction")) return problems.push(`${line}: a revise decision needs a suggested correction`);
    const issues = g("issues") ? g("issues").split(/[;|]/).map((x) => x.trim()).filter(Boolean) : [];
    const bad = issues.find((x) => !(ISSUES as readonly string[]).includes(x));
    if (bad) return problems.push(`${line}: unknown issue "${bad}" (allowed: ${ISSUES.join(", ")})`);
    rows.push({ kind: rec.kind, id: rec.id, version: String(rec.version), fingerprint: rec.fingerprint, reviewer: g("reviewer_id"), decision, reason: g("reason"), correction: g("suggested_correction"), issues, date: g("date") });
  });
  return { rows, problems };
}

export interface Reconciled {
  key: string;
  kind: string;
  id: string;
  fingerprint: string;
  decisions: DecisionRow[];
  state: "agreed" | "single" | "disagreement" | "undetermined";
  agreed: Decision | null;
}

export function reconcile(rows: DecisionRow[]): Reconciled[] {
  const by = new Map<string, DecisionRow[]>();
  for (const r of rows) {
    const k = `${r.kind}:${r.id}`;
    // one decision per reviewer per record: the latest row in the files wins
    const list = (by.get(k) ?? []).filter((x) => x.reviewer !== r.reviewer);
    by.set(k, [...list, r]);
  }
  return [...by.entries()]
    .map(([key, ds]) => {
      const set = new Set(ds.map((d) => d.decision));
      const state: Reconciled["state"] = set.has("unable_to_determine") ? "undetermined" : ds.length < 2 ? "single" : set.size === 1 ? "agreed" : "disagreement";
      return { key, kind: ds[0].kind, id: ds[0].id, fingerprint: ds[0].fingerprint, decisions: ds, state, agreed: state === "agreed" ? ds[0].decision : null };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Agreement between each pair of reviewers on the records both decided: percent agreement and Cohen's kappa. */
export function agreement(rows: DecisionRow[]): { a: string; b: string; common: number; percent: number | null; kappa: number | null }[] {
  const reviewers = [...new Set(rows.map((r) => r.reviewer))].sort();
  const out = [];
  for (let i = 0; i < reviewers.length; i++)
    for (let j = i + 1; j < reviewers.length; j++) {
      const A = new Map(rows.filter((r) => r.reviewer === reviewers[i]).map((r) => [`${r.kind}:${r.id}`, r.decision]));
      const B = new Map(rows.filter((r) => r.reviewer === reviewers[j]).map((r) => [`${r.kind}:${r.id}`, r.decision]));
      const common = [...A.keys()].filter((k) => B.has(k));
      if (!common.length) {
        out.push({ a: reviewers[i], b: reviewers[j], common: 0, percent: null, kappa: null });
        continue;
      }
      const po = common.filter((k) => A.get(k) === B.get(k)).length / common.length;
      const pe = DECISIONS.reduce((s, d) => s + (common.filter((k) => A.get(k) === d).length / common.length) * (common.filter((k) => B.get(k) === d).length / common.length), 0);
      out.push({ a: reviewers[i], b: reviewers[j], common: common.length, percent: Math.round(po * 1000) / 1000, kappa: pe === 1 ? null : Math.round(((po - pe) / (1 - pe)) * 1000) / 1000 });
    }
  return out;
}

export const ADJUDICATION_COLUMNS = ["record_kind", "record_id", "fingerprint", "state", "reviewer_decisions", "adjudicator_id", "final_decision", "reason", "suggested_correction", "date"] as const;

export function adjudicationCsv(rec: Reconciled[]): string {
  const need = rec.filter((r) => r.state === "disagreement" || r.state === "undetermined");
  return "﻿" + toCsv([...ADJUDICATION_COLUMNS], need.map((r) => [r.kind, r.id, r.fingerprint, r.state, r.decisions.map((d) => `${d.reviewer}: ${d.decision}${d.reason ? ` (${d.reason})` : ""}`).join(" | "), "", "", "", "", ""]));
}

export interface ExportedDecisions {
  schema: "educator-decisions@1";
  content_version: string;
  promotion: string;
  resolved: { kind: string; id: string; version: string; fingerprint: string; decision: Decision; basis: "agreed" | "adjudicated"; reviewers: string[]; adjudicator?: string; reasons: string[]; suggested_corrections: string[] }[];
  unresolved: { kind: string; id: string; state: string }[];
  agreement: ReturnType<typeof agreement>;
}

/** The structured decisions for the content pipeline. Resolved rows only; nothing is promoted by this export. */
export function exportDecisions(rows: DecisionRow[], adjudication: string | null, records: ReviewRecord[]): { out: ExportedDecisions; problems: string[] } {
  const rec = reconcile(rows);
  const problems: string[] = [];
  const adj = new Map<string, { adjudicator: string; decision: Decision; reason: string; correction: string }>();
  if (adjudication) {
    const t = parseCsv(adjudication);
    const h = t[0].map((x) => x.trim());
    const c = (n: string) => h.indexOf(n);
    const fp = new Map(records.map((r) => [`${r.kind}:${r.id}`, r.fingerprint]));
    t.slice(1).forEach((row, k) => {
      const g = (n: string) => (row[c(n)] ?? "").trim();
      const d = g("final_decision").toLowerCase().replace(/\s+/g, "_") as Decision;
      if (!d) return;
      const key = `${g("record_kind")}:${g("record_id")}`;
      if (fp.get(key) !== g("fingerprint")) return problems.push(`adjudication row ${k + 2}: stale or unknown record ${key}`);
      if (d === "unable_to_determine" || !(DECISIONS as readonly string[]).includes(d)) return problems.push(`adjudication row ${k + 2}: final_decision must be approve, revise or reject`);
      if (!g("adjudicator_id")) return problems.push(`adjudication row ${k + 2}: adjudicator_id is required`);
      adj.set(key, { adjudicator: g("adjudicator_id"), decision: d, reason: g("reason"), correction: g("suggested_correction") });
    });
  }
  const resolved: ExportedDecisions["resolved"] = [];
  const unresolved: ExportedDecisions["unresolved"] = [];
  for (const r of rec) {
    const a = adj.get(r.key);
    const base = { kind: r.kind, id: r.id, version: r.decisions[0].version, fingerprint: r.fingerprint, reviewers: r.decisions.map((d) => d.reviewer), reasons: r.decisions.map((d) => d.reason).filter(Boolean), suggested_corrections: r.decisions.map((d) => d.correction).filter(Boolean) };
    if (a) resolved.push({ ...base, decision: a.decision, basis: "adjudicated", adjudicator: a.adjudicator, reasons: [...base.reasons, ...(a.reason ? [a.reason] : [])], suggested_corrections: [...base.suggested_corrections, ...(a.correction ? [a.correction] : [])] });
    else if (r.state === "agreed") resolved.push({ ...base, decision: r.agreed!, basis: "agreed" });
    else unresolved.push({ kind: r.kind, id: r.id, state: r.state });
  }
  return {
    out: {
      schema: "educator-decisions@1",
      content_version: CONTENT_VERSION,
      promotion: "none: these decisions change no content and approve nothing in the app. A separate, explicit content-release change (reviewed and approved by the owner) applies approved decisions.",
      resolved,
      unresolved,
      agreement: agreement(rows),
    },
    problems,
  };
}

// ---------------------------------------------------------------- CLI

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  const outArg = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const files = args.filter((a, k) => !a.startsWith("--") && !(k > 0 && args[k - 1].startsWith("--")));
  if (cmd === "export") {
    if (args.includes("--check")) {
      const tmp = join(REPO, "tools", "english", "out", "educator-check");
      const fresh = exportPackage(tmp);
      const stale = [...fresh].filter(([f, text]) => !existsSync(join(PACKAGE_DIR, f)) || readFileSync(join(PACKAGE_DIR, f), "utf8") !== text).map(([f]) => f);
      if (stale.length) {
        console.error(`educator-review-v1 is not current: ${stale.join(", ")} (run: node tools/english/educator/review.ts export)`);
        process.exit(1);
      }
      console.log("educator-review-v1 is current");
    } else {
      const f = exportPackage();
      const inv = JSON.parse(f.get("records.json")!) as { counts: Record<string, number>; discrepancies: string[] };
      console.log(`wrote ${[...f.keys()].join(", ")}`, inv.counts, inv.discrepancies);
    }
  } else if (cmd === "reconcile" || cmd === "decisions") {
    const records = buildInventory().records;
    const rows: DecisionRow[] = [];
    for (const f of files) {
      const r = readDecisions(readFileSync(f, "utf8"), records);
      for (const p of r.problems) console.error(`${f}: ${p}`);
      rows.push(...r.rows);
    }
    if (cmd === "reconcile") {
      const rec = reconcile(rows);
      const states = rec.reduce<Record<string, number>>((m, r) => ((m[r.state] = (m[r.state] ?? 0) + 1), m), {});
      console.log(JSON.stringify({ reviewed: rec.length, states, agreement: agreement(rows) }, null, 1));
      const out = outArg("--out");
      if (out) writeFileSync(out, adjudicationCsv(rec));
    } else {
      const adjFile = outArg("--adjudication");
      const { out, problems } = exportDecisions(rows, adjFile ? readFileSync(adjFile, "utf8") : null, records);
      for (const p of problems) console.error(p);
      const o = outArg("--out");
      const text = JSON.stringify(out, null, 1) + "\n";
      if (o) writeFileSync(o, text);
      else console.log(text);
    }
  } else {
    console.error("usage: review.ts export [--check] | reconcile <files…> [--out f] | decisions <files…> [--adjudication f] [--out f]");
    process.exit(2);
  }
}
