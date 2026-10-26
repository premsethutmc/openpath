/**
 * Multivariate / parameter symbolic assessor. Same contract as core/symbolic.ts (identity with the previous line, first invalid step, cause naming,
 * correctness / skills / final form / domain kept apart, advisory only) for expressions in any number of letters, including symbolic exponents.
 * Mathematics: exact rational functions over Q (poly.ts, expr.ts). Identity is decided exactly; a non-identity is claimed only from an exact witness
 * point; otherwise the line is `unsupported` (never a guess).
 */
import { Rational, type MathExpr } from "../../math-kernel.ts";
import { Refusal } from "../../reasoner/outcomes.ts";
import { printExpr } from "../../reasoner/expr-text.ts";
import * as T from "../tactics.ts";
import { Poly, gcd, divExact, radical, extra, normalise, irreducibleCert } from "./poly.ts";
import { build, parseMv, relateMv, domainPoly, lost, type MvRelation } from "./expr.ts";
import { nameExpressionErrors } from "../expression-errors.ts";
import { SYM_SKILLS, type SymForm, type SymSkillId, type SymCause, type SymStepStatus } from "../symbolic.ts";

export interface MvOptions { form?: SymForm; requiredSkills?: SymSkillId[]; requireDomain?: boolean }
export type MvRelationKind = "identity" | "not-identity" | "undecided";
export interface MvStep { index: number; from: string; to: string; status: SymStepStatus; relation: MvRelationKind | null; explanation: string; errors: SymCause[]; agreesAt?: Record<string, string> }
export interface MvDomain { original: string[]; lost: string[]; stated: string[]; implied: string[]; missing: string[]; narrowed: string[]; status: "preserved" | "stated" | "missing" | "narrowed" | "n/a" }
export interface MvAssessment {
  outcome: "verified" | "invalid" | "ambiguous" | "unsupported" | "incomplete"; correct: true | false | null; firstInvalidStep: number | null;
  steps: MvStep[]; errors: SymCause[];
  final: { value: string; form: "ok" | "not-requested-form" | "undecided" | "n/a"; detail: string };
  skills: { required: SymSkillId[]; demonstrated: SymSkillId[]; missing: SymSkillId[]; status: "demonstrated" | "not-demonstrated" | "n/a" };
  domain: MvDomain; assumptions: string[]; variables: string[]; summary: string;
}

