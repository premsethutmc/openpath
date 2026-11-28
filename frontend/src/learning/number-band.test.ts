/**
 * number-band@2: a Class 1–3 question belongs to the class whose numbers it uses (Class 1 up to 99 and patterns that grow
 * by 1 or 2; Class 2 up to 999 and growth up to 10; Class 3 up to 9,999), counted from the numbers its generator declares
 * by role (quantities, calendar labels, a sequence's growth). Expected classes here are written by hand from the question
 * the learner sees, never computed by the classifier.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules } from "../../../packages/learning/src/content";
import { FAMILIES, gradeOfQuestion, inPool, phasePool, pool, problemOf } from "../../../packages/learning/src/families";
import { firstClassOf } from "../../../packages/learning/src/first-class";
import { BAND_MAX, bandClass, numericAnswer } from "../../../packages/learning/src/number-band";

/** The class a question is in for a learner: its own grade, else the class its skill starts in. */
const classOf = (qid: string) => gradeOfQuestion(qid.replace(/:(mc|w)$/, "")) ?? firstClassOf(problemOf(qid)!.competency);
/** Every answer format of a problem is in the class written by hand. */
const expect = (qid: string, cls: number, note: string) => {
  for (const f of ["", ":mc", ":w"]) if (problemOf(qid + f)) assert.equal(classOf(qid + f), cls, `${qid + f}: ${note}`);
};

test("limits: 99 | 100, 999 | 1000, 9999 | 10000 (hand-labelled)", () => {
  const c = (n: number, first = 1) => bandClass(first, { amounts: [n] });
  assert.deepEqual([c(99), c(100), c(999), c(1000), c(9999), c(10000)], [1, 2, 2, 3, 3, 4]);
  assert.deepEqual([c(99, 2), c(999, 3), c(10000, 3)], [2, 3, 4]); // never below the class the skill starts in
});

test("a sequence's growth: 2 | 3 and 10 | 11 (hand-labelled)", () => {
  const s = (step: number) => bandClass(1, { amounts: [5], step });
  assert.deepEqual([s(1), s(2), s(3), s(10), s(11)], [1, 1, 2, 2, 3]);
  assert.equal(bandClass(1, { amounts: [5] }), 1); // no declared sequence: no growth limit
});

test("calendar labels are not quantities; a quantity of the same value still counts", () => {
  assert.equal(bandClass(1, { amounts: [4], labels: [2026] }), 1);
  assert.equal(bandClass(1, { amounts: [2026], labels: [2026] }), 3); // 2,026 people in the calendar year 2026
  assert.equal(bandClass(1, { amounts: [1995, 1995], labels: [2026] }), 3);
});

test("Indian and international grouping of a numeric answer", () => {
  assert.equal(numericAnswer("3,72,004"), 372004);
  assert.equal(numericAnswer("1,00,000"), 100000);
  assert.equal(numericAnswer("12,34,56,789"), 123456789);
  assert.equal(numericAnswer("10,000"), 10000);
  assert.equal(numericAnswer("1,995"), 1995);
  assert.equal(numericAnswer("−45"), -45);
  assert.equal(numericAnswer("18, 52, 86"), null); // a list, not a number
  assert.equal(numericAnswer("B"), null);
});

