/** line-working@1: calculus working for the remaining question types is checked line by line on its own truth; it is
 * complete only when every line is true and it ends at the answer; a relation between letters is never called wrong. */
import { describe, expect, test } from "bun:test";
import { lineWorking } from "./grading/line-working.ts";
import { calculusWorking, isLineWorking } from "./grading/calculus-working.ts";
import type { WorkingAssessment } from "./grading/working.ts";

const base = { status: "unsupported", lines: [], methodEvidence: "no-method-evidence" } as unknown as WorkingAssessment;
type Case = [qid: string, lines: string[], status: WorkingAssessment["status"], firstWrong?: number];

const CASES: Case[] = [
  // area between y = x² and y = x + 6: 125/6
  ["gen:alp:1,6", ["x² = x + 6", "x = -2 or x = 3", "A = ∫ from -2 to 3 of (x + 6 - x²) dx", "= [x²/2 + 6x - x³/3] from -2 to 3", "= 27/2 - (-22/3)", "= 125/6"], "partial"],
  ["gen:alp:1,6", ["∫ from -2 to 3 of (x + 6 - x²) dx = [x²/2 + 6x - x³/3] from -2 to 3", "= 27/2 + 22/3", "= 125/6"], "verified"],
  ["gen:alp:1,6", ["∫ from -2 to 3 of (x + 6 - x²) dx = [x²/2 + 6x - x³/3] from -2 to 3", "= 27/2 + 22/3", "= 121/6"], "invalid", 2],
  ["gen:alp:1,6", ["∫ from -2 to 3 of (x + 6 - x²) dx = [x² + 6x - x³/3] from -2 to 3"], "invalid", 0],
  ["gen:alp:1,6", ["∫ from -2 to 3 of (x + 6 - x²) dx = 20"], "invalid", 0],
  // true lines that end elsewhere are not complete
  ["gen:alp:1,6", ["∫ from 0 to 3 of (x + 6 - x²) dx = [x²/2 + 6x - x³/3] from 0 to 3", "= 27/2"], "partial"],
  // a line between letters is an equation, never wrong
  ["gen:aqlarea:0,3,6,0,0", ["y = 6 - 2x", "∫ from 0 to 3 of (6 - 2x) dx = [6x - x²] from 0 to 3", "= 18 - 9", "= 9"], "partial"],
  // volume, an improper integral, a partial derivative, an initial value, a second derivative
  ["gen:arvolrev:1,2,2", ["V = π ∫ from 0 to 2 of (2x)² dx", "= π [4x³/3] from 0 to 2", "= 32π/3"], "verified"],
  ["gen:argamma:1,4,1", ["∫ from 1 to ∞ of 1/x⁴ dx = [-1/(3x³)] from 1 to ∞", "= 0 + 1/3", "= 1/3"], "verified"],
  ["gen:arpartial:2,1,1,-3,1,3,0", ["∂f/∂x = 2y - 9x²"], "verified"],
  ["gen:arpartial:2,1,1,-3,1,3,0", ["∂f/∂x = 2y - 9x² + 3y²"], "invalid", 0],
  // ∂w/∂x is partial, dx/dt is not read (x is not defined in terms of t here): never a false "right"
  ["gen:archain:-1,0,-2,3,-1,-3,2", ["dw/dt = ∂w/∂x · dx/dt + ∂w/∂y · dy/dt"], "unsupported"],
  ["gen:archain:-1,0,-2,3,-1,-3,2", ["∂w/∂x = -2x", "∂w/∂y = -4y"], "partial"],
  ["gen:areuler:2,1,0,2,1,-1", ["∂f/∂x = 2x", "∂f/∂y = 4y", "x ∂f/∂x + y ∂f/∂y = 2x² + 4y²", "= 2 + 4", "= 6"], "verified"],
  ["gen:auinit:0,6,5,0,60", ["∫ (6x + 5) dx = 3x² + 5x + C", "f(x) = 3x² + 5x + C"], "partial"],
  // a parametric curve x = t², y = t
  ["gen:arparam:1,2,1,1", ["dx/dt = 2t", "dy/dt = 1", "dy/dx = (dy/dt)/(dx/dt) = 1/(2t)"], "verified"],
  ["gen:arparam:1,2,1,1", ["dx/dt = 2t", "dy/dx = 2t"], "invalid", 1],
  // implicit differentiation of 2x² − xy + 5y² = 17
  ["gen:arimpl:2,-1,5,0", ["d/dx(2x² - xy + 5y²) = 0", "4x - y - x dy/dx + 10y dy/dx = 0", "dy/dx = (y - 4x)/(10y - x)"], "verified"],
  ["gen:arimpl:2,-1,5,0", ["4x - y - x dy/dx + 10y dy/dx = 0", "dy/dx = (4x - y)/(10y - x)"], "invalid", 1],
  ["gen:arimpl:2,-1,5,0", ["4x + y - x dy/dx + 10y dy/dx = 0"], "invalid", 0],
  ["gen:arwallis:0,6,0", ["∫ from 0 to π/2 of cos⁶x dx = (5/6)(3/4)(1/2)(π/2)", "= 5π/32"], "partial"],
  ["gen:arwallis:0,6,0", ["∫ from 0 to π/2 of cos⁶x dx = (5/6)(3/4)(π/2)"], "invalid", 0],
];

describe("line-working@1", () => {
  test("the remaining calculus questions are routed here", async () => {
    for (const id of ["gen:alp:1,6", "gen:arvolrev:1,2,2", "gen:arpartial:2,1,1,-3,1,3,0", "gen:archain:-1,0,-2,3,-1,-3,2"]) expect(isLineWorking(id)).toBe(true);
    expect(isLineWorking("gen:aqmono:0,4,1,1,1")).toBe(false);
    expect((await calculusWorking("gen:argamma:1,4,1", ["∫ from 1 to ∞ of 1/x⁴ dx = [-1/(3x³)] from 1 to ∞", "= 1/3"], base)).status).toBe("verified");
  });
  for (const [qid, lines, status, firstWrong] of CASES) {
    test(`${qid}: ${lines.at(-1)} → ${status}`, () => {
      const w = lineWorking(qid, lines, base);
      if (status === "invalid") { expect(w.status).toBe("invalid"); expect(w.firstInvalid?.index).toBe(firstWrong!); }
      else expect(w.status).toBe(status);
    });
  }
});
