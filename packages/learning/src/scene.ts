/**
 * scene@3: the deterministic scene engine for interactive teaching pictures.
 *
 * A scene is DATA (a `Scene`): what to draw, what the learner can move, and a goal to reach by moving it. One engine reads
 * any scene; the app has one player (`frontend/src/year/Scene.tsx`) that draws what this file returns. A new topic is a new
 * description, not a new screen.
 *
 * Nothing here calls a model or the network. Everything is plain arithmetic on the scene's numbers, so the same scene
 * always draws, measures and checks the same way on every device.
 *
 * A scene is a teaching picture. Reaching its goal is NOT evidence of a skill: nothing here writes learner records.
 *
 * scene@13 adds a `sort` kind (sort.ts, the approved button mock): sewing buttons on a table, sorted by tapping into glass
 * jars by colour, size, or both (sorted twice). It has its own Start and Again, as the lift does.
 * scene@12 gives the `tally` kind its lift look (lift.ts, the approved lift mock): a tally scene that counts floors (no ₹,
 * °C or m) is a building with Chintu in the lift and a panel of ▲ ▼ buttons, one press per floor. A circle can now be
 * a thing the learner taps (`tap`), and a `Frame` can carry a `sound` (a ding as the lift reaches a floor).
 * scene@11 adds a `boxes` kind (boxes.ts: things in two boxes, counted, then put on a ten-spot board). Its moves are taps
 * (or a thing dragged to the board); `press` is a tap by keyboard, a shape with `tap` is a thing the player makes a focusable
 * button, and a `Frame` can carry a line to `say` as it is shown; `cue` is the short line shown above the picture.
 * scene@10 adds a `tally` kind (tally.ts: the counter and the lift). Its tiles are dropped one at a time; the engine's state
 * changes by whole tiles, and `frames` lists the pictures in between (every number the counter clicks through), which the
 * player shows one after another. `release` is what happens when a finger lets go, and `sceneBox` is a scene's drawing box
 * (the lift is tall).
 * scene@9 adds a `pick` kind (a labelled figure whose parts the learner taps: the side opposite θ, a point of a grid, an
 * entry of a matrix, a part of a Venn diagram; see scene-figures.ts) and a `ratios` kind (a right triangle whose angle and
 * size are set; sin, cos and tan follow the angle only).
 * scene@8 adds a `bars` kind (a bar chart with a reading line the learner slides up to a bar's top).
 * scene@7 adds an `order` kind (number cards the learner arranges, smallest on the left).
 * scene@6 adds a `commas` kind (the digits of a whole number, with commas the learner places).
 * scene@5 adds a `fraction` kind (a bar or a hundred-square cut into equal pieces, some shaded), a `numberline` kind (a
 * point on a number line, or a jump from a start) and an `array` kind (counters in equal rows).
 * scene@4 adds a `rectangle` kind (width and height on a grid; perimeter and area) and a `join` kind (two pieces of a graph
 * that meet or fail to meet at a point).
 *
 * scene@3 adds a `transform` kind: two arrows set a 2 × 2 matrix, and a shape is moved by it.
 *
 * scene@2 adds: curves beyond polynomials (`terms`: powers, sine, cosine, exponential, natural logarithm, with exact slopes
 * and areas), a `triangle` kind (two angles set, the third follows), and a line that turns about a fixed point (`through`).
 */

import { pickAt, pickCheck, pickDraw, pickName, pickParts, pickWords, ratiosAt, ratiosDraw, ratiosOf, TALLY_BOX, tallyDraw, tallyInDrop, tallyTileAt, tallyNum, tallyTileXY, tallyTileLabel, tangentAt, tangentDraw, tangentOf, tileText, type PickFigure } from "./scene-figures";
import { tallyAt, tallyClicks, tallyProblems, type TallyScene } from "./tally";
import { LIFT, liftAct, liftRemind, liftCue, liftCum, liftFloors, liftFrames, liftLook, liftNow, liftProblems, liftRest, liftSum } from "./lift";
import { liftButtonAt, liftDraw, liftLayout } from "./scene-figures";
import { boxesDraw, boxesLayout, boxesOnBoard, boxesThingAt, boxesThingXY } from "./scene-figures";
import { sortButtonAt, sortDraw, sortLayout, sortOnGo } from "./scene-figures";
import { SORT_GO, sortAct, sortAt, sortButtons, sortCue, sortFrames, sortJars, sortMoves, sortNow, sortParts, sortProblems, sortRefusal, sortRemind, sortRest, sortSum, sortXY, type SortScene } from "./sort";
import { boxesAct, boxesAt, boxesCue, boxesMany, boxesNow, boxesProblems, boxesRefusal, boxesRest, boxesSum, WORDS, type BoxesScene } from "./boxes";
export type { PickFigure } from "./scene-figures";

/** A polynomial as its coefficients, lowest power first: 5x² is [0, 0, 5]. */
export type Poly = number[];
/** One term of a curve: a·xᵇ (pow), a·sin(bx), a·cos(bx), a·e^(bx) or a·ln x. `b` defaults to 1. */
export interface Term { f: "pow" | "sin" | "cos" | "exp" | "ln"; a: number; b?: number }

/** What the learner is asked to reach. `measure` names one of the scene's measures; exactly one of equals / below is set. */
export interface SceneGoal { measure: string; equals?: number; below?: number; tol?: number }

interface Base {
  type: "scene";
  /** What to do, in one short sentence. */
  prompt: string;
  /** Shown once the goal is reached: what the learner has just seen. */
  success: string;
  goal: SceneGoal;
  /** practice-tool@1: a tool to think with, beside a question that is still answered in its own box. Reaching the goal is
   *  never announced, so the answer cannot be found by sweeping the picture until it says so. */
  quiet?: boolean;
  /** decide@1: one choice the learner makes before the picture will move (which two tens, which way). It is the choice the
   *  documented mistake gets wrong; a wrong pick is answered with `why` and asked again. Never the question's answer. */
  first?: { ask: string; choices: string[]; right: number; why: string[]; /** the picture would give the choice away: it is drawn once the choice is made */ hide?: boolean };
  /** The letter the horizontal quantity is called in the readout and description (default x; t for time). */
  variable?: string;
}
/** A curve is given either as a polynomial or as a sum of terms (exactly one of the two). */
interface Curve { poly?: Poly; terms?: Term[]; from: number; to: number }
/** The area under a curve built from left-edge strips; the learner chooses how many strips. */
export interface StripsScene extends Base, Curve { kind: "strips"; max?: number }
/** A point that slides along a curve, with the tangent drawn at it. */
export interface SlopeScene extends Base, Curve { kind: "slope"; step?: number }
/** The signed area collected from the left edge to a right edge the learner drags. */
export interface AccumulateScene extends Base, Curve { kind: "accumulate"; step?: number }
/** A straight line set by sliders. With `through`, the line turns about that point and only its slope is set. */
export interface LineScene extends Base { kind: "line"; targets: [number, number][]; window: [number, number, number, number]; m: [number, number, number]; c?: [number, number, number]; through?: [number, number]; /** What the slope slider is called (default "Slope"; a lesson that has not yet named the slope calls it something plainer). */ mLabel?: string }
/** A triangle whose angles at A and B are set (whole degrees); the angle at C follows. `angles` are the two asked for. */
export interface TriangleScene extends Base { kind: "triangle"; angles: [number, number] }
/** A 2 × 2 matrix as a machine: its columns are where two arrows land (set by dragging them to whole-number points), and a shape is moved by it.
 *  `target`, when given, is the matrix [a, b, c, d] (first column a, b; second column c, d) that `miss` is measured to. */
export interface TransformScene extends Base { kind: "transform"; target?: [number, number, number, number] }
/** A rectangle on a grid of unit squares, its width and height set by dragging a corner. `perimeter` and `area`, when given,
 *  are what `off` is measured to; `shortOfBest` is how far the area is from the largest a rectangle of that perimeter can
 *  have. `words` are what the perimeter and the area are called in the readout (a story may call them fence and room). */
export interface RectangleScene extends Base { kind: "rectangle"; perimeter?: number; area?: number; words?: [string, string]; ask?: "area" | "perimeter" }
/** Two pieces of a graph that meet (or fail to meet) at x = `at`. In "shift" mode the right-hand piece is slid up and down
 *  (its height is right(x) + k); in "point" mode the single point at x = `at` is moved (its height is k). */
export interface JoinScene extends Base { kind: "join"; mode: "shift" | "point"; left: Poly; right: Poly; at: number; from: number; to: number; k: [number, number, number]; start?: number }
/** A bar cut into equal pieces with some shaded (a hundred-square when there are 100 pieces). `target` is the fraction the
 *  measures compare with; `show` draws it as a second bar above. `pieces` or `shaded`, when given, fix that number so only
 *  the other is set. `other` is 0 only when the same amount is shown with a different number of pieces than the target's;
 *  `exact` is 0 only for the target's own pieces and shaded pieces. */
export interface FractionScene extends Base { kind: "fraction"; target: [number, number]; show?: boolean; pieces?: number; shaded?: number; max?: number }
/** A point on a number line. `label` is the gap between numbered marks (default: every mark); `hide` keeps the point's
 *  number off the screen (for finding a number by counting marks); `near` shows how far the point is from the multiples
 *  of that number on each side (for rounding); `jump` draws the move from the start as a jump (for adding integers). */
export interface NumberLineScene extends Base { kind: "numberline"; from: number; to: number; step: number; start: number; label?: number; hide?: boolean; near?: number; jump?: boolean; size?: boolean }
/** Counters in equal rows. `total` is how many are asked for; `rows`, when given, fixes the number of rows. With `share`,
 *  the total is being shared out: `left` is how many are left over once the rows are as full as they can be (999 until
 *  then, and when too many are used), and the readout says how many are left over. */
export interface ArrayScene extends Base {
  kind: "array"; total: number; rows?: number; share?: boolean;
  /** rows-of-people@1: the counters are drawn as children (a story about people standing in rows), and anyone who does
   *  not fit in the rows stands underneath, so "left over" is seen and not only said. */
  people?: boolean;
  /** tried@1: the scene keeps what the learner has tried (each number of rows, and who was left over), so the pattern
   *  across the tries can be read at the end. */
  log?: boolean;
}
/** The digits of a whole number with commas the learner places: in threes from the right (`international`), or one group
 *  of three and then twos (`indian`). `miss` is how many commas are wrongly placed or missing. */
export interface CommasScene extends Base { kind: "commas"; digits: string; style: "indian" | "international" }
/** Two to five different numbers on cards, arranged by dragging: smallest on the left. `wrong` counts the neighbours that
 *  are the wrong way round (0 when the cards are in order). `ask`, when given, says the question is about the first two cards: which of them is the larger, or the smaller. */
export interface OrderScene extends Base { kind: "order"; values: number[]; ask?: "largest" | "smallest" }
/** A bar chart with a level line the learner slides up the scale. `ask.read` is the bar whose top the line is to reach
 *  (reading its value off the scale); `ask.more` is two bars, [taller, shorter]: the line goes to the top of the shorter,
 *  and how far the taller rises above it is their difference. `scale` is the gap between numbered lines of the scale;
 *  `unit` is the grid the line moves on (default 1). */
export interface BarsScene extends Base { kind: "bars"; labels: string[]; values: number[]; scale?: number; unit?: number; ask: { read: number } | { more: [number, number] } }
/** A labelled figure whose parts can be tapped. `ask` names the right part or parts; a wrong tap is named back with `hint`.
 *  `labels` writes every part's name on the figure (a picture to read, in a lesson). `part` is the part chosen, from 1. */
export interface PickScene extends Base { kind: "pick"; figure: PickFigure; ask: string[]; hint: string; labels?: boolean }
/** A right triangle with θ at the left: the angle (whole steps of 5°) and the hypotenuse are set; the three ratios follow. */
export interface RatiosScene extends Base { kind: "ratios" }
/** conic-tangent@1: the ellipse x²/a² + y²/b² = 1 (a and b whole, 2 to 6) with a point that goes round it in steps of 15°.
 * The tangent at the point is drawn (with `normal`, the normal as well) and its slope is worked out exactly: −b²x/(a²y). */
export interface TangentScene extends Base { kind: "tangent"; a: number; b: number; normal?: boolean }
/** tally@1: the counter and the lift (tally.ts), with the goal and options every scene has. */
export type TallyKind = Omit<TallyScene, "goal"> & Base;
/** lift@1: a tally scene that is a lift ride (lift.ts), not a counter of rupees, degrees or metres. */
export const isLift = (s: Scene): boolean => s.kind === "tally" && liftLook(s);
/** boxes@1: things in two boxes, counted, then put on a ten-spot board (boxes.ts). */
export type BoxesKind = Omit<BoxesScene, "goal"> & Base;
/** sort@1: buttons sorted into glass jars by colour, size, or both (sort.ts). */
export type SortKind = Omit<SortScene, "goal"> & Base;
/** sort@1 and lift@1: a scene with its own Start and Again, whose lines are said one after another and repeated when the
 *  child does nothing for a while. */
export const ownStart = (s: Scene): boolean => isLift(s) || s.kind === "sort";
/** The tap that is Start for a scene with its own Start (the lift's 2, the sort's SORT_GO), or null. */
export const startTap = (s: Scene): number | null => (s.kind === "sort" ? SORT_GO : isLift(s) ? 2 : null);
/** How long the child may do nothing before what to do is said again (at most three times). */
export const remindMs = (s: Scene): number => (s.kind === "sort" ? 7000 : 6000);
export type Scene = SortKind | BoxesKind | TallyKind | PickScene | RatiosScene | TangentScene | StripsScene | SlopeScene | AccumulateScene | LineScene | TriangleScene | TransformScene | RectangleScene | JoinScene | FractionScene | NumberLineScene | ArrayScene | CommasScene | OrderScene | BarsScene;
export type CurveScene = StripsScene | SlopeScene | AccumulateScene;
export type SceneKind = Scene["kind"];

