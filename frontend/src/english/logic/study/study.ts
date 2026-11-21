/**
 * Notes, charts and maps (content/english/study/tasks.json): the study skills the school syllabuses ask for that
 * no other activity practises.
 *
 *   notes  read a passage, choose its title, pick its main points (not the details), choose the best summary, then
 *          write one's own, marked by rule: length, every main point named, nothing long copied;
 *   chart  read a bar or line chart: highest, lowest, a difference, a true comparison, an analytical paragraph put
 *          in order, then one's own paragraph, marked by rule against the chart's data;
 *   map    a street map: what is on a corner, which directions lead somewhere, where directions end; then one's own
 *          directions, which the app follows on the map to see where they really lead.
 *
 * Charts and maps are also made by code from a seed ("chart.g7", "map.g12"), so they never run out; their questions
 * and answers are worked out from the data. Notes passages are written by hand or taken from the reading texts the
 * app already holds. Practice-only: nothing here is evidence for the engine.
 */
import studyJson from "../../../../../content/english/study/tasks.json";
import kindsJson from "../../../../../content/english/reading/kinds.json";
import level6Json from "../../../../../content/english/reading/level-6.json";

export interface NotesTask {
  id: string;
  level: number;
  title: string;
  text: string;
  /** A passage taken from another activity's texts, by id (its title and text are read from there). */
  source?: string;
  titles: { right: string; wrong: string[] };
  /** Main points carry `k`: stems, any one of which shows a summary has named the point. */
  points: { text: string; main: boolean; k?: string[] }[];
  summaries: { right: string; wrong: string[] };
}
export type ChartType = "bar" | "line";
export interface ChartTask {
  id: string;
  level: number;
  title: string;
  type?: ChartType;
  unit: string;
  labels: string[];
  values: number[];
  /** An analytical paragraph about the chart, its sentences in order. */
  paragraph: string[];
}
export type Dir = "N" | "E" | "S" | "W";
export interface MapTask {
  id: string;
  level: number;
  title: string;
  /** Roads running north to south, west to east (x = 0, 1, …). */
  cols: string[];
  /** Streets running west to east, north to south (y = 0, 1, …). */
  rows: string[];
  places: { name: string; x: number; y: number }[];
  routes: { from: string; to: string; moves: { dir: Dir; blocks: number }[] }[];
}
export interface Study {
  id: string;
  version: number;
  notes: NotesTask[];
  charts: ChartTask[];
  maps: MapTask[];
}

const SOURCES = new Map<string, { title: string; text: string }>([
  ...(kindsJson as unknown as { texts: { id: string; title: string; text: string }[] }).texts.map((t) => [t.id, t] as const),
  ...(level6Json as unknown as { passages: { id: string; title: string; text: string }[] }).passages.map((t) => [t.id, t] as const),
]);
function withSources(s: Study): Study {
  return {
    ...s,
    notes: s.notes.map((n) => {
      if (!n.source) return n;
      const src = SOURCES.get(n.source);
      return src ? { ...n, title: `Notes: ${src.title}`, text: src.text } : n;
    }),
  };
}
export const STUDY: Study = withSources(studyJson as unknown as Study);

export type StudyKind = "notes" | "chart" | "map";
export type StudySkill = "title" | "main_points" | "summary" | "chart_read" | "chart_compare" | "chart_paragraph" | "map_corner" | "map_directions" | "map_follow";
export const STUDY_SKILL_NAMES: Record<StudySkill, string> = {
  title: "choosing a title", main_points: "picking the main points", summary: "summing up", chart_read: "reading a chart", chart_compare: "comparing in a chart",
  chart_paragraph: "an analytical paragraph", map_corner: "reading a map", map_directions: "giving directions", map_follow: "following directions",
};
export const KIND_TITLES: Record<StudyKind, string> = { notes: "Notes and summary", chart: "Reading a chart", map: "Road map" };

export type Step =
  | { kind: "choose"; skill: StudySkill; prompt: string; options: string[]; answer: number; explain: string }
  | { kind: "pick"; skill: StudySkill; prompt: string; options: string[]; answer: number[]; explain: string }
  | { kind: "order"; skill: StudySkill; prompt: string; parts: string[]; answer: number[]; explain: string };

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
/** A small seeded random number generator (mulberry32): the same seed always makes the same chart or map. */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickOne = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const shuffle = <T>(r: () => number, xs: readonly T[]): T[] => xs.map((x) => ({ x, k: r() })).sort((a, b) => a.k - b.k).map((e) => e.x);
const mix = <T>(xs: readonly T[], key: string, show: (x: T) => string): T[] => xs.map((x) => ({ x, k: hash(`${key}|${show(x)}`) })).sort((a, b) => a.k - b.k).map((e) => e.x);
function choose(skill: StudySkill, key: string, prompt: string, right: string, wrong: string[], explain: string): Step {
  const options = mix([right, ...wrong], key, (o) => o);
  return { kind: "choose", skill, prompt, options, answer: options.indexOf(right), explain };
}
const WORDS = ["no", "one", "two", "three", "four", "five", "six"];
export const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9,'\s-]/g, " ").replace(/\s+/g, " ").trim();

/** A learner's own piece, marked by rule: each check passed or not, with a note to act on. */
export interface OwnMark {
  words: number;
  checks: { id: string; ok: boolean; note: string }[];
  passed: number;
}
const marked = (text: string, checks: OwnMark["checks"]): OwnMark => ({ words: words(text), checks, passed: checks.filter((c) => c.ok).length });

// ---- notes --------------------------------------------------------------------------------------------------------

