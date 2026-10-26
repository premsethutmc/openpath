/**
 * Symbolic-algebra working assessor: polynomial and rational expressions in one variable (expand, collect, factorise, simplify, rational
 * simplification). A line is judged by EXACT identity with the previous line as a function on the shared domain (no templates, no sampling,
 * no floats), so multi-operation steps and alternative methods are accepted. All mathematics is the independent verifier's
 * (parser, rational-function builder, restriction extraction, factorisation); this file only sequences it over a student's lines.
 * Four judgements are kept apart: correctness (every step an identity), required skills shown, final-form compliance, domain obligations.
 * It decides nothing about marking: the result is advisory evidence for an educator.
 */
import * as V from "../reasoner/verifier/verifier.ts";
import { Refusal } from "../reasoner/outcomes.ts";
import { Rational } from "../math-kernel.ts";
import { parseExpr, printExpr } from "../reasoner/expr-text.ts";
import { normalizeLine } from "./student.ts";
import { nameExpressionErrors } from "./expression-errors.ts";

export type SymForm = "any" | "expanded" | "collected" | "factorised" | "simplest" | "lowest-terms";
export const SYM_SKILLS = {
  "expand-brackets": "multiplying out brackets", "collect-like-terms": "collecting like terms", "common-factor": "taking out a common factor",
  "difference-of-squares": "factorising a difference of two squares", "perfect-square": "recognising a perfect square", factorise: "factorising into brackets",
  "cancel-common-factor": "cancelling a common factor", "index-laws": "using the laws of indices", "common-denominator": "combining fractions over a common denominator",
} as const;
export type SymSkillId = keyof typeof SYM_SKILLS;
export interface SymbolicOptions { form?: SymForm; requiredSkills?: SymSkillId[]; /** when true, a final line that loses a restriction of the problem without stating it is "incomplete" */ requireDomain?: boolean }
export type SymStepStatus = "valid" | "valid-with-obligation" | "no-change" | "invalid" | "unsupported" | "ambiguous";
export type Relation = "identity" | "at-values" | "never";
export interface SymCause { id: string; label: string; explanation: string; detail: string }
export interface SymStep { index: number; from: string; to: string; status: SymStepStatus; relation: Relation | null; explanation: string; errors: SymCause[] }
export interface DomainReport { lost: string[]; irrationalLost: boolean; stated: string[]; missing: string[]; status: "preserved" | "stated" | "missing" | "n/a" }
export interface SymbolicAssessment {
  outcome: "verified" | "invalid" | "ambiguous" | "unsupported" | "incomplete"; correct: true | false | null; firstInvalidStep: number | null;
  steps: SymStep[]; errors: SymCause[];
  final: { value: string; form: "ok" | "not-requested-form" | "n/a"; detail: string };
  skills: { required: SymSkillId[]; demonstrated: SymSkillId[]; missing: SymSkillId[]; status: "demonstrated" | "not-demonstrated" | "n/a" };
  domain: DomainReport; summary: string;
}

