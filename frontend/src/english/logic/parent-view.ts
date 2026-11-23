/**
 * Parent view: what a parent sees for each child of this account (or on this device), read from the child's own
 * record. Counts of what happened only: nothing here is an estimate, and nothing is written.
 */
import { listenSummary } from "./listening/passages.ts";
import { GRAMMAR, grammarSummary } from "./grammar-use/grammar-use.ts";
import { masterySummary } from "./grammar-use/mastery.ts";
import { summary as wordsSummary } from "./vocabulary/daily-words.ts";
import { dictationSummary } from "./dictation/dictation.ts";
import type { Learner } from "./learner.ts";
import { BANK, LEVEL_NAMES, levelOf, sourceProgress } from "./spelling.ts";
import { patternCounts } from "./spelling-patterns.ts";
import { learnerPicture } from "./streams/picture.ts";
import { latestResult } from "./vocabulary/size-check.ts";
import { COURSE } from "./reading/course.ts";
import { progress as readingProgress } from "./reading/session.ts";
import { guidedSummary } from "./guided/guided.ts";
import { FIRST, firstSummary } from "./first/first.ts";
import { streamRows } from "./streams/streams.ts";
import { kindsSummary, SKILL_NAMES } from "./reading/kinds.ts";
import { longSummary } from "./reading/long-read.ts";
import { writtenSummary } from "./reading/written.ts";
import { STUDY_SKILL_NAMES, studySummary } from "./study/study.ts";
import { syllabusPractice } from "./syllabus/practice.ts";

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
  /** The word check's latest result: the word level reached (0: below the first level). */
  words: { band: number } | null;
  /** New words: how many are learnt or being learnt, and the ones missed. */
  newWords: { learnt: number; learning: number; tricky: string[] } | null;
  /** Listen and write: sentences done, how many right first time, and words missed most. */
  dictation: { sentences: number; perfectFirst: number; level: number; missed: string[] } | null;
  /** Listen and answer: passages heard, questions right, and the kinds of question missed. */
  listening: { passages: number; right: number; asked: number; weak: string[] } | null;
  /** Grammar in use: sentences answered and right, and the topics to look at again. */
  grammar: { answered: number; right: number; weak: string[]; mastered?: number } | null;
  /** Calendar days (the child's own day) with any English practice in the last seven. */
  englishDays: number;
  /** weekly-note@1: each activity used in the last seven days and on how many of them, most days first. */
  week: { activity: string; days: number }[];
  /** Where each daily activity stands, as the child's home screen shows it. */
  /** `sure`: how sure that level is, and what it could be (streams/picture.ts). */
  levels: { name: string; level: string; sure?: string }[];
  /** The overall level the quick gap check measured, on the scale of eight, and how sure it is. */
  overall: { level: number; sure: string } | null;
  /** Reading: skills checked and passed, and the ones that need more practice ("Main idea, level 3"). */
  reading: { passed: number; needsPractice: string[] } | null;
  /** Writing and other syllabus tasks: how many done, and how many words written in all (the writing itself is never kept). */
  writing: { tasks: number; pieces: number; words: number } | null;
  /** Long reads: stories finished, parts read, and questions right. */
  long: { finished: number; parts: number; right: number; asked: number } | null;
  kinds: { texts: number; right: number; asked: number; weak: string[] } | null;
  /** Written answers to questions on a passage: answered, right, right on the first try. */
  written: { answered: number; right: number; firstTry: number } | null;
  /** The child's own class syllabus: lines practised in the app, and the first few not yet practised. */
  syllabus: { name: string; secure: number; due: number; practised: number; total: number; notYet: string[]; slipped: string[] } | null;
  /** Notes, charts and maps: tasks done, steps right, what goes well and what to work on, and the learner's own pieces marked by rule. */
  study: { tasks: number; right: number; asked: number; strong: string[]; weak: string[]; own: { pieces: number; passed: number; of: number } } | null;
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
  const view = learnerPicture(learner, now);
  const nw = wordsSummary(learner.wordLearnRecords(), now, learner.dayFn());
  const dict = dictationSummary(learner.dictationRecords());
  const gram = grammarSummary(GRAMMAR, learner.grammarRecords());
  const heard = listenSummary(learner.listenRecords());
  const dayOf = learner.dayFn();
  const english = new Set<string>();
  const byActivity = new Map<string, Set<string>>();
  for (const e of events.slice(1))
    if (Date.parse(now) - Date.parse(e.at) < 7 * DAY && Date.parse(e.at) <= Date.parse(now)) {
      english.add(dayOf(e.at));
      const a = WEEK_ACTIVITY[e.kind];
      if (a) byActivity.set(a, (byActivity.get(a) ?? new Set()).add(dayOf(e.at)));
    }
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
    words: w ? { band: w.band } : null,
    newWords: nw.learning + nw.learnt ? { learnt: nw.learnt, learning: nw.learning, tricky: nw.tricky.slice(0, 6) } : null,
    listening: heard.passages ? { passages: heard.passages, right: heard.right, asked: heard.asked, weak: heard.weak } : null,
    grammar: gram.answered ? { answered: gram.answered, right: gram.right, weak: gram.weak.slice(0, 5), mastered: masterySummary(learner.grammarTimed(), now).mastered } : null,
    englishDays: english.size,
    week: [...byActivity].map(([activity, d]) => ({ activity, days: d.size })).sort((a, b) => b.days - a.days || (a.activity < b.activity ? -1 : 1)),
    levels: view.parts.map((r) => ({ name: r.name, level: r.level, sure: r.note })),
    overall: view.overall === null ? null : { level: view.overall, sure: view.low < view.high ? `${view.overallSure}: could be ${view.low} to ${view.high}` : view.overallSure },
    reading: units.some(([, u]) => u.checks) ? { passed: units.filter(([, u]) => u.status === "passed_own" || u.status === "passed_after_help").length, needsPractice: units.filter(([, u]) => u.status === "needs_practice" || u.status === "no_fresh_check").map(([k]) => unitName(k)).slice(0, 4) } : null,
    writing: guided.length ? { tasks: guidedSummary(guided).done.size, pieces: pieces.length, words: pieces.reduce((a, r) => a + (r.words ?? 0), 0) } : null,
    written: learner.writtenRecords().length ? writtenSummary(learner.writtenRecords()) : null,
    long: learner.longRecords().length ? longSummary(learner.longRecords()) : null,
    kinds: learner.kindRecords().length ? (({ texts, right, asked, weak }) => ({ texts, right, asked, weak: weak.map((k) => SKILL_NAMES[k]) }))(kindsSummary(learner.kindRecords())) : null,
    syllabus: (({ sp }) => (sp ? { name: sp.name, secure: sp.secure, due: sp.due, practised: sp.practised, total: sp.total, notYet: sp.notYet.slice(0, 3).map((x) => x.text), slipped: sp.slipped.slice(0, 3).map((x) => x.text) } : null))({ sp: syllabusPractice(learner) }),
    study: learner.studyRecords().length ? (({ tasks, right, asked, strong, weak, own }) => ({ tasks, right, asked, strong: strong.map((k) => STUDY_SKILL_NAMES[k]), weak: weak.map((k) => STUDY_SKILL_NAMES[k]), own }))(studySummary(learner.studyRecords())) : null,
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

