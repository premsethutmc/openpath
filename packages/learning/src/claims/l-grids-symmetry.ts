import { rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 3 claims: l-grids-symmetry. Every value is recomputed from the prompt / params / figure data and the step
 *  inputs (by counting, simulation or plain arithmetic), never from the family's solver. A claim returns null whenever
 *  the step's inputs do not agree with what the prompt / picture shows. */

const int = (x: unknown): bigint | null => (typeof x === "number" && Number.isInteger(x) ? BigInt(x) : typeof x === "string" && /^-?\d+$/.test(x.trim()) ? BigInt(x.trim()) : null);
const same = (xs: readonly unknown[], want: readonly (bigint | string)[]): boolean =>
  xs.length === want.length && xs.every((x, i) => (typeof want[i] === "string" ? String(x) === want[i] : int(x) === want[i]));
type Fig = { type?: string; rows?: unknown[][]; head?: unknown[]; points?: [number, number, string][]; counts?: number[]; labels?: string[]; key?: number; sides?: number; kind?: string };
const fig = (p: Problem): Fig | null => (p.figure && typeof p.figure === "object" ? (p.figure as Fig) : null);
const cells = (p: Problem): string[][] | null => {
  const f = fig(p);
  if (!f || f.type !== "table" || !f.rows || !f.rows.length) return null;
  return f.rows.map((r) => r.map(String));
};
const opts = (p: Problem): string[] | null => (Array.isArray(p.options) && p.options.every((o) => typeof o === "string") ? (p.options as string[]) : null);

/* ------------------------------------------------------------------ abgrid */
/** Points S and E on the plane figure. step "across" has inputs [S.x, E.x] and states the number of squares between them;
 *  step "up" has inputs [S.y, E.y]. */
const abgridCount = (s: Step, p: Problem) => {
  const f = fig(p);
  if (!p.prompt.startsWith("On the grid, S is the start and E is the end.") || !f || f.type !== "plane" || !f.points || f.points.length !== 2) return null;
  const S = f.points.find((q) => q[2] === "S"), E = f.points.find((q) => q[2] === "E");
  if (!S || !E) return null;
  const k = s.id === "across" ? 0 : s.id === "up" ? 1 : -1;
  if (k < 0) return null;
  const a = int(S[k]), b = int(E[k]);
  if (a === null || b === null || !same(s.inputs, [a, b])) return null;
  return rat(a > b ? a - b : b - a);
};

/* ------------------------------------------------------------------ abseat */
const seatNamed = (p: Problem): { row: bigint; seat: bigint } | null => {
  const m = p.prompt.match(/^The table is the seating plan of a classroom: row 1 is at the front and seat 1 is on the left\. In which row and seat does (\S+) sit\? Answer as \(row, seat\)\.$/);
  const rows = cells(p);
  if (!m || !rows) return null;
  let found: { row: bigint; seat: bigint } | null = null;
  let n = 0;
  rows.forEach((r, i) => r.slice(1).forEach((c, j) => { if (c === m[1]) { n++; found = { row: BigInt(i + 1), seat: BigInt(j + 1) }; } }));
  return n === 1 ? found : null;
};
/** "In which row and seat does X sit?": the step "find the row" states the row of X in the plan (inputs [row]). */
const abseatRow = (s: Step, p: Problem) => { const f = seatNamed(p); return f && same(s.inputs, [f.row]) ? rat(f.row) : null; };
/** The same for the seat (inputs [seat]). */
const abseatSeat = (s: Step, p: Problem) => { const f = seatNamed(p); return f && same(s.inputs, [f.seat]) ? rat(f.seat) : null; };
const seatMove = (p: Problem) => {
  const m = p.prompt.match(/^In the seating plan, row 1 is at the front and seat 1 is on the left\. (\S+) sits in row (\d+), seat (\d+)\. \1's best friend sits (\d+) rows? behind and (\d+) seats? to the right of \1\. In which row and seat does the friend sit\? Answer as \(row, seat\)\.$/);
  if (!m) return null;
  const [r, c, dr, dc] = [m[2], m[3], m[4], m[5]].map((x) => BigInt(x));
  const rows = cells(p);
  // the named child must really sit there in the picture (when the picture is a table)
  if (rows && !(rows[Number(r) - 1] && rows[Number(r) - 1][Number(c)] === m[1])) return null;
  return { r, c, dr, dc };
};
/** The friend sits dr rows behind the child's row r: the new row is r + dr (inputs [r, dr]). */
const abseatBack = (s: Step, p: Problem) => { const m = seatMove(p); return m && same(s.inputs, [m.r, m.dr]) ? rat(m.r + m.dr) : null; };
/** The friend sits dc seats to the right of the child's seat c: the new seat is c + dc (inputs [c, dc]). */
const abseatRight = (s: Step, p: Problem) => { const m = seatMove(p); return m && same(s.inputs, [m.c, m.dc]) ? rat(m.c + m.dc) : null; };

/* ------------------------------------------------------------------ abroute */
const walk = (p: Problem) => {
  const m = p.prompt.match(/^On the map, each side of a square stands for (\d+) (km|m)\. \S+ starts at S, walks (\d+) squares? (East|West) and then (\d+) squares? (North|South) to E\. How far does \S+ walk, in (?:kilometres|metres)\?$/);
  if (!m) return null;
  return { scale: BigInt(m[1]), dx: BigInt(m[3]), dy: BigInt(m[5]) };
};
/** Walking dx squares then dy squares: dx + dy squares in all (inputs [dx, dy]). */
const abrouteSquares = (s: Step, p: Problem) => { const w = walk(p); return w && same(s.inputs, [w.dx, w.dy]) ? rat(w.dx + w.dy) : null; };
/** The distance is the number of squares times the length one square stands for (inputs [squares, scale]). */
const abrouteScale = (s: Step, p: Problem) => { const w = walk(p); return w && same(s.inputs, [w.dx + w.dy, w.scale]) ? rat((w.dx + w.dy) * w.scale) : null; };
/** Road table "X – Y" with lengths; the three ways from the first village to the last one in the prompt. */
const roadRoutes = (p: Problem): bigint[] | null => {
  const m = p.prompt.match(/^The table shows the roads between four villages and their lengths\. There are three ways to go from (\S+) to (\S+): through (\S+), through (\S+), or by the direct road\. How long is the shortest route, in km\?$/);
  const f = fig(p);
  if (!m || !f || f.type !== "table" || !f.rows) return null;
  const [, A, D, B, C] = m;
  const len = new Map<string, bigint>();
  for (const r of f.rows) {
    const road = String(r[0]).replace(/ \(direct\)$/, "").split(" – ");
    const L = int(r[1]);
    if (road.length !== 2 || L === null || L <= 0n) return null;
    const key = road.slice().sort().join("|");
    if (len.has(key)) return null;
    len.set(key, L);
  }
  if (len.size !== 5) return null;
  const g = (x: string, y: string) => len.get([x, y].sort().join("|"));
  const parts = [g(A, B), g(B, D), g(A, C), g(C, D), g(A, D)];
  if (parts.some((x) => x === undefined)) return null;
  const q = parts as bigint[];
  return [q[0] + q[1], q[2] + q[3], q[4]];
};
/** Each way's length is the sum of the roads on it: through the first village, through the second, the direct road. The step states them as "a, b, c". */
const abrouteEach = {
  check: (s: Step, p: Problem): boolean | null => {
    const r = roadRoutes(p);
    if (!r || !same(s.inputs, r)) return null;
    return s.value === r.join(", ");
  },
};
/** The shortest route is the smallest of the three lengths. */
const abrouteCompare: (s: Step, p: Problem) => ReturnType<typeof rat> | null = (s, p) => {
  const r = roadRoutes(p);
  if (!r || s.inputs.length !== 0) return null;
  return rat(r.reduce((a, b) => (b < a ? b : a)));
};

/* ------------------------------------------------------------------ abdir */
const DIRS = ["North", "East", "South", "West"];
const DEG: Record<string, number> = { North: 0, East: 90, South: 180, West: 270 };
const byDeg = (d: number) => DIRS.find((x) => DEG[x] === (((d % 360) + 360) % 360)) ?? null;
/** Facing a direction and turning (kind 0), what is on the left/right/behind (kind 2), or the map of places (kind 1). */
const abdirUse = {
  check: (s: Step, p: Problem): boolean | null => {
    if (typeof s.value !== "string" || s.inputs.length !== 3) return null;
    const [kk, a, b] = s.inputs.map(int);
    if (kk === null || a === null || b === null) return null;
    let m: RegExpMatchArray | null;
    if ((m = p.prompt.match(/^\S+ faces (North|East|South|West) and (turns right \(a quarter turn\)|turns left \(a quarter turn\)|turns right round to face the other way \(a half turn\))\. Which way does \S+ face now\?$/))) {
      const turn = m[2].startsWith("turns right (") ? 0n : m[2].startsWith("turns left") ? 1n : 2n;
      if (kk !== 0n || DIRS[Number(a)] !== m[1] || b !== turn) return null;
      return s.value === byDeg(DEG[m[1]] + [90, -90, 180][Number(turn)]);
    }
    if ((m = p.prompt.match(/^\S+ stands facing (North|East|South|West)\. Which direction is (behind \S+|on \S+'s (?:left|right))\?$/))) {
      const side = m[2].startsWith("behind") ? 2n : m[2].endsWith("left") ? 0n : 1n;
      if (kk !== 2n || DIRS[Number(a)] !== m[1] || b !== side) return null;
      return s.value === byDeg(DEG[m[1]] + [-90, 90, 180][Number(side)]);
    }
    const f = fig(p);
    if (kk !== 1n || !f || f.type !== "plane" || !f.points || !p.prompt.startsWith("In the map, North is at the top. ")) return null;
    const pts = f.points;
    const dirOf = (c: [number, number, string], q: [number, number, string]) =>
      c[0] === q[0] && q[1] > c[1] ? "North" : c[0] === q[0] && q[1] < c[1] ? "South" : c[1] === q[1] && q[0] > c[0] ? "East" : c[1] === q[1] && q[0] < c[0] ? "West" : null;
    if ((m = p.prompt.match(/Which place is to the (North|East|South|West) of the (.+)\?$/))) {
      if (b !== 0n) return null;
      const c = pts.filter((q) => q[2] === m![2]);
      if (c.length !== 1) return null;
      const hit = pts.filter((q) => q !== c[0] && dirOf(c[0], q) === m![1]);
      return hit.length === 1 && s.value === hit[0][2];
    }
    if ((m = p.prompt.match(/In which direction is the (.+) from the (.+)\?$/))) {
      if (b !== 1n) return null;
      const c = pts.filter((q) => q[2] === m![2]), t = pts.filter((q) => q[2] === m![1]);
      if (c.length !== 1 || t.length !== 1) return null;
      const d = dirOf(c[0], t[0]);
      return d === null ? null : s.value === d;
    }
    return null;
  },
};

/* ------------------------------------------------------------------ aeirr */
/** Squares on the picture: ■ full and ◕ more than half count 1 each, ◑ half counts ½, ◔ and □ count 0.
 *  Steps (inputs [#■, #◕]) the whole squares counted; (inputs [#◑]) the halves, half of that many; for two shapes A and B
 *  (inputs [#A, #B]) how many more squares the bigger one covers. */
const aeirrCount = (s: Step, p: Problem) => {
  const rows = cells(p);
  if (!rows) return null;
  const all = rows.flat();
  const n = (sym: string) => BigInt(all.filter((c) => c === sym).length);
  if (p.prompt.startsWith("The picture shows a leaf traced on squared paper.")) {
    if (!all.every((c) => "■◕◑◔□".includes(c))) return null;
    if (s.inputs.length === 2) return same(s.inputs, [n("■"), n("◕")]) ? rat(n("■") + n("◕")) : null;
    if (s.inputs.length === 1) return same(s.inputs, [n("◑")]) ? rat(n("◑")).div(rat(2n)) : null;
    return null;
  }
  if (p.prompt.startsWith("The picture shows two shapes, A and B, drawn on squared paper")) {
    const [a, b] = [n("A"), n("B")];
    if (a + b + n("·") !== BigInt(all.length) || !same(s.inputs, [a, b])) return null;
    return rat(a > b ? a - b : b - a);
  }
  return null;
};

/* ------------------------------------------------------------------ letters, digits, designs */
/** Capital letters in plain block form. B, K and Q depend on the font, so they are not read. */
const V_SYM = new Set("AHIMOTUVWXY");
const H_SYM = new Set("CDEHIOX");
const NO_SYM = new Set("FGJLNPRSZ");
const letterKnown = (c: string) => V_SYM.has(c) || H_SYM.has(c) || NO_SYM.has(c);

/** "Look at these capital letters: ... How many have a vertical/horizontal line of symmetry?" inputs [axis, "letters with it"]. */
const aesymCount = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^Look at these capital letters: ((?:[A-Z]  ){4}[A-Z])\. How many of them have a (vertical|horizontal) line of symmetry \(/);
  if (!m) return null;
  const ls = m[1].split("  ");
  if (!ls.every(letterKnown)) return null;
  const hit = ls.filter((c) => (m[2] === "vertical" ? V_SYM : H_SYM).has(c));
  if (s.inputs.length !== 2 || s.inputs[0] !== m[2] || s.inputs[1] !== hit.join(", ")) return null;
  return rat(BigInt(hit.length));
};

/** Seven bars a (top), b (top right), c (bottom right), d (bottom), e (bottom left), f (top left), g (middle). */
const BARS: Record<string, string> = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
const barsKey = (b: string) => [...b].sort().join("");
const digitFor = (bars: string) => Object.keys(BARS).find((d) => barsKey(BARS[d]) === barsKey(bars)) ?? null;
const mapBars = (b: string, m: Record<string, string>) => [...b].map((c) => m[c] ?? c).join("");
const TOP_BOTTOM = { a: "d", d: "a", b: "c", c: "b", e: "f", f: "e" };
const LEFT_RIGHT = { b: "f", f: "b", c: "e", e: "c" };
/** A number shown with bars folds onto itself across the middle if every digit does; down the middle if reading it in
 *  reverse with every digit mirrored gives the same digits. */
const numFolds = (num: string, vertical: boolean): boolean => {
  const ds = [...num];
  if (!vertical) return ds.every((d) => digitFor(mapBars(BARS[d], TOP_BOTTOM)) === d);
  const mirrored = ds.slice().reverse().map((d) => digitFor(mapBars(BARS[d], LEFT_RIGHT)));
  return mirrored.every((d, i) => d === ds[i]);
};
/** Numbers drawn like a digital clock: inputs [axis, "numbers that fold"]. */
const aedigsymCount = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^These are written the way a digital clock shows them, with straight bars: ((?:\d+, ){4}\d+)\. How many of them have a (vertical|horizontal) line of symmetry \(/);
  if (!m) return null;
  const ns = m[1].split(", ");
  const hit = ns.filter((x) => numFolds(x, m[2] === "vertical"));
  if (s.inputs.length !== 2 || s.inputs[0] !== m[2] || s.inputs[1] !== hit.join(", ")) return null;
  return rat(BigInt(hit.length));
};

/** Named shapes: the number of fold lines of each (prompt wording -> lines). */
const SHAPE_LINES: Record<string, bigint> = {
  "an equilateral triangle": 3n, "a square": 4n, "a rectangle (not a square)": 2n, "a rhombus (not a square)": 2n, "a kite": 1n,
  "a parallelogram (not a rectangle or rhombus)": 0n, "a trapezium with equal slanting sides": 1n, "a regular pentagon": 5n,
  "a regular hexagon": 6n, "a regular octagon": 8n, "a triangle with three different sides": 0n, "a right-angled triangle with two different shorter sides": 0n,
};
/** A square design: count the fold lines (up and down, across, two diagonals) that land every shaded square on a shaded square.
 *  Or a named shape (kind 1). Inputs [kind, seed]. */
const aedsymCount = (s: Step, p: Problem) => {
  if (s.inputs.length !== 2 || int(s.inputs[1]) === null) return null;
  const k = int(s.inputs[0]);
  const named = p.prompt.match(/^How many lines of symmetry does (.+) have\? \(The picture shows it\.\)$/);
  if (named) {
    const n = SHAPE_LINES[named[1]];
    return k === 1n && n !== undefined ? rat(n) : null;
  }
  if (!p.prompt.startsWith("The picture shows a square design made of shaded and white squares.") || k !== 0n) return null;
  const rows = cells(p);
  if (!rows || rows.length < 2 || rows.some((r) => r.length !== rows.length) || !rows.flat().every((c) => c === "■" || c === "□")) return null;
  const n = rows.length;
  const maps: ((i: number, j: number) => [number, number])[] = [
    (i, j) => [i, n - 1 - j], (i, j) => [n - 1 - i, j], (i, j) => [j, i], (i, j) => [n - 1 - j, n - 1 - i],
  ];
  let lines = 0n;
  for (const f of maps) {
    let ok = true;
    for (let i = 0; i < n && ok; i++) for (let j = 0; j < n; j++) { const [a, b] = f(i, j); if (rows[i][j] !== rows[a][b]) { ok = false; break; } }
    if (ok) lines++;
  }
  return rat(lines);
};

/** Which option word looks the same in a mirror beside it (every letter has an up-and-down line AND the word reads the same backwards)
 *  or in water below (every letter has an across line). The stated value is the index of the one option that does. */
const aemirrorReflect = {
  check: (s: Step, p: Problem): boolean | null => {
    const o = opts(p);
    const side = p.prompt.startsWith("A word is written in plain capital letters on a card, and the card is held next to a mirror"), water = p.prompt.startsWith("A word is painted in plain capital letters along the side of a boat");
    if (!o || o.length < 2 || side === water || !/^[A-Z]+$/.test(o.join("")) || !o.every((w) => /^[A-Z]+$/.test(w))) return null;
    if (s.inputs.length !== 2 || s.inputs[0] !== (side ? "side" : "water")) return null;
    if (![...o.join("")].every(letterKnown)) return null;
    const same_ = (w: string) => (side ? [...w].every((c) => V_SYM.has(c)) && [...w].reverse().join("") === w : [...w].every((c) => H_SYM.has(c)));
    const good = o.filter(same_);
    if (typeof s.value !== "number" || !Number.isInteger(s.value) || s.value < 0 || s.value >= o.length) return false;
    if (s.inputs[1] !== o[s.value]) return null;
    return good.length === 1 && good[0] === o[s.value];
  },
};

/* ------------------------------------------------------------------ aerefl */
const tupleOf = (v: unknown): [bigint, bigint] | null => {
  const m = typeof v === "string" ? v.match(/^\((-?\d+), (-?\d+)\)$/) : null;
  return m ? [BigInt(m[1]), BigInt(m[2])] : null;
};
/** P(x, y) reflected in x = m (or y = m): the mirror line cuts the segment from P to its image in half at right angles.
 *  Inputs [axis, m, c - m] with c the coordinate that crosses the line. */
const areflReflect = {
  check: (s: Step, p: Problem): boolean | null => {
    const q = p.prompt.match(/^In the picture, the point P is at \((\d+), (\d+)\) and the mirror line is (x|y) = (\d+)\. Reflect P in the mirror line\. What are the coordinates of its image\? Write them as \(x, y\)\.$/);
    if (!q) return null;
    const [x, y, m] = [BigInt(q[1]), BigInt(q[2]), BigInt(q[4])];
    const axis = q[3] === "y" ? 1n : 0n;
    const c = axis ? y : x;
    if (!same(s.inputs, [axis, m, c - m])) return null;
    const t = tupleOf(s.value);
    if (!t) return false;
    const [a, b] = t;
    // the image is on the same perpendicular as P (the other coordinate is kept) and the mirror line passes through the midpoint
    return axis ? a === x && b + y === 2n * m && b !== y : b === y && a + x === 2n * m && a !== x;
  },
};

/* ------------------------------------------------------------------ adpreg */
const POLY: Record<string, bigint> = { "equilateral triangle": 3n, "square": 4n, "regular pentagon": 5n, "regular hexagon": 6n, "regular heptagon": 7n, "regular octagon": 8n };
/** The regular shape in the question (also drawn in the picture) has this many equal sides; inputs [its name]. */
const adpregCount = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^All the sides of the (.+) in the picture are equal, and one side is \d+ cm\. What is its perimeter, in cm\?$/) ?? p.prompt.match(/^The perimeter of an? (.+) is \d+ cm\. All its sides are equal\. How long is one side, in cm\?$/);
  if (!m) return null;
  const n = POLY[m[1]];
  if (n === undefined || s.inputs.length !== 1 || s.inputs[0] !== m[1]) return null;
  const f = fig(p);
  if (f && f.type === "shape") { const drawn = f.sides !== undefined ? int(f.sides) : f.kind === "square" ? 4n : null; if (drawn !== n) return null; }
  return rat(n);
};

/* ------------------------------------------------------------------ acplace */
const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r])));
/** Four digit cards make two two-digit numbers x and y: the step states "x and y" where the largest sum / smallest sum / largest
 *  difference (x − y) is reached over every way of placing the cards (inputs [x, y]). */
