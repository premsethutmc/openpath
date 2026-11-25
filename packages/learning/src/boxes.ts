/**
 * boxes@1: things in two boxes, counted, then put together on a ten-spot board. A picture for adding that a child of five
 * who cannot read can follow: everything is spoken, and the child does every step with a finger.
 *
 * 1. Two boxes side by side hold `a` and `b` things (mangoes, balloons, sweets: an emoji). The first box glows. The child
 *    taps each thing in it; each tap numbers that thing and says the number. When all are counted, a big number goes on
 *    the box and it is said ("three mangoes."). A tap on the other box is refused: that box shakes, "First this box."
 * 2. The same for the second box (its numbers start again at 1). Then "3 and 2" shows under the picture.
 * 3. A finger carries one thing from the first box to the first spot of a 2 × 5 board (a ten-frame): "one".
 * 4. The child moves the rest, by drag or tap, the first box first; the count goes on along the board (2, 3, a "+", 4, 5).
 * 5. "3 + 2 = 5" is shown and said: "three plus two makes five." The goal is reached.
 *
 * Used for Class 1–2 adding stories with any two counts from 1 and a total of at most 10.
 *
 * This file holds the description, the state and the words. The scene engine (scene.ts) gives it controls, a goal and a
 * drawing (the geometry is in scene-figures.ts), and the one player (frontend/src/year/Scene.tsx) draws it.
 *
 * State (a record of numbers, as every scene's): `ka` and `kb` are the things counted in each box, in the order tapped, as
 * digits (thing 1 of the box is digit 1); `gone` is a bit for each thing moved to the board (the first box's things are
 * 0 … a−1, the second's a … a+b−1); `step` is how far along it is (the one slider). Without `ka`, a state is read from
 * `step` alone, in the plain order. What lasts one move only: `refused` (1 = the first box was wanted, 2 = the second),
 * `no` (counts refusals, so a second one shakes and speaks again), `lit` (the spot just filled, from 1). What only the
 * pictures between two states have: `stay` (the box just counted is still the one lit), `hide` (its number is not on it
 * yet), `w` (the finger is showing how), `carry`/`cx`/`cy` (a thing carried by the finger), `fx`/`fy` (the finger), `wait` (the last thing is on, the sum not yet shown).
 */
export interface BoxesScene {
  type: "scene";
  kind: "boxes";
  /** What to do first, said at the first tap ("Count the mangoes in this box. Tap each one."). */
  prompt: string;
  /** Shown once the goal is reached ("Well done!"). */
  success: string;
  goal: { measure: "placed"; equals: number };
  /** How many things are in the first box and in the second (each 1 or more, together at most 10). */
  a: number;
  b: number;
  /** The thing, as one emoji ("🥭"). */
  thing: string;
  /** What one thing and many things are called, for what is said ("mango", "mangoes"). */
  names: [string, string];
  quiet?: boolean;
}

export const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

type St = Record<string, number>;
const digits = (v: number | undefined) => (v ? String(v).split("").map((d) => Number(d) - 1) : []);
const pack = (xs: number[]) => (xs.length ? Number(xs.map((i) => i + 1).join("")) : 0);
const bits = (v: number | undefined) => { const out: number[] = []; for (let i = 0; i < 10; i++) if (((v ?? 0) >> i) & 1) out.push(i); return out; };

export interface BoxesNow {
  /** the things counted in each box, by their place in the box, in the order tapped */
  ka: number[]; kb: number[];
  /** the things on the board (global index) */
  gone: number[];
  counted: number; placed: number; step: number;
  /** which box is to be used now: 1 (first), 2 (second), 0 (none: done) */
  want: 0 | 1 | 2;
  /** counting (both boxes not yet counted), placing, or done */
  phase: "count" | "place" | "done";
}

/** The state of a boxes scene at `step` along, in the plain order (the slider): count the first box, the second, and then
 *  (the finger has put one on the board) put the rest on, the first box's things first. */
export function boxesAt(s: Pick<BoxesScene, "a" | "b">, step: number): St {
  const n = s.a + s.b, k = Math.max(0, Math.min(2 * n - 1, Math.round(step)));
  const counted = Math.min(k, n), placed = k >= n ? k - n + 1 : 0;
  const ka = Array.from({ length: Math.min(counted, s.a) }, (_, i) => i), kb = Array.from({ length: Math.max(0, counted - s.a) }, (_, i) => i);
  return { step: k, ka: pack(ka), kb: pack(kb), gone: (1 << placed) - 1 };
}

