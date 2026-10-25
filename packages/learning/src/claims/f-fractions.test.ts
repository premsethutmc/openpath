/** Each claim holds for real steps and rejects corrupted stated values. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./f-fractions";

const bump = (f: string, dn: number, dd: number) => f.replace(/(\d+)\/(\d+)/, (_m, a, b) => `${Number(a) + dn}/${Number(b) + dd}`);

/** Wrong stated values for a real step: off by one, swapped, wrong common bottom, wrong type. */
function corrupt(key: string, v: unknown, p: any): unknown[] {
  const wrongType = ["not a number", null, {}];
  if (typeof v === "number") {
    const base = [v + 1, v - 1, v * 2 + 3, ...wrongType];
    return key === "aedec/place" ? [...base, v + 0.01, v * 10] : key === "avfwq/evaluate" ? [...base, v + 0.001] : base;
  }
  const s = String(v);
  switch (key) {
    case "adford/order":
    case "adfordu/order": {
      const f = s.slice(1, -1).split(", ");
      return [`(${[f[1], f[0], f[2]].join(", ")})`, `(${[f[0], f[2], f[1]].join(", ")})`, `(${[...f].reverse().join(", ")})`, `(${f.join(", ")}`, `(${[bump(f[0], 1, 0), f[1], f[2]].join(", ")})`, `(${[f[0], f[1], bump(f[2], 0, 1)].join(", ")})`, "not a number"];
    }
    case "adfordu/convert": {
      const f = s.split(", ");
      const L = f[0].split("/")[1];
      return [[f[1], f[0], f[2]].join(", "), [bump(f[0], 1, 0), f[1], f[2]].join(", "), f.map((x) => x.replace(/\/\d+$/, `/${Number(L) * 2}`)).join(", "), f.map((x) => bump(x, 0, 1)).join(", "), f.slice(0, 2).join(", "), "not a number"];
    }
    case "adfcmpu/convert": {
      const [x, y] = s.split(" and ");
      const L = x.split("/")[1];
      return [`${y} and ${x}`, `${bump(x, 1, 0)} and ${y}`, `${x} and ${bump(y, 0, 1)}`, `${x.replace(/\/\d+$/, `/${Number(L) * 2}`)} and ${y.replace(/\/\d+$/, `/${Number(L) * 2}`)}`, x, "not a number"];
    }
    case "agclass/classify":
      return ["a proper fraction", "a mixed number", "an improper fraction"].filter((k) => k !== s).concat(["not a number", "0", ""]);
    case "avfold/evaluate":
      return [bump(s, 1, 0), bump(s, 0, 1), bump(s, 1, 1), s.replace(/(\d+)\/(\d+)/, "$2/$1"), "1/1", "not a number"];
    case "adfnl/compare": {
      const other = (p.prompt.match(/1\/\d+/g) as string[]).find((f) => f !== s)!;
      return [other, bump(s, 1, 0), bump(s, 0, 1), "not a number"];
    }
    case "aedec/add":
      return [bump(s, 0, 0) + "1", String(Number(s) + 0.01), String(Number(s) + 0.1), String(Number(s) + 1), String(Number(s) * 10), "not a number"];
    default:
      return [s + "x", "not a number"];
  }
}

for (const key of Object.keys(CLAIMS)) {
  const [fam, op] = key.split("/");
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    let seen = 0;
    const items = pool(fam).items;
    // sample ~100 evenly across the pool so every prompt shape is met
    const stride = Math.max(1, Math.floor(items.length / 100));
    for (let i = 0; i < items.length; i += stride) {
      const p = items[i];
      for (const s of p.steps) {
        if (s.op !== op) continue;
        seen++;
        assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
        for (const bad of corrupt(key, s.value, p)) {
          if (JSON.stringify(bad) === JSON.stringify(s.value)) continue;
          assert.notEqual(stepClaimHolds({ ...s, value: bad as any }, p), true, `${p.id} ${s.id} corrupted to ${JSON.stringify(bad)}`);
        }
      }
    }
    assert.ok(seen > 0);
  });
}
