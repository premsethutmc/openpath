/**
 * Exact-number reasoning engine: integers, fractions, decimals, percentages, ratios, proportions, factors, HCF/LCM, powers, units.
 * Accepts ANY valid line sequence (a line is judged by its exact value, not by a template), reports the first incorrect
 * transformation with candidate misconceptions, keeps "is it correct" apart from "was the skill shown", and refuses
 * (unsupported / ambiguous) rather than guessing. It decides nothing about marking: the result is advisory.
 */
import { gcdB } from "../../exact/rational.ts";
import { show, positions, type Node } from "./ast.ts";
import { ParseError, parseStatement, normalise } from "./parse.ts";
import { evaluate, valEq, solve, solEq, scalesOf, Fail, type Val, type Sol } from "./eval.ts";
import { explainMismatch, type ErrorCandidate } from "./errors.ts";
import { demonstrated, SKILLS, type SkillId } from "./skills.ts";
export { SKILLS, type SkillId, type ErrorCandidate };

export type Form = "any" | "lowest-terms" | "decimal" | "fraction" | "percent" | "mixed" | "factorised" | { unit: string };
export interface NumberOptions { form?: Form; requiredSkills?: SkillId[] }
export type StepStatus = "valid" | "no-change" | "invalid" | "unsupported" | "ambiguous";
export interface NumberStep { index: number; from: string; to: string; status: StepStatus; explanation: string; errors: ErrorCandidate[] }
export interface NumberAssessment {
  outcome: "verified" | "invalid" | "ambiguous" | "unsupported" | "incomplete";
  correct: true | false | null;
  firstInvalidStep: number | null;
  steps: NumberStep[];
  errors: ErrorCandidate[];                       // candidate misconceptions for the first invalid step
  final: { value: string; form: "ok" | "not-requested-form" | "not-final" | "units-missing" | "n/a"; detail: string };
  skills: { required: SkillId[]; demonstrated: SkillId[]; missing: SkillId[]; status: "demonstrated" | "not-demonstrated" | "n/a" };
  summary: string;
}
type Problem =
  | { kind: "value"; node: Node; target: Val; form: Form }
  | { kind: "equation"; sides: Node[]; sol: Sol };

const FORM_WORDS: [RegExp, Form][] = [[/\bas a percent(?:age)?\b/, "percent"], [/\bas a (?:decimal)\b/, "decimal"], [/\bas a mixed number\b/, "mixed"], [/\bas a (?:proper |improper )?fraction\b/, "fraction"], [/\b(?:in|to) (?:its |the )?(?:simplest|lowest) (?:form|terms)\b/, "lowest-terms"], [/\bas a product of (?:its )?prime(?: factors| numbers)?\b|\bprime factori[sz]ation\b/, "factorised"]];
/** Read a problem statement: an expression, a ratio, an equation/proportion with one unknown, or a plain-words form of those. */
export function readProblem(text: string): Problem | null {
  let t = normalise(text).replace(/[?=]\s*$/, "").trim(); let form: Form = /^\s*simplify\b/i.test(t) ? "lowest-terms" : "any";
  const low = t.toLowerCase();
  for (const [re, f] of FORM_WORDS) if (re.test(low)) { if (form === "any" || (form === "lowest-terms" && f !== "lowest-terms")) form = f; t = t.replace(re, "").trim(); }
  t = t.replace(/^(?:find|calculate|evaluate|work out|compute|simplify|express|write|convert|what is|determine)\s+(?:the\s+value of\s+)?/i, "").replace(/\bhighest common factor\b|\bgreatest common (?:divisor|factor)\b/gi, "hcf").replace(/\blowest common multiple\b|\bleast common multiple\b/gi, "lcm").replace(/\bthe\s+(?=hcf|lcm)/gi, "");
  t = t.replace(/\b(hcf|lcm)\s+of\s+([\d, and]+)$/i, (_m, f, rest) => `${f.toLowerCase()}(${rest.replace(/\s+and\s+/g, ", ").replace(/,\s*,/g, ",")})`);
  const conv = t.match(/^(.+?)\s+(?:to|in|into)\s+(mm|cm|m|km|mg|g|kg|ml|l|s|min|h|paise|₹)$/i);
  if (conv) { t = conv[1].trim(); form = { unit: conv[2].toLowerCase() }; }
  try {
    const st = parseStatement(t);
    if (st.ambiguous) return null;
    if (st.sides.length === 1 && !st.hasVar) return { kind: "value", node: st.sides[0], target: evaluate(st.sides[0]), form };
    if (st.sides.length >= 2 && (st.hasVar && st.sides.some((s) => s.t === "ratio"))) return { kind: "equation", sides: st.sides, sol: chainSol(st.sides) };
    return null;
  } catch (e) { if (e instanceof ParseError || e instanceof Fail) return null; throw e; }
}
/** can this engine take the problem? (a plain equation in x is left to the algebra core) */
export const isExactNumberProblem = (text: string): boolean => readProblem(text) !== null;

