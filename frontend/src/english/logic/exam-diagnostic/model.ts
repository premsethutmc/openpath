/** Synthetic contract test adapter only. No provider, credentials, scoring or mastery updates. */
import { gatewayEssayEvaluator, type EssayGatewayInfo, type GatewayTask } from '../../../../../packages/english-core/src/essay/evaluators.ts';
import { instructionLike } from '../../../../../packages/english-core/src/freeform.ts';
import { fingerprint, wordCount } from '../../../../../packages/english-core/src/essay/text.ts';

export const EXAM_WRITING_RUBRIC = 'openpath.exam-writing@1';
const SKILLS = { 'EN.GRM.VERB.sva': 'subject_verb_agreement', 'EN.GRM.NOUN.articles': 'articles' } as const;
export interface ModelWritingObservation {
  skill: typeof SKILLS[keyof typeof SKILLS];
  quote: string;
  correction?: string;
  explanation: string;
  kind: 'error' | 'strength' | 'style';
  confidence: 'high' | 'medium' | 'low';
  /** Only a suggestion to ask independent questions, never a confirmed gap. */
  requiresCheck: boolean;
}
export type SyntheticWritingPost = (body: {task: GatewayTask; request: unknown; data_use: 'synthetic_test'}) => Promise<unknown>;
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new Error('Invalid writing observation schema');
  return value as Record<string, unknown>;
}
function bounded(value: unknown, max: number): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }

/**
 * Call only with invented test text and an injected simulated transport. Real learner processing remains
 * disabled. The existing Grade 8 gateway is deliberately incompatible with this adult-specific rubric.
 * Exact quotation validates provenance, NOT the linguistic correctness of a model's claim.
 */
export async function analyseSyntheticWriting(text: string, info: EssayGatewayInfo, post: SyntheticWritingPost, dataUse: 'synthetic_test' | 'real_learner' = 'synthetic_test') {
  if (dataUse !== 'synthetic_test') throw new Error('Real learner writing analysis is not enabled');
  if (!info.available || info.rubric !== EXAM_WRITING_RUBRIC || info.protocols.observe !== 'essay-observe.v2') throw new Error('Exam writing evaluator is not configured for this rubric');
  if (typeof text !== 'string' || text.length > 5000 || wordCount(text) < 30 || wordCount(text) > 250) throw new Error('Synthetic sample must contain 30–250 words');
  if (instructionLike(text)) throw new Error('Instruction-like synthetic input is not analysed');
  const essayId = `synthetic-exam:${fingerprint(text)}`;
  const evaluator = gatewayEssayEvaluator({ info, post });
  const raw = await evaluator.observe({
    protocol: 'essay-observe.v2', rubric: EXAM_WRITING_RUBRIC, request_id: `obs:${essayId}`,
    essay: {id: essayId, text, words: wordCount(text)},
    // Legacy protocol requires grade. Zero means no school-grade profile; not an adult ability estimate.
    grade: 0, max_observations: 8,
    competencies: Object.keys(SKILLS).map(id => ({id, area: 'grammar' as const, name: SKILLS[id as keyof typeof SKILLS], bands: {}, misconceptions: []})),
  });
  const output = object(raw, ['essay_id', 'rubric', 'observations', 'not_observable']);
  if (output.essay_id !== essayId || output.rubric !== EXAM_WRITING_RUBRIC || !Array.isArray(output.observations) || output.observations.length > 8 || !Array.isArray(output.not_observable) || output.not_observable.length > 2 || output.not_observable.some(id => typeof id !== 'string' || !Object.hasOwn(SKILLS, id))) throw new Error('Invalid writing observation envelope');
  const observations: ModelWritingObservation[] = output.observations.map(value => {
    const o = object(value, ['competency','kind','quote','explanation','correction','confidence','verification','possible_slip']);
    if (typeof o.competency !== 'string' || !Object.hasOwn(SKILLS, o.competency) || !['error','strength','style'].includes(String(o.kind)) || !['high','medium','low'].includes(String(o.confidence)) || !['required','not_required'].includes(String(o.verification)) || !bounded(o.quote, 1000) || !text.includes(o.quote) || !bounded(o.explanation, 1000) || instructionLike(o.explanation) || (o.possible_slip !== undefined && typeof o.possible_slip !== 'boolean')) throw new Error('Invalid writing observation');
    if (o.correction !== undefined && (!bounded(o.correction, 1000) || o.correction === o.quote || instructionLike(o.correction))) throw new Error('Invalid writing correction');
    if ((o.kind === 'error' || o.kind === 'style') && o.correction === undefined) throw new Error('A correction is required');
    if (o.kind === 'style' && o.verification !== 'not_required') throw new Error('Style is not a diagnostic gap');
    return {skill: SKILLS[o.competency as keyof typeof SKILLS], quote: o.quote, explanation: o.explanation,
      ...(typeof o.correction === 'string' ? {correction: o.correction} : {}), kind: o.kind as ModelWritingObservation['kind'], confidence: o.confidence as ModelWritingObservation['confidence'],
      requiresCheck: o.kind === 'error' && o.verification === 'required' && o.possible_slip !== true && o.confidence !== 'low'};
  });
  return {status: 'observations_only' as const, rubric: EXAM_WRITING_RUBRIC, evaluator: {id: info.id, version: info.version, model: info.model}, observations};
}
