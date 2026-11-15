/**
 * quick-review@1: on the maths Today strip, up to three skills the learner had shown that have probably faded since
 * (learner-vector@2 recall below REVIEW_AT), most faded first. Optional: a tap opens ordinary practice on fresh questions;
 * it never changes mastery, the delayed check or what "Next" is. Skills the caller cannot offer practice for (no fresh
 * question) and the skill already shown as "Next" are left out.
 */
import { learnerVector, reviewQueue } from "./learner-vector";
import type { LearnerRecords } from "./records";

export const QUICK_REVIEW = "quick-review@1";
export const QUICK_REVIEW_LIMIT = 3;

export interface QuickReviewItem { skill: string; recall: number; lastAnsweredAt: string }

export function quickReview(records: LearnerRecords, now: number, offerable: (skill: string) => boolean, exclude: (string | null | undefined)[] = []): QuickReviewItem[] {
  const skip = new Set(exclude.filter(Boolean));
  return reviewQueue(learnerVector(records, { now }))
    .filter((v) => !skip.has(v.skill) && offerable(v.skill))
    .slice(0, QUICK_REVIEW_LIMIT)
    .map((v) => ({ skill: v.skill, recall: v.recall, lastAnsweredAt: v.lastAnsweredAt! }));
}
