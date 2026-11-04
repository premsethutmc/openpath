/**
 * The Completing the square reference unit.
 *   1. Every answer key is recomputed here from the numbers in the question (exact rational arithmetic), and every
 *      written misconception is a well-formed wrong answer.
 *   2. Five synthetic learner journeys check what the program offers (explanation, practice, remediation, resume).
 *      They test the program's behaviour, not learning: no learning gain is claimed from synthetic learners.
 *   3. Evidence semantics stay the shared engine's: teaching is assisted, hints are recorded, nothing verifies.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { advice, canComplete, isCorrect, misconception, normalise, question, replay, resumePoint, stageOf, standing, struggling, unit, type UnitActivity } from "../../../../packages/mathematics/src/unit";
import { replay as chapterReplay } from "../../../../packages/mathematics/src/chapter";
import { replay as fractionsReplay } from "../../../../packages/mathematics/src/fractions-program";

// ---------------------------------------------------------------- exact rationals
type R = [number, number];
const g = (a: number, b: number): number => (b ? g(b, a % b) : Math.abs(a));
const r = (n: number, d = 1): R => { const k = g(n, d) || 1; return d < 0 ? [-n / k, -d / k] : [n / k, d / k]; };
const add = (a: R, b: R) => r(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const sub = (a: R, b: R) => add(a, [-b[0], b[1]]);
const mul = (a: R, b: R) => r(a[0] * b[0], a[1] * b[1]);
const div = (a: R, b: R) => r(a[0] * b[1], a[1] * b[0]);
const s = ([n, d]: R) => (d === 1 ? String(n) : `${n}/${d}`);
const sqrtR = ([n, d]: R): R | null => { const a = Math.round(Math.sqrt(n)), b = Math.round(Math.sqrt(d)); return n >= 0 && a * a === n && b * b === d ? [a, b] : null; };
/** Completing the square on ax² + bx + c: x² + (b/a)x + c/a = (x + h)² − k, so the roots are −h ± √k. */
const cts = (a: R, b: R, c: R) => { const B = div(b, a), C = div(c, a), h = div(B, r(2)); return { h, k: sub(mul(h, h), C), add: mul(h, h) }; };
const roots = (a: number, b: number, c: number, d = 1) => { const { h, k } = cts(r(a, d), r(b, d), r(c, d)); const t = sqrtR(k)!; return [sub(t, h), sub(r(0), add(h, t))].sort((x, y) => x[0] / x[1] - y[0] / y[1]).map(s).join(","); };
const rootsR = (a: R, b: R, c: R) => { const { h, k } = cts(a, b, c); const t = sqrtR(k)!; return [sub(t, h), sub(r(0), add(h, t))].sort((x, y) => x[0] / x[1] - y[0] / y[1]).map(s).join(","); };
/** p ± √q for a monic x² + bx + c with irrational roots: p = −b/2, q = (b/2)² − c. */
const surd = (b: number, c: number) => { const { h, k } = cts(r(1), r(b), r(c)); return `${s(sub(r(0), h))},${s(k)}`; };
/** a(x + p)² + q for ax² + bx + c. */
const vertex = (a: number, b: number, c: number) => { const p = r(b, 2 * a); return `${a},${s(p)},${s(sub(r(c), mul(r(a), mul(p, p))))}`; };
const vertexMonic = (b: number, c: number) => vertex(1, b, c).split(",").slice(1).join(",");
const term = (b: R) => s(mul(div(b, r(2)), div(b, r(2))));
const sq = (x: number, a: number) => (x + a) ** 2;
/** The option a choice question shows, found by testing each option with a property (not by trusting the key). */
const pickBy = (id: string, ok: (i: number) => boolean) => "ABCD"[[0, 1, 2, 3].filter(ok).length === 1 ? [0, 1, 2, 3].find(ok)! : -1];
/** Polynomials as coefficient arrays [c0, c1, c2] compared on many points. */
const same = (f: (x: number) => number, h: (x: number) => number) => [-3, -1, 0, 1, 2, 5, 7].every((x) => Math.abs(f(x) - h(x)) < 1e-9);

