/**
 * Everything the English web app ships with: the framework the engine runs on (0.2.0, 56 specified
 * capabilities), the hand-written item bank, the generated spelling items, lessons and feedback.
 *
 * Only right-or-wrong items are included. Extended writing and short written answers need an
 * evaluator, and evaluation (E3b) is disabled, so they are not offered at all.
 */
import {
  type CodeItem,
  type ContentBundle,
  type Context,
  type Framework,
  type FrameworkIndex,
  type Goal,
  type Item,
  type Passage,
  type GeneratedReview,
  type ItemReview,
  indexContent,
  indexFramework,
  isSpecified,
  reviewStatus,
} from "../../../../packages/english-core/src/index.ts";
import frameworkJson from "../../../../content/english/framework/en-0.2.0.json";
import codeItemsJson from "../../../../content/english/items/code-items.json";
import e2aItemsJson from "../../../../content/english/items/e2a-items.json";
import e2bItemsJson from "../../../../content/english/items/e2b-items.json";
import retiredJson from "../../../../content/english/items/retired-versions.json";
import passagesJson from "../../../../content/english/items/passages.json";
import progressionsJson from "../../../../content/english/items/progressions.json";
import goalsJson from "../../../../content/english/goals.json";
import misspellingsJson from "../../../../content/english/signals/misspellings.json";
import generatedJson from "../../../../content/english/spelling/generated-items.json";
import retiredGeneratedJson from "../../../../content/english/spelling/retired-generated.json";
import wordbankJson from "../../../../content/english/spelling/wordbank.json";
import reviewJson from "../../../../content/english/spelling/review/review.json";
import lessonsJson from "../../../../content/english/web/lessons.json";
import feedbackJson from "../../../../content/english/web/feedback.json";

export type Code = Extract<Item, { kind: "code" }>;

export interface Lesson {
  id: string; // `${capability}#${step}`
  capability: string;
  step: string;
  title: string;
  rule: string;
  examples: { text: string; note?: string }[];
  tip?: string;
  check: { prompt: string; options: string[]; answer: number; explain: string };
}

export interface LadderStep {
  id: string;
  band: number;
  descriptor: string;
  feature: string;
}

export interface WordSource {
  id: string;
  name: string;
  url: string;
  licence: string;
  notice: string;
  used_for: string;
  commit: string;
}

/** The capabilities taught in the guided interface (decision 7): spelling first, then foundational grammar and vocabulary. */
export const GUIDED = {
  spelling: ["EN.FND.SPL.inflections", "EN.FND.SPL.morphological", "EN.FND.SPL.homophones"],
  grammar: ["EN.GRM.VERB.present_past_simple", "EN.GRM.VERB.sva", "EN.GRM.NOUN.articles", "EN.GRM.NOUN.plurals_countability", "EN.GRM.PUN.capitalisation", "EN.GRM.PUN.apostrophes"],
  vocabulary: ["EN.VOC.BRD.general", "EN.VOC.MOR.prefixes", "EN.VOC.MOR.suffixes", "EN.VOC.REL.synonyms_antonyms"],
} as const;
export type Area = keyof typeof GUIDED;
export const GUIDED_ALL: string[] = [...GUIDED.spelling, ...GUIDED.grammar, ...GUIDED.vocabulary];
export const SPELLING = new Set<string>(GUIDED.spelling);

/**
 * Which generated items a build offers (content validation, 13 October 2026):
 *   pilot        only items covered by an approved rule or reviewed set
 *   development  approved and unreviewed items
 * Flagged and excluded items are never offered. Either way, generated items stay practice-only: an
 * approval never lets them change a capability estimate.
 */
export type ContentMode = "pilot" | "development";
declare const __OPENPATH_CONTENT__: string | undefined;
export const BUILD_CONTENT_MODE: ContentMode = typeof __OPENPATH_CONTENT__ !== "undefined" && __OPENPATH_CONTENT__ === "pilot" ? "pilot" : "development";

