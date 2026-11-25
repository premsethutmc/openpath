/**
 * lift@1: the lift ride, the look of a tally scene (tally.ts) that counts floors: the product owner's approved mock
 * (a building cut open, with Chintu in the lift and a lift panel beside it). Every tally scene without ₹, °C or m, and
 * not change counted up, is a lift ride; money and thermometers keep the counter and tiles.
 *
 * 1. The building shows only the floors the ride needs, with a floor of margin: floors above the ground in sky rows,
 *    floor 0 the gold shop with a thick ground line under it, the car park (minus floors, 🚗) below. The floor Chintu is
 *    on has its number in gold.
 * 2. The child taps Start. "Chintu is on floor three." Then the first move, written on the task card ("▼ 5", one dot per
 *    floor) and said: "Go down five floors. Press down, five times." A finger shows one press ("two."), then "Now you.
 *    Four more."
 * 3. One press of the glowing button is one floor: the doors close, the car moves one floor, the doors open, a ding, and
 *    the floor is said ("minus one"; 0 is "zero. The shop."). The other button is dimmed; pressed, it shakes and says
 *    "Down, not up." Presses made while the car is moving wait their turn (the player queues them): none is lost.
 * 4. After each move the sum so far is shown (3 − 5 = −2) and said with where Chintu is; then the next move. At the end
 *    the whole sum (3 − 5 + 4 = 2) is shown and said ("Three, minus five, plus four, makes two."), and Again starts over.
 *
 * State (numbers, as every scene's): `p` floors pressed in all (without it, read from `dropped`, the tiles done, as the
 * slider sets it); `go` 1 once started; `run` counts the starts (Again); `no` counts wrong presses since the last good one
 * and `nb` is the button pressed wrongly (1 up, 2 down); `held` the button under the finger. Only the pictures between
 * two states have: `at` (where the car is, between floors while it moves), `door` (2: shut), `lit` (the floor just
 * reached glows), `ph` (1: where Chintu is said, 2: the move said), `fin` (the finger, 1 below the button to 2 on it),
 * `wait` (the move just finished, its sum not yet shown).
 *
 * This file holds the arithmetic, the words and the pictures between states. The scene engine (scene.ts) wires it in, its
 * drawing is liftDraw in scene-figures.ts, and the one player (frontend/src/year/Scene.tsx) shows the frames and speaks.
 */
import type { Frame } from "./scene";
import { tallyClicks, type TallyScene } from "./tally";

type St = Record<string, number>;
type Ride = Pick<TallyScene, "start" | "tiles">;

/** Whether a tally scene is a lift ride (floors), not a counter of rupees, degrees or metres, or change counted up. */
export const liftLook = (s: Pick<TallyScene, "unit" | "goTo">) => !s.goTo && s.unit !== "₹" && s.unit !== "°C" && s.unit !== "m";

/** The floors drawn: only those the ride passes, with a floor of margin; the ground (0) when the ride is near it. */
export function liftFloors(s: Ride): [number, number] {
  const c = tallyClicks(s.start, s.tiles), lo = Math.min(...c), hi = Math.max(...c);
  return [lo < 0 ? lo - 1 : lo <= 3 ? 0 : lo - 1, hi + 1];
}
/** Presses before each move: [0, |t0|, |t0|+|t1|, …]; the last is every press of the ride. */
export const liftCum = (tiles: number[]) => tiles.reduce((a, t) => [...a, a[a.length - 1] + Math.abs(t)], [0]);
/** Floors pressed so far (from `p`, or from the tiles done when a slider set it). */
export function liftP(s: Ride, st: St): number {
  const cum = liftCum(s.tiles), all = cum[cum.length - 1];
  if (st.p !== undefined) return Math.max(0, Math.min(all, Math.round(st.p)));
  return cum[Math.max(0, Math.min(s.tiles.length, Math.round(st.dropped ?? 0)))];
}
export interface LiftNow {
  p: number; all: number;
  /** the move being made (tiles.length once the ride is over), and how many of its floors are pressed */
  k: number; done: number;
  /** the moves finished, and the floor the lift is on */
  moves: number; floor: number;
  started: boolean; finished: boolean;
  /** the button wanted now: 1 up, −1 down, 0 none */
  want: number;
}
export function liftNow(s: Ride, st: St): LiftNow {
  const cum = liftCum(s.tiles), all = cum[cum.length - 1], p = liftP(s, st);
  let k = 0;
  while (k < s.tiles.length && p >= cum[k + 1]) k++;
  const floor = tallyClicks(s.start, s.tiles)[p], finished = p === all, started = !!st.go || p > 0;
  return { p, all, k, done: p - cum[Math.min(k, s.tiles.length)], moves: k, floor, started, finished, want: started && !finished ? Math.sign(s.tiles[k]) : 0 };
}
/** What lasts from one state to the next (no finger, no car between floors). */
export const liftRest = (st: St): St => {
  const out: St = {};
  for (const k of ["p", "dropped", "go", "run", "no", "nb"]) if (st[k] !== undefined) out[k] = st[k];
  return out;
};
/**
 * A press: 0 up, 1 down, 2 Start (or Again, once the ride is over). The wanted button is one floor; the other is refused
 * (`no`, `nb`) and nothing moves. Before Start and after the end the lift buttons do nothing.
 */
