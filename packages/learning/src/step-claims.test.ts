/** Every listed claim holds for the real released steps and fails for every corrupted stated value. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "./families";
import { STEP_CLAIMS, stepClaimHolds } from "./step-claims";

/** Steps a claim may leave unread (none now: every released step of every claim is read). */
const UNCHECKED_BY_DESIGN = new Set<string>([]);

for (const key of Object.keys(STEP_CLAIMS)) {
  const [fam, op] = key.split("/");
  test(`claim ${key}: true values hold, corrupted values are rejected`, () => {
    let seen = 0;
    const all = pool(fam).items, stride = Math.max(1, Math.floor(all.length / 300));
    for (const p of all.filter((_, i) => i % stride === 0)) { // an even sample across the pool, not just its first problems
      for (const s of p.steps) {
        if (s.op !== op) continue;
        seen++;
        if (UNCHECKED_BY_DESIGN.has(key) && stepClaimHolds(s, p) === null) continue;
        assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
        const n = Number(s.value);
        // soundness: a corrupted value must never be confirmed (false, or null = cannot read, but never true)
        for (const bad of [n + 1, n - 1, n * 2 + 3, "not a number"].filter((b) => b !== n)) assert.notEqual(stepClaimHolds({ ...s, value: Number.isNaN(n) && typeof bad === "number" ? "\u0000" : bad }, p), true, `${p.id} ${s.id} corrupted to ${bad}`);
      }
    }
    assert.ok(seen > 0, `no ${op} steps found in ${fam}`);
  });
}
