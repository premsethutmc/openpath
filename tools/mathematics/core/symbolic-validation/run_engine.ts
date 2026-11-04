// Batch runner: reads a JSON array of cases {id, problem, lines, opts?}, runs the production unified API, writes compact results.
import { readFileSync, writeFileSync } from "node:fs";
import { assessWorking } from "../../../../packages/learning/src/core/working-assessment.ts";
const cases = JSON.parse(readFileSync(process.argv[2], "utf8")) as any[];
const out: any[] = []; const t0 = performance.now();
for (const c of cases) {
  const t = performance.now(); let r: any;
  try { r = assessWorking(c.problem, c.lines, c.opts ?? {}); } catch (e: any) { out.push({ id: c.id, crash: String(e?.message ?? e).slice(0, 200) }); continue; }
  const d = r.symbolic?.domain ?? r.multivariate?.domain ?? null;
  out.push({ id: c.id, ms: +(performance.now() - t).toFixed(2), engine: r.symbolic ? "uni" : r.multivariate ? "mv" : r.number ? "num" : "old", outcome: r.outcome, first: r.firstInvalidStep,
    steps: r.steps.map((s: any) => s.status), rel: (r.symbolic?.steps ?? r.multivariate?.steps ?? []).map((s: any) => s.relation), domain: d ? { status: d.status, missing: d.missing, narrowed: d.narrowed, implied: d.implied } : null, causes: r.causes });
}
writeFileSync(process.argv[3], JSON.stringify(out)); console.log(`ran ${cases.length} cases in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
