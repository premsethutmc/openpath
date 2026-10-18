/**
 * What the studio says about a competency, from the evidence state only. Four claims are kept apart:
 *   gap suspicion     from essays (provisional)
 *   confirmed gap     from reviewed, eligible bank questions answered without help
 *   estimated level   the engine's estimate from counted answers (never mastery)
 *   verified mastery  shown at the grade target without help, then kept at the delayed check after that
 * Practice on model-written questions is reported separately as formative feedback and never feeds any of them.
 */
import type { CompetencyOutcome, CompetencyStatus } from "../../../../../packages/english-core/src/index.ts";

export type EvidenceKey = "none" | "seen" | "suspected" | "confirmed" | "unsettled" | "not_confirmed" | "shown" | "shown_delayed_pending" | "verified";

export interface EvidenceLabel {
  key: EvidenceKey;
  label: string;
  detail: string;
}

export function evidenceLabel(c: CompetencyStatus, outcome?: CompetencyOutcome | null): EvidenceLabel {
  if (c.state === "verified") {
    // the engine's verification can predate showing the grade target (a lower level kept): mastery at the target is
    // called verified only once the delayed check after the target was shown has passed
    if (!outcome || outcome.retention === "demonstrated")
      return { key: "verified", label: "Verified mastery", detail: "Shown without help at the grade target, then kept at a delayed check at least 7 days later." };
    return { key: "shown_delayed_pending", label: "Shown at the grade target: delayed check pending", detail: "Shown without help on bank questions at the grade target. Mastery is verified only after the delayed check." };
  }
  if (c.state === "demonstrated") return { key: "shown", label: "Shown at the grade target (not yet verified)", detail: "Shown without help on bank questions at the grade target. A delayed check at least 7 days later is still needed." };
  const g = c.gap?.status;
  if (g === "confirmed") return { key: "confirmed", label: "Gap confirmed", detail: "Bank questions answered without help agreed with the essay." };
  if (g === "unresolved") return { key: "unsettled", label: "Checked: not settled", detail: c.gap?.diagnostic?.reason ?? "The bank questions did not decide it." };
  if (g === "weakened") return { key: "not_confirmed", label: "Gap not confirmed", detail: "Bank questions answered without help were right. That is not mastery." };
  if (g === "suspected") return { key: "suspected", label: "Suspected from your essay", detail: "Provisional: an essay gives clues, not conclusions. Only bank questions answered without help can confirm it." };
  if (c.state === "observed") return { key: "seen", label: "Seen in your essay", detail: "Essay evidence only: not a claim either way." };
  return { key: "none", label: "No evidence yet", detail: "" };
}

export function estimateLabel(c: CompetencyStatus): string {
  const e = c.engine.estimate;
  if (!e) return "Estimated level: none yet (no answer has been counted).";
  return `Estimated level: band ${e.mean.toFixed(1)} ± ${e.sd.toFixed(1)} from ${c.engine.directN} counted answer${c.engine.directN === 1 ? "" : "s"} (an estimate, not mastery; the Grade 8 target is band ${c.engine.target ?? "?"}, provisional).`;
}

export function formativeLabel(c: CompetencyStatus): string | null {
  const f = c.formative;
  if (!f || f.status === "pending") return null;
  return `Practice on model-written questions: ${f.right} of ${f.total} right. Formative only: it does not confirm a gap or count as showing the skill.`;
}