/** One thing the learner can set. Every control is a number on a fixed grid, so every reachable state can be listed. */
export interface Control { key: string; label: string; min: number; max: number; step: number; start: number }
export type SceneState = Record<string, number>;

/** What the player draws, in a fixed 340 × 220 box. `role` picks the style; the player holds no mathematics. */
export type Shape =
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; role: string }
  | { t: "path"; d: string; role: string }
  /** `tap`: a thing the learner taps (boxes@1); the player makes it a focusable button named `label`, and Enter presses it */
  | { t: "rect"; x: number; y: number; w: number; h: number; role: string; tap?: { i: number; label: string } }
  | { t: "circle"; cx: number; cy: number; r: number; role: string; tap?: { i: number; label: string } }
  /** `clip`: the text is seen only inside this box (a counter's rolling digit stays in its window) */
  | { t: "text"; x: number; y: number; s: string; role: string; clip?: { x: number; y: number; w: number; h: number } };

export const SCENE_BOX = { w: 340, h: 220 } as const;
/** The box a scene is drawn in: 340 × 220, except the tall lift of a tally scene. */
export const sceneBox = (s: Scene): { w: number; h: number } => (s.kind === "tally" ? (liftLook(s) ? { w: 340, h: liftLayout(s.tiles, liftFloors(s)).h } : TALLY_BOX) : s.kind === "boxes" ? (({ w, h }) => ({ w, h }))(boxesLayout(s.a, s.b)) : s.kind === "sort" ? (({ w, h }) => ({ w, h }))(sortLay(s, {})) : SCENE_BOX);
/** sort@1: the layout of a sort for a state (one jar, or two while a two-property part is sorted). */
const sortLay = (s: SortKind, st: SceneState) => { const a = sortParts(s)[sortNow(s, st).part]; return sortLayout(s.counts.reduce((x, y) => x + y, 0), a.colour && a.size ? 2 : 1); };
const L = 34, R = 326, T = 16, B = 190;

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const px = (v: number) => Math.round(v * 100) / 100;
const rad = (d: number) => (d * Math.PI) / 180;

export const evalPoly = (p: Poly, x: number) => p.reduceRight((acc, c) => acc * x + c, 0);
export const derivative = (p: Poly): Poly => (p.length <= 1 ? [0] : p.slice(1).map((c, i) => c * (i + 1)));
/** The antiderivative with constant 0. */
export const antiderivative = (p: Poly): Poly => [0, ...p.map((c, i) => c / (i + 1))];
/** The exact definite integral of a polynomial (by its antiderivative, not by adding strips). */
export const integral = (p: Poly, a: number, b: number) => { const F = antiderivative(p); return evalPoly(F, b) - evalPoly(F, a); };

/** A term's value, slope and antiderivative at x: each in closed form, so slopes and areas are exact, not estimated. */
function term(t: Term, x: number): [number, number, number] {
  const a = t.a, b = t.b ?? 1;
  if (t.f === "pow") return [a * x ** b, b === 0 ? 0 : a * b * x ** (b - 1), (a * x ** (b + 1)) / (b + 1)];
  if (t.f === "sin") return [a * Math.sin(b * x), a * b * Math.cos(b * x), (-a / b) * Math.cos(b * x)];
  if (t.f === "cos") return [a * Math.cos(b * x), -a * b * Math.sin(b * x), (a / b) * Math.sin(b * x)];
  if (t.f === "exp") return [a * Math.exp(b * x), a * b * Math.exp(b * x), (a / b) * Math.exp(b * x)];
  return [a * Math.log(x), a / x, a * (x * Math.log(x) - x)];
}
/** The curve of a scene: its value, its slope, and its exact area between two points. */
export function curveOf(s: Curve) {
  if (s.terms) {
    const sum = (x: number, i: 0 | 1 | 2) => s.terms!.reduce((t, k) => t + term(k, x)[i], 0);
    return { value: (x: number) => sum(x, 0), slope: (x: number) => sum(x, 1), area: (a: number, b: number) => sum(b, 2) - sum(a, 2) };
  }
  const p = s.poly ?? [0], d = derivative(p);
  return { value: (x: number) => evalPoly(p, x), slope: (x: number) => evalPoly(d, x), area: (a: number, b: number) => integral(p, a, b) };
}
const positiveOnly = (s: Curve) => !!s.terms?.some((t) => t.f === "ln");

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A number for the screen: whole when it is whole, otherwise at most two decimals; a true minus sign. */
export function fmt(n: number): string {
  const v = Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : Math.round(n * 100) / 100;
  const s = Object.is(v, -0) || v === 0 ? "0" : String(Math.abs(v));
  return v < 0 ? `−${s}` : s;
}
const signedJoin = (parts: [number, string][]) => {
  const out: string[] = [];
  for (const [c, body] of parts) { if (!c) continue; out.push(out.length ? `${c < 0 ? "−" : "+"} ${body}` : `${c < 0 ? "−" : ""}${body}`); }
  return out.length ? out.join(" ") : "0";
};
const xPow = (i: number) => (i === 0 ? "" : `x${i === 1 ? "" : String(i).split("").map((d) => SUP[Number(d)]).join("")}`);
const coef = (a: number, body: string) => (body ? `${Math.abs(a) === 1 ? "" : fmt(Math.abs(a))}${body}` : fmt(Math.abs(a)));
/** 5x² − 3x + 1 for [1, −3, 5]. */
export const polyText = (p: Poly): string => signedJoin([...p.keys()].reverse().map((i) => [p[i], coef(p[i], xPow(i))]));
/** The curve in words and symbols: 5x² − 3x + 1, or 2e^(3x) − 6 ln x. */
export function curveText(s: Curve): string {
  if (!s.terms) return polyText(s.poly ?? [0]);
  const inner = (b: number) => (b === 1 ? "x" : `${fmt(b)}x`);
  return signedJoin(s.terms.map((t) => {
    const b = t.b ?? 1;
    if (t.f === "pow") return [t.a, coef(t.a, xPow(b))];
    if (t.f === "ln") return [t.a, `${Math.abs(t.a) === 1 ? "" : `${fmt(Math.abs(t.a))} `}ln x`];
    return [t.a, coef(t.a, t.f === "exp" ? (b === 1 ? "eˣ" : `e^(${inner(b)})`) : `${Math.abs(t.a) === 1 ? "" : " "}${t.f}(${inner(b)})`.trimStart())];
  }));
}

/** The whole-degree angles a triangle scene can show: the two set angles are kept to a triangle (their sum at most 170°). */
function tri(state: SceneState) { const a = state.a, b = Math.min(state.b, 170 - a); return { a, b, c: 180 - a - b }; }

/** The controls of a scene: what can be set, on what grid, and where it starts. */
export function controls(s: Scene): Control[] {
  if (s.kind === "sort") return [{ key: "step", label: "Buttons sorted", min: 0, max: sortMoves(s), step: 1, start: 0 }];
  if (s.kind === "boxes") return [{ key: "step", label: "Steps done", min: 0, max: 2 * (s.a + s.b) - 1, step: 1, start: 0 }];
  if (s.kind === "tally") return [{ key: "dropped", label: "Tiles in the lift", min: 0, max: s.tiles.length, step: 1, start: 0 }];
  if (s.kind === "pick") return [{ key: "part", label: "Which part", min: 0, max: pickParts(s.figure).length, step: 1, start: 0 }];
  if (s.kind === "tangent") return [{ key: "turn", label: "Move the point round", min: 0, max: 345, step: 15, start: s.goal.measure === "turn" && s.goal.equals === 30 ? 60 : 30 }];
  if (s.kind === "ratios") return [{ key: "angle", label: "Angle θ", min: 15, max: 70, step: 5, start: s.goal.measure === "angle" && s.goal.equals === 40 ? 25 : 40 }, { key: "size", label: "Size", min: 5, max: 10, step: 1, start: s.goal.measure === "size" && s.goal.equals === 8 ? 6 : 8 }];
  if (s.kind === "strips") return [{ key: "n", label: "Strips", min: 1, max: s.max ?? 100, step: 1, start: Math.min(4, s.max ?? 100) }];
  if (s.kind === "triangle") {
    const near = Math.abs(s.angles[0] - 60) + Math.abs(s.angles[1] - 60) < 12;
    return [{ key: "a", label: "Angle A", min: 10, max: 150, step: 1, start: near ? 40 : 60 }, { key: "b", label: "Angle B", min: 10, max: 150, step: 1, start: near ? 95 : 60 }];
  }
  if (s.kind === "bars") return [{ key: "y", label: "Reading line", min: 0, max: barsTop(s), step: s.unit ?? 1, start: 0 }];
  if (s.kind === "order") {
    // the cards start in the order given, unless that is already in order: then the first card starts at the far end
    const sorted = s.values.every((v, i) => i === 0 || s.values[i - 1] < v);
    return s.values.map((v, i) => ({ key: `p${i}`, label: `Place of ${fmt(v)}`, min: 1, max: s.values.length, step: 1, start: sorted ? ((i + s.values.length - 1) % s.values.length) + 1 : i + 1 }));
  }
  if (s.kind === "commas") return commaPlaces(s).map((_, i, all) => ({ key: "abc"[i], label: ["First comma", "Second comma", "Third comma"][i], min: 1, max: s.digits.length - 1, step: 1, start: all.length - i }));
  if (s.kind === "fraction") {
    const top = s.pieces ?? s.max ?? 12;
    return [...(s.pieces === undefined ? [{ key: "n", label: "Pieces", min: 1, max: top, step: 1, start: 1 }] : []), ...(s.shaded === undefined ? [{ key: "k", label: "Shaded", min: 0, max: top, step: 1, start: 0 }] : [])];
  }
  if (s.kind === "numberline") return [{ key: "x", label: "The point", min: s.from, max: s.to, step: s.step, start: s.start }];
  if (s.kind === "array") return [...(s.rows === undefined ? [{ key: "r", label: "Rows", min: 1, max: 10, step: 1, start: 1 }] : []), { key: "c", label: "In each row", min: 1, max: 15, step: 1, start: 1 }];
  if (s.kind === "rectangle") return [{ key: "w", label: "Width", min: 1, max: 9, step: 1, start: 2 }, { key: "h", label: "Height", min: 1, max: 9, step: 1, start: 1 }];
  if (s.kind === "join") return [{ key: "k", label: s.mode === "shift" ? "Right piece" : "The point", min: s.k[0], max: s.k[1], step: s.k[2], start: s.start ?? s.k[0] }];
  if (s.kind === "transform") return [["a", "First arrow, across", 1], ["b", "First arrow, up", 0], ["c", "Second arrow, across", 0], ["d", "Second arrow, up", 1]].map(([key, label, start]) => ({ key: key as string, label: label as string, min: -3, max: 3, step: 1, start: start as number }));
  if (s.kind === "line") {
    const m: Control = { key: "m", label: s.mLabel ?? "Slope", min: s.m[0], max: s.m[1], step: s.m[2], start: s.m[0] };
    return s.through || !s.c ? [m] : [m, { key: "c", label: "Start", min: s.c[0], max: s.c[1], step: s.c[2], start: s.c[0] }];
  }
  const step = s.step ?? ((s.to - s.from) <= 8 ? 0.05 : 0.1);
  return [{ key: "x", label: s.variable ?? "x", min: s.from, max: s.to, step, start: s.kind === "accumulate" ? s.from : r6(s.from + Math.round((s.to - s.from) / step / 6) * step) }];
}
export const initial = (s: Scene): SceneState => Object.fromEntries(controls(s).map((c) => [c.key, c.start]));
/** Set one control: clamped to its range and snapped to its grid. Unknown keys and non-numbers change nothing. */
export function set(s: Scene, state: SceneState, key: string, value: number): SceneState {
  const c = controls(s).find((k) => k.key === key);
  if (!c || !fin(value)) return state;
  // boxes@1: the one slider steps through the counting and the placing, in the plain order
  if (s.kind === "boxes") return boxesAt(s, value);
  // sort@1: the one slider is the buttons moved, in the plain order
  if (s.kind === "sort") return sortAt(s, Math.min(c.max, Math.max(c.min, value)));
  // lift@1: the slider sets the moves done; the lift is then on the floor they end on
  if ((s.kind === "tally" && liftLook(s))) { const n = Math.round(Math.min(c.max, Math.max(c.min, value))), { p: _p, dropped: _d, no: _n, nb: _b, ...keep } = liftRest(state); return { ...keep, go: 1, p: liftCum(s.tiles)[n] }; }
  const steps = Math.round((Math.min(c.max, Math.max(c.min, value)) - c.min) / c.step);
  return { ...state, [key]: r6(Math.min(c.max, c.min + steps * c.step)) };
}

