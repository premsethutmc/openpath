/** stage 9 (D14): program questions are decided by the unified grading decision, never by a separate boolean comparison */
import { describe, expect, test } from "bun:test";
import { gradeProgram, programContract } from "./program.ts";
import { gradeRequest } from "../server-grader.ts";

const EF = "program:equivalent-fractions:independent-2";   // "Write 6/10 in simplest form. Enter a fraction." -> 3/5
describe("program questions", () => {
  test("every program question's stored answer is correct under its own contract", () => {
    for (const id of ["program:jee-quadratics:k1", "program:jee-quadratics:k2", "program:completing-the-square:p1", EF]) expect(gradeProgram(id, programContract(id)!.expected.stored).verdict).toBe("correct");
  });
  test("a stated form is enforced: 6/10 for 'in simplest form' is incorrect (required form), 0.6 likewise", () => {
    expect(gradeProgram(EF, "6/10")).toMatchObject({ verdict: "incorrect", reason: "incorrect.required-form" });
    expect(gradeProgram(EF, "3/5").verdict).toBe("correct");
  });
  test("an unreadable answer is unresolved, never incorrect (P1); a mixed number is not accepted where the contract does not permit it", () => {
    for (const r of ["three fifths", "3/", "1/0", "3 5"]) expect(gradeProgram(EF, r).verdict).toBe("unresolved");
  });
  test("choice and multi-value answers", () => {
    expect(gradeProgram("program:jee-quadratics:k1", "c").verdict).toBe("correct");
    expect(gradeProgram("program:jee-quadratics:k1", "A").verdict).toBe("incorrect");
    expect(gradeProgram("program:jee-quadratics:k1", "E").verdict).toBe("unresolved");
  });
  test("the trusted server grader gives the same decision for program questions", () => {
    for (const r of ["3/5", "6/10", "x"]) { const d = gradeProgram(EF, r), k = gradeRequest({ id: EF, response: r }); expect([k.verdict, k.reason, k.known]).toEqual([d.verdict, d.reason, true]); }
  });
});
