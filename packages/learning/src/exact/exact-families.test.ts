/**
 * Items 2 and 3 — exact verification of existing number/arithmetic and statistics/probability families.
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
import { STATS_PROB_FAMILIES } from "./stats-prob-families.ts";
import { verifyFamily, checkItem } from "./verify.ts";

const ALL = [...NUMBER_FAMILIES, ...STATS_PROB_FAMILIES];
const FROZEN = new URL("../../../../content/learning/exact-verification.v1.json", import.meta.url).pathname;
const fingerprint = (id: string) => createHash("sha256").update(JSON.stringify((pool(id).items as any[]).map((p) => [p.id, p.prompt, p.answer]))).digest("hex").slice(0, 16);

describe("exact number families: every question verified", () => {
  for (const fx of ALL) it(`${fx.id}: whole pool passes A/B/C/D`, () => {
    const r = verifyFamily(fx);
    assert.ok(r.checked > 0);
    assert.deepEqual(r.failures.slice(0, 3), []);
  });
});

describe("negative controls (the checker can fail)", () => {
  for (const fx of ALL) {
    const items = pool(fx.id).items as any[]; const p = items[Math.floor(items.length / 2)];
    it(`${fx.id}: wrong stored answer is caught (A)`, () => {
      const wrong = p.type === "tuple" ? p.answer.replace(/\(([^,]+), ([^,)]+)/, "($2, $1") : p.type === "ratio" || p.answer.includes(":") ? p.answer.replace(/^(\d+)/, (m: string) => String(Number(m) + 1)) : /^-?\d+$/.test(p.answer) ? String(Number(p.answer) + 1) : p.answer.includes("/") ? p.answer.replace(/(\d+)\/(\d+)$/, (_: string, a: string, b: string) => `${Number(a) + 1}/${b}`) : String(Number(p.answer) + 0.01);
      const r = checkItem(fx, { ...p, answer: wrong });
      assert.ok(r.failures.some((f) => f.check === "A"), `${p.answer} → ${wrong} not caught`);
    });
    it(`${fx.id}: the checker reads the question (some single-digit misreading is caught)`, () => {
      const cands: { prompt: string; figure: unknown }[] = [];
      for (let i = 0; i < p.prompt.length; i++) if (/\d/.test(p.prompt[i])) cands.push({ prompt: p.prompt.slice(0, i) + String((Number(p.prompt[i]) + 1) % 10) + p.prompt.slice(i + 1), figure: p.figure });
      if (p.figure?.rows) {
        const bump = (v: unknown) => (typeof v === "number" ? v + 1 : typeof v === "string" && /^[−-]?\d+(\/\d+)?$/.test(v) ? v.replace(/\d+/, (d) => String(Number(d) + 1)) : null);
        const cells: [string, number, number][] = [];
        p.figure.head?.forEach((_: unknown, c: number) => cells.push(["head", 0, c]));
        p.figure.rows.forEach((row: unknown[], r: number) => row.forEach((_, c) => cells.push(["rows", r, c])));
        for (const [k, r, c] of cells) {
          const f = JSON.parse(JSON.stringify(p.figure)); const v = k === "head" ? bump(f.head[c]) : bump(f.rows[r][c]); if (v === null) continue;
          if (k === "head") f.head[c] = v; else f.rows[r][c] = v;
          cands.push({ prompt: p.prompt, figure: f });
        }
      }
      const caught = cands.filter((m) => checkItem(fx, { ...p, ...m }).failures.length > 0).length;
      assert.ok(cands.length > 0 && caught > 0, `${caught}/${cands.length} misreadings caught`);
    });
    if (fx.steps) it(`${fx.id}: a false worked step is caught (D)`, () => {
      const steps = FAMILIES.get(fx.id)!.solve(p.params).steps.map((s: any, i: number, a: any[]) => (i === a.length - 1 ? { ...s, value: typeof s.value === "number" ? s.value + 1 : typeof s.value === "string" ? s.value + "9" : s.value } : s));
      const r = checkItem(fx, p, steps);
      assert.ok(r.failures.some((f) => f.check === "D"));
    });
  }
});

describe("frozen regression", () => {
  const now = Object.fromEntries(ALL.map((fx) => [fx.id, { questions: pool(fx.id).items.length, fingerprint: fingerprint(fx.id) }]));
  it("matches content/learning/exact-verification.v1.json", () => {
    if (process.env.UPDATE_FROZEN === "1") fs.writeFileSync(FROZEN, JSON.stringify({ schema: "exact-verification@1", scope: "number+statistics+probability", families: now }, null, 1) + "\n");
    const frozen = JSON.parse(fs.readFileSync(FROZEN, "utf8"));
    assert.deepEqual(now, frozen.families);
  });
});