/** The window of a graph scene: the x range and the y range it needs, always including y = 0. */
function frame(s: CurveScene | LineScene) {
  if (s.kind === "line") { const [x0, x1, y0, y1] = s.window; return { x0, x1, y0, y1 }; }
  const f = curveOf(s);
  const x0 = positiveOnly(s) ? s.from : Math.min(0, s.from), x1 = s.to;
  let y0 = 0, y1 = 0;
  for (let i = 0; i <= 80; i++) { const y = f.value(x0 + ((x1 - x0) * i) / 80); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (y1 - y0 < 1e-9) y1 = y0 + 1;
  return { x0, x1, y0, y1 };
}
function scales(s: CurveScene | LineScene) {
  const f = frame(s);
  const X = (x: number) => L + ((x - f.x0) / (f.x1 - f.x0)) * (R - L);
  const Y = (y: number) => B - ((y - f.y0) / (f.y1 - f.y0)) * (B - T);
  return { ...f, X, Y, sx: (R - L) / (f.x1 - f.x0), sy: (B - T) / (f.y1 - f.y0) };
}
/** The line of a line scene for a state: its slope and where it meets the y-axis. */
function lineOf(s: LineScene, state: SceneState) { const m = state.m; return { m, c: s.through ? s.through[1] - m * s.through[0] : state.c ?? 0 }; }

/** A bar chart's scale: its top (the first numbered line at or above the tallest bar) and the bar the line is to reach. */
const barsTop = (s: BarsScene) => { const g = s.scale ?? 1; return Math.max(g, Math.ceil(Math.max(...s.values) / g) * g); };
const barsAim = (s: BarsScene) => ("read" in s.ask ? s.ask.read : s.ask.more[1]);
const BX = 46, BW = 280, BY0 = 176, BH = 150;
const barY = (s: BarsScene, v: number) => px(BY0 - (v / barsTop(s)) * BH);
/** An order scene's cards from left to right: by the place each is given, and by the order given where two share a place. */
function orderOf(s: OrderScene, state: SceneState): number[] { return s.values.map((_, i) => i).sort((a, b) => state[`p${a}`] - state[`p${b}`] || a - b); }
const cardGrid = (s: OrderScene) => { const w = Math.min(64, 300 / s.values.length); return { w, left: px(170 - (s.values.length * w) / 2) }; };
/** Where a commas scene's commas belong: each as the number of digits to its right. */
function commaPlaces(s: CommasScene): number[] {
  const out: number[] = [];
  for (let p = 3; p < s.digits.length; p += s.style === "indian" ? 2 : 3) out.push(p);
  return out;
}
/** A commas scene's layout: the gap between digits, and where the last digit sits. */
const commaGrid = (s: CommasScene) => { const gap = Math.min(30, 280 / s.digits.length); return { gap, right: px(170 + ((s.digits.length - 1) * gap) / 2) }; };
const commaX = (s: CommasScene, p: number) => { const g = commaGrid(s); return px(g.right - (p - 1) * g.gap - g.gap / 2); };
/** A fraction scene's pieces and shaded pieces (never more shaded than there are pieces). */
function fracOf(s: FractionScene, state: SceneState) { const n = s.pieces ?? state.n, k = Math.min(s.shaded ?? state.k, n); return { n, k }; }
const arrOf = (s: ArrayScene, state: SceneState) => ({ rows: s.rows ?? state.r, cols: state.c });
/** Where a number sits across a number-line picture. */
const NL = 24, NR = 316;
const lineX = (s: NumberLineScene, v: number) => px(NL + ((v - s.from) / (s.to - s.from)) * (NR - NL));

/** tally@1: the tiles in the lift, in the order they went in. In order unless `anyOrder`; then `seq` keeps the order as
 *  digits (tile 1 is digit 1), and a slider move that leaves it out of step falls back to the first tiles. */
export function tallyOrder(s: TallyKind, state: SceneState): number[] {
  const n = state.dropped ?? 0, first = Array.from({ length: n }, (_, i) => i);
  if (!s.anyOrder || !state.seq) return first;
  const seq = String(state.seq).split("").map((d) => Number(d) - 1);
  return seq.length === n && new Set(seq).size === n && seq.every((i) => i >= 0 && i < s.tiles.length) ? seq : first;
}
/** Where the counter stands once the tiles in the lift have all been counted. */
export const tallyTotal = (s: TallyKind, state: SceneState) => tallyOrder(s, state).reduce((a, i) => a + s.tiles[i], s.start);
/** A tally state with only what lasts: how many tiles are in (and their order); no finger, no refusal, no counting. */
const tallyRest = (state: SceneState): SceneState => ({ dropped: state.dropped ?? 0, ...(state.seq ? { seq: state.seq } : {}) });

/** The two heights a join scene compares at its meeting point, and the height of the point itself. */
function joinOf(s: JoinScene, state: SceneState) {
  const left = evalPoly(s.left, s.at), right = evalPoly(s.right, s.at) + (s.mode === "shift" ? state.k : 0);
  return { left, right, point: s.mode === "point" ? state.k : left };
}

/** The numbers a scene can be judged by, for a state. Goals name one of these. */
export function measures(s: Scene, state: SceneState): Record<string, number> {
  if ((s.kind === "tally" && liftLook(s))) { const n = liftNow(s, state); return { total: tallyAt(s.start, s.tiles, n.moves), dropped: n.moves }; }
  if (s.kind === "tally") return { total: tallyTotal(s, state), dropped: state.dropped };
  if (s.kind === "sort") { const n = sortNow(s, state); return { done: n.finished ? 1 : 0, step: n.step }; }
  if (s.kind === "boxes") { const b = boxesNow(s, state); return { placed: b.placed, counted: b.counted, step: b.step }; }
  if (s.kind === "pick") { const id = pickParts(s.figure)[state.part - 1]; return { part: state.part, wrong: id !== undefined && s.ask.includes(id) ? 0 : 1 }; }
  if (s.kind === "tangent") { const t = tangentOf(s.a, s.b, state.turn); return { turn: state.turn, x: r6(t.x), y: r6(t.y), flat: t.flat ? 1 : 0, upright: t.upright ? 1 : 0, slope: t.upright ? 0 : r6(t.slope), sloped: t.upright ? 0 : 1 }; }
  if (s.kind === "ratios") { const r = ratiosOf(state.angle, state.size); return { angle: state.angle, size: state.size, sin: r6(r.sin), cos: r6(r.cos), tan: r6(r.tan) }; }
  if (s.kind === "bars") {
    const y = state.y, more = "more" in s.ask ? s.values[s.ask.more[0]] - y : 0;
    return { y, miss: Math.abs(y - s.values[barsAim(s)]), above: more };
  }
  if (s.kind === "order") {
    const row = orderOf(s, state).map((i) => s.values[i]);
    return { wrong: row.filter((v, i) => i > 0 && row[i - 1] > v).length, first: row[0], last: row[row.length - 1] };
  }
  if (s.kind === "commas") {
    const want = commaPlaces(s), have = new Set(want.map((_, i) => state["abc"[i]]));
    return { ...Object.fromEntries(want.map((_, i) => ["abc"[i], state["abc"[i]]])), miss: want.filter((p) => !have.has(p)).length };
  }
  if (s.kind === "fraction") {
    // compared by cross-multiplying, so equal fractions are exactly equal
    const { n, k } = fracOf(s, state), [tn, td] = s.target, cross = k * td - tn * n;
    return { n, k, miss: Math.abs(cross) / (n * td), ahead: cross / (n * td), behind: -cross / (n * td), other: cross === 0 && n !== td ? 0 : 1, exact: n === td && k === tn ? 0 : 1 };
  }
  if (s.kind === "numberline") return { x: state.x, moved: r6(state.x - s.start), size: Math.abs(state.x) };
  if (s.kind === "array") { const { rows, cols } = arrOf(s, state); const spare = s.total - rows * cols; return { rows, cols, count: rows * cols, off: Math.abs(spare), left: spare >= 0 && spare < rows ? spare : 999 }; }
  if (s.kind === "rectangle") {
    const { w, h } = state, perimeter = 2 * (w + h), area = w * h;
    // the largest area a whole-number rectangle of the asked perimeter can have: its sides as nearly equal as they can be
    const half = (s.perimeter ?? perimeter) / 2, best = Math.floor(half / 2) * Math.ceil(half / 2);
    return { w, h, perimeter, area, off: (s.perimeter === undefined ? 0 : Math.abs(perimeter - s.perimeter)) + (s.area === undefined ? 0 : Math.abs(area - s.area)), shortOfBest: s.perimeter !== undefined && perimeter === s.perimeter ? best - area : 999 };
  }
  if (s.kind === "join") { const j = joinOf(s, state); return { k: state.k, ...j, gap: Math.abs(j.left - j.right), miss: Math.abs(j.left - j.right) + Math.abs(j.point - j.left) }; }
  if (s.kind === "triangle") { const t = tri(state); return { ...t, sum: t.a + t.b + t.c, miss: Math.abs(state.a - s.angles[0]) + Math.abs(state.b - s.angles[1]) }; }
  if (s.kind === "transform") { const { a, b, c, d } = state, t = s.target; return { a, b, c, d, det: a * d - b * c, miss: t ? Math.abs(a - t[0]) + Math.abs(b - t[1]) + Math.abs(c - t[2]) + Math.abs(d - t[3]) : 0 }; }
  if (s.kind === "line") { const l = lineOf(s, state); return { ...l, miss: s.targets.reduce((t, [x, y]) => t + Math.abs(l.m * x + l.c - y), 0) }; }
  const f = curveOf(s);
  if (s.kind === "strips") {
    const n = state.n, w = (s.to - s.from) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += f.value(s.from + i * w) * w;
    const exact = f.area(s.from, s.to);
    return { n, sum, exact, gap: Math.abs(exact - sum), gapPercent: (Math.abs(exact - sum) / Math.max(Math.abs(exact), 1e-9)) * 100 };
  }
  if (s.kind === "slope") return { x: state.x, value: f.value(state.x), slope: f.slope(state.x) };
  return { x: state.x, height: f.value(state.x), total: f.area(s.from, state.x), width: state.x - s.from };
}
const MEASURES: Record<SceneKind, string[]> = { sort: ["done", "step"], boxes: ["placed", "counted", "step"], tally: ["total", "dropped"], tangent: ["turn", "x", "y", "flat", "upright", "slope", "sloped"], pick: ["part", "wrong"], ratios: ["angle", "size", "sin", "cos", "tan"], bars: ["y", "miss", "above"], order: ["wrong", "first", "last"], commas: ["a", "b", "c", "miss"], fraction: ["n", "k", "miss", "ahead", "behind", "other", "exact"], numberline: ["x", "moved", "size"], array: ["rows", "cols", "count", "off", "left"], strips: ["n", "sum", "exact", "gap", "gapPercent"], slope: ["x", "value", "slope"], accumulate: ["x", "height", "total", "width"], line: ["m", "c", "miss"], triangle: ["a", "b", "c", "sum", "miss"], transform: ["a", "b", "c", "d", "det", "miss"], rectangle: ["w", "h", "perimeter", "area", "off", "shortOfBest"], join: ["k", "left", "right", "point", "gap", "miss"] };

/** Whether the goal is reached in this state. */
export function met(s: Scene, state: SceneState): boolean {
  const v = measures(s, state)[s.goal.measure];
  if (!fin(v)) return false;
  return s.goal.equals !== undefined ? Math.abs(v - s.goal.equals) <= (s.goal.tol ?? 1e-6) : s.goal.below !== undefined ? v < s.goal.below : false;
}

const named = (s: Scene, text: string) => (s.variable && s.variable !== "x" ? text.replaceAll("x", s.variable) : text);
/** The one line of numbers under the picture. It never states the answer before the learner has reached it by moving
 *  something (the strips line gives what is missing, not the true area). */
/**
 * nudge@1: while a scene's goal is not reached, one line about what is still out of place, never the answer. Commas:
 * counting groups from the right, the first group that has the wrong number of digits (and how many it should have,
 * which the instruction already says). Null where the scene has no nudge, or its goal is reached.
 */
/**
 * tried@1: one line for a number of rows the learner has tried: the fullest equal rows that many rows can make from the
 * total, and who is left over ("3 rows: 4 in each, 1 left over"). Null for a scene that keeps no log, or a try that is
 * not an arrangement (one row, or more rows than things).
 */
export function triedLine(s: Scene, rows: number): string | null {
  if (s.kind !== "array" || !s.log || !Number.isInteger(rows) || rows < 2 || rows > s.total) return null;
  const each = Math.floor(s.total / rows), over = s.total - rows * each;
  return `${rows} rows: ${each} in each, ${over === 0 ? "nobody left over" : `${over} left over`}`;
}
export function nudge(s: Scene, state: SceneState): string | null {
  // boxes@1: a tap on the box that is not its turn: which box (it shakes; the words are also said)
  if (s.kind === "boxes") return state.refused ? boxesRefusal(state.refused) : null;
  // sort@1: a button that does not belong: what it is ("No. That one is small.")
  if (s.kind === "sort") return sortRefusal(s, state);
  // tally@1: a tile dropped out of turn went back; the one to drop now is named (it is the next tile, not an answer)
  // lift@1: the other button pressed: which way to go
  if ((s.kind === "tally" && liftLook(s))) { const n = liftNow(s, state); return state.no && n.want ? LIFT.wrong(n.want) : null; }
  if (s.kind === "tally") return state.refused && state.dropped < s.tiles.length ? `Not yet. First the ${tallyTileLabel(s.tiles, state.dropped, s.start, s.unit, s.goTo)} tile.` : null;
  // pick-nudge@1: a wrong tap is named back (what that part is), with the scene's own hint; never which part is right
  if (s.kind === "pick") { const id = pickParts(s.figure)[state.part - 1]; return id === undefined || s.ask.includes(id) ? null : `That is ${pickName(s.figure, id)}. ${s.hint}`; }
  // a point carried to the far end of its line: how far that was, and a pointer to the other end (never which is right)
  if (s.kind === "numberline" && s.jump && !s.quiet && s.goal.measure === "x" && (state.x === s.from || state.x === s.to) && state.x !== s.goal.equals) {
    const steps = Math.abs(r6(state.x - s.start));
    return `That is ${fmt(steps)} step${steps === 1 ? "" : "s"} from ${fmt(s.start)}. Now count the steps to ${fmt(state.x === s.from ? s.to : s.from)}.`;
  }
  // fraction-nudge@1: a bar shaded against one to compare with is told which way to go (never how many pieces)
  if (s.kind === "fraction" && s.show && s.goal.measure === "miss") {
    const m = measures(s, state);
    return m.ahead > 0 ? "Too much: your shading goes past the dashed line. Shade less." : m.ahead < 0 ? "Not enough yet: shade up to the dashed line." : null;
  }
  if (s.kind !== "commas") return null;
  const want = commaPlaces(s), have = want.map((_, i) => state["abc"[i]]).sort((a, b) => a - b);
  for (let i = 0; i < want.length; i++) {
    if (have[i] === want[i]) continue;
    const size = have[i] - (i ? have[i - 1] : 0), should = want[i] - (i ? want[i - 1] : 0);
    const which = i === 0 ? "The last group on the right" : i === 1 ? "The group before it" : "The next group to the left";
    return size === 0 ? "Two commas are in the same place. Drag one of them away." : `${i > 0 ? `${i === 1 ? "The last group is right. " : "The groups on the right are right. "}` : ""}${which} has ${size} digit${size === 1 ? "" : "s"}; it should have ${should}.`;
  }
  return null;
}

export function readout(s: Scene, state: SceneState): string {
  // boxes@1: nothing while counting; "3 and 2" once both boxes are counted; "3 + 2 = 5" at the end
  if (s.kind === "sort") return sortSum(s, state);
  if (s.kind === "boxes") { const b = boxesNow(s, state); return b.phase === "done" && !state.w && !state.wait ? `${s.a} + ${s.b} = ${s.a + s.b}` : b.phase !== "count" && !state.stay ? `${s.a} and ${s.b}` : ""; }
  if ((s.kind === "tally" && liftLook(s))) return liftSum(s, state);
  if (s.kind === "tally") {
    // "2 + 6 = 8" from the tiles in so far ("5 − 10 = −5"); "= …" while the counter is still counting
    const order = tallyOrder(s, state), total = tallyTotal(s, state);
    // money reads in rupees everywhere it is written ("₹2 + ₹2 = ₹4"), as the tiles, the car and the counter do
    const u = (n: number) => tallyNum(n, s.unit);
    if (!order.length) return `Start at ${u(s.start)}`;
    // change-up@1: how far it went is what the child finds: "₹48 + ? = ₹50" until the lift is there
    if (s.goTo) { const end = tallyAt(s.start, s.tiles, s.tiles.length), there = order.length === s.tiles.length && (state.at === undefined || state.at === total); return `${u(s.start)} + ${there ? u(end - s.start) : "?"} = ${u(end)}`; }
    // a start of 0 is left out once two tiles are in ("2 + 6 = 8"); one tile from 0 reads "0 + 2 = 2"
    const bare = s.start === 0 && s.tiles[order[0]] > 0 && order.length > 1;
    const terms = order.map((i, k) => (k === 0 && bare ? u(s.tiles[i]) : `${s.tiles[i] < 0 ? "−" : "+"} ${u(Math.abs(s.tiles[i]))}`));
    const head = bare ? terms.join(" ") : `${u(s.start)} ${terms.join(" ")}`;
    return `${head} = ${state.at !== undefined && state.at !== total ? "…" : u(total)}`;
  }
  if (s.kind === "pick") { const id = pickParts(s.figure)[state.part - 1]; return id === undefined ? "Tap the picture to choose." : `You chose ${pickName(s.figure, id).split(":")[0]}.`; }
  if (s.kind === "tangent") { const t = tangentOf(s.a, s.b, state.turn), two = (n: number) => fmt(Math.round(n * 100) / 100); return `Point (${two(t.x)}, ${two(t.y)}) · ${t.upright ? "the tangent is straight up: it has no slope" : t.flat ? "the tangent is flat: slope 0" : `slope of the tangent = ${two(t.slope)}`}${s.normal && !t.upright && !t.flat ? ` · slope of the normal = ${two(-1 / t.slope)}` : ""}`; }
  if (s.kind === "ratios") { const r = ratiosOf(state.angle, state.size), one = (n: number) => fmt(Math.round(n * 10) / 10), two = (n: number) => fmt(Math.round(n * 100) / 100); return `θ = ${state.angle}° · sin θ = ${one(r.opp)} ÷ ${one(state.size)} = ${two(r.sin)} · cos θ = ${two(r.cos)} · tan θ = ${two(r.tan)}`; }
  const m = measures(s, state);
  if (s.kind === "slope") return named(s, `At x = ${fmt(m.x)} the slope is ${fmt(m.slope)}`);
  if (s.kind === "accumulate") return named(s, `From x = ${fmt(s.from)} to x = ${fmt(m.x)}: area ${fmt(m.total)}`);
  if (s.kind === "strips") return `${m.n} ${m.n === 1 ? "strip" : "strips"} add up to ${fmt(m.sum)} · missing ${fmt(m.gapPercent)}%`;
  if (s.kind === "triangle") return `${m.a}° + ${m.b}° + ${m.c}° = 180°`;
  if (s.kind === "bars") {
    if ("read" in s.ask) return `The line is at ${fmt(m.y)}`;
    const tall = s.labels[s.ask.more[0]];
    return `The line is at ${fmt(m.y)} · ${tall} ${m.above > 0 ? `rises ${fmt(m.above)} above it` : m.above < 0 ? `stops ${fmt(-m.above)} below it` : "is level with it"}`;
  }
  if (s.kind === "order") return `Now: ${orderOf(s, state).map((i) => fmt(s.values[i])).join(", ")}`;
  if (s.kind === "commas") {
    // the number as it now reads, comma by comma (the digits never change, so this gives nothing away)
    const at = new Set(commaPlaces(s).map((_, i) => state["abc"[i]]));
    return [...s.digits].map((d, i) => (at.has(s.digits.length - i) && i > 0 ? `,${d}` : d)).join("");
  }
  if (s.kind === "fraction") return `${m.k} of ${m.n} equal ${m.n === 1 ? "piece" : "pieces"} shaded`;
  if (s.kind === "numberline") {
    if (s.hide) return "Count the marks from a number you can see.";
    if (s.size) return m.x === 0 ? "At 0 · no distance from 0 · |0| = 0" : `${fmt(m.x)} is ${fmt(m.size)} from 0 · |${fmt(m.x)}| = ${fmt(m.size)}`;
    if (s.jump) return m.moved === 0 ? `Start at ${fmt(s.start)}` : `Start at ${fmt(s.start)} · ${fmt(Math.abs(m.moved))} ${m.moved < 0 ? "back" : "forward"} · now at ${fmt(m.x)}`;
    if (s.near) { const lo = Math.floor(m.x / s.near + 1e-9) * s.near; return Math.abs(m.x - lo) < 1e-9 ? `At ${fmt(m.x)}` : `At ${fmt(m.x)} · ${fmt(m.x - lo)} from ${fmt(lo)} · ${fmt(lo + s.near - m.x)} from ${fmt(lo + s.near)}`; }
    return `At ${fmt(m.x)}`;
  }
  if (s.kind === "array" && s.share) return `${m.rows} ${m.rows === 1 ? "row" : "rows"} of ${m.cols} = ${m.count} · ${m.count > s.total ? `${m.off} too many` : `${m.off} left over`}`;
  if (s.kind === "array") return `${m.rows} ${m.rows === 1 ? "row" : "rows"} of ${m.cols} = ${m.count}${m.off ? ` · ${m.off} ${m.count < s.total ? "short of" : "more than"} ${s.total}` : ""}`;
  if (s.kind === "rectangle") { const [p, a] = s.words ?? ["perimeter", "area"]; return `${m.w} by ${m.h} · ${p} ${m.perimeter} · ${a} ${m.area}`; }
  if (s.kind === "join") return s.mode === "shift" ? `From the left: ${fmt(m.left)} · from the right: ${fmt(m.right)}` : `Both sides head for ${fmt(m.left)} · the point is at ${fmt(m.point)}`;
  if (s.kind === "transform") return `Arrows land at (${fmt(m.a)}, ${fmt(m.b)}) and (${fmt(m.c)}, ${fmt(m.d)}) · area × ${fmt(m.det)}`;
  return `y = ${fmt(m.m)}x ${m.c < 0 ? "−" : "+"} ${fmt(Math.abs(m.c))}`;
}

/** The corners of a triangle scene in the box: base AB at the bottom, C from the two angles, shrunk to fit when tall. */
function corners(state: SceneState) {
  const t = tri(state), base = 220, ac = (base * Math.sin(rad(t.b))) / Math.sin(rad(t.c));
  const raw = [[0, 0], [base, 0], [ac * Math.cos(rad(t.a)), -ac * Math.sin(rad(t.a))]];
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const k = Math.min(1, 280 / w, 150 / h), ox = (SCENE_BOX.w - k * w) / 2 - k * Math.min(...xs), oy = 185;
  return { t, pts: raw.map(([x, y]) => [px(ox + k * x), px(oy + k * y)] as [number, number]) };
}

/** The shape a transform scene moves (a letter F, so a flip and a turn can be told apart), and its place in the box. */
const F_SHAPE: [number, number][] = [[0, 0], [0.25, 0], [0.25, 0.5], [0.6, 0.5], [0.6, 0.75], [0.25, 0.75], [0.25, 1], [0.75, 1], [0.75, 1.25], [0, 1.25]];
const TU = 26, TX = (x: number) => px(170 + TU * x), TY = (y: number) => px(110 - TU * y);

/** What to draw for a state. */
export function draw(s: Scene, state: SceneState): Shape[] {
  if (s.kind === "sort") {
    const n = sortNow(s, state), L = sortLay(s, state), B = sortButtons(s.counts), jars = sortJars(s, state), still = state.w || state.ph || state.pd;
    const can = n.started && !n.finished && !still ? B.map((_, i) => i).filter((i) => n.loc[i] === n.from) : [];
    return sortDraw(L, {
      buttons: B, xy: B.map((_, i) => sortXY(s, state, i)), inJar: n.loc.map((l) => l > 0), can,
      jars: jars.map((j, k) => ({ ...j, n: n.jar[k], glow: n.started && !n.finished && !state.ph && n.into === k + 1 })),
      go: state.fb || still || state.gx !== undefined ? null : !n.started ? "start" : n.finished ? "again" : null,
      ...(state.nb ? { shake: { i: state.nb - 1, odd: (state.no ?? 0) % 2 === 1 } } : {}),
      ...(state.fb ? { fly: { i: state.fb - 1, x: state.fx, y: state.fy, k: state.fk / 100 } } : {}),
      ...(state.gx !== undefined ? { finger: [state.gx, state.gy] as [number, number] } : {}),
    });
  }
  if (s.kind === "boxes") {
    const b = boxesNow(s, state), L = boxesLayout(s.a, s.b), n = s.a + s.b;
    const glow = state.w ? 0 : state.stay ? (b.counted <= s.a ? 1 : 2) : b.want;
    const shown = (k: number) => (k ? b.kb.length === s.b : b.ka.length === s.a) && !(state.hide === k + 1);
    const held = state.carry ? { i: state.carry - 1, x: state.cx, y: state.cy } : state.held !== undefined && state.held >= 0 && b.phase === "place" && state.hx !== undefined ? { i: state.held, x: state.hx, y: state.hy } : undefined;
    return boxesDraw(L, {
      a: s.a, b: s.b, thing: s.thing, name: s.names[0][0].toUpperCase() + s.names[0].slice(1), ka: b.ka, kb: b.kb, gone: b.gone, glow,
      ...(state.refused ? { shake: { box: state.refused, odd: (state.no ?? 0) % 2 === 1 } } : {}),
      badges: [shown(0), shown(1)], next: b.phase === "place" && !state.w && !state.stay && b.placed < n ? b.placed : -1, lit: state.lit ? state.lit - 1 : -1,
      ...(held ? { held } : {}), ...(state.fx !== undefined ? { finger: [state.fx, state.fy] as [number, number] } : {}),
    });
  }
  if ((s.kind === "tally" && liftLook(s))) {
    const n = liftNow(s, state);
    return liftDraw({
      start: s.start, tiles: s.tiles, floors: liftFloors(s), at: state.at ?? n.floor, door: state.door === 2, lit: !!state.lit, started: n.started, finished: n.finished && !state.hold,
      k: Math.min(n.k, s.tiles.length - 1), done: n.finished ? Math.abs(s.tiles[s.tiles.length - 1]) : n.done, want: n.want, ...(state.nb ? { wrong: { b: state.nb - 1, odd: (state.no ?? 0) % 2 === 1 } } : {}),
      ...(state.held !== undefined && state.held >= 0 ? { held: state.held } : {}), ...(state.fin !== undefined ? { finger: state.fin } : {}),
    });
  }
  if (s.kind === "tally") {
    const used = tallyOrder(s, state), held = state.held !== undefined && state.held >= 0 ? { i: state.held, x: state.hx, y: state.hy } : undefined;
    return tallyDraw({ floors: s.floors, start: s.start, tiles: s.tiles, used, at: state.at ?? tallyTotal(s, state), from: state.from, held, refused: state.refused ? state.refused - 1 : undefined, unit: s.unit, hintArrow: used.length === 0 && !held, ...(s.goTo ? { goTo: true } : {}), ...(state.taken ? { taken: state.taken - 1 } : {}) });
  }
  if (s.kind === "pick") { const id = pickParts(s.figure)[state.part - 1] ?? null; return pickDraw(s.figure, id, id !== null && s.ask.includes(id), !!s.labels); }
  if (s.kind === "tangent") return tangentDraw(s.a, s.b, state.turn, !!s.normal);
  if (s.kind === "ratios") return ratiosDraw(state.angle, state.size, (n) => fmt(Math.round(n * 10) / 10));
  const out: Shape[] = [];
  if (s.kind === "bars") {
    const top = barsTop(s), g = s.scale ?? 1, lines = Math.round(top / g), every = lines > 12 ? Math.ceil(lines / 10) : 1, n = s.values.length, slot = BW / n;
    for (let i = 0; i <= lines; i++) {
      const v = i * g;
      out.push({ t: "line", x1: BX, y1: barY(s, v), x2: BX + BW, y2: barY(s, v), role: i === 0 ? "axis" : "grid" });
      if (i % every === 0) out.push({ t: "text", x: BX - 16, y: barY(s, v) + 4, s: fmt(v), role: "label" });
    }
    s.values.forEach((v, i) => {
      const x = px(BX + i * slot + slot * 0.15);
      out.push({ t: "rect", x, y: barY(s, v), w: px(slot * 0.7), h: px(BY0 - barY(s, v)), role: "cell" }, { t: "text", x: px(BX + i * slot + slot / 2), y: BY0 + 16, s: s.labels[i].length > 9 ? `${s.labels[i].slice(0, 8)}…` : s.labels[i], role: "label" });
    });
    if ("more" in s.ask && state.y !== s.values[s.ask.more[0]]) { const x = px(BX + s.ask.more[0] * slot + slot / 2); out.push({ t: "line", x1: x, y1: barY(s, state.y), x2: x, y2: barY(s, s.values[s.ask.more[0]]), role: "edge" }); }
    out.push({ t: "line", x1: BX - 6, y1: barY(s, state.y), x2: BX + BW, y2: barY(s, state.y), role: "accent" }, { t: "circle", cx: BX + BW, cy: barY(s, state.y), r: 12, role: "handle" });
    return out;
  }
  if (s.kind === "order") {
    const g = cardGrid(s);
    orderOf(s, state).forEach((card, slot) => {
      const x = px(g.left + slot * g.w);
      out.push({ t: "rect", x: x + 3, y: 70, w: px(g.w - 6), h: 64, role: "card" }, { t: "text", x: px(x + g.w / 2), y: 110, s: fmt(s.values[card]), role: "cardtext" });
    });
    out.push({ t: "text", x: px(g.left + 26), y: 158, s: "smallest", role: "label" }, { t: "text", x: px(g.left + s.values.length * g.w - 24), y: 158, s: "largest", role: "label" });
    return out;
  }
  if (s.kind === "commas") {
    const g = commaGrid(s), n = s.digits.length;
    [...s.digits].forEach((d, i) => out.push({ t: "text", x: px(g.right - (n - 1 - i) * g.gap), y: 104, s: d, role: "digit" }));
    commaPlaces(s).forEach((_, i) => {
      const x = commaX(s, state["abc"[i]]);
      out.push({ t: "text", x, y: 110, s: ",", role: "comma" }, { t: "line", x1: x, y1: 118, x2: x, y2: 140, role: "edge" }, { t: "circle", cx: x, cy: 152, r: 12, role: "handle" });
    });
    return out;
  }
  if (s.kind === "fraction") {
    const { n, k } = fracOf(s, state), [tn, td] = s.target, x0 = 30, W = 280;
    const bar = (y: number, h: number, pieces: number, shaded: number, role: string) => {
      for (let i = 0; i < pieces; i++) out.push({ t: "rect", x: px(x0 + (i * W) / pieces), y, w: px(W / pieces), h, role: i < shaded ? role : "blank" });
      out.push({ t: "path", d: `M${x0} ${y}h${W}v${h}h${-W}Z`, role: "outline" });
    };
    // fraction-labels@1: a bar to compare with says what it is, the learner's bar says what it shows now, and a dashed line
    // carries the end of the green part down, so "the same amount" can be seen rather than worked out
    if (s.show) {
      // the labels sit on the side away from the dashed line, so the two never cross
      const gx = px(x0 + (tn * W) / td), lx = gx > 170 ? 60 : 280;
      bar(22, 30, td, tn, "wedge1");
      out.push({ t: "text", x: lx, y: 16, s: `${tn}/${td}`, role: "fraclabel" });
      if (n !== 100) {
        out.push({ t: "text", x: lx, y: 76, s: `${k}/${n}`, role: "fraclabel" });
        out.push({ t: "line", x1: gx, y1: 22, x2: gx, y2: 156, role: "guide" });
      }
    }
    if (n === 100) {
      // a hundred-square, filled a row at a time
      const U = 15, gx = 95, gy = s.show ? 58 : 34;
      for (let i = 0; i < 100; i++) out.push({ t: "rect", x: gx + (i % 10) * U, y: gy + Math.floor(i / 10) * U, w: U, h: U, role: i < k ? "cell" : "blank" });
      out.push({ t: "path", d: `M${gx} ${gy}h${10 * U}v${10 * U}h${-10 * U}Z`, role: "outline" });
    } else {
      bar(s.show ? 84 : 60, 64, n, k, "cell");
      if (s.shaded === undefined) out.push({ t: "circle", cx: px(x0 + (k * W) / n), cy: s.show ? 116 : 92, r: 12, role: "handle" });
    }
    return out;
  }
  if (s.kind === "numberline") {
    const y0 = 124, count = Math.round((s.to - s.from) / s.step), gap = s.label ?? s.step;
    out.push({ t: "line", x1: NL - 10, y1: y0, x2: NR + 10, y2: y0, role: "axis" });
    for (let i = 0; i <= count; i++) {
      const v = r6(s.from + i * s.step), numbered = Math.abs(v / gap - Math.round(v / gap)) < 1e-9;
      if (count <= 60 || numbered) out.push({ t: "line", x1: lineX(s, v), y1: y0 - (numbered ? 9 : 5), x2: lineX(s, v), y2: y0 + (numbered ? 9 : 5), role: "axis" });
      if (numbered && (count / Math.max(1, Math.round(gap / s.step)) <= 21)) out.push({ t: "text", x: lineX(s, v), y: y0 + 26, s: fmt(v), role: "label" });
    }
    if (s.jump) {
      const a = lineX(s, s.start), b = lineX(s, state.x);
      if (a !== b) out.push({ t: "path", d: `M${a} ${y0 - 14}Q${px((a + b) / 2)} ${px(y0 - 14 - Math.min(70, Math.abs(b - a) / 2 + 14))} ${b} ${y0 - 14}`, role: "curve2" });
      out.push({ t: "circle", cx: a, cy: y0, r: 6, role: "open" });
    }
    if (s.size) {
      // the distance from 0: a bar above the line from 0 to the point, its length written over it
      const a = lineX(s, 0), b = lineX(s, state.x);
      out.push({ t: "circle", cx: a, cy: y0, r: 5, role: "open" });
      if (a !== b) out.push({ t: "line", x1: a, y1: y0 - 22, x2: b, y2: y0 - 22, role: "curve2" }, { t: "line", x1: a, y1: y0 - 30, x2: a, y2: y0 - 14, role: "curve2" }, { t: "line", x1: b, y1: y0 - 30, x2: b, y2: y0 - 14, role: "curve2" }, { t: "text", x: px((a + b) / 2), y: y0 - 36, s: `${fmt(Math.abs(state.x))} from 0`, role: "value" });
    }
    out.push({ t: "circle", cx: lineX(s, state.x), cy: y0, r: 11, role: "handle" });
    if (!s.hide) out.push({ t: "text", x: lineX(s, state.x), y: y0 + 48, s: fmt(state.x), role: "value" });
    return out;
  }
  if (s.kind === "array") {
    const { rows, cols } = arrOf(s, state), U = 19;
    // a child: a head on shoulders (the same footprint as a counter)
    const child = (cx: number, cy: number, role: string) => { out.push({ t: "circle", cx, cy: cy - 3.5, r: 4, role }, { t: "path", d: `M${cx - 6.5} ${cy + 8}a6.5 6.5 0 0 1 13 0Z`, role }); };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (s.people) child(37 + c * U, 24 + r * U, "cell"); else out.push({ t: "circle", cx: 37 + c * U, cy: 24 + r * U, r: 7, role: "cell" }); }
    // when sharing out, the counters not yet placed wait in a line underneath; so do the children who do not fit in the rows
    if (s.share || s.people) for (let i = 0; i < Math.min(15, Math.max(0, s.total - rows * cols)); i++) { if (s.people) child(37 + i * U, 209, "blank"); else out.push({ t: "circle", cx: 37 + i * U, cy: 208, r: 7, role: "blank" }); }
    return out;
  }
  if (s.kind === "rectangle") {
    const { w, h } = state, U = 20, x0 = 60, y0 = 196;
    for (let i = 0; i <= 9; i++) out.push({ t: "line", x1: x0 + i * U, y1: y0 - 9 * U, x2: x0 + i * U, y2: y0, role: "grid" }, { t: "line", x1: x0, y1: y0 - i * U, x2: x0 + 9 * U, y2: y0 - i * U, role: "grid" });
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push({ t: "rect", x: x0 + i * U, y: y0 - (j + 1) * U, w: U, h: U, role: "cell" });
    out.push({ t: "path", d: `M${x0} ${y0}h${w * U}v${-h * U}h${-w * U}Z`, role: "outline" });
    out.push({ t: "text", x: x0 + (w * U) / 2, y: y0 + 16, s: String(w), role: "value" }, { t: "text", x: x0 - 14, y: y0 - (h * U) / 2 + 4, s: String(h), role: "value" });
    out.push({ t: "circle", cx: x0 + w * U, cy: y0 - h * U, r: 12, role: "handle" });
    return out;
  }
  if (s.kind === "join") {
    const j = joinOf(s, state), lo = Math.min(0, ...[s.from, s.at].map((x) => evalPoly(s.left, x)), ...[s.at, s.to].flatMap((x) => [evalPoly(s.right, x) + (s.mode === "shift" ? s.k[0] : 0), evalPoly(s.right, x) + (s.mode === "shift" ? s.k[1] : 0)]), s.mode === "point" ? s.k[0] : 0);
    const hi = Math.max(0, ...[s.from, s.at].map((x) => evalPoly(s.left, x)), ...[s.at, s.to].flatMap((x) => [evalPoly(s.right, x) + (s.mode === "shift" ? s.k[0] : 0), evalPoly(s.right, x) + (s.mode === "shift" ? s.k[1] : 0)]), s.mode === "point" ? s.k[1] : 0);
    const X = (x: number) => px(L + ((x - s.from) / (s.to - s.from)) * (R - L)), Y = (y: number) => px(B - ((y - lo) / (hi - lo || 1)) * (B - T));
    const shift = s.mode === "shift" ? state.k : 0;
    const line = (p: Poly, a: number, b: number, add: number) => { let d = ""; for (let i = 0; i <= 40; i++) { const x = a + ((b - a) * i) / 40; d += `${i ? "L" : "M"}${X(x)} ${Y(evalPoly(p, x) + add)}`; } return d; };
    out.push({ t: "line", x1: L - 6, y1: Y(0), x2: R + 6, y2: Y(0), role: "axis" });
    out.push({ t: "line", x1: X(s.at), y1: T, x2: X(s.at), y2: B, role: "edge" });
    out.push({ t: "path", d: line(s.left, s.from, s.at, 0), role: "curve" }, { t: "path", d: line(s.right, s.at, s.to, shift), role: s.mode === "shift" ? "curve2" : "curve" });
    out.push({ t: "circle", cx: X(s.at), cy: Y(j.left), r: 5, role: "open" }, { t: "circle", cx: X(s.at), cy: Y(j.right), r: 5, role: "open" });
    out.push({ t: "text", x: X(s.at), y: Math.min(SCENE_BOX.h - 4, Y(0) + 26), s: fmt(s.at), role: "label" });
    out.push({ t: "circle", cx: s.mode === "shift" ? X(s.at + (s.to - s.at) / 2) : X(s.at), cy: s.mode === "shift" ? Y(evalPoly(s.right, s.at + (s.to - s.at) / 2) + shift) : Y(j.point), r: 12, role: "handle" });
    return out;
  }
  if (s.kind === "transform") {
    const { a, b, c, d } = state;
    for (let k = -6; k <= 6; k++) out.push({ t: "line", x1: TX(k), y1: 6, x2: TX(k), y2: 214, role: k ? "grid" : "axis" });
    for (let k = -4; k <= 4; k++) out.push({ t: "line", x1: 14, y1: TY(k), x2: 326, y2: TY(k), role: k ? "grid" : "axis" });
    const path = (f: (p: [number, number]) => [number, number]) => `${F_SHAPE.map((p, i) => { const q = f(p); return `${i ? "L" : "M"}${TX(q[0])} ${TY(q[1])}`; }).join("")}Z`;
    out.push({ t: "path", d: path((p) => p), role: "ghost" });
    out.push({ t: "path", d: path(([x, y]) => [a * x + c * y, b * x + d * y]), role: "moved" });
    out.push({ t: "line", x1: TX(0), y1: TY(0), x2: TX(a), y2: TY(b), role: "arrow0" }, { t: "line", x1: TX(0), y1: TY(0), x2: TX(c), y2: TY(d), role: "arrow1" });
    out.push({ t: "circle", cx: TX(a), cy: TY(b), r: 12, role: "handle0" }, { t: "circle", cx: TX(c), cy: TY(d), r: 12, role: "handle1" });
    return out;
  }
  if (s.kind === "triangle") {
    const { t, pts } = corners(state), [A, Bp, C] = pts, deg = [t.a, t.b, t.c];
    out.push({ t: "path", d: `M${A[0]} ${A[1]}L${Bp[0]} ${Bp[1]}L${C[0]} ${C[1]}Z`, role: "shape" });
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 3], r = pts[(i + 2) % 3];
      const u = [q[0] - p[0], q[1] - p[1]], v = [r[0] - p[0], r[1] - p[1]], lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
      const un = [u[0] / lu, u[1] / lu], vn = [v[0] / lv, v[1] / lv], rr = 22, sweep = un[0] * vn[1] - un[1] * vn[0] > 0 ? 1 : 0;
      out.push({ t: "path", d: `M${p[0]} ${p[1]}L${px(p[0] + un[0] * rr)} ${px(p[1] + un[1] * rr)}A${rr} ${rr} 0 0 ${sweep} ${px(p[0] + vn[0] * rr)} ${px(p[1] + vn[1] * rr)}Z`, role: `wedge${i}` });
      const bx = un[0] + vn[0], by = un[1] + vn[1], bl = Math.hypot(bx, by) || 1;
      out.push({ t: "text", x: px(p[0] + (bx / bl) * 40), y: px(p[1] + (by / bl) * 40 + 4), s: `${deg[i]}°`, role: "value" });
    });
    out.push({ t: "circle", cx: C[0], cy: C[1], r: 12, role: "handle" });
    return out;
  }
  const k = scales(s);
  const axis = () => {
    out.push({ t: "line", x1: L - 6, y1: px(k.Y(0)), x2: R + 6, y2: px(k.Y(0)), role: "axis" });
    if (k.x0 <= 0 && k.x1 >= 0) out.push({ t: "line", x1: px(k.X(0)), y1: T - 6, x2: px(k.X(0)), y2: B + 6, role: "axis" });
  };
  if (s.kind === "line") {
    const l = lineOf(s, state);
    axis();
    out.push({ t: "line", x1: px(k.X(k.x0)), y1: px(k.Y(l.m * k.x0 + l.c)), x2: px(k.X(k.x1)), y2: px(k.Y(l.m * k.x1 + l.c)), role: "accent" });
    for (const [x, y] of s.targets) out.push({ t: "circle", cx: px(k.X(x)), cy: px(k.Y(y)), r: 8, role: "target" });
    if (s.through) out.push({ t: "circle", cx: px(k.X(s.through[0])), cy: px(k.Y(s.through[1])), r: 8, role: "pivot" });
    return out;
  }
  const f = curveOf(s);
  const curve = (a: number, b: number) => { let d = ""; for (let i = 0; i <= 80; i++) { const x = a + ((b - a) * i) / 80; d += `${i ? "L" : "M"}${px(k.X(x))} ${px(k.Y(f.value(x)))}`; } return d; };
  const tick = (x: number) => out.push({ t: "text", x: px(k.X(x)), y: Math.min(SCENE_BOX.h - 4, px(k.Y(0)) + 26), s: fmt(x), role: "label" });
  if (s.kind === "strips") {
    const w = (s.to - s.from) / state.n;
    for (let i = 0; i < state.n; i++) {
      const x = s.from + i * w, y = f.value(x);
      out.push({ t: "rect", x: px(k.X(x)), y: px(Math.min(k.Y(y), k.Y(0))), w: px(w * k.sx), h: px(Math.abs(k.Y(y) - k.Y(0))), role: "strip" });
    }
    axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" }); tick(s.from); tick(s.to);
    return out;
  }
  if (s.kind === "accumulate") {
    if (state.x > s.from) out.push({ t: "path", d: `M${px(k.X(s.from))} ${px(k.Y(0))}L${curve(s.from, state.x).slice(1)}L${px(k.X(state.x))} ${px(k.Y(0))}Z`, role: "fill" });
    axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" }); tick(s.from); tick(s.to);
    out.push({ t: "line", x1: px(k.X(s.from)), y1: T, x2: px(k.X(s.from)), y2: B, role: "edge" });
    out.push({ t: "line", x1: px(k.X(state.x)), y1: T, x2: px(k.X(state.x)), y2: B, role: "accent" });
    out.push({ t: "circle", cx: px(k.X(state.x)), cy: px(k.Y(0)), r: 12, role: "handle" });
    return out;
  }
  const y = f.value(state.x), m = f.slope(state.x);
  const dx = k.sx, dy = -k.sy * m, len = Math.hypot(dx, dy), ux = (dx / len) * 52, uy = (dy / len) * 52;
  const role = Math.abs(m) < 1e-9 ? "flat" : m > 0 ? "up" : "down";
  axis(); out.push({ t: "path", d: curve(k.x0, k.x1), role: "curve" });
  out.push({ t: "line", x1: px(k.X(state.x) - ux), y1: px(k.Y(y) - uy), x2: px(k.X(state.x) + ux), y2: px(k.Y(y) + uy), role });
  out.push({ t: "circle", cx: px(k.X(state.x)), cy: px(k.Y(y)), r: 12, role: "handle" });
  return out;
}

