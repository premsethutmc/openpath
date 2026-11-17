import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWorkingLines } from "../../../packages/learning/src/line-check";
import { MORE_KEYS, typeKey } from "./working-keys";

// a key press for a key on the pad, plain typing for anything else
const keys = (...ks: string[]) => ks.reduce((line, k) => (/^\d+$/.test(k) ? `${line}${k}` : typeKey(line, k)), "");

test("the keys under the working box: a power sits against its base, and what they type is read", () => {
  assert.ok(MORE_KEYS.includes("³") && MORE_KEYS.includes("^"), "there is a cube key and a general power key");
  assert.equal(keys("8", "×", "4", "×", "3", "³", "=", "864"), "8 × 4 × 3³ = 864");
  assert.equal(keys("32", "x", "^", "3"), "32 x^3");
  assert.equal(keys("(", "x", "+", "1", ")", "²"), "(x + 1)²");
  assert.equal(keys("√", "16", "+", "2", "^", "5"), "√16 + 2^5");
  // f(x) = 8x⁴, f′(3): the lines a learner would type with these keys are ticked
  assert.deepEqual(checkWorkingLines(["8 × 4 × 3³ = 864", "32 × 3^3 = 864", "32 × 27 = 864", "8 × 4 × 3³ = 96"]).map((l) => l.state), ["right", "right", "right", "wrong"]);
});
