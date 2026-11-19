/**
 * School syllabuses for English (content/english/syllabus): what a board lists for a class, in OpenPath's own
 * words, and for each line whether the app covers it and where. A syllabus is an inventory, not content: it copies
 * no curriculum or textbook text, and it does not change what a learner is asked.
 */
import icse5 from "../../../../../content/english/syllabus/icse-class-5.json";
import { GRAMMAR } from "../grammar-use/grammar-use.ts";

export type Coverage = "covered" | "partly" | "not";
export type Where = "words" | "reading" | "listening" | "spelling" | "grammar";
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
      if (!["covered", "partly", "not"].includes(o.coverage)) out.push(`${o.id}: unknown coverage`);
      if (o.coverage === "not" && o.where) out.push(`${o.id}: not covered, yet points to a stream`);
      if (o.coverage !== "not" && !o.where) out.push(`${o.id}: covered, but no stream is named`);
      if (o.coverage !== "covered" && !o.note) out.push(`${o.id}: a gap must say what is missing`);
      if (o.topics && o.where !== "grammar") out.push(`${o.id}: topics belong to the grammar stream`);
      for (const t of o.topics ?? []) {
        if (!topics.has(t)) out.push(`${o.id}: unknown grammar topic ${t}`);
        else if (GRAMMAR.items.filter((i) => i.topic === t).length < 3) out.push(`${o.id}: too few sentences for ${t}`);
      }
    }
  return out;
}

export const SYLLABUSES: Syllabus[] = [icse5 as unknown as Syllabus];
for (const s of SYLLABUSES) {
  const problems = syllabusProblems(s);
  if (problems.length) throw new Error(`syllabus ${s.id}: ${problems.slice(0, 5).join("; ")}`);
}

export function coverage(s: Syllabus): Record<Coverage, number> & { total: number } {
  const all = s.strands.flatMap((st) => st.outcomes);
  const n = (c: Coverage) => all.filter((o) => o.coverage === c).length;
  return { covered: n("covered"), partly: n("partly"), not: n("not"), total: all.length };
}
