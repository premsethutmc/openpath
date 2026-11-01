/** Preview evidence dimensions for an existing third domain; no new content or checker. */
import type { SubSkillConfig } from "./subskill-projection";
export const ADDITION_CONFIG: SubSkillConfig = {
  version: "addition-subskill-projection@1", mapping: "addition-subskills@1", competency: "MATH.number.addition",
  subSkills: [
    { id: "addition.total@1", name: "Find a total", example: "4 + 7", families: ["aaadd"], competency: "MATH.number.addition" },
    { id: "addition.missing-part@1", name: "Find a missing part", example: "7 + ? = 11", families: ["aabond"], competency: "MATH.number.addition" },
    { id: "addition.story@1", name: "Add in context", example: "One more joins a group", families: ["aastadd", "aasenadd"], competency: "MATH.number.addition" },
  ], unmapped: {}, core: ["addition.total@1", "addition.missing-part@1", "addition.story@1"],
  broadClaim: (label) => `Addition reads ${label} across its configured skills`,
};
