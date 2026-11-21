import assert from "node:assert/strict";
import { test } from "node:test";
import { CLASSES, course, classDone, isRight, record, round, topicDone, topicsFor, validateCourse } from "../../../packages/tamil/src/icse";

test("ICSE Tamil covers Classes 1 to 10 and every question is well formed", () => {
  assert.deepEqual(CLASSES, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(validateCourse(), []);
  for (const c of CLASSES) assert.ok(topicsFor(c).length >= 4, `class ${c} has topics`);
  assert.ok(course.topics.flatMap((t) => t.questions).length >= 700);
});

test("answers are checked after Unicode normalisation", () => {
  const q = topicsFor(2)[0].questions[0];
  assert.equal(isRight(q, ` ${q.answer.normalize("NFD")} `), true);
  assert.equal(isRight(q, q.options.find((o) => o !== q.answer)!), false);
});

test("a round puts missed questions first, then unseen, then ones already right", () => {
  const t = topicsFor(5)[0];
  let p = record({}, t.questions[0], true);
  p = record(p, t.questions[3], false);
  const r = round(t, p, 5);
  assert.equal(r[0].id, t.questions[3].id);
  assert.ok(!r.some((q) => q.id === t.questions[0].id));
  assert.ok(topicDone(t, p) > 0 && classDone(5, p) > 0);
});

test("no question offers two options that are both right by its own bank", () => {
  for (const t of course.topics) for (const q of t.questions) assert.equal(q.options.filter((o) => o === q.answer).length, 1, q.id);
});

test("every class has a reading passage, and classic texts beyond Thirukkural", () => {
  for (const c of CLASSES) assert.ok(topicsFor(c).some((t) => t.passage && t.questions.length >= 4), `class ${c} reading`);
  for (const id of ["c1.aathichoodi", "c3.aathichoodi-meaning", "c4.kondrai", "c5.bharathi", "c7.bharathi"]) assert.ok(course.topics.some((t) => t.id === `icse.ta.${id}`), id);
});

test("every syllabus outcome points at a topic or writing that exists; most are covered", async () => {
  const { validateSyllabus, syllabusFor, writingTasks, tamilWords } = await import("../../../packages/tamil/src/icse");
  assert.deepEqual(validateSyllabus(), []);
  const all = CLASSES.flatMap((c) => syllabusFor(c).strands.flatMap((s) => s.outcomes));
  assert.ok(all.filter((o) => o.coverage === "covered").length / all.length > 0.7);
  for (const c of CLASSES) assert.ok(writingTasks.some((t) => t.class === c), `class ${c} writing`);
  assert.equal(tamilWords("என் பள்ளி மதுரையில் உள்ளது. Hello"), 4);
});

test("listening questions name what is spoken, and the spoken word is an option", () => {
  for (const t of course.topics.filter((x) => x.listen)) for (const q of t.questions) assert.ok(q.say && q.options.includes(q.say) && q.answer === q.say, q.id);
});
