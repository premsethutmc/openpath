/**
 * Curriculum mapping accuracy (meaning@4), measured honestly against the hand-checked curriculum inventory
 * (content/learning/syllabus/*.json: CBSE and Tamil Nadu, Grades 1–12, every outcome with the competencies it maps to).
 *
 * The inventory is also the mapper's exemplar index, so every measure here holds exemplars out:
 *   leave-one-out        the outcome being mapped is never its own exemplar
 *   leave-one-file-out   the whole book (board and grade) it came from is held out: an unseen textbook
 *   leave-one-board-out  every book of its board is held out: an unseen board
 * Thresholds are what meaning@4 achieves, minus a small margin, so a change that makes mapping worse fails here.
 * Measured on 2026-10-19 (1,197 outcomes); meaning@3 (concepts only) for comparison: top-1 36.6%, any candidate
 * 50.8%, clear 29.7% of outcomes, clear but wrong 10.6% of outcomes.
 *
 *                        top-1   any    clear   clear but wrong
 *   leave-one-out        76.2%   90.4%  52.1%   5.6%
 *   leave-one-file-out   75.6%   89.1%  50.4%   4.7%
 *   leave-one-board-out  74.2%   88.3%  47.9%   4.9%
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { graph } from "../../../packages/learning/src/graph";
import { EXEMPLAR_COUNT, interpret, MEANING_VERSION, rank, type InterpretOptions } from "../../../packages/learning/src/meaning";
import { exemplarIndex, serialise } from "../../../packages/learning/scripts/mapping-exemplars";

const root = new URL("../../../content/learning/", import.meta.url);
const items: { id: string; source: string; board: string; statement: string; grade: number; mapped: string[] }[] = [];
for (const f of readdirSync(new URL("syllabus/", root)).filter((x) => /^(cbse|tn)-g\d\d\.json$/.test(x)).sort()) {
  const s = JSON.parse(readFileSync(new URL(`syllabus/${f}`, root), "utf8")) as { board: string; grade: number; chapters: { outcomes: { id: string; statement: string; mapped?: string[] }[] }[] };
  for (const ch of s.chapters) for (const o of ch.outcomes) if (o.mapped?.length) items.push({ id: o.id, source: f.replace(/\.json$/, ""), board: s.board, statement: o.statement, grade: s.grade, mapped: o.mapped });
}

type Mode = "leave-one-out" | "leave-one-file-out" | "leave-one-board-out";
const held = (mode: Mode, it: (typeof items)[number]): InterpretOptions["exclude"] =>
  mode === "leave-one-out" ? (e) => e.id === it.id : mode === "leave-one-file-out" ? (e) => e.source === it.source : (e) => e.source.split("-")[0] === it.board;
function measure(mode: Mode) {
  let top = 0, any = 0, clear = 0, clearWrong = 0;
  for (const it of items) {
    const m = interpret(it.statement, it.grade, 3, { exclude: held(mode, it) });
    const ids = m.candidates.map((c) => c.id);
    const right = !!ids[0] && it.mapped.includes(ids[0]);
    if (right) top++;
    if (ids.some((id) => it.mapped.includes(id))) any++;
    if (m.verdict === "clear") {
      clear++;
      if (!right) clearWrong++;
    }
  }
  const n = items.length;
  return { top: top / n, any: any / n, clear: clear / n, clearWrong: clearWrong / n };
}

test("mapping exemplars: the index is generated from the inventory and is current", () => {
  assert.equal(MEANING_VERSION, "meaning@4");
  assert.ok(items.length >= 1100, "the inventory has its outcomes");
  const file = readFileSync(new URL("mapping-exemplars.v1.json", root), "utf8");
  assert.equal(file, serialise(exemplarIndex()), "mapping-exemplars.v1.json is GENERATED: run node --import tsx packages/learning/scripts/mapping-exemplars.ts");
  // every inventory outcome is an exemplar, and every competency's own wording is one too
  assert.equal(EXEMPLAR_COUNT, items.length + graph.competencies.filter((c) => !c.partOf).length);
});

test("mapping evaluation never sees the held-out outcome or book", () => {
  for (const it of items.filter((_, k) => k % 97 === 0)) {
    assert.ok(!rank(it.statement, it.grade, { exclude: held("leave-one-out", it) }).near.some((n) => n.e.id === it.id));
    assert.ok(!rank(it.statement, it.grade, { exclude: held("leave-one-file-out", it) }).near.some((n) => n.e.source === it.source));
  }
});

test("mapping accuracy, leave-one-out: well above meaning@3, and rarely clear but wrong", () => {
  const r = measure("leave-one-out");
  assert.ok(r.top >= 0.74, `top-1 ${r.top}`);
  assert.ok(r.any >= 0.88, `any candidate ${r.any}`);
  assert.ok(r.clearWrong <= 0.07, `clear but wrong ${r.clearWrong}`);
  assert.ok(r.clear >= 0.45, `clear ${r.clear}: saying "uncertain" for everything is not the answer either`);
});

test("mapping accuracy, leave-one-file-out (an unseen textbook)", () => {
  const r = measure("leave-one-file-out");
  assert.ok(r.top >= 0.73, `top-1 ${r.top}`);
  assert.ok(r.any >= 0.87, `any candidate ${r.any}`);
  assert.ok(r.clearWrong <= 0.06, `clear but wrong ${r.clearWrong}`);
  assert.ok(r.clear >= 0.45, `clear ${r.clear}`);
});

test("mapping accuracy, leave-one-board-out (an unseen board)", () => {
  const r = measure("leave-one-board-out");
  assert.ok(r.top >= 0.72, `top-1 ${r.top}`);
  assert.ok(r.any >= 0.86, `any candidate ${r.any}`);
  assert.ok(r.clearWrong <= 0.06, `clear but wrong ${r.clearWrong}`);
  assert.ok(r.clear >= 0.43, `clear ${r.clear}`);
});

test("meaning@4 keeps its refusals: no mathematics, or mathematics the map does not have, is never forced onto a skill", () => {
  assert.equal(interpret("describe how a rainbow forms", 9).verdict, "missing");
  assert.equal(interpret("Read a bus timetable to plan a journey", 4).verdict, "missing");
  assert.equal(interpret("solve word problems involving fractions", 4).verdict, "uncertain");
  assert.equal(interpret("Round numbers to the nearest thousand", 4).candidates[0]?.id, "MATH.number.rounding");
  assert.equal(interpret("Weigh objects on a balance in kilograms and grams", 3, 3, { exclude: (e) => e.source === "cbse-g03" }).candidates[0]?.id, "MATH.measurement.standard-mass");
});
