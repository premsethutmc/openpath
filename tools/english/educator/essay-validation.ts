/**
 * The essay-evaluation validation package (educator validation v1): the 15 synthetic benchmark essays and 3 rewrites
 * for independent annotation, blank templates, the reference (kept apart, for adjudication), and the deterministic
 * baseline results.
 *
 *   node tools/english/educator/essay-validation.ts [--check]
 *
 * Writes docs/product/essay-learning/essay-validation-v1/: ESSAYS.md, REFERENCE.md, BASELINE.md, competencies.csv,
 * annotation-template.csv, rewrite-ratings-template.csv. ANNOTATION_GUIDE.md is written by hand.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBenchmark } from "../essay-benchmark.ts";
import { loadEssayContext } from "../essay-load.ts";
import { REPO } from "../load.ts";
import { toCsv } from "../pilot/review.ts";

export const VALIDATION_DIR = join(REPO, "docs", "product", "essay-learning", "essay-validation-v1");
const RESULTS = join(REPO, "content", "english", "essay", "benchmark", "results-v1.json");
const DIMENSIONS = ["meaning_preservation", "grammar", "coherence", "clarity", "concision"];

export function validationFiles(): Map<string, string> {
  const b = loadBenchmark();
  const ectx = loadEssayContext();
  const name = (id: string) => ectx.profile.byCapability.get(id)?.name ?? id;
  const files = new Map<string, string>();
  const essays = [
    `# Essays and rewrites for independent annotation (${b.id}@${b.version})`,
    "",
    `Status: **${b.status}**. ${b.provenance}`,
    "",
    "Annotate each essay without looking at REFERENCE.md or at another annotator's work. Follow ANNOTATION_GUIDE.md. Record marks in your own copy of annotation-template.csv and rewrite ratings in rewrite-ratings-template.csv.",
    "",
    ...b.essays.flatMap((e) => [`## ${e.id}`, "", `Prompt: *${e.prompt}* (${e.words} words)`, "", `> ${e.text}`, ""]),
    "## Rewrites (each rewrites one essay above in 20–50 words)",
    "",
    ...b.rewrites.flatMap((r) => [`### ${r.id} (rewrite of ${r.essay}, ${r.words} words)`, "", `> ${r.text}`, ""]),
  ].join("\n");
  files.set("ESSAYS.md", essays);
  const reference = [
    "# Reference annotations (synthetic; for adjudication only)",
    "",
    "**Do not read this before annotating.** These annotations were written by the development team (an AI assistant) for testing. They are not educator-validated: an educator's annotations may disagree, and where they do the reference is the thing in question.",
    "",
    ...b.essays.flatMap((e) => [
      `## ${e.id}`,
      "",
      "| Kind | Competency | Quote | Note |",
      "|---|---|---|---|",
      ...e.annotations.map((a) => `| ${a.optional ? `${a.kind} (ambiguous: optional)` : a.kind}${a.slip ? ", possible slip" : ""} | ${name(a.competency)}${a.acceptAlso?.length ? ` (also ${a.acceptAlso.map(name).join(", ")})` : ""} | “${a.quote}” | ${a.note} |`),
      ...(e.annotations.length ? [] : ["| — | — | — | No error: a correct essay. |"]),
      "",
      ...(e.must_not_flag.length ? ["Correct or valid alternatives (must not be marked as errors):", "", ...e.must_not_flag.map((n) => `- “${n.quote}”: ${n.why}`), ""] : []),
    ]),
    "## Rewrite reference ratings",
    "",
    `| Rewrite | ${DIMENSIONS.join(" | ")} |`,
    `|---|${DIMENSIONS.map(() => "---").join("|")}|`,
    ...b.rewrites.map((r) => `| ${r.id} | ${DIMENSIONS.map((d) => r.reference[d]).join(" | ")} |`),
    "",
  ].join("\n");
  files.set("REFERENCE.md", reference);
  const results = existsSync(RESULTS) ? (JSON.parse(readFileSync(RESULTS, "utf8")) as { evaluator: { id: string; version: string }; errors: { precision: number; recall: number; requiredMatched?: number; required: number }; unsupported: { rejected: number; proposed: number }; validText: { errorsOnValidText: number }; competencyAgreement: { agreement: number; kappa: number } }[]) : [];
  files.set(
    "BASELINE.md",
    [
      "# Deterministic baseline results (kept unchanged)",
      "",
      "From `content/english/essay/benchmark/results-v1.json` (`node tools/english/essay-benchmark.ts`). These measure agreement with the synthetic reference, not with educators.",
      "",
      "| Evaluator | Error precision | Error recall | Rejected by validation | Errors on valid text | Competency agreement (κ) |",
      "|---|---:|---:|---:|---:|---:|",
      ...results.map((r) => `| ${r.evaluator.id}@${r.evaluator.version} | ${r.errors.precision} | ${r.errors.recall} | ${r.unsupported.rejected} of ${r.unsupported.proposed} | ${r.validText.errorsOnValidText} | ${r.competencyAgreement.agreement} (κ ${r.competencyAgreement.kappa}) |`),
      "| **LLM evaluator** | **not measured** | | | | |",
      "",
      "No LLM accuracy is reported: no model has been run. Running one needs explicit approval of a key and its cost (owner decision).",
      "",
    ].join("\n"),
  );
  const caps = [...new Set(b.essays.flatMap((e) => e.annotations.map((a) => a.competency)))];
  const all = ectx.profile.profile.competencies.map((c) => c.capability);
  files.set("competencies.csv", "﻿" + toCsv(["competency_id", "name", "area", "in_reference"], all.map((id) => [id, name(id), ectx.profile.byCapability.get(id)?.area ?? "", caps.includes(id) ? "yes" : "no"])));
  files.set("annotation-template.csv", "﻿" + toCsv(["annotator_id", "essay_id", "quote", "competency_id", "kind", "correction", "note"], []));
  files.set("rewrite-ratings-template.csv", "﻿" + toCsv(["annotator_id", "rewrite_id", "dimension", "rating", "note"], b.rewrites.flatMap((r) => DIMENSIONS.map((d) => ["", r.id, d, "", ""]))));
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = validationFiles();
  if (process.argv.includes("--check")) {
    const stale = [...files].filter(([f, t]) => !existsSync(join(VALIDATION_DIR, f)) || readFileSync(join(VALIDATION_DIR, f), "utf8") !== t).map(([f]) => f);
    if (stale.length) {
      console.error(`essay-validation-v1 is not current: ${stale.join(", ")}`);
      process.exit(1);
    }
    console.log("essay-validation-v1 is current");
  } else {
    mkdirSync(VALIDATION_DIR, { recursive: true });
    for (const [f, t] of files) writeFileSync(join(VALIDATION_DIR, f), t);
    console.log(`wrote ${[...files.keys()].join(", ")}`);
  }
}
