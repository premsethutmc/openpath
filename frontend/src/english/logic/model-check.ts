/**
 * Model check (developer dashboard): the production estimator and the research candidate (english-core
 * candidate.ts) scored on the same recorded answers. Read-only: records are replayed in this browser and nothing is
 * written back, shown to a learner, or used for any decision.
 */
import { type ModelComparison, compareModels } from "../../../../packages/english-core/src/index.ts";
import type { AppContent } from "./content.ts";
import { type AppEvent, isLedgerEvent } from "./events.ts";

export interface ModelCheck {
  comparison: ModelComparison;
  /** One sentence a product owner can read. */
  verdict: string;
}

export function modelCheck(content: AppContent, pupils: { id: string; events: AppEvent[] }[]): ModelCheck {
  const c = compareModels(
    content.ctx,
    pupils.map((p) => ({ learner: p.id, events: p.events.filter(isLedgerEvent) })),
  );
  let verdict: string;
  if (!c.answers) verdict = "No scored answers yet: nothing to compare.";
  else if (!c.enough) verdict = `Too little to judge: ${c.answers} scored answers from ${c.learners} ${c.learners === 1 ? "learner" : "learners"}. A comparison needs at least ${c.minAnswers} answers from ${c.minLearners} learners; the numbers below are shown only so the check can be seen working.`;
  else {
    const d = c.logLossDifference!;
    const who = `${c.learnersBetter} of ${c.learnersCompared} learners`;
    if (Math.abs(d) < 0.005) verdict = `No clear difference on ${c.answers} answers (the new model was better for ${who}).`;
    else verdict = d < 0 ? `The new model predicted these ${c.answers} answers better (for ${who}).` : `The live model predicted these ${c.answers} answers better (the new model was better for only ${who}).`;
  }
  return { comparison: c, verdict };
}
