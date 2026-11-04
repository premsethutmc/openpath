import type { ProjectionOptions } from "./subskill-projection";
export { canonicalOrder, type ProjectionOptions } from "./subskill-projection";
/**
 * Workstream E1: sub-skill evidence for MATH.algebra.linear-equations (SHADOW, non-authoritative).
 *
 * G5: this file is now the linear-equations CONFIGURATION of the domain-neutral projection (subskill-projection.ts); its exports and
 * outputs are unchanged.
 *
 * A pure, deterministic projection over the learner's existing records (records.ts readRecords → LearnerRecords). It adds no event, no
 * competency, no ledger and no mastery decision: the authoritative learner state (evidence.ts skillEvidence / the shared engine) is read,
 * never changed, and every place where it claims more than the per-sub-skill evidence supports is reported as a discrepancy.
 *
 * Reused semantics (nothing re-invented):
 *   - an answer counts only through `rightAnswer` (the recorded server decision / educator mark; evidence.ts);
 *   - independent vs assisted through `independentAttempt` (first answer, no hints, no solution, not guided; evidence.ts);
 *   - "shown alone" through INDEPENDENT_MIN distinct right first answers and status@2 (two of the last three wrong undoes it);
 *   - the delayed check through retention@2 (RETENTION_DAYS after independent success, any wrong answer fails, recovery = INDEPENDENT_MIN
 *     distinct right answers alone outside the check, then a new check RETENTION_DAYS later; a failure is never forgotten);
 *   - method evidence (D1 integration): ONLY the trusted grader's verdict recorded by the SERVER in the attempt's decision
 *     (grading-decision@1, decidedBy "server", working-assessment@1). Nothing is recomputed here: a record without that verdict (any record
 *     made before D1) is "not-recorded" and is never re-judged under the current authority; a verdict recorded under an older authority
 *     version stays as recorded and is marked historical (it never counts as a current verified method). Client fields
 *     (assessment.derivationVerified, a client-written decision) are ignored.
 * The sub-skill of an answer comes ONLY from the trusted generator id in its question id (gen:<family>:<params>[:mc|:w]); question text is
 * never read for it. An unmapped or unreadable family is "unknown" and is never credited to any sub-skill.
 */
import { classifyQuestionWith, projectFromEventsWith, projectSubSkillsWith, type Classified as ClassifiedOf, type Discrepancy as DiscrepancyOf, type Projection as ProjectionOf, type ProjectedAttempt as ProjectedAttemptOf, type StoredDecision, type SubSkillProjection as SubSkillProjectionOf } from "./subskill-projection";
import type { LearnerRecords } from "./records";
export { MAX_ATTEMPTS, retentionCycles, trustedWorking, type Method, type StoredDecision, type SubSkillStatus, type Unknown } from "./subskill-projection";

export { SUBSKILL_PROJECTION_VERSION, SUBSKILL_MAPPING_VERSION, COMPETENCY, SUBSKILLS, UNMAPPED, CORE, LINEAR_EQUATIONS_CONFIG, type SubSkillId, type SubSkillDef } from "./subskill-config-linear";
import { SUBSKILL_PROJECTION_VERSION, SUBSKILL_MAPPING_VERSION, COMPETENCY, LINEAR_EQUATIONS_CONFIG, type SubSkillId } from "./subskill-config-linear";
export type Classified = ClassifiedOf<SubSkillId>;
export type ProjectedAttempt = ProjectedAttemptOf<SubSkillId>;
export type SubSkillProjection = SubSkillProjectionOf<SubSkillId>;
export type Discrepancy = DiscrepancyOf<SubSkillId>;
export type Projection = ProjectionOf<SubSkillId, typeof SUBSKILL_PROJECTION_VERSION, typeof SUBSKILL_MAPPING_VERSION, typeof COMPETENCY>;
/** The sub-skill of a question, from the trusted generator id only. */
export const classifyQuestion = (questionId: unknown): Classified => classifyQuestionWith(LINEAR_EQUATIONS_CONFIG, questionId);
/** The projection. `authoritative` is the existing learner state for the competency (read only, to expose broader claims). */
export const projectSubSkills = (records: Pick<LearnerRecords, "attempts"> & Partial<Pick<LearnerRecords, "unresolved">>, now: number, authoritative?: { status: string; verified: boolean } | null, decisions?: ReadonlyMap<string, StoredDecision>, opts: ProjectionOptions = {}): Projection =>
  projectSubSkillsWith(LINEAR_EQUATIONS_CONFIG, records, now, authoritative, decisions, opts) as Projection;
/** The projection from the stored events (subskill-projection.ts projectFromEventsWith). */
export const projectFromEvents = (learnerId: string, events: readonly { kind: string }[], now: number, authoritative?: { status: string; verified: boolean } | null, opts: ProjectionOptions = {}): Projection =>
  projectFromEventsWith(LINEAR_EQUATIONS_CONFIG, learnerId, events, now, authoritative, opts) as Projection;
