/**
 * Drives the spelling journey through the app's own logic (the calls the screens make), for tests. A synthetic child is
 * a function from a word to what they type; it establishes software behaviour only, not educational effectiveness.
 */
import type { Learner } from "./learner.ts";
import type { JourneyWord } from "./content.ts";
import type { SpellingJourneyView } from "./spelling-journey.ts";

/** What a synthetic child types for a word, in a context ("question", "guided", "practice") and after `hints` hints. */
export type Child = (w: JourneyWord, ctx: { kind: "question" | "guided" | "practice"; hints: number; taught: Set<string> }) => string;

export interface Trace {
  steps: string[];
  explanations: { word: string; typed: string; kind: string; tag?: string }[];
  end: SpellingJourneyView;
}

/** Run one sitting until the summary (or `maxSteps`). Guided/practice words get up to 3 hints if wrong. */
export async function runSpelling(l: Learner, child: Child, maxSteps = 200, stopAfter?: number): Promise<Trace> {
  const steps: string[] = [];
  const explanations: Trace["explanations"] = [];
  const taught = new Set<string>();
  let v = await l.startSpellingJourney();
  for (let i = 0; i < maxSteps && v.step.kind !== "summary"; i++) {
    if (stopAfter !== undefined && steps.length >= stopAfter) break;
    const st = v.step;
    if (st.kind === "teach") {
      await l.teachSpellingJourney(v);
      taught.add(st.rule);
      steps.push(`teach:${st.rule}:${st.strategy.id}`);
    } else if (st.kind === "question") {
      const typed = child(st.word, { kind: "question", hints: 0, taught });
      const { feedback, explanation } = await l.answerSpellingJourney(v, { kind: "typed", text: typed });
      explanations.push({ word: st.word.word, typed, kind: explanation.kind, ...(explanation.tag ? { tag: explanation.tag } : {}) });
      steps.push(`${st.purpose}:${st.rule}:${st.word.kind}:${feedback.correct ? "right" : "wrong"}`);
    } else if (st.kind === "guided" || st.kind === "practice") {
      let hints = st.hints.length;
      let ok = false;
      for (let tries = 0; tries < 5 && !ok; tries++) {
        const typed = child(st.word, { kind: st.kind, hints, taught });
        const { feedback, explanation } = await l.answerSpellingJourney(v, { kind: "typed", text: typed });
        explanations.push({ word: st.word.word, typed, kind: explanation.kind, ...(explanation.tag ? { tag: explanation.tag } : {}) });
        ok = feedback.correct;
        if (!ok && hints < 3) {
          await l.hintSpellingJourney(v);
          hints++;
        } else if (!ok) break;
      }
      steps.push(`${st.kind}:${st.rule}:${ok ? "right" : "wrong"}:h${hints}`);
    }
    v = await l.spellingJourney();
  }
  return { steps, explanations, end: v };
}

/** The misspelling the rule predicts for the word (or a made-up wrong form). */
export const ruleError = (w: JourneyWord): string => Object.keys(w.wrong)[0] ?? `${w.base}${w.ending}x`;
