/**
 * G5: geometry evidence dimensions as CONFIGURATION of the domain-neutral sub-skill projection (subskill-projection.ts). SHADOW,
 * non-authoritative, provisional (confirmed against the curriculum and the generator families below; not educator-reviewed).
 *
 * Two configurations, one per existing competency (sub-skills are not competencies and are not graph nodes; the competencies are unchanged):
 *
 *   MATH.geometry.angle-pairs         "Use linear pairs, vertically opposite, complementary and supplementary angles" (grades 5–7)
 *   MATH.geometry.triangle-properties "Use elementary triangle properties" (grade 6)
 *
 * The sub-skill of an answer comes only from its trusted generator family (as for linear equations). A family decides one sub-skill: the
 * generator does not state finer kinds in a way this projection may read (e.g. afpair mixes complementary and supplementary pairs by a
 * parameter, so it is one sub-skill; afcross asks, by a mode parameter, for the vertically opposite angle, an adjacent angle (a linear pair)
 * or the sum of the other three angles (angles around a point, 360° − x), so it is one sub-skill covering all three).
 *
 * No prerequisite support relation is configured: the graph has no edge between the two competencies (triangle-properties' only mandatory
 * prerequisite is basic-constructions), and none is invented here.
 *
 * Not represented, because no generator family exists for it (MISSING DOMAIN CAPABILITY, not configurable):
 *   - angles around a point as its OWN evidence dimension: it appears only as afcross mode 2 (the other three angles at a crossing), which
 *     the projection cannot separate from the other afcross modes; otherwise only ahtile (MATH.geometry.tessellations, a tiling question);
 *   - multi-step angle reasoning and geometric justification (no family asks for it; the geometry reasoner can judge structured steps but
 *     no generator produces such tasks; the server does record a working-assessment@1 verdict for geometry answers, but it comes from the
 *     algebra derivation authority and is always "unsupported" (no geometry statement contract), and the projection does not check which
 *     authority produced a verdict; see docs/geometry-cross-domain-validation).
 */
import type { SubSkillConfig } from "./subskill-projection";

export type AnglePairsSubSkill = "angle-pairs.complementary-supplementary@1" | "angle-pairs.intersecting-lines@1";
export const ANGLE_PAIRS_CONFIG: SubSkillConfig<AnglePairsSubSkill> = {
  version: "geometry-subskill-projection@1",
  mapping: "angle-pairs-subskills@1",
  competency: "MATH.geometry.angle-pairs",
  subSkills: [
    { id: "angle-pairs.complementary-supplementary@1", name: "Complementary and supplementary pairs (angles on a straight line)", example: "two angles are supplementary; one is 64°", families: ["afpair"], competency: "MATH.geometry.angle-pairs",
      note: "afpair asks for the other angle of a complementary (90°) or supplementary (180°, a straight line) pair; one family, one sub-skill" },
    { id: "angle-pairs.intersecting-lines@1", name: "Angles where two lines cross (vertically opposite, adjacent, around the point)", example: "two lines cross; one angle is 21°; the opposite angle?", families: ["afcross"], competency: "MATH.geometry.angle-pairs",
      note: "afcross asks for the vertically opposite angle, an adjacent angle (a linear pair) or the other three angles (around a point, 360° − x); its misconception opposite-as-linear is the supplementary/vertically-opposite confusion" },
  ],
  unmapped: {},
  core: ["angle-pairs.complementary-supplementary@1", "angle-pairs.intersecting-lines@1"],
  broadClaim: (label) => `the competency reads "${label}" (shown alone) for every kind of angle pair`,
};

export type TriangleSubSkill = "triangle-properties.angle-sum@1" | "triangle-properties.exterior-angle@1" | "triangle-properties.isosceles-angles@1" | "triangle-properties.side-inequality@1";
export const TRIANGLE_PROPERTIES_CONFIG: SubSkillConfig<TriangleSubSkill> = {
  version: "geometry-subskill-projection@1",
  mapping: "triangle-properties-subskills@1",
  competency: "MATH.geometry.triangle-properties",
  subSkills: [
    { id: "triangle-properties.angle-sum@1", name: "Triangle interior-angle sum", example: "two angles are 16° and 44°; the third?", families: ["ahtri"], competency: "MATH.geometry.triangle-properties" },
    { id: "triangle-properties.exterior-angle@1", name: "Exterior-angle theorem", example: "the interior opposite angles are 20° and 72°; the exterior angle?", families: ["ahext"], competency: "MATH.geometry.triangle-properties",
      note: "both directions (the exterior angle from the two opposite interior angles, and an interior angle from the exterior angle)" },
    { id: "triangle-properties.isosceles-angles@1", name: "Angles of an isosceles triangle", example: "the apex angle is 20°; each base angle?", families: ["ahiso"], competency: "MATH.geometry.triangle-properties" },
    { id: "triangle-properties.side-inequality@1", name: "Triangle inequality (sides)", example: "two sides are 2 cm and 3 cm; the longest whole third side?", families: ["ahineq"], competency: "MATH.geometry.triangle-properties",
      note: "a side property, not an angle relationship; mapped so that the competency's every family has a sub-skill (none is credited elsewhere)" },
  ],
  unmapped: {},
  core: ["triangle-properties.angle-sum@1", "triangle-properties.exterior-angle@1", "triangle-properties.isosceles-angles@1", "triangle-properties.side-inequality@1"],
  broadClaim: (label) => `the competency reads "${label}" (shown alone) for every triangle property`,
};
