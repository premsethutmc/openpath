/**
 * Acceptance test 9: ten scripted learner journeys on the bank only. Writes results/journeys.json.
 *
 *   node --import tsx tools/mathematics/tn5-bank/run-journeys.mts [outFile]
 *
 * Simulated learners test system behaviour only; nothing here says anything about educational effectiveness.
 * Deterministic: seeded scripts, an injected clock, no Date.now.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RELEASE_ID, runJourneys } from "../../../packages/learning/src/bank-journeys";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? join(here, "results", "journeys.json");
const journeys = runJourneys();
const failed = journeys.flatMap((j) => j.checks.filter((c) => !c.ok).map((c) => `journey ${j.id}: ${c.name}`));
const doc = {
  release: RELEASE_ID,
  note: "Simulated learners test system behaviour only (never educational effectiveness). Mastery is the engine's status 'verified', reachable only with the test-only review fixture (provisional content is otherwise held by the content gate).",
  summary: journeys.map((j) => ({ id: j.id, learner: j.learner, title: j.title, steps: j.stepsTaken, items: j.itemsServed.length, refusals: j.refusals.length, final: Object.fromEntries(Object.entries(j.final).map(([c, f]) => [c, `${f.status}${f.masteryClaimed ? " (mastery claimed)" : ""}, delayed check ${f.retention}`])), checksPassed: j.checks.filter((c) => c.ok).length, checksFailed: j.checks.filter((c) => !c.ok).length })),
  failedChecks: failed,
  journeys,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(doc, null, 1) + "\n");
console.log(`journeys: ${journeys.length}, checks passed ${journeys.reduce((n, j) => n + j.checks.filter((c) => c.ok).length, 0)}, failed ${failed.length} -> ${out}`);
if (failed.length) process.exitCode = 1;
