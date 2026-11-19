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

import {assessSentences,supportingSets,validateSentenceSelection,type SentenceFinding} from './check-evidence.ts';
export interface CheckCheckpoint {version:1;questions:string[];signatures:string[];mode:Mode;helped:boolean;index:number;answers:{choice:number;sentences?:number[]}[];draft:{choice:number|null;sentences:number[];locked:boolean};exposures:number[];familiar:boolean[];}
const questionSignature=(course:Course,q:Question)=>JSON.stringify([q.prompt,q.options,q.answer,q.evidence,q.evidenceAlternatives,course.passages.get(q.passage)!.text]);
const exposureCount=(course:Course,records:readonly ReadingRecord[],passage:string)=>records.filter(r=>r.type==='shown'&&course.questions.find(q=>q.id===r.question)?.passage===passage).length;
export function pendingCheck(records:readonly ReadingRecord[],unit:Unit):CheckCheckpoint|null {
 for(let i=records.length-1;i>=0;i--){const r=records[i];if(unitKey(r.unit)!==unitKey(unit))continue;if(r.type==='check_result'||r.type==='check_closed')return null;if(r.type==='check_session')return r.check??({} as CheckCheckpoint);}
 return null;
}
export type Mode = "learn" | "check_me";
export const LABEL_OWN = "Shown on your own";
export const LABEL_AFTER_HELP = "Solved independently after help";
export type EvidenceLabel = typeof LABEL_OWN | typeof LABEL_AFTER_HELP;
export const SCOPE = "Two new questions, answered once. It shows what you could do today, not that it will last.";

