/**
 * plain-reading@1: lessons read plainly, and a question never points at a picture the learner cannot see.
 *  - no maths lesson sentence is joined with a semicolon (content.ts splits them at the source);
 *  - a question that says "the table shows", "as shown", "in the picture" … always comes with its picture;
 *  - the owner's view shows a lesson screen's picture, as the child's view does (owner-picture@1);
 *  - Class 1–3 lessons: long sentences may only fall (LONG_SENTENCES is a ratchet: lower it when text is shortened).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { modules } from "../../../packages/learning/src/content";
import { FAMILIES, candidates, problemOf } from "../../../packages/learning/src/families";
import { classOfSkill } from "../year/StepCoach";
import { skillsOf } from "../owner/data";

const LONG_SENTENCES = 115; // Class 1–3 lesson texts with a sentence over 22 words (26 Nov 2026)
const maths = modules.filter((m) => m.competency.startsWith("MATH."));
const textsOf = (m: (typeof modules)[number]) => [...m.chapter, ...m.strategies.flatMap((s) => s.screens)].flatMap((s) => s.text ?? []);

test("no maths lesson sentence is joined with a semicolon", () => {
  const joined = maths.flatMap((m) => textsOf(m).filter((t) => /;\s+[a-z]/.test(t)).map((t) => `${m.competency}: ${t}`));
  assert.deepEqual(joined.slice(0, 5), []);
});

const POINTS = /\bthe (table|picture|figure|diagram|chart|bar graph|pictograph|number line|clock) (shows|below|above|here)\b|\bas shown\b|\bin the (picture|figure|diagram)\b/i;
test("a question that points at a picture always has one", () => {
  const missing: string[] = [];
  for (const id of FAMILIES.keys()) {
    for (const p of candidates(id).slice(0, 3)) {
      const pr = problemOf(`gen:${id}:${p.join(",")}`);
      if (pr && POINTS.test(pr.prompt) && !(pr as { figure?: unknown }).figure) { missing.push(`${id}: ${pr.prompt}`); break; }
    }
  }
  assert.deepEqual(missing, []);
});

test("the owner's view shows the picture of a lesson screen (the growing-pattern table)", () => {
  const grow = skillsOf("algebra").find((s) => s.competency === "MATH.algebra.growing-patterns")!;
  const first = grow.screens[0];
  assert.equal(first.picture?.type, "table");
  assert.match(first.math.join(" "), /Step 1 has \d+ and step 2 has \d+/);
  assert.ok(!/;/.test(first.text.join(" ")));
});

test("Class 1–3 lessons: long sentences may only fall", () => {
  let long = 0;
  for (const m of maths) {
    const cls = classOfSkill(m.competency);
    if (cls === null || cls > 3) continue;
    for (const t of textsOf(m)) if (t.split(/(?<=[.!?])\s+/).some((s) => s.split(/\s+/).length > 22)) long++;
  }
  assert.ok(long <= LONG_SENTENCES, `${long} long sentences in Class 1–3 lessons (baseline ${LONG_SENTENCES})`);
});
