/**
 * grammar-mastery@1: spaced review and mastery per grammar topic, from the learner's answers and when they were given.
 *
 *   learning  until three of the last four answers on the topic are right;
 *   learnt    then the topic comes back for review after 3 days, then 7, then 30 (two review sentences in a later
 *             sitting, new ones where the topic has them). A right review moves it on; a wrong one sends it back to
 *             learning, to come back the next day.
 *   mastered  after the 30-day review is passed: three spaced checks right, the last a month after learning. A
 *             mastered topic still comes back every 90 days.
 *
 * Only an answer given on or after the due day is a review answer; practice in between changes nothing. A topic
 * sitting (chosen from search, or a missed topic) is practice like any other. Practice-only: the engine's estimates
 * are untouched.
 */
import type { GrammarRecord } from "./grammar-use.ts";

export const REVIEW_DAYS = [3, 7, 30] as const;
export const MASTERED_AGAIN_DAYS = 90;
export const REVIEWS_PER_SITTING = 2;
const DAY = 86_400_000;

export type Stage = "learning" | "learnt" | "mastered";
export interface TopicMastery {
  topic: string;
  stage: Stage;
  /** Reviews passed since last learnt (0 to 3). */
  passed: number;
  /** When the next review is due (ISO), or null while learning. */
  due: string | null;
  answers: number;
}

export interface Timed {
  at: string;
  record: GrammarRecord;
}

const plus = (at: string, days: number) => new Date(Date.parse(at) + days * DAY).toISOString();

/** Each topic answered at least once, in the order first met. */
export function mastery(timed: readonly Timed[]): TopicMastery[] {
  const by = new Map<string, { recent: boolean[]; state: TopicMastery }>();
  for (const { at, record: r } of timed) {
    if (r.type !== "answer") continue;
    const t = by.get(r.topic) ?? { recent: [], state: { topic: r.topic, stage: "learning" as Stage, passed: 0, due: null, answers: 0 } };
    by.set(r.topic, t);
    const s = t.state;
    s.answers++;
    t.recent = [...t.recent, r.correct].slice(-4);
    if (s.due && Date.parse(at) >= Date.parse(s.due)) {
      // a review answer
      if (!r.correct) {
        s.stage = "learning";
        s.passed = 0;
        s.due = plus(at, 1);
        t.recent = [false];
        continue;
      }
      s.passed = Math.min(REVIEW_DAYS.length, s.passed + 1);
      if (s.passed >= REVIEW_DAYS.length) {
        s.stage = "mastered";
        s.due = plus(at, MASTERED_AGAIN_DAYS);
      } else s.due = plus(at, REVIEW_DAYS[s.passed]);
      continue;
    }
    if (s.stage === "learning" && t.recent.filter(Boolean).length >= 3) {
      s.stage = "learnt";
      s.passed = 0;
      s.due = plus(at, REVIEW_DAYS[0]);
    }
  }
  return [...by.values()].map((t) => t.state);
}

/** Topics due for review now, longest overdue first (at most `n`). */
export function dueTopics(timed: readonly Timed[], now: string, n = REVIEWS_PER_SITTING): string[] {
  return mastery(timed)
    .filter((m) => m.due && m.stage !== "learning" && Date.parse(m.due) <= Date.parse(now))
    .sort((a, b) => Date.parse(a.due!) - Date.parse(b.due!))
    .slice(0, n)
    .map((m) => m.topic);
}

/** Counts for the learner and the parent. */
export function masterySummary(timed: readonly Timed[], now: string) {
  const m = mastery(timed);
  return {
    mastered: m.filter((x) => x.stage === "mastered").length,
    learnt: m.filter((x) => x.stage === "learnt").length,
    learning: m.filter((x) => x.stage === "learning").length,
    due: m.filter((x) => x.due && x.stage !== "learning" && Date.parse(x.due) <= Date.parse(now)).length,
  };
}
