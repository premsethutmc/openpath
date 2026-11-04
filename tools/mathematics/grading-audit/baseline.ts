// Phase A baseline: recomputes family/question counts and per-question contract routes from the live definitions. Usage: bun baseline.ts data/baseline.json
import { writeFileSync } from "node:fs";
import { FAMILIES, pool } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { modules, poolFamilies } from "../../../packages/learning/src/content.ts";
const referenced = new Set(modules.flatMap((m) => poolFamilies(m)));
const tot: Record<string, number> = {}; const add = (k: string, n = 1) => (tot[k] = (tot[k] ?? 0) + n);
const fams: any[] = [];
for (const [id, d] of FAMILIES as Map<string, any>) {
  const P = pool(id); const v: Record<string, number> = {}; const types: Record<string, number> = {};
  for (const q of P.items) { const c = contractFor(q.id); const k = c ? c.verification : "none"; v[k] = (v[k] ?? 0) + 1; types[q.type] = (types[q.type] ?? 0) + 1; add(`q.${k}`); }
  const ambiguous = P.excluded.filter((e) => e.reason.startsWith("AMBIGUOUS")).length;
  add("families"); add("questions", P.items.length); add("mc", P.items.filter((q) => q.id.endsWith(":mc")).length); add("excludedAmbiguous", ambiguous);
  if (d.contract) { add("contractFamilies"); add(`contract.${d.contract.kind}`); }
  if (referenced.has(id)) { add("referencedFamilies"); add("referencedQuestions", P.items.length); }
  fams.push({ family: id, released: P.items.length, contract: d.contract?.kind ?? null, verification: v, types, ambiguousExcluded: ambiguous, referenced: referenced.has(id) });
}
writeFileSync(process.argv[2], JSON.stringify({ totals: tot, families: fams }));
console.log(JSON.stringify(tot));
