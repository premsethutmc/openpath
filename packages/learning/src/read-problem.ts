/**
 * read-problem@1: a problem a learner types ("Stuck on a problem?") → the OpenPath problem it is, or a plain "not yet".
 *
 * OpenPath's problem kinds (families) can each MAKE a problem from numbers and solve it, but only 43 of them could READ one
 * back from text (their hand-written `parse`). This reader works for every family with a small enough set of problems,
 * without a parser per family: it finds the problems whose printed form matches what was typed.
 *
 *   1. The typed text and every printed problem are reduced to the same canonical form (symbols unified: × * x, ÷ /, − -,
 *      ^2 ², "= ?" dropped, instruction words such as "what is" dropped), and then to a "skeleton": the mathematical
 *      expression alone, so `2x+1=3` matches "Solve 2x + 1 = 3. What is x?".
 *   2. An index made when the content is built (problem-templates.v1.json: the expression with its numbers blanked →
 *      families) names the families that print problems of that shape.
 *   3. For each named family, its problems are searched for one whose printed form is exactly what was typed. Only an exact
 *      match is accepted, and the problem is then shown in OpenPath's own words, so the learner sees how it was read.
 *
 * Never a guess about the numbers. When the bare expression fits several kinds of question (solve it / how many solutions),
 * the kind whose printed problem is mostly the expression itself is preferred, then the earlier family; the learner sees
 * the question that was chosen. Free-form word problems are not read: that needs language understanding this does not have.
 */
import { FAMILIES, parseProblem, problemOf, type Parsed } from "./families.ts";
import TEMPLATES from "../../../content/learning/problem-templates.v1.json" with { type: "json" };

