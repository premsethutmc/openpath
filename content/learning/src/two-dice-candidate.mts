/**
 * Candidate teaching for two-dice probability (TP-PRO-01, feat/math-teaching-content@4e655e73), for the existing module
 * MATH.probability.sample-space. PENDING EDUCATOR REVIEW: nothing here is approved, and it is NOT registered in
 * blueprints.v1.json (see docs/two-dice-probability/README.md: the library builder only lets a template extension scope a
 * strategy to the module's MAIN family (akss); these strategies are scoped to its pool family akdice).
 *
 * What it teaches: the 36 ordered pairs of two dice are equally likely, the totals are not. Total 2 has one pair, total 7 has
 * six, so P(7) = 6/36 and P(2) = 1/36. Two scoped GENERAL explanations (no claim about why a learner answered as they did):
 *   akdice_pairs  the 36 ordered pairs; totals 2 and 7 compared
 *   akdice_order  red die, blue die: (a, b) and (b, a) are different outcomes
 * Every number in the screens is computed from the instance (pairs listed by enumeration), never typed; the tests check that
 * the listed outcomes agree with the stored answer. Reused from the package: the explanation text, the counter-checks, the
 * guided items, the order-ignored recheck (6,6,0,3) and the corrected totals recheck of 4e655e73 (gen:akdice:4,5,0,5).
 * Scope: "the total is exactly k" (params[2] = 0) only, as the package states.
 */
import { explainStep, FAMILIES, problemOf, type Problem } from "../../../packages/learning/src/families";

export const COMPETENCY = "MATH.probability.sample-space";
export const FAMILY = "akdice";
export const SOURCE = "feat/math-teaching-content@4e655e737607bcf9d941193538de7479a40c4fe6 TP-PRO-01";

const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
/** every ordered pair (first, second) of an m-sided and an n-sided spinner or die whose total is k */
export const pairsWithTotal = (m: number, n: number, k: number) => {
  const out: [number, number][] = [];
  for (let a = 1; a <= m; a++) for (let b = 1; b <= n; b++) if (a + b === k) out.push([a, b]);
  return out;
};
/** the same pairs with (a, b) and (b, a) counted once: what a learner who ignores order counts */
export const unorderedWithTotal = (m: number, n: number, k: number) => pairsWithTotal(m, n, k).filter(([a, b]) => a <= b);
const list = (ps: [number, number][]) => ps.map(([a, b]) => `(${a}, ${b})`).join(", ");
const frac = (a: number, b: number) => { const g = (x: number, y: number): number => (y ? g(y, x % y) : x); const d = g(a, b); return d === b ? String(a / d) : `${a / d}/${b / d}`; };
const solved = (p: Problem) => [...p.steps.map((st) => explainStep(p, st)), `So the answer is ${p.answer}`];
const table = (p: Problem) => (FAMILIES.get(FAMILY) as unknown as { teach: { visual: (x: number[]) => Record<string, unknown> } }).teach.visual(p.params);
const sameNumbers = (m: number, n: number) => (m === n ? (m === 6 ? "two ordinary dice" : `two spinners, each numbered 1 to ${m}`) : `a spinner numbered 1 to ${m} and one numbered 1 to ${n}`);

export interface CandidateScreen { title: string; text: string[]; math: string[]; role: "strategy" | "concept"; instance: string; widget?: Record<string, unknown> }
export interface CandidateStrategy {
  id: string; title: string; kind: "conceptual"; needs: string[];
  scope: { family: string; parameters: { index: number; values: number[] }[] };
  screens: CandidateScreen[]; guided: string; check: string;
}

/**
 * General teaching (product owner's decision, 2026-11-04): the 36 ordered outcomes, and totals 2 and 7 compared, WITHOUT saying why a
 * learner answered as they did. Reworded from TP-PRO-01: its "what went wrong" screens are not used; the counting, the 7-against-2
 * comparison, the red/blue counter-check and the worked solutions are. No `addresses`: these are not misconception fixes.
 */