test("independent acceptance cases (generated questions, classes written by hand)", () => {
  // digit cards are not a growing pattern; their numbers are below 100
  expect("gen:aagreat:57,0", 1, "cards 1, 5, 9 → 95");
  expect("gen:aagreat:57,1", 1, "cards 1, 5, 9 → 15");
  expect("gen:aagreat:77,0", 1, "cards 2, 5, 8 → 85");
  expect("gen:aagreat:77,1", 1, "cards 2, 5, 8 → 25");
  expect("gen:abenough:6,2,6", 1, "₹10 for ₹6 and ₹2: not a pattern");
  expect("gen:adtwo:2,8,3,2,3", 1, "a two-way table with a missing number");
  expect("gen:aaordn:113,3,0", 1, "order 86, 52, 18");
  expect("gen:aapatn:3,2,5,0", 1, "2, 5, 8 repeating: repeats, does not grow");
  expect("gen:aamake:18,1,1", 1, "pay ₹18 with ₹10 and ₹2 coins");
  // genuine sequences
  expect("gen:acgrow:1,2,5", 1, "1, 3, 5 … grows by 2");
  expect("gen:acgrow:7,3,5", 2, "7, 10, 13 … grows by 3");
  // calendar: the year names the calendar; days and counts are the numbers
  expect("gen:aacald:0,0,0,1", 1, "first Sunday of January 2026 → 4");
  expect("gen:aaday:0,0,1", 1, "day of the week of 1 January 2026");
  expect("gen:aamdays:1,0,0", 2, "days in the year 2024 → 366");
  // larger quantities
  expect("gen:abchange:10,3", 2, "change from a ₹100 note");
  expect("gen:admental:1,0", 4, "1,003 + ? = 10,000");
  expect("gen:avpp:133,89,0", 4, "133 × 89 = 11,837");
  expect("gen:aernd:4,0", 4, "3,72,004 km, Indian grouping");
});

test("a valid generator instance that is not released: 1,995 + 1,995 (no year is involved)", () => {
  assert.equal(inPool("gen:aecol4:0,1995,1995"), false); // capped family: valid but not sampled
  assert.match(problemOf("gen:aecol4:0,1995,1995:w")!.prompt, /January 1,995 people/);
  expect("gen:aecol4:0,1995,1995", 3, "1,995 visitors twice → 3,990: Class 3 numbers, in every format");
});

/** The numbers a learner sees in a question (words, a numeric answer, table cells, coins, pictograph counts). A test-only
 *  reading of the screen, used to check the generators' declarations, never to classify. */
const shown = (qid: string): number[] => {
  const q = problemOf(qid)!;
  const txt = (s: string) => (s.match(/\d{1,3}(?:,\d{2,3})+(?!\d)|\d+/g) ?? []).map((x) => Number(x.replace(/,/g, "")));
  const f = (q.figure ?? {}) as { type?: string; rows?: unknown[][]; items?: number[]; counts?: number[] };
  const fig = f.type === "table" ? (f.rows ?? []).flat().flatMap((c) => txt(String(c))) : f.type === "coins" ? f.items ?? [] : f.type === "pictograph" ? f.counts ?? [] : [];
  return [...txt(q.prompt), ...(numericAnswer(q.answer) === null ? [] : [numericAnswer(q.answer)!]), ...fig];
};

test("no released question shows a number above its class (labels the family declares aside), in any format", () => {
  const over: string[] = [];
  for (const [id, def] of FAMILIES) {
    const first = firstClassOf(def.competency);
    if (first === null || first > 3 || def.grade) continue;
    for (const p of pool(id).items) for (const qid of [p.id, def.mc ? `${p.id}:mc` : null, def.word ? `${p.id}:w` : null]) {
      if (!qid || !problemOf(qid)) continue;
      const cls = classOf(qid)!;
      if (cls > 3) continue;
      const labels = new Set(def.band?.(p.params).labels ?? []);
      const big = Math.max(0, ...shown(qid).filter((n) => !labels.has(n)));
      if (big > BAND_MAX[cls - 1]) over.push(`${qid} (Class ${cls}) shows ${big}${def.band ? "" : ": declare band"}`);
    }
  }
  assert.deepEqual(over.slice(0, 15), [], `${over.length} questions`);
});

test("every skill first taught in Class 1–3 has at least 12 questions of that class", () => {
  const onClass = new Map<string, number>();
  for (const [id, def] of FAMILIES) {
    const first = firstClassOf(def.competency);
    if (first === null || first > 3 || def.grade) continue; // a family that gives its own grade is placed by it
    const n = pool(id).items.filter((p) => { const g = gradeOfQuestion(p.id); return g === null || g <= first; }).length;
    onClass.set(def.competency, (onClass.get(def.competency) ?? 0) + n);
  }
  assert.deepEqual([...onClass].filter(([, n]) => n < 12), []);
});

