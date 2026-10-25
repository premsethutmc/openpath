import { rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 3 claims: m-solids-angles-lattice. Every value is recomputed from the prompt / figure data and the step inputs
 *  (by enumeration or plain arithmetic), never from the family's solver.
 *  Standard geometry facts are written once, here: SOLID_FACTS (faces/edges/vertices of prisms and pyramids, built from
 *  the corners and edges), SOLID_VIEWS (nets and views of the named solids) and OBJECT_ANGLES (angles of everyday objects). */

const int = (x: unknown): number | null => (typeof x === "number" && Number.isInteger(x) ? x : typeof x === "string" && /^-?\d+$/.test(x.trim()) ? Number(x.trim()) : null);
const isInts = (xs: readonly unknown[], want: readonly number[]) => xs.length === want.length && xs.every((x, i) => typeof x === "number" && x === want[i]);
const fig = (p: Problem) => p.figure as { type?: string; head?: unknown[]; rows?: unknown[][]; dims?: unknown[]; sector?: unknown; rows_?: unknown } | undefined;
const opts = (p: Problem): string[] | null => (Array.isArray(p.options) && p.options.every((o) => typeof o === "string") ? (p.options as string[]) : null);
const choose2 = (m: number) => { let n = 0; for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) n++; return n; };

/* ================================================================== solids: faces, edges, vertices */
/** Counts [faces, edges, vertices] of a prism (kind 0) or pyramid (kind 1) on an n-gon, built from its corners and edges. */
function SOLID_FACTS(kind: number, n: number): [number, number, number] {
  const verts = new Set<string>(), edges = new Set<string>();
  const addE = (a: string, b: string) => edges.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  let faces = 0;
  if (kind === 0) {
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) { verts.add(`${layer}.${i}`); addE(`${layer}.${i}`, `${layer}.${(i + 1) % n}`); }
    for (let i = 0; i < n; i++) addE(`0.${i}`, `1.${i}`);
    faces = 2 + n; // two bases, one rectangle on each side of the base
  } else {
    for (let i = 0; i < n; i++) { verts.add(`b.${i}`); addE(`b.${i}`, `b.${(i + 1) % n}`); addE(`b.${i}`, "apex"); }
    verts.add("apex");
    faces = 1 + n; // the base, one triangle on each side of the base
  }
  return [faces, edges.size, verts.size];
}
const POLYGONS: Record<string, number> = { triangular: 3, square: 4, pentagonal: 5, hexagonal: 6, heptagonal: 7, octagonal: 8, nonagonal: 9, decagonal: 10 };
const FEV = ["faces", "edges", "vertices"];

/** "How many faces/edges/vertices does a P prism/pyramid have?", inputs [solid, n, ask]: the count of that kind. */
const afsolidCount = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^How many (faces|edges|vertices) ?(?:\(corners\) )?does an? (\w+) (prism|pyramid) have\?/);
  if (!m) return null;
  const n = POLYGONS[m[2]], kind = m[3] === "prism" ? 0 : 1, ask = FEV.indexOf(m[1]);
  if (!n || !isInts(s.inputs, [kind, n, ask])) return null;
  return rat(BigInt(SOLID_FACTS(kind, n)[ask]));
};
/** Euler's rule (faces + vertices − edges = 2): from the two counts given in the prompt find the third; inputs [ask, F, E, V]. */
const afsolidRearrange = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^A solid with flat faces has (\d+) (faces|edges|vertices) and (\d+) (faces|edges|vertices)\. Using Euler's rule \(faces \+ vertices − edges = 2\), how many (faces|edges|vertices) does it have\?$/);
  if (!m) return null;
  const given: Record<string, number> = { [m[2]]: Number(m[1]), [m[4]]: Number(m[3]) };
  if (m[2] === m[4] || m[5] === m[2] || m[5] === m[4]) return null;
  const ask = FEV.indexOf(m[5]);
  if (s.inputs.length !== 4 || int(s.inputs[0]) !== ask) return null;
  for (let k = 0; k < 3; k++) if (k !== ask && int(s.inputs[k + 1]) !== given[FEV[k]]) return null;
  const F = given.faces, E = given.edges, V = given.vertices;
  const v = ask === 0 ? 2 + E - V : ask === 1 ? F + V - 2 : 2 + E - F;
  return v >= 0 ? rat(BigInt(v)) : null;
};

