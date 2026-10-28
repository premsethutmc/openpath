// Diagnostic regression over the EXPOSED 678-case holdout (never a blind evaluation). Usage: bun holdout-diag.ts <out.json> [label]. Must be run from the repo root (geometry prover path).
import { readFileSync, writeFileSync } from "node:fs";
const { assessMathematicalWorking } = await import("../../../../packages/learning/src/unified-math-engine.ts");
const H = new URL("../holdout/", import.meta.url).pathname;
const cases = JSON.parse(readFileSync(H + "cases.json", "utf8")), L = new Map<string, any>(JSON.parse(readFileSync(H + "labels.json", "utf8")).map((l: any) => [l.id, l]));
const A = new Map<string, any>(JSON.parse(readFileSync(H + "audit.json", "utf8")).map((a: any) => [a.id, a]));
const rows: any[] = []; const t0 = performance.now(); const ms: number[] = [];
for (const c of cases) { const t = performance.now(); let f = "error", rule = "";
  try { const m: any = await assessMathematicalWorking(c.problem, c.studentWorking, {}); f = m.classification; rule = m.certification?.rule ?? ""; } catch {}
  ms.push(performance.now() - t); rows.push({ id: c.id, final: f, rule }); }
ms.sort((a, b) => a - b);
const ex = rows.filter((r) => r.final === L.get(r.id).exp).length;
const fa = rows.filter((r) => r.final === "verified" && L.get(r.id).exp !== "verified");
const fr = rows.filter((r) => L.get(r.id).exp === "verified" && r.final !== "verified");
const cnt = (p: (r: any) => boolean) => rows.filter(p).length;
const summary = { label: process.argv[3] ?? "", n: rows.length, exact: ex, falseAcceptances: fa.length, faIds: fa.map((r) => r.id), falseRejections: fr.length, frAsInvalid: fr.filter((r) => r.final === "invalid").length, unsupported: cnt((r) => r.final === "unsupported"), malformed: cnt((r) => r.final === "malformed"), verified: cnt((r) => r.final === "verified"), expVerifiedVerified: cnt((r) => r.final === "verified" && L.get(r.id).exp === "verified"),
  frAudit: fr.filter((r) => A.get(r.id)?.verdict === "verified").length, p50: +ms[Math.floor(ms.length / 2)].toFixed(2), p95: +ms[Math.floor(ms.length * 0.95)].toFixed(2), totalSec: +((performance.now() - t0) / 1000).toFixed(1) };
// route-twin consistency (typed vs natural twins of the same content, ids adjacent, tag route-equivalence)
const tw = [...L.values()].filter((l) => (l.tags ?? []).includes("route-equivalence")).map((l) => l.id).sort(); const fin = new Map(rows.map((r) => [r.id, r.final]));
let agree = 0, pairs = 0; for (let i = 0; i + 1 < tw.length; i += 2) { pairs++; if (fin.get(tw[i]) === fin.get(tw[i + 1])) agree++; }
(summary as any).twinAgreement = `${agree}/${pairs}`;
writeFileSync(process.argv[2], JSON.stringify({ summary, rows })); console.log(JSON.stringify(summary)); process.exit(0);
