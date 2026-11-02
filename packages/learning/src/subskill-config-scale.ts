/** Skill mapping for one reusable pattern across statistics and number: "one symbol, bar or digit stands for a fixed amount".
 * The same multiplicative structure appears in pictographs (a key), scaled bar charts (a scale) and place value (a digit's
 * place). Every skill below reads, compares, totals or inverts that unit value. Mapping narrows existing generator tasks by
 * validated parameters only; it adds no question, solver, grader or teaching, and grants no method authority or approval. */
import type { SubSkillConfig } from "./subskill-projection";

/** Verified finite selected-row relation supplied by Claude 81923a1. Each triple becomes
 * the full [key, seed, row, row-task=0] tuple; no displayed-text predicate is used. */
export const HALF_SYMBOL_ROWS: readonly string[] = ["0,0,3", "0,1,1", "0,1,2", "0,1,3", "0,2,1", "0,2,3", "0,3,1", "0,3,2", "0,4,0", "0,4,1", "0,4,3", "0,5,1", "0,5,2", "0,6,0", "0,6,1", "0,6,2", "0,6,3", "0,7,2", "0,7,3", "0,8,3", "0,9,0", "0,9,2", "0,10,0", "0,10,1", "0,10,2", "0,10,3", "0,11,1", "0,11,3", "0,12,3", "0,13,0", "0,13,1", "0,13,2", "0,13,3", "0,14,2", "0,14,3", "0,15,1", "0,15,3", "0,16,1", "0,16,2", "0,16,3", "0,17,0", "0,17,1", "0,17,2", "0,18,0", "0,18,1", "0,18,2", "0,18,3", "0,19,2", "0,19,3", "0,20,0", "0,20,1", "0,20,2", "0,21,0", "0,21,1", "0,21,2", "0,21,3", "0,22,0", "0,22,1", "0,22,3", "0,23,0", "0,23,1", "0,23,2", "0,24,0", "0,24,2", "0,25,1", "0,25,3", "0,26,0", "0,26,1", "0,27,2", "0,28,0", "0,28,1", "0,28,3", "0,29,1", "0,29,2", "0,29,3", "1,0,1", "1,0,2", "1,0,3", "1,1,2", "1,2,0", "1,2,2", "1,3,0", "1,3,1", "1,3,2", "1,3,3", "1,4,0", "1,4,1", "1,4,3", "1,5,0", "1,5,3", "1,6,0", "1,7,1", "1,7,2", "1,7,3", "1,8,0", "1,8,1", "1,8,2", "1,9,1", "1,10,1", "1,11,1", "1,12,0", "1,12,2", "1,13,0", "1,13,1", "1,13,2", "1,14,0", "1,14,1", "1,14,2", "1,14,3", "1,15,1", "1,15,3", "1,16,2", "1,17,3", "1,18,1", "1,18,2", "1,19,0", "1,19,1", "1,19,3", "1,20,0", "1,20,1", "1,20,2", "1,20,3", "1,21,2", "1,21,3", "1,22,1", "1,22,2", "1,23,0", "1,23,1", "1,23,2", "1,23,3", "1,24,0", "1,24,1", "1,24,3", "1,25,0", "1,25,1", "1,25,2", "1,25,3", "1,26,2", "1,27,1", "1,27,2", "1,27,3", "1,28,1", "1,29,1", "2,0,2", "2,0,3", "2,1,0", "2,1,1", "2,3,0", "2,3,1", "2,3,2", "2,3,3", "2,4,0", "2,4,1", "2,4,3", "2,5,0", "2,5,2", "2,6,1", "2,6,2", "2,6,3", "2,7,0", "2,7,1", "2,7,3", "2,8,0", "2,8,2", "2,8,3", "2,9,0", "2,9,3", "2,10,0", "2,11,0", "2,11,2", "2,12,1", "2,12,2", "2,13,0", "2,13,1", "2,13,3", "2,14,0", "2,14,1", "2,14,2", "2,15,0", "2,15,3", "2,16,0", "2,16,2", "2,16,3", "2,17,1", "2,17,2", "2,17,3", "2,18,0", "2,18,1", "2,18,2", "2,18,3", "2,19,1", "2,20,0", "2,20,1", "2,20,2", "2,21,2", "2,22,0", "2,22,2", "2,22,3", "2,23,0", "2,23,1", "2,24,0", "2,24,2", "2,24,3", "2,25,0", "2,25,1", "2,25,3", "2,26,3", "2,27,0", "2,27,2", "2,27,3", "2,28,3", "2,29,1", "2,29,2", "2,29,3", "3,0,2", "3,1,1", "3,2,0", "3,2,1", "3,2,2", "3,3,0", "3,3,2", "3,3,3", "3,4,1", "3,4,3", "3,5,1", "3,5,2", "3,6,3", "3,8,0", "3,8,1", "3,9,1", "3,10,2", "3,10,3", "3,11,0", "3,11,2", "3,12,1", "3,12,2", "3,13,0", "3,13,2", "3,14,0", "3,14,2", "3,14,3", "3,15,0", "3,15,2", "3,15,3", "3,16,1", "3,16,3", "3,17,1", "3,17,2", "3,17,3", "3,18,0", "3,18,2", "3,19,0", "3,19,1", "3,19,2", "3,20,0", "3,20,1", "3,21,2", "3,21,3", "3,22,1", "3,23,1", "3,23,2", "3,24,3", "3,25,0", "3,25,1", "3,25,2", "3,26,1", "3,26,3", "3,27,1", "3,27,2", "3,27,3", "3,28,1", "3,28,2", "3,29,0", "3,29,2", "3,29,3"];

