/**
 * play@1: more questions just for fun. A child picks a topic she has met and gets fresh questions of it for as long as she
 * likes, starting easy and getting harder as she gets them right (a wrong answer steps back down).
 *
 * Questions come only from the topic's own practice pool (never the check or the later-check questions, so those stay
 * fresh), skip anything she has already been asked, and keep to her class first. Answers are saved as ordinary practice
 * with the context "play": a right answer on her own is real evidence, help used is recorded as help, as anywhere else.
 */
import { moduleFor } from "./content";
import { rightAnswer } from "./evidence";
import { exposureKey } from "./families";
import { ease, gradeFirst, withinGrade } from "./intervention";
import { modulePhasePool } from "./library";
import type { LearnerRecords } from "./records";

export const PLAY_CONTEXT = "play";
/** Right answers in a row (net of wrong ones) to go from the easiest question to the hardest. */
export const PLAY_STEPS = 12;
const LOOK = 400;

const isPlay = (a: { context?: string }) => a.context === PLAY_CONTEXT;

/** The level she has reached in play on a skill: up one for a right answer on her own, down one for a wrong one (a right
 *  answer with help stays put), never below 0. */
export function playLevel(competency: string, records: LearnerRecords): number {
  let n = 0;
  for (const a of records.attempts) if (a.competency === competency && isPlay(a)) n = Math.max(0, n + (!rightAnswer(a) ? -1 : a.hints || a.solution ? 0 : 1));
  return Math.min(PLAY_STEPS, n);
}

/** Every unseen practice question of the skill, easiest first; empty when it has none. */
export function playPool(competency: string, records: LearnerRecords): string[] {
  const m = moduleFor(competency);
  if (!m) return [];
  const seen = new Set([...records.attempts, ...records.unresolved].map((a) => exposureKey(a.questionId)));
  const open = gradeFirst(records, modulePhasePool(m, "practice")).filter((id) => !seen.has(exposureKey(id)) && withinGrade(records, id)).slice(0, LOOK);
  return open.map((id, i) => ({ id, i, e: ease(id) })).sort((x, y) => x.e - y.e || x.i - y.i).map((x) => x.id);
}

/** The next question to play on a skill, at her level; null when every practice question has been asked. */
export function playNext(competency: string, records: LearnerRecords): string | null {
  const open = playPool(competency, records);
  if (!open.length) return null;
  const at = Math.round((playLevel(competency, records) / PLAY_STEPS) * (open.length - 1));
  return open[Math.min(open.length - 1, at)];
}

/** Skills she can play: ones she has answered or been taught that have practice questions left, most recent first. */
export function playTopics(records: LearnerRecords, max = 12): string[] {
  const last = new Map<string, string>();
  for (const x of [...records.attempts, ...records.teaching]) if ((last.get(x.competency) ?? "") < x.at) last.set(x.competency, x.at);
  return [...last.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([c]) => c).filter((c) => !!moduleFor(c) && modulePhasePool(moduleFor(c)!, "practice").length > 0).slice(0, max);
}

/** How many questions were played for fun since `since` (ms), and how many were right: for the parent page. */
export function playedSince(records: LearnerRecords, since: number): { played: number; right: number } {
  const xs = records.attempts.filter((a) => isPlay(a) && Date.parse(a.at) >= since);
  return { played: xs.length, right: xs.filter((a) => rightAnswer(a)).length };
}
