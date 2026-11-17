/**
 * guess-picture@1: which picture stands beside a guess, and which waits with the working. A guess is asked about the
 * question as it will be asked later, so only the question's OWN picture may be seen before it. The lesson's teaching
 * picture (the worked layout: a pattern stacked so the ? sits under its answer, a sum set in columns) is part of the
 * explanation and would give the guess away, so it waits with the working. With no guess, the lesson's picture shows.
 */
import { placesOnly } from "../../../packages/learning/src/family-kit";

export interface GuessPictures<V> { before: V | null; withWorking: V | null }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function guessPictures<V>(guessing: boolean, own: V | null | undefined, lesson: V | null | undefined): GuessPictures<V> {
  if (!guessing) return { before: lesson ?? null, withWorking: null };
  return { before: own ?? null, withWorking: lesson && !same(lesson, own) ? lesson : null };
}

/**
 * A layout with a "?" that sits in the same column as its answer in another row: the answer can be read straight off.
 * Only where the columns are places (a pattern stacked by its repeat); in a table of data with real headings two equal
 * numbers in a column are a coincidence, not a give-away.
 */
export function askUnderAnswer(fig: { type?: string; head?: unknown; rows?: unknown } | null | undefined, answer: string): boolean {
  if (!fig || fig.type !== "table" || !Array.isArray(fig.rows) || !placesOnly(fig.head)) return false;
  const rows = fig.rows as unknown[][];
  return rows.some((r, ri) => r.some((c, ci) => c === "?" && rows.some((o, oi) => oi !== ri && String(o[ci]).trim() === answer.trim())));
}