// ---------- reading the problem and the lines ----------
const VERBS: [RegExp, SymForm][] = [[/^\s*expand(?: and simplify)?\b/i, "expanded"], [/^\s*(?:factori[sz]e|factor)(?: completely|fully)?\b/i, "factorised"], [/^\s*simplify\b/i, "simplest"], [/^\s*collect(?: like terms)?\b|^\s*(?:combine|group) like terms\b/i, "collected"], [/^\s*(?:write|express|reduce)\b.*\blowest terms\b/i, "lowest-terms"]];
const MULTI = /[a-zA-Z]{2,}/;
interface Problem { text: string; v: string; form: SymForm }
/** Read "Expand (x+1)(x+2)", "Simplify (x^2-1)/(x-1)", or a bare one-variable expression. Anything with an equals sign or words is not read. */
export function readSymbolicProblem(raw: string): Problem | null {
  let t = raw.trim().replace(/[.?:]\s*$/, ""); let form: SymForm = "any";
  for (const [re, f] of VERBS) if (re.test(t)) { form = f; t = t.replace(re, "").replace(/^\s*[:,-]?\s*/, "").replace(/^(?:the\s+)?(?:expression\s+)?/i, "").replace(/^\s*[:,]\s*/, "").replace(/^(?:completely|fully)\s*/i, "").replace(/\s+(?:completely|fully)\s*$/i, ""); break; }
  if (/=|[<>≠≤≥]/.test(t) || MULTI.test(t.replace(/\b\d*e\d+\b/gi, ""))) return null;
  const letters = new Set(t.match(/[a-zA-Z]/g) ?? []); if (letters.size !== 1) return null;
  const v = [...letters][0]; if (!/[\dx\w]/.test(t)) return null;
  try { V.parseSide(normalizeLine(renameVar(t, v), false)); } catch { return null; }
  return { text: t, v, form };
}
export const isSymbolicProblem = (raw: string): boolean => readSymbolicProblem(raw) !== null;
const renameVar = (s: string, v: string) => (v === "x" ? s : s.replace(new RegExp(`(?<![a-zA-Z])${v}(?![a-zA-Z])`, "g"), "x"));
const parseRat = (s: string): Rational | null => { const m = /^(-?)(\d+)(?:\.(\d+))?(?:\/(\d+))?$/.exec(s.replace(/\s+/g, "")); if (!m) return null; const frac = m[3] ?? ""; let r = new Rational(BigInt(m[2] + frac), 10n ** BigInt(frac.length)); if (m[4]) { if (BigInt(m[4]) === 0n) return null; r = r.div(new Rational(BigInt(m[4]))); } return m[1] ? r.neg() : r; };
const RESTRICTION = /(?:[,;(]|\band\b|\bfor\b|\bwhere\b|\bwhen\b|\bprovided\b|\bif\b|\bwith\b)?\s*x\s*(?:≠|!=|=\/=)\s*(-?[\d./]+)\s*\)?/g;
interface Line { expr: string; text: string; stated: Rational[]; ambiguous: boolean }
function readLine(raw: string, v: string): Line | { err: string } {
  if (MULTI.test(raw.replace(/\b(?:and|for|where|when|provided|if|with)\b/gi, " "))) return { err: "contains a symbol or word that is not a single variable" };
  const letters = new Set((raw.replace(/\b(?:and|for|where|when|provided|if|with)\b/gi, " ").match(/[a-zA-Z]/g) ?? [])); if (letters.size > 1 || (letters.size === 1 && !letters.has(v))) return { err: `uses a different variable from the problem (${v})` };
  const s0 = renameVar(raw, v); const stated: Rational[] = []; const rest = s0.replace(RESTRICTION, (_m, n) => { const r = parseRat(n); if (r) stated.push(r); return " "; }).replace(/^[\s,;]+|[\s,;]+$/g, "");
  const g = rest.replace(/[−–—]/g, "-").replace(/[÷∕⁄]/g, "/").replace(/\s+/g, ""); const ambiguous = /\/\d+(?:\.\d+)?[x(]/.test(g);
  return { expr: rest, text: rest ? normalizeLine(rest, false) : "", stated, ambiguous };
}
const uniq = (xs: Rational[]) => [...new Map(xs.map((r) => [r.toString(), r] as const)).values()].sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0));
const showRats = (xs: Rational[]) => xs.map((r) => r.toString());
const where = (a?: V.Sol): string => (!a ? "" : a.kind === "all" ? "everywhere" : [...a.rats.map((r) => `x = ${r}`), ...(a.irr.length > 1 ? ["some irrational x"] : [])].join(", ") || "nowhere");

// ---------- the one relation ----------
export interface SymRelation { relation: Relation; dropped: Rational[]; droppedIrrational: boolean; added: Rational[]; addedIrrational: boolean; agreeAt?: V.Sol }
/** How does `to` relate to `from` as an expression? identity = equal wherever both are defined; at-values = equal only at particular x; never. Domain differences are reported, not hidden. */
export function relateSymbolic(from: string, to: string): SymRelation {
  const r = V.relateExpressions(normalizeLine(from, false), normalizeLine(to, false));
  return { relation: r.kind === "identical" ? "identity" : r.kind === "conditional" ? "at-values" : "never", dropped: r.dropped.rats, droppedIrrational: r.dropped.irrational, added: r.added.rats, addedIrrational: r.added.irrational, agreeAt: r.agreeAt };
}
const guard = <T,>(f: () => T): T | { refusal: string } => { try { return f(); } catch (e) { if (e instanceof Refusal) return { refusal: `${e.code}: ${e.message}` }; throw e; } };
function nameCauses(fromText: string, toText: string): SymCause[] {
  let from; try { from = parseExpr(fromText); } catch { return []; }
  return nameExpressionErrors(from, (c) => { try { const k = V.relateExpressions(printExpr(c), toText).kind; return k === "identical"; } catch { return false; } });
}