/** What a state says: what is counted, what is on the board, and which box is to be used now. */
export function boxesNow(s: Pick<BoxesScene, "a" | "b">, st: St): BoxesNow {
  const r = st.ka === undefined ? boxesAt(s, st.step ?? 0) : st;
  const ka = digits(r.ka).filter((i) => i < s.a), kb = digits(r.kb).filter((i) => i < s.b), gone = bits(r.gone).filter((i) => i < s.a + s.b);
  const n = s.a + s.b, counted = ka.length + kb.length, placed = gone.length;
  const phase = counted < n ? "count" : placed < n ? "place" : "done";
  const want = phase === "count" ? (ka.length < s.a ? 1 : 2) : phase === "place" ? (gone.filter((i) => i < s.a).length < s.a ? 1 : 2) : 0;
  return { ka, kb, gone, counted, placed, step: counted + Math.max(0, placed - 1), want, phase };
}

/** A state with only what lasts from one move to the next. */
export const boxesRest = (st: St): St => {
  const out: St = {};
  for (const k of ["step", "ka", "kb", "gone", "no"]) if (st[k] !== undefined) out[k] = st[k];
  return out;
};

/** What a tap on thing `i` (or a thing let go on the board) does: counts it, puts it on the board, or is refused. */
export function boxesAct(s: BoxesScene, st: St, i: number): St {
  const now = boxesNow(s, st), n = s.a + s.b, rest = { ...boxesRest(st), ...(st.ka === undefined ? boxesAt(s, st.step ?? 0) : {}) };
  if (!Number.isInteger(i) || i < 0 || i >= n || now.phase === "done") return rest;
  const inA = i < s.a, no = (st.no ?? 0) + 1;
  const write = (ka: number[], kb: number[], gone: number[]): St => {
    const next = { ...rest, ka: pack(ka), kb: pack(kb), gone: gone.reduce((m, g) => m | (1 << g), 0) };
    return { ...next, step: boxesNow(s, next).step };
  };
  if (now.phase === "count") {
    if (inA !== (now.want === 1)) return { ...rest, refused: now.want, no };
    const local = inA ? i : i - s.a, list = inA ? now.ka : now.kb;
    if (list.includes(local)) return rest;
    const ka = inA ? [...now.ka, local] : now.ka, kb = inA ? now.kb : [...now.kb, local];
    // the last of the second box counted: the finger puts the first box's first thing on the board
    return write(ka, kb, ka.length + kb.length === n ? [0] : []);
  }
  if (now.gone.includes(i)) return rest;
  if (!inA && now.want === 1) return { ...rest, refused: 1, no };
  const next = write(now.ka, now.kb, [...now.gone, i]);
  return { ...next, lit: now.placed + 1 };
}

/** The line shown above the picture for a state (what is said, in a few words). */
export function boxesCue(s: BoxesScene, st: St): string {
  if (st.w) return "Watch";
  const now = boxesNow(s, st);
  if (now.phase === "count" || st.stay) return (st.stay ? now.counted <= s.a : now.want === 1) ? "Count this box" : "Now count this box";
  if (now.phase === "place" || st.wait) return "Now you";
  return s.success;
}

/** What is said when the last thing in a box is counted ("three mangoes."), and the sum at the end. */
export const boxesMany = (s: BoxesScene, k: number) => `${WORDS[k]} ${k === 1 ? s.names[0] : s.names[1]}.`;
export const boxesSum = (s: BoxesScene) => `${WORDS[s.a]} plus ${WORDS[s.b]} makes ${WORDS[s.a + s.b]}.`;
export const boxesRefusal = (want: number) => (want === 2 ? "Now this box." : "First this box.");

/** Problems with a description (empty when it is sound). */
export function boxesProblems(s: BoxesScene): string[] {
  const bad: string[] = [];
  const whole = (v: unknown) => Number.isInteger(v) && (v as number) >= 1;
  if (!whole(s.a) || !whole(s.b)) bad.push("a and b must be whole numbers from 1");
  else if (s.a + s.b > 10) bad.push("a + b must be at most 10 (the board has ten spots)");
  if (!(typeof s.thing === "string" && s.thing.trim() && [...s.thing].length <= 4)) bad.push("thing must be one emoji");
  if (!(Array.isArray(s.names) && s.names.length === 2 && s.names.every((t) => typeof t === "string" && t.trim() && t.length <= 20))) bad.push("names must be what one thing and many things are called");
  return bad;
}
