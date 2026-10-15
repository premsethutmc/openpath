/**
 * Extension point for the planned word-difficulty system. NOT USED by selection, scoring or the plan yet.
 *
 * The plan (product decision, later PR): every word gets its own difficulty vector (for example length, spelling
 * pattern, frequency, morphology), and adaptive selection compares a word's vector with the pupil's Learner Vector
 * (the engine's per-capability estimates) to choose words. Nothing here calibrates a word, pools other pupils'
 * answers or forms a second assessment engine.
 *
 * What is fixed now, so that later work plugs in without touching evidence history:
 *   - a word is identified from an item by `wordOf` (generated items carry it; hand-written spelling items have
 *     one typed answer), so every past evidence event can be joined to its word later by item id and version;
 *   - a source of vectors is an interface with a version, so a vector used for a selection can be recorded and
 *     replayed exactly;
 *   - the default source knows no words, which is what every caller gets today.
 *
 * Where it would plug in: `SelectionInput` (selection.ts) would take a `WordFeatureSource`, and the ranking of
 * candidate items for a spelling capability would add the distance between the word's vector and the learner's
 * estimates. The ledger, the updater and the composite need no change.
 */
import type { Item } from "./types.ts";

export interface WordDifficultyVector {
  word: string;
  /** Named dimensions on stated scales, e.g. { length: 7, pattern_band: 4.5, frequency_rank: 1200 }. */
  dims: Record<string, number>;
  /** Estimated by rule or a person, or calibrated from responses (only after an approved calibration study). */
  basis: "estimated" | "calibrated";
}

export interface WordFeatureSource {
  /** Recorded with any selection that used it, so the choice can be replayed. */
  readonly version: string;
  vectorFor(word: string): WordDifficultyVector | undefined;
}

/** Today's source: no word has a vector, so nothing changes. */
export const NO_WORD_FEATURES: WordFeatureSource = { version: "word-features@none", vectorFor: () => undefined };

/** The word an item asks for, if it is a single-word spelling item. */
export function wordOf(item: Item): string | undefined {
  if (item.kind !== "code") return undefined;
  if (item.generated?.word) return item.generated.word.toLowerCase();
  if (!item.target.startsWith("EN.FND.SPL")) return undefined;
  const answer = item.format.startsWith("typed") ? item.answers?.[0] : item.answer !== undefined ? item.options?.[item.answer] : undefined;
  return answer && /^[A-Za-z'-]+$/.test(answer) ? answer.toLowerCase() : undefined;
}
