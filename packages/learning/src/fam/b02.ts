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
const STEPS = [2, 3, 5, 10, 9];
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
/** Something that really costs about ₹c (a toffee for a few rupees, a toy for more). */
const priced = (c: number) => (c < 5 ? "a toffee" : c < 10 ? "a pencil" : c < 30 ? "a notebook" : c < 60 ? "a box of crayons" : "a toy");
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
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
      if (k < 0 || k > 4 || (d !== 0 && d !== 1)) return "Steps of 2, 3, 5, 10 or 9, forwards or backwards.";
      if (k === 4 && s % 9 !== 0) return "Counting in nines goes along the multiples of 9.";
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
    domain: [[0, 200], [0, 4], [0, 1]],
    cap: 400,
    difficulty: ([s, k, d]) => (k === 3 || k === 2 ? (d ? 2 : 1) : k === 0 ? (d ? 2 : 1) : d ? 3 : 2),
    word: ([s, k, d]) => {
      const t = seq(s, STEPS[k], d, 4);
      return d
        ? `${name(s)} counts down the steps of a temple, saying every ${STEPS[k] === 2 ? "second" : STEPS[k] === 3 ? "third" : STEPS[k] === 5 ? "fifth" : STEPS[k] === 9 ? "ninth" : "tenth"} number: ${t.join(", ")}. What number does ${name(s)} say next?`
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
    limits: "Steps of 2, 3, 5 and 10, and the multiples of 9, forwards and backwards, up to 100 (200 in tens); growing patterns are other families.",
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
        { id: "by-ones", kind: "conceptual", competency: PAT, says: `The number one ${d ? "less" : "more"} than ${t[p - 1]} was written (the ones digit was changed). The pattern jumps by ${MSTEPS[k]}${k === 3 ? ": counting in tens changes the tens digit and keeps the ones digit" : ""}.`, predict: k === 0 ? null : t[p - 1] + dir },
        { id: "before-after", kind: "conceptual", competency: PAT, says: `The pattern was read the wrong way: the numbers ${d ? "go down" : "go up"}, so the missing one is ${d ? "less" : "more"} than ${t[p - 1]}.`, predict: pos(t[p - 1] - dir * MSTEPS[k]) },
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
    explain: (s) => (s.id === "across" ? `Across: ${s.value} ${plural(Number(s.value), "square", "squares")}.` : s.id === "up" ? `Up or down: ${s.value} ${plural(Number(s.value), "square", "squares")}.` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} ${plural(Number(s.value), "square", "squares")}.`),
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
        { id: "wrong-bar", kind: "procedural", competency: PIC, says: `A different bar was read. Find "${CONTAINERS[p[3]]}" under the chart first.`, predict: [p[3] - 1, p[3] + 1].filter((i) => i >= 0 && i <= 2).map((i) => p[i]) },
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
        ...(cap === 2000 && v < 1000 ? [{ id: "top-as-litre", kind: "conceptual", competency: CAP, says: `The top was taken as 1000 mL. This jug holds ${cap} mL: read the number at the top of the scale.`, predict: 1000 - v } as Bug] : []),
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
    prompt: ([c, k]) => `${cap1(priced(c))} costs ₹${c}. You pay with the ₹${NOTES[k]} ${NOTES[k] <= 20 ? "coin" : "note"} in the picture. How much change do you get, in rupees?`,
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
        // (when "smaller from larger" gives the same as adding, e.g. 100 − 37 → 137, only the adding explanation is kept)
        ...(smallerFromLarger(p, c) !== p + c ? [{ id: "no-exchange", kind: "procedural", competency: SUB, says: `The smaller digit was taken from the bigger in each column. ${p} − ${c} needs a ten changed into ones; or count up from ₹${c} to ₹${p}.`, predict: smallerFromLarger(p, c) } as Bug] : []),
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
    word: ([c, k]) => `${name(c)} buys ${priced(c)} for ₹${c} at the school fair and gives the shopkeeper ₹${NOTES[k]}. How much money should ${name(c)} get back, in rupees?`,
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
      { id: "missed-group", kind: "procedural", competency: GROUPS, says: `One group was missed while skip counting. Touch each plate as you say the next number.`, predict: (g - 1) * e },
      { id: "extra-group", kind: "procedural", competency: GROUPS, says: `One group too many was counted: the count went on after the last plate. Say one number for each plate and stop at the last one.`, predict: (g + 1) * e },
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
    explain: (s) => (s.id === "hundreds" ? `${s.inputs[0]} ${plural(Number(s.inputs[0]), "hundred", "hundreds")} = ${s.value}` : s.id === "tens" ? `${s.inputs[0]} ${plural(Number(s.inputs[0]), "ten", "tens")} = ${s.value}` : `${s.inputs[0]} + ${s.inputs[1]} + ${s.inputs[2]} = ${s.value}`),
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
      { id: "wrote-side-by-side", kind: "conceptual", competency: HUND, says: `The numbers were written next to each other. ${t >= 10 ? `${t} tens is 1 hundred and ${t - 10} ${plural(t - 10, "ten", "tens")}` : `${o} ones is 1 ten and ${o - 10} ${plural(o - 10, "one", "ones")}`}, so it must be exchanged.`, predict: Number(`${h}${t}${o}`) },
      { id: "dropped-extra", kind: "conceptual", competency: PV, says: `Only the last digit of ${t >= 10 ? t : o} was kept. The extra ${t >= 10 ? "ten tens make a hundred" : "ten ones make a ten"}: add it to the next place.`, predict: h * 100 + (t % 10) * 10 + (o % 10) },
    ],
    variants: () => [],
    explain: (s) => (s.id === "regroup" ? (s.inputs[1] === "tens" ? `${s.inputs[0]} tens = ${s.value}` : `${s.inputs[0]} ones = 1 ten and ${Number(s.inputs[0]) - 10} ${plural(Number(s.inputs[0]) - 10, "one", "ones")}`) : `${s.inputs[0]} + ${s.inputs[1]} + ${s.inputs[2]} = ${s.value}`),
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

// ================================================================ gap@1 additions (assessment gaps closed for b02)
const MONEY = "MATH.measurement.money-totals";
const VOL = "MATH.measurement.volume-cubes";
const st = (id: string, op: string, competency: string, inputs: (number | string)[], value: number | string) => ({ id, op, competency, inputs, value });
const B = (id: string, kind: Bug["kind"], competency: string, says: string, predict: Bug["predict"]): Bug => ({ id, kind, competency, says, predict });
const inR = (p: number[], d: [number, number][]) => p.length === d.length && p.every((v, i) => Number.isInteger(v) && v >= d[i][0] && v <= d[i][1]);
const guard = (d: [number, number][], ok: (p: number[]) => boolean, why: string) => (p: number[]) => (!inR(p, d) || !ok(p) ? why : null);
const hm = (s: string) => {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619) >>> 0;
  }
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const shuffleBy = <T,>(xs: T[], key: string): T[] => xs.map((x, i) => [x, hm(`${key}#${i}`)] as [T, number]).sort((a, b) => a[1] - b[1]).map(([x]) => x);
const ix = (cs: string[], s: string | null | undefined): number | null => (s == null || cs.indexOf(s) < 0 ? null : cs.indexOf(s));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const tbl = (head: string[], rows: (string | number)[][]): Visual => ({ type: "table", head, rows });
const listC = (xs: (number | string)[]) => xs.join(", ");
const readNums = (v: unknown) => {
  const t = String(v).replace(/[()\s]/g, "").split(",");
  return t.every((x) => /^\d+$/.test(x)) ? t.map(Number) : null;
};
const nth = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const MORE_NAMES = ["Anu", "Ravi", "Meena", "Arjun", "Kavya", "Imran", "Divya", "Selvi", "Kumar", "Priya", "Vijay", "Lakshmi", "Karthik", "Nila", "Farhan", "Geetha", "Hari", "Jaya", "Mani", "Pooja"];

// ---- directions and routes
const DIRS = ["North", "East", "South", "West"];
const DIR_DEG: Record<string, number> = { North: 0, East: 90, South: 180, West: 270 };
const TURNS = ["turns right (a quarter turn)", "turns left (a quarter turn)", "turns right round to face the other way (a half turn)"];
const DPLACES = ["temple", "school", "park", "well", "shop", "post office", "bus stand", "library"];
const dirMap = (seed: number) => {
  const ps = shuffleBy(DPLACES, `dm:${seed}`).slice(0, 5);
  const pts: [number, number, string][] = [[3, 3, ps[0]], [3, 5, ps[1]], [5, 3, ps[2]], [3, 1, ps[3]], [1, 3, ps[4]]];
  return { centre: ps[0], around: ps.slice(1), pts };
};
const dirChoices = ([kind, a, b]: number[]) => (kind === 1 && b === 0 ? shuffleBy(dirMap(a).around, `dc1:${a}`) : shuffleBy(DIRS, `dc:${kind}:${a}:${b}`));
const dirAnswer = ([kind, a, b]: number[]) => {
  if (kind === 0) return DIRS[mod(a + [1, 3, 2][b], 4)];
  if (kind === 1) {
    const m = dirMap(a);
    const d = hm(`dd:${a}`) % 4;
    return b === 0 ? m.around[d] : DIRS[d];
  }
  return DIRS[mod(a + [3, 1, 2][b], 4)];
};
const routeOf = (seed: number) => {
  const h = (s: string) => hm(`rt:${seed}:${s}`);
  const p = 2 + (h("p") % 9);
  const q = 2 + (h("q") % 9);
  const r = 2 + (h("r") % 9);
  const s = 2 + (h("s") % 9);
  const t = Math.max(p + q, r + s) - 1 - (h("t") % 3);
  return { p, q, r, s, t };
};
const ROAD_NAMES = ["Anur", "Belur", "Chettipalayam", "Devipuram"];
const pathOf = (seed: number) => {
  const h = (s: string) => hm(`pa:${seed}:${s}`);
  const x0 = h("x") % 3;
  const y0 = h("y") % 3;
  const dx = 1 + (h("dx") % 4);
  const dy = 1 + (h("dy") % 3);
  const ew = h("ew") % 2;
  const ns = h("ns") % 2;
  const S = [2, 5, 10, 100, 200][h("S") % 5];
  const sx = ew ? x0 + dx : x0;
  const sy = ns ? y0 + dy : y0;
  return { start: [sx, sy] as [number, number], ew, ns, dx, dy, S, unit: S >= 100 ? "m" : "km" };
};

// ---- shapes: straight and curved, diagonals, curved solids
const CSYM: Record<string, { straight: boolean; curved: boolean }> = { "▲": { straight: true, curved: false }, "■": { straight: true, curved: false }, "▬": { straight: true, curved: false }, "▼": { straight: true, curved: false }, "●": { straight: false, curved: true }, "○": { straight: false, curved: true }, "◖": { straight: true, curved: true }, "◗": { straight: true, curved: true } };
const CSYMS = Object.keys(CSYM);
const CKIND = (c: string) => (c === "●" || c === "○" ? 1 : c === "◖" || c === "◗" ? 2 : 0);
const curveRow = (len: number, seed: number) => [...Array(len)].map((_, i) => CSYMS[hm(`cr:${len}:${seed}:${i}`) % CSYMS.length]);
const DSH: [string, string, number][] = [["triangle", "triangles", 3], ["square", "squares", 4], ["rectangle", "rectangles", 4], ["pentagon", "pentagons", 5], ["hexagon", "hexagons", 6], ["circle", "circles", 0]];
const DIAG = [0, 2, 2, 5, 9, 0];
const DQ = ["sides", "corners", "diagonals"];
const DPROPS = ["have exactly 2 diagonals", "have no diagonals", "have more than 4 corners", "have exactly 4 sides"];
const dprop = (k: number, i: number) => [DIAG[i] === 2, DIAG[i] === 0, DSH[i][2] > 4, DSH[i][2] === 4][k];
const dList = (seed: number) => [...Array(6)].map((_, i) => hm(`dl:${seed}:${i}`) % 6);
const CS: [string, string][] = [["cylinder", "cylinders"], ["cone", "cones"], ["sphere", "spheres"], ["cube", "cubes"], ["cuboid", "cuboids"]];
/** [flat faces, curved surfaces, edges, corners] */
const CS_FEC = [[2, 1, 2, 0], [1, 1, 1, 1], [0, 1, 0, 0], [6, 0, 12, 8], [6, 0, 12, 8]];
const CQ = ["flat faces", "curved surfaces", "edges", "corners (vertices)", "solids with both a flat face and a curved surface"];
const csAns = ([s1, k1, s2, k2, q]: number[]) => (q === 4 ? k1 * (s1 <= 1 ? 1 : 0) + k2 * (s2 <= 1 ? 1 : 0) : k1 * CS_FEC[s1][q] + k2 * CS_FEC[s2][q]);
const csList = ([s1, k1, s2, k2]: number[]) => [`${k1} ${k1 === 1 ? CS[s1][0] : CS[s1][1]}`, ...(k2 ? [`${k2} ${k2 === 1 ? CS[s2][0] : CS[s2][1]}`] : [])].join(" and ");

// ---- lines in objects, containers, equal groups
const OBJ_LINES: [string, number][] = [
  ["a ruler", 0], ["a book", 0], ["a door", 0], ["a brick", 0], ["a window frame", 0], ["a matchbox", 0], ["a blackboard", 0], ["a ladder", 0], ["a kite", 0], ["a carrom board", 0],
  ["a bangle", 1], ["a wheel", 1], ["a ball", 1], ["a plate", 1], ["a full moon", 1], ["a rainbow", 1], ["a ₹5 coin", 1], ["a ring", 1], ["a laddu", 1], ["a dosa", 1],
];
const objRow = (seed: number) => shuffleBy(OBJ_LINES, `ol:${seed}`).slice(0, 6);
const CONTS = ["kettle", "pot", "jug", "bottle"];
const contsOf = ([k, q, hq]: number[]) => {
  const order = permK(k, q);
  const hord = permK(k, hq);
  return CONTS.slice(0, k).map((c, i) => ({ name: c, cups: 3 + 2 * order[i] + (order[i] > 1 ? 1 : 0), height: 15 + 6 * hord[i] }));
};
function permK(k: number, idx: number): number[] {
  const items = [...Array(k).keys()];
  const out: number[] = [];
  let r = idx;
  for (let n = k; n >= 1; n--) {
    let f = 1;
    for (let i = 2; i < n; i++) f *= i;
    out.push(items.splice(Math.floor(r / f), 1)[0]);
    r %= f;
  }
  return out;
}
const factK = (k: number) => (k === 3 ? 6 : 24);
const repStr = (e: number, g: number) => Array(g).fill(e).join(" + ");
const repChoices = ([kind, g, e]: number[]) => {
  if (kind === 0) {
    const R = repStr(e, g);
    const less = repStr(e, g - 1);
    const added = `${g} + ${e}`;
    const more = repStr(e, g + 1);
    const four = [...new Set([R, added, less, more, repStr(e + 1, g), repStr(e - 1, g)])].slice(0, 4);
    return { list: shuffleBy(four, `rp0:${g}:${e}`), R, less: four.includes(less) ? less : null, added, more: four.includes(more) ? more : null };
  }
  const R = `${g} × ${e}`;
  const added = `${g} + ${e}`;
  const more = `${g + 1} × ${e}`;
  const four = [...new Set([R, added, more, `${e} × ${e}`, `${g} × ${e + 1}`, `${g - 1} × ${e}`])].filter((x) => x !== `${e} × ${g}` || x === R).slice(0, 4);
  return { list: shuffleBy(four, `rp1:${g}:${e}`), R, less: null as string | null, added, more };
};

// ---- measuring: tapes and rulers, units, weights
const LEN_UNITS: [string, string][] = [
  ["the thickness of a ₹1 coin", "mm"], ["the length of an ant", "mm"], ["the width of a pencil tip", "mm"], ["a grain of rice", "mm"], ["the thickness of a notebook cover", "mm"], ["the length of a mosquito", "mm"], ["the thickness of a fingernail", "mm"], ["the width of a mustard seed", "mm"], ["the gap between two teeth of a comb", "mm"], ["the thickness of a bus pass card", "mm"],
  ["a pencil", "cm"], ["a notebook", "cm"], ["a hand span", "cm"], ["a shoe", "cm"], ["a mango leaf", "cm"], ["a spoon", "cm"], ["a banana", "cm"], ["a stick of chalk", "cm"], ["a mobile phone", "cm"], ["the height of a water bottle", "cm"],
  ["a classroom", "m"], ["a saree", "m"], ["a cricket pitch", "m"], ["the height of a coconut tree", "m"], ["a swimming pool", "m"], ["a school corridor", "m"], ["a bus", "m"], ["a skipping rope", "m"], ["a wall of a house", "m"], ["a running race on Sports Day", "m"],
  ["the road from Chennai to Madurai", "km"], ["a long train journey", "km"], ["a marathon", "km"], ["the distance to the next town", "km"], ["the river Kaveri", "km"], ["a flight from Delhi to Mumbai", "km"], ["the beach road along the coast of Chennai", "km"], ["a bus route across the city", "km"], ["a cycle trip to the next village", "km"], ["the road from Ooty to Coimbatore", "km"],
];
const lenThing = (i: number) => (LEN_UNITS[i][0].startsWith("the ") ? LEN_UNITS[i][0] : `the length of ${LEN_UNITS[i][0]}`);
const LEN_SIZE: Record<string, [number, number]> = { mm: [0, 10], cm: [1, 100], m: [100, 100000], km: [100000, 1e12] };
/** Typical lengths in cm, for the check: the unit whose range holds it. */
const LEN_CM = [0.2, 0.4, 0.05, 0.6, 0.1, 0.5, 0.05, 0.2, 0.15, 0.08, 17, 25, 18, 22, 20, 15, 18, 8, 15, 25, 900, 550, 2000, 1500, 2500, 3000, 1200, 250, 400, 10000, 46000000, 30000000, 4200000, 2000000, 80000000, 110000000, 1300000, 1500000, 500000, 8500000];
const TOOLS = ["a 30 cm ruler", "a measuring tape (metre tape)", "the odometer (distance meter) of the vehicle"];
const TOOL_THINGS: [string, number, number][] = [["a pencil", 0, 17], ["a notebook", 0, 25], ["an eraser", 0, 5], ["a mango leaf", 0, 20], ["a spoon", 0, 15], ["an envelope", 0, 22], ["a classroom", 1, 900], ["a door", 1, 200], ["a saree", 1, 550], ["a cricket pitch", 1, 2000], ["a bed", 1, 200], ["a playground", 1, 5000], ["a wall", 1, 400], ["the road from Chennai to Madurai", 2, 46000000], ["a bus trip to the next town", 2, 2500000], ["the drive from Salem to Erode", 2, 6500000]];
const EST: [string, number, string][] = [
  ["the height of a classroom door", 2, "m"], ["the length of a bed", 2, "m"], ["the length of a classroom", 8, "m"], ["the length of a pencil", 15, "cm"], ["the length of a notebook", 25, "cm"], ["the height of a school bag", 0.5, "m"], ["the height of a table", 0.75, "m"], ["the height of a chair seat", 0.5, "m"], ["the length of a cricket bat", 1, "m"], ["the length of a ruler", 30, "cm"], ["a hand span", 15, "cm"], ["the length of a bus", 12, "m"],
  ["the length of a saree", 5, "m"], ["the walk from one end of a street to the other", 200, "m"], ["the distance from Chennai to Bengaluru", 350, "km"], ["the width of a thumb", 2, "cm"], ["the length of an ant", 4, "mm"], ["the thickness of a coin", 2, "mm"], ["the height of a coconut tree", 15, "m"], ["the width of a door", 1, "m"],
  ["the length of a spoon", 0.25, "m"], ["the walk from home to a nearby shop", 0.25, "km"], ["the height of a water bottle", 0.25, "m"], ["the length of a school corridor", 50, "m"], ["the bus ride to the next town", 50, "km"], ["the length of a mango leaf", 20, "cm"],
];
const UNIT_CM: Record<string, number> = { mm: 0.1, cm: 1, m: 100, km: 100000 };
const fmtQ = (v: number) => (v === 0.5 ? "½" : v === 0.25 ? "¼" : v === 0.75 ? "¾" : String(v));
/** The two other units used as wrong options for an estimate in unit u. */
const unitOf = (u: string) => (u === "mm" ? "cm" : u === "cm" ? "m" : u === "m" ? "km" : "m");
const unitBelow = (u: string) => (u === "km" ? "cm" : u === "m" ? "cm" : u === "cm" ? "mm" : "m");
const estChoices = (i: number) => {
  const [, v, u] = EST[i];
  const R = `about ${fmtQ(v)} ${u}`;
  const up = `about ${fmtQ(v)} ${unitOf(u)}`;
  const down = `about ${fmtQ(v)} ${unitBelow(u)}`;
  const ten = `about ${fmtQ(v * 10)} ${u}`;
  return { list: shuffleBy([R, up, down, ten], `est:${i}`), R, up, down, ten };
};
const unitChoices = ([kind, i]: number[]) => (kind === 0 ? shuffleBy(["mm", "cm", "m", "km"], `un:${i}`) : kind === 1 ? shuffleBy(TOOLS, `tl:${i}`) : estChoices(i).list);
const W_UNITS: [string, string, number][] = [
  ["the medicine in one small tablet", "mg", 0.25], ["a grain of salt", "mg", 0.06], ["a mosquito", "mg", 0.0025], ["a strand of hair", "mg", 0.0006], ["a grain of rice", "mg", 0.025], ["an ant", "mg", 0.003], ["a pinch of saffron", "mg", 0.03], ["a small feather", "mg", 0.05],
  ["an egg", "g", 50], ["a pencil", "g", 7], ["a letter in an envelope", "g", 20], ["a tomato", "g", 80], ["a packet of biscuits", "g", 150], ["a ₹10 coin", "g", 7.7], ["a banana", "g", 120], ["a pen", "g", 10],
  ["a sack of rice", "kg", 25000], ["a watermelon", "kg", 4000], ["a school bag", "kg", 3000], ["a child of 8", "kg", 25000], ["a bicycle", "kg", 15000], ["a goat", "kg", 30000], ["a bag of cement", "kg", 50000], ["a cooking gas cylinder", "kg", 30000],
];
const W_EST: [string, number, string][] = [["an egg", 50, "g"], ["a school bag", 3, "kg"], ["a watermelon", 4, "kg"], ["a pencil", 5, "g"], ["a bag of rice for a family", 25, "kg"], ["a banana", 120, "g"], ["a mango", 250, "g"], ["a new-born baby", 3, "kg"], ["a coconut", 1, "kg"], ["a bicycle", 15, "kg"], ["a packet of salt", 1, "kg"], ["a ₹10 coin", 8, "g"], ["a pumpkin", 5, "kg"], ["a pen", 10, "g"], ["a brick", 3, "kg"], ["a dictionary", 1, "kg"], ["a cricket ball", 160, "g"], ["a bucket of water", 10, "kg"], ["a laptop", 2, "kg"], ["a slice of bread", 30, "g"]];
const W_G: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 };
const wSens = (i: number, s: number) => {
  const [thing, v, u] = W_EST[i];
  const rec = s === 0 ? `${v} ${u}` : s === 1 ? `${v} ${u === "g" ? "kg" : u}` : `${v} ${u === "kg" ? "g" : u === "g" ? "mg" : u}`;
  return { thing, rec, truth: v * W_G[u], recG: s === 0 ? v * W_G[u] : s === 1 ? v * (u === "g" ? 1000 : W_G[u]) : v * (u === "kg" ? 1 : 0.001) };
};
const SENS = ["Sensible", "Too heavy to be true", "Too light to be true"];
const wChoices = ([kind, i, s]: number[]) => (kind === 0 ? shuffleBy(["mg", "g", "kg"], `wu:${i}`) : kind === 1 ? shuffleBy(SENS, `ws:${i}:${s}`) : wEstChoices(i).list);
const wEstChoices = (i: number) => {
  const [, v, u] = W_EST[i];
  const R = `about ${v} ${u}`;
  const other = `about ${v} ${u === "kg" ? "g" : "kg"}`;
  const ten = `about ${v * 10} ${u}`;
  const tenth = u === "kg" ? `about ${v * 100} g` : `about ${v} mg`;
  return { list: shuffleBy([R, other, ten, tenth], `we:${i}`), R, other, ten };
};

