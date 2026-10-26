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
export type StepStatus = "valid" | "valid-discharge" | "valid-with-obligation" | "no-change" | "invalid" | "unsupported";
export interface Misconception { id: string; label: string; explanation: string; evidence: "matches" | "consistent"; detail: string }
export interface WorkingStep {
  index: number; from: string; to: string; interpretedAs?: string; status: StepStatus; reasons: string[]; explanation: string;
  route?: string[]; misconceptions: Misconception[]; followsFromEarlierError?: boolean; refusal?: string;
  domain?: { original: string[]; expression: string[]; assumptions: string[]; carried: string[] };   // the layers the step was judged on
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
// Supported mathematical glyphs, each unambiguous: minus signs/dashes, multiplication dots and crosses, division signs and slashes.
const GLYPHS: [RegExp, string][] = [[/[−–—‐‑‒﹣－]/g, "-"], [/[×·⋅∙∗⨯]/g, "*"], [/[÷∕⁄]/g, "/"], [/²/g, "^2"], [/³/g, "^3"], [/\s+/g, " "]];
/** Deterministic normalisation of how people write mathematics. `grouping` selects how "a/2x" is read: false = (a/2)*x, true = a/(2*x). */
export function normalizeLine(raw: string, grouping = false): string {
  if (/\s(or|OR|Or)\s/.test(raw)) return raw.split(/\s+or\s+/i).map((q) => normalizeOne(q, grouping)).join(" or ");
  return normalizeOne(raw, grouping);
}
function normalizeOne(raw: string, grouping: boolean): string {
  let s = raw.trim(); for (const [re, to] of GLYPHS) s = s.replace(re, to);
  // tight reading, applied BEFORE juxtaposition is made explicit: a number after "/" binds the WHOLE juxtaposed run that follows it (x, x^k, bracket groups, with or without spaces): 3/2(x+1)(x+2) = 3/(2(x+1)(x+2)), 7/2 x = 7/(2x)
  if (grouping) s = s.replace(/\/\s*(\d+(?:\.\d+)?)((?:\s*(?:x(?:\^\d+)?|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)))+)/g, (_m, num, run) => `/(${num}${run.replace(/\s+/g, "")})`);
  s = s.replace(/(?<=[\d.)x]) +(?=[\dx(])/g, (m, off, str) => (/\d$/.test(str.slice(0, off)) && /^\d/.test(str.slice(off + m.length)) ? " " : "*")).replace(/ /g, (m, off, str) => (/\d$/.test(str.slice(0, off)) && /^\d/.test(str.slice(off + 1)) ? " " : ""));
  s = s.replace(/(\d|\))(?=x|\()/g, "$1*").replace(/x(?=\(|\d|x)/g, "x*").replace(/\)(?=\d|x)/g, ")*");
  return s;
}
const hasImplicitDivision = (raw: string) => { let g = raw; for (const [re, to] of GLYPHS) g = g.replace(re, to); return /\/\d+(?:\.\d+)?[x(]/.test(g.replace(/\s+/g, "")); };

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
// Layered domain semantics (see docs/mathematics/semantics.md): original domain / current expression domain / temporary assumptions / carried case
// assumptions are kept apart (V.relateLines), and gained candidates are an outstanding proof obligation that only the original problem can close.
interface Parsed { raw: string; text: string; excluded?: string[]; kind: "eq" | "case-eq" | "case-neq"; c?: Rational; body?: string }
const lineOf = (l: Line): { eq: string; excluded?: string[] } => (typeof l === "string" ? { eq: l } : l);
const CASE = /^\s*case\s+x\s*(=|!=|≠)\s*([^:]+?)\s*:\s*(.+?)\s*$/i;
const toR = (v: string): Rational => { const [n, d] = v.split("/"); return new Rational(BigInt(n), BigInt(d ?? "1")); };
const finiteSol = (rats: Rational[]): V.Sol => ({ kind: "set", rats: sortR(rats), irr: [Rational.one] });
const withDomainLayers = (L: V.DomainLayers) => ({ original: L.original.map(String), expression: L.expression.map(String), assumptions: L.assumptions.map(String), carried: L.carried.map(String) });

function evaluateConvention(problem: string, lines: Line[], grouping: boolean, opts: { route: boolean }): { steps: WorkingStep[]; domain: Rational[]; refusal?: string } {
  const prob = normalizeLine(problem, grouping);
  let domain: Rational[]; try { domain = V.analyse(prob).required; } catch (e) { if (e instanceof Refusal) return { steps: [], domain: [], refusal: `${e.code}: ${e.message}` }; throw e; }
  const stepLines = lines.length && parseClaimLine(lineOf(lines[lines.length - 1]).eq)?.kind !== undefined && parseClaimLine(lineOf(lines[lines.length - 1]).eq)!.kind !== "set" ? lines.slice(0, -1) : lines;
  const parsed: Parsed[] = stepLines.map((l) => {
    const x = lineOf(l); const m = CASE.exec(x.eq);
    if (m) { const c = ratOf(normalizeLine(m[2], grouping).replace(/\s/g, "")); return { raw: x.eq, text: "", kind: m[1] === "=" ? "case-eq" : "case-neq", c: c ?? undefined, body: m[3] } as Parsed; }
    return { raw: x.eq, text: normalizeLine(x.eq, grouping), excluded: x.excluded, kind: "eq" } as Parsed;
  });
  const steps: WorkingStep[] = []; let earlierInvalid = false; let openObligation = false; let chainBroken = false;
  let O: V.Analysed | null = null; try { O = V.analyse(prob); } catch { O = null; }
  const origOn = (carried: Rational[]): V.Sol => { try { return V.solution(O!.f, V.toVals([...domain, ...carried].map(String))); } catch { return { kind: "set", rats: [], irr: [Rational.one] }; } };
  let cur: { raw: string; text: string; unreadable?: boolean } = { raw: problem, text: prob }; let carried: Rational[] = []; const caseRoots: Rational[] = []; let splitOpen = false;
  const note = (st: WorkingStep): WorkingStep => { if (earlierInvalid && !st.followsFromEarlierError && (st.status === "valid" || st.status === "valid-discharge" || st.status === "valid-with-obligation")) st.followsFromEarlierError = true; return st; };
  for (let i = 0; i < parsed.length; i++) {
    const b = parsed[i]; const idx = i + 1;
    const base: WorkingStep = { index: idx, from: cur.raw, to: b.raw, interpretedAs: b.kind === "eq" && b.text !== b.raw ? b.text : undefined, status: "valid", reasons: [], explanation: "", misconceptions: [] };
    try {
      if (cur.unreadable) {
        const nb = b.kind === "eq" ? b.text : null; let ok = false; if (nb) { try { V.analyseLine(nb); ok = true; } catch { ok = false; } }
        steps.push({ ...base, status: "unsupported", reasons: ["evidence-chain-broken"], explanation: "the previous line could not be analysed, so nothing can be said about how this line follows from it; it is not judged" });
        cur = ok ? { raw: b.raw, text: nb! } : { raw: b.raw, text: "", unreadable: true }; chainBroken = true; continue;
      }
      // ---- explicit case checks ----
      if (b.kind === "case-eq") {
        if (!b.c) { steps.push({ ...base, status: "unsupported", explanation: "the case value is not an exact number; the case is not judged" }); chainBroken = true; continue; }
        const A = V.analyseLine(cur.text); const dom = V.toVals([...domain, ...A.required, ...carried].map(String));
        const excludedHere = dom.some((v) => v.eq(b.c!));
        const body = normalizeLine(b.body!, grouping).replace(/\s/g, "").toLowerCase();
        if (excludedHere) { steps.push(/^(excluded|undefined|not-?allowed)$/.test(body) ? { ...base, explanation: `x = ${b.c} is not allowed in the problem, so there is nothing to check` } : { ...base, status: "invalid", reasons: ["case-excluded-value"], explanation: `x = ${b.c} makes a denominator zero, so it cannot be a case that gives a solution` }); if (steps[steps.length - 1].status === "invalid") earlierInvalid = true; continue; }
        const eqn = body.split("="); let truthE: boolean; try { if (eqn.length !== 2 || /x/.test(body)) throw new Error("not numeric"); truthE = evaluate(parseExpr(eqn[0]), new Map()).eq(evaluate(parseExpr(eqn[1]), new Map())); } catch { steps.push({ ...base, status: "unsupported", explanation: "the case result is not a numeric equation; the case is not judged" }); chainBroken = true; continue; }
        const q = parseEq(cur.text); let truthL: boolean;
        try { truthL = evaluate(q.left, new Map([["x", b.c]])).eq(evaluate(q.right, new Map([["x", b.c]]))); } catch { steps.push({ ...base, status: "unsupported", explanation: "the line being split cannot be evaluated at this value; the case is not judged" }); chainBroken = true; continue; }
        if (truthE !== truthL) { steps.push({ ...base, status: "invalid", reasons: ["case-truth-wrong"], explanation: `at x = ${b.c} the line ${cur.raw} is ${truthL ? "true" : "false"}, but the case says ${truthE ? "true" : "false"}` }); earlierInvalid = true; continue; }
        if (truthL && !caseRoots.some((v) => v.eq(b.c!))) caseRoots.push(b.c); splitOpen = true;
        steps.push({ ...base, explanation: `x = ${b.c} is checked on its own: the line is ${truthL ? "true, so it is a solution" : "false, so it is not a solution"}` }); continue;
      }
      let toText: string; let carriedFrom = carried; let carriedTo = carried;
      // a line that STATES its own restrictions must state those of the original problem (the original domain is permanent whether or not it is written)
      if (b.kind === "eq" && b.excluded && domain.some((v) => !b.excluded!.some((u) => toR(u).eq(v)))) { steps.push({ ...base, status: "invalid", reasons: ["original-restriction-lost"], explanation: `a restriction of the original problem is missing: the line states its restrictions but leaves out ${domain.filter((v) => !b.excluded!.some((u) => toR(u).eq(v))).map((v) => `x != ${v}`).join(", ")}` }); earlierInvalid = true; cur = { raw: b.raw, text: b.text }; continue; }
      if (b.kind === "case-neq") {
        if (!b.c) { steps.push({ ...base, status: "unsupported", explanation: "the case value is not an exact number; the case is not judged" }); chainBroken = true; continue; }
        toText = normalizeLine(b.body!, grouping); carriedFrom = V.toVals([...carried, b.c].map(String)); carriedTo = carriedFrom;
      } else { toText = b.text; }
      if (b.kind === "eq" && b.excluded?.length) carriedTo = V.toVals([...carried.map(String), ...b.excluded]);
      if (cur.text.replace(/\s/g, "") === toText.replace(/\s/g, "") && b.kind === "eq") { steps.push({ ...base, status: "no-change", explanation: "the line repeats the previous one" }); continue; }
      let R = V.relateLines(cur.text, toText, prob, carriedFrom, carriedTo);
      if ("refusal" in R) { steps.push({ ...base, status: "unsupported", reasons: ["state-unanalysable"], refusal: R.refusal, explanation: `this line cannot be analysed exactly (${R.refusal}); it is not judged` }); chainBroken = true; cur = { raw: b.raw, text: "", unreadable: true }; continue; }
      let before = R.before, after = R.after, layers = R.toLayers; let merged = false;
      // a line that combines the branches of an explicit split: the old branch plus the checked case roots, with the branch assumptions released
      if (R.relation !== "equivalent" && carried.length && caseRoots.length && b.kind === "eq") {
        const M = V.relateLines(cur.text, toText, prob, carried, []);
        if (!("refusal" in M)) { const uni = V.solUnion(M.before, finiteSol(caseRoots)); if (V.solEq(uni, M.after)) { R = { ...M, relation: "equivalent", before: uni }; before = uni; after = M.after; layers = M.toLayers; merged = true; } }
      }
      const eqvValid = R.relation === "equivalent";
      const dn = diffNote(before, after);
      const ledger = withDomainLayers(layers);
      const done = (st: WorkingStep) => { st.domain = ledger; steps.push(note(st)); };
      if (chainBroken && !eqvValid) {
        // the earlier unsupported line breaks the evidence chain. A pairwise verdict is still sound when it does not depend on the missing context:
        // gaining candidates is always only an implication; losing a solution of the ORIGINAL problem is invalid in every context; losing only extra candidates cannot be told from a legitimate discharge.
        if (R.relation === "loss" || R.relation === "both") {
          const keepsOriginal = V.solSub(origOn(carried), after);
          if (keepsOriginal) { steps.push({ ...base, status: "unsupported", reasons: ["evidence-chain-broken"], explanation: "an earlier line could not be analysed, so it is unknown whether this line legitimately discards earlier candidates; it is not judged", domain: ledger }); cur = { raw: b.raw, text: toText }; continue; }
        }
      }
      if (eqvValid) {
        const st: WorkingStep = { ...base, status: "valid", explanation: merged ? "the branches are combined: the line is the branch result together with the checked case solutions" : "the line has exactly the same solutions as the previous one on the problem's domain" };
        if (opts.route && b.kind === "eq" && !carried.length) { const r = routeOf(cur.text, toText, prob, domain); if (r) st.route = r; }
        if (chainBroken) st.reasons = ["assessed-independently-of-the-broken-chain"];
        if (merged) { carried = []; caseRoots.length = 0; splitOpen = false; } else if (b.kind === "case-neq") carried = carriedTo;
        done(st); cur = { raw: b.raw, text: toText }; continue;
      }
      // information destroyed: a finite solution set replaced by "every x" (multiplying both sides by 0, or by an expression that is 0 everywhere)
      if (after.kind === "all" && before.kind !== "all") { steps.push({ ...base, status: "invalid", reasons: ["solution-set-changed", "collapse-to-identity"], domain: ledger, explanation: `this line is true for every allowed x, so it no longer says anything about the previous line (${describe(before)}); for example both sides were multiplied by 0`, misconceptions: [] }); earlierInvalid = true; cur = { raw: b.raw, text: toText }; continue; }
      // a SHRINK is the legitimate discharge of an open obligation only if it keeps every solution of the ORIGINAL problem
      if (R.relation === "loss" && openObligation && before.kind === "set" && V.solSub(origOn(carried), after)) {
        if (V.solEq(origOn(carried), after)) openObligation = false;
        const gone = dn && dn.lost.length ? dn.lost.map((v) => `x = ${v}`).join(", ") : "some candidates";
        done({ ...base, status: "valid-discharge", reasons: ["solution-set-changed"], explanation: `this line drops ${gone}; an earlier step had admitted extra candidates, and every solution of the original equation is kept`, misconceptions: [] }); cur = { raw: b.raw, text: toText }; continue;
      }
      if (R.relation === "gain") {
        openObligation = true;
        const gained = dn ? dn.gained.map((v) => `x = ${v}`).join(", ") : "new candidates";
        const viaAssumption = dn ? dn.gained.filter((v) => R.fromLayers.assumptions.some((u) => u.eq(v))) : [];
        done({ ...base, status: "valid-with-obligation", reasons: ["solution-set-changed"], explanation: `every solution of the previous line is kept, but this line also admits ${gained}${viaAssumption.length ? " (the previous line excluded " + viaAssumption.map((v) => `x = ${v}`).join(", ") + " only through a denominator the student introduced)" : ""}. These are candidates only: each must be checked in the ORIGINAL equation.`, misconceptions: [] }); cur = { raw: b.raw, text: toText }; continue;
      }
      const why: string[] = [];
      if (R.relation === "both") why.push("the solutions both changed in two directions"); 
      let sets = `the previous line has ${describe(before)}; this line has ${describe(after)}`;
      if (dn && (dn.lost.length || dn.gained.length)) sets += `${dn.lost.length ? `; it lost ${dn.lost.map((v) => `x = ${v}`).join(", ")}` : ""}${dn.gained.length ? `; it gained ${dn.gained.map((v) => `x = ${v}`).join(", ")}` : ""}`;
      why.push(sets);
      const mis = nameCauses(cur.text, toText, before, after, domain.length ? domain : []);
      steps.push({ ...base, status: "invalid", reasons: ["solution-set-changed"], domain: ledger, explanation: `not an equivalent step: ${why.join("; ")}`, misconceptions: mis }); earlierInvalid = true; cur = { raw: b.raw, text: toText };
    } catch (e) {
      if (e instanceof Refusal) steps.push({ ...base, status: "unsupported", refusal: e.code, explanation: `this line cannot be analysed exactly (${e.code}: ${e.message}); it is not judged` });
      else steps.push({ ...base, status: "unsupported", explanation: `internal error, line not judged: ${String(e).slice(0, 120)}` });
      chainBroken = true; cur = { raw: b.raw, text: "", unreadable: true };
    }
  }
  void splitOpen; return { steps, domain };
}

/** "x = c" or "c = x" where c is any variable-free expression ("(25/36)", "- 7 / 6", "−8", "(39 ÷ 4)"): returns the exact value, else null. */
function solvedValue(raw: string): Rational | null {
  const n = normalizeLine(raw, false).replace(/\s/g, "").toLowerCase();
  const m = /^x=(.+)$/.exec(n) ?? /^(.+)=x$/.exec(n); if (!m || /x/.test(m[1])) return null;
  try { return evaluate(parseExpr(m[1]), new Map()); } catch { return null; }
}
/** A last line that states an answer in words or as alternatives rather than being an equation to check: "no solution", "all real numbers [except a, b]", "x=a or x=b". */
type ClaimLine = { kind: "none" } | { kind: "all"; except: string[] } | { kind: "set"; values: string[] };
export function parseClaimLine(raw: string): ClaimLine | null {
  let g = raw; for (const [re, to] of GLYPHS) g = g.replace(re, to);
  const t = g.toLowerCase().replace(/\s+/g, " ").trim();
  if (/^(no solutions?|none|empty set|∅)$/.test(t)) return { kind: "none" };
  const a = /^(all real numbers|all reals|every real number|any real number|identity)(?: (?:except|but not|excluding|apart from)(?: x ?(?:=|≠|!=))? ?(.*))?$/.exec(t);
  if (a) { const ex = (a[2] ?? "").split(/,| and | or /).map((v) => v.replace(/^x ?(=|≠|!=) ?/, "").trim()).filter(Boolean); return { kind: "all", except: ex }; }
  const parts = t.split(/ or |,|;/).map((q) => q.trim()).filter(Boolean);
  if (parts.length > 1) { const vals = parts.map((q) => solvedValue(q)); if (vals.every((v) => v !== null)) return { kind: "set", values: (vals as Rational[]).map(String) }; }
  return null;
}
const ratOf = (c: string): Rational | null => { try { return evaluate(parseExpr(c), new Map()); } catch { return null; } };
function finalClaim(problem: string, lastRaw: string, domain: Rational[], grouping: boolean): WorkingEvaluation["final"] | undefined {
  const cl = parseClaimLine(lastRaw);
  if (cl && cl.kind !== "none") {
    const p = normalizeLine(problem, grouping);
    if (cl.kind === "all") {
      const ex = cl.except.map(ratOf); if (ex.some((v) => !v)) return undefined;
      const sameSet = (a: Rational[], b: Rational[]) => a.length === b.length && a.every((v) => b.some((u) => u.eq(v)));
      const ident = V.checkClaim(p, "all-except-excluded").valid; const okEx = sameSet(ex as Rational[], domain);
      const claim = cl.except.length ? `all real numbers except ${cl.except.join(", ")}` : "all real numbers";
      return { claim, verdict: ident && okEx ? "correct" : "incorrect", explanation: ident ? (okEx ? "every allowed x is a solution" : `every allowed x is a solution, but the excluded values are ${domain.length ? domain.map((d) => `x = ${d}`).join(", ") : "none"}, not as stated`) : "the equation is not true for every allowed x" };
    }
    const vals = cl.values.map(ratOf); if (vals.some((v) => !v)) return undefined;
    const inDomain = (vals as Rational[]).filter((v) => !domain.some((d) => d.eq(v)));
    const r = V.checkClaim(p, (vals as Rational[]).map(String));
    const ext = inDomain.length !== vals.length;
    return { claim: cl.values.map((v) => `x = ${v}`).join(" or "), verdict: r.valid && !ext ? "correct" : "incorrect", explanation: r.valid && !ext ? "these are exactly the solutions" : ext ? "one of the claimed values is excluded by the original domain" : `these are not exactly the solutions${Array.isArray(r.truth) ? `; the solution is ${r.truth.length ? r.truth.map((q) => `x = ${q}`).join(" or ") : "none"}` : ""}` };
  }
  const t = normalizeLine(lastRaw, grouping).replace(/\s/g, "").toLowerCase();
  if (/^(no ?solution|nosolution|none|empty|∅)$/.test(t)) { const r = V.checkClaim(normalizeLine(problem, grouping), []); return { claim: "no solution", verdict: r.valid ? "correct" : "incorrect", explanation: r.valid ? "the equation indeed has no solution on its domain" : `the equation does have solutions: ${JSON.stringify(r.truth)}` }; }
  const v = solvedValue(lastRaw); if (!v) return undefined;
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
