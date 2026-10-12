/**
 * node tools/english/bank/main.ts — check the item bank and write the coverage report.
 *
 * Fails (exit 1) when content is malformed, or when the coverage gates and the recorded gaps
 * (content/english/items/coverage-gaps.json) disagree: every gate a capability misses must be
 * recorded with a reason, and a recorded gap that has been closed must be removed.
 * Writes tools/english/out/bank-coverage.html and .json.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT, REPO, loadContext } from "../load.ts";
import { type Coverage, GATES, RUNWAY, ageScreen, coverage, lint, loadProgressions, passageStats, specifiedCapabilities } from "./checks.ts";
import { renderBankReport } from "./report.ts";

export const GAPS_FILE = join(CONTENT, "items", "coverage-gaps.json");
export type RecordedGaps = Record<string, { gates: string[]; reason: string }>;

export function bankCheck() {
  // Content must be valid under the runtime framework and under the draft 0.2.0.
  const runtime = loadContext();
  const ctx = loadContext({ framework: "0.2.0" });
  const prog = loadProgressions();
  const problems = lint(ctx, prog);
  const recorded: RecordedGaps = JSON.parse(readFileSync(GAPS_FILE, "utf8"));
  const caps = specifiedCapabilities(ctx.index.framework);
  const withItems: Coverage[] = [];
  const pending: { capability: string; name: string }[] = [];
  for (const cap of caps) {
    const c = coverage(ctx, cap, prog);
    if (c.items === 0 && c.tier === "core") pending.push({ capability: cap, name: c.name });
    else withItems.push(c);
  }
  const mismatches: string[] = [];
  for (const c of withItems) {
    const failing = c.gates.filter((g) => !g.pass).map((g) => g.id);
    const rec = recorded[c.capability]?.gates ?? [];
    for (const g of failing) if (!rec.includes(g)) mismatches.push(`${c.capability} misses ${g} (${c.gates.find((x) => x.id === g)!.label}) but the gap is not recorded`);
    for (const g of rec) if (!failing.includes(g)) mismatches.push(`${c.capability} now passes ${g}: remove it from coverage-gaps.json`);
    if (rec.length && !recorded[c.capability].reason) mismatches.push(`${c.capability} has recorded gaps without a reason`);
  }
  return { runtimeKey: runtime.index.key, ctx, prog, problems, warnings: ageScreen(ctx), coverage: withItems, pending, recorded, mismatches, passages: passageStats(ctx) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = bankCheck();
  const out = join(REPO, "tools", "english", "out");
  mkdirSync(out, { recursive: true });
  const json = {
    framework: r.ctx.index.key,
    runtimeFramework: r.runtimeKey,
    gates: GATES,
    runway: RUNWAY,
    problems: r.problems,
    warnings: r.warnings,
    mismatches: r.mismatches,
    coverage: r.coverage,
    pending: r.pending,
    recorded: r.recorded,
    passages: r.passages,
  };
  writeFileSync(join(out, "bank-coverage.json"), JSON.stringify(json, null, 1));
  writeFileSync(join(out, "bank-coverage.html"), renderBankReport(r.ctx, json, new Date().toISOString().slice(0, 10)));
  const items = r.coverage.reduce((s, c) => s + c.items, 0);
  const passing = r.coverage.filter((c) => c.gates.every((g) => g.pass)).length;
  console.log(`Item bank: ${items} code-scored items on ${r.coverage.length} capabilities; ${r.pending.length} specified capabilities have no items yet (E2b).`);
  for (const c of r.coverage)
    console.log(`  ${c.gates.every((g) => g.pass) ? "PASS" : "GAPS"}  ${c.name.padEnd(44)} ${String(c.items).padStart(3)} items  ${c.gates.filter((g) => !g.pass).map((g) => g.id).join(" ") || "all gates"}`);
  const byGate = r.coverage[0]?.gates.map((g, k) => `${g.id} ${r.coverage.filter((c) => c.gates[k].pass).length}/${r.coverage.length}`).join(", ") ?? "";
  console.log(`Gates passed: ${byGate}. ${passing} of ${r.coverage.length} capabilities pass every gate; every miss is recorded with its reason. Report: tools/english/out/bank-coverage.html`);
  for (const w of r.warnings) console.log(`  review: ${w.item}: ${w.message}`);
  if (r.problems.length || r.mismatches.length) {
    for (const p of r.problems) console.error(`  CONTENT  ${p.item ?? p.capability}: ${p.message}`);
    for (const m of r.mismatches) console.error(`  GAPS     ${m}`);
    console.error(`${r.problems.length} content problem(s), ${r.mismatches.length} unrecorded or stale gap(s).`);
    process.exit(1);
  }
}
