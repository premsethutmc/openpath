/** l-grids-symmetry claims: real steps hold, corrupted values and altered pictures are never confirmed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import type { Problem, Step } from "../claim-kit";
import { CLAIMS, BASIS } from "./l-grids-symmetry";

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
const DIRS = ["North", "East", "South", "West"];
const corruptions = (v: number | string, p: Problem): (number | string)[] => {
  const out: (number | string)[] = ["not a number", "", "x"];
  if (typeof v === "number") {
    out.push(v + 1, v - 1, v + 2, v * 2 + 3, v + 0.5, -v - 1);
    const sw = swapDigits(v);
    if (sw !== null) out.push(sw);
    if (Array.isArray(p.options)) for (let i = 0; i < p.options.length + 1; i++) out.push(i); // every other option index
  } else {
    for (const b of [bumpDigit(v, false), bumpDigit(v, true)]) if (b) out.push(b);
    for (const d of DIRS) out.push(d);
    if (Array.isArray(p.options)) for (const o of p.options) out.push(String(o)); // every other option text
    const fg = p.figure as { labels?: string[]; points?: [number, number, string][] } | undefined;
    for (const l of fg?.labels ?? []) out.push(l);
    for (const q of fg?.points ?? []) out.push(q[2]);
    out.push("Both have the same number", "(0, 0)", v + "!", v.split("").reverse().join(""));
    const m = v.match(/^\((-?\d+), (-?\d+)\)$/);
    if (m) out.push(`(${m[2]}, ${m[1]})`, `(${Number(m[1]) + 1}, ${m[2]})`, `(${m[1]}, ${Number(m[2]) + 1})`, `(${m[1]},${m[2]})x`);
    const w = v.match(/^(\d+) and (\d+)$/);
    if (w) out.push(`${w[2]} and ${w[1]}`, `${w[1]}${w[2]}`, `${Number(w[1]) + 1} and ${w[2]}`);
    if (v.includes(", ")) out.push(v.split(", ").reverse().join(", "), v.split(", ").slice(1).join(", "));
  }
  return out.filter((c) => c !== v && String(c) !== String(v));
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const withFig = (p: Problem, f: unknown): Problem => ({ ...p, figure: f } as Problem);
const rotate = <T,>(xs: T[], k = 1) => [...xs.slice(k), ...xs.slice(0, k)];

/** Altered picture data (or options) that no longer agrees with the stated value or inputs: never confirmed. Returns null if not applicable. */
const alterations: Record<string, (s: Step, p: Problem) => Problem | null> = {
  "abgrid/count": (_s, p) => { const f = clone(p.figure as any); f.points[1][0] += 1; f.points[1][1] += 1; return withFig(p, f); },
  "abseat/find the row": (_s, p) => { const f = clone(p.figure as any); f.rows = rotate(f.rows); return withFig(p, f); },
  "abseat/find the seat": (_s, p) => { const f = clone(p.figure as any); f.rows = f.rows.map((r: string[]) => [r[0], ...rotate(r.slice(1))]); return withFig(p, f); },
  "abseat/move back": (_s, p) => { const f = clone(p.figure as any); f.rows = f.rows.map((r: string[]) => [r[0], ...rotate(r.slice(1))]); return withFig(p, f); },
  "abseat/move right": (_s, p) => { const f = clone(p.figure as any); f.rows = rotate(f.rows); return withFig(p, f); },
  "abroute/add each route": (_s, p) => { const f = clone(p.figure as any); f.rows[4][1] += 1; return withFig(p, f); },
  "abroute/compare": (s, p) => { const f = clone(p.figure as any); f.rows[4][1] = 1; return s.value === 1 ? null : withFig(p, f); },
  "abdir/use the directions": (s, p) => {
    const f = clone(p.figure as any);
    if (f.type !== "plane") return null;
    const target = typeof s.value === "string" && f.points.some((q: any) => q[2] === s.value) ? s.value : (p.prompt.match(/direction is the (.+) from the/) ?? [])[1];
    const i = f.points.findIndex((q: any) => q[2] === target);
    if (i < 1) return null;
    const j = i === 1 ? 2 : 1;
    [f.points[i][2], f.points[j][2]] = [f.points[j][2], f.points[i][2]];
    return withFig(p, f);
  },
  "aeirr/count": (s, p) => {
    const f = clone(p.figure as any);
    const from = s.inputs.length === 1 ? "◑" : p.prompt.includes("two shapes") ? "A" : "■";
    const to = from === "A" ? "·" : "□";
    for (const r of f.rows) { const k = r.indexOf(from); if (k >= 0) { r[k] = to; return withFig(p, f); } }
    return null;
  },
  "aedsym/count": (s, p) => {
    const f = clone(p.figure as any);
    if (f.type !== "table" || p.prompt.includes("does a") || p.prompt.includes("does an")) return null;
    const n = f.rows.length;
    if (s.value === 0) { f.rows = f.rows.map((r: string[]) => r.map(() => "■")); return withFig(p, f); }
    f.rows = f.rows.map((r: string[], i: number) => r.map((_c, j) => (i === 0 && j === 1 ? "■" : "□")));
    void n;
    return withFig(p, f);
  },
  "aagrp/compare": (s, p) => {
    const f = clone(p.figure as any);
    if (f.type !== "pictograph" || f.counts[0] === f.counts[1]) return null;
    f.labels = [f.labels[1], f.labels[0]]; // the plate names swap places: the stated plate is now the other one
    return typeof s.value === "string" && f.labels.includes(s.value) ? withFig(p, f) : null;
  },
  "aemirror/reflect": (_s, p) => ({ ...p, options: rotate(p.options as string[]) } as Problem),
};
const promptBump = new Set(["abroute/add the squares", "abroute/use the scale", "aerefl/reflect", "abseat/move back", "abseat/move right", "aagrp/compare"]);