/** A family is searched only if it has at most this many problems (parameter combinations). */
export const SEARCH_LIMIT = 60000;
const NUM = /\d+(?:\.\d+)?/g;
const LEAD = /^(?:please\s+)?(?:what is|what's|calculate|work out|find the value of|find|evaluate|compute|solve for [a-z]|solve)\s*:?\s*/;

/** The same text for the same problem however it was typed. */
export function canon(text: string): string {
  let s = text.toLowerCase().replace(/−|–|—/g, "-").replace(/[×✕✖·*]/g, "×").replace(/÷/g, "/").replace(/\^2|\*\*2/g, "²").replace(/\^3|\*\*3/g, "³");
  // "3 x 4" (a letter x between numbers) is a multiplication sign; "3x" stays a term
  s = s.replace(/(\d)\s+x\s+(?=\d)/g, "$1 × ").replace(/[□▢⬜_]{1,}|\?{1,}(?=\s*[)/]|\s*$)/g, "?");
  // the words for the four operations, and "of" between numbers (15% of 200, 2/3 of 18), are operators
  s = s.replace(/\b(?:multiplied by|times)\b/g, "×").replace(/\bdivided by\b/g, "/").replace(/\bplus\b/g, "+").replace(/\bminus\b/g, "-").replace(/(\d|%)\s*of\s*(?=\d)/g, "$1∘");
  s = s.replace(/\s+/g, " ").trim().replace(LEAD, "");
  // a trailing "= ?", "?", or full stop asks nothing more than the expression does
  s = s.replace(/\s*=\s*\?\s*$/, "").replace(/[.?!\s]+$/, "");
  return s.replace(/\s*([+\-×/=(),:<>∘])\s*/g, "$1").trim();
}
/** The mathematical expression alone: the longest run of symbols, numbers and single letters with a number and an operator in it. */
export function skeleton(text: string): string | null {
  const c = canon(text);
  const runs = c.match(/(?:(?:\d+(?:\.\d+)?|[a-z](?![a-z])|[+\-×/=()²³√%?.,^|<>≤≥∘]|\s)(?<![a-z]{2}))+/g) ?? [];
  const best = runs.map((r) => r.replace(/[.,\s]+$/, "").replace(/^[.,\s]+/, "").replace(/\s+/g, "").replace(/\([a-z]?$/, "").replace(/\(+$/, "").replace(/=\?$/, "")).filter((r) => /\d/.test(r) && /[+\-×/=²³√%^<>≤≥∘]/.test(r)).sort((a, b) => b.length - a.length)[0];
  return best ?? null;
}
const blank = (s: string) => s.replace(NUM, "#");

/** Shapes are stored under a short hash of the shape (the search below accepts only an exact match, so a clash costs time, never a wrong reading). */
export const shapeKey = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
};
type Index = { families: string[]; bare: Record<string, number[]>; loose: Record<string, number[]> };
const INDEX = TEMPLATES as unknown as Index;

function* domainOf(domain: [number, number][]): Generator<number[]> {
  const p = domain.map(([lo]) => lo);
  for (;;) {
    yield [...p];
    let k = p.length - 1;
    while (k >= 0 && p[k] === domain[k][1]) p[k] = domain[k--][0];
    if (k < 0) return;
    p[k]++;
  }
}
export const domainSize = (domain: [number, number][] | undefined) => (domain ?? []).reduce((t, [lo, hi]) => t * (hi - lo + 1), domain?.length ? 1 : 0);

const sameSet = (a: string[], b: string[]) => { const [x, y] = [new Set(a), new Set(b)]; return x.size === y.size && [...x].every((v) => y.has(v)); };
/** For a family too large to search whole: each parameter is tried only at values the typed numbers could give (a typed
 *  number itself, or the sum, difference, product or whole quotient of two of them, and 0 and 1 for a switch). */
function* guided(domain: [number, number][], typed: number[]): Generator<number[]> {
  const pool = new Set<number>([0, 1, ...typed]);
  for (const a of typed) for (const b of typed) { pool.add(a + b); pool.add(a - b); pool.add(a * b); if (b && Number.isInteger(a / b)) pool.add(a / b); }
  // decimals are often held as whole numbers of tenths, hundredths or thousandths
  for (const a of typed) for (const k of [10, 100, 1000]) if (Number.isInteger(Math.round(a * k * 1e6) / 1e6)) pool.add(Math.round(a * k));
  const options = domain.map(([lo, hi]) => { const fit = [...pool].filter((v) => Number.isInteger(v) && v >= lo && v <= hi); return hi - lo < 12 ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : fit; });
  if (options.some((o) => !o.length) || options.reduce((t, o) => t * o.length, 1) > GUIDED_LIMIT) return;
  const at = options.map(() => 0);
  for (;;) {
    yield at.map((i, k) => options[k][i]);
    let k = at.length - 1;
    while (k >= 0 && at[k] === options[k].length - 1) at[k--] = 0;
    if (k < 0) return;
    at[k]++;
  }
}
export const GUIDED_LIMIT = 250000;

/** The family's problem whose printed form (by `form`) is exactly `want`, or null. */
function search(family: string, want: string, form: (prompt: string) => string | null, all: string[]): string | null {
  const def = FAMILIES.get(family);
  if (!def?.domain) return null;
  const typed = [...new Set([...(want.match(NUM) ?? []), ...all])].map(Number);
  for (const p of domainSize(def.domain) > SEARCH_LIMIT ? guided(def.domain, typed) : domainOf(def.domain)) {
    if (def.reject(p)) continue;
    let prompt: string;
    try { prompt = def.prompt(p); } catch { continue; }
    const f = form(prompt);
    // exactly the typed expression, asking nothing more, and printing exactly the numbers that were typed
    if (f === null || f !== want || !pure(prompt) || !sameSet(canon(prompt).match(NUM) ?? [], all)) continue;
    const id = `gen:${family}:${p.join(",")}`;
    if (problemOf(id)) return id;
  }
  return null;
}

/** Words that only say "work this out": a printed problem made of its expression and these asks nothing the expression does
 *  not. Any other word (estimate, simplify, expand, lowest terms, as a decimal, remainder, the picture shows …) changes the question, so such a problem is
 *  never matched from a bare expression. */
export const NEUTRAL = new Set("solve what is the value of find work out give both solutions separated by a comma calculate answer for and or an your to fine fraction are which goes box evaluate it equals equal sin cos tan log ln lim dx gcd lcm hcf sqrt".split(" "));
/** The printed problem is its expression and nothing else: with the neutral words and the punctuation taken away, what is
 *  left is exactly the skeleton. (A problem that also carries a power the skeleton cannot hold, a second expression, or a
 *  condition, is not pure and is never matched from a bare expression.) */
export function pure(prompt: string): boolean {
  const sk = skeleton(prompt);
  if (!sk) return false;
  const strip = (x: string) => x.replace(/[\s.,:;?!()]/g, "");
  // the article "a" before a word is not a variable ("a fraction is fine")
  const rest = canon(prompt).replace(/\ba (?=[a-z]{2,})/g, " ").replace(/[a-z]{2,}/g, (w) => (NEUTRAL.has(w) ? " " : w));
  const [a, b] = [strip(rest).replace(/=$/, ""), strip(sk).replace(/=$/, "")];
  if (a === b) return true;
  // "Solve 2x + 1 = 7. What is x?" and "Find x: x + 3 = 9": the unknown named once more, before or after
  const extra = a.endsWith(b) ? a.slice(0, a.length - b.length) : a.startsWith(b) ? a.slice(b.length) : null;
  return extra !== null && /^[a-z]$/.test(extra) && b.includes(extra);
}

/** A typed problem → a supported problem (shown back in OpenPath's own words), or the reason it is not read. */
export function readProblem(text: string): Parsed {
  if (!text.trim() || text.length > 200) return parseProblem(text);
  const bare = skeleton(text);
  let first = parseProblem(text);
  // a family's own parser is believed only if the problem it returns prints the numbers that were typed (a parser that
  // drops a digit would otherwise answer a different problem)
  const sameNumbers = (prompt: string) => sameSet(canon(prompt).match(NUM) ?? [], canon(text).match(NUM) ?? []);
  if (first.supported && sameNumbers(first.problem.prompt)) return first;
  if (first.supported) first = { supported: false, reason: "" };
  // the typed text too must be its expression and nothing else: "simplify 24/30" is not the division 24 ÷ 30
  if (bare && pure(text)) {
    const key = shapeKey(blank(bare));
    // the kinds whose printed problem is mostly the expression first, then the others
    for (const tier of [INDEX.bare, INDEX.loose])
      for (const k of tier[key] ?? []) {
        const id = search(INDEX.families[k], bare, skeleton, canon(text).match(NUM) ?? []);
        if (id) return { supported: true, problem: problemOf(id)! };
      }
  }
  return "family" in first && first.reason ? first : { supported: false, reason: "OpenPath could not match this to a kind of problem it can work through. Type just the calculation or equation (for example 36 ÷ 4, or 2x + 1 = 7); word problems are not read yet." };
}