const KEY: Record<string, () => string> = {
  // prerequisites
  p1: () => String(sq(0, 5) - 0), // (x + 5)² at x = 0 is the constant term
  d1: () => pickBy("d1", (i) => same((x) => (x - 6) ** 2, [(x: number) => x * x - 36, (x: number) => x * x - 12 * x + 36, (x: number) => x * x - 12 * x - 36, (x: number) => x * x + 36][i])),
  ds1: () => String(7 * 7),
  d2: () => [5 - 4, -5 - 4].sort((a, b) => a - b).join(","),
  ds2: () => [3 - 4, 3 + 4].join(","),
  d3: () => pickBy("d3", (i) => same((x) => (2 * x * x + 8 * x - 10) / 2, [(x: number) => x * x + 8 * x - 10, (x: number) => x * x + 4 * x - 5, (x: number) => x * x + 4 * x - 10, (x: number) => 2 * x * x + 4 * x - 5][i])),
  ds3: () => pickBy("ds3", (i) => same((x) => (3 * x * x - 12 * x + 9) / 3, [(x: number) => x * x - 4 * x + 3, (x: number) => x * x - 12 * x + 9, (x: number) => x * x - 4 * x + 9, (x: number) => 3 * x * x - 4 * x + 3][i])),
  // the picture
  e1: () => String((6 / 2) * (6 / 2)),
  e2: () => term(r(10)),
  es1: () => term(r(12)),
  e3: () => pickBy("e3", (i) => [6, 10, 12].every((b) => [b, 2 * b, (b / 2) ** 2, b * b][i] === (b / 2) ** 2)),
  e4: () => term(r(5)),
  e5: () => `${term(r(-8))},${s(r(8, 2))}`,
  e6: () => vertexMonic(8, 3),
  es2: () => term(r(3)),
  es3: () => vertexMonic(-6, 1),
  // worked examples
  w1: () => pickBy("w1", (i) => [6, 9, 36, 3][i] === Number(term(r(6)))),
  w2: () => pickBy("w2", (i) => { const lhsAdd = [16, 16, -16, 64][i], rhsAdd = [16, 0, -16, 64][i]; return lhsAdd === rhsAdd && same((x) => x * x - 8 * x + lhsAdd, (x) => (x - 4) ** 2); }),
  w3: () => term(r(3)),
  w4: () => "A", // checked below: dividing by 2 keeps the roots and makes the x² coefficient 1
  w5: () => "A",
  w6: () => term(r(-2, 3)),
  // the formula
  f1: () => "C", // checked below with numbers: (b/2a)² completes x² + (b/a)x
  f2: () => "A",
  f3: () => "B",
  f4: () => surd(-4, 1),
  // guided
  g1: () => roots(1, 4, -5),
  g2: () => surd(-10, 7),
  g3: () => roots(1, 7, 10),
  g4: () => roots(2, -8, -10),
  g5: () => vertex(2, 12, 7),
  g6: () => roots(-1, 6, -5),
  g7: () => rootsR(r(1), r(1, 2), r(-3, 16)),
  g8: () => s(add(r(-5), r(1))),
  gs1: () => roots(1, 2, -8),
  gs2: () => surd(-6, 2),
  gs3: () => roots(1, 5, 4),
  gs4: () => roots(3, 6, -9),
  gs5: () => vertex(3, -6, 1),
  gs6: () => roots(-1, -2, 3),
  gs7: () => rootsR(r(1), r(-2, 3), r(-1, 3)),
  gs8: () => s(add(r(-7), r(4))),
  // independent
  i1: () => roots(1, 8, 12),
  i2: () => surd(-2, -4),
  i3: () => roots(1, 9, 14),
  i4: () => roots(3, -12, 9),
  i5: () => vertexMonic(-5, 2),
  i6: () => roots(4, 4, -3),
  // application
  a1: () => "A",
  a2: () => "B",
  a3: () => roots(1, 14, 40),
  a4: () => "B",
  a5: () => "B",
  a6: () => pickBy("a6", (i) => i === 1 && same((x) => x * x - 10 * x + 3, (x) => (x - 5) ** 2 - 22) && !same((x) => x * x - 10 * x + 3, (x) => (x + 5) ** 2 - 22)),
  // transfer
  t1: () => vertexMonic(-6, 13).split(",")[1],
  ts1: () => vertexMonic(4, 9).split(",")[1],
  t2: () => s(r(-8, 2 * -1)), // the turning point x = −b/2a
  t3: () => roots(1, 6, 8).split(",").map((u) => String(Number(u) - 1)).join(","),
  t4: () => term(r(10)),
  t5: () => roots(1, -4, -21).split(",")[1],
  t6: () => roots(1, 4, -60).split(",").filter((w) => Number(w) > 0)[0],
  // retention
  r1: () => roots(1, -12, 32),
  r2: () => vertex(3, 12, 5),
  r3: () => "A",
  // remediation (v1.1.0): prerequisite help
  px1: () => `${2 * 2},${2 * 2}`,
  pxc1: () => String(9 * 9),
  px2: () => `${2 * -3},${(-3) ** 2}`,
  pxc2: () => pickBy("pxc2", (i) => same((x) => (x - 7) ** 2, [(x: number) => x * x - 49, (x: number) => x * x - 14 * x + 49, (x: number) => x * x + 14 * x + 49, (x: number) => x * x - 14 * x - 49][i])),
  pr1: () => roots(1, 4, -5),
  prc1: () => roots(1, -10, 21),
  pr2: () => roots(1, 6, -40),
  prc2: () => roots(1, -8, -20),
  pb1: () => pickBy("pb1", (i) => same((x) => (4 * x * x - 8 * x - 20) / 4, [(x: number) => x * x - 2 * x - 5, (x: number) => x * x - 8 * x - 20, (x: number) => x * x - 2 * x - 20, (x: number) => 4 * x * x - 2 * x - 5][i])),
  pbc1: () => pickBy("pbc1", (i) => same((x) => x * x + 4 * x - 1, [(x: number) => x * x + 4 * x + 4 - 5, (x: number) => x * x + 4 * x + 4 - 1, (x: number) => x * x + 4 * x - 5, (x: number) => x * x + 4 * x + 4 - 4][i])),
  pb2: () => pickBy("pb2", (i) => same((x) => x * x - x - 2, [(x: number) => x * x - x + 0.25 - 2.25, (x: number) => x * x - x + 0.25 - 2, (x: number) => x * x - x - 2.25, (x: number) => x * x - x - 0.25 - 2.25][i])),
  pbc2: () => pickBy("pbc2", (i) => same((x) => (-2 * x * x + 6 * x + 4) / -2, [(x: number) => x * x - 3 * x - 2, (x: number) => x * x + 6 * x + 4, (x: number) => -x * x + 3 * x + 2, (x: number) => x * x - 3 * x + 4][i])),
  // procedure help
  ftg1: () => term(r(7)),
  ftc1: () => term(r(-12)),
  ftg2: () => String(6 * 6),
  ftc2: () => term(r(9)),
  ffg1: () => vertexMonic(6, -2),
  ffc1: () => vertexMonic(-2, 9),
  ffg2: () => String((-4) ** 2),
  ffc2: () => vertexMonic(12, 30),
  fsg1: () => roots(1, -10, 16),
  fsc1: () => roots(1, 8, 7),
  fsg2: () => roots(1, 12, 35),
  fsc2: () => roots(1, -2, -8),
  fdg1: () => roots(-1, 2, 8),
  fdc1: () => roots(2, -12, 10),
  fdg2: () => pickBy("fdg2", (i) => same((x) => (5 * x * x + 10 * x - 15) / 5, [(x: number) => x * x + 2 * x - 3, (x: number) => x * x + 10 * x - 15, (x: number) => x * x + 2 * x - 15, (x: number) => 5 * x * x + 2 * x - 3][i])),
  fdc2: () => roots(3, 12, 9),
  // transfer help
  tig1: () => vertexMonic(4, -1).split(",")[1],
  tic1: () => vertexMonic(10, 30).split(",")[1],
  tig2: () => String([1, 2, 3, 4, 5].reduce((best, x) => (x * x - 6 * x + 11 < best * best - 6 * best + 11 ? x : best))),
  tic2: () => s(r(-6, 2 * -1)),
  txg1: () => roots(1, 2, -48).split(",").find((v) => Number(v) > 0)!,
  txc1: () => roots(1, 2, -35).split(",").find((v) => Number(v) > 0)!,
  txg2: () => roots(1, 1, -72).split(",").find((v) => Number(v) > 0)!,
  txc2: () => roots(1, -3, -10).split(",").find((v) => Number(v) > 0)!,
  trg1: () => roots(1, 2, -3).split(",").map((u) => String(Number(u) - 2)).join(","),
  trc1: () => roots(1, -4, -5).split(",").map((u) => String(Number(u) + 2)).join(","),
  trg2: () => term(r(-6)),
  trc2: () => roots(1, -6, -16).split(",")[1],
  ttg1: () => pickBy("ttg1", (i) => [(w: number) => w * (w + 5), (w: number) => w + w + 5, (w: number) => 2 * w + 2 * (w + 5), (w: number) => w * w + 5][i](7) === 84 && 7 * 12 === 84),
  ttc1: () => roots(1, 3, -40).split(",").find((v) => Number(v) > 0)!,
  ttg2: () => pickBy("ttg2", (i) => [2, -8].every((n) => [n * n + 6 * n, (n + 6) ** 2, 2 * n + 6 * n, n * n + 6][i] === 16)),
  ttc2: () => roots(1, 6, -16).split(",").find((v) => Number(v) > 0)!,
  // transfer diagnosis (quick questions on the parts)
  tp1: () => vertexMonic(-6, 13),
  tp2: () => vertexMonic(-8, 0),
  tp3: () => roots(1, 6, 8),
  tp4: () => term(r(10)),
  tp5: () => roots(1, -4, -21),
  tq6: () => pickBy("tq6", (i) => [(w: number) => w * (w + 4), (w: number) => w + w + 4, (w: number) => 2 * w + 2 * (w + 4), (w: number) => w * w + 4][i](6) === 60),
  tp6: () => roots(1, 4, -60),
};

