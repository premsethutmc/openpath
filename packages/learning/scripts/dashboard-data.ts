/**
 * Writes the curriculum dashboard's data (dashboard-index@1) into a build folder: index.json and one file per board
 * release. Derived at build time from the repository (releases, the coverage compiler's committed output, the module
 * library, family specifications, written tasks); nothing here is committed or decided.
 *
 *   node --import tsx packages/learning/scripts/dashboard-data.ts <out-dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDashboard, fileOf } from "../src/dashboard-build";

const out = process.argv[2];
if (!out) throw new Error("usage: dashboard-data.ts <out-dir>");
mkdirSync(out, { recursive: true });
const { index, releases } = buildDashboard();
for (const r of releases) writeFileSync(join(out, fileOf(r.release)), JSON.stringify(r));
writeFileSync(join(out, "index.json"), JSON.stringify(index));
console.log(`dashboard data: ${releases.length} releases, ${index.generated.families} families, ${index.generated.writtenTasks} written tasks, ${index.generated.requirements} outcomes → ${out}`);
