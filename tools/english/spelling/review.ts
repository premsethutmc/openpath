/**
 * Content validation for generated spelling items: review sheets, approval records and the status report.
 *
 *   node tools/english/spelling/review.ts                       status of every rule (approved, unreviewed, flagged, excluded)
 *   node tools/english/spelling/review.ts --check               fail if the review record is inconsistent (CI)
 *   node tools/english/spelling/review.ts sheet --template add_ending [--n 30] [--seed s1]
 *                                                               a sample of one rule to review
 *   node tools/english/spelling/review.ts sheet --flagged        every automatically flagged item (allow or exclude)
 *   node tools/english/spelling/review.ts sheet --set NAME --template homophone_context
 *                                                               every item of a template, reviewed as a fixed set
 *   node tools/english/spelling/review.ts sheet --pilot --pending   one row per word of the pilot set (pilot-set.json)
 *   node tools/english/spelling/review.ts pilot-set             recompute pilot-set.json's item list from its words
 *   (add --pending to write the sheet to content/english/spelling/review/pending/, kept in the repository)
 *   node tools/english/spelling/review.ts record SHEET.csv --by "Name" [--date YYYY-MM-DD]
 *                                                               record a filled sheet in review.json
 *
 * A sheet is a CSV file for a spreadsheet, with a `.meta.json` file beside it. The reviewer fills in the
 * `verdict` column: ok; critical (with a `category`: wrong_answer, ambiguous_answer, misleading_explanation or
 * inappropriate); minor-keep; or minor-exclude. For flagged items: allow or exclude. Every non-ok row needs a `note`.
 * A rule with any critical error in its sample is not approved.
 * Recording copies the filled sheet into content/english/spelling/review/sheets/ with its checksum, adds
 * an approval record, and turns every problem into an exclude exception.
 *
 * An approval only lets items be offered as practice content. It never sets `generated.checked`, so
 * generated items still cannot change any capability estimate (see generated-review.ts).
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  type GeneratedReview,
  type Item,
  type ReviewException,
  automaticFlags,
  fnv1a,
  CRITICAL_CATEGORIES,
  type CriticalCategory,
  type CriticalError,
  type MinorError,
  criticalRateBound,
  reviewProblems,
  reviewStatus,
  reviewSummary,
  ruleDecision,
  ruleId,
  sampleRule,
} from "../../../packages/english-core/src/index.ts";
import { CONTENT, REPO } from "../load.ts";

type Code = Extract<Item, { kind: "code" }>;
import { GENERATOR } from "./generate.ts";

const DIR = join(CONTENT, "spelling");
export const REVIEW_FILE = join(DIR, "review", "review.json");
const SHEETS = join(DIR, "review", "sheets");
/** Blank sheets waiting for a reviewer, kept in the repository so they outlive any one machine. */
export const PENDING = join(DIR, "review", "pending");
const OUT = join(REPO, "tools", "english", "out", "review");

export const loadReview = (): GeneratedReview => JSON.parse(readFileSync(REVIEW_FILE, "utf8"));
const loadItems = (): Item[] => JSON.parse(readFileSync(join(DIR, "generated-items.json"), "utf8"));
const loadRetired = (): Item[] => JSON.parse(readFileSync(join(DIR, "retired-generated.json"), "utf8"));
const wordbankFingerprint = () => fnv1a(readFileSync(join(DIR, "wordbank.json"), "utf8"));

// ------------------------------------------------------------------ the pilot set

/** The words chosen for the first pilot: a few patterns, typed answers only. Approved only by a person's review. */
export interface PilotSet {
  id: string;
  purpose: string;
  templates: string[];
  chosen_by: string;
  patterns: Record<string, string[]>;
  items: { id: string; version: number }[];
}
export const PILOT_SET_FILE = join(DIR, "review", "pilot-set.json");
export const loadPilotSet = (): PilotSet => JSON.parse(readFileSync(PILOT_SET_FILE, "utf8"));

/** The pilot set's items, worked out from its words and templates (so the list can be checked). */
export function pilotItems(set: Omit<PilotSet, "items">, items: Item[]): { id: string; version: number }[] {
  const out: { id: string; version: number }[] = [];
  for (const [pattern, words] of Object.entries(set.patterns))
    for (const word of words)
      for (const t of set.templates) {
        const i = items.find((x) => x.kind === "code" && x.generated?.word === word && x.generated.template === t && `${x.target}#${x.step}` === pattern);
        if (i) out.push({ id: i.id, version: i.version });
      }
  return out;
}