export function liftAct(s: Ride, st: St, i: number): St {
  const n = liftNow(s, st), rest = liftRest(st);
  if (i === 2) return !n.started || n.finished ? { go: 1, p: 0, run: (st.run ?? 0) + 1 } : rest;
  if (!n.started || n.finished) return rest;
  const d = i === 0 ? 1 : -1;
  if (d !== n.want) return { ...rest, no: (st.no ?? 0) + 1, nb: i + 1 };
  const { no: _n, nb: _b, dropped: _d, ...keep } = rest;
  return { ...keep, go: 1, p: n.p + 1 };
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** A whole number in words, as it is said: "minus two", "forty-five" (said "forty five"). */
export const numWords = (n: number): string => (n < 0 ? `minus ${numWords(-n)}` : n < 20 ? ONES[n] : n < 100 ? `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}` : String(n));
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const floorsWord = (n: number) => `${numWords(n)} floor${n === 1 ? "" : "s"}`;
const dirOf = (t: number) => (t > 0 ? "up" : "down");
/** A number as it is written on the building and the panel: "−2". */
export const liftSign = (n: number) => (n < 0 ? `−${-n}` : `${n}`);

/** The words of the ride (each is said; a few are also written). */
export const LIFT = {
  /** a floor reached */
  floor: (f: number) => (f === 0 ? "zero. The shop." : numWords(f)),
  intro: (f: number) => `Chintu is on floor ${numWords(f)}.${f === 0 ? " The shop." : f < 0 ? " In the car park." : ""}`,
  move: (t: number) => `Go ${dirOf(t)} ${floorsWord(Math.abs(t))}. Press ${dirOf(t)}, ${Math.abs(t) === 1 ? "once" : `${numWords(Math.abs(t))} times`}.`,
  nowYou: (left: number) => `Now you. ${cap(numWords(left))} more.`,
  /** a move finished, and the next one */
  next: (f: number, t: number) => `Floor ${numWords(f)}.${f < 0 ? ` That is basement ${numWords(-f)}, in the car park.` : f === 0 ? " The shop." : ""} Now go ${dirOf(t)} ${floorsWord(Math.abs(t))}.`,
  /** the end: the whole sum */
  sum: (s: Ride) => { const end = tallyClicks(s.start, s.tiles).pop()!; return `Floor ${numWords(end)}. ${cap(numWords(s.start))}, ${s.tiles.map((t) => `${t < 0 ? "minus" : "plus"} ${numWords(Math.abs(t))}`).join(", ")}, makes ${numWords(end)}.`; },
  wrong: (want: number) => (want < 0 ? "Down, not up." : "Up, not down."),
};
/** How long a line takes to say (rate 0.9): the next line waits for it, so two lines never run into each other. */
export const sayMs = (t: string) => 200 + 360 * t.split(/\s+/).filter(Boolean).length + 250 * Math.max(0, (t.match(/[.!?]/g) ?? []).length - 1);

/** The short line written above the picture for a state. */
export function liftCue(s: Ride, st: St): string {
  const n = liftNow(s, st), t = s.tiles[Math.min(n.k, s.tiles.length - 1)], go = (x: number) => `${dirOf(x)} ${Math.abs(x)} floor${Math.abs(x) === 1 ? "" : "s"}`;
  if (!n.started) return "Chintu takes the lift";
  if (st.ph === 1) return `Chintu is on floor ${liftSign(s.start)}`;
  if (n.finished) return "Well done!";
  if (st.ph === 2 || (n.k === 0 && n.done === 0)) return `Go ${go(t)}`;
  return n.k === 0 ? "Now you" : `Now go ${go(t)}`;
}
/** The sum so far, under the picture: "" before a move is done, then "3 − 5 = −2", then "3 − 5 + 4 = 2". */
export function liftSum(s: Ride, st: St): string {
  const moves = liftNow(s, st).moves - (st.wait ? 1 : 0);
  if (moves <= 0) return "";
  const ts = s.tiles.slice(0, moves), end = s.start + ts.reduce((a, b) => a + b, 0);
  return `${liftSign(s.start)} ${ts.map((t) => `${t < 0 ? "−" : "+"} ${Math.abs(t)}`).join(" ")} = ${liftSign(end)}`;
}

/** The floors from press `from` to press `to`, one by one: doors shut, the car moves, doors open with a ding and the
 *  floor said; a finished move adds its line. `extra` is kept on every picture (the finger of the demonstration). */
function ride(s: Ride, base: St, from: number, to: number, extra: St = {}): Frame[] {
  const path = tallyClicks(s.start, s.tiles), cum = liftCum(s.tiles), out: Frame[] = [];
  for (let q = from + 1; q <= to; q++) {
    const a = path[q - 1], b = path[q], at = { ...base, ...extra, p: q - 1 }, j = cum.indexOf(q);
    out.push({ state: { ...at, at: a, door: 2 }, ms: 220, motion: true });
    for (const t of [0.35, 0.7]) out.push({ state: { ...at, at: a + (b - a) * t, door: 2 }, ms: 130, motion: true });
    out.push({ state: { ...base, ...extra, p: q, at: b, lit: 1, ...(j > 0 ? { wait: 1 } : {}) }, ms: Math.max(700, sayMs(LIFT.floor(b))), say: LIFT.floor(b), sound: b === 0 ? 2 : 1 });
    if (j > 0 && j < s.tiles.length) { const line = LIFT.next(b, s.tiles[j]); out.push({ state: { ...base, ...extra, p: q }, ms: sayMs(line), say: line }); }
    if (j === s.tiles.length) { const line = LIFT.sum(s); out.push({ state: { ...base, ...extra, p: q }, ms: sayMs(line), say: line }); }
  }
  return out;
}

/** The pictures from one state to the next (frames@1), ending with the state the ride is left in. */
export function liftFrames(s: Ride, prev: St, next: St): Frame[] {
  const P = liftNow(s, prev), N = liftNow(s, next);
  // Start (or Again): where Chintu is, the first move, and a finger that makes its first press
  if ((next.run ?? 0) !== (prev.run ?? 0)) {
    const base = liftRest(next), t0 = s.tiles[0], intro = LIFT.intro(s.start), move = LIFT.move(t0);
    const out: Frame[] = [{ state: { ...base, ph: 1 }, ms: sayMs(intro), say: intro }];
    if (Math.abs(t0) < 2) return [...out, { state: base, ms: 0, say: move }];
    out.push({ state: { ...base, ph: 2 }, ms: sayMs(move), say: move });
    for (const f of [1, 1.35, 1.7]) out.push({ state: { ...base, ph: 2, fin: f }, ms: f === 1 ? 450 : 160, motion: true });
    out.push({ state: { ...base, ph: 2, fin: 2 }, ms: 500 });
    out.push(...ride(s, base, 0, 1, { ph: 2, fin: 2 }));
    return [...out, { state: { ...base, p: 1 }, ms: 0, say: LIFT.nowYou(Math.abs(t0) - 1) }];
  }
  const wrong = (next.no ?? 0) > (prev.no ?? 0) ? LIFT.wrong(liftNow(s, { ...next, no: 0 }).want || P.want) : undefined;
  if (N.p > P.p) return [...ride(s, liftRest(next), P.p, N.p), { state: next, ms: 0, ...(wrong ? { say: wrong } : {}) }];
  return [{ state: next, ms: 0, ...(wrong ? { say: wrong } : {}) }];
}

/** Problems with a lift ride (empty when it is sound): a ride a child can press through, on a building a phone can show. */
export function liftProblems(s: Ride): string[] {
  const bad: string[] = [];
  const [lo, hi] = liftFloors(s);
  if (hi - lo + 1 > 64) bad.push("a lift ride shows at most 64 floors");
  if (s.tiles.some((t) => Math.abs(t) > 60)) bad.push("a lift move is at most 60 floors");
  return bad;
}
