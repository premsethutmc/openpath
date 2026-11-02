/** Linear-equation mapping only: no runtime projection imports, so consumers can initialize in either order. */
import type { SubSkillConfig, SubSkillDef as SubSkillDefOf } from "./subskill-projection";

export const SUBSKILL_PROJECTION_VERSION = "linear-equations-subskill-projection@1" as const;
export const SUBSKILL_MAPPING_VERSION = "linear-equations-subskills@1" as const;
export const COMPETENCY = "MATH.algebra.linear-equations" as const;
export type SubSkillId =
  | "linear-equations.one-step@1"
  | "linear-equations.two-step@1"
  | "linear-equations.both-sides@1"
  | "linear-equations.brackets@1"
  | "linear-equations.modelling@1";
export type SubSkillDef = SubSkillDefOf<SubSkillId>;
/** linear-equations-subskills@1. Stable and versioned: a change of mapping is a new version, never an edit of this one. */
export const SUBSKILLS: readonly SubSkillDef[] = [
  { id: "linear-equations.one-step@1", name: "One-step equations", example: "x + 7 = 12", families: ["ahone"], competency: "MATH.algebra.linear-intro",
    note: "the competency has no one-step family: one-step equations are the prerequisite competency MATH.algebra.linear-intro (mandatory edge audit@1); its answers are read as that sub-skill's evidence, its own competency is unchanged" },
  { id: "linear-equations.two-step@1", name: "Two-step equations", example: "2x + 5 = 17", families: ["lin"], competency: COMPETENCY },
  { id: "linear-equations.both-sides@1", name: "Variables on both sides", example: "3x + 4 = x + 12", families: ["lboth"], competency: COMPETENCY },
  { id: "linear-equations.brackets@1", name: "Distribution and brackets", example: "3(x − 2) = 2x + 5", families: ["lbrk"], competency: COMPETENCY },
  { id: "linear-equations.modelling@1", name: "Modelling with an equation", example: "choose / form the equation of a story", families: ["auleq", "aulwp"], competency: COMPETENCY,
    note: "aulwp forms AND solves an equation; the solving kind depends on the story and is not stated by the generator, so it is credited to modelling only (never to a solving sub-skill)" },
];
/** Families of the competency that are deliberately left unmapped (and why). */
export const UNMAPPED: Readonly<Record<string, string>> = {
  meet: "tagged linear-equations but finds where a line meets y = x² (a quadratic set answer); not in the module's pools; not a linear-equation solving sub-skill",
};
/** The core solving sub-skills a broad "shown alone" claim on the competency implies. */
export const CORE: readonly SubSkillId[] = ["linear-equations.two-step@1", "linear-equations.both-sides@1", "linear-equations.brackets@1"];
/** The configuration of the domain-neutral projection. */
export const LINEAR_EQUATIONS_CONFIG: SubSkillConfig<SubSkillId> = {
  version: SUBSKILL_PROJECTION_VERSION, mapping: SUBSKILL_MAPPING_VERSION, competency: COMPETENCY, subSkills: SUBSKILLS, unmapped: UNMAPPED, core: CORE,
  // the one explicit relation: MATH.algebra.linear-intro (one-step) is a MANDATORY prerequisite of MATH.algebra.linear-equations (audit@1,
  // "multi-step linear equations build on one-step equations"). A demonstrated multi-step sub-skill is listed as supporting evidence for
  // one-step; it never changes one-step's status. No relation exists between the multi-step sub-skills, so none is listed.
  prerequisiteSupport: { to: "linear-equations.one-step@1", from: CORE, relation: "mandatory prerequisite edge MATH.algebra.linear-intro → MATH.algebra.linear-equations (audit@1)" },
  broadClaim: (label) => `the competency reads "${label}" (shown alone) for every kind of linear equation`,
};
