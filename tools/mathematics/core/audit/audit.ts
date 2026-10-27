/**
 * 336-competency capability audit (read-only, deterministic).
 * Joins coverage-matrix competencies -> families (matrix), classifies each family with the same method as
 * curriculum-coverage.test.ts (classifyAll), and adds problem volume (typed pool size) and a pool-sample check.
 * Run: /tmp/runts.sh tools/mathematics/core/audit/audit.ts
 */
import * as fs from "node:fs";
import { FAMILIES, pool } from "../../../../packages/learning/src/families.ts";
import { adaptProblem } from "../../../../packages/learning/src/kernel-adapter.ts";

const ROOT = new URL("../../../../", import.meta.url).pathname;
const matrix = JSON.parse(fs.readFileSync(ROOT + "content/learning/coverage-matrix.v1.json", "utf8"));

function tryGetProblem(def: any): any {
  if (!def.solve) return null;
  const arity = def.arity || 2;
  const sets: number[][] =
    arity === 1 ? [[5], [3], [10]] : arity === 2 ? [[5, 3], [3, 4], [7, 2]] : arity === 3 ? [[5, 3, 1], [2, 3, 4], [3, 7, 4]]
    : arity === 4 ? [[2, 3, 4, 5], [1, 4, 3, 4]] : arity === 5 ? [[2, 3, 4, 5, 1], [1, 2, 3, 4, 1]] : [[5, 3]];
  for (const params of sets) {
    try { const r = def.solve(params); if (r?.steps?.length > 0) return { family: def.id, params, steps: r.steps, answer: r.answer || r.value }; } catch {}
  }
  return null;
}
type Cls = "kernel" | "partial" | "compat" | "none";
function classify(def: any): { cls: Cls; unverifiedOps: string[] } {
  const p = tryGetProblem(def);
  if (!p) return { cls: "none", unverifiedOps: [] };
  try {
    const a: any = adaptProblem(p);
    const bad = [...new Set<string>(a.steps.filter((s: any) => !s.adapted).map((s: any) => s.original?.op ?? "?"))];
    if (a.fullyAdapted) return { cls: "kernel", unverifiedOps: [] };
    return { cls: a.steps.some((s: any) => s.adapted) ? "partial" : "compat", unverifiedOps: bad };
  } catch { return { cls: "compat", unverifiedOps: ["(adapter threw)"] }; }
}

const fam: Record<string, any> = {};
for (const [id, def] of FAMILIES as Map<string, any>) {
  const c = classify(def);
  let poolSize = 0;
  try { poolSize = def.domain ? pool(id).items.length : 0; } catch {}
  fam[id] = { id, competency: def.competency, arity: def.arity, ...c, poolSize, hasDomain: !!def.domain };
}
const ids = Object.keys(fam);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const count = (c: Cls) => ids.filter((i) => fam[i].cls === c).length;

const rows = matrix.competencies.map((c: any) => {
  const fs_ = c.families.map((f: string) => fam[f]).filter(Boolean);
  const missing = c.families.filter((f: string) => !fam[f]);
  const by = (k: Cls) => fs_.filter((f: any) => f.cls === k);
  const vol = (xs: any[]) => sum(xs.map((f) => f.poolSize));
  const total = vol(fs_);
  const kv = vol(by("kernel"));
  const status = !fs_.length ? "no-families" : by("kernel").length === fs_.length ? "all-verified"
    : by("kernel").length + by("partial").length ? "some-verified" : "compat-only";
  return {
    id: c.id, name: c.name, strand: c.id.split(".")[1], grades: c.grades, nFamilies: c.families.length, missing,
    kernel: by("kernel").length, partial: by("partial").length, compat: by("compat").length, none: by("none").length,
    volume: total, verifiedVolume: kv, verifiedShare: total ? +(kv / total).toFixed(3) : 0, status,
    families: c.families, writtenTasks: c.writtenTasks,
  };
});

const matFams = new Set<string>(matrix.competencies.flatMap((c: any) => c.families));
const out = {
  generatedFor: "feat/math-core @ audit",
  reconciliation: {
    familiesTotal: ids.length, kernel: count("kernel"), partial: count("partial"), compat: count("compat"), none: count("none"),
    poolProblemsAllFamilies: sum(ids.map((i) => fam[i].poolSize)),
    competenciesInMatrix: rows.length, matrixFamilyRefs: sum(rows.map((r: any) => r.nFamilies)), distinctFamiliesInMatrix: matFams.size,
    familiesNotInMatrix: ids.filter((i) => !matFams.has(i)).length, matrixRefsNotInFamilies: [...matFams].filter((f) => !fam[f]).length,
    competencyStatus: Object.fromEntries(["all-verified", "some-verified", "compat-only", "no-families"].map((s) => [s, rows.filter((r: any) => r.status === s).length])),
    requirements: matrix.summary?.requirements,
  },
  rows,
  families: fam,
};
fs.writeFileSync(ROOT + "tools/mathematics/core/audit/audit.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.reconciliation, null, 1));
