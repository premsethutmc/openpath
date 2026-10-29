// Read-only E7 engine run over the exposed 678 holdout, capturing the engine's own explanation per case.
// Usage (repo root): bun research/sympy-transition-eval/e7-dump.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
const { assessMathematicalWorking } = await import("../../packages/learning/src/unified-math-engine.ts");
const H = new URL("../../tools/mathematics/generalization-e7/holdout/", import.meta.url).pathname;
const cases = JSON.parse(readFileSync(process.argv[3] ?? (H + "cases.json"), "utf8"));
const L = new Map<string, any>(JSON.parse(readFileSync(H + "labels.json", "utf8")).map((l: any) => [l.id, l]));
const cut = (s: unknown, n = 260) => (typeof s === "string" ? s : JSON.stringify(s ?? "")).slice(0, n);
const rows: any[] = [];
for (const c of cases) {
  const t = performance.now(); let m: any = null, err = "";
  try { m = await assessMathematicalWorking(c.problem, c.studentWorking, {}); } catch (e) { err = String(e); }
  const ms = +(performance.now() - t).toFixed(3), l = L.get(c.id) ?? { cat: "adversarial-cases", exp: c.exp, alt: [] };
  rows.push({ id: c.id, cat: l.cat, exp: l.exp, alt: l.alt, final: m?.classification ?? "error", ms, domain: m?.domain ?? null,
    rule: m?.certification?.rule ?? null, justification: cut(m?.justification), outstanding: (m?.outstandingObligations ?? []).map((o: any) => cut(o, 160)).slice(0, 4),
    steps: (m?.steps ?? []).map((s: any) => `${s.classification}:${cut(s.justification, 120)}`).slice(0, 8), err });
}
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(rows.length, "rows"); process.exit(0);