const PICT = "MATH.statistics.pictographs";
/** pictographs: key [1, 2, 5, 10][ki] for acpict/acpictmore; a key of 1 has no scale, so those tasks are left unmapped */
export const PICTOGRAPHS_CONFIG: SubSkillConfig = {
  version: "pictographs-subskill-projection@2", mapping: "pictographs-subskills@2", competency: PICT,
  subSkills: [
    { id: "pictographs.read-with-key@1", name: "Read one row using the key", example: "gen:acpict:2,2,1", families: ["acpict"], competency: PICT, parameters: [{ index: 0, values: [1, 2, 3] }] },
    { id: "pictographs.half-symbol@1", name: "Read a row with a half symbol", example: "gen:acpicthalf:2,0,3,0", families: ["acpicthalf"], competency: PICT, parameters: [{ index: 3, values: [0] }], parameterTuples: HALF_SYMBOL_ROWS.map(row => [...row.split(",").map(Number), 0]) },
    { id: "pictographs.half-symbol-total@1", name: "Total of a pictograph with half symbols", example: "gen:acpicthalf:3,27,0,1", families: ["acpicthalf"], competency: PICT, parameters: [{ index: 3, values: [1] }] },
    { id: "pictographs.compare-rows@1", name: "How many more, using the key", example: "gen:acpictmore:2,4,0", families: ["acpictmore"], competency: PICT, parameters: [{ index: 0, values: [1, 2, 3] }] },
    { id: "pictographs.draw-from-table@1", name: "How many symbols to draw for a value", example: "gen:acpicttab:0,0,0,0", families: ["acpicttab"], competency: PICT, parameters: [{ index: 3, values: [0] }] },
    { id: "pictographs.total@1", name: "Total of a pictograph, using the key", example: "gen:acpicttab:0,0,0,1", families: ["acpicttab"], competency: PICT, parameters: [{ index: 3, values: [1] }] },
    { id: "pictographs.largest-group@1", name: "Value of the largest group, using the key", example: "gen:acpicttab:0,0,0,2", families: ["acpicttab"], competency: PICT, parameters: [{ index: 3, values: [2] }] },
  ],
  unmapped: { "acpicthalf:whole-row": "A row containing only whole pictures does not establish reading a half picture; answer grading remains available.", "acpict:key-1": "A key of 1 (ki = 0) reads plain counts: no unit value is used, so it is not evidence for reading with a key.", "acpictmore:key-1": "A key of 1 (ki = 0) compares plain counts." },
  core: ["pictographs.read-with-key@1", "pictographs.half-symbol@1", "pictographs.half-symbol-total@1", "pictographs.compare-rows@1", "pictographs.draw-from-table@1", "pictographs.total@1", "pictographs.largest-group@1"],
  broadClaim: (label) => `Pictographs read ${label} across configured key tasks only`,
};

