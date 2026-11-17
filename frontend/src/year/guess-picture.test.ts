import assert from "node:assert/strict";
import { test } from "node:test";
import { modules, question } from "../../../packages/learning/src/content";
import { FAMILIES, guessOf, pool } from "../../../packages/learning/src/families";
import { askUnderAnswer, guessPictures } from "./guess-picture";

test("before a guess only the question's own picture shows; the teaching picture waits with the working", () => {
  const own = { type: "table", head: ["1", "2", "3"], rows: [[2, 4, "?"]] }, lesson = { type: "table", head: ["first", "second"], rows: [[2, 4], [2, 4], ["?"]] };
  assert.deepEqual(guessPictures(true, own, lesson), { before: own, withWorking: lesson });
  assert.deepEqual(guessPictures(true, null, lesson), { before: null, withWorking: lesson });
  assert.deepEqual(guessPictures(true, own, { ...own }), { before: own, withWorking: null });
  assert.deepEqual(guessPictures(false, own, lesson), { before: lesson, withWorking: null });
  assert.ok(askUnderAnswer(lesson, "2"));
  assert.ok(!askUnderAnswer(own, "2"));
});

test("in every lesson with a guess, nothing shown before the guess puts the ? under its answer", () => {
  const bad: string[] = [];
  let guesses = 0, held = 0;
  for (const m of modules) for (const sc of m.strategies.flatMap((s) => s.screens)) {
    if (!sc.instance || !sc.math) continue;
    const g = guessOf(sc.instance);
    if (!g) continue;
    guesses++;
    const q = question(sc.instance);
    const { before, withWorking } = guessPictures(true, q.figure ?? null, sc.widget ?? null);
    if (withWorking) held++;
    if (askUnderAnswer(before as never, q.answer)) bad.push(sc.instance);
  }
  assert.deepEqual(bad, []);
  assert.ok(guesses > 100 && held > 0, `${guesses} guesses, ${held} teaching pictures held back`);
});

test("no question's own picture puts the ? under its answer", () => {
  const bad: string[] = [];
  for (const f of FAMILIES.values()) {
    if (!f.domain) continue;
    const ids = pool(f.id).items.map((x) => x.id);
    const step = Math.max(1, Math.floor(ids.length / 8));
    for (let i = 0; i < ids.length; i += step) { const q = question(ids[i]); if (q.type !== "choice" && askUnderAnswer(q.figure as never, q.answer)) { bad.push(ids[i]); break; } }
  }
  assert.deepEqual(bad, []);
});
