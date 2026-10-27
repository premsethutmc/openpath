/** j-clocks-time-volume claims: real steps hold, corrupted values and altered pictures are never confirmed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import { CLAIMS, BASIS } from "./j-clocks-time-volume";

const corruptions = (v: number | string): (number | string)[] => {
  const out: (number | string)[] = ["not a number", "", "x", "0:00", "99:99"];
  if (typeof v === "number") out.push(v + 1, v - 1, v + 5, v * 2 + 3, v + 10, -v);
  else {
    const m = v.match(/^(\d+):(\d{2})$/);
    if (m) {
      const h = Number(m[1]), mm = Number(m[2]);
      out.push(`${h}:${String((mm + 5) % 60).padStart(2, "0")}`, `${h % 12 + 1}:${m[2]}`, `${m[2]}:${m[1].padStart(2, "0")}`, `${h}:${m[2]}0`, v + "!", Number(m[1]) * 100 + mm);
    }
  }
  return out.filter((c) => c !== v);
};

const stepsOf = (key: string) => { const [fam, op] = key.split("/"); return pool(fam).items.flatMap((p) => p.steps.filter((s) => s.op === op).map((s) => ({ p, s }))); };

test("BASIS lists exactly the claims", () => assert.deepEqual(Object.keys(BASIS).sort(), Object.keys(CLAIMS).sort()));

for (const key of Object.keys(CLAIMS)) {
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    const steps = stepsOf(key);
    assert.ok(steps.length > 0);
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
  test(`claim ${key}: altered facts are never confirmed`, () => {
    const steps = stepsOf(key);
    const stride = Math.max(1, Math.floor(steps.length / 100));
    for (let i = 0; i < steps.length; i += stride) {
      const { p, s } = steps[i];
      // unrelated prompt, junk inputs
      // (reading the clock needs only the picture, so the prompt does not matter there)
      if (key !== "acelapsed/read clock") assert.notEqual(stepClaimHolds(s, { ...p, prompt: "unrelated text" }), true, `${key} prompt`);
      assert.notEqual(stepClaimHolds({ ...s, inputs: ["q", "q", "q"] }, p), true, `${key} inputs`);
      if (s.inputs.length) assert.notEqual(stepClaimHolds({ ...s, inputs: [] }, p), true, `${key} no inputs`);
      // a prompt number changed so it disagrees with the stated value
      const bumped = p.prompt.replace(/\d+/, (d) => String(Number(d) + 5));
      // (a step that counts only to the next o'clock does not depend on the end time)
      if (bumped !== p.prompt && key !== "acelapsed/read clock" && !String(s.inputs[1]).endsWith(":00")) assert.notEqual(stepClaimHolds(s, { ...p, prompt: bumped }), true, `${p.id} ${s.id} prompt bumped`);
      // an input changed
      if (s.inputs.length && typeof s.inputs[0] === "number") assert.notEqual(stepClaimHolds({ ...s, inputs: [s.inputs[0] + 1, ...s.inputs.slice(1)] }, p), true, `${p.id} ${s.id} input bumped`);
      // the picture changed
      const f = p.figure as { type?: string; h?: number; m?: number } | undefined;
      if (f && f.type === "clock") {
        assert.notEqual(stepClaimHolds(s, { ...p, figure: { ...f, h: (f.h as number) % 12 + 1 } }), true, `${p.id} ${s.id} clock hour changed`);
        if (key.startsWith("acelapsed") && !String(s.inputs[0]).endsWith(":00")) assert.notEqual(stepClaimHolds(s, { ...p, figure: { ...f, m: ((f.m as number) + 5) % 60 } }), true, `${p.id} ${s.id} clock minute changed`);
        // (the hour-hand prompt itself states the hour, so only the elapsed-time pair depends on the picture alone)
        if (key.startsWith("acelapsed")) assert.notEqual(stepClaimHolds(s, { ...p, figure: undefined }), true, `${p.id} ${s.id} no figure`);
      }
    }
  });
}

test("acelapsed count on: each part of a split count is checked against the clock", () => {
  const p = pool("acelapsed").items.find((q) => q.steps.some((s) => s.id === "to-hour"))!;
  const toHour = p.steps.find((s) => s.id === "to-hour")!;
  assert.equal(stepClaimHolds(toHour, p), true);
  assert.notEqual(stepClaimHolds({ ...toHour, inputs: [toHour.inputs[0], "5:00"] }, p), true);
  assert.notEqual(stepClaimHolds({ ...toHour, inputs: ["9:15", toHour.inputs[1]] }, p), true);
});