export function notesSteps(t: NotesTask): Step[] {
  const pts = mix(t.points, `${t.id}|points`, (p) => p.text);
  return [
    choose("title", `${t.id}|title`, "Which is the best title for notes on this passage?", t.titles.right, t.titles.wrong, "A title names the whole topic, not one detail of it."),
    {
      kind: "pick",
      skill: "main_points",
      prompt: "Notes keep the main points and leave out small details. Tap every main point.",
      options: pts.map((p) => p.text),
      answer: pts.flatMap((p, i) => (p.main ? [i] : [])),
      explain: `The main points: ${pts.filter((p) => p.main).map((p) => p.text).join("; ")}.`,
    },
    choose("summary", `${t.id}|summary`, "Which is the best summary, in fifty words or fewer?", t.summaries.right, t.summaries.wrong, "A summary covers every main point, briefly, and adds nothing the passage does not say."),
  ];
}

/** The longest run of words the summary copies straight from the passage. */
export function longestCopy(passage: string, text: string): number {
  const p = ` ${norm(passage).replace(/,/g, "")} `;
  const w = norm(text).replace(/,/g, "").split(" ").filter(Boolean);
  let best = 0;
  for (let i = 0; i < w.length; i++) for (let j = i + best + 1; j <= w.length && p.includes(` ${w.slice(i, j).join(" ")} `); j++) best = j - i;
  return best;
}

/** A summary the learner writes: fifty words or fewer, every main point named, no long stretch copied. Not kept. */
export function markSummary(t: NotesTask, text: string): OwnMark {
  const n = words(text);
  const low = norm(text);
  const main = t.points.filter((p) => p.main);
  const missing = main.filter((p) => !(p.k ?? []).some((k) => low.includes(norm(k))));
  const copied = longestCopy(t.text, text);
  return marked(text, [
    { id: "length", ok: n >= 15 && n <= 50, note: n > 50 ? `${n} words: keep it to fifty or fewer. Leave out examples and details.` : n < 15 ? `${n} words: too short to hold the main points.` : `${n} words: a good length.` },
    { id: "points", ok: missing.length === 0, note: missing.length ? `It leaves out: ${missing.map((p) => p.text.toLowerCase()).join("; ")}.` : "It names every main point." },
    { id: "own_words", ok: copied < 8, note: copied >= 8 ? `${copied} words in a row are copied from the passage. Say it in your own words.` : "It is in your own words." },
    { id: "stop", ok: /[.!?]$/.test(text.trim()), note: /[.!?]$/.test(text.trim()) ? "It ends with a full stop." : "End with a full stop." },
  ]);
}

// ---- charts -------------------------------------------------------------------------------------------------------

export function chartSteps(c: ChartTask): Step[] {
  const by = c.labels.map((l, i) => ({ l, v: c.values[i] })).sort((a, b) => b.v - a.v);
  const [top, second] = by;
  const bottom = by[by.length - 1];
  const others = (l: string) => by.filter((x) => x.l !== l).map((x) => x.l);
  const diff = top.v - bottom.v;
  const step = diff >= 40 ? 10 : 5;
  const near = [...new Set([diff + step, diff - step, top.v, bottom.v, diff + 2 * step].filter((d) => d > 0 && d !== diff))].slice(0, 2);
  const order = mix(c.paragraph.map((_, i) => i), `${c.id}|para`, (i) => c.paragraph[i]);
  return [
    choose("chart_read", `${c.id}|top`, `Which has the highest figure (${c.unit})?`, top.l, others(top.l).slice(-2), `${top.l} is highest: ${top.v} ${c.unit}.`),
    choose("chart_read", `${c.id}|bottom`, `Which has the lowest figure (${c.unit})?`, bottom.l, others(bottom.l).slice(0, 2), `${bottom.l} is lowest: ${bottom.v} ${c.unit}.`),
    choose("chart_compare", `${c.id}|diff`, `How many more ${c.unit} for ${top.l} than for ${bottom.l}?`, String(diff), near.map(String), `${top.v} − ${bottom.v} = ${diff}.`),
    choose(
      "chart_compare",
      `${c.id}|true`,
      "Which sentence is true about the chart?",
      `The figure for ${top.l} is higher than for ${second.l}.`,
      [`The figure for ${bottom.l} is higher than for ${top.l}.`, `The figure for ${second.l} is higher than for ${top.l}.`],
      `${top.l} (${top.v}) is ahead of ${second.l} (${second.v}).`,
    ),
    {
      kind: "order",
      skill: "chart_paragraph",
      prompt: "Put this analytical paragraph in order: what the chart shows, the main feature, the details, then a conclusion.",
      parts: order.map((i) => c.paragraph[i]),
      answer: c.paragraph.map((_, i) => order.indexOf(i)),
      explain: "An analytical paragraph starts by saying what the chart shows, gives the biggest feature, then details, and ends with what it means.",
    },
  ];
}

const OPENERS = /\b(chart|graph|figure|data|shows?|compares?|gives|presents?|illustrates?)\b/;
const COMPARE = /\b(more|most|less|fewer|least|higher|highest|lower|lowest|than|twice|half|rose|rise|rising|fell|fall|falling|increase[ds]?|decrease[ds]?|peak(ed)?|doubled?|largest|smallest|biggest|ahead|behind)\b/;
const CONCLUDE = /\b(overall|in short|in conclusion|to sum up|therefore|so|this means|clearly|in all|altogether|on the whole|thus)\b/;