test("every answer key agrees with an independent computation; every question and misconception is well formed", () => {
  const ids = unit.questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, "unique question ids");
  assert.deepEqual(Object.keys(KEY).sort(), [...ids].sort(), "each question has its own check");
  for (const q of unit.questions) {
    const expected = KEY[q.id]();
    assert.ok(normalise(q, expected) !== null, `${q.id}: the check gives an answer of the right kind (${expected})`);
    assert.equal(normalise(q, q.answer), normalise(q, expected), `${q.id}: the key is ${expected}`);
    assert.ok(q.prompt && q.solution, `${q.id}: prompt and solution`);
    if (q.type === "choice") assert.equal(new Set(q.options).size, 4, `${q.id}: four distinct options`);
    for (const m of q.misconceptions ?? []) {
      assert.ok(normalise(q, m.when) !== null, `${q.id}: misconception "${m.when}" is an answer of the right kind`);
      assert.notEqual(normalise(q, m.when), normalise(q, q.answer), `${q.id}: misconception "${m.when}" is a wrong answer`);
      assert.equal(misconception(q, m.when), m.says);
    }
  }
  // the conceptual choices, checked with numbers rather than trusted
  const dividedKeepsRoots = [-5, 1].every((x) => 2 * x * x + 8 * x - 10 === 0 && x * x + 4 * x - 5 === 0);
  assert.ok(dividedKeepsRoots, "w4/d3: dividing every term by the x² coefficient keeps the roots");
  for (const [a, b, c] of [[2, 3, -5], [3, -7, 2], [-1, 4, 1]]) {
    const x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    assert.ok(Math.abs((x + b / (2 * a)) ** 2 - (b * b - 4 * a * c) / (4 * a * a)) < 1e-9, "f1/f2: (x + b/2a)² = (b² − 4ac)/4a² at a root");
  }
  assert.ok([1, -7].every((x) => x * x + 6 * x - 7 === 0) && ![-3 + Math.sqrt(7)].every((x) => Math.abs(x * x + 6 * x - 7) < 1e-9), "a4: Riya's answer does not solve the equation");
  assert.ok([1, -5].every((x) => 2 * x * x + 8 * x - 10 === 0) && Math.abs((-2 + Math.sqrt(14)) ** 2 * 2 + 8 * (-2 + Math.sqrt(14)) - 10) > 1, "a5: Arjun's answer does not solve the equation");
  assert.equal(misconception(question("d2"), "1,-9"), null, "order does not matter for two roots");
  assert.ok(isCorrect(question("d2"), "1, −9") && isCorrect(question("i5"), "-10/4,-17/4") && !isCorrect(question("e4"), "6.25"), "unordered roots, reduced fractions; decimals are not this format");
});

