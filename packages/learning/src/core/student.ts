// Student reasoning evaluation. Input: a problem (an equation) and the student's lines. Output: which steps are valid, the earliest demonstrably
// invalid step with an exact mathematical explanation, candidate misconceptions, and an honest status when the working cannot be judged.
//
// Judging is done ONLY by the independent verifier (reasoner/verifier): each step is checked pairwise, line i-1 -> line i, on the problem's own
// domain, so ANY valid route is accepted - the evaluator never compares the student's path with the engine's. The planner and rule library are
// used for two advisory things: naming the rule(s) that explain a valid step, and (mal-rules) naming a likely cause of an invalid one.
// A step the verifier cannot decide is reported as "unsupported", never as correct; a reading that changes the verdict makes the working "ambiguous".
import { Rational, Expr, evaluate, type MathExpr } from "../math-kernel.ts";
import { Poly, RatFun } from "../reasoner/domain/poly.ts";
import { parseExpr, printExpr } from "../reasoner/expr-text.ts";
import { Refusal } from "../reasoner/outcomes.ts";
import { constraintOf, excludedOf, parseEq } from "../reasoner/domain/domain-state.ts";
import * as V from "../reasoner/verifier/verifier.ts";
import { startState, type CoreState } from "./state.ts";
import { library } from "./rules.ts";
import { search, applyMove, RuleFailure, type Goal, type Strategy } from "./planner.ts";
import { eqText } from "./verify.ts";
import { solve } from "./solve.ts";
import { MALRULES, malRuleById } from "./misconceptions.ts";
import * as T from "./tactics.ts";

export type Line = string | { eq: string; excluded?: string[] };
export type StepStatus = "valid" | "valid-with-obligation" | "no-change" | "invalid" | "unsupported";
export interface Misconception { id: string; label: string; explanation: string; evidence: "matches" | "consistent"; detail: string }
export interface WorkingStep {
  index: number; from: string; to: string; interpretedAs?: string; status: StepStatus; reasons: string[]; explanation: string;
  route?: string[]; misconceptions: Misconception[]; followsFromEarlierError?: boolean; refusal?: string;
}
export interface WorkingEvaluation {
  problem: string;
  status: "valid-complete" | "valid-incomplete" | "invalid" | "unsupported" | "ambiguous";
  firstInvalid: number | null;                       // 1-based index of the first line whose step is demonstrably invalid
  invalidAt: "step" | "final-claim" | null;          // where the first demonstrable error is (a step, or only the final claim)
  steps: WorkingStep[];
  final?: { claim: string; verdict: "correct" | "incorrect" | "n/a"; explanation: string };
  conventions: { id: string; firstInvalid: number | null; status: string }[];
  summary: string;
  engine?: { class: string; solution: string[] | null; rules: string[] };   // the engine's own route, for comparison only
}

// ---------- reading the student's text ----------
const GLYPHS: [RegExp, string][] = [[/[−–—]/g, "-"], [/[×·]/g, "*"], [/÷/g, "/"], [/²/g, "^2"], [/³/g, "^3"], [/\s+/g, " "]];
/** Deterministic normalisation of how people write mathematics. `grouping` selects how "a/2x" is read: false = (a/2)*x, true = a/(2*x). */
export function normalizeLine(raw: string, grouping = false): string {
  let s = raw.trim(); for (const [re, to] of GLYPHS) s = s.replace(re, to);
  s = s.replace(/(?<=[\d.)x]) +(?=[\dx(])/g, (m, off, str) => (/\d$/.test(str.slice(0, off)) && /^\d/.test(str.slice(off + m.length)) ? " " : "*")).replace(/ /g, (m, off, str) => (/\d$/.test(str.slice(0, off)) && /^\d/.test(str.slice(off + 1)) ? " " : ""));
  if (grouping) s = s.replace(/\/(\d+(?:\.\d+)?)x/g, "/($1*x)");
  s = s.replace(/(\d|\))(?=x|\()/g, "$1*").replace(/x(?=\(|\d|x)/g, "x*").replace(/\)(?=\d|x)/g, ")*");
  return s;
}
const hasImplicitDivision = (raw: string) => /\/\d+(?:\.\d+)?x/.test(raw.replace(/\s+/g, ""));

