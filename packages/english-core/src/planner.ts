/**
 * Minimal teaching planner for one rule (MVP slice; see the planner proposal for the full design).
 *
 * A pure, subject-neutral decision function: it reads one rule's state from the rule-evidence projection
 * (status, misconceptions, interventions and what followed them, retention checks), the subject's ordered
 * list of strategies for the rule, what content is still available, and a versioned policy. It returns one
 * action with a diagnosis and a plain reason. It changes nothing and knows nothing about English.
 *
 * Teaching happens in blocks: teach (an intervention), guided practice with hints (assisted, never
 * evidence), then an independent reassessment on unfamiliar items. Only the reassessment decides whether
 * the block worked. A failed block changes the strategy; it is never repeated. After the configured number
 * of failed strategies the planner recommends a person instead of continuing.
 *
 * All values in PLANNER_POLICY_DRAFT are draft defaults for review, not claims about what works.
 */
import type { InterventionSummary, RuleState } from "./rule-evidence.ts";

export interface PlannerPolicy {
  version: string;
  /** Independent answers asked before teaching, at most (fewer if a misconception or weakness is already clear). */
  diagnosticMax: number;
  /** Independent unfamiliar items in each reassessment after teaching. */
  reassessItems: number;
  /** Correct reassessment answers (out of reassessItems) for a block to count as having worked. */
  reassessPassMin: number;
  /**
   * Unfamiliar contrast items (the rule must NOT be applied) in each reassessment. All of them must be right for
   * the block to count as having worked, so a learner who applies the rule everywhere cannot pass.
   */
  reassessContrastItems: number;
  /** Guided practice items in a teaching block (assisted; never evidence). */
  guidedItems: number;
  /** Hint levels offered in guided practice. */
  hintLevels: number;
  /** Failed teaching blocks (each with a different strategy) before recommending a person. */
  maxStrategiesBeforeHuman: number;
  /** Days after the last answer on the rule before a delayed retention check. */
  retentionGapDays: number;
  /** Independent unfamiliar items in a retention check. */
  retentionItems: number;
}

export const PLANNER_POLICY_DRAFT: PlannerPolicy = {
  version: "planner-policy@0-draft",
  diagnosticMax: 5,
  reassessItems: 2,
  reassessPassMin: 2,
  reassessContrastItems: 1,
  guidedItems: 4,
  hintLevels: 3,
  maxStrategiesBeforeHuman: 3,
  retentionGapDays: 7,
  retentionItems: 2,
};

export type DiagnosisKind =
  | "insufficient_evidence"
  | "inconsistent"
  | "misconception"
  | "weak"
  | "help_dependence"
  | "not_yet_independent"
  | "retrieval_difficulty"
  | "shown"
  | "secure";

export type ActionKind = "assess" | "teach" | "guided_practice" | "reassess" | "retention_check" | "recommend_human" | "content_gap" | "done";

export interface PlannerDecision {
  action: ActionKind;
  /** For reassess: which kind of unfamiliar item to ask next (apply the rule, or a contrast where it must not be applied). */
  itemRole?: "apply" | "contrast";
  /** The strategy to teach (teach), or the one being practised (guided_practice, reassess). */
  strategy?: string;
  diagnosis: { kind: DiagnosisKind; detail: string };
  /** For done: how the session ended. */
  outcome?: "shown_independently" | "improved_after_teaching" | "retention_confirmed" | "paused_for_support" | "content_gap";
  reason: string;
  policy: string;
}

export interface BlockResult {
  intervention: InterventionSummary;
  /** Reassessment finished (enough independent unfamiliar answers after it). */
  complete: boolean;
  passed: boolean;
}

export interface PlannerInput {
  rule: RuleState;
  /** The subject's strategies for this rule, in the order to try them. */
  strategies: string[];
  now: string;
  /** Start of the current session: blocks before it belong to earlier sessions. */
  sessionStartedAt: string;
  session: string;
  /** Unseen independent items still available: apply (rule should be applied) and contrast. Guided: unseen practice items. */
  available: { apply: number; contrast: number; guided: number };
  /** Independent answers given in this session so far, and guided answers given in the current block. */
  answeredThisSession: number;
  /**
   * Of those, recognised slips (the rule was applied; another letter was wrong). A slip is not evidence about the
   * rule, so it does not use up the diagnostic budget: another item is asked instead.
   */
  slipsThisSession?: number;
  guidedThisBlock: number;
  policy?: PlannerPolicy;
}

