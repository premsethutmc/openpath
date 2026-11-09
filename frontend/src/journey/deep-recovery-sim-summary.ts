/** Summarise deep-recovery-sim JSON lines: rates with 95% Wilson intervals. `node --import tsx deep-recovery-sim-summary.ts <files...>` */
import { readFileSync } from "node:fs";
import type { SimResult } from "./deep-recovery-sim";

export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 1];
  const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}
const pct = (k: number, n: number) => { const [lo, hi] = wilson(k, n); return `${k}/${n} (${Math.round((100 * k) / n)}%, ${Math.round(100 * lo)}-${Math.round(100 * hi)})`; };
const stats = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return `mean ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)}, median ${s[Math.floor(s.length / 2)]}, max ${s.at(-1)}`; };

if (process.argv[1]?.endsWith("deep-recovery-sim-summary.ts")) {
  const rows = process.argv.slice(2).flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as SimResult & { error?: string }));
  const errors = rows.filter((r) => r.error);
  const by = new Map<string, SimResult[]>();
  for (const r of rows.filter((x) => !x.error)) by.set(r.type, [...(by.get(r.type) ?? []), r]);
  for (const [t, rs] of by) {
    const n = rs.length, outc = new Map<string, number>();
    for (const r of rs) outc.set(r.outcome, (outc.get(r.outcome) ?? 0) + 1);
    const gap = rs[0].rootsTotal > 0;
    console.log(`\n${t}  n=${n}  outcomes ${[...outc].map(([k, v]) => `${k}:${v}`).join(" ")}`);
    console.log(`  false reassurance ${pct(rs.filter((r) => r.falseReassurance).length, n)} | blocked ${pct(rs.filter((r) => r.outcome === "blocked").length, n)} | effort ${stats(rs.map((r) => r.effort))}`);
    if (gap) console.log(`  all roots found ${pct(rs.filter((r) => r.rootsFound === r.rootsTotal).length, n)} | missed a root ${pct(rs.filter((r) => r.rootsFound < r.rootsTotal).length, n)} | taught a non-gap skill ${pct(rs.filter((r) => r.wrongTaught.length).length, n)}`);
    else console.log(`  any prerequisite question ${pct(rs.filter((r) => r.prereqProbes > 0).length, n)} (${stats(rs.map((r) => r.prereqProbes))}) | any lesson ${pct(rs.filter((r) => r.lessons > 0).length, n)} | solved ${pct(rs.filter((r) => r.outcome.startsWith("solved")).length, n)}`);
    const sec = rs.filter((r) => r.second);
    if (sec.length) console.log(`  after forgetting (2nd episode) n=${sec.length}: root found ${pct(sec.filter((r) => r.second!.rootsFound > 0).length, sec.length)} | false reassurance ${pct(sec.filter((r) => r.second!.falseReassurance).length, sec.length)} | outcomes ${sec.map((r) => r.second!.outcome).join(",")} | effort ${stats(sec.map((r) => r.second!.effort))}`);
  }
  if (errors.length) console.log(`\nerrors: ${errors.length} ${errors.slice(0, 3).map((e) => e.error).join(" | ")}`);
}
