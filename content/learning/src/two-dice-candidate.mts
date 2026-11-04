/**
 * Candidate teaching for two-dice probability (TP-PRO-01, feat/math-teaching-content@4e655e73), for the existing module
 * MATH.probability.sample-space. PENDING EDUCATOR REVIEW: nothing here is approved, and it is NOT registered in
 * blueprints.v1.json (see docs/two-dice-probability/README.md: the library builder only lets a template extension scope a
 * strategy to the module's MAIN family (akss); these strategies are scoped to its pool family akdice).
 *
 * What it teaches: the 36 ordered pairs of two dice are equally likely, the totals are not. Total 2 has one pair, total 7 has
 * six, so P(7) = 6/36 and P(2) = 1/36. Two scoped explanations, one per modelled misconception of the package:
 *   akdice_fix_totals  addresses totals-equally-likely (the 11 totals taken as equally likely)
 *   akdice_fix_order   addresses order-ignored ((1, 6) and (6, 1) counted once)
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

export interface CandidateScreen { title: string; text: string[]; math: string[]; role: "misconception" | "strategy" | "concept"; instance: string; widget?: Record<string, unknown> }
export interface CandidateStrategy {
  id: string; title: string; kind: "conceptual"; needs: string[]; addresses: string;
  scope: { family: string; parameters: { index: number; values: number[] }[] };
  screens: CandidateScreen[]; guided: string; check: string;
}

/** total-equally-likely: shown on two ordinary dice, total 7 (six pairs) against total 2 (one pair) */
function fixTotals(instance: string, guided: string, check: string): CandidateStrategy {
  const p = P(instance), [m, n, , k] = p.params, lo = 2, all = m * n, totals = m + n - 1;
  const seven = pairsWithTotal(m, n, k), two = pairsWithTotal(m, n, lo);
  return {
    id: "akdice_fix_totals", title: "Count the pairs, not the totals", kind: "conceptual", needs: [], addresses: "totals-equally-likely",
    scope: { family: FAMILY, parameters: [{ index: 2, values: [0] }] },
    screens: [
      { title: "Count the pairs, not the totals: what went wrong", role: "misconception", instance,
        text: [`With ${sameNumbers(m, n)} there are ${totals} possible totals, ${lo} to ${m + n}, but they are not equally likely.`, "Each PAIR (first number, second number) is equally likely. A total is as likely as the number of pairs that make it."],
        math: [`Not 1/${totals}, but ${p.answer}`] },
      { title: `Why a total of ${k} is more likely than a total of ${lo}`, role: "concept", instance, widget: table(p),
        text: [`Every cell of the table is one pair, and all ${all} pairs are equally likely.`, `A total of ${lo} can be made in only ${two.length === 1 ? "one way" : `${two.length} ways`}; a total of ${k} can be made in ${seven.length} ways.`],
        math: [`Total ${lo}: ${list(two)}, ${two.length} pair${two.length === 1 ? "" : "s"}, so P = ${frac(two.length, all)}`, `Total ${k}: ${list(seven)}, ${seven.length} pairs, so P = ${frac(seven.length, all)}`, `${seven.length} pairs against ${two.length}: a total of ${k} is ${seven.length / two.length} times as likely as a total of ${lo}.`] },
      { title: "Count the pairs, not the totals: solved correctly", role: "strategy", instance, text: ["Each step, then the answer."], math: solved(p) },
    ],
    guided, check,
  };
}
/** order-ignored: (a, b) and (b, a) are different outcomes (colour one die red, the other blue) */
function fixOrder(instance: string, guided: string, check: string): CandidateStrategy {
  const p = P(instance), [m, n, , k] = p.params, ordered = pairsWithTotal(m, n, k), once = unorderedWithTotal(m, n, k);
  return {
    id: "akdice_fix_order", title: "The two dice are different: order matters", kind: "conceptual", needs: [], addresses: "order-ignored",
    scope: { family: FAMILY, parameters: [{ index: 2, values: [0] }] },
    screens: [
      { title: "Order matters: what went wrong", role: "misconception", instance,
        text: [`Pairs such as (${once[0][0]}, ${once[0][1]}) and (${once[0][1]}, ${once[0][0]}) were counted once. They are different outcomes: the first and the second die are different objects.`, "Colour the first die red and the second blue: red " + once[0][0] + " with blue " + once[0][1] + " is not the same roll as red " + once[0][1] + " with blue " + once[0][0] + "."],
        math: [`Counted once: ${list(once)}, ${once.length} pairs`, `All the pairs: ${list(ordered)}, ${ordered.length} pairs`, `Not ${frac(once.length, m * n)}, but ${p.answer}`] },
      { title: "Order matters: solved correctly", role: "strategy", instance, widget: table(p), text: ["Each step, then the answer."], math: solved(p) },
    ],
    guided, check,
  };
}

/** the candidate strategies, with the package's items (guided from practice, check from the check partition) */
export function candidateStrategies(): CandidateStrategy[] {
  return [
    fixTotals("gen:akdice:6,6,0,7", "gen:akdice:5,5,0,7:mc", "gen:akdice:4,5,0,5"),
    fixOrder("gen:akdice:6,6,0,9", "gen:akdice:5,5,0,9:mc", "gen:akdice:6,6,0,3"),
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
