/**
 * method-sections@1 × method-alignment@1 (2026-11-10, combined candidate): the Pythagoras module also checks the converse (ahconv) and
 * the two rules that generate triples (ahgen). Both mapped explanations now carry a section on each (pending educator review), the
 * method map names them, and a Grade 8 learner is shown each method before any follow-up or delayed check asks for it, then verified
 * on both boards. The gate is unchanged: a method an explanation does not teach (a hypotenuse after "Step by step") is still refused.
 * Synthetic learners: behaviour, not learning.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question, questions, moduleFor } from "../../../packages/learning/src/content";
import { boardFor } from "../../../packages/learning/src/curricula";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { pool } from "../../../packages/learning/src/families";
import { alignmentEntry, followupCompatible, methodCompatibility, methodRequirements } from "../../../packages/learning/src/method-alignment";
import { make } from "../../../packages/learning/src/session";
import { Driver, right } from "../learning/driver";

const SKILL = "MATH.geometry.pythagoras";
const NEW = ["pythagoras-converse", "triple-rule-2m", "triple-rule-mn"];
const FOLLOW_UP = new Set(["guided", "check", "verify", "practice", "transfer", "retention", "reentry"]);
const wrong = (q: string) => { const p = question(q); return p.type === "choice" ? "ABCDEF".slice(0, Math.max(2, (p.options ?? []).length)).split("").find((l) => l !== p.answer)! : p.answer === "0" ? "1" : "0"; };
const newMethod = (id: string) => (methodRequirements(id) ?? []).find((x) => NEW.includes(x)) ?? null;

test("both mapped explanations teach and map the converse and both triple rules; every item of the two families is covered", () => {
  const m = moduleFor(SKILL)!;
  const items = [...pool("ahconv").items, ...pool("ahgen").items].map((p) => p.id);
  assert.deepEqual(new Set(items.map(newMethod)), new Set(NEW), "the three methods are what these families require");
  for (const sid of ["worked_steps", "squares_on_sides"]) {
    const s = m.strategies.find((x) => x.id === sid)!;
    const e = alignmentEntry(m, s)!;
    assert.equal(e.status, "engineering-mapping-pending-educator-review", `${sid}: pending educator review, not approved`);
    for (const x of NEW) assert.ok(e.methods.includes(x), `${sid} maps ${x}`);
    for (const id of items) assert.equal(methodCompatibility(m, s, id).status, "covered", `${sid} covers ${id}`);
    const titles = s.screens.map((sc) => sc.title);
    assert.ok(titles.some((t) => /converse/i.test(t)) && titles.some((t) => /triples by a rule/i.test(t)), `${sid}: the two sections are shown (${titles.join(" | ")})`);
    const text = s.screens.flatMap((sc) => sc.text).join(" ");
    assert.match(text, /longest side/);
    assert.match(text, /m² − 1 and m² \+ 1/);
    assert.match(text, /m² − n²/);
  }
});

test("the gate is unchanged: a method an explanation does not teach is still refused (a hypotenuse after Step by step)", () => {
  const m = moduleFor(SKILL)!, ws = m.strategies.find((x) => x.id === "worked_steps")!;
  const hyp = pool("ahpyth").items.map((p) => p.id).find((id) => (methodRequirements(id) ?? []).includes("ahpyth:hypotenuse"))!;
  assert.equal(methodCompatibility(m, ws, hyp).status, "incompatible");
  const d = new Driver("pyth-gate", Date.parse("2026-11-06T09:00:00Z"));
  d.enrol(8, "2026-27", boardFor("cbse", 8)!);
  d.events.push(make.teach(d.ctx(), SKILL, "worked_steps", "test"));
  assert.equal(followupCompatible(m, ws, hyp, d.state().records), false, "not a follow-up of this lesson");
  assert.equal(followupCompatible(m, ws, "gen:ahconv:2,0,0,0", d.state().records), true, "the converse is, now that it is taught");
});

for (const board of ["cbse", "tn"] as const) {
  test(`Grade 8 ${board}: each method is shown before a follow-up or delayed check asks it, then verified`, () => {
    useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
    try {
      const m = moduleFor(SKILL)!;
      const d = new Driver(`pyth-methods-${board}`, Date.parse("2026-11-06T09:00:00Z"));
      d.enrol(8, "2026-27", boardFor(board, 8)!);
      let n = 0;
      const states = d.work(SKILL, (q, ph) => (n++ < 2 ? wrong(q) : right(q, ph)), { max: 80 });
      for (let k = 0; k < 3 && d.state().evidence(SKILL).status !== "verified"; k++) { d.newSession(9); states.push(...d.work(SKILL, right, { max: 80 })); }
      const asked = new Set<string>();
      let taught: (typeof states)[number]["strategy"] = null;
      for (const ms of states) {
        if (ms.phase === "chapter" && ms.strategy) taught = ms.strategy;
        const x = ms.question && FOLLOW_UP.has(ms.phase) ? newMethod(ms.question) : null;
        if (!x) continue;
        asked.add(x);
        assert.ok(taught && methodCompatibility(m, taught, ms.question!).status === "covered", `${ms.question} (${x}) after an explanation that teaches it (${taught?.id ?? "none"})`);
      }
      assert.ok(asked.has("pythagoras-converse") && (asked.has("triple-rule-2m") || asked.has("triple-rule-mn")), `the new methods were checked (${[...asked]})`);
      assert.ok(d.state().records.attempts.some((a) => a.activity === "retention" && newMethod(a.questionId)), "a delayed check on one of them was asked and answered");
      assert.equal(d.state().evidence(SKILL).status, "verified");
      assert.ok(!states.some((ms) => ms.phase === "pause"), "no method-gap stop");
    } finally {
      useReviewFixture(null);
    }
  });
}
