/**
 * Spaced retention checks, by due date (approved plan, COMPOSITE_MODEL.md §3).
 *
 * Derived entirely from the sessions in which a capability was directly
 * observed (NodeState.sessions); nothing here changes an estimate.
 *
 *   first demonstrated          → a check falls due after the initial interval
 *   a session on or after due   → that session is the check, judged on its own fresh evidence:
 *        evidence favours the retained level over one band lower → passed: interval × 2 (capped)
 *        otherwise                                               → failed: interval × ½ (floored)
 *   now past the due date       → overdue: mastery is not currently verified,
 *                                  however small the numerical uncertainty is
 *
 * "Previously demonstrated" (history) and "currently verified" (retention)
 * are reported separately.
 *
 * Verified LEVEL (verification@2, 18 October 2026). The schedule above verifies "the retained level", which
 * could be raised in the same session that is judged as the check: a level first shown on day 12 was reported as
 * verified on day 12 because a lower level had been shown on day 1. `verifiedLevel` gives the one meaning used for
 * every level claim: band L is verified only when L was first shown without help in an earlier session, and a later
 * session at least the delay (mastery_gap_days, less the same half-day tolerance) after that has fresh evidence AT L
 * (at least VERIFY_AT_LEVEL_MIN DISTINCT questions answered fresh, never a repeat, of difficulty ≥ L − tolerance: H-V2)
 * that favours L over L − 1 (checkPassed, unchanged, on that session's fresh evidence). The schedule fields (status, level, dueAt, checks, lastVerifiedAt) are unchanged, so
 * due dates, selection and historical schedules replay exactly as before.
 */
import { daysBetween } from "./model.ts";
import type { NodeState, Policy, SessionObservation } from "./types.ts";

export interface RetentionConfig {
  /** Days from first demonstration to the first check (defaults to the framework's mastery gap). */
  initialDays?: number;
  maxDays: number;
  minDays: number;
  growth: number;
  shrink: number;
  /** A check passes if the demonstrated level is at least the reference level minus this. */
  tolerance: number;
}

export const RETENTION: RetentionConfig = { maxDays: 60, minDays: 2, growth: 2, shrink: 0.5, tolerance: 0.5 };

export type RetentionStatus = "none" | "current" | "overdue" | "failed";

export interface Retention {
  status: RetentionStatus;
  /** Level being retained (the highest level verified so far, or the level after a failed check). */
  level: number | null;
  firstDemonstratedAt: string | null;
  lastVerifiedAt: string | null;
  lastFailedAt: string | null;
  dueAt: string | null;
  intervalDays: number | null;
  overdueDays: number;
  checks: { at: string; passed: boolean; level: number | null; intervalAfter: number }[];
  /** The highest band verified by a delayed check at that band (verification@2); null when none, or after a failed check. */
  verifiedLevel: number | null;
  /** When `verifiedLevel` was verified. */
  verifiedLevelAt: string | null;
}

/** Answers at the level a delayed check needs before it can verify that level. */
export const VERIFY_AT_LEVEL_MIN = 2;
export const VERIFICATION_DEFINITION = "verification@2";

const DUE_TOLERANCE_MS = 12 * 3_600_000;
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString();

