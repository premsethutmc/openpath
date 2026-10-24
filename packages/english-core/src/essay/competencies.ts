/**
 * The competency profile an essay is analysed against, checked against the framework, and the draft policy.
 */
import { isSpecified, misconceptionIds, type FrameworkIndex } from "../framework.ts";
import type { CapabilityId, Composite, LedgerEvent } from "../types.ts";
import type { Context } from "../updater.ts";
import { type LeafView, leafView, type VerificationStatus } from "../composite.ts";
import { PILOT_VERIFICATION, verificationClaim, type VerificationPolicy } from "../verification.ts";
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
  /** Which evidence may establish verified mastery (absent: the pilot policy: reviewed, released questions answered after their release). */
  verification?: VerificationPolicy;
}

// verification-eligibility (H-V1/H-V3): one definition for every surface, in ../verification.ts
export { DEVELOPER_VERIFICATION, PILOT_VERIFICATION, type VerificationPolicy } from "../verification.ts";

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
  // ONE retention clock (integration): with a target-anchored view (essayView), the schedule, the delayed check and
  // verification@2 are read from the run anchored at the first demonstration AT the target; an earlier, lower
  // demonstration is history and decides nothing here. A plain leafView (no target) is read as before.
  const t = target !== null && v.atTarget?.band === target ? v.atTarget : null;
  const ver = t && t.verification.status !== "not_demonstrated" ? t.verification : v.verification;
  const status = ver.status;
  const current = ver.currentLevel;
  const verifiedLevel = ver.verifiedLevel ?? null;
  const base = { currentLevel: current, target, status, verifiedLevel, verifiedOn: null, verificationWithheld: false } as const;
  if (t && t.verification.status !== "not_demonstrated" && (status === "overdue" || status === "failed"))
    return { ...base, currentLevel: null, level: "none", note: `shown at the band ${target} target on ${t.retention.firstDemonstratedAt?.slice(0, 10)}, but ${status === "overdue" ? "its delayed check is due and not yet taken" : "the latest delayed check did not show it was kept"}` };
  const shown = status === "verified" || status === "demonstrated";
  if (!shown) return { ...base, level: "none", note: null };
  if (target === null) return { ...base, level: "none", note: "no grade target is set for this competency, so no claim is made" };
  if (current === null || current < target)
    return { ...base, level: "none", note: `the engine records ${status} at band ${current ?? "?"}, below the draft Grade ${ectx.profile.profile.grade} target of band ${target}` };
  // verification@2: verified only when a delayed check AT the target verified it (not a lower band kept)
  if (verifiedLevel === null || verifiedLevel < target)
    return { ...base, level: "demonstrated", note: verifiedLevel === null ? null : `band ${verifiedLevel} is verified; band ${target} is shown, and its own delayed check is still to come` };
  const policy = ectx.verification ?? PILOT_VERIFICATION;
  if (!events || !now) {
    // no record to show which answers were eligible: the developer policy counts every answer; the pilot never assumes
    if (policy.eligibility === "counted") return { ...base, level: "verified", verifiedOn: "unreviewed", note: "verified on questions not yet reviewed by an educator: a developer test result, not valid for the pilot" };
    return { ...base, level: "demonstrated", verificationWithheld: true, note: "the delayed check was passed, but it cannot be shown to be on questions reviewed by an educator and released: under the pilot policy this is not verified mastery (not yet reviewed by an educator)" };
  }
  const learner = (events.find((e) => e.kind === "essay" && e.record.type === "submission") as { record?: { submission?: { learner: string } } } | undefined)?.record?.submission?.learner ?? "learner";
  const vc = verificationClaim(ectx.ctx, learner, events, capability, now, policy, v);
  if (vc.level !== null && vc.level >= target) {
    if (vc.on === "reviewed") return { ...base, level: "verified", verifiedOn: "reviewed", note: null };
    return { ...base, level: "verified", verifiedOn: "unreviewed", note: "verified on questions not yet reviewed by an educator: a developer test result, not valid for the pilot" };
  }
  return { ...base, level: "demonstrated", verificationWithheld: true, note: "the delayed check was passed, but not on enough answers to questions reviewed by an educator and given after their release: under the pilot policy this is not verified mastery (not yet reviewed by an educator, or answered before release)" };
}

/** The competency's grade target band, or null. */
export const targetBand = (ectx: EssayContext, capability: CapabilityId): number | null => ectx.profile.byCapability.get(capability)?.expectedBand ?? null;

/**
 * The engine's view for the essay layer: leafView with the retention schedule also anchored to the grade target
 * (`atTarget`, policy @4). Every essay planner and outcome reads proficiency through this.
 */
export function essayView(ectx: EssayContext, composite: Composite, capability: CapabilityId, now: string): LeafView {
  return leafView(composite, ectx.ctx.index, capability, now, { target: targetBand(ectx, capability) });
}

export const allowedTags =(ectx: EssayContext, capability: CapabilityId): Set<string> => misconceptionIds(ectx.ctx.index, capability);

/**
 * Retention due (planner policy @3; one clock since the integration): the competency was shown at the grade target and
 * the delayed check on the target-anchored schedule is due (verification "overdue"). The claim is withdrawn until
 * that check is taken; this is a retention question, not evidence of a gap, so planners check before re-teaching. A
 * failed check is not "due".
 *
 * verification@2 (#53) used a second, essay-side clock here (`shownAt` + the delay, "waiting" while the engine's
 * any-band schedule was already overdue). The target-anchored schedule makes that case impossible: it cannot fall due
 * before the delay after the target was first shown, so the second clock is gone. `shownAt`/`now` are accepted for
 * compatibility and ignored. Without a target-anchored view, the engine's own schedule is read (as in policy @3).
 */
export function retentionTiming(ectx: EssayContext, capability: CapabilityId, v: LeafView, shownAt?: string | null, now?: string): "due" | "waiting" | null {
  const target = targetBand(ectx, capability);
  if (target === null) return null;
  if (v.atTarget?.band === target) return v.atTarget.verification.status === "overdue" ? "due" : null;
  // a plain leafView: the engine's own schedule, read as in policy @3 (no second date computed here)
  void shownAt;
  void now;
  if (v.verification.status !== "overdue") return null;
  return (v.retention.level ?? -Infinity) >= target || (v.verification.historicalLevel ?? -Infinity) >= target ? "due" : null;
}
export function retentionDue(ectx: EssayContext, capability: CapabilityId, v: LeafView, shownAt?: string | null, now?: string): boolean {
  return retentionTiming(ectx, capability, v, shownAt, now) === "due";
}

/** The target-anchored retention status: not shown at the target, current, overdue (due) or failed. */
export function targetRetention(ectx: EssayContext, capability: CapabilityId, v: LeafView): { shownAt: string | null; status: VerificationStatus; dueAt: string | null } {
  const target = targetBand(ectx, capability);
  const t = target !== null && v.atTarget?.band === target ? v.atTarget : null;
  if (!t) return { shownAt: null, status: "not_demonstrated", dueAt: null };
  return { shownAt: t.retention.firstDemonstratedAt, status: t.verification.status, dueAt: t.retention.dueAt };
}
