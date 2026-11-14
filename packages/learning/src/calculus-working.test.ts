/** calculus-working@1: typed calculus working on real questions is judged line by line: right working passes, the first
 * wrong line is found, and what the checker cannot read is left unchecked (never called right). */
import { describe, expect, test } from "bun:test";
import { calculusWorking } from "./grading/calculus-working.ts";
import { calculusTaskOf } from "./calculus-task.ts";
import type { WorkingAssessment } from "./grading/working.ts";

const base = { status: "unsupported", lines: [], methodEvidence: "no-method-evidence" } as unknown as WorkingAssessment;
const judge = (qid: string, lines: string[]) => calculusWorking(qid, lines, base, 20000);
type Case = [qid: string, lines: string[], status: string, firstWrong?: number];

const CASES: Case[] = [
  // derivatives: product, chain, quotient, second derivative
  ["gen:dprod:2,1,1,1", ["dy/dx = 2 cos(x) + 2x(-sin(x))", "= 2 cos(x) - 2x sin(x)"], "verified"],
  ["gen:dprod:2,1,1,1", ["dy/dx = 2 cos(x) + 2x sin(x)", "= 2 cos(x) - 2x sin(x)"], "invalid", 0],
  ["gen:audch:0,3,1,5", ["dy/dx = 5(3x + 1)^4 * 3", "= 15(3x + 1)^4"], "verified"],
  ["gen:audch:0,3,1,5", ["dy/dx = 5(3x + 1)^4", "= 15(3x + 1)^4"], "invalid", 0],
  ["gen:audquo:0,2,-6,1,-6", ["dy/dx = (2(x - 6) - (2x - 6))/(x - 6)^2", "= (2x - 12 - 2x + 6)/(x - 6)^2", "= -6/(x - 6)^2"], "verified"],
  ["gen:audquo:0,2,-6,1,-6", ["dy/dx = (2(x - 6) - (2x - 6))/(x - 6)^2", "= (2x - 12 - 2x - 6)/(x - 6)^2", "= -18/(x - 6)^2"], "invalid", 1],
  // integrals: by parts with an integral still to do in the middle line, a plain antiderivative, a slip
  ["gen:auparts:0,4,0,2", ["∫ 2x e^(4x) dx = (1/2) x e^(4x) - ∫ (1/2) e^(4x) dx", "= (1/2) x e^(4x) - (1/8) e^(4x) + C"], "verified"],
  ["gen:auparts:0,4,0,2", ["∫ 2x e^(4x) dx = (1/2) x e^(4x) - ∫ (1/2) e^(4x) dx", "= (1/2) x e^(4x) - (1/4) e^(4x) + C"], "invalid", 1],
  ["gen:austd:0,1,3,-1,6", ["∫ (3x^6 - sin(x)) dx = (3/7)x^7 + cos(x) + C"], "verified"],
  ["gen:austd:0,1,3,-1,6", ["∫ (3x^6 - sin(x)) dx = (3/7)x^7 - cos(x) + C"], "invalid", 0],
  // definite integrals
  ["gen:subst:0,3,1,1", ["∫ from 0 to 3 of 2x(x^2 + 1) dx = [(x^2 + 1)^2 / 2] from 0 to 3", "= 100/2 - 1/2", "= 99/2"], "verified"],
  ["gen:audfp:0,-1,7,0,3", ["∫ from 0 to 3 of (-x + 7) dx = [-x^2/2 + 7x] from 0 to 3", "= -9/2 + 21", "= 33/2"], "verified"],
  ["gen:audfp:0,-1,7,0,3", ["∫ from 0 to 3 of (-x + 7) dx = [-x^2/2 + 7x] from 0 to 3", "= -9/2 + 21", "= 35/2"], "invalid", 2],
  // calculus-notation@1: sin⁻¹, cos⁻¹, √, cot, aˣ written the way the questions write them
  ["gen:audinv:0,7,5", ["dy/dx = 5 · 1/√(1 − (x/7)²) · 1/7", "= 5/√(49 − x²)"], "verified"],
  ["gen:audinv:0,7,5", ["dy/dx = 5 · 1/√(1 − (x/7)²) · 1/7", "= 5/(7√(49 − x²))"], "invalid", 1],
  ["gen:audinv:0,7,5", ["dy/dx = 5/√(49 − x²)"], "verified"],
  ["gen:audinv:1,5,3:mc", ["dy/dx = −3/√(25 − x²)"], "verified"],
  ["gen:audinv:1,5,3:mc", ["dy/dx = 3/√(25 − x²)"], "invalid", 0],
  ["gen:audel:1,3,5,1", ["dy/dx = 5 · 3^x log 3"], "verified"],
  ["gen:audel:1,3,5,1", ["dy/dx = 5 · 3^x"], "invalid", 0],
  ["gen:aupi:1,7,1", ["∫ from 0 to 7/2 of 1/√(49 − x²) dx = [sin⁻¹(x/7)] from 0 to 7/2", "= sin⁻¹(1/2) − sin⁻¹(0)", "= π/6"], "verified"],
  ["gen:aupi:1,7,1", ["∫ from 0 to 7/2 of 1/√(49 − x²) dx = [sin⁻¹(x/7)] from 0 to 7/2", "= π/3"], "invalid", 1],
  // log|x + 3 + √(…)| needs cancelling a radical between numerator and denominator: left unchecked, never called right
  ["gen:auform:2,2,3,1,0", ["∫ 1/√(x² + 6x + 13) dx = ∫ 1/√((x + 3)² + 4) dx", "= log|x + 3 + √(x² + 6x + 13)| + C"], "unsupported"],
  ["gen:audinv:0,7,5", ["dy/dx = 5 · 1/√(1 − (x/7)²) · 1/7", "y = 5 sin⁻¹(x/7) so dy/dx = 5/√(49 − x²)"], "unsupported"],
  ["gen:arlhinf:2,1,1", ["lim (x→0) x cot x = lim (x→0) x cos x / sin x", "= 1"], "verified"],
  // limits
  ["gen:lim:4,1", ["lim (x→4) (x^2 - 16)/(x - 4) = lim (x→4) (x - 4)(x + 4)/(x - 4)", "= lim (x→4) (x + 4)", "= 8"], "verified"],
  ["gen:aulpow:1,1,1,-2,-3", ["lim (x→-2) (x^2 - x - 6)/(x^2 - 4) = lim (x→-2) (x - 3)/(x - 2)", "= 5/4"], "verified"],
  ["gen:lim:4,1", ["lim (x→4) (x^2 - 16)/(x - 4) = lim (x→4) (x - 4)(x + 4)/(x - 4)", "= lim (x→4) (x - 4)", "= 0"], "invalid", 1],
  // a long derivation: every line is checked, however many there are
  ["gen:dprod:2,1,1,1", ["dy/dx = 2 cos(x) + 2x(-sin(x))", ...Array.from({ length: 38 }, () => "= 2 cos(x) - 2x sin(x)"), "= 2 cos(x) - 2x sin(x)"], "verified"],
  // words only: not checked, never called right
  ["gen:dprod:2,1,1,1", ["use the product rule then tidy up"], "unsupported"],
];

describe("calculus-working@1", () => {
  test("the tasks are read from the questions' wording", () => {
    for (const [qid] of CASES) expect(calculusTaskOf(qid)).not.toBeNull();
  });
  for (const [qid, lines, status, firstWrong] of CASES) {
    test(`${qid}: ${lines.at(-1)} → ${status}`, async () => {
      const w = await judge(qid, lines);
      // a wrong line must be found; words must never be marked right
      if (status === "invalid") { expect(w.status).toBe("invalid"); expect(w.firstInvalid?.index).toBe(firstWrong!); }
      else if (status === "unsupported") expect(["unsupported", "partial"]).toContain(w.status);
      else expect(w.status).toBe(status as WorkingAssessment["status"]);
      expect(w.lines.length).toBe(lines.length);
    }, 30000);
  }
});
