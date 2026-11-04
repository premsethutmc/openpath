// Exports ONLY the option texts the student sees for choice-type items (no solving info) -> <outDir>/opts/<family>.jsonl
// Usage: bun export_options.ts <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { FAMILIES, pool } from "../../../packages/learning/src/families.ts";
const out = process.argv[2]; mkdirSync(`${out}/opts`, { recursive: true });
let fams = 0, qs = 0;
for (const [id, d] of FAMILIES) {
  if (d.type !== "choice") continue;
  const rows = pool(id).items.map((it: any) => { qs++; return JSON.stringify({ id: it.id, options: it.options ?? null }); });
  writeFileSync(`${out}/opts/${id}.jsonl`, rows.join("\n") + "\n"); fams++;
}
console.log(JSON.stringify({ choiceFamilies: fams, questions: qs }));
