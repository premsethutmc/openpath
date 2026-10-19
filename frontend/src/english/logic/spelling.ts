/**
 * Spelling practice: one engine for every source of words. The Spelling Bee's 100 preloaded words come first; a
 * parent's word lists and books use the same sessions, scoring, review and records.
 *
 * Everything here is derived from the learner's own events (spell_session, spell_answer, spell_end), so it survives
 * reloads and restarts, travels in backups, and is erased with the learner. It is practice: it never feeds the engine's
 * Learner Vector, and a practice level is not a mastery claim.
 *
 * The rules are deliberately simple and visible (SPELLING below):
 *   - Scoring: the typed word is compared with the spelling and its listed variants, ignoring capital letters,
 *     surrounding spaces and a final full stop (the same normalisation as every typed answer in OpenPath).
 *   - Level (sources with levels, i.e. the Spelling Bee): start at 1. Only answers to words at the current level count.
 *     After 5 of them, 4 or more right moves up a level; 3 wrong at any point moves down. Each change starts afresh.
 *   - Review: a misspelt word comes back in the next session, then after 1, 3 and 7 days while it is spelt right. Wrong
 *     again sends it back to the start. Right at the last step takes it off the review list. A word spelt right the
 *     first time is not asked again while new words remain.
 *   - A session: up to 4 review words that are due, then new words at the learner's level (then the nearest levels
 *     when that level runs out), 10 words in all. When every word has been practised and nothing is due, the words
 *     practised longest ago come back, so a learner is never stuck.
 */
import { normaliseAnswer } from "../../../../packages/english-core/src/index.ts";
import type { AppContent, Code, DictationItem } from "./content.ts";
import type { AppEvent, SpellAnswerEvent, SpellEndEvent, SpellSessionEvent, SpellSource } from "./events.ts";
import beeJson from "../../../../content/english/spelling/spelling-bee.json";

export const SPELLING = {
  sessionSize: 10,
  /** Answers at the current level that decide a move up. */
  window: 5,
  /** Right answers in the window that move a learner up. */
  up: 4,
  /** Wrong answers in the window that move a learner down. */
  down: 3,
  /** Days between reviews of a misspelt word: next session, then 1, 3 and 7 days. */
  reviewDays: [0, 1, 3, 7],
  maxReviewPerSession: 4,
  levels: 5,
} as const;

export const LEVEL_NAMES: Record<number, string> = { 1: "Beginner", 2: "Elementary", 3: "Intermediate", 4: "Advanced", 5: "Challenging" };
export const BANK: SpellSource = { type: "bank", id: "spelling-bee" };
const DAY = 86_400_000;

/** A word to spell, from any source. The spelling is never put in the page before the answer is checked. */
export interface SpellWord {
  id: string;
  word: string;
  /** Other accepted spellings (none for the Spelling Bee's words). */
  variants: string[];
  /** Said after the word, to make it clear; never shown before the answer. */
  sentence?: string;
  /** A pronunciation hint for an adult reading the word. */
  say?: string;
  level?: number;
  source: SpellSource;
  /** Where the word comes from and whether it is approved, in words (shown to adults only). */
  status: string;
}

interface BeeEntry {
  id: string;
  level: number;
  word?: string;
  sentence?: string;
  say?: string;
  variants?: string[];
  item?: { id: string; version: number };
  status: string;
}

/**
 * The Spelling Bee's 100 words. Reused dictation questions take their word and sentence from the dictation bank (one
 * source of truth). A pilot build offers only the words its gate allows (approved for pilot use).
 */
export function bankWords(c: AppContent): SpellWord[] {
  const doc = beeJson as unknown as { words: BeeEntry[] };
  // a pilot build: only the words its gate allows (approved for pilot use; none without approvals)
  const entries = c.gate ? doc.words.filter((e) => c.gate!.bee.has(e.id)) : doc.words;
  return entries.map((e) => {
    if (e.item) {
      const it = c.ctx.content.items.get(e.item.id) as (Code & Partial<DictationItem>) | undefined;
      if (!it || it.version !== e.item.version || !it.answers?.length) throw new Error(`spelling bee: ${e.id} refers to a missing question ${e.item.id}@${e.item.version}`);
      return { id: e.id, word: it.answers[0], variants: it.answers.slice(1), sentence: it.sentence, level: e.level, source: BANK, status: e.status };
    }
    return { id: e.id, word: e.word!, variants: e.variants ?? [], sentence: e.sentence, say: e.say, level: e.level, source: BANK, status: e.status };
  });
}

