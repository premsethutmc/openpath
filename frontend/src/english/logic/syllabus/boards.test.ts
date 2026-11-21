/**
 * The CBSE and Tamil Nadu English syllabuses (content/english/syllabus/build/boards.py): Classes 1 to 12 of each,
 * every line sound and placed, lines done with a grown-up borrowing real ICSE tasks, and the grammar topics they
 * point at having sentences and a card.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDED, tasksFor } from "../guided/guided.ts";
import { GRAMMAR, LEARN, pick } from "../grammar-use/grammar-use.ts";
import { BOARDS, SYLLABUSES, boardOf, coverage, syllabusFor, syllabusProblems, syllabusesOf, taskLine } from "./syllabus.ts";

const NEW = ["cbse", "tn"] as const;

test("SB-1 three boards; CBSE and Tamil Nadu hold Classes 1 to 12, ICSE 1 to 8", () => {
  assert.deepEqual(BOARDS.map((b) => b.id), ["icse", "cbse", "tn"]);
  for (const b of NEW) assert.deepEqual(syllabusesOf(b).map((s) => s.class), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(SYLLABUSES.length, 32);
  assert.equal(new Set(SYLLABUSES.map((s) => s.id)).size, 32);
  for (const s of SYLLABUSES) assert.equal(syllabusFor(s.class, boardOf(s)).id, s.id);
  assert.equal(syllabusFor(5).id, "icse-cisce-english-class-5", "ICSE stays the default board");
});

test("SB-2 every line is sound, short, in OpenPath's words, and its grammar topics have sentences and a card", () => {
  for (const b of NEW)
    for (const s of syllabusesOf(b)) {
      assert.deepEqual(syllabusProblems(s), [], s.id);
      assert.ok(s.source.url.startsWith("https://") && s.source.note.length > 40, `${s.id}: source named`);
      assert.match(s.review, /not an educator review/);
      for (const o of s.strands.flatMap((x) => x.outcomes)) {
        assert.ok(o.text.split(/\s+/).length <= 22, `${s.id} ${o.id}`);
        if (o.coverage === "not") assert.ok(o.note && !o.where, `${s.id} ${o.id}: a gap says what is missing`);
        for (const t of o.topics ?? []) assert.ok(LEARN.some((c) => c.topic === t), `${s.id} ${o.id}: ${t} has a card`);
        if (o.topics) assert.ok(pick(GRAMMAR, 2, [], o.topics).length >= 3, `${s.id} ${o.id}: a topic sitting has sentences`);
      }
    }
});

test("SB-3 a line done with a grown-up opens at least two real tasks, borrowed from an ICSE line done the same way", () => {
  const icse = new Map(syllabusesOf("icse").map((s) => [s.id, s]));
  for (const b of NEW)
    for (const s of syllabusesOf(b))
      for (const o of s.strands.flatMap((x) => x.outcomes).filter((x) => x.coverage === "guided")) {
        const line = taskLine(s, o);
        assert.notEqual(line.syllabus, s.id, `${s.id} ${o.id}: borrows rather than writes tasks`);
        const from = icse.get(line.syllabus)?.strands.flatMap((x) => x.outcomes).find((x) => x.id === line.outcome);
        assert.equal(from?.coverage, "guided", `${s.id} ${o.id}`);
        assert.equal(o.note, from?.note, `${s.id} ${o.id}: says how it is done`);
        assert.ok(tasksFor(GUIDED, line.syllabus, line.outcome).length >= 2);
      }
});

test("SB-4 what is covered: every line has a place in the app, notes, charts and maps included", () => {
  const sum = (b: "cbse" | "tn") => syllabusesOf(b).map(coverage).reduce((a, c) => ({ covered: a.covered + c.covered, partly: a.partly + c.partly, guided: a.guided + c.guided, not: a.not + c.not, total: a.total + c.total }));
  assert.deepEqual(sum("cbse"), { covered: 70, partly: 36, guided: 88, not: 0, total: 194 });
  assert.deepEqual(sum("tn"), { covered: 116, partly: 14, guided: 56, not: 0, total: 186 });
  for (const s of SYLLABUSES) assert.equal(coverage(s).not, 0, `${s.id}: every line has a place`);
  const study = SYLLABUSES.flatMap((s) => s.strands.flatMap((x) => x.outcomes).filter((o) => o.where === "study").map((o) => o.text));
  assert.ok(study.length >= 9);
  for (const t of study) assert.match(t, /notes|summary|chart|map/i);
});

test("SB-5 the five grammar topics added for these boards: at least eight sentences each, a card each", () => {
  for (const t of ["modals", "question_tags", "word_formation", "syllables", "nominalisation"]) {
    assert.ok(GRAMMAR.topics.some((x) => x.id === t), t);
    assert.ok(GRAMMAR.items.filter((i) => i.topic === t).length >= 8, t);
    assert.ok(LEARN.some((c) => c.topic === t), t);
  }
});