// ---------- skills (structural, read off the lines; independent of correctness) ----------
const flat = (n: V.N, op: "*"): V.N[] => (n.t === "bin" && n.op === op ? [...flat(n.a, op), ...flat(n.b, op)] : [n]);
const isSumN = (n: V.N): boolean => n.t === "bin" && (n.op === "+" || n.op === "-");
const nTerms = (n: V.N): number => (n.t === "bin" && (n.op === "+" || n.op === "-") ? nTerms(n.a) + nTerms(n.b) : 1);
const hasXN = (n: V.N): boolean => n.t === "x" || (n.t === "neg" ? hasXN(n.a) : n.t === "bin" ? hasXN(n.a) || hasXN(n.b) : n.t === "pow" ? hasXN(n.a) || hasXN(n.e) : false);
const xDivs = (n: V.N): number => (n.t === "neg" ? xDivs(n.a) : n.t === "bin" ? xDivs(n.a) + xDivs(n.b) + (n.op === "/" && hasXN(n.b) ? 1 : 0) : n.t === "pow" ? xDivs(n.a) : 0);
const strip = (n: V.N): V.N => (n.t === "neg" ? strip(n.a) : n);
const hasBracketProduct = (n: V.N): boolean => (n.t === "neg" ? hasBracketProduct(n.a) : n.t === "pow" ? isSumN(strip(n.a)) || hasBracketProduct(n.a) : n.t === "bin" ? (n.op === "*" && (isSumN(strip(n.a)) || isSumN(strip(n.b)))) || hasBracketProduct(n.a) || hasBracketProduct(n.b) : false);
const sameTree = (a: V.N, b: V.N) => JSON.stringify(a, (_k, v) => (typeof v === "bigint" || v instanceof Rational ? v.toString() : v)) === JSON.stringify(b, (_k, v) => (typeof v === "bigint" || v instanceof Rational ? v.toString() : v));
function skillsOfStep(prev: string, cur: string): Set<SymSkillId> {
  const out = new Set<SymSkillId>(); let a: V.N, b: V.N, fa: V.FormFacts, fb: V.FormFacts;
  try { a = V.parseSide(prev); b = V.parseSide(cur); fa = V.formFacts(prev); fb = V.formFacts(cur); } catch { return out; }
  if (sameTree(a, b)) return out;
  if (hasBracketProduct(a) && !hasBracketProduct(b) && fb.expandedShape) out.add("expand-brackets");
  if (fa.expandedShape && !fa.collected && fb.expandedShape && fb.collected) out.add("collect-like-terms");
  const fs = flat(strip(b), "*");
  const pieces = (n: V.N): V.N[] => (n.t === "bin" && n.op === "/" ? [n.a, n.b] : [n]);
  if (pieces(a).some((pa) => isSumN(strip(pa))) && pieces(b).some((pb) => { const q = flat(strip(pb), "*"); return q.length >= 2 && q.some((f) => isSumN(strip(f))); }) && !pieces(a).some((pa) => pieces(b).some((pb) => sameTree(pa, pb) && flat(strip(pb), "*").length >= 2))) out.add("factorise");
  if (isSumN(strip(a)) && fs.length >= 2 && fs.some((f) => isSumN(strip(f)))) {
    if (fs.length === 2 && fs.filter((f) => isSumN(strip(f))).length === 1) out.add("common-factor");
    const sums = fs.filter((f) => isSumN(strip(f)));
    if (sums.length >= 2) { const pa = V.analyseExpression(prev).f.n; if (pa.length === 3 && pa[1].isZero() && !pa[0].isZero() && pa[0].mul(pa[2]).lt(Rational.zero)) out.add("difference-of-squares"); if (sums.length === 2 && sameTree(strip(sums[0]), strip(sums[1]))) out.add("perfect-square"); }
  }
  if (b.t === "pow" && isSumN(strip(b.a)) && (isSumN(a) || hasBracketProduct(a))) out.add("perfect-square");
  if (fa.rational && !fa.lowestTerms && fb.lowestTerms) out.add("cancel-common-factor");
  if (!fa.powersCombined && fb.powersCombined) out.add("index-laws");
  if (xDivs(a) >= 2 && xDivs(b) < xDivs(a)) out.add("common-denominator");
  return out;
}