test("the unit's structure separates teaching from assessment and runs from school foundations towards JEE Main", () => {
  assert.deepEqual(unit.stages.map((s) => s.phase), ["teaching", "teaching", "worked", "worked", "guided", "independent", "application", "transfer", "retention"]);
  for (const s of unit.stages) assert.equal(s.hints, s.phase === "teaching" || s.phase === "worked" || s.phase === "guided", `${s.id}: hints only while learning`);
  const types = unit.questions.reduce<Record<string, number>>((t, q) => ({ ...t, [q.type]: (t[q.type] ?? 0) + 1 }), {});
  assert.ok(types.values > 0 && types.fraction > 0 && types.choice > 0 && types.integer > 0);
  for (const s of unit.stages.filter((x) => ["guided", "independent", "application", "transfer"].includes(x.phase)))
    for (const id of s.questions) assert.ok(question(id).misconceptions?.length, `${id}: wrong answers get specific feedback`);
  assert.match((unit as { levels?: string }).levels ?? "", /No JEE Advanced material/, "JEE Advanced extensions are kept out of this unit");
});

// ---------------------------------------------------------------- synthetic journeys

const L = "learner:cts";
let n = 0;
const T0 = Date.parse("2026-10-19T09:00:00Z");
const day = (d: number) => new Date(T0 + d * 86_400_000 + ++n * 1000).toISOString();
const ev = (action: UnitActivity["action"], stage: string, d: number, extra: Partial<UnitActivity> = {}): UnitActivity => ({ kind: "math_activity", program: unit.id, id: `u${++n}`, at: day(d), learnerId: L, journey: "jee-main", lessonVersion: unit.version, action, stage, elapsedMs: 1000, sessionId: `math:${L}:visit${Math.floor(d)}`, ...extra });

