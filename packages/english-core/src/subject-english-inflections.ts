/**
 * English subject module, first rules: spelling inflected forms (EN.FND.SPL.inflections).
 *
 * Supplies the English-specific parts the rule-evidence projection needs (../rule-evidence.ts): the rules,
 * the band from which each is required, which rule an item tests, contrast items, the word an item asks
 * for, and how a wrong answer is classified. The rules are the capability's ladder steps
 * (content/english/items/progressions.json), all of which are separately learnable rules; a test checks
 * this list against that file. The required band is the band of the descriptor each step sits under.
 *
 * Candidate content, like the rest of the bank: the rule list and classifier still need educator review.
 */
import { normaliseAnswer, responseKey } from "./content.ts";
import type { RuleDef, Signature, SubjectRules } from "./rule-evidence.ts";
import type { Item, Response } from "./types.ts";

export const INFLECTIONS = "EN.FND.SPL.inflections";

export const INFLECTION_RULES: RuleDef[] = [
  { id: "plain", capability: INFLECTIONS, name: "Adding -s, -ed, -ing with no change", requiredFromBand: 2, misconceptions: [] },
  { id: "es_plural", capability: INFLECTIONS, name: "Adding -es", requiredFromBand: 2, misconceptions: [] },
  { id: "double_short", capability: INFLECTIONS, name: "Doubling the final consonant of short words", requiredFromBand: 4, misconceptions: ["no_doubling", "over_doubling"] },
  { id: "drop_e", capability: INFLECTIONS, name: "Dropping the silent e", requiredFromBand: 4, misconceptions: ["kept_silent_e"] },
  { id: "y_to_i", capability: INFLECTIONS, name: "Changing y to i", requiredFromBand: 4, misconceptions: ["y_not_changed"] },
  { id: "stress_doubling", capability: INFLECTIONS, name: "Doubling in longer words stressed at the end", requiredFromBand: 6, misconceptions: ["no_doubling"] },
  { id: "no_double_unstressed", capability: INFLECTIONS, name: "Not doubling when the stress is earlier", requiredFromBand: 6, misconceptions: ["over_doubling"] },
  { id: "exceptions", capability: INFLECTIONS, name: "Exceptions (-ck-, ie to y)", requiredFromBand: 8, misconceptions: [] },
];

const RULE_IDS = new Set(INFLECTION_RULES.map((r) => r.id));

/** Two neighbouring letters swapped, nothing else changed. */
export function isAdjacentSwap(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false;
  const diff: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
}

export const englishInflections: SubjectRules = {
  id: "en-inflections@0",
  capabilities: () => [INFLECTIONS],
  rules: (capability) => (capability === INFLECTIONS ? INFLECTION_RULES : []),
  ruleOf: (item) => (item.kind === "code" && item.target === INFLECTIONS && item.step && RULE_IDS.has(item.step) ? item.step : null),
  /**
   * Contrast items (the rule must not be applied: jump → jumping, agree → agreeing) are marked by a family
   * id ending in ".contrast". No item in the current bank is marked; the 24 draft questions are.
   */
  roleOf: (item) => (item.family?.endsWith(".contrast") ? "contrast" : "apply"),
  wordOf: (item) => {
    if (item.kind !== "code") return null;
    if (item.generated) return item.generated.word.toLowerCase();
    if (item.answers?.length) return normaliseAnswer(item.answers[0]);
    if (item.options && item.answer !== undefined) return normaliseAnswer(item.options[item.answer]);
    return null;
  },
  classify: (item: Item, response: Response, correct: boolean): Signature => {
    if (correct) return { kind: "correct" };
    if (item.kind !== "code") return { kind: "unclassified", form: "" };
    const key = responseKey(response);
    const tag = response.kind === "choice" ? item.distractor_tags?.[key] : item.wrong?.[key];
    if (tag) return { kind: "misconception", tag };
    if (response.kind === "typed" && (item.answers ?? []).some((a) => isAdjacentSwap(normaliseAnswer(a), key))) return { kind: "slip" };
    return { kind: "unclassified", form: key };
  },
};

/**
 * Teaching strategies per rule, in the order the planner tries them (MVP: doubling only). The ids are the
 * English module's; the lesson text for each lives in content/english/web/doubling-journey.json and is
 * provisional (not yet reviewed by an educator). No strategy is assumed to work for every learner.
 */
export const INFLECTION_STRATEGIES: Record<string, string[]> = {
  double_short: ["worked_examples", "sound_first", "word_building"],
};
