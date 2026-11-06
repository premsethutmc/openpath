/**
 * deep-recovery@0 inside a module (RESEARCH, flag-gated, default off: year/deep-recovery-flag.ts). The shipped module
 * (intervention.ts moduleState) opens the two-level `recovery` when one of its own exploratory answers is wrong (adaptive-loop block,
 * moduleStep, phase "recover"). This adapter WRAPS moduleState, so intervention.ts stays unchanged (it is edited by #115 in exactly
 * that block). With the switch on:
 *
 *   - a deep episode from one of this module's own exploratory answers (first try `diagnostic`, no deep context, a question of this
 *     competency) that is still running or paused keeps the module on "recover" with that original, whatever the shipped recovery
 *     says (it keeps asking for the original problem itself, which deep recovery never re-asks);
 *   - otherwise a shipped "recover" starts (or reads) the deep episode for its original;
 *   - a deep episode that ended solved / solved after help: the module carries on as the shipped module does after a resolved
 *     recovery, i.e. moduleState without the learner's whole evidence (that argument is read only by the adaptive-loop block, so
 *     every other decision is the module's own). The shipped "verify" question after solved_after_help is not repeated: the episode
 *     has already required a fresh unaided right answer on the original skill;
 *   - a deep episode that stopped (blocked / escalate): the module pauses with the episode's reason (no handover@1 schedule: that
 *     helper is private to intervention.ts; see research/deep-recovery/MODULE-RECOVERY.md).
 *
 * Everything is a pure function of the saved records and the time (deepScreen), so a reload resumes at the same place.
 * With the switch off, the result is moduleState's own (same call, same object).
 */
import { moduleFor, question, type Module } from "../../../packages/learning/src/content";
import { independentAttempt, rightAnswer, type SkillEvidence } from "../../../packages/learning/src/evidence";
import { moduleState, recovery, unitCheck, type Established, type ModuleState } from "../../../packages/learning/src/intervention";
import type { Attempt, LearnerRecords } from "../../../packages/learning/src/records";
import { unitOfQuestion, type SkillUnit } from "../../../packages/learning/src/skill-units";
import { DEEP_APP_OPTIONS, DEEP_TAG, deepScreen, type DeepScreen } from "./deep-recovery-app";

export const DEEP_MODULE_POLICY = "deep-recovery-module@0" as const;
const SOLVED = new Set(["solved", "solved_after_help"]);
const open = (s: DeepScreen) => s.kind !== "end" || s.phase === "pause";

/** the module's own answer: not the stuck view's problem ("original"), and no context (not a deep-recovery, `investigate:` or
 *  `recovery:` answer: a stuck problem's investigation keeps the shipped recovery and its bounds, policy C) */
const ownAnswer = (a: Attempt) => a.activity !== "original" && !a.context;
/** this module's own exploratory wrong answers that a deep episode has started from, newest first (saved records only) */
export function moduleOriginals(competency: string, records: LearnerRecords): string[] {
  const started = new Set(records.attempts.filter((a) => a.context?.startsWith(DEEP_TAG)).map((a) => a.context!.slice(DEEP_TAG.length, a.context!.indexOf("|"))));
  const out: string[] = [];
  for (const q of [...started].reverse()) {
    const first = records.attempts.find((a) => a.questionId === q);
    let comp: string | null = null;
    try { comp = question(q).competency; } catch { continue; }
    // the module's own answers (exploratory, or a check after the module's own teaching: struggle@0), never the stuck view's "original"
    if (comp === competency && first && ownAnswer(first)) out.push(q);
  }
  return out;
}

/**
 * struggle@0 (phase 7, with #115 scoped-teaching-priority@1): where #115 teaches the module's OWN scoped unit instead of recovering
 * (a wrong exploratory answer `wrong` that a unit of this module accepts, and the module's teaching after it), deep recovery starts
 * only if the learner still struggles after that teaching. "Still struggles", from the existing evidence only:
 *   the module itself has stopped on that teaching: it pauses for a person after the block's independent check (planner
 *   recommend_human, policy C) or after a pass (after-pass@1), AND the learner's latest answers alone on that unit since the teaching
 *   are wrong twice in a row (independent: first try, no hint, no shown solution, not guided; deep-recovery answers not counted).
 * One wrong alone may be a slip: then ONE fresh question of the unit, alone, is asked first (the "struggle check"). Right: a slip, no
 * prerequisite question and no lesson, the module goes on as #115 decides. Wrong: deep recovery starts from that answer.
 * after-pass@1 already asks its own one-more question, so its pause comes with two wrong answers and needs no struggle check.
 */
