/** ode-working@1: differential-equation working is judged line by line by putting the question's solution back in:
 * right working passes, the first wrong line is found, and what cannot be read is left unchecked (never called right). */
import { describe, expect, test } from "bun:test";
import { odeTaskOf, odeWorking, solutionSatisfies } from "./grading/ode-working.ts";
import { familySpec } from "./spec.ts";
import { calculusWorking, isCalculusWorking } from "./grading/calculus-working.ts";
import type { WorkingAssessment } from "./grading/working.ts";

const base = { status: "unsupported", lines: [], methodEvidence: "no-method-evidence" } as unknown as WorkingAssessment;
type Case = [qid: string, lines: string[], status: WorkingAssessment["status"], firstWrong?: number];

const CASES: Case[] = [
  // separable: dy/dx = −y/x, y(1) = 2 → y = 2/x
  ["gen:aqsep:1,-1,0,2", ["dy/y = -dx/x", "∫ dy/y = -∫ dx/x", "ln|y| = -ln x + C", "ln 2 = -ln 1 + C", "C = ln 2", "y = 2/x"], "verified"],
  ["gen:aqsep:1,-1,0,2", ["dy/y = -dx/x", "ln|y| = -ln x + C", "y = C/x", "2 = C/1", "y = 2/x"], "verified"],
  ["gen:aqsep:1,-1,0,2", ["dy/y = dx/x", "ln|y| = ln x + C", "y = 2x"], "invalid", 0],
  ["gen:aqsep:1,-1,0,2", ["dy/y = -dx/x", "ln|y| = -ln x + C", "y = C/x", "2 = C/2"], "invalid", 3],
  ["gen:aqsep:1,-1,0,2", ["dy/y = -dx/x", "y = 2/x^2"], "invalid", 1],
  // linear: dy/dx + y/x = 6, y(1) = −2 → y = 3x − 5/x
  ["gen:aqlinde:1,6,0,-2", ["IF = e^(∫ 1/x dx) = x", "d/dx(x y) = 6x", "x y = 3x^2 + C", "-2 = 3 + C", "C = -5", "y = 3x - 5/x"], "partial"],
  ["gen:aqlinde:1,6,0,-2", ["x dy/dx + y = 6x", "d/dx(x y) = 6x", "x y = 3x^2 + C", "-2 = 3 + C", "C = -5", "y = 3x - 5/x"], "verified"],
  ["gen:aqlinde:1,6,0,-2", ["x dy/dx + y = 6x", "d/dx(x y) = 6x", "x y = 6x^2 + C", "y = 6x - 8/x"], "invalid", 2],
  // homogeneous with y = vx: dy/dx = (y + 2x)/x, y(1) = −1 → y = 2x log x − x
  ["gen:aqhom:0,2,1,-1", ["Let y = vx", "dy/dx = v + x dv/dx", "v + x dv/dx = v + 2", "dv = 2 dx/x", "v = 2 log x + C", "y/x = 2 log x - 1", "y = 2x log x - x"], "verified"],
  ["gen:aqhom:0,2,1,-1", ["Let y = vx", "dy/dx = v + x dv/dx", "v + x dv/dx = v + 2", "dv = 2x dx"], "invalid", 3],
  // y(0) = 0 and an exponential: dy/dx + 2y = −2 → y = −1 + e^(−2x)
  ["gen:arlinde:0,2,-2,0", ["d/dx(e^(2x) y) = -2e^(2x)", "e^(2x) y = -e^(2x) + C", "0 = -1 + C", "C = 1", "y = -1 + e^(-2x)"], "verified"],
  // x as a function of y
  ["gen:arlindx:0,2,-2,3", ["d/dy(e^(2y) x) = -2e^(2y)", "e^(2y) x = -e^(2y) + C", "C = 4", "x = -1 + 4e^(-2y)"], "verified"],
  // substitution v = y − 1: dy/dx = (y − 1)² + 1 → y = tan x + 1
  // tan⁻¹(tan x) = x holds only near the start, which the kernel does not prove: that line is left unchecked, never wrong
  ["gen:aqsubsep:0,-1,1,0", ["v = y - 1", "dv/dx = v^2 + 1", "∫ 1/(v^2 + 1) dv = ∫ dx", "tan⁻¹ v = x + C", "C = 0", "y = tan(x) + 1"], "partial"],
  ["gen:aqsubsep:0,-1,1,0", ["v = y - 1", "dv/dx = v^2 + 1", "∫ 1/(v^2 + 1) dv = ∫ dx", "y = tan(x) - 1"], "invalid", 3],
  // words only
  ["gen:aqsep:1,-1,0,2", ["separate the variables and integrate"], "unsupported"],
];

describe("ode-working@1", () => {
  test("every differential-equation question with an initial condition is read, and its solution satisfies it", () => {
    for (const f of ["aqsep", "aqlinde", "aqhom", "arlinde", "arlindx", "aqsubsep"]) {
      // (the differential form y dx − (x + y⁴) dy = 0 is not read yet)
      const ids = (familySpec(f)?.examples ?? []).filter((id) => !id.endsWith(":mc") && !id.startsWith("gen:arlindx:2,")).slice(0, 6);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        const t = odeTaskOf(id); expect(t).not.toBeNull();
        // the solution, put back in, makes the equation an identity and meets the initial condition
        expect(solutionSatisfies(t!)).toBe(true);
      }
    }
  }, 60000);
  test("the server's calculus grader routes differential equations here, with long working allowed", async () => {
    expect(isCalculusWorking("gen:aqsep:1,-1,0,2")).toBe(true);
    const w = await calculusWorking("gen:aqsep:1,-1,0,2", ["dy/y = -dx/x", "ln|y| = -ln x + C", "y = 2/x"], base);
    expect(w.status).toBe("verified"); expect(w.provenance?.checker).toBe("ode-reasoner");
  });
  for (const [qid, lines, status, firstWrong] of CASES) {
    test(`${qid}: ${lines.at(-1)} → ${status}`, () => {
      const w = odeWorking(qid, lines, base);
      if (status === "invalid") { expect(w.status).toBe("invalid"); expect(w.firstInvalid?.index).toBe(firstWrong!); }
      else expect(w.status).toBe(status);
      if (status === "unsupported") expect(w.lines.every((l) => l.status !== "certified-calculus")).toBe(true);
    });
  }
});
