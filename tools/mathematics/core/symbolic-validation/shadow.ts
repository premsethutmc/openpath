// Shadow mode: runs the derivation harness + educator adapter over the EXISTING marking cases (teacher/examples.json) next to the production
// advisory assessment, and compares. Nothing here changes a production decision: no marks, no records.
import { readFileSync, writeFileSync } from "node:fs";
import { assessWorking } from "../../../../packages/learning/src/core/working-assessment.ts";
import { assessForEducator } from "../../../../packages/learning/src/core/educator-evidence.ts";
const ex = JSON.parse(readFileSync(new URL("../teacher/examples.json", import.meta.url), "utf8")).examples as any[];
const CORRECT = new Set(["correct-and-complete", "correct-but-incomplete", "valid-with-outstanding-obligations"]);
const acceptable = (exp: any, cat: string, first: number | null): boolean => {
  const o = exp.outcome;
  if (o === "verified") return CORRECT.has(cat);
  if (o === "incomplete") return cat === "correct-but-incomplete" || cat === "valid-with-outstanding-obligations";
  if (o === "invalid") return cat === "mathematically-invalid" && (exp.first_invalid === undefined || exp.first_invalid === first);
  return cat === "unsupported-or-undecidable";
};
const rows: any[] = []; let agree = 0, definiteWrongOnUnknown = 0, prodDiff = 0;
for (const c of ex) {
  const prod = assessWorking(c.problem, c.lines, c.opts ?? {});
  const ev = assessForEducator({ problem: c.problem, lines: c.lines, objective: c.opts ?? undefined });
  const ok = acceptable(c.expected, ev.category, ev.firstInvalidStep);
  const unknownBecameWrong = (c.expected.outcome === "unsupported" || c.expected.outcome === "ambiguous") && ev.category === "mathematically-invalid";
  const prodClass = prod.outcome === "invalid" ? "mathematically-invalid" : prod.outcome === "unsupported" || prod.outcome === "ambiguous" ? "unsupported-or-undecidable" : "correct*";
  const evClass = ev.category === "mathematically-invalid" || ev.category === "unsupported-or-undecidable" ? ev.category : "correct*";
  const pd = prodClass !== evClass; if (ok) agree++; if (unknownBecameWrong) definiteWrongOnUnknown++; if (pd) prodDiff++;
  rows.push({ id: c.id, expected: c.expected.outcome, production: prod.outcome, adapter: ev.category, firstInvalid: ev.firstInvalidStep, agreesWithExpected: ok, differsFromProduction: pd, markingEffect: ev.markingEffect });
}
console.table(rows.map((r) => ({ id: r.id, expected: r.expected, production: r.production, adapter: r.adapter, ok: r.agreesWithExpected, diffProd: r.differsFromProduction })));
const summary = { cases: ex.length, adapterAgreesWithExpected: agree, unknownBecameDefiniteWrong: definiteWrongOnUnknown, adapterDiffersFromProductionClass: prodDiff, marksProduced: 0 };
console.log(JSON.stringify(summary)); writeFileSync(new URL("data/shadow.json", import.meta.url), JSON.stringify({ summary, rows }, null, 1));
