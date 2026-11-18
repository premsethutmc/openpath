/**
 * One reading unit (a skill at a level), and the learner's progress across units.
 *
 *   lesson    the strategy, and a worked example on the teaching text, one step at a time
 *   practice  two questions on practice texts: feedback at once, a ladder of hints, another try after a wrong answer
 *   check     two questions the learner has never been shown, on texts never used for teaching: no hints, and
 *             nothing is marked until both are answered
 *
 * Everything is rebuilt from the recorded list (ReadingRecord[]), so a reload or another device gives the same
 * progress. A check question counts as seen from the moment it is displayed, answered or not.
 *
 * What a pass is called follows the evidence policy: "Shown on your own" only when the learner asked to be checked
 * and had no teaching, practice or hint in this unit; otherwise "Solved independently after help". Neither is a
 * mastery claim, and nothing here changes a capability estimate.
 */
import { CHECK_SIZE, LEVELS, SKILL_IDS, lessonFor, questionsFor, unitKey, type Course, type Lesson, type Level, type Passage, type Question, type SkillId, type Unit } from "./course.ts";

export type Mode = "learn" | "check_me";
export const LABEL_OWN = "Shown on your own";
export const LABEL_AFTER_HELP = "Solved independently after help";
export type EvidenceLabel = typeof LABEL_OWN | typeof LABEL_AFTER_HELP;
export const SCOPE = "Two new questions, answered once. It shows what you could do today, not that it will last.";

export type ReadingRecord =
  | { type: "unit_start"; unit: Unit; mode: Mode }
  | { type: "lesson_done"; unit: Unit }
  /** Written before the question is displayed. */
  | { type: "shown"; unit: Unit; question: string; use: "practice" | "check" }
  | { type: "hint"; unit: Unit; question: string; rung: number }
  | { type: "practice_answer"; unit: Unit; question: string; choice: number; correct: boolean; hints: number }
  | { type: "check_result"; unit: Unit; answers: { question: string; choice: number; correct: boolean }[]; passed: boolean; label: EvidenceLabel | null };

export type UnitStatus = "new" | "learning" | "passed_own" | "passed_after_help" | "needs_practice" | "no_fresh_check";
export interface UnitProgress {
  status: UnitStatus;
  /** Checks finished (passed or not). */
  checks: number;
  /** Any teaching, practice, hint or marked check in this unit so far. */
  helped: boolean;
}
export interface Progress {
  units: Map<string, UnitProgress>;
  seenQuestions: Set<string>;
  seenPassages: Set<string>;
}

const known = (u: Unit | undefined): u is Unit => !!u && SKILL_IDS.includes(u.skill) && LEVELS.includes(u.level);

/**
 * The questions of the next fresh check for a unit, or null when fewer than a full check is left unseen.
 * Each question is on a different text; texts the learner has not read at all are used first.
 */
export function freshCheck(course: Course, unit: Unit, seenQuestions: ReadonlySet<string>, seenPassages: ReadonlySet<string>): Question[] | null {
  const pool = questionsFor(course, unit, "check").filter((q) => !seenQuestions.has(q.id));
  const ordered = [...pool.filter((q) => !seenPassages.has(q.passage)), ...pool.filter((q) => seenPassages.has(q.passage))];
  const picked: Question[] = [];
  for (const q of ordered) if (picked.length < CHECK_SIZE && !picked.some((p) => p.passage === q.passage)) picked.push(q);
  return picked.length === CHECK_SIZE ? picked : null;
}

