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

import { assessWorking } from "./grading/working.ts";
describe("continued-lines@1 (server)", () => {
  test("the server's checker reads '= …' as carrying on from the line before; the learner's text is kept", () => {
    const right = assessWorking("gen:mmul:94,7", ["94 × 7 = 90 × 7 + 4 × 7", "= 630 + 28", "= 658"], "correct", "658")!;
    expect(right.status).toBe("verified");
    expect(right.lines.map((l) => l.text)).toEqual(["94 × 7 = 90 × 7 + 4 × 7", "= 630 + 28", "= 658"]);
    const slip = assessWorking("gen:mmul:94,7", ["94 × 7 = 90 × 7 + 4 × 7", "= 630 + 28", "= 648"], "incorrect", "648")!;
    expect(slip.status).toBe("invalid"); expect(slip.firstInvalid?.index).toBe(2);
  });
});
