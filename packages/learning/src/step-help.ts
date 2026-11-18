/**
 * step-help@1: help at the step where a learner is stuck, from what the question already holds.
 *
 * Every generated question carries its verified working as steps, and each step names its operation and the skill it
 * leans on (for 120 ÷ 3: "40 × 3 = 120", multiply, "Use multiplication facts"). So for any question the engine can say, in
 * order and only as far as it is asked: what to do next (the operation, no numbers worked), which other skill that step
 * needs and that skill's own rule (a card), and then the step itself. Nothing is written per question and nothing is
 * fetched. A card is assembled from the skill's own lesson; `source` says how, so a person can review the thin ones.
 */
import { SOLE_WAYS, workedWays } from "./worked-out";
import { deepen } from "./deepen";
import { deeperCalculus } from "./deeper-calculus";
import { moduleFor } from "./content";
import { explainStep, problemOf } from "./families";
import { graph } from "./graph";

export interface Card {
  competency: string;
  name: string;
  /** The skill's own rule, in its lesson's words (one or two short paragraphs). */
  rule: string[];
  /** One worked example of the skill, from its lesson, when the lesson has a generated one. */
  example: { prompt: string; steps: string[]; answer: string } | null;
  /** Where the rule came from: the lesson's method section, its first teaching section, or its opening words. */
  source: "method" | "lesson" | "chapter";
}
export interface StepHelp {
  /** What to do, with no number worked: "Next: multiply." */
  next: string;
  /** The step itself, as the family explains it. */
  shown: string;
  /** The other skill this step leans on (null when it is the question's own skill). */
  needs: string | null;
  /** deepen@1: a line of the working inside one of the question's own steps (made by rule, not one of its steps). */
  finer?: true;
  /** The skill the step belongs to (its own skill or the one it leans on), when that skill has a card: the rule behind the step. */
  rule?: string;
  /** board@1: the written layout once this step is done (long division), a text line per row */
  board?: string[];
}

const short = (t: string) => t.trim().length > 0 && t.length <= 260;
const cards = new Map<string, Card | null>();
/** The help card of a skill, assembled from its own lesson; null when the skill has no lesson or no usable words. */
export function cardFor(competency: string): Card | null {
  if (cards.has(competency)) return cards.get(competency)!;
  let card: Card | null = null;
  try {
    const m = moduleFor(competency);
    if (m) {
      const screens = m.strategies.flatMap((s) => s.screens);
      const method = screens.find((x) => /^how to do it$/i.test(x.title ?? "") && x.text?.some(short));
      const lesson = screens.find((x) => x.text?.some(short));
      const chapter = m.chapter.find((x) => x.text?.some(short));
      const from = method ?? lesson ?? chapter;
      if (from) {
        const withExample = [...screens, ...m.chapter].find((x) => x.instance && problemOf(x.instance)?.steps.length);
        const p = withExample ? problemOf(withExample.instance!)! : null;
        card = {
          competency, name: graph.get(competency)?.name ?? m.title,
          rule: from.text.filter(short).slice(0, 2),
          example: p ? { prompt: p.prompt, steps: p.steps.map((s) => explainStep(p, s)), answer: p.answer } : null,
          source: method ? "method" : lesson ? "lesson" : "chapter",
        };
      }
    }
  } catch { card = null; }
  cards.set(competency, card);
  return card;
}

const NEXT: Record<string, string> = { note: "notice what the question gives you", evaluate: "work out the value", "choose the option": "pick the option that fits", read: "read it off the picture", write: "write it down in the form asked", recall: "remember the fact you need", check: "check it" };
/**
 * cue-numbers@1: "multiply." tells a stuck child nothing. Where a step is one plain calculation, the cue names the numbers
 * it is done with ("multiply 50 by 6", "take 300 away from 348"), never its result. The numbers are the step's own
 * inputs, and the wording is used only when the calculation it describes gives the step's own value, both numbers are
 * there in the step as it is shown, both are given (in the question, or worked out in an earlier step), and the result
 * is not one of them (5 × 1 would say its own answer).
 */
