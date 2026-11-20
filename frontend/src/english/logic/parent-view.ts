/**
 * Parent view: what a parent sees for each child of this account (or on this device), read from the child's own
 * record. Counts of what happened only: nothing here is an estimate, and nothing is written.
 */
import { listenSummary } from "./listening/passages.ts";
import { GRAMMAR, grammarSummary } from "./grammar-use/grammar-use.ts";
import { summary as wordsSummary } from "./vocabulary/daily-words.ts";
import { dictationSummary } from "./dictation/dictation.ts";
import type { Learner } from "./learner.ts";
import { BANK, LEVEL_NAMES, levelOf, sourceProgress } from "./spelling.ts";
import { patternCounts } from "./spelling-patterns.ts";
import { latestResult } from "./vocabulary/size-check.ts";
import { COURSE } from "./reading/course.ts";
import { progress as readingProgress } from "./reading/session.ts";
import { guidedSummary } from "./guided/guided.ts";
import { FIRST, firstSummary } from "./first/first.ts";
import { streamRows } from "./streams/streams.ts";
import { longSummary } from "./reading/long-read.ts";

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
  /** Kinds of spelling mistake made in the last 30 days, most frequent first (clear cases only). */
  patterns: { id: string; name: string; times: number }[];
  /** The latest word check, if one was finished. */
  words: { estimate: number; low: number; high: number } | null;
  /** New words: how many are learnt or being learnt, and the ones missed. */
  newWords: { learnt: number; learning: number; tricky: string[] } | null;
  /** Listen and write: sentences done, how many right first time, and words missed most. */
  dictation: { sentences: number; perfectFirst: number; level: number; missed: string[] } | null;
  /** Listen and answer: passages heard, questions right, and the kinds of question missed. */
  listening: { passages: number; right: number; asked: number; weak: string[] } | null;
  /** Grammar in use: sentences answered and right, and the topics to look at again. */
  grammar: { answered: number; right: number; weak: string[] } | null;
  /** Calendar days (the child's own day) with any English practice in the last seven. */
  englishDays: number;
  /** Where each daily activity stands, as the child's home screen shows it. */
  levels: { name: string; level: string }[];
  /** Reading: skills checked and passed, and the ones that need more practice ("Main idea, level 3"). */
  reading: { passed: number; needsPractice: string[] } | null;
  /** Writing and other syllabus tasks: how many done, and how many words written in all (the writing itself is never kept). */
  writing: { tasks: number; pieces: number; words: number } | null;
  /** Long reads: stories finished, parts read, and questions right. */
  long: { finished: number; parts: number; right: number; asked: number } | null;
  /** First words: words found, found on the first tap last time, and the total. */
  first: { met: number; sure: number; total: number } | null;
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
  const nw = wordsSummary(learner.wordLearnRecords(), now, learner.dayFn());
  const dict = dictationSummary(learner.dictationRecords());
  const gram = grammarSummary(GRAMMAR, learner.grammarRecords());
  const heard = listenSummary(learner.listenRecords());
  const dayOf = learner.dayFn();
  const english = new Set<string>();
  for (const e of events.slice(1)) if (Date.parse(now) - Date.parse(e.at) < 7 * DAY && Date.parse(e.at) <= Date.parse(now)) english.add(dayOf(e.at));
  const rp = readingProgress(COURSE, learner.readingRecords());
  const unitName = (key: string) => {
    const [skill, level] = key.split("@");
    return `${COURSE.skills.find((x) => x.id === skill)?.name ?? skill}, level ${level}`;
  };
  const units = [...rp.units.entries()];
  const guided = learner.guidedRecords();
  const pieces = guided.filter((r) => r.words !== undefined);
  const first = firstSummary(FIRST, learner.firstRecords());
  return {
    id: learner.profileId,
    name: learner.state.profile?.name ?? "Learner",
    lastActive: events.length > 1 ? events[events.length - 1].at : null,
    daysPractisedThisWeek: days.size,
    lists,
    bee: p.practised ? { level, levelName: LEVEL_NAMES[level], practised: p.practised, total: p.total, reviewList: p.reviewList } : null,
    patterns: patternCounts([...st.sessions.values()].flatMap((s) => s.answers.filter((a) => Date.parse(now) - Date.parse(a.at) < 30 * DAY).map((a) => a.pattern))),
    words: w ? { estimate: w.estimate, low: w.low, high: w.high } : null,
    newWords: nw.learning + nw.learnt ? { learnt: nw.learnt, learning: nw.learning, tricky: nw.tricky.slice(0, 6) } : null,
    listening: heard.passages ? { passages: heard.passages, right: heard.right, asked: heard.asked, weak: heard.weak } : null,
    grammar: gram.answered ? { answered: gram.answered, right: gram.right, weak: gram.weak.slice(0, 5) } : null,
    englishDays: english.size,
    levels: streamRows(learner, now).map((r) => ({ name: r.name, level: r.level })),
    reading: units.some(([, u]) => u.checks) ? { passed: units.filter(([, u]) => u.status === "passed_own" || u.status === "passed_after_help").length, needsPractice: units.filter(([, u]) => u.status === "needs_practice" || u.status === "no_fresh_check").map(([k]) => unitName(k)).slice(0, 4) } : null,
    writing: guided.length ? { tasks: guidedSummary(guided).done.size, pieces: pieces.length, words: pieces.reduce((a, r) => a + (r.words ?? 0), 0) } : null,
    long: learner.longRecords().length ? longSummary(learner.longRecords()) : null,
    first: first.sittings ? { met: first.met, sure: first.sure, total: first.total } : null,
    dictation: dict.sentences ? { sentences: dict.sentences, perfectFirst: dict.perfectFirst, level: dict.level ?? 1, missed: dict.missed.slice(0, 6) } : null,
  };
}

/** A small sum only an adult is likely to answer quickly: keeps a young child from wandering into the parent view. Not security. */
export function gateQuestion(seed: number): { a: number; b: number; answer: number } {
  const a = 6 + (seed % 4);
  const b = 7 + (Math.floor(seed / 4) % 3);
  return { a, b, answer: a * b };
}
