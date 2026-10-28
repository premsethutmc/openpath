// Deterministic, resumable grading audit. Usage: bun audit-run.ts <outDir> [--only fam,fam] [--budget ms] [--n 20]
// For each family: 20 typed questions (evenly spaced over the released pool, no random seeds) + up to 3 multiple-choice + 3 word-form questions,
// each run through decide() (the application's assessment entry point). Expected outcomes come from oracle.ts only. One JSON per family = checkpoint.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { decide } from "../../../packages/learning/src/grade.ts";
import { submissions } from "./oracle.ts";
const out = process.argv[2]; const flag = (k: string, d?: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const only = flag("--only")?.split(","), budget = Number(flag("--budget", "60000")), N = Number(flag("--n", "20"));
mkdirSync(`${out}/fam`, { recursive: true }); mkdirSync(`${out}/subs`, { recursive: true });
const pick = <T,>(a: T[], n: number) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor((i * a.length) / n)]));
const T = JSON.parse(readFileSync(new URL("../../../content/learning/generated.v1.json", import.meta.url), "utf8")).families;
const prog = `${out}/progress.jsonl`;
for (const [fam, def] of FAMILIES) {
  if (only && !only.includes(fam)) continue;
  if (existsSync(`${out}/fam/${fam}.json`)) continue; // resume
  const t0 = performance.now(); const items = pool(fam).items; let timedOut = false;
  const typed = items; // the released pool is the typed form of each question; its :mc and :w presentations are built from the same parameters
  const base = pick(typed, N); const mc = base.slice(0, 6).map((p) => problemOf(p.id + ":mc")).filter((p): p is NonNullable<typeof p> => !!p), word = base.slice(0, 6).map((p) => problemOf(p.id + ":w")).filter((p): p is NonNullable<typeof p> => !!p);
  const chosen = [...base, ...mc, ...word];
  // stored-answer parity against the server's table (every released question, not only the sample)
  let parity = 0, parityBad = 0; const parityEx: string[] = [];
  for (const p of items) { const m = p.id.match(/^gen:[a-z0-9]+:(-?\d+(?:,-?\d+)*)(:mc|:w)?$/); const key = m ? m[1] + (m[2] ?? "") : ""; parity++; if (T[fam]?.items?.[key] !== p.answer) { parityBad++; if (parityEx.length < 3) parityEx.push(`${p.id}: table=${JSON.stringify(T[fam]?.items?.[key])} ts=${JSON.stringify(p.answer)}`); } }
  const cats: Record<string, { n: number; credit: number; noCredit: number; unresolved: number; ok: number }> = {}; const fails: any[] = []; const lat: number[] = []; const subsOut: string[] = []; const na = new Set<string>();
  let falseAcc = 0, falseRej = 0, unresolvedDefect = 0, unresolvedWrong = 0, tested = 0, subTotal = 0; const verif: Record<string, number> = {}; const oracle = new Set<string>(); let kernelSubs = 0, legacySubs = 0;
  for (const p of chosen) {
    if (performance.now() - t0 > budget) { timedOut = true; break; }
    const c = contractFor(p.id)!; verif[c.verification] = (verif[c.verification] ?? 0) + 1;
    const { subs, na: n } = submissions(p.type, p.answer, p.options, !!p.expanded); n.forEach((x) => na.add(x)); if (!subs.length) continue; tested++;
    oracle.add(c.verification === "verified" ? "stored answer verified by an exact kernel + explicit type rules" : "stored answer (generator-derived; not independently verified) + explicit type rules");
    for (const s of subs) {
      const t1 = performance.now(); const a = decide(p.id, s.resp, s.working ?? []); lat.push(performance.now() - t1); subTotal++;
      const k = (cats[s.cat] ??= { n: 0, credit: 0, noCredit: 0, unresolved: 0, ok: 0 }); k.n++; if (a.credit === true) k.credit++; else if (a.credit === false) k.noCredit++; else k.unresolved++;
      const src = a.evidence.source; if (src === "kernel" || src === "statement" || src === "typed-kernel" || String(a.evidence.capability ?? "").includes("kernel")) kernelSubs++; else legacySubs++;
      let ok = true, kind = "";
      if (s.want === "credit") { ok = a.credit === true; if (!ok) { kind = a.credit === false ? "false-rejection" : "unresolved-defect"; } }
      else if (s.want === "no-credit") { ok = a.credit !== true; if (!ok) kind = "false-acceptance"; else if (a.credit === null && s.plain) { unresolvedWrong++; kind = "wrong-left-unresolved"; } }
      else { ok = a.credit === null; if (!ok) kind = a.credit === true ? "false-acceptance" : "unresolved-defect"; }
      if (s.cat === "equiv-policy") { if (!ok) { kind = "policy-unsimplified-" + kind; } ok = true; } // reported, never counted as a defect
      if (ok) k.ok++;
      if (kind === "false-acceptance") falseAcc++; else if (kind === "false-rejection") falseRej++; else if (kind === "unresolved-defect") unresolvedDefect++;
      if (kind && fails.length < 60) fails.push({ id: p.id, type: p.type, stored: p.answer, cat: s.cat, resp: s.resp, working: s.working, want: s.want, got: a.credit, source: a.evidence.source, kind });
      subsOut.push(JSON.stringify([p.id, p.type, p.answer, s.cat, s.resp, s.want, a.credit, a.evidence.source, p.expanded ? 1 : 0, s.working ? 1 : 0]));
    }
  }
  lat.sort((a, b) => a - b); const pct = (q: number) => +(lat[Math.floor(lat.length * q)] ?? 0).toFixed(3);
  const rec = { family: fam, released: items.length, answerType: def.type, forms: { typed: base.length, mc: mc.length, word: word.length }, questionsSampled: chosen.length, questionsTested: tested, submissions: subTotal, categories: cats, falseAcceptances: falseAcc, falseRejections: falseRej, unresolvedDefects: unresolvedDefect, wrongLeftUnresolved: unresolvedWrong, verification: verif, kernelSubs, legacySubs, parity: { checked: parity, mismatches: parityBad, examples: parityEx }, oracle: [...oracle], notApplicable: [...na], timedOut, ms: { p50: pct(0.5), p95: pct(0.95), max: +(lat[lat.length - 1] ?? 0).toFixed(3), familySec: +((performance.now() - t0) / 1000).toFixed(2) }, failures: fails };
  mkdirSync(`${out}/lat`, { recursive: true }); writeFileSync(`${out}/lat/${fam}.json`, JSON.stringify(lat.map((x) => +x.toFixed(3))));
  writeFileSync(`${out}/subs/${fam}.jsonl`, subsOut.join("\n")); writeFileSync(`${out}/fam/${fam}.json`, JSON.stringify(rec));
  appendFileSync(prog, JSON.stringify({ fam, tested, subs: subTotal, fa: falseAcc, fr: falseRej, ud: unresolvedDefect, timedOut, sec: rec.ms.familySec }) + "\n");
}
console.log("done");
