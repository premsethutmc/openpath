/** Writes the stage A1 adaptive-loop traces: bun frontend/scripts/adaptive-trace.ts [outdir] (default docs/product/evidence). */
import { mkdirSync, writeFileSync } from "node:fs";
import { PERSONAS, traceMarkdown } from "../src/learning/adaptive-loop";
const dir = process.argv[2] ?? new URL("../../docs/product/evidence/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const runs = PERSONAS().map((p) => ({ title: p.title, r: p.run() }));
writeFileSync(`${dir}/adaptive-loop-traces.json`, JSON.stringify(runs, null, 1) + "\n");
writeFileSync(`${dir}/adaptive-loop-traces.md`, traceMarkdown(runs));
console.log(runs.map((x) => `${x.r.learner}: ${x.r.steps.length} steps, ${x.r.final.status}`).join("\n"));