function pairSol(l: Node, r: Node): Sol {
  if (l.t === "ratio" || r.t === "ratio") {
    if (l.t !== "ratio" || r.t !== "ratio" || l.parts.length !== 2 || r.parts.length !== 2) throw new Fail("unsupported", "only two-part ratios can be equated");
    for (const d of [l.parts[1], r.parts[1]]) { const v = evaluate(d); if (v.k !== "q") throw new Fail("unsupported", "an unknown in a denominator position"); if (v.q.n === 0n) throw new Fail("undefined", "a ratio part of zero"); }
    const m = (a: Node, b: Node): Node => ({ t: "bin", op: "*", l: a, r: b });
    return solve(evaluate(m(l.parts[0], r.parts[1])), evaluate(m(l.parts[1], r.parts[0])));
  }
  return solve(evaluate(l), evaluate(r));
}
function chainSol(sides: Node[]): Sol {
  let sol = pairSol(sides[0], sides[1]);
  for (let i = 1; i + 1 < sides.length; i++) { const s = pairSol(sides[i], sides[i + 1]); if (sol.kind === "one" && s.kind === "all") continue; if (!solEq(sol, s) && !(s.kind === "all")) return { kind: "none" }; }
  return sol;
}

const isLiteral = (n: Node): boolean => n.t === "num" || (n.t === "pct" && isLiteral(n.e)) || (n.t === "unit" && isLiteral(n.e)) || (n.t === "neg" && isLiteral(n.e)) || (n.t === "mixed") || (n.t === "ratio" && n.parts.every(isLiteral)) || (n.t === "bin" && n.op === "/" && n.l.t === "num" && n.r.t === "num" && n.l.q.d === 1n && n.r.q.d === 1n);
const frac = (n: Node): [bigint, bigint] | null => (n.t === "neg" ? frac(n.e) : n.t === "bin" && n.op === "/" && n.l.t === "num" && n.r.t === "num" ? [n.l.q.n, n.r.q.n] : null);
const strip = (n: Node): Node => (n.t === "unit" || n.t === "neg" ? strip(n.e) : n);
const primeLeaves = (n: Node): boolean => (n.t === "num" ? n.q.d === 1n && isPrime(n.q.n) : n.t === "bin" && n.op === "*" ? primeLeaves(n.l) && primeLeaves(n.r) : n.t === "bin" && n.op === "^" ? n.l.t === "num" && isPrime(n.l.q.n) && n.r.t === "num" : false);
const isPrime = (n: bigint) => { if (n < 2n) return false; for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false; return true; };
/** does the last line have the shape the problem asks for? */
export function checkForm(n: Node, form: Form): { ok: boolean; detail: string } {
  if (typeof form === "object") {
    const u = n.t === "unit" ? n.u : null; return u === form.unit ? { ok: true, detail: "" } : { ok: false, detail: `the answer should be written in ${form.unit}` };
  }
  if (form === "factorised") return primeLeaves(n) && !(n.t === "num") ? { ok: true, detail: "" } : n.t === "num" && isPrime(n.q.n) ? { ok: true, detail: "" } : { ok: false, detail: "write the number as a product of prime factors" };
  if (!isLiteral(n)) return { ok: false, detail: "the working is not finished: the last line still has operations to do" };
  const core = strip(n);
  if (n.t === "ratio" || core.t === "ratio") { const parts = (core as Extract<Node, { t: "ratio" }>).parts.map((p) => strip(p)); const ints = parts.every((p) => p.t === "num" && p.q.d === 1n); const g = ints ? parts.map((p) => (p as Extract<Node, { t: "num" }>).q.n).reduce((a, b) => gcdB(a, b)) : 1n; return form === "lowest-terms" && (!ints || g !== 1n) ? { ok: false, detail: "the ratio is not in its simplest form" } : { ok: true, detail: "" }; }
  const f = frac(core);
  if (form === "lowest-terms" || form === "fraction") { if (f && gcdB(f[0], f[1]) !== 1n) return { ok: false, detail: "the fraction is not in its simplest form" }; if (form === "fraction" && !f && !(core.t === "num" && core.q.d === 1n)) return { ok: false, detail: "write the answer as a fraction" }; }
  if (form === "lowest-terms" && core.t === "mixed") { const mf = frac(core.f); if (mf && gcdB(mf[0], mf[1]) !== 1n) return { ok: false, detail: "the fraction part is not in its simplest form" }; }
  if (form === "decimal" && !(core.t === "num")) return { ok: false, detail: "write the answer as a decimal" };
  if (form === "percent" && n.t !== "pct") return { ok: false, detail: "write the answer as a percent" };
  if (form === "mixed" && !(core.t === "mixed" || (core.t === "num" && core.q.d === 1n))) return { ok: false, detail: "write the answer as a mixed number" };
  return { ok: true, detail: "" };
}

