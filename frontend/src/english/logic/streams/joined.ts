/**
 * Joining the streams: what a learner gets wrong or learns in one stream comes back in another.
 *
 *   My tricky words     words misspelt in Listen and write (and in the level check's listening and spelling parts)
 *                       become a spelling practice list, each with the sentence it came from;
 *   Spell my new words  words from New words that the learner remembered at least once after the first day become
 *                       a spelling practice list, each with its sentence: knowing a word includes spelling it.
 *
 * Both are ordinary practice lists in My Words (study first, help on request, a missed word again in the same
 * sitting), kept up to date by the app. A word leaves a list once it has been spelt right there and is no longer under review.
 * A list holds the most recent words only. Practice-only, like every list.
 */
import { DICTATION, type DictationRecord } from "../dictation/dictation.ts";
import type { AppEvent, ListWord } from "../events.ts";
import type { Learner } from "../learner.ts";
import { BANK, wordKey, type SpellSource } from "../spelling.ts";
import { WORDS, progress as wordProgress } from "../vocabulary/daily-words.ts";
import { wordProblem } from "../wordlists.ts";

export const TRICKY = { id: "list:tricky", name: "My tricky words" } as const;
export const NEW_WORD_SPELLING = { id: "list:new-words", name: "Spell my new words" } as const;
export const AUTO_LIST_MAX = 30;
/** A new word joins the spelling list once it has been remembered after its first day (box 2 or more). */
export const SPELL_FROM_BOX = 2;
const MIN_LETTERS = 3;

const idOf = (w: string) => w.toLowerCase();
const usable = (w: string) => w.replace(/[^A-Za-z]/g, "").length >= MIN_LETTERS && wordProblem(w) === null;

/** Newest first, one entry per word, at most the list size. */
function newest(words: ListWord[]): ListWord[] {
  const seen = new Set<string>();
  const out: ListWord[] = [];
  for (const w of [...words].reverse()) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    out.push(w);
  }
  return out.slice(0, AUTO_LIST_MAX).reverse();
}

/** Words misspelt in writing, oldest first, each with the sentence it was in. */
export function trickyWords(dictation: readonly DictationRecord[], events: readonly AppEvent[], beeSentence: (word: string) => string | undefined): ListWord[] {
  const text = new Map(DICTATION.sentences.map((s) => [s.id, s.text]));
  const out: ListWord[] = [];
  for (const r of dictation) {
    if (r.type !== "answer") continue;
    for (const w of r.misspelt ?? []) if (usable(w)) out.push({ id: idOf(w), word: w, variants: [], ...(text.has(r.id) ? { sentence: text.get(r.id)! } : {}) });
  }
  for (const e of events) {
    if (e.kind !== "level_check" || e.record.type !== "spelling") continue;
    for (const s of e.record.steps) if (!s.correct && usable(s.word)) out.push({ id: idOf(s.word), word: s.word, variants: [], ...(beeSentence(s.word) ? { sentence: beeSentence(s.word)! } : {}) });
  }
  return newest(out);
}

/** New words remembered at least once after the first day, oldest first, each with its sentence. */
export function newWordsToSpell(learner: Learner): ListWord[] {
  const byWord = new Map(WORDS.words.map((w) => [w.word, w]));
  const states = [...wordProgress(learner.wordLearnRecords()).words.values()].filter((s) => s.box >= SPELL_FROM_BOX && byWord.has(s.word)).sort((a, b) => (a.resultAt ?? "").localeCompare(b.resultAt ?? ""));
  return newest(states.map((s) => ({ id: idOf(s.word), word: s.word, variants: [], sentence: byWord.get(s.word)!.sentence })));
}

/** The lists as they should be now: words already spelt right through all their reviews in that list are left out. */
export function autoLists(learner: Learner): { id: string; name: string; words: ListWord[] }[] {
  const st = learner.spelling();
  const bee = new Map(learner.spellingWords(BANK).map((w) => [w.word, w.sentence]));
  // done with: answered in that list and no longer under review
  const open = (id: string) => (w: ListWord) => {
    const rec = st.words.get(wordKey({ type: "list", id } as SpellSource, w.id));
    return !(rec && rec.answers.length > 0 && rec.box === null);
  };
  return [
    { ...TRICKY, words: trickyWords(learner.dictationRecords(), learner.state.events, (w) => bee.get(w)).filter(open(TRICKY.id)) },
    { ...NEW_WORD_SPELLING, words: newWordsToSpell(learner).filter(open(NEW_WORD_SPELLING.id)) },
  ];
}

/**
 * Bring the two lists up to date. A list is saved only when its words changed, and never emptied (the last words
 * stay until new ones replace them). Returns the words newly added to each list. Never throws: a list that cannot
 * be saved now is tried again the next time.
 */
export async function syncAutoLists(learner: Learner): Promise<{ tricky: string[]; newWords: string[] }> {
  const added: Record<string, string[]> = { [TRICKY.id]: [], [NEW_WORD_SPELLING.id]: [] };
  if (learner.content.gate) return { tricky: [], newWords: [] };
  for (const want of autoLists(learner)) {
    const have = learner.wordLists().find((l) => l.id === want.id);
    const key = (ws: readonly ListWord[]) => ws.map((w) => w.id).join("|");
    if (!want.words.length || (have && key(have.words) === key(want.words))) continue;
    try {
      await learner.saveWordList(want.name, want.words, want.id, "practice");
      const before = new Set(have?.words.map((w) => w.id));
      added[want.id] = want.words.filter((w) => !before.has(w.id)).map((w) => w.word);
    } catch {
      // tried again at the next sync
    }
  }
  return { tricky: added[TRICKY.id], newWords: added[NEW_WORD_SPELLING.id] };
}

/** How many words wait in the two lists, for the home screen. */
export function waiting(learner: Learner): { tricky: number; newWords: number } {
  const n = (id: string) => learner.wordLists().find((l) => l.id === id)?.words.length ?? 0;
  return { tricky: n(TRICKY.id), newWords: n(NEW_WORD_SPELLING.id) };
}
