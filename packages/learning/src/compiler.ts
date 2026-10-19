/**
 * The mathematics coverage compiler (compiler@1):
 *
 *   Curriculum → Competencies → Problem families → Teaching modules → Assessments → Review → Release
 *
 * For every curriculum requirement (an outcome of a board release) and every competency it maps to, twelve criteria
 * are checked from the content itself, never from a count of files:
 *
 *    1 graph        a valid graph definition (known id, name, strand, grade range)
 *    2 relations    its relations are well formed: no cycle through it, none of its incoming relations disputed
 *    3 diagnostic   diagnostic questions (at least 3 in its module's diagnostic pool)
 *    4 misconception  misconception detection: its diagnostic questions predict wrong answers with explanations
 *    5 strategy     at least one teaching strategy
 *    6 worked       worked examples (a strategy or chapter screen with worked steps)
 *    7 guided       guided practice
 *    8 independent  independent assessment: checks and a transfer question, in two answer formats
 *    9 retention    delayed retention questions (the module's delayed check, and a retention pool)
 *   10 variants     enough non-repeating variants for every phase (depth@1)
 *   11 validation   reliable mathematical validation (every family it uses passes spec@1 validation)
 *   12 review       educator-review evidence (module and families approved or released, unchanged)
 *
 * A competency marked by an educator (written@1: proofs, constructions) meets 3–10 through written tasks and
 * component questions instead (marked by people, never automatically).
 *
 * Requirement classes (the directive's five):
 *   validated      every mapped competency meets all twelve
 *   awaiting       every mapped competency meets 1–11 (complete; not yet educator-approved)
 *   partial        something exists for at least one mapped competency, but not everything
 *   unsupported    the outcome needs a kind of answer OpenPath cannot take or mark yet, and nothing exists
 *   not-implemented  no content, no mapping, or the outcome is not yet in the inventory
 */
import { allOutcomesOf, type CurriculumRelease } from "./curriculum";
import { moduleFor, question, type Module } from "./content";
import { RETENTION_CHECK } from "./evidence";
import { FAMILIES, phasePool } from "./families";
import { graph } from "./graph";
import { DEPTH_POLICY, modulePhasePool, moduleQuestions, poolDepth } from "./library";
import { familiesOf, familyReviewOf, reviewOf } from "./review";
import { validateFamily } from "./spec";
import { validateModule } from "./validate";
import { tasksFor, writtenTasks } from "./written";
import oamData from "../../../content/learning/outcome-assessment.v1.json";
import expansion from "../../../content/learning/competency-expansion.v1.json";

export const COMPILER_POLICY = "compiler@1";
export const CRITERIA = ["graph", "relations", "diagnostic", "misconception", "strategy", "worked", "guided", "independent", "retention", "variants", "validation", "review"] as const;
export type Criterion = (typeof CRITERIA)[number];
export type RequirementClass = "validated" | "awaiting" | "partial" | "unsupported" | "not-implemented";
export const CLASS_LABEL: Record<RequirementClass, string> = { validated: "Fully implemented and validated", awaiting: "Implemented, awaiting educator review", partial: "Partially implemented", unsupported: "Unsupported", "not-implemented": "Not yet implemented" };

export interface CompetencyCheck {
  id: string;
  name: string;
  grades: [number, number];
  mode: "automatic" | "educator-marked";
  met: Record<Criterion, boolean>;
  missing: string[];
  families: string[];
  writtenTasks: number;
  complete: boolean;
}

/** oam@1: for each curriculum outcome, what really assesses it (an AI judgement from the content itself, provisional
 * until an educator reviews it; content/learning/outcome-assessment.v1.json). An outcome is complete only where it says
 * "full"; an outcome it has not judged is never claimed. */
type Assessed = { outcome: string; verdict: "full" | "partial" | "none"; families: string[]; written: string[]; authored: boolean; missing: string; grade: "fit" | "below" | "above" };
const assessedBy = new Map((oamData as { outcomes: Assessed[] }).outcomes.map((o) => [o.outcome, o]));
export const outcomeAssessment = (id: string) => assessedBy.get(id) ?? null;
/** A competency on a cycle of followed prerequisites (A needs B needs … A): the order cannot be honoured. */
function onCycle(id: string): boolean {
  const seen = new Set<string>();
  const stack = [...graph.supportsOf(id)];
  while (stack.length) {
    const x = stack.pop()!;
    if (x === id) return true;
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...graph.supportsOf(x));
  }
  return false;
}
const disputedInto = new Set((expansion as { disputed: { target: string }[] }).disputed.map((d) => d.target));
const validation = new Map<string, boolean>();
const familyOk = (f: string) => {
  if (!validation.has(f)) validation.set(f, validateFamily(f).ok);
  return validation.get(f)!;
};
const ok = (s: string) => s === "approved" || s === "released";
const cache = new Map<string, CompetencyCheck>();