// ---------- exact descriptions of solution sets ----------
const sortR = (xs: Rational[]) => xs.slice().sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0));
function describe(sol: V.Sol): string {
  if (sol.kind === "all") return `every real number${sol.excluded.length ? ` except ${sol.excluded.map((v) => `x = ${v}`).join(", ")}` : ""}`;
  const parts = sol.rats.map((v) => `x = ${v}`); const irr = sol.irr.length > 1 ? "irrational real solution(s)" : "";
  const all = [...parts, ...(irr ? [irr] : [])]; return all.length ? all.join(" or ") : "no real solution";
}
const ratsOf = (sol: V.Sol): Rational[] | null => (sol.kind === "set" && sol.irr.length === 1 ? sol.rats : null);
const diffNote = (before: V.Sol, after: V.Sol): { gained: Rational[]; lost: Rational[] } | null => {
  const b = ratsOf(before), a = ratsOf(after); if (!b || !a) return null;
  return { gained: a.filter((v) => !b.some((u) => u.eq(v))), lost: b.filter((v) => !a.some((u) => u.eq(v))) };
};

// ---------- canonical forms for naming a cause ----------
const sidesRF = (q: T.Eq) => { const l = RatFun.fromExpr(q.left), r = RatFun.fromExpr(q.right); return l && r ? { l, r } : null; };
function canon(q: T.Eq): string | null {
  const s = sidesRF(q); if (!s) return null; const f = s.l.sub(s.r).reduce(); if (f.n.isZero()) return "0";
  const fmt = (p: Poly) => p.monic().c.map(String).join(",");
  return `${fmt(f.n)}/${fmt(f.d)}`;
}
const coeffVec = (q: T.Eq): string[] | null => { const s = sidesRF(q); if (!s) return null; const f = s.l.sub(s.r).reduce(); return f.n.isZero() ? ["0"] : f.n.monic().c.map(String); };

function ratio(a: MathExpr, b: MathExpr): RatFun | null { const x = RatFun.fromExpr(a), y = RatFun.fromExpr(b); if (!x || !y) return null; return x.div(y)?.reduce() ?? null; }
/** If new = old * g (or old * g^-1) on both sides for one non-constant g, return it. */
function commonFactor(prev: T.Eq, next: T.Eq): { g: RatFun; side: "multiplied" | "divided" } | null {
  const isZero = (e: MathExpr) => RatFun.fromExpr(e)?.reduce().n.isZero() ?? false;
  const cands: RatFun[] = []; if (!isZero(prev.left) && !isZero(next.left)) { const r = ratio(next.left, prev.left); if (r) cands.push(r); }
  if (!isZero(prev.right) && !isZero(next.right)) { const r = ratio(next.right, prev.right); if (r) cands.push(r); }
  if (!cands.length) return null; const g = cands[0];
  if (cands.some((c) => !(c.n.equals(g.n) && c.d.equals(g.d)))) return null;
  if (g.n.degree === 0 && g.d.degree === 0) return null;
  return g.d.degree === 0 ? { g, side: "multiplied" } : g.n.degree === 0 ? { g, side: "divided" } : null;
}

function nameCauses(prevText: string, nextText: string, before: V.Sol, after: V.Sol, domain: Rational[]): Misconception[] {
  const out: Misconception[] = []; let prev: T.Eq, next: T.Eq;
  try { prev = parseEq(prevText); next = parseEq(nextText); } catch { return out; }
  const target = canon(next);
  for (const m of MALRULES) {
    let best: { evidence: "matches" | "consistent"; detail: string } | null = null;
    for (const g of m.generate(prev)) {
      const c = canon(g.to);
      if (c !== null && c === target) { best = { evidence: "matches", detail: g.note }; break; }
      if (!best) { try { const sol = V.solution(V.analyse(`${printExpr(g.to.left)}=${printExpr(g.to.right)}`).f, domain); if (V.solEq(sol, after)) best = { evidence: "consistent", detail: `${g.note} (same solutions as this line)` }; } catch { /* unreadable candidate */ } }
    }
    if (best) out.push({ id: m.id, label: m.label, explanation: m.explanation, evidence: best.evidence, detail: best.detail });
  }
  const cf = commonFactor(prev, next);
  if (cf) {
    const h = cf.side === "divided" ? cf.g.d : cf.g.n; const hs = printExpr(polyExprOf(h));
    if (cf.side === "divided") out.push({ id: "divided-by-unknown-factor", label: "divided both sides by an expression that can be zero", evidence: "matches",
      explanation: `Dividing by ${hs} is only allowed where ${hs} is not 0. It is 0 for some x, so solutions may be lost; write ${hs} != 0 and treat that case separately.`, detail: `both sides divided by ${hs}` });
    else out.push({ id: "multiplied-by-unknown-factor", label: "multiplied both sides by an expression that can be zero", evidence: "matches",
      explanation: `Multiplying by ${hs} keeps every old solution but adds the zeros of ${hs} as new candidates. Candidates must be checked in the original equation.`, detail: `both sides multiplied by ${hs}` });
  }
  const sv = coeffVec(next);
  if (sv && !out.some((m) => m.evidence === "matches")) for (const mv of library.discover(startState(prevText).math)) {
    try { const after1 = applyMove(startState(prevText), mv); const cv = coeffVec({ left: after1.math.statements[0].left, right: after1.math.statements[0].right }); if (!cv || cv.length !== sv.length) continue;
      const diff = cv.filter((v, i) => v !== sv[i]); if (diff.length === 1) { out.push({ id: "arithmetic-slip", label: "a numerical slip in an otherwise correct step", evidence: "consistent", explanation: "The structure of the step is right but one number is wrong. Recompute the arithmetic.", detail: `after ${mv.name}, one coefficient differs (${diff[0]} expected)` }); break; } } catch { /* rule not applicable */ }
  }
  const rank = (e: Misconception) => (e.evidence === "matches" ? 0 : 1);
  const seen = new Set<string>(); return out.filter((m) => !seen.has(m.id) && seen.add(m.id)).sort((a, b) => rank(a) - rank(b));
}
const polyExprOf = (p: Poly): MathExpr => { const s = p.splitLinear(); if (!s) return Expr.var("x"); let acc: MathExpr | null = null; for (const r of s.roots) { const f = r.isZero() ? Expr.var("x") : r.lt(Rational.zero) ? Expr.add(Expr.var("x"), T.num(r.neg())) : Expr.sub(Expr.var("x"), T.num(r)); acc = acc ? Expr.mul(acc, f) : f; } return acc ?? T.num(Rational.one); };

