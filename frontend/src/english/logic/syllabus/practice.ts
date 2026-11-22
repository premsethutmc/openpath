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
import { BOARDS, syllabusFor, taskLine, type Board, type Outcome, type Syllabus, type Where } from "./syllabus.ts";

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
  return lineState(learner, s, o).stage;
}

/**
 * Where one line stands, and whether it has slipped: it was secure once, but the latest session on it did not hold
 * (a check after the wait, or later practice, went mostly wrong).
 */
export function lineState(learner: Learner, s: Syllabus, o: Outcome): { stage: Stage; slipped: boolean } {
  const no = { stage: "not_started" as Stage, slipped: false };
  if (o.coverage === "not" || !o.where) return no;
  const { sessions, from, started } = lineSessions(learner, s, o);
  if (!sessions.length) return started ? { stage: "practising", slipped: false } : no;
  // secure at a session that held, once there have been enough sessions (two days of answers; one task or check)
  const secureAt = (i: number) => i >= from && sessions[i].held;
  const last = sessions.length - 1;
  if (!secureAt(last)) return { stage: "practising", slipped: sessions.slice(0, last).some((_, i) => secureAt(i)) };
  return { stage: stale(learner, sessions[last].last, waitDays(sessions, 1)) ? "due" : "secure", slipped: false };
}

/** The sessions on a line in order, the first session that can make it secure, and whether anything was done there. */
function lineSessions(learner: Learner, s: Syllabus, o: Outcome): { sessions: Session[]; from: number; started: boolean } {
  if (o.where === "guided") {
    // a task with a grown-up holds when everything the adult looks for was ticked
    const line = taskLine(s, o);
    const sessions = learner.state.events.flatMap((e) => (e.kind === "guided_task" && e.record.syllabus === line.syllabus && e.record.outcome === line.outcome ? [{ first: e.at, last: e.at, held: e.record.of > 0 && e.record.seen.length === e.record.of }] : []));
    return { sessions, from: 0, started: sessions.length > 0 };
  }
  const dayOf = learner.dayFn();
  if (o.where === "reading") {
    // a day with a reading check holds when a check that day was passed on one's own
    const byDay = new Map<string, Session>();
    for (const e of learner.state.events) {
      if (e.kind !== "reading" || e.record.type !== "check_result") continue;
      const d = dayOf(e.at);
      const was = byDay.get(d);
      const held = e.record.passed && e.record.label === LABEL_OWN;
      byDay.set(d, { first: was?.first ?? e.at, last: e.at, held: !!was?.held || held });
    }
    return { sessions: [...byDay.keys()].sort().map((d) => byDay.get(d)!), from: 0, started: learner.readingRecords().length > 0 };
  }
  // answers: a day holds when at least four in five were right; secure needs a second day
  const k = studyKindOf(o);
  const byDay = new Map<string, { first: string; last: string; got: boolean[] }>();
  for (const e of learner.state.events) {
    const got = outcomes(e, o, k);
    if (!got?.length) continue;
    const d = dayOf(e.at);
    const was = byDay.get(d);
    byDay.set(d, { first: was?.first ?? e.at, last: e.at, got: [...(was?.got ?? []), ...got] });
  }
  const sessions = [...byDay.keys()].sort().map((d) => {
    const x = byDay.get(d)!;
    return { first: x.first, last: x.last, held: x.got.filter(Boolean).length / x.got.length >= 0.8 };
  });
  return { sessions, from: 1, started: sessions.length > 0 };
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
  /** Lines that were secure once but did not hold on the latest session: worth more practice. */
  slipped: LineLink[];
  /** Lines due for a fresh check, in syllabus order. */
  dueLines: LineLink[];
  /** Lines not yet practised, in syllabus order. */
  notYet: LineLink[];
}

/** For a learner with a class and board set; null for anyone else (an adult, or not in school). */
/** A syllabus line and how to open its practice (null for a line with nowhere to practise it here). */
export interface LineLink {
  id: string;
  text: string;
  go: { where: Where; topics: string[] | undefined; cls: number; board: Board; line: { syllabus: string; outcome: string; text: string } } | null;
}

export function syllabusPractice(learner: Learner): SyllabusPractice | null {
  const place = learner.state.preferences?.school;
  if (!place) return null;
  const s = syllabusFor(place.class, place.board);
  if (s.class !== place.class) return null; // a class the board's syllabus does not hold (ICSE 9 to 12)
  const lines = s.strands.flatMap((st) => st.outcomes).filter((o) => o.coverage !== "not");
  const staged = lines.map((o) => ({ o, id: o.id, text: o.text, ...lineState(learner, s, o) }));
  const stages = staged.map(({ id, text, stage }) => ({ id, text, stage }));
  // what a button needs to open the line's practice: where, its grammar topics, and the line for a guided task
  const go = (o: Outcome) => (o.where ? { where: o.where, topics: o.topics, cls: s.class, board: place.board, line: { ...taskLine(s, o), text: o.text } } : null);
  return {
    secure: stages.filter((x) => x.stage === "secure").length,
    due: stages.filter((x) => x.stage === "due").length,
    stages,
    name: `${BOARDS.find((b) => b.id === place.board)?.name ?? place.board} Class ${place.class}`,
    syllabus: s.id,
    practised: stages.filter((x) => x.stage !== "not_started").length,
    total: lines.length,
    notYet: staged.filter((x) => x.stage === "not_started").map(({ id, text, o }) => ({ id, text, go: go(o) })),
    dueLines: staged.filter((x) => x.stage === "due").map(({ id, text, o }) => ({ id, text, go: go(o) })),
    slipped: staged.filter((x) => x.slipped).map(({ id, text, o }) => ({ id, text, go: go(o) })),
  };
}
