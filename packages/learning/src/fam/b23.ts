/**
 * Batch b23 (families@2, gap@1): automatically marked questions for the centres of a triangle (Tamil Nadu Grade 8:
 * medians, altitudes, perpendicular bisectors and angle bisectors, and the centroid, orthocentre, circumcentre and
 * incentre where they meet). Drawing and constructing them stays an educator-marked task. Written by OpenPath; CC0.
 *
 * Every `validate` checks the answer on an actual triangle in coordinates (a different method from `solve`, which
 * uses the named property): the centres are found by intersecting lines or by their defining distances, the centroid
 * as the balance point of the area, and angles and lengths are measured.
 */
import type { Bug, Def, Step, Value } from "../family-kit";
import { near } from "../family-kit";

const CONC = "MATH.geometry.triangle-concurrency";
const CONS = "MATH.geometry.basic-constructions";
const TRI = "MATH.geometry.triangle-properties";

// ---------------------------------------------------------------- helpers

const none = () => null;
const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Karthik", "Priya", "Selvi"];
const nameOf = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const hsh = (p: number[], salt = 0) => {
  let h = (2166136261 ^ salt) >>> 0;
  for (const v of p) h = Math.imul(h ^ (v + 1000), 16777619) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: Value): Step => ({ id, op, competency, inputs, value });
const inBox = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const gate = (d: [number, number][], keep: (p: number[]) => boolean, why: string) => (p: number[]) => (inBox(p, d) && keep(p) ? null : why);
const Bg = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Bug["predict"], probe?: string): Bug => ({ id, kind, competency, says, predict, ...(probe ? { probe } : {}) });
/** A fixed order of n options that differs from problem to problem: perm[i] is the base option shown at letter i. */
const perm = (p: number[], n: number, salt: number) => [...Array(n).keys()].sort((a, b) => hsh([...p, a], salt) - hsh([...p, b], salt) || a - b);
/** Keep predictions that are real angles or lengths (positive) and drop empty ones. */
const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : null);
const keepBugs = (bs: Bug[]) => bs.filter((b) => b.predict !== null);

// ---------------------------------------------------------------- plane geometry for the checks

