/** Claims for unit, money and clock conversions: real steps hold, corrupted stated values are never confirmed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./e-units-conversion";

/** Corrupted versions of a stated value: numbers off by one / doubled / digits swapped; strings with one part changed. */
function corruptions(v: unknown): unknown[] {
  if (typeof v === "number") {
    const rev = Number(String(v).split("").reverse().join(""));
    return [v + 1, v - 1, v * 2 + 3, v + 10, rev === v ? v + 7 : rev, "not a number"];
  }
  if (typeof v !== "string") return ["not a number"];
  const out: unknown[] = ["not a number", ""];
  let m = /^\((\d+), (\d+)\)$/.exec(v);
  if (m) { const a = Number(m[1]), b = Number(m[2]); out.push(`(${a + 1}, ${b})`, `(${a}, ${b + 1})`, `(${a}, ${b + 10})`, `(${a + 24}, ${b})`, `${a} h ${b} min`); return out; }
  m = /^(\d+):(\d\d)$/.exec(v);
  if (m) { const h = Number(m[1]), mi = Number(m[2]); out.push(`${String(h + 1).padStart(2, "0")}:${m[2]}`, `${m[1]}:${String((mi + 1) % 60).padStart(2, "0")}`, `${m[1]}:${String((mi + 10) % 60).padStart(2, "0")}`, `${m[2]}:${m[1]}`, `${h}:${m[2]}`); return out; }
  m = /^(\d+) (\d+)\/(\d+)$/.exec(v);
  if (m) { out.push(`${Number(m[1]) + 1} ${m[2]}/${m[3]}`, `${m[1]} ${Number(m[2]) + 1}/${m[3]}`, `${m[1]} ${m[3]}/${m[2]}`, `${m[2]}/${m[3]}`, `${Number(m[1]) * Number(m[3]) + Number(m[2])}/${m[3]}x`); return out; }
  m = /^(\d+)\/(\d+)$/.exec(v);
  if (m) { out.push(`${Number(m[1]) + 1}/${m[2]}`, `${m[1]}/${Number(m[2]) + 1}`, `${m[2]}/${m[1]}`); return out; }
  m = /^(\d+)(?:\.(\d+))?$/.exec(v);
  if (m) {
    const f = m[2] ?? "", scaled = BigInt(m[1] + f) , dp = f.length;
    const show = (n: bigint) => { const s = n.toString().padStart(dp + 1, "0"); return dp ? `${s.slice(0, -dp)}.${s.slice(-dp)}` : s; };
    out.push(show(scaled + 1n), show(scaled > 0n ? scaled - 1n : scaled + 2n), show(scaled * 10n), show(scaled + 10n ** BigInt(dp)), `${v}0`, `${v}1`);
    if (dp) out.push(m[1] + f); // decimal point dropped
    return out;
  }
  return out;
}

for (const key of Object.keys(CLAIMS)) {
  const [fam, ...rest] = key.split("/"), op = rest.join("/");
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    let seen = 0, bad = 0;
    for (const p of pool(fam).items.slice(0, 150)) {
      for (const s of p.steps) {
        if (s.op !== op) continue;
        seen++;
        assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
        for (const c of corruptions(s.value)) {
          if (c === s.value || (typeof c === "number" && c < 0)) continue;
          // a stated number written another way (e.g. "3.3" for 3.30) is still the same number, not a corruption
          const asNum = typeof c === "string" && /^\d+(\.\d+)?$/.test(c) && typeof s.value !== "number" ? Number(c) : NaN;
          if (typeof s.value === "string" && /^\d+(\.\d+)?$/.test(s.value) && asNum === Number(s.value)) continue;
          bad++;
          const got = stepClaimHolds({ ...s, value: c as never }, p);
          assert.notEqual(got, true, `${p.id} ${s.id} ${JSON.stringify(s.value)} corrupted to ${JSON.stringify(c)} was confirmed`);
        }
      }
    }
    assert.ok(seen > 0, `no ${op} steps found in ${fam}`);
    assert.ok(bad > 0);
  });
}

test("a stated value that is not a number or text of the right shape is never confirmed", () => {
  for (const key of Object.keys(CLAIMS)) {
    const [fam, ...rest] = key.split("/"), op = rest.join("/");
    const p = pool(fam).items.find((q) => q.steps.some((s) => s.op === op))!;
    for (const s of p.steps.filter((x) => x.op === op)) {
      for (const bogus of [null, undefined, true, [1], {}, "(1, 2, 3)", "abc"]) {
        assert.notEqual(stepClaimHolds({ ...s, value: bogus as never }, p), true, `${key} ${s.id} ${JSON.stringify(bogus)}`);
      }
    }
  }
});

test("claims return null (unchecked) when the prompt cannot be read", () => {
  for (const key of Object.keys(CLAIMS)) {
    const [fam, ...rest] = key.split("/"), op = rest.join("/");
    const p = pool(fam).items.find((q) => q.steps.some((s) => s.op === op))!;
    const s = p.steps.find((x) => x.op === op)!;
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unreadable", figure: undefined, options: undefined }), null, key);
  }
});

test("claims return null when a step's inputs disagree with the prompt", () => {
  let n = 0;
  for (const key of Object.keys(CLAIMS)) {
    const [fam, ...rest] = key.split("/"), op = rest.join("/");
    for (const p of pool(fam).items.slice(0, 40)) for (const s of p.steps) {
      if (s.op !== op || typeof s.inputs[0] !== "number") continue;
      const got = stepClaimHolds({ ...s, inputs: [s.inputs[0] + 1, ...s.inputs.slice(1)] }, p);
      assert.notEqual(got, true, `${key} ${p.id} ${s.id}`);
      n++;
    }
  }
  assert.ok(n > 50);
});
