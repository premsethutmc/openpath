// Grading audit, step 1: deterministic stratified sample of released questions from every family (typed, :mc and :w forms).
// Usage: bun sample.ts out.jsonl [typedPerFamily=12] [mcPerFamily=4] [wordPerFamily=3]
// Strata: first/last released item, each parameter's min and max, zero-valued and negative parameters, then a seeded fill.
// Nothing here grades: it only records what the student is shown and what the question stores.
import { writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";

const [out, kT = "12", kM = "4", kW = "3"] = process.argv.slice(2);
const K = { typed: +kT, mc: +kM, word: +kW };
/** mulberry32 seeded by the family id: the same family always gives the same sample */
function rng(seed: string) { let a = [...seed].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function stratified(items: { id: string; params: number[] }[], k: number, seed: string): { id: string; stratum: string }[] {
  if (!items.length) return [];
  const picked = new Map<string, string>(), put = (i: number, s: string) => { if (picked.size < k && i >= 0 && i < items.length && !picked.has(items[i].id)) picked.set(items[i].id, s); };
  put(0, "first"); put(items.length - 1, "last");
  const n = items[0].params.length;
  for (let j = 0; j < n; j++) {
    let lo = 0, hi = 0;
    items.forEach((q, i) => { if (q.params[j] < items[lo].params[j]) lo = i; if (q.params[j] > items[hi].params[j]) hi = i; });
    put(lo, `p${j}-min`); put(hi, `p${j}-max`);
  }
  put(items.findIndex((q) => q.params.includes(0)), "zero-param");
  put(items.findIndex((q) => q.params.some((x) => x < 0)), "negative-param");
  const r = rng(seed);
  for (let guard = 0; picked.size < Math.min(k, items.length) && guard < 50 * k; guard++) put(Math.floor(r() * items.length), "seeded");
  return [...picked].map(([id, stratum]) => ({ id, stratum }));
}
const rows: string[] = [];
for (const [fam, def] of FAMILIES) {
  const items = pool(fam).items;
  const typed = stratified(items, K.typed, fam);
  const forms: [string, string, number][] = [["typed", "", K.typed]];
  if (def.mc) forms.push(["mc", ":mc", K.mc]);
  if (def.word) forms.push(["word", ":w", K.word]);
  for (const [form, suffix, k] of forms) {
    for (const { id, stratum } of typed.slice(0, k)) {
      const qid = id + suffix, pr = problemOf(qid);
      if (!pr) { rows.push(JSON.stringify({ qid, family: fam, form, stratum, error: "problemOf returned null" })); continue; }
      const c = contractFor(qid);
      rows.push(JSON.stringify({ qid, family: fam, form, stratum, params: pr.params, competency: pr.competency, type: pr.type, answer: pr.answer, options: pr.options ?? null, expanded: !!pr.expanded, figure: pr.figure?.type ?? null, prompt: pr.prompt, contract: def.contract?.kind ?? null, verification: c?.verification ?? null, capability: c?.capability ?? null, bugPredictions: pr.bugs.filter((b) => b.predict !== null).map((b) => (Array.isArray(b.predict) ? b.predict.join(", ") : String(b.predict))) }));
    }
  }
}
writeFileSync(out, rows.join("\n") + "\n");
console.log(rows.length, "sampled questions from", FAMILIES.size, "families");
