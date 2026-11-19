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
import { explainStep, pool, problemOf } from "./families";
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
  /**
   * how@1: the working of a calculation inside this step, folded away. The step is about its own skill; how 247 ÷ 19
   * is worked is opened only when asked for ("How?"): the lines of working, the finished written layout where there
   * is one, and the skill that teaches it where that skill has a card.
   */
  how?: { lines: string[]; board?: string[]; skill?: string };
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
  // cue-money@1: an amount written as text ("35.75", "₹143.00") is the number it says
  const num = (v: unknown): unknown => (typeof v === "string" && /^₹?\s*\d[\d,]*(\.\d+)?$/.test(v.trim()) ? Number(v.replace(/[₹,\s]/g, "")) : v);
  value = num(value);
  if (!Array.isArray(inputs) || typeof value !== "number" || !Number.isFinite(value)) return null;
  const xs = inputs.map(num) as number[];
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
/** cue-one@1: a step that does one thing to one number already on the screen names that number ("halve 44"). */
function cueOne(op: string, inputs: unknown, value: unknown, given: Set<number>): string | null {
  if (!Array.isArray(inputs) || inputs.length !== 1 || typeof inputs[0] !== "number" || typeof value !== "number") return null;
  const a = inputs[0];
  if (!given.has(a) || a < 0 || a === value || !Number.isFinite(a)) return null;
  const n = String(Math.round(a * 1000) / 1000);
  if (op === "half" && Math.abs(a / 2 - value) < 1e-9) return `halve ${n}`;
  if (op === "double" && Math.abs(a * 2 - value) < 1e-9) return `double ${n}`;
  if (op === "square" && Math.abs(a * a - value) < 1e-9) return `square ${n}`;
  return null;
}
/**
 * cue-label@1: where a step as it is shown opens with what it finds ("Semi-perimeter s: half of 44 = 22"), the cue says
 * that ("find the semi-perimeter s"). The label is the step's own words, and is used only when it is a name: a few
 * words starting with a letter, with no result in it (no "=", not the step's value, not the answer).
 */
