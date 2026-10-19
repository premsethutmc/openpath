/**
 * The learner's year and next activity (plan@1).
 *
 * Priority for "what next": 1. a delayed check that is due, 2. a skill that needs review, 3. a skill in progress
 * (an open intervention), 4. the first not-yet-shown skill of the current chapter, 5. the next chapter, 6. enrichment
 * from a goal overlay (only once the year's skills it rests on are shown). Nothing outside the current curriculum.
 */
import { assigned, type CurriculumRelease } from "./curriculum";
import { moduleFor } from "./content";
import type { SkillEvidence } from "./evidence";
import { overlay } from "./goals";
import { currentEnrolment, type LearnerRecords } from "./records";
import { flatten, tilesFor, type Tile } from "./tiles";

export const PLAN_POLICY = "plan@1";
export interface NextActivity {
  kind: "retention" | "review" | "continue" | "start" | "challenge" | "none";
  competency: string | null;
  question?: string;
  chapter?: string;
  reason: string;
}

export function yearSummary(release: CurriculumRelease, ev: (id: string) => SkillEvidence) {
  const tiles = tilesFor(release, ev);
  const skills = flatten(tiles).filter((t) => t.kind === "skill" && t.assessable);
  const count = (s: Tile["status"]) => skills.filter((t) => t.status === s).length;
  return {
    tiles,
    total: skills.length,
    verified: count("verified"),
    shown: count("shown"),
    developing: count("active"),
    notStarted: count("not_started"),
    review: skills.filter((t) => t.review).length,
    /** Year progress: skills shown on your own or verified, of the assessable skills in this year's curriculum. */
    progress: skills.length ? (count("verified") + count("shown")) / skills.length : 0,
  };
}

export function nextActivity(release: CurriculumRelease, ev: (id: string) => SkillEvidence, records: LearnerRecords): NextActivity {
  const rows = assigned(release).filter((r) => moduleFor(r.competency));
  const ids = [...new Set(rows.map((r) => r.competency))];
  const due = ids.find((id) => ev(id).retention === "due");
  if (due) return { kind: "retention", competency: due, reason: "A delayed check is due: a few questions to see the skill has stayed with you." };
  const review = ids.find((id) => ev(id).status === "review");
  if (review) return { kind: "review", competency: review, reason: "The delayed check was missed, so this skill comes back for review." };
  const inProgress = ids.find((id) => ["exposure", "guided"].includes(ev(id).status));
  if (inProgress) return { kind: "continue", competency: inProgress, chapter: rows.find((r) => r.competency === inProgress)?.chapter.title, reason: "Carry on where you left off." };
  const fresh = rows.find((r) => ev(r.competency).status === "not_started");
  if (fresh) return { kind: "start", competency: fresh.competency, chapter: fresh.chapter.title, reason: `Next in ${fresh.chapter.title}.` };
  const enrol = currentEnrolment(records);
  for (const goalId of records.goals.keys()) {
    if (!enrol) continue;
    const o = overlay(goalId, enrol.grade, ids, ev);
    const c = o?.challenges.find((x) => x.ready && !records.attempts.some((a) => a.questionId === x.question));
    if (c) return { kind: "challenge", competency: c.competency, question: c.question, reason: `An enrichment challenge for your ${o!.goal.name} goal.` };
  }
  return { kind: "none", competency: null, reason: "Every skill with questions this year has been shown. Delayed checks will come back when due." };
}

/** The learner's years, from enrolment records (a grade transition keeps every earlier record). */
export function years(records: LearnerRecords) {
  return records.enrolments.map((e, i) => ({ ...e, current: i === records.enrolments.length - 1 }));
}
