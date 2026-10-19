/**
 * The story runner: plays an episode's tracks step by step.
 *
 * It is deterministic. Given the same episode, level and touches at the same
 * story times, it visits the same steps at the same times. Pictures and sound
 * are delegated to a Director (the browser player, or a recording fake in
 * tests); time comes from a Clock.
 *
 * Story → opportunity to interact → natural consequence → story continues:
 * an interaction window opens, the child may touch something, and the window
 * closes with an outcome (a touch, or "timeout" when nothing happened). The
 * runner then plays that outcome's track, which leads back into the story.
 */
import { type Clock, sleep } from "./clock.ts";
import { type LearningEventSink, discardEvents } from "./events.ts";
import { type Feedback, type Input, PRIMITIVES, type Target, initialState } from "./primitives.ts";
import { stepMs } from "./timing.ts";
import type { Episode, InteractStep, Level, Step } from "./types.ts";

export interface WindowSpec {
  id: string;
  primitive: string;
  gesture: "tap" | "drag" | "none";
  targets: string[];
  params: Record<string, string | number>;
}

export interface Director {
  /** Start a step's pictures and sounds. It must return at once; the runner does the waiting. */
  perform(step: Step, ms: number): void;
  /** Make targets touchable; send the child's touches to `input`. Returns a function that closes the window. */
  openWindow(spec: WindowSpec, input: (input: Input) => void): () => void;
  /** Show immediate feedback for a touch (a counted number, a picked apple). */
  feedback(spec: WindowSpec, feedback: Feedback): void;
}

export interface RunOptions {
  level?: Level;
  sink?: LearningEventSink;
  /** Called before each step starts, with its track and position. */
  onStep?: (track: string, index: number, step: Step, at: number) => void;
  onOutcome?: (interaction: string, outcome: string, at: number) => void;
}

export interface RunResult {
  /** Tracks in the order they were played. */
  path: string[];
  outcomes: Record<string, string>;
  vars: Record<string, string>;
  startedAt: number;
  endedAt: number;
  stopped: boolean;
}

/** Replace "$name" strings in a step with remembered values (e.g. the apple the child chose). */
export function resolveVars<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === "string") {
    return (value.startsWith("$") && value.slice(1) in vars ? vars[value.slice(1)] : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => resolveVars(v, vars)) as T;
  if (value && typeof value === "object") {
    // Hints and nested steps are resolved when they play, not now.
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "steps" || k === "hint" ? v : resolveVars(v, vars)])) as T;
  }
  return value;
}

/**
 * Fill "{choice.colour}" in a line with a tag of the remembered prop, so a line
 * can name what the child chose ("A green apple!") without a branch per colour.
 */
