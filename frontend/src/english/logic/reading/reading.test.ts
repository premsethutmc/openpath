/**
 * Reading comprehension course: the content is sound, the levels really step up, the hints never give an answer
 * away, a check is always made of questions and texts the learner has not been taught on, and what a pass is
 * called depends on whether the learner had help. Nothing in the course is evidence for the engine.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CHECK_SIZE, COURSE, LEVELS, SKILL_IDS, buildCourse, courseProblems, lessonFor, meanSentenceLength, questionsFor, wordCount, type Level, type Unit } from "./course.ts";
import { LABEL_AFTER_HELP, LABEL_OWN, ReadingUnitSession, freshCheck, passed, progress, recommend, statusOf, type ReadingRecord } from "./session.ts";
import { loadContent } from "../content.ts";
import { eventProblem } from "../events.ts";
import { testClock } from "../journey-sim.ts";
import { Learner } from "../learner.ts";
import { MemoryRepo } from "../store.ts";

const UNITS: Unit[] = LEVELS.flatMap((level) => SKILL_IDS.map((skill) => ({ skill, level })));
const byId = new Map(COURSE.questions.map((q) => [q.id, q]));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Work through a unit's lesson and practice, answering practice correctly, up to the first check question. */
function learnToCheck(s: ReadingUnitSession) {
  let snap = s.snapshot();
  assert.equal(snap.phase, "lesson");
  while (s.snapshot().phase === "lesson") {
    const l = s.snapshot() as Extract<ReturnType<ReadingUnitSession["snapshot"]>, { phase: "lesson" }>;
    if (l.steps < l.lesson.worked.steps.length) s.nextStep();
    else s.startPractice();
  }
  for (snap = s.snapshot(); snap.phase === "practice"; snap = s.snapshot()) {
    s.answerPractice(byId.get(snap.practice.question.id)!.answer);
    s.nextPractice();
  }
}
/** Answer the open check: every question right, or the first one wrong. */
function answerCheck(s: ReadingUnitSession, right: boolean) {
  for (let snap = s.snapshot(), i = 0; snap.phase === "check"; snap = s.snapshot(), i++) {
    const q = byId.get(snap.question.id)!;
    s.answerCheck(right || i > 0 ? q.answer : (q.answer + 1) % q.options.length);
  }
}
function run(unit: Unit, mode: "learn" | "check_me", right: boolean, history: ReadingRecord[] = []) {
  const s = new ReadingUnitSession(COURSE, unit, mode, history);
  if (mode === "learn") learnToCheck(s);
  answerCheck(s, right);
  return { s, snap: s.snapshot(), records: [...history, ...s.take()] };
}

test("RC-1 content: every skill and level has a lesson, a worked example, hinted practice and two fresh checks", () => {
  assert.deepEqual(courseProblems(COURSE), []);
  assert.equal(COURSE.lessons.length, 30);
  assert.equal(COURSE.passages.size, 35);
  assert.equal(COURSE.questions.length, 180);
  for (const u of UNITS) {
    assert.equal(questionsFor(COURSE, u, "practice").length, 2);
    assert.equal(questionsFor(COURSE, u, "check").length, 4);
    assert.equal(lessonFor(COURSE, u).worked.steps.length, 3);
  }
  for (const s of COURSE.skills) assert.match(s.capability, /^EN\.RDG\./);
  // the content checks do find faults: a hint that names the answer, and evidence that is not in the text
  const broken = buildCourse({ version: 1, status: "", skills: COURSE.skills, levels: COURSE.levels }, [
    { level: 1, lessons: [], passages: [{ id: "X", role: "practice", title: "t", text: "The cat is black. It sleeps all day on a warm red mat by the door.", questions: [{ skill: "detail", prompt: "What colour is the cat?", right: "black", wrong: ["white", "grey"], evidence: "The cat is white.", explain: "e", hint: "It is black." }] }] },
  ]);
  const found = courseProblems(broken).join("\n");
  assert.match(found, /X\.detail: evidence is not in the text/);
  assert.match(found, /X\.detail: the hint gives the answer away/);
  assert.match(found, /X: 16 words is outside level 1/);
});