/** The learner's own analytical paragraph, checked against the chart's data. Not kept. */
export function markParagraph(c: ChartTask, text: string): OwnMark {
  const low = norm(text);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const by = c.labels.map((l, i) => ({ l, v: c.values[i] })).sort((a, b) => b.v - a.v);
  const top = by[0];
  const bottom = by[by.length - 1];
  const has = (l: string) => low.includes(norm(l));
  // figures, but not the years or class numbers that are chart labels
  const labelNums = new Set(c.labels.flatMap((l) => [...l.matchAll(/\d+/g)].map((m) => Number(m[0]))));
  const nums = [...text.matchAll(/\d[\d,]*(?!\d)(?!\s*(?:%|per ?cent))/g)].map((m) => Number(m[0].replace(/,/g, ""))).filter((n) => !labelNums.has(n));
  const known = new Set([...c.values, by[0].v - by[by.length - 1].v, c.values.reduce((a, b) => a + b, 0)]);
  for (let i = 1; i < c.values.length; i++) known.add(Math.abs(c.values[i] - c.values[i - 1]));
  for (const x of c.values) for (const y of c.values) if (x > y) known.add(x - y);
  const right = nums.filter((n) => known.has(n));
  const wrongNums = nums.filter((n) => !known.has(n) && n > 10 && n !== 100);
  const n = words(text);
  const last = norm(sentences[sentences.length - 1] ?? "");
  return marked(text, [
    { id: "opening", ok: OPENERS.test(norm(sentences[0] ?? "")), note: OPENERS.test(norm(sentences[0] ?? "")) ? "It opens by saying what the chart shows." : "Begin by saying what the chart shows, for example \"The chart shows…\"." },
    { id: "highest", ok: has(top.l), note: has(top.l) ? `It names the highest, ${top.l}.` : `Name the highest: ${top.l}.` },
    { id: "lowest", ok: has(bottom.l), note: has(bottom.l) ? `It names the lowest, ${bottom.l}.` : `Name the lowest: ${bottom.l}.` },
    { id: "figures", ok: right.length >= 2 && wrongNums.length === 0, note: wrongNums.length ? `Check ${wrongNums.join(", ")}: the chart does not show ${wrongNums.length === 1 ? "that figure" : "those figures"}.` : right.length >= 2 ? "Its figures match the chart." : "Use at least two figures from the chart." },
    { id: "compare", ok: COMPARE.test(low), note: COMPARE.test(low) ? "It compares." : "Compare: use words like \"more than\", \"the highest\" or \"rose\"." },
    { id: "conclusion", ok: sentences.length >= 3 && CONCLUDE.test(last), note: sentences.length >= 3 && CONCLUDE.test(last) ? "It ends with a conclusion." : "End with a conclusion, for example \"Overall, …\"." },
    { id: "length", ok: n >= 50 && n <= 120, note: n > 120 ? `${n} words: keep it to 120 or fewer.` : n < 50 ? `${n} words: aim for 50 to 120.` : `${n} words: a good length.` },
  ]);
}

// ---- maps ---------------------------------------------------------------------------------------------------------

const DIRS: Dir[] = ["N", "E", "S", "W"];
const DIR_NAMES: Record<Dir, string> = { N: "north", E: "east", S: "south", W: "west" };
const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
export type Moves = { dir: Dir; blocks: number }[];

/** Where a set of moves ends, from a place; null if it leaves the map. */
export function walk(m: MapTask, from: string, moves: Moves): { x: number; y: number } | null {
  const p = m.places.find((x) => x.name === from)!;
  let x = p.x;
  let y = p.y;
  for (const mv of moves) {
    x += STEP[mv.dir][0] * mv.blocks;
    y += STEP[mv.dir][1] * mv.blocks;
    if (x < 0 || y < 0 || x >= m.cols.length || y >= m.rows.length) return null;
  }
  return { x, y };
}
export const placeAt = (m: MapTask, at: { x: number; y: number } | null): string | null => (at ? (m.places.find((p) => p.x === at.x && p.y === at.y)?.name ?? null) : null);

/** Directions in words, worked out from the moves: the street walked along, and each turn as left or right. */
export function directions(m: MapTask, from: string, moves: Moves): string {
  const p = m.places.find((x) => x.name === from)!;
  let x = p.x;
  let y = p.y;
  const out: string[] = [];
  moves.forEach((mv, i) => {
    const street = mv.dir === "N" || mv.dir === "S" ? m.cols[x] : m.rows[y];
    const n = `${WORDS[mv.blocks]} ${mv.blocks === 1 ? "block" : "blocks"}`;
    if (i === 0) out.push(`Start at the ${from} and walk ${DIR_NAMES[mv.dir]} along ${street} for ${n}.`);
    else {
      const turn = (DIRS.indexOf(mv.dir) - DIRS.indexOf(moves[i - 1].dir) + 4) % 4 === 1 ? "right" : "left";
      out.push(`Turn ${turn} into ${street} and walk ${n}.`);
    }
    x += STEP[mv.dir][0] * mv.blocks;
    y += STEP[mv.dir][1] * mv.blocks;
  });
  return out.join(" ");
}

