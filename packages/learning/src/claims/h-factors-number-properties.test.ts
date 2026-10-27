/** h-factors-number-properties claims: real steps hold, corrupted stated values are never confirmed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./h-factors-number-properties";

const bumpDigit = (s: string, last: boolean): string | null => {
  const idx = [...s.matchAll(/\d/g)].map((m) => m.index as number);
  if (!idx.length) return null;
  const i = last ? idx[idx.length - 1] : idx[0];
  return s.slice(0, i) + String((Number(s[i]) + 1) % 10) + s.slice(i + 1);
};
// values that keep the same meaning when re-ordered (roots of an equation)
const ORDER_FREE = new Set(["anquad/factorise"]);

const corruptions = (key: string, v: unknown, inputs: readonly unknown[]): unknown[] => {
  const out: unknown[] = ["not a number", "", "x", null, {}, [], true];
  if (typeof v === "number") {
    out.push(v + 1, v - 1, -v, v * 2 + 3, v + 10, [v], "1/0");
  } else if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) out.push(v.filter((_, j) => j !== i));
    out.push([...v, (v.length ? Number(v[v.length - 1]) : 0) + 1], [...v, v[0] ?? 1], v.map((x, i) => (i === 0 ? Number(x) + 1 : x)), [0, ...v]);
    if (v.length > 1 && !ORDER_FREE.has(key)) out.push([...v].reverse());
    out.push(v.slice(1).concat(v.slice(0, 1)));
  } else if (typeof v === "string") {
    for (const b of [bumpDigit(v, false), bumpDigit(v, true)]) if (b) out.push(b);
    out.push(v + "!", v.toLowerCase() === v ? v.toUpperCase() : v.toLowerCase(), v.slice(1), v.slice(0, -1));
    for (const ch of ["+", "−", "×", "÷", "="]) if (v.includes(ch)) for (const r of ["+", "−", "×", "÷", "="]) if (r !== ch) out.push(v.replace(ch, r));
    if (v.includes("−")) out.push(v.replace("−", ""));
    if (v.includes(", ")) out.push(v.split(", ").slice(1).join(", "), v.split(", ").map((x) => (x.startsWith("−") ? x.slice(1) : "−" + x)).join(", "));
    for (const i of inputs) if (typeof i === "string" && i !== v) out.push(i);
    if (key.startsWith("aghlw")) out.push(v === "HCF" ? "LCM" : "HCF");
  }
  const seen = new Set([JSON.stringify(v)]);
  return out.filter((c) => { const k = JSON.stringify(c); if (seen.has(k)) return false; seen.add(k); return true; });
};

for (const key of Object.keys(CLAIMS)) {
  const [fam, ...r] = key.split("/"), op = r.join("/");
  test(`claim ${key}: real steps hold, corrupted values are never confirmed`, () => {
    const steps = pool(fam).items.flatMap((p) => p.steps.filter((s) => s.op === op).map((s) => ({ p, s })));
    assert.ok(steps.length > 0, `no ${op} steps in ${fam}`);
    const readable = steps.filter(({ p, s }) => stepClaimHolds(s, p) !== null);
    assert.equal(readable.length, steps.length, "every step is readable");
    const stride = Math.max(1, Math.floor(readable.length / 100));
    let seen = 0;
    for (let i = 0; i < readable.length; i += stride) {
      const { p, s } = readable[i];
      seen++;
      assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
      for (const bad of corruptions(key, s.value, s.inputs)) assert.notEqual(stepClaimHolds({ ...s, value: bad as never }, p), true, `${p.id} ${s.id} corrupted to ${JSON.stringify(bad)}`);
    }
    assert.ok(seen >= Math.min(100, readable.length));
  });
}

test("claims return null (unchecked) when the step does not match the prompt", () => {
  const take = (fam: string, op: string) => { for (const p of pool(fam).items) for (const s of p.steps) if (s.op === op && stepClaimHolds(s, p) !== null) return { p, s }; throw new Error(fam); };
  for (const key of Object.keys(CLAIMS)) {
    const [fam, ...r] = key.split("/");
    const { p, s } = take(fam, r.join("/"));
    assert.equal(stepClaimHolds({ ...s, inputs: ["q", "q", "q", "q", "q"] }, p), null, key);
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unrelated text" }), null, key);
  }
});

test("acmissing: the undo step names the operation that undoes the equation, with the family's form code", () => {
  const f = (prompt: string, op: string, value: number) =>
    stepClaimHolds({ id: "undo", op, competency: "c", inputs: [op], value } as never, { family: "acmissing", prompt, params: [], steps: [] } as never);
  assert.equal(f("What number goes in the box? □ + 3 = 10", "subtract", 0), true);
  assert.equal(f("What number goes in the box? 10 − □ = 3", "subtract", 1), true);
  assert.equal(f("What number goes in the box? □ − 3 = 10", "add", 2), true);
  assert.equal(f("What number goes in the box? 3 × □ = 12", "divide", 3), true);
  assert.equal(f("What number goes in the box? □ + 3 = 10", "add", 0), false); // the wrong operation
  assert.equal(f("What number goes in the box? □ + 3 = 10", "subtract", 2), false); // the wrong form code
  assert.equal(f("What number goes in the box? 3 × □ = 12", "subtract", 3), false);
});

test("acmissing: the answer follows the equation form", () => {
  const f = (prompt: string, op: string, inputs: number[], value: number) =>
    stepClaimHolds({ id: "t", op, competency: "c", inputs, value } as never, { family: "acmissing", prompt, params: [], steps: [] } as never);
  assert.equal(f("What number goes in the box? □ + 3 = 10", "subtract", [10, 3], 7), true);
  assert.equal(f("What number goes in the box? □ + 3 = 10", "subtract", [10, 3], 13), false);
  assert.equal(f("What number goes in the box? 10 − □ = 3", "subtract", [10, 3], 7), true);
  assert.equal(f("What number goes in the box? 10 − □ = 3", "subtract", [10, 3], -7), false);
  assert.equal(f("What number goes in the box? □ − 3 = 10", "add", [10, 3], 13), true);
  assert.equal(f("What number goes in the box? 3 × □ = 12", "divide", [12, 3], 4), true);
  assert.equal(f("What number goes in the box? 3 × □ = 12", "divide", [12, 3], 36), false);
  assert.equal(f("What number goes in the box? 3 × □ = 12", "subtract", [12, 3], 9), null);
});

test("aematch: an underdetermined puzzle stays unchecked", () => {
  const p = pool("aematch").items[0];
  const loose = { ...p, prompt: p.prompt.replace(/ Clues: .*? Who/, " Clues: Anu likes mangoes. Who") };
  assert.equal(stepClaimHolds({ ...p.steps[0], inputs: [1] }, loose), null);
});

test("aearms: the compare-turns answer depends on the two hour marks", () => {
  const items = pool("aearms").items.filter((p) => p.steps[0].inputs[0] === 2);
  const eq = items.find((p) => /to (\d+)\. ∠Y .* to \1\./.test(p.prompt));
  assert.ok(eq);
  const same = (eq.options as string[]).indexOf("They are the same size");
  assert.equal(stepClaimHolds({ ...eq.steps[0], value: same }, eq), true);
  assert.equal(stepClaimHolds({ ...eq.steps[0], value: (same + 1) % 3 }, eq), false);
});

test("acstory: a wrong operation word or code is not confirmed", () => {
  const p = pool("acstory").items.find((x) => x.steps[0].inputs[0] === "add");
  assert.ok(p);
  assert.equal(stepClaimHolds({ ...p.steps[0], inputs: ["take away"], value: 1 }, p), null);
  assert.equal(stepClaimHolds({ ...p.steps[0], value: 1 }, p), false);
});
