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
  let p = record(record({}, t.questions[0], true), t.questions[0], true);
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

test("literature practice: own stories for Classes 6-10, exam-length (about 250 words) in Classes 9 and 10; textbooks are never 'not here'", async () => {
  const { syllabusFor, tamilWords } = await import("../../../packages/tamil/src/icse");
  for (const c of [6, 7, 8, 9, 10]) assert.ok(course.topics.some((t) => t.id === `icse.ta.c${c}.story` && t.passage), `class ${c} story`);
  for (const c of [9, 10]) assert.ok(tamilWords(course.topics.find((t) => t.id === `icse.ta.c${c}.story`)!.passage!) >= 240, `class ${c} story length`);
  const all = CLASSES.flatMap((c) => syllabusFor(c).strands.flatMap((s) => s.outcomes));
  assert.equal(all.filter((o) => o.coverage === "not-yet").length, 0);
});

test("Tamil Nadu State Board course: Classes 1-10, its own grammar topics, syllabus links resolve, writing per class", async () => {
  const { tnCourse, topicsFor, syllabusFor, writingFor } = await import("../../../packages/tamil/src/icse");
  assert.deepEqual([...new Set(tnCourse.topics.map((t) => t.class))].sort((a, b) => a - b), CLASSES);
  for (const c of CLASSES) {
    assert.ok(topicsFor(c, "tn").length >= 8, `tn class ${c}`);
    assert.ok(writingFor(c, "tn").length >= 1, `tn class ${c} writing`);
    assert.ok(syllabusFor(c, "tn").strands.length >= 3);
  }
  for (const id of ["c6.word-edges", "c6.inam-pairs", "c7.kutriyal", "c8.thogai", "c8.vallinam", "c8.asai", "c10.tinai", "c10.paa"]) assert.ok(tnCourse.topics.some((t) => t.id === `tn.ta.${id}`), id);
  assert.ok(tnCourse.topics.every((t) => t.id.startsWith("tn.ta.")));
});

test("sim-tamil@1 fixes: a lucky tap is not 'known'; placement and next-for-you behave", async () => {
  const { known, record: rec, nextTopic, topicsFor: tf } = await import("../../../packages/tamil/src/icse");
  const { startPlacement, answerPlacement } = await import("../../../packages/tamil/src/placement");
  const q = tf(5, "tn")[0].questions[0];
  assert.equal(known(rec({}, q, true)[q.id]), false, "one right is not known");
  assert.equal(known(rec(rec({}, q, true), q, true)[q.id]), true, "two in a row is");
  assert.equal(known(rec(rec(rec(rec({}, q, false), q, false), q, true), q, true)[q.id]), false, "but not with more wrong than right");
  // placement from Class 5: all right climbs to 10; all wrong comes down to 1
  let s = startPlacement(5);
  while (!s.done) s = answerPlacement(s, true);
  assert.equal(s.start, 10);
  s = startPlacement(5);
  while (!s.done) s = answerPlacement(s, false);
  assert.equal(s.start, 1);
  // two rounds under half right on one topic: step back to the same strand, a class lower
  const hard = tf(8, "tn").find((t) => t.id.endsWith(".vallinam"))!;
  const n = nextTopic(8, "tn", {}, [{ topic: hard.id, right: 1, total: 8 }, { topic: hard.id, right: 2, total: 8 }]);
  assert.ok(n && n.stepBack && n.topic.class < 8, JSON.stringify(n?.topic.id));
});
