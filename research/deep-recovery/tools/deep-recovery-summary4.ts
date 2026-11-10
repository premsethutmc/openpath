/**
 * Summary of phase-4 simulation JSONL: per (goal, learner, engine) every run counted (errors stay in the denominator as their own
 * outcome); 95% Wilson intervals for rates, seeded bootstrap (2000) for means and for paired p4 - p3 differences.
 *   node --import tsx ../research/deep-recovery/tools/deep-recovery-summary4.ts <files...>
 */
import { readFileSync } from "node:fs";
import { wilson } from "./deep-recovery-sim-summary";
import { mulberry32 } from "./deep-recovery-sim";

type R = Record<string, any>;
const pct = (k: number, n: number) => { if (!n) return "–"; const [lo, hi] = wilson(k, n); return `${k}/${n} [${Math.round(100 * lo)}–${Math.round(100 * hi)}%]`; };
const boot = (xs: number[]) => {
  if (!xs.length) return "–";
  const r = mulberry32(11), ms: number[] = [];
  for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(r() * xs.length)]; ms.push(s / xs.length); }
  ms.sort((a, b) => a - b);
  return `${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)} [${ms[49].toFixed(1)}–${ms[1949].toFixed(1)}]`;
};
const OUT = ["solved-fresh-unaided", "false-reassurance", "pause", "blocked", "handed-over", "error"];

if (process.argv[1]?.endsWith("deep-recovery-summary4.ts")) {
  const rows = process.argv.slice(2).flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as R));
  const lines: string[] = [`runs ${rows.length}: ${["ok", "error", "n/a"].map((s) => `${s} ${rows.filter((r) => r.status === s).length}`).join(", ")}`];
  const by = new Map<string, R[]>();
  for (const r of rows.filter((x) => x.status !== "n/a")) { const k = `${r.orig} ${r.type} ${r.engine}`; by.set(k, [...(by.get(k) ?? []), r]); }
  for (const k of [...by.keys()].sort()) {
    const rs = by.get(k)!, n = rs.length, oc = (o: string) => rs.filter((r) => (r.status === "error" ? "error" : r.outcome) === o).length;
    lines.push(`\n${k} n=${n}`);
    lines.push(`  ${OUT.map((o) => `${o} ${pct(oc(o), n)}`).join(" | ")}`);
    const ok = rs.filter((r) => r.status === "ok");
    lines.push(`  questions ${boot(ok.map((r) => r.questions))} | lessons ${boot(ok.map((r) => r.lessons))} | effort ${boot(ok.map((r) => r.effort))} | sittings ${boot(ok.map((r) => r.sittings))} | runs with a wrong/unnecessary lesson ${pct(ok.filter((r) => r.wrongLessons > 0).length, n)}`);
    const roots = ok.reduce((a, r) => a + r.roots.length, 0);
    if (roots) lines.push(`  roots ${roots}: identified ${pct(ok.reduce((a, r) => a + r.identified.length, 0), roots)} | taught ${pct(ok.reduce((a, r) => a + r.taught.length, 0), roots)} | repaired ${pct(ok.reduce((a, r) => a + r.repaired.length, 0), roots)}`);
    const firstPause = ok.filter((r) => r.perSitting?.[0]?.outcome === "pause").length;
    if (firstPause) lines.push(`  paused after sitting 1: ${pct(firstPause, n)}; of those, final ${OUT.map((o) => `${o}:${ok.filter((r) => r.perSitting[0].outcome === "pause" && r.outcome === o).length}`).join(" ")}`);
    for (const e of rs.filter((r) => r.status === "error").slice(0, 2)) lines.push(`  ERROR seed ${e.seed}: ${String(e.error).split("\n")[0].slice(0, 160)}`);
  }
  const p3 = new Map(rows.filter((r) => r.engine === "p3" && r.status === "ok").map((r) => [`${r.orig} ${r.type} ${r.seed}`, r]));
  lines.push("\npaired p4 - p3 (same learner seed): Δquestions [bootstrap 95%], Δlessons, solved-fresh-unaided p4/p3, false-reassurance p4/p3");
  const pk = new Map<string, [R, R][]>();
  for (const r of rows.filter((x) => x.engine === "p4" && x.status === "ok")) { const m = p3.get(`${r.orig} ${r.type} ${r.seed}`); if (m) pk.set(`${r.orig} ${r.type}`, [...(pk.get(`${r.orig} ${r.type}`) ?? []), [r, m]]); }
  for (const k of [...pk.keys()].sort()) {
    const ps = pk.get(k)!;
    lines.push(`  ${k} n=${ps.length}: Δquestions ${boot(ps.map(([a, b]) => a.questions - b.questions))} | Δlessons ${boot(ps.map(([a, b]) => a.lessons - b.lessons))} | solved ${ps.filter(([a]) => a.outcome === "solved-fresh-unaided").length}/${ps.filter(([, b]) => b.outcome === "solved-fresh-unaided").length} | FR ${ps.filter(([a]) => a.outcome === "false-reassurance").length}/${ps.filter(([, b]) => b.outcome === "false-reassurance").length}`);
  }
  console.log(lines.join("\n"));
}