export function progress(course: Course, records: readonly ReadingRecord[]): Progress {
  const units = new Map<string, UnitProgress>();
  const seenQuestions = new Set<string>();
  const seenPassages = new Set<string>();
  const byId = new Map(course.questions.map((q) => [q.id, q]));
  const last = new Map<string, boolean>();
  for (const r of records) {
    if (!known(r.unit)) continue;
    const key = unitKey(r.unit);
    const u = units.get(key) ?? { status: "learning" as UnitStatus, checks: 0, helped: false };
    units.set(key, u);
    if (r.type === "shown") {
      const q = byId.get(r.question);
      if (q) (seenQuestions.add(q.id), seenPassages.add(q.passage));
    }
    if (r.type === "lesson_done" || r.type === "hint" || r.type === "practice_answer") u.helped = true;
    if (r.type === "lesson_done") seenPassages.add(lessonFor(course, r.unit).worked.passage);
    if (r.type === "check_result") {
      u.checks++;
      u.status = r.passed ? (r.label === LABEL_OWN ? "passed_own" : "passed_after_help") : "needs_practice";
      last.set(key, r.passed);
      // a marked check shows the explanations: from here on the learner has had help in this unit
      u.helped = true;
    }
  }
  for (const [key, u] of units)
    if (last.get(key) === false) {
      const [skill, level] = key.split("@");
      if (!freshCheck(course, { skill: skill as SkillId, level: Number(level) as Level }, seenQuestions, seenPassages)) u.status = "no_fresh_check";
    }
  return { units, seenQuestions, seenPassages };
}

export const statusOf = (p: Progress, u: Unit): UnitStatus => p.units.get(unitKey(u))?.status ?? "new";
export const passed = (p: Progress, u: Unit) => ["passed_own", "passed_after_help"].includes(statusOf(p, u));

/**
 * What to do next, by rule:
 *   1. a level above Starter that was checked and not passed, while the level below is not passed: step back to it;
 *   2. a unit whose check was not passed and which still has a fresh check: practise it again;
 *   3. otherwise the lowest level not yet passed, taking the skills in turn (every skill at Starter before Builder);
 *      with a start level from the level check, that level and those above come first.
 * Null when every unit is passed.
 */
export function recommend(course: Course, p: Progress, start: Level = 1): { unit: Unit; why: "step_back" | "practise_again" | "next" } | null {
  const all = LEVELS.flatMap((level) => course.skills.map((s) => ({ skill: s.id, level })));
  for (const u of all) {
    const st = statusOf(p, u);
    if ((st === "needs_practice" || st === "no_fresh_check") && u.level > 1) {
      const below = { skill: u.skill, level: (u.level - 1) as Level };
      if (!passed(p, below) && statusOf(p, below) !== "no_fresh_check") return { unit: below, why: "step_back" };
    }
  }
  const again = all.find((u) => statusOf(p, u) === "needs_practice");
  if (again) return { unit: again, why: "practise_again" };
  // a start level (from the level check) puts that level and those above it first; the levels below stay open
  const from = [...all.filter((u) => u.level >= start), ...all.filter((u) => u.level < start)];
  const next = from.find((u) => !passed(p, u) && statusOf(p, u) !== "no_fresh_check");
  return next ? { unit: next, why: "next" } : null;
}

/** A question as the learner may see it before answering: no answer, no explanation, no evidence. */
export interface ShownQuestion {
  id: string;
  prompt: string;
  options: string[];
  passage: Passage;
}
const show = (course: Course, q: Question): ShownQuestion => ({ id: q.id, prompt: q.prompt, options: [...q.options], passage: course.passages.get(q.passage)! });

export const HINT_RUNGS = 3;
export interface PracticeView {
  index: number;
  total: number;
  question: ShownQuestion;
  /** Hints shown so far, mildest first: the strategy, then a nudge for this question. */
  hints: string[];
  /** Third rung: the part of the text to read again. */
  highlight: string | null;
  /** Options already tried and found wrong. */
  wrong: number[];
  solved: boolean;
  /** The right answer was shown after two wrong tries. */
  revealed: boolean;
  /** After solving or revealing: the right option and why. */
  answer: { index: number; explain: string } | null;
  canHint: boolean;
}
export interface CheckReview {
  question: ShownQuestion;
  choice: number;
  right: number;
  correct: boolean;
  explain: string;
  evidence: string;
}
export interface ResultView {
  passed: boolean;
  label: EvidenceLabel | null;
  scope: string;
  review: CheckReview[];
  next: { kind: "level_up"; unit: Unit } | { kind: "skill_complete" } | { kind: "practise_again" } | { kind: "step_back"; unit: Unit } | { kind: "no_fresh_check" };
}
export type Snapshot =
  | { phase: "lesson"; unit: Unit; lesson: Lesson; passage: Passage; steps: number }
  | { phase: "practice"; unit: Unit; lesson: Lesson; practice: PracticeView }
  | { phase: "check"; unit: Unit; position: number; total: number; question: ShownQuestion }
  | { phase: "result"; unit: Unit; result: ResultView }
  | { phase: "no_fresh_check"; unit: Unit };

