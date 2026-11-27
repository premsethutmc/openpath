// layout@1: how a recipe is laid out. It is a rule about the screen and the reader's age, so it lives with the player and
// not in the learning engine (which has one path for every class).
//
// - "steps": one part on the screen, with Next. For young children, who lose their place on a page that scrolls.
// - "flow": one page that grows; each part appears under the last once that one is done.
//
// The class is the learner's (null when it is not known: then the page that grows).
import type { Recipe } from "../../../packages/learning/src/recipe";

export type RecipeLayout = "steps" | "flow";
// play-first@1 (owner's decision, 18 Nov 2026): from Class 4 the lesson is one screen that grows, opening on the story
// with the thing to play with straight under it. One part at a time stays for Classes 1 to 3.
const LAST_CLASS_ONE_AT_A_TIME = 3;
export const layoutFor = (_r: Recipe, grade: number | null): RecipeLayout => (grade !== null && grade <= LAST_CLASS_ONE_AT_A_TIME ? "steps" : "flow");

/**
 * play-first@1: the order of the parts on the page that grows. The learner plays before being asked to guess: the story
 * opens with its first thing to do right under it, and the guess is asked just before the last thing to find out (the
 * one that settles it), when they have something to guess from. With a single thing to find out, the guess stays before it.
 * guess-first@1 (owner, 27 Nov 2026): where a thing to find out answers the story's own question (its goal is the guess's
 * right answer), the guess comes straight after the story, before that one, so finding out never gives the guess away.
 */
export function playFirst<S extends { kind: string; index?: number }>(steps: S[], recipe?: Pick<Recipe, "predict" | "missions">): S[] {
  const guess = steps.findIndex((s) => s.kind === "predict"), last = steps.map((s) => s.kind).lastIndexOf("mission");
  if (guess < 0 || last < 0 || guess > last) return steps;
  const rest = steps.filter((_, i) => i !== guess);
  const settles = recipe ? rest.findIndex((s) => s.kind === "mission" && s.index !== undefined && answersGuess(recipe, s.index)) : -1;
  if (settles >= 0) return [...rest.slice(0, settles), steps[guess], ...rest.slice(settles)];
  if (steps.filter((s) => s.kind === "mission").length < 2) return steps;
  const at = rest.map((s) => s.kind).lastIndexOf("mission");
  return [...rest.slice(0, at), steps[guess], ...rest.slice(at)];
}
/** guess-first@1: whether a mission's goal is the number the guess's right choice names. */
export function answersGuess(r: Pick<Recipe, "predict" | "missions">, i: number): boolean {
  const right = r.predict?.choices.find((c) => c.right)?.label, m = r.missions[i] as { goal?: { equals?: number } } | undefined;
  const n = right === undefined ? NaN : Number(right.replace(/−/g, "-").replace(/,/g, "").trim());
  return Number.isFinite(n) && m?.goal?.equals !== undefined && Math.abs(m.goal.equals - n) < 1e-9;
}