/** The twelve criteria for one competency (cached; content does not change while the process runs). */
export function checkCompetency(id: string): CompetencyCheck {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = graph.get(id);
  const m: Module | null = moduleFor(id);
  const written = tasksFor(id);
  const fams = m ? familiesOf(m) : [...FAMILIES.values()].filter((f) => f.competency === id && f.domain).map((f) => f.id);
  const q = m ? moduleQuestions(m) : null;
  const depth = m ? poolDepth(m) : null;
  const pool = m?.pool?.family;
  const diag = pool ? phasePool(pool, "diagnostic") : m?.diagnostics ?? [];
  const predicts = diag.filter((x) => (question(x).misconceptions ?? []).length > 0).length;
  const alone = q ? [...q.check, ...q.practice, ...q.transfer, ...q.retention] : [];
  // educator-marked (written@1): its assessment is written tasks an educator marks, with auto-marked component questions
  const educator = written.length > 0 && (!m || !m.pool);
  const listed = m ? Object.values(moduleQuestions(m)).flat() : [];
  const met: Record<Criterion, boolean> = {
    graph: !!c.name && !!c.strand && c.gradeRange[0] >= 1 && c.gradeRange[1] <= 12,
    relations: !disputedInto.has(id) && !onCycle(id),
    diagnostic: educator ? (m ? m.diagnostics.length >= 1 : false) : diag.length >= 3,
    misconception: educator ? written.every((t) => t.rubric.length >= 2) : diag.length > 0 && predicts / diag.length >= 0.5,
    strategy: !!m && m.strategies.length > 0,
    worked: !!m && [...m.chapter, ...m.strategies.flatMap((s) => s.screens)].some((s) => (s.math ?? []).length > 0),
    guided: !!m && m.strategies.every((s) => !!s.guided),
    independent: educator ? !!m && m.transfer.some((x) => question(x).type === "written") && written.length >= 2 : !!m && m.transfer.some((x) => !x.startsWith("gen:") || x.endsWith(":w")) && new Set(alone.map((x) => `${question(x).type}${x.endsWith(":w") ? "-situation" : ""}`)).size >= 2,
    retention: educator ? !!m && m.retention.length >= RETENTION_CHECK && written.length >= 3 : !!m && m.retention.length >= RETENTION_CHECK && (!pool || modulePhasePool(m!, "retention").length >= DEPTH_POLICY.minimum.retention),
    variants: educator ? written.length >= 3 && listed.filter((x) => question(x).type === "written").length >= 2 : !!depth?.sufficient,
    validation: !!m && validateModule(m).length === 0 && fams.every(familyOk),
    review: !!m && ok(reviewOf(id).state) && fams.every((f) => ok(familyReviewOf(f).state)),
  };
  const missing = CRITERIA.filter((k) => !met[k]);
  const out: CompetencyCheck = { id, name: c.name, grades: c.gradeRange, mode: educator ? "educator-marked" : "automatic", met, missing, families: fams, writtenTasks: written.length, complete: CRITERIA.slice(0, 11).every((k) => met[k]) };
  cache.set(id, out);
  return out;
}

export interface RequirementRow {
  release: string;
  board: string;
  grade: number;
  domain: string;
  chapter: string;
  section: string | null;
  outcome: string;
  text: string;
  competencies: string[];
  class: RequirementClass;
  why: string;
}
const NEEDS_PEOPLE = /\b(prove|proof|construct|draw|sketch|justify|explain|design|create|pose|investigate|critique)\b/i;

