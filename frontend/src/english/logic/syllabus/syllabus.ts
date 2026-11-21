/**
 * School syllabuses for English (content/english/syllabus): what a board lists for a class, in OpenPath's own
 * words, and for each line whether the app covers it and where. Three boards are held: ICSE (Classes 1 to 8), CBSE and
 * the Tamil Nadu State Board (Classes 1 to 12; built by content/english/syllabus/build/boards.py). A syllabus is an inventory, not content: it copies
 * no curriculum or textbook text, and it does not change what a learner is asked.
 */
import icse1 from "../../../../../content/english/syllabus/icse-class-1.json";
import icse2 from "../../../../../content/english/syllabus/icse-class-2.json";
import icse3 from "../../../../../content/english/syllabus/icse-class-3.json";
import icse4 from "../../../../../content/english/syllabus/icse-class-4.json";
import icse5 from "../../../../../content/english/syllabus/icse-class-5.json";
import icse6 from "../../../../../content/english/syllabus/icse-class-6.json";
import icse7 from "../../../../../content/english/syllabus/icse-class-7.json";
import icse8 from "../../../../../content/english/syllabus/icse-class-8.json";
import cbse1 from "../../../../../content/english/syllabus/cbse-class-1.json";
import cbse2 from "../../../../../content/english/syllabus/cbse-class-2.json";
import cbse3 from "../../../../../content/english/syllabus/cbse-class-3.json";
import cbse4 from "../../../../../content/english/syllabus/cbse-class-4.json";
import cbse5 from "../../../../../content/english/syllabus/cbse-class-5.json";
import cbse6 from "../../../../../content/english/syllabus/cbse-class-6.json";
import cbse7 from "../../../../../content/english/syllabus/cbse-class-7.json";
import cbse8 from "../../../../../content/english/syllabus/cbse-class-8.json";
import cbse9 from "../../../../../content/english/syllabus/cbse-class-9.json";
import cbse10 from "../../../../../content/english/syllabus/cbse-class-10.json";
import cbse11 from "../../../../../content/english/syllabus/cbse-class-11.json";
import cbse12 from "../../../../../content/english/syllabus/cbse-class-12.json";
import tn1 from "../../../../../content/english/syllabus/tn-class-1.json";
import tn2 from "../../../../../content/english/syllabus/tn-class-2.json";
import tn3 from "../../../../../content/english/syllabus/tn-class-3.json";
import tn4 from "../../../../../content/english/syllabus/tn-class-4.json";
import tn5 from "../../../../../content/english/syllabus/tn-class-5.json";
import tn6 from "../../../../../content/english/syllabus/tn-class-6.json";
import tn7 from "../../../../../content/english/syllabus/tn-class-7.json";
import tn8 from "../../../../../content/english/syllabus/tn-class-8.json";
import tn9 from "../../../../../content/english/syllabus/tn-class-9.json";
import tn10 from "../../../../../content/english/syllabus/tn-class-10.json";
import tn11 from "../../../../../content/english/syllabus/tn-class-11.json";
import tn12 from "../../../../../content/english/syllabus/tn-class-12.json";
import { GRAMMAR } from "../grammar-use/grammar-use.ts";
import { GUIDED, tasksFor } from "../guided/guided.ts";

/** guided: done with a grown-up, who ticks what they saw; the app cannot mark it. */
export type Coverage = "covered" | "partly" | "guided" | "not";
export type Where = "words" | "reading" | "listening" | "listen" | "spelling" | "grammar" | "guided" | "writing" | "first" | "passage" | "passage_seen" | "long" | "written" | "kinds";
export interface Outcome {
  id: string;
  text: string;
  coverage: Coverage;
  /** The stream that practises it, when one does. */
  where?: Where;
  /** Grammar in use topics that practise it. */
  topics?: string[];
  note?: string;
  /** A line done with a grown-up that uses the tasks written for another board's line asking the same thing. */
  tasks?: { syllabus: string; outcome: string };
}
export interface Strand {
  id: string;
  name: string;
  pages: string;
  outcomes: Outcome[];
}
export interface Syllabus {
  id: string;
  version: string;
  board: string;
  class: number;
  title: string;
  source: { read: string; url: string; accessed: string; official: boolean; note: string };
  licence: string;
  review: string;
  strands: Strand[];
}

