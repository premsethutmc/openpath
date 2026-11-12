/**
 * visuals@2 renderer tests: the five teaching visuals drawn by the real Figure component (server-rendered SVG markup is
 * parsed and its geometry checked), the corrected package examples, every item of each family's pool, edge cases that must
 * NOT be drawn, and unchanged legacy pictures.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pool } from "../../../packages/learning/src/families";
// the test runner may compile .tsx with the classic JSX transform (React.createElement); give it the same React
(globalThis as { React?: unknown }).React = React;
const { Figure, describe: describeFigure, stripsFor } = await import("./Figure");

type V = { type: string; [k: string]: unknown };
const html = (v: V) => renderToStaticMarkup(createElement(Figure, { v }));
const num = (s: string) => Number(s);
const attrs = (tag: string): Record<string, string> => Object.fromEntries([...tag.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const rects = (h: string) => [...h.matchAll(/<rect [^>]*>/g)].map((m) => attrs(m[0]));
const texts = (h: string): (Record<string, string> & { text: string })[] => [...h.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => ({ ...attrs(`<t ${m[1]}>`), text: m[2] }));
const lines = (h: string) => [...h.matchAll(/<line [^>]*>/g)].map((m) => attrs(m[0]));
const aria = (h: string) => attrs(h.match(/<figure [^>]*>/)![0])["aria-label"].replace(/&#x27;/g, "'");
const invalid = (h: string) => h.includes('data-invalid="true"');
const ACC = "var(--accent, #2f6fde)";
const angleAt = (cx: number, cy: number, x: number, y: number) => ((Math.atan2(cy - y, x - cx) * 180) / Math.PI + 360) % 360;

// corrected package data (feat/math-teaching-content 4e655e73: TP-NUM-01 / TP-GEO-01 explanation visuals; 09 V2, V4, V5 samples)
const PACKAGE: V[] = [
  { type: "strips", top: 9, shaded: 1, bottom: 11, bottomShaded: 1, labels: ["1/9", "1/11"], description: "Two strips of the same length, each one whole: the first cut into 9 equal parts with 1 shaded (1/9), the second cut into 11 equal parts with 1 shaded (1/11)." },
  { type: "strips", top: 3, shaded: 1, bottom: 9, bottomShaded: 1, labels: ["1/3", "1/9"] },
  { type: "shape", kind: "rectangle", name: "rectangle", lengths: ["10 cm", "9 cm", "10 cm", "9 cm"], outline: true },
  { type: "triangle", angles: ["39°", "", "112°"], exterior: { at: 1, label: "?" }, notToScale: true },
  { type: "triangle", angles: ["93°", "", "?"], exterior: { at: 1, label: "129°" }, notToScale: true },
  { type: "angle", deg: 128, cross: true, labels: ["128°", "", "?", ""] },
  { type: "angle", deg: 149, cross: true, labels: ["149°", "?", "", ""] },
  { type: "grid", rows: 2, cols: 2, colLabels: ["5x", "2"], rowLabels: ["5x", "2"], labels: ["25x²", "10x", "10x", "4"] },
  { type: "grid", rows: 2, cols: 2, colLabels: ["3x", "−8"], rowLabels: ["3x", "−8"], labels: ["9x²", "−24x", "−24x", "64"] },
];

test("corrected package examples render (no fallback), with a screen-reader description and a scalable SVG", () => {
  for (const v of PACKAGE) {
    const h = html(v);
    assert.ok(!invalid(h), JSON.stringify(v));
    assert.match(h, /<svg viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?" width="100%"/, "scales to the container (mobile)");
    assert.ok(aria(h).length > 30 && !/A picture$/.test(aria(h)));
  }
  assert.equal(aria(html(PACKAGE[0])), "Two strips of the same length, each one whole: the first in 9 equal parts with 1 shaded (1/9), the second in 11 equal parts with 1 shaded (1/11)");
  assert.match(aria(html(PACKAGE[3])), /not drawn to scale.*opposite the exterior angle are 39° and 112°.*exterior angle is marked \?/);
});

// V1 — strips: equal wholes, each row its own shading (every adfcmp item, including non-unit fractions)
function stripsCheck(v: V, n1: number, d1: number, n2: number, d2: number) {
  const h = html(v);
  assert.ok(!invalid(h));
  const rs = rects(h).filter((r) => r.fill !== "none");
  const rows = [...new Set(rs.map((r) => r.y))].map((y) => rs.filter((r) => r.y === y));
  assert.equal(rows.length, 2);
  for (const [row, n, d] of [[rows[0], n1, d1], [rows[1], n2, d2]] as const) {
    assert.equal(row.length, d, "parts");
    assert.equal(row.filter((r) => r.fill === ACC).length, n, "shaded");
    const w = row.reduce((s, r) => s + num(r.width), 0);
    assert.ok(Math.abs(w - 340) < 1e-6, "every strip is the same whole");
    assert.ok(row.every((r) => Math.abs(num(r.width) - 340 / d) < 1e-6), "equal parts");
    assert.ok(row.slice(0, n).every((r) => r.fill === ACC), "shading starts at the left");
  }
  const outlines = rects(h).filter((r) => r.fill === "none");
  assert.equal(new Set(outlines.map((r) => r.width)).size, 1);
}
test("V1 strips: equal-sized wholes and independent shading for every adfcmp item", () => {
  let n = 0;
  for (const p of pool("adfcmp").items) {
    const m = p.prompt.match(/(\d+)\/(\d+)[^/]*? or (\d+)\/(\d+)/)!;
    const [a, b, c, d] = [m[1], m[2], m[3], m[4]].map(Number);
    stripsCheck({ type: "strips", top: b, shaded: a, bottom: d, bottomShaded: c, labels: [`${a}/${b}`, `${c}/${d}`] }, a, b, c, d);
    n++;
  }
  assert.ok(n >= 500);
  stripsCheck({ type: "strips", top: 2, shaded: 1, bottom: 4, bottomShaded: 1 }, 1, 2, 1, 4); // legacy rounding would shade 2 of 4
});

// V2 — perimeter outline
test("V2 perimeter: outline only, four side labels, for every aeperar perimeter item", () => {
  let n = 0;
  for (const p of pool("aeperar").items.filter((x) => x.params[0] === 1)) {
    const [l, w] = [...p.prompt.matchAll(/\d+/g)].map((x) => x[0]);
    const u = (p.prompt.match(/\d+ (m|cm)\b/) ?? [])[1] ?? "";
    const L = `${l} ${u}`.trim(), W = `${w} ${u}`.trim();
    const h = html({ type: "shape", kind: "rectangle", name: "rectangle", lengths: [L, W, L, W], outline: true });
    const poly = attrs(h.match(/<polygon [^>]*>/)![0]);
    assert.equal(poly.fill, "none");
    assert.equal(poly.stroke, ACC);
    assert.deepEqual(texts(h).map((t) => t.text), [L, W, L, W]);
    assert.ok(!texts(h).some((t) => t.text.startsWith(`${p.answer} `)), "the answer is never labelled");
    assert.match(aria(h), /drawn as an outline/);
    n++;
  }
  assert.ok(n > 50);
});

// V3 — exterior angle: side 0→1 extended past vertex 1; opposite interior angles at vertices 0 and 2; not to scale
test("V3 exterior angle: extension, arc and labels in the right places for every ahext item", () => {
  const P = [[20, 160], [240, 160], [100, 30]];
  const apex = angleAt(P[1][0], P[1][1], P[2][0], P[2][1]);
  let n = 0;
  for (const p of pool("ahext").items) {
    const [a, b, f] = p.params;
    const v: V = f === 0 ? { type: "triangle", angles: [`${a}°`, "", `${b}°`], exterior: { at: 1, label: "?" }, notToScale: true } : { type: "triangle", angles: [`${a}°`, "", "?"], exterior: { at: 1, label: `${a + b}°` }, notToScale: true };
    const h = html(v);
    assert.ok(!invalid(h), JSON.stringify(v));
    const ext = lines(h).find((x) => x["stroke-dasharray"]);
    assert.ok(ext && num(ext.x1) === 240 && num(ext.y1) === 160 && num(ext.x2) > 300 && num(ext.y2) === 160, "side 0→1 extended beyond vertex 1");
    const arc = h.match(/<path d="M ([\d.]+) ([\d.]+) A 26 26 0 0 0 ([\d.e-]+) ([\d.e-]+)"/)!;
    assert.equal(num(arc[1]), 266); // starts on the extension
    assert.ok(Math.abs(angleAt(240, 160, num(arc[3]), num(arc[4])) - apex) < 0.01, "ends on side 1→2");
    const T = texts(h);
    const at = (i: number) => T.find((t) => Math.hypot(num(t.x) - P[i][0], num(t.y) - P[i][1]) < 45 && t.text !== "Not to scale");
    assert.equal(at(0)?.text, `${a}°`);
    assert.equal(at(2)?.text, f === 0 ? `${b}°` : "?");
    const e = T.find((t) => t.text === (f === 0 ? "?" : `${a + b}°`) && num(t.x) > 240)!;
    const ea = angleAt(240, 160, num(e.x), num(e.y) - 5);
    assert.ok(ea > 0 && ea < apex, "the exterior label lies between the extension and side 1→2");
    assert.ok(T.some((t) => t.text === "Not to scale"));
    assert.match(aria(h), /not drawn to scale/);
    const answer = f === 0 ? a + b : b, given = f === 0 ? [a, b] : [a, a + b];
    if (!given.includes(answer)) assert.ok(!new RegExp(`(^|[^\\d])${answer}°`).test(aria(h)), `the description does not give the answer (${p.id})`);
    n++;
  }
  assert.equal(n, pool("ahext").items.length);
});

// V4 — crossing lines: both lines through the vertex; label i inside angle i
function crossCheck(deg: number, labels: string[]) {
  const h = html({ type: "angle", deg, cross: true, labels });
  assert.ok(!invalid(h), `${deg}`);
  const [cx, cy] = [130, 120];
  const L = lines(h);
  assert.equal(L.length, 2);
  for (const l of L) { // each line passes through the vertex and extends on both sides of it
    const [x1, y1, x2, y2] = [num(l.x1), num(l.y1), num(l.x2), num(l.y2)];
    assert.ok(Math.abs((x2 - x1) * (cy - y1) - (y2 - y1) * (cx - x1)) < 1e-6 && Math.abs(Math.hypot(x1 - cx, y1 - cy) - Math.hypot(x2 - cx, y2 - cy)) < 1e-6);
  }
  const ang = [L[0], L[1]].map((l) => angleAt(cx, cy, num(l.x2), num(l.y2)));
  assert.ok(Math.abs(ang[1] - deg) < 1e-6, "drawn to scale at deg");
  const start = [0, deg, 180, 180 + deg], width = [deg, 180 - deg, deg, 180 - deg];
  const shown = labels.map((x, i) => [x, i] as const).filter(([x]) => x.trim()); // texts are drawn in angle order
  const T = texts(h);
  assert.equal(T.length, shown.length);
  for (const [k, t] of T.entries()) {
    const i = shown[k][1];
    assert.equal(t.text, labels[i]);
    const a = angleAt(cx, cy, num(t.x), num(t.y) - 5);
    const rel = (a - start[i] + 360) % 360;
    assert.ok(rel > 0 && rel < width[i], `label ${t.text} (${a.toFixed(1)}°) inside angle ${i} [${start[i]}, ${start[i] + width[i]}] at deg ${deg}`);
  }
  return h;
}
test("V4 crossing lines: both lines through the vertex, four labels in their own angles (every afcross item, narrow angles)", () => {
  for (const p of pool("afcross").items) {
    const [a, rel] = p.params;
    const h = crossCheck(a, rel === 0 ? [`${a}°`, "", "?", ""] : rel === 1 ? [`${a}°`, "?", "", ""] : [`${a}°`, "?", "?", "?"]);
    if (rel === 0) assert.match(aria(h), /the angle opposite the first is marked \?/);
  }
  for (const d of [15, 20, 90, 160, 165]) crossCheck(d, [`${d}°`, `${180 - d}°`, `${d}°`, `${180 - d}°`]);
});

// V5 — labelled area model
test("V5 area model: each cell label in its own cell, side labels outside the edges (every ahid (px ± q)² item)", () => {
  let n = 0;
  for (const p of pool("ahid").items.filter((x) => x.params[0] < 2)) {
    const [form, a, b] = p.params; const s = form === 1 ? -1 : 1; const t = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
    const cells = [`${a * a}x²`, `${t(s * a * b)}x`, `${t(s * a * b)}x`, `${b * b}`], side = [`${a}x`, t(s * b)];
    const h = html({ type: "grid", rows: 2, cols: 2, colLabels: side, rowLabels: side, labels: cells });
    assert.ok(!invalid(h));
    const R = rects(h); const T = texts(h);
    cells.forEach((c, i) => {
      const r = R[i]; const tx = T.find((x) => x.text === c && num(x.x) > num(r.x) && num(x.x) < num(r.x) + num(r.width) && num(x.y) > num(r.y) && num(x.y) < num(r.y) + num(r.height));
      assert.ok(tx, `cell ${i} ${c}`);
    });
    const left = num(R[0].x), top = num(R[0].y);
    assert.ok(T.filter((x) => num(x.x) < left).length === 2 && T.filter((x) => num(x.y) < top).length === 2, "row labels left, column labels above");
    n++;
  }
  assert.ok(n > 100);
});

test("impossible or misleading data is not drawn: the figure says the picture is not available", () => {
  const bad: [string, V][] = [
    ["shaded beyond the parts", { type: "strips", top: 3, shaded: 4, bottom: 5, bottomShaded: 1 }],
    ["second-row shading beyond its parts", { type: "strips", top: 3, shaded: 1, bottom: 5, bottomShaded: 6 }],
    ["fractional parts", { type: "strips", top: 2.5, shaded: 1, bottom: 5, bottomShaded: 1 }],
    ["one row label", { type: "strips", top: 3, shaded: 1, bottom: 5, bottomShaded: 1, labels: ["1/3"] }],
    ["rectangle with unequal opposite sides", { type: "shape", kind: "rectangle", lengths: ["10 cm", "9 cm", "10 cm", "8 cm"], outline: true }],
    ["exterior angle not the sum of the opposite angles", { type: "triangle", angles: ["39°", "", "112°"], exterior: { at: 1, label: "150°" } }],
    ["exterior angle and adjacent angle not on a straight line", { type: "triangle", angles: ["", "50°", ""], exterior: { at: 1, label: "120°" } }],
    ["interior angles over 180°", { type: "triangle", angles: ["100°", "", "90°"], exterior: { at: 1, label: "?" } }],
    ["opposite angle not smaller than the exterior", { type: "triangle", angles: ["130°", "", "?"], exterior: { at: 1, label: "120°" } }],
    ["exterior at another vertex", { type: "triangle", angles: ["39°", "", "112°"], exterior: { at: 2, label: "?" } }],
    ["exterior on a right-triangle figure", { type: "triangle", right: true, angles: ["39°", "", "51°"], exterior: { at: 1, label: "?" } }],
    ["opposite angle labelled 180 − θ", { type: "angle", deg: 128, cross: true, labels: ["128°", "", "52°", ""] }],
    ["neighbour labelled θ", { type: "angle", deg: 128, cross: true, labels: ["128°", "128°", "", ""] }],
    ["straight angle", { type: "angle", deg: 180, cross: true, labels: ["180°", "", "?", ""] }],
    ["three labels", { type: "angle", deg: 60, cross: true, labels: ["60°", "", "?"] }],
    ["too narrow to label (5°)", { type: "angle", deg: 5, cross: true, labels: ["5°", "", "?", ""] }],
    ["too wide to label (175°)", { type: "angle", deg: 175, cross: true, labels: ["175°", "", "?", ""] }],
    ["strip label that is not the drawn fraction", { type: "strips", top: 3, shaded: 1, bottom: 5, bottomShaded: 2, labels: ["1/2", "3/4"] }],
    ["area-model cell that is not row × column", { type: "grid", rows: 2, cols: 2, rowLabels: ["5x", "2"], colLabels: ["5x", "2"], labels: ["25x²", "7x", "7x", "4"] }],
    ["area-model cell with the wrong sign", { type: "grid", rows: 2, cols: 2, rowLabels: ["3x", "−8"], colLabels: ["3x", "−8"], labels: ["9x²", "24x", "24x", "64"] }],
    ["cell labels do not fit the grid", { type: "grid", rows: 2, cols: 2, labels: ["a²", "ab", "b²"] }],
    ["asymmetric square area model", { type: "grid", rows: 2, cols: 2, rowLabels: ["a", "b"], colLabels: ["a", "b"], labels: ["a²", "ab", "2ab", "b²"] }],
  ];
  for (const [why, v] of bad) {
    const h = html(v);
    assert.ok(invalid(h), why);
    assert.ok(!h.includes("<svg"), `${why}: nothing is drawn`);
    assert.equal(aria(h), "Picture not available: its numbers do not fit together.");
    assert.equal(describeFigure(v), aria(h));
  }
  // non-square area model with consistent products is drawn; empty cell labels are described as unlabelled
  assert.ok(!invalid(html({ type: "grid", rows: 2, cols: 2, rowLabels: ["a", "b"], colLabels: ["c", "d"], labels: ["ac", "ad", "bc", "bd"] })));
  assert.match(aria(html({ type: "grid", rows: 1, cols: 2, labels: ["ab", ""] })), /the parts, row by row, are ab, unlabelled$/);
  assert.ok(!/are[ ,]*$/.test(aria(html({ type: "grid", rows: 2, cols: 2, labels: ["", "", "", ""] }))));
  // partly labelled figures stay valid (blank labels are not compared)
  assert.ok(!invalid(html({ type: "shape", kind: "rectangle", lengths: ["2 cm", "", "", ""], diagonals: true })));
});

test("legacy pictures are unchanged", () => {
  // plain triangle, single angle, plain grid, filled shape: no new elements, same descriptions
  const tri = html({ type: "triangle", angles: ["50°", "60°", "?"] });
  assert.ok(!tri.includes("Not to scale") && !tri.includes("stroke-dasharray"));
  assert.equal(describeFigure({ type: "triangle", angles: ["50°", "60°", "?"] }), "A triangle and angles 50°, 60°, ?");
  const ang = html({ type: "angle", deg: 40 });
  assert.equal(lines(ang).length, 2);
  assert.equal(aria(ang), "An angle (estimate or measure it)");
  const grid = html({ type: "grid", rows: 3, cols: 4, shaded: 5 });
  assert.equal(rects(grid).length, 12);
  assert.equal(rects(grid).filter((r) => r.fill === ACC).length, 5);
  assert.ok(rects(grid).every((r) => num(r.width) === 30));
  const shape = html({ type: "shape", kind: "rectangle", lengths: ["4 cm", "3 cm"] });
  assert.equal(attrs(shape.match(/<polygon [^>]*>/)![0]).fill, "var(--soft, #dbe6f7)");
  // legacy strips state only the first fraction: outside an equivalence lesson (no `equivalent` mark) they are described in
  // text, never drawn with a guessed second shading; marked as an exact equivalence they are drawn
  assert.match(describeFigure({ type: "strips", top: 4, bottom: 3, shaded: 3 }), /^A strip in 4 equal parts with 3 shaded\. A second strip, in 3 equal parts, is not drawn/);
  assert.ok(!html({ type: "strips", top: 4, bottom: 3, shaded: 3 }).includes("<svg"));
  const EQ = "MATH.number.equivalent-fractions";
  assert.ok(html(stripsFor({ type: "strips", top: 2, bottom: 4, shaded: 1 }, EQ)).includes("<svg"));
  assert.match(describeFigure(stripsFor({ type: "strips", top: 2, bottom: 4, shaded: 1 }, EQ)), /second in 4 equal parts with 2 shaded, the same amount$/);
  assert.match(describeFigure(stripsFor({ type: "strips", top: 4, bottom: 3, shaded: 3 }, EQ)), /is not drawn/);
  // content data cannot claim the equivalence itself (the mark is set only from the lesson's competency)
  assert.match(describeFigure({ type: "strips", top: 2, bottom: 4, shaded: 1, equivalent: true }), /is not drawn/);
  // one whole = k/k is the same amount in any lesson (unit-fractions "equal parts" data)
  assert.match(describeFigure({ type: "strips", top: 1, bottom: 4, shaded: 1 }), /second in 4 equal parts with 4 shaded, the same amount$/);
});

test("factor tree: drawn from the number itself, primes at the ends; a prime or out-of-range number is not drawn", () => {
  const h = html({ type: "factortree", n: 96 });
  assert.ok(!/figure-unavailable/.test(h));
  assert.deepEqual(texts(h).map((t) => num(t.text)), [96, 2, 48, 2, 24, 2, 12, 2, 6, 2, 3], "each split: the number, then the prime taken off; the last prime closes the tree");
  assert.equal((h.match(/<circle /g) ?? []).length, 6, "six primes circled: 2 × 2 × 2 × 2 × 2 × 3 = 96");
  assert.match(describeFigure({ type: "factortree", n: 96 }), /96 splits into 2 and 48.*ends of the branches are 2, 2, 2, 2, 2, 3$/);
  for (const n of [17, 3, 1001, 2.5]) { assert.match(html({ type: "factortree", n }), /figure-unavailable/, `${n} is not drawn`); assert.match(describeFigure({ type: "factortree", n }), /not available/); }
});

test("grid perRow: the same number of squares shaded at the start of every row; an impossible count is not drawn", () => {
  const h = html({ type: "grid", rows: 4, cols: 5, perRow: 2 });
  const r = rects(h);
  assert.equal(r.length, 20);
  const shaded = r.filter((x) => x.fill !== "#fff");
  assert.equal(shaded.length, 8, "4 rows of 2 shaded: 4 lots of 2/5");
  assert.equal(new Set(shaded.map((x) => x.x)).size, 2, "the shaded squares are the first two columns");
  assert.equal(describeFigure({ type: "grid", rows: 4, cols: 5, perRow: 2 }), "A grid of 4 rows and 5 columns with 2 squares shaded in each row");
  assert.equal(describeFigure({ type: "grid", rows: 8, cols: 3, perRow: 1 }), "A grid of 8 rows and 3 columns with 1 square shaded in each row");
  assert.match(html({ type: "grid", rows: 4, cols: 5, perRow: 6 }), /figure-unavailable/);
});

test("line graph: points on scale lines joined in order; data it cannot show exactly is not drawn", () => {
  const v = { type: "linegraph", title: "Temperature at noon (°C)", labels: ["Mon", "Tue", "Wed", "Thu"], values: [10, 20, 15, 5], scale: 5 };
  const h = html(v);
  assert.ok(!/figure-unavailable/.test(h));
  const pts = [...h.matchAll(/<circle [^>]*>/g)].map((m) => attrs(m[0]));
  assert.equal(pts.length, 4, "one point for each value");
  const ys = pts.map((p) => num(p.cy));
  assert.ok(ys[1] < ys[2] && ys[2] < ys[0] && ys[0] < ys[3], "a larger value is drawn higher (smaller y)");
  assert.ok(pts.every((p, i) => i === 0 || num(p.cx) > num(pts[i - 1].cx)), "points run left to right in order");
  assert.equal(h.match(/<polyline [^>]*points="([^"]*)"/)![1], pts.map((p) => `${p.cx},${p.cy}`).join(" "), "the line joins exactly the points");
  assert.deepEqual(texts(h).filter((t) => /^\d+$/.test(t.text)).map((t) => num(t.text)), [0, 5, 10, 15, 20, 25], "the scale is numbered on every line, one line above the largest value");
  assert.equal(describeFigure(v), "A line graph of Temperature at noon (°C), with a line on the scale every 5: Mon 10, Tue 20, Wed 15, Thu 5");
  for (const bad of [{ ...v, values: [10, 20, 12, 5] }, { ...v, labels: ["Mon", "Tue"] }, { ...v, scale: 0 }, { ...v, values: [10, 20, -5, 5] }]) assert.match(html(bad), /figure-unavailable/);
});