// ---------- naming the route of a valid step (advisory) ----------
function stateFor(prevText: string, problem: string, domain: Rational[]): CoreState {
  const s = startState(prevText); const o = parseEq(problem);
  const have = excludedOf(s.math); const add = domain.filter((v) => !have.some((u) => u.eq(v)));
  return { ...s, math: { ...s.math, expressions: new Map([["original.left", o.left], ["original.right", o.right]]), constraints: [...s.math.constraints, ...add.map(constraintOf)] }, originalRestrictions: domain };
}
const ALL_OPS = new Set(library.all().flatMap((r) => (r.id === "core.divide-both-sides" ? ["mul-div-const", "divide-restricted-factor"] : r.opsOf({}))));
const ROUTE: Strategy = { id: "route", allowed: ALL_OPS, prune: false, maxDepth: 3, maxNodes: 500 };
function routeOf(prevText: string, nextText: string, problem: string, domain: Rational[]): string[] | undefined {
  try {
    const target = (() => { const q = parseEq(nextText); return `${printExpr(q.left)}=${printExpr(q.right)}`; })();
    const goal: Goal = { id: "TEXT", test: (s) => (eqText(s.math) === target ? { kind: "state" } : null) };
    const s0 = stateFor(prevText, problem, domain); if (eqText(s0.math) === target) return [];
    const r = search(s0, goal, ROUTE); if (!r.found) return undefined;
    const path = r.paths[0]; const names: string[] = [];
    for (let i = 1; i < path.length; i++) names.push(path[i].edges.find((e) => e.parent === path[i - 1].key)!.move.name);
    return names;
  } catch { return undefined; }
}

// ---------- the evaluation ----------
interface Parsed { raw: string; text: string; excluded?: string[] }
const lineOf = (l: Line): { eq: string; excluded?: string[] } => (typeof l === "string" ? { eq: l } : l);