/** Wrong directions that sound right: every turn the other way, or one stretch a block too long or short. */
export function wrongMoves(m: MapTask, route: MapTask["routes"][number]): Moves[] {
  const flip = (d: Dir): Dir => ({ N: "S", S: "N", E: "W", W: "E" })[d] as Dir;
  const turnsFlipped: Moves = route.moves.map((mv, i) => (i === 0 ? mv : { ...mv, dir: mv.dir === route.moves[i - 1].dir ? mv.dir : flip(mv.dir) }));
  const out: Moves[] = [turnsFlipped];
  for (let i = route.moves.length - 1; i >= 0 && out.length < 3; i--)
    for (const d of [1, -1]) {
      const changed = route.moves.map((mv, j) => (j === i ? { ...mv, blocks: mv.blocks + d } : mv));
      if (changed[i].blocks > 0 && walk(m, route.from, changed) && out.length < 3) out.push(changed);
    }
  const firstFlip: Moves = route.moves.map((mv, i) => (i === 0 ? { ...mv, dir: flip(mv.dir) } : mv));
  if (out.length < 3) out.push(firstFlip);
  const right = directions(m, route.from, route.moves);
  return out.filter((w) => directions(m, route.from, w) !== right && placeAt(m, walk(m, route.from, w)) !== route.to).slice(0, 2);
}

export function mapSteps(m: MapTask): Step[] {
  const steps: Step[] = [];
  const corner = m.places[hash(`${m.id}|corner`) % m.places.length];
  const otherPlaces = (name: string) => mix(m.places.filter((p) => p.name !== name), `${m.id}|${name}`, (p) => p.name).map((p) => p.name);
  steps.push(choose("map_corner", `${m.id}|corner`, `What is on the corner of ${m.cols[corner.x]} and ${m.rows[corner.y]}?`, `the ${corner.name}`, otherPlaces(corner.name).slice(0, 2).map((n) => `the ${n}`), `Find where ${m.cols[corner.x]} crosses ${m.rows[corner.y]}: the ${corner.name} is there.`));
  m.routes.forEach((r, i) => {
    const wrong = wrongMoves(m, r);
    if (i % 2 === 0)
      steps.push(choose("map_directions", `${m.id}|dir${i}`, `Which directions take you from the ${r.from} to the ${r.to}?`, directions(m, r.from, r.moves), wrong.map((w) => directions(m, r.from, w)), `Trace it on the map: ${directions(m, r.from, r.moves)} You reach the ${r.to}.`));
    else {
      const ends = wrong.map((w) => placeAt(m, walk(m, r.from, w))).filter((p): p is string => !!p && p !== r.to);
      const decoys = [...new Set([...ends, ...otherPlaces(r.to).filter((p) => p !== r.from)])].slice(0, 2);
      steps.push(choose("map_follow", `${m.id}|follow${i}`, `Follow these directions. Where do you arrive? ${directions(m, r.from, r.moves)}`, `the ${r.to}`, decoys.map((d) => `the ${d}`), `Each turn is left or right as you face along the road you are walking. The directions end at the ${r.to}.`));
    }
  });
  return steps;
}

/** The trip the learner writes directions for: back from the first route's end to its start. */
export const ownTrip = (m: MapTask): { from: string; to: string } => ({ from: m.routes[0].to, to: m.routes[0].from });

const NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const ORD: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
const COMPASS: Record<string, Dir> = { north: "N", south: "S", east: "E", west: "W" };

/**
 * Typed directions read as moves: a compass direction to start, then "turn left/right", a number of blocks ("two
 * blocks", "3 blocks") or "take the second left". Returns the moves, and anything that could not be understood.
 */
export function readDirections(text: string, streets: readonly string[] = []): { moves: Moves; problems: string[] } {
  const moves: Moves = [];
  const problems: string[] = [];
  let heading: Dir | null = null;
  const need = () => problems.push("Start with a direction: north, south, east or west.");
  const turn = (side: "left" | "right") => {
    if (!heading) return void need();
    heading = DIRS[(DIRS.indexOf(heading) + (side === "right" ? 1 : 3)) % 4];
  };
  const go = (n: number) => {
    if (!heading) return void need();
    const last = moves[moves.length - 1];
    if (last && last.dir === heading) last.blocks += n;
    else moves.push({ dir: heading, blocks: n });
  };
  // street names can hold compass words ("North Street"): take them out before reading the directions
  let plain = text.toLowerCase().replace(/[^a-z0-9.,;!?\s-]/g, " ").replace(/[!?]/g, ".").replace(/\s+/g, " ");
  for (const st of [...streets].sort((a, b) => b.length - a.length)) plain = plain.split(norm(st)).join(" the street ");
  const clauses = plain.split(/[.,;]|\bthen\b|\band\b|\bafter that\b/).map((c) => c.trim()).filter(Boolean);
  for (const c of clauses) {
    const w = c.split(" ");
    const ord = w.findIndex((x) => x in ORD);
    const side = c.match(/\b(left|right)\b/)?.[1] as "left" | "right" | undefined;
    const compass = w.find((x) => x in COMPASS);
    const count = w.map((x, i) => (/^\d+$/.test(x) && /^blocks?$/.test(w[i + 1] ?? "") ? Number(x) : x in NUM && /^blocks?$/.test(w[i + 1] ?? "") ? NUM[x] : NaN)).find((x) => !Number.isNaN(x));
    if (ord >= 0 && side) {
      // "take the second left": walk to that corner, then turn
      go(ORD[w[ord]]);
      turn(side);
      continue;
    }
    if (compass) heading = COMPASS[compass];
    else if (side) turn(side);
    if (count !== undefined) go(count);
    else if (/\bblocks?\b/.test(c)) problems.push(`Say how many blocks in "${c}".`);
  }
  if (!moves.length && !problems.length) problems.push("Give a direction and a number of blocks, for example \"walk north for two blocks\".");
  return { moves, problems: [...new Set(problems)] };
}

