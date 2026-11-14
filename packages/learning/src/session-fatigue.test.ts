/** session-fatigue@1: a sitting going downhill against its own start suggests a break; nothing else does. */
import { describe, expect, test } from "bun:test";
import { sitting, tiring } from "./session-fatigue.ts";
import type { Attempt } from "./records.ts";

const t0 = Date.parse("2026-11-14T10:00:00Z");
const at = (i: number, ok: boolean, ms = 10_000, gapMin = 1): Attempt & { ok: boolean } =>
  ({ id: `a${i}`, at: new Date(t0 + i * gapMin * 60_000).toISOString(), session: "s", questionId: "q", response: ok ? "r" : "w", activity: "practice", hints: 0, solution: false, competency: "c", n: 1, ms, ok } as never);
const right = (a: Attempt) => (a as Attempt & { ok: boolean }).ok;

describe("session-fatigue@1", () => {
  test("mostly right at the start, then three of the last four wrong: a break", () => {
    expect(tiring([...[1, 2, 3, 4, 5, 6].map((i) => at(i, true)), at(7, false), at(8, false), at(9, true), at(10, false)], right)).toBe("wrong");
  });
  test("much slower at the end than at the start: a break", () => {
    expect(tiring([...[1, 2, 3, 4, 5, 6].map((i) => at(i, true, 10_000)), ...[7, 8, 9, 10].map((i) => at(i, true, 30_000))], right)).toBe("slow");
  });
  test("too few answers, steady work, or wrong from the start (that is the skill, not tiredness): no break", () => {
    expect(tiring([1, 2, 3].map((i) => at(i, false)), right)).toBeNull();
    expect(tiring([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => at(i, i % 3 !== 0)), right)).toBeNull();
    expect(tiring([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => at(i, false)), right)).toBeNull();
  });
  test("a gap of more than twenty minutes starts a new sitting", () => {
    const xs = [at(1, true), at(2, true), { ...at(3, true), at: new Date(t0 + 90 * 60_000).toISOString() } as Attempt];
    expect(sitting(xs).length).toBe(1);
  });
});
