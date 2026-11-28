/**
 * child-lab@2: runs every lab scenario, then every mutation run the acceptance contracts declare, and writes the scorecard the
 * owner sees at /owner/#lab (content/owner/child-lab.v1.json) and the full traces (docs/audits/child-lab-traces.txt).
 *   node --import tsx ../packages/learning/scripts/child-lab.ts            (from frontend/)
 *   node --import tsx ../packages/learning/scripts/child-lab.ts --reset    (when the checks themselves were changed on purpose)
 * A scenario recorded as passing that now fails is a regression: the script stops and writes nothing (unless --reset). A
 * known gap that now passes becomes "pass" (so it is held from then on). The contracts (content/owner/child-lab-contracts.v1.json)
 * are written by hand and never by this script.
 *
 * Reported separately, never folded into the pass count: how many mutation runs were caught (mutation sensitivity), and
 * how many of the scenarios' checks some mutant made fail (evaluator coverage).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { SCENARIOS, runScenario, type Result } from "../src/lab/scenarios";
import { MUTANTS, mutant } from "../src/lab/mutants";

const FILE = new URL("../../../content/owner/child-lab.v1.json", import.meta.url);
const CONTRACTS = new URL("../../../content/owner/child-lab-contracts.v1.json", import.meta.url);
type Entry = { id: string; expected: "pass" | "known-gap"; gap?: string };
export interface Contract { id: string; policy: string; pairedWith?: string; mustCheck: string[]; kills: string[] }
const reset = process.argv.includes("--reset");
let old: { scenarios: Entry[] } = { scenarios: [] };
try { old = JSON.parse(readFileSync(FILE, "utf8")); } catch { /* first run */ }
const contracts = (JSON.parse(readFileSync(CONTRACTS, "utf8")) as { scenarios: Contract[] }).scenarios;
const prior = new Map(old.scenarios.map((s) => [s.id, s]));
const out = []; const traces: string[] = []; const regress: string[] = []; const clean = new Map<string, Result>();
for (const s of SCENARIOS) {
  const t0 = Date.now(); const r = runScenario(s); clean.set(s.id, r);
  const was = prior.get(s.id);
  if (!reset && was?.expected === "pass" && !r.pass) regress.push(`${s.id} ${s.title}: ${r.checks.filter((x) => !x.ok).map((x) => x.name).join("; ")}`);
  const expected = r.pass ? "pass" : "known-gap";
  out.push({ id: r.id, title: r.title, child: r.child, policy: r.policy, ...(r.pairedWith ? { pairedWith: r.pairedWith } : {}), expected, ...(expected === "known-gap" ? { gap: was?.gap ?? "not fixed yet" } : {}), pass: r.pass, questions: r.questions, provenance: r.provenance, termination: r.termination, checks: r.checks });
  traces.push(`### ${r.id} ${r.title}\nchild: ${r.child}\nlearning: ${r.policy}\n${r.checks.map((x) => `${x.ok ? "✓" : "✗"} ${x.name}`).join("\n")}\n${r.trace}\n`);
  console.log(`${r.id} ${r.pass ? "pass" : "FAIL"} (${r.questions} questions, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
if (regress.length) { console.error(`child-lab@2: regression, nothing written:\n${regress.join("\n")}`); process.exit(1); }

// mutation runs: a run is caught when a check that holds without the mutant fails with it
const runs: { mutant: string; scenario: string; caught: boolean; flipped: string[] }[] = [];
const flippedBy = new Map<string, Set<string>>();
for (const k of contracts) for (const m of k.kills) {
  const s = SCENARIOS.find((x) => x.id === k.id)!; const base = clean.get(k.id)!;
  const r = runScenario(s, mutant(m));
  const flipped = base.checks.filter((x, i) => x.ok && r.checks[i]?.ok === false).map((x) => x.name);
  runs.push({ mutant: m, scenario: k.id, caught: flipped.length > 0, flipped });
  for (const f of flipped) { const key = `${k.id}|${f}`; if (!flippedBy.has(key)) flippedBy.set(key, new Set()); flippedBy.get(key)!.add(m); }
  console.log(`  mutant ${m} on ${k.id}: ${flipped.length ? `caught (${flipped.length} checks)` : "NOT caught"}`);
}
const own = [...clean.values()].flatMap((r) => r.checks.filter((x) => x.group !== "harness").map((x) => `${r.id}|${x.name}`));
const harnessChecks = [...new Set([...clean.values()].flatMap((r) => r.checks.filter((x) => x.group === "harness").map((x) => x.name)))];
const covered = own.filter((k) => flippedBy.has(k));
const mutation = {
  mutants: MUTANTS.map((m) => ({ id: m.id, says: m.says, caughtBy: runs.filter((r) => r.mutant === m.id && r.caught).map((r) => r.scenario) })),
  runs, sensitivity: { caught: runs.filter((r) => r.caught).length, runs: runs.length },
};
const coverage = {
  note: "Of the scenarios' own checks, how many some declared mutant makes fail. A check no mutant reaches is not shown to protect anything yet.",
  covered: covered.length, checks: own.length, harnessCovered: harnessChecks.filter((h) => [...flippedBy.keys()].some((k) => k.endsWith(`|${h}`))).length, harnessChecks: harnessChecks.length,
  uncovered: own.filter((k) => !flippedBy.has(k)),
};
const pass = out.filter((s) => s.pass).length;
writeFileSync(FILE, JSON.stringify({ schema: "child-lab@2", note: "GENERATED by packages/learning/scripts/child-lab.ts. Simulated children with real step-level slips, run through the app with default settings. Each scenario states what it assumes a lesson does for the child; being shown a lesson is never taken as proof that it worked. Engineering evidence only: it shows how the app behaves, not that a child learns.",
  summary: { scenarios: out.length, pass, mutationCaught: mutation.sensitivity.caught, mutationRuns: mutation.sensitivity.runs, checksCovered: coverage.covered, checks: coverage.checks },
  scenarios: out, mutation, coverage }, null, 1) + "\n");
writeFileSync(new URL("../../../docs/audits/child-lab-traces.txt", import.meta.url), traces.join("\n"));
console.log(`child-lab@2: ${pass}/${out.length} scenarios pass; mutation runs caught ${mutation.sensitivity.caught}/${mutation.sensitivity.runs}; checks covered by a mutant ${coverage.covered}/${coverage.checks}`);
