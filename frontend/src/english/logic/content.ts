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
import { SINGLE_FORMAT_DEMONSTRATION } from "./mastery-policy.ts";
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
import dictationJson from "../../../../content/english/spelling/dictation-bank.json";
import spellingBeeJson from "../../../../content/english/spelling/spelling-bee.json";
import retiredGeneratedJson from "../../../../content/english/spelling/retired-generated.json";
import wordbankJson from "../../../../content/english/spelling/wordbank.json";
import reviewJson from "../../../../content/english/spelling/review/review.json";
import pilotSetJson from "../../../../content/english/spelling/review/pilot-set.json";
import lessonsJson from "../../../../content/english/web/lessons.json";
import feedbackJson from "../../../../content/english/web/feedback.json";
import journeyJson from "../../../../content/english/web/doubling-journey.json";
import spellingJourneyJson from "../../../../content/english/web/spelling-journey.json";
import journeyWordsJson from "../../../../content/english/spelling/journey-words.json";
import pilotItemsJson from "../../../../content/english/pilot/items.json";
import pilotPassagesJson from "../../../../content/english/pilot/passages.json";
import pilotManifestJson from "../../../../content/english/pilot/manifest.json";
import pilotAllowlistJson from "../../../../content/english/pilot/allowlist.json";

export type Code = Extract<Item, { kind: "code" }>;

/**
 * A dictation question (content/english/spelling/dictation-bank.json): the app says `speak`, can say `sentence`
 * (never shown, it contains the word), and the learner types the spelling. Every item is candidate content
 * prepared for OpenPath and awaiting independent educator review.
 */
export type DictationItem = Code & { speak: string; sentence?: string; scoring: string; provenance: { prepared_by: string; prepared_on: string; reviewed_by: string | null; note: string } };

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

/** A word of the spelling-journey bank (content/english/spelling/journey-words.json), as one question. */
export interface JourneyWord {
  /** The question's id: jrn.<rule>.<word>. */
  id: string;
  word: string;
  rule: string;
  /** apply: the rule changes the word; contrast: a similar-looking word the rule must NOT change. */
  kind: "apply" | "contrast";
  /** Fixed by the pipeline, never by the learner: teach and practice words are never evidence; assess, retention and contrast words are held back. */
  role: "teach" | "practice" | "assess" | "retention" | "contrast";
  base: string;
  /** The ending, without its hyphen (ing, ed, s, er, est). */
  ending: string;
  /** Every rule-made misspelling with what it shows (also tags the engine does not list: those only choose the explanation). */
  wrong: Record<string, string>;
  /** Can the device say the word without it sounding like another word? */
  dictate: boolean;
}

export interface RuleJourney {
  rule: string;
  /** The child's name for it ("Doubling letters"). */
  child: string;
  /** The parent's description. */
  skill: string;
  strategies: StrategyContent[];
  /** Child-facing explanation of each rule-made mistake, with {base}, {word}, {last}, {ending}, {stem}. */
  mistakes: Record<string, string>;
  /** Lesson example words (role teach). */
  teach: JourneyWord[];
  /** Question ids by use, in the pipeline's order (the journey orders them per learner). */
  practice: string[];
  assess: string[];
  contrast: string[];
  retention: string[];
}

/** The adaptive spelling journey across the inflection rules (spelling-journey.json + journey-words.json). */
export interface SpellingJourneyContent {
  review: string;
  capability: string;
  /** Rules in teaching order (the capability's ladder). */
  order: string[];
  rules: Map<string, RuleJourney>;
  /** Every journey question's word, by question id. */
  words: Map<string, JourneyWord>;
  text: { neutral: string; slip: string; unsure: string };
  sources: { id: string; commit: string; notice: string }[];
}

