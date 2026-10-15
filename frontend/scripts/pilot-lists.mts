/**
 * The pilot's reviewable content lists and its proposed session allowlist, written from the app's own content:
 *
 *   node --import tsx scripts/pilot-lists.mts          write docs/product/pilot/{placement,dictation}-review.csv and session-allowlist.json
 *   node --import tsx scripts/pilot-lists.mts --check  fail if they no longer match the content (an item changed, was added or removed)
 *
 * Nothing here approves anything. Every row starts with an empty decision; the allowlist lists CANDIDATES for the
 * pilot, and says that only those with a recorded educator approval may be shown (PILOT_DECISIONS.md, Task B).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { type Code, GUIDED_ALL, loadContent } from "../src/english/logic/content.ts";

const OUT = new URL("../../docs/product/pilot/", import.meta.url).pathname;
const check = process.argv.includes("--check");
const c = loadContent();

const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",")).join("\n") + "\n";

function expected(i: Code): string {
  const kind = i.format.split(":")[0];
  if (kind === "typed") return (i.answers ?? []).join(" | ");
  if (kind === "choice") return i.options?.[i.answer as number] ?? "";
  if (kind === "multi") return (i.answer_set ?? []).map((k) => i.options?.[k]).join(" + ");
  if (kind === "order") return (i.answer_order ?? []).map((k) => i.options?.[k]).join(" → ");
  if (kind === "match") return (i.left ?? []).map((l, k) => `${l} = ${i.options?.[(i.answer_pairs ?? [])[k]]}`).join("; ");
  return "";
}

const REVIEW_COLS = ["decision (approve / revise / reject)", "suitable for age 10–12 (y/n)", "wording clear and unambiguous (y/n)", "expected answer correct and complete (y/n)", "difficulty feels: easier / about right / harder", "notes", "reviewer", "date"];

// placement: hand-written questions on the guided skills that placement may ask (no pool, or the diagnosis pool)
const guided = new Set<string>(GUIDED_ALL as readonly string[]);
const placement = [...c.handWritten]
  .map((id) => c.ctx.content.items.get(id) as Code)
  .filter((i) => i.kind === "code" && guided.has(i.target) && (!c.pilot.pools.get(i.id) || c.pilot.pools.get(i.id)!.pool === "diagnosis"))
  .sort((a, b) => a.target.localeCompare(b.target) || a.b - b.b || a.id.localeCompare(b.id));
const placementRows = [
  ["id", "version", "skill", "pattern_or_step", "format", "prompt", "options", "expected_answer", "difficulty_b (author estimate)", "pool", "passage", ...REVIEW_COLS],
  ...placement.map((i) => [i.id, i.version, i.target, i.step ?? "", i.format, i.prompt ?? "", (i.options ?? []).join(" | "), expected(i), i.b, c.pilot.pools.get(i.id)?.pool ?? "none (any use)", i.passage ?? "", ...REVIEW_COLS.map(() => "")]),
];

const dictation = [...c.dictation.items].sort((a, b) => a.b - b.b || a.answers![0].localeCompare(b.answers![0]));
const dictationRows = [
  ["batch", "id", "version", "skill", "pattern", "format", "spoken_word", "spoken_sentence", "expected_answer", "difficulty_b (author estimate)", "listed_wrong_forms", ...REVIEW_COLS],
  ...dictation.map((i) => [i.b <= 4.5 ? 1 : 2, i.id, i.version, i.target, i.step ?? "", i.format, i.speak ?? "", (i as { sentence?: string }).sentence ?? "", expected(i), i.b, Object.entries(i.wrong ?? {}).map(([w, t]) => `${w} (${t})`).join("; "), ...REVIEW_COLS.map(() => "")]),
];

const allowlist = {
  version: "pilot-allowlist@0-proposal",
  status: "PROPOSAL: not enforced by the app, and nothing in it is approved",
  rule: "In a pupil session, only items listed here AND recorded as approved by the educator (reviews file, matching id and version) may be shown. Anything else is refused. Until approvals exist, nothing may be shown.",
  sessions_allowed: ["placement", "spelling_assess"],
  sessions_refused: ["spelling_practice", "spelling_review", "spelling_transfer", "spelling_check", "guided", "explore", "doubling_journey", "check (non-dictation evidence checks)"],
  lessons_allowed: [],
  generated_practice_allowed: [],
  items: [...placement.map((i) => ({ id: i.id, version: i.version, use: "placement" })), ...dictation.map((i) => ({ id: i.id, version: i.version, use: "dictation" }))],
  counts: { placement: placement.length, dictation: dictation.length },
};

const files: [string, string][] = [
  ["placement-review.csv", csv(placementRows)],
  ["dictation-review.csv", csv(dictationRows)],
  ["session-allowlist.json", JSON.stringify(allowlist, null, 1) + "\n"],
];
let stale = 0;
for (const [name, text] of files) {
  if (check) {
    let now = "";
    try {
      now = readFileSync(OUT + name, "utf8");
    } catch {}
    // a review in progress fills the decision columns: compare the content columns only
    const strip = (t: string) => (name.endsWith(".csv") ? t.split("\n").map((l) => l.split(",").slice(0, 8).join(",")).join("\n") : t);
    if (strip(now) !== strip(text)) {
      console.error(`${name} no longer matches the content: regenerate it, and re-review the rows that changed`);
      stale++;
    }
  } else writeFileSync(OUT + name, text);
}
console.log(`${placement.length} placement questions, ${dictation.length} dictation words${check ? (stale ? `: ${stale} file(s) stale` : ": up to date") : ": written"}`);
if (stale) process.exit(1);
