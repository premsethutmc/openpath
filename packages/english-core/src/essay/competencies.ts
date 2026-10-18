/**
 * The competency profile an essay is analysed against, checked against the framework, and the draft policy.
 */
import { isSpecified, misconceptionIds, type FrameworkIndex } from "../framework.ts";
import type { CapabilityId } from "../types.ts";
import type { Context } from "../updater.ts";
import { leafView, type LeafView, type VerificationStatus } from "../composite.ts";
import type { Composite } from "../types.ts";
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
}

export function engineClaim(ectx: EssayContext, capability: CapabilityId, v: LeafView): EngineClaim {
  const target = ectx.profile.byCapability.get(capability)?.expectedBand ?? null;
  // retention timing (policy @4): with a target-anchored view, the schedule and "verified" start from the first
  // demonstration AT the target; an earlier demonstration at a lower level is history and decides nothing here
  const t = target !== null && v.atTarget?.band === target ? v.atTarget : null;
  if (t && target !== null && t.verification.status !== "not_demonstrated") {
    const status = t.verification.status;
    const current = t.verification.currentLevel;
    if (status === "overdue" || status === "failed")
      return { level: "none", currentLevel: null, target, status, note: `shown at the band ${target} target on ${t.retention.firstDemonstratedAt?.slice(0, 10)}, but ${status === "overdue" ? "its delayed check is due and not yet taken" : "the latest delayed check did not show it was kept"}` };
    if (current !== null && current >= target) return { level: status === "verified" ? "verified" : "demonstrated", currentLevel: current, target, status, note: null };
    return { level: "none", currentLevel: current, target, status, note: `shown at the band ${target} target before, but the evidence now supports band ${current ?? "?"}` };
  }
  const status = v.verification.status;
  const current = v.verification.currentLevel;
  const raw: EngineClaim["level"] = status === "verified" ? "verified" : status === "demonstrated" ? "demonstrated" : "none";
  if (raw === "none") return { level: "none", currentLevel: current, target, status, note: null };
  if (target === null) return { level: "none", currentLevel: current, target, status, note: "no grade target is set for this competency, so no claim is made" };
  if (current === null || current < target)
    return { level: "none", currentLevel: current, target, status, note: `the engine records ${status} at band ${current ?? "?"}, below the draft Grade ${ectx.profile.profile.grade} target of band ${target}` };
  // (only without a target-anchored view: a caller that used plain leafView)
  return { level: raw, currentLevel: current, target, status, note: null };
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
 * Retention due (planner policy @3, timing @4): the competency was shown at the grade target, and the delayed check
 * on the target-anchored schedule is now due (verification "overdue"). The current claim is withdrawn until that check
 * is taken; this is a retention question, not evidence of a gap, so planners check before re-teaching. A failed check
 * is not "due". Without a target-anchored view, the engine's own schedule is used (as in policy @3).
 */
export function retentionDue(ectx: EssayContext, capability: CapabilityId, v: LeafView): boolean {
  const target = targetBand(ectx, capability);
  if (target === null) return false;
  if (v.atTarget?.band === target) return v.atTarget.verification.status === "overdue";
  if (v.verification.status !== "overdue") return false;
  return (v.retention.level ?? -Infinity) >= target || (v.verification.historicalLevel ?? -Infinity) >= target;
}

/** The target-anchored retention status: not shown at the target, current, overdue (due) or failed. */
export function targetRetention(ectx: EssayContext, capability: CapabilityId, v: LeafView): { shownAt: string | null; status: VerificationStatus; dueAt: string | null } {
  const target = targetBand(ectx, capability);
  const t = target !== null && v.atTarget?.band === target ? v.atTarget : null;
  if (!t) return { shownAt: null, status: "not_demonstrated", dueAt: null };
  return { shownAt: t.retention.firstDemonstratedAt, status: t.verification.status, dueAt: t.retention.dueAt };
}
