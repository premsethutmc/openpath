/**
 * Grammar in use (content/english/grammar/in-use.json): the learner fixes or builds a sentence, so grammar is used,
 * not just recognised.
 *
 *   fix    a sentence has one wrong word: tap it, then type the right word;
 *   build  the words of a sentence are given as tiles (sometimes with one or two that do not belong): put them in order.
 *
 * Every answer gets the right sentence and a one-line rule. A sitting is eight sentences at the learner's level;
 * six or more right moves the level up, three or fewer moves it down. Sentences got wrong return in a later sitting.
 * A sitting can also be asked for particular topics (the syllabus screen does this); such a sitting does not move
 * the level. Scoring is by code. Practice-only: nothing here is evidence for the engine.
 */
import itemsJson from "../../../../../content/english/grammar/in-use.json";
import { SCALE, rescale, startFor } from "../scale.ts";

export const SITTING_SIZE = 8;
export const MOVE_UP = 6;
export const MOVE_DOWN = 3;
export const MIN_OF_KIND = 3;
export const MAX_SPOT = 2;

export const ASKS = ["noun", "verb", "adjective", "pronoun", "adverb", "preposition", "conjunction"] as const;
export type Ask = (typeof ASKS)[number];
export interface GrammarItem {
  id: string;
  level: number;
  topic: string;
  kind: "fix" | "build" | "spot";
  /** spot: the kind of word to find. */
  ask?: Ask;
  /** fix: the sentence with the wrong word in [brackets]. build: the sentence to build. spot: the sentence to look in. */
  sentence: string;
  rule: string;
  /** fix: the accepted corrections. spot: every word of the sentence that is of the kind asked for. */
  right?: string[];
  /** build: whole sentences to put in order, in place of words. */
  parts?: string[];
  /** build: tiles that do not belong. */
  extra?: string[];
}
export interface GrammarUse {
  version: number;
  status: string;
  levels: { id: number; name: string }[];
  topics: { id: string; name: string }[];
  items: GrammarItem[];
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
const hashOrder = <T>(xs: readonly T[], key: (x: T) => string) => xs.map((x) => ({ x, k: hash(key(x)), s: key(x) })).sort((a, b) => a.k - b.k || (a.s < b.s ? -1 : 1)).map((e) => e.x);
const tidy = (s: string) => s.replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

/** A spot item's words as shown, and a word without the punctuation around it. */
export const spotWords = (item: GrammarItem): string[] => item.sentence.split(" ");
const bare = (w: string) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
/** Is the word tapped one of the kind asked for? */
export const checkSpot = (item: GrammarItem, tapped: number): boolean => (item.right ?? []).includes(bare(spotWords(item)[tapped] ?? ""));

/** A fix item's words as shown (the wrong one unmarked), which one is wrong, and the punctuation around it. */
export function fixParts(item: GrammarItem): { words: string[]; wrong: number; before: string; after: string } {
  const tokens = item.sentence.split(" ");
  const wrong = tokens.findIndex((t) => t.includes("["));
  const m = /^(.*)\[(.+)\](.*)$/.exec(tokens[wrong] ?? "");
  return { words: tokens.map((t) => t.replace(/[[\]]/g, "")), wrong, before: m?.[1] ?? "", after: m?.[3] ?? "" };
}
/** The sentence put right, with the first accepted correction. */
export function corrected(item: GrammarItem): string {
  if (item.kind === "build") return item.sentence;
  if (item.kind === "spot") return `${item.sentence} — ${item.ask}: ${(item.right ?? []).join(", ")}`;
  const p = fixParts(item);
  return p.words.map((w, i) => (i === p.wrong ? `${p.before}${item.right![0]}${p.after}` : w)).join(" ");
}
/** A build item's tiles, in a fixed order that is never the answer itself. */
export function tiles(item: GrammarItem): string[] {
  const base = item.parts ?? item.sentence.split(" ");
  const words = [...base, ...(item.extra ?? [])];
  for (let salt = 0; salt < 8; salt++) {
    const order = hashOrder(words.map((w, i) => ({ w, i })), (x) => `${item.id}|${salt}|${x.i}`).map((x) => x.w);
    if (order.slice(0, base.length).join(" ") !== item.sentence) return order;
  }
  return [...words].reverse();
}

export function grammarProblems(g: GrammarUse): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const it of g.items) {
    if (ids.has(it.id)) out.push(`${it.id}: listed twice`);
    ids.add(it.id);
    if (!g.levels.some((l) => l.id === it.level)) out.push(`${it.id}: unknown level`);
    if (!g.topics.some((t) => t.id === it.topic)) out.push(`${it.id}: unknown topic`);
    if (!it.rule.trim()) out.push(`${it.id}: no rule`);
    if (it.kind === "spot") {
      const words = spotWords(it).map(bare);
      if (!it.ask || !ASKS.includes(it.ask)) out.push(`${it.id}: no kind of word to find`);
      if (!it.right?.length) out.push(`${it.id}: no right word`);
      for (const r of it.right ?? []) if (words.filter((w) => w === r).length !== 1) out.push(`${it.id}: "${r}" must be in the sentence once`);
      if (words.length < 3 || words.length > 10) out.push(`${it.id}: ${words.length} words`);
    } else if (it.kind === "fix") {
      if ((it.sentence.match(/\[/g) ?? []).length !== 1 || !/\[[^\] ]+\]/.test(it.sentence)) out.push(`${it.id}: exactly one wrong word, in brackets`);
      else {
        const p = fixParts(it);
        const wrongWord = p.words[p.wrong].slice(p.before.length, p.words[p.wrong].length - p.after.length);
        if (!it.right?.length) out.push(`${it.id}: no correction`);
        else if (it.right.some((r) => tidy(r) === wrongWord)) out.push(`${it.id}: the correction is the wrong word itself`);
      }
    } else {
      const n = (it.parts ?? it.sentence.split(" ")).length;
      if (it.parts && it.parts.join(" ") !== it.sentence) out.push(`${it.id}: the parts do not make the sentence`);
      if (n < 3 || n > 12) out.push(`${it.id}: ${n} tiles`);
      if (!/[.?!]"?$/.test(it.sentence)) out.push(`${it.id}: the sentence has no end mark`);
      if ((it.extra ?? []).some((e) => it.sentence.split(" ").includes(e))) out.push(`${it.id}: an extra tile is a word of the sentence`);
    }
  }
  for (const l of g.levels) if (g.items.filter((i) => i.level === l.id).length < SITTING_SIZE * 2) out.push(`level ${l.id}: needs at least ${SITTING_SIZE * 2} sentences`);
  return out;
}

