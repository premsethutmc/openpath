/**
 * Scripted LEARNERS for the Milestone 2 scenario suite. Only learner actions are scripted here: what the learner types, whether they ask for a
 * hint, whether they take a retry. Every grade, record, decision and screen comes from the real components (flow.ts / session.ts).
 * The models are general (by behaviour, never by question id): they read the question's own answer, options and modelled misconceptions.
 */
import { question } from "../../../packages/learning/src/content";
import { problemOf } from "../../../packages/learning/src/families";
import { bugValue, respond, slip } from "../learning/adaptive-journey";
import { gradeRequest } from "../../../packages/learning/src/server-grader";
import { graph } from "../../../packages/learning/src/graph";

export interface LearnerView { q: string; phase: string; activity: string; taught: number; answered: number; hintShown: boolean; hintAsked: boolean; session: string; retentionFails: number; taughtSkills: string[] }
export type Action = { answer: string; working?: string[] } | { hint: true } ;
export interface Learner { name: string; act: (v: LearnerView) => Action; retry?: (v: LearnerView) => boolean }

export const right = (q: string) => question(q).answer;
/** a readable wrong answer of the right shape (never a modelled misconception's value when avoidable) */
export const wrong = (q: string) => {
  // the learner's slip, else another plausible readable answer; the grader is asked only to keep the SCRIPT honest (a "wrong" answer that is
  // unreadable would test a different behaviour). The run itself grades every answer again through the flow.
  const cands: string[] = [];
  try { cands.push(slip(q)); } catch { /* no numeric slip */ }
  const o = question(q).options;
  if (o?.length) cands.push(...["A", "B", "C", "D"].filter((x) => x !== right(q)));
  cands.push("0", "1", "-1", "2", "x = 0");
  // an unexplained slip: never the answer a modelled misconception predicts (that would be evidence of the misconception, not a slip)
  const modelled = new Set((problemOf(q)?.bugs ?? []).map((b) => misconception(q, new Set([b.id]))).filter((x): x is string => x !== null));
  const readable = cands.filter((c) => gradeRequest({ id: q, response: c }).verdict === "incorrect");
  return readable.find((c) => !modelled.has(c)) ?? readable[0] ?? cands[0];
};
/** the answer a modelled misconception predicts for this question, or null when it predicts nothing here */
export const misconception = (q: string, ids: Set<string>) => { const v = bugValue(problemOf(q), ids); return v === null ? null : respond(q, v as string | number); };
// typeable in the renderer's numeric input (letters are stripped there) but unreadable to the grader
export const UNREADABLE = "1..2";
const skillOf = (q: string) => graph.evidenceTarget(question(q).competency);

const L = (name: string, act: Learner["act"], retry?: Learner["retry"]): Learner => ({ name, act, ...(retry ? { retry } : {}) });

export const learners = {
  /** strong, with exactly one slip at the k-th answer (in the given session, "any" = first session) */
  oneSlip: (k: number) => L(`strong, one slip at answer ${k}`, (v) => ({ answer: v.answered === k - 1 ? wrong(v.q) : right(v.q) })),
  /** strong, with one slip on the first delayed (retention) check */
  slipOnRetention: () => L("strong, slips once on the delayed check", (v) => ({ answer: v.phase === "retention" && v.retentionFails === 0 ? wrong(v.q) : right(v.q) })),
  /** makes the modelled error wherever it applies until `untilTaught` explanations have been delivered (Infinity: never learns); right otherwise */
  misconception: (ids: string[], untilTaught = 1, elsewhere: "right" | "wrong" = "right") => L(`misconception ${ids.join("+")} until ${untilTaught === Infinity ? "never" : untilTaught} explanation(s)`, (v) => {
    if (v.taught >= untilTaught) return { answer: right(v.q) };
    return { answer: misconception(v.q, new Set(ids)) ?? (elsewhere === "right" ? right(v.q) : wrong(v.q)) };
  }),
  /** never right: readable wrong answers only */
  alwaysWrong: () => L("always wrong (readable)", (v) => ({ answer: wrong(v.q) })),
  /** types something that cannot be read */
  unreadable: (times = Infinity) => L(`unreadable ${times === Infinity ? "always" : `${times} time(s), then right`}`, (v) => ({ answer: v.answered < times ? UNREADABLE : right(v.q) })),
  /** right only when a hint has been shown; asks for a hint whenever one is offered */
  onlyWithHints: () => L("right only after a hint", (v) => (!v.hintAsked ? { hint: true } : { answer: v.hintShown ? right(v.q) : wrong(v.q) })),
  /** uses the hint in guided practice, and is right on their own after teaching */
  hintThenIndependent: () => L("hint in guided practice, then right alone", (v) => (v.activity === "guided" && !v.hintAsked ? { hint: true } : { answer: v.taught > 0 || v.activity !== "check" ? right(v.q) : wrong(v.q) })),
  /** asks for a hint even where none is offered (independent work), then answers right */
  hintSeeker: () => L("asks for hints everywhere", (v) => (!v.hintAsked ? { hint: true } : { answer: right(v.q) })),
  /** uses a hint, but is still wrong */
  hintButWrong: () => L("hint, still wrong", (v) => (v.activity === "guided" && !v.hintAsked ? { hint: true } : { answer: v.taught > 1 ? right(v.q) : wrong(v.q) })),
  /** learnt after teaching, but slips on the first independent check, then right */
  learnsButSlipsCheck: (ids: string[]) => { let slipped = false; return L(`misconception ${ids.join("+")}, slips the first check after teaching`, (v) => {
    if (v.taught === 0) return { answer: misconception(v.q, new Set(ids)) ?? right(v.q) };
    if (v.activity === "check" && !slipped) { slipped = true; return { answer: wrong(v.q) }; }
    return { answer: right(v.q) };
  }); },
  /** right in guided practice (help available) but wrong on independent checks */
  guidedOnly: () => L("right with help, wrong alone", (v) => ({ answer: v.activity === "guided" ? right(v.q) : wrong(v.q) })),
  /** takes every retry the app offers, wrong each time (bounded by bounded-retry@1) */
  retriesWrong: (ids: string[]) => L(`misconception ${ids.join("+")}, retries every time`, (v) => ({ answer: v.taught ? right(v.q) : (misconception(v.q, new Set(ids)) ?? wrong(v.q)) }), () => true),
  /** wrong first, right on the retry */
  rightOnRetry: () => { const seen = new Set<string>(); return L("wrong first, right on the retry", (v) => { const first = !seen.has(v.q); seen.add(v.q); return { answer: first && v.answered < 3 ? wrong(v.q) : right(v.q) }; }, () => true); },
  /** lacks a prerequisite skill: wrong on that skill's own questions, and makes its modelled errors where they show, until that skill has been
   *  taught; right on everything else */
  lacksSkill: (skill: string, ids: string[]) => L(`lacks ${skill.split(".").pop()} (${ids.join("+")}) until it is taught`, (v) => {
    if (v.taughtSkills.includes(skill)) return { answer: right(v.q) };
    if (skillOf(v.q) === skill) return { answer: misconception(v.q, new Set(ids)) ?? wrong(v.q) };
    return { answer: misconception(v.q, new Set(ids)) ?? right(v.q) };
  }),
  /** strong learner: always right */
  strong: () => L("strong (always right)", (v) => ({ answer: right(v.q) })),
} as const;