/** Whether a scene follows a finger on the picture (the others are set by their sliders only). */
export const draggable = (s: Scene) => s.kind !== "strips" && s.kind !== "line" && !(s.kind === "fraction" && s.shaded !== undefined);

/** Which handle a touch at a point takes hold of: 0 or 1 for a transform's two arrows (−1 when it is far from both),
 *  0 for every other scene. The player keeps this for the length of a drag, so one arrow can be dragged across the other. */
export function grip(s: Scene, state: SceneState, x: number, y: number): number {
  if (s.kind === "order") { const g = cardGrid(s); return orderOf(s, state)[Math.max(0, Math.min(s.values.length - 1, Math.floor((x - g.left) / g.w)))]; }
  if (s.kind === "commas") {
    // the comma nearest the finger
    const d = commaPlaces(s).map((_, i) => Math.abs(commaX(s, state["abc"[i]]) - x));
    return d.indexOf(Math.min(...d));
  }
  if ((s.kind === "tally" && liftLook(s))) { const n = liftNow(s, state); return liftButtonAt(x, y, !n.started || n.finished); }
  if (s.kind === "tally") return tallyTileAt(s.tiles.length, tallyOrder(s, state), x, y);
  if (s.kind === "sort") return sortGrip(s, state, x, y);
  if (s.kind === "boxes") return boxesThingAt(boxesLayout(s.a, s.b), s.a, s.b, boxesNow(s, state).gone, x, y);
  if (s.kind !== "transform") return 0;
  const mx = (x - 170) / TU, my = (110 - y) / TU, d0 = Math.hypot(mx - state.a, my - state.b), d1 = Math.hypot(mx - state.c, my - state.d);
  return Math.min(d0, d1) > 1.6 ? -1 : d0 <= d1 ? 0 : 1;
}