export function pilotSetProblems(set: PilotSet, items: Item[], review: GeneratedReview): string[] {
  const p: string[] = [];
  const expected = pilotItems(set, items);
  if (JSON.stringify(expected) !== JSON.stringify(set.items)) p.push("pilot-set.json's item list does not match its words and templates (an item changed version?); regenerate it with `review.ts pilot-set`");
  const status = reviewStatus(items, review);
  for (const [pattern, words] of Object.entries(set.patterns))
    for (const w of words) {
      const its = expected.filter((r) => (items.find((i) => i.id === r.id) as Code).generated!.word === w);
      if (its.length !== set.templates.length) p.push(`${pattern}: "${w}" does not have every pilot exercise type`);
      for (const r of its) if (["flagged", "excluded"].includes(status.get(r.id)?.status ?? "")) p.push(`${pattern}: "${w}" (${r.id}) is ${status.get(r.id)!.status}`);
    }
  return p;
}

// ------------------------------------------------------------------ CSV

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: Record<string, unknown>[], cols: string[]) => [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') (f += '"'), i++;
      else if (ch === '"') q = false;
      else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") row.push(f), (f = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(f), rows.push(row), (row = []), (f = "");
    } else f += ch;
  }
  if (f || row.length) row.push(f), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, k) => [h.trim(), (r[k] ?? "").trim()])));
}

// ------------------------------------------------------------------ sheets

const COLS = ["id", "version", "template", "pattern", "word", "prompt", "options", "accepted_answers", "read_aloud", "explanation", "sources", "flags", "verdict", "category", "note"];
/** The pilot sheet: one row per word, covering every exercise for that word in the pilot set. */
const WORD_COLS = ["word", "pattern", "add_the_ending", "dictation_word", "accepted_answers", "explanation_shown_after_an_answer", "items", "verdict", "category", "note"];

function rowOf(i: Item): Record<string, unknown> {
  if (i.kind !== "code" || !i.generated) throw new Error(`${i.id} is not generated`);
  return {
    id: i.id,
    version: i.version,
    template: i.generated.template,
    pattern: `${i.target.split(".").pop()} / ${i.step}`,
    word: i.generated.word,
    prompt: i.prompt,
    options: (i.options ?? []).map((o, k) => (k === i.answer ? `[${o}]` : o)).join(" | "),
    accepted_answers: (i.answers ?? []).join(" | "),
    read_aloud: i.speak ?? "",
    explanation: i.explain ?? "",
    sources: i.generated.sources.join(" "),
    flags: automaticFlags(i).join("; "),
    verdict: "",
    note: "",
  };
}

interface Meta {
  kind: "rule" | "set" | "flagged" | "words";
  id: string;
  generator?: string;
  template?: string;
  seed?: string;
  population?: number;
  name?: string;
  wordbank: string;
  created: string;
  instructions: string;
}

const VERDICTS_HELP =
  "In verdict write one of: ok; critical (with category wrong_answer, ambiguous_answer, misleading_explanation or inappropriate, and a note); minor-keep (a harmless wording or presentation problem; the item stays; note what it is); minor-exclude (a minor problem, but leave the item out; note it).";
const INSTRUCTIONS = {
  rule: `${VERDICTS_HELP} Any critical error means the rule is not approved: the generator is fixed and a new sample reviewed. A clean sample does not prove every item is right.`,
  set: `${VERDICTS_HELP} Only rows marked ok or minor-keep are approved.`,
  words: `One row per word; the verdict covers every exercise listed for the word (adding the ending, and dictation). ${VERDICTS_HELP} Only words marked ok or minor-keep are approved.`,
  flagged: "These items were flagged by automatic checks (see flags). Write allow if the item is fine as it is, or exclude if it should not be offered, with a note either way.",
};

type Verdict = { kind: "ok" } | { kind: "critical"; category: CriticalCategory } | { kind: "minor"; action: "keep" | "exclude" } | { kind: "allow" } | { kind: "exclude" };

