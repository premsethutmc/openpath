/**
 * The child's own syllabus, practised: for a learner whose class and board are set, which lines of that class's
 * syllabus they have practised in the app (any answer in the stream or grammar topic a line points to, or a task
 * with a grown-up done for it), and the next line not yet practised. Counts only; nothing is an estimate.
 */
import type { Learner } from "../learner.ts";
import { BOARDS, syllabusFor, taskLine, type Outcome, type Syllabus } from "./syllabus.ts";

function studyKindOf(o: Outcome): "notes" | "chart" | "map" | null {
  const t = o.text.toLowerCase();
  return /chart|graph|data/.test(t) ? "chart" : /map|direction/.test(t) ? "map" : /note|summar/.test(t) ? "notes" : null;
}

/** Has the learner practised what this line points to? */
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
  /** Lines the app has a place for (every line, unless one is marked not yet in the app). */
  total: number;
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
  const done = lines.filter((o) => linePractised(learner, s, o));
  return {
    name: `${BOARDS.find((b) => b.id === place.board)?.name ?? place.board} Class ${place.class}`,
    syllabus: s.id,
    practised: done.length,
    total: lines.length,
    notYet: lines.filter((o) => !done.includes(o)).map((o) => ({ id: o.id, text: o.text })),
  };
}
