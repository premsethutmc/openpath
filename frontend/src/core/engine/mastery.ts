/** On-device mirror of backend/assessment/mastery.py. See that file for the reasoning. */
import type { Criteria, MasteryPolicy, Outcome, SkillState, Status } from "../types";

export const SECURE: Status[] = ["secure_pending_retention", "mastered"];

const DAY = 24 * 60 * 60 * 1000;

interface Obs {
  outcome: Outcome;
  context: string;
  session: string | number;
  at: number;
}

function measure(obs: Obs[], policy: MasteryPolicy) {
  const independent = obs.filter((o) => o.outcome === "independent");
  const contexts = [...new Set(independent.map((o) => o.context))].sort();
  const sessions = new Set(independent.map((o) => o.session));
  const window = obs.slice(-policy.window);
  const accuracy = window.length ? window.filter((o) => o.outcome === "independent").length / window.length : 0;
  const span = independent.length ? independent[independent.length - 1].at - independent[0].at : 0;
  const criteria: Criteria = {
    enough_observations: independent.length >= policy.min_independent,
    varied_contexts: contexts.length >= policy.min_contexts,
    recent_accuracy: window.length > 0 && accuracy >= policy.min_accuracy,
    multiple_sessions: sessions.size >= policy.min_sessions,
    retained_over_time: sessions.size >= 2 && span >= policy.retention_gap_days * DAY,
  };
  return {
    independent,
    contexts,
    sessions,
    accuracy,
    criteria,
    core: criteria.enough_observations && criteria.varied_contexts && criteria.recent_accuracy,
    retained: criteria.multiple_sessions && criteria.retained_over_time,
  };
}

const iso = (ms: number | null): string | null => (ms === null ? null : new Date(ms).toISOString());

export function computeSkillState(
  observations: { outcome: Outcome; context: string; session: string | number; observed_at: string }[],
  policy: MasteryPolicy,
  now: Date,
): SkillState {
  // Array.prototype.sort is stable, matching Python's sorted().
  const obs: Obs[] = observations
    .map((o) => ({ outcome: o.outcome, context: o.context, session: o.session, at: Date.parse(o.observed_at) }))
    .sort((a, b) => a.at - b.at);
  const counts: Record<Outcome, number> = { independent: 0, supported: 0, not_yet: 0 };
  for (const o of obs) counts[o.outcome] += 1;

  const m = measure(obs, policy);
  const firstSuccess = m.independent.length ? m.independent[0].at : null;
  const lastSuccess = m.independent.length ? m.independent[m.independent.length - 1].at : null;
  const gap = policy.retention_gap_days * DAY;

  const wasMasteredBefore = (): boolean => {
    for (let end = 1; end < obs.length; end++) {
      const earlier = measure(obs.slice(0, end), policy);
      if (earlier.core && earlier.retained) return true;
    }
    return false;
  };

  let status: Status;
  let nextReview: number | null = null;
  if (obs.length === 0) {
    status = "no_evidence";
  } else if (m.core && m.retained) {
    status = "mastered";
    const days = Math.min(
      policy.max_review_interval_days ?? 60,
      policy.retention_gap_days * 2 ** Math.max(1, m.sessions.size - 1),
    );
    nextReview = lastSuccess! + days * DAY;
  } else if (m.core) {
    status = "secure_pending_retention";
    nextReview = firstSuccess! + gap;
  } else if (wasMasteredBefore()) {
    status = "needs_review";
    nextReview = now.getTime();
  } else if (m.independent.length) {
    status = "developing";
  } else {
    status = "emerging";
  }

  return {
    status,
    counts,
    contexts: m.contexts,
    sessions_with_success: m.sessions.size,
    recent_accuracy: Math.round(m.accuracy * 1000) / 1000,
    criteria: m.criteria,
    first_success_at: iso(firstSuccess),
    last_observed_at: iso(obs.length ? obs[obs.length - 1].at : null),
    next_review_at: iso(nextReview),
    review_due: nextReview !== null && nextReview <= now.getTime(),
  };
}