/** Question ids and items for the spelling-journey bank. Evidence words are provisional questions; teach and practice words are generated (practice-only). */
function spellingJourneyContent(doubling: StrategyContent[]): { content: SpellingJourneyContent; items: Code[] } {
  type Row = [string, string, "apply" | "contrast", JourneyWord["role"], string, string, number, number, Record<string, string>, string[]];
  const raw = journeyWordsJson as unknown as { fields: string[]; rows: Row[]; sources: SpellingJourneyContent["sources"] };
  const doc = spellingJourneyJson as unknown as {
    review: string; capability: string; order: string[]; neutral: string; slip: string; unsure: string;
    rules: Record<string, { child: string; skill: string; strategies: StrategyContent[] | "doubling-journey"; mistakes: Record<string, string> }>;
  };
  // the engine's misconception list for this capability (framework): only these tags go on a question; others only pick an explanation
  const ENGINE_TAGS = new Set(["no_doubling", "kept_silent_e", "y_not_changed", "over_doubling"]);
  const words = new Map<string, JourneyWord>();
  const items: Code[] = [];
  const rules = new Map<string, RuleJourney>();
  for (const id of doc.order) {
    const r = doc.rules[id];
    rules.set(id, { rule: id, child: r.child, skill: r.skill, strategies: r.strategies === "doubling-journey" ? doubling : r.strategies, mistakes: r.mistakes, teach: [], practice: [], assess: [], contrast: [], retention: [] });
  }
  for (const [w, rule, kind, role, base, join, diff, dictate, wrong, variants] of raw.rows) {
    const rj = rules.get(rule);
    if (!rj) continue;
    const id = `jrn.${rule}.${w}`;
    const ending = join.replace(/^-/, "");
    const jw: JourneyWord = { id, word: w, rule, kind, role, base, ending, wrong, dictate: dictate === 1 };
    words.set(id, jw);
    const evidence = role === "assess" || role === "retention" || role === "contrast";
    const engineWrong = Object.fromEntries(Object.entries(wrong).filter(([, t]) => ENGINE_TAGS.has(t)));
    const prompt = ending === "s" ? `Add -s or -es to "${base}".` : `Add -${ending} to "${base}".`;
    const item: Code = {
      kind: "code",
      id,
      version: 1,
      target: doc.capability,
      format: "typed:word_form",
      b: Math.min(8, Math.max(1, diff)),
      a: 1.1,
      prompt,
      answers: [w, ...variants],
      ...(Object.keys(engineWrong).length ? { wrong: engineWrong } : {}),
      step: rule,
      family: `fam.jrn.${rule}${kind === "contrast" ? ".contrast" : ""}`,
      review: "candidate-generated",
      rationale: `Spelling-journey bank (${role}): difficulty is a feature estimate from the rule's ladder step, word length and commonness, not calibrated.`,
      ...(dictate === 1 ? { speak: w } : {}),
      ...(evidence
        ? // held back for independent checks: provisional (recorded at rule level, never changes the estimate, never verified mastery)
          { evidence_status: "provisional" as const }
        : // lesson and practice words: generated and unchecked, so practice-only
          { difficulty_source: "feature_estimate" as const, generated: { generator: "journey-bank@1", template: "add_ending", word: w, base, join, sources: ["scowl", "cmudict"] } }),
    } as Code;
    items.push(item);
    if (role === "teach") rj.teach.push(jw);
    else rj[role].push(id);
  }
  return { content: { review: doc.review, capability: doc.capability, order: doc.order, rules, words, text: { neutral: doc.neutral, slip: doc.slip, unsure: doc.unsure }, sources: raw.sources }, items };
}

/**
 * What a question is reserved for (five-capability pilot, PR #24). Diagnosis: placement, first checks and more
 * practice. Practice: only during teaching. Confirmation: only the fresh check after teaching. Retention: only a
 * later check. Questions without a pool (every other capability) can be used for anything, as before.
 */
export type Pool = "diagnosis" | "practice" | "confirmation" | "retention";
export interface PoolInfo {
  pool: Pool;
  origin: "existing" | "new-pr24";
  /** A less familiar example of the pattern: a transfer check. */
  unfamiliar?: boolean;
}

