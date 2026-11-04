/**
 * The JEE Main Quadratic Equations chapter: every answer key is recomputed here from the question's own numbers, and
 * the replay keeps chapter progress, the timed practice score and the shared engine apart. Synthetic learners only.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { chapter, canComplete, isCorrect, normalise, percent, question, replay, timedScore, timeLeft, type ChapterActivity } from "../../../../packages/mathematics/src/chapter";
import { replay as fractionsReplay } from "../../../../packages/mathematics/src/fractions-program";

// roots of ax² + bx + c = 0 as [re, im] pairs
const roots = (a: number, b: number, c: number) => {
  const d = b * b - 4 * a * c;
  const s = Math.sqrt(Math.abs(d));
  return d >= 0 ? [[(-b + s) / (2 * a), 0], [(-b - s) / (2 * a), 0]] : [[-b / (2 * a), s / (2 * a)], [-b / (2 * a), -s / (2 * a)]];
};
const real = (a: number, b: number, c: number) => roots(a, b, c).map(([re]) => re);
const near = (x: number) => Math.round(x * 1e9) / 1e9;
const disc = (a: number, b: number, c: number) => b * b - 4 * a * c;
const nature = (d: number) => (d > 0 ? "real and different" : d === 0 ? "real and equal" : "non-real");

/** An independent computation of each answer, from the numbers in the question. */
const pick = (id: string, ok: (i: number) => boolean) => question(id).options![[0, 1, 2, 3].find(ok)!];
// the degree of a polynomial from its values at 0..5 (finite differences)
const degree = (f: (x: number) => number) => {
  let d = [0, 1, 2, 3, 4, 5].map(f);
  let n = -1;
  while (d.some((v) => Math.abs(v) > 1e-9)) { n++; d = d.slice(1).map((v, i) => v - d[i]); }
  return n;
};
const KEY: Record<string, () => string> = {
  k1: () => pick("k1", (i) => degree([(x: number) => x ** 3 - x, (x: number) => (x + 1) ** 2 - x * x, (x: number) => x * (x - 3) - 4, (x: number) => 2 * x + 5][i]) === 2),
  k2: () => String(Math.max(...real(1, -7, 12))),
  k3: () => { const [x, y] = real(1, -2, -1); return `${near((x + y) / 2)} ± √${near(((x - y) / 2) ** 2)}`; },
  k4: () => String([...Array(100).keys()].find((k) => k > 0 && disc(1, -k, 25) === 0)),
  k5: () => { const [x, y] = real(1, -4, 2); return String(near(x * x + y * y)); },
  k6: () => pick("k6", (i) => { const f = [(x: number) => x * x + x - 6, (x: number) => x * x - x - 6, (x: number) => x * x + x + 6, (x: number) => x * x - 5 * x - 6][i]; return f(2) === 0 && f(-3) === 0; }),
  k7: () => pick("k7", (i) => { const [b, c] = [[-6, 10], [6, 10], [-6, 8], [6, 8]][i]; return 8 + 3 * b + c === 0 && 6 + b === 0; }), // (3 + i)² = 8 + 6i
  k8: () => String(new Set(real(1, -10, 9).filter((t) => t >= 0).flatMap((t) => [Math.sqrt(t), -Math.sqrt(t)])).size),
  p1: () => { const [x, y] = real(1, -5, 6); return String(near(x * x + y * y)); },
  p2: () => (disc(2, -4, 5) < 0 ? "non-real complex conjugates" : "?"),
  p3: () => String([...Array(100).keys()].find((k) => k > 0 && disc(1, k, 16) === 0)),
  p4: () => { const s = 4, p = (2 + Math.sqrt(3)) * (2 - Math.sqrt(3)); return `x² − ${near(s)}x + ${near(p)} = 0`; },
  p5: () => { const [x, y] = real(1, -3, 1); return String(near(x ** 3 + y ** 3)); },
  p6: () => String([2, 3, 4, 5].find((k) => { const [x, y] = real(1, -(k + 1), k); return near(Math.abs(x - y)) === 3; })),
  c1: () => { const [x, y] = real(1, 4, -5); return String(near(Math.abs(x - y))); },
  c2: () => ([-4, -3, 3, 4].every((k) => disc(1, -2 * k, 9) >= 0) && [-2, 0, 2].every((k) => disc(1, -2 * k, 9) < 0) ? "|k| ≥ 3" : "?"),
  c3: () => { const [x, y] = real(2, -6, 3); return String(near(1 / x + 1 / y)); },
  c4: () => { const s = 3 - 0.5, p = 3 * -0.5; return `2x² − ${near(2 * s)}x − ${near(-2 * p)} = 0`; },
  t1: () => { const [x, y] = real(1, -6, 4); return String(near(x * x * y + x * y * y)); },
  t2: () => String([-3, -2, -1, 0, 1, 2, 3].filter((x) => x * x - 5 * Math.abs(x) + 6 === 0).length),
  t3: () => String([...Array(41).keys()].map((k) => k - 20).filter((k) => disc(1, 2 * (k - 1), k + 5) === 0).reduce((a, b) => a + b, 0)),
  t4: () => { const [[re, im]] = roots(1, -2, 2); return `${near(re)} ± ${near(Math.abs(im)) === 1 ? "" : near(Math.abs(im))}i`; },
  t5: () => { const [x, y] = real(1, -1, -1); return String(near(x ** 4 + y ** 4)); },
  r1: () => { const [x, y] = real(1, -7, 10); return String(near(x * x + y * y)); },
  r2: () => nature(disc(1, 6, 9)),
};

