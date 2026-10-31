// Phase 6 regression scan over the 1725 exposed natural-language corpus cases (E2-E6 dev/sealed/validation, holdout1, holdout2). Compact rows only.
import { readFileSync, writeFileSync } from "node:fs";
const { assessMathematicalWorking } = await import("../../../../packages/learning/src/unified-math-engine.ts");
const T = new URL("../../", import.meta.url).pathname;
const parts: [string, string][] = [["e2dev","proof-integrity-e2/dev-cases.v1.json"],["e2sealed","proof-integrity-e2/sealed-cases.v1.json"],["e3dev","verification-closure-e3/dev-cases.v1.json"],["e3sealed","verification-closure-e3/sealed-cases.v1.json"],["e4dev","coverage-e4/dev-cases.v1.json"],["e4sealed","coverage-e4/sealed-cases.v1.json"],["e5dev","geocalc-e5/dev-cases.v1.json"],["e5sealed","geocalc-e5/sealed-cases.v1.json"],["e6dev","generalization-e6/dev-cases.v1.json"],["e6val","generalization-e6/validation-cases.v1.json"],["e6sealed","generalization-e6/sealed-cases.v1.json"],["h1","generalization-e6r/holdout1/holdout-cases.v1.json"],["h2","generalization-e6r/holdout2/holdout-cases.v1.json"]];
const out = process.argv[2] ?? "scan-p6.json"; const rows: any[] = [];
for (const [name, f] of parts) { let cs: any[]; try { cs = JSON.parse(readFileSync(T + f, "utf8")).cases; } catch { continue; }
  for (const c of cs) { const w = c.studentWorking, P = c.problem; if (!w || Array.isArray(w) || w.format !== "natural" || !P) continue; const id = c.caseId ?? c.id;
    try { const t0 = performance.now(); const m: any = await assessMathematicalWorking(P, w, {}); const ms = performance.now() - t0;
      const ob = (m.proofObligations ?? m.domainPayload?.proofObligations)?.summary ?? null;
      rows.push({ part: name, id, ref: c.reference?.classification ?? c.expected?.classification ?? null, final: m.classification, rule: m.certification?.rule ?? null, routes: (m.certification?.routes ?? []).map((r: any) => `${r.route}:${r.reported}:${r.role}`).join(","), integ: m.certification?.integrity ?? null, mech: m.certification?.mechanisms ?? null, ob, ms: Math.round(ms * 100) / 100 });
    } catch (e: any) { rows.push({ part: name, id, err: String(e).slice(0, 80) }); } } }
writeFileSync(out, JSON.stringify(rows));
const ok = rows.filter((r) => !r.err); const exact = ok.filter((r) => r.ref && r.final === r.ref).length; const fa = ok.filter((r) => r.final === "verified" && r.ref && r.ref !== "verified");
console.log("rows", rows.length, "errors", rows.length - ok.length, "exact", exact, "finalVerified", ok.filter((r) => r.final === "verified").length, "FA(ref not verified)", fa.length, fa.map((r) => r.part + ":" + r.id + "(" + r.ref + ")").join(" "));
process.exit(0);
