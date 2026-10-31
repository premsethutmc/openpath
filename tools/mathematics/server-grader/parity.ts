import { readFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
const T = JSON.parse(readFileSync(new URL("../../../content/learning/generated.v1.json", import.meta.url), "utf8")).families;
let n = 0, bad = 0, missing = 0; const ex: string[] = [];
for (const [fam, def] of FAMILIES) {
  if (!def.contract) continue;
  const f = T[fam]; if (!f) { missing++; continue; }
  for (const it of pool(fam).items) {
    const c = contractFor(it.id)!; if (c.verification !== "verified") continue;
    const m = it.id.match(/^gen:[a-z0-9]+:(-?\d+(?:,-?\d+)*)(:mc|:w)?$/); const key = m ? m[1] + (m[2] ?? "") : "";
    n++; if (f.items[key] !== c.expected.stored) { bad++; if (ex.length < 5) ex.push(`${it.id}: table=${JSON.stringify(f.items[key])} ts=${JSON.stringify(c.expected.stored)}`); }
  }
}
console.log({ checked: n, mismatches: bad, familiesNotInTable: missing, ex });