// ---------- the form the final line must have ----------
function formCheck(text: string, form: SymForm): { ok: boolean; detail: string } {
  if (form === "any") return { ok: true, detail: "" };
  let f: V.FormFacts; try { f = V.formFacts(text); } catch { return { ok: false, detail: "the last line cannot be checked for the requested form" }; }
  const bad = (d: string) => ({ ok: false, detail: d });
  switch (form) {
    case "expanded": return !f.expandedShape ? bad("the last line still has brackets to multiply out") : !f.collected ? bad("like terms in the last line are not collected") : { ok: true, detail: "" };
    case "collected": return !f.expandedShape ? bad("the last line still has brackets to multiply out") : !f.collected ? bad("like terms in the last line are not collected") : { ok: true, detail: "" };
    case "factorised": return f.factorisedCompletely ? { ok: true, detail: "" } : bad("the last line is not fully factorised (a factor can still be split, or it is still a sum)");
    case "lowest-terms": return f.lowestTerms ? { ok: true, detail: "" } : bad("the fraction is not in lowest terms");
    case "simplest": return !f.lowestTerms ? bad("the fraction is not in lowest terms") : !f.powersCombined ? bad("powers of the same base are not combined") : !(f.factorisedCompletely || (f.expandedShape && f.collected) || f.rational) ? bad("the last line is not simplified (like terms or brackets remain)") : { ok: true, detail: "" };
  }
}

