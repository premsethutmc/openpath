/**
 * Batch b02 (families@2), Grades 1–3: sorting by attributes, picture records, number patterns, straight and curved
 * lines, grids and routes, sides, corners and faces, rolling and sliding, folding symmetry of letters, capacity,
 * clocks, change, length with a ruler, mass on a balance, equal groups, hundreds, tens and ones.
 * Written by OpenPath; CC0.
 */
import type { Bug, Def, Visual } from "../family-kit";

const none = () => null;
const SORT = "MATH.reasoning.sort-by-attribute";
const PIC = "MATH.statistics.picture-data";
const PAT = "MATH.algebra.number-patterns";
const LINES = "MATH.geometry.line-types";
const MAPS = "MATH.geometry.maps-directions";
const SHAPE = "MATH.geometry.shape-properties";
const SYM = "MATH.geometry.symmetry-fold";
const CAP = "MATH.measurement.capacity";
const CLOCK = "MATH.measurement.clock";
const CHANGE = "MATH.measurement.money-change";
const LEN = "MATH.measurement.standard-length";
const MASS = "MATH.measurement.standard-mass";
const GROUPS = "MATH.number.equal-groups";
const HUND = "MATH.number.hundreds";
const COUNT = "MATH.number.count-objects";
const ADD = "MATH.number.addition";
const SUB = "MATH.number.subtraction";
const PV = "MATH.number.place-value-tens";

const NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Kumar", "Priya"];
const name = (k: number) => NAMES[((k % NAMES.length) + NAMES.length) % NAMES.length];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const tup = (a: number, b: number) => `(${a}, ${b})`;
const readTup = (v: unknown): [number, number] | null => {
  const m = String(v).replace(/−/g, "-").match(/^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** Subtracting the smaller digit from the larger in every column (no exchanging): 50 − 23 → 33. */
const smallerFromLarger = (a: number, b: number) => {
  const A = String(a);
  const B = String(b).padStart(A.length, "0");
  return Number([...A].map((d, i) => Math.abs(Number(d) - Number(B[i]))).join(""));
};
const pos = (v: number | null) => (v !== null && v >= 0 ? v : null);

// ---------------------------------------------------------------- sorting
const COLOURS = ["red", "blue"];
const SIZES = ["big", "small"];
/** [colour, size] of each button, in a fixed mixed order. */
function buttons([rb, rs, bb, bs]: number[]): [string, string][] {
  const out: [string, string][] = [];
  [rb, rs, bb, bs].forEach((n, k) => {
    for (let i = 0; i < n; i++) out.push([COLOURS[k >> 1], SIZES[k & 1]]);
  });
  let seed = rb * 7 + rs * 13 + bb * 29 + bs * 41 + 3;
  const keyed = out.map((b, i) => {
    seed = (seed * 1103515245 + 12345 + i) % 2147483648;
    return { b, k: seed };
  });
  return keyed.sort((x, y) => x.k - y.k).map((x) => x.b);
}
/** q: 0 red, 1 blue, 2 big, 3 small, 4 red and big, 5 red and small, 6 blue and big, 7 blue and small. */
const sortQ = (q: number): { colour?: string; size?: string } =>
  q === 0 ? { colour: "red" } : q === 1 ? { colour: "blue" } : q === 2 ? { size: "big" } : q === 3 ? { size: "small" } : { colour: COLOURS[(q - 4) >> 1], size: SIZES[(q - 4) & 1] };
const sortDesc = (q: number) => {
  const { colour, size } = sortQ(q);
  return colour && size ? `${colour} AND ${size}` : (colour ?? size)!;
};
const sortCount = (p: number[], q: number) => {
  const [rb, rs, bb, bs] = p;
  const { colour, size } = sortQ(q);
  const cell = { "red big": rb, "red small": rs, "blue big": bb, "blue small": bs } as Record<string, number>;
  let n = 0;
  for (const c of colour ? [colour] : COLOURS) for (const s of size ? [size] : SIZES) n += cell[`${c} ${s}`];
  return n;
};

// ---------------------------------------------------------------- picture records
const TOYS = ["Balls", "Dolls", "Cars", "Tops"];
const pictograph = (c: number[]): Visual => ({ type: "pictograph", labels: TOYS, counts: c, key: 1 });

// ---------------------------------------------------------------- patterns
const STEPS = [2, 3, 5, 10];
const seq = (s: number, st: number, dir: number, n: number) => Array.from({ length: n }, (_, i) => s + i * st * (dir ? -1 : 1));
const MSTEPS = [1, 2, 5, 10];

// ---------------------------------------------------------------- letters
const WORDS = ["RAVI", "ANU", "MEENA", "ARJUN", "DIVYA", "KAVYA", "IMRAN", "SELVI", "TAMIL", "DELHI", "CHENNAI", "MANGO", "LOTUS", "TIGER", "KITE", "LEMON", "HOUSE", "TRAIN", "MAT", "HAT", "TOY", "BOX", "SUN", "MOON", "STAR", "FISH", "CAT", "DOG", "BUS", "CAR", "TEA", "MILK", "RICE", "DOSA", "IDLI", "VADA", "PARROT", "WATER", "TREE", "LEAF", "BALL", "DRUM", "PEN", "INK", "MAP", "ZEBRA", "YAK", "FAN", "NET", "OWL", "EGG", "JAR", "WAVE", "HILL", "TAXI", "VAN"];
const STRAIGHT = "AEFHIKLMNTVWXYZ";
const MIXED = "BDGJPQRU";
/** Curved strokes in each capital letter (the independent table for straight-only letters). */
const CURVES: Record<string, number> = { B: 2, C: 1, D: 1, G: 1, J: 1, O: 1, P: 1, Q: 1, R: 1, S: 1, U: 1 };
const SYMM = "ABCDEHIMOTUVWXY";
const VERT = "AHIMOTUVWXY";
const HORIZ = "BCDEHIOX";
const spaced = (w: string) => [...w].join("  ");
const letterFigure = (w: string): Visual => ({ type: "table", head: ["Word"], rows: [[spaced(w)]] });
const distinct = (w: string) => [...new Set(w)].join("");

// ---------------------------------------------------------------- shapes
const SHAPES: Record<number, [string, string]> = { 0: ["circle", "circles"], 3: ["triangle", "triangles"], 4: ["square", "squares"], 5: ["pentagon", "pentagons"], 6: ["hexagon", "hexagons"] };
const CORNERS_BY_NAME: Record<string, number> = { circle: 0, triangle: 3, square: 4, pentagon: 5, hexagon: 6 };
const shapeName = (s: number, k: number) => `${k} ${SHAPES[s][k === 1 ? 0 : 1]}`;
const THINGS: [string, string][] = [["ball", "sphere"], ["marble", "sphere"], ["orange", "sphere"], ["box", "cuboid"], ["book", "cuboid"], ["brick", "cuboid"], ["dice", "cube"], ["tin can", "cylinder"], ["pipe", "cylinder"], ["drum", "cylinder"]];
const LOOK: Record<string, string> = { sphere: "round all over", cuboid: "box shape: only flat faces", cube: "cube: only flat faces", cylinder: "two flat ends and a curved side" };
const chosen = (m: number) => THINGS.filter((_, i) => (m >> i) & 1);
const popcount = (m: number) => {
  let c = 0;
  for (let x = m; x; x >>= 1) c += x & 1;
  return c;
};
const SOLIDS = ["cube", "cuboid", "square pyramid"];
const SOLIDS_PL = ["cubes", "cuboids", "square pyramids"];
const SOLID_FEC = [[6, 12, 8], [6, 12, 8], [5, 8, 5]];
const FEC_WORD = ["flat faces", "edges", "corners"];
const VISIBLE = [3, 9, 7];
const listAnd = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// ---------------------------------------------------------------- capacity
const CONTAINERS = ["Bucket", "Pot", "Jug"];
const JUGS: [number, number, number][] = [[500, 50, 50], [1000, 100, 50], [2000, 200, 100]];
const litres = (c: number) => (c === 1000 ? " (1 litre)" : c === 2000 ? " (2 litres)" : "");

// ---------------------------------------------------------------- money, mass
const NOTES = [10, 20, 50, 100];
const coinsOf = ([t, f, w, o]: number[]) => [...Array(t).fill(10), ...Array(f).fill(5), ...Array(w).fill(2), ...Array(o).fill(1)] as number[];
const WEIGHTS = [1000, 500, 200, 100, 50];
const wname = (g: number) => (g === 1000 ? "1 kg" : `${g} g`);
const weightList = (p: number[]) => p.flatMap((n, i) => Array(n).fill(wname(WEIGHTS[i])) as string[]);

export const B02: Def[] = [
  // ================================================================ sort by attribute
  {
    id: "absort",
    arity: 5,
    title: "Sorting buttons by colour and size",
    competency: SORT,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => {
      const t = sum(p.slice(0, 4));
      return p.slice(0, 4).some((n) => n < 0 || n > 4) || t < 4 || t > 10 || p[4] < 0 || p[4] > 7 || sortCount(p, p[4]) < 1 ? "Up to 10 buttons, two colours and two sizes; the group asked for is not empty." : null;
    },
    prompt: ([, , , , q]) => `Look at the buttons in the table. Put all the ${sortDesc(q)} buttons in one group. How many buttons are in that group?`,
    solve: (p) => {
      const q = p[4];
      const { colour, size } = sortQ(q);
      const steps = colour && size
        ? [
            { id: "first", op: "sort", competency: SORT, inputs: [colour], value: sortCount(p, COLOURS.indexOf(colour)) },
            { id: "second", op: "sort", competency: SORT, inputs: [size, colour], value: sortCount(p, q) },
          ]
        : [{ id: "group", op: "sort", competency: SORT, inputs: [(colour ?? size)!], value: sortCount(p, q) }];
      return { steps, answer: sortCount(p, q) };
    },
    // independent: go down the drawn table row by row and tick every matching button
    validate: (p, v) => {
      const { colour, size } = sortQ(p[4]);
      let c = 0;
      for (const [col, sz] of buttons(p)) if ((!colour || col === colour) && (!size || sz === size)) c++;
      return v === c;
    },
    bugs: (p) => {
      const q = p[4];
      const ans = sortCount(p, q);
      const total = sum(p.slice(0, 4));
      const { colour, size } = sortQ(q);
      const out: Bug[] = [];
      if (colour && size) {
        const nc = sortCount(p, COLOURS.indexOf(colour));
        const ns = sortCount(p, 2 + SIZES.indexOf(size));
        out.push({ id: "one-attribute-only", kind: "conceptual", competency: SORT, says: `Only one thing was checked. Each button in the group must be ${colour} and also ${size}.`, predict: [nc, ns] });
        out.push({ id: "or-for-and", kind: "conceptual", competency: SORT, says: `Buttons that were ${colour} OR ${size} were counted. The group needs buttons that are both.`, predict: nc + ns - ans });
      }
      out.push({ id: "counted-the-rest", kind: "procedural", competency: SORT, says: "The buttons that do NOT belong were counted. Count only the ones that match.", predict: total - ans });
      out.push({ id: "missed-one", kind: "procedural", competency: COUNT, says: "One matching button was missed. Tick each one as you count it.", predict: ans >= 2 ? ans - 1 : null });
      return out;
    },
    variants: () => [],
    explain: (s) => (s.id === "first" ? `First find the ${s.inputs[0]} buttons: there are ${s.value}.` : s.id === "second" ? `Of the ${s.inputs[1]} buttons, the ${s.inputs[0]} ones are: ${s.value}.` : `Tick every ${s.inputs[0]} button: there are ${s.value}.`),
    figure: (p) => ({ type: "table", head: ["Button", "Colour", "Size"], rows: buttons(p).map(([c, s], i) => [i + 1, c, s]) }),
    domain: [[0, 4], [0, 4], [0, 4], [0, 4], [0, 7]],
    keep: (p) => {
      const q = p[4];
      const { colour, size } = sortQ(q);
      if (!(colour && size)) return sortCount(p, q) < sum(p.slice(0, 4));
      const ans = sortCount(p, q);
      return ans < sum(p.slice(0, 4)) && sortCount(p, COLOURS.indexOf(colour)) > ans && sortCount(p, 2 + SIZES.indexOf(size)) > ans;
    },
    cap: 400,
    difficulty: (p) => (p[4] >= 4 ? 3 : sum(p.slice(0, 4)) <= 6 ? 1 : 2),
    word: (p) => `${name(p[0] + p[4])} is tidying a box of buttons, listed in the table. ${name(p[0] + p[4])} puts every ${sortDesc(p[4])} button into a small tin. How many buttons go into the tin?`,
    teach: {
      idea: "Things that share the same property (the same colour, or the same size) belong in the same group.",
      method: "Go down the list one button at a time. If it matches, put a tick next to it. Count the ticks.",
      visual: (p) => ({ type: "pictograph", labels: ["red big", "red small", "blue big", "blue small"], counts: p.slice(0, 4), key: 1 }),
      alternatives: [
        { id: "two_step", title: "Sort twice", kind: "conceptual", text: ["When you need two things to match, sort in two steps.", "First take out all the buttons of the right colour. Then, from those, take out the ones of the right size."], visual: (p) => ({ type: "bars", title: "buttons", labels: ["red", "blue", "big", "small"], values: [p[0] + p[1], p[2] + p[3], p[0] + p[2], p[1] + p[3]], scale: 1 }) },
      ],
    },
    limits: "Two colours and two sizes, up to 10 buttons; sorting by shape and by rolling or sliding is in the shape families.",
  },
  // ================================================================ picture data
  {
    id: "abpic",
    arity: 5,
    title: "Reading a picture record of toys",
    competency: PIC,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (p.slice(0, 4).some((n) => n < 1 || n > 8) || p[4] < 0 || p[4] > 4 ? "Four kinds of toy, 1 to 8 of each; ask one kind, or the kind there are most of." : null),
    prompt: (p) => (p[4] < 4 ? `Look at the picture record. One ● is one toy. How many ${TOYS[p[4]].toLowerCase()} are there?` : "Look at the picture record. One ● is one toy. Find the kind of toy there are the most of. How many of that toy are there?"),
    solve: (p) => {
      const c = p.slice(0, 4);
      if (p[4] < 4) return { steps: [{ id: "row", op: "count", competency: COUNT, inputs: [TOYS[p[4]]], value: c[p[4]] }], answer: c[p[4]] };
      const m = Math.max(...c);
      return { steps: [{ id: "most", op: "compare", competency: PIC, inputs: [TOYS[c.indexOf(m)]], value: m }], answer: m };
    },
    // independent: count the pictures in each row one at a time (and, for "most", compare every row with every other)
    validate: (p, v) => {
      const counts = p.slice(0, 4).map((n) => {
        let k = 0;
        for (let i = 0; i < n; i++) k++;
        return k;
      });
      if (p[4] < 4) return v === counts[p[4]];
      return counts.some((k) => k === v && counts.every((o) => o <= k));
    },
    bugs: (p) => {
      const c = p.slice(0, 4);
      const k = p[4];
      if (k < 4) return [
        { id: "wrong-row", kind: "procedural", competency: PIC, says: `A different row was read. Find the word "${TOYS[k]}" first, then count the pictures in that row.`, predict: [c[k - 1], c[k + 1]].filter((x) => x !== undefined && x !== c[k]) as number[] },
        { id: "counted-all", kind: "conceptual", competency: PIC, says: `All the toys were counted. The question asks only about ${TOYS[k].toLowerCase()}.`, predict: sum(c) },
        { id: "missed-one", kind: "procedural", competency: COUNT, says: "One picture was missed. Touch each picture as you count.", predict: c[k] >= 2 ? c[k] - 1 : null },
      ];
      return [
        { id: "fewest", kind: "conceptual", competency: PIC, says: "The row with the FEWEST pictures was chosen. The most means the longest row.", predict: Math.min(...c) },
        { id: "first-row", kind: "procedural", competency: PIC, says: "The first row was read without comparing the rows. Look for the longest row.", predict: c[0] },
        { id: "counted-all", kind: "conceptual", competency: PIC, says: "All the toys were counted. Count only the row with the most.", predict: sum(c) },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "row" ? `Count the ● in the ${s.inputs[0]} row: ${s.value}.` : `The longest row is ${s.inputs[0]}, with ${s.value} pictures.`),
    figure: (p) => pictograph(p.slice(0, 4)),
    domain: [[1, 8], [1, 8], [1, 8], [1, 8], [0, 4]],
    keep: (p) => {
      const c = p.slice(0, 4);
      const m = Math.max(...c);
      return p[4] < 4 || c.filter((x) => x === m).length === 1;
    },
    cap: 400,
    difficulty: (p) => (p[4] === 4 ? 3 : p[p[4]] <= 5 ? 1 : 2),
    word: (p) => `The children in ${name(p[0] + p[4])}'s class drew one ● for each toy they brought. ${p[4] < 4 ? `How many ${TOYS[p[4]].toLowerCase()} did they bring?` : "Which toy did they bring the most of, and how many of it did they bring? Write the number."}`,
    teach: {
      idea: "In a picture record each picture stands for one thing, so the number of pictures in a row is how many there are of that kind.",
      method: "Find the row with the name you want. Touch each picture in that row and count. For 'the most', find the longest row.",
      alternatives: [
        { id: "as_bars", title: "Turn the rows into bars", kind: "conceptual", text: ["Each row of pictures is like a bar: a longer row means more toys.", "Put the rows side by side; the longest bar is the most."], visual: (p) => ({ type: "bars", title: "toys", labels: TOYS, values: p.slice(0, 4), scale: 1 }) },
      ],
    },
    limits: "Four rows, up to 8 pictures each, one picture for one toy; keys bigger than 1 come in later grades.",
  },
  {
    id: "abpicmore",
    arity: 6,
    title: "How many more in a picture record",
    competency: PIC,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (p.slice(0, 4).some((n) => n < 1 || n > 9) || p[4] === p[5] || p[p[4]] <= p[p[5]] ? "Four rows of 1 to 9 pictures; compare a longer row with a shorter one." : null),
    prompt: (p) => `Look at the picture record. One ● is one toy. How many more ${TOYS[p[4]].toLowerCase()} than ${TOYS[p[5]].toLowerCase()} are there?`,
    solve: (p) => {
      const [a, b] = [p[p[4]], p[p[5]]];
      return {
        steps: [
          { id: "read", op: "count", competency: COUNT, inputs: [TOYS[p[4]], TOYS[p[5]]], value: [a, b] },
          { id: "difference", op: "subtract", competency: SUB, inputs: [a, b], value: a - b },
        ],
        answer: a - b,
      };
    },
    // independent: match one picture from each row until the shorter row runs out; count what is left over
    validate: (p, v) => {
      let x = p[p[4]];
      let y = p[p[5]];
      while (y > 0) {
        x--;
        y--;
      }
      return v === x;
    },
    bugs: (p) => {
      const [a, b] = [p[p[4]], p[p[5]]];
      return [
        { id: "added", kind: "conceptual", competency: PIC, says: "The two rows were added. 'How many more' asks for the difference: match them up and count what is left.", predict: a + b },
        { id: "gave-larger", kind: "conceptual", competency: PIC, says: `The number of ${TOYS[p[4]].toLowerCase()} was given. The question asks how many MORE there are than ${TOYS[p[5]].toLowerCase()}.`, predict: a },
        { id: "gave-smaller", kind: "procedural", competency: PIC, says: "The shorter row was read instead of finding the difference.", predict: b },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `${s.inputs[0]}: ${(s.value as number[])[0]}; ${s.inputs[1]}: ${(s.value as number[])[1]}.` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} more.`),
    figure: (p) => pictograph(p.slice(0, 4)),
    domain: [[1, 9], [1, 9], [1, 9], [1, 9], [0, 3], [0, 3]],
    keep: (p) => p[4] !== p[5] && p[p[4]] > p[p[5]] && p[p[4]] - p[p[5]] !== p[p[5]],
    cap: 400,
    difficulty: (p) => (p[p[4]] - p[p[5]] <= 2 ? 1 : p[p[4]] <= 6 ? 2 : 3),
    word: (p) => `On sports day, ${name(p[0])} drew one ● for each toy in the class box. Are there more ${TOYS[p[4]].toLowerCase()} or ${TOYS[p[5]].toLowerCase()}? Find how many more ${TOYS[p[4]].toLowerCase()} there are.`,
    teach: {
      idea: "To find how many more, match each picture in the short row with one in the long row; the pictures with no partner are the difference.",
      method: "Count both rows, then take the smaller number away from the bigger one (or count on from the smaller to the bigger).",
      alternatives: [
        { id: "count_on", title: "Count on", kind: "procedural", text: ["Start at the smaller number and count up to the bigger one.", "The number of counts you make is how many more."], visual: (p) => ({ type: "numberline", from: 0, to: 10, marks: [p[p[5]], p[p[4]]], jumps: [[p[p[5]], p[p[4]]]] }) },
      ],
    },
    limits: "Two rows of the same picture record, up to 9 pictures each, one picture for one toy.",
  },
  // ================================================================ number patterns
  {
    id: "abseq",
    arity: 3,
    title: "What comes next when skip counting",
    competency: PAT,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s, k, d]) => {
      if (k < 0 || k > 3 || (d !== 0 && d !== 1)) return "Steps of 2, 3, 5 or 10, forwards or backwards.";
      const t = seq(s, STEPS[k], d, 5);
      return t.some((x) => x < 0 || x > (k === 3 ? 200 : 100)) ? "Numbers up to 100 (up to 200 when counting in tens)." : null;
    },
    prompt: ([s, k, d]) => `What number comes next? ${seq(s, STEPS[k], d, 4).join(", ")}, ?`,
    solve: ([s, k, d]) => {
      const t = seq(s, STEPS[k], d, 5);
      return {
        steps: [
          { id: "rule", op: "difference", competency: PAT, inputs: [t[0], t[1]], value: t[1] - t[0] },
          { id: "next", op: d ? "subtract" : "add", competency: ADD, inputs: [t[3], STEPS[k]], value: t[4] },
        ],
        answer: t[4],
      };
    },
    // independent: the gap from the last number to the answer must equal every gap in the given sequence
    validate: ([s, k, d], v) => {
      const t = seq(s, STEPS[k], d, 4);
      const g = (v as number) - t[3];
      return t.slice(1).every((x, i) => x - t[i] === g);
    },
    bugs: ([s, k, d]) => {
      const t = seq(s, STEPS[k], d, 5);
      const dir = d ? -1 : 1;
      return [
        { id: "by-ones", kind: "conceptual", competency: PAT, says: `The count went on by ones. The numbers ${d ? "go down" : "go up"} by ${STEPS[k]} each time, so the next one must too.`, predict: t[3] + dir },
        { id: "skipped-one", kind: "procedural", competency: PAT, says: `One number was skipped: two jumps of ${STEPS[k]} were made instead of one.`, predict: pos(t[3] + 2 * dir * STEPS[k]) },
        ...(k !== 3 ? [{ id: "tens-habit", kind: "procedural", competency: PAT, says: `The jump was taken as 10. Check the gap between two numbers next to each other: it is ${STEPS[k]}.`, predict: pos(t[3] + 10 * dir) } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `From ${s.inputs[0]} to ${s.inputs[1]} is a jump of ${Math.abs(Number(s.value))}${Number(s.value) < 0 ? " back" : ""}.` : `Make the same jump from ${s.inputs[0]}: the next number is ${s.value}.`),
    figure: ([s, k, d]) => {
      const t = seq(s, STEPS[k], d, 5);
      return { type: "numberline", from: Math.min(t[0], t[4]), to: Math.max(t[0], t[4]), step: STEPS[k], jumps: [[t[0], t[1]], [t[1], t[2]], [t[2], t[3]]], unknown: t[4] };
    },
    domain: [[0, 200], [0, 3], [0, 1]],
    cap: 400,
    difficulty: ([s, k, d]) => (k === 3 || k === 2 ? (d ? 2 : 1) : k === 0 ? (d ? 2 : 1) : d ? 3 : 2),
    word: ([s, k, d]) => {
      const t = seq(s, STEPS[k], d, 4);
      return d
        ? `${name(s)} counts down the steps of a temple, saying every ${STEPS[k] === 2 ? "second" : STEPS[k] === 3 ? "third" : STEPS[k] === 5 ? "fifth" : "tenth"} number: ${t.join(", ")}. What number does ${name(s)} say next?`
        : `${name(s)} puts beads on a string and counts them in ${STEPS[k]}s: ${t.join(", ")}. What number comes next?`;
    },
    teach: {
      idea: "In a skip-counting pattern the jump between neighbouring numbers is always the same.",
      method: "Find the jump from one number to the next. Make that same jump from the last number.",
      visual: ([s, k, d]) => {
        const t = seq(s, STEPS[k], d, 5);
        return { type: "numberline", from: Math.min(t[0], t[4]), to: Math.max(t[0], t[4]), step: STEPS[k], jumps: [[t[0], t[1]], [t[1], t[2]], [t[2], t[3]], [t[3], t[4]]] };
      },
      alternatives: [
        { id: "hundred_chart", title: "Use a hundred chart", kind: "conceptual", text: ["On a hundred chart, counting in tens moves straight down a column: only the tens digit changes.", "Counting in 2s or 5s makes a pattern of coloured squares; follow the pattern to the next square."], visual: () => ({ type: "grid", rows: 10, cols: 10, shaded: 0 }) },
      ],
    },
    limits: "Steps of 2, 3, 5 and 10, forwards and backwards, up to 100 (200 in tens); growing patterns are other families.",
  },
  {
    id: "abmiss",
    arity: 4,
    title: "The missing number in a counting pattern",
    competency: PAT,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s, k, d, p]) => {
      if (k < 0 || k > 3 || (d !== 0 && d !== 1) || p < 1 || p > 3) return "Steps of 1, 2, 5 or 10, one gap in the middle.";
      const t = seq(s, MSTEPS[k], d, 5);
      return t.some((x) => x < 0 || x > (k === 3 ? 200 : 100)) ? "Numbers up to 100 (up to 200 when counting in tens)." : null;
    },
    prompt: ([s, k, d, p]) => `Which number is missing? ${seq(s, MSTEPS[k], d, 5).map((x, i) => (i === p ? "?" : x)).join(", ")}`,
    solve: ([s, k, d, p]) => {
      const t = seq(s, MSTEPS[k], d, 5);
      return {
        steps: [
          { id: "rule", op: "difference", competency: PAT, inputs: [t[p === 1 ? 2 : 0], t[p === 1 ? 3 : 1]], value: t[1] - t[0] },
          { id: "fill", op: d ? "subtract" : "add", competency: ADD, inputs: [t[p - 1], MSTEPS[k]], value: t[p] },
        ],
        answer: t[p],
      };
    },
    // independent: put the answer in the gap and check that every jump in the whole row is the same
    validate: ([s, k, d, p], v) => {
      const t = seq(s, MSTEPS[k], d, 5);
      t[p] = v as number;
      const g = t[1] - t[0];
      return g !== 0 && t.slice(1).every((x, i) => x - t[i] === g);
    },
    bugs: ([s, k, d, p]) => {
      const t = seq(s, MSTEPS[k], d, 5);
      const dir = d ? -1 : 1;
      return [
        { id: "by-ones", kind: "conceptual", competency: PAT, says: `The number one ${d ? "less" : "more"} than ${t[p - 1]} was written. The pattern jumps by ${MSTEPS[k]}.`, predict: t[p - 1] + dir },
        { id: "before-after", kind: "conceptual", competency: PAT, says: `The pattern was read the wrong way: the numbers ${d ? "go down" : "go up"}, so the missing one is ${d ? "less" : "more"} than ${t[p - 1]}.`, predict: pos(t[p - 1] - dir * MSTEPS[k]) },
        ...(k === 3 ? [{ id: "ones-for-tens", kind: "conceptual", competency: PV, says: "The ones digit was changed. Counting in tens changes the tens digit and keeps the ones digit.", predict: pos(t[p - 1] + 2 * dir) } as Bug] : []),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `Each jump is ${Math.abs(Number(s.value))} (${Number(s.value) < 0 ? "going down" : "going up"}).` : `One jump from ${s.inputs[0]} gives ${s.value}.`),
    figure: ([s, k, d, p]) => {
      const t = seq(s, MSTEPS[k], d, 5);
      return { type: "numberline", from: Math.min(t[0], t[4]), to: Math.max(t[0], t[4]), step: MSTEPS[k], marks: t.filter((_, i) => i !== p), unknown: t[p] };
    },
    domain: [[0, 200], [0, 3], [0, 1], [1, 3]],
    cap: 400,
    difficulty: ([, k, d]) => (k === 0 ? 1 : k === 3 && !d ? 1 : d ? 3 : 2),
    word: ([s, k, d, p]) => `The houses on ${name(s + p)}'s street are numbered ${seq(s, MSTEPS[k], d, 5).map((x, i) => (i === p ? "?" : x)).join(", ")}. One number plate has fallen off. What number was on it?`,
    teach: {
      idea: "The numbers before and after the gap follow the same rule, so the gap is one jump from the number before it.",
      method: "Find the jump between two numbers next to each other. Make that jump from the number just before the gap; check it lands one jump before the number after.",
      alternatives: [
        { id: "between", title: "Halfway between", kind: "conceptual", text: ["The missing number sits between its two neighbours.", "It is the same jump up from the left neighbour as down from the right neighbour."], visual: ([s, k, d, p]) => {
          const t = seq(s, MSTEPS[k], d, 5);
          return { type: "numberline", from: Math.min(t[p - 1], t[p + 1]), to: Math.max(t[p - 1], t[p + 1]), step: MSTEPS[k], jumps: [[t[p - 1], t[p]], [t[p], t[p + 1]]] };
        } },
      ],
    },
    limits: "Five numbers counting in 1s, 2s, 5s or 10s with one gap in the middle; numbers up to 100 (200 in tens).",
  },
  // ================================================================ straight and curved lines
  {
    id: "abline",
    arity: 2,
    title: "Letters made of straight or curved lines",
    competency: LINES,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([w, q]) => (w < 0 || w >= WORDS.length || (q !== 0 && q !== 1) ? "A word from the list; count straight-only letters or letters with a curve." : null),
    prompt: ([w, q]) => `Look at the word ${WORDS[w]} in the picture. Count every letter you see. How many letters ${q ? "have a curved line in them" : "are made only of straight lines"}?`,
    solve: ([w, q]) => {
      const st = [...WORDS[w]].filter((c) => STRAIGHT.includes(c)).length;
      const ans = q ? WORDS[w].length - st : st;
      return { steps: [{ id: "check", op: "classify", competency: LINES, inputs: [WORDS[w], q ? "curved" : "straight"], value: ans }], answer: ans };
    },
    // independent: a table of curved strokes per letter; a letter is straight-only when it has no curved stroke
    validate: ([w, q], v) => {
      let c = 0;
      for (const ch of WORDS[w]) if (((CURVES[ch] ?? 0) === 0) !== (q === 1)) c++;
      return v === c;
    },
    bugs: ([w, q]) => {
      const word = WORDS[w];
      const st = [...word].filter((c) => STRAIGHT.includes(c)).length;
      const mixed = [...word].filter((c) => MIXED.includes(c)).length;
      const ans = q ? word.length - st : st;
      const d = distinct(word);
      const dst = [...d].filter((c) => STRAIGHT.includes(c)).length;
      return [
        { id: "mixed-as-straight", kind: "conceptual", competency: LINES, says: "Letters like B, D, P, R and U have straight lines AND a curve. A letter with any curve is not 'only straight'.", predict: mixed ? (q ? ans - mixed : ans + mixed) : null },
        { id: "other-kind", kind: "procedural", competency: LINES, says: `The other kind of letter was counted. The question asks for letters ${q ? "with a curve" : "with only straight lines"}.`, predict: word.length - ans },
        { id: "repeats-once", kind: "procedural", competency: COUNT, says: "A letter that appears twice was counted only once. Count every letter you see.", predict: d.length < word.length ? (q ? d.length - dst : dst) : null },
      ];
    },
    variants: () => [],
    explain: (s) => `Check each letter of ${s.inputs[0]} for curves: ${s.value} ${s.inputs[1] === "curved" ? "have a curved line" : "are made only of straight lines"}.`,
    figure: ([w]) => letterFigure(WORDS[w]),
    domain: [[0, WORDS.length - 1], [0, 1]],
    keep: ([w, q]) => {
      const st = [...WORDS[w]].filter((c) => STRAIGHT.includes(c)).length;
      return (q ? WORDS[w].length - st : st) > 0;
    },
    difficulty: ([w]) => (WORDS[w].length <= 3 ? 1 : WORDS[w].length <= 4 ? 2 : 3),
    word: ([w, q]) => `${name(w)} is making a name board for the class door with the word ${WORDS[w]}, using sticks for straight lines and bent wire for curves. How many letters ${q ? "need bent wire" : "can be made with sticks only"}?`,
    teach: {
      idea: "A straight line goes the same way all along; a curved line bends. Some letters use only straight lines, some have a curve.",
      method: "Trace each letter with your finger. If your finger ever goes round a bend, the letter has a curved line.",
      alternatives: [
        { id: "ruler_test", title: "The ruler test", kind: "conceptual", text: ["Lay a ruler along each part of the letter.", "If every part fits along the ruler, the letter has only straight lines; if a part does not fit, it is curved."], visual: () => ({ type: "shape", sides: 3, name: "triangle (only straight lines)" }) },
      ],
    },
    limits: "Capital letters in short words; drawing lines in given directions is marked by a teacher, not here.",
  },
  // ================================================================ maps and directions
  {
    id: "abgrid",
    arity: 4,
    title: "The shortest path along a grid",
    competency: MAPS,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c, d]) => ([a, b, c, d].some((x) => x < 0 || x > 5) || a === c || b === d ? "Two points on a 6 by 6 grid, not in the same row or column." : null),
    prompt: () => "On the grid, S is the start and E is the end. You may move only along the grid lines: left, right, up or down. How many squares long is the shortest way from S to E?",
    solve: ([a, b, c, d]) => ({
      steps: [
        { id: "across", op: "count", competency: MAPS, inputs: [a, c], value: Math.abs(c - a) },
        { id: "up", op: "count", competency: MAPS, inputs: [b, d], value: Math.abs(d - b) },
        { id: "total", op: "add", competency: ADD, inputs: [Math.abs(c - a), Math.abs(d - b)], value: Math.abs(c - a) + Math.abs(d - b) },
      ],
      answer: Math.abs(c - a) + Math.abs(d - b),
    }),
    // independent: a breadth-first search over the grid, one step at a time
    validate: ([a, b, c, d], v) => {
      const dist = new Map<string, number>([[`${a},${b}`, 0]]);
      const queue: [number, number][] = [[a, b]];
      while (queue.length) {
        const [x, y] = queue.shift()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const [nx, ny] = [x + dx, y + dy];
          if (nx < 0 || ny < 0 || nx > 6 || ny > 6 || dist.has(`${nx},${ny}`)) continue;
          dist.set(`${nx},${ny}`, dist.get(`${x},${y}`)! + 1);
          queue.push([nx, ny]);
        }
      }
      return dist.get(`${c},${d}`) === v;
    },
    bugs: ([a, b, c, d]) => {
      const [h, w] = [Math.abs(c - a), Math.abs(d - b)];
      return [
        { id: "one-direction", kind: "procedural", competency: MAPS, says: "Only the moves in one direction were counted. Count the moves across AND the moves up or down.", predict: [h, w] },
        { id: "diagonal", kind: "conceptual", competency: MAPS, says: "The path cut across a square diagonally. Moves must follow the grid lines.", predict: Math.max(h, w) },
        { id: "counted-points", kind: "procedural", competency: COUNT, says: "The points on the path were counted, including the start. Count the moves (the squares' sides) instead.", predict: h + w + 1 },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "across" ? `Across: ${s.value} squares.` : s.id === "up" ? `Up or down: ${s.value} squares.` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} squares.`),
    figure: ([a, b, c, d]) => ({ type: "plane", points: [[a, b, "S"], [c, d, "E"]], range: 6 }),
    domain: [[0, 5], [0, 5], [0, 5], [0, 5]],
    cap: 300,
    difficulty: ([a, b, c, d]) => (Math.abs(c - a) + Math.abs(d - b) <= 3 ? 1 : Math.abs(c - a) + Math.abs(d - b) <= 6 ? 2 : 3),
    word: () => "A park is laid out in square blocks, as on the grid. Imran walks along the paths from the gate S to the swings E, never cutting across the grass. What is the fewest number of blocks he can walk?",
    teach: {
      idea: "On a grid you can only move across or up and down, so the shortest way is the number of moves across plus the number of moves up or down.",
      method: "Count how many squares across S is from E, then how many up or down. Add the two numbers.",
      alternatives: [
        { id: "walk_it", title: "Walk it with a finger", kind: "procedural", text: ["Put your finger on S. Move across one square at a time until you are in E's column, counting each move.", "Then move up or down to E, still counting. The last number is the length of the path."] },
      ],
    },
    limits: "Two points on a small grid; routes on a real map and compass directions are not marked here.",
  },
  {
    id: "abmove",
    arity: 4,
    title: "Where you end after moves on a grid",
    competency: MAPS,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([x, y, dx, dy]) => (x < 0 || y < 0 || x > 5 || y > 5 || dx === 0 || dy === 0 || Math.abs(dx) > 3 || Math.abs(dy) > 3 || x + dx < 0 || x + dx > 5 || y + dy < 0 || y + dy > 5 ? "A start on a 6 by 6 grid and up to 3 moves across and 3 up or down, staying on the grid." : null),
    prompt: ([x, y, dx, dy]) => `Anu starts at the point A, which is at (${x}, ${y}) on the grid. She moves ${Math.abs(dx)} ${plural(Math.abs(dx), "square", "squares")} to the ${dx > 0 ? "right" : "left"}, then ${Math.abs(dy)} ${plural(Math.abs(dy), "square", "squares")} ${dy > 0 ? "up" : "down"}. Where does she end? Write it as (across, up), for example (2, 3).`,
    solve: ([x, y, dx, dy]) => ({
      steps: [
        { id: "across", op: dx > 0 ? "add" : "subtract", competency: MAPS, inputs: [x, Math.abs(dx)], value: x + dx },
        { id: "up", op: dy > 0 ? "add" : "subtract", competency: MAPS, inputs: [y, Math.abs(dy)], value: y + dy },
      ],
      answer: tup(x + dx, y + dy),
    }),
    // independent: walk one square at a time and read off the final point
    validate: ([x, y, dx, dy], v) => {
      const r = readTup(v);
      if (!r) return false;
      let [px, py] = [x, y];
      for (let i = 0; i < Math.abs(dx); i++) px += Math.sign(dx);
      for (let i = 0; i < Math.abs(dy); i++) py += Math.sign(dy);
      return r[0] === px && r[1] === py;
    },
    bugs: ([x, y, dx, dy]) => {
      const [ex, ey] = [x + dx, y + dy];
      const out: Bug[] = [
        { id: "swapped", kind: "conceptual", competency: MAPS, says: "The two numbers were written the wrong way round. The first number is how far across, the second is how far up.", predict: ex === ey ? null : tup(ey, ex) },
      ];
      if (dx < 0 && x - dx <= 9) out.push({ id: "left-as-right", kind: "procedural", competency: MAPS, says: "Moving left was counted as moving right. Moving left makes the across number smaller.", predict: tup(x - dx, ey) });
      if (dy < 0 && y - dy <= 9) out.push({ id: "down-as-up", kind: "procedural", competency: MAPS, says: "Moving down was counted as moving up. Moving down makes the up number smaller.", predict: tup(ex, y - dy) });
      out.push({ id: "one-move-only", kind: "procedural", competency: MAPS, says: "Only the first move was made. Make the second move too.", predict: tup(ex, y) });
      return out;
    },
    distractors: ([x, y, dx, dy]) => [tup(x + dx, y), tup(x, y + dy), tup(x - dx >= 0 ? x - dx : x + dx + 1, y - dy >= 0 ? y - dy : y + dy + 1)],
    variants: () => [],
    explain: (s) => (s.id === "across" ? `Across: ${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}.` : `Up: ${s.inputs[0]} ${s.op === "add" ? "+" : "−"} ${s.inputs[1]} = ${s.value}.`),
    figure: ([x, y]) => ({ type: "plane", points: [[x, y, "A"]], range: 6 }),
    domain: [[0, 5], [0, 5], [-3, 3], [-3, 3]],
    cap: 300,
    difficulty: ([, , dx, dy]) => (dx > 0 && dy > 0 ? 1 : dx > 0 || dy > 0 ? 2 : 3),
    word: ([x, y, dx, dy]) => `In a garden laid out in squares, a tap is at (${x}, ${y}). Ravi walks ${Math.abs(dx)} ${plural(Math.abs(dx), "square", "squares")} ${dx > 0 ? "right" : "left"} and then ${Math.abs(dy)} ${plural(Math.abs(dy), "square", "squares")} ${dy > 0 ? "up" : "down"} to plant a seed. Where is the seed? Write (across, up).`,
    teach: {
      idea: "A point on the grid is named by how far across it is and how far up it is. Moving right or up adds; moving left or down takes away.",
      method: "Change the across number for the left or right move, then change the up number for the up or down move.",
      alternatives: [
        { id: "trace", title: "Trace the path", kind: "procedural", text: ["Put a finger on A and move one square at a time, saying each move.", "When you stop, read the number below your finger, then the number beside it."], visual: ([x, y, dx, dy]) => ({ type: "plane", points: [[x, y, "A"], [x + dx, y + dy, "?"]], segments: [[[x, y], [x + dx, y]], [[x + dx, y], [x + dx, y + dy]]], range: 6 }) },
      ],
    },
    limits: "Moves across then up or down on a 6 by 6 grid; compass directions and turns are not marked here.",
  },
  // ================================================================ shape properties
  {
    id: "abside",
    arity: 5,
    title: "Counting sides and corners of flat shapes",
    competency: SHAPE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([s1, k1, s2, k2, q]) => (s1 < 3 || s1 > 6 || k1 < 1 || k1 > 3 || ![0, 3, 4, 5, 6].includes(s2) || k2 < 0 || k2 > 3 || (q !== 0 && q !== 1) || (k2 > 0 && s2 === s1) ? "Triangles, squares, pentagons and hexagons (and circles), up to 3 of each of two kinds." : null),
    prompt: ([s1, k1, s2, k2, q]) => {
      const what = q ? "corners" : "sides";
      if (k1 === 1 && k2 === 0) return `How many ${what} does the ${SHAPES[s1][0]} in the picture have?`;
      return `There are ${k2 ? `${shapeName(s1, k1)} and ${shapeName(s2, k2)}` : shapeName(s1, k1)}, as in the table. How many ${what} do they have in all?`;
    },
    solve: ([s1, k1, s2, k2, q]) => {
      const ans = s1 * k1 + s2 * k2;
      return {
        steps: [
          { id: "each", op: "count", competency: SHAPE, inputs: [SHAPES[s1][0], q ? "corners" : "sides"], value: s1 },
          ...(k2 ? [{ id: "each2", op: "count", competency: SHAPE, inputs: [SHAPES[s2][0], q ? "corners" : "sides"], value: s2 }] : []),
          ...(k1 > 1 || k2 ? [{ id: "total", op: "add", competency: ADD, inputs: [s1, k1, s2, k2], value: ans }] : []),
        ],
        answer: ans,
      };
    },
    // independent: look each shape's name up in a table of corners, and count one corner at a time for every shape
    validate: ([s1, k1, s2, k2], v) => {
      let c = 0;
      for (const [nm, k] of [[SHAPES[s1][0], k1], [SHAPES[s2][0], k2]] as [string, number][]) for (let i = 0; i < k; i++) for (let j = 0; j < CORNERS_BY_NAME[nm]; j++) c++;
      return v === c;
    },
    bugs: ([s1, k1, s2, k2, q]) => {
      const ans = s1 * k1 + s2 * k2;
      return [
        { id: "one-of-each", kind: "procedural", competency: GROUPS, says: "Each kind of shape was counted only once. Every shape in the group has its own sides and corners.", predict: k1 > 1 || k2 > 1 ? s1 + (k2 ? s2 : 0) : null },
        { id: "circle-corner", kind: "conceptual", competency: SHAPE, says: `A circle was given ${q ? "a corner" : "a side"}. A circle has one curved line all round and no ${q ? "corners" : "straight sides"}.`, predict: s2 === 0 && k2 > 0 ? ans + k2 : null },
        { id: "counted-shapes", kind: "conceptual", competency: SHAPE, says: `The shapes were counted, not their ${q ? "corners" : "sides"}.`, predict: k1 + k2 > 1 ? k1 + k2 : null },
        { id: "missed-one", kind: "procedural", competency: COUNT, says: `One ${q ? "corner" : "side"} was missed. Put a finger on one and go round, counting each once.`, predict: ans - 1 },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "each" || s.id === "each2" ? `A ${s.inputs[0]} has ${s.value} ${s.inputs[1]}.` : `${s.inputs[1]} × ${s.inputs[0]}${Number(s.inputs[3]) ? ` and ${s.inputs[3]} × ${s.inputs[2]}` : ""}: ${s.value} in all.`),
    figure: ([s1, k1, s2, k2]) => (k1 === 1 && k2 === 0 ? { type: "shape", sides: s1, name: SHAPES[s1][0] } : { type: "table", head: ["Shape", "How many"], rows: [[SHAPES[s1][1], k1], ...(k2 ? [[SHAPES[s2][1], k2]] : [])] }),
    domain: [[3, 6], [1, 3], [0, 6], [0, 3], [0, 1]],
    keep: ([s1, k1, s2, k2]) => (k2 === 0 ? s2 === 3 : s2 !== s1 && s2 !== 1 && s2 !== 2) && s1 * k1 + s2 * k2 <= 24,
    cap: 300,
    difficulty: ([s1, k1, , k2]) => (k1 === 1 && k2 === 0 ? (s1 <= 4 ? 1 : 2) : k2 === 0 ? 2 : 3),
    word: ([s1, k1, s2, k2, q]) => `${name(s1 + k1)} makes ${k2 ? `${shapeName(s1, k1)} and ${shapeName(s2, k2)}` : shapeName(s1, k1)} from ${q ? "clay balls joined by sticks, one ball at each corner" : "ice-cream sticks, one stick for each side"}. How many ${q ? "clay balls" : "sticks"} are needed${s2 === 0 && k2 ? " (a circle is made from a bangle)" : ""}?`,
    teach: {
      idea: "A side is a straight edge of a flat shape; a corner is where two sides meet. A shape with straight sides has as many corners as sides; a circle has none.",
      method: "Put a finger on one corner and go round the shape, counting each side (or corner) once. For several shapes, add the counts for every shape.",
      visual: ([s1]) => ({ type: "shape", sides: s1, name: SHAPES[s1][0] }),
      alternatives: [
        { id: "skip_count", title: "Skip count for many shapes", kind: "procedural", text: ["Three triangles have 3 sides each: count 3, 6, 9.", "Add the counts for each kind of shape."], visual: ([s1, k1]) => ({ type: "array", rows: k1, cols: s1 }) },
      ],
    },
    limits: "Triangles, squares, pentagons, hexagons and circles, up to 3 of each of two kinds; diagonals and rectangles are not drawn here.",
  },
  {
    id: "abroll",
    arity: 2,
    title: "Things that roll and things that slide",
    competency: SHAPE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([m, q]) => (m < 1 || m > 1023 || q < 0 || q > 2 ? "A choice of the ten things; roll, slide, or both." : null),
    prompt: ([, q]) => `Look at the things in the table. How many of them can ${q === 0 ? "roll" : q === 1 ? "slide when pushed (resting flat on the floor)" : "both roll and slide"}?`,
    solve: ([m, q]) => {
      const t = chosen(m);
      const rolls = t.filter(([, s]) => s === "sphere" || s === "cylinder").length;
      const slides = t.filter(([, s]) => s !== "sphere").length;
      const both = t.filter(([, s]) => s === "cylinder").length;
      const ans = q === 0 ? rolls : q === 1 ? slides : both;
      return { steps: [{ id: "sort", op: "classify", competency: SHAPE, inputs: [q === 0 ? "roll" : q === 1 ? "slide" : "both"], value: ans }], answer: ans };
    },
    // independent: from each shape's surfaces: a curved surface lets it roll, a flat face lets it slide
    validate: ([m, q], v) => {
      const surf: Record<string, [number, number]> = { sphere: [1, 0], cuboid: [0, 6], cube: [0, 6], cylinder: [1, 2] };
      let c = 0;
      for (let i = 0; i < THINGS.length; i++) {
        if (!((m >> i) & 1)) continue;
        const [curved, flat] = surf[THINGS[i][1]];
        if (q === 0 ? curved > 0 : q === 1 ? flat > 0 : curved > 0 && flat > 0) c++;
      }
      return v === c;
    },
    bugs: ([m, q]) => {
      const t = chosen(m);
      const sph = t.filter(([, s]) => s === "sphere").length;
      const flat = t.filter(([, s]) => s === "cuboid" || s === "cube").length;
      const cyl = t.filter(([, s]) => s === "cylinder").length;
      if (q === 0) return [
        { id: "round-only", kind: "conceptual", competency: SHAPE, says: "Only the things that are round all over were counted. A tin or a pipe also rolls on its curved side.", predict: cyl ? sph : null },
        { id: "counted-sliders", kind: "procedural", competency: SHAPE, says: "The things that slide were counted. Things with a curved surface roll.", predict: flat + cyl },
      ];
      if (q === 1) return [
        { id: "flat-only", kind: "conceptual", competency: SHAPE, says: "Things with a curved side were left out. A tin standing on its flat end slides too.", predict: cyl ? flat : null },
        { id: "counted-rollers", kind: "procedural", competency: SHAPE, says: "The things that roll were counted. Things with a flat face slide.", predict: sph + cyl },
      ];
      return [
        { id: "roll-for-both", kind: "conceptual", competency: SHAPE, says: "Everything that rolls was counted. A ball cannot slide: it has no flat face. Only things with a flat face AND a curved side do both.", predict: sph ? sph + cyl : null },
        { id: "or-for-and", kind: "conceptual", competency: SORT, says: "Things that roll OR slide were counted. 'Both' means a thing must do the two.", predict: sph + flat + cyl },
      ];
    },
    variants: () => [],
    explain: (s) => `Check each thing's surfaces: ${s.value} can ${s.inputs[0] === "both" ? "both roll and slide" : s.inputs[0]}.`,
    figure: ([m]) => ({ type: "table", head: ["Thing", "Its shape"], rows: chosen(m).map(([n, s]) => [n, LOOK[s]]) }),
    domain: [[1, 1023], [0, 2]],
    keep: ([m, q]) => {
      const c = popcount(m);
      if (c < 4 || c > 6) return false;
      const t = chosen(m);
      const kinds = new Set(t.map(([, s]) => (s === "cube" ? "cuboid" : s)));
      return kinds.size === 3;
    },
    cap: 300,
    difficulty: ([, q]) => (q === 0 ? 1 : q === 1 ? 2 : 3),
    word: ([, q]) => `${name(q + 3)} tips a box of things from the table onto a sloping plank. ${q === 0 ? "How many of them can roll down?" : q === 1 ? "If each one is laid on a flat face (or end), how many can slide down?" : "How many of them can roll down one way and slide down another way?"}`,
    teach: {
      idea: "A curved surface lets a thing roll; a flat face lets it slide. A thing with both, like a tin, can do both.",
      method: "For each thing, ask: does it have a curved surface? Does it have a flat face? Then count the ones that fit the question.",
      visual: () => ({ type: "solid", name: "cylinder", dims: ["flat ends slide, curved side rolls"] }),
      alternatives: [
        { id: "try_it", title: "Try it on a slope", kind: "conceptual", text: ["Put a ball, a box and a tin on a tilted book.", "The ball rolls, the box slides, and the tin rolls on its side or slides on its end."], visual: () => ({ type: "solid", name: "sphere", dims: ["round all over: rolls"] }) },
      ],
    },
    limits: "Spheres, cubes, cuboids and cylinders only; cones are left out because they roll only in a circle.",
  },
  {
    id: "absolid",
    arity: 4,
    title: "Faces, edges and corners of solids",
    competency: SHAPE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b, c, q]) => ([a, b, c].some((n) => n < 0 || n > 3) || a + b + c < 1 || a + b + c > 4 || q < 0 || q > 2 ? "Up to 4 cubes, cuboids and square pyramids; faces, edges or corners." : null),
    prompt: ([a, b, c, q]) => {
      const ks = [a, b, c];
      if (a + b + c === 1) return `How many ${FEC_WORD[q]} does the ${SOLIDS[ks.findIndex((n) => n)]} in the picture have?`;
      return `Kavya has ${listAnd(ks.map((n, i) => (n ? `${n} ${n === 1 ? SOLIDS[i] : SOLIDS_PL[i]}` : "")).filter(Boolean))}. How many ${FEC_WORD[q]} do they have in all?`;
    },
    solve: ([a, b, c, q]) => {
      const ks = [a, b, c];
      const ans = sum(ks.map((n, i) => n * SOLID_FEC[i][q]));
      return {
        steps: [
          ...ks.flatMap((n, i) => (n ? [{ id: `each${i}`, op: "count", competency: SHAPE, inputs: [SOLIDS[i], FEC_WORD[q]], value: SOLID_FEC[i][q] }] : [])),
          ...(a + b + c > 1 ? [{ id: "total", op: "add", competency: ADD, inputs: ks, value: ans }] : []),
        ],
        answer: ans,
      };
    },
    // independent: from corners (V) and how the edges join: a box has 3 edges at each corner (E = 3V/2), a pyramid
    // has its base edges plus one slant edge per base corner; faces from Euler's rule F = E − V + 2
    validate: ([a, b, c, q], v) => {
      const fec = (kind: number) => {
        const V = kind < 2 ? 8 : 5;
        const E = kind < 2 ? (3 * V) / 2 : 4 + 4;
        return [E - V + 2, E, V][q];
      };
      return v === a * fec(0) + b * fec(1) + c * fec(2);
    },
    bugs: ([a, b, c, q]) => {
      const ks = [a, b, c];
      const ans = sum(ks.map((n, i) => n * SOLID_FEC[i][q]));
      return [
        { id: "only-visible", kind: "conceptual", competency: SHAPE, says: `Only the ${FEC_WORD[q]} you can see in a drawing were counted. A box also has ${FEC_WORD[q]} at the back and underneath.`, predict: a + b ? (a + b) * VISIBLE[q] + c * SOLID_FEC[2][q] : null },
        { id: "one-of-each", kind: "procedural", competency: GROUPS, says: "Each kind of solid was counted once. Every solid has its own faces, edges and corners.", predict: ks.some((n) => n > 1) ? sum(ks.map((n, i) => (n ? SOLID_FEC[i][q] : 0))) : null },
        { id: "pyramid-as-box", kind: "conceptual", competency: SHAPE, says: `The pyramid was counted like a box. A square pyramid has ${SOLID_FEC[2][0]} faces, ${SOLID_FEC[2][1]} edges and ${SOLID_FEC[2][2]} corners.`, predict: c ? ans + c * (SOLID_FEC[0][q] - SOLID_FEC[2][q]) : null },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Add for every solid: ${s.value} in all.` : `A ${s.inputs[0]} has ${s.value} ${s.inputs[1]}.`),
    figure: ([a, b, c]) => (a + b + c === 1 ? { type: "solid", name: a ? "cube" : b ? "cuboid" : "pyramid" } : { type: "table", head: ["Solid", "How many"], rows: [a, b, c].flatMap((n, i) => (n ? [[SOLIDS_PL[i], n]] : [])) }),
    domain: [[0, 3], [0, 3], [0, 3], [0, 2]],
    keep: ([a, b, c, q]) => sum([a, b, c].map((n, i) => n * SOLID_FEC[i][q])) <= 48,
    difficulty: ([a, b, c, q]) => (a + b + c === 1 ? (q === 0 ? 1 : 2) : a + b + c === 2 ? 2 : 3),
    word: ([a, b, c, q]) => `${name(a + b * 2 + c * 3 + q)} is painting wooden blocks: ${listAnd([a, b, c].map((n, i) => (n ? `${n} ${n === 1 ? SOLIDS[i] : SOLIDS_PL[i]}` : "")).filter(Boolean))}. ${q === 0 ? "Each flat face gets a different colour. How many flat faces are painted?" : q === 1 ? "A thin line of gold goes along every edge. How many edges get gold?" : "A small dot goes on every corner. How many dots are needed?"}`,
    teach: {
      idea: "A face is a flat surface, an edge is where two faces meet, and a corner is where edges meet. A cube and a cuboid have 6 faces, 12 edges and 8 corners; a square pyramid has 5, 8 and 5.",
      method: "Hold the solid (or picture it) and count the top, the bottom and all round, marking each one as you go. For several solids, add the counts for each one.",
      visual: () => ({ type: "solid", name: "cube", dims: ["6 faces, 12 edges, 8 corners"] }),
      alternatives: [
        { id: "layers", title: "Count in layers", kind: "procedural", text: ["For a box: 4 corners on top and 4 on the bottom make 8.", "Edges: 4 round the top, 4 round the bottom and 4 standing up make 12."], visual: () => ({ type: "solid", name: "cuboid", dims: ["top 4 + bottom 4 + standing 4 = 12 edges"] }) },
      ],
    },
    limits: "Cubes, cuboids and square pyramids, up to 4 solids; curved solids are counted for rolling and sliding instead.",
  },
  // ================================================================ folding symmetry
  {
    id: "absym",
    arity: 2,
    title: "Letters that fold onto themselves",
    competency: SYM,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([w, q]) => (w < 0 || w >= WORDS.length || (q !== 0 && q !== 1) || WORDS[w].includes("K") ? "A word from the list without K; count letters with or without a fold line." : null),
    prompt: ([w, q]) => `Look at the word ${WORDS[w]} in the picture. A letter is symmetrical if you can fold it so the two halves match exactly. Count every letter you see. How many letters are ${q ? "NOT symmetrical" : "symmetrical"}?`,
    solve: ([w, q]) => {
      const s = [...WORDS[w]].filter((c) => SYMM.includes(c)).length;
      const ans = q ? WORDS[w].length - s : s;
      return { steps: [{ id: "fold", op: "classify", competency: SYM, inputs: [WORDS[w], q ? "not" : "yes"], value: ans }], answer: ans };
    },
    // independent: try a standing fold (left onto right) and a lying fold (top onto bottom) separately
    validate: ([w, q], v) => {
      let c = 0;
      for (const ch of WORDS[w]) if ((VERT.includes(ch) || HORIZ.includes(ch)) !== (q === 1)) c++;
      return v === c;
    },
    bugs: ([w, q]) => {
      const word = WORDS[w];
      const s = [...word].filter((c) => SYMM.includes(c)).length;
      const ans = q ? word.length - s : s;
      const vert = [...word].filter((c) => VERT.includes(c)).length;
      const d = distinct(word);
      const ds = [...d].filter((c) => SYMM.includes(c)).length;
      return [
        { id: "standing-fold-only", kind: "conceptual", competency: SYM, says: "Only a standing fold (left onto right) was tried. Letters like B, C, D and E fold top onto bottom.", predict: q ? word.length - vert : vert },
        { id: "other-kind", kind: "procedural", competency: SYM, says: `The other kind of letter was counted. The question asks for letters that are ${q ? "NOT symmetrical" : "symmetrical"}.`, predict: word.length - ans },
        { id: "repeats-once", kind: "procedural", competency: COUNT, says: "A letter that appears twice was counted only once. Count every letter you see.", predict: d.length < word.length ? (q ? d.length - ds : ds) : null },
      ];
    },
    variants: () => [],
    explain: (s) => `Fold each letter of ${s.inputs[0]} in your mind: ${s.value} ${s.inputs[1] === "not" ? "do not match on any fold" : "have a fold where the halves match"}.`,
    figure: ([w]) => letterFigure(WORDS[w]),
    domain: [[0, WORDS.length - 1], [0, 1]],
    keep: ([w, q]) => {
      const s = [...WORDS[w]].filter((c) => SYMM.includes(c)).length;
      return !WORDS[w].includes("K") && (q ? WORDS[w].length - s : s) > 0;
    },
    difficulty: ([w]) => ([...WORDS[w]].some((c) => HORIZ.includes(c) && !VERT.includes(c)) ? 3 : WORDS[w].length <= 3 ? 1 : 2),
    word: ([w, q]) => `${name(w + 1)} cuts the letters of ${WORDS[w]} out of paper for a festival banner and tries to fold each one so the halves match. How many letters ${q ? "can NOT be folded that way" : "can be folded that way"}?`,
    teach: {
      idea: "A shape is symmetrical when a fold line splits it into two halves that match exactly when folded. The fold can stand up (left onto right) or lie down (top onto bottom).",
      method: "For each letter, imagine a standing fold through the middle; if the halves do not match, try a lying fold. If either works, the letter is symmetrical.",
      visual: () => ({ type: "shape", sides: 4, name: "square (it folds in half many ways)" }),
      alternatives: [
        { id: "mirror", title: "Use a mirror", kind: "conceptual", text: ["Stand a small mirror on the middle line of the letter.", "If the letter looks whole with its reflection, that line is a fold line."], visual: () => ({ type: "shape", sides: 3, name: "triangle with equal sides (3 fold lines)" }) },
      ],
    },
    limits: "Capital letters in short words (K is left out because fonts differ); drawing mirror images is marked by a teacher.",
  },
  // ================================================================ capacity
  {
    id: "abcup",
    arity: 5,
    title: "Comparing how many cups containers hold",
    competency: CAP,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => (p.slice(0, 3).some((n) => n < 2 || n > 12) || new Set(p.slice(0, 3)).size < 3 || p[3] < 0 || p[3] > 2 || p[4] < 0 || p[4] > 2 || (p[3] !== p[4] && p[p[3]] <= p[p[4]]) ? "Three containers holding 2 to 12 cups each; read one, or compare a bigger with a smaller." : null),
    prompt: (p) => (p[3] === p[4] ? `The chart shows how many cups of water fill each container, using the same small cup. How many cups does the ${CONTAINERS[p[3]].toLowerCase()} hold?` : `The chart shows how many cups of water fill each container, using the same small cup. How many more cups does the ${CONTAINERS[p[3]].toLowerCase()} hold than the ${CONTAINERS[p[4]].toLowerCase()}?`),
    solve: (p) => {
      const [a, b] = [p[p[3]], p[p[4]]];
      if (p[3] === p[4]) return { steps: [{ id: "read", op: "read", competency: CAP, inputs: [CONTAINERS[p[3]]], value: a }], answer: a };
      return {
        steps: [
          { id: "read2", op: "read", competency: CAP, inputs: [CONTAINERS[p[3]], CONTAINERS[p[4]]], value: [a, b] },
          { id: "compare", op: "subtract", competency: SUB, inputs: [a, b], value: a - b },
        ],
        answer: a - b,
      };
    },
    // independent: pour one cup at a time from the smaller amount until it matches the bigger
    validate: (p, v) => {
      if (p[3] === p[4]) {
        let c = 0;
        while (c < p[p[3]]) c++;
        return v === c;
      }
      let have = p[p[4]];
      let cups = 0;
      while (have < p[p[3]]) {
        have++;
        cups++;
      }
      return v === cups;
    },
    bugs: (p) => {
      const [a, b] = [p[p[3]], p[p[4]]];
      if (p[3] === p[4]) return [
        { id: "wrong-bar", kind: "procedural", competency: PIC, says: `A different bar was read. Find "${CONTAINERS[p[3]]}" under the chart first.`, predict: [p[p[3] - 1], p[p[3] + 1]].filter((x) => x !== undefined) as number[] },
        { id: "biggest", kind: "conceptual", competency: CAP, says: "The container that holds the most was read. Read the bar for the container asked about.", predict: Math.max(...p.slice(0, 3)) },
      ];
      return [
        { id: "added", kind: "conceptual", competency: CAP, says: "The two amounts were added. 'How many more' asks for the difference.", predict: a + b },
        { id: "gave-bigger", kind: "conceptual", competency: CAP, says: `The cups for the ${CONTAINERS[p[3]].toLowerCase()} were given. Take away the cups for the ${CONTAINERS[p[4]].toLowerCase()}.`, predict: a },
        { id: "gave-smaller", kind: "procedural", competency: CAP, says: "The smaller amount was given instead of the difference.", predict: b },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `The ${s.inputs[0]} bar reaches ${s.value} cups.` : s.id === "read2" ? `${s.inputs[0]}: ${(s.value as number[])[0]} cups; ${s.inputs[1]}: ${(s.value as number[])[1]} cups.` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} cups more.`),
    figure: (p) => ({ type: "bars", title: "cups of water to fill each container", labels: CONTAINERS, values: p.slice(0, 3), scale: 1 }),
    domain: [[2, 12], [2, 12], [2, 12], [0, 2], [0, 2]],
    keep: (p) => p[3] === p[4] || p[p[3]] - p[p[4]] !== p[p[4]],
    cap: 400,
    difficulty: (p) => (p[3] === p[4] ? 1 : p[p[3]] <= 10 ? 2 : 3),
    word: (p) => `${name(p[0])} fills a bucket, a pot and a jug at the well, using the same steel tumbler each time; the chart shows how many tumblers each took. ${p[3] === p[4] ? `How many tumblers of water fill the ${CONTAINERS[p[3]].toLowerCase()}?` : `How many more tumblers does the ${CONTAINERS[p[3]].toLowerCase()} take than the ${CONTAINERS[p[4]].toLowerCase()}?`}`,
    teach: {
      idea: "When every container is filled with the same cup, the one that takes more cups holds more water.",
      method: "Read the number of cups for each container. To find how many more, take the smaller number from the bigger one.",
      alternatives: [
        { id: "cups_line", title: "Line up the cups", kind: "conceptual", text: ["Picture the cups for each container standing in a row.", "Match the rows cup by cup; the cups with no partner are how many more."], visual: (p) => ({ type: "dots", count: p[p[3]], rows: 1 }) },
      ],
    },
    limits: "Three containers measured with the same cup, 2 to 12 cups each; different-sized cups are not compared here.",
  },
  {
    id: "abjug",
    arity: 3,
    title: "Reading millilitres on a measuring jug",
    competency: CAP,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([j, n, q]) => (j < 0 || j > 2 || n < 1 || n * JUGS[j]?.[2] >= JUGS[j]?.[0] || (q !== 0 && q !== 1) ? "A 500 mL, 1 litre or 2 litre jug, partly full." : null),
    prompt: ([j, n, q]) => {
      const [cap] = JUGS[j];
      return q === 0
        ? `The scale on a ${cap} mL measuring jug is shown as a line, and the dot shows the water level. How much water is in the jug, in mL?`
        : `The scale on a ${cap} mL measuring jug is shown as a line, and the dot shows the water level. How much more water, in mL, is needed to fill the jug to ${cap} mL${litres(cap)}?`;
    },
    solve: ([j, n, q]) => {
      const [cap, , vs] = JUGS[j];
      const v = n * vs;
      return {
        steps: [
          { id: "read", op: "read", competency: CAP, inputs: [cap], value: v },
          ...(q ? [{ id: "more", op: "subtract", competency: SUB, inputs: [cap, v], value: cap - v }] : []),
        ],
        answer: q ? cap - v : v,
      };
    },
    // independent: count up from the level in steps of 50 mL to the top (or from 0 up to the level)
    validate: ([j, n, q], v) => {
      const [cap, , vs] = JUGS[j];
      const level = n * vs;
      let c = 0;
      if (q) for (let x = level; x < cap; x += 50) c += 50;
      else for (let x = 0; x < level; x += 50) c += 50;
      return v === c;
    },
    bugs: ([j, n, q]) => {
      const [cap, ts, vs] = JUGS[j];
      const v = n * vs;
      if (q === 0) return [
        { id: "mark-below", kind: "procedural", competency: CAP, says: `The number on the mark just below the level was read. The level is halfway between two marks, so add half of ${ts} mL.`, predict: v % ts ? Math.floor(v / ts) * ts : null },
        { id: "steps-as-hundreds", kind: "conceptual", competency: CAP, says: `Each step of the scale was taken as 100 mL. Read the numbers on the scale: each step is ${ts} mL.`, predict: ts !== 100 && v % ts === 0 ? (v / ts) * 100 : null },
        { id: "counted-steps", kind: "procedural", competency: COUNT, says: "The steps of the scale were counted instead of reading the amount.", predict: v % ts === 0 ? v / ts : null },
      ];
      return [
        { id: "gave-level", kind: "conceptual", competency: CAP, says: "The water already in the jug was given. The question asks how much MORE is needed to reach the top.", predict: v },
        { id: "stopped-at-hundred", kind: "procedural", competency: SUB, says: `Counting up stopped at the next hundred. Keep counting on from there all the way to ${cap} mL and add the jumps.`, predict: v % 100 && Math.ceil(v / 100) * 100 < cap ? Math.ceil(v / 100) * 100 - v : null },
        { id: "top-as-litre", kind: "conceptual", competency: CAP, says: `The top was taken as 1000 mL. This jug holds ${cap} mL: read the number at the top of the scale.`, predict: cap === 2000 && v < 1000 ? 1000 - v : null },
      ];
    },
    distractors: ([j, n, q]) => {
      const [cap, ts, vs] = JUGS[j];
      const ans = q ? cap - n * vs : n * vs;
      return [ans + ts, ans - ts, ans + 50, ans - 50].filter((x) => x > 0 && x < cap);
    },
    variants: () => [],
    explain: (s) => (s.id === "read" ? `The level is at ${s.value} mL.` : `${s.inputs[0]} − ${s.inputs[1]} = ${s.value} mL more.`),
    figure: ([j, n]) => ({ type: "numberline", from: 0, to: JUGS[j][0], step: JUGS[j][1], marks: [n * JUGS[j][2]] }),
    domain: [[0, 2], [1, 19], [0, 1]],
    keep: ([j, n]) => n * JUGS[j][2] < JUGS[j][0],
    difficulty: ([j, n, q]) => ((n * JUGS[j][2]) % JUGS[j][1] === 0 ? (q ? 2 : 1) : q ? 3 : 2),
    word: ([j, n, q]) => {
      const [cap, , vs] = JUGS[j];
      return q === 0 ? `${name(n)}'s mother pours milk into a ${cap} mL measuring jug to make payasam. The dot on the scale shows the level. How many mL of milk are in the jug?` : `${name(n)} is filling a ${cap} mL bottle for school. The dot on the scale shows how much water is in it now. How many more mL will fill it to the top?`;
    },
    teach: {
      idea: "A measuring jug has a scale like a number line standing up; the water level points to how many millilitres are inside. 1 litre is 1000 mL.",
      method: "Read the numbers on the marks and find what one step is worth. Read the level; for 'how much more', count up from the level to the top.",
      alternatives: [
        { id: "count_up", title: "Count up to the top", kind: "procedural", text: ["Start at the water level and jump to the next hundred, then on to the top.", "Add the jumps: that is how much more water is needed."], visual: ([j, n]) => ({ type: "numberline", from: 0, to: JUGS[j][0], step: JUGS[j][1], marks: [n * JUGS[j][2]], jumps: [[n * JUGS[j][2], JUGS[j][0]]] }) },
      ],
    },
    limits: "Jugs of 500 mL, 1 litre and 2 litres with levels at marks or halfway between; changing litres to millilitres is a conversion family.",
  },
  // ================================================================ clock
  {
    id: "abclock",
    arity: 2,
    title: "Reading the time on a clock",
    competency: CLOCK,
    type: "tuple",
    mc: true,
    parse: none,
    reject: ([h, k]) => (h < 1 || h > 12 || k < 0 || k > 11 ? "Hours 1 to 12, minutes in fives." : null),
    prompt: () => "What time does the clock show? Write it as (hour, minutes): for example (4, 30) for half past 4, or (7, 0) for 7 o'clock.",
    solve: ([h, k]) => ({
      steps: [
        { id: "hour", op: "read", competency: CLOCK, inputs: ["short hand"], value: h },
        { id: "minutes", op: "read", competency: CLOCK, inputs: ["long hand", k], value: 5 * k },
      ],
      answer: tup(h, 5 * k),
    }),
    // independent: draw the hands the answer would give (angles) and compare with the hands on the clock
    validate: ([h, k], v) => {
      const r = readTup(v);
      if (!r || r[0] < 1 || r[0] > 12 || r[1] < 0 || r[1] > 59) return false;
      const ang = (H: number, M: number) => [((H % 12) * 30 + M * 0.5) % 360, (M * 6) % 360];
      const [a, b] = ang(h, 5 * k);
      const [c, d] = ang(r[0], r[1]);
      return Math.abs(a - c) < 1e-9 && Math.abs(b - d) < 1e-9;
    },
    bugs: ([h, k]) => {
      const m = 5 * k;
      return [
        { id: "hands-swapped", kind: "conceptual", competency: CLOCK, says: "The long and short hands were mixed up. The short hand shows the hour; the long hand shows the minutes.", predict: tup(k === 0 ? 12 : k, (h % 12) * 5) },
        { id: "number-as-minutes", kind: "conceptual", competency: CLOCK, says: `The number the long hand points to was read as the minutes. Each number on the clock is 5 minutes for the long hand: it points to ${k === 0 ? 12 : k}, so it is ${m} minutes.`, predict: k > 1 ? tup(h, k) : null },
        { id: "next-hour", kind: "procedural", competency: CLOCK, says: `The hour was read from the number the short hand is moving towards. After ${h} o'clock it stays ${h} until the short hand reaches the next number.`, predict: m >= 30 ? tup((h % 12) + 1, m) : null },
      ];
    },
    distractors: ([h, k]) => [tup(h, (5 * k + 30) % 60), tup((h % 12) + 1, 5 * k), tup(h === 1 ? 12 : h - 1, 5 * k)],
    variants: () => [],
    explain: (s) => (s.id === "hour" ? `The short hand shows the hour: ${s.value}.` : `The long hand points to ${Number(s.inputs[1]) === 0 ? 12 : s.inputs[1]}: ${s.value} minutes past.`),
    figure: ([h, k]) => ({ type: "clock", h, m: 5 * k }),
    domain: [[1, 12], [0, 11]],
    difficulty: ([, k]) => (k === 0 || k === 6 ? 1 : k === 3 || k === 9 ? 2 : 3),
    word: ([h, k]) => `${name(h + k)}'s school bus comes at the time shown on the clock. What time does the bus come? Write it as (hour, minutes).`,
    teach: {
      idea: "The short hand shows the hour; the long hand shows the minutes. When the long hand is at 12 it is o'clock; when it is at 6 it is half past.",
      method: "Read the hour from the short hand (the last number it has passed). Then count the long hand in fives from 12: 5, 10, 15 …",
      visual: ([h, k]) => ({ type: "clock", h, m: 5 * k }),
      alternatives: [
        { id: "count_fives", title: "Count the long hand in fives", kind: "procedural", text: ["Each number the long hand passes is 5 more minutes: 1 is 5, 2 is 10, 3 is 15, 6 is 30.", "Skip count in fives from 12 to where the long hand points."], visual: ([, k]) => ({ type: "numberline", from: 0, to: 60, step: 5, marks: [5 * k] }) },
      ],
    },
    limits: "Times to the nearest 5 minutes (hours and half hours are the easiest level); time after some minutes is an elapsed-time family.",
  },
  // ================================================================ money: change
  {
    id: "abchange",
    arity: 2,
    title: "Finding the change",
    competency: CHANGE,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([c, k]) => (k < 0 || k > 3 || c < 1 || c >= NOTES[k] || c < NOTES[k] / 10 ? "A price below the note or coin paid (₹10, ₹20, ₹50 or ₹100)." : null),
    prompt: ([c, k]) => `A toy costs ₹${c}. You pay with the ₹${NOTES[k]} ${NOTES[k] <= 20 ? "coin" : "note"} in the picture. How much change do you get, in rupees?`,
    solve: ([c, k]) => ({ steps: [{ id: "change", op: "subtract", competency: SUB, inputs: [NOTES[k], c], value: NOTES[k] - c }], answer: NOTES[k] - c }),
    // independent: count up from the price, one rupee at a time, to the amount paid
    validate: ([c, k], v) => {
      let n = 0;
      for (let x = c; x < NOTES[k]; x++) n++;
      return v === n;
    },
    bugs: ([c, k]) => {
      const p = NOTES[k];
      const up = Math.ceil(c / 10) * 10;
      return [
        { id: "no-exchange", kind: "procedural", competency: SUB, says: `The smaller digit was taken from the bigger in each column. ${p} − ${c} needs a ten changed into ones; or count up from ₹${c} to ₹${p}.`, predict: smallerFromLarger(p, c) },
        { id: "stopped-at-ten", kind: "procedural", competency: CHANGE, says: `Counting up stopped at the next ten (₹${up}). Keep counting on to ₹${p} and add both jumps.`, predict: c % 10 && up < p ? up - c : null },
        { id: "added", kind: "conceptual", competency: CHANGE, says: "The price and the money paid were added. Change is what is left after paying: take the price away.", predict: p + c },
      ];
    },
    variants: () => [],
    explain: (s) => `₹${s.inputs[0]} − ₹${s.inputs[1]} = ₹${s.value} change.`,
    figure: ([, k]) => ({ type: "coins", items: [NOTES[k]] }),
    domain: [[1, 99], [0, 3]],
    cap: 300,
    difficulty: ([c, k]) => (k <= 1 ? 1 : (NOTES[k] - c) % 10 === 0 || c % 10 === 0 ? 2 : 3),
    word: ([c, k]) => `${name(c)} buys a packet of crayons for ₹${c} at the school fair and gives the shopkeeper ₹${NOTES[k]}. How much money should ${name(c)} get back, in rupees?`,
    teach: {
      idea: "Change is the money you get back: what you paid take away the price.",
      method: "Count up from the price to the money paid: first to the next ten, then in tens. Add the jumps. Or take the price away from the money paid.",
      alternatives: [
        { id: "shopkeeper", title: "Count up like a shopkeeper", kind: "procedural", text: ["Start at the price and give coins until you reach the money paid: up to the next ten, then tens.", "The coins you gave are the change."], visual: ([c, k]) => ({ type: "numberline", from: Math.floor(c / 10) * 10, to: NOTES[k], step: NOTES[k] - Math.floor(c / 10) * 10 > 20 ? 10 : 2, marks: [c], jumps: c % 10 ? [[c, Math.ceil(c / 10) * 10], [Math.ceil(c / 10) * 10, NOTES[k]]] : [[c, NOTES[k]]] }) },
      ],
    },
    limits: "Whole rupees, one coin or note paid (up to ₹100); paise and several items are other families.",
  },
  {
    id: "abneed",
    arity: 5,
    title: "How much more money is needed",
    competency: CHANGE,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => {
      const s = sum(coinsOf(p));
      return p[0] > 3 || p[1] > 2 || p[2] > 2 || p[3] > 2 || p.slice(0, 4).some((n) => n < 0) || s < 3 || p[4] <= s || p[4] > 60 ? "Up to 9 coins of ₹10, ₹5, ₹2 and ₹1, not enough for a price up to ₹60." : null;
    },
    prompt: (p) => `Anu has the coins in the picture. A storybook costs ₹${p[4]}. Is that enough? How much more money does she need, in rupees?`,
    solve: (p) => {
      const s = sum(coinsOf(p));
      return {
        steps: [
          { id: "total", op: "add", competency: ADD, inputs: coinsOf(p), value: s },
          { id: "more", op: "subtract", competency: SUB, inputs: [p[4], s], value: p[4] - s },
        ],
        answer: p[4] - s,
      };
    },
    // independent: count the coins one by one, then count on a rupee at a time to the price
    validate: (p, v) => {
      let have = 0;
      for (const c of coinsOf(p)) for (let i = 0; i < c; i++) have++;
      let more = 0;
      while (have < p[4]) {
        have++;
        more++;
      }
      return v === more;
    },
    bugs: (p) => {
      const coins = coinsOf(p);
      const s = sum(coins);
      return [
        { id: "coins-as-ones", kind: "conceptual", competency: "MATH.measurement.money-coins", says: "Each coin was counted as ₹1. Look at the number on each coin: a ₹10 coin is ten rupees.", predict: p[4] > coins.length && coins.some((c) => c > 1) ? p[4] - coins.length : null },
        { id: "gave-total", kind: "conceptual", competency: CHANGE, says: "The money Anu has was given. The question asks how much MORE she needs to reach the price.", predict: s },
        { id: "added", kind: "conceptual", competency: CHANGE, says: "The price and the money were added. Take what she has away from the price.", predict: p[4] + s },
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Anu's coins: ${(s.inputs as number[]).map((c) => `₹${c}`).join(" + ")} = ₹${s.value}.` : `₹${s.inputs[0]} − ₹${s.inputs[1]} = ₹${s.value} more.`),
    figure: (p) => ({ type: "coins", items: coinsOf(p) }),
    domain: [[0, 3], [0, 2], [0, 2], [0, 2], [4, 60]],
    keep: (p) => p[4] - sum(coinsOf(p)) <= 20,
    cap: 300,
    difficulty: (p) => (p[4] - sum(coinsOf(p)) <= 5 ? 1 : coinsOf(p).length <= 4 ? 2 : 3),
    word: (p) => `${name(p[4])} wants a kite that costs ₹${p[4]}. In ${name(p[4])}'s money box are the coins in the picture. How many more rupees does ${name(p[4])} need to save?`,
    teach: {
      idea: "First find how much money there is by adding the coins' values. If it is less than the price, the difference is how much more is needed.",
      method: "Add the coins, biggest first. Then count up from that amount to the price.",
      alternatives: [
        { id: "count_on", title: "Count on to the price", kind: "procedural", text: ["Start at the money you have.", "Count on to the price; the number of rupees you count is how much more you need."], visual: (p) => ({ type: "numberline", from: 0, to: Math.ceil(p[4] / 10) * 10, step: 5, marks: [sum(coinsOf(p)), p[4]], jumps: [[sum(coinsOf(p)), p[4]]] }) },
      ],
    },
    limits: "Coins of ₹1, ₹2, ₹5 and ₹10 and a price up to ₹60 that the coins do not reach; notes and paise are other families.",
  },
  // ================================================================ length
  {
    id: "ablen",
    arity: 2,
    title: "Measuring length with a ruler",
    competency: LEN,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([a, b]) => (a < 0 || a > 8 || b > 15 || b - a < 2 ? "A ruler up to 15 cm; the object starts at 0 to 8 cm and is at least 2 cm long." : null),
    prompt: ([a, b]) => `A pencil is laid along the ruler in the picture. ${a === 0 ? "One end is at 0" : `One end is at the ${a} cm mark`} and the other end is at the ${b} cm mark. How long is the pencil, in cm?`,
    solve: ([a, b]) => ({ steps: [{ id: "length", op: "subtract", competency: LEN, inputs: [b, a], value: b - a }], answer: b - a }),
    // independent: count the 1 cm spaces between the two ends
    validate: ([a, b], v) => {
      let c = 0;
      for (let x = a; x < b; x++) c++;
      return v === c;
    },
    bugs: ([a, b]) => [
      { id: "read-end", kind: "conceptual", competency: LEN, says: `The number at the far end was read. The pencil does not start at 0: count the centimetres from ${a} to ${b}.`, predict: a > 0 ? b : null },
      { id: "counted-marks", kind: "procedural", competency: LEN, says: "The marks were counted, including the first one. Count the spaces between the marks: each space is 1 cm.", predict: b - a + 1 },
      { id: "started-at-one", kind: "procedural", competency: LEN, says: "Counting started from 1 at the end of the ruler. Measuring starts at 0.", predict: a === 0 ? b - 1 : null },
    ],
    variants: () => [],
    explain: (s) => `From ${s.inputs[1]} to ${s.inputs[0]} is ${s.value} cm.`,
    figure: ([a, b]) => ({ type: "numberline", from: 0, to: 15, step: 1, marks: [a, b], jumps: [[a, b]] }),
    domain: [[0, 8], [2, 15]],
    difficulty: ([a, b]) => (a === 0 ? 1 : b - a <= 8 ? 2 : 3),
    word: ([a, b]) => `${name(a + b)} measures a new eraser with a broken ruler. One end of the eraser is at ${a} cm and the other end is at ${b} cm. How long is the eraser, in cm?`,
    teach: {
      idea: "Length on a ruler is the number of 1 cm spaces the object covers, so it starts counting from where the object starts.",
      method: "Line one end up with 0 if you can. If it starts at another mark, take the start number from the end number (or count the spaces).",
      alternatives: [
        { id: "count_spaces", title: "Count the spaces", kind: "procedural", text: ["Put your finger at the start mark and hop to the next mark: that is 1 cm.", "Count the hops until you reach the end."], visual: ([a, b]) => ({ type: "numberline", from: a, to: b, step: 1, jumps: Array.from({ length: b - a }, (_, i) => [a + i, a + i + 1]) }) },
      ],
    },
    limits: "Whole centimetres on a 15 cm ruler; metres, millimetres and choosing a unit are other families.",
  },
  // ================================================================ mass
  {
    id: "abkg",
    arity: 5,
    title: "Weighing on a balance in kilograms and grams",
    competency: MASS,
    type: "integer",
    mc: true,
    parse: none,
    reject: (p) => {
      const n = sum(p);
      return p[0] > 2 || p[1] > 1 || p[2] > 2 || p[3] > 2 || p[4] > 1 || p.some((x) => x < 0) || n < 2 || n > 5 ? "Two to five weights: 1 kg, 500 g, 200 g, 100 g and 50 g." : null;
    },
    prompt: () => "The balance in the picture is level: the bag of rice weighs the same as the weights on the other side. How much does the bag weigh, in grams? (1 kg = 1000 g)",
    solve: (p) => {
      const g = sum(p.map((n, i) => n * WEIGHTS[i]));
      return {
        steps: [
          ...(p[0] ? [{ id: "kg", op: "convert", competency: MASS, inputs: [p[0]], value: p[0] * 1000 }] : []),
          { id: "total", op: "add", competency: ADD, inputs: weightList(p), value: g },
        ],
        answer: g,
      };
    },
    // independent: read each weight's label from the picture and add them one by one
    validate: (p, v) => {
      let g = 0;
      for (const w of weightList(p)) g += w.endsWith(" kg") ? Number(w.split(" ")[0]) * 1000 : Number(w.split(" ")[0]);
      return v === g;
    },
    bugs: (p) => {
      const rest = sum(p.slice(1).map((n, i) => n * WEIGHTS[i + 1]));
      return [
        { id: "kg-as-100", kind: "recall", competency: MASS, says: "1 kg was taken as 100 g. 1 kg is 1000 g.", predict: p[0] ? p[0] * 100 + rest : null },
        { id: "left-out-kg", kind: "procedural", competency: MASS, says: "The kilogram weight was left out because it is in kg. Change it to grams and add it too.", predict: p[0] && rest ? rest : null },
        { id: "counted-weights", kind: "conceptual", competency: MASS, says: "The weights were counted, not added. Each weight has its own number of grams.", predict: sum(p) },
      ];
    },
    distractors: (p) => {
      const g = sum(p.map((n, i) => n * WEIGHTS[i]));
      return [g + 100, g - 100, g + 50, g + 200].filter((x) => x > 0);
    },
    variants: () => [],
    explain: (s) => (s.id === "kg" ? `${s.inputs[0]} kg = ${s.value} g.` : `${(s.inputs as string[]).join(" + ")} = ${s.value} g.`),
    figure: (p) => ({ type: "balance", left: "bag of rice", right: weightList(p).join(" + ") }),
    domain: [[0, 2], [0, 1], [0, 2], [0, 2], [0, 1]],
    difficulty: (p) => (p[0] === 0 && p[4] === 0 ? 1 : p[0] === 0 || p[4] === 0 ? 2 : 3),
    word: (p) => `At the ration shop, the shopkeeper puts ${listAnd(weightList(p))} on one side of the scale and fills a bag of sugar on the other side until it balances. How many grams of sugar are in the bag?`,
    teach: {
      idea: "When a balance is level, both sides weigh the same, so the bag weighs as much as all the weights together. 1 kg = 1000 g.",
      method: "Change any kilograms to grams (1 kg = 1000 g). Add the grams of all the weights, biggest first.",
      visual: (p) => ({ type: "balance", left: "bag of rice", right: weightList(p).join(" + ") }),
      alternatives: [
        { id: "build_up", title: "Build up to 1000", kind: "conceptual", text: ["500 g and 500 g make 1 kg; 200 g + 200 g + 100 g make 500 g.", "Group the weights into easy amounts (hundreds), then add."], visual: (p) => ({ type: "bars", title: "grams", labels: weightList(p), values: weightList(p).map((w) => (w.endsWith(" kg") ? 1000 : Number(w.split(" ")[0]))) }) },
      ],
    },
    limits: "Up to five standard weights (1 kg, 500 g, 200 g, 100 g, 50 g); estimating weights is checked by a teacher.",
  },
  // ================================================================ equal groups
  {
    id: "abgroup",
    arity: 2,
    title: "Equal groups: how many in all",
    competency: GROUPS,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.replace(/\s+/g, " ").match(/^(\d+) groups? of (\d+)\??$/i);
      return m ? [Number(m[1]), Number(m[2])] : null;
    },
    reject: ([g, e]) => (g < 2 || g > 10 || e < 2 || e > 10 ? "2 to 10 groups of 2 to 10." : null),
    prompt: ([g, e]) => `In the picture there are ${g} plates, one in each row, with ${e} laddoos on each plate. How many laddoos are there in all?`,
    solve: ([g, e]) => ({
      steps: [
        { id: "repeat", op: "add", competency: ADD, inputs: Array(g).fill(e), value: g * e },
        { id: "product", op: "multiply", competency: GROUPS, inputs: [g, e], value: g * e },
      ],
      answer: g * e,
    }),
    // independent: skip count one group at a time
    validate: ([g, e], v) => {
      let s = 0;
      for (let i = 0; i < g; i++) s += e;
      return v === s;
    },
    bugs: ([g, e]) => [
      { id: "added-numbers", kind: "conceptual", competency: GROUPS, says: `${g} and ${e} were added. There are ${g} groups of ${e}: add ${e} again and again, ${g} times.`, predict: g + e },
      { id: "one-group", kind: "conceptual", competency: GROUPS, says: "Only one group was counted. Count every group.", predict: e },
      { id: "missed-group", kind: "procedural", competency: GROUPS, says: `One group was missed while skip counting. Touch each plate as you say the next number.`, predict: [(g - 1) * e, (g + 1) * e] },
    ],
    variants: () => [],
    explain: (s) => (s.id === "repeat" ? `${(s.inputs as number[]).join(" + ")} = ${s.value}` : `${s.inputs[0]} groups of ${s.inputs[1]} is ${s.inputs[0]} × ${s.inputs[1]} = ${s.value}.`),
    figure: ([g, e]) => ({ type: "array", rows: g, cols: e }),
    domain: [[2, 10], [2, 10]],
    difficulty: ([g, e]) => (g * e <= 20 ? 1 : g * e <= 50 ? 2 : 3),
    word: ([g, e]) => `${name(g + e)} packs gifts for Pongal: ${g} bags with ${e} sugarcane pieces in each bag. How many sugarcane pieces are there altogether?`,
    teach: {
      idea: "Equal groups can be added again and again: 4 groups of 3 is 3 + 3 + 3 + 3, which we also write 4 × 3.",
      method: "Skip count by the number in one group, once for each group: 3, 6, 9, 12. The last number is how many in all.",
      visual: ([g, e]) => ({ type: "array", rows: g, cols: e }),
      alternatives: [
        { id: "jumps", title: "Jumps on a number line", kind: "procedural", text: ["Make one jump for each group, each jump as long as one group.", "Where you land after the last jump is the total."], visual: ([g, e]) => ({ type: "numberline", from: 0, to: g * e, step: e, jumps: Array.from({ length: g }, (_, i) => [i * e, (i + 1) * e]) }) },
      ],
    },
    limits: "2 to 10 equal groups of 2 to 10; sharing (division) is another family.",
  },
  // ================================================================ hundreds, tens and ones
  {
    id: "abhto",
    arity: 3,
    title: "Hundreds, tens and ones from blocks",
    competency: HUND,
    type: "integer",
    mc: true,
    parse: none,
    reject: ([h, t, o]) => (h < 1 || h > 9 || t < 0 || t > 9 || o < 0 || o > 9 ? "Three-digit numbers from blocks: 1 to 9 hundreds, 0 to 9 tens and ones." : null),
    prompt: () => "Big squares are hundreds, long sticks are tens and small cubes are ones. What number do the blocks in the picture show?",
    solve: ([h, t, o]) => ({
      steps: [
        { id: "hundreds", op: "count", competency: HUND, inputs: [h], value: h * 100 },
        { id: "tens", op: "count", competency: PV, inputs: [t], value: t * 10 },
        { id: "number", op: "add", competency: HUND, inputs: [h * 100, t * 10, o], value: h * 100 + t * 10 + o },
      ],
      answer: h * 100 + t * 10 + o,
    }),
    // independent: count every block in ones (100 for a square, 10 for a stick, 1 for a cube)
    validate: ([h, t, o], v) => {
      let n = 0;
      for (let i = 0; i < h; i++) for (let j = 0; j < 100; j++) n++;
      for (let i = 0; i < t; i++) for (let j = 0; j < 10; j++) n++;
      for (let i = 0; i < o; i++) n++;
      return v === n;
    },
    bugs: ([h, t, o]) => [
      { id: "missing-zero", kind: "conceptual", competency: HUND, says: t === 0 || o === 0 ? `There are no ${t === 0 ? "tens" : "ones"}, so that place needs a 0. Without it, the number looks too small.` : "A place with nothing in it needs a 0.", predict: t === 0 ? h * 10 + o : o === 0 ? h * 10 + t : null },
      { id: "counted-blocks", kind: "conceptual", competency: HUND, says: "The blocks were counted one each. A big square is 100 and a stick is 10.", predict: h + t + o },
      { id: "tens-ones-swapped", kind: "procedural", competency: PV, says: "The tens and the ones were written in each other's places. Tens come before ones.", predict: t !== o ? h * 100 + o * 10 + t : null },
    ],
    variants: () => [],
    explain: (s) => (s.id === "hundreds" ? `${s.inputs[0]} hundreds = ${s.value}` : s.id === "tens" ? `${s.inputs[0]} tens = ${s.value}` : `${s.inputs[0]} + ${s.inputs[1]} + ${s.inputs[2]} = ${s.value}`),
    figure: ([h, t, o]) => ({ type: "blocks", hundreds: h, tens: t, ones: o }),
    domain: [[1, 9], [0, 9], [0, 9]],
    cap: 400,
    difficulty: ([h, t, o]) => (h <= 2 && t && o ? 1 : t === 0 || o === 0 ? 3 : 2),
    word: ([h, t, o]) => `${name(h + t + o)} sorts ice-cream sticks for a craft class: ${listAnd([`${h} big ${plural(h, "bundle", "bundles")} of 100 sticks`, ...(t ? [`${t} small ${plural(t, "bundle", "bundles")} of 10 sticks`] : []), ...(o ? [`${o} loose ${plural(o, "stick", "sticks")}`] : [])])}. How many sticks are there in all?`,
    teach: {
      idea: "Ten ones make a ten and ten tens make a hundred. A three-digit number tells how many hundreds, tens and ones, in that order.",
      method: "Count the hundreds, then the tens, then the ones. Write the three digits in order, putting 0 in any place that has nothing.",
      visual: ([h, t, o]) => ({ type: "blocks", hundreds: h, tens: t, ones: o }),
      alternatives: [
        { id: "place_table", title: "A place-value table", kind: "procedural", text: ["Draw three boxes labelled H, T and O.", "Write how many hundreds, tens and ones in the boxes; read the digits across."], visual: ([h, t, o]) => ({ type: "table", head: ["H", "T", "O"], rows: [[h, t, o]] }) },
      ],
    },
    limits: "Numbers 100 to 999 shown with base-ten blocks; numbers made with more than 9 tens or ones are the regrouping family.",
  },
  {
    id: "abreg",
    arity: 3,
    title: "Building a number from extra tens or ones",
    competency: HUND,
    type: "integer",
    mc: true,
    parse: (t) => {
      const m = t.match(/^(\d) hundreds?,? (\d{1,2}) tens? and (\d{1,2}) ones?\??$/i);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    },
    reject: ([h, t, o]) => (h < 1 || h > 8 || t < 0 || t > 19 || o < 0 || o > 19 || (t >= 10) === (o >= 10) || h * 100 + t * 10 + o > 999 ? "1 to 8 hundreds, with either the tens or the ones (not both) more than 9." : null),
    prompt: ([h, t, o]) => `What number is ${h} ${plural(h, "hundred", "hundreds")}, ${t} ${plural(t, "ten", "tens")} and ${o} ${plural(o, "one", "ones")}?`,
    solve: ([h, t, o]) => {
      const n = h * 100 + t * 10 + o;
      return {
        steps: [
          { id: "regroup", op: "regroup", competency: PV, inputs: [t >= 10 ? t : o, t >= 10 ? "tens" : "ones"], value: t >= 10 ? t * 10 : o },
          { id: "number", op: "add", competency: HUND, inputs: [h * 100, t * 10, o], value: n },
        ],
        answer: n,
      };
    },
    // independent: count up from 0 in hundreds, then tens, then ones
    validate: ([h, t, o], v) => {
      let n = 0;
      for (let i = 0; i < h; i++) n += 100;
      for (let i = 0; i < t; i++) n += 10;
      for (let i = 0; i < o; i++) n += 1;
      return v === n;
    },
    bugs: ([h, t, o]) => [
      { id: "wrote-side-by-side", kind: "conceptual", competency: HUND, says: `The numbers were written next to each other. ${t >= 10 ? `${t} tens is 1 hundred and ${t - 10} tens` : `${o} ones is 1 ten and ${o - 10} ones`}, so it must be exchanged.`, predict: Number(`${h}${t}${o}`) },
      { id: "dropped-extra", kind: "conceptual", competency: PV, says: `Only the last digit of ${t >= 10 ? t : o} was kept. The extra ${t >= 10 ? "ten tens make a hundred" : "ten ones make a ten"}: add it to the next place.`, predict: h * 100 + (t % 10) * 10 + (o % 10) },
    ],
    variants: () => [],
    explain: (s) => (s.id === "regroup" ? (s.inputs[1] === "tens" ? `${s.inputs[0]} tens = ${s.value}` : `${s.inputs[0]} ones = 1 ten and ${Number(s.inputs[0]) - 10} ones`) : `${s.inputs[0]} + ${s.inputs[1]} + ${s.inputs[2]} = ${s.value}`),
    figure: ([h, t, o]) => ({ type: "blocks", hundreds: h, tens: t, ones: o }),
    domain: [[1, 8], [0, 19], [0, 19]],
    keep: ([h, t, o]) => (t >= 10) !== (o >= 10),
    cap: 400,
    difficulty: ([, t, o]) => (t === 10 || o === 10 ? 1 : o >= 10 ? 2 : 3),
    word: ([h, t, o]) => `At the temple festival, ${name(h + t)} counts the coins in the box: ${h} ${plural(h, "bag", "bags")} of ₹100, ${t} ${plural(t, "packet", "packets")} of ₹10 and ${o} loose ₹1 ${plural(o, "coin", "coins")}. How many rupees is that?`,
    teach: {
      idea: "Ten tens make a hundred and ten ones make a ten, so a number can be built with more than 9 tens or ones; exchange them to write it.",
      method: "Change ten ones into a ten (or ten tens into a hundred). Then write the hundreds, tens and ones digits in order.",
      visual: ([h, t, o]) => ({ type: "blocks", hundreds: h, tens: t, ones: o }),
      alternatives: [
        { id: "add_parts", title: "Add the parts", kind: "procedural", text: ["Turn each part into a number: 2 hundreds is 200, 13 tens is 130, 4 ones is 4.", "Add them: 200 + 130 + 4 = 334."], visual: ([h, t, o]) => ({ type: "blocks", hundreds: h + Math.floor((t * 10 + o) / 100), tens: Math.floor(((t * 10 + o) % 100) / 10), ones: o % 10 }) },
      ],
    },
    limits: "Up to 999 with 10 to 19 tens or 10 to 19 ones; expanded forms with more than one exchange come later.",
  },
];
