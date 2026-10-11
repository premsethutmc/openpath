/**
 * Collects what the learner does as plain events.
 *
 * Activities describe actions ("item_added"), never judgements ("correct").
 * Deciding what the actions mean is the assessment engine's job, so the same
 * recording can be re-assessed when the rules improve.
 */
import type { EvidenceEvent } from "./types";

export class EvidenceRecorder {
  readonly events: EvidenceEvent[] = [];
  private readonly startedAt = performance.now();
  private round: string | null = null;

  startRound(roundId: string, spec: Record<string, unknown>): void {
    this.round = roundId;
    this.record("round_started", spec);
  }

  record(type: string, data: Record<string, unknown> = {}): void {
    this.events.push({
      seq: this.events.length,
      type,
      t: Math.round(performance.now() - this.startedAt),
      round: this.round,
      data,
    });
  }
}
