/** Skill mapping for one reusable pattern across statistics and number: "one symbol, bar or digit stands for a fixed amount".
 * The same multiplicative structure appears in pictographs (a key), scaled bar charts (a scale) and place value (a digit's
 * place). Every skill below reads, compares, totals or inverts that unit value. Mapping narrows existing generator tasks by
 * validated parameters only; it adds no question, solver, grader or teaching, and grants no method authority or approval. */
import type { SubSkillConfig } from "./subskill-projection";

const PICT = "MATH.statistics.pictographs";
/** pictographs: key [1, 2, 5, 10][ki] for acpict/acpictmore; a key of 1 has no scale, so those tasks are left unmapped */
export const PICTOGRAPHS_CONFIG: SubSkillConfig = {
  version: "pictographs-subskill-projection@1", mapping: "pictographs-subskills@1", competency: PICT,
  subSkills: [
    { id: "pictographs.read-with-key@1", name: "Read one row using the key", example: "gen:acpict:2,2,1", families: ["acpict"], competency: PICT, parameters: [{ index: 0, values: [1, 2, 3] }] },
    { id: "pictographs.half-symbol@1", name: "Read a row with a half symbol", example: "gen:acpicthalf:2,0,3,0", families: ["acpicthalf"], competency: PICT, parameters: [{ index: 3, values: [0] }] },
    { id: "pictographs.half-symbol-total@1", name: "Total of a pictograph with half symbols", example: "gen:acpicthalf:3,27,0,1", families: ["acpicthalf"], competency: PICT, parameters: [{ index: 3, values: [1] }] },
    { id: "pictographs.compare-rows@1", name: "How many more, using the key", example: "gen:acpictmore:2,4,0", families: ["acpictmore"], competency: PICT, parameters: [{ index: 0, values: [1, 2, 3] }] },
    { id: "pictographs.draw-from-table@1", name: "How many symbols to draw for a value", example: "gen:acpicttab:0,0,0,0", families: ["acpicttab"], competency: PICT, parameters: [{ index: 3, values: [0] }] },
    { id: "pictographs.total@1", name: "Total of a pictograph, using the key", example: "gen:acpicttab:0,0,0,1", families: ["acpicttab"], competency: PICT, parameters: [{ index: 3, values: [1] }] },
    { id: "pictographs.largest-group@1", name: "Value of the largest group, using the key", example: "gen:acpicttab:0,0,0,2", families: ["acpicttab"], competency: PICT, parameters: [{ index: 3, values: [2] }] },
  ],
  unmapped: { "acpict:key-1": "A key of 1 (ki = 0) reads plain counts: no unit value is used, so it is not evidence for reading with a key.", "acpictmore:key-1": "A key of 1 (ki = 0) compares plain counts." },
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
