/**
 * Learner-facing summary of one capability.
 *
 * Three things are always kept apart, so that history is never presented as a
 * current result:
 *
 *   estimate  the numerical estimate (mean ± sd): OpenPath's best guess from all
 *             evidence, old and new. It can lag behind forgetting.
 *   status    what is currently verified (LeafView.verification): verified, due
 *             for a check, or needing review after a failed check.
 *   history   the highest level ever shown, labelled as history.
 *
 * "Mastered" and "confirmed" are only ever said when the status is verified.
 */
import type { LeafView } from "./composite.ts";

export interface CapabilitySummary {
  capability: string;
  name: string;
  /** One line for the learner about what is currently true. */
  status: string;
  /** The numerical estimate, labelled as an estimate. */
  estimate: string;
  /** History, labelled as history; null when there is none or it adds nothing. */
  history: string | null;
  /** Is any level currently verified? False when a check is overdue or failed. */
  currentlyVerified: boolean;
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");
const band = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

export function summarise(v: LeafView): CapabilitySummary {
  const ver = v.verification;
  const r = v.retention;
  let status: string;
  switch (ver.status) {
    case "verified":
      // verification@2: the band confirmed is the band a delayed check verified, never a band shown only since
      if (ver.verifiedLevel === null) status = `Shown at band ${band(ver.currentLevel!)}; a later check of that band is still to come. Next check due ${day(r.dueAt)}.`;
      else {
        status = v.mastered !== null ? `Mastered at band ${band(Math.min(v.mastered, ver.verifiedLevel))}, confirmed on ${day(ver.verifiedLevelAt)}. Next check due ${day(r.dueAt)}.` : `Confirmed at band ${band(ver.verifiedLevel)} on ${day(ver.verifiedLevelAt)}. Next check due ${day(r.dueAt)}.`;
        if (ver.currentLevel !== null && ver.currentLevel > ver.verifiedLevel) status += ` Band ${band(ver.currentLevel)} is shown, not yet confirmed by a later check.`;
      }
      break;
    case "demonstrated":
      status = `Shown at band ${band(ver.currentLevel!)} on ${day(r.firstDemonstratedAt)}. A first check is due ${day(r.dueAt)}.`;
      break;
    case "overdue":
      status = `Check due: not currently confirmed. ${r.lastVerifiedAt ? `Last confirmed on ${day(r.lastVerifiedAt)}` : `First shown on ${day(r.firstDemonstratedAt)}`}; the check was due ${day(r.dueAt)}.`;
      break;
    case "failed":
      status = `Needs review: the check on ${day(r.lastFailedAt)} did not confirm your earlier level, so it is not currently confirmed. Next check due ${day(r.dueAt)}.`;
      break;
    default:
      status = v.stage === "unassessed" ? "Not assessed yet." : "Not yet shown at a band.";
  }
  const current = ver.status === "verified" || ver.status === "demonstrated";
  const history =
    ver.historicalLevel !== null && (!current || ver.historicalLevel > (ver.currentLevel ?? -Infinity))
      ? `Earlier you showed band ${band(ver.historicalLevel)}. That is history, not a current result.`
      : null;
  return {
    capability: v.id,
    name: v.name,
    status,
    estimate: `Estimate ${v.mean.toFixed(1)} ± ${v.sd.toFixed(1)}: OpenPath's best guess from all your answers, old and new.`,
    history,
    currentlyVerified: current,
  };
}
