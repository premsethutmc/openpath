/**
 * Summary of deep-recovery simulation JSONL (phase 3), with 95% Wilson intervals for rates and seeded bootstrap (2000 resamples)
 * for means and paired differences. Every run in the input is counted: errored / incomplete / timed-out runs stay in every
 * denominator (as "not solved", "not found", "no false reassurance") and are listed. n/a cells are listed separately.
 *   node --import tsx src/journey/deep-recovery-summary3.ts <files...>             phase-3 records
 *   node --import tsx src/journey/deep-recovery-summary3.ts --phase2 <files...>    phase-2 records, corrected gap measures
 */
import { readFileSync } from "node:fs";
import { wilson } from "./deep-recovery-sim-summary";
import { mulberry32 } from "./deep-recovery-sim";

type R = Record<string, any>;
const pct = (k: number, n: number) => { if (!n) return "–"; const [lo, hi] = wilson(k, n); return `${k}/${n} ${Math.round((100 * k) / n)}% [${Math.round(100 * lo)}–${Math.round(100 * hi)}]`; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function boot(xs: number[], seed = 7): string {
  if (!xs.length) return "–";
  const r = mulberry32(seed), ms: number[] = [];
  for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(r() * xs.length)]; ms.push(s / xs.length); }
  ms.sort((a, b) => a - b);
  return `${mean(xs).toFixed(1)} [${ms[49].toFixed(1)}–${ms[1949].toFixed(1)}]`;
}
const read = (files: string[]) => files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as R));

function phase3(rows: R[]) {
  const na = rows.filter((r) => r.status === "n/a");
  const live = rows.filter((r) => r.status !== "n/a");
  const key = (r: R) => `${r.orig} ${r.type} ${r.engine}`;
  const by = new Map<string, R[]>();
  for (const r of live) by.set(key(r), [...(by.get(key(r)) ?? []), r]);
  const out: string[] = [];
  out.push(`runs ${rows.length}: ${["ok", "error", "incomplete", "timeout", "n/a"].map((s) => `${s} ${rows.filter((r) => r.status === s).length}`).join(", ")}`);
  for (const k of [...by.keys()].sort()) {
    const rs = by.get(k)!, n = rs.length;
    const st = ["error", "incomplete", "timeout"].map((s) => [s, rs.filter((r) => r.status === s).length] as const).filter(([, c]) => c);
    const outc = new Map<string, number>(); for (const r of rs) outc.set(r.outcome ?? r.status, (outc.get(r.outcome ?? r.status) ?? 0) + 1);
    out.push(`\n${k}  n=${n}${st.length ? `  (${st.map(([s, c]) => `${s} ${c}`).join(", ")})` : ""}  outcomes ${[...outc].map(([a, b]) => `${a}:${b}`).join(" ")}`);
    out.push(`  false reassurance ${pct(rs.filter((r) => r.falseReassurance).length, n)} | questions ${boot(rs.map((r) => r.questions ?? 0))} | lessons ${boot(rs.map((r) => r.lessons ?? 0))} | prerequisite questions ${boot(rs.map((r) => r.prereqQuestions ?? 0))}`);
    const roots = rs.reduce((a, r) => a + (r.roots?.length ?? 0), 0);
    if (roots) {
      const c = (f: string) => rs.reduce((a, r) => a + (r[f]?.length ?? 0), 0);
      out.push(`  roots ${roots}: identified ${pct(c("identified"), roots)} | taught ${pct(c("taught"), roots)} | repaired ${pct(c("repaired"), roots)} | blocked-with-root-named ${pct(rs.filter((r) => r.blockedNamed).length, n)} runs`);
      out.push(`  runs with every root repaired ${pct(rs.filter((r) => r.roots?.length && r.repaired?.length === r.roots.length).length, n)} | wrong skill designated ${pct(rs.filter((r) => r.wrongDesignated?.length).length, n)} | own skill taught ${pct(rs.filter((r) => r.ownTaught).length, n)} | diagnosis ${[...new Set(rs.map((r) => r.diagnosis))].map((d) => `${d}:${rs.filter((r) => r.diagnosis === d).length}`).join(" ")}`);
    } else out.push(`  strong recognised (solved, no lesson) ${pct(rs.filter((r) => r.strongRecognised).length, n)} | unnecessary questions ${boot(rs.map((r) => r.unnecessaryQuestions ?? 0))} | any lesson ${pct(rs.filter((r) => (r.lessons ?? 0) > 0).length, n)} | any prerequisite question ${pct(rs.filter((r) => (r.prereqQuestions ?? 0) > 0).length, n)}`);
    const sec = rs.filter((r) => r.second);
    if (rs[0].type === "forgetting") out.push(`  2nd episode (after forgetting) run in ${sec.length}/${n}: roots repaired ${pct(sec.filter((r) => r.second.repaired.length === r.second.roots.length).length, sec.length)} | false reassurance ${pct(sec.filter((r) => r.second.falseReassurance).length, sec.length)} | outcomes ${[...new Set(sec.map((r) => r.second.outcome))].map((o) => `${o}:${sec.filter((r) => r.second.outcome === o).length}`).join(" ")} | questions ${boot(sec.map((r) => r.second.questions))}`);
    const errs = rs.filter((r) => r.status === "error");
    for (const e of errs.slice(0, 2)) out.push(`  ERROR seed ${e.seed}: ${String(e.error).split("\n")[0].slice(0, 160)}`);
  }
  // paired differences against p3-selective on the same (orig, type, seed)
  const ref = new Map(live.filter((r) => r.engine === "p3-selective").map((r) => [`${r.orig} ${r.type} ${r.seed}`, r]));
  out.push("\npaired vs p3-selective (same learner seed): mean difference in questions [bootstrap 95%], false-reassurance runs (other / selective)");
  const pk = new Map<string, R[]>();
  for (const r of live.filter((x) => x.engine !== "p3-selective" && ref.has(`${x.orig} ${x.type} ${x.seed}`))) pk.set(`${r.orig} ${r.type} ${r.engine}`, [...(pk.get(`${r.orig} ${r.type} ${r.engine}`) ?? []), r]);
  for (const k of [...pk.keys()].sort()) {
    const rs = pk.get(k)!, mates = rs.map((r) => ref.get(`${r.orig} ${r.type} ${r.seed}`)!);
    out.push(`  ${k} n=${rs.length}: Δquestions ${boot(rs.map((r, i) => (r.questions ?? 0) - (mates[i].questions ?? 0)))} | FR ${rs.filter((r) => r.falseReassurance).length}/${mates.filter((r) => r.falseReassurance).length}`);
  }
  if (na.length) out.push(`\nn/a cells: ${[...new Set(na.map((r) => `${r.orig} ${r.type} ${r.engine}${r.note ? ` (${r.note})` : ""}`))].join("; ")}`);
  return out.join("\n");
}

