/**
 * sort@1: buttons sorted into glass jars, the product owner's approved button mock. A picture for sorting by one
 * property, and by two ("red AND big", sorted twice), that a child of five who cannot read can follow: everything is
 * spoken, and the child does every step with a finger.
 *
 * 1. Sewing buttons (a rim, four holes, a shine), red and blue, big and small, lie on a wooden table. Under it, a glass
 *    jar; each jar has a tag with a small button on it (and a word), so no reading is needed.
 * 2. The child taps Start. "Look at the buttons. Put the big buttons in the jar." A finger taps one big button: it flies
 *    into the jar and "one" is said. "Now you. Find the big buttons."
 * 3. Each tap on a button that belongs flies it into the jar and the jar's count is said ("two"). A button that does not
 *    belong shakes: "No. That one is small." (or names its colour). Taps made while a button flies wait their turn (the
 *    player queues them): none is lost.
 * 4. The jar full: "four big buttons." and the count shown big. With a second part (`warm` first, then `ask`), the table
 *    is laid again with two jars: "Now a harder one. Red, and big. First, put all the red buttons in this jar."
 * 5. Two properties are sorted twice: first every red button into jar 1 ("three red buttons. Now, out of these red ones,
 *    which are big?"), then the child taps the big ones inside jar 1 and they move to jar 2 ("two buttons are red and
 *    big."). Again starts over.
 *
 * Used for Start here (big, then red and big) and for a worked sorting question (absort), with that question's buttons.
 *
 * State (numbers, as every scene's): `go` 1 once started, `run` counts the starts (Again); `part` and `stage` where the
 * sort is (a two-property part has two stages: the colour, then the size); `j1` and `j2` a bit for each button in jar 1
 * and jar 2; `step` the buttons moved so far (the one slider); `no` counts refusals and `nb` is the button refused (from
 * 1); `sn` marks a state that has just begun a new stage, whose spoken lines are still to come (a tap is not queued
 * behind them); `held` the button under the finger. Only the pictures between two states have: `ph` (the instructions
 * are being said), `w` (the finger is showing how), `gx`/`gy` (the finger), `fb`/`fx`/`fy`/`fk` (a button in flight, from
 * 1, where it is and its size in hundredths), `pd` (a part is done: its count shown).
 *
 * This file holds the description, the state and the words. The scene engine (scene.ts) wires it in, its drawing is
 * sortDraw in scene-figures.ts, and the one player (frontend/src/year/Scene.tsx) shows the frames and speaks.
 */
import type { Frame } from "./scene";
import { numWords, sayMs } from "./lift";
import { sortJarXY, sortLayout, SORT_SIZE } from "./scene-figures";

export type Colour = "red" | "blue";
export type Size = "big" | "small";
/** What a jar takes: one property (a colour or a size), or a colour and a size. */
export interface SortAsk { colour?: Colour; size?: Size }
export interface SortScene {
  type: "scene";
  kind: "sort";
  /** Shown before Start ("Buttons from the sewing tin"). */
  prompt: string;
  /** Shown once the sort is done ("Well done!"). */
  success: string;
  goal: { measure: "done"; equals: 1 };
  /** How many buttons are red big, red small, blue big and blue small (each 0 to 4; 2 to 12 in all). */
  counts: [number, number, number, number];
  /** What is sorted out (the last part). */
  ask: SortAsk;
  /** A first part with one property, sorted before `ask` (Start here: big, then red and big). */
  warm?: SortAsk;
  quiet?: boolean;
}
type Sortable = Pick<SortScene, "counts" | "ask" | "warm">;
type St = Record<string, number>;
export interface Button { c: Colour; s: Size }

/** The Start / Again button's tap. */
export const SORT_GO = 99;
const KINDS: [Colour, Size][] = [["red", "big"], ["red", "small"], ["blue", "big"], ["blue", "small"]];
/** The order the kinds are laid out in, round after round, so the table is mixed (the mock's two rows). */
const ROUNDS = [[0, 3, 2, 1], [1, 2, 0, 3]];