export const GRAMMAR: GrammarUse = itemsJson as unknown as GrammarUse;
{
  const problems = grammarProblems(GRAMMAR);
  if (problems.length) throw new Error(`grammar in use: ${problems.slice(0, 5).join("; ")}`);
}

/** Is a fix right? The word tapped must be the wrong one, and the typed word an accepted correction. */
export function checkFix(item: GrammarItem, tapped: number, typed: string): boolean {
  const t = tidy(typed);
  // capital letters matter only where the correction itself has one (a name, or the first word of a sentence)
  const same = (r: string) => (/[A-Z]/.test(r) ? t === r : t.toLowerCase() === r.toLowerCase());
  return tapped === fixParts(item).wrong && (item.right ?? []).some(same);
}
/** Is a built sentence right? The tiles chosen, in order, must make the sentence. */
export const checkBuild = (item: GrammarItem, chosen: readonly string[]): boolean => tidy(chosen.join(" ")) === tidy(item.sentence);

export type GrammarRecord =
  | { type: "start"; sitting: string; level: number; scale?: number; topics?: string[] }
  | { type: "answer"; sitting: string; id: string; level: number; scale?: number; topic: string; correct: boolean; given: string }
  | { type: "end"; sitting: string; level: number; scale?: number; asked: number; right: number; topics?: string[] };
type Answer = Extract<GrammarRecord, { type: "answer" }>;

/** Levels recorded before the six-level scale: old 1, 2, 3 are now 1, 3, 5. */
export const OLD_LEVELS: Readonly<Record<number, number>> = { 1: 1, 2: 3, 3: 5 };
export const startLevel = startFor;

/** The level for the next sitting: the last finished level sitting's level, moved by how it went. Topic sittings do not count. */
export function levelFor(g: GrammarUse, records: readonly GrammarRecord[], start: number): number {
  const ids = g.levels.map((l) => l.id);
  const clamp = (x: number) => Math.min(Math.max(...ids), Math.max(Math.min(...ids), x));
  const last = [...records].reverse().find((r): r is Extract<GrammarRecord, { type: "end" }> => r.type === "end" && !r.topics && r.asked >= SITTING_SIZE);
  return last ? clamp(rescale(last, OLD_LEVELS) + (last.right >= MOVE_UP ? 1 : last.right <= MOVE_DOWN ? -1 : 0)) : clamp(start);
}

