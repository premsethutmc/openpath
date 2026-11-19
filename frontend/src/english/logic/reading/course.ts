/**
 * Reading comprehension course (content/english/reading): seven skills at six levels. Each skill and level has a
 * lesson with a worked example on a teaching text, guided practice with hints on two practice texts, and questions
 * on four further texts that are kept for fresh checks and never used for teaching or practice.
 *
 * Candidate content, practice-only: nothing here is evidence for the engine (no estimate or mastery claim changes).
 */
import courseJson from "../../../../../content/english/reading/course.json";
import level1Json from "../../../../../content/english/reading/level-1.json";
import level2Json from "../../../../../content/english/reading/level-2.json";
import level3Json from "../../../../../content/english/reading/level-3.json";
import level4Json from "../../../../../content/english/reading/level-4.json";
import level5Json from "../../../../../content/english/reading/level-5.json";
import level6Json from "../../../../../content/english/reading/level-6.json";

import inferenceJson from "../../../../../content/english/reading/inference.json";

export const SKILL_IDS = ["detail", "sequence", "cause", "feelings", "main_idea", "fact_opinion", "inference"] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export const LEVELS = [1, 2, 3, 4, 5, 6] as const;
/** Levels recorded before the five-level scale (November 2026): old 1, 2, 3 are now 1, 3, 5. */
export const OLD_LEVELS: Readonly<Record<number, number>> = { 1: 1, 2: 3, 3: 5 };
export type Level = (typeof LEVELS)[number];
export type Role = "teach" | "practice" | "check";
export interface Unit {
  skill: SkillId;
  level: Level;
}
export const unitKey = (u: Unit) => `${u.skill}@${u.level}`;

export interface Skill {
  id: SkillId;
  /** The framework capability this skill practises (content/english/framework). Named for tracing only. */
  capability: string;
  name: string;
  blurb: string;
}
export interface LevelInfo {
  id: Level;
  name: string;
  band: number;
  about: string;
  words: [number, number];
}
export interface Passage {
  id: string;
  level: Level;
  role: Role;
  title: string;
  text: string;
}
export interface Question {
  id: string;
  passage: string;
  skill: SkillId;
  level: Level;
  role: "practice" | "check";
  prompt: string;
  /** In display order (a fixed shuffle per question, so the right answer has no usual position). */
  options: string[];
  answer: number;
  /** Words copied exactly from the passage that the answer rests on. */
  evidence: string;
  /** If supplied, the complete curated alternative sets of exact supporting spans. */
  evidenceAlternatives?: string[][];
  explain: string;
  /** Practice questions only: a nudge towards the place or the thinking, never the answer. */
  hint?: string;
}
export interface Lesson extends Unit {
  title: string;
  strategy: string;
  tip: string;
  worked: { passage: string; prompt: string; answer: string; steps: string[] };
}
export interface Course {
  version: number;
  status: string;
  skills: Skill[];
  levels: LevelInfo[];
  lessons: Lesson[];
  passages: Map<string, Passage>;
  questions: Question[];
}

interface RawQuestion {
  skill: SkillId;
  prompt: string;
  right: string;
  wrong: string[];
  evidence: string;
  /** If supplied, the complete curated alternative sets of exact supporting spans. */
  evidenceAlternatives?: string[][];
  explain: string;
  hint?: string;
}
interface RawLevel {
  level: Level;
  lessons: (Omit<Lesson, "level" | "worked"> & { worked: Omit<Lesson["worked"], "passage"> })[];
  passages: { id: string; role: Role; title: string; text: string; questions: RawQuestion[] }[];
}

/** FNV-1a: a small stable hash, so the option order of a question is the same on every device and every visit. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
function shuffled(id: string, right: string, wrong: string[]): { options: string[]; answer: number } {
  // ordered by a hash of the question and the option text, so the order owes nothing to which option is right
  const options = [right, ...wrong].map((o) => ({ o, k: hash(`${id}|${o}`) })).sort((x, y) => x.k - y.k || (x.o < y.o ? -1 : 1)).map((x) => x.o);
  return { options, answer: options.indexOf(right) };
}

export function buildCourse(meta: unknown, levels: unknown[]): Course {
  const m = meta as { version: number; status: string; skills: Skill[]; levels: LevelInfo[] };
  const course: Course = { version: m.version, status: m.status, skills: m.skills, levels: m.levels, lessons: [], passages: new Map(), questions: [] };
  for (const raw of levels as RawLevel[]) {
    const teach = raw.passages.find((p) => p.role === "teach");
    for (const l of raw.lessons) course.lessons.push({ ...l, level: raw.level, worked: { ...l.worked, passage: teach?.id ?? "" } });
    for (const p of raw.passages) {
      if (course.passages.has(p.id)) throw new Error(`reading course: passage ${p.id} appears twice`);
      course.passages.set(p.id, { id: p.id, level: raw.level, role: p.role, title: p.title, text: p.text });
      for (const q of p.questions) {
        if (p.role === "teach") throw new Error(`reading course: teaching text ${p.id} must not carry questions`);
        const id = `${p.id}.${q.skill}`;
        course.questions.push({ id, passage: p.id, skill: q.skill, level: raw.level, role: p.role, prompt: q.prompt, ...shuffled(id, q.right, q.wrong), evidence: q.evidence, ...(q.evidenceAlternatives ? { evidenceAlternatives: q.evidenceAlternatives } : {}), explain: q.explain, ...(q.hint ? { hint: q.hint } : {}) });
      }
    }
  }
  return course;
}

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const sentences = (text: string) => text.split(/(?<=[.!?”'])\s+/).filter((s) => /\w/.test(s));
/** Mean words per sentence: a rough reading-load measure used only to check that the levels really step up. */
export const meanSentenceLength = (text: string) => wordCount(text) / Math.max(1, sentences(text).length);

