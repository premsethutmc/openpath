/**
 * Kinds of text (content/english/reading/kinds.json): poems, notices, timetables, charts, letters, instructions,
 * adverts, articles, speeches, play scripts and pairs of texts to compare, at reading levels 1 to 7. One text a
 * sitting, four to six questions, each with its explanation. The questions add the skills the passage course does
 * not teach: a word's meaning in context, the writer's purpose and point of view, figurative language, how a text
 * is set out, comparing two texts and summing up. Practice-only: nothing here is evidence for the engine.
 */
import kindsJson from "../../../../../content/english/reading/kinds.json";

export type KindSkill =
  | "detail" | "inference" | "cause" | "sequence" | "feelings" | "theme" | "fact_opinion"
  | "word_meaning" | "purpose" | "point_of_view" | "figurative" | "structure" | "compare" | "summary";
export const KIND_SKILLS: readonly KindSkill[] = ["detail", "inference", "cause", "sequence", "feelings", "theme", "fact_opinion", "word_meaning", "purpose", "point_of_view", "figurative", "structure", "compare", "summary"];
export type TextKind = "poem" | "notice" | "timetable" | "chart" | "letter" | "diary" | "instructions" | "advert" | "article" | "speech" | "pair" | "story";
export const KIND_NAMES: Record<TextKind, string> = {
  poem: "Poem", notice: "Notice", timetable: "Timetable", chart: "Chart", letter: "Letter", diary: "Diary",
  instructions: "Instructions", advert: "Advert", article: "Article", speech: "Speech", pair: "Two texts", story: "Story",
};
export const SKILL_NAMES: Record<KindSkill, string> = {
  detail: "finding details", inference: "reading between the lines", cause: "cause and effect", sequence: "order", feelings: "feelings", theme: "theme",
  fact_opinion: "fact or opinion", word_meaning: "word meaning", purpose: "the writer's purpose", point_of_view: "point of view",
  figurative: "figurative language", structure: "how it is set out", compare: "comparing texts", summary: "summing up",
};

export interface KindQuestion {
  skill: KindSkill;
  prompt: string;
  right: string;
  wrong: string[];
  explain: string;
}
export interface KindText {
  id: string;
  level: number;
  kind: TextKind;
  title: string;
  text: string;
  questions: KindQuestion[];
}
export interface Kinds {
  id: string;
  version: number;
  texts: KindText[];
}

export const KINDS: Kinds = kindsJson as unknown as Kinds;
export const KIND_LEVELS = 7;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
/** The options in a fixed shuffled order, and where the right one is. */
export function kindChoices(q: KindQuestion, key: string): { options: string[]; answer: number } {
  const options = [q.right, ...q.wrong].map((o) => ({ o, k: hash(`kind|${key}|${o}`) })).sort((a, b) => a.k - b.k || (a.o < b.o ? -1 : 1)).map((x) => x.o);
  return { options, answer: options.indexOf(q.right) };
}

export function kindsProblems(k: Kinds): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const t of k.texts) {
    if (ids.has(t.id)) out.push(`${t.id}: listed twice`);
    ids.add(t.id);
    if (!(t.kind in KIND_NAMES)) out.push(`${t.id}: unknown kind ${t.kind}`);
    if (!Number.isInteger(t.level) || t.level < 1 || t.level > KIND_LEVELS) out.push(`${t.id}: level ${t.level}`);
    if (!t.title || !t.text) out.push(`${t.id}: no title or text`);
    if (t.questions.length < 4 || t.questions.length > 6) out.push(`${t.id}: ${t.questions.length} questions`);
    if (t.kind === "pair" && !t.questions.some((q) => q.skill === "compare")) out.push(`${t.id}: two texts but no question comparing them`);
    for (const q of t.questions) {
      if (!KIND_SKILLS.includes(q.skill)) out.push(`${t.id}: unknown skill ${q.skill}`);
      if (q.wrong.length !== 2) out.push(`${t.id}: "${q.prompt}" needs two wrong choices`);
      if (new Set([q.right, ...q.wrong].map((o) => o.toLowerCase())).size !== 3) out.push(`${t.id}: "${q.prompt}" repeats a choice`);
      if (!q.explain) out.push(`${t.id}: "${q.prompt}" has no explanation`);
      if (q.right.length > 1.6 * Math.max(...q.wrong.map((w) => w.length))) out.push(`${t.id}: "${q.prompt}" the right choice is much the longest`);
    }
  }
  return out;
}
{
  const problems = kindsProblems(KINDS);
  if (problems.length) throw new Error(`kinds of text: ${problems.slice(0, 5).join("; ")}`);
}

/** One text read and its questions answered. */
export type KindRecord = { type: "text"; text: string; answers: { skill: KindSkill; correct: boolean }[] };

/**
 * The learner's level in this activity: it starts at their reading level, goes up one after two strong texts in a
 * row (four of five or better) at that level or above, and down one after two weak ones (under half right).
 */