// ---------- whole working ----------
export function assessSymbolicWorking(problemText: string, lines: string[], opts: SymbolicOptions = {}): SymbolicAssessment {
  const sk = opts.requiredSkills ?? [];
  const mk = (o: Partial<SymbolicAssessment>): SymbolicAssessment => ({ outcome: "unsupported", correct: null, firstInvalidStep: null, steps: [], errors: [], final: { value: "", form: "n/a", detail: "" }, skills: { required: sk, demonstrated: [], missing: sk, status: sk.length ? "not-demonstrated" : "n/a" }, domain: { lost: [], irrationalLost: false, stated: [], missing: [], status: "n/a" }, summary: "", ...o });
  const P = readSymbolicProblem(problemText); if (!P) return mk({ summary: "the problem is not a one-variable expression this engine can read" });
  const form = opts.form ?? P.form; const probText = normalizeLine(renameVar(P.text, P.v), false);
  const pa = guard(() => V.analyseExpression(probText)); if ("refusal" in pa) return mk({ summary: `the problem cannot be analysed exactly (${pa.refusal})` });
  const steps: SymStep[] = []; let firstInvalid: number | null = null; let errors: SymCause[] = [];
  let prevText = probText, prevShow = problemText, prevOk = true; let lastMain: Line | null = null; let unsupported = 0, ambiguous = 0;
  const shown = new Set<SymSkillId>(); const stated: Rational[] = []; const lostSoFar: { at: number; r: Rational[] }[] = [];
  lines.forEach((raw, k) => {
    const i = k + 1; const push = (status: SymStepStatus, explanation: string, relation: Relation | null = null, errs: SymCause[] = []) => { steps.push({ index: i, from: prevShow, to: raw, status, relation, explanation, errors: errs }); if (status === "invalid" && firstInvalid === null) { firstInvalid = i; errors = errs; } if (status === "unsupported") unsupported++; if (status === "ambiguous") ambiguous++; };
    const L = readLine(raw, P.v);
    if ("err" in L) { push("unsupported", `this line cannot be read as one-variable algebra (${L.err})`); prevOk = false; return; }
    stated.push(...L.stated);
    if (!L.text) { push(L.stated.length ? "valid" : "unsupported", L.stated.length ? `states a restriction (x ≠ ${showRats(L.stated).join(", ")}); it does not change the working` : "an empty line"); return; }
    if (L.ambiguous) { push("ambiguous", "this line can be read in more than one way (a number divided before x or a bracket); use brackets to show which is meant"); prevOk = false; return; }
    const parts = L.text.split("="); const sides = parts.map((p) => p.trim());
    if (sides.some((s) => !s)) { push("unsupported", "an equals sign without an expression on both sides"); prevOk = false; return; }
    const ref = prevOk ? prevText : probText;
    // each side is compared with its neighbour (a chain A = B = C claims every equality), the first side with the previous line
    const pairs: [string, string][] = [[ref, sides[0]], ...sides.slice(0, -1).map((s, j) => [s, sides[j + 1]] as [string, string])];
    let worst: { rel: SymRelation; a: string; b: string } | null = null; let widened: Rational[] = []; let irrW = false; let narrowed: { r: Rational[]; irr: boolean } | null = null;
    for (const [a, b] of pairs) {
      const rel = guard(() => relateSymbolic(a, b));
      if ("refusal" in rel) { push("unsupported", `cannot be checked exactly (${rel.refusal})`); prevOk = false; prevText = sides[sides.length - 1]; prevShow = raw; return; }
      if (rel.relation !== "identity") { worst = { rel, a, b }; break; }
      widened = widened.concat(rel.dropped); irrW ||= rel.droppedIrrational; if (rel.added.length || rel.addedIrrational) narrowed = { r: rel.added, irr: rel.addedIrrational };
    }
    const last = sides[sides.length - 1];
    if (worst) {
      const w = worst.rel; const cl = worst.a === ref ? "the previous line" : worst.a;
      const errs = w.relation === "at-values" || w.relation === "never" ? nameCauses(worst.a, worst.b) : [];
      push("invalid", w.relation === "at-values" ? `not an identity: ${worst.b} equals ${cl} only at ${where(w.agreeAt)} (true for particular values of x, not for all x)` : `not equal to ${cl} for any x`, w.relation, errs);
      prevText = last; prevShow = raw; prevOk = false; return;
    }
    if (narrowed) { push("invalid", `this line is undefined${narrowed.r.length ? ` at x = ${showRats(narrowed.r).join(", ")}` : " at some values"} where the previous line was defined: it adds a restriction the expression did not have`, "identity"); prevText = last; prevShow = raw; prevOk = false; return; }
    for (const s of skillsOfStep(ref, sides[0])) shown.add(s); for (let j = 0; j + 1 < sides.length; j++) for (const s of skillsOfStep(sides[j], sides[j + 1])) shown.add(s);
    const unstated = uniq(widened).filter((r) => !L.stated.some((u) => u.eq(r)) && !stated.some((u) => u.eq(r)));
    const same = prevOk && sides.length === 1 && V.parseSide(sides[0]) && sameTree(V.parseSide(ref), V.parseSide(sides[0]));
    if (widened.length || irrW) lostSoFar.push({ at: i, r: uniq(widened) });
    if (unstated.length || irrW) push("valid-with-obligation", `equal to the previous line wherever both are defined; the previous line is not defined at x = ${showRats(unstated).join(", ")}${irrW ? " (and at some irrational values)" : ""}, so that restriction should be kept`, "identity");
    else push(same ? "no-change" : "valid", "an identity with the previous line (exact algebra)", "identity");
    prevText = last; prevShow = raw; prevOk = true; lastMain = { ...L, text: last };
  });
  const required = sk; const dem = required.filter((s) => shown.has(s)); const miss = required.filter((s) => !shown.has(s));
  const skills = { required, demonstrated: dem, missing: miss, status: (required.length ? (miss.length ? "not-demonstrated" : "demonstrated") : "n/a") as "demonstrated" | "not-demonstrated" | "n/a" };
  const skillNote = skills.status === "not-demonstrated" ? ` The working does not show: ${miss.map((m) => SYM_SKILLS[m]).join("; ")}.` : "";
  // domain: what the final line lost relative to the problem, and what the student has stated
  let domain: DomainReport = { lost: [], irrationalLost: false, stated: showRats(uniq(stated)), missing: [], status: "n/a" };
  const lm = lastMain as Line | null;
  if (lm && !firstInvalid) { const net = guard(() => V.relateExpressions(probText, lm.text)); if (!("refusal" in net)) { const lost = uniq(net.dropped.rats); const miss2 = lost.filter((r) => !stated.some((u) => u.eq(r))); domain = { lost: showRats(lost), irrationalLost: net.dropped.irrational, stated: showRats(uniq(stated)), missing: showRats(miss2), status: !lost.length && !net.dropped.irrational ? "preserved" : miss2.length || net.dropped.irrational ? "missing" : "stated" }; } }
  const domNote = domain.status === "missing" ? ` The final line is defined at x = ${domain.missing.join(", ")}${domain.irrationalLost ? " and at some irrational values" : ""} where the problem was not; that restriction is not stated.` : "";
  let outcome: SymbolicAssessment["outcome"]; let summary: string; let fin: SymbolicAssessment["final"] = { value: lm ? lm.expr : "", form: "n/a", detail: "" };
  if (firstInvalid !== null) { outcome = "invalid"; summary = `Step ${firstInvalid} is not a valid transformation.`; }
  else if (ambiguous) { outcome = "ambiguous"; summary = "A line can be read in more than one way."; }
  else if (unsupported) { outcome = "unsupported"; summary = "A line could not be checked exactly; no claim is made about the working."; }
  else if (!lines.length || !lm) { outcome = "incomplete"; summary = "No working was given."; }
  else { const fc = formCheck(lm.text, form); if (fc.ok) { outcome = "verified"; fin = { ...fin, form: "ok" }; summary = "Every step is an identity with the one before it and the working reaches the requested form."; } else { outcome = "incomplete"; fin = { ...fin, form: "not-requested-form", detail: fc.detail }; summary = `Every step so far is valid, but ${fc.detail}.`; } }
  if (outcome === "verified" && opts.requireDomain && domain.status === "missing") { outcome = "incomplete"; summary = "Every step is valid, but a restriction of the problem is lost and not stated."; }
  return { outcome, correct: outcome === "verified" ? true : outcome === "invalid" ? false : null, firstInvalidStep: firstInvalid, steps, errors, final: fin, skills, domain, summary: summary + skillNote + domNote };
}