test("RC-2 the five levels step up in length and sentence load, and stay inside their word ranges", () => {
  const at = (level: Level) => [...COURSE.passages.values()].filter((p) => p.level === level);
  const words = LEVELS.map((l) => mean(at(l).map((p) => wordCount(p.text))));
  const load = LEVELS.map((l) => mean(at(l).map((p) => meanSentenceLength(p.text))));
  assert.ok(words.every((w, i) => i === 0 || words[i - 1] < w), `words per text rise: ${words.map((w) => w.toFixed(0))}`);
  assert.ok(load.every((w, i) => i === 0 || load[i - 1] < w), `words per sentence rise: ${load.map((w) => w.toFixed(1))}`);
  // no text of a level is longer than any text of the level above
  for (const l of [1, 2, 3, 4] as Level[]) assert.ok(Math.max(...at(l).map((p) => wordCount(p.text))) < Math.min(...at((l + 1) as Level).map((p) => wordCount(p.text))));
  // Starter causes are stated with because; later levels leave the joining to the reader
  for (const q of COURSE.questions.filter((q) => q.skill === "cause")) assert.equal(/\bbecause\b/.test(q.evidence), q.level === 1, q.id);
});

test("RC-3 an answer cannot be guessed from its position or its length", () => {
  const position = [0, 0, 0];
  let longest = 0;
  for (const q of COURSE.questions) {
    position[q.answer]++;
    const len = q.options.map((o) => o.length);
    if (len.every((n, i) => i === q.answer || n < len[q.answer])) longest++;
  }
  for (const n of position) assert.ok(n >= 45 && n <= 75, `right answers by position: ${position}`);
  assert.ok(longest / COURSE.questions.length < 0.4, `the right answer is the longest option in ${longest} of ${COURSE.questions.length}`);
  // the order is fixed: the same on every visit and every device
  assert.deepEqual(buildCourse({ version: 1, status: "", skills: COURSE.skills, levels: COURSE.levels }, []).questions, []);
  const again = COURSE.questions.map((q) => q.options.join("|"));
  assert.deepEqual(again, COURSE.questions.map((q) => byId.get(q.id)!.options.join("|")));
});

test("RC-4 lesson: the worked example is shown one step at a time, and practice opens only after the last step", () => {
  const s = new ReadingUnitSession(COURSE, { skill: "cause", level: 2 }, "learn");
  let snap = s.snapshot();
  assert.ok(snap.phase === "lesson" && snap.steps === 1 && snap.passage.role === "teach");
  s.startPractice();
  assert.equal(s.snapshot().phase, "lesson", "not before every step has been shown");
  s.nextStep();
  s.nextStep();
  s.nextStep();
  snap = s.snapshot();
  assert.ok(snap.phase === "lesson" && snap.steps === 3);
  s.startPractice();
  assert.equal(s.snapshot().phase, "practice");
});

test("RC-5 practice: hints climb from strategy to nudge to the place in the text, and never show the answer", () => {
  for (const unit of UNITS) {
    const s = new ReadingUnitSession(COURSE, unit, "learn");
    s.nextStep();
    s.nextStep();
    s.startPractice();
    let snap = s.snapshot();
    assert.ok(snap.phase === "practice");
    const q = byId.get(snap.practice.question.id)!;
    assert.deepEqual([snap.practice.hints, snap.practice.highlight, snap.practice.answer], [[], null, null]);
    assert.ok(!JSON.stringify(snap).includes(q.explain), "no explanation before an answer");
    s.hint();
    snap = s.snapshot();
    assert.ok(snap.phase === "practice");
    assert.deepEqual(snap.practice.hints, [lessonFor(COURSE, unit).tip]);
    s.hint();
    snap = s.snapshot();
    assert.ok(snap.phase === "practice");
    assert.deepEqual(snap.practice.hints, [lessonFor(COURSE, unit).tip, q.hint]);
    assert.equal(snap.practice.highlight, null);
    s.hint();
    snap = s.snapshot();
    assert.ok(snap.phase === "practice");
    assert.equal(snap.practice.highlight, q.evidence);
    assert.ok(snap.practice.question.passage.text.includes(q.evidence));
    assert.equal(snap.practice.canHint, false);
    assert.equal(snap.practice.answer, null, "three hints still leave the answering to the learner");
    s.hint();
    assert.equal(s.take().filter((r) => r.type === "hint").length, 3);
  }
});