/* ================================================================== painted cubes */
/** Number of unit cubes of an a × b × c block (painted outside) that have exactly `faces` painted faces, by going through every cube. */
const paintedCubes = (a: number, b: number, c: number, faces: number): number => {
  let n = 0;
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) {
    const f = (i === 0 || i === a - 1 ? 1 : 0) + (j === 0 || j === b - 1 ? 1 : 0) + (k === 0 || k === c - 1 ? 1 : 0);
    if (f === faces) n++;
  }
  return n;
};
/** Reads "A a × b × c block ... How many small cubes have <phrase>?"; the figure (when it has dims) must show the same block. */
const paintRead = (p: Problem) => {
  const m = p.prompt.match(/^A (\d+) × (\d+) × (\d+) block is built from small cubes, as in the picture\. The whole outside of the block is painted\. How many small cubes have (paint on exactly two faces|paint on exactly one face|no paint at all)\?$/);
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = fig(p);
  const dims = f && f.type === "solid" && Array.isArray(f.dims) ? f.dims.map(String) : null;
  const want = a === b && b === c ? [`${a} cubes on each edge`] : [`${c} cubes long`, `${b} cubes wide`, `${a} cubes high`];
  if (!dims || dims.length !== want.length || dims.some((d, i) => d !== want[i])) return null;
  return { a, b, c, faces: m[4].includes("two") ? 2 : m[4].includes("one") ? 1 : 0 };
};
/** inputs [a, b, c]: the lengths left after taking the two outer layers off each, "a-2, b-2, c-2". */
const paintInner = (s: Step, p: Problem): boolean | null => {
  const r = paintRead(p);
  if (!r || !isInts(s.inputs, [r.a, r.b, r.c]) || r.a < 2 || r.b < 2 || r.c < 2) return null;
  const inside = (len: number) => { let n = 0; for (let i = 1; i < len - 1; i++) n++; return n; };
  return s.value === `${inside(r.a)}, ${inside(r.b)}, ${inside(r.c)}`;
};
/** inputs [a-2, b-2, c-2, ask]: the number of cubes with the asked paint (ask 1 two faces, 2 one face, 3 none). */
const paintCount = (faces: number, ask: number) => (s: Step, p: Problem) => {
  const r = paintRead(p);
  if (!r || r.faces !== faces || !isInts(s.inputs, [r.a - 2, r.b - 2, r.c - 2, ask])) return null;
  return rat(BigInt(paintedCubes(r.a, r.b, r.c, faces)));
};

/* ================================================================== cube nets */
type Cell = [number, number];
/** The squares of a net picture: every non-empty cell of the table, with its text. */
const netCells = (p: Problem): { r: number; c: number; t: string }[] | null => {
  const f = fig(p);
  if (!f || f.type !== "table" || !Array.isArray(f.rows)) return null;
  const out: { r: number; c: number; t: string }[] = [];
  f.rows.forEach((row, r) => row.forEach((t, c) => { if (String(t) !== "") out.push({ r, c, t: String(t) }); }));
  return out;
};
/** Roll a die over the net starting on the first square; faces 0..5 with opposite pairs (0,1) (2,3) (4,5). Returns the face
 *  that lands on each square (null if the squares are not all joined edge to edge). */
