/**
 * picture-tasks@1: questions asked ON a picture, for the start-here ideas that have one (foundations@1). The child taps
 * the part of the drawing the question names (the side opposite θ, the point (−2, 3), the entry in row 2, column 3) or
 * shades parts of a bar. The tasks are made by rule from a seed, so every visit gets new ones: a different triangle
 * turned a different way, other numbers, another part. Each wrong tap is named back to the child ("that is the
 * adjacent side: it touches θ"). Nothing here is graded or recorded as evidence.
 */
import type { Picture } from "./foundations";

export type Scene =
  | { kind: "right-triangle"; thetaAt: "left" | "top" }
  | { kind: "circle-parts" | "angle" | "venn" | "unit-circle" | "tangent-slope" | "area-under-curve" | "number-line" | "coordinate-plane" | "vector-arrow" }
  | { kind: "matrix-grid"; values: number[][] }
  | { kind: "fraction-bar"; parts: number };
export interface PictureTask { scene: Scene; prompt: string; /** the parts that are right (tap tasks) */ answer: string[]; /** fraction-bar: how many parts to shade */ count?: number; hint: string }

const rng = (seed: number) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const neg = (n: number) => (n < 0 ? `−${-n}` : `${n}`);

/** Every part of a scene that can be tapped. */
export function partsOf(s: Scene): string[] {
  switch (s.kind) {
    case "right-triangle": return ["bottom", "right", "slant"];
    case "circle-parts": return ["centre", "radius", "diameter", "chord", "arc"];
    case "angle": return ["vertex", "arm1", "arm2"];
    case "venn": return ["A", "B", "AB", "out"];
    case "unit-circle": return ["p:0", "p:90", "p:180", "p:270"];
    case "tangent-slope": return ["up", "top", "down"];
    case "area-under-curve": return ["under", "left", "above", "a", "b"];
    case "number-line": return Array.from({ length: 11 }, (_, i) => `n:${i - 5}`);
    case "coordinate-plane": case "vector-arrow": return Array.from({ length: 81 }, (_, i) => `p:${(i % 9) - 4},${Math.floor(i / 9) - 4}`);
    case "matrix-grid": return s.values.flatMap((r, i) => r.map((_, j) => `e:${i + 1},${j + 1}`));
    case "fraction-bar": return Array.from({ length: s.parts }, (_, i) => `f:${i}`);
  }
}

const TRI = { left: { opposite: "right", adjacent: "bottom", hypotenuse: "slant" }, top: { opposite: "bottom", adjacent: "right", hypotenuse: "slant" } } as const;
/** What a tapped part is, said to the child. */
export function describe(s: Scene, part: string): string {
  switch (s.kind) {
    case "right-triangle": {
      const name = (Object.entries(TRI[s.thetaAt]).find(([, p]) => p === part) ?? ["side"])[0];
      return name === "hypotenuse" ? "the hypotenuse: the longest side, facing the right angle" : name === "opposite" ? "the opposite side: it is across from θ and does not touch it" : "the adjacent side: it touches θ and is not the hypotenuse";
    }
    case "circle-parts": return ({ centre: "the centre: the middle point", radius: "a radius: from the centre to the edge", diameter: "a diameter: edge to edge through the centre", chord: "a chord: edge to edge, not through the centre", arc: "an arc: a piece of the round edge" } as Record<string, string>)[part];
    case "angle": return part === "vertex" ? "the vertex: the corner point where the arms meet" : "an arm: one of the two lines that make the angle";
    case "venn": return ({ A: "the part in A only", B: "the part in B only", AB: "the part in both A and B", out: "the part outside both circles: in neither" } as Record<string, string>)[part];
    case "unit-circle": return `the point reached after turning ${part.slice(2)}°`;
    case "tangent-slope": return ({ up: "a point where the curve is going up", top: "the top, where the tangent is flat", down: "a point where the curve is going down" } as Record<string, string>)[part];
    case "area-under-curve": return ({ under: "the area under the curve between a and b", left: "the area under the curve before a", above: "the space above the curve", a: "the point a, where the area starts", b: "the point b, where the area ends" } as Record<string, string>)[part];
    case "number-line": return `the number ${neg(Number(part.slice(2)))}`;
    case "coordinate-plane": case "vector-arrow": { const [x, y] = part.slice(2).split(",").map(Number); return `the point (${neg(x)}, ${neg(y)})`; }
    case "matrix-grid": { const [r, c] = part.slice(2).split(","); return `the entry in row ${r}, column ${c}`; }
    case "fraction-bar": return "one part of the bar";
  }
}

