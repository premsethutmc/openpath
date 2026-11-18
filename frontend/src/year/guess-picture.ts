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


/**
 * no-spoiler@1: does a lesson's teaching picture show the answer of the question whose steps the child is about to do?
 * A number line gives it away when a jump lands on it; a labelled triangle or a written working when the answer is written in it. An answer
 * that the question itself states, or one of a single character (a 2 among coin values is a coincidence), does not count.
 */
export function pictureGivesAnswer(fig: unknown, answer: string, prompt: string): boolean {
  if (!fig || typeof fig !== "object") return false;
  const clean = (t: string) => t.replace(/(\d),(?=\d{3})/g, "$1").replace(/-(?=\d)/g, "−");
  const a = clean(String(answer)).trim();
  if (a.length < 2 || !/\d/.test(a)) return false;
  const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), there = new RegExp(`(^|[^\\d./−])${esc}([^\\d./]|$)`);
  if (there.test(clean(prompt))) return false;
  const f = fig as { type?: string; as?: string; jumps?: unknown };
  // a picture the child reads or counts (a ten-frame, coins, a shaded grid, a table of data, a drawn angle) holds the
  // answer only as something to work out; only a picture that writes the result is held back
  if (f.type !== "numberline" && f.type !== "triangle" && f.as !== "written") return false;
  if (f.type === "numberline") return Array.isArray(f.jumps) && f.jumps.some((j) => Array.isArray(j) && clean(String(j[j.length - 1])) === a);
  const words: string[] = [];
  const walk = (v: unknown) => { if (v == null) return; if (typeof v === "string" || typeof v === "number") words.push(String(v)); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === "object") for (const [k, x] of Object.entries(v as object)) if (k !== "type" && k !== "as") walk(x); };
  walk(fig);
  return there.test(clean(words.join(" | ")));
}

/** Where a lesson's pictures go when the child does the steps: a picture that gives the answer waits until the steps are done. */
export function lessonPictures<V>(guessing: boolean, own: V | null | undefined, lesson: V | null | undefined, byChild: boolean, answer: string, prompt: string): GuessPictures<V> & { after: V | null } {
  const pics = guessPictures(guessing, own, lesson);
  const same = (x: V | null) => !!x && !!own && JSON.stringify(x) === JSON.stringify(own);
  const holds = (x: V | null) => byChild && !!x && !same(x) && pictureGivesAnswer(x, answer, prompt);
  const held = holds(pics.withWorking) ? pics.withWorking : holds(pics.before) ? pics.before : null;
  return { before: holds(pics.before) ? null : pics.before, withWorking: holds(pics.withWorking) ? null : pics.withWorking, after: held };
}