export function fillLine(line: string, vars: Record<string, string>, episode: Episode): string {
  return line.replace(/\{([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\}/g, (whole, name: string, tag: string) => {
    const prop = vars[name];
    const value = prop ? episode.props[prop]?.tags?.[tag] : undefined;
    return value === undefined ? whole : String(value);
  });
}

export const includedAt = (step: Step, level: Level) => !step.level || step.level.includes(level);

export class Runner {
  private stopped = false;
  private wake: (() => void) | null = null;
  readonly vars: Record<string, string> = {};

  constructor(
    readonly episode: Episode,
    private readonly director: Director,
    private readonly clock: Clock,
    private readonly options: RunOptions = {},
  ) {}

  get level(): Level {
    return this.options.level ?? "younger";
  }

  /** Stop playing (leaving the player). The current wait ends at once. */
  stop() {
    this.stopped = true;
    this.wake?.();
  }

  private async hold(ms: number) {
    if (this.stopped) return;
    await new Promise<void>((resolve) => {
      this.wake = resolve;
      void sleep(this.clock, ms).then(resolve);
    });
    this.wake = null;
  }

  async run(): Promise<RunResult> {
    const result: RunResult = { path: [], outcomes: {}, vars: this.vars, startedAt: this.clock.now(), endedAt: 0, stopped: false };
    let track: string | null = this.episode.start;
    const visited = new Set<string>();

    while (track !== null && !this.stopped) {
      if (visited.has(track)) throw new Error(`track "${track}" played twice: the story would loop`);
      visited.add(track);
      result.path.push(track);
      const steps: Step[] = this.episode.tracks[track] ?? [];
      let next: string | null = null;
      let ended = false;

      for (let i = 0; i < steps.length && !this.stopped; i++) {
        const step = this.prepare(steps[i]);
        if (!includedAt(step, this.level)) continue;
        this.options.onStep?.(track, i, step, this.clock.now());

        if (step.do === "end") {
          ended = true;
          break;
        }
        if (step.do === "goto") {
          next = step.track;
          break;
        }
        if (step.do === "interact") {
          const outcome = await this.interact(step);
          result.outcomes[step.id] = outcome;
          next = step.outcomes[outcome];
          break;
        }
        await this.play(step);
      }

      if (ended) break;
      if (next === null && !this.stopped) throw new Error(`track "${track}" ends without "goto" or "end"`);
      track = next;
    }

    result.endedAt = this.clock.now();
    result.stopped = this.stopped;
    return result;
  }

  private prepare(raw: Step): Step {
    const step = resolveVars(raw, this.vars);
    return step.do === "say" ? { ...step, line: fillLine(step.line, this.vars, this.episode) } : step;
  }

  /** Start a step (and, for "together", all its parts) and hold the story for its length. */
  private async play(step: Step) {
    this.start(step);
    await this.hold(stepMs(step));
  }

  private start(step: Step) {
    if (step.do === "together") {
      for (const part of step.steps) {
        const resolved = this.prepare(part);
        if (includedAt(resolved, this.level)) this.start(resolved);
      }
      return;
    }
    // An action that does not hold the story ("wait": false) still animates for its own length.
    this.director.perform(step, step.do === "act" || step.do === "prop" ? stepMs({ ...step, wait: true }) : stepMs(step));
  }

  private interact(step: InteractStep): Promise<string> {
    const primitive = PRIMITIVES[step.primitive];
    if (!primitive) throw new Error(`unknown interaction "${step.primitive}"`);
    const targets: Target[] = step.targets.map((id) => ({ id, tags: this.episode.props[id]?.tags ?? {} }));
    const spec: WindowSpec = {
      id: step.id,
      primitive: step.primitive,
      gesture: primitive.gesture,
      targets: step.targets,
      params: step.params ?? {},
    };
    const openedAt = this.clock.now();

    return new Promise<string>((resolve) => {
      let state = initialState(targets, spec.params);
      let closed = false;
      let close = () => {};
      const cancels: Array<() => void> = [];

      const finish = (outcome: string, chosen?: string) => {
        if (closed) return;
        closed = true;
        cancels.forEach((c) => c());
        close();
        if (chosen && step.bind) this.vars[step.bind] = chosen;
        const engaged = state.touched.length > 0;
        (this.options.sink ?? discardEvents).report({
          schema: "openpath-kids/learning-event@1",
          episode: this.episode.id,
          interaction: step.id,
          primitive: step.primitive,
          objective: step.objective ?? null,
          level: this.level,
          outcome,
          engaged,
          touched: [...state.touched],
          openFor: this.clock.now() - openedAt,
          evidence: engaged ? "participation" : "exposure",
          claimsMastery: false,
        });
        this.options.onOutcome?.(step.id, outcome, this.clock.now());
        resolve(outcome);
      };

      cancels.push(this.clock.after(step.window, () => finish("timeout")));
      if (step.hint?.length && step.hintAfter !== undefined) {
        cancels.push(
          this.clock.after(step.hintAfter, () => {
            void this.playHint(step.hint ?? [], () => closed);
          }),
        );
      }
      if (this.stopped) return finish("timeout");
      close = this.director.openWindow(spec, (input) => {
        if (closed) return;
        const r = primitive.input(state, input);
        state = r.state;
        if (r.feedback) this.director.feedback(spec, r.feedback);
        if (r.outcome) finish(r.outcome, r.chosen);
      });
    });
  }

  /** A hint plays alongside an open window and stops as soon as the window closes. */
  private async playHint(steps: Step[], isClosed: () => boolean) {
    for (const raw of steps) {
      if (isClosed() || this.stopped) return;
      const step = this.prepare(raw);
      if (!includedAt(step, this.level)) continue;
      this.start(step);
      await sleep(this.clock, stepMs(step));
    }
  }
}
