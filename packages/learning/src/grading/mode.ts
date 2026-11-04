/**
 * Which grading policy is AUTHORITATIVE for what the learner is shown (release preparation, shadow deployment).
 *
 * The server owns the mode (OPENPATH_GRADING: shadow | unified | legacy) and reports it with the learner's record (GET events
 * "gradingMode"); the app sets it here when it loads the record. A server that does not report it predates the unified grader and is
 * treated as "legacy". In shadow and legacy modes the app never shows the unified grader's own verdict as the result: the year app shows the
 * server's recorded (authoritative) decision, and the program engines use their earlier marking. Both graders are still computed and the
 * server keeps the unified one beside the authoritative one for comparison (shadowDecision).
 * Default here is "unified" (library and tests, where no server is involved).
 */
export type GradingMode = "shadow" | "unified" | "legacy";
let mode: GradingMode = "unified";
export const gradingMode = (): GradingMode => mode;
export function setGradingMode(m: unknown): GradingMode {
  mode = m === "unified" || m === "shadow" || m === "legacy" ? m : "legacy";
  return mode;
}
/** the unified grader is authoritative (its preview may be shown as the result) */
export const unifiedAuthoritative = () => mode === "unified";
