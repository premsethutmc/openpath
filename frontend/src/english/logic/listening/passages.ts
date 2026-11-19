/**
 * Listen and answer (content/english/listening/passages.json): the learner hears a short passage, read aloud by the
 * device, and answers four questions on it: details, order or cause, the main idea, and what can be worked out.
 * The passage is never on screen until the questions are answered; then it is shown with each answer explained.
 *
 * A sitting is one passage. All four right moves the level up; none or one right moves it down. New passages come
 * first; when all at a level are heard, the one heard longest ago returns. The learner may listen again as often
 * as wanted, before or between questions. Practice-only: nothing here is evidence for the engine.
 */
import passagesJson from "../../../../../content/english/listening/passages.json";
import { SCALE, rescale, startFor } from "../scale.ts";

export const QUESTIONS = 4;
export const OPTIONS = 3;

export interface ListenQuestion {
  id: string;
  skill: "detail" | "sequence" | "cause" | "main_idea" | "inference";
  prompt: string;
  right: string;
  wrong: string[];
  explain: string;
}
export interface ListenPassage {
  id: string;
  level: number;
  title: string;
  text: string;
  questions: ListenQuestion[];
}
export interface Listening {
  version: number;
  status: string;
  levels: { id: number; name: string }[];
  passages: ListenPassage[];
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
const hashOrder = <T>(xs: readonly T[], key: (x: T) => string) => xs.map((x) => ({ x, k: hash(key(x)), s: key(x) })).sort((a, b) => a.k - b.k || (a.s < b.s ? -1 : 1)).map((e) => e.x);

export const PLACE_SALT = "57";
/** A question's choices in a fixed order, and which is right. */
export function choices(q: ListenQuestion, salt = PLACE_SALT): { options: string[]; answer: number } {
  // the salt was chosen so the right answer falls equally often in each place over the whole bank (a test holds it to that)
  const options = hashOrder([q.right, ...q.wrong], (o) => `${salt}|${q.id}|${o}`);
  return { options, answer: options.indexOf(q.right) };
}
/** The passage in sentences, for reading aloud one at a time (long speech is cut off on some phones). */
export const sentences = (text: string): string[] => text.split(/(?<=[.?!])\s+/).filter(Boolean);

export function listeningProblems(l: Listening): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const p of l.passages) {
    if (ids.has(p.id)) out.push(`${p.id}: listed twice`);
    ids.add(p.id);
    if (!l.levels.some((x) => x.id === p.level)) out.push(`${p.id}: unknown level`);
    const words = p.text.split(/\s+/).length;
    if (words < 40 || words > 140) out.push(`${p.id}: ${words} words`);
    if (/\d/.test(p.text)) out.push(`${p.id}: numbers are written as words, so they are read the same way everywhere`);
    if (p.questions.length !== QUESTIONS) out.push(`${p.id}: needs ${QUESTIONS} questions`);
    for (const q of p.questions) {
      if (ids.has(q.id)) out.push(`${q.id}: listed twice`);
      ids.add(q.id);
      if (new Set([q.right, ...q.wrong]).size !== OPTIONS) out.push(`${q.id}: needs ${OPTIONS} different choices`);
      if (!q.explain.trim()) out.push(`${q.id}: no explanation`);
      const longest = [q.right, ...q.wrong].sort((a, b) => b.length - a.length)[0];
      if (longest === q.right && q.right.length > 1.6 * Math.max(...q.wrong.map((w) => w.length))) out.push(`${q.id}: the right choice stands out by its length`);
    }
  }
  for (const lv of l.levels) if (l.passages.filter((p) => p.level === lv.id).length < 3) out.push(`level ${lv.id}: needs at least 3 passages`);
  return out;
}

export const LISTENING: Listening = passagesJson as unknown as Listening;
{
  const problems = listeningProblems(LISTENING);
  if (problems.length) throw new Error(`listen and answer: ${problems.slice(0, 5).join("; ")}`);
}

export type ListenRecord = { type: "result"; passage: string; level: number; scale?: number; plays: number; right: number; answers: { question: string; skill: string; choice: number; correct: boolean }[] };

/** Levels recorded before the six-level scale: old 1, 2, 3 are now 2, 4, 5. */
export const OLD_LEVELS: Readonly<Record<number, number>> = { 1: 2, 2: 4, 3: 5 };
export const startLevel = startFor;

/** The level for the next passage: the last passage's level, moved up after four right and down after none or one. */
export function levelFor(l: Listening, records: readonly ListenRecord[], start: number): number {
  const ids = l.levels.map((x) => x.id);
  const clamp = (x: number) => Math.min(Math.max(...ids), Math.max(Math.min(...ids), x));
  const last = records.at(-1);
  return last ? clamp(rescale(last, OLD_LEVELS) + (last.right >= QUESTIONS ? 1 : last.right <= 1 ? -1 : 0)) : clamp(start);
}

