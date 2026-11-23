/**
 * owner-view@1: what the owner's maths view (/owner/) shows, worked out from the same content the learner's app uses.
 * A topic is the second part of a skill's id (MATH.trigonometry.ratios → trigonometry). Nothing here is stored: the
 * view always shows the lessons, wrong-answer explanations and review figures of the build it is part of.
 */
import { modules } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { screenCorrections } from "../../../packages/learning/src/screen-corrections";
import specs from "../../../content/learning/family-specs.v1.json";
import validation from "../../../content/learning/machine-validation.v1.json";
import { classOfSkill } from "../year/StepCoach";
import { foundationsOf, type Foundation } from "../../../packages/learning/src/foundations";

type Spec = { id: string; title: string; competency: string; examples?: string[] };
const families = (specs as unknown as { families: Spec[] }).families;
const certified = new Set((validation as unknown as { entries: { family: string }[] }).entries.map((e) => e.family));
const maths = modules.filter((m) => m.competency.startsWith("MATH."));

export const topicOf = (competency: string) => competency.split(".")[1] ?? "other";
const WORD: Record<string, string> = { "sets-relations": "Sets and relations", coordinate: "Coordinate geometry" };
export const topicName = (t: string) => WORD[t] ?? t[0].toUpperCase() + t.slice(1).replace(/-/g, " ");
/** Trigonometry first, then the rest by name. */
export const topics: string[] = [...new Set(maths.map((m) => topicOf(m.competency)))].sort((a, b) => (a === "trigonometry" ? -1 : b === "trigonometry" ? 1 : a.localeCompare(b)));

export interface Screen { section: string; title: string; text: string[]; math: string[]; corrected: boolean }
export interface Skill { competency: string; title: string; cls: number | null; screens: Screen[]; families: Spec[]; corrected: number; certified: number; foundations: Foundation[] }
export function skillsOf(topic: string): Skill[] {
  return maths.filter((m) => topicOf(m.competency) === topic).map((m) => {
    const fixed = new Set(screenCorrections.filter((c) => c.competency === m.competency).map((c) => `${c.section}|${c.index}`));
    const screens: Screen[] = [
      ...m.chapter.map((s, i) => ({ section: "Lesson", title: s.title ?? "", text: s.text ?? [], math: (s as { math?: string[] }).math ?? [], corrected: fixed.has(`chapter|${i}`) })),
      ...m.strategies.flatMap((st) => st.screens.map((s, i) => ({ section: st.id === "spot_the_mistake" ? "Common mistake" : "Another way", title: s.title ?? "", text: s.text ?? [], math: (s as { math?: string[] }).math ?? [], corrected: fixed.has(`${st.id}|${i}`) }))),
    ];
    const fams = families.filter((f) => f.competency === m.competency);
    return { competency: m.competency, title: m.title, cls: classOfSkill(m.competency) ?? null, screens, families: fams, corrected: screens.filter((s) => s.corrected).length, certified: fams.filter((f) => certified.has(f.id)).length, foundations: foundationsOf(m.competency) };
  }).sort((a, b) => (a.cls ?? 99) - (b.cls ?? 99) || a.title.localeCompare(b.title));
}

export interface Mistake { wrong: string; says: string }
export interface Sample { family: string; title: string; question: string; answer: string; mistakes: Mistake[]; certified: boolean }
/** One sample question of a question type, with every wrong answer the app recognises and what it tells the learner. */
export function sampleOf(f: Spec): Sample | null {
  const id = f.examples?.[0]?.replace(/:(mc|w)$/, "");
  const p = id ? (problemOf(id) as unknown as { prompt: string; answer: unknown; type?: string; options?: string[]; bugs: { says?: string; predict: unknown }[] } | null) : null;
  if (!p) return null;
  const one = (v: unknown): string => (p.type === "choice" && p.options ? p.options[typeof v === "number" ? v : "ABCD".indexOf(String(v))] ?? String(v) : String(v));
  const show = (v: unknown) => (Array.isArray(v) ? v.map(one).join(" or ") : one(v));
  return { family: f.id, title: f.title, question: p.prompt, answer: show(p.answer), certified: certified.has(f.id), mistakes: p.bugs.filter((b) => b.says && b.predict !== null && b.predict !== undefined).map((b) => ({ wrong: show(b.predict), says: b.says! })) };
}

export interface Totals { skills: number; screens: number; corrected: number; families: number; certified: number; foundations: number; practice: number }
export const totalsOf = (skills: Skill[]): Totals => ({ skills: skills.length, screens: skills.reduce((n, s) => n + s.screens.length, 0), corrected: skills.reduce((n, s) => n + s.corrected, 0), families: skills.reduce((n, s) => n + s.families.length, 0), certified: skills.reduce((n, s) => n + s.certified, 0), foundations: skills.reduce((n, s) => n + s.foundations.reduce((k, f) => k + f.screens.length, 0), 0), practice: skills.reduce((n, s) => n + s.foundations.reduce((k, f) => k + (f.practice?.length ?? 0), 0), 0) });
/** Skills of a topic whose title, lesson text or question-type titles contain the words typed. */
export function search(skills: Skill[], q: string): Skill[] {
  const w = q.trim().toLowerCase();
  return !w ? skills : skills.filter((s) => `${s.title} ${s.foundations.map((f) => `${f.concept} ${f.screens.map((x) => `${x.title} ${x.text.join(" ")}`).join(" ")}`).join(" ")} ${s.screens.map((x) => `${x.title} ${x.text.join(" ")}`).join(" ")} ${s.families.map((f) => f.title).join(" ")}`.toLowerCase().includes(w));
}
