/**
 * step-check@1: recovery checks the exact operation a problem's step uses, not only the whole skill it belongs to.
 *
 *   operation tags   An arithmetic step (two numbers in, one number out) is tagged by the operation it really performs:
 *                    a product or quotient with a negative number is integer multiplication, a sum or difference with a
 *                    negative number (or a difference below zero) is integer addition, a product of two numbers up to 12
 *                    is a multiplication fact, a larger one is multi-digit multiplication, a whole-number quotient of two
 *                    numbers up to 12 is a fact, a larger one is long division. (4 × (−20) in b² − 4ac is not a times-table fact.)
 *                    Only steps already tagged with one of these arithmetic skills are retagged.
 *   operation keys   Within a support skill, the exact thing a step needs: the fact 7 × 8 (from 56 ÷ 7 too), or "a product
 *                    with one negative factor", or "subtracting a negative number".
 *   the check        When a problem is wrong and a skill it uses is already shown on the whole, that skill is skipped only
 *                    if the learner's latest answer alone on the step's own key (after the problem's first try) is right.
 *                    Otherwise one fresh question of that skill on that key is asked; two wrong on it alone (since the
 *                    problem's first try, or since the last lesson on the skill) is a gap: the skill is taught (another
 *                    explanation each time), then checked again on the key. A key no question can check is skipped, as before.
 */
import type { Attempt, LearnerRecords } from "./records";

export const IM = "MATH.number.integer-multiply";
export const IA = "MATH.number.integer-add";
export const MT = "MATH.number.multiplication-tables";
export const MMUL = "MATH.number.multi-multiplication";
export const LDIV = "MATH.number.long-division";
/** The arithmetic competencies whose step tags are set by the operation (operation-tags@1). */
export const ARITHMETIC = new Set([IM, IA, MT, MMUL, LDIV]);
export const STEP_CHECK = "step:";
export const stepCheckContext = (original: string) => `step-check:${original}`;

type Step = { op: string; competency: string; inputs: readonly unknown[]; value: unknown };
const nums = (s: Pick<Step, "inputs" | "value">): [number, number, number] | null =>
  s.inputs.length === 2 && s.inputs.every((x) => typeof x === "number" && Number.isFinite(x)) && typeof s.value === "number" ? [s.inputs[0] as number, s.inputs[1] as number, s.value] : null;
const RESULT: Record<string, (a: number, b: number) => number> = { multiply: (a, b) => a * b, divide: (a, b) => a / b, add: (a, b) => a + b, subtract: (a, b) => a - b };

/** operation-tags@1: the competency this arithmetic step exercises, from its operation and its numbers (null: not arithmetic). */
export function arithmeticTag(s: Pick<Step, "op" | "inputs" | "value">): string | null {
  const n = nums(s), f = RESULT[s.op];
  if (!n || !f || Math.abs(f(n[0], n[1]) - n[2]) > 1e-9) return null;
  const [a, b, v] = n;
  if (s.op === "multiply" || s.op === "divide") {
    if (a < 0 || b < 0) return IM;
    if (![a, b, v].every(Number.isInteger)) return null;
    if (s.op === "multiply") return a <= 12 && b <= 12 ? MT : MMUL;
    return b >= 1 && b <= 12 && v <= 12 ? MT : LDIV;
  }
  return a < 0 || b < 0 || (s.op === "subtract" && a < b) ? IA : null;
}
/**
 * operation-tags@1: a step tagged with an arithmetic competency carries the competency of the operation it really performs.
 * Steps tagged with the problem's own skill (the sign rule inside factorising, say) keep their tag for now: retagging them moves
 * whole recovery paths and is left to its own change.
 */
