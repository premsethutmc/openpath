/** working-steps@1: a child's working is checked line by line, and a line that starts with "=" carries on from the one before. */
import { describe, expect, test } from "bun:test";
import { checkLines } from "./working.ts";

describe("checkLines", () => {
  test("a slip on a continued line is caught, never ticked", () => {
    expect(checkLines(["94 × 7 = 90 × 7 + 4 × 7", "= 630 + 28", "= 648"]).map((r) => r.state)).toEqual(["right", "right", "wrong"]);
    expect(checkLines(["94 × 7 = 90 × 7 + 4 × 7", "= 630 + 28", "= 658"]).map((r) => r.state)).toEqual(["right", "right", "right"]);
  });
  test("a continued first line has nothing to carry on from", () => {
    expect(checkLines(["= 648"])[0].state).toBe("unreadable");
  });
});
