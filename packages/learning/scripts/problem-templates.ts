/**
 * read-problem@1 index: for every family small enough to search, the shapes of the problems it prints (numbers blanked).
 *   bare   the expression alone, where the printed problem is mostly that expression (at least 45% of it)
 *   loose  the expression alone, for the other printed problems
 * Written to content/learning/problem-templates.v1.json. `--check` fails if the file is out of date.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { FAMILIES } from "../src/families.ts";
import { canon, domainSize, pure, SEARCH_LIMIT, shapeKey, skeleton } from "../src/read-problem.ts";

const FILE = new URL("../../../content/learning/problem-templates.v1.json", import.meta.url);
const blank = (s: string) => s.replace(/\d+(?:\.\d+)?/g, "#");
const bare: Record<string, Set<string>> = {}, loose: Record<string, Set<string>> = {};
const add = (m: Record<string, Set<string>>, k: string, v: string) => (m[k] ??= new Set()).add(v);
function* domainOf(domain: [number, number][]): Generator<number[]> {
  const p = domain.map(([lo]) => lo);
  for (;;) { yield [...p]; let k = p.length - 1; while (k >= 0 && p[k] === domain[k][1]) p[k] = domain[k--][0]; if (k < 0) return; p[k]++; }
}
/** 6,000 points of a large domain, the same every run (a fixed linear congruential sequence), plus its corners. */
function* sampleOf(domain: [number, number][]): Generator<number[]> {
  let x = 12345;
  const next = () => (x = (Math.imul(x, 1103515245) + 12345) >>> 0) / 4294967296;
  for (let c = 0; c < 1 << Math.min(domain.length, 6); c++) yield domain.map(([lo, hi], k) => ((c >> k) & 1 ? hi : lo));
  for (let i = 0; i < 6000; i++) yield domain.map(([lo, hi]) => lo + Math.floor(next() * (hi - lo + 1)));
}
let searched = 0;
for (const def of FAMILIES.values()) {
  if (!def.domain) continue;
  searched++;
  // a family too large to list whole is sampled (its shapes are few; the reader then finds the numbers from what was typed)
  const big = domainSize(def.domain) > SEARCH_LIMIT;
  for (const p of big ? sampleOf(def.domain as [number, number][]) : domainOf(def.domain)) {
    if (def.reject(p)) continue;
    let prompt: string;
    try { prompt = def.prompt(p); } catch { continue; }
    const c = canon(prompt);
    // only a problem that asks nothing beyond its expression (a picture, when there is one, is drawn from the same numbers)
    const s = pure(prompt) ? skeleton(prompt) : null;
    if (s) add(s.length >= 0.45 * c.replace(/\s/g, "").length ? bare : loose, shapeKey(blank(s)), def.id);
  }
}
const order = [...FAMILIES.keys()];
const used = order.filter((f) => [bare, loose].some((m) => Object.values(m).some((v) => v.has(f))));
const out = (m: Record<string, Set<string>>) => Object.fromEntries(Object.keys(m).sort().map((k) => [k, [...m[k]].map((f) => used.indexOf(f)).sort((a, b) => a - b)]));
const text = JSON.stringify({ schema: "problem-templates@1", searchLimit: SEARCH_LIMIT, families: used, bare: out(bare), loose: out(loose) }) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(FILE, "utf8") !== text) { console.error("problem-templates.v1.json is out of date: run packages/learning/scripts/problem-templates.ts"); process.exit(1); }
} else writeFileSync(FILE, text);
console.log(`problem templates: ${used.length} of ${FAMILIES.size} families can be read from a typed expression (${searched} searched); ${Object.keys(bare).length} bare, ${Object.keys(loose).length} loose shapes`);
