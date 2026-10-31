// Grading audit: per-family facts read from the live definitions (curriculum location, generator source, forms and release counts,
// contract and per-question verification route). Usage: bun family-meta.ts data/family-meta.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { modules, poolFamilies } from "../../../packages/learning/src/content.ts";
import { graph } from "../../../packages/learning/src/graph.ts";

const SRC = new URL("../../../packages/learning/src/", import.meta.url);
const files: [string, string][] = [["families.ts", readFileSync(new URL("families.ts", SRC), "utf8")], ...readdirSync(new URL("fam/", SRC)).filter((f) => f.endsWith(".ts")).map((f) => [`fam/${f}`, readFileSync(new URL(`fam/${f}`, SRC), "utf8")] as [string, string])];
const sourceOf = (id: string) => files.find(([, t]) => t.includes(`id: "${id}"`))?.[0] ?? null;
const usedBy = new Map<string, string[]>();
for (const m of modules) for (const f of poolFamilies(m)) usedBy.set(f, [...(usedBy.get(f) ?? []), m.competency]);
const out: Record<string, unknown> = {};
for (const [id, d] of FAMILIES as Map<string, any>) {
  const items = pool(id).items;
  const v: Record<string, number> = {}, types: Record<string, number> = {}, caps: Record<string, number> = {};
  let mc = 0, word = 0;
  for (const q of items) {
    const c = contractFor(q.id)!;
    v[c.verification] = (v[c.verification] ?? 0) + 1; caps[c.capability] = (caps[c.capability] ?? 0) + 1; types[q.type] = (types[q.type] ?? 0) + 1;
    if (d.mc && problemOf(q.id + ":mc")) mc++;
    if (d.word && problemOf(q.id + ":w")) word++;
  }
  const node = (() => { try { return graph.get(d.competency); } catch { return null; } })() as { gradeRange?: number[]; title?: string } | null;
  out[id] = { family: id, title: d.title ?? null, competency: d.competency, skill: d.skill ?? null, gradeRange: node?.gradeRange ?? null, modules: usedBy.get(id) ?? [],
    source: sourceOf(id), released: { typed: items.length, mc, word }, answerTypes: types, expanded: !!items[0]?.expanded, contract: d.contract ? { kind: d.contract.kind, assumptions: d.contract.assumptions ?? [] } : null,
    verification: v, capability: caps, hasTextParser: typeof d.parse === "function" };
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(Object.keys(out).length, "families");