test("RC-6 practice: a wrong answer is crossed out and brings a hint; two wrong answers explain; a right one moves on", () => {
  const unit: Unit = { skill: "feelings", level: 3 };
  const s = new ReadingUnitSession(COURSE, unit, "learn");
  s.nextStep();
  s.nextStep();
  s.startPractice();
  let snap = s.snapshot();
  assert.ok(snap.phase === "practice");
  const q = byId.get(snap.practice.question.id)!;
  const wrong = [0, 1, 2].filter((i) => i !== q.answer);
  s.answerPractice(wrong[0]);
  snap = s.snapshot();
  assert.ok(snap.phase === "practice");
  assert.deepEqual([snap.practice.wrong, snap.practice.hints.length, snap.practice.solved, snap.practice.answer], [[wrong[0]], 1, false, null]);
  s.answerPractice(wrong[0]);
  assert.equal((s.snapshot() as typeof snap).practice.wrong.length, 1, "a crossed-out option cannot be chosen again");
  s.nextPractice();
  assert.equal((s.snapshot() as typeof snap).practice.index, 0, "no moving on before the question is settled");
  s.answerPractice(wrong[1]);
  snap = s.snapshot();
  assert.ok(snap.phase === "practice" && snap.practice.revealed && !snap.practice.solved);
  assert.deepEqual(snap.practice.answer, { index: q.answer, explain: q.explain });
  assert.equal(snap.practice.highlight, q.evidence);
  s.nextPractice();
  snap = s.snapshot();
  assert.ok(snap.phase === "practice" && snap.practice.index === 1);
  s.answerPractice(byId.get(snap.practice.question.id)!.answer);
  snap = s.snapshot();
  assert.ok(snap.phase === "practice" && snap.practice.solved);
  s.nextPractice();
  assert.equal(s.snapshot().phase, "check");
  const answers = s.take().filter((r) => r.type === "practice_answer");
  assert.deepEqual(answers.map((a) => a.type === "practice_answer" && a.correct), [false, false, true]);
});

test("RC-7 check: unseen questions on texts never used for teaching, no hints, nothing marked until the end", () => {
  for (const unit of UNITS) {
    const s = new ReadingUnitSession(COURSE, unit, "learn");
    learnToCheck(s);
    const before = s.take();
    const taught = new Set([lessonFor(COURSE, unit).worked.passage, ...questionsFor(COURSE, unit, "practice").map((q) => q.passage)]);
    const first = s.snapshot();
    assert.ok(first.phase === "check" && first.position === 0 && first.total === CHECK_SIZE);
    assert.deepEqual(before.at(-1), { type: "shown", unit, question: first.question.id, use: "check" }, "recorded as seen before any answer");
    const q1 = byId.get(first.question.id)!;
    assert.ok(q1.role === "check" && !taught.has(q1.passage) && COURSE.passages.get(q1.passage)!.role === "check");
    for (const leak of [q1.explain, q1.evidence === q1.options[q1.answer] ? q1.explain : q1.evidence]) assert.ok(!JSON.stringify({ ...first, question: { ...first.question, passage: null } }).includes(leak));
    assert.ok(!("answer" in first.question));
    s.hint();
    s.answerPractice(0);
    assert.deepEqual(s.take(), [], "hints and practice answers do nothing in a check");
    s.answerCheck((q1.answer + 1) % 3);
    const second = s.snapshot();
    assert.ok(second.phase === "check" && second.position === 1, "a wrong answer is not marked yet");
    const q2 = byId.get(second.question.id)!;
    assert.notEqual(q2.passage, q1.passage, "each check question is on a different text");
    s.answerCheck(q2.answer);
    const end = s.snapshot();
    assert.ok(end.phase === "result" && !end.result.passed && end.result.label === null);
    assert.deepEqual(end.result.review.map((r) => r.correct), [false, true]);
    assert.ok(end.result.review.every((r) => r.question.passage.text.includes(r.evidence)));
  }
});

