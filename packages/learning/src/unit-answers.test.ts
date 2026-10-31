/** Authored units use the same answer rules as the learning questions (answer-core.ts); only the unit's own shapes (fields) are unit-specific. */
import { describe, expect, test } from "bun:test";
import { isCorrect as unitCorrect, normalise } from "../../mathematics/src/unit.ts";
import { isCorrect } from "./content.ts";

const U = (type: string, answer: string, extra: object = {}) => ({ id: "t", type, answer, prompt: "", ...extra }) as any;
describe("unit answers share the integer/set/tuple semantics", () => {
  test("integer and decimal-equivalent", () => {
    const q = U("integer", "5");
    for (const r of ["5", "5.0", "+5", "5.", " 5 "]) expect(unitCorrect(q, r)).toBe(true);
    for (const r of ["5.5", "6", "five", "", "5,0"]) expect(unitCorrect(q, r)).toBe(false);
    for (const r of ["5.0", "5", "5.5", "five", "1e3"]) expect(unitCorrect(q, r)).toBe(isCorrect({ type: "integer", answer: "5" }, r));   // identical verdicts: one rule
  });
  test("unordered values are a set, ordered values a tuple", () => {
    const set = U("values", "2,3", { fields: [{}, {}], unordered: true }), tup = U("values", "2,3", { fields: [{}, {}] });
    expect(unitCorrect(set, "3,2")).toBe(true); expect(unitCorrect(tup, "3,2")).toBe(false); expect(unitCorrect(tup, "2,3")).toBe(true);
    expect(unitCorrect(set, "2,4")).toBe(false); expect(unitCorrect(set, "2")).toBe(false);
    expect(unitCorrect(U("values", "1/2,3", { fields: [{}, {}], unordered: true }), "3,2/4")).toBe(true);
  });
  test("unreadable input is not an answer (null), never a wrong answer value", () => {
    for (const r of ["four", "x=", "2,,3", "1/0"]) { expect(normalise(U("integer", "5"), r)).toBeNull(); }
    expect(normalise(U("fraction", "1/2"), "1/0")).toBeNull(); expect(normalise(U("choice", "B"), "E")).toBeNull();
  });
});