/** The learner's own directions, followed on the map: where they really lead. Not kept. */
export function markDirections(m: MapTask, trip: { from: string; to: string }, text: string): OwnMark & { endsAt: string | null; offMap: boolean } {
  const { moves, problems } = readDirections(text, [...m.cols, ...m.rows]);
  const at = moves.length ? walk(m, trip.from, moves) : null;
  const endsAt = placeAt(m, at);
  const offMap = moves.length > 0 && at === null;
  const reached = endsAt === trip.to;
  const where = offMap ? "off the edge of the map" : at ? (endsAt ? `at the ${endsAt}` : `at the corner of ${m.cols[at.x]} and ${m.rows[at.y]}`) : "nowhere yet";
  let plain = text.toLowerCase();
  for (const st of [...m.cols, ...m.rows]) plain = plain.split(st.toLowerCase()).join(" ");
  const startsWithCompass = /\b(north|south|east|west)\b/.test(plain.split(/[.;!?]/)[0] ?? "");
  const names = [...m.cols, ...m.rows].some((s) => norm(text).includes(norm(s)));
  return {
    ...marked(text, [
      { id: "reaches", ok: reached, note: reached ? `Followed on the map, your directions reach the ${trip.to}.` : `Followed on the map, your directions end ${where}, not at the ${trip.to}.` },
      { id: "start", ok: startsWithCompass, note: startsWithCompass ? "It starts with a compass direction." : "Start with a compass direction: north, south, east or west." },
      { id: "streets", ok: names, note: names ? "It names the streets." : "Name the streets, so the reader knows where to turn." },
      ...problems.map((p, i) => ({ id: `understood${i}`, ok: false, note: p })),
    ]),
    endsAt,
    offMap,
  };
}

// ---- generated charts and maps -------------------------------------------------------------------------------------

interface Theme {
  title: string;
  about: string;
  unit: string;
  labels: string[];
  lo: number;
  hi: number;
  type: ChartType;
}
const THEMES: Theme[] = [
  { title: "Trees planted by each class", about: "how many trees each class planted", unit: "trees", labels: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"], lo: 15, hi: 90, type: "bar" },
  { title: "Favourite sports in a school", about: "which sports the pupils of a school like best", unit: "pupils", labels: ["Cricket", "Football", "Kabaddi", "Badminton", "Chess"], lo: 20, hi: 160, type: "bar" },
  { title: "Books borrowed from the library", about: "how many library books of each type were borrowed in a term", unit: "books", labels: ["Stories", "Science", "History", "Comics", "Poetry"], lo: 30, hi: 300, type: "bar" },
  { title: "Fruit sold at a market stall", about: "how many kilograms of each fruit a stall sold in a week", unit: "kilograms", labels: ["Mangoes", "Bananas", "Guavas", "Oranges", "Grapes"], lo: 20, hi: 150, type: "bar" },
  { title: "How pupils travel to school", about: "how the pupils of a school travel there each day", unit: "pupils", labels: ["Walk", "Bicycle", "Bus", "Car", "Auto"], lo: 20, hi: 200, type: "bar" },
  { title: "Plastic collected in a clean-up", about: "how much plastic each class collected in a beach clean-up", unit: "kilograms", labels: ["Class 5", "Class 6", "Class 7", "Class 8"], lo: 10, hi: 80, type: "bar" },
  { title: "Visitors to a museum by day", about: "how many people visited a museum on each day of a week", unit: "visitors", labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], lo: 40, hi: 400, type: "bar" },
  { title: "Rainfall in a town by month", about: "the rainfall in a town in each month of the monsoon", unit: "millimetres", labels: ["June", "July", "August", "September", "October"], lo: 40, hi: 260, type: "line" },
  { title: "Pupils in a school by year", about: "how many pupils a school had in each year", unit: "pupils", labels: ["2021", "2022", "2023", "2024", "2025"], lo: 300, hi: 700, type: "line" },
  { title: "Temperature in a city by month", about: "the average highest temperature in a city each month", unit: "degrees", labels: ["January", "February", "March", "April", "May", "June"], lo: 24, hi: 42, type: "line" },
  { title: "Electricity used by a school", about: "how many units of electricity a school used each month", unit: "units", labels: ["January", "February", "March", "April", "May"], lo: 200, hi: 900, type: "line" },
  { title: "Cyclists counted on a road", about: "how many cyclists were counted on a road each year", unit: "cyclists", labels: ["2020", "2021", "2022", "2023", "2024"], lo: 50, hi: 400, type: "line" },
];

/** An analytical paragraph written from the data: what it shows, the main feature, a detail, a conclusion. */
export function writeParagraph(c: ChartTask, about: string): string[] {
  const by = c.labels.map((l, i) => ({ l, v: c.values[i] })).sort((a, b) => b.v - a.v);
  const top = by[0];
  const second = by[1];
  const bottom = by[by.length - 1];
  if (c.type === "line") {
    const first = c.values[0];
    const last = c.values[c.values.length - 1];
    let big = 1;
    for (let i = 1; i < c.values.length; i++) if (Math.abs(c.values[i] - c.values[i - 1]) > Math.abs(c.values[big] - c.values[big - 1])) big = i;
    const d = c.values[big] - c.values[big - 1];
    return [
      `The line graph shows ${about}, from ${c.labels[0]} to ${c.labels[c.labels.length - 1]}.`,
      `The figure was highest in ${top.l}, at ${top.v} ${c.unit}, and lowest in ${bottom.l}, at ${bottom.v}.`,
      `The biggest change came between ${c.labels[big - 1]} and ${c.labels[big]}, when it ${d > 0 ? "rose" : "fell"} by ${Math.abs(d)}.`,
      `Overall, the figure ended ${last > first ? "higher" : "lower"} than it began, ${last > first ? "rising" : "falling"} from ${first} to ${last}.`,
    ];
  }
  const total = c.values.reduce((a, b) => a + b, 0);
  return [
    `The bar chart shows ${about}.`,
    `${top.l} had the highest figure, ${top.v} ${c.unit}, while ${bottom.l} had the lowest, only ${bottom.v}.`,
    `${second.l} came second with ${second.v}, ${top.v - second.v} fewer than ${top.l}.`,
    `Overall, ${total} ${c.unit} were counted, and ${top.l} alone accounts for about ${Math.round((100 * top.v) / total)} per cent of them.`,
  ];
}

