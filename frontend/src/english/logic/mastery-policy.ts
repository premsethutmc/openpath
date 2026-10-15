/**
 * The approved evidence rules for claims about what a pupil knows (decisions C′, the stricter misconception
 * resolution, and the spelling-format correction). Every number here is a provisional, configurable draft chosen
 * for review: none is scientifically calibrated, and the difficulty values they compare against are author
 * estimates (dictation words: `difficulty_source: author_estimate`).
 *
 * These rules sit on top of the engine. They never change the Learner Vector's estimate (mean, sd) or how an
 * answer is scored; they decide only what may be *said* about it, and what the plan does next.
 */

/** C′: the evidence gate before a skill is described as demonstrated at level L. */
export const MASTERY_GATE = {
  version: "mastery-gate@0-draft",
  /**
   * Only the latest this-many qualifying independent answers count, leaving out answers that a later lesson
   * superseded (spelling: on its pattern or related ones; otherwise the whole skill; see SPELLING_PATTERN_SCOPE).
   */
  window: 6,
  /** A right answer is "at level" on a question of difficulty ≥ L − atLevelBelow. */
  atLevelBelow: 0.25,
  /** At least this many right answers at level, on different questions (and different words). */
  atLevelMin: 2,
  /** A recent wrong answer on a question of difficulty ≤ L − contradictBelow blocks the claim. */
  contradictBelow: 1,
  /** An evidence check asks questions from L − atLevelBelow up to L + diagnosticAbove: at the level, not far above it. */
  diagnosticAbove: 1,
  /** Two or more such contradictions: the plan practises before checking again (one is probed first). */
  practiceAfterContradictions: 2,
  /**
   * Direct spelling demonstrated by dictation alone (no second question format): evidence diversity instead —
   * right answers at level on at least this many different words and spelling patterns.
   */
  singleFormat: { minWords: 2, minPatterns: 2 },
  /** Questions in an evidence check the plan chooses to fill a gap. */
  checkLength: 4,
} as const;

/**
 * Lesson scope for the gate's window (MASTERY_RULES.md §6b and §8). When on, a spelling lesson supersedes only earlier
 * answers on its pattern and on patterns sharing a misconception tag with it in the content. OFF (the whole-skill
 * rule) until an educator reviews the pattern relations: shared tags are error labels on candidate questions, not a
 * validated relation between patterns. Other skills always use the whole-skill rule. Mutable for tests only.
 */
export const LESSON_SCOPE: { spellingPatternTags: boolean } = { spellingPatternTags: false };

/** The stricter misconception resolution. */
export const RESOLUTION = {
  version: "misconception-resolution@0-draft",
  /** At least this many later independent right answers on different questions that test the misconception… */
  minRight: 2,
  /** …each on a question of difficulty ≥ (the hardest matching error's difficulty − belowHardest)… */
  belowHardest: 0.5,
  /**
   * …with at least one on a later calendar day than the last matching error: in the pupil's (or school's) time zone
   * when the record has one, otherwise UTC (every record so far).
   */
  laterDay: true,
} as const;

/** Direct spelling: the capabilities with dictation words, and the format that may demonstrate on its own there. */
export const DICTATION_CAPS: readonly string[] = ["EN.FND.SPL.inflections", "EN.FND.SPL.morphological"];
export const DICTATION_FORMAT = "typed:dictation";
/** For the engine's policy (single_format_demonstration): only these capabilities, only this format. */
export const SINGLE_FORMAT_DEMONSTRATION: Record<string, string[]> = Object.fromEntries(DICTATION_CAPS.map((c) => [c, [DICTATION_FORMAT]]));