/** The sentences for a sitting: new ones first, then ones last got wrong, then the oldest; no topic more than three times, and some of each kind. */
export function pick(g: GrammarUse, level: number, records: readonly GrammarRecord[], topics?: readonly string[]): GrammarItem[] {
  const latest = new Map<string, { correct: boolean; i: number }>();
  records.forEach((r, i) => r.type === "answer" && latest.set(r.id, { correct: r.correct, i }));
  const pool = topics?.length ? g.items.filter((it) => topics.includes(it.topic)).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level)) : g.items.filter((it) => it.level === level);
  const rank = (it: GrammarItem) => (!latest.has(it.id) ? 0 : latest.get(it.id)!.correct ? 2 : 1);
  const ordered = hashOrder(pool, (it) => `grammar|${it.id}`).sort((a, b) => rank(a) - rank(b) || (latest.get(a.id)?.i ?? 0) - (latest.get(b.id)?.i ?? 0));
  const out: GrammarItem[] = [];
  // in a level sitting, naming words takes at most two places, so there is room for three to fix and three to build
  const tooManySpots = (it: GrammarItem) => !topics?.length && it.kind === "spot" && out.filter((o) => o.kind === "spot").length >= MAX_SPOT;
  const perTopic = new Map<string, number>();
  const cap = topics?.length ? SITTING_SIZE : 3;
  for (const it of ordered) {
    if (out.length >= SITTING_SIZE) break;
    if ((perTopic.get(it.topic) ?? 0) >= cap) continue;
    if (tooManySpots(it)) continue;
    perTopic.set(it.topic, (perTopic.get(it.topic) ?? 0) + 1);
    out.push(it);
  }
  for (const it of ordered) if (out.length < SITTING_SIZE && !out.includes(it) && !tooManySpots(it)) out.push(it);
  // both kinds in every sitting where the pool allows: at least MIN_OF_KIND to fix and to build
  for (const kind of ["build", "fix"] as const) {
    const spare = ordered.filter((it) => it.kind === kind && !out.includes(it));
    while (out.filter((it) => it.kind === kind).length < MIN_OF_KIND && spare.length) {
      const drop = out.map((it) => it.kind).lastIndexOf(kind === "build" ? "fix" : "build");
      if (drop < 0) break;
      out[drop] = spare.shift()!;
    }
  }
  return out;
}

export interface GrammarSummary {
  answered: number;
  right: number;
  level: number | null;
  /** Topics with at least one wrong answer among the latest answers to their sentences, most misses first. */
  weak: string[];
}
export function grammarSummary(g: GrammarUse, records: readonly GrammarRecord[]): GrammarSummary {
  const answers = records.filter((r): r is Answer => r.type === "answer");
  const latest = new Map<string, Answer>();
  for (const a of answers) latest.set(a.id, a);
  const misses = new Map<string, number>();
  for (const a of latest.values()) if (!a.correct) misses.set(a.topic, (misses.get(a.topic) ?? 0) + 1);
  const name = (id: string) => g.topics.find((t) => t.id === id)?.name ?? id;
  const lastLevel = [...records].reverse().find((r) => r.type === "end" && !r.topics);
  return { answered: answers.length, right: answers.filter((a) => a.correct).length, level: lastLevel ? rescale(lastLevel as { level: number; scale?: number }, OLD_LEVELS) : null, weak: [...misses].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t]) => name(t)) };
}

export interface GrammarView {
  phase: "ask" | "feedback" | "done";
  index: number;
  total: number;
  level: number;
  id: string | null;
  topic: string | null;
  /** The sentence to fix (its words, the wrong one unmarked) or the tiles to build with: no answer key. */
  fix: { words: string[] } | null;
  build: { tiles: string[]; whole: boolean } | null;
  spot: { words: string[]; ask: Ask } | null;
  feedback: { correct: boolean; given: string; right: string; rule: string; wrongWord: string | null } | null;
  done: { asked: number; right: number; weak: string[]; nextLevel: number } | null;
}

