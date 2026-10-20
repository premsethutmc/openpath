/**
 * Mathematics completion (Grades 1–12, CBSE and Tamil Nadu): answer types, written answers marked by an educator,
 * the board curricula, the competency expansion and the coverage compiler. Synthetic learners only.
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import cases from "../../../content/learning/answer-cases.v1.json";
import expansion from "../../../content/learning/competency-expansion.v1.json";
import { canonicalOf, sameAnswer, type AnswerType } from "../../../packages/learning/src/answer-types";
import { boardReleases } from "../../../packages/learning/src/board-releases";
import { CRITERIA, checkCompetency, compileRelease } from "../../../packages/learning/src/compiler";
import { canonical, isCorrect, question } from "../../../packages/learning/src/content";
import { assigned, validateRelease } from "../../../packages/learning/src/curriculum";
import { boardFor } from "../../../packages/learning/src/curricula";
import { graph } from "../../../packages/learning/src/graph";
import { pool } from "../../../packages/learning/src/families";
import { moduleState } from "../../../packages/learning/src/intervention";
import { readRecords } from "../../../packages/learning/src/records";
import { learnerState, make } from "../../../packages/learning/src/session";
import { MARKED_NOT, MARKED_RIGHT, writtenTasks, type WrittenMark } from "../../../packages/learning/src/written";

test("answers@2: every shared case gives the agreed verdict (the server checks the same table)", () => {
  for (const [t, a, b, want] of cases.cases as [AnswerType, string, string, boolean][]) assert.equal(sameAnswer(t, a, b), want, `${t}: ${a} vs ${b}`);
  // exact answers are exact: a decimal approximation of a surd is not the surd
  assert.equal(sameAnswer("exact", "1.4142", "√2"), false);
  assert.equal(canonicalOf("exact", "√18"), canonicalOf("exact", "3√2"));
});

test("mixed@1: a mixed number in a fraction answer is its value, in the app and on the server (never 11/2 for 1 1/2)", () => {
  const q = { id: "t", type: "fraction" as const, answer: "3/2", prompt: "", competency: "MATH.number.fraction-models" } as never;
  assert.equal(isCorrect(q, "1 1/2"), true);
  assert.equal(isCorrect(q, "1.5"), true);
  assert.equal(isCorrect({ ...(q as object), answer: "11/2" } as never, "1 1/2"), false, "1 1/2 is not 11/2");
  assert.equal(isCorrect({ ...(q as object), answer: "-7/2" } as never, "−3 1/2"), true);
});

test("written@1: an unmarked written answer is pending and never evidence; only the educator's mark enters the engine", () => {
  const t = writtenTasks.find((x) => x.id === "wr:irr:sqrt2")!;
  const q = question(t.id);
  assert.equal(q.type, "written");
  assert.equal(isCorrect(q, "Assume √2 = a/b … so √2 is irrational."), false, "the learner's text is never marked by the computer");
  assert.equal(isCorrect(q, MARKED_RIGHT), true);
  assert.equal(isCorrect(q, MARKED_NOT), false);
  assert.equal(canonical(q, "any text"), null);
  const c = { learnerId: "L", sessionId: "learn:L:1", at: "2026-10-19T10:00:00Z" };
  const a = make.attempt(c, t.id, "written:marked-correct", "practice");
  const pending = readRecords("L", [a]);
  assert.equal(pending.attempts.length, 0, "typing the mark's own words gains nothing: unmarked, it is pending");
  assert.equal(pending.pending.length, 1);
  const mark: WrittenMark = { attemptId: a.id, questionId: t.id, verdict: "correct", score: 4, outOf: 4, feedback: "Complete.", at: "2026-10-20T10:00:00Z", role: "educator" };
  const marked = readRecords("L", [a], [mark]);
  assert.equal(marked.pending.length, 0);
  assert.equal(marked.attempts[0].response, MARKED_RIGHT);
  assert.equal(marked.attempts[0].written?.text, "written:marked-correct", "the learner's text is kept for display");
  const not = readRecords("L", [a], [{ ...mark, verdict: "incorrect", score: 0 }]);
  assert.equal(not.attempts[0].response, MARKED_NOT);
  // while a written answer waits, its module waits too (it never re-asks or moves on)
  const st = learnerState("L", [a], Date.parse("2026-10-19T11:00:00Z"));
  const ms = moduleState(t.competency, st.records, st.evidence(t.competency), Date.parse("2026-10-19T11:00:00Z"), c.sessionId);
  assert.ok(ms.phase === "waiting" || ms.phase === "unavailable", ms.phase);
});

test("boards@1: CBSE and Tamil Nadu releases for Grades 1–12, valid, through one builder and the same hierarchy", () => {
  assert.equal(boardReleases.length, 24);
  for (const board of ["cbse", "tn"] as const)
    for (let g = 1; g <= 12; g++) {
      const r = boardFor(board, g);
      assert.ok(r, `${board} grade ${g}`);
      assert.deepEqual(validateRelease(r!), [], `${board} grade ${g} is valid`);
      assert.equal(r!.review!.educatorReviewed, false, "never claimed as an educator review");
      for (const ch of r!.subjects[0].chapters) assert.ok(ch.unit?.title, "every chapter sits in a mathematical domain");
      for (const a of assigned(r!)) assert.ok(graph.byId.has(a.competency), a.competency);
    }
  // every grade's dashboard is built by the same code path: Mathematics → Domain → Chapter (→ Section) → Skill
  for (const [board, g] of [["cbse", 1], ["tn", 6], ["cbse", 9], ["tn", 12]] as const) {
    const c = { learnerId: "L", sessionId: "learn:L:1", at: "2026-10-19T10:00:00Z" };
    const st = learnerState("L", [make.enrol(c, g, "2026-27", boardFor(board, g)!)], Date.parse("2026-10-19T11:00:00Z"));
    const [subject] = st.summary!.tiles;
    assert.equal(subject.kind, "subject");
    assert.ok(subject.children.every((u) => u.kind === "unit"), "domains under the subject");
    assert.ok(subject.children.every((u) => u.children.every((ch) => ch.kind === "chapter")));
  }
});

test("expansion@1: existing competency ids are kept, new ones are unique, relations never cycle, disputed ones are not followed", () => {
  const inv = JSON.parse(readFileSync(new URL("../../../content/mathematics/curriculum.v1.json", import.meta.url), "utf8")).competencies as { id: string }[];
  for (const c of inv) assert.ok(graph.byId.has(c.id), c.id);
  assert.equal(new Set(expansion.competencies.map((c) => c.id)).size, expansion.competencies.length);
  for (const c of expansion.competencies) assert.ok(!inv.some((x) => x.id === c.id), `${c.id} is new`);
  for (const d of expansion.disputed) assert.ok(!graph.supportsOf(d.target).includes(d.from) || graph.relationsOf(d.target).find((r) => r.from === d.from)!.source !== "expansion@1", `${d.from} → ${d.target} is not followed from the expansion`);
  // merged duplicates point at one competency
  for (const m of expansion.merged) assert.ok(graph.byId.has(m.into) && !graph.byId.has(m.from), `${m.from} merged into ${m.into}`);
  // every syllabus outcome names only competencies that exist
  for (const f of readdirSync(new URL("../../../content/learning/syllabus/", import.meta.url)).filter((x) => x.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(new URL(`../../../content/learning/syllabus/${f}`, import.meta.url), "utf8"));
    for (const ch of d.chapters) for (const o of ch.outcomes) for (const id of o.mapped) assert.ok(graph.byId.has(id), `${f} ${o.id}: ${id}`);
  }
});

test("compiler@1: twelve criteria from the content itself; nothing is called validated without educator review", () => {
  const rows = boardReleases.flatMap(compileRelease);
  assert.ok(rows.length > 1000);
  assert.equal(rows.filter((r) => r.class === "validated").length, 0, "nothing is educator-approved in the repository");
  for (const r of rows.filter((x) => x.class === "awaiting")) for (const c of r.competencies) assert.ok(CRITERIA.slice(0, 11).every((k) => checkCompetency(c).met[k]), `${c} is complete`);
  // a competency with no content is never "awaiting"
  const empty = rows.find((r) => r.competencies.length && r.competencies.every((c) => !checkCompetency(c).met.strategy));
  if (empty) assert.notEqual(empty.class, "awaiting");
});

test("expansion@1 competencies are capabilities of the shared engine: answering their questions builds evidence", () => {
  const c = { learnerId: "L", sessionId: "learn:L:1", at: "2026-10-19T10:00:00Z" };
  const exp = graph.competencies.filter((x) => x.origin === "expansion");
  assert.ok(exp.length > 100);
  // a generated question of an expansion competency, and a component question of an educator-marked module
  const gen = [...new Set(boardReleases.flatMap((r) => assigned(r).map((a) => a.competency)))].map((id) => ({ id, m: checkCompetency(id) })).find((x) => graph.get(x.id).origin === "expansion" && x.m.families.length)!;
  assert.ok(gen, "an expansion competency with a family");
  const st = learnerState("L", [make.enrol(c, 6, "2026-27", boardFor("cbse", 6)!)], Date.parse("2026-10-19T11:00:00Z"));
  assert.ok(st.evidence(gen.id));
  const p = pool(gen.m.families[0]).items[0];
  const recs = [make.enrol(c, 6, "2026-27", boardFor("cbse", 6)!), make.attempt(c, p.id, p.answer, "diagnostic")];
  const after = learnerState("L", recs, Date.parse("2026-10-19T11:00:00Z"));
  assert.equal(after.evidence(gen.id).attempts.length, 1, "the engine records it (it did not reject the capability)");
});
