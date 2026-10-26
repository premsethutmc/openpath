// Thin adapter between the learning engine and the verified mathematics core. It adds no new reasoning: it calls the existing
// `evaluateWorking` (whole working) and `verifyStep`'s verifier (one step) and reports the result with an EXPLICIT outcome.
//
// Engine contract kept: a written answer is marked by an educator, never by the computer (content.ts: needsMarking / MARKED_RIGHT). So the
// result here is ADVISORY evidence for the educator and the diagnostic; this module never produces MARKED_RIGHT and never writes a record.
// Outcomes are never merged: verified | invalid | ambiguous | unsupported | incomplete. A refusal (ambiguous, unsupported) is not a wrong answer
// and not a right answer: `correct` is null for it, `true` only for "verified", `false` only for "invalid".
import { evaluateWorking, normalizeLine, type Line, type WorkingEvaluation, type WorkingStep } from "./student.ts";
import * as V from "../reasoner/verifier/verifier.ts";
import { Refusal } from "../reasoner/outcomes.ts";
import { isExactNumberProblem, assessNumberWorking, verifyNumberStep, type NumberAssessment, type NumberOptions } from "./number/index.ts";
import { isSymbolicProblem, assessSymbolicWorking, verifySymbolicStep, SYM_SKILLS, type SymbolicAssessment, type SymbolicOptions, type SymForm, type SymSkillId } from "./symbolic.ts";
import { SKILLS } from "./number/index.ts";
import { inputWithinLimits, bounded, budgetTripped } from "./budget.ts";
import { isMvProblem, assessMultivariateWorking, verifyMultivariateStep, type MvAssessment } from "./multivariate/index.ts";
export type { MvAssessment, NumberAssessment, NumberOptions, SymbolicAssessment, SymbolicOptions };
/** Options for either engine: `form` and `requiredSkills` are read by whichever engine takes the problem (ids unknown to it are ignored); `requireDomain` is for expression problems. */
export interface WorkingOptions { form?: NumberOptions["form"] | SymForm; requiredSkills?: (NonNullable<NumberOptions["requiredSkills"]>[number] | SymSkillId)[]; requireDomain?: boolean }
const numOpts = (o: WorkingOptions): NumberOptions => ({ form: o.form as NumberOptions["form"], requiredSkills: o.requiredSkills?.filter((s) => s in SKILLS) as NumberOptions["requiredSkills"] });
const symOpts = (o: WorkingOptions): SymbolicOptions => ({ form: typeof o.form === "string" && ["any", "expanded", "collected", "factorised", "simplest", "lowest-terms"].includes(o.form) ? (o.form as SymForm) : undefined, requiredSkills: o.requiredSkills?.filter((s) => s in SYM_SKILLS) as SymbolicOptions["requiredSkills"], requireDomain: o.requireDomain });

export type Outcome = "verified" | "invalid" | "ambiguous" | "unsupported" | "incomplete";
export type Correctness = true | false | null;
export const correctnessOf = (o: Outcome): Correctness => (o === "verified" ? true : o === "invalid" ? false : null);

export interface WorkingAssessment {
  outcome: Outcome; correct: Correctness; advisory: true;
  firstInvalidStep: number | null; invalidAt: "step" | "final-claim" | null;
  finalClaim?: { claim: string; verdict: "correct" | "incorrect" | "n/a"; explanation: string };
  steps: { index: number; from: string; to: string; status: WorkingStep["status"]; explanation: string }[];
  causes: string[];                    // candidate misconceptions for the first invalid step: candidates, not findings
  summary: string;
  /** present when the problem was handled by the exact-number engine: errors, final-answer form and skill demonstration (kept apart from correctness) */
  number?: NumberAssessment;
  /** present when the problem was handled by the symbolic-algebra engine: relation kind per step, causes, form, skills and domain obligations (all kept apart from correctness) */
  symbolic?: SymbolicAssessment;
  /** present for expressions in several letters / symbolic parameters / symbolic exponents (same four separate judgements) */
  multivariate?: MvAssessment;
  /** true when the answer is `unsupported` because an input-size or computation limit was reached (never a verdict about the student's working) */
  resourceLimit?: boolean;
}
const OUTCOME: Record<WorkingEvaluation["status"], Outcome> = { "valid-complete": "verified", "valid-incomplete": "incomplete", invalid: "invalid", ambiguous: "ambiguous", unsupported: "unsupported" };

