/**
 * Curriculum ingestion: a structured textbook (or curriculum specification) → a draft curriculum → competency mapping
 * proposals → an explicit review → a versioned release that can be assigned to a learner.
 *
 * Deterministic: no language model is called (no paid calls). The mapping is a scored text match against the existing
 * competency graph (names, objectives, grade range); every proposal is `proposed` until a person accepts it, and a
 * release records who reviewed it and that it is NOT educator-reviewed. An outcome that matches nothing becomes a
 * provisional competency proposal with its textbook reference; it is never registered as a competency.
 */
import { extractPlain, extractStructured, type ExtractedDocument } from "./extract";
import { graph, type Competency } from "./graph";
import { interpret } from "./meaning";

export interface SourceRef {
  textbook: string;
  chapter: string;
  pages?: string;
}
export interface Mapping {
  id: string;
  score: number;
  method: "text-match@1" | "meaning@2";
  status: "proposed" | "accepted" | "rejected";
}
export interface ProvisionalCompetency {
  id: string;
  name: string;
  status: "provisional-proposal";
  source: SourceRef;
  note: string;
}
export interface Outcome {
  id: string;
  text: string;
  pages?: string;
  mapping: {
    competencies: Mapping[];
    proposal?: ProvisionalCompetency;
    /** meaning@2: clear, uncertain (a reviewer must choose) or missing (no competency carries it), and why. */
    verdict?: "clear" | "uncertain" | "missing";
    why?: string;
    concepts?: string[];
  };
  /** Where the outcome is in the source document. */
  location?: { page?: number; line: number };
}
export interface Chapter {
  id: string;
  number: number;
  title: string;
  pages?: string;
  outcomes: Outcome[];
  examples: { title: string; pages?: string }[];
  exercises: { ref: string; pages?: string }[];
}
export interface CurriculumRelease {
  id: string;
  version: string;
  status: "draft" | "reviewed";
  grade: number;
  title: string;
  hash: string;
  source: { kind: "textbook"; title: string; edition?: string; publisher?: string; board?: string; academicYear?: string; licence?: string; synthetic: boolean; extractor?: string };
  review: { by: string; at: string; note: string; educatorReviewed: false } | null;
  subjects: { id: string; name: string; chapters: Chapter[] }[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const pagesOf = (s: string) => s.match(/\((?:pp?\.)\s*([\d]+(?:\s*[–-]\s*\d+)?)\)\s*$/)?.[1]?.replace(/\s*[–-]\s*/, "–");
const withoutPages = (s: string) => s.replace(/\s*\((?:pp?\.)\s*[\d]+(?:\s*[–-]\s*\d+)?\)\s*$/, "").trim();

/** A stable content hash (FNV-1a over the JSON), so an assigned release can be checked for change. */
export function hashOf(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export class ParseError extends Error {}

/** Parse the structured textbook format (content/learning/textbooks/README.md). */
export function parseTextbook(text: string): { meta: Record<string, string>; chapters: (Omit<Chapter, "outcomes"> & { outcomes: { text: string; pages?: string }[] })[] } {
  const lines = text.replace(/\r/g, "").split("\n");
  const meta: Record<string, string> = {};
  let i = 0;
  if (lines[0]?.trim() === "---") {
    for (i = 1; i < lines.length && lines[i].trim() !== "---"; i++) {
      const m = lines[i].match(/^([a-zA-Z]+):\s*(.+)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
    }
    i++;
  }
  const chapters: { id: string; number: number; title: string; pages?: string; outcomes: { text: string; pages?: string }[]; examples: { title: string; pages?: string }[]; exercises: { ref: string; pages?: string }[] }[] = [];
  let section: "outcomes" | "examples" | "exercises" | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const ch = line.match(/^#\s+Chapter\s+(\d+)\s*[:.]\s*(.+)$/i);
    if (ch) {
      const title = withoutPages(ch[2]);
      chapters.push({ id: `ch${ch[1]}-${slug(title)}`, number: Number(ch[1]), title, pages: pagesOf(ch[2]), outcomes: [], examples: [], exercises: [] });
      section = null;
      continue;
    }
    const sec = line.match(/^##\s+(.+)$/);
    if (sec) {
      const t = sec[1].toLowerCase();
      section = t.includes("outcome") ? "outcomes" : t.includes("example") ? "examples" : t.includes("exercise") ? "exercises" : null;
      continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item && chapters.length && section) {
      const c = chapters.at(-1)!;
      const body = withoutPages(item[1]);
      const pages = pagesOf(item[1]);
      if (section === "outcomes") c.outcomes.push({ text: body, pages });
      else if (section === "examples") c.examples.push({ title: body, pages });
      else c.exercises.push({ ref: body, pages });
    }
  }
  if (!chapters.length) throw new ParseError("No chapters found. Each chapter starts with a line like “# Chapter 1: Fractions (pp. 1–20)”.");
  if (!meta.grade || !Number.isInteger(Number(meta.grade))) throw new ParseError("The front matter needs a whole-number grade (for example “grade: 4”).");
  return { meta, chapters };
}

// ---------------------------------------------------------------- mapping onto the competency graph

const STOP = new Set("a an and the of to in on with by for from using use up into as or at is are be their its whole numbers number".split(" "));
const stem = (w: string) => w.replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "");
export const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);

function score(outcome: string, c: Competency, grade: number): number {
  const o = new Set(words(outcome));
  if (!o.size) return 0;
  const name = new Set(words(c.name));
  const more = new Set(words([c.description ?? "", ...(c.objectives ?? [])].join(" ")));
  let hit = 0;
  for (const w of o) hit += name.has(w) ? 1 : more.has(w) ? 0.4 : 0;
  const overlap = hit / Math.max(o.size, name.size);
  const [lo, hi] = c.gradeRange;
  const distance = grade < lo ? lo - grade : grade > hi ? grade - hi : 0;
  return Math.round(Math.max(0, overlap - 0.08 * distance) * 1000) / 1000;
}

/** Best competencies for one outcome (scored; nothing is accepted here). */
export function propose(outcome: string, grade: number, limit = 3, threshold = 0.34): Mapping[] {
  return graph.competencies
    .filter((c) => !c.id.startsWith("MLY."))
    .map((c) => ({ id: c.id, score: score(outcome, c, grade), method: "text-match@1" as const, status: "proposed" as const }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/**
 * A document (text, or an already extracted document) → a draft curriculum with mapping proposals by meaning
 * (mapping@2). Status "draft": nothing is assignable until reviewed.
 */
export function synthesise(input: string | ExtractedDocument, opts: { id?: string; version?: string } = {}): CurriculumRelease {
  const doc = typeof input === "string" ? (input.trimStart().startsWith("---") ? extractStructured(input) : extractPlain(input)) : input;
  const { meta, chapters } = doc;
  const grade = Number(meta.grade);
  const title = meta.title ?? `Grade ${grade} curriculum`;
  const synthetic = /synthetic|sample|test|not a real/i.test(`${meta.board ?? ""} ${meta.publisher ?? ""} ${meta.edition ?? ""}`);
  const subject = meta.subject ?? "Mathematics";
  const body = {
    subjects: [
      {
        id: slug(subject),
        name: subject,
        chapters: chapters.map((c) => {
          const cid = `ch${c.number}-${slug(c.title)}`;
          return {
            id: cid,
            number: c.number,
            title: c.title,
            pages: c.pages,
            examples: c.examples,
            exercises: c.exercises,
            outcomes: c.outcomes.map((o, k) => {
              const meaning = interpret(o.text, grade);
              const id = `${cid}.o${k + 1}`;
              const competencies: Mapping[] = meaning.candidates.map((m) => ({ id: m.id, score: m.score, method: "meaning@2", status: "proposed" }));
              return {
                id,
                text: o.text,
                pages: o.pages,
                location: o.location,
                mapping: {
                  competencies,
                  verdict: meaning.verdict,
                  why: meaning.why,
                  concepts: meaning.concepts,
                  ...(meaning.verdict === "missing"
                    ? { proposal: { id: `proposal.${slug(title)}.${id}`, name: o.text, status: "provisional-proposal" as const, source: { textbook: title, chapter: c.title, pages: o.pages }, note: "No existing competency carries this outcome's mathematics. Recorded as a proposal with its textbook reference; it is not a registered competency and has no questions." } }
                    : {}),
                },
              };
            }),
          };
        }),
      },
    ],
  };
  const release: CurriculumRelease = {
    id: opts.id ?? `${slug(title)}`,
    version: opts.version ?? "1.0.0",
    status: "draft",
    grade,
    title,
    hash: "",
    source: { kind: "textbook", title, edition: meta.edition, publisher: meta.publisher, board: meta.board, ...(meta.academicYear ? { academicYear: meta.academicYear } : {}), licence: meta.licence, synthetic, extractor: doc.provenance.extractor },
    review: null,
    ...body,
  };
  release.hash = hashOf({ ...release, hash: "" });
  return release;
}

export interface ReviewDecision {
  outcome: string;
  accept: string[];
}

/**
 * The explicit review that turns a draft into an assignable release. Only listed competencies are accepted for each
 * outcome; every other proposal is rejected. Records who reviewed it, and that it is not an educator review.
 */
export function review(draft: CurriculumRelease, decisions: ReviewDecision[] | "accept-proposals", by: string, at: string, note = "Reviewed by the account owner in OpenPath. Not an educator review."): CurriculumRelease {
  if (draft.status !== "draft") throw new Error("Only a draft can be reviewed");
  const decided = decisions === "accept-proposals" ? null : new Map(decisions.map((d) => [d.outcome, new Set(d.accept)]));
  const subjects = draft.subjects.map((s) => ({
    ...s,
    chapters: s.chapters.map((c) => ({
      ...c,
      outcomes: c.outcomes.map((o) => {
        // "accept-proposals" accepts the top proposal of a CLEAR mapping only; an uncertain one needs an explicit decision
        const keep = decided ? decided.get(o.id) ?? new Set<string>() : new Set(o.mapping.verdict === "uncertain" ? [] : o.mapping.competencies.slice(0, 1).map((m) => m.id));
        for (const id of keep) if (!graph.byId.has(id)) throw new Error(`Unknown competency ${id}`);
        const listed = o.mapping.competencies.map((m) => ({ ...m, status: keep.has(m.id) ? ("accepted" as const) : ("rejected" as const) }));
        // a reviewer may also add a competency the matcher did not propose
        for (const id of keep) if (!listed.some((m) => m.id === id)) listed.push({ id, score: 0, method: "text-match@1", status: "accepted" });
        return { ...o, mapping: { ...o.mapping, competencies: listed } };
      }),
    })),
  }));
  const release: CurriculumRelease = { ...draft, subjects, status: "reviewed", review: { by, at, note, educatorReviewed: false }, hash: "" };
  release.hash = hashOf({ ...release, hash: "" });
  return release;
}

/** The competencies a release assigns (accepted mappings only), in book order. */
export function assigned(release: CurriculumRelease): { competency: string; outcome: Outcome; chapter: Chapter; subject: string }[] {
  if (release.status !== "reviewed") return [];
  const out: { competency: string; outcome: Outcome; chapter: Chapter; subject: string }[] = [];
  for (const s of release.subjects)
    for (const c of s.chapters)
      for (const o of c.outcomes) for (const m of o.mapping.competencies) if (m.status === "accepted") out.push({ competency: m.id, outcome: o, chapter: c, subject: s.name });
  return out;
}

export function validateRelease(r: CurriculumRelease): string[] {
  const errors: string[] = [];
  if (r.hash !== hashOf({ ...r, hash: "" })) errors.push("hash does not match the content");
  if (r.status === "reviewed" && !r.review) errors.push("a reviewed release needs its review record");
  if (r.review && r.review.educatorReviewed !== false) errors.push("educator review is never claimed by this pipeline");
  for (const a of assigned(r)) if (!graph.byId.has(a.competency)) errors.push(`unknown competency ${a.competency}`);
  return errors;
}
