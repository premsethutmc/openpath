// Grading audit: the assessment policy every released question presentation is graded under TODAY (typed, :mc and :w forms).
// Policies (current production behaviour, before any change):
//   kernel-exact      verified generator contract, exact checker (value / var / set)            client: kernel   server: trusted Node grader
//   kernel-typed      verified generator contract, typed kernel (linear algebra, B1, M2, complex)  client: kernel   server: trusted Node grader
//   legacy-canonical  stored-answer comparison of canonical forms                                client: legacy   server: Python mirror
//   legacy-sampled    stored-answer comparison by numeric sampling (expression, antiderivative)   client: legacy   server: Python mirror
//   held              contract disagrees with the question: client never decides, server falls back to legacy
//   educator          marked by a person
// Output: per family and form, the majority policy and every question that differs from it. Usage: bun policies.ts data/question-policies.json
import { writeFileSync } from "node:fs";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families.ts";
import { contractFor } from "../../../packages/learning/src/assessment.ts";
import { SAMPLED } from "../../../packages/learning/src/answer-types.ts";

const policyOf = (qid: string): string => {
  const c = contractFor(qid);
  if (!c) return "unknown";
  if (c.verification === "human") return "educator";
  if (c.verification === "held") return "held";
  if (c.verification === "verified") return c.capability === "typed-kernel" ? "kernel-typed" : "kernel-exact";
  return SAMPLED.has(c.answerType) ? "legacy-sampled" : "legacy-canonical";
};
const out: Record<string, Record<string, { count: number; policy: string; exceptions: Record<string, string> }>> = {};
const totals: Record<string, number> = {};
for (const [fam, def] of FAMILIES) {
  out[fam] = {};
  const forms: [string, string][] = [["typed", ""]];
  if (def.mc) forms.push(["mc", ":mc"]);
  if (def.word) forms.push(["word", ":w"]);
  for (const [form, sfx] of forms) {
    const per: [string, string][] = [];
    for (const q of pool(fam).items) { const id = q.id + sfx; if (sfx && !problemOf(id)) continue; per.push([id, policyOf(id)]); }
    const n: Record<string, number> = {};
    for (const [, p] of per) { n[p] = (n[p] ?? 0) + 1; totals[`${form}.${p}`] = (totals[`${form}.${p}`] ?? 0) + 1; totals[p] = (totals[p] ?? 0) + 1; }
    const major = Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
    out[fam][form] = { count: per.length, policy: major, exceptions: Object.fromEntries(per.filter(([, p]) => p !== major)) };
  }
}
writeFileSync(process.argv[2], JSON.stringify({ totals, families: out }));
console.log(JSON.stringify(totals));