/** Assess a whole working (problem + the student's lines). Never throws on bad input: an unreadable problem is `unsupported`. */
export function assessWorking(problem: string, lines: Line[], opts: WorkingOptions = {}): WorkingAssessment {
  if (!inputWithinLimits(problem, lines.map((l) => (typeof l === "string" ? l : l.eq)))) return { outcome: "unsupported", correct: null, advisory: true, firstInvalidStep: null, invalidAt: null, steps: [], causes: [], summary: "not assessed: the working exceeds the size limits (unsupported, not wrong)", resourceLimit: true };
  return bounded(() => assessWorkingBounded(problem, lines, opts));
}
function assessWorkingBounded(problem: string, lines: Line[], opts: WorkingOptions): WorkingAssessment {
  let r: WorkingAssessment;
  try { r = assessWorkingInner(problem, lines, opts); }
  catch (e) { if (e instanceof Refusal && e.code === "SEARCH_LIMIT") return { outcome: "unsupported", correct: null, advisory: true, firstInvalidStep: null, invalidAt: null, steps: [], causes: [], summary: "not assessed: a computation limit was reached (unsupported, not wrong)", resourceLimit: true }; throw e; }
  // if the limit was hit anywhere (even inside a check that swallows refusals, e.g. the form or skill check), nothing from this run is trusted
  return budgetTripped() ? { outcome: "unsupported", correct: null, advisory: true, firstInvalidStep: null, invalidAt: null, steps: [], causes: [], summary: "not assessed: a computation limit was reached (unsupported, not wrong)", resourceLimit: true } : r;
}
function assessWorkingInner(problem: string, lines: Line[], opts: WorkingOptions): WorkingAssessment {
  if (isExactNumberProblem(problem)) {
    const a = assessNumberWorking(problem, lines.map((l) => (typeof l === "string" ? l : l.eq)), numOpts(opts));
    return { outcome: a.outcome, correct: a.correct, advisory: true, firstInvalidStep: a.firstInvalidStep, invalidAt: a.firstInvalidStep === null ? null : "step",
      steps: a.steps.map((s) => ({ index: s.index, from: s.from, to: s.to, status: (s.status === "ambiguous" ? "unsupported" : s.status) as WorkingStep["status"], explanation: s.explanation })),
      causes: a.errors.map((m) => m.label), summary: a.summary, number: a };
  }
  const probLetter = isSymbolicProblem(problem) ? (problem.replace(/^\s*(?:expand|factori[sz]e|factor|simplify|collect)\b/i, "").match(/[a-zA-Z]/g) ?? [])[0] : undefined;
  const strayLetters = probLetter !== undefined && lines.some((l) => ((typeof l === "string" ? l : l.eq).replace(/\b(?:and|for|where|when|provided|if|with)\b/gi, " ").match(/[a-zA-Z]/g) ?? []).some((c) => c !== probLetter));
  if (isSymbolicProblem(problem) && !strayLetters) {
    const a = assessSymbolicWorking(problem, lines.map((l) => (typeof l === "string" ? l : l.eq)), symOpts(opts));
    return { outcome: a.outcome, correct: a.correct, advisory: true, firstInvalidStep: a.firstInvalidStep, invalidAt: a.firstInvalidStep === null ? null : "step",
      steps: a.steps.map((s) => ({ index: s.index, from: s.from, to: s.to, status: (s.status === "ambiguous" ? "unsupported" : s.status) as WorkingStep["status"], explanation: s.explanation })),
      causes: a.errors.map((m) => m.label), summary: a.summary, symbolic: a };
  }
  if (isMvProblem(problem) || strayLetters) {
    const a = assessMultivariateWorking(problem, lines.map((l) => (typeof l === "string" ? l : l.eq)), { ...symOpts(opts), anyLetters: true });
    return { outcome: a.outcome, correct: a.correct, advisory: true, firstInvalidStep: a.firstInvalidStep, invalidAt: a.firstInvalidStep === null ? null : "step",
      steps: a.steps.map((s) => ({ index: s.index, from: s.from, to: s.to, status: (s.status === "ambiguous" ? "unsupported" : s.status) as WorkingStep["status"], explanation: s.explanation })),
      causes: a.errors.map((m) => m.label), summary: a.summary, multivariate: a };
  }
  let e: WorkingEvaluation;
  try { e = evaluateWorking(problem, lines, { route: false, engine: false }); }
  catch (err) { return { outcome: "unsupported", correct: null, advisory: true, firstInvalidStep: null, invalidAt: null, steps: [], causes: [], summary: `not assessed: ${err instanceof Refusal ? err.code : "internal error"}` }; }
  const outcome = OUTCOME[e.status];
  const bad = e.steps.find((s) => s.status === "invalid");
  return { outcome, correct: correctnessOf(outcome), advisory: true, firstInvalidStep: e.firstInvalid, invalidAt: e.invalidAt, finalClaim: e.final,
    steps: e.steps.map((s) => ({ index: s.index, from: s.from, to: s.to, status: s.status, explanation: s.explanation })),
    causes: (bad?.misconceptions ?? []).map((m) => m.label), summary: e.summary };
}

