/**
 * machine-validation@1: builds content/learning/machine-validation.v1.json (read by ../src/machine-validation.ts).
 *
 * There are no educators on OpenPath, so the educator release (review.ts) can never happen. This registry is the automated
 * route to "validated" evidence. A family's presentation form is admitted only when ALL of these hold:
 *   1. the independent answer-key certification (tools/mathematics/answer-key-certification, references that never read the
 *      generator) checked every question of the family (never a sample), and
 *   2. the questions offered today are byte-identical to the ones that were certified (the certification ledger's hashes), and
 *   3. the grading audit certified the family for that form (grading-certifications.v1.json).
 * Single questions the certification did not verify are excluded by id. Word forms (":w") are never admitted: their wording
 * was not checked by the certification. Each entry is locked to the family's current fingerprint, so any later change to the
 * generator makes the entry inert until the family is certified again.
 *
 * The certification ledger (content/learning/certified-content.v1.json, certified-content@2) holds, per family, what was
 * certified and where: content hashes, whether every question was checked, the multiple-choice result and the ids not verified.
 *
 *   bun machine-validation.ts ledger-add <exportDir> <resultsDir> <source> [at]   record a re-certification (scripts/recertify.py)
 *   bun machine-validation.ts written-add <result.json> <source> [at]         record a blind review of hand-written questions
 *   bun machine-validation.ts build <exportDir> [validatedAt]                compare today's export with the ledger; write the registry
 * <exportDir> comes from `bun tools/mathematics/answer-key-certification/export.ts <exportDir>`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../../", import.meta.url);
const LEDGER = new URL("content/learning/certified-content.v1.json", ROOT);
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

type Row = { id: string; params: number[]; prompt: string; type: string; answer: string; expanded?: boolean; figure?: unknown; mc?: unknown };
type Hashes = { n: number; typed: string; mc: string | null; mcN: number };
/** One family as certified: where, the content hashes, and the outcome. */
type Certified = Hashes & { source: string; at: string; exhaustive: boolean; mcOk: boolean; notVerified: string[] };
/** written: hand-written questions whose stored answer an independent reviewer re-derived from the prompt alone (the key hidden). */
type Ledger = { schema: "certified-content@2"; note: string; families: Record<string, Certified>; written?: Record<string, { hash: string; source: string; at: string }>; writtenNotVerified?: Record<string, string> };

