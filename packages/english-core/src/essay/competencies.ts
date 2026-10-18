/**
 * The competency profile an essay is analysed against, checked against the framework, and the draft policy.
 */
import { isSpecified, misconceptionIds, type FrameworkIndex } from "../framework.ts";
import type { CapabilityId, LedgerEvent } from "../types.ts";
import { type Context, Ledger } from "../updater.ts";
import { type LeafView, leafView, type VerificationStatus } from "../composite.ts";
import { itemVersion } from "../content.ts";
import type { CompetencyProfile, CompetencyRef, EssayPolicy, RubricTrait, WritingArea } from "./contract.ts";

/** Draft values for review. None is a claim about what works for children. */
export const ESSAY_POLICY_DRAFT: EssayPolicy = {
  version: "essay-policy@2-draft",
  suspectMinSentences: 2,
  maxObservations: 40,
  diagnosticItems: 3,
  diagnosticMinIndependent: 2,
  confirmMinWrong: 2,
  weakenAllRight: true,
  maxTrees: 3,
  prerequisiteDepth: 2,
  guidedItems: 3,
  checkItems: 2,
  retentionDelayDays: 7,
  retentionItems: 2,
  followUpChecks: 3,
  followUpSpacingDays: [1, 3, 7],
  rewriteLimit: 50,
  rewriteMin: 20,
};

const AREAS: WritingArea[] = ["grammar", "prepositions", "sentence_structure", "vocabulary", "coherence", "concision"];
const TRAITS: RubricTrait[] = ["ideas", "organization", "voice", "word_choice", "sentence_fluency", "conventions"];

export interface IndexedProfile {
  profile: CompetencyProfile;
  /** "id@version", recorded with every submission. */
  key: string;
  byCapability: Map<CapabilityId, CompetencyRef>;
}

/** Problems with a profile: unknown capabilities, unknown areas or traits, a wrong "specified" flag, duplicates. */
export function validateCompetencyProfile(profile: CompetencyProfile, index: FrameworkIndex): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  if (profile.subject !== "english_writing") problems.push(`subject must be english_writing, not ${profile.subject}`);
  for (const c of profile.competencies) {
    if (seen.has(c.capability)) problems.push(`${c.capability} is listed twice`);
    seen.add(c.capability);
    const leaf = index.leaves.get(c.capability);
    if (!leaf) {
      problems.push(`${c.capability} is not a capability in framework ${index.framework.version}`);
      continue;
    }
    if (!AREAS.includes(c.area)) problems.push(`${c.capability}: unknown area ${c.area}`);
    if (!TRAITS.includes(c.trait)) problems.push(`${c.capability}: unknown rubric trait ${c.trait}`);
    if (c.specified !== isSpecified(leaf)) problems.push(`${c.capability}: specified is ${c.specified}, but the framework says ${isSpecified(leaf)}`);
    if (c.grade !== profile.grade) problems.push(`${c.capability}: grade ${c.grade} differs from the profile's grade ${profile.grade}`);
    if (c.curriculum.some((r) => r.validated !== false)) problems.push(`${c.capability}: a curriculum mapping claims to be validated; none is yet`);
  }
  return problems;
}

export function indexCompetencyProfile(profile: CompetencyProfile, index: FrameworkIndex): IndexedProfile {
  const problems = validateCompetencyProfile(profile, index);
  if (problems.length) throw new Error(`competency profile ${profile.id}: ${problems.join("; ")}`);
  return { profile, key: `${profile.id}@${profile.version}`, byCapability: new Map(profile.competencies.map((c) => [c.capability, c])) };
}

/** Everything the essay functions need besides the learner's events. */
/** The pilot manifest's pools. */
export type ItemPool = "diagnosis" | "practice" | "confirmation" | "retention";

export interface EssayContext {
  ctx: Context;
  profile: IndexedProfile;
  /** Lesson ids the app can show, by capability (content/english/web/lessons.json). Missing: no lesson. */
  lessons: Map<CapabilityId, string[]>;
  /** The text the app shows when teaching each capability (lesson rules, examples and checks), to find answer leakage. */
  teachingText?: Map<CapabilityId, string[]>;
  /**
   * Existing item-role metadata (content/english/pilot/manifest.json, pilot-content@2): a question reserved for one
   * use (diagnosis, practice, confirmation or retention) is never taken for another (allocation.ts).
   */
  pools?: Map<string, ItemPool>;
  policy: EssayPolicy;
  /** Which evidence may establish verified mastery (absent: the pilot policy, reviewed questions only). */
  verification?: VerificationPolicy;
}

/**
 * verification-eligibility@1 (18 October 2026). Which answers may establish VERIFIED mastery:
 *   reviewed  the pilot policy (default): the target-level demonstration and the delayed check must hold when only
 *             answers on educator-reviewed questions (evidence_status "validated") are counted. Answers on unreviewed
 *             bank questions still count for the estimate and for "shown", exactly as before, but cannot verify.
 *   counted   developer testing: every answer the engine counts may verify, and the claim says it was verified on
 *             unreviewed questions. Never used for a pilot build.
 * Nothing is rewritten: both are read from the same ledger with the same engine; only the claim differs.
 */
