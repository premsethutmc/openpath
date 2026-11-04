// AUDIT ONLY. Runs the engine, unmodified, over the independent challenge suite and scores it. Never tunes anything.
// usage (from packages/learning/src/reasoner/domain or any dir): node ... run-challenge.ts
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { solve } from "/home/claude/k052/packages/learning/src/reasoner/domain/domain-engine.ts";
const dir = "/home/claude/k052/tools/mathematics/audit/challenge/";
const raw = readFileSync(dir + "suite.json"); const cases = JSON.parse(raw.toString());
const same = (a: string[] | null, b: string[] | null) => { const x = [...(a ?? [])].sort(), y = [...(b ?? [])].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };
const rows: any[] = []; const traces: Record<string, unknown> = {};
for (const c of cases) {
  let r: any, err = "";
  try { r = solve(c.text); } catch (e) { err = String(e).slice(0, 200); }
  let outcome: string;
  if (err) outcome = "crash";
  else if (c.label === "supported") outcome = r.class === "refused" ? "refused" : (r.class === c.class && (c.class !== "unique" || same(r.solution, c.solution)) ? "correct" : "WRONG-ANSWER");
  else if (c.label === "unsupported") outcome = r.class === "refused" ? ((c.reasons ?? []).length === 0 || r.reasons.some((x: string) => c.reasons.includes(x)) ? "correct-refusal" : "refusal-wrong-reason") : "answered-unsupported";
  else outcome = r.class === "refused" ? "ambiguous-refused" : "ambiguous-answered";
  rows.push({ id: c.id, category: c.category, label: c.label, text: c.text, expected: [c.class, c.solution, c.reasons ?? null], got: err ? err : [r.class, r.solution, r.reasons, r.note], outcome, ms: r?.stats?.ms ?? null });
  if (r) traces[c.id] = { class: r.class, solution: r.solution, reasons: r.reasons, steps: r.steps.map((s: any) => [s.rule, s.params, s.before, s.after, s.restrictions]), rejected: r.candidatesRejected };
}
const tally = (f: (r: any) => string) => { const t: Record<string, Record<string, number>> = {}; for (const r of rows) { const k = f(r); (t[k] ??= {})[r.outcome] = (t[k][r.outcome] ?? 0) + 1; } return t; };
const summary = { sha256: createHash("sha256").update(raw).digest("hex"), cases: cases.length, byLabel: tally((r) => r.label), byCategory: tally((r) => r.category) };
writeFileSync(dir + "results.json", JSON.stringify({ summary, rows }, null, 1)); writeFileSync(dir + "traces.json", JSON.stringify(traces));
console.log(JSON.stringify(summary, null, 1));
