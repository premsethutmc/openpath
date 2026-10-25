/** Every listed claim holds for the real released steps and fails for every corrupted stated value. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "./families";
import { STEP_CLAIMS, stepClaimHolds } from "./step-claims";

for (const key of Object.keys(STEP_CLAIMS)) {
  const [fam, op] = key.split("/");
  test(`claim ${key}: true values hold, corrupted values are rejected`, () => {
    let seen = 0;
    for (const p of pool(fam).items.slice(0, 300)) {
      for (const s of p.steps) {
        if (s.op !== op) continue;
        seen++;
        assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
        const n = Number(s.value);
        for (const bad of [n + 1, n - 1, n * 2 + 3]) assert.equal(stepClaimHolds({ ...s, value: bad }, p), false, `${p.id} ${s.id} corrupted to ${bad}`);
        assert.equal(stepClaimHolds({ ...s, value: "not a number" }, p), false);
      }
    }
    assert.ok(seen > 0, `no ${op} steps found in ${fam}`);
  });
}
