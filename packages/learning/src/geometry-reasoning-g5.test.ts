/**
 * G5: geometric reasoning through the existing trusted geometry authority (unified-math-engine assessMathematicalWorking → the geometry
 * reasoner worker, research/geometry-reasoner), on explicitly STRUCTURED givens: no diagram is read and nothing is inferred from appearance.
 *
 * Each case carries an authored mathematical oracle (what a teacher would say about the reasoning) and the verdict the authority gives. The
 * test enforces the safety property (the authority never verifies reasoning the oracle rejects: no false acceptance) and records, without
 * hiding them, the known cases where it rejects or cannot judge valid reasoning. The geometry authority is not connected to the learner
 * journey's trusted grader (server-grader / working-assessment@1); see docs/geometry-cross-domain-validation.
 */
import { describe, expect, test } from "bun:test";
import { G5_REASONING_CASES, runReasoningCases } from "./geometry-reasoning-g5";

describe("G5 geometric reasoning on structured givens (the existing geometry authority)", () => {
  test("no false acceptance; the observed rejections of valid reasoning are exactly the recorded ones", async () => {
    const r = await runReasoningCases();
    expect(r.filter((x) => x.outcome === "false-acceptance")).toEqual([]);
    // known authority limitations (documented, not fixed here): a valid citation of a theorem outside the rule set, or of a route the
    // reasoner did not take, is reported INVALID rather than unsupported; vertically opposite angles do not carry a measure
    expect(r.filter((x) => x.outcome === "false-rejection").map((x) => x.id).sort()).toEqual(["R06", "R07"]);
    expect(r.filter((x) => x.outcome === "abstains").map((x) => x.id).sort()).toEqual(["R12a", "R12b"]);
    // a provably false step the authority only reports as unsupported (R10: B = 120 where B must be 60): not accepted, but not refuted
    expect(r.filter((x) => x.outcome === "abstains-on-invalid").map((x) => x.id)).toEqual(["R10"]);
    // the first invalid step is located where the oracle puts it, for the cases the authority actually refutes
    for (const c of G5_REASONING_CASES.filter((x) => x.oracleFirstInvalid !== undefined && x.id !== "R10")) expect([c.id, r.find((x) => x.id === c.id)!.firstInvalid]).toEqual([c.id, c.oracleFirstInvalid]);
    // a bare final claim is "verified" by the authority (entailment, not shown reasoning): recorded as accepts-unjustified; it must never be
    // read as method evidence (an authority defect if connected to method evidence, see the review)
    expect(r.find((x) => x.id === "R02")!.outcome).toBe("accepts-unjustified");
  }, 60_000);

  test("no claim is accepted from a picture: a relation not given as a fact blocks the step", async () => {
    const r = await runReasoningCases();
    expect(r.find((x) => x.id === "R11")!.verdict).not.toBe("verified");
    expect(r.find((x) => x.id === "R08")!.verdict).toBe("missing-assumption");
  }, 60_000);
});