test("every answer key agrees with an independent computation, and every question is well formed", () => {
  const ids = chapter.questions.map((q) => q.id);
  assert.deepEqual(new Set(ids).size, ids.length, "unique ids");
  assert.deepEqual(Object.keys(KEY).sort(), [...ids].sort(), "each question has its own check");
  for (const id of ids) {
    const q = question(id);
    const expected = KEY[id]();
    if (q.type === "integer") {
      assert.match(q.answer, /^-?\d+$/, `${id}: an integer answer (JEE Main numerical value)`);
      assert.equal(q.answer, expected, `${id}: the key`);
    } else {
      assert.equal(q.options!.length, 4, `${id}: four options`);
      assert.equal(new Set(q.options).size, 4, `${id}: distinct options`);
      const shown = q.options!["ABCD".indexOf(q.answer)];
      assert.ok(shown.replace(/\s+/g, " ").includes(expected) || expected.includes(shown), `${id}: option ${q.answer} (${shown}) should be ${expected}`);
    }
    assert.ok(q.solution && q.prompt, `${id}: prompt and solution`);
  }
  for (const s of chapter.stages) for (const qid of s.questions) assert.ok(ids.includes(qid), `${s.id}: ${qid}`);
  assert.deepEqual(chapter.marking, { correct: 4, incorrect: -1, unanswered: 0 }, "official JEE Main 2026 marking (NTA Information Bulletin)");
});

test("answers are normalised: letters any case, integers with − or a + sign; anything else is not an answer", () => {
  const c = question("p2");
  const n = question("p1");
  assert.equal(normalise(c, " c "), "C");
  assert.equal(normalise(c, "E"), null);
  assert.equal(normalise(n, "+13"), "13");
  assert.equal(normalise(n, "−4"), "-4");
  assert.equal(normalise(n, "13.0"), null);
  assert.ok(isCorrect(n, "013"));
});

const L = "learner:chapter";
let n = 0;
const at = (d: number) => new Date(Date.parse("2026-10-18T10:00:00Z") + d * 86_400_000 + ++n * 1000).toISOString();
const ev = (action: ChapterActivity["action"], stage: string, day: number, extra: Partial<ChapterActivity> = {}): ChapterActivity => ({ kind: "math_activity", program: "jee-quadratics", id: `e${n + 1}`, at: at(day), learnerId: L, journey: "jee-main", lessonVersion: chapter.version, action, stage, elapsedMs: 1000, sessionId: `math:${L}:v`, ...extra });