export type StepEffect = "equivalence" | "implication" | "invalid-loss" | "invalid";
export interface StepVerdict { outcome: "verified" | "invalid" | "unsupported"; effect: StepEffect | null; correct: Correctness; detail: string }
/** One step, in the context of the ORIGINAL problem. `verified` + effect "implication" means every old solution is kept but candidates were gained (an obligation). */
export function verifyWorkingStep(problem: string, from: string, to: string): StepVerdict {
  try { return bounded(() => verifyWorkingStepInner(problem, from, to)); }
  catch (e) { if (e instanceof Refusal && e.code === "SEARCH_LIMIT") return { outcome: "unsupported", effect: null, correct: null, detail: "a computation limit was reached (unsupported, not wrong)" }; throw e; }
}
function verifyWorkingStepInner(problem: string, from: string, to: string): StepVerdict {
  if (isExactNumberProblem(problem)) { const r = verifyNumberStep(problem, from, to); return { outcome: r.outcome, effect: r.outcome === "verified" ? "equivalence" : r.outcome === "invalid" ? "invalid" : null, correct: r.correct, detail: r.detail + (r.errors.length ? ` (possible cause: ${r.errors.map((e) => e.label).join("; ")})` : "") }; }
  if (isSymbolicProblem(problem)) { const r = verifySymbolicStep(problem, from, to); return { outcome: r.outcome, effect: r.outcome === "verified" ? (r.effect === "invalid" ? "equivalence" : r.effect) : r.outcome === "invalid" ? "invalid" : null, correct: r.correct, detail: r.detail + (r.errors.length ? ` (possible cause: ${r.errors.map((e) => e.label).join("; ")})` : "") }; }
  if (isMvProblem(problem)) { const r = verifyMultivariateStep(problem, from, to); return { outcome: r.outcome, effect: r.outcome === "verified" ? (r.effect === "invalid" ? "equivalence" : r.effect) : r.outcome === "invalid" ? "invalid" : null, correct: r.correct, detail: r.detail + (r.errors.length ? ` (possible cause: ${r.errors.map((e) => e.label).join("; ")})` : "") }; }
  try {
    const n = (t: string) => normalizeLine(t, false);   // the same reading of student notation as assessWorking (a/2x is not guessed here: use assessWorking for ambiguity)
    const r = V.relateLines(n(from), n(to), n(problem));
    if ("refusal" in r) return { outcome: "unsupported", effect: null, correct: null, detail: `cannot be analysed exactly (${r.refusal})` };
    if (r.relation === "equivalent") return { outcome: "verified", effect: "equivalence", correct: true, detail: "same solutions on the original domain" };
    if (r.relation === "gain") return { outcome: "verified", effect: "implication", correct: true, detail: "keeps every solution but admits new candidates: an obligation to check them in the original equation" };
    return { outcome: "invalid", effect: r.relation === "loss" ? "invalid-loss" : "invalid", correct: false, detail: r.relation === "loss" ? "a solution of the previous line is lost (discarding earlier extra candidates needs the whole working: use assessWorking)" : "the solution set changed in both directions" };
  } catch (err) { return { outcome: "unsupported", effect: null, correct: null, detail: err instanceof Refusal ? err.code : "internal error" }; }
}
