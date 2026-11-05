/** node --import tsx scripts/compare.ts <tag> <variantA> <variantB>: paired (same kind, subject, seed) differences B - A pooled over subjects,
 *  with a paired percentile bootstrap 95% CI (2000 resamples, seed 11). Metrics: false mastery (any step), false claim standing at end of run,
 *  missed mastery (session 1), Qs true-mastery -> claim (pairs where both defined). */
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const rd = (f: string) => (f.endsWith(".gz") ? gunzipSync(readFileSync(f)).toString("utf8") : readFileSync(f, "utf8"));
import { Rng } from "../../synthetic-learners/src/rng";
const [tag, A, B] = process.argv.slice(2);
const dir = new URL("../results/", import.meta.url).pathname;
const SH = ["independent", "transfer", "verified"];
const load = (v: string) => new Map(readdirSync(dir).filter((f) => f.startsWith(`${v}-${tag}-MATH`)).flatMap((f) => rd(dir + f).trim().split("\n").map((l) => JSON.parse(l))).map((r) => [`${r.kind}|${r.subject}|${r.seed}`, r]));
const a = load(A), b = load(B);
const endFalse = (r: any) => { const l = r.steps.at(-1); return SH.includes(l[5]) && !l[4]; };
const metrics: [string, (r: any) => number | null][] = [
  ["false mastery (any step)", (r) => +r.falseMastery],
  ["false claim at end of run", (r) => +endFalse(r)],
  ["missed mastery (S1)", (r) => (r.missedMastery === null ? null : +r.missedMastery)],
  ["Qs true-mastery->claim", (r) => r.qToRecognition],
  ["answered questions", (r) => r.answered],
];
function boot(d: number[]): [number, number, number] {
  const r = new Rng(11), m = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length, ms: number[] = [];
  for (let i = 0; i < 2000; i++) { const s: number[] = []; for (let j = 0; j < d.length; j++) s.push(d[r.int(0, d.length - 1)]); ms.push(m(s)); }
  ms.sort((x, y) => x - y); return [m(d), ms[50], ms[1949]];
}
const kinds = [...new Set([...a.values()].map((r) => r.kind))].sort();
console.log(`| learner | metric | ${A} | ${B} | paired diff (B-A) [95% CI] | pairs |`);
console.log("|---|---|---|---|---|---|");
for (const k of kinds) for (const [name, f] of metrics) {
  const xa: number[] = [], xb: number[] = [];
  for (const [key, ra] of a) { if (ra.kind !== k) continue; const rb = b.get(key); if (!rb) continue; const va = f(ra), vb = f(rb); if (va === null || vb === null) continue; xa.push(va); xb.push(vb); }
  if (!xa.length) continue;
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const [d, lo, hi] = boot(xb.map((v, i) => v - xa[i]));
  const fmt = (x: number) => (name.startsWith("Qs") || name.startsWith("answered") ? x.toFixed(1) : `${(100 * x).toFixed(0)}%`);
  console.log(`| ${k} | ${name} | ${fmt(mean(xa))} | ${fmt(mean(xb))} | ${fmt(d)} [${fmt(lo)}, ${fmt(hi)}] | ${xa.length} |`);
}
