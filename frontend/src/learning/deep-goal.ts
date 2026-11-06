/**
 * deep-recovery@0 on ONE learning-goal pathway (RESEARCH, behind the same research switch; default off). A learning goal
 * (record foundation_pathway, policy mathematics-pathway@1) supplies its own module decision: session.learnerState `module` ->
 * foundation-runtime.pathwayModule (readinessRoute, misconception resolution, withFoundation). This adapter wraps that decision and
 * changes exactly one thing, only for an allow-listed goal and only on a step of its route: where the goal's own decision is
 * "recover" (its module opened the shipped two-level recovery from one of its own wrong answers), the deep episode runs instead;
 * an episode still running or paused keeps the step on it; an episode that ended solved lets the goal carry on as it does after a
 * resolved recovery (pathwayModule with withinRecovery, i.e. without the adaptive-loop block); a stopped episode pauses the step.
 * Every other decision is the goal's own, unchanged. Everything is a pure function of the saved records and the time.
 *
 * Why integration-methods: its route is indefinite-integrals > integration-methods, but its problems rest on algebra the route never
 * contains (partial fractions, linear systems, factorisation): the shipped two-level recovery cannot reach them; deep recovery can,
 * and returns the learner to a fresh problem of the goal's own step.
 */
import type { SkillEvidence } from "../../../packages/learning/src/evidence";
import type { ModuleState } from "../../../packages/learning/src/intervention";
import type { LearnerRecords } from "../../../packages/learning/src/records";
import { DEEP_MODULE_POLICY, moduleOriginals } from "./deep-module";
import { DEEP_APP_OPTIONS, deepScreen, type DeepScreen } from "./deep-recovery-app";

export const DEEP_GOAL_POLICY = "deep-recovery-goal@0" as const;
/** the one representative goal connected on the research branch; every other goal is untouched */
export const DEEP_GOAL_TARGETS: ReadonlySet<string> = new Set(["MATH.calculus.integration-methods"]);
const open = (s: DeepScreen) => s.kind !== "end" || s.phase === "pause";
const SOLVED = new Set(["solved", "solved_after_help"]);

/** wraps the goal's module decision `goal(competency, withinRecovery)` (learnerState().module) */
export function deepGoalModule(on: boolean, goal: (competency: string, withinRecovery?: boolean) => ModuleState, records: LearnerRecords, evidence: (id: string) => SkillEvidence, now: number) {
  return (competency: string, withinRecovery = false): ModuleState => {
    const ms = goal(competency, withinRecovery);
    if (!on || withinRecovery || !records.pathway?.active || !DEEP_GOAL_TARGETS.has(records.pathway.target) || !records.readinessRoute?.includes(competency)) return ms;
    const recover = (original: string, s: DeepScreen): ModuleState => ({ ...ms, phase: "recover", question: null, strategy: null, original, reason: s.reason, why: DEEP_GOAL_POLICY });
    // an episode from this step's own exploratory answer, still running or paused: stay on it (the goal's own decision would
    // otherwise ask the original problem again, which deep recovery never does)
    for (const q of moduleOriginals(competency, records)) { const s = deepScreen(q, records, evidence, now, DEEP_APP_OPTIONS); if (open(s)) return recover(q, s); }
    if (ms.phase !== "recover" || !ms.original) return ms;
    const s = deepScreen(ms.original, records, evidence, now, DEEP_APP_OPTIONS);
    if (open(s)) return recover(ms.original, s);
    if (s.kind === "end" && SOLVED.has(s.phase)) return goal(competency, true);
    return { ...ms, phase: "pause", question: null, strategy: null, original: undefined, reason: s.kind === "end" ? s.reason : ms.reason, why: `${DEEP_GOAL_POLICY}: ${s.kind === "end" ? s.phase : "stopped"} (${DEEP_MODULE_POLICY})` };
  };
}
