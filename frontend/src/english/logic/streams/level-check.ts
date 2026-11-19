/**
 * Find my level: one short check when a learner starts English, so the app can say where to begin in each stream.
 * Three parts, each adaptive and each giving its own level (there is no single English number):
 *
 *   words      a short word check (the word check's own session, four rounds): a band out of eight;
 *   reading    one text with four questions at a starting level, then one a level up or down: three of four right
 *              passes a level; the learner starts reading at the level above the highest one passed;
 *   listening  three dictated sentences, one try each, a level up after a sentence whose words are right (capital
 *              letters and the end mark are not counted; a long sentence may have one slip) and down otherwise:
 *              the level is the highest one passed.
 *
 *   spelling   six dictated Spelling Bee words, a level up after a right one and down otherwise: the level is the
 *              highest one spelt right, and the Spelling Bee starts there.
 *
 * Grammar keeps its own, longer starting check (the engine's, which is real evidence); the result screen offers it
 * as the last step. Any part can be skipped. Practice-only: nothing here is evidence for the engine. The reading part uses a
 * practice text of the course, never one kept for the course's fresh checks.
 */
import { mark, pick, wordsOf, type Dictation, type DictationRecord, type Sentence } from "../dictation/dictation.ts";
import { checkSpelling, type SpellWord } from "../spelling.ts";
import type { Course, Level, Passage, Question, SkillId } from "../reading/course.ts";

export type Part = "words" | "reading" | "listening" | "spelling";
export const PARTS: Part[] = ["words", "reading", "listening", "spelling"];
export const WORD_ROUNDS = 4;
export const READING_SKILLS: SkillId[] = ["detail", "sequence", "cause", "main_idea"];
export const READING_PASS = 3;
export const LISTENING_STEPS = 3;
/** Does a dictated sentence pass for placement? Every word spelt right; one slip allowed from eight words up. */
export const listeningPass = (right: number, total: number): boolean => right >= total - (total >= 8 ? 1 : 0);
export const SPELLING_STEPS = 6;

export type LevelCheckRecord =
  | { type: "start" }
  | { type: "words"; band: number; estimate: number; answered: number }
  /** `passed`: the highest reading level passed (0: none). */
  | { type: "reading"; passed: number; steps: { level: number; right: number; asked: number }[] }
  | { type: "listening"; level: number; steps: { id: string; level: number; perfect: boolean }[] }
  | { type: "spelling"; level: number; steps: { word: string; level: number; correct: boolean }[] }
  | { type: "skipped"; part: Part }
  | { type: "done" };

export interface Levels {
  /** Whether a level check was finished at least once. */
  done: boolean;
  words: { band: number; estimate: number } | null;
  /** `start`: the reading level to begin at. */
  reading: { passed: number; start: number } | null;
  listening: { level: number } | null;
  spelling: { level: number } | null;
}

/** The latest level found for each part. */
export function levelsFrom(records: readonly LevelCheckRecord[], readingLevels = 3): Levels {
  const out: Levels = { done: false, words: null, reading: null, listening: null, spelling: null };
  for (const r of records) {
    if (r.type === "done") out.done = true;
    if (r.type === "words") out.words = { band: r.band, estimate: r.estimate };
    if (r.type === "reading") out.reading = { passed: r.passed, start: Math.min(readingLevels, r.passed + 1) };
    if (r.type === "listening") out.listening = { level: r.level };
    if (r.type === "spelling") out.spelling = { level: r.level };
  }
  return out;
}

export const readingStart = (age: "early" | "school" | "older" | null | undefined): number => (age === "early" ? 1 : 2);

export interface ReadingPlacementView {
  phase: "asking" | "done";
  level: number;
  step: number;
  index: number;
  total: number;
  passage: { title: string; text: string } | null;
  /** The question on screen: no answer key. */
  question: { prompt: string; options: string[] } | null;
}

/** The reading part: a practice text at a level with four questions; then one level up or down. */
export class ReadingPlacement {
  private readonly course: Course;
  private level: number;
  private questions: Question[] = [];
  private passage: Passage | null = null;
  private index = 0;
  private right = 0;
  private steps: { level: number; right: number; asked: number }[] = [];
  private finished = false;

  constructor(course: Course, start: number) {
    this.course = course;
    this.level = start;
    this.load();
  }

  private load(): void {
    const texts = [...this.course.passages.values()].filter((p) => p.level === this.level && p.role === "practice");
    this.passage = texts.at(-1) ?? null;
    this.questions = this.passage ? READING_SKILLS.flatMap((s) => this.course.questions.filter((q) => q.passage === this.passage!.id && q.skill === s && q.role === "practice").slice(0, 1)) : [];
    this.index = 0;
    this.right = 0;
    if (!this.questions.length) this.finished = true;
  }

  answer(choice: number): void {
    const q = this.questions[this.index];
    if (this.finished || !q || !Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return;
    if (choice === q.answer) this.right++;
    if (++this.index < this.questions.length) return;
    const passedHere = this.right >= READING_PASS;
    this.steps.push({ level: this.level, right: this.right, asked: this.questions.length });
    const top = Math.max(...this.course.levels.map((l) => l.id));
    const next = this.level + (passedHere ? 1 : -1);
    if (this.steps.length >= 2 || next < 1 || next > top) {
      this.finished = true;
      return;
    }
    this.level = next;
    this.load();
  }

  /** The highest level passed (0: none), with what was asked. */
  result(): { passed: number; steps: { level: number; right: number; asked: number }[] } {
    return { passed: Math.max(0, ...this.steps.filter((s) => s.right >= READING_PASS).map((s) => s.level)), steps: [...this.steps] };
  }

  snapshot(): ReadingPlacementView {
    const q = this.questions[this.index];
    if (this.finished || !q) return { phase: "done", level: this.level, step: this.steps.length, index: 0, total: 0, passage: null, question: null };
    return { phase: "asking", level: this.level, step: this.steps.length, index: this.index, total: this.questions.length, passage: { title: this.passage!.title, text: this.passage!.text }, question: { prompt: q.prompt, options: [...q.options] } };
  }
}

/** The listening part: three sentences, one try each. Each is stored as a Listen and write answer, so it is not asked again soon. */
export class ListeningPlacement {
  private readonly content: Dictation;
  private readonly history: DictationRecord[];
  private level: number;
  private current: Sentence | null = null;
  private steps: { id: string; level: number; perfect: boolean }[] = [];
  private log: DictationRecord[] = [];