interface Parsed { text: string; sides: Node[]; hasVar: boolean; ambiguous: boolean }
const tryParse = (text: string): Parsed | { err: string; kind: "unsupported" | "invalid" } => { try { const s = parseStatement(text); return { text, sides: s.sides, hasVar: s.hasVar, ambiguous: s.ambiguous }; } catch (e) { if (e instanceof ParseError) return { err: e.message, kind: "unsupported" }; throw e; } };
/** does `n` have the same value as some sub-expression of one of `nodes`? */
function isPartOf(n: Node, nodes: Node[]): boolean { let v: Val; try { v = evaluate(n); } catch { return false; } for (const root of nodes) for (const p of positions(root)) { try { if (p.node !== root && valEq(evaluate(p.node), v)) return true; } catch { /* a part without a value */ } } return false; }
const lastSide = (p: Parsed) => p.sides[p.sides.length - 1];

/** Is `to` a valid transformation of `from` (two expression/ratio lines)? */
export function relateValues(from: Node, to: Node): { ok: boolean; fromV?: Val; toV?: Val; why?: string; fail?: Fail } {
  try { const a = evaluate(from), b = evaluate(to); return { ok: valEq(a, b), fromV: a, toV: b }; } catch (e) { if (e instanceof Fail) return { ok: false, fail: e, why: e.message }; throw e; }
}

