/**
 * number-band@1: the class a Class 1–3 question belongs to, from the size of its numbers, so a young learner is only
 * asked numbers their class works with. The limits are the boards' own (CBSE, ICSE, Tamil Nadu books):
 *   Class 1: numbers up to 99, a pattern grows by 1 or 2;   Class 2: up to 999, grows by up to 10;   Class 3: up to 9,999.
 * A question above Class 3's limit belongs to Class 4. It applies to a family that does not give its own grade, of a
 * skill first taught in Class 1–3; the engine already never asks a question from a later class (level@1). Years and
 * dates are not amounts and are not counted (a calendar question about 2026 is a Class 1 question).
 */
import type { Problem } from "./family-kit";

export const BAND_MAX = [99, 999, 9999] as const;
export const BAND_STEP = [2, 10, Infinity] as const;

const DATED = /\b(January|February|March|April|May|June|July|August|September|October|November|December|calendar|year|born|date)\b/i;
type Asked = Pick<Problem, "prompt" | "answer"> & { figure?: unknown };
/** The rows of numbers a question shows in a table (a growing pattern's steps and dots), each as one line. */
const tableLines = (pr: Asked): string[] => {
  const f = pr.figure as { type?: string; rows?: unknown[][] } | undefined;
  return f?.type === "table" && Array.isArray(f.rows) ? f.rows.map((r) => r.join(" ")) : [];
};
/** The amounts a learner reads and writes in the question: its words, its table and its answer (years left out on a
 * dated question). */
export function amountsOf(pr: Asked): number[] {
  const text = [pr.prompt, ...tableLines(pr), String(pr.answer ?? "")].join(" ").replace(/(\d),(?=\d{3}\b)/g, "$1");
  const all = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return DATED.test(pr.prompt) ? all.filter((n) => !(n >= 1900 && n <= 2100)) : all;
}
/** How much a pattern in the question grows each time: a run of at least three numbers going up (or down) by the same amount. */
export function patternStep(pr: Asked): number | null {
  let best: number | null = null;
  for (const line of [pr.prompt, ...tableLines(pr)]) {
    const ns = (line.match(/\d+/g) ?? []).map(Number);
    for (let i = 0; i + 2 < ns.length; i++) {
      const d = ns[i + 1] - ns[i];
      if (d !== 0 && ns[i + 2] - ns[i + 1] === d) best = Math.max(best ?? 0, Math.abs(d));
    }
  }
  return best;
}
/** The class of a question of a skill first taught in class `first` (1–3): the first class from `first` whose limits hold. */
export function bandClass(first: number, pr: Asked, step: number | null = patternStep(pr)): number {
  const big = Math.max(0, ...amountsOf(pr).map(Math.abs));
  for (let c = first; c <= 3; c++) if (big <= BAND_MAX[c - 1] && (step === null || step <= BAND_STEP[c - 1])) return c;
  return 4;
}
