/**
 * step-ask@1: a step of help the learner does themselves. Where a step ends in a result the line checker can judge
 * ("Bring the power down: 8 × 4 = 32", "At x = 3: −9 + 18 = 9", "∫ (−2x + 6) dx = −x² + 6x"), the result is left
 * out and asked for; what is typed is right when the line it completes is true (so 32, 32.0 and an equal expression
 * all count). A step with no such result is shown as before.
 */
import { checkWorkingLines } from "./line-check";

export interface StepAsk { /** the step up to and including its last "=" */ lead: string; /** the calculation the answer completes */ lhs: string; /** the step's own result */ value: string; /** the unit after the result ("cm", "square units"), shown after the box */ unit?: string }

export function askOf(shown: string): StepAsk | null {
  const cut = shown.lastIndexOf("=");
  if (cut < 1) return null;
  const value = shown.slice(cut + 1).trim().replace(/\s*\+\s*C$/, "");
  const before = shown.slice(0, cut).trim();
  // the calculation is what follows the step's words ("…: 8 × 4") and any earlier "="
  const lhs = before.split(/:\s+/).pop()!.split("=").pop()!.trim();
  if (!value || value.length > 28 || !lhs || /, | so | which /.test(value)) return null;
  const fair = (a: StepAsk) => judge(a, a.value) && !judge(a, wrongFor(a.value));
  const ask: StepAsk = { lead: `${before} =`, lhs, value };
  if (fair(ask)) return ask;
  // a result with its unit ("48 cm", "₹45", "9 square units"): the number is entered, the unit stays on the page
  const u = value.match(/^(₹\s*)?([−\-]?[\d.,/]+)\s*([a-zA-Z°%][a-zA-Z²³ ]{0,16})?$/);
  if (!u || (!u[1] && !u[3])) return null;
  const withUnit: StepAsk = { lead: `${before} =${u[1] ? " ₹" : ""}`, lhs: lhs.replace(/₹\s*/g, ""), value: u[2], ...(u[3] ? { unit: u[3].trim() } : {}) };
  return fair(withUnit) ? withUnit : null;
}
/** A value that differs from the right one (to be sure the checker can tell them apart). */
const wrongFor = (v: string) => (/^[−-]?\d+(?:\.\d+)?$/.test(v) ? String(Number(v.replace("−", "-")) + 1) : `2(${v}) + 1`);
export function judge(ask: StepAsk, typed: string): boolean {
  // a step whose answer is a word (yes or no: "does G fold onto itself?") is right when the same word is typed
  if (ask.lhs === ask.value && /^[a-z]+$/i.test(ask.value)) return typed.trim().toLowerCase() === ask.value.toLowerCase() || (ask.value === "yes" && /^y$/i.test(typed.trim())) || (ask.value === "no" && /^n$/i.test(typed.trim()));
  // commas inside a number (1,234 or 12,34,567) are how it is written, not part of the calculation
  const bare = (x: string) => x.replace(/(\d),(?=\d)/g, "$1");
  const t = bare(typed.trim().replace(/\s*\+\s*[cC]$/, "").replace(/^₹\s*/, ""));
  if (!t) return false;
  const plus = /^∫/.test(ask.lhs) && !/ to |[₀-₉]|_/.test(ask.lhs) ? " + C" : "";
  return checkWorkingLines([`${bare(ask.lhs)} = ${t}${plus}`])[0].state === "right";
}
