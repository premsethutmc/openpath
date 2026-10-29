// Exports every released question to JSONL so the independent verifier (Python) never imports production code.
// Usage: bun export.ts <outDir>   -> <outDir>/q/<family>.jsonl (typed form, with its :mc options and :w wording), <outDir>/families.json
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
const out = process.argv[2]; mkdirSync(`${out}/q`, { recursive: true });
// the parameter comment a generator author wrote above `arity:` (documentation only; never the solving code)
const src = new URL("../../../packages/learning/src/", import.meta.url);
const files = ["families.ts", ...readdirSync(new URL("fam/", src)).map((f) => `fam/${f}`)].filter((f) => f.endsWith(".ts"));
const text = new Map(files.map((f) => [f, readFileSync(new URL(f, src), "utf8")]));
function comment(id: string): string {
  for (const [, t] of text) {
    const m = t.match(new RegExp(`id: "${id}",[\\s\\S]{0,400}?arity: \\d+,((?:\\s*//[^\\n]*\\n)+)`));
    if (m) return m[1].split("\n").map((l) => l.trim().replace(/^\/\/\s?/, "")).filter(Boolean).join(" | ");
    const m2 = t.match(new RegExp(`((?:\\s*//[^\\n]*\\n)+)\\s*\\{?\\s*id: "${id}",`));
    if (m2) return m2[1].split("\n").map((l) => l.trim().replace(/^\/\/\s?/, "")).filter(Boolean).join(" | ");
  }
  return "";
}
const fam: any[] = []; let total = 0, pres = 0;
for (const [id, d] of FAMILIES) {
  const rows: string[] = []; let mc = 0, word = 0;
  for (const it of pool(id).items) {
    total++; pres++;
    const r: any = { id: it.id, params: it.params, prompt: it.prompt, type: it.type, answer: it.answer };
    if (it.expanded) r.expanded = true; if (it.figure) r.figure = it.figure;
    const m = problemOf(it.id + ":mc"); if (m) { mc++; pres++; r.mc = { options: m.options, key: m.answer, prompt: m.prompt }; }
    const w = problemOf(it.id + ":w"); if (w) { word++; pres++; r.word = { prompt: w.prompt, answer: w.answer, type: w.type }; }
    rows.push(JSON.stringify(r));
  }
  writeFileSync(`${out}/q/${id}.jsonl`, rows.join("\n") + "\n");
  fam.push({ family: id, title: d.title, competency: d.competency, type: d.type, arity: d.arity, released: rows.length, mcForms: mc, wordForms: word, contract: d.contract?.kind ?? null, comment: comment(id) });
}
writeFileSync(`${out}/families.json`, JSON.stringify(fam));
console.log(JSON.stringify({ families: fam.length, typed: total, presentations: pres, withComment: fam.filter((f) => f.comment).length }));
