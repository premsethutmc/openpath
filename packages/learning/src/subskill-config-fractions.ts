/** Skill mapping for fractions: equivalence, comparison and ordering. Each skill fixes the kind of pair or triple (same bottom,
 * same top, unlike) or the kind of equivalence task, on existing generators with their trusted typed answers (fraction, tuple,
 * mixed, choice). Mapping narrows existing generator tasks by validated parameters only; it adds no question, solver or grader,
 * and grants no method authority or approval. One family per skill. */
import type { SubSkillConfig } from "./subskill-projection";

const FCMP = "MATH.number.fraction-comparison";
/** adfcmp [mode, k, x, y, ask] and adford [mode, k, x, y, z]: mode 0 same bottom number k, mode 1 same top number k.
 * adfcmpu [a, b, c, d, ask]: a/b and c/d unlike. adfordu [i, j, k]: three unlike fractions. */
export const FRACTION_COMPARISON_CONFIG: SubSkillConfig = {
  version: "fraction-comparison-subskill-projection@1", mapping: "fraction-comparison-subskills@1", competency: FCMP,
  subSkills: [
    { id: "fraction.compare-same-bottom@1", name: "Compare two fractions with the same bottom number", example: "gen:adfcmp:0,3,1,2,0", families: ["adfcmp"], competency: FCMP, parameters: [{ index: 0, values: [0] }] },
    { id: "fraction.compare-same-top@1", name: "Compare two fractions with the same top number", example: "gen:adfcmp:1,1,2,4,0", families: ["adfcmp"], competency: FCMP, parameters: [{ index: 0, values: [1] }] },
    { id: "fraction.order-same-bottom@1", name: "Order three fractions with the same bottom number", example: "gen:adford:0,4,2,1,3", families: ["adford"], competency: FCMP, parameters: [{ index: 0, values: [0] }] },
    { id: "fraction.order-same-top@1", name: "Order three fractions with the same top number", example: "gen:adford:1,1,2,3,10", families: ["adford"], competency: FCMP, parameters: [{ index: 0, values: [1] }] },
    { id: "fraction.compare-unlike@1", name: "Compare two fractions with different tops and bottoms", example: "gen:adfcmpu:4,5,7,10,0", families: ["adfcmpu"], competency: FCMP },
    { id: "fraction.order-unlike@1", name: "Order three unlike fractions", example: "gen:adfordu:0,1,6", families: ["adfordu"], competency: FCMP },
  ],
  unmapped: { adfnl: "Unit fractions located on a number line (a choice of dot): reading a number line, not comparing written fractions; needs its own skill contract." },
  core: ["fraction.compare-same-bottom@1", "fraction.compare-same-top@1", "fraction.order-same-bottom@1", "fraction.order-same-top@1", "fraction.compare-unlike@1", "fraction.order-unlike@1"],
  broadClaim: (label) => `Fraction comparison reads ${label} across configured comparison and ordering tasks only`,
};

const EQF = "MATH.number.equivalent-fractions";
/** eqfrac [a, b, d]: a/b = □/d. avlow [a, b, k]: (a k)/(b k) to lowest terms. avfold [a, b, k]: a of b strips coloured, each
 * strip folded into k parts (native choice of the equal fraction). */
export const EQUIVALENT_FRACTIONS_CONFIG: SubSkillConfig = {
  version: "equivalent-fractions-subskill-projection@1", mapping: "equivalent-fractions-subskills@1", competency: EQF,
  subSkills: [
    { id: "fraction.equivalent-missing-part@1", name: "The missing part of an equivalent fraction", example: "gen:eqfrac:1,2,4", families: ["eqfrac"], competency: EQF },
    { id: "fraction.lowest-terms@1", name: "Write a fraction in its lowest terms", example: "gen:avlow:4,5,6", families: ["avlow"], competency: EQF },
    { id: "fraction.equal-by-folding@1", name: "An equal fraction from folding (choice answer)", example: "gen:avfold:3,5,2", families: ["avfold"], competency: EQF },
  ],
  unmapped: { avlike: "Telling like from unlike fractions: classifying pairs by their bottom numbers, not making equal fractions; needs its own skill contract." },
  core: ["fraction.equivalent-missing-part@1", "fraction.lowest-terms@1", "fraction.equal-by-folding@1"],
  broadClaim: (label) => `Equivalent fractions read ${label} across configured equivalence tasks only`,
};

export const FRACTION_PATTERN_CONFIGS = [FRACTION_COMPARISON_CONFIG, EQUIVALENT_FRACTIONS_CONFIG];
