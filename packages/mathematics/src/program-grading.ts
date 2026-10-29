/**
 * Program answers through the unified grading decision (Phase C stage 9, D14). Every program engine asks this, never english-core scoreCode:
 * the server's recorded decision when the event carries one (replay, stage 7), otherwise the same decision computed in the app (preview).
 * An unresolved decision (unreadable, ambiguous, undeterminable) is not an answer: engines record nothing for it (approved policy P1).
 */
import { gradeProgram } from "../../learning/src/grading/program.ts";
import type { GradingDecision } from "../../learning/src/grading/decision.ts";

export type ProgramDecision = Pick<GradingDecision, "verdict" | "reason"> & Partial<GradingDecision>;
export function programDecision(id: string, response: string, recorded?: unknown): ProgramDecision {
  const r = recorded as { schema?: string; decidedBy?: string; verdict?: string } | undefined;
  if (r && r.schema === "grading-decision@1" && r.decidedBy === "server" && typeof r.verdict === "string") return r as ProgramDecision;
  return gradeProgram(id, response);
}
