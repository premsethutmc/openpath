/**
 * The approved evidence rules on concrete answer histories, through the app's own engine and profile:
 *
 *   node --import tsx scripts/mastery-scenarios.mts
 *
 * C′ (mastery gate), the stricter misconception resolution, and dictation alone (one question format). The rules
 * are production code (logic/mastery.ts, logic/misconceptions.ts); the histories are synthetic
 * (logic/mastery-scenarios.ts) and show what the rules decide, not how children learn.
 */
import { loadContent } from "../src/english/logic/content.ts";
import { DICTATION_SCENARIOS, MASTERY_SCENARIOS, RESOLUTION_SCENARIOS, finding, history, judge } from "../src/english/logic/mastery-scenarios.ts";

const c = loadContent();

console.log("## Mastery (C′): what the profile reports for each history\n");
console.log("| Scenario | Answers (qualifying) | Estimated (engine) | Shown now | Reported | Evidence gate at the estimate |");
console.log("|---|---|---|---|---|---|");
for (const [id, name, days] of [...MASTERY_SCENARIOS, ...DICTATION_SCENARIOS]) {
  const { l } = await history(days, c);
  const j = judge(l, c);
  const e = j.profile.evidence;
  const g = j.gate;
  const gate = !g ? "no level to test" : g.passed ? `passes: ${g.atLevel.length} right at ≥ ${g.level - 0.25} on different questions${g.singleFormat ? `, ${g.words} words on ${g.patterns.length} patterns (dictation only)` : ""}; no recent error on easier questions` : `not yet: ${g.missing.join(" ")}`;
  console.log(`| ${id} ${name} | ${e.independentRight} of ${e.independent} right | ${j.engineLevel ?? "none"} | ${j.profile.levels.demonstrated ?? "–"} | ${j.standing}${j.mastery ? ` (${j.mastery})` : ""} | ${gate} |`);
}

console.log("\n## Misconception resolution\n");
console.log("| Scenario | Evidence for it | Status | Why |");
console.log("|---|---|---|---|");
for (const [id, name, days] of RESOLUTION_SCENARIOS) {
  const { l } = await history(days, c);
  const f = finding(l, c);
  console.log(`| ${id} ${name} | ${f.support} | ${f.status.replace("_", " ")}${f.below !== null ? ` ${f.below}` : ""} | ${f.reason} |`);
}