function evaluateConvention(problem: string, lines: Line[], grouping: boolean, opts: { route: boolean }): { steps: WorkingStep[]; domain: Rational[]; refusal?: string } {
  const prob = normalizeLine(problem, grouping);
  let domain: Rational[]; try { domain = V.analyse(prob).required; } catch (e) { if (e instanceof Refusal) return { steps: [], domain: [], refusal: `${e.code}: ${e.message}` }; throw e; }
  const parsed: Parsed[] = [{ raw: problem, text: prob }, ...lines.map((l) => { const x = lineOf(l); return { raw: x.eq, text: normalizeLine(x.eq, grouping), excluded: x.excluded }; })];
  const steps: WorkingStep[] = []; let earlierInvalid = false;
  const excl = (p: Parsed): string[] => p.excluded ?? [...new Set([...domain.map(String), ...V.analyse(p.text).required.map(String)])];
  for (let i = 1; i < parsed.length; i++) {
    const a = parsed[i - 1], b = parsed[i];
    const base: WorkingStep = { index: i, from: a.raw, to: b.raw, interpretedAs: b.text !== b.raw ? b.text : undefined, status: "valid", reasons: [], explanation: "", misconceptions: [] };
    try {
      if (a.text.replace(/\s/g, "") === b.text.replace(/\s/g, "")) { steps.push({ ...base, status: "no-change", explanation: "the line repeats the previous one" }); continue; }
      const from = { eq: a.text, excluded: excl(a) }, to = { eq: b.text, excluded: excl(b) };
      const eqv = V.checkStep(from, to, "equivalence", prob);
      if (eqv.refusal) { steps.push({ ...base, status: "unsupported", reasons: eqv.reasons, refusal: eqv.refusal, explanation: `this line cannot be analysed exactly (${eqv.refusal}); it is not judged` }); continue; }
      if (eqv.valid) {
        const st: WorkingStep = { ...base, status: "valid", explanation: "the line has exactly the same solutions as the previous one on the problem's domain" };
        if (opts.route) { const r = routeOf(a.text, b.text, prob, domain); if (r) st.route = r; }
        if (earlierInvalid) st.followsFromEarlierError = true; steps.push(st); continue;
      }
      const imp = V.checkStep(from, to, "implication", prob);
      const A = V.analyse(a.text), B = V.analyse(b.text);
      const before = V.solution(A.f, from.excluded.map((s) => { const [n, d] = s.split("/"); return new Rational(BigInt(n), BigInt(d ?? "1")); })), after = V.solution(B.f, to.excluded.map((s) => { const [n, d] = s.split("/"); return new Rational(BigInt(n), BigInt(d ?? "1")); }));
      const dn = diffNote(before, after);
      if (imp.valid) {
        const gained = dn ? dn.gained.map((v) => `x = ${v}`).join(", ") : "new candidates";
        steps.push({ ...base, status: "valid-with-obligation", reasons: eqv.reasons, explanation: `every solution of the previous line is kept, but this line also admits ${gained}. These are candidates only: each must be checked in the ORIGINAL equation.`, misconceptions: [] }); continue;
      }
      const why: string[] = [];
      if (eqv.reasons.includes("restriction-dropped")) why.push("a restriction recorded earlier was dropped");
      if (eqv.reasons.includes("restriction-closure-violated")) why.push("the line divides by an expression that can be 0 but the matching restriction is not recorded");
      if (eqv.reasons.includes("original-restriction-lost")) why.push("a restriction of the original problem is missing");
      if (eqv.reasons.includes("from-restriction-missing")) why.push("the previous line's restrictions are incomplete");
      let sets = "";
      if (eqv.reasons.includes("solution-set-changed") || eqv.reasons.includes("solution-set-lost")) {
        sets = `the previous line has ${describe(before)}; this line has ${describe(after)}`;
        if (dn && (dn.lost.length || dn.gained.length)) sets += `${dn.lost.length ? `; it lost ${dn.lost.map((v) => `x = ${v}`).join(", ")}` : ""}${dn.gained.length ? `; it gained ${dn.gained.map((v) => `x = ${v}`).join(", ")}` : ""}`;
        why.push(sets);
      }
      const mis = nameCauses(a.text, b.text, before, after, domain.length ? domain : []);
      steps.push({ ...base, status: "invalid", reasons: eqv.reasons, explanation: `not an equivalent step: ${why.join("; ")}`, misconceptions: mis }); earlierInvalid = true;
    } catch (e) {
      if (e instanceof Refusal) steps.push({ ...base, status: "unsupported", refusal: e.code, explanation: `this line cannot be analysed exactly (${e.code}: ${e.message}); it is not judged` });
      else steps.push({ ...base, status: "unsupported", explanation: `internal error, line not judged: ${String(e).slice(0, 120)}` });
    }
  }
  return { steps, domain };
}

