import assert from "node:assert/strict";
import { test } from "node:test";
import { fit } from "../scripts/presentation-fit";

const base = { competency: "MATH.geometry.angles", type: "integer" as const };
test("presentation-fit@1: the angle table question is a pick shown twice and typed", () => {
  const f = fit({ ...base, prompt: "The table gives the sizes of four angles: P = 180°, Q = 30°, R = 90°, S = 150°. Which one is a straight angle? Write its size in degrees.", answer: "180", figure: { type: "table", rows: [["P", "Q", "R", "S"], [180, 30, 90, 150]] } }, 5);
  assert.deepEqual(f.sort(), ["data-twice", "pick-but-typed"]);
});
test("presentation-fit@1: a short plain question raises nothing, and a missing-value ? is not a second question", () => {
  assert.deepEqual(fit({ ...base, competency: "MATH.number.addition", prompt: "Work it out in your head: 11 + ? = 100. What is the missing number?", answer: "89" }, 5), []);
});
test("presentation-fit@1: a shape named without a picture is flagged, a square number is not", () => {
  assert.deepEqual(fit({ ...base, type: "choice" as const, prompt: "An angle measures 5°. What kind of angle is it?", answer: "A", options: ["acute", "right"] }, 5), ["shape-without-picture"]);
  assert.deepEqual(fit({ ...base, prompt: "What is the 3rd square number?", answer: "9" }, 5), []);
});
