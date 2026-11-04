/**
 * Two-dice probability (TP-PRO-01, general teaching): small helpers for the tests. The explanations are connected in the generated
 * library (content/learning/src/two-dice-register.mts → blueprints.v1.json → library.v1.json) and pending educator review; the test-only
 * composition/installation used before they were connected is no longer needed.
 */
import { problemOf } from "../../../packages/learning/src/families";
import { COMPETENCY, diceProblemKey } from "../../../content/learning/src/two-dice-candidate.mts";

export { COMPETENCY };
/** freshness@2 for a two-dice item (the mirror total is the same problem) */
export const problemKey = diceProblemKey;
export const problem = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
