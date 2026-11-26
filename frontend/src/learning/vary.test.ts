/**
 * own-numbers@1: an explanation whose numbers a learner can change is right for EVERY choice they could make. For each
 * screen with changeable numbers, every combination inside its limits is written out and checked: every slot fills, no
 * number comes out as a fraction or as nothing, every worked sum on the screen is true, the steps keep their length rules,
 * the tiles are only on numbers that may change, and the picture can still reach its goal. No person has to read them.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { check as checkScene, initial, met, states, type Scene } from "../../../packages/learning/src/scene";
import { filledScreen, foundations, type FoundationScreen } from "../../../packages/learning/src/foundations";
import { calc, everyChoice, falseSums, fill, fillParts, inputsOf, isInput, refusal, valuesOf } from "../../../packages/learning/src/vary";

test("the calculator, the slots and the sum checker", () => {
  assert.equal(calc("floor(a / b)", { a: 13, b: 3 }), 4);
  assert.equal(calc("a % b + 2 * (b - 1)", { a: 13, b: 3 }), 5);
  assert.throws(() => calc("a +", { a: 1 }));
  assert.throws(() => calc("process.exit()", {}));
  const v = { a: 13, b: 3, q: 4, r: 1 };
  assert.equal(fill("{a} ÷ {b} = {q}{if r != 0} remainder {r}{end}", v), "13 ÷ 3 = 4 remainder 1");
  assert.equal(fill("{r} {r|laddu is|laddus are} left", v), "1 laddu is left");
  assert.equal(fill("{r} {r|laddu is|laddus are} left", { ...v, r: 2 }), "2 laddus are left");
  assert.equal(fill("{if r = 0}none{else}some{end}", { ...v, r: 0 }), "none");
  assert.deepEqual(fillParts("{@a} laddus", v), [{ tap: "a", value: 13 }, " laddus"]);
  assert.deepEqual(falseSums("13 ÷ 3 = 4 remainder 1, and 3 × 4 + 1 = 13 ✓"), []);
  assert.deepEqual(falseSums("13 ÷ 3 = 4"), ["13 / 3 = 4"]);
  assert.deepEqual(falseSums("13 ÷ 3 = 4 remainder 4"), ["13 / 3 = 4 remainder 4"]);
  assert.deepEqual(falseSums("3 × 4 = 11"), ["3 * 4 = 11"]);
  const spec = { vary: { a: { value: 13, min: 2, max: 30 }, b: { value: 3, min: 2, max: 10 } }, require: ["a >= b"], note: "more" };
  assert.equal(refusal(spec, "a", "12", valuesOf(spec.vary)), null);
  assert.match(refusal(spec, "a", "31", valuesOf(spec.vary))!, /2 to 30/);
  assert.match(refusal(spec, "a", "x", valuesOf(spec.vary))!, /2 to 30/);
  assert.equal(refusal(spec, "a", "2", valuesOf(spec.vary)), "more");
});

const words = (s: FoundationScreen): string[] => [
  ...s.text, ...(s.ask ? [s.ask] : []), ...(s.example ?? []), ...(s.after ?? []),
  ...(s.check ? [s.check.question, s.check.answer] : []),
  ...(s.steps ?? []).flatMap((st) => [st.do, ...st.lines, ...st.why]),
];
const sceneWords = (sc: unknown): string[] => (typeof sc === "string" ? [sc] : Array.isArray(sc) ? sc.flatMap(sceneWords) : sc && typeof sc === "object" ? Object.values(sc).flatMap(sceneWords) : []);

test("own-numbers@1: every choice a learner can make writes a complete, true explanation", () => {
  let screens = 0, choices = 0;
  for (const f of foundations) for (const s of f.screens) {
    if (!s.vary) continue;
    screens++;
    const where = `${f.competency}: ${s.title}`;
    const spec = { vary: s.vary, require: s.require, note: s.note };
    // tiles only on numbers that may change, each at most once on the screen; no tile inside steps or checks
    const raw = words(s).join("\n");
    for (const m of raw.matchAll(/\{@(\w+)\}/g)) assert.ok(isInput(s.vary[m[1]]), `${where}: {@${m[1]}} is not a number the learner may change`);
    for (const k of inputsOf(s.vary)) assert.ok((raw.match(new RegExp(`\\{@${k}\\}`, "g")) ?? []).length <= 1, `${where}: {@${k}} appears more than once`);
    assert.ok(![...(s.steps ?? []).flatMap((st) => [st.do, ...st.lines, ...st.why]), ...(s.check ? [s.check.question, s.check.answer] : [])].some((t) => t.includes("{@")), `${where}: a tile in a step or check`);
    assert.ok(inputsOf(s.vary).some((k) => raw.includes(`{@${k}}`)), `${where}: no number to tap`);
    // the example's own numbers are a valid choice
    assert.equal(refusal(spec, inputsOf(s.vary)[0], String(valuesOf(s.vary)[inputsOf(s.vary)[0]]), valuesOf(s.vary)), null, `${where}: the first numbers are refused`);
    for (const v of everyChoice(spec)) {
      choices++;
      const at = `${where} at ${inputsOf(s.vary).map((k) => `${k}=${v[k]}`).join(",")}`;
      for (const [k, n] of Object.entries(v)) assert.ok(Number.isFinite(n) && Number.isInteger(n), `${at}: ${k} is ${n}`);
      const w = filledScreen(s, v);
      for (const t of [...words(w), ...sceneWords(w.scene)]) {
        assert.ok(!/[{}]|NaN|undefined|Infinity/.test(t), `${at}: "${t}"`);
        assert.deepEqual(falseSums(t), [], `${at}: "${t}"`);
      }
      for (const st of w.steps ?? []) assert.ok(st.do.length <= 70 && st.lines.every((l) => l.trim() && l.length <= 40), `${at}: ${st.do}`);
      if (w.scene) {
        const sc = w.scene as Scene;
        assert.deepEqual(checkScene(sc), [], at);
        assert.ok(!met(sc, initial(sc)), `${at}: the goal is met before the learner moves anything`);
        let reached = false; for (const st of states(sc)) if (met(sc, st)) { reached = true; break; }
        assert.ok(reached, `${at}: the goal cannot be reached`);
      }
    }
  }
  assert.ok(screens >= 2 && choices > 100, `${screens} screens, ${choices} choices`);
  console.log(`own-numbers@1: ${screens} screens, ${choices} choices of numbers, every one checked`);
});
