/**
 * Read aloud: the learner reads a sentence from Listen and write's bank out loud, and the phone checks each word.
 *
 * Recognition runs on the phone (ui/readAloudEngine.ts, Vosk). It is not asked "what was said?" but only "which of
 * this sentence's words were said?": its vocabulary is cut down to the sentence itself plus each of its words on its
 * own, so a skipped, repeated or swapped word can still be decoded as something other than the whole sentence. This module is the deterministic part: the vocabulary for a sentence, and lining up what was heard with the
 * sentence so each word is read, missed (nothing heard in its place) or unclear (something else, or too unsure).
 *
 * Restarts and repeats ("the c- cat") are not mistakes: a stray "[unk]" or a repeated word between two read words
 * costs less than a missed word, so a self-correction lines up as read. Practice only; nothing here is evidence for
 * the engine.
 */
import unknownJson from "../../../../../content/english/read-aloud/unknown-words.json";
import { DICTATION, wordsOf, type Dictation, type Sentence } from "../dictation/dictation.ts";

export type WordStatus = "read" | "missed" | "unclear";
export interface Heard {
  word: string;
  conf: number;
}
export interface WordResult {
  /** As written in the sentence (punctuation stripped). */
  word: string;
  status: WordStatus;
}

/**
 * Below this the recogniser was guessing between the sentence's words, so the word is not counted as read. Tuned on
 * synthetic recordings (tools/english/read-aloud): higher thresholds flagged more correctly read words without
 * catching more swapped ones.
 */
export const MIN_CONF = 0.5;
export const SITTING_SIZE = 5;

/** Words the on-phone model has no entry for (tools/english/read-aloud: checked against the model); their sentences are not offered. */
const UNKNOWN: ReadonlySet<string> = new Set((unknownJson as { words: string[] }).words);

const norm = (w: string) => w.toLowerCase().replace(/[‘’ʼ`]/g, "'");

export const targetWords = (text: string): string[] => wordsOf(text);

/** True when every word of the sentence is in the phone model's vocabulary. */
export const readable = (text: string): boolean => targetWords(text).every((w) => !UNKNOWN.has(norm(w)));

/**
 * The recogniser's vocabulary for one sentence: the whole sentence as one phrase, then each of its words once. No
 * "[unk]": on the small model it swallowed correctly read words (measured: 8 of 20 correct readings flagged).
 */
export function grammarFor(text: string): string {
  const w = targetWords(text).map(norm);
  return JSON.stringify([w.join(" "), ...[...new Set(w)].sort()]);
}

/**
 * Line up the heard words with the sentence (an edit-distance alignment). A heard word matching the sentence's word
 * in place is read (or unclear when the recogniser was unsure); a sentence word with nothing in its place is missed;
 * a sentence word facing a different heard word is unclear. Heard words left over (restarts, repeats) are ignored.
 */
export function align(text: string, heard: readonly Heard[], minConf = MIN_CONF): WordResult[] {
  const t = targetWords(text);
  const h = heard.filter((x) => x.word);
  const n = t.length, m = h.length;
  const MISS = 1, SUB = 1;
  // a heard word with no sentence word: cheap for "[unk]" and for a repeat of a nearby sentence word (a restart)
  const extra = (j: number, i: number) => {
    const w = norm(h[j].word);
    if (w === "[unk]") return 0.4;
    const near = [t[i - 1], t[i], t[i + 1]].filter(Boolean).map(norm);
    return near.includes(w) ? 0.3 : 0.9;
  };
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const move: ("m" | "s" | "d" | "i")[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill("m"));
  for (let i = 1; i <= n; i++) (cost[i][0] = cost[i - 1][0] + MISS), (move[i][0] = "d");
  for (let j = 1; j <= m; j++) (cost[0][j] = cost[0][j - 1] + extra(j - 1, 0)), (move[0][j] = "i");
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const same = norm(t[i - 1]) === norm(h[j - 1].word);
      const options: [number, "m" | "s" | "d" | "i"][] = [
        [cost[i - 1][j - 1] + (same ? 0 : SUB), same ? "m" : "s"],
        [cost[i - 1][j] + MISS, "d"],
        [cost[i][j - 1] + extra(j - 1, i - 1), "i"],
      ];
      // ties go to a match, then to a substitution, so a word is not called missed when something was heard there
      options.sort((a, b) => a[0] - b[0] || "msid".indexOf(a[1]) - "msid".indexOf(b[1]));
      [cost[i][j], move[i][j]] = options[0];
    }
  const out: WordResult[] = new Array(n);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const mv = i === 0 ? "i" : j === 0 ? "d" : move[i][j];
    if (mv === "m") (out[i - 1] = { word: t[i - 1], status: h[j - 1].conf >= minConf ? "read" : "unclear" }), i--, j--;
    else if (mv === "s") (out[i - 1] = { word: t[i - 1], status: "unclear" }), i--, j--;
    else if (mv === "d") (out[i - 1] = { word: t[i - 1], status: "missed" }), i--;
    else j--;
  }
  return out;
}

export const allRead = (r: readonly WordResult[]) => r.length > 0 && r.every((w) => w.status === "read");

/** Five sentences at a level, readable on the phone, ones not read cleanly before first; the same day gives the same set. */
export function pickSentences(level: number, cleanIds: ReadonlySet<string>, seed: number, d: Dictation = DICTATION): Sentence[] {
  const pool = d.sentences.filter((s) => s.level === level && readable(s.text));
  const order = (s: Sentence) => (cleanIds.has(s.id) ? 1 : 0) + (hash(`${seed}:${s.id}`) % 1000) / 1000;
  return [...pool].sort((a, b) => order(a) - order(b)).slice(0, SITTING_SIZE);
}

/** Four or five read cleanly moves the level up; none or one moves it down (as Listen and write). */
export function nextLevel(level: number, clean: number, d: Dictation = DICTATION): number {
  const ids = d.levels.map((l) => l.id);
  const at = ids.indexOf(level);
  if (clean >= 4 && at < ids.length - 1) return ids[at + 1];
  if (clean <= 1 && at > 0) return ids[at - 1];
  return level;
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
