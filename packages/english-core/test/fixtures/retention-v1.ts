// verification@1: the retention schedule exactly as it was before verification@2 (git 2a89848), kept only to prove the
// schedule replays unchanged (K10-2). Not used by the app.
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
 */
import { daysBetween } from "../../src/model.ts";
import type { NodeState, Policy, SessionObservation } from "../../src/types.ts";

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
}

const DUE_TOLERANCE_MS = 12 * 3_600_000;
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString();

export function retention(node: NodeState, policy: Policy, now: string, cfg: RetentionConfig = RETENTION): Retention {
  const out: Retention = { status: "none", level: null, firstDemonstratedAt: null, lastVerifiedAt: null, lastFailedAt: null, dueAt: null, intervalDays: null, overdueDays: 0, checks: [] };
  const initial = cfg.initialDays ?? policy.mastery_gap_days;
  let lastFailed = false;
  for (const s of node.sessions ?? []) {
    if (Date.parse(s.at) > Date.parse(now)) break;
    // a session with teaching on this capability is neither a first demonstration nor a retention check
    if (s.teaching) continue;
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
