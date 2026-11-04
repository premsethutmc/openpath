// Gate 3/5 probe R2: the EXISTING kernel-adapter (family worked steps -> math-kernel rules). Per family sample: are all steps adapted, and does the adapted trace END at the stored answer?
// This is a consistency check of the generator's own worked solution (same source as the answer), not an independent derivation of the question's model.
import { readFileSync, writeFileSync } from "node:fs";
import { problemOf } from "../../../packages/learning/src/families.ts";
import { adaptProblem, hasOpMappableSteps } from "../../../packages/learning/src/kernel-adapter.ts";
const inv = JSON.parse(readFileSync(process.argv[2], "utf8")) as any[];
const out: any[] = [];
for (const f of inv) {
  const r = { family: f.family, n: 0, noSteps: 0, opMappable: 0, fullyAdapted: 0, someAdapted: 0, endsAtAnswer: 0, threw: 0, ops: [] as string[] };
  const ops = new Set<string>();
  for (const s of f.samples) {
    const p = problemOf(s.id); if (!p) continue; r.n++;
    if (!p.steps?.length) { r.noSteps++; continue; }
    p.steps.forEach((x) => ops.add(x.op));
    if (hasOpMappableSteps(p)) r.opMappable++;
    try {
      const a = adaptProblem(p); if (a.fullyAdapted) r.fullyAdapted++; else if (a.steps.some((x) => x.adapted)) r.someAdapted++;
      const last = p.steps[p.steps.length - 1]; const v = Array.isArray(last.value) ? last.value.join(",") : String(last.value);
      if (a.fullyAdapted && v.replace(/\s/g, "") === String(p.answer).replace(/\s/g, "")) r.endsAtAnswer++;
    } catch { r.threw++; }
  }
  r.ops = [...ops].slice(0, 12); out.push(r);
}
writeFileSync(process.argv[3], JSON.stringify(out));
const c = (k: string) => out.filter((r) => r[k] > 0).length;
console.log(JSON.stringify({ families: out.length, withSteps: out.filter((r) => r.noSteps < r.n).length, noSteps: out.filter((r) => r.noSteps === r.n).length, opMappableFam: c("opMappable"), fullyAdaptedFam: c("fullyAdapted"), someAdaptedFam: c("someAdapted"), endsAtAnswerFam: c("endsAtAnswer"), threwFam: c("threw") }));
