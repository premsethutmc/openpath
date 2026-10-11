/** Shapes shared by every activity, the on-device engine and the API. */

export type Outcome = "independent" | "supported" | "not_yet";

export type Status =
  | "no_evidence"
  | "emerging"
  | "developing"
  | "secure_pending_retention"
  | "mastered"
  | "needs_review";

/** One thing the learner did. `t` is milliseconds since the session began. */
export interface EvidenceEvent {
  seq: number;
  type: string;
  t: number;
  round: string | null;
  data: Record<string, unknown>;
}

export interface RoundSpec {
  id: string;
  task_type: "produce_set";
  target: number;
  target_kind: string;
  representation: "numeral" | "set";
  is_transfer: boolean;
  available: Record<string, number>;
}

export interface SessionPlan {
  activity: string;
  band: "support" | "core" | "stretch";
  reason: string;
  rounds: RoundSpec[];
}

export interface RoundSummary {
  round: string;
  task_type: string;
  target: number;
  target_kind: string;
  representation: "numeral" | "set";
  is_transfer: boolean;
  context: string;
  outcome: Outcome | null;
  first_check_count: number | null;
  first_error: string | null;
  checks: number;
  wrong_checks: number;
  max_hint_level: number;
  removals: number;
  wrong_kind_adds: number;
  max_in_basket: number;
  self_corrected: boolean;
  completed: boolean;
  duration_ms: number;
  problems: string[];
}

export interface Observation {
  skill: string;
  outcome: Outcome;
  round: string;
  context: string;
  is_transfer: boolean;
  rule: string;
  detail: Record<string, unknown>;
}

/** An observation placed in a learner's history. */
export interface DatedObservation {
  skill: string;
  outcome: Outcome;
  context: string;
  session: string | number;
  observed_at: string;
}

export interface Evaluation {
  integrity: "ok" | "inconsistent";
  problems: string[];
  rounds: RoundSummary[];
  observations: Observation[];
}

export interface Criteria {
  enough_observations: boolean;
  varied_contexts: boolean;
  recent_accuracy: boolean;
  multiple_sessions: boolean;
  retained_over_time: boolean;
}

export interface SkillState {
  status: Status;
  counts: Record<Outcome, number>;
  contexts: string[];
  sessions_with_success: number;
  recent_accuracy: number;
  criteria: Criteria;
  first_success_at: string | null;
  last_observed_at: string | null;
  next_review_at: string | null;
  review_due: boolean;
}

export interface SkillView extends SkillState {
  key: string;
  name: string;
  description: string;
  prerequisites: string[];
  assessed: boolean;
  ready: boolean;
  waiting_on: string[];
}

export interface Profile {
  curriculum_version: string;
  skills: SkillView[];
  ready_next: string[];
  review_due: string[];
}

export interface MasteryPolicy {
  min_independent: number;
  min_sessions: number;
  min_contexts: number;
  retention_gap_days: number;
  window: number;
  min_accuracy: number;
  max_review_interval_days?: number;
}

export interface Curriculum {
  version: string;
  skills: {
    key: string;
    name: string;
    description: string;
    prerequisites: string[];
    assessed: boolean;
  }[];
  mastery_policy: MasteryPolicy;
}

export interface Overview {
  learner_id: string;
  sessions_completed: number;
  profile: Profile;
  next_session: SessionPlan;
}

export interface SessionUpload {
  client_session_id: string;
  activity: string;
  activity_version: string;
  plan: SessionPlan;
  finished: boolean;
  ended_at: string;
  events: EvidenceEvent[];
}

export interface SessionResult extends Overview {
  session: {
    client_session_id: string;
    integrity: "ok" | "inconsistent";
    problems: string[];
    rounds: RoundSummary[];
  };
  observations: Observation[];
  changes: { skill: string; from: Status; to: Status }[];
}
