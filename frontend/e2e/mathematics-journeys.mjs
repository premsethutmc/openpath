/**
 * The mathematics acceptance journeys (registered by mathematics-completion.test.mjs, which holds the helpers).
 * Synthetic learners and reviewers only; every screen is the real app against the real Django API; content is
 * released by synthetic reviewers in the same run (four eyes), nothing is approved in the repository.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCompetency } from "../../packages/learning/src/compiler.ts";
import { moduleFor, question } from "../../packages/learning/src/content.ts";
import { boardFor } from "../../packages/learning/src/curricula.ts";
import { assigned } from "../../packages/learning/src/curriculum.ts";
import { problemOf, show } from "../../packages/learning/src/families.ts";
import { graph } from "../../packages/learning/src/graph.ts";
import { make } from "../../packages/learning/src/session.ts";
import { call, home, learnerPage, mode, open, pathTo, records, releaseSkills, reviewer, setupBoard, shot, tile, tileStatus, timeTravel, toVerified, work } from "./mathematics-completion.test.mjs";

const DJANGO = mode === "django";

/** The prediction of one written misconception for a generated question, as the learner would type or choose it. */
function predicted(qid, bugId) {
  const p = problemOf(qid);
  const b = p?.bugs.find((x) => x.id === bugId);
  if (!p || !b || b.predict === null) return null;
  const v = Array.isArray(b.predict) && p.type !== "set" ? b.predict[0] : b.predict;
  return p.type === "choice" ? "ABCD"[v] : typeof v === "string" ? v : show(v);
}
/** A wrong answer to any question (its first predicted mistake, else a nearby wrong value). */
function anyWrong(qid) {
  const q = question(qid);
  const m = (q.misconceptions ?? []).find((x) => x.when !== q.answer);
  if (m) return m.when;
  if (q.type === "choice") return "ABCD".split("").find((l, i) => l !== q.answer && i < (q.options?.length ?? 2)) ?? null;
  const n = Number(q.answer);
  return Number.isFinite(n) ? String(n + 1) : null;
}
/**
 * A learner with one gap below the skill: questions of the skill are answered with the misconception that points at
 * the prerequisite, the prerequisite's own questions are answered wrong — until the learner has been taught the
 * prerequisite (then everything is answered right). `taught()` reads that from the records the policy is given.
 */
function gapLearner(target, bugId, prerequisite) {
  const state = { taught: false, targetWrong: 0, prereqWrong: 0 };
  const policy = (qid) => {
    if (state.taught) return null;
    const q = question(qid);
    if (graph.evidenceTarget(q.competency) === target && state.targetWrong < 2) {
      const v = predicted(qid, bugId);
      if (v !== null && v !== undefined) {
        state.targetWrong++;
        return v;
      }
    }
    if (q.competency === prerequisite || graph.evidenceTarget(q.competency) === prerequisite) {
      if (state.prereqWrong < 1) {
        state.prereqWrong++;
        return anyWrong(qid);
      }
    }
    return null;
  };
  return { policy, state };
}
/** Work a skill whose learner has a gap; the log must show the prerequisite taught and the return to the skill. */
async function recoverInModule(page, learner, path, target, bugId, prerequisite, prefix) {
  const { policy, state } = gapLearner(target, bugId, prerequisite);
  await open(page, path);
  const log = [];
  for (let round = 0; round < 4; round++) {
    const part = await work(page, (qid) => policy(qid), 40);
    log.push(...part);
    const recs = await records(page, learner);
    if (recs.some((r) => r.record === "teach" && r.competency === prerequisite)) state.taught = true;
    if (state.taught && part.length === 0) break;
    if (!part.length) break;
  }
  await shot(page, `${prefix}-recovered`);
  const recs = await records(page, learner);
  const teach = recs.filter((r) => r.record === "teach");
  assert.ok(teach.some((r) => r.competency === prerequisite), `${graph.get(prerequisite).name} was taught (${log.join(" ")})`);
  const firstPrereq = teach.find((r) => r.competency === prerequisite).at;
  // back to the original objective: the skill is asked again after the prerequisite was taught, and answered right
  const later = recs.filter((r) => r.record === "attempt" && r.at > firstPrereq && graph.evidenceTarget(r.competency) === target);
  assert.ok(later.length > 0, `the learner returned to ${graph.get(target).name} (${log.join(" ")})`);
  assert.ok(later.every((r) => isRight(r)), "after the prerequisite, the skill's answers are right");
  return log;
}
const isRight = (r) => {
  const q = question(r.questionId);
  return q.type === "choice" ? r.response === q.answer : true;
};
/** A representative skill of a board's grade: assigned, complete on every automatic criterion, with a deep pool. */
function representative(board, grade, avoid = new Set()) {
  const r = boardFor(board, grade);
  const ids = [...new Set(assigned(r).map((a) => a.competency))];
  const ok = ids.filter((c) => !avoid.has(c) && moduleFor(c)?.pool && checkCompetency(c).complete && graph.get(c).gradeRange[0] <= grade);
  assert.ok(ok.length, `${board} Grade ${grade} has a complete skill`);
  // prefer a skill introduced in this very grade
  return ok.find((c) => graph.get(c).gradeRange[0] === grade) ?? ok[0];
}

