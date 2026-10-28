// Every released question of every contract family, in each presentation (typed, :mc, :w): the verification state must never be "held". Usage: bun form-scan.ts out.json
import { writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
const rows: any[] = [];
for (const [fam, d] of FAMILIES) {
  if (!d.contract) continue; const r: any = { family: fam, typed: { verified: 0, legacy: 0, held: 0 }, mc: { verified: 0, legacy: 0, held: 0 }, word: { verified: 0, legacy: 0, held: 0 }, ex: [] };
  for (const it of pool(fam).items) for (const [k, sfx] of [["typed", ""], ["mc", ":mc"], ["word", ":w"]] as const) {
    if (sfx && !problemOf(it.id + sfx)) continue; const c = contractFor(it.id + sfx)!; r[k][c.verification]++; if (c.reason.startsWith("word form:")) r.wordGuard = (r.wordGuard ?? 0) + 1; if (c.verification === "held" && r.ex.length < 3) r.ex.push(`${it.id + sfx}: ${c.reason.slice(0, 100)}`);
  }
  rows.push(r);
}
const sum = (k: string, v: string) => rows.reduce((a, r) => a + r[k][v], 0);
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(JSON.stringify({ typed: ["verified", "legacy", "held"].map((v) => sum("typed", v)), mc: ["verified", "legacy", "held"].map((v) => sum("mc", v)), word: ["verified", "legacy", "held"].map((v) => sum("word", v)), wordGuardLegacy: rows.reduce((a, r) => a + (r.wordGuard ?? 0), 0), wordGuardFamilies: rows.filter((r) => r.wordGuard).map((r) => [r.family, r.wordGuard]), heldFamilies: rows.filter((r) => r.typed.held + r.mc.held + r.word.held).map((r) => [r.family, r.ex[0]]) }));
