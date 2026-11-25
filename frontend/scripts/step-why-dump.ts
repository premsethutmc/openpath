/**
 * step-why@1 helper: for every family defined in the given source files, print its id, a sample question and the distinct
 * steps it makes (id, op, the worked line), and whether it already has stepWhy. Run from frontend/:
 *   node --import tsx scripts/step-why-dump.ts ../packages/learning/src/fam/b07.ts [more files]
 */
import { readFileSync } from "node:fs";
import { FAMILIES, explainStep, pool } from "../../packages/learning/src/families";
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, "utf8");
  const ids = [...src.matchAll(/^ {2,4}id: "([^"]+)"/gm)].map((m) => m[1]).filter((id) => FAMILIES.has(id));
  for (const id of ids) {
    const f = FAMILIES.get(id)!;
    let items: ReturnType<typeof pool>["items"] = [];
    try { items = pool(id).items; } catch { /* a family with no pool */ }
    const seen = new Map<string, string>();
    for (const pr of items.slice(0, 12)) for (const s of pr.steps) { const k = `${s.id}|${s.op}`; if (!seen.has(k)) seen.set(k, explainStep(pr, s)); }
    console.log(`\n## ${id}${f.stepWhy ? "  [has stepWhy]" : ""}  (${f.competency})`);
    if (items[0]) console.log(`Q: ${items[0].prompt.slice(0, 220)}`);
    for (const [k, line] of seen) console.log(`  step ${k}: ${line.slice(0, 200)}`);
  }
}