const acplacePlace = {
  check: (s: Step, p: Problem): boolean | null => {
    const m = p.prompt.match(/^Use each of the digit cards in the picture \((\d), (\d), (\d), (\d)\) once to make two two-digit numbers\. What is the (largest sum|smallest sum|largest difference) you can get\?$/);
    if (!m || s.inputs.length !== 2) return null;
    const x = int(s.inputs[0]), y = int(s.inputs[1]);
    if (x === null || y === null) return null;
    const cards = [m[1], m[2], m[3], m[4]];
    const rows = cells(p);
    if (rows && rows.length === 1 && rows[0].join() !== cards.join()) return null;
    const val = (a: bigint, b: bigint) => (m[5] === "largest difference" ? a - b : a + b);
    const better = (u: bigint, v: bigint) => (m[5] === "smallest sum" ? u < v : u > v);
    let best: bigint | null = null;
    for (const P of permutations(cards)) {
      const r = val(BigInt(P[0] + P[1]), BigInt(P[2] + P[3]));
      if (best === null || better(r, best)) best = r;
    }
    if (typeof s.value !== "string" || s.value !== `${x} and ${y}`) return false;
    if (x < 10n || x > 99n || y < 10n || y > 99n) return false;
    const used = (String(x) + String(y)).split("").sort().join(""), want = cards.slice().sort().join("");
    return used === want && val(x, y) === best;
  },
};