export function assessNumberWorking(problemText: string, lines: string[], opts: NumberOptions = {}): NumberAssessment {
  const base = (o: Partial<NumberAssessment>): NumberAssessment => ({ outcome: "unsupported", correct: null, firstInvalidStep: null, steps: [], errors: [], final: { value: "", form: "n/a", detail: "" }, skills: { required: opts.requiredSkills ?? [], demonstrated: [], missing: opts.requiredSkills ?? [], status: opts.requiredSkills?.length ? "not-demonstrated" : "n/a" }, summary: "", ...o });
  const P = readProblem(problemText);
  if (!P) return base({ summary: "the problem is not an exact-number problem this engine can read" });
  const form = opts.form ?? (P.kind === "value" ? P.form : "any");
  const probNode: Node = P.kind === "value" ? P.node : P.sides[0];
  const steps: NumberStep[] = []; const parsedLines: Parsed[] = []; let firstInvalid: number | null = null; let errors: ErrorCandidate[] = [];
  let prevNode: Node = probNode; let prevText = problemText; let prevOk = true;
  let unsupported = 0, ambiguous = 0, unitMissing = false; const mainNodes: Node[] = []; const auxNodes: Node[] = []; let lastMain: Node | null = null;
  lines.forEach((raw, k) => {
    const i = k + 1; const pr = tryParse(raw);
    const push = (status: StepStatus, explanation: string, errs: ErrorCandidate[] = []) => { steps.push({ index: i, from: prevText, to: raw, status, explanation, errors: errs }); if (status === "invalid" && firstInvalid === null) { firstInvalid = i; errors = errs; } if (status === "unsupported") unsupported++; if (status === "ambiguous") ambiguous++; };
    if ("err" in pr) { push("unsupported", `this line cannot be read as exact-number working (${pr.err})`); prevOk = false; return; }
    parsedLines.push(pr);
    if (pr.ambiguous) { push("ambiguous", "this line can be read in more than one way (a division followed by a bracket); use brackets to show which is meant"); prevOk = false; return; }
    try {
      if (P.kind === "equation") {
        const s = chainSol(pr.sides);
        if (solEq(s, P.sol)) push(i > 1 && raw.replace(/\s/g, "") === lines[k - 1]?.replace(/\s/g, "") ? "no-change" : "valid", "keeps exactly the same solution as the problem"); else push("invalid", `this line has a different solution from the problem`, []);
        prevOk = true; return;
      }
      // chain "A = B = C": each equality must hold, A continues from the previous line
      for (let j = 0; j + 1 < pr.sides.length; j++) { const r = relateValues(pr.sides[j], pr.sides[j + 1]); if (r.fail) throw r.fail; if (!r.ok) { const errs = explainMismatch(pr.sides[j], evaluate(pr.sides[j + 1]), pr.sides[j + 1]); push("invalid", `${show(pr.sides[j])} is not equal to ${show(pr.sides[j + 1])}`, errs); prevNode = lastSide(pr); prevText = raw; prevOk = false; return; } }
      const head = pr.sides[0]; const cur = lastSide(pr);
      const ref = prevOk ? prevNode : probNode; const r = relateValues(ref, head);
      if (r.fail) throw r.fail;
      // a true equality about a part of the working (e.g. "12 = 2^2 × 3") is a valid fact that does not move the main line on
      if (!r.ok && pr.sides.length >= 2 && isPartOf(head, [probNode, ...mainNodes, ...auxNodes])) { push("valid", "a true fact about part of the working (it does not change the main line)"); auxNodes.push(...pr.sides); return; }
      if (!r.ok) {
        // a dimensionless numeral where the previous line had a quantity: the unit was dropped, which is not a value to judge
        if (r.fromV?.k === "q" && r.toV?.k === "q" && Object.keys(r.fromV.dim).length && !Object.keys(r.toV.dim).length && r.toV.q.n !== 0n && scalesOf(r.fromV.dim).some((sc) => { const f = r.fromV as Extract<Val, { k: "q" }>, t = r.toV as Extract<Val, { k: "q" }>; return f.q.n * t.q.d === t.q.n * f.q.d * sc; })) { push("unsupported", "the unit is missing, so this value cannot be checked"); unitMissing = true; prevNode = cur; prevText = raw; prevOk = false; return; }
        const errs = explainMismatch(ref, evaluate(head), head);
        push("invalid", `${show(head)} does not have the same value as ${show(ref)}`, errs);
        prevNode = cur; prevText = raw; prevOk = false; return;
      }
      push(show(ref) === show(head) && pr.sides.length === 1 ? "no-change" : "valid", "equal in value to the previous line (exact arithmetic)");
      prevNode = cur; prevText = raw; prevOk = true; mainNodes.push(cur); lastMain = cur;
    } catch (e) {
      if (!(e instanceof Fail)) throw e;
      if (e.kind === "unsupported") { push("unsupported", `cannot be checked exactly: ${e.message}`); prevOk = false; }
      else { push("invalid", e.kind === "units" ? `the units do not work: ${e.message}` : `not defined: ${e.message}`); prevNode = lastSide(pr); prevText = raw; prevOk = false; }
    }
  });
  const sk = opts.requiredSkills ?? []; const shown = demonstrated([P.kind === "equation" ? P.sides : [probNode], ...parsedLines.map((p) => p.sides)]);
  const dem = sk.filter((s) => shown.has(s)); const missing = sk.filter((s) => !shown.has(s));
  const skills = { required: sk, demonstrated: dem, missing, status: (sk.length ? (missing.length ? "not-demonstrated" : "demonstrated") : "n/a") as "demonstrated" | "not-demonstrated" | "n/a" };
  const skillNote = skills.status === "not-demonstrated" ? ` The working does not show: ${missing.map((m) => SKILLS[m]).join("; ")}.` : "";
  const last = lastMain;
  let fin: NumberAssessment["final"] = { value: last ? show(last) : "", form: "n/a", detail: "" };
  let outcome: NumberAssessment["outcome"]; let summary: string;
  if (firstInvalid !== null) { outcome = "invalid"; summary = `Step ${firstInvalid} is not a valid transformation.`; }
  else if (ambiguous) { outcome = "ambiguous"; summary = "A line can be read in more than one way."; }
  else if (unsupported) { outcome = "unsupported"; summary = unitMissing ? "A unit is missing, so a value could not be checked." : "A line could not be checked exactly; no claim is made about the working."; }
  else if (!lines.length) { outcome = "incomplete"; summary = "No working was given."; }
  else if (P.kind === "equation") { outcome = "verified"; summary = "Every line keeps the problem's solution."; fin = { ...fin, form: "ok", detail: "" }; }
  else {
    const fc = last ? checkForm(last, form) : { ok: false, detail: "" };
    if (fc.ok) { outcome = "verified"; fin = { ...fin, form: "ok" }; summary = "Every step is a valid transformation and the working reaches a finished answer."; }
    else { outcome = "incomplete"; fin = { ...fin, form: /not finished/.test(fc.detail) ? "not-final" : "not-requested-form", detail: fc.detail }; summary = `Every step so far is valid, but ${fc.detail}.`; }
  }
  return { outcome, correct: outcome === "verified" ? true : outcome === "invalid" ? false : null, firstInvalidStep: firstInvalid, steps, errors, final: fin, skills, summary: summary + skillNote };
}

