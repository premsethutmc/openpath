/**
 * Reusable learning interactions.
 *
 * A primitive is a small pure state machine: it starts with the targets of an
 * interaction window, receives the child's touches, and decides when the window
 * has an outcome. It never draws anything and never measures time; the runner
 * owns the clock and the player owns the pictures.
 *
 * Every primitive lists its outcomes, always including "timeout". The validator
 * checks that an episode gives each outcome a track, so there is no dead end and
 * no "wrong answer" screen: a non-matching choice is just another branch of the
 * story.
 */

export interface Target {
  id: string;
  tags: Record<string, string | number>;
}

export type Input =
  | { type: "tap"; target: string }
  | { type: "drop"; item: string; on: string | null };

/** Something the player should show straight away, e.g. "this apple was counted as 2". */
export type Feedback =
  | { kind: "counted"; target: string; n: number }
  | { kind: "picked"; target: string }
  | { kind: "returned"; target: string }
  | { kind: "placed"; target: string; on: string }
  | { kind: "noticed"; target: string };

export interface PrimitiveState {
  targets: Target[];
  params: Record<string, string | number>;
  touched: string[];
  /** Primitive-specific memory. */
  data: Record<string, unknown>;
}

export interface StepResult {
  state: PrimitiveState;
  feedback?: Feedback;
  outcome?: string;
  /** The target to bind to $<bind> when the window closes with this outcome. */
  chosen?: string;
}

export interface Primitive {
  name: string;
  /** What the child does, for documentation and the player. */
  gesture: "tap" | "drag" | "none";
  outcomes: readonly string[];
  /** Parameters an episode must supply. */
  requiredParams?: readonly string[];
  /** Tags every target must carry. */
  requiredTags?: (params: Record<string, string | number>) => string[];
  input(state: PrimitiveState, input: Input): StepResult;
}

export function initialState(targets: Target[], params: Record<string, string | number> = {}): PrimitiveState {
  return { targets, params, touched: [], data: {} };
}

const isTarget = (state: PrimitiveState, id: string) => state.targets.some((t) => t.id === id);
const tagOf = (state: PrimitiveState, id: string, key: string) => state.targets.find((t) => t.id === id)?.tags[key];
const touch = (state: PrimitiveState, id: string): PrimitiveState => ({ ...state, touched: [...state.touched, id] });

/** Tap any target. The tapped one is chosen. */
const tap: Primitive = {
  name: "tap",
  gesture: "tap",
  outcomes: ["tapped", "timeout"],
  input(state, input) {
    if (input.type !== "tap" || !isTarget(state, input.target)) return { state };
    return { state: touch(state, input.target), feedback: { kind: "picked", target: input.target }, outcome: "tapped", chosen: input.target };
  },
};

/** Cause and effect: touching the cause makes it happen now; otherwise it happens by itself. */
const observe: Primitive = {
  name: "observe",
  gesture: "tap",
  outcomes: ["triggered", "timeout"],
  input(state, input) {
    if (input.type !== "tap" || !isTarget(state, input.target)) return { state };
    return { state: touch(state, input.target), feedback: { kind: "noticed", target: input.target }, outcome: "triggered", chosen: input.target };
  },
};

/** Count objects by touching each one. Touching one twice does not count it twice. */
const count: Primitive = {
  name: "count",
  gesture: "tap",
  outcomes: ["counted", "timeout"],
  input(state, input) {
    if (input.type !== "tap" || !isTarget(state, input.target)) return { state };
    if (state.touched.includes(input.target)) return { state };
    const next = touch(state, input.target);
    const n = next.touched.length;
    const done = n === state.targets.length;
    return {
      state: next,
      feedback: { kind: "counted", target: input.target, n },
      outcome: done ? "counted" : undefined,
    };
  },
};

/** Drag an object onto a place (params.zone). A drop elsewhere gently returns it. */
const drag: Primitive = {
  name: "drag",
  gesture: "drag",
  outcomes: ["placed", "timeout"],
  requiredParams: ["zone"],
  input(state, input) {
    if (input.type !== "drop" || !isTarget(state, input.item)) return { state };
    if (input.on === state.params.zone) {
      return {
        state: touch(state, input.item),
        feedback: { kind: "placed", target: input.item, on: String(input.on) },
        outcome: "placed",
        chosen: input.item,
      };
    }
    return { state: touch(state, input.item), feedback: { kind: "returned", target: input.item } };
  },
};

/**
 * Tap the target whose tag matches what the story asked for. A different choice
 * is not an error: it has its own outcome, "other", and its own warm branch.
 */
function matching(name: string, tag: string, param: string): Primitive {
  return {
    name,
    gesture: "tap",
    outcomes: ["match", "other", "timeout"],
    requiredParams: [param],
    requiredTags: () => [tag],
    input(state, input) {
      if (input.type !== "tap" || !isTarget(state, input.target)) return { state };
      const same = String(tagOf(state, input.target, tag)) === String(state.params[param]);
      return {
        state: touch(state, input.target),
        feedback: { kind: "picked", target: input.target },
        outcome: same ? "match" : "other",
        chosen: input.target,
      };
    },
  };
}

/**
 * Compare two quantities or sizes: params.want is "more", "fewer", "bigger" or
 * "smaller"; params.by names the numeric tag ("quantity" or "size").
 */
const compare: Primitive = {
  name: "compare",
  gesture: "tap",
  outcomes: ["match", "other", "timeout"],
  requiredParams: ["want", "by"],
  requiredTags: (params) => [String(params.by)],
  input(state, input) {
    if (input.type !== "tap" || !isTarget(state, input.target)) return { state };
    const by = String(state.params.by);
    const values = state.targets.map((t) => Number(t.tags[by]));
    const mine = Number(tagOf(state, input.target, by));
    const wantHigh = state.params.want === "more" || state.params.want === "bigger";
    const best = wantHigh ? Math.max(...values) : Math.min(...values);
    return {
      state: touch(state, input.target),
      feedback: { kind: "picked", target: input.target },
      outcome: mine === best ? "match" : "other",
      chosen: input.target,
    };
  },
};

export const PRIMITIVES: Record<string, Primitive> = Object.fromEntries(
  [
    tap,
    observe,
    count,
    drag,
    matching("choose-colour", "colour", "colour"),
    matching("match-shape", "shape", "shape"),
    matching("identify-animal", "animal", "animal"),
    compare,
  ].map((p) => [p.name, p]),
);