test("RC-8 what a pass is called: on your own only without any help in the unit", () => {
  const unit: Unit = { skill: "main_idea", level: 1 };
  const own = run(unit, "check_me", true);
  assert.ok(own.snap.phase === "result" && own.snap.result.passed);
  assert.equal(own.snap.result.label, LABEL_OWN);
  assert.equal(statusOf(progress(COURSE, own.records), unit), "passed_own");

  const taught = run(unit, "learn", true);
  assert.ok(taught.snap.phase === "result" && taught.snap.result.label === LABEL_AFTER_HELP);
  assert.equal(statusOf(progress(COURSE, taught.records), unit), "passed_after_help");

  // a lesson earlier, then "check me" on another day: still after help
  const s = new ReadingUnitSession(COURSE, unit, "learn");
  learnToCheck(s);
  const later = run(unit, "check_me", true, s.take());
  assert.ok(later.snap.phase === "result" && later.snap.result.label === LABEL_AFTER_HELP);

  // a failed check shows its explanations, so the next check, even untaught, is after help
  const failed = run(unit, "check_me", false);
  assert.equal(statusOf(progress(COURSE, failed.records), unit), "needs_practice");
  const second = run(unit, "check_me", true, failed.records);
  assert.ok(second.snap.phase === "result" && second.snap.result.label === LABEL_AFTER_HELP);
  assert.match(second.snap.result.scope, /not that it will last/);
});

test("RC-9 reassessment is fresh: no question or text of an earlier check returns, shown-but-unanswered counts as seen", () => {
  for (const unit of UNITS) {
    const first = run(unit, "learn", false);
    const seen1 = first.records.flatMap((r) => (r.type === "shown" && r.use === "check" ? [r.question] : []));
    assert.equal(seen1.length, 2);
    const second = run(unit, "learn", true, first.records);
    const seen2 = second.records.slice(first.records.length).flatMap((r) => (r.type === "shown" && r.use === "check" ? [r.question] : []));
    assert.equal(seen2.length, 2);
    assert.equal(new Set([...seen1, ...seen2]).size, 4, "four different questions");
    assert.equal(new Set([...seen1, ...seen2].map((id) => byId.get(id)!.passage)).size, 4, "on four different texts");
    assert.ok(second.snap.phase === "result" && second.snap.result.label === LABEL_AFTER_HELP);
    // nothing fresh is left: the unit says so instead of reusing a question
    const third = new ReadingUnitSession(COURSE, unit, "check_me", second.records);
    assert.equal(third.snapshot().phase, "no_fresh_check");
    assert.deepEqual(third.take().filter((r) => r.type === "shown"), []);
  }
  // a check question that was displayed and left unanswered is never offered again
  const unit: Unit = { skill: "sequence", level: 2 };
  const abandoned = new ReadingUnitSession(COURSE, unit, "check_me");
  const shown = abandoned.snapshot();
  assert.ok(shown.phase === "check");
  const left = abandoned.take();
  const p = progress(COURSE, left);
  assert.ok(p.seenQuestions.has(shown.question.id));
  const next = freshCheck(COURSE, unit, p.seenQuestions, p.seenPassages)!;
  assert.ok(next.every((q) => q.id !== shown.question.id && q.passage !== shown.question.passage.id));
  // and with one more abandoned, fewer than a full check is left
  const again = new ReadingUnitSession(COURSE, unit, "check_me", left);
  again.answerCheck(0);
  const p2 = progress(COURSE, [...left, ...again.take()]);
  assert.equal(p2.seenQuestions.size, 3);
  assert.equal(freshCheck(COURSE, unit, p2.seenQuestions, p2.seenPassages), null);
});

test("RC-10 a fresh check prefers texts the learner has not read for any skill", () => {
  // after a detail check at Builder (two texts read), a sequence check at Builder uses the two unread texts
  const a = run({ skill: "detail", level: 2 }, "check_me", true);
  const b = run({ skill: "sequence", level: 2 }, "check_me", true, a.records);
  const texts = (rs: ReadingRecord[]) => rs.flatMap((r) => (r.type === "shown" && r.use === "check" ? [byId.get(r.question)!.passage] : []));
  assert.equal(new Set(texts(b.records)).size, 4);
});

