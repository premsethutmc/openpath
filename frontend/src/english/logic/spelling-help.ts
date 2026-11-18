/**
 * Help for learning a spelling (practice, never a test). The learner asks for each step:
 *   1  how many letters the word has, as blanks;
 *   2+ one more letter from the start each time, never the last one (the learner always finishes the word);
 *   a look at the whole word, which is then hidden again before typing (look, cover, write, check).
 * An answer given after any help is practice: the word still has to be spelt unaided later (logic/spelling.ts).
 */

const isLetter = (ch: string) => /[A-Za-z]/.test(ch);

/** Letters that can be given away one at a time: all but the last. */
export const maxLetterHelp = (word: string) => Math.max(0, [...word].filter(isLetter).length - 1);

/** The most help taps that still show something new: the blanks, then each letter but the last. */
export const maxHelpTaps = (word: string) => 1 + maxLetterHelp(word);

/** What the help shows after `taps` requests: "" before any; then blanks with the first letters filled in. Spaces, hyphens and apostrophes are always shown. */
export function helpPattern(word: string, taps: number): string {
  if (taps <= 0) return "";
  let give = Math.min(taps - 1, maxLetterHelp(word));
  return [...word]
    .map((ch) => {
      if (!isLetter(ch)) return ch === " " ? "/" : ch;
      if (give > 0) {
        give--;
        return ch;
      }
      return "_";
    })
    .join(" ");
}

export interface LetterMark {
  ch: string;
  /** The learner's answer had this letter in the right order. */
  ok: boolean;
}

/**
 * The right spelling, letter by letter, marked with what the learner got: letters that appear in their answer in
 * the same order are ok (longest common subsequence, ignoring case); the rest are the ones to look at. When the
 * answer has the right length and only one or two places differ, those places are marked (so a swapped pair such
 * as freind shows both letters).
 */
export function letterMarks(correct: string, typed: string): LetterMark[] {
  const a = [...correct];
  const b = [...typed.trim()];
  const same = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();
  // same length with one or two places wrong (a swapped pair, a wrong letter): mark those places themselves
  if (a.length === b.length) {
    const off = a.filter((ch, k) => !same(ch, b[k])).length;
    if (off <= 2) return a.map((ch, k) => ({ ch, ok: same(ch, b[k]) }));
  }
  const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) t[i][j] = same(a[i], b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: LetterMark[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length) {
    if (j < b.length && same(a[i], b[j])) {
      out.push({ ch: a[i], ok: true });
      i++;
      j++;
    } else if (j < b.length && t[i][j + 1] >= t[i + 1][j]) j++;
    else out.push({ ch: a[i++], ok: false });
  }
  return out;
}

/** What a parent sees for one word of a list: the latest answer and whether the word has ever been spelt unaided. */
export interface WordResult {
  id: string;
  word: string;
  status: "not_tried" | "unaided" | "with_help" | "wrong";
  lastTyped: string;
}
