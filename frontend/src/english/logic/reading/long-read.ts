/**
 * Long reads (content/english/reading/long-reads.json): a story of about four to five hundred words (shorter
 * at levels 1 to 3), read in three
 * parts, with two questions after each part and three at the end on the whole: its theme, how a character changes,
 * and what the title means. One part a sitting; the next sitting goes on from where the learner stopped.
 * Each answer shows its explanation. Practice-only: nothing here is evidence for the engine.
 */
import { COURSE } from "./course.ts";
import { progress, type ReadingRecord } from "./session.ts";
import longJson from "../../../../../content/english/reading/long-reads.json";

export type LongSkill = "detail" | "inference" | "cause" | "sequence" | "feelings" | "theme" | "character" | "title";
export interface LongQuestion {
  skill: LongSkill;
  prompt: string;
  right: string;
  wrong: string[];
  explain: string;
}
export interface LongText {
  id: string;
  level: number;
  theme: string;
  title: string;
  parts: { text: string; questions: LongQuestion[] }[];
  whole: LongQuestion[];
}
export interface LongReads {
  id: string;
  version: number;
  texts: LongText[];
}

export const LONG: LongReads = longJson as unknown as LongReads;
export const PARTS = 3;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
/** The options in a fixed shuffled order, and where the right one is. */
export function choices(q: LongQuestion, key: string): { options: string[]; answer: number } {
  const options = [q.right, ...q.wrong].map((o) => ({ o, k: hash(`long|${key}|${o}`) })).sort((a, b) => a.k - b.k || (a.o < b.o ? -1 : 1)).map((x) => x.o);
  return { options, answer: options.indexOf(q.right) };
}

export function longProblems(l: LongReads): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const t of l.texts) {
    if (ids.has(t.id)) out.push(`${t.id}: listed twice`);
    ids.add(t.id);
    if (t.parts.length !== PARTS) out.push(`${t.id}: ${t.parts.length} parts, not ${PARTS}`);
    if (!t.theme || !t.title) out.push(`${t.id}: no theme or title`);
    const words = t.parts.reduce((a, p) => a + p.text.split(/\s+/).length, 0);
    // shorter stories for the first levels: about 120 words at level 1, 160 at level 2, 250 at level 3
    const least = t.level === 1 ? 100 : t.level === 2 ? 150 : t.level === 3 ? 200 : 350;
    if (words < least || words > 1200) out.push(`${t.id}: ${words} words`);
    const skills = new Set(t.whole.map((q) => q.skill));
    for (const s of ["theme", "character", "title"]) if (!skills.has(s as LongSkill)) out.push(`${t.id}: no question on the ${s}`);
    for (const q of [...t.parts.flatMap((p) => p.questions), ...t.whole]) {
      if (q.wrong.length !== 2) out.push(`${t.id}: "${q.prompt}" needs two wrong choices`);
      if (new Set([q.right, ...q.wrong]).size !== 3) out.push(`${t.id}: "${q.prompt}" repeats a choice`);
      if (!q.explain) out.push(`${t.id}: "${q.prompt}" has no explanation`);
      if (q.right.length > 1.6 * Math.max(...q.wrong.map((w) => w.length))) out.push(`${t.id}: "${q.prompt}" the right choice is much the longest`);
    }
    for (const p of t.parts) if (p.questions.length !== 2) out.push(`${t.id}: each part has two questions`);
  }
  return out;
}
{
  const problems = longProblems(LONG);
  if (problems.length) throw new Error(`long reads: ${problems.slice(0, 5).join("; ")}`);
}

export type LongRecord =
  /** One part read and its questions answered (part 0 to 2), or the questions on the whole (part 3). */
  { type: "part"; text: string; part: number; answers: { skill: LongSkill; correct: boolean }[] };

/**
 * Where long reads start: the level from the Reading level check (none: a school child's class up to 3, else 3), or
 * the highest level passed in the Reading lessons when that is higher, so a reader who has grown there is not kept on
 * easy stories.
 */
export function longStart(checked: number | undefined, reading: readonly ReadingRecord[], cls?: number): number {
  const passed = [...progress(COURSE, reading).units].filter(([, u]) => u.status === "passed_own" || u.status === "passed_after_help").map(([k]) => Number(k.split("@")[1]));
  return Math.max(checked ?? (cls ? Math.min(3, Math.max(1, cls)) : 3), ...passed);
}

/**
 * The level to choose stories at: where the reader started, one level up after two stories at that level or above
 * were read to the end with at least three in four answers right (at most the highest level there is).
 */
export function longLevel(l: LongReads, records: readonly LongRecord[], start: number): number {
  const top = Math.max(...l.texts.map((t) => t.level));
  let level = Math.min(start, top);
  let well = 0;
  const run = new Map<string, boolean[]>();
  for (const r of records) {
    const got = [...(r.part === 0 ? [] : (run.get(r.text) ?? [])), ...r.answers.map((a) => a.correct)];
    run.set(r.text, got);
    if (r.part !== PARTS) continue;
    const t = l.texts.find((x) => x.id === r.text);
    if (t && t.level >= level && got.filter(Boolean).length >= 0.75 * got.length && ++well >= 2) (level = Math.min(level + 1, top), (well = 0));
  }
  return level;
}

