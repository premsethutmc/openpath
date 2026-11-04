/**
 * visuals@2 on the LEARNER path: the teaching visuals rendered through Learn.tsx's Lesson (strategy screens, which route
 * strips through Picture) and checked as the learner receives them, including a phone-width (375 px) layout check.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// the test runner may compile .tsx with the classic JSX transform (React.createElement); give it the same React
(globalThis as { React?: unknown }).React = React;
const { Lesson } = await import("./Learn");

type W = { type: string; [k: string]: unknown };
const lesson = (widget: W, competency?: string) =>
  renderToStaticMarkup(createElement(Lesson, { s: { title: "Strategy", screens: [{ title: "Screen", text: ["Look at the picture."], widget } as never] }, onDone: () => {}, saving: false, competency }));
const attrs = (tag: string): Record<string, string> => Object.fromEntries([...tag.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const ACC = "var(--accent, #2f6fde)";
const svgRows = (h: string) => { const rs = [...h.matchAll(/<rect [^>]*>/g)].map((m) => attrs(m[0])).filter((r) => r.fill !== "none"); return [...new Set(rs.map((r) => r.y))].map((y) => rs.filter((r) => r.y === y)); };
const htmlRows = (h: string) => [...h.matchAll(/<div class="strip"[^>]*>(.*?)<\/div>/g)].map((m) => [...m[1].matchAll(/<span class="(on)?"><\/span>/g)].map((x) => !!x[1]));
const figureAria = (h: string) => attrs(h.match(/<figure [^>]*>/)![0])["aria-label"];
const COMPARE = "MATH.number.fraction-comparison", EQUIV = "MATH.number.equivalent-fractions";

test("1/2 versus 1/4 with both fractions stated: equal wholes, 1 of 2 and 1 of 4 shaded (any lesson)", () => {
  for (const c of [COMPARE, EQUIV, undefined]) {
    const h = lesson({ type: "strips", top: 2, shaded: 1, bottom: 4, bottomShaded: 1, labels: ["1/2", "1/4"] }, c);
    const rows = svgRows(h);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => [r.length, r.filter((x) => x.fill === ACC).length]), [[2, 1], [4, 1]]);
    assert.deepEqual(rows.map((r) => r.reduce((s, x) => s + Number(x.width), 0)), [340, 340], "equal wholes");
    assert.match(figureAria(h), /first in 2 equal parts with 1 shaded \(1\/2\), the second in 4 equal parts with 1 shaded \(1\/4\)/);
  }
});

test("legacy 1/2 vs 1/4 data outside an equivalence lesson: text, not the misleading 2-of-4 picture", () => {
  // the b04 unit-fraction comparison sends exactly this; the old picture shaded 2 of 4, making 1/4 look equal to 1/2
  const h = lesson({ type: "strips", top: 2, bottom: 4, shaded: 1 }, COMPARE);
  assert.ok(!h.includes("<svg") && !h.includes('class="strip"'), "no picture");
  assert.match(h, /data-fallback="strips"/);
  assert.equal(figureAria(h), "A strip in 2 equal parts with 1 shaded. A second strip, in 4 equal parts, is not drawn because how much of it is shaded is not given");
  // the same with no lesson context, and the comparison module's own legacy widget (3/8 vs 5/8 drawn as 3/8 and 3/8 before)
  assert.match(lesson({ type: "strips", top: 2, bottom: 4, shaded: 1 }), /data-fallback="strips"/);
  assert.match(lesson({ type: "strips", top: 8, bottom: 8, shaded: 3 }, COMPARE), /data-fallback="strips"/);
});

test("valid equivalent-fraction visuals are preserved in equivalence lessons (existing two-row picture)", () => {
  for (const [top, bottom, shaded, second] of [[2, 4, 1, 2], [2, 8, 1, 4], [3, 6, 2, 4]] as const) {
    const h = lesson({ type: "strips", top, bottom, shaded }, EQUIV);
    const rows = htmlRows(h);
    assert.deepEqual(rows.map((r) => [r.length, r.filter(Boolean).length]), [[top, shaded], [bottom, second]]);
    assert.ok(rows.every((r) => r.slice(0, r.filter(Boolean).length).every(Boolean)), "shading from the left");
    assert.match(figureAria(h), new RegExp(`the second in ${bottom} equal parts with ${second} shaded, the same amount`));
  }
  // an equivalence that is not exact cannot be drawn honestly (the old rounding): text instead
  assert.match(lesson({ type: "strips", top: 4, bottom: 3, shaded: 3 }, EQUIV), /data-fallback="strips"/);
});

test("one whole = k/k is drawn in any lesson; content cannot mark itself as an equivalence", () => {
  const whole = htmlRows(lesson({ type: "strips", top: 1, bottom: 4, shaded: 1 }, "MATH.number.unit-fractions"));
  assert.deepEqual(whole.map((r) => [r.length, r.filter(Boolean).length]), [[1, 1], [4, 4]]);
  assert.match(lesson({ type: "strips", top: 2, bottom: 4, shaded: 1, equivalent: true }, COMPARE), /data-fallback="strips"/);
});

test("every learner path passes the lesson's competency to the picture", () => {
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  const learn = src("./Learn.tsx"), study = src("./StudySession.tsx"), teaching = src("../curriculum/TeachingContent.tsx");
  for (const [name, text] of [["Learn.tsx", learn], ["StudySession.tsx", study]] as const) {
    const calls = [...text.matchAll(/<Lesson\b[^>]*>/g)].map((m) => m[0]);
    assert.ok(calls.length > 0 && calls.every((c) => c.includes("competency={competency}")), `${name}: every <Lesson> passes competency`);
  }
  assert.match(learn, /<Picture w=\{sc\.widget\} competency=\{competency\} \/>/);
  assert.match(teaching, /<TeachingBlock [^>]*competency=\{competency\}/);
  assert.match(teaching, /<Figure v=\{stripsFor\(block\.widget[^}]*\}?, competency\)\} \/>/);
});

test("missing or inconsistent comparison data is never drawn", () => {
  const cases: [string, W][] = [
    ["labels without the second shading", { type: "strips", top: 2, shaded: 1, bottom: 4, labels: ["1/2", "1/4"] }],
    ["a label that is not the drawn fraction", { type: "strips", top: 2, shaded: 1, bottom: 4, bottomShaded: 2, labels: ["1/2", "1/4"] }],
    ["first shading beyond its parts", { type: "strips", top: 1, bottom: 4, shaded: 2 }],
  ];
  for (const [why, w] of cases) { const h = lesson(w, COMPARE); assert.ok(!h.includes("<svg") && !h.includes('class="strip"'), why); assert.match(h, /Picture not available/, why); }
});

test("named exterior angle: vertex names drawn at the corners and used in the description", () => {
  const h = lesson({ type: "triangle", angles: ["39°", "", "112°"], exterior: { at: 1, label: "?" }, notToScale: true, vertices: ["A", "C", "B"], extendedTo: "D" }, "MATH.geometry.triangle-properties");
  const T: (Record<string, string> & { text: string })[] = [...h.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => ({ ...attrs(`<t ${m[1]}>`), text: m[2] }));
  const near = (x: number, y: number, t: string) => T.some((e) => e.text === t && Math.hypot(Number(e.x) - x, Number(e.y) - y) < 26);
  assert.ok(near(20, 160, "A") && near(240, 160, "C") && near(100, 30, "B") && near(322, 160, "D"), "names at their corners and at the end of the extension");
  const nearA = (x: number, y: number, t: string) => T.some((e) => e.text === t && Math.hypot(Number(e.x) - x, Number(e.y) - y) < 45);
  assert.ok(nearA(20, 160, "39°") && nearA(100, 30, "112°"), "the opposite angles at A and B");
  assert.ok(T.some((e) => e.text === "Not to scale"));
  assert.equal(figureAria(h), "Triangle with vertices A, C and B (not drawn to scale). Side AC is extended beyond C to D, making an exterior angle at C. The interior angles opposite it, at A and B, are 39° and 112°; the interior angle at C is not labelled; the exterior angle at C is marked ?");
  // names that are not three distinct capital letters, or an extension name that repeats a vertex, are refused
  for (const bad of [{ vertices: ["A", "A", "B"] }, { vertices: ["A", "C"] }, { vertices: ["a", "c", "b"] }, { vertices: ["A", "C", "B"], extendedTo: "C" }, { vertices: ["A'", "A′", "B"] }])
    assert.match(lesson({ type: "triangle", angles: ["39°", "", "112°"], exterior: { at: 1, label: "?" }, ...bad }), /Picture not available/);
});

test("area model: single-term labels are checked; compound labels are not drawn as if checked", () => {
  const ok = lesson({ type: "grid", rows: 2, cols: 2, rowLabels: ["5x", "2"], colLabels: ["5x", "2"], labels: ["25x²", "10x", "10x", "4"] }, "MATH.algebra.identities");
  assert.ok(ok.includes("<svg") && ok.includes(">25x²<") && ok.includes(">10x<"));
  const wrong = lesson({ type: "grid", rows: 2, cols: 2, rowLabels: ["5x", "2"], colLabels: ["5x", "2"], labels: ["25x²", "7x", "7x", "4"] });
  assert.match(figureAria(wrong), /numbers do not fit together/);
  for (const compound of [
    { rowLabels: ["x + 3", "2"], colLabels: ["x", "1"], labels: ["x² + 3x", "x + 3", "2x", "2"] }, // true, but not checkable here
    { rowLabels: ["x + 3", "2"], colLabels: ["x", "1"], labels: ["x² + 3", "x + 3", "2x", "2"] }, // false: must not pass either
    { rowLabels: ["5x", "2"], colLabels: ["5x", "2"], labels: ["25x²", "10x + 0", "10x", "4"] },
  ]) {
    const h = lesson({ type: "grid", rows: 2, cols: 2, ...compound });
    assert.ok(!h.includes("<svg"), JSON.stringify(compound));
    assert.equal(figureAria(h), "Picture not available: its labels cannot be checked.");
  }
  // zero products are equal; coefficients beyond exact arithmetic are not checked (not drawn)
  assert.ok(lesson({ type: "grid", rows: 1, cols: 2, rowLabels: ["0"], colLabels: ["x", "2"], labels: ["0x", "0"] }).includes("<svg"));
  assert.match(lesson({ type: "grid", rows: 1, cols: 1, rowLabels: ["1"], colLabels: ["9007199254740993"], labels: ["9007199254740992"] }), /labels cannot be checked/);
  // cell labels with no side labels claim no product: drawn (the existing identities widget)
  assert.ok(lesson({ type: "grid", rows: 2, cols: 2, labels: ["a²", "ab", "ab", "b²"] }).includes("<svg"));
});

test("phone width (375 px): the learner's lesson screens fit without horizontal scrolling", async (t) => {
  let chromium: typeof import("playwright").chromium;
  try { ({ chromium } = await import("playwright")); } catch { t.skip("playwright is not installed"); return; }
  let browser; try { browser = await chromium.launch(); } catch { t.skip("no browser available"); return; }
  const css = readFileSync(new URL("./year.css", import.meta.url), "utf8");
  const screens: W[] = [
    { type: "strips", top: 9, shaded: 1, bottom: 11, bottomShaded: 1, labels: ["1/9", "1/11"] },
    { type: "strips", top: 2, bottom: 8, shaded: 1 },
    { type: "shape", kind: "rectangle", name: "rectangle", lengths: ["1000 cm", "999 cm", "1000 cm", "999 cm"], outline: true },
    { type: "triangle", angles: ["39°", "", "112°"], exterior: { at: 1, label: "?" }, notToScale: true, vertices: ["A", "C", "B"], extendedTo: "D" },
    { type: "angle", deg: 128, cross: true, labels: ["128°", "", "?", ""] },
    { type: "grid", rows: 2, cols: 2, rowLabels: ["3x", "−8"], colLabels: ["3x", "−8"], labels: ["9x²", "−24x", "−24x", "64"] },
  ];
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
    for (const w of screens) {
      await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css} body{margin:16px}</style>${lesson(w, EQUIV)}`);
      const m = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, fig: Math.max(0, ...[...document.querySelectorAll("figure svg, figure.strips")].map((e) => e.getBoundingClientRect().right)) }));
      assert.ok(m.doc <= 375 && m.fig <= 375 - 8, `${w.type}: ${JSON.stringify(m)}`);
    }
  } finally { await browser.close(); }
});
