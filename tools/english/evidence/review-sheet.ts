/**
 * Educator review sheet for the provisional diagnostic bank (and the curated word-family metadata of existing items).
 *
 *   node tools/english/evidence/review-sheet.ts --write   docs/english/review/spelling-evidence/*.csv
 *   node tools/english/evidence/review-sheet.ts --check   fail if the committed sheets are out of date
 *
 * Each bank row carries the same fingerprint the pilot review records use (tools/english/pilot/review.ts), so a
 * decision can later be recorded against exactly what the reviewer saw. The decision columns are left empty:
 * nothing is approved here.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evidenceOf } from "../../../packages/english-core/src/index.ts";
import { fingerprint } from "../pilot/review.ts";
import { REPO } from "../load.ts";
import { loadEvidenceContent, readItems } from "./load.ts";

const OUT = join(REPO, "docs", "english", "review", "spelling-evidence");
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";

export function sheets(): Record<string, string> {
  const { evidence, items } = loadEvidenceContent();
  const bank = readItems("content/english/spelling/evidence/diagnostic-bank.json");
  const head = ["id", "version", "fingerprint", "capability", "principle", "polarity", "mode", "uses", "lemma", "reserved_lemma", "morphology", "exception_class", "prompt", "accepted_answers", "options", "tagged_wrong_answers", "other_likely_errors", "note", "what_to_check", "decision", "issues", "comment", "reviewer", "date"];
  const rows: string[][] = [head];
  for (const i of bank) {
    if (i.kind !== "code") continue;
    const m = evidenceOf(i, evidence)!;
    const tagged = [...Object.entries(i.wrong ?? {}), ...Object.entries(i.distractor_tags ?? {}).map(([k, t]) => [i.options![Number(k)], t])].map(([w, t]) => `${w} = ${t}`).join("; ");
    const check = [
      m.polarity === "contrast" ? "the rule must NOT apply to this word" : "the rule applies to this word",
      m.reserved ? "word suitable as an unseen-word check (not taught or practised)" : "",
      m.dialect_note ? `dialect: ${m.dialect_note}` : "",
      m.morphology === "derivational" ? "derivational (separate capability): only a contrast for the principle" : "",
      "sentence suits ages 10-15; one right answer",
    ].filter(Boolean).join("; ");
    rows.push([i.id, String(i.version), fingerprint(i), i.target, m.principle, m.polarity, m.mode, m.uses.join(" "), m.lemma, m.reserved ? "yes" : "no", m.morphology, m.exception_class ?? "", i.prompt,
      (i.answers ?? (i.options && i.answer !== undefined ? [i.options[i.answer]] : [])).join(" | "), (i.options ?? []).join(" | "), tagged, (m.untagged_errors ?? []).join(" | "), i.rationale ?? "", check, "", "", "", "", ""]);
  }
  const head2 = ["id", "version", "origin", "principle", "word", "lemma", "stem", "suffix", "transformation", "polarity", "mode", "uses", "use_source", "lemma_ok", "comment"];
  const rows2: string[][] = [head2];
  for (const { item, origin } of items) {
    const k = `${item.id}@${item.version}`;
    const m = evidence.get(k);
    if (!m || m.origin === "diagnostic_bank" || item.kind !== "code") continue;
    const word = (item.answers?.[0] ?? (item.options && item.answer !== undefined ? item.options[item.answer] : "")) as string;
    rows2.push([item.id, String(item.version), origin, m.principle, word, m.lemma, m.stem ?? "", m.suffix, m.transformation, m.polarity, m.mode, m.uses.join(" "), m.use_source ?? "", "", ""]);
  }
  rows2.splice(1, rows2.length - 1, ...rows2.slice(1).sort((a, b) => (a[3] + a[0]).localeCompare(b[3] + b[0])));
  return { "diagnostic-bank-review.csv": csv(rows), "existing-items-word-families.csv": csv(rows2) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = sheets();
  if (process.argv.includes("--write")) {
    mkdirSync(OUT, { recursive: true });
    for (const [f, c] of Object.entries(s)) writeFileSync(join(OUT, f), c);
    console.log(`wrote ${Object.keys(s).join(", ")}`);
  } else if (process.argv.includes("--check")) {
    for (const [f, c] of Object.entries(s))
      if (readFileSync(join(OUT, f), "utf8") !== c) {
        console.error(`docs/english/review/spelling-evidence/${f} is out of date: run node tools/english/evidence/review-sheet.ts --write`);
        process.exit(1);
      }
    console.log("review sheets are current");
  } else for (const [f, c] of Object.entries(s)) console.log(`${f}: ${c.split("\n").length - 2} rows`);
}
