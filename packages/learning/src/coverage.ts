/**
 * Coverage (coverage@1): what the platform can do for a curriculum, measured separately for each kind of content, so
 * that a working platform is never mistaken for complete, validated content.
 *
 *   extracted     curriculum requirements read from the textbook (chapters, sections, outcomes)
 *   mapped        outcomes mapped to a competency (accepted in the reviewed release)
 *   diagnostic    competencies with exploratory diagnostic questions
 *   strategies    competencies with at least one teaching strategy
 *   practice      competencies with at least two practice questions
 *   independent   competencies with independent assessment: a transfer question and two answer formats among the
 *                 questions answered alone (the shared engine needs two contexts to demonstrate a skill)
 *   retention     competencies with a full delayed check (RETENTION_CHECK questions)
 *   approved      competencies whose module an educator approved (and released, unchanged)
 *
 * A competency counts as having a LEARNING MODULE only when its module validates (validate@1); a module with gaps is
 * "partial" and is listed with what it lacks.
 */
import { allOutcomesOf, assigned, SUPPORTED_SUBJECTS, type CurriculumRelease, type Section } from "./curriculum";
import { moduleFor, moduleOrigin, question } from "./content";
import { RETENTION_CHECK } from "./evidence";
import { FAMILIES } from "./families";
import { graph } from "./graph";
import { moduleQuestions } from "./library";
import { reviewOf } from "./review";
import { validateModule } from "./validate";
import { poolDepth } from "./library";
import { familiesOf, familyReviewOf } from "./review";
import libraryData from "../../../content/learning/library.v1.json";
const notBuiltReason = (id: string) => ((libraryData as { notBuilt?: { competency: string; reason: string }[] }).notBuilt ?? []).find((n) => n.competency === id)?.reason.replace(/^library@\d: /, "") ?? null;

export const COVERAGE_POLICY = "coverage@2";
/**
 * The coverage matrix (coverage@2): one status per competency, never inflated by counting a generated question as a
 * learning module.
 *   approved     complete (a module that validates, with a question family whose pool is deep enough for diagnosis,
 *                practice, reassessment and the delayed check) AND the module and every family it uses are
 *                educator-approved (or released)
 *   awaiting     complete, but not yet approved
 *   partial      something exists but is not complete: a module with gaps, a module with no question family (only its
 *                listed questions, so a learner can run out), a pool too small (depth@1), or a family with no module
 *   unsupported  no content, and the competency needs a question type OpenPath cannot mark automatically (proofs,
 *                constructions, written arguments, diagrams)
 *   none         no content yet
 */