/** A touch or drag at a point of the 340 × 220 box. Draggable scenes follow the finger; others are unchanged.
 *  `hold` is the handle taken at the start of the drag (see `grip`); without it the nearer handle is taken. */
export function pointer(s: Scene, state: SceneState, x: number, y: number, hold?: number): SceneState {
  // sort@1: a finger on a button (or on Start) holds it; it is tapped when the finger lifts on it
  if (s.kind === "sort") { const i = hold ?? grip(s, state, x, y); return i < 0 ? state : { ...state, held: i }; }
  // lift@1: a finger on a button holds it down (it is pressed when the finger lifts)
  if ((s.kind === "tally" && liftLook(s))) { const i = hold ?? grip(s, state, x, y); return i < 0 ? state : { ...state, held: i }; }
  if (s.kind === "tally" || s.kind === "boxes") {
    // the tile in the hand follows the finger; where the finger first went down is kept, to tell a tap from a drag
    const i = hold ?? grip(s, state, x, y);
    if (i < 0) return state;
    const again = state.held === i;
    return { ...state, held: i, hx: x, hy: y, sx: again ? state.sx : x, sy: again ? state.sy : y };
  }
  if (s.kind === "pick") { const part = pickAt(s.figure, x, y); return part ? set(s, state, "part", part) : state; }
  if (s.kind === "tangent") return set(s, state, "turn", tangentAt(s.a, s.b, x, y));
  if (s.kind === "ratios") { const at = ratiosAt(x, y); return set(s, set(s, state, "angle", at.angle), "size", at.size); }
  if (s.kind === "triangle") {
    // the angles the finger makes with the two ends of an unscaled base (60..280 at y = 185), in whole degrees
    const up = Math.max(8, 185 - y);
    const a = Math.round((Math.atan2(up, x - 60) * 180) / Math.PI), b = Math.round((Math.atan2(up, 280 - x) * 180) / Math.PI);
    const next = set(s, set(s, state, "a", a), "b", b);
    return next.a + next.b > 170 ? state : next;
  }
  if (s.kind === "bars") return set(s, state, "y", ((BY0 - y) / BH) * barsTop(s));
  if (s.kind === "order") {
    // the card held is dropped into the slot under the finger; the others close up, and every card gets its own place
    const g = cardGrid(s), card = hold ?? grip(s, state, x, y), slot = Math.max(0, Math.min(s.values.length - 1, Math.floor((x - g.left) / g.w)));
    const row = orderOf(s, state).filter((i) => i !== card);
    row.splice(slot, 0, card);
    return Object.fromEntries(row.map((i, at) => [`p${i}`, at + 1]));
  }
  if (s.kind === "commas") { const g = commaGrid(s); return set(s, state, "abc"[hold ?? grip(s, state, x, y)], (g.right - g.gap / 2 - x) / g.gap + 1); }
  if (s.kind === "fraction") {
    if (s.shaded !== undefined) return state;
    const n = s.pieces ?? state.n;
    if (n === 100) { const gy = s.show ? 58 : 34, row = Math.max(0, Math.min(9, Math.floor((y - gy) / 15))), col = Math.max(0, Math.min(10, Math.round((x - 95) / 15))); return set(s, state, "k", y < gy ? 0 : y > gy + 150 ? 100 : row * 10 + col); }
    return set(s, state, "k", Math.min(n, ((x - 30) / 280) * n));
  }
  if (s.kind === "numberline") return set(s, state, "x", s.from + ((x - NL) / (NR - NL)) * (s.to - s.from));
  if (s.kind === "array") { const next = set(s, state, "c", (x - 37) / 19 + 1); return s.rows === undefined ? set(s, next, "r", (y - 24) / 19 + 1) : next; }
  if (s.kind === "rectangle") return set(s, set(s, state, "w", (x - 60) / 20), "h", (196 - y) / 20);
  if (s.kind === "join") {
    // the same vertical scale as the drawing: the finger's height becomes the piece's (or the point's) height
    const ends = (add: number) => [s.at, s.to].map((v) => evalPoly(s.right, v) + add);
    const all = [0, ...[s.from, s.at].map((v) => evalPoly(s.left, v)), ...(s.mode === "shift" ? [...ends(s.k[0]), ...ends(s.k[1])] : [...ends(0), s.k[0], s.k[1]])];
    const lo = Math.min(...all), hi = Math.max(...all), height = lo + ((B - y) / (B - T)) * (hi - lo || 1);
    return set(s, state, "k", s.mode === "shift" ? height - evalPoly(s.right, s.at + (s.to - s.at) / 2) : height);
  }
  if (s.kind === "transform") {
    // the arrow tip nearer the finger follows it; a touch far from both tips moves nothing
    const mx = (x - 170) / TU, my = (110 - y) / TU, h = hold ?? grip(s, state, x, y);
    return h === 0 ? set(s, set(s, state, "a", mx), "b", my) : h === 1 ? set(s, set(s, state, "c", mx), "d", my) : state;
  }
  if (s.kind !== "slope" && s.kind !== "accumulate") return state;
  const k = scales(s);
  return set(s, state, "x", k.x0 + ((x - L) / (R - L)) * (k.x1 - k.x0));
}

