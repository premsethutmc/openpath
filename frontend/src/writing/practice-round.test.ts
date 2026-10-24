import { test } from "node:test";
import assert from "node:assert/strict";
import { practiceParameters } from "./practice-round";
test("paper and answer modes reuse the unchanged practice variations", () => {
  for (let round = 0; round <= 99; round++) {
    assert.deepEqual(
      practiceParameters("division", { dividend: 379, divisor: 3 }, round),
      { dividend: 379 + round * 3, divisor: 3 },
    );
    const base = { groups: 4, size: 6 };
    assert.deepEqual(
      practiceParameters("multiplication", base, round),
      round ? { groups: 4, size: 1 + ((5 + round) % 12) } : base,
    );
    assert.deepEqual(
      practiceParameters("fraction", { numerator: 1, denominator: 2 }, round),
      round
        ? { numerator: round + 1, denominator: round + 2 }
        : { numerator: 1, denominator: 2 },
    );
  }
});
