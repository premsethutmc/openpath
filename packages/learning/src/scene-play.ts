/**
 * play@1: how the one player (frontend/src/year/Scene.tsx) plays a move: the pictures of `frames` one after another, and
 * the moves the learner makes meanwhile, queued in order so none is lost (lift@1: four quick presses are four floors).
 *
 * `live` is the state every new touch or press is worked out from: once a move is queued it is that queued state (not the
 * one on screen), so the next press builds on it. A move `queueable` refuses while pictures play (a lift button pressed
 * the wrong way while the car is still moving) is dropped at once rather than refused seconds later.
 *
 * No timers or screens here: the caller gives `later` (setTimeout in the app, a fake clock in tests) and hooks to show.
 */
import { frames, queueable, type Frame, type Scene, type SceneState } from "./scene";

export interface PlayHooks {
  /** the state the move ends in (set at once, before its pictures play) */
  state(next: SceneState): void;
  /** a picture in between, or null once the last one is reached */
  show(picture: SceneState | null): void;
  /** a picture's line and sound, as it is shown */
  frame(f: Frame): void;
  /** the move has played to its end */
  done(next: SceneState): void;
  /** a move queued while pictures play (tally tiles show it taken) */
  queued?(from: SceneState, to: SceneState): void;
  later(fn: () => void, ms: number): unknown;
  stop?(handle: unknown): void;
  /** reduced motion: pictures that are only movement are left out */
  still?(): boolean;
}

export class Playback {
  live: SceneState;
  private queue: SceneState | null = null;
  private timer: unknown = null;
  private scene: Scene;
  private h: PlayHooks;
  constructor(scene: Scene, state: SceneState, h: PlayHooks) { this.scene = scene; this.h = h; this.live = state; }
  get busy() { return this.timer !== null; }
  /** Play a move from `live` to `target` (or queue it while a move is still playing). False when it was dropped. */
  apply(target: SceneState): boolean {
    if (this.busy) {
      if (!queueable(this.scene, this.live, target)) return false;
      this.h.queued?.(this.live, target);
      this.queue = target; this.live = target;
      return true;
    }
    const still = this.h.still?.() ?? false;
    const fr = frames(this.scene, this.live, target).filter((f, i, all) => i === all.length - 1 || !(still && f.motion));
    const next = fr[fr.length - 1].state;
    this.live = next;
    this.h.state(next);
    const play = (k: number) => {
      this.h.frame(fr[k]);
      if (k >= fr.length - 1) {
        this.timer = null;
        this.h.show(null);
        this.h.done(next);
        const q = this.queue;
        if (q) { this.queue = null; this.live = next; this.apply(q); }
        return;
      }
      this.h.show(fr[k].state);
      this.timer = this.h.later(() => play(k + 1), fr[k].ms);
    };
    play(0);
    return true;
  }
  stop() { if (this.timer !== null) this.h.stop?.(this.timer); this.timer = null; this.queue = null; }
}
