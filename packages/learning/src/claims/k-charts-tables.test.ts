/** k-charts-tables claims: real steps hold, corrupted values and altered pictures are never confirmed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../families";
import { stepClaimHolds } from "../step-claims";
import type { Problem, Step } from "../claim-kit";
import { CLAIMS, BASIS } from "./k-charts-tables";

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
type V = number | string | number[];
const corruptions = (v: V): unknown[] => {
  const out: unknown[] = ["", "x", null, undefined, true, {}];
  if (typeof v === "number") {
    out.push(v + 1, v - 1, v * 2 + 3, v + 10, String(v + 1), [v], -v);
    const sw = swapDigits(v);
    if (sw !== null && sw !== v) out.push(sw);
  } else if (Array.isArray(v)) {
    out.push(v.reduce((a, b) => a + b, 0), v[0], [...v].reverse(), v.slice(1), v.slice(0, -1), [...v, v[0]], v.map((x) => x + 1), String(v));
    v.forEach((x, i) => out.push(v.map((y, j) => (j === i ? y + 1 : y)), v.map((y, j) => (j === i ? y - 1 : y))));
    if (v.length > 1) out.push([v[1], v[0], ...v.slice(2)]);
  } else {
    for (const b of [bumpDigit(v, false), bumpDigit(v, true)]) if (b) out.push(b);
    for (const sep of [", ", " ", ";", "|"]) if (v.includes(sep)) out.push(v.split(sep).reverse().join(sep), v.split(sep).slice(1).join(sep), v.split(sep).slice(0, -1).join(sep), v.split(sep).concat(v.split(sep)[0]).join(sep));
    if (v.includes(", ")) out.push(v.split(", ").join(","), v.split(", ").join(" "), `(${v})`);
    if (v === "True") out.push("False", "true");
    if (v === "False") out.push("True", "false");
    out.push(v + "!", v + " ", " " + v, v.toLowerCase() === v ? v.toUpperCase() : v.toLowerCase());
    out.push(v.replace(/\bmore\b/i, "fewer"), v.replace(/\bMore\b/, "Fewer"));
    if (v.startsWith("Boys:")) out.push(v.replace("Boys", "Girls"), v.replace("idli", "dosa"));
  }
  return out.filter((c) => c !== v && JSON.stringify(c) !== JSON.stringify(v));
};

const steps = (key: string) => {
  const [fam, ...r] = key.split("/");
  const op = r.join("/");
  return pool(fam).items.flatMap((p) => p.steps.filter((s) => s.op === op).map((s) => ({ p, s })));
};
const sample = <T,>(xs: T[], n = 100): T[] => { const stride = Math.max(1, Math.floor(xs.length / n)); return xs.filter((_, i) => i % stride === 0); };
const holds = (s: Step, p: Problem) => stepClaimHolds(s, p);
const withFig = (p: Problem, f: unknown): Problem => ({ ...p, figure: f as Problem["figure"] });
const clone = <T,>(x: T): T => structuredClone(x);

test("every claimed key has a basis, and only one of the two labels", () => {
  assert.deepEqual(Object.keys(BASIS).sort(), Object.keys(CLAIMS).sort());
  for (const b of Object.values(BASIS)) assert.ok(b === "prompt-independent" || b === "figure-consistent");
});

for (const key of Object.keys(CLAIMS)) {
  test(`claim ${key}: real steps hold, corrupted values are rejected`, () => {
    const all = steps(key);
    assert.ok(all.length > 0, `no steps for ${key}`);
    const picked = sample(all);
    assert.ok(picked.length >= Math.min(100, all.length));
    for (const { p, s } of picked) {
      assert.equal(holds(s, p), true, `${p.id} ${s.id}`);
      for (const bad of corruptions(s.value as V)) assert.notEqual(holds({ ...s, value: bad as never }, p), true, `${p.id} ${s.id} corrupted to ${JSON.stringify(bad)}`);
    }
  });
  test(`claim ${key}: unreadable steps are not confirmed`, () => {
    for (const { p, s } of sample(steps(key), 30)) {
      assert.notEqual(holds({ ...s, inputs: ["q", "q", "q", "q", "q"] }, p), true, `${p.id} inputs`);
      assert.notEqual(holds({ ...s, inputs: [] }, p), true, `${p.id} no inputs`);
      assert.equal(holds(s, { ...p, prompt: "unrelated text" }), null, `${p.id} prompt`);
      assert.equal(holds(s, { ...p, figure: undefined }), key === "agspd/read" ? true : null, `${p.id} no figure`);
      assert.notEqual(holds(s, withFig(p, { type: "clock" })), key === "agspd/read" ? false : true, `${p.id} wrong figure type`);
    }
  });
}

/** Altered picture data: the real stated value must no longer be confirmed. */
const numberLeaves = (f: any, fn: (v: number) => number): any => (typeof f === "number" ? fn(f) : Array.isArray(f) ? f.map((x) => numberLeaves(x, fn)) : f);
const alter: Record<string, (f: any) => any> = {
  "afbar/read": (f) => ({ ...f, values: f.values.map((v: number) => v + f.scale) }),
  "adbar/read": (f) => ({ ...f, values: f.values.map((v: number) => v + f.scale) }),
  "adbartf/read": (f) => ({ ...f, values: f.values.map((v: number) => v + 1) }),
  "acpictmore/read": (f) => ({ ...f, counts: f.counts.map((c: number) => c + f.key) }),
  "acpict/count": (f) => ({ ...f, counts: f.counts.map((c: number) => c + f.key) }),
  "acpicthalf/count": (f) => ({ ...f, counts: f.counts.map((c: number) => c + f.key) }),
  "acpicttab/compare": (f) => ({ ...f, counts: f.counts.map((c: number) => c + f.key) }),
  "adtally/count": (f) => ({ ...f, rows: f.rows.map((r: string[]) => [r[0], r[1] + " |"]) }),
  "adrec/count": (f) => ({ ...f, rows: [...f.rows, ["Zed", "Boy", "Idli"], ["Zoe", "Boy", "Dosa"], ["Zia", "Girl", "Idli"], ["Zara", "Girl", "Dosa"]] }),
  "adrec/read": (f) => ({ ...f, rows: [...f.rows, ["Zed", "Boy", "Idli"], ["Zoe", "Boy", "Dosa"], ["Zia", "Girl", "Idli"], ["Zara", "Girl", "Dosa"]] }),
  "abcup/read": (f) => ({ ...f, values: f.values.map((v: number) => v + 1) }),
  "abcupord/compare cups": (f) => ({ ...f, rows: f.rows.map((r: unknown[]) => [r[0], r[1], r[2], (r[3] as number) + 1]) }),
  "advenn/choose cells": (f) => ({ ...f, rows: f.rows.map((r: unknown[]) => [r[0], (r[1] as number) + 1, (r[2] as number) + 1]) }),
  "abjug/read": (f) => ({ ...f, marks: f.marks.map((m: number) => m + 50) }),
  "agspdc/compare": (f) => ({ ...f, rows: f.rows.map((r: string[]) => [r[0], String(Number(r[1]) + Number(r[2])), r[2]]) }),
};
for (const [key, fn] of Object.entries(alter)) {
  test(`claim ${key}: an altered picture is never confirmed`, () => {
    for (const { p, s } of sample(steps(key), 100)) assert.notEqual(holds(s, withFig(p, fn(clone(p.figure)))), true, `${p.id} ${s.id}`);
  });
}
test("abcupord: swapping which container holds more (consistent inputs, same value) is not confirmed", () => {
  for (const { p, s } of sample(steps("abcupord/compare cups"), 100)) {
    const f: any = clone(p.figure);
    const cups = f.rows.map((r: unknown[]) => r[3] as number);
    const rot = cups.map((_: number, i: number) => cups[(i + 1) % cups.length]);
    f.rows.forEach((r: unknown[], i: number) => (r[3] = rot[i]));
    assert.notEqual(holds({ ...s, inputs: rot }, withFig(p, f)), true, `${p.id}`);
  }
});
test("agspdc: both distances scaled consistently with inputs still need the right faster speed", () => {
  for (const { p, s } of sample(steps("agspdc/compare"), 100)) {
    const f: any = clone(p.figure);
    f.rows.reverse();
    const alt = { ...p, figure: f };
    assert.notEqual(holds(s, alt), true, `${p.id} rows reversed`);
  }
});
test("agspd: changing a number in the question is never confirmed", () => {
  for (const { p, s } of sample(steps("agspd/read"), 100)) {
    assert.notEqual(holds(s, { ...p, prompt: p.prompt.replace(/\d+/, (d) => String(Number(d) + 1)) }), true, p.id);
    assert.notEqual(holds(s, { ...p, prompt: p.prompt.replace(/ km | metres /, " m ") }), true, p.id);
  }
});

