/**
 * PROPOSAL (research, not wired into the app): unit-coverage gate for the competency claim (coverage-gate@0).
 *
 * Problem (learner-state-eval@1, see README): status@2 claims a competency "shown on your own" after INDEPENDENT_MIN (=2) distinct right
 * first answers anywhere in the competency, latest right. A declared skill unit that has never been answered alone never holds the claim,
 * and a unit's own hold (skill-units.ts notShown) is cleared by a single right answer after wrong ones. So two right answers (lucky guesses,
 * or both on the skills the learner already has) claim the whole competency and schedule its delayed check; untaught units are not part of
 * that check either.
 *
 * Gate (applied ON TOP of the unchanged skillEvidence result; it only ever lowers a claim):
 *   every declared skill unit of the module must be "covered" by the learner's own answers alone (independentAttempt, not probes):
 *     - no wrong answer on the unit: at least one right answer;
 *     - any wrong answer on the unit: status@2 on that unit's own answers (>= INDEPENDENT_MIN distinct right questions, latest right or fewer than
 *       two of its last three wrong).
 *   If a unit is not covered, a claim (independent / transfer) becomes "guided" and a scheduled / due delayed check is not offered
 *   (retention "none"), exactly as evidence.ts already does for `shownNow === false`.
 * Modules without declared units are unchanged (no-op). "review" / "verified" / retention history are never changed.
 */
import { moduleFor } from "../../../packages/learning/src/content";
import { INDEPENDENT_MIN, independentAttempt, rightAnswer, type SkillEvidence } from "../../../packages/learning/src/evidence";
import type { LearnerRecords } from "../../../packages/learning/src/records";
import { skillUnits } from "../../../packages/learning/src/skill-units";

export const COVERAGE_GATE_VERSION = "coverage-gate@0" as const;
const CLAIMS = new Set(["independent", "transfer"]);

export interface UnitCoverage { key: string; answered: number; right: number; distinctRight: number; covered: boolean }
/** strict = true: every unit needs status@2 on its own answers (>= INDEPENDENT_MIN distinct right) even with no wrong answer */
/** since: only answers strictly after this instant count (refresh: the latest failed delayed check) */
export function unitCoverage(competency: string, records: LearnerRecords, strict = false, since: string | null = null): UnitCoverage[] {
  const m = moduleFor(competency);
  if (!m) return [];
  return skillUnits(m).map((u) => {
    const mine = records.attempts.filter((a) => independentAttempt(a) && a.activity !== "probe" && u.accepts(a.questionId) && (since === null || a.at > since));
    const rights = mine.filter(rightAnswer);
    const distinctRight = new Set(rights.map((a) => a.questionId)).size;
    const wrong = mine.length - rights.length;
    const last = mine.at(-1);
    const covered = wrong === 0 && !strict ? rights.length >= 1 : distinctRight >= INDEPENDENT_MIN && !!last && (rightAnswer(last) || mine.slice(-3).filter((a) => !rightAnswer(a)).length < 2);
    return { key: u.key, answered: mine.length, right: rights.length, distinctRight, covered };
  });
}
export interface GateOptions { strict?: boolean; refresh?: boolean }
const opts = (o: boolean | GateOptions): GateOptions => (typeof o === "boolean" ? { strict: o } : o);
/** refresh: after a failed delayed check, every unit must be covered again by answers after that failure (not only the failed unit) */
export function gateEvidence(e: SkillEvidence, records: LearnerRecords, o: boolean | GateOptions = {}): SkillEvidence {
  if (!CLAIMS.has(e.status)) return e;
  const { strict = false, refresh = false } = opts(o);
  const since = refresh ? [...e.retentionHistory].reverse().find((c) => c.result === "failed")?.failedAt ?? null : null;
  const cov = unitCoverage(e.id, records, strict, since);
  if (!cov.length || cov.every((c) => c.covered)) return e;
  return { ...e, status: "guided", retention: e.retention === "scheduled" || e.retention === "due" ? "none" : e.retention };
}
/** wraps a learnerState(...) result so that every consumer of `evidence` / `selectionEvidence` sees the gated status */
export function withCoverageGate<T extends { records: LearnerRecords; evidence: (id: string) => SkillEvidence; selectionEvidence?: (id: string) => SkillEvidence }>(st: T, o: boolean | GateOptions = {}): T {
  const memo = new Map<string, SkillEvidence>();
  const ev = (id: string) => { let v = memo.get(id); if (!v) { v = gateEvidence(st.evidence(id), st.records, o); memo.set(id, v); } return v; };
  return { ...st, evidence: ev, ...(st.selectionEvidence ? { selectionEvidence: (id: string) => gateEvidence(st.selectionEvidence!(id), st.records, o) } : {}) };
}
