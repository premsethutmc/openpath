/** Skill mapping for one reusable pattern across money, length and scale drawings: "change between units by a fixed
 * factor". Paise and rupees (100), millimetres, centimetres, metres and kilometres (10, 100, 1000) and a drawing scale
 * (1 cm for k units, or 1 : n) all convert by one known multiplier; each skill below fixes the units and the direction.
 * Mapping narrows existing generator tasks by validated parameters only; it adds no question, solver, grader or teaching,
 * and grants no method authority or approval. One family per skill: parameter conditions apply to every family listed. */
import type { SubSkillConfig } from "./subskill-projection";

const MONEY = "MATH.measurement.money-decimals";
/** acp2r [r, k]: (100r + 5k) paise to rupees; acpaise [r, k, form]: form 0 "₹r and p paise", form 1 "₹r.pp" */
export const MONEY_DECIMALS_CONFIG: SubSkillConfig = {
  version: "money-decimals-subskill-projection@1", mapping: "money-decimals-subskills@1", competency: MONEY,
  subSkills: [
    { id: "money.paise-to-rupees@1", name: "Paise to rupees, written as a decimal", example: "gen:acp2r:2,5", families: ["acp2r"], competency: MONEY },
    { id: "money.rupees-and-paise-to-paise@1", name: "Rupees and paise to paise", example: "gen:acpaise:1,2,0", families: ["acpaise"], competency: MONEY, parameters: [{ index: 2, values: [0] }] },
    { id: "money.decimal-rupees-to-paise@1", name: "Rupees written as a decimal, to paise", example: "gen:acpaise:1,3,1", families: ["acpaise"], competency: MONEY, parameters: [{ index: 2, values: [1] }] },
  ],
  unmapped: {
    acbill: "A bill total: adding money amounts, not changing units; needs its own skill contract.",
    acmoneyadd: "Adding or subtracting money amounts: arithmetic with decimals, not changing units.",
    acmoneymul: "Multiplying a money amount: arithmetic with decimals, not changing units.",
  },
  core: ["money.paise-to-rupees@1", "money.rupees-and-paise-to-paise@1", "money.decimal-rupees-to-paise@1"],
  broadClaim: (label) => `Money in rupees and paise reads ${label} across configured unit-change tasks only`,
};

const LEN = "MATH.measurement.length-conversion";
/** acdecu [kind, n]: 0 cm→m, 1 mm→cm, 2 m→km (as decimals), 3 decimal m→cm; acmcm [m, c, dir]: 0 "m cm"→cm, 1 cm→"m and ? cm";
 * acmmkm [kind, a, b]: 0 "cm mm"→mm, 1 mm→"cm and ? mm", 2 m→"km and ? m", 3 m→whole km, 4 mm→whole cm;
 * acmcmp [m, c, distractor, d]: which of "m cm" and a cm length is longer (a choice answer) */