/**
 * The controller of one visit to a unit. Every state change appends records; the caller stores what `take()`
 * returns. Abandoning a visit keeps what was recorded: a check question that was displayed stays seen.
 */
export class ReadingUnitSession {
  /** Every record of this visit, in order; `taken` of them have been handed to the caller. */
  private log: ReadingRecord[] = [];
  private taken = 0;
  private readonly course: Course;
  readonly unit: Unit;
  readonly mode: Mode;
  private readonly history: readonly ReadingRecord[];
  private phase: Snapshot["phase"];
  private readonly lesson: Lesson;
  private readonly practiceQs: Question[];
  private steps = 1;
  private pIndex = 0;
  private pHints = 0;
  private pWrong: number[] = [];
  private pSolved = false;
  private pRevealed = false;
  private checkQs: Question[] = [];
  private cIndex = 0;
  private cAnswers: number[] = [];
  private helped: boolean;
  private result: ResultView | null = null;

  constructor(course: Course, unit: Unit, mode: Mode, history: readonly ReadingRecord[] = []) {
    if (!known(unit)) throw new Error("Unknown reading unit.");
    this.course = course;
    this.unit = unit;
    this.mode = mode;
    this.history = history;
    this.lesson = lessonFor(course, unit);
    this.practiceQs = questionsFor(course, unit, "practice");
    this.helped = progress(course, history).units.get(unitKey(unit))?.helped ?? false;
    this.log.push({ type: "unit_start", unit, mode });
    this.phase = "lesson";
    if (mode === "check_me") this.startCheck();
  }

  /** Records made since the last call, to be stored in order. */
  take(): ReadingRecord[] {
    const out = this.log.slice(this.taken);
    this.taken = this.log.length;
    return out;
  }
  private all(): ReadingRecord[] {
    return [...this.history, ...this.log];
  }

  snapshot(): Snapshot {
    const unit = this.unit;
    if (this.phase === "lesson") return { phase: "lesson", unit, lesson: structuredClone(this.lesson), passage: this.course.passages.get(this.lesson.worked.passage)!, steps: this.steps };
    if (this.phase === "practice") {
      const q = this.practiceQs[this.pIndex];
      const done = this.pSolved || this.pRevealed;
      return {
        phase: "practice",
        unit,
        lesson: structuredClone(this.lesson),
        practice: {
          index: this.pIndex,
          total: this.practiceQs.length,
          question: show(this.course, q),
          hints: [this.lesson.tip, q.hint!].slice(0, Math.min(this.pHints, 2)),
          highlight: this.pHints >= HINT_RUNGS || done ? q.evidence : null,
          wrong: [...this.pWrong],
          solved: this.pSolved,
          revealed: this.pRevealed,
          answer: done ? { index: q.answer, explain: q.explain } : null,
          canHint: !done && this.pHints < HINT_RUNGS,
        },
      };
    }
    if (this.phase === "check") return { phase: "check", unit, position: this.cIndex, total: this.checkQs.length, question: show(this.course, this.checkQs[this.cIndex]) };
    if (this.phase === "result") return { phase: "result", unit, result: structuredClone(this.result!) };
    return { phase: "no_fresh_check", unit };
  }

