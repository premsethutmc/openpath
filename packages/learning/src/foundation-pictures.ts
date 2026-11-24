/**
 * picture-tasks@2: the pictures of the start-here ideas (foundations@1), as SCENES of the scene engine (scene.ts).
 *
 * Nothing is drawn here. A picture is a scene description; the engine draws it, takes the touches and says whether the
 * goal is reached, and the one scene player shows it. For each kind of picture this file gives (1) the labelled picture a
 * lesson card shows, (2) the tasks for one visit: tap the side opposite θ, slide the point to −4, shade 3/5 of the bar,
 * slide to where the tangent is flat, collect an area of 4. Tasks are made by rule from a seed, so every visit has new
 * ones. A scene is a teaching picture: nothing here is graded or recorded as evidence.
 *
 * picture-tasks@1 drew these with its own twelve drawings beside the engine; that copy is gone.
 */
import type { Picture } from "./foundations";
import type { Scene, SceneState } from "./scene";
import { pickName, triangleSide } from "./scene-figures";

const rng = (seed: number) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const neg = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
type Fig = Extract<Scene, { kind: "pick" }>["figure"];
const pick = (figure: Fig, prompt: string, ask: string[], hint: string, labels = false): Scene => ({ type: "scene", kind: "pick", figure, prompt, ask, hint, success: `Yes. ${cap(pickName(figure, ask[0]))}.`, goal: { measure: "wrong", equals: 0 }, ...(labels ? { labels } : {}) });

/** The labelled picture of an idea, for a lesson card: a scene and the state to draw it in. */
export function pictureScene(kind: Picture): { scene: Scene; state?: SceneState } {
  const show = (figure: Fig, ask: string) => ({ scene: pick(figure, "Read the picture.", [ask], "Read the labels.", true) });
  switch (kind) {
    case "right-triangle": return show({ of: "right-triangle", thetaAt: "left" }, "slant");
    case "unit-circle": return show({ of: "unit-circle" }, "p:0");
    case "angle": return show({ of: "angle" }, "vertex");
    case "circle-parts": return show({ of: "circle" }, "centre");
    case "venn": return show({ of: "venn" }, "AB");
    case "coordinate-plane": return show({ of: "plane" }, "p:3,2");
    case "vector-arrow": return show({ of: "plane", arrow: [3, 2] }, "p:3,2");
    case "matrix-grid": return show({ of: "matrix", values: [[2, 5, 1], [0, 3, 4]] }, "e:1,1");
    case "number-line": return { scene: { type: "scene", kind: "numberline", from: -5, to: 5, step: 1, start: 0, prompt: "A number line: smaller to the left, bigger to the right.", success: "This is −3.", goal: { measure: "x", equals: -3 } }, state: { x: -3 } };
    case "fraction-bar": return { scene: { type: "scene", kind: "fraction", target: [3, 4], pieces: 4, prompt: "A bar cut into 4 equal pieces.", success: "3 of the 4 equal pieces are shaded: 3/4.", goal: { measure: "exact", equals: 0 } }, state: { k: 3 } };
    case "tangent-slope": return { scene: { type: "scene", kind: "slope", poly: [0, 4, -1], from: 0, to: 4, prompt: "The tangent touches the curve at one point.", success: "The tangent shows how steep the curve is there.", goal: { measure: "slope", equals: 0 } }, state: { x: 1 } };
    case "area-under-curve": return { scene: { type: "scene", kind: "accumulate", poly: [1, 1.5, -0.375], from: 0, to: 4, prompt: "The shaded part is the area under the curve.", success: "That is the area under the curve.", goal: { measure: "x", equals: 4 } }, state: { x: 3 } };
  }
}

