/**
 * plain-answer@1: a child asked "How many birds are left?" often writes "7 birds". Where the question's answer is a
 * plain number and every word after the number is a thing the question itself names (not a unit of measure), the
 * number alone is what was meant, so it is read as the number. Nothing is guessed: a unit ("7 cm", "7 rupees") could
 * be the wrong unit, a word the question does not use could mean anything, and two numbers are two answers; all of
 * those are left exactly as typed for the checker to ask about.
 */
const UNITS = new Set(["mm", "cm", "m", "km", "metre", "meter", "centimetre", "centimeter", "millimetre", "kilometre", "kilometer", "inch", "foot", "feet", "g", "kg", "gram", "kilogram", "mg", "ml", "l", "litre", "liter", "millilitre", "rupee", "rs", "paise", "paisa", "second", "sec", "minute", "min", "hour", "hr", "day", "week", "month", "year", "degree", "percent", "square", "sq", "cubic", "unit", "time", "ten", "hundred", "thousand", "lakh", "crore", "million", "dozen", "half", "quarter", "third"]);
const single = (w: string) => w.toLowerCase().replace(/ies$/, "y").replace(/(ch|sh|x|s)es$/, "$1").replace(/s$/, "");
/** The answer to grade: the number alone when the rest only repeats the question's own things; otherwise as typed. */
export function plainAnswer(prompt: string, type: string, typed: string): string {
  if (type !== "integer" && type !== "decimal") return typed;
  const m = typed.trim().match(/^([-−]?\d+(?:\.\d+)?)\s+([A-Za-z][A-Za-z ]{0,40})\.?$/);
  if (!m) return typed;
  const named = new Set((prompt.match(/[A-Za-z]+/g) ?? []).map(single));
  const words = m[2].trim().split(/\s+/).map(single);
  return words.every((w) => w.length > 1 && named.has(w) && !UNITS.has(w)) ? m[1] : typed;
}
