/**
 * keyboard-offer@1: drawn written tasks are not OFFERED while handwriting is off; nothing else changes (content, module
 * lists, review hashes, stored records and marks). plan@1: a skill waiting for an educator's mark, or ended because only
 * drawn work is left, is set aside and other skills carry on (never counted as shown). Synthetic learners only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { sampleFor } from "../../../packages/learning/src/curricula";
import { allOutcomesOf, type CurriculumRelease } from "../../../packages/learning/src/curriculum";
import { moduleState } from "../../../packages/learning/src/intervention";
import { nextActivity } from "../../../packages/learning/src/plan";
import { contentHashOf } from "../../../packages/learning/src/review";
import { learnerState, make } from "../../../packages/learning/src/session";
import { DRAWN_ANSWERS_ACCEPTED, KEYBOARD_UNAVAILABLE, keyboardOffered, withheldDrawings, writtenTask, type WrittenMark } from "../../../packages/learning/src/written";
import { HANDWRITING_ENABLED } from "../writing/features";
import { Driver } from "./driver";

const T0 = Date.parse("2026-11-02T09:00:00Z");
const TEXT = "Both are halves, but the halves are of different wholes, so they need not be the same size.";
const answerer = (q: string) => (question(q).type === "written" ? TEXT : question(q).answer);
const isDrawn = (q: string | null) => !!q && writtenTask(q)?.answer === "drawing";
/** the grade-7 sample release with `id` mapped first (no sample release maps an educator-only module); planning input only */
const withFirst = (id: string): CurriculumRelease => {
  const r = structuredClone(sampleFor(7)!);
  allOutcomesOf(r)[0].outcome.mapping.competencies.unshift({ id, status: "accepted" } as never);
  return r;
};

test("the package policy equals the product policy, and only drawn written tasks are withheld", () => {
  assert.equal(DRAWN_ANSWERS_ACCEPTED, HANDWRITING_ENABLED);
  assert.equal(keyboardOffered("wr:more-sharers"), false, "a drawing");
  assert.equal(keyboardOffered("wr:frc:half-whole"), true, "a text written task");
  assert.equal(keyboardOffered("fc-d2"), true, "an ordinary question");
  assert.ok(withheldDrawings.get("MATH.number.fraction-comparison")?.includes("wr:more-sharers"));
  assert.ok(![...withheldDrawings.values()].flat().some((id) => writtenTask(id)?.answer !== "drawing"));
});

test("loaded content is unchanged: module lists and the review hash still include the drawn tasks", () => {
  const m = moduleFor("MATH.number.fraction-comparison")!;
  assert.ok(m.written?.includes("wr:more-sharers"), "the list is as loaded (offer-time filter only)");
  assert.equal(contentHashOf(m), contentHashOf(structuredClone(m)));
  const c = moduleFor("MATH.geometry.basic-constructions")!;
  assert.ok([...c.practice, ...c.transfer, ...c.retention].some(isDrawn));
});

test("fractions: after the text task the module never offers the drawing, and ends", () => {
  const d = new Driver("learner-offer-1", T0);
  d.enrol(5, "2026-27", sampleFor(5)!);
  const seen = d.work("MATH.number.fraction-comparison", answerer, { max: 60 });
  assert.ok(d.trace.some((t) => t.includes("wr:frc:half-whole")), "the text task was handed in");
  assert.ok(!seen.some((ms) => isDrawn(ms.question)), "no drawing offered");
  assert.equal(seen.at(-1)!.phase, "done");
});

test("geometry constructions (educator-only, mostly drawn): never offers a drawing and ends; the year plan moves on", () => {
  const d = new Driver("learner-offer-2", T0);
  const id = "MATH.geometry.basic-constructions";
  const r = withFirst(id);
  d.enrol(7, "2026-27", sampleFor(7)!);
  const seen = d.work(id, answerer, { max: 60 });
  assert.ok(!seen.some((ms) => isDrawn(ms.question)), "no drawing offered");
  const st = d.state();
  const last = moduleState(id, st.records, st.evidence(id), d.now, d.session);
  assert.ok(["done", "waiting"].includes(last.phase), last.phase);
  const next = nextActivity(r, st.evidence, st.records, { now: d.now, session: d.session });
  assert.notEqual(next.competency, id, "a set-aside skill is not offered again as the next activity");
});

test("a drawing handed in earlier is still read: pending, then marked and counted", () => {
  const d = new Driver("learner-offer-3", T0);
  d.enrol(7, "2026-27", sampleFor(7)!);
  d.events.push(make.attempt(d.ctx(), "wr:con:basic60", "an earlier drawing with its note", "practice"));
  const id = d.events.at(-1)!.id;
  assert.equal(d.state().records.pending.length, 1);
  const mark: WrittenMark = { attemptId: id, questionId: "wr:con:basic60", verdict: "correct", score: writtenTask("wr:con:basic60")!.rubric.reduce((n, x) => n + x.points, 0), outOf: writtenTask("wr:con:basic60")!.rubric.reduce((n, x) => n + x.points, 0), feedback: "Good.", at: new Date(d.now).toISOString(), role: "educator" };
  const st = learnerState(d.learnerId, d.events, d.now, { marks: [mark] });
  assert.equal(st.records.pending.length, 0);
  assert.equal(st.records.attempts.find((a: { id: string }) => a.id === id)?.written?.mark.verdict, "correct");
});

test("plan: while an educator-only skill waits for its mark, other skills of the year carry on", () => {
  const d = new Driver("learner-offer-4", T0);
  const r = withFirst("MATH.number.irrationality-proofs");
  d.enrol(7, "2026-27", sampleFor(7)!);
  // a text written answer of an educator-only module, not yet marked
  const text = moduleFor("MATH.number.irrationality-proofs");
  assert.ok(text && !text.pool);
  const w = [...text.practice, ...text.transfer].find((q) => writtenTask(q) && !isDrawn(q))!;
  d.events.push(make.attempt(d.ctx(), w, TEXT, "practice"));
  const st = d.state();
  assert.equal(moduleState("MATH.number.irrationality-proofs", st.records, st.evidence("MATH.number.irrationality-proofs"), d.now, d.session).phase, "waiting");
  const next = nextActivity(r, st.evidence, st.records, { now: d.now, session: d.session });
  assert.notEqual(next.competency, "MATH.number.irrationality-proofs");
  assert.ok(next.kind !== "none" || next.reason.includes("educator") || next.reason.includes(KEYBOARD_UNAVAILABLE), next.reason);
});
