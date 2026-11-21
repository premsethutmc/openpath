/**
 * Notes, charts and maps (content/english/study/tasks.json): the study skills the school syllabuses ask for that
 * no other activity practises.
 *
 *   notes  read a passage, choose its title, pick its main points (not the details), choose the best summary of
 *          fifty words or fewer, and, if the learner wants, write one of their own, checked by rule;
 *   chart  read a bar chart: highest, lowest, a difference, a true comparison, then put an analytical paragraph
 *          about it in order;
 *   map    a street map: which place is on a corner, which directions lead from one place to another, and where a
 *          set of directions ends.
 *
 * Chart and map questions are worked out from the data by code, so every answer is checkable. Practice-only:
 * nothing here is evidence for the engine.
 */
import studyJson from "../../../../../content/english/study/tasks.json";

export interface NotesTask {
  id: string;
  level: number;
  title: string;
  text: string;
  titles: { right: string; wrong: string[] };
  points: { text: string; main: boolean }[];
  summaries: { right: string; wrong: string[] };
  /** Words a good summary of this passage is likely to use, for the rule-based check of the learner's own. */
  keys: string[];
}
export interface ChartTask {
  id: string;
  level: number;
  title: string;
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
export const STUDY: Study = studyJson as unknown as Study;

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
const mix = <T>(xs: readonly T[], key: string, show: (x: T) => string): T[] => xs.map((x) => ({ x, k: hash(`${key}|${show(x)}`) })).sort((a, b) => a.k - b.k).map((e) => e.x);
function choose(skill: StudySkill, key: string, prompt: string, right: string, wrong: string[], explain: string): Step {
  const options = mix([right, ...wrong], key, (o) => o);
  return { kind: "choose", skill, prompt, options, answer: options.indexOf(right), explain };
}
const WORDS = ["no", "one", "two", "three", "four", "five", "six"];
export const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

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

/** The rule-based check of a summary the learner writes: length, and how many of the passage's key ideas it names. */
export function checkSummary(t: NotesTask, text: string): { words: number; keys: string[]; missing: string[]; notes: string[] } {
  const n = words(text);
  const low = text.toLowerCase();
  const keys = t.keys.filter((k) => low.includes(k.toLowerCase()));
  const missing = t.keys.filter((k) => !keys.includes(k));
  const notes: string[] = [];
  if (n > 50) notes.push(`${n} words: a summary here should be fifty or fewer. Leave out examples and details.`);
  else if (n < 15) notes.push(`${n} words: too short to hold the main points.`);
  else notes.push(`${n} words: a good length.`);
  if (keys.length >= Math.ceil(t.keys.length * 0.75)) notes.push("It names the main ideas.");
  else notes.push(`It may leave out a main idea. Check your notes for: ${missing.join(", ")}.`);
  if (text.trim() && !/[.!?]$/.test(text.trim())) notes.push("End with a full stop.");
  return { words: n, keys, missing, notes };
}

// ---- charts -------------------------------------------------------------------------------------------------------

export function chartSteps(c: ChartTask): Step[] {
  const by = c.labels.map((l, i) => ({ l, v: c.values[i] })).sort((a, b) => b.v - a.v);
  const [top, second] = by;
  const bottom = by[by.length - 1];
  const others = (l: string) => by.filter((x) => x.l !== l).map((x) => x.l);
  const diff = top.v - bottom.v;
  const near = [...new Set([diff + 10, diff - 10, top.v, bottom.v, diff + 5].filter((d) => d > 0 && d !== diff))].slice(0, 2);
  const order = mix(c.paragraph.map((_, i) => i), `${c.id}|para`, (i) => c.paragraph[i]);
  return [
    choose("chart_read", `${c.id}|top`, `Which has the highest figure (${c.unit})?`, top.l, others(top.l).slice(-2), `${top.l} has the longest bar: ${top.v} ${c.unit}.`),
    choose("chart_read", `${c.id}|bottom`, `Which has the lowest figure (${c.unit})?`, bottom.l, others(bottom.l).slice(0, 2), `${bottom.l} has the shortest bar: ${bottom.v} ${c.unit}.`),
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
export function stepsFor(id: string): Step[] {
  const n = STUDY.notes.find((t) => t.id === id);
  if (n) return notesSteps(n);
  const c = STUDY.charts.find((t) => t.id === id);
  if (c) return chartSteps(c);
  return mapSteps(STUDY.maps.find((t) => t.id === id)!);
}

export function studyProblems(s: Study): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const seen = (id: string) => (ids.has(id) ? out.push(`${id}: listed twice`) : ids.add(id));
  for (const t of s.notes) {
    seen(t.id);
    if (words(t.summaries.right) > 50) out.push(`${t.id}: the right summary has ${words(t.summaries.right)} words`);
    const main = t.points.filter((p) => p.main).length;
    if (main < 3 || main === t.points.length) out.push(`${t.id}: needs main points and at least one detail`);
    if (t.keys.some((k) => !t.text.toLowerCase().includes(k.toLowerCase()))) out.push(`${t.id}: a key word is not in the passage`);
    if (t.keys.some((k) => !t.summaries.right.toLowerCase().includes(k.toLowerCase()))) out.push(`${t.id}: the right summary misses a key word`);
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
      if (r.moves.some((mv, i) => mv.blocks < 1 || (i > 0 && !turns(mv.dir, r.moves[i - 1].dir))))
        out.push(`${m.id}: each stretch of the route from ${r.from} must be a block or more and turn left or right`);
      if (wrongMoves(m, r).length < 2) out.push(`${m.id}: the route from ${r.from} has too few wrong directions`);
    }
  }
  if (s === STUDY)
    for (const t of STUDY_TASKS)
      for (const st of stepsFor(t.id)) {
        if (st.kind === "choose" && (st.options.length !== 3 || new Set(st.options).size !== 3)) out.push(`${t.id}: "${st.prompt.slice(0, 40)}" needs three different options`);
      }
  return out;
}
{
  const problems = studyProblems(STUDY);
  if (problems.length) throw new Error(`notes, charts and maps: ${problems.slice(0, 5).join("; ")}`);
}

/** One task done: a right or wrong for each step, and, if one was written, the length of the learner's own summary. */
export type StudyRecord = { type: "study"; task: string; kind: StudyKind; answers: { skill: StudySkill; correct: boolean }[]; own?: { words: number; keys: number; of: number } };

/** The next task: one not yet done, the kind met least first, the lowest level first. */
export function nextStudy(records: readonly StudyRecord[], kind?: StudyKind): StudyTask | null {
  const done = new Set(records.map((r) => r.task));
  const met = (k: StudyKind) => records.filter((r) => r.kind === k).length;
  return STUDY_TASKS.filter((t) => !done.has(t.id) && (!kind || t.kind === kind)).sort((a, b) => met(a.kind) - met(b.kind) || a.level - b.level || (a.id < b.id ? -1 : 1))[0] ?? null;
}
export function studySummary(records: readonly StudyRecord[]): { tasks: number; right: number; asked: number } {
  const all = records.flatMap((r) => r.answers);
  return { tasks: records.length, right: all.filter((a) => a.correct).length, asked: all.length };
}

export interface StudyView {
  phase: "read" | "step" | "answered" | "own" | "done";
  index: number;
  total: number;
  step: Step | null;
  answered: { correct: boolean; explain: string; answer: string } | null;
  right: number;
}

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
    else if (this.task.kind === "notes") this.phase = "own";
    else this.finish();
  }
  /** The learner's own summary, checked by rule; never kept, only its length and how many key ideas it named. */
  writeOwn(text: string): ReturnType<typeof checkSummary> | null {
    if (this.phase !== "own") return null;
    const t = STUDY.notes.find((x) => x.id === this.task.id)!;
    const c = checkSummary(t, text);
    this.own = { words: c.words, keys: c.keys.length, of: t.keys.length };
    return c;
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
