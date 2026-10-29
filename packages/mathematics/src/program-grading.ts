/**
 * Program answers through the unified grading decision (Phase C stage 9, D14). Every program engine asks this, never english-core scoreCode:
 * the server's recorded decision when the event carries one (replay, stage 7), otherwise the same decision computed in the app (preview).
 * An unresolved decision (unreadable, ambiguous, undeterminable) is not an answer: engines record nothing for it (approved policy P1).
 */
import { gradeProgram } from "../../learning/src/grading/program.ts";
import type { GradingDecision } from "../../learning/src/grading/decision.ts";
import { unifiedAuthoritative } from "../../learning/src/grading/mode.ts";

export type ProgramDecision = Pick<GradingDecision, "verdict" | "reason"> & Partial<GradingDecision>;
/**
 * recorded: the server's decision stored with the event (authoritative when present).
 * earlier: the engine's own earlier marking (english-core scoreCode), used while the unified grader is not authoritative (shadow / legacy
 * mode, grading/mode.ts), so a learner never sees a unified verdict that differs from the authoritative one. It returns true / false, or
 * null where the earlier marking could not read the answer (the engine then records nothing, as before).
 */
export function programDecision(id: string, response: string, recorded?: unknown, earlier?: () => boolean | null): ProgramDecision {
  const r = recorded as { schema?: string; decidedBy?: string; verdict?: string } | undefined;
  if (r && r.schema === "grading-decision@1" && r.decidedBy === "server" && typeof r.verdict === "string") return r as ProgramDecision;
  if (!unifiedAuthoritative() && earlier) {
    const v = earlier();
    return { verdict: v === true ? "correct" : v === false ? "incorrect" : "unresolved", reason: v === null ? "unresolved.invalid-response" : "legacy-policy@0" as ProgramDecision["reason"], policy: "legacy-policy@0" as GradingDecision["policy"] };
  }
  return gradeProgram(id, response);
}
