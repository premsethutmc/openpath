/**
 * Domain-data checks for teaching pictures (visuals@2 data repair): every repaired family picture states the mathematics of
 * its own question, and the renderer draws it (never the "not available" fallback). Pictures whose second value cannot be
 * established stay as the honest text fallback, and that set is pinned so it cannot grow silently.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { modules } from "../../../packages/learning/src/content";
(globalThis as { React?: unknown }).React = React;
const { describe: describeFigure, stripsFor, legacyStrips, legacyStripKind } = await import("./Figure");

type V = { type: string; [k: string]: unknown };
const NA = /^Picture not available/;
const teachVisual = (fam: string, p: number[]) => (FAMILIES.get(fam) as unknown as { teach?: { visual?: (p: number[]) => V } }).teach!.visual!(p);
const altVisual = (fam: string, alt: string, p: number[]) => (FAMILIES.get(fam) as unknown as { teach: { alternatives: { id: string; visual?: (p: number[]) => V }[] } }).teach.alternatives.find((a) => a.id === alt)!.visual!(p);
const fracs = (t: string) => [...t.matchAll(/(\d+)\/(\d+)/g)].map((m) => `${m[1]}/${m[2]}`);

test("fraction comparisons and unit fractions: both fractions stated, each strip shaded for its own fraction", () => {
  // adfordu orders three fractions; a two-strip picture could leave out the deciding one, so it has no picture
  assert.equal((FAMILIES.get("adfordu") as unknown as { teach: { visual?: unknown } }).teach.visual, undefined);
  for (const fam of ["adfnl", "adfcmpu"]) {
    let n = 0;
    for (const p of pool(fam).items) {
      const v = teachVisual(fam, p.params);
      const d = describeFigure(v);
      assert.ok(!NA.test(d) && v.bottomShaded !== undefined, `${p.id}: ${d}`);
      const [l1, l2] = v.labels as string[];
      const shown = fracs(p.prompt);
      assert.ok(shown.includes(l1) && shown.includes(l2), `${p.id}: labels ${l1}, ${l2} are fractions of the question (${shown.join(", ")})`);
      assert.equal(`${v.shaded}/${v.top}`, l1); assert.equal(`${v.bottomShaded}/${v.bottom}`, l2);
      n++;
    }
    assert.ok(n > 20, fam);
  }
  for (const p of pool("adfunit").items) {
    const v = teachVisual("adfunit", p.params);
    assert.ok(!NA.test(describeFigure(v)));
    assert.deepEqual([v.top, v.shaded, v.bottom, v.bottomShaded], [1, 1, p.params[1], 1], "a whole metre and one 1/b strip of it");
    assert.ok(p.prompt.includes(`1/${p.params[1]}`), p.id);
  }
});

test("unit-fraction fold: one strip of 4 equal parts with the question's quarters shaded (never more parts than exist)", () => {
  for (const p of pool("achalf").items) {
    const v = altVisual("achalf", "fold", p.params);
    const fig = p.figure;
    assert.ok(fig && fig.type === "grid" && typeof fig.rows === "number" && typeof fig.cols === "number" && typeof fig.shaded === "number");
    assert.deepEqual([v.type, v.rows, v.cols], ["grid", 1, 4]);
    assert.ok((v.shaded as number) <= 4);
    assert.equal((v.shaded as number) / 4, fig.shaded / (fig.rows * fig.cols), `${p.id}: the folded strip shows the same fraction as the question's picture`);
    assert.ok(!NA.test(describeFigure(v)));
  }
});

test("ratio bar: one bar of all the parts, the asked person's parts shaded", () => {
  const WHO = ["Anu", "Ravi", "Meena"];
  for (const p of pool("ajrdiv").items) {
    const v = teachVisual("ajrdiv", p.params);
    const ratio = p.prompt.match(/ratio ((?:\d+ : )+\d+)/)![1].split(" : ").map(Number);
    const who = WHO.findIndex((w) => new RegExp(`(How much does|get|share).*\\b${w}\\b|\\b${w}\\b's share`).test(p.prompt) && p.prompt.lastIndexOf(w) > p.prompt.indexOf("ratio"));
    assert.equal(v.cols, ratio.reduce((s, x) => s + x, 0), p.id);
    assert.equal(v.shaded, ratio[who], `${p.id}: shaded parts are ${WHO[who]}'s`);
    assert.ok(!NA.test(describeFigure(v)));
  }
});

test("exterior angle: named vertices, the question's angles, the asked angle marked, not to scale", () => {
  for (const p of pool("ahext").items) {
    const [a, b, f] = p.params;
    const v = teachVisual("ahext", p.params);
    const d = describeFigure(v);
    assert.ok(!NA.test(d), `${p.id}: ${d}`);
    assert.match(d, /^Triangle with vertices A, C and B \(not drawn to scale\)\. Side AC is extended beyond C to D/);
    if (f === 0) assert.match(d, new RegExp(`at A and B, are ${a}° and ${b}°.*exterior angle at C is marked \\?$`));
    else assert.match(d, new RegExp(`at A and B, are ${a}° and marked \\?.*exterior angle at C is ${a + b}°$`));
  }
});

test("authored modules: comparison strips state both fractions; the fraction-model picture is one strip of the stated fraction", () => {
  const scr = (c: string) => { const m = modules.find((x) => x.competency === c)!; return [...m.chapter, ...m.strategies.flatMap((s) => s.screens)]; };
  const cmp = scr("MATH.number.fraction-comparison").find((s) => s.widget?.type === "strips")!;
  assert.deepEqual(fracs(cmp.text.join(" ")).slice(0, 2), cmp.widget!.labels);
  assert.ok(!NA.test(describeFigure(cmp.widget as V)));
  const fm = scr("MATH.number.fraction-models").find((s) => s.title === "Equal parts")!;
  // the picture is the strip the math lines describe: "cut into 4 equal parts, 1 part shaded … 1/4"
  const said = fm.math!.join(" ").match(/cut into (\d+) equal parts, (\d+) parts? shaded/)!;
  assert.equal(fm.widget!.type, "grid");
  assert.deepEqual([fm.widget!.rows, fm.widget!.cols, fm.widget!.shaded], [1, Number(said[1]), Number(said[2])]);
  assert.ok(fm.math!.some((x) => x.includes(`${said[2]}/${said[1]}`)));
});

test("every strips picture a lesson can show is drawn, or is a pinned, documented text fallback", () => {
  const fallback: string[] = [];
  for (const m of modules) for (const s of [...m.chapter, ...m.strategies.flatMap((st) => st.screens)]) {
    if (s.widget?.type !== "strips") continue;
    const v = stripsFor(s.widget as V, m.competency);
    assert.ok(!NA.test(describeFigure(v)), `${m.competency} "${s.title}": ${describeFigure(v)}`);
    if (legacyStrips(v) && legacyStripKind(v) === "missing") fallback.push(`${m.competency} ${s.title}`);
  }
  for (const [id, def] of FAMILIES) for (const alt of (def as unknown as { teach?: { alternatives?: { id: string; visual?: (p: number[]) => V }[] } }).teach?.alternatives ?? []) {
    const p = pool(id).items[0]; const v = p && alt.visual?.(p.params);
    if (v?.type === "strips" && legacyStrips(v) && legacyStripKind(v) !== "equivalent") fallback.push(`${id}/${alt.id}`);
  }
  // the one remaining case: a generic bar with no instance values ("3/4 of a bar" vs "3 parts"); intended second value unknown
  assert.deepEqual(fallback.sort(), ["aifword/bar"]);
});