/** One transformation, in the context of the problem: does `to` follow from `from`? */
export function verifyNumberStep(problemText: string, from: string, to: string): { outcome: "verified" | "invalid" | "unsupported"; correct: true | false | null; detail: string; errors: ErrorCandidate[] } {
  const P = readProblem(problemText); if (!P) return { outcome: "unsupported", correct: null, detail: "not an exact-number problem", errors: [] };
  const a = tryParse(from), b = tryParse(to);
  if ("err" in a || "err" in b) return { outcome: "unsupported", correct: null, detail: "a line cannot be read", errors: [] };
  try {
    if (P.kind === "equation") { const ok = solEq(chainSol(a.sides), chainSol(b.sides)); return { outcome: ok ? "verified" : "invalid", correct: ok, detail: ok ? "same solution" : "different solution", errors: [] }; }
    const r = relateValues(lastSide(a), b.sides[0]); if (r.fail) throw r.fail;
    if (r.ok) return { outcome: "verified", correct: true, detail: "equal in value", errors: [] };
    return { outcome: "invalid", correct: false, detail: "not equal in value", errors: explainMismatch(lastSide(a), evaluate(b.sides[0]), b.sides[0]) };
  } catch (e) { if (e instanceof Fail) return e.kind === "unsupported" ? { outcome: "unsupported", correct: null, detail: e.message, errors: [] } : { outcome: "invalid", correct: false, detail: e.message, errors: [] }; throw e; }
}