  /** Lesson: show the next step of the worked example. */
  nextStep(): void {
    if (this.phase === "lesson" && this.steps < this.lesson.worked.steps.length) this.steps++;
  }
  /** Lesson: on to guided practice, once every step of the worked example has been shown. */
  startPractice(): void {
    if (this.phase !== "lesson" || this.steps < this.lesson.worked.steps.length) return;
    this.log.push({ type: "lesson_done", unit: this.unit });
    this.helped = true;
    this.phase = "practice";
    this.openPractice(0);
  }
  private openPractice(i: number) {
    this.pIndex = i;
    this.pHints = 0;
    this.pWrong = [];
    this.pSolved = false;
    this.pRevealed = false;
    this.log.push({ type: "shown", unit: this.unit, question: this.practiceQs[i].id, use: "practice" });
  }
  /** Practice: one more rung of help (the strategy, a nudge for this question, then the part of the text to reread). */
  hint(): void {
    if (this.phase !== "practice" || this.pSolved || this.pRevealed || this.pHints >= HINT_RUNGS) return;
    this.pHints++;
    this.log.push({ type: "hint", unit: this.unit, question: this.practiceQs[this.pIndex].id, rung: this.pHints });
  }
  /** Practice: an answer. A wrong one is crossed out and brings the next hint; after two wrong tries the answer is explained. */
  answerPractice(choice: number): void {
    if (this.phase !== "practice" || this.pSolved || this.pRevealed) return;
    const q = this.practiceQs[this.pIndex];
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length || this.pWrong.includes(choice)) return;
    const correct = choice === q.answer;
    this.log.push({ type: "practice_answer", unit: this.unit, question: q.id, choice, correct, hints: this.pHints });
    if (correct) this.pSolved = true;
    else {
      this.pWrong.push(choice);
      if (this.pWrong.length >= 2) this.pRevealed = true;
      else this.hint();
    }
  }
  /** Practice: the next practice question, or the fresh check after the last one. */
  nextPractice(): void {
    if (this.phase !== "practice" || !(this.pSolved || this.pRevealed)) return;
    if (this.pIndex + 1 < this.practiceQs.length) this.openPractice(this.pIndex + 1);
    else this.startCheck();
  }

  private startCheck() {
    const p = progress(this.course, this.all());
    const qs = freshCheck(this.course, this.unit, p.seenQuestions, p.seenPassages);
    if (!qs) {
      this.phase = "no_fresh_check";
      return;
    }
    this.checkQs = qs;
    this.cIndex = 0;
    this.cAnswers = [];
    this.phase = "check";
    this.log.push({ type: "shown", unit: this.unit, question: qs[0].id, use: "check" });
  }
  /** Check: an answer. Nothing is marked or explained until the last question is answered. */
  answerCheck(choice: number): void {
    if (this.phase !== "check") return;
    const q = this.checkQs[this.cIndex];
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return;
    this.cAnswers.push(choice);
    if (this.cIndex + 1 < this.checkQs.length) {
      this.cIndex++;
      this.log.push({ type: "shown", unit: this.unit, question: this.checkQs[this.cIndex].id, use: "check" });
      return;
    }
    const answers = this.checkQs.map((c, i) => ({ question: c.id, choice: this.cAnswers[i], correct: this.cAnswers[i] === c.answer }));
    const ok = answers.every((a) => a.correct);
    const label: EvidenceLabel | null = ok ? (this.mode === "check_me" && !this.helped ? LABEL_OWN : LABEL_AFTER_HELP) : null;
    this.log.push({ type: "check_result", unit: this.unit, answers, passed: ok, label });
    const after = progress(this.course, this.all());
    const up = { skill: this.unit.skill, level: (this.unit.level + 1) as Level };
    const below = { skill: this.unit.skill, level: (this.unit.level - 1) as Level };
    let next: ResultView["next"];
    if (ok) next = LEVELS.includes(up.level) ? { kind: "level_up", unit: up } : { kind: "skill_complete" };
    else if (this.unit.level > 1 && !passed(after, below) && statusOf(after, below) !== "no_fresh_check") next = { kind: "step_back", unit: below };
    else next = statusOf(after, this.unit) === "no_fresh_check" ? { kind: "no_fresh_check" } : { kind: "practise_again" };
    this.result = {
      passed: ok,
      label,
      scope: SCOPE,
      review: this.checkQs.map((c, i) => ({ question: show(this.course, c), choice: this.cAnswers[i], right: c.answer, correct: this.cAnswers[i] === c.answer, explain: c.explain, evidence: c.evidence })),
      next,
    };
    this.phase = "result";
  }
}