/** Is the typed answer this word? Capital letters, surrounding spaces and a final full stop do not matter. */
export function checkSpelling(w: Pick<SpellWord, "word" | "variants">, typed: string): boolean {
  const t = normaliseAnswer(typed);
  return !!t && [w.word, ...w.variants].some((x) => normaliseAnswer(x) === t);
}

// ------------------------------------------------------------------ state from the record

export interface WordRecord {
  key: string;
  id: string;
  text: string;
  source: SpellSource;
  level?: number;
  answers: SpellAnswerEvent[];
  /** Review step: 0 = due at the next session; null = not on the review list. */
  box: number | null;
  due: string | null;
  /** Taken off the review list after being spelt right at every step. */
  reviewed: boolean;
}

export interface SpellSessionState {
  event: SpellSessionEvent;
  answers: SpellAnswerEvent[];
  end: SpellEndEvent | null;
}

export interface SpellingState {
  words: Map<string, WordRecord>;
  sessions: Map<string, SpellSessionState>;
  /** The unfinished session, if any. */
  open: SpellSessionState | null;
  /** Practice level per source (only sources with levels), with every change. */
  levels: Map<string, { level: number; window: boolean[]; changes: { at: string; from: number; to: number }[] }>;
}

export const sourceKey = (s: SpellSource) => `${s.type}:${s.id}`;
export const wordKey = (s: SpellSource, id: string) => `${sourceKey(s)}/${id}`;

export function spellingState(events: readonly AppEvent[]): SpellingState {
  const st: SpellingState = { words: new Map(), sessions: new Map(), open: null, levels: new Map() };
  for (const e of events) {
    if (e.kind === "spell_session") {
      const s = { event: e, answers: [], end: null };
      st.sessions.set(e.session, s);
      st.open = s;
    } else if (e.kind === "spell_end") {
      const s = st.sessions.get(e.session);
      if (s) s.end = e;
      if (st.open?.event.session === e.session) st.open = null;
    } else if (e.kind === "spell_answer") {
      st.sessions.get(e.session)?.answers.push(e);
      const key = wordKey(e.source, e.word.id);
      let w = st.words.get(key);
      if (!w) st.words.set(key, (w = { key, id: e.word.id, text: e.word.text, source: e.source, level: e.word.level, answers: [], box: null, due: null, reviewed: false }));
      w.answers.push(e);
      w.text = e.word.text;
      // A newly studied or hinted spelling cannot pass a delayed review or raise the practice level.
      if(e.assisted){w.box=0;w.due=e.at;w.reviewed=false;continue;}
      // review: wrong puts it on the list (due next session); right when due moves it on; right at the end takes it off
      if (!e.correct) {
        w.box = 0;
        w.due = e.at;
        w.reviewed = false;
      } else if (w.box !== null && w.due !== null && Date.parse(e.at) >= Date.parse(w.due)) {
        if (w.box + 1 >= SPELLING.reviewDays.length) {
          w.box = null;
          w.due = null;
          w.reviewed = true;
        } else {
          w.box += 1;
          w.due = new Date(Date.parse(e.at) + SPELLING.reviewDays[w.box] * DAY).toISOString();
        }
      }
      // level: only answers at the current level count
      if (e.word.level !== undefined) {
        const k = sourceKey(e.source);
        let L = st.levels.get(k);
        if (!L) st.levels.set(k, (L = { level: 1, window: [], changes: [] }));
        if (e.word.level === L.level) {
          L.window.push(e.correct);
          const right = L.window.filter(Boolean).length;
          const wrong = L.window.length - right;
          const move = L.window.length >= SPELLING.window && right >= SPELLING.up ? 1 : wrong >= SPELLING.down ? -1 : 0;
          const to = Math.min(SPELLING.levels, Math.max(1, L.level + move));
          if (move && to !== L.level) L.changes.push({ at: e.at, from: L.level, to });
          if (move) {
            L.level = to;
            L.window = [];
          } else if (L.window.length >= SPELLING.window) L.window = L.window.slice(1);
        }
      }
    }
  }
  return st;
}

export const levelOf = (st: SpellingState, source: SpellSource) => st.levels.get(sourceKey(source))?.level ?? 1;

/** Is this word due for review now (and not already asked in the session that put it on the list)? */
function due(w: WordRecord | undefined, now: string, session?: string): boolean {
  if (!w || w.box === null || w.due === null) return false;
  if (w.box === 0) return w.answers.at(-1)!.session !== session && Date.parse(w.due) <= Date.parse(now);
  return Date.parse(w.due) <= Date.parse(now);
}

