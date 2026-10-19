/**
 * A thin layer over the browser's Web Animations API. No animation engine of
 * our own: the browser interpolates and composites transforms on the GPU; we
 * only describe keyframes and durations.
 *
 *  - speed: plays everything faster (used by the automated walkthrough);
 *  - reduced: the grown-up's "reduce motion" choice, which the rigs read to
 *    skip bobbing, bouncing and ambient movement.
 */

export interface MotionOptions {
  easing?: string;
  delay?: number;
  /** Keep the end state as the element's own style (for positions and poses). */
  commit?: boolean;
  iterations?: number;
  direction?: PlaybackDirection;
  composite?: CompositeOperation;
}

export class Motion {
  private running = new Set<Animation>();
  paused = false;

  constructor(
    public speed = 1,
    public reduced = false,
  ) {}

  animate(el: Element | null | undefined, keyframes: Keyframe[], ms: number, o: MotionOptions = {}): Animation | null {
    if (!el) return null;
    const a = el.animate(keyframes, {
      duration: Math.max(1, ms / this.speed),
      delay: (o.delay ?? 0) / this.speed,
      easing: o.easing ?? "ease-in-out",
      iterations: o.iterations ?? 1,
      direction: o.direction ?? "normal",
      fill: o.commit ? "forwards" : "none",
      composite: o.composite ?? "replace",
    });
    this.running.add(a);
    if (this.paused) a.pause();
    a.addEventListener("finish", () => {
      if (o.commit) {
        try {
          a.commitStyles();
        } catch {
          // An element that left the page cannot keep a style: nothing to keep.
        }
        a.cancel();
      }
      this.running.delete(a);
    });
    a.addEventListener("cancel", () => this.running.delete(a));
    return a;
  }

  /** A repeating movement, cancelled by the caller. */
  loop(el: Element | null | undefined, keyframes: Keyframe[], ms: number, o: MotionOptions = {}) {
    return this.animate(el, keyframes, ms, { ...o, iterations: Infinity });
  }

  pauseAll() {
    this.paused = true;
    for (const a of this.running) a.pause();
  }

  resumeAll() {
    this.paused = false;
    for (const a of this.running) if (a.playState === "paused") a.play();
  }
}

/**
 * Run fn after ms of animation time. It is an animation itself, so it pauses
 * with everything else and respects the playback speed. Returns a canceller.
 */
export function after(motion: Motion, ms: number, fn: () => void): () => void {
  const timerEl = (after.el ??= Object.assign(document.createElement("i"), { hidden: true }));
  if (!timerEl.isConnected) document.body.append(timerEl);
  const a = motion.animate(timerEl, [{ opacity: 0 }, { opacity: 0 }], ms);
  let live = true;
  a?.finished.then(
    () => live && fn(),
    () => {},
  );
  return () => {
    live = false;
    a?.cancel();
  };
}
after.el = null as HTMLElement | null;