export const LENGTH_CONVERSION_CONFIG: SubSkillConfig = {
  version: "length-conversion-subskill-projection@1", mapping: "length-conversion-subskills@1", competency: LEN,
  subSkills: [
    { id: "length.cm-to-decimal-m@1", name: "Centimetres to metres, as a decimal", example: "gen:acdecu:0,38", families: ["acdecu"], competency: LEN, parameters: [{ index: 0, values: [0] }] },
    { id: "length.mm-to-decimal-cm@1", name: "Millimetres to centimetres, as a decimal", example: "gen:acdecu:1,5", families: ["acdecu"], competency: LEN, parameters: [{ index: 0, values: [1] }] },
    { id: "length.m-to-decimal-km@1", name: "Metres to kilometres, as a decimal", example: "gen:acdecu:2,140", families: ["acdecu"], competency: LEN, parameters: [{ index: 0, values: [2] }] },
    { id: "length.decimal-m-to-cm@1", name: "Metres written as a decimal, to centimetres", example: "gen:acdecu:3,120", families: ["acdecu"], competency: LEN, parameters: [{ index: 0, values: [3] }] },
    { id: "length.m-cm-to-cm@1", name: "Metres and centimetres to centimetres", example: "gen:acmcm:1,4,0", families: ["acmcm"], competency: LEN, parameters: [{ index: 2, values: [0] }] },
    { id: "length.cm-to-m-cm@1", name: "Centimetres to metres and centimetres", example: "gen:acmcm:1,4,1", families: ["acmcm"], competency: LEN, parameters: [{ index: 2, values: [1] }] },
    { id: "length.cm-mm-to-mm@1", name: "Centimetres and millimetres to millimetres", example: "gen:acmmkm:0,2,1", families: ["acmmkm"], competency: LEN, parameters: [{ index: 0, values: [0] }] },
    { id: "length.mm-to-cm-mm@1", name: "Millimetres to centimetres and millimetres", example: "gen:acmmkm:1,5,1", families: ["acmmkm"], competency: LEN, parameters: [{ index: 0, values: [1] }] },
    { id: "length.m-to-km-m@1", name: "Metres to kilometres and metres", example: "gen:acmmkm:2,1,5", families: ["acmmkm"], competency: LEN, parameters: [{ index: 0, values: [2] }] },
    { id: "length.m-to-whole-km@1", name: "Thousands of metres to kilometres", example: "gen:acmmkm:3,1,0", families: ["acmmkm"], competency: LEN, parameters: [{ index: 0, values: [3] }] },
    { id: "length.mm-to-whole-cm@1", name: "Tens of millimetres to centimetres", example: "gen:acmmkm:4,1,0", families: ["acmmkm"], competency: LEN, parameters: [{ index: 0, values: [4] }] },
  ],
  unmapped: { acmcmp: "Which is longer (a choice answer A/B/C): prepared as PREPARED_CHOICE_SKILLS below, not registered until the shared task validator accepts choice answers." },
  core: ["length.cm-to-decimal-m@1", "length.mm-to-decimal-cm@1", "length.m-to-decimal-km@1", "length.decimal-m-to-cm@1", "length.m-cm-to-cm@1", "length.cm-to-m-cm@1", "length.cm-mm-to-mm@1", "length.mm-to-cm-mm@1", "length.m-to-km-m@1", "length.m-to-whole-km@1", "length.mm-to-whole-cm@1"],
  broadClaim: (label) => `Length conversion reads ${label} across configured unit-change tasks only`,
};

const SCALE = "MATH.geometry.scale-drawings";
/** aiscale [ki, d, dir]: "1 cm stands for k km", dir 0 map→real, 1 real→map; airatio [si, n]: scale 1 : [100, 200, 500, 1000]
 * to metres (si 0–3), 1 : [25000, 50000, 100000] to kilometres (si 4–6) */
export const SCALE_DRAWINGS_CONFIG: SubSkillConfig = {
  version: "scale-drawings-subskill-projection@1", mapping: "scale-drawings-subskills@1", competency: SCALE,
  subSkills: [
    { id: "scale.map-to-real@1", name: "Map distance to real distance (1 cm stands for k km)", example: "gen:aiscale:1,2,0", families: ["aiscale"], competency: SCALE, parameters: [{ index: 2, values: [0] }] },
    { id: "scale.real-to-map@1", name: "Real distance to map distance (1 cm stands for k km)", example: "gen:aiscale:1,2,1", families: ["aiscale"], competency: SCALE, parameters: [{ index: 2, values: [1] }] },
    { id: "scale.ratio-plan-to-metres@1", name: "Plan length to real metres, scale 1 : n", example: "gen:airatio:1,3", families: ["airatio"], competency: SCALE, parameters: [{ index: 0, values: [0, 1, 2, 3] }] },
    { id: "scale.ratio-map-to-km@1", name: "Map length to real kilometres, scale 1 : n", example: "gen:airatio:5,3", families: ["airatio"], competency: SCALE, parameters: [{ index: 0, values: [4, 5, 6] }] },
  ],
  unmapped: {},
  core: ["scale.map-to-real@1", "scale.real-to-map@1", "scale.ratio-plan-to-metres@1", "scale.ratio-map-to-km@1"],
  broadClaim: (label) => `Scale drawings read ${label} across configured unit-change tasks only`,
};

/** Prepared, NOT registered: skills whose tasks have a choice answer. The foundation runtime would already ask and credit them
 * (it reads the stored verdict), but validSkillTask (numeric-only) refuses every one of their tasks, so teaching, the
 * connection audit and diagnosis would report them as unconnected. Registering them now would make the runtime and the
 * audit disagree. Add to LENGTH_CONVERSION_CONFIG (subSkills and core) once Codex extends the answer contract. */
export const PREPARED_CHOICE_SKILLS = [
  { id: "length.compare-m-cm@1", name: "Which is longer: metres and centimetres, or centimetres", example: "gen:acmcmp:1,4,1,0", families: ["acmcmp"], competency: LEN, blocker: "validSkillTask: Number(answer) is NaN for a choice answer" },
] as const;

export const CONVERSION_PATTERN_CONFIGS = [MONEY_DECIMALS_CONFIG, LENGTH_CONVERSION_CONFIG, SCALE_DRAWINGS_CONFIG];
