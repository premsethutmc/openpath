/**
 * Teaching packages, batch 1 (teaching-package@0, REVIEW CANDIDATES — not approved, not registered, not served).
 *
 * Authored text lives here; every number a learner would see is computed from a real generator instance, and every instance and
 * claim is checked by the builder (build.mts) against: the trusted server grader (server-grader.ts gradeRequest), the family's own
 * independent checker (via the grader), and an independent ORACLE in this file that reads the question's PROMPT TEXT (never the
 * generator's parameters or solve()). Nothing here is imported by runtime code.
 */
import type { Problem } from "../../../packages/learning/src/family-kit.ts";

export type Q = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
export const q = (n: bigint | number, d: bigint | number = 1n): Q => { let N = BigInt(n), D = BigInt(d); if (D < 0n) { N = -N; D = -D; } const g = gcd(N, D) || 1n; return { n: N / g, d: D / g }; };
export const qs = (x: Q) => (x.d === 1n ? `${x.n}` : `${x.n}/${x.d}`);
export const qeq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
/** an exact decimal string → Q */
export const dec = (s: string): Q => { const [w, f = ""] = s.split("."); return q(BigInt(w + f), 10n ** BigInt(f.length)); };
const N = (s: string) => Number(s);
const nums = (t: string) => [...t.replace(/−/g, "-").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => m[0]);

export interface Oracle { value: Q | string; lines: string[] }
/** fig: the figure data the question shows (table, bars, grid), as the renderer receives it; never a drawn picture */
export interface Method { name: string; valid: true; run: (prompt: string, fig?: any) => Oracle }
export interface Package {
  id: string; title: string; family: string; competency: string; strand: string;
  skill: string;
  /** the instances this package teaches (a sub-case of the family); the builder draws every item from these only */
  applies: (p: Problem) => boolean;
  /** cases the diagnostic must cover, in order (one item each), so that different difficulties give different answer patterns */
  /** optional: rejects instances that would make a poor worked example (e.g. coincident values) */
  exampleOk?: (p: Problem) => boolean;
  /** extra reuse keys: two items sharing a key (e.g. the same pair of numbers in another mode) are never both used */
  signature?: (p: Problem) => string[];
  /** per-bug condition on an example for that bug's screen */
  bugExampleOk?: Record<string, (p: Problem) => boolean>;
  /** replaces a family's wrong-answer text where it is mathematically wrong for some instances (recorded as a content defect) */
  says?: Record<string, (prompt: string) => string>;
  /** how the diagnostic answers must be read (beyond the generic two-answer rule) */
  diagnosticRule?: string;
  /** how a modelled wrong answer is written by a learner (e.g. 8/18 rather than its value 4/9); graded as well */
  display?: Record<string, (p: Problem) => string>;
  /** false when the family's own step text is defective and must not be quoted */
  quoteFamilySteps?: false;
  /** bugs whose wrong answer is BY NATURE a number printed in the question (choosing the other option, repeating the given angle); exempt from the copied-number filter */
  inherentInPrompt?: string[];
  diagnosticCases: { label: string; pick: (p: Problem) => boolean; why: string; contrast?: true }[];
  targets: { bug: string; status: "modelled" ; note: string }[];
  prerequisites: { knowledge: string[]; graphNote?: string };
  concept: string[];
  visual: (p: Problem) => Record<string, unknown> | Record<string, unknown>[] | null;
  visualNote: string;
  /** the independent oracle: reads the prompt text only, returns the answer and a valid line-by-line solution */
  oracle: (prompt: string, fig?: any) => Oracle;
  /** batch and (for pattern packages) the shared instructional pattern */
  batch?: "batch-1" | "batch-2"; pattern?: string;
  /** the generator restriction in words (the same restriction as applies(), for integration) */
  restriction: string;
  /** what each combination of answers on the diagnostic items supports and leaves uncertain. answers[i] for diagnostic item i:
   *  "correct", "bug:<id>" (that item's modelled wrong answer) or "other" */
  responsePatterns?: { answers: string[]; supports: string; uncertain: string; establishes: boolean }[];
  /** other valid methods (each verified to reach the same answer); a final answer alone earns no method credit for any of them */
  alternatives: Method[];
  alternativeExplanation: { title: string; text: string[]; visual?: (p: Problem) => Record<string, unknown> | null; /** "oracle": show the worked lines (when they follow this route) */ math?: "oracle" };
  hints: (prompt: string) => [string, string, string];
  fixes: Record<string, { title?: string; fix: string; counter: (prompt: string, fig?: any) => string }>;
  /** no two items of the package may share an answer (where the answer range is wide enough) */
  answerDistinct?: true;
  /** unit shown after numbers in "Not W, but A" (e.g. "°") */
  unit?: string;
  /** extra condition on a fix trigger beyond the evidence policy (per bug) */
  triggerCondition?: Record<string, string>;
  /** existing explanations of the served module this package relies on (reused, not rewritten) */
  reuses?: { strategy: string; covers: string }[];
  workingChecker: string;
  /** authored transfer candidates where the generator has no word form (TEXT ONLY: not grader-verifiable until a generator form exists) */
  authoredTransfer?: { text: string; check: () => { expected: string; computed: string } }[];
  sources: string[];
  uncertainties: string[];
}

// ---------------------------------------------------------------------------------------------------------- oracles (prompt text only)
const fracPair = (t: string) => { const m = t.match(/(\d+)\/(\d+)[^/]*? or (\d+)\/(\d+)/)!; return [q(N(m[1]), N(m[2])), q(N(m[3]), N(m[4]))] as const; };
const cmpQ = (a: Q, b: Q) => (a.n * b.d > b.n * a.d ? 1 : a.n * b.d < b.n * a.d ? -1 : 0);