/** Read one row's verdict, refusing anything incomplete. */
export function verdictOf(r: Record<string, string>, flagged: boolean, label: string): Verdict {
  const v = (r.verdict ?? "").trim().toLowerCase();
  const note = (r.note ?? "").trim();
  if (flagged) {
    if (v !== "allow" && v !== "exclude") throw new Error(`${label}: verdict must be allow or exclude (found "${r.verdict}")`);
    if (!note) throw new Error(`${label}: write a note`);
    return { kind: v };
  }
  if (v === "ok") return { kind: "ok" };
  if (v === "critical") {
    const c = (r.category ?? "").trim().toLowerCase() as CriticalCategory;
    if (!CRITICAL_CATEGORIES.includes(c)) throw new Error(`${label}: a critical error needs a category: ${CRITICAL_CATEGORIES.join(", ")} (found "${r.category ?? ""}")`);
    if (!note) throw new Error(`${label}: write a note`);
    return { kind: "critical", category: c };
  }
  if (v === "minor-keep" || v === "minor-exclude") {
    if (!note) throw new Error(`${label}: write a note`);
    return { kind: "minor", action: v === "minor-keep" ? "keep" : "exclude" };
  }
  throw new Error(`${label}: verdict must be ok, critical, minor-keep or minor-exclude (found "${r.verdict}")`);
}

function writeSheet(name: string, rows: Record<string, unknown>[], meta: Meta, dir = OUT, cols = COLS): void {
  mkdirSync(dir, { recursive: true });
  const csv = join(dir, `${name}.csv`);
  writeFileSync(csv, toCsv(rows, cols));
  writeFileSync(csv.replace(/\.csv$/, ".meta.json"), JSON.stringify(meta, null, 1) + "\n");
  console.log(`wrote ${csv} (${rows.length} rows) and its .meta.json`);
  console.log(meta.instructions);
}

function arg(args: string[], name: string): string | undefined {
  const k = args.indexOf(name);
  return k >= 0 ? args[k + 1] : undefined;
}

function sheet(args: string[]): void {
  const dir = args.includes("--pending") ? PENDING : OUT;
  const items = loadItems();
  const today = new Date().toISOString().slice(0, 10);
  const wordbank = wordbankFingerprint();
  if (args.includes("--pilot")) {
    const set = loadPilotSet();
    const p = pilotSetProblems(set, items, loadReview());
    if (p.length) throw new Error(`the pilot set needs attention first:\n  ${p.join("\n  ")}`);
    const byId = new Map(items.map((i) => [i.id, i]));
    const rows = Object.entries(set.patterns).flatMap(([pattern, words]) =>
      words.map((word) => {
        const its = set.items.filter((r) => (byId.get(r.id) as Code).generated!.word === word).map((r) => byId.get(r.id) as Code);
        const add = its.find((i) => i.generated!.template === "add_ending");
        const hear = its.find((i) => i.generated!.template === "hear_spell");
        return {
          word,
          pattern: pattern.split(".").pop(),
          add_the_ending: add?.prompt ?? "",
          dictation_word: hear?.speak ?? "",
          accepted_answers: (add?.answers ?? hear?.answers ?? []).join(" | "),
          explanation_shown_after_an_answer: add?.explain ?? hear?.explain ?? "",
          items: its.map((i) => `${i.id}@${i.version}`).join("; "),
          verdict: "",
          category: "",
          note: "",
        };
      }),
    );
    writeSheet(set.id, rows, { kind: "words", id: `set:${set.id}`, name: set.id, wordbank, created: today, instructions: INSTRUCTIONS.words }, dir, WORD_COLS);
    return;
  }
  if (args.includes("--flagged")) {
    const flagged = items.filter((i) => automaticFlags(i).length);
    writeSheet(`flagged-${today}`, flagged.map(rowOf), { kind: "flagged", id: `flagged:${today}`, wordbank, created: today, instructions: INSTRUCTIONS.flagged }, dir);
    return;
  }
  const template = arg(args, "--template");
  if (!template) throw new Error("name a --template (add_ending, hear_spell, meaning_first_letter, choose_spelling, homophone_context)");
  const all = items.filter((i) => i.kind === "code" && i.generated?.template === template);
  if (!all.length) throw new Error(`no generated items use template ${template}`);
  const set = arg(args, "--set");
  if (set) {
    const status = reviewStatus(items, loadReview());
    const rows = all.filter((i) => !automaticFlags(i).length && status.get(i.id)?.status !== "excluded");
    writeSheet(`set-${set}`, rows.map(rowOf), { kind: "set", id: `set:${set}`, name: set, template, wordbank, created: today, instructions: INSTRUCTIONS.set }, dir);
    return;
  }
  const n = Number(arg(args, "--n") ?? 30);
  const seed = arg(args, "--seed") ?? "s1";
  const review = loadReview();
  const status = reviewStatus(items, review);
  const sample = sampleRule(items, GENERATOR, template, n, seed, review);
  const population = all.filter((i) => !automaticFlags(i).length && status.get(i.id)?.status !== "excluded").length;
  writeSheet(`rule-${template}-${seed}`, sample.map(rowOf), {
    kind: "rule",
    id: `rule:${ruleId(GENERATOR, template)}:${seed}`,
    generator: GENERATOR,
    template,
    seed,
    population,
    wordbank,
    created: today,
    instructions: INSTRUCTIONS.rule,
  }, dir);
}