/** Where a line's tasks with a grown-up are kept: its own, or the line it borrows them from. */
export const taskLine = (s: Syllabus, o: Outcome): { syllabus: string; outcome: string } => o.tasks ?? { syllabus: s.id, outcome: o.id };

export function syllabusProblems(s: Syllabus): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const topics = new Set(GRAMMAR.topics.map((t) => t.id));
  for (const st of s.strands)
    for (const o of st.outcomes) {
      if (ids.has(o.id)) out.push(`${o.id}: listed twice`);
      ids.add(o.id);
      if (!["covered", "partly", "guided", "not"].includes(o.coverage)) out.push(`${o.id}: unknown coverage`);
      if (o.coverage === "not" && o.where) out.push(`${o.id}: not covered, yet points to a stream`);
      if (o.coverage !== "not" && !o.where) out.push(`${o.id}: covered, but no stream is named`);
      if (o.coverage !== "covered" && !o.note) out.push(`${o.id}: a gap must say what is missing`);
      if ((o.coverage === "guided") !== (o.where === "guided")) out.push(`${o.id}: a line done with a grown-up points to the guided tasks, and only such a line does`);
      const line = taskLine(s, o);
      if (o.where === "guided" && tasksFor(GUIDED, line.syllabus, line.outcome).length < 2) out.push(`${o.id}: needs at least two tasks to do with a grown-up`);
      if (o.tasks && o.where !== "guided") out.push(`${o.id}: only a line done with a grown-up borrows tasks`);
      if (o.topics && o.where !== "grammar") out.push(`${o.id}: topics belong to the grammar stream`);
      for (const t of o.topics ?? []) {
        if (!topics.has(t)) out.push(`${o.id}: unknown grammar topic ${t}`);
        else if (GRAMMAR.items.filter((i) => i.topic === t).length < 3) out.push(`${o.id}: too few sentences for ${t}`);
      }
    }
  return out;
}

export type Board = "icse" | "cbse" | "tn";
export const BOARDS: { id: Board; name: string }[] = [
  { id: "icse", name: "ICSE" },
  { id: "cbse", name: "CBSE" },
  { id: "tn", name: "Tamil Nadu" },
];
const HELD: Record<Board, unknown[]> = {
  icse: [icse1, icse2, icse3, icse4, icse5, icse6, icse7, icse8],
  cbse: [cbse1, cbse2, cbse3, cbse4, cbse5, cbse6, cbse7, cbse8, cbse9, cbse10, cbse11, cbse12],
  tn: [tn1, tn2, tn3, tn4, tn5, tn6, tn7, tn8, tn9, tn10, tn11, tn12],
};
/** The syllabuses of one board, by class. */
export const syllabusesOf = (board: Board): Syllabus[] => HELD[board].map((x) => x as Syllabus).sort((a, b) => a.class - b.class);
/** Every syllabus held, board by board. */
export const SYLLABUSES: Syllabus[] = BOARDS.flatMap((b) => syllabusesOf(b.id));
export const boardOf = (s: Syllabus): Board => (s.id.startsWith("cbse") ? "cbse" : s.id.startsWith("tn-") ? "tn" : "icse");
/** The class shown first: Class 5 of ICSE, the first class loaded. */
export const DEFAULT_CLASS = 5;
export const DEFAULT_BOARD: Board = "icse";
export const syllabusFor = (cls: number, board: Board = "icse"): Syllabus => syllabusesOf(board).find((x) => x.class === cls) ?? syllabusesOf(board)[0];
for (const s of SYLLABUSES) {
  const problems = syllabusProblems(s);
  if (problems.length) throw new Error(`syllabus ${s.id}: ${problems.slice(0, 5).join("; ")}`);
}

export function coverage(s: Syllabus): Record<Coverage, number> & { total: number } {
  const all = s.strands.flatMap((st) => st.outcomes);
  const n = (c: Coverage) => all.filter((o) => o.coverage === c).length;
  return { covered: n("covered"), partly: n("partly"), guided: n("guided"), not: n("not"), total: all.length };
}
