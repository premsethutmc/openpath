/**
 * step-help@1: help at the step where a learner is stuck, from what the question already holds.
 *
 * Every generated question carries its verified working as steps, and each step names its operation and the skill it
 * leans on (for 120 ÷ 3: "40 × 3 = 120", multiply, "Use multiplication facts"). So for any question the engine can say, in
 * order and only as far as it is asked: what to do next (the operation, no numbers worked), which other skill that step
 * needs and that skill's own rule (a card), and then the step itself. Nothing is written per question and nothing is
 * fetched. A card is assembled from the skill's own lesson; `source` says how, so a person can review the thin ones.
 */
import { deepen } from "./deepen";
import { moduleFor } from "./content";
import { explainStep, problemOf } from "./families";
import { graph } from "./graph";

export interface Card {
  competency: string;
  name: string;
  /** The skill's own rule, in its lesson's words (one or two short paragraphs). */
  rule: string[];
  /** One worked example of the skill, from its lesson, when the lesson has a generated one. */
  example: { prompt: string; steps: string[]; answer: string } | null;
  /** Where the rule came from: the lesson's method section, its first teaching section, or its opening words. */
  source: "method" | "lesson" | "chapter";
}
export interface StepHelp {
  /** What to do, with no number worked: "Next: multiply." */
  next: string;
  /** The step itself, as the family explains it. */
  shown: string;
  /** The other skill this step leans on (null when it is the question's own skill). */
  needs: string | null;
  /** deepen@1: a line of the working inside one of the question's own steps (made by rule, not one of its steps). */
  finer?: true;
}

const short = (t: string) => t.trim().length > 0 && t.length <= 260;
const cards = new Map<string, Card | null>();
/** The help card of a skill, assembled from its own lesson; null when the skill has no lesson or no usable words. */
export function cardFor(competency: string): Card | null {
  if (cards.has(competency)) return cards.get(competency)!;
  let card: Card | null = null;
  try {
    const m = moduleFor(competency);
    if (m) {
      const screens = m.strategies.flatMap((s) => s.screens);
      const method = screens.find((x) => /^how to do it$/i.test(x.title ?? "") && x.text?.some(short));
      const lesson = screens.find((x) => x.text?.some(short));
      const chapter = m.chapter.find((x) => x.text?.some(short));
      const from = method ?? lesson ?? chapter;
      if (from) {
        const withExample = [...screens, ...m.chapter].find((x) => x.instance && problemOf(x.instance)?.steps.length);
        const p = withExample ? problemOf(withExample.instance!)! : null;
        card = {
          competency, name: graph.get(competency)?.name ?? m.title,
          rule: from.text.filter(short).slice(0, 2),
          example: p ? { prompt: p.prompt, steps: p.steps.map((s) => explainStep(p, s)), answer: p.answer } : null,
          source: method ? "method" : lesson ? "lesson" : "chapter",
        };
      }
    }
  } catch { card = null; }
  cards.set(competency, card);
  return card;
}

const NEXT: Record<string, string> = { note: "notice what the question gives you", evaluate: "work out the value", "choose the option": "pick the option that fits", read: "read it off the picture", write: "write it down in the form asked", recall: "remember the fact you need", check: "check it" };
/** The steps of a question as help, in order; null when it is not a generated question or has no steps. */
export function stepsHelp(qid: string): StepHelp[] | null {
  const p = problemOf(qid.replace(/:(mc|w)$/, ""));
  if (!p || !p.steps.length) return null;
  return p.steps.flatMap((s, i) => {
    const own: StepHelp = {
      next: `${i === 0 ? "First" : i === p.steps.length - 1 ? "Last" : "Next"}: ${NEXT[s.op] ?? s.op}.`,
      shown: explainStep(p, s),
      needs: s.competency !== p.competency && cardFor(s.competency) ? s.competency : null,
    };
    // deepen@1: the working inside the step, line by line, comes before the step itself (which then sums it up)
    const finer = deepen(own.shown);
    if (finer.length < 2) return [own];
    const lines: StepHelp[] = finer.map((f) => ({ next: f.next, shown: f.shown, needs: null, finer: true }));
    // an integral or a derivative is set up by the step and then worked; a calculation is worked and then stated
    return /∫|d\s*\/\s*d[a-z]/.test(own.shown) ? [own, ...lines] : [...lines, own];
  });
}