export interface AppContent {
  ctx: Context;
  index: FrameworkIndex;
  /** Hand-written, code-scored items (the bank E1–E2b built): placement and capability evidence. */
  handWritten: Set<string>;
  /** Generated spelling items offered in this build (practice only; see ContentMode). */
  generated: Code[];
  /** Every generated item, offered or not (old answers to any of them still rebuild exactly). */
  generatedAll: Code[];
  /** The review status of every generated item. */
  review: Map<string, ItemReview>;
  contentMode: ContentMode;
  lessons: Map<string, Lesson>;
  ladders: Map<string, LadderStep[]>;
  feedback: Map<string, string>;
  goals: Map<string, Goal>;
  wordSources: WordSource[];
  /** The guided-learning goal: the 13 guided capabilities. */
  guidedGoal: Goal;
  /** Every specified capability, for "more practice". */
  overallGoal: Goal;
}

/** Build the content index. Throws on invalid content, exactly as the engine does elsewhere. */
export function loadContent(opts: { mode?: ContentMode; review?: GeneratedReview } = {}): AppContent {
  const mode = opts.mode ?? BUILD_CONTENT_MODE;
  const framework = frameworkJson as unknown as Framework;
  const index = indexFramework(framework);
  const ok = (cap: string) => {
    const c = index.leaves.get(cap);
    return !!c && isSpecified(c);
  };
  const hand = [...(codeItemsJson as unknown as Item[]), ...(e2aItemsJson as unknown as Item[]), ...(e2bItemsJson as unknown as Item[])].filter((i) => i.kind === "code" && ok(i.target));
  const generated = (generatedJson as unknown as Code[]).filter((i) => ok(i.target));
  const bundle: ContentBundle = {
    items: [...hand, ...generated],
    retired: [...(retiredJson as unknown as Item[]), ...(retiredGeneratedJson as unknown as Item[])].filter((i) => i.kind === "code" && ok(i.target)),
    passages: passagesJson as unknown as Passage[],
    goals: goalsJson as unknown as Goal[],
    misspellings: misspellingsJson as unknown as Record<string, string>,
  };
  const content = indexContent(bundle, index);
  const review = reviewStatus(generated, opts.review ?? (reviewJson as unknown as GeneratedReview));
  const offered = generated.filter((g) => {
    const st = review.get(g.id)?.status;
    return st === "approved" || (mode === "development" && st === "unreviewed");
  });
  const lessons = new Map((lessonsJson as unknown as { lessons: Lesson[] }).lessons.map((l) => [l.id, l]));
  const ladders = new Map(Object.entries((progressionsJson as unknown as { capabilities: Record<string, { steps: LadderStep[] }> }).capabilities).map(([k, v]) => [k, v.steps]));
  const feedback = new Map(Object.entries((feedbackJson as unknown as { misconceptions: Record<string, string> }).misconceptions));
  const guidedGoal: Goal = { id: "guided", name: "Spelling, grammar and vocabulary", weights: Object.fromEntries(GUIDED_ALL.map((c) => [c, 1])) };
  const overallGoal: Goal = { id: "overall", name: "All of English", weights: { EN: 1 } };
  return {
    ctx: { index, content },
    index,
    handWritten: new Set(hand.map((i) => i.id)),
    generated: offered,
    generatedAll: generated,
    review,
    contentMode: mode,
    lessons,
    ladders,
    feedback,
    goals: content.goals,
    wordSources: (wordbankJson as unknown as { sources: WordSource[] }).sources,
    guidedGoal,
    overallGoal,
  };
}

export const lessonId = (capability: string, step: string) => `${capability}#${step}`;

export function stepOf(item: Item): string | undefined {
  return item.kind === "code" ? item.step : undefined;
}

export function isGenerated(item: Item): item is Code & { generated: NonNullable<CodeItem["generated"]> } {
  return item.kind === "code" && !!item.generated;
}