function pairsTotals(instance: string, guided: string, check: string): CandidateStrategy {
  const p = P(instance), [m, n, , k] = p.params, lo = 2, all = m * n, totals = m + n - 1;
  const seven = pairsWithTotal(m, n, k), two = pairsWithTotal(m, n, lo);
  return {
    id: "akdice_pairs", title: "Two dice: count the pairs", kind: "conceptual", needs: [],
    scope: { family: FAMILY, parameters: [{ index: 2, values: [0] }] },
    screens: [
      { title: `${all} ordered pairs, all equally likely`, role: "concept", instance, widget: table(p),
        text: [`With ${sameNumbers(m, n)} there are ${m} × ${n} = ${all} ordered pairs (first number, second number). Every cell of the table is one pair, and all ${all} pairs are equally likely.`,
          `There are ${totals} possible totals, ${lo} to ${m + n}, but they are not equally likely: a total is as likely as the number of pairs that make it.`],
        math: [`Total ${lo}: ${list(two)}, ${two.length} pair${two.length === 1 ? "" : "s"}, so P = ${frac(two.length, all)}`, `Total ${k}: ${list(seven)}, ${seven.length} pairs, so P = ${frac(seven.length, all)}`, `${seven.length} pairs against ${two.length}: a total of ${k} is ${seven.length / two.length} times as likely as a total of ${lo}.`] },
      { title: "Count the pairs: solved step by step", role: "strategy", instance, text: ["List the pairs that give the total, count them, and divide by the number of all pairs."], math: solved(p) },
    ],
    guided, check,
  };
}
/** ordered outcomes: (a, b) and (b, a) are different rolls (colour one die red, the other blue) */
function orderedOutcomes(instance: string, guided: string, check: string): CandidateStrategy {
  const p = P(instance), [m, n, , k] = p.params, ordered = pairsWithTotal(m, n, k), once = unorderedWithTotal(m, n, k);
  const [a, b] = once.find(([x, y]) => x !== y) ?? once[0];
  return {
    id: "akdice_order", title: "Red die, blue die: every order counts", kind: "conceptual", needs: [],
    scope: { family: FAMILY, parameters: [{ index: 2, values: [0] }] },
    screens: [
      { title: "Every order is its own outcome", role: "concept", instance, widget: table(p),
        text: [`Colour the first die red and the second blue: red ${a} with blue ${b} is a different roll from red ${b} with blue ${a}. Both are in the table, as different cells.`, `So list the pairs in order: each one is an equally likely outcome out of ${m * n}.`],
        math: [`The pairs with total ${k}, in order: ${list(ordered)}, ${ordered.length} pairs`, `P(total ${k}) = ${ordered.length}/${m * n} = ${p.answer}`] },
      { title: "Every order counts: solved step by step", role: "strategy", instance, text: ["Each step, then the answer."], math: solved(p) },
    ],
    guided, check,
  };
}

/** the general strategies, with the package's items (guided from practice, check from the check partition) */
export function candidateStrategies(): CandidateStrategy[] {
  return [
    pairsTotals("gen:akdice:6,6,0,7", "gen:akdice:5,5,0,7:mc", "gen:akdice:4,5,0,5"),
    orderedOutcomes("gen:akdice:6,6,0,9", "gen:akdice:5,5,0,9:mc", "gen:akdice:6,6,0,3"),
  ];
}

/** freshness@2 (4e655e73) for a two-dice item: the same spinners and the same total, or the mirror total m + n + 2 − k
 * (renumber each face x → size + 1 − x: exactly the same pairs counted), is the same problem, whatever its label or format */
export function diceProblemKey(id: string): string | null {
  const p = problemOf(id.replace(/:(mc|w)$/, ""));
  if (!p || p.family !== FAMILY) return null;
  const [m, n, q, k] = p.params;
  if (q !== 0) return `problem:dice:${m},${n},q${q},${k}`;
  return `problem:dice:${Math.min(m, n)},${Math.max(m, n)},${Math.min(k, m + n + 2 - k)}`;
}
