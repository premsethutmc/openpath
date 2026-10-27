/** i-arithmetic-leftovers claims: real steps pass, corrupted stated values are rejected. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS } from "./i-arithmetic-leftovers";

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
  const out: (number | string)[] = ["not a number", "", "x"];
  if (typeof v === "number") {
    out.push(v + 1, v - 1, v * 2 + 3, v + 10);
    const sw = swapDigits(v);
    if (sw !== null && sw !== v) out.push(sw);
  } else {
    for (const b of [bumpDigit(v, false), bumpDigit(v, true)]) if (b) out.push(b);
    if (v.includes("+")) out.push(v.replace("+", "−"));
    if (v.includes("−")) out.push(v.replace("−", "+"));
    if (v.includes("-")) out.push(v.replace("-", ""));
    if (v.includes("y =")) out.push(v.replace(/^(-?)/, (m) => (m ? "" : "-")));
    if (v.includes(", ")) out.push(v.split(", ").reverse().join(", "), v.split(", ").slice(1).join(", "));
    if (/^\d+m?$|^\d[a-z]/.test(v)) out.push(v.replace(/^(\d+)/, "$1$1"));
    if (v.includes("divides it:")) out.push("no prime up to the square root divides it");
    if (v.startsWith("no prime")) out.push("3 divides it: 9 = 3 × 3");
    if (v === "<" || v === ">" || v === "=") out.push(...["<", ">", "="].filter((x) => x !== v));
    if (v.includes(", ")) { const w = v.split(", "); [w[0], w[1]] = [w[1], w[0]]; out.push(w.join(", "), v.replace(/, /g, ","), w.slice(0, -1).join(", ")); }
    out.push(v + "!");
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
    assert.equal(stepClaimHolds({ ...s, inputs: ["q", "q", "q", "q", "q"] }, p), null, key);
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unrelated text" }), null, key);
  }
});


test("aechk: every other option index is rejected, and a wrong index never holds", () => {
  const steps = pool("aechk").items.flatMap((p) => p.steps.filter((s) => s.op === "estimate").map((s) => ({ p, s })));
  for (let i = 0; i < steps.length; i += 7) {
    const { p, s } = steps[i];
    const n = (p as unknown as { options: string[] }).options.length;
    for (let j = 0; j < n; j++) assert.equal(stepClaimHolds({ ...s, value: j }, p), j === s.value, `${p.id} option ${j}`);
  }
});

test("aaordx: ascending and descending are not interchangeable", () => {
  const items = pool("aaordx").items;
  const asc = items.find((p) => /ascending/.test(p.prompt))!, desc = items.find((p) => /descending/.test(p.prompt))!;
  const o = asc.steps.find((s) => s.op === "order")!;
  assert.equal(stepClaimHolds({ ...o, inputs: [1] }, asc), null);
  assert.equal(stepClaimHolds({ ...desc.steps.find((s) => s.op === "order")!, inputs: [0] }, desc), null);
});