/**
 * What happens when the finger lets go at (x, y). A tally tile let go above the tray, or tapped, goes in the lift: if it
 * is its turn (any turn with `anyOrder`) the next state has it in; otherwise it goes back and `refused` names it. Let go
 * on the tray, it goes back. Every other kind is unchanged by letting go.
 */
export function release(s: Scene, state: SceneState, x: number, y: number): SceneState {
  if (s.kind === "sort") return state.held === undefined ? state : sortGrip(s, state, x, y) === state.held ? sortAct(s, state, state.held) : sortRest(state);
  if (s.kind === "boxes") {
    // boxes@1: while counting, any touch on a thing is a tap; then a thing tapped, or let go on the board, goes on it
    if (state.held === undefined) return state;
    const tap = Math.hypot(x - (state.sx ?? x), y - (state.sy ?? y)) < 10, now = boxesNow(s, state);
    return now.phase === "count" || tap || boxesOnBoard(boxesLayout(s.a, s.b), x, y) ? boxesAct(s as BoxesScene, state, state.held) : boxesRest(state);
  }
  // lift@1: a button is pressed when the finger lifts on it; slid off it (or the touch cancelled), nothing is pressed
  if ((s.kind === "tally" && liftLook(s))) return state.held === undefined ? state : liftButtonAt(x, y, true) === state.held ? liftAct(s, state, state.held) : liftRest(state);
  if (s.kind !== "tally" || state.held === undefined) return state;
  const i = state.held, rest = tallyRest(state), order = tallyOrder(s, state);
  const tap = Math.hypot(x - (state.sx ?? x), y - (state.sy ?? y)) < 10;
  if (!tap && !tallyInDrop(x, y)) return rest;
  if (order.includes(i) || (!s.anyOrder && i !== order.length)) return { ...rest, refused: i + 1 };
  return { ...rest, dropped: order.length + 1, ...(s.anyOrder ? { seq: Number([...order, i].map((k) => k + 1).join("")) } : {}) };
}

/** lift@1: what is said again when nothing has been pressed for a while ("Press down. Four more."), or null. */
export const remind = (s: Scene, state: SceneState): string | null => (s.kind === "tally" && liftLook(s) ? liftRemind(s, state) : s.kind === "sort" ? sortRemind(s, state) : null);

/** play@1: whether a move made while pictures still play waits its turn. A lift button pressed the wrong way meanwhile is
 *  dropped (refused seconds later, it would point at nothing); every other move is queued. */
export const queueable = (s: Scene, from: SceneState, to: SceneState): boolean => !(s.kind === "tally" && liftLook(s) && (to.no ?? 0) > (from.no ?? 0)) && !(s.kind === "sort" && from.sn);
/** sort@1: what a touch at (x, y) takes hold of: Start / Again when it is shown, else a button that can be tapped now
 *  (on the table, or in the first jar when sorting twice), or −1. */
function sortGrip(s: SortKind, state: SceneState, x: number, y: number): number {
  const n = sortNow(s, state), L = sortLay(s, state), B = sortButtons(s.counts);
  if ((!n.started || n.finished) && sortOnGo(L, x, y)) return SORT_GO;
  if (!n.started || n.finished) return -1;
  const xy = B.map((_, i) => sortXY(s, state, i)), can = B.map((_, i) => i).filter((i) => n.loc[i] === n.from);
  return sortButtonAt(xy, B.map((b, i) => (n.loc[i] ? 23 : b.s === "big" ? 32 : 28)), can, x, y);
}