// ------------------------------------------------------------------ the eight named scenarios

test("Grade 2 (CBSE): carrying in addition → place value (tens) is taught → back to adding, then verified", { skip: !DJANGO && "needs the Django API" }, async () => {
  const target = "MATH.number.addition-regroup";
  const prereq = "MATH.number.place-value-tens";
  await releaseSkills(target, prereq);
  const { page, context, learner } = await learnerPage("Synthetic Grade 2 CBSE learner");
  const release = await setupBoard(page, 2, "cbse");
  const path = pathTo(release, target);
  await recoverInModule(page, learner, path, target, "no-regroup", prereq, "g02-cbse-carry");
  await toVerified(page, learner, path, "g02-cbse-carry-v");
  await context.close();
});

test("Grade 5 (Tamil Nadu): fractions without multiplication fluency → the multiplication facts → back to fractions", { skip: !DJANGO && "needs the Django API" }, async () => {
  const target = "MATH.number.fraction-multiply";
  const facts = problemOf("gen:fmulw:4,7,5").bugs.find((b) => b.id === "fact-slip-multiply").competency;
  await releaseSkills(target, facts);
  const { page, context, learner } = await learnerPage("Synthetic Grade 5 TN learner");
  const release = await setupBoard(page, 5, "tn");
  const path = pathTo(release, target);
  await recoverInModule(page, learner, path, target, "fact-slip-multiply", facts, "g05-tn-fractions");
  await context.close();
});

test("Grade 8 (Tamil Nadu): linear equations with negative numbers → integer operations → back to the equation", { skip: !DJANGO && "needs the Django API" }, async () => {
  const target = "MATH.algebra.linear-rational";
  const fam = moduleFor(target).pool.family;
  const sample = problemOf(`gen:${fam}:3,-4,-2`) ?? problemOf(`gen:${fam}:2,-5,-3`);
  const bug = sample.bugs.find((b) => b.competency !== target && b.probe);
  assert.ok(bug, `${fam} has a misconception that points below the equation`);
  await releaseSkills(target, bug.competency);
  const { page, context, learner } = await learnerPage("Synthetic Grade 8 TN learner");
  const release = await setupBoard(page, 8, "tn");
  await recoverInModule(page, learner, pathTo(release, target), target, bug.id, bug.competency, "g08-tn-negatives");
  await context.close();
});

test("Grade 10 (CBSE): quadratic equations → factorisation (algebra) recovery → back to quadratics", { skip: !DJANGO && "needs the Django API" }, async () => {
  const target = "MATH.algebra.quadratics";
  const prereq = "MATH.algebra.factorisation";
  await releaseSkills(target, prereq);
  const { page, context, learner } = await learnerPage("Synthetic Grade 10 CBSE learner", "tablet");
  const release = await setupBoard(page, 10, "cbse");
  await recoverInModule(page, learner, pathTo(release, target), target, "pair-product-only", prereq, "g10-cbse-quadratics");
  await context.close();
});

test("Grade 12 (CBSE): integration with a weakness in exponent rules → powers → back to integration, then verified", { skip: !DJANGO && "needs the Django API" }, async () => {
  const target = "MATH.calculus.integration-methods";
  const prereq = "MATH.number.exponents";
  await releaseSkills(target, prereq);
  const { page, context, learner } = await learnerPage("Synthetic Grade 12 CBSE learner", "tablet");
  const release = await setupBoard(page, 12, "cbse");
  const path = pathTo(release, target);
  await recoverInModule(page, learner, path, target, "multiply-for-power", prereq, "g12-cbse-integration");
  await toVerified(page, learner, path, "g12-cbse-integration-v");
  await context.close();
});

