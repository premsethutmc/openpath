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
  // a definite integral equal to a number, no bracket shown: worked out exactly
  ["gen:alp:1,6", ["∫ from -2 to 3 of (x + 6 - x²) dx = 125/6"], "verified"],
  ["gen:arvolrev:1,2,2", ["V = π ∫ from 0 to 2 of 4x² dx = 32π/3"], "verified"],
  ["gen:aqarea:0,4,7,1", ["A = 2 ∫ from 0 to 7 of 4√x dx = 112√7/3"], "verified"],
  ["gen:aqarea:0,4,7,1", ["A = 2 ∫ from 0 to 7 of 4√x dx = 56√7/3"], "invalid", 0],
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
  // piecewise: f(x) = kx − 3 for x ≤ 2, x² + 3 for x > 2; continuous at 2 when k = 5
  ["gen:aqcontk:0,2,-3,1,3", ["f(2⁻) = 2k - 3", "f(2⁺) = 7", "2k - 3 = 7", "k = 5"], "verified"],
  ["gen:aqcontk:0,2,-3,1,3", ["LHL = 2k - 3", "RHL = 4 + 3 = 7", "2k = 10"], "partial"],
  ["gen:aqcontk:0,2,-3,1,3", ["f(2⁺) = 2k - 3"], "invalid", 0],
  ["gen:aqcontk:0,2,-3,1,3", ["2k - 3 = 7", "k = 4"], "invalid", 1],
  // differentiable at 2: x² + ax + b for x < 2, −5x − 3 for x ≥ 2 → a = −9, b = 1
  ["gen:aqdiffab:2,-5,-3", ["f(2⁻) = 4 + 2a + b", "f(2) = -13", "4 + 2a + b = -13", "f′(2⁻) = 4 + a", "f′(2⁺) = -5", "4 + a = -5", "a = -9", "b = 1"], "partial"],
  ["gen:aqdiffab:2,-5,-3", ["4 + a = -5", "a = -9", "b = 2"], "invalid", 2],
  // a left-hand limit
  ["gen:aultab:1,3,1,3,-5,-3", ["lim (x → 3⁻) f(x) = 3 + 3 = 6"], "verified"],
  ["gen:aultab:1,3,1,3,-5,-3", ["lim (x → 3⁻) f(x) = -15 - 3 = -18"], "invalid", 0],
  // a limit of a sum, by the sum formulas and as a definite integral
  ["gen:aurie:3,3,0,2", ["Σ from r = 1 to n of 3r²/n³ = (3/n³) · n(n + 1)(2n + 1)/6", "lim (n → ∞) (n + 1)(2n + 1)/(2n²) = 1"], "verified"],
  ["gen:aurie:3,3,0,2", ["Σ from r = 1 to n of 3r²/n³ = (3/n³) · n(n + 1)/2"], "invalid", 0],
  ["gen:aurie:3,3,0,2", ["lim (n → ∞) of Σ from r = 1 to n of 3r²/n³ = ∫ from 0 to 1 of 3x² dx", "= [x³] from 0 to 1 = 1"], "verified"],
  // a limit in two variables
  ["gen:armvlim:0,1,-2", ["lim ((x, y) → (−2, −2)) of (x² − y²)/(x − y) = lim ((x, y) → (−2, −2)) of (x + y)", "= −4"], "verified"],
  ["gen:armvlim:0,1,-2", ["lim ((x, y) → (−2, −2)) of (x² − y²)/(x − y) = lim ((x, y) → (−2, −2)) of (x − y)"], "invalid", 0],
  ["gen:armvlim:0,1,-2", ["lim ((x, y) → (−2, −2)) of (x + y) = 0"], "invalid", 0],
  // approximations, judged against the method the question names
  ["gen:arlinapp:0,4,2", ["f′(x) = 1/(2√x)", "f(16) = 4", "f′(16) = 1/8", "√18 ≈ f(16) + f′(16)(2) = 4 + 1/4 = 17/4"], "verified"],
  ["gen:arlinapp:0,4,2", ["√18 ≈ 4 + 2/8 = 4.24"], "invalid", 0],
  ["gen:arerror:0,8,2,0", ["A = x²", "dA = 2x dx", "x = 8", "dx = 0.02", "dA = 2(8)(0.02) = 0.32"], "verified"],
  ["gen:arerror:0,8,2,0", ["A = x²", "dA = x dx"], "invalid", 1],
  ["gen:arlinapp2:1,0,-2,1,-3,2,1", ["df = ∂f/∂x dx + ∂f/∂y dy", "= 2x dx - 4y dy", "= 2(1)(0.2) - 4(-3)(-0.1)", "= -0.8"], "verified"],
  // limits along paths: "does not exist" needs two checked paths with different limits
  ["gen:armvlimx:0,1,3,3,1", ["along y = 0: f(x, 0) = 1, so the limit is 1", "along x = 0: f(0, y) = (3y² + 3y)/(3y²) → limit is not finite"], "partial"],
  ["gen:armvcont:1,3,2", ["along y = 0: the limit is 0", "along x = 0: the limit is 0"], "partial"],
  ["gen:armvcont:1,3,2", ["along y = 0: the limit is 3"], "invalid", 0],
  ["gen:armvlimx:1,1,3,2,1", ["along y = 0: the limit is 1", "along y = x: the limit is 2", "the limits differ, so the limit does not exist"], "partial"],
  ["gen:armvlimx:1,1,3,2,1", ["along y = 0: the limit is 1", "along y = 2x: the limit is 15/9", "so the limit does not exist"], "partial"],
  // a value the working takes must come from the question or solve the equation before it
  ["gen:arerror:0,8,2,0", ["A = x²", "dA = 2x dx", "x = 9", "dx = 0.02", "dA = 2(9)(0.02) = 0.36"], "partial"],
  ["gen:alp:1,6", ["x² - x - 6 = 0", "x = 3"], "partial"],
  // integration techniques: partial fractions, substitution, standard forms, half-angle, eˣ(f + f′)
  ["gen:aupfr:0,-1,0,5,3", ["∫ (5x + 8)/(x + 1)² dx = 5 log|x + 1| - 3/(x + 1) + C"], "verified"],
  ["gen:aupfr:0,-1,0,5,3", ["(5x + 8)/(x + 1)² = 5/(x + 1) + 3/(x + 1)²", "∫ (5x + 8)/(x + 1)² dx = 5 log|x + 1| - 3/(x + 1) + C"], "verified"],
  // a wrong split is an equation between letters, so it is left unchecked (never called right)
  ["gen:aupfr:0,-1,0,5,3", ["(5x + 8)/(x + 1)² = 5/(x + 1) + 2/(x + 1)²"], "unsupported"],
  ["gen:subst:0,3,1,1", ["let u = x² + 1", "du = 2x dx", "∫ 2x(x² + 1) dx = ∫ u du", "= u²/2 + C", "= (x² + 1)²/2 + C"], "partial"],
  ["gen:subst:0,3,1,1", ["let u = x² + 1", "du = x dx"], "invalid", 1],
  ["gen:subst:0,3,1,1", ["∫ from 0 to 3 of 2x(x² + 1) dx = 99/2"], "verified"],
  ["gen:auinit:0,6,5,0,60", ["∫ (6x + 5) dx = 3x² + 5x + C", "f(x) = 3x² + 5x + C"], "partial"],
  // a parametric curve x = t², y = t
  ["gen:arparam:1,2,1,1", ["dx/dt = 2t", "dy/dt = 1", "dy/dx = (dy/dt)/(dx/dt) = 1/(2t)"], "verified"],
  ["gen:arparam:1,2,1,1", ["dx/dt = 2t", "dy/dx = 2t"], "invalid", 1],
  // implicit differentiation of 2x² − xy + 5y² = 17
  ["gen:arimpl:2,-1,5,0", ["d/dx(2x² - xy + 5y²) = 0", "4x - y - x dy/dx + 10y dy/dx = 0", "dy/dx = (y - 4x)/(10y - x)"], "verified"],
  ["gen:arimpl:2,-1,5,0", ["4x - y - x dy/dx + 10y dy/dx = 0", "dy/dx = (4x - y)/(10y - x)"], "invalid", 1],
  ["gen:arimpl:2,-1,5,0", ["4x + y - x dy/dx + 10y dy/dx = 0"], "invalid", 0],
  ["gen:arwallis:0,6,0", ["∫ from 0 to π/2 of cos⁶x dx = (5/6)(3/4)(1/2)(π/2)", "= 5π/32"], "verified"],
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