/* ------------------------------------------------------------------ aagrp */
/** Compare two groups: two plates of a and b things in the picture (counts), or the numerals a and b in the question.
 *  Inputs [a, b]; the step states the plate (with more / fewer, as asked), "Both have the same number", or the true sentence. */
const aagrpCompare = {
  check: (s: Step, p: Problem): boolean | null => {
    if (typeof s.value !== "string" || s.inputs.length !== 2) return null;
    const a = int(s.inputs[0]), b = int(s.inputs[1]);
    if (a === null || b === null) return null;
    let m: RegExpMatchArray | null;
    if ((m = p.prompt.match(/^Compare the numbers (\d+) and (\d+)\. Which sentence is true\?$/))) {
      if (BigInt(m[1]) !== a || BigInt(m[2]) !== b) return null;
      return s.value === (a > b ? `${a} is more than ${b}` : a < b ? `${a} is less than ${b}` : `${a} is equal to ${b}`);
    }
    if ((m = p.prompt.match(/^Look at the (\w+) on the two plates in the picture\. Which plate has (more|fewer) \1\? If they have the same number, choose that\.$/))) {
      const f = fig(p);
      if (!f || f.type !== "pictograph" || !f.counts || !f.labels || f.counts.length !== 2 || f.labels.length !== 2 || f.key !== 1) return null;
      const [ca, cb] = [int(f.counts[0]), int(f.counts[1])];
      if (ca === null || cb === null || f.labels[0] === f.labels[1]) return null;
      // the inputs are the two plates' counts, in the picture's order
      if (ca !== a || cb !== b) return null;
      if (ca === cb) return s.value === "Both have the same number";
      const want = m[2] === "more" ? (ca > cb ? f.labels[0] : f.labels[1]) : ca < cb ? f.labels[0] : f.labels[1];
      return s.value === want;
    }
    return null;
  },
};