/** One transformation in the context of the problem: is `to` an identity with `from`? */
export function verifySymbolicStep(problemText: string, from: string, to: string): { outcome: "verified" | "invalid" | "unsupported"; correct: true | false | null; effect: "equivalence" | "implication" | "invalid"; relation: Relation | null; detail: string; errors: SymCause[] } {
  const P = readSymbolicProblem(problemText); const no = (detail: string) => ({ outcome: "unsupported" as const, correct: null, effect: "invalid" as const, relation: null, detail, errors: [] });
  if (!P) return no("not a one-variable expression problem");
  const A = readLine(from, P.v), B = readLine(to, P.v); if ("err" in A || "err" in B || !A.text || !B.text) return no("a line cannot be read as one-variable algebra");
  const r = guard(() => relateSymbolic(A.text.split("=").pop()!.trim(), B.text.split("=")[0].trim())); if ("refusal" in r) return no(`cannot be checked exactly (${r.refusal})`);
  if (r.relation !== "identity") return { outcome: "invalid", correct: false, effect: "invalid", relation: r.relation, detail: r.relation === "at-values" ? `equal only at ${where(r.agreeAt)}, not an identity` : "not equal for any x", errors: nameCauses(A.text.split("=").pop()!.trim(), B.text.split("=")[0].trim()) };
  if (r.added.length || r.addedIrrational) return { outcome: "invalid", correct: false, effect: "invalid", relation: "identity", detail: "adds a restriction the previous line did not have", errors: [] };
  const w = r.dropped.length || r.droppedIrrational;
  return { outcome: "verified", correct: true, effect: w ? "implication" : "equivalence", relation: "identity", detail: w ? `identity, but the previous line is undefined at x = ${showRats(r.dropped).join(", ")}${r.droppedIrrational ? " and some irrational values" : ""}: keep that restriction` : "identity on the same domain", errors: [] };
}