/**
 * What a build offers (content validation, 13 October 2026; the pilot boundary, 15 October 2026):
 *   pilot        the content-safety boundary (PilotGate below): only the placement check and the dictation
 *                spelling check, and only questions that are on the pilot allowlist AND approved by an educator
 *                (that exact id and version). No lessons, no generated practice words, no other activity.
 *   preview      internal: the generated pilot set's items (pilot-set.json), reviewed or not, for the product
 *                owner to try practice before the review; labelled as not yet reviewed. Not for pupils.
 *   development  internal: approved and unreviewed generated items, every activity.
 * Flagged and excluded generated items are never offered in any mode. Generated items stay practice-only: an
 * approval never lets them change a capability estimate.
 */
export type ContentMode = "pilot" | "preview" | "development";
declare const __OPENPATH_CONTENT__: string | undefined;
const built = typeof __OPENPATH_CONTENT__ !== "undefined" ? __OPENPATH_CONTENT__ : "development";
export const BUILD_CONTENT_MODE: ContentMode = built === "pilot" || built === "preview" ? built : "development";
/** The educator approvals compiled into a pilot build (build-english.mjs --pilot): `id@version` and `passage:id`. */
declare const __OPENPATH_PILOT_APPROVED__: string[] | undefined;
const BUILD_PILOT_APPROVED: string[] = typeof __OPENPATH_PILOT_APPROVED__ !== "undefined" ? __OPENPATH_PILOT_APPROVED__ : [];
const PILOT_SET = new Set((pilotSetJson as unknown as { items: { id: string; version: number }[] }).items.map((r) => `${r.id}@${r.version}`));

/** The pilot allowlist (content/english/pilot/allowlist.json): candidates only, never approvals. */
export interface PilotAllowlist {
  version: string;
  sessions_allowed: SessionKind[];
  items: { id: string; version: number; use: "placement" | "dictation" }[];
}
type SessionKind = "placement" | "spelling_assess";
export const PILOT_ALLOWLIST = pilotAllowlistJson as unknown as PilotAllowlist;

/**
 * The pilot content-safety boundary. In a pilot build every pupil-facing question passes all of:
 *   1. its activity is allowed (placement or the dictation spelling check; nothing else), or it is a Spelling Bee
 *      word the gate allows (`bee` below: practice, never engine evidence),
 *   2. that exact question version is approved by an educator (compiled into the build from the review records),
 *   3. it is on the pilot allowlist, at that version,
 *   4. it exists in the content, is hand-written or dictation (never generated, journey or retired content), and any
 *      passage it uses is approved too.
 * Anything missing, unknown, excluded or unreviewed is refused. With no approvals, nothing is shown (fail closed).
 */
export interface PilotGate {
  sessions: ReadonlySet<string>;
  /** `id@version` of every question a pupil may be shown. */
  allowed: ReadonlySet<string>;
  /**
   * The Spelling Bee words a pupil may be asked (practice only; never engine evidence): a reused dictation word only if
   * its question is allowed above, a new word only if the build compiled its owner approval for pilot use (`bee:<id>`,
   * build-english.mjs, which also runs the content checks). Empty with no approvals: no Spelling Bee (fail closed).
   */
  bee: ReadonlySet<string>;
}

export interface AppContent {
  ctx: Context;
  index: FrameworkIndex;
  /** Hand-written, code-scored items (the bank E1–E2b built): placement and capability evidence. */
  handWritten: Set<string>;
  /** Generated spelling items offered in this build (practice only; see ContentMode). */
  generated: Code[];
  /** Words OpenPath knows (word bank entries and single-word answer keys): to tell a different word from a misspelling. */
  words: Set<string>;
  /** The dictation bank: the primary spelling assessment (hear the word, type it). Not part of `handWritten`. */
  dictation: { version: string; status: string; items: DictationItem[] };
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
  /** The adaptive consonant-doubling journey (MVP slice). */
  journey: JourneyContent;
  /** The adaptive spelling journey across all eight inflection rules. */
  spelling: SpellingJourneyContent;
  /** Pilot content: what each question on the five pilot capabilities is reserved for, and the content version. */
  pilot: { version: string; capabilities: string[]; pools: Map<string, PoolInfo> };
  /** The pilot content-safety boundary: set in a pilot build (and only there), null otherwise. */
  gate: PilotGate | null;
}

