/**
 * Clocks. The runner only ever waits through a Clock, so tests can play a whole
 * episode in virtual time and the player can pause the story.
 */

export interface Clock {
  now(): number;
  /** Call fn after ms (of story time). Returns a function that cancels it. */
  after(ms: number, fn: () => void): () => void;
}

export const sleep = (clock: Clock, ms: number) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) return void queueMicrotask(resolve);
    clock.after(ms, resolve);
  });

interface Timer {
  due: number;
  seq: number;
  fn: () => void;
  cancelled: boolean;
}

/**
 * Virtual time for tests: nothing happens until advance() or runUntilIdle(), and
 * timers fire in time order, with their promise continuations settled between
 * them. Inputs can be scheduled at exact story times with at().
 */
export class SimClock implements Clock {
  private t = 0;
  private seq = 0;
  private timers: Timer[] = [];

  now() {
    return this.t;
  }

  after(ms: number, fn: () => void) {
    const timer: Timer = { due: this.t + Math.max(0, ms), seq: this.seq++, fn, cancelled: false };
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  }

  /** Schedule something (usually a child's touch) at an absolute story time. */
  at(time: number, fn: () => void) {
    return this.after(time - this.t, fn);
  }

  private next(): Timer | undefined {
    this.timers = this.timers.filter((t) => !t.cancelled);
    this.timers.sort((a, b) => a.due - b.due || a.seq - b.seq);
    return this.timers[0];
  }

  /** Let pending promise callbacks run (the runner awaits between steps). */
  static async settle() {
    for (let i = 0; i < 20; i++) await new Promise<void>((r) => setImmediate(r));
  }

  /** Run timers until none is left or `limit` ms of story time has passed. */
  async runUntilIdle(limit = 60 * 60 * 1000) {
    await SimClock.settle();
    for (;;) {
      const timer = this.next();
      if (!timer || timer.due > limit) return;
      this.timers.shift();
      this.t = timer.due;
      timer.fn();
      await SimClock.settle();
    }
  }
}

/**
 * Real time that can be paused: while paused, story time stops, so a child who
 * puts the tablet down (or a grown-up who presses pause) misses nothing.
 */
export class PausableClock implements Clock {
  private pausedAt: number | null = null;
  private offset = 0;
  private timers = new Map<number, { due: number; fn: () => void; handle: ReturnType<typeof setTimeout> | null }>();
  private ids = 0;

  /** speed > 1 plays story time faster than real time (used by the browser walkthrough). */
  constructor(
    readonly speed = 1,
    private readonly real: () => number = () => performance.now(),
  ) {}

  now() {
    return ((this.pausedAt ?? this.real()) - this.offset) * this.speed;
  }

  get paused() {
    return this.pausedAt !== null;
  }

  after(ms: number, fn: () => void) {
    const id = this.ids++;
    const timer = { due: this.now() + Math.max(0, ms), fn, handle: null as ReturnType<typeof setTimeout> | null };
    this.timers.set(id, timer);
    if (!this.paused) this.arm(id);
    return () => {
      const t = this.timers.get(id);
      if (t?.handle) clearTimeout(t.handle);
      this.timers.delete(id);
    };
  }

  private arm(id: number) {
    const t = this.timers.get(id);
    if (!t) return;
    t.handle = setTimeout(() => {
      this.timers.delete(id);
      t.fn();
    }, Math.max(0, (t.due - this.now()) / this.speed));
  }

  pause() {
    if (this.paused) return;
    this.pausedAt = this.real();
    for (const t of this.timers.values()) {
      if (t.handle) clearTimeout(t.handle);
      t.handle = null;
    }
  }

  resume() {
    if (this.pausedAt === null) return;
    this.offset += this.real() - this.pausedAt;
    this.pausedAt = null;
    for (const id of this.timers.keys()) this.arm(id);
  }
}
