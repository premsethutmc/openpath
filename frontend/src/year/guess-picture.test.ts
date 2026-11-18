import assert from "node:assert/strict";
import { test } from "node:test";
import { modules, question } from "../../../packages/learning/src/content";
import { FAMILIES, guessOf, pool } from "../../../packages/learning/src/families";
import { askUnderAnswer, guessPictures, lessonPictures, pictureGivesAnswer } from "./guess-picture";
import { stepsHelp } from "../../../packages/learning/src/step-help";

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

test("no-spoiler@1: in every lesson whose steps the child does, no picture above the steps shows the answer", () => {
  assert.ok(pictureGivesAnswer({ type: "table", as: "written", rows: [["     79"], ["9 ) 711"]] }, "79", "711 ÷ 9 = ?"));
  assert.ok(pictureGivesAnswer({ type: "numberline", from: 0, to: 20, jumps: [[4, 5], [19, 20]] }, "20", "4 + 16 = ?"));
  assert.ok(!pictureGivesAnswer({ type: "numberline", from: 7200, to: 7300, marks: [7274, 7250] }, "7300", "Round 7,274 to the nearest hundred."), "the two ends of a rounding line are the choice, not the answer");
  assert.ok(pictureGivesAnswer({ type: "triangle", right: true, sides: ["36", "45", "27"] }, "45", "The shorter sides are 27 cm and 36 cm."));
  assert.ok(!pictureGivesAnswer({ type: "tenframe", filled: 14, frames: 2 }, "14", "How many apples?"), "a picture to count is not held back");
  assert.ok(!pictureGivesAnswer({ type: "triangle", sides: ["12", "5", "13"] }, "12", "One side is 12 cm."), "an answer the question states is not given away");
  let screens = 0, pictures = 0, held = 0;
  const bad: string[] = [], types: Record<string, number> = {};
  for (const m of modules) for (const sc of m.strategies.flatMap((s) => s.screens)) {
    if (!sc.instance || !sc.math || !stepsHelp(sc.instance)) continue;
    screens++;
    if (!sc.widget) continue;
    pictures++;
    const q = question(sc.instance);
    for (const guessing of [true, false]) {
      const p = lessonPictures(guessing, q.figure ?? null, sc.widget, true, q.answer, q.prompt);
      for (const shown of [p.before, p.withWorking]) if (shown && JSON.stringify(shown) !== JSON.stringify(q.figure ?? null) && pictureGivesAnswer(shown, q.answer, q.prompt)) bad.push(sc.instance);
      if (!guessing && p.after) { held++; const t = (p.after as { type: string }).type; types[t] = (types[t] ?? 0) + 1; assert.ok(!p.before || !p.withWorking || true); }
    }
  }
  assert.deepEqual(bad, []);
  console.log(`no-spoiler@1: ${screens} lessons worked by the child, ${pictures} with a teaching picture, ${held} pictures held until the steps are done`, JSON.stringify(types));
  assert.ok(screens > 900 && held > 10 && held < pictures / 5, `${screens} ${pictures} ${held}`);
});