/** The buttons, in their places on the table. */
export function sortButtons(counts: number[]): Button[] {
  const left = [...counts], total = counts.reduce((a, b) => a + b, 0), out: Button[] = [];
  for (let r = 0; out.length < total && r < 40; r++) for (const k of ROUNDS[r % 2]) if (left[k] > 0) { left[k]--; out.push({ c: KINDS[k][0], s: KINDS[k][1] }); }
  return out;
}
export const sortParts = (s: Sortable): SortAsk[] => (s.warm ? [s.warm, s.ask] : [s.ask]);
const both = (a: SortAsk) => !!(a.colour && a.size);
/** The stages of a part: a two-property part sorts the colour first, then the size. */
export const sortStages = (a: SortAsk): SortAsk[] => (both(a) ? [{ colour: a.colour }, { size: a.size }] : [a]);
export const sortFits = (b: Button, a: SortAsk) => (!a.colour || b.c === a.colour) && (!a.size || b.s === a.size);
/** Every move of the whole sort (the slider's range). */
export const sortMoves = (s: Sortable) => { const B = sortButtons(s.counts); return sortParts(s).reduce((n, p) => n + B.filter((b) => sortFits(b, sortStages(p)[0])).length + (both(p) ? B.filter((b) => sortFits(b, p)).length : 0), 0); };

export interface SortNow {
  started: boolean; finished: boolean;
  part: number; stage: number;
  /** where each button is: 0 the table, 1 jar 1, 2 jar 2 */
  loc: number[];
  /** the property sorted now, where the buttons come from and go to */
  attr: SortAsk; from: number; into: number;
  /** buttons that belong still to move, and how many are in each jar */
  left: number; jar: [number, number];
  step: number; j1: number; j2: number;
}
const bit = (m: number, i: number) => ((m >> i) & 1) === 1;
const count = (m: number) => { let n = 0; for (let x = m; x; x >>= 1) n += x & 1; return n; };
/** What a state says. A state with only `step` (the slider) is read as that many moves, in the plain order. */
export function sortNow(s: Sortable, st: St): SortNow {
  const r = st.go === undefined && st.step !== undefined ? sortAt(s, st.step) : st;
  const B = sortButtons(s.counts), parts = sortParts(s), started = !!r.go;
  const part = Math.max(0, Math.min(parts.length - 1, r.part ?? 0)), stages = sortStages(parts[part]), stage = Math.max(0, Math.min(stages.length - 1, r.stage ?? 0));
  const j1 = r.j1 ?? 0, j2 = r.j2 ?? 0, loc = B.map((_, i) => (bit(j2, i) ? 2 : bit(j1, i) ? 1 : 0));
  const attr = stages[stage], from = stage, into = stage + 1, left = B.filter((b, i) => loc[i] === from && sortFits(b, attr)).length;
  const finished = started && part === parts.length - 1 && stage === stages.length - 1 && left === 0;
  return { started, finished, part, stage, loc, attr, from, into, left, jar: [count(j1), count(j2)], step: r.step ?? 0, j1, j2 };
}
/** What lasts from one state to the next. */
export const sortRest = (st: St): St => {
  const out: St = {};
  for (const k of ["go", "run", "part", "stage", "j1", "j2", "step", "no"]) if (st[k] !== undefined) out[k] = st[k];
  return out;
};
/** The button the finger shows: the first that belongs, when the first stage has two or more (else no showing). */
export function sortDemo(s: Sortable): number {
  const B = sortButtons(s.counts), a = sortStages(sortParts(s)[0])[0];
  return B.filter((b) => sortFits(b, a)).length >= 2 ? B.findIndex((b) => sortFits(b, a)) : -1;
}
function start(s: Sortable, run: number): St {
  const d = sortDemo(s);
  return { go: 1, run, part: 0, stage: 0, j1: d >= 0 ? 1 << d : 0, j2: 0, step: d >= 0 ? 1 : 0, no: 0, sn: 1 };
}
/** A state whose stage has no button left to move goes on: the next stage, the next part (a fresh table), or the end. */
function onward(s: Sortable, st: St): St {
  const n = sortNow(s, st);
  if (n.left > 0 || n.finished) return n.finished ? { ...st, sn: 1 } : st;
  if (n.stage < sortStages(sortParts(s)[n.part]).length - 1) return { ...st, stage: n.stage + 1, sn: 1 };
  return { ...st, part: n.part + 1, stage: 0, j1: 0, j2: 0, sn: 1 };
}
/**
 * A tap: button `i`, or Start / Again (SORT_GO). A button that belongs moves on (table → jar 1, or jar 1 → jar 2); one
 * that does not is refused (`no`, `nb`); a button not where the sort takes from now, or any tap before Start or after
 * the end, does nothing.
 */
