/** Skill mapping for one reusable pattern across arithmetic and algebra: "inverse operations undo each other". Adding and
 * taking away, multiplying and dividing undo each other, so an unknown (a box, a hidden digit, x) is found by working
 * backwards; the same relation gives related facts and the check of an answer. Each skill fixes the operation that was done
 * to the unknown and where the unknown stands. Mapping narrows existing generator tasks by validated parameters only; it adds
 * no question, solver or grader, and grants no method authority or approval. One family per skill. */
import type { SubSkillConfig } from "./subskill-projection";

const MISS = "MATH.algebra.missing-number";
/** acmissing [f, u, k]: the box is u; f 0 □ + k = u + k, 1 (u + k) − □ = k, 2 □ − k = u − k, 3 k × □ = k u.
 * acfacts [mode, x, y] (native choice A–D): 0 the subtraction fact of a + b = c, 1 the addition that checks c − b = a,
 * 2 the division fact of a × b = c, 3 dividend = divisor × quotient for c ÷ a = b. */
export const MISSING_NUMBER_CONFIG: SubSkillConfig = {
  version: "missing-number-subskill-projection@1", mapping: "missing-number-subskills@1", competency: MISS,
  subSkills: [
    { id: "missing.box-plus-k@1", name: "□ + k = n: undo the adding", example: "gen:acmissing:0,8,7", families: ["acmissing"], competency: MISS, parameters: [{ index: 0, values: [0] }] },
    { id: "missing.n-minus-box@1", name: "n − □ = k: the box is the number taken away", example: "gen:acmissing:1,9,18", families: ["acmissing"], competency: MISS, parameters: [{ index: 0, values: [1] }] },
    { id: "missing.box-minus-k@1", name: "□ − k = n: undo the taking away", example: "gen:acmissing:2,15,6", families: ["acmissing"], competency: MISS, parameters: [{ index: 0, values: [2] }] },
    { id: "missing.k-times-box@1", name: "k × □ = n: undo the multiplying", example: "gen:acmissing:3,7,6", families: ["acmissing"], competency: MISS, parameters: [{ index: 0, values: [3] }] },
    { id: "facts.subtraction-from-addition@1", name: "The subtraction fact of an addition fact (choice answer)", example: "gen:acfacts:0,5,0", families: ["acfacts"], competency: MISS, parameters: [{ index: 0, values: [0] }] },
    { id: "facts.check-subtraction-by-addition@1", name: "The addition that checks a subtraction (choice answer)", example: "gen:acfacts:1,5,1", families: ["acfacts"], competency: MISS, parameters: [{ index: 0, values: [1] }] },
    { id: "facts.division-from-multiplication@1", name: "The division fact of a multiplication fact (choice answer)", example: "gen:acfacts:2,5,0", families: ["acfacts"], competency: MISS, parameters: [{ index: 0, values: [2] }] },
    { id: "facts.dividend-is-divisor-times-quotient@1", name: "Dividend = divisor × quotient (choice answer)", example: "gen:acfacts:3,5,0", families: ["acfacts"], competency: MISS, parameters: [{ index: 0, values: [3] }] },
  ],
  unmapped: { acplace: "Placing digit cards for the largest or smallest sum or difference: place value, not undoing an operation; needs its own skill contract." },
  core: ["missing.box-plus-k@1", "missing.n-minus-box@1", "missing.box-minus-k@1", "missing.k-times-box@1", "facts.subtraction-from-addition@1", "facts.check-subtraction-by-addition@1", "facts.division-from-multiplication@1", "facts.dividend-is-divisor-times-quotient@1"],
  broadClaim: (label) => `Missing numbers and related facts read ${label} across configured inverse-operation tasks only`,
};

const LINI = "MATH.algebra.linear-intro";
/** ahone [f, a, t]: f 0 x + a = b, 1 x − a = b, 2 ax = b, 3 x ÷ a = b (whole numbers). */
export const LINEAR_INTRO_CONFIG: SubSkillConfig = {
  version: "linear-intro-subskill-projection@1", mapping: "linear-intro-subskills@1", competency: LINI,
  subSkills: [
    { id: "one-step.x-plus-a@1", name: "x + a = b: take a from both sides", example: "gen:ahone:0,7,12", families: ["ahone"], competency: LINI, parameters: [{ index: 0, values: [0] }] },
    { id: "one-step.x-minus-a@1", name: "x − a = b: add a to both sides", example: "gen:ahone:1,4,12", families: ["ahone"], competency: LINI, parameters: [{ index: 0, values: [1] }] },
    { id: "one-step.a-times-x@1", name: "ax = b: divide both sides by a", example: "gen:ahone:2,4,9", families: ["ahone"], competency: LINI, parameters: [{ index: 0, values: [2] }] },
    { id: "one-step.x-divided-by-a@1", name: "x ÷ a = b: multiply both sides by a", example: "gen:ahone:3,4,9", families: ["ahone"], competency: LINI, parameters: [{ index: 0, values: [3] }] },
  ],
  unmapped: {},
  core: ["one-step.x-plus-a@1", "one-step.x-minus-a@1", "one-step.a-times-x@1", "one-step.x-divided-by-a@1"],
  broadClaim: (label) => `One-step equations read ${label} across configured inverse-operation tasks only`,
};

const PZ = "MATH.reasoning.puzzle-strategy";
/** afmissd [s, pos, where, op]: one hidden digit in a three-digit sum (op 0) or difference (op 1), hidden in the first number
 * (where 0) or in the result (where 1). Only a digit hidden in the first number is found by undoing the operation. */
export const MISSING_DIGIT_CONFIG: SubSkillConfig = {
  version: "missing-digit-subskill-projection@1", mapping: "missing-digit-subskills@1", competency: PZ,
  subSkills: [
    { id: "digit.missing-in-addend@1", name: "A hidden digit in a number being added: total − other part", example: "gen:afmissd:0,1,0,0", families: ["afmissd"], competency: PZ, parameters: [{ index: 2, values: [0] }, { index: 3, values: [0] }] },
    { id: "digit.missing-in-first-number@1", name: "A hidden digit in the first number of a subtraction: answer + number taken away", example: "gen:afmissd:9,1,0,1", families: ["afmissd"], competency: PZ, parameters: [{ index: 2, values: [0] }, { index: 3, values: [1] }] },
  ],
  unmapped: {
    "afmissd:in-result": "A digit hidden in the result (where 1) is found by working the column forwards, not by undoing an operation; column arithmetic needs its own skill contract.",
    afnim: "Winning moves in a take-away game: working backwards over a game, not an inverse operation on a number sentence.",
    afriver: "River-crossing puzzles: not an inverse-operation task.",
  },
  core: ["digit.missing-in-addend@1", "digit.missing-in-first-number@1"],
  broadClaim: (label) => `Missing-digit puzzles read ${label} across configured inverse-operation tasks only`,
};

export const INVERSE_PATTERN_CONFIGS = [MISSING_NUMBER_CONFIG, LINEAR_INTRO_CONFIG, MISSING_DIGIT_CONFIG];
