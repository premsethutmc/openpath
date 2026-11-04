/**
 * answer-feedback@1: what the learner reads straight after ONE wrong answer. One answer cannot show why it was given, so the feedback
 * never states the learner's reasoning ("The third interior angle was found instead."). It says what is known (this value is one a
 * common mix-up gives) and keeps the mathematics of the modelled explanation (the principle that gives the right answer). The modelled
 * explanation itself stays available to educators, labelled as a possibility (teacher-evidence@1).
 */
import { misconceptionOf, type Question } from "./content";

export const ANSWER_FEEDBACK = "answer-feedback@1" as const;
export const MIXUP_NOTE = "This answer is one that a common mix-up gives, so check each step.";

/** a clause that states what was done ("… was added", "… were taken as …") or the learner's state: an unobserved claim */
const CLAIM = /\b(was|were|is not yet reliable|are not yet reliable|looked)\b/i;

/** the mathematical principle(s) of a modelled explanation, without the clauses that say what the learner did */
export function principleOf(says: string): string | null {
  const clauses = says.split(/(?<=[.;:])\s+/).map((c) => c.trim()).filter(Boolean);
  // a clause that only refers back to a dropped claim ("They are not:", "It is …" right after it) goes with it
  const kept = clauses.filter((c, i) => !CLAIM.test(c) && !(i > 0 && CLAIM.test(clauses[i - 1]) && /^(they|it|this|that|these)\b/i.test(c)));
  if (!kept.length) return null;
  const text = kept.join(" ").replace(/[;:]$/, ".");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** the neutral feedback for a wrong answer that a modelled mix-up predicts; null when no modelled mix-up gives this answer */
export function answerFeedback(q: Question, raw: string): { note: string; principle: string | null } | null {
  const m = misconceptionOf(q, raw);
  if (!m) return null;
  return { note: MIXUP_NOTE, principle: principleOf(m.says) };
}
