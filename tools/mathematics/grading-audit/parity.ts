// Grading audit: stored-answer parity between the app's generators and the server's generated table (content/learning/generated.v1.json),
// for every released question in every form (typed, :mc, :w). Usage: bun parity.ts data/parity.json
import { readFileSync, writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";

const table = JSON.parse(readFileSync(new URL("../../../content/learning/generated.v1.json", import.meta.url), "utf8")).families as Record<string, { type: string; items: Record<string, string>; expanded?: boolean }>;
const tot = { families: 0, compared: 0, mismatch: 0, missingOnServer: 0, extraOnServer: 0, typeMismatch: 0, expandedMismatch: 0, forms: { typed: 0, mc: 0, word: 0 } };
const mism: unknown[] = [];
for (const [fam, def] of FAMILIES) {
  tot.families++;
  const t = table[fam];
  const keys = new Set(Object.keys(t?.items ?? {}));
  const items = pool(fam).items;
  if (t && t.type !== items[0]?.type) { tot.typeMismatch++; mism.push({ fam, issue: "type", app: items[0]?.type, server: t.type }); }
  if (t && !!t.expanded !== !!items[0]?.expanded) { tot.expandedMismatch++; mism.push({ fam, issue: "expanded" }); }
  for (const q of items) {
    const key = q.params.join(",");
    const forms: [string, string][] = [["typed", ""]];
    if (def.mc) forms.push(["mc", ":mc"]);
    if (def.word) forms.push(["word", ":w"]);
    for (const [form, sfx] of forms) {
      const pr = sfx ? problemOf(q.id + sfx) : q;
      if (!pr) continue;
      tot.forms[form as "typed"]++; tot.compared++;
      const k = key + sfx;
      keys.delete(k);
      const server = t?.items[k];
      if (server === undefined) { tot.missingOnServer++; if (mism.length < 200) mism.push({ id: pr.id, issue: "missing on server" }); }
      else if (server !== pr.answer) { tot.mismatch++; if (mism.length < 200) mism.push({ id: pr.id, issue: "answer", app: pr.answer, server }); }
    }
  }
  tot.extraOnServer += keys.size;
}
writeFileSync(process.argv[2], JSON.stringify({ totals: tot, examples: mism }, null, 1));
console.log(JSON.stringify(tot));
