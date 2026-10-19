/**
 * The content-production pipeline, step 3: educator review of modules (src/review.ts), recorded in
 * content/learning/review.v1.json so that every change is visible in a pull request.
 *
 *   node --import tsx packages/learning/scripts/review.ts status
 *   … sync                                         add new modules as drafts; a changed module goes back to draft
 *   … submit <competency|all> --by <name>          a draft that validates → submitted (awaiting an educator)
 *   … approve <competency> --educator <name> --note "<what was checked>"
 *   … request-changes <competency> --educator <name> --note "<what to change>"
 *   … release <competency> --by <name>             approved → released (its questions then count as validated)
 *
 * Approve, request-changes and release are for people with those roles. This tool records the name given; the pull
 * request that changes review.v1.json is where the identity is checked.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { modules, synthesisedModules } from "../src/content";
import { decide, effectiveState, itemOf, release, submit, sync, type Registry } from "../src/review";
import { validateModule } from "../src/validate";

const file = join(import.meta.dirname, "../../../content/learning/review.v1.json");
const reg = JSON.parse(readFileSync(file, "utf8")) as Registry;
const [cmd, target] = process.argv.slice(2);
const flag = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] ?? "" : "";
};
const at = flag("at") || new Date().toISOString();
const authorOf = (c: string) => (synthesisedModules.find((m) => m.competency === c)?.provenance.author as string | undefined) ?? "OpenPath (written with AI assistance; not educator-reviewed)";
const put = (e: Registry["entries"][number]) => {
  const i = reg.entries.findIndex((x) => x.item === e.item);
  if (i >= 0) reg.entries[i] = e;
  else reg.entries.push(e);
};
const targets = (t: string) => (t === "all" ? modules.map((m) => m.competency) : [t]);
const entry = (c: string) => {
  const e = reg.entries.find((x) => x.item === itemOf(c));
  if (!e) throw new Error(`${c}: not in the registry (run sync)`);
  return e;
};
if (cmd === "sync") for (const m of modules) put(sync(reg.entries.find((x) => x.item === itemOf(m.competency)), m, authorOf(m.competency), at));
else if (cmd === "submit") {
  for (const c of targets(target)) {
    const e = entry(c);
    if (target === "all" && e.state !== "draft") continue;
    const problems = validateModule(modules.find((m) => m.competency === c)!);
    // "all" submits what validates and reports the rest (they stay drafts)
    if (target === "all" && problems.length) console.log(`not submitted: ${c}: ${problems.join("; ")}`);
    else put(submit(e, flag("by"), at, problems));
  }
} else if (cmd === "approve" || cmd === "request-changes") put(decide(entry(target), { by: flag("educator"), role: flag("educator") ? "educator" : "engineer" }, cmd === "approve" ? "approve" : "request_changes", at, flag("note")));
else if (cmd === "release") put(release(entry(target), flag("by"), at));
else if (cmd !== "status") throw new Error(`unknown command ${cmd}`);
reg.entries.sort((a, b) => a.item.localeCompare(b.item));
if (cmd !== "status") writeFileSync(file, JSON.stringify(reg, null, 1) + "\n");
for (const e of reg.entries) console.log(`${effectiveState(e, modules.find((m) => m.competency === e.competency) ?? null).padEnd(18)} ${e.origin.padEnd(12)} ${e.competency}`);
