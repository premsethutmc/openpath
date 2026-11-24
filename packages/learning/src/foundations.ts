/**
 * foundations@1: "Start here" teaching for a skill: the basic ideas its lesson relies on but never introduces (what
 * sin, cos and tan are before the ratios of 30°, 45° and 60°).
 *
 * Why this exists: the lessons were written to explain how to answer each question type, so many start in the middle.
 * Every topic was walked in learning order as a learner of its class who knows only what earlier lessons taught; each
 * idea used before it is taught got its own short teaching here, attached to the first skill that needs it, and each
 * was checked again by a second independent reader. Each idea has a few practice questions of its own (foundation-
 * practice@1), written for that class and solved blind by a second reader before being kept. The learner's first lesson of a skill opens with these; they are
 * not evidence, are never graded, and do not change the skill's lesson, questions or review records.
 */
import data from "../../../content/learning/foundations.v1.json";

/** The pictures an idea can ask for. Each is a scene description for the scene engine (foundation-pictures.ts). */
export const PICTURES = ["right-triangle", "unit-circle", "angle", "circle-parts", "number-line", "coordinate-plane", "tangent-slope", "area-under-curve", "fraction-bar", "matrix-grid", "vector-arrow", "venn"] as const;
export type Picture = (typeof PICTURES)[number];
export interface FoundationScreen { title: string; text: string[]; example?: string[]; check?: { question: string; answer: string }; picture?: Picture | null }
/** foundation-practice@1: a question on the idea itself; every wrong choice says which slip leads to it. */
export interface FoundationQuestion { question: string; options: string[]; answer: number; why: string; wrong: string[] }
export interface Foundation { competency: string; class: number; concept: string; evidence: string; screens: FoundationScreen[]; practice?: FoundationQuestion[]; /** more rounds of the same four kinds of question, so a repeat visit is not the same four */ rounds?: FoundationQuestion[][] }
export const foundations = (data as unknown as { entries: Foundation[] }).entries;
const by = new Map<string, Foundation[]>();
for (const f of foundations) by.set(f.competency, [...(by.get(f.competency) ?? []), f]);
/** The start-here teaching in front of this skill's lesson (empty for most skills). */
export const foundationsOf = (competency: string): Foundation[] => by.get(competency) ?? [];
/** The order the choices are shown in: fixed for a question (so a reload shows the same), different between questions. */
export function shownOrder(q: FoundationQuestion): number[] {
  let h = 2166136261;
  for (const c of q.question) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const j = h % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
/** practice-rounds@1: the round of questions for this visit: the first visit gets the first round, the next the next, round and round. */
export function roundFor(f: Foundation, visit: number): FoundationQuestion[] {
  const all = [f.practice ?? [], ...(f.rounds ?? [])].filter((r) => r.length);
  return all.length ? all[((visit % all.length) + all.length) % all.length] : [];
}
/**
 * understanding@1: how a learner stands on the ideas in front of a skill, from their finished rounds (the latest round of
 * each idea counts). "shaky" when the latest round of any idea had fewer than half right at the first choice; "met" when
 * every idea has a finished round and none is shaky; "new" when an idea has no finished round. Never mastery of a skill.
 */
export function understandingOf(competency: string, done: readonly { competency: string; concept: string; asked: number; firstTry: number }[]): { state: "none" | "new" | "shaky" | "met"; ideas: { concept: string; rounds: number; asked: number; firstTry: number }[] } {
  const all = foundationsOf(competency);
  if (!all.length) return { state: "none", ideas: [] };
  const ideas = all.map((f) => { const mine = done.filter((d) => d.competency === competency && d.concept === f.concept), last = mine[mine.length - 1]; return { concept: f.concept, rounds: mine.length, asked: last?.asked ?? 0, firstTry: last?.firstTry ?? 0 }; });
  return { state: ideas.some((i) => i.rounds > 0 && i.firstTry * 2 < i.asked) ? "shaky" : ideas.some((i) => i.rounds === 0) ? "new" : "met", ideas };
}
/** The pictures of an idea (each once): each gets tap-the-picture questions. */
export const picturesOf = (f: Foundation): Picture[] => [...new Set(f.screens.map((s) => s.picture).filter((p): p is Picture => !!p))];
