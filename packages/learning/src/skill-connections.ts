/** Auditable skill connections. Metadata narrows existing tasks; it grants no method authority or content approval. */
import { FAMILIES, problemOf } from './families';
import type { Module, Strategy } from './content';
import { classifyQuestionWith, type SubSkillConfig } from './subskill-projection';
import { LINEAR_EQUATIONS_CONFIG } from './subskill-evidence';
import { TRIANGLE_PROPERTIES_CONFIG } from './subskill-config-geometry';
import { ADDITION_CONFIG } from './subskill-config-addition';

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
export const CONNECTION_CONFIGS = [LINEAR_EQUATIONS_CONFIG, TRIANGLE_PROPERTIES_CONFIG, ADDITION_CONFIG, IDENTITIES_CONFIG, ANGLE_PAIRS_PRECISE_CONFIG];
export const connectionConfig = (competency: string) => CONNECTION_CONFIGS.find((c) => c.competency === competency);
export function connectedSkill(config: SubSkillConfig, id: string): string | null {
  const c = classifyQuestionWith(config, id);
  return c.kind === 'mapped' ? c.subSkill.id : null;
}
/** Check task semantics through the generator's independent validator, not only matching tags. */
export function validSkillTask(config: SubSkillConfig, skill: string, id: string): boolean {
  const p = problemOf(id.replace(/:(mc|w)$/, ''));
  const f = p && FAMILIES.get(p.family);
  if (!p || !f || f.competency !== config.competency || connectedSkill(config, id) !== skill) return false;
  const answer = Number(p.answer);
  // These contracts currently cover numeric tasks. Other answer types remain explicit gaps.
  return Number.isFinite(answer) && f.validate(p.params, answer) && p.steps.length > 0;
}
export function strategyConnects(config: SubSkillConfig, skill: string, strategy: Strategy): boolean {
  return validSkillTask(config, skill, strategy.guided) && validSkillTask(config, skill, strategy.check)
    && strategy.screens.length > 0 && strategy.screens.every((s) => s.text.length > 0 && (!s.instance || validSkillTask(config, skill, s.instance)));
}
export function connectionStrategies(m: Module, config: SubSkillConfig, skill: string): Strategy[] {
  return m.strategies.filter((s) => strategyConnects(config, skill, s));
}
