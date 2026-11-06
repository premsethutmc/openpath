/** Skill mapping for multi-digit addition with regrouping (MATH.number.addition-regroup).
 *
 * The module covers two kinds of question:
 *   addr     two-digit addition WITH regrouping (ones add to 10 or more)
 *   aeaddn   two-digit addition WITHOUT regrouping, and totals up to 200
 *
 * All four strategies teach addr (carrying); aeaddn questions appear in practice, transfer and retention
 * as contrast. Without this mapping, skillUnits() returns empty, subSkillGap() cannot fire, and a wrong
 * carrying answer is handed off to within-20 addition or place-value-tens via the prerequisite bugs instead
 * of being taught here with the module's own carrying strategies. §16.5 of the consolidation dashboard.
 */
import type { SubSkillConfig } from "./subskill-projection";

const competency = "MATH.number.addition-regroup";

export const ADDITION_REGROUP_CONFIG: SubSkillConfig = {
  version: "addition-regroup-subskill-projection@1",
  mapping: "addition-regroup-subskills@1",
  competency,
  subSkills: [
    {
      id: "addition-regroup.carrying@1",
      name: "Carry when ones add to 10 or more",
      example: "gen:addr:36,18",
      families: ["addr"],
      competency,
    },
    {
      id: "addition-regroup.no-regroup@1",
      name: "Add without regrouping and totals up to 200",
      example: "gen:aeaddn:0,23,45",
      families: ["aeaddn"],
      competency,
    },
  ],
  unmapped: {},
  core: ["addition-regroup.carrying@1", "addition-regroup.no-regroup@1"],
  broadClaim: (label) => `Addition with regrouping reads ${label} across carrying and non-carrying two-digit sums`,
};
