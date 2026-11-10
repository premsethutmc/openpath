/**
 * Summary of phase-6 (sim6) JSONL: every run counted (errors stay in each denominator), 95% Wilson intervals for rates, seeded
 * bootstrap (2000) for means and for paired differences against the current policy on the same seed ("selective" in experiment A,
 * "accept" in experiment B). Extra questions and extra sittings are reported separately.
 *   node --import tsx ../research/deep-recovery/tools/deep-recovery-summary6.ts <files...>
 */
import { readFileSync } from "node:fs";
import { wilson } from "./deep-recovery-sim-summary";
import { mulberry32 } from "./deep-recovery-sim";

type R = Record<string, any>;
const pct = (k: number, n: number) => { if (!n) return "–"; const [lo, hi] = wilson(k, n); return `${k}/${n} [${Math.round(100 * lo)}–${Math.round(100 * hi)}%]`; };
const boot = (xs: number[]) => {
  if (!xs.length) return "–";
  const r = mulberry32(17), ms: number[] = [];
  for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(r() * xs.length)]; ms.push(s / xs.length); }
  ms.sort((a, b) => a - b);
  return `${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)} [${ms[49].toFixed(2)}–${ms[1949].toFixed(2)}]`;
};
const oc = (r: R) => (r.status === "error" ? "error" : r.outcome);
const REF: Record<string, string> = { A: "selective", B: "accept" };

if (process.argv[1]?.endsWith("deep-recovery-summary6.ts")) {
  const rows = process.argv.slice(2).flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as R));
  const L: string[] = [`runs ${rows.length}: ok ${rows.filter((r) => r.status === "ok").length}, error ${rows.filter((r) => r.status === "error").length}`];
  for (const exp of ["A", "B"]) {
    const ex = rows.filter((r) => r.exp === exp);
    if (!ex.length) continue;
    L.push(`\n=== experiment ${exp} (reference: ${REF[exp]})`);
    const pols = [...new Set(ex.map((r) => r.policy))];
    for (const cell of [...new Set(ex.map((r) => `${r.orig} ${r.type}`))].sort()) {
      L.push(`${cell}`);
      const ref = new Map(ex.filter((r) => `${r.orig} ${r.type}` === cell && r.policy === REF[exp] && r.status === "ok").map((r) => [r.seed, r]));
      for (const p of pols) {
        const rs = ex.filter((r) => `${r.orig} ${r.type}` === cell && r.policy === p), ok = rs.filter((r) => r.status === "ok"), n = rs.length;
        const outs = [...new Set(rs.map(oc))].map((o) => `${o}:${rs.filter((r) => oc(r) === o).length}`).join(" ");
        let line = `  ${p.padEnd(20)} n=${n} ${outs} | false-solved ${pct(rs.filter((r) => oc(r) === "false-reassurance").length, n)} (via right first try ${rs.filter((r) => oc(r) === "false-reassurance" && r.firstTryClaim).length}) | q ${boot(ok.map((r) => r.questions))} | sittings ${boot(ok.map((r) => r.sittings))}`;
        if (ok[0]?.noGap) line += ` | recognised in sitting 1 ${pct(ok.filter((r) => r.claimAt?.sitting === 1 && r.can).length, n)}`;
        const conf = ok.filter((r) => r.confirming);
        if (exp === "A") line += ` | claims whose confirming answers repeat a problem or a teaching screen: ${conf.filter((r) => r.confirming.distinctKeys < r.confirming.n || r.confirming.fromTeaching > 0).length}/${conf.length}`;
        L.push(line);
        if (p !== REF[exp]) {
          const ps = ok.filter((r) => ref.has(r.seed)).map((r) => [r, ref.get(r.seed)!] as [R, R]);
          L.push(`  ${"".padEnd(20)} paired vs ${REF[exp]} n=${ps.length}: Δquestions ${boot(ps.map(([a, b]) => a.questions - b.questions))} | Δsittings ${boot(ps.map(([a, b]) => a.sittings - b.sittings))} | false-solved ${ps.filter(([a]) => a.outcome === "false-reassurance").length} vs ${ps.filter(([, b]) => b.outcome === "false-reassurance").length}`);
        }
      }
    }
    L.push(`pooled (both goals):`);
    for (const t of [...new Set(ex.map((r) => r.type))]) for (const p of pols) {
      const rs = ex.filter((r) => r.type === t && r.policy === p), ok = rs.filter((r) => r.status === "ok"), n = rs.length;
      const refs = new Map(ex.filter((r) => r.type === t && r.policy === REF[exp] && r.status === "ok").map((r) => [`${r.orig}:${r.seed}`, r]));
      const ps = ok.filter((r) => refs.has(`${r.orig}:${r.seed}`)).map((r) => [r, refs.get(`${r.orig}:${r.seed}`)!] as [R, R]);
      L.push(`  ${t.padEnd(15)} ${p.padEnd(20)} n=${n} false-solved ${pct(rs.filter((r) => oc(r) === "false-reassurance").length, n)} | solved-fresh-unaided ${pct(rs.filter((r) => oc(r) === "solved-fresh-unaided").length, n)} | errors ${rs.filter((r) => r.status === "error").length} | extra questions vs ${REF[exp]} ${boot(ps.map(([a, b]) => a.questions - b.questions))} | extra sittings ${boot(ps.map(([a, b]) => a.sittings - b.sittings))}${ok[0]?.noGap ? ` | recognised in sitting 1 ${pct(ok.filter((r) => r.claimAt?.sitting === 1 && r.can).length, n)} | paid nothing extra ${pct(ps.filter(([a, b]) => a.questions <= b.questions && a.sittings <= b.sittings).length, n)}` : ""}`);
    }
  }
  console.log(L.join("\n"));
}
