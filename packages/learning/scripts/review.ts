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
import { FAMILIES } from "../src/families";
import { decide, effectiveState, familyItem, itemOf, release, submit, sync, syncFamily, type Registry } from "../src/review";
import { validateFamily } from "../src/spec";
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
const families = [...FAMILIES.values()].filter((f) => f.domain).map((f) => f.id);
const itemFor = (t: string) => (t.startsWith("family:") || t.startsWith("module:") ? t : itemOf(t));
const targets = (t: string) => (t === "all" ? [...families.map(familyItem), ...modules.map((m) => itemOf(m.competency))] : [itemFor(t)]);
const entry = (item: string) => {
  const e = reg.entries.find((x) => x.item === item);
  if (!e) throw new Error(`${item}: not in the registry (run sync)`);
  return e;
};
const problemsOf = (item: string) => {
  if (item.startsWith("family:")) {
    const v = validateFamily(item.slice(7));
    return [...v.deterministic.failures, ...v.property.failures, ...v.boundary.failures];
  }
  return validateModule(modules.find((m) => itemOf(m.competency) === item)!);
};
if (cmd === "sync") {
  for (const f of families) put(syncFamily(reg.entries.find((x) => x.item === familyItem(f)), f, at));
  for (const m of modules) put(sync(reg.entries.find((x) => x.item === itemOf(m.competency)), m, authorOf(m.competency), at));
} else if (cmd === "submit") {
  for (const c of targets(target)) {
    const e = entry(c);
    if (target === "all" && e.state !== "draft") continue;
    const problems = problemsOf(c);
    // "all" submits what validates and reports the rest (they stay drafts)
    if (target === "all" && problems.length) console.log(`not submitted: ${c}: ${problems.join("; ")}`);
    else put(submit(e, flag("by"), at, problems));
  }
} else if (cmd === "approve" || cmd === "request-changes" || cmd === "reject") put(decide(entry(itemFor(target)), { by: flag("educator"), role: flag("educator") ? "educator" : "engineer" }, cmd === "approve" ? "approve" : cmd === "reject" ? "reject" : "request_changes", at, flag("note")));
else if (cmd === "release") put(release(entry(itemFor(target)), flag("by"), at, reg));
else if (cmd !== "status") throw new Error(`unknown command ${cmd}`);
reg.entries.sort((a, b) => a.item.localeCompare(b.item));
reg.schema = "content-review@2";
if (cmd !== "status") writeFileSync(file, JSON.stringify(reg, null, 1) + "\n");
for (const e of reg.entries) console.log(`${effectiveState(e).padEnd(18)} ${e.origin.padEnd(12)} ${e.item}`);
