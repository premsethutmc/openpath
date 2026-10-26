/**
 * Item 2 — exact verification of existing number/arithmetic families.
 * 1. every released question of every registered family passes the independent exact checker (A answer, B marking, C options, D steps)
 * 2. negative controls: the checker rejects a wrong stored answer, a wrong prompt reading and a false worked step, so a pass means something
 * 3. frozen regression: per-family pool size and a hash of (id, prompt, answer) lists; an intended change to a family updates the frozen file on purpose
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { pool, FAMILIES } from "../families.ts";
import { NUMBER_FAMILIES } from "./number-families.ts";
import { verifyFamily, checkItem } from "./verify.ts";

const FROZEN = new URL("../../../../content/learning/exact-verification.number.v1.json", import.meta.url).pathname;
const fingerprint = (id: string) => createHash("sha256").update(JSON.stringify((pool(id).items as any[]).map((p) => [p.id, p.prompt, p.answer]))).digest("hex").slice(0, 16);

describe("exact number families: every question verified", () => {
  for (const fx of NUMBER_FAMILIES) it(`${fx.id}: whole pool passes A/B/C/D`, () => {
    const r = verifyFamily(fx);
    assert.ok(r.checked > 0);
    assert.deepEqual(r.failures.slice(0, 3), []);
  });
});

describe("negative controls (the checker can fail)", () => {
  for (const fx of NUMBER_FAMILIES) {
    const items = pool(fx.id).items as any[]; const p = items[Math.floor(items.length / 2)];
    it(`${fx.id}: wrong stored answer is caught (A)`, () => {
      const wrong = p.type === "tuple" ? p.answer.replace(/\(([^,]+), ([^,)]+)/, "($2, $1") : p.type === "ratio" || p.answer.includes(":") ? p.answer.replace(/^(\d+)/, (m: string) => String(Number(m) + 1)) : /^-?\d+$/.test(p.answer) ? String(Number(p.answer) + 1) : p.answer.includes("/") ? p.answer.replace(/(\d+)\/(\d+)$/, (_: string, a: string, b: string) => `${Number(a) + 1}/${b}`) : String(Number(p.answer) + 0.01);
      const r = checkItem(fx, { ...p, answer: wrong });
      assert.ok(r.failures.some((f) => f.check === "A"), `${p.answer} → ${wrong} not caught`);
    });
    it(`${fx.id}: a misread prompt is caught`, () => {
      const prompt = p.prompt.replace(/\d/, (d: string) => String((Number(d) + 1) % 10));
      const r = checkItem(fx, { ...p, prompt });
      assert.ok(r.failures.length > 0);
    });
    if (fx.steps) it(`${fx.id}: a false worked step is caught (D)`, () => {
      const steps = FAMILIES.get(fx.id)!.solve(p.params).steps.map((s: any, i: number, a: any[]) => (i === a.length - 1 ? { ...s, value: typeof s.value === "number" ? s.value + 1 : typeof s.value === "string" ? s.value + "9" : s.value } : s));
      const r = checkItem(fx, p, steps);
      assert.ok(r.failures.some((f) => f.check === "D"));
    });
  }
});

describe("frozen regression", () => {
  const now = Object.fromEntries(NUMBER_FAMILIES.map((fx) => [fx.id, { questions: pool(fx.id).items.length, fingerprint: fingerprint(fx.id) }]));
  it("matches content/learning/exact-verification.number.v1.json", () => {
    if (process.env.UPDATE_FROZEN === "1") fs.writeFileSync(FROZEN, JSON.stringify({ schema: "exact-verification@1", scope: "number", families: now }, null, 1) + "\n");
    const frozen = JSON.parse(fs.readFileSync(FROZEN, "utf8"));
    assert.deepEqual(now, frozen.families);
  });
});
