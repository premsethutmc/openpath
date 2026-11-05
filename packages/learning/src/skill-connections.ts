/** Auditable skill connections. Metadata narrows existing tasks; it grants no method authority or content approval. */
import { FAMILIES, problemOf } from './families';
import { grade } from './grading/decision';
import type { Module, Strategy } from './content';
import { classifyQuestionWith, type SubSkillConfig } from './subskill-projection';
import { LINEAR_EQUATIONS_CONFIG } from './subskill-config-linear';
import { TRIANGLE_PROPERTIES_CONFIG } from './subskill-config-geometry';
import { ADDITION_CONFIG } from './subskill-config-addition';
import { SCALE_PATTERN_CONFIGS } from './subskill-config-scale';
import { CONVERSION_PATTERN_CONFIGS } from './subskill-config-conversion';
import { INVERSE_PATTERN_CONFIGS } from './subskill-config-inverse';
import { FRACTION_PATTERN_CONFIGS } from './subskill-config-fractions';
import { ADDITION_REGROUP_CONFIG } from './subskill-config-addition-regroup';

const identity = 'MATH.algebra.identities';
export const IDENTITIES_CONFIG: SubSkillConfig = {
  version: 'identities-subskill-projection@1', mapping: 'identities-subskills@1', competency: identity,
  subSkills: [
    { id: 'identities.binomial-cross-term@1', name: 'Collect both middle products', example: 'gen:expand:2,3', families: ['expand'], competency: identity },
    ...[
      ['leading-square', 'Square the leading coefficient', 0, [0, 1, 2], 'gen:ahid:0,2,3,0'],
      ['square-cross-term', 'Signed middle coefficient of a square', 1, [0, 1], 'gen:ahid:0,1,3,1'],
      ['square-constant', 'Constant term of a square', 2, [0, 1], 'gen:ahid:1,1,3,2'],
      ['difference-constant', 'Constant term of a difference of squares', 2, [2], 'gen:ahid:2,1,3,2'],
    ].map(([id, name, box, forms, example]) => ({ id: `identities.${id}@1`, name: String(name), example: String(example), families: ['ahid'], competency: identity, parameters: [{ index: 3, values: [box as number] }, { index: 0, values: forms as number[] }] })),
  ],
  unmapped: { ahidn: 'Numeric identity calculations need a separate validated skill contract.' },
  core: ['identities.binomial-cross-term@1', 'identities.leading-square@1', 'identities.square-cross-term@1', 'identities.square-constant@1', 'identities.difference-constant@1'],
  broadClaim: (label) => `Identities read ${label} across configured coefficient tasks only`,
};
const angles = 'MATH.geometry.angle-pairs';
export const ANGLE_PAIRS_PRECISE_CONFIG: SubSkillConfig = {
  version: 'geometry-subskill-projection@2', mapping: 'angle-pairs-subskills@2', competency: angles,
  subSkills: [
    ...['complement', 'supplement'].map((name, kind) => ({ id: `angle-pairs.${name}@2`, name, example: `gen:afpair:${kind},60`, families: ['afpair'], competency: angles, parameters: [{ index: 0, values: [kind] }] })),
    ...['opposite', 'adjacent', 'other-three'].map((name, kind) => ({ id: `angle-pairs.${name}@2`, name, example: `gen:afcross:60,${kind}`, families: ['afcross'], competency: angles, parameters: [{ index: 1, values: [kind] }] })),
  ], unmapped: {}, core: ['complement', 'supplement', 'opposite', 'adjacent', 'other-three'].map((name) => `angle-pairs.${name}@2`),
  broadClaim: (label) => `Angle pairs read ${label} across five distinct angle relationships`,
};
const space = 'MATH.probability.sample-space';
/** sample-space@1: two-dice / two-spinner events are three different skills of the akdice generator (params[2]: 0 the total is
 * exactly k, 1 the total is k or more, 2 the second is bigger than the first); evidence on one is never evidence on another. */
