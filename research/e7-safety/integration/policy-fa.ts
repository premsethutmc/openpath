// The frozen benchmark's remaining false acceptances, graded by the process policy under each rubric. Usage (repo root): bun research/e7-safety/integration/policy-fa.ts
import { readFileSync, writeFileSync } from "node:fs";
const { assessWithPolicy } = await import("../../../packages/learning/src/assessment-policy.ts");
const R = JSON.parse(readFileSync("research/e7-safety/integration/results.json", "utf8")); const I = JSON.parse(readFileSync("research/generalization-audit/results/adapter-inputs.json", "utf8"));
const byId = new Map(I.map((r: any) => [r.id, r]));
const rubrics: Record<string, any> = { "answer-only": { mode: "answer-only" }, "method (no flags)": { mode: "method-required" }, "method (all flags)": { mode: "method-required", requireStatedRestrictions: true, requireShownCandidateChecks: true, deductForWrongCitation: true }, "proof": { mode: "proof-required" } };
const rows: any[] = [];
for (const r of R.filter((x: any) => x.outcome === "false-acceptance")) {
  const ch = (byId.get(r.id) as any).channels["unified-natural"]; const row: any = { id: r.id, expected: r.expected, principle: r.principle };
  for (const [name, rb] of Object.entries(rubrics)) { const g = (await assessWithPolicy(ch.problem, ch.working, rb)).grade; row[name] = `${g.credit}${g.deductions.length ? ` (${g.deductions.join(",")})` : ""}`; row.findings = [...new Set([...(row.findings ?? []), ...g.findings.map((f: any) => f.kind)])]; }
  row.category = /\bby (?:the |integration by|integration )/i.test(JSON.stringify(ch.working)) && /rule|parts/i.test(r.principle) ? "natural-text citation not parsed (known gap)" : row.findings.some((f: string) => f !== "no-derivation-shown") ? "finding recorded; rubric decides" : "no finding";
  rows.push(row);
}
writeFileSync("research/e7-safety/integration/policy-fa.json", JSON.stringify(rows, null, 1));
const t: Record<string, number> = {}; for (const r of rows) { const k = `${r.category} | strict=${r["method (all flags)"].split(" ")[0]} | lenient=${r["method (no flags)"].split(" ")[0]} | answer-only=${r["answer-only"].split(" ")[0]}`; t[k] = (t[k] ?? 0) + 1; }
console.log(rows.length, JSON.stringify(t, null, 1)); process.exit(0);
