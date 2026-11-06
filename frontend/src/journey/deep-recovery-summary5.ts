/**
 * Summary of phase-5 (confidence) JSONL: every run counted (errors stay in each denominator as their own outcome); 95% Wilson
 * intervals for rates, seeded bootstrap (2000) for means and paired differences against the selective rule (same seed).
 * "Fewer questions" (Δquestions) and "more sittings" (Δsittings) are reported separately.
 *   node --import tsx src/journey/deep-recovery-summary5.ts <files...>
 */
import { readFileSync } from "node:fs";
import { wilson } from "./deep-recovery-sim-summary";
import { mulberry32 } from "./deep-recovery-sim";

type R = Record<string, any>;
const pct = (k: number, n: number) => { if (!n) return "–"; const [lo, hi] = wilson(k, n); return `${k}/${n} [${Math.round(100 * lo)}–${Math.round(100 * hi)}%]`; };
const boot = (xs: number[]) => {
  if (!xs.length) return "–";
  const r = mulberry32(13), ms: number[] = [];
  for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(r() * xs.length)]; ms.push(s / xs.length); }
  ms.sort((a, b) => a - b);
  return `${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)} [${ms[49].toFixed(2)}–${ms[1949].toFixed(2)}]`;
};
const OUT = ["solved-fresh-unaided", "false-reassurance", "provisional", "pause", "blocked", "handed-over", "error"];
const RULES = ["selective", "three-fresh", "different-form", "delayed-add", "delayed-replace", "delayed-first"];
const oc = (r: R) => (r.status === "error" ? "error" : r.outcome);

if (process.argv[1]?.endsWith("deep-recovery-summary5.ts")) {
  const rows = process.argv.slice(2).flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as R));
  const L: string[] = [`runs ${rows.length}: ok ${rows.filter((r) => r.status === "ok").length}, error ${rows.filter((r) => r.status === "error").length}`];
  const cells = [...new Set(rows.map((r) => `${r.orig} ${r.type}`))].sort();
  for (const c of cells) {
    L.push(`\n${c}`);
    const ref = new Map(rows.filter((r) => `${r.orig} ${r.type}` === c && r.rule === "selective" && r.status === "ok").map((r) => [r.seed, r]));
    for (const rule of RULES) {
      const rs = rows.filter((r) => `${r.orig} ${r.type}` === c && r.rule === rule);
      if (!rs.length) continue;
      const n = rs.length, ok = rs.filter((r) => r.status === "ok");
      L.push(`  ${rule.padEnd(15)} n=${n} ${OUT.map((o) => `${o.split("-")[0].slice(0, 6)} ${rs.filter((r) => oc(r) === o).length}`).join(" ")} | FR ${pct(rs.filter((r) => oc(r) === "false-reassurance").length, n)} | q ${boot(ok.map((r) => r.questions))} | sittings ${boot(ok.map((r) => r.sittings))} | wrong-lesson runs ${ok.filter((r) => r.wrongLessons > 0).length}`);
      if (ok[0]?.noGap) {
        const rec = ok.filter((r) => r.claimAt && r.can);
        L.push(`  ${"".padEnd(15)} recognised ${pct(rec.length, n)} (in sitting 1: ${rs.filter((r) => r.claimAt?.sitting === 1 && r.can).length}) | questions to recognition ${boot(rec.map((r) => r.claimAt.questions))} | sittings to recognition ${boot(rec.map((r) => r.claimAt.sitting))}`);
      }
      if (rule !== "selective") {
        const ps = ok.filter((r) => ref.has(r.seed)).map((r) => [r, ref.get(r.seed)!] as [R, R]);
        L.push(`  ${"".padEnd(15)} paired vs selective n=${ps.length}: Δquestions ${boot(ps.map(([a, b]) => a.questions - b.questions))} | Δsittings ${boot(ps.map(([a, b]) => a.sittings - b.sittings))} | FR ${ps.filter(([a]) => a.outcome === "false-reassurance").length} vs ${ps.filter(([, b]) => b.outcome === "false-reassurance").length}`);
      }
    }
  }
  // pooled views
  L.push("\npooled by learner group (both goals):");
  const groups: Record<string, string[]> = { strong: ["strong-right", "strong-slips", "strong-history"], gaps: ["single-gap", "multiple-gaps"], "light-guesser": ["light-guesser"], "heavy-guesser": ["heavy-guesser"] };
  for (const [g, types] of Object.entries(groups)) for (const rule of RULES) {
    const rs = rows.filter((r) => types.includes(r.type) && r.rule === rule);
    if (!rs.length) continue;
    const ok = rs.filter((r) => r.status === "ok");
    const extra = g === "strong" ? ` | recognised ${pct(ok.filter((r) => r.claimAt && r.can).length, rs.length)}, in sitting 1 ${pct(ok.filter((r) => r.claimAt?.sitting === 1 && r.can).length, rs.length)}` : ` | solved-fresh-unaided ${pct(rs.filter((r) => oc(r) === "solved-fresh-unaided").length, rs.length)}`;
    L.push(`  ${g.padEnd(13)} ${rule.padEnd(15)} n=${rs.length} FR ${pct(rs.filter((r) => oc(r) === "false-reassurance").length, rs.length)} | provisional at end ${rs.filter((r) => oc(r) === "provisional").length} | errors ${rs.filter((r) => r.status === "error").length} | q ${boot(ok.map((r) => r.questions))} | sittings ${boot(ok.map((r) => r.sittings))}${extra}`);
  }
  console.log(L.join("\n"));
}