function rollDie(cells: { r: number; c: number }[]): number[] | null {
  const idx = new Map(cells.map((q, i) => [`${q.r},${q.c}`, i]));
  type Die = { top: number; bottom: number; north: number; south: number; east: number; west: number };
  const out: (number | undefined)[] = cells.map(() => undefined);
  const start: Die = { top: 0, bottom: 1, north: 2, south: 3, east: 4, west: 5 };
  out[0] = start.bottom;
  const queue: [number, Die][] = [[0, start]];
  while (queue.length) {
    const [i, d] = queue.shift()!;
    const { r, c } = cells[i];
    const moves: [number, number, Die][] = [
      [r, c + 1, { top: d.west, bottom: d.east, north: d.north, south: d.south, east: d.top, west: d.bottom }],
      [r, c - 1, { top: d.east, bottom: d.west, north: d.north, south: d.south, east: d.bottom, west: d.top }],
      [r - 1, c, { top: d.south, bottom: d.north, north: d.top, south: d.bottom, east: d.east, west: d.west }],
      [r + 1, c, { top: d.north, bottom: d.south, north: d.bottom, south: d.top, east: d.east, west: d.west }],
    ];
    for (const [nr, nc, nd] of moves) {
      const j = idx.get(`${nr},${nc}`);
      if (j === undefined || out[j] !== undefined) continue;
      out[j] = nd.bottom;
      queue.push([j, nd]);
    }
  }
  return out.every((x) => x !== undefined) ? (out as number[]) : null;
}
/** Net with lettered squares (inputs [letter]): the letter whose square lands opposite the given one when the net is folded
 *  (rolling a die over it). Net of unlettered squares (inputs ["six squares"]): "six different faces" if the six squares
 *  land on six different faces, otherwise "two squares land on the same face". */
const afcubeFold = {
  check: (s: Step, p: Problem): boolean | null => {
    const cells = netCells(p);
    if (!cells || cells.length !== 6 || typeof s.value !== "string") return null;
    const faces = rollDie(cells);
    if (!faces) return null;
    if (/^The picture shows a shape made of six squares \(■\)\. Can it be folded along the lines into a cube, with no two squares overlapping\?$/.test(p.prompt)) {
      if (!cells.every((q) => q.t === "■") || s.inputs.length !== 1 || s.inputs[0] !== "six squares") return null;
      return s.value === (new Set(faces).size === 6 ? "six different faces" : "two squares land on the same face");
    }
    const m = p.prompt.match(/^The picture shows a net of a cube with its six squares lettered\. When it is folded into a cube, which face is opposite face ([A-F])\?$/);
    if (!m || new Set(cells.map((q) => q.t)).size !== 6 || !cells.every((q) => /^[A-F]$/.test(q.t)) || new Set(faces).size !== 6) return null;
    if (s.inputs.length !== 1 || s.inputs[0] !== m[1]) return null;
    const me = cells.findIndex((q) => q.t === m[1]);
    const opp = faces.indexOf(faces[me] ^ 1);
    return opp >= 0 && s.value === cells[opp].t;
  },
};

