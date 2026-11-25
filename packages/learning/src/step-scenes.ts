/**
 * step-scene@1: the counter and the lift (tally.ts) for a worked question whose steps are adding or taking away.
 *
 * A child who cannot yet do 0 + 2 cannot read "we keep a running total". For such a question "Break it down" shows the
 * steps happening: the counter starts where the question starts and the child drops one tile per step, in order.
 *
 * Strict on purpose: only the families listed here, and only when every step is "start", a pass-through (choosing or
 * writing the sum), or a +n / −n on the running value, and the lift ends on the question's answer. Anything else is
 * null (numbers too big for a lift are a different picture, later).
 */
import { problemOf } from "./families";
import type { Step } from "./family-kit";
import { check } from "./scene";
import { tallyAt, tallyClicks, type TallyScene } from "./tally";

type Kind = "count" | "money" | "change" | "integer" | "lift";
/** The families mapped, and what their numbers count. */
export const STEP_SCENE_FAMILIES: Record<string, Kind> = {
  aaadd: "count", // 6 + 11: start at 6, count on 11
  aasub: "count", // 15 − 5: start at 15, count back 5
  acstory9: "count", // a one-step story within 9 (the add and take-away kinds)
  acstory: "count", // a one-step story up to 30 (the add and take-away kinds; multiply and share are null)
  aastadd: "count", // story addition (only the sums that fit a lift)
  aastsub: "count", // story take-away (only the numbers that fit a lift)
  aamoney: "money", // the coins and notes in the picture, one at a time
  abcost: "money", // two prices together
  abchange: "change", // pay with a coin or note, take away the price
  aiint: "integer", // (−4) + 7, 5 − (−3) (only the numbers that fit a lift)
  ajintl: "integer", // move left or right on the number line (the move kind only)
  aimulti: "lift", // a start, up, down, up again (temperature, lift, diver)
};

const ADD = new Set(["add", "count on", "add the prices", "move"]);
const SUB = new Set(["subtract", "take away", "count back"]);
const PASS = new Set(["choose operation", "write the addition", "write the subtraction", "note"]);

/** The start and the tiles of a worked question, or null when its steps are not a clean add / take-away chain. */
export function chainOf(steps: Step[]): { start: number; tiles: number[] } | null {
  let start: number | null = null, at: number | null = null;
  const tiles: number[] = [];
  for (const s of steps) {
    if (s.op === "start at") {
      if (start !== null || typeof s.value !== "number") return null;
      start = at = s.value;
      continue;
    }
    if (PASS.has(s.op)) continue;
    const add = ADD.has(s.op);
    if (!add && !SUB.has(s.op)) return null;
    const [x, y, ...rest] = s.inputs;
    if (typeof x !== "number" || typeof y !== "number" || rest.some((r) => typeof r === "number") || typeof s.value !== "number") return null;
    if (at === null) start = at = x;
    if (x !== at) return null;
    const t = add ? y : -y;
    if (t === 0 || s.value !== at + t) return null;
    tiles.push(t);
    at += t;
  }
  return start === null || !tiles.length ? null : { start, tiles };
}

/**
 * The floors drawn: from 0 (or below, for negatives) to a little above the top, at most `span` apart (60; 30 for Class
 * 1–2, whose children count every floor). When 0 to the top is too far, a window of the floors the lift passes (from a
 * round number below), as long as it fits; else null.
 */
function floorsFor(clicks: number[], span = 60): [number, number] | null {
  const lo = Math.min(0, ...clicks), hi = Math.max(0, ...clicks);
  const padLo = lo < 0 ? Math.floor(lo / 5) * 5 : 0, padHi = Math.max(5, Math.ceil(hi / 5) * 5);
  if (padHi - padLo <= span) return [padLo, padHi];
  if (hi > lo && hi - lo <= span) return [lo, hi];
  const a = Math.min(...clicks), b = Math.max(...clicks);
  // (a window only for the Class 1–2 cap: there a shaft from 0 would be too many floors to count)
  if (a > 0 && span < 60) { const wl = Math.floor((a - 1) / 5) * 5, wh = Math.max(wl + 5, Math.ceil(b / 5) * 5); if (wh - wl <= span) return [wl, wh]; }
  return null;
}
/** young-lift@1: the most floors one tile may move for a Class 1–5 child (each is a click they count). */
export const MOST_PER_TILE = 20;

const one = (plural: string) => (plural === "children" ? "child" : plural.endsWith("oes") ? plural.slice(0, -2) : plural.replace(/s$/, ""));
/** The things a story counts ("How many balloons …" with a number of balloons in the story), or undefined. */
function thingsOf(prompt: string): string | undefined {
  const m = /How many ([a-z]+)/.exec(prompt);
  if (!m || /^(more|fewer|times|units|degrees|days|of)$/.test(m[1])) return undefined;
  const stem = one(m[1]);
  return new RegExp(`\\d+ (?:[a-z]+ )?${stem}`).test(prompt) ? m[1] : undefined;
}
const sign = (n: number) => (n < 0 ? `−${-n}` : String(n));

/**
 * The counter and the lift for the whole worked question `questionId` (one tile per step, in order), or null when the
 * question is not a clean adding / taking-away chain that fits a lift.
 */
