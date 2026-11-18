/**
 * Listen and write (content/english/dictation/sentences.json): the learner hears a short sentence and types it.
 * One activity practises listening, spelling inside a sentence, capital letters and the mark at the end.
 *
 * Marking is word by word. The typed words are lined up with the sentence, so a missing or extra word does not
 * make every later word wrong. A word is right, misspelt, right but for its capital letter, missing or extra;
 * the end mark (. ? !) is checked; commas are not marked.
 *
 * A sitting is five sentences. The first check shows what to fix without showing the sentence; the learner gets
 * one more try, then sees the sentence. Sentences not right first time come back in a later sitting. Four or five
 * right first time moves the level up, none or one moves it down. Practice-only: nothing here is evidence for
 * the engine.
 */
import sentencesJson from "../../../../../content/english/dictation/sentences.json";

export const SITTING_SIZE = 5;
export const MOVE_UP = 4;
export const MOVE_DOWN = 1;
export const REDO_PER_SITTING = 2;

export interface Sentence {
  id: string;
  level: number;
  text: string;
  /** Other accepted spellings, by lower-case word. */
  alt: Record<string, string[]>;
}
export interface Level {
  id: number;
  name: string;
  about: string;
}
export interface Dictation {
  version: number;
  status: string;
  levels: Level[];
  sentences: Sentence[];
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

const tidy = (s: string) => s.replace(/[‘’ʼ`]/g, "'").replace(/\s+/g, " ").trim();
const core = (token: string) => token.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "").replace(/^'+|'+$/g, "");
/** The words of a sentence, without the punctuation around them. */
export const wordsOf = (text: string) => tidy(text).split(" ").map(core).filter(Boolean);
const endMark = (text: string) => /[.?!]$/.exec(tidy(text))?.[0] ?? "";

export function buildDictation(raw: unknown): Dictation {
  const r = raw as { version: number; status: string; levels: Level[]; sentences: [string, number, string, Record<string, string[]>?][] };
  return { version: r.version, status: r.status, levels: r.levels, sentences: r.sentences.map(([id, level, text, alt]) => ({ id, level, text, alt: alt ?? {} })) };
}

export function dictationProblems(d: Dictation): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const s of d.sentences) {
    if (ids.has(s.id)) out.push(`${s.id}: listed twice`);
    ids.add(s.id);
    if (texts.has(s.text)) out.push(`${s.id}: the same sentence twice`);
    texts.add(s.text);
    if (!d.levels.some((l) => l.id === s.level)) out.push(`${s.id}: unknown level`);
    if (!/^[A-Z]/.test(s.text)) out.push(`${s.id}: must start with a capital letter`);
    if (!endMark(s.text)) out.push(`${s.id}: must end with a full stop, question mark or exclamation mark`);
    if (/\d/.test(s.text)) out.push(`${s.id}: numbers are written as words`);
    if (/[^A-Za-z' ,.?!-]/.test(s.text)) out.push(`${s.id}: a character that cannot be typed or marked`);
    const n = wordsOf(s.text).length;
    if (n < 4 || n > 14) out.push(`${s.id}: ${n} words`);
    for (const k of Object.keys(s.alt)) if (!wordsOf(s.text).some((w) => w.toLowerCase() === k)) out.push(`${s.id}: another spelling is given for a word that is not in the sentence`);
  }
  for (const l of d.levels) if (d.sentences.filter((s) => s.level === l.id).length < SITTING_SIZE * 2) out.push(`level ${l.id}: needs at least ${SITTING_SIZE * 2} sentences`);
  return out;
}

export const DICTATION: Dictation = buildDictation(sentencesJson);
{
  const problems = dictationProblems(DICTATION);
  if (problems.length) throw new Error(`dictation: ${problems.slice(0, 5).join("; ")}`);
}

export type WordMark =
  | { kind: "ok"; typed: string }
  /** Spelt right, but the capital letter is wrong (missing where needed, or there where not). */
  | { kind: "capital"; typed: string; target: string }
  | { kind: "wrong"; typed: string; target: string }
  | { kind: "extra"; typed: string }
  | { kind: "missing"; target: string };
export interface Mark {
  /** In the order the learner typed, with a place for each missing word. */
  words: WordMark[];
  end: "ok" | "missing" | "wrong";
  perfect: boolean;
  /** Words of the sentence spelt right (capital letters aside), and how many it has. */
  right: number;
  total: number;
  /** Words of the sentence misspelt or left out, lower case. */
  missed: string[];
  capitals: number;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const GAP = 0.5;

/** Mark what was typed against the sentence. */
export function mark(sentence: Pick<Sentence, "text" | "alt">, typedRaw: string): Mark {
  const target = wordsOf(sentence.text);
  const typed = wordsOf(typedRaw);
  const same = (t: string, w: string) => t.toLowerCase() === w.toLowerCase() || (sentence.alt[t.toLowerCase()] ?? []).includes(w.toLowerCase());
  // a word pair costs nothing when the same, a little when alike (a misspelling), and more than a gap when unlike
  const pair = (t: string, w: string) => (same(t, w) ? 0 : (editDistance(t.toLowerCase(), w.toLowerCase()) / Math.max(t.length, w.length)) * 1.25);
  const n = target.length;
  const m = typed.length;
  const cost = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j * GAP : j === 0 ? i * GAP : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) cost[i][j] = Math.min(cost[i - 1][j - 1] + pair(target[i - 1], typed[j - 1]), cost[i - 1][j] + GAP, cost[i][j - 1] + GAP);
  const words: WordMark[] = [];
  for (let i = n, j = m; i > 0 || j > 0; ) {
    if (i > 0 && j > 0 && Math.abs(cost[i][j] - (cost[i - 1][j - 1] + pair(target[i - 1], typed[j - 1]))) < 1e-9) {
      const t = target[i - 1];
      const w = typed[j - 1];
      if (!same(t, w)) words.push({ kind: "wrong", typed: w, target: t });
      else if (w === t || (w.toLowerCase() !== t.toLowerCase() && w === (/^[A-Z]/.test(t) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))) words.push({ kind: "ok", typed: w });
      else words.push({ kind: "capital", typed: w, target: t });
      i--, j--;
    } else if (j > 0 && Math.abs(cost[i][j] - (cost[i][j - 1] + GAP)) < 1e-9) words.push({ kind: "extra", typed: typed[--j] });
    else words.push({ kind: "missing", target: target[--i] });
  }
  words.reverse();
  const want = endMark(sentence.text);
  const got = endMark(typedRaw);
  const end = got === want ? "ok" : got ? "wrong" : "missing";
  const count = (k: WordMark["kind"]) => words.filter((w) => w.kind === k).length;
  return {
    words,
    end,
    perfect: end === "ok" && words.every((w) => w.kind === "ok"),
    right: count("ok") + count("capital"),
    total: n,
    missed: words.flatMap((w) => (w.kind === "wrong" || w.kind === "missing" ? [w.target.toLowerCase()] : [])),
    capitals: count("capital"),
  };
}

/** What to fix, in words a child can act on, without giving the sentence away. Empty when all is right. */
export function fixes(m: Mark): string[] {
  const n = (k: WordMark["kind"]) => m.words.filter((w) => w.kind === k).length;
  const say = (count: number, one: string, many: string) => (count === 1 ? one : many.replace("#", String(count)));
  const out: string[] = [];
  if (n("wrong")) out.push(say(n("wrong"), "One word is not spelt right.", "# words are not spelt right."));
  if (n("missing")) out.push(say(n("missing"), "One word is missing.", "# words are missing."));
  if (n("extra")) out.push(say(n("extra"), "One word should not be there.", "# words should not be there."));
  if (n("capital")) out.push(say(n("capital"), "Check one capital letter.", "Check # capital letters."));
  if (m.end !== "ok") out.push(m.end === "missing" ? "Finish the sentence with the right mark." : "Check the mark at the end.");
  return out;
}

export type DictationRecord =
  | { type: "start"; sitting: string; level: number }
  | { type: "answer"; sitting: string; id: string; level: number; tries: 1 | 2; perfectFirst: boolean; perfect: boolean; right: number; total: number; missed: string[]; capitals: number; end: boolean; plays: number; typed: string }
  | { type: "end"; sitting: string; level: number; asked: number; perfectFirst: number };
type Answer = Extract<DictationRecord, { type: "answer" }>;

export const startLevel = (age: "early" | "school" | "older" | null | undefined) => (age === "early" ? 1 : 2);

/** The level for the next sitting: the last finished sitting's level, moved by how it went. */
export function levelFor(d: Dictation, records: readonly DictationRecord[], start: number): number {
  const last = [...records].reverse().find((r): r is Extract<DictationRecord, { type: "end" }> => r.type === "end");
  const ids = d.levels.map((l) => l.id);
  const clamp = (x: number) => Math.min(Math.max(...ids), Math.max(Math.min(...ids), x));
  if (!last || last.asked < SITTING_SIZE) return clamp(last?.level ?? start);
  return clamp(last.level + (last.perfectFirst >= MOVE_UP ? 1 : last.perfectFirst <= MOVE_DOWN ? -1 : 0));
}

/** The sentences for a sitting: up to two to redo (not right first time last time), then new ones, then the oldest. */
export function pick(d: Dictation, level: number, records: readonly DictationRecord[]): Sentence[] {
  const latest = new Map<string, { a: Answer; i: number }>();
  records.forEach((r, i) => r.type === "answer" && latest.set(r.id, { a: r, i }));
  const pool = d.sentences.filter((s) => s.level === level);
  const seen = pool.filter((s) => latest.has(s.id)).sort((a, b) => latest.get(a.id)!.i - latest.get(b.id)!.i);
  const redo = seen.filter((s) => !latest.get(s.id)!.a.perfectFirst).slice(0, REDO_PER_SITTING);
  const fresh = pool.filter((s) => !latest.has(s.id)).map((s) => ({ s, k: hash(`dictation|${s.id}`) })).sort((a, b) => a.k - b.k || (a.s.id < b.s.id ? -1 : 1)).map((x) => x.s);
  const rest = seen.filter((s) => !redo.includes(s));
  return [...fresh.slice(0, SITTING_SIZE - redo.length), ...redo, ...fresh.slice(SITTING_SIZE - redo.length), ...rest].slice(0, SITTING_SIZE);
}

export interface DictationSummary {
  sentences: number;
  perfectFirst: number;
  level: number | null;
  /** Words misspelt or left out on a first try, most often first. */
  missed: string[];
}
export function dictationSummary(records: readonly DictationRecord[]): DictationSummary {
  const answers = records.filter((r): r is Answer => r.type === "answer");
  const counts = new Map<string, number>();
  for (const a of answers) for (const w of a.missed) counts.set(w, (counts.get(w) ?? 0) + 1);
  return {
    sentences: answers.length,
    perfectFirst: answers.filter((a) => a.perfectFirst).length,
    level: answers.at(-1)?.level ?? null,
    missed: [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([w]) => w),
  };
}

export interface DictationView {
  phase: "write" | "retry" | "marked" | "done";
  index: number;
  total: number;
  level: number;
  /** The sentence's id (never its words while the learner is still writing). */
  id: string | null;
  mark: Mark | null;
  typed: string;
  /** The sentence, once the learner has finished with it. */
  reveal: string | null;
  done: { asked: number; perfectFirst: number; fixed: number; missed: string[]; nextLevel: number } | null;
}

/** One sitting. Every step appends records; the caller stores what `take()` returns. */
export class DictationSitting {
  private readonly content: Dictation;
  private readonly sitting: string;
  private readonly sentences: Sentence[];
  private readonly history: readonly DictationRecord[];
  private log: DictationRecord[] = [];
  private answers: Answer[] = [];
  private index = 0;
  private phase: DictationView["phase"] = "write";
  private first: Mark | null = null;
  private last: Mark | null = null;
  private typed = "";
  private firstTyped = "";
  readonly level: number;

  constructor(content: Dictation, level: number, history: readonly DictationRecord[]) {
    this.content = content;
    this.level = level;
    this.history = history;
    this.sitting = `d${history.filter((r) => r.type === "start").length + 1}`;
    this.sentences = pick(content, level, history);
    this.log.push({ type: "start", sitting: this.sitting, level });
  }

  take(): DictationRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  /** The sentence to say aloud: for the speaker only, never for the screen while the learner writes. */
  spoken(): string | null {
    return this.phase === "done" ? null : this.sentences[this.index].text;
  }

  check(typedRaw: string, plays: number): void {
    if (this.phase !== "write" && this.phase !== "retry") return;
    const typed = tidy(typedRaw);
    if (!wordsOf(typed).length) return;
    const s = this.sentences[this.index];
    const m = mark(s, typed);
    const firstTry = this.phase === "write";
    if (firstTry) {
      this.first = m;
      this.firstTyped = typed;
    }
    this.last = m;
    this.typed = typed;
    if (firstTry && !m.perfect) {
      this.phase = "retry";
      return;
    }
    const f = this.first!;
    const a: Answer = { type: "answer", sitting: this.sitting, id: s.id, level: s.level, tries: firstTry ? 1 : 2, perfectFirst: f.perfect, perfect: m.perfect, right: f.right, total: f.total, missed: f.missed, capitals: f.capitals, end: f.end === "ok", plays, typed: this.firstTyped.slice(0, 200) };
    this.answers.push(a);
    this.log.push(a);
    this.phase = "marked";
  }

  next(): void {
    if (this.phase !== "marked") return;
    this.first = this.last = null;
    this.typed = this.firstTyped = "";
    if (++this.index < this.sentences.length) {
      this.phase = "write";
      return;
    }
    this.phase = "done";
    this.log.push({ type: "end", sitting: this.sitting, level: this.level, asked: this.answers.length, perfectFirst: this.answers.filter((a) => a.perfectFirst).length });
  }

  snapshot(): DictationView {
    const base = { index: Math.min(this.index, this.sentences.length - 1), total: this.sentences.length, level: this.level };
    if (this.phase === "done") {
      const perfectFirst = this.answers.filter((a) => a.perfectFirst).length;
      const end: DictationRecord = { type: "end", sitting: this.sitting, level: this.level, asked: this.answers.length, perfectFirst };
      return { ...base, phase: "done", id: null, mark: null, typed: "", reveal: null, done: { asked: this.answers.length, perfectFirst, fixed: this.answers.filter((a) => !a.perfectFirst && a.perfect).length, missed: [...new Set(this.answers.flatMap((a) => a.missed))], nextLevel: levelFor(this.content, [...this.history, end], this.level) } };
    }
    const s = this.sentences[this.index];
    return { ...base, phase: this.phase, id: s.id, mark: this.last, typed: this.typed, reveal: this.phase === "marked" ? s.text : null, done: null };
  }
}
