// Runs the Phase-2 derivation harness over the oracle-labelled cases and writes compact results.
import { readFileSync, writeFileSync } from "node:fs";
import { assessDerivation } from "../../../../packages/learning/src/core/derivation.ts";
const cases = JSON.parse(readFileSync(process.argv[2], "utf8")) as any[]; const out: any[] = []; const t0 = performance.now();
for (const c of cases) {
  const t = performance.now();
  try { const r = assessDerivation({ problem: c.problem, lines: c.lines }); out.push({ id: c.id, ms: +(performance.now() - t).toFixed(2), math: r.mathematics, cond: r.conditionality, first: r.firstInvalidStep, unsup: r.firstUnsupportedStep, outstanding: r.outstandingObligations, obligations: r.obligations.length, repair: r.laterLinesDoNotRepair }); }
  catch (e: any) { out.push({ id: c.id, crash: String(e?.message ?? e).slice(0, 200) }); }
}
writeFileSync(process.argv[3], JSON.stringify(out)); console.log(`ran ${cases.length} in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