/** The next passage: one not heard yet at the level, else the one heard longest ago. */
export function pick(l: Listening, level: number, records: readonly ListenRecord[]): ListenPassage {
  const lastHeard = new Map<string, number>();
  records.forEach((r, i) => lastHeard.set(r.passage, i));
  const pool = hashOrder(l.passages.filter((p) => p.level === level), (p) => `listen|${p.id}`);
  // once every passage of the level has been heard, one not yet heard from the level below comes before a repeat
  // (sim-english@1: four or five passages a level, one a day, came round again within the week)
  const below = hashOrder(l.passages.filter((p) => p.level === level - 1), (p) => `listen|${p.id}`);
  return pool.find((p) => !lastHeard.has(p.id)) ?? below.find((p) => !lastHeard.has(p.id)) ?? [...pool].sort((a, b) => lastHeard.get(a.id)! - lastHeard.get(b.id)!)[0];
}

export interface ListenSummary {
  passages: number;
  right: number;
  asked: number;
  level: number | null;
  /** Kinds of question missed more often than answered right, in plain words. */
  weak: string[];
}
const SKILL: Record<string, string> = { detail: "details", sequence: "the order of events", cause: "why things happen", main_idea: "the main idea", inference: "working things out" };
export function listenSummary(records: readonly ListenRecord[]): ListenSummary {
  const all = records.flatMap((r) => r.answers);
  const by = new Map<string, { right: number; wrong: number }>();
  for (const a of all) {
    const s = by.get(a.skill) ?? { right: 0, wrong: 0 };
    a.correct ? s.right++ : s.wrong++;
    by.set(a.skill, s);
  }
  return { passages: records.length, right: all.filter((a) => a.correct).length, asked: all.length, level: records.length ? rescale(records.at(-1)!, OLD_LEVELS) : null, weak: [...by].filter(([, s]) => s.wrong > s.right).map(([k]) => SKILL[k] ?? k) };
}

export interface ListenView {
  phase: "listen" | "ask" | "done";
  level: number;
  passage: string;
  index: number;
  total: number;
  /** The question on screen: no answer key. */
  question: { prompt: string; options: string[] } | null;
  /** After the last answer: the passage itself, and each question with the right answer and why. */
  done: { title: string; text: string; right: number; review: { prompt: string; chosen: string; right: string; correct: boolean; explain: string }[]; nextLevel: number } | null;
}

/** One sitting: one passage and its questions. The caller stores what `take()` returns. */
export class ListenSitting {
  private readonly content: Listening;
  private readonly history: readonly ListenRecord[];
  private readonly item: ListenPassage;
  private phase: ListenView["phase"] = "listen";
  private index = 0;
  private picks: number[] = [];
  private plays = 0;
  private log: ListenRecord[] = [];
  readonly level: number;

  constructor(content: Listening, level: number, history: readonly ListenRecord[]) {
    this.content = content;
    this.level = level;
    this.history = history;
    this.item = pick(content, level, history);
  }

  /** The passage to read aloud, sentence by sentence: for the speaker only. */
  spoken(): string[] {
    return sentences(this.item.text);
  }

  /** The passage was played (again). */
  played(): void {
    if (this.phase !== "done") this.plays++;
  }

  /** Go on to the questions. */
  ready(): void {
    if (this.phase === "listen") this.phase = "ask";
  }

  answer(choice: number): void {
    const q = this.item.questions[this.index];
    if (this.phase !== "ask" || !q || !Number.isInteger(choice) || choice < 0 || choice >= OPTIONS) return;
    this.picks.push(choice);
    if (++this.index < this.item.questions.length) return;
    this.phase = "done";
    this.log.push(this.result());
  }

  private result(): ListenRecord {
    const answers = this.item.questions.map((q, i) => ({ question: q.id, skill: q.skill, choice: this.picks[i], correct: this.picks[i] === choices(q).answer }));
    return { type: "result", passage: this.item.id, level: this.item.level, scale: SCALE, plays: this.plays, right: answers.filter((a) => a.correct).length, answers };
  }

  take(): ListenRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  snapshot(): ListenView {
    const base = { level: this.level, passage: this.item.id, index: this.index, total: this.item.questions.length, question: null, done: null };
    if (this.phase === "listen") return { ...base, phase: "listen" };
    if (this.phase === "ask") {
      const q = this.item.questions[this.index];
      return { ...base, phase: "ask", question: { prompt: q.prompt, options: choices(q).options } };
    }
    const r = this.result();
    const review = this.item.questions.map((q, i) => ({ prompt: q.prompt, chosen: choices(q).options[this.picks[i]], right: q.right, correct: r.answers[i].correct, explain: q.explain }));
    return { ...base, phase: "done", done: { title: this.item.title, text: this.item.text, right: r.right, review, nextLevel: levelFor(this.content, [...this.history, r], this.level) } };
  }
}
