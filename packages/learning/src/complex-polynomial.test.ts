import { describe, expect, test } from "bun:test";
import corpus from "../../../tools/mathematics/complex-b3/independent-cases.v1.json";
import { assessMathematicalWorking } from "./unified-math-engine";

describe("B3 complex numbers and polynomial roots", () => {
  test("400 independently labelled exact cases", async () => {
    expect(corpus.cases).toHaveLength(400);
    expect(corpus.cases.filter((item) => item.frozenBeforeFinalTuning)).toHaveLength(100);

    const areas: Record<string, number> = {};
    const outcomes: Record<string, number> = {};
    let falseAcceptances = 0;
    let falseRejections = 0;
    let firstInvalidMatches = 0;
    let kernelVerified = 0;

    for (const item of corpus.cases) {
      const assessment = await assessMathematicalWorking(item.problem as any, item.working as any);
      areas[item.area] = (areas[item.area] ?? 0) + 1;
      outcomes[assessment.classification] = (outcomes[assessment.classification] ?? 0) + 1;
      falseAcceptances += Number(assessment.classification === "verified" && item.expected.classification !== "verified");
      falseRejections += Number(assessment.classification !== "verified" && item.expected.classification === "verified");
      firstInvalidMatches += Number(assessment.firstInvalidStep === item.expected.firstInvalidStep);
      kernelVerified += Number(
        assessment.classification === "verified" &&
          (assessment.domainPayload as any).steps.every(
            (step: any) => step.kernelVersion === "openpath-proof-kernel-complex@1",
          ),
      );
      expect([item.id, assessment.classification, assessment.firstInvalidStep]).toEqual([
        item.id,
        item.expected.classification,
        item.expected.firstInvalidStep,
      ]);
    }

    expect(areas).toEqual({ arithmetic: 100, polar: 100, polynomial: 100, geometry: 100 });
    expect({ falseAcceptances, falseRejections, firstInvalidMatches, kernelVerified }).toEqual({
      falseAcceptances: 0,
      falseRejections: 0,
      firstInvalidMatches: 400,
      kernelVerified: 220,
    });
    expect(outcomes).toEqual({
      verified: 220,
      invalid: 80,
      "missing-assumption": 20,
      unsupported: 40,
      "resource-exhausted": 40,
    });
  }, 30_000);

  test("branch, domain, multiplicity, and solution-set adversaries fail closed", async () => {
    const assess = (problem: any, working: any[]) => assessMathematicalWorking(problem, working);
    const base = { domain: "complex-polynomial", assumptions: [] };

    const reversedRoots = await assess(
      {
        ...base,
        area: "polynomial",
        task: "quadratic-roots",
        coefficientDomain: "real",
        data: { coefficients: ["1", "0", "1"], root: { re: "0", im: "0" } },
      },
      [
        {
          id: "roots",
          rule: "quadratic-formula",
          result: { kind: "complex-set", values: [{ re: "0", im: "-1" }, { re: "0/2", im: "2/2" }] },
        },
      ],
    );
    expect(reversedRoots.classification).toBe("verified");

    const zeroDivision = await assess(
      {
        ...base,
        area: "arithmetic",
        task: "divide",
        assumptions: ["nonzero-denominator"],
        data: { a: { re: "1", im: "1" }, b: { re: "0", im: "0" } },
      },
      [{ id: "divide", rule: "conjugate-rationalization", result: { kind: "complex", value: { re: "0", im: "0" } } }],
    );
    expect(zeroDivision.classification).toBe("invalid");

    const wrongQuadrant = await assess(
      { ...base, area: "polar", task: "principal-argument", data: { a: { re: "-1", im: "1" } } },
      [{ id: "argument", rule: "polar-arithmetic", result: { kind: "scalar", value: "1/4" } }],
    );
    expect(wrongQuadrant.classification).toBe("invalid");

    const missingPeriodicRoot = await assess(
      { ...base, area: "polar", task: "roots-of-unity", data: { n: 4 } },
      [{ id: "roots", rule: "de-moivre", result: { kind: "complex-set", values: [{ re: "1", im: "0" }] } }],
    );
    expect(missingPeriodicRoot.classification).toBe("invalid");

    const wrongMultiplicity = await assess(
      {
        ...base,
        area: "polynomial",
        task: "multiplicity",
        data: { coefficients: ["1", "-2", "1"], root: { re: "1", im: "0" } },
      },
      [{ id: "multiplicity", rule: "substitution", result: { kind: "integer", value: 1 } }],
    );
    expect(wrongMultiplicity.classification).toBe("invalid");

    const missingRealCoefficients = await assess(
      {
        ...base,
        area: "polynomial",
        task: "conjugate-root",
        coefficientDomain: "complex",
        data: { coefficients: ["1", "0", "1"], root: { re: "0", im: "1" } },
      },
      [{ id: "conjugate", rule: "substitution", result: { kind: "boolean", value: true } }],
    );
    expect(missingRealCoefficients.classification).toBe("missing-assumption");

    const invalidThenCorrect = await assess(
      { ...base, area: "arithmetic", task: "conjugate", data: { a: { re: "2", im: "3" } } },
      [
        { id: "bad", rule: "cartesian-arithmetic", result: { kind: "complex", value: { re: "2", im: "3" } } },
        { id: "good", rule: "cartesian-arithmetic", dependencies: ["bad"], result: { kind: "complex", value: { re: "2", im: "-3" } } },
      ],
    );
    expect([invalidThenCorrect.classification, invalidThenCorrect.firstInvalidStep]).toEqual(["invalid", 0]);

    const complexSquareRoot = await assess(
      { ...base, area: "arithmetic", task: "principal-square-root", data: { a: { re: "-1", im: "0" } } },
      [{ id: "sqrt", rule: "complex-principal-root", result: { kind: "complex", value: { re: "0", im: "1" } } }],
    );
    expect(complexSquareRoot.classification).toBe("unsupported");
  });
});
