/**
 * machine-validation@1: builds content/learning/machine-validation.v1.json (read by ../src/machine-validation.ts).
 *
 * There are no educators on OpenPath, so the educator release (review.ts) can never happen. This registry is the automated
 * route to "validated" evidence. A family's presentation form is admitted only when ALL of these hold:
 *   1. the independent answer-key certification (tools/mathematics/answer-key-certification, references that never read the
 *      generator) checked every question of the family exhaustively, and
 *   2. the questions offered today are byte-identical to the ones that were certified (content hashes below), and
 *   3. the grading audit certified the family for that form (grading-certifications.v1.json).
 * Single questions the certification did not classify "verified" are excluded by id. Word forms (":w") are never admitted:
 * their wording was not checked by the certification. Each entry is locked to the family's current fingerprint, so any later
 * change to the generator makes the entry inert until the family is certified again.
 *
 *   bun machine-validation.ts snapshot <exportDir> <out.json> <commit>   content hashes of an export (run once on the certified commit)
 *   bun machine-validation.ts build <exportDir> [validatedAt]   compare today's export with the certified one; write the registry
 * <exportDir> comes from `bun tools/mathematics/answer-key-certification/export.ts <exportDir>`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const ROOT = new URL("../../../", import.meta.url);
const CERT = new URL("tools/mathematics/answer-key-certification/data/", ROOT);
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

type Row = { id: string; params: number[]; prompt: string; type: string; answer: string; expanded?: boolean; figure?: unknown; mc?: unknown };
type Hashes = { n: number; typed: string; mc: string | null; mcN: number };

function hashesOf(dir: string): Record<string, Hashes> {
  const out: Record<string, Hashes> = {};
  for (const f of readdirSync(`${dir}/q`).filter((x) => x.endsWith(".jsonl")).sort()) {
    const rows = readFileSync(`${dir}/q/${f}`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
    const typed = rows.map((r) => JSON.stringify([r.id, r.params, r.prompt, r.type, r.answer, r.expanded ?? null, r.figure ?? null]));
    const mc = rows.filter((r) => r.mc).map((r) => JSON.stringify([r.id, r.mc]));
    out[f.slice(0, -6)] = { n: rows.length, typed: sha(typed.join("\n")), mc: mc.length ? sha(mc.join("\n")) : null, mcN: mc.length };
  }
  return out;
}

const [mode, dir, arg] = process.argv.slice(2);
if (mode === "snapshot") {
  writeFileSync(arg, JSON.stringify({ schema: "certified-content@1", commit: process.argv[5] ?? "", note: "Content hashes of every question exactly as it was certified (machine-validation.ts snapshot).", families: hashesOf(dir) }) + "\n");
  process.exit(0);
}
if (mode !== "build" || !dir) throw new Error("usage: machine-validation.ts snapshot <exportDir> <out.json> | build <exportDir> [validatedAt]");

const { fingerprintOf } = await import("../src/review");
const certified = JSON.parse(readFileSync(new URL("content/learning/certified-content.v1.json", ROOT), "utf8")) as { commit: string; families: Record<string, Hashes> };
const cert = new Map((JSON.parse(readFileSync(new URL("certification.json", CERT), "utf8")).families as { family: string; coverage: string; mcBad: number; mcChecked: number }[]).map((f) => [f.family, f]));
const notVerified = new Map<string, string[]>();
for (const l of gunzipSync(readFileSync(new URL("per-question.ndjson.gz", CERT))).toString("utf8").split("\n")) {
  if (!l.trim()) continue;
  const q = JSON.parse(l) as { id: string; family: string; cls: string };
  if (q.cls !== "verified") notVerified.set(q.family, [...(notVerified.get(q.family) ?? []), q.id]);
}
const grading = new Set((JSON.parse(readFileSync(new URL("content/learning/grading-certifications.v1.json", ROOT), "utf8")).entries as { family: string; form: string }[]).map((e) => `${e.family}|${e.form}`));

const now = hashesOf(dir);
const entries: { family: string; fingerprint: string; forms: string[]; excluded?: string[] }[] = [];
const held: Record<string, string> = {};
const partial: Record<string, string> = {};
for (const fam of Object.keys(now).sort()) {
  const was = certified.families[fam];
  const c = cert.get(fam);
  if (!was || !c) { held[fam] = "never certified (added after the certification)"; continue; }
  if (c.coverage !== "exhaustive") { held[fam] = "certification was sampled, not exhaustive"; continue; }
  const forms: string[] = [];
  const why: string[] = [];
  if (now[fam].typed !== was.typed) why.push("typed questions changed since they were certified");
  else if (!grading.has(`${fam}|typed`)) why.push("no grading certification for typed answers");
  else forms.push("typed");
  if (was.mc) {
    if (now[fam].mc !== was.mc) why.push("multiple-choice questions changed since they were certified");
    else if (c.mcBad !== 0 || c.mcChecked !== was.mcN) why.push("multiple-choice options not fully certified");
    else if (!grading.has(`${fam}|mc`)) why.push("no grading certification for multiple choice");
    else forms.push("mc");
  }
  if (!forms.length) { held[fam] = why.join("; "); continue; }
  if (why.length) partial[fam] = why.join("; ");
  const excluded = (notVerified.get(fam) ?? []).sort();
  entries.push({ family: fam, fingerprint: fingerprintOf(fam), forms, ...(excluded.length ? { excluded } : {}) });
}
const outFile = new URL("content/learning/machine-validation.v1.json", ROOT);
const previous = existsSync(outFile) ? (JSON.parse(readFileSync(outFile, "utf8")) as { validatedAt: string }).validatedAt : undefined;
const registry = {
  schema: "machine-validation@1",
  note: "Automated validation, NOT educator review. A form listed here was certified exhaustively by the independent answer-key certification, is byte-identical today, and has a grading certification. Built by packages/learning/scripts/machine-validation.ts; never edit by hand.",
  validatedAt: arg ?? previous ?? new Date().toISOString(),
  certification: { commit: certified.commit, grading: "grading-certifications@1" },
  entries,
  partial,
  held,
};
writeFileSync(outFile, JSON.stringify(registry) + "\n");
const count = (f: string) => entries.filter((e) => e.forms.includes(f)).length;
console.log(JSON.stringify({ families: Object.keys(now).length, admitted: entries.length, typed: count("typed"), mc: count("mc"), partial: Object.keys(partial).length, held: Object.keys(held).length, excludedQuestions: entries.reduce((n, e) => n + (e.excluded?.length ?? 0), 0) }));
