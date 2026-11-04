import type { Assessment } from "../assessment.ts";
import type { ServerDecision } from "../records.ts";
import { unifiedAuthoritative } from "./mode.ts";

/** What the learner is shown after an answer: the server's recorded decision. The app's own (unified) preview is shown only when the
 *  unified grader is authoritative and agrees; in shadow / legacy mode a differing preview is never shown (release check A). */
export function authoritativeView(a: Assessment | null, rec: ServerDecision | null): Assessment | null {
  if (!a) return a;
  if (!rec) return unifiedAuthoritative() ? a : { ...a, credit: null, evidence: { ...a.evidence, answerCorrect: null, unresolved: true }, feedback: { kind: "pending", message: "Your answer is saved. Its mark will appear in your record." }, clarification: null };
  const credit = rec.verdict === "correct" ? true : rec.verdict === "incorrect" ? false : null;
  if (credit === a.credit) return a;
  return {
    ...a, credit, recordAs: undefined,
    evidence: { ...a.evidence, answerCorrect: credit, unresolved: credit === null, firstError: credit === false ? a.evidence.firstError : null },
    feedback: credit === true ? { kind: "correct", message: "Correct." } : credit === false ? { kind: "incorrect", message: "Not quite." } : { kind: "pending", message: "This answer could not be checked automatically. It is saved and has not been marked wrong." },
    clarification: null,
  };
}