function cueWith(op: string, inputs: unknown, value: unknown, shown: string, given: Set<number>): string | null {
  if (!Array.isArray(inputs) || typeof value !== "number" || !Number.isFinite(value)) return null;
  const xs = inputs as number[];
  // a number that is neither in the question nor the result of an earlier step is this step's own choice (the 50 in
  // "50 × 6" of a long division): naming it would do the thinking for the learner
  if (!xs.every((x) => given.has(x))) return null;
  if (xs.length < 2 || xs.length > 3 || !xs.every((x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-6)) return null;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const said = (x: number) => String(Math.round(x * 1000) / 1000);
  const flat = shown.replace(/(\d),(?=\d)/g, "$1");
  if (xs.some((x) => near(x, value)) || !xs.every((x) => new RegExp(`(^|[^\\d.])${said(x).replace(".", "\\.")}([^\\d]|\\.(?!\\d)|$)`).test(flat))) return null;
  const [a, b] = xs, n = (x: number) => said(x).replace(/\B(?=(\d{3})+(?!\d))/g, x >= 10000 && Number.isInteger(x) ? "," : "");
  if (op === "add" && near(xs.reduce((t, x) => t + x, 0), value)) return xs.length === 2 ? `add ${n(a)} and ${n(b)}` : `add ${n(xs[0])}, ${n(xs[1])} and ${n(xs[2])}`;
  if (xs.length !== 2) return null;
  if (op === "subtract") return near(a - b, value) ? `take ${n(b)} away from ${n(a)}` : near(b - a, value) ? `take ${n(a)} away from ${n(b)}` : null;
  if (op === "multiply") return near(a * b, value) ? `multiply ${n(a)} by ${n(b)}` : null;
  if (op === "divide") return b !== 0 && near(a / b, value) ? `divide ${n(a)} by ${n(b)}` : a !== 0 && near(b / a, value) ? `divide ${n(b)} by ${n(a)}` : null;
  return null;
}
/** The steps of a question as help, in order; null when it is not a generated question or has no steps. */
/**
 * methods@1: the ways a question's help can be worked, by name, the taught method first. Where the taught method is
 * written out (worked-out@1) and the type's own steps are a real alternative (two steps or more), there are two: the
 * learner can switch between them. One name otherwise.
 */
export function helpMethods(qid: string): string[] {
  const p = problemOf(qid.replace(/:(mc|w)$/, ""));
  if (!p || !p.steps.length) return [];
  const ways = workedWays(p);
  if (!ways) return ["Step by step"];
  // with one written way, the type's own steps are the second where they are a real alternative; with several, they are enough
  // the type's own steps for unlike fractions and for decimals are the same method, only shorter: not a second way
  if (ways.length === 1 && (SOLE_WAYS.includes(ways[0].name) || p.family === "agdec")) return [ways[0].name];
  return ways.length === 1 && p.steps.length >= 2 ? [ways[0].name, ALT[p.family] ?? (ways[0].name === "In columns" ? "By place value" : "Another way")] : ways.map((w) => w.name);
}
const ALT: Record<string, string> = { ldiv: "In easy parts", avdiv: "Check by multiplying" };
/** The steps of a question as help, in order (in its `method`-th way: see helpMethods); null when it is not a generated question or has no steps. */
export function stepsHelp(qid: string, method = 0): StepHelp[] | null {
  const p = problemOf(qid.replace(/:(mc|w)$/, ""));
  if (!p || !p.steps.length) return null;
  // worked-out@1: a type whose own steps leap over the work has the whole working written for it
  const ways = workedWays(p), full = ways && method < ways.length ? ways[method].steps : null;
  if (full) return full.map((w) => ({ next: w.next, shown: w.shown, needs: w.needs && w.needs !== p.competency && cardFor(w.needs) ? w.needs : null, ...(cardFor(p.competency) ? { rule: p.competency } : {}), ...(w.board ? { board: w.board } : {}) }));
  // deeper-calculus@1: the working a calculus question's own steps leave out goes between its first step and its last
  const worked: StepHelp[] = /calculus|integra|differen/.test(p.competency) ? deeperCalculus(p).map((f) => ({ next: f.next, shown: f.shown, needs: null, finer: true as const })) : [];
  const inQuestion = (p.prompt.replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return p.steps.flatMap((s, i) => {
    const given = new Set<number>([...inQuestion, ...p.steps.slice(0, i).map((t) => (t as { value?: unknown }).value).filter((v): v is number => typeof v === "number")]);
    const own: StepHelp = {
      next: `${i === 0 ? "First" : i === p.steps.length - 1 ? "Last" : "Next"}: ${cueWith(s.op, (s as { inputs?: unknown }).inputs, (s as { value?: unknown }).value, explainStep(p, s), given) ?? NEXT[s.op] ?? s.op}.`,
      shown: explainStep(p, s),
      needs: s.competency !== p.competency && cardFor(s.competency) ? s.competency : null,
      ...(cardFor(s.competency) ? { rule: s.competency } : {}),
    };
    // deepen@1: the working inside the step, line by line, comes before the step itself (which then sums it up)
    if (worked.length) return i === 0 ? [own, ...worked.map((w) => ({ ...w, ...(own.rule ? { rule: own.rule } : {}) }))] : [own];
    const finer = deepen(own.shown);
    if (finer.length < 2) return [own];
    // lead-in@1: the first line of each calculation's working says which calculation it is, so "16 = 10 + 6" never
    // arrives from nowhere; the step itself then closes the working instead of opening it
    const sums = [...own.shown.replace(/(\d),(?=\d{3}\b)/g, "$1").matchAll(/(?<![\d.\/−-])(\d{1,7})\s*([×÷+−])\s*(\d{1,7})\s*=\s*\d{1,12}(?![\d.\/])/g)];
    const led = sums.flatMap((m) => deepen(m[0]).map((f, k) => (k === 0 ? { ...f, next: `To work out ${m[1]} ${m[2]} ${m[3]}: ${f.next.charAt(0).toLowerCase()}${f.next.slice(1)}` } : f)));
    const calc = !/∫|d\s*\/\s*d[a-z]/.test(own.shown) && led.length === finer.length;
    const lines: StepHelp[] = (calc ? led : finer).map((f) => ({ next: f.next, shown: f.shown, needs: null, finer: true, ...(own.rule ? { rule: own.rule } : {}) }));
    if (calc) { if (i === 0) lines[0].next = `First: ${lines[0].next.charAt(0).toLowerCase()}${lines[0].next.slice(1)}`; own.next = own.next.replace(/^First: /, "Now: "); }
    // an integral or a derivative is set up by the step and then worked; a calculation is worked and then stated
    return /∫|d\s*\/\s*d[a-z]/.test(own.shown) ? [own, ...lines] : [...lines, own];
  });
}