const BARS = "MATH.statistics.scaled-bars";
/** scaled bars: afbar [si, kind, s], scale [2, 5, 10, 20, 50, 100][si] (never 1); kind 0 one bar, 1 how many more, 2 total */
export const SCALED_BARS_CONFIG: SubSkillConfig = {
  version: "scaled-bars-subskill-projection@1", mapping: "scaled-bars-subskills@1", competency: BARS,
  subSkills: [
    { id: "scaled-bars.read@1", name: "Read one bar against the scale", example: "gen:afbar:1,0,0", families: ["afbar"], competency: BARS, parameters: [{ index: 1, values: [0] }] },
    { id: "scaled-bars.difference@1", name: "How many more, read against the scale", example: "gen:afbar:0,1,0", families: ["afbar"], competency: BARS, parameters: [{ index: 1, values: [1] }] },
    { id: "scaled-bars.total@1", name: "Total of two bars, read against the scale", example: "gen:afbar:0,2,0", families: ["afbar"], competency: BARS, parameters: [{ index: 1, values: [2] }] },
  ],
  unmapped: {},
  core: ["scaled-bars.read@1", "scaled-bars.difference@1", "scaled-bars.total@1"],
  broadClaim: (label) => `Scaled bar charts read ${label} across three configured question kinds`,
};

const PV = "MATH.number.place-value-tens";
/** place value: the tens place as the unit value (10). Number names and digit cards are other skills of the competency. */
export const PLACE_VALUE_TENS_CONFIG: SubSkillConfig = {
  version: "place-value-tens-subskill-projection@1", mapping: "place-value-tens-subskills@1", competency: PV,
  subSkills: [
    { id: "place-value.blocks-to-number@1", name: "Tens and ones blocks to a number (including 10 or more loose ones)", example: "gen:aatens:4,5", families: ["aatens"], competency: PV },
    { id: "place-value.tens-digit-value@1", name: "Value of the tens digit", example: "gen:aadigit:42,0", families: ["aadigit"], competency: PV, parameters: [{ index: 1, values: [0] }] },
    { id: "place-value.count-tens@1", name: "How many tens in a number", example: "gen:aadigit:34,1", families: ["aadigit"], competency: PV, parameters: [{ index: 1, values: [1] }] },
    { id: "place-value.ones-digit-value@1", name: "Value of the ones digit", example: "gen:aadigit:91,2", families: ["aadigit"], competency: PV, parameters: [{ index: 1, values: [2] }] },
    { id: "place-value.full-tens@1", name: "How many full groups of ten in a collection", example: "gen:aabund:6,0,0", families: ["aabund"], competency: PV, parameters: [{ index: 2, values: [0] }] },
    { id: "place-value.left-over-ones@1", name: "Ones left over after grouping in tens", example: "gen:aabund:3,1,1", families: ["aabund"], competency: PV, parameters: [{ index: 2, values: [1] }] },
    { id: "place-value.grouped-total@1", name: "How many in all, after grouping in tens (may also be counted one by one)", example: "gen:aabund:3,1,2", families: ["aabund"], competency: PV, parameters: [{ index: 2, values: [2] }] },
  ],
  unmapped: {
    aagreat: "Greatest or smallest number from digit cards: ordering digits, not a unit value; needs its own skill contract.",
    aaword: "Number name to numeral: language of numbers; needs its own skill contract.",
    aaname: "Numeral to number name: a choice answer; the shared numeric task validator cannot check it.",
  },
  core: ["place-value.blocks-to-number@1", "place-value.tens-digit-value@1", "place-value.count-tens@1", "place-value.ones-digit-value@1", "place-value.full-tens@1", "place-value.left-over-ones@1", "place-value.grouped-total@1"],
  broadClaim: (label) => `Place value (tens) reads ${label} across configured unit-value tasks only`,
};

export const SCALE_PATTERN_CONFIGS = [PICTOGRAPHS_CONFIG, SCALED_BARS_CONFIG, PLACE_VALUE_TENS_CONFIG];