/** A synthetic learner: answers each question with a rule. Returns the records a learner like this would leave. */
function learner(answer: (id: string, stage: string) => string, opts: { hintsIn?: (id: string) => boolean; upTo?: string; start?: number; supports?: boolean } = {}) {
  const events: UnitActivity[] = [];
  let d = opts.start ?? 0;
  for (const s of unit.stages) {
    if (s.id === unit.stages.at(-1)!.id) d += 7.1;
    events.push(ev("open", s.id, d));
    for (const id of s.questions) {
      if (s.hints && opts.hintsIn?.(id)) events.push(ev("hint", s.id, d, { questionId: id }));
      events.push(ev("answer", s.id, d, { questionId: id, response: answer(id, s.id) }));
    }
    const { state } = replay(L, events, day(d));
    if (opts.supports) for (const a of advice(state).filter((x) => x.stage === s.id && x.support)) events.push(ev("answer", s.id, d, { questionId: a.support!, response: answer(a.support!, s.id) }));
    events.push(ev("complete", s.id, d, s.id === unit.retentionAfter ? { retentionDueAt: day(d + 7) } : {}));
    if (s.id === opts.upTo) break;
  }
  return events;
}
const right = (id: string) => question(id).answer;
const wrongWith = (id: string) => question(id).misconceptions?.[0]?.when ?? (question(id).type === "choice" ? "ABCD".replace(right(id), "")[0] : "999");