/** How many fresh-check questions a skill and level needs: two attempts of two questions, each from a different text. */
export const CHECK_SIZE = 2;
export const CHECKS_PER_UNIT = 2;

/** Everything a learner-facing unit depends on, checked. Empty when the course is sound. */
export function courseProblems(course: Course): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const q of course.questions) {
    const p = course.passages.get(q.passage)!;
    if (ids.has(q.id)) out.push(`${q.id}: two questions on one skill in one text`);
    ids.add(q.id);
    if (!SKILL_IDS.includes(q.skill)) out.push(`${q.id}: unknown skill`);
    if (!p.text.includes(q.evidence)) out.push(`${q.id}: evidence is not in the text`);
    if (q.options.length < 3 || new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) out.push(`${q.id}: needs three or more different options`);
    if (q.answer < 0) out.push(`${q.id}: no right answer`);
    if (!q.prompt.trim() || !q.explain.trim()) out.push(`${q.id}: no prompt or explanation`);
    if (q.role === "practice" && !q.hint) out.push(`${q.id}: a practice question needs a hint`);
    if (q.role === "check" && q.hint) out.push(`${q.id}: a check question must not carry a hint`);
    if (q.hint && q.hint.toLowerCase().includes(q.options[q.answer].toLowerCase())) out.push(`${q.id}: the hint gives the answer away`);
    if (q.skill === "fact_opinion" && !q.options.every((o) => p.text.includes(o))) out.push(`${q.id}: fact and opinion options must be sentences of the text`);
  }
  const texts = new Set<string>();
  for (const p of course.passages.values()) {
    const info = course.levels.find((l) => l.id === p.level);
    const n = wordCount(p.text);
    if (!info) out.push(`${p.id}: unknown level`);
    else if (n < info.words[0] || n > info.words[1]) out.push(`${p.id}: ${n} words is outside level ${p.level}'s ${info.words[0]}–${info.words[1]}`);
    if (texts.has(p.text)) out.push(`${p.id}: the same text twice`);
    texts.add(p.text);
  }
  for (const level of LEVELS)
    for (const skill of SKILL_IDS) {
      const at = `${skill}@${level}`;
      const lessons = course.lessons.filter((l) => l.skill === skill && l.level === level);
      if (lessons.length !== 1) out.push(`${at}: needs exactly one lesson`);
      const l = lessons[0];
      if (l) {
        const p = course.passages.get(l.worked.passage);
        if (!p || p.role !== "teach" || p.level !== level) out.push(`${at}: the worked example needs this level's teaching text`);
        if (l.worked.steps.length < 3) out.push(`${at}: the worked example needs at least three steps`);
        if (!l.title || !l.strategy || !l.tip || !l.worked.prompt || !l.worked.answer) out.push(`${at}: the lesson is incomplete`);
      }
      const qs = course.questions.filter((q) => q.skill === skill && q.level === level);
      if (qs.filter((q) => q.role === "practice").length < 2) out.push(`${at}: needs two practice questions`);
      const checks = qs.filter((q) => q.role === "check");
      if (new Set(checks.map((q) => q.passage)).size < CHECK_SIZE * CHECKS_PER_UNIT) out.push(`${at}: needs check questions on ${CHECK_SIZE * CHECKS_PER_UNIT} different texts`);
    }
  return out;
}

export const COURSE: Course = buildCourse(courseJson, [level1Json, level2Json, level3Json, level4Json, level5Json, level6Json, ...(inferenceJson as unknown[])]);
{
  const problems = courseProblems(COURSE);
  if (problems.length) throw new Error(`reading course: ${problems.slice(0, 5).join("; ")}`);
}

export const lessonFor = (course: Course, u: Unit) => course.lessons.find((l) => l.skill === u.skill && l.level === u.level)!;
export const questionsFor = (course: Course, u: Unit, role: "practice" | "check") => course.questions.filter((q) => q.skill === u.skill && q.level === u.level && q.role === role);
