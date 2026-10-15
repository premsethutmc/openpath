/**
 * My Words: spelling lists a parent types, pastes or uploads. Each list is kept in the learner's own record (a
 * word_list event holds the whole list each time it is saved; word_list_delete hides it), on this device only.
 * Practice uses the Spelling Bee's engine (logic/spelling.ts) with the list as its source.
 *
 * Reading a list (parseWords): words are separated by new lines, commas, semicolons or tabs, in typed text, a pasted
 * list or a .txt/.csv file alike. "colour/color" gives a word and an accepted variant. A word may have letters, an
 * apostrophe or a hyphen, and single spaces between parts ("ice cream"); anything else is reported, never silently
 * dropped. Duplicates are reported and kept once. Empty entries are ignored and counted.
 */
import type { AppEvent, ListWord } from "./events.ts";
import type { SpellWord } from "./spelling.ts";

export const LIST_LIMITS = { words: 200, wordLength: 30, nameLength: 60, fileBytes: 100_000 } as const;

export interface Problem {
  text: string;
  reason: string;
}
export type { ListWord };
export interface Parsed {
  words: ListWord[];
  problems: Problem[];
  empty: number;
}

const WORD = /^[A-Za-z][A-Za-z'’-]*(?: [A-Za-z'’-]+)*$/;
const idOf = (w: string) => w.toLowerCase().replace(/’/g, "'");

/** Check one word: null when it is fine, else why not. */
export function wordProblem(w: string): string | null {
  if (w.length > LIST_LIMITS.wordLength) return `longer than ${LIST_LIMITS.wordLength} letters`;
  if (/\d/.test(w)) return "has numbers";
  if (!/[A-Za-z]/.test(w)) return "has no letters";
  if (!WORD.test(w)) return "has characters that are not letters, an apostrophe or a hyphen";
  return null;
}

/** Read words from typed, pasted or uploaded text. Nothing valid is dropped without a reason. */
export function parseWords(text: string): Parsed {
  const out: ListWord[] = [];
  const problems: Problem[] = [];
  let empty = 0;
  const seen = new Map<string, string>();
  const tokens = text
    .replace(/^﻿/, "")
    .trim()
    .split(/\r\n|[\r\n,;\t]/)
    .map((t) => t.trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, " ").trim());
  for (const t of tokens) {
    if (!t) {
      empty++;
      continue;
    }
    const [word, ...variants] = t.split("/").map((x) => x.trim());
    const bad = wordProblem(word) ?? variants.map((v) => (v ? wordProblem(v) : "an empty alternative after /")).find(Boolean) ?? null;
    if (bad) {
      problems.push({ text: t, reason: bad });
      continue;
    }
    const id = idOf(word);
    if (seen.has(id)) {
      problems.push({ text: t, reason: `already in the list as "${seen.get(id)}"` });
      continue;
    }
    if (out.length >= LIST_LIMITS.words) {
      problems.push({ text: t, reason: `a list holds at most ${LIST_LIMITS.words} words` });
      continue;
    }
    seen.set(id, word);
    out.push({ id, word, variants: [...new Set(variants.filter((v) => idOf(v) !== id))] });
  }
  return { words: out, problems, empty };
}

/** A list written back as text, for editing: one word per line, variants after "/". */
export const listText = (words: ListWord[]) => words.map((w) => [w.word, ...w.variants].join("/")).join("\n");

export interface WordList {
  id: string;
  name: string;
  words: ListWord[];
  created: string;
  updated: string;
}

/** The learner's saved lists, newest first, as last saved (deleted ones left out). */
export function wordLists(events: readonly AppEvent[]): WordList[] {
  const lists = new Map<string, WordList>();
  for (const e of events) {
    if (e.kind === "word_list") {
      if (e.scrubbed) {
        lists.delete(e.list.id); // deleted: its content was removed from the record (logic/scrub.ts)
        continue;
      }
      const old = lists.get(e.list.id);
      lists.set(e.list.id, { id: e.list.id, name: e.list.name, words: e.list.words, created: old?.created ?? e.at, updated: e.at });
    } else if (e.kind === "word_list_delete") lists.delete(e.list);
  }
  return [...lists.values()].sort((a, b) => b.updated.localeCompare(a.updated));
}

/** A list's words for the spelling engine. */
export const listWords = (l: WordList): SpellWord[] => l.words.map((w) => ({ id: w.id, word: w.word, variants: w.variants, source: { type: "list", id: l.id }, status: `from the list "${l.name}", supplied by a parent` }));