export function generateChart(id: string): ChartTask {
  const r = rng(id);
  const th = pickOne(r, THEMES);
  const n = Math.min(th.labels.length, 4 + Math.floor(r() * 2));
  const labels = th.type === "line" ? th.labels.slice(0, n) : shuffle(r, th.labels).slice(0, n);
  const step = th.hi - th.lo > 100 ? 10 : th.hi - th.lo > 40 ? 5 : 1;
  const values: number[] = [];
  while (values.length < n) {
    const v = Math.round((th.lo + r() * (th.hi - th.lo)) / step) * step;
    // no two figures equal or adjacent, so highest, lowest and every comparison are clear
    if (!values.some((x) => Math.abs(x - v) < step * 2)) values.push(v);
  }
  const c: ChartTask = { id, level: 5 + (hash(id) % 3), title: th.title, type: th.type, unit: th.unit, labels, values, paragraph: [] };
  return { ...c, paragraph: writeParagraph(c, th.about) };
}

const ROAD_NAMES = ["Gandhi Road", "Nehru Road", "Market Road", "Station Road", "Lake Road", "Park Road", "Mill Road", "Bridge Road", "Hill Road", "Canal Road", "Garden Road", "Fort Road"];
const STREET_NAMES = ["North Street", "School Street", "Bazaar Street", "River Street", "Main Street", "Bank Street", "Car Street", "Mint Street", "Pond Street", "Well Street", "Silk Street", "Fair Street"];
const PLACE_NAMES = ["bus stand", "school", "hospital", "post office", "park", "library", "museum", "police station", "bank", "railway station", "market", "cinema", "stadium", "bakery", "fire station", "clinic", "zoo", "bookshop"];

export function generateMap(id: string): MapTask {
  for (let attempt = 0; ; attempt++) {
    const r = rng(`${id}|${attempt}`);
    const cols = shuffle(r, ROAD_NAMES).slice(0, 4);
    const rows = shuffle(r, STREET_NAMES).slice(0, 4);
    const corners = shuffle(r, Array.from({ length: 16 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) }))).slice(0, 7);
    const places = shuffle(r, PLACE_NAMES).slice(0, 7).map((name, i) => ({ name, ...corners[i] }));
    const base: MapTask = { id, level: 5, title: "", cols, rows, places, routes: [] };
    const routes: MapTask["routes"] = [];
    for (const a of shuffle(r, places))
      for (const b of shuffle(r, places)) {
        if (routes.length >= 3 || a === b || a.x === b.x || a.y === b.y || routes.some((x) => x.from === a.name || x.to === b.name)) continue;
        const dx: Dir = b.x > a.x ? "E" : "W";
        const dy: Dir = b.y > a.y ? "S" : "N";
        const moves = r() < 0.5 ? [{ dir: dx, blocks: Math.abs(b.x - a.x) }, { dir: dy, blocks: Math.abs(b.y - a.y) }] : [{ dir: dy, blocks: Math.abs(b.y - a.y) }, { dir: dx, blocks: Math.abs(b.x - a.x) }];
        if (wrongMoves(base, { from: a.name, to: b.name, moves }).length < 2) continue;
        routes.push({ from: a.name, to: b.name, moves });
      }
    if (routes.length === 3) return { ...base, level: 5 + (hash(id) % 3), title: `A map of ${cols[0].replace(" Road", "")} town`, routes };
  }
}

// ---- tasks, problems, sittings -------------------------------------------------------------------------------------

export interface StudyTask {
  id: string;
  kind: StudyKind;
  level: number;
  title: string;
}
export const STUDY_TASKS: StudyTask[] = [
  ...STUDY.notes.map((t) => ({ id: t.id, kind: "notes" as const, level: t.level, title: t.title })),
  ...STUDY.charts.map((t) => ({ id: t.id, kind: "chart" as const, level: t.level, title: t.title })),
  ...STUDY.maps.map((t) => ({ id: t.id, kind: "map" as const, level: t.level, title: t.title })),
];
const GENERATED = /^(chart|map)\.g\d+$/;
export const chartFor = (id: string): ChartTask => STUDY.charts.find((c) => c.id === id) ?? generateChart(id);
export const mapFor = (id: string): MapTask => STUDY.maps.find((m) => m.id === id) ?? generateMap(id);
export const notesFor = (id: string): NotesTask => STUDY.notes.find((n) => n.id === id)!;
export function taskFor(id: string): StudyTask {
  const t = STUDY_TASKS.find((x) => x.id === id);
  if (t) return t;
  if (!GENERATED.test(id)) throw new Error(`no study task ${id}`);
  const c = id.startsWith("chart") ? chartFor(id) : mapFor(id);
  return { id, kind: id.startsWith("chart") ? "chart" : "map", level: c.level, title: c.title };
}
export function stepsFor(id: string): Step[] {
  const t = taskFor(id);
  return t.kind === "notes" ? notesSteps(notesFor(id)) : t.kind === "chart" ? chartSteps(chartFor(id)) : mapSteps(mapFor(id));
}

