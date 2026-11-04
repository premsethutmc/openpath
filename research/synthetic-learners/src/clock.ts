/** Deterministic simulation clock (synthetic-clock@1): time moves only when the harness advances it; nothing reads the real clock. */
export const CLOCK_VERSION = "synthetic-clock@1" as const;
export const DAY_MS = 86_400_000;
export class SimClock {
  private t: number;
  constructor(start: number) { if (!Number.isFinite(start)) throw new Error("clock start must be a finite instant"); this.t = start; }
  get now(): number { return this.t; }
  iso(): string { return new Date(this.t).toISOString(); }
  advanceDays(days: number): number { if (!(days >= 0) || !Number.isFinite(days)) throw new Error("time only moves forward"); this.t += days * DAY_MS; return this.t; }
  advanceMs(ms: number): number { if (!(ms >= 0)) throw new Error("time only moves forward"); this.t += ms; return this.t; }
}
