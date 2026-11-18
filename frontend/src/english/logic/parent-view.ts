/**
 * Parent view: what a parent sees for each child of this account (or on this device), read from the child's own
 * record. Counts of what happened only: nothing here is an estimate, and nothing is written.
 */
import type { Learner } from "./learner.ts";
import { BANK, LEVEL_NAMES, levelOf, sourceProgress } from "./spelling.ts";
import { latestResult } from "./vocabulary/size-check.ts";

export interface ListSummary {
  id: string;
  name: string;
  mode: "practice" | "test" | "plain";
  words: number;
  /** Words by their latest standing. */
  unaided: number;
  withHelp: number;
  wrong: number;
  notTried: number;
  /** The words to work on, worst first (wrong, then right only with help), at most five. */
  toWorkOn: string[];
  /** The latest finished test on a test list. */
  lastTest: { at: string; right: number; total: number } | null;
}

export interface ChildSummary {
  id: string;
  name: string;
  /** The latest event of any kind in the child's record. */
  lastActive: string | null;
  /** Calendar days (UTC) with any spelling answer in the last seven. */
  daysPractisedThisWeek: number;
  lists: ListSummary[];
  bee: { level: number; levelName: string; practised: number; total: number; reviewList: number } | null;
  /** The latest word check, if one was finished. */
  words: { estimate: number; low: number; high: number } | null;
}

const DAY = 86_400_000;

export function childSummary(learner: Learner, now: string): ChildSummary {
  const st = learner.spelling();
  const lists = learner.wordLists().map((l): ListSummary => {
    const rows = learner.listResults(l.id);
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    const tests = [...st.sessions.values()].filter((s) => s.event.mode === "test" && s.event.source.type === "list" && s.event.source.id === l.id && s.end?.reason === "finished");
    const last = tests.at(-1);
    return {
      id: l.id,
      name: l.name,
      mode: l.mode ?? "plain",
      words: l.words.length,
      unaided: count("unaided"),
      withHelp: count("with_help"),
      wrong: count("wrong"),
      notTried: count("not_tried"),
      toWorkOn: rows.filter((r) => r.status === "wrong" || r.status === "with_help").slice(0, 5).map((r) => r.word),
      lastTest: last ? { at: last.end!.at, right: last.answers.filter((a) => a.correct).length, total: last.answers.length } : null,
    };
  });
  const bank = learner.spellingWords(BANK);
  const p = sourceProgress(st, bank, now);
  const level = levelOf(st, BANK);
  const days = new Set<string>();
  for (const s of st.sessions.values()) for (const a of s.answers) if (Date.parse(now) - Date.parse(a.at) < 7 * DAY && Date.parse(a.at) <= Date.parse(now)) days.add(a.at.slice(0, 10));
  const events = learner.state.events;
  const w = latestResult(learner.vocabRecords());
  return {
    id: learner.profileId,
    name: learner.state.profile?.name ?? "Learner",
    lastActive: events.length > 1 ? events[events.length - 1].at : null,
    daysPractisedThisWeek: days.size,
    lists,
    bee: p.practised ? { level, levelName: LEVEL_NAMES[level], practised: p.practised, total: p.total, reviewList: p.reviewList } : null,
    words: w ? { estimate: w.estimate, low: w.low, high: w.high } : null,
  };
}

/** A small sum only an adult is likely to answer quickly: keeps a young child from wandering into the parent view. Not security. */
export function gateQuestion(seed: number): { a: number; b: number; answer: number } {
  const a = 6 + (seed % 4);
  const b = 7 + (Math.floor(seed / 4) % 3);
  return { a, b, answer: a * b };
}