export function stepScene(questionId: string, cls?: number | null): TallyScene | null {
  const fam = /^gen:([a-z0-9]+):/.exec(questionId)?.[1];
  const kind = fam ? STEP_SCENE_FAMILIES[fam] : undefined;
  const pr = kind ? problemOf(questionId) : null;
  if (!kind || !pr) return null;
  const chain = chainOf(pr.steps);
  if (!chain || chain.tiles.length > 8) return null;
  let { start, tiles } = chain;
  if (String(tallyAt(start, tiles, tiles.length)) !== String(pr.answer)) return null;
  // change-up@1: change is counted up from the price to the money given (₹48 → ₹49 → ₹50: ₹2 back) when that is
  // fewer clicks than taking the price away from it; the tile then says where it goes ("↑₹50"), not how far
  const up = kind === "change" && tiles.length === 1 && tiles[0] < 0 && start + tiles[0] > 0 && start + tiles[0] < -tiles[0];
  if (up) { const price = -tiles[0], given = start; start = price; tiles = [given - price]; }
  const end = tallyAt(start, tiles, tiles.length);
  // young-lift@1: a Class 1–5 child counts every click; a tile of more than 20 is a different picture (later)
  if (cls != null && cls <= 5 && tiles.some((t) => Math.abs(t) > MOST_PER_TILE)) return null;
  const clicks = tallyClicks(start, tiles);
  const negative = clicks.some((n) => n < 0);
  // only the integer families go below ground; a counting question that would is not one we picture
  if (negative && kind !== "integer" && kind !== "lift") return null;
  const floors = floorsFor(clicks, cls != null && cls <= 2 ? 30 : 60);
  if (!floors) return null;

  const adding = tiles.every((t) => t > 0), taking = tiles.every((t) => t < 0);
  const things = kind === "count" ? thingsOf(pr.prompt) : undefined;
  let unit: string | undefined, prompt: string, success: string;
  if (kind === "money" || kind === "change") {
    unit = "₹";
    const got = up ? tiles[0] : end, rupees = `${got} rupee${got === 1 ? "" : "s"}`;
    prompt = up ? `Count up from ₹${start} to ₹${end}.` : kind === "change" ? "Take away the price." : start !== 0 && tiles.length === 1 ? `Put ₹${tiles[0]} more in.` : tiles.every((t) => t <= 10) ? "Drop the coins in." : "Drop the money in.";
    success = kind === "change" ? `${rupees} back.` : `${rupees} in all.`;
  } else if (kind === "lift") {
    const ctx = pr.params[0];
    unit = ctx === 0 ? "°C" : ctx === 2 ? "m" : undefined;
    prompt = "Up, down, up. Drop them in.";
    success = ctx === 1 ? `Floor ${sign(end)}.` : `${sign(end)}${unit === "°C" ? " °C" : " m"}.`;
  } else {
    unit = things;
    const say = (n: number) => (things ? `${n} ${n === 1 ? one(things) : things}` : String(n));
    prompt = tiles.length > 1 ? "Drop them in, one by one." : kind === "integer" ? "Drop the tile in." : tiles[0] > 0 ? `Put ${tiles[0]} more in.` : `Take ${-tiles[0]} away.`;
    success = kind === "integer" ? `It stops at ${sign(end)}.` : adding ? `${say(end)} in all.` : taking ? `${say(end)} left.` : `${say(end)}.`;
  }
  // the goal is every tile in (the lift then stands on the answer): a question whose answer is its start (up 3, down 5,
  // up 2) is still a picture to work, where a goal on the total would be met before the first tile
  const scene: TallyScene = { type: "scene", kind: "tally", prompt, success, goal: { measure: "dropped", equals: tiles.length }, start, tiles, floors, ...(unit ? { unit } : {}), ...(up ? { goTo: true } : {}), ...(adding && tiles.length > 1 ? { anyOrder: true } : {}) };
  // the engine's whole check (the shape, the floors, a goal not met at the start and reachable): null only when it fails
  return check(scene).length ? null : scene;
}

/**
 * step-scene@1: what "Break it down" opens for a learner in class `cls` (the question's class):
 * - Class 1–5: the picture when there is one, and then no written reasons; with no picture, the written reasons only
 *   from Class 4 (a Class 1–3 child cannot read them).
 * - Class 6 and up: the written reasons, and the picture too when the question goes below 0.
 * An unknown class keeps the written reasons and shows no picture.
 */
export function breakItDown(questionId: string, cls: number | null): { scene: TallyScene | null; words: boolean } {
  if (cls === null) return { scene: null, words: true };
  const scene = stepScene(questionId, cls);
  if (cls <= 5) return scene ? { scene, words: false } : { scene: null, words: cls >= 4 };
  const below = !!scene && tallyClicks(scene.start, scene.tiles).some((n) => n < 0);
  return { scene: below ? scene : null, words: true };
}

/**
 * step-scene@1 where the child works the example ("Work it with me", the child build's lessons): the counter and the
 * lift for a Class 1–5 question (`cls`, the question's class) that has one, opened by "Break it down" above the steps.
 */
export function liftFor(questionId: string, cls: number | null): TallyScene | null {
  return cls !== null && cls <= 5 ? stepScene(questionId, cls) : null;
}