/** boxes@1: thing `i` pressed by keyboard (Enter on it): the same as a tap. Other kinds are unchanged. */
export const press = (s: Scene, state: SceneState, i: number): SceneState => (s.kind === "sort" ? sortAct(s, state, i) : s.kind === "boxes" ? boxesAct(s as BoxesScene, state, i) : (s.kind === "tally" && liftLook(s)) ? liftAct(s, state, i) : state);

/** boxes@1: the short line shown above the picture for a state ("Count this box", "Watch", "Now you"); null for a kind
 *  whose line is its prompt. */
export const cue = (s: Scene, state: SceneState): string | null => (s.kind === "sort" ? sortCue(s as unknown as SortScene, state) : s.kind === "boxes" ? boxesCue(s as BoxesScene, state) : (s.kind === "tally" && liftLook(s)) ? liftCue(s, state) : null);

/** One picture of a move, and how long it stays before the next (`motion`: only movement; left out for reduced motion).
 *  `say`: what is said as it is shown (boxes@1: every number counted, and what to do next). `sound`: a ding as it is
 *  shown (lift@1: 1 a floor reached, 2 the ground floor, higher). `fresh`: whatever is still being said is stopped
 *  first (lift@1 says each line after the one before it, except Start and Again). */
export interface Frame { state: SceneState; ms: number; motion?: boolean; say?: string; sound?: 1 | 2; fresh?: boolean }

/** boxes@1: the pictures of a move. A thing counted or put on the board says its number. The last thing of a box says
 *  how many ("three mangoes.") once its number is on the box. After the second box, the finger carries one thing to the
 *  board (sliding; for reduced motion only its start and end are shown); the last thing on the board says the sum. */
function boxesFrames(s: BoxesKind, prev: SceneState, next: SceneState): Frame[] {
  const sc = s as unknown as BoxesScene, P = boxesNow(sc, prev), N = boxesNow(sc, next), n = s.a + s.b;
  if ((next.no ?? 0) !== (prev.no ?? 0)) return [{ state: next, ms: 0, say: boxesRefusal(next.refused ?? 1) }];
  if (N.counted === P.counted + 1 && N.ka.length === P.ka.length + 1) {
    if (N.ka.length < s.a) return [{ state: next, ms: 0, say: WORDS[N.ka.length] }];
    return [{ state: { ...next, stay: 1, hide: 1 }, ms: 800, say: WORDS[s.a] }, { state: { ...next, stay: 1 }, ms: 1500, say: boxesMany(sc, s.a) }, { state: next, ms: 0, say: "Now count this box." }];
  }
  if (N.counted === P.counted + 1) {
    if (N.kb.length < s.b) return [{ state: next, ms: 0, say: WORDS[N.kb.length] }];
    // the demonstration: the first box's first thing is carried by the finger to the board's first spot
    const before = { ...boxesRest(next), gone: 0 }, L = boxesLayout(s.a, s.b), [x0, y0] = boxesThingXY(L, s.a, s.b, 0), [x1, y1] = L.spots[0];
    const at = (t: number) => { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; return { carry: 1, cx: px(x), cy: px(y), fx: px(x + 16), fy: px(y + 34) }; };
    const slide: Frame[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) => ({ state: { ...before, w: 1, ...at(t) }, ms: 110, motion: true }));
    return [
      { state: { ...before, stay: 1, hide: 2 }, ms: 800, say: WORDS[s.b] },
      { state: { ...before, stay: 1 }, ms: 1500, say: boxesMany(sc, s.b) },
      { state: { ...before, w: 1 }, ms: 1800, say: "Watch. Put them on the board, one by one." },
      { state: { ...before, w: 1, ...at(0) }, ms: 600 },
      ...slide,
      { state: { ...next, w: 1, lit: 1, fx: px(x1 - 12), fy: px(y1 + 40) }, ms: 900, say: "one" },
      { state: next, ms: 0, say: "Now you. Move the rest." },
    ];
  }
  if (N.placed === P.placed + 1 && N.counted === n) {
    if (N.placed < n) return [{ state: next, ms: 0, say: WORDS[N.placed] }];
    return [{ state: { ...next, wait: 1 }, ms: 900, say: WORDS[n] }, { state: next, ms: 0, say: boxesSum(sc) }];
  }
  return [{ state: next, ms: 0 }];
}
/**
 * The pictures from one state to the next, ending with the next state itself. Most moves are one picture. A tally tile put
 * in is every number on the way: the counter clicks through each one and the lift moves one floor per click, with a pause
 * at 0; a tile let go that goes back slides home.
 */
export function frames(s: Scene, prev: SceneState, next: SceneState): Frame[] {
  if (s.kind === "sort") return sortFrames(s, prev, next);
  if (s.kind === "boxes") return boxesFrames(s, prev, next);
  if ((s.kind === "tally" && liftLook(s))) return liftFrames(s, prev, next);
  if (s.kind !== "tally") return [{ state: next, ms: 0 }];
  const a = tallyTotal(s, prev), b = tallyTotal(s, next);
  if (prev.dropped !== next.dropped || (prev.seq ?? 0) !== (next.seq ?? 0)) {
    const end = { ...tallyRest(next), from: a };
    const path = tallyClicks(a, [b - a]), ms = Math.round(Math.max(140, Math.min(340, 3000 / Math.max(1, path.length - 1))));
    // the first picture is the tile gone and the counter not yet moved: then one click per number
    return [...path.slice(0, -1).map((v, k) => ({ state: { ...end, at: v }, ms: k > 0 && v === 0 ? 900 : ms })), { state: end, ms: 0 }];
  }
  if (prev.held !== undefined && next.held === undefined) {
    // the tile slides back to its place in the tray
    const [tx, ty] = tallyTileXY(s.tiles.length, prev.held), home = [tx + 36, ty + 25]; // the tile's middle
    const slide = [0.35, 0.65, 0.88].map((t) => ({ state: { ...next, held: prev.held, hx: prev.hx + (home[0] - prev.hx) * t, hy: prev.hy + (home[1] - prev.hy) * t }, ms: 40, motion: true }));
    return [{ state: { ...next, held: prev.held, hx: prev.hx, hy: prev.hy }, ms: 40, motion: true }, ...slide, { state: next, ms: 0 }];
  }
  return [{ state: next, ms: 0 }];
}

/** The picture in words, for a screen reader. It says what can be moved, never the answer. */
export function describe(s: Scene): string {
  if (s.kind === "sort") {
    const parts = sortParts(s), say = (a: { colour?: string; size?: string }) => (a.colour && a.size ? `${a.colour} and ${a.size}, sorted twice: first every ${a.colour} button into a first jar, then the ${a.size} ones of those into a second jar` : `${a.colour ?? a.size}, into a glass jar`);
    return `Sewing buttons on a wooden table, red and blue, big and small. Under the table, glass jars with a tag showing which buttons go in. Tap Start. Then tap each button that belongs: it goes into the jar and the count is said aloud. A button that does not belong is refused and named. ${parts.length > 1 ? `First the buttons that are ${say(parts[0])}; then those that are ${say(parts[1])}.` : `The buttons that are ${say(parts[0])}.`} ${s.prompt}`;
  }
  if (s.kind === "boxes") return `Two boxes of ${s.names[1]}: ${s.a} in the first box and ${s.b} in the second, and a wooden counting board with ten spots in two rows of five. First count the ${s.names[1]} in each box by tapping each one. Then put them on the board one by one, the first box first, by tapping them or dragging them to the board. Every number is said aloud. ${s.prompt}`;
  if ((s.kind === "tally" && liftLook(s))) {
    const [lo] = liftFloors(s);
    return `A building cut open, with a lift. Chintu the cat is in the lift on floor ${fmt(s.start)}. The floors above the ground have plus numbers; the ground floor 0 is a shop${lo < 0 ? ", and below it is the car park, with minus numbers" : ""}. Beside the building is the lift panel: a display of the floor, an Up button and a Down button. Each press moves the lift one floor and the floor is said. The moves: ${s.tiles.map((t) => `${t > 0 ? "up" : "down"} ${Math.abs(t)}`).join(", then ")}. Press Start to begin. ${s.prompt}`;
  }
  if (s.kind === "tally") {
    const [lo, hi] = s.floors, u = s.unit ? ` (${s.unit})` : "";
    return `A lift beside a big counter${u}. The lift starts on floor ${fmt(s.start)}. Its floors go from ${fmt(lo)} to ${fmt(hi)}; 0 is the ground floor${lo < 0 ? ", and the floors below it are basement floors with minus numbers" : ""}. Tiles to put in the lift${s.anyOrder ? ", in any order" : ", one after another"}: ${s.goTo ? s.tiles.map((_, i) => `one that takes it to ${fmt(tallyAt(s.start, s.tiles, i + 1))}`).join(", ") : s.tiles.map((t) => tileText(t, s.unit)).join(", ")}. A plus tile takes the lift up and a minus tile takes it down, one floor at a time, and the counter says every number on the way. Tap a tile or drag it to the lift, or use the slider. ${s.prompt}`;
  }
  if (s.kind === "pick") return `A picture of ${pickWords(s.figure)}. Its parts can be chosen by tapping them, or with a slider. ${s.prompt}`;
  if (s.kind === "tangent") return `An interactive ellipse, ${s.a} units wide each side of its centre and ${s.b} units high. A point moves round it, by dragging or with a slider, and the tangent line${s.normal ? " and the normal" : ""} at the point is drawn, with its slope. ${s.prompt}`;
  if (s.kind === "ratios") return `An interactive right triangle with the angle θ at the left. Two sliders set the angle and the size, and sin θ, cos θ and tan θ are worked out from its sides. ${s.prompt}`;
  if (s.kind === "strips") return `${named(s, `An interactive graph of y = ${curveText(s)} from x = ${fmt(s.from)} to x = ${fmt(s.to)}.`)} A slider sets how many strips are drawn under the curve. ${s.prompt}`;
  if (s.kind === "slope") return `${named(s, `An interactive graph of y = ${curveText(s)}.`)} A point slides along the curve and the tangent line is drawn at it. ${s.prompt}`;
  if (s.kind === "accumulate") return `${named(s, `An interactive graph of y = ${curveText(s)}. The area is shaded from x = ${fmt(s.from)} to an edge that can be moved as far as x = ${fmt(s.to)}.`)} ${s.prompt}`;
  if (s.kind === "bars") return `An interactive bar chart of ${s.labels.join(", ")}, with a level line that slides up and down its scale by dragging or with a slider. ${s.prompt}`;
  if (s.kind === "order") return `${s.values.length} number cards in a row: ${s.values.map(fmt).join(", ")}. They can be put in order by dragging, or by giving each its place with a slider. ${s.prompt}`;
  if (s.kind === "commas") return `The digits of the number ${s.digits}, with ${commaPlaces(s).length === 1 ? "a comma" : "commas"} that can be moved between them by dragging or with sliders. ${s.prompt}`;
  if (s.kind === "fraction") return `An interactive ${(s.pieces ?? 0) === 100 ? "square of 100 small squares" : "bar cut into equal pieces"}, some of them shaded${s.show ? ", under a second bar to compare with" : ""}. ${s.pieces === undefined ? "A slider sets how many pieces there are. " : ""}${s.shaded === undefined ? "A slider sets how many are shaded. " : ""}${s.prompt}`;
  if (s.kind === "numberline") return `An interactive number line from ${fmt(s.from)} to ${fmt(s.to)} with a point that slides along it${s.jump ? `, starting from ${fmt(s.start)}` : ""}${s.size ? "; a bar from 0 to the point shows its distance from 0" : ""}. ${s.prompt}`;
  if (s.kind === "array") return `An interactive set of counters in equal rows. ${s.rows === undefined ? "Sliders set the number of rows and how many are in each row" : `There are ${s.rows} rows, and a slider sets how many are in each row`}. ${s.prompt}`;
  if (s.kind === "rectangle") return `An interactive rectangle on a grid of unit squares. Its width and height are set by two sliders or by dragging its corner. ${s.prompt}`;
  if (s.kind === "join") return `An interactive graph in two pieces that meet at x = ${fmt(s.at)}. ${s.mode === "shift" ? "The right-hand piece can be slid up and down." : "The single point at the meeting place can be moved up and down."} ${s.prompt}`;
  if (s.kind === "transform") return `An interactive grid with a shape and two arrows. Moving the arrows, or their four sliders, stretches, flips and turns the shape. ${s.prompt}`;
  if (s.kind === "triangle") return `An interactive triangle ABC. Two sliders set the angles at A and B, and the angle at C follows. ${s.prompt}`;
  return `An interactive graph with ${s.targets.length} marked ${s.targets.length === 1 ? "point" : "points"} and a straight line ${s.through ? "that turns about a fixed point, set by a slope slider" : "set by two sliders"}. ${s.prompt}`;
}

/** Every reachable state, in control order (the controls are finite grids). Stops at `cap`. */
export function* states(s: Scene, cap = 20000): Generator<SceneState> {
  const cs = controls(s);
  const counts = cs.map((c) => Math.round((c.max - c.min) / c.step) + 1);
  const total = counts.reduce((a, b) => a * b, 1);
  for (let i = 0; i < Math.min(total, cap); i++) {
    let r = i; const st: SceneState = {};
    cs.forEach((c, j) => { st[c.key] = r6(Math.min(c.max, c.min + (r % counts[j]) * c.step)); r = Math.floor(r / counts[j]); });
    yield st;
  }
}
/** A state that should reach the goal, worked out directly where that is possible (tried before listing every state). */
function likely(s: Scene): SceneState | null {
  let st = initial(s);
  if (s.kind === "triangle") return set(s, set(s, st, "a", s.angles[0]), "b", s.angles[1]);
  if (s.kind === "transform") { if (!s.target) return null; ["a", "b", "c", "d"].forEach((k, i) => { st = set(s, st, k, s.target![i]); }); return st; }
  if (s.kind === "line") {
    const [p, q] = s.through ? [s.through, s.targets[0]] : [s.targets[0], s.targets[1]];
    if (!p || !q || p[0] === q[0]) return null;
    const m = (q[1] - p[1]) / (q[0] - p[0]);
    st = set(s, st, "m", m);
    return s.through ? st : set(s, st, "c", p[1] - m * p[0]);
  }
  if (s.goal.measure === "x" && s.goal.equals !== undefined) return set(s, st, "x", s.goal.equals);
  return null;
}

