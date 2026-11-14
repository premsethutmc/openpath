/** practice-focus@1: right-but-slow skills and the same slip across different skills, from first unaided answers only. */
import { describe, expect, test } from "bun:test";
import { fluencyNeeds, slipPatterns } from "./practice-focus.ts";
import type { Attempt } from "./records.ts";

let k = 0;
const at = (questionId: string, response: string, competency: string, extra: Partial<Attempt> = {}): Attempt =>
  ({ id: `a${++k}`, at: new Date(Date.UTC(2026, 10, 1, 0, k)).toISOString(), session: "s", questionId, response, activity: "practice", hints: 0, solution: false, competency, n: 1, ...extra } as Attempt);

describe("fluency", () => {
  const right = () => true, expected = () => 10;
  test("right but usually over 1.75× the expected time on a fact skill: practise for speed", () => {
    const xs = [30, 25, 28, 9].map((s) => at("q", "1", "MATH.number.multiplication-tables", { ms: s * 1000 }));
    expect(fluencyNeeds(xs, right, expected)).toEqual([{ competency: "MATH.number.multiplication-tables", timed: 4, ratio: 2.8 }]);
  });
  test("quick enough, too few timed answers, helped answers or a skill where speed is not the point: nothing", () => {
    expect(fluencyNeeds([9, 11, 12].map((s) => at("q", "1", "MATH.number.multiplication-tables", { ms: s * 1000 })), right, expected)).toEqual([]);
    expect(fluencyNeeds([30].map((s) => at("q", "1", "MATH.number.multiplication-tables", { ms: s * 1000 })), right, expected)).toEqual([]);
    expect(fluencyNeeds([30, 30, 30].map((s) => at("q", "1", "MATH.number.multiplication-tables", { ms: s * 1000, hints: 1 })), right, expected)).toEqual([]);
    expect(fluencyNeeds([30, 30, 30].map((s) => at("q", "1", "MATH.geometry.angles", { ms: s * 1000 })), right, expected)).toEqual([]);
  });
});

describe("slip patterns", () => {
  test("forgetting to carry in two different skills is one pattern; one skill alone is not", () => {
    // 94 × 7: 638 is the carry left out (long multiplication)
    const one = [at("gen:mmul:94,7", "638", "MATH.number.multi-multiplication"), at("gen:mmul:94,7", "638", "MATH.number.multi-multiplication")];
    expect(slipPatterns(one)).toEqual([]);
    const fake = (id: string) => ({ id, competency: "x", type: "integer", prompt: "", answer: "1", misconceptions: [{ when: "2", hypothesis: "procedural", says: "The ten carried from the ones was not added.", id: "no-carry" }] } as never);
    const two = [...one, at("q:add", "2", "MATH.number.multi-digit-add-subtract")];
    const pats = slipPatterns(two, (id) => (id === "q:add" ? fake(id) : (require("./content.ts").question(id))));
    expect(pats.map((p) => [p.id, p.skills.length, p.count])).toEqual([["carrying", 2, 3]]);
  });
});