/** Build the content index. Throws on invalid content, exactly as the engine does elsewhere. */
export function loadContent(opts: { mode?: ContentMode; review?: GeneratedReview; approved?: Iterable<string> } = {}): AppContent {
  const mode = opts.mode ?? BUILD_CONTENT_MODE;
  // direct spelling may be demonstrated by dictation alone (approved correction): the framework file is unchanged,
  // the allowance is added here for the app only, and the app's evidence gate asks for word and pattern diversity
  const fw = frameworkJson as unknown as Framework;
  const framework: Framework = { ...fw, policy: { ...fw.policy, single_format_demonstration: SINGLE_FORMAT_DEMONSTRATION } };
  const index = indexFramework(framework);
  const ok = (cap: string) => {
    const c = index.leaves.get(cap);
    return !!c && isSpecified(c);
  };
  // the pilot's new candidate questions are hand-written candidates like the rest of the bank (awaiting review)
  const hand = [...(codeItemsJson as unknown as Item[]), ...(e2aItemsJson as unknown as Item[]), ...(e2bItemsJson as unknown as Item[]), ...(pilotItemsJson as unknown as Item[])].filter((i) => i.kind === "code" && ok(i.target));
  const generated = (generatedJson as unknown as Code[]).filter((i) => ok(i.target));
  const dictationDoc = dictationJson as unknown as { version: string; status: string; items: DictationItem[] };
  const dictation = { version: dictationDoc.version, status: dictationDoc.status, items: dictationDoc.items.filter((i) => ok(i.target)) };
  const j = journeyJson as unknown as { review: string; capability: string; rule: string; items: Code[]; independent: { assessOrder: string[] }; guided: string[]; strategies: StrategyContent[] };
  const journey: JourneyContent = { review: j.review, capability: j.capability, rule: j.rule, items: j.items, assessOrder: j.independent.assessOrder, guided: j.guided, strategies: j.strategies };
  const spelling = spellingJourneyContent(j.strategies);
  const bundle: ContentBundle = {
    // the journey's provisional questions are in the bank (so the engine can score them) but not in `handWritten`:
    // placement, practice and checks never use them, only the doubling journey does
    // dictation items are scored by the engine like any question, but only the spelling assessment selects them
    // the spelling journey's questions are in the bank too, for the same reason; only the spelling journey selects them
    items: [...hand, ...generated, ...journey.items, ...dictation.items, ...spelling.items],
    retired: [...(retiredJson as unknown as Item[]), ...(retiredGeneratedJson as unknown as Item[])].filter((i) => i.kind === "code" && ok(i.target)),
    passages: [...(passagesJson as unknown as Passage[]), ...(pilotPassagesJson as unknown as Passage[])],
    goals: goalsJson as unknown as Goal[],
    misspellings: misspellingsJson as unknown as Record<string, string>,
  };
  const content = indexContent(bundle, index);
  const words = new Set((wordbankJson as unknown as { entries: { word: string }[] }).entries.map((e) => e.word.toLowerCase()));
  for (const it of bundle.items) if (it.kind === "code") for (const w of it.answers ?? []) if (/^[a-z]+$/i.test(w)) words.add(w.toLowerCase());
  const review = reviewStatus(generated, opts.review ?? (reviewJson as unknown as GeneratedReview));
  const offered = generated.filter((g) => {
    const st = review.get(g.id)?.status;
    if (st === "flagged" || st === "excluded") return false;
    if (mode === "preview") return PILOT_SET.has(`${g.id}@${g.version}`);
    return st === "approved" || (mode === "development" && st === "unreviewed");
  });
  const lessons = new Map((lessonsJson as unknown as { lessons: Lesson[] }).lessons.map((l) => [l.id, l]));
  const handWritten = new Set(hand.map((i) => i.id));
  const gate = mode === "pilot" ? pilotGate(content.items, handWritten, new Set(dictation.items.map((i) => i.id)), new Set(opts.approved ?? BUILD_PILOT_APPROVED)) : null;
  const ladders = new Map(Object.entries((progressionsJson as unknown as { capabilities: Record<string, { steps: LadderStep[] }> }).capabilities).map(([k, v]) => [k, v.steps]));
  const feedback = new Map(Object.entries((feedbackJson as unknown as { misconceptions: Record<string, string> }).misconceptions));
  const guidedGoal: Goal = { id: "guided", name: "Spelling, grammar and vocabulary", weights: Object.fromEntries(GUIDED_ALL.map((c) => [c, 1])) };
  const overallGoal: Goal = { id: "overall", name: "All of English", weights: { EN: 1 } };
  return {
    ctx: { index, content },
    index,
    // in a pilot build the selection pools hold only what the gate allows; every item stays in the bank for scoring
    // (an old record still rebuilds exactly), and no lesson, feedback text or generated word is offered
    handWritten: gate ? new Set([...handWritten].filter((id) => gate.allowed.has(`${id}@${content.items.get(id)!.version}`))) : handWritten,
    generated: gate ? [] : offered,
    generatedAll: generated,
    review,
    contentMode: mode,
    words,
    dictation: gate ? { ...dictation, items: dictation.items.filter((i) => gate.allowed.has(`${i.id}@${i.version}`)) } : dictation,
    lessons: gate ? new Map() : lessons,
    ladders,
    feedback: gate ? new Map() : feedback,
    goals: content.goals,
    wordSources: (wordbankJson as unknown as { sources: WordSource[] }).sources,
    guidedGoal,
    overallGoal,
    journey,
    spelling: spelling.content,
    pilot: (() => {
      const m = pilotManifestJson as unknown as { version: string; capabilities: string[]; pools: Record<string, PoolInfo> };
      return { version: m.version, capabilities: m.capabilities, pools: new Map(Object.entries(m.pools)) };
    })(),
    gate,
  };
}