  constructor(content: Dictation, start: number, history: readonly DictationRecord[]) {
    this.content = content;
    this.history = [...history];
    this.level = start;
    this.load();
  }

  private load(): void {
    const used = new Set(this.steps.map((s) => s.id));
    this.current = pick(this.content, this.level, this.history).find((s) => !used.has(s.id)) ?? null;
  }

  get finished(): boolean {
    return this.steps.length >= LISTENING_STEPS || !this.current;
  }

  /** The sentence to say aloud: for the speaker only. */
  spoken(): string | null {
    return this.finished ? null : this.current!.text;
  }

  take(): DictationRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  check(typed: string, plays: number): void {
    if (this.finished) return;
    const s = this.current!;
    if (!wordsOf(typed).length) return; // nothing typed
    const m = mark(s, typed);
    // one try, marked the same way as Listen and write. For placement a sentence passes when its words are right:
    // capital letters and the end mark do not count, and a sentence of eight words or more may have one word wrong.
    const passed = listeningPass(m.right, m.total);
    const record: DictationRecord = { type: "answer", sitting: "level-check", id: s.id, level: s.level, tries: 1, perfectFirst: m.perfect, perfect: m.perfect, right: m.right, total: m.total, missed: m.missed, misspelt: m.misspelt, capitals: m.capitals, end: m.end === "ok", plays, typed: typed.trim().slice(0, 200) };
    this.log.push(record);
    this.history.push(record);
    this.steps.push({ id: s.id, level: s.level, perfect: passed });
    const ids = this.content.levels.map((l) => l.id);
    this.level = Math.min(Math.max(...ids), Math.max(Math.min(...ids), this.level + (passed ? 1 : -1)));
    this.load();
  }

  result(): { level: number; steps: { id: string; level: number; perfect: boolean }[] } {
    return { level: Math.max(Math.min(...this.content.levels.map((l) => l.id)), ...this.steps.filter((s) => s.perfect).map((s) => s.level)), steps: [...this.steps] };
  }

  snapshot(): { phase: "write" | "done"; index: number; total: number; id: string | null } {
    return this.finished ? { phase: "done", index: this.steps.length, total: LISTENING_STEPS, id: null } : { phase: "write", index: this.steps.length, total: LISTENING_STEPS, id: this.current!.id };
  }
}

/** The reading level type, for callers that pass the start level to the course. */
export const asReadingLevel = (n: number | null | undefined): Level | undefined => (n === 1 || n === 2 || n === 3 ? n : undefined);

export const spellingStart = (age: "early" | "school" | "older" | null | undefined): number => (age === "early" ? 1 : age === "older" ? 3 : 2);

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** The spelling part: six dictated words of the Spelling Bee, one try each, a level up after a right one and down otherwise. */
export class SpellingPlacement {
  private readonly words: SpellWord[];
  private readonly top: number;
  private level: number;
  private current: SpellWord | null = null;
  private steps: { word: string; level: number; correct: boolean }[] = [];

  constructor(words: readonly SpellWord[], start: number) {
    this.words = words.filter((w) => w.level !== undefined).map((w) => ({ w, k: hash(`level-check|${w.id}`) })).sort((a, b) => a.k - b.k || (a.w.id < b.w.id ? -1 : 1)).map((x) => x.w);
    this.top = Math.max(1, ...this.words.map((w) => w.level!));
    this.level = Math.min(this.top, Math.max(1, start));
    this.load();
  }

  private load(): void {
    const used = new Set(this.steps.map((s) => s.word));
    this.current = this.words.find((w) => w.level === this.level && !used.has(w.word)) ?? null;
  }

  get finished(): boolean {
    return this.steps.length >= SPELLING_STEPS || !this.current;
  }

  /** What to say aloud: the word, its sentence, the word again. For the speaker only. */
  spoken(wordOnly = false): string | null {
    const w = this.current;
    if (this.finished || !w) return null;
    return w.sentence && !wordOnly ? `${w.word}. ${w.sentence} ${w.word}.` : `${w.word}.`;
  }

  answer(typed: string): void {
    const w = this.current;
    if (this.finished || !w || !typed.trim()) return;
    const correct = checkSpelling(w, typed);
    this.steps.push({ word: w.word, level: w.level!, correct });
    this.level = Math.min(this.top, Math.max(1, this.level + (correct ? 1 : -1)));
    this.load();
  }

  result(): { level: number; steps: { word: string; level: number; correct: boolean }[] } {
    return { level: Math.max(1, ...this.steps.filter((s) => s.correct).map((s) => s.level)), steps: [...this.steps] };
  }

  snapshot(): { phase: "write" | "done"; index: number; total: number; id: string | null } {
    return this.finished ? { phase: "done", index: this.steps.length, total: SPELLING_STEPS, id: null } : { phase: "write", index: this.steps.length, total: SPELLING_STEPS, id: this.current!.id };
  }
}
