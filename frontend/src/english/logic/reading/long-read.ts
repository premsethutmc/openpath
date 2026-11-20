/**
 * Long reads (content/english/reading/long-reads.json): a story of about four to five hundred words, read in three
 * parts, with two questions after each part and three at the end on the whole: its theme, how a character changes,
 * and what the title means. One part a sitting; the next sitting goes on from where the learner stopped.
 * Each answer shows its explanation. Practice-only: nothing here is evidence for the engine.
 */
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
    if (words < 350 || words > 1200) out.push(`${t.id}: ${words} words`);
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

/** Where the learner is: the text in progress and its next part (3 = the questions on the whole), or what to start next. */
export function nextStep(l: LongReads, records: readonly LongRecord[], level: number): { text: LongText; part: number } | null {
  const done = new Map<string, number>();
  for (const r of records) done.set(r.text, Math.max(done.get(r.text) ?? -1, r.part));
  const open = [...records].reverse().find((r) => (done.get(r.text) ?? -1) < PARTS);
  if (open) return { text: l.texts.find((t) => t.id === open.text)!, part: done.get(open.text)! + 1 };
  // a new text: nearest the learner's reading level, lower before higher
  const fresh = l.texts.filter((t) => !done.has(t.id)).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level || (a.id < b.id ? -1 : 1));
  return fresh[0] ? { text: fresh[0], part: 0 } : null;
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
