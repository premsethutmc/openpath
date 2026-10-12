/** node tools/english/sim/main.ts — run the ten-learner simulation twice, measure, write the report. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FROZEN_FRAMEWORK, REPO, loadContext } from "../load.ts";
import { CRITERIA, PROTOCOL } from "./criteria.ts";
import { renderReport } from "./report.ts";
import { bankLimits, fingerprint, measures, runAll } from "./simulate.ts";

// The frozen procedure is defined on framework 0.1.0 (the 17 skeleton capabilities its simulated learners have).
const ctx = loadContext({ allowCandidateAnchors: true, framework: FROZEN_FRAMEWORK }); // no educator-scored anchors exist yet (D-4)
const first = await runAll(ctx);
const second = await runAll(ctx);
const fps: [string, string] = [fingerprint(first), fingerprint(second)];
const result = await measures(ctx, first, fps);
const limits = bankLimits(ctx, first);
const out = join(REPO, "tools", "english", "out");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "simulation-report.html"), renderReport(ctx, first, result.measures, { generatedAt: new Date().toISOString().slice(0, 10), fingerprint: fps[0] }, limits));
writeFileSync(join(out, "simulation-results.json"), JSON.stringify({ protocol: PROTOCOL, criteria: CRITERIA, fingerprint: fps[0], measures: result.measures, efficiency: result.efficiency, safety: result.safety, bankLimits: limits }, null, 1));
for (const m of result.measures) console.log(`${m.pass ? "PASS" : "MISS"}  ${m.id}  ${m.name}: ${m.value} (pass level ${m.passLevel})`);
console.log(`\n${result.measures.filter((m) => m.pass).length} of ${result.measures.length} pass. Report: tools/english/out/simulation-report.html`);
console.log(`\nItem bank (reported separately): ${limits.bankSize} items; ${limits.itemsUsedPerLearner} used per learner; ${limits.learningRecsWithGap} of ${limits.learningRecs} learning choices hit a gap; retention checks run fresh/variant/repeat ${limits.retentionChecksByExposure.fresh}/${limits.retentionChecksByExposure.variant}/${limits.retentionChecksByExposure.repeat}; ${limits.retentionChecksBlocked} retention checks blocked; ${limits.overdueUnverifiableAtEnd.length} overdue capabilities with no unused item at the end.`);
