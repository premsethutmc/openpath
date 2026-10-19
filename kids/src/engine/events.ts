/**
 * Learning interaction reports: the integration point with OpenPath.
 *
 * OpenPath Kids stays independent of the OpenPath core. It only describes what
 * happened in an interaction window, through a LearningEventSink that a future
 * adapter can forward to OpenPath's competency system.
 *
 * These events are deliberately weak evidence:
 *  - "exposure": the child saw the concept (the window closed by itself);
 *  - "participation": the child touched something in the window.
 * Neither is mastery. `claimsMastery` is the literal `false`, so an adapter
 * cannot read an event as a mastery claim without changing this type. Nothing
 * here writes to the OpenPath evidence ledger or touches its verification policy.
 *
 * No personal data: an event names the episode, the interaction and what was
 * touched, never the child. The default sink keeps nothing.
 */

export type EvidenceLevel = "exposure" | "participation";

export interface LearningEvent {
  schema: "openpath-kids/learning-event@1";
  episode: string;
  interaction: string;
  primitive: string;
  objective: string | null;
  level: string;
  outcome: string;
  /** Did the child touch anything during the window? */
  engaged: boolean;
  /** Targets touched, in order. */
  touched: string[];
  /** Story time (ms) from the window opening to its outcome. */
  openFor: number;
  evidence: EvidenceLevel;
  claimsMastery: false;
}

export interface LearningEventSink {
  report(event: LearningEvent): void;
}

/** Keeps nothing. The default for the prototype. */
export const discardEvents: LearningEventSink = { report() {} };

/** Keeps events in memory for this session only (tests, the grown-up panel). */
export class MemorySink implements LearningEventSink {
  readonly events: LearningEvent[] = [];
  report(event: LearningEvent) {
    this.events.push(event);
  }
}
