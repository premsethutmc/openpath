/**
 * Registers the two-dice GENERAL teaching (two-dice-candidate.mts) as a template extension of MATH.probability.sample-space
 * (main family akss; the explanations are scoped to its pool family akdice, "the total is exactly k"). Pending educator review:
 * the explanation-review registry records each as pending_review; nothing is approved here.
 *   cd frontend && node --import tsx ../content/learning/src/two-dice-register.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { candidateStrategies, COMPETENCY, SOURCE } from "./two-dice-candidate.mts";

const file = new URL("../blueprints.v1.json", import.meta.url);
const blueprint = {
  extendsTemplate: true, competency: COMPETENCY, title: "Two dice: count the pairs", family: "akss", seed: [2, 3, 2, 0],
  author: `Claude, general teaching reworded from ${SOURCE} (written with AI assistance; not educator-reviewed)`, aiAssisted: true, licence: "CC0", chapter: [],
  strategies: candidateStrategies(),
};
const bps = JSON.parse(readFileSync(file, "utf8"));
const mine = (b: { competency: string; extendsTemplate?: boolean }) => !!b.extendsTemplate && b.competency === COMPETENCY;
if (bps.blueprints.some((b: { competency: string; extendsTemplate?: boolean }) => b.competency === COMPETENCY && !mine(b))) throw new Error("a hand-written blueprint already exists for this competency");
bps.blueprints = [...bps.blueprints.filter((b: { competency: string; extendsTemplate?: boolean }) => !mine(b)), blueprint];
writeFileSync(file, JSON.stringify(bps, null, 1) + "\n");
console.log(`wrote the two-dice template extension (${blueprint.strategies.length} general explanations)`);
process.exit(0);
