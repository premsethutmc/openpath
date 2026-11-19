/**
 * age@1: is a help written for the class it is shown to? Rules a machine can check on every question, so that fitness
 * for a child's age does not wait for a reviewer:
 *   long-sentence          a sentence of words longer than a child of that class reads comfortably
 *   long-word              a long word that is not a maths term taught by then
 *   term-not-yet-taught    a maths term whose own skill is first taught in a later class
 *   maths-not-yet-taught   negative numbers, decimals or algebra letters before the class that meets them
 *   number-too-big         working that passes through a number larger than that class handles
 *   too-many-steps         more steps than a child of that class should hold together
 * A number, a term or a kind of number the question itself uses is never held against the help. The limits are a
 * judgement (stated here, in one place, to be argued with), drawn from the order the CBSE, ICSE and Tamil Nadu
 * syllabuses introduce things. They say nothing about whether a particular child follows a step.
 */
import { TERMS } from "./terms";

export type AgeKind = "long-sentence" | "long-word" | "term-not-yet-taught" | "maths-not-yet-taught" | "number-too-big" | "too-many-steps";
export interface AgeFinding { kind: AgeKind; what: string }
export interface AgeLimits { words: number; letters: number; number: number; steps: number; negatives: boolean; decimals: boolean; letterSums: boolean }

/** What a class is taken to manage. Class 6 and above: the limits loosen and nothing is "not yet taught" by kind. */
export function limitsFor(cls: number): AgeLimits {
  const c = Math.max(1, Math.min(12, Math.round(cls)));
  return {
    words: c <= 2 ? 12 : c === 3 ? 15 : c <= 5 ? 20 : c <= 8 ? 26 : 34,
    letters: c <= 3 ? 10 : c <= 5 ? 12 : 99,
    number: c === 1 ? 999 : c === 2 ? 9_999 : c === 3 ? 99_999 : c === 4 ? 9_999_999 : Number.POSITIVE_INFINITY,
    steps: c <= 2 ? 5 : c === 3 ? 8 : c <= 5 ? 14 : 40,
    negatives: c >= 6, decimals: c >= 4, letterSums: c >= 6,
  };
}
/** Long words of school maths, with the class that first uses them: never a "long word" from that class on. */
const SCHOOL_WORDS: Record<string, number> = {
  subtraction: 1, subtracting: 1, altogether: 1, difference: 1, rectangle: 1, triangle: 1, rectangles: 1, triangles: 1, measuring: 1, centimetre: 2, centimetres: 2, millimetre: 3, millimetres: 3,
  multiplication: 2, multiplying: 2, multiplied: 2, kilometres: 3, kilograms: 2, millilitres: 3, quarters: 2, hundreds: 1, thousands: 2, anticlockwise: 3, clockwise: 3,
  denominator: 3, denominators: 3, numerator: 3, numerators: 3, perimeter: 3, remainder: 3, estimating: 3, equivalent: 4, perpendicular: 4, parallelogram: 5, quadrilateral: 4, quadrilaterals: 4,
  symmetrical: 4, percentage: 5, percentages: 5, temperature: 4, approximately: 5, circumference: 5, simplifying: 5, factorisation: 5, successor: 3, predecessor: 3, ascending: 2, descending: 2,
};
const TERM_RE = TERMS.map(([w, skill]) => [new RegExp(`(?<![A-Za-z])(?:${w})(?![A-Za-z])`, "i"), skill] as const);
const flat = (t: string) => t.replace(/(\d),(?=\d{2,3}\b)/g, "$1");

/**
 * @param cls        the class the question is first taught in
 * @param prompt     the question as asked (what it uses is allowed)
 * @param steps      the help: the cue and what is shown, in order
 * @param classOf    the first class a skill is taught in (null: unknown, never held against the help)
 */
export function ageFindings(cls: number, prompt: string, steps: readonly { next: string; shown: string }[], classOf: (skill: string) => number | null): AgeFinding[] {
  const L = limitsFor(cls), out: AgeFinding[] = [], seen = new Set<AgeKind>();
  const note = (kind: AgeKind, what: string) => { if (!seen.has(kind)) { seen.add(kind); out.push({ kind, what: what.slice(0, 180) }); } };
  const asked = flat(prompt), askedLower = asked.toLowerCase();
  // a question that itself asks about large numbers sets its own scale: ten times its largest number is allowed
  const top = Math.max(0, ...(asked.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  if (steps.length > L.steps) note("too-many-steps", `${steps.length} steps (Class ${cls}: at most ${L.steps})`);
  for (const s of steps) {
    const text = flat(`${s.next} ${s.shown}`);
    for (const sentence of text.split(/(?<=[.?!;:])\s+/)) {
      const words = sentence.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
      if (words.length > L.words) note("long-sentence", `${words.length} words: "${sentence.trim()}"`);
      for (const w of words) if (!w.includes("-") && w.length > L.letters && !askedLower.includes(w.toLowerCase()) && (SCHOOL_WORDS[w.toLowerCase()] ?? 99) > cls && !TERM_RE.some(([re]) => re.test(w))) note("long-word", `"${w}" in "${sentence.trim().slice(0, 90)}"`);
    }
    for (const [re, skill] of TERM_RE) {
      const m = re.exec(text), at = m && classOf(skill);
      if (m && at !== null && at > cls && !re.test(asked)) note("term-not-yet-taught", `"${m[0]}" (taught in Class ${at}) in "${text.trim().slice(0, 90)}"`);
    }
    if (!L.negatives && /(^|[\s(=×÷+])[−-]\d/.test(text) && !/(^|[\s(=×÷+])[−-]\d|negative|below zero/.test(asked)) note("maths-not-yet-taught", `a negative number in "${text.trim().slice(0, 90)}"`);
    if (!L.decimals && /\d\.\d/.test(text) && !/\d\.\d|₹|rupee|paise/i.test(asked)) note("maths-not-yet-taught", `a decimal in "${text.trim().slice(0, 90)}"`);
    if (!L.letterSums && /(^|[\s(])[xyzn] ?[=+×÷−] ?\d|\d[xyzn]\b/.test(text) && !/(^|[\s(])[xyzn] ?[=+×÷−]|\d[xyzn]\b/.test(asked)) note("maths-not-yet-taught", `a letter standing for a number in "${text.trim().slice(0, 90)}"`);
    for (const n of text.match(/\d+(?:\.\d+)?/g) ?? []) if (Number(n) > Math.max(L.number, 10 * top) && !asked.includes(n)) note("number-too-big", `${n} (Class ${cls}: up to ${L.number}) in "${text.trim().slice(0, 90)}"`);
  }
  return out;
}
