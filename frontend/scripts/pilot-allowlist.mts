/**
 * The pilot allowlist: which questions are CANDIDATES for pupils in a pilot build (content/english/pilot/allowlist.json).
 *
 *   node --import tsx scripts/pilot-allowlist.mts          write it from the app's content
 *   node --import tsx scripts/pilot-allowlist.mts --check  fail if it no longer matches the content (CI)
 *
 * Being on the allowlist approves nothing. A pilot build shows a question only if it is on this list AND an educator
 * has approved that exact id and version in the review records (tools/english/pilot/review.ts; content/english/pilot/
 * reviews.json). The review sheet for these questions is exported by `node tools/english/pilot/review.ts export`.
 *
 * Candidates: the hand-written questions on the guided skills that placement may ask (no reserved pool, or the
 * diagnosis pool), and every word of the dictation bank. Activities: placement and the dictation spelling check only.
 * A change to this file (a question added, removed or re-versioned) is a reviewable change to the pilot boundary.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { type Code, GUIDED_ALL, loadContent } from "../src/english/logic/content.ts";

const OUT = new URL("../../content/english/pilot/allowlist.json", import.meta.url).pathname;
const check = process.argv.includes("--check");
const c = loadContent({ mode: "development" });

const guided = new Set<string>(GUIDED_ALL as readonly string[]);
const placement = [...c.handWritten]
  .map((id) => c.ctx.content.items.get(id) as Code)
  .filter((i) => i.kind === "code" && guided.has(i.target) && (!c.pilot.pools.get(i.id) || c.pilot.pools.get(i.id)!.pool === "diagnosis"))
  .sort((a, b) => a.target.localeCompare(b.target) || a.b - b.b || a.id.localeCompare(b.id));
const dictation = [...c.dictation.items].sort((a, b) => a.b - b.b || a.answers![0].localeCompare(b.answers![0]));

const allowlist = {
  version: "pilot-allowlist@1",
  status: "Candidates only. Nothing here is approved: a pilot build shows a question only with a recorded educator approval of that exact id and version.",
  sessions_allowed: ["placement", "spelling_assess"],
  sessions_refused: ["spelling_practice", "spelling_review", "spelling_transfer", "spelling_check", "guided", "explore", "doubling_journey", "check"],
  lessons_allowed: [],
  generated_practice_allowed: [],
  items: [...placement.map((i) => ({ id: i.id, version: i.version, use: "placement" })), ...dictation.map((i) => ({ id: i.id, version: i.version, use: "dictation" }))],
  counts: { placement: placement.length, dictation: dictation.length },
};
const text = JSON.stringify(allowlist, null, 1) + "\n";
if (check) {
  let now = "";
  try {
    now = readFileSync(OUT, "utf8");
  } catch {}
  if (now !== text) {
    console.error("content/english/pilot/allowlist.json no longer matches the content: regenerate it, and have the changed questions reviewed");
    process.exit(1);
  }
} else writeFileSync(OUT, text);
console.log(`${placement.length} placement questions, ${dictation.length} dictation words${check ? ": allowlist up to date" : ": allowlist written"}`);
