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
  indexContent,
  indexFramework,
  isSpecified,
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
import lessonsJson from "../../../../content/english/web/lessons.json";
import feedbackJson from "../../../../content/english/web/feedback.json";
import journeyJson from "../../../../content/english/web/doubling-journey.json";

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

/** One teaching strategy for the doubling journey (provisional content from doubling-journey.json). */
export interface StrategyContent {
  id: string;
  name: string;
  lesson: { title: string; steps: string[]; examples: { text: string; note?: string }[]; tip?: string };
  /** Hint templates by level (1 = lightest), with {base}, {last} and {ending}. */
  hints: string[];
}

export interface JourneyContent {
  review: string;
  capability: string;
  rule: string;
  /** Provisional hand-written questions added for the journey (drafts awaiting educator review). */
  items: Code[];
  /** Independent questions, in the order they are used (unseen ones only). */
  assessOrder: string[];
  /** Generated practice words for guided practice (practice-only). */
  guided: string[];
  strategies: StrategyContent[];
}

export interface AppContent {
  ctx: Context;
  index: FrameworkIndex;
  /** Hand-written, code-scored items (the bank E1–E2b built): placement and capability evidence. */
  handWritten: Set<string>;
  /** Generated spelling items (practice until checked). */
  generated: Code[];
  lessons: Map<string, Lesson>;
  ladders: Map<string, LadderStep[]>;
  feedback: Map<string, string>;
  goals: Map<string, Goal>;
  wordSources: WordSource[];
  /** The guided-learning goal: the 13 guided capabilities. */
  guidedGoal: Goal;
  /** Every specified capability, for "more practice". */
  overallGoal: Goal;
  /** The adaptive consonant-doubling journey (MVP slice). */
  journey: JourneyContent;
}

/** Build the content index. Throws on invalid content, exactly as the engine does elsewhere. */
export function loadContent(): AppContent {
  const framework = frameworkJson as unknown as Framework;
  const index = indexFramework(framework);
  const ok = (cap: string) => {
    const c = index.leaves.get(cap);
    return !!c && isSpecified(c);
  };
  const hand = [...(codeItemsJson as unknown as Item[]), ...(e2aItemsJson as unknown as Item[]), ...(e2bItemsJson as unknown as Item[])].filter((i) => i.kind === "code" && ok(i.target));
  const generated = (generatedJson as unknown as Code[]).filter((i) => ok(i.target));
  const j = journeyJson as unknown as { review: string; capability: string; rule: string; items: Code[]; independent: { assessOrder: string[] }; guided: string[]; strategies: StrategyContent[] };
  const journey: JourneyContent = { review: j.review, capability: j.capability, rule: j.rule, items: j.items, assessOrder: j.independent.assessOrder, guided: j.guided, strategies: j.strategies };
  const bundle: ContentBundle = {
    // the journey's provisional questions are in the bank (so the engine can score them) but not in `handWritten`:
    // placement, practice and checks never use them, only the doubling journey does
    items: [...hand, ...generated, ...journey.items],
    retired: [...(retiredJson as unknown as Item[]), ...(retiredGeneratedJson as unknown as Item[])].filter((i) => i.kind === "code" && ok(i.target)),
    passages: passagesJson as unknown as Passage[],
    goals: goalsJson as unknown as Goal[],
    misspellings: misspellingsJson as unknown as Record<string, string>,
  };
  const content = indexContent(bundle, index);
  const lessons = new Map((lessonsJson as unknown as { lessons: Lesson[] }).lessons.map((l) => [l.id, l]));
  const ladders = new Map(Object.entries((progressionsJson as unknown as { capabilities: Record<string, { steps: LadderStep[] }> }).capabilities).map(([k, v]) => [k, v.steps]));
  const feedback = new Map(Object.entries((feedbackJson as unknown as { misconceptions: Record<string, string> }).misconceptions));
  const guidedGoal: Goal = { id: "guided", name: "Spelling, grammar and vocabulary", weights: Object.fromEntries(GUIDED_ALL.map((c) => [c, 1])) };
  const overallGoal: Goal = { id: "overall", name: "All of English", weights: { EN: 1 } };
  return {
    ctx: { index, content },
    index,
    handWritten: new Set(hand.map((i) => i.id)),
    generated,
    lessons,
    ladders,
    feedback,
    goals: content.goals,
    wordSources: (wordbankJson as unknown as { sources: WordSource[] }).sources,
    guidedGoal,
    overallGoal,
    journey,
  };
}

export const lessonId = (capability: string, step: string) => `${capability}#${step}`;

export function stepOf(item: Item): string | undefined {
  return item.kind === "code" ? item.step : undefined;
}

export function isGenerated(item: Item): item is Code & { generated: NonNullable<CodeItem["generated"]> } {
  return item.kind === "code" && !!item.generated;
}