export const CLAIMS: ClaimTable = {
  "abgrid/count": abgridCount,
  "abseat/find the row": abseatRow,
  "abseat/find the seat": abseatSeat,
  "abseat/move back": abseatBack,
  "abseat/move right": abseatRight,
  "abroute/add the squares": abrouteSquares,
  "abroute/use the scale": abrouteScale,
  "abroute/add each route": abrouteEach,
  "abroute/compare": abrouteCompare,
  "abdir/use the directions": abdirUse,
  "aeirr/count": aeirrCount,
  "aesym/count": aesymCount,
  "aedigsym/count": aedigsymCount,
  "aedsym/count": aedsymCount,
  "aemirror/reflect": aemirrorReflect,
  "aerefl/reflect": areflReflect,
  "adpreg/count": adpregCount,
  "acplace/place digits": acplacePlace,
  "aagrp/compare": aagrpCompare,
};
/** For each key: "prompt-independent" (facts come from the prompt text or params) or "figure-consistent" (the only source is the data of the picture the family emitted). */
export const BASIS: Record<string, "prompt-independent" | "figure-consistent"> = {
  "abgrid/count": "figure-consistent", // S and E are only in the plane figure
  "abseat/find the row": "figure-consistent", // the plan is only in the table figure
  "abseat/find the seat": "figure-consistent",
  "abseat/move back": "prompt-independent", // the child's row and the move are in the question
  "abseat/move right": "prompt-independent",
  "abroute/add the squares": "prompt-independent", // the walk and the scale are in the question
  "abroute/use the scale": "prompt-independent",
  "abroute/add each route": "figure-consistent", // road lengths are only in the table
  "abroute/compare": "figure-consistent",
  "abdir/use the directions": "figure-consistent", // turns are in the question, but the map questions rely on the plane figure
  "aeirr/count": "figure-consistent", // the squares are only in the table figure
  "aesym/count": "prompt-independent", // the letters are in the question
  "aedigsym/count": "prompt-independent", // the numbers are in the question
  "aedsym/count": "figure-consistent", // square designs come from the figure; named shapes from the question
  "aemirror/reflect": "prompt-independent", // the words are the options
  "aerefl/reflect": "prompt-independent", // P and the mirror line are in the question
  "adpreg/count": "prompt-independent", // the shape is named in the question
  "acplace/place digits": "prompt-independent", // the cards are listed in the question
  "aagrp/compare": "figure-consistent", // plate counts are only in the pictograph; numerals are in the question
};
