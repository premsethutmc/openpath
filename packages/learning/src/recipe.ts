/**
 * recipe@1: the lesson recipe. One fixed sequence that every concept's opening lesson follows, filled in from data.
 *
 *   1. the question   something worth asking, before any rule or name
 *   2. predict        the learner guesses first; each guess gets its own reply
 *   3. missions       the learner finds it out by moving something (scenes, one goal each, in order)
 *   4. name it        only now: what it is called and the short way of doing it
 *   5. when to use it one choice about where the idea applies and where it does not
 *
 * After the recipe the module carries on as before: worked examples, guided practice and the checks that count. Those are
 * the "do one with help", "do one alone" and "come back later" parts, and they already keep the evidence. Nothing in a
 * recipe is evidence: a guess, a mission or a choice writes nothing to the learner's record.
 *
 * A recipe is data. `checkRecipe` must find no problem with it, or it is not shown. No model or network is involved.
 */
import { check, type Scene } from "./scene";

/** One choice the learner can tap, with what is said back. Exactly one choice of a set is `right`. */
export interface Choice { label: string; reply: string; right?: true }
export interface Recipe {
  competency: string;
  /** A short title for the top of every step. */
  title: string;
  /** Step 1: the question, in one to three short paragraphs. No rule, no name of the idea. */
  question: string[];
  /** Step 2: the guess. */
  predict: { ask: string; choices: Choice[] };
  /** Step 3: one to four missions, each a scene with its own goal. */
  missions: Scene[];
  /** Step 4: the name and the short way, in one to three short paragraphs. */
  name: string[];
  /** Step 5: where it applies. */
  choose: { ask: string; choices: Choice[] };
}

const text = (t: unknown, max: number) => typeof t === "string" && t.trim().length > 0 && t.length <= max;
const paragraphs = (v: unknown) => Array.isArray(v) && v.length >= 1 && v.length <= 3 && v.every((t) => text(t, 220));
function choices(v: unknown, name: string): string[] {
  const c = v as { ask?: unknown; choices?: unknown };
  if (!c || !text(c.ask, 160) || !Array.isArray(c.choices) || c.choices.length < 2 || c.choices.length > 4) return [`${name} needs a question and two to four choices`];
  const list = c.choices as Choice[];
  if (!list.every((o) => o && text(o.label, 60) && text(o.reply, 200) && (o.right === undefined || o.right === true))) return [`${name}: every choice needs a short label and a reply`];
  if (list.filter((o) => o.right).length !== 1) return [`${name} needs exactly one right choice`];
  if (new Set(list.map((o) => o.label)).size !== list.length) return [`${name}: two choices read the same`];
  return [];
}
/** The problems with a recipe; an empty list means it may be shown. */
export function checkRecipe(v: unknown): string[] {
  const r = v as Recipe, bad: string[] = [];
  if (!r || typeof r !== "object") return ["not a recipe"];
  if (!text(r.competency, 80) || !text(r.title, 60)) bad.push("a recipe needs a competency and a short title");
  if (!paragraphs(r.question)) bad.push("the question is one to three short paragraphs");
  if (!paragraphs(r.name)) bad.push("the name step is one to three short paragraphs");
  bad.push(...choices(r.predict, "predict"), ...choices(r.choose, "choose"));
  if (!Array.isArray(r.missions) || r.missions.length < 1 || r.missions.length > 4) bad.push("one to four missions");
  else r.missions.forEach((m, i) => { const p = check(m); if (p.length) bad.push(`mission ${i + 1}: ${p[0]}`); });
  return bad;
}

/** The steps of a recipe, in order: what the player walks through. */
export type RecipeStep = { kind: "question" } | { kind: "predict" } | { kind: "mission"; index: number } | { kind: "name" } | { kind: "choose" };
export const stepsOf = (r: Recipe): RecipeStep[] => [{ kind: "question" }, { kind: "predict" }, ...r.missions.map((_, index) => ({ kind: "mission" as const, index })), { kind: "name" }, { kind: "choose" }];

const RECIPES: Recipe[] = [
  // Integrals, as a learner first meets them (the skill that integrates powers of x). The opening lesson of this skill
  // exists and records its teaching, so the recipe opens it.
  {
    competency: "MATH.calculus.indefinite-integrals",
    title: "Adding up something that changes",
    question: [
      "A tap opens slowly. After t minutes it is pouring 2t litres a minute: nothing at first, 2 after one minute, 6 after three.",
      "How much water is in the tank after 3 minutes?",
    ],
    predict: {
      ask: "Before working anything out, what is your guess?",
      choices: [
        { label: "6 litres", reply: "6 is how fast it pours at the end, not how much has poured. Let's find out." },
        { label: "9 litres", reply: "Good instinct. Let's see why.", right: true },
        { label: "18 litres", reply: "18 would be right if it poured 6 a minute the whole time. It started from nothing. Let's find out." },
      ],
    },
    missions: [
      { type: "scene", kind: "accumulate", variable: "t", poly: [2], from: 0, to: 3, step: 0.05, prompt: "First a steady tap: 2 litres a minute. Drag the edge to t = 3.", success: "A steady rate is easy: 2 × 3 = 6 litres. The water is the area under the line.", goal: { measure: "x", equals: 3 } },
      { type: "scene", kind: "strips", variable: "t", poly: [0, 2], from: 0, to: 3, max: 100, prompt: "Now the slow tap. Pretend it holds steady for a slice of time. Add slices until under 2% is missing.", success: "Thinner slices, and the total settles on 9 litres: the area under the sloping line.", goal: { measure: "gapPercent", below: 2 } },
      { type: "scene", kind: "accumulate", variable: "t", poly: [0, 2], from: 0, to: 3, step: 0.05, prompt: "Slices are slow. Drag the edge to t = 3 and watch the total at t = 1, 2 and 3.", success: "Totals 1, 4, 9 at t = 1, 2, 3. The total so far is always t².", goal: { measure: "x", equals: 3 } },
      { type: "scene", kind: "slope", variable: "t", poly: [0, 0, 1], from: 0, to: 3, step: 0.05, prompt: "This curve is t², the total so far. Slide to where its slope is 4.", success: "At t = 2 the slope of t² is 4, which is 2t: the slope of the total is the pouring rate.", goal: { measure: "slope", equals: 4 } },
    ],
    name: [
      "Adding up something that keeps changing is called integrating. The total is the area under the graph, written ∫ from 0 to 3 of 2t dt = 9.",
      "t² is an antiderivative of 2t: the curve whose slope is 2t. The short way is to find it, put in the end, put in the start, and subtract: 3² − 0² = 9.",
      "For a power: raise the power by one, then divide by the new power. xⁿ becomes xⁿ⁺¹ ⁄ (n + 1).",
    ],
    choose: {
      ask: "Which curve undoes 3t² (has slope 3t²)?",
      choices: [
        { label: "6t", reply: "6t is the slope of 3t², one step the other way. We want the curve whose slope is 3t²." },
        { label: "t³", reply: "Yes. Raise the power to 3, divide by 3: 3t³ ⁄ 3 = t³. Its slope is 3t².", right: true },
        { label: "3t³", reply: "Raise the power, then also divide by the new power: 3t³ ⁄ 3 = t³." },
      ],
    },
  },
];

/** Every recipe (for tests and review). */
export const ALL_RECIPES: readonly Recipe[] = RECIPES;
/** The recipe for a competency, or null: none written, or one with any problem. */
export function recipeFor(competency: string): Recipe | null {
  const r = RECIPES.find((x) => x.competency === competency);
  return r && checkRecipe(r).length === 0 ? r : null;
}
