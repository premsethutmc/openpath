// Whole-pool validation of every generator contract: verified / legacy / held per family. Usage: bun contract-pools.ts out.json
import { writeFileSync } from "node:fs";
import { FAMILIES, pool } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
const rows: any[] = []; const t0 = performance.now();
for (const [id, d] of FAMILIES) { if (!d.contract) continue; const c = { verified: 0, legacy: 0, held: 0, human: 0 } as Record<string, number>; const why: string[] = [];
  const items = pool(id).items; for (const q of items) { const k = contractFor(q.id)!; c[k.verification]++; if (k.verification !== "verified" && why.length < 2) why.push(`${q.id} ${k.verification}: ${k.reason.slice(0, 110)}`); }
  rows.push({ family: id, kind: d.contract.kind, released: items.length, ...c, why }); }
const sum = (k: string) => rows.reduce((a, r) => a + r[k], 0);
writeFileSync(process.argv[2], JSON.stringify(rows));
for (const r of rows) if (r.held || r.legacy > r.released * 0.3) console.log(r.family, r.kind, JSON.stringify({ v: r.verified, l: r.legacy, h: r.held }), r.why);
console.log({ families: rows.length, released: sum("released"), verified: sum("verified"), legacy: sum("legacy"), held: sum("held"), sec: ((performance.now() - t0) / 1000).toFixed(1) });
