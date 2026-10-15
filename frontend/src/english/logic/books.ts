/**
 * My Books: a parent supplies the text of a book (pasted, or a plain-text file); the app finds activities in it; the
 * parent approves the ones the learner may see. Everything is found in the supplied text only, by fixed rules (no AI,
 * no dictionary, no network), so the same text always gives the same activities:
 *
 *   - Spelling: words from the book, chosen for tricky letter patterns and length, each with the book's own sentence
 *     (spoken after the word). Practised with the Spelling Bee's engine, source {type: "book", id}.
 *   - Vocabulary (fill the gap): one of the book's sentences with a longer word taken out; the choices are that word and
 *     three other words from the same book with the same ending (-ed, -ing, -ly, -s, or other).
 *   - Comprehension, from what the book says:
 *       "who": one of the book's sentences with a character's name taken out; the choices are names from the book.
 *       "order": two of the book's sentences, far apart; which comes first in the book.
 *
 * What it cannot do: explain meanings (no dictionary), ask about feelings, reasons or themes, or read photos or PDFs
 * (no OCR). The rules can still make a poor activity (a gap two choices could fill, a capitalised word that is not a
 * name), which is why nothing reaches the learner until the parent has approved it.
 *
 * Approvals are tied to the text: they are saved with the text's fingerprint, and if the text changes they no longer
 * count, so the parent reviews again.
 */
import type { AppEvent, BookEvent } from "./events.ts";
import type { SpellWord } from "./spelling.ts";

export const BOOK_LIMITS = { chars: 30_000, fileBytes: 200_000, titleLength: 80, minWords: 30, spelling: 20, vocabulary: 10, who: 5, order: 3 } as const;
/** Part of the fingerprint: a change to the rules below makes earlier approvals stop counting. */
export const EXTRACTION_VERSION = 1;

export interface Sentence {
  index: number;
  text: string;
  words: Token[];
}
interface Token {
  /** As written (possessive 's removed). */
  text: string;
  start: boolean;
}
export interface SpellingCandidate {
  /** "s:<word>" */
  id: string;
  word: string;
  /** The book's sentence the word is first used in (30 words at most), spoken after the word. */
  sentence?: string;
  count: number;
}
export interface BookQuestion {
  /** "v:<word>", "c:who:<sentence>:<name>" or "c:order:<sentence>:<sentence>" */
  id: string;
  kind: "vocabulary" | "comprehension";
  type: "gap" | "who" | "order";
  prompt: string;
  /** The book's sentence with a gap, for gap and who questions. */
  text?: string;
  options: string[];
  answer: string;
}
export interface Extraction {
  fingerprint: string;
  words: number;
  sentences: number;
  names: string[];
  spelling: SpellingCandidate[];
  vocabulary: BookQuestion[];
  comprehension: BookQuestion[];
  /** Why some kinds of activity are missing or few, in words for the parent. */
  notes: string[];
}

