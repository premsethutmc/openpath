/**
 * The learner's year and next activity (plan@1).
 *
 * Priority for "what next": 1. a delayed check that is due (for any skill with records, from any year), 2. a skill that needs review, 3. a skill in progress
 * (an open intervention), 4. the first not-yet-shown skill of the current chapter, 5. the next chapter, 6. enrichment
 * from a goal overlay (only once the year's skills it rests on are shown). Nothing outside the current curriculum.
 */
import { assigned, type CurriculumRelease } from "./curriculum";
import { moduleFor } from "./content";
import type { SkillEvidence } from "./evidence";
import { overlay } from "./goals";
import { moduleState } from "./intervention";
import { graph } from "./graph";
import { currentEnrolment, type LearnerRecords } from "./records";
import { flatten, tilesFor, type Tile } from "./tiles";

export const PLAN_POLICY = "plan@1";
export interface NextActivity {
  kind: "retention" | "review" | "continue" | "start" | "challenge" | "none";
  competency: string | null;
  question?: string;
  chapter?: string;
  reason: string;
  /** Skills the engine has paused for a teacher or parent (never offered as "carry on" while paused). */
  paused?: string[];
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

export function nextActivity(release: CurriculumRelease, ev: (id: string) => SkillEvidence, records: LearnerRecords, at?: { now: number; session: string }): NextActivity {
  const n = nextActivityOf(release, ev, records, at);
  return at ? { ...n, paused: pausedSkills(release, ev, records, at) } : n;
}
/** pause@1: a skill whose module has stopped for a person (every checked explanation tried, or the planner recommends a
 *  person). It stays paused for as long as the engine says so from the records; it lifts only when the records change what the
 *  engine decides (new evidence on the skill, e.g. after the supporting skill is worked on), never by asking again. */
function pausedSkills(release: CurriculumRelease, ev: (id: string) => SkillEvidence, records: LearnerRecords, at: { now: number; session: string }) {
  const touched = [...new Set(records.attempts.map((a) => graph.evidenceTarget(a.competency)))].filter((id) => moduleFor(id));
  return touched.filter((id) => moduleState(id, records, ev(id), at.now, at.session, null, ev).phase === "pause");
}
function nextActivityOf(release: CurriculumRelease, ev: (id: string) => SkillEvidence, records: LearnerRecords, at?: { now: number; session: string }): NextActivity {
  const paused = new Set(at ? pausedSkills(release, ev, records, at) : []);
  const rows = assigned(release).filter((r) => moduleFor(r.competency));
  const ids = [...new Set(rows.map((r) => r.competency))];
  // a delayed check comes back whatever year the skill was shown in (records persist across grades)
  const touched = [...new Set(records.attempts.map((a) => graph.evidenceTarget(a.competency)))].filter((id) => moduleFor(id));
  const due = [...ids, ...touched.filter((id) => !ids.includes(id))].find((id) => ev(id).retention === "due");
  if (due) return { kind: "retention", competency: due, reason: "A delayed check is due: a few questions to see the skill has stayed with you." };
  const review = ids.find((id) => ev(id).status === "review" && !paused.has(id));
  if (review) return { kind: "review", competency: review, reason: "The delayed check was missed, so this skill comes back for review." };
  const inProgress = ids.find((id) => ["exposure", "guided"].includes(ev(id).status) && !paused.has(id));
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

/**
 * Why the next activity is different from what it was at the end of the learner's previous visit (plan@1 is derived
 * from the records alone, so the same records always give the same plan; this explains a change).
 */
export function planChange(before: NextActivity | null, now: NextActivity, evBefore: (id: string) => SkillEvidence, evNow: (id: string) => SkillEvidence, name: (id: string) => string): string | null {
  if (!before || (before.kind === now.kind && before.competency === now.competency && before.question === now.question)) return null;
  const was = before.competency;
  if (now.kind === "retention") return `A week has passed since you showed ${name(now.competency!)} on your own, so its delayed check comes first.`;
  if (now.kind === "review") return `The delayed check of ${name(now.competency!)} was missed, so it comes back for review.`;
  if (was && was !== now.competency) {
    const b = evBefore(was).status;
    const n = evNow(was).status;
    if (n === "verified" && b !== "verified") return `${name(was)} is now verified, so the plan moves on.`;
    if ((n === "independent" || n === "transfer") && !["independent", "transfer", "verified"].includes(b)) return `${name(was)} is now shown on your own, so the plan moves on to ${now.competency ? name(now.competency) : "what is next"}.`;
    if (before.kind === "retention" && evNow(was).retention === "passed") return `The delayed check of ${name(was)} was passed, so the plan moves on.`;
  }
  if (now.competency && (now.kind === "continue" || now.kind === "start") && ["independent", "transfer", "verified"].includes(evBefore(now.competency).status)) return `${name(now.competency)} comes back: two of your last three answers on it were not right.`;
  if (now.kind === "challenge") return "Every skill of this year with questions is shown: an enrichment challenge is next.";
  return `The plan changed: ${now.reason}`;
}

/** The learner's years, from enrolment records (a grade transition keeps every earlier record). */
export function years(records: LearnerRecords) {
  return records.enrolments.map((e, i) => ({ ...e, current: i === records.enrolments.length - 1 }));
}