// ---------- reading ----------
const VERBS: [RegExp, SymForm][] = [[/^\s*expand(?: and simplify)?\b/i, "expanded"], [/^\s*(?:factori[sz]e|factor)(?: completely|fully)?\b/i, "factorised"], [/^\s*simplify\b/i, "simplest"], [/^\s*collect(?: like terms)?\b|^\s*(?:combine|group) like terms\b/i, "collected"], [/^\s*(?:write|express|reduce)\b.*\blowest terms\b/i, "lowest-terms"]];
const FILLER = /\b(?:and|for|where|when|provided|if|with)\b/gi;
const letters = (s: string) => new Set(s.match(/[a-zA-Z]/g) ?? []);
export interface MvProblem { text: string; form: SymForm; vars: string[] }
/** "Expand (x+y)^2", "Simplify (a^2-b^2)/(a-b)", "Simplify x^n*x^m": two or more letters, or one letter with a symbolic exponent (other single-letter problems belong to the one-variable engine) */
export function readMvProblem(raw: string): MvProblem | null {
  let t = raw.trim().replace(/[.?:]\s*$/, ""); let form: SymForm = "any";
  for (const [re, f] of VERBS) if (re.test(t)) { form = f; t = t.replace(re, "").replace(/^\s*[:,-]?\s*/, "").replace(/^(?:the\s+)?(?:expression\s+)?/i, "").replace(/^(?:completely|fully)\s*/i, "").replace(/\s+(?:completely|fully)\s*$/i, ""); break; }
  if (/=|[<>≤≥≠]/.test(t) || /\b[a-zA-Z]{4,}\b/.test(t)) return null;
  const L = letters(t); if (L.size < 1) return null;
  try { const b = build(parseMv(t)); if (L.size < 2 && b.expSyms.size === 0) return null; } catch (e) { if (e instanceof Refusal) return null; throw e; }
  return { text: t, form, vars: [...L].sort() };
}
export const isMvProblem = (raw: string): boolean => readMvProblem(raw) !== null;
interface Stated { text: string; q: Poly }
interface Line { expr: string; text: string; stated: Stated[]; ambiguous: boolean }
const splitTop = (s: string): string[] => { const out: string[] = []; let d = 0, cur = ""; for (const ch of s) { if (ch === "(") d++; if (ch === ")") d--; if (d === 0 && (ch === "," || ch === ";")) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
function readLine(raw: string, allowed: Set<string>): Line | { err: string } {
  const body = raw.replace(FILLER, ",");
  if (/[a-zA-Z]{4,}/.test(body)) return { err: "contains a word, not algebra" };
  const segs = splitTop(body).map((x) => x.trim()).filter(Boolean); const stated: Stated[] = []; const exprs: string[] = [];
  for (const sg of segs) {
    const m = /^\(?\s*(.+?)\s*(?:≠|!=|=\/=)\s*(.+?)\s*\)?$/.exec(sg);
    if (m) { try { const a = build(parseMv(m[1])), b = build(parseMv(m[2])); const q = normalise(a.rf.n.mul(b.rf.d).sub(b.rf.n.mul(a.rf.d))); stated.push({ text: `${m[1].trim()} ≠ ${m[2].trim()}`, q }); } catch (e) { if (e instanceof Refusal) return { err: `a restriction cannot be read (${e.message})` }; throw e; } }
    else exprs.push(sg);
  }
  if (exprs.length > 1) return { err: "more than one expression on a line" };
  const expr = exprs[0] ?? ""; const L = letters(expr); for (const c of L) if (!allowed.has(c)) return { err: `uses a letter that is not in the problem (${c})` };
  return { expr, text: expr, stated, ambiguous: ambiguousText(expr) };
}
const ambiguousText = (expr: string): boolean => { const g = expr.replace(/[−–—]/g, "-").replace(/[÷∕⁄]/g, "/").replace(/\s+/g, ""); return /\/\d+(?:\.\d+)?[a-zA-Z(]/.test(g) || /[a-zA-Z0-9)]\/[a-zA-Z]\(|\/[a-zA-Z][a-zA-Z]/.test(g); };
const guard = <T,>(f: () => T): T | { refusal: string } => { try { return f(); } catch (e) { if (e instanceof Refusal) return { refusal: `${e.code}: ${e.message}` }; throw e; } };
const ptText = (o?: Record<string, string>) => (o ? Object.entries(o).map(([k, v]) => `${k} = ${v}`).join(", ") : "");
const rest = (e: MathExpr, f: (x: MathExpr) => boolean): boolean => f(e) || (e.kind === "add" || e.kind === "sub" || e.kind === "mul" || e.kind === "div" ? rest(e.left, f) || rest(e.right, f) : e.kind === "neg" ? rest(e.operand, f) : e.kind === "pow" ? rest(e.base, f) || rest(e.exp, f) : false);

// ---------- structure ----------
const isSum = (e: MathExpr): boolean => e.kind === "add" || e.kind === "sub" || (e.kind === "neg" && isSum(e.operand));
const strip = (e: MathExpr): MathExpr => (e.kind === "neg" ? strip(e.operand) : e);
const flatMul = (e: MathExpr): MathExpr[] => (e.kind === "mul" ? [...flatMul(e.left), ...flatMul(e.right)] : [e]);
const hasBracketProduct = (e: MathExpr): boolean => rest(e, (x) => (x.kind === "mul" && (isSum(x.left) || isSum(x.right))) || (x.kind === "pow" && isSum(x.base)));
const divCount = (e: MathExpr): number => (e.kind === "div" ? 1 + divCount(e.left) + divCount(e.right) : e.kind === "add" || e.kind === "sub" || e.kind === "mul" ? divCount(e.left) + divCount(e.right) : e.kind === "neg" ? divCount(e.operand) : e.kind === "pow" ? divCount(e.base) : 0);
const poly = (e: MathExpr): { n: Poly; ok: boolean } => { const r = build(e).rf; return { n: r.n, ok: r.d.isConst() }; };
const key = (e: MathExpr): string => { try { const r = build(e).rf; if (r.d.isConst()) return normalise(r.n).toString(); } catch { /* fall through */ } return printExpr(e); };
const sqRat = (c: Rational): boolean => { const f = (n: bigint) => { const x = BigInt(Math.round(Math.sqrt(Number(n < 0n ? -n : n)))); return x * x === (n < 0n ? -n : n); }; return f(c.numBig) && f(c.denBig); };
export interface MvFacts { expandedShape: boolean; collected: boolean; factorisedCompletely: boolean | null; lowestTerms: boolean; powersCombined: boolean; rational: boolean }
export function mvFacts(e: MathExpr): MvFacts {
  const terms = T.terms(e); const mons = terms.map((t) => { const r = build(t.t).rf; return r.d.isConst() && r.n.t.size === 1 ? [...r.n.t.keys()][0] : null; });
  const expandedShape = mons.every((m) => m !== null); const collected = expandedShape && new Set(mons).size === mons.length;
  let powersCombined = true;
  const walk = (x: MathExpr) => {
    if (x.kind === "mul") { const fs = flatMul(x).map((f) => (f.kind === "pow" ? f.base : f)).filter((f) => f.kind !== "num"); const ks = fs.map(key); if (new Set(ks).size !== ks.length) powersCombined = false; }
    if (x.kind === "pow" && (x.base.kind === "pow" || (x.base.kind === "mul" && flatMul(x.base).filter((f) => f.kind !== "num").length >= 1 && flatMul(x.base).length >= 2))) powersCombined = false;
    if (x.kind === "add" || x.kind === "sub" || x.kind === "mul" || x.kind === "div") { walk(x.left); walk(x.right); } else if (x.kind === "neg") walk(x.operand); else if (x.kind === "pow") { walk(x.base); walk(x.exp); }
  };
  walk(e);
  const tl = strip(e); let lowestTerms = true;
  if (divCount(e) > 0) { if (tl.kind === "div" && divCount(tl.left) === 0 && divCount(tl.right) === 0) { const a = poly(tl.left), b = poly(tl.right); lowestTerms = a.ok && b.ok && gcd(a.n, b.n).isConst(); } else lowestTerms = false; }
  const rational = rest(e, (x) => x.kind === "div" && !build(x.right).rf.n.isConst());
  let fact: boolean | null = true;
  if (rational) fact = false; else { let nonConst = 0;
    for (const f of flatMul(strip(e))) { const b = f.kind === "pow" ? f.base : f; if (b.kind === "num") continue; nonConst++; const r = build(b).rf; if (!r.d.isConst()) { fact = false; break; }
      const p = r.n; if (p.t.size === 1) { if (p.totalDeg() !== 1 || !p.constVal().isOne() && !p.t.values().next().value!.c.isOne()) { fact = false; break; } continue; }
      const prim = [...p.t.values()].every((t) => t.c.isInteger()) && normalise(p).eq(p) || normalise(p).eq(p.neg());
      if (!prim) { fact = false; break; } const c = irreducibleCert(p); if (c === false) { fact = false; break; } if (c === null) fact = null; }
    if (nonConst === 0) fact = false; }
  return { expandedShape, collected, factorisedCompletely: fact, lowestTerms, powersCombined, rational };
}
function skillsOfStep(pe: MathExpr, ce: MathExpr): Set<SymSkillId> {
  const out = new Set<SymSkillId>(); let fa: MvFacts, fb: MvFacts; try { fa = mvFacts(pe); fb = mvFacts(ce); } catch { return out; }
  if (printExpr(pe) === printExpr(ce)) return out;
  if (hasBracketProduct(pe) && !hasBracketProduct(ce) && fb.expandedShape) out.add("expand-brackets");
  if (fa.expandedShape && !fa.collected && fb.expandedShape && fb.collected) out.add("collect-like-terms");
  const pieces = (x: MathExpr): MathExpr[] => (x.kind === "div" ? [x.left, x.right] : [x]); const sumFactors = (x: MathExpr) => flatMul(strip(x)).filter((f) => isSum(f) || (f.kind === "pow" && isSum(f.base)));
  const fs = flatMul(strip(ce));
  if (pieces(pe).some((p) => isSum(p)) && pieces(ce).some((p) => flatMul(strip(p)).length >= 2 && sumFactors(p).length >= 1) && !pieces(pe).some((p) => pieces(ce).some((q) => printExpr(p) === printExpr(q) && flatMul(strip(q)).length >= 2))) out.add("factorise");
  if (isSum(pe) && fs.length >= 2 && sumFactors(ce).length >= 1) {
    if (fs.length >= 2 && fs.filter((f) => isSum(f)).length === 1) out.add("common-factor");
    const sums = fs.filter((f) => isSum(f)); const pp = poly(pe).n;
    if (sums.length >= 2 && T.terms(pe).length === 2 && pp.t.size === 2) { const ts = [...pp.t.values()]; if (ts[0].c.mul(ts[1].c).lt(Rational.zero) && ts.every((t) => sqRat(t.c) && Object.values(t.m).every((k) => k % 2 === 0))) out.add("difference-of-squares"); }
    if ((sums.length === 2 && key(sums[0]) === key(sums[1])) || (fs.length === 1 && fs[0].kind === "pow" && isSum(fs[0].base))) out.add("perfect-square");
  }
  if (strip(ce).kind === "pow" && isSum((strip(ce) as Extract<MathExpr, { kind: "pow" }>).base) && (isSum(pe) || hasBracketProduct(pe))) out.add("perfect-square");
  if (fa.rational && !fa.lowestTerms && fb.lowestTerms) out.add("cancel-common-factor");
  if (!fa.powersCombined && fb.powersCombined) out.add("index-laws");
  if (divCount(pe) >= 2 && divCount(ce) < divCount(pe)) out.add("common-denominator");
  return out;
}
function formCheck(e: MathExpr, form: SymForm): { ok: boolean | null; detail: string } {
  if (form === "any") return { ok: true, detail: "" };
  let f: MvFacts; try { f = mvFacts(e); } catch { return { ok: null, detail: "the last line cannot be checked for the requested form" }; }
  const bad = (d: string) => ({ ok: false as const, detail: d });
  switch (form) {
    case "expanded": case "collected": return !f.expandedShape ? bad("the last line still has brackets to multiply out") : !f.collected ? bad("like terms in the last line are not collected") : { ok: true, detail: "" };
    case "factorised": return f.factorisedCompletely === true ? { ok: true, detail: "" } : f.factorisedCompletely === false ? bad("the last line is not fully factorised (a factor can still be split, or it is still a sum)") : { ok: null, detail: "the factorisation cannot be certified complete (a factor's irreducibility is undecided)" };
    case "lowest-terms": return f.lowestTerms ? { ok: true, detail: "" } : bad("the fraction is not in lowest terms");
    case "simplest": return !f.lowestTerms ? bad("the fraction is not in lowest terms") : !f.powersCombined ? bad("powers of the same base are not combined") : !(f.factorisedCompletely || (f.expandedShape && f.collected) || f.rational) ? bad("the last line is not simplified (like terms or brackets remain)") : { ok: true, detail: "" };
  }
}
function causes(from: MathExpr, toText: string): SymCause[] { return nameExpressionErrors(from, (c) => { try { return relateMv(printExpr(c), toText).relation === "identity"; } catch { return false; } }); }

/** exact relation of two lines, the way a step uses it */
export const relateMultivariate = (from: string, to: string): MvRelation => relateMv(from, to);

// ---------- whole working ----------
export function assessMultivariateWorking(problemText: string, lines: string[], opts: MvOptions = {}): MvAssessment {
  const sk = opts.requiredSkills ?? [];
  const nd: MvDomain = { original: [], lost: [], stated: [], implied: [], missing: [], narrowed: [], status: "n/a" };
  const mk = (o: Partial<MvAssessment>): MvAssessment => ({ outcome: "unsupported", correct: null, firstInvalidStep: null, steps: [], errors: [], final: { value: "", form: "n/a", detail: "" }, skills: { required: sk, demonstrated: [], missing: sk, status: sk.length ? "not-demonstrated" : "n/a" }, domain: nd, assumptions: [], variables: [], summary: "", ...o });
  const P = readMvProblem(problemText); if (!P) return mk({ summary: "the problem is not a multi-letter expression this engine can read" });
  if (ambiguousText(P.text)) return mk({ outcome: "ambiguous", summary: "the problem itself can be read in more than one way (a division followed by a letter or bracket)", variables: P.vars });
  const probE = parseMv(P.text); const pb = guard(() => build(probE)); if ("refusal" in pb) return mk({ summary: `the problem cannot be analysed exactly (${pb.refusal})` });
  const allowed = new Set(P.vars); const D0 = domainPoly(pb); const steps: MvStep[] = []; let firstInvalid: number | null = null; let errs: SymCause[] = [];
  let prevText = P.text, prevShow = problemText, prevOk = true; let lastMain: { text: string; expr: string } | null = null; let unsupported = 0, ambiguous = 0;
  const shown = new Set<SymSkillId>(); let statedAll: Stated[] = []; const requiredByLines: Poly[] = [D0]; const syms = new Set<string>(pb.expSyms);
  const assumptions = new Set<string>(); const cover = (q: Poly, sts: Stated[]) => extra(q, sts.reduce((a, s) => a.mul(s.q), Poly.one())).isConst();
  lines.forEach((raw, k) => {
    const i = k + 1; const push = (status: SymStepStatus, explanation: string, relation: MvRelationKind | null = null, e: SymCause[] = [], agreesAt?: Record<string, string>) => { steps.push({ index: i, from: prevShow, to: raw, status, relation, explanation, errors: e, agreesAt }); if (status === "invalid" && firstInvalid === null) { firstInvalid = i; errs = e; } if (status === "unsupported") unsupported++; if (status === "ambiguous") ambiguous++; };
    const L = readLine(raw, allowed); if ("err" in L) { push("unsupported", `this line cannot be read as algebra in the problem's letters (${L.err})`); prevOk = false; return; }
    const before = statedAll; statedAll = statedAll.concat(L.stated);
    const classify = (q: Stated): string => cover(q.q, before) ? "carried" : extra(q.q, D0).isConst() ? "implied by the original expression" : "new";
    if (!L.text.trim()) { push(L.stated.length ? "valid" : "unsupported", L.stated.length ? `states ${L.stated.map((s) => `${s.text} (${classify(s)})`).join("; ")}; it does not change the working` : "an empty line"); return; }
    if (L.ambiguous) { push("ambiguous", "this line can be read in more than one way (a division followed by a product); use brackets to show which is meant"); prevOk = false; return; }
    const sides = L.text.split("=").map((x) => x.trim()); if (sides.some((x) => !x)) { push("unsupported", "an equals sign without an expression on both sides"); prevOk = false; return; }
    const ref = prevOk ? prevText : P.text; const pairs: [string, string][] = [[ref, sides[0]], ...sides.slice(0, -1).map((s, j) => [s, sides[j + 1]] as [string, string])];
    let dropped = Poly.one(), added = Poly.one();
    for (const [a, b] of pairs) {
      const r = guard(() => relateMv(a, b)); const last = sides[sides.length - 1];
      if ("refusal" in r) { push("unsupported", `cannot be checked exactly (${r.refusal})`); prevOk = false; prevText = last; prevShow = raw; return; }
      if (r.relation === "undecided") { push("unsupported", "the normal forms differ but no exact point separates them, so equality could not be decided", "undecided"); prevOk = false; prevText = last; prevShow = raw; return; }
      if (r.relation === "not-identity") {
        const cl = a === ref ? "the previous line" : a; const ag = r.witness.agree;
        push("invalid", `not an identity: ${b} differs from ${cl} at ${ptText(r.witness.differ)}${ag ? `; they agree only at particular values such as ${ptText(ag)}` : ""}`, "not-identity", causes(parseMv(a), b), ag);
        prevText = last; prevShow = raw; prevOk = false; return;
      }
      dropped = dropped.mul(r.dropped); added = added.mul(r.added);
    }
    const last = sides[sides.length - 1];
    const lineB = guard(() => build(parseMv(last))); if (!("refusal" in lineB)) { requiredByLines.push(domainPoly(lineB)); lineB.expSyms.forEach((s) => syms.add(s)); }
    // restrictions the line introduces that neither the original expression nor the student's statements account for
    const addedNew = lost(added, requiredByLines[0]);
    if (!addedNew.isConst()) {
      if (cover(addedNew, statedAll)) push("valid-with-obligation", `an identity wherever both lines are defined, but this line is undefined where ${addedNew} = 0, which the previous line allowed; it holds under the student's stated restriction, so the case ${addedNew} = 0 is excluded by the student, not by the problem`, "identity");
      else { push("invalid", `this line is undefined where ${addedNew} = 0, which the previous line allowed and the original expression did not exclude: it adds a restriction that was not stated`, "identity"); prevText = last; prevShow = raw; prevOk = false; return; }
    } else {
      for (const s of skillsOfStep(parseMv(ref), parseMv(sides[0]))) shown.add(s); for (let j = 0; j + 1 < sides.length; j++) for (const s of skillsOfStep(parseMv(sides[j]), parseMv(sides[j + 1]))) shown.add(s);
      const open = dropped.isConst() ? Poly.one() : extra(dropped, statedAll.reduce((a, s) => a.mul(s.q), Poly.one()));
      const same = prevOk && sides.length === 1 && printExpr(parseMv(ref)) === printExpr(parseMv(sides[0]));
      if (!open.isConst()) push("valid-with-obligation", `an identity with the previous line wherever both are defined; the previous line is undefined where ${open} = 0, so that restriction should be kept`, "identity");
      else push(same ? "no-change" : "valid", "an identity with the previous line (exact algebra)", "identity");
    }
    if (L.stated.length) { const note = L.stated.map((s) => `${s.text} (${classify(s)})`).join("; "); steps[steps.length - 1].explanation += `; states ${note}`; }
    prevText = last; prevShow = raw; prevOk = true; lastMain = { text: last, expr: last };
  });
  if (syms.size) assumptions.add(`exponent laws are judged for positive bases or integer exponents (symbolic exponents: ${[...syms].sort().join(", ")})`);
  const dem = sk.filter((s) => shown.has(s)), miss = sk.filter((s) => !shown.has(s));
  const skills = { required: sk, demonstrated: dem, missing: miss, status: (sk.length ? (miss.length ? "not-demonstrated" : "demonstrated") : "n/a") as "demonstrated" | "not-demonstrated" | "n/a" };
  const skillNote = skills.status === "not-demonstrated" ? ` The working does not show: ${miss.map((m) => SYM_SKILLS[m]).join("; ")}.` : "";
  // domain ledger: original restrictions, what the final line loses, what the student stated and how each statement relates to the original domain
  let domain: MvDomain = { ...nd, original: D0.isConst() ? [] : [`${D0} ≠ 0`], stated: statedAll.map((s) => s.text) };
  const lm = lastMain as { text: string } | null;
  if (lm && firstInvalid === null) {
    const lb = guard(() => build(parseMv(lm.text)));
    if (!("refusal" in lb)) {
      const S = statedAll.reduce((a, s) => a.mul(s.q), Poly.one()); const lostNet = lost(D0, domainPoly(lb)); const missing = lost(lostNet, S);
      const reqAll = requiredByLines.reduce((a, p) => a.mul(p), Poly.one()); const narrowed = statedAll.map((s) => lost(s.q, reqAll)).filter((q) => !q.isConst());
      const implied = statedAll.filter((s) => extra(s.q, D0).isConst()).map((s) => s.text);
      domain = { original: domain.original, lost: lostNet.isConst() ? [] : [`${lostNet} ≠ 0`], stated: domain.stated, implied, missing: missing.isConst() ? [] : [`${missing} ≠ 0`], narrowed: narrowed.map((q) => `${q} ≠ 0`), status: !missing.isConst() ? "missing" : narrowed.length ? "narrowed" : lostNet.isConst() ? "preserved" : "stated" };
    }
  }
  const domNote = domain.status === "missing" ? ` The final line is defined where ${domain.missing.join(", ")} fails, but the problem was not; that restriction is not stated.` : domain.status === "narrowed" ? ` The student excluded inputs (${domain.narrowed.join(", ")}) that neither the problem nor the working required.` : "";
  let outcome: MvAssessment["outcome"]; let summary: string; let fin: MvAssessment["final"] = { value: lm ? lm.text : "", form: "n/a", detail: "" };
  if (firstInvalid !== null) { outcome = "invalid"; summary = `Step ${firstInvalid} is not a valid transformation.`; }
  else if (ambiguous) { outcome = "ambiguous"; summary = "A line can be read in more than one way."; }
  else if (unsupported) { outcome = "unsupported"; summary = "A line could not be checked exactly; no claim is made about the working."; }
  else if (!lines.length || !lm) { outcome = "incomplete"; summary = "No working was given."; }
  else { const fc = formCheck(parseMv(lm.text), opts.form ?? P.form); if (fc.ok === true) { outcome = "verified"; fin = { ...fin, form: "ok" }; summary = "Every step is an identity with the one before it and the working reaches the requested form."; } else if (fc.ok === null) { outcome = "incomplete"; fin = { ...fin, form: "undecided", detail: fc.detail }; summary = `Every step so far is valid, but ${fc.detail}.`; } else { outcome = "incomplete"; fin = { ...fin, form: "not-requested-form", detail: fc.detail }; summary = `Every step so far is valid, but ${fc.detail}.`; } }
  if (outcome === "verified" && opts.requireDomain && (domain.status === "missing" || domain.status === "narrowed")) { outcome = "incomplete"; summary = domain.status === "missing" ? "Every step is valid, but a restriction of the problem is lost and not stated." : "Every step is valid, but the student excluded inputs the problem allows."; }
  return { outcome, correct: outcome === "verified" ? true : outcome === "invalid" ? false : null, firstInvalidStep: firstInvalid, steps, errors: errs, final: fin, skills, domain, assumptions: [...assumptions], variables: P.vars, summary: summary + skillNote + domNote };
}

/** One transformation in the context of the problem. */
export function verifyMultivariateStep(problemText: string, from: string, to: string): { outcome: "verified" | "invalid" | "unsupported"; correct: true | false | null; effect: "equivalence" | "implication" | "invalid"; relation: MvRelationKind | null; detail: string; errors: SymCause[] } {
  const no = (detail: string) => ({ outcome: "unsupported" as const, correct: null, effect: "invalid" as const, relation: null, detail, errors: [] as SymCause[] });
  const P = readMvProblem(problemText); if (!P) return no("not a multi-letter expression problem");
  const al = new Set(P.vars); const A = readLine(from, al), B = readLine(to, al); if ("err" in A || "err" in B || !A.text || !B.text) return no("a line cannot be read as algebra in the problem's letters");
  const a = A.text.split("=").pop()!.trim(), b = B.text.split("=")[0].trim(); const r = guard(() => relateMv(a, b)); if ("refusal" in r) return no(`cannot be checked exactly (${r.refusal})`);
  if (r.relation === "undecided") return { ...no("equality could not be decided exactly"), relation: "undecided" };
  if (r.relation === "not-identity") return { outcome: "invalid", correct: false, effect: "invalid", relation: "not-identity", detail: `differs at ${ptText(r.witness.differ)}${r.witness.agree ? `; equal only at particular values such as ${ptText(r.witness.agree)}` : ""}`, errors: causes(parseMv(a), b) };
  if (!r.added.isConst()) return { outcome: "invalid", correct: false, effect: "invalid", relation: "identity", detail: `adds a restriction (${r.added} ≠ 0) the previous line did not have`, errors: [] };
  return { outcome: "verified", correct: true, effect: r.dropped.isConst() ? "equivalence" : "implication", relation: "identity", detail: r.dropped.isConst() ? "identity on the same domain" : `identity, but the previous line is undefined where ${r.dropped} = 0: keep that restriction`, errors: [] };
}
