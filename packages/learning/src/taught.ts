/**
 * taught@1: for each skill, two marks for the parent page.
 *
 *  1. How well OpenPath taught it, against a fixed checklist (TAUGHT_CHECKLIST). "Fully taught" means every step on the
 *     checklist that applies to this skill was done. It is OpenPath's own checklist, not a teacher's review.
 *  2. How sure we are the child knows it, from the child's own answers without help (CONFIDENCE):
 *       sure            right on their own, and still right when checked again at least a week later
 *       getting_there   right on their own recently; not yet checked again later
 *       not_yet         mostly wrong on their own, or right only with help, or wrong when checked again later
 *       too_early       fewer than MIN_ANSWERS answers
 *     A level with its reason, never a percentage: the evidence is not that precise.
 *
 * A skill that is fully taught and still "not yet" is one for the parent to sit down with (sitDown). Nothing here changes what
 * the engine does; it reads the records and the engine's own evidence.
 */
import type { Attempt, LearnerRecords } from "./records";
import type { SkillEvidence } from "./evidence";
import { graph } from "./graph";
import { moduleFor, question } from "./content";
import { modulePhasePool } from "./library";
import { stepsHelp } from "./step-help";
import { TOGETHER } from "./intervention";

export const MIN_ANSWERS = 5;
export type Taught = "fully" | "partly" | "not_started";
export type Confidence = "sure" | "getting_there" | "not_yet" | "too_early";
export type CheckId = "shown" | "explanations" | "earlier" | "together" | "days";
export const TAUGHT_CHECKLIST: Record<CheckId, string> = {
  shown: "Shown how to do it",
  explanations: "Different explanations tried",
  earlier: "The skills it builds on checked",
  together: "Worked through together, step by step",
  days: "Practised on more than one day",
};
export const CONFIDENCE_WORDS: Record<Confidence, string> = { sure: "Sure", getting_there: "Getting there", not_yet: "Not yet", too_early: "Too early to say" };
export const TAUGHT_WORDS: Record<Taught, string> = { fully: "Fully taught", partly: "Partly taught", not_started: "Not started" };

export interface Check { id: CheckId; label: string; state: "done" | "to_come" | "not_needed" | "does_not_apply"; detail?: string }
export interface TaughtMark {
  competency: string;
  name: string;
  taught: Taught;
  checks: Check[];
  confidence: Confidence;
  /** the reason for the confidence, in plain words, from the counts */
  why: string;
  /** fully taught and still not yet: the parent's turn */
  sitDown: boolean;
  last: string;
}

const day = (iso: string) => iso.slice(0, 10);
const stepsCache = new Map<string, boolean>();
/** The skill has questions with typed steps (so a walk-through is possible). */
function hasSteps(competency: string): boolean {
  let v = stepsCache.get(competency);
  if (v === undefined) {
    const m = moduleFor(competency);
    let ids: string[] = [];
    try { ids = m?.pool ? modulePhasePool(m, "practice").slice(0, 60) : []; } catch { ids = []; }
    v = ids.some((id) => (stepsHelp(id)?.length ?? 0) >= 2);
    stepsCache.set(competency, v);
  }
  return v;
}

const own = (competency: string) => (a: Attempt) => {
  try { return graph.evidenceTarget(question(a.questionId).competency) === competency; } catch { return a.competency === competency; }
};

