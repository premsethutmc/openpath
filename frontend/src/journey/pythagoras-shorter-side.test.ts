/**
 * method-alignment@1 × Grade 8 (foundations fix, 2026-11-09): a Grade 8 learner taught Pythagoras is shown how to find a shorter
 * side before any follow-up asks for one, whichever mapped explanation the engine gives, and the shorter-side delayed check is then
 * asked and answered instead of stopping as a method gap. The converse and the triple rules: pythagoras-methods.test.ts.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question, questions, moduleFor } from "../../../packages/learning/src/content";
import { boardFor } from "../../../packages/learning/src/curricula";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { FAMILIES, pool, problemOf } from "../../../packages/learning/src/families";
import { pageCandidates } from "../../../packages/learning/src/lesson-checks";
import { methodCompatibility } from "../../../packages/learning/src/method-alignment";
import { teachingLesson } from "../../../packages/learning/src/teaching-contract";
import { Driver, right } from "../learning/driver";

const SKILL = "MATH.geometry.pythagoras";
const caseOf = (id: string) => { const p = problemOf(id.replace(/:(mc|w)$/, "")); return p?.family === "ahpyth" ? FAMILIES.get("ahpyth")!.teach!.caseOf!(p.params) : null; };
const wrong = (q: string) => { const p = question(q); return p.type === "choice" ? "ABCDEF".slice(0, Math.max(2, (p.options ?? []).length)).split("").find((l) => l !== p.answer)! : p.answer === "0" ? "1" : "0"; };
const FOLLOW_UP = new Set(["guided", "check", "verify", "practice", "transfer", "retention"]);

test("both Pythagoras explanations with a method map cover a shorter side; squares on the sides covers both cases", () => {
  const m = moduleFor(SKILL)!;
  const shorter = pool("ahpyth").items.filter((p) => caseOf(p.id) === "shorter side").slice(0, 40).map((p) => p.id);
  const hyp = pool("ahpyth").items.filter((p) => caseOf(p.id) === "hypotenuse").slice(0, 40).map((p) => p.id);
  for (const sid of ["worked_steps", "squares_on_sides"]) {
    const s = m.strategies.find((x) => x.id === sid)!;
    for (const id of shorter) assert.equal(methodCompatibility(m, s, id).status, "covered", `${sid} covers ${id}`);
  }
  const sq = m.strategies.find((x) => x.id === "squares_on_sides")!;
  for (const id of hyp) assert.equal(methodCompatibility(m, sq, id).status, "covered");
  assert.ok(sq.screens.some((sc) => sc.text.some((t) => /take it away/.test(t))), "the shorter-side steps are in its text");
});

for (const board of ["cbse", "tn"] as const) {
  test(`Grade 8 ${board}: a shorter-side explanation is shown before a follow-up asks for a shorter side; the delayed check asks one`, () => {
    useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
    try {
      const m = moduleFor(SKILL)!;
      const d = new Driver(`pyth-shorter-${board}`, Date.parse("2026-11-06T09:00:00Z"));
      d.enrol(8, "2026-27", boardFor(board, 8)!);
      let n = 0;
      const states = d.work(SKILL, (q, ph) => (n++ < 2 ? wrong(q) : right(q, ph)), { max: 80 });
      d.newSession(9);
      states.push(...d.work(SKILL, right, { max: 80 }));
      const taughtAt = states.findIndex((ms) => ms.phase === "chapter" && !!ms.strategy && methodCompatibility(m, ms.strategy, "gen:ahpyth:16,30,1").status === "covered");
      const askedAt = states.findIndex((ms) => FOLLOW_UP.has(ms.phase) && !!ms.question && caseOf(ms.question) === "shorter side");
      assert.ok(taughtAt >= 0, `a shorter-side explanation was shown (${states.map((s) => s.phase).join(" ")})`);
      assert.ok(askedAt > taughtAt, `the first shorter-side follow-up (${askedAt}) comes after it (${taughtAt})`);
      const retained = d.state().records.attempts.filter((a) => a.activity === "retention" && caseOf(a.questionId) === "shorter side");
      assert.ok(retained.length >= 1 && retained.every((a) => a.response === question(a.questionId).answer), "the shorter-side delayed check was asked and answered");
    } finally {
      useReviewFixture(null);
    }
  });
}
test("Grade 8 lesson page: a checked shorter-side worked example and shorter-side practice", () => {
  const m = moduleFor(SKILL)!;
  const L = teachingLesson(m, pageCandidates(m), 8);
  assert.ok(L.blocks.some((b) => b.instance && caseOf(b.instance) === "shorter side" && b.worked?.verified));
  assert.ok(L.practice.some((id) => caseOf(id) === "shorter side"));
});