// ---- seats, clocks, nines, Pascal's triangle
const seatGrid = (seed: number) => {
  const ns = shuffleBy(MORE_NAMES, `sg:${seed}`);
  return [0, 1, 2, 3].map((r) => ns.slice(5 * r, 5 * r + 5));
};
const QW = ["quarter", "half", "three quarters"];
const nr = (n: number) => {
  let x = n;
  while (x >= 10) x = String(x).split("").reduce((a, b) => a + Number(b), 0);
  return x === 9 ? 0 : x;
};
const digitSum = (n: number) => String(n).split("").reduce((a, b) => a + Number(b), 0);
const nineNums = (kind: number, seed: number) => {
  const h = (s: string) => hm(`n9:${kind}:${seed}:${s}`);
  if (kind === 0) return [100 + (h("a") % 9900), 0];
  if (kind === 1) return [100 + (h("a") % 900), 100 + (h("b") % 900)];
  return [12 + (h("a") % 88), 3 + (h("b") % 7)];
};
const pascal = (n: number) => {
  let row = [1];
  for (let i = 0; i < n; i++) row = [1, ...row.slice(1).map((x, j) => x + row[j]), 1];
  return row;
};
const choose = (n: number, k: number) => {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
};
const pascalFig = (R: number): Visual => tbl(["Row"], [...Array(R + 1)].map((_, i) => [choosesRow(i).join("   ")]));
const choosesRow = (n: number) => [...Array(n + 1)].map((_, k) => choose(n, k));
const to12 = (h: number, m: number) => `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
const to24 = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const h24Choices = ([kind, h, k]: number[]) => {
  const m = 5 * k;
  if (kind === 0) {
    const R = to24(h, m);
    const forgot = h >= 12 ? to24(h === 12 ? 0 : h - 12, m) : to24(h + 12, m);
    const ten = to24((h % 12) + 10, m);
    const swap = `${String(m).padStart(2, "0")}:${String(h).padStart(2, "0")}`;
    const four = [...new Set([R, forgot, ten, swap, to24(mod(h + 1, 24), m), to24(mod(h - 1, 24), m)])].slice(0, 4);
    return { list: shuffleBy(four, `h0:${h}:${k}`), R, forgot };
  }
  const R = to12(h, m);
  const ampm = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "p.m." : "a.m."}`;
  const ten = h >= 13 ? `${h - 10}:${String(m).padStart(2, "0")} p.m.` : null;
  const four = [...new Set([R, ampm, ...(ten ? [ten] : []), `${(h % 12 === 0 ? 12 : h % 12) === 12 ? 11 : (h % 12 === 0 ? 12 : h % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`, `${(h % 12 === 0 ? 12 : h % 12) === 1 ? 2 : (h % 12 === 0 ? 12 : h % 12) - 1}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`])].slice(0, 4);
  return { list: shuffleBy(four, `h1:${h}:${k}`), R, forgot: ampm, ten };
};
const minutesOf = (s: string) => {
  let t = /^(\d\d):(\d\d)$/.exec(s);
  if (t) return Number(t[1]) < 24 && Number(t[2]) < 60 ? 60 * Number(t[1]) + Number(t[2]) : -1;
  t = /^(\d{1,2}):(\d\d) (a\.m\.|p\.m\.)$/.exec(s);
  if (!t) return -1;
  const hh = Number(t[1]);
  return 60 * ((hh === 12 ? 0 : hh) + (t[3] === "p.m." ? 12 : 0)) + Number(t[2]);
};