export const SAMPLE_SPACE_CONFIG: SubSkillConfig = {
  version: 'sample-space-subskill-projection@1', mapping: 'sample-space-subskills@1', competency: space,
  subSkills: [
    { id: 'sample-space.stages@1', name: 'Count the outcomes of choices made in stages', example: 'gen:akss:2,3,2,0', families: ['akss'], competency: space },
    { id: 'sample-space.dice-exact-total@1', name: 'Probability of an exact total with two dice or spinners', example: 'gen:akdice:6,6,0,7', families: ['akdice'], competency: space, parameters: [{ index: 2, values: [0] }] },
    { id: 'sample-space.dice-at-least@1', name: 'Probability of a total of k or more', example: 'gen:akdice:3,6,1,4', families: ['akdice'], competency: space, parameters: [{ index: 2, values: [1] }] },
    { id: 'sample-space.dice-second-bigger@1', name: 'Probability that the second number is bigger', example: 'gen:akdice:3,4,2,0', families: ['akdice'], competency: space, parameters: [{ index: 2, values: [2] }] },
    { id: 'sample-space.listing@1', name: 'List a sample space and an event', example: 'gen:akssl:1,1,1', families: ['akssl'], competency: space },
    { id: 'sample-space.arrangements@1', name: 'Count arrangements that meet a condition', example: 'gen:aksarr:0,3,0', families: ['aksarr'], competency: space },
  ], unmapped: {},
  core: ['sample-space.stages@1', 'sample-space.dice-exact-total@1', 'sample-space.dice-at-least@1', 'sample-space.dice-second-bigger@1', 'sample-space.listing@1', 'sample-space.arrangements@1'],
  broadClaim: (label) => `Sample spaces read ${label} across stage counting, listing, arrangements and three kinds of two-dice event`,
};
export const CONNECTION_CONFIGS = [SAMPLE_SPACE_CONFIG, LINEAR_EQUATIONS_CONFIG, TRIANGLE_PROPERTIES_CONFIG, ADDITION_CONFIG, ADDITION_REGROUP_CONFIG, IDENTITIES_CONFIG, ANGLE_PAIRS_PRECISE_CONFIG, ...SCALE_PATTERN_CONFIGS, ...CONVERSION_PATTERN_CONFIGS, ...INVERSE_PATTERN_CONFIGS, ...FRACTION_PATTERN_CONFIGS];
export const connectionConfig = (competency: string) => CONNECTION_CONFIGS.find((c) => c.competency === competency);
export function connectedSkill(config: SubSkillConfig, id: string): string | null {
  const c = classifyQuestionWith(config, id);
  return c.kind === 'mapped' ? c.subSkill.id : null;
}
/** Check task semantics through the generator's independent validator, not only matching tags. */
export function validSkillTask(config: SubSkillConfig, skill: string, id: string): boolean {
  try {
    // Resolve the served variant itself. buildRaw checks the family's original typed
    // solve value; converting its displayed answer to Number loses fractions, tuples and choices.
    const p = problemOf(id);
    const f = p && FAMILIES.get(p.family);
    if (!p || !f || f.competency !== config.competency || connectedSkill(config, id) !== skill || !p.steps.length) return false;
    // Reuse the authoritative answer contract, including quarantine, form rules and
    // contract consistency. This establishes task support, never method evidence or approval.
    const result = grade(id, p.answer);
    return result.decision.verdict === 'correct' && result.assessment.credit === true;
  } catch {
    return false;
  }
}
export function strategyConnects(config: SubSkillConfig, skill: string, strategy: Strategy): boolean {
  // Prerequisite pointers remain optional help, but cannot establish teaching of
  // the target merely because their guided/check examples happen to align.
  if (strategy.kind === 'prerequisite' || strategy.screens.every((s) => s.role === 'prerequisite')) return false;
  return validSkillTask(config, skill, strategy.guided) && validSkillTask(config, skill, strategy.check)
    && strategy.screens.length > 0 && strategy.screens.every((s) => s.text.length > 0 && (!s.instance || validSkillTask(config, skill, s.instance)));
}
export function connectionStrategies(m: Module, config: SubSkillConfig, skill: string): Strategy[] {
  return m.strategies.filter((s) => strategyConnects(config, skill, s));
}