/* ================================================================== matching solids with nets and views */
/** Nets and views of the named solids (standard facts). Missing entries are not used. */
type View = { net?: string; top?: string; front?: string; end?: string };
const SOLID_VIEWS: Record<string, View> = {
  "cube": { net: "6 equal squares", top: "a square", front: "a square" },
  "cuboid": { net: "6 rectangles, in three matching pairs", top: "a rectangle", front: "a rectangle" },
  "cylinder": { net: "2 equal circles and 1 rectangle", top: "a circle", front: "a rectangle", end: "a circle" },
  "cone": { net: "1 circle and 1 fan shape (a sector of a bigger circle)", top: "a circle with a dot at its centre", front: "a triangle" },
  "sphere": { top: "a circle", front: "a circle" },
  "hemisphere (flat face down)": { top: "a circle", front: "a semicircle" },
  "square pyramid": { net: "1 square and 4 triangles", top: "a square with lines from its corners to its centre", front: "a triangle" },
  "triangular pyramid": { net: "4 triangles", top: "a triangle with lines from its corners to its centre", front: "a triangle" },
};
for (const [word, n] of Object.entries({ triangular: 3, pentagonal: 5, hexagonal: 6, heptagonal: 7, octagonal: 8, nonagonal: 9, decagonal: 10 })) {
  const poly = ["", "", "", "triangle", "", "pentagon", "hexagon", "heptagon", "octagon", "nonagon", "decagon"][n];
  SOLID_VIEWS[`${word} prism`] = { net: `2 ${poly}s and ${n} rectangles`, top: `a ${poly}`, front: "a rectangle", end: `a ${poly}` };
  if (n !== 3) SOLID_VIEWS[`${word} pyramid`] = { net: `1 ${poly} and ${n} triangles`, top: `a ${poly} with lines from its corners to its centre`, front: "a triangle" };
}
SOLID_VIEWS["triangular prism"].net = "2 triangles and 3 rectangles";
/** The value must be the only option that fits what the prompt says (nets, top / front / end view, or the pair of views). */
const afnetMatch = {
  check: (s: Step, p: Problem): boolean | null => {
    const o = opts(p);
    if (!o || typeof s.value !== "string" || s.inputs.length !== 2) return null;
    let want: (x: string) => boolean | null; // does this option fit?
    let m: RegExpMatchArray | null;
    const solidOf = (name: string) => SOLID_VIEWS[name];
    if ((m = p.prompt.match(/^A net is made of (.+)\. Which solid does it fold into\?$/))) {
      if (s.inputs[1] !== "net") return null;
      want = (x) => (solidOf(x) ? solidOf(x).net === m![1] : null);
    } else if ((m = p.prompt.match(/^Which of these nets folds into an? (.+)\?$/))) {
      const sol = solidOf(m[1]);
      if (!sol || !sol.net || s.inputs[0] !== m[1] || s.inputs[1] !== "net") return null;
      want = (x) => x === sol.net;
    } else if ((m = p.prompt.match(/^A solid stands on a table\. Seen from straight above it looks like (.+); seen from the front it looks like (.+)\. Which solid is it\?$/))) {
      if (s.inputs[1] !== "views") return null;
      want = (x) => (solidOf(x) ? solidOf(x).top === m![1] && solidOf(x).front === m![2] : null);
    } else if ((m = p.prompt.match(/^An? (.+?) (?:stands on a table(?: on its base)?|lies on its side on a table, with one end facing you)\. What do you see when you look at it from (straight above|the front, at eye level)\?$/))) {
      const sol = solidOf(m[1]);
      const kind = m[2] === "straight above" ? "top" : /lies on its side/.test(p.prompt) ? "end" : "front";
      const ans = sol?.[kind];
      if (!ans || s.inputs[0] !== m[1] || s.inputs[1] !== `${kind} view`) return null;
      want = (x) => x === ans;
    } else return null;
    const fits = o.map(want);
    if (fits.some((f) => f === null) || fits.filter(Boolean).length !== 1) return null;
    if (/Which solid/.test(p.prompt) && s.inputs[0] !== s.value) return false;
    return o.indexOf(s.value) === fits.indexOf(true);
  },
};