const GAP02: Def[] = [
  // ================================================================ MATH.geometry.maps-directions
  {
    id: "abdir",
    arity: 3,
    title: "The four directions: North, South, East and West",
    competency: MAPS,
    type: "choice",
    // [kind, a, b]: kind 0 facing DIRS[a], turn TURNS[b]; kind 1 the map of seed a (b 0: which place is in a direction, 1: in which direction is a place); kind 2 facing DIRS[a], what is on the left (b 0), right (1) or behind (2)
    parse: none,
    reject: guard([[0, 2], [0, 39], [0, 2]], ([kind, a, b]) => (kind === 1 ? b <= 1 : a <= 3), "A direction and a turn, or a map with four places round a centre."),
    prompt: ([kind, a, b]) => {
      if (kind === 0) return `${name(a + b)} faces ${DIRS[a]} and ${TURNS[b]}. Which way does ${name(a + b)} face now?`;
      if (kind === 2) return `${name(a + 2 * b)} stands facing ${DIRS[a]}. Which direction is ${b === 2 ? `behind ${name(a + 2 * b)}` : `on ${name(a + 2 * b)}'s ${["left", "right"][b]}`}?`;
      const m = dirMap(a);
      const d = hm(`dd:${a}`) % 4;
      return b === 0 ? `In the map, North is at the top. Which place is to the ${DIRS[d]} of the ${m.centre}?` : `In the map, North is at the top. In which direction is the ${m.around[d]} from the ${m.centre}?`;
    },
    choices: dirChoices,
    solve: (p) => {
      const r = dirAnswer(p);
      return { steps: [st("direction", "use the directions", MAPS, [p[0], p[1], p[2]], r)], answer: dirChoices(p).indexOf(r) };
    },
    // independent: directions as angles clockwise from North (turn right +90°, left −90°, about 180°); the map by the signs of the moves across and up
    validate: (p, v) => {
      const [kind, a, b] = p;
      const c = dirChoices(p)[v as number];
      if (!c) return false;
      if (kind === 0) return DIR_DEG[c] === mod(DIR_DEG[DIRS[a]] + [90, -90, 180][b], 360);
      if (kind === 2) return DIR_DEG[c] === mod(DIR_DEG[DIRS[a]] + [-90, 90, 180][b], 360);
      const m = dirMap(a);
      const [cx, cy] = [m.pts[0][0], m.pts[0][1]];
      const dirOf = (x: number, y: number) => (y > cy ? "North" : y < cy ? "South" : x > cx ? "East" : "West");
      const d = hm(`dd:${a}`) % 4;
      if (b === 0) {
        const pt = m.pts.find((q) => q[2] === c);
        return !!pt && pt[2] !== m.centre && dirOf(pt[0], pt[1]) === DIRS[d];
      }
      const pt = m.pts.find((q) => q[2] === m.around[d])!;
      return dirOf(pt[0], pt[1]) === c;
    },
    bugs: (p) => {
      const [kind, a, b] = p;
      const cs = dirChoices(p);
      if (kind === 0 || kind === 2) {
        if (b === 2) return [B("no-turn", "procedural", MAPS, kind === 0 ? "The turn was not made. A half turn makes you face the opposite way." : "The direction faced was given. Behind is the opposite way.", cs.indexOf(DIRS[a]))];
        const other = kind === 0 ? DIRS[mod(a + (b === 0 ? 3 : 1), 4)] : DIRS[mod(a + (b === 0 ? 1 : 3), 4)];
        return [
          B("left-right", "conceptual", MAPS, "Left and right were mixed up. Facing North, East is on your right and West on your left.", cs.indexOf(other)),
          B("opposite", "conceptual", MAPS, "The opposite direction was given. A quarter turn moves to the next direction, not across.", cs.indexOf(DIRS[mod(a + 2, 4)])),
        ];
      }
      const m = dirMap(a);
      const d = hm(`dd:${a}`) % 4;
      return b === 0
        ? [B("opposite", "conceptual", MAPS, `The place to the ${DIRS[(d + 2) % 4]} was chosen. ${DIRS[d]} is the other way.`, ix(cs, m.around[(d + 2) % 4]))]
        : [B("from-other-end", "conceptual", MAPS, `The direction from the ${m.around[d]} to the ${m.centre} was given. Start at the ${m.centre} and look towards the ${m.around[d]}.`, cs.indexOf(DIRS[(d + 2) % 4]))];
    },
    variants: () => [],
    explain: (s) => `The answer is ${s.value}.`,
    domain: [[0, 2], [0, 39], [0, 2]],
    difficulty: ([kind, , b]) => (kind === 1 ? 1 : b === 2 ? 2 : 3),
    figure: ([kind, a]) => (kind === 1 ? { type: "plane", points: dirMap(a).pts, range: 6, quadrant: 1 } : tbl(["", "North", ""], [["West", "you", "East"], ["", "South", ""]])),
    word: ([kind, a, b]) => {
      if (kind === 0) return `A scout at camp faces ${DIRS[a]} for the flag song and then ${TURNS[b]}. Which way does the scout face now?`;
      if (kind === 2) return `${name(a)} stands at the school gate facing ${DIRS[a]}, as the teacher asked. Which direction is ${b === 2 ? "behind" : `on the ${["left", "right"][b]} of`} ${name(a)}?`;
      const m = dirMap(a);
      const d = hm(`dd:${a}`) % 4;
      return b === 0 ? `${name(a)}'s village map is in the picture, with North at the top. ${name(a)} walks from the ${m.centre} towards the ${DIRS[d]}. Which place does ${name(a)} reach?` : `${name(a)}'s village map is in the picture, with North at the top. Which way does ${name(a)} walk to go straight from the ${m.centre} to the ${m.around[d]}?`;
    },
    teach: {
      idea: "The four main directions are North, East, South and West. Facing North, East is on your right, West on your left and South behind you. On maps North is at the top.",
      method: "Picture yourself facing the direction given. A quarter turn right goes North → East → South → West; a quarter turn left goes the other way; a half turn faces the opposite way.",
      visual: () => tbl(["", "North", ""], [["West", "●", "East"], ["", "South", ""]]),
      alternatives: [
        { id: "sun", title: "Use the sun", kind: "conceptual", text: ["The sun rises in the East. Stand with your right arm pointing at the morning sun.", "You are facing North, your left arm points West and South is behind you."] },
      ],
    },
    limits: "The four main directions with quarter and half turns, and four places round a centre on a map; North-East and other in-between directions are not asked.",
  },
  {
    id: "abroute",
    arity: 2,
    title: "Distances on a map: using a scale and choosing the shortest route",
    competency: MAPS,
    type: "integer",
    mc: true,
    // [kind, seed]: kind 0 a walk described with directions on a squared map with a scale; kind 1 the shortest route between two towns in a road table
    parse: none,
    reject: guard([[0, 1], [0, 99]], ([kind, seed]) => {
      if (kind === 0) return true;
      const r = routeOf(seed);
      return r.p + r.q !== r.r + r.s && Math.min(r.p + r.q, r.r + r.s, r.t) !== r.t && ![...Array(seed).keys()].some((s0) => JSON.stringify(routeOf(s0)) === JSON.stringify(r));
    }, "A walk on the map, or a road table with one shortest route."),
    prompt: ([kind, seed]) => {
      if (kind === 0) {
        const w = pathOf(seed);
        return `On the map, each side of a square stands for ${w.S} ${w.unit}. ${name(seed)} starts at S, walks ${w.dx} square${w.dx > 1 ? "s" : ""} ${w.ew ? "West" : "East"} and then ${w.dy} square${w.dy > 1 ? "s" : ""} ${w.ns ? "South" : "North"} to E. How far does ${name(seed)} walk, in ${w.unit === "km" ? "kilometres" : "metres"}?`;
      }
      const r = routeOf(seed);
      void r;
      return `The table shows the roads between four villages and their lengths. There are three ways to go from ${ROAD_NAMES[0]} to ${ROAD_NAMES[3]}: through ${ROAD_NAMES[1]}, through ${ROAD_NAMES[2]}, or by the direct road. How long is the shortest route, in km?`;
    },
    solve: ([kind, seed]) => {
      if (kind === 0) {
        const w = pathOf(seed);
        return { steps: [st("squares", "add the squares", ADD, [w.dx, w.dy], w.dx + w.dy), st("scale", "use the scale", MAPS, [w.dx + w.dy, w.S], (w.dx + w.dy) * w.S)], answer: (w.dx + w.dy) * w.S };
      }
      const r = routeOf(seed);
      const ans = Math.min(r.p + r.q, r.r + r.s, r.t);
      return { steps: [st("routes", "add each route", ADD, [r.p + r.q, r.r + r.s, r.t], `${r.p + r.q}, ${r.r + r.s}, ${r.t}`), st("shortest", "compare", MAPS, [], ans)], answer: ans };
    },
    // independent: walk the path square by square on the grid; for the roads, search every path that does not visit a village twice
    validate: ([kind, seed], v) => {
      if (kind === 0) {
        const w = pathOf(seed);
        let [x, y] = w.start;
        let d = 0;
        for (let i = 0; i < w.dx; i++) {
          x += w.ew ? -1 : 1;
          d += w.S;
        }
        for (let i = 0; i < w.dy; i++) {
          y += w.ns ? -1 : 1;
          d += w.S;
        }
        return v === d && x >= 0 && y >= 0;
      }
      const r = routeOf(seed);
      const roads: [number, number, number][] = [[0, 1, r.p], [1, 3, r.q], [0, 2, r.r], [2, 3, r.s], [0, 3, r.t]];
      let best = Infinity;
      const go = (at: number, seen: number[], len: number) => {
        if (at === 3) best = Math.min(best, len);
        else for (const [a, b, l] of roads) {
          const nx = a === at ? b : b === at ? a : -1;
          if (nx >= 0 && !seen.includes(nx)) go(nx, [...seen, nx], len + l);
        }
      };
      go(0, [0], 0);
      return v === best;
    },
    bugs: ([kind, seed]) => {
      if (kind === 0) {
        const w = pathOf(seed);
        return [
          B("squares-not-scale", "conceptual", MAPS, `The squares were counted but the scale was not used. Each square stands for ${w.S} ${w.unit}.`, w.dx + w.dy),
          B("one-direction", "procedural", MAPS, "Only the first part of the walk was counted. Add both parts of the walk.", w.dx * w.S),
          B("second-part-only", "procedural", MAPS, "Only the second part of the walk was counted. Add both parts of the walk.", w.dx === w.dy ? null : w.dy * w.S),
        ];
      }
      const r = routeOf(seed);
      const ans = Math.min(r.p + r.q, r.r + r.s, r.t);
      return [
        B("direct-is-shortest", "conceptual", MAPS, "The direct road was taken to be the shortest. A road with no village on the way is not always shorter: add the lengths and compare.", r.t !== ans ? r.t : null),
        B("other-route", "procedural", ADD, "The longer of the two routes through a village was chosen. Work out both totals and take the smaller one.", Math.max(r.p + r.q, r.r + r.s) !== ans ? Math.max(r.p + r.q, r.r + r.s) : null),
        B("shortest-road", "conceptual", MAPS, "The shortest single road was given. A route is made of all the roads along it, added together.", Math.min(r.p, r.q, r.r, r.s)),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "squares" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value} squares.` : s.id === "scale" ? `${s.inputs[0]} × ${s.inputs[1]} = ${s.value}.` : s.id === "routes" ? `The three routes are ${s.value} km long.` : `The shortest is ${s.value} km.`),
    domain: [[0, 1], [0, 99]],
    difficulty: ([kind, seed]) => (kind === 0 ? (pathOf(seed).S <= 5 ? 1 : 2) : 3),
    figure: ([kind, seed]) => {
      if (kind === 0) {
        const w = pathOf(seed);
        const mid: [number, number] = [w.start[0] + (w.ew ? -w.dx : w.dx), w.start[1]];
        const end: [number, number] = [mid[0], mid[1] + (w.ns ? -w.dy : w.dy)];
        return { type: "plane", points: [[w.start[0], w.start[1], "S"], [end[0], end[1], "E"]], segments: [[w.start, mid], [mid, end]], range: 6, quadrant: 1 };
      }
      const r = routeOf(seed);
      return tbl(["Road", "Length (km)"], [[`${ROAD_NAMES[0]} – ${ROAD_NAMES[1]}`, r.p], [`${ROAD_NAMES[1]} – ${ROAD_NAMES[3]}`, r.q], [`${ROAD_NAMES[0]} – ${ROAD_NAMES[2]}`, r.r], [`${ROAD_NAMES[2]} – ${ROAD_NAMES[3]}`, r.s], [`${ROAD_NAMES[0]} – ${ROAD_NAMES[3]} (direct)`, r.t]]);
    },
    word: ([kind, seed]) => {
      if (kind === 0) {
        const w = pathOf(seed);
        return w.unit === "km"
          ? `On a district map, a bus goes from the depot S ${w.dx} square${w.dx > 1 ? "s" : ""} ${w.ew ? "West" : "East"}, then ${w.dy} square${w.dy > 1 ? "s" : ""} ${w.ns ? "South" : "North"} to the town E. Each side of a square on the map stands for ${w.S} km. How far does the bus go, in kilometres?`
          : `A delivery rider in Coimbatore follows the map: from the shop S, ${w.dx} block${w.dx > 1 ? "s" : ""} ${w.ew ? "West" : "East"}, then ${w.dy} block${w.dy > 1 ? "s" : ""} ${w.ns ? "South" : "North"} to the house E. Each block on the map is ${w.S} m. How far does the rider go, in metres?`;
      }
      return `A milk van goes every morning from ${ROAD_NAMES[0]} to ${ROAD_NAMES[3]}. Using the roads in the table, what is the shortest distance it can drive, in km?`;
    },
    teach: {
      idea: "A map scale tells how much real distance one unit on the map stands for. A route's length is the sum of its parts; the shortest route is the one with the smallest total.",
      method: "Count the squares along the path and multiply by the scale. For routes, add the roads along each one, then compare the totals.",
      visual: ([kind, seed]) => (kind === 0 ? tbl(["On the map", "Real distance"], [["1 square", `${pathOf(seed).S} ${pathOf(seed).unit}`]]) : tbl(["Route", "Total"], [["through a village", "add the two roads"], ["direct", "one road"]])),
      alternatives: [
        { id: "string", title: "Use a string", kind: "conceptual", text: ["Lay a string along the path on the map, then hold it against the scale.", "Each scale length along the string stands for the same real distance."] },
      ],
    },
    limits: "Two-part walks along the grid with whole-number scales, and three routes between two villages; drawing routes is an educator-marked task.",
  },

  // ================================================================ MATH.geometry.shape-properties: straight and curved, diagonals, curved solids
  {
    id: "abcurve",
    arity: 3,
    title: "Shapes with straight sides, curved sides or both",
    competency: SHAPE,
    type: "integer",
    mc: true,
    // [len, seed, kind]: a row of len shapes; kind 0 only straight sides, 1 any curved side, 2 both straight and curved
    parse: none,
    reject: guard([[6, 9], [0, 29], [0, 2]], ([len, seed]) => {
      const r = curveRow(len, seed);
      return [0, 1, 2].every((k) => r.some((c) => CKIND(c) === k));
    }, "A row of 6 to 9 shapes with some of each kind."),
    prompt: ([, , kind]) => `How many shapes in the picture have ${["only straight sides", "at least one curved side", "both straight and curved sides"][kind]}?`,
    solve: ([len, seed, kind]) => {
      const r = curveRow(len, seed);
      const ans = r.filter((c) => (kind === 0 ? CKIND(c) === 0 : kind === 1 ? CKIND(c) >= 1 : CKIND(c) === 2)).length;
      return { steps: [st("sort", "sort by sides", SHAPE, [kind], ans)], answer: ans };
    },
    // independent: look up each shape's kinds of side and test the rule asked for
    validate: ([len, seed, kind], v) => v === curveRow(len, seed).filter((c) => (kind === 0 ? !CSYM[c].curved : kind === 1 ? CSYM[c].curved : CSYM[c].curved && CSYM[c].straight)).length,
    bugs: ([len, seed, kind]) => {
      const r = curveRow(len, seed);
      const n = (k: number) => r.filter((c) => CKIND(c) === k).length;
      return kind === 0
        ? [B("half-as-straight", "conceptual", SHAPE, "The half circles were counted as straight. A half circle has one straight side but also a curved one.", n(0) + n(2))]
        : kind === 1
          ? [B("full-circles-only", "conceptual", SHAPE, "Only the full circles were counted. A half circle has a curved side too.", n(1)), B("counted-straight", "procedural", SHAPE, "The shapes with only straight sides were counted instead.", n(0) !== n(1) + n(2) ? n(0) : null)]
          : [B("any-curve", "conceptual", SHAPE, "Every shape with a curve was counted. A circle has no straight side; only the half circles have both.", n(1) + n(2))];
    },
    variants: () => [],
    explain: (s) => `There are ${s.value}.`,
    domain: [[6, 9], [0, 29], [0, 2]],
    cap: 300,
    difficulty: ([len, , kind]) => (kind === 0 && len <= 7 ? 1 : kind === 2 ? 3 : 2),
    figure: ([len, seed]) => tbl(curveRow(len, seed).map((_, i) => String(i + 1)), [curveRow(len, seed)]),
    word: ([len, seed, kind]) => `${name(seed + len)} cuts the paper shapes in the picture for a craft project. How many of them have ${["only straight edges", "at least one curved edge", "both straight and curved edges"][kind]}?`,
    teach: {
      idea: "A side can be straight, like the side of a triangle, or curved, like the edge of a circle. A half circle has one straight side and one curved side.",
      method: "Run a finger along the edge of each shape. If it never bends, the side is straight; if it bends, it is curved. Sort the shapes, then count.",
      visual: () => tbl(["Only straight", "Only curved", "Both"], [["▲ ■", "● ○", "◖ ◗"]]),
      alternatives: [
        { id: "ruler", title: "The ruler test", kind: "conceptual", text: ["Lay a ruler along each side.", "A straight side lies along the ruler all the way; a curved side moves away from it."] },
      ],
    },
    limits: "Triangles, squares, rectangles, circles and half circles in a row; other curved shapes are not drawn.",
  },
  {
    id: "abdiag",
    arity: 5,
    title: "Sides, corners and diagonals of flat shapes, and sorting by them",
    competency: SHAPE,
    type: "integer",
    mc: true,
    // kind 0 [0, s1, k1, s2*4+q, k2]: q 0 sides, 1 corners, 2 diagonals; kind 1 [1, seed, prop, 0, 0]: how many of six named shapes have DPROPS[prop]
    parse: none,
    reject: guard([[0, 1], [0, 39], [0, 3], [0, 23], [0, 3]], ([kind, a, b, c, d]) => {
      if (kind === 1) return c === 0 && d === 0 && a <= 39 && new Set(dList(a)).size >= 4;
      const s2 = Math.floor(c / 4);
      const q = c % 4;
      return a <= 4 && b >= 1 && b <= 3 && s2 <= 5 && q <= 2 && (d === 0 ? s2 === 0 : s2 !== a && !(s2 === 5 && q === 2)) && (q !== 2 || a >= 1 || d > 0);
    }, "Up to 3 each of two kinds of shape, or six shapes to sort."),
    prompt: ([kind, a, b, c, d]) => {
      if (kind === 1) return `Here are six shapes: ${dList(a).map((i) => `a ${DSH[i][0]}`).join(", ")}. How many of them ${DPROPS[b]}? (Count each one in the list.)`;
      const s2 = Math.floor(c / 4);
      const q = c % 4;
      if (b === 1 && d === 0) return `How many ${DQ[q]} does a ${DSH[a][0]} have?`;
      return `There ${b === 1 ? "is" : "are"} ${b} ${b === 1 ? DSH[a][0] : DSH[a][1]}${d ? ` and ${d} ${d === 1 ? DSH[s2][0] : DSH[s2][1]}` : ""}. How many ${DQ[q]} do they have in all?`;
    },
    solve: ([kind, a, b, c, d]) => {
      if (kind === 1) {
        const ans = dList(a).filter((i) => dprop(b, i)).length;
        return { steps: [st("sort", "check each shape", SHAPE, [DPROPS[b]], ans)], answer: ans };
      }
      const s2 = Math.floor(c / 4);
      const q = c % 4;
      const per = (i: number) => (q === 2 ? DIAG[i] : DSH[i][2]);
      const ans = b * per(a) + d * per(s2);
      return { steps: [st("each", "count for one shape", SHAPE, [DSH[a][0], DQ[q]], per(a)), ...(d ? [st("each2", "count for one shape", SHAPE, [DSH[s2][0], DQ[q]], per(s2))] : []), st("total", "add", ADD, [b, d], ans)], answer: ans };
    },
    // independent: a diagonal joins two corners that are not next to each other: from each of n corners n − 3 of them, each counted twice
    validate: ([kind, a, b, c, d], v) => {
      const n = (i: number) => DSH[i][2];
      const diag = (i: number) => (n(i) < 3 ? 0 : (n(i) * (n(i) - 3)) / 2);
      if (kind === 1) {
        const test = (i: number) => [diag(i) === 2, diag(i) === 0, n(i) > 4, n(i) === 4][b];
        return v === dList(a).filter(test).length;
      }
      const s2 = Math.floor(c / 4);
      const q = c % 4;
      const per = (i: number) => (q === 2 ? diag(i) : n(i));
      return v === b * per(a) + d * per(s2);
    },
    bugs: ([kind, a, b, c, d]) => {
      if (kind === 1) {
        const L = dList(a);
        return [
          B("circle-sides", "conceptual", SHAPE, "A circle was counted as if it had sides or diagonals. A circle has no sides, no corners and no diagonals.", b === 1 && L.includes(5) ? L.filter((i) => dprop(b, i)).length - L.filter((i) => i === 5).length : null),
          B("rectangle-square", "conceptual", SHAPE, "The rectangle was left out. A rectangle has 4 sides, 4 corners and 2 diagonals, just like a square.", (b === 0 || b === 3) && L.includes(2) ? L.filter((i) => dprop(b, i)).length - L.filter((i) => i === 2).length : null),
        ];
      }
      const s2 = Math.floor(c / 4);
      const q = c % 4;
      const ans = b * (q === 2 ? DIAG[a] : DSH[a][2]) + d * (q === 2 ? DIAG[s2] : DSH[s2][2]);
      return q === 2
        ? [
          B("sides-for-diagonals", "conceptual", SHAPE, "The sides were counted instead of the diagonals. A diagonal is a straight line inside the shape joining two corners that are not next to each other.", b * DSH[a][2] + d * DSH[s2][2]),
          B("one-corner-only", "procedural", SHAPE, "Only the diagonals from one corner were counted. Draw the diagonals from every corner (each one is shared by two corners).", b * Math.max(0, DSH[a][2] - 3) + d * Math.max(0, DSH[s2][2] - 3) !== ans ? b * Math.max(0, DSH[a][2] - 3) + d * Math.max(0, DSH[s2][2] - 3) : null),
        ]
        : [
          B("one-of-each", "procedural", SHAPE, "Each kind of shape was counted only once. Every shape has its own sides and corners.", b > 1 || d > 1 ? DSH[a][2] + (d ? DSH[s2][2] : 0) : null),
          B("rectangle-two", "conceptual", SHAPE, "A rectangle was given only 2 sides (a long one and a short one). It has 4 sides: two long and two short.", a === 2 || (s2 === 2 && d) ? ans - 2 * (a === 2 ? b : d) : null),
        ];
    },
    variants: () => [],
    explain: (s) => (s.id === "each" || s.id === "each2" ? `A ${s.inputs[0]} has ${s.value} ${s.inputs[1]}.` : `That makes ${s.value}.`),
    domain: [[0, 1], [0, 39], [0, 3], [0, 23], [0, 3]],
    // level@1: diagonals are later work: of squares and rectangles Grade 4, of pentagons and hexagons Grade 5
    grade: ([kind, a, b, c, d]) => {
      if (kind === 1) return b <= 1 ? 5 : 2;
      if (c % 4 !== 2) return 2;
      return a >= 3 || (d > 0 && Math.floor(c / 4) >= 3) ? 5 : 4;
    },
    cap: 300,
    difficulty: ([kind, a, b, c, d]) => (kind === 1 ? 2 : c % 4 === 2 ? 3 : b === 1 && d === 0 && a <= 2 ? 1 : 2),
    figure: ([kind, a, b, c, d]) => {
      if (kind === 1) return tbl(["Shapes"], dList(a).map((i) => [DSH[i][0]]));
      if (b === 1 && d === 0) return a === 2 ? { type: "shape", kind: "rectangle", diagonals: c % 4 === 2 } : a === 1 ? { type: "shape", kind: "square", diagonals: c % 4 === 2 } : { type: "shape", sides: DSH[a][2], name: DSH[a][0] };
      return tbl(["Shape", "How many"], [[DSH[a][1], b], ...(d ? [[DSH[Math.floor(c / 4)][1], d]] : [])]);
    },
    word: ([kind, a, b, c, d]) => {
      if (kind === 1) return `${name(a)} sorts these paper shapes for a class chart: ${dList(a).map((i) => `a ${DSH[i][0]}`).join(", ")}. How many of them go in the group of shapes that ${DPROPS[b]}?`;
      const s2 = Math.floor(c / 4);
      const q = c % 4;
      return `${name(a + b)} makes ${b} ${b === 1 ? DSH[a][0] : DSH[a][1]}${d ? ` and ${d} ${d === 1 ? DSH[s2][0] : DSH[s2][1]}` : ""} from straws${q === 2 ? ", and adds a thread for every diagonal" : ""}. How many ${q === 0 ? "straws are used for the sides" : q === 1 ? (b + d === 1 ? "corners does the shape have" : "corners do the shapes have") : "threads are needed"}?`;
    },
    teach: {
      idea: "A shape with straight sides has as many corners as sides. A diagonal joins two corners that are not next to each other: a triangle has none, a square or rectangle 2, a pentagon 5, a hexagon 9.",
      method: "For each shape, count its sides (or corners, or diagonals), then add for every shape. To sort, check each shape against the rule and count the ones that fit.",
      visual: () => ({ type: "shape", kind: "rectangle", diagonals: true }),
      alternatives: [
        { id: "draw", title: "Draw them from each corner", kind: "procedural", text: ["Put a finger on one corner and draw lines to every corner that is not next to it.", "Do this for each corner, but do not draw a line twice."], visual: () => ({ type: "shape", kind: "square", diagonals: true }) },
      ],
    },
    limits: "Triangles, squares, rectangles, pentagons, hexagons (and circles when sorting), up to 3 of each of two kinds.",
  },
  {
    id: "abcurved",
    arity: 5,
    title: "Faces, curved surfaces, edges and corners of cylinders, cones and spheres",
    competency: SHAPE,
    type: "integer",
    mc: true,
    // [s1, k1, s2, k2, q]: k1 of CS[s1] (a curved solid) and k2 of CS[s2]; q: CQ[q]
    parse: none,
    reject: guard([[0, 2], [1, 3], [0, 4], [0, 3], [0, 4]], ([s1, k1, s2, k2]) => (k2 === 0 ? s2 === 0 : s2 !== s1) && k1 + k2 <= 5, "Up to 5 solids: cylinders, cones or spheres with one other kind."),
    prompt: (p) => {
      const [s1, k1, , k2, q] = p;
      if (k1 === 1 && k2 === 0 && q < 4) return `How many ${CQ[q]} does the ${CS[s1][0]} in the picture have?`;
      return `${name(p[0] + p[2] + p[4])} has ${csList(p)}. How many ${q === 4 ? CQ[4] : `${CQ[q]} do they have in all`}${q === 4 ? " are there" : ""}?`;
    },
    solve: (p) => {
      const [s1, , s2, k2, q] = p;
      const ans = csAns(p);
      return { steps: [st("each", "count for one solid", SHAPE, [CS[s1][0], CQ[q]], q === 4 ? (s1 <= 1 ? 1 : 0) : CS_FEC[s1][q]), ...(k2 ? [st("each2", "count for one solid", SHAPE, [CS[s2][0], CQ[q]], q === 4 ? (s2 <= 1 ? 1 : 0) : CS_FEC[s2][q])] : []), st("total", "add", ADD, [], ans)], answer: ans };
    },
    // independent: build each solid from its surfaces: a flat face meeting the curved surface makes an edge; a cone's
    // curved surface closes to a point (a corner); a box has 8 corners with 3 edges at each (12 edges) and faces F = E − V + 2
    validate: ([s1, k1, s2, k2, q], v) => {
      const props = (s: number) => {
        if (s >= 3) return { flat: 12 - 8 + 2, curved: 0, edges: (3 * 8) / 2, corners: 8 };
        const flat = s === 0 ? 2 : s === 1 ? 1 : 0;
        return { flat, curved: 1, edges: flat, corners: s === 1 ? 1 : 0 };
      };
      const val = (s: number) => {
        const x = props(s);
        return [x.flat, x.curved, x.edges, x.corners, x.flat > 0 && x.curved > 0 ? 1 : 0][q];
      };
      return v === k1 * val(s1) + k2 * val(s2);
    },
    bugs: (p) => {
      const [s1, k1, s2, k2, q] = p;
      const ans = csAns(p);
      const n = (s: number) => (s1 === s ? k1 : 0) + (s2 === s && k2 ? k2 : 0);
      return [
        B("curved-as-face", "conceptual", SHAPE, "The curved surface was counted as a flat face. A cylinder has 2 flat faces and 1 curved surface; a sphere has no flat face.", q === 0 && n(0) + n(1) + n(2) ? ans + n(0) + n(1) + n(2) : null),
        B("cone-no-corner", "conceptual", SHAPE, "The point of the cone was not counted. A cone has one corner (vertex) at its tip.", q === 3 && n(1) ? ans - n(1) : null),
        B("sphere-edge", "conceptual", SHAPE, "The sphere was given an edge or a face. A sphere has one curved surface and no edges or corners.", (q === 2 || q === 3) && n(2) ? ans + n(2) : null),
        B("one-of-each", "procedural", SHAPE, "Each kind of solid was counted only once. Every solid has its own faces, edges and corners.", (k1 > 1 || k2 > 1) && q < 4 ? CS_FEC[s1][q] + (k2 ? CS_FEC[s2][q] : 0) : null),
        B("sphere-both", "conceptual", SHAPE, "The sphere was counted as having both. A sphere has only a curved surface.", q === 4 && n(2) ? ans + n(2) : null),
      ].filter((b) => b.predict !== ans);
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `In all: ${s.value}.` : `A ${s.inputs[0]}: ${s.value}.`),
    domain: [[0, 2], [1, 3], [0, 4], [0, 3], [0, 4]],
    cap: 300,
    difficulty: ([, k1, , k2, q]) => (k1 === 1 && k2 === 0 ? (q <= 1 ? 1 : 2) : q === 4 ? 2 : 3),
    figure: (p) => (p[1] === 1 && p[3] === 0 ? { type: "solid", name: CS[p[0]][0] } : tbl(["Solid", "How many"], [[CS[p[0]][1], p[1]], ...(p[3] ? [[CS[p[2]][1], p[3]]] : [])])),
    word: (p) => {
      const q = p[4];
      return q === 4
        ? `${name(p[1] + p[3])} has these blocks to sort: ${csList(p)}. Blocks that can both roll and stand flat (they have a flat face and a curved surface) go in one box. How many go in that box?`
        : `${name(p[1] + p[3])} is decorating clay models of ${csList(p)}. ${["Each flat face gets a sticker. How many stickers?", "Each curved surface is painted red. How many surfaces are painted?", "A gold line goes along every edge. How many edges get a gold line?", "A bead goes on every corner (vertex). How many beads?"][q]}`;
    },
    teach: {
      idea: "A cylinder has 2 flat faces, 1 curved surface, 2 curved edges and no corners; a cone has 1 flat face, 1 curved surface, 1 edge and 1 corner (its tip); a sphere has only a curved surface.",
      method: "Picture each solid: count its flat faces, its curved surfaces, the edges where surfaces meet and the corners. Then add for every solid.",
      visual: ([s1]) => ({ type: "solid", name: CS[s1][0] }),
      alternatives: [
        { id: "roll", title: "Roll and stand", kind: "conceptual", text: ["A solid with a curved surface can roll; one with a flat face can stand still.", "A cylinder and a cone can do both; a sphere only rolls; a cube only stands."], visual: () => ({ type: "solid", name: "cone" }) },
      ],
    },
    limits: "Cylinders, cones and spheres, with cubes or cuboids, up to 5 solids; prisms other than cuboids are not asked.",
  },

  // ================================================================ MATH.geometry.line-types: lines in objects
  {
    id: "abobj",
    arity: 2,
    title: "Everyday things with straight or curved edges",
    competency: LINES,
    type: "integer",
    mc: true,
    // [seed, q]: six everyday things; q 0 how many have only straight edges, 1 how many are curved
    parse: none,
    reject: guard([[0, 59], [0, 1]], ([seed]) => {
      const r = objRow(seed);
      const c = r.filter((o) => o[1] === 0).length;
      return c >= 1 && c <= 5;
    }, "Six everyday things with some of each kind."),
    prompt: ([seed, q]) => `Think of the outline of each of these things: ${objRow(seed).map((o) => o[0]).join(", ")}. How many of them have ${q ? "a curved outline" : "only straight lines in their outline"}?`,
    solve: ([seed, q]) => {
      const hits = objRow(seed).filter((o) => o[1] === q);
      return { steps: [st("sort", "sort", LINES, hits.map((o) => o[0]), hits.length)], answer: hits.length };
    },
    // independent: count the other kind and take it away from six
    validate: ([seed, q], v) => v === 6 - objRow(seed).filter((o) => o[1] !== q).length,
    bugs: ([seed, q]) => {
      const c = objRow(seed).filter((o) => o[1] === q).length;
      return [
        B("other-kind", "procedural", LINES, `The things with ${q ? "only straight lines" : "a curved outline"} were counted instead.`, 6 - c !== c ? 6 - c : null),
        B("missed-one", "procedural", COUNT, "One thing was missed. Go through the list and tick each one that fits.", c >= 2 ? c - 1 : null),
      ];
    },
    variants: () => [],
    explain: (s) => `They are: ${(s.inputs as string[]).join(", ")}, so ${s.value}.`,
    domain: [[0, 59], [0, 1]],
    difficulty: ([, q]) => (q ? 1 : 2),
    figure: ([seed]) => tbl(["Things"], objRow(seed).map((o) => [o[0]])),
    word: ([seed, q]) => `${name(seed)} draws these things for an art class: ${objRow(seed).map((o) => o[0]).join(", ")}. How many of the drawings need ${q ? "a curved line" : "only straight lines, drawn with a ruler"}?`,
    teach: {
      idea: "Some things have outlines made only of straight lines, like a book or a door; others have curved outlines, like a bangle or a plate.",
      method: "Picture each thing and trace its outline in the air. If your finger never has to bend, the lines are straight; if it bends, the outline is curved.",
      visual: () => tbl(["Straight", "Curved"], [["book, door, ruler", "bangle, plate, ball"]]),
      alternatives: [
        { id: "ruler", title: "Could you draw it with a ruler?", kind: "procedural", text: ["Ask: can I draw this thing's outline using only a ruler?", "If yes, it has only straight lines; if you need to draw freehand, it has a curve."] },
      ],
    },
    limits: "Familiar things whose outline is clearly straight or clearly curved; things with both kinds are not used.",
  },

  // ================================================================ MATH.measurement.capacity: ordering containers, displacement
  {
    id: "abcupord",
    arity: 4,
    title: "Ordering containers by how much they hold",
    competency: CAP,
    type: "tuple",
    mc: true,
    // [k, q, hq, dir]: k containers; capacity order q, height order hq (different); dir 0 most first, 1 least first
    parse: none,
    reject: guard([[3, 4], [0, 23], [0, 23], [0, 1]], ([k, q, hq]) => q < factK(k) && hq < factK(k) && q !== hq, "Three or four containers whose heights do not match how much they hold."),
    prompt: ([k, , , dir]) => `The table shows how many cups of water fill each container, and how tall each one is. Put the containers in order from the one that holds the ${dir ? "least" : "most"} to the one that holds the ${dir ? "most" : "least"}. Write their numbers with commas.`,
    solve: (p) => {
      const cs = contsOf(p);
      const order = cs.map((_, i) => i + 1).sort((a, b) => (p[3] ? cs[a - 1].cups - cs[b - 1].cups : cs[b - 1].cups - cs[a - 1].cups));
      return { steps: [st("order", "compare cups", CAP, cs.map((c) => c.cups), listC(order))], answer: listC(order) };
    },
    // independent: every container named once, and each one holds more (or fewer) cups than the next
    validate: (p, v) => {
      const xs = readNums(v);
      const cs = contsOf(p);
      if (!xs || xs.length !== p[0] || new Set(xs).size !== p[0] || xs.some((x) => x < 1 || x > p[0])) return false;
      return xs.every((x, i) => i === 0 || (p[3] ? cs[x - 1].cups > cs[xs[i - 1] - 1].cups : cs[x - 1].cups < cs[xs[i - 1] - 1].cups));
    },
    bugs: (p) => {
      const cs = contsOf(p);
      const by = (f: (c: { cups: number; height: number }) => number) => listC(cs.map((_, i) => i + 1).sort((a, b) => (p[3] ? f(cs[a - 1]) - f(cs[b - 1]) : f(cs[b - 1]) - f(cs[a - 1]))));
      const right = by((c) => c.cups);
      const tall = by((c) => c.height);
      const rev = listC(right.split(", ").reverse().map(Number));
      return [
        B("taller-holds-more", "conceptual", CAP, "The containers were ordered by height. A tall, thin container can hold less than a short, wide one; the cups tell how much each holds.", tall !== right ? tall : null),
        B("reversed", "procedural", CAP, `The order was turned round. Start with the one that holds the ${p[3] ? "least" : "most"}.`, rev),
        B("label-order", "procedural", CAP, "The numbers were written in counting order. Order them by the cups each one holds.", listC(cs.map((_, i) => i + 1)) !== right ? listC(cs.map((_, i) => i + 1)) : null),
      ];
    },
    distractors: (p) => {
      const cs = contsOf(p);
      const right = cs.map((_, i) => i + 1).sort((a, b) => (p[3] ? cs[a - 1].cups - cs[b - 1].cups : cs[b - 1].cups - cs[a - 1].cups));
      return right.slice(1).map((_, i) => {
        const o = [...right];
        [o[i], o[i + 1]] = [o[i + 1], o[i]];
        return listC(o);
      });
    },
    variants: () => [],
    explain: (s) => `By cups: ${s.value}.`,
    domain: [[3, 4], [0, 23], [0, 23], [0, 1]],
    cap: 300,
    difficulty: ([k, , , dir]) => (k === 3 && dir === 0 ? 1 : k === 3 ? 2 : 3),
    figure: (p) => tbl(["Number", "Container", "Height (cm)", "Cups of water it holds"], contsOf(p).map((c, i) => [i + 1, c.name, c.height, c.cups])),
    word: (p) => `${name(p[1] + p[2])}'s grandmother is filling containers with drinking water, as in the table. She wants to fill them in order from the one that holds the ${p[3] ? "least" : "most"} to the one that holds the ${p[3] ? "most" : "least"}. In what order should she fill them? Write their numbers with commas.`,
    teach: {
      idea: "How much a container holds is measured by how many cups of water fill it, not by how tall it looks.",
      method: "Read the cups for each container. Find the biggest number (or the smallest) and write that container first, then the next, and so on.",
      visual: (p) => ({ type: "bars", title: "cups", labels: contsOf(p).map((c) => c.name), values: contsOf(p).map((c) => c.cups), scale: 1 }),
      alternatives: [
        { id: "pour", title: "Pour and compare", kind: "conceptual", text: ["Fill one container and pour it into another.", "If it overflows, the first holds more. Do this two at a time to put them in order."] },
      ],
    },
    limits: "Three or four containers measured in the same cup; litres and millilitres are other families.",
  },
  {
    id: "abdisp",
    arity: 4,
    title: "Volume of an object from the rise in water level",
    competency: VOL,
    type: "integer",
    mc: true,
    // [kind, w, s, n]: water at 50·w ml; the object(s) take s·5 ml; kind 0 find the volume, 1 find the new reading, 2 n equal marbles: the volume of one
    parse: none,
    reject: guard([[0, 2], [2, 8], [2, 30], [1, 5]], ([kind, w, s, n]) => (kind === 2 ? n >= 2 && (5 * s) % n === 0 && (5 * s) / n >= 2 : n === 1) && 50 * w + 5 * s <= 500, "A jar up to 500 ml with water and one object (or equal marbles)."),
    prompt: ([kind, w, s, n]) => {
      const a = 50 * w;
      const b = a + 5 * s;
      return [
        `A measuring jar has water up to the ${a} ml mark. A stone is dropped in and sinks; the water rises to the ${b} ml mark. What is the volume of the stone, in cm³? (1 ml = 1 cm³)`,
        `A measuring jar has water up to the ${a} ml mark. A metal block of volume ${5 * s} cm³ is dropped in and sinks. To which mark (in ml) does the water rise? (1 ml = 1 cm³)`,
        `A measuring jar has water up to the ${a} ml mark. ${n} equal glass marbles are dropped in; the water rises to the ${b} ml mark. What is the volume of one marble, in cm³? (1 ml = 1 cm³)`,
      ][kind];
    },
    solve: ([kind, w, s, n]) => {
      const a = 50 * w;
      const b = a + 5 * s;
      const ans = [b - a, b, (b - a) / n][kind];
      return { steps: [st("rise", kind === 1 ? "add" : "subtract", kind === 1 ? ADD : SUB, [b, a], 5 * s), ...(kind === 2 ? [st("share", "share", GROUPS, [5 * s, n], ans)] : []), st("answer", "volume", VOL, [], ans)], answer: ans };
    },
    // independent: put the answer back: the water level and the object's volume must add up to the reading
    validate: ([kind, w, s, n], v) => {
      if (typeof v !== "number") return false;
      const a = 50 * w;
      const b = a + 5 * s;
      if (kind === 0) return a + v === b;
      if (kind === 1) return v - a === 5 * s;
      return a + n * v === b;
    },
    bugs: ([kind, w, s, n]) => {
      const a = 50 * w;
      const b = a + 5 * s;
      return kind === 1
        ? [B("subtracted", "conceptual", VOL, "The volume was taken away from the reading. The stone pushes the water up, so the level goes up by its volume.", a - 5 * s > 0 ? a - 5 * s : null)]
        : [
          B("final-reading", "conceptual", VOL, "The new reading was given. The water was already there; only the rise is the object's volume.", b),
          B("added-readings", "procedural", ADD, "The two readings were added. Take the first reading away from the second.", a + b),
          ...(kind === 2 ? [B("not-shared", "procedural", GROUPS, `The volume of all ${n} marbles was given. Share the rise equally among the ${n} marbles.`, 5 * s)] : []),
        ];
    },
    variants: () => [],
    explain: (s) => (s.id === "rise" ? `The water goes from ${s.inputs[1]} ml to ${s.inputs[0]} ml: a rise of ${s.value} ml.` : s.id === "share" ? `${s.inputs[0]} ÷ ${s.inputs[1]} = ${s.value}.` : `So the answer is ${s.value}.`),
    domain: [[0, 2], [2, 8], [2, 30], [1, 5]],
    cap: 300,
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 ? 2 : 3),
    // a zoomed scale round the readings, so the two marks stand apart
    figure: ([kind, w, s]) => {
      const from = Math.floor((50 * w - 10) / 50) * 50;
      const to = Math.ceil((50 * w + 5 * s + 10) / 50) * 50;
      return { type: "numberline", from, to, step: to - from <= 100 ? 10 : 25, marks: kind === 1 ? [50 * w] : [50 * w, 50 * w + 5 * s] };
    },
    word: ([kind, w, s, n]) => {
      const a = 50 * w;
      const b = a + 5 * s;
      return [
        `In the science lab, ${name(w + s)} pours water into a measuring jar up to ${a} ml and drops in a key, which sinks; the level goes up to ${b} ml. What is the volume of the key, in cm³?`,
        `${name(w + s)}'s measuring jar has ${a} ml of water. A small iron weight from a shop balance, of volume ${5 * s} cm³, is lowered in and sinks. What will the jar read, in ml?`,
        `${name(w + s)} has water up to ${a} ml in a measuring jar and drops in ${n} equal goli marbles; the level goes up to ${b} ml. What is the volume of one marble, in cm³?`,
      ][kind];
    },
    teach: {
      idea: "An object that sinks pushes away as much water as its own volume, so the water level rises by exactly the object's volume (1 ml takes up 1 cm³).",
      method: "Read the level before and after. The rise (after − before) is the volume. For several equal objects, share the rise equally.",
      visual: ([kind, w, s]) => ({ type: "numberline", from: 0, to: 500, step: 50, marks: [50 * w, 50 * w + 5 * s], jumps: [[50 * w, 50 * w + 5 * s]] }),
      alternatives: [
        { id: "overflow", title: "The overflow can", kind: "conceptual", text: ["Fill a can to the brim and drop the stone in.", "Catch the water that spills out and measure it: that is the stone's volume."] },
      ],
    },
    limits: "Readings up to 500 ml in steps of 5 ml, objects that sink, and up to 5 equal marbles.",
  },

  // ================================================================ MATH.measurement.money-totals and money-change: buying two things
  {
    id: "abcost",
    arity: 3,
    title: "The total cost of two things",
    competency: MONEY,
    type: "integer",
    mc: true,
    // [a, b, c]: prices ₹a and ₹b of two things from the shop list c
    parse: none,
    reject: guard([[2, 15], [2, 15], [0, 3]], ([a, b]) => a + b <= 20 && a !== b, "Two different prices with a total up to ₹20."),
    prompt: ([a, b, c]) => `${["A pencil", "A toffee packet", "A ball", "A notebook"][c]} costs ₹${a} and ${["an eraser", "a balloon", "a whistle", "a sharpener"][c]} costs ₹${b}. How much do they cost together, in rupees?`,
    solve: ([a, b]) => ({ steps: [st("add", "add the prices", ADD, [a, b], a + b)], answer: a + b }),
    // independent: count on from the first price one rupee at a time
    validate: ([a, b], v) => {
      let t = a;
      for (let i = 0; i < b; i++) t++;
      return v === t;
    },
    bugs: ([a, b]) => [
      B("subtracted", "conceptual", SUB, "The prices were subtracted. Buying both things means paying for both, so add.", Math.abs(a - b)),
      B("counted-start", "procedural", ADD, `When counting on, ${a} itself was counted as the first step. Start at ${a} and say the next number for each rupee.`, a + b - 1),
    ],
    variants: () => [],
    explain: (s) => `₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}`,
    domain: [[2, 15], [2, 15], [0, 3]],
    cap: 300,
    difficulty: ([a, b]) => (a + b <= 10 ? 1 : 2),
    figure: ([a, b, c]) => tbl(["Thing", "Price"], [[["pencil", "toffee packet", "ball", "notebook"][c], `₹${a}`], [["eraser", "balloon", "whistle", "sharpener"][c], `₹${b}`]]),
    word: ([a, b, c]) => `At the school fair, ${name(a + b)} buys ${["a pencil", "a toffee packet", "a ball", "a notebook"][c]} for ₹${a} and ${["an eraser", "a balloon", "a whistle", "a sharpener"][c]} for ₹${b}. How much does ${name(a + b)} pay in all?`,
    teach: {
      idea: "To find what two things cost together, add their prices.",
      method: "Start at the bigger price and count on the smaller one, or add the two numbers.",
      visual: ([a, b]) => ({ type: "numberline", from: 0, to: 20, marks: [a, a + b], jumps: [[a, a + b]] }),
      alternatives: [
        { id: "coins", title: "Put out the coins", kind: "conceptual", text: ["Put out coins for the first price and coins for the second.", "Count all the money together."], visual: ([a, b]) => ({ type: "coins", items: [...Array(Math.floor(a / 5)).fill(5), ...Array(a % 5).fill(1), ...Array(Math.floor(b / 5)).fill(5), ...Array(b % 5).fill(1)] }) },
      ],
    },
    limits: "Two prices with a total up to ₹20 (Grade 1); more items are other families.",
  },
  {
    id: "abenough",
    arity: 3,
    title: "Is the money enough for two things?",
    competency: CHANGE,
    type: "choice",
    // [a, b, d]: prices ₹a and ₹b; the money is a + b + (d − 4)
    parse: none,
    reject: guard([[2, 9], [2, 9], [0, 8]], ([a, b, d]) => a + b + d - 4 <= 20 && a + b + d - 4 >= 2 && a !== b, "Two prices up to ₹9 and an amount up to ₹20."),
    prompt: ([a, b, d]) => `${name(a + d)} has ₹${a + b + d - 4} and wants to buy a ribbon for ₹${a} and a hair clip for ₹${b}. Is the money enough?`,
    choices: (p) => shuffleBy(["It is more than enough", "It is exactly enough", "It is not enough"], `en:${p.join(",")}`),
    solve: (p) => {
      const [a, b, d] = p;
      const r = d > 4 ? "It is more than enough" : d === 4 ? "It is exactly enough" : "It is not enough";
      return { steps: [st("total", "add the prices", ADD, [a, b], a + b), st("compare", "compare", CHANGE, [a + b + d - 4, a + b], r)], answer: shuffleBy(["It is more than enough", "It is exactly enough", "It is not enough"], `en:${p.join(",")}`).indexOf(r) };
    },
    // independent: pay the first price rupee by rupee, then the second, and see what is left (or missing)
    validate: (p, v) => {
      const [a, b, d] = p;
      let money = a + b + d - 4;
      for (let i = 0; i < a + b; i++) money--;
      const cs = shuffleBy(["It is more than enough", "It is exactly enough", "It is not enough"], `en:${p.join(",")}`);
      return cs[v as number] === (money > 0 ? "It is more than enough" : money === 0 ? "It is exactly enough" : "It is not enough");
    },
    bugs: (p) => {
      const [a, b, d] = p;
      const N = a + b + d - 4;
      const cs = shuffleBy(["It is more than enough", "It is exactly enough", "It is not enough"], `en:${p.join(",")}`);
      const right = d > 4 ? 0 : d === 4 ? 1 : 2;
      const one = N > Math.max(a, b) ? 0 : N === Math.max(a, b) ? 1 : 2;
      const names = ["It is more than enough", "It is exactly enough", "It is not enough"];
      return [
        B("one-price", "conceptual", CHANGE, "The money was compared with one price only. Both things must be paid for: add the two prices first.", one !== right ? cs.indexOf(names[one]) : null),
        B("exact-not-enough", "conceptual", CHANGE, "Having exactly the price was taken as not enough. If the money equals the total, it is just enough, with nothing left.", d === 4 ? cs.indexOf(names[2]) : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "total" ? `Together they cost ₹${s.inputs[0]} + ₹${s.inputs[1]} = ₹${s.value}.` : `₹${s.inputs[0]} compared with ₹${s.inputs[1]}: ${String(s.value).toLowerCase()}.`),
    domain: [[2, 9], [2, 9], [0, 8]],
    cap: 300,
    difficulty: ([, , d]) => (Math.abs(d - 4) >= 3 ? 1 : d === 4 ? 3 : 2),
    figure: ([a, b, d]) => tbl(["", "Rupees"], [["Money", a + b + d - 4], ["Ribbon", a], ["Hair clip", b]]),
    word: ([a, b, d]) => `At the village shop, ${name(a + b)} has ₹${a + b + d - 4} for a small packet of biscuits (₹${a}) and a pencil (₹${b}). Is the money enough?`,
    teach: {
      idea: "To know whether money is enough for two things, add the prices and compare the total with the money.",
      method: "Add the two prices. If the money is more, it is more than enough; if it is the same, exactly enough; if it is less, not enough.",
      visual: ([a, b, d]) => ({ type: "numberline", from: 0, to: 20, marks: [a + b, a + b + d - 4] }),
      alternatives: [
        { id: "pay", title: "Pay one at a time", kind: "procedural", text: ["Take the price of the first thing away from the money.", "Then see whether what is left covers the second price."] },
      ],
    },
    limits: "Two prices up to ₹9 and money up to ₹20; finding the change is abchange.",
  },

  // ================================================================ MATH.number.equal-groups: repeated addition and multiplication sentences
  {
    id: "abrep",
    arity: 3,
    title: "Writing equal groups as repeated addition and as multiplication",
    competency: GROUPS,
    type: "choice",
    // [kind, g, e]: g groups (rows) of e; kind 0 which repeated addition, 1 which multiplication matches e + e + … (g times)
    parse: none,
    reject: guard([[0, 1], [2, 7], [2, 10]], () => true, "2 to 7 groups of 2 to 10."),
    prompt: ([kind, g, e]) => (kind === 0 ? `The picture shows ${g} rows with ${e} stars in each row. Which repeated addition shows how many stars there are?` : `Which multiplication means the same as ${repStr(e, g)}?`),
    choices: (p) => repChoices(p).list,
    solve: (p) => {
      const c = repChoices(p);
      return { steps: [st("write", p[0] === 0 ? "add one row at a time" : "count the equal addends", GROUPS, [p[1], p[2]], c.R)], answer: c.list.indexOf(c.R) };
    },
    // independent: read the chosen option: a repeated addition must have one addend per row, each equal to the row; a
    // multiplication 'a × b' must count the addends (a) and use the addend (b), and give the same total as the picture
    validate: ([kind, g, e], v) => {
      const c = repChoices([kind, g, e]).list[v as number];
      if (!c) return false;
      let cells = 0;
      for (let r = 0; r < g; r++) for (let k = 0; k < e; k++) cells++;
      if (kind === 0) {
        const parts = c.split(" + ").map(Number);
        return parts.length === g && parts.every((x) => x === e) && parts.reduce((a, b) => a + b, 0) === cells;
      }
      const m = /^(\d+) × (\d+)$/.exec(c);
      return !!m && Number(m[1]) === g && Number(m[2]) * Number(m[1]) === cells;
    },
    bugs: (p) => {
      const c = repChoices(p);
      return p[0] === 0
        ? [
          B("added-numbers", "conceptual", GROUPS, `The number of rows and the number in a row were added. ${p[1]} rows of ${p[2]} means adding ${p[2]} again and again, ${p[1]} times.`, c.list.indexOf(c.added)),
          B("one-row-short", "procedural", GROUPS, "One row was missed. Write one addend for each row.", c.less ? c.list.indexOf(c.less) : null),
          B("one-row-extra", "procedural", GROUPS, "One addend too many was written. Touch each row once as you write its number.", c.more ? c.list.indexOf(c.more) : null),
        ]
        : [
          B("plus-for-times", "conceptual", GROUPS, `The addition was written as ${p[1]} + ${p[2]}. Adding ${p[2]} again and again ${p[1]} times is ${p[1]} × ${p[2]}.`, c.list.indexOf(c.added)),
          B("miscounted", "procedural", GROUPS, "The number of addends was counted wrongly. Count how many times the same number is added.", c.more ? c.list.indexOf(c.more) : null),
        ];
    },
    variants: () => [],
    explain: (s) => `${s.inputs[0]} groups of ${s.inputs[1]}: ${s.value}.`,
    domain: [[0, 1], [2, 7], [2, 10]],
    difficulty: ([kind, g]) => (kind === 0 && g <= 4 ? 1 : kind === 0 ? 2 : 3),
    figure: ([kind, g, e]) => (kind === 0 ? { type: "array", rows: g, cols: e } : null),
    word: ([kind, g, e]) => (kind === 0 ? `For a Pongal kolam, ${name(g + e)} puts ${e} lamps in each of ${g} rows, as in the picture. Which repeated addition gives the number of lamps?` : `${name(g + e)} buys ${g} packets of ${e} pencils and adds them up as ${repStr(e, g)}. Which multiplication means the same?`),
    teach: {
      idea: "Equal groups can be written as a repeated addition (3 + 3 + 3 + 3) or as a multiplication: 4 × 3 means 4 groups of 3.",
      method: "Write the number in one group once for every group, with + between. The number of groups goes first in the multiplication, then the number in each group.",
      visual: ([, g, e]) => ({ type: "array", rows: g, cols: e }),
      alternatives: [
        { id: "jumps", title: "Equal jumps", kind: "procedural", text: ["On a number line, make one jump for each group, each as long as the group.", "Each jump is one addend; the number of jumps is the first number in the multiplication."], visual: ([, g, e]) => ({ type: "numberline", from: 0, to: g * e, step: e, jumps: Array.from({ length: g }, (_, i) => [i * e, (i + 1) * e]) }) },
      ],
    },
    limits: "2 to 7 groups of 2 to 10; the multiplication is written groups × number in each group, so the swapped order is not offered as an option.",
  },

  // ================================================================ MATH.measurement.standard-length: tapes, rulers in mm, units, estimates
  {
    id: "abmeas",
    arity: 3,
    title: "Reading a metre tape (whole, half and quarter metres) and a ruler in millimetres",
    competency: LEN,
    type: "fraction",
    mc: true,
    decimals: true,
    // [kind, a, b]: kind 0 a rope from a m to b m on a tape; kind 1 from a/4 m to b/4 m; kind 2 a pencil from 0 to a cm b mm, answer in mm
    parse: none,
    reject: guard([[0, 2], [0, 14], [0, 20]], ([kind, a, b]) => (kind === 0 ? b <= 10 && b - a >= 2 : kind === 1 ? b <= 20 && a <= 8 && b - a >= 3 && (a % 4 !== 0 || b % 4 !== 0) : a >= 3 && b >= 1 && b <= 9), "A length on a 10 m tape, a 5 m tape in quarter metres, or a 15 cm ruler."),
    prompt: ([kind, a, b]) =>
      kind === 0
        ? `A rope is laid along a measuring tape, as in the picture. It starts at the ${a} m mark and ends at the ${b} m mark. How long is the rope, in metres?`
        : kind === 1
          ? `A rope is laid along a measuring tape, as in the picture (the numbers are whole metres). It starts at the dot at ${fq(a)} m and ends at the dot at ${fq(b)} m. How long is the rope, in metres? (A decimal or a fraction is fine.)`
          : `A pencil is laid along a ruler with its end at 0. The picture shows the part of the ruler near its tip, marked in millimetres; the dot is the tip. How long is the pencil, in millimetres?`,
    solve: ([kind, a, b]) => {
      const ans = kind === 0 ? b - a : kind === 1 ? (b - a) / 4 : 10 * a + b;
      return { steps: [st("length", kind === 2 ? "read cm and mm" : "subtract the marks", LEN, kind === 2 ? [a, b] : kind === 1 ? [b / 4, a / 4] : [b, a], ans)], answer: ans };
    },
    // independent: count the small spaces between the two ends, each worth 1 m, ¼ m or 1 mm
    validate: ([kind, a, b], v) => {
      if (typeof v !== "number") return false;
      let c = 0;
      if (kind === 2) {
        for (let x = 0; x < 10 * a + b; x++) c++;
        return v === c;
      }
      for (let x = a; x < b; x++) c++;
      return Math.abs(v - (kind === 0 ? c : c * 0.25)) < 1e-9;
    },
    bugs: ([kind, a, b]) =>
      kind === 2
        ? [
          B("cm-not-mm", "conceptual", LEN, "The length was given in centimetres. 1 cm is 10 mm, so the length in mm is 10 times the centimetres plus the extra millimetres.", Number((a + b / 10).toFixed(1))),
          B("mm-ignored", "procedural", LEN, "Only the whole centimetres were read. Count the small millimetre marks after the last centimetre too.", 10 * a),
        ]
        : [
          B("read-end", "conceptual", LEN, "The number at the end was read, but the rope does not start at 0. Take the start mark away from the end mark.", a > 0 ? (kind === 0 ? b : b / 4) : null),
          ...(kind === 1 ? [B("steps-as-metres", "conceptual", LEN, "Each quarter metre was counted as a whole metre. It takes 4 quarter metres to make 1 m.", b - a)] : [B("counted-marks", "procedural", LEN, "The marks were counted instead of the spaces between them. There is one more mark than spaces.", b - a + 1)]),
        ],
    variants: () => [],
    explain: (s) => (s.op === "read cm and mm" ? `${s.inputs[0]} cm and ${s.inputs[1]} mm is ${s.value} mm.` : `${fmt2(Number(s.inputs[0]))} − ${fmt2(Number(s.inputs[1]))} = ${s.value}`),
    domain: [[0, 2], [0, 14], [0, 20]],
    // level@1: quarter metres are Grade 4 (fractions of a unit), millimetres Grade 3
    grade: ([kind]) => (kind === 0 ? 2 : kind === 1 ? 4 : 3),
    cap: 300,
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 ? 2 : 3),
    figure: ([kind, a, b]) =>
      kind === 0
        ? { type: "numberline", from: 0, to: 10, step: 1, marks: [a, b], jumps: [[a, b]] }
        : kind === 1
          ? { type: "numberline", from: 0, to: 5, step: 1, marks: [a / 4, b / 4], jumps: [[a / 4, b / 4]] }
          : { type: "numberline", from: a, to: a + 1, step: 0.1, marks: [a + b / 10] },
    word: ([kind, a, b]) =>
      kind === 0
        ? `For the tug of war on Sports Day, the PT teacher lays the rope along a tape measure, as in the picture: from the ${a} m mark to the ${b} m mark. How long is the rope, in metres?`
        : kind === 1
          ? `A tailor measures a piece of cloth on a tape, as in the picture (the numbers are whole metres): from ${fq(a)} m to ${fq(b)} m. How long is the cloth, in metres?`
          : `${name(a + b)} measures a new pencil with its end at the 0 of a ruler; the picture shows the ruler near the tip. How long is the pencil, in millimetres?`,
    teach: {
      idea: "A length is the distance from one end to the other: on a tape, the end mark minus the start mark. 1 m = 100 cm, and 1 cm = 10 mm.",
      method: "Read the mark at each end and subtract. For quarter metres, each small step is ¼ m; for millimetres, count the whole centimetres (each 10 mm) and add the small marks.",
      visual: ([kind, a, b]) => (kind === 2 ? { type: "numberline", from: a, to: a + 1, step: 0.1, marks: [a + b / 10] } : { type: "numberline", from: 0, to: kind === 0 ? 10 : 5, step: 1, marks: kind === 0 ? [a, b] : [a / 4, b / 4] }),
      alternatives: [
        { id: "count_steps", title: "Count the steps", kind: "procedural", text: ["Put a finger on the start and count each space up to the end.", "Multiply by what one space is worth: 1 m, ¼ m or 1 mm."] },
      ],
    },
    limits: "Whole metres on a 10 m tape, quarter metres on a 5 m tape, and pencils of 3 to 15 cm to the millimetre; drawing a segment of a given length is an educator-marked task.",
  },
  {
    id: "abunit",
    arity: 2,
    title: "Choosing a unit and a tool, and estimating lengths and distances",
    competency: LEN,
    type: "choice",
    // [kind, i]: kind 0 the unit for LEN_UNITS[i]; kind 1 the tool for TOOL_THINGS[i]; kind 2 a sensible estimate for EST[i]
    parse: none,
    reject: guard([[0, 2], [0, 39]], ([kind, i]) => i < [LEN_UNITS.length, TOOL_THINGS.length, EST.length][kind], "One of the listed things."),
    prompt: ([kind, i]) =>
      kind === 0
        ? `Which unit is best for measuring ${lenThing(i)}?`
        : kind === 1
          ? `Which tool is best for measuring the length of ${TOOL_THINGS[i][0]}?`
          : `Which is the most sensible estimate of ${EST[i][0]}?`,
    choices: unitChoices,
    solve: (p) => {
      const [kind, i] = p;
      const r = kind === 0 ? LEN_UNITS[i][1] : kind === 1 ? TOOLS[TOOL_THINGS[i][1]] : estChoices(i).R;
      return { steps: [st("choose", "compare with known lengths", LEN, [kind, i], r)], answer: unitChoices(p).indexOf(r) };
    },
    // independent: from a typical length in cm: the unit whose size range holds it; the tool that can reach it in one go
    // (a ruler up to 30 cm, a tape up to 100 m); the estimate within a factor of 3 of the typical length
    validate: (p, v) => {
      const [kind, i] = p;
      const c = unitChoices(p)[v as number];
      if (!c) return false;
      if (kind === 0) {
        const L = LEN_CM[i];
        const [lo, hi] = LEN_SIZE[c];
        return L >= lo && L < hi;
      }
      if (kind === 1) {
        const L = TOOL_THINGS[i][2];
        return c === (L <= 30 ? TOOLS[0] : L <= 10000 ? TOOLS[1] : TOOLS[2]);
      }
      const m = /^about (½|¼|¾|[\d.]+) (mm|cm|m|km)$/.exec(c);
      if (!m) return false;
      const val = m[1] === "½" ? 0.5 : m[1] === "¼" ? 0.25 : m[1] === "¾" ? 0.75 : Number(m[1]);
      const cm = val * UNIT_CM[m[2]];
      const truth = EST[i][1] * UNIT_CM[EST[i][2]];
      return cm / truth < 3 && truth / cm < 3;
    },
    bugs: (p) => {
      const [kind, i] = p;
      const cs = unitChoices(p);
      if (kind === 0) {
        const u = LEN_UNITS[i][1];
        return [B("unit-too-big", "conceptual", LEN, `A unit that is too ${u === "km" ? "small" : "big"} was chosen. Think how many of that unit it would take: the best unit gives a number that is not too big and not too small.`, cs.indexOf(u === "km" ? "m" : unitOf(u)))];
      }
      if (kind === 1) {
        const t = TOOL_THINGS[i][1];
        return [B("tool-size", "conceptual", LEN, t === 0 ? "A tape was chosen for a short thing. A ruler is easier for things shorter than the ruler." : t === 1 ? "A ruler was chosen for a long thing. It would have to be moved many times; a tape reaches all the way." : "A tape was chosen for a long road. Distances of many kilometres are measured with the odometer of the bus or car that travels them.", cs.indexOf(TOOLS[t === 1 ? 0 : 1]))];
      }
      const e = estChoices(i);
      return [
        B("wrong-unit", "conceptual", LEN, `The number is right but the unit is not: "${e.up}" does not fit at all. Picture 1 ${unitOf(EST[i][2])} and compare.`, e.list.indexOf(e.up)),
        B("ten-times", "procedural", LEN, `"${e.ten}" is ten times too much. Compare with something you know, like your own height (about 1 m) or a hand span (about 15 cm).`, e.list.indexOf(e.ten)),
      ];
    },
    variants: () => [],
    explain: (s) => `The best choice is ${s.value}.`,
    domain: [[0, 2], [0, 39]],
    difficulty: ([kind]) => (kind === 1 ? 1 : kind === 0 ? 2 : 3),
    figure: ([kind]) => (kind === 2 ? tbl(["Benchmark", "Length"], [["your hand span", "about 15 cm"], ["a big step", "about ½ m"], ["a door", "about 2 m"], ["a 15-minute walk", "about 1 km"]]) : null),
    word: ([kind, i]) =>
      kind === 0
        ? `${name(i)} is writing a project on measuring and must say which unit to use for ${lenThing(i)}. Which unit should ${name(i)} choose?`
        : kind === 1
          ? `${name(i)} wants to find the length of ${TOOL_THINGS[i][0]}. Which of these should ${name(i)} use?`
          : `${name(i)} guesses ${EST[i][0]} before measuring. Which guess is the most sensible?`,
    teach: {
      idea: "Small lengths are measured in millimetres or centimetres, longer ones in metres, and distances between places in kilometres. 10 mm = 1 cm, 100 cm = 1 m, 1000 m = 1 km.",
      method: "Compare with lengths you know: a fingernail is about 1 cm wide, a big step about ½ m, a door about 2 m, a 15-minute walk about 1 km. Pick the unit (or tool, or estimate) that fits.",
      visual: () => tbl(["Unit", "About as long as"], [["1 mm", "the thickness of a coin"], ["1 cm", "the width of a fingernail"], ["1 m", "a big step and a half"], ["1 km", "a 15-minute walk"]]),
      alternatives: [
        { id: "body", title: "Body benchmarks", kind: "conceptual", text: ["Measure your hand span, your step and your height once.", "Use them to picture other lengths: a bed is a little more than your height, a classroom about 10 big steps."] },
      ],
    },
    limits: "Familiar things with clear-cut units, tools and estimates; measuring them for real is hands-on and left to the teacher.",
  },

  // ================================================================ MATH.measurement.standard-mass: units, sensible weights, estimates, kg and g
  {
    id: "abwunit",
    arity: 3,
    title: "Choosing mg, g or kg, judging recorded weights, and estimating weights",
    competency: MASS,
    type: "choice",
    // [kind, i, s]: kind 0 the unit for W_UNITS[i]; kind 1 is the recorded weight of W_EST[i] (s 0 true, 1 unit too big, 2 unit too small) sensible; kind 2 an estimate for W_EST[i]
    parse: none,
    reject: guard([[0, 2], [0, 23], [0, 2]], ([kind, i, s]) => (kind === 0 ? i < W_UNITS.length && s === 0 : kind === 1 ? i < W_EST.length && !(s === 1 && W_EST[i][2] === "kg") : i < W_EST.length && s === 0), "One of the listed things."),
    prompt: ([kind, i, s]) =>
      kind === 0
        ? `Which unit is best for the weight of ${W_UNITS[i][0]}: milligrams (mg), grams (g) or kilograms (kg)?`
        : kind === 1
          ? `A record says that ${W_EST[i][0]} weighs ${wSens(i, s).rec}. Is this weight sensible?`
          : `About how heavy is ${W_EST[i][0]}?`,
    choices: wChoices,
    solve: (p) => {
      const [kind, i, s] = p;
      const r = kind === 0 ? W_UNITS[i][1] : kind === 1 ? SENS[s] : wEstChoices(i).R;
      return { steps: [st("judge", "compare with known weights", MASS, [kind, i], r)], answer: wChoices(p).indexOf(r) };
    },
    // independent: from a typical weight in grams: mg below 1 g, g below 1000 g, else kg; a record within a factor of 10
    // of the typical weight is sensible; an estimate within a factor of 3 is sensible
    validate: (p, v) => {
      const [kind, i, s] = p;
      const c = wChoices(p)[v as number];
      if (!c) return false;
      if (kind === 0) {
        const g = W_UNITS[i][2];
        return c === (g < 1 ? "mg" : g < 1000 ? "g" : "kg");
      }
      if (kind === 1) {
        const w = wSens(i, s);
        const r = w.recG / w.truth;
        return c === (r > 10 ? SENS[1] : r < 0.1 ? SENS[2] : SENS[0]);
      }
      const m = /^about ([\d.]+) (mg|g|kg)$/.exec(c);
      if (!m) return false;
      const g = Number(m[1]) * W_G[m[2]];
      const truth = W_EST[i][1] * W_G[W_EST[i][2]];
      return g / truth < 3 && truth / g < 3;
    },
    bugs: (p) => {
      const [kind, i, s] = p;
      const cs = wChoices(p);
      if (kind === 0) {
        const u = W_UNITS[i][1];
        return [B("unit-slip", "conceptual", MASS, u === "mg" ? "Grams were chosen for something very light. Things lighter than 1 g are weighed in milligrams (1000 mg = 1 g)." : u === "g" ? "Kilograms were chosen for something light. Things you can easily hold in one hand are weighed in grams." : "Grams were chosen for something heavy. Things that are hard to lift are weighed in kilograms (1 kg = 1000 g).", cs.indexOf(u === "g" ? "kg" : "g"))];
      }
      if (kind === 1) return [B("number-only", "conceptual", MASS, "Only the number was looked at, not the unit. Check whether the number and unit together fit what the thing is like.", s === 0 ? null : cs.indexOf(SENS[0]))];
      const e = wEstChoices(i);
      return [
        B("wrong-unit", "conceptual", MASS, `The number is right but the unit is not: "${e.other}" is far ${W_EST[i][2] === "kg" ? "too light" : "too heavy"}: compare with a 1 kg packet of salt.`, e.list.indexOf(e.other)),
        B("ten-times", "procedural", MASS, `"${e.ten}" is ten times too heavy. Compare with things you have lifted.`, e.list.indexOf(e.ten)),
      ];
    },
    variants: () => [],
    explain: (s) => `The answer is: ${s.value}.`,
    domain: [[0, 2], [0, 23], [0, 2]],
    // level@1: milligrams (and the four-digit gram facts behind them) are Grade 4
    grade: ([kind, i, s]) => (kind === 0 ? 4 : kind === 1 ? (wSens(i, s).rec.includes("mg") ? 4 : 2) : W_EST[i][2] === "g" ? 4 : 2),
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 2 ? 2 : 3),
    figure: () => tbl(["Benchmark", "Weight"], [["a ₹1 coin", "about 4 g"], ["an egg", "about 50 g"], ["a packet of salt", "1 kg"], ["a school bag", "about 3 kg"]]),
    word: ([kind, i, s]) =>
      kind === 0
        ? `A shopkeeper writes the weight of ${W_UNITS[i][0]} on a label. Which unit should go on the label: mg, g or kg?`
        : kind === 1
          ? `In a science notebook, ${name(i + s)} wrote that ${W_EST[i][0]} weighs ${wSens(i, s).rec}. Is this weight sensible?`
          : `Before putting ${W_EST[i][0]} on the kitchen scale, ${name(i)} makes a guess. Which guess is the most sensible?`,
    teach: {
      idea: "Very light things are weighed in milligrams, light things in grams and heavy things in kilograms: 1000 mg = 1 g and 1000 g = 1 kg.",
      method: "Compare with weights you know: a ₹1 coin is about 4 g, an egg about 50 g, a packet of salt 1 kg, a school bag about 3 kg.",
      visual: () => tbl(["Unit", "About as heavy as"], [["1 mg", "a grain of salt"], ["1 g", "a paper clip"], ["1 kg", "a packet of salt"]]),
      alternatives: [
        { id: "lift", title: "Lift and compare", kind: "conceptual", text: ["Hold a 1 kg packet in one hand and the thing in the other.", "Is it much lighter, about the same, or heavier? Then choose g or kg."] },
      ],
    },
    limits: "Familiar things with clear-cut units and typical weights; real weighing on a balance is hands-on and left to the teacher.",
  },
  {
    id: "abkgg",
    arity: 2,
    title: "Grams written as kilograms and grams",
    competency: MASS,
    type: "tuple",
    mc: true,
    // [kg, f]: kg·1000 + 5·f grams
    parse: none,
    reject: guard([[1, 9], [1, 199]], () => true, "1005 g to 9995 g."),
    prompt: ([kg, f]) => `Write ${kg * 1000 + 5 * f} g in kilograms and grams. Answer as (kg, g): for example 3200 g is (3, 200).`,
    solve: ([kg, f]) => ({ steps: [st("kg", "1000 g = 1 kg", MASS, [kg * 1000 + 5 * f], kg), st("g", "the grams left", MASS, [5 * f], 5 * f)], answer: tup(kg, 5 * f) }),
    // independent: take away 1000 g at a time, counting the kilograms
    validate: ([kg, f], v) => {
      const t = readTup(v);
      if (!t) return false;
      let g = kg * 1000 + 5 * f;
      let k = 0;
      while (g >= 1000) {
        g -= 1000;
        k++;
      }
      return t[0] === k && t[1] === g;
    },
    bugs: ([kg, f]) => {
      const N = kg * 1000 + 5 * f;
      return [
        B("hundred-grams", "conceptual", MASS, "1 kg was taken as 100 g. 1 kg is 1000 g, so the kilograms are the thousands.", tup(Math.floor(N / 100), N % 100)),
        B("dropped-zero", "procedural", MASS, "A zero in the grams was dropped. The grams left over are a three-digit amount: write all of it.", 5 * f < 100 && 5 * f % 10 !== 0 ? null : 5 * f % 10 === 0 && 5 * f >= 10 ? tup(kg, 5 * f / 10) : null),
      ];
    },
    distractors: ([kg, f]) => [tup(kg + 1, 5 * f), tup(kg, 1000 - 5 * f), tup(kg - 1, 5 * f)],
    variants: () => [],
    explain: (s) => (s.id === "kg" ? `${s.inputs[0]} g has ${s.value} full thousands, so ${s.value} kg.` : `and ${s.value} g left over.`),
    domain: [[1, 9], [1, 199]],
    // level@1: four-digit gram amounts are Grade 4
    grade: () => 4,
    cap: 300,
    difficulty: ([, f]) => (f % 20 === 0 ? 1 : 5 * f < 100 ? 3 : 2),
    word: ([kg, f]) => `A bag of onions on the market scale shows ${kg * 1000 + 5 * f} g. The shopkeeper writes the weight as kilograms and grams. What does she write? Answer as (kg, g).`,
    teach: {
      idea: "1 kg = 1000 g, so every full thousand grams is one kilogram and the rest stay as grams.",
      method: "The digit in the thousands place gives the kilograms; the last three digits give the grams: 2075 g is 2 kg 75 g.",
      visual: ([kg, f]) => tbl(["Thousands (kg)", "Hundreds", "Tens", "Ones"], [[kg, Math.floor((5 * f) / 100), Math.floor((5 * f) / 10) % 10, (5 * f) % 10]]),
      alternatives: [
        { id: "packets", title: "Fill 1 kg packets", kind: "conceptual", text: ["Picture pouring the grams into 1 kg packets, 1000 g in each.", "Count the full packets; what does not fill a packet is the grams."] },
      ],
    },
    limits: "1005 g to 9995 g in steps of 5 g; kilograms and grams to grams is abkg.",
  },

  // ================================================================ MATH.geometry.maps-directions: seats in rows and columns
  {
    id: "abseat",
    arity: 3,
    title: "Seats in rows and columns",
    competency: MAPS,
    type: "tuple",
    mc: true,
    // [kind, seed, t]: a seating plan of 4 rows (row 1 at the front) and 5 seats (seat 1 at the left); kind 0 where child t sits; kind 1 where the child sits who is (t div 5 % 3 + 1) rows behind and (t % 3) seats to the right of child (t % 20)'s place
    parse: none,
    reject: guard([[0, 1], [0, 39], [0, 19]], ([kind, seed, t]) => {
      if (kind === 0) return seed < 20;
      const r = Math.floor(t / 5);
      const c = t % 5;
      const dr = 1 + (seed % 3);
      const dc = seed % 2 ? 1 : 2;
      return r + dr <= 3 && c + dc <= 4;
    }, "A child in the plan, or a move that stays in the plan."),
    prompt: ([kind, seed, t]) => {
      const g = seatGrid(seed);
      const r = Math.floor(t / 5);
      const c = t % 5;
      if (kind === 0) return `The table is the seating plan of a classroom: row 1 is at the front and seat 1 is on the left. In which row and seat does ${g[r][c]} sit? Answer as (row, seat).`;
      const dr = 1 + (seed % 3);
      const dc = seed % 2 ? 1 : 2;
      return `In the seating plan, row 1 is at the front and seat 1 is on the left. ${g[r][c]} sits in row ${r + 1}, seat ${c + 1}. ${g[r][c]}'s best friend sits ${dr} row${dr > 1 ? "s" : ""} behind and ${dc} seat${dc > 1 ? "s" : ""} to the right of ${g[r][c]}. In which row and seat does the friend sit? Answer as (row, seat).`;
    },
    solve: ([kind, seed, t]) => {
      const r = Math.floor(t / 5) + 1;
      const c = (t % 5) + 1;
      if (kind === 0) return { steps: [st("row", "find the row", MAPS, [r], r), st("seat", "find the seat", MAPS, [c], c)], answer: tup(r, c) };
      const dr = 1 + (seed % 3);
      const dc = seed % 2 ? 1 : 2;
      return { steps: [st("row", "move back", ADD, [r, dr], r + dr), st("seat", "move right", ADD, [c, dc], c + dc)], answer: tup(r + dr, c + dc) };
    },
    // independent: kind 0 searches the plan for the name; kind 1 walks the moves one seat at a time from the named child
    validate: ([kind, seed, t], v) => {
      const a = readTup(v);
      if (!a) return false;
      const g = seatGrid(seed);
      const who = g[Math.floor(t / 5)][t % 5];
      let rr = -1;
      let cc = -1;
      g.forEach((row, i) => row.forEach((n, j) => {
        if (n === who) [rr, cc] = [i + 1, j + 1];
      }));
      if (kind === 1) {
        for (let i = 0; i < 1 + (seed % 3); i++) rr++;
        for (let i = 0; i < (seed % 2 ? 1 : 2); i++) cc++;
      }
      return a[0] === rr && a[1] === cc;
    },
    bugs: ([kind, seed, t]) => {
      const r = Math.floor(t / 5) + 1;
      const c = (t % 5) + 1;
      if (kind === 0)
        return [
          B("seat-row-swapped", "procedural", MAPS, "The seat was written first. Write the row first, then the seat.", r !== c && c <= 4 ? tup(c, r) : null),
          B("from-the-back", "conceptual", MAPS, "The rows were counted from the back. Row 1 is at the front.", 5 - r !== r ? tup(5 - r, c) : null),
          B("from-the-right", "conceptual", MAPS, "The seats were counted from the right. Seat 1 is on the left.", 6 - c !== c ? tup(r, 6 - c) : null),
        ];
      const dr = 1 + (seed % 3);
      const dc = seed % 2 ? 1 : 2;
      return [
        B("behind-as-front", "conceptual", MAPS, "Behind was taken as nearer the front. Behind means a bigger row number, further from the front.", r - dr >= 1 ? tup(r - dr, c + dc) : null),
        B("swapped-moves", "procedural", MAPS, "The moves were swapped: the rows were moved by the seat number and the seats by the row number.", dr !== dc && r + dc <= 4 && c + dr <= 5 ? tup(r + dc, c + dr) : null),
      ];
    },
    distractors: (p) => {
      const t = readTup(abseatAnswer(p))!;
      // only seats that exist in the plan (rows 1–4, seats 1–5)
      const ok = (x: number, y: number) => x >= 1 && x <= 4 && y >= 1 && y <= 5;
      return [[t[0] + 1, t[1]], [t[0], t[1] + 1], [t[0] - 1, t[1]], [t[0], t[1] - 1], [t[0] + 2, t[1]], [t[0], t[1] + 2], [t[0] - 2, t[1]], [t[0], t[1] - 2]].filter(([x, y]) => ok(x, y)).map(([x, y]) => tup(x, y));
    },
    variants: () => [],
    explain: (s) => (s.id === "row" ? `Row ${s.value}.` : `Seat ${s.value}.`),
    domain: [[0, 1], [0, 39], [0, 19]],
    cap: 300,
    difficulty: ([kind, , t]) => (kind === 0 ? (t < 5 ? 1 : 2) : 3),
    figure: ([, seed]) => tbl(["", "Seat 1 (left)", "Seat 2", "Seat 3", "Seat 4", "Seat 5 (right)"], seatGrid(seed).map((row, i) => [`Row ${i + 1}${i === 0 ? " (front)" : ""}`, ...row])),
    word: ([kind, seed, t]) => {
      const g = seatGrid(seed);
      const who = g[Math.floor(t / 5)][t % 5];
      return kind === 0
        ? `At the school drama, the seating plan in the table shows where each child sits (row 1 is nearest the stage, seat 1 on the left). Where should ${who} sit? Answer as (row, seat).`
        : `At the school drama, ${who} sits in row ${Math.floor(t / 5) + 1}, seat ${(t % 5) + 1} (row 1 is nearest the stage, seat 1 on the left). ${who}'s cousin sits ${1 + (seed % 3)} row${seed % 3 ? "s" : ""} behind and ${seed % 2 ? 1 : 2} seat${seed % 2 ? "" : "s"} to the right. In which row and seat does the cousin sit? Answer as (row, seat).`;
    },
    teach: {
      idea: "A seat in a hall is found by two numbers: the row (counted from the front) and the seat in that row (counted from the left).",
      method: "Find the row first, counting from row 1 at the front; then go along the row from the left to the seat. Write (row, seat).",
      visual: ([, seed]) => tbl(["", "Seat 1", "Seat 2", "Seat 3", "Seat 4", "Seat 5"], seatGrid(seed).map((row, i) => [`Row ${i + 1}`, ...row])),
      alternatives: [
        { id: "cinema", title: "Like a cinema ticket", kind: "conceptual", text: ["A cinema ticket says the row and the seat, like 'Row C, Seat 7'.", "Walk to the row first, then along it to the seat."] },
      ],
    },
    limits: "A plan of 4 rows and 5 seats; seats on maps with letters and numbers are other families.",
  },

  // ================================================================ MATH.measurement.clock: to the minute, half and quarter hours, 24-hour time
  {
    id: "abminute",
    arity: 3,
    title: "Clock times to the minute, and half and quarter hours in minutes",
    competency: CLOCK,
    type: "integer",
    mc: true,
    // [kind, a, b]: kind 0 the clock shows a o'clock and b minutes: how many minutes past a; kind 1 how many minutes until the next hour; kind 2 b quarter hours (a 0), a and a half (a 1), a and a quarter (a 2), a and three quarters (a 3) hours in minutes
    parse: none,
    reject: guard([[0, 2], [0, 12], [1, 59]], ([kind, a, b]) => (kind <= 1 ? a >= 1 && b % 5 !== 0 : a === 0 ? b >= 1 && b <= 8 : a <= 3 && b <= 5), "A time to the minute, or a number of quarter and half hours."),
    prompt: ([kind, a, b]) => {
      if (kind === 0) return `The clock in the picture shows a time between ${a} and ${a === 12 ? 1 : a + 1} o'clock. How many minutes past ${a} is it?`;
      if (kind === 1) return `The clock in the picture shows a time between ${a} and ${a === 12 ? 1 : a + 1} o'clock. How many minutes are left until ${a === 12 ? 1 : a + 1} o'clock?`;
      if (a === 0) return `How many minutes are there in ${b} quarter${b > 1 ? "s" : ""} of an hour?`;
      return `How many minutes are there in ${b} and ${["", "a half", "a quarter", "three quarters"][a]} hours?`;
    },
    solve: ([kind, a, b]) => {
      const ans = kind === 0 ? b : kind === 1 ? 60 - b : a === 0 ? 15 * b : 60 * b + [0, 30, 15, 45][a];
      return { steps: [st("minutes", kind <= 1 ? "read the minute hand" : "1 hour = 60 minutes", CLOCK, [a, b], ans)], answer: ans };
    },
    // independent: count the minute marks one by one round the clock; for hours, add 60 for each hour and 15 for each quarter
    validate: ([kind, a, b], v) => {
      if (kind <= 1) {
        let past = 0;
        for (let m = 0; m < b; m++) past++;
        let left = 0;
        for (let m = b; m < 60; m++) left++;
        return v === (kind === 0 ? past : left);
      }
      let t = 0;
      const quarters = a === 0 ? b : 4 * b + [0, 2, 1, 3][a];
      for (let i = 0; i < quarters; i++) t += 15;
      return v === t;
    },
    bugs: ([kind, a, b]) => {
      if (kind <= 1) {
        const ans = kind === 0 ? b : 60 - b;
        return [
          B("read-the-number", "conceptual", CLOCK, "The number the minute hand has just passed was read as the minutes. Each number on the clock stands for 5 minutes; count the small marks too.", Math.floor(b / 5) !== ans ? Math.floor(b / 5) : null),
          B("nearest-five", "procedural", CLOCK, "The time was read only to the nearest 5 minutes. Count the small marks after the last number.", Math.round(b / 5) * 5 % 60 !== 0 ? (kind === 0 ? Math.round(b / 5) * 5 : 60 - Math.round(b / 5) * 5) : null),
          ...(kind === 1 ? [B("minutes-past", "procedural", CLOCK, "The minutes past the hour were given. The question asks how many minutes are left until the next hour.", b)] : []),
        ];
      }
      return a === 0
        ? [B("quarter-25", "conceptual", CLOCK, "A quarter of an hour was taken as 25 minutes (as a quarter of 100). An hour has 60 minutes, so a quarter is 15 minutes.", 25 * b)]
        : [B("decimal-hours", "conceptual", CLOCK, `${b} and ${["", "a half", "a quarter", "three quarters"][a]} hours was read like ${b}.${["", "5", "25", "75"][a]} with 100 minutes in an hour. An hour has 60 minutes.`, 100 * b + [0, 50, 25, 75][a])];
    },
    variants: () => [],
    explain: (s) => `That is ${s.value} minutes.`,
    domain: [[0, 2], [0, 12], [1, 59]],
    cap: 300,
    difficulty: ([kind, a]) => (kind === 2 && a === 0 ? 1 : kind === 0 ? 2 : 3),
    figure: ([kind, a, b]) => (kind <= 1 ? { type: "clock", h: a, m: b } : null),
    word: ([kind, a, b]) => {
      if (kind === 0) return `${name(a + b)} looks at the wall clock in the picture while waiting for the school van. How many minutes past ${a} is it?`;
      if (kind === 1) return `The temple opens at ${a === 12 ? 1 : a + 1} o'clock. The clock in the picture shows the time now. How many minutes are left until it opens?`;
      return a === 0 ? `${name(b)} practises the veena for ${b} quarter${b > 1 ? "s" : ""} of an hour. How many minutes is that?` : `A train journey from Chennai takes ${b} and ${["", "a half", "a quarter", "three quarters"][a]} hours. How many minutes is that?`;
    },
    teach: {
      idea: "The minute hand goes once round the clock in 60 minutes; each number stands for 5 minutes and each small mark for 1 minute. Half an hour is 30 minutes and a quarter of an hour is 15 minutes.",
      method: "Count in fives to the last number the minute hand has passed, then count on the small marks. For hours, use 60 minutes for each hour, 30 for a half and 15 for a quarter.",
      visual: ([kind, a, b]) => (kind <= 1 ? { type: "clock", h: a, m: b } : { type: "clock", h: 3, m: 15 }),
      alternatives: [
        { id: "pie", title: "A clock is a pie", kind: "conceptual", text: ["Cut the clock face into 4 equal parts: each part is a quarter of an hour, 15 minutes.", "Two parts are half an hour, 30 minutes; three parts are 45 minutes."], visual: () => ({ type: "pie", labels: ["15 min", "15 min", "15 min", "15 min"], values: [1, 1, 1, 1] }) },
      ],
    },
    limits: "Times to the minute (not on a 5-minute mark), and up to 8 quarter hours or 5¾ hours; seconds are adsec.",
  },
  {
    id: "ab24h",
    arity: 3,
    title: "12-hour and 24-hour clock times",
    competency: CLOCK,
    type: "choice",
    // [kind, h, k]: the time h:5k (h 0–23); kind 0 write a 12-hour time in 24-hour form, 1 the reverse
    parse: none,
    reject: guard([[0, 1], [0, 23], [0, 11]], (p) => new Set(h24Choices(p).list).size === 4 && h24Choices(p).list.length === 4, "A time of day in 5-minute steps."),
    prompt: ([kind, h, k]) => (kind === 0 ? `What is ${to12(h, 5 * k)} in the 24-hour clock?` : `A railway timetable shows a train at ${to24(h, 5 * k)} (24-hour clock). What is that in the 12-hour clock?`),
    choices: (p) => h24Choices(p).list,
    solve: (p) => {
      const c = h24Choices(p);
      return { steps: [st("convert", p[0] === 0 ? (p[1] >= 12 ? "add 12 to the p.m. hours" : "a.m. hours stay") : p[1] >= 12 ? "take 12 from the hours after noon" : "hours before noon are a.m.", CLOCK, [p[1], 5 * p[2]], c.R)], answer: c.list.indexOf(c.R) };
    },
    // independent: turn the chosen option and the given time into minutes after midnight and compare
    validate: (p, v) => {
      const c = h24Choices(p).list[v as number];
      if (!c) return false;
      const m = minutesOf(c);
      return m === 60 * p[1] + 5 * p[2] && (p[0] === 0 ? /^\d\d:\d\d$/.test(c) : /m\.$/.test(c));
    },
    bugs: (p) => {
      const c = h24Choices(p);
      return [
        B(p[0] === 0 ? "twelve-rule" : "am-pm", "conceptual", CLOCK, p[0] === 0 ? (p[1] >= 12 ? "12 was not added for a p.m. time (or 12 noon was changed). After noon, add 12 to the hour; 12 noon stays 12:00 and 12 midnight is 00:00." : "12 was added to an a.m. time. Only times after noon get 12 added; midnight is 00.") : "a.m. and p.m. were mixed up. Times from 00:00 to 11:59 are a.m.; from 12:00 to 23:59 they are p.m.", ix(c.list, c.forgot)),
        ...(p[0] === 1 && c.ten ? [B("took-ten", "procedural", CLOCK, "10 was taken away instead of 12. To change a 24-hour time after noon, take 12 from the hours.", ix(c.list, c.ten))] : []),
      ];
    },
    variants: () => [],
    explain: (s) => `${s.value}`,
    domain: [[0, 1], [0, 23], [0, 11]],
    // level@1: the 24-hour clock is Grade 4
    grade: () => 4,
    cap: 300,
    difficulty: ([, h]) => (h >= 1 && h <= 11 ? 1 : h === 0 || h === 12 ? 3 : 2),
    word: ([kind, h, k]) =>
      kind === 0
        ? `${name(h + k)}'s ${h >= 7 && h <= 17 ? "bus to Madurai" : "overnight bus to Madurai"} leaves at ${to12(h, 5 * k)}, and the bus company writes times in the 24-hour clock. How is the time written?`
        : `A bus ticket from Madurai shows the departure time ${to24(h, 5 * k)}. What is that in the 12-hour clock?`,
    teach: {
      idea: "The 24-hour clock counts the hours from midnight (00:00) to 23:59. Times after noon have 12 added: 3:40 p.m. is 15:40. 12 noon is 12:00 and 12 midnight is 00:00.",
      method: "12-hour to 24-hour: for p.m. times after 12 noon add 12 to the hour; for a.m. times keep the hour (12 a.m. becomes 00). 24-hour to 12-hour: if the hour is 13 or more take away 12 and write p.m.",
      visual: () => tbl(["12-hour", "24-hour"], [["12:30 a.m.", "00:30"], ["9:15 a.m.", "09:15"], ["12:00 noon", "12:00"], ["3:40 p.m.", "15:40"], ["11:55 p.m.", "23:55"]]),
      alternatives: [
        { id: "line", title: "A day line", kind: "conceptual", text: ["Draw a line from 0 (midnight) to 24 (the next midnight) with noon at 12.", "Morning times are left of 12; afternoon and evening times are right of 12, so their 24-hour number is 12 more."] },
      ],
    },
    limits: "Times of day in 5-minute steps; seconds and time zones are not asked.",
  },

  // ================================================================ MATH.algebra.number-patterns: casting out nines, Pascal's triangle
  {
    id: "abnine",
    arity: 2,
    title: "Casting out nines: the nines check number",
    competency: PAT,
    type: "integer",
    mc: true,
    // [kind, seed]: kind 0 the check number of N; 1 the check number of a + b found from the check numbers of a and b; 2 the same for a × b
    parse: none,
    reject: guard([[0, 2], [0, 99]], ([kind, seed]) => ![...Array(seed).keys()].some((s0) => nineNums(kind, s0).join() === nineNums(kind, seed).join()), "A number up to 9999, a sum of two three-digit numbers or a product, not one an earlier seed gives."),
    prompt: ([kind, seed]) => {
      const [a, b] = nineNums(kind, seed);
      const rule = "(Add the digits again and again until one digit is left; 9 counts as 0.)";
      return kind === 0 ? `What is the nines check number of ${a}? ${rule}` : `To check ${a} ${kind === 1 ? "+" : "×"} ${b} by casting out nines, find the check numbers of ${a} and ${b}, ${kind === 1 ? "add" : "multiply"} them, and cast out nines again. What check number should the answer have? ${rule}`;
    },
    solve: ([kind, seed]) => {
      const [a, b] = nineNums(kind, seed);
      if (kind === 0) return { steps: [st("digits", "add the digits", PAT, [a], digitSum(a)), st("cast", "cast out nines", PAT, [digitSum(a)], nr(a))], answer: nr(a) };
      const c = kind === 1 ? nr(a) + nr(b) : nr(a) * nr(b);
      return { steps: [st("each", "check numbers", PAT, [a, b], `${nr(a)}, ${nr(b)}`), st("combine", kind === 1 ? "add" : "multiply", PAT, [nr(a), nr(b)], c), st("cast", "cast out nines", PAT, [c], nr(c))], answer: nr(c) };
    },
    // independent: the check number is the remainder on dividing by 9 (of the number itself, or of the real sum or product)
    validate: ([kind, seed], v) => {
      const [a, b] = nineNums(kind, seed);
      return v === (kind === 0 ? a : kind === 1 ? a + b : a * b) % 9;
    },
    bugs: ([kind, seed]) => {
      const [a, b] = nineNums(kind, seed);
      if (kind === 0)
        return [
          B("not-reduced", "procedural", PAT, "The digit sum was not reduced to one digit. Keep adding the digits until one digit is left.", digitSum(a) >= 10 && digitSum(a) !== nr(a) ? digitSum(a) : null),
          B("nine-kept", "procedural", PAT, "A 9 was kept. Casting out nines means 9 counts as 0.", nr(a) === 0 ? 9 : null),
        ];
      const c = kind === 1 ? nr(a) + nr(b) : nr(a) * nr(b);
      return [
        B("not-cast-again", "procedural", PAT, `The ${kind === 1 ? "sum" : "product"} of the check numbers was not cast out again. Reduce it to one digit, with 9 as 0.`, c >= 9 ? c : null),
        B(kind === 1 ? "multiplied" : "added", "conceptual", PAT, `The check numbers were ${kind === 1 ? "multiplied" : "added"}. Do to the check numbers what the sum does: ${kind === 1 ? "add" : "multiply"} them.`, nr(kind === 1 ? nr(a) * nr(b) : nr(a) + nr(b)) !== nr(c) ? nr(kind === 1 ? nr(a) * nr(b) : nr(a) + nr(b)) : null),
      ];
    },
    variants: () => [],
    explain: (s) => (s.id === "digits" ? `The digits of ${s.inputs[0]} add up to ${s.value}.` : s.id === "each" ? `The check numbers are ${s.value}.` : s.id === "combine" ? `${s.inputs[0]} and ${s.inputs[1]} give ${s.value}.` : `Casting out nines leaves ${s.value}.`),
    domain: [[0, 2], [0, 99]],
    // level@1: casting out nines is Grade 4 work (Grade 5 with four-digit numbers)
    grade: ([kind, seed]) => (kind === 0 && nineNums(0, seed)[0] >= 1000 ? 5 : 4),
    difficulty: ([kind]) => (kind === 0 ? 1 : kind === 1 ? 2 : 3),
    word: ([kind, seed]) => {
      const [a, b] = nineNums(kind, seed);
      return kind === 0 ? `A shopkeeper in Erode checks her bills by casting out nines. One bill total is ₹${a}. What is its nines check number?` : `A shopkeeper works out ${a} ${kind === 1 ? "+" : "×"} ${b} for a bill and checks it by casting out nines. Which check number should the correct answer have?`;
    },
    teach: {
      idea: "Adding the digits of a number again and again (with 9 counting as 0) leaves its remainder when divided by 9. A correct sum or product has the check number you get by adding or multiplying the check numbers.",
      method: "Find each number's check number. Add (or multiply) them and cast out nines again. Then find the check number of the answer: if they differ, the answer is wrong.",
      visual: () => tbl(["Number", "Digit sum", "Check number"], [[478, 19, 1], [9 * 7, 9, 0]]),
      alternatives: [
        { id: "pattern", title: "The nine pattern", kind: "conceptual", text: ["The digits of 9, 18, 27, 36, 45 … always add up to 9 (or a multiple of 9).", "So a multiple of 9 has check number 0, and any number's check number is how far it is past a multiple of 9."] },
      ],
    },
    limits: "Numbers up to 9999, sums of two three-digit numbers and products of a two-digit by a one-digit number; the test can miss some errors (for example swapped digits).",
  },
  {
    id: "abpascal",
    arity: 3,
    title: "Pascal's triangle: building rows, row sums and diagonals",
    competency: PAT,
    type: "integer",
    mc: true,
    // [kind, a, b]: kind 0 the (b+1)-th number of row a + j (shown rows 0..R with R = a, j from... see reject: a = R*2 + j-1); kind 1 the sum of the row beginning 1, a; kind 2 the next number after a terms of diagonal b
    parse: none,
    reject: guard([[0, 2], [2, 17], [1, 9]], ([kind, a, b]) => {
      if (kind === 0) {
        const R = Math.floor(a / 2);
        const j = (a % 2) + 1;
        return R >= 3 && R <= 8 && b >= 1 && b <= R + j - 1;
      }
      if (kind === 1) return a <= 12 && b === 1;
      return b >= 2 && b <= 4 && a >= 4 && a <= 7;
    }, "A row, a row sum or a diagonal of Pascal's triangle."),
    prompt: ([kind, a, b]) => {
      if (kind === 0) {
        const R = Math.floor(a / 2);
        const j = (a % 2) + 1;
        return `The table shows the first rows of Pascal's triangle: each row starts and ends with 1, and every other number is the sum of the two numbers just above it. ${j === 1 ? "In the next row" : "Two rows below the last row shown"}, what is the ${nth(b + 1)} number from the left?`;
      }
      if (kind === 1) return `In Pascal's triangle, what is the sum of all the numbers in the row that begins 1, ${a}, …?`;
      const terms = [...Array(a)].map((_, i) => choose(i + b - 1, b - 1));
      return `In Pascal's triangle, the numbers along one diagonal are ${terms.join(", ")}, … What is the next number on this diagonal?`;
    },
    solve: ([kind, a, b]) => {
      if (kind === 0) {
        const R = Math.floor(a / 2);
        const n = R + (a % 2) + 1;
        return { steps: [st("rule", "add the two numbers above", PAT, [choose(n - 1, b - 1), choose(n - 1, b)], choose(n, b))], answer: choose(n, b) };
      }
      if (kind === 1) return { steps: [st("double", "each row sum is double the one before", PAT, [a], 2 ** a)], answer: 2 ** a };
      return { steps: [st("next", "add along the diagonal before", PAT, [choose(a + b - 2, b - 1), choose(a + b - 2, b - 2)], choose(a + b - 1, b - 1))], answer: choose(a + b - 1, b - 1) };
    },
    // independent: build the triangle row by row by adding, and read or add the numbers
    validate: ([kind, a, b], v) => {
      if (kind === 0) {
        const n = Math.floor(a / 2) + (a % 2) + 1;
        return v === pascal(n)[b];
      }
      if (kind === 1) return v === pascal(a).reduce((x, y) => x + y, 0);
      return v === pascal(a + b - 1)[b - 1];
    },
    bugs: ([kind, a, b]) => {
      if (kind === 0) {
        const n = Math.floor(a / 2) + (a % 2) + 1;
        const ans = pascal(n)[b];
        return [
          B("copied-above", "procedural", PAT, "The number just above was copied. Each number is the sum of the two numbers above it.", a % 2 === 0 && pascal(n - 1)[b] !== ans ? pascal(n - 1)[b] : null),
          B("one-row-short", "procedural", PAT, "The row was built one too few times. Count the rows below the last one shown.", a % 2 === 1 && pascal(n - 1)[b] !== ans ? pascal(n - 1)[b] : null),
          B("plus-one", "conceptual", PAT, "1 was added to the number above, as in a counting pattern. Add the two numbers above instead.", pascal(n - 1)[b] + 1 !== ans ? pascal(n - 1)[b] + 1 : null),
        ];
      }
      if (kind === 1)
        return [
          B("double-the-second", "conceptual", PAT, `The second number was doubled (${a} × 2). Add every number in the row: the sums go 1, 2, 4, 8, … doubling each row.`, 2 * a !== 2 ** a ? 2 * a : null),
          B("one-row-off", "procedural", PAT, "The sum of the row before was given. The row that begins 1, n has sum 2 multiplied by itself n times.", 2 ** (a - 1)),
        ];
      const terms = [...Array(a + 1)].map((_, i) => choose(i + b - 1, b - 1));
      const last = terms[a - 1];
      const diff = terms[a - 1] - terms[a - 2];
      return [B("same-difference", "conceptual", PAT, "The last difference was added again. On this diagonal the differences grow: they are the numbers on the diagonal before.", last + diff !== terms[a] ? last + diff : null)];
    },
    variants: () => [],
    explain: (s) => (s.id === "rule" ? `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}` : s.id === "double" ? `The row sums double: 2 multiplied by itself ${s.inputs[0]} times is ${s.value}.` : `${s.inputs[0]} + ${s.inputs[1]} = ${s.value}`),
    domain: [[0, 2], [2, 17], [1, 9]],
    // level@1: Pascal's triangle is Grade 6 (number patterns)
    grade: () => 6,
    difficulty: ([kind, a]) => (kind === 0 && a % 2 === 0 ? 1 : kind === 2 ? 3 : 2),
    figure: ([kind, a]) => (kind === 0 ? pascalFig(Math.floor(a / 2)) : pascalFig(5)),
    word: ([kind, a, b]) => {
      if (kind === 0) return `${name(a + b)} copies Pascal's triangle from the table into a notebook and keeps adding rows. ${a % 2 ? "Two rows after the last one shown" : "In the next row"}, what is the ${nth(b + 1)} number from the left?`;
      if (kind === 1) return `${name(a)} adds up all the numbers in the row of Pascal's triangle that begins 1, ${a}, … What total does ${name(a)} get?`;
      return `${name(a + b)} notices that a diagonal of Pascal's triangle goes ${[...Array(a)].map((_, i) => choose(i + b - 1, b - 1)).join(", ")}, … What number comes next on it?`;
    },
    teach: {
      idea: "Pascal's triangle starts with 1; each row starts and ends with 1 and each other number is the sum of the two above it. Its rows add up to 1, 2, 4, 8, … and its diagonals are 1s, the counting numbers, the triangular numbers 1, 3, 6, 10 …",
      method: "To build a new row, write 1, then add each pair of neighbours in the row above, then write 1. Use the patterns to check.",
      visual: () => pascalFig(5),
      alternatives: [
        { id: "paths", title: "Count the paths", kind: "conceptual", text: ["Each number tells how many ways there are to walk down from the top 1 to it, moving down-left or down-right.", "Two paths arrive from the two numbers above, so their counts add."] },
      ],
    },
    limits: "Rows up to the tenth, row sums up to 2¹², and the first four diagonals; binomial expansions come in Grade 11.",
  },
];
function fq(q: number) {
  const w = Math.floor(q / 4);
  const r = q % 4;
  return r === 0 ? String(w) : `${w ? `${w}` : ""}${["", "¼", "½", "¾"][r]}`;
}
function abseatAnswer([kind, seed, t]: number[]) {
  const r = Math.floor(t / 5) + 1;
  const c = (t % 5) + 1;
  return kind === 0 ? tup(r, c) : tup(r + 1 + (seed % 3), c + (seed % 2 ? 1 : 2));
}
function fmt2(x: number) {
  return String(x);
}
for (const d of GAP02) {
  const all = d.bugs;
  d.bugs = (p) => all(p).filter((b) => b.predict !== null);
}
B02.push(...GAP02);