export const PACKAGES: Package[] = [
  {
    id: "TP-NUM-01", title: "Comparing fractions with the same top number", family: "adfcmp", competency: "MATH.number.fraction-comparison", strand: "number",
    inherentInPrompt: ["bigger-bottom-bigger"],
    signature: (p) => { const m = p.prompt.match(/(\d+)\/(\d+)[^/]*? or (\d+)\/(\d+)/)!; return [`pair:${[m[1] + "/" + m[2], m[3] + "/" + m[4]].sort().join("|")}`, m[1] === m[3] ? `dens:${[m[2], m[4]].sort().join("|")}` : `nums:${m[2]}:${[m[1], m[3]].sort().join("|")}`]; },
    diagnosticRule: "Read the four items together (response patterns below). Two same-top matches establish bigger-bottom-bigger ONLY when both same-bottom contrast items are right; if the contrast items are wrong too, a reversal explains all the answers and nothing is established. misconception-evidence@1 today would establish it from the two same-top matches alone; the contrast condition is a policy request for Codex (05).",
    skill: "Compare two fractions with the same numerator: more equal parts in the whole means each part is smaller.",
    applies: (p) => p.params[0] === 1,
    diagnosticCases: [
      { label: "same top, asks greater", pick: (p) => p.params[0] === 1 && p.params[4] === 0, why: "bigger-bottom-bigger answers the larger denominator" },
      { label: "same top, asks smaller", pick: (p) => p.params[0] === 1 && p.params[4] === 1, why: "the belief gives the opposite wrong answer here; a greater/smaller mix-up gives the SAME answers on these two items, which only the same-bottom item separates" },
      { label: "same bottom, asks greater (contrast)", pick: (p) => p.params[0] === 0 && p.params[4] === 0, contrast: true, why: "the bigger-bottom belief is right here; a greater/smaller mix-up (or answering in reverse) is wrong here too" },
      { label: "same bottom, asks smaller (contrast)", pick: (p) => p.params[0] === 0 && p.params[4] === 1, contrast: true, why: "a second contrast, so one slip on a contrast item is not read as a reversal" },
    ],
    targets: [{ bug: "bigger-bottom-bigger", status: "modelled", note: "whole-number thinking: a bigger denominator is read as a bigger fraction" }],
    restriction: "adfcmp with params[0] = 1 (same numerator); both asks (params[4] = 0 greater, 1 smaller). Contrast items: params[0] = 0 (same denominator).",
    responsePatterns: [
      { answers: ["bug:bigger-bottom-bigger", "bug:bigger-bottom-bigger", "correct", "correct"], supports: "bigger-bottom-bigger: the larger denominator is read as the larger fraction, while same-denominator fractions are compared correctly", uncertain: "nothing that competes with the diagnosis; teach fix_bigger_bottom_bigger", establishes: true },
      { answers: ["bug:bigger-bottom-bigger", "bug:bigger-bottom-bigger", "bug:more-parts-wrong-way", "bug:more-parts-wrong-way"], supports: "a consistent reversal (answers the opposite of 'greater'/'smaller', or reads the words the other way)", uncertain: "it is NOT evidence of bigger-bottom-bigger: the same two same-top answers come from the reversal; re-ask with the words emphasised", establishes: false },
      { answers: ["bug:bigger-bottom-bigger", "bug:bigger-bottom-bigger", "bug:more-parts-wrong-way", "correct"], supports: "mixed: one contrast item wrong", uncertain: "a reversal and the misconception both remain possible; ask another same-bottom item before deciding", establishes: false },
      { answers: ["bug:bigger-bottom-bigger", "correct", "correct", "correct"], supports: "one matching answer: a suspected error only", uncertain: "a slip or the misconception; general teaching only, re-probe later", establishes: false },
      { answers: ["correct", "correct", "correct", "correct"], supports: "compares same-top and same-bottom fractions correctly", uncertain: "answer evidence only: the reasoning (part size or a memorised rule) is not seen", establishes: false },
    ],
    prerequisites: { knowledge: ["a fraction a/b means a of b equal parts of one whole", "the parts must be equal and of the same whole"] },
    concept: ["The bottom number says how many equal parts the whole is cut into. Cutting the same whole into more parts makes each part smaller.", "So with the same top number (the same number of parts), the fraction with the smaller bottom number is greater."],
    visual: (p) => { const [a, b] = fracPair(p.prompt); return [a, b].map((f) => ({ type: "grid", rows: 1, cols: Number(f.d), shaded: Number(f.n), note: `${qs(f)}: the same whole cut into ${f.d} equal parts` })); },
    visualNote: "Reuses the family's own grid strip (adfcmp draw_both: {type:'grid', rows:1, cols:b, shaded:a}) once per fraction; the two strips must be drawn the SAME length. The existing Visual union has no two-strip comparison; draw two grid strips.",
    // the decision is computed by cross-multiplication (exact), but the learner-facing lines reason by part size or part count
    oracle: (t) => { const [a, b] = fracPair(t); const greater = /greater/.test(t); const pick = cmpQ(a, b) > 0 === greater ? a : b; const big = cmpQ(a, b) > 0 ? a : b; const lines = a.n === b.n ? [`Both fractions have ${a.n} ${a.n === 1n ? "part" : "parts"}. In ${qs(a)} the whole is cut into ${a.d} equal parts; in ${qs(b)} into ${b.d}.`, `Cutting the same whole into fewer parts makes each part bigger, so ${qs(big)} is greater.`, `The ${greater ? "greater" : "smaller"} fraction is ${qs(pick)}.`] : [`Both are cut into ${a.d} equal parts of the same size: ${a.n} parts against ${b.n} parts.`, `More parts of the same size is more, so ${qs(big)} is greater.`, `The ${greater ? "greater" : "smaller"} fraction is ${qs(pick)}.`]; return { value: pick, lines }; },
    alternatives: [
      { name: "Compare part size (same top) or part count (same bottom)", valid: true, run: (t) => { const [a, b] = fracPair(t); const greater = /greater/.test(t); if (a.d === b.d) { const big = a.n > b.n ? a : b; const pick = greater ? big : big === a ? b : a; return { value: pick, lines: [`Same size of part (${a.d}ths): ${a.n} parts against ${b.n} parts, so ${qs(big)} is greater; the ${greater ? "greater" : "smaller"} is ${qs(pick)}.`] }; } const big = a.d < b.d ? a : b; const pick = greater ? big : big === a ? b : a; return { value: pick, lines: [`Both have ${a.n} ${a.n === 1n ? "part" : "parts"}. A whole cut into ${a.d < b.d ? a.d : b.d} parts has bigger parts than one cut into ${a.d < b.d ? b.d : a.d}.`, `So ${qs(big)} is greater; the ${greater ? "greater" : "smaller"} is ${qs(pick)}.`] }; } },
      { name: "Common denominator (later grades; computing check)", valid: true, run: (t) => { const [a, b] = fracPair(t); const D = a.d * b.d; const A = a.n * b.d, B = b.n * a.d; const greater = /greater/.test(t); const pick = (A > B) === greater ? a : b; return { value: pick, lines: [`${qs(a)} = ${A}/${D} and ${qs(b)} = ${B}/${D}`, `${A > B ? A : B}/${D} is more, so the ${greater ? "greater" : "smaller"} fraction is ${qs(pick)}`] }; } },
    ],
    alternativeExplanation: { title: "Sharing a roti", text: ["Share one roti among a few children, and an identical roti among more children.", "In the bigger group each child gets less: more sharers, smaller shares."] },
    hints: (t) => { const [a, b] = fracPair(t); return [`Is the top number or the bottom number the same?`, `Both have ${a.n} ${a.n === 1n ? "part" : "parts"}. Which whole is cut into bigger parts: ${a.d} parts or ${b.d} parts?`, `A whole cut into ${a.d < b.d ? a.d : b.d} parts has the bigger parts, so ${qs(a.d < b.d ? a : b)} is greater.`]; },
    fixes: { "bigger-bottom-bigger": { title: "A bigger bottom number means smaller parts", fix: "A bigger bottom number means MORE pieces from the same whole, so each piece is SMALLER.", counter: (t) => { const [a, b] = fracPair(t); const [lo, hi] = a.d < b.d ? [a, b] : [b, a]; return `Check with two strips of the SAME length: cut one into ${lo.d} equal parts and the other into ${hi.d}. One part of the ${hi.d}-part strip is shorter than one part of the ${lo.d}-part strip, so ${qs(hi)} is less than ${qs(lo)}.`; } } },
    workingChecker: "none: comparison answers have no working contract (answer-level evidence only)",
    sources: ["packages/learning/src/fam/b04.ts:427 adfcmp: teach.idea/method, alternatives draw_both, sharing; bug bigger-bottom-bigger", "content/learning/modules.v1.json MATH.number.fraction-comparison (authored module; one strategy same_size_pieces; no misconception-specific explanation)"],
    uncertainties: ["The family's mc flag is false, so no multiple-choice delayed check exists; delayed checks are typed.", "The two-strip picture needs a renderer decision (two grid strips of equal width)."],
  },
  {
    id: "TP-NUM-02", title: "Adding like fractions: the bottom number names the piece size", family: "fadd", competency: "MATH.number.fraction-add-like", strand: "number",
    answerDistinct: true,
    // examples keep the denominator visible (the sum does not simplify) and avoid 1 as a top number (1 × b = b hides multiply-tops)
    exampleOk: (p) => { const [a, b, n] = p.params; const g = (x: number, y: number): number => (y ? g(y, x % y) : x); return g(a + b, n) === 1 && a !== b && a > 1 && b > 1; },
    triggerCondition: { "add-denominators": "both matching responses are WRITTEN unsimplified as (a + b)/(2n) (e.g. 8/18), read from the raw response text; a simplified equal value (4/9) also fits 'averaging the two fractions' and must not count. Even the unsimplified form can come from halving 8/9 as 8/18, so the fix teaches piece size and the recheck must use a new item" },
    display: { "add-denominators": (p) => `${p.params[0] + p.params[1]}/${2 * p.params[2]}`, "multiply-tops": (p) => `${p.params[0] * p.params[1]}/${p.params[2]}` },
    signature: (p) => [`fadd:${[p.params[0], p.params[1]].sort((x, y) => x - y).join(",")}/${p.params[2]}`],
    bugExampleOk: { "multiply-tops": (p) => { const [a, b, n] = p.params; const g = (x: number, y: number): number => (y ? g(y, x % y) : x); return a > 1 && b > 1 && g(a * b, n) === 1; } },
    skill: "Add two fractions with the same denominator: add the numerators, keep the denominator.",
    applies: (p) => p.params[3] === 1,
    diagnosticCases: [
      { label: "sum below one", pick: (p) => p.params[3] === 1 && p.params[0] + p.params[1] < p.params[2], why: "add-denominators gives (a+b)/2n, multiply-tops gives ab/n: distinct values" },
    ],
    restriction: "fadd with params[3] = 1 (addition); examples: gcd(a + b, n) = 1, a ≠ b, a > 1, b > 1",
    diagnosticRule: "The value (a + b)/(2n) is also what 'averaging the two fractions' gives, for EVERY like-fraction sum, so no item can separate add-denominators from averaging by value. Only the written form separates them: '(a+b)/(2n)' written unsimplified (e.g. 8/18) supports add-denominators; a simplified equal value (4/9) leaves both open. The grader compares values, so the raw response text must be read for this (integration note, 05). One diagnostic case only (no improper-sum item in the diagnostic partition).",
    targets: [{ bug: "add-denominators", status: "modelled", note: "fractions treated as two whole numbers (add top, add bottom)" }, { bug: "multiply-tops", status: "modelled", note: "wrong operation on the numerators" }],
    prerequisites: { knowledge: ["a/n is a pieces of size 1/n", "equal pieces of the same whole can be counted together"], graphNote: "graph: fraction-models (support), equivalent-fractions (disputed). No mandatory prerequisite is recorded; 'fraction as a count of unit pieces' is the real prerequisite." },
    concept: ["A fraction with bottom number n counts pieces, each 1/n of the whole. Two fractions with the same bottom number count pieces of the same size.", "Adding counts the pieces together; the size of a piece does not change, so the bottom number stays the same."],
    visual: (p) => ({ type: "grid", rows: 1, cols: p.params[2], shaded: Math.min(p.params[0] + p.params[1], p.params[2]), note: "one strip of n equal parts; shade a parts, then b more" }),
    visualNote: "Reuses the grid strip used by fraction families ({type:'grid', rows:1, cols:n, shaded:k}). For a sum above one whole, draw a second strip.",
    oracle: (t) => { const m = t.match(/(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/)!; const s = m[3] === "+" ? 1n : -1n; const v = q(BigInt(m[1]) + s * BigInt(m[4]), BigInt(m[2])); return { value: v, lines: [`Every piece has size 1/${m[2]}: ${m[1]} ${pc(m[1])} ${m[3] === "+" ? "and" : "take away"} ${m[4]} ${pc(m[4])} = ${Number(m[1]) + Number(s) * Number(m[4])} ${pc(String(Number(m[1]) + Number(s) * Number(m[4])))} of size 1/${m[2]}`, `${Number(m[1]) + Number(s) * Number(m[4])}/${m[2]}${qs(v) === `${Number(m[1]) + Number(s) * Number(m[4])}/${m[2]}` ? "" : ` = ${qs(v)}`}`] }; },
    alternatives: [
      { name: "Number line in steps of 1/n", valid: true, run: (t) => { const m = t.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/)!; const v = q(N(m[1]) + N(m[3]), N(m[2])); return { value: v, lines: [`Start at ${m[1]}/${m[2]} and jump ${m[3]} steps of 1/${m[2]}`, `You land on ${N(m[1]) + N(m[3])}/${m[2]}${qs(v) === `${N(m[1]) + N(m[3])}/${m[2]}` ? "" : ` = ${qs(v)}`}`] }; } },
    ],
    alternativeExplanation: { title: "Units that do not change", text: ["Apples added to apples are still apples.", "In the same way, pieces of one size added to pieces of the same size are still pieces of that size: the bottom number names the size, like the word 'apples'."] },
    hints: (t) => { const m = t.match(/(\d+)\/(\d+)/)!; return [`What size is each piece in these fractions?`, `Every piece is 1/${m[2]}. Count all the pieces together.`, `Add the top numbers; the pieces are still ${m[2]}ths.`]; },
    fixes: {
      "add-denominators": { title: "The bottom number stays the same", fix: "The bottom number is the SIZE of the pieces. Adding pieces does not make them smaller.", counter: (t) => { const m = t.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/)!; return `Check with one strip cut into ${m[2]} equal parts: shade ${m[1]} parts, then ${m[3]} more. ${N(m[1]) + N(m[3])} parts are shaded and the strip still has ${m[2]} parts: ${N(m[1]) + N(m[3])}/${m[2]}. Nothing cut the strip into ${2 * N(m[2])} parts.`; } },
      "multiply-tops": { title: "Add the pieces, do not multiply", fix: "Adding fractions adds the pieces; multiplication is a different operation.", counter: (t) => { const m = t.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/)!; return `Check: ${m[1]} pieces and ${m[3]} more pieces make ${N(m[1]) + N(m[3])} pieces, not ${N(m[1]) * N(m[3])}.`; } },
    },
    authoredTransfer: [
      { text: "Meena ate 2/8 of a cake in the morning and 3/8 of the same cake in the evening. What fraction of the cake did she eat?", check: () => ({ expected: "5/8", computed: qs(q(2 + 3, 8)) }) },
      { text: "A ribbon is cut into 10 equal pieces. Ravi uses 3 pieces and Anu uses 4 pieces. What fraction of the ribbon did they use together?", check: () => ({ expected: "7/10", computed: qs(q(3 + 4, 10)) }) },
    ],
    workingChecker: "fadd has a family contract statement (a/n ± b/n), so the existing derivation authority (working-assessment@1) can examine typed arithmetic working; the answer alone earns answer credit only",
    sources: ["packages/learning/src/families.ts:116 fadd: teach idea/method only, NO alternatives, NO word form; bugs add-denominators, multiply-tops", "content/learning/modules.v1.json MATH.number.fraction-add-like (authored; one strategy count_pieces)"],
    uncertainties: ["fadd has no word (transfer) form: transfer candidates cannot be drawn from the generator; transfer is MISSING CONTENT (authored candidates below are text only, unverified by the grader).", "The family's diagnostic pool has no sum-above-one item, so the diagnostic cannot test improper results (one case only).", "Some fadd items give the same value for both bugs (e.g. 1/3 + 1/3: both predict 1/3); the builder excludes such items from diagnostics.", "The subtraction bug 'subtract-reversed' predicts a negative value although the family rejects b > a; not targeted here."],
  },
  {
    id: "TP-NUM-03", title: "Comparing decimals: place value, not length", family: "aedecc", competency: "MATH.number.decimal-tenths", strand: "number",
    restriction: "aedecc, all items (one tenths and one hundredths decimal with the same whole part).",
    inherentInPrompt: ["longer-is-larger", "shorter-is-larger"],
    signature: (p) => [`tenths:${p.params[0]}.${p.params[1]}`, `hund:${p.params[0]}.${p.params[2]}${p.params[3]}`],
    says: { "longer-is-larger": (t) => { const [a, b] = nums(t); const L = a.length > b.length ? a : b; return `${L} was taken as greater because it has more digits after the point. Compare the tenths first.`; } },
    skill: "Compare a tenths decimal with a hundredths decimal by place value.",
    applies: () => true,
    diagnosticCases: [
      { label: "tenths decimal is greater", pick: (p) => p.bugs.some((b) => b.id === "longer-is-larger"), why: "longer-is-larger picks the hundredths number" },
      { label: "hundredths decimal is greater", pick: (p) => p.bugs.some((b) => b.id === "shorter-is-larger"), why: "the opposite belief (shorter is larger, from 'tenths are bigger than hundredths') errs here instead" },
    ],
    targets: [{ bug: "longer-is-larger", status: "modelled", note: "digits after the point read as a whole number" }, { bug: "shorter-is-larger", status: "modelled", note: "over-generalised 'tenths beat hundredths'" }],
    prerequisites: { knowledge: ["tenths and hundredths place value", "0.7 = 0.70 (seven tenths = seventy hundredths)"] },
    concept: ["Decimals are compared place by place from the left: wholes, then tenths, then hundredths.", "Writing both with the same number of places (put a zero at the end of the shorter one) makes them easy to compare as hundredths."],
    visual: (p) => { const [a] = nums(p.prompt); return { type: "grid", rows: 10, cols: 10, shaded: Math.round(Number(a) * 100) % 100, note: "hundred grid: one shaded square = 0.01; a full column = 0.1" }; },
    visualNote: "Reuses the hundred grid ({type:'grid', rows:10, cols:10, shaded:k}) of the decimal-tenths module's hundred_grid strategy; shade each number on its own grid.",
    oracle: (t) => { const [a, b] = nums(t); const A = dec(a), B = dec(b); const g = cmpQ(A, B) > 0 ? a : b; return { value: g, lines: [`Write both with two decimal places: ${dec2(a)} and ${dec2(b)}`, `${dec2(a)} is ${hs(hund(a))}; ${dec2(b)} is ${hs(hund(b))}. So ${g} is greater`] }; },
    alternatives: [{ name: "Money (paise)", valid: true, run: (t) => { const [a, b] = nums(t); const g = hund(a) > hund(b) ? a : b; return { value: g, lines: [`₹${dec2(a)} is ${paise(hund(a))}; ₹${dec2(b)} is ${paise(hund(b))}`, `${Math.max(hund(a), hund(b))} paise is more, so ${g} is greater`] }; } }],
    alternativeExplanation: { title: "Number line in tenths", text: ["Mark the tenths on a number line from one whole number to the next.", "Find which tenth each number is in first; only if they are in the same tenth do the hundredths decide."] },
    hints: (t) => { const [a, b] = nums(t); return ["Compare the tenths digits first.", `Write both with two places: ${dec2(a)} and ${dec2(b)}.`, `Compare ${hs(hund(a))} with ${hs(hund(b))}.`]; },
    fixes: {
      "longer-is-larger": { title: "More digits does not mean bigger", fix: "More digits after the point does not mean bigger: compare the tenths first.", counter: (t) => { const [a, b] = nums(t); const [L, S] = a.length > b.length ? [a, b] : [b, a]; return `Check with hundredths: ${S} = ${dec2(S)}, which is ${hs(hund(S))}; ${L} is ${hs(hund(L))}. ${hund(S) > hund(L) ? `${S} is greater although it has fewer digits.` : ""}`; } },
      "shorter-is-larger": { title: "Compare the tenths first", fix: "A tenths number is not always bigger than a hundredths number: compare the tenths digits.", counter: (t) => { const [a, b] = nums(t); const [L, S] = a.length > b.length ? [a, b] : [b, a]; return `Check with hundredths: ${L} is ${hs(hund(L))}; ${S} = ${dec2(S)}, which is only ${hs(hund(S))}.`; } },
    },
    workingChecker: "none: comparison answers have no working contract",
    sources: ["packages/learning/src/fam/b05.ts:1301 aedecc: teach idea/method, alternative money; bugs longer-is-larger, shorter-is-larger", "library.v1.json MATH.number.decimal-tenths (seeded from aedec; aedecc has only a chapter screen; spot_the_mistake addresses one aedec bug)"],
    uncertainties: ["aedecc has no figure; the hundred grid is a proposal reusing an existing visual.", "CONTENT DEFECT (existing family text, fam/b05.ts aedecc bugs, longer-is-larger 'says'): it claims the hundredths digits 'uv' are more than the tenths digit t; this is false whenever uv ≤ t (e.g. '03 is more than 5'). The package replaces that sentence for its own screens; the family text itself is not changed here.", "The competency is 'Represent tenths'; comparison sits inside it (the family is one of its five)."],
  },
  {
    id: "TP-MEA-01", title: "Area or perimeter? Covering versus going round", family: "aeperar", competency: "MATH.measurement.area-squares", strand: "measurement",
    restriction: "aeperar, both forms: params[0] = 0 (covering: area) and 1 (going round: perimeter); items where 2(l + w) = l × w are excluded (they cannot separate the two).",
    signature: (p) => [`dims:${[p.params[1], p.params[2]].sort((x, y) => x - y).join("x")}`],
    bugExampleOk: { "two-sides": (p) => p.params[0] === 1 },
    responsePatterns: [
      { answers: ["bug:perimeter-for-area", "correct", "bug:perimeter-for-area", "correct"], supports: "perimeter-for-area: the boundary is computed when the inside is asked, while perimeter itself is done correctly", uncertain: "whether the area idea (squares inside) is missing or only the word 'cover' is misread; the concept strategy first, then fix_perimeter_for_area", establishes: true },
      { answers: ["correct", "bug:area-for-perimeter", "correct", "bug:area-for-perimeter"], supports: "area-for-perimeter: multiplies whenever two lengths are given", uncertain: "a 'multiply the two numbers' habit and the misconception give the same answers; both are treated by the same fix", establishes: true },
      { answers: ["bug:perimeter-for-area", "bug:area-for-perimeter", "bug:perimeter-for-area", "bug:area-for-perimeter"], supports: "the two words are consistently swapped", uncertain: "a vocabulary swap (which word means which), not missing concepts: both computations are done correctly. Teach the meanings (act_it), not the formulas; do NOT establish either single misconception", establishes: false },
      { answers: ["correct", "bug:two-sides", "correct", "bug:two-sides"], supports: "two-sides on going-round items only: half the boundary (one length and one width) is taken as the whole way round, while covering is right", uncertain: "no competing explanation gives both: 'adding the given numbers' as a general habit would also fail the covering items", establishes: true },
      { answers: ["bug:two-sides", "bug:two-sides", "bug:two-sides", "bug:two-sides"], supports: "adds the two given numbers whatever is asked", uncertain: "two different errors (adding instead of multiplying; half the sides) or no model of the situation at all; general teaching, no misconception established", establishes: false },
      { answers: ["bug:perimeter-for-area", "correct", "correct", "correct"], supports: "one matching answer: suspected only", uncertain: "a slip or the misconception", establishes: false },
    ],
    diagnosticRule: "A 'two-sides' answer (length + width) on the covering item and on the going-round item counts as two different errors (adding instead of multiplying; adding only half the sides), so the pair must not establish one misconception. A learner who multiplies on both items is right on the covering item and is suspected of area-for-perimeter only; one who adds all four sides on both is suspected of perimeter-for-area only.",
    skill: "Decide whether a rectangle problem asks for area (covering) or perimeter (going round), then compute it.",
    applies: () => true,
    diagnosticCases: [
      { label: "covering (area), first context", pick: (p) => p.params[0] === 0, why: "perimeter-for-area gives 2(l+w); two-sides gives l+w" },
      { label: "going round (perimeter), first context", pick: (p) => p.params[0] === 1, why: "area-for-perimeter gives l×w; a learner who always multiplies is right on the covering item only" },
      { label: "covering (area), another context", pick: (p) => p.params[0] === 0, contrast: true, why: "a second covering item, so one answer is not taken as a pattern" },
      { label: "going round (perimeter), another context", pick: (p) => p.params[0] === 1, contrast: true, why: "a second going-round item" },
    ],
    targets: [{ bug: "perimeter-for-area", status: "modelled", note: "conceptual: area and perimeter not distinguished" }, { bug: "area-for-perimeter", status: "modelled", note: "conceptual, the reverse" }, { bug: "two-sides", status: "modelled", note: "procedural: added one length and one width" }],
    prerequisites: { knowledge: ["area of a rectangle as rows × squares in a row", "perimeter as the total length of all sides"] },
    concept: ["Area is the space inside: how many unit squares cover the shape. For a rectangle, rows × squares in each row = length × width.", "Perimeter is the distance round the edge: add all four sides, length + width + length + width."],
    visual: (p) => { const [l, w] = nums(p.prompt); return { type: "grid", rows: Number(w), cols: Number(l), shaded: /cover/.test(p.prompt) ? Number(l) * Number(w) : 0, note: /cover/.test(p.prompt) ? "every square inside is shaded: covering" : "only the outline matters: going round" }; },
    visualNote: "Reuses the grid of squares (aearea / rows_of_squares); perimeter needs the outline emphasised, which the grid visual cannot do (visual gap).",
    oracle: (t) => { const [l, w] = nums(t).map(Number); if (/cover/.test(t)) return { value: q(l * w), lines: [`Covering the inside: area`, `${w} rows of ${l} squares = ${l} × ${w} = ${l * w}`] }; if (/round/.test(t)) return { value: q(2 * (l + w)), lines: [`Going once round the edge: perimeter`, `${l} + ${w} + ${l} + ${w} = ${2 * (l + w)}`] }; throw new Error("oracle: cannot tell area from perimeter"); },
    alternatives: [{ name: "Perimeter as twice (length + width); area row by row", valid: true, run: (t) => { const [l, w] = nums(t).map(Number); return /round/.test(t) ? { value: q(2 * (l + w)), lines: [`perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)}`] } : { value: q(l * w), lines: [`area, row by row: ${Array(w).fill(l).join(" + ")} = ${l * w}`] }; } }],
    alternativeExplanation: { title: "Act it out", text: ["Tiling a floor: you lay squares all over it (area).", "Fencing a garden: you walk round the edge (perimeter)."] },
    hints: (t) => ["Is something covering the inside, or going round the edge?", /cover/.test(t) ? "Covering: count the squares inside, rows × squares in a row." : "Going round: add all four sides.", /cover/.test(t) ? "Multiply length by width." : "Add length + width + length + width."],
    fixes: {
      "perimeter-for-area": { title: "Covering means area", fix: "Covering needs the squares INSIDE, not the length of the edge.", counter: (t) => { const [l, w] = nums(t).map(Number); return `Counter-check: draw ${w} rows of ${l} squares: there are ${l * w} squares, not ${2 * (l + w)}.`; } },
      "area-for-perimeter": { title: "Going round means perimeter", fix: "Going round needs the length of the EDGE, not the squares inside.", counter: (t) => { const [l, w] = nums(t).map(Number); return `Counter-check: walk round: ${l} + ${w} + ${l} + ${w} = ${2 * (l + w)}, not ${l * w}.`; } },
      "two-sides": { title: "Go round all four sides", fix: "Going round a rectangle passes all FOUR sides: two lengths and two widths.", counter: (t) => { const [l, w] = nums(t).map(Number); return `Counter-check: ${l} + ${w} = ${l + w} is only half the way round.`; } },
    },
    workingChecker: "none: no working contract",
    sources: ["packages/learning/src/fam/b05.ts:861 aeperar: teach idea/method, alternative act_it; bugs perimeter-for-area, area-for-perimeter, two-sides", "library.v1.json MATH.measurement.area-squares (seeded from aearea; aeperar has a chapter screen only)"],
    uncertainties: ["The oracle decides area vs perimeter from the words 'cover'/'round'; every pool prompt was checked (see validation) but a new context word would need review."],
  },
  {
    id: "TP-GEO-01", title: "The exterior angle of a triangle", family: "ahext", competency: "MATH.geometry.triangle-properties", strand: "geometry",
    unit: "°",
    restriction: "ahext, both forms: params[2] = 0 (find the exterior angle) and 1 (find an interior opposite angle); examples avoid coincident angles.",
    exampleOk: (p) => { const [a, b] = p.params; const c = 180 - a - b; const ans = Number(p.answer); return c !== a && c !== b && a !== b && p.bugs.every((x) => x.predict === null || [x.predict].flat().every((v) => Math.abs(Number(v) - ans) >= 3)); },
    skill: "Use the exterior-angle theorem: an exterior angle equals the sum of the two interior opposite angles (both directions).",
    applies: () => true,
    diagnosticCases: [
      { label: "find the exterior angle", pick: (p) => p.params[2] === 0, why: "third-interior gives 180 − a − b (the adjacent interior angle)" },
      { label: "find an interior opposite angle", pick: (p) => p.params[2] === 1, why: "exterior-as-interior and adjacent-interior give different wrong values; a learner who only adds is wrong here" },
    ],
    targets: [{ bug: "third-interior", status: "modelled", note: "the exterior angle confused with the adjacent interior angle" }, { bug: "adjacent-interior", status: "modelled", note: "the same confusion in reverse" }, { bug: "exterior-as-interior", status: "modelled", note: "the exterior angle used as a third interior angle" }],
    prerequisites: { knowledge: ["angles on a straight line add to 180° (MATH.geometry.angle-pairs)", "angle sum of a triangle is 180°"], graphNote: "SUSPECTED GRAPH GAP: triangle-properties lists only basic-constructions as mandatory; the exterior-angle theorem depends on angles on a straight line (angle-pairs). Not changed here; for Codex/curriculum review." },
    concept: ["At C the exterior angle and the interior angle next to it lie on a straight line, so together they make 180°.", "The three interior angles also make 180°. Both pairs make 180° and share the angle at C, so the exterior angle equals the other two interior angles together."],
    visual: (p) => { const [a, b] = nums(p.prompt).map(Number); return p.params[2] === 0 ? { type: "triangle", angles: [`${a}°`, `${b}°`, ""], exterior: "?" } : { type: "triangle", angles: [`${a}°`, "?", ""], exterior: `${a + b}°` }; },
    visualNote: "MISSING VISUAL CAPABILITY: the existing 'triangle' visual draws interior angles only; an extended side with an exterior angle cannot be drawn. Proposed: triangle + extended side + marked exterior angle (field 'exterior'). Until then, text only (structured givens; nothing is read from a picture).",
    oracle: (t) => { const v = nums(t).map(Number); if (/What is the exterior angle/.test(t)) { const [a, b] = v; const c = 180 - a - b; return { value: q(180 - c), lines: [`Third interior angle C = 180° − ${a}° − ${b}° = ${c}° (angle sum)`, `Exterior angle = 180° − ${c}° = ${180 - c}° (straight line)`, `Check: ${a}° + ${b}° = ${a + b}° (exterior-angle theorem)`] }; } const [e, a] = v; const c = 180 - e; return { value: q(180 - a - c), lines: [`Interior angle next to the exterior angle C = 180° − ${e}° = ${c}° (straight line)`, `Other opposite angle = 180° − ${a}° − ${c}° = ${180 - a - c}° (angle sum)`, `Check: ${a}° + ${180 - a - c}° = ${e}° (exterior-angle theorem)`] }; },
    alternatives: [{ name: "Exterior-angle theorem directly", valid: true, run: (t) => { const v = nums(t).map(Number); return /What is the exterior angle/.test(t) ? { value: q(v[0] + v[1]), lines: [`exterior = ${v[0]}° + ${v[1]}° = ${v[0] + v[1]}°`] } : { value: q(v[0] - v[1]), lines: [`other opposite angle = ${v[0]}° − ${v[1]}° = ${v[0] - v[1]}°`] }; } }],
    alternativeExplanation: { title: "Go through the third angle", text: ["Find the third interior angle with the angle sum.", "The exterior angle and that angle lie on a straight line, so the exterior angle is a straight angle minus the third angle."], math: "oracle" },
    hints: (t) => ["Which interior angle sits next to the exterior angle, on the straight line?", "That angle and the exterior angle make 180°; the three interior angles also make 180°.", /What is the exterior angle/.test(t) ? "So the exterior angle equals the two far interior angles added." : "So the far angle is the exterior angle minus the other far angle."],
    fixes: {
      "third-interior": { title: "The exterior angle is outside the triangle", fix: "The exterior angle is OUTSIDE the triangle, on the straight line next to the third angle; it is not the third angle.", counter: (t) => { const [a, b] = nums(t).map(Number); return `Counter-check: the third angle is ${180 - a - b}°; it and the exterior angle must make 180°, so the exterior angle is ${a + b}°.`; } },
      "adjacent-interior": { title: "Find the far angle, not the one next to it", fix: "The question asks for an angle FAR from the exterior angle, not the one next to it.", counter: (t) => { const [e, a] = nums(t).map(Number); return `Counter-check: ${180 - e}° is the angle next to the exterior angle; the far angles add to ${e}°, so the other far angle is ${e - a}°.`; } },
      "exterior-as-interior": { title: "The exterior angle is not one of the three", fix: "The exterior angle is outside the triangle; it is not one of the three angles that make 180°.", counter: (t) => { const [e, a] = nums(t).map(Number); return `Counter-check: ${e}° makes 180° with the interior angle next to it (${180 - e}°). The interior angles are ${a}°, ${180 - e}° and the one you want: 180° − ${a}° − ${180 - e}° = ${e - a}°.`; } },
    },
    workingChecker: "ahext has a geometry task (geometry-task.ts) for the foundation's geometry working adapter; the Python reasoner has NO exterior-angle rule (G5 R07), so a citation of the exterior-angle theorem is not verifiable; the 'via the third angle' route uses supported rules (triangle-sum, straight-line)",
    sources: ["packages/learning/src/fam/b08.ts:1199 ahext: teach, via_third, bugs third-interior / one-angle / exterior-as-interior / added / adjacent-interior", "docs/geometry-cross-domain-validation (G5): G-03 failed journey; R07"],
    uncertainties: ["Family bugs 'one-angle' and 'added' are procedural and not given misconception screens here (general teaching covers them)."],
  },
  {
    id: "TP-GEO-02", title: "Vertically opposite angles are equal", family: "afcross", competency: "MATH.geometry.angle-pairs", strand: "geometry",
    unit: "°",
    restriction: "afcross, all three forms: params[1] = 0 vertically opposite, 1 adjacent, 2 the other three (contrast); angles within 5° of 90 excluded from examples.",
    inherentInPrompt: ["neighbour-equal"],
    exampleOk: (p) => Math.abs(p.params[0] - 90) > 5,
    says: { "opposite-as-linear": () => "Vertically opposite angles were taken as a pair on a straight line. They are not on one straight line together; they are equal." },
    signature: (p) => [`x:${p.params[0]}`, `x:${180 - p.params[0]}`],
    skill: "At two crossing lines: vertically opposite angles are equal; adjacent angles make 180°; all four make 360°.",
    applies: () => true,
    diagnosticCases: [
      { label: "vertically opposite", pick: (p) => p.params[1] === 0, why: "opposite-as-linear gives 180 − x" },
      { label: "adjacent", pick: (p) => p.params[1] === 1, why: "neighbour-equal gives x; a learner with the swapped rule errs on both items in mirror image" },
      { label: "other three", pick: (p) => p.params[1] === 2, contrast: true, why: "straight-only / all-equal separate a full-turn gap from the opposite/adjacent confusion" },
    ],
    targets: [{ bug: "opposite-as-linear", status: "modelled", note: "vertically opposite taken as a linear pair" }, { bug: "neighbour-equal", status: "modelled", note: "adjacent taken as equal" }],
    prerequisites: { knowledge: ["angles on a straight line add to 180°", "a full turn is 360°"] },
    concept: ["Where two straight lines cross, angles next to each other lie on a straight line, so they add to 180°.", "Go round: x, then 180° − x, then 180° − (180° − x) = x again. So opposite angles are equal, and all four add to 360°."],
    visual: (p) => ({ type: "angle", deg: nums(p.prompt).map(Number)[0], note: "reuses go_round; a full crossing-lines figure is not in the Visual union" }),
    visualNote: "Reuses the family's own go_round visual ({type:'angle', deg}); a two-line crossing figure is a MISSING VISUAL CAPABILITY.",
    oracle: (t) => { const x = nums(t).map(Number)[0]; if (/opposite it/.test(t)) return { value: q(x), lines: [`next angle round = 180° − ${x}° = ${180 - x}° (straight line)`, `the one after = 180° − ${180 - x}° = ${x}° (straight line): the opposite angle is ${x}°`] }; if (/next to it/.test(t)) return { value: q(180 - x), lines: [`adjacent angles lie on a straight line: 180° − ${x}° = ${180 - x}°`] }; if (/other three/.test(t)) return { value: q(360 - x), lines: [`the other three = ${180 - x}° + ${x}° + ${180 - x}° = ${360 - x}°`] }; throw new Error("oracle: unknown afcross form"); },
    alternatives: [{ name: "Full turn", valid: true, run: (t) => { const x = nums(t).map(Number)[0]; return /other three/.test(t) ? { value: q(360 - x), lines: [`all four make 360°: 360° − ${x}° = ${360 - x}°`] } : /opposite it/.test(t) ? { value: q(360 - x - 2 * (180 - x)), lines: [`each angle next to ${x}° is 180° − ${x}° = ${180 - x}° (straight line)`, `all four make 360°: opposite angle = 360° − ${x}° − 2 × ${180 - x}° = ${360 - x - 2 * (180 - x)}°`] } : { value: q((360 - 2 * x) / 2), lines: [`the angle opposite ${x}° is also ${x}°; the other two are opposite each other, so equal`, `(360° − 2 × ${x}°) ÷ 2 = ${(360 - 2 * x) / 2}°`] }; } }],
    alternativeExplanation: { title: "Two crossed pencils", text: ["Hold two straight pencils crossed like an X.", "Open them wider: the top and bottom angles grow together while the two side angles shrink together. Opposite angles stay equal."] },
    hints: (t) => ["Which angles lie on the same straight line?", "Angles next to each other make 180°.", /opposite it/.test(t) ? "Go round twice: 180° − (180° − x) is back to x." : /next to it/.test(t) ? "180° minus the angle you know." : "All four make 360°."],
    fixes: {
      "opposite-as-linear": { title: "Vertically opposite angles are equal", fix: "Opposite angles do not lie together on one straight line, so they need not add to 180°: they are equal. Angles next to each other make 180°.", counter: (t) => { const x = nums(t).map(Number)[0]; return `Counter-check: going round the crossing, each angle makes 180° with the next one: ${x}°, then ${180 - x}°, then ${x}° again. The angle opposite ${x}° is the third one round, so it is ${x}°, not ${180 - x}°.`; } },
      "neighbour-equal": { title: "Angles next to each other make 180°", fix: "Angles next to each other lie on a straight line: they add to 180°. They are equal only when both are 90°.", counter: (t) => { const x = nums(t).map(Number)[0]; return `Check: the two angles together fill one side of a straight line, which is 180°. ${x}° + ${x}° = ${2 * x}° is ${2 * x > 180 ? "more" : "less"} than a straight line.`; } },
    },
    workingChecker: "afcross modes 0/1 have a geometry task (foundation adapter); mode 2 (other three) has none (geometry-task.ts excludes b === 2). G5 R06: a vertically-opposite citation for a MEASURE was rejected by the reasoner; route through straight-line steps is supported",
    sources: ["packages/learning/src/fam/b06.ts:1266 afcross: teach idea/method, go_round; bugs opposite-as-linear, full-turn, neighbour-equal, straight-only, all-equal", "docs/geometry-cross-domain-validation (G5) G-06"],
    uncertainties: ["The 'adjacent' full-turn route uses the opposite-angle fact; it is valid but not independent of it."],
  },
  {
    id: "TP-STA-01", title: "The median: order first, then find the middle", family: "akmed", competency: "MATH.statistics.median-mode", strand: "statistics",
    restriction: "akmed, all items (5–10 different whole numbers); examples, diagnostics and rechecks need |mean − median| ≥ 3.",
    inherentInPrompt: ["not-ordered", "one-middle"],
    exampleOk: (p) => { const v = listOf(p.prompt); const mean = v.reduce((a, b) => a + b, 0) / v.length; return Math.abs(mean - Number(p.answer)) >= 3; },
    bugExampleOk: { "mean-for-median": (p) => { const b = p.bugs.find((x) => x.id === "mean-for-median"); return !!b && b.predict !== null && Math.abs(Number(b.predict) - Number(p.answer)) >= 3; } },
    skill: "Find the median of 5–10 whole numbers (order first; halfway between the two middle values for an even count).",
    applies: () => true,
    diagnosticCases: [
      { label: "odd count", pick: (p) => p.params[1] % 2 === 1, why: "not-ordered (middle of the list as given) and mean-for-median give different values" },
      { label: "even count", pick: (p) => p.params[1] % 2 === 0, why: "one-middle (a single middle value) appears only with an even count" },
    ],
    targets: [{ bug: "not-ordered", status: "modelled", note: "PROCEDURAL slip or missing step: treat a single occurrence as a suspected error, not a misconception" }, { bug: "mean-for-median", status: "modelled", note: "conceptual: averages not distinguished" }, { bug: "one-middle", status: "modelled", note: "procedural: even count" }],
    prerequisites: { knowledge: ["ordering whole numbers", "halfway between two numbers"] },
    concept: ["The median is the middle value once the data are IN ORDER: half the values are below it, half above.", "With an even number of values there are two middle values; the median is halfway between them."],
    visual: (p) => { const v = listOf(p.prompt); return { type: "table", head: ["in order"], rows: [...v].sort((a, b) => a - b).map((x) => [String(x)]) }; },
    visualNote: "Reuses the table visual to show the ordered list; crossing off from both ends is the family's own cross_off alternative.",
    oracle: (t) => { const v = listOf(t).sort((a, b) => a - b); const k = v.length; const m = k % 2 ? q(v[(k - 1) / 2]) : q(v[k / 2 - 1] + v[k / 2], 2); return { value: m, lines: [`In order: ${v.join(", ")} (${k} values)`, k % 2 ? `The middle one is the ${ord((k + 1) / 2)} value: ${qs(m)}` : `The two middle values are the ${ord(k / 2)} and ${ord(k / 2 + 1)}: ${v[k / 2 - 1]} and ${v[k / 2]}; halfway: (${v[k / 2 - 1]} + ${v[k / 2]}) ÷ 2 = ${(v[k / 2 - 1] + v[k / 2]) / 2}`] }; },
    alternatives: [{ name: "Cross off from both ends", valid: true, run: (t) => { const v = listOf(t).sort((a, b) => a - b); while (v.length > 2) { v.shift(); v.pop(); } const m = v.length === 1 ? q(v[0]) : q(v[0] + v[1], 2); return { value: m, lines: [`cross off smallest and largest repeatedly; left: ${v.join(" and ")}`, `median ${v.length === 1 ? v[0] : (v[0] + v[1]) / 2}`] }; } }],
    alternativeExplanation: { title: "Line up by height", text: ["Line the numbers up from smallest to largest, like children by height.", "The child in the middle of the line is the median; with two in the middle, take halfway."] },
    hints: () => ["Are the numbers in order?", "Write them from smallest to largest.", "Find the middle one (or halfway between the two middle ones)."],
    fixes: {
      "not-ordered": { title: "Put the numbers in order first", fix: "The middle of the list only means something once the list is in order.", counter: (t) => { const v = listOf(t); const s = [...v].sort((a, b) => a - b); return `Counter-check: in the order given the middle is ${v.length % 2 ? v[(v.length - 1) / 2] : `${v[v.length / 2 - 1]}/${v[v.length / 2]}`}; in order it is ${s.length % 2 ? s[(s.length - 1) / 2] : `${s[s.length / 2 - 1]}/${s[s.length / 2]}`}. Reorder the same data and the 'middle' would change, so it cannot be a fact about the data.`; } },
      "mean-for-median": { title: "The median is not the mean", fix: "The mean shares the total equally; the median is the middle value in order. They are different averages.", counter: (t) => { const v = listOf(t); const s = [...v].sort((a, b) => a - b); const tot = v.reduce((a, b) => a + b, 0); return `Check: the total ${tot} shared equally among ${v.length} values is ${+(tot / v.length).toFixed(2)} (the mean); in order, ${s.join(", ")}, the middle value is different.`; } },
      "one-middle": { title: "Two middle values: take halfway", fix: "With an even number of values there are two middle values: take halfway between them.", counter: (t) => { const s = listOf(t).sort((a, b) => a - b); const k = s.length; return k % 2 ? "Check: with an odd number of values there is one middle value." : `Check: ${k} values have no single middle; the ${ord(k / 2)} and ${ord(k / 2 + 1)} values, ${s[k / 2 - 1]} and ${s[k / 2]}, share the middle, so the median is halfway: ${(s[k / 2 - 1] + s[k / 2]) / 2}.`; } },
    },
    workingChecker: "none: no working contract for statistics",
    sources: ["packages/learning/src/fam/b11.ts:1729 akmed: teach idea/method, alternative cross_off; bugs not-ordered, mean-for-median, one-middle", "library.v1.json MATH.statistics.median-mode (seeded from akmed: this is the seed family; spot_the_mistake addresses one bug only)"],
    uncertainties: ["'not-ordered' is procedural: under misconception-evidence@1 a single match is a suspected error; only two matching answers establish it."],
  },
  {
    id: "TP-ALG-01", title: "(a + b)²: why the middle term is 2ab", family: "ahid", competency: "MATH.algebra.identities", strand: "algebra",
    restriction: "ahid with params[0] ∈ {0, 1} ((px + q)², (px − q)²) and params[3] = 1 (the box is the x coefficient); examples need p ≥ 2, p ≠ q, q ≠ 2p, p ≠ 2q.",
    // p ≠ q and q ≠ 2p, so a copied number from the prompt is never read as a modelled error (the builder also rejects target values printed in the prompt)
    exampleOk: (p) => p.params[1] >= 2 && p.params[1] !== p.params[2] && p.params[2] !== 2 * p.params[1] && p.params[1] !== 2 * p.params[2],
    signature: (p) => [`pq:${p.params[1]},${p.params[2]}`],
    quoteFamilySteps: false,
    skill: "Expand (px ± q)² with the identity; in particular the middle coefficient ±2pq.",
    applies: (p) => p.params[0] !== 2 && p.params[3] === 1,
    diagnosticCases: [
      { label: "(px + q)², middle", pick: (p) => p.params[0] === 0 && p.params[3] === 1, why: "middle-not-doubled gives pq; middle-sign gives −2pq" },
      { label: "(px − q)², middle", pick: (p) => p.params[0] === 1 && p.params[3] === 1, why: "the same two difficulties with the sign reversed: separates a sign slip from the missing doubling" },
    ],
    targets: [{ bug: "middle-not-doubled", status: "modelled", note: "conceptual: (a+b)² read as a² + ab + b² (or a² + b²)" }, { bug: "middle-sign", status: "modelled", note: "procedural sign slip" }],
    prerequisites: { knowledge: ["multiplying two binomials term by term", "x × x = x²"], graphNote: "the graph's prerequisite relations for identities were not changed" },
    concept: ["(a + b)² = (a + b)(a + b). Multiplying every term by every term gives a×a, a×b, b×a and b×b.", "a×b and b×a are the same, and there are TWO of them: a² + 2ab + b². The area picture shows them as two equal rectangles."],
    visual: () => ({ type: "grid", rows: 2, cols: 2, labels: ["a²", "ab", "ab", "b²"] }),
    visualNote: "Reuses ahid's own 'area' visual ({type:'grid', rows:2, cols:2}); labels proposed (the existing visual has none).",
    oracle: (t) => idOracle(t),
    alternatives: [{ name: "Multiply it out: four products", valid: true, run: (t) => fourProducts(t) }],
    alternativeExplanation: { title: "Multiply it out", text: ["Write (px + q)² as (px + q)(px + q) and multiply each term by each term.", "The two middle products come out equal, so the middle term is doubled."] },
    hints: () => ["Write the square as a product of two brackets.", "Multiply each term in the first bracket by each term in the second: four products.", "Two of the four products are the same; add them."],
    fixes: {
      "middle-not-doubled": { title: "The middle term is 2ab", fix: "There are two middle products, a×b and b×a; together they make 2ab.", counter: (t) => atOne(t, "half") },
      "middle-sign": { title: "The sign of the middle term", fix: "Square of a sum: +2ab. Square of a difference: −2ab.", counter: (t) => atOne(t, "sign") },
    },
    workingChecker: "ahid has no working contract; an expansion written as working is not examined (answer-level only)",
    sources: ["packages/learning/src/fam/b08.ts:2188 ahid: teach idea/method; alternatives area, multiply_out; bugs middle-not-doubled, middle-sign, minus-squared, q-doubled, p-not-squared", "MATH.algebra.identities (authored module seeded from 'expand'; ahid has no misconception-specific explanation)"],
    uncertainties: ["The question asks one coefficient at a time (by design, so the unexpanded form is not accepted); the package teaches the full expansion but checks the middle coefficient.", "The area picture fits (a + b)² only; for (a − b)² use the four-products method.", "CONTENT DEFECT (existing family step text, fam/b08.ts:2232 ahid explain): for every (px − q)² item it prints e.g. '2ab = 2 × 3x × 8 = -48x' (b shown as +8 while the product is negative) and '1x²' when p = 1. The package does NOT quote the family's step text for this family. Not changed here."],
  },
  {
    id: "TP-PRO-01", title: "Two spinners or dice: totals are not equally likely", family: "akdice", competency: "MATH.probability.sample-space", strand: "probability",
    answerDistinct: true,
    restriction: "akdice with params[2] = 0 (\"the total is exactly k\"); totals made by at least two pairs for diagnostics, rechecks and delayed checks.",
    bugExampleOk: { "totals-equally-likely": (p) => p.params[3] !== 2 && p.params[3] !== p.params[0] + p.params[1] },
    skill: "Find the probability of a total with two dice/spinners by listing all m × n equally likely pairs.",
    applies: (p) => p.params[2] === 0,
    diagnosticCases: [
      { label: "same-size spinners, a total made by several pairs", pick: (p) => p.params[2] === 0 && p.params[0] === p.params[1] && p.params[3] !== 2 && p.params[3] !== 2 * p.params[0], why: "all three errors give different values: totals-equally-likely 1/(2m−1), added-sides k/(2m), order-ignored (unordered pairs)/m²" },
      { label: "different-size spinners, a total made by several pairs", pick: (p) => p.params[2] === 0 && p.params[0] !== p.params[1] && p.params[3] !== 2 && p.params[3] !== p.params[0] + p.params[1], why: "order-ignored is not modelled with different sizes; a learner who errs only on the first item points to order, one who errs on both to the totals or the sample-space size" },
    ],
    targets: [{ bug: "totals-equally-likely", status: "modelled", note: "conceptual: outcomes (totals) taken as equally likely" }, { bug: "order-ignored", status: "modelled", note: "conceptual: (1,2) and (2,1) counted once" }, { bug: "added-sides", status: "modelled", note: "procedural: sample space m + n instead of m × n" }],
    prerequisites: { knowledge: ["probability = favourable ÷ total for equally likely outcomes", "listing outcomes systematically"] },
    concept: ["Each spinner (or die) gives each of its numbers equally often, so every PAIR (first number, second number) is equally likely: m × n pairs.", "The totals are not equally likely: a middle total can be made by many pairs, an end total by only one."],
    visual: (p) => { const [m, n] = [p.params[0], p.params[1]]; return { type: "table", head: ["", ...Array.from({ length: n }, (_, j) => String(j + 1))], rows: Array.from({ length: m }, (_, i) => [String(i + 1), ...Array.from({ length: n }, (_, j) => String(i + j + 2))]) }; },
    visualNote: "Reuses the table visual (the family's own method: 'Draw a table'); every cell is one equally likely pair.",
    oracle: (t) => { const two = t.match(/first gives a number from 1 to (\d+) and the second a number from 1 to (\d+)/), each = t.match(/Each gives a number from 1 to (\d+)/); const [m, n] = two ? [Number(two[1]), Number(two[2])] : [Number(each![1]), Number(each![1])]; const k = Number(t.match(/total of the two numbers is (\d+)/)![1]); const more = /or more/.test(t); let c = 0; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) if (more ? i + j >= k : i + j === k) c++; return { value: q(c, m * n), lines: [`All pairs: ${m} × ${n} = ${m * n}, equally likely`, `Pairs with total ${more ? `${k} or more` : k}: ${c}`, `P = ${c}/${m * n}${qs(q(c, m * n)) === `${c}/${m * n}` ? "" : ` = ${qs(q(c, m * n))}`}`] }; },
    alternatives: [{ name: "Tree diagram", valid: true, run: (t) => { const o = PACKAGES.find((x) => x.id === "TP-PRO-01")!.oracle(t); return { value: o.value, lines: ["one branch per first number, then per second number; count the ticked paths", o.lines[2]] }; } }],
    alternativeExplanation: { title: "Why middle totals are more common", text: ["The smallest total can be made in only one way: the smallest number on both spinners.", "A total in the middle can be made in several ways, and each way is equally likely, so a middle total is more likely."] },
    hints: () => ["Is each TOTAL equally likely, or each PAIR?", "Draw the table of all pairs.", "Count the cells with the total you want; divide by all the cells."],
    fixes: {
      "totals-equally-likely": { title: "Pairs are equally likely, totals are not", fix: "The pairs are equally likely, not the totals: count the pairs that give each total.", counter: (t) => { const { m, n, k } = dice(t); const c = pairs(m, n, k); return `Check: total 2 can only be made as 1 + 1, but total ${k} can be made in ${c.length} ways: ${c.map(([i, j]) => `${i} + ${j}`).join(", ")}. The totals do not all have the same chance.`; } },
      "order-ignored": { title: "The order of the two spinners matters", fix: "First 1 then 2 and first 2 then 1 are different pairs: the first and the second spinner are different objects.", counter: (t) => { const { m, n, k } = dice(t); const c = pairs(m, n, k).filter(([i, j]) => i !== j); const [i, j] = c[0] ?? [1, 1]; return c.length ? `Check: colour the first spinner red: red ${i} with blue ${j}, and red ${j} with blue ${i}, are two different outcomes.` : "Check: here every pair has two equal numbers, so order does not change the count."; } },
      "added-sides": { title: "m × n pairs, not m + n", fix: "Each first number goes with EACH second number: m × n pairs, not m + n.", counter: () => "Counter-check: two spinners numbered 1 to 3 give the pairs 11, 12, 13, 21, 22, 23, 31, 32, 33: 9 = 3 × 3 pairs, not 3 + 3 = 6." },
    },
    workingChecker: "none: no working contract for probability",
    sources: ["packages/learning/src/fam/b11.ts:803 akdice: teach idea/method, alternative tree; bugs totals-equally-likely, added-sides, order-ignored, more-than, equal-included", "library.v1.json MATH.probability.sample-space (seeded from akss; akdice has a chapter screen only)"],
    uncertainties: ["Only 'total is exactly k' (mode 0) is taught here; 'k or more' (mode 1) and 'second bigger than first' (mode 2) are not.", "The family models order-ignored only for equal-size spinners (fam/b11.ts akdice bugs); that is a modelling choice, not a mathematical fact."],
  },
];

