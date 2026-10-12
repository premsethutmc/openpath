/**
 * Ten simulated learners with hidden "true" levels on the 17 skeleton
 * capabilities. The engine never sees these; they only decide how the
 * simulated learner answers.
 */
import type { CapabilityId, CodeItem, Response, WritingTask } from "../../../packages/english-core/src/index.ts";
import { formatKind, guessingFloor, itemParams, pCorrect } from "../../../packages/english-core/src/index.ts";

export const CAP = {
  infl: "EN.FND.SPL.inflections",
  gen: "EN.VOC.BRD.general",
  suf: "EN.VOC.MOR.suffixes",
  ctx: "EN.VOC.CTX.context",
  art: "EN.GRM.NOUN.articles",
  asp: "EN.GRM.VERB.aspect",
  sva: "EN.GRM.VERB.sva",
  com: "EN.GRM.PUN.commas",
  run: "EN.SEN.CMP.run_ons",
  sub: "EN.SEN.CMB.subordination",
  loc: "EN.RDG.LIT.locate_detail",
  mot: "EN.RDG.INF.motives",
  main: "EN.RDG.SUM.main_idea",
  task: "EN.WRT.TSK.task_response",
  para: "EN.WRT.ORG.paragraphing",
  wgr: "EN.WRT.ACC.grammar",
  wsp: "EN.WRT.ACC.spelling",
} as const;
export type Short = keyof typeof CAP;

export interface SimLearner {
  id: string;
  name: string;
  profile: string;
  /** True level per skeleton capability. */
  truth: Record<Short, number>;
  /** Misconceptions this learner really holds (used to pick their wrong answers). */
  misconceptions: string[];
  /** Chance of answering at random regardless of ability. */
  guess?: number;
  /** Day from which some capabilities drop (forgetting), and their new levels. */
  drop?: { fromDay: number; to: Partial<Record<Short, number>> };
}

const all = (v: number): Record<Short, number> => Object.fromEntries(Object.keys(CAP).map((k) => [k, v])) as Record<Short, number>;

export const LEARNERS: SimLearner[] = [
  { id: "L1", name: "Balanced", profile: "Typical: everything around 5", truth: all(5), misconceptions: [] },
  {
    id: "L2",
    name: "Foundational gap",
    profile: "Spelling and word-level skills about 2; others about 3.5",
    truth: { infl: 2, gen: 3.5, suf: 2.5, ctx: 3.5, art: 3.5, asp: 3.5, sva: 3.5, com: 3, run: 3, sub: 3.5, loc: 4, mot: 3.5, main: 3.5, task: 3.5, para: 3, wgr: 3, wsp: 2 },
    misconceptions: ["no_doubling", "kept_silent_e", "phonetic_spelling"],
  },
  {
    id: "L3",
    name: "Strong reader, weak writer",
    profile: "Reading and vocabulary about 6.5; writing about 3.5",
    truth: { infl: 5, gen: 6, suf: 5.5, ctx: 6.5, art: 5, asp: 5, sva: 5, com: 4.5, run: 4, sub: 4.5, loc: 6.5, mot: 6.5, main: 6.5, task: 3.5, para: 3, wgr: 4, wsp: 4 },
    misconceptions: ["no_paragraphs"],
  },
  {
    id: "L4",
    name: "Rich vocabulary, weak grammar",
    profile: "Vocabulary about 6.5; grammar about 3.5",
    truth: { infl: 5, gen: 6.5, suf: 6, ctx: 6.5, art: 3.5, asp: 3.5, sva: 3, com: 4, run: 4.5, sub: 5, loc: 5.5, mot: 5.5, main: 5.5, task: 5, para: 5, wgr: 3.5, wsp: 5 },
    misconceptions: ["third_person_s", "article_omission", "perfect_with_finished_time"],
  },
  {
    id: "L5",
    name: "Accurate grammar, narrow vocabulary",
    profile: "Grammar about 6; vocabulary about 3.5",
    truth: { infl: 5.5, gen: 3.5, suf: 3.5, ctx: 3.5, art: 6, asp: 6, sva: 6, com: 6, run: 5.5, sub: 5, loc: 4.5, mot: 4, main: 4.5, task: 4.5, para: 5, wgr: 6, wsp: 5.5 },
    misconceptions: ["ignores_context", "wrong_word_class"],
  },
  {
    id: "L6",
    name: "Literal-only reader",
    profile: "Finds stated detail (6) but not inference or main idea (3)",
    truth: { ...all(5), loc: 6, mot: 3, main: 3 },
    misconceptions: ["literal_only", "detail_as_main"],
  },
  { id: "L7", name: "Advanced", profile: "About 7.5 throughout", truth: all(7.5), misconceptions: [] },
  {
    id: "L8",
    name: "Run-on writer",
    profile: "Sentence boundaries about 3 with a comma-splice habit; others about 5",
    truth: { ...all(5), run: 3, com: 4 },
    misconceptions: ["comma_splice", "fused_sentence"],
  },
  { id: "L9", name: "Inconsistent guesser", profile: "True level about 4, but answers at random 30% of the time", truth: all(4), misconceptions: [], guess: 0.3 },
  {
    id: "L10",
    name: "Forgetter",
    profile: "About 5; grammar drops to 3.5 after day 14",
    truth: all(5),
    misconceptions: [],
    drop: { fromDay: 14, to: { art: 3.5, asp: 3.5, sva: 3.5, com: 3.5 } },
  },
];

