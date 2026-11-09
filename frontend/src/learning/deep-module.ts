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
import { moduleState, questionForRequirement, recovery, unitCheck, type Established, type ModuleState } from "../../../packages/learning/src/intervention";
import type { Attempt, LearnerRecords } from "../../../packages/learning/src/records";
import { presentedProblems, unitOfQuestion, type SkillUnit } from "../../../packages/learning/src/skill-units";
import { problemKeyOf } from "../../../packages/learning/src/families";
import { hypothesesFor } from "../../../packages/learning/src/hypotheses";
import { keyboardOffered } from "../../../packages/learning/src/written";
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

/**
 * repaired-gap@0: the module's own-teaching stop is SOLELY attributable to the gap a deep episode repaired when, from the records:
 *   - the stop is #115's own-teaching stop (planner recommend_human = policy C, or after-pass@1), not any other pause kind;
 *   - the episode ended solved / solved after help with diagnosis "prerequisite" and a named cause (a lesson on a skill below that was
 *     then re-checked right, and fresh unaided goal answers right after it);
 *   - no misconception is established, or open and due for teaching, in this competency (that would be a reason of its own);
 *   - the episode is the one started from this module's own struggle (its original is a wrong answer on the unit after the module's
 *     own teaching). Answers after the episode are judged by the after-repair rule, not here.
 */
export function repairedGapOnly(competency: string, records: LearnerRecords, stop: ModuleState, ep: { diagnosis: string | null; cause: string | null; original: string }): boolean {
  if (!stoppedOnOwnTeaching(stop) || ep.diagnosis !== "prerequisite" || !ep.cause) return false;
  if (hypothesesFor(competency, records).some((h) => h.status === "established" || (h as { teachingDue?: boolean }).teachingDue)) return false;
  const m = moduleFor(competency);
  const st = m ? struggle(m, records) : null;
  return !!st && st.answers.some((a) => a.questionId === ep.original);
}

