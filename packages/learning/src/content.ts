/**
 * Learning content: skill modules, questions, decomposed problems and goal pathways (content/learning/*.v1.json).
 * Marking is deterministic and checks mathematical equivalence (packages/mathematics/src/answers.ts): 2/4 = 1/2,
 * "x^2+2x" = "2x + x^2", "2, -1" = "-1,2" for sets.
 */
import { canonicalInteger, unbrace } from "./answer-core";
import data from "../../../content/learning/modules.v1.json";
import problemsData from "../../../content/learning/problems.v1.json";
import goalsData from "../../../content/learning/goals.v1.json";
import libraryData from "../../../content/learning/library.v1.json";
import markedData from "../../../content/learning/written-modules.v1.json";
import { parseNumber, polynomial, show } from "../../mathematics/src/answers";
import { explainStep, problemOf, show as showValue, type Problem as FamilyProblem } from "./families";
import { canonicalOf, expandedForm, HUMAN, NEW_TYPES, normalise, readable, SAMPLED, sameAnswer, type AnswerType } from "./answer-types";
import { MARKED_NOT, MARKED_RIGHT, outOf, tasksFor, writtenTask } from "./written";
import { selectable } from "./question-status";

export type Role = "diagnostic" | "probe" | "guided" | "check" | "practice" | "transfer" | "retention" | "original" | "challenge" | "generated";
export type Hypothesis = "secure" | "conceptual" | "procedural" | "recall" | "prerequisite" | "transfer";
export interface Question {
  id: string;
  /** form@1: the answer must be written expanded (no brackets, no multiplication signs). */
  expanded?: true;
  competency: string;
  /** The micro-skill (or the competency itself) the question is about. */
  skill: string;
  role: Role;
  type: AnswerType;
  prompt: string;
  answer: string;
  solution: string;
  difficulty: number;
  probe?: "concept" | "procedure" | "recall" | "transfer";
  hint?: string;
  options?: string[];
  /** A picture the question needs (family-kit Visual). */
  figure?: { type: string; [k: string]: unknown };
  misconceptions?: { when: string; hypothesis: Hypothesis; says: string }[];
  goals?: string[];
  readiness?: string[];
  source: string;
  licence: string;
  review: "provisional";
}
export interface Screen {
  title: string;
  text: string[];
  math?: string[];
  tip?: string;
  /** A picture (family-kit Visual: strips, array, dots, tenframe, blocks, numberline, clock, coins, bars …). */
  widget?: { type: string; top?: number; bottom?: number; shaded?: number; rows?: number; cols?: number; split?: number; [k: string]: unknown };
  /** teaching-contract@1: what this section is for (concept, worked-example, strategy, misconception, prerequisite). */
  role?: import("./family-kit").TeachRole;
  /** teaching-contract@1: the question this section's text, solution and picture are about. */
  instance?: string;
  /** teaching-contract@1: the text was written for this question by the family's own code (not family-level text). */
  textFrom?: "instance";
}
export interface Strategy {
  id: string;
  title: string;
  kind: "conceptual" | "procedural" | "recall" | "prerequisite";
  /** Probe questions whose right answers show the learner has what this strategy builds on. */
  needs: string[];
  screens: Screen[];
  guided: string;
  check: string;
}
export interface Module {
  competency: string;
  title: string;
  chapter: Screen[];
  diagnostics: string[];
  strategies: Strategy[];
  practice: string[];
  transfer: string[];
  retention: string[];
  probes: string[];
  /** The question family whose release pool supplies further questions of each phase (depth@1). */
  pool?: { family: string; version: string };
  /** pools@1: every family the module draws from (the main one first): a competency is broader than one family (read
   * the clock and time after n minutes), so its questions come from all of them. */
  pools?: { family: string; version: string }[];
  /** written@2: the part of the skill a computer cannot mark (a proof, construction, graph sketch or justification),
   * offered once the skill is shown on your own; an educator marks it, and while it waits nothing else is held up. */
  written?: string[];
}
export interface Fragment {
  id: string;
  type: Question["type"];
  prompt: string;
  answer: string;
  solution: string;
  options?: string[];
  competencies: string[];
  minGrade: number;
  maxGrade?: number;
  readiness: string[];
}
export interface Problem {
  id: string;
  title: string;
  style: string;
  source: string;
  licence: string;
  review: string;
  validation: string;
  competencies: string[];
  full: Fragment;
  fragments: Fragment[];
}
export interface Goal {
  id: string;
  name: string;
  examTrack: string;
  status: string;
  note: string;
  foundations: { strands: string[]; note: string };
  topics: { id: string; competencies: string[]; weight: [number, number] }[];
  marking: { correct: number; wrong: number; note: string };
  exam: {
    pattern: string;
    verified: boolean;
    durationMinutes: number;
    papers: number;
    sections: { id: string; format: "mcq-single" | "mcq-multiple" | "numerical" | "mixed"; questions: number; marking: { correct: number; wrong: number; blank: number; partialPerOption?: number }; disputed?: string }[];
    formats?: string[];
    note: string;
  };
}