export function struggle(m: Module, records: LearnerRecords): { unit: SkillUnit; since: string; answers: Attempt[]; wrongRun: number } | null {
  const own = (a: Attempt) => question(a.questionId).competency === m.competency && !a.context?.startsWith(DEEP_TAG) && a.activity !== "original";
  // the module's own exploratory answer (no context: not an investigation `investigate:` or a stuck-problem `recovery:` question, whose
  // own-skill teaching is the shipped recovery's, policy C)
  const firstWrong = records.attempts.find((a) => own(a) && a.activity === "diagnostic" && !a.context && !rightAnswer(a) && unitOfQuestion(m, a.questionId));
  if (!firstWrong) return null;
  const unit = unitOfQuestion(m, firstWrong.questionId)!;
  const taught = records.teaching.find((t) => t.competency === m.competency && t.at > firstWrong.at);
  if (!taught) return null;
  const answers = records.attempts.filter((a) => own(a) && a.at > taught.at && independentAttempt(a) && a.activity !== "guided" && unit.accepts(a.questionId));
  let wrongRun = 0;
  for (let i = answers.length - 1; i >= 0 && !rightAnswer(answers[i]); i--) wrongRun++;
  return { unit, since: taught.at, answers, wrongRun };
}
const stoppedOnOwnTeaching = (ms: ModuleState) => ms.phase === "pause" && (ms.decision?.action === "recommend_human" || !!ms.why?.startsWith("after-pass@1"));

export function deepModuleState(on: boolean, competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null, evidence?: (id: string) => SkillEvidence): ModuleState {
  const ms = moduleState(competency, records, ev, now, session, established, evidence);
  if (!on || !evidence || established) return ms;
  const recover = (original: string, s: DeepScreen): ModuleState => ({ ...ms, phase: "recover", question: null, strategy: null, original, reason: s.reason, why: DEEP_MODULE_POLICY });
  const originals = moduleOriginals(competency, records);
  for (const q of originals) { const s = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS); if (open(s)) return recover(q, s); }
  // the original the shipped module would recover from, or one whose ended episode the shipped recovery still escalates
  const firstOf = (x: string) => records.attempts.find((a) => a.questionId === x);
  let q: string | null = ms.phase === "recover" && ms.original && firstOf(ms.original) && ownAnswer(firstOf(ms.original)!) ? ms.original : null;
  if (ms.phase === "recover" && !q) return ms;
  if (!q && ms.phase === "pause") q = originals.find((x) => { const r = recovery(x, records, evidence, now, session); return r.phase === "escalate"; }) ?? null;
  // struggle@0: after the module's own (scoped) teaching, stopped, still wrong
  const m = moduleFor(competency);
  if (!q && m && stoppedOnOwnTeaching(ms)) {
    const st = struggle(m, records);
    if (st && st.wrongRun === 1) {
      const qid = unitCheck(m, st.unit, records);
      if (qid) return { ...ms, phase: "check", question: qid, strategy: null, activity: "check", why: `${DEEP_MODULE_POLICY}: struggle-check`, reason: "One more of this kind on your own, with no hints, to see whether that was a slip." };
    }
    if (st && st.wrongRun >= 2) q = st.answers.at(-1)!.questionId;
    // the struggle check was right: most likely a slip. No prerequisite question, no lesson; #115's own decision (a person, policy C)
    // stands with its way back, and its reason is made true
    if (st && st.wrongRun === 0 && st.answers.length >= 2 && !rightAnswer(st.answers.at(-2)!))
      return { ...ms, why: `${DEEP_MODULE_POLICY}: slip; module stop kept (policy C)`, reason: "The next one of this kind was right on your own, so the wrong answer before it was most likely a slip. No question on the skills below it was needed. This skill's own lesson has been used once already, so the next step is a teacher or parent; it opens again later." };
  }
  if (!q) return ms;
  const s = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS);
  if (open(s)) return recover(q, s);
  if (s.kind === "end" && SOLVED.has(s.phase)) {
    const next = moduleState(competency, records, ev, now, session, established, undefined);
    // struggle@0: the episode ended solved, but the module still stands on its own teaching's stop (policy C: one own teaching cycle,
    // then a person; #115 keeps it). That decision and its way back (handover@1) are kept; only the reason is made true: what was
    // missing has been worked on and the fresh problems were right. (Where the shared record then shows the skill, the module moves
    // on by itself: addition-regroup, triangle-properties.)
    if (stoppedOnOwnTeaching(next) && s.kind === "end") {
      const cause = s.state.cause ? `${s.state.cause.split(".").pop()!.replace(/-/g, " ")}` : "what this builds on";
      return { ...next, why: `${DEEP_MODULE_POLICY}: solved; module stop kept (policy C)`, reason: `What was missing (${cause}) has been worked on, and fresh problems of this kind were right after it. This skill's own explanations were tried before that, so go through it with a teacher or parent; it opens again later.` };
    }
    return next;
  }
  return { ...ms, phase: "pause", question: null, strategy: null, original: undefined, reason: s.kind === "end" ? s.reason : ms.reason, why: `${DEEP_MODULE_POLICY}: ${s.kind === "end" ? s.phase : "stopped"}` };
}
