// Shadow comparison: authoritative grading decision (grading-policy@1) vs the E7 process policy, on verified algebra kernel questions.
// Usage (repo root): bun research/e7-safety/integration/shadow-compare.ts <n-questions> <out.json>
const L = "../../../packages/learning/src/";
const { FAMILIES, pool } = await import(L + "families.ts"); const { contractFor } = await import(L + "assessment.ts");
const { assessWithPolicy } = await import(L + "assessment-policy.ts"); const { grade } = await import(L + "grading/decision.ts");
const { shadowProcessRecord } = await import(L + "grading/process-shadow.ts");
const N = Number(process.argv[2] ?? 400), qs: string[] = [];
for (const [fam, d] of FAMILIES) { if (!d.contract) continue; const items = pool(fam).items; for (let i = 0; i < items.length && qs.length < N; i += Math.max(1, Math.floor(items.length / 4))) { const c = contractFor(items[i].id); if (c && c.verification === "verified" && c.problem?.domain === "algebra" && c.expected.values.length && c.expected.values.every((x: string) => /^[+-]?\d+(?:\/\d+)?$/.test(x))) qs.push(items[i].id); } if (qs.length >= N) break; }
const tally: Record<string, number> = {}, conflicts: string[] = []; const t0 = performance.now(); let n = 0;
for (const qid of qs) {
  const c = contractFor(qid), stmt = c.problem.statement, v = c.variable, vals: string[] = c.expected.values;
  const fmt = (xs: string[]) => (v ? xs.map((x) => `${v} = ${x}`).join(" or ") : xs.join(", "));
  const cases: [string, string, "answer-only" | "method-required" | "proof-required"][] = [[vals.join(", "), fmt(vals), "answer-only"], [String(Number(vals[0]) + 1), fmt([String(Number(vals[0]) + 1)]), "answer-only"], ["abc", "abc", "answer-only"]];
  if (vals.length > 1) cases.push([vals[0], fmt([vals[0]]), "answer-only"]);
  if (v && stmt.includes("=")) cases.push([vals.join(", "), `${stmt}\n${fmt(vals)}`, "method-required"], [vals.join(", "), fmt(vals), "proof-required"]);
  for (const [raw, text, mode] of cases) {
    const d = grade(qid, raw).decision, g = (await assessWithPolicy({ domain: "algebra", statement: stmt }, { format: "natural", text }, { mode })).grade;
    const r = shadowProcessRecord(d, g); n++; const k = `${mode}:${d.verdict}->${r.implied.verdict}:${r.agreement}`; tally[k] = (tally[k] ?? 0) + 1;
    if (r.agreement === "conflict") conflicts.push(`${qid} ${mode} "${raw}": ${r.note}`);
  }
}
const out = { questions: qs.length, submissions: n, msPerSubmission: Math.round(((performance.now() - t0) / n) * 100) / 100, tally, conflicts };
await Bun.write(process.argv[3], JSON.stringify(out, null, 1)); console.log(JSON.stringify({ ...out, conflicts: conflicts.slice(0, 10), conflictCount: conflicts.length }, null, 1));
process.exit(0);