test("a Class 1–3 lesson example uses numbers of the class the skill starts in, when its family has such practice questions", () => {
  const above: string[] = [];
  for (const m of modules) {
    const first = firstClassOf(m.competency);
    if (first === null || first > 3) continue;
    for (const sc of m.chapter) {
      const id = (sc as { instance?: string }).instance?.replace(/:(mc|w)$/, "");
      if (!id) continue;
      const g = gradeOfQuestion(id), fam = problemOf(id)?.family;
      if (g === null || g <= first || !fam) continue;
      const hasOnClass = phasePool(fam, "practice").some((id) => { const x = gradeOfQuestion(id.replace(/:(mc|w)$/, "")); return x === null || x <= first; });
      if (hasOnClass) above.push(`${m.competency}: ${id} (Class ${g})`);
    }
  }
  assert.deepEqual(above.slice(0, 10), []);
});

test("rounding-class3@1: Class 3 rounds four-digit numbers in real situations (ten, hundred, thousand)", () => {
  const on = pool("aernd").items.filter((p) => { const g = gradeOfQuestion(p.id); return g === null || g <= 3; });
  assert.ok(on.length >= 200, `${on.length} Class 3 questions`);
  for (const place of ["ten", "hundred", "thousand"]) assert.ok(on.some((p) => p.prompt.endsWith(`nearest ${place}.`)), place);
  // the large numbers of later classes are still there, placed in Class 4
  assert.ok(pool("aernd").items.some((p) => /lakh|crore/.test(p.prompt) && gradeOfQuestion(p.id) === 4));
});

test("selection for a learner follows the hand-written classes (practice, diagnostic, lesson practice)", async () => {
  const { withinGrade, gradeRank } = await import("../../../packages/learning/src/intervention");
  const { alignedPractice } = await import("../../../packages/learning/src/teaching-contract");
  type R = Parameters<typeof withinGrade>[0];
  const learner = (grade: number) => ({ enrolments: [{ at: "2026-06-01", grade, academicYear: "2026-27", curriculum: { id: "x", version: "1", hash: "x" } }], attempts: [], unresolved: [], pending: [] }) as unknown as R;
  const [c1, c2, c3] = [learner(1), learner(2), learner(3)];
  // a Class 1 learner may be asked the digit-card and money questions that are Class 1 by hand, in every format
  for (const id of ["gen:aagreat:77,0", "gen:aagreat:77,0:mc", "gen:aagreat:77,0:w", "gen:abenough:6,2,6", "gen:adtwo:2,8,3,2,3"]) assert.ok(withinGrade(c1, id), id);
  // … and not change from a ₹100 note (Class 2 by hand), which a Class 2 learner may be asked
  for (const id of ["gen:abchange:10,3", "gen:abchange:10,3:mc", "gen:abchange:10,3:w"]) { assert.ok(!withinGrade(c1, id), id); assert.ok(withinGrade(c2, id), id); }
  // grade order: for a Class 3 learner a Class 2 question is below grade; for a Class 2 learner it is on grade
  assert.equal(gradeRank(c2)("gen:abchange:10,3"), 0);
  assert.equal(gradeRank(c3)("gen:abchange:10,3"), 1);
  // practice after a lesson, for a Class 1 learner
  const pv = modules.find((m) => m.competency === problemOf("gen:aagreat:77,0")!.competency)!;
  // (the first id is the lesson's own worked example; the rest are practice)
  const pvPractice = alignedPractice(pv, ["gen:aagreat:77,1", "gen:aagreat:57,1", "gen:aagreat:57,0"], 1);
  assert.ok(pvPractice.includes("gen:aagreat:57,1") && pvPractice.includes("gen:aagreat:57,0"), String(pvPractice));
  const ch = modules.find((m) => m.competency === problemOf("gen:abchange:10,3")!.competency)!;
  assert.ok(!alignedPractice(ch, ["gen:abenough:6,2,6", "gen:abchange:10,3"], 1).includes("gen:abchange:10,3"));
  assert.ok(alignedPractice(ch, ["gen:abenough:6,2,6", "gen:abchange:10,3"], 2).includes("gen:abchange:10,3"));
});