/* ================================================================== views of a building of cubes */
/** The plan: numbers of cubes stacked on each square (rows in table order, back row first). */
const plan = (p: Problem): number[][] | null => {
  const f = fig(p);
  if (!f || f.type !== "table" || !Array.isArray(f.rows) || !Array.isArray(f.head) || f.rows.length < 1) return null;
  const g = f.rows.map((row) => row.slice(1).map((t) => (typeof t === "string" && /^\d+$/.test(t) ? Number(t) : NaN)));
  const w = f.head.length - 1;
  return g.every((r) => r.length === w && r.every((x) => !Number.isNaN(x))) ? g : null;
};
const viewAsk = (p: Problem): number | null => {
  const m = p.prompt.match(/^The table is a plan of a building made of cubes standing on a mat: each number tells how many cubes are stacked on that square\. The front of the building is the bottom row of the table\. When you look at the building (from straight above \(the top view\)|from the front|from the right-hand side), how many squares do you see\?$/);
  return m ? ["from straight above (the top view)", "from the front", "from the right-hand side"].indexOf(m[1]) : null;
};
/** Top view: one square for every square of the mat that has cubes on it. */
const afviewCount: (s: Step, p: Problem) => ReturnType<typeof rat> | null = (s, p) => {
  const g = plan(p);
  if (!g || viewAsk(p) !== 0 || s.inputs.length !== 1 || s.inputs[0] !== "squares with cubes") return null;
  return rat(BigInt(g.flat().filter((x) => x > 0).length));
};
/** Front view: the tallest stack in each column (left to right); right-hand side view: the tallest stack in each row (table order). */
const afviewMax = {
  check: (s: Step, p: Problem): boolean | null => {
    const g = plan(p), ask = viewAsk(p);
    if (!g || (ask !== 1 && ask !== 2) || s.inputs.length !== 1 || s.inputs[0] !== (ask === 1 ? "each column" : "each row")) return null;
    const tall = ask === 1 ? g[0].map((_, c) => Math.max(...g.map((row) => row[c]))) : g.map((row) => Math.max(...row));
    return s.value === tall.join(", ");
  },
};

/* ================================================================== hidden rectangles, squares, triangles */
const gridRead = (p: Problem) => {
  const m = p.prompt.match(/^The picture shows (?:a rectangle divided into )?a grid of (\d+) rows? and (\d+) columns of small squares\. How many (rectangles|squares) of any size/);
  if (!m) return null;
  const f = fig(p);
  if (!f || (f as { type?: string }).type !== "grid" || (f as unknown as { rows: number }).rows !== Number(m[1]) || (f as unknown as { cols: number }).cols !== Number(m[2])) return null;
  return { rows: Number(m[1]), cols: Number(m[2]), what: m[3] };
};
/** Pairs chosen from m lines: rectangles use a pair of the (columns + 1) vertical lines, a pair of the (rows + 1) horizontal
 *  lines; triangles use a pair of the (lines from the top corner + 2) lines through the top corner. Inputs [m, 2]. */
const afhiddenChoose = (s: Step, p: Problem) => {
  let m: number | null = null;
  const g = gridRead(p);
  if (g && g.what === "rectangles") m = s.id === "across" ? g.cols + 1 : s.id === "down" ? g.rows + 1 : null;
  else {
    const t = p.prompt.match(/^A triangle has (\d+) straight lines? drawn from its top corner down to its base/);
    if (t && s.id === "pairs") m = Number(t[1]) + 2;
  }
  if (m === null || !isInts(s.inputs, [m, 2])) return null;
  return rat(BigInt(choose2(m)));
};
/** Squares of side k in a grid (inputs [k, rows − k + 1, cols − k + 1]): count the positions of the top-left corner. */
const afhiddenCount = (s: Step, p: Problem) => {
  const g = gridRead(p), k = int(s.inputs[0]);
  if (!g || g.what !== "squares" || k === null || k < 1 || s.id !== `size${k}` || !isInts(s.inputs, [k, g.rows - k + 1, g.cols - k + 1])) return null;
  let n = 0;
  for (let r = 0; r + k <= g.rows; r++) for (let c = 0; c + k <= g.cols; c++) n++;
  return rat(BigInt(n));
};