function rowsOf(dir: string, fam: string): Row[] {
  return readFileSync(`${dir}/q/${fam}.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
}
function hashOfRows(rows: Row[]): Hashes {
  const typed = rows.map((r) => JSON.stringify([r.id, r.params, r.prompt, r.type, r.answer, r.expanded ?? null, r.figure ?? null]));
  const mc = rows.filter((r) => r.mc).map((r) => JSON.stringify([r.id, r.mc]));
  return { n: rows.length, typed: sha(typed.join("\n")), mc: mc.length ? sha(mc.join("\n")) : null, mcN: mc.length };
}
const familiesIn = (dir: string) => readdirSync(`${dir}/q`).filter((x) => x.endsWith(".jsonl")).map((f) => f.slice(0, -6)).sort();
const readLedger = () => JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger;
const writeLedger = (l: Ledger) => writeFileSync(LEDGER, JSON.stringify({ ...l, families: Object.fromEntries(Object.entries(l.families).sort(([a], [b]) => a.localeCompare(b))) }) + "\n");

const [mode, dir, arg, arg2] = process.argv.slice(2);

if (mode === "ledger-add") {
  // a re-certification by scripts/recertify.py: every question has a status; only "ok" ones are certified
  const ledger = readLedger();
  const added: string[] = [];
  const skipped: string[] = [];
  for (const f of readdirSync(`${arg}/fam`).filter((x) => x.endsWith(".json")).sort()) {
    const r = JSON.parse(readFileSync(`${arg}/fam/${f}`, "utf8")) as { family: string; noReference?: boolean; coverage: string; timedOut: boolean; released: number; checked: number; ok: number; okIds: string[]; mcChecked: number; mcBad: number; wordBad: number };
    if (r.noReference || !r.ok) { skipped.push(`${r.family}: ${r.noReference ? "no reference" : "no question verified"}`); continue; }
    const rows = rowsOf(dir, r.family);
    if (rows.length !== r.released) throw new Error(`${r.family}: the results were made from another export`);
    const ok = new Set(r.okIds);
    const withMc = rows.filter((x) => x.mc && ok.has(x.id)).length;
    ledger.families[r.family] = {
      ...hashOfRows(rows),
      source: arg2,
      at: process.argv[6] ?? new Date().toISOString(),
      exhaustive: r.coverage === "exhaustive" && !r.timedOut && r.checked === r.released,
      mcOk: withMc > 0 && r.mcBad === 0 && r.mcChecked === withMc,
      notVerified: rows.map((x) => x.id).filter((id) => !ok.has(id)).sort(),
    };
    added.push(r.family);
  }
  writeLedger(ledger);
  console.log(JSON.stringify({ added: added.length, skipped }));
  process.exit(0);
}
if (mode === "written-add") {
  // <resultJson>: { ok: [ids], notVerified: { id: reason } } from a blind review (the reviewer saw prompts and options, never the key)
  const { question } = await import("../src/content");
  const { writtenHash } = await import("../src/machine-validation");
  const res = JSON.parse(readFileSync(dir, "utf8")) as { ok: string[]; notVerified: Record<string, string> };
  const ledger = readLedger();
  ledger.written = { ...(ledger.written ?? {}) };
  for (const id of res.ok) ledger.written[id] = { hash: writtenHash(question(id)), source: arg, at: arg2 ?? new Date().toISOString() };
  ledger.writtenNotVerified = { ...(ledger.writtenNotVerified ?? {}), ...res.notVerified };
  for (const id of Object.keys(res.notVerified)) delete ledger.written[id];
  writeLedger(ledger);
  console.log(JSON.stringify({ written: Object.keys(ledger.written).length, notVerified: Object.keys(ledger.writtenNotVerified).length }));
  process.exit(0);
}
if (mode !== "build" || !dir) throw new Error("usage: machine-validation.ts ledger-add <exportDir> <resultsDir> <source> | build <exportDir> [validatedAt]");

const { fingerprintOf } = await import("../src/review");
const ledger = readLedger();
const grading = new Set((JSON.parse(readFileSync(new URL("content/learning/grading-certifications.v1.json", ROOT), "utf8")).entries as { family: string; form: string }[]).map((e) => `${e.family}|${e.form}`));

const entries: { family: string; fingerprint: string; forms: string[]; since?: string; excluded?: string[] }[] = [];
const validatedAt = arg ?? (existsSync(new URL("content/learning/machine-validation.v1.json", ROOT)) ? (JSON.parse(readFileSync(new URL("content/learning/machine-validation.v1.json", ROOT), "utf8")) as { validatedAt: string }).validatedAt : new Date().toISOString());
const held: Record<string, string> = {};
const partial: Record<string, string> = {};
for (const fam of familiesIn(dir)) {
  const was = ledger.families[fam];
  if (!was) { held[fam] = "never certified (no independent reference yet)"; continue; }
  if (!was.exhaustive) { held[fam] = "certification was sampled, not exhaustive"; continue; }
  const now = hashOfRows(rowsOf(dir, fam));
  const forms: string[] = [];
  const why: string[] = [];
  if (now.typed !== was.typed) why.push("typed questions changed since they were certified");
  else if (was.notVerified.length >= was.n) why.push("no question verified");
  else if (!grading.has(`${fam}|typed`)) why.push("no grading certification for typed answers");
  else forms.push("typed");
  if (was.mc) {
    if (now.mc !== was.mc) why.push("multiple-choice questions changed since they were certified");
    else if (!was.mcOk) why.push("multiple-choice options not fully certified");
    else if (!grading.has(`${fam}|mc`)) why.push("no grading certification for multiple choice");
    else forms.push("mc");
  }
  if (!forms.length) { held[fam] = why.join("; "); continue; }
  if (why.length) partial[fam] = why.join("; ");
  entries.push({ family: fam, fingerprint: fingerprintOf(fam), forms, ...(was.at > validatedAt ? { since: was.at } : {}), ...(was.notVerified.length ? { excluded: was.notVerified } : {}) });
}
// hand-written questions: admitted when the blind review agreed with the stored answer and the question is unchanged since
const { questions } = await import("../src/content");
const { writtenHash, WRITTEN_TYPES } = await import("../src/machine-validation");
const written: Record<string, string> = {};
const writtenHeld: Record<string, string> = {};
for (const q of questions.filter((x) => !x.id.startsWith("gen:"))) {
  const was = ledger.written?.[q.id];
  if (!was) writtenHeld[q.id] = ledger.writtenNotVerified?.[q.id] ?? "never reviewed";
  else if (was.hash !== writtenHash(q)) writtenHeld[q.id] = "changed since it was reviewed";
  else if (!WRITTEN_TYPES.includes(q.type)) writtenHeld[q.id] = `answer type ${q.type} is not admitted for hand-written questions`;
  else written[q.id] = was.hash;
}
const outFile = new URL("content/learning/machine-validation.v1.json", ROOT);
const registry = {
  schema: "machine-validation@1",
  note: "Automated validation, NOT educator review. A form listed here was certified question by question by the independent answer-key certification, is byte-identical today, and has a grading certification. Built by packages/learning/scripts/machine-validation.ts; never edit by hand.",
  validatedAt,
  certification: { ledger: "certified-content@2", grading: "grading-certifications@1" },
  entries,
  partial,
  held,
  written,
  writtenHeld,
};
writeFileSync(outFile, JSON.stringify(registry) + "\n");
const count = (f: string) => entries.filter((e) => e.forms.includes(f)).length;
console.log(JSON.stringify({ families: familiesIn(dir).length, admitted: entries.length, typed: count("typed"), mc: count("mc"), partial: Object.keys(partial).length, held: Object.keys(held).length, excludedQuestions: entries.reduce((n, e) => n + (e.excluded?.length ?? 0), 0), written: Object.keys(written).length, writtenHeld: Object.keys(writtenHeld).length }));