export function taughtMark(competency: string, records: Pick<LearnerRecords, "attempts" | "teaching">, ev: Pick<SkillEvidence, "status" | "verified" | "independent" | "assisted" | "recoveryRequired" | "retention">): TaughtMark {
  let name = competency;
  try { name = graph.get(competency).name; } catch { /* unknown id: shown as is */ }
  const mine = records.attempts.filter(own(competency));
  const taught = records.teaching.filter((t) => t.competency === competency || graph.evidenceTarget(t.competency) === competency);
  const last = [...mine.map((a) => a.at), ...taught.map((t) => t.at)].reduce((m, x) => (x > m ? x : m), "");

  // 2. confidence, from the engine's evidence
  const alone = ev.independent, helped = ev.assisted;
  const answers = alone.total + helped.total;
  const failedLater = ev.recoveryRequired || ev.retention === "failed";
  const confidence: Confidence = ev.verified && !failedLater ? "sure"
    : (ev.status === "independent" || ev.status === "transfer") && !failedLater ? "getting_there"
    : answers < MIN_ANSWERS && !failedLater ? "too_early"
    : "not_yet";
  const why = confidence === "sure" ? `Right on their own, and still right when checked again a week later.`
    : confidence === "getting_there" ? `Right on their own (${alone.right} of ${alone.total}). The check a week later is still to come.`
    : confidence === "too_early" ? `${answers} answer${answers === 1 ? "" : "s"} so far; about ${MIN_ANSWERS} are needed to say.`
    : failedLater ? "Was right on their own earlier, but wrong when checked again later."
    : alone.total === 0 ? `Answered only with help so far (${helped.right} of ${helped.total} right with help).`
    : `On their own: ${alone.right} right of ${alone.total}.${helped.total ? ` With help: ${helped.right} of ${helped.total}.` : ""}`;

  // 1. the teaching checklist. Once the child is sure or getting there, steps not yet reached were not needed.
  const learned = confidence === "sure" || confidence === "getting_there";
  const m = moduleFor(competency);
  const strategies = new Set(taught.map((t) => t.strategy));
  const available = m?.strategies.length ?? 0;
  const wantExplanations = Math.min(2, available);
  const earlier = graph.prerequisitesOf(competency);
  const earlierTried = earlier.filter((p) => records.attempts.some(own(p)));
  const together = mine.filter((a) => a.context === TOGETHER.context).length;
  const days = new Set(mine.map((a) => day(a.at))).size;
  const state = (done: boolean, applies = true): Check["state"] => (!applies ? "does_not_apply" : done ? "done" : learned ? "not_needed" : "to_come");
  const checks: Check[] = [
    { id: "shown", label: TAUGHT_CHECKLIST.shown, state: state(taught.length > 0 || mine.some((a) => a.activity === "guided")) },
    { id: "explanations", label: TAUGHT_CHECKLIST.explanations, state: state(strategies.size >= wantExplanations, wantExplanations > 1), detail: `${strategies.size} tried` },
    { id: "earlier", label: TAUGHT_CHECKLIST.earlier, state: state(earlierTried.length > 0, earlier.length > 0), detail: `${earlierTried.length} of ${earlier.length}` },
    { id: "together", label: TAUGHT_CHECKLIST.together, state: state(together > 0, together > 0 || hasSteps(competency)), detail: `${together}` },
    { id: "days", label: TAUGHT_CHECKLIST.days, state: state(days >= 2), detail: `${days}` },
  ];
  const started = mine.length > 0 || taught.length > 0;
  const status: Taught = !started ? "not_started" : checks.every((c) => c.state !== "to_come") ? "fully" : "partly";
  return { competency, name, taught: status, checks, confidence, why, sitDown: status === "fully" && confidence === "not_yet", last };
}

/** taught@1 for every skill the child has started, the ones to sit down with first, then the least sure, then the most recent. */
export function taughtMarks(records: Pick<LearnerRecords, "attempts" | "teaching">, evidence: (id: string) => Parameters<typeof taughtMark>[2]): TaughtMark[] {
  const ids = new Set<string>();
  for (const a of records.attempts) { try { ids.add(graph.evidenceTarget(question(a.questionId).competency)); } catch { /* retired question */ } }
  for (const t of records.teaching) ids.add(graph.evidenceTarget(t.competency));
  const ORDER: Record<Confidence, number> = { not_yet: 0, too_early: 1, getting_there: 2, sure: 3 };
  return [...ids].filter((id) => graph.byId.has(id)).map((id) => taughtMark(id, records, evidence(id)))
    .sort((a, b) => Number(b.sitDown) - Number(a.sitDown) || ORDER[a.confidence] - ORDER[b.confidence] || (a.last < b.last ? 1 : -1));
}

/**
 * own-it@1: what the CHILD reads when a skill stops for now. The child is never told to go and find an adult: that is the
 * parent page's job (taught@1). Sentences that hand the child to "a teacher or parent" / "a person" are dropped, and the
 * child is told the skill comes back.
 */
export const COME_BACK = "We'll come back to this one. Carry on with the next.";
export function ownIt(text: string | undefined | null): string {
  if (!text) return COME_BACK;
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const kept = sentences.filter((s) => !/teacher|parent|a person|an adult|educator/i.test(s)).join("").trim();
  return kept ? `${kept} ${COME_BACK}` : COME_BACK;
}