/* ================================================================== volume of two boxes */
/** Box A and Box B from the prompt; inputs [volume A, volume B]; the value is the true statement about them. */
const avvcmpCompare = {
  check: (s: Step, p: Problem): boolean | null => {
    const m = p.prompt.match(/^Box A is built from 1 cm cubes: (\d+) long, (\d+) wide and (\d+) high\. Box B is built from 1 cm cubes: (\d+) long, (\d+) wide and (\d+) high \(the table in the picture shows both\)\. Which is true\?$/);
    if (!m || typeof s.value !== "string") return null;
    const d = m.slice(1).map(Number);
    const count = (l: number, w: number, h: number) => { let n = 0; for (let i = 0; i < l; i++) for (let j = 0; j < w; j++) for (let k = 0; k < h; k++) n++; return n; };
    const A = count(d[0], d[1], d[2]), B = count(d[3], d[4], d[5]);
    if (!isInts(s.inputs, [A, B])) return null;
    const f = fig(p);
    if (!f || !Array.isArray(f.rows) || f.rows.length !== 2 || [0, 1].some((r) => [0, 1, 2].some((c) => String((f.rows as unknown[][])[r][c + 1]) !== `${d[r * 3 + c]} cubes`))) return null;
    return s.value === (A > B ? "Box A has the greater volume" : A < B ? "Box B has the greater volume" : "Both boxes have the same volume");
  },
};

/* ================================================================== angles */
/** Angles named in the table: the one that is acute (0 to 90), right (90), obtuse (90 to 180) or straight (180). */
const aeangCompare = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^The table gives the sizes of four angles: P = (\d+)°, Q = (\d+)°, R = (\d+)°, S = (\d+)°\. Which one is an? (acute|right|obtuse|straight) angle\? Write its size in degrees\.$/);
  if (!m || !isInts(s.inputs.slice(1), [90]) || s.inputs[0] !== m[5]) return null;
  const xs = m.slice(1, 5).map(Number);
  const f = fig(p);
  if (!f || !Array.isArray(f.rows) || f.rows.length !== 1 || f.rows[0].slice(1).map(String).join(",") !== xs.map((x) => `${x}°`).join(",")) return null;
  const ok = (x: number) => (m[5] === "acute" ? x > 0 && x < 90 : m[5] === "right" ? x === 90 : m[5] === "obtuse" ? x > 90 && x < 180 : x === 180);
  const hit = xs.filter(ok);
  return hit.length === 1 ? rat(BigInt(hit[0])) : null;
};
/** Angles of everyday things (degrees): square corners 90, a clock's hands 30° per hour, one eighth of a circle 45,
 *  the interior angle of a regular hexagon 120, a flat open book 180; pencil point, samosa corner and star tip are sharp (acute). */
const OBJECT_ANGLES = (text: string): number | null => {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^the hands of a clock at (\d+) o'clock$/))) { const h = Number(m[1]); return h >= 1 && h <= 11 ? 30 * Math.min(h, 12 - h) : null; }
  if (/^the corner (?:of a (?:notebook page|classroom door|carrom board|postcard|square floor tile|blackboard|matchbox)|where a wall meets the flat floor)$/.test(text)) return 90;
  if (text === "the tip of a slice of a pizza cut into 8 equal slices") return 360 / 8;
  if (text === "a corner of a honeycomb cell") return (6 - 2) * 180 / 6;
  if (text === "an open book lying flat on a table") return 180;
  if (text === "the point of a sharpened pencil" || text === "a corner of a samosa" || text === "the tip of a star in a rangoli") return 45; // some acute angle: only "not 90" is used
  return null;
};
/** Mode 0 (inputs [0, degrees]): the index of the option saying how the shaded angle compares with a right angle.
 *  Mode 1 (inputs [1, 90]): the index of the one object whose angle is a right angle. */
const aertangCompare = (s: Step, p: Problem) => {
  const o = opts(p);
  if (!o) return null;
  if (/^Hold the corner of a folded paper/.test(p.prompt)) {
    const f = fig(p);
    const deg = f && f.type === "circle" ? int(f.sector) : null;
    if (deg === null || deg <= 0 || deg >= 360 || !isInts(s.inputs, [0, deg])) return null;
    const hit = o.map((t, i) => (t === (deg < 90 ? "smaller than a right angle" : deg === 90 ? "exactly a right angle" : "bigger than a right angle") ? i : -1)).filter((i) => i >= 0);
    return o.length === 3 && hit.length === 1 ? rat(BigInt(hit[0])) : null;
  }
  if (p.prompt === "Which of these makes a right angle (a square corner)?") {
    if (!isInts(s.inputs, [1, 90])) return null;
    const angles = o.map(OBJECT_ANGLES);
    if (angles.some((a) => a === null)) return null;
    const hit = angles.map((a, i) => (a === 90 ? i : -1)).filter((i) => i >= 0);
    return hit.length === 1 ? rat(BigInt(hit[0])) : null;
  }
  return null;
};

