/**
 * icse@1: the CISCE (ICSE) Class 5 mathematics release (content/learning/syllabus/icse-g05.json, built by the same
 * builder as the CBSE and Tamil Nadu releases). It reuses existing competencies, lessons and question families only.
 *
 * What is checked:
 *   - the release is valid, is never claimed as an educator review, and says that its source is not official;
 *   - the inventory's accounting: every outcome is either mapped to competencies that exist or listed as a gap, and a
 *     gap is never mapped;
 *   - every skill of the release is taught after two early mistakes (a lesson, a strategy screen or a guided question);
 *   - a synthetic learner who answers everything correctly reaches "verified" on every skill after a delayed session,
 *     WITHOUT the test review fixture: only machine-validated questions count (machine-validation@1).
 * This tests what the program decides (nothing is unavailable, nothing stalls), never that a child learns: that needs
 * real learners. Synthetic learner ids only; no stored record changes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Driver, right, type Answerer } from "../learning/driver";
import { boardFor, releasesFor } from "../../../packages/learning/src/curricula";
import { boardReleases } from "../../../packages/learning/src/board-releases";
import { allOutcomesOf, assigned, validateRelease } from "../../../packages/learning/src/curriculum";
import { graph } from "../../../packages/learning/src/graph";
import { moduleFor, question } from "../../../packages/learning/src/content";
import { checkCompetency } from "../../../packages/learning/src/compiler";
import { lessonBlocks } from "../../../packages/learning/src/teaching-contract";
import { boardOf } from "../../../packages/learning/src/dashboard-build";
import { inPart, partLabel } from "../test-part";

type Inventory = {
  board: string;
  grade: number;
  notes: string[];
  gaps: { theme: number; statement: string; source: string; kind: "no-skill" | "lesson-fails-teaching-checks"; reason: string }[];
  chapters: { id: string; title: string; verified: boolean; outcomes: { id: string; statement: string; coverage: "full" | "partial"; note?: string; source: string; mapped: string[]; competencies: { id: string; fit: string }[] }[] }[];
};
const inventory = JSON.parse(readFileSync(new URL("../../../content/learning/syllabus/icse-g05.json", import.meta.url), "utf8")) as Inventory;
const release = boardFor("icse", 5)!;
const skills = [...new Set(allOutcomesOf(release).flatMap(({ outcome }) => outcome.mapping.competencies.filter((m) => m.status === "accepted").map((m) => (graph.byId.has(m.id) ? graph.evidenceTarget(m.id) : m.id))))].sort();

/** A plausible wrong answer the grader can read (as grade7-coverage@1). */
const wrong = (q: string) => {
  const p = question(q);
  if (p.type === "choice") return "ABCDEF".slice(0, Math.max(2, (p.options ?? []).length)).split("").find((l) => l !== p.answer)!;
  if (p.type === "fraction") return p.answer === "1/3" ? "2/7" : "1/3";
  const opt = (p.options ?? []).find((o: string) => o !== p.answer);
  if (p.type === "ratio") return p.answer === "1:1" ? "1:2" : "1:1";
  return opt ?? (p.answer === "0" ? "1" : "0");
};
const wrongFirst = (): Answerer => {
  let n = 0;
  return (q) => (n++ < 2 ? wrong(q) : right(q, ""));
};

test("icse@1: a valid CISCE Class 5 release, one of the board releases, honest about its source", () => {
  assert.ok(release, "boardFor(\"icse\", 5)");
  assert.equal(release.id, "icse-cisce-mathematics-grade-5");
  assert.deepEqual(validateRelease(release), []);
  assert.ok(boardReleases.includes(release), "listed with the board releases (dashboard, coverage matrix)");
  assert.ok(releasesFor(5).includes(release), "offered when a Grade 5 learner chooses a board");
  assert.equal(boardOf(release), "icse");
  assert.equal(release.source.board, "CISCE (ICSE)");
  assert.equal(release.review!.educatorReviewed, false, "never claimed as an educator review");
  assert.match(release.review!.note, /UNOFFICIAL SOURCE/);
  // Class 5 only: no other grade has a CISCE release
  for (let g = 1; g <= 12; g++) if (g !== 5) assert.equal(boardFor("icse", g), null, `no CISCE release for Grade ${g}`);
  // the themes of the curriculum are the chapters; none could be checked against the official document
  const chapters = release.subjects[0].chapters;
  assert.equal(chapters.length, 10);
  assert.ok(chapters.every((c) => /^Theme \d+: /.test(c.title) && c.sourceVerified === false && c.unit?.title));
});

