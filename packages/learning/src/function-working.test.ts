/** function-working@1: working about one named function (turning points, maxima and minima, monotonicity, concavity) is
 * judged line by line with the function put in; a list of solutions must be complete; words are left to the answer. */
import { describe, expect, test } from "bun:test";
import { functionTaskOf, functionWorking } from "./grading/function-working.ts";
import { calculusWorking, isCalculusWorking } from "./grading/calculus-working.ts";
import { familySpec } from "./spec.ts";
import type { WorkingAssessment } from "./grading/working.ts";

const base = { status: "unsupported", lines: [], methodEvidence: "no-method-evidence" } as unknown as WorkingAssessment;
type Case = [qid: string, lines: string[], status: WorkingAssessment["status"], firstWrong?: number];

const CASES: Case[] = [
  // f(x) = 2x³ − 12x² + 1, decreasing on (0, 4)
  ["gen:aqmono:0,4,1,1,1", ["f'(x) = 6x^2 - 24x = 6x(x - 4)", "f'(x) = 0", "x = 0 or x = 4"], "verified"],
  ["gen:aqmono:0,4,1,1,1", ["f′(x) = 6x² − 24x", "6x(x − 4) = 0", "x = 0, 4", "f is decreasing on (0, 4)"], "partial"],
  ["gen:aqmono:0,4,1,1,1", ["f'(x) = 6x^2 - 12x"], "invalid", 0],
  ["gen:aqmono:0,4,1,1,1", ["f'(x) = 6x^2 - 24x", "x = 4"], "partial"],
  ["gen:aqmono:0,4,1,1,1", ["f'(x) = 6x^2 - 24x", "x = 0 or x = 2"], "invalid", 1],
  // local minimum of f(x) = 2x³ − 15x² + 24x: f′ = 6(x − 1)(x − 4), f″(4) = 18 > 0, f(4) = −16
  ["gen:aqext:1,4,1,1,0", ["f'(x) = 6x^2 - 30x + 24 = 6(x - 1)(x - 4)", "x = 1 or x = 4", "f''(x) = 12x - 30", "f''(4) = 18", "f(4) = 128 - 240 + 96 = -16"], "verified"],
  ["gen:aqext:1,4,1,1,0", ["f'(x) = 6x^2 - 30x + 24 = 6(x - 1)(x - 4)", "f(4) = 128 - 240 + 96 = -18"], "invalid", 1],
  // the curve y = x³ − 3x² − 2x, concave down where y″ < 0
  ["gen:aqconc:1,1,1,1,-2", ["dy/dx = 3x^2 - 6x - 2", "d²y/dx² = 6x - 6", "6x - 6 = 0", "x = 1"], "verified"],
  // words only
  ["gen:aqmono:0,4,1,1,1", ["find where the derivative is negative"], "unsupported"],
];

describe("function-working@1", () => {
  test("questions about one function are read", () => {
    for (const f of ["aqmono", "aqext", "aqabs", "aqconc", "armono", "dpow", "aqtann"]) {
      const id = (familySpec(f)?.examples ?? []).find((i) => !i.endsWith(":mc"))!;
      expect(functionTaskOf(id)).not.toBeNull();
    }
  });
  test("the server's calculus grader routes them here", async () => {
    expect(isCalculusWorking("gen:aqmono:0,4,1,1,1")).toBe(true);
    const w = await calculusWorking("gen:aqmono:0,4,1,1,1", ["f'(x) = 6x^2 - 24x", "x = 0 or x = 4"], base);
    expect(w.status).toBe("verified");
  });
  for (const [qid, lines, status, firstWrong] of CASES) {
    test(`${qid}: ${lines.at(-1)} → ${status}`, () => {
      const w = functionWorking(qid, lines, base);
      if (status === "invalid") { expect(w.status).toBe("invalid"); expect(w.firstInvalid?.index).toBe(firstWrong!); }
      else expect(w.status).toBe(status);
    });
  }
});