function through(answer: (id: string) => string | null, retentionDueAt = at(7)) {
  const events: ChapterActivity[] = [];
  for (const s of ["class", "worked", "practice", "check"]) {
    for (const id of chapter.stages.find((x) => x.id === s)!.questions) events.push(ev("answer", s, 0, { questionId: id, response: answer(id) ?? "0" }));
    events.push(ev("complete", s, 0));
  }
  events.push(ev("open", "timed", 1));
  for (const id of chapter.stages.find((x) => x.id === "timed")!.questions) {
    const a = answer(id);
    if (a !== null) events.push(ev("answer", "timed", 1, { questionId: id, response: a }));
  }
  events.push(ev("complete", "timed", 1, { retentionDueAt }));
  return events;
}

test("progress counts steps; the timed section scores +4 / −1 / 0 and may end with questions unanswered", () => {
  const key = (id: string) => question(id).answer;
  const events = through((id) => (id === "t2" ? null : id === "t3" ? "A" : key(id)));
  const { state } = replay(L, events, at(2));
  assert.deepEqual(state.completed, ["class", "worked", "practice", "check", "timed"]);
  assert.equal(percent(state), 83);
  const s = timedScore(state);
  assert.equal(s.score, 4 + 0 - 1 + 4 + 4, "three right (+12), one wrong (−1), one skipped (0)");
  assert.equal(s.maximum, 20);
  assert.equal(state.current, "revision");
  assert.equal(canComplete(state, "revision", Date.parse(at(2))), false, "the revision check waits a week");
  assert.equal(timeLeft(state, Date.parse(state.timedOpenedAt!) + 60_000), 660);
});

test("the revision check opens after its date; finishing it completes the chapter", () => {
  const events = through((id) => question(id).answer);
  const due = events.at(-1)!.retentionDueAt!;
  events.push(ev("answer", "revision", 8, { questionId: "r1", response: "29" }), ev("answer", "revision", 8, { questionId: "r2", response: "B" }), ev("complete", "revision", 8));
  const { state } = replay(L, events, at(9));
  assert.ok(Date.parse(state.answers.r1.at) >= Date.parse(due));
  assert.equal(percent(state), 100);
});

test("a step cannot be skipped, and an early answer is the one that counts (no retries on the same question)", () => {
  const lessons = chapter.stages[0].questions;
  const events = [ev("complete", "class", 0), ev("answer", "class", 0, { questionId: "k1", response: "C" }), ev("complete", "class", 0)];
  assert.deepEqual(replay(L, events, at(1)).state.completed, [], "the class is finished only after every lesson's check");
  for (const id of lessons.slice(1)) events.push(ev("answer", "class", 0, { questionId: id, response: question(id).answer }));
  events.push(ev("complete", "practice", 0), ev("complete", "class", 0), ev("complete", "worked", 0), ev("answer", "practice", 0, { questionId: "p1", response: "12" }), ev("answer", "practice", 0, { questionId: "p1", response: "13" }));
  const { state } = replay(L, events, at(1));
  assert.deepEqual(state.completed, ["class", "worked"], "practice was not finished: its questions were not all answered");
  assert.equal(state.answers.p1.correct, false, "the first answer counts");
});

test("chapter practice is provisional: nothing is verified, and the fractions program ignores the chapter's records", () => {
  const events = through((id) => question(id).answer);
  const { profile, ledger } = replay(L, events, at(30));
  assert.notEqual(profile.status, "verified");
  assert.ok(ledger.decisions.length > 0 && ledger.decisions.every((d) => d.verdict === "held"), "the content gate holds every provisional answer");
  const fractions = fractionsReplay(L, events as never, at(30));
  assert.equal(fractions.programs.school.completed.length, 0, "a different program's records do not move fractions progress");
});