/* ================================================================== lattice multiplication */
/** Total of diagonal i (0 = bottom right, the ones) of the lattice for a × b: the ones halves of the boxes with digit
 *  places p + q = i plus the tens halves of the boxes with p + q = i − 1 (p, q count digits from the right). */
const avlatAdd = (s: Step, p: Problem) => {
  const m = p.prompt.match(/^The grid in the picture is the lattice for (\d+) × (\d+): /);
  if (!m || s.inputs.length !== 1) return null;
  const i = int(s.inputs[0]);
  const tail = p.prompt.slice(m[0].length);
  const whole = /What is \d+ × \d+\?$/.test(tail), second = /What is the total of the second diagonal from the bottom right \(the tens place\), before any carrying\?$/.test(tail);
  if (i === null || i < 0 || (whole ? s.id !== `d${i}` : second ? s.id !== "diag" || i !== 1 : true)) return null;
  const da = m[1].split("").reverse().map(Number), db = m[2].split("").reverse().map(Number);
  if (whole && i > da.length + db.length - 1) return null;
  let tot = 0;
  da.forEach((x, pp) => db.forEach((y, q) => {
    const prod = x * y;
    if (pp + q === i) tot += prod % 10;
    if (pp + q === i - 1) tot += (prod - (prod % 10)) / 10;
  }));
  return rat(BigInt(tot));
};

export const CLAIMS: ClaimTable = {
  "afcube/fold": afcubeFold,
  "afnet/match": afnetMatch,
  "afsolid/count": afsolidCount,
  "afsolid/rearrange": afsolidRearrange,
  "afpaint/subtract": { check: paintInner },
  "afpaint/edges": paintCount(2, 1),
  "afpaint/faces": paintCount(1, 2),
  "afpaint/inside": paintCount(0, 3),
  "afview/max": afviewMax,
  "afview/count": afviewCount,
  "afhidden/count": afhiddenCount,
  "afhidden/choose": afhiddenChoose,
  "avvcmp/compare": avvcmpCompare,
  "aeang/compare": aeangCompare,
  "aertang/compare": aertangCompare,
  "avlat/add": avlatAdd,
};
/** For each key: "prompt-independent" (facts come from the prompt text or params) or "figure-consistent" (the only source is the data of the picture the family emitted). */
export const BASIS: Record<string, "prompt-independent" | "figure-consistent"> = {
  "afcube/fold": "figure-consistent", // the net exists only as the picture
  "afnet/match": "prompt-independent",
  "afsolid/count": "prompt-independent",
  "afsolid/rearrange": "prompt-independent",
  "afpaint/subtract": "prompt-independent", // block size in the prompt; the figure dims are only cross-checked
  "afpaint/edges": "prompt-independent",
  "afpaint/faces": "prompt-independent",
  "afpaint/inside": "prompt-independent",
  "afview/max": "figure-consistent", // the plan of the building is only in the picture
  "afview/count": "figure-consistent",
  "afhidden/count": "prompt-independent", // grid size in the prompt; the figure is only cross-checked
  "afhidden/choose": "prompt-independent",
  "avvcmp/compare": "prompt-independent",
  "aeang/compare": "prompt-independent", // the angles are in the prompt; the table is only cross-checked
  "aertang/compare": "figure-consistent", // mode 0 reads the drawn angle from the picture; mode 1 uses the options (mixed, see report)
  "avlat/add": "prompt-independent",
};
