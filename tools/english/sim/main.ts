/** node tools/english/sim/main.ts — run the ten-learner simulation twice, measure, write the report. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, loadContext } from "../load.ts";
import { CRITERIA, PROTOCOL } from "./criteria.ts";
import { renderReport } from "./report.ts";
import { fingerprint, measures, runAll } from "./simulate.ts";

const ctx = loadContext();
const first = await runAll(ctx);
const second = await runAll(ctx);
const fps: [string, string] = [fingerprint(first), fingerprint(second)];
const result = await measures(ctx, first, fps);
const out = join(REPO, "tools", "english", "out");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "simulation-report.html"), renderReport(ctx, first, result.measures, { generatedAt: new Date().toISOString().slice(0, 10), fingerprint: fps[0] }));
writeFileSync(join(out, "simulation-results.json"), JSON.stringify({ protocol: PROTOCOL, criteria: CRITERIA, fingerprint: fps[0], measures: result.measures, efficiency: result.efficiency, safety: result.safety }, null, 1));
for (const m of result.measures) console.log(`${m.pass ? "PASS" : "MISS"}  ${m.id}  ${m.name}: ${m.value} (pass level ${m.passLevel})`);
console.log(`\n${result.measures.filter((m) => m.pass).length} of ${result.measures.length} pass. Report: tools/english/out/simulation-report.html`);