export function sortAct(s: Sortable, st: St, i: number): St {
  const n = sortNow(s, st), rest = sortRest(st), B = sortButtons(s.counts);
  if (i === SORT_GO) return !n.started || n.finished ? start(s, (st.run ?? 0) + 1) : rest;
  if (!n.started || n.finished || !Number.isInteger(i) || i < 0 || i >= B.length || n.loc[i] !== n.from) return rest;
  if (!sortFits(B[i], n.attr)) return { ...rest, no: (st.no ?? 0) + 1, nb: i + 1 };
  const j1 = n.into === 1 ? n.j1 | (1 << i) : n.j1 & ~(1 << i), j2 = n.into === 2 ? n.j2 | (1 << i) : n.j2;
  return onward(s, { ...rest, go: 1, part: n.part, stage: n.stage, j1, j2, step: n.step + 1 });
}
/** The state after `step` moves in the plain order (the slider): Start (with the finger's button), then each button that
 *  belongs, the first on the table first. */
export function sortAt(s: Sortable, step: number): St {
  const k = Math.round(step);
  if (!(k > 0)) return { step: 0 };
  let st: St = { ...start(s, 0) };
  for (let guard = 0; guard < 64; guard++) {
    const n = sortNow(s, st);
    if (n.step >= k || n.finished) break;
    const B = sortButtons(s.counts), i = B.findIndex((b, j) => n.loc[j] === n.from && sortFits(b, n.attr));
    if (i < 0) break;
    st = sortAct(s, st, i);
  }
  const { sn: _sn, ...out } = st;
  return out;
}

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const word = (a: SortAsk) => (a.colour && a.size ? `${a.colour} and ${a.size}` : (a.colour ?? a.size)!);
const many = (n: number) => `${numWords(n)} button${n === 1 ? "" : "s"}`;
/** The words of the sort (each is said; the cue above the picture is shorter). */
export const SORT = {
  look: "Look at the buttons.",
  /** what a part asks, said as it begins (`k`: the part, from 0) */
  intro: (a: SortAsk, k: number): string[] => (both(a)
    ? [`${k ? "Now a harder one. " : ""}${cap(a.colour!)}, and ${a.size}.`, `First, put all the ${a.colour} buttons in this jar.`]
    : [`${k ? "Now a new one. " : ""}Put the ${word(a)} buttons in the jar.`]),
  nowYou: (a: SortAsk) => `Now you. Find the ${word(a)} buttons.`,
  /** a one-property jar full ("four big buttons.") */
  full: (n: number, a: SortAsk) => `${numWords(n)} ${word(a)} button${n === 1 ? "" : "s"}.`,
  /** the colour sorted: on to the size */
  outOf: (n: number, a: SortAsk) => `${numWords(n)} ${a.colour} button${n === 1 ? "" : "s"}. Now, out of these ${a.colour} ones, which are ${a.size}?`,
  /** the end of a two-property sort */
  both: (n: number, a: SortAsk) => `${many(n)} ${n === 1 ? "is" : "are"} ${a.colour} and ${a.size}.`,
  wrong: (b: Button, a: SortAsk) => `No. That one is ${a.colour ? b.c : b.s}.`,
  /** said again when nothing is tapped for a while */
  remind: (a: SortAsk, stage: number, whole: SortAsk) => (stage === 1 ? `Tap a ${a.size} one in the ${whole.colour} jar.` : `Find a ${word(a)} button. Tap it.`),
};
/** What to say when the child has tapped nothing for a while in the middle of the sort, or null. */
export function sortRemind(s: Sortable, st: St): string | null {
  const n = sortNow(s, st);
  return n.started && !n.finished ? SORT.remind(n.attr, n.stage, sortParts(s)[n.part]) : null;
}
/** The refusal for a state (a button that does not belong was tapped), or null. */
export function sortRefusal(s: Sortable, st: St): string | null {
  if (!st.nb) return null;
  const n = sortNow(s, st), b = sortButtons(s.counts)[st.nb - 1];
  return b && n.started && !n.finished ? SORT.wrong(b, n.attr) : null;
}
/** The short line written above the picture. */
export function sortCue(s: SortScene, st: St): string {
  const n = sortNow(s, st), a = sortParts(s)[n.part];
  if (!n.started) return s.prompt;
  if (n.finished) return s.success;
  if (both(a)) return n.stage === 0 ? `${cap(a.colour!)} and ${a.size}` : `Which ${a.colour} ones are ${a.size}?`;
  return st.ph || st.w ? `${cap(word(a))} buttons go in the jar` : "Now you";
}
/** The count under the picture: a part's jar once it is full ("4 big buttons"), the colour sorted ("3 red"), the end
 *  ("Red and big: 2"); nothing while a jar is being filled. */
