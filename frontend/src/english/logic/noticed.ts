/**
 * "What OpenPath noticed" after an answer: what the engine actually did with it, in plain words for a child.
 * It is read from the ledger's own decision for that answer (accepted, held, after teaching, a repeat, a passage
 * already counted), never invented, and it never claims mastery from one answer.
 */
import type { Decision } from "../../../../packages/english-core/src/index.ts";
import type { AttemptEvent } from "./events.ts";
import type { AppState } from "./state.ts";

export interface Noticed {
  /** What kind of evidence the answer is. */
  kind: "independent" | "after_teaching" | "practice" | "help" | "repeat" | "same_passage" | "draft";
  title: string;
  text: string;
}

/** The most recent attempt in the open session, and the engine's decision on it. */
export function lastAnswer(s: AppState): { attempt: AttemptEvent; decision: Decision | null } | null {
  const attempt = [...s.events].reverse().find((e): e is AttemptEvent => e.kind === "attempt");
  if (!attempt) return null;
  const decision = attempt.evidence ? (s.ledger.decisions.find((d) => d.source === attempt.evidence && !!d.observation) ?? null) : null;
  return { attempt, decision };
}

export function noticedFor(s: AppState): Noticed | null {
  const last = lastAnswer(s);
  if (!last) return null;
  const { attempt, decision } = last;
  const right = attempt.correct;
  if (!attempt.evidence || attempt.assisted)
    return { kind: "help", title: "Practice with help", text: "Second tries and hints help you learn. They are kept as practice, not as evidence of what you can do on your own." };
  if (!decision) return { kind: "practice", title: "Practice", text: "This answer is kept as practice." };
  const o = decision.observation;
  if (decision.verdict === "held") {
    if (o?.samePassage) return { kind: "same_passage", title: "Same story as before", text: "OpenPath already counted an answer on this passage for this skill, so this one is kept for a teacher but not counted again." };
    if (decision.reasons.some((r) => r.includes("generated item"))) return { kind: "practice", title: "Practice word", text: "Practice words help your spelling plan. They do not change your level until they have been checked by a person." };
    if (decision.reasons.some((r) => r.includes("provisional"))) return { kind: "draft", title: "Draft question", text: "This question is still a draft, so it does not change your level." };
    return { kind: "help", title: "Practice with help", text: "This was practice with help, so it is not counted as evidence of what you can do on your own." };
  }
  if (o?.exposure === "repeat") return { kind: "repeat", title: "A question you have seen", text: "You have seen this question before, so it shows what you remember. It does not change your estimate." };
  if (o?.setting === "after_teaching")
    return {
      kind: "after_teaching",
      title: right ? "Improving straight after the lesson" : "Still learning this",
      text: right
        ? "Right just after a lesson shows you are improving. A fresh check later, on your own, will show whether it has stuck."
        : "Mistakes during practice are part of learning. They help OpenPath choose what comes next.",
    };
  return {
    kind: "independent",
    title: right ? "Answered on your own" : "One answer is not a verdict",
    text: right
      ? "You answered this on your own, so it counts as evidence. OpenPath needs several answers, on different days, before it says a skill is shown."
      : "This counts as one piece of evidence. OpenPath looks at patterns across several answers, never at one mistake.",
  };
}
