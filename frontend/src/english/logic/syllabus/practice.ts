/**
 * The child's own syllabus, practised: for a learner whose class and board are set, where each line of that class's
 * syllabus stands in the app.
 *
 *   not started  nothing yet in the stream or grammar topic the line points to;
 *   practising   answers there, but not yet shown to hold;
 *   secure       answered on two or more days, and on the latest of them at least four in five right (a task with a
 *                grown-up: done with everything the adult looks for ticked; Reading: a check passed on one's own);
 *   due          was secure, but nothing has been answered there for a while: a fresh check shows whether it has
 *                stuck (right again: secure; mostly wrong: back to practising). The wait starts at three weeks and
 *                doubles each time a check after a full wait holds, up to six months; a check that fails starts it
 *                again at three weeks.
 *
 * Counts only, from the learner's own record; nothing is an estimate.
 */
import type { Learner } from "../learner.ts";
import type { AppEvent } from "../events.ts";
import { LABEL_OWN } from "../reading/session.ts";
import { BOARDS, syllabusFor, taskLine, type Outcome, type Syllabus } from "./syllabus.ts";

export type Stage = "not_started" | "practising" | "secure" | "due";
/** How long a secure line holds without being answered again before it is first due for a check. */
export const DUE_AFTER_DAYS = 21;
/** The longest wait between checks, however many have held. */
export const DUE_MAX_DAYS = 168;
const DAY = 86_400_000;

/** One day of answers on a line: when it began and ended, and whether it held (four in five right, or a task done). */
export type Session = { first: string; last: string; held: boolean };

/** Days to wait after the last session before the line is due again: three weeks, doubled for each check that held
 *  after a full wait (the line already secure), back to three weeks when a session does not hold. */
export function waitDays(sessions: Session[], secureAfter: number): number {
  let wait = DUE_AFTER_DAYS;
  sessions.forEach((x, i) => {
    if (!x.held) wait = DUE_AFTER_DAYS;
    else if (i >= secureAfter && sessions[i - 1].held && Date.parse(x.first) - Date.parse(sessions[i - 1].last) >= wait * DAY) wait = Math.min(wait * 2, DUE_MAX_DAYS);
  });
  return wait;
}

/** Right-or-wrong outcomes in one event, for the stream a line points to. */
function outcomes(e: AppEvent, o: Outcome, studyKind: "notes" | "chart" | "map" | null): boolean[] | null {
  const r = (e as { record?: Record<string, unknown> }).record as Record<string, unknown> | undefined;
  const answers = (x: unknown) => (Array.isArray(x) ? x.map((a) => !!(a as { correct?: boolean }).correct) : []);
  switch (o.where) {
    case "grammar":
      return e.kind === "grammar_use" && r?.type === "answer" && (o.topics ?? []).includes(r.topic as string) ? [!!r.correct] : null;
    case "study":
      return e.kind === "study" && (!studyKind || r?.kind === studyKind) ? answers(r?.answers) : null;
    case "kinds":
      return e.kind === "text_read" ? answers(r?.answers) : null;
    case "long":
      return e.kind === "long_read" ? answers(r?.answers) : null;
    case "listen":
      return e.kind === "listen_passage" ? answers(r?.answers) : null;
    case "listening":
    case "passage":
    case "passage_seen":
      return e.kind === "dictation" && r?.type === "answer" ? [!!r.perfect] : null;
    case "written":
      return e.kind === "written_answer" && r?.type === "answer" ? [!!r.correct] : null;
    case "first":
      return e.kind === "first_words" && r?.type === "step" ? [!!r.correct] : null;
    case "words":
      return e.kind === "word_learn" && r?.type === "answer" ? [!!r.correct] : null;
    case "spelling":
      return e.kind === "spell_answer" ? [!!(e as { correct?: boolean }).correct] : null;
    default:
      return null;
  }
}

