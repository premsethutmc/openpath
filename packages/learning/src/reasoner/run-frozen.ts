// Runs the planner over a frozen set; writes traces (deterministic) and stats (timing) separately.
import { readFileSync, writeFileSync } from "node:fs";
import { plan } from "./planner.ts";
const [setPath, tracesOut, statsOut, full] = process.argv.slice(2);
const items = JSON.parse(readFileSync(setPath, "utf8")) as { id: string; text: string; class: string; solution?: string }[];
const traces: unknown[] = [], stats: unknown[] = [];
for (const it of items) {
  const t0 = performance.now();
  let r;
  try { r = plan(it.text, { log: full === "full" }); } catch (e) { r = { outcome: "unsupported", reason: `parse failure: ${(e as Error).message}`, answer: null, steps: [], stats: { visited: 0, generated: 0, duplicates: 0, depth: 0, capped: false } } as any; }
  const ms = performance.now() - t0;
  traces.push({ id: it.id, text: it.text, ...r });
  stats.push({ id: it.id, ms, ...r.stats, outcome: r.outcome, pathLength: r.steps.length });
}
writeFileSync(tracesOut, JSON.stringify(traces, null, 1));
writeFileSync(statsOut, JSON.stringify(stats, null, 1));