for (const key of Object.keys(CLAIMS)) {
  const [fam, op] = key.split("/");
  const steps = () => pool(fam).items.flatMap((p) => p.steps.filter((s) => s.op === op).map((s) => ({ p, s })));

  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    const all = steps();
    assert.ok(all.length > 0, `no ${op} steps in ${fam}`);
    const stride = Math.max(1, Math.floor(all.length / 100));
    let seen = 0;
    for (let i = 0; i < all.length; i += stride) {
      const { p, s } = all[i];
      seen++;
      assert.equal(stepClaimHolds(s, p), true, `${p.id} ${s.id}`);
      for (const bad of corruptions(s.value as number | string, p)) assert.notEqual(stepClaimHolds({ ...s, value: bad }, p), true, `${p.id} ${s.id} corrupted to ${JSON.stringify(bad)}`);
      assert.notEqual(stepClaimHolds({ ...s, value: [1, 2] as any }, p), true, `${p.id} array value`);
    }
    assert.ok(seen >= Math.min(100, all.length));
  });

  test(`claim ${key}: altered picture, prompt number or inputs are never confirmed`, () => {
    const all = steps();
    const stride = Math.max(1, Math.floor(all.length / 100));
    let altered = 0;
    for (let i = 0; i < all.length; i += stride) {
      const { p, s } = all[i];
      const alt = alterations[key]?.(s, p);
      if (alt) { altered++; assert.notEqual(stepClaimHolds(s, alt), true, `${p.id} ${s.id} altered picture`); }
      if (promptBump.has(key)) {
        const q = bumpDigit(p.prompt, key.startsWith("abroute"));
        if (q && q !== p.prompt) assert.notEqual(stepClaimHolds(s, { ...p, prompt: q }), true, `${p.id} ${s.id} prompt number`);
      }
      const k = s.inputs.findIndex((x) => typeof x === "number");
      if (k >= 0) {
        const inputs = s.inputs.slice();
        inputs[k] = (inputs[k] as number) + 1;
        assert.notEqual(stepClaimHolds({ ...s, inputs }, p), true, `${p.id} ${s.id} inputs`);
      }
      assert.notEqual(stepClaimHolds({ ...s, inputs: ["", ""] }, p), true, `${p.id} ${s.id} blank inputs`);
    }
    if (alterations[key]) assert.ok(altered > 0, `${key}: no picture alteration applied`);
  });

  test(`claim ${key}: unreadable steps return null`, () => {
    const { p, s } = steps()[0];
    assert.equal(stepClaimHolds(s, { ...p, prompt: "unrelated text" }), null, `${key} prompt`);
    assert.equal(stepClaimHolds({ ...s, inputs: ["q", "q", "q", "q", "q"] }, p), null, `${key} inputs`);
    assert.ok(BASIS[key] === "prompt-independent" || BASIS[key] === "figure-consistent", `${key} basis`);
  });
}

test("BASIS lists exactly the claimed keys", () => {
  assert.deepEqual(Object.keys(BASIS).sort(), Object.keys(CLAIMS).sort());
});

test("hand-checked values", () => {
  const take = (fam: string, pred: (p: Problem, s: Step) => boolean, op: string) => { for (const p of pool(fam).items) for (const s of p.steps) if (s.op === op && pred(p, s)) return { p, s }; throw new Error(fam); };
  // 88 and 181 fold across the middle but 181 is not symmetric down the middle (the 1 sits on the right of its place)
  const { p, s } = take("aedigsym", (q) => q.prompt.includes("808"), "count");
  assert.equal(stepClaimHolds(s, p), true);
  // an equilateral triangle has 3 lines, a parallelogram none
  const tri = take("aedsym", (q) => q.prompt.includes("an equilateral triangle"), "count");
  assert.equal(stepClaimHolds({ ...tri.s, value: 3 }, tri.p), true);
  assert.equal(stepClaimHolds({ ...tri.s, value: 6 }, tri.p), false);
  const par = take("aedsym", (q) => q.prompt.includes("parallelogram"), "count");
  assert.equal(stepClaimHolds({ ...par.s, value: 0 }, par.p), true);
  assert.equal(stepClaimHolds({ ...par.s, value: 2 }, par.p), false);
});