export function kindLevel(k: Kinds, records: readonly KindRecord[], start: number): number {
  let level = Math.min(KIND_LEVELS, Math.max(1, start));
  let run: "strong" | "weak" | null = null;
  let count = 0;
  for (const r of records) {
    const t = k.texts.find((x) => x.id === r.text);
    const share = r.answers.filter((a) => a.correct).length / Math.max(1, r.answers.length);
    const now = share >= 0.8 && (t?.level ?? 0) >= level ? "strong" : share < 0.5 && (t?.level ?? 99) <= level ? "weak" : null;
    count = now && now === run ? count + 1 : now ? 1 : 0;
    run = now;
    if (count === 2) {
      level = Math.min(KIND_LEVELS, Math.max(1, level + (run === "strong" ? 1 : -1)));
      count = 0;
      run = null;
    }
  }
  return level;
}

/**
 * The next text: unread, at the learner's level first, then one below, then one above, never further away; within
 * a level, a kind the learner has met least. Null when every text near the level is read.
 */
export function nextKind(k: Kinds, records: readonly KindRecord[], start: number): KindText | null {
  const done = new Set(records.map((r) => r.text));
  const at = kindLevel(k, records, start);
  const met = new Map<TextKind, number>();
  for (const r of records) {
    const t = k.texts.find((x) => x.id === r.text);
    if (t) met.set(t.kind, (met.get(t.kind) ?? 0) + 1);
  }
  const order = (l: number) => (l === at ? 0 : l === at - 1 ? 1 : 2);
  const fresh = k.texts
    .filter((t) => !done.has(t.id) && Math.abs(t.level - at) <= 1)
    .sort((a, b) => order(a.level) - order(b.level) || (met.get(a.kind) ?? 0) - (met.get(b.kind) ?? 0) || (a.id < b.id ? -1 : 1));
  return fresh[0] ?? null;
}

export interface KindView {
  phase: "read" | "ask" | "answered" | "done";
  title: string;
  kind: TextKind;
  text: string;
  index: number;
  total: number;
  question: { prompt: string; skill: KindSkill; options: string[] } | null;
  answered: { correct: boolean; right: string; explain: string } | null;
  right: number;
}

/** One sitting: read the text, then answer its questions one at a time (the text stays on screen). */
export class KindSitting {
  private phase: KindView["phase"] = "read";
  private index = 0;
  private readonly answers: { skill: KindSkill; correct: boolean }[] = [];
  private last: KindView["answered"] = null;
  private readonly log: KindRecord[] = [];
  readonly text: KindText;

  constructor(text: KindText) {
    this.text = text;
  }

  private key = (i: number) => `${this.text.id}|${i}`;

  read(): void {
    if (this.phase === "read") this.phase = "ask";
  }

  answer(choice: number): void {
    if (this.phase !== "ask") return;
    const q = this.text.questions[this.index];
    const c = kindChoices(q, this.key(this.index));
    if (!Number.isInteger(choice) || choice < 0 || choice >= c.options.length) return;
    const correct = choice === c.answer;
    this.answers.push({ skill: q.skill, correct });
    this.last = { correct, right: q.right, explain: q.explain };
    this.phase = "answered";
  }

  next(): void {
    if (this.phase !== "answered") return;
    this.last = null;
    if (++this.index < this.text.questions.length) this.phase = "ask";
    else {
      this.phase = "done";
      this.log.push({ type: "text", text: this.text.id, answers: [...this.answers] });
    }
  }

  snapshot(): KindView {
    const q = this.phase === "ask" || this.phase === "answered" ? this.text.questions[this.index] : null;
    return {
      phase: this.phase,
      title: this.text.title,
      kind: this.text.kind,
      text: this.text.text,
      index: this.index,
      total: this.text.questions.length,
      question: q ? { prompt: q.prompt, skill: q.skill, options: kindChoices(q, this.key(this.index)).options } : null,
      answered: this.last,
      right: this.answers.filter((a) => a.correct).length,
    };
  }

  /** The record of a finished sitting (nothing for one left unfinished). */
  take(): KindRecord[] {
    return this.log.splice(0);
  }
}

export interface KindsSummary {
  texts: number;
  right: number;
  asked: number;
  /** Skills with at least three answers and under half right, weakest first. */
  weak: KindSkill[];
}
export function kindsSummary(records: readonly KindRecord[]): KindsSummary {
  const all = records.flatMap((r) => r.answers);
  const by = new Map<KindSkill, { r: number; n: number }>();
  for (const a of all) {
    const s = by.get(a.skill) ?? { r: 0, n: 0 };
    s.n++;
    if (a.correct) s.r++;
    by.set(a.skill, s);
  }
  const weak = [...by].filter(([, s]) => s.n >= 3 && s.r / s.n < 0.5).sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n).map(([k]) => k);
  return { texts: records.length, right: all.filter((a) => a.correct).length, asked: all.length, weak };
}