/** phase-2 records (d98ba668): rootsFound counted a root TAUGHT or named as BLOCKED. Corrected measures derivable from them:
 *  identified = rootsFound; taught = rootsFound minus a blocked root; repaired: not recorded; a LOWER BOUND is "taught and the
 *  episode ended solved_after_help" (that engine climbs past a taught skill only after a right answer on it alone). */
function phase2(rows: R[]) {
  const by = new Map<string, R[]>();
  for (const r of rows) by.set(r.type, [...(by.get(r.type) ?? []), r]);
  const out = [`phase-2 records ${rows.length} (errors ${rows.filter((r) => r.error).length})`];
  for (const [t, rs] of by) {
    const n = rs.length, roots = rs.reduce((a, r) => a + (r.rootsTotal ?? 0), 0);
    if (!roots) { out.push(`${t} n=${n}: no gap (n/a)`); continue; }
    const ident = rs.reduce((a, r) => a + (r.rootsFound ?? 0), 0);
    const blockedRoot = rs.filter((r) => r.outcome === "blocked" && r.rootsFound > 0).length;
    const taught = ident - blockedRoot;
    const repairedLB = rs.filter((r) => r.outcome === "solved_after_help").reduce((a, r) => a + (r.rootsFound ?? 0), 0);
    out.push(`${t} n=${n} roots ${roots}: identified ${pct(ident, roots)} | taught ${pct(taught, roots)} | repaired (lower bound) ${pct(repairedLB, roots)} | blocked-with-root-named ${pct(blockedRoot, n)} runs | wrong lesson ${pct(rs.filter((r) => r.wrongTaught?.length).length, n)} runs`);
  }
  return out.join("\n");
}

if (process.argv[1]?.endsWith("deep-recovery-summary3.ts")) {
  const args = process.argv.slice(2);
  console.log(args[0] === "--phase2" ? phase2(read(args.slice(1))) : phase3(read(args)));
}
