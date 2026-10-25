/** Claims for units, time and money: real steps hold, corrupted stated values are rejected. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./a-units-time-money";

/** Corrupted versions of a stated value: numbers off by one / doubled / digits swapped; tuples and times with one part changed. */
function corruptions(v: unknown): unknown[] {
  if (typeof v === "number") return [v + 1, v - 1, v * 2 + 3, v + 10, Number(String(v).split("").reverse().join("")) === v ? v + 7 : Number(String(v).split("").reverse().join("")), "not a number"];
  if (typeof v !== "string") return ["not a number"];
  const out: unknown[] = ["not a number", ""];
  let m = /^\((\d+), (\d+)\)$/.exec(v);
  if (m) { const [a, b] = [Number(m[1]), Number(m[2])]; out.push(`(${a + 1}, ${b})`, `(${a}, ${b + 1})`, `(${a}, ${b + 10})`, `(${b}, ${a})`.replace(/^\((\d+), (\d+)\)$/, (_x, p, q) => (p === String(a) ? `(${a}, ${b + 5})` : `(${p}, ${q})`)), `${a} h ${b} min`); return out; }
  m = /^(\d{1,2}):(\d\d)( [ap]\.m\.)?$/.exec(v);
  if (m) {
    const [h, mi, sfx] = [Number(m[1]), Number(m[2]), m[3] ?? ""];
    const pad = (n: number) => String(n).padStart(m![1].length, "0");
    out.push(`${pad(h + 1)}:${m[2]}${sfx}`, `${m[1]}:${String((mi + 1) % 60).padStart(2, "0")}${sfx}`, `${m[1]}:${String((mi + 10) % 60).padStart(2, "0")}${sfx}`, `${m[1]}:${m[2]}${sfx ? (sfx.includes("p") ? " a.m." : " p.m.") : ""}`.replace(/^(.*)$/, (x) => (sfx ? x : `${pad(h)}:${String((mi + 30) % 60).padStart(2, "0")}`)), `${m[2]}:${m[1]}${sfx}`);
    return out;
  }
  return out;
}

for (const key of Object.keys(CLAIMS)) {
  const [fam, op] = key.split("/");
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    let seen = 0, bad = 0;
    for (const p of pool(fam).items.slice(0, 120)) {
      for (const s of p.steps) {
        if (s.op !== op) continue;
        seen++;
        assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
        for (const c of corruptions(s.value)) {
          if (c === s.value || (typeof c === "number" && c < 0)) continue;
          bad++;
          assert.equal(stepClaimHolds({ ...s, value: c as never }, p), false, `${p.id} ${s.id} ${JSON.stringify(s.value)} corrupted to ${JSON.stringify(c)}`);
        }
      }
    }
    assert.ok(seen >= 100 || seen > 0, `no ${op} steps found in ${fam}`);
    assert.ok(bad > 0);
  });
}

test("claims return null (unchecked) when the prompt cannot be read", () => {
  for (const key of Object.keys(CLAIMS)) {
    const [fam, op] = key.split("/");
    const p = pool(fam).items.find((q) => q.steps.some((s) => s.op === op))!;
    const s = p.steps.find((x) => x.op === op)!;
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unreadable", options: undefined }), null, key);
  }
});
