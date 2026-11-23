/** owner-view@1: the owner's view covers every maths skill, trigonometry first, and shows what the learner is told. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules } from "../../../packages/learning/src/content";
import { sampleOf, search, skillsOf, topics, totalsOf } from "./data";

test("every maths skill is in exactly one topic, trigonometry first", () => {
  assert.equal(topics[0], "trigonometry");
  const all = topics.flatMap((t) => skillsOf(t).map((s) => s.competency));
  assert.deepEqual([...all].sort(), modules.filter((m) => m.competency.startsWith("MATH.")).map((m) => m.competency).sort());
});

test("trigonometry shows its screens, question types and wrong-answer feedback", () => {
  const trig = skillsOf("trigonometry"), t = totalsOf(trig);
  assert.ok(t.skills >= 5 && t.screens > 20 && t.families > 5 && t.certified <= t.families);
  const ratios = trig.find((s) => s.competency === "MATH.trigonometry.ratios")!;
  assert.ok(ratios.screens.every((s) => s.text.length > 0));
  const samples = ratios.families.map(sampleOf).filter((x) => x !== null);
  assert.ok(samples.length > 0 && samples.some((s) => s!.mistakes.length > 0));
  for (const s of samples) for (const m of s!.mistakes) assert.ok(m.says.length > 10 && !/undefined|NaN/.test(m.wrong));
  assert.ok(search(trig, "compound").length > 0 && search(trig, "zzzz").length === 0);
});