export function sortSum(s: Sortable, st: St): string {
  const n = sortNow(s, st), a = sortParts(s)[n.part];
  if (st.pd) { const p = sortParts(s)[n.part], k = n.jar[0]; return `${k} ${word(p)} button${k === 1 ? "" : "s"}`; }
  if (!n.started) return "";
  if (n.finished) return both(a) ? `${cap(word(a))}: ${n.jar[1]}` : `${n.jar[0]} ${word(a)} button${n.jar[0] === 1 ? "" : "s"}`;
  return both(a) && n.stage === 1 ? `${n.jar[0] + n.jar[1]} ${a.colour}` : "";
}

/** Where button `i` is drawn in a state: its place on the table, or its place in its jar. */
export function sortXY(s: Sortable, st: St, i: number): [number, number] {
  const n = sortNow(s, st), L = sortLayout(sortButtons(s.counts).length, both(sortParts(s)[n.part]) ? 2 : 1);
  if (n.loc[i] === 0) return L.slots[i];
  // a button keeps its place in jar 1 when others are taken out of it (a quick second tap lands where it was)
  const inJar = n.loc.map((l, j) => (l === n.loc[i] || (n.loc[i] === 1 && l === 2) ? j : -1)).filter((j) => j >= 0);
  return sortJarXY(L, n.loc[i] - 1, inJar.indexOf(i), inJar.length);
}
/** A button flying from where it is in `a` to where it is in `b` (the pictures in between; only movement). */
function fly(s: Sortable, a: St, b: St, i: number, extra: St = {}): Frame[] {
  const [x0, y0] = sortXY(s, a, i), [x1, y1] = sortXY(s, b, i), k0 = sortNow(s, a).loc[i] ? SORT_SIZE.jar : 1, k1 = SORT_SIZE.jar;
  const r = (v: number) => Math.round(v * 10) / 10;
  return [0.15, 0.35, 0.55, 0.75, 0.92].map((t) => ({ state: { ...a, ...extra, fb: i + 1, fx: r(x0 + (x1 - x0) * t), fy: r(y0 + (y1 - y0) * t - 40 * Math.sin(Math.PI * t)), fk: Math.round(100 * (k0 + (k1 - k0) * t)) }, ms: 55, motion: true }));
}
/** The pictures from one state to the next (frames@1), ending with the next state itself. */
export function sortFrames(s: Sortable, prev0: St, next: St): Frame[] {
  const prev = prev0.go === undefined && prev0.step !== undefined ? sortAt(s, prev0.step) : prev0;
  const P = sortNow(s, prev), N = sortNow(s, next), B = sortButtons(s.counts), parts = sortParts(s);
  // Start (or Again): what to do, said; a finger taps one button and it flies in; "Now you."
  if ((next.run ?? 0) !== (prev.run ?? 0) && N.started) {
    const d = sortDemo(s), pre = { ...sortRest(next), j1: 0, step: 0 }, lines = [SORT.look, ...SORT.intro(parts[0], 0)];
    const out: Frame[] = lines.map((l, k) => ({ state: { ...pre, ph: 1 }, ms: sayMs(l), say: l, ...(k === 0 ? { fresh: true } : {}) }));
    if (d < 0) return [...out.slice(0, -1), { state: next, ms: 0, say: lines[lines.length - 1], ...(lines.length === 1 ? { fresh: true } : {}) }];
    const [bx, by] = sortXY(s, pre, d), at = (t: number) => ({ gx: bx + 10, gy: Math.round(by + 100 - 82 * t) });
    out.push({ state: { ...pre, w: 1, ...at(0) }, ms: 350 });
    for (const t of [0.35, 0.7]) out.push({ state: { ...pre, w: 1, ...at(t) }, ms: 160, motion: true });
    out.push({ state: { ...pre, w: 1, ...at(1) }, ms: 450 });
    const after = sortRest(next);
    out.push(...fly(s, pre, after, d, { w: 1 }));
    out.push({ state: { ...after, w: 1 }, ms: 900, say: "one" });
    return [...out, { state: next, ms: 0, say: SORT.nowYou(sortStages(parts[0])[0]) }];
  }
  const refused = (next.no ?? 0) > (prev.no ?? 0) ? sortRefusal(s, next) ?? undefined : undefined;
  if (!P.started || !N.started) return [{ state: next, ms: 0 }];
  const changed = N.part !== P.part || N.stage !== P.stage || (N.finished && !P.finished);
  // the buttons moved: every one that belonged, when the stage is over; else those whose place changed
  const moved = B.map((_, i) => i).filter((i) => (changed ? P.loc[i] === P.from && sortFits(B[i], P.attr) : N.loc[i] !== P.loc[i]));
  // (a slider jump, or anything else that is not taps on this stage's buttons: shown at once)
  if (N.step !== P.step + moved.length || (N.part !== P.part && N.part !== P.part + 1)) return [{ state: next, ms: 0 }];
  const out: Frame[] = [];
  let cur = sortRest(prev);
  for (const i of moved) {
    const c1 = cur.j1 ?? 0, c2 = cur.j2 ?? 0, after: St = { ...cur, j1: P.into === 1 ? c1 | (1 << i) : c1 & ~(1 << i), j2: P.into === 2 ? c2 | (1 << i) : c2, step: (cur.step ?? 0) + 1 };
    out.push(...fly(s, cur, after, i));
    out.push({ state: after, ms: 450, say: numWords(count(P.into === 1 ? after.j1 : after.j2)) });
    cur = after;
  }
  if (!changed) return [...out, { state: next, ms: 0, ...(refused ? { say: refused } : {}) }];
  const whole = parts[P.part], k = count(P.into === 1 ? cur.j1 : cur.j2);
  if (N.finished) return [...out, { state: next, ms: 0, say: both(whole) ? SORT.both(k, whole) : SORT.full(k, whole) }];
  if (N.part === P.part) return [...out, { state: next, ms: 0, say: SORT.outOf(k, whole) }];
  // a part done: its count, then the next part on a fresh table
  const full = SORT.full(k, whole), lines = SORT.intro(parts[N.part], N.part);
  out.push({ state: { ...cur, pd: 1 }, ms: sayMs(full) + 300, say: full });
  lines.slice(0, -1).forEach((l) => out.push({ state: { ...next, ph: 1 }, ms: sayMs(l), say: l }));
  return [...out, { state: next, ms: 0, say: lines[lines.length - 1] }];
}