/**
 * The problems with a scene; an empty list means it may be shown. The player draws nothing for a scene with problems.
 * Checked: the shape of the data, that the goal names a real measure, that the goal is not already reached at the start,
 * and that some reachable state reaches it (so a learner is never asked for something the controls cannot do).
 */
export function check(v: unknown): string[] {
  const s = v as Scene, bad: string[] = [];
  if (!s || typeof s !== "object" || s.type !== "scene") return ["not a scene"];
  if (!Object.prototype.hasOwnProperty.call(MEASURES, s.kind)) return [`unknown kind ${String(s.kind)}`];
  const words = (t: unknown, name: string) => { if (typeof t !== "string" || !t.trim() || t.length > 160) bad.push(`${name} must be 1 to 160 characters`); };
  words(s.prompt, "prompt"); words(s.success, "success");
  if (s.variable !== undefined && !(typeof s.variable === "string" && /^[a-df-z]$/.test(s.variable))) bad.push("variable must be one small letter (not e)");
  const g = s.goal;
  if (!g || typeof g !== "object" || !MEASURES[s.kind].includes(g.measure)) bad.push("goal names no measure of this kind");
  else if ((g.equals === undefined) === (g.below === undefined) || !fin(g.equals ?? g.below) || (g.tol !== undefined && !(fin(g.tol) && g.tol >= 0))) bad.push("goal needs exactly one finite target");
  if (s.kind === "sort") {
    bad.push(...sortProblems(s));
    if (!bad.length && g && g.measure !== "done") bad.push("the goal is the sort done");
  } else if (s.kind === "boxes") {
    bad.push(...boxesProblems(s as unknown as BoxesScene));
    if (!bad.length && g && g.measure === "placed" && g.equals !== s.a + s.b) bad.push("the goal is every thing on the board");
  } else if (s.kind === "tally") {
    if (!Array.isArray(s.tiles) || !Array.isArray(s.floors) || s.floors.length !== 2) bad.push("tiles and floors are needed");
    else { bad.push(...tallyProblems(s as unknown as TallyScene)); if (!bad.length && liftLook(s)) bad.push(...liftProblems(s)); }
    if (s.anyOrder !== undefined && typeof s.anyOrder !== "boolean") bad.push("anyOrder must be true or false");
    if (s.goTo !== undefined && (s.goTo !== true || s.anyOrder)) bad.push("goTo must be true, and not with anyOrder");
    if (s.unit !== undefined && !(typeof s.unit === "string" && s.unit.trim() && s.unit.length <= 12)) bad.push("unit must be 1 to 12 characters");
  } else if (s.kind === "pick") {
    const why = pickCheck(s.figure);
    if (why) bad.push(why);
    else if (!(Array.isArray(s.ask) && s.ask.length >= 1 && s.ask.every((a) => pickParts(s.figure).includes(a)))) bad.push("ask must name parts of the figure");
    if (typeof s.hint !== "string" || !s.hint.trim() || s.hint.length > 200) bad.push("hint must be 1 to 200 characters");
  } else if (s.kind === "tangent") {
    if (!(Number.isInteger(s.a) && Number.isInteger(s.b) && s.a >= 2 && s.a <= 6 && s.b >= 2 && s.b <= 6)) bad.push("an ellipse needs whole half-widths a and b from 2 to 6");
  } else if (s.kind === "ratios") {
    // nothing more to check: the triangle has no parameters
  } else if (s.kind === "bars") {
    const n = Array.isArray(s.values) ? s.values.length : 0, at = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
    if (n < 2 || n > 8 || !s.values.every((v) => fin(v) && v >= 0 && v <= 100000) || !(Array.isArray(s.labels) && s.labels.length === n && s.labels.every((t) => typeof t === "string" && t.trim() && t.length <= 24))) bad.push("a bar chart needs 2 to 8 labelled bars");
    if ((s.scale !== undefined && !(fin(s.scale) && s.scale > 0)) || (s.unit !== undefined && !(fin(s.unit) && s.unit > 0))) bad.push("scale and unit must be positive");
    const a = s.ask as { read?: unknown; more?: unknown };
    if (!a || typeof a !== "object" || !(at(a.read) || (Array.isArray(a.more) && a.more.length === 2 && a.more.every(at) && a.more[0] !== a.more[1]))) bad.push("ask must name one bar to read, or two to compare");
    if (!bad.length && barsTop(s) / (s.unit ?? 1) > 1000) bad.push("the scale has too many places for the line");
  } else   if (s.kind === "order") {
    if (!(Array.isArray(s.values) && s.values.length >= 2 && s.values.length <= 5 && s.values.every((v) => fin(v) && Math.abs(v) < 1e6) && new Set(s.values).size === s.values.length)) bad.push("values must be 2 to 5 different numbers");
    if (s.ask !== undefined && s.ask !== "largest" && s.ask !== "smallest") bad.push("ask must be largest or smallest");
  } else   if (s.kind === "commas") {
    if (!(typeof s.digits === "string" && /^[1-9]\d{3,9}$/.test(s.digits))) bad.push("digits must be a whole number of 4 to 10 digits");
    if (s.style !== "indian" && s.style !== "international") bad.push("style must be indian or international");
    if (!bad.length && commaPlaces(s).length > 3) bad.push("at most three commas");
  } else   if (s.kind === "fraction") {
    const int = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
    if (!(Array.isArray(s.target) && s.target.length === 2 && int(s.target[1], 1, 100) && int(s.target[0], 0, s.target[1]))) bad.push("target must be a fraction of at most one whole, in whole numbers");
    if (s.pieces !== undefined && !(int(s.pieces, 1, 12) || s.pieces === 100)) bad.push("pieces must be 1 to 12, or 100");
    if (s.shaded !== undefined && !int(s.shaded, 0, 12)) bad.push("shaded must be 0 to 12");
    if (s.max !== undefined && !int(s.max, 2, 12)) bad.push("max must be 2 to 12");
    if (s.pieces !== undefined && s.shaded !== undefined) bad.push("pieces and shaded cannot both be fixed");
    if (s.show && Array.isArray(s.target) && s.target[1] > 12) bad.push("a shown fraction needs at most 12 pieces");
  } else if (s.kind === "numberline") {
    if (![s.from, s.to, s.step, s.start].every(fin) || !(s.from < s.to) || !(s.step > 0)) bad.push("from, to, step and start must be finite, in order");
    else {
      const count = (s.to - s.from) / s.step, at = (s.start - s.from) / s.step;
      if (Math.abs(count - Math.round(count)) > 1e-6 || count > 1000) bad.push("the line must be a whole number of steps, at most 1000");
      if (s.start < s.from || s.start > s.to || Math.abs(at - Math.round(at)) > 1e-6) bad.push("start must be a mark on the line");
    }
    if (s.label !== undefined && !(fin(s.label) && s.label > 0)) bad.push("label must be a positive gap");
    if (s.first && !(typeof s.first.ask === "string" && s.first.ask.trim() && Array.isArray(s.first.choices) && s.first.choices.length >= 2 && s.first.choices.length <= 4 && new Set(s.first.choices).size === s.first.choices.length && Number.isInteger(s.first.right) && s.first.right >= 0 && s.first.right < s.first.choices.length && Array.isArray(s.first.why) && s.first.why.length === s.first.choices.length && s.first.why.every((w, i) => i === s.first!.right || (typeof w === "string" && w.trim())))) bad.push("first must be 2 to 4 different choices, one right, with a reply to each wrong one");
    if (s.near !== undefined && !(fin(s.near) && s.near > 0)) bad.push("near must be positive");
    if (s.size !== undefined && typeof s.size !== "boolean") bad.push("size must be true or false");
    if (s.size && !(s.from < 0 && s.to > 0)) bad.push("a size line must have 0 inside it");
  } else if (s.kind === "array") {
    if (!(Number.isInteger(s.total) && s.total >= 2 && s.total <= 150)) bad.push("total must be a whole number from 2 to 150");
    if (s.rows !== undefined && !(Number.isInteger(s.rows) && s.rows >= 1 && s.rows <= 10)) bad.push("rows must be 1 to 10");
    if (s.share && s.rows !== undefined && s.rows > 9) bad.push("a shared-out array needs at most 9 rows");
  } else   if (s.kind === "rectangle") {
    const whole = (v: unknown, hi: number) => v === undefined || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= hi);
    if (!whole(s.perimeter, 36) || !whole(s.area, 81)) bad.push("perimeter and area must be whole numbers a 9 by 9 grid can hold");
    if (s.words !== undefined && !(Array.isArray(s.words) && s.words.length === 2 && s.words.every((t) => typeof t === "string" && t.trim() && t.length <= 14))) bad.push("words must be two short words");
  } else if (s.kind === "join") {
    const poly = (p: unknown) => Array.isArray(p) && p.length >= 1 && p.length <= 4 && p.every(fin);
    if (!poly(s.left) || !poly(s.right)) bad.push("left and right must be 1 to 4 finite coefficients");
    if (s.mode !== "shift" && s.mode !== "point") bad.push("mode must be shift or point");
    if (![s.from, s.at, s.to].every(fin) || !(s.from < s.at && s.at < s.to)) bad.push("from, at and to must be in order");
    if (!(Array.isArray(s.k) && s.k.length === 3 && s.k.every(fin) && s.k[0] < s.k[1] && s.k[2] > 0 && (s.k[1] - s.k[0]) / s.k[2] <= 400)) bad.push("k must be [min, max, step]");
    if (s.start !== undefined && !(fin(s.start) && Array.isArray(s.k) && s.start >= s.k[0] && s.start <= s.k[1])) bad.push("start must be inside k");
  } else if (s.kind === "transform") {
    if (s.target !== undefined && !(Array.isArray(s.target) && s.target.length === 4 && s.target.every((v) => Number.isInteger(v) && Math.abs(v) <= 3))) bad.push("target must be four whole numbers from −3 to 3");
    if (g && g.measure === "miss" && s.target === undefined) bad.push("a goal on miss needs a target");
  } else if (s.kind === "triangle") {
    if (!Array.isArray(s.angles) || s.angles.length !== 2 || !s.angles.every((a) => Number.isInteger(a) && a >= 10 && a <= 150) || s.angles[0] + s.angles[1] > 170) bad.push("angles must be two whole angles of 10° to 150° with a sum of at most 170°");
  } else if (s.kind === "line") {
    const rng = (r: unknown) => Array.isArray(r) && r.length === 3 && r.every(fin) && r[0] < r[1] && r[2] > 0 && (r[1] - r[0]) / r[2] <= 400;
    const pt = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every(fin);
    if (!Array.isArray(s.targets) || s.targets.length < 1 || s.targets.length > 4 || !s.targets.every(pt)) bad.push("targets must be 1 to 4 points");
    if (!Array.isArray(s.window) || s.window.length !== 4 || !s.window.every(fin) || s.window[0] >= s.window[1] || s.window[2] >= s.window[3]) bad.push("window must be [x0, x1, y0, y1]");
    if (s.through !== undefined ? !pt(s.through) || s.c !== undefined : !rng(s.c)) bad.push("a line needs either a point to turn about or a start range, not both");
    if (!rng(s.m)) bad.push("slider ranges must be [min, max, step]");
    if (s.mLabel !== undefined && !(typeof s.mLabel === "string" && s.mLabel.trim() && s.mLabel.length <= 20)) bad.push("mLabel must be 1 to 20 characters");
  } else {
    const okPoly = Array.isArray(s.poly) && s.poly.length >= 1 && s.poly.length <= 8 && s.poly.every(fin);
    const okTerms = Array.isArray(s.terms) && s.terms.length >= 1 && s.terms.length <= 6 && s.terms.every((t) => t && ["pow", "sin", "cos", "exp", "ln"].includes(t.f) && fin(t.a) && (t.b === undefined || (fin(t.b) && (t.f === "pow" ? Number.isInteger(t.b) && t.b >= 0 && t.b <= 8 : t.f === "ln" ? t.b === 1 : t.b !== 0))));
    if ((s.poly !== undefined) === (s.terms !== undefined) || !(s.poly !== undefined ? okPoly : okTerms)) bad.push("a curve is either 1 to 8 finite coefficients or 1 to 6 valid terms");
    if (!fin(s.from) || !fin(s.to) || s.from >= s.to) bad.push("from must be below to");
    else if (!bad.length && positiveOnly(s) && s.from <= 0) bad.push("a logarithm needs from above 0");
    if (s.kind === "strips" ? s.max !== undefined && !(Number.isInteger(s.max) && s.max >= 2 && s.max <= 200) : s.step !== undefined && !(fin(s.step) && s.step > 0 && (s.to - s.from) / s.step <= 2000)) bad.push("control range is out of bounds");
  }
  if (bad.length) return bad;
  if (s.kind === "strips" || s.kind === "slope" || s.kind === "accumulate") { const f = curveOf(s); for (let i = 0; i <= 40; i++) if (!fin(f.value(s.from + ((s.to - s.from) * i) / 40))) return ["the curve is not finite on its range"]; }
  if (met(s, initial(s))) bad.push("the goal is already reached at the start");
  const guess = likely(s);
  let reachable = !!guess && met(s, guess);
  if (!reachable) for (const st of states(s)) if (met(s, st)) { reachable = true; break; }
  if (!reachable) bad.push("no reachable state reaches the goal");
  return bad;
}