/** The tasks for one visit, each a scene of the engine: by rule from the seed (same seed, same tasks). */
export function pictureTasks(kind: Picture, seed: number, n = 3): Scene[] {
  const r = rng(seed), int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const shuffle = <T,>(xs: T[]): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const out: Scene[] = [];
  switch (kind) {
    case "right-triangle": {
      const names = shuffle(["opposite", "adjacent", "hypotenuse"] as const), at = shuffle(["left", "top", r() < 0.5 ? "left" : "top"] as const);
      names.forEach((name, i) => out.push(pick({ of: "right-triangle", thetaAt: at[i] }, name === "hypotenuse" ? "Tap the hypotenuse." : `Tap the side ${name === "opposite" ? "opposite" : "adjacent to"} the angle θ.`, [triangleSide(at[i], name)], "Find θ first. The hypotenuse faces the right angle; the opposite side is across from θ; the adjacent side touches θ.")));
      break;
    }
    case "circle-parts": { const W: Record<string, string> = { centre: "the centre", radius: "a radius", diameter: "a diameter", chord: "the chord that is not a diameter", arc: "the coloured arc" }; for (const p of shuffle(Object.keys(W))) out.push(pick({ of: "circle" }, `Tap ${W[p]}.`, [p], "A radius goes from the centre to the edge. A diameter goes right across through the centre. A chord joins two points of the edge.")); break; }
    case "angle": out.push(...shuffle([pick({ of: "angle" }, "Tap the vertex of the angle.", ["vertex"], "The vertex is the corner point where the two arms meet."), pick({ of: "angle" }, "Tap one arm of the angle.", ["arm1", "arm2"], "The arms are the two straight lines that make the angle.")])); break;
    case "venn": { const W: Record<string, string> = { A: "in A but not in B", B: "in B but not in A", AB: "in both A and B", out: "in neither A nor B" }; for (const p of shuffle(Object.keys(W))) out.push(pick({ of: "venn" }, `Tap the part for things that are ${W[p]}.`, [p], "Inside a circle means in that set. Where the circles overlap, a thing is in both.")); break; }
    case "unit-circle": for (const d of shuffle([90, 180, 270, 0])) out.push(pick({ of: "unit-circle" }, d === 0 ? "Tap the starting point, where the angle is 0°." : `Start at (1, 0) and turn ${d}° anticlockwise. Tap where you are.`, [`p:${d}`], "Start on the right, at (1, 0). Anticlockwise means up first. A quarter turn is 90°.")); break;
    case "coordinate-plane": {
      const seen = new Set<string>();
      while (out.length < 3) { const x = int(-4, 4), y = int(-4, 4); if (x === y || x === 0 || y === 0 || seen.has(`${x},${y}`) || (out.length === 0 && x > 0 && y > 0)) continue; seen.add(`${x},${y}`); out.push(pick({ of: "plane" }, `Tap the point (${neg(x)}, ${neg(y)}).`, [`p:${x},${y}`], "The first number says how far across (left if it is negative). The second says how far up (down if it is negative).")); }
      break;
    }
    case "vector-arrow": {
      const seen = new Set<string>();
      while (out.length < 3) { const x = out.length === 2 ? -int(1, 4) : int(1, 4), y = int(1, 4); if (Math.abs(x) === y || seen.has(`${x},${y}`)) continue; seen.add(`${x},${y}`); out.push(pick({ of: "plane" }, `A vector starts at O. It goes ${Math.abs(x)} ${x < 0 ? "to the left" : "to the right"} and ${y} up. Tap where its tip is.`, [`p:${x},${y}`], "Start at O. Do the across part first, then the up part. The tip is where you stop.")); }
      break;
    }
    case "matrix-grid": {
      for (let t = 0; t < 3; t++) { const rows = t === 1 ? 3 : 2, cols = 3, vals = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), values = Array.from({ length: rows }, (_, i) => vals.slice(i * cols, i * cols + cols)); let i = int(1, rows), j = int(1, cols); if (i === j) j = (j % cols) + 1; out.push(pick({ of: "matrix", values }, `Tap the entry in row ${i}, column ${j}.`, [`e:${i},${j}`], "Rows go across and are counted from the top. Columns go down and are counted from the left. Row first, then column.")); }
      break;
    }
    case "number-line": {
      const line = (prompt: string, to: number, start = 0, jump = false): Scene => ({ type: "scene", kind: "numberline", from: -5, to: 5, step: 1, start, ...(jump ? { jump } : {}), prompt, success: `Yes. The point is at ${neg(to)}.`, goal: { measure: "x", equals: to } });
      const v = -int(1, 5), a = int(-1, 2), k = int(2, 4), x = -int(2, 5), y = int(1, 4);
      return shuffle([line(`Slide the point to ${neg(v)}.`, v), line(`The point starts at ${neg(a)}. Move it ${k} steps to the left.`, a - k, a, true), line(`Slide the point to the smaller number: ${neg(x)} or ${y}.`, x)]).slice(0, n);
    }
    case "fraction-bar": {
      const seen = new Set<number>();
      while (out.length < 3) { const b = int(3, 8); if (seen.has(b)) continue; seen.add(b); const a = int(1, b - 1); out.push({ type: "scene", kind: "fraction", target: [a, b], pieces: b, prompt: `Shade ${a}/${b} of the bar.`, success: `Yes. ${a} of the ${b} equal pieces are shaded.`, goal: { measure: "exact", equals: 0 } }); }
      break;
    }
    case "tangent-slope": {
      // curves whose slope is a whole number at whole numbers, so the point can land exactly
      const curve = shuffle<{ poly: number[]; from: number; to: number; up: [number, number]; down: [number, number] }>([{ poly: [0, 4, -1], from: 0, to: 4, up: [2, 1], down: [-2, 3] }, { poly: [1, 2, -0.5], from: 0, to: 4, up: [1, 1], down: [-1, 3] }, { poly: [4, 0, -1], from: -2, to: 2, up: [2, -1], down: [-2, 1] }])[0];
      const ask = (prompt: string, slope: number): Scene => ({ type: "scene", kind: "slope", poly: curve.poly, from: curve.from, to: curve.to, step: 0.1, prompt, success: slope === 0 ? "Yes. At the top the tangent is flat: slope 0." : `Yes. There the slope is ${neg(slope)}: the curve is going ${slope > 0 ? "up" : "down"}.`, goal: { measure: "slope", equals: slope, tol: 0.001 } });
      return shuffle([ask("Slide the point to where the tangent is flat (slope 0).", 0), ask(`Slide the point to where the slope is ${neg(curve.up[0])}.`, curve.up[0]), ask(`Slide the point to where the slope is ${neg(curve.down[0])}.`, curve.down[0])]).slice(0, n);
    }
    case "area-under-curve": {
      // areas that land on a whole number at a whole-number edge
      const c = shuffle<{ poly: number[]; to: number; at: [number, number][]; name: string }>([{ poly: [2], to: 4, at: [[1, 2], [2, 4], [3, 6]], name: "y = 2" }, { poly: [3], to: 4, at: [[1, 3], [2, 6], [3, 9]], name: "y = 3" }, { poly: [0, 2], to: 4, at: [[1, 1], [2, 4], [3, 9]], name: "y = 2x" }])[0];
      for (const [x, area] of shuffle(c.at)) out.push({ type: "scene", kind: "accumulate", poly: c.poly, from: 0, to: c.to, step: 0.1, prompt: `Under ${c.name}: drag the edge until the area collected from 0 is ${area}.`, success: `Yes. From 0 to ${x} the area under ${c.name} is ${area}.`, goal: { measure: "total", equals: area, tol: 0.001 } });
      break;
    }
  }
  return out.slice(0, n);
}

/** Something to move before the tasks, where the idea has one: a right triangle whose angle and size are set. */
export function exploreScene(kind: Picture, seed: number): Scene | null {
  if (kind !== "right-triangle") return null;
  const angle = [30, 45, 60][Math.floor(rng(seed + 17)() * 3)];
  return { type: "scene", kind: "ratios", prompt: `Drag the top corner. Make θ = ${angle}°, then change only the size and watch sin θ.`, success: `At ${angle}° the three ratios stay the same for every size: they follow the angle only.`, goal: { measure: "angle", equals: angle } };
}