type V = [number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
const cross = (a: V, b: V) => a[0] * b[1] - a[1] * b[0];
const len = (a: V) => Math.hypot(a[0], a[1]);
const unit = (a: V): V => [a[0] / len(a), a[1] / len(a)];
const mid = (a: V, b: V): V => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const perpOf = (a: V): V => [-a[1], a[0]];
const dist = (a: V, b: V) => len(sub(a, b));
/** The point where the lines p + t·d and q + u·e cross. */
const meet = (p: V, d: V, q: V, e: V): V => {
  const t = cross(sub(q, p), e) / cross(d, e);
  return [p[0] + t * d[0], p[1] + t * d[1]];
};
/** Distance from point x to the line through p with direction d. */
const offLine = (x: V, p: V, d: V) => Math.abs(cross(sub(x, p), d)) / len(d);
const EPS = 1e-6;
/** A scalene, acute triangle X (top), Y, Z, and a right triangle with the right angle at Y. */
const SCALENE: V[] = [[0.7, 3.1], [0, 0], [4, 0]];
const RIGHT: V[] = [[0, 3], [0, 0], [4, 0]];
type Line = [V, V];
/** The three lines of a kind (0 medians, 1 altitudes, 2 perpendicular bisectors, 3 angle bisectors), one per corner. */
const linesOf = (kind: number, T: V[]): Line[] =>
  [0, 1, 2].map((i) => {
    const P = T[i];
    const [Q, R] = [T[(i + 1) % 3], T[(i + 2) % 3]];
    if (kind === 0) return [P, sub(mid(Q, R), P)];
    if (kind === 1) return [P, perpOf(sub(R, Q))];
    if (kind === 2) return [mid(Q, R), perpOf(sub(R, Q))];
    return [P, add(unit(sub(Q, P)), unit(sub(R, P)))];
  });
/** A centre found by crossing two of its lines (0 centroid, 1 orthocentre, 2 circumcentre, 3 incentre). */
const crossing = (kind: number, T: V[]): V => {
  const [a, b] = linesOf(kind, T);
  return meet(a[0], a[1], b[0], b[1]);
};
const allThrough = (kind: number, T: V[], P: V) => linesOf(kind, T).every(([q, d]) => offLine(P, q, d) < EPS);
/** The balance point of the triangle's area: the average of a fine grid of points inside it (worked out once). */
const BAL = new Map<string, V>();
const balance = (T: V[]): V => {
  const key = JSON.stringify(T);
  if (!BAL.has(key)) BAL.set(key, gridAverage(T));
  return BAL.get(key)!;
};
const gridAverage = (T: V[]): V => {
  const inside = (x: V) => {
    const s = [0, 1, 2].map((i) => cross(sub(T[(i + 1) % 3], T[i]), sub(x, T[i])));
    return s.every((v) => v >= 0) || s.every((v) => v <= 0);
  };
  const xs = T.map((t) => t[0]);
  const ys = T.map((t) => t[1]);
  const h = 0.01;
  let [sx, sy, n] = [0, 0, 0];
  for (let x = Math.min(...xs) + h / 2; x < Math.max(...xs); x += h)
    for (let y = Math.min(...ys) + h / 2; y < Math.max(...ys); y += h)
      if (inside([x, y])) {
        sx += x;
        sy += y;
        n++;
      }
  return [sx / n, sy / n];
};
/** The point equally far from the three corners, from |PX|² = |PY|² = |PZ|² (two straight-line equations). */
const equalFromCorners = ([X, Y, Z]: V[]): V => {
  const [a1, b1, c1] = [2 * (Y[0] - X[0]), 2 * (Y[1] - X[1]), dot(Y, Y) - dot(X, X)];
  const [a2, b2, c2] = [2 * (Z[0] - X[0]), 2 * (Z[1] - X[1]), dot(Z, Z) - dot(X, X)];
  const D = a1 * b2 - a2 * b1;
  return [(c1 * b2 - c2 * b1) / D, (a1 * c2 - a2 * c1) / D];
};
/** The point inside equally far from the three sides: walk inwards from each side by the same distance r. */
const equalFromSides = (T: V[]): V => {
  // inward unit normals n_i of each side, and P·n_i − (side point)·n_i = r for all three sides
  const rows = [0, 1, 2].map((i) => {
    const [A, B, C] = [T[i], T[(i + 1) % 3], T[(i + 2) % 3]];
    let n = unit(perpOf(sub(B, A)));
    if (dot(sub(C, A), n) < 0) n = [-n[0], -n[1]];
    return [n[0], n[1], -1, dot(A, n)];
  });
  // solve [nx ny −1] [x y r]ᵀ = c by Cramer's rule
  const det3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const M = rows.map((r) => r.slice(0, 3));
  const D = det3(M);
  const col = (j: number) => det3(M.map((r, i) => r.map((v, k) => (k === j ? rows[i][3] : v))));
  return [col(0) / D, col(1) / D];
};
const sideDistances = (T: V[], P: V) => [0, 1, 2].map((i) => offLine(P, T[i], sub(T[(i + 1) % 3], T[i])));
const insideOf = (T: V[], P: V) => {
  const s = [0, 1, 2].map((i) => cross(sub(T[(i + 1) % 3], T[i]), sub(P, T[i])));
  return s.every((v) => v > 0) || s.every((v) => v < 0);
};
/** The angle at Q between QA and QB, in degrees. */
const angleAt = (Q: V, A: V, B: V) => (Math.acos(Math.max(-1, Math.min(1, dot(sub(A, Q), sub(B, Q)) / (dist(A, Q) * dist(B, Q))))) * 180) / Math.PI;

// ================================================================ which centre, which lines (awctr)

const CENTRES = ["the centroid", "the orthocentre", "the circumcentre", "the incentre"];
const LINES = ["the three medians", "the three altitudes", "the perpendicular bisectors of the three sides", "the bisectors of the three angles"];
const TRIS = ["ABC", "KLN", "XYZ", "RST", "UVW", "JKL", "QRS", "LMN"];
/** A statement: what it asks for (c a centre, l the lines through a centre, s what one segment is), its right base
 * option, the question and its everyday form, the confusions it invites, and a test of an option on a triangle. */
type Stmt = {
  kind: "c" | "l" | "s";
  ans: number;
  text: (L: string[], n: number) => string;
  word: (L: string[], n: number, who: string) => string;
  slips: { to: number; id: string; kind: Bug["kind"]; comp: string; says: (L: string[]) => string }[];
  /** Does base option `o` fit the statement, checked on a triangle in coordinates? */
  test: (o: number) => boolean;
  level: 1 | 2 | 3;
};
const tri = (L: string[]) => `△${L.join("")}`;
/** The point of the scalene triangle a centre option stands for, found by crossing two of its lines. */
const at = (o: number, T: V[] = SCALENE) => crossing(o, T);
const STMTS: Stmt[] = [
  {
    kind: "c", ans: 0, level: 1,
    text: ([X, Y, Z]) => `In ${tri([X, Y, Z])}, D, E and F are the midpoints of ${Y}${Z}, ${Z}${X} and ${X}${Y}. The segments ${X}D, ${Y}E and ${Z}F are drawn, and they meet at one point P. What is P called?`,
    word: ([X, Y, Z], _n, who) => `${who} marks the middle of each edge of a triangular wooden plank ${X}${Y}${Z}, and draws a straight line from each corner to the middle of the opposite edge. The three lines cross at one point P. What is P called?`,
    slips: [{ to: 2, id: "midpoint-means-circumcentre", kind: "conceptual", comp: CONC, says: () => "The midpoints were noticed and the point was taken to be the circumcentre. Lines from the corners to the midpoints of the opposite sides are medians, and medians meet at the centroid; the circumcentre comes from lines through the midpoints at right angles to the sides." }],
    test: (o) => allThrough(0, SCALENE, at(o)),
  },
  {
    kind: "c", ans: 1, level: 1,
    text: ([X, Y, Z]) => `In ${tri([X, Y, Z])}, D, E and F are points on ${Y}${Z}, ${Z}${X} and ${X}${Y} with ${X}D ⟂ ${Y}${Z}, ${Y}E ⟂ ${Z}${X} and ${Z}F ⟂ ${X}${Y}. The lines ${X}D, ${Y}E and ${Z}F meet at one point P. What is P called?`,
    word: ([X, Y, Z], _n, who) => `On a triangular plot ${X}${Y}${Z}, ${who} lays a straight path from each corner to the opposite boundary, meeting that boundary at right angles. The three paths meet at one point P. What is P called?`,
    slips: [{ to: 2, id: "right-angle-means-circumcentre", kind: "conceptual", comp: CONC, says: () => "The right angles were noticed and the point was taken to be the circumcentre. Lines from the corners at right angles to the opposite sides are altitudes; they meet at the orthocentre. The lines for the circumcentre go through the midpoints of the sides, not through the corners." }],
    test: (o) => allThrough(1, SCALENE, at(o)),
  },
  {
    kind: "c", ans: 2, level: 1,
    text: ([X, Y, Z]) => `In ${tri([X, Y, Z])}, a line is drawn through the midpoint of each side, at right angles to that side. The three lines meet at one point P. What is P called?`,
    word: ([X, Y, Z], _n, who) => `Three villages ${X}, ${Y} and ${Z} are planning roads. For each pair of villages, ${who} draws on the map a road through the point halfway between them, at right angles to the line joining them. The three roads meet at one point P. What is P called for ${tri([X, Y, Z])}?`,
    slips: [
      { to: 1, id: "right-angle-means-orthocentre", kind: "conceptual", comp: CONS, says: () => "The lines at right angles to the sides were taken to be altitudes. An altitude starts at a corner; these lines start at the midpoints of the sides, so they are perpendicular bisectors, and they meet at the circumcentre." },
      { to: 0, id: "midpoint-means-centroid", kind: "conceptual", comp: CONC, says: () => "The midpoints were noticed and the point was taken to be the centroid. The centroid comes from lines joining each corner to a midpoint (medians); lines through the midpoints at right angles to the sides meet at the circumcentre." },
    ],
    test: (o) => allThrough(2, SCALENE, at(o)),
  },
  {
    kind: "c", ans: 3, level: 1,
    text: ([X, Y, Z]) => `In ${tri([X, Y, Z])}, the angle at each of ${X}, ${Y} and ${Z} is cut into two equal parts by a line from that corner. The three lines meet at one point P. What is P called?`,
    word: ([X, Y, Z], _n, who) => `${who} folds a paper triangle ${X}${Y}${Z} so that each crease starts at a corner and cuts the angle there into two equal parts. The three creases meet at one point P. What is P called?`,
    slips: [{ to: 0, id: "bisector-as-median", kind: "conceptual", comp: CONS, says: () => "A line halving the angle at a corner was taken to halve the opposite side too, as a median does. It usually does not: lines halving the angles are angle bisectors, and they meet at the incentre." }],
    test: (o) => allThrough(3, SCALENE, at(o)),
  },
  {
    kind: "c", ans: 2, level: 2,
    text: ([X, Y, Z], n) => `A point P is such that P${X} = P${Y} = P${Z} = ${n} cm, where ${X}, ${Y} and ${Z} are the corners of ${tri([X, Y, Z])}. Which centre of the triangle is P?`,
    word: ([X, Y, Z], n, who) => `${who} wants to place a water tank at a point P that is exactly ${n} km from each of three villages ${X}, ${Y} and ${Z}. Which centre of ${tri([X, Y, Z])} is P?`,
    slips: [{ to: 3, id: "corners-for-sides", kind: "conceptual", comp: CONC, says: () => "Being equally far from the three corners was mixed up with being equally far from the three sides. The point equally far from the corners is the circumcentre; equally far from the sides is the incentre." }],
    test: (o) => {
      const P = at(o);
      return near(dist(P, SCALENE[0]), dist(P, SCALENE[1]), 1e-6) && near(dist(P, SCALENE[0]), dist(P, SCALENE[2]), 1e-6);
    },
  },
  {
    kind: "c", ans: 3, level: 2,
    text: ([X, Y, Z], n) => `A point P inside ${tri([X, Y, Z])} is ${n} cm from each of the three sides ${X}${Y}, ${Y}${Z} and ${Z}${X} (each distance measured at right angles to the side). Which centre of the triangle is P?`,
    word: ([X, Y, Z], n, who) => `In a triangular park ${X}${Y}${Z}, ${who} puts up a lamp post P that is exactly ${n} m from each of the three straight fences. Which centre of ${tri([X, Y, Z])} is P?`,
    slips: [{ to: 2, id: "sides-for-corners", kind: "conceptual", comp: CONC, says: () => "Being equally far from the three sides was mixed up with being equally far from the three corners. Equally far from the sides is the incentre; equally far from the corners is the circumcentre." }],
    test: (o) => {
      const P = at(o);
      const d = sideDistances(SCALENE, P);
      return insideOf(SCALENE, P) && near(d[0], d[1], 1e-6) && near(d[0], d[2], 1e-6);
    },
  },
  {
    kind: "c", ans: 0, level: 2,
    text: ([X, Y, Z], n) => `In ${tri([X, Y, Z])}, D is the midpoint of ${Y}${Z} and ${X}D = ${3 * n} cm. One of the four centres of the triangle is the point P on ${X}D with ${X}P = ${2 * n} cm and PD = ${n} cm. Which centre is P?`,
    word: ([X, Y, Z], n, who) => `${who} draws a line ${3 * n} cm long on a triangular card ${X}${Y}${Z}, from corner ${X} to the middle D of the edge ${Y}${Z}, and marks the point P that is ${2 * n} cm from ${X} and ${n} cm from D. P is one of the four centres of the triangle. Which one?`,
    slips: [{ to: 3, id: "inside-means-incentre", kind: "conceptual", comp: CONC, says: () => "A point well inside the triangle was taken to be the incentre. The incentre lies on the angle bisectors; a point on the line from a corner to a midpoint, two thirds of the way along, is the centroid." }],
    test: (o) => {
      const [X, Y, Z] = SCALENE;
      const D = mid(Y, Z);
      const P = at(o);
      return offLine(P, X, sub(D, X)) < EPS && near(dist(X, P), 2 * dist(P, D), 1e-6);
    },
  },
  {
    kind: "c", ans: 2, level: 2,
    text: ([X, Y, Z], n) => `A circle of radius ${n} cm with centre P passes through all three corners ${X}, ${Y} and ${Z} of ${tri([X, Y, Z])}. Which centre of the triangle is P?`,
    word: ([X, Y, Z], n, who) => `${who} wants a round fence of radius ${n} m that passes through three trees ${X}, ${Y} and ${Z}. The fence's centre is P. Which centre of ${tri([X, Y, Z])} is P?`,
    slips: [{ to: 3, id: "circumcircle-for-incircle", kind: "conceptual", comp: CONC, says: () => "The circle through the corners was mixed up with the circle inside that touches the sides. The circle through the three corners has its centre at the circumcentre; the circle touching the three sides has its centre at the incentre." }],
    test: (o) => {
      const P = at(o);
      const r = dist(P, SCALENE[0]);
      return SCALENE.every((c) => near(dist(P, c), r, 1e-6));
    },
  },
  {
    kind: "c", ans: 3, level: 2,
    text: ([X, Y, Z], n) => `A circle of radius ${n} cm with centre P lies inside ${tri([X, Y, Z])} and touches all three sides. Which centre of the triangle is P?`,
    word: ([X, Y, Z], n, who) => `${who} cuts the largest round cake that fits in a triangular box ${X}${Y}${Z}: its radius is ${n} cm and it touches all three sides of the box. Its centre is P. Which centre of ${tri([X, Y, Z])} is P?`,
    slips: [{ to: 2, id: "incircle-for-circumcircle", kind: "conceptual", comp: CONC, says: () => "The circle inside touching the sides was mixed up with the circle through the corners. The circle that touches the three sides has its centre at the incentre." }],
    test: (o) => {
      const P = at(o);
      const d = sideDistances(SCALENE, P);
      return insideOf(SCALENE, P) && d.every((x) => near(x, d[0], 1e-6));
    },
  },
  {
    kind: "c", ans: 1, level: 3,
    text: ([X, Y, Z]) => `${tri([X, Y, Z])} has a right angle at ${Y}. One of its four centres lies exactly at the corner ${Y}. Which one?`,
    word: ([X, Y, Z], _n, who) => `${who}'s set square is a triangle ${X}${Y}${Z} with its right angle at corner ${Y}. One of the four centres of this triangle lies exactly at the corner ${Y}. Which one?`,
    slips: [{ to: 2, id: "right-corner-circumcentre", kind: "conceptual", comp: CONC, says: ([X, , Z]) => `The circumcentre was placed at the right-angled corner. In a right triangle the circumcentre is the midpoint of the longest side ${X}${Z}. The two shorter sides are themselves altitudes, so the altitudes meet at the right-angled corner: the orthocentre.` }],
    test: (o) => dist(at(o, RIGHT), RIGHT[1]) < EPS,
  },
  {
    kind: "c", ans: 2, level: 3,
    text: ([X, Y, Z]) => `${tri([X, Y, Z])} has a right angle at ${Y}. One of its four centres lies exactly at the midpoint of the longest side ${X}${Z}. Which one?`,
    word: ([X, Y, Z], _n, who) => `${who}'s set square is a triangle ${X}${Y}${Z} with its right angle at corner ${Y}. One of the four centres of this triangle lies exactly at the middle of the longest edge ${X}${Z}. Which one?`,
    slips: [{ to: 0, id: "midpoint-is-centroid", kind: "conceptual", comp: CONC, says: () => "The midpoint of a side was taken to be the centroid. The centroid is two thirds of the way along each median, always inside the triangle. The midpoint of the longest side of a right triangle is equally far from all three corners, so it is the circumcentre." }],
    test: (o) => dist(at(o, RIGHT), mid(RIGHT[0], RIGHT[2])) < EPS,
  },
  {
    kind: "c", ans: 0, level: 3,
    text: ([X, Y, Z]) => `A triangle ${X}${Y}${Z} cut from card of even thickness balances flat on a pencil tip placed at one point P. Which centre of ${tri([X, Y, Z])} is P?`,
    word: ([X, Y, Z], _n, who) => `${who} hangs a flat triangular sign board ${X}${Y}${Z} from a single hook behind it, at the one point P where the board balances level. Which centre of ${tri([X, Y, Z])} is P?`,
    slips: [{ to: 3, id: "balance-at-incentre", kind: "conceptual", comp: CONC, says: () => "The balance point was taken to be the centre of the circle inside the triangle. A triangle balances where its medians meet, at the centroid." }],
    test: (o) => dist(at(o), balance(SCALENE)) < 0.01,
  },
  // ---- which lines pass through a named centre
  ...[0, 1, 2, 3].map((c): Stmt => ({
    kind: "l", ans: c, level: 2,
    text: (L) => `P is ${CENTRES[c]} of ${tri(L)}. Which three lines of the triangle all pass through P?`,
    word: (L, _n, who) => `${who} wants to mark ${CENTRES[c]} P of a triangular tile ${L.join("")}. Which three lines must be drawn on the tile so that they all pass through P?`,
    slips: ([
      [{ to: 2, id: "centroid-perp-bisectors", kind: "conceptual", comp: CONC, says: () => "Both medians and perpendicular bisectors use the midpoints of the sides, and they were mixed up. Medians join each corner to the midpoint of the opposite side, and they meet at the centroid." }],
      [{ to: 2, id: "orthocentre-perp-bisectors", kind: "conceptual", comp: CONS, says: () => "Both altitudes and perpendicular bisectors meet a side at right angles, and they were mixed up. Altitudes start at the corners; they meet at the orthocentre." }],
      [{ to: 1, id: "circumcentre-altitudes", kind: "conceptual", comp: CONS, says: () => "Both altitudes and perpendicular bisectors meet a side at right angles, and they were mixed up. The circumcentre is equally far from the corners, so it lies on the perpendicular bisectors, which go through the midpoints of the sides." }],
      [{ to: 2, id: "incentre-perp-bisectors", kind: "conceptual", comp: CONC, says: () => "The incentre was mixed up with the circumcentre. The incentre is equally far from the three sides, so it lies on the bisectors of the angles." }],
    ] as Stmt["slips"][])[c],
    // the centre found by its own defining property, then: do the three lines of the option all pass through it?
    test: (o) => {
      const P = c === 0 ? balance(SCALENE) : c === 1 ? meet(SCALENE[0], perpOf(sub(SCALENE[2], SCALENE[1])), SCALENE[1], perpOf(sub(SCALENE[0], SCALENE[2]))) : c === 2 ? equalFromCorners(SCALENE) : equalFromSides(SCALENE);
      return linesOf(o, SCALENE).every(([q, d]) => offLine(P, q, d) < (c === 0 ? 0.01 : EPS));
    },
  })),
  // ---- what one segment is
  {
    kind: "s", ans: 1, level: 1,
    text: ([X, Y, Z]) => `In ${tri([X, Y, Z])}, D is the point on ${Y}${Z} with ${X}D ⟂ ${Y}${Z}, so ∠${X}D${Y} = 90°. What is ${X}D?`,
    word: ([X, Y, Z], _n, who) => `${who} measures the height of a triangular sail ${X}${Y}${Z} along the line from the top corner ${X} that meets the bottom edge ${Y}${Z} at D at a right angle. What is ${X}D for ${tri([X, Y, Z])}?`,
    slips: [{ to: 2, id: "altitude-as-perp-bisector", kind: "conceptual", comp: CONS, says: ([X, Y, Z]) => `${X}D meets ${Y}${Z} at a right angle, so it was called the perpendicular bisector. A perpendicular bisector must also pass through the midpoint of ${Y}${Z}; a line from a corner at right angles to the opposite side is an altitude.` }],
    test: (o) => segTest(o, 1),
  },
  {
    kind: "s", ans: 0, level: 1,
    text: ([X, Y, Z], n) => `In ${tri([X, Y, Z])}, D is the point on ${Y}${Z} with ${Y}D = D${Z} = ${n} cm. What is ${X}D?`,
    word: ([X, Y, Z], n, who) => `${who} splits a triangular field ${X}${Y}${Z} with a straight fence from corner ${X} to the point D on the side ${Y}${Z} that is ${n} m from both ${Y} and ${Z}. What is the fence ${X}D for ${tri([X, Y, Z])}?`,
    slips: [{ to: 3, id: "median-as-bisector", kind: "conceptual", comp: CONS, says: ([X]) => `The line was taken to halve the angle at ${X} because it halves the opposite side. It usually does not halve the angle; a line from a corner to the midpoint of the opposite side is a median.` }],
    test: (o) => segTest(o, 0),
  },
  {
    kind: "s", ans: 3, level: 2,
    text: ([X, Y, Z], n) => `In ${tri([X, Y, Z])}, D is the point on ${Y}${Z} with ∠${Y}${X}D = ∠D${X}${Z} = ${15 + 5 * n}°. What is ${X}D?`,
    word: ([X, Y, Z], n, who) => `From village ${X}, two straight roads go to ${Y} and to ${Z}. ${who} builds a third road from ${X} to the road ${Y}${Z}, making an angle of ${15 + 5 * n}° with each of the first two roads; it reaches ${Y}${Z} at D. What is ${X}D for ${tri([X, Y, Z])}?`,
    slips: [{ to: 0, id: "bisector-as-median", kind: "conceptual", comp: CONS, says: ([, Y, Z]) => `The line was taken to end at the midpoint of ${Y}${Z} because it halves the angle. Halving the angle makes it an angle bisector; it reaches the midpoint only when the two sides at the corner are equal.` }],
    test: (o) => segTest(o, 3),
  },
  {
    kind: "s", ans: 2, level: 2,
    text: ([X, Y, Z]) => `In ${tri([X, Y, Z])}, D is the midpoint of ${Y}${Z}, and a line ℓ is drawn through D at right angles to ${Y}${Z}. What is ℓ?`,
    word: ([X, Y, Z], _n, who) => `${who} fixes a straight wire through the middle D of a rod ${Y}${Z}, at right angles to the rod. The rod is one side of a triangular frame ${X}${Y}${Z}. What is the wire's line ℓ for ${tri([X, Y, Z])}?`,
    slips: [{ to: 1, id: "perp-bisector-as-altitude", kind: "conceptual", comp: CONS, says: ([X]) => `The line was taken to be an altitude because of the right angle. An altitude starts at a corner; this line goes through the midpoint and need not pass through ${X}, so it is the perpendicular bisector.` }],
    test: (o) => segTest(o, 2),
  },
];
/** The segment a kind-s statement describes, built on the scalene triangle (0 to a midpoint, 1 at right angles from
 * X, 2 through the midpoint at right angles, 3 halving the angle at X), and whether option o's definition fits it. */
function segTest(o: number, built: number): boolean {
  const [X, Y, Z] = SCALENE;
  const M = mid(Y, Z);
  const side = sub(Z, Y);
  const line: Line = built === 0 ? [X, sub(M, X)] : built === 1 ? [X, perpOf(side)] : built === 2 ? [M, perpOf(side)] : [X, add(unit(sub(Y, X)), unit(sub(Z, X)))];
  const through = (q: V) => offLine(q, line[0], line[1]) < EPS;
  const square = Math.abs(dot(unit(line[1]), unit(side))) < EPS;
  if (o === 0) return through(X) && through(M);
  if (o === 1) return through(X) && square;
  if (o === 2) return through(M) && square;
  if (!through(X)) return false;
  const halves = (d: V) => near(angleAt(X, Y, add(X, d)), angleAt(X, add(X, d), Z), 1e-9);
  return halves(line[1]) || halves([-line[1][0], -line[1][1]]);
}
const segChoices = ([X, Y, Z]: string[]) => [`a median of ${tri([X, Y, Z])}`, `an altitude of ${tri([X, Y, Z])}`, `the perpendicular bisector of ${Y}${Z}`, `an angle bisector of ${tri([X, Y, Z])}`];
const D_CTR: [number, number][] = [[0, STMTS.length - 1], [0, TRIS.length - 1]];
const ctrN = ([k, s]: number[]) => 3 + (hsh([k, s], 5) % 7);
const ctrL = ([, s]: number[]) => TRIS[s].split("");
const ctrBase = (p: number[]) => {
  const S = STMTS[p[0]];
  return S.kind === "c" ? CENTRES : S.kind === "l" ? LINES : segChoices(ctrL(p));
};
const ctrOrder = (p: number[]) => perm(p, 4, 23);

// ================================================================ the centroid divides each median 2 : 1 (awcen)

// [f, x]: f 0 AD → AG, 1 AD → GD, 2 AG → AD, 3 GD → AG, 4 AG → GD, 5 GD → AD; x the given length in cm
const D_CEN: [number, number][] = [[0, 5], [2, 60]];
const K_CEN = ([f, x]: number[]) => (f <= 1 ? x % 3 === 0 && x >= 6 : f === 2 || f === 4 ? x >= 3 && x <= 40 : x <= 30);
const CEN_GIVEN = ["AD", "AD", "AG", "GD", "AG", "GD"];
const CEN_FIND = ["AG", "GD", "AD", "AG", "GD", "AD"];
/** The answer as a multiple of the given length. */
const CEN_K = [2 / 3, 1 / 3, 3 / 2, 2, 1 / 2, 3];
const cenAns = ([f, x]: number[]) => CEN_K[f] * x;
const CEN_WORDS: Record<string, string> = { AD: "the whole line from corner A to D", AG: "the distance from corner A to the hook point G", GD: "the distance from the hook point G to D" };

// ================================================================ the angle at the incentre (awinc)

// [f, a, b]: f 0 ∠A = a, find ∠BIC; 1 ∠B = a, ∠C = b, find ∠BIC; 2 ∠BIC = a, find ∠A
const D_INC: [number, number][] = [[0, 2], [20, 170], [0, 140]];
const K_INC = ([f, a, b]: number[]) => (f === 0 ? b === 0 && a % 2 === 0 && a <= 160 : f === 1 ? a % 10 === 0 && b % 10 === 0 && a <= 140 && b >= 20 && a + b <= 160 : b === 0 && a >= 100 && a <= 170);
const incAns = ([f, a, b]: number[]) => (f === 0 ? 90 + a / 2 : f === 1 ? 180 - (a + b) / 2 : 2 * a - 180);
/** ∠BIC measured on a triangle with base BC and the angles at B and C given (degrees). */
const measureBIC = (B: number, C: number) => {
  const r = Math.PI / 180;
  const Bp: V = [0, 0];
  const Cp: V = [1, 0];
  const A = meet(Bp, [Math.cos(B * r), Math.sin(B * r)], Cp, [-Math.cos(C * r), Math.sin(C * r)]);
  const I = equalFromSides([A, Bp, Cp]);
  return angleAt(I, Bp, Cp);
};

const incWord = (f: number, a: number, b: number, who: string) =>
      f === 2
        ? `${who} cuts a paper triangle ABC and makes two creases: one from corner B halving the angle at B, and one from corner C halving the angle at C. The creases cross at I, and ${who} measures ∠BIC = ${a}°. What is the angle at corner A, in degrees?`
        : `${who} cuts a paper triangle ABC with ${f === 0 ? `∠A = ${a}°` : `∠B = ${a}° and ∠C = ${b}°`}, and makes two creases: one from corner B halving the angle at B, and one from corner C halving the angle at C. The creases cross at I. What is ∠BIC, the angle between the creases at I facing side BC, in degrees?`;

export const B23: Def[] = [
  // ================================================================ which centre is described, which lines meet there
  {
    id: "awctr",
    arity: 2,
    title: "The centres of a triangle and the lines that meet there",
    competency: CONC,
    type: "choice",
    // [k, s]: statement k, triangle letters (and the length in it) s
    parse: none,
    reject: gate(D_CTR, () => true, "One of the statements about the centroid, orthocentre, circumcentre and incentre, in one of eight triangles."),
    choices: (p) => ctrOrder(p).map((i) => ctrBase(p)[i]),
    prompt: (p) => STMTS[p[0]].text(ctrL(p), ctrN(p)),
    solve: (p) => {
      const S = STMTS[p[0]];
      const right = ctrOrder(p).indexOf(S.ans);
      return { steps: [st("identify", S.kind === "c" ? "name the centre" : S.kind === "l" ? "name the lines" : "name the segment", CONC, [S.kind, ctrBase(p)[S.ans]], ctrBase(p)[S.ans])], answer: right };
    },
    // independent: test the chosen option on an actual triangle in coordinates (distances, lines through a point)
    validate: (p, v) => {
      if (typeof v !== "number" || v < 0 || v > 3) return false;
      const S = STMTS[p[0]];
      const fits = [0, 1, 2, 3].filter((o) => S.test(o));
      return fits.length === 1 && fits[0] === ctrOrder(p)[v];
    },
    bugs: (p) => {
      const S = STMTS[p[0]];
      const L = ctrL(p);
      return S.slips.map((x) => Bg(x.id, x.kind, x.comp, x.says(L), ctrOrder(p).indexOf(x.to)));
    },
    variants: () => [],
    explain: (s) => `This describes ${s.value}.`,
    domain: D_CTR,
    difficulty: ([k]) => STMTS[k].level,
    word: (p) => STMTS[p[0]].word(ctrL(p), ctrN(p), nameOf(p[0] + p[1])),
    teach: {
      idea: "A triangle has four kinds of special lines, three of each kind, and the three of a kind always meet at one point: medians at the centroid, altitudes at the orthocentre, perpendicular bisectors of the sides at the circumcentre, and angle bisectors at the incentre.",
      method: "Ask what each line does. Corner to midpoint of the opposite side: median (centroid, the balance point). Corner, at right angles to the opposite side: altitude (orthocentre). Through a midpoint at right angles: perpendicular bisector (circumcentre, equally far from the corners). Halving an angle: angle bisector (incentre, equally far from the sides).",
      alternatives: [
        { id: "fold_paper", title: "Fold a paper triangle", kind: "conceptual", text: ["Fold one corner onto another: the crease is the perpendicular bisector of that side, and every point on it is equally far from the two corners. The three such creases meet at the circumcentre.", "Fold one side onto the next so the crease runs through their corner: that crease halves the angle. The three such creases meet at the incentre, equally far from the sides."] },
        { id: "two_circles", title: "Two circles, two centres", kind: "procedural", text: ["The circle through the three corners is the circumcircle; its centre is the circumcentre (circum = around).", "The circle inside touching the three sides is the incircle; its centre is the incentre (in = inside)."], visual: () => ({ type: "circle", radius: "r" }) },
      ],
    },
    limits: "Naming the centre or line from a description, in eight triangles; constructing the lines and centres with ruler and compasses, and Euler's line, are educator-marked or later work.",
  },
  // ================================================================ the centroid divides each median 2 : 1
  {
    id: "awcen",
    arity: 2,
    title: "The centroid divides each median in the ratio 2 : 1",
    competency: CONC,
    type: "fraction",
    mc: true,
    decimals: true,
    parse: none,
    reject: gate(D_CEN, K_CEN, "A median or one of its parts, in whole centimetres up to 60 cm."),
    prompt: ([f, x]) => `In △ABC, AD is a median (D is the midpoint of BC) and G is the centroid. If ${CEN_GIVEN[f]} = ${x} cm, find ${CEN_FIND[f]}, in cm.`,
    solve: ([f, x]) => {
      const part = f <= 1 ? x / 3 : f === 2 || f === 4 ? x / 2 : x;
      const steps = [st("part", "divide", CONC, [`${CEN_GIVEN[f]} = ${x}`, f <= 1 ? 3 : f === 2 || f === 4 ? 2 : 1], part), st("scale", "multiply", CONC, [part, [2, 1, 3, 2, 1, 3][f]], cenAns([f, x]))];
      return { steps, answer: cenAns([f, x]) };
    },
    // independent: a triangle in coordinates, G as the average of the corners, lengths measured along AD
    validate: ([f, x], v) => {
      if (typeof v !== "number") return false;
      const [A, B, C]: V[] = [[1, 5], [0, 0], [6, 0]];
      const G: V = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      const D = mid(B, C);
      const m: Record<string, number> = { AD: dist(A, D), AG: dist(A, G), GD: dist(G, D) };
      return near(v / x, m[CEN_FIND[f]] / m[CEN_GIVEN[f]], 1e-9);
    },
    bugs: ([f, x]) => {
      const wrongWay = [x / 3, (2 * x) / 3, 3 * x, x / 2, 2 * x, 1.5 * x][f];
      return keepBugs([
        Bg("ratio-reversed", "conceptual", CONC, "The 2 : 1 was taken the wrong way round, with the shorter part next to the corner. The centroid is nearer the midpoint D: AG is the longer part (2 parts) and GD the shorter (1 part).", wrongWay),
        f <= 1 ? Bg("centroid-at-middle", "conceptual", CONC, "G was taken to be the midpoint of the median. It is not halfway: it is two thirds of the way from the corner A to D.", x / 2) : null,
        f === 2 ? Bg("double-for-whole", "procedural", CONC, "AG was doubled to get AD. AG is 2 of the 3 equal parts of AD, so one part is AG ÷ 2 and AD is 3 such parts.", 2 * x) : null,
        f === 2 || f === 4 ? Bg("other-part", "procedural", CONC, f === 2 ? "Only the short part GD was found. AD is the whole median: AG + GD." : "The whole median AD was found instead of GD. GD is only the short part between G and D.", f === 2 ? x / 2 : 1.5 * x) : null,
        f === 3 ? Bg("whole-for-part", "procedural", CONC, "The whole median AD was found instead of AG. AG is the long part from the corner A to G, without GD.", 3 * x) : null,
        f === 5 ? Bg("part-for-whole", "procedural", CONC, "Only AG was found. AD is the whole median: AG + GD.", 2 * x) : null,
      ].filter((b): b is Bug => !!b).map((b) => ({ ...b, predict: pos(b.predict as number) })));
    },
    distractors: ([f, x]) => [x, cenAns([f, x]) + 1, 2 * cenAns([f, x])].filter((v) => v !== cenAns([f, x])),
    variants: () => [],
    explain: (s) => (s.id === "part" ? `One part: ${s.inputs[0]} cm makes ${s.inputs[1]} part${s.inputs[1] === 1 ? "" : "s"}, so one part is ${Number(s.value)} cm` : `${s.inputs[1]} part${s.inputs[1] === 1 ? "" : "s"} of ${Number(s.inputs[0])} cm: ${Number(s.value)} cm`),
    domain: D_CEN,
    keep: K_CEN,
    difficulty: ([f, x]) => (f <= 1 || f === 3 ? (x <= 30 ? 1 : 2) : (Number.isInteger(cenAns([f, x])) ? 2 : 3)),
    word: ([f, x]) => `A flat triangular sign board ABC hangs level from a hook at its balance point G, which lies on the straight line from corner A to the middle D of the edge BC. ${CEN_WORDS[CEN_GIVEN[f]][0].toUpperCase()}${CEN_WORDS[CEN_GIVEN[f]].slice(1)} is ${x} cm. How long is ${CEN_WORDS[CEN_FIND[f]]}, in cm? (G is the centroid of △ABC.)`,
    teach: {
      idea: "The three medians of a triangle meet at the centroid G, and G cuts each median into two parts in the ratio 2 : 1, the longer part next to the corner. So AG is 2/3 of AD and GD is 1/3 of AD.",
      method: "Split the median into 3 equal parts. AG is 2 parts, GD is 1 part, AD is all 3. Find one part from the length you know, then multiply.",
      visual: () => ({ type: "numberline", from: 0, to: 3, step: 1, marks: [2] }),
      alternatives: [
        { id: "three_beads", title: "Three equal steps", kind: "procedural", text: ["Walk from A to D in three equal steps. After two steps you are at G; one more step reaches D.", "If AD = 12 cm, each step is 4 cm: AG = 8 cm and GD = 4 cm."], visual: () => ({ type: "numberline", from: 0, to: 3, step: 1, jumps: [[0, 1], [1, 2], [2, 3]], marks: [2] }) },
        { id: "average_corners", title: "Average the corners", kind: "conceptual", text: ["With coordinates, G is the average of the three corners: A(0, 6), B(−3, 0), C(3, 0) give G(0, 2), and D, the midpoint of BC, is (0, 0).", "Along AD, A is 6 units from D and G is 2 units from D: AG = 4, GD = 2, which is 2 : 1."], visual: () => ({ type: "plane", points: [[0, 6, "A"], [-3, 0, "B"], [3, 0, "C"], [0, 2, "G"], [0, 0, "D"]], segments: [[[0, 6], [-3, 0]], [[-3, 0], [3, 0]], [[3, 0], [0, 6]], [[0, 6], [0, 0]]] }) },
      ],
    },
    limits: "Whole-centimetre medians and parts up to 60 cm; the ratio of the other medians and proofs of the 2 : 1 property are left to the teaching and educator-marked tasks.",
  },
  // ================================================================ the angle at the incentre
  {
    id: "awinc",
    arity: 3,
    title: "The angle between two angle bisectors at the incentre",
    competency: CONC,
    type: "integer",
    mc: true,
    parse: none,
    reject: gate(D_INC, K_INC, "Whole-degree angles of a triangle, each from 20°, with an even angle where it is halved."),
    prompt: ([f, a, b]) =>
      f === 0
        ? `In △ABC, ∠A = ${a}°. The bisectors of ∠B and ∠C meet at the incentre I. Find ∠BIC, in degrees.`
        : f === 1
          ? `In △ABC, ∠B = ${a}° and ∠C = ${b}°. The bisectors of ∠B and ∠C meet at the incentre I. Find ∠BIC, in degrees.`
          : `The bisectors of ∠B and ∠C of △ABC meet at the incentre I, and ∠BIC = ${a}°. Find ∠A, in degrees.`,
    solve: ([f, a, b]) => {
      if (f === 2) return { steps: [st("excess", "subtract", CONC, [a, 90], a - 90), st("double", "multiply", CONC, [a - 90, 2], 2 * a - 180)], answer: 2 * a - 180 };
      const BC = f === 0 ? 180 - a : a + b;
      return { steps: [st("base", f === 0 ? "subtract" : "add", TRI, f === 0 ? [180, a] : [a, b], BC), st("halves", "divide", CONC, [BC, 2], BC / 2), st("rest", "subtract", TRI, [180, BC / 2], 180 - BC / 2)], answer: 180 - BC / 2 };
    },
    // independent: build the triangle in coordinates, find I as the point equally far from the sides, measure ∠BIC
    validate: ([f, a, b], v) => {
      if (typeof v !== "number" || !Number.isInteger(v)) return false;
      if (f === 2) return v > 0 && v < 180 && Math.abs(measureBIC((180 - v) / 2, (180 - v) / 2) - a) < 1e-6;
      const [B, C] = f === 0 ? [(180 - a) * 0.4, (180 - a) * 0.6] : [a, b];
      return Math.abs(measureBIC(B, C) - v) < 1e-6;
    },
    bugs: ([f, a, b]) => {
      if (f === 0)
        return keepBugs([
          Bg("minus-for-plus", "recall", CONC, `The rule was remembered as 90° − ∠A/2. The two half-angles at B and C add up to (180° − ${a}°) ÷ 2 = ${(180 - a) / 2}°, which is less than 90°, so ∠BIC is more than 90°.`, pos(90 - a / 2)),
          Bg("whole-angles", "conceptual", CONC, `The whole angles B and C were taken from 180°, which gives ∠A again. IB and IC are bisectors, so only half of ∠B and half of ∠C are in △BIC.`, a),
          Bg("supplement", "conceptual", CONC, "∠BIC and ∠A were taken to add up to 180°. They do not: find the two half-angles at B and C, then use the angle sum of △BIC.", 180 - a),
          Bg("a-not-halved", "procedural", CONC, `∠A was not halved: ∠BIC = 90° + ${a}°/2, not 90° + ${a}°.`, a + 90 < 180 ? a + 90 : null),
        ]);
      if (f === 1)
        return keepBugs([
          Bg("whole-angles", "conceptual", CONC, `The whole angles ${a}° and ${b}° were taken from 180°, which gives ∠A. IB and IC are bisectors, so only ${a / 2}° and ${b / 2}° are in △BIC.`, 180 - a - b, a + b <= 165 ? `gen:ahtri:${a},${b}` : undefined),
          Bg("one-halved", "procedural", CONC, "Only one of the two angles was halved. Both IB and IC are bisectors, so both ∠B and ∠C are halved.", [...new Set([pos(180 - a / 2 - b), pos(180 - a - b / 2)])].filter((x): x is number => x !== null)),
          Bg("sum-in-rule", "recall", CONC, `The rule 90° + half the angle was used with ∠B + ∠C in place of ∠A. The rule uses ∠A = 180° − ${a}° − ${b}° = ${180 - a - b}°.`, 90 + (a + b) / 2 < 180 ? 90 + (a + b) / 2 : null),
        ].map((x) => (Array.isArray(x.predict) && !x.predict.length ? { ...x, predict: null } : x)));
      return keepBugs([
        Bg("not-doubled", "procedural", CONC, `${a}° − 90° = ${a - 90}° is only half of ∠A, since ∠BIC = 90° + ∠A/2. Double it.`, a - 90),
        Bg("supplement", "conceptual", CONC, "∠BIC and ∠A were taken to add up to 180°. They do not: ∠BIC = 90° + ∠A/2.", 180 - a),
        Bg("whole-angles", "conceptual", CONC, "∠BIC was taken to equal ∠A, as if IB and IC took the whole angles at B and C. They take only half of each.", a < 180 ? a : null),
      ]);
    },
    distractors: (p) => [incAns(p) + 10, incAns(p) - 10, 180 - incAns(p)].filter((v) => v > 0 && v < 180 && v !== incAns(p)),
    range: [1, 179],
    variants: () => [],
    explain: (s) =>
      s.id === "base"
        ? s.op === "add"
          ? `∠B + ∠C = ${s.inputs[0]}° + ${s.inputs[1]}° = ${s.value}°`
          : `∠B + ∠C = 180° − ${s.inputs[1]}° = ${s.value}°`
        : s.id === "halves"
          ? `IB and IC halve ∠B and ∠C, so the two base angles of △BIC add up to ${s.inputs[0]}° ÷ 2 = ${s.value}°`
          : s.id === "rest"
            ? `∠BIC = 180° − ${s.inputs[1]}° = ${s.value}°`
            : s.id === "excess"
              ? `∠BIC = 90° + ∠A/2, so ∠A/2 = ${s.inputs[0]}° − 90° = ${s.value}°`
              : `∠A = 2 × ${s.inputs[0]}° = ${s.value}°`,
    domain: D_INC,
    keep: K_INC,
    difficulty: ([f, a, b]) => (f === 0 ? (a % 20 === 0 ? 1 : 2) : f === 1 ? 2 : 3),
    word: ([f, a, b]) => incWord(f, a, b, nameOf(a + b + f)),
    teach: {
      idea: "IB and IC cut ∠B and ∠C in half, so in △BIC the angles at B and C add up to half of (∠B + ∠C) = half of (180° − ∠A). What is left of 180° is ∠BIC = 90° + ∠A/2.",
      method: "Find ∠B + ∠C (180° − ∠A if only ∠A is given), halve it, and take the result from 180°. Going backwards: ∠A = 2 × (∠BIC − 90°).",
      visual: () => ({ type: "triangle", angles: ["70°", "50°", "60°"] }),
      alternatives: [
        { id: "worked_numbers", title: "Work it through with numbers", kind: "procedural", text: ["Take ∠B = 70° and ∠C = 50°. The bisectors make 35° and 25° at B and C inside △BIC.", "35° + 25° = 60°, so ∠BIC = 180° − 60° = 120°. Check: ∠A = 60°, and 90° + 30° = 120°."], visual: () => ({ type: "triangle", angles: ["35°", "25°", "∠BIC"] }) },
        { id: "extreme_check", title: "Check with special triangles", kind: "conceptual", text: ["In an equilateral triangle every angle is 60°, the halves are 30° and 30°, and ∠BIC = 120° = 90° + 30°.", "As ∠A gets close to 0°, B and C nearly fill 180°, their halves nearly fill 90°, and ∠BIC gets close to 90°: so ∠BIC is always more than 90°."] },
      ],
    },
    limits: "Whole-degree angles from 20°; the angles at the orthocentre and circumcentre (∠BHC = 180° − A, ∠BOC = 2A) come with circle theorems in later grades.",
  },
];
