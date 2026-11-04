/**
 * G5: adversarial geometric-reasoning cases for the existing trusted geometry authority (unified-math-engine assessMathematicalWorking →
 * the geometry reasoner worker, research/geometry-reasoner), on explicitly STRUCTURED givens: no diagram is read and nothing is inferred
 * from appearance. Each case carries an authored mathematical oracle; `runReasoningCases` compares it with the authority's verdict.
 * Evaluation material only: no production module imports it.
 */
import { assessMathematicalWorking } from "./unified-math-engine";

const ROOT = new URL("../../../research/geometry-reasoner", import.meta.url).pathname;
const tri = (extra: object[] = []) => [{ id: "T", kind: "triangle", data: { angles: ["A", "B", "C"], sides: ["AB", "BC", "CA"] } }, ...extra];
const ang = (id: string) => ({ id, kind: "angle", data: {} });
const am = (a: string, v: number) => ({ predicate: "angle_measure", args: [a], value: v });
const P = (facts: object[], goal: object, o: { objects?: object[]; conditions?: string[] } = {}) => ({ domain: "geometry" as const, problem: { id: "g5", objects: o.objects ?? tri([ang("D")]), facts, conditions: o.conditions ?? ["nondegenerate:T"], goal } });
const step = (id: string, st: object, thm?: string, cites: string[] = []) => ({ id, statement: st, ...(thm ? { cited_theorem: thm } : {}), cited_step_ids: cites });
// triangle ABC with A = 40°, B = 65°; D is the exterior angle at C (C and D are a linear pair, GIVEN as a fact, not read from a picture)
const EXT = [am("A", 40), am("B", 65), { predicate: "linear_pair", args: ["C", "D"] }];
const TWO_ROUTES = { objects: tri([ang("E"), ang("F")]) };
const ROUTES = [am("A", 50), { predicate: "vertical_pair", args: ["E", "B"] }, am("E", 60), { predicate: "linear_pair", args: ["F", "B"] }, am("F", 120)];
const ORDER = [{ predicate: "vertical_pair", args: ["E", "A"] }, am("E", 50), { predicate: "linear_pair", args: ["F", "B"] }, am("F", 120)];

/** oracle: "valid" (the reasoning is mathematically sound and complete), "invalid" (a step is false or the reasoning does not hold),
 *  "not-established" (the givens do not license the claim within the formal system), or "unjustified" (a true, entailed claim with no reasoning
 *  shown: an answer, not a justification; accepting it is not a false acceptance of a false claim, but it must never be method evidence) */
