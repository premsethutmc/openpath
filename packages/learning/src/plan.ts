/**
 * The learner's year and next activity (plan@1).
 *
 * Priority for "what next": 1. a delayed check that is due (for any skill with records, from any year), 2. a skill that needs review, 3. a skill in progress
 * (an open intervention), 4. the first not-yet-shown skill of the current chapter, 5. the next chapter, 6. enrichment
 * from a goal overlay (only once the year's skills it rests on are shown). Nothing outside the current curriculum.
 */
import { hypotheses } from "./hypotheses";
import { assigned, type CurriculumRelease } from "./curriculum";
import { moduleFor } from "./content";
import type { SkillEvidence } from "./evidence";
import { overlay } from "./goals";
import { moduleState, type ModuleState } from "./intervention";
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
  /** A supported lesson may be reviewed without claiming readiness or mastery. */
  reviewCompetency?: string;
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

type PlanContext = { now: number; session: string; module?: (id: string) => ModuleState };
export function nextActivity(release: CurriculumRelease, ev: (id: string) => SkillEvidence, records: LearnerRecords, at?: PlanContext): NextActivity {
  if (records.pathway?.active) return pathwayNextActivity(records, ev, at);
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
function nextActivityOf(release: CurriculumRelease, ev: (id: string) => SkillEvidence, records: LearnerRecords, at?: PlanContext): NextActivity {
  const paused = new Set(at ? pausedSkills(release, ev, records, at) : []);
  const rows = assigned(release).filter((r) => moduleFor(r.competency));
  const ids = [...new Set(rows.map((r) => r.competency))];
  // a delayed check comes back whatever year the skill was shown in (records persist across grades)
  const touched = [...new Set(records.attempts.map((a) => graph.evidenceTarget(a.competency)))].filter((id) => moduleFor(id));
  const due = [...ids, ...touched.filter((id) => !ids.includes(id))].find((id) => ev(id).retention === "due");
  if (due) return { kind: "retention", competency: due, reason: "A delayed check is due: a few questions to see the skill has stayed with you." };
  const review = ids.find((id) => ev(id).status === "review" && !paused.has(id));
  if (review) return { kind: "review", competency: review, reason: "The delayed check was missed, so this skill comes back for review." };
  // learner-hypothesis@1: an established misunderstanding not yet taught survives into the plan, whatever the skill's
  // broader status says (a skill can read as shown while a narrower misunderstanding in it is still supported)
  const untaught = hypotheses(records).find((h) => h.status === "established" && !h.teaching.deliveredAt && ids.includes(h.scope.observedIn) && !paused.has(h.scope.observedIn));
  if (untaught) return { kind: "continue", competency: untaught.scope.observedIn, chapter: rows.find((r) => r.competency === untaught.scope.observedIn)?.chapter.title, reason: `${untaught.claim!.says} A short explanation is waiting.` };
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


/** The same next-activity planner, with an explicit supported destination instead of a grade ceiling. */
function pathwayNextActivity(records: LearnerRecords, ev: (id: string) => SkillEvidence, at?: PlanContext): NextActivity {
  const target = records.pathway!.target;
  const stop = (reason: string, reviewCompetency?: string): NextActivity => ({ kind: "none", competency: null, reason: `${reason} Your progress is saved. Choose another supported goal or review a lesson; no mastery is claimed.`, ...(reviewCompetency ? { reviewCompetency } : {}) });
  if (!graph.byId.has(target) || !moduleFor(target)) return stop("This target does not yet have a supported learning module.");
  const route = records.readinessRoute ? { ids: records.readinessRoute, error: false } : pathwayRoute(target);
  if (route.error) return stop("This prerequisite route needs review before it can guide learning.", target);
  const unresolved = new Set(hypotheses(records).filter((h) => h.status === "established").flatMap((h) => [h.scope.observedIn, ...(h.scope.about ? [h.scope.about] : [])]));
  // The shared route is already in prerequisite order and cycle-checked. No second graph walk.
  for (const id of route.ids) {
    const e = ev(id), m = moduleFor(id);
    const ms = m ? at?.module?.(id) ?? moduleState(id, records, e, at?.now ?? 0, at?.session ?? "", null, ev) : null;
    const shown = ["independent", "transfer", "verified"].includes(e.status) && !e.recoveryRequired && e.retention !== "due" && !unresolved.has(id);
    if (shown && ms?.requirementsMet !== false) continue;
    if (!m) return stop(`A prerequisite, ${graph.get(id).name}, has no supported module yet.`, target);
    if (!ms || ["pause", "unavailable", "waiting", "done"].includes(ms.phase)) return stop(ms?.reason ?? "No safe learning opportunity is available.", id);
    const kind = e.retention === "due" ? "retention" : e.recoveryRequired || e.status === "review" ? "review" : e.status === "not_started" ? "start" : "continue";
    return { kind, competency: id, reason: `${id === target ? "Toward your chosen goal" : `A prerequisite for ${graph.get(target).name}`}: ${e.status === "not_started" ? "a short probe will find your starting point" : ms.reason}. Unobserved work is not treated as a weakness.` };
  }
  return { kind: "none", competency: null, reason: "The current evidence requirements on this route are shown. Delayed checks remain scheduled. Choose a further supported goal when you are ready." };
}

/** Shared route eligibility for planning and question placement. Never read from client events. */
export function pathwayRoute(target: string): { ids: string[]; error: boolean } {
  const ids: string[] = [], active = new Set<string>(), seen = new Set<string>();
  let error = !graph.byId.has(target) || !moduleFor(target);
  const visit = (id: string) => {
    if (error || seen.has(id)) return;
    if (active.has(id) || active.size > 40 || seen.size > 256 || !graph.byId.has(id)) { error = true; return; }
    active.add(id);
    for (const r of graph.relationsOf(id).filter((r) => r.type === "mandatory" || r.type === "plausible").sort((a,b)=>a.from.localeCompare(b.from))) visit(r.from);
    active.delete(id); seen.add(id); ids.push(id);
  };
  if (!error) visit(target);
  return { ids: error ? [] : ids, error };
}