/** The words for the next session from a source, in order: due reviews, then new words near the learner's level. */
export function planSession(st: SpellingState, words: readonly SpellWord[], now: string, size: number = SPELLING.sessionSize): { ids: string[]; level?: number } {
  if (!words.length) return { ids: [] };
  const source = words[0].source;
  const rec = (w: SpellWord) => st.words.get(wordKey(source, w.id));
  const reviews = words
    .filter((w) => due(rec(w), now))
    .sort((a, b) => rec(a)!.due!.localeCompare(rec(b)!.due!))
    .slice(0, Math.min(SPELLING.maxReviewPerSession, size));
  const ids = reviews.map((w) => w.id);
  const leveled = words.some((w) => w.level !== undefined);
  const level = leveled ? levelOf(st, source) : undefined;
  const unseen = words.filter((w) => !rec(w));
  // new words: the learner's level first, then the nearest levels (above before below)
  const order = leveled ? [...unseen].sort((a, b) => rank(a.level!, level!) - rank(b.level!, level!)) : unseen;
  for (const w of order) if (ids.length < size && !ids.includes(w.id)) ids.push(w.id);
  // everything practised and nothing due: the words practised longest ago come back (never stuck)
  if (ids.length < size && !unseen.length) {
    const old = words
      .filter((w) => !ids.includes(w.id) && !due(rec(w), now))
      .sort((a, b) => (leveled ? rank(a.level!, level!) - rank(b.level!, level!) : 0) || rec(a)!.answers.at(-1)!.at.localeCompare(rec(b)!.answers.at(-1)!.at));
    for (const w of old) if (ids.length < size) ids.push(w.id);
  }
  return { ids, ...(level !== undefined ? { level } : {}) };
}
const rank = (l: number, at: number) => (l === at ? 0 : l > at ? 2 * (l - at) - 1 : 2 * (at - l));

// ------------------------------------------------------------------ summaries

export interface SourceProgress {
  total: number;
  practised: number;
  /** Words spelt right the first time they were asked. */
  rightFirstTime: number;
  answers: number;
  right: number;
  reviewList: number;
  dueNow: number;
  level?: number;
  /** Per level (sources with levels): words, practised, answers, right. */
  byLevel: { level: number; words: number; practised: number; answers: number; right: number }[];
}

export function sourceProgress(st: SpellingState, words: readonly SpellWord[], now: string): SourceProgress {
  const recs = words.map((w) => ({ w, r: st.words.get(wordKey(w.source, w.id)) }));
  const answered = recs.flatMap((x) => x.r?.answers ?? []);
  const levels = [...new Set(words.map((w) => w.level).filter((l): l is number => l !== undefined))].sort();
  return {
    total: words.length,
    practised: recs.filter((x) => x.r).length,
    rightFirstTime: recs.filter((x) => x.r?.answers[0]?.correct).length,
    answers: answered.length,
    right: answered.filter((a) => a.correct).length,
    reviewList: recs.filter((x) => x.r && x.r.box !== null).length,
    dueNow: recs.filter((x) => due(x.r, now)).length,
    ...(levels.length && words.length ? { level: levelOf(st, words[0].source) } : {}),
    byLevel: levels.map((level) => {
      const at = recs.filter((x) => x.w.level === level);
      const a = at.flatMap((x) => x.r?.answers ?? []);
      return { level, words: at.length, practised: at.filter((x) => x.r).length, answers: a.length, right: a.filter((y) => y.correct).length };
    }),
  };
}

/** Where a session stands: the next word to ask (or null when it is done), and the answers so far. */
export function sessionView(s: SpellSessionState): { next: string | null; position: number; total: number; right: number; wrong: number } {
  const asked = new Set(s.answers.map((a) => a.word.id));
  const next = s.end ? null : (s.event.words.find((id) => !asked.has(id)) ?? null);
  const right = s.answers.filter((a) => a.correct).length;
  return { next, position: s.answers.length + (next ? 1 : 0), total: s.event.words.length, right, wrong: s.answers.length - right };
}

/**
 * Text shown while a word is being asked must never contain that word (a parent's list may hold "listen", "word" or
 * "again"): the first option without it as a whole word, else the last option (written to be safe, e.g. a symbol).
 */
export function avoiding(word: string, ...options: string[]): string {
  const w = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (t: string) => new RegExp(`(^|[^a-z'’])${w}($|[^a-z'’])`, "i").test(t);
  return options.find((o) => !has(o)) ?? options.at(-1)!;
}
