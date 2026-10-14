/**
 * The Learning Journey: the pilot's skills as a path, each through the same four stages the engine keeps apart —
 * a first check, a lesson with practice, a fresh check on its own, and a later check. Every stage's state is read
 * from the learner profile (the engine's evidence and verification); nothing here is estimated or scored. The only
 * action offered is one the app can deliver: Today's activity for that skill, or a first check on a skill not yet
 * checked.
 */
import type { CapabilityProfile, LearnerProfile } from "./profile.ts";
import { areaWord } from "./profile.ts";
import type { PlanStep } from "./plan.ts";
import type { LearnerGoal } from "./events.ts";

export type StageState = "done" | "now" | "later" | "not_needed" | "due" | "not_kept";

export interface PathStage {
  key: "first_check" | "lesson" | "fresh_check" | "later_check";
  label: string;
  state: StageState;
}

export interface PathSkill {
  id: string;
  name: string;
  area: string;
  standing: CapabilityProfile["standing"];
  stages: PathStage[];
  /** In plain words: where this skill is now. */
  line: string;
  /** Something the app can start now for this skill, if any. */
  start: { step: PlanStep; label: string } | null;
  /** What the plan would do next, when it is not on Today's list. */
  later: string | null;
}

const GOAL_AREAS: Record<LearnerGoal, string[]> = {
  spelling: ["Spelling"],
  grammar: ["Grammar"],
  reading: ["Reading"],
  confidence: ["Grammar", "Spelling", "Reading"],
};

const LINES: Record<CapabilityProfile["standing"], string> = {
  not_checked: "Not checked yet. Nothing is known about it, and that is not a weakness.",
  uncertain: "A few answers so far: not enough to say yet.",
  developing: "Measured, not yet shown on your own.",
  found_hard: "Found hard so far. A lesson comes next.",
  improving: "Improving in practice after a lesson. A fresh check on your own comes next.",
  shown: "Shown on your own, on fresh questions. A later check will see if it has stuck.",
  confirmed: "Shown, and still right at a later check.",
  check_due: "Shown before. A later check is due now.",
  not_kept: "Not right at the later check. A refresher comes first.",
};

const SHOWN = new Set(["shown", "confirmed", "check_due", "not_kept"]);

/** The four stages of one skill, from its standing and its evidence by kind. */
export function stagesOf(cap: CapabilityProfile, taught: boolean): PathStage[] {
  const e = cap.evidence;
  // the first check is done once there is enough to say something (not while it is still "a few answers")
  const checked = cap.standing !== "not_checked" && cap.standing !== "uncertain";
  const shown = SHOWN.has(cap.standing);
  const lessonDone = taught || e.afterTeaching > 0;
  const stage = (key: PathStage["key"], label: string, state: StageState): PathStage => ({ key, label, state });
  const first = stage("first_check", "First check", checked ? "done" : "now");
  // shown without teaching: the lesson was not needed
  const lesson = stage("lesson", "Lesson and practice", lessonDone ? "done" : shown ? "not_needed" : checked ? "now" : "later");
  const fresh = stage("fresh_check", "Fresh check on your own", shown ? "done" : lessonDone ? "now" : "later");
  const laterState: StageState = cap.standing === "confirmed" ? "done" : cap.standing === "check_due" ? "due" : cap.standing === "not_kept" ? "not_kept" : shown ? "now" : "later";
  const later = stage("later_check", "Later check", laterState);
  // only one stage is "now": the first that is not finished
  let seen = false;
  for (const s of [first, lesson, fresh, later]) {
    if (s.state === "now" && seen) s.state = "later";
    if (s.state === "now" || s.state === "due" || s.state === "not_kept") seen = true;
  }
  return [first, lesson, fresh, later];
}

/**
 * The pilot skills in path order: the learner's goal area first (their choice; it never changes the plan), then
 * framework order.
 */
export function learningPath(profile: LearnerProfile, pilot: string[], lessonsRead: Set<string>, goal: LearnerGoal | null, startedPlacement: boolean): PathSkill[] {
  const wanted = goal ? GOAL_AREAS[goal] : [];
  const caps = pilot.map((id) => profile.capabilities.find((x) => x.id === id)).filter((x): x is CapabilityProfile => !!x);
  const ordered = [...caps].sort((a, b) => Number(!wanted.includes(areaWord(a.id))) - Number(!wanted.includes(areaWord(b.id))) || a.order - b.order);
  return ordered.map((cap) => {
    const today = profile.activities.find((a) => a.step.capability === cap.id);
    const taught = [...lessonsRead].some((l) => l.split("#")[0] === cap.id);
    let start: PathSkill["start"] = today ? { step: today.step, label: today.label } : null;
    if (!start && startedPlacement && cap.standing === "not_checked" && cap.content.assess > 0)
      start = { step: { type: "check", title: `${areaWord(cap.id)}: ${cap.name}`, reason: "A first look at a new skill.", capability: cap.id, purpose: "assess" }, label: "Try a new skill" };
    return {
      id: cap.id,
      name: cap.name,
      area: areaWord(cap.id),
      standing: cap.standing,
      stages: stagesOf(cap, taught),
      line: LINES[cap.standing],
      start,
      later: !start && cap.next ? `${cap.next.what}. ${cap.next.content.available ? "It comes up on Today when it is most useful." : cap.next.content.note + "."}` : null,
    };
  });
}
