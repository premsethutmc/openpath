import { expect, test } from "bun:test";
import { fit } from "../scripts/presentation-fit";

const base = { competency: "MATH.geometry.angles", type: "integer" as const };
test("presentation-fit@1: the angle table question is a pick shown twice and typed", () => {
  const f = fit({ ...base, prompt: "The table gives the sizes of four angles: P = 180°, Q = 30°, R = 90°, S = 150°. Which one is a straight angle? Write its size in degrees.", answer: "180", figure: { type: "table", rows: [["P", "Q", "R", "S"], [180, 30, 90, 150]] } }, 5);
  expect(f.sort()).toEqual(["data-twice", "pick-but-typed"]);
});
test("presentation-fit@1: a short plain question raises nothing, and a missing-value ? is not a second question", () => {
  expect(fit({ ...base, competency: "MATH.number.addition", prompt: "Work it out in your head: 11 + ? = 100. What is the missing number?", answer: "89" }, 5)).toEqual([]);
});
test("presentation-fit@1: a shape named without a picture is flagged, a square number is not", () => {
  expect(fit({ ...base, type: "choice" as const, prompt: "An angle measures 5°. What kind of angle is it?", answer: "A", options: ["acute", "right"] }, 5)).toEqual(["shape-without-picture"]);
  expect(fit({ ...base, prompt: "What is the 3rd square number?", answer: "9" }, 5)).toEqual([]);
});
test("pick@1: the angle question is tapped from pictures, graded as the typed size, and no longer flagged", async () => {
  const { question } = await import("./content");
  const { pool } = await import("./families");
  for (const it of pool("aeang").items.slice(0, 40)) {
    const q = question(it.id);
    expect(q.figure?.type).toBe("angles");
    expect(q.picks?.filter((x) => x.value === q.answer).length).toBe(1);
    expect(fit(q, 5)).toEqual([]);
  }
});
