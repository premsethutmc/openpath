/**
 * lesson-interactions@1: what a learner does in a worked example, made by rule from what the question already holds
 * (its steps, and the wrong answers learners give with the reason for each). Nothing is written per question.
 *
 *   spot the mistake "Someone answered 96. What went wrong?": the reason that predicts that answer is right, the
 *                    reason for another slip (and "nothing, it is right") are not
 *
 * (A "what would you do first?" question made from the kinds of step was tried and dropped: "Add" against "Convert"
 * says too little to be a fair choice.)
 * The working itself is done step by step with step-ask@1 (StepCoach). All of it is a lesson: nothing is recorded as
 * evidence, and none of it appears in a test.
 */
import { guessOf } from "./families";

export interface Choice { label: string; reply: string; right?: true }
export interface Asked { ask: string; choices: Choice[] }

const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/** A list turned by an amount fixed by the question's own text: the right choice is not always first. */
const turned = <T,>(xs: T[], by: number): T[] => xs.map((_, i) => xs[(i + by) % xs.length]);

/** A wrong answer learners give to this question, and what went wrong; null when the question predicts none. */
export function mistake(qid: string): Asked | null {
  const g = guessOf(qid);
  const wrong = g ? g.choices.filter((c) => !c.right) : [];
  if (!g || !wrong.length || wrong[0].reply.length > 200) return null;
  const pick = wrong[hash(qid) % wrong.length], other = wrong.find((w) => w !== pick && w.reply !== pick.reply);
  const choices: Choice[] = [
    { label: pick.reply, reply: "Yes, that is the slip.", right: true },
    ...(other ? [{ label: other.reply, reply: `That slip gives ${other.label}, not ${pick.label}.` }] : []),
    { label: "Nothing went wrong: that answer is right.", reply: `It is not right. ${pick.reply}` },
  ];
  return { ask: `Someone answered ${pick.label}. What went wrong?`, choices: turned(choices, hash(`${qid}:m`) % choices.length) };
}