/** Allowed = allowlisted ∩ approved (exact version) ∩ present in the bank as hand-written or dictation, with any passage approved. */
function pilotGate(items: ReadonlyMap<string, Item>, handWritten: Set<string>, dictation: Set<string>, approved: Set<string>): PilotGate {
  const allowed = new Set<string>();
  for (const a of PILOT_ALLOWLIST.items) {
    const key = `${a.id}@${a.version}`;
    if (!approved.has(key)) continue;
    const it = items.get(a.id);
    if (!it || it.kind !== "code" || it.version !== a.version || it.generated) continue;
    if (!(a.use === "dictation" ? dictation.has(a.id) && it.format === "typed:dictation" : handWritten.has(a.id))) continue;
    if (it.passage && !approved.has(`passage:${it.passage}`)) continue;
    allowed.add(key);
  }
  const bee = new Set<string>();
  for (const e of (spellingBeeJson as unknown as { words: { id: string; item?: { id: string; version: number } }[] }).words) {
    if (e.item ? allowed.has(`${e.item.id}@${e.item.version}`) : approved.has(`bee:${e.id}`)) bee.add(e.id);
  }
  return { sessions: new Set(PILOT_ALLOWLIST.sessions_allowed.filter((x) => x === "placement" || x === "spelling_assess")), allowed, bee };
}

/** Whether a pupil may start this activity here: always outside a pilot build; in one, only an allowed activity with approved questions. */
export function activityAllowed(c: AppContent, type: string): boolean {
  if (!c.gate) return true;
  if (!c.gate.sessions.has(type)) return false;
  if (type === "placement") return c.handWritten.size > 0;
  if (type === "spelling_assess") return c.dictation.items.length > 0;
  return false;
}

/** Whether a question may be shown to a pupil here (always outside a pilot build). */
export function itemAllowed(c: AppContent, item: Pick<Item, "id" | "version">): boolean {
  return !c.gate || c.gate.allowed.has(`${item.id}@${item.version}`);
}

export const lessonId = (capability: string, step: string) => `${capability}#${step}`;

export function stepOf(item: Item): string | undefined {
  return item.kind === "code" ? item.step : undefined;
}

export function isGenerated(item: Item): item is Code & { generated: NonNullable<CodeItem["generated"]> } {
  return item.kind === "code" && !!item.generated;
}