export const contentVersion = data.version;
/** Modules written by hand (modules.v1.json) and modules synthesised from blueprints (library.v1.json, library.ts). */
const authoredPools = ((libraryData as { authoredPools?: Record<string, Module["pool"] & { pools?: Module["pools"] }> }).authoredPools ?? {}) as Record<string, NonNullable<Module["pool"]> & { pools?: Module["pools"] }>;
/** Hand-written modules, each with the release pool of its competency's family (when there is one); then the modules
 * of competencies an educator marks (written-modules.v1.json: teaching, auto-marked component questions and written
 * tasks, written@1). */
export const authoredModules = [...(data.modules as unknown as Module[]), ...(markedData.modules as unknown as Module[])].map((m) => {
  const a = authoredPools[m.competency];
  return a ? { ...m, pool: { family: a.family, version: a.version }, ...(a.pools ? { pools: a.pools } : {}) } : m;
});
/** pools@1: the families a module draws from (main first). */
export const poolFamilies = (m: Module): string[] => (m.pools?.length ? m.pools.map((p) => p.family) : m.pool ? [m.pool.family] : []);
export const synthesisedModules = libraryData.modules as unknown as (Module & { provenance: Record<string, unknown> })[];
export const libraryVersion = libraryData.version;
// written@2: a module answered automatically also offers the skill's written tasks (the part an educator marks); an
// educator-marked module (no pool) already asks its tasks as its own questions
const withWritten = (m: Module): Module => {
  if (!m.pool) return m;
  const own = new Set(Object.values({ d: m.diagnostics, p: m.practice, t: m.transfer, r: m.retention }).flat());
  const w = tasksFor(m.competency).map((t) => t.id).filter((id) => !own.has(id));
  return w.length ? { ...m, written: w } : m;
};
/** question-status@1: every question list of a module (compiled library, authored modules, strategies, written tasks) is filtered by
 * the quarantine registry at load, so no route that reads a module can offer a quarantined question. What was removed is kept for reporting. */
export const quarantinedFromModules: { competency: string; list: string; id: string }[] = [];
export const withoutQuarantined = (m: Module): Module => {
  const keep = (list: string) => (id: string) => (selectable(id) ? true : (quarantinedFromModules.push({ competency: m.competency, list, id }), false));
  return {
    ...m,
    diagnostics: m.diagnostics.filter(keep("diagnostics")), practice: m.practice.filter(keep("practice")), transfer: m.transfer.filter(keep("transfer")),
    retention: m.retention.filter(keep("retention")), probes: m.probes.filter(keep("probes")),
    strategies: m.strategies.map((st) => ({ ...st, needs: st.needs.filter(keep("needs")) })).filter((st) => keep("guided")(st.guided) && keep("check")(st.check)),
    ...(m.written ? { written: m.written.filter(keep("written")) } : {}),
  };
};
export const modules: Module[] = [...authoredModules, ...synthesisedModules.filter((m) => !authoredModules.some((a) => a.competency === m.competency))].map(withWritten).map(withoutQuarantined);
/** Where a module came from: written by hand, or synthesised from a blueprint and a problem family. */
export const moduleOrigin = (competency: string): "authored" | "synthesised" | null => (authoredModules.some((m) => m.competency === competency) ? "authored" : synthesisedModules.some((m) => m.competency === competency) ? "synthesised" : null);
export const questions = [...data.questions, ...markedData.questions] as unknown as Question[];
export const problems = problemsData.problems as unknown as Problem[];
export const goals = goalsData.goals as unknown as Goal[];
const qById = new Map(questions.map((q) => [q.id, q]));
const fragments = new Map(problems.flatMap((p) => [p.full, ...p.fragments].map((f) => [f.id, { ...f, problem: p.id }] as const)));

