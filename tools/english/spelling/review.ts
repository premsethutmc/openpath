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
 *   (add --pending to write the sheet to content/english/spelling/review/pending/, kept in the repository)
 *   node tools/english/spelling/review.ts record SHEET.csv --by "Name" [--date YYYY-MM-DD]
 *                                                               record a filled sheet in review.json
 *
 * A sheet is a CSV file for a spreadsheet, with a `.meta.json` file beside it. The reviewer fills in the
 * `verdict` column (ok or problem; for flagged items, allow or exclude) and a `note` for every problem.
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
  problemRateBound,
  reviewProblems,
  reviewStatus,
  reviewSummary,
  ruleDecision,
  ruleId,
  sampleRule,
} from "../../../packages/english-core/src/index.ts";
import { CONTENT, REPO } from "../load.ts";
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

const COLS = ["id", "version", "template", "pattern", "word", "prompt", "options", "accepted_answers", "read_aloud", "explanation", "sources", "flags", "verdict", "note"];

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
  kind: "rule" | "set" | "flagged";
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

const INSTRUCTIONS = {
  rule: "For each row, write ok or problem in verdict. A problem is anything you would not want a 10–15-year-old to see: a wrong or doubtful answer, a second answer that should also count, an unsuitable or adult word or sentence, a confusing clue, or a difficulty clearly wrong for the pattern. Write what is wrong in note.",
  set: "As for a rule sample: ok or problem for every row, with a note for each problem. The set is approved only with every row reviewed.",
  flagged: "These items were flagged by automatic checks (see flags). Write allow if the item is fine as it is, or exclude if it should not be offered, with a note either way.",
};

function writeSheet(name: string, rows: Record<string, unknown>[], meta: Meta, dir = OUT): void {
  mkdirSync(dir, { recursive: true });
  const csv = join(dir, `${name}.csv`);
  writeFileSync(csv, toCsv(rows, COLS));
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
  const allowed = meta.kind === "flagged" ? ["allow", "exclude"] : ["ok", "problem"];
  for (const r of rows) {
    const v = r.verdict.toLowerCase();
    if (!allowed.includes(v)) throw new Error(`row ${r.id}: verdict must be ${allowed.join(" or ")} (found "${r.verdict}")`);
    if ((v === "problem" || meta.kind === "flagged") && !r.note) throw new Error(`row ${r.id}: write a note`);
    const item = byId.get(r.id);
    if (!item) throw new Error(`row ${r.id}: no such item`);
    if (String(item.version) !== r.version) throw new Error(`row ${r.id}: the sheet reviewed version ${r.version}, but the item is now version ${item.version}; make a new sheet`);
  }
  const next: GeneratedReview = JSON.parse(JSON.stringify(review));
  const exceptions: ReviewException[] = [];
  const problems = rows.filter((r) => ["problem", "exclude"].includes(r.verdict.toLowerCase()));
  for (const r of rows) {
    const v = r.verdict.toLowerCase();
    if (v === "problem" || v === "exclude") exceptions.push({ item: r.id, action: "exclude", reason: r.note, by, date });
    if (v === "allow") exceptions.push({ item: r.id, action: "allow", reason: r.note, by, date });
  }
  next.exceptions.push(...exceptions);
  const refs = rows.map((r) => ({ id: r.id, version: Number(r.version) }));
  let summary: string;
  if (meta.kind === "rule") {
    const d = ruleDecision(meta.population!, rows.length, problems.length);
    if (next.rules.some((x) => x.id === meta.id)) throw new Error(`${meta.id} is already recorded; draw a new sample with another --seed`);
    next.rules.push({
      id: meta.id,
      generator: meta.generator!,
      template: meta.template!,
      decision: d.decision,
      by,
      date,
      sample: { seed: meta.seed!, size: rows.length, population: meta.population!, items: refs, problems: problems.map((r) => ({ id: r.id, note: r.note })) },
      sheet: kept,
      wordbank: meta.wordbank,
    });
    summary = `${meta.id}: ${d.decision} (${d.reason}). With ${problems.length} problems in ${rows.length}, the share of problem items in the whole rule is probably below ${Math.round(problemRateBound(rows.length, problems.length) * 100)}%.`;
  } else if (meta.kind === "set") {
    if (next.sets.some((x) => x.id === meta.id)) throw new Error(`${meta.id} is already recorded`);
    next.sets.push({ id: meta.id, name: meta.name!, decision: "approved", by, date, items: refs.filter((r) => !problems.some((p) => p.id === r.id)), problems: problems.map((r) => ({ id: r.id, note: r.note })), sheet: kept });
    summary = `${meta.id}: approved ${rows.length - problems.length} items; ${problems.length} excluded.`;
  } else summary = `${meta.id}: ${exceptions.filter((e) => e.action === "allow").length} allowed, ${problems.length} excluded.`;
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
  const problems = reviewProblems(review, items, loadRetired());
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
  else if (cmd === "record") record(rest);
  else status(process.argv.includes("--check"));
}
