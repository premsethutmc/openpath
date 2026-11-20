/**
 * School syllabuses for English (content/english/syllabus): what a board lists for a class, in OpenPath's own
 * words, and for each line whether the app covers it and where. A syllabus is an inventory, not content: it copies
 * no curriculum or textbook text, and it does not change what a learner is asked.
 */
import icse1 from "../../../../../content/english/syllabus/icse-class-1.json";
import icse2 from "../../../../../content/english/syllabus/icse-class-2.json";
import icse8 from "../../../../../content/english/syllabus/icse-class-8.json";
import icse3 from "../../../../../content/english/syllabus/icse-class-3.json";
import icse4 from "../../../../../content/english/syllabus/icse-class-4.json";
import icse7 from "../../../../../content/english/syllabus/icse-class-7.json";
import icse5 from "../../../../../content/english/syllabus/icse-class-5.json";
import icse6 from "../../../../../content/english/syllabus/icse-class-6.json";
import { GRAMMAR } from "../grammar-use/grammar-use.ts";
import { GUIDED, tasksFor } from "../guided/guided.ts";

/** guided: done with a grown-up, who ticks what they saw; the app cannot mark it. */
export type Coverage = "covered" | "partly" | "guided" | "not";
export type Where = "words" | "reading" | "listening" | "listen" | "spelling" | "grammar" | "guided" | "writing" | "first" | "passage" | "passage_seen" | "long";
export interface Outcome {
  id: string;
  text: string;
  coverage: Coverage;
  /** The stream that practises it, when one does. */
  where?: Where;
  /** Grammar in use topics that practise it. */
  topics?: string[];
  note?: string;
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
      if (o.where === "guided" && tasksFor(GUIDED, s.id, o.id).length < 2) out.push(`${o.id}: needs at least two tasks to do with a grown-up`);
      if (o.topics && o.where !== "grammar") out.push(`${o.id}: topics belong to the grammar stream`);
      for (const t of o.topics ?? []) {
        if (!topics.has(t)) out.push(`${o.id}: unknown grammar topic ${t}`);
        else if (GRAMMAR.items.filter((i) => i.topic === t).length < 3) out.push(`${o.id}: too few sentences for ${t}`);
      }
    }
  return out;
}

/** The syllabuses held, by class. */
export const SYLLABUSES: Syllabus[] = [icse1, icse2, icse3, icse4, icse5, icse6, icse7, icse8].map((x) => x as unknown as Syllabus).sort((a, b) => a.class - b.class);
/** The class shown first: Class 5, the first class loaded. */
export const DEFAULT_CLASS = 5;
export const syllabusFor = (cls: number): Syllabus => SYLLABUSES.find((x) => x.class === cls) ?? SYLLABUSES[0];
for (const s of SYLLABUSES) {
  const problems = syllabusProblems(s);
  if (problems.length) throw new Error(`syllabus ${s.id}: ${problems.slice(0, 5).join("; ")}`);
}

export function coverage(s: Syllabus): Record<Coverage, number> & { total: number } {
  const all = s.strands.flatMap((st) => st.outcomes);
  const n = (c: Coverage) => all.filter((o) => o.coverage === c).length;
  return { covered: n("covered"), partly: n("partly"), guided: n("guided"), not: n("not"), total: all.length };
}
