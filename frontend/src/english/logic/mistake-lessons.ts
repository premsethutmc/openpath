/**
 * Which lesson teaches against which named mistake (reteach@1).
 *
 * A mistake here is one the framework lists for a skill (content/english/framework) and a question can show through a
 * tagged wrong answer. Only pairs where an existing lesson is about exactly that mistake are listed: a mistake with no
 * such lesson is left out, and the app then carries on as before. Checked by mistake-lessons.test.ts: every mistake is
 * one the framework lists for the skill, and every lesson exists.
 */
import type { AppContent, Lesson } from "./content.ts";
import { GUIDED_LENGTH } from "./select.ts";
import type { AppState, SessionState } from "./state.ts";

/** skill → mistake → the step of the lesson that teaches against it. */
export const MISTAKE_LESSON: Record<string, Record<string, string>> = {
  "EN.FND.SPL.inflections": { no_doubling: "double_short", kept_silent_e: "drop_e", y_not_changed: "y_to_i", over_doubling: "no_double_unstressed" },
  "EN.FND.SPL.morphological": { dropped_double_at_join: "double_at_join", full_suffix: "ful_ly_ment", suffix_by_sound: "able_ible" },
  "EN.FND.SPL.homophones": { contraction_possessive: "its_its", familiar_spelling: "there_their", near_homophone: "near_homophones" },
  "EN.GRM.VERB.present_past_simple": { regularised_past: "irregular_common", past_after_did: "did_questions_negatives", tense_shift: "consistency_less_common" },
  "EN.GRM.VERB.sva": { third_person_s: "third_s", attraction_error: "intervening" },
  "EN.GRM.NOUN.articles": { a_an_sound: "a_an_sound", article_with_uncountable: "zero_uncountable" },
  "EN.GRM.NOUN.plurals_countability": { plural_uncountable: "uncountable", regularised_plural: "y_and_irregular", much_many_confusion: "many_much" },
  "EN.GRM.PUN.capitalisation": { lowercase_proper: "days_places" },
  "EN.GRM.PUN.apostrophes": { plural_apostrophe: "no_plural_apostrophe", its_with_apostrophe: "plural_its", possessive_position: "plural_its" },
  "EN.VOC.MOR.prefixes": { wrong_negative_prefix: "negative_choice" },
  "EN.VOC.MOR.suffixes": { wrong_word_class: "word_class_common", invented_derivation: "less_common" },
  "EN.VOC.REL.synonyms_antonyms": { related_not_synonym: "syn_ant_context" },
  "EN.RDG.LIT.locate_detail": { word_matching: "distractor" },
  "EN.RDG.SUM.main_idea": { detail_as_main: "topic" },
};

export interface Reteach {
  lesson: Lesson;
  mistake: string;
  /** Said to the learner above the lesson. */
  why: string;
}

/**
 * Teaching after a confirmed mistake, guided practice only.
 *
 * One wrong answer can be a slip, so the next question tests the same mistake again (select.ts, follow-up@1). When
 * that answer is wrong in the same way, on a different question, the mistake is confirmed for this session, and the
 * lesson about it comes before any more questions: once per mistake per session. The lesson is recorded like any
 * other (learner.ts finishLesson), so the engine counts the answers that follow as practice after teaching.
 */
export function reteach(s: AppState, c: AppContent, session: SessionState): Reteach | null {
  const cap = session.event.capability;
  if (session.event.type !== "guided" || !cap) return null;
  // nothing follows a lesson once the session's questions are used up
  if (session.answered.length >= (session.event.length ?? GUIDED_LENGTH)) return null;
  const own = session.attempts.filter((a) => !a.assisted);
  const last = own.at(-1);
  const before = own.at(-2);
  if (!last || !before || last.correct || before.correct || last.item.id === before.item.id) return null;
  if (session.attempts.at(-1) !== last) return null;
  for (const mistake of last.misconceptions) {
    if (!before.misconceptions.includes(mistake)) continue;
    const step = MISTAKE_LESSON[cap]?.[mistake];
    const lesson = step ? c.lessons.get(`${cap}#${step}`) : undefined;
    if (!lesson) continue;
    // already taught since the second miss: carry on with questions
    const read = s.lessons.get(lesson.id);
    if (read && read.at >= last.at) return null;
    return { lesson, mistake, why: "The last two answers slipped in the same way. Here is the idea again, then more questions." };
  }
  return null;
}
