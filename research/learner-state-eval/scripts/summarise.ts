/** node --import tsx scripts/summarise.ts <glob-prefix...>: per kind x subject table (Wilson 95% for rates, bootstrap 95% for means) */
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const rd = (f: string) => (f.endsWith(".gz") ? gunzipSync(readFileSync(f)).toString("utf8") : readFileSync(f, "utf8"));
import { bootMean, wilson } from "../src/harness";
const dir = new URL("../results/", import.meta.url).pathname;
const prefixes = process.argv.slice(2);
const rows = readdirSync(dir).filter((f) => /\.jsonl(\.gz)?$/.test(f) && prefixes.some((p) => f.startsWith(p))).flatMap((f) => rd(dir + f).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const pct = (k: number, n: number) => (n ? `${((100 * k) / n).toFixed(0)}% [${wilson(k, n).map((x) => (100 * x).toFixed(0)).join("-")}] (${k}/${n})` : "n/a");
const mean = (xs: number[]) => (xs.length ? (([m, l, h]) => `${m.toFixed(1)} [${l.toFixed(1)}-${h.toFixed(1)}] n=${xs.length}`)(bootMean(xs)) : "n/a");
const groups = new Map<string, any[]>();
for (const r of rows) { const k = `${r.variant}|${r.kind}|${r.subject.replace("MATH.", "")}`; groups.set(k, [...(groups.get(k) ?? []), r]); }
console.log("| variant | learner | subject | N | false mastery | missed mastery | Qs true-mastery->claim | stale claim after forgetting (Qs) | claim withdrawn | delayed check failed |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const [k, rs] of [...groups].sort()) {
  const [v, kind, subj] = k.split("|");
  const fm = rs.filter((r) => r.falseMastery).length;
  const mmD = rs.filter((r) => r.missedMastery !== null), mm = mmD.filter((r) => r.missedMastery).length;
  const q = rs.filter((r) => r.qToRecognition !== null).map((r) => r.qToRecognition);
  const st = rs.filter((r) => r.staleClaimQs !== null).map((r) => r.staleClaimQs);
  const wd = rs.filter((r) => r.withdrawn !== null), w = wd.filter((r) => r.withdrawn).length;
  const rf = rs.filter((r) => r.retentionFailed !== null), f = rf.filter((r) => r.retentionFailed).length;
  console.log(`| ${v} | ${kind} | ${subj} | ${rs.length} | ${pct(fm, rs.length)} | ${pct(mm, mmD.length)} | ${mean(q)} | ${mean(st)} | ${pct(w, wd.length)} | ${pct(f, rf.length)} |`);
}