test("icse@1: every outcome is mapped to competencies that exist, or is listed as a gap; a gap is never mapped", () => {
  const outcomes = inventory.chapters.flatMap((c) => c.outcomes);
  assert.equal(outcomes.length, 71);
  assert.equal(inventory.gaps.length, 6);
  assert.equal(allOutcomesOf(release).length, outcomes.length, "the release carries exactly the mapped outcomes");
  assert.deepEqual({ full: outcomes.filter((o) => o.coverage === "full").length, partial: outcomes.filter((o) => o.coverage === "partial").length }, { full: 57, partial: 14 });
  for (const o of outcomes) {
    assert.ok(o.mapped.length > 0, `${o.id}: an outcome with no competency belongs under gaps`);
    for (const id of o.mapped) assert.ok(graph.byId.has(id) && moduleFor(graph.evidenceTarget(id)), `${o.id}: ${id} exists and has a module`);
    assert.match(o.source, /^Theme \d+, /, `${o.id}: points at its place in the curriculum`);
    // a partly covered outcome says what is missing
    if (o.coverage === "partial") assert.ok(o.note, `${o.id}: a partly covered outcome says what is missing`);
  }
  for (const { outcome } of allOutcomesOf(release)) assert.ok(outcome.mapping.competencies.length > 0 && outcome.mapping.competencies.every((m) => m.status === "accepted"), outcome.id);
  const statements = new Set(outcomes.map((o) => o.statement));
  for (const g of inventory.gaps) {
    assert.ok(!statements.has(g.statement), `gap "${g.statement}" is not also mapped`);
    assert.ok(g.reason.length > 20 && /^Theme \d+, /.test(g.source));
  }
  assert.deepEqual(inventory.gaps.map((g) => g.kind).sort(), [...Array(3).fill("lesson-fails-teaching-checks"), ...Array(3).fill("no-skill")]);
  // grade5-lessons@1: the number-line lesson was repaired (it passes the teaching contract), so it is in; the integers lesson
  // is not repaired yet (the deep-recovery research tests use it as their unteachable skill), so it stays out
  assert.ok(assigned(release).some((a) => a.competency === "MATH.number.number-line"));
  assert.deepEqual(lessonBlocks(moduleFor("MATH.number.number-line")!).flatMap((b) => b.violations), []);
  assert.ok(!assigned(release).some((a) => a.competency === "MATH.number.integers"), "integers is not in the release");
  assert.equal(skills.length, 58);
});

// test-part@1: CI works the skills in parts across parallel jobs (all of them when TEST_PART is unset)
test(`icse@1: every skill is taught after early mistakes and verified after a delay, without the review fixture${partLabel}`, () => {
  const untaught: string[] = [], failures: string[] = [];
  let verified = 0;
  for (const skill of inPart(skills)) {
    assert.equal(checkCompetency(skill).mode, "automatic", `${skill}: marked automatically`);
    // taught: two early mistakes, then a lesson (chapter), a strategy screen or a guided question appears
    const t = new Driver(`synthetic-icse5-taught-${skill}`, Date.parse("2026-11-13T09:00:00Z"));
    t.enrol(5, "2026-27", release);
    const first = t.work(skill, wrongFirst(), { max: 80 });
    if (!first.some((ms) => ms.phase === "chapter" || ms.phase === "strategy" || ms.phase === "guided")) untaught.push(`${skill} [${[...new Set(first.map((ms) => ms.phase))].join(">")}]`);
    // verified: every answer right, then up to three later sessions nine days apart (the delayed check)
    const d = new Driver(`synthetic-icse5-${skill}`, Date.parse("2026-11-13T09:00:00Z"));
    d.enrol(5, "2026-27", release);
    const end = d.work(skill, right, { max: 80 }).at(-1)!;
    if (end.phase === "unavailable") {
      failures.push(`${skill}: unavailable`);
      continue;
    }
    for (let k = 0; k < 3 && d.state().evidence(skill).status !== "verified"; k++) {
      d.newSession(9);
      d.work(skill, right, { max: 80 });
    }
    const status = d.state().evidence(skill).status;
    if (status === "verified") verified++;
    else failures.push(`${skill}: ended ${status} (${d.trace.slice(-3).join(" | ").slice(0, 160)})`);
  }
  assert.deepEqual(untaught, [], `${release.id}: no teaching after two early mistakes`);
  assert.deepEqual(failures, [], `${release.id}: ${failures.length} of ${skills.length} skills were not verified`);
  console.log(`${release.id}${partLabel}: ${verified} of ${inPart(skills).length} skills verified by a synthetic learner without the review fixture; all taught after early mistakes`);
});
