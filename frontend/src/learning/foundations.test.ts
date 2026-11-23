/** foundations@1: every start-here entry belongs to a real skill and is complete enough to teach from. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleFor } from "../../../packages/learning/src/content";
import { foundations, foundationsOf, PICTURES } from "../../../packages/learning/src/foundations";

test("start-here teaching is attached to real skills and is well formed", () => {
  const seen = new Set<string>();
  for (const f of foundations) {
    assert.ok(moduleFor(f.competency), `${f.competency} is not a skill with a lesson`);
    assert.ok(!seen.has(`${f.competency}|${f.concept}`), `${f.competency}: ${f.concept} twice`);
    seen.add(`${f.competency}|${f.concept}`);
    assert.ok(f.concept.trim() && f.screens.length >= 1 && f.screens.length <= 3, `${f.competency}: ${f.concept}`);
    for (const s of f.screens) {
      assert.ok(s.title.trim() && s.text.length >= 1 && s.text.every((t) => t.trim().length > 0), `${f.competency}: ${s.title}`);
      assert.ok(!s.picture || (PICTURES as readonly string[]).includes(s.picture), `${f.competency}: picture ${s.picture}`);
      assert.ok(!s.check || (s.check.question.trim() && s.check.answer.trim()), `${f.competency}: check`);
      assert.ok(![s.title, ...s.text, ...(s.example ?? [])].some((t) => /\\\(|\$\$|\*\*|undefined|NaN/.test(t)), `${f.competency}: markup in ${s.title}`);
    }
  }
});

test("trigonometry starts with what sin, cos and tan are", () => {
  const f = foundationsOf("MATH.trigonometry.ratios");
  const all = JSON.stringify(f).toLowerCase();
  assert.ok(f.length > 0 && all.includes("opposite") && all.includes("hypotenuse") && all.includes("adjacent"));
  assert.ok(f.some((x) => x.screens.some((s) => s.picture === "right-triangle")));
});

test("every start-here idea has practice a child can check: four choices, one right, feedback on each wrong one", async () => {
  const { shownOrder } = await import("../../../packages/learning/src/foundations");
  let n = 0;
  for (const f of foundations) {
    assert.ok(f.practice && f.practice.length >= 3, `${f.competency}: ${f.concept} has no practice`);
    assert.ok((f.rounds ?? []).length >= 2 && f.rounds!.every((r) => r.length >= 3), `${f.competency}: ${f.concept} has no further rounds`);
    const asked = [f.practice!, ...f.rounds!].flat().map((q) => q.question);
    assert.equal(new Set(asked).size, asked.length, `${f.competency}: a question is repeated between rounds`);
    for (const q of [f.practice!, ...f.rounds!].flat()) {
      n++;
      const at = `${f.competency}: ${q.question}`;
      assert.equal(q.options.length, 4, at);
      assert.equal(new Set(q.options.map((o) => o.trim().toLowerCase())).size, 4, at);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && q.why.trim().length > 5, at);
      assert.ok(q.wrong.length === 4 && q.wrong.every((w, i) => (i === q.answer ? true : w.trim().length > 5)), at);
      assert.ok(!q.options.some((x) => /all of the above|none of the(se| above)/i.test(x)) && !/undefined|NaN|\\\(|\*\*/.test([q.question, ...q.options, q.why, ...q.wrong].join(" ")), at);
      assert.deepEqual([...shownOrder(q)].sort(), [0, 1, 2, 3], at);
    }
  }
  assert.ok(n >= 1700);
});

test("picture tasks: every kind asks about parts its picture has, and a new visit gets new tasks", async () => {
  const { describe, partsOf, pictureTasks, rightTap } = await import("../../../packages/learning/src/foundation-pictures");
  for (const kind of PICTURES) {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const tasks = pictureTasks(kind, seed);
      assert.ok(tasks.length >= 2, kind);
      assert.deepEqual(pictureTasks(kind, seed), tasks, `${kind}: same seed, same tasks`);
      for (const t of tasks) {
        const parts = partsOf(t.scene);
        if (t.count !== undefined) assert.ok(t.count >= 1 && t.count < parts.length && rightTap(t, "", t.count) && !rightTap(t, "", t.count + 1), kind);
        else { assert.ok(t.answer.length >= 1 && t.answer.every((a) => parts.includes(a)), `${kind}: ${t.prompt}`); assert.ok(parts.some((p) => !rightTap(t, p)), kind); }
        for (const p of parts) assert.ok(describe(t.scene, p)?.length > 5, `${kind}: ${p}`);
        assert.ok(!/undefined|NaN/.test(t.prompt + t.hint), kind);
      }
      seen.add(JSON.stringify(tasks));
    }
    assert.ok(seen.size >= 2, `${kind} never changes`);
  }
  const tri = pictureTasks("right-triangle", 7);
  for (const t of tri) if (t.scene.kind === "right-triangle" && t.prompt.includes("opposite")) assert.deepEqual(t.answer, [t.scene.thetaAt === "left" ? "right" : "bottom"]);
});

test("a repeat visit gets the next round of questions, round and round", async () => {
  const { roundFor } = await import("../../../packages/learning/src/foundations");
  const f = foundationsOf("MATH.trigonometry.ratios")[0];
  assert.deepEqual(roundFor(f, 0), f.practice);
  assert.deepEqual(roundFor(f, 1), f.rounds![0]);
  assert.deepEqual(roundFor(f, 2), f.rounds![1]);
  assert.deepEqual(roundFor(f, 3), f.practice);
});
