/**
 * The OpenPath Kids episode format (openpath-kids/episode@1).
 *
 * An episode is plain data: characters, scenes, props, named places and a set of
 * tracks. A track is a list of steps played one after another. Tracks end with
 * `goto` (jump to another track) or `end`. Interaction windows branch to a track
 * for every outcome, including "timeout", so the story always carries on when the
 * child does nothing.
 *
 * Nothing in this file knows about the browser. The same episode runs in the
 * player, in tests and in the validator.
 */

export const EPISODE_FORMAT = "openpath-kids/episode@1";

/** Developmental level chosen by a grown-up: about 3–4 years, or about 5–7 years. */
export type Level = "younger" | "older";
export const LEVELS: readonly Level[] = ["younger", "older"];

export interface Point {
  x: number;
  y: number;
}

/** A place on the stage: coordinates, or the name of a point or prop. */
export type Place = Point | string;

export interface Objective {
  id: string;
  /** One of the early-learning themes, e.g. "counting", "colours", "vocabulary". */
  theme: string;
  description: string;
}

export interface Voice {
  /** 1 is a normal voice; higher sounds younger or smaller. */
  pitch?: number;
  rate?: number;
  /** Placeholder until the family voice system exists: a BCP-47 language tag. */
  lang?: string;
}

export interface CharacterDef {
  /** The art rig that draws and animates this character, e.g. "chintoo", "bird". */
  rig: string;
  voice?: Voice;
  at: Place;
  facing?: "left" | "right";
  scale?: number;
  hidden?: boolean;
}

export interface PropDef {
  /** The art asset, e.g. "apple", "basket". */
  asset: string;
  /** Look of the asset, e.g. "red", "green", "muddy". */
  variant?: string;
  at: Place;
  scale?: number;
  hidden?: boolean;
  /** Facts an interaction can check: colour, shape, animal, quantity, size. */
  tags?: Record<string, string | number>;
  /** Draw in front of characters instead of behind them. */
  front?: boolean;
  /** Only show this prop while this background is on stage. Omitted: every background. */
  background?: string;
}

export interface BackgroundDef {
  /** The art scene, e.g. "bedroom", "garden". */
  scene: string;
}

interface StepBase {
  /** Play this step only at these levels. Omitted: every level. */
  level?: Level[];
}

export interface SceneStep extends StepBase {
  do: "scene";
  background: string;
  transition?: "fade" | "cut";
  ms?: number;
}

export interface SayStep extends StepBase {
  do: "say";
  who: string;
  line: string;
  /** How long the line holds the story. Omitted: estimated from the words. */
  ms?: number;
  mood?: Mood;
}

export type Mood = "happy" | "sad" | "surprised" | "hungry" | "sleepy" | "yuck" | "proud" | "neutral";

export interface ActStep extends StepBase {
  do: "act";
  who: string;
  action: string;
  to?: Place;
  /** For reactions and expressions. */
  mood?: Mood;
  /** A prop used by the action (pick up, eat, wash). */
  prop?: string;
  face?: "left" | "right";
  /** Move so that the character's hand (or beak) reaches "to", rather than its feet. */
  reach?: boolean;
  ms?: number;
  /** false: start the action and move on at once (it runs alongside the next steps). */
  wait?: boolean;
}

export interface PropStep extends StepBase {
  do: "prop";
  id: string;
  action: "show" | "hide" | "move" | "fall" | "wobble" | "glow" | "attach" | "detach" | "variant" | "badge";
  to?: Place;
  /** For attach: the character that holds the prop. */
  who?: string;
  /** For variant: the new look. */
  variant?: string;
  /** For badge: a short label shown above the prop, such as a number. Empty removes it. */
  text?: string;
  ms?: number;
  wait?: boolean;
}

export interface WaitStep extends StepBase {
  do: "wait";
  ms: number;
}

export interface TogetherStep extends StepBase {
  do: "together";
  steps: Step[];
}

export interface SoundStep extends StepBase {
  do: "sound";
  sound: string;
  ms?: number;
}

export interface InteractStep extends StepBase {
  do: "interact";
  /** Unique within the episode; used in learning events. */
  id: string;
  primitive: string;
  /** Props the child can touch. */
  targets: string[];
  objective?: string;
  /** How long the window stays open before the story carries on by itself. */
  window: number;
  /** After this long without a touch, play the hint steps (a gentle nudge, never a demand). */
  hintAfter?: number;
  hint?: Step[];
  params?: Record<string, string | number>;
  /** Track to play for each outcome. Every outcome of the primitive must be listed. */
  outcomes: Record<string, string>;
  /** Remember the touched target as $<bind> for later steps, e.g. "choice" -> "$choice". */
  bind?: string;
}

export interface GotoStep extends StepBase {
  do: "goto";
  track: string;
}

export interface EndStep extends StepBase {
  do: "end";
}

export type Step =
  | SceneStep
  | SayStep
  | ActStep
  | PropStep
  | WaitStep
  | TogetherStep
  | SoundStep
  | InteractStep
  | GotoStep
  | EndStep;

export interface Episode {
  format: typeof EPISODE_FORMAT;
  id: string;
  title: string;
  ages: [number, number];
  objectives: Objective[];
  characters: Record<string, CharacterDef>;
  backgrounds: Record<string, BackgroundDef>;
  props: Record<string, PropDef>;
  points?: Record<string, Point>;
  /** Track to start with. */
  start: string;
  tracks: Record<string, Step[]>;
}
