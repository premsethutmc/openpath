import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { assessMathematicalWorking, UNIFIED_MATH_CONTRACT, type MathematicalProblem, type StudentWorking } from "./unified-math-engine.ts";

const fixture = JSON.parse(readFileSync("tools/mathematics/unified-u1/independent-cases.v1.json", "utf8")) as { cases: { id: string; domain: string; problem: MathematicalProblem; working: StudentWorking; options: Record<string, unknown>; expected: { classification: string; firstInvalidStep: number | null } }[] };

describe("unified mathematics engine U1", () => {
  test("200 independently labelled arithmetic, algebra, geometry and mixed cases", async () => {
    expect(fixture.cases.length).toBe(200);
    const counts: Record<string, number> = {}; let falseAccept = 0, falseReject = 0, first = 0;
    for (const c of fixture.cases) {
      const got = await assessMathematicalWorking(c.problem, c.working, c.options);
      counts[c.domain] = (counts[c.domain] ?? 0) + 1;
      falseAccept += Number(got.classification === "verified" && c.expected.classification !== "verified");
      falseReject += Number(got.classification !== "verified" && c.expected.classification === "verified");
      first += Number(got.firstInvalidStep === c.expected.firstInvalidStep);
      expect([c.id, got.classification, got.firstInvalidStep]).toEqual([c.id, c.expected.classification, c.expected.firstInvalidStep]);
      expect(got.contractVersion).toBe(UNIFIED_MATH_CONTRACT);
    }
    expect(counts).toEqual({ arithmetic: 50, algebra: 50, geometry: 50, mixed: 50 });
    expect({ falseAccept, falseReject, first }).toEqual({ falseAccept: 0, falseReject: 0, first: 200 });
  }, 30_000);

  test("two justified routes reach the same mixed result", async () => {
    const base = fixture.cases.find((x) => x.id === "u1-mixed-00")!;
    const direct = await assessMathematicalWorking(base.problem, base.working, base.options);
    const altCase = fixture.cases.find((x) => x.id === "u1-mixed-20")!;
    const alternate = await assessMathematicalWorking(altCase.problem, altCase.working, altCase.options);
    expect([direct.classification, alternate.classification]).toEqual(["verified", "verified"]);
    expect(direct.reasoners.map((x) => x.id)).toContain("geometry:synthetic");
    expect(direct.reasoners.some((x) => x.id.startsWith("math-core:"))).toBe(true);
  });

  test("an unjustified geometry premise blocks a correct calculation", async () => {
    const c = fixture.cases.find((x) => x.id === "u1-mixed-38")!;
    const got = await assessMathematicalWorking(c.problem, c.working, c.options);
    expect(got.classification).toBe("missing-assumption");
    expect(got.correct).toBeNull();
    expect(got.reasoners.some((x) => x.id.startsWith("math-core:"))).toBe(false);
  });

  test("fails closed under malformed, oversized, and unavailable-reasoner inputs", async () => {
    const malformed = await assessMathematicalWorking({ domain: "algebra", statement: "x+1=2" }, null as never);
    expect(malformed.classification).toBe("malformed");

    const oversized = await assessMathematicalWorking(
      { domain: "algebra", statement: `Simplify ${"(".repeat(5000)}x${")".repeat(5000)}` },
      ["x"],
    );
    expect(oversized.classification).toBe("resource-exhausted");
    expect(oversized.correct).toBeNull();

    const geometryCase = fixture.cases.find((x) => x.id === "u1-geometry-00")!;
    const unavailable = await assessMathematicalWorking(geometryCase.problem, geometryCase.working, {
      geometryRoot: "/tmp/openpath-u1-no-such-reasoner",
    });
    expect(unavailable.classification).toBe("unsupported");
    expect(unavailable.correct).toBeNull();

    const isolated = await assessMathematicalWorking({ domain: "arithmetic", statement: "6*7" }, ["42"]);
    expect(isolated.classification).toBe("verified");
  });

  test("bounded geometry rejects exhausted work without guessing", async () => {
    const exhausted = fixture.cases.find((x) => x.id === "u1-geometry-46")!;
    const got = await assessMathematicalWorking(exhausted.problem, exhausted.working, exhausted.options);
    expect(got.classification).toBe("resource-exhausted");
    expect(got.correct).toBeNull();
    expect(got.complete).toBe(false);
  });
});