export type ReadingRecord =
  | { type: "check_closed"; unit: Unit; reason: "interrupted" }
  | { type: "check_session"; unit: Unit; check: CheckCheckpoint }
  | { type: "unit_start"; unit: Unit; mode: Mode }
  | { type: "lesson_done"; unit: Unit }
  /** Written before the question is displayed. */
  | { type: "shown"; unit: Unit; question: string; use: "practice" | "check" }
  | { type: "hint"; unit: Unit; question: string; rung: number }
  | { type: "practice_clues"; unit: Unit; question: string; sentences: number[]; finding: SentenceFinding }
  | { type: "practice_answer"; unit: Unit; question: string; choice: number; correct: boolean; hints: number }
  | { type: "check_result"; unit: Unit; answers: { question: string; choice: number; correct: boolean; sentences?: number[]; evidenceFinding?: SentenceFinding }[]; passed: boolean; label: EvidenceLabel | null };

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
  clues?: { selected:number[]; finding:SentenceFinding|null; sets:number[][]|null };
}
export interface CheckReview {
  question: ShownQuestion;
  choice: number;
  right: number;
  correct: boolean;
  explain: string;
  evidence: string;
  sentences?: number[];
  evidenceFinding?: SentenceFinding;
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
  | { phase: "check"; unit: Unit; position: number; total: number; question: ShownQuestion; draft: CheckCheckpoint["draft"]; familiar: boolean }
  | { phase: "result"; unit: Unit; result: ResultView }
  | { phase: "no_fresh_check"; unit: Unit }
  | { phase: "interrupted"; unit: Unit; reason: string };

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
  private pClues:number[]=[];
  private pClueFinding:SentenceFinding|null=null;
  private checkQs: Question[] = [];
  private cIndex = 0;
  private cAnswers: number[] = [];
  private cEvidence: (number[]|undefined)[] = [];
  private draft:CheckCheckpoint['draft']={choice:null,sentences:[],locked:false};
  private exposures:number[]=[];
  private familiar:boolean[]=[];
  private interruption='';
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
    this.phase = "lesson";
    const saved=pendingCheck(history,unit);
    if(saved){
      try{
        if(saved.version!==1||typeof saved.helped!=='boolean'||saved.familiar.some(v=>typeof v!=='boolean')||saved.exposures.some(v=>!Number.isInteger(v)||v<0)||saved.questions.length!==CHECK_SIZE||new Set(saved.questions).size!==CHECK_SIZE||!Number.isInteger(saved.index)||saved.index<0||saved.index>=CHECK_SIZE||saved.answers.length!==saved.index||saved.exposures.length!==CHECK_SIZE||saved.familiar.length!==CHECK_SIZE||!['learn','check_me'].includes(saved.mode))throw Error('Invalid saved check');
        this.checkQs=saved.questions.map((id,i)=>{const q=course.questions.find(q=>q.id===id&&q.role==='check'&&q.skill===unit.skill&&q.level===unit.level);if(!q||saved.signatures[i]!==questionSignature(course,q))throw Error('Check content changed');return q;});
        saved.answers.forEach((a,i)=>{if(!Number.isInteger(a.choice)||a.choice<0||a.choice>=this.checkQs[i].options.length)throw Error('Invalid saved answer');if(a.sentences)validateSentenceSelection(course,this.checkQs[i],a.sentences);});
        const q=this.checkQs[saved.index],d=saved.draft;
        if(!d||typeof d.locked!=='boolean'||(d.locked&&d.choice===null)|| (d.choice!==null&&(!Number.isInteger(d.choice)||d.choice<0||d.choice>=q.options.length)))throw Error('Invalid saved draft');
        validateSentenceSelection(course,q,d.sentences,true);
        this.mode=saved.mode;this.helped=saved.helped||this.helped;this.cIndex=saved.index;this.cAnswers=saved.answers.map(a=>a.choice);this.cEvidence=saved.answers.map(a=>a.sentences);this.draft=structuredClone(d);this.exposures=[...saved.exposures];this.familiar=[...saved.familiar];
        for(let i=saved.index;i<CHECK_SIZE;i++)if(exposureCount(course,history,this.checkQs[i].passage)!==this.exposures[i])throw Error('A pending passage was opened elsewhere');
        this.phase='check';return;
      }catch{this.phase='interrupted';this.interruption='This saved check cannot safely continue: its text changed, its saved data is unreadable, or a pending passage was opened elsewhere. Your previous answers are kept and no fresh score is recorded.';return;}
    }
    this.log.push({ type: "unit_start", unit, mode });
    if (mode === "check_me") this.startCheck();
  }

  /** Explicitly archive an unsafe attempt, without deleting drafts/exposure or awarding a score. */
  closeInterruptedCheck() {
    if(this.phase!=="interrupted")return;
    this.log.push({type:"check_closed",unit:this.unit,reason:"interrupted"});
    this.phase="lesson";
    this.log.push({type:"unit_start",unit:this.unit,mode:"learn"});
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
          ...(q.skill=== "inference" && done ? {clues:{selected:[...this.pClues],finding:this.pClueFinding,sets:this.pClueFinding?supportingSets(this.course,q):null}}:{}),
        },
      };
    }
    if (this.phase === "check") return { phase: "check", unit, position: this.cIndex, total: this.checkQs.length, question: show(this.course, this.checkQs[this.cIndex]), draft:structuredClone(this.draft),familiar:this.familiar[this.cIndex] };
    if(this.phase==='interrupted')return {phase:'interrupted',unit,reason:this.interruption};
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
    this.pRevealed = false;this.pClues=[];this.pClueFinding=null;
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
  selectPracticeClues(sentences:number[]):void {
    if(this.phase!=="practice"||this.unit.skill!=="inference"||!(this.pSolved||this.pRevealed)||this.pClueFinding)return;
    validateSentenceSelection(this.course,this.practiceQs[this.pIndex],sentences,true);this.pClues=[...sentences];
  }
  checkPracticeClues():void {
    if(this.phase!=="practice"||this.unit.skill!=="inference"||!(this.pSolved||this.pRevealed)||this.pClueFinding||!this.pClues.length)return;
    const q=this.practiceQs[this.pIndex];this.pClueFinding=assessSentences(this.course,q,this.pClues);
    this.log.push({type:"practice_clues",unit:this.unit,question:q.id,sentences:[...this.pClues],finding:this.pClueFinding});
  }
  /** Practice: the next practice question, or the fresh check after the last one. */
  nextPractice(): void {
    if (this.phase !== "practice" || !(this.pSolved || this.pRevealed)) return;
    if(this.unit.skill==="inference"&&!this.pClueFinding)return;
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
    this.cAnswers = [];this.cEvidence=[];this.draft={choice:null,sentences:[],locked:false};
    this.familiar=qs.map(q=>p.seenPassages.has(q.passage));
    this.exposures=qs.map(q=>exposureCount(this.course,this.all(),q.passage));this.exposures[0]++;
    this.phase = "check";
    this.log.push({ type: "shown", unit: this.unit, question: qs[0].id, use: "check" });
    this.checkpoint();
  }
  /** Check: an answer. Nothing is marked or explained until the last question is answered. */
  /** Legacy answer-only callers remain unassessed for evidence; browser uses the staged methods below. */
  answerCheck(choice: number,sentences?:number[]): void {
    if (this.phase !== "check") return;
    const q = this.checkQs[this.cIndex];
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return;
    if(sentences)validateSentenceSelection(this.course,q,sentences);
    this.cAnswers.push(choice);this.cEvidence.push(sentences?[...sentences]:undefined);
    if (this.cIndex + 1 < this.checkQs.length) {
      this.cIndex++;this.draft={choice:null,sentences:[],locked:false};this.exposures[this.cIndex]++;
      this.log.push({ type: "shown", unit: this.unit, question: this.checkQs[this.cIndex].id, use: "check" });
      this.checkpoint();return;
    }
    const answers = this.checkQs.map((c, i) => ({ question: c.id, choice: this.cAnswers[i], correct: this.cAnswers[i] === c.answer, ...(this.cEvidence[i]?{sentences:this.cEvidence[i],evidenceFinding:assessSentences(this.course,c,this.cEvidence[i]!)}:{}) }));
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
      review: this.checkQs.map((c, i) => ({ question: show(this.course, c), choice: this.cAnswers[i], right: c.answer, correct: this.cAnswers[i] === c.answer, explain: c.explain, evidence: c.evidence,...(this.cEvidence[i]?{sentences:this.cEvidence[i],evidenceFinding:assessSentences(this.course,c,this.cEvidence[i]!)}:{}) })),
      next,
    };
    this.phase = "result";
  }
  private checkpoint(){this.log.push({type:'check_session',unit:this.unit,check:{version:1,questions:this.checkQs.map(q=>q.id),signatures:this.checkQs.map(q=>questionSignature(this.course,q)),mode:this.mode,helped:this.helped,index:this.cIndex,answers:this.cAnswers.map((choice,i)=>({choice,...(this.cEvidence[i]?{sentences:this.cEvidence[i]}:{})})),draft:structuredClone(this.draft),exposures:[...this.exposures],familiar:[...this.familiar]}});}
  selectCheckAnswer(choice:number){if(this.phase!=='check'||this.draft.locked)return;const q=this.checkQs[this.cIndex];if(!Number.isInteger(choice)||choice<0||choice>=q.options.length)return;this.draft.choice=choice;this.checkpoint();}
  lockCheckAnswer(){if(this.phase!=='check'||this.draft.choice===null||this.draft.locked)return;this.draft.locked=true;this.checkpoint();}
  selectCheckEvidence(sentences:number[]){if(this.phase!=='check'||!this.draft.locked)return;validateSentenceSelection(this.course,this.checkQs[this.cIndex],sentences,true);this.draft.sentences=[...sentences];this.checkpoint();}
  submitCheckEvidence(){if(this.phase!=='check'||!this.draft.locked||this.draft.choice===null||!this.draft.sentences.length)return;this.answerCheck(this.draft.choice,this.draft.sentences);}

}
