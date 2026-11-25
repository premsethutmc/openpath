/**
 * tally@1: the counter and the lift. A picture for adding and taking away that a child who cannot yet read can follow.
 *
 * A big counter stands beside a lift: floors above ground are positive, ground is 0, the basement floors are negative
 * (as a child knows from a mall lift: B1, B2 …). The learner drops tiles one at a time. A "+n" tile (one colour) moves
 * the lift up n floors and a "−n" tile (another colour) moves it down n. The counter does not jump: it clicks through
 * every number in between, which is counting on and counting back, and it pauses for a beat when it passes 0.
 *
 * Where it is used: Class 1–2 adding (only + tiles, floors from 0), Class 3–4 taking away (− tiles, never below 0),
 * Class 6–7 integers (below 0). Money and objects are the same picture with a `unit`.
 *
 * lift@1: a tally scene that counts floors (no ₹, °C or m, and not change counted up) is drawn and worked as a lift ride
 * instead (lift.ts: a building with Chintu in the lift and a ▲ ▼ panel, one press per floor); money and thermometers keep
 * the counter and tiles described here.
 *
 * This file holds the description and the arithmetic only. The scene engine (scene.ts) gives it controls, a goal and a
 * drawing, and the one player (frontend/src/year/Scene.tsx) draws it. step-scenes.ts builds one from a worked question.
 */
export interface TallyScene {
  type: "scene";
  kind: "tally";
  /** What to do, in one short sentence (few words: the child may not read well; it is also read aloud). */
  prompt: string;
  /** Shown once the goal is reached. */
  success: string;
  goal: { measure: "total" | "dropped"; equals: number };
  /** Where the counter and the lift start. */
  start: number;
  /** The tiles to drop, in order: +n goes up n, −n goes down n. Never 0. */
  tiles: number[];
  /** The floors drawn, lowest and highest (lowest is 0 when the class has not met negative numbers). */
  floors: [number, number];
  /** What is being counted, when it is not just numbers ("₹", "marbles"). */
  unit?: string;
  /** change-up@1: each tile says the floor it takes the lift to ("↑₹50"), not how far it goes, so the size (the answer,
   *  in counting up for change) is found by the child; it is written on the tile's bracket once the lift is there. */
  goTo?: boolean;
  /** The tiles may be dropped in any order (adding); otherwise in the order given. */
  anyOrder?: boolean;
  quiet?: boolean;
}

/** Every number the counter shows, from the start through each click to the end: the counting a child does. */
export function tallyClicks(start: number, tiles: number[]): number[] {
  const out = [start];
  let at = start;
  for (const t of tiles) for (let k = 0; k < Math.abs(t); k++) out.push((at += Math.sign(t)));
  return out;
}

/** Where the counter stands after the first `dropped` tiles. */
export const tallyAt = (start: number, tiles: number[], dropped: number) => start + tiles.slice(0, dropped).reduce((a, b) => a + b, 0);

/** Problems with a description (empty when it is sound): every number it passes must be on a drawn floor. */
export function tallyProblems(s: TallyScene): string[] {
  const bad: string[] = [];
  if (!Number.isInteger(s.start) || !s.tiles.length || s.tiles.some((t) => !Number.isInteger(t) || t === 0)) bad.push("whole-number start and non-zero whole tiles are needed");
  if (s.tiles.length > 8) bad.push("at most 8 tiles");
  const [lo, hi] = s.floors;
  if (!(Number.isInteger(lo) && Number.isInteger(hi) && lo < hi && hi - lo <= 60)) bad.push("floors from low to high, at most 60 apart");
  const clicks = tallyClicks(s.start, s.tiles);
  if (clicks.some((n) => n < lo || n > hi)) bad.push("the lift would leave the drawn floors");
  return bad;
}