/** The jars of the part a state is in: their tags (a word and the buttons that go in) and which one takes buttons now. */
export function sortJars(s: Sortable, st: St): { word: string; icons: Button[] }[] {
  const a = sortParts(s)[sortNow(s, st).part];
  const tag = (x: SortAsk): { word: string; icons: Button[] } => ({ word: word(x), icons: x.colour && x.size ? [{ c: x.colour, s: x.size }] : x.colour ? [{ c: x.colour, s: "small" }] : [{ c: "red", s: x.size! }, { c: "blue", s: x.size! }] });
  return both(a) ? [tag({ colour: a.colour }), tag(a)] : [tag(a)];
}

/** Problems with a description (empty when it is sound): buttons a child can sort, and every jar gets one. */
export function sortProblems(s: Sortable): string[] {
  const bad: string[] = [];
  const c = s.counts;
  if (!(Array.isArray(c) && c.length === 4 && c.every((n) => Number.isInteger(n) && n >= 0 && n <= 4))) return ["counts must be four whole numbers from 0 to 4 (red big, red small, blue big, blue small)"];
  const total = c.reduce((a, b) => a + b, 0);
  if (total < 2 || total > 12) bad.push("there must be 2 to 12 buttons");
  const okAsk = (a: unknown) => !!a && typeof a === "object" && ((a as SortAsk).colour === undefined || ["red", "blue"].includes((a as SortAsk).colour!)) && ((a as SortAsk).size === undefined || ["big", "small"].includes((a as SortAsk).size!)) && !!((a as SortAsk).colour || (a as SortAsk).size) && Object.keys(a).every((k) => k === "colour" || k === "size");
  if (!okAsk(s.ask)) bad.push("ask must be a colour (red or blue), a size (big or small), or both");
  if (s.warm !== undefined && !(okAsk(s.warm) && !both(s.warm))) bad.push("warm must be one colour or one size");
  if (bad.length) return bad;
  const B = sortButtons(c);
  for (const p of sortParts(s)) for (const [k, st] of sortStages(p).entries()) if (!B.some((b) => sortFits(b, k ? p : st))) bad.push(`no button is ${word(k ? p : st)}`);
  return bad;
}
