/** g-sequences-patterns claims: real steps hold, corrupted stated values are rejected. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./g-sequences-patterns";

const swapDigits = (n: number): number | null => {
  const t = String(Math.abs(n));
  for (let i = 0; i + 1 < t.length; i++) if (t[i] !== t[i + 1]) { const a = t.split(""); [a[i], a[i + 1]] = [a[i + 1], a[i]]; return Number((n < 0 ? "-" : "") + a.join("")); }
  return null;
};
const bumpDigit = (s: string, last: boolean): string | null => {
  const idx = [...s.matchAll(/\d/g)].map((m) => m.index as number);
  if (!idx.length) return null;
  const i = last ? idx[idx.length - 1] : idx[0];
  return s.slice(0, i) + String((Number(s[i]) + 1) % 10) + s.slice(i + 1);
};
const corruptions = (v: number | string): (number | string)[] => {
  const out: (number | string)[] = ["not a number", "", "x", "n + n", "n × n × n × n", "1n + 1", "2 × n + 1"];
  if (typeof v === "number") {
    out.push(v + 1, v - 1, v * 2 + 3, v + 10);
    const sw = swapDigits(v);
    if (sw !== null && sw !== v) out.push(sw);
  } else {
    for (const b of [bumpDigit(v, false), bumpDigit(v, true)]) if (b) out.push(b);
    if (v.includes("+")) out.push(v.replace("+", "−"));
    if (v.includes("−")) out.push(v.replace("−", "+"));
    for (const sep of [", ", " "]) if (v.includes(sep)) out.push(v.split(sep).reverse().join(sep), v.split(sep).slice(1).join(sep), v.split(sep).concat(v.split(sep)[0]).join(sep));
    if (v.includes("×")) out.push(v.replace(/ × /, " + "), v.replace(/ ×.*$/, ""));
    out.push(v + "!", v + " + 1");
  }
  return out.filter((c) => c !== v);
};

for (const key of Object.keys(CLAIMS)) {
  const [fam, op] = key.split("/");
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    const steps = pool(fam).items.flatMap((p) => p.steps.filter((s) => s.op === op).map((s) => ({ p, s })));
    assert.ok(steps.length > 0, `no ${op} steps in ${fam}`);
    const stride = Math.max(1, Math.floor(steps.length / 100));
    let seen = 0;
    for (let i = 0; i < steps.length; i += stride) {
      const { p, s } = steps[i];
      seen++;
      assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
      for (const bad of corruptions(s.value as number | string)) assert.equal(stepClaimHolds({ ...s, value: bad }, p), false, `${p.id} ${s.id} corrupted to ${JSON.stringify(bad)}`);
    }
    assert.ok(seen >= Math.min(100, steps.length));
  });
}

test("claims return null (unchecked) when the step does not match the prompt", () => {
  const take = (fam: string, op: string) => { for (const p of pool(fam).items) for (const s of p.steps) if (s.op === op) return { p, s }; throw new Error(fam); };
  for (const key of Object.keys(CLAIMS)) {
    const [fam, op] = key.split("/");
    const { p, s } = take(fam, op);
    assert.equal(stepClaimHolds({ ...s, inputs: ["q", "q", "q", "q", "q"] }, p), null, `${key} inputs`);
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unrelated text" }), null, `${key} prompt`);
  }
});

test("affrule: any other option text is rejected, even a true-looking one with the wrong inputs", () => {
  for (const p of pool("affrule").items.slice(0, 120)) {
    const s = p.steps.find((x) => x.op === "match")!;
    for (const o of p.options as string[]) {
      const ok = o === s.value;
      assert.equal(stepClaimHolds({ ...s, inputs: [o], value: o }, p), ok, `${p.id} ${o}`);
      assert.equal(stepClaimHolds({ ...s, value: o }, p), ok, `${p.id} value only ${o}`);
    }
  }
});

test("shifted positions are rejected (aapatn place, aaweave place, acgrow count on)", () => {
  const first = (fam: string, op: string, f: (p: any) => boolean) => { for (const p of pool(fam).items) for (const s of p.steps) if (s.op === op && f(p)) return { p, s }; throw new Error(fam); };
  const a = first("aapatn", "find the place in the part", (p) => p.steps[0].inputs.length > 2);
  assert.equal(stepClaimHolds({ ...a.s, inputs: [Number(a.s.inputs[0]) + 1, a.s.inputs[1]] }, a.p), null);
  assert.equal(stepClaimHolds({ ...a.s, value: Number(a.s.value) % Number(a.s.inputs[1]) + 1 }, a.p), false);
  const w = first("aaweave", "find the place", (p) => /under for/.test(p.prompt) && p.params[1] > 1);
  assert.equal(stepClaimHolds(w.s, w.p), true);
  assert.equal(stepClaimHolds({ ...w.s, value: Number(w.s.value) - 1 }, w.p), false);
  assert.equal(stepClaimHolds({ ...w.s, value: Number(w.s.value) + 1 }, w.p), false);
});