/** One sitting. Every step appends records; the caller stores what `take()` returns. */
export class GrammarSitting {
  private readonly content: GrammarUse;
  private readonly history: readonly GrammarRecord[];
  private readonly sitting: string;
  private readonly items: GrammarItem[];
  private readonly topics: string[] | undefined;
  private log: GrammarRecord[] = [];
  private answers: Answer[] = [];
  private index = 0;
  private last: GrammarView["feedback"] = null;
  private ended = false;
  readonly level: number;

  constructor(content: GrammarUse, level: number, history: readonly GrammarRecord[], topics?: readonly string[]) {
    this.content = content;
    this.level = level;
    this.history = history;
    this.topics = topics?.length ? [...topics] : undefined;
    this.sitting = `g${history.filter((r) => r.type === "start").length + 1}`;
    this.items = pick(content, level, history, this.topics);
    this.log.push({ type: "start", sitting: this.sitting, level, scale: SCALE, ...(this.topics ? { topics: this.topics } : {}) });
  }

  take(): GrammarRecord[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  private record(correct: boolean, given: string): void {
    const it = this.items[this.index];
    const a: Answer = { type: "answer", sitting: this.sitting, id: it.id, level: it.level, scale: SCALE, topic: it.topic, correct, given: given.slice(0, 200) };
    this.answers.push(a);
    this.log.push(a);
    const p = it.kind === "fix" ? fixParts(it) : null;
    this.last = { correct, given, right: corrected(it), rule: it.rule, wrongWord: p ? p.words[p.wrong] : null };
  }

  /** Answer a fix: the index of the word tapped and the word typed in its place. */
  fix(tapped: number, typed: string): void {
    const it = this.items[this.index];
    if (this.last || !it || it.kind !== "fix" || !typed.trim()) return;
    const words = fixParts(it).words;
    if (!Number.isInteger(tapped) || tapped < 0 || tapped >= words.length) return;
    this.record(checkFix(it, tapped, typed), `${words[tapped]} -> ${tidy(typed)}`);
  }

  /** Answer a spot: the index of the word tapped. */
  spot(tapped: number): void {
    const it = this.items[this.index];
    if (this.last || !it || it.kind !== "spot") return;
    const words = spotWords(it);
    if (!Number.isInteger(tapped) || tapped < 0 || tapped >= words.length) return;
    this.record(checkSpot(it, tapped), bare(words[tapped]));
  }

  /** Answer a build: the tiles chosen, in order. */
  build(chosen: readonly string[]): void {
    const it = this.items[this.index];
    if (this.last || !it || it.kind !== "build" || !chosen.length) return;
    this.record(checkBuild(it, chosen), chosen.join(" "));
  }

  next(): void {
    if (!this.last) return;
    this.last = null;
    if (++this.index >= this.items.length && !this.ended) {
      this.ended = true;
      this.log.push(this.endRecord());
    }
  }

  private endRecord(): Extract<GrammarRecord, { type: "end" }> {
    return { type: "end", sitting: this.sitting, level: this.level, scale: SCALE, asked: this.answers.length, right: this.answers.filter((a) => a.correct).length, ...(this.topics ? { topics: this.topics } : {}) };
  }

  snapshot(): GrammarView {
    const it = this.items[this.index];
    const base = { index: Math.min(this.index, this.items.length - 1), total: this.items.length, level: this.level, id: it?.id ?? null, topic: it ? (this.content.topics.find((t) => t.id === it.topic)?.name ?? it.topic) : null, fix: null, build: null, spot: null, feedback: null, done: null };
    if (this.last) return { ...base, phase: "feedback", feedback: this.last };
    if (!it) {
      const name = (id: string) => this.content.topics.find((t) => t.id === id)?.name ?? id;
      return { ...base, phase: "done", done: { asked: this.answers.length, right: this.answers.filter((a) => a.correct).length, weak: [...new Set(this.answers.filter((a) => !a.correct).map((a) => name(a.topic)))], nextLevel: levelFor(this.content, [...this.history, this.endRecord()], this.level) } };
    }
    if (it.kind === "spot") return { ...base, phase: "ask", spot: { words: spotWords(it), ask: it.ask! } };
    return it.kind === "fix" ? { ...base, phase: "ask", fix: { words: fixParts(it).words } } : { ...base, phase: "ask", build: { tiles: tiles(it), whole: !!it.parts } };
  }
}