const SHORT_OF = new Map(Object.entries(CAP).map(([k, v]) => [v as string, k as Short]));

export function trueLevel(l: SimLearner, cap: CapabilityId, day: number): number {
  const s = SHORT_OF.get(cap);
  if (!s) throw new Error(`no true level for ${cap}`);
  if (l.drop && day >= l.drop.fromDay && l.drop.to[s] !== undefined) return l.drop.to[s]!;
  return l.truth[s];
}

export function trueLevels(l: SimLearner, day: number): Record<CapabilityId, number> {
  return Object.fromEntries(Object.values(CAP).map((c) => [c, trueLevel(l, c, day)]));
}

/** How a simulated learner answers a code-scored item (the same response model the engine assumes, plus guessing). */
export function respond(l: SimLearner, item: CodeItem, day: number, next: () => number): Response {
  const theta = trueLevel(l, item.target, day);
  const guessing = l.guess && next() < l.guess;
  const k = formatKind(item.format);
  const correct = guessing ? (k === "choice" ? next() < 1 / (item.options?.length ?? 4) : k === "typed" ? next() < 0.05 : next() < guessingFloor(item)) : next() < pCorrect(theta, itemParams(item));
  if (item.format.startsWith("choice:")) {
    if (correct) return { kind: "choice", choice: item.answer! };
    const wrong = item.options!.map((_, i) => i).filter((i) => i !== item.answer);
    const habitual = wrong.filter((i) => l.misconceptions.includes(item.distractor_tags?.[String(i)] ?? ""));
    const pool = habitual.length && !guessing ? habitual : wrong;
    return { kind: "choice", choice: pool[Math.floor(next() * pool.length)] };
  }
  if (formatKind(item.format) === "typed") {
    if (correct) return { kind: "typed", text: item.answers![0] };
    const habitual = Object.entries(item.wrong ?? {}).find(([, tag]) => l.misconceptions.includes(tag));
    return { kind: "typed", text: habitual && !guessing ? habitual[0] : "(no answer)" };
  }
  return respondStructured(l, item, correct, !!guessing, next);
}

/** Order, match and multi items (E2): the right answer, a habitual wrong answer, or a near-miss. */
function respondStructured(l: SimLearner, item: CodeItem, correct: boolean, guessing: boolean, next: () => number): Response {
  const kind = formatKind(item.format) as "order" | "match" | "multi";
  const right = kind === "order" ? item.answer_order! : kind === "match" ? item.answer_pairs! : [...item.answer_set!].sort((a, b) => a - b);
  const wrap = (xs: number[]): Response => (kind === "order" ? { kind, order: xs } : kind === "match" ? { kind, pairs: xs } : { kind, choices: xs });
  if (correct) return wrap([...right]);
  const habitual = Object.entries(item.wrong ?? {}).find(([, tag]) => l.misconceptions.includes(tag));
  if (habitual && !guessing) return wrap(habitual[0].split(",").map(Number));
  const xs = [...right];
  if (kind === "multi") {
    // swap one correct choice for a wrong one
    const wrong = item.options!.map((_, i) => i).filter((i) => !right.includes(i));
    xs[Math.floor(next() * xs.length)] = wrong[Math.floor(next() * wrong.length)];
    return wrap(xs.sort((a, b) => a - b));
  }
  // order and match: swap two neighbouring entries
  const i = Math.floor(next() * (xs.length - 1));
  [xs[i], xs[i + 1]] = [xs[i + 1], xs[i]];
  return wrap(xs);
}

/** A simulated written response: the candidate anchor closest to the learner's level for that task. */
export function writeResponse(l: SimLearner, task: WritingTask, day: number): string {
  const level = task.targets.reduce((s, t) => s + trueLevel(l, t, day), 0) / task.targets.length;
  const avg = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length;
  return [...task.anchors].sort((a, b) => Math.abs(avg(a.scores) - level) - Math.abs(avg(b.scores) - level))[0].text;
}