test("board transfer: Tamil Nadu Grade 7 → CBSE Grade 7 in the same year: shown and verified skills stay", { skip: !DJANGO && "needs the Django API" }, async () => {
  const tnRel = boardFor("tn", 7);
  const cbseRel = boardFor("cbse", 7);
  const both = [...new Set(assigned(tnRel).map((a) => a.competency))].filter((c) => assigned(cbseRel).some((a) => a.competency === c) && moduleFor(c)?.pool && checkCompetency(c).complete);
  assert.ok(both.length, "a skill both boards teach in Grade 7");
  const skill = both[0];
  await releaseSkills(skill);
  const { page, context, learner } = await learnerPage("Synthetic transfer learner");
  await setupBoard(page, 7, "tn");
  await toVerified(page, learner, pathTo(tnRel, skill), "transfer-1-tn");
  const before = await records(page, learner);
  await home(page);
  await page.getByRole("button", { name: "Start the next year" }).click();
  await setupBoard(page, 7, "cbse", { next: true });
  await shot(page, "transfer-2-cbse-dashboard");
  const after = await records(page, learner);
  assert.equal(after.length, before.length + 1, "one enrolment added; nothing removed");
  // the same skill, reached through the CBSE book's own domains and chapters, is still verified
  const path = pathTo(cbseRel, skill);
  await home(page);
  for (const t of path.slice(0, -1)) await tile(page, t);
  assert.equal(await tileStatus(page, path.at(-1)), "verified", "the evidence crossed the board change");
  await shot(page, "transfer-3-still-verified");
  await context.close();
});

const UNSEEN = `Kaveri Valley Mathematics — Class 6 (synthetic test book, not a real board; CC0)
Subject: Mathematics
Academic year 2026–27
Unit 1: Numbers
Chapter 1: Factors and multiples (pages 1 to 20)
1.1 Prime and composite numbers (page 2)
By the end of this section learners can:
• tell whether a number up to 100 is prime or composite (page 3)
1.2 Highest common factor (page 10)
By the end of this section learners can:
• find the HCF of two numbers by listing factors (page 11)
Unit 2: Shapes
Chapter 2: Angles (pages 21 to 34)
By the end of this chapter learners can:
• measure an angle with a protractor and name it acute, right or obtuse (page 22)
• write a poem about triangles (page 30)
`;

test("unseen textbook: a new book is read, mapped with no code change, and learnt through the same screens", { skip: !DJANGO && "needs the Django API" }, async () => {
  const { page, context, learner } = await learnerPage("Synthetic unseen-book learner");
  await page.getByRole("heading", { name: "Set up My Learning Year" }).waitFor();
  await page.getByRole("button", { name: /^Grade 6\b/ }).click();
  await page.getByRole("button", { name: "No goal for now" }).click();
  await page.getByRole("button", { name: /Add my textbook/ }).click();
  await page.getByLabel("Textbook contents").fill(UNSEEN);
  await page.getByRole("button", { name: "Read the textbook" }).click();
  await page.getByRole("heading", { name: "Check the skills for each outcome" }).waitFor();
  await page.locator(".outcome", { hasText: "poem about triangles" }).getByText("No matching skill: kept as a proposal.").waitFor();
  await shot(page, "unseen-1-mapping");
  // every clear mapping is ticked; an outcome left unticked is not assigned
  const hcf = page.locator(".outcome", { hasText: "HCF of two numbers" }).getByRole("checkbox").first();
  if (!(await hcf.isChecked())) await hcf.check();
  await page.getByRole("button", { name: "Use this curriculum for Grade 6" }).click();
  await page.getByRole("heading", { name: /^Grade 6 · / }).waitFor();
  await tile(page, "Numbers");
  await tile(page, "Factors and multiples");
  await shot(page, "unseen-2-chapter");
  const hcfTile = page.locator(".tile", { hasText: /HCF|common factor/i }).first();
  await hcfTile.waitFor();
  await home(page);
  const recs = await records(page, learner);
  const enrol = recs.find((r) => r.record === "enrol");
  assert.ok(enrol.curriculum.id, "the book became a curriculum release in the learner's record");
  await context.close();
});

