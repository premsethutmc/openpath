/**
 * The accepted answer syntax, as examples the learner interface shows ("how to type it"). Every example here is checked by
 * grading/parse.test.ts to parse exactly as stated, and every "not accepted" example to be rejected or sent back for clarification,
 * so what the learner is told is what the parser does.
 */
import type { Semantics, SemanticsKind } from "./parse.ts";

export interface SyntaxGuide { kind: SemanticsKind; accepted: string[]; mixedOnly?: string[]; notAccepted: { text: string; why: string }[] }
export const SYNTAX: SyntaxGuide[] = [
  { kind: "rational", accepted: ["7", "-3/4", "0.75", "+5", "1,23,456"], mixedOnly: ["2 1/2"], notAccepted: [{ text: "17714 7", why: "a space inside a number" }, { text: "12 +", why: "an operator with nothing after it" }, { text: "1/0", why: "division by zero" }] },
  { kind: "exact-real", accepted: ["3√2", "3sqrt(2)", "π/6", "pi/6", "2 + √5", "3√65/26"], notAccepted: [{ text: "√2 2", why: "a space inside a number" }, { text: "√2x", why: "write √(2x) or (√2)x" }] },
  { kind: "expression", accepted: ["x/2", "(1/2)x", "3x^2 - 2x + 1", "sin(2x)", "x cos(x)", "e^(3x)", "tan^-1(x/2)", "log|x|"], notAccepted: [{ text: "1/2x", why: "write (1/2)x or 1/(2x)" }, { text: "2^3x", why: "write 2^(3x) or (2^3)x" }, { text: "sin x/2", why: "write sin(x/2) or sin(x)/2" }, { text: "sec x tan x", why: "write sec(x)tan(x)" }] },
  { kind: "antiderivative", accepted: ["x^3 - 6cos(x) + C", "log|x + 4| + C", "(1/18)(3x - 4)^6 + C"], notAccepted: [{ text: "1/2x + C", why: "write (1/2)x or 1/(2x)" }] },
  { kind: "solution-set", accepted: ["-2, 12", "{-2, 12}", "x = -2 or x = 12"], notAccepted: [{ text: "-2 12", why: "separate the values with commas" }] },
  { kind: "roots", accepted: ["4 - √2, -5", "π/6, 7π/6"], notAccepted: [{ text: "π/6 7π/6", why: "separate the values with commas" }] },
  { kind: "tuple", accepted: ["(16, -8, -8)", "(-4, -7/2)", "1, 2, 3"], notAccepted: [{ text: "(2 7/10, 1)", why: "a space inside a number" }] },
  { kind: "matrix", accepted: ["[[1, 2], [3, 4]]", "[1, 2; 3, 4]"], notAccepted: [{ text: "[[1, 2], [3]]", why: "every row needs the same number of entries" }] },
  { kind: "real-subset", accepted: ["(-∞, 3]", "(-oo, 3]", "x <= 3", "(1, 2) ∪ [5, ∞)", "1 < x <= 5"], notAccepted: [{ text: "[-∞, 3]", why: "an interval cannot be closed at ∞" }, { text: "x < = 3", why: "write <= without a space" }] },
  { kind: "ratio", accepted: ["3 : 4", "3:4"], notAccepted: [{ text: "3/4", why: "a ratio is written with a colon" }] },
  { kind: "choice", accepted: ["B", "b"], notAccepted: [{ text: "B and C", why: "choose one option" }] },
];
export function examplesFor(s: Semantics): string[] {
  const g = SYNTAX.find((x) => x.kind === s.kind);
  return g ? [...g.accepted, ...(s.mixed ? g.mixedOnly ?? [] : [])] : [];
}