export function retention(node: NodeState, policy: Policy, now: string, cfg: RetentionConfig = RETENTION): Retention {
  const out: Retention = { status: "none", level: null, firstDemonstratedAt: null, lastVerifiedAt: null, lastFailedAt: null, dueAt: null, intervalDays: null, overdueDays: 0, checks: [], verifiedLevel: null, verifiedLevelAt: null };
  const initial = cfg.initialDays ?? policy.mastery_gap_days;
  let lastFailed = false;
  // each new highest level shown, with when it was first shown (independent, outside teaching sessions)
  const shown: { level: number; at: string }[] = [];
  const delayMs = policy.mastery_gap_days * 86_400_000 - DUE_TOLERANCE_MS;
  for (const s of node.sessions ?? []) {
    if (Date.parse(s.at) > Date.parse(now)) break;
    // a session with teaching on this capability is neither a first demonstration nor a retention check
    if (s.teaching) continue;
    // verification@2: does this session's fresh evidence verify a level first shown at least the delay earlier?
    // any band up to the highest one shown at least the delay earlier can be verified, by fresh evidence at that band
    const eligible = shown.filter((x) => Date.parse(s.at) - Date.parse(x.at) >= delayMs).map((x) => x.level);
    const top = eligible.length ? Math.max(...eligible) : null;
    for (let L = top ?? 0; top !== null && L >= 1; L -= 0.5) {
      if (out.verifiedLevel !== null && L <= out.verifiedLevel) break;
      // H-V2: distinct questions answered fresh in this session (a repeat, or a question met before with help, never
      // verifies; a second answer to the same question is always a repeat), judged on that fresh evidence alone
      const fresh = (s.obs ?? []).filter((o) => o.exposure !== "repeat");
      const atLevel = fresh.filter((o) => o.kind === "binary" && o.b >= L - cfg.tolerance);
      if (atLevel.length >= VERIFY_AT_LEVEL_MIN && checkPassed(fresh, L, s.level, cfg)) {
        out.verifiedLevel = L;
        out.verifiedLevelAt = s.at;
        break;
      }
    }
    if (s.level !== null && (!shown.length || s.level > shown.at(-1)!.level)) shown.push({ level: s.level, at: s.at });
    if (out.firstDemonstratedAt === null) {
      if (s.level === null) continue;
      out.firstDemonstratedAt = s.at;
      out.level = s.level;
      out.intervalDays = initial;
      out.dueAt = addDays(s.at, initial);
      continue;
    }
    // checks are due by the day: a session within half a day before the due time is the check
    if (Date.parse(s.at) < Date.parse(out.dueAt!) - DUE_TOLERANCE_MS) {
      // practice before the check is due: a higher level raises what is being retained, nothing else changes
      if (s.level !== null && out.level !== null && s.level > out.level && !lastFailed) out.level = s.level;
      if (s.level !== null && lastFailed) out.level = Math.max(out.level ?? 0, s.level);
      continue;
    }
    // Judge the check on the fresh evidence from this session alone: does it favour the retained
    // level over one band lower? (The cumulative estimate is dominated by older evidence.)
    const passed = checkPassed(s.obs ?? [], out.level!, s.level, cfg);
    const interval = passed ? Math.min(cfg.maxDays, out.intervalDays! * cfg.growth) : Math.max(cfg.minDays, out.intervalDays! * cfg.shrink);
    out.checks.push({ at: s.at, passed, level: s.level, intervalAfter: interval });
    out.intervalDays = interval;
    out.dueAt = addDays(s.at, interval);
    if (passed) {
      out.lastVerifiedAt = s.at;
      out.level = Math.max(out.level!, s.level!);
      lastFailed = false;
    } else {
      out.lastFailedAt = s.at;
      out.level = s.level === null ? null : Math.min(s.level, out.level! - 1);
      lastFailed = true;
      // a failed check: nothing stays verified, and a level must be shown again before it can be verified again
      out.verifiedLevel = null;
      out.verifiedLevelAt = null;
      shown.length = 0;
      if (s.level !== null) shown.push({ level: s.level, at: s.at });
    }
  }
  if (out.firstDemonstratedAt === null) return out;
  const overdue = daysBetween(out.dueAt, now);
  out.overdueDays = Math.max(0, overdue);
  out.status = overdue >= 0 ? "overdue" : lastFailed ? "failed" : "current";
  return out;
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** Log-likelihood of a session's observations if the learner were at `theta`. */
export function sessionLogLikelihood(obs: SessionObservation[], theta: number): number {
  let ll = 0;
  for (const o of obs) {
    if (o.kind === "binary") {
      const p = o.c + (1 - o.c) * logistic(o.a * (theta - o.b));
      ll += Math.log(o.correct ? p : 1 - p);
    } else ll += -((o.value - theta) ** 2) / (2 * o.noise * o.noise);
  }
  return ll;
}

/** A check passes when the session's fresh evidence is at least as likely at the retained level as one band lower. */
export function checkPassed(obs: SessionObservation[], retained: number, sessionLevel: number | null, cfg: RetentionConfig = RETENTION): boolean {
  if (!obs.length) return sessionLevel !== null && sessionLevel >= retained - cfg.tolerance;
  return sessionLogLikelihood(obs, retained) >= sessionLogLikelihood(obs, retained - 1);
}