// ------------------------------------------------------------------ recording

export function recordSheet(review: GeneratedReview, items: Item[], meta: Meta, rows: Record<string, string>[], by: string, date: string, kept: { path: string; sha256: string }): { review: GeneratedReview; summary: string } {
  if (!by.trim()) throw new Error("say who reviewed the sheet (--by)");
  const byId = new Map(items.map((i) => [i.id, i]));
  // every row becomes one or more reviewed items with one verdict
  const reviewed: { ref: { id: string; version: number }; verdict: Verdict; note: string }[] = [];
  for (const r of rows) {
    const label = `row ${r.id ?? r.word}`;
    const verdict = verdictOf(r, meta.kind === "flagged", label);
    const refs =
      meta.kind === "words"
        ? (r.items ?? "")
            .split(";")
            .map((x) => x.trim())
            .filter(Boolean)
            .map((x) => ({ id: x.split("@")[0], version: Number(x.split("@")[1]) }))
        : [{ id: r.id, version: Number(r.version) }];
    if (!refs.length) throw new Error(`${label}: lists no items`);
    for (const ref of refs) {
      const item = byId.get(ref.id);
      if (!item) throw new Error(`${label}: no such item ${ref.id}`);
      if (item.version !== ref.version) throw new Error(`${label}: the sheet reviewed ${ref.id} version ${ref.version}, but it is now version ${item.version}; make a new sheet`);
      reviewed.push({ ref, verdict, note: (r.note ?? "").trim() });
    }
  }
  const next: GeneratedReview = JSON.parse(JSON.stringify(review));
  const critical: CriticalError[] = reviewed.filter((x) => x.verdict.kind === "critical").map((x) => ({ id: x.ref.id, category: (x.verdict as { category: CriticalCategory }).category, note: x.note }));
  const minor: MinorError[] = reviewed.filter((x) => x.verdict.kind === "minor").map((x) => ({ id: x.ref.id, note: x.note, action: (x.verdict as { action: "keep" | "exclude" }).action }));
  for (const x of reviewed) {
    const v = x.verdict;
    const out = v.kind === "critical" || v.kind === "exclude" || (v.kind === "minor" && v.action === "exclude");
    if (out) next.exceptions.push({ item: x.ref.id, action: "exclude", reason: v.kind === "critical" ? `critical (${v.category}): ${x.note}` : x.note, by, date });
    if (v.kind === "allow") next.exceptions.push({ item: x.ref.id, action: "allow", reason: x.note, by, date });
  }
  const approvedRefs = reviewed.filter((x) => x.verdict.kind === "ok" || (x.verdict.kind === "minor" && x.verdict.action === "keep")).map((x) => x.ref);
  let summary: string;
  if (meta.kind === "rule") {
    const d = ruleDecision(meta.population!, reviewed.length, critical.length, minor.length);
    if (next.rules.some((x) => x.id === meta.id)) throw new Error(`${meta.id} is already recorded; draw a new sample with another --seed`);
    next.rules.push({
      id: meta.id,
      generator: meta.generator!,
      template: meta.template!,
      decision: d.decision,
      by,
      date,
      sample: { seed: meta.seed!, size: reviewed.length, population: meta.population!, items: reviewed.map((x) => x.ref), critical, minor },
      sheet: kept,
      wordbank: meta.wordbank,
    });
    summary = `${meta.id}: ${d.decision} (${d.reason}).${d.decision === "approved" ? ` A clean sample of ${reviewed.length} suggests critical errors are probably below ${Math.round(criticalRateBound(reviewed.length) * 100)}% of the rule; it does not prove every item is right.` : ""}`;
  } else if (meta.kind === "set" || meta.kind === "words") {
    if (next.sets.some((x) => x.id === meta.id)) throw new Error(`${meta.id} is already recorded`);
    next.sets.push({ id: meta.id, name: meta.name!, decision: "approved", by, date, items: approvedRefs, critical, minor, sheet: kept });
    summary = `${meta.id}: ${approvedRefs.length} items approved for practice; ${critical.length} with critical errors and ${minor.filter((m) => m.action === "exclude").length} with minor errors excluded; ${minor.filter((m) => m.action === "keep").length} kept with a minor note.`;
  } else summary = `${meta.id}: ${reviewed.filter((x) => x.verdict.kind === "allow").length} allowed, ${reviewed.filter((x) => x.verdict.kind === "exclude").length} excluded.`;
  const p = reviewProblems(next, items, loadRetired());
  if (p.length) throw new Error(`the review record would be inconsistent:\n  ${p.join("\n  ")}`);
  return { review: next, summary };
}