test("RC-11 moving between levels: up after a pass, back a level after a miss above an unpassed level", () => {
  const up = run({ skill: "detail", level: 1 }, "learn", true);
  assert.ok(up.snap.phase === "result");
  assert.deepEqual(up.snap.result.next, { kind: "level_up", unit: { skill: "detail", level: 2 } });
  const top = run({ skill: "detail", level: 5 }, "check_me", true);
  assert.ok(top.snap.phase === "result");
  assert.deepEqual(top.snap.result.next, { kind: "skill_complete" });

  const miss = run({ skill: "cause", level: 3 }, "check_me", false);
  assert.ok(miss.snap.phase === "result");
  assert.deepEqual(miss.snap.result.next, { kind: "step_back", unit: { skill: "cause", level: 2 } });
  assert.deepEqual(recommend(COURSE, progress(COURSE, miss.records)), { unit: { skill: "cause", level: 2 }, why: "step_back" });
  // with the level below passed, a miss means: practise this level again
  const below = run({ skill: "cause", level: 2 }, "check_me", true, miss.records);
  assert.deepEqual(recommend(COURSE, progress(COURSE, below.records)), { unit: { skill: "cause", level: 3 }, why: "practise_again" });
  const miss1 = run({ skill: "cause", level: 1 }, "check_me", false);
  assert.ok(miss1.snap.phase === "result");
  assert.deepEqual(miss1.snap.result.next, { kind: "practise_again" });

  // a new learner starts at Starter, and every skill is met at a level before the next level
  assert.deepEqual(recommend(COURSE, progress(COURSE, [])), { unit: { skill: "detail", level: 1 }, why: "next" });
  let records: ReadingRecord[] = [];
  const order: string[] = [];
  for (let next = recommend(COURSE, progress(COURSE, records)); next; next = recommend(COURSE, progress(COURSE, records))) {
    order.push(`${next.unit.skill}@${next.unit.level}`);
    records = run(next.unit, "learn", true, records).records;
  }
  assert.deepEqual(order, UNITS.map((u) => `${u.skill}@${u.level}`));
  assert.ok(UNITS.every((u) => passed(progress(COURSE, records), u)));
});

test("RC-12 the record is kept with the learner, survives a reload, and is never engine evidence", async () => {
  const c = loadContent({ mode: "development" });
  const repo = new MemoryRepo();
  const clock = testClock();
  const l = await Learner.create(c, repo, "Reader", "guardian", clock, "p-reading");
  const picture = () => JSON.stringify(l.profile().capabilities.map((x) => [x.standing, x.evidence]));
  const before = picture();
  const unit: Unit = { skill: "fact_opinion", level: 2 };
  const s = new ReadingUnitSession(COURSE, unit, "learn", l.readingRecords());
  learnToCheck(s);
  await l.recordReading(s.take());
  answerCheck(s, true);
  await l.recordReading(s.take());
  assert.equal(statusOf(progress(COURSE, l.readingRecords()), unit), "passed_after_help");
  const events = await repo.load("p-reading");
  for (const e of events) assert.equal(eventProblem(e), null);
  assert.ok(events.filter((e) => e.kind === "reading").length >= 8);
  assert.ok(!events.some((e) => e.kind === "evidence" || e.kind === "presented" || e.kind === "session"), "no engine evidence, no engine session");
  assert.equal(picture(), before, "no capability standing or evidence count moved");
  assert.ok(before.length > 100);
  const reopened = await Learner.open(c, repo, "p-reading", clock);
  assert.deepEqual(reopened.readingRecords(), l.readingRecords());
  assert.deepEqual([...progress(COURSE, reopened.readingRecords()).seenQuestions].sort(), [...progress(COURSE, l.readingRecords()).seenQuestions].sort());
  assert.match(String(eventProblem({ kind: "reading", id: "x", at: clock(), record: { type: "shown" } })), /without its unit/);
  // records naming a unit this build does not know are skipped, not a crash
  assert.equal(progress(COURSE, [{ type: "lesson_done", unit: { skill: "poetry", level: 9 } } as unknown as ReadingRecord]).units.size, 0);
});
