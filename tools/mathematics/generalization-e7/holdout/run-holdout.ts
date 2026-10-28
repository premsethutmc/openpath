// Single-shot holdout run. Refuses to run twice (results-raw.json must not exist) and refuses if frozen hashes do not match FREEZE.json. Full traces stay local in results-raw.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const here = new URL("./", import.meta.url).pathname;
if (existsSync(here + "results-raw.json")) { console.error("holdout already executed; refusing to run again"); process.exit(2); }
const sha = (f: string) => createHash("sha256").update(readFileSync(here + f)).digest("hex");
const fz = JSON.parse(readFileSync(here + "FREEZE.json", "utf8"));
for (const f of ["cases.json", "labels.json"]) if (sha(f) !== fz.sha256[f]) { console.error("frozen file changed: " + f); process.exit(3); }
const { assessMathematicalWorking, } = await import("../../../../packages/learning/src/unified-math-engine.ts");
const geo = await import("../../../../packages/learning/src/geometry-binder-e5.ts").catch(() => null as any);
const cases = JSON.parse(readFileSync(here + "cases.json", "utf8")); const rows: any[] = [];
for (const c of cases) { const t0 = performance.now();
  try { const m: any = await assessMathematicalWorking(c.problem, c.studentWorking, {}); const ms = performance.now() - t0;
    rows.push({ id: c.id, final: m.classification, domain: m.domain, rule: m.certification?.rule ?? null, routes: (m.certification?.routes ?? []).map((r: any) => `${r.route}:${r.reported}:${r.role}`).join(","), integrity: m.certification?.integrity ?? null, mechanisms: m.certification?.mechanisms ?? null, obligations: (m.proofObligations ?? m.domainPayload?.proofObligations)?.summary ?? null, sideClaims: m.certification?.sideClaims?.length ?? 0, firstInvalidStep: m.firstInvalidStep, just: String(m.justification ?? "").slice(0, 200), ms: Math.round(ms * 100) / 100 });
  } catch (e: any) { rows.push({ id: c.id, err: String(e).slice(0, 160), ms: Math.round((performance.now() - t0) * 100) / 100 }); } }
writeFileSync(here + "results-raw.json", JSON.stringify({ commit: fz.engineCommit, ran: new Date().toISOString(), rows }));
console.log("ran", rows.length, "errors", rows.filter((r) => r.err).length); process.exit(0);
