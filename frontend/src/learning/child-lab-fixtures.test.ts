/**
 * child-lab@2: independent fixtures for the lab child. Every expected value here was worked out by hand from the slip's
 * written description, not by running the slip: if the lab's arithmetic drifts from what the slip says a child does, this
 * fails. Also held: the child never reads a question's answer, worked solution or parameters, and every learning policy
 * does what it says.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LabChild, SLIPS, type Op } from "../../../packages/learning/src/lab/slips";
import { askedCalculation, Calc, evaluate } from "../../../packages/learning/src/lab/work";

type Case = [op: Op, a: number, b: number, wrong: number | null];
const FIXTURES: Record<string, Case[]> = {
  signMul: [["mul", 4, -20, 80], ["div", -60, 4, 15], ["mul", -3, 5, 15], ["mul", -8, -8, null], ["mul", 3, 4, null], ["mul", 0, -5, null], ["add", -3, 5, null]],
  subNeg: [["sub", 16, -80, -64], ["sub", 5, -6, -1], ["sub", -28, -31, -59], ["sub", 16, 80, null], ["add", 3, -5, null]],
  fact78: [["mul", 7, 8, 54], ["mul", 8, 7, 54], ["mul", -7, 8, -54], ["div", 56, 7, 9], ["div", 56, 8, 6], ["mul", 7, 7, null], ["div", 63, 7, null]],
  tables78: [["mul", 7, 6, 40], ["mul", 8, 9, 70], ["mul", 7, 1, 5], ["div", 56, 7, 9], ["div", 42, 7, 7], ["mul", 6, 6, null], ["mul", 70, 8, null], ["div", 50, 7, null]],
  powAsMul: [["pow", 7, 2, 14], ["pow", 5, 4, 20], ["pow", 10, 2, 20], ["pow", 2, 2, null], ["pow", 6, -3, null], ["pow", 0, 3, null]],
  noCarry: [["add", 47, 38, 75], ["add", 19, 37, 46], ["add", 70, 56, 26], ["add", 23, 45, null], ["add", -3, 5, null]],
  smallerFromLarger: [["sub", 52, 27, 35], ["sub", 908, 235, 733], ["sub", 75, 23, null], ["sub", 27, 52, null]],
};
test("fixtures: every slip in the catalogue has hand-worked cases", () => {
  assert.deepEqual(Object.keys(FIXTURES).sort(), Object.keys(SLIPS).sort());
});
for (const [id, cases] of Object.entries(FIXTURES)) {
  test(`slip ${id}: changes exactly the operations it describes`, () => {
    for (const [op, a, b, wrong] of cases) assert.equal(SLIPS[id].faulty(op, a, b), wrong, `${id}: ${a} ${op} ${b}`);
  });
}

const plain = new LabChild([], { kind: "unsuccessful" });
const val = (src: string, ch: LabChild = plain) => evaluate(src, new Calc(ch))?.v ?? null;
test("calculation: precedence, signs, powers and brackets", () => {
  assert.equal(val("−3²"), -9); // the power binds before the minus
  assert.equal(val("(−3)²"), 9);
  assert.equal(val("2^3^2"), 512); // right-associative
  assert.equal(val("6⁵ × 6⁻³"), 36);
  assert.equal(val("√256"), 16);
  assert.equal(val("(−8) × 4 − (−60) ÷ (−4)"), -47);
  assert.equal(val("10 − 4 − 3"), 3); // left-associative
  assert.equal(val("(3 + 4"), null); // an unclosed bracket is not a calculation
  assert.equal(val("2(3)"), null);
  assert.equal(val("x + 1"), null);
});
test("calculation: the asked part of a question's words", () => {
  const cases: [string, string | null][] = [
    ["126 ÷ 7 = ?", "126 ÷ 7"], ["Work out (−8) × 4 − (−60) ÷ (−4).", "(−8) × 4 − (−60) ÷ (−4)"], ["Which equals 8 × 6?", "8 × 6"],
    ["Quick one: 7 × 7 = ?", "7 × 7"], ["8 × 8 = 64. So 8 × 9 = ?", "8 × 9"], ["7 × 6 = 7 × 5 + 7 × 1 = 35 + 7 = ?", "35 + 7"],
    ["4 + 13 = ? (You can count on from 4 on the number line.)", "4 + 13"], ["Find the value of 2⁰ + 4⁰.", "2⁰ + 4⁰"],
    ["6 × 2 = 12. Double it: 6 × 4 = ?", "6 × 4"], ["Work out 9 × 9 − (−48) ÷ 6. Choose one.", "9 × 9 − (−48) ÷ 6"],
    ["Build the 18 times table from facts you know: 18 × 7 = 10 × 7 + 8 × 7. What is 18 × 7? Choose one.", "10 × 7 + 8 × 7"],
    ["? × 7 = 56. What is the missing number?", null], ["Solve x² − 5x + 6 = 0. Give both solutions, separated by a comma.", null],
  ];
  for (const [p, want] of cases) assert.equal(askedCalculation(p), want, p);
});

/** whole questions worked by a child with one slip; every expected answer worked out by hand */
const WORKED: [slips: string[], qid: string, text: string, fired: string[]][] = [
  [["signMul"], "gen:disc:-4,-20", "0", ["signMul"]], // 16 − 80 = −64 < 0
  [["subNeg"], "gen:disc:-4,-20", "0", ["subNeg"]], // 16 − (−80) taken as 16 + (−80) = −64
  [["powAsMul"], "gen:disc:-4,-20", "2", ["powAsMul"]], // (−4)² as −8; −8 + 80 = 72 > 0: right by luck
  [[], "gen:disc:-4,-20", "2", []],
  [["fact78"], "gen:ldiv:18,7", "19", ["fact78"]], // 12 ÷ 7 → 1 r 5; 56 ÷ 7 recalled as 9
  [["tables78"], "gen:ldiv:18,7", "21", ["tables78"]], // 7×2 = 12 fits 12 exactly → 2 r 0; 7×1 = 5 fits 6 → 1
  [[], "gen:ldiv:18,7", "18", []],
  [["noCarry"], "gen:addr:47,38", "75", ["noCarry"]],
  [["smallerFromLarger"], "gen:acsub2:52,27", "35", ["smallerFromLarger"]],
  [["tables78"], "mt-p1", "B", ["tables78"]], // 8 × 6 = 46: option B
  [[], "mt-p1", "C", []],
  [["signMul"], "gen:apmmul:-3,-3,1,-2,4,-1,5,0", "[[27, 3], [14, 1]]", ["signMul"]], // (−3)(4)+(−3)(5) = 12+15 …
  [["signMul"], "qd-d1", "-1,6", ["signMul"]], // (−6) × 1 taken as 6, (−6) + 1 = −5: (x − 6)(x + 1)
  [["signMul"], "gen:aiintx:2,13,2,5,1", "31", ["signMul"]], // 13 × 2 + 5 × (−1) taken as 26 + 5
  [["subNeg"], "gen:aitemp:-6,5,0", "-1", ["subNeg"]], // 5 − (−6) taken as 5 + (−6)
  [["fact78"], "gen:amf69:1,8,3", "9", ["fact78"]],
];
for (const [slips, qid, text, fired] of WORKED) {
  test(`worked: ${qid} with ${slips.join("+") || "no slip"} → ${text}`, () => {
    const r = new LabChild(slips, { kind: "unsuccessful" }).compute(qid);
    assert.equal(r.provenance, "computed", r.note);
    assert.equal(r.text, text);
    assert.deepEqual(r.fired, fired);
    // every operand points at a step before it, or at a number given in the question
    for (const s of r.steps!) for (const f of s.from) assert.ok(f === "given" || (typeof f === "number" && f < s.n), `${qid}: step ${s.n} refers forward`);
  });
}
test("a question the lab cannot work out is unsupported, never answered right for the child", () => {
  for (const qid of ["gen:apinvf:5,-2,0,1"]) { const r = plain.compute(qid); assert.equal(r.provenance, "unsupported"); assert.equal(r.text, "?"); }
});
test("the child never reads a question's answer, solution, generator or skill", () => {
  for (const f of ["slips.ts", "work.ts"]) {
    const src = readFileSync(new URL(`../../../packages/learning/src/lab/${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const bad of [/\.answer\b/, /\.solution\b/, /problemOf/, /\.params\b/, /\.competency\b/, /\.skill\b/, /\.steps\b(?!\.)/]) assert.ok(!bad.test(src.replace(/w\.work\.steps|calc\.steps|this\.steps/g, "")), `${f} reads ${bad}`);
  }
});
test("provenance: guessed, memorized and staged answers say so", () => {
  assert.equal(new LabChild([], { kind: "immediate" }, { guesser: true }).answer("mt-d1").provenance, "guessed");
  assert.equal(new LabChild([], { kind: "immediate" }, { remembers: () => "56" }).answer("mt-d1").provenance, "memorized");
  assert.equal(new LabChild([], { kind: "immediate" }, { stage: () => "1" }).answer("mt-d1").provenance, "staged");
});
test("learning policies do what they say", () => {
  const MT = "MATH.number.multiplication-tables", DAY = 86_400_000;
  const now = (ch: LabChild) => [...ch.active.keys()];
  const im = new LabChild(["tables78"], { kind: "immediate" }); im.taught(MT, 0); assert.deepEqual(now(im), []);
  const no = new LabChild(["tables78"], { kind: "unsuccessful" }); no.taught(MT, 0); no.taught(MT, 1); assert.deepEqual(now(no), ["tables78"]);
  const de = new LabChild(["tables78"], { kind: "delayed", lessons: 2 }); de.taught(MT, 0); assert.deepEqual(now(de), ["tables78"]); de.taught(MT, 1); assert.deepEqual(now(de), []);
  const pa = new LabChild(["signMul", "subNeg"], { kind: "partial", repairs: ["signMul"] }); pa.taught("MATH.number.integer-multiply", 0); pa.taught("MATH.number.integer-add", 0); assert.deepEqual(now(pa), ["subNeg"]);
  const fo = new LabChild(["tables78"], { kind: "forgotten", afterDays: 5 }); fo.taught(MT, 0); fo.forget(4 * DAY); assert.deepEqual(now(fo), []); fo.forget(5 * DAY); assert.deepEqual(now(fo), ["tables78"]);
  const other = new LabChild(["tables78"], { kind: "immediate" }); other.taught("MATH.number.integer-add", 0); assert.deepEqual(now(other), ["tables78"]); // a lesson on another skill repairs nothing
});