export function deepModuleState(on: boolean, competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null, evidence?: (id: string) => SkillEvidence): ModuleState {
  const ms = moduleState(competency, records, ev, now, session, established, evidence);
  if (!on || !evidence || established || ms.phase === "reentry") return ms;
  const reentry = records.attempts.filter(a => a.context === `reentry:${competency}`).at(-1);
  if (reentry) {
    const old = (q: string) => (records.attempts.find(a => a.questionId === q)?.at ?? "") < reentry.at;
    if (ms.original && old(ms.original)) return moduleState(competency, records, ev, now, session, established);
  }
  const recover = (original: string, s: DeepScreen): ModuleState => ({ ...ms, phase: "recover", question: null, strategy: null, original, reason: s.reason, why: DEEP_MODULE_POLICY });
  const originals = moduleOriginals(competency, records).filter(q => !reentry || (records.attempts.find(a => a.questionId === q)?.at ?? "") > reentry.at);
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
    // an episode already began from this unit's struggle (ended: open ones were taken above): its outcome decides (repaired-gap@0
    // below); a later wrong answer never starts a second descent
    const began = st ? originals.find((x) => st.answers.some((a) => a.questionId === x)) : undefined;
    if (began) q = began;
    else if (st && st.wrongRun === 1) {
      const qid = unitCheck(m, st.unit, records);
      if (qid) return { ...ms, phase: "check", question: qid, strategy: null, activity: "check", why: `${DEEP_MODULE_POLICY}: struggle-check`, reason: "One more of this kind on your own, with no hints, to see whether that was a slip." };
    }
    if (!began && st && st.wrongRun >= 2) q = st.answers.at(-1)!.questionId;
    // the struggle check was right: most likely a slip. No prerequisite question, no lesson; #115's own decision (a person, policy C)
    // stands with its way back, and its reason is made true
    if (!began && st && st.wrongRun === 0 && st.answers.length >= 2 && !rightAnswer(st.answers.at(-2)!))
      return { ...ms, why: `${DEEP_MODULE_POLICY}: slip; module stop kept (policy C)`, reason: "The next one of this kind was right on your own, so the wrong answer before it was most likely a slip. No question on the skills below it was needed. This skill's own lesson has been used once already, so the next step is a teacher or parent; it opens again later." };
  }
  if (!q) return ms;
  const s = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS);
  if (open(s)) return recover(q, s);
  if (s.kind === "end" && SOLVED.has(s.phase)) {
    const next = moduleState(competency, records, ev, now, session, established, undefined);
    // repaired-gap@0 (phase 8, owner's decision): a repaired prerequisite alone does not lift the module's own stop (policy C /
    // after-pass@1). When that stop is SOLELY attributable to the gap the episode repaired (repairedGapOnly), the learner gets ONE
    // fresh question of the unit on their own (never presented: problemKeyOf over answers, unresolved, pending and teaching screens).
    //   right: the module carries on with fresh questions of its own until #115's own decision takes over (the skill shown), or the
    //          questions run out (done for now); a wrong one on the way brings the stop back. The episode and its solved-after-help
    //          outcome stay in the records; the state says `recovered`.
    //   wrong: #115's stop is kept, with its way back (handover@1). No second descent: the gap below was repaired and re-checked, so
    //          what is left is this skill itself, whose own explanations were already tried (policy C: a person).
    // Any other or additional reason for the stop: #115's stop is kept unchanged.
    if (stoppedOnOwnTeaching(next) && s.kind === "end" && m) {
      const cause = s.state.cause ? `${s.state.cause.split(".").pop()!.replace(/-/g, " ")}` : "what this builds on";
      const st = struggle(m, records);
      const endAt = records.attempts.filter((a) => a.context?.startsWith(`${DEEP_TAG}${q}|`)).at(-1)?.at ?? "";
      const after = records.attempts.filter((a) => a.at > endAt && question(a.questionId).competency === competency && ownAnswer(a) && independentAttempt(a));
      if (!st || !repairedGapOnly(competency, records, next, s.state)) return next;
      const keep = (why: string, reason: string): ModuleState => ({ ...next, why: `${DEEP_MODULE_POLICY}: ${why}`, reason });
      if (!after.length) {
        const qid = unitCheck(m, st.unit, records);
        if (!qid) return keep("repaired gap; no fresh question; module stop kept (policy C)", `What was missing (${cause}) has been worked on, but there is no new question of this kind left to try on your own. Go through it with a teacher or parent; it opens again later.`);
        return { ...next, phase: "check", question: qid, strategy: null, activity: "check", why: `${DEEP_MODULE_POLICY}: after-repair check`, reason: `What was missing (${cause}) has been worked on. Now a new one of this kind on your own, with no hints.` };
      }
      if (!rightAnswer(after[0])) return keep("after-repair check wrong; module stop kept (policy C)", `What was missing (${cause}) was worked on, but the new one of this kind did not come out on your own. That is not a failure: go through this skill with a teacher or parent; it opens again later.`);
      if (after.some((a) => !rightAnswer(a))) return keep("recovered, then wrong; module stop kept (policy C)", "Right on your own after the work on what it builds on, but not since. Go through this skill with a teacher or parent; it opens again later.");
      const presented = presentedProblems(records, moduleFor);
      const more = questionForRequirement(m, "check", records, (id) => keyboardOffered(id) && !presented.has(problemKeyOf(id)));
      const recovered = `${DEEP_MODULE_POLICY}: recovered (${s.state.cause}; ${s.phase})`;
      if (more) return { ...next, phase: "verify", question: more, strategy: null, activity: "check", handover: undefined, retentionOpensAt: next.retentionOpensAt, why: recovered, reason: `Right on your own after the work on ${cause}: the skill carries on. One more on your own.` };
      return { ...next, phase: "done", question: null, handover: undefined, why: recovered, reason: `Right on your own after the work on ${cause}: progress, not yet mastery. Come back on another day: fresh questions then show it is yours.` };
    }
    return next;
  }
  return { ...ms, phase: "pause", question: null, strategy: null, original: undefined, reason: s.kind === "end" ? s.reason : ms.reason, why: `${DEEP_MODULE_POLICY}: ${s.kind === "end" ? s.phase : "stopped"}` };
}