// helpers used above (declared after use is fine for function declarations)
function dice(t: string) { const two = t.match(/first gives a number from 1 to (\d+) and the second a number from 1 to (\d+)/), each = t.match(/Each gives a number from 1 to (\d+)/); const [m, n] = two ? [Number(two[1]), Number(two[2])] : [Number(each![1]), Number(each![1])]; const k = Number(t.match(/total of the two numbers is (\d+)/)![1]); return { m, n, k }; }
function pairs(m: number, n: number, k: number) { const out: [number, number][] = []; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) if (i + j === k) out.push([i, j]); return out; }
function pc(n: string) { return n === "1" ? "piece" : "pieces"; }
function hs(h: number) { return `${h} ${h === 1 ? "hundredth" : "hundredths"}`; }
function paise(h: number) { return `${h} ${h === 1 ? "paisa" : "paise"}`; }
function ord(n: number) { return `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`; }
function binom(t: string) { const e = t.replace(/−/g, "-").match(/expand \((\d*)x ([+-]) (\d+)\)(²|\((\d*)x ([+-]) (\d+)\))\./)!; const p = Number(e[1] || 1), s1 = e[2] === "+" ? 1 : -1, qv = Number(e[3]); const second = e[4] === "²" ? { p, s: s1, q: qv } : { p: Number(e[5] || 1), s: e[6] === "+" ? 1 : -1, q: Number(e[7]) }; return { first: { p, s: s1, q: qv }, second }; }
const term = (k: number, x: string) => (k === 0 ? "" : `${k < 0 ? "−" : "+"} ${Math.abs(k) === 1 && x ? "" : Math.abs(k)}${x}`);
/** an independent route: list the four products term by term, then collect */
function fourProducts(t: string): Oracle {
  const { first: A, second: B } = binom(t);
  const xx = A.p * B.p, x1 = A.p * B.s * B.q, x2 = A.s * A.q * B.p, c = A.s * A.q * B.s * B.q;
  const o = idOracle(t);
  const boxedWhich = o.lines[1].includes("x²") ? 2 : o.lines[1].includes("x coefficient") || o.lines[1].includes(" x ") ? 1 : 0;
  const tpl = t.replace(/−/g, "-").split("=").slice(-1)[0]; const neg = /-\s*□/.test(tpl);
  const v = (neg ? -1 : 1) * [c, x1 + x2, xx][boxedWhich];
  return { value: q(v), lines: [`${xx}x² ${term(x1, "x")} ${term(x2, "x")} ${term(c, "")} (first×first, first×second, second×first, second×second)`, `collect the two x terms: ${x1} + ${x2} = ${x1 + x2}`] };
}
/** check an expansion at x = 1 with the instance's own numbers */
function atOne(t: string, wrong: "half" | "sign"): string {
  const { first: A, second: B } = binom(t); const lhs = (A.p + A.s * A.q) * (B.p + B.s * B.q);
  const mid = A.p * B.s * B.q + A.s * A.q * B.p, sq = A.p * B.p, c = A.s * A.q * B.s * B.q;
  const bad = wrong === "half" ? sq + mid / 2 + c : sq - mid + c;
  return `Check at x = 1: the left side is ${lhs}. With the middle term ${mid}: ${sq} ${term(mid, "")} ${term(c, "")} = ${sq + mid + c}. With ${wrong === "half" ? mid / 2 : -mid} instead: ${bad}, which is not ${lhs}.`;
}
function dec2(s: string) { const [w, f = ""] = s.split("."); return `${w}.${(f + "00").slice(0, 2)}`; }
function hund(s: string) { const [w, f = ""] = s.split("."); return Number(w) * 100 + Number((f + "00").slice(0, 2)); }
function listOf(t: string) { return t.split(":").pop()!.replace(/\.$/, "").split(",").map((x) => Number(x.trim())); }
/** (px ± q)² or (px + q)(px − q): multiply the polynomials exactly; read the boxed coefficient from the template */
function idOracle(t: string): Oracle {
  const e = t.replace(/−/g, "-").match(/expand \((\d*)x ([+-]) (\d+)\)(²|\((\d*)x ([+-]) (\d+)\))\./)!;
  const p = Number(e[1] || 1), s1 = e[2] === "+" ? 1 : -1, qv = Number(e[3]);
  const second: [number, number] = e[4] === "²" ? [s1 * qv, p] : [(e[6] === "+" ? 1 : -1) * Number(e[7]), Number(e[5] || 1)];
  const a: [number, number] = [s1 * qv, p];
  const c = [a[0] * second[0], a[0] * second[1] + a[1] * second[0], a[1] * second[1]]; // const, x, x²
  const tpl = t.replace(/−/g, "-").split("=").slice(-1)[0].split("What")[0];
  const terms = tpl.match(/[+-]?\s*(□|\d*)(x²|x)?/g)!.map((x) => x.replace(/\s/g, "")).filter((x) => x && x !== "+" && x !== "-");
  const boxed = terms.find((x) => x.includes("□"))!;
  const sign = boxed.startsWith("-") ? -1 : 1;
  const which = boxed.endsWith("x²") ? 2 : boxed.endsWith("x") ? 1 : 0;
  const v = sign * c[which];
  const co = (k: number, x: string) => `${k === 1 ? "" : k}${x}`;
  return { value: q(v), lines: [`(${p === 1 ? "" : p}x ${e[2] === "-" ? "−" : "+"} ${qv})${e[4].replace(/-/g, "−")} = ${co(c[2], "x²")} ${c[1] < 0 ? "−" : "+"} ${co(Math.abs(c[1]), "x")} ${c[0] < 0 ? "−" : "+"} ${Math.abs(c[0])} (every term times every term)`, `The box is the ${["constant", "x", "x²"][which]} ${sign < 0 ? "term after a minus sign" : "coefficient"}: ${v}`] };
}
