/**
 * number-band@2: the class a Class 1–3 question belongs to, from the size of its numbers, so a young learner is only
 * asked numbers their class works with. The limits are the boards' own (CBSE, ICSE, Tamil Nadu books):
 *   Class 1: numbers up to 99, a pattern grows by 1 or 2;   Class 2: up to 999, grows by up to 10;   Class 3: up to 9,999.
 * A question above Class 3's limit belongs to Class 4.
 *
 * The numbers come only from the generator's own declaration (`Def.band`): which numbers are quantities, which are labels
 * (a calendar year names a year, it does not count anything), and, for a sequence task only, how much the sequence grows.
 * Nothing is read back out of the question's wording (number-band@1 did that and mistook digit cards for growing
 * patterns and visitor counts for years). A family that declares nothing stays in the class its skill starts in; the
 * test in frontend/src/learning/number-band.test.ts fails if such a family shows a number above that class.
 */
export const BAND_MAX = [99, 999, 9999] as const;
export const BAND_STEP = [2, 10, Infinity] as const;

export interface BandNumbers { amounts: number[]; labels?: number[]; step?: number }

/** A typed answer that is one plain number (Indian or international grouping), else null. */
export function numericAnswer(answer: string): number | null {
  const t = answer.trim();
  if (!/^[−-]?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?$|^[−-]?\d+(?:\.\d+)?$/.test(t)) return null;
  return Number(t.replace(/,/g, "").replace("−", "-"));
}

/** The class of a question of a skill first taught in class `first` (1–3): the first class from `first` whose limits hold. */
export function bandClass(first: number, n: BandNumbers): number {
  const big = Math.max(0, ...n.amounts.filter(Number.isFinite).map(Math.abs));
  const step = n.step === undefined ? null : Math.abs(n.step);
  for (let c = first; c <= 3; c++) if (big <= BAND_MAX[c - 1] && (step === null || step <= BAND_STEP[c - 1])) return c;
  return 4;
}