export function studyProblems(s: Study): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const seen = (id: string) => (ids.has(id) ? out.push(`${id}: listed twice`) : ids.add(id));
  for (const t of s.notes) {
    seen(t.id);
    if (!t.text || !t.title) out.push(`${t.id}: no passage${t.source ? ` (source ${t.source} not found)` : ""}`);
    if (words(t.summaries.right) > 50) out.push(`${t.id}: the right summary has ${words(t.summaries.right)} words`);
    const main = t.points.filter((p) => p.main);
    if (main.length < 3 || main.length === t.points.length) out.push(`${t.id}: needs main points and at least one detail`);
    if (main.some((p) => !p.k?.length)) out.push(`${t.id}: a main point has no words to look for`);
    if (t.text) {
      const m = markSummary(t, t.summaries.right);
      if (m.passed !== m.checks.length) out.push(`${t.id}: the right summary fails its own check: ${m.checks.filter((c) => !c.ok).map((c) => c.note).join(" ")}`);
    }
  }
  for (const c of s.charts) {
    seen(c.id);
    if (c.labels.length !== c.values.length || c.labels.length < 4) out.push(`${c.id}: labels and values`);
    if (new Set(c.values).size !== c.values.length) out.push(`${c.id}: two bars of the same height`);
    if (c.paragraph.length !== 4) out.push(`${c.id}: a paragraph of four sentences`);
    const top = c.labels[c.values.indexOf(Math.max(...c.values))];
    if (!c.paragraph.join(" ").toLowerCase().includes(top.toLowerCase())) out.push(`${c.id}: the paragraph does not name the highest bar`);
  }
  for (const m of s.maps) {
    seen(m.id);
    for (const p of m.places) if (m.places.filter((q) => q.x === p.x && q.y === p.y).length > 1) out.push(`${m.id}: two places on one corner`);
    for (const r of m.routes) {
      if (placeAt(m, walk(m, r.from, r.moves)) !== r.to) out.push(`${m.id}: the route from ${r.from} does not reach ${r.to}`);
      const turns = (a: Dir, b: Dir) => (DIRS.indexOf(a) - DIRS.indexOf(b) + 4) % 2 === 1;
      if (r.moves.some((mv, i) => mv.blocks < 1 || (i > 0 && !turns(mv.dir, r.moves[i - 1].dir)))) out.push(`${m.id}: each stretch of the route from ${r.from} must be a block or more and turn left or right`);
      if (wrongMoves(m, r).length < 2) out.push(`${m.id}: the route from ${r.from} has too few wrong directions`);
    }
  }
  if (s === STUDY)
    for (const t of STUDY_TASKS)
      for (const st of stepsFor(t.id)) if (st.kind === "choose" && (st.options.length !== 3 || new Set(st.options).size !== 3)) out.push(`${t.id}: "${st.prompt.slice(0, 40)}" needs three different options`);
  return out;
}
{
  const problems = studyProblems(STUDY);
  if (problems.length) throw new Error(`notes, charts and maps: ${problems.slice(0, 5).join("; ")}`);
}

/** One task done: right or wrong for each step, and, if one was written, how the learner's own piece was marked. */
export type StudyRecord = { type: "study"; task: string; kind: StudyKind; answers: { skill: StudySkill; correct: boolean }[]; own?: { words: number; passed: number; of: number } };

/** How well each kind of task goes: share of steps right and of own-writing checks met (null before any). */
export function kindStrength(records: readonly StudyRecord[], k: StudyKind): number | null {
  const rs = records.filter((r) => r.kind === k);
  const steps = rs.flatMap((r) => r.answers);
  const own = rs.flatMap((r) => (r.own ? [r.own] : []));
  const asked = steps.length + own.reduce((a, o) => a + o.of, 0);
  if (!asked) return null;
  return (steps.filter((a) => a.correct).length + own.reduce((a, o) => a + o.passed, 0)) / asked;
}

/**
 * The next task: one not yet done. A kind not yet tried comes first, so every kind is met; then the kind going worst;
 * but never the same kind three times running, so a learner is not kept on one kind. Within a kind, the lowest level
 * first. Charts and maps never run out: when the written ones are done, the next generated one comes ("chart.g1", …).
 */
export function nextStudy(records: readonly StudyRecord[], kind?: StudyKind): StudyTask | null {
  const done = new Set(records.map((r) => r.task));
  const met = (k: StudyKind) => records.filter((r) => r.kind === k).length;
  const need = (k: StudyKind) => (met(k) ? (kindStrength(records, k) ?? 1) : -1);
  const last = records.slice(-2).map((r) => r.kind);
  const tired = (k: StudyKind) => !kind && last.length === 2 && last.every((x) => x === k);
  const fresh = (k: "chart" | "map") => {
    let n = 1;
    while (done.has(`${k}.g${n}`)) n++;
    return taskFor(`${k}.g${n}`);
  };
  const candidates = (["notes", "chart", "map"] as const)
    .filter((k) => !kind || k === kind)
    .flatMap((k) => {
      const left = STUDY_TASKS.filter((t) => t.kind === k && !done.has(t.id)).sort((a, b) => a.level - b.level || (a.id < b.id ? -1 : 1));
      return left.length ? [left[0]] : k === "notes" ? [] : [fresh(k)];
    });
  const order = (a: StudyTask, b: StudyTask) => Number(tired(a.kind)) - Number(tired(b.kind)) || need(a.kind) - need(b.kind) || met(a.kind) - met(b.kind) || a.level - b.level || (a.id < b.id ? -1 : 1);
  return candidates.sort(order)[0] ?? null;
}

