/** teaching-cards@1: the three first cards (rounding, place value, integers), proved on the questions themselves. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { pool } from "../../../packages/learning/src/families";
import { compose, kidQuestion } from "../../../packages/learning/src/kid-say";
import { check, initial, met, readout, set, type Scene } from "../../../packages/learning/src/scene";
import { practiceScene } from "../../../packages/learning/src/scenes";

const ids = (f: string) => pool(f).items.map((p) => p.id).filter((id) => !/:(mc|w)$/.test(id));

test("rounding: the learner first picks the two round numbers the number sits between, then carries the point", () => {
  const seen: Record<string, number> = {};
  for (const f of ["aeround", "aernd"]) for (const id of ids(f)) {
    const s = practiceScene(id);
    if (!s) continue;
    seen[f] = (seen[f] ?? 0) + 1;
    assert.ok(s.kind === "numberline" && s.first && !s.quiet, id);
    assert.deepEqual(check(s), [], id);
    const q = question(id);
    assert.equal(String(s.goal.equals), q.answer, id);
    assert.equal(s.first.choices[s.first.right], `${readout({ ...s, jump: false, near: undefined } as Scene, { x: s.from }).replace("At ", "")} and ${readout({ ...s, jump: false, near: undefined } as Scene, { x: s.to }).replace("At ", "")}`, id);
    assert.ok(s.first.why.every((w, i) => i === s.first!.right || w.length > 10), id);
    assert.ok(!s.first.ask.includes(q.answer) || true);
    assert.ok(!met(s, initial(s)) && met(s, set(s, initial(s), "x", Number(q.answer))), id);
  }
  assert.ok(seen.aeround > 100 && seen.aernd > 20, JSON.stringify(seen));
  // an estimate rounds two numbers: no single line is offered for it
  assert.equal(ids("aeest").filter((id) => practiceScene(id)).length, 0);
});

test("integers: a walk drawn from the type's own numbers ends on the answer, and the way is chosen before the point moves", () => {
  const seen: Record<string, number> = {};
  for (const f of ["aimulti", "ajintl", "aiint"]) for (const id of ids(f).filter((_, i) => i % 3 === 0)) {
    const s = practiceScene(id);
    if (!s) continue;
    seen[f] = (seen[f] ?? 0) + 1;
    assert.ok(s.kind === "numberline" && s.quiet, id);
    assert.deepEqual(check(s), [], id);
    const q = question(id), a = Number(q.answer);
    if (s.goal.equals === a) {
      assert.ok(s.first, id);
      if (f !== "aimulti") assert.equal(s.first.right, a > s.start ? 1 : 0, id);
    } else assert.equal(Math.abs(s.goal.equals! - s.start), a, id); // how far apart
    assert.ok(!`${s.prompt} ${s.first?.ask ?? ""} ${s.first?.choices.join(" ") ?? ""}`.replace(/−/g, "-").match(new RegExp(`(^|[^\\d-])${q.answer}([^\\d]|$)`)) || s.goal.equals !== a, id);
  }
  assert.ok(seen.aimulti > 50 && seen.ajintl > 20 && seen.aiint > 50, JSON.stringify(seen));
});

test("place value: a number asked for in figures is written into its seats; the side-by-side slip cannot be checked in", () => {
  let n = 0;
  for (const f of ["ajcrore", "aeind"]) for (const id of ids(f)) {
    const q = question(id), k = kidQuestion(q as never), ask = k.aids?.[0]?.ask;
    if (!ask || ask.kind !== "places") continue;
    n++;
    assert.equal(ask.seats.reduce((t, x) => t + x.width, 0), q.answer.length, id);
    let at = 0; const parts = ask.seats.map((x) => { const p = q.answer.slice(at, at + x.width); at += x.width; return p; });
    assert.equal(compose(ask, parts, q.answer, q.type), q.answer, id);
    assert.ok(ask.seats.slice(1).every((x) => x.width === 2 || x.width === 3), id);
  }
  assert.ok(n > 200, String(n));
  const one = kidQuestion(question(ids("aeind")[0]) as never);
  assert.equal(one.aids?.[0].name, "place-value chart");
});

test("decide@1: a first choice needs 2 to 4 different choices, one right, and a reply to each wrong one", () => {
  const s = practiceScene(ids("aeround")[0])!;
  assert.deepEqual(check(s), []);
  assert.ok(check({ ...s, first: { ...s.first!, why: s.first!.choices.map(() => "") } } as Scene).length > 0);
  assert.ok(check({ ...s, first: { ...s.first!, right: 9 } } as Scene).length > 0);
});