const DAY = 86_400_000;

export function blockResults(rule: RuleState, policy: PlannerPolicy = PLANNER_POLICY_DRAFT): BlockResult[] {
  return rule.interventions.map((iv) => {
    const a = iv.independentAfter;
    const complete = a.newWordTotal >= policy.reassessItems && a.contrastTotal >= policy.reassessContrastItems;
    return { intervention: iv, complete, passed: complete && a.newWordRight >= policy.reassessPassMin && a.contrastRight >= a.contrastTotal };
  });
}

export function planRule(input: PlannerInput): PlannerDecision {
  const p = input.policy ?? PLANNER_POLICY_DRAFT;
  const r = input.rule;
  const out = (d: Omit<PlannerDecision, "policy">): PlannerDecision => ({ ...d, policy: p.version });
  const gap = (what: string, diagnosis: PlannerDecision["diagnosis"]): PlannerDecision =>
    out({ action: "content_gap", outcome: "content_gap", diagnosis, reason: `No unseen ${what} is left for this rule. The rule stays in the plan; more reviewed questions are needed.` });
  const blocks = blockResults(r, p);
  const last = blocks.at(-1);
  const failed = blocks.filter((b) => b.complete && !b.passed);
  const worked = blocks.filter((b) => b.passed);
  const untried = input.strategies.filter((s) => !failed.some((b) => b.intervention.strategy === s));
  const open = r.retention.checks.find((c) => c.session === input.session);
  const since = r.lastEvidenceAt ? (Date.parse(input.now) - Date.parse(r.lastEvidenceAt)) / DAY : 0;

  // 1. A retention check started in this session is finished before anything else.
  if (open && open.applications < p.retentionItems) {
    if (input.available.apply === 0) return gap("question for the delayed check", { kind: "insufficient_evidence", detail: "delayed check unfinished" });
    return out({ action: "retention_check", diagnosis: { kind: "shown", detail: "delayed check in progress" }, reason: "Checking, without help, whether the rule has lasted." });
  }
  if (r.status === "verified") return out({ action: "done", outcome: "retention_confirmed", diagnosis: { kind: "secure", detail: "shown on new words and kept after a delay" }, reason: "Shown independently and kept after at least a week." });
  if (r.status === "demonstrated") {
    if (since >= p.retentionGapDays) {
      if (input.available.apply === 0) return gap("question for the delayed check", { kind: "shown", detail: "retention not yet checked" });
      return out({ action: "retention_check", diagnosis: { kind: "shown", detail: "shown earlier; retention not yet checked" }, reason: `Shown ${Math.floor(since)} days ago: checking, without help, whether it has lasted.` });
    }
    return out({ action: "done", outcome: "shown_independently", diagnosis: { kind: "shown", detail: "shown on new words; retention pending" }, reason: `Shown independently. A check after at least ${p.retentionGapDays} days will show whether it lasts.` });
  }

  // 2. Too many strategies have failed: stop repeating and ask a person.
  if (failed.length >= p.maxStrategiesBeforeHuman || (failed.length > 0 && untried.length === 0 && !(last && !last.complete)))
    return out({
      action: "recommend_human",
      outcome: "paused_for_support",
      diagnosis: diagnose(r, last),
      reason: `${failed.length} different teaching approaches have not yet led to independent success. Pausing this rule and recommending help from a teacher or parent.`,
    });

  // 3. A teaching block in progress: guided practice, then the independent reassessment.
  if (last && !last.complete) {
    const strategy = last.intervention.strategy;
    if (input.guidedThisBlock < p.guidedItems && input.available.guided > 0)
      return out({ action: "guided_practice", strategy, diagnosis: diagnose(r, last), reason: "Practice with help available. These answers are practice: they never count as independent evidence." });
    // apply, then a contrast, then the remaining apply items: both using and withholding the rule are checked
    const after = last.intervention.independentAfter;
    const needContrast = after.contrastTotal < p.reassessContrastItems && after.newWordTotal >= 1;
    const needApply = after.newWordTotal < p.reassessItems;
    if (needContrast || !needApply) {
      if (input.available.contrast === 0) return gap("unfamiliar 'must not double' question for the reassessment", diagnose(r, last));
      return out({ action: "reassess", itemRole: "contrast", strategy, diagnosis: diagnose(r, last), reason: "Now without help, on a word not used in the teaching." });
    }
    if (input.available.apply === 0) return gap("unfamiliar question for the reassessment", diagnose(r, last));
    return out({ action: "reassess", itemRole: "apply", strategy, diagnosis: diagnose(r, last), reason: "Now without help, on a word not used in the teaching." });
  }

  // 4. The latest block's reassessment was passed in this session: end here, without claiming mastery.
  if (last?.passed && (last.intervention.independentAfter.lastAt ?? "") >= input.sessionStartedAt)
    return out({
      action: "done",
      outcome: "improved_after_teaching",
      diagnosis: { kind: "not_yet_independent", detail: "right on new words after teaching; more independent evidence and a delayed check needed" },
      reason: "Right on unfamiliar words after teaching. That is progress, not yet mastery: more independent answers and a check after a week are still needed.",
    });

  // 5. The latest block failed: change strategy (never repeat a failed one).
  if (last && !last.passed) {
    const next = untried[0];
    return out({ action: "teach", strategy: next, diagnosis: diagnose(r, last), reason: `The ${last.intervention.strategy.replace(/_/g, " ")} approach did not lead to independent success. Trying a different approach.` });
  }

  // 6. A failed delayed check: refresh with what worked before.
  if (r.status === "needs_reconfirmation") {
    const strategy = worked.at(-1)?.intervention.strategy ?? untried[0];
    return out({ action: "teach", strategy, diagnosis: { kind: "retrieval_difficulty", detail: "shown before, not kept after a delay" }, reason: "Shown before, but not remembered after a delay. A short refresher with the approach that helped before." });
  }

  // 7. Not yet taught: gather independent evidence, then teach.
  const active = r.misconceptions.find((m) => m.state === "active");
  // the diagnostic budget counts answers that are evidence about the rule (slips excluded), and on its own it only
  // leads to teaching once there is at least one rule error: a learner who has made none is asked another question
  const counted = input.answeredThisSession - (input.slipsThisSession ?? 0);
  const applyErrors = r.current.total - r.current.right;
  const contrastErrors = r.contrast.total - r.contrast.right;
  const enough = r.status === "weak" || !!active || (counted >= p.diagnosticMax && applyErrors + contrastErrors > 0);
  if (!enough && (r.status === "insufficient_evidence" || r.status === "emerging" || r.status === "inconsistent")) {
    if (input.available.apply + input.available.contrast === 0) return gap("question for the check", { kind: "insufficient_evidence", detail: "not enough answers yet" });
    return out({ action: "assess", diagnosis: { kind: r.status === "inconsistent" ? "inconsistent" : "insufficient_evidence", detail: `${r.current.total} independent answer(s) on new words so far` }, reason: "Finding out, without help, what is already known." });
  }
  const strategy = worked.at(-1)?.intervention.strategy ?? untried[0];
  const reason = active
    ? "The same mistake appeared on different words: teaching the rule."
    : applyErrors === 0 && contrastErrors > 0
      ? "Doubled a letter where it should not be doubled: teaching when to double, and when not to."
      : "Not yet right on new words: teaching the rule.";
  return out({ action: "teach", strategy, diagnosis: diagnose(r, last), reason });
}

function diagnose(r: RuleState, last: BlockResult | undefined): PlannerDecision["diagnosis"] {
  const d = last?.intervention.during;
  if (last?.complete && !last.passed && d && d.rightWithHelp > 0 && d.rightFirstTry === 0)
    return { kind: "help_dependence", detail: `right only with help in practice (${d.rightWithHelp} with help, ${d.rightFirstTry} at the first try), not yet on new words alone` };
  const active = r.misconceptions.find((m) => m.state === "active" || m.state === "improving");
  if (active) return { kind: "misconception", detail: `${active.tag.replace(/_/g, " ")}: seen on ${active.errors.length} independent answer(s)` };
  if (r.status === "inconsistent") return { kind: "inconsistent", detail: "right and wrong answers mixed, with different kinds of error" };
  if (r.status === "weak") return { kind: "weak", detail: `${r.current.right} of ${r.current.total} right on new words` };
  return { kind: "insufficient_evidence", detail: `${r.current.total} independent answer(s) on new words so far` };
}