export function operationTagged<T extends Step>(steps: T[], own: string): T[] {
  return steps.map((s) => {
    const t = ARITHMETIC.has(s.competency) ? arithmeticTag(s) : null;
    return !t || t === s.competency || t === own ? s : { ...s, competency: t };
  });
}
/** step-check@1: the exact thing a step needs within its (arithmetic) skill. */
export function opKey(s: Step): string | null {
  const n = nums(s);
  if (!n || !RESULT[s.op]) return null;
  const [a, b, v] = n;
  if (s.competency === MT && (s.op === "multiply" || s.op === "divide")) { const [x, y] = s.op === "multiply" ? [a, b] : [b, v]; return `MT:${Math.min(x, y)}x${Math.max(x, y)}`; }
  if (s.competency === IM && (s.op === "multiply" || s.op === "divide")) return `IM:${s.op}:${(a < 0 ? 1 : 0) + (b < 0 ? 1 : 0)}`;
  if (s.competency === IA && (s.op === "add" || s.op === "subtract")) return `IA:${s.op}:${a < 0 ? "-" : "+"}${b < 0 ? "-" : "+"}`;
  return null;
}
/** A plain calculation in a prompt ("7 × 8 = ?", "(−13) × 9 = ?", "56 ÷ 7 = ?") read as one step of the question's skill. */
export function promptStep(prompt: string, competency: string): Step | null {
  const m = /^\s*\(?(−?\d+)\)?\s*([×÷])\s*\(?(−?\d+)\)?\s*=\s*\?/.exec(prompt);
  if (!m) return null;
  const a = Number(m[1].replace("−", "-")), b = Number(m[3].replace("−", "-"));
  const op = m[2] === "×" ? "multiply" : "divide";
  return { op, competency, inputs: [a, b], value: RESULT[op](a, b) };
}

export interface StepCheckDeps {
  /** the question's arithmetic steps (generated problems: their steps; authored: a plain calculation in the prompt) */
  stepsOf: (qid: string) => Step[];
  /** the skill a question is evidence for */
  targetOf: (qid: string) => string;
  /** the evidence target of a competency */
  target: (competency: string) => string;
  /** the support skill's own questions a check may ask, in the order they would be asked */
  candidates: (support: string) => readonly string[];
  /** a question may be asked now (fresh in either format, within the learner's grade, not quarantined) */
  askable: (qid: string) => boolean;
  independent: (a: Attempt) => boolean;
  right: (a: Attempt) => boolean;
}
const keyCache = new Map<string, Set<string>>();
export function keysOf(qid: string, d: Pick<StepCheckDeps, "stepsOf" | "target">): Set<string> {
  const id = qid.replace(/:(mc|w)$/, "");
  let k = keyCache.get(id);
  if (!k) { k = new Set(d.stepsOf(id).map((s) => opKey({ ...s, competency: d.target(s.competency) })).filter((x): x is string => !!x)); keyCache.set(id, k); }
  return k;
}
export type StepCheck = { key: string; question: string } | { key: string; gap: true; since: string } | null;
/**
 * step-check@1 for one support of one problem. null: nothing to check (no key, every key's latest answer alone is right, or no
 * question can check it). A question: ask it (fresh, on the key). A gap: two answers alone on the key wrong since the problem's
 * first try or since the last lesson on the support (or one, with no fresh question left to ask): teach the support.
 */
export function stepCheck(original: string, support: string, records: LearnerRecords, firstTryAt: string, d: StepCheckDeps): StepCheck {
  const keys = [...new Set(d.stepsOf(original.replace(/:(mc|w)$/, "")).filter((s) => d.target(s.competency) === support).map((s) => opKey({ ...s, competency: support })).filter((x): x is string => !!x))].slice(0, 2);
  if (!keys.length) return null;
  const lessonAt = records.teaching.filter((t) => d.target(t.competency) === support).map((t) => t.at).sort().at(-1) ?? "";
  for (const key of keys) {
    const on = records.attempts.filter((a) => a.at > firstTryAt && a.questionId !== original && d.independent(a) && d.targetOf(a.questionId) === support && keysOf(a.questionId, d).has(key));
    const latest = on.at(-1);
    if (latest && d.right(latest)) continue;
    const since = lessonAt > firstTryAt ? lessonAt : firstTryAt;
    const wrong = on.filter((a) => a.at > since && !d.right(a));
    if (wrong.length >= 2) return { key, gap: true, since: on.find((a) => !d.right(a))!.at };
    const q = d.candidates(support).find((id) => keysOf(id, d).has(key) && d.askable(id));
    if (q) return { key, question: q };
    if (wrong.length) return { key, gap: true, since: on.find((a) => !d.right(a))!.at };
  }
  return null;
}