/** Naming a different bar / row / container in the question must not keep the old step confirmed. */
const rotateLabels = (prompt: string, labels: string[]): string => {
  let out = prompt;
  labels.forEach((l, i) => { out = out.replace(new RegExp(`(?<![A-Za-z0-9])${l.replace(/[-.]/g, "\\$&")}(?![A-Za-z0-9])`, "g"), `@@${i}@@`); });
  return out.replace(/@@(\d+)@@/g, (_, i) => labels[(Number(i) + 1) % labels.length]);
};
for (const key of ["adbar/read", "acpict/count", "acpictmore/read", "acpicthalf/count", "adtally/count", "abcup/read"]) {
  test(`claim ${key}: a different label in the question is not confirmed`, () => {
    let changed = 0;
    for (const { p, s } of sample(steps(key), 100)) {
      const f: any = p.figure;
      const labels: string[] = f.labels ?? f.rows.map((r: unknown[]) => r[0]);
      const ask = p.prompt.slice(p.prompt.lastIndexOf(". ") + 2);
      const head = p.prompt.slice(0, p.prompt.length - ask.length);
      const ls = key === "abcup/read" ? labels.map((l) => l.toLowerCase()) : labels;
      const prompt = head + rotateLabels(ask, ls);
      if (prompt === p.prompt) continue;
      changed++;
      assert.notEqual(holds(s, { ...p, prompt }), true, `${p.id} ${prompt}`);
    }
    assert.ok(changed > 0);
  });
}