function record(args: string[]): void {
  const path = args.find((a) => a.endsWith(".csv"));
  if (!path || !existsSync(path)) throw new Error("give the filled sheet (.csv)");
  // the sheet's details sit beside it, or in the repository's pending folder under the same name
  const beside = path.replace(/\.csv$/, ".meta.json");
  const pending = join(PENDING, basename(beside));
  const metaPath = existsSync(beside) ? beside : pending;
  if (!existsSync(metaPath)) throw new Error(`the sheet's ${basename(beside)} is missing (looked beside it and in ${PENDING})`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Meta;
  const date = arg(args, "--date") ?? new Date().toISOString().slice(0, 10);
  const text = readFileSync(path, "utf8");
  mkdirSync(SHEETS, { recursive: true });
  const name = `${meta.id.replace(/[^a-z0-9@._-]+/gi, "_")}-${date}.csv`;
  const kept = { path: `content/english/spelling/review/sheets/${name}`, sha256: createHash("sha256").update(text).digest("hex") };
  const { review, summary } = recordSheet(loadReview(), loadItems(), meta, parseCsv(text), arg(args, "--by") ?? "", date, kept);
  copyFileSync(path, join(SHEETS, name));
  writeFileSync(REVIEW_FILE, JSON.stringify(review, null, 1) + "\n");
  console.log(summary);
}

// ------------------------------------------------------------------ status

function status(check: boolean): void {
  const items = loadItems();
  const review = loadReview();
  const problems = [...reviewProblems(review, items, loadRetired()), ...(existsSync(PILOT_SET_FILE) ? pilotSetProblems(loadPilotSet(), items, review).map((x) => `pilot set: ${x}`) : [])];
  const st = reviewStatus(items, review);
  const rows = reviewSummary(items, st);
  console.log("rule".padEnd(42) + "approved  unreviewed  flagged  excluded  total");
  for (const r of rows) console.log(r.rule.padEnd(42) + [r.approved, r.unreviewed, r.flagged, r.excluded, r.total].map((x, k) => String(x).padStart(k ? [10, 9, 10, 7][k - 1] : 8)).join(""));
  const offered = [...st.values()].filter((x) => x.status === "approved").length;
  console.log(`\nA pilot build offers the ${offered} approved items; a development build also offers unreviewed ones. Flagged and excluded items are never offered.`);
  console.log("Approval allows practice use only: no generated item changes a capability estimate.");
  if (problems.length) {
    console.error(`\nreview record problems:\n  ${problems.join("\n  ")}`);
    if (check) process.exit(1);
  } else if (check) console.log("review record OK");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "sheet") sheet(rest);
  else if (cmd === "pilot-set") {
    const set = loadPilotSet();
    set.items = pilotItems(set, loadItems());
    writeFileSync(PILOT_SET_FILE, JSON.stringify(set, null, 1) + "\n");
    console.log(`pilot-set.json: ${set.items.length} items for ${Object.values(set.patterns).flat().length} words`);
  }
  else if (cmd === "record") record(rest);
  else status(process.argv.includes("--check"));
}