/** FNV-1a (32 bit) of the rules' version and the text: which text, under which rules, an approval was given for. */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  const s = `v${EXTRACTION_VERSION}\n${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Tidy supplied text: one kind of line break and quote, no byte-order mark, no trailing spaces. */
export function tidyText(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Any letters (so an accented word stays whole, and is then skipped: activities use plain English letters only). */
const WORD = /\p{L}+(?:['’]\p{L}+)*/gu;
const ABBREVIATION = /\b(?:Mr|Mrs|Ms|Dr|St|Prof|Mt)\.$/;
const TITLES = new Set(["mr", "mrs", "ms", "miss", "mister", "dr", "doctor", "sir", "madam", "lady", "lord", "aunt", "uncle", "st", "saint", "prof", "professor", "captain", "king", "queen", "prince", "princess"]);
const CALENDAR = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]);

/** The book's sentences: paragraphs (blank lines) and . ! ? followed by a capital letter end a sentence. */
export function sentencesOf(text: string): Sentence[] {
  const out: Sentence[] = [];
  for (const para of tidyText(text).split(/\n\s*\n/)) {
    const flat = para.replace(/\s+/g, " ").trim();
    if (!flat) continue;
    const pieces = flat.split(/(?<=[.!?]["'”’)\]]*)\s+(?=["'“‘(\[]*[A-Z0-9])/);
    const joined: string[] = [];
    for (const p of pieces) {
      if (joined.length && ABBREVIATION.test(joined[joined.length - 1])) joined[joined.length - 1] += ` ${p}`;
      else joined.push(p);
    }
    for (const s of joined) {
      const words: Token[] = [];
      for (const m of s.matchAll(WORD)) words.push({ text: m[0].replace(/['’]s$/, ""), start: words.length === 0 });
      if (words.length) out.push({ index: out.length, text: s, words });
    }
  }
  return out;
}

const plain = (w: string) => /^[A-Za-z]+$/.test(w);
const TRICKY = [/([a-z])\1/, /ough|augh/, /tion|sion|cian/, /ie|ei/, /ph/, /^kn|^wr|^gn|mb$|bt/, /gh/, /ould/, /ture$/, /[ct]ious$/, /ous$/, /(?:ible|able)$/, /(?:ence|ance)$/, /(?:ery|ary)$/, /dge/, /qu/, /c[eiy]/, /[^aeiou]le$/, /y[^aeiouy]/];
const ending = (w: string) => (/ing$/.test(w) ? "ing" : /ed$/.test(w) ? "ed" : /ly$/.test(w) ? "ly" : /[^s]s$/.test(w) && !/(?:ous|us|is)$/.test(w) ? "s" : "other");
const stem = (w: string) => w.replace(/(?:ing|ed|ly|es|s)$/, "");
const words = (s: Sentence) => s.words.length;
const gap = "_____";
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The sentence with every whole-word use of `w` (and its possessive) replaced by a gap. */
const withGap = (text: string, w: string, flags = "g") => text.replace(new RegExp(`(?<![A-Za-z'’])${escape(w)}(?![A-Za-z])`, flags), gap);
const occurrences = (text: string, w: string, flags = "g") => (text.match(new RegExp(`(?<![A-Za-z'’])${escape(w)}(?![A-Za-z])`, flags)) ?? []).length;
const byAlpha = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" }) || a.localeCompare(b);

/** Find the activities in a book's text. Pure and deterministic: the same text always gives the same activities. */
export function extract(rawText: string): Extraction {
  const text = tidyText(rawText);
  const sentences = sentencesOf(text);
  const total = sentences.reduce((n, s) => n + words(s), 0);
  const notes: string[] = [];
  const empty: Extraction = { fingerprint: fingerprint(text), words: total, sentences: sentences.length, names: [], spelling: [], vocabulary: [], comprehension: [], notes };
  if (total < BOOK_LIMITS.minWords) {
    notes.push(`The text has ${total} word${total === 1 ? "" : "s"}; at least ${BOOK_LIMITS.minWords} are needed to find activities.`);
    return empty;
  }

  // which words are written in lower case somewhere, which only with a capital (not counting the first word of a sentence)
  const lower = new Map<string, number>();
  const capital = new Map<string, number>();
  const firstUse = new Map<string, Sentence>();
  for (const s of sentences)
    for (const t of s.words) {
      if (!plain(t.text)) continue;
      const k = t.text.toLowerCase();
      if (t.text === k) {
        lower.set(k, (lower.get(k) ?? 0) + 1);
        if (!firstUse.has(k) && words(s) <= 30 && occurrences(s.text, k) === 1) firstUse.set(k, s);
      } else if (/^[A-Z][a-z]+$/.test(t.text)) capital.set(t.text, (capital.get(t.text) ?? 0) + (t.start ? 0 : 1));
    }
  // names: written with a capital in the middle of a sentence, never in lower case, used at least twice in all
  const uses = (n: string) => sentences.reduce((k, s) => k + s.words.filter((t) => t.text === n).length, 0);
  const names = [...capital.entries()]
    .filter(([n, mid]) => mid > 0 && !lower.has(n.toLowerCase()) && !CALENDAR.has(n.toLowerCase()) && !TITLES.has(n.toLowerCase()) && n !== "I" && uses(n) >= 2)
    .map(([n]) => n)
    .sort((a, b) => uses(b) - uses(a) || byAlpha(a, b));

  // spelling: lower-case words of 5 to 20 letters, scored by tricky patterns, length and use
  const scored = [...lower.entries()]
    .filter(([w]) => w.length >= 5 && w.length <= 20)
    .map(([w, n]) => ({ w, n, score: w.length + 3 * TRICKY.filter((r) => r.test(w)).length + Math.min(n, 3) }))
    .sort((a, b) => b.score - a.score || byAlpha(a.w, b.w));
  const spelling: SpellingCandidate[] = scored.slice(0, BOOK_LIMITS.spelling).map(({ w, n }) => ({ id: `s:${w}`, word: w, ...(firstUse.has(w) ? { sentence: firstUse.get(w)!.text } : {}), count: n }));
  if (spelling.length < BOOK_LIMITS.spelling) notes.push(`Only ${spelling.length} spelling word${spelling.length === 1 ? "" : "s"} of 5 letters or more were found.`);

  // vocabulary: longer words with a sentence of their own, and three words from the book with the same ending
  const pool = [...lower.keys()].filter((w) => w.length >= 6).sort((a, b) => b.length - a.length || byAlpha(a, b));
  const vocabulary: BookQuestion[] = [];
  for (const w of pool) {
    if (vocabulary.length >= BOOK_LIMITS.vocabulary) break;
    const s = firstUse.get(w);
    if (!s || words(s) < 5) continue;
    const others = pool
      .filter((o) => o !== w && ending(o) === ending(w) && stem(o) !== stem(w) && occurrences(s.text, o, "gi") === 0)
      .sort((a, b) => Math.abs(a.length - w.length) - Math.abs(b.length - w.length) || byAlpha(a, b))
      .slice(0, 3);
    if (others.length < 3) continue;
    vocabulary.push({ id: `v:${w}`, kind: "vocabulary", type: "gap", prompt: "Which word from the book fills the gap?", text: withGap(s.text, w), options: [w, ...others].sort(byAlpha), answer: w });
  }
  if (!vocabulary.length) notes.push("No gap-filling questions: the text needs more long words that share an ending (-ed, -ing, -ly, -s).");

  // comprehension, "who": a sentence with one name taken out; the choices are the book's most used names
  const comprehension: BookQuestion[] = [];
  if (names.length >= 3) {
    for (const n of names.slice(0, BOOK_LIMITS.who)) {
      const fits = sentences.filter((s) => words(s) >= 5 && words(s) <= 30 && occurrences(s.text, n) === 1);
      const s = fits.find((x) => x.words[0].text === n) ?? fits[0];
      if (!s) continue;
      const choices = [n, ...names.filter((o) => o !== n && !occurrences(s.text, o)).slice(0, 3)];
      if (choices.length < 3) continue;
      comprehension.push({ id: `c:who:${s.index}:${n}`, kind: "comprehension", type: "who", prompt: "Who is missing from this sentence in the book?", text: withGap(s.text, n), options: choices.sort(byAlpha), answer: n });
    }
  } else notes.push(`No "who" questions: ${names.length ? `only ${names.length} name${names.length === 1 ? " was" : "s were"} found (${names.join(", ")})` : "no names were found"}; at least 3 are needed.`);

  // comprehension, "order": two sentences far apart; which comes first
  const usable = sentences.filter((s) => words(s) >= 6 && words(s) <= 30);
  if (usable.length >= 6) {
    const m = usable.length;
    for (let k = 0; k < BOOK_LIMITS.order; k++) {
      const a = usable[Math.floor((k * m) / 6)];
      const b = usable[Math.floor(((k + 3) * m) / 6)];
      if (!a || !b || b.index - a.index < 2) continue;
      comprehension.push({ id: `c:order:${a.index}:${b.index}`, kind: "comprehension", type: "order", prompt: "Which of these comes first in the book?", options: k % 2 ? [a.text, b.text] : [b.text, a.text], answer: a.text });
    }
  } else notes.push("No \"which comes first\" questions: the text needs at least 6 sentences of 6 to 30 words.");

  return { ...empty, names, spelling, vocabulary, comprehension };
}

export interface Book {
  id: string;
  title: string;
  text: string;
  fingerprint: string;
  /** Approved activity ids, for this text only (empty when the text changed after the last review). */
  approved: Set<string>;
  reviewed: boolean;
  created: string;
  updated: string;
}

/** The learner's books, newest first (deleted ones left out). */
export function books(events: readonly AppEvent[]): Book[] {
  const out = new Map<string, Book>();
  for (const e of events) {
    if (e.kind === "book") {
      const old = out.get(e.book.id);
      const fp = fingerprint(tidyText(e.book.text));
      const same = old?.fingerprint === fp;
      out.set(e.book.id, { id: e.book.id, title: e.book.title, text: e.book.text, fingerprint: fp, approved: same ? old!.approved : new Set(), reviewed: same ? old!.reviewed : false, created: old?.created ?? e.at, updated: e.at });
    } else if (e.kind === "book_review") {
      const b = out.get(e.book);
      if (b && b.fingerprint === e.fingerprint) out.set(b.id, { ...b, approved: new Set(e.approved), reviewed: true, updated: e.at });
    } else if (e.kind === "book_delete") out.delete(e.book);
  }
  return [...out.values()].sort((a, b) => b.updated.localeCompare(a.updated));
}

/** Only what the parent approved, for this text. */
export function approvedActivities(b: Book, ex: Extraction) {
  const ok = (id: string) => b.reviewed && b.approved.has(id) && ex.fingerprint === b.fingerprint;
  return { spelling: ex.spelling.filter((s) => ok(s.id)), questions: [...ex.vocabulary, ...ex.comprehension].filter((q) => ok(q.id)) };
}

/** A book's approved spelling words for the spelling engine (the word's id is the word, as in My Words). */
export const bookWords = (b: Book, ex: Extraction): SpellWord[] =>
  approvedActivities(b, ex).spelling.map((s) => ({ id: s.word, word: s.word, variants: [], ...(s.sentence ? { sentence: s.sentence } : {}), source: { type: "book", id: b.id }, status: `from the book "${b.title}", approved by a parent` }));

export interface QuestionProgress {
  total: number;
  answered: number;
  /** Right the last time they were answered. */
  right: number;
}

/** The order to ask a book's approved questions in: never answered, then wrong last time, then the longest ago. */
export function questionPlan(questions: BookQuestion[], events: readonly AppEvent[], book: string, size = 10): { plan: BookQuestion[]; progress: QuestionProgress } {
  const last = new Map<string, { correct: boolean; at: string }>();
  for (const e of events) if (e.kind === "book_answer" && e.book === book) last.set(e.question, { correct: e.correct, at: e.at });
  const rank = (q: BookQuestion) => {
    const l = last.get(q.id);
    return !l ? 0 : !l.correct ? 1 : 2;
  };
  const plan = [...questions].sort((a, b) => rank(a) - rank(b) || (last.get(a.id)?.at ?? "").localeCompare(last.get(b.id)?.at ?? "")).slice(0, size);
  const answered = questions.filter((q) => last.has(q.id));
  return { plan, progress: { total: questions.length, answered: answered.length, right: answered.filter((q) => last.get(q.id)!.correct).length } };
}

export type { BookEvent };