export const G5_REASONING_CASES: { id: string; title: string; problem: ReturnType<typeof P>; steps: object[]; oracle: "valid" | "invalid" | "not-established" | "unjustified"; oracleFirstInvalid?: number; why: string }[] = [
  { id: "R01", title: "Correct answer with valid reasoning", problem: P(EXT, am("D", 105)), steps: [step("s1", am("C", 75), "triangle-sum"), step("s2", am("D", 105), "straight-line", ["s1"])], oracle: "valid", why: "C = 180 − 40 − 65 = 75; D = 180 − 75 = 105" },
  { id: "R02", title: "Correct answer without working (the final claim alone)", problem: P(EXT, am("D", 105)), steps: [step("s1", am("D", 105))], oracle: "unjustified", why: "true and entailed by the givens, but no reasoning is shown: it is an answer, not a justification" },
  { id: "R03", title: "Correct answer with invalid reasoning", problem: P(EXT, am("D", 105)), steps: [step("s1", am("C", 85), "triangle-sum"), step("s2", am("D", 105), "straight-line", ["s1"])], oracle: "invalid", oracleFirstInvalid: 0, why: "C is 75, not 85; and 180 − 85 is not 105" },
  { id: "R04", title: "Incorrect answer with valid partial reasoning", problem: P(EXT, am("D", 105)), steps: [step("s1", am("C", 75), "triangle-sum"), step("s2", am("D", 115), "straight-line", ["s1"])], oracle: "invalid", oracleFirstInvalid: 1, why: "the first step is right; 180 − 75 is 105, not 115" },
  { id: "R05", title: "First invalid geometric step", problem: P(EXT, am("D", 105)), steps: [step("s1", am("C", 65), "triangle-sum"), step("s2", am("D", 115), "straight-line", ["s1"])], oracle: "invalid", oracleFirstInvalid: 0, why: "180 − 40 − 65 is 75, not 65" },
  { id: "R06", title: "Alternative valid reasoning path (vertically opposite instead of straight line)", problem: P(ROUTES, am("C", 70), TWO_ROUTES), steps: [step("s1", am("B", 60), "vertical-opposite"), step("s2", am("C", 70), "triangle-sum", ["s1"])], oracle: "valid", why: "B is vertically opposite E = 60°, so B = 60; C = 180 − 50 − 60 = 70" },
  { id: "R06b", title: "The other valid path (straight line)", problem: P(ROUTES, am("C", 70), TWO_ROUTES), steps: [step("s1", am("B", 60), "straight-line"), step("s2", am("C", 70), "triangle-sum", ["s1"])], oracle: "valid", why: "B and F = 120° are a linear pair, so B = 60" },
  { id: "R07", title: "Exterior-angle theorem with explicit givens", problem: P(EXT, am("D", 105)), steps: [step("s1", am("D", 105), "exterior-angle")], oracle: "valid", why: "the exterior-angle theorem is a valid school theorem: D = A + B = 105" },
  { id: "R08", title: "Missing prerequisite (the triangle is not given as nondegenerate)", problem: P([am("A", 50), am("B", 60)], am("C", 70), { conditions: [] }), steps: [step("s1", am("C", 70), "triangle-sum")], oracle: "not-established", why: "within the formal system the angle-sum theorem needs a nondegenerate triangle, which is not given (mathematically, measures of 50° and 60° already rule out a degenerate triangle; the gap is the formal assumption, not the arithmetic)" },
  { id: "R09", title: "Incorrect application of the exterior-angle theorem (adds the adjacent interior angle)", problem: P(EXT, am("D", 105)), steps: [step("s1", am("C", 75), "triangle-sum"), step("s2", am("D", 115), "exterior-angle", ["s1"])], oracle: "invalid", oracleFirstInvalid: 1, why: "the exterior angle is the sum of the two OPPOSITE interior angles (40 + 65), not 40 + 75" },
  { id: "R10", title: "Supplementary taken for vertically opposite", problem: P([am("A", 50), { predicate: "vertical_pair", args: ["E", "B"] }, am("E", 60)], am("C", 70), { objects: tri([ang("E")]) }), steps: [step("s1", am("B", 120), "straight-line"), step("s2", am("C", 10), "triangle-sum", ["s1"])], oracle: "invalid", oracleFirstInvalid: 0, why: "E and B are vertically opposite (equal), not a linear pair: B = 60, not 120" },
  { id: "R11", title: "Diagram-dependent claim: C and D are not GIVEN as a linear pair", problem: P([am("A", 40), am("B", 65)], am("D", 105)), steps: [step("s1", am("C", 75), "triangle-sum"), step("s2", am("D", 105), "straight-line", ["s1"])], oracle: "not-established", why: "nothing given relates D to C; a picture might suggest it, but appearance is not evidence" },
  { id: "R12a", title: "A valid solution in one order", problem: P(ORDER, am("C", 70), TWO_ROUTES), steps: [step("s1", am("A", 50), "vertical-opposite"), step("s2", am("B", 60), "straight-line"), step("s3", am("C", 70), "triangle-sum", ["s1", "s2"])], oracle: "valid", why: "A = E = 50 (vertically opposite); B = 180 − 120 = 60; C = 70" },
  { id: "R12b", title: "The same solution with the steps in a different order", problem: P(ORDER, am("C", 70), TWO_ROUTES), steps: [step("s1", am("B", 60), "straight-line"), step("s2", am("A", 50), "vertical-opposite"), step("s3", am("C", 70), "triangle-sum", ["s1", "s2"])], oracle: "valid", why: "the order of two independent steps does not matter" },
];

export async function runReasoningCases() {
  const out: { id: string; title: string; oracle: string; verdict: string; firstInvalid: number | null; correct: boolean | null; steps: { classification: string; justification: string }[]; outcome: "agrees" | "false-acceptance" | "accepts-unjustified" | "false-rejection" | "abstains" | "abstains-on-invalid" }[] = [];
  for (const c of G5_REASONING_CASES) {
    const g = await assessMathematicalWorking(c.problem as never, { steps: c.steps } as never, { geometryRoot: ROOT });
    const verdict = g.classification;
    const accepted = verdict === "verified";
    const refuted = verdict === "invalid" || verdict === "contradictory";
    // "unjustified" accepted is recorded separately (true claim, no reasoning); an invalid case the authority did not refute is an abstention
    // on an invalid step, not agreement
    const outcome = accepted ? (c.oracle === "valid" ? "agrees" : c.oracle === "unjustified" ? "accepts-unjustified" : "false-acceptance")
      : refuted ? (c.oracle === "valid" ? "false-rejection" : "agrees")
      : c.oracle === "valid" || c.oracle === "unjustified" ? "abstains" : c.oracle === "invalid" ? "abstains-on-invalid" : "agrees";
    out.push({ id: c.id, title: c.title, oracle: c.oracle, verdict, firstInvalid: g.firstInvalidStep, correct: g.correct, steps: g.steps.map((s) => ({ classification: s.classification, justification: s.justification })), outcome });
  }
  return out;
}