test("adbartf/compare: a statement that is false for the picture is never judged True", () => {
  let flipped = 0;
  for (const { p, s } of sample(steps("adbartf/compare"), 400)) {
    const f: any = clone(p.figure);
    const stmt = p.prompt.match(/"(.+)"$/)![1];
    const vals: number[] = f.values;
    const idx = f.labels.map((l: string, i: number) => ({ i, at: stmt.search(new RegExp(`${l}(?:es|s)?\\b`, "i")) })).filter((h: { at: number }) => h.at >= 0).sort((a: any, b: any) => a.at - b.at).map((h: { i: number }) => h.i);
    let altered: number[] | null = null;
    if (/ in all\.$/.test(stmt)) altered = vals.map((v, i) => (i === 0 ? v + 1 : v));
    else if (/\d/.test(stmt) && idx.length === 2) altered = vals.map((v, i) => (i === idx[0] ? v + 1 : v));
    else if (idx.length === 2) altered = vals.map((v, i) => (i === idx[0] ? vals[idx[1]] : i === idx[1] ? vals[idx[0]] : v));
    if (!altered) continue;
    flipped++;
    f.values = altered;
    assert.notEqual(holds(s, withFig(p, f)), true, `${p.id} ${stmt}`);
    assert.notEqual(holds({ ...s, value: s.value === "True" ? "False" : "True" }, p), true, `${p.id} flipped value`);
    assert.notEqual(holds({ ...s, inputs: [1 - (s.inputs[0] as number)] }, p), true, `${p.id} flipped input`);
  }
  assert.ok(flipped >= 50);
});

test("adbartf/compare: all of True, False appear and are checked against both options of the answer", () => {
  const vs = new Set(steps("adbartf/compare").map(({ s }) => s.value));
  assert.deepEqual([...vs].sort(), ["False", "True"]);
});

test("adbar/read: each question kind (one bar, difference, all bars) is covered by the sample", () => {
  const kinds = new Set(steps("adbar/read").map(({ p }) => (/tallest/.test(p.prompt) ? "t" : /in all/.test(p.prompt) ? "a" : /How many more/.test(p.prompt) ? "m" : "1")));
  assert.equal(kinds.size, 4);
});

test("afbar/read: the second bar is not read as the first", () => {
  let n = 0;
  for (const { p, s } of steps("afbar/read")) {
    if (s.id !== "read2") continue;
    if (++n % 5) continue;
    const first = steps("afbar/read").find((x) => x.p === p && x.s.id === "read1")!;
    if (first.s.value === s.value) continue;
    assert.notEqual(holds({ ...s, value: first.s.value, inputs: first.s.inputs }, p), true, p.id);
    assert.notEqual(holds({ ...s, id: "read1" }, p), true, p.id);
  }
});

test("acpictmore/read: big and small are not swapped", () => {
  for (const { p, s } of sample(steps("acpictmore/read"), 100)) {
    const other = p.steps.find((x) => x.op === "read" && x.id !== s.id)!;
    assert.notEqual(holds({ ...s, id: other.id }, p), true, p.id);
  }
});

test("abcup/read: swapped container order is not confirmed", () => {
  for (const { p, s } of steps("abcup/read")) {
    if (!Array.isArray(s.value)) continue;
    assert.notEqual(holds({ ...s, inputs: [...s.inputs].reverse(), value: [...(s.value as number[])].reverse() }, p), true, p.id);
  }
});
