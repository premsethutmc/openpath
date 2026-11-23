/**
 * foundations@1: "Start here" teaching for a skill: the basic ideas its lesson relies on but never introduces (what
 * sin, cos and tan are before the ratios of 30°, 45° and 60°).
 *
 * Why this exists: the lessons were written to explain how to answer each question type, so many start in the middle.
 * Every topic was walked in learning order as a learner of its class who knows only what earlier lessons taught; each
 * idea used before it is taught got its own short teaching here, attached to the first skill that needs it, and each
 * was checked again by a second independent reader. The learner's first lesson of a skill opens with these; they are
 * not evidence, are never graded, and do not change the skill's lesson, questions or review records.
 */
import data from "../../../content/learning/foundations.v1.json";

export const PICTURES = ["right-triangle", "unit-circle", "angle", "circle-parts", "number-line", "coordinate-plane", "tangent-slope", "area-under-curve", "fraction-bar", "matrix-grid", "vector-arrow", "venn"] as const;
export type Picture = (typeof PICTURES)[number];
export interface FoundationScreen { title: string; text: string[]; example?: string[]; check?: { question: string; answer: string }; picture?: Picture | null }
export interface Foundation { competency: string; class: number; concept: string; evidence: string; screens: FoundationScreen[] }
export const foundations = (data as unknown as { entries: Foundation[] }).entries;
const by = new Map<string, Foundation[]>();
for (const f of foundations) by.set(f.competency, [...(by.get(f.competency) ?? []), f]);
/** The start-here teaching in front of this skill's lesson (empty for most skills). */
export const foundationsOf = (competency: string): Foundation[] => by.get(competency) ?? [];
