// layout@1: how a recipe is laid out. It is a rule about the screen and the reader's age, so it lives with the player and
// not in the learning engine (which has one path for every class).
//
// - "steps": one part on the screen, with Next. For young children, who lose their place on a page that scrolls.
// - "flow": one page that grows; each part appears under the last once that one is done.
//
// The class is the learner's (null when it is not known: then the page that grows).
import type { Recipe } from "../../../packages/learning/src/recipe";

export type RecipeLayout = "steps" | "flow";
const LAST_CLASS_ONE_AT_A_TIME = 5;
export const layoutFor = (_r: Recipe, grade: number | null): RecipeLayout => (grade !== null && grade <= LAST_CLASS_ONE_AT_A_TIME ? "steps" : "flow");
