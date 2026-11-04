// Usage: bun compile.ts  -> reads authored/*.json (arrays of compact cases), writes frozen-inputs candidate cases.json (inputs only) and labels.json (labels only). Engine-free.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { compileProblem, compileWorking } from "./dsl.ts";
const dir = new URL("./authored/", import.meta.url).pathname; const here = new URL("./", import.meta.url).pathname;
const VERD = new Set(["verified", "invalid", "incomplete", "missing-assumption", "unsupported", "ambiguous"]);
const cases: any[] = [], labels: any[] = [], errs: string[] = []; const ids = new Set<string>();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  let arr: any[]; try { arr = JSON.parse(readFileSync(dir + f, "utf8")); } catch (e) { errs.push(f + ": bad JSON " + e); continue; }
  for (const c of arr) { try {
    if (ids.has(c.id)) throw new Error("duplicate id"); ids.add(c.id);
    if (!VERD.has(c.exp)) throw new Error("bad exp " + c.exp); for (const a of c.alt ?? []) if (!VERD.has(a)) throw new Error("bad alt");
    if (!c.why || !c.cat) throw new Error("missing why/cat");
    cases.push({ id: c.id, problem: compileProblem(c.p), studentWorking: compileWorking(c.w) });
    labels.push({ id: c.id, cat: c.cat, tags: c.tags ?? [], exp: c.exp, alt: c.alt ?? [], why: c.why, author: f });
  } catch (e) { errs.push(`${f}:${c?.id}: ${e}`); } } }
const only = process.argv[2] === "--check";
if (!only) { writeFileSync(here + "cases.json", JSON.stringify(cases)); writeFileSync(here + "labels.json", JSON.stringify(labels)); }
const byCat: Record<string, number> = {}; for (const l of labels) byCat[l.cat] = (byCat[l.cat] ?? 0) + 1;
const byExp: Record<string, number> = {}; for (const l of labels) byExp[l.exp] = (byExp[l.exp] ?? 0) + 1;
console.log("cases", cases.length, "errors", errs.length, JSON.stringify(byExp)); if (errs.length) console.log(errs.slice(0, 40).join("\n"));