test("journey 1: a beginner with weak algebra gets the prerequisite re-explanations and extra practice first", () => {
  const events = learner((id) => (["d1", "d2", "d3", "p1"].includes(id) ? wrongWith(id) : right(id)), { upTo: "prereq" });
  const { state } = replay(L, events, day(0));
  assert.deepEqual(state.completed, ["prereq"], "teaching checks can be wrong and the step still finishes: help is offered, nothing is blocked");
  const help = advice(state).filter((a) => a.stage === "prereq");
  assert.deepEqual(help.map((a) => a.questionId), ["p1", "d1", "d2", "d3"]);
  for (const a of help.filter((x) => x.questionId !== "p1")) {
    assert.ok(a.says, `${a.questionId}: a misconception-specific explanation, not "incorrect"`);
    assert.ok(a.revisit && a.support, `${a.questionId}: a section to revisit and a similar question`);
    assert.ok(stageOf("prereq").sections!.find((s) => s.id === a.revisit!.section)!.remediate!.screens.length, "a re-explanation exists for that section");
  }
  assert.ok(struggling(state, "prereq"));
  assert.equal(standing(state, { status: "provisional" }).demonstrated.answered, 0, "teaching answers never count as demonstrated");
});

test("journey 2: knows the identities but cannot complete the square: the picture stage catches it and re-teaches", () => {
  const miss = new Set(["e1", "e2", "e3", "e4", "e6"]);
  const events = learner((id) => (miss.has(id) ? wrongWith(id) : right(id)), { upTo: "picture", supports: true });
  const { state } = replay(L, events, day(0));
  const help = advice(state).filter((a) => a.stage === "picture");
  assert.ok(help.find((a) => a.questionId === "e3")?.says?.includes("b/2"), "the (b/2)² misconception is named");
  assert.ok(help.every((a) => a.revisit), "every wrong answer points back to teaching");
  assert.ok(["es1", "es2", "es3"].every((id) => state.answers[id]), "the similar extra questions were offered and recorded");
  assert.ok(struggling(state, "picture"));
  assert.equal(advice(state).filter((a) => a.support).length, 0, "an extra question is offered once; the program does not regenerate itself");
});

test("journey 3: follows the worked examples but fails unfamiliar problems: the gap shows in transfer, not in completion", () => {
  const events = learner((id, stage) => (stage === "transfer" ? wrongWith(id) : right(id)), { upTo: "transfer" });
  const { state, profile } = replay(L, events, day(1));
  const st = standing(state, profile);
  assert.equal(state.completed.length, 8, "every step finished");
  assert.equal(st.byPhase.independent.correct, 6);
  assert.equal(st.byPhase.transfer.correct, 0, "the transfer gap is visible");
  assert.ok(struggling(state, "transfer"));
  const help = advice(state).filter((a) => a.stage === "transfer");
  assert.equal(help.length, 6);
  assert.ok(help.filter((a) => a.revisit).length >= 4, "most transfer questions point back to the teaching they rely on");
  assert.ok(help.find((a) => a.questionId === "t1")?.support === "ts1");
  assert.equal(st.verified, false);
});

