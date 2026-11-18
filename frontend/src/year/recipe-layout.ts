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
 */
export function playFirst<S extends { kind: string }>(steps: S[]): S[] {
  const guess = steps.findIndex((s) => s.kind === "predict"), last = steps.map((s) => s.kind).lastIndexOf("mission");
  if (guess < 0 || last < 0 || steps.filter((s) => s.kind === "mission").length < 2 || guess > last) return steps;
  const rest = steps.filter((_, i) => i !== guess), at = rest.map((s) => s.kind).lastIndexOf("mission");
  return [...rest.slice(0, at), steps[guess], ...rest.slice(at)];
}