/** Every requirement of a release, classified. */
export function compileRelease(r: CurriculumRelease): RequirementRow[] {
  return allOutcomesOf(r).map(({ outcome, chapter, sections }) => {
    // a micro-skill is assessed through its competency (MLY.mult.facts-6-9 → multiplication facts)
    const comps = [...new Set(outcome.mapping.competencies.filter((m) => m.status === "accepted").map((m) => (graph.byId.has(m.id) ? graph.evidenceTarget(m.id) : m.id)))];
    const checks = comps.map(checkCompetency);
    const anything = checks.some((c) => c.met.strategy || c.met.diagnostic || c.families.length > 0 || c.writtenTasks > 0);
    // how the outcome is assessed: the inventory records it (boards@1 put it in the mapping's reason); otherwise the wording
    const why0 = outcome.mapping.why ?? "";
    const byPeople = /\(marked by an educator/.test(why0) || (!/\((partly )?marked/.test(why0) && NEEDS_PEOPLE.test(outcome.text));
    // written@2: an outcome with a part only an educator can mark (a proof, construction, sketch or justification) is
    // complete only when a mapped competency offers a written task for it; the automatic part alone is partial
    const peoplePart = /\((partly )?marked by an educator/.test(why0) || (!/\(marked automatically/.test(why0) && NEEDS_PEOPLE.test(outcome.text));
    // … and the written task must be written for THIS outcome (its "serves"), not merely exist for the competency
    const peopleMissing = peoplePart && !writtenTasks.some((t) => (t.serves ?? []).includes(outcome.id) && comps.includes(graph.evidenceTarget(t.competency)));
    // the level: the outcome's grade within a grade of a mapped competency's range
    const gradeOff = comps.length > 0 && !checks.some((c) => c.grades[0] - 1 <= r.grade && r.grade <= c.grades[1] + 1);
    // oam@1: what the content really assesses (every part of the statement, at its level)
    const oa = outcomeAssessment(outcome.id);
    const notAssessed = !oa ? "not yet judged against the content (outcome-assessment map)" : oa.verdict !== "full" ? `not every part is assessed: ${oa.missing || oa.verdict}` : oa.grade !== "fit" ? `assessed ${oa.grade} the outcome's level` : "";
    const done = (ok: boolean) => ok && !peopleMissing && !gradeOff && !notAssessed;
    const cls: RequirementClass = !comps.length || (oa?.verdict === "none" && !anything) ? "not-implemented" : oa?.verdict === "none" ? (byPeople ? "unsupported" : "not-implemented") : done(checks.every((c) => CRITERIA.every((k) => c.met[k]))) ? "validated" : done(checks.every((c) => c.complete)) ? "awaiting" : anything ? "partial" : byPeople ? "unsupported" : "not-implemented";
    const why =
      cls === "not-implemented" && !comps.length ? "No competency is mapped to this outcome."
      : cls === "unsupported" ? "Needs written reasoning, a construction or a drawing, and no educator-marked tasks or teaching exist yet."
      : cls === "validated" ? "Complete, validated and educator-approved."
      : `${[...checks.filter((c) => !c.complete).map((c) => `${c.name}: missing ${c.missing.filter((m) => m !== "review").join(", ") || "review"}`), ...(peopleMissing ? ["the part an educator marks (proof, construction, sketch or justification) has no written task for this outcome"] : []), ...(gradeOff ? ["the mapped skills are taught at another level"] : []), ...(notAssessed ? [notAssessed] : [])].join("; ") || "Awaiting educator review."}`;
    return { release: `${r.id}@${r.version}`, board: r.source.board ?? "", grade: r.grade, domain: chapter.unit?.title ?? "", chapter: chapter.title, section: sections.at(-1)?.title ?? null, outcome: outcome.id, text: outcome.text, competencies: comps, class: cls, why };
  });
}

/** What to build next: competencies the curricula need and that are not complete, prerequisites first, then by how
 * many requirements (outcomes, across boards and grades) are waiting on each. */
export function priorities(rows: RequirementRow[]) {
  const demand = new Map<string, number>();
  for (const r of rows) for (const c of r.competencies) demand.set(c, (demand.get(c) ?? 0) + 1);
  const open = [...demand.keys()].filter((c) => !checkCompetency(c).complete);
  const depth = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = graph.supportsOf(id).filter((p) => graph.relationsOf(id).find((x) => x.from === p)?.type !== "support");
    return ps.length ? 1 + Math.max(...ps.map((p) => depth(p, seen))) : 0;
  };
  return open
    .map((id) => ({ id, name: graph.get(id).name, grades: graph.get(id).gradeRange, depth: depth(id), demand: demand.get(id)!, missing: checkCompetency(id).missing }))
    .sort((a, b) => a.depth - b.depth || b.demand - a.demand || a.grades[0] - b.grades[0] || a.id.localeCompare(b.id));
}