/** Where the learner is: the text in progress and its next part (3 = the questions on the whole), or what to start next. */
export function nextStep(l: LongReads, records: readonly LongRecord[], level: number): { text: LongText; part: number } | null {
  // where each story stands in its latest reading (a story read to the end can be read again from the start)
  const at = new Map<string, number>();
  const times = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  records.forEach((r, i) => {
    at.set(r.text, r.part);
    lastSeen.set(r.text, i);
    if (r.part === PARTS) times.set(r.text, (times.get(r.text) ?? 0) + 1);
  });
  const open = [...records].reverse().find((r) => at.get(r.text)! < PARTS);
  if (open) return { text: l.texts.find((t) => t.id === open.text)!, part: at.get(open.text)! + 1 };
  // a new story no more than a level above the reader, nearest their level, lower before higher
  const near = (t: LongText) => t.level <= level + 1;
  const fresh = l.texts.filter((t) => !at.has(t.id) && near(t)).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level || (a.id < b.id ? -1 : 1));
  if (fresh[0]) return { text: fresh[0], part: 0 };
  // none left within reach: read again the story at the reader's level read fewest times, longest ago
  const pool = l.texts.filter(near).length ? l.texts.filter(near) : l.texts.filter((t) => t.level === Math.min(...l.texts.map((x) => x.level)));
  const again = pool.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || (times.get(a.id) ?? 0) - (times.get(b.id) ?? 0) || (lastSeen.get(a.id) ?? -1) - (lastSeen.get(b.id) ?? -1))[0];
  return again ? { text: again, part: 0 } : null;
}

export interface LongView {
  phase: "read" | "ask" | "answered" | "done";
  title: string;
  theme: string;
  /** 0 to 2 for a part, 3 for the questions on the whole. */
  part: number;
  /** The part's text (and, for the questions on the whole, the whole story to look back at). */
  text: string;
  index: number;
  total: number;
  question: { prompt: string; options: string[] } | null;
  /** After an answer: whether it was right, the right option and why. */
  answered: { correct: boolean; right: string; explain: string } | null;
  right: number;
}

/** One sitting: read a part (or look back at the whole story), then answer its questions one at a time. */
export class LongSitting {
  private phase: LongView["phase"] = "read";
  private index = 0;
  private readonly answers: { skill: LongSkill; correct: boolean }[] = [];
  private last: LongView["answered"] = null;
  private readonly log: LongRecord[] = [];
  readonly questions: LongQuestion[];
  readonly text: LongText;
  readonly part: number;

  constructor(text: LongText, part: number) {
    this.text = text;
    this.part = part;
    this.questions = part < PARTS ? text.parts[part].questions : text.whole;
  }

  private key = (i: number) => `${this.text.id}|${this.part}|${i}`;

  read(): void {
    if (this.phase === "read") this.phase = "ask";
  }

  answer(choice: number): void {
    if (this.phase !== "ask") return;
    const q = this.questions[this.index];
    const c = choices(q, this.key(this.index));
    if (!Number.isInteger(choice) || choice < 0 || choice >= c.options.length) return;
    const correct = choice === c.answer;
    this.answers.push({ skill: q.skill, correct });
    this.last = { correct, right: q.right, explain: q.explain };
    this.phase = "answered";
  }

  next(): void {
    if (this.phase !== "answered") return;
    this.last = null;
    if (++this.index < this.questions.length) this.phase = "ask";
    else {
      this.phase = "done";
      this.log.push({ type: "part", text: this.text.id, part: this.part, answers: [...this.answers] });
    }
  }

  snapshot(): LongView {
    const q = this.phase === "ask" || this.phase === "answered" ? this.questions[this.index] : null;
    const text = this.part < PARTS ? this.text.parts[this.part].text : this.text.parts.map((p) => p.text).join("\n\n");
    return {
      phase: this.phase,
      title: this.text.title,
      theme: this.text.theme,
      part: this.part,
      text,
      index: this.index,
      total: this.questions.length,
      question: q ? { prompt: q.prompt, options: choices(q, this.key(this.index)).options } : null,
      answered: this.last,
      right: this.answers.filter((a) => a.correct).length,
    };
  }

  /** The record of a finished sitting (nothing for one left unfinished). */
  take(): LongRecord[] {
    return this.log.splice(0);
  }
}

export interface LongSummary {
  /** Stories finished (questions on the whole answered), parts read, and the share right. */
  finished: number;
  parts: number;
  right: number;
  asked: number;
}
export function longSummary(records: readonly LongRecord[]): LongSummary {
  const all = records.flatMap((r) => r.answers);
  return { finished: records.filter((r) => r.part === PARTS).length, parts: records.filter((r) => r.part < PARTS).length, right: all.filter((a) => a.correct).length, asked: all.length };
}