function cueLabel(shown: string, value: unknown, answer: string, given: Set<number>): string | null {
  const m = /^([A-Za-zΔ∠√][^:=]{2,44}): \S/.exec(shown);
  if (!m) return null;
  const label = m[1].trim(), words = label.split(/\s+/);
  if (words.length > 7) return null;
  const said = (x: unknown) => String(x).replace(/,/g, "").replace(/^-/, "−");
  const nums = label.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/−?\d+(?:\.\d+)?/g) ?? [];
  // a number in the label must already be on the screen, and must not be this step's result or the answer
  if (nums.includes(said(value)) || nums.includes(said(answer)) || !nums.every((x) => given.has(Math.abs(Number(x.replace("−", "-")))))) return null;
  const lower = /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
  // the label is already an instruction ("Take one prime from each pair")
  if (/^(row-reduce|take|test|compare|add|subtract|multiply|divide|count|use|write|find|read|look|split|put|check|list|work|round|replace|solve|try|pick|choose|match|sort|group|share|move|cancel|simplify|expand|factorise|substitute|convert|change|join|draw|measure|estimate|rearrange|collect|apply|start|keep|make|halve|double|square|turn|line|bring|drop|remove|rewrite|plot|mark|shade|swap|flip|order|arrange|complete|fill|set|let|equate|differentiate|integrate|evaluate|express|note|recall|think|see|notice|name|say|show|identify|spot|locate|extend|continue|step|scale|raise|lower|carry|borrow|exchange|regroup|combine|separate|break|build|form|cut|fold|tile|cover|pack|fit|stack|pair|tally|total|sum|average|rank|rate)\b/.test(lower)) return lower;
  // not a name: a phrase that opens with a preposition, or a sentence with a verb in it
  if (/^(the|from|by|in|on|at|with|for|to|as|after|before|so|then|now|since|because|if|when|there|here|this|that|these|those|it|we|you|across|up|down|along|left|right|each|every|both|all|one|two|three|no|not|yes|same|next|first|last)\b/.test(lower)) return null;
  if (words.length > 5) return null;
  if (/\b(is|are|was|were|has|have|says?|gives?|means?|shows?|decides?|adds?|makes?|leaves?|goes|fits?|equals?|becomes?|stays?|needs?|takes?|comes?|tells?|must|can|will|does|do|did)\b/.test(lower)) return null;
  return `find ${/^(the|a|an|each|every|both|all|its|their|how|what|which)\b/.test(lower) ? "" : "the "}${lower}`;
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
  const numbersIn = (t: string) => (t.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return p.steps.flatMap((s, i) => {
    // cue-shown@1: a number already on the screen, in the question or in an earlier step as it was shown, is known to
    // the learner; only a number that first appears in this step is the step's own choice
    const given = new Set<number>([...inQuestion, ...p.steps.slice(0, i).flatMap((t) => { const v = (t as { value?: unknown }).value; return [...(typeof v === "number" ? [v] : []), ...numbersIn(explainStep(p, t))]; })]);
    const shownHere = explainStep(p, s), inputs = (s as { inputs?: unknown }).inputs, value = (s as { value?: unknown }).value;
    const own: StepHelp = {
      next: `${i === 0 ? "First" : i === p.steps.length - 1 ? "Last" : "Next"}: ${cueWith(s.op, inputs, value, shownHere, given) ?? cueOne(s.op, inputs, value, given) ?? cueLabel(shownHere, value, p.answer, given) ?? NEXT[s.op] ?? s.op}.`,
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
    const led = sums.flatMap((m) => deepen(m[0]).map((f, k) => (k === 0 && !/^To work out /.test(f.next) ? { ...f, next: `To work out ${m[1]} ${m[2]} ${m[3]}: ${f.next.charAt(0).toLowerCase()}${f.next.slice(1)}` } : f)));
    const calc = !/∫|d\s*\/\s*d[a-z]/.test(own.shown) && led.length === finer.length;
    const lines: StepHelp[] = (calc ? led : finer).map((f) => ({ next: f.next, shown: f.shown, needs: null, finer: true, ...(own.rule ? { rule: own.rule } : {}), ...(f.board ? { board: f.board } : {}) }));
    if (calc) {
      // how@1: arithmetic inside a step is not walked through line by line: it is one tap away on the step itself
      const boards = lines.map((l) => l.board).filter(Boolean) as string[][];
      const op = sums.find((m) => deepen(m[0]).length)?.[2];
      const skill = op === "÷" ? "MATH.number.long-division" : null;
      return [{ ...own, how: { lines: lines.filter((l) => !/set it out as a long division/.test(l.next)).map((l) => l.shown), ...(boards.length ? { board: boards[boards.length - 1] } : {}), ...(skill && skill !== p.competency && cardFor(skill) ? { skill } : {}) } }];
    }
    // an integral or a derivative is set up by the step and then worked; a calculation is worked and then stated
    return /∫|d\s*\/\s*d[a-z]/.test(own.shown) ? [own, ...lines] : [...lines, own];
  });
}

/**
 * help-review@1: the questions that stand for a type's step help on the owner's dashboard: the first, the middle and the
 * last of its pool, the same every time, so what is approved is what was looked at.
 */
export function helpSamples(family: string): string[] {
  let ids: string[];
  try { ids = pool(family).items.map((x) => x.id).filter((id) => !/:(mc|w)$/.test(id)); } catch { return []; }
  if (!ids.length) return [];
  return [...new Set([ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]])].filter((id) => !!stepsHelp(id));
}
/** A type's step help as the learner is shown it, for those questions: every way, every step. */
export function helpShown(family: string): { id: string; ways: { name: string; steps: StepHelp[] }[] }[] {
  return helpSamples(family).map((id) => ({ id, ways: helpMethods(id).map((name, k) => ({ name, steps: stepsHelp(id, k) ?? [] })) }));
}
