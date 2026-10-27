/** Each claim holds for real steps and rejects corrupted stated values. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./d-compare-fractions-misc";

const corrupt = (v: unknown, p: any): unknown[] => {
  if (typeof v === "number") return [v + 1, v - 1, v * 2 + 3, "not a number"];
  const s = String(v);
  const m = s.match(/^(\d+)\/(\d+)$/);
  if (m) {
    const other = (p.prompt.match(/(\d+)\/(\d+)/g) as string[]).find((f) => f !== s);
    return [other, `${Number(m[1]) + 1}/${m[2]}`, "not a number"];
  }
  return [s + "x", "1/1 and 1/1", "not a number"];
};

for (const key of Object.keys(CLAIMS)) {
  const [fam, op] = key.split("/");
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    let seen = 0;
    for (const p of pool(fam).items.slice(0, 100)) {
      for (const s of p.steps) {
        if (s.op !== op) continue;
        seen++;
        assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
        let bads = corrupt(s.value, p);
        if (fam === "avlike") bads = p.options!.filter((o) => o !== s.value).concat(["not a pair"]);
        if (fam === "aeangk") bads = [0, 1, 2, 3].filter((i) => i !== s.value).concat([9, "acute"] as any);
        for (const bad of bads) assert.equal(stepClaimHolds({ ...s, value: bad as any }, p), false, `${p.id} ${s.id} corrupted to ${bad}`);
      }
    }
    assert.ok(seen > 0);
  });
}
