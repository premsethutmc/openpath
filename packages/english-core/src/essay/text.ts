/**
 * Text helpers for essays: counting, sentences, fingerprints and locating quoted spans.
 * Pure and deterministic; no platform imports.
 */
import { wordCount } from "../content.ts";
import { fnv1a } from "../model.ts";
import type { EvidenceSpan } from "./contract.ts";

export { wordCount };

/** Normalise a character for matching: curly quotes to straight, any whitespace to a space, lower case. */
const normChar = (ch: string): string => (/[’‘]/.test(ch) ? "'" : /[“”]/.test(ch) ? '"' : /\s/.test(ch) ? " " : ch.toLowerCase());

/** Normalised text with, for each normalised character, its offset in the original. Runs of spaces collapse. */
function normalised(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = normChar(text[i]);
    if (c === " " && (norm.length === 0 || norm.endsWith(" "))) continue;
    norm += c;
    map.push(i);
  }
  while (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    map.pop();
  }
  return { norm, map };
}

export const normaliseText = (text: string): string => normalised(text).norm;

/** Offsets where each sentence starts (0 always starts one). A sentence ends at . ! ? or a line break. */
export function sentenceStarts(text: string): number[] {
  const starts = [0];
  const re = /[.!?]+["')\]]*\s+|\n\s*/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const at = m.index + m[0].length;
    if (at < text.length && at !== starts.at(-1)) starts.push(at);
  }
  return starts;
}

export function sentenceOf(starts: number[], offset: number): number {
  let s = 0;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= offset) s = i;
  return s;
}

export function essaySentences(text: string): string[] {
  const s = sentenceStarts(text);
  return s.map((start, i) => text.slice(start, s[i + 1] ?? text.length).trim()).filter(Boolean);
}

/**
 * Find a quote in the text, ignoring case, curly quotes and spacing; the span uses offsets in the original text.
 * Returns null when the quote is not there word for word (a paraphrase is not found).
 */
export function findSpan(text: string, quote: string): EvidenceSpan | null {
  const q = normalised(quote).norm;
  if (!q) return null;
  const { norm, map } = normalised(text);
  const at = norm.indexOf(q);
  if (at < 0) return null;
  const start = map[at];
  const end = map[at + q.length - 1] + 1;
  return { quote: text.slice(start, end), start, end, sentence: sentenceOf(sentenceStarts(text), start) };
}

/**
 * A deterministic fingerprint of the normalised text (the core's existing FNV-1a, plus the length). It detects
 * a repeated submission of the same essay; it is not a security hash and protects nothing.
 */
export function fingerprint(text: string): string {
  const s = normaliseText(text);
  return `${fnv1a(s)}-${s.length}`;
}