export interface VerificationPolicy {
  version: "verification-eligibility@1";
  eligibility: "reviewed" | "counted";
}
export const PILOT_VERIFICATION: VerificationPolicy = { version: "verification-eligibility@1", eligibility: "reviewed" };
export const DEVELOPER_VERIFICATION: VerificationPolicy = { version: "verification-eligibility@1", eligibility: "counted" };

const reviewedLedgers = new WeakMap<object, Map<string, Ledger>>();
/** The engine's view counting only answers on educator-reviewed questions (the same ledger rules on fewer events). */
export function reviewedOnlyView(ectx: EssayContext, events: readonly LedgerEvent[], capability: CapabilityId, now: string): LeafView {
  let byLearner = reviewedLedgers.get(events);
  if (!byLearner) reviewedLedgers.set(events, (byLearner = new Map()));
  const learner = (events.find((e) => e.kind === "essay" && e.record.type === "submission") as { record?: { submission?: { learner: string } } } | undefined)?.record?.submission?.learner ?? "learner";
  // keyed by the record's length and last event, so a record that grew is rebuilt
  const key = `${learner}#${events.length}#${events.at(-1)?.id ?? ""}#${ectx.ctx.content.items.size}`;
  let L = byLearner.get(key);
  if (!L) {
    const reviewed = events.filter((e) => {
      if (e.kind !== "evidence") return true;
      const it = itemVersion(ectx.ctx.content, e.item.id, e.item.version);
      return it?.kind === "code" && it.evidence_status === "validated";
    });
    L = Ledger.rebuild(ectx.ctx, learner, reviewed as LedgerEvent[]);
    byLearner.set(key, L);
  }
  return leafView(L.composite, ectx.ctx.index, capability, now);
}

/**
 * What the engine supports for a competency, measured against the profile's target band. "demonstrated" and
 * "verified" are the engine's own verification statuses, counted here only when the level the evidence
 * currently supports reaches the grade target: shown at band 3 is not shown for a Grade 8 target of band 5.
 */
export interface EngineClaim {
  level: "none" | "demonstrated" | "verified";
  currentLevel: number | null;
  target: number | null;
  status: VerificationStatus;
  note: string | null;
  /** verification@2: the band a delayed check at that band verified (null: none). */
  verifiedLevel: number | null;
  /** For "verified": whether it holds on reviewed questions alone, or only with unreviewed ones (developer policy). */
  verifiedOn: "reviewed" | "unreviewed" | null;
  /** Verified on all counted evidence, but the policy (reviewed only) does not allow it: reported as shown instead. */
  verificationWithheld: boolean;
}

export function engineClaim(ectx: EssayContext, capability: CapabilityId, v: LeafView, events?: readonly LedgerEvent[], now?: string): EngineClaim {
  const target = ectx.profile.byCapability.get(capability)?.expectedBand ?? null;
  const status = v.verification.status;
  const current = v.verification.currentLevel;
  const verifiedLevel = v.verification.verifiedLevel ?? null;
  const base = { currentLevel: current, target, status, verifiedLevel, verifiedOn: null, verificationWithheld: false } as const;
  const shown = status === "verified" || status === "demonstrated";
  if (!shown) return { ...base, level: "none", note: null };
  if (target === null) return { ...base, level: "none", note: "no grade target is set for this competency, so no claim is made" };
  if (current === null || current < target)
    return { ...base, level: "none", note: `the engine records ${status} at band ${current ?? "?"}, below the draft Grade ${ectx.profile.profile.grade} target of band ${target}` };
  // verification@2: verified only when a delayed check AT the target verified it (not a lower band kept)
  if (verifiedLevel === null || verifiedLevel < target)
    return { ...base, level: "demonstrated", note: verifiedLevel === null ? null : `band ${verifiedLevel} is verified; band ${target} is shown, and its own delayed check is still to come` };
  const policy = ectx.verification ?? PILOT_VERIFICATION;
  const rv = events && now ? reviewedOnlyView(ectx, events, capability, now) : null;
  const onReviewed = !!rv && (rv.verification.verifiedLevel ?? -Infinity) >= target && (rv.verification.currentLevel ?? -Infinity) >= target;
  if (onReviewed) return { ...base, level: "verified", verifiedOn: "reviewed", note: null };
  if (policy.eligibility === "counted") return { ...base, level: "verified", verifiedOn: "unreviewed", note: "verified on questions not yet reviewed by an educator: a developer test result, not valid for the pilot" };
  return { ...base, level: "demonstrated", verificationWithheld: true, note: "the delayed check was passed, but on questions not yet reviewed by an educator: under the pilot policy this is not verified mastery" };
}

export const allowedTags =(ectx: EssayContext, capability: CapabilityId): Set<string> => misconceptionIds(ectx.ctx.index, capability);

/**
 * Retention due (planner policy @3): the competency was shown at the grade target, and the engine's own delayed check
 * is now due (verification "overdue"). The engine withdraws the current claim until that check is taken; this is a
 * retention question, not evidence of a gap, so planners check before re-teaching. A failed check is not "due".
 */
export function retentionDue(ectx: EssayContext, capability: CapabilityId, v: LeafView): boolean {
  const target = ectx.profile.byCapability.get(capability)?.expectedBand ?? null;
  if (target === null || v.verification.status !== "overdue") return false;
  return (v.retention.level ?? -Infinity) >= target || (v.verification.historicalLevel ?? -Infinity) >= target;
}
