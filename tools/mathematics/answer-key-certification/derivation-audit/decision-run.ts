// bun decision-run.ts <out.json>  — runs every corpus case through the CURRENT engine and records the decision (read-only).
import { writeFileSync } from "node:fs";
import { assessMathematicalWorking } from "../../../../packages/learning/src/unified-math-engine.ts";
import { stopGeometryWorkers } from "../../../../packages/learning/src/geometry-worker.ts";
import { CASES } from "./decision-corpus.ts";
const nat = (t: string) => ({ format: "natural" as const, text: t });
const res: Record<string, unknown> = {}; const t0 = performance.now();
for (const c of CASES) {
  const t = performance.now();
  const r: any = await assessMathematicalWorking({ domain: c.domain, statement: c.statement } as never, nat(c.lines.join("\n")));
  res[c.id] = { group: c.group, expect: c.expect, label: c.lines[0].slice(0, 60), classification: r.classification, firstInvalidStep: r.firstInvalidStep, steps: (r.steps || []).map((s: any) => s.classification[0]).join(""), ms: Math.round(performance.now() - t) };
}
writeFileSync(process.argv[2], JSON.stringify({ totalMs: Math.round(performance.now() - t0), cases: CASES.length, results: res }, null, 1));
console.log(`${CASES.length} cases, ${Math.round(performance.now() - t0)} ms`);
stopGeometryWorkers();
