// Reproducer for the integration worker (shared engine: packages/learning/src/library.ts, not edited on this branch).
// run: cd frontend && node --import tsx ../docs/two-dice-probability/reproducer.mts
// Registering the two-dice candidate as a template extension of MATH.probability.sample-space (main family akss) fails,
// because `synthesise` requires `st.scope.family === bp.family` and draws guided/check from `phasePool(bp.family, ...)`.
// The declared scope itself is valid for the module (teaching-presentation.strategyScopeProblems accepts any pool family).
import { readFileSync } from "node:fs";
import { moduleFor } from "../../packages/learning/src/content";
import { synthesise, type Blueprint } from "../../packages/learning/src/library";
import { strategyScopeProblems } from "../../packages/learning/src/teaching-presentation";
import { candidateStrategies, COMPETENCY } from "../../content/learning/src/two-dice-candidate.mts";
const version = JSON.parse(readFileSync(new URL("../../content/learning/blueprints.v1.json", import.meta.url), "utf8")).version;
const bp: Blueprint = { extendsTemplate: true, competency: COMPETENCY, title: "Two dice: count the pairs, not the totals", family: "akss", seed: [2, 3, 2, 0],
  author: "Claude candidate TP-PRO-01 (4e655e73)", aiAssisted: true, licence: "CC0", chapter: [], strategies: candidateStrategies() as never };
const m = moduleFor(COMPETENCY)!;
console.log("declared scopes valid for the loaded module:", candidateStrategies().map((s) => `${s.id}: ${strategyScopeProblems(m, { ...s, needs: [] } as never).length === 0}`).join(", "));
try { synthesise(bp, version); console.log("UNEXPECTED: synthesised"); } catch (e) { console.log("synthesise throws:", (e as Error).message); }