const SOLVED = /^x=(-?[\d./]+)$|^(-?[\d./]+)=x$/;
function finalClaim(problem: string, lastRaw: string, domain: Rational[], grouping: boolean): WorkingEvaluation["final"] | undefined {
  const t = normalizeLine(lastRaw, grouping).replace(/\s/g, "").toLowerCase();
  if (/^(no ?solution|nosolution|none|empty|∅)$/.test(t)) { const r = V.checkClaim(normalizeLine(problem, grouping), []); return { claim: "no solution", verdict: r.valid ? "correct" : "incorrect", explanation: r.valid ? "the equation indeed has no solution on its domain" : `the equation does have solutions: ${JSON.stringify(r.truth)}` }; }
  const m = SOLVED.exec(t); if (!m) return undefined;
  const c = m[1] ?? m[2]; const v = (() => { try { return evaluate(parseExpr(c), new Map()); } catch { return null; } })(); if (!v) return undefined;
  const claim = `x = ${v}`;
  if (domain.some((d) => d.eq(v))) return { claim, verdict: "incorrect", explanation: `x = ${v} makes a denominator of the original equation zero, so it is not allowed (an extraneous candidate)` };
  const p = normalizeLine(problem, grouping); const r = V.checkClaim(p, [v.toString()]);
  if (r.valid) return { claim, verdict: "correct", explanation: "x = " + v + " satisfies the original equation with both sides defined, and it is the only solution" };
  const q = parseEq(p); let note = "";
  try { note = `at x = ${v} the left side is ${evaluate(q.left, new Map([["x", v]]))} and the right side is ${evaluate(q.right, new Map([["x", v]]))}`; } catch { note = `x = ${v} is not in the domain`; }
  return { claim, verdict: "incorrect", explanation: `x = ${v} is not the solution: ${note}${Array.isArray(r.truth) ? `; the solution is ${r.truth.length ? r.truth.map((s) => `x = ${s}`).join(" or ") : "none"}` : ""}` };
}

export function evaluateWorking(problem: string, lines: Line[], opts: { route?: boolean; engine?: boolean } = {}): WorkingEvaluation {
  const route = opts.route !== false;
  const raws = [problem, ...lines.map((l) => lineOf(l).eq)];
  const conv = raws.some(hasImplicitDivision) ? [false, true] : [false];
  const runs = conv.map((g) => ({ g, ...evaluateConvention(problem, lines, g, { route }) }));
  const first = (r: { steps: WorkingStep[] }) => r.steps.find((s) => s.status === "invalid")?.index ?? null;
  const verdictOf = (r: { steps: WorkingStep[]; refusal?: string }) => (r.refusal ? "unsupported" : r.steps.some((s) => s.status === "invalid") ? "invalid" : r.steps.some((s) => s.status === "unsupported") ? "unsupported" : "valid");
  const conventions = runs.map((r) => ({ id: r.g ? "a/2x read as a/(2x)" : "a/2x read as (a/2)x", firstInvalid: first(r), status: verdictOf(r) }));
  const primary = runs[0]; const out: WorkingEvaluation = { problem, status: "valid-incomplete", firstInvalid: first(primary), invalidAt: first(primary) ? "step" : null, steps: primary.steps, conventions, summary: "" };
  if (primary.refusal) { out.status = "unsupported"; out.summary = `the problem itself cannot be analysed exactly (${primary.refusal}); the working is not judged`; return out; }
  if (runs.length > 1 && new Set(conventions.map((c) => `${c.status}/${c.firstInvalid}`)).size > 1) {
    out.status = "ambiguous"; out.firstInvalid = null; out.invalidAt = null; out.summary = "the working is written ambiguously (a/2x can mean (a/2)x or a/(2x)) and the two readings give different verdicts: " + conventions.map((c) => `${c.id}: ${c.status}${c.firstInvalid ? ` (first invalid step ${c.firstInvalid})` : ""}`).join("; ");
    return out;
  }
  const last = lines.length ? lineOf(lines[lines.length - 1]).eq : problem;
  const fin = finalClaim(problem, last, primary.domain, false); if (fin) out.final = fin;
  const bad = primary.steps.find((s) => s.status === "invalid");
  if (bad) { out.status = "invalid"; out.summary = `step ${bad.index} (${bad.from}  ->  ${bad.to}) is the first invalid step: ${bad.explanation}${bad.misconceptions.length ? `. Possible cause: ${bad.misconceptions[0].label}` : ""}`; }
  else if (primary.steps.some((s) => s.status === "unsupported")) { out.status = "unsupported"; out.summary = "some lines could not be analysed exactly; they are not judged, and the working is not certified"; }
  else if (out.final && out.final.verdict === "incorrect") { out.status = "invalid"; out.invalidAt = "final-claim"; out.summary = `every step is valid but the final claim is not: ${out.final.explanation}`; }
  else if (out.final) { out.status = "valid-complete"; out.summary = `all ${primary.steps.length} steps are valid and the answer is correct`; }
  else { out.status = "valid-incomplete"; out.summary = `all ${primary.steps.length} steps are valid; the working has not reached a final answer`; }
  if (opts.engine !== false) { try { const e = solve(problem); out.engine = { class: e.class, solution: e.solution, rules: e.steps.map((s) => s.name) }; } catch { /* engine refusal is not the student's problem */ } }
  void RuleFailure; void malRuleById;
  return out;
}
