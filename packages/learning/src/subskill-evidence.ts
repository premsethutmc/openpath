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
import { classifyQuestionWith, projectFromEventsWith, projectSubSkillsWith, type Classified as ClassifiedOf, type Discrepancy as DiscrepancyOf, type Projection as ProjectionOf, type ProjectedAttempt as ProjectedAttemptOf, type StoredDecision, type SubSkillConfig, type SubSkillDef as SubSkillDefOf, type SubSkillProjection as SubSkillProjectionOf } from "./subskill-projection";
import type { LearnerRecords } from "./records";
export { MAX_ATTEMPTS, retentionCycles, trustedWorking, type Method, type StoredDecision, type SubSkillStatus, type Unknown } from "./subskill-projection";

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
export type Classified = ClassifiedOf<SubSkillId>;
export type ProjectedAttempt = ProjectedAttemptOf<SubSkillId>;
export type SubSkillProjection = SubSkillProjectionOf<SubSkillId>;
export type Discrepancy = DiscrepancyOf<SubSkillId>;
export type Projection = ProjectionOf<SubSkillId, typeof SUBSKILL_PROJECTION_VERSION, typeof SUBSKILL_MAPPING_VERSION, typeof COMPETENCY>;
/** The sub-skill of a question, from the trusted generator id only. */
export const classifyQuestion = (questionId: unknown): Classified => classifyQuestionWith(LINEAR_EQUATIONS_CONFIG, questionId);
/** The projection. `authoritative` is the existing learner state for the competency (read only, to expose broader claims). */
export const projectSubSkills = (records: Pick<LearnerRecords, "attempts"> & Partial<Pick<LearnerRecords, "unresolved">>, now: number, authoritative?: { status: string; verified: boolean } | null, decisions?: ReadonlyMap<string, StoredDecision>): Projection =>
  projectSubSkillsWith(LINEAR_EQUATIONS_CONFIG, records, now, authoritative, decisions) as Projection;
/** The projection from the stored events (subskill-projection.ts projectFromEventsWith). */
export const projectFromEvents = (learnerId: string, events: readonly { kind: string }[], now: number, authoritative?: { status: string; verified: boolean } | null): Projection =>
  projectFromEventsWith(LINEAR_EQUATIONS_CONFIG, learnerId, events, now, authoritative) as Projection;