export type MatrixStatus = "approved" | "awaiting" | "partial" | "unsupported" | "none";
export const MATRIX_LABEL: Record<MatrixStatus, string> = { approved: "Complete and educator-approved", awaiting: "Complete, awaiting review", partial: "Partially supported", unsupported: "Unsupported question type", none: "No content" };
const UNSUPPORTED_TYPE: [RegExp, string][] = [
  [/\b(prove|proof|deductive|axioms?)\b/i, "proof"],
  [/\b(construct|constructions?)\b(?! measures)/i, "geometric construction"],
  [/\b(justify|argument|generalisation|counterexamples?|logic|implications?)\b/i, "written reasoning"],
  [/\b(charts?|graphs?|pictographs?|diagrams?|nets?|sketch|draw|plot|tessellat|symmetry|transformations?|maps?)\b/i, "diagram or drawing"],
];
/** The question type a competency needs that is not supported (a stated rule over its name), or null. */
export const unsupportedType = (id: string) => UNSUPPORTED_TYPE.find(([r]) => r.test(graph.get(id).name))?.[1] ?? null;
export const CATEGORIES = ["diagnostic", "strategies", "practice", "independent", "retention", "approved"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CompetencyCoverage {
  id: string;
  name: string;
  strand: string;
  grades: [number, number];
  module: "module" | "partial" | "none";
  origin: "authored" | "synthesised" | null;
  missing: string[];
  review: string;
  families: string[];
  has: Record<Category, boolean>;
  /** depth@1: whether the module's family pool can supply every phase (null: no pool). */
  depth: { sufficient: boolean; short: string[]; counts: Record<string, number> } | null;
  /** Review state of each family the module uses. */
  familyReview: Record<string, string>;
  status: MatrixStatus;
  why: string;
}
export function competencyCoverage(id: string): CompetencyCoverage {
  const c = graph.get(id);
  const m = moduleFor(id);
  const missing = m ? validateModule(m) : ["no module"];
  const q = m ? moduleQuestions(m) : null;
  const alone = q ? [...q.check, ...q.practice, ...q.transfer, ...q.retention] : [];
  const r = reviewOf(id);
  const depth = m ? poolDepth(m) : null;
  const fams = m ? familiesOf(m) : [];
  const familyReview = Object.fromEntries(fams.map((f) => [f, familyReviewOf(f).state]));
  const familyHere = [...FAMILIES.values()].filter((f) => f.competency === id && f.domain).map((f) => f.id);
  const ok = (st: string) => st === "approved" || st === "released";
  const complete = !!m && missing.length === 0 && !!depth?.sufficient;
  const status: MatrixStatus = complete ? (ok(r.state) && fams.every((f) => ok(familyReview[f])) ? "approved" : "awaiting") : m || familyHere.length ? "partial" : unsupportedType(id) ? "unsupported" : "none";
  const why =
    status === "approved" ? "Module and question families approved."
    : status === "awaiting" ? `Complete; awaiting educator review (module ${r.state}; families ${fams.map((f) => `${f} ${familyReview[f]}`).join(", ")}).`
    : status === "partial" ? (!m ? `A question family (${familyHere.join(", ")}) but no module: ${notBuiltReason(id) ?? "no teaching yet"}.` : missing.length ? `Module incomplete: ${missing.join("; ")}.` : !depth ? "No question family: only the module's own questions, so a learner can run out." : `Question pool too small for: ${depth.short.join(", ")}.`)
    : status === "unsupported" ? `Needs ${unsupportedType(id)}, which is not marked automatically.`
    : "No content yet.";
  return {
    id,
    name: c.name,
    strand: c.strand,
    grades: c.gradeRange,
    module: !m ? "none" : missing.length ? "partial" : "module",
    origin: moduleOrigin(id),
    missing: m ? missing : [],
    review: r.state,
    families: [...FAMILIES.values()].filter((f) => f.competency === id).map((f) => f.id),
    has: {
      diagnostic: !!m && m.diagnostics.length > 0,
      strategies: !!m && m.strategies.length > 0,
      practice: !!m && m.practice.length >= 2,
      independent: !!m && m.transfer.length > 0 && new Set(alone.map((x) => question(x).type)).size >= 2,
      retention: !!m && m.retention.length >= RETENTION_CHECK,
      approved: r.state === "approved" || r.state === "released",
    },
    depth: depth ? { sufficient: depth.sufficient, short: depth.short, counts: depth.counts } : null,
    familyReview,
    status,
    why,
  };
}

export interface ReleaseCoverage {
  id: string;
  version: string;
  grade: number;
  title: string;
  board?: string;
  subject: string;
  supported: boolean;
  extracted: { chapters: number; sections: number; outcomes: number; examples: number; exercises: number };
  mapping: { clear: number; uncertain: number; missing: number; unsupported: number; accepted: number; proposals: number };
  competencies: CompetencyCoverage[];
  counts: Record<Category, number> & { module: number; partial: number; none: number; total: number };
  matrix: Record<MatrixStatus, number>;
}
export const matrixOf = (cs: CompetencyCoverage[]) => Object.fromEntries((Object.keys(MATRIX_LABEL) as MatrixStatus[]).map((k) => [k, cs.filter((c) => c.status === k).length])) as Record<MatrixStatus, number>;
const sectionsIn = (ss: Section[] | undefined): Section[] => (ss ?? []).flatMap((s) => [s, ...sectionsIn(s.sections)]);

export function releaseCoverage(r: CurriculumRelease): ReleaseCoverage {
  const outs = allOutcomesOf(r);
  const v = (k: string) => outs.filter((o) => o.outcome.mapping.verdict === k).length;
  const ids = [...new Set(assigned(r).map((a) => a.competency))];
  const comps = ids.map(competencyCoverage);
  const counts = Object.fromEntries(CATEGORIES.map((k) => [k, comps.filter((c) => c.has[k]).length])) as Record<Category, number>;
  const chapters = r.subjects.flatMap((s) => s.chapters);
  const secs = chapters.flatMap((c) => sectionsIn(c.sections));
  return {
    id: r.id,
    version: r.version,
    grade: r.grade,
    title: r.title,
    board: r.source.board,
    subject: r.subjects.map((s) => s.name).join(", "),
    supported: r.subjects.every((s) => s.supported !== false),
    extracted: { chapters: chapters.length, sections: secs.length, outcomes: outs.length, examples: [...chapters, ...secs].reduce((n, c) => n + c.examples.length, 0), exercises: [...chapters, ...secs].reduce((n, c) => n + c.exercises.length, 0) },
    mapping: { clear: v("clear"), uncertain: v("uncertain"), missing: v("missing"), unsupported: v("unsupported"), accepted: outs.filter((o) => o.outcome.mapping.competencies.some((m) => m.status === "accepted")).length, proposals: outs.filter((o) => o.outcome.mapping.proposal).length },
    competencies: comps,
    matrix: matrixOf(comps),
    counts: { ...counts, module: comps.filter((c) => c.module === "module").length, partial: comps.filter((c) => c.module === "partial").length, none: comps.filter((c) => c.module === "none").length, total: comps.length },
  };
}

/** The whole competency graph (competencies, not micro-skills), by strand and grade. */
export function graphCoverage() {
  const comps = graph.competencies.filter((c) => !c.partOf).map((c) => competencyCoverage(c.id));
  const counts = Object.fromEntries(CATEGORIES.map((k) => [k, comps.filter((c) => c.has[k]).length])) as Record<Category, number>;
  const byGrade = new Map<number, { total: number; module: number; partial: number }>();
  for (const c of comps)
    for (let g = c.grades[0]; g <= c.grades[1]; g++) {
      const row = byGrade.get(g) ?? { total: 0, module: 0, partial: 0 };
      row.total++;
      if (c.module === "module") row.module++;
      if (c.module === "partial") row.partial++;
      byGrade.set(g, row);
    }
  return { matrix: matrixOf(comps), total: comps.length, module: comps.filter((c) => c.module === "module").length, partial: comps.filter((c) => c.module === "partial").length, counts, byGrade: [...byGrade.entries()].sort((a, b) => a[0] - b[0]), competencies: comps };
}

/** What is explicitly not supported (stated, never guessed around). */
export const UNSUPPORTED = {
  subjects: `Every subject except ${SUPPORTED_SUBJECTS.join(", ")}: a textbook in another subject is read and kept, and its outcomes are marked "not supported yet"; nothing is mapped or taught.`,
  formats: [
    "Scanned PDFs (no text layer): reading them needs OCR, which is not available here, so they are declined.",
    "Word, EPUB, image and slide files: not read; text, Markdown and PDF (text layer) are.",
    "AI-assisted extraction or mapping: refused unless the owner approves it, with a cost limit and human review.",
  ],
  questionTypes: [
    "Proofs, written explanations and constructions (marked by a person, not automatically).",
    "Drawing or sketching graphs and diagrams.",
    "Expressions as answers in generated questions (hand-written modules accept polynomials; generated ones ask for numbers, sets or a choice).",
    "Problems outside the supported problem families (they are declined with a reason, never guessed at).",
  ],
} as const;