/** Where one line stands for this learner. */
export function lineStage(learner: Learner, s: Syllabus, o: Outcome): Stage {
  if (o.coverage === "not" || !o.where) return "not_started";
  if (o.where === "guided") {
    const line = taskLine(s, o);
    const done = learner.state.events.flatMap((e) => (e.kind === "guided_task" && e.record.syllabus === line.syllabus && e.record.outcome === line.outcome ? [{ at: e.at, r: e.record }] : []));
    if (!done.length) return "not_started";
    const full = (r: (typeof done)[number]["r"]) => r.of > 0 && r.seen.length === r.of;
    if (!done.some((d) => full(d.r))) return "practising";
    const sessions = done.map((d) => ({ first: d.at, last: d.at, held: full(d.r) }));
    return stale(learner, done[done.length - 1].at, waitDays(sessions, 1)) ? "due" : "secure";
  }
  if (o.where === "reading") {
    // a day with a reading check holds when a check that day was passed on one's own
    const dayOf = learner.dayFn();
    const byDay = new Map<string, Session>();
    for (const e of learner.state.events) {
      if (e.kind !== "reading" || e.record.type !== "check_result") continue;
      const d = dayOf(e.at);
      const was = byDay.get(d);
      const held = e.record.passed && e.record.label === LABEL_OWN;
      byDay.set(d, { first: was?.first ?? e.at, last: e.at, held: !!was?.held || held });
    }
    const sessions = [...byDay.keys()].sort().map((d) => byDay.get(d)!);
    if (!sessions.some((x) => x.held)) return learner.readingRecords().length ? "practising" : "not_started";
    const last = sessions[sessions.length - 1];
    if (!last.held) return "practising";
    return stale(learner, last.last, waitDays(sessions, 1)) ? "due" : "secure";
  }
  const dayOf = learner.dayFn();
  const k = studyKindOf(o);
  const byDay = new Map<string, { first: string; last: string; got: boolean[] }>();
  for (const e of learner.state.events) {
    const got = outcomes(e, o, k);
    if (!got?.length) continue;
    const d = dayOf(e.at);
    const was = byDay.get(d);
    byDay.set(d, { first: was?.first ?? e.at, last: e.at, got: [...(was?.got ?? []), ...got] });
  }
  if (!byDay.size) return "not_started";
  const sessions = [...byDay.keys()].sort().map((d) => {
    const x = byDay.get(d)!;
    return { first: x.first, last: x.last, held: x.got.filter(Boolean).length / x.got.length >= 0.8 };
  });
  const last = sessions[sessions.length - 1];
  if (sessions.length < 2 || !last.held) return "practising";
  return stale(learner, last.last, waitDays(sessions, 1)) ? "due" : "secure";
}

/** The wait has passed since the line was last answered. */
const stale = (learner: Learner, at: string, days: number) => Date.parse(learner.clock()) - Date.parse(at) >= days * DAY;

function studyKindOf(o: Outcome): "notes" | "chart" | "map" | null {
  const t = o.text.toLowerCase();
  return /chart|graph|data/.test(t) ? "chart" : /map|direction/.test(t) ? "map" : /note|summar/.test(t) ? "notes" : null;
}

/** Has the learner practised what this line points to at all? */
export function linePractised(learner: Learner, s: Syllabus, o: Outcome): boolean {
  switch (o.where) {
    case "grammar": {
      const topics = new Set(o.topics ?? []);
      return learner.grammarRecords().some((r) => r.type === "answer" && topics.has(r.topic));
    }
    case "guided": {
      const line = taskLine(s, o);
      return learner.guidedRecords().some((r) => r.syllabus === line.syllabus && r.outcome === line.outcome);
    }
    case "study": {
      const k = studyKindOf(o);
      return learner.studyRecords().some((r) => !k || r.kind === k);
    }
    case "kinds":
      return learner.kindRecords().length > 0;
    case "long":
      return learner.longRecords().length > 0;
    case "listen":
      return learner.listenRecords().length > 0;
    case "listening":
    case "passage":
    case "passage_seen":
      return learner.dictationRecords().length > 0;
    case "reading":
      return learner.readingRecords().length > 0;
    case "words":
      return learner.wordLearnRecords().length > 0;
    case "first":
      return learner.firstRecords().length > 0;
    case "written":
      return learner.writtenRecords().length > 0;
    case "spelling":
      return learner.spelling().sessions.size > 0;
    default:
      return false;
  }
}

export interface SyllabusPractice {
  /** "CBSE Class 5" */
  name: string;
  syllabus: string;
  practised: number;
  /** Lines secure: answered on more than one day and holding on the latest. */
  secure: number;
  /** Lines that were secure but have not been answered for three weeks: due for a fresh check. */
  due: number;
  /** Each line's stage, in syllabus order. */
  stages: { id: string; text: string; stage: Stage }[];
  /** Lines the app has a place for (every line, unless one is marked not yet in the app). */
  total: number;
  /** Lines due for a fresh check, in syllabus order. */
  dueLines: { id: string; text: string }[];
  /** Lines not yet practised, in syllabus order. */
  notYet: { id: string; text: string }[];
}

/** For a learner with a class and board set; null for anyone else (an adult, or not in school). */
export function syllabusPractice(learner: Learner): SyllabusPractice | null {
  const place = learner.state.preferences?.school;
  if (!place) return null;
  const s = syllabusFor(place.class, place.board);
  if (s.class !== place.class) return null; // a class the board's syllabus does not hold (ICSE 9 to 12)
  const lines = s.strands.flatMap((st) => st.outcomes).filter((o) => o.coverage !== "not");
  const stages = lines.map((o) => ({ id: o.id, text: o.text, stage: lineStage(learner, s, o) }));
  return {
    secure: stages.filter((x) => x.stage === "secure").length,
    due: stages.filter((x) => x.stage === "due").length,
    stages,
    name: `${BOARDS.find((b) => b.id === place.board)?.name ?? place.board} Class ${place.class}`,
    syllabus: s.id,
    practised: stages.filter((x) => x.stage !== "not_started").length,
    total: lines.length,
    notYet: stages.filter((x) => x.stage === "not_started").map(({ id, text }) => ({ id, text })),
    dueLines: stages.filter((x) => x.stage === "due").map(({ id, text }) => ({ id, text })),
  };
}
