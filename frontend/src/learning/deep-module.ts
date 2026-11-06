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
import { question } from "../../../packages/learning/src/content";
import type { SkillEvidence } from "../../../packages/learning/src/evidence";
import { moduleState, recovery, type Established, type ModuleState } from "../../../packages/learning/src/intervention";
import type { LearnerRecords } from "../../../packages/learning/src/records";
import { DEEP_APP_OPTIONS, DEEP_TAG, deepScreen, type DeepScreen } from "./deep-recovery-app";

export const DEEP_MODULE_POLICY = "deep-recovery-module@0" as const;
const SOLVED = new Set(["solved", "solved_after_help"]);
const open = (s: DeepScreen) => s.kind !== "end" || s.phase === "pause";

/** this module's own exploratory wrong answers that a deep episode has started from, newest first (saved records only) */
export function moduleOriginals(competency: string, records: LearnerRecords): string[] {
  const started = new Set(records.attempts.filter((a) => a.context?.startsWith(DEEP_TAG)).map((a) => a.context!.slice(DEEP_TAG.length, a.context!.indexOf("|"))));
  const out: string[] = [];
  for (const q of [...started].reverse()) {
    const first = records.attempts.find((a) => a.questionId === q);
    let comp: string | null = null;
    try { comp = question(q).competency; } catch { continue; }
    if (comp === competency && first && first.activity === "diagnostic" && !first.context?.startsWith(DEEP_TAG)) out.push(q);
  }
  return out;
}

export function deepModuleState(on: boolean, competency: string, records: LearnerRecords, ev: SkillEvidence, now: number, session: string, established?: Established | null, evidence?: (id: string) => SkillEvidence): ModuleState {
  const ms = moduleState(competency, records, ev, now, session, established, evidence);
  if (!on || !evidence || established) return ms;
  const recover = (original: string, s: DeepScreen): ModuleState => ({ ...ms, phase: "recover", question: null, strategy: null, original, reason: s.reason, why: DEEP_MODULE_POLICY });
  const originals = moduleOriginals(competency, records);
  for (const q of originals) { const s = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS); if (open(s)) return recover(q, s); }
  // the original the shipped module would recover from, or one whose ended episode the shipped recovery still escalates
  let q: string | null = ms.phase === "recover" && ms.original ? ms.original : null;
  if (!q && ms.phase === "pause") q = originals.find((x) => { const r = recovery(x, records, evidence, now, session); return r.phase === "escalate"; }) ?? null;
  if (!q) return ms;
  const s = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS);
  if (open(s)) return recover(q, s);
  if (s.kind === "end" && SOLVED.has(s.phase)) return moduleState(competency, records, ev, now, session, established, undefined);
  return { ...ms, phase: "pause", question: null, strategy: null, original: undefined, reason: s.kind === "end" ? s.reason : ms.reason, why: `${DEEP_MODULE_POLICY}: ${s.kind === "end" ? s.phase : "stopped"}` };
}