/** weekly-note@1: the activity each kind of record belongs to, as the child sees it named. */
const WEEK_ACTIVITY: Record<string, string> = {
  first_words: "First words", word_learn: "New words", vocab: "Word check", dictation: "Listen and write", listen_passage: "Listen and answer",
  grammar_use: "Grammar", reading: "Reading", text_read: "Poems and everyday texts", long_read: "Long reads", written_answer: "Write an answer",
  spell_answer: "Spelling Bee", sounds: "Sounds", guided_task: "Tasks with a grown-up", book_answer: "My Books", level_check: "Find my level",
};

/**
 * weekly-note@1: a short note on the child's week that a parent can send on (WhatsApp or anywhere), in plain words
 * and counts only. No marks, no comparisons with other children, nothing the child typed.
 */
export function weeklyNote(s: ChildSummary, link?: string): string {
  const lines = [`${s.name}'s English this week (OpenPath)`];
  if (!s.englishDays) lines.push("No English practice in the last 7 days. Ten minutes a day is enough to keep going.");
  else {
    lines.push(`Practised on ${s.englishDays} of the last 7 days.`);
    if (s.week.length) lines.push(`Did: ${s.week.slice(0, 5).map((w) => `${w.activity} (${w.days} ${w.days === 1 ? "day" : "days"})`).join(", ")}.`);
  }
  const good: string[] = [];
  if (s.newWords?.learnt) good.push(`${s.newWords.learnt} new words learnt`);
  if (s.dictation?.perfectFirst) good.push(`${s.dictation.perfectFirst} sentences written right first time`);
  if (s.grammar?.right) good.push(`${s.grammar.right} grammar sentences right`);
  if (s.grammar?.mastered) good.push(`${s.grammar.mastered} grammar ${s.grammar.mastered === 1 ? "topic" : "topics"} mastered`);
  if (s.reading?.passed) good.push(`${s.reading.passed} reading ${s.reading.passed === 1 ? "skill" : "skills"} passed`);
  if (good.length) lines.push(`So far: ${good.join("; ")}.`);
  const work: string[] = [];
  if (s.newWords?.tricky.length) work.push(`words: ${s.newWords.tricky.slice(0, 3).join(", ")}`);
  if (s.grammar?.weak.length) work.push(`grammar: ${s.grammar.weak.slice(0, 2).join(", ")}`);
  if (s.reading?.needsPractice.length) work.push(`reading: ${s.reading.needsPractice.slice(0, 2).join(", ")}`);
  if (work.length) lines.push(`To practise next: ${work.join("; ")}.`);
  if (link) lines.push(link);
  return lines.join("\n");
}
