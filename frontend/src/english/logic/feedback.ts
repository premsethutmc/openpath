/**
 * Feedback after every answer: right or wrong, the correct answer, and one short explanation tied to
 * the mistake where the answer shows one.
 */
import { type Item, type Response, scoreCode } from "../../../../packages/english-core/src/index.ts";
import { type AppContent, lessonId } from "./content.ts";

export interface Feedback {
  correct: boolean;
  /** The right answer, as the learner should see it. */
  answer: string;
  /** Why: the misconception the answer shows, the item's own explanation, or the lesson's rule. */
  explanation: string;
  misconceptions: string[];
  /** An American or other accepted spelling the learner used. */
  variantNote: string | null;
}

export function correctAnswer(item: Item): string {
  if (item.kind !== "code") return "";
  const kind = item.format.split(":")[0];
  if (kind === "choice") return item.options![item.answer!];
  if (kind === "typed") return item.answers![0];
  if (kind === "order") return item.answer_order!.map((i) => item.options![i]).join(" ");
  if (kind === "match") return item.left!.map((l, i) => `${l} → ${item.options![item.answer_pairs![i]]}`).join("; ");
  if (kind === "multi") return item.answer_set!.map((i) => item.options![i]).join(" and ");
  return "";
}

export function feedbackFor(c: AppContent, item: Item, response: Response): Feedback {
  if (item.kind !== "code") throw new Error("only code-scored items are offered");
  const { correct, misconceptions } = scoreCode(item, response);
  const misconceptionText = misconceptions.map((m) => c.feedback.get(`${item.target}#${m}`)).find(Boolean);
  const lesson = item.step ? c.lessons.get(lessonId(item.target, item.step)) : undefined;
  const explanation = (correct ? item.explain : misconceptionText ? `${misconceptionText}${item.explain ? ` ${item.explain}` : ""}` : item.explain) ?? lesson?.rule ?? "";
  let variantNote: string | null = null;
  if (correct && response.kind === "typed" && item.answers && item.answers.length > 1) {
    const typed = response.text.trim().toLowerCase();
    if (typed !== item.answers[0].toLowerCase()) variantNote = `"${response.text.trim()}" is also correct (another accepted spelling). OpenPath teaches British spelling: ${item.answers[0]}.`;
  }
  return { correct, answer: correctAnswer(item), explanation, misconceptions, variantNote };
}