export interface StudySummary {
  tasks: number;
  right: number;
  asked: number;
  /** Skills with three or more answers, four in five right or better. */
  strong: StudySkill[];
  /** Skills with two or more answers, under half right, worst first. */
  weak: StudySkill[];
  /** The learner's own pieces: how many, and the rule checks met in all. */
  own: { pieces: number; passed: number; of: number };
}
export function studySummary(records: readonly StudyRecord[]): StudySummary {
  const all = records.flatMap((r) => r.answers);
  const by = new Map<StudySkill, { right: number; n: number }>();
  for (const a of all) {
    const x = by.get(a.skill) ?? { right: 0, n: 0 };
    by.set(a.skill, { right: x.right + (a.correct ? 1 : 0), n: x.n + 1 });
  }
  const share = (k: StudySkill) => by.get(k)!.right / by.get(k)!.n;
  const own = records.flatMap((r) => (r.own ? [r.own] : []));
  return {
    tasks: records.length,
    right: all.filter((a) => a.correct).length,
    asked: all.length,
    strong: [...by.keys()].filter((k) => by.get(k)!.n >= 3 && share(k) >= 0.8),
    weak: [...by.keys()].filter((k) => by.get(k)!.n >= 2 && share(k) < 0.5).sort((a, b) => share(a) - share(b)),
    own: { pieces: own.length, passed: own.reduce((a, o) => a + o.passed, 0), of: own.reduce((a, o) => a + o.of, 0) },
  };
}

export interface StudyView {
  phase: "read" | "step" | "answered" | "own" | "done";
  index: number;
  total: number;
  step: Step | null;
  answered: { correct: boolean; explain: string; answer: string } | null;
  right: number;
}
export type OwnResult = OwnMark & { endsAt?: string | null; offMap?: boolean };

export class StudySitting {
  readonly task: StudyTask;
  readonly steps: Step[];
  private phase: StudyView["phase"] = "read";
  private index = 0;
  private readonly answers: { skill: StudySkill; correct: boolean }[] = [];
  private last: StudyView["answered"] = null;
  private own: StudyRecord["own"];
  private readonly log: StudyRecord[] = [];

  constructor(task: StudyTask) {
    this.task = task;
    this.steps = stepsFor(task.id);
  }
  read(): void {
    if (this.phase === "read") this.phase = "step";
  }
  private mark(correct: boolean, answer: string): void {
    const s = this.steps[this.index];
    this.answers.push({ skill: s.skill, correct });
    this.last = { correct, explain: s.explain, answer };
    this.phase = "answered";
  }
  choose(i: number): void {
    const s = this.steps[this.index];
    if (this.phase !== "step" || s.kind !== "choose" || !Number.isInteger(i) || i < 0 || i >= s.options.length) return;
    this.mark(i === s.answer, s.options[s.answer]);
  }
  /** Tapped options, in any order; right only when exactly the main points are picked. */
  pick(chosen: readonly number[]): void {
    const s = this.steps[this.index];
    if (this.phase !== "step" || s.kind !== "pick") return;
    const got = [...new Set(chosen)].sort((a, b) => a - b);
    this.mark(got.join() === s.answer.join(), s.answer.map((i) => s.options[i]).join("; "));
  }
  /** The parts in the order the learner put them. */
  order(sequence: readonly number[]): void {
    const s = this.steps[this.index];
    if (this.phase !== "step" || s.kind !== "order" || sequence.length !== s.parts.length) return;
    this.mark(sequence.join() === s.answer.join(), s.answer.map((i) => s.parts[i]).join(" "));
  }
  next(): void {
    if (this.phase !== "answered") return;
    this.last = null;
    if (++this.index < this.steps.length) this.phase = "step";
    else this.phase = "own";
  }
  /** What the learner writes at the end: a summary, an analytical paragraph or directions. */
  ownTask(): string {
    if (this.task.kind === "notes") return "Write your own summary of the passage, in fifty words or fewer.";
    if (this.task.kind === "chart") return "Write your own analytical paragraph about the chart, in 50 to 120 words: what it shows, the main feature, details with figures, and a conclusion.";
    const trip = ownTrip(mapFor(this.task.id));
    return `Write directions from the ${trip.from} to the ${trip.to}. Start with a compass direction, then say where to turn and how many blocks.`;
  }
  /** The learner's own piece, marked by rule; only its length and the checks passed are kept, never the words. */
  writeOwn(text: string): OwnResult | null {
    if (this.phase !== "own" || !text.trim()) return null;
    const m: OwnResult =
      this.task.kind === "notes" ? markSummary(notesFor(this.task.id), text) : this.task.kind === "chart" ? markParagraph(chartFor(this.task.id), text) : markDirections(mapFor(this.task.id), ownTrip(mapFor(this.task.id)), text);
    this.own = { words: m.words, passed: m.passed, of: m.checks.length };
    return m;
  }
  finish(): void {
    if (this.phase === "done" || this.phase === "read") return;
    this.phase = "done";
    this.log.push({ type: "study", task: this.task.id, kind: this.task.kind, answers: [...this.answers], ...(this.own ? { own: this.own } : {}) });
  }
  snapshot(): StudyView {
    return { phase: this.phase, index: this.index, total: this.steps.length, step: this.phase === "step" || this.phase === "answered" ? this.steps[this.index] : null, answered: this.last, right: this.answers.filter((a) => a.correct).length };
  }
  take(): StudyRecord[] {
    return this.log.splice(0);
  }
}
