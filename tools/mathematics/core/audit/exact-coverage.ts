/** Coverage gained by the exact checkers (Items 2–3) against audit.json, plus routine per-question latency. */
import * as fs from "node:fs";
import { pool } from "../../../../packages/learning/src/families.ts";
import { NUMBER_FAMILIES } from "../../../../packages/learning/src/exact/number-families.ts";
import { STATS_PROB_FAMILIES } from "../../../../packages/learning/src/exact/stats-prob-families.ts";
import { checkItem, verifyFamily } from "../../../../packages/learning/src/exact/verify.ts";
const dir = new URL("./", import.meta.url).pathname;
const A = JSON.parse(fs.readFileSync(dir + "audit.json", "utf8"));
const fams: any = A.families;
const groups = { number: NUMBER_FAMILIES, "statistics+probability": STATS_PROB_FAMILIES };
const out: any = { groups: {}, latency: {} };
const exactIds = new Set<string>();
const lat: number[] = [];
for (const [g, list] of Object.entries(groups)) {
  const rows = list.map((fx) => {
    exactIds.add(fx.id); const f = fams[fx.id]; const items = pool(fx.id).items as any[];
    let fail = 0; for (const it of items) { const t = performance.now(); const r = checkItem(fx, it); lat.push(performance.now() - t); fail += r.failures.length; }
    return { id: fx.id, competency: f.competency, priorClass: f.cls, questions: items.length, failures: fail, steps: !!fx.steps };
  });
  out.groups[g] = { families: rows.length, questions: rows.reduce((a, r) => a + r.questions, 0), failures: rows.reduce((a, r) => a + r.failures, 0),
    priorKernel: rows.filter((r) => r.priorClass === "kernel").length, priorPartial: rows.filter((r) => r.priorClass === "partial").length, priorCompat: rows.filter((r) => r.priorClass === "compat").length, rows };
}
const rowsC = A.rows as any[];
const comp = rowsC.map((r) => { const ex = r.families.filter((f: string) => exactIds.has(f)).length; const kv = r.families.filter((f: string) => fams[f]?.cls === "kernel").length;
  const allCovered = r.families.length > 0 && r.families.every((f: string) => exactIds.has(f) || fams[f]?.cls === "kernel");
  return { id: r.id, exact: ex, kernel: kv, anyBefore: kv > 0, anyAfter: kv + ex > 0 && r.families.some((f: string) => exactIds.has(f) || fams[f]?.cls === "kernel"), allBefore: r.status === "all-verified", allAfter: allCovered, nFam: r.families.length }; });
out.families = { exactTotal: exactIds.size, newlyVerified: [...exactIds].filter((i) => fams[i].cls !== "kernel").length, alreadyKernel: [...exactIds].filter((i) => fams[i].cls === "kernel").length };
out.competencies = {
  withExactFamily: comp.filter((c) => c.exact > 0).length,
  anyVerifiedBefore: comp.filter((c) => c.anyBefore).length, anyVerifiedAfter: comp.filter((c) => c.anyAfter).length,
  newlyAnyVerified: comp.filter((c) => !c.anyBefore && c.anyAfter).length,
  allVerifiedBefore: comp.filter((c) => c.allBefore).length, allVerifiedAfter: comp.filter((c) => c.allAfter).length,
  newlyAllVerified: comp.filter((c) => !c.allBefore && c.allAfter).map((c) => c.id),
};
const poolsExact = Object.values<any>(out.groups).reduce((a, g) => a + g.questions, 0);
out.volume = { exactVerifiedQuestions: poolsExact, previousKernelBackedQuestions: Object.values<any>(A.families).filter((f) => f.cls === "kernel").reduce((a: number, f: any) => a + f.poolSize, 0), totalQuestions: A.reconciliation.poolProblemsAllFamilies };
lat.sort((a, b) => a - b);
out.latency = { questions: lat.length, meanMs: +(lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(4), p50Ms: +lat[Math.floor(lat.length * 0.5)].toFixed(4), p95Ms: +lat[Math.floor(lat.length * 0.95)].toFixed(4), p99Ms: +lat[Math.floor(lat.length * 0.99)].toFixed(4), maxMs: +lat[lat.length - 1].toFixed(3), note: "one checkItem = independent derivation + isCorrect on exact/equivalent/wrong responses + MC options + steps; warm node, 1 process" };
fs.writeFileSync(dir + "exact-coverage.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ families: out.families, competencies: out.competencies, volume: out.volume, latency: out.latency, groups: Object.fromEntries(Object.entries<any>(out.groups).map(([k, v]) => [k, { families: v.families, questions: v.questions, failures: v.failures, priorKernel: v.priorKernel, priorPartial: v.priorPartial, priorCompat: v.priorCompat }])) }, null, 1));
void verifyFamily;