test("journey 4: a strong student moves straight through, with nothing extra pushed on them; still never verified", () => {
  const events = learner(right);
  const { state, profile, ledger } = replay(L, events, day(9));
  assert.equal(state.completed.length, unit.stages.length);
  assert.equal(advice(state).length, 0);
  assert.ok(unit.stages.every((s) => !struggling(state, s.id)));
  const st = standing(state, profile);
  assert.equal(st.completion, 100);
  assert.deepEqual(st.demonstrated, { correct: 21, answered: 21 });
  assert.notEqual(profile.status, "verified", "provisional content never verifies mastery");
  assert.ok(ledger.decisions.length > 0 && ledger.decisions.every((d) => d.verdict !== "accepted"), "the shared content gate holds every provisional answer");
});

test("journey 5: a returning student resumes at the same step and question days later; the revision opens after a week", () => {
  const first = learner(right, { upTo: "formula" });
  // leaves halfway through guided practice
  first.push(ev("open", "guided", 0), ev("answer", "guided", 0, { questionId: "g1", response: "-5,1" }), ev("hint", "guided", 0, { questionId: "g2" }), ev("answer", "guided", 0, { questionId: "g2", response: "5,18" }));
  const back = replay(L, first, day(4));
  assert.deepEqual(resumePoint(back.state), { stage: "guided", part: 2 }, "back at guided practice, at its third question");
  assert.equal(back.state.answers.g2.assisted, true, "the hint is remembered: that answer is assisted");
  const resumed = [...first, ...learner(right, { start: 4 }).filter((e) => !["prereq", "picture", "worked", "formula"].includes(e.stage))];
  const done = replay(L, resumed, day(20));
  assert.ok(done.state.visits >= 2, "two visits");
  assert.equal(done.state.answers.g1.response, "-5,1", "the earlier answers are kept; the first answer counts");
  assert.ok(Date.parse(done.state.answers.r1.at) >= Date.parse(done.state.retentionDueAt!), "the revision was answered after it was due");
  assert.equal(canComplete(replay(L, first, day(4)).state, "retention", T0), false);
});

test("history is never erased: records of other versions and programs are kept apart, and compatible versions replay", () => {
  const events = learner(right, { upTo: "prereq" });
  const old = events.map((e) => ({ ...e, id: `${e.id}-old`, lessonVersion: "0.9.0" }));
  assert.equal(replay(L, old, day(1)).state.completed.length, 0, "an unknown version is not counted (but it is not deleted)");
  const spec = unit as { compatibleVersions: string[] };
  spec.compatibleVersions.push("0.9.0");
  try {
    assert.deepEqual(replay(L, old, day(1)).state.completed, ["prereq"], "a version declared compatible replays");
  } finally {
    spec.compatibleVersions.pop();
  }
  assert.equal(chapterReplay(L, events, day(1)).state.completed.length, 0, "the chapter ignores the unit's records");
  assert.equal(fractionsReplay(L, events as never, day(1)).programs.school.completed.length, 0, "the fractions program ignores them");
  const chapterEvent = { kind: "math_activity", program: "jee-quadratics", id: "c1", at: day(0), learnerId: L, journey: "jee-main", lessonVersion: "1.1.0", action: "complete", stage: "class", elapsedMs: 1 };
  assert.equal(replay(L, [chapterEvent], day(1)).state.completed.length, 0, "the unit ignores the chapter's records");
});

test("evidence semantics: teaching answers are assisted responses, hints are recorded, unaided answers use the normal path", () => {
  const events = learner(right, { upTo: "guided", hintsIn: (id) => id === "g3" });
  const { ledger, state } = replay(L, events, day(1));
  const kinds = ledger.events.reduce<Record<string, number>>((t, e) => ({ ...t, [e.kind]: (t[e.kind] ?? 0) + 1 }), {});
  const teachingQuestions = unit.stages.filter((s) => s.phase === "teaching" || s.phase === "worked").flatMap((s) => s.questions).length;
  assert.equal(kinds.assisted_response, teachingQuestions, "every teaching prediction and check is an assisted response");
  assert.equal(kinds.hint, 1);
  assert.equal(kinds.evidence, stageOf("guided").questions.length);
  assert.equal(state.answers.g3.assisted, true);
  assert.equal(state.answers.g4.assisted, false);
});
