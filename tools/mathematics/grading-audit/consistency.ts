// Generator-internal consistency over EVERY released question (an independent cross-check of the stored answers that needs no grader):
// a multiple-choice form must offer its typed sibling's answer under the keyed letter, offer no duplicate (by value) options, and key a real option;
// a word form must carry the same answer as the typed form of the same parameters. Usage: bun consistency.ts out.json
import { writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { rat, eq } from "./oracle.ts";
const norm = (s: string) => s.replace(/−/g, "-").replace(/\s+/g, " ").trim();
const same = (a: string, b: string) => { const x = rat(a), y = rat(b); return x && y ? eq(x, y) : norm(a) === norm(b); };
const rows: any[] = []; let total = 0;
for (const [fam] of FAMILIES) {
  const items = pool(fam).items;
  const r = { family: fam, released: items.length, mc: 0, mcBad: 0, dupOptions: 0, keyedMismatch: 0, noSibling: 0, word: 0, wordBad: 0, ex: [] as string[] };
  for (const t0 of items) {
    total++;
    for (const suffix of [":mc", ":w"]) {
      const p = problemOf(t0.id + suffix); if (!p) continue; if (suffix === ":w") { r.word++; if (!same(t0.answer, p.answer)) { r.wordBad++; if (r.ex.length < 3) r.ex.push(`${p.id}: word=${p.answer} typed=${t0.answer}`); } continue; }
      r.mc++; const o = p.options ?? []; const k = "ABCD".indexOf(p.answer); let bad = false;
      if (k < 0 || k >= o.length) { bad = true; r.keyedMismatch++; }
      for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) if (same(o[i], o[j])) { r.dupOptions++; bad = true; i = o.length; break; }
      if (k >= 0 && o[k] !== undefined && !same(o[k], t0.answer)) { r.keyedMismatch++; bad = true; }
      if (bad) { r.mcBad++; if (r.ex.length < 3) r.ex.push(`${p.id}: options=${JSON.stringify(o)} key=${p.answer} typed=${t0.answer}`); }
    }
  }
  rows.push(r);
}
const s = (k: string) => rows.reduce((a, r) => a + r[k], 0);
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log({ questions: total, mc: s("mc"), mcBad: s("mcBad"), dupOptions: s("dupOptions"), keyedMismatch: s("keyedMismatch"), noSibling: s("noSibling"), word: s("word"), wordBad: s("wordBad"), famsBad: rows.filter((r) => r.mcBad || r.wordBad).length, ex: rows.filter((r) => r.ex.length).slice(0, 6).map((r) => [r.family, r.ex[0]]) });