export const question = (id: string): Question => {
  const q = qById.get(id);
  if (q) return q;
  const f = fragments.get(id);
  const w = writtenTask(id);
  // written@1: an educator marks it; its "answer" is the educator's mark of correct, never a text to match
  if (w) return { id, competency: w.competency, skill: w.competency, role: "practice", type: "written", prompt: w.prompt, answer: MARKED_RIGHT, solution: `An educator marks this against ${w.rubric.length} criteria (${outOf(w)} points): ${w.rubric.map((r) => r.criterion).join("; ")}.`, ...(w.figure ? { figure: w.figure } : {}), difficulty: 3, source: w.source, licence: w.licence, review: "provisional" };
  const g = problemOf(id);
  if (g) return { id, competency: g.competency, skill: g.skill, role: "generated", type: g.type, prompt: g.prompt, answer: g.answer, ...(g.expanded ? { expanded: true as const } : {}), solution: g.steps.map((st) => explainStep(g, st)).join(". ") + ".", options: g.options, ...(g.figure ? { figure: g.figure } : {}), difficulty: 1, misconceptions: misconceptionsOf(g), source: "Generated from a supported problem family (families@1)", licence: "CC0", review: "provisional" };
  if (f) return { id: f.id, competency: f.competencies.at(-1)!, skill: f.competencies.at(-1)!, role: "challenge", type: f.type, prompt: f.prompt, answer: f.answer, solution: f.solution, options: f.options, difficulty: 3, source: "Original, written for OpenPath", licence: "CC0", review: "provisional" };
  throw new Error(`Unknown question ${id}`);
};
/** A generated problem's written explanations as misconceptions on the question (one per predicted answer). */
function misconceptionsOf(g: FamilyProblem): NonNullable<Question["misconceptions"]> {
  const out: NonNullable<Question["misconceptions"]> = [];
  for (const b of g.bugs) {
    if (b.predict === null || (g.type === "set" && !Array.isArray(b.predict))) continue;
    const values = g.type === "set" ? [b.predict] : Array.isArray(b.predict) ? b.predict : [b.predict];
    for (const v of values) if (showValue(v) !== g.answer || g.type === "choice") out.push({ when: g.type === "choice" ? "ABCD"[v as number] : showValue(v), hypothesis: b.kind, says: b.says });
  }
  return out;
}
export const isQuestion = (id: string) => qById.has(id) || fragments.has(id) || writtenTask(id) !== null || problemOf(id) !== null;
export const moduleFor = (competency: string) => modules.find((m) => m.competency === competency) ?? null;
export const goal = (id: string) => goals.find((g) => g.id === id) ?? null;

/** The canonical form of an answer of this question's type, or null if it is not one (equivalent answers share it).
 * answers@2 types (answer-types.ts): exact types have a canonical form; sampled types (expression, antiderivative) are
 * compared with the question's answer, so a response equal to it gets the answer's form ("=…") and any other readable
 * response its own ("~…"); a written answer has none (an educator marks it). */
export function canonical(q: Pick<Question, "type"> & { answer?: string }, raw: string): string | null {
  if (NEW_TYPES.has(q.type)) {
    // a written answer: only the educator's mark (records.ts) has a form; the learner's own text has none
    if (HUMAN.has(q.type)) return raw === MARKED_RIGHT ? "marked-correct" : raw === MARKED_NOT ? "marked-not-yet" : null;
    if (SAMPLED.has(q.type)) {
      if (!readable(q.type, raw)) return null;
      return q.answer !== undefined && sameAnswer(q.type, raw, q.answer) ? `=${q.answer}` : `~${normalise(raw)}`;
    }
    return canonicalOf(q.type, raw);
  }
  const t = raw.trim().replace(/−/g, "-");
  if (!t) return null;
  try {
    if (q.type === "choice") return /^[A-D]$/i.test(t) ? t.toUpperCase() : null;
    // an exact whole number may be typed with a zero decimal part ("5.0" is 5); "5.5" is a different value, not a misspelling
    if (q.type === "integer") return canonicalInteger(t);
    if (q.type === "fraction") return show(parseNumber(t));
    if (q.type === "polynomial") return polynomial(t);
    // an unordered set may be written with its braces: {1, 2} is 1, 2
    const body = q.type === "set" ? unbrace(t) : t;
    const parts = body.split(",").map((x) => show(parseNumber(x.trim())));
    return new Set(parts).size === parts.length ? [...parts].sort().join(",") : null;
  } catch {
    return null;
  }
}
export const isCorrect = (q: Pick<Question, "type" | "answer"> & { expanded?: true }, raw: string) => {
  if (HUMAN.has(q.type)) return raw === MARKED_RIGHT;
  // form@1: an "expand" task's answer must be written expanded, whatever its value
  if (q.expanded && !expandedForm(raw)) return false;
  const c = canonical(q, raw);
  return c !== null && c === canonical(q, q.answer);
};
/** A written answer is marked by an educator, never here (written.ts). */
export const needsMarking = (q: Pick<Question, "type">) => HUMAN.has(q.type);
/** The written explanation for this particular wrong answer, and the hypothesis it supports (only when it is specific). */
export function misconceptionOf(q: Question, raw: string) {
  if (HUMAN.has(q.type)) return null;
  const c = canonical(q, raw);
  if (c === null || c === canonical(q, q.answer)) return null;
  if (SAMPLED.has(q.type)) return q.misconceptions?.find((m) => sameAnswer(q.type, raw, m.when)) ?? null;
  return q.misconceptions?.find((m) => canonical(q, m.when) === c) ?? null;
}
