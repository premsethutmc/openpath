/**
 * Deterministic step durations. The story's timing comes from the episode data
 * (or these defaults), never from how long an animation or a speech voice
 * happens to take on a particular phone. That keeps playback testable and the
 * same on every device.
 */
import type { Step } from "./types.ts";

/** Default length of each character action, in milliseconds. */
export const ACTION_MS: Record<string, number> = {
  idle: 0,
  place: 0,
  walk: 2400,
  run: 1400,
  fly: 2200,
  hop: 700,
  jump: 900,
  look: 900,
  blink: 300,
  turn: 400,
  react: 1400,
  sleep: 0,
  wake: 2200,
  stretch: 1800,
  yawn: 1600,
  sit: 800,
  stand: 700,
  eat: 2400,
  pickup: 900,
  give: 1200,
  wash: 2600,
  wave: 1400,
  peck: 900,
  flap: 1000,
  dance: 2400,
  "rub-tummy": 1600,
  sniff: 1400,
  point: 1000,
};

export const PROP_MS: Record<string, number> = {
  show: 500,
  hide: 500,
  move: 1200,
  fall: 1300,
  wobble: 900,
  glow: 1200,
  attach: 0,
  detach: 0,
  variant: 400,
  badge: 300,
};

/**
 * How long a spoken line holds the story: unhurried for young children, with
 * room for a slow placeholder voice. About 0.42 s a word plus a breath.
 */
export function speechMs(line: string): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(1100 + words * 420);
}

/** How long a step holds the story before the next step starts. Interactions are timed by the runner. */
export function stepMs(step: Step): number {
  switch (step.do) {
    case "scene":
      return step.ms ?? (step.transition === "cut" ? 0 : 1200);
    case "say":
      return step.ms ?? speechMs(step.line);
    case "act":
      if (step.wait === false) return 0;
      return step.ms ?? ACTION_MS[step.action] ?? 1000;
    case "prop":
      if (step.wait === false) return 0;
      return step.ms ?? PROP_MS[step.action] ?? 600;
    case "wait":
      return step.ms;
    case "sound":
      return step.ms ?? 0;
    case "together":
      return Math.max(0, ...step.steps.map(stepMs));
    default:
      return 0;
  }
}
