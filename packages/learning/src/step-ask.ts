/**
 * step-ask@1: a step of help the learner does themselves. Where a step ends in a result the line checker can judge
 * ("Bring the power down: 8 × 4 = 32", "At x = 3: −9 + 18 = 9", "∫ (−2x + 6) dx = −x² + 6x"), the result is left
 * out and asked for; what is typed is right when the line it completes is true (so 32, 32.0 and an equal expression
 * all count). A step with no such result is shown as before.
 */
import { checkWorkingLines } from "./line-check";

export interface StepAsk { /** the step up to and including its last "=" */ lead: string; /** the calculation the answer completes */ lhs: string; /** the step's own result */ value: string }

export function askOf(shown: string): StepAsk | null {
  const cut = shown.lastIndexOf("=");
  if (cut < 1) return null;
  const value = shown.slice(cut + 1).trim().replace(/\s*\+\s*C$/, "");
  const before = shown.slice(0, cut).trim();
  // the calculation is what follows the step's words ("…: 8 × 4") and any earlier "="
  const lhs = before.split(/:\s+/).pop()!.split("=").pop()!.trim();
  if (!value || value.length > 28 || !lhs || /,| so | which /.test(value)) return null;
  const ask = { lead: `${before} =`, lhs, value };
  return judge(ask, value) && !judge(ask, wrongFor(value)) ? ask : null;
}
/** A value that differs from the right one (to be sure the checker can tell them apart). */
const wrongFor = (v: string) => (/^[−-]?\d+(?:\.\d+)?$/.test(v) ? String(Number(v.replace("−", "-")) + 1) : `2(${v}) + 1`);
export function judge(ask: StepAsk, typed: string): boolean {
  const t = typed.trim().replace(/\s*\+\s*[cC]$/, "");
  if (!t) return false;
  const plus = /^∫/.test(ask.lhs) && !/ to |[₀-₉]|_/.test(ask.lhs) ? " + C" : "";
  return checkWorkingLines([`${ask.lhs} = ${t}${plus}`])[0].state === "right";
}