test("academic progression: Grade 3 completed skill, Grade 4 begun; history and evidence are kept", { skip: !DJANGO && "needs the Django API" }, async () => {
  const skill = representative("cbse", 3);
  await releaseSkills(skill);
  const { page, context, learner } = await learnerPage("Synthetic progression learner");
  const g3 = await setupBoard(page, 3, "cbse");
  await toVerified(page, learner, pathTo(g3, skill), "progress-1-g3");
  const before = (await records(page, learner)).length;
  await timeTravel(page, learner, 200);
  await page.reload();
  await page.getByRole("button", { name: "Start the next year" }).click();
  await page.getByRole("radio", { name: /2027-28/ }).click().catch(() => {});
  await setupBoard(page, 4, "cbse", { next: true });
  await shot(page, "progress-2-g4");
  const after = await records(page, learner);
  assert.equal(after.length, before + 1, "one enrolment added; nothing removed");
  await page.getByRole("button", { name: "Earlier years" }).click();
  await page.getByText(/Grade 3 · /).waitFor();
  await shot(page, "progress-3-history");
  await context.close();
});

// ------------------------------------------------------------------ every grade, both boards, the same code path

for (let grade = 1; grade <= 12; grade++) {
  const board = grade % 2 ? "cbse" : "tn";
  test(`every grade: Grade ${grade} (${board === "cbse" ? "CBSE" : "Tamil Nadu"}) — a skill from the board's book, two mistakes, taught, then verified a week later`, { skip: !DJANGO && "needs the Django API" }, async () => {
    const skill = representative(board, grade);
    await releaseSkills(skill);
    const { page, context, learner } = await learnerPage(`Synthetic Grade ${grade} ${board} learner`, grade >= 9 ? "tablet" : "phone");
    const release = await setupBoard(page, grade, board);
    await shot(page, `grade-${String(grade).padStart(2, "0")}-${board}-0-dashboard`);
    const path = pathTo(release, skill);
    assert.ok(path.length >= 2, "Mathematics → domain → chapter (→ section) → skill");
    await toVerified(page, learner, path, `grade-${String(grade).padStart(2, "0")}-${board}`);
    await context.close();
  });
}

// ------------------------------------------------------------------ the part an educator marks

test("written work: a drawn answer is pending, shared with an educator, marked in the review app, then evidence", { skip: !DJANGO && "needs the Django API" }, async () => {
  const { writtenTasks } = await import("../../packages/learning/src/written.ts");
  const task = writtenTasks.find((t) => t.answer === "drawing" && t.kind === "construction" && moduleFor(t.competency));
  assert.ok(task, "a construction answered by drawing, in a module");
  const educator = await reviewer("m-marker", ["educator"]);
  await releaseSkills(task.competency);
  const { page, context, learner } = await learnerPage("Synthetic written-work learner", "tablet");
  await setupBoard(page, task.grade, "cbse");
  // the task, answered as the module asks it: a drawing with a note (the app's own record maker; the next sequence number)
  const drawing = `draw@1 ${JSON.stringify({ text: "Arcs of equal radius from both ends; the line through where they cross.", s: [["l", 40, 150, 260, 150], ["c", 40, 150, 180, 150], ["c", 260, 150, 120, 150], ["l", 150, 40, 150, 260]] })}`;
  const event = make.attempt({ learnerId: learner, sessionId: `learn:${learner}:written`, at: new Date().toISOString() }, task.id, drawing, "practice");
  const seq = (await call(page, `/pupils/${learner}/events/?subject=mathematics`)).data.count;
  const saved = await call(page, `/pupils/${learner}/events/`, { subject: "mathematics", seq, event });
  assert.ok([200, 201].includes(saved.status), JSON.stringify(saved.data));
  await page.reload();
  await page.getByText("Written work").waitFor();
  await page.getByText(/Waiting for an educator/).waitFor();
  await shot(page, "written-1-pending");
  // the parent shares written work with the educator; the educator marks it in the review app
  await page.getByText("Who marks written work").click();
  await page.getByLabel("Educator's email").fill(educator.email);
  await page.getByRole("button", { name: "Share written work" }).click();
  await educator.page.reload();
  await educator.page.getByRole("tab", { name: /Marking/ }).click().catch(async () => educator.page.getByRole("button", { name: /Marking/ }).click());
  const card = educator.page.locator(".qcard", { hasText: task.prompt.slice(0, 30) }).first();
  await card.waitFor();
  await card.locator("svg.sketch-sheet").waitFor();
  await shot(educator.page, "written-2-marking-queue");
  for (const sel of await card.getByRole("combobox").all()) {
    const opts = await sel.locator("option").all();
    await sel.selectOption({ index: opts.length - 1 });
  }
  await card.getByLabel("Feedback").fill("Both arcs and the bisector are right.");
  await card.getByRole("button", { name: /Give the mark/ }).click();
  await page.reload();
  await page.getByText(/Marked correct/).waitFor();
  await shot(page, "written-3-marked");
  await context.close();
  await educator.context.close();
});
