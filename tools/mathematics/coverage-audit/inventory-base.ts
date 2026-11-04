// Gate 1: machine-readable base inventory of every generated family, from the actual definitions and actual generated questions. Usage: bun inventory-base.ts out.json
import { writeFileSync } from "node:fs";
import { FAMILIES, pool } from "../../../packages/learning/src/families.ts";
import { canonicalOf } from "../../../packages/learning/src/answer-types.ts";
const out: any[] = [];
const pick = <T,>(a: T[], k: number) => { if (a.length <= k) return a; const r: T[] = []; for (let i = 0; i < k; i++) r.push(a[Math.floor((i * (a.length - 1)) / (k - 1 || 1))]); return r; };
for (const [id, d] of FAMILIES as Map<string, any>) {
  const P = pool(id), items = P.items;
  const samples = pick(items, 5).map((q: any) => ({ id: q.id, params: q.params, prompt: q.prompt, answer: q.answer, type: q.type, options: q.options ?? null, figure: q.figure?.type ?? null, expanded: !!q.expanded, bugPredictions: q.bugs.filter((b: any) => b.predict !== null).length, canonical: (() => { try { return canonicalOf(q.type, q.answer); } catch { return null; } })() }));
  const [a, b, c] = ["competency", "skill", "title"].map((k) => d[k] ?? null);
  out.push({ family: id, title: c, competency: a, skill: b, strand: String(a).split(".")[1] ?? null, topic: String(a).split(".")[2] ?? null, answerType: d.type, hasMcForm: !!d.mc, hasTextParser: typeof d.parse === "function" && d.parse.toString().replace(/\s/g, "") !== "()=>null", arity: d.arity, releasedQuestions: items.length, excluded: P.excluded.length, rangeRule: d.range ?? null, samples });
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(out.length, "families", out.reduce((s, f) => s + f.releasedQuestions, 0), "questions");
