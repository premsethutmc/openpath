/**
 * Integration Milestone 1: the four authorities and the only things each may decide. The slice session (session.ts) calls the real
 * component of each authority and records which one decided what; renderer-adapter.ts turns their output into display only.
 *
 *   mathematical-grader  correctness (grading-decision@1 via the trusted server grader) and supported derivation authorization (P2)
 *   evidence-engine      observations, learner-hypothesis@1 (provisional), retention@2 schedule
 *   adaptive-engine      whether to investigate, what to teach, recovery, recheck, retention scheduling
 *   renderer             presentation and learner interaction events only
 */
export type Authority = "mathematical-grader" | "evidence-engine" | "adaptive-engine" | "renderer";

export const DECIDES: Record<Authority, readonly string[]> = {
  "mathematical-grader": ["correctness", "derivation-authorization"],
  "evidence-engine": ["observation", "hypothesis", "retention-schedule"],
  "adaptive-engine": ["investigation", "teaching-selection", "recheck", "retention-policy"],
  renderer: ["presentation", "interaction-event"],
};

export interface TraceEntry {
  n: number;
  step: string;
  authority: Authority;
  /** the real function/module called */
  component: string;
  decides: string;
  input: unknown;
  output: unknown;
}

/** A guard used by the session and the tests: an authority may only record a decision it owns. */
export function assertOwns(a: Authority, decision: string): void {
  if (!DECIDES[a].includes(decision)) throw new Error(`${a} does not own the decision "${decision}"`);
}