/** The tasks for one visit: by rule from the seed (same seed, same tasks). */
export function pictureTasks(kind: Picture, seed: number, n = 3): PictureTask[] {
  const r = rng(seed), int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const shuffle = <T,>(xs: T[]): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const out: PictureTask[] = [];
  switch (kind) {
    case "right-triangle": {
      const names = shuffle(["opposite", "adjacent", "hypotenuse"] as const), at = shuffle(["left", "top", r() < 0.5 ? "left" : "top"] as const);
      names.forEach((name, i) => out.push({ scene: { kind, thetaAt: at[i] }, prompt: name === "hypotenuse" ? "Tap the hypotenuse." : `Tap the side ${name === "opposite" ? "opposite" : "adjacent to"} the angle θ.`, answer: [TRI[at[i]][name]], hint: "Find θ first. The hypotenuse faces the right angle. The opposite side is across from θ. The adjacent side touches θ." }));
      break;
    }
    case "circle-parts": { const W: Record<string, string> = { centre: "the centre", radius: "a radius", diameter: "a diameter", chord: "the chord that is not a diameter", arc: "the coloured arc" }; for (const p of shuffle(Object.keys(W))) out.push({ scene: { kind }, prompt: `Tap ${W[p]}.`, answer: [p], hint: "A radius goes from the centre to the edge. A diameter goes right across through the centre. A chord joins two points of the edge." }); break; }
    case "angle": out.push(...shuffle<PictureTask>([{ scene: { kind }, prompt: "Tap the vertex of the angle.", answer: ["vertex"], hint: "The vertex is the corner point where the two arms meet." }, { scene: { kind }, prompt: "Tap one arm of the angle.", answer: ["arm1", "arm2"], hint: "The arms are the two straight lines that make the angle." }])); break;
    case "venn": { const W: Record<string, string> = { A: "in A but not in B", B: "in B but not in A", AB: "in both A and B", out: "in neither A nor B" }; for (const p of shuffle(Object.keys(W))) out.push({ scene: { kind }, prompt: `Tap the part for things that are ${W[p]}.`, answer: [p], hint: "Inside a circle means in that set. Where the circles overlap, a thing is in both." }); break; }
    case "unit-circle": for (const d of shuffle([0, 90, 180, 270])) out.push({ scene: { kind }, prompt: d === 0 ? "Tap the starting point, where the angle is 0°." : `Start at (1, 0) and turn ${d}° anticlockwise. Tap where you are.`, answer: [`p:${d}`], hint: "Start on the right, at (1, 0). Anticlockwise means up first. A quarter turn is 90°." }); break;
    case "tangent-slope": { const W: Record<string, string> = { up: "the curve is going up", top: "the tangent is flat (slope 0)", down: "the curve is going down" }; for (const p of shuffle(Object.keys(W))) out.push({ scene: { kind }, prompt: `Tap a point where ${W[p]}.`, answer: [p], hint: "Read the curve from left to right. At the very top it is neither going up nor down, so the tangent is flat." }); break; }
    case "area-under-curve": out.push(...shuffle<PictureTask>([{ scene: { kind }, prompt: "Tap the area that the integral from a to b measures.", answer: ["under"], hint: "It is the area under the curve, above the x-axis, from a to b only." }, { scene: { kind }, prompt: "Tap the place on the x-axis where the area starts.", answer: ["a"], hint: "The integral from a to b starts at a, the lower limit." }, { scene: { kind }, prompt: "Tap the place on the x-axis where the area ends.", answer: ["b"], hint: "The integral from a to b ends at b, the upper limit." }])); break;
    case "number-line": {
      const v = -int(1, 5); out.push({ scene: { kind }, prompt: `Tap ${neg(v)} on the number line.`, answer: [`n:${v}`], hint: "Negative numbers are to the left of 0. Count that many steps left." });
      const a = int(-1, 2), k = int(2, 4); out.push({ scene: { kind }, prompt: `Start at ${neg(a)} and go ${k} steps to the left. Tap where you land.`, answer: [`n:${a - k}`], hint: "Each step to the left makes the number 1 smaller, even past 0." });
      const x = -int(2, 5), y = int(1, 4); out.push({ scene: { kind }, prompt: `Tap the smaller number: ${neg(x)} or ${y}.`, answer: [`n:${x}`], hint: "On the number line the number further to the left is the smaller one." });
      return shuffle(out).slice(0, n);
    }
    case "coordinate-plane": {
      const seen = new Set<string>();
      while (out.length < 3) { const x = int(-4, 4), y = int(-4, 4); if (x === y || x === 0 || y === 0 || seen.has(`${x},${y}`) || (out.length === 0 && x > 0 && y > 0)) continue; seen.add(`${x},${y}`); out.push({ scene: { kind }, prompt: `Tap the point (${neg(x)}, ${neg(y)}).`, answer: [`p:${x},${y}`], hint: "The first number says how far across (left if it is negative). The second says how far up (down if it is negative)." }); }
      break;
    }
    case "vector-arrow": {
      const seen = new Set<string>();
      while (out.length < 3) { const x = out.length === 2 ? -int(1, 4) : int(1, 4), y = int(1, 4); if (Math.abs(x) === y || seen.has(`${x},${y}`)) continue; seen.add(`${x},${y}`); out.push({ scene: { kind }, prompt: `A vector starts at O. It goes ${Math.abs(x)} ${x < 0 ? "to the left" : "to the right"} and ${y} up. Tap where its tip is.`, answer: [`p:${x},${y}`], hint: "Start at O. Do the across part first, then the up part. The tip is where you stop." }); }
      break;
    }
    case "matrix-grid": {
      for (let t = 0; t < 3; t++) { const rows = t === 1 ? 3 : 2, cols = 3, vals = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), values = Array.from({ length: rows }, (_, i) => vals.slice(i * cols, i * cols + cols)); let i = int(1, rows), j = int(1, cols); if (i === j) j = (j % cols) + 1; out.push({ scene: { kind, values }, prompt: `Tap the entry in row ${i}, column ${j}.`, answer: [`e:${i},${j}`], hint: "Rows go across and are counted from the top. Columns go down and are counted from the left. Row first, then column." }); }
      break;
    }
    case "fraction-bar": {
      const seen = new Set<number>();
      while (out.length < 3) { const b = int(3, 8); if (seen.has(b)) continue; seen.add(b); const a = int(1, b - 1); out.push({ scene: { kind, parts: b }, prompt: `Shade ${a}/${b} of the bar: tap parts to shade them, then tap Check.`, answer: [], count: a, hint: `The bottom number says the bar has ${b} equal parts. The top number says how many of them to shade.` }); }
      break;
    }
  }
  return out.slice(0, n);
}
/** Is this tap (or, for a bar, this shading) right? */
export const rightTap = (t: PictureTask, part: string, shaded = 0) => (t.count !== undefined ? shaded === t.count : t.answer.includes(part));
